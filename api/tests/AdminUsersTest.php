<?php
declare(strict_types=1);

use Transenigma\Core\Database;
use Transenigma\Core\HttpException;
use Transenigma\Repositories\UserRepository;
use Transenigma\Services\AdminTeamService;
use Transenigma\Services\AdminUsersService;
use Transenigma\Services\AuthService;
use Transenigma\Services\PasswordPolicy;
use Transenigma\Services\SiteService;

/** Phase 5 slices F and F2: user accounts (ADM-6, ADM-11, AUTH-11) and the admin team with one primary admin. */

function member(string $name = 'Member Person', bool $verified = true): array
{
    $id = UserRepository::create($name, uniqueEmail(), PasswordPolicy::hash(GOOD_PASSWORD), null, $verified);
    return UserRepository::find($id);
}

/** An admin who has set up two-step sign-in, with the secret to make codes; optionally the primary admin. */
function teamAdmin(bool $primary = false): array
{
    [$admin, $secret] = signInAdmin();
    if ($primary) {
        AdminTeamService::makePrimaryFromServer((int) $admin['id']);
    }
    return [Database::one('SELECT * FROM users WHERE id = ?', [$admin['id']]), $secret];
}

test('the user list searches by name or email and the detail shows what is filed under the account', function () {
    useTestDatabase();
    captureMail();
    $m = member('Ira Listed');
    $ref = 'TE-LSTRWX'; // the test database is rebuilt on every run
    Database::run(
        "INSERT INTO test_sessions (public_ref, user_id, item_set_version, consent_version, consent_at, country, age, gender, status, nickname)
         VALUES (?, ?, 'ipip16-v1', 'v1', UTC_TIMESTAMP(), 'IN', 30, 'female', 'completed', 'Ira')",
        [$ref, $m['id']]
    );
    Database::run('INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)', ['Ira', $m['email'], 'Hi', 'A question for you.']);
    SiteService::subscribe($m['email'], authReq());

    $page = AdminUsersService::search(['q' => 'Ira Listed'], 1, 25);
    assertSame(1, $page['total']);
    assertSame($m['email'], $page['items'][0]['email']);
    assertTrue(!array_key_exists('password_hash', $page['items'][0]) && !str_contains(json_encode($page), 'totp_secret'));
    $d = AdminUsersService::detail((int) $m['id']);
    assertSame([$ref], array_column($d['tests'], 'ref'));
    assertSame([1, 'subscribed'], [$d['messages'], $d['newsletter']]);
});

test('disable signs the person out at once; nobody disables themselves; other admins are the primary admin\'s business', function () {
    useTestDatabase();
    [$primary] = teamAdmin(true);
    [$other] = teamAdmin();

    // A member signed in on their own device.
    freshSession();
    $m = member();
    AuthService::attempt($m['email'], GOOD_PASSWORD, authReq());
    $device = $_SESSION;

    $row = AdminUsersService::setStatus((int) $m['id'], 'disabled', $primary, authReq());
    assertSame('disabled', $row['status']);
    $_SESSION = $device;
    AuthService::flush();
    assertSame(null, AuthService::user(), 'signed out on the next request');
    assertSame('ACCOUNT_DISABLED', assertThrows(HttpException::class, fn () => AuthService::attempt($m['email'], GOOD_PASSWORD, authReq()))->errorCode);
    AdminUsersService::setStatus((int) $m['id'], 'active', $other, authReq());
    AuthService::attempt($m['email'], GOOD_PASSWORD, authReq());
    assertTrue(AuthService::user() !== null, 'enabled again');

    assertSame('SELF_PROTECTED', assertThrows(HttpException::class, fn () => AdminUsersService::setStatus((int) $other['id'], 'disabled', $other, authReq()))->errorCode);
    assertSame('PRIMARY_ADMIN_ONLY', assertThrows(HttpException::class, fn () => AdminUsersService::setStatus((int) $other['id'], 'disabled', array_merge(member('Not Primary'), ['role' => 'admin']), authReq()))->errorCode);
    assertSame('PRIMARY_PROTECTED', assertThrows(HttpException::class, fn () => AdminUsersService::setStatus((int) $primary['id'], 'disabled', $other, authReq()))->errorCode);
    assertSame('disabled', AdminUsersService::setStatus((int) $other['id'], 'disabled', $primary, authReq())['status'], 'the primary admin may disable another admin');

    $audit = array_column(Database::all("SELECT action FROM audit_logs WHERE entity_type = 'user' AND entity_id = ?", [(string) $m['id']]), 'action');
    assertTrue(in_array('USER_DISABLED', $audit, true) && in_array('USER_ENABLED', $audit, true));
});

