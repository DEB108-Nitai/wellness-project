<?php
declare(strict_types=1);

namespace Wellness\Core;

use RuntimeException;

/**
 * An error that is safe to show to the client, rendered as
 * { ok: false, error: { code, message, fields? } } with the given HTTP status.
 */
class HttpException extends RuntimeException
{
    /**
     * @param array<string,string> $fields  per-field validation messages
     * @param array<string,string> $headers extra response headers (e.g. Retry-After)
     */
    public function __construct(
        public readonly int $status,
        public readonly string $errorCode,
        string $message,
        public readonly array $fields = [],
        public readonly array $headers = [],
    ) {
        parent::__construct($message, $status);
    }

    public static function badRequest(string $message, string $code = 'BAD_REQUEST'): self
    {
        return new self(400, $code, $message);
    }

    public static function unauthorized(string $message = 'Please sign in to continue.', string $code = 'UNAUTHENTICATED'): self
    {
        return new self(401, $code, $message);
    }

    public static function forbidden(string $message = 'You do not have permission to do that.', string $code = 'FORBIDDEN'): self
    {
        return new self(403, $code, $message);
    }

    public static function notFound(string $message = 'Not found.', string $code = 'NOT_FOUND'): self
    {
        return new self(404, $code, $message);
    }

    public static function conflict(string $message, string $code = 'CONFLICT'): self
    {
        return new self(409, $code, $message);
    }

    /** @param array<string,string> $fields */
    public static function validation(array $fields, string $message = 'Please check the highlighted fields.'): self
    {
        return new self(422, 'VALIDATION_ERROR', $message, $fields);
    }

    public static function tooManyRequests(int $retryAfter): self
    {
        return new self(429, 'RATE_LIMITED', 'Too many attempts. Please wait a little and try again.', [], ['Retry-After' => (string) $retryAfter]);
    }
}
