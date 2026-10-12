<?php
declare(strict_types=1);

namespace Transenigma\Services;

use Transenigma\Core\Database;
use Transenigma\Core\HttpException;
use Transenigma\Repositories\PsychometricRepository;

/**
 * Admin view of assessments and their results against people's names (PRD ADM-2, ADM-3; owner ask).
 * A session belongs to an account (name + email) or to a guest (shown with their nickname only).
 */
final class AdminParticipantsService
{
    public const STATUSES = ['in_progress', 'completed', 'abandoned', 'expired'];

    /** Paged search with the filter totals and completions per day for the chart. */
    public static function search(array $f, int $page, int $perPage): array
    {
        [$where, $params] = self::filterSql($f);
        $base = "FROM test_sessions s LEFT JOIN users u ON u.id = s.user_id $where";
        $total = (int) Database::value("SELECT COUNT(*) $base", $params);
        $offset = ($page - 1) * $perPage;
        $rows = Database::all(
            "SELECT s.*, u.name AS user_name, u.email AS user_email, u.anonymized_at,
                    (SELECT COUNT(*) FROM session_answers a WHERE a.session_id = s.id) AS answered,
                    (SELECT COUNT(*) FROM items i WHERE i.item_set_version = s.item_set_version) AS total_items
             $base ORDER BY s.started_at DESC, s.id DESC LIMIT $perPage OFFSET $offset",
            $params
        );
        $top = ResultsService::topTraits(array_column(array_filter($rows, static fn ($r) => $r['status'] === 'completed'), 'public_ref'));

        $byStatus = array_fill_keys(self::STATUSES, 0);
        foreach (Database::all("SELECT s.status, COUNT(*) n $base GROUP BY s.status", $params) as $r) {
            $byStatus[$r['status']] = (int) $r['n'];
        }
        $flagged = (int) Database::value("SELECT COUNT(*) $base" . ($where ? ' AND' : ' WHERE') . ' s.quality_flagged = 1', $params);

        // Completions per day over the chosen dates, or the last 30 days.
        $to = $f['to'] ?? gmdate('Y-m-d');
        $from = $f['from'] ?? gmdate('Y-m-d', strtotime("$to -29 days"));
        $days = [];
        for ($d = strtotime("$from 00:00:00 UTC"), $end = strtotime("$to 00:00:00 UTC"); $d <= $end && count($days) < 400; $d += 86400) {
            $days[gmdate('Y-m-d', $d)] = ['started' => 0, 'completed' => 0];
        }
        foreach (Database::all("SELECT DATE(s.started_at) d, COUNT(*) n $base GROUP BY d", $params) as $r) {
            if (isset($days[$r['d']])) {
                $days[$r['d']]['started'] = (int) $r['n'];
            }
        }
        // Both counts by start date, like the filter: "started that day" and "of those, completed".
        foreach (Database::all("SELECT DATE(s.started_at) d, COUNT(*) n $base" . ($where ? ' AND' : ' WHERE') . " s.status = 'completed' GROUP BY d", $params) as $r) {
            if (isset($days[$r['d']])) {
                $days[$r['d']]['completed'] = (int) $r['n'];
            }
        }

        return [
            'items' => array_map(static fn (array $r): array => self::listItem($r, $top[$r['public_ref']] ?? []), $rows),
            'page' => $page,
            'perPage' => $perPage,
            'total' => $total,
            'byStatus' => $byStatus,
            'flagged' => $flagged,
            'from' => $from,
            'to' => $to,
            'byDay' => array_map(static fn ($day, $c): array => ['day' => $day] + $c, array_keys($days), array_values($days)),
        ];
    }

