<?php
declare(strict_types=1);

namespace Transenigma\Controllers;

use Transenigma\Core\HttpException;
use Transenigma\Core\Request;
use Transenigma\Core\Response;
use Transenigma\Core\Validator;
use Transenigma\Repositories\PsychometricRepository;
use Transenigma\Services\AssessmentService;
use Transenigma\Services\AuthService;
use Transenigma\Services\SettingsService;
use Transenigma\Support\Countries;

final class AssessmentController
{
    /** GET /api/test/items — the active statements in order (scoring keys are never exposed). */
    public function items(Request $request): Response
    {
        $version = PsychometricRepository::activeItemSetVersion();
        $items = array_map(
            static fn (array $i): array => ['id' => $i['id'], 'position' => $i['position'], 'text' => $i['text']],
            array_values(PsychometricRepository::items($version))
        );
        return Response::ok([
            'version' => $version,
            'itemsPerPage' => SettingsService::int('items_per_page'),
            'minAge' => SettingsService::int('min_age'),
            'items' => $items,
        ]);
    }

    /** GET /api/test/session — the caller's in-progress assessment, or null. */
    public function current(Request $request): Response
    {
        $session = AssessmentService::active(AssessmentService::owner($request));
        return Response::ok($session ? AssessmentService::state($session) : null);
    }

    /** POST /api/test/session — consent + demographics → start. */
    public function start(Request $request): Response
    {
        $body = $request->json();
        $consent = Validator::validate((array) ($body['consent'] ?? []), [
            'terms' => 'required|bool',
            'notDiagnosis' => 'required|bool',
        ]);
        if (!$consent['terms'] || !$consent['notDiagnosis']) {
            throw HttpException::validation(['consent' => 'Please accept both statements to continue.']);
        }
        $data = Validator::validate((array) ($body['demographics'] ?? []), [
            'country' => 'required|string|max:2',
            'age' => 'required|int|min:1|max:100',
            'gender' => 'required|in:' . implode(',', AssessmentService::GENDERS),
            'genderText' => 'string|max:60',
            'nickname' => 'string|max:60',
            'education' => 'in:' . implode(',', AssessmentService::EDUCATION),
            'occupation' => 'string|max:100',
        ]);
        if (!Countries::isValid($data['country'])) {
            throw HttpException::validation(['country' => 'Please choose your country.']);
        }
        return Response::created(AssessmentService::start($data, $request));
    }

    /** PUT /api/test/session/answers — batched autosave. */
    public function saveAnswers(Request $request): Response
    {
        $session = $this->activeOrFail($request);
        $body = $request->json();
        $data = Validator::validate($body, ['page' => 'required|int|min:1|max:100', 'pageSeconds' => 'int|min:0|max:86400']);
        $answers = $body['answers'] ?? [];
        if (!is_array($answers)) {
            throw HttpException::validation(['answers' => 'Answers must be an object.']);
        }
        return Response::ok(AssessmentService::saveAnswers($session, $answers, $data['page'], $data['pageSeconds'] ?? 0, $request));
    }

    /** POST /api/test/session/abandon */
    public function abandon(Request $request): Response
    {
        AssessmentService::abandon($this->activeOrFail($request), $request);
        return Response::ok(null);
    }

    /** POST /api/test/session/submit {ref} — idempotent. */
    public function submit(Request $request): Response
    {
        $data = Validator::validate($request->json(), ['ref' => 'required|string|max:9']);
        $session = AssessmentService::findOwnedByRef($data['ref'], AssessmentService::owner($request));
        $result = AssessmentService::submit($session, $request);
        return Response::ok($result + ['resultsLocked' => AuthService::user() === null]);
    }

    /** POST /api/test/session/review {ref, rating, comment?} */
    public function review(Request $request): Response
    {
        $data = Validator::validate($request->json(), [
            'ref' => 'required|string|max:9',
            'rating' => 'required|int|min:1|max:5',
            'comment' => 'string|max:1000',
        ]);
        $session = AssessmentService::findOwnedByRef($data['ref'], AssessmentService::owner($request));
        AssessmentService::review($session, $data['rating'], $data['comment'] ?? null);
        return Response::created(null);
    }

    private function activeOrFail(Request $request): array
    {
        return AssessmentService::active(AssessmentService::owner($request))
            ?? throw HttpException::notFound('No assessment in progress.', 'NO_ACTIVE_SESSION');
    }
}
