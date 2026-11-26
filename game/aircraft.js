// aircraft.js — the plane, built from parts so it reads as a real aeroplane
// from the chase camera: fuselage, nose cowling, canopy, wing with a stripe,
// tailplane and fin, fixed gear with wheels, and a separate propeller mesh
// that main.js spins.
'use strict';
const Aircraft = (() => {
  function build(){
    const b=Render.builder();
    const body=[0.98,0.32,0.10], dark=[0.22,0.20,0.24], cream=[1.0,0.94,0.84], glass=[0.20,0.55,0.90];
    b.box(0,0,0.6, 1.5,1.5,5.2, body);            // fuselage
    b.box(0,0.15,-2.4, 1.1,1.1,1.8, body);          // nose cowling
    b.box(0,0.95,-0.4, 1.15,0.75,1.9, glass);       // canopy
    b.box(0,0,0.4, 8.6,0.22,1.5, cream);            // main wing
    b.box(0,0.14,0.4, 8.6,0.06,0.5, body);          // wing stripe
    b.box(-4.0,0,0.4, 0.7,0.85,1.4, body);          // wingtip float/strut L
    b.box( 4.0,0,0.4, 0.7,0.85,1.4, body);          // wingtip R
    b.box(0,0.1,3.1, 3.4,0.2,1.0, cream);           // tailplane
    b.box(0,0.85,3.1, 0.22,1.7,1.0, body);          // vertical fin
    b.box(0,-0.2,3.35, 0.9,0.9,0.7, dark);          // tail cone
    b.box(-0.65,-1.05,0.9, 0.28,0.9,0.28, dark);    // gear leg L
    b.box( 0.65,-1.05,0.9, 0.28,0.9,0.28, dark);    // gear leg R
    b.box(-0.65,-1.55,0.9, 0.55,0.55,0.55, [0.08,0.08,0.09]); // wheel L
    b.box( 0.65,-1.55,0.9, 0.55,0.55,0.55, [0.08,0.08,0.09]); // wheel R
    b.box(0,0,-3.45, 0.5,0.5,0.35, dark);           // prop hub
    return b.build();
  }
  function buildPropeller(){
    const b=Render.builder(), col=[0.12,0.12,0.13];
    b.box(0,0,0, 0.42,4.6,0.10, col);   // vertical blade pair
    b.box(0,0,0, 4.6,0.42,0.10, col);   // horizontal blade pair
    return b.build();
  }
  return {build, buildPropeller};
})();
