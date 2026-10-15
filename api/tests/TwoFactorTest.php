<?php
declare(strict_types=1);

use Transenigma\Core\Config;
use Transenigma\Core\Database;
use Transenigma\Core\HttpException;
use Transenigma\Core\Kernel;
use Transenigma\Core\Request;
use Transenigma\Core\Router;
use Transenigma\Repositories\UserRepository;
use Transenigma\Services\AuthService;
use Transenigma\Services\GoogleOAuth;
use Transenigma\Services\PasswordPolicy;
use Transenigma\Services\TwoFactorService;
use Transenigma\Support\Totp;

/** Admin two-step sign-in (ADM-12). */

function newAdmin(): array
{
    $email = uniqueEmail();
    $id = UserRepository::create('Second Step', $email, PasswordPolicy::hash(GOOD_PASSWORD), null, true, 'admin');
    return UserRepository::find($id);
}

/** Through the real guards, with the real session (not a stubbed user). */
function realKernelStatus(string $method, string $path): int
{
    $router = new Router();
    (require dirname(__DIR__) . '/routes.php')($router);
    $kernel = new Kernel($router);
    $kernel->setUserResolver(static fn (): ?array => AuthService::user());
    AuthService::flush();
    return $kernel->handle(new Request($method, $path, [], ['REMOTE_ADDR' => '10.0.0.7'], ''))->status;
}

// ------------------------------------------------------------------ the algorithm

test('TOTP matches the RFC 6238 SHA-1 test vectors', function () {
    $secret = Totp::base32Encode('12345678901234567890');
    assertSame('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', $secret);
    foreach ([59 => '287082', 1111111109 => '081804', 1111111111 => '050471', 1234567890 => '005924', 2000000000 => '279037', 20000000000 => '353130'] as $t => $code) {
        assertSame($code, Totp::code($secret, Totp::step($t)), "time $t");
    }
    assertSame('12345678901234567890', Totp::base32Decode($secret));
});

test('TOTP accepts one step of clock drift either way, no more', function () {
    $secret = Totp::newSecret();
    assertSame(32, strlen($secret));
    $t = 1_700_000_000;
    $s = Totp::step($t);
    assertSame($s, Totp::matchStep($secret, Totp::code($secret, $s), $t));
    assertSame($s - 1, Totp::matchStep($secret, Totp::code($secret, $s - 1), $t));
    assertSame($s + 1, Totp::matchStep($secret, Totp::code($secret, $s + 1), $t));
    assertSame(null, Totp::matchStep($secret, Totp::code($secret, $s - 2), $t));
    assertSame(null, Totp::matchStep($secret, Totp::code($secret, $s + 2), $t));
    assertSame(null, Totp::matchStep($secret, 'abcdef', $t));
    assertSame(null, Totp::matchStep($secret, '12345', $t));
});

test('the stored secret is encrypted and tampering is detected', function () {
    $secret = Totp::newSecret();
    $stored = Totp::encrypt($secret, 'user:7');
    assertTrue(!str_contains($stored, $secret), 'not stored in the clear');
    assertTrue($stored !== Totp::encrypt($secret, 'user:7'), 'fresh IV each time');
    assertSame($secret, Totp::decrypt($stored, 'user:7'));
    assertSame(null, Totp::decrypt($stored, 'user:8'), 'bound to its row: copied to another account it does not decrypt');
    $raw = base64_decode(substr($stored, 3));
    $raw[30] = chr(ord($raw[30]) ^ 1);
    assertSame(null, Totp::decrypt('v1:' . base64_encode($raw), 'user:7'), 'GCM tag rejects a changed ciphertext');
    assertSame(null, Totp::decrypt('garbage', 'user:7'));

    $original = Config::string('app.secret');
    Config::override('app.secret', str_repeat('k', 48));
    try {
        assertSame(null, Totp::decrypt($stored, 'user:7'), 'a new app.secret cannot read the old secret');
    } finally {
        Config::override('app.secret', $original);
    }
});

// ------------------------------------------------------------------ sign-in

