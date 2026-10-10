<?php
declare(strict_types=1);

namespace Transenigma\Controllers;

use Transenigma\Core\Request;
use Transenigma\Core\Response;
use Transenigma\Core\Validator;
use Transenigma\Repositories\UserRepository;
use Transenigma\Services\AuditService;
use Transenigma\Services\AuthService;
use Transenigma\Services\PasswordPolicy;

final class AccountController
{
    /** PATCH /api/account — update profile (name). */
    public function update(Request $request): Response
    {
        $user = AuthService::requireUser();
        $data = Validator::validate($request->json(), ['name' => 'required|string|min:2|max:100']);
        if ($data['name'] !== $user['name']) {
            UserRepository::updateName((int) $user['id'], $data['name']);
            AuditService::forUser($user, 'ACCOUNT_UPDATED', 'user', null, ['fields' => ['name']], $request);
            AuthService::flush();
        }
        return Response::ok(AuthService::sessionPayload());
    }

    /** POST /api/account/password — change (or, for Google-only accounts, set) the password. */
    public function changePassword(Request $request): Response
    {
        $user = AuthService::requireUser();
        $data = Validator::validate($request->json(), [
            'currentPassword' => 'string|max:' . PasswordPolicy::MAX,
            'newPassword' => 'required|string|max:' . PasswordPolicy::MAX,
        ]);
        AuthService::changePassword($user, $data['currentPassword'] ?? null, $data['newPassword'], $request);
        return Response::ok(AuthService::sessionPayload());
    }
}
