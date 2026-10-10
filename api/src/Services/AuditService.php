<?php
declare(strict_types=1);

namespace Transenigma\Services;

use Throwable;
use Transenigma\Core\Database;
use Transenigma\Core\Logger;
use Transenigma\Core\Request;

/**
 * Append-only audit trail (PRD AUTH-13, ADM-10). Never throws: a failed audit
 * write is logged but must not break the user's action.
 */
final class AuditService
{
    /**
     * @param 'guest'|'user'|'admin'|'system' $actorType
     */
    public static function log(
        string $action,
        string $actorType,
        ?int $actorUserId = null,
        ?string $entityType = null,
        string|int|null $entityId = null,
        array $details = [],
        ?Request $request = null,
    ): void {
        try {
            Database::run(
                'INSERT INTO audit_logs (actor_user_id, actor_type, action, entity_type, entity_id, details, ip_hash)
                 VALUES (?, ?, ?, ?, ?, ?, ?)',
                [
                    $actorUserId,
                    $actorType,
                    $action,
                    $entityType,
                    $entityId === null ? null : (string) $entityId,
                    $details === [] ? null : json_encode($details, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    $request?->ipHash(),
                ]
            );
        } catch (Throwable $e) {
            Logger::exception($e, ['audit_action' => $action]);
        }
    }

    /** Log on behalf of a user row (actor type derived from the role). */
    public static function forUser(array $user, string $action, ?string $entityType = null, string|int|null $entityId = null, array $details = [], ?Request $request = null): void
    {
        self::log($action, $user['role'] === 'admin' ? 'admin' : 'user', (int) $user['id'], $entityType, $entityId ?? $user['id'], $details, $request);
    }
}
