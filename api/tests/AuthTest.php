<?php
declare(strict_types=1);

use Wellness\Core\Config;
use Wellness\Core\Database;
use Wellness\Core\HttpException;
use Wellness\Core\Request;
use Wellness\Core\Session;
use Wellness\Repositories\UserRepository;
use Wellness\Services\AuthService;
use Wellness\Services\GoogleOAuth;
use Wellness\Services\Mailer;
use Wellness\Services\PasswordPolicy;
use Wellness\Services\TokenService;

// ------------------------------------------------------------------ password policy
test('password policy rejects short, common, repetitive and email passwords', function () {
    assertTrue(PasswordPolicy::check('short') !== null);
    assertTrue(PasswordPolicy::check('password123') !== null, 'common password accepted');
    assertTrue(PasswordPolicy::check('aaaaaaaaaaaa') !== null, 'repetitive password accepted');
    assertTrue(PasswordPolicy::check('maya.lin@example.com', 'maya.lin@example.com') !== null);
    assertSame(null, PasswordPolicy::check(GOOD_PASSWORD, 'maya@example.com'));
    $hash = PasswordPolicy::hash(GOOD_PASSWORD);
    assertTrue(password_verify(GOOD_PASSWORD, $hash));
});

// ------------------------------------------------------------------ sign-up / sign-in
test('sign-up creates an unverified user, signs them in and emails a verification link', function () {
    useTestDatabase();
    freshSession();
    $mail = captureMail();
    $email = uniqueEmail();

    $user = AuthService::register('Maya Lin', strtoupper($email), GOOD_PASSWORD, authReq());
    assertSame($email, $user['email'], 'email must be stored lower-case');
    assertSame('user', $user['role']);
    assertSame(null, $user['email_verified_at']);
    assertSame((int) $user['id'], AuthService::user()['id'] ?? null);
    assertTrue($user['password_hash'] !== GOOD_PASSWORD && password_verify(GOOD_PASSWORD, $user['password_hash']));

    assertSame(1, count($mail));
    assertSame($email, $mail[0]['to']);
    assertTrue(str_contains($mail[0]['text'], '/verify-email?token='));
    assertSame(1, (int) Database::value("SELECT COUNT(*) FROM audit_logs WHERE action = 'AUTH_SIGNUP' AND actor_user_id = ?", [$user['id']]));
});

test('sign-up with an existing email is refused and never signs into that account (fault 5)', function () {
    useTestDatabase();
    freshSession();
    captureMail();
    $email = uniqueEmail();
    AuthService::register('First Owner', $email, GOOD_PASSWORD, authReq());
    freshSession();

    $e = assertThrows(HttpException::class, fn () => AuthService::register('Attacker', $email, 'Another-Strong-Pass-9', authReq()));
    assertSame(409, $e->status);
    assertSame(null, AuthService::user(), 'must not be signed in after a refused sign-up');
});

test('sign-in checks the password (fault 1) and never grants admin from the email (fault 2)', function () {
    useTestDatabase();
    freshSession();
    captureMail();
    $email = 'admin' . bin2hex(random_bytes(3)) . '@example.com';
    AuthService::register('Not An Admin', $email, GOOD_PASSWORD, authReq());
    freshSession();

    $e = assertThrows(HttpException::class, fn () => AuthService::attempt($email, 'Wrong-Password-123', authReq()));
    assertSame(401, $e->status);
    assertSame('INVALID_CREDENTIALS', $e->errorCode);
    assertSame(null, AuthService::user());

    // Unknown email gives the identical error (no enumeration).
    $e2 = assertThrows(HttpException::class, fn () => AuthService::attempt(uniqueEmail(), 'Wrong-Password-123', authReq()));
    assertSame($e->getMessage(), $e2->getMessage());

    $user = AuthService::attempt($email, GOOD_PASSWORD, authReq());
    assertSame('user', $user['role'], 'an email containing "admin" must not grant admin');
    assertSame((int) $user['id'], (int) AuthService::user()['id']);
});

