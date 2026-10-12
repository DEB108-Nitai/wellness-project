<?php
declare(strict_types=1);

namespace Transenigma\Controllers;

use Transenigma\Core\Request;
use Transenigma\Core\Response;
use Transenigma\Core\Validator;
use Transenigma\Services\AuthService;
use Transenigma\Services\TwoFactorService;

/** Admin two-step sign-in (ADM-12): the sign-in steps under /auth/2fa, the admin's own settings under /admin/security. */
final class TwoFactorController
{
    /** POST /api/auth/2fa/setup: the secret and QR link for a first-time setup. */
    public function setup(Request $request): Response
    {
        return Response::ok(TwoFactorService::setup());
    }

    /** POST /api/auth/2fa/enable {code}: turns it on, signs in, returns the recovery codes (shown once). */
    public function enable(Request $request): Response
    {
        $codes = TwoFactorService::enable($this->code($request), $request);
        return Response::ok(AuthService::sessionPayload() + ['recoveryCodes' => $codes]);
    }

    /** POST /api/auth/2fa/verify {code}: an app code or a recovery code; signs in. */
    public function verify(Request $request): Response
    {
        $left = TwoFactorService::verify($this->code($request), $request);
        return Response::ok(AuthService::sessionPayload() + ($left === null ? [] : ['recoveryCodesLeft' => $left]));
    }

    /** GET /api/admin/security */
    public function status(Request $request): Response
    {
        return Response::ok(TwoFactorService::status(AuthService::requireUser()));
    }

    /** POST /api/admin/security/recovery-codes {code} */
    public function regenerate(Request $request): Response
    {
        $codes = TwoFactorService::regenerateRecoveryCodes(AuthService::requireUser(), $this->code($request), $request);
        return Response::ok(['recoveryCodes' => $codes]);
    }

    /** POST /api/admin/security/authenticator {code}: start moving to a new phone or app. */
    public function startReplace(Request $request): Response
    {
        return Response::ok(TwoFactorService::startReplace(AuthService::requireUser(), $this->code($request), $request));
    }

    /** POST /api/admin/security/authenticator/confirm {code} */
    public function confirmReplace(Request $request): Response
    {
        TwoFactorService::confirmReplace(AuthService::requireUser(), $this->code($request), $request);
        AuthService::flush();
        return Response::ok(TwoFactorService::status(AuthService::requireUser()));
    }

    private function code(Request $request): string
    {
        return Validator::validate($request->json(), ['code' => 'required|string|max:20'])['code'];
    }
}