test('anonymise removes every personal detail, keeps answers and scores, and cannot sign in again', function () {
    useTestDatabase();
    [$primary] = teamAdmin(true);
    $m = member('Erase Me');
    $email = $m['email'];
    $ref = 'TE-ANNZQX';
    Database::run(
        "INSERT INTO test_sessions (public_ref, user_id, item_set_version, consent_version, consent_at, country, age, gender, status, nickname, occupation, gender_text, share_token)
         VALUES (?, ?, 'ipip16-v1', 'v1', UTC_TIMESTAMP(), 'IN', 31, 'self_describe', 'completed', 'Eri', 'Teacher', 'Own words', ?)",
        [$ref, $m['id'], bin2hex(random_bytes(16))]
    );
    $sid = (int) Database::value('SELECT id FROM test_sessions WHERE public_ref = ?', [$ref]);
    $item = (int) Database::value("SELECT id FROM items WHERE item_set_version = 'ipip16-v1' ORDER BY position LIMIT 1");
    Database::run('INSERT INTO session_answers (session_id, item_id, value) VALUES (?, ?, 4)', [$sid, $item]);
    Database::run("INSERT INTO session_factor_scores (session_id, factor_code, raw_score, z_score, sten, percentile, band) VALUES (?, 'A', 40, 0.5, 6, 60, 'average')", [$sid]);
    Database::run(
        "INSERT INTO challenge_registrations (ref_code, program, user_id, name, email, phone, age, city, country, cohort_timing, struggles, primary_goal, consent_at, admin_notes)
         VALUES ('STI-ANON1', 'STI', ?, 'Erase Me', ?, '+919999999999', 31, 'Kolkata', 'IN', 'morning', '[]', 'Sleep better', UTC_TIMESTAMP(), 'Called her')",
        [$m['id'], $email]
    );
    Database::run('INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)', ['Erase Me', $email, 'Delete my data', 'Please erase my account.']);
    SiteService::subscribe($email, authReq());
    \Transenigma\Services\AuditService::log('AUTH_LOGIN_FAILED', 'guest', null, 'user', $m['id'], ['email' => $email]);

    $e = assertThrows(HttpException::class, fn () => AdminUsersService::anonymise((int) $m['id'], 'someone@example.com', $primary, authReq()));
    assertSame(['confirmEmail'], array_keys($e->fields), 'the email must be typed exactly');
    AdminUsersService::anonymise((int) $m['id'], strtoupper($email), $primary, authReq());

    $u = Database::one('SELECT * FROM users WHERE id = ?', [$m['id']]);
    assertSame([AdminUsersService::ANON_NAME, "anon-{$m['id']}@invalid", null, null, 'disabled'], [$u['name'], $u['email'], $u['password_hash'], $u['google_sub'], $u['status']]);
    assertTrue($u['anonymized_at'] !== null);
    $t = Database::one('SELECT * FROM test_sessions WHERE id = ?', [$sid]);
    assertSame([null, null, null, null], [$t['nickname'], $t['occupation'], $t['gender_text'], $t['share_token']]);
    assertSame([31, 'IN'], [(int) $t['age'], $t['country']], 'research demographics kept');
    assertSame(1, (int) Database::value('SELECT COUNT(*) FROM session_answers WHERE session_id = ?', [$sid]), 'answers kept');
    assertSame(1, (int) Database::value('SELECT COUNT(*) FROM session_factor_scores WHERE session_id = ?', [$sid]), 'scores kept');
    $r = Database::one("SELECT * FROM challenge_registrations WHERE ref_code = 'STI-ANON1'");
    assertSame([AdminUsersService::ANON_NAME, "anon-{$m['id']}@invalid", '', null, null, null], [$r['name'], $r['email'], $r['phone'], $r['city'], $r['primary_goal'], $r['admin_notes']]);
    assertSame(0, (int) Database::value('SELECT COUNT(*) FROM contact_messages WHERE email = ?', [$email]));
    assertSame(0, (int) Database::value('SELECT COUNT(*) FROM newsletter_subscribers WHERE email = ?', [$email]));
    assertSame(0, (int) Database::value('SELECT COUNT(*) FROM audit_logs WHERE details LIKE ?', ['%' . $email . '%']), 'no audit entry still names them');
    $done = Database::one("SELECT details FROM audit_logs WHERE action = 'USER_ANONYMISED' AND entity_id = ?", [(string) $m['id']]);
    assertSame(null, $done['details'], 'the anonymisation itself is recorded without personal data');
    assertSame(null, AdminUsersService::detail((int) $m['id'])['email']);
    assertSame(401, assertThrows(HttpException::class, fn () => AuthService::attempt($email, GOOD_PASSWORD, authReq()))->status, 'cannot sign in');
    assertSame('ACCOUNT_ANONYMISED', assertThrows(HttpException::class, fn () => AdminUsersService::anonymise((int) $m['id'], "anon-{$m['id']}@invalid", $primary, authReq()))->errorCode);
});

