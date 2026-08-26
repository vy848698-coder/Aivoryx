/* ============================================================
   Quote form — validation, then hand off to WhatsApp with every
   answer prefilled.

   The form carries `novalidate`, so the browser's own bubbles never
   appear and every rule below is the only thing standing between a
   visitor and a submission. Each field marked `required` in the
   markup has a matching rule here — if you add a field to the form,
   add it to RULES or it will not be checked.
   ============================================================ */
AX.module(function form(){
  'use strict';
  var $ = AX.$, $$ = AX.$$;
  var f = $('#quoteForm');
  if(!f) return;

  var note = $('#formNote');
  var noteDefault = note ? note.textContent : '';

  /* Indian mobile numbers are 10 digits; the upper bound leaves room for
     a country code and separators someone has pasted in with it. */
  function badPhone(v){
    var d = v.replace(/\D/g, '');
    return d.length < 10 || d.length > 13;
  }
  function badEmail(v){
    return !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  }

  var RULES = [
    { id:'#f-name',   test:function(v){ return v.length < 2; } },
    { id:'#f-phone',  test:badPhone },
    { id:'#f-email',  test:badEmail },
    { id:'#f-need',   test:function(v){ return v === ''; } },
    { id:'#f-budget', test:function(v){ return v === ''; } }
  ];

  function val(id){
    var el = f.querySelector(id);
    return el && el.value.trim() ? el.value.trim() : '—';
  }

  /* One place that knows how a field is marked bad, so the class, the
     border and the screen-reader state can never drift apart. */
  function mark(el, bad){
    var field = el.closest('.field');
    if(field) field.classList.toggle('is-bad', bad);
    el.setAttribute('aria-invalid', bad ? 'true' : 'false');
    return !bad;
  }

  function validate(){
    var ok = true;
    RULES.forEach(function(r){
      var el = f.querySelector(r.id);
      if(!el) return;
      ok = mark(el, r.test(el.value.trim())) && ok;
    });
    return ok;
  }

  /* clear the error state as soon as someone starts fixing it */
  $$('input, select, textarea', f).forEach(function(el){
    var ev = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(ev, function(){
      var field = el.closest('.field');
      if(field) field.classList.remove('is-bad');
      el.setAttribute('aria-invalid', 'false');
    });
  });

  var btn = f.querySelector('button[type="submit"]');
  var sending = false;

  function say(text, kind){
    if(!note) return;
    note.textContent = text;
    note.classList.remove('is-good', 'is-bad');
    if(kind) note.classList.add(kind);
  }

  /* WhatsApp is its own channel on this page — the buttons beside the
     form open it directly. Submitting the form sends email and nothing
     else, so a visitor is never bounced into an app they didn't ask for. */
  f.addEventListener('submit', function(e){
    e.preventDefault();
    if(sending) return;

    /* The honeypot is off-screen and has no label a person ever sees.
       Anything in it is automated, so accept it silently and send
       nothing — telling a bot it failed only teaches it. */
    var trap = f.querySelector('#f-co');
    if(trap && trap.value){
      say('Thanks — we\'ll be in touch.', 'is-good');
      return;
    }

    if(!validate()){
      var bad = f.querySelector('.field.is-bad input, .field.is-bad select, .field.is-bad textarea');
      var n = f.querySelectorAll('.field.is-bad').length;
      say(n === 1 ? 'One field needs another look.' : n + ' fields need another look.', 'is-bad');
      if(bad) bad.focus();
      return;
    }

    var payload = {
      name:    val('#f-name'),
      phone:   val('#f-phone'),
      email:   val('#f-email'),
      need:    val('#f-need'),
      budget:  val('#f-budget'),
      message: f.querySelector('#f-msg') ? f.querySelector('#f-msg').value.trim() : '',
      /* the honeypot's real value — send.php drops the submission if a bot
         filled it. Hardcoding '' here meant the trap never fired. */
      company: f.querySelector('#f-co') ? f.querySelector('#f-co').value.trim() : '',
      page:    document.title
    };

    sending = true;
    if(btn) btn.disabled = true;
    say('Sending…');

    fetch('api/send.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(res){
      return res.json().catch(function(){ return { ok:false }; });
    })
    .then(function(data){
      if(data && data.ok){
        f.reset();
        $$('.field.is-bad', f).forEach(function(el){ el.classList.remove('is-bad'); });
        say(data.message || 'Sent. We\'ll reply the same day.', 'is-good');
        return;
      }
      /* An enquiry is worth more than a tidy error, so failure names the
         other way to reach us rather than just apologising. */
      say((data && data.message) || 'That didn\'t send. Please try WhatsApp — the button is just there.', 'is-bad');
    })
    .catch(function(){
      say('No connection. Please try again, or use the WhatsApp button.', 'is-bad');
    })
    .then(function(){
      sending = false;
      if(btn) btn.disabled = false;
    });
  });
});
