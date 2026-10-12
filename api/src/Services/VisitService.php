<?php
declare(strict_types=1);

namespace Transenigma\Services;

use Transenigma\Core\Config;
use Transenigma\Core\Database;
use Transenigma\Core\Request;

/**
 * Private, first-party visit counter (owner decision 2026-10-12: no cookies, no Google).
 *
 * A visitor is an HMAC of (IP, user agent) with a random salt that exists only for that UTC day: it counts
 * one person once per day, and once the salt is deleted (cron) the value can't be traced or linked to any
 * other day. No IP, user agent, cookie or account id is ever stored.
 */
final class VisitService
{
    public const RAW_DAYS = 90;
    /** Pages that are counted; anything else (typos, 404s, odd casing tricks) is counted as /other. */
    private const PAGES = [
        '/', '/test', '/my-results', '/factors', '/how-it-works', '/benefits', '/faq', '/research', '/consultancy',
        '/team', '/contact', '/privacy', '/terms', '/account', '/login', '/signup', '/forgot-password',
        '/reset-password', '/verify-email', '/unsubscribe', '/privacy-terms',
    ];
    private const BOT = '/bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|httpclient|java\//i';

    /** Record one page view. Returns false when it is not counted (admin page, bot, invalid path). */
    public static function record(string $path, ?string $referrer, bool $signedIn, Request $request): bool
    {
        $ua = $request->userAgent();
        if ($ua === '' || preg_match(self::BOT, $ua)) {
            return false;
        }
        $path = self::normalisePath($path);
        if ($path === null) {
            return false;
        }
        $day = gmdate('Y-m-d');
        Database::run(
            'INSERT INTO page_views (day, path, visitor_hash, signed_in, referrer_host) VALUES (?, ?, ?, ?, ?)',
            [$day, $path, self::visitorHash($day, $request->ip(), $ua), (int) $signedIn, self::referrerHost($referrer)]
        );
        return true;
    }

    /** HMAC of IP + user agent with that day's random salt: stable within a UTC day, unlinkable once the salt is gone. */
    public static function visitorHash(string $day, string $ip, string $userAgent): string
    {
        return hash_hmac('sha256', "$ip|$userAgent", self::salt($day));
    }

    /** The day's random salt, created on first use (INSERT IGNORE keeps concurrent first visits consistent). */
    private static function salt(string $day): string
    {
        Database::run('INSERT IGNORE INTO visit_salts (day, salt) VALUES (?, ?)', [$day, bin2hex(random_bytes(32))]);
        return (string) Database::value('SELECT salt FROM visit_salts WHERE day = ?', [$day]);
    }

    /**
     * Same-site paths only, without query or fragment. Admin and private pages are not counted, and parts
     * that identify a person or a secret (result references, share tokens) are replaced by "*".
     */
    public static function normalisePath(string $path): ?string
    {
        // Only a site path: "/research". Never a full or protocol-relative URL ("//other.site/x").
        if (!str_starts_with($path, '/') || str_starts_with($path, '//')) {
            return null;
        }
        // The router matches paths case-insensitively, so compare in lower case.
        $path = strtolower(rtrim((string) parse_url($path, PHP_URL_PATH), '/')) ?: '/';
        if (preg_match('#^/(admin|api)(/|$)#', $path)) {
            return null;
        }
        if (in_array($path, self::PAGES, true)) {
            return $path;
        }
        // Pages with an id: only the page type is kept (a result reference or share token is personal).
        foreach (['#^/results/[^/]+$#' => '/results/*', '#^/r/[^/]+$#' => '/r/*', '#^/factors/[a-z0-9]{1,3}$#' => '/factors/*'] as $re => $name) {
            if (preg_match($re, $path)) {
                return $name;
            }
        }
        return '/other';
    }

    /** The other site a visitor came from (host only); null for our own pages or no referrer. */
    public static function referrerHost(?string $referrer): ?string
    {
        if ($referrer === null || $referrer === '') {
            return null;
        }
        $host = parse_url($referrer, PHP_URL_HOST);
        if (!is_string($host) || !preg_match('/^[a-z0-9.-]{1,100}$/i', $host)) {
            return null;
        }
        $host = strtolower(preg_replace('/^www\./i', '', $host));
        $own = strtolower(preg_replace('/^www\./i', '', (string) parse_url(Config::string('app.url'), PHP_URL_HOST)));
        return $host === $own || $host === 'localhost' ? null : $host;
    }

    /**
     * Daily totals for finished days, then raw rows older than RAW_DAYS are deleted (cron).
     * @return array{aggregated:int, purged:int}
     */
    public static function rollUp(): array
    {
        $days = (int) Database::value('SELECT COUNT(DISTINCT day) FROM page_views WHERE day < UTC_DATE()');
        Database::run(
            'INSERT INTO daily_visits (day, visitors, views, signed_in_visitors)
             SELECT day, COUNT(DISTINCT visitor_hash), COUNT(*), COUNT(DISTINCT CASE WHEN signed_in = 1 THEN visitor_hash END)
             FROM page_views WHERE day < UTC_DATE() GROUP BY day
             ON DUPLICATE KEY UPDATE visitors = VALUES(visitors), views = VALUES(views), signed_in_visitors = VALUES(signed_in_visitors)'
        );
        $purged = Database::run('DELETE FROM page_views WHERE day < UTC_DATE() - INTERVAL ' . self::RAW_DAYS . ' DAY')->rowCount();
        // Past days' salts go: from now on their visitor codes can't be traced or linked.
        Database::run('DELETE FROM visit_salts WHERE day < UTC_DATE()');
        return ['days' => $days, 'purged' => $purged];
    }

