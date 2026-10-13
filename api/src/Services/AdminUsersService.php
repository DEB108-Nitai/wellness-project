<?php
declare(strict_types=1);

namespace Transenigma\Services;

use Transenigma\Core\Database;
use Transenigma\Core\HttpException;
use Transenigma\Core\Request;

/**
 * Admin: user accounts (Phase 5 slice F; PRD ADM-6, ADM-11, AUTH-11). List, view, disable or enable, and
 * anonymise on an erasure request. Admin rights themselves are managed only by the primary admin
 * (AdminTeamService). Every change is audited, without personal data for an anonymisation.
 */
final class AdminUsersService
{
    public const ANON_NAME = 'Anonymised user';

    public static function search(array $f, int $page, int $perPage): array
    {
        $where = [];
        $params = [];
        if (!empty($f['q'])) {
            $where[] = '(u.name LIKE ? OR u.email LIKE ?)';
            $like = '%' . addcslashes($f['q'], '%_\\') . '%';
            array_push($params, $like, $like);
        }
        if (!empty($f['role'])) {
            $where[] = 'u.role = ?';
            $params[] = $f['role'];
        }
        if (($f['status'] ?? '') === 'anonymised') {
            $where[] = 'u.anonymized_at IS NOT NULL';
        } elseif (!empty($f['status'])) {
            $where[] = 'u.status = ? AND u.anonymized_at IS NULL';
            $params[] = $f['status'];
        }
        $sqlWhere = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $offset = ($page - 1) * $perPage;
        return [
            'items' => array_map([self::class, 'row'], Database::all(
                "SELECT u.* FROM users u $sqlWhere ORDER BY u.created_at DESC, u.id DESC LIMIT $perPage OFFSET $offset",
                $params
            )),
            'total' => (int) Database::value("SELECT COUNT(*) FROM users u $sqlWhere", $params),
            'page' => $page,
            'perPage' => $perPage,
            'counts' => [
                'all' => (int) Database::value('SELECT COUNT(*) FROM users WHERE anonymized_at IS NULL'),
                'admins' => (int) Database::value("SELECT COUNT(*) FROM users WHERE role = 'admin'"),
                'disabled' => (int) Database::value("SELECT COUNT(*) FROM users WHERE status = 'disabled' AND anonymized_at IS NULL"),
                'new30' => (int) Database::value('SELECT COUNT(*) FROM users WHERE created_at >= UTC_TIMESTAMP() - INTERVAL 30 DAY'),
            ],
        ];
    }

    /** One account with what is filed under it: tests, 60-day registrations, messages, newsletter, recent activity. */
    public static function detail(int $id): array
    {
        $u = self::user($id);
        $email = $u['email'];
        // Rows found by email belong to whoever owns the inbox, so they count only once the account proved it owns it.
        $verified = $u['email_verified_at'] !== null;
        return self::row($u) + [
            'tests' => array_map(static fn (array $t): array => [
                'ref' => $t['public_ref'], 'status' => $t['status'],
                'startedAt' => self::iso($t['started_at']), 'completedAt' => self::iso($t['completed_at']),
            ], Database::all('SELECT public_ref, status, started_at, completed_at FROM test_sessions WHERE user_id = ? ORDER BY started_at DESC', [$id])),
            'registrations' => array_map(static fn (array $r): array => [
                'ref' => $r['ref_code'], 'program' => $r['program'], 'status' => $r['status'], 'createdAt' => self::iso($r['created_at']),
            ], $verified
                ? Database::all('SELECT ref_code, program, status, created_at FROM challenge_registrations WHERE user_id = ? OR email = ? ORDER BY created_at DESC', [$id, $email])
                : Database::all('SELECT ref_code, program, status, created_at FROM challenge_registrations WHERE user_id = ? ORDER BY created_at DESC', [$id])),
            'messages' => $verified ? (int) Database::value('SELECT COUNT(*) FROM contact_messages WHERE email = ?', [$email]) : 0,
            'newsletter' => $verified ? Database::value('SELECT status FROM newsletter_subscribers WHERE email = ?', [$email]) : null,
            // Their own actions, and what others did to the account (with who did it).
            'activity' => array_map(static fn (array $a): array => [
                'action' => $a['action'], 'createdAt' => self::iso($a['created_at']),
                'by' => $a['actor_user_id'] !== null && (int) $a['actor_user_id'] !== $id ? $a['actor_name'] : ($a['actor_type'] === 'system' ? 'Server' : null),
            ], Database::all(
                "SELECT a.action, a.created_at, a.actor_user_id, a.actor_type, u.name AS actor_name
                 FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id
                 WHERE a.actor_user_id = ? OR (a.entity_type = 'user' AND a.entity_id = ?)
                 ORDER BY a.created_at DESC, a.id DESC LIMIT 15",
                [$id, (string) $id]
            )),
        ];
    }

