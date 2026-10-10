<?php
/**
 * Daily housekeeping — schedule once a day (DreamHost panel → Cron Jobs):
 *   php /home/<user>/<domain>/api/bin/cron-daily.php
 */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__) . '/bootstrap.php';

use Transenigma\Core\Config;
use Transenigma\Core\Database;
use Transenigma\Core\Logger;
use Transenigma\Core\Session;
use Transenigma\Services\AssessmentService;

$expired = AssessmentService::expireInactive();
$tokens = Database::run('DELETE FROM auth_tokens WHERE expires_at < UTC_TIMESTAMP() - INTERVAL 7 DAY')->rowCount();
$limits = Database::run('DELETE FROM rate_limits WHERE window_start < ?', [time() - 86400])->rowCount();
$sessions = Session::purgeFiles(Config::path('sessions'), Config::int('session.lifetime_days', 30) * 86400);

$summary = compact('expired', 'tokens', 'limits', 'sessions');
Logger::info('Daily housekeeping', $summary);
echo json_encode($summary), PHP_EOL;
