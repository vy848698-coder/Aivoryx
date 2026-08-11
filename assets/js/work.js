/* ============================================================
   WORK PAGE — the three live demos.
   Each one rebuilds the mechanism that made its project worth
   doing, so a visitor can use it instead of reading about it.
   ============================================================ */
AX.module(function work(){
  'use strict';
  var $ = AX.$, $$ = AX.$$;

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
      elSize.textContent = kw.toFixed(1) + ' kW';
      elBack.textContent = payback.toFixed(1) + ' yrs';
      elSave.textContent = inr(net25);
      elCo2.textContent  = Math.round(co2) + ' t';
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
      'Two audiences': 'one site that serves two different audiences without mixing them up',
      'Something else': 'a custom website or app'
    };

    var get = chipGroup(root, render);

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
