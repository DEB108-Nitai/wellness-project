<?php
declare(strict_types=1);

namespace Wellness\Controllers;

use Wellness\Core\Request;
use Wellness\Core\Response;
use Wellness\Core\Validator;
use Wellness\Services\SiteService;
use Wellness\Services\SpamGuard;

final class SiteController
{
    /** POST /api/contact */
    public function contact(Request $request): Response
    {
        $body = $request->json();
        SpamGuard::check($body);
        $data = Validator::validate($body, [
            'name' => 'required|string|min:2|max:100',
            'email' => 'required|email',
            'subject' => 'string|max:150',
            'message' => 'required|string|min:10|max:5000',
        ]);
        SiteService::contact($data, $request);
        return Response::created(['message' => 'Thank you! Your message has been sent. We usually reply within two working days.']);
    }

    /** POST /api/newsletter/subscribe */
    public function subscribe(Request $request): Response
    {
        $body = $request->json();
        SpamGuard::check($body);
        $data = Validator::validate($body, ['email' => 'required|email']);
        SiteService::subscribe($data['email'], $request);
        return Response::ok(['message' => 'Thank you for subscribing!']);
    }

    /** POST /api/newsletter/unsubscribe {token} */
    public function unsubscribe(Request $request): Response
    {
        $data = Validator::validate($request->json(), ['token' => 'required|string|regex:/^[a-f0-9]{32}$/']);
        SiteService::unsubscribe($data['token']);
        return Response::ok(['message' => 'You have been unsubscribed.']);
    }

    /** GET /api/faqs */
    public function faqs(Request $request): Response
    {
        return Response::ok(SiteService::faqs());
    }
}
