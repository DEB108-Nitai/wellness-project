<?php
declare(strict_types=1);

namespace Wellness\Controllers;

use Wellness\Core\Request;
use Wellness\Core\Response;
use Wellness\Core\Validator;
use Wellness\Services\AuthService;
use Wellness\Services\ChallengeService;
use Wellness\Services\SpamGuard;
use Wellness\Support\Countries;
use Wellness\Core\HttpException;

final class ChallengeController
{
    /** POST /api/challenge/registrations — free, no sign-in required (CH-3). */
    public function register(Request $request): Response
    {
        $body = $request->json();
        SpamGuard::check($body);
        $data = Validator::validate($body, [
            'program' => 'required|in:' . implode(',', ChallengeService::PROGRAMS),
            'name' => 'required|string|min:2|max:100',
            'email' => 'required|email',
            'phone' => 'required|string|max:20|regex:/^\+?[0-9 ()\-.]{7,20}$/',
            'age' => 'int|min:1|max:100',
            'city' => 'string|max:100',
            'country' => 'string|max:2',
            'cohortTiming' => 'required|in:' . implode(',', ChallengeService::TIMINGS),
            'struggles' => 'array|max:10',
            'primaryGoal' => 'string|max:1000',
            'consent' => 'required|bool',
        ]);
        if (!$data['consent']) {
            throw HttpException::validation(['consent' => 'Please accept the privacy notice to register.']);
        }
        if (isset($data['country']) && !Countries::isValid($data['country'])) {
            throw HttpException::validation(['country' => 'Please choose a valid country.']);
        }
        return Response::created(ChallengeService::register($data, $request));
    }

    /** GET /api/challenge/my-registrations */
    public function mine(Request $request): Response
    {
        return Response::ok(ChallengeService::forUser(AuthService::requireUser()));
    }
}
