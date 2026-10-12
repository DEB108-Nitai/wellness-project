<?php
declare(strict_types=1);

namespace Transenigma\Services;

use Transenigma\Core\Database;
use Transenigma\Core\HttpException;
use Transenigma\Core\Logger;
use Transenigma\Core\RateLimiter;
use Transenigma\Core\Request;
use Transenigma\Core\Session;
use Transenigma\Repositories\UserRepository;
use Transenigma\Support\Totp;

/**
 * Admin two-step sign-in (PRD ADM-12): an authenticator-app code after the password or Google, every time.
 * A new admin sets it up at their first sign-in and gets 10 single-use recovery codes. The session stays
 * "pending" (signed out everywhere else) until the code passes; see AuthService::signIn().
 */
final class TwoFactorService
{
    private const LIMIT = 5;          // wrong codes per admin …
    private const WINDOW = 900;       // … per 15 minutes
    private const IP_LIMIT = 30;      // all code attempts per IP per 15 minutes
    private const RECOVERY_COUNT = 10;
    private const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I: easy to copy by hand
    /** A replacement authenticator being set up by a signed-in admin. */
    private const S_REPLACE = 'auth_totp_new';
    private const REPLACE_TTL = 600;

    // ------------------------------------------------------------------ during sign-in

    /** First sign-in as admin: a new secret for the authenticator app (the same one until the setup ends). */
    public static function setup(): array
    {
        $user = self::pendingUser();
        if ($user['totp_enabled_at'] !== null) {
            throw HttpException::conflict('Two-step sign-in is already set up for this account.', 'TWO_FACTOR_ALREADY_ON');
        }
        $secret = AuthService::pendingSecret() ?? Totp::newSecret();
        AuthService::setPendingSecret($secret);
        return self::secretPayload($secret, $user);
    }

    /** Confirm the first code from the new app: turns two-step sign-in on and finishes signing in. */
    public static function enable(string $code, Request $request): array
    {
        $pending = AuthService::pendingSecondStep() ?? throw self::expired();
        $user = $pending['user'];
        if ($user['totp_enabled_at'] !== null) {
            throw HttpException::conflict('Two-step sign-in is already set up for this account.', 'TWO_FACTOR_ALREADY_ON');
        }
        $secret = $pending['secret'] ?? throw HttpException::badRequest('Please start the setup again.', 'TWO_FACTOR_SETUP_MISSING');
        self::guard($user, $request);
        $step = Totp::matchStep($secret, self::digits($code)) ?? self::fail($user, $request);

        $codes = Database::transaction(static function () use ($user, $secret, $step): array {
            $done = Database::run(
                'UPDATE users SET totp_secret_enc = ?, totp_enabled_at = UTC_TIMESTAMP(), totp_last_step = ?
                 WHERE id = ? AND totp_enabled_at IS NULL',
                [Totp::encrypt($secret, self::ctx($user)), $step, $user['id']]
            )->rowCount() === 1;
            if (!$done) {
                throw HttpException::conflict('Two-step sign-in was just set up in another window. Please sign in again.', 'TWO_FACTOR_ALREADY_ON');
            }
            return self::issueRecoveryCodes((int) $user['id']);
        });

        RateLimiter::clear('2fa', (string) $user['id'], self::WINDOW);
        AuditService::forUser($user, 'AUTH_2FA_ENABLED', 'user', null, [], $request);
        AuthService::completeSecondStep($user, $request, $pending['method'], 'enrolled');
        self::notify($user, 'enabled');
        return $codes;
    }

    /**
     * The code at each admin sign-in: from the app, or a recovery code. Finishes signing in.
     * Returns how many recovery codes are left when one was used, otherwise null.
     */
    public static function verify(string $code, Request $request): ?int
    {
        $pending = AuthService::pendingSecondStep() ?? throw self::expired();
        $user = $pending['user'];
        if ($user['totp_enabled_at'] === null) {
            throw HttpException::badRequest('Please set up two-step sign-in first.', 'TWO_FACTOR_NOT_SET_UP');
        }
        $how = self::accept($user, $code, $request);
        AuthService::completeSecondStep($user, $request, $pending['method'], $how);
        return $how === 'recovery' ? self::recoveryUsed($user, $request) : null;
    }

    // ------------------------------------------------------------------ signed-in admin (Security page)

    public static function status(array $user): array
    {
        return [
            'enabledAt' => $user['totp_enabled_at'] === null ? null : gmdate('c', strtotime($user['totp_enabled_at'] . ' UTC')),
            'recoveryCodesLeft' => self::recoveryLeft((int) $user['id']),
        ];
    }

