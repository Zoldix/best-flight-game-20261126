// instruments.js — HUD: big readouts, bars, compass, artificial horizon canvas, mission panel.
'use strict';
const Instruments = (() => {
  const el = {};
  function init(){
    for (const id of ['alt','spd','hdg','thrbar','fuelbar','dmgbar','fuelpct','dmgpct','thrval',
      'mission','ringinfo','distinfo','callout','vspeed','gearmsg']) el[id]=document.getElementById(id);
    el.horizon = document.getElementById('horizon').getContext('2d');
  }
  function bar(node, pct, color){ node.style.width=Math.max(0,Math.min(100,pct))+'%'; node.style.background=color; }
  function update(plane, tick){
    const hdgDeg = ((plane.heading*180/Math.PI)%360+360)%360;
    el.alt.textContent = Math.max(0,Math.round(plane.pos[1]*3.281))+' FT';
    el.spd.textContent = Math.round(plane.speed)+' KT';
    el.hdg.textContent = String(Math.round(hdgDeg)).padStart(3,'0')+'°';
    el.vspeed.textContent = (plane.vy>=0?'+':'')+(plane.vy*196.85).toFixed(0)+' FPM';
    el.thrval.textContent = Math.round(plane.throttle*100)+'%';
    bar(el.thrbar, plane.throttle*100, '#ffb020');
    bar(el.fuelbar, Fuel.s.pct, Fuel.s.pct<25?'#ff4444':'#37c978');
    el.fuelpct.textContent = Fuel.s.pct.toFixed(0)+'%';
    bar(el.dmgbar, Damage.s.pct, Damage.s.pct>60?'#ff4444':'#ff9040');
    el.dmgpct.textContent = Damage.s.pct.toFixed(0)+'%';
    const n = Missions.state.ringsPassed;
    el.mission.textContent = 'VALLEY SURVEY — RING '+Math.min(6,n+ (n<6?1:6))+' / 6';
    const nr = Missions.nextRing();
    if (nr){ const d=Math.hypot(plane.pos[0]-nr.x, plane.pos[2]-nr.z);
      el.ringinfo.textContent='NEXT RING '+Math.round(d)+' M AHEAD';
      el.distinfo.textContent='RUNWAY '+Math.max(0,Math.round(Math.abs(plane.pos[2]+5400)))+' M NORTH';
      el.callout.textContent = d<420 ? '► RING AHEAD — LINE UP ◄' : 'FOLLOW THE GREEN RING';
    } else { el.ringinfo.textContent='ALL RINGS CLEAR — LAND NOW';
      el.distinfo.textContent='RUNWAY '+Math.max(0,Math.round(Math.abs(plane.pos[2]+5400)))+' M — SLOW TO <46 KT';
      el.callout.textContent='► RUNWAY AHEAD — GEAR DOWN, GENTLE SINK ◄'; }
    drawHorizon(plane);
  }
  function drawHorizon(plane){
    const c=el.horizon, W=220,H=140; c.save(); c.clearRect(0,0,W,H);
    c.beginPath(); c.arc(W/2,H/2,66,0,Math.PI*2); c.clip();
    c.translate(W/2,H/2); c.rotate(-plane.roll);
    const py=Math.max(-55,Math.min(55, plane.pitch*160));
    c.fillStyle='#2f7fd0'; c.fillRect(-110,-110+py,220,110);
    c.fillStyle='#8a5a2b'; c.fillRect(-110,py,220,110);
    c.fillStyle='#ffffff'; c.fillRect(-110,py-1.5,220,3);
    for(let a=-20;a<=20;a+=10){ if(a===0) continue; const y=py-a*1.6;
      c.fillRect(-18,y,36,2); }
    c.restore();
    c.strokeStyle='#e8f2ff'; c.lineWidth=3; c.beginPath(); c.arc(W/2,H/2,66,0,Math.PI*2); c.stroke();
    c.strokeStyle='#ffd23f'; c.lineWidth=4; c.beginPath();
    c.moveTo(W/2-38,H/2); c.lineTo(W/2-10,H/2); c.lineTo(W/2,H/2+8); c.lineTo(W/2+10,H/2); c.lineTo(W/2+38,H/2); c.stroke();
    c.fillStyle='#ffd23f'; c.beginPath(); c.arc(W/2,H/2,3.5,0,Math.PI*2); c.fill();
  }
  return {init, update};
})();
