<?php
declare(strict_types=1);

namespace Transenigma\Controllers;

use Transenigma\Core\RateLimiter;
use Transenigma\Core\Request;
use Transenigma\Core\Response;
use Transenigma\Core\Validator;
use Transenigma\Services\AuthService;
use Transenigma\Services\VisitService;

/** Private visit counter (Phase 5 slice D). */
final class VisitController
{
    /** POST /api/visit {path, referrer?} — counted silently; always 204-like ok so the page never cares. */
    public function record(Request $request): Response
    {
        // Generous: a reader clicking around is fine, a script replaying the beacon is not. Mobile networks in India
        // put many phones behind one address, so the limit is per address, not per person.
        if (!RateLimiter::tooMany('visit', $request->ip(), 1500, 3600)) {
            RateLimiter::hit('visit', $request->ip(), PHP_INT_MAX, 3600);
            $data = Validator::validate($request->json(), ['path' => 'required|string|max:500', 'referrer' => 'nullable|string|max:500']);
            VisitService::record($data['path'], $data['referrer'] ?? null, AuthService::user() !== null, $request);
        }
        return Response::ok(null);
    }

    /** GET /api/admin/visitors?days=30 */
    public function metrics(Request $request): Response
    {
        $f = Validator::validate($request->query, ['days' => 'int|min:1|max:365']);
        return Response::ok(VisitService::metrics($f['days'] ?? 30));
    }
}
