<?php
/**
 * Changes to admin access (slice F2): to the person concerned, and a confirmation to the primary admin.
 * @var array $vars ['name','event','actor','target'?,'targetEmail'?,'siteName','siteUrl','supportEmail'] @var callable $e
 */
$site = $vars['siteName'];
$target = (string) ($vars['target'] ?? '');
$targetEmail = (string) ($vars['targetEmail'] ?? '');
$who = $targetEmail !== '' ? "$target ($targetEmail)" : $target;
$events = [
    'added' => [
        'subject' => "You are now an admin of $site",
        'lines' => [
            "{$vars['actor']} made you an administrator of the $site website.",
            "At your next sign-in at {$vars['siteUrl']}/login you will set up two-step sign-in with an authenticator app on your phone, such as Google Authenticator or Microsoft Authenticator.",
        ],
    ],
    'removed' => [
        'subject' => "Your admin access to $site was removed",
        'lines' => ["{$vars['actor']} removed your administrator access. Your account is now a normal member account, and you have been signed out."],
    ],
    'made_primary' => [
        'subject' => "You are now the primary admin of $site",
        'lines' => ["{$vars['actor']} handed the primary admin role to you. Only the primary admin can add or remove admins."],
    ],
    'you_added' => [
        'subject' => "Admin added on $site",
        'lines' => ["You added $who as an admin. They set up two-step sign-in at their next sign-in."],
    ],
    'you_removed' => [
        'subject' => "Admin removed on $site",
        'lines' => ["You removed the admin access of $who."],
    ],
    'you_transferred' => [
        'subject' => "You handed over the primary admin role on $site",
        'lines' => ["You made $who the primary admin. You are still an admin, but you can no longer add or remove admins."],
    ],
];
$event = $events[$vars['event']];
$help = !empty($vars['supportEmail'])
    ? 'contact <a href="mailto:' . $e($vars['supportEmail']) . '" style="color:#0d9488;">' . $e($vars['supportEmail']) . '</a> immediately'
    : 'contact the site’s administrators immediately';

$html = '<p style="margin:0 0 16px;">Hi ' . $e($vars['name']) . ',</p>';
foreach ($event['lines'] as $line) {
    $html .= '<p style="margin:0 0 16px;">' . $e($line) . '</p>';
}
$html .= '<p style="margin:0;">If you did not expect this, ' . $help . '.</p>';

return [
    'subject' => $event['subject'],
    'preheader' => 'A change to admin access.',
    'body' => $html,
    'text' => "Hi {$vars['name']},\n\n" . implode("\n\n", $event['lines'])
        . "\n\nIf you did not expect this, contact " . (!empty($vars['supportEmail']) ? $vars['supportEmail'] : 'the site’s administrators') . ' immediately.',
];
