/* ============================================================
   SIGNATURE — particles assemble into the Aivoryx mark.
   Scattered fragments becoming a finished thing:
   the headline, made literal.
   ============================================================ */
AX.module(function constellation(){
  'use strict';
  var reduce = AX.reduce;
  var canvas = AX.$('#constellation');
  if(!canvas) return;

  var ctx = canvas.getContext('2d', {alpha:true});
  var parts = [], ambient = [], W = 0, H = 0, dpr = 1, raf = null;
  var buckets = {}, bucketKeys = [];
  var pointer = {x:-9999, y:-9999, active:false};
  var BODY  = ['#8052ff','#8052ff','#8052ff','#a684ff','#6f5bff','#15846e','#c9a5ff'];
  var SHARD = ['#ffb829','#ffb829','#ffcf6b','#ff9f2e'];

  /* the same two paths as the SVG in the nav, in unit coordinates */
  function bodyPath(c, s){
    c.beginPath();
    c.moveTo(.50*s,.05*s); c.lineTo(.97*s,.95*s); c.lineTo(.73*s,.95*s);
    c.lineTo(.50*s,.47*s); c.lineTo(.27*s,.95*s); c.lineTo(.03*s,.95*s);
    c.closePath(); c.fill();
  }
  function shardPath(c, s){
    c.beginPath();
    c.moveTo(.31*s,.63*s); c.lineTo(.71*s,.67*s); c.lineTo(.69*s,.81*s); c.lineTo(.27*s,.77*s);
    c.closePath(); c.fill();
  }

  function mask(size, draw){
    var off = document.createElement('canvas');
    off.width = off.height = size;
    var oc = off.getContext('2d');
    oc.fillStyle = '#fff';
    draw(oc, size);
    return oc.getImageData(0,0,size,size).data;
  }

  function sample(size){
    var d = mask(size, function(c,s){ bodyPath(c,s); shardPath(c,s); });
    /* The shard gets rasterised on its own rather than being guessed at
       from a bounding box. The box caught the outer legs at the same
       height and turned a thin brand shard into a wide amber band. */
    var sd = mask(size, shardPath);

    var pts = [], step = size > 420 ? 6 : 5;
    for(var y=0; y<size; y+=step){
      for(var x=0; x<size; x+=step){
        var i = (y*size+x)*4 + 3;
        if(d[i] > 128){
          pts.push({x:x+(Math.random()-.5)*step, y:y+(Math.random()-.5)*step, s:sd[i] > 128});
        }
      }
    }
    return pts;
  }

  function build(){
    var r = canvas.getBoundingClientRect();
    if(r.width < 2) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = W*dpr; canvas.height = H*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);

    var size = Math.min(W,H) * .94;
    var ox = (W-size)/2, oy = (H-size)/2;

    parts = sample(Math.round(size)).map(function(t){
      var a = Math.random()*Math.PI*2, rad = Math.max(W,H)*(.55+Math.random()*.8);
      var pal = t.s ? SHARD : BODY;
      return {
        tx: ox+t.x, ty: oy+t.y,
        x: W/2+Math.cos(a)*rad, y: H/2+Math.sin(a)*rad,
        vx:0, vy:0,
        c: pal[(Math.random()*pal.length)|0],
        sz: 1.7+Math.random()*2,
        rot: Math.random()*Math.PI*2,
        spin:(Math.random()-.5)*.012,
        ph: Math.random()*Math.PI*2,
        amp: .4+Math.random()*1.1
      };
    });

    /* One path per colour instead of one stroke per particle. This is
       the whole reason the hero scrolls smoothly: ctx.save/restore and
       ctx.stroke are the expensive calls, and there were ~3,500 of each
       every frame. Bucketing drops that to one of each per colour. */
    buckets = {};
    parts.forEach(function(p){ (buckets[p.c] = buckets[p.c] || []).push(p); });
    bucketKeys = Object.keys(buckets);

    ambient = [];
    var n = Math.round((W*H)/13000);
    for(var i=0;i<n;i++){
      ambient.push({
        x:Math.random()*W, y:Math.random()*H,
        c:BODY[(Math.random()*BODY.length)|0],
        sz:1+Math.random()*1.8, rot:Math.random()*Math.PI*2,
        spin:(Math.random()-.5)*.01,
        dx:(Math.random()-.5)*.14, dy:(Math.random()-.5)*.14,
        o:.10+Math.random()*.22
      });
    }
  }

  /* Appends one triangle to whatever path is already open. The rotation
     is done in arithmetic rather than by transforming the context, so a
     few thousand of these cost one stroke call between them. */
  function triPath(p){
    var s = p.sz, c = Math.cos(p.rot), n = Math.sin(p.rot);
    var ax = s*.87, ay = s*.5;
    ctx.moveTo(p.x + s*n,            p.y - s*c);
    ctx.lineTo(p.x + (ax*c - ay*n),  p.y + (ax*n + ay*c));
    ctx.lineTo(p.x + (-ax*c - ay*n), p.y + (-ax*n + ay*c));
    ctx.closePath();
  }

  /* the ambient drift is only a few dozen shapes, so it keeps its own
     alpha per particle and pays for a stroke each */
  function tri(p){
    ctx.beginPath();
    triPath(p);
    ctx.stroke();
  }

  var t = 0;
  function frame(){
    t += .016;
    ctx.clearRect(0,0,W,H);
    ctx.lineWidth = 1;

    for(var i=0;i<ambient.length;i++){
      var a = ambient[i];
      a.x += a.dx; a.y += a.dy; a.rot += a.spin;
      if(a.x < -8) a.x = W+8;
      if(a.x > W+8) a.x = -8;
      if(a.y < -8) a.y = H+8;
      if(a.y > H+8) a.y = -8;
      ctx.globalAlpha = a.o; ctx.strokeStyle = a.c; tri(a);
    }

    for(var b=0;b<bucketKeys.length;b++){
      var bucket = buckets[bucketKeys[b]];
      ctx.strokeStyle = bucketKeys[b];
      ctx.beginPath();
      for(var j=0;j<bucket.length;j++){
      var p = bucket[j];
      var gx = p.tx + Math.sin(t*1.05 + p.ph) * p.amp;
      var gy = p.ty + Math.cos(t*.85 + p.ph) * p.amp;

      p.vx += (gx - p.x) * .017;
      p.vy += (gy - p.y) * .017;

      if(pointer.active){
        var dx = p.x - pointer.x, dy = p.y - pointer.y, d2 = dx*dx + dy*dy;
        if(d2 < 12000 && d2 > .01){
          var f = (12000 - d2)/12000 * 1.5, d = Math.sqrt(d2);
          p.vx += (dx/d)*f; p.vy += (dy/d)*f;
        }
      }

      p.vx *= .855; p.vy *= .855;
      p.x += p.vx; p.y += p.vy; p.rot += p.spin;

      triPath(p);
      }
      /* Two strokes of one path: a wide faint pass for the bloom, then
         the crisp one over it. Fourteen stroke calls a frame buys the
         glow that shadowBlur would have charged thousands for. */
      ctx.lineWidth = 2.6; ctx.globalAlpha = .13; ctx.stroke();
      ctx.lineWidth = 1;   ctx.globalAlpha = .95; ctx.stroke();
    }

    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }

  function staticRender(){
    ctx.clearRect(0,0,W,H);
    bucketKeys.forEach(function(k){
      ctx.strokeStyle = k; ctx.beginPath();
      buckets[k].forEach(function(p){ p.x = p.tx; p.y = p.ty; triPath(p); });
      ctx.lineWidth = 2.6; ctx.globalAlpha = .13; ctx.stroke();
      ctx.lineWidth = 1;   ctx.globalAlpha = .95; ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  /* Rebuild on resize — debounced, and ignoring the mobile URL-bar
     height wobble that fires resize on every scroll. */
  var rt, lastW = window.innerWidth;
  window.addEventListener('resize', function(){
    if(window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    clearTimeout(rt);
    rt = setTimeout(function(){ build(); if(reduce) staticRender(); }, 220);
  });

  canvas.addEventListener('pointermove', function(e){
    var r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; pointer.active = true;
  });
  canvas.addEventListener('pointerleave', function(){ pointer.active = false; });

  /* Pause the canvas when the hero scrolls away — saves battery */
  var inView = true;
  new IntersectionObserver(function(en){
    inView = en[0].isIntersecting;
    if(reduce) return;
    if(inView && !raf) raf = requestAnimationFrame(frame);
    if(!inView && raf){ cancelAnimationFrame(raf); raf = null; }
  }, {threshold:0}).observe(canvas);

  /* Stop drawing entirely while the tab is hidden */
  document.addEventListener('visibilitychange', function(){
    if(reduce) return;
    if(document.hidden && raf){ cancelAnimationFrame(raf); raf = null; }
    else if(!document.hidden && !raf && inView) raf = requestAnimationFrame(frame);
  });

  build();
  if(reduce) staticRender(); else raf = requestAnimationFrame(frame);
});
