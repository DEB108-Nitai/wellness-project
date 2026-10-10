<?php
declare(strict_types=1);

namespace Transenigma\Services;

use PDOException;
use Transenigma\Core\Database;
use Transenigma\Core\HttpException;
use Transenigma\Core\RateLimiter;
use Transenigma\Core\Request;

/**
 * 60-Day Challenge registrations for STI, TTI and PTI (PRD §4.4 CH-1 … CH-8).
 */
final class ChallengeService
{
    public const PROGRAMS = ['STI', 'TTI', 'PTI'];
    public const PROGRAM_NAMES = [
        'STI' => 'Sonic Therapeutic Intervention',
        'TTI' => 'Transcendental Therapeutic Intervention',
        'PTI' => 'Philosophical Therapeutic Intervention',
    ];
    public const TIMINGS = ['morning', 'evening', 'weekend'];
    public const STATUSES = ['registered', 'confirmed', 'waitlisted', 'completed', 'cancelled'];
    /** Statuses that count as "already registered" for duplicate checks (CH-5). */
    private const ACTIVE = ['registered', 'confirmed', 'waitlisted'];
    public const STRUGGLES = [
        'Stress & Anxiety', 'Overthinking & Procrastination', 'Screen Addiction / Doomscrolling',
        'Restless Sleep / Late Nights', 'Emotional Reactivity', 'Lack of Spiritual Grounding',
        'Distractions', 'Addictions', 'Meaningless Routine', 'No Real Progress',
    ];
    private const REF_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

