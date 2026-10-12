<?php
declare(strict_types=1);

use Transenigma\Controllers\AdminParticipantsController;
use Transenigma\Core\Database;
use Transenigma\Core\HttpException;
use Transenigma\Core\Request;
use Transenigma\Services\AdminParticipantsService;
use Transenigma\Services\AssessmentService;
use Transenigma\Services\AuthService;

/** Phase 5 slice C: assessments and results against people's names (ADM-2, ADM-3). */

test('admins find assessments by account name or email, and guests by nickname, with status, flags and top traits', function () {
    useTestDatabase();
    // A signed-in person who finishes the test.
    asGuest();
    $user = signUpUser('Meera Iyer');
    $mine = AssessmentService::start(demographics(['nickname' => 'Meera']), testRequest());
    answerAll(sessionRow($mine['ref']));
    AssessmentService::submit(sessionRow($mine['ref']), testRequest());
    // A guest who stops halfway.
    asGuest();
    $guest = AssessmentService::start(demographics(['nickname' => 'Quiet Walker ' . bin2hex(random_bytes(2)), 'country' => 'GB']), testRequest());
    answerFirst(sessionRow($guest['ref']), 20);

    $byEmail = AdminParticipantsService::search(['q' => $user['email']], 1, 25);
    assertSame(1, $byEmail['total']);
    $row = $byEmail['items'][0];
    assertSame($mine['ref'], $row['ref']);
    assertSame('Meera Iyer', $row['person']['name']);
    assertSame($user['email'], $row['person']['email']);
    assertSame('completed', $row['status']);
    assertSame(166, $row['answeredCount']);
    assertSame(false, $row['flagged']);
    assertTrue(count($row['topTraits']) <= 3);
    assertSame(1, AdminParticipantsService::search(['q' => 'Meera Iyer'], 1, 25)['total'], 'by account name');
    assertSame(1, AdminParticipantsService::search(['q' => $mine['ref']], 1, 25)['total'], 'by reference');

    $byNick = AdminParticipantsService::search(['q' => sessionRow($guest['ref'])['nickname']], 1, 25);
    assertSame(1, $byNick['total']);
    assertSame(null, $byNick['items'][0]['person'], 'a guest has no account details');
    assertSame('in_progress', $byNick['items'][0]['status']);
    assertSame(20, $byNick['items'][0]['answeredCount']);

    // Filters.
    assertSame(0, AdminParticipantsService::search(['q' => $user['email'], 'account' => 'guest'], 1, 25)['total']);
    assertSame(1, AdminParticipantsService::search(['q' => $user['email'], 'status' => 'completed', 'flagged' => false, 'country' => 'IN'], 1, 25)['total']);
    assertSame(0, AdminParticipantsService::search(['q' => $user['email'], 'flagged' => true], 1, 25)['total']);
    $today = gmdate('Y-m-d');
    $s = AdminParticipantsService::search(['q' => $user['email'], 'from' => $today, 'to' => $today], 1, 25);
    assertSame(1, $s['total']);
    assertSame([['day' => $today, 'started' => 1, 'completed' => 1]], $s['byDay']);
    assertSame(1, $s['byStatus']['completed']);
});

test('the admin detail shows demographics, quality, all scores and every answer with failed attention checks marked', function () {
    useTestDatabase();
    asGuest();
    signUpUser('Detail Person');
    $state = AssessmentService::start(demographics(['nickname' => 'Dee', 'occupation' => 'Teacher']), testRequest());
    $session = sessionRow($state['ref']);
    // Fail one attention check on purpose.
    $check = array_values(array_filter(\Transenigma\Repositories\PsychometricRepository::items($session['item_set_version']), fn ($i) => $i['is_attention_check']))[0];
    answerAll($session, $check['id']);
    $wrong = $check['expected_answer'] === 1 ? 5 : 1;
    AssessmentService::saveAnswers(sessionRow($state['ref']), [$check['id'] => $wrong], 1, 10, testRequest());
    AssessmentService::submit(sessionRow($state['ref']), testRequest());

    $d = AdminParticipantsService::detail($state['ref']);
    assertSame('Detail Person', $d['person']['name']);
    assertSame('Teacher', $d['demographics']['occupation']);
    assertSame('female', $d['demographics']['gender']);
    assertSame(166, count($d['items']));
    $failed = array_values(array_filter($d['items'], fn ($i) => $i['attentionFailed']));
    assertSame(1, count($failed));
    assertSame($check['item_code'], $failed[0]['code']);
    assertSame(16, count($d['report']['factors']));
    assertSame(5, count($d['report']['domains']));
    assertTrue(is_array($d['quality']) && $d['quality']['attentionChecksFailed'] === 1);

    assertTrue(!array_key_exists('shareToken', $d['report']), "the owner's share link is not sent to admins");

    // An anonymised account shows neither name nor email.
    Database::run('UPDATE users SET anonymized_at = UTC_TIMESTAMP() WHERE id = ?', [$d['person']['userId']]);
    $anon = AdminParticipantsService::detail($state['ref'])['person'];
    assertSame(['Anonymised account', null, true], [$anon['name'], $anon['email'], $anon['anonymised']]);

    assertSame(404, assertThrows(HttpException::class, fn () => AdminParticipantsService::detail('TE-ZZZZZZ'))->status);
});

