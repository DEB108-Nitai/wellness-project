<?php
declare(strict_types=1);

use Transenigma\Core\Database;
use Transenigma\Repositories\PsychometricRepository;
use Transenigma\Services\QualityService;
use Transenigma\Services\ScoringService;

/** item_code => item id for the active item set */
function itemIdsByCode(): array
{
    $map = [];
    foreach (PsychometricRepository::items(PsychometricRepository::activeItemSetVersion()) as $id => $item) {
        $map[$item['item_code']] = $id;
    }
    return $map;
}

/** Score every case of a golden file (written by docs/scoring/reference_scoring.py) and compare with PHP. */
function assertGoldenFile(string $file): string
{
    $golden = json_decode((string) file_get_contents(dirname(API_ROOT) . "/docs/scoring/$file"), true, flags: JSON_THROW_ON_ERROR);
    $ids = itemIdsByCode();
    assertTrue(count($golden['cases']) >= 10, "expected at least 10 golden cases in $file");

    foreach ($golden['cases'] as $case) {
        $answers = [];
        foreach ($case['answers'] as $code => $value) {
            $answers[$ids[$code]] = $value;
        }
        $result = ScoringService::score($answers, PsychometricRepository::activeItemSetVersion(), $golden['norm_version']);

        foreach ($case['expected']['factors'] as $f => $exp) {
            $got = $result['factors'][$f];
            $label = "$file {$case['name']} factor $f";
            assertSame($exp['raw'], $got['raw'], "$label raw");
            assertSame($exp['sten'], $got['sten'], "$label sten");
            assertSame($exp['band'], $got['band'], "$label band");
            assertEqualsWithDelta((float) $exp['percentile'], $got['percentile'], 0.0001, "$label percentile");
            assertEqualsWithDelta($exp['z'], $got['z'], 0.000001, "$label z");
        }
        foreach ($case['expected']['domains'] as $d => $exp) {
            $got = $result['domains'][$d];
            assertSame($exp['sten'], $got['sten'], "$file {$case['name']} domain $d sten");
            assertEqualsWithDelta($exp['composite'], $got['composite'], 0.000001, "$file {$case['name']} domain $d composite");
            assertEqualsWithDelta($exp['z'], $got['z'], 0.000001, "$file {$case['name']} domain $d z");
        }
    }
    return $golden['norm_version'];
}

test('PHP scoring matches the Python reference on every golden case, for both norm sets (PRD §3.5)', function () {
    useTestDatabase();
    PsychometricRepository::flush();
    // v2 (stens read from the real distribution) is the active set; v1 (2z + 5.5) still scores old sessions the same.
    assertSame(PsychometricRepository::activeNormVersion(), assertGoldenFile('golden_v2.json'));
    assertSame('ipip16-op2019-v1', assertGoldenFile('golden.json'));
});

test('the v2 sten table covers every possible raw score, never goes down, and agrees with the percentile', function () {
    useTestDatabase();
    PsychometricRepository::flush();
    $version = PsychometricRepository::activeNormVersion();
    $norms = PsychometricRepository::norms($version);
    assertSame('table', $norms['method']);
    // New tests use v2; v1 stays (inactive) so finished tests keep the version they were scored with.
    assertSame('ipip16-op2019-v2', $version);
    assertSame('1', (string) Database::value('SELECT COUNT(*) FROM norm_sets WHERE is_active = 1'));
    assertSame('formula', PsychometricRepository::norms('ipip16-op2019-v1')['method']);
    $items = array_count_values(array_filter(array_column(PsychometricRepository::items(PsychometricRepository::activeItemSetVersion()), 'factor_code')));
    // Standard sten band edges as percentages of a normal population: Phi(-2) ... Phi(2).
    $cuts = [2.275, 6.681, 15.866, 30.854, 50.0, 69.146, 84.134, 93.319, 97.725];
    foreach ($items as $f => $k) {
        $previous = 1;
        for ($raw = $k; $raw <= 5 * $k; $raw++) {
            $sten = $norms['stens'][$f][$raw] ?? null;
            assertTrue(is_int($sten), "$f raw $raw has a sten");
            assertTrue($sten >= $previous && $sten <= 10, "$f raw $raw: sten $sten does not go down");
            $previous = $sten;
            // The stored percentile is rounded to 0.1, so allow that much at the band edges.
            $pct = $norms['percentiles'][$f][$raw];
            $low = $sten === 1 ? 0.0 : $cuts[$sten - 2];
            $high = $sten === 10 ? 100.0 : $cuts[$sten - 1];
            assertTrue($pct >= $low - 0.05 && $pct <= $high + 0.05, "$f raw $raw: percentile $pct fits sten $sten");
        }
        assertSame(4 * $k + 1, count($norms['stens'][$f]), "$f has exactly one sten per possible raw score");
    }
});