    /** Everything about one assessment: person, demographics, timing, quality, scores and every answer. */
    public static function detail(string $ref): array
    {
        $s = Database::one(
            'SELECT s.*, u.name AS user_name, u.email AS user_email, u.anonymized_at,
                    (SELECT COUNT(*) FROM session_answers a WHERE a.session_id = s.id) AS answered,
                    (SELECT COUNT(*) FROM items i WHERE i.item_set_version = s.item_set_version) AS total_items
             FROM test_sessions s LEFT JOIN users u ON u.id = s.user_id WHERE s.public_ref = ?',
            [$ref]
        ) ?? throw HttpException::notFound('Assessment not found.');

        $answers = [];
        foreach (Database::all('SELECT item_id, value FROM session_answers WHERE session_id = ?', [$s['id']]) as $a) {
            $answers[(int) $a['item_id']] = (int) $a['value'];
        }
        $items = [];
        foreach (PsychometricRepository::items($s['item_set_version']) as $item) {
            $value = $answers[$item['id']] ?? null;
            $items[] = [
                'position' => $item['position'],
                'code' => $item['item_code'],
                'factor' => $item['factor_code'],
                'keyed' => $item['keyed'],
                'text' => $item['text'],
                'attentionCheck' => $item['is_attention_check'],
                'expected' => $item['expected_answer'],
                'answer' => $value,
                'attentionFailed' => $item['is_attention_check'] && $value !== null && $value !== $item['expected_answer'],
            ];
        }

        $out = self::listItem($s, []) + [
            'demographics' => [
                'country' => $s['country'],
                'age' => $s['age'] === null ? null : (int) $s['age'],
                'gender' => $s['gender'],
                'genderText' => $s['gender_text'],
                'education' => $s['education'],
                'occupation' => $s['occupation'],
            ],
            'consentAt' => self::iso($s['consent_at']),
            'lastActivityAt' => self::iso($s['last_activity_at']),
            'itemSetVersion' => $s['item_set_version'],
            'normVersion' => $s['norm_version'],
            'quality' => json_decode((string) $s['quality_details'], true) ?: null,
            'items' => $items,
            'report' => $s['status'] === 'completed' ? self::adminReport($s) : null,
        ];
        return $out;
    }

    /**
     * Streamed CSV for research (ADM-3): one row per assessment with demographics, quality and the 16 factor
     * + 5 domain stens; optionally every item answer. RFC 4180 quoting and formula neutralising.
     */
    public static function exportCsv(array $f, bool $withAnswers): void
    {
        [$where, $params] = self::filterSql($f);
        $factors = array_keys(PsychometricRepository::factors());
        $domains = array_keys(PsychometricRepository::domains());
        // Answer columns follow the active item set and are matched by item code, so a session taken on an
        // older set still fills the columns its items share (its version is in the "Item set" column).
        $items = $withAnswers ? PsychometricRepository::items(PsychometricRepository::activeItemSetVersion()) : [];
        @set_time_limit(300); // large exports on shared hosting

        $out = fopen('php://output', 'w');
        fwrite($out, "\xEF\xBB\xBF");
        $head = ['Reference', 'Status', 'Name', 'Email', 'Nickname', 'Country', 'Age', 'Gender', 'Education', 'Occupation',
            'Started (UTC)', 'Completed (UTC)', 'Active minutes', 'Quality flagged', 'Item set', 'Norm version'];
        foreach ($factors as $c) {
            $head[] = "Sten $c";
        }
        foreach ($domains as $c) {
            $head[] = "Domain $c";
        }
        foreach ($items as $item) {
            $head[] = 'Item ' . $item['item_code'];
        }
        fputcsv($out, $head, ',', '"', '');

        $stmt = Database::run(
            "SELECT s.*, u.name AS user_name, u.email AS user_email, u.anonymized_at
             FROM test_sessions s LEFT JOIN users u ON u.id = s.user_id $where ORDER BY s.started_at",
            $params
        );
        while ($s = $stmt->fetch()) {
            $stens = array_column(Database::all('SELECT factor_code, sten FROM session_factor_scores WHERE session_id = ?', [$s['id']]), 'sten', 'factor_code');
            $dstens = array_column(Database::all('SELECT domain_code, sten FROM session_domain_scores WHERE session_id = ?', [$s['id']]), 'sten', 'domain_code');
            $person = self::person($s);
            $row = [
                $s['public_ref'], $s['status'], $person['name'] ?? '', $person['email'] ?? '', $s['nickname'], $s['country'], $s['age'],
                $s['gender'] === 'self_describe' ? (string) $s['gender_text'] : $s['gender'], $s['education'], $s['occupation'],
                $s['started_at'], $s['completed_at'], round((int) $s['active_seconds'] / 60, 1), $s['quality_flagged'] === null ? '' : ($s['quality_flagged'] ? 'yes' : 'no'),
                $s['item_set_version'], $s['norm_version'],
            ];
            foreach ($factors as $c) {
                $row[] = $stens[$c] ?? '';
            }
            foreach ($domains as $c) {
                $row[] = $dstens[$c] ?? '';
            }
            if ($withAnswers) {
                $byCode = array_column(Database::all(
                    'SELECT i.item_code, a.value FROM session_answers a JOIN items i ON i.id = a.item_id WHERE a.session_id = ?',
                    [$s['id']]
                ), 'value', 'item_code');
                foreach ($items as $item) {
                    $row[] = $byCode[$item['item_code']] ?? '';
                }
            }
            fputcsv($out, array_map([ChallengeService::class, 'csvSafe'], $row), ',', '"', '');
        }
        fclose($out);
    }

