<?php
declare(strict_types=1);

namespace Wellness\Services;

/**
 * Password rules (PRD AUTH-1): 8–128 characters, not a commonly used password,
 * not the user's own email. Length beats complexity rules (NIST SP 800-63B).
 */
final class PasswordPolicy
{
    public const MIN = 8;
    public const MAX = 128;

    /** @return string|null error message, or null when acceptable */
    public static function check(string $password, string $email = ''): ?string
    {
        $length = mb_strlen($password);
        if ($length < self::MIN) {
            return 'Use at least ' . self::MIN . ' characters.';
        }
        if ($length > self::MAX) {
            return 'Use at most ' . self::MAX . ' characters.';
        }
        $lower = mb_strtolower($password);
        if ($email !== '' && ($lower === mb_strtolower($email) || $lower === mb_strtolower(strstr($email, '@', true) ?: ''))) {
            return 'Your password must not be your email address.';
        }
        if (self::isCommon($lower)) {
            return 'This password is too common. Please choose something harder to guess.';
        }
        if (count(array_unique(mb_str_split($password))) < 4) {
            return 'Please use a less repetitive password.';
        }
        return null;
    }

    public static function hash(string $password): string
    {
        return password_hash($password, self::algorithm());
    }

    public static function needsRehash(string $hash): bool
    {
        return password_needs_rehash($hash, self::algorithm());
    }

    private static function algorithm(): string|int
    {
        return defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_DEFAULT;
    }

    private static function isCommon(string $lower): bool
    {
        static $list = null;
        if ($list === null) {
            $lines = file(__DIR__ . '/data/common-passwords.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
            $list = array_fill_keys(array_map('strtolower', $lines), true);
        }
        if (isset($list[$lower])) {
            return true;
        }
        // Catch trivial variants of a common word: "password123", "qwerty2024!", "Monkey!!".
        $base = preg_replace('/[\d\W_]+$/u', '', $lower) ?? $lower;
        return mb_strlen($base) >= 4 && isset($list[$base]);
    }
}
