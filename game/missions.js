// missions.js — one sortie: 6 rings down the valley, then land on the runway.
'use strict';
const Missions = (() => {
  const rings = [
    {x:0,   y:135, z:-800}, {x:-85, y:155, z:-1600}, {x:60, y:170, z:-2400},
    {x:-45, y:155, z:-3200}, {x:90, y:140, z:-4000}, {x:58, y:118, z:-5060},
  ].map(r=>({...r, passed:false, radius:30}));
  const state = {ringsPassed:0, landed:false, landingQuality:'', startTick:0, finishedTick:0};
  function nextRing(){ return rings[state.ringsPassed] || null; }
  function update(plane){
    const r=nextRing(); if(!r) return null;
    const dx=plane.pos[0]-r.x, dy=plane.pos[1]-r.y, dz=plane.pos[2]-r.z;
    const dist=Math.hypot(dx,dy,dz);
    if (Math.abs(dz)<14 && Math.hypot(dx,dy)<r.radius){ r.passed=true; state.ringsPassed++;
      return {event:'ring', n:state.ringsPassed}; }
    return {dist};
  }
  function checkLanding(plane, groundY){
    const onStrip = Math.abs(plane.pos[0])<30 && plane.pos[2]<-5080 && plane.pos[2]>-5720;
    if (!onStrip) return null;
    const agl = plane.pos[1]-groundY;
    if (agl<3.2){
      if (plane.speed>46) return {result:'crash', why:'TOO FAST ON TOUCHDOWN — '+Math.round(plane.speed)+' KT'};
      if (Math.abs(plane.vy)>7.5) return {result:'crash', why:'HARD IMPACT — SINK '+Math.abs(plane.vy).toFixed(1)+' M/S'};
      if (state.ringsPassed<6) return {result:'landed-early', why:'LANDED BEFORE ALL 6 RINGS'};
      return {result:'landed', why:'CLEAN TOUCHDOWN'};
    }
    return null;
  }
  function score(fuelLeft, damage, ticks){
    const t=ticks/60;
    let s = state.ringsPassed*150 + Math.round(fuelLeft*3) - Math.round(damage*4) - Math.round(t*0.4);
    if (state.landed) s+=300;
    return Math.max(0,s);
  }
  function buildRingMesh(active){
    const b=Render.builder(), col = active?[0.15,0.95,0.35]:[1.0,0.62,0.10];
    const R=30, T=2.0, SEG=26, TUB=6;
    for(let i=0;i<SEG;i++) for(let j=0;j<TUB;j++){
      const a1=i/SEG*Math.PI*2, a2=(i+1)/SEG*Math.PI*2, b1=j/TUB*Math.PI*2, b2=(j+1)/TUB*Math.PI*2;
      const pt=(a,bb)=>{ const cx=Math.cos(a), sy=Math.sin(a);
        return [(R+Math.cos(bb)*T)*cx, (R+Math.cos(bb)*T)*sy, Math.sin(bb)*T]; };
      b.quad(pt(a1,b1),pt(a2,b1),pt(a2,b2),pt(a1,b2),col);
    }
    return b.build();
  }
  return {rings, state, nextRing, update, checkLanding, score, buildRingMesh};
})();
