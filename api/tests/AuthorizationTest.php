<?php
declare(strict_types=1);

use Transenigma\Core\Kernel;
use Transenigma\Core\Request;
use Transenigma\Core\Router;

/**
 * Admin-only and user-only routes are enforced by the server (Kernel guards), not by the browser:
 * a guest gets 401 and a signed-in non-admin gets 403 before any controller runs. This answers
 * the review finding about the old prototype's client-side "Admin Console" gate (prototype fault 2).
 */
function kernelAs(?array $user): Kernel
{
    $router = new Router();
    (require dirname(__DIR__) . '/routes.php')($router);
    $kernel = new Kernel($router);
    $kernel->setUserResolver(static fn (): ?array => $user);
    return $kernel;
}

function getAs(?array $user, string $path): int
{
    return kernelAs($user)->handle(new Request('GET', $path, [], ['REMOTE_ADDR' => '10.0.0.9'], ''))->status;
}

test('admin routes: guests get 401, signed-in non-admins get 403', function () {
    useTestDatabase();
    $member = ['id' => 999999, 'role' => 'user', 'email' => 'member@example.com'];
    foreach (['/admin/registrations', '/admin/export/registrations', '/admin/settings'] as $path) {
        assertSame(401, getAs(null, $path), "guest blocked from $path");
        assertSame(403, getAs($member, $path), "non-admin blocked from $path");
    }
});

test('user routes: guests get 401', function () {
    useTestDatabase();
    foreach (['/results', '/challenge/my-registrations'] as $path) {
        assertSame(401, getAs(null, $path), "guest blocked from $path");
    }
});

test('every admin route in the route table requires the admin role', function () {
    $src = file_get_contents(dirname(__DIR__) . '/routes.php');
    preg_match_all("#->(get|post|put|patch|delete)\('(/admin[^']*)',[^\n]*#", $src, $m, PREG_SET_ORDER);
    assertTrue(count($m) >= 5, 'admin routes found');
    foreach ($m as [$line, , $path]) {
        assertTrue(str_contains($line, '$admin') || str_contains($line, "'auth' => 'admin'"), "$path is admin-only");
    }
});
