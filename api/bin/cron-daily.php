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

use Transenigma\Core\Database;
use Transenigma\Core\Logger;
use Transenigma\Services\AssessmentService;

$expired = AssessmentService::expireInactive();
$tokens = Database::run('DELETE FROM auth_tokens WHERE expires_at < UTC_TIMESTAMP() - INTERVAL 7 DAY')->rowCount();
$limits = Database::run('DELETE FROM rate_limits WHERE window_start < ?', [time() - 86400])->rowCount();

$summary = compact('expired', 'tokens', 'limits');
Logger::info('Daily housekeeping', $summary);
echo json_encode($summary), PHP_EOL;
