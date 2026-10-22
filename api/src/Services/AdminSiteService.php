<?php
declare(strict_types=1);

namespace Transenigma\Services;

use Transenigma\Core\Database;
use Transenigma\Core\HttpException;
use Transenigma\Core\RateLimiter;
use Transenigma\Core\Request;
use Transenigma\Repositories\PsychometricRepository;
use Transenigma\Support\Csv;

/**
 * Admin: contact messages, newsletter subscribers, FAQs, the audit log and the question set / norms
 * (Phase 5 slice H; PRD ADM-3, ADM-5, ADM-7, ADM-9, ADM-10). Every change is audited; the audit log itself
 * is read-only here.
 */
final class AdminSiteService
{
    // ------------------------------------------------------------------ messages (ADM-5)

    public static function messages(array $f, int $page, int $perPage): array
    {
        [$where, $params] = self::messageFilter($f);
        $total = (int) Database::value("SELECT COUNT(*) FROM contact_messages m $where", $params);
        $offset = ($page - 1) * $perPage;
        $rows = Database::all(
            "SELECT m.id, m.name, m.email, m.subject, LEFT(m.message, 160) AS preview, m.status, m.created_at, m.handled_at
             FROM contact_messages m $where ORDER BY m.created_at DESC, m.id DESC LIMIT $perPage OFFSET $offset",
            $params
        );
        return [
            'items' => array_map(static fn (array $m): array => [
                'id' => (int) $m['id'], 'name' => $m['name'], 'email' => $m['email'], 'subject' => $m['subject'],
                'preview' => $m['preview'], 'status' => $m['status'],
                'createdAt' => self::iso($m['created_at']), 'handledAt' => self::iso($m['handled_at']),
            ], $rows),
            'total' => $total,
            'page' => $page,
            'perPage' => $perPage,
            'counts' => [
                'new' => (int) Database::value("SELECT COUNT(*) FROM contact_messages WHERE status = 'new'"),
                'handled' => (int) Database::value("SELECT COUNT(*) FROM contact_messages WHERE status = 'handled'"),
            ],
        ];
    }

    public static function message(int $id): array
    {
        $m = Database::one(
            'SELECT m.*, u.name AS handled_by_name FROM contact_messages m LEFT JOIN users u ON u.id = m.handled_by WHERE m.id = ?',
            [$id]
        ) ?? throw HttpException::notFound('Message not found.');
        $replies = Database::all(
            'SELECT r.id, r.subject, r.body, r.created_at, u.name AS admin_name FROM contact_message_replies r
             LEFT JOIN users u ON u.id = r.admin_id WHERE r.message_id = ? ORDER BY r.created_at, r.id',
            [$id]
        );
        return [
            'id' => (int) $m['id'], 'name' => $m['name'], 'email' => $m['email'], 'subject' => $m['subject'],
            'message' => $m['message'], 'status' => $m['status'], 'createdAt' => self::iso($m['created_at']),
            'handledAt' => self::iso($m['handled_at']), 'handledBy' => $m['handled_by_name'],
            'replies' => array_map(static fn (array $r): array => [
                'id' => (int) $r['id'], 'subject' => $r['subject'], 'body' => $r['body'], 'sentAt' => self::iso($r['created_at']), 'sentBy' => $r['admin_name'],
            ], $replies),
        ];
    }

    /**
     * Email a reply from the support address, keep a copy and mark the message handled. Nothing is stored if the
     * email could not be sent, so the history only shows replies that really went out.
     */
    public static function replyToMessage(int $id, string $subject, string $body, array $admin, Request $request): array
    {
        $m = self::message($id);
        // One line, whatever was pasted in.
        $subject = trim((string) preg_replace('/\s+/u', ' ', $subject));
        RateLimiter::hit('message_reply', 'user:' . $admin['id'], 30, 3600);
        // Saved first and emailed last: if saving fails, nothing was sent, so trying again can't send it twice.
        // If the email fails, the saves are undone. (Not a transaction: the mail log's "failed" row must stay.)
        $replyId = Database::insert('INSERT INTO contact_message_replies (message_id, admin_id, subject, body) VALUES (?, ?, ?, ?)', [$id, $admin['id'], $subject, $body]);
        $wasNew = $m['status'] === 'new';
        if ($wasNew) {
            Database::run("UPDATE contact_messages SET status = 'handled', handled_by = ?, handled_at = UTC_TIMESTAMP() WHERE id = ?", [$admin['id'], $id]);
        }
        $sent = Mailer::send($m['email'], 'contact-reply', [
            'name' => $m['name'], 'subject' => $subject, 'reply' => $body, 'original' => $m['message'],
            'receivedAt' => gmdate('j M Y', strtotime($m['createdAt'])),
        ]);
        if (!$sent) {
            Database::run('DELETE FROM contact_message_replies WHERE id = ?', [$replyId]);
            if ($wasNew) {
                Database::run("UPDATE contact_messages SET status = 'new', handled_by = NULL, handled_at = NULL WHERE id = ?", [$id]);
            }
            throw new HttpException(502, 'MAIL_FAILED', 'The email could not be sent. Please try again in a few minutes.');
        }
        AuditService::forUser($admin, 'MESSAGE_REPLIED', 'contact_message', (string) $id, [], $request);
        return self::message($id);
    }

