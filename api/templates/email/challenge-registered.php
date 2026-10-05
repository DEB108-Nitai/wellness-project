<?php
/** @var array $vars ['name','program','programCode','ref','siteName','siteUrl'] @var callable $e */
return [
    'subject' => "Registered successfully: {$vars['program']} 60-Day Challenge",
    'preheader' => 'Your place in the 60-Day Challenge is reserved.',
    'body' => '<p style="margin:0 0 16px;">Hi ' . $e($vars['name']) . ',</p>'
        . '<p style="margin:0 0 16px;">You are registered for the <strong>' . $e($vars['program']) . ' (' . $e($vars['programCode']) . ')</strong> 60-Day Challenge. Welcome aboard!</p>'
        . '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;"><tr>'
        . '<td style="padding:14px 18px;font-size:13px;color:#64748b;">Your reference code<br><span style="font-family:Consolas,monospace;font-size:18px;font-weight:700;color:#0f172a;letter-spacing:1px;">' . $e($vars['ref']) . '</span></td>'
        . '</tr></table>'
        . '<p style="margin:0 0 16px;">We will email you the session details — including online and in-person options — before your cohort begins. Keep your reference code handy.</p>'
        . '<p style="margin:0;">See you soon,<br>The ' . $e($vars['siteName']) . ' team</p>',
    'text' => "Hi {$vars['name']},\n\nYou are registered for the {$vars['program']} ({$vars['programCode']}) 60-Day Challenge.\n\nYour reference code: {$vars['ref']}\n\nWe will email you the session details, including online and in-person options, before your cohort begins.\n\nThe {$vars['siteName']} team",
];
