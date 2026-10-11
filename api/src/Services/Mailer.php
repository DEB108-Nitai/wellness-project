<?php
declare(strict_types=1);

namespace Transenigma\Services;

use PHPMailer\PHPMailer\PHPMailer;
use RuntimeException;
use Throwable;
use Transenigma\Core\Config;
use Transenigma\Core\Database;
use Transenigma\Core\Logger;

/**
 * Sends templated emails (api/templates/email/*.php).
 *
 * Driver: SMTP via PHPMailer when mail.host is configured, otherwise "log" —
 * the message is written to api/storage/mail/ so flows can be tested locally.
 * Sending never throws: failures are logged and recorded in email_log (PRD §5.3).
 */
final class Mailer
{
    /** Overridable in tests: fn(string $to, array $message): void */
    public static $transport = null;

    /** The icon PNG referenced by _layout.php as cid:te-icon. */
    private const ICON_CID = 'te-icon';
    private const ICON_FILE = '/templates/email/icon.png';

    public static function send(string $to, string $template, array $vars = []): bool
    {
        try {
            $message = self::render($template, $vars + [
                'siteName' => SettingsService::get('site_name') ?: 'Transenigma',
                'siteUrl' => rtrim(Config::string('app.url'), '/'),
                'supportEmail' => SettingsService::get('support_email'),
            ]);

            if (self::$transport !== null) {
                (self::$transport)($to, $message);
            } elseif (Config::string('mail.host') !== '' && !self::isReservedTestAddress($to)) {
                self::sendSmtp($to, $message);
            } else {
                self::writeToLog($to, $template, $message);
            }
            self::record($to, $template, 'sent');
            return true;
        } catch (Throwable $e) {
            Logger::exception($e, ['mail_template' => $template]);
            self::record($to, $template, 'failed', $e->getMessage());
            return false;
        }
    }

    /** @return array{subject:string, html:string, text:string} */
    public static function render(string $template, array $vars): array
    {
        if (!preg_match('/^[a-z0-9-]+$/', $template)) {
            throw new RuntimeException("Invalid template name '$template'");
        }
        $file = API_ROOT . "/templates/email/$template.php";
        if (!is_file($file)) {
            throw new RuntimeException("Email template '$template' not found");
        }
        $message = (static function (string $__file, array $vars): array {
            $e = static fn (mixed $v): string => htmlspecialchars((string) $v, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            return require $__file;
        })($file, $vars);

        $layout = (static function (array $vars, array $message): string {
            $e = static fn (mixed $v): string => htmlspecialchars((string) $v, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            ob_start();
            require API_ROOT . '/templates/email/_layout.php';
            return (string) ob_get_clean();
        })($vars, $message);

        return ['subject' => $message['subject'], 'html' => $layout, 'text' => $message['text']];
    }

    /**
     * Addresses at domains reserved for testing (RFC 2606 / 6761) can never be delivered.
     * They are written to the mail folder instead, so test runs never bounce back to support@.
     */
    public static function isReservedTestAddress(string $to): bool
    {
        $domain = strtolower(substr(strrchr($to, '@') ?: '', 1));
        return preg_match('/(^|\.)(example\.(com|net|org)|test|example|invalid|localhost)$/', $domain) === 1;
    }

    private static function sendSmtp(string $to, array $message): void
    {
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = Config::string('mail.host');
        $mail->Port = Config::int('mail.port', 587);
        $mail->SMTPAuth = true;
        $mail->Username = Config::string('mail.username');
        $mail->Password = Config::string('mail.password');
        $mail->SMTPSecure = Config::string('mail.encryption', 'tls') === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Timeout = 15;
        $mail->CharSet = PHPMailer::CHARSET_UTF8;
        $mail->setFrom(Config::string('mail.from_email'), Config::string('mail.from_name', 'Transenigma'));
        $support = SettingsService::get('support_email');
        if ($support) {
            $mail->addReplyTo($support);
        }
        $mail->addAddress($to);
        $mail->Subject = $message['subject'];
        $mail->isHTML(true);
        $mail->Body = $message['html'];
        $mail->AltBody = $message['text'];
        $mail->addEmbeddedImage(API_ROOT . self::ICON_FILE, self::ICON_CID, 'transenigma.png', PHPMailer::ENCODING_BASE64, 'image/png');
        $mail->send();
    }

    private static function writeToLog(string $to, string $template, array $message): void
    {
        $dir = Config::path('mail');
        $file = sprintf('%s/%s-%s-%s.html', $dir, gmdate('Ymd-His'), $template, bin2hex(random_bytes(3)));
        $header = sprintf("<!--\nTo: %s\nSubject: %s\n\n%s\n-->\n", $to, $message['subject'], $message['text']);
        // No attachments in a preview file: inline the icon so it shows when opened in a browser.
        $icon = 'data:image/png;base64,' . base64_encode((string) file_get_contents(API_ROOT . self::ICON_FILE));
        file_put_contents($file, $header . str_replace('cid:' . self::ICON_CID, $icon, $message['html']));
        Logger::info('Email written to log (no SMTP configured)', ['to' => $to, 'template' => $template, 'file' => basename($file)]);
    }

    private static function record(string $to, string $template, string $status, ?string $error = null): void
    {
        try {
            Database::run(
                'INSERT INTO email_log (to_email, template, status, error) VALUES (?, ?, ?, ?)',
                [$to, $template, $status, $error === null ? null : mb_substr($error, 0, 500)]
            );
        } catch (Throwable $e) {
            Logger::exception($e);
        }
    }
}
