<?php
declare(strict_types=1);

namespace Wellness\Controllers;

use Wellness\Core\Request;
use Wellness\Core\Response;
use Wellness\Services\ContentService;

/** Public Transenigma company content (slice S5). */
final class ContentController
{
    /** GET /api/content/team */
    public function team(Request $request): Response
    {
        return Response::ok(ContentService::team());
    }

    /** GET /api/content/research */
    public function research(Request $request): Response
    {
        return Response::ok(ContentService::research());
    }

    /** GET /api/content/ventures */
    public function ventures(Request $request): Response
    {
        return Response::ok(ContentService::ventures());
    }

    /** GET /api/content/consultancy */
    public function consultancy(Request $request): Response
    {
        return Response::ok(ContentService::consultancy());
    }
}
