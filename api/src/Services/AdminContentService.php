<?php
declare(strict_types=1);

namespace Transenigma\Services;

use Transenigma\Core\Config;
use Transenigma\Core\Database;
use Transenigma\Core\HttpException;
use Transenigma\Core\Request;

/**
 * Admin management of research papers and consultancy projects (Phase 5, slice A).
 * The public pages read the same tables through ContentService, so every count on the site follows
 * automatically. Every change is audited.
 */
final class AdminContentService
{
    /** clients = client work (counted, client names listed); products = our own products in development. */
    public const GROUP_KINDS = ['clients', 'products'];
    private const IMAGE_TYPES = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    private const IMAGE_MAX_BYTES = 2_097_152; // 2 MB
    private const IMAGE_MAX_SIDE = 4000;
    /** Images the site may show: the bundled ones and admin uploads. */
    public const IMAGE_PATH = '#^/(images|uploads)/projects/[A-Za-z0-9._-]{1,120}\.(webp|png|jpe?g)$#';

    // ------------------------------------------------------------------ research

    /** Every category (published or not) with its paper count, and every paper. */
    public static function research(): array
    {
        $categories = array_map(static fn (array $c): array => [
            'id' => (int) $c['id'],
            'slug' => $c['slug'],
            'name' => $c['name'],
            'tagline' => $c['tagline'],
            'sortOrder' => (int) $c['sort_order'],
            'published' => (bool) $c['is_published'],
            'paperCount' => (int) $c['paper_count'],
        ], Database::all(
            'SELECT c.*, (SELECT COUNT(*) FROM publications p WHERE p.category_id = c.id) AS paper_count
             FROM research_categories c ORDER BY c.sort_order, c.id'
        ));
        $papers = array_map([self::class, 'paperOut'], Database::all(
            'SELECT * FROM publications ORDER BY category_id, year IS NULL, year DESC, sort_order, id'
        ));
        return ['categories' => $categories, 'papers' => $papers];
    }

    /** @param array{name:string, tagline?:?string, published?:bool} $data */
    public static function createCategory(array $data, array $admin, Request $request): array
    {
        $id = self::insertCategory($data);
        AuditService::forUser($admin, 'CONTENT_CATEGORY_CREATED', 'research_category', (string) $id, ['name' => $data['name']], $request);
        return self::category($id);
    }

    public static function updateCategory(int $id, array $data, array $admin, Request $request): array
    {
        $before = self::category($id);
        $sets = [];
        $params = [];
        foreach (['name' => 'name', 'tagline' => 'tagline', 'published' => 'is_published', 'sortOrder' => 'sort_order'] as $key => $column) {
            if (array_key_exists($key, $data)) {
                $sets[] = "$column = ?";
                $params[] = $key === 'published' ? (int) $data[$key] : ($key === 'tagline' ? self::nullIfEmpty($data[$key]) : $data[$key]);
            }
        }
        if ($sets !== []) {
            if (isset($data['name'])) {
                self::assertUniqueCategoryName($data['name'], $id);
            }
            Database::run('UPDATE research_categories SET ' . implode(', ', $sets) . ' WHERE id = ?', [...$params, $id]);
            AuditService::forUser($admin, 'CONTENT_CATEGORY_UPDATED', 'research_category', (string) $id, ['name' => $before['name'], 'fields' => array_keys($data)], $request);
        }
        return self::category($id);
    }

    /** Only an empty category can be deleted, so papers are never removed by accident. */
    public static function deleteCategory(int $id, array $admin, Request $request): void
    {
        $category = self::category($id);
        if ($category['paperCount'] > 0) {
            throw HttpException::conflict(
                "This category still has {$category['paperCount']} paper(s). Move or delete them first.",
                'CATEGORY_NOT_EMPTY'
            );
        }
        // Atomic: a paper added meanwhile (another tab) must not be cascade-deleted with the category.
        $deleted = Database::run(
            'DELETE FROM research_categories WHERE id = ? AND NOT EXISTS (SELECT 1 FROM publications WHERE category_id = ?)',
            [$id, $id]
        )->rowCount();
        if ($deleted !== 1) {
            throw HttpException::conflict('This category has just received a paper. Move or delete it first.', 'CATEGORY_NOT_EMPTY');
        }
        AuditService::forUser($admin, 'CONTENT_CATEGORY_DELETED', 'research_category', (string) $id, ['name' => $category['name']], $request);
    }

