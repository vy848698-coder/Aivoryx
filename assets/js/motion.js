/* ============================================================
   MOTION — inertial scrolling, section choreography, scroll-linked media.

   Three independent pieces, each of which degrades to "nothing
   happens" rather than to "the page is broken":

   · smooth()  inertial wheel scrolling
   · stage()   fires each section's entrance once
   · deck()    depth for the stacked work cards
   · media()   screenshots that settle as they cross the viewport
   · opener()  case studies that open from a card to full width
   · track()   a reading line that fills as a story is read
   ============================================================ */
AX.module(function motion(){
  'use strict';
  var $$ = AX.$$;
  if(!window.requestAnimationFrame) return;

  var reduce = AX.reduce;
  var coarse = window.matchMedia('(pointer:coarse)').matches;

  /* ============================================================
     Smooth scroll
     Lerps the real scroll position with window.scrollTo instead of
     transforming a wrapper. Transform-based scrollers break
     position:sticky — which the work deck is built on — along with
     position:fixed, find-in-page and the native scrollbar. Driving
     the native position keeps all of it, and hands nav.js's progress
     bar, scroll spy and parallax a scroll event every frame, so they
     got smoother without being touched.
     ============================================================ */
  function smooth(){
    if(reduce || coarse) return;

    var target = window.pageYOffset;
    var pos = target;
    var running = false;
    var lastY = Math.round(pos);

    /* .115 lands a wheel notch in ~450ms. Below about .08 the page
       starts feeling like it is resisting the reader. */
    var EASE = 0.115;

    function maxY(){
      return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    }
    function write(y){ lastY = Math.round(y); window.scrollTo(0, lastY); }

    function loop(){
      var diff = target - pos;
      if(Math.abs(diff) < 0.4){ pos = target; write(pos); running = false; return; }
      pos += diff * EASE;
      write(pos);
      requestAnimationFrame(loop);
    }
    function kick(){ if(!running){ running = true; requestAnimationFrame(loop); } }

    window.addEventListener('wheel', function(e){
      if(e.ctrlKey) return;                                 /* pinch-zoom */
      if(Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;   /* sideways   */
      if(e.deltaY === 0) return;
      var d = e.deltaY;
      if(e.deltaMode === 1)      d *= 22;                   /* lines */
      else if(e.deltaMode === 2) d *= window.innerHeight;   /* pages */
      e.preventDefault();
      target = Math.max(0, Math.min(target + d, maxY()));
      kick();
    }, {passive:false});

    /* Anything that moved the page without us — scrollbar, keyboard,
       nav.js animating to an anchor, find-in-page — becomes the truth.
       The lastY test stops our own writes being read back as input. */
    window.addEventListener('scroll', function(){
      if(running) return;
      if(Math.abs(window.pageYOffset - lastY) < 2) return;
      target = pos = window.pageYOffset;
      lastY = Math.round(pos);
    }, {passive:true});

    window.addEventListener('resize', function(){
      target = pos = window.pageYOffset;
      lastY = Math.round(pos);
    });

    document.documentElement.classList.add('has-smooth');
  }

  /* ============================================================
     Section entrances
     One observer, fired once per section. The variant lives in the
     markup as data-sect so the choreography can be re-ordered
     without touching this file.
     ============================================================ */
  function stage(){
    var sections = $$('[data-sect]');
    if(!sections.length) return;

    if(reduce || !window.IntersectionObserver){
      sections.forEach(function(s){ s.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, {threshold:0.08, rootMargin:'0px 0px -12% 0px'});

    sections.forEach(function(s){
      /* A section already in view on load should not animate in from
         nowhere while the reader is looking straight at it. */
      if(s.getBoundingClientRect().top < window.innerHeight * 0.85){
        s.classList.add('is-in');
        return;
      }
      io.observe(s);
    });
  }

  /* ============================================================
     The work deck
     Sticky alone stacks the cards; it does not make the pile look
     like a pile. Each buried card scales back and dims in proportion
     to how far the card above has covered it.
     ============================================================ */
  function deck(){
    var cards = $$('[data-sect="stack"] .work__item');
    if(cards.length < 2 || reduce) return;

    var ticking = false;

    function frame(){
      ticking = false;
      /* The CSS decides when the deck is a deck — narrow screens and very
         short ones put the cards back in flow — so ask it rather than
         keeping a second copy of the breakpoints here. */
      if(getComputedStyle(cards[0]).position !== 'sticky'){
        cards.forEach(function(c){ c.style.transform = ''; c.style.opacity = ''; });
        return;
      }
      for(var i = 0; i < cards.length - 1; i++){
        var here = cards[i].getBoundingClientRect();
        var next = cards[i + 1].getBoundingClientRect();

        /* 0 while the next card is still below, 1 once it has fully
           covered this one */
        var travel = here.height || 1;
        var p = 1 - Math.min(1, Math.max(0, (next.top - here.top) / travel));

        cards[i].style.transform = 'scale(' + (1 - p * 0.05).toFixed(4) + ')';
        cards[i].style.opacity   = (1 - p * 0.35).toFixed(3);
      }
      var last = cards[cards.length - 1];
      last.style.transform = '';
      last.style.opacity = '';
    }

    window.addEventListener('scroll', function(){
      if(!ticking){ ticking = true; requestAnimationFrame(frame); }
    }, {passive:true});
    window.addEventListener('resize', function(){ requestAnimationFrame(frame); });
    frame();
  }

  /* ============================================================
     Scroll-linked media
     A screenshot that fades in has arrived. One still settling as
     you pass reads as depth — the difference the reference site
     trades on. Oversized inside a clipping frame, easing to rest.
     ============================================================ */
  function media(){
    var shots = $$('[data-media]');
    if(!shots.length || reduce) return;

    var ticking = false;

    function frame(){
      ticking = false;
      var vh = window.innerHeight;
      for(var i = 0; i < shots.length; i++){
        var el = shots[i];
        var r = el.getBoundingClientRect();
        if(r.bottom < -120 || r.top > vh + 120) continue;

        var p = (vh - r.top) / (vh + r.height);   /* 0 entering, 1 leaving */
        p = p < 0 ? 0 : p > 1 ? 1 : p;

        var zoom  = 1.05 - 0.05 * Math.min(1, p * 2);
        var drift = (p - 0.5) * 24;
        el.style.transform =
          'translate3d(0,' + drift.toFixed(2) + 'px,0) scale(' + zoom.toFixed(4) + ')';
      }
    }

    window.addEventListener('scroll', function(){
      if(!ticking){ ticking = true; requestAnimationFrame(frame); }
    }, {passive:true});
    window.addEventListener('resize', function(){ requestAnimationFrame(frame); });
    frame();
  }

  /* ============================================================
     Sequence
     The difference between "the section animated" and "the section
     is animating". Children of [data-seq] are driven by a --p that
     tracks scroll position continuously, each offset behind the
     last, so a block resolves as you travel through it instead of
     firing once at its threshold and going inert.
     ============================================================ */
  function sequence(){
    var groups = $$('[data-seq]');
    if(!groups.length) return;

    if(reduce){
      groups.forEach(function(g){
        for(var i = 0; i < g.children.length; i++){
          g.children[i].style.setProperty('--p', 1);
        }
      });
      return;
    }

    var sets = groups.map(function(g){
      return { el:g, kids:Array.prototype.slice.call(g.children), at:[] };
    });
    var ticking = false;

    /* Each child is driven by where IT is, not by how far the group has
       travelled. Splitting the group's progress by index only worked
       while the children sat side by side: once a grid collapses to one
       column on a phone, the fourth card was still tilted and drifting
       when it reached the top of the screen. Offsets ignore transforms,
       so the moving children never feed back into their own position. */
    function measure(){
      sets.forEach(function(set){
        var g = set.el, w = g.clientWidth || 1;
        set.at = set.kids.map(function(k){
          var own = k.offsetParent === g;
          var top  = k.offsetTop  - (own ? 0 : g.offsetTop);
          var left = k.offsetLeft - (own ? 0 : g.offsetLeft);
          return { top:top, col:Math.max(0, Math.min(1, left / w)) };
        });
      });
    }

    function frame(){
      ticking = false;
      var vh = window.innerHeight;
      for(var s = 0; s < sets.length; s++){
        var set = sets[s];
        var r = set.el.getBoundingClientRect();
        if(r.bottom < -240 || r.top > vh + 240) continue;

        for(var i = 0; i < set.kids.length; i++){
          var at = set.at[i];
          if(!at) continue;
          /* 0 as the child's top reaches 92% down the screen, 1 by the
             middle. Children further right start a little later, so a
             row still lands left to right as one cascade. */
          var top = r.top + at.top + at.col * vh * 0.14;
          var kp = (vh * 0.92 - top) / (vh * 0.42);
          kp = kp < 0 ? 0 : kp > 1 ? 1 : kp;
          set.kids[i].style.setProperty('--p', kp.toFixed(3));
        }
      }
    }

    function refresh(){ measure(); frame(); }

    window.addEventListener('scroll', function(){
      if(!ticking){ ticking = true; requestAnimationFrame(frame); }
    }, {passive:true});
    window.addEventListener('resize', function(){ requestAnimationFrame(refresh); });
    /* fonts and lazy images both move things after the first measure */
    window.addEventListener('load', refresh);
    if(window.ResizeObserver){
      var ro = new ResizeObserver(function(){ requestAnimationFrame(refresh); });
      sets.forEach(function(set){ ro.observe(set.el); });
    }
    refresh();
  }

  /* ============================================================
     Rail
     The process steps stop being a four-column grid and become a
     track that travels sideways while the section is pinned, so
     vertical scrolling drives horizontal movement and the sequence
     is read as a sequence. Each step brightens as it nears the
     middle of the screen, which is what keeps it from feeling like
     a slideshow on a timer.
     ============================================================ */
  function rail(){
    var rails = $$('[data-rail]');
    if(!rails.length) return;

    var ticking = false;

    function frame(){
      ticking = false;
      var vw = window.innerWidth, vh = window.innerHeight;

      for(var i = 0; i < rails.length; i++){
        var wrap  = rails[i];
        var pin   = wrap.querySelector('.rail__pin');
        var track = wrap.querySelector('.rail__track');
        var bar   = wrap.querySelector('.rail__prog i');
        if(!pin || !track) continue;

        /* below the breakpoint the CSS unpins and stacks it */
        if(vw <= 900 || reduce){ track.style.transform = ''; continue; }

        var r = wrap.getBoundingClientRect();
        if(r.bottom < -200 || r.top > vh + 200) continue;

        var travel = wrap.offsetHeight - pin.offsetHeight;
        var p = travel > 0 ? (-r.top) / travel : 0;
        p = p < 0 ? 0 : p > 1 ? 1 : p;

        var dist = Math.max(0, track.scrollWidth - pin.clientWidth);
        track.style.transform = 'translate3d(' + (-p * dist).toFixed(1) + 'px,0,0)';
        if(bar) bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';

        var steps = track.children;
        for(var j = 0; j < steps.length; j++){
          var sr = steps[j].getBoundingClientRect();
          var d  = Math.abs((sr.left + sr.width / 2) - vw / 2) / vw;
          steps[j].style.setProperty('--a', (0.3 + (1 - Math.min(1, d * 1.5)) * 0.7).toFixed(3));
        }
      }
    }

    window.addEventListener('scroll', function(){
      if(!ticking){ ticking = true; requestAnimationFrame(frame); }
    }, {passive:true});
    window.addEventListener('resize', function(){ requestAnimationFrame(frame); });
    frame();
  }

  /* ============================================================
     Creed
     Four claims sharing one pinned screen. Scroll position decides
     which is showing; the rest stay clipped. The index number and
     the progress line are driven from that same number, so they
     can never disagree with what is on screen.
     ============================================================ */
  function creed(){
    var wraps = $$('[data-creed]');
    if(!wraps.length) return;

    var ticking = false;

    function frame(){
      ticking = false;
      var vh = window.innerHeight;

      for(var w = 0; w < wraps.length; w++){
        var wrap  = wraps[w];
        var pin   = wrap.querySelector('.creed__pin');
        var items = wrap.querySelectorAll('.creed__item');
        var bar   = wrap.querySelector('.creed__prog i');
        var num   = wrap.querySelector('[data-creed-n]');
        if(!pin || !items.length) continue;

        /* the CSS unpins and stacks it below the breakpoint */
        if(window.innerWidth <= 900 || reduce){
          for(var k = 0; k < items.length; k++) items[k].classList.add('is-on');
          continue;
        }

        var r = wrap.getBoundingClientRect();
        if(r.bottom < -200 || r.top > vh + 200) continue;

        var travel = wrap.offsetHeight - pin.offsetHeight;
        var p = travel > 0 ? (-r.top) / travel : 0;
        p = p < 0 ? 0 : p > 1 ? 1 : p;

        /* pulled just inside the last band so the fourth claim is
           still on screen as the section releases */
        var i = Math.min(items.length - 1, Math.floor(p * items.length * 0.999));
        for(var j = 0; j < items.length; j++){
          items[j].classList.toggle('is-on', j === i);
        }
        if(bar) bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
        if(num) num.textContent = '0' + (i + 1);
      }
    }

    window.addEventListener('scroll', function(){
      if(!ticking){ ticking = true; requestAnimationFrame(frame); }
    }, {passive:true});
    window.addEventListener('resize', function(){ requestAnimationFrame(frame); });
    frame();
  }

  /* ============================================================
     Opener
     A case study that arrives as a small card and opens to the full
     width of the screen while its section is pinned. Publishes two
     numbers on the wrapper: --p, raw travel through the pin, and --e,
     the eased opening, which finishes at three quarters of the travel
     so the open state holds long enough to be looked at. The CSS
     decides what each of them moves.
     ============================================================ */
  function opener(){
    var wraps = $$('[data-open]');
    if(!wraps.length) return;

    function settle(w){ w.style.setProperty('--p', 1); w.style.setProperty('--e', 1); }
    if(reduce){ wraps.forEach(settle); return; }

    var ticking = false;

    function frame(){
      ticking = false;
      var vh = window.innerHeight;

      for(var i = 0; i < wraps.length; i++){
        var wrap = wraps[i];
        /* below the breakpoint the CSS unpins it and shows it open */
        if(window.innerWidth <= 900){ settle(wrap); continue; }

        var pin = wrap.firstElementChild;
        var r = wrap.getBoundingClientRect();
        if(r.bottom < -200 || r.top > vh + 200) continue;

        /* starts a third of a screen before the pin engages, so the
           card is already moving as it reaches the top */
        var lead = vh * 0.35;
        var travel = wrap.offsetHeight - pin.offsetHeight + lead;
        var p = travel > 0 ? (lead - r.top) / travel : 1;
        p = p < 0 ? 0 : p > 1 ? 1 : p;

        var t = Math.min(1, p / 0.75);
        var e = 1 - Math.pow(1 - t, 3);

        wrap.style.setProperty('--p', p.toFixed(4));
        wrap.style.setProperty('--e', e.toFixed(4));
      }
    }

    window.addEventListener('scroll', function(){
      if(!ticking){ ticking = true; requestAnimationFrame(frame); }
    }, {passive:true});
    window.addEventListener('resize', function(){ requestAnimationFrame(frame); });
    frame();
  }

  /* ============================================================
     Track
     A reading line. --p on [data-track] runs 0→1 as the block passes
     a line 60% down the screen, and every [data-mark] inside it is lit
     once it has crossed the same line — so the fill and the markers
     can never disagree about where the reader is.
     ============================================================ */
  function track(){
    var tracks = $$('[data-track]');
    if(!tracks.length) return;

    var sets = tracks.map(function(t){ return { el:t, marks:$$('[data-mark]', t) }; });

    if(reduce){
      sets.forEach(function(s){
        s.el.style.setProperty('--p', 1);
        s.marks.forEach(function(m){ m.classList.add('is-lit'); });
      });
      return;
    }

    var ticking = false;

    function frame(){
      ticking = false;
      var vh = window.innerHeight, line = vh * 0.6;
      for(var i = 0; i < sets.length; i++){
        var r = sets[i].el.getBoundingClientRect();
        if(r.bottom < -200 || r.top > vh + 200) continue;

        var p = (line - r.top) / (r.height || 1);
        p = p < 0 ? 0 : p > 1 ? 1 : p;
        sets[i].el.style.setProperty('--p', p.toFixed(4));

        for(var j = 0; j < sets[i].marks.length; j++){
          var m = sets[i].marks[j];
          m.classList.toggle('is-lit', m.getBoundingClientRect().top < line);
        }
      }
    }

    window.addEventListener('scroll', function(){
      if(!ticking){ ticking = true; requestAnimationFrame(frame); }
    }, {passive:true});
    window.addEventListener('resize', function(){ requestAnimationFrame(frame); });
    frame();
  }

  smooth();
  stage();
  deck();
  media();
  sequence();
  rail();
  creed();
  opener();
  track();
});
