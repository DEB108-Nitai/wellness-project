<?php
declare(strict_types=1);

use Transenigma\Core\Database;
use Transenigma\Core\HttpException;
use Transenigma\Core\Request;
use Transenigma\Services\ChallengeService;
use Transenigma\Services\SettingsService;
use Transenigma\Services\SiteService;
use Transenigma\Services\SpamGuard;

function registration(array $overrides = []): array
{
    return $overrides + [
        'program' => 'PTI', 'name' => 'Ravi Kumar', 'email' => uniqueEmail(), 'phone' => '+91 98765 43210',
        'age' => 24, 'city' => 'Pune', 'country' => 'IN', 'cohortTiming' => 'evening',
        'struggles' => ['Stress & Anxiety', 'Distractions'], 'primaryGoal' => 'Build a calm daily routine.', 'consent' => true,
    ];
}

test('all three programs register with the exact details chosen (faults 15, 16)', function () {
    useTestDatabase();
    asGuest();
    $mail = captureMail();
    foreach (['STI' => 'morning', 'TTI' => 'weekend', 'PTI' => 'evening'] as $program => $timing) {
        $reg = ChallengeService::register(registration(['program' => $program, 'cohortTiming' => $timing]), authReq());
        assertTrue((bool) preg_match("/^$program-60-[2-9A-HJ-NP-Z]{6}$/", $reg['ref']), "bad ref {$reg['ref']}");
        assertSame('registered', $reg['status'], 'must not be auto-confirmed (fault 17)');
        $row = Database::one('SELECT * FROM challenge_registrations WHERE ref_code = ?', [$reg['ref']]);
        assertSame($program, $row['program']);
        assertSame($timing, $row['cohort_timing']);
        assertSame(['Stress & Anxiety', 'Distractions'], json_decode($row['struggles'], true));
    }
    assertSame(3, count($mail), 'one confirmation email per registration');
    assertTrue(str_contains($mail[2]['subject'], 'Philosophical Therapeutic Intervention'));

    // Admin search sees all three programs (fault 15).
    $all = ChallengeService::search([], 1, 25);
    assertTrue($all['total'] >= 3);
    $pti = ChallengeService::search(['program' => 'PTI', 'q' => 'Ravi'], 1, 25);
    assertTrue($pti['total'] >= 1 && $pti['items'][0]['program'] === 'PTI', 'PTI filter must return PTI registrations');
});

test('the same email cannot register twice for the same program, but can join other programs (fault 17)', function () {
    useTestDatabase();
    asGuest();
    $mail = captureMail();
    $email = uniqueEmail();
    $first = ChallengeService::register(registration(['email' => $email, 'program' => 'STI']), authReq());
    // A second attempt looks exactly like success to whoever submits it (no disclosure of who joined what);
    // only the inbox learns it is already registered.
    assertSame(null, ChallengeService::register(registration(['email' => $email, 'program' => 'STI', 'name' => 'Someone Else']), authReq()));
    assertSame(1, (int) Database::value("SELECT COUNT(*) FROM challenge_registrations WHERE email = ? AND program = 'STI'", [$email]));
    assertSame(2, count($mail));
    assertSame($email, $mail[1]['to']);
    assertTrue(str_contains($mail[1]['subject'], 'already registered'));
    assertTrue(str_contains($mail[1]['text'], $first['ref']) && str_contains($mail[1]['text'], 'Ravi Kumar'), 'the registered name and ref, not the new input');
    ChallengeService::register(registration(['email' => $email, 'program' => 'TTI']), authReq()); // allowed

    // After cancellation, registering again is allowed.
    Database::run("UPDATE challenge_registrations SET status = 'cancelled' WHERE email = ? AND program = 'STI'", [$email]);
    ChallengeService::register(registration(['email' => $email, 'program' => 'STI']), authReq());
});