    /**
     * Add a paper to an existing category (categoryId) or to a new one (newCategory {name, tagline?}),
     * in one transaction so a failed paper never leaves an empty category behind.
     */
    public static function createPaper(array $data, array $admin, Request $request): array
    {
        $id = Database::transaction(static function () use ($data): int {
            $categoryId = isset($data['newCategory'])
                ? self::insertCategory($data['newCategory'])
                : self::category((int) $data['categoryId'])['id'];
            return Database::insert(
                'INSERT INTO publications (category_id, citation, year, url, sort_order, is_published) VALUES (?, ?, ?, ?, 0, ?)',
                [$categoryId, $data['citation'], $data['year'] ?? null, self::nullIfEmpty($data['url'] ?? null), (int) ($data['published'] ?? true)]
            );
        });
        $paper = self::paper($id);
        AuditService::forUser($admin, 'CONTENT_PAPER_CREATED', 'publication', (string) $id, [
            'categoryId' => $paper['categoryId'], 'newCategory' => isset($data['newCategory']),
        ], $request);
        return $paper;
    }

    public static function updatePaper(int $id, array $data, array $admin, Request $request): array
    {
        self::paper($id);
        $sets = [];
        $params = [];
        foreach (['citation' => 'citation', 'year' => 'year', 'url' => 'url', 'published' => 'is_published', 'categoryId' => 'category_id'] as $key => $column) {
            if (!array_key_exists($key, $data)) {
                continue;
            }
            if ($key === 'categoryId') {
                self::category((int) $data[$key]); // must exist
            }
            $sets[] = "$column = ?";
            $params[] = match ($key) {
                'published' => (int) $data[$key],
                'url' => self::nullIfEmpty($data[$key]),
                default => $data[$key],
            };
        }
        if ($sets !== []) {
            Database::run('UPDATE publications SET ' . implode(', ', $sets) . ' WHERE id = ?', [...$params, $id]);
            AuditService::forUser($admin, 'CONTENT_PAPER_UPDATED', 'publication', (string) $id, ['fields' => array_keys($data)], $request);
        }
        return self::paper($id);
    }

    public static function deletePaper(int $id, array $admin, Request $request): void
    {
        $paper = self::paper($id);
        Database::run('DELETE FROM publications WHERE id = ?', [$id]);
        AuditService::forUser($admin, 'CONTENT_PAPER_DELETED', 'publication', (string) $id, ['categoryId' => $paper['categoryId'], 'year' => $paper['year']], $request);
    }

    // ------------------------------------------------------------------ consultancy

    /** Every category (with its project count) and every project (published or not). */
    public static function consultancy(): array
    {
        $groups = array_map([self::class, 'groupOut'], Database::all(
            'SELECT g.*, (SELECT COUNT(*) FROM consultancy_projects p WHERE p.group_id = g.id) AS project_count
             FROM consultancy_groups g ORDER BY g.sort_order, g.id'
        ));
        $projects = array_map([self::class, 'projectOut'], Database::all(
            'SELECT p.*, g.slug AS group_slug FROM consultancy_projects p JOIN consultancy_groups g ON g.id = p.group_id
             ORDER BY g.sort_order, p.sort_order, p.id'
        ));
        return ['groups' => $groups, 'projects' => $projects];
    }

    /** @param array{name:string, tagline?:?string, kind?:string} $data */
    public static function createGroup(array $data, array $admin, Request $request): array
    {
        $id = self::insertGroup($data);
        AuditService::forUser($admin, 'CONTENT_PROJECT_CATEGORY_CREATED', 'consultancy_group', (string) $id, ['name' => $data['name']], $request);
        return self::group($id);
    }

