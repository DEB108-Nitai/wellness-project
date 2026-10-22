<?php
/**
 * @var array $vars ['content' (checked by NewsletterService), 'unsubscribeUrl', 'test' (bool), 'siteName', 'siteUrl'] @var callable $e
 * The body is built by NewsletterRenderer, which escapes everything the writer typed.
 */
use Transenigma\Support\NewsletterRenderer;

$content = $vars['content'];
$test = !empty($vars['test']);
$banner = $test
    ? '<p style="margin:0 0 20px;padding:10px 14px;border-radius:10px;background:#fef3c7;color:#92400e;font-size:13px;">'
        . 'Test email: this is how subscribers will see this newsletter. Links work; the unsubscribe link does not.</p>'
    : '';
$unsubscribe = '<a href="' . $e($vars['unsubscribeUrl']) . '" style="color:#0d9488;">Unsubscribe</a>';

return [
    'subject' => ($test ? '[Test] ' : '') . $content['subject'],
    'preheader' => $content['preheader'],
    'body' => $banner . NewsletterRenderer::html($content, $vars['siteUrl']),
    // HTML (the link); everything in it is escaped here.
    'footerHtml' => 'You are receiving this because you subscribed to the ' . $e($vars['siteName']) . ' newsletter. '
        . $unsubscribe . ' at any time.',
    'text' => NewsletterRenderer::text($content, $vars['siteUrl'])
        . "\n\n--\nYou are receiving this because you subscribed to the {$vars['siteName']} newsletter.\nUnsubscribe: {$vars['unsubscribeUrl']}",
];
