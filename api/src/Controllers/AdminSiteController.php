<?php
declare(strict_types=1);

namespace Transenigma\Controllers;

use Transenigma\Core\HttpException;
use Transenigma\Core\Request;
use Transenigma\Core\Response;
use Transenigma\Core\Validator;
use Transenigma\Services\AdminSiteService;
use Transenigma\Services\AuditService;
use Transenigma\Services\AuthService;
use Transenigma\Support\Csv;
use Transenigma\Support\DateRange;

/**
 * Admin: messages, subscribers, FAQs, audit log, question set and norms (Phase 5 slice H).
 * Every route using this controller is declared with ['auth' => 'admin'].
 */
final class AdminSiteController
{
    private const PAGING = ['page' => 'int|min:1|max:100000', 'perPage' => 'int|min:5|max:100'];
    private const FAQ_RULES = [
        'category' => 'string|min:2|max:40',
        'question' => 'string|min:5|max:255',
        'answer' => 'string|min:5|max:5000',
        'published' => 'bool',
    ];

    // ------------------------------------------------------------------ messages

    /** GET /api/admin/messages?status=&q=&from=&to=&page=&perPage= */
    public function messages(Request $request): Response
    {
        $f = $this->messageFilters($request, self::PAGING);
        return Response::ok(AdminSiteService::messages($f, $f['page'] ?? 1, $f['perPage'] ?? 25));
    }

    /** GET /api/admin/messages/{id} */
    public function message(Request $request): Response
    {
        return Response::ok(AdminSiteService::message((int) $request->param('id')));
    }

    /** PATCH /api/admin/messages/{id} {status: new|handled} */
    public function updateMessage(Request $request): Response
    {
        $data = Validator::validate($request->json(), ['status' => 'required|in:new,handled']);
        return Response::ok(AdminSiteService::setMessageStatus((int) $request->param('id'), $data['status'], AuthService::requireUser(), $request));
    }

    /** POST /api/admin/messages/{id}/reply {body}: emailed from the support address, kept, message marked handled. */
    public function replyMessage(Request $request): Response
    {
        $data = Validator::validate($request->json(), ['subject' => 'required|string|max:200', 'body' => 'required|string|min:2|max:5000']);
        return Response::ok(AdminSiteService::replyToMessage((int) $request->param('id'), $data['subject'], trim($data['body']), AuthService::requireUser(), $request));
    }

    /** GET /api/admin/export/messages — streamed CSV, audited. */
    public function exportMessages(Request $request): Response
    {
        $f = $this->messageFilters($request);
        AuditService::forUser(AuthService::requireUser(), 'EXPORT_MESSAGES', 'export', 'messages', $f, $request);
        Csv::headers('messages');
        AdminSiteService::exportMessages($f);
        return Response::streamed();
    }

    private function messageFilters(Request $request, array $extra = []): array
    {
        $f = Validator::validate($request->query, [
            'status' => 'in:new,handled',
            'q' => 'string|max:100',
            'from' => DateRange::RULE,
            'to' => DateRange::RULE,
        ] + $extra);
        DateRange::check($f);
        return $f;
    }

    // ------------------------------------------------------------------ subscribers

    /** GET /api/admin/subscribers?status=&q=&page=&perPage= */
    public function subscribers(Request $request): Response
    {
        $f = Validator::validate($request->query, ['status' => 'in:subscribed,unsubscribed', 'q' => 'string|max:100'] + self::PAGING);
        return Response::ok(AdminSiteService::subscribers($f, $f['page'] ?? 1, $f['perPage'] ?? 25));
    }

    /** GET /api/admin/export/subscribers?status= — streamed CSV, audited. */
    public function exportSubscribers(Request $request): Response
    {
        $f = Validator::validate($request->query, ['status' => 'in:subscribed,unsubscribed', 'q' => 'string|max:100']);
        AuditService::forUser(AuthService::requireUser(), 'EXPORT_SUBSCRIBERS', 'export', 'subscribers', $f, $request);
        Csv::headers('subscribers');
        AdminSiteService::exportSubscribers($f);
        return Response::streamed();
    }

    // ------------------------------------------------------------------ FAQs

    /** GET /api/admin/faqs */
    public function faqs(Request $request): Response
    {
        return Response::ok(AdminSiteService::faqs());
    }

    /** POST /api/admin/faqs {category, question, answer, published?} */
    public function createFaq(Request $request): Response
    {
        $rules = self::FAQ_RULES;
        foreach (['category', 'question', 'answer'] as $k) {
            $rules[$k] = 'required|' . $rules[$k];
        }
        $data = $this->trimmed(Validator::validate($request->json(), $rules));
        return Response::created(AdminSiteService::createFaq($data, AuthService::requireUser(), $request));
    }

    /** PATCH /api/admin/faqs/{id} */
    public function updateFaq(Request $request): Response
    {
        $data = $this->trimmed(Validator::validate($request->json(), self::FAQ_RULES));
        return Response::ok(AdminSiteService::updateFaq((int) $request->param('id'), $data, AuthService::requireUser(), $request));
    }

    /** DELETE /api/admin/faqs/{id} */
    public function deleteFaq(Request $request): Response
    {
        AdminSiteService::deleteFaq((int) $request->param('id'), AuthService::requireUser(), $request);
        return Response::ok(null);
    }

    /** POST /api/admin/faqs/reorder {ids: [every FAQ id, in the new order]} */
    public function reorderFaqs(Request $request): Response
    {
        $ids = $request->json()['ids'] ?? null;
        if (!is_array($ids) || $ids === [] || count($ids) > 500 || array_filter($ids, static fn ($id): bool => !is_int($id) || $id < 1) !== []
            || count(array_unique($ids)) !== count($ids)) {
            throw HttpException::validation(['ids' => 'Please send every FAQ id once, in the new order.']);
        }
        return Response::ok(AdminSiteService::reorderFaqs($ids, AuthService::requireUser(), $request));
    }

    // ------------------------------------------------------------------ audit log, question set, norms (read-only)

    /** GET /api/admin/audit?action=&actorType=&actor=&from=&to=&page=&perPage= */
    public function audit(Request $request): Response
    {
        $f = Validator::validate($request->query, [
            'action' => 'string|regex:/^[A-Z0-9_]{2,64}$/',
            'actorType' => 'in:guest,user,admin,system',
            'actor' => 'string|max:100',
            'from' => DateRange::RULE,
            'to' => DateRange::RULE,
        ] + self::PAGING);
        DateRange::check($f);
        return Response::ok(AdminSiteService::audit($f, $f['page'] ?? 1, $f['perPage'] ?? 50));
    }

    /** GET /api/admin/items */
    public function items(Request $request): Response
    {
        return Response::ok(AdminSiteService::items());
    }

    /** GET /api/admin/norms */
    public function norms(Request $request): Response
    {
        return Response::ok(AdminSiteService::norms());
    }

    // ------------------------------------------------------------------ helpers

    private function trimmed(array $data): array
    {
        foreach (['category', 'question', 'answer'] as $k) {
            if (isset($data[$k])) {
                $data[$k] = trim((string) $data[$k]);
            }
        }
        return $data;
    }

}
