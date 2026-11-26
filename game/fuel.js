// fuel.js — fuel burn: throttle and climbing cost fuel, gliding saves it.
// One tank per sortie; running dry ends the flight wherever you are.
'use strict';
const Fuel = (() => {
  const s = {pct:100};
  function burn(plane, dt){ s.pct = Math.max(0, s.pct - dt*(0.16 + plane.throttle*0.55 + Math.max(0,plane.vy)*0.012)); }
  function set(p){ s.pct=p; }
  return {s, burn, set};
})();
