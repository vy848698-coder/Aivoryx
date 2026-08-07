/* ============================================================
   Quote form — light validation, then hand off to WhatsApp
   with every answer prefilled.
   ============================================================ */
AX.module(function form(){
  'use strict';
  var $ = AX.$, $$ = AX.$$;
  var f = $('#quoteForm');
  if(!f) return;

  var note = $('#formNote');
  var noteDefault = note ? note.textContent : '';

  function val(id){
    var el = f.querySelector(id);
    return el && el.value.trim() ? el.value.trim() : '—';
  }

  function flag(input, bad){
    var field = input.closest('.field');
    if(field) field.classList.toggle('is-bad', bad);
    return !bad;
  }

  function validate(){
    var ok = true;
    var name = f.querySelector('#f-name');
    var phone = f.querySelector('#f-phone');
    var email = f.querySelector('#f-email');

    ok = flag(name, name.value.trim().length < 2) && ok;
    ok = flag(phone, phone.value.replace(/\D/g,'').length < 7) && ok;
    if(email.value.trim()) ok = flag(email, !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) && ok;
    else flag(email, false);

    return ok;
  }

  /* clear the error state as soon as someone starts fixing it */
  $$('input, select, textarea', f).forEach(function(el){
    el.addEventListener('input', function(){
      var field = el.closest('.field');
      if(field) field.classList.remove('is-bad');
    });
  });

  f.addEventListener('submit', function(e){
    e.preventDefault();

    if(!validate()){
      if(note) note.textContent = 'Please check the highlighted fields.';
      var bad = f.querySelector('.field.is-bad input, .field.is-bad select, .field.is-bad textarea');
      if(bad) bad.focus();
      return;
    }

    var msg = 'New project enquiry — Aivoryx\n\n' +
      'Name: '    + val('#f-name')   + '\n' +
      'Phone: '   + val('#f-phone')  + '\n' +
      'Email: '   + val('#f-email')  + '\n' +
      'Needs: '   + val('#f-need')   + '\n' +
      'Budget: '  + val('#f-budget') + '\n' +
      'Details: ' + val('#f-msg');

    window.open(AX.waLink(msg), '_blank', 'noopener');
    if(note) note.textContent = 'Opening WhatsApp — send the message to reach us.';
    setTimeout(function(){ if(note) note.textContent = noteDefault; }, 8000);
  });
});
