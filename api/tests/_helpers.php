<?php
/** Shared helpers for the test files (loaded by run.php before any *Test.php). */
declare(strict_types=1);

use Transenigma\Core\Request;
use Transenigma\Services\AuthService;
use Transenigma\Services\Mailer;

function authReq(?string $ip = null): Request
{
    $ip ??= '10.' . random_int(0, 255) . '.' . random_int(0, 255) . '.' . random_int(1, 254);
    return new Request('POST', '/test', [], ['REMOTE_ADDR' => $ip], '');
}

/** Capture outgoing mail instead of sending it. */
function captureMail(): ArrayObject
{
    $box = new ArrayObject();
    Mailer::$transport = static function (string $to, array $msg) use ($box): void {
        $box[] = ['to' => $to] + $msg;
    };
    return $box;
}

function freshSession(): void
{
    $_SESSION = [];
    AuthService::flush();
}

function tokenFromMail(array $mail): string
{
    preg_match('/token=([A-Za-z0-9_-]{43})/', $mail['text'], $m);
    return $m[1] ?? '';
}

function uniqueEmail(): string
{
    return 'user' . bin2hex(random_bytes(4)) . '@example.com';
}

const GOOD_PASSWORD = 'Calm-River-Lantern-42';


/**
 * A new admin, signed in through both steps (password, then an authenticator code, ADM-12).
 * Returns [user row, authenticator secret].
 */
function signInAdmin(?string $email = null): array
{
    freshSession();
    captureMail();
    $email ??= uniqueEmail();
    $id = \Transenigma\Repositories\UserRepository::create('Test Admin', $email, \Transenigma\Services\PasswordPolicy::hash(GOOD_PASSWORD), null, true, 'admin');
    AuthService::attempt($email, GOOD_PASSWORD, authReq());
    $secret = \Transenigma\Services\TwoFactorService::setup()['secret'];
    \Transenigma\Services\TwoFactorService::enable(\Transenigma\Support\Totp::code($secret, \Transenigma\Support\Totp::step()), authReq());
    return [\Transenigma\Repositories\UserRepository::find($id), $secret];
}

/** A current authenticator code that has not been used yet (tests only: clears the no-reuse marker first). */
function freshCode(int $userId, string $secret): string
{
    \Transenigma\Core\Database::run('UPDATE users SET totp_last_step = NULL WHERE id = ?', [$userId]);
    return \Transenigma\Support\Totp::code($secret, \Transenigma\Support\Totp::step());
}

/** Tests that promote a signed-in user mid-way: treat this session as having passed the second step (ADM-12). */
function markSecondStepPassed(): void
{
    $_SESSION['auth_2fa'] = $_SESSION['auth_uid'] ?? 0;
    AuthService::flush();
}