test('my registrations include guest registrations by email only after the email is verified', function () {
    useTestDatabase();
    asGuest();
    captureMail();
    $email = uniqueEmail();
    $guestReg = ChallengeService::register(registration(['email' => $email, 'program' => 'STI']), authReq());

    // Someone signs up with that address but has not proven they own the inbox.
    $account = \Transenigma\Services\AuthService::register('Not The Owner', $email, GOOD_PASSWORD, authReq());
    $user = \Transenigma\Repositories\UserRepository::find((int) $account['id']);
    assertSame(null, $user['email_verified_at']);
    assertSame([], ChallengeService::forUser($user), 'unverified account sees nothing registered under that email');

    // After verification the guest registration appears.
    Database::run('UPDATE users SET email_verified_at = UTC_TIMESTAMP() WHERE id = ?', [$account['id']]);
    $refs = array_column(ChallengeService::forUser(\Transenigma\Repositories\UserRepository::find((int) $account['id'])), 'ref');
    assertSame([$guestReg['ref']], $refs);
});

test('registration validates phone, age, struggles and respects the open/closed setting', function () {
    useTestDatabase();
    asGuest();
    captureMail();
    assertSame(422, assertThrows(HttpException::class, fn () => ChallengeService::register(registration(['phone' => '12']), authReq()))->status);
    assertSame(422, assertThrows(HttpException::class, fn () => ChallengeService::register(registration(['struggles' => ['<script>']]), authReq()))->status);

    SettingsService::update(['challenge_registration_open' => false], 1);
    try {
        assertSame('REGISTRATION_CLOSED', assertThrows(HttpException::class, fn () => ChallengeService::register(registration(), authReq()))->errorCode);
    } finally {
        SettingsService::update(['challenge_registration_open' => true], 1);
    }
});

test('the 60-day form needs age, city and country as well as name, email and phone', function () {
    useTestDatabase();
    asGuest();
    captureMail();
    $send = static fn (array $body) => (new \Transenigma\Controllers\ChallengeController())->register(new Request('POST', '/challenge/registrations', [],
        ['REMOTE_ADDR' => '10.30.40.50', 'CONTENT_TYPE' => 'application/json'], json_encode($body, JSON_THROW_ON_ERROR)));
    $full = registration(['formElapsedMs' => 10000]);
    $e = assertThrows(HttpException::class, fn () => $send(array_diff_key($full, ['age' => 1, 'city' => 1, 'country' => 1])));
    assertSame(['age', 'city', 'country'], array_keys($e->fields), 'each missing field is named');
    assertSame(['country'], array_keys(assertThrows(HttpException::class, fn () => $send(['country' => 'XX'] + $full))->fields), 'unknown country refused');
    assertSame(201, $send($full)->status, 'a complete form registers');
});

test('one form can register for several programs: a row and reference each, one email listing them all', function () {
    useTestDatabase();
    asGuest();
    $mail = captureMail();
    $email = uniqueEmail();
    $regs = ChallengeService::registerMany(registration(['email' => $email, 'programs' => ['TTI', 'STI']]), authReq());
    assertSame(['STI', 'TTI'], array_column($regs, 'program'), 'display order, whatever order they were ticked');
    assertSame(2, (int) Database::value('SELECT COUNT(*) FROM challenge_registrations WHERE email = ?', [$email]));
    assertSame(1, count($mail), 'one email for the whole form');
    assertTrue(str_contains($mail[0]['subject'], 'STI and TTI'));
    assertTrue(str_contains($mail[0]['text'], $regs[0]['ref']) && str_contains($mail[0]['text'], $regs[1]['ref']), 'both references');

    // STI is already held: only PTI is new, and the one email says STI was kept as it was.
    $more = ChallengeService::registerMany(registration(['email' => $email, 'programs' => ['STI', 'PTI']]), authReq());
    assertSame(['PTI'], array_column($more, 'program'));
    assertSame(2, count($mail));
    assertTrue(str_starts_with($mail[1]['subject'], 'Registered successfully'));
    assertTrue(str_contains($mail[1]['text'], 'already registered for the Sonic Therapeutic Intervention (STI)') && str_contains($mail[1]['text'], $regs[0]['ref']));

    // Everything chosen is already held: nothing stored, one "already registered" email with each reference.
    assertSame([], ChallengeService::registerMany(registration(['email' => $email, 'programs' => ['STI', 'PTI', 'TTI']]), authReq()));
    assertSame(3, (int) Database::value('SELECT COUNT(*) FROM challenge_registrations WHERE email = ?', [$email]));
    assertSame(3, count($mail));
    assertTrue(str_starts_with($mail[2]['subject'], 'You are already registered'));
    assertTrue(str_contains($mail[2]['subject'], 'STI, PTI, TTI'));
    assertTrue(str_contains($mail[2]['text'], $more[0]['ref']));
});

