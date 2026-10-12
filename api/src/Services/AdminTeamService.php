<?php
declare(strict_types=1);

namespace Transenigma\Services;

use Transenigma\Core\Database;
use Transenigma\Core\HttpException;
use Transenigma\Core\Request;
use Transenigma\Repositories\UserRepository;

/**
 * Several admins can work at once; only the primary admin adds or removes admins or hands the primary role over
 * (owner rule 2026-10-12, a deviation from PRD AUTH-10 noted there). Each change needs the primary admin's
 * current authenticator code (step-up), emails the people concerned and is audited. Exactly one primary admin
 * exists (unique key on users.primary_lock); the server's create-admin.php is the way back if it is ever lost.
 */
final class AdminTeamService
{
    public static function isPrimary(array $user): bool
    {
        return $user['role'] === 'admin' && (int) Database::value('SELECT is_primary_admin FROM users WHERE id = ?', [$user['id']]) === 1;
    }

    /** Every admin, the primary first. Read-only for everyone but the primary admin. */
    public static function list(array $viewer): array
    {
        return [
            'youArePrimary' => self::isPrimary($viewer),
            'admins' => array_map(static fn (array $a): array => [
                'id' => (int) $a['id'],
                'name' => $a['name'],
                'email' => $a['email'],
                'isPrimary' => (bool) $a['is_primary_admin'],
                'status' => $a['status'],
                'twoStep' => $a['totp_enabled_at'] !== null,
                'addedBy' => $a['added_by_name'],
                'addedAt' => self::iso($a['admin_added_at']),
                'lastLoginAt' => self::iso($a['last_login_at']),
                'isYou' => (int) $a['id'] === (int) $viewer['id'],
            ], Database::all(
                "SELECT u.*, b.name AS added_by_name FROM users u LEFT JOIN users b ON b.id = u.admin_added_by
                 WHERE u.role = 'admin' ORDER BY u.is_primary_admin DESC, u.admin_added_at IS NULL, u.admin_added_at, u.id"
            )),
        ];
    }

    /**
     * Make an existing account an admin. It must be active and email-verified (so it belongs to the person whose
     * address it is). They are signed out and set up two-step sign-in at their next sign-in.
     */
    public static function add(string $email, string $code, array $actor, Request $request): array
    {
        self::requirePrimary($actor);
        $target = UserRepository::findByEmail($email);
        if ($target === null || $target['status'] !== 'active' || $target['email_verified_at'] === null) {
            throw HttpException::validation(['email' => 'There is no active, email-verified account with this address. Ask them to create an account and confirm their email first.']);
        }
        if ($target['role'] === 'admin') {
            throw HttpException::validation(['email' => 'This person is already an admin.']);
        }
        TwoFactorService::confirmCode($actor, $code, $request);
        $done = Database::run(
            "UPDATE users SET role = 'admin', admin_added_by = ?, admin_added_at = UTC_TIMESTAMP(), session_version = session_version + 1
             WHERE id = ? AND role = 'user' AND status = 'active'",
            [$actor['id'], $target['id']]
        )->rowCount() === 1;
        if (!$done) {
            throw HttpException::conflict('This account changed just now. Please reload and try again.', 'ACCOUNT_CHANGED');
        }
        AuditService::forUser($actor, 'ADMIN_ADDED', 'user', (int) $target['id'], [], $request);
        self::notify($target, 'added', $actor);
        self::notify($actor, 'you_added', $actor, $target);
        return self::list($actor);
    }

    /** Take admin rights away (never from the primary admin). Signed out at once; their authenticator is forgotten. */
    public static function remove(int $id, string $code, array $actor, Request $request): array
    {
        self::requirePrimary($actor);
        $target = self::admin($id);
        if ((int) $target['id'] === (int) $actor['id'] || (int) $target['is_primary_admin'] === 1) {
            throw HttpException::conflict('The primary admin can’t remove their own admin access. Hand over the primary role first.', 'PRIMARY_PROTECTED');
        }
        TwoFactorService::confirmCode($actor, $code, $request);
        Database::transaction(static function () use ($id): void {
            $removed = Database::run(
                "UPDATE users SET role = 'user', admin_added_by = NULL, admin_added_at = NULL, totp_secret_enc = NULL, totp_enabled_at = NULL,
                        totp_last_step = NULL, session_version = session_version + 1
                 WHERE id = ? AND role = 'admin' AND is_primary_admin = 0",
                [$id]
            )->rowCount();
            if ($removed !== 1) {
                throw HttpException::conflict('This admin changed just now. Please reload and try again.', 'ACCOUNT_CHANGED');
            }
            Database::run('DELETE FROM admin_recovery_codes WHERE user_id = ?', [$id]);
        });
        AuditService::forUser($actor, 'ADMIN_REMOVED', 'user', $id, [], $request);
        self::notify($target, 'removed', $actor);
        self::notify($actor, 'you_removed', $actor, $target);
        return self::list($actor);
    }