test('an admin password sign-in waits for the second step and has no admin access', function () {
    useTestDatabase();
    freshSession();
    captureMail();
    $admin = newAdmin();
    AuthService::attempt($admin['email'], GOOD_PASSWORD, authReq());
    assertSame(null, AuthService::user(), 'not signed in yet');
    $payload = AuthService::sessionPayload();
    assertSame(null, $payload['user']);
    assertSame(['step' => 'setup', 'name' => 'Second Step'], $payload['twoFactor']);
    assertSame(401, realKernelStatus('GET', '/admin/dashboard'));
    assertSame(0, (int) Database::value("SELECT COUNT(*) FROM audit_logs WHERE action = 'AUTH_LOGIN' AND actor_user_id = ?", [$admin['id']]), 'no sign-in recorded yet');
});

test('first admin sign-in: set up the app, confirm a code, get 10 recovery codes, signed in', function () {
    useTestDatabase();
    freshSession();
    $mail = captureMail();
    $admin = newAdmin();
    AuthService::attempt($admin['email'], GOOD_PASSWORD, authReq());

    $setup = TwoFactorService::setup();
    assertTrue(preg_match('/^[A-Z2-7]{32}$/', $setup['secret']) === 1);
    assertTrue(str_starts_with($setup['uri'], 'otpauth://totp/') && str_contains($setup['uri'], 'secret=' . $setup['secret']));
    assertSame($setup['secret'], TwoFactorService::setup()['secret'], 'same secret until the setup ends (QR scanned once)');

    $e = assertThrows(HttpException::class, fn () => TwoFactorService::enable('000000' === Totp::code($setup['secret'], Totp::step()) ? '111111' : '000000', authReq()));
    assertSame(422, $e->status);
    assertSame(null, AuthService::user());

    $codes = TwoFactorService::enable(Totp::code($setup['secret'], Totp::step()), authReq());
    assertSame(10, count(array_unique($codes)));
    foreach ($codes as $c) {
        assertTrue(preg_match('/^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/', $c) === 1, "format $c");
    }
    $user = AuthService::user();
    assertSame('admin', $user['role'] ?? null, 'signed in as admin');
    assertSame(200, realKernelStatus('GET', '/admin/security'));

    $row = Database::one('SELECT totp_secret_enc, totp_enabled_at FROM users WHERE id = ?', [$admin['id']]);
    assertTrue($row['totp_enabled_at'] !== null);
    assertSame($setup['secret'], Totp::decrypt($row['totp_secret_enc'], 'user:' . $admin['id']));
    $hashes = Database::all('SELECT code_hash FROM admin_recovery_codes WHERE user_id = ?', [$admin['id']]);
    assertSame(10, count($hashes));
    assertTrue(!in_array(str_replace('-', '', $codes[0]), array_column($hashes, 'code_hash'), true), 'stored hashed only');

    $login = Database::one("SELECT details FROM audit_logs WHERE action = 'AUTH_LOGIN' AND actor_user_id = ? ORDER BY id DESC LIMIT 1", [$admin['id']]);
    assertTrue(str_contains($login['details'], '"secondStep":"enrolled"'));
    assertTrue(str_contains($mail[count($mail) - 1]['subject'], 'Two-step sign-in is on'));

    // Setting up again in this state is refused.
    freshSession();
    AuthService::attempt($admin['email'], GOOD_PASSWORD, authReq());
    assertSame('code', AuthService::sessionPayload()['twoFactor']['step']);
    assertSame('TWO_FACTOR_ALREADY_ON', assertThrows(HttpException::class, fn () => TwoFactorService::setup())->errorCode);
});

test('later sign-ins need a fresh code; a code cannot be used twice', function () {
    useTestDatabase();
    [$admin, $secret] = signInAdmin();

    freshSession();
    AuthService::attempt($admin['email'], GOOD_PASSWORD, authReq());
    $used = Totp::code($secret, (int) Database::value('SELECT totp_last_step FROM users WHERE id = ?', [$admin['id']])); // the step signInAdmin() consumed
    assertSame(422, assertThrows(HttpException::class, fn () => TwoFactorService::verify($used, authReq()))->status, 'replayed code refused');

    $next = Totp::code($secret, Totp::step() + 1);
    assertSame(null, TwoFactorService::verify(substr($next, 0, 3) . ' ' . substr($next, 3), authReq()), 'spaces allowed');
    assertSame((int) $admin['id'], (int) AuthService::user()['id']);

    freshSession();
    AuthService::attempt($admin['email'], GOOD_PASSWORD, authReq());
    assertSame(422, assertThrows(HttpException::class, fn () => TwoFactorService::verify($next, authReq()))->status, 'the same code again is refused');
});