test('the form needs at least one listed program; a single program from an older page still works', function () {
    useTestDatabase();
    asGuest();
    captureMail();
    $send = static fn (array $body) => (new \Transenigma\Controllers\ChallengeController())->register(new Request('POST', '/challenge/registrations', [],
        ['REMOTE_ADDR' => '10.30.40.51', 'CONTENT_TYPE' => 'application/json'], json_encode($body, JSON_THROW_ON_ERROR)));
    $full = array_diff_key(registration(['formElapsedMs' => 10000]), ['program' => 1]);
    assertSame(['programs'], array_keys(assertThrows(HttpException::class, fn () => $send($full))->fields), 'none chosen');
    assertSame('Please choose at least one program.', assertThrows(HttpException::class, fn () => $send(['programs' => []] + $full))->fields['programs']);
    assertSame(['programs'], array_keys(assertThrows(HttpException::class, fn () => $send(['programs' => ['STI', 'XYZ']] + $full))->fields), 'unknown program');
    assertSame(['programs'], array_keys(assertThrows(HttpException::class, fn () => $send(['programs' => ['STI', 'STI']] + $full))->fields), 'the same program twice');
    assertSame(201, $send(['programs' => ['STI', 'PTI', 'TTI']] + $full)->status);
    assertSame(3, (int) Database::value('SELECT COUNT(*) FROM challenge_registrations WHERE email = ?', [$full['email']]));
    $legacy = ['program' => 'PTI', 'email' => uniqueEmail()] + $full;
    assertSame(201, $send($legacy)->status, 'older page sends one program');
    assertSame('PTI', Database::value('SELECT program FROM challenge_registrations WHERE email = ?', [$legacy['email']]));
});

test('admin can change status and notes; CSV export neutralises formulas', function () {
    useTestDatabase();
    asGuest();
    captureMail();
    $reg = ChallengeService::register(registration(['name' => '=HYPERLINK("http://evil")']), authReq());
    $id = (int) Database::value('SELECT id FROM challenge_registrations WHERE ref_code = ?', [$reg['ref']]);
    $admin = ['id' => 1, 'role' => 'admin'];
    $updated = ChallengeService::update($id, ['status' => 'confirmed', 'adminNotes' => 'Morning batch'], $admin, authReq());
    assertSame('confirmed', $updated['status']);
    assertSame('Morning batch', $updated['adminNotes']);

    ob_start();
    ChallengeService::exportCsv(['q' => $reg['ref']]);
    $csv = (string) ob_get_clean();
    assertTrue(str_contains($csv, "'=HYPERLINK"), 'formula must be prefixed with an apostrophe');
    assertTrue(str_contains($csv, $reg['ref']));
});

