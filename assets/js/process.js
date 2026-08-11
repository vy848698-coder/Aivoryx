/* ============================================================
   PROCESS PAGE — the sixteen-day scrubber.

   The days themselves live in process.html as plain articles, so
   the page is readable and indexable with JavaScript switched off.
   This module takes them over: it builds the rail from their data
   attributes, shows one day at a time, and keeps a running ledger
   of everything the client owns by the end of the selected day.

   Nothing here invents content — every figure on screen is summed
   from the markup, so the page can never quietly disagree with itself.
   ============================================================ */
AX.module(function process(){
  'use strict';
  var $ = AX.$, $$ = AX.$$, reduce = AX.reduce;

  var PHASES = [
    { name:'Talk',   c:'#ffb829' },
    { name:'Design', c:'#a684ff' },
    { name:'Build',  c:'#8052ff' },
    { name:'Launch', c:'#4fd1b0' }
  ];

  var STEP_MS = 1700;   /* autoplay pace — long enough to read the day */

  var list = $('#dayList');
  if(!list) return;

  var days   = $$('.day', list);
  if(!days.length) return;

  var rail    = $('#rail');
  var scroller= $('#railScroll');
  var track   = $('#railTrack');
  var bank    = $('#bank');
  var btnPrev = $('#dayPrev');
  var btnNext = $('#dayNext');
  var btnPlay = $('#dayPlay');
  var elDay   = $('#bankDay');
  var elPct   = $('#bankPct');
  var elTime  = $('#bankTime');
  var elCount = $('#bankCount');
  var elFill  = $('#bankFill');
  var elList  = $('#bankList');
  var elCta   = $('#bankCta');

  /* ---------------- Read the markup once ---------------- */
  var data = days.map(function(el){
    return {
      el:    el,
      n:     parseInt(el.dataset.day, 10),
      phase: parseInt(el.dataset.phase, 10),
      pct:   parseInt(el.dataset.pct, 10),
      mins:  parseInt(el.dataset.mins, 10) || 0,
      title: ($('.day__t', el) || {}).textContent || '',
      gets:  $$('.gets li', el).map(function(li){ return li.textContent.trim(); })
    };
  });

  var totalGets = data.reduce(function(s, d){ return s + d.gets.length; }, 0);
  var totalMins = data.reduce(function(s, d){ return s + d.mins; }, 0);

  /* Anything that quotes a total reads it from here rather than the copy */
  $$('[data-total-gets]').forEach(function(el){
    if(el.hasAttribute('data-count')) el.dataset.count = totalGets;
    else el.textContent = totalGets;
  });
  $$('[data-total-time]').forEach(function(el){ el.textContent = clock(totalMins); });

  function pad(n){ return n < 10 ? '0' + n : String(n); }

  function clock(m){
    if(m < 60) return m + ' min';
    var h = Math.floor(m / 60), r = m % 60;
    return h + ' hr' + (r ? ' ' + r + ' min' : '');
  }

  /* ---------------- Build the rail ---------------- */
  var ticks = data.map(function(d, i){
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tick';
    b.style.setProperty('--c', PHASES[d.phase].c);
    b.style.setProperty('--p', d.pct);
    b.setAttribute('aria-label', 'Day ' + d.n + ' — ' + d.title);
    b.innerHTML = '<span class="tick__bar"></span><span class="tick__d">' + pad(d.n) + '</span>';
    b.addEventListener('click', function(){ stop(); select(i); });
    track.appendChild(b);
    return b;
  });

  /* ---------------- Render one day ---------------- */
  var current = -1;

  function select(i, quiet){
    i = Math.max(0, Math.min(data.length - 1, i));
    if(i === current) return;
    current = i;

    var d = data[i];

    days.forEach(function(el, n){ el.classList.toggle('is-on', n === i); });
    ticks.forEach(function(t, n){
      t.classList.toggle('is-on', n === i);
      t.classList.toggle('is-done', n < i);
      t.setAttribute('aria-current', n === i ? 'true' : 'false');
    });

    if(btnPrev) btnPrev.disabled = i === 0;
    if(btnNext) btnNext.disabled = i === data.length - 1;

    /* everything banked from day zero up to and including today */
    var banked = 0, mins = 0, rows = [];
    for(var k = 0; k <= i; k++){
      var day = data[k];
      mins += day.mins;
      banked += day.gets.length;
      /* newest day first, original order kept inside the day */
      rows.unshift(day.gets.map(function(g){
        return '<li' + (k === i ? ' class="is-new"' : '') + '>' + g +
               '<small>Day ' + pad(day.n) + '</small></li>';
      }).join(''));
    }

    elDay.textContent   = 'Day ' + pad(d.n);
    elPct.textContent   = d.pct + '%';
    elTime.textContent  = clock(mins);
    elCount.textContent = banked;
    elFill.style.width  = d.pct + '%';
    elList.innerHTML    = rows.join('');

    elCta.setAttribute('href', AX.waLink(
      'Hi Aivoryx — I read through your build day by day, up to Day ' + d.n +
      ' (' + d.title + ').\n\nI\'d like to start at Day 0. When can we do the 20-minute call?'
    ));

    centreTick(i, quiet);
  }

  /* keep the selected tick visible when the rail has to scroll */
  function centreTick(i, quiet){
    if(!scroller || scroller.scrollWidth <= scroller.clientWidth) return;
    var t = ticks[i];
    var left = t.offsetLeft - (scroller.clientWidth - t.offsetWidth) / 2;
    left = Math.max(0, left);
    if(quiet || reduce || !scroller.scrollTo) scroller.scrollLeft = left;
    else scroller.scrollTo({ left: left, behavior: 'smooth' });
  }

  /* ---------------- Autoplay ---------------- */
  var timer = null;

  function stop(){
    if(!timer) return;
    clearInterval(timer);
    timer = null;
    btnPlay.classList.remove('is-playing');
    btnPlay.setAttribute('aria-pressed', 'false');
    $('.ctl__label', btnPlay).textContent = 'Play the build';
  }

  function play(){
    if(current >= data.length - 1) select(0);
    timer = setInterval(function(){
      if(current >= data.length - 1){ stop(); return; }
      select(current + 1);
    }, STEP_MS);
    btnPlay.classList.add('is-playing');
    btnPlay.setAttribute('aria-pressed', 'true');
    $('.ctl__label', btnPlay).textContent = 'Pause';
  }

  if(btnPlay) btnPlay.addEventListener('click', function(){ if(timer) stop(); else play(); });
  if(btnPrev) btnPrev.addEventListener('click', function(){ stop(); select(current - 1); });
  if(btnNext) btnNext.addEventListener('click', function(){ stop(); select(current + 1); });

  /* arrow keys once the rail has focus */
  track.addEventListener('keydown', function(e){
    var i = ['ArrowLeft','ArrowRight','Home','End'].indexOf(e.key);
    if(i === -1) return;
    e.preventDefault();
    stop();
    select(i === 0 ? current - 1 : i === 1 ? current + 1 : i === 2 ? 0 : data.length - 1);
    ticks[current].focus();
  });

  /* the hero band jumps straight to the first day of a phase */
  $$('[data-goto-phase]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var p = parseInt(btn.dataset.gotoPhase, 10);
      var i = 0;
      for(var k = 0; k < data.length; k++){ if(data[k].phase === p){ i = k; break; } }
      stop();
      select(i);
      if(AX.scrollToTarget) AX.scrollToTarget('#days');
    });
  });

  /* stop the autoplay running unseen in a background tab */
  document.addEventListener('visibilitychange', function(){ if(document.hidden) stop(); });

  /* ---------------- Take over ---------------- */
  list.classList.add('is-live');
  if(rail) rail.hidden = false;
  if(bank) bank.hidden = false;
  select(0, true);
});
