/* ============================================================
   Navigation + the single scroll loop.
   Smooth anchor scrolling · sticky nav · sliding pill · scroll spy
   · progress bar · floating WhatsApp · parallax visuals
   ============================================================ */
AX.module(function nav(){
  'use strict';
  var $ = AX.$, $$ = AX.$$, reduce = AX.reduce;

  var NAV_OFFSET = 84;
  var nav = $('#nav'), burger = $('#burger'), navLinks = $('#navLinks'), pill = $('#navPill');
  var progress = $('#progress'), wa = $('#waFloat');
  var links = $$('.nav__link');
  var parallaxEls = $$('[data-parallax]');

  /* On sub-pages the nav points at index.html#foo, which is not a valid
     selector — only resolve true in-page anchors. */
  var sections = links.map(function(l){
    var href = l.getAttribute('href') || '';
    return href.charAt(0) === '#' ? document.querySelector(href) : null;
  });

  /* A page that marks its own nav link with aria-current keeps that link lit
     for the whole visit. Without this, sub-pages carrying a single in-page
     anchor (#talk) would hand the highlight to Contact half way down. */
  var pinned = links.some(function(l){ return l.hasAttribute('aria-current'); });
  var hasSpy = !pinned && sections.some(Boolean);

  /* ---------------- Smooth scrolling with a fixed-nav offset ---------------- */
  function easeInOutCubic(t){ return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }

  function scrollToTarget(hash){
    var el = hash === '#top' ? document.body : document.querySelector(hash);
    if(!el) return;
    var end = hash === '#top' ? 0 : el.getBoundingClientRect().top + window.pageYOffset - NAV_OFFSET;
    end = Math.max(0, Math.min(end, document.documentElement.scrollHeight - window.innerHeight));

    if(reduce){ window.scrollTo(0, end); return; }

    var start = window.pageYOffset, dist = end - start;
    var dur = Math.min(1250, Math.max(520, Math.abs(dist) * 0.55));
    var t0 = null;
    function step(now){
      if(t0 === null) t0 = now;
      var p = Math.min(1, (now - t0) / dur);
      window.scrollTo(0, start + dist * easeInOutCubic(p));
      if(p < 1) requestAnimationFrame(step);
      else history.replaceState(null, '', hash === '#top' ? location.pathname : hash);
    }
    requestAnimationFrame(step);
  }
  AX.scrollToTarget = scrollToTarget;

  $$('[data-scroll]').forEach(function(a){
    a.addEventListener('click', function(e){
      var hash = a.getAttribute('href');
      if(!hash || hash.charAt(0) !== '#') return;
      e.preventDefault();
      closeMenu();
      scrollToTarget(hash);
    });
  });

  /* ---------------- Sliding pill + active link ---------------- */
  function movePill(el){
    /* 1024 matches the CSS: below it the links live in the burger menu */
    if(!el || window.innerWidth <= 1024){ pill.style.opacity = 0; return; }
    pill.style.width = el.offsetWidth + 'px';
    pill.style.transform = 'translateX(' + el.offsetLeft + 'px)';
    pill.style.opacity = 1;
  }
  function activePill(){ movePill($('.nav__link.is-active')); }

  navLinks.addEventListener('mouseover', function(e){
    if(e.target.classList.contains('nav__link')) movePill(e.target);
  });
  navLinks.addEventListener('mouseleave', activePill);

  var lastActive = -2;
  function setActive(i){
    if(i === lastActive) return;
    lastActive = i;
    links.forEach(function(l,n){ l.classList.toggle('is-active', n === i); });
    activePill();
  }

  /* ---------------- Mobile menu ---------------- */
  function closeMenu(){
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded','false');
    burger.setAttribute('aria-label','Open menu');
    document.body.style.overflow = '';
  }
  burger.addEventListener('click', function(){
    var open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
  });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeMenu(); });

  /* ---------------- The scroll loop ---------------- */
  var ticking = false;

  function onScroll(){
    var y = window.pageYOffset;
    var max = document.documentElement.scrollHeight - window.innerHeight;

    progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    nav.classList.toggle('is-stuck', y > 40);
    wa.classList.toggle('is-in', y > 700);

    /* No in-page targets (a sub-page) — leave whatever link the markup
       marked active alone instead of clearing it on every scroll. */
    if(hasSpy){
      var mark = y + window.innerHeight * 0.34, current = -1;
      for(var i = 0; i < sections.length; i++){
        var s = sections[i];
        if(!s) continue;
        var top = s.offsetTop, bottom = top + s.offsetHeight;
        if(mark >= top && mark < bottom){ current = i; break; }
      }
      if(y + window.innerHeight >= max - 4) current = sections.length - 1;
      setActive(current);
    }

    /* parallax is a desktop nicety — on narrow screens it only costs jank */
    if(!reduce && window.innerWidth > 1024){
      for(var j = 0; j < parallaxEls.length; j++){
        var el = parallaxEls[j];
        var r = el.getBoundingClientRect();
        if(r.bottom > -200 && r.top < window.innerHeight + 200){
          var mid = r.top + r.height/2 - window.innerHeight/2;
          el.style.transform = 'translate3d(0,' + (-mid * parseFloat(el.dataset.parallax)) + 'px,0)';
        }
      }
    } else if(parallaxEls.length && parallaxEls[0].style.transform){
      parallaxEls.forEach(function(el){ el.style.transform = ''; });
    }
    ticking = false;
  }

  window.addEventListener('scroll', function(){
    if(!ticking){ ticking = true; requestAnimationFrame(onScroll); }
  }, {passive:true});

  window.addEventListener('resize', function(){
    lastActive = -2;
    if(window.innerWidth > 1024) closeMenu();
    activePill();
    onScroll();
  });

  onScroll();

  /* With no scroll spy there is nothing to place the pill, so seat it on
     whatever link the page marked active. Fonts can still be loading, so
     measure once they settle. */
  activePill();
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(activePill);
});