test('CSV export keeps every value in its own cell, even with backslash-quote tricks', function () {
    useTestDatabase();
    asGuest();
    captureMail();
    $tricky = 'x\\",=HYPERLINK("http://evil")';
    $goal = "line one\nline \\\" two"; // a newline and a backslash-quote inside one cell
    $reg = ChallengeService::register(registration(['name' => $tricky, 'primaryGoal' => $goal]), authReq());
    ob_start();
    ChallengeService::exportCsv(['q' => $reg['ref']]);
    $csv = substr((string) ob_get_clean(), 3); // drop the UTF-8 BOM
    // Parse the way spreadsheets do (RFC 4180, no backslash escape).
    $fh = fopen('php://memory', 'r+');
    fwrite($fh, $csv);
    rewind($fh);
    $rows = [];
    while (($row = fgetcsv($fh, null, ',', '"', '')) !== false) {
        $rows[] = $row;
    }
    assertSame(2, count($rows), 'header + one row');
    assertSame(14, count($rows[1]), 'no extra cells');
    assertSame($tricky, $rows[1][3], 'name cell intact');
    assertSame($goal, $rows[1][11], 'goal cell intact');
});

test('the programs are open to every age: a child registers and counts as "Under 18", while the 16PF test keeps its minimum age', function () {
    useTestDatabase();
    asGuest();
    captureMail();
    $tag = 'Kidstown' . bin2hex(random_bytes(2));
    $send = static fn (array $body) => (new \Transenigma\Controllers\ChallengeController())->register(new Request('POST', '/challenge/registrations', [],
        ['REMOTE_ADDR' => '10.30.40.51', 'CONTENT_TYPE' => 'application/json'], json_encode($body, JSON_THROW_ON_ERROR)));
    $body = registration(['age' => 9, 'city' => $tag, 'formElapsedMs' => 10000]);
    assertSame(201, $send($body)->status);
    assertSame(9, (int) Database::value('SELECT age FROM challenge_registrations WHERE city = ?', [$tag]));
    assertSame(422, assertThrows(HttpException::class, fn () => $send(['age' => 0] + $body))->status, 'an age is still required');
    assertSame(1, array_column(ChallengeService::stats(['q' => $tag])['ageBands'], 'count', 'label')['Under 18']);
    assertSame(18, SettingsService::int('min_age'), 'the 16PF minimum age is unchanged');
});

test('registration charts count by day, program, status, schedule, age, struggle and city, over the same filters as the list', function () {
    useTestDatabase();
    asGuest();
    captureMail();
    $tag = 'Statsville' . bin2hex(random_bytes(2)); // isolates these rows through the q filter (city)
    ChallengeService::register(registration(['program' => 'STI', 'age' => 22, 'city' => " $tag ", 'cohortTiming' => 'morning', 'struggles' => ['Distractions']]), authReq());
    ChallengeService::register(registration(['program' => 'PTI', 'age' => 40, 'city' => strtolower($tag), 'cohortTiming' => 'evening']), authReq());
    $third = ChallengeService::register(registration(['program' => 'PTI', 'city' => strtoupper($tag), 'cohortTiming' => 'evening', 'struggles' => ['Distractions', 'Stress & Anxiety']]), authReq());
    Database::run("UPDATE challenge_registrations SET status = 'confirmed', age = NULL WHERE ref_code = ?", [$third['ref']]);

    $s = ChallengeService::stats(['q' => $tag]);
    $map = static fn (array $pairs): array => array_column($pairs, 'count', 'label');
    assertSame(3, $s['total']);
    assertSame(['STI' => 1, 'TTI' => 0, 'PTI' => 2], $map($s['byProgram']));
    assertSame(2, $map($s['byStatus'])['registered']);
    assertSame(1, $map($s['byStatus'])['confirmed']);
    assertSame(['morning' => 1, 'evening' => 2, 'weekend' => 0], $map($s['byCohort']));
    assertSame(['Under 18' => 0, '18–24' => 1, '25–34' => 0, '35–44' => 1, '45–54' => 0, '55+' => 0, 'Not given' => 1], $map($s['ageBands']));
    assertSame(['label' => 'Distractions', 'count' => 3], $s['struggles'][0]);
    assertSame([['label' => mb_convert_case($tag, MB_CASE_TITLE), 'count' => 3]], $s['cities'], 'city spellings grouped');
    assertSame(30, count($s['byDay']), 'last 30 days by default');
    $today = end($s['byDay']);
    assertSame(gmdate('Y-m-d'), $today['day']);
    assertSame(1, $today['STI']);
    assertSame(2, $today['PTI']);

    // Filters narrow the charts and the list alike.
    assertSame(2, ChallengeService::stats(['q' => $tag, 'cohort' => 'evening'])['total']);
    assertSame(2, ChallengeService::search(['q' => $tag, 'cohort' => 'evening'], 1, 25)['total']);
    $yesterday = gmdate('Y-m-d', time() - 86400);
    assertSame(0, ChallengeService::stats(['q' => $tag, 'to' => $yesterday])['total'], 'nothing registered before today');
    assertSame(3, ChallengeService::stats(['q' => $tag, 'from' => gmdate('Y-m-d'), 'to' => gmdate('Y-m-d')])['total']);
});

