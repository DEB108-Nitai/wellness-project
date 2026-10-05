<?php
declare(strict_types=1);

namespace Wellness\Controllers;

use Wellness\Core\Request;
use Wellness\Core\Response;
use Wellness\Services\SettingsService;

final class SettingsController
{
    /** GET /api/settings/public — values the SPA needs on every page load. */
    public function public(Request $request): Response
    {
        return Response::ok(SettingsService::public());
    }
}
