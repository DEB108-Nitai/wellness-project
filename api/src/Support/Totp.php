<?php
declare(strict_types=1);

namespace Transenigma\Support;

use RuntimeException;
use Transenigma\Core\Config;

/**
 * Time-based one-time passwords (RFC 6238: HMAC-SHA1, 6 digits, 30-second steps), the format every
 * authenticator app understands. Plain PHP, no library. Also encrypts the shared secret for storage.
 */
final class Totp
{
    public const DIGITS = 6;
    public const PERIOD = 30;
    /** Codes from one step either side are accepted, for phone clocks that drift a little. */
    public const WINDOW = 1;
    private const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    private const CIPHER = 'aes-256-gcm';

    /** A new random 160-bit secret, base32-encoded (32 characters), as RFC 4226 recommends. */
    public static function newSecret(): string
    {
        return self::base32Encode(random_bytes(20));
    }

    public static function step(?int $time = null): int
    {
        return intdiv($time ?? time(), self::PERIOD);
    }

    /** The code for one time step (RFC 4226 dynamic truncation). */
    public static function code(string $secret, int $step): string
    {
        $mac = hash_hmac('sha1', pack('J', $step), self::base32Decode($secret), true);
        $offset = ord($mac[19]) & 0x0f;
        $value = ((ord($mac[$offset]) & 0x7f) << 24) | (ord($mac[$offset + 1]) << 16) | (ord($mac[$offset + 2]) << 8) | ord($mac[$offset + 3]);
        return str_pad((string) ($value % 10 ** self::DIGITS), self::DIGITS, '0', STR_PAD_LEFT);
    }

    /** The time step the code belongs to (within the window), or null. Compared in constant time. */
    public static function matchStep(string $secret, string $code, ?int $time = null): ?int
    {
        if (!preg_match('/^\d{' . self::DIGITS . '}$/', $code)) {
            return null;
        }
        $now = self::step($time);
        $found = null;
        for ($s = $now - self::WINDOW; $s <= $now + self::WINDOW; $s++) {
            if (hash_equals(self::code($secret, $s), $code)) {
                $found ??= $s; // keep looping so the time taken does not depend on which step matched
            }
        }
        return $found;
    }

    /** The otpauth:// link that the QR code carries (Key URI format used by Google Authenticator and others). */
    public static function uri(string $secret, string $account, string $issuer): string
    {
        return 'otpauth://totp/' . rawurlencode($issuer) . ':' . rawurlencode($account)
            . '?secret=' . $secret . '&issuer=' . rawurlencode($issuer)
            . '&algorithm=SHA1&digits=' . self::DIGITS . '&period=' . self::PERIOD;
    }

    // ------------------------------------------------------------------ storage

    /**
     * Encrypt for storage: "v1:" + base64(iv | tag | ciphertext), key derived from app.secret. $context (for
     * example "user:12") is authenticated too, so a ciphertext copied to another row or session does not decrypt.
     */
    public static function encrypt(string $secret, string $context): string
    {
        $iv = random_bytes(12);
        $tag = '';
        $ct = openssl_encrypt($secret, self::CIPHER, self::key(), OPENSSL_RAW_DATA, $iv, $tag, $context);
        if ($ct === false) {
            throw new RuntimeException('Could not encrypt the authenticator secret');
        }
        return 'v1:' . base64_encode($iv . $tag . $ct);
    }

    /** Null when it cannot be decrypted (app.secret changed, wrong context, or tampered). */
    public static function decrypt(string $stored, string $context): ?string
    {
        if (!str_starts_with($stored, 'v1:')) {
            return null;
        }
        $raw = base64_decode(substr($stored, 3), true);
        if ($raw === false || strlen($raw) < 29) {
            return null;
        }
        $plain = openssl_decrypt(substr($raw, 28), self::CIPHER, self::key(), OPENSSL_RAW_DATA, substr($raw, 0, 12), substr($raw, 12, 16), $context);
        return $plain === false ? null : $plain;
    }

    private static function key(): string
    {
        $secret = Config::string('app.secret');
        if (strlen($secret) < 32) {
            throw new RuntimeException('app.secret must be set (at least 32 characters) to use two-step sign-in');
        }
        return hash_hmac('sha256', 'transenigma-totp-v1', $secret, true);
    }

    // ------------------------------------------------------------------ base32 (RFC 4648, no padding)

    public static function base32Encode(string $bytes): string
    {
        $bits = '';
        foreach (str_split($bytes) as $c) {
            $bits .= str_pad(decbin(ord($c)), 8, '0', STR_PAD_LEFT);
        }
        $out = '';
        foreach (str_split($bits, 5) as $chunk) {
            $out .= self::B32[bindec(str_pad($chunk, 5, '0'))];
        }
        return $out;
    }

    public static function base32Decode(string $text): string
    {
        $text = strtoupper(rtrim(str_replace(' ', '', $text), '='));
        $bits = '';
        foreach (str_split($text) as $c) {
            $i = strpos(self::B32, $c);
            if ($i === false) {
                throw new RuntimeException('Invalid base32');
            }
            $bits .= str_pad(decbin($i), 5, '0', STR_PAD_LEFT);
        }
        $out = '';
        foreach (str_split($bits, 8) as $byte) {
            if (strlen($byte) === 8) {
                $out .= chr(bindec($byte));
            }
        }
        return $out;
    }
}