    /** Mark handled (who and when are recorded) or back to new. */
    public static function setMessageStatus(int $id, string $status, array $admin, Request $request): array
    {
        $before = self::message($id);
        if ($before['status'] !== $status) {
            if ($status === 'handled') {
                Database::run("UPDATE contact_messages SET status = 'handled', handled_by = ?, handled_at = UTC_TIMESTAMP() WHERE id = ?", [$admin['id'], $id]);
            } else {
                Database::run("UPDATE contact_messages SET status = 'new', handled_by = NULL, handled_at = NULL WHERE id = ?", [$id]);
            }
            AuditService::forUser($admin, $status === 'handled' ? 'MESSAGE_HANDLED' : 'MESSAGE_REOPENED', 'contact_message', (string) $id, [], $request);
        }
        return self::message($id);
    }

    public static function exportMessages(array $f): void
    {
        [$where, $params] = self::messageFilter($f);
        self::streamCsv(
            ['Received (UTC)', 'Status', 'Name', 'Email', 'Subject', 'Message', 'Handled (UTC)'],
            Database::run("SELECT m.* FROM contact_messages m $where ORDER BY m.created_at DESC, m.id DESC", $params),
            static fn (array $m): array => [$m['created_at'], $m['status'], $m['name'], $m['email'], $m['subject'], $m['message'], $m['handled_at']]
        );
    }

    /** @return array{0:string,1:array} */
    private static function messageFilter(array $f): array
    {
        $where = [];
        $params = [];
        if (!empty($f['status'])) {
            $where[] = 'm.status = ?';
            $params[] = $f['status'];
        }
        self::dateFilter($f, 'm.created_at', $where, $params);
        if (!empty($f['q'])) {
            $where[] = '(m.name LIKE ? OR m.email LIKE ? OR m.subject LIKE ? OR m.message LIKE ?)';
            $like = self::like($f['q']);
            array_push($params, $like, $like, $like, $like);
        }
        return [$where ? 'WHERE ' . implode(' AND ', $where) : '', $params];
    }

    // ------------------------------------------------------------------ newsletter subscribers (ADM-3)

    public static function subscribers(array $f, int $page, int $perPage): array
    {
        [$where, $params] = self::subscriberFilter($f);
        $offset = ($page - 1) * $perPage;
        return [
            'items' => array_map(static fn (array $s): array => [
                'id' => (int) $s['id'], 'email' => $s['email'], 'status' => $s['status'],
                'createdAt' => self::iso($s['created_at']), 'unsubscribedAt' => self::iso($s['unsubscribed_at']),
            ], Database::all(
                "SELECT s.id, s.email, s.status, s.created_at, s.unsubscribed_at FROM newsletter_subscribers s $where
                 ORDER BY s.created_at DESC, s.id DESC LIMIT $perPage OFFSET $offset",
                $params
            )),
            'total' => (int) Database::value("SELECT COUNT(*) FROM newsletter_subscribers s $where", $params),
            'page' => $page,
            'perPage' => $perPage,
            'counts' => [
                'subscribed' => (int) Database::value("SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'subscribed'"),
                'unsubscribed' => (int) Database::value("SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'unsubscribed'"),
                'last30Days' => (int) Database::value("SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'subscribed' AND created_at >= UTC_TIMESTAMP() - INTERVAL 30 DAY"),
            ],
        ];
    }

    /** The unsubscribe token is never exported or sent to the browser. */
    public static function exportSubscribers(array $f): void
    {
        [$where, $params] = self::subscriberFilter($f);
        self::streamCsv(
            ['Email', 'Status', 'Subscribed (UTC)', 'Unsubscribed (UTC)'],
            Database::run("SELECT s.email, s.status, s.created_at, s.unsubscribed_at FROM newsletter_subscribers s $where ORDER BY s.created_at DESC", $params),
            static fn (array $s): array => [$s['email'], $s['status'], $s['created_at'], $s['unsubscribed_at']]
        );
    }

