<?php
declare(strict_types=1);

namespace Transenigma\Core;

use JsonException;

final class Request
{
    private const MAX_BODY_BYTES = 1_048_576; // 1 MB
    /** Multipart uploads (admin images) may be larger; each file is checked again by its handler. */
    private const MAX_UPLOAD_BYTES = 5_242_880; // 5 MB

    private ?array $json = null;
    /** @var array<string,string> route parameters */
    public array $params = [];

    public function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $query,
        private readonly array $server,
        private readonly string $rawBody,
        private readonly array $cookies = [],
        /** Uploaded files ($_FILES shape) of a multipart/form-data request. */
        private readonly array $files = [],
    ) {
    }

    public static function fromGlobals(): self
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

        // Strip the directory the API lives in (/api locally under a sub-folder, or /api in production).
        $base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
        if ($base !== '' && str_starts_with($uriPath, $base)) {
            $uriPath = substr($uriPath, strlen($base));
        }
        $path = '/' . trim(rawurldecode($uriPath), '/');

        $length = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
        // PHP parses multipart bodies into $_FILES itself (php://input is empty for them).
        $multipart = str_starts_with(strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? '')), 'multipart/form-data');
        if ($length > ($multipart ? self::MAX_UPLOAD_BYTES : self::MAX_BODY_BYTES)) {
            throw new HttpException(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.');
        }
        if ($multipart) {
            return new self($method, $path, $_GET, $_SERVER, '', $_COOKIE, $_FILES);
        }
        $raw = in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)
            ? (string) file_get_contents('php://input', false, null, 0, self::MAX_BODY_BYTES + 1)
            : '';
        if (strlen($raw) > self::MAX_BODY_BYTES) {
            throw new HttpException(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.');
        }

        return new self($method, $path, $_GET, $_SERVER, $raw, $_COOKIE);
    }

    /** Decoded JSON body (empty array when there is no body). */
    public function json(): array
    {
        if ($this->json !== null) {
            return $this->json;
        }
        if (trim($this->rawBody) === '') {
            return $this->json = [];
        }
        $type = strtolower($this->header('Content-Type') ?? '');
        if (!str_starts_with($type, 'application/json')) {
            throw new HttpException(415, 'UNSUPPORTED_MEDIA_TYPE', 'Requests must be sent as JSON.');
        }
        try {
            $data = json_decode($this->rawBody, true, 32, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw HttpException::badRequest('Malformed JSON body.', 'INVALID_JSON');
        }
        if (!is_array($data)) {
            throw HttpException::badRequest('JSON body must be an object.', 'INVALID_JSON');
        }
        return $this->json = $data;
    }

    /**
     * One uploaded file of a multipart request: ['tmp' => path, 'size' => bytes, 'name' => client name],
     * or null when the field is missing. Upload errors become a 422 on that field.
     */
    public function file(string $field): ?array
    {
        $f = $this->files[$field] ?? null;
        if (!is_array($f) || is_array($f['error'] ?? null)) {
            return null;
        }
        $error = (int) ($f['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($error === UPLOAD_ERR_NO_FILE) {
            return null;
        }
        if ($error !== UPLOAD_ERR_OK) {
            throw HttpException::validation([$field => in_array($error, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)
                ? 'The file is too large.' : 'The upload failed. Please try again.']);
        }
        return ['tmp' => (string) $f['tmp_name'], 'size' => (int) $f['size'], 'name' => (string) ($f['name'] ?? '')];
    }

    public function header(string $name): ?string
    {
        $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        if ($name === 'Content-Type') {
            $key = 'CONTENT_TYPE';
        }
        $value = $this->server[$key] ?? null;
        return $value === null ? null : (string) $value;
    }

    public function cookie(string $name): ?string
    {
        $value = $this->cookies[$name] ?? null;
        return is_string($value) ? $value : null;
    }

    public function query(string $key, ?string $default = null): ?string
    {
        $value = $this->query[$key] ?? $default;
        return is_string($value) ? $value : $default;
    }

    public function param(string $key): string
    {
        return $this->params[$key] ?? '';
    }

    public function isSafeMethod(): bool
    {
        return in_array($this->method, ['GET', 'HEAD', 'OPTIONS'], true);
    }

    /** Client IP; Cloudflare's header is trusted only when explicitly enabled in config. */
    public function ip(): string
    {
        if (Config::bool('app.trust_cloudflare') && !empty($this->server['HTTP_CF_CONNECTING_IP'])) {
            $ip = (string) $this->server['HTTP_CF_CONNECTING_IP'];
        } else {
            $ip = (string) ($this->server['REMOTE_ADDR'] ?? '0.0.0.0');
        }
        return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '0.0.0.0';
    }

    /** HMAC of the IP so raw addresses are never stored (PRD §5.1). */
    public function ipHash(): string
    {
        return hash_hmac('sha256', $this->ip(), Config::string('app.secret'));
    }

    public function userAgent(): string
    {
        return mb_substr((string) ($this->server['HTTP_USER_AGENT'] ?? ''), 0, 255);
    }

    public function isHttps(): bool
    {
        return (!empty($this->server['HTTPS']) && $this->server['HTTPS'] !== 'off')
            || ($this->server['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
    }
}
