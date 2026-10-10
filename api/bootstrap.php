<?php
/**
 * Shared bootstrap for the HTTP front controller and CLI scripts.
 */
declare(strict_types=1);

const API_ROOT = __DIR__;

if (PHP_VERSION_ID < 80200) {
    http_response_code(500);
    exit('PHP 8.2 or newer is required.');
}

spl_autoload_register(static function (string $class): void {
    $map = [
        'Transenigma\\' => API_ROOT . '/src/',
        'PHPMailer\\PHPMailer\\' => API_ROOT . '/lib/PHPMailer/', // bundled, see lib/PHPMailer/VERSION
    ];
    foreach ($map as $prefix => $dir) {
        if (strncmp($class, $prefix, strlen($prefix)) === 0) {
            $file = $dir . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
            if (is_file($file)) {
                require $file;
            }
            return;
        }
    }
});

mb_internal_encoding('UTF-8');
date_default_timezone_set('UTC');

// Turn every PHP warning/notice into an exception so nothing fails silently.
set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    throw new ErrorException($message, 0, $severity, $file, $line);
});

\Transenigma\Core\Config::load();

ini_set('display_errors', \Transenigma\Core\Config::bool('app.debug') && PHP_SAPI === 'cli' ? '1' : '0');
ini_set('log_errors', '1');
ini_set('error_log', \Transenigma\Core\Config::path('logs') . '/php-error.log');
