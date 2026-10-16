<?php
/**
 * Create the first administrator, or promote an existing user (PRD AUTH-10).
 *
 *   php api/bin/create-admin.php admin@yourdomain.com "Full Name"
 *   php api/bin/create-admin.php --reset-2fa admin@yourdomain.com
 *   php api/bin/create-admin.php --primary admin@yourdomain.com
 *
 * New accounts: you are asked for a password (typed twice). Existing accounts
 * keep their password and are promoted to admin after confirmation.
 * Every admin sets up two-step sign-in (an authenticator app) at their first sign-in (ADM-12).
 * --reset-2fa is the way back in for an admin who lost both their phone and their recovery codes:
 * it signs them out everywhere, and they set it up again at their next sign-in.
 * The primary admin (slice F2) alone adds and removes admins in the console. The first admin becomes the
 * primary admin automatically; --primary makes an admin the primary one, for example if the primary admin
 * has left and can no longer hand the role over.
 */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__) . '/bootstrap.php';

use Transenigma\Core\Database;
use Transenigma\Repositories\UserRepository;
use Transenigma\Services\AdminTeamService;
use Transenigma\Services\AuditService;
use Transenigma\Services\PasswordPolicy;
use Transenigma\Services\TwoFactorService;

$args = array_slice($argv, 1);
$flags = array_values(array_filter($args, static fn (string $a): bool => str_starts_with($a, '--')));
$args = array_values(array_filter($args, static fn (string $a): bool => !str_starts_with($a, '--')));
$reset2fa = in_array('--reset-2fa', $flags, true);
$primary = in_array('--primary', $flags, true);
if (array_diff($flags, ['--reset-2fa', '--primary']) !== []) {
    fwrite(STDERR, 'Unknown option: ' . implode(' ', array_diff($flags, ['--reset-2fa', '--primary'])) . "\n");
    exit(1);
}
$email = mb_strtolower(trim($args[0] ?? ''));
$name = trim($args[1] ?? '');
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "Usage: php api/bin/create-admin.php <email> \"<full name>\"\n       php api/bin/create-admin.php --reset-2fa <email>\n       php api/bin/create-admin.php --primary <email>\n");
    exit(1);
}

function ask(string $prompt): string
{
    echo $prompt;
    return rtrim((string) fgets(STDIN), "\r\n");
}

/** The first admin, or one named with --primary, becomes the primary admin (the only one who adds or removes admins). */
function settlePrimary(int $id, bool $wanted): void
{
    if ($wanted || !AdminTeamService::hasPrimary()) {
        AdminTeamService::makePrimaryFromServer($id);
        echo "They are the primary admin: the only admin who can add or remove admins in the console.\n";
    }
}

const NEXT_SIGN_IN = "At their next sign-in they set up two-step sign-in with an authenticator app (for example Google Authenticator or Microsoft Authenticator).\n";

if ($reset2fa) {
    $admin = UserRepository::findByEmail($email);
    if ($admin === null || $admin['role'] !== 'admin') {
        fwrite(STDERR, "$email is not an administrator.\n");
        exit(1);
    }
    if (strtolower(ask("Reset two-step sign-in for $email? They will be signed out everywhere. [y/N] ")) !== 'y') {
        echo "Cancelled.\n";
        exit(1);
    }
    TwoFactorService::reset($admin);
    echo "Done: two-step sign-in was reset for $email.\n" . NEXT_SIGN_IN;
    exit(0);
}

$existing = UserRepository::findByEmail($email);
if ($existing !== null) {
    if ($existing['role'] === 'admin') {
        echo "$email is already an administrator.\n";
        if ($primary && (int) ($existing['is_primary_admin'] ?? 0) !== 1) {
            if (strtolower(ask("Make $email the primary admin instead of the current one? [y/N] ")) !== 'y') {
                echo "Cancelled.\n";
                exit(1);
            }
            settlePrimary((int) $existing['id'], true);
        }
        exit(0);
    }
    if ($existing['status'] !== 'active' || $existing['email_verified_at'] === null) {
        // Same rule as the Admins page: only an account whose owner has proved the address (and that is not disabled).
        fwrite(STDERR, "$email is " . ($existing['status'] !== 'active' ? 'disabled' : 'not email-verified yet') . ". Ask them to confirm their email first.\n");
        exit(1);
    }
    if (strtolower(ask("$email already has an account ({$existing['name']}). Promote it to admin? [y/N] ")) !== 'y') {
        echo "Cancelled.\n";
        exit(1);
    }
    UserRepository::setRole((int) $existing['id'], 'admin');
    Database::run('UPDATE users SET admin_added_at = UTC_TIMESTAMP(), admin_added_by = NULL WHERE id = ?', [$existing['id']]);
    AuditService::log('ADMIN_PROMOTED_CLI', 'system', null, 'user', $existing['id'], ['email' => $email]);
    echo "Done: $email is now an administrator.\n" . NEXT_SIGN_IN;
    settlePrimary((int) $existing['id'], $primary);
    exit(0);
}

if ($name === '' || mb_strlen($name) > 100) {
    fwrite(STDERR, "Please give the admin's full name as the second argument.\n");
    exit(1);
}

echo "Note: the password is visible while you type. Make sure nobody is watching your screen.\n";
for ($attempt = 1; $attempt <= 3; $attempt++) {
    $password = ask('Password: ');
    if ($error = PasswordPolicy::check($password, $email)) {
        echo "  $error\n";
        continue;
    }
    if (ask('Repeat password: ') !== $password) {
        echo "  Passwords do not match.\n";
        continue;
    }
    $id = UserRepository::create($name, $email, PasswordPolicy::hash($password), null, true, 'admin');
    Database::run('UPDATE users SET admin_added_at = UTC_TIMESTAMP() WHERE id = ?', [$id]);
    AuditService::log('ADMIN_CREATED_CLI', 'system', null, 'user', $id, ['email' => $email]);
    echo "Done: administrator $email created. You can now sign in at /login.\n" . NEXT_SIGN_IN;
    settlePrimary($id, $primary);
    exit(0);
}

fwrite(STDERR, "Too many attempts.\n");
exit(1);
