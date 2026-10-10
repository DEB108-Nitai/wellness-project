<?php
declare(strict_types=1);

namespace Transenigma\Controllers;

use Transenigma\Core\Request;
use Transenigma\Core\Response;
use Transenigma\Services\SettingsService;

final class SettingsController
{
    /** GET /api/settings/public — values the SPA needs on every page load. */
    public function public(Request $request): Response
    {
        return Response::ok(SettingsService::public());
    }
}
