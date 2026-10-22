<?php
declare(strict_types=1);

namespace Transenigma\Services;

use Throwable;
use Transenigma\Core\Config;
use Transenigma\Core\Database;
use Transenigma\Core\HttpException;
use Transenigma\Core\Logger;
use Transenigma\Core\RateLimiter;
use Transenigma\Core\Request;

/**
 * Newsletters written in the admin console (owner, 2026-10-22).
 *
 * A newsletter is a draft (subject, preview text, optional cover image, and a list of blocks: heading, paragraph,
 * image, button, divider) until an admin sends it. Sending only queues one delivery per subscriber;
 * api/bin/send-newsletters.php (cron) sends the queue in batches under the hourly mail limit of the host.
 * Every copy carries the subscriber's own unsubscribe link and the one-click List-Unsubscribe headers that Gmail
 * and Yahoo require for bulk mail.
 */
final class NewsletterService
{
    public const IMAGE_PATH = '#^/uploads/newsletter/[a-f0-9]{24}\.(jpg|png|gif)$#';
    /** No WebP: Outlook and older mail apps can't show it. */
    private const IMAGE_TYPES = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/gif' => 'gif'];
    private const MAX_BLOCKS = 60;
    private const MAX_ATTEMPTS = 3;
    private const BLOCK_NAMES = ['heading' => 'Heading', 'paragraph' => 'Paragraph', 'image' => 'Image', 'button' => 'Button', 'divider' => 'Divider'];

    // ------------------------------------------------------------------ reading

    public static function all(): array
    {
        $rows = Database::all(
            "SELECT n.id, n.subject, n.status, n.recipients, n.created_at, n.updated_at, n.queued_at, n.finished_at, u.name AS sent_by_name,
                    SUM(d.status = 'sent') AS sent, SUM(d.status = 'failed') AS failed, SUM(d.status = 'pending') AS pending
             FROM newsletters n
             LEFT JOIN users u ON u.id = n.sent_by
             LEFT JOIN newsletter_deliveries d ON d.newsletter_id = n.id
             GROUP BY n.id
             ORDER BY (n.status = 'draft') DESC, COALESCE(n.queued_at, n.updated_at) DESC, n.id DESC"
        );
        return array_map(static fn (array $n): array => [
            'id' => (int) $n['id'], 'subject' => $n['subject'], 'status' => $n['status'],
            'recipients' => (int) $n['recipients'], 'sent' => (int) $n['sent'], 'failed' => (int) $n['failed'], 'pending' => (int) $n['pending'],
            'updatedAt' => self::iso($n['updated_at']), 'queuedAt' => self::iso($n['queued_at']), 'finishedAt' => self::iso($n['finished_at']),
            'sentBy' => $n['sent_by_name'],
        ], $rows);
    }

    public static function get(int $id): array
    {
        $n = self::row($id);
        $counts = Database::one(
            "SELECT SUM(status = 'sent') AS sent, SUM(status = 'failed') AS failed, SUM(status = 'pending') AS pending, SUM(status = 'skipped') AS skipped
             FROM newsletter_deliveries WHERE newsletter_id = ?",
            [$id]
        );
        return self::content($n, false) + [
            'id' => (int) $n['id'], 'status' => $n['status'], 'recipients' => (int) $n['recipients'],
            'sent' => (int) ($counts['sent'] ?? 0), 'failed' => (int) ($counts['failed'] ?? 0),
            'pending' => (int) ($counts['pending'] ?? 0), 'skipped' => (int) ($counts['skipped'] ?? 0),
            'updatedAt' => self::iso($n['updated_at']), 'queuedAt' => self::iso($n['queued_at']), 'finishedAt' => self::iso($n['finished_at']),
            'subscribers' => self::subscriberCount(),
        ];
    }

    // ------------------------------------------------------------------ drafts

