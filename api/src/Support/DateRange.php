<?php
declare(strict_types=1);

namespace Transenigma\Support;

use Transenigma\Core\HttpException;

/** Validation for admin "from/to" day filters (YYYY-MM-DD, inclusive). */
final class DateRange
{
    public const RULE = 'string|regex:/^\d{4}-\d{2}-\d{2}$/';

    /** Throws 422 for an impossible date (2026-02-30) or a reversed range. */
    public static function check(array $f): void
    {
        foreach (['from', 'to'] as $k) {
            if (isset($f[$k]) && !checkdate((int) substr($f[$k], 5, 2), (int) substr($f[$k], 8, 2), (int) substr($f[$k], 0, 4))) {
                throw HttpException::validation([$k => 'Please choose a valid date.']);
            }
        }
        if (isset($f['from'], $f['to']) && $f['from'] > $f['to']) {
            throw HttpException::validation(['to' => 'The end date must be on or after the start date.']);
        }
        if (isset($f['from'], $f['to']) && (strtotime($f['to']) - strtotime($f['from'])) > 366 * 86400) {
            throw HttpException::validation(['to' => 'Please choose at most one year.']);
        }
    }
}
