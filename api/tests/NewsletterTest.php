<?php
declare(strict_types=1);

use Transenigma\Core\Config;
use Transenigma\Core\Database;
use Transenigma\Core\HttpException;
use Transenigma\Core\Kernel;
use Transenigma\Core\Request;
use Transenigma\Core\Router;
use Transenigma\Repositories\UserRepository;
use Transenigma\Services\Mailer;
use Transenigma\Services\NewsletterService;
use Transenigma\Services\SettingsService;

/** Newsletters written, tested and sent from the admin console (owner, 2026-10-22). */

function newsAdmin(): array
{
    static $admin = null;
    $admin ??= UserRepository::find(UserRepository::create('News Admin', uniqueEmail(), null, null, true, 'admin'));
    return $admin;
}

/** A subscriber with a known unsubscribe token. */
function newsSubscriber(string $status = 'subscribed'): array
{
    $email = 'reader' . bin2hex(random_bytes(4)) . '@example.com';
    $token = bin2hex(random_bytes(16));
    $id = Database::insert('INSERT INTO newsletter_subscribers (email, status, unsubscribe_token) VALUES (?, ?, ?)', [$email, $status, $token]);
    return ['id' => $id, 'email' => $email, 'token' => $token];
}

/** Run the test with newsletter uploads in a temporary folder holding one real 1×1 PNG; returns its path. */
function withNewsletterUploads(callable $fn): void
{
    $dir = sys_get_temp_dir() . '/te-news-' . bin2hex(random_bytes(4));
    Config::override('paths.uploads', $dir);
    $png = tempnam(sys_get_temp_dir(), 'png');
    try {
        file_put_contents($png, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='));
        $fn(NewsletterService::storeImage(['tmp' => $png, 'size' => filesize($png), 'name' => 'photo.png'], newsAdmin(), authReq()), $dir);
    } finally {
        Config::override('paths.uploads', null);
        @unlink($png); // the upload copied it; the original is ours to remove
        array_map('unlink', glob("$dir/newsletter/*") ?: []);
        @unlink("$dir/.htaccess");
        @rmdir("$dir/newsletter");
        @rmdir($dir);
    }
}

test('newsletter drafts: saved half-written, checked fully before a test or a send, deletable', function () {
    useTestDatabase();
    $n = NewsletterService::create(newsAdmin(), authReq());
    assertSame('draft', $n['status']);
    assertSame([], $n['blocks']);

    // A half-written draft saves fine (empty paragraph, button without a link yet).
    $saved = NewsletterService::update($n['id'], [
        'subject' => "  October\n news ", 'preheader' => '', 'coverImage' => null,
        'blocks' => [['type' => 'paragraph', 'text' => ''], ['type' => 'button', 'label' => 'Read more', 'url' => '']],
    ], newsAdmin(), authReq());
    assertSame('October news', $saved['subject'], 'subject on one line');
    assertSame(2, count($saved['blocks']));

    // A wrong link, an unknown block and an image that was never uploaded are refused, per block.
    $e = assertThrows(HttpException::class, fn () => NewsletterService::update($n['id'], ['subject' => 'x', 'blocks' => [
        ['type' => 'button', 'label' => 'Go', 'url' => 'javascript:alert(1)'],
        ['type' => 'script', 'text' => 'x'],
        ['type' => 'image', 'src' => '/uploads/newsletter/' . str_repeat('a', 24) . '.png'],
    ]], newsAdmin(), authReq()));
    assertSame(422, $e->status);
    assertSame(['blocks.0', 'blocks.1', 'blocks.2'], array_keys($e->fields));
    // Links must be https, as the message says.
    $e = assertThrows(HttpException::class, fn () => NewsletterService::update($n['id'], ['blocks' => [
        ['type' => 'button', 'label' => 'Go', 'url' => 'http://transenigma.com/'],
    ]], newsAdmin(), authReq()));
    assertSame(['blocks.0'], array_keys($e->fields));

    // Testing needs everything filled in.
    $e = assertThrows(HttpException::class, fn () => NewsletterService::sendTest($n['id'], newsAdmin(), authReq()));
    assertSame(['blocks.0', 'blocks.1'], array_keys($e->fields));

    NewsletterService::delete($n['id'], newsAdmin(), authReq());
    assertSame(null, Database::value('SELECT 1 FROM newsletters WHERE id = ?', [$n['id']]));
    assertTrue(Database::value("SELECT 1 FROM audit_logs WHERE action = 'NEWSLETTER_DELETED' AND entity_id = ?", [(string) $n['id']]) !== null);
});

test('newsletter content: everything typed is escaped; only bold, italic and https links become markup', function () {
    useTestDatabase();
    $html = NewsletterService::preview(['subject' => 'Hello', 'preheader' => 'Inside: dates', 'blocks' => [
        ['type' => 'heading', 'text' => 'News <b>now</b>'],
        ['type' => 'paragraph', 'text' => "**Big** and *small* <script>alert(1)</script>\n[our site](https://transenigma.com/test?a=1&b=2) [bad](javascript:alert(1)) [plain](http://example.com/)"],
        ['type' => 'button', 'label' => 'Take the test', 'url' => 'https://transenigma.com/test'],
        ['type' => 'divider'],
    ]]);
    assertTrue(str_contains($html, 'News &lt;b&gt;now&lt;/b&gt;'), 'heading escaped');
    assertTrue(str_contains($html, '<strong>Big</strong>') && str_contains($html, '<em>small</em>'), 'bold and italic');
    assertTrue(!str_contains($html, '<script>') && str_contains($html, '&lt;script&gt;'), 'no script');
    assertTrue(str_contains($html, '<a href="https://transenigma.com/test?a=1&amp;b=2"'), 'https link');
    assertTrue(!str_contains($html, 'href="javascript'), 'javascript: is never a link');
    assertTrue(!str_contains($html, 'href="http://example.com/"'), 'only https becomes a link');
    assertTrue(str_contains($html, '>Take the test</a>') && str_contains($html, '<hr'), 'button and divider');
    assertTrue(str_contains($html, 'Inside: dates'), 'preview text');
    assertTrue(!str_contains($html, 'cid:'), 'icon inlined for the preview');
});

test('newsletter images: real JPEG, PNG or GIF only, stored under uploads/newsletter and usable in blocks', function () {
    useTestDatabase();
    withNewsletterUploads(function (string $path, string $dir): void {
        assertTrue((bool) preg_match(NewsletterService::IMAGE_PATH, $path), "stored as $path");
        assertTrue(is_file("$dir/newsletter/" . basename($path)) && is_file("$dir/.htaccess"));

        $php = tempnam(sys_get_temp_dir(), 'php');
        file_put_contents($php, '<?php echo "x";');
        $e = assertThrows(HttpException::class, fn () => NewsletterService::storeImage(['tmp' => $php, 'size' => filesize($php), 'name' => 'x.png'], newsAdmin(), authReq()));
        unlink($php);
        assertSame(['image'], array_keys($e->fields));

        $html = NewsletterService::preview(['subject' => 'Pictures', 'coverImage' => $path, 'blocks' => [
            ['type' => 'image', 'src' => $path, 'alt' => 'Team at work', 'caption' => 'Our <team>'],
        ]]);
        $site = rtrim(Config::string('app.url'), '/');
        assertTrue(substr_count($html, "src=\"$site$path\"") === 2, 'cover and image use the full web address');
        assertTrue(str_contains($html, 'alt="Team at work"') && str_contains($html, 'Our &lt;team&gt;'));
    });
});

test('newsletter sending: queued for subscribers only, sent in batches under the hourly limit, with one-click unsubscribe', function () {
    useTestDatabase();
    $keep = newsSubscriber();
    newsSubscriber();
    $leaves = newsSubscriber();
    $gone = newsSubscriber('unsubscribed');
    $subscribed = (int) Database::value("SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'subscribed'");

    $n = NewsletterService::create(newsAdmin(), authReq());
    NewsletterService::update($n['id'], ['subject' => 'October news', 'preheader' => 'Dates inside', 'blocks' => [
        ['type' => 'paragraph', 'text' => 'The next cohort starts on 1 November.'],
    ]], newsAdmin(), authReq());

    // A test goes only to the admin, marked as a test.
    $mail = captureMail();
    NewsletterService::sendTest($n['id'], newsAdmin(), authReq());
    assertSame(1, count($mail));
    assertSame(newsAdmin()['email'], $mail[0]['to']);
    assertSame('[Test] October news', $mail[0]['subject']);

    Config::override('mail.newsletter_per_hour', 37);
    assertSame(37, NewsletterService::get($n['id'])['sendRate'], 'the editor shows the configured hourly rate');
    Config::override('mail.newsletter_per_hour', null);
    assertSame(80, NewsletterService::get($n['id'])['sendRate'], 'default when not configured');
    $sent = NewsletterService::send($n['id'], newsAdmin(), authReq());
    assertSame('sending', $sent['status']);
    assertSame($subscribed, $sent['recipients'], 'everyone subscribed now');
    assertSame(null, Database::value('SELECT 1 FROM newsletter_deliveries WHERE newsletter_id = ? AND subscriber_id = ?', [$n['id'], $gone['id']]));
    // Sent newsletters can't be changed, sent again or deleted.
    assertSame(409, assertThrows(HttpException::class, fn () => NewsletterService::send($n['id'], newsAdmin(), authReq()))->status);
    assertSame(409, assertThrows(HttpException::class, fn () => NewsletterService::update($n['id'], ['subject' => 'x'], newsAdmin(), authReq()))->status);
    assertSame(409, assertThrows(HttpException::class, fn () => NewsletterService::delete($n['id'], newsAdmin(), authReq()))->status);

    // Someone unsubscribes before their turn: skipped, not emailed.
    Database::run("UPDATE newsletter_subscribers SET status = 'unsubscribed' WHERE id = ?", [$leaves['id']]);

    // The hourly limit holds: 2 per hour means 2 attempts, then nothing until the hour has passed.
    Config::override('mail.newsletter_per_hour', 2);
    try {
        $mail = captureMail();
        $first = NewsletterService::processQueue();
        assertSame(2, $first['sent'], 'two emails in the first batch');
        assertSame(2, count($mail));
        assertSame(1, $first['skipped'], 'the one who left is skipped, without using up the batch');
        $second = NewsletterService::processQueue();
        assertSame(0, $second['sent'] + $second['failed'], 'nothing more within the hour');
    } finally {
        Config::override('mail.newsletter_per_hour', null);
    }
    // An hour later, the rest goes out.
    Database::run('UPDATE newsletter_deliveries SET attempted_at = attempted_at - INTERVAL 2 HOUR WHERE attempted_at IS NOT NULL');
    do {
        $r = NewsletterService::processQueue();
    } while ($r['sent'] + $r['failed'] + $r['skipped'] > 0 && $r['finished'] === 0);

    $done = NewsletterService::get($n['id']);
    assertSame('sent', $done['status']);
    assertSame(0, $done['pending']);
    assertSame(1, $done['skipped'], 'the one who left was skipped');
    assertSame($done['recipients'], $done['sent'] + $done['failed'] + $done['skipped']);

    // Each copy is personal: its own unsubscribe link and the one-click headers.
    $all = (int) Database::value("SELECT COUNT(*) FROM newsletter_deliveries WHERE newsletter_id = ? AND status = 'sent' AND subscriber_id = ?", [$n['id'], $keep['id']]);
    assertSame(1, $all, 'the subscriber who stayed got it once');
    $theirs = array_values(array_filter((array) $mail, static fn (array $m): bool => $m['to'] === $keep['email']));
    assertSame(1, count($theirs));
    assertTrue(str_contains($theirs[0]['html'], "/unsubscribe?token={$keep['token']}"), 'personal unsubscribe link');
    assertSame("<" . rtrim(Config::string('app.url'), '/') . "/api/newsletter/one-click?token={$keep['token']}>", $theirs[0]['headers']['List-Unsubscribe']);
    assertSame('List-Unsubscribe=One-Click', $theirs[0]['headers']['List-Unsubscribe-Post']);
    assertTrue(str_contains($theirs[0]['text'], 'The next cohort starts on 1 November.'));
    assertSame([], array_values(array_filter((array) $mail, static fn (array $m): bool => in_array($m['to'], [$leaves['email'], $gone['email']], true))));

    // A copy is a new draft with the same content.
    $copy = NewsletterService::copy($n['id'], newsAdmin(), authReq());
    assertSame(['draft', 'October news'], [$copy['status'], $copy['subject']]);
    NewsletterService::delete($copy['id'], newsAdmin(), authReq());
});

test('newsletter sending: a failing address is retried, then marked failed, and the newsletter still finishes', function () {
    useTestDatabase();
    // Only this test's newsletter and subscribers in the queue.
    Database::run("UPDATE newsletters SET status = 'sent' WHERE status = 'sending'");
    Database::run("UPDATE newsletter_subscribers SET status = 'unsubscribed' WHERE status = 'subscribed'");
    $bad = newsSubscriber();
    $n = NewsletterService::create(newsAdmin(), authReq());
    NewsletterService::update($n['id'], ['subject' => 'Retry', 'blocks' => [['type' => 'paragraph', 'text' => 'Hello']]], newsAdmin(), authReq());
    NewsletterService::send($n['id'], newsAdmin(), authReq());
    Mailer::$transport = static function (): void {
        throw new RuntimeException('SMTP down');
    };
    $attempts = static fn (): int => (int) Database::value('SELECT attempts FROM newsletter_deliveries WHERE newsletter_id = ? AND subscriber_id = ?', [$n['id'], $bad['id']]);
    try {
        // Not retried within the same hour (every attempt counts against the hourly limit).
        NewsletterService::processQueue();
        NewsletterService::processQueue();
        assertSame(1, $attempts(), 'one attempt per hour');
        Database::run('UPDATE newsletter_deliveries SET attempted_at = attempted_at - INTERVAL 2 HOUR WHERE newsletter_id = ?', [$n['id']]);
        for ($i = 2; $i <= 3; $i++) {
            NewsletterService::processQueue();
            Database::run('UPDATE newsletter_deliveries SET attempted_at = attempted_at - INTERVAL 2 HOUR WHERE newsletter_id = ?', [$n['id']]);
        }
    } finally {
        captureMail();
    }
    $row = Database::one('SELECT status, attempts FROM newsletter_deliveries WHERE newsletter_id = ? AND subscriber_id = ?', [$n['id'], $bad['id']]);
    assertSame(['failed', 3], [$row['status'], (int) $row['attempts']]);
    $done = NewsletterService::get($n['id']);
    assertSame(['sent', 1], [$done['status'], $done['failed']]);
});

test('newsletter sending: someone who unsubscribes while a batch is running is not emailed', function () {
    useTestDatabase();
    Database::run("UPDATE newsletters SET status = 'sent' WHERE status = 'sending'");
    Database::run("UPDATE newsletter_subscribers SET status = 'unsubscribed' WHERE status = 'subscribed'");
    $first = newsSubscriber();
    $second = newsSubscriber();
    $n = NewsletterService::create(newsAdmin(), authReq());
    NewsletterService::update($n['id'], ['subject' => 'Mid-batch', 'blocks' => [['type' => 'paragraph', 'text' => 'Hello']]], newsAdmin(), authReq());
    NewsletterService::send($n['id'], newsAdmin(), authReq());

    // The second person unsubscribes while the first email is going out.
    $sentTo = [];
    $recordedFirst = null;
    Mailer::$transport = static function (string $to) use (&$sentTo, &$recordedFirst, $second, $n, $first): void {
        // The attempt is already recorded while the email is being sent (a killed run can't resend it unnoticed).
        $recordedFirst ??= Database::one('SELECT attempts, attempted_at FROM newsletter_deliveries WHERE newsletter_id = ? AND subscriber_id = ?', [$n['id'], $first['id']]);
        $sentTo[] = $to;
        Database::run("UPDATE newsletter_subscribers SET status = 'unsubscribed' WHERE id = ?", [$second['id']]);
    };
    try {
        NewsletterService::processQueue();
    } finally {
        captureMail();
    }
    assertSame([$first['email']], $sentTo);
    assertTrue($recordedFirst !== null && (int) $recordedFirst['attempts'] === 1 && $recordedFirst['attempted_at'] !== null, 'attempt recorded before sending');
    assertSame('skipped', Database::value('SELECT status FROM newsletter_deliveries WHERE newsletter_id = ? AND subscriber_id = ?', [$n['id'], $second['id']]));
});

test('one-click unsubscribe works without a CSRF token or cookies, also during maintenance', function () {
    useTestDatabase();
    $s = newsSubscriber();
    $router = new Router();
    (require dirname(__DIR__) . '/routes.php')($router);
    $kernel = new Kernel($router);
    $kernel->setUserResolver(static fn (): ?array => null);
    // Gmail posts every one-click unsubscribe from the same few servers: one IP for all of them here.
    $ip = '10.9.' . random_int(0, 255) . '.1';
    $post = static fn (string $token): int => $kernel->handle(new Request(
        'POST', '/newsletter/one-click', ['token' => $token],
        ['REMOTE_ADDR' => $ip, 'HTTP_ORIGIN' => 'https://mail.google.com', 'CONTENT_TYPE' => 'application/x-www-form-urlencoded'],
        'List-Unsubscribe=One-Click'
    ))->status;

    SettingsService::update(['maintenance_mode' => true], (int) newsAdmin()['id']);
    try {
        assertSame(200, $post($s['token']));
    } finally {
        SettingsService::update(['maintenance_mode' => false], (int) newsAdmin()['id']);
    }
    assertSame('unsubscribed', Database::value('SELECT status FROM newsletter_subscribers WHERE id = ?', [$s['id']]));
    assertSame(200, $post($s['token']), 'pressing it twice is fine');
    assertSame(404, $post(str_repeat('0', 32)));
    assertSame(404, $post('not-a-token'));

    // After a newsletter, many readers of one provider unsubscribe within the hour: none is refused.
    for ($i = 0; $i < 70; $i++) {
        assertSame(200, $post(newsSubscriber()['token']), "unsubscribe $i from the shared IP");
    }
});

test('one-click unsubscribe: repeats of one token are limited', function () {
    useTestDatabase();
    $s = newsSubscriber();
    $router = new Router();
    (require dirname(__DIR__) . '/routes.php')($router);
    $kernel = new Kernel($router);
    $kernel->setUserResolver(static fn (): ?array => null);
    $codes = [];
    for ($i = 0; $i < 11; $i++) {
        $codes[] = $kernel->handle(new Request('POST', '/newsletter/one-click', ['token' => $s['token']], ['REMOTE_ADDR' => "10.8.0.$i"], ''))->status;
    }
    assertSame(array_merge(array_fill(0, 10, 200), [429]), $codes);
});
