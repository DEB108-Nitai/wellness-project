<?php
declare(strict_types=1);

namespace Transenigma\Services;

use Transenigma\Core\Config;
use Transenigma\Core\Csrf;
use Transenigma\Core\Database;
use Transenigma\Core\HttpException;
use Transenigma\Core\RateLimiter;
use Transenigma\Core\Request;
use Transenigma\Core\Session;
use Transenigma\Repositories\UserRepository;

/**
 * Accounts and sign-in (PRD §4.1, AUTH-1 … AUTH-13).
 */
final class AuthService
{
    private const S_USER = 'auth_uid';
    private const S_VERSION = 'auth_ver';
    private const S_LAST_SEEN = 'auth_seen';
    /** A finished guest test attached at sign-in; returned once so the SPA can open it. */
    private const S_CLAIMED_REF = 'auth_claimed_ref';

    private const LOGIN_LIMIT = 5;          // failures per email+IP …
    private const LOGIN_WINDOW = 900;       // … per 15 minutes
    private const LOGIN_IP_LIMIT = 50;      // all attempts per IP per 15 minutes

    /** Valid Argon2/bcrypt hash used to keep timing equal for unknown emails. */
    private static ?string $dummyHash = null;
    /** Per-request cache of the signed-in user (false = not loaded yet). */
    private static array|null|false $current = false;

    // ------------------------------------------------------------------ session

    /** The signed-in, active user for this request, or null. */
    public static function user(): ?array
    {
        if (self::$current !== false) {
            return self::$current;
        }
        $id = Session::get(self::S_USER);
        if (!is_int($id)) {
            return self::$current = null;
        }
        $user = UserRepository::find($id);
        $valid = $user !== null
            && $user['status'] === 'active'
            && (int) $user['session_version'] === Session::get(self::S_VERSION);

        if ($valid && $user['role'] === 'admin') {
            $idle = time() - (int) Session::get(self::S_LAST_SEEN, 0);
            $valid = $idle <= Config::int('session.admin_idle_minutes', 720) * 60;
        }
        if (!$valid) {
            self::forgetSession();
            return self::$current = null;
        }
        Session::set(self::S_LAST_SEEN, time());
        Session::renewCookie();
        return self::$current = $user;
    }

    public static function requireUser(): array
    {
        return self::user() ?? throw HttpException::unauthorized();
    }

    /** Bind the user to a fresh session ID (prevents fixation) and rotate the CSRF token. */
    public static function signIn(array $user, Request $request, string $method): void
    {
        Session::regenerate();
        Session::forget('_csrf');
        Session::set(self::S_USER, (int) $user['id']);
        Session::set(self::S_VERSION, (int) $user['session_version']);
        Session::set(self::S_LAST_SEEN, time());
        UserRepository::touchLogin((int) $user['id']);
        self::$current = UserRepository::find((int) $user['id']);
        $claim = AssessmentService::claimGuestSessions((int) $user['id'], $request); // TEST-9: guest tests follow the person
        if ($claim['completedRef'] !== null) {
            Session::set(self::S_CLAIMED_REF, $claim['completedRef']);
        }
        AuditService::forUser($user, 'AUTH_LOGIN', 'user', null, ['method' => $method], $request);
    }

    public static function signOut(Request $request): void
    {
        $user = self::user();
        if ($user !== null) {
            AuditService::forUser($user, 'AUTH_LOGOUT', 'user', null, [], $request);
        }
        Session::destroy();
        self::$current = null;
    }

    /** Test helper / internal: drop the cached user so the next user() call re-reads the session. */
    public static function flush(): void
    {
        self::$current = false;
    }

    // ------------------------------------------------------------------ sign-up / sign-in

    public static function register(string $name, string $email, string $password, Request $request): array
    {
        if (!SettingsService::bool('signup_open')) {
            throw HttpException::forbidden('New sign-ups are temporarily closed.', 'SIGNUP_CLOSED');
        }
        RateLimiter::hit('signup', $request->ip(), 5, 3600);

        if ($error = PasswordPolicy::check($password, $email)) {
            throw HttpException::validation(['password' => $error]);
        }
        if (UserRepository::findByEmail($email) !== null) {
            throw new HttpException(409, 'EMAIL_TAKEN', 'An account with this email already exists. Please sign in instead.', ['email' => 'An account with this email already exists.']);
        }

        $id = UserRepository::create($name, $email, PasswordPolicy::hash($password));
        $user = UserRepository::find($id);
        AuditService::log('AUTH_SIGNUP', 'user', $id, 'user', $id, ['method' => 'password'], $request);
        self::sendVerification($user);
        self::signIn($user, $request, 'password');
        return $user;
    }