test('anonymise refuses admins and your own account', function () {
    useTestDatabase();
    [$primary] = teamAdmin(true);
    [$other] = teamAdmin();
    assertSame('ADMIN_CANNOT_BE_ANONYMISED', assertThrows(HttpException::class, fn () => AdminUsersService::anonymise((int) $other['id'], $other['email'], $primary, authReq()))->errorCode);
    assertSame('PRIMARY_ADMIN_ONLY', assertThrows(HttpException::class, fn () => AdminUsersService::anonymise((int) $other['id'], $other['email'], array_merge(member(), ['role' => 'admin']), authReq()))->errorCode, 'a non-primary admin cannot act on another admin');
    assertSame('SELF_PROTECTED', assertThrows(HttpException::class, fn () => AdminUsersService::anonymise((int) $other['id'], $other['email'], $other, authReq()))->errorCode);
});

// ------------------------------------------------------------------ F2: the admin team

test('only the primary admin adds, removes or hands over admin rights', function () {
    useTestDatabase();
    [$primary] = teamAdmin(true);
    [$other, $otherSecret] = teamAdmin();
    $m = member();
    foreach ([
        fn () => AdminTeamService::add($m['email'], freshCode((int) $other['id'], $otherSecret), $other, authReq()),
        fn () => AdminTeamService::remove((int) $primary['id'], freshCode((int) $other['id'], $otherSecret), $other, authReq()),
        fn () => AdminTeamService::transfer((int) $other['id'], freshCode((int) $other['id'], $otherSecret), $other, authReq()),
    ] as $fn) {
        $e = assertThrows(HttpException::class, $fn);
        assertSame([403, 'PRIMARY_ADMIN_ONLY'], [$e->status, $e->errorCode]);
    }
    $list = AdminTeamService::list($other);
    assertSame(false, $list['youArePrimary']);
    assertSame((int) $primary['id'], $list['admins'][0]['id'], 'primary listed first');
    assertSame(true, $list['admins'][0]['isPrimary']);
});

test('adding an admin: an active verified account, a fresh code, then they sign in again with two-step sign-in', function () {
    useTestDatabase();
    [$primary, $secret] = teamAdmin(true);
    $mail = captureMail();
    $unverified = member('Not Verified', false);
    $e = assertThrows(HttpException::class, fn () => AdminTeamService::add($unverified['email'], freshCode((int) $primary['id'], $secret), $primary, authReq()));
    assertSame(['email'], array_keys($e->fields));
    assertSame(['email'], array_keys(assertThrows(HttpException::class, fn () => AdminTeamService::add('nobody@example.com', '123456', $primary, authReq()))->fields));

    // The new admin is signed in on their own device as a member.
    freshSession();
    $m = member('New Admin');
    AuthService::attempt($m['email'], GOOD_PASSWORD, authReq());
    $device = $_SESSION;
    freshSession();

    assertSame(422, assertThrows(HttpException::class, fn () => AdminTeamService::add($m['email'], '000000', $primary, authReq()))->status, 'needs a correct code');
    $list = AdminTeamService::add($m['email'], freshCode((int) $primary['id'], $secret), $primary, authReq());
    $added = array_values(array_filter($list['admins'], fn ($a) => $a['email'] === $m['email']))[0];
    assertSame(['Test Admin', false, false], [$added['addedBy'], $added['isPrimary'], $added['twoStep']]);
    $_SESSION = $device;
    AuthService::flush();
    assertSame(null, AuthService::user(), 'their old session ends; they sign in again and set up two-step sign-in');
    freshSession();
    AuthService::attempt($m['email'], GOOD_PASSWORD, authReq());
    assertSame('setup', AuthService::sessionPayload()['twoFactor']['step']);

    $subjects = array_column((array) $mail, 'subject');
    assertSame(1, count(array_filter($subjects, fn ($s) => str_starts_with($s, 'You are now an admin'))), 'the new admin is told');
    assertTrue(count(array_filter($subjects, fn ($s) => str_starts_with($s, 'Admin added'))) === 1, 'the primary admin gets a confirmation');
    assertSame(1, (int) Database::value("SELECT COUNT(*) FROM audit_logs WHERE action = 'ADMIN_ADDED' AND entity_id = ?", [(string) $m['id']]));
    assertSame(['email'], array_keys(assertThrows(HttpException::class, fn () => AdminTeamService::add($m['email'], freshCode((int) $primary['id'], $secret), $primary, authReq()))->fields), 'already an admin');
});