    /** Rename, retag, change the kind or the position. The slug (the /consultancy#… anchor) never changes. */
    public static function updateGroup(int $id, array $data, array $admin, Request $request): array
    {
        $before = self::group($id);
        $sets = [];
        $params = [];
        foreach (['name' => 'name', 'tagline' => 'tagline', 'kind' => 'kind', 'sortOrder' => 'sort_order'] as $key => $column) {
            if (array_key_exists($key, $data)) {
                $sets[] = "$column = ?";
                $params[] = $key === 'tagline' ? (string) self::nullIfEmpty($data[$key]) : $data[$key];
            }
        }
        if ($sets !== []) {
            if (isset($data['name'])) {
                self::assertUniqueGroupName($data['name'], $id);
            }
            Database::run('UPDATE consultancy_groups SET ' . implode(', ', $sets) . ' WHERE id = ?', [...$params, $id]);
            AuditService::forUser($admin, 'CONTENT_PROJECT_CATEGORY_UPDATED', 'consultancy_group', (string) $id, ['name' => $before['name'], 'fields' => array_keys($data)], $request);
        }
        return self::group($id);
    }

    /** Only an empty category can be deleted, so projects are never removed by accident. */
    public static function deleteGroup(int $id, array $admin, Request $request): void
    {
        $group = self::group($id);
        if ($group['projectCount'] > 0) {
            throw HttpException::conflict("This category still has {$group['projectCount']} project(s). Move or remove them first.", 'CATEGORY_NOT_EMPTY');
        }
        $deleted = Database::run(
            'DELETE FROM consultancy_groups WHERE id = ? AND NOT EXISTS (SELECT 1 FROM consultancy_projects WHERE group_id = ?)',
            [$id, $id]
        )->rowCount();
        if ($deleted !== 1) {
            throw HttpException::conflict('This category has just received a project. Move or remove it first.', 'CATEGORY_NOT_EMPTY');
        }
        AuditService::forUser($admin, 'CONTENT_PROJECT_CATEGORY_DELETED', 'consultancy_group', (string) $id, ['name' => $group['name']], $request);
    }