    public static function attempt(string $email, string $password, Request $request): array
    {
        $key = mb_strtolower($email) . '|' . $request->ip();
        RateLimiter::hit('login_ip', $request->ip(), self::LOGIN_IP_LIMIT, self::LOGIN_WINDOW);
        if (RateLimiter::tooMany('login', $key, self::LOGIN_LIMIT, self::LOGIN_WINDOW)) {
            AuditService::log('AUTH_LOCKOUT', 'guest', null, 'user', null, ['email' => mb_strtolower($email)], $request);
            throw new HttpException(429, 'ACCOUNT_LOCKED', 'Too many failed attempts. Please wait 15 minutes or reset your password.', [], ['Retry-After' => (string) self::LOGIN_WINDOW]);
        }

        $user = UserRepository::findByEmail($email);
        $hash = $user['password_hash'] ?? null;
        $ok = password_verify($password, $hash ?? self::dummyHash());

        if (!$ok || $user === null || $hash === null) {
            RateLimiter::hit('login', $key, PHP_INT_MAX, self::LOGIN_WINDOW);
            AuditService::log('AUTH_LOGIN_FAILED', 'guest', $user ? (int) $user['id'] : null, 'user', $user['id'] ?? null, ['email' => mb_strtolower($email)], $request);
            // One generic message whatever the cause, so the response never reveals which emails have accounts.
            throw new HttpException(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
        }
        if ($user['status'] !== 'active') {
            throw HttpException::forbidden('This account has been disabled. Please contact support.', 'ACCOUNT_DISABLED');
        }

        RateLimiter::clear('login', $key, self::LOGIN_WINDOW);
        if (PasswordPolicy::needsRehash($hash) && !UserRepository::rehashPassword((int) $user['id'], $hash, PasswordPolicy::hash($password))) {
            // The password was reset or changed while we checked it: the old one must not sign anyone in.
            throw new HttpException(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
        }
        self::signIn($user, $request, 'password');
        return $user;
    }

    // ------------------------------------------------------------------ email verification

    public static function sendVerification(array $user): void
    {
        $token = TokenService::issue((int) $user['id'], TokenService::VERIFY_EMAIL);
        Mailer::send($user['email'], 'verify-email', [
            'name' => $user['name'],
            'url' => self::link('/verify-email', $token),
        ]);
    }

    /**
     * Confirm the email of the signed-in account the link was sent for. Opening the link alone is not enough:
     * otherwise someone who signed up with another person's address would get it confirmed by its real owner
     * (and see what is filed under it) while keeping the password they chose. The link is only used up once
     * it is accepted, so a refused click does not burn it.
     */
    public static function verifyEmail(string $token, Request $request): void
    {
        $invalid = static fn (): HttpException => HttpException::badRequest('This verification link is invalid or has expired. Please request a new one.', 'INVALID_TOKEN');
        $owner = TokenService::peek($token, TokenService::VERIFY_EMAIL) ?? throw $invalid();
        $user = self::user();
        if ($user === null) {
            throw HttpException::unauthorized('Please sign in to confirm your email address.', 'SIGN_IN_TO_VERIFY');
        }
        if ((int) $user['id'] !== $owner) {
            throw HttpException::forbidden('This link belongs to a different account. Sign out, then sign in with the account you created.', 'WRONG_ACCOUNT');
        }
        $userId = TokenService::consume($token, TokenService::VERIFY_EMAIL);
        if ($userId !== $owner) {
            throw $invalid();
        }
        UserRepository::markVerified($userId);
        AuditService::log('AUTH_EMAIL_VERIFIED', 'user', $userId, 'user', $userId, [], $request);
    }

    // ------------------------------------------------------------------ password reset / change

    /** Always succeeds from the caller's point of view (no account enumeration). */
    public static function requestPasswordReset(string $email, Request $request): void
    {
        RateLimiter::hit('forgot_ip', $request->ip(), 10, 3600);
        if (RateLimiter::tooMany('forgot_email', $email, 3, 3600)) {
            return; // silently drop — the response must look identical
        }
        RateLimiter::hit('forgot_email', $email, PHP_INT_MAX, 3600);

        $user = UserRepository::findByEmail($email);
        if ($user === null || $user['status'] !== 'active') {
            return;
        }
        $token = TokenService::issue((int) $user['id'], TokenService::RESET_PASSWORD);
        Mailer::send($user['email'], 'reset-password', [
            'name' => $user['name'],
            'url' => self::link('/reset-password', $token),
        ]);
        AuditService::log('AUTH_RESET_REQUESTED', 'user', (int) $user['id'], 'user', $user['id'], [], $request);
    }

    public static function resetPassword(string $token, string $password, Request $request): void
    {
        RateLimiter::hit('reset_ip', $request->ip(), 10, 3600);
        // Validate the password before consuming the token so a weak password doesn't burn the link.
        $userId = self::peekResetToken($token);
        $user = $userId ? UserRepository::find($userId) : null;
        if ($user === null || $user['status'] !== 'active') {
            throw HttpException::badRequest('This reset link is invalid or has expired. Please request a new one.', 'INVALID_TOKEN');
        }
        if ($error = PasswordPolicy::check($password, $user['email'])) {
            throw HttpException::validation(['password' => $error]);
        }
        if (TokenService::consume($token, TokenService::RESET_PASSWORD) !== $userId) {
            throw HttpException::badRequest('This reset link is invalid or has expired. Please request a new one.', 'INVALID_TOKEN');
        }

        UserRepository::updatePassword($userId, PasswordPolicy::hash($password)); // signs out every session
        UserRepository::markVerified($userId); // they proved they own the inbox
        RateLimiter::clear('login', $user['email'] . '|' . $request->ip(), self::LOGIN_WINDOW);
        AuditService::log('AUTH_PASSWORD_RESET', 'user', $userId, 'user', $userId, [], $request);
        Mailer::send($user['email'], 'password-changed', ['name' => $user['name']]);
    }

    public static function changePassword(array $user, ?string $current, string $new, Request $request): void
    {
        RateLimiter::hit('change_password', (string) $user['id'], 10, 3600);
        if ($user['password_hash'] !== null && ($current === null || !password_verify($current, $user['password_hash']))) {
            throw HttpException::validation(['currentPassword' => 'Your current password is incorrect.']);
        }
        if ($error = PasswordPolicy::check($new, $user['email'])) {
            throw HttpException::validation(['newPassword' => $error]);
        }
        // Only if no reset or other change landed since this session was checked; otherwise this request
        // must neither overwrite that new password nor pick up the session version it created.
        $version = (int) $user['session_version'];
        if (!UserRepository::updatePassword((int) $user['id'], PasswordPolicy::hash($new), $version)) {
            self::forgetSession();
            self::$current = null;
            throw HttpException::unauthorized('Your session ended because your password was changed elsewhere. Please sign in again.');
        }
        // Keep THIS session signed in, on the version this write created; every other session is now invalid.
        Session::regenerate();
        Session::set(self::S_VERSION, $version + 1);
        self::$current = UserRepository::find((int) $user['id']);
        AuditService::forUser($user, 'ACCOUNT_PASSWORD_CHANGED', 'user', null, [], $request);
        Mailer::send($user['email'], 'password-changed', ['name' => $user['name']]);
    }

    // ------------------------------------------------------------------ helpers

    /** Payload returned by /auth/me, /auth/login and /auth/signup. */
    public static function sessionPayload(): array
    {
        $user = self::user();
        $payload = [
            'user' => $user ? UserRepository::toPublic($user) : null,
            'csrfToken' => Csrf::token(),
            'googleEnabled' => GoogleOAuth::isConfigured(),
        ];
        if ($user !== null && ($ref = self::takeClaimedResultRef()) !== null) {
            $payload['claimedResultRef'] = $ref;
        }
        return $payload;
    }

    /** The finished guest test attached at this sign-in, if any. Returned only once. */
    public static function takeClaimedResultRef(): ?string
    {
        $ref = Session::get(self::S_CLAIMED_REF);
        Session::forget(self::S_CLAIMED_REF);
        return is_string($ref) ? $ref : null;
    }

    private static function peekResetToken(string $token): ?int
    {
        if (!preg_match('/^[A-Za-z0-9_-]{43}$/', $token)) {
            return null;
        }
        $id = Database::value(
            "SELECT user_id FROM auth_tokens WHERE token_hash = ? AND type = 'reset_password' AND used_at IS NULL AND expires_at > UTC_TIMESTAMP()",
            [hash('sha256', $token)]
        );
        return $id === null ? null : (int) $id;
    }

    private static function link(string $path, string $token): string
    {
        return rtrim(Config::string('app.url'), '/') . $path . '?token=' . rawurlencode($token);
    }

    private static function forgetSession(): void
    {
        Session::forget(self::S_USER);
        Session::forget(self::S_VERSION);
        Session::forget(self::S_LAST_SEEN);
    }

    private static function dummyHash(): string
    {
        return self::$dummyHash ??= PasswordPolicy::hash(bin2hex(random_bytes(16)));
    }
}
