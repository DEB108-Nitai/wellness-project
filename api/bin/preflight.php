<?php
/**
 * Deploy check: run on the server before switching the site over, and again after.
 * It reads the configuration but never prints a secret, only whether each one looks right.
 *
 *   php api/bin/preflight.php
 *
 * Exit code 0 = ready (warnings allowed), 1 = something must be fixed first.
 */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$fails = 0;
$warns = 0;
$line = static function (string $status, string $what, string $detail = '') use (&$fails, &$warns): void {
    if ($status === 'FAIL') {
        $fails++;
    } elseif ($status === 'WARN') {
        $warns++;
    }
    printf("  %-4s  %s%s\n", $status, $what, $detail === '' ? '' : " — $detail");
};

echo "PHP\n";
$line(PHP_VERSION_ID >= 80200 ? 'ok' : 'FAIL', 'PHP ' . PHP_VERSION, PHP_VERSION_ID >= 80200 ? '' : 'needs 8.2 or newer (DreamHost panel → Manage Websites → PHP version)');
foreach (['pdo_mysql' => 'database', 'openssl' => 'two-step sign-in secrets', 'mbstring' => 'text handling', 'fileinfo' => 'image uploads',
    'curl' => 'Google sign-in', 'json' => 'API', 'session' => 'sign-in'] as $ext => $why) {
    $line(extension_loaded($ext) ? 'ok' : 'FAIL', "extension $ext", extension_loaded($ext) ? '' : "missing; needed for $why");
}
if (extension_loaded('openssl')) {
    $gcm = in_array('aes-256-gcm', openssl_get_cipher_methods(), true);
    $line($gcm ? 'ok' : 'FAIL', 'AES-256-GCM cipher', $gcm ? '' : 'missing; admin authenticator secrets cannot be stored');
}
$line(defined('PASSWORD_ARGON2ID') ? 'ok' : 'WARN', 'Argon2id passwords', defined('PASSWORD_ARGON2ID') ? '' : 'not available; passwords fall back to bcrypt (still safe)');

// Loads the config (production: ../transenigma-config/config.php) and stops with a clear message if it is missing or incomplete.
require dirname(__DIR__) . '/bootstrap.php';

use Transenigma\Core\Config;
use Transenigma\Core\Database;
use Transenigma\Migrations\Migrator;

echo "\nConfiguration (values are never shown)\n";
$prod = Config::isProduction();
$line($prod ? 'ok' : 'WARN', "app.env = '" . Config::string('app.env') . "'", $prod ? '' : "set 'production' on the live server");
$debug = Config::bool('app.debug');
$line($prod && $debug ? 'FAIL' : 'ok', 'app.debug ' . ($debug ? 'on' : 'off'), $prod && $debug ? 'must be false in production (it would show error details to visitors)' : '');
$url = Config::string('app.url');
$https = str_starts_with($url, 'https://') && !str_ends_with($url, '/');
$line($https || !$prod ? 'ok' : 'FAIL', "app.url = $url", $https || !$prod ? '' : 'use https://transenigma.com (https, no trailing slash)');
$secret = Config::string('app.secret');
$secretOk = preg_match('/^[0-9a-f]{64,}$/i', $secret) === 1;
$line($secretOk ? 'ok' : ($prod ? 'FAIL' : 'WARN'), 'app.secret', $secretOk ? strlen($secret) . ' hex characters' : 'set 64 random hex characters: php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"');
$mail = Config::string('mail.host') !== '' && Config::string('mail.username') !== '' && Config::string('mail.password') !== '' && Config::string('mail.from_email') !== '';
$line($mail ? 'ok' : ($prod ? 'FAIL' : 'WARN'), 'mail (SMTP)', $mail ? 'host, user, password and sender set' : 'incomplete; emails would only be written to files');
$google = Config::string('google.client_id') !== '' && Config::string('google.client_secret') !== '';
$line($google ? 'ok' : 'WARN', 'Google sign-in', $google ? 'client id and secret set' : 'not set; the Google button is hidden');

echo "\nDatabase\n";
try {
    $version = (string) Database::value('SELECT VERSION()');
    $line('ok', 'connected', "MySQL $version");
    $skew = abs((int) Database::value('SELECT TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), ?)', [gmdate('Y-m-d H:i:s')]));
    $line($skew <= 120 ? 'ok' : 'WARN', 'database and PHP clocks agree', $skew <= 120 ? '' : "{$skew}s apart; codes and links may expire early");
    $pending = array_keys(array_filter((new Migrator(Config::path('migrations')))->status(), static fn ($applied) => !$applied));
    $line($pending === [] ? 'ok' : 'WARN', 'migrations', $pending === [] ? 'all applied' : count($pending) . ' pending; run php api/bin/migrate.php');
    if ($pending === []) {
        $admins = (int) Database::value("SELECT COUNT(*) FROM users WHERE role = 'admin' AND status = 'active'");
        $primary = (int) Database::value('SELECT COUNT(*) FROM users WHERE is_primary_admin = 1');
        $line($admins > 0 && $primary === 1 ? 'ok' : 'WARN', "admins: $admins, primary admin: $primary", $admins > 0 ? '' : 'run php api/bin/create-admin.php <email> "Name" --primary');
    }
} catch (Throwable $e) {
    $line('FAIL', 'cannot connect', $e->getMessage() . ' (check db.host, db.name, db.user, db.pass)');
}

echo "\nFolders\n";
foreach (['logs', 'sessions', 'cache', 'mail', 'uploads'] as $name) {
    try {
        $dir = Config::path($name);
        $probe = "$dir/.preflight-" . bin2hex(random_bytes(4));
        $writable = @file_put_contents($probe, 'x') === 1 && @unlink($probe);
        $line($writable ? 'ok' : 'FAIL', "$name folder writable", $writable ? '' : "$dir is not writable by PHP");
    } catch (Throwable $e) {
        $line('FAIL', "$name folder", $e->getMessage());
    }
}
$web = dirname(API_ROOT);
$line(is_file("$web/index.html") ? 'ok' : 'FAIL', 'site files (index.html beside api/)', is_file("$web/index.html") ? '' : 'upload the contents of dist/ to the web root');
$line(is_file("$web/.htaccess") ? 'ok' : 'FAIL', 'web root .htaccess', is_file("$web/.htaccess") ? '' : 'missing; page links, redirects and HTTPS rules will not work');
$line(is_file(API_ROOT . '/.htaccess') ? 'ok' : 'FAIL', 'api/.htaccess', is_file(API_ROOT . '/.htaccess') ? '' : 'missing; api files would be reachable from the web');
$norm = static fn (string $p): string => str_replace('\\', '/', realpath($p) ?: $p);
$inWebRoot = str_starts_with($norm((string) Config::file()), $norm($web) . '/');
$line($inWebRoot && $prod ? 'FAIL' : 'ok', 'config file outside the web root',
    $inWebRoot ? ($prod ? 'move it to ' . dirname($web) . '/transenigma-config/config.php' : 'local config.local.php, fine on this PC') : '');

echo $fails === 0
    ? "\nREADY" . ($warns ? " ($warns warning" . ($warns === 1 ? '' : 's') . ' above)' : '') . "\n"
    : "\nNOT READY: fix the $fails FAIL line" . ($fails === 1 ? '' : 's') . " above, then run this again.\n";
exit($fails === 0 ? 0 : 1);