test('removing an admin signs them out and forgets their authenticator; the primary admin cannot remove themselves', function () {
    useTestDatabase();
    [$primary, $secret] = teamAdmin(true);
    [$other] = teamAdmin();
    $device = $_SESSION; // signInAdmin() left the other admin signed in here
    captureMail();
    assertSame('PRIMARY_PROTECTED', assertThrows(HttpException::class, fn () => AdminTeamService::remove((int) $primary['id'], freshCode((int) $primary['id'], $secret), $primary, authReq()))->errorCode);

    AdminTeamService::remove((int) $other['id'], freshCode((int) $primary['id'], $secret), $primary, authReq());
    $u = Database::one('SELECT role, totp_secret_enc, admin_added_by FROM users WHERE id = ?', [$other['id']]);
    assertSame(['user', null, null], [$u['role'], $u['totp_secret_enc'], $u['admin_added_by']]);
    assertSame(0, (int) Database::value('SELECT COUNT(*) FROM admin_recovery_codes WHERE user_id = ?', [$other['id']]));
    $_SESSION = $device;
    AuthService::flush();
    assertSame(null, AuthService::user(), 'the removed admin is signed out');
    assertSame(1, (int) Database::value("SELECT COUNT(*) FROM audit_logs WHERE action = 'ADMIN_REMOVED' AND entity_id = ?", [(string) $other['id']]));
});

test('handing over the primary role swaps it atomically, only to an admin with two-step sign-in', function () {
    useTestDatabase();
    [$primary, $secret] = teamAdmin(true);
    [$other] = teamAdmin();
    captureMail();
    Database::run('UPDATE users SET totp_enabled_at = NULL WHERE id = ?', [$other['id']]);
    assertSame('TARGET_NOT_READY', assertThrows(HttpException::class, fn () => AdminTeamService::transfer((int) $other['id'], freshCode((int) $primary['id'], $secret), $primary, authReq()))->errorCode);
    Database::run('UPDATE users SET totp_enabled_at = UTC_TIMESTAMP() WHERE id = ?', [$other['id']]);

    $list = AdminTeamService::transfer((int) $other['id'], freshCode((int) $primary['id'], $secret), $primary, authReq());
    assertSame(false, $list['youArePrimary']);
    assertSame([(int) $other['id']], array_map('intval', array_column(Database::all('SELECT id FROM users WHERE is_primary_admin = 1'), 'id')), 'exactly one primary admin');
    assertSame('admin', Database::value('SELECT role FROM users WHERE id = ?', [$primary['id']]));

    $e = assertThrows(Throwable::class, fn () => Database::run('UPDATE users SET is_primary_admin = 1 WHERE id = ?', [$primary['id']]));
    assertTrue(str_contains($e->getMessage(), 'Duplicate') || str_contains($e->getMessage(), '1062'), 'the database refuses a second primary admin');
});

