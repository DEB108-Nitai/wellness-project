<?php
/** @var array $vars ['name','url','siteName'] @var callable $e */
$button = '<a href="' . $e($vars['url']) . '" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:10px;">Verify my email</a>';

return [
    'subject' => "Confirm your email for {$vars['siteName']}",
    'preheader' => 'One click to confirm your email address.',
    'body' => '<p style="margin:0 0 16px;">Hi ' . $e($vars['name']) . ',</p>'
        . '<p style="margin:0 0 20px;">Welcome to ' . $e($vars['siteName']) . '! Please confirm that this is your email address so you can recover your account and receive your results and program updates.</p>'
        . '<p style="margin:0 0 24px;">' . $button . '</p>'
        . '<p style="margin:0 0 8px;font-size:13px;color:#64748b;">This link expires in 48 hours. If the button does not work, copy this address into your browser:</p>'
        . '<p style="margin:0;font-size:12px;word-break:break-all;color:#64748b;">' . $e($vars['url']) . '</p>',
    'text' => "Hi {$vars['name']},\n\nWelcome to {$vars['siteName']}! Please confirm your email address by opening this link (valid for 48 hours):\n\n{$vars['url']}\n\nIf you did not create an account, you can ignore this email.",
];
