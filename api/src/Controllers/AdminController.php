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
use Transenigma\Support\DateRange;

/**
 * Admin endpoints delivered in Phase 4 (registrations + settings).
 * Every route using this controller is declared with ['auth' => 'admin'].
 */
final class AdminController
{
    /** GET /api/admin/dashboard (PRD ADM-1) */
    public function dashboard(Request $request): Response
    {
        return Response::ok(\Transenigma\Services\AdminDashboardService::summary());
    }

    /** The registration filters shared by the list, the charts and the CSV export. */
    private function registrationFilters(Request $request, array $extra = []): array
    {
        $f = Validator::validate($request->query, [
            'program' => 'in:' . implode(',', ChallengeService::PROGRAMS),
            'status' => 'in:' . implode(',', ChallengeService::STATUSES),
            'cohort' => 'in:' . implode(',', ChallengeService::TIMINGS),
            'from' => DateRange::RULE,
            'to' => DateRange::RULE,
            'q' => 'string|max:100',
        ] + $extra);
        DateRange::check($f);
        return $f;
    }

    /** GET /api/admin/registrations?program=&status=&cohort=&from=&to=&q=&page=&perPage= */
    public function registrations(Request $request): Response
    {
        $f = $this->registrationFilters($request, ['page' => 'int|min:1|max:100000', 'perPage' => 'int|min:5|max:100']);
        return Response::ok(ChallengeService::search($f, $f['page'] ?? 1, $f['perPage'] ?? 25));
    }

    /** GET /api/admin/registrations/stats — charts over the same filters as the list. */
    public function registrationStats(Request $request): Response
    {
        return Response::ok(ChallengeService::stats($this->registrationFilters($request)));
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
        $f = $this->registrationFilters($request);
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