test('a table norm set with a missing raw score stops scoring instead of guessing', function () {
    useTestDatabase();
    PsychometricRepository::flush();
    $version = PsychometricRepository::activeNormVersion();
    $items = PsychometricRepository::items(PsychometricRepository::activeItemSetVersion());
    $answers = array_fill_keys(array_keys($items), 3); // every factor lands on its middle raw score
    $warmthMiddle = 30; // 10 Warmth items x 3
    Database::run('DELETE FROM factor_stens WHERE norm_version = ? AND factor_code = ? AND raw_score = ?', [$version, 'A', $warmthMiddle]);
    PsychometricRepository::flush();
    try {
        assertThrows(RuntimeException::class, fn () => ScoringService::score($answers, PsychometricRepository::activeItemSetVersion(), $version));
    } finally {
        Database::run('INSERT INTO factor_stens (norm_version, factor_code, raw_score, sten) VALUES (?, ?, ?, ?)', [$version, 'A', $warmthMiddle, 3]);
        PsychometricRepository::flush();
    }
});

test('scoring refuses incomplete or out-of-range answers', function () {
    useTestDatabase();
    $version = PsychometricRepository::activeItemSetVersion();
    $answers = array_fill_keys(array_keys(PsychometricRepository::items($version)), 3);
    array_pop($answers);
    assertThrows(RuntimeException::class, fn () => ScoringService::score($answers, $version, PsychometricRepository::activeNormVersion()));

    $answers = array_fill_keys(array_keys(PsychometricRepository::items($version)), 3);
    $answers[array_key_first($answers)] = 6;
    assertThrows(RuntimeException::class, fn () => ScoringService::score($answers, $version, PsychometricRepository::activeNormVersion()));
});

test('sten rounding and bands follow the PRD', function () {
    assertSame(6, ScoringService::sten(0.0));     // 5.5 rounds half away from zero
    assertSame(1, ScoringService::sten(-9.0));
    assertSame(10, ScoringService::sten(9.0));
    assertSame(8, ScoringService::sten(1.0));     // 7.5 -> 8
    assertSame('low', ScoringService::band(3));
    assertSame('average', ScoringService::band(4));
    assertSame('average', ScoringService::band(7));
    assertSame('high', ScoringService::band(8));
});

test('quality flags: attention checks, straight-lining and speed', function () {
    useTestDatabase();
    $items = PsychometricRepository::items(PsychometricRepository::activeItemSetVersion());
    $honest = [];
    $i = 0;
    foreach ($items as $id => $item) {
        $honest[$id] = $item['is_attention_check'] ? $item['expected_answer'] : ($i++ % 5) + 1;
    }
    $ok = QualityService::evaluate($honest, $items, 20 * 60, 6);
    assertSame(false, $ok['flagged']);
    assertSame(0, $ok['attentionChecksFailed']);

    $allFour = array_fill_keys(array_keys($items), 4); // passes ATT1 only
    $bad = QualityService::evaluate($allFour, $items, 3 * 60, 6);
    assertSame(true, $bad['flagged']);
    assertSame(2, $bad['attentionChecksFailed']);
    assertSame(1.0, $bad['straightLineRatio']);
    assertSame(true, $bad['tooFast']);
    assertSame(3, count($bad['notes']));
});
