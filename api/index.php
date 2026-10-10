<?php
/**
 * Front controller: every /api/* request is routed here by api/.htaccess.
 */
declare(strict_types=1);

use Transenigma\Core\HttpException;
use Transenigma\Core\Kernel;
use Transenigma\Core\Logger;
use Transenigma\Core\Request;
use Transenigma\Core\Response;
use Transenigma\Core\Router;
use Transenigma\Services\AuthService;

try {
    require __DIR__ . '/bootstrap.php';

    $router = new Router();
    (require __DIR__ . '/routes.php')($router);

    $request = Request::fromGlobals();
    $kernel = new Kernel($router);
    $kernel->setUserResolver(static fn (): ?array => AuthService::user());
    $kernel->handle($request)->send();
} catch (HttpException $e) {
    Response::fromException($e)->send();
} catch (Throwable $e) {
    // Bootstrap failures (missing config, DB credentials) — never leak details.
    if (class_exists(Logger::class, false)) {
        Logger::exception($e);
    } else {
        error_log((string) $e);
    }
    Response::serverError()->send();
}
