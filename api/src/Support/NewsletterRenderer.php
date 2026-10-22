<?php
declare(strict_types=1);

namespace Transenigma\Support;

/**
 * Turns a newsletter's blocks (checked by NewsletterService::content) into email HTML and plain text.
 * Everything typed is escaped first; the only markup a writer gets is **bold**, *italic* and [text](https://link)
 * inside paragraphs, applied after escaping, so no HTML or script ever reaches a subscriber.
 * Inline styles and a table button: what email apps (Gmail, Outlook, Apple Mail) reliably show.
 */
final class NewsletterRenderer
{
    private const TEAL = '#0d9488';

    /** @param array{subject:string, preheader:string, coverImage:?string, blocks:list<array>} $content */
    public static function html(array $content, string $siteUrl): string
    {
        $html = '';
        if ($content['coverImage']) {
            $html .= self::image($siteUrl . $content['coverImage'], '', '20px');
        }
        foreach ($content['blocks'] as $b) {
            $html .= match ($b['type']) {
                'heading' => '<h2 style="margin:24px 0 8px;font-size:20px;line-height:1.3;font-weight:700;color:#0f172a;">' . self::e($b['text']) . '</h2>',
                'paragraph' => '<p style="margin:0 0 16px;">' . self::inline($b['text']) . '</p>',
                'image' => self::image($siteUrl . $b['src'], $b['alt'], $b['caption'] !== '' ? '6px' : '20px')
                    . ($b['caption'] !== '' ? '<p style="margin:0 0 20px;font-size:13px;line-height:1.5;color:#64748b;text-align:center;">' . self::e($b['caption']) . '</p>' : ''),
                'button' => '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 22px;"><tr>'
                    . '<td style="border-radius:10px;background:' . self::TEAL . ';">'
                    . '<a href="' . self::e($b['url']) . '" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">'
                    . self::e($b['label']) . '</a></td></tr></table>',
                'divider' => '<hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0;">',
            };
        }
        return $html;
    }

    /** @param array{subject:string, preheader:string, coverImage:?string, blocks:list<array>} $content */
    public static function text(array $content, string $siteUrl): string
    {
        $parts = [];
        foreach ($content['blocks'] as $b) {
            $parts[] = match ($b['type']) {
                'heading' => mb_strtoupper($b['text']),
                'paragraph' => self::plain($b['text']),
                'image' => $b['caption'] !== '' ? "[Image: {$b['caption']}]" : ($b['alt'] !== '' ? "[Image: {$b['alt']}]" : '[Image]'),
                'button' => "{$b['label']}: {$b['url']}",
                'divider' => '----------',
            };
        }
        return implode("\n\n", $parts);
    }

    private static function image(string $src, string $alt, string $gap): string
    {
        return '<img src="' . self::e($src) . '" alt="' . self::e($alt) . '" width="496" '
            . 'style="display:block;width:100%;max-width:496px;height:auto;border:0;border-radius:12px;margin:0 0 ' . $gap . ';">';
    }

    /** Escape, then **bold**, *italic*, [text](https://…) and line breaks. */
    private static function inline(string $text): string
    {
        $s = self::e($text);
        $s = (string) preg_replace_callback(
            '/\[([^\]\n]{1,200})\]\((https?:\/\/[^\s)]{1,500})\)/',
            static fn (array $m): string => '<a href="' . $m[2] . '" style="color:' . self::TEAL . ';text-decoration:underline;">' . $m[1] . '</a>',
            $s
        );
        $s = (string) preg_replace('/\*\*(?=\S)(.+?)(?<=\S)\*\*/u', '<strong>$1</strong>', $s);
        $s = (string) preg_replace('/(?<![*\w])\*(?=\S)(.+?)(?<=\S)\*(?![*\w])/u', '<em>$1</em>', $s);
        return nl2br($s, false);
    }

    /** The same text for the plain-text part: links as "text (url)", no asterisks. */
    private static function plain(string $text): string
    {
        $s = (string) preg_replace('/\[([^\]\n]{1,200})\]\((https?:\/\/[^\s)]{1,500})\)/', '$1 ($2)', $text);
        $s = (string) preg_replace('/\*\*(?=\S)(.+?)(?<=\S)\*\*/u', '$1', $s);
        return (string) preg_replace('/(?<![*\w])\*(?=\S)(.+?)(?<=\S)\*(?![*\w])/u', '$1', $s);
    }

    private static function e(string $v): string
    {
        return htmlspecialchars($v, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }
}
