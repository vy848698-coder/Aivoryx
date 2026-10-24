/* ============================================================
   WORK PAGE — the hero deck, the index peek and the four live demos.
   Each demo rebuilds the mechanism that made its project worth
   doing, so a visitor can use it instead of reading about it.
   ============================================================ */
AX.module(function work(){
  'use strict';
  var $ = AX.$, $$ = AX.$$;

  /* Writes an output and, if it actually changed, flashes it so the eye
     goes to the number that moved rather than hunting for it. */
  function put(el, text){
    if(el.textContent === text) return;
    el.textContent = text;
    if(AX.reduce) return;
    el.classList.remove('is-bump');
    void el.offsetWidth;                 // restart the flash
    el.classList.add('is-bump');
  }

  /* The "tap to try" hint on each demo stays until the first touch. */
  $$('.demo').forEach(function(d){
    function used(){ d.classList.add('is-used'); }
    d.addEventListener('pointerdown', used, {once:true});
    d.addEventListener('keydown', used, {once:true});
  });

  /* Single-select chip group. Returns the chosen chip's value. */
  function chipGroup(root, onPick){
    var chips = $$('.chip', root);
    chips.forEach(function(c){
      c.addEventListener('click', function(){
        chips.forEach(function(o){ o.setAttribute('aria-pressed', String(o === c)); });
        onPick();
      });
    });
    return function(){
      var on = chips.filter(function(c){ return c.getAttribute('aria-pressed') === 'true'; })[0];
      return on ? on.textContent.trim() : null;
    };
  }

  /* ============================================================
     Hero deck
     Publishes --px/--py (pointer, lerped) and --s (how far the hero
     has scrolled away) on .fan. The CSS turns those into depth per
     card and a fan that opens wider as it leaves.
     ============================================================ */
  (function deck(){
    var fan = $('#fan'), hero = $('#pheroSec');
    if(!fan || !hero || AX.reduce) return;

    var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;

    function loop(){
      cx += (tx - cx) * .08;
      cy += (ty - cy) * .08;
      fan.style.setProperty('--px', cx.toFixed(4));
      fan.style.setProperty('--py', cy.toFixed(4));
      raf = (Math.abs(tx - cx) > .002 || Math.abs(ty - cy) > .002) ? requestAnimationFrame(loop) : null;
    }
    function kick(){ if(!raf) raf = requestAnimationFrame(loop); }

    if(AX.canHover){
      hero.addEventListener('pointermove', function(e){
        var r = hero.getBoundingClientRect();
        tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width  - .5) * 2));
        ty = Math.max(-1, Math.min(1, ((e.clientY - r.top)  / r.height - .5) * 2));
        kick();
      }, {passive:true});
      hero.addEventListener('pointerleave', function(){ tx = 0; ty = 0; kick(); });
    }

    var ticking = false;
    function spread(){
      ticking = false;
      /* stacked below the copy, the deck is only reached by scrolling —
         spreading it then would scatter it before anyone has seen it */
      if(window.innerWidth <= 1024){ fan.style.setProperty('--s', 0); return; }
      var h = hero.offsetHeight || 1;
      var s = Math.max(0, Math.min(1, window.pageYOffset / (h * .75)));
      fan.style.setProperty('--s', s.toFixed(4));
    }
    window.addEventListener('scroll', function(){
      if(!ticking){ ticking = true; requestAnimationFrame(spread); }
    }, {passive:true});
    window.addEventListener('resize', function(){ requestAnimationFrame(spread); });
    spread();
  })();

  /* ============================================================
     Index peek
     The site follows the cursor down the index. Position is lerped so
     it trails rather than sticks, and it leans into the direction of
     travel — the lean is what makes it feel carried rather than drawn.
     ============================================================ */
  (function peek(){
    var box = $('#peek');
    var rows = $$('[data-peek]');
    if(!box || !rows.length || AX.reduce || !AX.canHover) return;

    var img = $('img', box);
    var tx = 0, ty = 0, x = 0, y = 0, raf = null, on = false;

    function loop(){
      var dx = tx - x;
      x += dx * .14;
      y += (ty - y) * .14;
      var lean = Math.max(-10, Math.min(10, dx * .05));
      box.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + lean.toFixed(2) + 'deg)';
      raf = (on || Math.abs(dx) > .5) ? requestAnimationFrame(loop) : null;
    }

    function place(e){
      /* sits up and to the right of the pointer, kept on screen */
      var w = box.offsetWidth, h = box.offsetHeight;
      tx = Math.min(e.clientX + 28, window.innerWidth - w - 16);
      ty = Math.max(16, e.clientY - h - 18);
    }

    /* leaving a row waits a beat, so moving straight onto the next one
       glides the same box across instead of hiding and re-showing it */
    var hideT = null;

    rows.forEach(function(row){
      row.addEventListener('pointerenter', function(e){
        clearTimeout(hideT);
        img.src = row.dataset.peek;
        place(e);
        if(!on){ x = tx; y = ty; }      // first entry appears in place, then trails
        on = true;
        box.classList.add('is-on');
        if(!raf) raf = requestAnimationFrame(loop);
      });
      row.addEventListener('pointermove', place, {passive:true});
      row.addEventListener('pointerleave', function(){
        hideT = setTimeout(function(){
          on = false;
          box.classList.remove('is-on');
        }, 90);
      });
    });
  })();

  /* ============================================================
     01 — MarketIQ: the lead qualifier
     Pick a service and a budget, watch the WhatsApp message build.
     ============================================================ */
  (function qualifier(){
    var root = $('#demoQualify');
    if(!root) return;

    var out = $('#qualifyOut');
    var getService = chipGroup($('#qzService'), render);
    var getBudget  = chipGroup($('#qzBudget'),  render);

    function line(label, value, placeholder){
      return '<b>' + label + ':</b> ' +
        (value ? value : '<span class="ph">' + placeholder + '</span>');
    }

    function render(){
      var s = getService(), b = getBudget();
      out.innerHTML =
        '<b>New enquiry — MarketIQ Infotech</b>\n\n' +
        line('Service', s, 'pick one above') + '\n' +
        line('Monthly budget', b, 'pick one above') + '\n' +
        '<b>Source:</b> Website enquiry form\n' +
        '<b>Received:</b> ' + new Date().toLocaleString('en-IN', {
          day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'
        }) +
        (s && b
          ? '\n\n<span style="color:#8fd8c7">Ready to send — the sales team opens this with the budget already answered.</span>'
          : '');
    }
    render();
  })();

  /* ============================================================
     02 — Clans Machina: the solar savings calculator
     Deliberately simple and openly illustrative. The live site runs
     the client's own tariff and subsidy tables.
     ============================================================ */
  (function solar(){
    var slider = $('#billSlider');
    if(!slider) return;

    var TARIFF      = 8;     // ₹ per unit, round figure for the demo
    var SUN_HOURS   = 4;     // usable kWh per kW per day in Odisha
    var CO2_PER_KWH = 0.82;  // kg, Indian grid average

    /* Cost per kW falls as the system grows — scaffolding, inverter and
       labour don't double when the panel count does. */
    function costPerKw(kw){ return kw <= 2 ? 60000 : kw <= 5 ? 52000 : 46000; }

    /* Residential rooftop subsidy, capped and only up to 10 kW. It is a flat
       ceiling, so small systems recover a far larger share of their cost —
       which is why payback moves as you drag, instead of scaling flat. */
    function subsidy(kw){
      if(kw > 10) return 0;
      return Math.min(78000, kw >= 3 ? 78000 : Math.round(30000 * kw));
    }

    var elAmt   = $('#billAmt');
    var elSize  = $('#outSize');
    var elBack  = $('#outPayback');
    var elSave  = $('#outSave');
    var elCo2   = $('#outCo2');

    function inr(v){
      if(v >= 100000) return '₹' + (v/100000).toFixed(1) + ' L';
      return '₹' + Math.round(v).toLocaleString('en-IN');
    }

    function render(){
      var bill = parseInt(slider.value, 10);

      /* paint the filled part of the track (WebKit has no ::-moz-range-progress) */
      var pct = (bill - slider.min) / (slider.max - slider.min) * 100;
      slider.style.setProperty('--fill', pct + '%');

      var monthlyUnits = bill / TARIFF;
      var kw = Math.min(20, Math.max(1, Math.round((monthlyUnits / 30 / SUN_HOURS) * 2) / 2));

      var generatedUnits = kw * SUN_HOURS * 30;
      var monthlySaving  = Math.min(bill, generatedUnits * TARIFF);
      var yearlySaving   = monthlySaving * 12;
      var netCost        = kw * costPerKw(kw) - subsidy(kw);

      var payback = netCost / yearlySaving;
      var net25   = yearlySaving * 25 - netCost;
      var co2     = kw * SUN_HOURS * 365 * CO2_PER_KWH / 1000 * 25;

      elAmt.textContent  = '₹' + bill.toLocaleString('en-IN');
      put(elSize, kw.toFixed(1) + ' kW');
      put(elBack, payback.toFixed(1) + ' yrs');
      put(elSave, inr(net25));
      put(elCo2,  Math.round(co2) + ' t');
    }

    slider.addEventListener('input', render);
    render();
  })();

  /* ============================================================
     03 — Odisha Workforce: the dual-path split
     One site, two audiences, two inboxes.
     ============================================================ */
  (function dualPath(){
    var sw = $('#pathSwitch');
    if(!sw) return;

    var btns  = $$('.switch__btn', sw);
    var lanes = $$('[data-lane]');

    btns.forEach(function(b){
      b.addEventListener('click', function(){
        var want = b.dataset.path;
        btns.forEach(function(o){ o.setAttribute('aria-pressed', String(o === b)); });
        lanes.forEach(function(l){
          var on = l.dataset.lane === want;
          l.hidden = !on;
          if(on){
            l.classList.remove('is-swap');
            void l.offsetWidth;          // restart the entry animation
            l.classList.add('is-swap');
          }
        });
      });
    });
  })();

  /* ============================================================
     04 — Kamini Labs: the priced booking
     Tick tests, see the bill against the usual rate, and see what the
     front desk receives. Prices are the clinic's published ones.
     ============================================================ */
  (function labBooking(){
    var root = $('#labTests');
    if(!root) return;

    var chips = $$('.chip', root);
    var out = $('#labOut');
    var elCount = $('#labCount'), elPay = $('#labPay'), elSave = $('#labSave');

    function inr(v){ return '₹' + v.toLocaleString('en-IN'); }

    function render(){
      var on = chips.filter(function(c){ return c.getAttribute('aria-pressed') === 'true'; });
      var pay = 0, mrp = 0;
      on.forEach(function(c){ pay += +c.dataset.price; mrp += +c.dataset.mrp; });

      put(elCount, String(on.length));
      put(elPay,   inr(pay));
      put(elSave,  inr(mrp - pay));

      out.innerHTML =
        '<b>New booking — Kamini Clinic &amp; Labs</b>\n\n' +
        '<b>Needs:</b> ' + (on.length
          ? on.map(function(c){ return c.textContent.trim(); }).join(', ')
          : '<span class="ph">pick tests above</span>') + '\n' +
        '<b>Quoted:</b> ' + (on.length ? inr(pay) : '<span class="ph">—</span>') + '\n' +
        '<b>Collection:</b> Home, free\n' +
        '<b>Report:</b> WhatsApp + email' +
        (on.length
          ? '\n\n<span style="color:#8fd8c7">The callback skips "what did you need?" and goes straight to picking a time.</span>'
          : '');
    }

    chips.forEach(function(c){
      c.addEventListener('click', function(){
        c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true'));
        render();
      });
    });
    render();
  })();

  /* ============================================================
     Closing picker — turns "which of these is closest?" into a
     WhatsApp message that already says what they want.
     ============================================================ */
  (function picker(){
    var root = $('#picker');
    if(!root) return;

    var out = $('#pickerOut'), cta = $('#pickerCta');
    var LINES = {
      'Lead qualification': 'a site that qualifies enquiries before they reach me, like the MarketIQ build',
      'An interactive tool': 'a calculator or quote tool built into the site, like the Clans Machina build',
      'Two audiences': 'one site that serves two different audiences without mixing them up, like the Odisha Workforce build',
      'Priced booking': 'a booking flow that shows prices up front and tells me what the customer needs before I call, like the Kamini Labs build',
      'Something else': 'a custom website or app'
    };

    var get = chipGroup(root, render);

    /* A case study's "build me one" button arrives here with its case
       already picked, so the message is written before they look at it. */
    var chips = $$('.chip', root);
    $$('[data-pick]').forEach(function(a){
      a.addEventListener('click', function(){
        var want = a.dataset.pick;
        var chip = chips.filter(function(c){ return c.textContent.trim() === want; })[0];
        if(!chip) return;
        chip.click();
        chip.classList.remove('is-flash');
        void chip.offsetWidth;
        chip.classList.add('is-flash');
      });
    });

    function render(){
      var pick = get();
      var want = pick ? LINES[pick] : null;

      out.innerHTML = want
        ? 'Your message will read: <b>"Hi Aivoryx, I saw your work page. I need ' + want + '."</b>'
        : 'Pick the one closest to your situation and we\'ll open WhatsApp with it written out.';

      cta.setAttribute('href', AX.waLink(
        'Hi Aivoryx, I saw your work page. I need ' + (want || 'a custom website or app') + '.'
      ));
    }
    render();
  })();
});
