<?php
declare(strict_types=1);

namespace Transenigma\Core;

use RuntimeException;

/**
 * Loads config.php. Lookup order (PRD §6.2):
 *   1. path in the TRANSENIGMA_CONFIG environment variable
 *   2. ../../transenigma-config/config.php  (sibling of the web root — production)
 *   3. api/config/config.local.php       (local development; denied by .htaccess)
 */
final class Config
{
    private static array $values = [];
    private static ?string $file = null;

    public static function load(): void
    {
        $candidates = array_filter([
            getenv('TRANSENIGMA_CONFIG') ?: null,
            dirname(API_ROOT, 2) . '/transenigma-config/config.php',
            API_ROOT . '/config/config.local.php',
        ]);

        foreach ($candidates as $candidate) {
            if (is_file($candidate)) {
                self::$file = $candidate;
                $values = require $candidate;
                if (!is_array($values)) {
                    throw new RuntimeException('Config file must return an array.');
                }
                self::$values = $values;
                self::validate();
                return;
            }
        }

        throw new RuntimeException('No configuration file found. Copy api/config/config.example.php to api/config/config.local.php.');
    }

    /** Replace values at runtime (used by the test runner to point at the test database). */
    public static function override(string $key, mixed $value): void
    {
        $ref = &self::$values;
        foreach (explode('.', $key) as $part) {
            if (!isset($ref[$part]) || !is_array($ref[$part])) {
                $ref[$part] = [];
            }
            $ref = &$ref[$part];
        }
        $ref = $value;
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        $value = self::$values;
        foreach (explode('.', $key) as $part) {
            if (!is_array($value) || !array_key_exists($part, $value)) {
                return $default;
            }
            $value = $value[$part];
        }
        return $value;
    }

    public static function string(string $key, string $default = ''): string
    {
        return (string) self::get($key, $default);
    }

    public static function bool(string $key, bool $default = false): bool
    {
        return (bool) self::get($key, $default);
    }

    public static function int(string $key, int $default = 0): int
    {
        return (int) self::get($key, $default);
    }

    public static function isProduction(): bool
    {
        return self::string('app.env') === 'production';
    }

    /** Writable/readable directories; defaults live under api/storage (denied by .htaccess). */
    public static function path(string $name): string
    {
        $configured = self::get("paths.$name");
        $path = $configured ?: match ($name) {
            'logs' => API_ROOT . '/storage/logs',
            'sessions' => API_ROOT . '/storage/sessions',
            'cache' => API_ROOT . '/storage/cache',
            'mail' => API_ROOT . '/storage/mail',
            'migrations' => dirname(API_ROOT) . '/database/migrations',
            default => throw new RuntimeException("Unknown path '$name'"),
        };
        if ($name !== 'migrations' && !is_dir($path)) {
            mkdir($path, 0750, true);
        }
        return rtrim($path, '/\\');
    }

    private static function validate(): void
    {
        foreach (['app.env', 'app.url', 'app.secret', 'db.host', 'db.name', 'db.user'] as $required) {
            if (self::get($required) === null || self::get($required) === '') {
                throw new RuntimeException("Missing required config value '$required' in " . self::$file);
            }
        }
        if (!in_array(self::get('app.env'), ['local', 'production'], true)) {
            throw new RuntimeException("app.env must be 'local' or 'production'.");
        }
        if (strlen(self::string('app.secret')) < 32) {
            throw new RuntimeException('app.secret must be at least 32 characters (use: php -r "echo bin2hex(random_bytes(32));").');
        }
        if (self::isProduction() && self::bool('app.debug')) {
            throw new RuntimeException('app.debug must be false in production.');
        }
    }
}