    /** Disable (signed out at once, AUTH-11) or enable an account. */
    public static function setStatus(int $id, string $status, array $actor, Request $request): array
    {
        $target = self::user($id);
        self::guardTarget($target, $actor, $status === 'disabled' ? 'disable' : 'enable');
        if ($target['anonymized_at'] !== null) {
            throw HttpException::conflict('This account was anonymised and stays disabled.', 'ACCOUNT_ANONYMISED');
        }
        if ($target['status'] !== $status) {
            // A new session version signs the person out everywhere on their next request. The role must still be the
            // one checked above: a member promoted meanwhile is now the primary admin's business.
            $done = Database::run(
                'UPDATE users SET status = ?, session_version = session_version + 1 WHERE id = ? AND role = ? AND is_primary_admin = ?',
                [$status, $id, $target['role'], $target['is_primary_admin']]
            )->rowCount() === 1;
            if (!$done) {
                throw HttpException::conflict('This account changed just now. Please reload and try again.', 'ACCOUNT_CHANGED');
            }
            AuditService::forUser($actor, $status === 'disabled' ? 'USER_DISABLED' : 'USER_ENABLED', 'user', $id, [], $request);
        }
        return self::row(self::user($id));
    }

    /**
     * Erasure request (ADM-11, O-3): remove the person's name and contact details everywhere, keep the answers and
     * scores for research. Cannot be undone. The admin types the account's email to confirm.
     */
    public static function anonymise(int $id, string $confirmEmail, array $actor, Request $request): void
    {
        $target = self::user($id);
        self::guardTarget($target, $actor, 'anonymise');
        if ($target['role'] === 'admin') {
            throw HttpException::conflict('Remove this person’s admin access first (Admins page).', 'ADMIN_CANNOT_BE_ANONYMISED');
        }
        if ($target['anonymized_at'] !== null) {
            throw HttpException::conflict('This account is already anonymised.', 'ACCOUNT_ANONYMISED');
        }
        if (mb_strtolower(trim($confirmEmail)) !== mb_strtolower($target['email'])) {
            throw HttpException::validation(['confirmEmail' => 'Type the account’s email address exactly to confirm.']);
        }

        $email = $target['email'];
        $anonEmail = "anon-$id@invalid";
        // Registrations, messages and the newsletter row are found by email only when the account proved it owns the
        // address: an unverified sign-up with someone else's email must not erase that person's records.
        $verified = $target['email_verified_at'] !== null;
        Database::transaction(static function () use ($id, $email, $anonEmail, $verified): void {
            // Still a member and not yet anonymised: a promotion or a second click arriving meanwhile is refused, not undone.
            $changed = Database::run(
                "UPDATE users SET name = ?, email = ?, password_hash = NULL, google_sub = NULL, status = 'disabled',
                        totp_secret_enc = NULL, totp_enabled_at = NULL, totp_last_step = NULL, admin_added_by = NULL, admin_added_at = NULL,
                        session_version = session_version + 1, anonymized_at = UTC_TIMESTAMP()
                 WHERE id = ? AND role = 'user' AND anonymized_at IS NULL",
                [self::ANON_NAME, $anonEmail, $id]
            )->rowCount();
            if ($changed !== 1) {
                throw HttpException::conflict('This account changed in the meantime. Reload it and try again.', 'ACCOUNT_CHANGED');
            }
            Database::run('DELETE FROM auth_tokens WHERE user_id = ?', [$id]);
            Database::run('DELETE FROM admin_recovery_codes WHERE user_id = ?', [$id]);
            // Tests: answers, scores and the research demographics (age, country, gender, education) stay.
            Database::run(
                'UPDATE test_sessions SET nickname = NULL, gender_text = NULL, occupation = NULL, share_token = NULL, user_agent = NULL, ip_hash = NULL
                 WHERE user_id = ?',
                [$id]
            );
            // Their own words about the test may name or describe them; the star rating stays.
            Database::run('UPDATE session_reviews r JOIN test_sessions s ON s.id = r.session_id SET r.comment = NULL WHERE s.user_id = ?', [$id]);
            Database::run(
                "UPDATE challenge_registrations SET name = ?, email = ?, phone = '', city = NULL, primary_goal = NULL, admin_notes = NULL, ip_hash = NULL
                 WHERE user_id = ?" . ($verified ? ' OR email = ?' : ''),
                $verified ? [self::ANON_NAME, $anonEmail, $id, $email] : [self::ANON_NAME, $anonEmail, $id]
            );
            if ($verified) {
                Database::run('DELETE FROM contact_messages WHERE email = ?', [$email]);
                Database::run('DELETE FROM newsletter_subscribers WHERE email = ?', [$email]);
                Database::run('DELETE FROM email_log WHERE to_email = ?', [$email]);
            }
            // Earlier audit entries may carry the address as a JSON value (e.g. a failed sign-in: {"email":"…"});
            // keep the entries, drop those details. Quoted, so "al@x.com" never matches "sal@x.com" or "al@x.com.au".
            Database::run('UPDATE audit_logs SET details = NULL WHERE details LIKE ?', ['%"' . addcslashes($email, '%_\\') . '"%']);
        });
        AuditService::forUser($actor, 'USER_ANONYMISED', 'user', $id, [], $request);
    }

