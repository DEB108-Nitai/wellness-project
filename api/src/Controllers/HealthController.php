<?php
declare(strict_types=1);

namespace Transenigma\Controllers;

use Throwable;
use Transenigma\Core\Database;
use Transenigma\Core\Logger;
use Transenigma\Core\Request;
use Transenigma\Core\Response;

final class HealthController
{
    /** GET /api/health — liveness + database check (no internal details exposed). */
    public function show(Request $request): Response
    {
        try {
            Database::value('SELECT 1');
            $db = 'ok';
        } catch (Throwable $e) {
            Logger::exception($e, ['check' => 'health']);
            $db = 'unavailable';
        }

        $status = $db === 'ok' ? 200 : 503;
        return Response::ok(['status' => $db === 'ok' ? 'ok' : 'degraded', 'database' => $db, 'time' => gmdate('c')], $status);
    }
}