test('a recovery code signs in once and the admin is told how many are left', function () {
    useTestDatabase();
    freshSession();
    $mail = captureMail();
    $admin = newAdmin();
    AuthService::attempt($admin['email'], GOOD_PASSWORD, authReq());
    $secret = TwoFactorService::setup()['secret'];
    $codes = TwoFactorService::enable(Totp::code($secret, Totp::step()), authReq());

    freshSession();
    AuthService::attempt($admin['email'], GOOD_PASSWORD, authReq());
    assertSame(9, TwoFactorService::verify(strtolower($codes[3]), authReq()), 'case and dash do not matter');
    assertSame((int) $admin['id'], (int) AuthService::user()['id']);
    assertTrue(str_contains($mail[count($mail) - 1]['text'], 'You have 9 recovery codes left'));

    freshSession();
    AuthService::attempt($admin['email'], GOOD_PASSWORD, authReq());
    assertSame(422, assertThrows(HttpException::class, fn () => TwoFactorService::verify($codes[3], authReq()))->status, 'single use');
    assertSame(null, AuthService::user());
});

test('five wrong codes lock the second step for 15 minutes', function () {
    useTestDatabase();
    [$admin, $secret] = signInAdmin();
    freshSession();
    AuthService::attempt($admin['email'], GOOD_PASSWORD, authReq());
    $wrong = Totp::code($secret, Totp::step() + 5);
    for ($i = 0; $i < 5; $i++) {
        assertSame(422, assertThrows(HttpException::class, fn () => TwoFactorService::verify($wrong, authReq()))->status);
    }
    $e = assertThrows(HttpException::class, fn () => TwoFactorService::verify(freshCode((int) $admin['id'], $secret), authReq()));
    assertSame(429, $e->status);
    assertSame('TWO_FACTOR_LOCKED', $e->errorCode);
    assertSame(null, AuthService::user());
    assertSame(1, (int) Database::value("SELECT COUNT(*) FROM audit_logs WHERE action = 'AUTH_2FA_LOCKOUT' AND actor_user_id = ?", [$admin['id']]));
    assertSame(5, (int) Database::value("SELECT COUNT(*) FROM audit_logs WHERE action = 'AUTH_2FA_FAILED' AND actor_user_id = ?", [$admin['id']]));
});

test('the waiting step expires after 10 minutes and ends when the password changes', function () {
    useTestDatabase();
    [$admin, $secret] = signInAdmin();

    freshSession();
    AuthService::attempt($admin['email'], GOOD_PASSWORD, authReq());
    $_SESSION['auth_pending']['at'] = time() - 601;
    assertSame('TWO_FACTOR_EXPIRED', assertThrows(HttpException::class, fn () => TwoFactorService::verify(freshCode((int) $admin['id'], $secret), authReq()))->errorCode);
    assertTrue(!isset(AuthService::sessionPayload()['twoFactor']));

    freshSession();
    AuthService::attempt($admin['email'], GOOD_PASSWORD, authReq());
    UserRepository::updatePassword((int) $admin['id'], PasswordPolicy::hash('Another-Calm-River-77'));
    assertSame('TWO_FACTOR_EXPIRED', assertThrows(HttpException::class, fn () => TwoFactorService::verify(freshCode((int) $admin['id'], $secret), authReq()))->errorCode);

    freshSession();
    assertSame('TWO_FACTOR_EXPIRED', assertThrows(HttpException::class, fn () => TwoFactorService::verify('123456', authReq()))->errorCode, 'nothing pending');
});

test('Google sign-in for an admin also asks for the code', function () {
    useTestDatabase();
    [$admin, $secret] = signInAdmin();
    Database::run('UPDATE users SET google_sub = ? WHERE id = ?', ['g-admin-' . $admin['id'], $admin['id']]);
    freshSession();
    Config::override('google.client_id', 'test-client.apps.googleusercontent.com');
    Config::override('google.client_secret', 'test-secret');
    parse_str((string) parse_url(GoogleOAuth::authorizationUrl('/admin/research'), PHP_URL_QUERY), $q);
    $b64 = static fn (array $a): string => rtrim(strtr(base64_encode(json_encode($a)), '+/', '-_'), '=');
    $claims = ['iss' => 'https://accounts.google.com', 'aud' => 'test-client.apps.googleusercontent.com', 'exp' => time() + 600,
        'sub' => 'g-admin-' . $admin['id'], 'email' => $admin['email'], 'email_verified' => true, 'name' => 'Admin', 'hd' => 'example.com'];
    GoogleOAuth::$tokenExchanger = static fn (): array => ['id_token' => $b64(['alg' => 'RS256']) . '.' . $b64($claims) . '.sig'];
    $next = GoogleOAuth::handleCallback(new Request('GET', '/auth/google/callback', ['code' => 'c', 'state' => $q['state']], ['REMOTE_ADDR' => '10.1.1.2'], ''));
    assertSame('/login/2fa?next=%2Fadmin%2Fresearch', $next);
    assertSame(null, AuthService::user());
    TwoFactorService::verify(freshCode((int) $admin['id'], $secret), authReq());
    assertSame((int) $admin['id'], (int) AuthService::user()['id']);
    $login = Database::one("SELECT details FROM audit_logs WHERE action = 'AUTH_LOGIN' AND actor_user_id = ? ORDER BY id DESC LIMIT 1", [$admin['id']]);
    assertTrue(str_contains($login['details'], '"method":"google"') && str_contains($login['details'], '"secondStep":"totp"'));
});

