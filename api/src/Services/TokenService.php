<?php
declare(strict_types=1);

namespace Transenigma\Services;

use Transenigma\Core\Database;

/**
 * Single-use emailed tokens (verify email, reset password). Only a SHA-256 hash
 * is stored, so a database leak never exposes a usable link (PRD AUTH-5/6).
 */
final class TokenService
{
    public const VERIFY_EMAIL = 'verify_email';
    public const RESET_PASSWORD = 'reset_password';

    private const TTL = [
        self::VERIFY_EMAIL => 48 * 3600,
        self::RESET_PASSWORD => 3600,
    ];

    /** Issue a new token, revoking any unused token of the same type for the user. */
    public static function issue(int $userId, string $type): string
    {
        $token = self::random();
        Database::transaction(static function () use ($userId, $type, $token): void {
            Database::run('UPDATE auth_tokens SET used_at = UTC_TIMESTAMP() WHERE user_id = ? AND type = ? AND used_at IS NULL', [$userId, $type]);
            Database::run(
                'INSERT INTO auth_tokens (user_id, type, token_hash, expires_at) VALUES (?, ?, ?, UTC_TIMESTAMP() + INTERVAL ? SECOND)',
                [$userId, $type, hash('sha256', $token), self::TTL[$type]]
            );
        });
        return $token;
    }

    /**
     * Mark a valid token as used and return its user id, or null if the token is
     * unknown, expired or already used. Atomic: two concurrent uses cannot both succeed.
     */
    public static function consume(string $token, string $type): ?int
    {
        if (!preg_match('/^[A-Za-z0-9_-]{43}$/', $token)) {
            return null;
        }
        $hash = hash('sha256', $token);
        $updated = Database::run(
            'UPDATE auth_tokens SET used_at = UTC_TIMESTAMP()
             WHERE token_hash = ? AND type = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP()',
            [$hash, $type]
        )->rowCount();
        if ($updated !== 1) {
            return null;
        }
        return (int) Database::value('SELECT user_id FROM auth_tokens WHERE token_hash = ?', [$hash]);
    }

    /** 256-bit URL-safe random token (43 chars). */
    public static function random(): string
    {
        return rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
    }
}
