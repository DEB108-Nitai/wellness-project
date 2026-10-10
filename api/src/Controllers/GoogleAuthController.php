<?php
declare(strict_types=1);

namespace Transenigma\Controllers;

use Throwable;
use Transenigma\Core\Config;
use Transenigma\Core\HttpException;
use Transenigma\Core\Logger;
use Transenigma\Core\RateLimiter;
use Transenigma\Core\Request;
use Transenigma\Core\Response;
use Transenigma\Core\Session;
use Transenigma\Services\GoogleOAuth;

/**
 * Browser-redirect endpoints (not JSON): the SPA links to /api/auth/google/start
 * and Google sends the user back to /api/auth/google/callback.
 */
final class GoogleAuthController
{
    /** GET /api/auth/google/start?next=/path */
    public function start(Request $request): Response
    {
        if (!GoogleOAuth::isConfigured()) {
            return $this->toLogin('google_unavailable');
        }
        try {
            RateLimiter::hit('google_start', $request->ip(), 30, 900);
        } catch (HttpException) {
            return $this->toLogin('rate_limited');
        }
        Session::start($request);
        return Response::redirect(GoogleOAuth::authorizationUrl((string) $request->query('next', '/')));
    }

    /** GET /api/auth/google/callback?code=…&state=… */
    public function callback(Request $request): Response
    {
        Session::start($request);
        try {
            $next = GoogleOAuth::handleCallback($request);
            return Response::redirect($this->site($next));
        } catch (HttpException $e) {
            return $this->toLogin(strtolower($e->errorCode));
        } catch (Throwable $e) {
            Logger::exception($e, ['flow' => 'google_callback']);
            return $this->toLogin('google_failed');
        }
    }

    private function toLogin(string $error): Response
    {
        return Response::redirect($this->site('/login?error=' . rawurlencode($error)));
    }

    private function site(string $path): string
    {
        return rtrim(Config::string('app.url'), '/') . $path;
    }
}
