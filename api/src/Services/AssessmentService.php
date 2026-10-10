<?php
declare(strict_types=1);

namespace Transenigma\Services;

use PDOException;
use Transenigma\Core\Cookies;
use Transenigma\Core\Database;
use Transenigma\Core\HttpException;
use Transenigma\Core\RateLimiter;
use Transenigma\Core\Request;
use Transenigma\Repositories\PsychometricRepository;

/**
 * Assessment session lifecycle (PRD §4.2 TEST-1 … TEST-12).
 *
 * Ownership: a signed-in user owns sessions with their user_id; a guest owns
 * sessions whose guest_token_hash matches the HttpOnly `te_guest` cookie.
 * Guest sessions are attached to the account when the guest signs in (TEST-9).
 */
final class AssessmentService
{
    public const GUEST_COOKIE = 'te_guest';
    private const GUEST_COOKIE_DAYS = 30;
    private const INACTIVE_DAYS = 30;
    private const MAX_PAGE_SECONDS = 900;      // per save; idle time beyond this is not counted
    private const MAX_ANSWERS_PER_SAVE = 60;
    private const REF_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

    public const GENDERS = ['female', 'male', 'non_binary', 'prefer_not_to_say', 'self_describe'];
    public const EDUCATION = ['high_school', 'bachelors', 'masters', 'doctorate', 'other'];

    // ------------------------------------------------------------------ ownership

    /** @return array{userId:?int, guestHash:?string} */
    public static function owner(Request $request): array
    {
        $user = AuthService::user();
        $cookie = $request->cookie(self::GUEST_COOKIE) ?? Cookies::$jar[self::GUEST_COOKIE] ?? null;
        $guestHash = is_string($cookie) && preg_match('/^[A-Za-z0-9_-]{43}$/', $cookie) ? hash('sha256', $cookie) : null;
        return ['userId' => $user ? (int) $user['id'] : null, 'guestHash' => $guestHash];
    }

    public static function owns(array $session, array $owner): bool
    {
        if ($owner['userId'] !== null) {
            return (int) $session['user_id'] === $owner['userId'];
        }
        return $session['user_id'] === null && $owner['guestHash'] !== null
            && hash_equals((string) $session['guest_token_hash'], $owner['guestHash']);
    }

    /** The owner's in-progress session (expiring it if inactive for 30 days), or null. */
    public static function active(array $owner): ?array
    {
        if ($owner['userId'] !== null) {
            $session = Database::one("SELECT * FROM test_sessions WHERE user_id = ? AND status = 'in_progress' ORDER BY last_activity_at DESC LIMIT 1", [$owner['userId']]);
        } elseif ($owner['guestHash'] !== null) {
            $session = Database::one("SELECT * FROM test_sessions WHERE guest_token_hash = ? AND user_id IS NULL AND status = 'in_progress' ORDER BY last_activity_at DESC LIMIT 1", [$owner['guestHash']]);
        } else {
            return null;
        }
        if ($session !== null && strtotime($session['last_activity_at'] . ' UTC') < time() - self::INACTIVE_DAYS * 86400) {
            Database::run("UPDATE test_sessions SET status = 'expired' WHERE id = ?", [$session['id']]);
            return null;
        }
        return $session;
    }

    public static function findOwnedByRef(string $ref, array $owner): array
    {
        $session = self::byRef($ref);
        if ($session === null || !self::owns($session, $owner)) {
            throw HttpException::notFound('Assessment not found.');
        }
        return $session;
    }

    public static function byRef(string $ref): ?array
    {
        if (!preg_match('/^TE-[' . self::REF_ALPHABET . ']{6}$/', $ref)) {
            return null;
        }
        return Database::one('SELECT * FROM test_sessions WHERE public_ref = ?', [$ref]);
    }

    // ------------------------------------------------------------------ lifecycle

