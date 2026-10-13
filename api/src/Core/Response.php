<?php
declare(strict_types=1);

namespace Transenigma\Core;

final class Response
{
    /** Security headers sent with every API response (PRD §5.1). */
    private const BASE_HEADERS = [
        'Content-Type' => 'application/json; charset=utf-8',
        'Cache-Control' => 'no-store, max-age=0',
        'X-Content-Type-Options' => 'nosniff',
        'X-Frame-Options' => 'DENY',
        'Referrer-Policy' => 'strict-origin-when-cross-origin',
        'Content-Security-Policy' => "default-src 'none'; frame-ancestors 'none'",
        'Cross-Origin-Resource-Policy' => 'same-origin',
    ];

    /** @param array<string,string> $headers */
    public function __construct(
        public readonly int $status,
        public readonly ?array $body,
        public readonly array $headers = [],
        private readonly bool $streamed = false,
    ) {
    }

    /**
     * The body was already written (a CSV export) with its own headers. Sending nothing more matters when PHP buffers
     * output (php.ini output_buffering, the shared-hosting default): headers would not be sent yet, and the JSON
     * Content-Type would replace the export's text/csv.
     */
    public static function streamed(): self
    {
        return new self(200, null, [], true);
    }

    public static function ok(mixed $data = null, int $status = 200): self
    {
        return new self($status, ['ok' => true, 'data' => $data]);
    }

    public static function created(mixed $data = null): self
    {
        return self::ok($data, 201);
    }

    public static function fromException(HttpException $e): self
    {
        $error = ['code' => $e->errorCode, 'message' => $e->getMessage()];
        if ($e->fields !== []) {
            $error['fields'] = $e->fields;
        }
        return new self($e->status, ['ok' => false, 'error' => $error], $e->headers);
    }

    public static function serverError(?string $debugMessage = null): self
    {
        $error = ['code' => 'SERVER_ERROR', 'message' => 'Something went wrong on our side. Please try again.'];
        if ($debugMessage !== null) {
            $error['debug'] = $debugMessage;
        }
        return new self(500, ['ok' => false, 'error' => $error]);
    }

    /** A redirect (used by the Google OAuth flow). */
    public static function redirect(string $location): self
    {
        return new self(302, null, ['Location' => $location]);
    }

    public function send(): void
    {
        if ($this->streamed) {
            return;
        }
        if (!headers_sent()) {
            http_response_code($this->status);
            foreach (self::BASE_HEADERS + $this->headers as $name => $value) {
                header("$name: $value");
            }
        }
        if ($this->body !== null) {
            echo json_encode($this->body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        }
    }
}