test('five failed sign-ins lock the email+IP for 15 minutes, even with the right password', function () {
    useTestDatabase();
    freshSession();
    captureMail();
    $email = uniqueEmail();
    AuthService::register('Lock Test', $email, GOOD_PASSWORD, authReq());
    freshSession();
    $ip = '10.9.9.' . random_int(1, 254);

    for ($i = 0; $i < 5; $i++) {
        assertSame(401, assertThrows(HttpException::class, fn () => AuthService::attempt($email, 'Wrong-Password-123', authReq($ip)))->status);
    }
    $e = assertThrows(HttpException::class, fn () => AuthService::attempt($email, GOOD_PASSWORD, authReq($ip)));
    assertSame(429, $e->status);
    assertSame('ACCOUNT_LOCKED', $e->errorCode);
    // A different IP is not affected.
    AuthService::attempt($email, GOOD_PASSWORD, authReq());
});

test('disabled accounts cannot sign in and existing sessions stop working', function () {
    useTestDatabase();
    freshSession();
    captureMail();
    $email = uniqueEmail();
    $user = AuthService::register('Soon Disabled', $email, GOOD_PASSWORD, authReq());
    assertTrue(AuthService::user() !== null);

    Database::run("UPDATE users SET status = 'disabled' WHERE id = ?", [$user['id']]);
    AuthService::flush();
    assertSame(null, AuthService::user(), 'session must be rejected once disabled');

    $e = assertThrows(HttpException::class, fn () => AuthService::attempt($email, GOOD_PASSWORD, authReq()));
    assertSame('ACCOUNT_DISABLED', $e->errorCode);
});

test('admin sessions expire after the idle timeout', function () {
    useTestDatabase();
    freshSession();
    captureMail();
    $user = AuthService::register('Idle Admin', uniqueEmail(), GOOD_PASSWORD, authReq());
    UserRepository::setRole((int) $user['id'], 'admin');
    AuthService::flush();
    assertSame('admin', AuthService::user()['role']);

    $_SESSION['auth_seen'] = time() - (Config::int('session.admin_idle_minutes', 720) * 60) - 5;
    AuthService::flush();
    assertSame(null, AuthService::user());
});

// ------------------------------------------------------------------ verification
test('email verification link works once and only once', function () {
    useTestDatabase();
    freshSession();
    $mail = captureMail();
    $user = AuthService::register('Verify Me', uniqueEmail(), GOOD_PASSWORD, authReq());
    $token = tokenFromMail($mail[0]);
    assertSame(43, strlen($token));

    AuthService::verifyEmail($token, authReq());
    assertTrue(UserRepository::find((int) $user['id'])['email_verified_at'] !== null);
    assertSame('INVALID_TOKEN', assertThrows(HttpException::class, fn () => AuthService::verifyEmail($token, authReq()))->errorCode);
    assertSame('INVALID_TOKEN', assertThrows(HttpException::class, fn () => AuthService::verifyEmail('not-a-token', authReq()))->errorCode);
});

test('tokens expire and only the hash is stored', function () {
    useTestDatabase();
    captureMail();
    $id = UserRepository::create('Token User', uniqueEmail(), PasswordPolicy::hash(GOOD_PASSWORD));
    $token = TokenService::issue($id, TokenService::VERIFY_EMAIL);
    assertSame(0, (int) Database::value('SELECT COUNT(*) FROM auth_tokens WHERE token_hash = ?', [$token]), 'plain token stored');
    Database::run('UPDATE auth_tokens SET expires_at = UTC_TIMESTAMP() - INTERVAL 1 SECOND WHERE user_id = ?', [$id]);
    assertSame(null, TokenService::consume($token, TokenService::VERIFY_EMAIL));

    // Issuing a new token revokes the previous unused one.
    $first = TokenService::issue($id, TokenService::RESET_PASSWORD);
    $second = TokenService::issue($id, TokenService::RESET_PASSWORD);
    assertSame(null, TokenService::consume($first, TokenService::RESET_PASSWORD));
    assertSame($id, TokenService::consume($second, TokenService::RESET_PASSWORD));
});

