<?php
declare(strict_types=1);

namespace Transenigma\Repositories;

use Transenigma\Core\Database;

final class UserRepository
{
    private const COLUMNS = 'id, email, name, password_hash, google_sub, role, status, session_version,
                             email_verified_at, last_login_at, created_at';

    public static function find(int $id): ?array
    {
        return Database::one('SELECT ' . self::COLUMNS . ' FROM users WHERE id = ?', [$id]);
    }

    public static function findByEmail(string $email): ?array
    {
        return Database::one('SELECT ' . self::COLUMNS . ' FROM users WHERE email = ?', [mb_strtolower(trim($email))]);
    }

    public static function findByGoogleSub(string $sub): ?array
    {
        return Database::one('SELECT ' . self::COLUMNS . ' FROM users WHERE google_sub = ?', [$sub]);
    }

    public static function create(string $name, string $email, ?string $passwordHash, ?string $googleSub = null, bool $verified = false, string $role = 'user'): int
    {
        return Database::insert(
            'INSERT INTO users (name, email, password_hash, google_sub, role, email_verified_at)
             VALUES (?, ?, ?, ?, ?, ' . ($verified ? 'UTC_TIMESTAMP()' : 'NULL') . ')',
            [$name, mb_strtolower(trim($email)), $passwordHash, $googleSub, $role]
        );
    }

    /** Store a new password hash and invalidate all existing sessions. */
    public static function updatePassword(int $id, string $hash): void
    {
        Database::run('UPDATE users SET password_hash = ?, session_version = session_version + 1 WHERE id = ?', [$hash, $id]);
    }

    /** Transparent re-hash on login (algorithm upgrade) — does not sign anyone out. */
    public static function rehashPassword(int $id, string $hash): void
    {
        Database::run('UPDATE users SET password_hash = ? WHERE id = ?', [$hash, $id]);
    }

    public static function markVerified(int $id): void
    {
        Database::run('UPDATE users SET email_verified_at = COALESCE(email_verified_at, UTC_TIMESTAMP()) WHERE id = ?', [$id]);
    }

    /**
     * Before Google links to an account whose email was never verified: whoever set its password never
     * proved they own the inbox (possible pre-registration by someone else), so the password is removed
     * and every existing session is signed out. Returns true when anything was dropped.
     */
    public static function dropUnprovenPassword(int $id): bool
    {
        return Database::run(
            'UPDATE users SET password_hash = NULL, session_version = session_version + 1
             WHERE id = ? AND email_verified_at IS NULL AND password_hash IS NOT NULL',
            [$id]
        )->rowCount() > 0;
    }

    public static function linkGoogle(int $id, string $sub): void
    {
        Database::run('UPDATE users SET google_sub = ?, email_verified_at = COALESCE(email_verified_at, UTC_TIMESTAMP()) WHERE id = ?', [$sub, $id]);
    }

    public static function touchLogin(int $id): void
    {
        Database::run('UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?', [$id]);
    }

    public static function updateName(int $id, string $name): void
    {
        Database::run('UPDATE users SET name = ? WHERE id = ?', [$name, $id]);
    }

    public static function setRole(int $id, string $role): void
    {
        Database::run('UPDATE users SET role = ? WHERE id = ?', [$role, $id]);
    }

    /** The only shape of a user ever sent to the browser. */
    public static function toPublic(array $user): array
    {
        return [
            'id' => (int) $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role'],
            'emailVerified' => $user['email_verified_at'] !== null,
            'hasPassword' => $user['password_hash'] !== null,
            'hasGoogle' => $user['google_sub'] !== null,
            'createdAt' => $user['created_at'] === null ? null : gmdate('c', strtotime($user['created_at'] . ' UTC')),
        ];
    }
}
