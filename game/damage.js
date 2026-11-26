// damage.js — integrity: terrain strikes, tree strikes, hard sink and overspeed hurt.
'use strict';
const Damage = (() => {
  const s = {pct:0, lastEvent:''};
  function hit(amount, why){ s.pct=Math.min(100, s.pct+amount); s.lastEvent=why; }
  function set(p){ s.pct=p; }
  return {s, hit, set};
})();
