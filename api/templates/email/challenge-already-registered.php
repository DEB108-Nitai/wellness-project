<?php
/**
 * Sent instead of a new registration when this email already holds a place in every program chosen.
 * The form answers "Registered successfully" either way, so only the inbox owner learns this.
 * @var array $vars ['name','programs' => [['code','name','ref']],'siteName','siteUrl'] @var callable $e
 */
$programs = $vars['programs'];
$one = count($programs) === 1;
$names = array_map(static fn (array $p): string => "{$p['name']} ({$p['code']})", $programs);
$last = array_pop($names);
$joined = $names === [] ? $last : implode(', ', $names) . ' and ' . $last;
$challenge = $one ? '60-Day Challenge' : '60-Day Challenges';
$places = $one ? 'Your place is still reserved.' : 'Your places are still reserved.';
$rows = '';
foreach ($programs as $p) {
    $rows .= '<tr><td style="padding:12px 18px;font-size:13px;color:#64748b;border-top:1px solid #e2e8f0;">' . ($one ? '' : $e($p['name']) . ' (' . $e($p['code']) . ')<br>')
        . '<span style="font-family:Consolas,monospace;font-size:18px;font-weight:700;color:#0f172a;letter-spacing:1px;">' . $e($p['ref']) . '</span></td></tr>';
}
$textRefs = $one
    ? 'Your reference code: ' . $programs[0]['ref']
    : "Your reference codes:\n" . implode("\n", array_map(static fn (array $p): string => "- {$p['name']} ({$p['code']}): {$p['ref']}", $programs));

return [
    'subject' => $one
        ? "You are already registered: {$programs[0]['name']} 60-Day Challenge"
        : 'You are already registered: ' . implode(', ', array_column($programs, 'code')) . ' 60-Day Challenges',
    'preheader' => 'No need to register again. ' . $places,
    'body' => '<p style="margin:0 0 16px;">Hi ' . $e($vars['name']) . ',</p>'
        . '<p style="margin:0 0 16px;">We received another registration for the <strong>' . $e($joined) . '</strong> ' . $challenge
        . ' with this email address. You are already registered, so there is no need to register again. ' . $places . '</p>'
        . '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">'
        . '<tr><td style="padding:12px 18px 0;font-size:13px;color:#64748b;">' . ($one ? 'Your reference code' : 'Your reference codes') . '</td></tr>' . $rows . '</table>'
        . '<p style="margin:0 0 16px;">If any of your details have changed, simply reply to this email. If you did not submit this registration, you can ignore this email.</p>'
        . '<p style="margin:0;">See you soon,<br>The ' . $e($vars['siteName']) . ' team</p>',
    'text' => "Hi {$vars['name']},\n\nWe received another registration for the $joined $challenge with this email address. "
        . "You are already registered, so there is no need to register again. $places\n\n$textRefs\n\n"
        . "If any of your details have changed, simply reply to this email. If you did not submit this registration, you can ignore this email.\n\nThe {$vars['siteName']} team",
];
