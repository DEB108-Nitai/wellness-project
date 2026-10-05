<?php
/**
 * API route table (PRD §6.4). Each phase adds its routes here.
 *
 * Options: 'auth' => null|'user'|'admin', 'maintenance' => bool (blocked during
 * maintenance, default true), 'csrf' => bool (checked on non-GET, default true).
 */
declare(strict_types=1);

use Wellness\Controllers\AccountController;
use Wellness\Controllers\AssessmentController;
use Wellness\Controllers\AuthController;
use Wellness\Controllers\GoogleAuthController;
use Wellness\Controllers\HealthController;
use Wellness\Controllers\ResultsController;
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

    // --- Assessment (Phase 3) — guests and users ------------------------------
    $r->get('/test/items', [AssessmentController::class, 'items']);
    $r->get('/test/session', [AssessmentController::class, 'current']);
    $r->post('/test/session', [AssessmentController::class, 'start']);
    $r->put('/test/session/answers', [AssessmentController::class, 'saveAnswers']);
    $r->post('/test/session/abandon', [AssessmentController::class, 'abandon']);
    $r->post('/test/session/submit', [AssessmentController::class, 'submit']);
    $r->post('/test/session/review', [AssessmentController::class, 'review']);

    // --- Results ------------------------------------------------------------
    $ref = '{ref:WL-[2-9A-HJ-NP-Z]{6}}';
    $r->get('/results', [ResultsController::class, 'index'], ['auth' => 'user']);
    $r->get("/results/$ref", [ResultsController::class, 'show']); // 401 RESULTS_LOCKED for guests
    $r->post("/results/$ref/share", [ResultsController::class, 'share'], ['auth' => 'user']);
    $r->delete("/results/$ref/share", [ResultsController::class, 'unshare'], ['auth' => 'user']);
    $r->get('/shared/{token:[A-Za-z0-9]{32}}', [ResultsController::class, 'shared']);
};
