// missions.js — seven sorties over one valley, one shared landing rulebook.
//
//   1 · VALLEY SURVEY — thread six survey rings down the valley, land on 27.
//   2 · SCOOP & DROP  — skim the lake to fill the tank, drop the water on the
//                       forest fire (two loads put it out), land on 27.
//   3 · MEDEVAC       — land on the clearing pad, pick up Elias Ren, and put
//                       down on the hospital helipad before the clock runs out.
//   4 · NIGHT SURVEY  — the survey course again after dark: six lit rings,
//                       a darker valley, and Mara wants the photos by dawn.
//   5 · CARGO DROP    — collect Bram Kessler's crates low over the depot,
//                       drop them on the farmstead field, land on 27.
//   6 · SLALOM GATES  — eight tight gates threaded against a 2:30 clock.
//   7 · SECOND PATIENT — a second callout: Tomas Ilo waits on the west pad.
//
// Landing rules everywhere: on the surface, under 46 KT, sink gentler than
// 7.5 m/s. The active mission owns its stage machine; main.js flies the plane
// and asks this module what just happened. Every brief is spoken by a named
// person — the valley's small crew is part of the game, not flavour text
// pasted on afterwards: Mara Voss runs the tower, Chief Dana Okafor owns
// the fire, and Bram Kessler keeps the depot.
'use strict';
const Missions = (() => {
  const LIST = [
    { id:'survey',  kind:'rings', short:'SURVEY', name:'VALLEY SURVEY', sub:'6 RINGS · RUNWAY LANDING',
      who:'MARA VOSS — TOWER',
      brief:'Mara Voss, tower: "Thread the survey rings down the green valley, then put her down on the north strip under 46 knots."' },
    { id:'fire',    kind:'fire', short:'SCOOP', name:'SCOOP & DROP', sub:'LAKE SCOOP · FIRE DROP ×2 · LANDING',
      who:'CHIEF DANA OKAFOR — FIRE CREW',
      brief:'Chief Dana Okafor: "Skim the lake low to fill the tank, drop both loads on my fire on the west slope, then land."' },
    { id:'medevac', kind:'medevac', short:'MEDEVAC', name:'MEDEVAC', sub:'PICKUP PAD · HOSPITAL HELIPAD · 5:00 CLOCK',
      who:'ELIAS REN — PATIENT',
      brief:'Elias Ren is waiting on the clearing pad with a broken leg. Take him aboard, then reach the hospital helipad before the clock dies.' },
    { id:'night',   kind:'rings', short:'NIGHT', name:'NIGHT SURVEY', sub:'6 LIT RINGS · NIGHT · RUNWAY LANDING',
      who:'MARA VOSS — TOWER',
      brief:'Mara Voss, tower, after dark: "Same course, lit rings, no moon to help you. I need the survey photos before dawn."' },
    { id:'cargo',   kind:'cargo', short:'CARGO', name:'CARGO DROP', sub:'DEPOT PICKUP · FARMSTEAD DROP · LANDING',
      who:'BRAM KESSLER — DEPOT KEEPER',
      brief:'Bram Kessler, depot keeper: "Swoop low over my depot to hook the crates, drop them on the farmstead field, then land."' },
    { id:'slalom',  kind:'rings', short:'SLALOM', name:'SLALOM GATES', sub:'8 TIGHT GATES · 2:30 CLOCK · LANDING',
      who:'MARA VOSS — TOWER',
      brief:'Mara Voss, tower: "Eight tight gates, two and a half minutes on the clock. Thread them all, then land — style counts."' },
    { id:'medevac2', kind:'medevac', short:'SECOND', name:'SECOND PATIENT', sub:'WEST PAD · HOSPITAL HELIPAD · 4:00 CLOCK',
      who:'TOMAS ILO — PATIENT',
      brief:'A second callout: Tomas Ilo waits on the west ridge pad. Pick him up and deliver him to the hospital helipad inside four minutes.' },
  ];
  let current = LIST[0];
  // --- ring courses: three sets, one per ring sortie ---
  const RING_SETS = {
    survey: [
      {x:0,   y:135, z:-800}, {x:-85, y:155, z:-1600}, {x:60, y:170, z:-2400},
      {x:-45, y:155, z:-3200}, {x:90, y:140, z:-4000}, {x:58, y:118, z:-5060},
    ],
    night: [
      {x:40,  y:130, z:-900}, {x:-70, y:150, z:-1700}, {x:80, y:165, z:-2500},
      {x:-60, y:150, z:-3300}, {x:70, y:135, z:-4100}, {x:58, y:118, z:-5060},
    ],
    slalom: [
      {x:-120, y:120, z:-700, radius:22}, {x:120, y:135, z:-1300, radius:22},
      {x:-140, y:125, z:-1900, radius:22}, {x:100, y:145, z:-2500, radius:22},
      {x:-100, y:130, z:-3100, radius:22}, {x:130, y:140, z:-3700, radius:22},
      {x:-80,  y:125, z:-4300, radius:22}, {x:58,  y:118, z:-5060, radius:22},
    ],
  };
  let rings = [];
  function loadRings(){
    const set = RING_SETS[current.id] || RING_SETS.survey;
    rings = set.map(r=>({...r, passed:false, radius:r.radius||30}));
  }
  // --- sortie 2: fire ---
  const FIRE = { x:-430, z:-2550, hp:100 };          // two standard loads put it out
  const LAKE = { x:230, z:-3750, rx:190, rz:230 };   // the scoop ellipse
  // --- medevac pads, per sortie ---
  const PADS = {
    medevac:  { pickup:{ x:330,  z:-1400, r:26 }, seconds:300 },
    medevac2: { pickup:{ x:-650, z:-2600, r:26 }, seconds:240 },
  };
  const HOSPITAL_PAD = { x:150, z:-5400, r:26 };
  let PICKUP_PAD = PADS.medevac.pickup;
  // --- sortie 5: cargo zones ---
  const DEPOT = { x:600, z:-1800, r:110 };           // swoop low here to hook the crates
  const FARM  = { x:-200, z:-4600, r:120 };          // drop them on this field
  const SLALOM_SECONDS = 150;
  const state = { ringsPassed:0, landed:false, landingQuality:'', startTick:0, finishedTick:0,
                  stage:'', water:0, drops:0, patient:false, cargo:false, timeLeft:PADS.medevac.seconds };
  function clockSeconds(){ return (PADS[current.id] ? PADS[current.id].seconds : SLALOM_SECONDS) + Progress.clockBonus(); }
  function select(id){ current = LIST.find(m=>m.id===id) || LIST[0]; reset(); return current; }
  function reset(){
    loadRings();
    PICKUP_PAD = (PADS[current.id] || PADS.medevac).pickup;
    state.ringsPassed=0; state.landed=false; state.water=0; state.drops=0; state.patient=false; state.cargo=false;
    state.timeLeft = clockSeconds();
    FIRE.hp=100;
    state.stage = current.kind==='rings' ? 'rings' : current.kind==='fire' ? 'scoop'
                : current.kind==='cargo' ? 'fetch' : 'pickup';
  }
  function nextRing(){ return rings[state.ringsPassed] || null; }
  function overLake(plane){ const dx=(plane.pos[0]-LAKE.x)/LAKE.rx, dz=(plane.pos[2]-LAKE.z)/LAKE.rz; return dx*dx+dz*dz<0.8; }
  function overZone(plane, zone, maxAlt){ const gy=Terrain.heightAt(zone.x, zone.z);
    return Math.hypot(plane.pos[0]-zone.x, plane.pos[2]-zone.z) < zone.r && (plane.pos[1]-gy) < maxAlt; }
  // Per-tick stage machine. Returns an event object or null.
  function update(plane, ticks){
    if (current.kind==='rings'){
      if (current.id==='slalom'){
        state.timeLeft = Math.max(0, clockSeconds() - ticks/60);
        if (state.timeLeft<=0 && state.ringsPassed<rings.length) return {event:'timeout'};
      }
      const r=nextRing(); if(!r) return null;
      const dx=plane.pos[0]-r.x, dy=plane.pos[1]-r.y, dz=plane.pos[2]-r.z;
      if (Math.abs(dz)<14 && Math.hypot(dx,dy)<r.radius + Progress.ringBonus()){ r.passed=true; state.ringsPassed++;
        return {event:'ring', n:state.ringsPassed, total:rings.length}; }
      return {dist:Math.hypot(dx,dy,dz)};
    }
    if (current.kind==='fire'){
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
          state.water=0; state.drops++; FIRE.hp-=Progress.dropDamage();
          if (FIRE.hp<=0){ state.stage='land'; return {event:'fireout', drops:state.drops}; }
          state.stage='scoop';
          return {event:'drop', drops:state.drops};
        }
        return null;
      }
      return null; // stage 'land': the runway decides, via checkLanding
    }
    if (current.kind==='cargo'){
      if (state.stage==='fetch' && overZone(plane, DEPOT, 60)){
        state.cargo=true; state.stage='drop';
        return {event:'cargoload'};
      }
      if (state.stage==='drop' && overZone(plane, FARM, 80)){
        state.cargo=false; state.stage='land';
        return {event:'cargodrop'};
      }
      return null;
    }
    if (current.kind==='medevac'){
      state.timeLeft = Math.max(0, clockSeconds() - ticks/60);
      if (state.timeLeft<=0) return {event:'timeout'};
      return null;
    }
    return null;
  }
  // Is the plane on this pad, gently? Used by main.js when ground contact happens.
  function onPad(plane, pad){ return Math.hypot(plane.pos[0]-pad.x, plane.pos[2]-pad.z) < pad.r; }
  // Touchdown grading, judged at the moment of contact: SMOOTH is slow and
  // gentle, FIRM is legal but rough, and anything past the legal limits has
  // already been called a crash by the checks below.
  function gradeTouch(plane){
    const speed=Math.round(plane.speed), sink=Math.abs(plane.vy);
    const grade = (speed<=38 && sink<=2.5) ? 'SMOOTH' : 'FIRM';
    return { grade, touch: speed+' KT · SINK '+sink.toFixed(1)+' M/S' };
  }
  function padTouch(plane, groundY){
    if (current.kind!=='medevac') return null;
    const gentle = plane.speed<46 && Math.abs(plane.vy)<=7.5;
    if (state.stage==='pickup' && onPad(plane, PICKUP_PAD)){
      if (!gentle) return {result:'crash', why:'HARD ARRIVAL AT THE PICKUP PAD'};
      state.patient=true; state.stage='deliver';
      return {event:'pickup'};
    }
    if (state.stage==='deliver' && onPad(plane, HOSPITAL_PAD)){
      if (!gentle) return {result:'crash', why:'HARD ARRIVAL AT THE HOSPITAL PAD'};
      return {result:'delivered', why:'PATIENT DELIVERED — ' + fmtClock(state.timeLeft) + ' TO SPARE', ...gradeTouch(plane)};
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
      if (current.kind==='rings' && state.ringsPassed<rings.length)
        return {result:'landed-early', why:'LANDED BEFORE ALL '+rings.length+' GATES', grade:'MISSED', touch:gradeTouch(plane).touch};
      if (current.kind==='fire' && state.stage!=='land') return {result:'landed-early', why:'LANDED WITH THE FIRE STILL BURNING', grade:'MISSED', touch:gradeTouch(plane).touch};
      if (current.kind==='cargo' && state.stage!=='land') return {result:'landed-early', why:'LANDED WITHOUT DELIVERING THE CARGO', grade:'MISSED', touch:gradeTouch(plane).touch};
      if (current.kind==='medevac') return {result:'landed-early', why:'LANDED AT THE STRIP — THE PATIENT GOES TO THE HOSPITAL PAD', grade:'MISSED', touch:gradeTouch(plane).touch};
      return {result:'landed', why:'CLEAN TOUCHDOWN', ...gradeTouch(plane)};
    }
    return null;
  }
  // One medal per sortie, hung on the results screen: GOLD needs a smooth
  // touchdown and a strong score, SILVER any completed landing, BRONZE a
  // safe arrival that missed the brief.
  const GOLD_SCORE = { survey:1100, fire:1050, medevac:1000, night:1100, cargo:1000, slalom:1150, medevac2:1000 };
  function medalFor(scoreValue, grade, completed){
    if (completed && grade==='SMOOTH' && scoreValue>=GOLD_SCORE[current.id]) return 'GOLD';
    if (completed) return 'SILVER';
    if (grade==='MISSED') return 'BRONZE';
    return null;
  }
  function score(fuelLeft, damage, ticks){
    const t=ticks/60;
    let s = - Math.round(damage*4) - Math.round(t*0.4);
    if (current.kind==='rings') s += state.ringsPassed*150 + Math.round(fuelLeft*3);
    if (current.kind==='fire') s += state.drops*250 + Math.round((100-FIRE.hp)*2) + Math.round(fuelLeft*2);
    if (current.kind==='cargo') s += (state.stage==='land'?500:0) + Math.round(fuelLeft*2);
    if (current.kind==='medevac') s += state.patient?200:0 + Math.round(state.timeLeft*2) + Math.round(fuelLeft*2);
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
  return {LIST,
    get rings(){ return rings; }, state, FIRE, LAKE,
    get PICKUP_PAD(){ return PICKUP_PAD; }, HOSPITAL_PAD, DEPOT, FARM,
    get current(){ return current; }, select, reset, nextRing, update, padTouch, checkLanding, score, medalFor, buildRingMesh, fmtClock};
})();
