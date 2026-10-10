<?php
declare(strict_types=1);

use Transenigma\Controllers\AssessmentController;
use Transenigma\Core\Cookies;
use Transenigma\Core\Database;
use Transenigma\Core\HttpException;
use Transenigma\Core\Request;
use Transenigma\Repositories\PsychometricRepository;
use Transenigma\Repositories\UserRepository;
use Transenigma\Services\AssessmentService;
use Transenigma\Services\AuthService;
use Transenigma\Services\ResultsService;

// ------------------------------------------------------------------ helpers
function asGuest(): void
{
    $_SESSION = [];
    Cookies::$jar = [];
    AuthService::flush();
}

function testRequest(): Request
{
    return new Request('POST', '/test', [], ['REMOTE_ADDR' => '10.20.' . random_int(0, 255) . '.' . random_int(1, 254)], '', Cookies::$jar);
}

function demographics(array $overrides = []): array
{
    return $overrides + ['country' => 'IN', 'age' => 30, 'gender' => 'female', 'nickname' => 'Asha'];
}

/** Answer every item (attention checks correctly) in batches like the browser does. */
function answerAll(array $session, ?int $skip = null): void
{
    $items = PsychometricRepository::items($session['item_set_version']);
    $batch = [];
    $i = 0;
    foreach ($items as $id => $item) {
        if ($id === $skip) {
            continue;
        }
        $batch[$id] = $item['is_attention_check'] ? $item['expected_answer'] : ($i++ % 5) + 1;
        if (count($batch) === 7) {
            AssessmentService::saveAnswers($session, $batch, 1, 60, testRequest());
            $batch = [];
        }
    }
    if ($batch) {
        AssessmentService::saveAnswers($session, $batch, 1, 60, testRequest());
    }
}

function sessionRow(string $ref): array
{
    return Database::one('SELECT * FROM test_sessions WHERE public_ref = ?', [$ref]);
}

function signUpUser(string $name = 'Results Owner'): array
{
    captureMail();
    return AuthService::register($name, uniqueEmail(), GOOD_PASSWORD, testRequest());
}

// ------------------------------------------------------------------ tests
test('a guest can start, gets an HttpOnly guest cookie, and resumes the same session', function () {
    useTestDatabase();
    asGuest();
    $state = AssessmentService::start(demographics(), testRequest());
    assertTrue((bool) preg_match('/^TE-[2-9A-HJ-NP-Z]{6}$/', $state['ref']));
    assertTrue(isset(Cookies::$jar[AssessmentService::GUEST_COOKIE]), 'guest cookie not set');
    assertSame(166, $state['totalItems']);

    $row = sessionRow($state['ref']);
    assertSame(null, $row['user_id']);
    assertSame(hash('sha256', Cookies::$jar[AssessmentService::GUEST_COOKIE]), $row['guest_token_hash'], 'only the hash is stored');

    $active = AssessmentService::active(AssessmentService::owner(testRequest()));
    assertSame($state['ref'], $active['public_ref']);

    // A second start while one is in progress is refused (TEST-4).
    $e = assertThrows(HttpException::class, fn () => AssessmentService::start(demographics(), testRequest()));
    assertSame('SESSION_EXISTS', $e->errorCode);

    // Another browser (no cookie) cannot see it.
    $stranger = AssessmentService::owner(new Request('GET', '/x', [], ['REMOTE_ADDR' => '10.0.0.9'], ''));
    $stranger['guestHash'] = null;
    assertSame(null, AssessmentService::active($stranger));
});

test('minimum age 18 and self-described gender are enforced', function () {
    useTestDatabase();
    asGuest();
    assertSame(422, assertThrows(HttpException::class, fn () => AssessmentService::start(demographics(['age' => 17]), testRequest()))->status);
    assertSame(422, assertThrows(HttpException::class, fn () => AssessmentService::start(demographics(['gender' => 'self_describe']), testRequest()))->status);
});

