<?php
declare(strict_types=1);

namespace Transenigma\Services;

use Transenigma\Core\Database;

/** The admin home page in one request (PRD ADM-1). */
final class AdminDashboardService
{
    public static function summary(): array
    {
        $periods = ['last7' => 7, 'last30' => 30, 'allTime' => null];
        $tests = [];
        foreach ($periods as $key => $days) {
            $since = $days === null ? '' : 'AND started_at >= UTC_TIMESTAMP() - INTERVAL ' . (int) $days . ' DAY';
            $row = Database::one(
                "SELECT COUNT(*) started, SUM(status = 'completed') completed, SUM(quality_flagged = 1) flagged
                 FROM test_sessions WHERE 1 = 1 $since"
            );
            $started = (int) $row['started'];
            $completed = (int) $row['completed'];
            $tests[$key] = [
                'started' => $started,
                'completed' => $completed,
                'completionRate' => $started ? round($completed / $started * 100) : 0,
                'flagged' => (int) $row['flagged'],
            ];
        }

        $users = Database::one(
            "SELECT COUNT(*) total,
                    SUM(created_at >= UTC_TIMESTAMP() - INTERVAL 7 DAY) last7,
                    SUM(created_at >= UTC_TIMESTAMP() - INTERVAL 30 DAY) last30,
                    SUM(role = 'admin') admins
             FROM users WHERE anonymized_at IS NULL"
        );

        $registrations = [];
        foreach (Database::all('SELECT program, status, COUNT(*) n FROM challenge_registrations GROUP BY program, status') as $r) {
            $registrations[$r['program']][$r['status']] = (int) $r['n'];
        }

        $visits = VisitService::metrics(7, false);

        $audit = array_map(static fn (array $r): array => [
            'id' => (int) $r['id'],
            'action' => $r['action'],
            'actorType' => $r['actor_type'],
            'actorName' => $r['actor_name'],
            'entityType' => $r['entity_type'],
            'entityId' => $r['entity_id'],
            'createdAt' => gmdate('c', strtotime($r['created_at'] . ' UTC')),
        ], Database::all(
            'SELECT a.id, a.action, a.actor_type, a.entity_type, a.entity_id, a.created_at, u.name AS actor_name
             FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id
             ORDER BY a.id DESC LIMIT 10'
        ));

        return [
            'tests' => $tests,
            'users' => [
                'total' => (int) $users['total'],
                'last7' => (int) $users['last7'],
                'last30' => (int) $users['last30'],
                'admins' => (int) $users['admins'],
            ],
            'registrations' => $registrations,
            'messages' => ['new' => (int) Database::value("SELECT COUNT(*) FROM contact_messages WHERE status = 'new'")],
            'subscribers' => (int) Database::value("SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'subscribed'"),
            'visitors' => ['today' => $visits['today']['visitors'], 'last7' => $visits['last7']['visitors'], 'byDay' => array_map(
                static fn (array $d): array => ['day' => $d['day'], 'visitors' => $d['visitors']], $visits['byDay']
            )],
            'recentActivity' => $audit,
        ];
    }
}
