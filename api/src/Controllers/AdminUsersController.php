<?php
declare(strict_types=1);

namespace Transenigma\Controllers;

use Transenigma\Core\Request;
use Transenigma\Core\Response;
use Transenigma\Core\Validator;
use Transenigma\Services\AdminTeamService;
use Transenigma\Services\AdminUsersService;
use Transenigma\Services\AuthService;

/**
 * Admin: user accounts (slice F; ADM-6, ADM-11) and the admin team (slice F2: primary admin only for changes).
 * Every route using this controller is declared with ['auth' => 'admin'].
 */
final class AdminUsersController
{
    /** GET /api/admin/users?q=&role=&status=&page=&perPage= */
    public function users(Request $request): Response
    {
        $f = Validator::validate($request->query, [
            'q' => 'string|max:100',
            'role' => 'in:user,admin',
            'status' => 'in:active,disabled,anonymised',
            'page' => 'int|min:1|max:100000',
            'perPage' => 'int|min:5|max:100',
        ]);
        return Response::ok(AdminUsersService::search($f, $f['page'] ?? 1, $f['perPage'] ?? 25));
    }

    /** GET /api/admin/users/{id} */
    public function user(Request $request): Response
    {
        return Response::ok(AdminUsersService::detail((int) $request->param('id')));
    }

    /** PATCH /api/admin/users/{id} {status: active|disabled} */
    public function updateUser(Request $request): Response
    {
        $data = Validator::validate($request->json(), ['status' => 'required|in:active,disabled']);
        return Response::ok(AdminUsersService::setStatus((int) $request->param('id'), $data['status'], AuthService::requireUser(), $request));
    }

    /** POST /api/admin/users/{id}/anonymise {confirmEmail} */
    public function anonymise(Request $request): Response
    {
        $data = Validator::validate($request->json(), ['confirmEmail' => 'required|string|max:254']);
        AdminUsersService::anonymise((int) $request->param('id'), $data['confirmEmail'], AuthService::requireUser(), $request);
        return Response::ok(AdminUsersService::detail((int) $request->param('id')));
    }

    // ------------------------------------------------------------------ admin team (F2)

    /** GET /api/admin/admins */
    public function admins(Request $request): Response
    {
        return Response::ok(AdminTeamService::list(AuthService::requireUser()));
    }

    /** POST /api/admin/admins {email, code} — primary admin only. */
    public function addAdmin(Request $request): Response
    {
        $data = Validator::validate($request->json(), ['email' => 'required|email', 'code' => 'required|string|max:20']);
        return Response::ok(AdminTeamService::add($data['email'], $data['code'], AuthService::requireUser(), $request));
    }

    /** POST /api/admin/admins/{id}/remove {code} — primary admin only. */
    public function removeAdmin(Request $request): Response
    {
        $data = Validator::validate($request->json(), ['code' => 'required|string|max:20']);
        return Response::ok(AdminTeamService::remove((int) $request->param('id'), $data['code'], AuthService::requireUser(), $request));
    }

    /** POST /api/admin/admins/{id}/make-primary {code} — primary admin only. */
    public function makePrimary(Request $request): Response
    {
        $data = Validator::validate($request->json(), ['code' => 'required|string|max:20']);
        return Response::ok(AdminTeamService::transfer((int) $request->param('id'), $data['code'], AuthService::requireUser(), $request));
    }
}
