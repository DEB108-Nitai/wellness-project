<?php
declare(strict_types=1);

namespace Wellness\Core;

/**
 * Splits a migration file into individual statements on ';' while respecting
 * quoted strings, backtick identifiers and -- / # / block comments.
 */
final class SqlSplitter
{
    /** @return list<string> */
    public static function split(string $sql): array
    {
        $statements = [];
        $current = '';
        $len = strlen($sql);
        $quote = null;

        for ($i = 0; $i < $len; $i++) {
            $ch = $sql[$i];
            $next = $i + 1 < $len ? $sql[$i + 1] : '';

            if ($quote !== null) {
                $current .= $ch;
                if ($ch === '\\' && $quote !== '`') {
                    $current .= $next;
                    $i++;
                } elseif ($ch === $quote) {
                    if ($next === $quote) { // doubled quote escape
                        $current .= $next;
                        $i++;
                    } else {
                        $quote = null;
                    }
                }
                continue;
            }

            if ($ch === '-' && $next === '-' || $ch === '#') {
                $end = strpos($sql, "\n", $i);
                $i = $end === false ? $len : $end;
                $current .= "\n";
                continue;
            }
            if ($ch === '/' && $next === '*') {
                $end = strpos($sql, '*/', $i + 2);
                $i = $end === false ? $len : $end + 1;
                continue;
            }
            if ($ch === "'" || $ch === '"' || $ch === '`') {
                $quote = $ch;
                $current .= $ch;
                continue;
            }
            if ($ch === ';') {
                if (trim($current) !== '') {
                    $statements[] = trim($current);
                }
                $current = '';
                continue;
            }
            $current .= $ch;
        }

        if (trim($current) !== '') {
            $statements[] = trim($current);
        }
        return $statements;
    }
}
