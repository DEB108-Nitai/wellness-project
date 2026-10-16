<?php
declare(strict_types=1);

use Transenigma\Core\Database;
use Transenigma\Core\Request;
use Transenigma\Services\VisitService;

/** Phase 5 slice D: the private visit counter. */
function visitReq(string $ip, string $ua = 'Mozilla/5.0 (Windows NT 10.0) Chrome/130'): Request
{
    return new Request('POST', '/visit', [], ['REMOTE_ADDR' => $ip, 'HTTP_USER_AGENT' => $ua], '');
}

test('a visitor counts once a day, can not be followed across days, and no IP or browser text is stored', function () {
    useTestDatabase();
    Database::run('DELETE FROM page_views');
    Database::run('DELETE FROM daily_visits');
    $a = visitReq('203.0.113.7');
    VisitService::record('/', null, false, $a);
    VisitService::record('/research?utm=x#top', 'https://www.google.com/search?q=terf', true, $a);
    VisitService::record('/Consultancy/', null, false, visitReq('198.51.100.20'));

    $rows = Database::all('SELECT * FROM page_views ORDER BY id');
    assertSame(3, count($rows));
    assertSame(['/', '/research', '/consultancy'], array_column($rows, 'path'), 'no query string, fragment or trailing slash');
    assertSame('google.com', $rows[1]['referrer_host'], 'host only, www dropped');
    assertSame($rows[0]['visitor_hash'], $rows[1]['visitor_hash'], 'same person, same day');
    assertTrue($rows[0]['visitor_hash'] !== $rows[2]['visitor_hash']);
    $dump = json_encode($rows);
    assertTrue(!str_contains($dump, '203.0.113.7') && !str_contains($dump, 'Chrome'), 'no raw IP or user agent stored');

    // The same IP and browser on two days give unrelated values.
    assertTrue(VisitService::visitorHash('2026-10-12', '203.0.113.7', 'UA') !== VisitService::visitorHash('2026-10-13', '203.0.113.7', 'UA'));

    assertSame(1, (int) Database::value('SELECT SUM(signed_in) FROM page_views'), 'only "signed in: yes/no", never who');
    assertSame(false, in_array('user_id', array_keys($rows[0]), true));
    $m = VisitService::metrics(7);
    assertSame(1, $m['today']['signedIn']);
    assertSame(2, $m['today']['visitors']);
    assertSame(3, $m['today']['views']);
    assertSame(['label' => 'google.com', 'count' => 1], $m['referrers'][0]);
    assertSame(7, count($m['byDay']));
});

test('admin pages, API calls, bots and private ids are never counted as they are', function () {
    useTestDatabase();
    Database::run('DELETE FROM page_views');
    $req = visitReq('203.0.113.8');
    assertSame(false, VisitService::record('/admin/participants', null, false, $req));
    assertSame(false, VisitService::record('/api/auth/me', null, false, $req));
    assertSame(false, VisitService::record('//evil.example/x', null, false, $req));
    assertSame(false, VisitService::record('/', null, false, visitReq('203.0.113.9', 'Googlebot/2.1 (+http://www.google.com/bot.html)')));
    assertSame(false, VisitService::record('/', null, false, visitReq('203.0.113.9', '')));
    assertSame(0, (int) Database::value('SELECT COUNT(*) FROM page_views'));

    // Result references and share tokens are personal: replaced by "*".
    VisitService::record('/results/TE-ABCDEF', null, false, $req);
    VisitService::record('/r/0123456789abcdef0123456789abcdef', null, false, $req);
    VisitService::record('/R/0123456789abcdef0123456789abcdef', null, false, $req); // the router ignores case
    VisitService::record('/some/made-up-page', null, false, $req);
    VisitService::record('/factors/Q3', null, false, $req);
    assertSame(['/results/*', '/r/*', '/r/*', '/other', '/factors/*'], array_column(Database::all('SELECT path FROM page_views ORDER BY id'), 'path'));
    // Our own site as referrer is not an outside source.
    assertSame(null, VisitService::referrerHost('http://localhost:3000/research'));
});

test('the daily roll-up keeps totals and removes raw rows older than 90 days', function () {
    useTestDatabase();
    Database::run('DELETE FROM page_views');
    Database::run('DELETE FROM daily_visits');
    $old = gmdate('Y-m-d', strtotime('-100 days'));
    $yesterday = gmdate('Y-m-d', strtotime('-1 day'));
    foreach ([[$old, 'a'], [$old, 'a'], [$old, 'b'], [$yesterday, 'c']] as [$day, $v]) {
        Database::run('INSERT INTO page_views (day, path, visitor_hash) VALUES (?, ?, ?)', [$day, '/', str_repeat($v, 64)]);
    }
    VisitService::visitorHash($yesterday, '203.0.113.1', 'UA'); // creates yesterday's salt
    $r = VisitService::rollUp();
    assertSame(3, $r['purged'], 'the 100-day-old raw rows');
    assertSame(0, (int) Database::value('SELECT COUNT(*) FROM visit_salts WHERE day < UTC_DATE()'), "past days' salts are deleted");
    $totals = Database::one('SELECT visitors, views FROM daily_visits WHERE day = ?', [$old]);
    assertSame([2, 3], [(int) $totals['visitors'], (int) $totals['views']], 'totals kept');
    assertSame(1, (int) Database::value('SELECT COUNT(*) FROM page_views'));
    $m = VisitService::metrics(2);
    assertSame(1, $m['byDay'][0]['visitors'], 'yesterday from the totals table');
});

test('the visitors page is admin-only', function () {
    useTestDatabase();
    assertSame(401, getAs(null, '/admin/visitors'));
    assertSame(403, getAs(['id' => 999999, 'role' => 'user', 'email' => 'm@example.com'], '/admin/visitors'));
});

test('the admin dashboard summarises tests, users, registrations, messages, visitors and recent activity', function () {
    useTestDatabase();
    $d = \Transenigma\Services\AdminDashboardService::summary();
    foreach (['last7', 'last30', 'allTime'] as $p) {
        assertTrue(isset($d['tests'][$p]['started'], $d['tests'][$p]['completed'], $d['tests'][$p]['completionRate'], $d['tests'][$p]['flagged']), "tests.$p");
        assertTrue($d['tests'][$p]['completed'] <= $d['tests'][$p]['started']);
    }
    assertTrue($d['tests']['allTime']['started'] >= $d['tests']['last30']['started']);
    assertSame(7, count($d['visitors']['byDay']));
    assertTrue(count($d['recentActivity']) <= 10);
    if ($d['recentActivity']) {
        assertTrue(!array_key_exists('details', $d['recentActivity'][0]) && !array_key_exists('ip_hash', $d['recentActivity'][0]), 'no details or IP hashes');
    }
    assertSame(401, getAs(null, '/admin/dashboard'));
    assertSame(403, getAs(['id' => 999999, 'role' => 'user', 'email' => 'm@example.com'], '/admin/dashboard'));
});

test('the visit beacon needs the CSRF token and records nothing personal through the API', function () {
    useTestDatabase();
    Database::run('DELETE FROM page_views');
    $post = new Request('POST', '/visit', [], ['REMOTE_ADDR' => '203.0.113.30', 'HTTP_USER_AGENT' => 'Mozilla/5.0', 'CONTENT_TYPE' => 'application/json'], '{"path":"/research"}');
    assertSame(403, kernelAs(null)->handle($post)->status, 'no CSRF token');
    assertSame(0, (int) Database::value('SELECT COUNT(*) FROM page_views'));
});
