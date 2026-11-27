// progress.js — the session's depth systems, written for v8: a hangar of
// six refits bought with medal points, and twelve named feats tracked
// across every sortie flown in the session. Refits are not decoration —
// each one changes a number the flight model or a mission actually reads
// (fuel burn, top speed, damage taken, scoop power, medevac clock, ring
// capture radius), and the feats are judged from real sortie outcomes in
// main.js, never granted by the menu.
'use strict';
const Progress = (() => {
  // Six refits, each with a price in medal points and one real effect.
  const REFITS = [
    { id:'auxtank', name:'AUX TANK',    cost:2, desc:'Fuel burn ×0.75 — a second tank behind the seat.' },
    { id:'tunedprop', name:'TUNED PROP', cost:2, desc:'Top speed +8 KT — a polished, re-pitched propeller.' },
    { id:'lightframe', name:'LIGHT FRAME', cost:3, desc:'Damage taken ×0.6 — doped linen over a lighter frame.' },
    { id:'widescoop', name:'WIDE SCOOPS', cost:2, desc:'Each water drop hits for 65 — twin hull scoops.' },
    { id:'stretcher', name:'STRETCHER RIG', cost:2, desc:'Medevac clock +60 s — a proper stretcher mount.' },
    { id:'surveylens', name:'SURVEY LENS', cost:1, desc:'Ring capture radius +6 m — a lens that reads the gates early.' },
  ];
  // Twelve feats. The check notes say where each is judged.
  const FEATS = [
    { id:'firstwings', name:'FIRST WINGS',    desc:'Complete any sortie' },
    { id:'smoothop',   name:'SMOOTH OPERATOR', desc:'A SMOOTH touchdown' },
    { id:'triplesmooth', name:'TRIPLE SMOOTH', desc:'3 SMOOTH touchdowns in one session' },
    { id:'noscratch',  name:'NO-SCRATCH',     desc:'Complete a sortie under 5% damage' },
    { id:'fulltank',   name:'FULL-TANK FINISHER', desc:'Complete a sortie with over 50% fuel left' },
    { id:'ringperfect', name:'RING PERFECT',  desc:'Thread every ring of a ring sortie' },
    { id:'fireace',    name:'FIRE ACE',       desc:'Put the forest fire out' },
    { id:'lifesaver',  name:'LIFESAVER',      desc:'Deliver a patient to the hospital pad' },
    { id:'nightowl',   name:'NIGHT OWL',      desc:'Complete Night Survey' },
    { id:'cargopro',   name:'CARGO PRO',      desc:'Deliver Bram\u2019s cargo to the farmstead' },
    { id:'slalomstar', name:'SLALOM STAR',    desc:'Complete Slalom Gates' },
    { id:'veteran',    name:'VALLEY VETERAN', desc:'Earn a medal in 4 different sorties' },
  ];
  const session = {
    points: 0, spent: 0,
    owned: {},            // refit id -> true
    feats: {},            // feat id -> true
    smoothLandings: 0,
    medaledSorties: {},   // mission id -> true
    completedSorties: {}, // mission id -> true
  };
  const MEDAL_POINTS = { GOLD:3, SILVER:2, BRONZE:1 };
  function balance(){ return session.points - session.spent; }
  function buy(id){
    const r = REFITS.find(x=>x.id===id);
    if (!r || session.owned[id] || balance() < r.cost) return false;
    session.owned[id] = true; session.spent += r.cost; return true;
  }
  function award(medal){ if (medal && MEDAL_POINTS[medal]) session.points += MEDAL_POINTS[medal]; }
  function earn(id){ if (!session.feats[id]){ session.feats[id]=true; return true; } return false; }
  function featsEarned(){ return FEATS.filter(f=>session.feats[f.id]); }
  // The effect readers — the flight model and missions call these, so an
  // unowned refit changes nothing and an owned one always shows.
  function fuelMult(){ return session.owned.auxtank ? 0.75 : 1; }
  function speedBonus(){ return session.owned.tunedprop ? 8 : 0; }
  function damageMult(){ return session.owned.lightframe ? 0.6 : 1; }
  function dropDamage(){ return session.owned.widescoop ? 65 : 50; }
  function clockBonus(){ return session.owned.stretcher ? 60 : 0; }
  function ringBonus(){ return session.owned.surveylens ? 6 : 0; }
  // Demo state for the seeded menu screenshot only: a returning pilot with
  // two refits fitted, six feats on the board and points in hand, so the
  // title screen shows the systems as a player would actually meet them.
  function demo(){
    session.points = 9; session.spent = 4;
    session.owned.auxtank = true; session.owned.widescoop = true;
    for (const id of ['firstwings','smoothop','noscratch','ringperfect','fireace','lifesaver']) session.feats[id]=true;
    session.medaledSorties = { survey:true, fire:true, medevac:true };
    session.completedSorties = { survey:true, fire:true, medevac:true };
    session.smoothLandings = 2;
  }
  return { REFITS, FEATS, session, MEDAL_POINTS, balance, buy, award, earn, featsEarned,
           fuelMult, speedBonus, damageMult, dropDamage, clockBonus, ringBonus, demo };
})();
