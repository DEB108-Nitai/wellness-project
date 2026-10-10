<?php
/**
 * Shared HTML email layout. Inline styles + tables for broad email-client support.
 * @var array $vars
 * @var array $message  ['subject','preheader','body'(HTML),'text']
 * @var callable $e     HTML escaper
 */
?><!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title><?= $e($message['subject']) ?></title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#1e2430;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;"><?= $e($message['preheader'] ?? '') ?></span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
      <tr><td style="height:6px;background:linear-gradient(90deg,#0d9488,#4f46e5,#d97706);background-color:#0d9488;"></td></tr>
      <tr><td style="padding:28px 32px 8px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="width:36px;height:36px;border-radius:10px;background:#0d9488;color:#ffffff;font-weight:700;font-size:16px;letter-spacing:-0.5px;text-align:center;vertical-align:middle;">te</td>
          <td style="padding-left:10px;font-size:18px;font-weight:700;color:#0f172a;"><?= $e($vars['siteName']) ?></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:16px 32px 8px;font-size:15px;line-height:1.6;color:#334155;">
        <?= $message['body'] /* already escaped by the template */ ?>
      </td></tr>
      <tr><td style="padding:24px 32px 28px;font-size:12px;line-height:1.6;color:#94a3b8;border-top:1px solid #f1f5f9;">
        You received this email because of activity on your <?= $e($vars['siteName']) ?> account.
        <?php if (!empty($vars['supportEmail'])): ?>
          Questions? Contact <a href="mailto:<?= $e($vars['supportEmail']) ?>" style="color:#0d9488;"><?= $e($vars['supportEmail']) ?></a>.
        <?php endif; ?>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
