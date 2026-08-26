/* ============================================================
   MOTION — inertial scrolling, section choreography, scroll-linked media.

   Three independent pieces, each of which degrades to "nothing
   happens" rather than to "the page is broken":

   · smooth()  inertial wheel scrolling
   · stage()   fires each section's entrance once
   · deck()    depth for the stacked work cards
   · media()   screenshots that settle as they cross the viewport
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
      /* below the breakpoint the CSS puts the cards back in flow */
      if(window.innerWidth <= 900){
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
      return { el:g, kids:Array.prototype.slice.call(g.children) };
    });
    var ticking = false;

    function frame(){
      ticking = false;
      var vh = window.innerHeight;
      for(var s = 0; s < sets.length; s++){
        var set = sets[s];
        var r = set.el.getBoundingClientRect();
        if(r.bottom < -240 || r.top > vh + 240) continue;

        /* 0 as the block's top reaches 88% down the viewport, 1 once
           it has travelled its own height plus half a screen */
        var p = (vh * 0.88 - r.top) / (r.height + vh * 0.5);
        p = p < 0 ? 0 : p > 1 ? 1 : p;

        var n = set.kids.length;
        for(var i = 0; i < n; i++){
          /* each child waits its turn, then resolves over a third of
             the remaining travel — long enough to read as a cascade,
             short enough that the last is not still arriving as the
             block leaves the screen */
          var kp = (p - (i / n) * 0.55) / 0.32;
          kp = kp < 0 ? 0 : kp > 1 ? 1 : kp;
          set.kids[i].style.setProperty('--p', kp.toFixed(3));
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

  smooth();
  stage();
  deck();
  media();
  sequence();
  rail();
  creed();
});
