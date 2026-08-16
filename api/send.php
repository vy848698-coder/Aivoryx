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

/* A table, not a designed email — this one is read once, on a phone,
   by someone deciding whether to pick up the call. */
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

$rowsHtml = '';
$rowsText = '';
foreach ($rows as $k => $v) {
  $rowsHtml .= '<tr>'
    . '<td style="padding:9px 16px 9px 0;color:#8a8a8a;font-size:12px;letter-spacing:.08em;text-transform:uppercase;vertical-align:top;white-space:nowrap">' . ax_e($k) . '</td>'
    . '<td style="padding:9px 0;color:#111;font-size:15px;vertical-align:top">' . nl2br(ax_e($v)) . '</td>'
    . '</tr>';
  $rowsText .= str_pad($k . ':', 10) . ' ' . $v . "\n";
}

$ownerHtml =
  '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px">'
  . '<p style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#8052ff;margin:0 0 6px">New enquiry</p>'
  . '<h1 style="font-size:22px;font-weight:600;margin:0 0 20px;color:#111">' . ax_e($name) . ' &mdash; ' . ax_e($need) . '</h1>'
  . '<table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-top:1px solid #e6e6e6">' . $rowsHtml . '</table>'
  . '<p style="margin:22px 0 0"><a href="https://wa.me/' . $waNum . '" style="background:#8052ff;color:#fff;text-decoration:none;padding:11px 20px;border-radius:999px;font-size:14px;display:inline-block">Reply on WhatsApp</a></p>'
  . '<p style="color:#8a8a8a;font-size:12px;margin:20px 0 0">Hit reply to answer by email &mdash; it goes straight to ' . ax_e($email) . '.</p>'
  . '</div>';

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

  $replyHtml =
    '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;color:#111">'
    . '<p style="font-size:16px;margin:0 0 16px">Hi ' . ax_e($first) . ',</p>'
    . '<p style="font-size:16px;line-height:1.6;margin:0 0 16px">Thanks &mdash; your enquiry reached us and a person has it, not an autoresponder queue. We reply the same day, usually within a few hours.</p>'
    . '<p style="font-size:16px;line-height:1.6;margin:0 0 16px">If it\'s urgent, WhatsApp is faster: <a href="https://wa.me/919399593499" style="color:#8052ff">+91 93995 93499</a>.</p>'
    . '<table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-top:1px solid #e6e6e6;margin:24px 0 0">'
    . '<tr><td style="padding:14px 0 0;color:#8a8a8a;font-size:12px;letter-spacing:.08em;text-transform:uppercase">What you sent</td></tr>'
    . '<tr><td style="padding:8px 0 0;font-size:15px;line-height:1.6">'
    . ax_e($need) . ' &middot; ' . ax_e($budget)
    . ($message !== '' ? '<br><span style="color:#555">' . nl2br(ax_e($message)) . '</span>' : '')
    . '</td></tr></table>'
    . ($site ? '<p style="margin:24px 0 0;font-size:14px;color:#555">While you wait, everything is published: the <a href="' . ax_e($site) . '/pricing.html" style="color:#8052ff">prices</a>, the <a href="' . ax_e($site) . '/process.html" style="color:#8052ff">day-by-day process</a>, and five <a href="' . ax_e($site) . '/tools.html" style="color:#8052ff">free tools</a> you can use right now.</p>' : '')
    . '<p style="margin:24px 0 0;font-size:14px;color:#111">&mdash; Aivoryx</p>'
    . '</div>';

  $replyText =
    "Hi " . $first . ",\n\n"
    . "Thanks — your enquiry reached us and a person has it. We reply the same day,\n"
    . "usually within a few hours.\n\n"
    . "If it's urgent, WhatsApp is faster: +91 93995 93499\n\n"
    . "What you sent\n" . $need . " · " . $budget . ($message !== '' ? "\n" . $message : '') . "\n\n"
    . ($site ? "Prices, the day-by-day process and five free tools are all published at " . $site . "\n\n" : '')
    . "— Aivoryx\n";

  try {
    ax_send($cfg, $email, $name, 'We\'ve got your enquiry — Aivoryx', $replyHtml, $replyText, $cfg['to'], $cfg['to_name']);
  } catch (Exception $e) {
    error_log('[aivoryx] auto-reply failed: ' . $e->getMessage());
  }
}

ax_out(true, 'Sent. We\'ll reply to ' . $email . ' the same day.');