    // ------------------------------------------------------------------ helpers

    /** The private report minus the owner's share token (a secret link that only its owner hands out). */
    private static function adminReport(array $session): array
    {
        $report = ResultsService::report($session, true);
        unset($report['shareToken']);
        return $report;
    }

    /** @return array{0:string,1:array} */
    private static function filterSql(array $f): array
    {
        $where = [];
        $params = [];
        if (!empty($f['status'])) {
            $where[] = 's.status = ?';
            $params[] = $f['status'];
        }
        if (isset($f['flagged'])) {
            $where[] = $f['flagged'] ? 's.quality_flagged = 1' : '(s.quality_flagged = 0 OR s.quality_flagged IS NULL)';
        }
        if (!empty($f['country'])) {
            $where[] = 's.country = ?';
            $params[] = $f['country'];
        }
        if (!empty($f['account'])) {
            $where[] = $f['account'] === 'guest' ? 's.user_id IS NULL' : 's.user_id IS NOT NULL';
        }
        // Dates are whole days, inclusive, on the start date.
        if (!empty($f['from'])) {
            $where[] = 's.started_at >= ?';
            $params[] = $f['from'] . ' 00:00:00';
        }
        if (!empty($f['to'])) {
            $where[] = 's.started_at < ? + INTERVAL 1 DAY';
            $params[] = $f['to'] . ' 00:00:00';
        }
        if (!empty($f['q'])) {
            $like = '%' . addcslashes($f['q'], '%_\\') . '%';
            $where[] = '(s.public_ref LIKE ? OR s.nickname LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
            array_push($params, $like, $like, $like, $like);
        }
        return [$where ? 'WHERE ' . implode(' AND ', $where) : '', $params];
    }

    private static function listItem(array $s, array $topTraits): array
    {
        return [
            'ref' => $s['public_ref'],
            'status' => $s['status'],
            'person' => self::person($s),
            'nickname' => $s['nickname'],
            'country' => $s['country'],
            'age' => $s['age'] === null ? null : (int) $s['age'],
            'startedAt' => self::iso($s['started_at']),
            'completedAt' => self::iso($s['completed_at']),
            'activeMinutes' => round((int) $s['active_seconds'] / 60, 1),
            'answeredCount' => (int) ($s['answered'] ?? 0),
            'totalItems' => (int) ($s['total_items'] ?? 0),
            'flagged' => $s['quality_flagged'] === null ? null : (bool) $s['quality_flagged'],
            'topTraits' => $topTraits,
        ];
    }

    /** The account behind a session, or null for a guest. Anonymised accounts show no personal details. */
    private static function person(array $s): ?array
    {
        if ($s['user_id'] === null) {
            return null;
        }
        $anonymised = $s['anonymized_at'] !== null;
        return [
            'userId' => (int) $s['user_id'],
            'name' => $anonymised ? 'Anonymised account' : $s['user_name'],
            'email' => $anonymised ? null : $s['user_email'],
            'anonymised' => $anonymised,
        ];
    }

    private static function iso(?string $datetime): ?string
    {
        return $datetime === null ? null : gmdate('c', strtotime($datetime . ' UTC'));
    }
}
