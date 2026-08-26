/* ============================================================
   HERO STAGE — pointer depth.

   The housing is three planes at different distances: the rings
   travel furthest, the mark drifts with them at about half the
   distance, and the docked panel moves against both. That opposition
   is the whole trick — parallax that all slides the same way reads as
   a wobble, parallax that separates reads as depth.

   One rAF, lerped, that stops itself the moment the pointer settles.
   Everything is published as --px / --py on the stage; the CSS owns
   how far each plane actually moves.
   ============================================================ */
AX.module(function heroStage(){
  'use strict';
  var stage = AX.$('#heroStage'), hero = AX.$('#hero');
  if(!stage || !hero) return;

  /* a finger has no hover position to read, and a reader who asked for
     less motion has already said no to this */
  if(AX.reduce || !AX.canHover) return;

  var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;

  function loop(){
    cx += (tx - cx) * .07;
    cy += (ty - cy) * .07;
    stage.style.setProperty('--px', cx.toFixed(4));
    stage.style.setProperty('--py', cy.toFixed(4));

    if(Math.abs(tx - cx) > .0015 || Math.abs(ty - cy) > .0015){
      raf = requestAnimationFrame(loop);
    }else{
      raf = null;
    }
  }
  function kick(){ if(!raf) raf = requestAnimationFrame(loop); }

  /* Tracked across the whole hero, not just the stage: the reader's
     pointer is usually over the headline or the button when the mark
     is worth watching, and a stage that only answers to a cursor
     sitting on top of it answers almost never. */
  hero.addEventListener('pointermove', function(e){
    var r = hero.getBoundingClientRect();
    if(!r.width || !r.height) return;
    tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width  - .5) * 2));
    ty = Math.max(-1, Math.min(1, ((e.clientY - r.top)  / r.height - .5) * 2));
    kick();
  }, {passive:true});

  hero.addEventListener('pointerleave', function(){ tx = 0; ty = 0; kick(); });
});