test('registration filters reject impossible or reversed dates', function () {
    $controller = new \Transenigma\Controllers\AdminController();
    $get = static fn (array $q) => new \Transenigma\Core\Request('GET', '/admin/registrations/stats', $q, ['REMOTE_ADDR' => '10.0.0.8'], '');
    foreach ([['from' => '2026-02-30'], ['to' => '12-10-2026'], ['from' => '2026-10-12', 'to' => '2026-10-01']] as $q) {
        $e = assertThrows(HttpException::class, fn () => $controller->registrationStats($get($q)));
        assertSame(422, $e->status, json_encode($q));
    }
});

test('contact form stores the message and notifies support when configured', function () {
    useTestDatabase();
    asGuest();
    $mail = captureMail();
    SettingsService::update(['support_email' => 'support@example.com'], 1);
    SiteService::contact(['name' => 'Maya', 'email' => 'maya@example.com', 'subject' => 'Hello', 'message' => 'I would like to know more about PTI.'], authReq());
    assertSame(1, (int) Database::value("SELECT COUNT(*) FROM contact_messages WHERE email = 'maya@example.com' AND status = 'new'"));
    assertSame('support@example.com', $mail[0]['to']);
    SettingsService::update(['support_email' => ''], 1);
});

test('newsletter: no duplicates, unsubscribe works, re-subscribe works (fault 19)', function () {
    useTestDatabase();
    $mail = captureMail();
    $email = uniqueEmail();
    SiteService::subscribe($email, authReq());
    SiteService::subscribe($email, authReq());
    assertSame(1, (int) Database::value('SELECT COUNT(*) FROM newsletter_subscribers WHERE email = ?', [$email]));
    assertSame(1, count($mail), 'second subscribe must not send another email');

    $token = Database::value('SELECT unsubscribe_token FROM newsletter_subscribers WHERE email = ?', [$email]);
    SiteService::unsubscribe($token);
    assertSame('unsubscribed', Database::value('SELECT status FROM newsletter_subscribers WHERE email = ?', [$email]));
    assertSame(404, assertThrows(HttpException::class, fn () => SiteService::unsubscribe(str_repeat('0', 32)))->status);

    SiteService::subscribe($email, authReq());
    assertSame('subscribed', Database::value('SELECT status FROM newsletter_subscribers WHERE email = ?', [$email]));
});

test('spam guard rejects honeypot and instant submissions', function () {
    assertSame('SPAM_DETECTED', assertThrows(HttpException::class, fn () => SpamGuard::check(['website' => 'http://spam']))->errorCode);
    assertSame('TOO_FAST', assertThrows(HttpException::class, fn () => SpamGuard::check(['formElapsedMs' => 800]))->errorCode);
    SpamGuard::check(['formElapsedMs' => 10000]);
    SpamGuard::check([]);
});

