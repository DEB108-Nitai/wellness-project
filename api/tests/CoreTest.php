<?php
declare(strict_types=1);

use Wellness\Core\HttpException;
use Wellness\Core\Router;
use Wellness\Core\SqlSplitter;
use Wellness\Core\Validator;

// ------------------------------------------------------------------ Validator
test('validator cleans, lower-cases email and drops unknown keys', function () {
    $out = Validator::validate(
        ['email' => '  Maya@Example.COM ', 'name' => " Maya\x07 Lin ", 'role' => 'admin'],
        ['email' => 'required|email', 'name' => 'required|string|max:100']
    );
    assertSame(['email' => 'maya@example.com', 'name' => 'Maya Lin'], $out);
});

test('validator reports every invalid field', function () {
    $e = assertThrows(HttpException::class, fn () => Validator::validate(
        ['email' => 'not-an-email', 'age' => '17', 'track' => 'XYZ'],
        ['email' => 'required|email', 'age' => 'required|int|min:18|max:100', 'track' => 'required|in:STI,TTI', 'name' => 'required|string']
    ));
    assertSame(422, $e->status);
    assertSame(['email', 'age', 'track', 'name'], array_keys($e->fields));
});

test('validator casts ints and bools and enforces list limits', function () {
    $out = Validator::validate(
        ['age' => '42', 'consent' => 'true', 'tags' => ['a', 'b']],
        ['age' => 'int|min:18', 'consent' => 'bool', 'tags' => 'array|max:3']
    );
    assertSame(['age' => 42, 'consent' => true, 'tags' => ['a', 'b']], $out);
    assertThrows(HttpException::class, fn () => Validator::validate(['tags' => ['a' => 1]], ['tags' => 'array']));
    assertThrows(HttpException::class, fn () => Validator::validate(['age' => '4.5'], ['age' => 'int']));
});

test('validator treats optional empty values as absent and keeps explicit nulls when nullable', function () {
    assertSame([], Validator::validate(['city' => ''], ['city' => 'string|max:10']));
    assertSame(['note' => null], Validator::validate(['note' => null], ['note' => 'nullable|string']));
});

test('validator enforces string length on multibyte text', function () {
    assertSame(['n' => 'नमस्ते'], Validator::validate(['n' => 'नमस्ते'], ['n' => 'string|max:6']));
    assertThrows(HttpException::class, fn () => Validator::validate(['n' => 'नमस्ते!'], ['n' => 'string|max:6']));
});

// ------------------------------------------------------------------ Router
test('router matches params, 404s unknown paths and 405s wrong methods', function () {
    $r = new Router();
    $r->get('/results/{ref:WL-[A-Z0-9]{6}}', fn () => 'ok', ['auth' => 'user']);
    $r->post('/contact', fn () => 'ok');

    $m = $r->match('GET', '/results/WL-AB12CD');
    assertSame(['ref' => 'WL-AB12CD'], $m['params']);
    assertSame('user', $m['options']['auth']);
    assertSame(true, $m['options']['csrf']);

    assertSame(404, assertThrows(HttpException::class, fn () => $r->match('GET', '/results/../etc'))->status);
    assertSame(404, assertThrows(HttpException::class, fn () => $r->match('GET', '/results/WL-short'))->status);
    $e = assertThrows(HttpException::class, fn () => $r->match('GET', '/contact'));
    assertSame(405, $e->status);
    assertSame('POST', $e->headers['Allow']);
});

// ------------------------------------------------------------------ SqlSplitter
test('sql splitter respects quotes, escapes and comments', function () {
    $sql = "-- comment; not a statement\nINSERT INTO t VALUES ('a;b', 'it''s', \"x\\\";y\");\n/* block; */ SELECT 1; # trailing; comment\nSELECT `we;ird`";
    assertSame(
        ["INSERT INTO t VALUES ('a;b', 'it''s', \"x\\\";y\")", 'SELECT 1', 'SELECT `we;ird`'],
        SqlSplitter::split($sql)
    );
});
