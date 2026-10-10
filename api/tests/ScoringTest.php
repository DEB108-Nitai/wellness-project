<?php
declare(strict_types=1);

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

test('PHP scoring matches the Python reference on every golden case (PRD §3.5)', function () {
    useTestDatabase();
    PsychometricRepository::flush();
    $golden = json_decode((string) file_get_contents(dirname(API_ROOT) . '/docs/scoring/golden.json'), true, flags: JSON_THROW_ON_ERROR);
    assertSame(PsychometricRepository::activeNormVersion(), $golden['norm_version']);
    $ids = itemIdsByCode();
    assertTrue(count($golden['cases']) >= 10, 'expected at least 10 golden cases');

    foreach ($golden['cases'] as $case) {
        $answers = [];
        foreach ($case['answers'] as $code => $value) {
            $answers[$ids[$code]] = $value;
        }
        $result = ScoringService::score($answers, PsychometricRepository::activeItemSetVersion(), $golden['norm_version']);

        foreach ($case['expected']['factors'] as $f => $exp) {
            $got = $result['factors'][$f];
            $label = "{$case['name']} factor $f";
            assertSame($exp['raw'], $got['raw'], "$label raw");
            assertSame($exp['sten'], $got['sten'], "$label sten");
            assertSame($exp['band'], $got['band'], "$label band");
            assertEqualsWithDelta((float) $exp['percentile'], $got['percentile'], 0.0001, "$label percentile");
            assertEqualsWithDelta($exp['z'], $got['z'], 0.000001, "$label z");
        }
        foreach ($case['expected']['domains'] as $d => $exp) {
            $got = $result['domains'][$d];
            assertSame($exp['sten'], $got['sten'], "{$case['name']} domain $d sten");
            assertEqualsWithDelta($exp['composite'], $got['composite'], 0.000001, "{$case['name']} domain $d composite");
            assertEqualsWithDelta($exp['z'], $got['z'], 0.000001, "{$case['name']} domain $d z");
        }
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