    /** New set of 10 recovery codes (the old ones stop working). Needs a current code. */
    public static function regenerateRecoveryCodes(array $user, string $code, Request $request): array
    {
        self::confirmCode($user, $code, $request);
        $codes = Database::transaction(static fn (): array => self::issueRecoveryCodes((int) $user['id']));
        AuditService::forUser($user, 'AUTH_2FA_RECOVERY_REGENERATED', 'user', null, [], $request);
        self::notify($user, 'recovery_regenerated');
        return $codes;
    }

    /** Start moving to a new phone or app. Needs a current code (or a recovery code, for a lost phone). */
    public static function startReplace(array $user, string $code, Request $request): array
    {
        self::confirmCode($user, $code, $request);
        $secret = Totp::newSecret();
        Session::set(self::S_REPLACE, ['uid' => (int) $user['id'], 'secret' => Totp::encrypt($secret, 'replace:' . $user['id']), 'at' => time()]);
        return self::secretPayload($secret, $user);
    }

    /** Confirm the first code from the new app. Other devices are signed out; this one stays signed in. */
    public static function confirmReplace(array $user, string $code, Request $request): void
    {
        $new = Session::get(self::S_REPLACE);
        $secret = is_array($new) && $new['uid'] === (int) $user['id'] && time() - $new['at'] <= self::REPLACE_TTL
            ? Totp::decrypt($new['secret'], 'replace:' . $user['id'])
            : null;
        if ($secret === null) {
            Session::forget(self::S_REPLACE);
            throw HttpException::badRequest('This setup has expired. Please start again.', 'TWO_FACTOR_SETUP_MISSING');
        }
        self::guard($user, $request);
        $step = Totp::matchStep($secret, self::digits($code)) ?? self::fail($user, $request);

        $version = (int) $user['session_version'];
        $done = Database::run(
            'UPDATE users SET totp_secret_enc = ?, totp_enabled_at = UTC_TIMESTAMP(), totp_last_step = ?, session_version = session_version + 1
             WHERE id = ? AND session_version = ?',
            [Totp::encrypt($secret, self::ctx($user)), $step, $user['id'], $version]
        )->rowCount() === 1;
        Session::forget(self::S_REPLACE);
        if (!$done) {
            AuthService::signOutStale();
            throw HttpException::unauthorized('Your session ended because your account changed elsewhere. Please sign in again.');
        }
        RateLimiter::clear('2fa', (string) $user['id'], self::WINDOW);
        AuthService::keepSessionAt($version + 1);
        AuditService::forUser($user, 'AUTH_2FA_CHANGED', 'user', null, [], $request);
        self::notify($user, 'changed');
    }

    /** Server command line (create-admin.php --reset-2fa): the admin sets it up again at their next sign-in. */
    public static function reset(array $user): void
    {
        Database::transaction(static function () use ($user): void {
            Database::run(
                'UPDATE users SET totp_secret_enc = NULL, totp_enabled_at = NULL, totp_last_step = NULL, session_version = session_version + 1 WHERE id = ?',
                [$user['id']]
            );
            Database::run('DELETE FROM admin_recovery_codes WHERE user_id = ?', [$user['id']]);
        });
        AuditService::log('AUTH_2FA_RESET', 'system', null, 'user', $user['id']);
        self::notify($user, 'reset');
    }

    // ------------------------------------------------------------------ internals

    private static function pendingUser(): array
    {
        return (AuthService::pendingSecondStep() ?? throw self::expired())['user'];
    }

    private static function expired(): HttpException
    {
        return HttpException::unauthorized('Your sign-in has expired. Please sign in again.', 'TWO_FACTOR_EXPIRED');
    }

    private static function secretPayload(string $secret, array $user): array
    {
        $issuer = SettingsService::get('site_name') ?: 'Transenigma';
        return [
            'secret' => $secret,
            'uri' => Totp::uri($secret, $user['email'], (string) $issuer),
        ];
    }

    /** A code from the app or an unused recovery code, for a sensitive action by a signed-in admin (step-up). */
    public static function confirmCode(array $user, string $code, Request $request): void
    {
        $user = UserRepository::find((int) $user['id']) ?? throw HttpException::unauthorized();
        $how = self::accept($user, $code, $request);
        if ($how === 'recovery') {
            self::recoveryUsed($user, $request);
        }
    }

    /**
     * Count the attempt before the code is checked (so parallel requests cannot each slip under the limit);
     * a correct code clears the count again.
     */
    private static function guard(array $user, Request $request): void
    {
        RateLimiter::hit('2fa_ip', $request->ip(), self::IP_LIMIT, self::WINDOW);
        try {
            RateLimiter::hit('2fa', (string) $user['id'], self::LIMIT, self::WINDOW);
        } catch (HttpException) {
            AuditService::forUser($user, 'AUTH_2FA_LOCKOUT', 'user', null, [], $request);
            throw new HttpException(429, 'TWO_FACTOR_LOCKED', 'Too many wrong codes. Please wait 15 minutes and try again.', [], ['Retry-After' => (string) self::WINDOW]);
        }
    }

