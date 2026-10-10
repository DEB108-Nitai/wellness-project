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
    captureMail();
    $email = uniqueEmail();
    ChallengeService::register(registration(['email' => $email, 'program' => 'STI']), authReq());
    $e = assertThrows(HttpException::class, fn () => ChallengeService::register(registration(['email' => $email, 'program' => 'STI']), authReq()));
    assertSame('ALREADY_REGISTERED', $e->errorCode);
    ChallengeService::register(registration(['email' => $email, 'program' => 'TTI']), authReq()); // allowed

    // After cancellation, registering again is allowed.
    Database::run("UPDATE challenge_registrations SET status = 'cancelled' WHERE email = ? AND program = 'STI'", [$email]);
    ChallengeService::register(registration(['email' => $email, 'program' => 'STI']), authReq());
});

test('registration validates phone, age, struggles and respects the open/closed setting', function () {
    useTestDatabase();
    asGuest();
    captureMail();
    assertSame(422, assertThrows(HttpException::class, fn () => ChallengeService::register(registration(['phone' => '12']), authReq()))->status);
    assertSame(422, assertThrows(HttpException::class, fn () => ChallengeService::register(registration(['age' => 15]), authReq()))->status);
    assertSame(422, assertThrows(HttpException::class, fn () => ChallengeService::register(registration(['struggles' => ['<script>']]), authReq()))->status);

    SettingsService::update(['challenge_registration_open' => false], 1);
    try {
        assertSame('REGISTRATION_CLOSED', assertThrows(HttpException::class, fn () => ChallengeService::register(registration(), authReq()))->errorCode);
    } finally {
        SettingsService::update(['challenge_registration_open' => true], 1);
    }
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
    assertSame('TOO_FAST', assertThrows(HttpException::class, fn () => SpamGuard::check(['formStartedAt' => (int) (microtime(true) * 1000)]))->errorCode);
    SpamGuard::check(['formStartedAt' => (int) (microtime(true) * 1000) - 10000]);
    SpamGuard::check([]);
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

test('FAQs come from the database in display order', function () {
    useTestDatabase();
    $faqs = SiteService::faqs();
    assertTrue(count($faqs) >= 9);
    assertSame('Assessment', $faqs[0]['category']);
});