    public static function create(array $admin, Request $request): array
    {
        $id = Database::insert("INSERT INTO newsletters (blocks, created_by) VALUES ('[]', ?)", [$admin['id']]);
        AuditService::forUser($admin, 'NEWSLETTER_CREATED', 'newsletter', (string) $id, [], $request);
        return self::get($id);
    }

    /** Save a draft. Half-written blocks are fine here; sending checks that everything is filled in. */
    public static function update(int $id, array $input, array $admin, Request $request): array
    {
        self::draft($id);
        $c = self::content($input, false);
        Database::run(
            'UPDATE newsletters SET subject = ?, preheader = ?, cover_image = ?, blocks = ? WHERE id = ?',
            [$c['subject'], $c['preheader'], $c['coverImage'], json_encode($c['blocks'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $id]
        );
        AuditService::forUser($admin, 'NEWSLETTER_SAVED', 'newsletter', (string) $id, [], $request);
        return self::get($id);
    }

    public static function delete(int $id, array $admin, Request $request): void
    {
        $n = self::draft($id);
        Database::run('DELETE FROM newsletters WHERE id = ?', [$id]);
        AuditService::forUser($admin, 'NEWSLETTER_DELETED', 'newsletter', (string) $id, ['subject' => $n['subject']], $request);
    }

    /** A new draft with the same content (e.g. to reuse last month's layout). */
    public static function copy(int $id, array $admin, Request $request): array
    {
        $n = self::row($id);
        $new = Database::insert(
            'INSERT INTO newsletters (subject, preheader, cover_image, blocks, created_by) VALUES (?, ?, ?, ?, ?)',
            [$n['subject'], $n['preheader'], $n['cover_image'], $n['blocks'], $admin['id']]
        );
        AuditService::forUser($admin, 'NEWSLETTER_COPIED', 'newsletter', (string) $new, ['from' => $id], $request);
        return self::get($new);
    }

    /** The email exactly as a subscriber would get it, from the editor's current (unsaved) content. */
    public static function preview(array $input): string
    {
        return Mailer::previewHtml('newsletter', [
            'content' => self::content($input, false),
            'unsubscribeUrl' => self::siteUrl() . '/unsubscribe',
        ]);
    }

    // ------------------------------------------------------------------ sending

    /** Send the saved draft to the admin's own address, marked as a test. */
    public static function sendTest(int $id, array $admin, Request $request): array
    {
        $content = self::content(self::draft($id), true);
        RateLimiter::hit('newsletter_test', 'user:' . $admin['id'], 20, 3600);
        $sent = Mailer::send($admin['email'], 'newsletter', [
            'content' => $content, 'test' => true, 'unsubscribeUrl' => self::siteUrl() . '/unsubscribe',
        ]);
        if (!$sent) {
            throw new HttpException(502, 'MAIL_FAILED', 'The test email could not be sent. Please try again in a few minutes.');
        }
        AuditService::forUser($admin, 'NEWSLETTER_TEST_SENT', 'newsletter', (string) $id, [], $request);
        return ['to' => $admin['email']];
    }

    /** Queue the saved draft for everyone subscribed now. The cron job does the sending. */
    public static function send(int $id, array $admin, Request $request): array
    {
        self::content(self::draft($id), true);
        $recipients = self::subscriberCount();
        if ($recipients === 0) {
            throw new HttpException(409, 'NO_SUBSCRIBERS', 'Nobody is subscribed yet, so there is no one to send this to.');
        }
        Database::transaction(static function () use ($id, $admin): void {
            // Locks the row: two admins pressing Send at once queue it only once.
            $status = Database::value('SELECT status FROM newsletters WHERE id = ? FOR UPDATE', [$id]);
            if ($status !== 'draft') {
                throw new HttpException(409, 'ALREADY_SENT', 'This newsletter has already been sent.');
            }
            $queued = Database::run(
                "INSERT INTO newsletter_deliveries (newsletter_id, subscriber_id)
                 SELECT ?, id FROM newsletter_subscribers WHERE status = 'subscribed' ORDER BY id",
                [$id]
            )->rowCount();
            Database::run(
                "UPDATE newsletters SET status = 'sending', recipients = ?, sent_by = ?, queued_at = UTC_TIMESTAMP() WHERE id = ?",
                [$queued, $admin['id'], $id]
            );
        });
        $n = self::get($id);
        AuditService::forUser($admin, 'NEWSLETTER_SENT', 'newsletter', (string) $id, ['recipients' => $n['recipients']], $request);
        return $n;
    }

    /**
     * Send the next batch of queued newsletter emails (cron). Never more than mail.newsletter_per_hour in any
     * hour, counting every attempt; a failed address is retried on later runs, then marked failed.
     * @return array{sent:int, failed:int, skipped:int, finished:int, budget:int}
     */
    public static function processQueue(): array
    {
        $result = ['sent' => 0, 'failed' => 0, 'skipped' => 0, 'finished' => 0, 'budget' => 0];
        // One sender at a time, even if a slow run overlaps the next cron start.
        if ((int) Database::value("SELECT GET_LOCK('te_newsletter_queue', 0)") !== 1) {
            return $result;
        }
        try {
            // People who unsubscribed after the newsletter was queued are not emailed.
            $result['skipped'] = Database::run(
                "UPDATE newsletter_deliveries d JOIN newsletter_subscribers s ON s.id = d.subscriber_id
                 SET d.status = 'skipped' WHERE d.status = 'pending' AND s.status <> 'subscribed'"
            )->rowCount();

            $perHour = max(1, (int) (Config::get('mail.newsletter_per_hour') ?? 80));
            $recent = (int) Database::value('SELECT COUNT(*) FROM newsletter_deliveries WHERE attempted_at > UTC_TIMESTAMP() - INTERVAL 1 HOUR');
            $result['budget'] = $budget = max(0, $perHour - $recent);
            $rows = $budget === 0 ? [] : Database::all(
                "SELECT d.id, d.newsletter_id, d.attempts, s.email, s.unsubscribe_token
                 FROM newsletter_deliveries d
                 JOIN newsletters n ON n.id = d.newsletter_id AND n.status = 'sending'
                 JOIN newsletter_subscribers s ON s.id = d.subscriber_id
                 WHERE d.status = 'pending' ORDER BY d.id LIMIT $budget"
            );
            $contents = [];
            foreach ($rows as $d) {
                $nid = (int) $d['newsletter_id'];
                $contents[$nid] ??= self::content(self::row($nid), false);
                $ok = self::deliver($d['email'], $d['unsubscribe_token'], $contents[$nid]);
                $attempts = (int) $d['attempts'] + 1;
                $status = $ok ? 'sent' : ($attempts >= self::MAX_ATTEMPTS ? 'failed' : 'pending');
                Database::run(
                    'UPDATE newsletter_deliveries SET status = ?, attempts = ?, attempted_at = UTC_TIMESTAMP() WHERE id = ?',
                    [$status, $attempts, $d['id']]
                );
                $result[$ok ? 'sent' : 'failed'] += 1;
            }
            $result['finished'] = Database::run(
                "UPDATE newsletters n SET status = 'sent', finished_at = UTC_TIMESTAMP()
                 WHERE status = 'sending' AND NOT EXISTS (SELECT 1 FROM newsletter_deliveries d WHERE d.newsletter_id = n.id AND d.status = 'pending')"
            )->rowCount();
        } finally {
            Database::value("SELECT RELEASE_LOCK('te_newsletter_queue')");
        }
        return $result;
    }

    // ------------------------------------------------------------------ images

    /** @param array{tmp:string, size:int, name:string} $file */
    public static function storeImage(array $file, array $admin, Request $request): string
    {
        [$path, $mime] = AdminContentService::storeImage($file, self::IMAGE_TYPES, 'JPEG, PNG or GIF', 'newsletter');
        AuditService::forUser($admin, 'NEWSLETTER_IMAGE_UPLOADED', 'upload', $path, ['bytes' => $file['size'], 'type' => $mime], $request);
        return $path;
    }

    /**
     * Delete uploaded newsletter images no newsletter uses, older than $minAgeSeconds (so an image in an editor that
     * is still open is kept). Images of sent newsletters stay forever: old emails still show them. Run by cron.
     */
    public static function sweepUnusedImages(int $minAgeSeconds = 86400): int
    {
        $dir = Config::path('uploads') . '/newsletter';
        if (!is_dir($dir)) {
            return 0;
        }
        $deleted = 0;
        foreach (glob("$dir/*") ?: [] as $file) {
            $path = '/uploads/newsletter/' . basename($file);
            if (!is_file($file) || !preg_match(self::IMAGE_PATH, $path) || filemtime($file) >= time() - $minAgeSeconds) {
                continue;
            }
            $used = Database::value(
                'SELECT 1 FROM newsletters WHERE cover_image = ? OR blocks LIKE ? LIMIT 1',
                [$path, '%' . basename($file) . '%']
            );
            if ($used === null && @unlink($file)) {
                $deleted++;
            }
        }
        return $deleted;
    }

    // ------------------------------------------------------------------ internals

    private static function deliver(string $email, string $token, array $content): bool
    {
        $site = self::siteUrl();
        try {
            return Mailer::send($email, 'newsletter', ['content' => $content, 'unsubscribeUrl' => "$site/unsubscribe?token=$token"], [
                // RFC 8058 one-click unsubscribe: mail apps POST to this URL themselves.
                'List-Unsubscribe' => "<$site/api/newsletter/one-click?token=$token>",
                'List-Unsubscribe-Post' => 'List-Unsubscribe=One-Click',
            ]);
        } catch (Throwable $e) {
            Logger::exception($e);
            return false;
        }
    }

    /**
     * Check and tidy a newsletter's content, from the editor (camelCase) or a database row (snake_case).
     * $complete: everything must be filled in (to send or test); otherwise only the format is checked (drafts).
     * @return array{subject:string, preheader:string, coverImage:?string, blocks:list<array>}
     */
    private static function content(array $in, bool $complete): array
    {
        $errors = [];
        $line = static fn (mixed $v): string => trim((string) preg_replace('/\s+/u', ' ', is_scalar($v) ? (string) $v : ''));
        $text = static fn (mixed $v): string => trim(str_replace(["\r\n", "\r"], "\n", is_scalar($v) ? (string) $v : ''));

        $subject = $line($in['subject'] ?? '');
        $preheader = $line($in['preheader'] ?? '');
        $cover = $line($in['coverImage'] ?? $in['cover_image'] ?? '');
        $blocks = $in['blocks'] ?? [];
        if (is_string($blocks)) {
            $blocks = json_decode($blocks, true) ?? [];
        }

        if (mb_strlen($subject) > 200) {
            $errors['subject'] = 'Please keep the subject to 200 characters.';
        } elseif ($complete && $subject === '') {
            $errors['subject'] = 'Please write a subject.';
        }
        if (mb_strlen($preheader) > 200) {
            $errors['preheader'] = 'Please keep the preview text to 200 characters.';
        }
        if ($cover !== '' && !self::imageExists($cover)) {
            $errors['coverImage'] = 'Please upload the cover image again.';
        }
        if (!is_array($blocks) || !array_is_list($blocks)) {
            $blocks = [];
            $errors['blocks'] = 'The newsletter content could not be read. Please reload the page.';
        } elseif (count($blocks) > self::MAX_BLOCKS) {
            $errors['blocks'] = 'A newsletter can have at most ' . self::MAX_BLOCKS . ' blocks.';
        } elseif ($complete && !array_filter($blocks, static fn ($b): bool => is_array($b) && ($b['type'] ?? '') !== 'divider')) {
            $errors['blocks'] = 'Please add some content first.';
        }

        $clean = [];
        foreach (is_array($blocks) ? array_slice($blocks, 0, self::MAX_BLOCKS) : [] as $i => $b) {
            $type = is_array($b) ? (string) ($b['type'] ?? '') : '';
            $key = "blocks.$i";
            $name = 'Block ' . ($i + 1) . ' (' . (self::BLOCK_NAMES[$type] ?? 'unknown') . ')';
            $problem = null;
            switch ($type) {
                case 'heading':
                    $block = ['type' => 'heading', 'text' => $line($b['text'] ?? '')];
                    $problem = mb_strlen($block['text']) > 200 ? 'keep it to 200 characters' : ($complete && $block['text'] === '' ? 'write the heading or remove the block' : null);
                    break;
                case 'paragraph':
                    $block = ['type' => 'paragraph', 'text' => $text($b['text'] ?? '')];
                    $problem = mb_strlen($block['text']) > 5000 ? 'keep it to 5,000 characters' : ($complete && $block['text'] === '' ? 'write the text or remove the block' : null);
                    break;
                case 'image':
                    $block = ['type' => 'image', 'src' => $line($b['src'] ?? ''), 'alt' => $line($b['alt'] ?? ''), 'caption' => $line($b['caption'] ?? '')];
                    if ($block['src'] !== '' && !self::imageExists($block['src'])) {
                        $problem = 'upload the image again';
                    } elseif ($complete && $block['src'] === '') {
                        $problem = 'choose an image or remove the block';
                    } elseif (mb_strlen($block['alt']) > 200 || mb_strlen($block['caption']) > 300) {
                        $problem = 'keep the description to 200 and the caption to 300 characters';
                    }
                    break;
                case 'button':
                    $block = ['type' => 'button', 'label' => $line($b['label'] ?? ''), 'url' => $line($b['url'] ?? '')];
                    if (mb_strlen($block['label']) > 60) {
                        $problem = 'keep the button text to 60 characters';
                    } elseif ($block['url'] !== '' && !self::validUrl($block['url'])) {
                        $problem = 'the link must be a full web address starting with https://';
                    } elseif ($complete && ($block['label'] === '' || $block['url'] === '')) {
                        $problem = 'write the button text and its link, or remove the block';
                    }
                    break;
                case 'divider':
                    $block = ['type' => 'divider'];
                    break;
                default:
                    $block = null;
                    $problem = 'this kind of block is not supported';
            }
            if ($problem !== null) {
                $errors[$key] = "$name: $problem.";
            }
            if ($block !== null) {
                $clean[] = $block;
            }
        }
        if ($errors) {
            throw HttpException::validation($errors);
        }
        return ['subject' => $subject, 'preheader' => $preheader, 'coverImage' => $cover === '' ? null : $cover, 'blocks' => $clean];
    }

    private static function imageExists(string $path): bool
    {
        return preg_match(self::IMAGE_PATH, $path) === 1 && is_file(Config::path('uploads') . '/newsletter/' . basename($path));
    }

    private static function validUrl(string $url): bool
    {
        return mb_strlen($url) <= 500 && preg_match('#^https?://[^\s<>"]+$#i', $url) === 1 && filter_var($url, FILTER_VALIDATE_URL) !== false;
    }

    private static function row(int $id): array
    {
        return Database::one('SELECT * FROM newsletters WHERE id = ?', [$id]) ?? throw HttpException::notFound('Newsletter not found.');
    }

    private static function draft(int $id): array
    {
        $n = self::row($id);
        if ($n['status'] !== 'draft') {
            throw new HttpException(409, 'ALREADY_SENT', 'This newsletter has already been sent and can no longer be changed. Make a copy to send it again.');
        }
        return $n;
    }

    private static function subscriberCount(): int
    {
        return (int) Database::value("SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'subscribed'");
    }

    private static function siteUrl(): string
    {
        return rtrim(Config::string('app.url'), '/');
    }

    private static function iso(?string $utc): ?string
    {
        return $utc === null ? null : gmdate('c', strtotime($utc . ' UTC'));
    }
}
