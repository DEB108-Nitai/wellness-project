<?php
declare(strict_types=1);

namespace Transenigma\Controllers;

use Transenigma\Core\HttpException;
use Transenigma\Core\Request;
use Transenigma\Core\Response;
use Transenigma\Services\AssessmentService;
use Transenigma\Services\AuditService;
use Transenigma\Services\AuthService;
use Transenigma\Services\ResultsService;

final class ResultsController
{
    /** GET /api/results — My Results. */
    public function index(Request $request): Response
    {
        return Response::ok(ResultsService::history((int) AuthService::requireUser()['id']));
    }

    /** GET /api/results/{ref} — owner or admin; guests get 401 RESULTS_LOCKED. */
    public function show(Request $request): Response
    {
        return Response::ok(ResultsService::forViewer($request->param('ref'), AuthService::user()));
    }

    /** POST /api/results/{ref}/share */
    public function share(Request $request): Response
    {
        $session = $this->ownedCompleted($request);
        $token = ResultsService::enableShare($session);
        AuditService::forUser(AuthService::requireUser(), 'RESULTS_SHARE_ENABLED', 'test_session', $session['public_ref'], [], $request);
        return Response::ok(['shareToken' => $token]);
    }

    /** DELETE /api/results/{ref}/share */
    public function unshare(Request $request): Response
    {
        $session = $this->ownedCompleted($request);
        ResultsService::disableShare($session);
        AuditService::forUser(AuthService::requireUser(), 'RESULTS_SHARE_DISABLED', 'test_session', $session['public_ref'], [], $request);
        return Response::ok(['shareToken' => null]);
    }

    /** GET /api/shared/{token} — public, read-only. */
    public function shared(Request $request): Response
    {
        return Response::ok(ResultsService::shared($request->param('token')));
    }

    private function ownedCompleted(Request $request): array
    {
        $user = AuthService::requireUser();
        $session = AssessmentService::byRef($request->param('ref'));
        if ($session === null || (int) $session['user_id'] !== (int) $user['id']) {
            throw HttpException::notFound('We could not find that report.');
        }
        return $session;
    }
}
