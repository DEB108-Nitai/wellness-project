<?php
declare(strict_types=1);

namespace Transenigma\Support;

/**
 * The one way admin CSV exports are written (registrations, assessments, messages, subscribers):
 * download headers, a UTF-8 BOM so Excel shows non-English names correctly, RFC 4180 quoting and
 * formula-injection neutralising on every cell.
 */
final class Csv
{
    /** Download headers; the file is named transenigma-<name>-<UTC timestamp>.csv. */
    public static function headers(string $name): void
    {
        if (!headers_sent()) { // always true over HTTP; the CLI test runner has already printed
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="transenigma-' . $name . '-' . gmdate('Ymd-His') . '.csv"');
            header('Cache-Control: no-store');
            header('X-Content-Type-Options: nosniff');
        }
    }

    /** @return resource the output stream, with the BOM already written */
    public static function open()
    {
        $out = fopen('php://output', 'w');
        fwrite($out, "\xEF\xBB\xBF");
        return $out;
    }

    /**
     * Writes one row. escape '' = RFC 4180 (quotes doubled), as spreadsheets read it; PHP's default
     * backslash escape lets a value like x\",=CMD() split into a new, unchecked cell.
     * @param resource $out
     */
    public static function row($out, array $cells): void
    {
        fputcsv($out, array_map([self::class, 'safe'], $cells), ',', '"', '');
    }

    /** A cell starting with = + - @ tab or CR would run as a formula in Excel, so it gets a leading quote. */
    public static function safe(mixed $value): string
    {
        $s = (string) ($value ?? '');
        return preg_match('/^[=+\-@\t\r]/', $s) ? "'" . $s : $s;
    }
}
