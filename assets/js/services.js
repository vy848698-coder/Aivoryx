/* ============================================================
   SERVICES PAGE — the scope builder.

   Everything a visitor picks turns into a running estimate and a
   WhatsApp message that already contains the spec. The numbers below
   are the only place pricing lives — edit them here, nowhere else.

   Bases match the homepage pricing tiers (₹7,999 / ₹24,999) so the
   two pages can never quietly disagree.
   ============================================================ */
AX.module(function services(){
  'use strict';
  var $ = AX.$, $$ = AX.$$, reduce = AX.reduce;

  var BASE = {
    site:   { label:'Business website', price:7999,  days:7,  covers:[] },
    store:  { label:'Online store',     price:24999, days:21, covers:['pay'] },
    webapp: { label:'Web application',  price:24999, days:28, covers:['login'] },
    app:    { label:'Mobile app',       price:24999, days:35, covers:['login'] }
  };

  /* A business website plus the first four comes to ₹14,299, so the quoted
     range brackets the ₹14,999 Growth tier from below — Growth also carries
     custom animation, lead qualification, speed tuning and 60 days of fixes,
     which is what the gap pays for. The gap is only ₹700 now that the tiers
     sit closer together, so re-check it before moving any add-on price. */
  var ADDON = {
    pages: { label:'More pages (6–12)',        price:2000, days:4 },
    cms:   { label:'Blog or CMS you can edit', price:1500, days:3 },
    tool:  { label:'Calculator or quote tool', price:2000, days:4 },
    seo:   { label:'SEO & analytics setup',    price:800,  days:1 },
    pay:   { label:'Payment gateway',          price:3000, days:4 },
    login: { label:'User logins & accounts',   price:5000, days:7 },
    ai:    { label:'AI chat assistant',        price:3500, days:5 }
  };

  /* How far above the base the top of the quoted range sits. 1.3 made even
     small builds look expensive; 1.18 keeps the spread honest. */
  var RANGE_TOP = 1.18;

  /* Where the three published tiers sit on the scale bar, as [rupees, %].
     The marker interpolates between them, so the graphic is anchored to the
     same numbers as the homepage rather than to an invented scale. */
  var ANCHORS = [[7999, 8], [14999, 40], [24999, 76], [50000, 97]];

  var root = $('#builder');
  if(!root) return;

  var baseBtns = $$('.chip', $('#buildBase'));
  var optBtns  = $$('.opt', $('#buildOpts'));
  var elSpec   = $('#quoteSpec');
  var elTotal  = $('#quoteTotal');
  var elTime   = $('#quoteTime');
  var elCta    = $('#quoteCta');
  var elTier   = $('#quoteTier');
  var elMark   = $('#quoteMark');
  var tierKeys = elTier ? $$('.tier__keys span', elTier) : [];

  function inr(v){ return '₹' + Math.round(v).toLocaleString('en-IN'); }
  function round1k(v){ return Math.round(v / 1000) * 1000; }

  function currentBase(){
    var on = baseBtns.filter(function(b){ return b.getAttribute('aria-pressed') === 'true'; })[0];
    return on ? on.dataset.base : null;
  }

  /* An add-on the chosen base already contains is shown as included and
     locked, rather than silently billed twice. */
  function syncCovered(baseKey){
    var covers = baseKey ? BASE[baseKey].covers : [];
    optBtns.forEach(function(o){
      var covered = covers.indexOf(o.dataset.opt) !== -1;
      var note = $('.opt__p', o);
      o.disabled = covered;
      if(covered){
        o.setAttribute('aria-pressed', 'true');
        note.textContent = 'Included in this build';
      } else {
        note.textContent = '+ ' + inr(ADDON[o.dataset.opt].price);
      }
    });
  }

  function chosenAddons(baseKey){
    var covers = baseKey ? BASE[baseKey].covers : [];
    return optBtns
      .filter(function(o){ return o.getAttribute('aria-pressed') === 'true'; })
      .map(function(o){ return o.dataset.opt; })
      .filter(function(k){ return covers.indexOf(k) === -1; });
  }

  /* ---------------- The total, counted rather than swapped ----------------
     A price that simply appears reads as a lookup. Rolling it makes the
     panel feel like it is doing the sum you just asked for. */
  var shownLow = 0, shownHigh = 0, raf = null;

  function paint(low, high, note){
    elTotal.innerHTML = inr(low) + ' &ndash; ' + inr(high) + '<small>' + note + '</small>';
  }

  function rollTo(low, high, note){
    var fromLow = shownLow, fromHigh = shownHigh;
    shownLow = low; shownHigh = high;

    /* a small nudge, so a change registers even when the figures barely move */
    elTotal.classList.remove('is-bump');
    void elTotal.offsetWidth;
    elTotal.classList.add('is-bump');

    if(reduce){ paint(low, high, note); return; }
    if(raf) cancelAnimationFrame(raf);

    var t0 = null, dur = 560;
    function step(now){
      if(t0 === null) t0 = now;
      var p = Math.min(1, (now - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      if(p < 1){
        /* round the in-between frames so the digits don't churn */
        paint(Math.round((fromLow + (low - fromLow) * e) / 100) * 100,
              Math.round((fromHigh + (high - fromHigh) * e) / 100) * 100, note);
        raf = requestAnimationFrame(step);
      } else {
        paint(low, high, note);
        raf = null;
      }
    }
    raf = requestAnimationFrame(step);
  }

  /* ---------------- Tier scale ---------------- */
  function tierPos(v){
    if(v <= ANCHORS[0][0]) return ANCHORS[0][1];
    for(var i = 1; i < ANCHORS.length; i++){
      var a = ANCHORS[i - 1], b = ANCHORS[i];
      if(v <= b[0]) return a[1] + (v - a[0]) / (b[0] - a[0]) * (b[1] - a[1]);
    }
    return ANCHORS[ANCHORS.length - 1][1];
  }

  function setTier(v){
    if(!elTier) return;
    if(v === null){
      elTier.classList.remove('is-set');
      tierKeys.forEach(function(k){ k.classList.remove('is-near'); });
      return;
    }
    var pos = tierPos(v);
    elTier.classList.add('is-set');
    elMark.style.left = pos.toFixed(1) + '%';

    /* light the tier this scope actually lands nearest to */
    var best = 0, bestGap = Infinity;
    tierKeys.forEach(function(k, i){
      var gap = Math.abs(parseFloat(k.style.left) - pos);
      if(gap < bestGap){ bestGap = gap; best = i; }
    });
    tierKeys.forEach(function(k, i){ k.classList.toggle('is-near', i === best); });
  }

  /* ---------------- Render ---------------- */
  function render(){
    var baseKey = currentBase();
    syncCovered(baseKey);

    if(!baseKey){
      elSpec.innerHTML = '<li class="empty">Pick what you\'re building and the estimate appears here — with the timeline, and a spec you can send us in one tap.</li>';
      elTotal.innerHTML = '&mdash;<small>Choose a build type to start</small>';
      elTime.textContent = '—';
      shownLow = shownHigh = 0;
      setTier(null);
      elCta.setAttribute('href', AX.waLink('Hi Aivoryx, I\'d like to discuss a project.'));
      return;
    }

    var base   = BASE[baseKey];
    var addons = chosenAddons(baseKey);

    var total = base.price;
    var days  = base.days;
    var rows  = ['<li><b>' + base.label + '</b><span>' + inr(base.price) + '</span></li>'];

    addons.forEach(function(k){
      total += ADDON[k].price;
      days  += ADDON[k].days;
      rows.push('<li>' + ADDON[k].label + '<span>+ ' + inr(ADDON[k].price) + '</span></li>');
    });

    var low   = round1k(total);
    var high  = round1k(total * RANGE_TOP);
    var weeks = Math.max(1, Math.ceil(days / 7));
    var when  = weeks === 1 ? 'about a week' : 'about ' + weeks + ' weeks';

    elSpec.innerHTML = rows.join('');
    rollTo(low, high, 'Indicative range &middot; negotiable &middot; confirmed after one call');
    elTime.textContent = when;
    setTier((low + high) / 2);

    var msg = 'Project scope — built on aivoryx.com\n\n' +
      'Building: ' + base.label + '\n' +
      (addons.length
        ? 'Add-ons:\n' + addons.map(function(k){ return '- ' + ADDON[k].label; }).join('\n') + '\n'
        : 'Add-ons: none\n') +
      '\nIndicative range: ' + inr(low) + ' – ' + inr(high) + '\n' +
      'Timeline: ' + when + '\n\nCan you confirm this?';

    elCta.setAttribute('href', AX.waLink(msg));
  }

  baseBtns.forEach(function(b){
    b.addEventListener('click', function(){
      baseBtns.forEach(function(o){ o.setAttribute('aria-pressed', String(o === b)); });
      render();
    });
  });

  optBtns.forEach(function(o){
    o.addEventListener('click', function(){
      if(o.disabled) return;
      o.setAttribute('aria-pressed', String(o.getAttribute('aria-pressed') !== 'true'));
      render();
    });
  });

  /* ---------------- The detail cards drive the builder ----------------
     Reading about a service and then scrolling back up to re-pick it by
     hand is friction for no reason. The card sets the scope itself. */
  function pickBase(key){
    baseBtns.forEach(function(o){ o.setAttribute('aria-pressed', String(o.dataset.base === key)); });
  }

  $$('[data-price-base]').forEach(function(btn){
    btn.addEventListener('click', function(){
      pickBase(btn.dataset.priceBase);
      render();
      if(AX.scrollToTarget) AX.scrollToTarget('#builder');
    });
  });

  /* The two add-ons can't be priced alone — they need something to sit on,
     so an untouched builder gets a website base underneath them. */
  $$('[data-price-opt]').forEach(function(btn){
    btn.addEventListener('click', function(){
      if(!currentBase()) pickBase('site');
      optBtns.forEach(function(o){
        if(o.dataset.opt === btn.dataset.priceOpt) o.setAttribute('aria-pressed', 'true');
      });
      render();
      if(AX.scrollToTarget) AX.scrollToTarget('#builder');
    });
  });

  render();
});
