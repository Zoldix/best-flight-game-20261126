// fuel.js — fuel burn: throttle and climb cost fuel; gliding saves it.
'use strict';
const Fuel = (() => {
  const s = {pct:100};
  function burn(plane, dt){ s.pct = Math.max(0, s.pct - dt*(0.16 + plane.throttle*0.55 + Math.max(0,plane.vy)*0.012)); }
  function set(p){ s.pct=p; }
  return {s, burn, set};
})();
