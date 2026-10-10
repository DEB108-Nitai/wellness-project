<?php
/**
 * Applies database/migrations/*.sql in order, recording each in schema_migrations.
 *
 *   php api/bin/migrate.php            apply pending migrations
 *   php api/bin/migrate.php --status   list applied / pending
 *   php api/bin/migrate.php --fresh    DROP every table, then migrate (refused in production)
 *   php api/bin/migrate.php --test     run against the test database (config db_test)
 */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__) . '/bootstrap.php';

use Transenigma\Core\Config;
use Transenigma\Migrations\Migrator;

$args = array_slice($argv, 1);
if (in_array('--test', $args, true)) {
    Config::override('db.name', Config::string('db_test.name'));
}

$migrator = new Migrator(Config::path('migrations'));

if (in_array('--status', $args, true)) {
    foreach ($migrator->status() as $file => $applied) {
        printf("  %-40s %s\n", $file, $applied ? "applied $applied" : 'PENDING');
    }
    exit(0);
}

if (in_array('--fresh', $args, true)) {
    if (Config::isProduction() && !in_array('--force', $args, true)) {
        fwrite(STDERR, "Refusing to wipe a production database (add --force if you really mean it).\n");
        exit(1);
    }
    $migrator->dropAllTables();
    echo 'Dropped all tables in ' . Config::string('db.name') . PHP_EOL;
}

$applied = $migrator->migrate(static fn (string $file) => print("  applied $file\n"));
echo $applied === 0 ? "Nothing to migrate.\n" : "Done: $applied migration(s) applied to " . Config::string('db.name') . ".\n";