    /** Hand the primary role to another admin, who must already use two-step sign-in. The giver stays an admin. */
    public static function transfer(int $id, string $code, array $actor, Request $request): array
    {
        self::requirePrimary($actor);
        $target = self::admin($id);
        if ((int) $target['id'] === (int) $actor['id']) {
            throw HttpException::conflict('You are already the primary admin.', 'ALREADY_PRIMARY');
        }
        if ($target['status'] !== 'active' || $target['totp_enabled_at'] === null) {
            throw HttpException::conflict('Hand over only to an active admin who has signed in and set up two-step sign-in.', 'TARGET_NOT_READY');
        }
        TwoFactorService::confirmCode($actor, $code, $request);
        Database::transaction(static function () use ($actor, $id): void {
            // Re-check the target under a row lock: it may have been removed or disabled in another window meanwhile.
            $now = Database::one('SELECT role, status, totp_enabled_at FROM users WHERE id = ? FOR UPDATE', [$id]);
            if ($now === null || $now['role'] !== 'admin' || $now['status'] !== 'active' || $now['totp_enabled_at'] === null) {
                throw HttpException::conflict('This admin changed just now. Please reload and try again.', 'TARGET_NOT_READY');
            }
            // Clear first: the unique key allows one primary admin at any moment. Either both updates land or
            // neither does (an exception rolls the transaction back), so there is never no primary admin.
            $cleared = Database::run('UPDATE users SET is_primary_admin = 0 WHERE id = ? AND is_primary_admin = 1', [$actor['id']])->rowCount();
            if ($cleared !== 1) {
                throw HttpException::forbidden('Only the primary admin can do this.', 'PRIMARY_ADMIN_ONLY');
            }
            $set = Database::run("UPDATE users SET is_primary_admin = 1 WHERE id = ? AND role = 'admin'", [$id])->rowCount();
            if ($set !== 1) {
                throw HttpException::conflict('This admin changed just now. Please reload and try again.', 'TARGET_NOT_READY');
            }
        });
        AuditService::forUser($actor, 'PRIMARY_ADMIN_TRANSFERRED', 'user', $id, [], $request);
        self::notify($target, 'made_primary', $actor);
        self::notify($actor, 'you_transferred', $actor, $target);
        return self::list(UserRepository::find((int) $actor['id']));
    }

    /** Server command line (create-admin.php): make this admin the primary one, in place of any other. */
    public static function makePrimaryFromServer(int $id): void
    {
        Database::transaction(static function () use ($id): void {
            Database::run('UPDATE users SET is_primary_admin = 0 WHERE is_primary_admin = 1');
            Database::run("UPDATE users SET is_primary_admin = 1 WHERE id = ? AND role = 'admin'", [$id]);
        });
        AuditService::log('PRIMARY_ADMIN_SET_CLI', 'system', null, 'user', $id);
    }

    public static function hasPrimary(): bool
    {
        return Database::value('SELECT 1 FROM users WHERE is_primary_admin = 1') !== null;
    }

    // ------------------------------------------------------------------ helpers

    private static function requirePrimary(array $actor): void
    {
        if (!self::isPrimary($actor)) {
            throw HttpException::forbidden('Only the primary admin can add or remove admins.', 'PRIMARY_ADMIN_ONLY');
        }
    }

    private static function admin(int $id): array
    {
        $u = Database::one('SELECT * FROM users WHERE id = ?', [$id]);
        if ($u === null || $u['role'] !== 'admin') {
            throw HttpException::notFound('Admin not found.');
        }
        return $u;
    }

    private static function notify(array $to, string $event, array $actor, ?array $target = null): void
    {
        Mailer::send($to['email'], 'admin-access', [
            'name' => $to['name'], 'event' => $event, 'actor' => $actor['name'], 'target' => $target['name'] ?? null,
            'targetEmail' => $target['email'] ?? null,
        ]);
    }

    private static function iso(?string $utc): ?string
    {
        return $utc === null ? null : gmdate('c', strtotime($utc . ' UTC'));
    }
}
