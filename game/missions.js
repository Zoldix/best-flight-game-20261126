// missions.js — three sorties over one valley, one shared landing rulebook.
//
//   1 · VALLEY SURVEY — thread six survey rings down the valley, land on 27.
//   2 · SCOOP & DROP  — skim the lake to fill the tank, drop the water on the
//                       forest fire (two loads put it out), land on 27.
//   3 · MEDEVAC       — land on the clearing pad, pick up the patient, and put
//                       down on the hospital helipad before the clock runs out.
//
// Landing rules everywhere: on the surface, under 46 KT, sink gentler than
// 7.5 m/s. The active mission owns its stage machine; main.js flies the plane
// and asks this module what just happened.
'use strict';
const Missions = (() => {
  const LIST = [
    { id:'survey',  name:'VALLEY SURVEY', sub:'6 RINGS · RUNWAY LANDING',
      brief:'Thread the survey rings down the green valley, then put her down on the north strip under 46 knots.' },
    { id:'fire',    name:'SCOOP & DROP', sub:'LAKE SCOOP · FIRE DROP ×2 · LANDING',
      brief:'Skim the lake low to fill the tank, drop both loads on the forest fire on the west slope, then land.' },
    { id:'medevac', name:'MEDEVAC', sub:'PICKUP PAD · HOSPITAL HELIPAD · 5:00 CLOCK',
      brief:'Land on the clearing pad to take the patient aboard, then reach the hospital helipad before the clock dies.' },
  ];
  let current = LIST[0];
  // --- sortie 1: rings ---
  const rings = [
    {x:0,   y:135, z:-800}, {x:-85, y:155, z:-1600}, {x:60, y:170, z:-2400},
    {x:-45, y:155, z:-3200}, {x:90, y:140, z:-4000}, {x:58, y:118, z:-5060},
  ].map(r=>({...r, passed:false, radius:30}));
  // --- sortie 2: fire ---
  const FIRE = { x:-430, z:-2550, hp:100 };          // two 50-point loads put it out
  const LAKE = { x:230, z:-3750, rx:190, rz:230 };   // the scoop ellipse
  // --- sortie 3: pads ---
  const PICKUP_PAD = { x:330, z:-1400, r:26 };
  const HOSPITAL_PAD = { x:150, z:-5400, r:26 };
  const MEDEVAC_SECONDS = 300;
  const state = { ringsPassed:0, landed:false, landingQuality:'', startTick:0, finishedTick:0,
                  stage:'', water:0, drops:0, patient:false, timeLeft:MEDEVAC_SECONDS };
  function select(id){ current = LIST.find(m=>m.id===id) || LIST[0]; reset(); return current; }
  function reset(){
    for (const r of rings) r.passed=false;
    state.ringsPassed=0; state.landed=false; state.water=0; state.drops=0; state.patient=false;
    state.timeLeft=MEDEVAC_SECONDS;
    FIRE.hp=100;
    state.stage = current.id==='survey' ? 'rings' : current.id==='fire' ? 'scoop' : 'pickup';
  }
  function nextRing(){ return rings[state.ringsPassed] || null; }
  function overLake(plane){ const dx=(plane.pos[0]-LAKE.x)/LAKE.rx, dz=(plane.pos[2]-LAKE.z)/LAKE.rz; return dx*dx+dz*dz<0.8; }
  // Per-tick stage machine. Returns an event object or null.
  function update(plane, ticks){
    if (current.id==='survey'){
      const r=nextRing(); if(!r) return null;
      const dx=plane.pos[0]-r.x, dy=plane.pos[1]-r.y, dz=plane.pos[2]-r.z;
      if (Math.abs(dz)<14 && Math.hypot(dx,dy)<r.radius){ r.passed=true; state.ringsPassed++;
        return {event:'ring', n:state.ringsPassed}; }
      return {dist:Math.hypot(dx,dy,dz)};
    }
    if (current.id==='fire'){
      if (state.stage==='scoop'){
        // A scoop is a low, steady skim across the lake surface.
        if (overLake(plane) && plane.pos[1]<9 && plane.speed>24 && plane.speed<72){
          state.water=100; state.stage='drop';
          return {event:'scoop'};
        }
        return null;
      }
      if (state.stage==='drop'){
        const d=Math.hypot(plane.pos[0]-FIRE.x, plane.pos[2]-FIRE.z);
        const gy=Terrain.heightAt(FIRE.x, FIRE.z);
        if (d<85 && plane.pos[1]-gy<75){
          state.water=0; state.drops++; FIRE.hp-=50;
          if (FIRE.hp<=0){ state.stage='land'; return {event:'fireout', drops:state.drops}; }
          state.stage='scoop';
          return {event:'drop', drops:state.drops};
        }
        return null;
      }
      return null; // stage 'land': the runway decides, via checkLanding
    }
    if (current.id==='medevac'){
      state.timeLeft = Math.max(0, MEDEVAC_SECONDS - ticks/60);
      if (state.timeLeft<=0) return {event:'timeout'};
      return null;
    }
    return null;
  }
  // Is the plane on this pad, gently? Used by main.js when ground contact happens.
  function onPad(plane, pad){ return Math.hypot(plane.pos[0]-pad.x, plane.pos[2]-pad.z) < pad.r; }
  function padTouch(plane, groundY){
    if (current.id!=='medevac') return null;
    const gentle = plane.speed<46 && Math.abs(plane.vy)<=7.5;
    if (state.stage==='pickup' && onPad(plane, PICKUP_PAD)){
      if (!gentle) return {result:'crash', why:'HARD ARRIVAL AT THE PICKUP PAD'};
      state.patient=true; state.stage='deliver';
      return {event:'pickup'};
    }
    if (state.stage==='deliver' && onPad(plane, HOSPITAL_PAD)){
      if (!gentle) return {result:'crash', why:'HARD ARRIVAL AT THE HOSPITAL PAD'};
      return {result:'delivered', why:'PATIENT DELIVERED — ' + fmtClock(state.timeLeft) + ' TO SPARE'};
    }
    return null;
  }
  function fmtClock(sec){ const m=Math.floor(sec/60), s=Math.floor(sec%60); return m+':'+String(s).padStart(2,'0'); }
  function checkLanding(plane, groundY){
    const onStrip = Math.abs(plane.pos[0])<30 && plane.pos[2]<-5080 && plane.pos[2]>-5720;
    if (!onStrip) return null; // off-strip ground contact is terrain, judged by the caller
    const agl = plane.pos[1]-groundY;
    if (agl<3.2){
      if (plane.speed>46) return {result:'crash', why:'TOO FAST ON TOUCHDOWN — '+Math.round(plane.speed)+' KT'};
      if (Math.abs(plane.vy)>7.5) return {result:'crash', why:'HARD IMPACT — SINK '+Math.abs(plane.vy).toFixed(1)+' M/S'};
      if (current.id==='survey' && state.ringsPassed<6) return {result:'landed-early', why:'LANDED BEFORE ALL 6 RINGS'};
      if (current.id==='fire' && state.stage!=='land') return {result:'landed-early', why:'LANDED WITH THE FIRE STILL BURNING'};
      return {result:'landed', why:'CLEAN TOUCHDOWN'};
    }
    return null;
  }
  function score(fuelLeft, damage, ticks){
    const t=ticks/60;
    let s = - Math.round(damage*4) - Math.round(t*0.4);
    if (current.id==='survey') s += state.ringsPassed*150 + Math.round(fuelLeft*3);
    if (current.id==='fire') s += state.drops*250 + Math.round((100-FIRE.hp)*2) + Math.round(fuelLeft*2);
    if (current.id==='medevac') s += state.patient?200:0 + Math.round(state.timeLeft*2) + Math.round(fuelLeft*2);
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
  reset();
  return {LIST, rings, state, FIRE, LAKE, PICKUP_PAD, HOSPITAL_PAD,
    get current(){ return current; }, select, reset, nextRing, update, padTouch, checkLanding, score, buildRingMesh, fmtClock};
})();