test('autosave validates items and values, upserts answers and accumulates real time', function () {
    useTestDatabase();
    asGuest();
    $state = AssessmentService::start(demographics(), testRequest());
    $session = sessionRow($state['ref']);
    $ids = array_keys(PsychometricRepository::items($session['item_set_version']));

    $r = AssessmentService::saveAnswers($session, [$ids[0] => 4, $ids[1] => 2], 1, 45, testRequest());
    assertSame(2, $r['answeredCount']);
    AssessmentService::saveAnswers($session, [$ids[0] => 5], 2, 30, testRequest()); // change an answer
    assertSame(5, (int) Database::value('SELECT value FROM session_answers WHERE session_id = ? AND item_id = ?', [$session['id'], $ids[0]]));
    $row = sessionRow($state['ref']);
    assertSame(75, (int) $row['active_seconds']);
    assertSame(2, (int) $row['current_page']);

    assertSame(422, assertThrows(HttpException::class, fn () => AssessmentService::saveAnswers($session, [$ids[0] => 6], 1, 0, testRequest()))->status);
    assertSame(422, assertThrows(HttpException::class, fn () => AssessmentService::saveAnswers($session, [999999 => 3], 1, 0, testRequest()))->status);
    assertSame(422, assertThrows(HttpException::class, fn () => AssessmentService::saveAnswers($session, [$ids[0] => '3'], 1, 0, testRequest()))->status);

    // Idle time is capped per save.
    AssessmentService::saveAnswers($session, [], 2, 99999, testRequest());
    assertSame(75 + 900, (int) sessionRow($state['ref'])['active_seconds']);
});

test('submitting with any statement unanswered is rejected (fault 8)', function () {
    useTestDatabase();
    asGuest();
    $state = AssessmentService::start(demographics(), testRequest());
    $session = sessionRow($state['ref']);
    $last = array_key_last(PsychometricRepository::items($session['item_set_version']));
    answerAll($session, $last);

    $e = assertThrows(HttpException::class, fn () => AssessmentService::submit(sessionRow($state['ref']), testRequest()));
    assertSame('INCOMPLETE', $e->errorCode);
    assertSame('1', $e->fields['missingCount']);
    assertSame('in_progress', sessionRow($state['ref'])['status']);
});

test('guest submits, results stay locked until sign-up, then the session follows the new account', function () {
    useTestDatabase();
    asGuest();
    $state = AssessmentService::start(demographics(), testRequest());
    answerAll(sessionRow($state['ref']));
    $result = AssessmentService::submit(sessionRow($state['ref']), testRequest());
    assertSame('completed', $result['status']);
    assertSame(16, (int) Database::value('SELECT COUNT(*) FROM session_factor_scores WHERE session_id = ?', [sessionRow($state['ref'])['id']]));
    assertSame(5, (int) Database::value('SELECT COUNT(*) FROM session_domain_scores WHERE session_id = ?', [sessionRow($state['ref'])['id']]));

    // Submitting again is idempotent.
    assertSame('completed', AssessmentService::submit(sessionRow($state['ref']), testRequest())['status']);

    // Guest: locked.
    assertSame('RESULTS_LOCKED', assertThrows(HttpException::class, fn () => ResultsService::forViewer($state['ref'], null))->errorCode);

    // Sign up in the same browser → the session is claimed and the report is visible.
    $user = signUpUser();
    assertSame((int) $user['id'], (int) sessionRow($state['ref'])['user_id']);
    assertSame(null, sessionRow($state['ref'])['guest_token_hash']);
    assertTrue(!isset(Cookies::$jar[AssessmentService::GUEST_COOKIE]), 'guest cookie must be cleared after claiming');

    $report = ResultsService::forViewer($state['ref'], AuthService::user());
    assertSame(16, count($report['factors']));
    assertSame(5, count($report['domains']));
    assertSame(true, $report['isOwner']);
    assertSame('A', $report['factors'][0]['factorCode']);
    assertSame('Q4', $report['factors'][15]['factorCode']);
    assertTrue(in_array($report['factors'][0]['band'], ['low', 'average', 'high'], true));
    assertTrue($report['factors'][0]['interpretation'] !== '');
    assertSame('IN', $report['country']);
});

