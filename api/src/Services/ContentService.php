<?php
declare(strict_types=1);

namespace Wellness\Services;

use Wellness\Core\Database;

/**
 * Public Transenigma company content: Our Team, TERF research and consultancy projects.
 * Read-only; rows are seeded by migration 009 and only published rows are returned.
 */
final class ContentService
{
    /** The team in display order. Credentials are stored one per line. */
    public static function team(): array
    {
        return array_map(static fn (array $r): array => [
            'id' => (int) $r['id'],
            'name' => $r['name'],
            'role' => $r['role'],
            'credentials' => array_values(array_filter(array_map('trim', explode("\n", $r['credentials'])), 'strlen')),
            'photo' => $r['photo'],
        ], Database::all('SELECT id, name, role, credentials, photo FROM team_members WHERE is_published = 1 ORDER BY sort_order, id'));
    }

    /** Research categories with their publications (newest first) and the totals. */
    public static function research(): array
    {
        $categories = [];
        foreach (Database::all('SELECT id, slug, name FROM research_categories WHERE is_published = 1 ORDER BY sort_order, id') as $c) {
            $categories[(int) $c['id']] = ['slug' => $c['slug'], 'name' => $c['name'], 'count' => 0, 'publications' => []];
        }
        $rows = Database::all(
            'SELECT p.id, p.category_id, p.citation, p.year, p.url FROM publications p
             JOIN research_categories c ON c.id = p.category_id AND c.is_published = 1
             WHERE p.is_published = 1 ORDER BY p.category_id, p.sort_order, p.id'
        );
        foreach ($rows as $p) {
            $cid = (int) $p['category_id'];
            $categories[$cid]['publications'][] = [
                'id' => (int) $p['id'],
                'citation' => $p['citation'],
                'year' => $p['year'] === null ? null : (int) $p['year'],
                'url' => $p['url'],
            ];
            $categories[$cid]['count']++;
        }
        $categories = array_values($categories);
        return [
            'totals' => ['categories' => count($categories), 'publications' => count($rows)],
            'categories' => $categories,
        ];
    }

    /** Transenigma ventures: products and social service. A venture without a url has no live website. */
    public static function ventures(): array
    {
        return array_map(static fn (array $r): array => [
            'id' => (int) $r['id'],
            'slug' => $r['slug'],
            'name' => $r['name'],
            'shortName' => $r['short_name'],
            'kind' => $r['kind'],
            'description' => $r['description'],
            'url' => $r['url'],
        ], Database::all('SELECT id, slug, name, short_name, kind, description, url FROM ventures WHERE is_published = 1 ORDER BY sort_order, id'));
    }

    /** Consultancy groups with their projects. A project without a url has no live website. */
    public static function consultancy(): array
    {
        $groups = [];
        foreach (Database::all('SELECT id, slug, name, tagline FROM consultancy_groups ORDER BY sort_order, id') as $g) {
            $groups[(int) $g['id']] = ['slug' => $g['slug'], 'name' => $g['name'], 'tagline' => $g['tagline'], 'projects' => []];
        }
        $rows = Database::all(
            'SELECT id, group_id, slug, name, description, image, url FROM consultancy_projects
             WHERE is_published = 1 ORDER BY group_id, sort_order, id'
        );
        foreach ($rows as $p) {
            $groups[(int) $p['group_id']]['projects'][] = [
                'id' => (int) $p['id'],
                'slug' => $p['slug'],
                'name' => $p['name'],
                'description' => $p['description'],
                'image' => $p['image'],
                'url' => $p['url'],
            ];
        }
        return [
            'totals' => ['projects' => count($rows)],
            'groups' => array_values(array_filter($groups, static fn (array $g): bool => $g['projects'] !== [])),
        ];
    }
}