// ------------------------------------------------------------------ password reset (fault 6)
test('password reset emails a link, sets the new password and signs out other sessions', function () {
    useTestDatabase();
    freshSession();
    $mail = captureMail();
    $email = uniqueEmail();
    $user = AuthService::register('Reset Me', $email, GOOD_PASSWORD, authReq());
    $otherDevice = $_SESSION; // a second signed-in browser
    $mail->exchangeArray([]);

    // Unknown email: identical (silent) behaviour, no mail.
    AuthService::requestPasswordReset(uniqueEmail(), authReq());
    assertSame(0, count($mail));

    AuthService::requestPasswordReset($email, authReq());
    assertSame(1, count($mail));
    $token = tokenFromMail($mail[0]);

    // A weak password is rejected without burning the link.
    assertSame(422, assertThrows(HttpException::class, fn () => AuthService::resetPassword($token, 'password123', authReq()))->status);
    AuthService::resetPassword($token, 'Brand-New-Secret-77', authReq());

    assertTrue(password_verify('Brand-New-Secret-77', UserRepository::find((int) $user['id'])['password_hash']));
    assertTrue(str_contains($mail[1]['subject'], 'password was changed'), 'security notice email expected');
    assertSame('INVALID_TOKEN', assertThrows(HttpException::class, fn () => AuthService::resetPassword($token, 'Another-New-Secret-8', authReq()))->errorCode);

    $_SESSION = $otherDevice;
    AuthService::flush();
    assertSame(null, AuthService::user(), 'old sessions must be signed out after a reset');
});

test('changing the password keeps this session but signs out others', function () {
    useTestDatabase();
    freshSession();
    captureMail();
    $user = AuthService::register('Change Me', uniqueEmail(), GOOD_PASSWORD, authReq());
    $otherDevice = $_SESSION;

    assertSame(422, assertThrows(HttpException::class, fn () => AuthService::changePassword($user, 'wrong-current', 'Fresh-Secret-Phrase-5', authReq()))->status);
    AuthService::changePassword($user, GOOD_PASSWORD, 'Fresh-Secret-Phrase-5', authReq());
    AuthService::flush();
    assertSame((int) $user['id'], (int) AuthService::user()['id'], 'current session must stay signed in');

    $_SESSION = $otherDevice;
    AuthService::flush();
    assertSame(null, AuthService::user(), 'other sessions must be signed out');
});

test('sign-up respects the signup_open setting', function () {
    useTestDatabase();
    freshSession();
    Database::run("UPDATE settings SET value = '0' WHERE setting_key = 'signup_open'");
    \Wellness\Services\SettingsService::flush();
    try {
        assertSame('SIGNUP_CLOSED', assertThrows(HttpException::class, fn () => AuthService::register('Closed', uniqueEmail(), GOOD_PASSWORD, authReq()))->errorCode);
    } finally {
        Database::run("UPDATE settings SET value = '1' WHERE setting_key = 'signup_open'");
        \Wellness\Services\SettingsService::flush();
    }
});

// ------------------------------------------------------------------ Google (fault 3)
function fakeIdToken(array $claims): string
{
    $b64 = static fn (array $a): string => rtrim(strtr(base64_encode(json_encode($a)), '+/', '-_'), '=');
    return $b64(['alg' => 'RS256']) . '.' . $b64($claims) . '.signature';
}

function googleClaims(array $overrides = []): array
{
    return $overrides + [
        'iss' => 'https://accounts.google.com', 'aud' => 'test-client.apps.googleusercontent.com',
        'exp' => time() + 600, 'sub' => 'g-' . bin2hex(random_bytes(6)), 'email' => uniqueEmail(),
        'email_verified' => true, 'name' => 'Google Person',
    ];
}

function runGoogleFlow(array $claims, string $next = '/my-results'): string
{
    Config::override('google.client_id', 'test-client.apps.googleusercontent.com');
    Config::override('google.client_secret', 'test-secret');
    $url = GoogleOAuth::authorizationUrl($next);
    parse_str((string) parse_url($url, PHP_URL_QUERY), $q);
    assertSame('S256', $q['code_challenge_method']);
    GoogleOAuth::$tokenExchanger = static fn (string $code, string $verifier): array => ['id_token' => fakeIdToken($claims)];
    $request = new Request('GET', '/auth/google/callback', ['code' => 'abc', 'state' => $q['state']], ['REMOTE_ADDR' => '10.1.1.1'], '');
    return GoogleOAuth::handleCallback($request);
}

