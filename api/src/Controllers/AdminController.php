<?php
declare(strict_types=1);

namespace Transenigma\Controllers;

use Transenigma\Core\Request;
use Transenigma\Core\Response;
use Transenigma\Core\Validator;
use Transenigma\Services\AuditService;
use Transenigma\Services\AuthService;
use Transenigma\Services\ChallengeService;
use Transenigma\Services\SettingsService;

/**
 * Admin endpoints delivered in Phase 4 (registrations + settings).
 * Every route using this controller is declared with ['auth' => 'admin'].
 */
final class AdminController
{
    /** GET /api/admin/registrations?program=&status=&q=&page=&perPage= */
    public function registrations(Request $request): Response
    {
        $f = Validator::validate($request->query, [
            'program' => 'in:' . implode(',', ChallengeService::PROGRAMS),
            'status' => 'in:' . implode(',', ChallengeService::STATUSES),
            'q' => 'string|max:100',
            'page' => 'int|min:1|max:100000',
            'perPage' => 'int|min:5|max:100',
        ]);
        return Response::ok(ChallengeService::search($f, $f['page'] ?? 1, $f['perPage'] ?? 25));
    }

    /** PATCH /api/admin/registrations/{id} {status?, adminNotes?} */
    public function updateRegistration(Request $request): Response
    {
        $data = Validator::validate($request->json(), [
            'status' => 'in:' . implode(',', ChallengeService::STATUSES),
            'adminNotes' => 'nullable|string|max:2000',
        ]);
        return Response::ok(ChallengeService::update((int) $request->param('id'), $data, AuthService::requireUser(), $request));
    }

    /** GET /api/admin/export/registrations — streamed CSV. */
    public function exportRegistrations(Request $request): Response
    {
        $f = Validator::validate($request->query, [
            'program' => 'in:' . implode(',', ChallengeService::PROGRAMS),
            'status' => 'in:' . implode(',', ChallengeService::STATUSES),
            'q' => 'string|max:100',
        ]);
        AuditService::forUser(AuthService::requireUser(), 'EXPORT_REGISTRATIONS', 'export', 'registrations', $f, $request);
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="transenigma-registrations-' . gmdate('Ymd-His') . '.csv"');
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');
        ChallengeService::exportCsv($f);
        return new Response(200, null);
    }

    /** GET /api/admin/settings */
    public function settings(Request $request): Response
    {
        return Response::ok(SettingsService::all());
    }

    /** PUT /api/admin/settings {key: value, ...} */
    public function updateSettings(Request $request): Response
    {
        $admin = AuthService::requireUser();
        $changes = $request->json();
        $before = SettingsService::all();
        $after = SettingsService::update($changes, (int) $admin['id']);
        $diff = [];
        foreach ($changes as $key => $_) {
            if (($before[$key] ?? null) !== ($after[$key] ?? null)) {
                $diff[$key] = ['from' => $before[$key] ?? null, 'to' => $after[$key]];
            }
        }
        if ($diff) {
            AuditService::forUser($admin, 'SETTINGS_UPDATED', 'settings', 'global', $diff, $request);
        }
        return Response::ok($after);
    }
}
