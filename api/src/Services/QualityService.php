<?php
declare(strict_types=1);

namespace Transenigma\Services;

/**
 * Response-quality flags (PRD §3.4). A flagged session is still scored.
 */
final class QualityService
{
    public const MAX_ATTENTION_FAILURES = 2;   // flag when >= this many checks are failed
    public const STRAIGHT_LINE_RATIO = 0.85;   // flag when >= 85 % of scored items share one answer

    /**
     * @param array<int,int> $answers   item id => value
     * @param array<int,array> $items   item id => item row (PsychometricRepository::items)
     * @return array{flagged:bool, attentionChecksFailed:int, straightLineRatio:float, activeSeconds:int, tooFast:bool, notes:list<string>}
     */
    public static function evaluate(array $answers, array $items, int $activeSeconds, int $tooFastMinutes): array
    {
        $failed = 0;
        $counts = [];
        $scored = 0;
        foreach ($items as $id => $item) {
            if (!isset($answers[$id])) {
                continue;
            }
            if ($item['is_attention_check']) {
                if ($answers[$id] !== $item['expected_answer']) {
                    $failed++;
                }
                continue;
            }
            $counts[$answers[$id]] = ($counts[$answers[$id]] ?? 0) + 1;
            $scored++;
        }
        $ratio = $scored > 0 ? max($counts) / $scored : 0.0;
        $tooFast = $activeSeconds < $tooFastMinutes * 60;

        $notes = [];
        if ($failed >= self::MAX_ATTENTION_FAILURES) {
            $notes[] = "Some attention-check statements were not answered as instructed ($failed of 3).";
        }
        if ($ratio >= self::STRAIGHT_LINE_RATIO) {
            $notes[] = 'Most statements were given the same answer.';
        }
        if ($tooFast) {
            $notes[] = sprintf('The questionnaire was completed in about %d minute(s), faster than the recommended minimum of %d.', max(1, intdiv($activeSeconds, 60)), $tooFastMinutes);
        }

        return [
            'flagged' => $notes !== [],
            'attentionChecksFailed' => $failed,
            'straightLineRatio' => round($ratio, 3),
            'activeSeconds' => $activeSeconds,
            'tooFast' => $tooFast,
            'notes' => $notes,
        ];
    }
}
