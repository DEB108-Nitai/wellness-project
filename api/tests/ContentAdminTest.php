<?php
declare(strict_types=1);

use Transenigma\Core\Config;
use Transenigma\Core\Database;
use Transenigma\Core\HttpException;
use Transenigma\Core\Request;
use Transenigma\Controllers\AdminContentController;
use Transenigma\Repositories\UserRepository;
use Transenigma\Services\AdminContentService;
use Transenigma\Services\ContentService;

/**
 * Phase 5 slice A: research papers and consultancy projects are managed by admins, and every number on the
 * site follows the content. Each test removes what it adds, so the seeded totals other tests check stay intact.
 */
function contentAdmin(): array
{
    static $admin = null;
    if ($admin === null) {
        $id = UserRepository::create('Content Admin', uniqueEmail(), null, null, true, 'admin');
        $admin = UserRepository::find($id);
    }
    return $admin;
}

test('adding a paper in a new category creates a new research field and updates every count', function () {
    useTestDatabase();
    $before = AdminContentService::stats();
    $paper = AdminContentService::createPaper([
        'citation' => 'Das, V. 2026. Measuring calm attention in daily practice. Journal of Test Studies.',
        'year' => 2026, 'url' => 'https://example.org/paper',
        'newCategory' => ['name' => 'Contemplative Neuroscience & Attention', 'tagline' => 'How practice shapes the mind.'],
    ], contentAdmin(), authReq());
    $category = AdminContentService::category($paper['categoryId']);
    try {
        assertSame('contemplative-neuroscience-attention', $category['slug'], 'readable slug');
        $after = AdminContentService::stats();
        assertSame($before['publications'] + 1, $after['publications']);
        assertSame($before['researchFields'] + 1, $after['researchFields'], 'a new field (and a new home card)');

        $public = ContentService::research();
        $last = end($public['categories']);
        assertSame('Contemplative Neuroscience & Attention', $last['name'], 'new categories go last');
        assertSame(1, $last['count']);
        assertSame('How practice shapes the mind.', $last['tagline']);

        // A second paper in the same (existing) category raises only that category's count.
        $second = AdminContentService::createPaper([
            'citation' => 'Das, V. 2024. An earlier paper on attention. Journal of Test Studies.', 'year' => 2024,
            'categoryId' => $category['id'],
        ], contentAdmin(), authReq());
        $public = ContentService::research();
        $last = end($public['categories']);
        assertSame(2, $last['count']);
        assertSame([2026, 2024], array_column($last['publications'], 'year'), 'newest year first');
        assertSame($before['researchFields'] + 1, AdminContentService::stats()['researchFields'], 'no extra field');

        // Unpublishing hides a paper from the site and from the counts.
        AdminContentService::updatePaper($second['id'], ['published' => false], contentAdmin(), authReq());
        assertSame($before['publications'] + 1, AdminContentService::stats()['publications']);

        // A category with papers cannot be deleted.
        $e = assertThrows(HttpException::class, fn () => AdminContentService::deleteCategory($category['id'], contentAdmin(), authReq()));
        assertSame('CATEGORY_NOT_EMPTY', $e->errorCode);
        AdminContentService::deletePaper($second['id'], contentAdmin(), authReq());
    } finally {
        Database::run('DELETE FROM publications WHERE category_id = ?', [$category['id']]);
        AdminContentService::deleteCategory($category['id'], contentAdmin(), authReq());
    }
    assertSame($before, AdminContentService::stats(), 'back to the seeded numbers');
    assertTrue((int) Database::value("SELECT COUNT(*) FROM audit_logs WHERE action LIKE 'CONTENT_%' AND actor_user_id = ?", [contentAdmin()['id']]) >= 5, 'audited');
});

test('a new category name must be unique, and a failed paper leaves no empty category behind', function () {
    useTestDatabase();
    $existing = ContentService::research()['categories'][0]['name'];
    $e = assertThrows(HttpException::class, fn () => AdminContentService::createCategory(['name' => mb_strtoupper($existing)], contentAdmin(), authReq()));
    assertSame(['name'], array_keys($e->fields));

    $count = (int) Database::value('SELECT COUNT(*) FROM research_categories');
    assertThrows(HttpException::class, fn () => AdminContentService::createPaper(
        ['citation' => 'A paper in a category that does not exist.', 'categoryId' => 999999], contentAdmin(), authReq()
    ));
    assertSame($count, (int) Database::value('SELECT COUNT(*) FROM research_categories'));
});

