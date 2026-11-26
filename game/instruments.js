// instruments.js — the HUD: big altitude / airspeed / heading readouts,
// vertical speed, throttle / fuel / damage bars, the mission panel with its
// next-ring callout, an artificial-horizon canvas, and a north-up minimap
// that tracks the plane, the rings, the river and the runway.
'use strict';
const Instruments = (() => {
  const el = {};
  function init(){
    for (const id of ['alt','spd','hdg','thrbar','fuelbar','dmgbar','fuelpct','dmgpct','thrval',
      'mission','ringinfo','distinfo','callout','vspeed','gearmsg','warnline']) el[id]=document.getElementById(id);
    el.horizon = document.getElementById('horizon').getContext('2d');
    el.map = document.getElementById('minimap').getContext('2d');
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
    // Configuration + warnings: fixed gear is always down; flap setting is
    // read off the airspeed the way a pilot would schedule it; the warning
    // line speaks only when something is actually wrong.
    const flaps = plane.speed<40 ? 'FULL' : plane.speed<56 ? 'APPROACH' : 'CRUISE';
    el.gearmsg.textContent = 'GEAR DN · FLAPS '+flaps;
    const agl = plane.pos[1]-Terrain.heightAt(plane.pos[0], plane.pos[2]);
    el.warnline.textContent =
      Fuel.s.pct<25 ? (tick%70<42 ? '⚠ LOW FUEL — LAND SOON' : '') :
      (plane.speed<30 && agl>6) ? '⚠ STALL — NOSE DOWN' : '';
    const S = Missions.state, mid = Missions.current.id;
    const runwayDist = Math.max(0,Math.round(Math.abs(plane.pos[2]+5400)));
    if (mid==='survey'){
      const n = S.ringsPassed;
      el.mission.textContent = 'VALLEY SURVEY — RING '+Math.min(6,n+(n<6?1:6))+' / 6';
      const nr = Missions.nextRing();
      if (nr){ const d=Math.hypot(plane.pos[0]-nr.x, plane.pos[2]-nr.z);
        el.ringinfo.textContent='NEXT RING '+Math.round(d)+' M AHEAD';
        el.distinfo.textContent='RUNWAY '+runwayDist+' M NORTH';
        el.callout.textContent = d<420 ? '► RING AHEAD — LINE UP ◄' : 'FOLLOW THE GREEN RING';
      } else { el.ringinfo.textContent='ALL RINGS CLEAR — LAND NOW';
        el.distinfo.textContent='RUNWAY '+runwayDist+' M — SLOW TO <46 KT';
        el.callout.textContent='► RUNWAY AHEAD — GEAR DOWN, GENTLE SINK ◄'; }
    } else if (mid==='fire'){
      el.mission.textContent = 'SCOOP & DROP — '+(S.stage==='scoop'?'FILL THE TANK':S.stage==='drop'?'WATER AWAY ON THE FIRE':'FIRE OUT — LAND');
      if (S.stage==='scoop'){ const d=Math.hypot(plane.pos[0]-Missions.LAKE.x, plane.pos[2]-Missions.LAKE.z);
        el.ringinfo.textContent='LAKE '+Math.round(d)+' M — SKIM LOW & STEADY';
        el.distinfo.textContent='TANK '+(S.water>0?S.water+'%':'EMPTY')+' · FIRE '+Math.max(0,Missions.FIRE.hp)+'% BURNING';
        el.callout.textContent='► SKIM THE LAKE BELOW 9 M TO SCOOP ◄';
      } else if (S.stage==='drop'){ const d=Math.hypot(plane.pos[0]-Missions.FIRE.x, plane.pos[2]-Missions.FIRE.z);
        el.ringinfo.textContent='FIRE '+Math.round(d)+' M — FLY OVER IT LOW';
        el.distinfo.textContent='TANK 100% · DROPS '+S.drops+' / 2 · FIRE '+Math.max(0,Missions.FIRE.hp)+'%';
        el.callout.textContent = d<300 ? '► OVER THE FIRE — WATER AWAY ◄' : 'CARRY THE WATER TO THE ORANGE FLAMES';
      } else { el.ringinfo.textContent='ALL LOADS AWAY — FIRE OUT';
        el.distinfo.textContent='RUNWAY '+runwayDist+' M — SLOW TO <46 KT';
        el.callout.textContent='► RUNWAY AHEAD — GEAR DOWN, GENTLE SINK ◄'; }
    } else {
      el.mission.textContent = 'MEDEVAC — '+(S.stage==='pickup'?'PICK UP THE PATIENT':'PATIENT ABOARD — DELIVER');
      const pad = S.stage==='pickup' ? Missions.PICKUP_PAD : Missions.HOSPITAL_PAD;
      const d=Math.hypot(plane.pos[0]-pad.x, plane.pos[2]-pad.z);
      el.ringinfo.textContent='CLOCK '+Missions.fmtClock(S.timeLeft)+(S.timeLeft<60?' — HURRY':'');
      el.distinfo.textContent=(S.stage==='pickup'?'PICKUP PAD ':'HOSPITAL PAD ')+Math.round(d)+' M — LAND ON THE CROSS';
      el.callout.textContent = d<420 ? '► PAD AHEAD — SET HER DOWN GENTLY ◄' : 'FOLLOW THE MAP TO THE WHITE CROSS';
    }
    drawHorizon(plane);
    drawMinimap(plane);
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
  // North-up minimap: the whole valley on 168x168 px. World x -1250..1250
  // maps left..right, world z 350..-6450 maps bottom..top (north is up).
  function drawMinimap(plane){
    const c=el.map, S=168;
    const mx=x=>(x+1250)/2500*S, mz=z=>(350-z)/6800*S;
    c.clearRect(0,0,S,S);
    c.fillStyle='#0d2b1d'; c.fillRect(0,0,S,S);
    // river polyline, sampled from the same curve the terrain uses
    c.strokeStyle='#3f9be0'; c.lineWidth=2.5; c.beginPath();
    for(let z=300; z>=-4860; z-=180){ const px=mx(Terrain.riverX(z)), py=mz(z);
      if (z===300) c.moveTo(px,py); else c.lineTo(px,py); }
    c.stroke();
    // lake
    c.fillStyle='#3f9be0'; c.beginPath(); c.arc(mx(230),mz(-3750),9,0,Math.PI*2); c.fill();
    // runway: a white slot near the north end
    c.fillStyle='#f2f2f2'; c.fillRect(mx(0)-2, mz(-5720), 4, mz(-5080)-mz(-5720));
    // the fire (Scoop & Drop) and the two medevac pads
    c.fillStyle = Missions.FIRE.hp>0 ? '#ff5a1f' : '#7d8a99';
    c.beginPath(); c.arc(mx(Missions.FIRE.x), mz(Missions.FIRE.z), 4, 0, Math.PI*2); c.fill();
    c.fillStyle='#ffffff';
    for (const p of [Missions.PICKUP_PAD, Missions.HOSPITAL_PAD]) c.fillRect(mx(p.x)-2.5, mz(p.z)-2.5, 5, 5);
    // rings: passed grey, next green, later gold
    Missions.rings.forEach((r,i)=>{
      c.fillStyle = r.passed ? '#7d8a99' : (i===Missions.state.ringsPassed ? '#39ff6e' : '#ffb020');
      c.beginPath(); c.arc(mx(r.x), mz(r.z), r.passed?2.5:3.5, 0, Math.PI*2); c.fill();
    });
    // the plane: a triangle rotated to its heading (heading 0 = north = up)
    const px=mx(plane.pos[0]), py=mz(plane.pos[2]);
    c.save(); c.translate(px,py); c.rotate(-plane.heading);
    c.fillStyle='#ffffff'; c.beginPath();
    c.moveTo(0,-7); c.lineTo(4.5,5); c.lineTo(0,2.5); c.lineTo(-4.5,5); c.closePath(); c.fill();
    c.restore();
    c.fillStyle='#cfe8ff'; c.font='bold 10px Verdana'; c.fillText('N', S-13, 12);
  }
  return {init, update};
})();
