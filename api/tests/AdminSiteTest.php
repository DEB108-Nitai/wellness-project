<?php
declare(strict_types=1);

use Transenigma\Controllers\AdminSiteController;
use Transenigma\Core\Database;
use Transenigma\Core\HttpException;
use Transenigma\Core\Request;
use Transenigma\Repositories\UserRepository;
use Transenigma\Services\AdminSiteService;
use Transenigma\Services\SiteService;

/** Phase 5 slice H: messages, subscribers, FAQs, audit log, question set and norms (ADM-3, 5, 7, 9, 10). */

function siteAdmin(): array
{
    static $admin = null;
    if ($admin === null) {
        $admin = UserRepository::find(UserRepository::create('Site Admin', uniqueEmail(), null, null, true, 'admin'));
    }
    return $admin;
}

function adminGet(string $path, array $query = []): Request
{
    return new Request('GET', $path, $query, ['REMOTE_ADDR' => '10.0.0.8'], '');
}

/** Run a streaming export and parse what it printed. */
function captureCsv(callable $fn): array
{
    ob_start();
    $fn();
    $csv = (string) ob_get_clean();
    $lines = array_filter(preg_split('/\r?\n/', preg_replace('/^\xEF\xBB\xBF/', '', $csv)), static fn ($l) => $l !== '');
    return array_map(static fn ($l) => str_getcsv($l, ',', '"', ''), array_values($lines));
}

test('messages: list, search, open, mark handled and back, export is audited and formula-safe', function () {
    useTestDatabase();
    $tag = 'msg' . bin2hex(random_bytes(3));
    $id = Database::insert(
        'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)',
        ['=HYPERLINK("x")', "$tag@example.com", "Question $tag", 'I would like to know more about the 60-day programs.']
    );
    $list = AdminSiteService::messages(['q' => $tag], 1, 25);
    assertSame(1, $list['total']);
    assertSame('new', $list['items'][0]['status']);
    assertTrue($list['counts']['new'] >= 1);

    $handled = AdminSiteService::setMessageStatus($id, 'handled', siteAdmin(), authReq());
    assertSame(['handled', 'Site Admin'], [$handled['status'], $handled['handledBy']]);
    assertTrue($handled['handledAt'] !== null);
    assertSame(0, AdminSiteService::messages(['q' => $tag, 'status' => 'new'], 1, 25)['total'], 'filter by status');
    $reopened = AdminSiteService::setMessageStatus($id, 'new', siteAdmin(), authReq());
    assertSame([null, null], [$reopened['handledAt'], $reopened['handledBy']]);
    $actions = array_column(Database::all("SELECT action FROM audit_logs WHERE entity_type = 'contact_message' AND entity_id = ?", [(string) $id]), 'action');
    assertSame(['MESSAGE_HANDLED', 'MESSAGE_REOPENED'], $actions);

    $rows = captureCsv(fn () => AdminSiteService::exportMessages(['q' => $tag]));
    assertSame('Received (UTC)', $rows[0][0]);
    assertSame("'=HYPERLINK(\"x\")", $rows[1][2], 'formula neutralised');

    $_SESSION = ['auth_uid' => (int) siteAdmin()['id'], 'auth_ver' => (int) siteAdmin()['session_version'], 'auth_seen' => time()];
    markSecondStepPassed();
    ob_start();
    (new AdminSiteController())->exportMessages(adminGet('/admin/export/messages', ['q' => $tag]));
    ob_end_clean();
    assertTrue(Database::value("SELECT 1 FROM audit_logs WHERE action = 'EXPORT_MESSAGES' AND actor_user_id = ?", [siteAdmin()['id']]) !== null, 'export audited');
    assertSame(404, assertThrows(HttpException::class, fn () => AdminSiteService::message(99999999))->status);
});

test('subscribers: counts, search, and the export never contains unsubscribe tokens', function () {
    useTestDatabase();
    $email = 'news' . bin2hex(random_bytes(3)) . '@example.com';
    SiteService::subscribe($email, authReq());
    $list = AdminSiteService::subscribers(['q' => $email], 1, 25);
    assertSame(1, $list['total']);
    assertSame('subscribed', $list['items'][0]['status']);
    assertTrue(!array_key_exists('unsubscribeToken', $list['items'][0]) && !str_contains(json_encode($list), 'token'));
    $token = Database::value('SELECT unsubscribe_token FROM newsletter_subscribers WHERE email = ?', [$email]);
    $rows = captureCsv(fn () => AdminSiteService::exportSubscribers(['q' => $email]));
    assertSame(['Email', 'Status', 'Subscribed (UTC)', 'Unsubscribed (UTC)'], $rows[0]);
    assertSame($email, $rows[1][0]);
    assertTrue(!str_contains(json_encode($rows), (string) $token));
});

