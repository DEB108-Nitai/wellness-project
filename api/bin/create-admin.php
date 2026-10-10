<?php
/**
 * Create the first administrator, or promote an existing user (PRD AUTH-10).
 *
 *   php api/bin/create-admin.php admin@yourdomain.com "Full Name"
 *
 * New accounts: you are asked for a password (typed twice). Existing accounts
 * keep their password and are promoted to admin after confirmation.
 */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__) . '/bootstrap.php';

use Transenigma\Repositories\UserRepository;
use Transenigma\Services\AuditService;
use Transenigma\Services\PasswordPolicy;

$email = mb_strtolower(trim($argv[1] ?? ''));
$name = trim($argv[2] ?? '');
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "Usage: php api/bin/create-admin.php <email> \"<full name>\"\n");
    exit(1);
}

function ask(string $prompt): string
{
    echo $prompt;
    return rtrim((string) fgets(STDIN), "\r\n");
}

$existing = UserRepository::findByEmail($email);
if ($existing !== null) {
    if ($existing['role'] === 'admin') {
        echo "$email is already an administrator.\n";
        exit(0);
    }
    if (strtolower(ask("$email already has an account ({$existing['name']}). Promote it to admin? [y/N] ")) !== 'y') {
        echo "Cancelled.\n";
        exit(1);
    }
    UserRepository::setRole((int) $existing['id'], 'admin');
    AuditService::log('ADMIN_PROMOTED_CLI', 'system', null, 'user', $existing['id'], ['email' => $email]);
    echo "Done: $email is now an administrator.\n";
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
    AuditService::log('ADMIN_CREATED_CLI', 'system', null, 'user', $id, ['email' => $email]);
    echo "Done: administrator $email created. You can now sign in at /login.\n";
    exit(0);
}

fwrite(STDERR, "Too many attempts.\n");
exit(1);
