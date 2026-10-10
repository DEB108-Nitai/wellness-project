<?php
declare(strict_types=1);

namespace Transenigma\Core;

/**
 * Synchronizer-token CSRF protection (PRD AUTH-8).
 * The SPA reads the token from GET /api/auth/me and sends it as X-CSRF-Token
 * on every state-changing request. The Origin header, when present, must be ours.
 */
final class Csrf
{
    private const SESSION_KEY = '_csrf';

    public static function token(): string
    {
        $token = Session::get(self::SESSION_KEY);
        if (!is_string($token) || strlen($token) !== 64) {
            $token = bin2hex(random_bytes(32));
            Session::set(self::SESSION_KEY, $token);
        }
        return $token;
    }

    public static function verify(Request $request): void
    {
        $origin = $request->header('Origin');
        if ($origin !== null && !self::isAllowedOrigin($origin)) {
            throw HttpException::forbidden('Request origin not allowed.', 'BAD_ORIGIN');
        }

        $sent = $request->header('X-CSRF-Token') ?? '';
        $expected = Session::get(self::SESSION_KEY);
        if (!is_string($expected) || $sent === '' || !hash_equals($expected, $sent)) {
            throw HttpException::forbidden('Your session has expired. Please refresh the page and try again.', 'CSRF_FAILED');
        }
    }

    public static function isAllowedOrigin(string $origin): bool
    {
        $allowed = array_merge([Config::string('app.url')], (array) Config::get('app.allowed_origins', []));
        $normalize = static fn (string $url): string => strtolower(rtrim($url, '/'));
        return in_array($normalize($origin), array_map($normalize, $allowed), true);
    }
}
