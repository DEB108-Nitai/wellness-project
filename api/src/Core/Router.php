<?php
declare(strict_types=1);

namespace Transenigma\Core;

/**
 * Minimal router: METHOD + path pattern with {param} or {param:regex} segments.
 *
 * Route options (enforced by Kernel):
 *   'auth'        => null | 'user' | 'admin'   who may call the route
 *   'maintenance' => bool  (default true)       blocked while maintenance mode is on
 *   'csrf'        => bool  (default true)       CSRF check for non-GET requests
 */
final class Router
{
    /** @var list<array{method:string, pattern:string, regex:string, params:list<string>, handler:callable|array, options:array}> */
    private array $routes = [];

    public function get(string $pattern, callable|array $handler, array $options = []): void
    {
        $this->add('GET', $pattern, $handler, $options);
    }

    public function post(string $pattern, callable|array $handler, array $options = []): void
    {
        $this->add('POST', $pattern, $handler, $options);
    }

    public function put(string $pattern, callable|array $handler, array $options = []): void
    {
        $this->add('PUT', $pattern, $handler, $options);
    }

    public function patch(string $pattern, callable|array $handler, array $options = []): void
    {
        $this->add('PATCH', $pattern, $handler, $options);
    }

    public function delete(string $pattern, callable|array $handler, array $options = []): void
    {
        $this->add('DELETE', $pattern, $handler, $options);
    }

    public function add(string $method, string $pattern, callable|array $handler, array $options = []): void
    {
        $params = [];
        $regex = preg_replace_callback(
            // {name} or {name:regex}; the regex may itself contain {n} quantifiers.
            '#\{([a-zA-Z_]+)(?::((?:[^{}]|\{\d+(?:,\d*)?\})+))?\}#',
            static function (array $m) use (&$params): string {
                $params[] = $m[1];
                return '(' . ($m[2] ?? '[^/]+') . ')';
            },
            '/' . trim($pattern, '/')
        );
        $this->routes[] = [
            'method' => strtoupper($method),
            'pattern' => $pattern,
            'regex' => '#^' . $regex . '$#',
            'params' => $params,
            'handler' => $handler,
            'options' => $options + ['auth' => null, 'maintenance' => true, 'csrf' => true],
        ];
    }

    /**
     * The registered routes (method, pattern, effective options), e.g. for tests that check every
     * admin route requires the admin role.
     * @return list<array{method:string, pattern:string, options:array}>
     */
    public function routes(): array
    {
        return array_map(
            static fn (array $r): array => ['method' => $r['method'], 'pattern' => $r['pattern'], 'options' => $r['options']],
            $this->routes
        );
    }

    /**
     * @return array{handler:callable|array, options:array, params:array<string,string>}
     * @throws HttpException 404 / 405
     */
    public function match(string $method, string $path): array
    {
        $allowed = [];
        foreach ($this->routes as $route) {
            if (!preg_match($route['regex'], $path, $m)) {
                continue;
            }
            if ($route['method'] !== $method && !($method === 'HEAD' && $route['method'] === 'GET')) {
                $allowed[] = $route['method'];
                continue;
            }
            array_shift($m);
            return [
                'handler' => $route['handler'],
                'options' => $route['options'],
                'params' => array_combine($route['params'], $m) ?: [],
            ];
        }
        if ($allowed !== []) {
            throw new HttpException(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.', [], ['Allow' => implode(', ', array_unique($allowed))]);
        }
        throw HttpException::notFound('Endpoint not found.');
    }
}