test('user and team routes are admin-only', function () {
    useTestDatabase();
    $member = ['id' => 999999, 'role' => 'user', 'email' => 'member@example.com'];
    foreach (['/admin/users', '/admin/users/1', '/admin/admins'] as $path) {
        $router = new \Transenigma\Core\Router();
        (require dirname(__DIR__) . '/routes.php')($router);
        $kernel = new \Transenigma\Core\Kernel($router);
        $kernel->setUserResolver(static fn (): ?array => $member);
        assertSame(403, $kernel->handle(new \Transenigma\Core\Request('GET', $path, [], ['REMOTE_ADDR' => '10.0.0.9'], ''))->status, "member blocked from $path");
    }
});

test('anonymise clears only that address: audit details of a similar address stay; email log, tokens and registrations by email go', function () {
    useTestDatabase();
    [$primary] = teamAdmin(true);
    captureMail();
    $m = member('Al Person');
    $email = $m['email'];
    \Transenigma\Services\AuditService::log('AUTH_LOGIN_FAILED', 'guest', null, 'user', null, ['email' => $email]);
    \Transenigma\Services\AuditService::log('AUTH_LOGIN_FAILED', 'guest', null, 'user', null, ['email' => 's' . $email]);
    \Transenigma\Services\AuditService::log('AUTH_LOGIN_FAILED', 'guest', null, 'user', null, ['email' => $email . '.au']);
    Database::run('INSERT INTO email_log (to_email, template, status) VALUES (?, ?, ?)', [$email, 'verify-email', 'sent']);
    \Transenigma\Services\TokenService::issue((int) $m['id'], \Transenigma\Services\TokenService::RESET_PASSWORD);
    Database::run(
        "INSERT INTO challenge_registrations (ref_code, program, user_id, name, email, phone, age, country, cohort_timing, struggles, consent_at)
         VALUES ('PTI-GUEST1', 'PTI', NULL, 'Al Person', ?, '+919888888888', 40, 'IN', 'evening', '[]', UTC_TIMESTAMP())",
        [$email]
    );
    AdminUsersService::anonymise((int) $m['id'], $email, $primary, authReq());

    assertSame(0, (int) Database::value('SELECT COUNT(*) FROM audit_logs WHERE details LIKE ?', ['%"' . $email . '"%']));
    assertSame(2, (int) Database::value('SELECT COUNT(*) FROM audit_logs WHERE details LIKE ? OR details LIKE ?', ['%"s' . $email . '"%', '%"' . $email . '.au"%']), 'similar addresses are not touched');
    assertSame(0, (int) Database::value('SELECT COUNT(*) FROM email_log WHERE to_email = ?', [$email]));
    assertSame(0, (int) Database::value('SELECT COUNT(*) FROM auth_tokens WHERE user_id = ?', [$m['id']]));
    assertSame(AdminUsersService::ANON_NAME, Database::value("SELECT name FROM challenge_registrations WHERE ref_code = 'PTI-GUEST1'"), 'a registration made as a guest with the same email');
});

test('a disable checked against a member does not land on someone promoted meanwhile', function () {
    useTestDatabase();
    [$primary] = teamAdmin(true);
    [$other] = teamAdmin();
    $m = member();
    // The other admin loaded the member; the primary admin promotes them before the click lands.
    $stale = AdminUsersService::detail((int) $m['id']);
    Database::run("UPDATE users SET role = 'admin' WHERE id = ?", [$m['id']]);
    $e = assertThrows(HttpException::class, fn () => AdminUsersService::setStatus((int) $m['id'], 'disabled', $other, authReq()));
    assertSame('PRIMARY_ADMIN_ONLY', $e->errorCode, 'the role is checked again');
    assertSame('active', Database::value('SELECT status FROM users WHERE id = ?', [$m['id']]));
    assertSame('Member Person', $stale['name']);
});

test('user and team writes are admin-only and need the CSRF token', function () {
    useTestDatabase();
    $router = new \Transenigma\Core\Router();
    (require dirname(__DIR__) . '/routes.php')($router);
    $writes = array_filter($router->routes(), static fn (array $r): bool => $r['method'] !== 'GET'
        && (str_starts_with($r['pattern'], '/admin/users') || str_starts_with($r['pattern'], '/admin/admins')));
    assertSame(5, count($writes)); // disable/enable, anonymise, add, remove, make primary
    foreach ($writes as $r) {
        assertSame('admin', $r['options']['auth'], "{$r['method']} {$r['pattern']}");
        assertSame(true, $r['options']['csrf'], "{$r['method']} {$r['pattern']} checks CSRF");
    }
});