test('a session promoted to admin mid-way loses access until it signs in with the code; members are unaffected', function () {
    useTestDatabase();
    freshSession();
    captureMail();
    $user = AuthService::register('Member', uniqueEmail(), GOOD_PASSWORD, authReq());
    assertTrue(AuthService::user() !== null, 'members sign in with the password alone');
    assertTrue(!isset(AuthService::sessionPayload()['twoFactor']));
    UserRepository::setRole((int) $user['id'], 'admin');
    AuthService::flush();
    assertSame(null, AuthService::user());
});

// ------------------------------------------------------------------ the Security page

test('new recovery codes need a current code and replace the old ones', function () {
    useTestDatabase();
    [$admin, $secret] = signInAdmin();
    $mail = captureMail();
    $old = Database::all('SELECT code_hash FROM admin_recovery_codes WHERE user_id = ?', [$admin['id']]);

    assertSame(422, assertThrows(HttpException::class, fn () => TwoFactorService::regenerateRecoveryCodes($admin, '000000', authReq()))->status);
    $codes = TwoFactorService::regenerateRecoveryCodes($admin, freshCode((int) $admin['id'], $secret), authReq());
    assertSame(10, count($codes));
    $now = Database::all('SELECT code_hash FROM admin_recovery_codes WHERE user_id = ?', [$admin['id']]);
    assertSame([], array_intersect(array_column($old, 'code_hash'), array_column($now, 'code_hash')), 'old codes gone');
    assertSame(10, TwoFactorService::status(UserRepository::find((int) $admin['id']))['recoveryCodesLeft']);
    assertTrue(str_contains($mail[count($mail) - 1]['subject'], 'New recovery codes'));
});

test('moving to a new phone: other devices are signed out, this one stays signed in', function () {
    useTestDatabase();
    [$admin, $secret] = signInAdmin();
    $otherDevice = $_SESSION;

    $new = TwoFactorService::startReplace($admin, freshCode((int) $admin['id'], $secret), authReq());
    assertTrue($new['secret'] !== $secret);
    assertSame(422, assertThrows(HttpException::class, fn () => TwoFactorService::confirmReplace($admin, Totp::code($secret, Totp::step() + 1), authReq()))->status, 'a code from the old app does not confirm');
    TwoFactorService::confirmReplace(AuthService::user(), Totp::code($new['secret'], Totp::step()), authReq());

    assertSame((int) $admin['id'], (int) AuthService::user()['id'], 'this session continues');
    assertSame($new['secret'], Totp::decrypt(UserRepository::find((int) $admin['id'])['totp_secret_enc'], 'user:' . $admin['id']));
    $_SESSION = $otherDevice;
    AuthService::flush();
    assertSame(null, AuthService::user(), 'the other device is signed out');
});

test('a lost phone: a recovery code starts the move to a new phone', function () {
    useTestDatabase();
    freshSession();
    captureMail();
    $admin = newAdmin();
    AuthService::attempt($admin['email'], GOOD_PASSWORD, authReq());
    $secret = TwoFactorService::setup()['secret'];
    $codes = TwoFactorService::enable(Totp::code($secret, Totp::step()), authReq());
    $new = TwoFactorService::startReplace(AuthService::user(), $codes[0], authReq());
    assertSame(32, strlen($new['secret']));
    assertSame(9, TwoFactorService::status(UserRepository::find((int) $admin['id']))['recoveryCodesLeft']);
});