test('FAQs: create, edit, unpublish (hidden from the site), reorder, delete; all audited', function () {
    useTestDatabase();
    $faq = AdminSiteService::createFaq(['category' => 'Assessment', 'question' => 'Can I retake the test later?', 'answer' => 'Yes, any time from your account.'], siteAdmin(), authReq());
    try {
        $public = array_column(SiteService::faqs(), 'question');
        assertSame('Can I retake the test later?', end($public), 'published, last');
        AdminSiteService::updateFaq($faq['id'], ['published' => false, 'answer' => 'Yes, from your account page.'], siteAdmin(), authReq());
        assertTrue(!in_array('Can I retake the test later?', array_column(SiteService::faqs(), 'question'), true), 'hidden on the site');

        $ids = array_column(AdminSiteService::faqs(), 'id');
        $moved = array_merge([$faq['id']], array_values(array_diff($ids, [$faq['id']])));
        assertSame($faq['id'], AdminSiteService::reorderFaqs($moved, siteAdmin(), authReq())[0]['id'], 'moved to the top');
        $e = assertThrows(HttpException::class, fn () => AdminSiteService::reorderFaqs(array_slice($moved, 1), siteAdmin(), authReq()));
        assertSame('FAQ_LIST_CHANGED', $e->errorCode, 'a list missing one FAQ is refused');
    } finally {
        AdminSiteService::deleteFaq($faq['id'], siteAdmin(), authReq());
    }
    assertSame(null, Database::value('SELECT id FROM faqs WHERE id = ?', [$faq['id']]));
    $actions = array_column(Database::all("SELECT action FROM audit_logs WHERE actor_user_id = ? AND action LIKE 'FAQ_%' ORDER BY id", [siteAdmin()['id']]), 'action');
    foreach (['FAQ_CREATED', 'FAQ_UPDATED', 'FAQ_REORDERED', 'FAQ_DELETED'] as $a) {
        assertTrue(in_array($a, $actions, true), "$a audited");
    }
    // Restore the seeded order for other tests.
    AdminSiteService::reorderFaqs(array_column(Database::all('SELECT id FROM faqs ORDER BY id'), 'id'), siteAdmin(), authReq());
});

test('FAQ input is validated by the controller', function () {
    useTestDatabase();
    $_SESSION = ['auth_uid' => (int) siteAdmin()['id'], 'auth_ver' => (int) siteAdmin()['session_version'], 'auth_seen' => time()];
    markSecondStepPassed();
    $c = new AdminSiteController();
    $json = fn (array $b) => new Request('POST', '/admin/faqs', [], ['REMOTE_ADDR' => '10.0.0.8', 'CONTENT_TYPE' => 'application/json'], json_encode($b));
    $e = assertThrows(HttpException::class, fn () => $c->createFaq($json(['category' => 'A', 'question' => 'Hi?', 'answer' => ''])));
    assertSame(['category', 'question', 'answer'], array_keys($e->fields));
    foreach ([[], ['ids' => 'x'], ['ids' => [1, 1]], ['ids' => [0]], ['ids' => ['1']]] as $bad) {
        assertSame(['ids'], array_keys(assertThrows(HttpException::class, fn () => $c->reorderFaqs($json($bad)))->fields));
    }
});

test('audit log: filters by action, actor and date; newest first; read-only', function () {
    useTestDatabase();
    $admin = siteAdmin();
    \Transenigma\Services\AuditService::forUser($admin, 'SETTINGS_UPDATED', 'settings', null, ['keys' => ['site_name']], authReq());
    $page = AdminSiteService::audit(['action' => 'SETTINGS_UPDATED', 'actor' => $admin['email']], 1, 50);
    assertTrue($page['total'] >= 1);
    assertSame(['Site Admin', 'admin'], [$page['items'][0]['actor']['name'], $page['items'][0]['actorType']]);
    assertSame(['keys' => ['site_name']], $page['items'][0]['details']);
    assertTrue(in_array('SETTINGS_UPDATED', $page['actions'], true));
    assertSame(0, AdminSiteService::audit(['action' => 'SETTINGS_UPDATED', 'actor' => $admin['email'], 'to' => '2020-01-01'], 1, 50)['total']);

    $router = new \Transenigma\Core\Router();
    (require dirname(__DIR__) . '/routes.php')($router);
    $auditRoutes = array_filter($router->routes(), static fn (array $r): bool => str_contains($r['pattern'], '/admin/audit'));
    assertSame(['GET'], array_values(array_unique(array_column($auditRoutes, 'method'))), 'no way to change the audit log');
});

test('question set and norms: the active 166 items with their keys and the norm table', function () {
    useTestDatabase();
    $items = AdminSiteService::items();
    assertSame(166, count($items['items']));
    assertSame(3, count(array_filter($items['items'], fn ($i) => $i['attentionCheck'])));
    $scored = array_values(array_filter($items['items'], fn ($i) => !$i['attentionCheck']));
    assertTrue($scored[0]['factor'] !== null && in_array($scored[0]['keyed'], ['+', '-'], true) && $scored[0]['factorName'] !== null);
    $norms = AdminSiteService::norms();
    assertSame(16, count($norms['factors']));
    assertSame(5, count($norms['domains']));
    assertTrue($norms['normSet']['sampleSize'] > 1000);
    assertSame('table', $norms['normSet']['stenMethod'], 'the active norm set reads stens from the real distribution');
});

test('slice H routes are admin-only', function () {
    useTestDatabase();
    $member = ['id' => 999999, 'role' => 'user', 'email' => 'member@example.com'];
    foreach (['/admin/messages', '/admin/messages/1', '/admin/subscribers', '/admin/faqs', '/admin/audit', '/admin/items', '/admin/norms', '/admin/export/messages', '/admin/export/subscribers'] as $path) {
        $router = new \Transenigma\Core\Router();
        (require dirname(__DIR__) . '/routes.php')($router);
        $kernel = new \Transenigma\Core\Kernel($router);
        $kernel->setUserResolver(static fn (): ?array => $member);
        assertSame(403, $kernel->handle(adminGet($path))->status, "member blocked from $path");
    }
});
