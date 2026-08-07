/* ============================================================
   Paints config.js values into the markup.
   Markup opts in with data attributes:
     data-wa            -> href = wa.me link (uses waGreeting)
     data-tel           -> href = tel:
     data-mail          -> href = mailto:
     data-phone-text    -> textContent = phoneDisplay
     data-mail-text     -> textContent = email
   ============================================================ */
AX.module(function contact(){
  'use strict';
  var c = AX.config;

  AX.$$('[data-wa]').forEach(function(el){
    el.setAttribute('href', AX.waLink(el.dataset.wa || c.waGreeting));
  });
  AX.$$('[data-tel]').forEach(function(el){ el.setAttribute('href', 'tel:' + c.phone); });
  AX.$$('[data-mail]').forEach(function(el){ el.setAttribute('href', 'mailto:' + c.email); });
  AX.$$('[data-phone-text]').forEach(function(el){ el.textContent = c.phoneDisplay; });
  AX.$$('[data-mail-text]').forEach(function(el){ el.textContent = c.email; });

  if(c.bookingUrl){
    var book = AX.$('#bookCall');
    if(book){
      book.setAttribute('href', c.bookingUrl);
      book.setAttribute('target', '_blank');
      book.setAttribute('rel', 'noopener');
      book.removeAttribute('data-scroll');
    }
  }

  var yr = AX.$('#yr');
  if(yr) yr.textContent = new Date().getFullYear();
});
