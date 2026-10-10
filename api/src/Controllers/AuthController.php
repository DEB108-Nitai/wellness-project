<?php
declare(strict_types=1);

namespace Transenigma\Controllers;

use Transenigma\Core\HttpException;
use Transenigma\Core\RateLimiter;
use Transenigma\Core\Request;
use Transenigma\Core\Response;
use Transenigma\Core\Validator;
use Transenigma\Services\AuthService;
use Transenigma\Services\PasswordPolicy;

final class AuthController
{
    /** GET /api/auth/me — current user (or null) + CSRF token. */
    public function me(Request $request): Response
    {
        return Response::ok(AuthService::sessionPayload());
    }

    /** POST /api/auth/signup */
    public function signup(Request $request): Response
    {
        $data = Validator::validate($request->json(), [
            'name' => 'required|string|min:2|max:100',
            'email' => 'required|email',
            'password' => 'required|string|max:' . PasswordPolicy::MAX,
        ]);
        AuthService::register($data['name'], $data['email'], $data['password'], $request);
        return Response::created(AuthService::sessionPayload());
    }

    /** POST /api/auth/login */
    public function login(Request $request): Response
    {
        $data = Validator::validate($request->json(), [
            'email' => 'required|email',
            'password' => 'required|string|max:' . PasswordPolicy::MAX,
        ]);
        AuthService::attempt($data['email'], $data['password'], $request);
        return Response::ok(AuthService::sessionPayload());
    }

    /** POST /api/auth/logout */
    public function logout(Request $request): Response
    {
        AuthService::signOut($request);
        return Response::ok(AuthService::sessionPayload()); // fresh anonymous session + CSRF token
    }

    /** POST /api/auth/forgot-password — identical response whether or not the account exists. */
    public function forgotPassword(Request $request): Response
    {
        $data = Validator::validate($request->json(), ['email' => 'required|email']);
        AuthService::requestPasswordReset($data['email'], $request);
        return Response::ok(['message' => 'If an account exists for that email, we have sent a link to reset your password.']);
    }

    /** POST /api/auth/reset-password */
    public function resetPassword(Request $request): Response
    {
        $data = Validator::validate($request->json(), [
            'token' => 'required|string|max:64',
            'password' => 'required|string|max:' . PasswordPolicy::MAX,
        ]);
        AuthService::resetPassword($data['token'], $data['password'], $request);
        return Response::ok(['message' => 'Your password has been updated. Please sign in with your new password.']);
    }

    /** POST /api/auth/verify-email */
    public function verifyEmail(Request $request): Response
    {
        RateLimiter::hit('verify_ip', $request->ip(), 30, 3600);
        $data = Validator::validate($request->json(), ['token' => 'required|string|max:64']);
        AuthService::verifyEmail($data['token'], $request);
        AuthService::flush();
        return Response::ok(AuthService::sessionPayload());
    }

    /** POST /api/auth/resend-verification */
    public function resendVerification(Request $request): Response
    {
        $user = AuthService::requireUser();
        if ($user['email_verified_at'] !== null) {
            throw HttpException::badRequest('Your email address is already verified.', 'ALREADY_VERIFIED');
        }
        RateLimiter::hit('resend_verification', (string) $user['id'], 3, 3600);
        AuthService::sendVerification($user);
        return Response::ok(['message' => 'We have sent a new verification link to ' . $user['email'] . '.']);
    }
}
