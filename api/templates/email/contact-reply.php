<?php
/** @var array $vars ['name','subject' (written by the admin),'reply','original','receivedAt','siteName'] @var callable $e */
return [
    'subject' => $vars['subject'],
    'preheader' => mb_substr(preg_replace('/\s+/', ' ', $vars['reply']), 0, 90),
    'body' => '<p style="margin:0 0 16px;">' . nl2br($e($vars['reply'])) . '</p>'
        . '<p style="margin:0 0 20px;">' . $e($vars['siteName']) . '</p>'
        . '<div style="border-left:3px solid #e2e8f0;padding:4px 0 4px 12px;color:#64748b;font-size:13px;">'
        . '<p style="margin:0 0 6px;">On ' . $e($vars['receivedAt']) . ', ' . $e($vars['name']) . ' wrote:</p>'
        . '<p style="margin:0;">' . nl2br($e($vars['original'])) . '</p>'
        . '</div>',
    'footer' => "This is a reply to the message you sent through the {$vars['siteName']} website contact form.",
    'text' => "{$vars['reply']}\n\n{$vars['siteName']}\n\n"
        . "On {$vars['receivedAt']}, {$vars['name']} wrote:\n> " . str_replace("\n", "\n> ", $vars['original']),
];
