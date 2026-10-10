<?php
declare(strict_types=1);

namespace Transenigma\Core;

use Throwable;

/**
 * Append-only JSON-lines log in the logs directory (outside the public site).
 */
final class Logger
{
    public static function error(string $message, array $context = []): void
    {
        self::write('error', $message, $context);
    }

    public static function warning(string $message, array $context = []): void
    {
        self::write('warning', $message, $context);
    }

    public static function info(string $message, array $context = []): void
    {
        self::write('info', $message, $context);
    }

    public static function exception(Throwable $e, array $context = []): void
    {
        self::error($e->getMessage(), $context + [
            'exception' => $e::class,
            'file' => $e->getFile() . ':' . $e->getLine(),
            'trace' => array_slice(explode("\n", $e->getTraceAsString()), 0, 15),
        ]);
    }

    private static function write(string $level, string $message, array $context): void
    {
        try {
            $line = json_encode([
                'time' => gmdate('c'),
                'level' => $level,
                'message' => $message,
                'context' => $context,
            ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR);
            $file = Config::path('logs') . '/app-' . gmdate('Y-m-d') . '.log';
            file_put_contents($file, $line . "\n", FILE_APPEND | LOCK_EX);
        } catch (Throwable) {
            error_log("[$level] $message");
        }
    }
}