    // ------------------------------------------------------------------ helpers

    /** Nobody acts on their own account here; another admin's account is the primary admin's business. */
    private static function guardTarget(array $target, array $actor, string $what): void
    {
        if ((int) $target['id'] === (int) $actor['id']) {
            throw HttpException::conflict("You can't $what your own account.", 'SELF_PROTECTED');
        }
        if ($target['role'] === 'admin') {
            if ((int) $target['is_primary_admin'] === 1) {
                throw HttpException::conflict("The primary admin can't be changed here. They must hand over the primary role first.", 'PRIMARY_PROTECTED');
            }
            if (!AdminTeamService::isPrimary($actor)) {
                throw HttpException::forbidden('Only the primary admin can change another admin’s account.', 'PRIMARY_ADMIN_ONLY');
            }
        }
    }

    private static function user(int $id): array
    {
        return Database::one('SELECT * FROM users WHERE id = ?', [$id]) ?? throw HttpException::notFound('Account not found.');
    }

    private static function row(array $u): array
    {
        return [
            'id' => (int) $u['id'],
            'name' => $u['name'],
            'email' => $u['anonymized_at'] === null ? $u['email'] : null,
            'role' => $u['role'],
            'isPrimaryAdmin' => (bool) $u['is_primary_admin'],
            'status' => $u['status'],
            'anonymised' => $u['anonymized_at'] !== null,
            'emailVerified' => $u['email_verified_at'] !== null,
            'hasPassword' => $u['password_hash'] !== null,
            'hasGoogle' => $u['google_sub'] !== null,
            'twoStep' => $u['totp_enabled_at'] !== null,
            'createdAt' => self::iso($u['created_at']),
            'lastLoginAt' => self::iso($u['last_login_at']),
        ];
    }

    private static function iso(?string $utc): ?string
    {
        return $utc === null ? null : gmdate('c', strtotime($utc . ' UTC'));
    }
}