    /**
     * Add a project to an existing category (group = its slug) or to a new one (newGroup {name, tagline?, kind?}),
     * in one transaction so a failed project never leaves an empty category behind.
     */
    public static function createProject(array $data, array $admin, Request $request): array
    {
        $id = Database::transaction(static function () use ($data): int {
            $groupId = isset($data['newGroup']) ? self::insertGroup($data['newGroup']) : self::groupId($data['group']);
            return Database::insert(
                'INSERT INTO consultancy_projects (group_id, slug, name, client_name, description, image, url, sort_order, is_published)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $groupId, self::uniqueSlug('consultancy_projects', $data['name'], 'project'), $data['name'],
                    self::nullIfEmpty($data['clientName'] ?? null), $data['description'], self::nullIfEmpty($data['image'] ?? null),
                    self::nullIfEmpty($data['url'] ?? null),
                    (int) Database::value('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM consultancy_projects WHERE group_id = ?', [$groupId]),
                    (int) ($data['published'] ?? true),
                ]
            );
        });
        $project = self::project($id);
        AuditService::forUser($admin, 'CONTENT_PROJECT_CREATED', 'consultancy_project', (string) $id, [
            'name' => $data['name'], 'group' => $project['group'], 'newCategory' => isset($data['newGroup']),
        ], $request);
        return $project;
    }

    public static function updateProject(int $id, array $data, array $admin, Request $request): array
    {
        $before = self::project($id);
        $sets = [];
        $params = [];
        $columns = ['name' => 'name', 'clientName' => 'client_name', 'description' => 'description', 'image' => 'image', 'url' => 'url', 'published' => 'is_published', 'group' => 'group_id'];
        foreach ($columns as $key => $column) {
            if (!array_key_exists($key, $data)) {
                continue;
            }
            $sets[] = "$column = ?";
            $params[] = match ($key) {
                'published' => (int) $data[$key],
                'group' => self::groupId($data[$key]),
                'clientName', 'image', 'url' => self::nullIfEmpty($data[$key]),
                default => $data[$key],
            };
        }
        if (isset($data['group']) && $data['group'] !== $before['group']) {
            // Moved to another section: it goes last there, like a new project.
            $sets[] = 'sort_order = (SELECT n FROM (SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM consultancy_projects WHERE group_id = ?) t)';
            $params[] = self::groupId($data['group']);
        }
        if ($sets !== []) {
            Database::run('UPDATE consultancy_projects SET ' . implode(', ', $sets) . ' WHERE id = ?', [...$params, $id]);
            if (array_key_exists('image', $data) && $before['image'] !== self::nullIfEmpty($data['image'])) {
                self::removeUploadIfUnused($before['image']);
            }
            AuditService::forUser($admin, 'CONTENT_PROJECT_UPDATED', 'consultancy_project', (string) $id, ['name' => $before['name'], 'fields' => array_keys($data)], $request);
        }
        return self::project($id);
    }

    public static function deleteProject(int $id, array $admin, Request $request): void
    {
        $project = self::project($id);
        Database::run('DELETE FROM consultancy_projects WHERE id = ?', [$id]);
        self::removeUploadIfUnused($project['image']);
        AuditService::forUser($admin, 'CONTENT_PROJECT_DELETED', 'consultancy_project', (string) $id, ['name' => $project['name']], $request);
    }

    /**
     * Store an uploaded project image under a random name and return its public path.
     * Checked by content (not the file name or the browser's type): JPEG, PNG or WebP, at most 2 MB and
     * 4000 px a side. The uploads folder never runs scripts (.htaccess written on first use).
     * @param array{tmp:string, size:int, name:string} $file
     */
    public static function storeProjectImage(array $file, array $admin, Request $request): string
    {
        if ($file['size'] <= 0 || $file['size'] > self::IMAGE_MAX_BYTES) {
            throw HttpException::validation(['image' => 'Please choose an image of at most 2 MB.']);
        }
        $mime = (string) (new \finfo(FILEINFO_MIME_TYPE))->file($file['tmp']);
        $info = @getimagesize($file['tmp']);
        if (!isset(self::IMAGE_TYPES[$mime]) || $info === false || ($info['mime'] ?? '') !== $mime) {
            throw HttpException::validation(['image' => 'Please choose a JPEG, PNG or WebP image.']);
        }
        if ($info[0] < 1 || $info[1] < 1 || $info[0] > self::IMAGE_MAX_SIDE || $info[1] > self::IMAGE_MAX_SIDE) {
            throw HttpException::validation(['image' => 'The image must be at most 4000 pixels wide and tall.']);
        }
        $dir = self::uploadsDir();
        $name = bin2hex(random_bytes(12)) . '.' . self::IMAGE_TYPES[$mime];
        $target = "$dir/$name";
        $moved = is_uploaded_file($file['tmp']) ? move_uploaded_file($file['tmp'], $target) : copy($file['tmp'], $target);
        if (!$moved) {
            throw new \RuntimeException('Could not store the uploaded image.');
        }
        @chmod($target, 0644);
        $path = "/uploads/projects/$name";
        AuditService::forUser($admin, 'CONTENT_IMAGE_UPLOADED', 'upload', $path, ['bytes' => $file['size'], 'type' => $mime], $request);
        return $path;
    }

    /**
     * Delete uploaded project images no project uses (an admin uploaded, then cancelled or picked another file).
     * Only files older than $minAgeSeconds, so an image waiting in an open form is never removed. Run by cron.
     * @return int files deleted
     */
    public static function sweepUnusedUploads(int $minAgeSeconds = 86400): int
    {
        $dir = Config::path('uploads') . '/projects';
        if (!is_dir($dir)) {
            return 0;
        }
        $used = array_flip(array_map(
            static fn (array $r): string => basename($r['image']),
            Database::all("SELECT image FROM consultancy_projects WHERE image LIKE '/uploads/projects/%'")
        ));
        $deleted = 0;
        foreach (glob("$dir/*") ?: [] as $file) {
            $name = basename($file);
            if (is_file($file) && !isset($used[$name]) && preg_match(self::IMAGE_PATH, "/uploads/projects/$name")
                && filemtime($file) < time() - $minAgeSeconds && @unlink($file)) {
                $deleted++;
            }
        }
        return $deleted;
    }

    // ------------------------------------------------------------------ public numbers

    /** The site-wide counts shown on the home page, kept in step with the content (owner request). */
    public static function stats(): array
    {
        $row = Database::one(
            'SELECT
               (SELECT COUNT(*) FROM publications p JOIN research_categories c ON c.id = p.category_id
                 WHERE p.is_published = 1 AND c.is_published = 1) AS publications,
               (SELECT COUNT(*) FROM research_categories c WHERE c.is_published = 1
                 AND EXISTS (SELECT 1 FROM publications p WHERE p.category_id = c.id AND p.is_published = 1)) AS fields,
               (SELECT COUNT(*) FROM consultancy_projects p JOIN consultancy_groups g ON g.id = p.group_id
                 WHERE p.is_published = 1 AND g.kind = ?) AS client_projects',
            ['clients']
        );
        $clients = array_values(array_unique(array_map(static fn (array $r): string => $r['client_name'], Database::all(
            'SELECT p.client_name FROM consultancy_projects p JOIN consultancy_groups g ON g.id = p.group_id
             WHERE p.is_published = 1 AND g.kind = ? AND p.client_name IS NOT NULL AND p.client_name <> ?
             ORDER BY g.sort_order, p.sort_order, p.id',
            ['clients', '']
        ))));
        return [
            'publications' => (int) $row['publications'],
            'researchFields' => (int) $row['fields'],
            'clientProjects' => (int) $row['client_projects'],
            'clients' => $clients,
        ];
    }

    // ------------------------------------------------------------------ helpers

    private static function insertCategory(array $data): int
    {
        self::assertUniqueCategoryName($data['name']);
        return Database::insert(
            'INSERT INTO research_categories (slug, name, tagline, sort_order, is_published) VALUES (?, ?, ?, ?, ?)',
            [
                self::uniqueSlug('research_categories', $data['name'], 'research-field'), $data['name'],
                self::nullIfEmpty($data['tagline'] ?? null),
                (int) Database::value('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM research_categories'),
                (int) ($data['published'] ?? true),
            ]
        );
    }

    private static function assertUniqueCategoryName(string $name, ?int $exceptId = null): void
    {
        $taken = Database::value(
            'SELECT id FROM research_categories WHERE LOWER(name) = LOWER(?)' . ($exceptId ? ' AND id <> ?' : ''),
            $exceptId ? [$name, $exceptId] : [$name]
        );
        if ($taken !== null) {
            throw HttpException::validation(['name' => 'A category with this name already exists. Pick it from the list instead.']);
        }
    }

    public static function category(int $id): array
    {
        $c = Database::one(
            'SELECT c.*, (SELECT COUNT(*) FROM publications p WHERE p.category_id = c.id) AS paper_count FROM research_categories c WHERE c.id = ?',
            [$id]
        ) ?? throw HttpException::notFound('Category not found.');
        return [
            'id' => (int) $c['id'], 'slug' => $c['slug'], 'name' => $c['name'], 'tagline' => $c['tagline'],
            'sortOrder' => (int) $c['sort_order'], 'published' => (bool) $c['is_published'], 'paperCount' => (int) $c['paper_count'],
        ];
    }

    private static function paper(int $id): array
    {
        return self::paperOut(Database::one('SELECT * FROM publications WHERE id = ?', [$id]) ?? throw HttpException::notFound('Paper not found.'));
    }

    private static function paperOut(array $p): array
    {
        return [
            'id' => (int) $p['id'], 'categoryId' => (int) $p['category_id'], 'citation' => $p['citation'],
            'year' => $p['year'] === null ? null : (int) $p['year'], 'url' => $p['url'],
            'published' => (bool) $p['is_published'], 'createdAt' => $p['created_at'],
        ];
    }

    private static function project(int $id): array
    {
        return self::projectOut(Database::one(
            'SELECT p.*, g.slug AS group_slug FROM consultancy_projects p JOIN consultancy_groups g ON g.id = p.group_id WHERE p.id = ?',
            [$id]
        ) ?? throw HttpException::notFound('Project not found.'));
    }

    private static function projectOut(array $p): array
    {
        return [
            'id' => (int) $p['id'], 'group' => $p['group_slug'], 'slug' => $p['slug'], 'name' => $p['name'],
            'clientName' => $p['client_name'], 'description' => $p['description'], 'image' => $p['image'], 'url' => $p['url'],
            'published' => (bool) $p['is_published'],
        ];
    }

    private static function groupId(string $slug): int
    {
        $id = Database::value('SELECT id FROM consultancy_groups WHERE slug = ?', [$slug]);
        if ($id === null) {
            throw HttpException::validation(['group' => 'Please choose a category.']);
        }
        return (int) $id;
    }

    private static function insertGroup(array $data): int
    {
        self::assertUniqueGroupName($data['name']);
        return Database::insert(
            'INSERT INTO consultancy_groups (slug, name, tagline, kind, sort_order) VALUES (?, ?, ?, ?, ?)',
            [
                self::uniqueSlug('consultancy_groups', $data['name'], 'projects'), $data['name'],
                (string) self::nullIfEmpty($data['tagline'] ?? null), $data['kind'] ?? 'clients',
                (int) Database::value('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM consultancy_groups'),
            ]
        );
    }

    private static function assertUniqueGroupName(string $name, ?int $exceptId = null): void
    {
        $taken = Database::value(
            'SELECT id FROM consultancy_groups WHERE LOWER(name) = LOWER(?)' . ($exceptId ? ' AND id <> ?' : ''),
            $exceptId ? [$name, $exceptId] : [$name]
        );
        if ($taken !== null) {
            throw HttpException::validation(['name' => 'A category with this name already exists. Pick it from the list instead.']);
        }
    }

    public static function group(int $id): array
    {
        return self::groupOut(Database::one(
            'SELECT g.*, (SELECT COUNT(*) FROM consultancy_projects p WHERE p.group_id = g.id) AS project_count FROM consultancy_groups g WHERE g.id = ?',
            [$id]
        ) ?? throw HttpException::notFound('Category not found.'));
    }

    private static function groupOut(array $g): array
    {
        return [
            'id' => (int) $g['id'], 'slug' => $g['slug'], 'name' => $g['name'], 'tagline' => $g['tagline'],
            'kind' => $g['kind'], 'sortOrder' => (int) $g['sort_order'], 'projectCount' => (int) $g['project_count'],
        ];
    }

    /** A readable, unique, never-changing slug: "Women & Gender" → "women-gender", then "-2", "-3"… */
    private static function uniqueSlug(string $table, string $name, string $fallback): string
    {
        $base = trim((string) preg_replace('/[^a-z0-9]+/', '-', mb_strtolower($name)), '-');
        $base = substr($base, 0, 70) ?: $fallback;
        $slug = $base;
        for ($n = 2; Database::value("SELECT 1 FROM $table WHERE slug = ?", [$slug]) !== null; $n++) {
            $slug = "$base-$n";
        }
        return $slug;
    }

    private static function nullIfEmpty(mixed $value): ?string
    {
        return $value === null || trim((string) $value) === '' ? null : trim((string) $value);
    }

    private static function uploadsDir(): string
    {
        $root = Config::path('uploads');
        // Config::path() creates folders as 0750 (private storage). These files are served by the web server,
        // which on shared hosting runs as another user, so the folders must be world-readable.
        @chmod($root, 0755);
        $dir = "$root/projects";
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new \RuntimeException('Could not create the uploads folder.');
        }
        @chmod($dir, 0755);
        $guard = Config::path('uploads') . '/.htaccess';
        if (!is_file($guard)) {
            // Uploaded files are only ever served as images: never executed, never listed, never sniffed.
            file_put_contents($guard, "Options -Indexes -ExecCGI\nRemoveHandler .php .phtml .phar\nRemoveType .php .phtml .phar\n"
                . "<FilesMatch \"(?i)\\.(php\\d*|phtml|phar|cgi|pl|py|sh)$\">\n    Require all denied\n</FilesMatch>\n"
                . "<IfModule mod_headers.c>\n    Header set X-Content-Type-Options \"nosniff\"\n    Header set Content-Security-Policy \"default-src 'none'\"\n</IfModule>\n");
        }
        return $dir;
    }

    /** Delete an admin-uploaded image once no project uses it (bundled /images/… files are never touched). */
    private static function removeUploadIfUnused(?string $path): void
    {
        if ($path === null || !str_starts_with($path, '/uploads/projects/') || !preg_match(self::IMAGE_PATH, $path)) {
            return;
        }
        if (Database::value('SELECT 1 FROM consultancy_projects WHERE image = ?', [$path]) === null) {
            @unlink(Config::path('uploads') . '/projects/' . basename($path));
        }
    }
}