test('consultancy projects can be added, edited and removed; client projects and clients follow', function () {
    useTestDatabase();
    $before = AdminContentService::stats();
    $project = AdminContentService::createProject([
        'group' => 'web-mobile', 'name' => 'Test Wellness Portal', 'clientName' => 'Test Hospital Trust',
        'description' => 'A patient portal with appointments and reports.', 'url' => 'https://example.org',
    ], contentAdmin(), authReq());
    try {
        $after = AdminContentService::stats();
        assertSame($before['clientProjects'] + 1, $after['clientProjects']);
        assertTrue(in_array('Test Hospital Trust', $after['clients'], true));
        $group = array_values(array_filter(ContentService::consultancy()['groups'], fn ($g) => $g['slug'] === 'web-mobile'))[0];
        assertSame('Test Wellness Portal', end($group['projects'])['name'], 'shown on /consultancy, last in its section');

        // Moving it to "Upcoming products" means it no longer counts as client work.
        AdminContentService::updateProject($project['id'], ['group' => 'upcoming'], contentAdmin(), authReq());
        assertSame($before['clientProjects'], AdminContentService::stats()['clientProjects']);
    } finally {
        AdminContentService::deleteProject($project['id'], contentAdmin(), authReq());
    }
    assertSame($before, AdminContentService::stats());
});

