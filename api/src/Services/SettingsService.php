<?php
declare(strict_types=1);

namespace Transenigma\Services;

use Transenigma\Core\Database;

/**
 * Typed access to the `settings` table. Every setting is declared here with its
 * type, default and whether the public site may read it (GET /api/settings/public).
 */
final class SettingsService
{
    /** @var array<string, array{type:string, default:mixed, public:bool, min?:int, max?:int, host?:string}> */
    public const DEFINITIONS = [
        'site_name' => ['type' => 'string', 'default' => 'Transenigma', 'public' => true, 'max' => 60],
        'support_email' => ['type' => 'email', 'default' => '', 'public' => true],
        // Company LinkedIn page for the footer; empty hides the link. Only https links on linkedin.com are accepted.
        'linkedin_url' => ['type' => 'url', 'default' => '', 'public' => true, 'max' => 255, 'host' => 'linkedin.com'],
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

    /**
     * Validate and store admin changes (ADM-8). Unknown keys are rejected; values are
     * checked against each definition so a bad value can never break the site.
     * @return array<string,mixed> the full, updated settings
     */
    public static function update(array $changes, int $adminId): array
    {
        $errors = [];
        $clean = [];
        foreach ($changes as $key => $value) {
            $def = self::DEFINITIONS[$key] ?? null;
            if ($def === null) {
                $errors[$key] = 'Unknown setting.';
                continue;
            }
            switch ($def['type']) {
                case 'bool':
                    if (!is_bool($value)) {
                        $errors[$key] = 'Must be true or false.';
                        continue 2;
                    }
                    $clean[$key] = $value ? '1' : '0';
                    break;
                case 'int':
                    if (!is_int($value) || $value < ($def['min'] ?? PHP_INT_MIN) || $value > ($def['max'] ?? PHP_INT_MAX)) {
                        $errors[$key] = sprintf('Must be a whole number between %d and %d.', $def['min'] ?? 0, $def['max'] ?? 0);
                        continue 2;
                    }
                    $clean[$key] = (string) $value;
                    break;
                case 'email':
                    $value = is_string($value) ? mb_strtolower(trim($value)) : '';
                    if ($value !== '' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
                        $errors[$key] = 'Please enter a valid email address.';
                        continue 2;
                    }
                    $clean[$key] = $value;
                    break;
                case 'url':
                    $value = is_string($value) ? trim($value) : '';
                    $host = strtolower((string) parse_url($value, PHP_URL_HOST));
                    $allowed = $def['host'] ?? null;
                    if ($value !== '' && (
                        !filter_var($value, FILTER_VALIDATE_URL)
                        || !str_starts_with($value, 'https://')
                        || mb_strlen($value) > ($def['max'] ?? 255)
                        || ($allowed !== null && $host !== $allowed && !str_ends_with($host, '.' . $allowed))
                    )) {
                        $errors[$key] = $allowed !== null ? "Please enter an https:// link on $allowed." : 'Please enter a valid https:// link.';
                        continue 2;
                    }
                    $clean[$key] = $value;
                    break;
                default:
                    $value = is_string($value) ? \Transenigma\Core\Validator::cleanString($value) : '';
                    if (mb_strlen($value) > ($def['max'] ?? 255) || ($key === 'site_name' && $value === '')) {
                        $errors[$key] = 'Please enter a valid value (max ' . ($def['max'] ?? 255) . ' characters).';
                        continue 2;
                    }
                    $clean[$key] = $value;
            }
        }
        if ($errors) {
            throw \Transenigma\Core\HttpException::validation($errors);
        }
        foreach ($clean as $key => $value) {
            Database::run(
                'INSERT INTO settings (setting_key, value, updated_by) VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE value = VALUES(value), updated_by = VALUES(updated_by)',
                [$key, $value, $adminId]
            );
        }
        self::flush();
        return self::all();
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
