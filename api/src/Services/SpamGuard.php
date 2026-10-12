<?php
declare(strict_types=1);

namespace Transenigma\Services;

use Transenigma\Core\HttpException;

/**
 * Lightweight bot protection for public forms (PRD SITE-1): a hidden honeypot
 * field that humans never fill, and a minimum time between showing and submitting the form.
 */
final class SpamGuard
{
    public const HONEYPOT_FIELD = 'website';
    private const MIN_SECONDS = 3;

    /** @throws HttpException 400 when the submission looks automated */
    public static function check(array $body): void
    {
        if (trim((string) ($body[self::HONEYPOT_FIELD] ?? '')) !== '') {
            throw HttpException::badRequest('Your submission could not be accepted.', 'SPAM_DETECTED');
        }
        // How long the form was open, measured by the browser itself. Comparing a browser timestamp with
        // the server clock failed for everyone whose device clock runs a few seconds fast.
        $elapsed = $body['formElapsedMs'] ?? null;
        if (is_int($elapsed) && $elapsed >= 0 && $elapsed < self::MIN_SECONDS * 1000) {
            throw HttpException::badRequest('That was quick! Please check the form and submit again.', 'TOO_FAST');
        }
    }
}
