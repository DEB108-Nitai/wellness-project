<?php
declare(strict_types=1);

namespace Wellness\Services;

use Wellness\Core\Database;

/**
 * Typed access to the `settings` table. Every setting is declared here with its
 * type, default and whether the public site may read it (GET /api/settings/public).
 */
final class SettingsService
{
    /** @var array<string, array{type:string, default:mixed, public:bool, min?:int, max?:int}> */
    public const DEFINITIONS = [
        'site_name' => ['type' => 'string', 'default' => 'Wellness', 'public' => true, 'max' => 60],
        'support_email' => ['type' => 'email', 'default' => '', 'public' => true],
        'announcement_text' => ['type' => 'string', 'default' => '', 'public' => true, 'max' => 200],
        'announcement_active' => ['type' => 'bool', 'default' => false, 'public' => true],
        'maintenance_mode' => ['type' => 'bool', 'default' => false, 'public' => true],
        'signup_open' => ['type' => 'bool', 'default' => true, 'public' => true],
        'challenge_registration_open' => ['type' => 'bool', 'default' => true, 'public' => true],
        'items_per_page' => ['type' => 'int', 'default' => 7, 'public' => true, 'min' => 5, 'max' => 10],
        'min_age' => ['type' => 'int', 'default' => 18, 'public' => true, 'min' => 18, 'max' => 99],
        'too_fast_minutes' => ['type' => 'int', 'default' => 6, 'public' => false, 'min' => 1, 'max' => 60],
        'consent_version' => ['type' => 'string', 'default' => 'v1.0', 'public' => false, 'max' => 20],
    ];

    /** @var array<string,mixed>|null per-request cache */
    private static ?array $cache = null;

    /** @return array<string,mixed> */
    public static function all(): array
    {
        if (self::$cache !== null) {
            return self::$cache;
        }
        $stored = [];
        foreach (Database::all('SELECT setting_key, value FROM settings') as $row) {
            $stored[$row['setting_key']] = $row['value'];
        }
        $values = [];
        foreach (self::DEFINITIONS as $key => $def) {
            $values[$key] = array_key_exists($key, $stored) ? self::cast($stored[$key], $def) : $def['default'];
        }
        return self::$cache = $values;
    }

    /** @return array<string,mixed> settings safe to expose to anyone */
    public static function public(): array
    {
        return array_filter(
            self::all(),
            static fn (string $key): bool => self::DEFINITIONS[$key]['public'],
            ARRAY_FILTER_USE_KEY
        );
    }

    public static function get(string $key): mixed
    {
        return self::all()[$key] ?? null;
    }

    public static function bool(string $key): bool
    {
        return (bool) self::get($key);
    }

    public static function int(string $key): int
    {
        return (int) self::get($key);
    }

    public static function flush(): void
    {
        self::$cache = null;
    }

    private static function cast(string $raw, array $def): mixed
    {
        $value = match ($def['type']) {
            'bool' => $raw === '1',
            'int' => (int) $raw,
            default => $raw,
        };
        // Clamp stored ints so a bad row can never break the app (e.g. min_age below 18).
        if ($def['type'] === 'int') {
            $value = max($def['min'] ?? PHP_INT_MIN, min($def['max'] ?? PHP_INT_MAX, $value));
        }
        return $value;
    }
}