    /** @return array{0:string,1:array} */
    private static function subscriberFilter(array $f): array
    {
        $where = [];
        $params = [];
        if (!empty($f['status'])) {
            $where[] = 's.status = ?';
            $params[] = $f['status'];
        }
        if (!empty($f['q'])) {
            $where[] = 's.email LIKE ?';
            $params[] = self::like($f['q']);
        }
        return [$where ? 'WHERE ' . implode(' AND ', $where) : '', $params];
    }

    // ------------------------------------------------------------------ FAQs (ADM-7)

    public static function faqs(): array
    {
        return array_map([self::class, 'faqOut'], Database::all('SELECT * FROM faqs ORDER BY sort_order, id'));
    }

    public static function createFaq(array $data, array $admin, Request $request): array
    {
        $id = Database::insert(
            'INSERT INTO faqs (category, question, answer, sort_order, is_published) VALUES (?, ?, ?, ?, ?)',
            [
                $data['category'], $data['question'], $data['answer'],
                (int) Database::value('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM faqs'), (int) ($data['published'] ?? true),
            ]
        );
        AuditService::forUser($admin, 'FAQ_CREATED', 'faq', (string) $id, ['question' => $data['question']], $request);
        return self::faq($id);
    }

    public static function updateFaq(int $id, array $data, array $admin, Request $request): array
    {
        $before = self::faq($id);
        $sets = [];
        $params = [];
        foreach (['category' => 'category', 'question' => 'question', 'answer' => 'answer', 'published' => 'is_published'] as $key => $column) {
            if (array_key_exists($key, $data)) {
                $sets[] = "$column = ?";
                $params[] = $key === 'published' ? (int) $data[$key] : $data[$key];
            }
        }
        if ($sets !== []) {
            Database::run('UPDATE faqs SET ' . implode(', ', $sets) . ' WHERE id = ?', [...$params, $id]);
            AuditService::forUser($admin, 'FAQ_UPDATED', 'faq', (string) $id, ['question' => $before['question'], 'fields' => array_keys($data)], $request);
        }
        return self::faq($id);
    }

    public static function deleteFaq(int $id, array $admin, Request $request): void
    {
        $faq = self::faq($id);
        Database::run('DELETE FROM faqs WHERE id = ?', [$id]);
        AuditService::forUser($admin, 'FAQ_DELETED', 'faq', (string) $id, ['question' => $faq['question']], $request);
    }

    /** The new order of every FAQ: $ids must list each FAQ exactly once (so a stale page cannot drop one). */
    public static function reorderFaqs(array $ids, array $admin, Request $request): array
    {
        $existing = array_map('intval', array_column(Database::all('SELECT id FROM faqs'), 'id'));
        $given = array_map('intval', $ids);
        $sortedGiven = $given;
        sort($existing);
        sort($sortedGiven);
        if ($sortedGiven !== $existing) {
            throw HttpException::conflict('The list changed in another window. Please reload and try again.', 'FAQ_LIST_CHANGED');
        }
        Database::transaction(static function () use ($given): void {
            foreach ($given as $n => $id) {
                Database::run('UPDATE faqs SET sort_order = ? WHERE id = ?', [$n + 1, $id]);
            }
        });
        AuditService::forUser($admin, 'FAQ_REORDERED', 'faq_list', 'order', ['count' => count($given)], $request);
        return self::faqs();
    }

    private static function faq(int $id): array
    {
        return self::faqOut(Database::one('SELECT * FROM faqs WHERE id = ?', [$id]) ?? throw HttpException::notFound('FAQ not found.'));
    }

    private static function faqOut(array $f): array
    {
        return [
            'id' => (int) $f['id'], 'category' => $f['category'], 'question' => $f['question'], 'answer' => $f['answer'],
            'sortOrder' => (int) $f['sort_order'], 'published' => (bool) $f['is_published'],
        ];
    }

    // ------------------------------------------------------------------ audit log (ADM-10, read-only)

