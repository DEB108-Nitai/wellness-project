<?php
declare(strict_types=1);

namespace Wellness\Repositories;

use RuntimeException;
use Wellness\Core\Database;

/**
 * Read-only access to item sets, factor metadata and norms (cached per request).
 */
final class PsychometricRepository
{
    private static array $cache = [];

    public static function activeItemSetVersion(): string
    {
        return self::$cache['active_set'] ??= (string) (Database::value('SELECT version FROM item_sets WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1')
            ?? throw new RuntimeException('No active item set'));
    }

    public static function activeNormVersion(): string
    {
        return self::$cache['active_norms'] ??= (string) (Database::value('SELECT version FROM norm_sets WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1')
            ?? throw new RuntimeException('No active norm set'));
    }

    /**
     * @return array<int, array{id:int, item_code:string, factor_code:?string, keyed:?string, is_attention_check:bool, expected_answer:?int, text:string, position:int}>
     *         keyed by item id, ordered by position
     */
    public static function items(string $version): array
    {
        if (!isset(self::$cache["items:$version"])) {
            $items = [];
            foreach (Database::all('SELECT id, item_code, factor_code, keyed, is_attention_check, expected_answer, text, position FROM items WHERE item_set_version = ? ORDER BY position', [$version]) as $row) {
                $row['id'] = (int) $row['id'];
                $row['position'] = (int) $row['position'];
                $row['is_attention_check'] = (bool) $row['is_attention_check'];
                $row['expected_answer'] = $row['expected_answer'] === null ? null : (int) $row['expected_answer'];
                $items[$row['id']] = $row;
            }
            self::$cache["items:$version"] = $items;
        }
        return self::$cache["items:$version"];
    }

    /** @return array<string, array> factor code => metadata row, in display order */
    public static function factors(): array
    {
        if (!isset(self::$cache['factors'])) {
            self::$cache['factors'] = [];
            foreach (Database::all('SELECT * FROM factors ORDER BY sort_order') as $row) {
                self::$cache['factors'][$row['code']] = $row;
            }
        }
        return self::$cache['factors'];
    }

    /** @return array<string, array> domain code => metadata row incl. 'weights' => [factor => ±1] */
    public static function domains(): array
    {
        if (!isset(self::$cache['domains'])) {
            $domains = [];
            foreach (Database::all('SELECT * FROM domains ORDER BY sort_order') as $row) {
                $row['weights'] = [];
                $domains[$row['code']] = $row;
            }
            foreach (Database::all('SELECT domain_code, factor_code, weight FROM domain_weights') as $w) {
                $domains[$w['domain_code']]['weights'][$w['factor_code']] = (int) $w['weight'];
            }
            self::$cache['domains'] = $domains;
        }
        return self::$cache['domains'];
    }

    /**
     * @return array{factors: array<string, array{mean:float, sd:float}>, percentiles: array<string, array<int,float>>, domains: array<string, array{mean:float, sd:float}>}
     */
    public static function norms(string $version): array
    {
        if (!isset(self::$cache["norms:$version"])) {
            $norms = ['factors' => [], 'percentiles' => [], 'domains' => []];
            foreach (Database::all('SELECT factor_code, mean, sd FROM factor_norms WHERE norm_version = ?', [$version]) as $r) {
                $norms['factors'][$r['factor_code']] = ['mean' => (float) $r['mean'], 'sd' => (float) $r['sd']];
            }
            foreach (Database::all('SELECT factor_code, raw_score, percentile FROM factor_percentiles WHERE norm_version = ?', [$version]) as $r) {
                $norms['percentiles'][$r['factor_code']][(int) $r['raw_score']] = (float) $r['percentile'];
            }
            foreach (Database::all('SELECT domain_code, mean, sd FROM domain_norms WHERE norm_version = ?', [$version]) as $r) {
                $norms['domains'][$r['domain_code']] = ['mean' => (float) $r['mean'], 'sd' => (float) $r['sd']];
            }
            if (count($norms['factors']) !== 16 || count($norms['domains']) !== 5) {
                throw new RuntimeException("Norm set $version is incomplete");
            }
            self::$cache["norms:$version"] = $norms;
        }
        return self::$cache["norms:$version"];
    }

    public static function flush(): void
    {
        self::$cache = [];
    }
}
