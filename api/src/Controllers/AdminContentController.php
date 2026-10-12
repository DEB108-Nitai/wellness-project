<?php
declare(strict_types=1);

namespace Transenigma\Controllers;

use Transenigma\Core\HttpException;
use Transenigma\Core\Request;
use Transenigma\Core\Response;
use Transenigma\Core\Validator;
use Transenigma\Services\AdminContentService;
use Transenigma\Services\AuthService;

/**
 * Admin: research papers and consultancy projects (Phase 5, slice A).
 * Every route using this controller is declared with ['auth' => 'admin'].
 */
final class AdminContentController
{
    private const GROUP_RULES = [
        'tagline' => 'nullable|string|max:255',
        'kind' => 'in:clients,products',
    ];

    private const CATEGORY_RULES = [
        'name' => 'string|min:2|max:160',
        'tagline' => 'nullable|string|max:255',
        'published' => 'bool',
        'sortOrder' => 'int|min:0|max:65000',
    ];

    // ------------------------------------------------------------------ research

    /** GET /api/admin/research */
    public function research(Request $request): Response
    {
        return Response::ok(AdminContentService::research());
    }

    /** POST /api/admin/research/categories {name, tagline?, published?} */
    public function createCategory(Request $request): Response
    {
        $rules = self::CATEGORY_RULES;
        unset($rules['sortOrder']); // new categories always go last
        $data = Validator::validate($request->json(), ['name' => 'required|' . $rules['name']] + $rules);
        return Response::created(AdminContentService::createCategory($data, AuthService::requireUser(), $request));
    }

    /** PATCH /api/admin/research/categories/{id} */
    public function updateCategory(Request $request): Response
    {
        $data = Validator::validate($request->json(), self::CATEGORY_RULES);
        return Response::ok(AdminContentService::updateCategory((int) $request->param('id'), $data, AuthService::requireUser(), $request));
    }

    /** DELETE /api/admin/research/categories/{id} — refused while it has papers. */
    public function deleteCategory(Request $request): Response
    {
        AdminContentService::deleteCategory((int) $request->param('id'), AuthService::requireUser(), $request);
        return Response::ok(null);
    }

    /** POST /api/admin/research/papers {citation, categoryId | newCategory{name, tagline?}, year?, url?, published?} */
    public function createPaper(Request $request): Response
    {
        $body = $request->json();
        $data = $this->paperData($body, true);
        if (isset($body['newCategory'])) {
            if (!is_array($body['newCategory'])) {
                throw HttpException::validation(['newCategory' => 'Please name the new category.']);
            }
            $data['newCategory'] = Validator::validate($body['newCategory'], [
                'name' => 'required|string|min:2|max:160',
                'tagline' => 'nullable|string|max:255',
            ]);
            unset($data['categoryId']);
        } elseif (!isset($data['categoryId'])) {
            throw HttpException::validation(['categoryId' => 'Please choose a category or create a new one.']);
        }
        return Response::created(AdminContentService::createPaper($data, AuthService::requireUser(), $request));
    }

    /** PATCH /api/admin/research/papers/{id} */
    public function updatePaper(Request $request): Response
    {
        return Response::ok(AdminContentService::updatePaper(
            (int) $request->param('id'), $this->paperData($request->json(), false), AuthService::requireUser(), $request
        ));
    }

    /** DELETE /api/admin/research/papers/{id} */
    public function deletePaper(Request $request): Response
    {
        AdminContentService::deletePaper((int) $request->param('id'), AuthService::requireUser(), $request);
        return Response::ok(null);
    }

    // ------------------------------------------------------------------ consultancy

    /** GET /api/admin/consultancy */
    public function consultancy(Request $request): Response
    {
        return Response::ok(AdminContentService::consultancy());
    }

    /** POST /api/admin/consultancy/categories {name, tagline?, kind?} */
    public function createGroup(Request $request): Response
    {
        $data = Validator::validate($request->json(), ['name' => 'required|string|min:2|max:160'] + self::GROUP_RULES);
        return Response::created(AdminContentService::createGroup($data, AuthService::requireUser(), $request));
    }

