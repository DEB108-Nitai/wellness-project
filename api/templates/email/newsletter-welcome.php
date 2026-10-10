<?php
/** @var array $vars ['unsubscribeUrl','siteName'] @var callable $e */
return [
    'subject' => "You're subscribed to {$vars['siteName']} updates",
    'preheader' => 'News about upcoming 60-day cohorts and new insights.',
    'body' => '<p style="margin:0 0 16px;">Thanks for subscribing!</p>'
        . '<p style="margin:0 0 16px;">We will occasionally send you news about upcoming 60-day challenge cohorts, new insights on personality and wellbeing, and important platform updates. No spam, ever.</p>'
        . '<p style="margin:0;font-size:13px;color:#64748b;">Changed your mind? <a href="' . $e($vars['unsubscribeUrl']) . '" style="color:#0d9488;">Unsubscribe here</a>.</p>',
    'text' => "Thanks for subscribing to {$vars['siteName']}!\n\nWe will occasionally send news about upcoming 60-day cohorts, insights and platform updates. No spam, ever.\n\nUnsubscribe: {$vars['unsubscribeUrl']}",
];
