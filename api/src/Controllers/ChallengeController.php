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
        $data = Validator::validate($body, [
            'program' => 'required|in:' . implode(',', ChallengeService::PROGRAMS),
            'name' => 'required|string|min:2|max:100',
            'email' => 'required|email',
            'phone' => 'required|string|max:20|regex:/^\+?[0-9 ()\-.]{7,20}$/',
            'age' => 'required|int|min:18|max:100',
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
        if (!Countries::isValid($data['country'])) {
            throw HttpException::validation(['country' => 'Please choose a valid country.']);
        }
        // Same answer whether or not the email was already registered (no disclosure of who joined what).
        ChallengeService::register($data, $request);
        return Response::created(['message' => 'Registered successfully']);
    }

    /** GET /api/challenge/my-registrations */
    public function mine(Request $request): Response
    {
        return Response::ok(ChallengeService::forUser(AuthService::requireUser()));
    }
}
