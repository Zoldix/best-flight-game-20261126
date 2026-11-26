// camera.js — stable chase camera: exponentially smoothed position a little
// behind and above the plane, looking down its nose; the field of view widens
// gently with speed so fast flight feels fast without fisheye.
'use strict';
const Camera = (() => {
  const pos=[0,130,260], look=[0,120,0];
  let dist=10.0; // chase distance; the poster cover preset pulls it in closer
  function setDist(d){ dist=d; }
  function reset(p){ pos[0]=p[0]; pos[1]=p[1]+3.0; pos[2]=p[2]+dist; }
  function update(plane, dt){
    const back=[Math.sin(plane.heading),0,-Math.cos(plane.heading)];
    const want=[plane.pos[0]-back[0]*dist, plane.pos[1]+3.0+plane.pitch*8, plane.pos[2]-back[2]*dist];
    const k=1-Math.pow(0.0018, dt); // frame-rate independent smoothing
    for(let i=0;i<3;i++) pos[i]+=(want[i]-pos[i])*k;
    const fwd=[Math.sin(plane.heading)*Math.cos(plane.pitch), Math.sin(plane.pitch), -Math.cos(plane.heading)*Math.cos(plane.pitch)];
    look[0]=plane.pos[0]+fwd[0]*48; look[1]=plane.pos[1]+fwd[1]*48-13; look[2]=plane.pos[2]+fwd[2]*48;
    return {pos:[...pos], look:[...look], fov: 1.15 + Math.min(0.18, plane.speed*0.0009)};
  }
  return {update, reset, setDist};
})();