    /** PATCH /api/admin/consultancy/categories/{id} */
    public function updateGroup(Request $request): Response
    {
        $data = Validator::validate($request->json(), self::GROUP_RULES + ['name' => 'string|min:2|max:160', 'sortOrder' => 'int|min:0|max:65000']);
        return Response::ok(AdminContentService::updateGroup((int) $request->param('id'), $data, AuthService::requireUser(), $request));
    }

    /** DELETE /api/admin/consultancy/categories/{id}: refused while it has projects. */
    public function deleteGroup(Request $request): Response
    {
        AdminContentService::deleteGroup((int) $request->param('id'), AuthService::requireUser(), $request);
        return Response::ok(null);
    }

    /** POST /api/admin/consultancy/projects {group | newGroup{name, tagline?, kind?}, name, …} */
    public function createProject(Request $request): Response
    {
        $body = $request->json();
        $data = $this->projectData($body, true);
        if (isset($body['newGroup'])) {
            if (!is_array($body['newGroup'])) {
                throw HttpException::validation(['newGroup' => 'Please name the new category.']);
            }
            $data['newGroup'] = Validator::validate($body['newGroup'], ['name' => 'required|string|min:2|max:160'] + self::GROUP_RULES);
            unset($data['group']);
        } elseif (!isset($data['group'])) {
            throw HttpException::validation(['group' => 'Please choose a category or create a new one.']);
        }
        return Response::created(AdminContentService::createProject($data, AuthService::requireUser(), $request));
    }

    /** PATCH /api/admin/consultancy/projects/{id} */
    public function updateProject(Request $request): Response
    {
        return Response::ok(AdminContentService::updateProject(
            (int) $request->param('id'), $this->projectData($request->json(), false), AuthService::requireUser(), $request
        ));
    }

    /** DELETE /api/admin/consultancy/projects/{id} */
    public function deleteProject(Request $request): Response
    {
        AdminContentService::deleteProject((int) $request->param('id'), AuthService::requireUser(), $request);
        return Response::ok(null);
    }

    /** POST /api/admin/uploads/project-image (multipart, field "image") → {path} */
    public function uploadProjectImage(Request $request): Response
    {
        $file = $request->file('image') ?? throw HttpException::validation(['image' => 'Please choose an image.']);
        return Response::created(['path' => AdminContentService::storeProjectImage($file, AuthService::requireUser(), $request)]);
    }

    // ------------------------------------------------------------------ validation

    private function paperData(array $body, bool $creating): array
    {
        $data = Validator::validate($body, [
            'citation' => ($creating ? 'required|' : '') . 'string|min:5|max:2000',
            'categoryId' => 'int|min:1',
            'year' => 'nullable|int|min:1900|max:' . ((int) gmdate('Y') + 1),
            'url' => 'nullable|string|max:500',
            'published' => 'bool',
        ]);
        self::assertHttpsUrl($data, 'url');
        return $data;
    }

    private function projectData(array $body, bool $creating): array
    {
        $req = $creating ? 'required|' : '';
        $data = Validator::validate($body, [
            'group' => 'string|max:80', // an existing category's slug (checked by the service)
            'name' => $req . 'string|min:2|max:160',
            'clientName' => 'nullable|string|max:120',
            'description' => $req . 'string|min:10|max:2000',
            'image' => 'nullable|string|max:255',
            'url' => 'nullable|string|max:500',
            'published' => 'bool',
        ]);
        self::assertHttpsUrl($data, 'url');
        if (isset($data['image']) && !preg_match(AdminContentService::IMAGE_PATH, $data['image'])) {
            throw HttpException::validation(['image' => 'Please upload the image again.']);
        }
        return $data;
    }

    /** Links open in visitors' browsers: only real https addresses are accepted. */
    private static function assertHttpsUrl(array $data, string $field): void
    {
        $url = $data[$field] ?? null;
        if ($url === null) {
            return;
        }
        $host = parse_url($url, PHP_URL_HOST);
        if (!filter_var($url, FILTER_VALIDATE_URL) || parse_url($url, PHP_URL_SCHEME) !== 'https' || !is_string($host) || !str_contains($host, '.')) {
            throw HttpException::validation([$field => 'Please enter a full link starting with https://']);
        }
    }
}
