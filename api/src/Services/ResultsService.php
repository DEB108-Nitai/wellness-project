<?php
declare(strict_types=1);

namespace Wellness\Services;

use Wellness\Core\Database;
use Wellness\Core\HttpException;
use Wellness\Repositories\PsychometricRepository;

/**
 * Results reports, history and share links (PRD §4.3 RES-1 … RES-5).
 */
final class ResultsService
{
    /** RES-1: only the owner (signed in) or an admin may view; guests must sign up first (TEST-9). */
    public static function forViewer(string $ref, ?array $user): array
    {
        if ($user === null) {
            throw new HttpException(401, 'RESULTS_LOCKED', 'Create a free account or sign in to see your results.');
        }
        $session = AssessmentService::byRef($ref);
        $isOwner = $session !== null && (int) $session['user_id'] === (int) $user['id'];
        if ($session === null || (!$isOwner && $user['role'] !== 'admin')) {
            throw HttpException::notFound('We could not find that report.'); // never reveal that another person's report exists
        }
        if ($session['status'] !== 'completed') {
            throw HttpException::conflict('This assessment has not been completed yet.', 'NOT_COMPLETED');
        }
        return self::report($session, true) + ['isOwner' => $isOwner];
    }

    /** RES-4: public read-only view through a share link. */
    public static function shared(string $token): array
    {
        if (!preg_match('/^[A-Za-z0-9]{32}$/', $token)) {
            throw HttpException::notFound('This shared link is not valid.');
        }
        $session = Database::one("SELECT * FROM test_sessions WHERE share_token = ? AND status = 'completed'", [$token]);
        if ($session === null) {
            throw HttpException::notFound('This shared link is no longer active.');
        }
        return self::report($session, false) + ['isOwner' => false];
    }

    /** RES-3: the user's history (in-progress and completed). */
    public static function history(int $userId): array
    {
        $rows = Database::all(
            "SELECT s.public_ref, s.status, s.started_at, s.completed_at, s.nickname, s.quality_flagged,
                    (SELECT COUNT(*) FROM session_answers a WHERE a.session_id = s.id) AS answered,
                    (SELECT COUNT(*) FROM items i WHERE i.item_set_version = s.item_set_version) AS total
             FROM test_sessions s
             WHERE s.user_id = ? AND s.status IN ('in_progress', 'completed')
             ORDER BY s.started_at DESC
             LIMIT 100",
            [$userId]
        );
        $top = self::topTraits(array_column(array_filter($rows, fn ($r) => $r['status'] === 'completed'), 'public_ref'));

        return array_map(static fn (array $r): array => [
            'ref' => $r['public_ref'],
            'status' => $r['status'],
            'startedAt' => self::iso($r['started_at']),
            'completedAt' => self::iso($r['completed_at']),
            'nickname' => $r['nickname'],
            'answeredCount' => (int) $r['answered'],
            'totalItems' => (int) $r['total'],
            'flagged' => (bool) $r['quality_flagged'],
            'topTraits' => $top[$r['public_ref']] ?? [],
        ], $rows);
    }

    /** RES-4: turn the share link on (idempotent) and return its token. */
    public static function enableShare(array $session): string
    {
        if ($session['status'] !== 'completed') {
            throw HttpException::conflict('Only completed reports can be shared.', 'NOT_COMPLETED');
        }
        if ($session['share_token']) {
            return $session['share_token'];
        }
        $token = bin2hex(random_bytes(16));
        Database::run('UPDATE test_sessions SET share_token = ? WHERE id = ?', [$token, $session['id']]);
        return $token;
    }

    public static function disableShare(array $session): void
    {
        Database::run('UPDATE test_sessions SET share_token = NULL WHERE id = ?', [$session['id']]);
    }

    // ------------------------------------------------------------------ report payload

    public static function report(array $session, bool $private): array
    {
        $factorMeta = PsychometricRepository::factors();
        $factors = [];
        foreach (Database::all('SELECT * FROM session_factor_scores WHERE session_id = ?', [$session['id']]) as $row) {
            $meta = $factorMeta[$row['factor_code']];
            $band = $row['band'];
            $factors[(int) $meta['sort_order']] = [
                'factorCode' => $row['factor_code'],
                'factorName' => $meta['name'],
                'lowLabel' => $meta['low_label'],
                'highLabel' => $meta['high_label'],
                'category' => $meta['category'],
                'shortDesc' => $meta['short_desc'],
                'rawScore' => (int) $row['raw_score'],
                'zScore' => (float) $row['z_score'],
                'sten' => (int) $row['sten'],
                'percentile' => (float) $row['percentile'],
                'band' => $band,
                'interpretation' => $meta[$band === 'low' ? 'low_desc' : ($band === 'high' ? 'high_desc' : 'average_desc')],
                'workplaceImpact' => $meta['workplace_impact'],
            ];
        }
        ksort($factors);

        $domainMeta = PsychometricRepository::domains();
        $domains = [];
        foreach (Database::all('SELECT * FROM session_domain_scores WHERE session_id = ?', [$session['id']]) as $row) {
            $meta = $domainMeta[$row['domain_code']];
            $domains[(int) $meta['sort_order']] = [
                'code' => $row['domain_code'],
                'name' => $meta['name'],
                'description' => $meta['description'],
                'sten' => (int) $row['sten'],
                'band' => $row['band'],
                'constituentFactors' => array_keys($meta['weights']),
                'weights' => $meta['weights'],
            ];
        }
        ksort($domains);

        $quality = json_decode((string) $session['quality_details'], true) ?: ['flagged' => false, 'notes' => []];
        $report = [
            'ref' => $session['public_ref'],
            'nickname' => $session['nickname'],
            'completedAt' => self::iso($session['completed_at']),
            'normVersion' => $session['norm_version'],
            'quality' => ['flagged' => (bool) $quality['flagged'], 'notes' => $quality['notes'] ?? []],
            'factors' => array_values($factors),
            'domains' => array_values($domains),
        ];
        if ($private) {
            $report['country'] = $session['country'];
            $report['age'] = (int) $session['age'];
            $report['shareToken'] = $session['share_token'];
        }
        return $report;
    }

    /** @param list<string> $refs @return array<string, list<array{code:string,name:string,sten:int}>> */
    private static function topTraits(array $refs): array
    {
        if ($refs === []) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($refs), '?'));
        $rows = Database::all(
            "SELECT s.public_ref, f.factor_code, f.sten
             FROM session_factor_scores f JOIN test_sessions s ON s.id = f.session_id
             WHERE s.public_ref IN ($placeholders) AND (f.sten >= 8 OR f.sten <= 3)
             ORDER BY ABS(f.sten - 5.5) DESC",
            $refs
        );
        $meta = PsychometricRepository::factors();
        $out = [];
        foreach ($rows as $r) {
            if (count($out[$r['public_ref']] ?? []) < 3) {
                $out[$r['public_ref']][] = ['code' => $r['factor_code'], 'name' => $meta[$r['factor_code']]['name'], 'sten' => (int) $r['sten']];
            }
        }
        return $out;
    }

    private static function iso(?string $datetime): ?string
    {
        return $datetime === null ? null : gmdate('c', strtotime($datetime . ' UTC'));
    }
}
