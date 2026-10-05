<?php
/**
 * API route table (PRD §6.4). Each phase adds its routes here.
 *
 * Options: 'auth' => null|'user'|'admin', 'maintenance' => bool (blocked during
 * maintenance, default true), 'csrf' => bool (checked on non-GET, default true).
 */
declare(strict_types=1);

use Wellness\Controllers\AccountController;
use Wellness\Controllers\AuthController;
use Wellness\Controllers\GoogleAuthController;
use Wellness\Controllers\HealthController;
use Wellness\Controllers\SettingsController;
use Wellness\Core\Router;

return static function (Router $r): void {
    $open = ['maintenance' => false]; // must keep working while the site is in maintenance (admin sign-in)

    // --- System -------------------------------------------------------------
    $r->get('/health', [HealthController::class, 'show'], $open);
    $r->get('/settings/public', [SettingsController::class, 'public'], $open);

    // --- Authentication (Phase 2) -------------------------------------------
    $r->get('/auth/me', [AuthController::class, 'me'], $open);
    $r->post('/auth/login', [AuthController::class, 'login'], $open);
    $r->post('/auth/logout', [AuthController::class, 'logout'], $open);
    $r->post('/auth/signup', [AuthController::class, 'signup']);
    $r->post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
    $r->post('/auth/reset-password', [AuthController::class, 'resetPassword']);
    $r->post('/auth/verify-email', [AuthController::class, 'verifyEmail']);
    $r->post('/auth/resend-verification', [AuthController::class, 'resendVerification'], ['auth' => 'user']);
    $r->get('/auth/google/start', [GoogleAuthController::class, 'start'], $open);
    $r->get('/auth/google/callback', [GoogleAuthController::class, 'callback'], $open);

    // --- Account ------------------------------------------------------------
    $r->patch('/account', [AccountController::class, 'update'], ['auth' => 'user']);
    $r->post('/account/password', [AccountController::class, 'changePassword'], ['auth' => 'user']);
};