test('nobody else can resume, read or change an in-progress draft (account or guest)', function () {
    useTestDatabase();
    // An account's draft.
    asGuest();
    signUpUser('Draft Owner');
    $acct = AssessmentService::start(demographics(), testRequest());
    $acctRow = sessionRow($acct['ref']);
    // A guest's draft, owned only through its private HttpOnly cookie.
    asGuest();
    $guest = AssessmentService::start(demographics(), testRequest());
    $guestRow = sessionRow($guest['ref']);
    $firstItem = array_key_first(PsychometricRepository::items($acctRow['item_set_version']));

    // Another visitor in a fresh browser and another signed-in account.
    foreach (['a new guest' => fn () => asGuest(), 'another account' => function () { asGuest(); signUpUser('Someone Else'); }] as $who => $become) {
        $become();
        $me = AssessmentService::owner(testRequest());
        assertSame(null, AssessmentService::active($me), "$who has no draft to resume");
        foreach ([$acctRow, $guestRow] as $row) {
            assertSame(false, AssessmentService::owns($row, $me), "$who does not own {$row['public_ref']}");
            assertSame(404, assertThrows(HttpException::class, fn () => AssessmentService::findOwnedByRef($row['public_ref'], $me))->status, "$who gets 404 for {$row['public_ref']}");
        }
        // The real autosave endpoint takes no draft reference: it only ever writes to the caller's own draft.
        $write = new Request('PUT', '/test/session/answers', [], ['REMOTE_ADDR' => '10.20.30.40', 'CONTENT_TYPE' => 'application/json'],
            json_encode(['page' => 1, 'answers' => [$firstItem => 1]], JSON_THROW_ON_ERROR), Cookies::$jar);
        assertSame(404, assertThrows(HttpException::class, fn () => (new AssessmentController())->saveAnswers($write))->status, "$who cannot autosave answers");
    }
    // The drafts are untouched.
    assertSame(0, (int) Database::one('SELECT COUNT(*) AS n FROM session_answers WHERE session_id IN (?, ?)', [$acctRow['id'], $guestRow['id']])['n']);
});

test('a second tab with an old copy of the session cannot change a submitted or abandoned test', function () {
    useTestDatabase();
    asGuest();
    signUpUser('Two Tabs');
    $state = AssessmentService::start(demographics(), testRequest());
    $staleTab = sessionRow($state['ref']);               // tab B loaded the session while it was in progress
    answerAll(sessionRow($state['ref']));
    AssessmentService::submit(sessionRow($state['ref']), testRequest()); // tab A submits
    $answers = Database::all('SELECT item_id, value FROM session_answers WHERE session_id = ? ORDER BY item_id', [$staleTab['id']]);

    // Tab B autosaves with its old copy: refused, answers unchanged.
    $firstItem = (int) $answers[0]['item_id'];
    $e = assertThrows(HttpException::class, fn () => AssessmentService::saveAnswers($staleTab, [$firstItem => ((int) $answers[0]['value'] % 5) + 1], 1, 10, testRequest()));
    assertSame('SESSION_CLOSED', $e->errorCode);
    assertSame($answers, Database::all('SELECT item_id, value FROM session_answers WHERE session_id = ? ORDER BY item_id', [$staleTab['id']]));

    // Tab B clicks "start over" with its old copy: the completed test stays completed.
    AssessmentService::abandon($staleTab, testRequest());
    assertSame('completed', sessionRow($state['ref'])['status']);

    // And the reverse: a test abandoned in one tab can't be submitted from another.
    $state2 = AssessmentService::start(demographics(), testRequest());
    $stale2 = sessionRow($state2['ref']);
    answerAll($stale2);
    AssessmentService::abandon(sessionRow($state2['ref']), testRequest());
    assertSame('SESSION_CLOSED', assertThrows(HttpException::class, fn () => AssessmentService::submit($stale2, testRequest()))->errorCode);
    assertSame('abandoned', sessionRow($state2['ref'])['status']);
    assertSame(0, (int) Database::value('SELECT COUNT(*) FROM session_factor_scores WHERE session_id = ?', [$stale2['id']]));
});

test('another user cannot see the report (fault 4) but an admin can', function () {
    useTestDatabase();
    asGuest();
    $owner = signUpUser('Owner');
    $state = AssessmentService::start(demographics(), testRequest());
    answerAll(sessionRow($state['ref']));
    AssessmentService::submit(sessionRow($state['ref']), testRequest());

    asGuest();
    $other = signUpUser('Someone Else');
    assertSame(404, assertThrows(HttpException::class, fn () => ResultsService::forViewer($state['ref'], AuthService::user()))->status);
    assertSame(404, assertThrows(HttpException::class, fn () => AssessmentService::findOwnedByRef($state['ref'], AssessmentService::owner(testRequest())))->status);

    UserRepository::setRole((int) $other['id'], 'admin');
    AuthService::flush();
    $report = ResultsService::forViewer($state['ref'], AuthService::user());
    assertSame(false, $report['isOwner']);
    assertSame(16, count($report['factors']));
});

