<?php
/**
 * Wellness API configuration — TEMPLATE.
 *
 * Local (XAMPP):  copy to api/config/config.local.php
 * Production:     copy to ../wellness-config/config.php  (one level ABOVE the web root,
 *                 e.g. /home/<user>/wellness-config/config.php next to /home/<user>/<domain>/)
 *
 * Never commit the real file. Generate secrets with:
 *   php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
 */
return [
    'app' => [
        'env' => 'local',                       // 'local' | 'production'
        'debug' => true,                        // MUST be false in production
        'url' => 'http://localhost:3000',       // public site URL (emails, OAuth redirect, origin check)
        'allowed_origins' => [],                // extra origins allowed to call the API (rarely needed)
        'secret' => 'REPLACE_WITH_64_HEX_CHARS', // HMAC key for IP hashing / rate-limit keys
        'trust_cloudflare' => false,            // true only when the site sits behind Cloudflare
    ],

    'db' => [
        'host' => 'localhost',                  // DreamHost: e.g. mysql.yourdomain.com
        'port' => 3306,
        'name' => 'wellness16pf',
        'user' => 'wellness16pf_app',
        'pass' => '',
    ],

    // Separate database used only by `php api/tests/run.php` (wiped on every run).
    'db_test' => [
        'name' => 'wellness16pf_test',
    ],

    'session' => [
        'lifetime_days' => 30,
        'admin_idle_minutes' => 720,
    ],

    // Optional overrides; defaults are api/storage/* and ../database/migrations
    'paths' => [
        'logs' => null,
        'mail' => null,                         // where emails are written when no SMTP host is set
        'sessions' => null,
        'cache' => null,
        'migrations' => null,
    ],

    // Filled in during Phase 2 (owner provides values).
    'mail' => [
        'host' => '',
        'port' => 587,
        'encryption' => 'tls',                  // 'tls' (587) | 'ssl' (465)
        'username' => '',
        'password' => '',
        'from_email' => '',
        'from_name' => 'Wellness',
    ],

    'google' => [
        'client_id' => '',
        'client_secret' => '',
    ],
];
