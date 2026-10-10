<?php
/** @var array $vars ['name','email','subject','message','siteName'] @var callable $e */
return [
    'subject' => "[Contact] {$vars['subject']} — {$vars['name']}",
    'preheader' => 'New message from the website contact form.',
    'body' => '<p style="margin:0 0 12px;"><strong>New message from the contact form</strong></p>'
        . '<p style="margin:0 0 4px;font-size:13px;color:#64748b;">From</p>'
        . '<p style="margin:0 0 12px;">' . $e($vars['name']) . ' &lt;<a href="mailto:' . $e($vars['email']) . '" style="color:#0d9488;">' . $e($vars['email']) . '</a>&gt;</p>'
        . '<p style="margin:0 0 4px;font-size:13px;color:#64748b;">Subject</p>'
        . '<p style="margin:0 0 12px;">' . $e($vars['subject']) . '</p>'
        . '<p style="margin:0 0 4px;font-size:13px;color:#64748b;">Message</p>'
        . '<p style="margin:0;white-space:pre-wrap;">' . nl2br($e($vars['message'])) . '</p>',
    'text' => "New message from the contact form\n\nFrom: {$vars['name']} <{$vars['email']}>\nSubject: {$vars['subject']}\n\n{$vars['message']}",
];
