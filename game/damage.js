// damage.js — airframe integrity. Terrain strikes and hard arrivals add
// damage; the score pays for every point of it, so a rough sortie shows.
'use strict';
const Damage = (() => {
  const s = {pct:0, lastEvent:''};
  function hit(amount, why){ s.pct=Math.min(100, s.pct+amount*Progress.damageMult()); s.lastEvent=why; }
  function set(p){ s.pct=p; }
  return {s, hit, set};
})();