test('share links can be enabled and revoked, and hide private details', function () {
    useTestDatabase();
    asGuest();
    signUpUser();
    $state = AssessmentService::start(demographics(), testRequest());
    answerAll(sessionRow($state['ref']));
    AssessmentService::submit(sessionRow($state['ref']), testRequest());

    $token = ResultsService::enableShare(sessionRow($state['ref']));
    assertSame(32, strlen($token));
    assertSame($token, ResultsService::enableShare(sessionRow($state['ref'])), 'enabling twice keeps the same link');
    $shared = ResultsService::shared($token);
    assertSame(16, count($shared['factors']));
    assertTrue(!array_key_exists('age', $shared) && !array_key_exists('country', $shared) && !array_key_exists('shareToken', $shared));

    ResultsService::disableShare(sessionRow($state['ref']));
    assertSame(404, assertThrows(HttpException::class, fn () => ResultsService::shared($token))->status);
});

test('history lists in-progress and completed sessions, never abandoned ones', function () {
    useTestDatabase();
    asGuest();
    $user = signUpUser();
    $first = AssessmentService::start(demographics(), testRequest());
    AssessmentService::abandon(sessionRow($first['ref']), testRequest()); // start over
    assertSame('abandoned', sessionRow($first['ref'])['status'], 'start-over must keep the data');

    $second = AssessmentService::start(demographics(), testRequest());
    answerAll(sessionRow($second['ref']));
    AssessmentService::submit(sessionRow($second['ref']), testRequest());
    $third = AssessmentService::start(demographics(), testRequest()); // retake

    $history = ResultsService::history((int) $user['id']);
    assertSame([$third['ref'], $second['ref']], array_column($history, 'ref'));
    assertSame('completed', $history[1]['status']);
    assertSame(166, $history[1]['answeredCount']);
});

test('a guest session started before signing in to an account with its own draft keeps only the most recent', function () {
    useTestDatabase();
    asGuest();
    $user = signUpUser();
    $accountDraft = AssessmentService::start(demographics(), testRequest());
    Database::run('UPDATE test_sessions SET last_activity_at = UTC_TIMESTAMP() - INTERVAL 1 DAY WHERE public_ref = ?', [$accountDraft['ref']]);

    asGuest(); // same person, signed out, starts again as a guest
    $guestDraft = AssessmentService::start(demographics(), testRequest());
    AuthService::attempt($user['email'], GOOD_PASSWORD, testRequest());

    assertSame('abandoned', sessionRow($accountDraft['ref'])['status']);
    assertSame('in_progress', sessionRow($guestDraft['ref'])['status']);
    assertSame((int) $user['id'], (int) sessionRow($guestDraft['ref'])['user_id']);
});

test('experience rating: once per completed session', function () {
    useTestDatabase();
    asGuest();
    $state = AssessmentService::start(demographics(), testRequest());
    assertSame('NOT_COMPLETED', assertThrows(HttpException::class, fn () => AssessmentService::review(sessionRow($state['ref']), 5, null))->errorCode);
    answerAll(sessionRow($state['ref']));
    AssessmentService::submit(sessionRow($state['ref']), testRequest());
    AssessmentService::review(sessionRow($state['ref']), 4, 'Insightful');
    assertSame('ALREADY_REVIEWED', assertThrows(HttpException::class, fn () => AssessmentService::review(sessionRow($state['ref']), 5, null))->errorCode);
});

test('sessions inactive for 30 days expire', function () {
    useTestDatabase();
    asGuest();
    $state = AssessmentService::start(demographics(), testRequest());
    Database::run('UPDATE test_sessions SET last_activity_at = UTC_TIMESTAMP() - INTERVAL 31 DAY WHERE public_ref = ?', [$state['ref']]);
    assertSame(null, AssessmentService::active(AssessmentService::owner(testRequest())));
    assertSame('expired', sessionRow($state['ref'])['status']);
});
