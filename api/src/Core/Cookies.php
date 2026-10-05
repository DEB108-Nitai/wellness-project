<?php
declare(strict_types=1);

namespace Wellness\Core;

/**
 * Hardened cookie writes (HttpOnly, SameSite=Lax, Secure in production).
 * In CLI (tests) values are kept in memory so flows can be asserted.
 */
final class Cookies
{
    /** @var array<string,string> CLI-only jar */
    public static array $jar = [];

    public static function set(string $name, string $value, int $days): void
    {
        if (PHP_SAPI === 'cli') {
            self::$jar[$name] = $value;
            return;
        }
        setcookie($name, $value, [
            'expires' => time() + $days * 86400,
            'path' => '/',
            'secure' => Config::isProduction(),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    public static function clear(string $name): void
    {
        if (PHP_SAPI === 'cli') {
            unset(self::$jar[$name]);
            return;
        }
        setcookie($name, '', [
            'expires' => time() - 3600,
            'path' => '/',
            'secure' => Config::isProduction(),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }
}
