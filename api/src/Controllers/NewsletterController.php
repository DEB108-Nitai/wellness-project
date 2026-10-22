<?php
declare(strict_types=1);

namespace Transenigma\Controllers;

use Transenigma\Core\HttpException;
use Transenigma\Core\Request;
use Transenigma\Core\Response;
use Transenigma\Services\AuthService;
use Transenigma\Services\NewsletterService;

/**
 * Admin: write, preview, test and send newsletters (owner, 2026-10-22).
 * Every route using this controller is declared with ['auth' => 'admin']. Content is checked by NewsletterService.
 */
final class NewsletterController
{
    /** GET /api/admin/newsletters */
    public function index(Request $request): Response
    {
        return Response::ok(NewsletterService::all());
    }

    /** POST /api/admin/newsletters → a new, empty draft */
    public function create(Request $request): Response
    {
        return Response::created(NewsletterService::create(AuthService::requireUser(), $request));
    }

    /** GET /api/admin/newsletters/{id} */
    public function show(Request $request): Response
    {
        return Response::ok(NewsletterService::get((int) $request->param('id')));
    }

    /** PUT /api/admin/newsletters/{id} {subject, preheader, coverImage, blocks} */
    public function update(Request $request): Response
    {
        return Response::ok(NewsletterService::update((int) $request->param('id'), $request->json(), AuthService::requireUser(), $request));
    }

    /** DELETE /api/admin/newsletters/{id} (drafts only) */
    public function delete(Request $request): Response
    {
        NewsletterService::delete((int) $request->param('id'), AuthService::requireUser(), $request);
        return Response::ok(null);
    }

    /** POST /api/admin/newsletters/{id}/copy → a new draft with the same content */
    public function copy(Request $request): Response
    {
        return Response::created(NewsletterService::copy((int) $request->param('id'), AuthService::requireUser(), $request));
    }

    /** POST /api/admin/newsletters/preview {subject, preheader, coverImage, blocks} → {html} */
    public function preview(Request $request): Response
    {
        return Response::ok(['html' => NewsletterService::preview($request->json())]);
    }

    /** POST /api/admin/newsletters/{id}/test → sends the saved draft to the signed-in admin */
    public function test(Request $request): Response
    {
        return Response::ok(NewsletterService::sendTest((int) $request->param('id'), AuthService::requireUser(), $request));
    }

    /** POST /api/admin/newsletters/{id}/send → queues the saved draft for every subscriber */
    public function send(Request $request): Response
    {
        return Response::ok(NewsletterService::send((int) $request->param('id'), AuthService::requireUser(), $request));
    }

    /** POST /api/admin/uploads/newsletter-image (multipart, field "image") → {path} */
    public function uploadImage(Request $request): Response
    {
        $file = $request->file('image') ?? throw HttpException::validation(['image' => 'Please choose an image.']);
        return Response::created(['path' => NewsletterService::storeImage($file, AuthService::requireUser(), $request)]);
    }
}
