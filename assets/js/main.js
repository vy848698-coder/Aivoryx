/* ============================================================
   Boot. Every module registered itself with AX.module(); run them
   in load order, and keep one broken module from killing the rest.
   ============================================================ */
(function(){
  'use strict';
  AX.modules.forEach(function(fn){
    try{ fn(); }
    catch(err){ console.error('[Aivoryx] module "' + (fn.name || 'anonymous') + '" failed:', err); }
  });
})();
