<?php
/**
 * One email per registration form, however many programs were chosen.
 * @var array $vars ['name','programs' => [['code','name','ref']], 'already' => [['code','name','ref']],'siteName','siteUrl']
 * @var callable $e
 */
$programs = $vars['programs'];
$already = $vars['already'] ?? [];
$one = count($programs) === 1;
$and = static function (array $parts): string {
    $last = array_pop($parts);
    return $parts === [] ? (string) $last : implode(', ', $parts) . ' and ' . $last;
};
$refRows = static function (array $items) use ($e): string {
    $rows = '';
    foreach ($items as $p) {
        $rows .= '<tr><td style="padding:12px 18px;font-size:13px;color:#64748b;border-top:1px solid #e2e8f0;">' . $e($p['name']) . ' (' . $e($p['code']) . ')<br>'
            . '<span style="font-family:Consolas,monospace;font-size:18px;font-weight:700;color:#0f172a;letter-spacing:1px;">' . $e($p['ref']) . '</span></td></tr>';
    }
    return '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">'
        . '<tr><td style="padding:12px 18px 0;font-size:13px;color:#64748b;">' . (count($items) === 1 ? 'Your reference code' : 'Your reference codes') . '</td></tr>' . $rows . '</table>';
};
$textRefs = implode("\n", array_map(static fn (array $p): string => "- {$p['name']} ({$p['code']}): {$p['ref']}", $programs));
$alreadyHtml = $already === [] ? '' : '<p style="margin:0 0 16px;">You were already registered for the <strong>'
    . $e($and(array_map(static fn (array $p): string => "{$p['name']} ({$p['code']})", $already))) . '</strong> 60-Day Challenge'
    . (count($already) === 1 ? '' : 's') . ', so that place is unchanged (reference ' . $e(implode(', ', array_column($already, 'ref'))) . ').</p>';
$alreadyText = $already === [] ? '' : "\n\nYou were already registered for the " . $and(array_map(static fn (array $p): string => "{$p['name']} ({$p['code']})", $already))
    . ' 60-Day Challenge' . (count($already) === 1 ? '' : 's') . ', so that place is unchanged (reference ' . implode(', ', array_column($already, 'ref')) . ').';

return [
    'subject' => $one
        ? "Registered successfully: {$programs[0]['name']} 60-Day Challenge"
        : 'Registered successfully: ' . $and(array_column($programs, 'code')) . ' 60-Day Challenges',
    'preheader' => $one ? 'Your place in the 60-Day Challenge is reserved.' : 'Your places in the 60-Day Challenges are reserved.',
    'body' => '<p style="margin:0 0 16px;">Hi ' . $e($vars['name']) . ',</p>'
        . ($one
            ? '<p style="margin:0 0 16px;">You are registered for the <strong>' . $e($programs[0]['name']) . ' (' . $e($programs[0]['code']) . ')</strong> 60-Day Challenge. Welcome aboard!</p>'
            : '<p style="margin:0 0 16px;">You are registered for the <strong>' . $e($and(array_map(static fn (array $p): string => "{$p['name']} ({$p['code']})", $programs))) . '</strong> 60-Day Challenges. Welcome aboard!</p>')
        . $refRows($programs)
        . $alreadyHtml
        . '<p style="margin:0 0 16px;">We will email you the session details — including online and in-person options — before your cohort begins. Keep your reference ' . ($one ? 'code' : 'codes') . ' handy.</p>'
        . '<p style="margin:0;">See you soon,<br>The ' . $e($vars['siteName']) . ' team</p>',
    'text' => "Hi {$vars['name']},\n\n"
        . ($one ? "You are registered for the {$programs[0]['name']} ({$programs[0]['code']}) 60-Day Challenge." : 'You are registered for the ' . $and(array_map(static fn (array $p): string => "{$p['name']} ({$p['code']})", $programs)) . ' 60-Day Challenges.')
        . "\n\n" . ($one ? 'Your reference code' : 'Your reference codes') . ":\n$textRefs"
        . $alreadyText
        . "\n\nWe will email you the session details, including online and in-person options, before your cohort begins.\n\nThe {$vars['siteName']} team",
];
