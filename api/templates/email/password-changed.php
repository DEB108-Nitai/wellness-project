<?php
/** @var array $vars ['name','siteName','siteUrl','supportEmail'] @var callable $e */
$help = !empty($vars['supportEmail'])
    ? 'please reset your password immediately and contact <a href="mailto:' . $e($vars['supportEmail']) . '" style="color:#0d9488;">' . $e($vars['supportEmail']) . '</a>'
    : 'please reset your password immediately';

return [
    'subject' => "Your {$vars['siteName']} password was changed",
    'preheader' => 'A quick security notice about your account.',
    'body' => '<p style="margin:0 0 16px;">Hi ' . $e($vars['name']) . ',</p>'
        . '<p style="margin:0 0 16px;">The password for your account was just changed, and you have been signed out on your other devices.</p>'
        . '<p style="margin:0;">If this was you, no action is needed. If it was not you, ' . $help . '.</p>',
    'text' => "Hi {$vars['name']},\n\nThe password for your account was just changed and you have been signed out on your other devices.\n\nIf this was not you, reset your password immediately at {$vars['siteUrl']}/forgot-password" . (!empty($vars['supportEmail']) ? " and contact {$vars['supportEmail']}." : '.'),
];
