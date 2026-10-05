<?php
/**
 * Plain-PHP test runner (no Composer/PHPUnit needed on shared hosting).
 *
 *   php api/tests/run.php            run every tests/*Test.php
 *   php api/tests/run.php Validator  run files whose name contains "Validator"
 *
 * Database tests run against config db_test (wiped and re-migrated once per run).
 */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__) . '/bootstrap.php';

use Wellness\Core\Config;
use Wellness\Core\Database;
use Wellness\Migrations\Migrator;

// ------------------------------------------------------------------ test API
final class AssertionFailed extends RuntimeException
{
}

/** @var array<string, callable> */
$GLOBALS['__tests'] = [];

function test(string $name, callable $fn): void
{
    $GLOBALS['__tests'][$GLOBALS['__file'] . ' › ' . $name] = $fn;
}

function assertSame(mixed $expected, mixed $actual, string $message = ''): void
{
    if ($expected !== $actual) {
        throw new AssertionFailed(($message ? "$message\n" : '') . 'Expected ' . var_export($expected, true) . ', got ' . var_export($actual, true));
    }
}

function assertTrue(bool $condition, string $message = 'Expected condition to be true'): void
{
    if (!$condition) {
        throw new AssertionFailed($message);
    }
}

function assertEqualsWithDelta(float $expected, float $actual, float $delta, string $message = ''): void
{
    if (abs($expected - $actual) > $delta) {
        throw new AssertionFailed(($message ? "$message\n" : '') . "Expected $expected ± $delta, got $actual");
    }
}

/** @return Throwable the caught exception, for further assertions */
function assertThrows(string $class, callable $fn): Throwable
{
    try {
        $fn();
    } catch (Throwable $e) {
        if ($e instanceof $class) {
            return $e;
        }
        throw new AssertionFailed("Expected $class, got " . $e::class . ': ' . $e->getMessage());
    }
    throw new AssertionFailed("Expected $class to be thrown");
}

/** Point the app at a freshly migrated test database (once per run). */
function useTestDatabase(): void
{
    static $ready = false;
    if ($ready) {
        return;
    }
    $testDb = Config::string('db_test.name');
    if ($testDb === '' || $testDb === Config::string('db.name')) {
        throw new RuntimeException('Config db_test.name must be set to a separate database.');
    }
    Config::override('db.name', $testDb);
    Database::reset();
    $migrator = new Migrator(Config::path('migrations'));
    $migrator->dropAllTables();
    $migrator->migrate();
    $ready = true;
}

// ------------------------------------------------------------------ discover & run
require __DIR__ . '/_helpers.php';
$filter = $argv[1] ?? '';
foreach (glob(__DIR__ . '/*Test.php') as $file) {
    if ($filter !== '' && stripos(basename($file), $filter) === false) {
        continue;
    }
    $GLOBALS['__file'] = basename($file, '.php');
    require $file;
}

$passed = 0;
$failures = [];
$start = microtime(true);
foreach ($GLOBALS['__tests'] as $name => $fn) {
    try {
        $fn();
        $passed++;
        echo "  \u{2713} $name\n";
    } catch (Throwable $e) {
        $failures[$name] = $e;
        echo "  \u{2717} $name\n";
    }
}

foreach ($failures as $name => $e) {
    echo "\nFAIL: $name\n  " . str_replace("\n", "\n  ", $e->getMessage()) . "\n";
    if (!$e instanceof AssertionFailed) {
        echo '  at ' . $e->getFile() . ':' . $e->getLine() . "\n";
    }
}

printf("\n%d passed, %d failed (%.2fs)\n", $passed, count($failures), microtime(true) - $start);
exit($failures === [] ? 0 : 1);
