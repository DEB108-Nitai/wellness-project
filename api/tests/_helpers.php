<?php
/** Shared helpers for the test files (loaded by run.php before any *Test.php). */
declare(strict_types=1);

use Wellness\Core\Request;
use Wellness\Services\AuthService;
use Wellness\Services\Mailer;

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