test('google sign-in creates a verified account, then signs the same person in again', function () {
    useTestDatabase();
    freshSession();
    $claims = googleClaims();
    assertSame('/my-results', runGoogleFlow($claims));
    $user = AuthService::user();
    assertSame($claims['email'], $user['email']);
    assertSame(null, $user['password_hash']);
    assertTrue($user['email_verified_at'] !== null);

    freshSession();
    runGoogleFlow($claims);
    assertSame((int) $user['id'], (int) AuthService::user()['id']);
});

test('google sign-in links to an existing account with the same verified email', function () {
    useTestDatabase();
    freshSession();
    captureMail();
    $email = uniqueEmail();
    $existing = AuthService::register('Existing Person', $email, GOOD_PASSWORD, authReq());
    freshSession();

    runGoogleFlow(googleClaims(['email' => $email]));
    assertSame((int) $existing['id'], (int) AuthService::user()['id']);
    assertTrue(UserRepository::find((int) $existing['id'])['google_sub'] !== null);
});

test('google callback rejects bad state, wrong audience, unverified email and open redirects', function () {
    useTestDatabase();
    freshSession();
    Config::override('google.client_id', 'test-client.apps.googleusercontent.com');
    Config::override('google.client_secret', 'test-secret');

    GoogleOAuth::authorizationUrl('/');
    $forged = new Request('GET', '/auth/google/callback', ['code' => 'abc', 'state' => 'forged'], ['REMOTE_ADDR' => '10.1.1.1'], '');
    assertSame('GOOGLE_STATE', assertThrows(HttpException::class, fn () => GoogleOAuth::handleCallback($forged))->errorCode);

    assertThrows(RuntimeException::class, fn () => runGoogleFlow(googleClaims(['aud' => 'someone-else'])));
    assertThrows(RuntimeException::class, fn () => runGoogleFlow(googleClaims(['email_verified' => false])));
    assertThrows(RuntimeException::class, fn () => runGoogleFlow(googleClaims(['iss' => 'https://evil.example'])));
    assertThrows(RuntimeException::class, fn () => runGoogleFlow(googleClaims(['exp' => time() - 3600])));
    assertSame(null, AuthService::user());

    assertSame('/', GoogleOAuth::safeNext('//evil.example/path'));
    assertSame('/', GoogleOAuth::safeNext('https://evil.example'));
    assertSame('/', GoogleOAuth::safeNext('/\\evil.example'));
    assertSame('/results/WL-ABC123?x=1', GoogleOAuth::safeNext('/results/WL-ABC123?x=1'));
});

// ------------------------------------------------------------------ email templates
test('email templates render escaped HTML and plain text', function () {
    useTestDatabase();
    $msg = Mailer::render('verify-email', ['name' => '<script>x</script>', 'url' => 'https://example.com/verify-email?token=a&b', 'siteName' => 'Wellness', 'siteUrl' => 'https://example.com', 'supportEmail' => 'help@example.com']);
    assertTrue(!str_contains($msg['html'], '<script>x</script>'), 'name must be escaped');
    assertTrue(str_contains($msg['html'], '&lt;script&gt;'));
    assertTrue(str_contains($msg['html'], 'token=a&amp;b'));
    assertTrue(str_contains($msg['text'], 'https://example.com/verify-email?token=a&b'));
    foreach (['reset-password', 'password-changed'] as $t) {
        $m = Mailer::render($t, ['name' => 'A', 'url' => 'https://x', 'siteName' => 'Wellness', 'siteUrl' => 'https://x', 'supportEmail' => '']);
        assertTrue($m['subject'] !== '' && $m['text'] !== '' && str_contains($m['html'], '<html'));
    }
    assertThrows(RuntimeException::class, fn () => Mailer::render('../config/config.local', []));
});
