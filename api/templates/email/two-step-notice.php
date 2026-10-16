<?php
/**
 * Security notices about an admin's two-step sign-in (ADM-12).
 * @var array $vars ['name','event','left'?,'siteName','siteUrl','supportEmail'] @var callable $e
 */
$events = [
    'enabled' => [
        'subject' => "Two-step sign-in is on for your {$vars['siteName']} admin account",
        'lines' => ['You set up two-step sign-in for your admin account. From now on, signing in also needs a code from your authenticator app.'],
    ],
    'recovery_used' => [
        'subject' => "A recovery code was used on your {$vars['siteName']} admin account",
        'lines' => [
            'One of your recovery codes was just used for your admin account. Each code works only once.',
            'You have ' . (int) ($vars['left'] ?? 0) . ' recovery codes left. You can create a new set on the Security page of the admin console.',
        ],
    ],
    'recovery_regenerated' => [
        'subject' => "New recovery codes for your {$vars['siteName']} admin account",
        'lines' => ['A new set of recovery codes was created for your admin account. Your old recovery codes no longer work.'],
    ],
    'changed' => [
        'subject' => "Your {$vars['siteName']} admin account uses a new authenticator app",
        'lines' => ['Your admin account is now linked to a new authenticator app. Codes from the old app no longer work, and you have been signed out on your other devices.'],
    ],
    'reset' => [
        'subject' => "Two-step sign-in was reset for your {$vars['siteName']} admin account",
        'lines' => ['Two-step sign-in for your admin account was reset from the server. You have been signed out everywhere, and you will set it up again the next time you sign in.'],
    ],
];
$event = $events[$vars['event']] ?? $events['changed'];
$help = !empty($vars['supportEmail'])
    ? 'change your password and contact <a href="mailto:' . $e($vars['supportEmail']) . '" style="color:#0d9488;">' . $e($vars['supportEmail']) . '</a> immediately'
    : 'change your password immediately';

$html = '<p style="margin:0 0 16px;">Hi ' . $e($vars['name']) . ',</p>';
foreach ($event['lines'] as $line) {
    $html .= '<p style="margin:0 0 16px;">' . $e($line) . '</p>';
}
$html .= '<p style="margin:0;">If this was you, no action is needed. If it was not you, ' . $help . '.</p>';

return [
    'subject' => $event['subject'],
    'preheader' => 'A security notice about your admin account.',
    'body' => $html,
    'text' => "Hi {$vars['name']},\n\n" . implode("\n\n", $event['lines'])
        . "\n\nIf this was not you, change your password immediately" . (!empty($vars['supportEmail']) ? " and contact {$vars['supportEmail']}." : '.'),
];
