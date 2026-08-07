/* ============================================================
   Reveal system, animated counters, marquee ticker, magnetic buttons.
   One IntersectionObserver — everything opts in by class.
   ============================================================ */
AX.module(function reveal(){
  'use strict';
  var $ = AX.$, $$ = AX.$$, reduce = AX.reduce;

  /* ---------------- Counters ---------------- */
  function runCount(el){
    var target = parseFloat(el.dataset.count) || 0;
    var pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    if(reduce){ el.textContent = pre + target.toLocaleString('en-IN') + suf; return; }
    var t0 = null, dur = 1400;
    function tick(now){
      if(t0 === null) t0 = now;
      var p = Math.min(1, (now - t0)/dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + Math.round(target * e).toLocaleString('en-IN') + suf;
      if(p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------------- Observer ---------------- */
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(!en.isIntersecting) return;
      en.target.classList.add('is-in');
      io.unobserve(en.target);
      $$('[data-count]', en.target).forEach(runCount);
    });
  }, {threshold:0.14, rootMargin:'0px 0px -7% 0px'});

  $$('.rv, .step, .steps, .plan, .svc__row, .work__item, .why__item, .secHead')
    .forEach(function(el){ io.observe(el); });

  /* Hero plays immediately on load */
  requestAnimationFrame(function(){
    var hero = $('#heroCopy');
    if(hero) hero.classList.add('is-in');
  });

  /* ---------------- Ticker ---------------- */
  var items = ['Business websites','Web apps','Mobile apps','Online stores','Landing pages',
               'Calculators','AI chat assistants','CMS & blogs','SEO foundations',
               'Speed optimisation','WhatsApp lead capture','Ongoing support'];
  var track = $('#tickerTrack');
  if(track){
    var row = items.map(function(t){
      return '<span class="ticker__item">'+t+'</span><i class="ticker__sep"></i>';
    }).join('');
    track.innerHTML = '<div class="ticker__row">'+row+'</div><div class="ticker__row">'+row+'</div>';
  }

  /* ---------------- Magnetic buttons — subtle pull toward the cursor ---------------- */
  if(!reduce && AX.canHover){
    $$('[data-magnetic]').forEach(function(el){
      el.addEventListener('pointermove', function(e){
        var r = el.getBoundingClientRect();
        var mx = e.clientX - r.left, my = e.clientY - r.top;
        el.style.setProperty('--mx', mx + 'px');
        el.style.setProperty('--my', my + 'px');
        el.style.transform = 'translate(' + ((mx - r.width/2) * 0.16) + 'px,' + ((my - r.height/2) * 0.26) + 'px)';
      });
      el.addEventListener('pointerleave', function(){ el.style.transform = ''; });
    });
  }
});