    /** TEST-1..4: consent + demographics → new session. */
    public static function start(array $data, Request $request): array
    {
        RateLimiter::hit('test_start', $request->ip(), 20, 3600);

        $owner = self::owner($request);
        if (($existing = self::active($owner)) !== null) {
            throw new HttpException(409, 'SESSION_EXISTS', 'You already have an assessment in progress.', ['ref' => $existing['public_ref']]);
        }

        if ($owner['userId'] === null && $owner['guestHash'] === null) {
            $guestToken = TokenService::random();
            Cookies::set(self::GUEST_COOKIE, $guestToken, self::GUEST_COOKIE_DAYS);
            $owner['guestHash'] = hash('sha256', $guestToken);
        }

        $minAge = SettingsService::int('min_age');
        if ($data['age'] < $minAge) {
            throw HttpException::validation(['age' => "You must be at least $minAge years old to take the assessment."]);
        }
        if ($data['gender'] === 'self_describe' && trim((string) ($data['genderText'] ?? '')) === '') {
            throw HttpException::validation(['genderText' => 'Please describe your gender, or choose another option.']);
        }

        $version = PsychometricRepository::activeItemSetVersion();
        for ($attempt = 0; ; $attempt++) {
            $ref = self::newRef();
            try {
                $id = Database::insert(
                    'INSERT INTO test_sessions (public_ref, user_id, guest_token_hash, item_set_version, consent_version, consent_at,
                        country, age, gender, gender_text, nickname, education, occupation, ip_hash, user_agent)
                     VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(), ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        $ref, $owner['userId'], $owner['userId'] === null ? $owner['guestHash'] : null, $version,
                        SettingsService::get('consent_version'), $data['country'], $data['age'], $data['gender'],
                        $data['gender'] === 'self_describe' ? $data['genderText'] : null,
                        $data['nickname'] ?? null, $data['education'] ?? null, $data['occupation'] ?? null,
                        $request->ipHash(), $request->userAgent(),
                    ]
                );
                break;
            } catch (PDOException $e) {
                if ($attempt < 5 && str_contains($e->getMessage(), 'uq_sessions_ref')) {
                    continue; // reference collision — try another
                }
                throw $e;
            }
        }

        AuditService::log('SESSION_STARTED', $owner['userId'] ? 'user' : 'guest', $owner['userId'], 'test_session', $ref, [], $request);
        return self::state(Database::one('SELECT * FROM test_sessions WHERE id = ?', [$id]));
    }

    /** TEST-5: batched autosave. */
    public static function saveAnswers(array $session, array $answers, int $page, int $pageSeconds, Request $request): array
    {
        if ($session['status'] !== 'in_progress') {
            throw HttpException::conflict('This assessment has already been submitted.', 'SESSION_CLOSED');
        }
        RateLimiter::hit('autosave', (string) $session['id'], 2000, 3600);

        $items = PsychometricRepository::items($session['item_set_version']);
        if (count($answers) > self::MAX_ANSWERS_PER_SAVE) {
            throw HttpException::badRequest('Too many answers in one save.');
        }
        $clean = [];
        foreach ($answers as $itemId => $value) {
            if (!ctype_digit((string) $itemId) || !isset($items[(int) $itemId])) {
                throw HttpException::validation(['answers' => 'Unknown statement.']);
            }
            if (!is_int($value) || $value < 1 || $value > 5) {
                throw HttpException::validation(['answers' => 'Answers must be between 1 and 5.']);
            }
            $clean[(int) $itemId] = $value;
        }

        $maxPage = (int) ceil(count($items) / 5); // smallest allowed page size
        $page = max(1, min($maxPage, $page));
        $seconds = max(0, min(self::MAX_PAGE_SECONDS, $pageSeconds));

        Database::transaction(static function () use ($session, $clean, $page, $seconds): void {
            if ($clean !== []) {
                $rows = implode(', ', array_fill(0, count($clean), '(?, ?, ?, UTC_TIMESTAMP())'));
                $params = [];
                foreach ($clean as $itemId => $value) {
                    array_push($params, $session['id'], $itemId, $value);
                }
                Database::run(
                    "INSERT INTO session_answers (session_id, item_id, value, answered_at) VALUES $rows
                     ON DUPLICATE KEY UPDATE value = VALUES(value), answered_at = VALUES(answered_at)",
                    $params
                );
            }
            if ($seconds > 0) {
                Database::run(
                    'INSERT INTO session_page_times (session_id, page, seconds) VALUES (?, ?, ?)
                     ON DUPLICATE KEY UPDATE seconds = seconds + VALUES(seconds)',
                    [$session['id'], $page, $seconds]
                );
            }
            Database::run(
                'UPDATE test_sessions SET current_page = ?, active_seconds = active_seconds + ?, last_activity_at = UTC_TIMESTAMP() WHERE id = ?',
                [$page, $seconds, $session['id']]
            );
        });

        return [
            'answeredCount' => (int) Database::value('SELECT COUNT(*) FROM session_answers WHERE session_id = ?', [$session['id']]),
            'savedAt' => gmdate('c'),
        ];
    }

    /** TEST-4: "start over" keeps the old session for research but marks it abandoned. */
    public static function abandon(array $session, Request $request): void
    {
        if ($session['status'] !== 'in_progress') {
            return;
        }
        Database::run("UPDATE test_sessions SET status = 'abandoned' WHERE id = ?", [$session['id']]);
        AuditService::log('SESSION_ABANDONED', $session['user_id'] ? 'user' : 'guest', $session['user_id'] ? (int) $session['user_id'] : null, 'test_session', $session['public_ref'], [], $request);
    }

    /** TEST-8: score on the server; idempotent for an already-completed session. */
    public static function submit(array $session, Request $request): array
    {
        if ($session['status'] === 'completed') {
            return ['ref' => $session['public_ref'], 'status' => 'completed'];
        }
        if ($session['status'] !== 'in_progress') {
            throw HttpException::conflict('This assessment can no longer be submitted.', 'SESSION_CLOSED');
        }

        $items = PsychometricRepository::items($session['item_set_version']);
        $answers = [];
        foreach (Database::all('SELECT item_id, value FROM session_answers WHERE session_id = ?', [$session['id']]) as $row) {
            $answers[(int) $row['item_id']] = (int) $row['value'];
        }
        $missing = array_values(array_diff_key($items, $answers));
        if ($missing !== []) {
            throw new HttpException(422, 'INCOMPLETE', sprintf('Please answer all statements before submitting (%d remaining).', count($missing)), [
                'firstMissingPosition' => (string) $missing[0]['position'],
                'missingCount' => (string) count($missing),
            ]);
        }

        $normVersion = PsychometricRepository::activeNormVersion();
        $scores = ScoringService::score($answers, $session['item_set_version'], $normVersion);
        $active = (int) $session['active_seconds'];
        if ($active === 0) { // client never reported page time — fall back to wall-clock duration
            $active = max(0, time() - strtotime($session['started_at'] . ' UTC'));
        }
        $quality = QualityService::evaluate($answers, $items, $active, SettingsService::int('too_fast_minutes'));

        Database::transaction(static function () use ($session, $scores, $quality, $normVersion): void {
            $locked = Database::one('SELECT status FROM test_sessions WHERE id = ? FOR UPDATE', [$session['id']]);
            if ($locked['status'] !== 'in_progress') {
                return; // a concurrent submit already completed it
            }
            foreach ($scores['factors'] as $code => $f) {
                Database::run(
                    'INSERT INTO session_factor_scores (session_id, factor_code, raw_score, z_score, sten, percentile, band) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [$session['id'], $code, $f['raw'], round($f['z'], 3), $f['sten'], $f['percentile'], $f['band']]
                );
            }
            foreach ($scores['domains'] as $code => $d) {
                Database::run(
                    'INSERT INTO session_domain_scores (session_id, domain_code, composite, z_score, sten, band) VALUES (?, ?, ?, ?, ?, ?)',
                    [$session['id'], $code, round($d['composite'], 3), round($d['z'], 3), $d['sten'], $d['band']]
                );
            }
            Database::run(
                "UPDATE test_sessions SET status = 'completed', completed_at = UTC_TIMESTAMP(), norm_version = ?,
                    quality_flagged = ?, quality_details = ?, last_activity_at = UTC_TIMESTAMP() WHERE id = ?",
                [$normVersion, $quality['flagged'] ? 1 : 0, json_encode($quality), $session['id']]
            );
        });

        AuditService::log('SESSION_COMPLETED', $session['user_id'] ? 'user' : 'guest', $session['user_id'] ? (int) $session['user_id'] : null,
            'test_session', $session['public_ref'], ['flagged' => $quality['flagged']], $request);
        return ['ref' => $session['public_ref'], 'status' => 'completed'];
    }

    /** TEST-11: one rating per completed session. */
    public static function review(array $session, int $rating, ?string $comment): void
    {
        if ($session['status'] !== 'completed') {
            throw HttpException::conflict('You can rate your experience after submitting.', 'NOT_COMPLETED');
        }
        $inserted = Database::run(
            'INSERT IGNORE INTO session_reviews (session_id, rating, comment) VALUES (?, ?, ?)',
            [$session['id'], $rating, $comment]
        )->rowCount();
        if ($inserted === 0) {
            throw HttpException::conflict('You have already rated this assessment.', 'ALREADY_REVIEWED');
        }
    }

    /**
     * TEST-6/9: attach this browser's guest sessions to the account that just signed in.
     * If both the account and the guest have an in-progress session, the most recent one is kept.
     */
    public static function claimGuestSessions(int $userId, Request $request): int
    {
        $cookie = $request->cookie(self::GUEST_COOKIE) ?? Cookies::$jar[self::GUEST_COOKIE] ?? null;
        if (!is_string($cookie) || !preg_match('/^[A-Za-z0-9_-]{43}$/', $cookie)) {
            return 0;
        }
        $guestHash = hash('sha256', $cookie);

        $claimed = Database::transaction(static function () use ($userId, $guestHash): int {
            $inProgress = Database::all(
                "SELECT id FROM test_sessions WHERE status = 'in_progress'
                   AND (user_id = ? OR (user_id IS NULL AND guest_token_hash = ?))
                 ORDER BY last_activity_at DESC",
                [$userId, $guestHash]
            );
            foreach (array_slice($inProgress, 1) as $older) {
                Database::run("UPDATE test_sessions SET status = 'abandoned' WHERE id = ?", [$older['id']]);
            }
            return Database::run(
                'UPDATE test_sessions SET user_id = ?, guest_token_hash = NULL WHERE user_id IS NULL AND guest_token_hash = ?',
                [$userId, $guestHash]
            )->rowCount();
        });

        Cookies::clear(self::GUEST_COOKIE);
        if ($claimed > 0) {
            AuditService::log('SESSIONS_CLAIMED', 'user', $userId, 'user', $userId, ['count' => $claimed], $request);
        }
        return $claimed;
    }

    /** Daily housekeeping: mark long-inactive sessions as expired (TEST-10). */
    public static function expireInactive(): int
    {
        return Database::run(
            "UPDATE test_sessions SET status = 'expired'
             WHERE status = 'in_progress' AND last_activity_at < UTC_TIMESTAMP() - INTERVAL ? DAY",
            [self::INACTIVE_DAYS]
        )->rowCount();
    }

    // ------------------------------------------------------------------ helpers

    /** What the test page needs to (re)build its state. */
    public static function state(array $session): array
    {
        $answers = [];
        foreach (Database::all('SELECT item_id, value FROM session_answers WHERE session_id = ?', [$session['id']]) as $row) {
            $answers[(string) $row['item_id']] = (int) $row['value'];
        }
        return [
            'ref' => $session['public_ref'],
            'status' => $session['status'],
            'itemSetVersion' => $session['item_set_version'],
            'currentPage' => (int) $session['current_page'],
            'answers' => (object) $answers,
            'answeredCount' => count($answers),
            'activeSeconds' => (int) $session['active_seconds'],
            'totalItems' => count(PsychometricRepository::items($session['item_set_version'])),
            'nickname' => $session['nickname'],
            'startedAt' => gmdate('c', strtotime($session['started_at'] . ' UTC')),
        ];
    }

    private static function newRef(): string
    {
        $ref = 'TE-';
        for ($i = 0; $i < 6; $i++) {
            $ref .= self::REF_ALPHABET[random_int(0, strlen(self::REF_ALPHABET) - 1)];
        }
        return $ref;
    }
}