    /**
     * Admin metrics for the last $days days (including today): visitors and page views per day, averages,
     * top pages and referrers, signed-in users, and activity (sign-ups, tests, registrations) on the same days.
     */
    public static function metrics(int $days, bool $details = true): array
    {
        $days = max(1, min(365, $days));
        $from = gmdate('Y-m-d', strtotime('-' . ($days - 1) . ' days'));
        $series = [];
        for ($d = strtotime("$from 00:00:00 UTC"), $end = strtotime(gmdate('Y-m-d') . ' 00:00:00 UTC'); $d <= $end; $d += 86400) {
            $series[gmdate('Y-m-d', $d)] = ['visitors' => 0, 'views' => 0, 'signedIn' => 0, 'signups' => 0, 'testsStarted' => 0, 'testsCompleted' => 0, 'registrations' => 0];
        }
        // Finished days come from the totals table; days still in raw form (today, or before the first cron run) are counted live.
        foreach (Database::all('SELECT * FROM daily_visits WHERE day >= ?', [$from]) as $r) {
            $series[$r['day']] = ['visitors' => (int) $r['visitors'], 'views' => (int) $r['views'], 'signedIn' => (int) $r['signed_in_visitors']] + $series[$r['day']];
        }
        foreach (Database::all(
            'SELECT day, COUNT(DISTINCT visitor_hash) v, COUNT(*) n, COUNT(DISTINCT CASE WHEN signed_in = 1 THEN visitor_hash END) u FROM page_views
             WHERE day >= ? AND day NOT IN (SELECT day FROM daily_visits) GROUP BY day',
            [$from]
        ) as $r) {
            if (isset($series[$r['day']])) {
                $series[$r['day']] = ['visitors' => (int) $r['v'], 'views' => (int) $r['n'], 'signedIn' => (int) $r['u']] + $series[$r['day']];
            }
        }
        $activity = [
            'signups' => 'SELECT DATE(created_at) d, COUNT(*) n FROM users WHERE created_at >= ? GROUP BY d',
            'testsStarted' => 'SELECT DATE(started_at) d, COUNT(*) n FROM test_sessions WHERE started_at >= ? GROUP BY d',
            'testsCompleted' => "SELECT DATE(completed_at) d, COUNT(*) n FROM test_sessions WHERE status = 'completed' AND completed_at >= ? GROUP BY d",
            'registrations' => 'SELECT DATE(created_at) d, COUNT(*) n FROM challenge_registrations WHERE created_at >= ? GROUP BY d',
        ];
        foreach ($activity as $key => $sql) {
            foreach (Database::all($sql, ["$from 00:00:00"]) as $r) {
                if (isset($series[$r['d']])) {
                    $series[$r['d']][$key] = (int) $r['n'];
                }
            }
        }

        $rawFrom = max($from, gmdate('Y-m-d', strtotime('-' . (self::RAW_DAYS - 1) . ' days')));
        $topPages = !$details ? [] : Database::all(
            'SELECT path AS label, COUNT(*) AS views, COUNT(DISTINCT day, visitor_hash) AS visitors FROM page_views WHERE day >= ?
             GROUP BY path ORDER BY views DESC LIMIT 10',
            [$rawFrom]
        );
        $referrers = !$details ? [] : Database::all(
            'SELECT referrer_host AS label, COUNT(DISTINCT day, visitor_hash) AS visitors FROM page_views
             WHERE day >= ? AND referrer_host IS NOT NULL GROUP BY referrer_host ORDER BY visitors DESC LIMIT 8',
            [$rawFrom]
        );

        $today = $series[gmdate('Y-m-d')];
        $sum = static fn (string $k, int $last): int => array_sum(array_column(array_slice($series, -$last), $k));
        return [
            'days' => $days,
            'from' => $from,
            'today' => $today,
            'last7' => ['visitors' => $sum('visitors', 7), 'views' => $sum('views', 7)],
            'period' => [
                'visitors' => $sum('visitors', $days),
                'views' => $sum('views', $days),
                'averageDailyVisitors' => round($sum('visitors', $days) / $days, 1),
                'viewsPerVisit' => $sum('visitors', $days) ? round($sum('views', $days) / $sum('visitors', $days), 1) : 0,
                'signups' => $sum('signups', $days),
                'testsCompleted' => $sum('testsCompleted', $days),
            ],
            'byDay' => array_map(static fn ($day, $v): array => ['day' => $day] + $v, array_keys($series), array_values($series)),
            'topPages' => array_map(static fn ($r): array => ['label' => $r['label'], 'views' => (int) $r['views'], 'visitors' => (int) $r['visitors']], $topPages),
            'referrers' => array_map(static fn ($r): array => ['label' => $r['label'], 'count' => (int) $r['visitors']], $referrers),
            'rawDays' => self::RAW_DAYS,
        ];
    }
}
