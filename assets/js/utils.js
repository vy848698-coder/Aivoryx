/* ============================================================
   Shared helpers + a tiny module registry.
   Every other file pushes an init function; main.js runs them.
   ============================================================ */
(function(){
  'use strict';
  var AX = window.AX = window.AX || {};

  AX.modules = [];
  AX.module = function(fn){ AX.modules.push(fn); };

  AX.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  AX.canHover = window.matchMedia('(hover:hover)').matches;

  AX.$ = function(sel, ctx){ return (ctx || document).querySelector(sel); };
  AX.$$ = function(sel, ctx){
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };

  /* WhatsApp deep link with an optional prefilled message */
  AX.waLink = function(text){
    var n = AX.config.whatsapp;
    return 'https://wa.me/' + n + (text ? '?text=' + encodeURIComponent(text) : '');
  };
})();
