<?php
declare(strict_types=1);

use Wellness\Core\Config;
use Wellness\Core\Database;
use Wellness\Core\HttpException;
use Wellness\Core\RateLimiter;
use Wellness\Services\SettingsService;

test('migrations create the full schema in the test database', function () {
    useTestDatabase();
    $tables = Database::pdo()->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
    foreach (['users', 'auth_tokens', 'items', 'factor_norms', 'factor_percentiles', 'domain_norms', 'test_sessions',
        'session_answers', 'session_factor_scores', 'session_domain_scores', 'challenge_registrations',
        'contact_messages', 'newsletter_subscribers', 'faqs', 'settings', 'audit_logs', 'email_log', 'schema_migrations'] as $t) {
        assertTrue(in_array($t, $tables, true), "missing table $t");
    }
    assertSame(Config::string('db_test.name'), Database::value('SELECT DATABASE()'));
});

test('item set has 163 IPIP items + 3 attention checks with the IPIP keying', function () {
    useTestDatabase();
    assertSame(166, (int) Database::value("SELECT COUNT(*) FROM items WHERE item_set_version = 'ipip16-v1'"));
    assertSame(3, (int) Database::value('SELECT COUNT(*) FROM items WHERE is_attention_check = 1 AND expected_answer BETWEEN 1 AND 5'));

    // Positive + negative keyed counts from https://ipip.ori.org/new16PFTable.htm
    $expected = ['A' => [7, 3], 'B' => [8, 5], 'C' => [5, 5], 'E' => [6, 4], 'F' => [6, 4], 'G' => [5, 5], 'H' => [5, 5], 'I' => [6, 4],
        'L' => [6, 4], 'M' => [7, 3], 'N' => [5, 5], 'O' => [7, 3], 'Q1' => [5, 5], 'Q2' => [7, 3], 'Q3' => [5, 5], 'Q4' => [7, 3]];
    $rows = Database::all("SELECT factor_code, SUM(keyed = '+') pos, SUM(keyed = '-') neg FROM items WHERE factor_code IS NOT NULL GROUP BY factor_code");
    $actual = [];
    foreach ($rows as $r) {
        $actual[$r['factor_code']] = [(int) $r['pos'], (int) $r['neg']];
    }
    ksort($expected);
    ksort($actual);
    assertSame($expected, $actual);
});

test('items are numbered 1..166 and no two neighbours share a factor', function () {
    useTestDatabase();
    $rows = Database::all('SELECT position, factor_code FROM items ORDER BY position');
    assertSame(range(1, 166), array_map(fn ($r) => (int) $r['position'], $rows));
    for ($i = 1; $i < count($rows); $i++) {
        if ($rows[$i]['factor_code'] !== null) {
            assertTrue($rows[$i]['factor_code'] !== $rows[$i - 1]['factor_code'], 'adjacent factor at ' . $rows[$i]['position']);
        }
    }
});

test('norms cover every factor with complete, increasing percentile tables', function () {
    useTestDatabase();
    assertSame(16, (int) Database::value("SELECT COUNT(*) FROM factor_norms WHERE norm_version = 'ipip16-op2019-v1' AND sd > 0"));
    assertSame(5, (int) Database::value("SELECT COUNT(*) FROM domain_norms WHERE sd > 0"));
    foreach (Database::all('SELECT f.factor_code, COUNT(i.id) k FROM factor_norms f JOIN items i ON i.factor_code = f.factor_code GROUP BY f.factor_code') as $f) {
        $k = (int) $f['k'];
        $pct = Database::all('SELECT raw_score, percentile FROM factor_percentiles WHERE factor_code = ? ORDER BY raw_score', [$f['factor_code']]);
        assertSame(range($k, 5 * $k), array_map(fn ($r) => (int) $r['raw_score'], $pct), "raw range for {$f['factor_code']}");
        for ($i = 1; $i < count($pct); $i++) {
            assertTrue((float) $pct[$i]['percentile'] >= (float) $pct[$i - 1]['percentile'], "percentiles must not decrease for {$f['factor_code']}");
        }
    }
    // Domain weights follow the 16PF global factor structure.
    assertSame(-1, (int) Database::value("SELECT weight FROM domain_weights WHERE domain_code = 'EX' AND factor_code = 'N'"));
    assertSame(-1, (int) Database::value("SELECT weight FROM domain_weights WHERE domain_code = 'AX' AND factor_code = 'C'"));
});

test('settings service returns typed values and only public keys publicly', function () {
    useTestDatabase();
    SettingsService::flush();
    assertSame(7, SettingsService::get('items_per_page'));
    assertSame(18, SettingsService::get('min_age'));
    assertSame(false, SettingsService::get('maintenance_mode'));
    $public = SettingsService::public();
    assertTrue(!array_key_exists('too_fast_minutes', $public), 'private setting leaked');
    assertTrue(array_key_exists('announcement_text', $public));

    // Out-of-range stored values are clamped (min_age can never drop below 18).
    Database::run("UPDATE settings SET value = '13' WHERE setting_key = 'min_age'");
    SettingsService::flush();
    assertSame(18, SettingsService::get('min_age'));
    Database::run("UPDATE settings SET value = '18' WHERE setting_key = 'min_age'");
    SettingsService::flush();
});

test('rate limiter allows the limit then returns 429 with Retry-After', function () {
    useTestDatabase();
    $key = 'tester@example.com|127.0.0.1';
    for ($i = 0; $i < 3; $i++) {
        RateLimiter::hit('test', $key, 3, 60);
    }
    assertTrue(RateLimiter::tooMany('test', $key, 3, 60));
    $e = assertThrows(HttpException::class, fn () => RateLimiter::hit('test', $key, 3, 60));
    assertSame(429, $e->status);
    assertTrue((int) $e->headers['Retry-After'] >= 1);
    RateLimiter::clear('test', $key, 60);
    assertTrue(!RateLimiter::tooMany('test', $key, 3, 60));
});

test('connection runs in UTC with strict SQL mode', function () {
    useTestDatabase();
    assertSame('+00:00', Database::value('SELECT @@session.time_zone'));
    assertTrue(str_contains((string) Database::value('SELECT @@session.sql_mode'), 'STRICT_ALL_TABLES'));
});
