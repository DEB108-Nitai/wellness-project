<?php
declare(strict_types=1);

namespace Transenigma\Migrations;

use RuntimeException;
use Throwable;
use Transenigma\Core\Database;
use Transenigma\Core\SqlSplitter;

final class Migrator
{
    public function __construct(private readonly string $directory)
    {
        if (!is_dir($directory)) {
            throw new RuntimeException("Migrations directory not found: $directory");
        }
    }

    /** @return array<string, string|null> file => applied_at (null when pending) */
    public function status(): array
    {
        $this->ensureTable();
        $applied = [];
        foreach (Database::all('SELECT version, applied_at FROM schema_migrations') as $row) {
            $applied[$row['version']] = $row['applied_at'];
        }
        $status = [];
        foreach ($this->files() as $file) {
            $status[$file] = $applied[$file] ?? null;
        }
        return $status;
    }

    /** @return int number of migrations applied */
    public function migrate(?callable $onApplied = null): int
    {
        $count = 0;
        foreach ($this->status() as $file => $appliedAt) {
            if ($appliedAt !== null) {
                continue;
            }
            $statements = SqlSplitter::split((string) file_get_contents($this->directory . '/' . $file));
            $pdo = Database::pdo();
            // DDL auto-commits in MySQL, so a failed file is reported precisely instead of rolled back.
            foreach ($statements as $i => $sql) {
                try {
                    $pdo->exec($sql);
                } catch (Throwable $e) {
                    throw new RuntimeException(sprintf('%s failed at statement %d: %s', $file, $i + 1, $e->getMessage()), 0, $e);
                }
            }
            Database::run('INSERT INTO schema_migrations (version) VALUES (?)', [$file]);
            $count++;
            if ($onApplied) {
                $onApplied($file);
            }
        }
        return $count;
    }

    public function dropAllTables(): void
    {
        $pdo = Database::pdo();
        $tables = $pdo->query('SHOW FULL TABLES WHERE Table_type = \'BASE TABLE\'')->fetchAll(\PDO::FETCH_COLUMN);
        $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
        foreach ($tables as $table) {
            $pdo->exec('DROP TABLE `' . str_replace('`', '``', $table) . '`');
        }
        $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
    }

    /** @return list<string> */
    private function files(): array
    {
        $files = array_map('basename', glob($this->directory . '/*.sql') ?: []);
        sort($files, SORT_STRING);
        return $files;
    }

    private function ensureTable(): void
    {
        Database::run(
            'CREATE TABLE IF NOT EXISTS schema_migrations (
                version    VARCHAR(100) NOT NULL,
                applied_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (version)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    }
}