test('project images: only real JPEG, PNG or WebP files up to 2 MB are stored, under a random name', function () {
    useTestDatabase();
    $dir = sys_get_temp_dir() . '/te-uploads-' . bin2hex(random_bytes(4));
    Config::override('paths.uploads', $dir);
    try {
        // A real 1×1 PNG.
        $png = tempnam(sys_get_temp_dir(), 'png');
        file_put_contents($png, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='));
        $path = AdminContentService::storeProjectImage(['tmp' => $png, 'size' => filesize($png), 'name' => 'logo.png'], contentAdmin(), authReq());
        assertTrue((bool) preg_match(AdminContentService::IMAGE_PATH, $path), "stored as $path");
        assertTrue(str_starts_with($path, '/uploads/projects/') && str_ends_with($path, '.png'));
        assertTrue(is_file($dir . '/projects/' . basename($path)));
        assertTrue(is_file($dir . '/.htaccess'), 'the folder never runs scripts');

        // A PHP script renamed to .png is refused (checked by content, not by name).
        $php = tempnam(sys_get_temp_dir(), 'php');
        file_put_contents($php, '<?php echo "pwned";');
        $e = assertThrows(HttpException::class, fn () => AdminContentService::storeProjectImage(['tmp' => $php, 'size' => filesize($php), 'name' => 'x.png'], contentAdmin(), authReq()));
        assertSame(['image'], array_keys($e->fields));
        // Too large.
        $e = assertThrows(HttpException::class, fn () => AdminContentService::storeProjectImage(['tmp' => $png, 'size' => 3_000_000, 'name' => 'big.png'], contentAdmin(), authReq()));
        assertSame(['image'], array_keys($e->fields));
    } finally {
        Config::override('paths.uploads', null);
        array_map('unlink', glob("$dir/projects/*") ?: []);
        @unlink("$dir/.htaccess");
        @rmdir("$dir/projects");
        @rmdir($dir);
    }
});

test('admin content routes are admin-only', function () {
    useTestDatabase();
    $member = ['id' => 999999, 'role' => 'user', 'email' => 'member@example.com'];
    foreach (['/admin/research', '/admin/consultancy'] as $path) {
        assertSame(401, getAs(null, $path), "guest blocked from $path");
        assertSame(403, getAs($member, $path), "non-admin blocked from $path");
    }
});

/** A JSON request as the admin controller receives it. */
function contentJson(array $body): Request
{
    return new Request('POST', '/admin/x', [], ['REMOTE_ADDR' => '10.0.0.7', 'CONTENT_TYPE' => 'application/json'], json_encode($body));
}

function asContentAdmin(): void
{
    freshSession();
    $_SESSION['auth_uid'] = (int) contentAdmin()['id'];
    $_SESSION['auth_ver'] = (int) contentAdmin()['session_version'];
    $_SESSION['auth_seen'] = time();
    \Transenigma\Services\AuthService::flush();
}

test('the admin controller refuses unsafe links, foreign image paths, bad years and malformed new categories', function () {
    useTestDatabase();
    asContentAdmin();
    $c = new AdminContentController();
    $categoryId = ContentService::research()['categories'] ? (int) Database::value('SELECT id FROM research_categories ORDER BY id LIMIT 1') : 0;
    $paper = ['citation' => 'A valid enough citation text.', 'categoryId' => $categoryId];
    foreach (['http://example.org/p', 'javascript:alert(1)', 'https://localhost/p', 'ftp://example.org/p'] as $bad) {
        $e = assertThrows(HttpException::class, fn () => $c->createPaper(contentJson($paper + ['url' => $bad])));
        assertSame(['url'], array_keys($e->fields), "refuses $bad");
    }
    $e = assertThrows(HttpException::class, fn () => $c->createPaper(contentJson($paper + ['year' => 1800])));
    assertSame(['year'], array_keys($e->fields));
    $e = assertThrows(HttpException::class, fn () => $c->createPaper(contentJson(['citation' => 'A valid enough citation text.', 'newCategory' => 'Psychology'])));
    assertSame(['newCategory'], array_keys($e->fields));
    $e = assertThrows(HttpException::class, fn () => $c->createPaper(contentJson(['citation' => 'A valid enough citation text.'])));
    assertSame(['categoryId'], array_keys($e->fields), 'a category is required');

    $project = ['group' => 'iot', 'name' => 'Path Test', 'description' => 'Testing the image path rule here.'];
    foreach (['/uploads/../api/config/x.png', 'https://evil.example/x.png', '/uploads/projects/x.svg', '/images/team/a.webp'] as $bad) {
        $e = assertThrows(HttpException::class, fn () => $c->createProject(contentJson($project + ['image' => $bad])));
        assertSame(['image'], array_keys($e->fields), "refuses image $bad");
    }
    assertSame(0, (int) Database::value("SELECT COUNT(*) FROM consultancy_projects WHERE name = 'Path Test'"), 'nothing stored');
});

test('uploads: replaced or deleted images are removed, shared and bundled ones kept, and unsaved ones swept later', function () {
    useTestDatabase();
    $dir = sys_get_temp_dir() . '/te-uploads-' . bin2hex(random_bytes(4));
    Config::override('paths.uploads', $dir);
    $png = tempnam(sys_get_temp_dir(), 'png');
    file_put_contents($png, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='));
    $store = fn () => AdminContentService::storeProjectImage(['tmp' => $png, 'size' => filesize($png), 'name' => 'a.png'], contentAdmin(), authReq());
    $file = fn (string $path) => $dir . '/projects/' . basename($path);
    $ids = [];
    try {
        [$a, $b, $orphan] = [$store(), $store(), $store()];
        $p1 = AdminContentService::createProject(['group' => 'iot', 'name' => 'Upload One', 'description' => 'First project using image A.', 'image' => $a], contentAdmin(), authReq());
        $p2 = AdminContentService::createProject(['group' => 'iot', 'name' => 'Upload Two', 'description' => 'Second project also using A.', 'image' => $a], contentAdmin(), authReq());
        $ids = [$p1['id'], $p2['id']];

        AdminContentService::updateProject($p1['id'], ['image' => $b], contentAdmin(), authReq());
        assertTrue(is_file($file($a)), 'still used by project two, so kept');
        AdminContentService::deleteProject($p2['id'], contentAdmin(), authReq());
        $ids = [$p1['id']];
        assertTrue(!is_file($file($a)), 'no longer used: deleted');

        // A bundled image is never deleted.
        AdminContentService::updateProject($p1['id'], ['image' => '/images/projects/salpg.webp'], contentAdmin(), authReq());
        AdminContentService::updateProject($p1['id'], ['image' => null], contentAdmin(), authReq());
        assertTrue(is_file(dirname(__DIR__, 2) . '/public/images/projects/salpg.webp'));

        // The orphan (uploaded, never saved) survives a fresh sweep and goes once it is a day old.
        assertSame(0, AdminContentService::sweepUnusedUploads());
        touch($file($orphan), time() - 2 * 86400);
        assertSame(1, AdminContentService::sweepUnusedUploads());
        assertTrue(!is_file($file($orphan)));
    } finally {
        foreach ($ids as $id) {
            AdminContentService::deleteProject($id, contentAdmin(), authReq());
        }
        Config::override('paths.uploads', null);
        array_map('unlink', glob("$dir/projects/*") ?: []);
        @unlink("$dir/.htaccess");
        @rmdir("$dir/projects");
        @rmdir($dir);
    }
});

test('a published category whose papers are all hidden is not shown on the site', function () {
    useTestDatabase();
    $paper = AdminContentService::createPaper([
        'citation' => 'Hidden field paper for the visibility rule.', 'year' => 2025, 'published' => false,
        'newCategory' => ['name' => 'Visibility Rule Field'],
    ], contentAdmin(), authReq());
    try {
        assertTrue(!in_array('Visibility Rule Field', array_column(ContentService::research()['categories'], 'name'), true));
        AdminContentService::updatePaper($paper['id'], ['published' => true], contentAdmin(), authReq());
        assertTrue(in_array('Visibility Rule Field', array_column(ContentService::research()['categories'], 'name'), true));
    } finally {
        AdminContentService::deletePaper($paper['id'], contentAdmin(), authReq());
        AdminContentService::deleteCategory($paper['categoryId'], contentAdmin(), authReq());
    }
});
