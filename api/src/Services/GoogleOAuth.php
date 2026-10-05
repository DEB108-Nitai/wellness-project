<?php
declare(strict_types=1);

namespace Wellness\Services;

use RuntimeException;
use Wellness\Core\Config;
use Wellness\Core\HttpException;
use Wellness\Core\Request;
use Wellness\Core\Session;
use Wellness\Repositories\UserRepository;

/**
 * "Continue with Google" — OAuth 2.0 Authorization Code flow with state + PKCE,
 * handled entirely server-side (PRD AUTH-4).
 * https://developers.google.com/identity/protocols/oauth2/web-server
 */
final class GoogleOAuth
{
    private const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
    private const TOKEN_URL = 'https://oauth2.googleapis.com/token';
    private const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];
    private const S_FLOW = 'google_oauth';
    private const FLOW_TTL = 600;

    /** Overridable in tests: fn(string $code, string $verifier): array (token response). */
    public static $tokenExchanger = null;

    public static function isConfigured(): bool
    {
        return Config::string('google.client_id') !== '' && Config::string('google.client_secret') !== '';
    }

    public static function redirectUri(): string
    {
        return rtrim(Config::string('app.url'), '/') . '/api/auth/google/callback';
    }

    /** Build the Google consent URL and remember state + PKCE verifier in the session. */
    public static function authorizationUrl(string $next): string
    {
        $state = TokenService::random();
        $verifier = TokenService::random() . TokenService::random(); // 86 chars (RFC 7636: 43–128)
        Session::set(self::S_FLOW, ['state' => $state, 'verifier' => $verifier, 'next' => self::safeNext($next), 'at' => time()]);

        return self::AUTH_URL . '?' . http_build_query([
            'client_id' => Config::string('google.client_id'),
            'redirect_uri' => self::redirectUri(),
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'state' => $state,
            'code_challenge' => rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '='),
            'code_challenge_method' => 'S256',
            'prompt' => 'select_account',
            'access_type' => 'online',
        ]);
    }

    /**
     * Handle Google's redirect back. Returns the path to send the browser to.
     * @throws HttpException|RuntimeException on any failure (caller redirects to /login?error=…)
     */
    public static function handleCallback(Request $request): string
    {
        $flow = Session::get(self::S_FLOW);
        Session::forget(self::S_FLOW);

        if ($request->query('error') !== null) {
            throw HttpException::badRequest('Google sign-in was cancelled.', 'GOOGLE_CANCELLED');
        }
        $state = (string) $request->query('state', '');
        $code = (string) $request->query('code', '');
        if (!is_array($flow) || $state === '' || $code === '' || !hash_equals($flow['state'], $state) || time() - $flow['at'] > self::FLOW_TTL) {
            throw HttpException::badRequest('Google sign-in expired. Please try again.', 'GOOGLE_STATE');
        }

        $tokens = self::$tokenExchanger !== null
            ? (self::$tokenExchanger)($code, $flow['verifier'])
            : self::exchangeCode($code, $flow['verifier']);
        $claims = self::validateIdToken((string) ($tokens['id_token'] ?? ''));

        $user = self::resolveUser($claims, $request);
        if ($user['status'] !== 'active') {
            throw HttpException::forbidden('This account has been disabled.', 'ACCOUNT_DISABLED');
        }
        AuthService::signIn($user, $request, 'google');
        return $flow['next'];
    }

    /**
     * Validate the ID token's claims. The token comes straight from Google's token
     * endpoint over TLS, so per Google's docs its signature need not be re-verified;
     * we still check issuer, audience, expiry and email verification.
     * @return array{sub:string, email:string, name:string}
     */
    public static function validateIdToken(string $idToken): array
    {
        $parts = explode('.', $idToken);
        if (count($parts) !== 3) {
            throw new RuntimeException('Malformed ID token');
        }
        $payload = json_decode((string) base64_decode(strtr($parts[1], '-_', '+/'), true), true);
        if (!is_array($payload)) {
            throw new RuntimeException('Unreadable ID token');
        }
        $checks = [
            'issuer' => in_array($payload['iss'] ?? '', self::ISSUERS, true),
            'audience' => ($payload['aud'] ?? '') === Config::string('google.client_id'),
            'expiry' => (int) ($payload['exp'] ?? 0) > time() - 60,
            'subject' => is_string($payload['sub'] ?? null) && $payload['sub'] !== '',
            'email' => filter_var($payload['email'] ?? '', FILTER_VALIDATE_EMAIL) !== false,
            'email_verified' => ($payload['email_verified'] ?? false) === true || ($payload['email_verified'] ?? '') === 'true',
        ];
        foreach ($checks as $name => $ok) {
            if (!$ok) {
                throw new RuntimeException("ID token check failed: $name");
            }
        }
        $email = mb_strtolower($payload['email']);
        $name = trim((string) ($payload['name'] ?? '')) ?: strstr($email, '@', true);
        return ['sub' => $payload['sub'], 'email' => $email, 'name' => mb_substr($name, 0, 100)];
    }

    /** Match by Google ID, then by verified email (link), else create an account. */
    private static function resolveUser(array $claims, Request $request): array
    {
        $user = UserRepository::findByGoogleSub($claims['sub']);
        if ($user !== null) {
            return $user;
        }

        $user = UserRepository::findByEmail($claims['email']);
        if ($user !== null) {
            UserRepository::linkGoogle((int) $user['id'], $claims['sub']);
            AuditService::log('AUTH_GOOGLE_LINKED', 'user', (int) $user['id'], 'user', $user['id'], [], $request);
            return UserRepository::find((int) $user['id']);
        }

        if (!SettingsService::bool('signup_open')) {
            throw HttpException::forbidden('New sign-ups are temporarily closed.', 'SIGNUP_CLOSED');
        }
        $id = UserRepository::create($claims['name'], $claims['email'], null, $claims['sub'], true);
        AuditService::log('AUTH_SIGNUP', 'user', $id, 'user', $id, ['method' => 'google'], $request);
        return UserRepository::find($id);
    }

    private static function exchangeCode(string $code, string $verifier): array
    {
        $ch = curl_init(self::TOKEN_URL);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query([
                'code' => $code,
                'client_id' => Config::string('google.client_id'),
                'client_secret' => Config::string('google.client_secret'),
                'redirect_uri' => self::redirectUri(),
                'grant_type' => 'authorization_code',
                'code_verifier' => $verifier,
            ]),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($body === false || $status !== 200) {
            throw new RuntimeException("Google token exchange failed (HTTP $status) $error " . (is_string($body) ? mb_substr($body, 0, 300) : ''));
        }
        $data = json_decode($body, true);
        if (!is_array($data)) {
            throw new RuntimeException('Google token response was not JSON');
        }
        return $data;
    }

    /** Only allow same-site relative paths as the post-login destination. */
    public static function safeNext(string $next): string
    {
        return preg_match('#^/(?![/\\\\])[A-Za-z0-9/_\-?=&.%]*$#', $next) ? $next : '/';
    }
}
