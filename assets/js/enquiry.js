/* ============================================================
   CONTACT PAGE — the brief builder and the working clock.

   Two jobs, both about removing doubt:

   1. The clock. Everything time-related on this page is derived
      from the actual hour in Asia/Kolkata, not from the visitor's
      device and not from copy someone forgot to update. If the desk
      is shut, the page says so and quotes the next honest reply time.

   2. The brief. Chips and fields compose one real message in front
      of the visitor. The same string is what goes to WhatsApp, into
      an email, or onto the clipboard — there is no second, hidden
      version of the enquiry, and nothing leaves the page until a
      send button is pressed.
   ============================================================ */
AX.module(function enquiry(){
  'use strict';
  var $ = AX.$, $$ = AX.$$;

  /* Minutes from midnight, IST. Sunday is absent rather than zeroed
     so "is there a working day at all" stays a single truthiness check. */
  var HOURS = {
    1:{o:570,c:1140}, 2:{o:570,c:1140}, 3:{o:570,c:1140},
    4:{o:570,c:1140}, 5:{o:570,c:1140}, 6:{o:600,c:960}
  };
  var REPLY_MINS = 120;   /* the promise made in the hero */
  var DAYS  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var SHORT = {Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};

  /* ---------------- The clock ---------------- */

  /* Whatever timezone the visitor is in, the desk is in Bhubaneswar. */
  function istNow(){
    try{
      var o = {};
      new Intl.DateTimeFormat('en-GB',{
        timeZone:'Asia/Kolkata', weekday:'short', hour:'2-digit', minute:'2-digit', hour12:false
      }).formatToParts(new Date()).forEach(function(p){ o[p.type] = p.value; });

      var d = SHORT[o.weekday], h = parseInt(o.hour,10) % 24, m = parseInt(o.minute,10);
      if(d === undefined || isNaN(h) || isNaN(m)) throw new Error('unsupported');
      return {d:d, m:h*60 + m};
    }catch(err){
      var n = new Date();
      return {d:n.getDay(), m:n.getHours()*60 + n.getMinutes()};
    }
  }

  function fmt(t){
    var h = Math.floor(t/60) % 24, m = t % 60;
    var ap = h < 12 ? 'am' : 'pm', hh = h % 12;
    return (hh === 0 ? 12 : hh) + ':' + (m < 10 ? '0'+m : m) + ' ' + ap;
  }

  function isOpen(t){
    var h = HOURS[t.d];
    return !!h && t.m >= h.o && t.m < h.c;
  }

  /* The next moment someone is at the desk, as {d, m, k} where k is
     how many days ahead that is. */
  function nextOpen(t){
    var h = HOURS[t.d];
    if(h && t.m < h.o) return {d:t.d, m:h.o, k:0};
    for(var k = 1; k <= 7; k++){
      var d = (t.d + k) % 7;
      if(HOURS[d]) return {d:d, m:HOURS[d].o, k:k};
    }
    return {d:t.d, m:t.m, k:0};
  }

  /* Two hours from now if we're open and the clock allows it, otherwise
     an hour into the next working morning. Never a promise made after
     closing time that nobody will be there to keep. */
  function replyBy(){
    var t = istNow();
    if(isOpen(t)){
      var r = t.m + REPLY_MINS;
      if(r <= HOURS[t.d].c) return {d:t.d, m:r, k:0};
    }
    var n = nextOpen(t);
    return {d:n.d, m:n.m + 60, k:n.k};
  }

  function whenLabel(p){
    return p.k === 0 ? 'today' : p.k === 1 ? 'tomorrow' : DAYS[p.d];
  }

  /* ---------------- Hero status ---------------- */
  var elDot   = $('#nowDot');
  var elState = $('#nowState');
  var elClock = $('#nowClock');
  var elReply = $('#briefReply');
  var elTime  = $('#briefTime');

  function paintClock(){
    var t = istNow(), open = isOpen(t), r = replyBy();

    if(elState) elState.textContent = open ? 'Open now' : 'Away right now';
    if(elDot){
      elDot.classList.toggle('is-open', open);
      elDot.classList.toggle('is-shut', !open);
    }
    if(elClock){
      elClock.textContent = open
        ? 'It is ' + fmt(t.m) + ' here — at the desk'
        : 'It is ' + fmt(t.m) + ' here — back ' + whenLabel(nextOpen(t)) + ' at ' + fmt(nextOpen(t).m);
    }
    if(elReply) elReply.textContent = fmt(r.m) + ' ' + whenLabel(r);
    if(elTime)  elTime.textContent  = fmt(t.m);
  }

  paintClock();
  setInterval(paintClock, 30000);

  /* today's row in the opening-hours list */
  var hours = $('#hours');
  if(hours){
    var today = istNow().d;
    $$('li', hours).forEach(function(li){
      li.classList.toggle('is-today', parseInt(li.dataset.day, 10) === today);
    });
  }

  /* ---------------- The brief ---------------- */
  var form = $('#briefForm');
  if(!form) return;

  var elMsg  = $('#briefMsg');
  var elPct  = $('#briefPct');
  var elFill = $('#briefFill');
  var elHint = $('#briefHint');
  var elBack = $('#briefBack');
  var elNote = $('#briefNote');
  var elTick = $('.bubble__tick');
  var noteDefault = elNote ? elNote.textContent : '';

  function esc(s){
    return String(s).replace(/[&<>"]/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];
    });
  }

  function picked(group){
    return $$('.chips[data-group="' + group + '"] .chip[aria-pressed="true"]')
      .map(function(b){ return b.textContent.trim(); });
  }

  function v(sel){
    var el = form.querySelector(sel);
    return el ? el.value.trim() : '';
  }

  function collect(){
    return {
      need:   picked('need')[0] || '',
      feat:   picked('feat'),
      when:   picked('when')[0] || '',
      budget: picked('budget')[0] || '',
      name:   v('#f-name'),
      biz:    v('#f-biz'),
      phone:  v('#f-phone'),
      email:  v('#f-email'),
      msg:    v('#f-msg')
    };
  }

  /* One row list drives both the preview and the sent message, so the
     two can never quietly drift apart. */
  function rows(d){
    return [
      ['Building',    d.need,             'What are we building?'],
      ['Needs to do', d.feat.join(', '),  'Optional — pick any'],
      ['Timeline',    d.when,             'When do you need it live?'],
      ['Budget',      d.budget,           'A range is enough'],
      ['Name',        d.name,             'Who are we replying to?'],
      ['Business',    d.biz,              'Optional'],
      ['Phone',       d.phone,            'Phone or WhatsApp'],
      ['Email',       d.email,            'Email']
    ];
  }

  function score(d){
    var s = 0;
    if(d.need) s += 20;
    if(d.feat.length) s += 10;
    if(d.when) s += 10;
    if(d.budget) s += 10;
    if(d.name) s += 15;
    if(d.phone || d.email) s += 25;
    if(d.msg) s += 10;
    return s;
  }

  function hint(d){
    if(!d.need)              return 'Start with what you’re building — the rest is optional.';
    if(!d.phone && !d.email) return 'Leave a phone number or an email, or there is nowhere to reply to.';
    if(!d.name)              return 'A name makes the reply a good deal less awkward.';
    if(!d.when || !d.budget) return 'Timeline and budget save us a whole round of questions.';
    if(!d.msg)               return 'Two lines about the business and we can answer properly, not generically.';
    return 'That is everything we need. Send it whichever way suits you.';
  }

  /* The exact string that gets sent — blank answers are left out
     rather than shipped as empty labels. */
  function message(d){
    var out = ['New project enquiry — Aivoryx', ''];

    rows(d).forEach(function(r){
      if(r[1]) out.push(r[0] + ': ' + r[1]);
    });

    if(d.msg) out.push('', 'Details: ' + d.msg);

    var r = replyBy();
    out.push('', 'Sent from aivoryx.com/contact — expecting a reply by ' + fmt(r.m) + ' ' + whenLabel(r) + '.');
    return out.join('\n');
  }

  function reachable(d){ return !!(d.name && (d.phone || d.email)); }

  function render(){
    var d = collect(), pct = score(d);

    if(elPct)  elPct.textContent = pct + '%';
    if(elFill) elFill.style.width = pct + '%';
    if(elHint) elHint.textContent = hint(d);

    if(elMsg){
      var html = '<span class="ln ln--head">New project enquiry — Aivoryx</span>';
      rows(d).forEach(function(r){
        html += r[1]
          ? '<span class="ln"><b>' + r[0] + '</b>' + esc(r[1]) + '</span>'
          : '<span class="ln ln--miss"><b>' + r[0] + '</b>' + esc(r[2]) + '</span>';
      });
      html += d.msg
        ? '<span class="ln ln--body">' + esc(d.msg) + '</span>'
        : '<span class="ln ln--body ln--miss">Anything else we should know?</span>';
      elMsg.innerHTML = html;
    }

    if(elTick) elTick.classList.toggle('is-ready', reachable(d));

    if(elBack){
      elBack.textContent = d.need === 'Not sure yet'
        ? 'A straight recommendation'
        : 'A written scope note';
    }
  }

  /* ---------------- Input ---------------- */
  $$('.chips[data-group]', form).forEach(function(group){
    var multi = group.hasAttribute('data-multi');
    group.addEventListener('click', function(e){
      var chip = e.target.closest('.chip');
      if(!chip || !group.contains(chip)) return;

      var on = chip.getAttribute('aria-pressed') === 'true';
      if(multi){
        chip.setAttribute('aria-pressed', on ? 'false' : 'true');
      }else{
        $$('.chip', group).forEach(function(c){ c.setAttribute('aria-pressed','false'); });
        /* tapping the chosen chip again clears the answer */
        chip.setAttribute('aria-pressed', on ? 'false' : 'true');
      }
      render();
    });
  });

  $$('input, textarea', form).forEach(function(el){
    el.addEventListener('input', function(){
      var field = el.closest('.field');
      if(field) field.classList.remove('is-bad');
      render();
    });
  });

  /* the composer never submits itself — Enter shouldn't reload the page */
  form.addEventListener('submit', function(e){ e.preventDefault(); });

  /* ---------------- Sending ---------------- */
  function flag(sel, bad){
    var el = form.querySelector(sel);
    if(!el) return !bad;
    var field = el.closest('.field');
    if(field) field.classList.toggle('is-bad', bad);
    return !bad;
  }

  function validate(d){
    var ok = flag('#f-name', d.name.length < 2);

    var hasPhone = d.phone.replace(/\D/g,'').length >= 7;
    var mailOk   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email);

    if(d.email && !mailOk) ok = flag('#f-email', true) && ok;
    else flag('#f-email', false);

    if(!hasPhone && !mailOk) ok = flag('#f-phone', true) && ok;
    else flag('#f-phone', false);

    if(!ok){
      say('Add a name and one way to reach you, then send.');
      var bad = form.querySelector('.field.is-bad input');
      if(bad) bad.focus();
    }
    return ok;
  }

  var revert = null;
  function say(text, hold){
    if(!elNote) return;
    elNote.textContent = text;
    clearTimeout(revert);
    revert = setTimeout(function(){ elNote.textContent = noteDefault; }, hold || 7000);
  }

  var send = $('#briefSend');
  if(send) send.addEventListener('click', function(){
    var d = collect();
    if(!validate(d)) return;
    window.open(AX.waLink(message(d)), '_blank', 'noopener');
    say('Opening WhatsApp with the brief typed out — press send there.');
  });

  var mail = $('#briefMail');
  if(mail) mail.addEventListener('click', function(){
    var d = collect();
    if(!validate(d)) return;
    var subject = 'Project enquiry' + (d.need ? ' — ' + d.need : '') + (d.biz ? ' — ' + d.biz : '');
    window.location.href = 'mailto:' + AX.config.email +
      '?subject=' + encodeURIComponent(subject) +
      '&body='    + encodeURIComponent(message(d));
    say('Opening your email app with the brief in the body.');
  });

  var copy = $('#briefCopy');
  if(copy) copy.addEventListener('click', function(){
    var text = message(collect());

    function done(){
      copy.classList.add('is-done');
      copy.textContent = 'Copied';
      say('Brief copied. Paste it wherever you like — including into a message to someone else.');
      setTimeout(function(){
        copy.classList.remove('is-done');
        copy.textContent = 'Copy the brief';
      }, 2600);
    }

    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(done, fallback);
    }else{
      fallback();
    }

    /* older Safari and any page served without a secure context */
    function fallback(){
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly','');
      ta.style.cssText = 'position:fixed;top:0;left:-9999px';
      document.body.appendChild(ta);
      ta.select();
      try{ document.execCommand('copy'); done(); }
      catch(err){ say('Couldn’t copy automatically — select the text in the panel instead.'); }
      document.body.removeChild(ta);
    }
  });

  render();
});
