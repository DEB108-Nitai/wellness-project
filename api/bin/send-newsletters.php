<?php
/**
 * Sends queued newsletter emails in batches — schedule every 10 minutes (DreamHost panel → Cron Jobs):
 *   php /home/<user>/<domain>/api/bin/send-newsletters.php
 * Stays under mail.newsletter_per_hour (default 80) so the mailbox's hourly limit is never hit and
 * sign-up / password emails still get through. Does nothing (and prints nothing) when the queue is empty.
 */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__) . '/bootstrap.php';

use Transenigma\Core\Logger;
use Transenigma\Services\NewsletterService;

$result = NewsletterService::processQueue();
if ($result['sent'] + $result['failed'] + $result['skipped'] + $result['finished'] > 0) {
    Logger::info('Newsletter batch', $result);
    echo json_encode($result), PHP_EOL;
}
