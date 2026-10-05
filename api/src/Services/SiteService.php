<?php
declare(strict_types=1);

namespace Wellness\Services;

use Wellness\Core\Config;
use Wellness\Core\Database;
use Wellness\Core\HttpException;
use Wellness\Core\RateLimiter;
use Wellness\Core\Request;

/**
 * Contact form, newsletter and FAQ (PRD §4.5 SITE-1 … SITE-3).
 */
final class SiteService
{
    /** SITE-1: store the message and notify the support inbox. */
    public static function contact(array $data, Request $request): void
    {
        RateLimiter::hit('contact', $request->ip(), 5, 3600);
        $id = Database::insert(
            'INSERT INTO contact_messages (name, email, subject, message, ip_hash) VALUES (?, ?, ?, ?, ?)',
            [$data['name'], $data['email'], $data['subject'] ?? 'General inquiry', $data['message'], $request->ipHash()]
        );
        AuditService::log('CONTACT_MESSAGE', 'guest', AuthService::user() ? (int) AuthService::user()['id'] : null, 'contact_message', $id, [], $request);

        $support = SettingsService::get('support_email');
        if ($support) {
            Mailer::send($support, 'contact-notification', [
                'name' => $data['name'],
                'email' => $data['email'],
                'subject' => $data['subject'] ?? 'General inquiry',
                'message' => $data['message'],
            ]);
        }
    }

    /** SITE-2: subscribe (idempotent; re-subscribes a previously unsubscribed address). */
    public static function subscribe(string $email, Request $request): void
    {
        RateLimiter::hit('newsletter', $request->ip(), 10, 3600);
        $row = Database::one('SELECT * FROM newsletter_subscribers WHERE email = ?', [$email]);
        if ($row !== null && $row['status'] === 'subscribed') {
            return; // already subscribed — same response, no duplicate, no extra email
        }
        $token = bin2hex(random_bytes(16));
        if ($row === null) {
            Database::run('INSERT INTO newsletter_subscribers (email, unsubscribe_token) VALUES (?, ?)', [$email, $token]);
        } else {
            Database::run("UPDATE newsletter_subscribers SET status = 'subscribed', unsubscribe_token = ?, unsubscribed_at = NULL WHERE id = ?", [$token, $row['id']]);
        }
        Mailer::send($email, 'newsletter-welcome', [
            'unsubscribeUrl' => rtrim(Config::string('app.url'), '/') . '/unsubscribe?token=' . $token,
        ]);
    }

    /** SITE-2: one-click unsubscribe (confirmed on the page, so link prefetchers can't trigger it). */
    public static function unsubscribe(string $token): void
    {
        $updated = Database::run(
            "UPDATE newsletter_subscribers SET status = 'unsubscribed', unsubscribed_at = UTC_TIMESTAMP() WHERE unsubscribe_token = ? AND status = 'subscribed'",
            [$token]
        )->rowCount();
        if ($updated === 0 && Database::value('SELECT 1 FROM newsletter_subscribers WHERE unsubscribe_token = ?', [$token]) === null) {
            throw HttpException::notFound('This unsubscribe link is not valid.');
        }
    }

    /** SITE-3: published FAQs in display order. */
    public static function faqs(): array
    {
        return array_map(static fn (array $r): array => [
            'id' => (int) $r['id'],
            'category' => $r['category'],
            'question' => $r['question'],
            'answer' => $r['answer'],
        ], Database::all('SELECT id, category, question, answer FROM faqs WHERE is_published = 1 ORDER BY sort_order, id'));
    }
}
