<?php
declare(strict_types=1);

namespace Wellness\Core;

use Throwable;
use Wellness\Services\SettingsService;

/**
 * Runs a request through the route's guards (maintenance → CSRF → auth),
 * calls the controller and converts every failure into a JSON error response.
 */
final class Kernel
{
    /** @var callable(): ?array  returns the signed-in user row (id, role, ...) or null */
    private $userResolver;

    public function __construct(private readonly Router $router)
    {
        $this->userResolver = static fn (): ?array => null;
    }

    public function setUserResolver(callable $resolver): void
    {
        $this->userResolver = $resolver;
    }

    public function handle(Request $request): Response
    {
        try {
            $route = $this->router->match($request->method, $request->path);
            $request->params = $route['params'];
            $options = $route['options'];

            if ($options['maintenance'] && SettingsService::bool('maintenance_mode') && !$this->isAdmin()) {
                throw new HttpException(503, 'MAINTENANCE', 'We are performing scheduled maintenance. Please check back shortly.', [], ['Retry-After' => '600']);
            }

            if (!$request->isSafeMethod() && $options['csrf']) {
                Session::start($request);
                Csrf::verify($request);
            }

            if ($options['auth'] !== null) {
                $user = ($this->userResolver)();
                if ($user === null) {
                    throw HttpException::unauthorized();
                }
                if ($options['auth'] === 'admin' && ($user['role'] ?? null) !== 'admin') {
                    throw HttpException::forbidden();
                }
            }

            $response = $this->invoke($route['handler'], $request);
            return $response instanceof Response ? $response : Response::ok($response);
        } catch (HttpException $e) {
            return Response::fromException($e);
        } catch (Throwable $e) {
            Logger::exception($e, ['method' => $request->method, 'path' => $request->path]);
            return Response::serverError(Config::bool('app.debug') ? $e->getMessage() : null);
        }
    }

    private function invoke(callable|array $handler, Request $request): mixed
    {
        if (is_array($handler) && is_string($handler[0])) {
            [$class, $method] = $handler;
            return (new $class())->{$method}($request);
        }
        return $handler($request);
    }

    private function isAdmin(): bool
    {
        try {
            return (($this->userResolver)()['role'] ?? null) === 'admin';
        } catch (Throwable) {
            return false;
        }
    }
}