test('a reset from the server signs the admin out and asks for a new setup', function () {
    useTestDatabase();
    [$admin] = signInAdmin();
    $mail = captureMail();
    TwoFactorService::reset(UserRepository::find((int) $admin['id']));
    AuthService::flush();
    assertSame(null, AuthService::user(), 'signed out everywhere');
    assertSame(0, (int) Database::value('SELECT COUNT(*) FROM admin_recovery_codes WHERE user_id = ?', [$admin['id']]));
    assertTrue(str_contains($mail[count($mail) - 1]['subject'], 'was reset'));

    freshSession();
    AuthService::attempt($admin['email'], GOOD_PASSWORD, authReq());
    assertSame('setup', AuthService::sessionPayload()['twoFactor']['step']);
});

test('the user shape sent to the browser never includes the authenticator secret', function () {
    useTestDatabase();
    [$admin] = signInAdmin();
    $public = json_encode(UserRepository::toPublic(UserRepository::find((int) $admin['id'])));
    assertTrue(!str_contains($public, 'totp'));
});

// ------------------------------------------------------------------ fresh-eyes review fixes

test('the second-step mark belongs to one account: switching accounts or demotion never carries it over', function () {
    useTestDatabase();
    [$admin] = signInAdmin();
    captureMail();
    // Someone else signs in on the same browser without signing out first; later they are promoted.
    $other = AuthService::register('Next Person', uniqueEmail(), GOOD_PASSWORD, authReq());
    UserRepository::setRole((int) $other['id'], 'admin');
    AuthService::flush();
    assertSame(null, AuthService::user(), 'no admin access without their own code');

    // An admin demoted and later promoted again must pass the code again.
    [$admin2] = signInAdmin();
    UserRepository::setRole((int) $admin2['id'], 'user');
    AuthService::flush();
    assertSame('user', AuthService::user()['role']);
    UserRepository::setRole((int) $admin2['id'], 'admin');
    AuthService::flush();
    assertSame(null, AuthService::user());
});

test('the code just used to sign in gets its own message on the Security page, not a wrong-code strike', function () {
    useTestDatabase();
    [$admin, $secret] = signInAdmin();
    $used = Totp::code($secret, (int) Database::value('SELECT totp_last_step FROM users WHERE id = ?', [$admin['id']])); // the step the sign-in consumed
    $e = assertThrows(HttpException::class, fn () => TwoFactorService::regenerateRecoveryCodes($admin, $used, authReq()));
    assertTrue(str_contains($e->fields['code'], 'just used'));
    assertSame(0, (int) Database::value("SELECT COUNT(*) FROM audit_logs WHERE action = 'AUTH_2FA_FAILED' AND actor_user_id = ?", [$admin['id']]));
});

test('an unreadable stored secret (app.secret changed) says so, and a recovery code still works', function () {
    useTestDatabase();
    freshSession();
    captureMail();
    $admin = newAdmin();
    AuthService::attempt($admin['email'], GOOD_PASSWORD, authReq());
    $secret = TwoFactorService::setup()['secret'];
    $codes = TwoFactorService::enable(Totp::code($secret, Totp::step()), authReq());
    // Simulate a secret written under another app.secret: a ciphertext bound to a different row.
    Database::run('UPDATE users SET totp_secret_enc = ?, totp_last_step = NULL WHERE id = ?', [Totp::encrypt($secret, 'user:0'), $admin['id']]);

    freshSession();
    AuthService::attempt($admin['email'], GOOD_PASSWORD, authReq());
    $e = assertThrows(HttpException::class, fn () => TwoFactorService::verify(Totp::code($secret, Totp::step()), authReq()));
    assertTrue(str_contains($e->fields['code'], 'cannot be checked'));
    assertSame(9, TwoFactorService::verify($codes[1], authReq()));
});

test('the setup secret is not kept readable in the session file', function () {
    useTestDatabase();
    freshSession();
    captureMail();
    $admin = newAdmin();
    AuthService::attempt($admin['email'], GOOD_PASSWORD, authReq());
    $secret = TwoFactorService::setup()['secret'];
    assertTrue(!str_contains(serialize($_SESSION), $secret));
    $new = TwoFactorService::enable(Totp::code($secret, Totp::step()), authReq());
    $replace = TwoFactorService::startReplace(AuthService::user(), $new[0], authReq());
    assertTrue(!str_contains(serialize($_SESSION), $replace['secret']));
});
