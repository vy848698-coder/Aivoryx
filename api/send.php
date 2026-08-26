<?php
/* ============================================================
   ENQUIRY ENDPOINT

   Takes the quote form, emails it to the inbox in config.php, and
   sends the enquirer a short confirmation.

   The client already validates, but everything here is checked
   again from scratch: the browser is not where the rules live,
   and a POST can arrive without ever touching the form.
   ============================================================ */

define('AX_MAIL', 1);

/* XAMPP ships date.timezone=Europe/Berlin and shared hosts vary, so the
   timezone is pinned here rather than inherited. It sets two things that
   are wrong otherwise: the Date header, which should agree with where the
   mail actually originates, and the "Received" time the owner reads. */
date_default_timezone_set('Asia/Kolkata');

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function ax_out($ok, $msg, $code = 200) {
  http_response_code($code);
  echo json_encode(array('ok' => $ok, 'message' => $msg));
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  ax_out(false, 'Method not allowed.', 405);
}

$cfgFile = __DIR__ . '/config.php';
if (!is_file($cfgFile)) {
  error_log('[aivoryx] api/config.php is missing — copy config.example.php and fill it in');
  ax_out(false, "The form isn't connected yet. Please use WhatsApp for now.", 500);
}
$cfg = require $cfgFile;

require __DIR__ . '/mailer.php';


/* ---------------- Input ----------------
   Accepts JSON or a normal form post, so the endpoint still works
   if JavaScript is ever taken out of the path. */
$ctype = '';
if (isset($_SERVER['CONTENT_TYPE']))           $ctype = $_SERVER['CONTENT_TYPE'];
elseif (isset($_SERVER['HTTP_CONTENT_TYPE']))  $ctype = $_SERVER['HTTP_CONTENT_TYPE'];

$raw = file_get_contents('php://input');
$in  = array();
if ($raw !== '' && stripos($ctype, 'json') !== false) {
  $in = json_decode($raw, true);
  if (!is_array($in)) $in = array();
} else {
  $in = $_POST;
}

/* mbstring is normally present on cPanel but is not guaranteed, and a
   missing extension here would be a fatal error on a live form. */
function ax_len($v)      { return function_exists('mb_strlen') ? mb_strlen($v, 'UTF-8') : strlen($v); }
function ax_cut($v, $n)  { return function_exists('mb_substr') ? mb_substr($v, 0, $n, 'UTF-8') : substr($v, 0, $n); }

function ax_field($in, $k, $max = 2000) {
  $v = isset($in[$k]) && is_scalar($in[$k]) ? trim((string)$in[$k]) : '';
  return ax_cut($v, $max);
}

$name    = ax_field($in, 'name', 120);
$phone   = ax_field($in, 'phone', 40);
$email   = ax_field($in, 'email', 200);
$need    = ax_field($in, 'need', 120);
$budget  = ax_field($in, 'budget', 120);
$message = ax_field($in, 'message', 4000);
$trap    = ax_field($in, 'company', 200);
$page    = ax_field($in, 'page', 200);


/* ---------------- Honeypot ----------------
   Answer as though it worked. Telling a bot it failed only tells
   it which field to leave alone next time. */
if ($trap !== '') {
  ax_out(true, 'Thanks — we\'ll be in touch.');
}


/* ---------------- Validation ---------------- */
$digits = preg_replace('/\D/', '', $phone);
$errors = array();

if (ax_len($name) < 2)                                     $errors[] = 'name';
if (strlen($digits) < 10 || strlen($digits) > 13)          $errors[] = 'phone';
if (!filter_var($email, FILTER_VALIDATE_EMAIL))            $errors[] = 'email';
if ($need === '')                                          $errors[] = 'need';
if ($budget === '')                                        $errors[] = 'budget';

if ($errors) {
  ax_out(false, 'Some details are missing or look wrong. Please check the form.', 422);
}


/* ---------------- Rate limit ----------------
   One small file per IP in the system temp directory, so nothing
   in the web root has to be writable. Best-effort by design: if
   the filesystem says no, a real enquiry still gets through. */
$limit = isset($cfg['rate_limit']) ? (int)$cfg['rate_limit'] : 6;
if ($limit > 0) {
  $ip   = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '0.0.0.0';
  $file = sys_get_temp_dir() . '/ax_rl_' . substr(sha1($ip), 0, 20);
  $now  = time();
  $hits = array();
  if (is_readable($file)) {
    $prev = json_decode((string)@file_get_contents($file), true);
    if (is_array($prev)) $hits = $prev;
  }
  $hits = array_values(array_filter($hits, function ($t) use ($now) { return $now - (int)$t < 3600; }));
  if (count($hits) >= $limit) {
    ax_out(false, 'That\'s a few enquiries in a short time. Please try again later, or message us on WhatsApp.', 429);
  }
  $hits[] = $now;
  @file_put_contents($file, json_encode($hits), LOCK_EX);
}