    public static function audit(array $f, int $page, int $perPage): array
    {
        $where = [];
        $params = [];
        if (!empty($f['action'])) {
            $where[] = 'a.action = ?';
            $params[] = $f['action'];
        }
        if (!empty($f['actorType'])) {
            $where[] = 'a.actor_type = ?';
            $params[] = $f['actorType'];
        }
        if (!empty($f['actor'])) {
            $where[] = '(u.email LIKE ? OR u.name LIKE ?)';
            $like = self::like($f['actor']);
            array_push($params, $like, $like);
        }
        self::dateFilter($f, 'a.created_at', $where, $params);
        $sqlWhere = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $offset = ($page - 1) * $perPage;
        $rows = Database::all(
            "SELECT a.id, a.created_at, a.actor_type, a.actor_user_id, u.name AS actor_name, u.email AS actor_email,
                    a.action, a.entity_type, a.entity_id, a.details
             FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id $sqlWhere
             ORDER BY a.created_at DESC, a.id DESC LIMIT $perPage OFFSET $offset",
            $params
        );
        return [
            'items' => array_map(static fn (array $a): array => [
                'id' => (int) $a['id'],
                'createdAt' => self::iso($a['created_at']),
                'actorType' => $a['actor_type'],
                'actor' => $a['actor_user_id'] === null ? null : [
                    'id' => (int) $a['actor_user_id'], 'name' => $a['actor_name'], 'email' => $a['actor_email'],
                ],
                'action' => $a['action'],
                'entityType' => $a['entity_type'],
                'entityId' => $a['entity_id'],
                'details' => $a['details'] === null ? null : json_decode($a['details'], true),
            ], $rows),
            'total' => (int) Database::value("SELECT COUNT(*) FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id $sqlWhere", $params),
            'page' => $page,
            'perPage' => $perPage,
            'actions' => array_column(Database::all('SELECT DISTINCT action FROM audit_logs ORDER BY action'), 'action'),
        ];
    }

    // ------------------------------------------------------------------ question set and norms (ADM-9, read-only)

    public static function items(): array
    {
        $version = PsychometricRepository::activeItemSetVersion();
        $set = Database::one('SELECT version, description, created_at FROM item_sets WHERE version = ?', [$version]);
        $factors = array_column(Database::all('SELECT code, name FROM factors ORDER BY sort_order'), 'name', 'code');
        return [
            'itemSet' => ['version' => $set['version'], 'description' => $set['description']],
            'items' => array_map(static fn (array $i): array => [
                'position' => (int) $i['position'], 'code' => $i['item_code'], 'text' => $i['text'],
                'factor' => $i['factor_code'], 'factorName' => $i['factor_code'] === null ? null : ($factors[$i['factor_code']] ?? null),
                'keyed' => $i['keyed'], 'attentionCheck' => (bool) $i['is_attention_check'],
                'expected' => $i['expected_answer'] === null ? null : (int) $i['expected_answer'],
            ], Database::all('SELECT * FROM items WHERE item_set_version = ? ORDER BY position', [$version])),
        ];
    }

    public static function norms(): array
    {
        $set = Database::one('SELECT version, source, sample_size, sten_method, created_at FROM norm_sets WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1')
            ?? throw HttpException::notFound('No active norm set.');
        return [
            'normSet' => ['version' => $set['version'], 'source' => $set['source'], 'sampleSize' => (int) $set['sample_size'], 'stenMethod' => $set['sten_method']],
            'factors' => array_map(static fn (array $r): array => [
                'code' => $r['factor_code'], 'name' => $r['name'], 'mean' => (float) $r['mean'], 'sd' => (float) $r['sd'],
                'n' => $r['n'] === null ? null : (int) $r['n'], 'alpha' => $r['alpha'] === null ? null : (float) $r['alpha'],
            ], Database::all(
                'SELECT n.*, f.name FROM factor_norms n JOIN factors f ON f.code = n.factor_code WHERE n.norm_version = ? ORDER BY f.sort_order',
                [$set['version']]
            )),
            'domains' => array_map(static fn (array $r): array => [
                'code' => $r['domain_code'], 'name' => $r['name'], 'mean' => (float) $r['mean'], 'sd' => (float) $r['sd'],
            ], Database::all(
                'SELECT n.*, d.name FROM domain_norms n JOIN domains d ON d.code = n.domain_code WHERE n.norm_version = ? ORDER BY d.sort_order',
                [$set['version']]
            )),
        ];
    }

    // ------------------------------------------------------------------ helpers

    private static function dateFilter(array $f, string $column, array &$where, array &$params): void
    {
        // Whole UTC days, inclusive.
        if (!empty($f['from'])) {
            $where[] = "$column >= ?";
            $params[] = $f['from'] . ' 00:00:00';
        }
        if (!empty($f['to'])) {
            $where[] = "$column < ? + INTERVAL 1 DAY";
            $params[] = $f['to'] . ' 00:00:00';
        }
    }

    private static function like(string $q): string
    {
        return '%' . addcslashes($q, '%_\\') . '%';
    }

    private static function iso(?string $utc): ?string
    {
        return $utc === null ? null : gmdate('c', strtotime($utc . ' UTC'));
    }

    /** Streams the rows through the shared CSV writer (Support\Csv). */
    private static function streamCsv(array $head, \PDOStatement $rows, callable $map): void
    {
        $out = Csv::open();
        Csv::row($out, $head);
        while ($r = $rows->fetch()) {
            Csv::row($out, $map($r));
        }
        fclose($out);
    }
}
