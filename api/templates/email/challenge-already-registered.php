<?php
/**
 * Sent instead of a second registration when this email already holds a place in the program.
 * The form answers "Registered successfully" either way, so only the inbox owner learns this.
 * @var array $vars ['name','program','programCode','ref','siteName','siteUrl'] @var callable $e
 */
return [
    'subject' => "You are already registered: {$vars['program']} 60-Day Challenge",
    'preheader' => 'No need to register again. Your place is still reserved.',
    'body' => '<p style="margin:0 0 16px;">Hi ' . $e($vars['name']) . ',</p>'
        . '<p style="margin:0 0 16px;">We received another registration for the <strong>' . $e($vars['program']) . ' (' . $e($vars['programCode']) . ')</strong> 60-Day Challenge with this email address. You are already registered, so there is no need to register again. Your place is still reserved.</p>'
        . '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;"><tr>'
        . '<td style="padding:14px 18px;font-size:13px;color:#64748b;">Your reference code<br><span style="font-family:Consolas,monospace;font-size:18px;font-weight:700;color:#0f172a;letter-spacing:1px;">' . $e($vars['ref']) . '</span></td>'
        . '</tr></table>'
        . '<p style="margin:0 0 16px;">If any of your details have changed, simply reply to this email. If you did not submit this registration, you can ignore this email.</p>'
        . '<p style="margin:0;">See you soon,<br>The ' . $e($vars['siteName']) . ' team</p>',
    'text' => "Hi {$vars['name']},\n\nWe received another registration for the {$vars['program']} ({$vars['programCode']}) 60-Day Challenge with this email address. You are already registered, so there is no need to register again. Your place is still reserved.\n\nYour reference code: {$vars['ref']}\n\nIf any of your details have changed, simply reply to this email. If you did not submit this registration, you can ignore this email.\n\nThe {$vars['siteName']} team",
];
