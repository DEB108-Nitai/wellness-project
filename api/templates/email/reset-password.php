<?php
/** @var array $vars ['name','url','siteName'] @var callable $e */
$button = '<a href="' . $e($vars['url']) . '" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:10px;">Choose a new password</a>';

return [
    'subject' => "Reset your {$vars['siteName']} password",
    'preheader' => 'Use this link within 60 minutes to set a new password.',
    'body' => '<p style="margin:0 0 16px;">Hi ' . $e($vars['name']) . ',</p>'
        . '<p style="margin:0 0 20px;">We received a request to reset the password for your account. Click the button below to choose a new one.</p>'
        . '<p style="margin:0 0 24px;">' . $button . '</p>'
        . '<p style="margin:0 0 8px;font-size:13px;color:#64748b;">This link expires in 60 minutes and can be used once. If you did not ask for a reset, you can safely ignore this email — your password will not change.</p>'
        . '<p style="margin:0;font-size:12px;word-break:break-all;color:#64748b;">' . $e($vars['url']) . '</p>',
    'text' => "Hi {$vars['name']},\n\nWe received a request to reset your password. Open this link within 60 minutes to choose a new one:\n\n{$vars['url']}\n\nIf you did not ask for a reset, ignore this email — your password will not change.",
];
