/* ============================================================
   PRICING PAGE — the break-even chart.

   You tell it what you pay every month today; it draws the month
   our one-time build has cost you less, and what the gap is after
   five years. No competitor's price is assumed anywhere — the only
   monthly figure on the page is the one the visitor types in.

   Prices here must match services.js and the homepage tiers.
   ============================================================ */
AX.module(function pricing(){
  'use strict';
  var $ = AX.$, $$ = AX.$$, reduce = AX.reduce;

  var PLANS = {
    starter: { label:'Starter',       price:7999 },
    growth:  { label:'Growth',        price:14999 },
    custom:  { label:'Apps & stores', price:24999 }
  };

  /* Domain + hosting for a hand-coded site, paid to your host, not to us.
     Stated on the page as an assumption rather than buried in here. */
  var HOSTING_YR = 3000;
  var MONTHS = 60;
  var YEARS = 5;

  /* Two series, validated against the #060606 chart surface —
     see the note at the top of pricing.css before changing them. */
  var C_US = '#8052ff', C_THEM = '#c08a1e', SURFACE = '#060606';
  var SVGNS = 'http://www.w3.org/2000/svg';

  var root = $('#breakeven');
  if(!root) return;

  var slider  = $('#bevMonthly');
  var planBtns= $$('.chip', $('#bevPlan'));
  var elSpend = $('#bevSpend');
  var elVerdV = $('#bevVerdict');
  var elVerdD = $('#bevVerdictNote');
  var elOurs  = $('#bevOurs');
  var elTheirs= $('#bevTheirs');
  var elGap   = $('#bevGap');
  var elCta   = $('#bevCta');
  var plot    = $('#bevPlot');
  var svg     = $('#bevSvg');
  var yAxis   = $('#bevY');
  var xAxis   = $('#bevX');
  var endUs   = $('#bevEndUs');
  var endThem = $('#bevEndThem');
  var cross   = $('#bevCross');
  var tip     = $('#bevTip');
  var tbody   = $('#bevTbody');

  /* ---------------- Money ---------------- */
  function inr(v){ return '₹' + Math.round(v).toLocaleString('en-IN'); }

  /* Short axis money, in the way Indian readers actually write it */
  function inrShort(v){
    if(v >= 100000) return '₹' + (v / 100000).toFixed(v % 100000 === 0 ? 0 : 1) + 'L';
    if(v >= 1000)   return '₹' + Math.round(v / 1000) + 'k';
    return '₹' + v;
  }

  function months(n){
    if(n < 12) return n + ' month' + (n === 1 ? '' : 's');
    var y = Math.floor(n / 12), m = n % 12;
    return y + ' year' + (y === 1 ? '' : 's') + (m ? ' ' + m + ' month' + (m === 1 ? '' : 's') : '');
  }

  /* ---------------- The two cost curves ---------------- */
  function planKey(){
    var on = planBtns.filter(function(b){ return b.getAttribute('aria-pressed') === 'true'; })[0];
    return on ? on.dataset.plan : 'growth';
  }

  /* Hosting is billed yearly and capped at the five years we chart, so the
     totals here are the same ones quoted in the package cards. */
  function ours(m, price){
    return price + HOSTING_YR * Math.min(YEARS, Math.floor(m / 12) + 1);
  }
  function theirs(m, monthly){ return monthly * m; }

  /* First month their running total has passed ours. Looked for well past
     the charted five years so a low monthly spend gets an honest answer
     rather than a shrug. */
  function crossover(price, monthly){
    if(monthly <= 0) return null;
    for(var m = 1; m <= 240; m++){
      if(theirs(m, monthly) >= ours(m, price)) return m;
    }
    return null;
  }

  function niceMax(v){
    if(v <= 0) return 10000;
    var pow = Math.pow(10, Math.floor(Math.log10(v)));
    var steps = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    for(var i = 0; i < steps.length; i++){
      if(steps[i] * pow >= v) return steps[i] * pow;
    }
    return 10 * pow;
  }

  /* ---------------- Chart ---------------- */
  var PAD_T = 16, PAD_B = 8;
  var geo = null;                          /* last drawn geometry, for hover */

  /* right gutter holds the end labels — narrower on a phone, where giving
     84px to labels would leave the plot itself squeezed */
  function padRight(w){ return w < 380 ? 60 : 84; }

  function el(name, attrs){
    var n = document.createElementNS(SVGNS, name);
    for(var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function draw(){
    var price = PLANS[planKey()].price;
    var monthly = parseInt(slider.value, 10) || 0;

    var w = plot.clientWidth, h = plot.clientHeight;
    if(!w || !h) return;

    var x1 = w - padRight(w);
    var top = ours(MONTHS, price);
    var max = niceMax(Math.max(top, theirs(MONTHS, monthly), 1));

    function X(m){ return x1 * (m / MONTHS); }
    function Y(v){ return (h - PAD_B) - (v / max) * (h - PAD_B - PAD_T); }

    geo = { price:price, monthly:monthly, X:X, Y:Y, x1:x1, h:h };

    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    while(svg.firstChild) svg.removeChild(svg.firstChild);

    /* hairline grid, one step off the surface, solid and recessive */
    var lines = [];
    for(var g = 0; g <= 4; g++){
      var gv = max * g / 4, gy = Y(gv);
      svg.appendChild(el('line', {
        x1:0, y1:gy, x2:w, y2:gy,
        stroke:'rgba(255,255,255,.07)', 'stroke-width':1
      }));
      lines.push({ v:gv, y:gy });
    }

    yAxis.innerHTML = lines.map(function(l){
      return '<span style="top:' + l.y + 'px">' + inrShort(l.v) + '</span>';
    }).join('');

    /* six ticks need roughly 46px each; below that they collide, so drop to
       every other year rather than letting the labels run together */
    var ticks = (x1 / 6) >= 46 ? [0, 12, 24, 36, 48, 60] : [0, 24, 60];
    xAxis.innerHTML = ticks.map(function(m){
      return '<span style="left:' + X(m) + 'px">' + (m === 0 ? 'Today' : 'Yr ' + (m / 12)) + '</span>';
    }).join('');

    /* the gap after the crossover is the saving — so it is the only fill */
    var cm = crossover(price, monthly);
    if(cm !== null && cm < MONTHS){
      var up = [], down = [];
      for(var m = cm; m <= MONTHS; m++){
        up.push(X(m) + ',' + Y(theirs(m, monthly)));
        down.unshift(X(m) + ',' + Y(ours(m, price)));
      }
      svg.appendChild(el('polygon', {
        points: up.concat(down).join(' '),
        fill: C_US, 'fill-opacity': .1
      }));
    }

    function path(fn){
      var d = '';
      for(var m = 0; m <= MONTHS; m++) d += (m ? 'L' : 'M') + X(m) + ',' + Y(fn(m));
      return d;
    }

    svg.appendChild(el('path', {
      d: path(function(m){ return theirs(m, monthly); }),
      fill:'none', stroke:C_THEM, 'stroke-width':2,
      'stroke-linejoin':'round', 'stroke-linecap':'round'
    }));
    svg.appendChild(el('path', {
      d: path(function(m){ return ours(m, price); }),
      fill:'none', stroke:C_US, 'stroke-width':2,
      'stroke-linejoin':'round', 'stroke-linecap':'round'
    }));

    /* crossover: a recessive drop line plus a ringed dot */
    if(cm !== null && cm <= MONTHS){
      var cx = X(cm), cy = Y(ours(cm, price));
      svg.appendChild(el('line', {
        x1:cx, y1:cy, x2:cx, y2:h - PAD_B,
        stroke:'rgba(255,184,41,.35)', 'stroke-width':1
      }));
      svg.appendChild(el('circle', {
        cx:cx, cy:cy, r:4.5, fill:'#ffb829', stroke:SURFACE, 'stroke-width':2
      }));
      /* the pill is centred on its left edge (translateX(-50%)), so it has to
         be clamped by its own half-width — a flat 52px let it hang off the
         plot and sit on top of the y-axis labels on narrow screens */
      cross.hidden = false;
      /* the long form does not fit beside the y-axis on a small phone */
      cross.textContent = x1 < 260 ? 'Ahead from here' : 'You\'re ahead from here';
      var half = cross.offsetWidth / 2;
      cross.style.left = Math.min(x1 - half, Math.max(half, cx)) + 'px';
      cross.style.top = Math.max(0, cy - 34) + 'px';
    } else {
      cross.hidden = true;
    }

    /* end markers carry a 2px surface ring so they stay legible on the line */
    [[theirs(MONTHS, monthly), C_THEM], [ours(MONTHS, price), C_US]].forEach(function(s){
      svg.appendChild(el('circle', {
        cx:x1, cy:Y(s[0]), r:4.5, fill:s[1], stroke:SURFACE, 'stroke-width':2
      }));
    });

    /* direct labels at the line ends, nudged apart if they converge */
    var yU = Y(ours(MONTHS, price)), yT = Y(theirs(MONTHS, monthly));
    if(Math.abs(yU - yT) < 40){
      var mid = (yU + yT) / 2;
      if(yU <= yT){ yU = mid - 20; yT = mid + 20; }
      else { yU = mid + 20; yT = mid - 20; }
    }
    endUs.style.top = Math.max(16, Math.min(h - 16, yU)) + 'px';
    endThem.style.top = Math.max(16, Math.min(h - 16, yT)) + 'px';
    endUs.innerHTML = '<b>' + inr(ours(MONTHS, price)) + '</b>With us';
    endThem.innerHTML = '<b>' + inr(theirs(MONTHS, monthly)) + '</b>Staying put';
  }

  /* ---------------- Hover readout ---------------- */
  function hover(e){
    if(!geo) return;
    var r = plot.getBoundingClientRect();
    var px = e.clientX - r.left;
    var m = Math.round((px / geo.x1) * MONTHS);
    m = Math.max(0, Math.min(MONTHS, m));

    var vu = ours(m, geo.price), vt = theirs(m, geo.monthly);
    var old = $('#bevHover');
    if(old) old.parentNode.removeChild(old);

    var g = el('g', { id:'bevHover' });
    g.appendChild(el('line', {
      x1:geo.X(m), y1:PAD_T - 8, x2:geo.X(m), y2:geo.h - PAD_B,
      stroke:'rgba(255,255,255,.22)', 'stroke-width':1
    }));
    g.appendChild(el('circle', { cx:geo.X(m), cy:geo.Y(vt), r:4.5, fill:C_THEM, stroke:SURFACE, 'stroke-width':2 }));
    g.appendChild(el('circle', { cx:geo.X(m), cy:geo.Y(vu), r:4.5, fill:C_US,   stroke:SURFACE, 'stroke-width':2 }));
    svg.appendChild(g);

    tip.innerHTML =
      '<span class="tip__m">' + (m === 0 ? 'Today' : months(m) + ' in') + '</span>' +
      '<span class="tip__r" style="--k:' + C_US + '"><i></i>With us<b>' + inr(vu) + '</b></span>' +
      '<span class="tip__r" style="--k:' + C_THEM + '"><i></i>Staying put<b>' + inr(vt) + '</b></span>';
    tip.classList.add('is-on');

    var tw = tip.offsetWidth;
    tip.style.left = Math.max(0, Math.min(plot.clientWidth - tw, geo.X(m) - tw / 2)) + 'px';
    tip.style.top = Math.max(0, Math.min(geo.Y(vu), geo.Y(vt)) - tip.offsetHeight - 14) + 'px';
  }

  function unhover(){
    tip.classList.remove('is-on');
    var old = $('#bevHover');
    if(old) old.parentNode.removeChild(old);
  }

  plot.addEventListener('pointermove', hover);
  plot.addEventListener('pointerleave', unhover);

  /* ---------------- Everything else on the panel ---------------- */
  function render(){
    var key = planKey(), plan = PLANS[key];
    var monthly = parseInt(slider.value, 10) || 0;

    slider.style.setProperty('--fill', (monthly / parseInt(slider.max, 10) * 100) + '%');
    elSpend.innerHTML = inr(monthly) + '<small>a month, today</small>';

    var us = ours(MONTHS, plan.price), them = theirs(MONTHS, monthly);
    var cm = crossover(plan.price, monthly);

    elOurs.textContent = inr(us);
    elTheirs.textContent = inr(them);
    elGap.textContent = (them > us ? inr(them - us) : inr(us - them));
    $('#bevGapK').textContent = them > us ? 'Five-year difference, in your pocket' : 'Five-year difference, against you';

    if(monthly <= 0){
      elVerdV.textContent = 'Nothing to beat';
      elVerdD.textContent = 'You\'re not paying anyone monthly right now, so there is no break-even to find. The build is ' +
        inr(plan.price) + ', once, and then it stops.';
    } else if(cm === null){
      elVerdV.textContent = 'Longer than 20 years';
      elVerdD.textContent = 'At ' + inr(monthly) + ' a month, staying exactly where you are is genuinely cheaper. ' +
        'We\'d tell you that on the call too — rebuild when the site starts costing you leads, not before.';
    } else if(cm > MONTHS){
      elVerdV.textContent = months(cm);
      elVerdD.textContent = 'Longer than the five years charted below. At ' + inr(monthly) +
        ' a month the maths is close, so the honest answer is that this is a decision about the site, not the money.';
    } else {
      elVerdV.textContent = 'Month ' + cm;
      elVerdD.textContent = 'From month ' + cm + ' — ' + months(cm) + ' in — you have spent less by building it once. ' +
        'Every month after that, the gap widens by ' + inr(monthly) + '.';
    }

    /* the chart's numbers, written out for anyone who'd rather read them */
    var rows = '';
    for(var y = 1; y <= YEARS; y++){
      var m = y * 12;
      var a = ours(m, plan.price), b = theirs(m, monthly);
      rows += '<tr><td>Year ' + y + '</td><td>' + inr(a) + '</td><td>' + inr(b) + '</td><td>' +
              (b >= a ? '+' + inr(b - a) : '−' + inr(a - b)) + '</td></tr>';
    }
    tbody.innerHTML = rows;

    elCta.setAttribute('href', AX.waLink(
      'Hi Aivoryx — I ran the numbers on your pricing page.\n\n' +
      'Plan: ' + plan.label + ' (' + inr(plan.price) + ')\n' +
      'What I pay monthly today: ' + inr(monthly) + '\n' +
      (cm && cm <= MONTHS ? 'Break-even: month ' + cm + '\n' : '') +
      'Five years with you: ' + inr(us) + '\n' +
      'Five years as I am: ' + inr(them) + '\n\nCan we talk it through?'
    ));

    draw();
  }

  planBtns.forEach(function(b){
    b.addEventListener('click', function(){
      planBtns.forEach(function(o){ o.setAttribute('aria-pressed', String(o === b)); });
      render();
    });
  });
  slider.addEventListener('input', render);

  /* the chart is measured in device pixels, so it has to be redrawn on resize */
  var pending = false;
  window.addEventListener('resize', function(){
    if(pending) return;
    pending = true;
    requestAnimationFrame(function(){ pending = false; unhover(); draw(); });
  });

  render();
  /* fonts settling can change the plot box by a pixel or two */
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
});
