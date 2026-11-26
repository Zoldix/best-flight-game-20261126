// terrain.js — the sunset valley and everything in it: heightmap-noise mountains
// around a bending valley axis, a ribbon river and a lake, trees, the marked
// runway "27", and the sky (gradient dome, radial-gradient sun, clouds).
// Everything is generated from seeded noise only, so the world is identical
// on every run and the screenshots reproduce byte for byte.
'use strict';
const Terrain = (() => {
  const rng = makeRng(20261126);
  const gridNoise = [];
  for (let i=0;i<256;i++) gridNoise.push(rng());
  function hash(ix,iz){ return gridNoise[((ix*73+iz*149)%256+256)%256]; }
  function noise(x,z){ const gx=x/260, gz=z/260, ix=Math.floor(gx), iz=Math.floor(gz);
    const fx=gx-ix, fz=gz-iz, sx=fx*fx*(3-2*fx), sz=fz*fz*(3-2*fz);
    const a=hash(ix,iz), b=hash(ix+1,iz), c=hash(ix,iz+1), d=hash(ix+1,iz+1);
    return (a+(b-a)*sx+(c-a)*sz+(a-b-c+d)*sx*sz)*2-1; }
  // The valley axis bends as it runs north; the bend fades out before the
  // runway so the strip and its final approach stay straight and level.
  function valleyBend(z){ const f = z<-4600 ? Math.max(0, 1-(-z-4600)/500) : 1;
    return (150*Math.sin(z*0.00052)+80*Math.sin(z*0.00127+1.7)) * f; }
  function riverX(z){ const base = valleyBend(z)*0.55 + 90*Math.sin(z*0.0011)+40*Math.sin(z*0.00037);
    // Past the strip the river swings west across the valley floor, so it
    // crosses the cover poster's foreground below the runway. The swing is
    // spread over 320 m: compressed into 160 m the centreline shifted
    // further per ribbon step than the ribbon is wide, folding the ribbon
    // into stripes at the bend.
    return z<-4850 ? base - 175*Math.min(1,(-z-4850)/320) : base; }
  function river2X(z){ return 55 + 95*Math.sin(z*0.0021); } // the far reach, beyond the runway (v2: swings right across the view axis past the strip, so the winding river reads in the cover)
  function fbm(x,z){ return noise(x,z)*0.60 + noise(x*2.7,z*2.7)*0.28 + noise(x*6.3,z*6.3)*0.12; }
  // Full plateau |x|<100: every terrain grid vertex under the strip sits at
  // exactly h=10, so the strip mesh and its markings are never buried.
  function runwayBlend(x,z){ const inX=Math.max(0,Math.min(1,(170-Math.abs(x))/70)), inZ=(z<-5030&&z>-5770)?1:0; return Math.min(inX,1)*inZ; }
  function heightAt(x,z){
    const bx = x - valleyBend(z);
    const ax=Math.abs(bx);
    const side = bx<0 ? 1.38 : 0.68; // west range much higher than east (v2: stronger asymmetry, no symmetric bowl)
    const jag = 0.72 + 0.55*Math.abs(noise(x/150, z/150)) + 0.30*Math.abs(noise(x/47, z/47));
    const m = Math.max(0,(ax-330)/620);
    // Longitudinal ridge variation: the ranges swell and pinch along their
    // length instead of forming one uniform bowl rim.
    const swell = 0.82 + 0.38*Math.abs(noise(z/330, 7.3)) + 0.22*Math.abs(noise(x/90, z/90));
    let h = 6 + noise(x,z)*7 + (m**2*185 + Math.max(0,(ax-700)/500)**2*150) * side * jag * swell;
    h += m * fbm(x, z) * 60; // heightmap-noise rolling mountain surface
    h += Math.max(0,(-z-4300)/900)**2*35;
    // Valley head: high and broken at the sides, but pinched to a low gorge
    // on the axis (v2), so the far river stays visible past the strip.
    if (z<-5650){ const gorge = Math.min(1, Math.max(0.22, (Math.abs(bx)-170)/260));
      h += Math.min(150, (-z-5650)/6) * (0.45+0.75*Math.max(0,fbm(x+900, z))) * gorge; }
    const rd = Math.abs(x-riverX(z));
    if (rd<46 && Math.abs(bx)<380 && z>-4900) h = Math.min(h, 1.5); // river channel
    const lake = ((x-230)/190)**2 + ((z+3750)/230)**2;
    if (lake<1) h = Math.min(h, 2.0); // lake bed
    const rb = runwayBlend(x,z); if (rb>0) h = h*(1-rb)+10*rb;
    // The west swing past the strip cuts its channel through the apron edge
    // as well, or the plateau blend would bury this reach of the river.
    if (z<-4850 && z>-5250 && Math.abs(x-riverX(z))<40) h = Math.min(h, 1.5);
    if (z<-5760 && z>-6180 && Math.abs(x-river2X(z))<42) h = Math.min(h, 2.0); // far river channel
    // Medevac pads sit dead flat: the clearing pad at the valley floor's own
    // height, the hospital pad at airfield height beside the strip.
    // v2: the flat radius must span several 60 m terrain-grid cells, or the
    // pad mesh (drawn at the flat height) sinks under the un-flattened
    // surface between grid vertices and can never be seen.
    const pd1 = Math.hypot(x-330, z+1400);
    if (pd1<45) h = Math.min(h, 6); else if (pd1<85) h = Math.min(h, 6+(pd1-45)*0.35);
    const pd2 = Math.hypot(x-150, z+5400);
    if (pd2<45) h = 10; else if (pd2<85) h = h*(pd2-45)/40 + 10*(1-(pd2-45)/40);
    return h;
  }
  // Height-gradient palette in one sunset family:
  // valley green -> olive -> warm rock -> slate -> warm snow.
  function mixc(a,b,t){ return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; }
  function palette(h){
    const stops=[[0,[0.12,0.36,0.14]],[30,[0.27,0.42,0.15]],[70,[0.38,0.29,0.22]],[130,[0.34,0.28,0.38]],[190,[0.95,0.85,0.76]]];
    for(let i=1;i<stops.length;i++){ if(h<=stops[i][0]){ const t=(h-stops[i-1][0])/(stops[i][0]-stops[i-1][0]); return mixc(stops[i-1][1],stops[i][1],Math.max(0,Math.min(1,t))); } }
    return stops[stops.length-1][1];
  }
  function colorAt(x,z,h,seedKey){
    const rd=Math.abs(x-riverX(z));
    if (z>-5250 && rd<20 && Math.abs(x)<340 && h<4) return [0.12,0.42,0.80];       // river water
    if (z>-5250 && rd<42 && Math.abs(x)<340 && h<6) return [0.72,0.60,0.40];       // inner bank
    if (z>-5250 && rd<58 && Math.abs(x)<340 && h<8) return [0.78,0.66,0.44];       // outer bank
    const lake=((x-230)/190)**2+((z+3750)/230)**2;
    if (lake<0.82 && h<4) return [0.12,0.44,0.82];                                   // lake water
    if (lake<1.15 && h<8) return [0.78,0.66,0.44];                                   // lake shore
    if (runwayBlend(x,z)>0.6) return [0.52,0.50,0.48];                               // airfield apron
    let c = palette(h);
    const v = 0.90 + hash(seedKey, seedKey*3)*0.20;                                   // per-face variation
    return [c[0]*v, c[1]*v, c[2]*v];
  }
  function build(){
    const b=Render.builder(), X0=-1250,X1=1250,Z0=350,Z1=-6450,S=60;
    let qi=0;
    for(let x=X0;x<X1;x+=S) for(let z=Z0;z>Z1;z-=S){ qi++;
      const p=(xx,zz)=>[xx,heightAt(xx,zz),zz];
      const c=colorAt(x+S/2,z-S/2,heightAt(x+S/2,z-S/2),qi);
      b.quad(p(x,z),p(x,z-S),p(x+S,z-S),p(x+S,z),c);
    }
    // The river is a ribbon mesh that follows the curve, bank under water, so
    // it reads as a winding river instead of painted squares.
    for(let z=300; z>-5250; z-=40){ const cx=riverX(z), cx2=riverX(z-40);
      const bank=[0.72,0.60,0.40], water=[0.12,0.42,0.80], wy=2.6;
      b.quad([cx-26,wy-0.5,z],[cx2-26,wy-0.5,z-40],[cx2+26,wy-0.5,z-40],[cx+26,wy-0.5,z],bank);
      if (z<=-4360){
        // Sun glint on the foreground reach, built as the water's own
        // middle lane (same plane, adjacent, never overlapping): a raised
        // overlay lane drifted off the water wherever the river bends
        // sharply and striped the bank instead (round 4 fix).
        b.quad([cx-15,wy,z],[cx2-15,wy,z-40],[cx2-5,wy,z-40],[cx-5,wy,z],water);
        b.quad([cx-5,wy,z],[cx2-5,wy,z-40],[cx2+5,wy,z-40],[cx+5,wy,z],[1.0,0.78,0.42]);
        b.quad([cx+5,wy,z],[cx2+5,wy,z-40],[cx2+15,wy,z-40],[cx+15,wy,z],water);
      } else {
        b.quad([cx-15,wy,z],[cx2-15,wy,z-40],[cx2+15,wy,z-40],[cx+15,wy,z],water);
      }
    }
    // The far reach, beyond the runway's far end (v2: wider and a brighter
    // blue, so the winding river survives the cover's thumbnail test).
    for(let z=-5700; z>-6140; z-=40){ const cx=river2X(z), cx2=river2X(z-40);
      b.quad([cx-38,2.1,z],[cx2-38,2.1,z-40],[cx2+38,2.1,z-40],[cx+38,2.1,z],[0.72,0.60,0.40]);
      b.quad([cx-26,2.6,z],[cx2-26,2.6,z-40],[cx2+26,2.6,z-40],[cx+26,2.6,z],[0.16,0.52,0.95]); }
    // Lake: flat disc + shore ring at the lake centre.
    { const lx=230, lz=-3750, SEG2=22;
      for(let i=0;i<SEG2;i++){ const a1=i/SEG2*Math.PI*2, a2=(i+1)/SEG2*Math.PI*2;
        b.tri([lx,2.6,lz],[lx+Math.cos(a1)*205,2.1,lz+Math.sin(a1)*245],[lx+Math.cos(a2)*205,2.1,lz+Math.sin(a2)*245],[0.74,0.62,0.42]);
        b.tri([lx,2.7,lz],[lx+Math.cos(a1)*168,2.7,lz+Math.sin(a1)*200],[lx+Math.cos(a2)*168,2.7,lz+Math.sin(a2)*200],[0.12,0.44,0.82]); } }
    // Trees: trunk + two crossed conifer triangles, kept out of the river,
    // the lake and off the airfield plateau. Round 4: denser (330) with two
    // canopy greens, plus low bushes, so the valley floor reads as forest.
    const tr=makeRng(777);
    const inLake=(x,z)=>(((x-230)/190)**2+((z+3750)/230)**2)<1.3;
    for(let i=0;i<330;i++){ const x=(tr()*2-1)*300, z=200-tr()*5600;
      if (Math.abs(x-riverX(z))<60 || runwayBlend(x,z)>0 || inLake(x,z)) continue;
      const h=heightAt(x,z), s=7+tr()*7, g=tr()<0.5?[0.08,0.32,0.12]:[0.13,0.40,0.15];
      b.box(x,h+2,z,1.6,4,1.6,[0.36,0.24,0.12]);
      b.tri([x-s,h+3,z],[x+s,h+3,z],[x,h+3+s*1.7,z],g);
      b.tri([x,h+3,z-s],[x,h+3,z+s],[x,h+3+s*1.7,z],g);
    }
    for(let i=0;i<130;i++){ const x=(tr()*2-1)*320, z=200-tr()*5600;
      if (Math.abs(x-riverX(z))<48 || runwayBlend(x,z)>0 || inLake(x,z)) continue;
      const h=heightAt(x,z), w=2.6+tr()*2.4;
      b.box(x,h+1.1,z,w,2.2+tr()*1.4,w*0.8,tr()<0.5?[0.10,0.34,0.13]:[0.16,0.42,0.16]);
    }
    // Valley mist (round 4): broken pale patches pooling on the valley
    // floor, never one full-width sheet — a single sheet read as a solid
    // slab from a low camera, so the mist is laid as offset clusters.
    for(const [mz,tone] of [[-700,[0.90,0.76,0.74]],[-1500,[0.93,0.79,0.77]],[-2900,[0.94,0.81,0.79]],[-4300,[0.93,0.80,0.77]],[-5980,[0.95,0.83,0.81]]]){
      const cx=valleyBend(mz)*0.8, gy=heightAt(cx,mz);
      for(const [ox,pw,pd,py] of [[-190,300,95,7],[-30,230,70,11],[130,280,85,8],[265,190,60,12],[-300,170,55,12]]){
        const px=cx+ox;
        b.quad([px-pw/2,gy+py,mz-pd/2],[px-pw/2,gy+py,mz+pd/2],[px+pw/2,gy+py,mz+pd/2],[px+pw/2,gy+py,mz-pd/2],tone);
      }
    }
    // ---- runway: strip + BIG white markings readable from final approach ----
    const ry=10.4, my=11.3, W=[1.0,1.0,0.98];
    b.quad([-30,ry,-5080],[-30,ry,-5720],[30,ry,-5720],[30,ry,-5080],[0.09,0.09,0.11]);
    // solid edge lines the full length of the strip
    b.quad([-29,my,-5080],[-29,my,-5720],[-25,my,-5720],[-25,my,-5080],W);
    b.quad([25,my,-5080],[25,my,-5720],[29,my,-5720],[29,my,-5080],W);
    // centreline: long wide dashes
    for(let z=-5260; z>-5660; z-=92) b.quad([-3.5,my,z],[-3.5,my,z-58],[3.5,my,z-58],[3.5,my,z],W);
    // threshold: six big piano bars
    for(let i=0;i<6;i++){ const x0=-26+i*9.4;
      b.quad([x0,my,-5092],[x0,my,-5158],[x0+5.4,my,-5158],[x0+5.4,my,-5092],W); }
    // touchdown-zone bar pairs
    for(const zz of [-5330,-5450]) for(const sx of [-1,1])
      b.quad([sx*10-2.5,my,zz],[sx*10-2.5,my,zz-42],[sx*10+2.5,my,zz-42],[sx*10+2.5,my,zz],W);
    // amber edge lights
    for(let z=-5120; z>-5700; z-=95){ b.box(-33,11.6,z,2.4,2.4,2.4,[1.0,0.80,0.30]); b.box(33,11.6,z,2.4,2.4,2.4,[1.0,0.80,0.30]); }
    // Runway numbers as seven-segment style digits, flat on the strip.
    const SEG={ '2':[1,1,0,1,1,0,1], '7':[1,1,1,0,0,0,0] };
    function digit(ch, ox, oz){ const w=26, hh=46, th=7, y=my+0.02, col=[0.97,0.95,0.90], s=SEG[ch];
      const seg=(x0,z0,x1,z1)=>b.quad([ox+x0,y,oz+z0],[ox+x0,y,oz+z1],[ox+x1,y,oz+z1],[ox+x1,y,oz+z0],col);
      if(s[0]) seg(0,0,w,th); if(s[1]) seg(w-th,0,w,hh/2); if(s[2]) seg(w-th,hh/2,w,hh);
      if(s[3]) seg(0,hh-th,w,hh); if(s[4]) seg(0,hh/2,th,hh); if(s[5]) seg(0,0,th,hh/2); if(s[6]) seg(0,hh/2-th/2,w,hh/2+th/2); }
    digit('2', -29, -5245); digit('7', 4, -5245);
    // ---- the forest fire (Scoop & Drop): flame cones + a smoke column ----
    { const fx=-430, fz=-2550, gy=heightAt(fx,fz), fr=makeRng(99);
      for(let i=0;i<9;i++){ const ox=(fr()*2-1)*34, oz=(fr()*2-1)*34, fh=14+fr()*20, fw=7+fr()*6;
        const base=heightAt(fx+ox,fz+oz);
        b.tri([fx+ox-fw,base,fz+oz],[fx+ox+fw,base,fz+oz],[fx+ox,base+fh,fz+oz],[1.0,0.42,0.06]);
        b.tri([fx+ox,base,fz+oz-fw],[fx+ox,base,fz+oz+fw],[fx+ox,base+fh*0.8,fz+oz],[1.0,0.62,0.10]);
        b.tri([fx+ox-fw*0.5,base,fz+oz],[fx+ox+fw*0.5,base,fz+oz],[fx+ox,base+fh*0.55,fz+oz],[1.0,0.85,0.25]); }
      for(let i=0;i<5;i++){ const sy=gy+26+i*17, ss=13+i*4.5;
        b.box(fx+(fr()*2-1)*8 - i*3, sy, fz+(fr()*2-1)*8, ss,sy*0+13,ss*0.8, [0.32,0.30,0.32]); }
      // scorched earth under the flames
      for(let i=0;i<10;i++){ const a1=i/10*Math.PI*2, a2=(i+1)/10*Math.PI*2;
        b.tri([fx,gy+0.25,fz],[fx+Math.cos(a1)*52,gy+0.25,fz+Math.sin(a1)*52],[fx+Math.cos(a2)*52,gy+0.25,fz+Math.sin(a2)*52],[0.16,0.13,0.11]); } }
    // ---- medevac pads: dark disc, white cross, amber corner lights ----
    function pad(cx,cz){
      // v2: a bigger disc and cross (r 40, arms 20) — the original r 26 pad
      // read as a sliver from any chase-camera final and hid behind the
      // tailplane; the landing check itself still uses the mission radius.
      const gy=heightAt(cx,cz), SEG2=20;
      for(let i=0;i<SEG2;i++){ const a1=i/SEG2*Math.PI*2, a2=(i+1)/SEG2*Math.PI*2;
        b.tri([cx,gy+0.3,cz],[cx+Math.cos(a1)*40,gy+0.3,cz+Math.sin(a1)*40],[cx+Math.cos(a2)*40,gy+0.3,cz+Math.sin(a2)*40],[0.13,0.14,0.17]); }
      b.quad([cx-4.5,gy+0.45,cz-20],[cx-4.5,gy+0.45,cz+20],[cx+4.5,gy+0.45,cz+20],[cx+4.5,gy+0.45,cz-20],[0.95,0.95,0.92]);
      b.quad([cx-20,gy+0.45,cz-4.5],[cx-20,gy+0.45,cz+4.5],[cx+20,gy+0.45,cz+4.5],[cx+20,gy+0.45,cz-4.5],[0.95,0.95,0.92]);
      for(const [ox,oz] of [[-36,-36],[36,-36],[-36,36],[36,36]]) b.box(cx+ox,gy+1.2,cz+oz,2.6,2.6,2.6,[1.0,0.80,0.30]);
    }
    pad(330,-1400);   // clearing pickup pad
    // Airfield buildings east of the strip (round 6, from the user's
    // reference): two hangars, a control tower with a red beacon, and one
    // small block on the west side — plain boxes on the plateau (y=10).
    { const wall=[0.55,0.52,0.48], roof=[0.30,0.28,0.30];
      b.box(100,15,-5260,34,10,20,wall); b.box(100,20.8,-5260,36,1.6,22,roof);
      b.box(100,15,-5450,34,10,20,wall); b.box(100,20.8,-5450,36,1.6,22,roof);
      b.box(128,23,-5580,7,26,7,[0.62,0.60,0.56]);           // tower shaft
      b.box(128,38.5,-5580,12,5,12,[0.20,0.30,0.42]);        // tower cab
      b.box(128,42,-5580,2.4,2,2.4,[1.0,0.20,0.20]);         // beacon
      b.box(-88,14,-5360,22,8,16,wall); b.box(-88,18.6,-5360,24,1.4,18,roof);
    }
    // A bridge where the foreground river swings west (round 6): deck on
    // two piers with low rails, crossing the river at z -4980, x about -138.
    { const deck=[0.42,0.40,0.38], pier=[0.36,0.34,0.32];
      b.box(-138,7.6,-4980,118,2.2,13,deck);
      b.box(-172,3.8,-4980,5,7.6,10,pier); b.box(-104,3.8,-4980,5,7.6,10,pier);
      b.box(-138,9.6,-4986,118,1.8,1.2,deck); b.box(-138,9.6,-4974,118,1.8,1.2,deck);
    }
    pad(150,-5400);   // hospital helipad, beside the strip
    return b.build();
  }
  // ---- sky: gradient dome + radial-gradient sun + clouds, one sunset palette ----
  function skyColor(y, R){
    const t=Math.max(0,Math.min(1, y/R*0.5+0.5));
    const stops=[[0.42,[1.00,0.60,0.34]],[0.55,[0.94,0.52,0.50]],[0.75,[0.42,0.36,0.64]],[1.0,[0.13,0.16,0.38]]];
    for(let i=1;i<stops.length;i++){ if(t<=stops[i][0]){ const u=(t-stops[i-1][0])/(stops[i][0]-stops[i-1][0]); return mixc(stops[i-1][1],stops[i][1],Math.max(0,Math.min(1,u))); } }
    return stops[stops.length-1][1];
  }
  function buildSky(){
    const b=Render.builder(), C=[0,0,-2700], R=3800, LA=26, LO=22;
    for(let i=0;i<LA;i++){ const th1=i/LA*Math.PI, th2=(i+1)/LA*Math.PI;
      for(let j=0;j<LO;j++){ const ph1=j/LO*Math.PI*2, ph2=(j+1)/LO*Math.PI*2;
        const pt=(th,ph)=>[C[0]+R*Math.sin(th)*Math.cos(ph), C[1]+R*Math.cos(th), C[2]+R*Math.sin(th)*Math.sin(ph)];
        const a=pt(th1,ph1), c2=pt(th2,ph1), d=pt(th2,ph2), e=pt(th1,ph2);
        b.quad(a,c2,d,e, skyColor(a[1], R));
      } }
    function disc(cx,cy,cz,r,col){ const SEG2=24;
      for(let i=0;i<SEG2;i++){ const a1=i/SEG2*Math.PI*2, a2=(i+1)/SEG2*Math.PI*2;
        b.tri([cx,cy,cz],[cx+Math.cos(a1)*r,cy+Math.sin(a1)*r,cz],[cx+Math.cos(a2)*r,cy+Math.sin(a2)*r,cz],col); } }
    // The sun is a radial gradient built from concentric discs: the outermost
    // layer is the horizon sky colour, so the glow melts into the dome, and
    // each inner layer steps toward the pale core. All layers sit inside the
    // dome's north wall, or the dome would swallow them.
    { const layers=[[430,[0.93,0.56,0.47]],[375,[0.96,0.58,0.42]],[325,[0.99,0.60,0.37]],[278,[1.02,0.63,0.33]],
                    [235,[1.04,0.67,0.33]],[198,[1.03,0.73,0.40]],[163,[1.02,0.80,0.50]],[132,[1.00,0.88,0.63]]];
      layers.forEach(([r,c],i)=> disc(-520,800,-5965+i*3, r, c)); }
    // Clouds: clusters of small boxes with bumpier undersides, lit tops and
    // shaded bottoms in the same pink family as the sky.
    const cr=makeRng(4242);
    for(let i=0;i<15;i++){ const cx=(cr()*2-1)*2300, cy=560+cr()*260, cz=-600-cr()*5600, s=60+cr()*70;
      if (Math.hypot(cx+520, cz+5950)<900) continue; // keep the sun clear
      const top=[0.99,0.80,0.74], under=[0.74,0.52,0.60];
      for(let k=0;k<6;k++){ const ox=(cr()*2-1)*s*0.8, oz=(cr()*2-1)*s*0.35, oy=(cr()*0.6)*20, w=45+cr()*55;
        b.box(cx+ox,cy+oy,cz+oz, w,26+cr()*20,w*0.7, k%2? top: under); } }
    // Hero clouds placed in the northern view corridor, so the screenshots
    // that matter actually contain clouds.
    const hero=[[-380,430,-5650],[430,505,-6000],[-60,395,-5300],[150,470,-5550]];
    for(const [hx,hy,hz] of hero){ const hr=makeRng(Math.abs(hx)+Math.abs(hz));
      for(let k=0;k<7;k++){ const ox=(hr()*2-1)*55, oz=(hr()*2-1)*22, oy=(hr()*2-1)*17, w=36+hr()*48;
        b.box(hx+ox,hy+oy,hz+oz, w,26+hr()*20,w*0.7, k%2? [0.99,0.80,0.74]:[0.74,0.52,0.60]); } }
    return b.build();
  }
  return {heightAt, build, buildSky, riverX};
})();
