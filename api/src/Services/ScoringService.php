<?php
declare(strict_types=1);

namespace Transenigma\Services;

use RuntimeException;
use Transenigma\Repositories\PsychometricRepository;

/**
 * 16PF scoring (PRD §3.3). Runs only on the server; the browser never computes scores.
 *
 *  raw_f   = Σ item scores (positively keyed: answer, negatively keyed: 6 − answer)
 *  z_f     = (raw_f − mean_f) / sd_f
 *  sten_f  = clamp(round(2·z_f + 5.5), 1, 10)          round = half away from zero
 *  pct_f   = empirical percentile for raw_f
 *  G       = Σ w·z_f over the domain's factors (w = ±1)
 *  sten_G  = clamp(round(2·(G − mean_G)/sd_G + 5.5), 1, 10)
 *
 * Verified against docs/scoring/reference_scoring.py (golden tests).
 */
final class ScoringService
{
    /**
     * @param array<int,int> $answers item id => 1..5 (attention checks may be included; they are ignored)
     * @return array{factors: array<string, array{raw:int, z:float, sten:int, percentile:float, band:string}>,
     *               domains: array<string, array{composite:float, z:float, sten:int, band:string}>}
     */
    public static function score(array $answers, string $itemSetVersion, string $normVersion): array
    {
        $items = PsychometricRepository::items($itemSetVersion);
        $norms = PsychometricRepository::norms($normVersion);

        $raw = [];
        foreach ($items as $id => $item) {
            if ($item['is_attention_check']) {
                continue;
            }
            $value = $answers[$id] ?? throw new RuntimeException("Missing answer for item {$item['item_code']}");
            if ($value < 1 || $value > 5) {
                throw new RuntimeException("Answer out of range for item {$item['item_code']}");
            }
            $raw[$item['factor_code']] = ($raw[$item['factor_code']] ?? 0) + ($item['keyed'] === '+' ? $value : 6 - $value);
        }

        $factors = [];
        $z = [];
        foreach ($norms['factors'] as $code => $norm) {
            if (!isset($raw[$code])) {
                throw new RuntimeException("No items for factor $code");
            }
            $z[$code] = ($raw[$code] - $norm['mean']) / $norm['sd'];
            $sten = self::sten($z[$code]);
            $factors[$code] = [
                'raw' => $raw[$code],
                'z' => $z[$code],
                'sten' => $sten,
                'percentile' => $norms['percentiles'][$code][$raw[$code]] ?? throw new RuntimeException("No percentile for $code raw {$raw[$code]}"),
                'band' => self::band($sten),
            ];
        }

        $domains = [];
        foreach (PsychometricRepository::domains() as $code => $domain) {
            $composite = 0.0;
            foreach ($domain['weights'] as $factor => $weight) {
                $composite += $weight * $z[$factor];
            }
            $norm = $norms['domains'][$code];
            $zg = ($composite - $norm['mean']) / $norm['sd'];
            $sten = self::sten($zg);
            $domains[$code] = ['composite' => $composite, 'z' => $zg, 'sten' => $sten, 'band' => self::band($sten)];
        }

        return ['factors' => $factors, 'domains' => $domains];
    }

    public static function sten(float $z): int
    {
        return max(1, min(10, (int) round(2 * $z + 5.5, 0, PHP_ROUND_HALF_UP)));
    }

    public static function band(int $sten): string
    {
        return $sten <= 3 ? 'low' : ($sten >= 8 ? 'high' : 'average');
    }
}
