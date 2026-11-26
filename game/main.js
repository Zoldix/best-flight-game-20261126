// main.js — flight model on a fixed timestep, keyboard + mouse input, the
// screen flow (title -> fly -> landed / crash / results), and the demo/seed
// API the screenshot harness drives: ?scene=<name>&manual=1&seed=<n> poses a
// deterministic scene, window.__flight.step() advances one tick.
'use strict';
const DT = 1/60;
const params = new URLSearchParams(location.search);
const SEED = parseInt(params.get('seed')||'20261126',10);
const plane = { pos:[0,135,150], heading:0, pitch:0, roll:0, speed:62, throttle:0.62, vy:0 };
let screen = 'title'; // title | fly | results | crash | landed
let tick = 0, sortieStartTick = 0, propAngle = 0, flashMsg='', flashUntil=0;
let terrainMesh, skyMesh, planeMesh, propMesh, ringMeshActive, ringMeshIdle;
const keys = {}; let mouseSteer = null;
const resultsData = {time:'0.0', fuel:'0', score:0, why:'', rings:0};

function terrainHit(){
  const g = Terrain.heightAt(plane.pos[0], plane.pos[2]);
  if (plane.pos[1] <= g+2.2){
    const land = Missions.checkLanding(plane, g);
    if (land && land.result==='landed'){ finishSortie('landed', land.why); return true; }
    if (land && land.result==='landed-early'){ finishSortie('landed', land.why); return true; }
    finishSortie('crash', land? land.why : 'TERRAIN IMPACT AT '+Math.round(plane.speed)+' KT');
    Damage.hit(65,'TERRAIN IMPACT'); return true;
  }
  return false;
}
function finishSortie(kind, why){
  screen = (kind==='landed') ? 'landed' : 'crash';
  Missions.state.landed = (kind==='landed');
  Missions.state.finishedTick = tick;
  resultsData.time = ((tick-sortieStartTick)/60).toFixed(1);
  resultsData.fuel = Fuel.s.pct.toFixed(0);
  resultsData.rings = Missions.state.ringsPassed;
  resultsData.why = why;
  resultsData.score = Missions.score(Fuel.s.pct, Damage.s.pct, tick-sortieStartTick);
  showScreen();
}
function showScreen(){
  document.getElementById('title-screen').style.display = screen==='title'?'flex':'none';
  document.getElementById('end-screen').style.display = (screen==='results'||screen==='landed'||screen==='crash')?'flex':'none';
  if (screen==='landed'||screen==='crash'||screen==='results'){
    document.getElementById('end-title').textContent =
      screen==='landed' ? 'SORTIE COMPLETE — LANDED' : screen==='crash' ? 'CRASHED' : 'SORTIE RESULTS';
    document.getElementById('end-stats').innerHTML =
      '<div>TIME <b>'+resultsData.time+' S</b></div><div>RINGS <b>'+resultsData.rings+' / 6</b></div>'+
      '<div>FUEL LEFT <b>'+resultsData.fuel+'%</b></div><div>DAMAGE <b>'+Damage.s.pct.toFixed(0)+'%</b></div>'+
      '<div>SCORE <b>'+resultsData.score+'</b></div><p class="why">'+resultsData.why+'</p>';
  }
}
function startSortie(){
  screen='fly'; sortieStartTick=tick; AudioSys.start(); showScreen();
}
function step(){
  tick++;
  if (screen!=='fly') return;
  // input -> control deflections; authority scales mildly with speed so the
  // plane stays responsive slow and does not get twitchy fast
  const auth = 0.55 + Math.min(0.65, plane.speed/110);
  let pitchIn=0, rollIn=0;
  if (keys['w']||keys['arrowup']) pitchIn += 1;
  if (keys['s']||keys['arrowdown']) pitchIn -= 1;
  if (keys['a']||keys['arrowleft']) rollIn -= 1;
  if (keys['d']||keys['arrowright']) rollIn += 1;
  if (mouseSteer){ pitchIn += mouseSteer.y; rollIn += mouseSteer.x; }
  if (keys['shift']) plane.throttle=Math.min(1, plane.throttle+0.008);
  if (keys['c']||keys['control']) plane.throttle=Math.max(0, plane.throttle-0.008);
  plane.roll += ((rollIn*0.95)-plane.roll)*0.12;
  plane.pitch += ((pitchIn*0.38)-plane.pitch)*0.10;
  plane.heading += plane.roll * (plane.speed*0.00028) * (180/Math.PI) * 0.016 * 3.2;
  // physics: throttle sets a target speed, pitch trades speed for climb,
  // and below 30 KT the plane sinks (the stall)
  const targetSpeed = 18 + plane.throttle*95;
  plane.speed += (targetSpeed-plane.speed)*0.012 - plane.pitch*plane.speed*0.010;
  plane.speed = Math.max(14, Math.min(125, plane.speed));
  const climb = Math.sin(plane.pitch)*plane.speed*0.42 - (plane.speed<30? (30-plane.speed)*0.22 : 0);
  plane.vy = climb;
  const fwd=[Math.sin(plane.heading)*Math.cos(plane.pitch), 0, -Math.cos(plane.heading)*Math.cos(plane.pitch)];
  const horiz = plane.speed*0.447; // kt -> world units per second, scaled below
  plane.pos[0] += fwd[0]*horiz*DT*3.2;
  plane.pos[2] += fwd[2]*horiz*DT*3.2;
  plane.pos[1] += plane.vy*DT*3.2;
  plane.pos[0] = Math.max(-1150, Math.min(1150, plane.pos[0]));
  plane.pos[1] = Math.min(420, plane.pos[1]);
  propAngle += plane.throttle*0.9 + 0.12;
  Fuel.burn(plane, DT); AudioSys.setThrottle(plane.throttle);
  if (Fuel.s.pct<=0){ plane.throttle=0; if (plane.speed<20 && plane.pos[1]-Terrain.heightAt(plane.pos[0],plane.pos[2])<4) finishSortie('crash','OUT OF FUEL — FORCED LANDING'); }
  const ev = Missions.update(plane);
  if (ev && ev.event==='ring'){ flashMsg='RING '+ev.n+' / 6 CLEAR!'; flashUntil=tick+150; AudioSys.chime(); }
  if (terrainHit()) return;
}
function modelMatrix(){
  let m = Render.trans(plane.pos[0], plane.pos[1], plane.pos[2]);
  m = Render.mul(m, [2.2,0,0,0, 0,2.2,0,0, 0,0,2.2,0, 0,0,0,1]);
  m = Render.mul(m, Render.rotY(-plane.heading));
  m = Render.mul(m, Render.rotX(-plane.pitch));
  m = Render.mul(m, Render.rotZ(plane.roll));
  return m;
}
function renderFrame(){
  const canvas=document.getElementById('gl');
  const cam = Camera.update(plane, DT);
  Render.clear(0.99,0.62,0.36);
  const proj = Render.persp(cam.fov, canvas.width/canvas.height, 0.5, 6000);
  const view = Render.lookAt(cam.pos, cam.look, [0,1,0]);
  const vp = Render.mul(proj, view);
  const fog=[0.96,0.60,0.38];
  Render.draw(skyMesh, vp, fog, -1);
  Render.draw(terrainMesh, vp, fog);
  // rings: the next one green, the rest gold, passed ones gone
  for (let i=0;i<Missions.rings.length;i++){ const r=Missions.rings[i]; if (r.passed) continue;
    let m=Render.mul(Render.trans(r.x,r.y,r.z), Render.ident());
    Render.draw(i===Missions.state.ringsPassed?ringMeshActive:ringMeshIdle, Render.mul(vp,m), fog); }
  // aircraft + propeller
  const mm = modelMatrix();
  Render.draw(planeMesh, Render.mul(vp,mm), fog);
  let pm = Render.mul(mm, Render.trans(0,0,-3.55));
  pm = Render.mul(pm, Render.rotZ(propAngle));
  Render.draw(propMesh, Render.mul(vp,pm), fog);
  Instruments.update(plane, tick);
  const fl=document.getElementById('flash');
  fl.textContent = tick<flashUntil ? flashMsg : '';
}
function frame(){
  step(); renderFrame();
  requestAnimationFrame(frame);
}
// ---- demo / seed presets for deterministic screenshots ----
function applyPreset(name){
  if (name==='cover'){ plane.pos=[6,140,-4780]; plane.heading=-0.01; plane.pitch=0.0; plane.speed=60; plane.throttle=0.50;
    for(let i=0;i<5;i++) Missions.rings[i].passed=true; Missions.state.ringsPassed=5;
    Fuel.set(54); Damage.set(9); screen='fly'; }
  else if (name==='runway'){ plane.pos=[6,36,-4995]; plane.heading=-0.03; plane.pitch=-0.06; plane.speed=47; plane.throttle=0.30;
    for(const r of Missions.rings) r.passed=true; Missions.state.ringsPassed=6; Fuel.set(38); Damage.set(18); screen='fly'; }
  else if (name==='results'){ applyPresetSilent(); screen='results';
    resultsData.time='118.4'; resultsData.fuel='31'; resultsData.rings=6;
    resultsData.why='CLEAN TOUCHDOWN — ALL 6 RINGS, VALLEY SURVEY COMPLETE';
    Missions.state.ringsPassed=6; Missions.state.landed=true; resultsData.score=Missions.score(31,18,118.4*60); showScreen(); }
  else if (name==='title'){ screen='title'; }
  Camera.reset(plane.pos); showScreen();
}
function applyPresetSilent(){ plane.pos=[0,120,-4900]; plane.heading=0; plane.speed=48; Fuel.set(31); Damage.set(18); }
window.__flight = { plane, step, renderFrame, applyPreset,
  get state(){ return {tick, screen, rings:Missions.state.ringsPassed, fuel:Fuel.s.pct, damage:Damage.s.pct,
    pos:[...plane.pos], speed:plane.speed}; } };