test('spam guard does not depend on the visitor\'s device clock', function () {
    // The old check compared a browser timestamp with the server clock: a phone running 5 minutes fast
    // was refused forever. Only the time the form was open counts now; a timestamp alone is ignored.
    SpamGuard::check(['formStartedAt' => (int) (microtime(true) * 1000) + 300000, 'formElapsedMs' => 45000]);
    SpamGuard::check(['formStartedAt' => (int) (microtime(true) * 1000) + 300000]);
});

test('admin settings update is validated and typed', function () {
    useTestDatabase();
    $e = assertThrows(HttpException::class, fn () => SettingsService::update(['min_age' => 13, 'items_per_page' => 50, 'bogus' => 1, 'support_email' => 'nope'], 1));
    assertSame(['min_age', 'items_per_page', 'bogus', 'support_email'], array_keys($e->fields));
    $after = SettingsService::update(['maintenance_mode' => true, 'announcement_text' => 'New cohort starts soon'], 1);
    assertSame(true, $after['maintenance_mode']);
    assertSame('New cohort starts soon', $after['announcement_text']);
    SettingsService::update(['maintenance_mode' => false], 1);
});

test('linkedin_url accepts only https links on linkedin.com and is public', function () {
    useTestDatabase();
    foreach (['http://www.linkedin.com/company/x', 'https://evil.com/linkedin.com', 'https://notlinkedin.com/x', 'javascript:alert(1)'] as $bad) {
        $e = assertThrows(HttpException::class, fn () => SettingsService::update(['linkedin_url' => $bad], 1));
        assertSame(['linkedin_url'], array_keys($e->fields), "rejects $bad");
    }
    $after = SettingsService::update(['linkedin_url' => 'https://www.linkedin.com/company/example/'], 1);
    assertSame('https://www.linkedin.com/company/example/', $after['linkedin_url']);
    assertSame('https://www.linkedin.com/company/example/', SettingsService::public()['linkedin_url']);
    SettingsService::update(['linkedin_url' => ''], 1);
});

test('company address and CIN are public, and the CIN must be well formed', function () {
    useTestDatabase();
    $public = SettingsService::public();
    assertSame('U74999WB2017PTC219904', $public['company_cin'], 'seeded by migration 021');
    assertTrue(str_contains($public['company_address'], 'New Alipore'));
    foreach (['U74999WB2017PTC21990', 'X74999WB2017PTC219904', 'U74999WB2017PTC2199045', '<b>bad</b>'] as $bad) {
        $e = assertThrows(HttpException::class, fn () => SettingsService::update(['company_cin' => $bad], 1));
        assertSame(['company_cin'], array_keys($e->fields), "rejects $bad");
    }
    assertSame('U74999WB2017PTC219904', SettingsService::update(['company_cin' => ' u74999wb2017ptc219904 '], 1)['company_cin'], 'trimmed and upper-cased');
    assertSame('', SettingsService::update(['company_cin' => ''], 1)['company_cin'], 'empty hides it');
    SettingsService::update(['company_cin' => 'U74999WB2017PTC219904'], 1);

    // Non-text values are refused, never coerced to '' (which would wipe the stored value).
    $e = assertThrows(HttpException::class, fn () => SettingsService::update(['company_address' => null, 'company_cin' => 123, 'support_email' => ['x'], 'linkedin_url' => false], 1));
    assertSame(['company_address', 'company_cin', 'support_email', 'linkedin_url'], array_keys($e->fields));
    assertTrue(str_contains(SettingsService::get('company_address'), 'New Alipore'), 'address kept');
    assertSame('U74999WB2017PTC219904', SettingsService::get('company_cin'), 'CIN kept');
});

test('FAQs come from the database in display order', function () {
    useTestDatabase();
    $faqs = SiteService::faqs();
    assertTrue(count($faqs) >= 9);
    assertSame('Assessment', $faqs[0]['category']);
});
