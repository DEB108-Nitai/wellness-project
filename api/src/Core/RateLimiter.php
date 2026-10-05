<?php
declare(strict_types=1);

namespace Wellness\Core;

/**
 * Fixed-window rate limiter stored in MySQL (works on shared hosting without Redis).
 *
 *   RateLimiter::hit('login', $email . '|' . $request->ip(), 5, 900);  // 5 per 15 min
 */
final class RateLimiter
{
    /**
     * Count one attempt; throw 429 once the limit is exceeded.
     * @return int remaining attempts in this window
     */
    public static function hit(string $bucket, string $key, int $limit, int $windowSeconds): int
    {
        $hits = self::increment($bucket, $key, $windowSeconds);
        if ($hits > $limit) {
            throw HttpException::tooManyRequests(self::retryAfter($windowSeconds));
        }
        return $limit - $hits;
    }

    /** Is the key already over the limit (without counting a new attempt)? */
    public static function tooMany(string $bucket, string $key, int $limit, int $windowSeconds): bool
    {
        $hits = (int) Database::value(
            'SELECT hits FROM rate_limits WHERE bucket = ? AND key_hash = ? AND window_start = ?',
            [$bucket, self::hashKey($key), self::windowStart($windowSeconds)]
        );
        return $hits >= $limit;
    }

    public static function clear(string $bucket, string $key, int $windowSeconds): void
    {
        Database::run(
            'DELETE FROM rate_limits WHERE bucket = ? AND key_hash = ? AND window_start = ?',
            [$bucket, self::hashKey($key), self::windowStart($windowSeconds)]
        );
    }

    private static function increment(string $bucket, string $key, int $windowSeconds): int
    {
        $hash = self::hashKey($key);
        $window = self::windowStart($windowSeconds);
        Database::run(
            'INSERT INTO rate_limits (bucket, key_hash, window_start, hits) VALUES (?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE hits = hits + 1',
            [$bucket, $hash, $window]
        );

        // Occasionally purge expired windows (1 in 100 requests).
        if (random_int(1, 100) === 1) {
            Database::run('DELETE FROM rate_limits WHERE window_start < ?', [time() - 86400]);
        }

        return (int) Database::value(
            'SELECT hits FROM rate_limits WHERE bucket = ? AND key_hash = ? AND window_start = ?',
            [$bucket, $hash, $window]
        );
    }

    private static function windowStart(int $windowSeconds): int
    {
        return intdiv(time(), $windowSeconds) * $windowSeconds;
    }

    private static function retryAfter(int $windowSeconds): int
    {
        return max(1, self::windowStart($windowSeconds) + $windowSeconds - time());
    }

    private static function hashKey(string $key): string
    {
        return hash_hmac('sha256', mb_strtolower($key), Config::string('app.secret'));
    }
}