/* ---------------- The two emails ---------------- */
$site = rtrim(isset($cfg['site']) ? $cfg['site'] : '', '/');
$when = date('j M Y, g:ia');

function ax_e($v) { return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8'); }

/* Both emails share one shell: the mark, then the letter, then a
   quiet footer. Everything is inline-styled and table-based because
   mail clients strip <style> blocks and collapse flexbox. The logo
   is the cid: part attached in mailer.php, so it renders without the
   reader having to unblock remote images. */
function ax_shell($inner, $site) {
  return '<div style="margin:0;padding:36px 20px;background:#ffffff;'
    . 'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;'
    . '-webkit-font-smoothing:antialiased">'
    . '<div style="max-width:520px;margin:0 auto">'

    . '<table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 30px"><tr>'
    . '<td style="vertical-align:middle;padding-right:11px">'
    . '<img src="cid:' . AX_LOGO_CID . '" width="34" height="34" alt="Aivoryx"'
    . ' style="display:block;width:34px;height:34px;border-radius:9px"></td>'
    . '<td style="vertical-align:middle;font-size:16px;font-weight:600;'
    . 'letter-spacing:-.01em;color:#0d0d0d">Aivoryx</td>'
    . '</tr></table>'

    . $inner

    . '<div style="margin:38px 0 0;padding:18px 0 0;border-top:1px solid #ededed;'
    . 'color:#9b9b9b;font-size:12px;line-height:1.7">'
    . 'Aivoryx &mdash; custom websites, web apps and mobile apps.'
    . ($site ? '<br><a href="' . ax_e($site) . '" style="color:#9b9b9b">'
        . ax_e(preg_replace('~^https?://~', '', $site)) . '</a>' : '')
    . '</div>'

    . '</div></div>';
}

/* Read once, on a phone, by someone deciding whether to pick up the
   call — so it is set like a letter, not dumped like a form. */
$rows = array(
  'Name'    => $name,
  'Phone'   => $phone,
  'Email'   => $email,
  'Needs'   => $need,
  'Budget'  => $budget,
  'Details' => $message !== '' ? $message : '—',
  'Page'    => $page !== '' ? $page : '—',
  'Received'=> $when,
);

/* wa.me needs a country code. A bare 10-digit Indian mobile has none,
   so add 91 rather than building a link that silently fails. */
$waNum = strlen($digits) === 10 ? '91' . $digits : $digits;

/* Phone and email are made actionable — on a phone this email is the
   fastest route to the caller, so tapping the number should dial. */
$links = array(
  'Phone' => 'tel:+' . $waNum,
  'Email' => 'mailto:' . $email,
);

$rowsHtml = '';
$rowsText = '';
$i = 0;
foreach ($rows as $k => $v) {
  $i++;
  $last  = $i === count($rows);
  $value = nl2br(ax_e($v));
  if (isset($links[$k])) {
    $value = '<a href="' . ax_e($links[$k]) . '" style="color:#0d0d0d;text-decoration:none;border-bottom:1px solid #dcdcdc">' . $value . '</a>';
  }
  $rowsHtml .= '<tr>'
    . '<td style="padding:13px 18px 13px 0;color:#a3a3a3;font-size:11px;letter-spacing:.1em;'
    . 'text-transform:uppercase;vertical-align:top;white-space:nowrap;'
    . ($last ? '' : 'border-bottom:1px solid #f4f4f4;') . '">' . ax_e($k) . '</td>'
    . '<td style="padding:13px 0;color:#111111;font-size:15px;line-height:1.6;vertical-align:top;'
    . ($last ? '' : 'border-bottom:1px solid #f4f4f4;') . '">' . $value . '</td>'
    . '</tr>';
  $rowsText .= str_pad($k . ':', 10) . ' ' . $v . "\n";
}

$ownerHtml = ax_shell(
    '<p style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;'
  . 'color:#8052ff;margin:0 0 10px;font-weight:600">New enquiry</p>'
  . '<h1 style="font-size:25px;line-height:1.25;font-weight:600;letter-spacing:-.02em;'
  . 'margin:0 0 4px;color:#0d0d0d">' . ax_e($name) . '</h1>'
  . '<p style="font-size:16px;color:#6b6b6b;margin:0 0 26px">' . ax_e($need) . '</p>'
  . '<table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-top:1px solid #ededed">'
  . $rowsHtml . '</table>'
  . '<table cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0"><tr><td'
  . ' style="background:#0d0d0d;border-radius:999px">'
  . '<a href="https://wa.me/' . $waNum . '" style="display:inline-block;padding:13px 26px;'
  . 'color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;letter-spacing:.01em">'
  . 'Reply on WhatsApp &rarr;</a></td></tr></table>'
  . '<p style="color:#9b9b9b;font-size:13px;line-height:1.65;margin:20px 0 0">'
  . 'Or just hit reply &mdash; it goes straight to ' . ax_e($email) . '.</p>',
  $site
);

$ownerText = "New enquiry — Aivoryx\n\n" . $rowsText . "\nReply to this email to answer " . $email . ".\n";

try {
  ax_send(
    $cfg, $cfg['to'], $cfg['to_name'],
    'New enquiry: ' . $name . ' — ' . $need,
    $ownerHtml, $ownerText,
    $email, $name                       /* Reply-To, so replying reaches the enquirer */
  );
} catch (Exception $e) {
  error_log('[aivoryx] enquiry send failed: ' . $e->getMessage());
  ax_out(false, "We couldn't send that just now. Please try WhatsApp, or call us.", 502);
}


/* The confirmation is best-effort: the enquiry is already safely in
   the inbox, so a bounce here must not report failure to the sender. */
if (!empty($cfg['autoreply'])) {
  $first = preg_split('/\s+/', $name);
  $first = $first[0];

  $replyHtml = ax_shell(
      '<p style="font-size:17px;line-height:1.6;color:#0d0d0d;margin:0 0 18px">Hi ' . ax_e($first) . ',</p>'
    . '<p style="font-size:16px;line-height:1.7;color:#333333;margin:0 0 18px">'
    . 'Thanks &mdash; your enquiry reached us and a person has it, not an autoresponder '
    . 'queue. We reply the same day, usually within a few hours.</p>'
    . '<p style="font-size:16px;line-height:1.7;color:#333333;margin:0 0 26px">'
    . 'If it\'s urgent, WhatsApp is faster: '
    . '<a href="https://wa.me/919399593499" style="color:#0d0d0d;text-decoration:none;'
    . 'border-bottom:1px solid #dcdcdc">+91 93995 93499</a>.</p>'

    . '<table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-top:1px solid #ededed">'
    . '<tr><td style="padding:18px 0 0;color:#a3a3a3;font-size:11px;letter-spacing:.1em;'
    . 'text-transform:uppercase">What you sent</td></tr>'
    . '<tr><td style="padding:9px 0 0;font-size:15px;line-height:1.6;color:#0d0d0d">'
    . ax_e($need) . ' <span style="color:#c8c8c8">&middot;</span> ' . ax_e($budget)
    . ($message !== '' ? '<br><span style="color:#6b6b6b">' . nl2br(ax_e($message)) . '</span>' : '')
    . '</td></tr></table>'

    . ($site ? '<p style="margin:26px 0 0;font-size:15px;line-height:1.7;color:#6b6b6b">'
        . 'While you wait, everything is published: the '
        . '<a href="' . ax_e($site) . '/pricing.html" style="color:#8052ff;text-decoration:none">prices</a>, the '
        . '<a href="' . ax_e($site) . '/process.html" style="color:#8052ff;text-decoration:none">day-by-day process</a>, and seven '
        . '<a href="' . ax_e($site) . '/tools.html" style="color:#8052ff;text-decoration:none">free tools</a> '
        . 'you can use right now.</p>' : '')
    . '<p style="margin:26px 0 0;font-size:15px;color:#0d0d0d">&mdash; Aivoryx</p>',
    $site
  );

  $replyText =
    "Hi " . $first . ",\n\n"
    . "Thanks — your enquiry reached us and a person has it. We reply the same day,\n"
    . "usually within a few hours.\n\n"
    . "If it's urgent, WhatsApp is faster: +91 93995 93499\n\n"
    . "What you sent\n" . $need . " · " . $budget . ($message !== '' ? "\n" . $message : '') . "\n\n"
    . ($site ? "Prices, the day-by-day process and seven free tools are all published at " . $site . "\n\n" : '')
    . "— Aivoryx\n";

  try {
    ax_send($cfg, $email, $name, 'We\'ve got your enquiry — Aivoryx', $replyHtml, $replyText, $cfg['to'], $cfg['to_name'], true);
  } catch (Exception $e) {
    error_log('[aivoryx] auto-reply failed: ' . $e->getMessage());
  }
}

ax_out(true, 'Sent. We\'ll reply to ' . $email . ' the same day.');