    /** Check an app or recovery code for the admin's account; returns 'totp' or 'recovery', or throws. */
    private static function accept(array $user, string $code, Request $request): string
    {
        self::guard($user, $request);
        $how = self::check($user, $code);
        if ($how === 'reused') {
            throw HttpException::validation(['code' => 'That code was just used. Wait for the next code in your app (it changes every 30 seconds).']);
        }
        if ($how === 'unreadable') {
            Logger::error('Two-step sign-in secret could not be decrypted (was app.secret changed?)', ['user_id' => $user['id']]);
            throw HttpException::validation(['code' => 'Codes from your app cannot be checked right now. Sign in with a recovery code, then use “Move to a new phone” on the Security page.']);
        }
        if ($how === null) {
            self::fail($user, $request);
        }
        RateLimiter::clear('2fa', (string) $user['id'], self::WINDOW);
        return $how;
    }

    private static function fail(array $user, Request $request): never
    {
        AuditService::forUser($user, 'AUTH_2FA_FAILED', 'user', null, [], $request);
        throw HttpException::validation(['code' => 'That code is not right. Use the newest code in your app, or a recovery code.']);
    }

    /**
     * Check and use up a code: 'totp' or 'recovery'; 'reused' for an app code already used, 'unreadable' when the
     * stored secret cannot be decrypted; null when it is wrong. An app code is accepted only for a later time step
     * than the last one used, so a code seen over someone's shoulder cannot be replayed.
     */
    private static function check(array $user, string $code): ?string
    {
        $clean = strtoupper((string) preg_replace('/[^0-9A-Za-z]/', '', $code));
        if (preg_match('/^\d{' . Totp::DIGITS . '}$/', $clean)) {
            if ($user['totp_secret_enc'] === null) {
                return null;
            }
            $secret = Totp::decrypt($user['totp_secret_enc'], self::ctx($user));
            if ($secret === null) {
                return 'unreadable';
            }
            $step = Totp::matchStep($secret, $clean);
            if ($step === null) {
                return null;
            }
            $fresh = Database::run(
                'UPDATE users SET totp_last_step = ? WHERE id = ? AND (totp_last_step IS NULL OR totp_last_step < ?)',
                [$step, $user['id'], $step]
            )->rowCount() === 1;
            return $fresh ? 'totp' : 'reused';
        }
        if (strlen($clean) === 10) {
            $used = Database::run(
                'UPDATE admin_recovery_codes SET used_at = UTC_TIMESTAMP() WHERE user_id = ? AND code_hash = ? AND used_at IS NULL',
                [$user['id'], hash('sha256', $clean)]
            )->rowCount() === 1;
            return $used ? 'recovery' : null;
        }
        return null;
    }

    /** The context a stored secret is bound to. */
    private static function ctx(array $user): string
    {
        return 'user:' . $user['id'];
    }

    private static function digits(string $code): string
    {
        return (string) preg_replace('/\D/', '', $code);
    }

    /** Replace the admin's recovery codes; returns them formatted for display (shown once, stored hashed). */
    private static function issueRecoveryCodes(int $userId): array
    {
        Database::run('DELETE FROM admin_recovery_codes WHERE user_id = ?', [$userId]);
        $codes = [];
        while (count($codes) < self::RECOVERY_COUNT) {
            $raw = '';
            for ($i = 0; $i < 10; $i++) {
                $raw .= self::RECOVERY_ALPHABET[random_int(0, strlen(self::RECOVERY_ALPHABET) - 1)];
            }
            $codes[$raw] = substr($raw, 0, 5) . '-' . substr($raw, 5);
        }
        foreach (array_keys($codes) as $raw) {
            Database::run('INSERT INTO admin_recovery_codes (user_id, code_hash) VALUES (?, ?)', [$userId, hash('sha256', (string) $raw)]);
        }
        return array_values($codes);
    }

    private static function recoveryLeft(int $userId): int
    {
        return (int) Database::value('SELECT COUNT(*) FROM admin_recovery_codes WHERE user_id = ? AND used_at IS NULL', [$userId]);
    }

    private static function recoveryUsed(array $user, Request $request): int
    {
        $left = self::recoveryLeft((int) $user['id']);
        AuditService::forUser($user, 'AUTH_2FA_RECOVERY_USED', 'user', null, ['left' => $left], $request);
        self::notify($user, 'recovery_used', ['left' => $left]);
        return $left;
    }

    private static function notify(array $user, string $event, array $vars = []): void
    {
        Mailer::send($user['email'], 'two-step-notice', ['name' => $user['name'], 'event' => $event] + $vars);
    }
}
