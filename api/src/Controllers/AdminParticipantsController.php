<?php
declare(strict_types=1);

namespace Transenigma\Controllers;

use Transenigma\Core\Request;
use Transenigma\Core\Response;
use Transenigma\Core\Validator;
use Transenigma\Services\AdminParticipantsService;
use Transenigma\Services\AuditService;
use Transenigma\Services\AuthService;
use Transenigma\Support\Csv;
use Transenigma\Support\DateRange;

/**
 * Admin: assessments and results against people's names (Phase 5 slice C; PRD ADM-2, ADM-3).
 * Every route using this controller is declared with ['auth' => 'admin'].
 */
final class AdminParticipantsController
{
    private function filters(Request $request, array $extra = []): array
    {
        $f = Validator::validate($request->query, [
            'status' => 'in:' . implode(',', AdminParticipantsService::STATUSES),
            'flagged' => 'bool',
            'country' => 'string|regex:/^[A-Z]{2}$/',
            'account' => 'in:user,guest',
            'from' => DateRange::RULE,
            'to' => DateRange::RULE,
            'q' => 'string|max:100',
        ] + $extra);
        DateRange::check($f);
        return $f;
    }

    /** GET /api/admin/sessions?status=&flagged=&country=&account=&from=&to=&q=&page=&perPage= */
    public function sessions(Request $request): Response
    {
        $f = $this->filters($request, ['page' => 'int|min:1|max:100000', 'perPage' => 'int|min:5|max:100']);
        return Response::ok(AdminParticipantsService::search($f, $f['page'] ?? 1, $f['perPage'] ?? 25));
    }

    /** GET /api/admin/sessions/{ref} — viewing someone's answers is recorded in the audit log. */
    public function session(Request $request): Response
    {
        $detail = AdminParticipantsService::detail($request->param('ref'));
        AuditService::forUser(AuthService::requireUser(), 'ADMIN_VIEWED_ASSESSMENT', 'test_session', $detail['ref'], [], $request);
        return Response::ok($detail);
    }

    /** GET /api/admin/export/sessions?answers=1&… — streamed CSV, audited. */
    public function exportSessions(Request $request): Response
    {
        $f = $this->filters($request, ['answers' => 'bool']);
        $withAnswers = (bool) ($f['answers'] ?? false);
        unset($f['answers']);
        AuditService::forUser(AuthService::requireUser(), 'EXPORT_SESSIONS', 'export', 'sessions', $f + ['answers' => $withAnswers], $request);
        Csv::headers('assessments');
        AdminParticipantsService::exportCsv($f, $withAnswers);
        return Response::streamed();
    }
}