function boot(){
  Render.init(document.getElementById('gl'));
  terrainMesh=Terrain.build(); skyMesh=Terrain.buildSky(); planeMesh=Aircraft.build(); propMesh=Aircraft.buildPropeller();
  ringMeshActive=Missions.buildRingMesh(true); ringMeshIdle=Missions.buildRingMesh(false);
  Instruments.init();
  addEventListener('keydown', e=>{ keys[e.key.toLowerCase()]=true;
    if ((e.key==='Enter'||e.key===' ') && screen==='title'){ e.preventDefault(); startSortie(); }
    if (e.key.toLowerCase()==='r' && (screen==='crash'||screen==='landed')) location.search='?seed='+SEED; });
  addEventListener('keyup', e=>{ keys[e.key.toLowerCase()]=false; });
  addEventListener('mousemove', e=>{ if (params.get('scene')) return; // demo/seed scenes ignore the mouse: screenshots must be reproducible
    const nx=(e.clientX/innerWidth-0.5)*2, ny=(0.5-e.clientY/innerHeight)*2;
    mouseSteer={x:nx*0.7, y:ny*0.7}; });
  document.getElementById('start-btn').addEventListener('click', startSortie);
  const scene=params.get('scene');
  if (scene) applyPreset(scene);
  // the kit harness's own shot names, as an alias of ours
  const shot=params.get('shot');
  if (shot==='start') applyPreset('title');
  else if (shot==='play') applyPreset('cover');
  else if (shot==='end') applyPreset('results');
  if (params.get('autostart')==='1' && screen==='title') startSortie();
  showScreen(); renderFrame();
  if (params.get('manual')!=='1') requestAnimationFrame(frame);
}
addEventListener('load', boot);
