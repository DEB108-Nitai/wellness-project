<?php
declare(strict_types=1);

namespace Transenigma\Core;

/**
 * Server-side PHP session with hardened cookie settings (PRD AUTH-7).
 * Started lazily — endpoints that never touch the session don't create one.
 */
final class Session
{
    public const COOKIE = 'te_sid';
    /** Session key: when the cookie's expiry was last pushed forward. */
    private const COOKIE_SET_AT = '_cookie_at';
    private const RENEW_EVERY = 86400;

    private static bool $started = false;

    public static function start(?Request $request = null): void
    {
        if (self::$started) {
            return;
        }
        if (PHP_SAPI === 'cli') { // tests: plain in-memory array
            $_SESSION ??= [];
            self::$started = true;
            return;
        }

        $lifetime = Config::int('session.lifetime_days', 30) * 86400;
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.use_trans_sid', '0');
        ini_set('session.cookie_httponly', '1');
        ini_set('session.gc_maxlifetime', (string) $lifetime);
        ini_set('session.sid_length', '48');
        ini_set('session.sid_bits_per_character', '6');
        session_save_path(Config::path('sessions'));
        session_name(self::COOKIE);
        session_set_cookie_params([
            'lifetime' => $lifetime,
            'path' => '/',
            'secure' => Config::isProduction() || ($request?->isHttps() ?? false),
            'httponly' => true,
            'samesite' => 'Lax', // Lax so the Google OAuth redirect back keeps the session
        ]);
        session_start();
        self::$started = true;
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        self::start();
        return $_SESSION[$key] ?? $default;
    }

    public static function set(string $key, mixed $value): void
    {
        self::start();
        $_SESSION[$key] = $value;
    }

    public static function forget(string $key): void
    {
        self::start();
        unset($_SESSION[$key]);
    }

    /** New session ID on privilege change (sign-in) to prevent session fixation. */
    public static function regenerate(): void
    {
        self::start();
        if (PHP_SAPI !== 'cli') {
            session_regenerate_id(true); // sends the new cookie with a full lifetime
        }
        $_SESSION[self::COOKIE_SET_AT] = time();
    }

    /**
     * Sliding expiry (AUTH-7): PHP sends the cookie only when a session starts, so an active user
     * would still be signed out N days after sign-in. Re-send it with a fresh expiry, at most once a day.
     */
    public static function renewCookie(): void
    {
        self::start();
        if (time() - (int) ($_SESSION[self::COOKIE_SET_AT] ?? 0) < self::RENEW_EVERY) {
            return;
        }
        if (PHP_SAPI !== 'cli' && !headers_sent()) {
            $params = session_get_cookie_params();
            setcookie(self::COOKIE, session_id(), [
                'expires' => time() + $params['lifetime'],
                'path' => $params['path'],
                'secure' => $params['secure'],
                'httponly' => true,
                'samesite' => $params['samesite'],
            ]);
        }
        $_SESSION[self::COOKIE_SET_AT] = time();
    }

    /**
     * Delete session files untouched for longer than $maxAge seconds. Shared hosts often disable
     * PHP's own session garbage collection, and nothing else cleans our private save path.
     * Called by the daily cron. Returns the number of files deleted.
     */
    public static function purgeFiles(string $dir, int $maxAge): int
    {
        $deleted = 0;
        $cutoff = time() - $maxAge;
        foreach (glob(rtrim($dir, '/\\') . '/sess_*') ?: [] as $file) {
            if (is_file($file) && filemtime($file) < $cutoff && @unlink($file)) {
                $deleted++;
            }
        }
        return $deleted;
    }

    public static function destroy(): void
    {
        self::start();
        $_SESSION = [];
        if (PHP_SAPI !== 'cli') {
            $params = session_get_cookie_params();
            setcookie(self::COOKIE, '', [
                'expires' => time() - 3600,
                'path' => $params['path'],
                'secure' => $params['secure'],
                'httponly' => true,
                'samesite' => $params['samesite'],
            ]);
            session_destroy();
        }
        self::$started = false;
    }
}
