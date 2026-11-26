// render.js — WebGL renderer, matrix math, mesh builder. No network, no random.
// One shader for the whole world: flat-shaded triangles with a warm/cool sun
// tint and distance fog. fogScale < 0 draws a mesh unlit and unfogged (the sky).
'use strict';
const Render = (() => {
  let gl, prog, aPos, aCol, aNor, uMVP, uFog, uFogScale;
  function init(canvas) {
    gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) throw new Error('WebGL unavailable');
    const vs = `attribute vec3 p; attribute vec3 c; attribute vec3 n;
      uniform mat4 mvp; varying vec3 vc; varying vec3 vn; varying float vd;
      void main(){ vc=c; vn=n; vec4 wp=mvp*vec4(p,1.0); gl_Position=wp; vd=wp.w; }`;
    const fs = `precision mediump float; varying vec3 vc; varying vec3 vn; varying float vd;
      uniform vec3 fog; uniform float fogScale;
      void main(){ vec3 L=normalize(vec3(-0.45,0.85,-0.35)); float d=max(dot(normalize(vn),L),0.0);
        float li = fogScale < -0.5 ? 1.0 : 0.62+0.50*d;
        if (fogScale > -0.5) li = floor(li*14.0+0.5)/14.0; // v7: banded light — 14 soft steps read as smooth shading but keep the screenshots compressible (a continuous ramp cost ~90 KB of PNG)
        vec3 col=vc*li*(0.96+0.10*d);
        if (fogScale > -0.5) col *= mix(vec3(0.88,0.92,1.04), vec3(1.08,1.00,0.90), d); // v6: high day sun, gentler warm/cool split (was a low sunset sun)
        float f = fogScale < -0.5 ? 0.0 : smoothstep(700.0,3800.0,vd)*fogScale; col=mix(col,fog,f*0.88);
        if (fogScale > -0.5) col = floor(col*28.0+0.5)/28.0; // v7: posterise to 28 steps per channel — soft bands, far fewer distinct colours, screenshots stay under the cap
        gl_FragColor=vec4(col,1.0); }`;
    function sh(t,s){ const o=gl.createShader(t); gl.shaderSource(o,s); gl.compileShader(o);
      if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; }
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog); gl.useProgram(prog);
    aPos=gl.getAttribLocation(prog,'p'); aCol=gl.getAttribLocation(prog,'c'); aNor=gl.getAttribLocation(prog,'n');
    uMVP=gl.getUniformLocation(prog,'mvp'); uFog=gl.getUniformLocation(prog,'fog'); uFogScale=gl.getUniformLocation(prog,'fogScale');
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    return gl;
  }
  // column-major mat4 helpers
  function ident(){ return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; }
  function mul(a,b){ const o=new Array(16); for(let c=0;c<4;c++) for(let r=0;r<4;r++){ let s=0; for(let k=0;k<4;k++) s+=a[k*4+r]*b[c*4+k]; o[c*4+r]=s; } return o; }
  function persp(fov,asp,n,f){ const t=1/Math.tan(fov/2), d=1/(n-f);
    return [t/asp,0,0,0, 0,t,0,0, 0,0,(f+n)*d,-1, 0,0,2*f*n*d,0]; }
  function lookAt(e,c,up){ const z=norm(sub(e,c)), x=norm(cross(up,z)), y=cross(z,x);
    return mul([x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0, 0,0,0,1],
                 [1,0,0,0, 0,1,0,0, 0,0,1,0, -e[0],-e[1],-e[2],1]); }
  function trans(x,y,z){ const m=ident(); m[12]=x; m[13]=y; m[14]=z; return m; }
  function rotY(a){ const c=Math.cos(a),s=Math.sin(a); return [c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]; }
  function rotX(a){ const c=Math.cos(a),s=Math.sin(a); return [1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]; }
  function rotZ(a){ const c=Math.cos(a),s=Math.sin(a); return [c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]; }
  function sub(a,b){ return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]; }
  function cross(a,b){ return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
  function norm(a){ const l=Math.hypot(a[0],a[1],a[2])||1; return [a[0]/l,a[1]/l,a[2]/l]; }
  // Mesh builder: non-indexed triangles with flat normals, one colour per face.
  function builder(){ const P=[],C=[],N=[];
    function tri(a,b,c,col){ const n=norm(cross(sub(b,a),sub(c,a)));
      for(const v of [a,b,c]){ P.push(v[0],v[1],v[2]); C.push(col[0],col[1],col[2]); N.push(n[0],n[1],n[2]); } }
    function quad(a,b,c,d,col){ tri(a,b,c,col); tri(a,c,d,col); }
    // v7: per-vertex colour + normal variants — the terrain grid and the
    // sky dome emit these so the shader interpolates light and colour
    // smoothly across a face (smooth shading), while props and the plane
    // keep the crisp flat-shaded tri/quad path.
    function triV(a,b,c,cols,nrms){ const vs=[a,b,c];
      for(let i=0;i<3;i++){ P.push(vs[i][0],vs[i][1],vs[i][2]); C.push(cols[i][0],cols[i][1],cols[i][2]); N.push(nrms[i][0],nrms[i][1],nrms[i][2]); } }
    function quadV(a,b,c,d,cols,nrms){ triV(a,b,c,[cols[0],cols[1],cols[2]],[nrms[0],nrms[1],nrms[2]]);
      triV(a,c,d,[cols[0],cols[2],cols[3]],[nrms[0],nrms[2],nrms[3]]); }
    function box(cx,cy,cz,sx,sy,sz,col){ const x0=cx-sx/2,x1=cx+sx/2,y0=cy-sy/2,y1=cy+sy/2,z0=cz-sz/2,z1=cz+sz/2;
      quad([x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1],col);
      quad([x0,y0,z1],[x1,y0,z1],[x1,y0,z0],[x0,y0,z0],col);
      quad([x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1],col);
      quad([x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[x0,y0,z0],col);
      quad([x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],col);
      quad([x1,y0,z1],[x0,y0,z1],[x0,y1,z1],[x1,y1,z1],col); }
    function build(){ const vao={count:P.length/3};
      function buf(data,loc){ const b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW); return {b,loc}; }
      vao.bufs=[buf(P,aPos),buf(C,aCol),buf(N,aNor)]; return vao; }
    return {tri,quad,triV,quadV,box,build,P};
  }
  function draw(mesh, mvp, fog, fogScale){ gl.uniformMatrix4fv(uMVP,false,mvp); gl.uniform3fv(uFog,fog); gl.uniform1f(uFogScale, fogScale===undefined?1:fogScale);
    for(const {b,loc} of mesh.bufs){ gl.bindBuffer(gl.ARRAY_BUFFER,b); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,3,gl.FLOAT,false,0,0); }
    gl.drawArrays(gl.TRIANGLES,0,mesh.count); }
  function clear(r,g,b){ gl.viewport(0,0,gl.canvas.width,gl.canvas.height); gl.clearColor(r,g,b,1); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT); }
  return {init,builder,draw,clear,ident,mul,persp,lookAt,trans,rotY,rotX,rotZ,norm,sub};
})();
// Seeded RNG (mulberry32) — deterministic, no Math.random anywhere in the game.
function makeRng(seed){ let a=seed>>>0; return function(){ a|=0; a=(a+0x6D2B79F5)|0;
  let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t;
  return ((t^(t>>>14))>>>0)/4294967296; }; }
