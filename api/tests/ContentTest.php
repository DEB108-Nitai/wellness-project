<?php
declare(strict_types=1);

use Wellness\Core\Database;
use Wellness\Services\ContentService;

test('team lists the 6 people from the old homepage, in order, with photos and credentials', function () {
    useTestDatabase();
    $team = ContentService::team();
    assertSame(
        ['Dr. Vasudev Das', 'Dr. Mayank Bhasin', 'Dr. Deepshikha Singh', 'Dr. Harshit', 'Praveen Kumar Killaka', 'Gulshan Chandrakar'],
        array_column($team, 'name')
    );
    assertSame(['MD, Ophthalmology'], $team[2]['credentials']);
    foreach ($team as $m) {
        assertTrue($m['credentials'] !== [], "{$m['name']} has credentials");
        assertTrue((bool) preg_match('#^/images/team/[a-z-]+\.webp$#', (string) $m['photo']), "photo path for {$m['name']}");
        assertTrue(is_file(dirname(__DIR__, 2) . '/public' . $m['photo']), "photo file exists for {$m['name']}");
    }
});

test('research has 15 categories and 97 publications, newest first, with unique anchor slugs', function () {
    useTestDatabase();
    $r = ContentService::research();
    assertSame(['categories' => 15, 'publications' => 97], $r['totals']);
    assertSame(97, array_sum(array_column($r['categories'], 'count')));
    assertSame('happiness-affect-states', $r['categories'][0]['slug']);
    assertSame('Sankhya, Vedic Psychology & Ayurveda', $r['categories'][2]['name'], 'the "Pyschology" typo is fixed');

    $slugs = array_column($r['categories'], 'slug');
    assertSame(count($slugs), count(array_unique($slugs)));
    foreach ($slugs as $s) {
        assertTrue((bool) preg_match('/^[a-z0-9]+(-[a-z0-9]+)*$/', $s), "slug $s is URL-safe");
    }

    foreach ($r['categories'] as $c) {
        assertSame($c['count'], count($c['publications']));
        $years = array_values(array_filter(array_column($c['publications'], 'year'), static fn ($y) => $y !== null));
        $sorted = $years;
        rsort($sorted);
        assertSame($sorted, $years, "{$c['name']} lists newest first");
    }

    $all = array_merge(...array_column($r['categories'], 'publications'));
    assertTrue(!array_filter($all, static fn ($p) => str_contains($p['citation'], 'Presented approach. Presented')), 'duplicated words removed');
    $withUrl = array_values(array_filter($all, static fn ($p) => $p['url'] !== null));
    assertSame(1, count($withUrl));
    assertTrue(str_starts_with($withUrl[0]['url'], 'https://publications.waset.org/'));
});

test('consultancy keeps working-link and no-link projects and drops dead links', function () {
    useTestDatabase();
    $c = ContentService::consultancy();
    assertSame(11, $c['totals']['projects']);
    assertSame(['enterprise', 'web-mobile', 'iot', 'upcoming'], array_column($c['groups'], 'slug'));

    $projects = array_merge(...array_column($c['groups'], 'projects'));
    $names = array_column($projects, 'name');
    foreach (['Tour Mayapur', 'Aiwa', 'Pongworks'] as $dead) {
        assertTrue(!in_array($dead, $names, true), "$dead (dead link) is not listed");
    }
    $byName = array_column($projects, null, 'name');
    assertSame('https://www.mjunction.in/', $byName['Mjunction']['url']);
    assertSame(null, $byName['Brainwave Science']['url'], 'never had a website, so no link');
    assertSame(null, $byName['Depression Prediction Engine']['url']);
    foreach ($projects as $p) {
        assertTrue($p['url'] === null || str_starts_with($p['url'], 'https://'), "{$p['name']} links over https");
        assertTrue(is_file(dirname(__DIR__, 2) . '/public' . $p['image']), "image exists for {$p['name']}");
    }
});

test('unpublished content is hidden', function () {
    useTestDatabase();
    Database::run("UPDATE consultancy_projects SET is_published = 0 WHERE slug = 'annamrita'");
    Database::run("UPDATE research_categories SET is_published = 0 WHERE slug = 'drug-discovery'");
    try {
        $names = array_column(array_merge(...array_column(ContentService::consultancy()['groups'], 'projects')), 'name');
        assertTrue(!in_array('Annamrita', $names, true));
        $r = ContentService::research();
        assertSame(['categories' => 14, 'publications' => 96], $r['totals']);
    } finally {
        Database::run("UPDATE consultancy_projects SET is_published = 1 WHERE slug = 'annamrita'");
        Database::run("UPDATE research_categories SET is_published = 1 WHERE slug = 'drug-discovery'");
    }
});

test('ventures list Evolve Institute, ILS and India Tribal Care without dead links', function () {
    useTestDatabase();
    $v = ContentService::ventures();
    assertSame(['Evolve Institute', 'Institute of Life Semantics', 'India Tribal Care'], array_column($v, 'name'));
    assertSame('ILS', $v[1]['shortName']);
    assertSame(['product', 'product', 'social'], array_column($v, 'kind'));
    assertSame([null, null, null], array_column($v, 'url'), 'old websites no longer resolve');
});
