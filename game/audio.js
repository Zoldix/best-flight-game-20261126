// audio.js — tiny WebAudio engine hum + ring chime. Created only after a user gesture.
'use strict';
const AudioSys = (() => {
  let ctx=null, osc=null, gain=null;
  function start(){ try{ if(ctx) return; ctx=new (window.AudioContext||window.webkitAudioContext)();
    osc=ctx.createOscillator(); gain=ctx.createGain(); osc.type='sawtooth'; osc.frequency.value=62;
    gain.gain.value=0.035; osc.connect(gain); gain.connect(ctx.destination); osc.start(); }catch(e){} }
  function setThrottle(t){ if(osc) osc.frequency.value=55+t*55; }
  function chime(){ if(!ctx) return; try{ const o=ctx.createOscillator(), g=ctx.createGain();
    o.type='sine'; o.frequency.value=880; g.gain.value=0.06; o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime+0.18); }catch(e){} }
  return {start, setThrottle, chime};
})();
