<?php
declare(strict_types=1);

namespace Transenigma\Controllers;

use Transenigma\Core\Request;
use Transenigma\Core\Response;
use Transenigma\Core\Validator;
use Transenigma\Services\AuthService;
use Transenigma\Services\ChallengeService;
use Transenigma\Services\SpamGuard;
use Transenigma\Support\Countries;
use Transenigma\Core\HttpException;

final class ChallengeController
{
    /** POST /api/challenge/registrations — free, no sign-in required (CH-3). */
    public function register(Request $request): Response
    {
        $body = $request->json();
        SpamGuard::check($body);
        // One form, one or more programs. A single `program` is still accepted from a page loaded before the update.
        if (!isset($body['programs']) && isset($body['program']) && is_string($body['program'])) {
            $body['programs'] = [$body['program']];
        }
        $data = Validator::validate($body, [
            'programs' => 'required|array|max:3', // an empty list gets its own message from registerMany()
            'name' => 'required|string|min:2|max:100',
            'email' => 'required|email',
            'phone' => 'required|string|max:20|regex:/^\+?[0-9 ()\-.]{7,20}$/',
            'age' => 'required|int|min:1|max:100',
            'city' => 'required|string|max:100',
            'country' => 'required|string|max:2',
            'cohortTiming' => 'required|in:' . implode(',', ChallengeService::TIMINGS),
            'struggles' => 'array|max:10',
            'primaryGoal' => 'string|max:1000',
            'consent' => 'required|bool',
        ]);
        if (!$data['consent']) {
            throw HttpException::validation(['consent' => 'Please accept the privacy notice to register.']);
        }
        foreach ($data['programs'] as $program) {
            if (!is_string($program) || !in_array($program, ChallengeService::PROGRAMS, true)) {
                throw HttpException::validation(['programs' => 'Please choose from the listed programs.']);
            }
        }
        if (!Countries::isValid($data['country'])) {
            throw HttpException::validation(['country' => 'Please choose a valid country.']);
        }
        // Same answer whether or not the email was already registered (no disclosure of who joined what).
        ChallengeService::registerMany($data, $request);
        return Response::created(['message' => 'Registered successfully']);
    }

    /** GET /api/challenge/my-registrations */
    public function mine(Request $request): Response
    {
        return Response::ok(ChallengeService::forUser(AuthService::requireUser()));
    }
}