test('the research export has one row per assessment with stens, optional answers, and is audited', function () {
    useTestDatabase();
    asGuest();
    $user = signUpUser('=Export Person');
    $state = AssessmentService::start(demographics(), testRequest());
    answerAll(sessionRow($state['ref']));
    AssessmentService::submit(sessionRow($state['ref']), testRequest());

    $parse = static function (string $csv): array {
        $fh = fopen('php://memory', 'r+');
        fwrite($fh, substr($csv, 3));
        rewind($fh);
        $rows = [];
        while (($r = fgetcsv($fh, null, ',', '"', '')) !== false) {
            $rows[] = $r;
        }
        return $rows;
    };
    ob_start();
    AdminParticipantsService::exportCsv(['q' => $user['email']], false);
    $rows = $parse((string) ob_get_clean());
    assertSame(2, count($rows));
    assertSame(16 + 16 + 5, count($rows[0]));
    assertSame(\Transenigma\Repositories\PsychometricRepository::activeItemSetVersion(), $rows[1][array_search('Item set', $rows[0], true)]);
    assertSame($state['ref'], $rows[1][0]);
    assertSame("'=Export Person", $rows[1][2], 'formula neutralised');
    assertTrue(in_array('Sten A', $rows[0], true) && $rows[1][array_search('Sten A', $rows[0], true)] !== '');

    ob_start();
    AdminParticipantsService::exportCsv(['q' => $user['email']], true);
    $rows = $parse((string) ob_get_clean());
    assertSame(16 + 16 + 5 + 166, count($rows[0]));
    assertTrue($rows[1][count($rows[1]) - 1] !== '', 'answers filled, matched by item code');
    assertSame(count($rows[0]), count($rows[1]));

    // Through the controller: audited, with the filters used.
    $id = (int) Database::value('SELECT id FROM users WHERE email = ?', [$user['email']]);
    Database::run("UPDATE users SET role = 'admin' WHERE id = ?", [$id]);
    $_SESSION['auth_seen'] = time();
    AuthService::flush();
    ob_start();
    (new AdminParticipantsController())->exportSessions(new Request('GET', '/admin/export/sessions', ['q' => $user['email'], 'answers' => '1'], ['REMOTE_ADDR' => '10.0.0.5'], ''));
    ob_end_clean();
    $audit = Database::one("SELECT details FROM audit_logs WHERE action = 'EXPORT_SESSIONS' AND actor_user_id = ? ORDER BY id DESC LIMIT 1", [$id]);
    assertTrue($audit !== null && str_contains($audit['details'], '"answers":true'));
});

test('participant routes are admin-only and reject bad filters', function () {
    useTestDatabase();
    $member = ['id' => 999999, 'role' => 'user', 'email' => 'member@example.com'];
    foreach (['/admin/sessions', '/admin/sessions/TE-ABCDEF', '/admin/export/sessions'] as $path) {
        assertSame(401, getAs(null, $path), "guest blocked from $path");
        assertSame(403, getAs($member, $path), "non-admin blocked from $path");
    }
    $c = new AdminParticipantsController();
    foreach ([['from' => '2026-13-01'], ['country' => 'india'], ['status' => 'deleted'], ['from' => '2026-10-10', 'to' => '2026-10-01']] as $q) {
        $e = assertThrows(HttpException::class, fn () => $c->sessions(new Request('GET', '/admin/sessions', $q, ['REMOTE_ADDR' => '10.0.0.5'], '')));
        assertSame(422, $e->status, json_encode($q));
    }
});
