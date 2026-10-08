<?php
declare(strict_types=1);

namespace Wellness\Services;

use PHPMailer\PHPMailer\PHPMailer;
use RuntimeException;
use Throwable;
use Wellness\Core\Config;
use Wellness\Core\Database;
use Wellness\Core\Logger;

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
            } elseif (Config::string('mail.host') !== '') {
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
        $mail->send();
    }

    private static function writeToLog(string $to, string $template, array $message): void
    {
        $dir = Config::path('mail');
        $file = sprintf('%s/%s-%s-%s.html', $dir, gmdate('Ymd-His'), $template, bin2hex(random_bytes(3)));
        $header = sprintf("<!--\nTo: %s\nSubject: %s\n\n%s\n-->\n", $to, $message['subject'], $message['text']);
        file_put_contents($file, $header . $message['html']);
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