    /** Public registration (CH-2 … CH-5). */
    public static function register(array $data, Request $request): array
    {
        if (!SettingsService::bool('challenge_registration_open')) {
            throw HttpException::forbidden('Registrations are currently closed. Please check back soon.', 'REGISTRATION_CLOSED');
        }
        RateLimiter::hit('challenge_register', $request->ip(), 10, 3600);

        $minAge = SettingsService::int('min_age');
        if (isset($data['age']) && $data['age'] < $minAge) {
            throw HttpException::validation(['age' => "Participants must be at least $minAge years old."]);
        }
        $digits = preg_replace('/\D/', '', $data['phone']);
        if (strlen($digits) < 7 || strlen($digits) > 15) {
            throw HttpException::validation(['phone' => 'Please enter a valid phone number, including the country code.']);
        }
        $struggles = array_values(array_unique($data['struggles'] ?? []));
        foreach ($struggles as $s) {
            if (!in_array($s, self::STRUGGLES, true)) {
                throw HttpException::validation(['struggles' => 'Please choose from the listed options.']);
            }
        }

        $existing = Database::value(
            'SELECT ref_code FROM challenge_registrations WHERE email = ? AND program = ? AND status IN (' . self::placeholders(self::ACTIVE) . ') LIMIT 1',
            [$data['email'], $data['program'], ...self::ACTIVE]
        );
        if ($existing !== null) {
            throw new HttpException(409, 'ALREADY_REGISTERED', sprintf(
                'This email is already registered for %s. Check your inbox for the details we sent.', self::PROGRAM_NAMES[$data['program']]
            ));
        }

        $user = AuthService::user();
        for ($attempt = 0; ; $attempt++) {
            $ref = $data['program'] . '-60-' . self::randomCode();
            try {
                $id = Database::insert(
                    'INSERT INTO challenge_registrations (ref_code, program, user_id, name, email, phone, age, city, country,
                        cohort_timing, struggles, primary_goal, consent_at, ip_hash)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), ?)',
                    [
                        $ref, $data['program'], $user ? (int) $user['id'] : null, $data['name'], $data['email'], $data['phone'],
                        $data['age'] ?? null, $data['city'] ?? null, $data['country'] ?? null, $data['cohortTiming'],
                        json_encode($struggles, JSON_UNESCAPED_UNICODE), $data['primaryGoal'] ?? null, $request->ipHash(),
                    ]
                );
                break;
            } catch (PDOException $e) {
                if ($attempt < 5 && str_contains($e->getMessage(), 'uq_registrations_ref')) {
                    continue;
                }
                throw $e;
            }
        }

        AuditService::log('CHALLENGE_REGISTERED', $user ? 'user' : 'guest', $user ? (int) $user['id'] : null, 'challenge_registration', $ref, ['program' => $data['program']], $request);
        Mailer::send($data['email'], 'challenge-registered', [
            'name' => $data['name'],
            'program' => self::PROGRAM_NAMES[$data['program']],
            'programCode' => $data['program'],
            'ref' => $ref,
        ]);
        return self::toPublic(Database::one('SELECT * FROM challenge_registrations WHERE id = ?', [$id]));
    }

    /** The signed-in user's registrations (account page). */
    public static function forUser(array $user): array
    {
        $rows = Database::all(
            'SELECT * FROM challenge_registrations WHERE user_id = ? OR email = ? ORDER BY created_at DESC',
            [$user['id'], $user['email']]
        );
        return array_map([self::class, 'toPublic'], $rows);
    }

    // ------------------------------------------------------------------ admin

    /** Paged, filtered list for the admin console. */
    public static function search(array $filters, int $page, int $perPage): array
    {
        [$where, $params] = self::filterSql($filters);
        $total = (int) Database::value("SELECT COUNT(*) FROM challenge_registrations r $where", $params);
        $offset = ($page - 1) * $perPage;
        $rows = Database::all("SELECT r.* FROM challenge_registrations r $where ORDER BY r.created_at DESC LIMIT $perPage OFFSET $offset", $params);
        $counts = [];
        foreach (Database::all('SELECT program, status, COUNT(*) n FROM challenge_registrations GROUP BY program, status') as $c) {
            $counts[$c['program']][$c['status']] = (int) $c['n'];
        }
        return [
            'items' => array_map([self::class, 'toAdmin'], $rows),
            'page' => $page,
            'perPage' => $perPage,
            'total' => $total,
            'counts' => $counts,
        ];
    }

    public static function update(int $id, array $changes, array $admin, Request $request): array
    {
        $row = Database::one('SELECT * FROM challenge_registrations WHERE id = ?', [$id]) ?? throw HttpException::notFound('Registration not found.');
        $sets = [];
        $params = [];
        if (isset($changes['status'])) {
            $sets[] = 'status = ?';
            $params[] = $changes['status'];
        }
        if (array_key_exists('adminNotes', $changes)) {
            $sets[] = 'admin_notes = ?';
            $params[] = $changes['adminNotes'];
        }
        if ($sets) {
            Database::run('UPDATE challenge_registrations SET ' . implode(', ', $sets) . ' WHERE id = ?', [...$params, $id]);
            AuditService::forUser($admin, 'CHALLENGE_UPDATED', 'challenge_registration', $row['ref_code'], array_intersect_key($changes, ['status' => 1]) + ['notesChanged' => array_key_exists('adminNotes', $changes)], $request);
        }
        return self::toAdmin(Database::one('SELECT * FROM challenge_registrations WHERE id = ?', [$id]));
    }

    /** Streams a CSV of the filtered registrations (formula-injection safe). */
    public static function exportCsv(array $filters): void
    {
        [$where, $params] = self::filterSql($filters);
        $out = fopen('php://output', 'w');
        fwrite($out, "\xEF\xBB\xBF"); // UTF-8 BOM so Excel shows non-English names correctly
        fputcsv($out, ['Reference', 'Program', 'Status', 'Name', 'Email', 'Phone', 'Age', 'City', 'Country', 'Timing', 'Struggles', 'Goal', 'Admin notes', 'Registered (UTC)']);
        $stmt = Database::run("SELECT r.* FROM challenge_registrations r $where ORDER BY r.created_at DESC", $params);
        while ($r = $stmt->fetch()) {
            fputcsv($out, array_map([self::class, 'csvSafe'], [
                $r['ref_code'], $r['program'], $r['status'], $r['name'], $r['email'], $r['phone'], $r['age'], $r['city'], $r['country'],
                $r['cohort_timing'], implode('; ', json_decode($r['struggles'], true) ?: []), $r['primary_goal'], $r['admin_notes'], $r['created_at'],
            ]));
        }
        fclose($out);
    }

    // ------------------------------------------------------------------ helpers

    /** @return array{0:string,1:array} */
    private static function filterSql(array $f): array
    {
        $where = [];
        $params = [];
        if (!empty($f['program'])) {
            $where[] = 'r.program = ?';
            $params[] = $f['program'];
        }
        if (!empty($f['status'])) {
            $where[] = 'r.status = ?';
            $params[] = $f['status'];
        }
        if (!empty($f['q'])) {
            $where[] = '(r.name LIKE ? OR r.email LIKE ? OR r.ref_code LIKE ? OR r.city LIKE ? OR r.phone LIKE ?)';
            $like = '%' . addcslashes($f['q'], '%_\\') . '%';
            array_push($params, $like, $like, $like, $like, $like);
        }
        return [$where ? 'WHERE ' . implode(' AND ', $where) : '', $params];
    }

    public static function csvSafe(mixed $value): string
    {
        $s = (string) ($value ?? '');
        return preg_match('/^[=+\-@\t\r]/', $s) ? "'" . $s : $s;
    }

    private static function toPublic(array $r): array
    {
        return [
            'ref' => $r['ref_code'],
            'program' => $r['program'],
            'programName' => self::PROGRAM_NAMES[$r['program']],
            'status' => $r['status'],
            'cohortTiming' => $r['cohort_timing'],
            'createdAt' => gmdate('c', strtotime($r['created_at'] . ' UTC')),
        ];
    }

    private static function toAdmin(array $r): array
    {
        return self::toPublic($r) + [
            'id' => (int) $r['id'],
            'name' => $r['name'],
            'email' => $r['email'],
            'phone' => $r['phone'],
            'age' => $r['age'] === null ? null : (int) $r['age'],
            'city' => $r['city'],
            'country' => $r['country'],
            'struggles' => json_decode($r['struggles'], true) ?: [],
            'primaryGoal' => $r['primary_goal'],
            'adminNotes' => $r['admin_notes'],
            'userId' => $r['user_id'] === null ? null : (int) $r['user_id'],
        ];
    }

    private static function placeholders(array $values): string
    {
        return implode(',', array_fill(0, count($values), '?'));
    }

    private static function randomCode(): string
    {
        $code = '';
        for ($i = 0; $i < 6; $i++) {
            $code .= self::REF_ALPHABET[random_int(0, strlen(self::REF_ALPHABET) - 1)];
        }
        return $code;
    }
}
