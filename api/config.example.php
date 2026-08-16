<?php
/* ============================================================
   MAIL CONFIG — TEMPLATE

   Copy this file to config.php on the server and fill it in.
   config.php is in .gitignore and must never be committed: it
   holds a working password for the mailbox.

   Keep this template free of real values too — it IS committed,
   and the repository is public.

   On BigRock: cPanel → File Manager → api/ → copy
   config.example.php → config.php → Edit → fill in → Save.
   ============================================================ */

if (!defined('AX_MAIL')) { http_response_code(403); exit; }

return array(

  /* Where enquiries land. */
  'to'        => 'you@example.com',
  'to_name'   => 'Aivoryx',

  /* What the enquirer sees in their inbox as the sender.
     With Gmail SMTP this must be the Gmail account itself, or an
     alias you have verified under Gmail → Settings → Accounts →
     "Send mail as". Anything else gets rewritten by Google. */
  'from'      => 'you@example.com',
  'from_name' => 'Aivoryx',

  /* SMTP. For Gmail, 'pass' is a 16-character App Password from
     myaccount.google.com → Security → 2-Step Verification →
     App passwords. It is NOT the account's normal password, and
     the option only appears once 2-Step Verification is on.

     Paste it without spaces.

     Set 'enabled' => false to skip SMTP entirely and use the
     server's own mail() — see the note in mailer.php about why
     that delivers worse. */
  'smtp' => array(
    'enabled' => true,
    'host'    => 'smtp.gmail.com',
    'port'    => 587,          // 587 with STARTTLS, or 465 with SSL
    'secure'  => 'tls',        // 'tls' for 587, 'ssl' for 465
    'user'    => 'you@example.com',
    'pass'    => 'xxxxxxxxxxxxxxxx',   // 16-char App Password, no spaces
    'timeout' => 20,
  ),

  /* Send the enquirer a "we've got it" reply. */
  'autoreply' => true,

  /* Most submissions accepted from one IP per hour, before the
     endpoint starts refusing. Stops a bot hammering the form. */
  'rate_limit' => 6,

  /* Public site address, used in the auto-reply's links. */
  'site' => 'https://aivoryx.com',
);
