/* smol brains 2 — render.js
   Custom WebGL renderer for the island: a tilted orthographic camera (pan / zoom / rotate), flat-shaded
   terrain chunks with LOD, a water mesh with depth colour and foam, instanced trees / rocks / items /
   buildings / creature parts, blob shadows, point lights for fires, cloud shadows, day/night and weather
   particles, and a 2D overlay canvas for names, speech bubbles and emotes.
   SB.Render.init(canvas, overlay) -> bool; setWorld(game); frame(game, dt, alpha); camera; pickGround; project. */
(function () {
  "use strict";
  var SB = window.SB;
  var R = (SB.Render = {});
  var GL = SB.GL, M4 = SB.GL.mat4, ME = SB.Meshes, WG = SB.WorldGen;
  var STRIDE = ME.STRIDE, ISTRIDE = 20;

  var ctx = null, gl = null, canvas = null, overlay = null, octx = null;
  var progs = {}, meshes = {}, chunks = [], ringBuf = null, cloudTex = null, seenTex = null, seenBuf = null, seenWorld = null;
  var T = null, game = null;
  var W = 1, H = 1, dpr = 1, quality = { scale: 1, decor: true, lights: 8 };
  var VP = M4.create(), V = M4.create(), P = M4.create();
  var time = 0;

  var cam = (R.camera = {
    x: 128, z: 128, y: 0, yaw: 0, pitch: 0.95, zoom: 11, tZoom: 11, tYaw: 0,
    follow: null, minZoom: 3.2, maxZoom: 120,
    vx: 0, vz: 0, // pan inertia (world units / s)
    eye: [0, 0, 0], right: [1, 0, 0], up: [0, 1, 0], fwd: [0, 0, -1], halfW: 1, halfH: 1,
    shake: 0, intro: null,
    pov: null // {x, y, z, yaw, pitch, fov, far}: looking out of a possessed smol's eyes (possess.js)
  });

  /* ================= shaders ================= */

  var PREC = "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif";
  var LIGHT_GLSL = [
    "uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uSkyCol; uniform vec3 uGndCol; uniform vec3 uFogCol;",
    "uniform vec4 uFog; uniform vec4 uLP[8]; uniform vec3 uLC[8]; uniform float uNight; uniform float uNL;",
    "uniform sampler2D uCloud; uniform vec4 uCloudP;",
    "uniform sampler2D uSeen; uniform vec2 uSeenK;",
    // fog of war: unexplored land sits under a soft, slowly drifting sea of cloud
    "vec3 fow(vec3 c, vec3 w) {",
    "  if (uSeenK.y < 0.5) return c;",
    "  float s = smoothstep(0.2, 0.8, texture2D(uSeen, w.xz * uSeenK.x).r);",
    "  if (s > 0.999) return c;",
    "  float n = texture2D(uCloud, w.xz * 0.035 + uCloudP.xy * 0.6).r;",
    "  vec3 fc = mix(vec3(0.20, 0.19, 0.29), vec3(0.42, 0.40, 0.55), smoothstep(0.3, 0.75, n));",
    "  fc *= 0.55 + 0.45 * (1.0 - uNight * 0.7);",
    "  return mix(fc, c, s);",
    "}",
    "vec3 shade(vec3 col, vec3 n, vec3 w, float em, float fog) {",
    "  float sd = max(dot(n, uSunDir), 0.0);",
    "  float cl = texture2D(uCloud, w.xz * uCloudP.z + uCloudP.xy).r;",
    "  sd *= 1.0 - uCloudP.w * smoothstep(0.42, 0.72, cl);",
    "  vec3 amb = mix(uGndCol, uSkyCol, n.y * 0.5 + 0.5);",
    "  vec3 c = col * (amb * 1.0 + uSunCol * sd * 0.82);",
    "  for (int i = 0; i < 8; i++) {",
    "    if (float(i) >= uNL) break;",
    "    vec3 L = uLP[i].xyz - w; float d = length(L);",
    "    float a = max(0.0, 1.0 - d / max(uLP[i].w, 0.001)); a *= a;",
    "    c += col * uLC[i] * a * (0.35 + 0.65 * max(dot(n, L / max(d, 0.001)), 0.0));",
    "  }",
    "  c += col * em * (0.55 + uNight * 1.1);",
    "  c = c - max(c - 0.8, 0.0) * 0.55;",
    "  return fow(mix(c, uFogCol, fog), w);",
    "}"
  ].join("\n");

  var VS_TERRAIN = [
    "attribute vec3 aPos; attribute vec3 aNrm; attribute vec4 aCol; attribute vec4 aMisc;",
    "uniform mat4 uVP; uniform vec4 uFog; uniform vec4 uCam;",
    "varying vec3 vCol; varying vec3 vN; varying vec3 vW; varying float vFog; varying vec4 vMisc;",
    "void main() {",
    "  vCol = aCol.rgb; vN = aNrm; vW = aPos; vMisc = vec4(aCol.a, aMisc.xyz);",
    "  vFog = smoothstep(uFog.x, uFog.y, dot(aPos.xz - uCam.xy, uCam.zw)) * uFog.z;",
    "  gl_Position = uVP * vec4(aPos, 1.0);",
    "}"
  ].join("\n");
  var FS_TERRAIN = [
    PREC,
    LIGHT_GLSL,
    "uniform float uSnow; uniform float uWet;",
    "varying vec3 vCol; varying vec3 vN; varying vec3 vW; varying float vFog; varying vec4 vMisc;",
    "void main() {",
    "  vec3 n = normalize(vN);",
    "  vec3 col = vCol;",
    "  float s = smoothstep(0.28, 0.62, vMisc.x * uSnow + (n.y - 1.0) * 0.6);",
    "  col = mix(col, vec3(0.93, 0.95, 0.98), s);",
    "  col *= 1.0 - vMisc.y * 0.35;", // ambient occlusion under canopies
    "  col *= 1.0 - uWet * 0.18 * (1.0 - s);",
    "  gl_FragColor = vec4(shade(col, n, vW, vMisc.z * 0.5, vFog), 1.0);",
    "}"
  ].join("\n");

  var VS_OBJ = [
    "attribute vec3 aPos; attribute vec3 aNrm; attribute vec4 aCol; attribute vec2 aExt;",
    "attribute vec4 iM0; attribute vec4 iM1; attribute vec4 iM2; attribute vec4 iTint; attribute vec4 iExt;",
    "uniform mat4 uVP; uniform float uTime; uniform float uWind; uniform float uAutumn; uniform float uSnow; uniform vec4 uFog; uniform vec4 uCam;",
    "varying vec3 vCol; varying vec3 vN; varying vec3 vW; varying float vEm; varying float vFog;",
    "void main() {",
    "  vec4 p = vec4(aPos, 1.0);",
    "  vec3 w = vec3(dot(iM0, p), dot(iM1, p), dot(iM2, p));",
    "  float fl = aExt.x;",
    "  if (fl > 0.0) { float ph = uTime * 1.6 + iM0.w * 0.37 + iM2.w * 0.29; w.x += sin(ph) * fl * uWind * 0.1; w.z += cos(ph * 0.83) * fl * uWind * 0.07; }",
    "  vN = normalize(vec3(dot(iM0.xyz, aNrm), dot(iM1.xyz, aNrm), dot(iM2.xyz, aNrm)));",
    "  vec3 tint = iTint.rgb;",
    "  tint = mix(tint, vec3(1.45, 0.62, 0.22), uAutumn * iExt.x);",
    "  vCol = mix(aCol.rgb, aCol.rgb * tint, aCol.a);",
    "  float snowy = uSnow * smoothstep(0.35, 0.9, vN.y) * (0.35 + 0.65 * aCol.a) * (1.0 - aExt.y);",
    "  vCol = mix(vCol, vec3(0.93, 0.95, 0.99), snowy * 0.8);",
    "  vCol = mix(vCol, vec3(1.0), iExt.z);",
    "  vEm = aExt.y + iExt.y;",
    "  vW = w;",
    "  vFog = smoothstep(uFog.x, uFog.y, dot(w.xz - uCam.xy, uCam.zw)) * uFog.z;",
    "  gl_Position = uVP * vec4(w, 1.0);",
    "}"
  ].join("\n");
  var FS_OBJ = [
    PREC,
    LIGHT_GLSL,
    "varying vec3 vCol; varying vec3 vN; varying vec3 vW; varying float vEm; varying float vFog;",
    "void main() { gl_FragColor = vec4(shade(vCol, normalize(vN), vW, vEm, vFog), 1.0); }"
  ].join("\n");

  var VS_WATER = [
    "attribute vec3 aPos; attribute vec2 aInfo;",
    "uniform mat4 uVP; uniform float uTime; uniform vec4 uFog; uniform vec4 uCam;",
    "varying vec3 vW; varying float vDepth; varying float vRiver;",
    "void main() {",
    "  vec3 w = aPos;",
    "  float k = clamp(aInfo.x / 0.4, 0.0, 1.0);",
    "  w.y += (sin(uTime * 1.2 + w.x * 0.6 + w.z * 0.4) * 0.03 + sin(uTime * 0.7 - w.z * 0.9) * 0.02) * k;",
    "  vW = w; vDepth = aInfo.x; vRiver = aInfo.y;",
    "  gl_Position = uVP * vec4(w, 1.0);",
    "}"
  ].join("\n");
  var FS_WATER = [
    PREC,
    LIGHT_GLSL,
    "uniform float uTime; uniform vec3 uEye; uniform float uFreeze; uniform vec4 uCam;",
    "varying vec3 vW; varying float vDepth; varying float vRiver;",
    "void main() {",
    "  float d = vDepth;",
    "  vec2 flow = vec2(uTime * 0.02, uTime * 0.013) * (1.0 + vRiver * 6.0);",
    "  float n1 = texture2D(uCloud, vW.xz * 0.11 + flow).r;",
    "  float n2 = texture2D(uCloud, vW.xz * 0.23 - flow * 1.3 + 0.5).r;",
    "  vec3 shallow = vec3(0.42, 0.88, 0.88); vec3 deep = vec3(0.10, 0.36, 0.62);",
    "  vec3 col = mix(shallow, deep, smoothstep(0.0, 3.2, d));",
    "  vec3 nrm = normalize(vec3((n1 - 0.5) * 0.5, 1.0, (n2 - 0.5) * 0.5));",
    "  vec3 lit = shade(col, nrm, vW, 0.0, 0.0);",
    "  float seenW = uSeenK.y < 0.5 ? 1.0 : smoothstep(0.2, 0.8, texture2D(uSeen, vW.xz * uSeenK.x).r);",
    "  vec3 V = normalize(uEye - vW);",
    "  float spec = pow(max(dot(reflect(-uSunDir, nrm), V), 0.0), 60.0);",
    "  lit += uSunCol * spec * 0.9;",
    "  float foamLine = 0.26 + 0.07 * sin(uTime * 1.8 + vW.x * 1.3 + vW.z * 0.9);",
    "  float foam = smoothstep(foamLine, 0.0, d + (n1 - 0.5) * 0.12) * (1.0 - vRiver * 0.5);",
    "  foam += smoothstep(0.82, 0.92, n1 * n2 * 1.6) * 0.25 * vRiver;",
    "  foam += (1.0 - smoothstep(0.3, 0.62, d + (n2 - 0.5) * 0.1)) * 0.3 * (1.0 - vRiver);",
    "  lit = mix(lit, mix(uSkyCol + uSunCol * 0.6, vec3(1.0), 0.55), clamp(foam, 0.0, 1.0) * 0.85);",
    "  lit = mix(lit, vec3(0.85, 0.92, 0.98) * (uSkyCol + uSunCol * 0.5), uFreeze);",
    "  float a = mix(0.42, 0.9, smoothstep(0.0, 1.4, d));",
    "  a = max(a, clamp(foam, 0.0, 1.0)); a = max(a, uFreeze);",
    "  float fog = smoothstep(uFog.x, uFog.y, dot(vW.xz - uCam.xy, uCam.zw)) * uFog.z;",
    "  gl_FragColor = vec4(fow(mix(lit, uFogCol, fog), vW), mix(1.0, a, seenW));",
    "}"
  ].join("\n");

  var VS_PT = [
    "attribute vec3 aPos; attribute vec4 aCol; attribute float aSize;",
    "uniform mat4 uVP; uniform float uPx;",
    "varying vec4 vCol;",
    "void main() { vCol = aCol; gl_Position = uVP * vec4(aPos, 1.0); gl_PointSize = max(1.0, aSize * uPx); }"
  ].join("\n");
  var FS_PT = [
    PREC,
    "varying vec4 vCol;",
    "void main() { vec2 q = gl_PointCoord - 0.5; float d = dot(q, q); if (d > 0.25) discard; gl_FragColor = vec4(vCol.rgb, vCol.a * smoothstep(0.25, 0.12, d)); }"
  ].join("\n");

  var VS_LINE = [
    "attribute vec3 aPos; attribute vec4 aCol;",
    "uniform mat4 uVP; varying vec4 vCol;",
    "void main() { vCol = aCol; gl_Position = uVP * vec4(aPos, 1.0); }"
  ].join("\n");
  var FS_LINE = PREC + "\nvarying vec4 vCol; void main() { gl_FragColor = vCol; }";

  var VS_SHADOW = [
    "attribute vec3 aPos; attribute vec3 aUvA;",
    "uniform mat4 uVP; varying vec3 vUvA;",
    "void main() { vUvA = aUvA; gl_Position = uVP * vec4(aPos, 1.0); }"
  ].join("\n");
  var FS_SHADOW = [
    PREC, "varying vec3 vUvA; uniform vec3 uShadowCol;",
    "void main() { float d = dot(vUvA.xy, vUvA.xy); if (d > 1.0) discard; gl_FragColor = vec4(uShadowCol, vUvA.z * (1.0 - d) * (1.0 - d)); }"
  ].join("\n");

  // pixel mode post pass: the scene is drawn into an offscreen buffer, then copied to the screen with a
  // 1px dark outline around anything that stands clearly in front of what's behind it (trees, rocks, huts)
  var VS_POST = "attribute vec2 aPos; varying vec2 vUv; void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }";
  var FS_POST = [
    PREC,
    "uniform sampler2D uCol; uniform sampler2D uDep; uniform vec2 uTexel; uniform float uThr; uniform vec3 uInk; uniform vec3 uPersp;",
    "varying vec2 vUv;",
    // a perspective depth buffer isn't linear: turn it back into distance (uPersp: on, near, far)
    "float D(vec2 uv) { float z = texture2D(uDep, uv).r; if (uPersp.x < 0.5) return z; float n = uPersp.y, f = uPersp.z; return 2.0 * n * f / (f + n - (z * 2.0 - 1.0) * (f - n)); }",
    "void main() {",
    "  vec3 c = texture2D(uCol, vUv).rgb;",
    "  float d = D(vUv);",
    "  float n = min(min(D(vUv + vec2(uTexel.x, 0.0)), D(vUv - vec2(uTexel.x, 0.0))),",
    "               min(D(vUv + vec2(0.0, uTexel.y)), D(vUv - vec2(0.0, uTexel.y))));",
    "  float edge = uPersp.x > 0.5 ? step(0.3 + d * 0.15, d - n) * step(d, uPersp.z * 0.75) : step(uThr, d - n);",
    "  gl_FragColor = vec4(mix(c, c * 0.3 + uInk * 0.7, edge * 0.8), 1.0);",
    "}"
  ].join("\n");
  var post = null; // {fb, col, dep, w, h, prog, quad}

  // the sky behind a first-person view: horizon (the fog colour) up to the zenith, a sun disc, stars at night
  var VS_SKY = "attribute vec2 aPos; varying vec2 vP; void main() { vP = aPos; gl_Position = vec4(aPos, 0.9999, 1.0); }";
  var FS_SKY = [
    PREC,
    "uniform vec3 uHor; uniform vec3 uTop; uniform vec3 uFwd; uniform vec3 uRight; uniform vec3 uUp; uniform vec2 uTan; uniform vec3 uSun; uniform vec3 uSunCol; uniform float uNight;",
    "varying vec2 vP;",
    "void main() {",
    "  vec3 d = normalize(uFwd + uRight * vP.x * uTan.x + uUp * vP.y * uTan.y);",
    "  vec3 c = mix(uHor, uTop, smoothstep(-0.02, 0.5, d.y));",
    "  float s = max(dot(d, normalize(uSun)), 0.0);",
    "  c += uSunCol * (step(0.9985, s) * 0.9 + pow(s, 14.0) * 0.15) * (1.0 - uNight * 0.85);",
    "  vec3 q = floor(d * 220.0); float h = fract(sin(dot(q, vec3(12.9898, 78.233, 37.719))) * 43758.5453);",
    "  c += vec3(step(0.997, h) * uNight * smoothstep(0.04, 0.3, d.y)) * 0.8;",
    "  gl_FragColor = vec4(c, 1.0);",
    "}"
  ].join("\n");
  var sky = null;
  function drawSky() {
    if (!sky) sky = { prog: GL.program(ctx, VS_SKY, FS_SKY), quad: GL.buffer(ctx, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1])) };
    var p = sky.prog, top = SB.mixC([0.25, 0.47, 0.82], [0.02, 0.03, 0.1], env.night);
    top = SB.mixC(top, env.fog, 0.2 + env.cloud * 0.5 + env.rain * 0.3);
    GL.resetAttribs(ctx);
    gl.useProgram(p.prog);
    gl.depthMask(false); gl.disable(gl.DEPTH_TEST);
    var ty = Math.tan((cam.pov.fov || 1.22) / 2);
    gl.uniform3fv(p.u.uHor, env.fog); gl.uniform3fv(p.u.uTop, top);
    gl.uniform3fv(p.u.uFwd, cam.fwd); gl.uniform3fv(p.u.uRight, cam.right); gl.uniform3fv(p.u.uUp, cam.up);
    gl.uniform2f(p.u.uTan, ty * W / H, ty);
    gl.uniform3fv(p.u.uSun, env.sunDir); gl.uniform3fv(p.u.uSunCol, env.sun); gl.uniform1f(p.u.uNight, env.night);
    GL.attribs(ctx, sky.quad, [[p.a.aPos, 2]], 2, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.depthMask(true); gl.enable(gl.DEPTH_TEST);
  }
  function ensurePost() {
    if (!R.pixel) return null;
    if (post && post.failed) return null;
    var w = canvas.width, h = canvas.height;
    if (post && post.w === w && post.h === h) return post;
    try {
      var depthExt = ctx.v2 ? true : !!gl.getExtension("WEBGL_depth_texture");
      if (!depthExt) { post = { failed: true }; return null; }
      if (!post) post = { prog: GL.program(ctx, VS_POST, FS_POST), quad: GL.buffer(ctx, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1])) };
      if (post.fb) { gl.deleteFramebuffer(post.fb); gl.deleteTexture(post.col); gl.deleteTexture(post.dep); }
      post.col = GL.texture(ctx, w, h, null, { nearest: true });
      post.dep = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, post.dep);
      if (ctx.v2) gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, w, h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, w, h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
      [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(function (k) { gl.texParameteri(gl.TEXTURE_2D, k, gl.NEAREST); });
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      post.fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, post.fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, post.col, 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, post.dep, 0);
      var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      if (!ok) { post = { failed: true }; return null; }
      post.w = w; post.h = h;
      return post;
    } catch (e) { post = { failed: true }; return null; }
  }
  function drawPost(P) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    GL.resetAttribs(ctx);
    var p = P.prog;
    gl.useProgram(p.prog);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, P.col); gl.uniform1i(p.u.uCol, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, P.dep); gl.uniform1i(p.u.uDep, 1);
    gl.uniform2f(p.u.uTexel, 1 / P.w, 1 / P.h);
    gl.uniform1f(p.u.uThr, 0.9 / 419); // about 0.9 world units in front
    if (cam.pov) gl.uniform3f(p.u.uPersp, 1, 0.04, (cam.pov.far || 80) + 20); else gl.uniform3f(p.u.uPersp, 0, 0, 0);
    var ink = SB.mixC([0.12, 0.1, 0.16], [0.03, 0.03, 0.08], env.night);
    gl.uniform3f(p.u.uInk, ink[0], ink[1], ink[2]);
    GL.attribs(ctx, P.quad, [[p.a.aPos, 2]], 2, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.activeTexture(gl.TEXTURE0);
    gl.enable(gl.DEPTH_TEST);
  }

  /* ================= init ================= */

  R.init = function (cv, ov, opts) {
    canvas = cv; overlay = ov; octx = overlay ? overlay.getContext("2d") : null;
    opts = opts || {};
    var lowEnd = (navigator.hardwareConcurrency || 4) <= 4 && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || "");
    // pixel-art mode: the 3D scene renders at ~240 px tall and the browser scales it up with hard edges
    R.pixel = opts.pixel !== false;
    canvas.classList.toggle("pixel", R.pixel);
    ctx = GL.create(canvas, { antialias: !lowEnd && !R.pixel });
    if (!ctx) return false;
    gl = ctx.gl;
    progs.terrain = GL.program(ctx, VS_TERRAIN, FS_TERRAIN);
    progs.obj = GL.program(ctx, VS_OBJ, FS_OBJ);
    progs.water = GL.program(ctx, VS_WATER, FS_WATER);
    progs.pt = GL.program(ctx, VS_PT, FS_PT);
    progs.line = GL.program(ctx, VS_LINE, FS_LINE);
    progs.shadow = GL.program(ctx, VS_SHADOW, FS_SHADOW);
    cloudTex = makeCloudTexture(); seenTex = null;
    buildMeshes();
    // phones: flat-shaded low-poly reads fine at ~1.6x, and it's a lot fewer pixels than 2x or 3x.
    // labels and UI stay crisp because the overlay canvas keeps the full device ratio.
    var mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || "") || (window.matchMedia && matchMedia("(pointer: coarse)").matches);
    quality.max = mobile && (window.devicePixelRatio || 1) >= 2 ? 0.8 : 1;
    quality.scale = lowEnd ? Math.min(quality.max, 0.65) : quality.max;
    quality.lowEnd = lowEnd;
    R.resize();
    canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); R.lost = true; }, false);
    canvas.addEventListener("webglcontextrestored", function () { R.lost = false; post = null; R.init(canvas, overlay, { pixel: R.pixel }); if (game) R.setWorld(game); }, false);
    return true;
  };

  R.resize = function () {
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();
    W = Math.max(1, rect.width | 0); H = Math.max(1, rect.height | 0);
    if (R.pixel) {
      // whole CSS pixels per art pixel, so every art pixel is the same size on screen
      R.pixelSize = Math.max(2, Math.round(Math.min(W, H) / 240));
      dpr = 1 / R.pixelSize;
    } else dpr = Math.min(window.devicePixelRatio || 1, 2) * quality.scale;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    if (overlay) {
      var odpr = Math.min(window.devicePixelRatio || 1, 2);
      overlay.width = Math.round(W * odpr); overlay.height = Math.round(H * odpr);
      octx.setTransform(odpr, 0, 0, odpr, 0, 0);
    }
  };
  R.size = function () { return { w: W, h: H }; };

  function makeCloudTexture() {
    // tileable value-noise fbm, 128x128, used for cloud shadows and water ripples
    var S = 128, data = new Uint8Array(S * S * 4), r = SB.rng(99);
    var grids = [8, 16, 32].map(function (g) { var a = new Float32Array(g * g); for (var i = 0; i < a.length; i++) a[i] = r(); return { g: g, a: a }; });
    for (var y = 0; y < S; y++) for (var x = 0; x < S; x++) {
      var v = 0, amp = 0.55, tot = 0;
      grids.forEach(function (G) {
        var gx = x / S * G.g, gy = y / S * G.g, ix = gx | 0, iy = gy | 0, fx = SB.smooth(gx - ix), fy = SB.smooth(gy - iy);
        var a = G.a, g = G.g;
        var v00 = a[(iy % g) * g + ix % g], v10 = a[(iy % g) * g + (ix + 1) % g], v01 = a[((iy + 1) % g) * g + ix % g], v11 = a[((iy + 1) % g) * g + (ix + 1) % g];
        v += amp * ((v00 * (1 - fx) + v10 * fx) * (1 - fy) + (v01 * (1 - fx) + v11 * fx) * fy);
        tot += amp; amp *= 0.5;
      });
      var c = Math.round(v / tot * 255);
      var k = (y * S + x) * 4; data[k] = data[k + 1] = data[k + 2] = c; data[k + 3] = 255;
    }
    return GL.texture(ctx, S, S, data, { repeat: true });
  }

  function upload(m) { return { buf: GL.buffer(ctx, m.data), count: m.count, minY: m.minY, maxY: m.maxY, rad: m.rad }; }
  function buildMeshes() {
    meshes = {};
    var k, v;
    for (k in ME.NODE_BUILDERS) for (v = 0; v < 3; v++) meshes["n:" + k + ":" + v] = upload(ME.NODE_BUILDERS[k](v * 3.7 + 1));
    meshes["n:stump"] = upload(ME.stump());
    meshes["n:burnt"] = upload(ME.burnt());
    for (k in SB.KINDS) meshes["i:" + k] = upload(ME.itemMesh(k));
    meshes["i:pod"] = upload(ME.podMesh());
    for (k in ME.STRUCT_BUILDERS) meshes["s:" + k] = upload(ME.STRUCT_BUILDERS[k]());
    for (v = 0; v < ME.DECOR_BUILDERS.length; v++) meshes["d:" + v] = upload(ME.DECOR_BUILDERS[v]());
    for (k in ME.PARTS) if (ME.PARTS[k]) meshes["p:" + k] = upload(ME.PARTS[k]());
    if (ME.extraMeshes) { var ex = ME.extraMeshes(); for (k in ex) meshes[k] = upload(ex[k]); }
  }
  R.hasMesh = function (key) { return !!meshes[key]; };

  /* ================= world geometry ================= */

  R.setWorld = function (g) {
    game = g;
    T = g.world.T;
    chunks.forEach(freeChunk);
    chunks = [];
    var nc = T.N / SB.CHUNK;
    for (var cj = 0; cj < nc; cj++) for (var ci = 0; ci < nc; ci++) chunks.push({ ci: ci, cj: cj, lod: {}, wat: {}, groups: null, decor: null, dirty: true, minY: 0, maxY: 0, used: 0 });
    computeAO();
    // only the height range of each chunk is needed up front (for culling): its meshes are built the first
    // time it is looked at, at the detail the zoom needs, and far-away fine meshes are dropped again
    var S = SB.CHUNK, V = T.V;
    for (var i = 0; i < chunks.length; i++) {
      var c = chunks[i], lo = 1e9, hi = -1e9;
      for (var j = c.cj * S; j <= c.cj * S + S; j++) for (var k = c.ci * S; k <= c.ci * S + S; k++) { var hh = T.h[j * V + k]; if (hh < lo) lo = hh; if (hh > hi) hi = hh; }
      c.minY = Math.min(lo, SB.SEA - 0.5); c.maxY = hi + 6;
    }
    buildOceanRing();
    cam.maxZoom = Math.max(120, T.N * 0.25);
    cam.x = T.spawn.x; cam.z = T.spawn.z;
  };
  function freeChunk(c) {
    for (var s in c.lod) if (c.lod[s]) gl.deleteBuffer(c.lod[s].buf);
    for (var s2 in c.wat) if (c.wat[s2]) gl.deleteBuffer(c.wat[s2].buf);
    if (c.groups) for (var k in c.groups) gl.deleteBuffer(c.groups[k].buf);
    if (c.decor) for (var d in c.decor) gl.deleteBuffer(c.decor[d].buf);
  }
  R.markDirty = function (x, z) {
    if (!T) return;
    var nc = T.N / SB.CHUNK, ci = SB.clamp((x / SB.CHUNK) | 0, 0, nc - 1), cj = SB.clamp((z / SB.CHUNK) | 0, 0, nc - 1);
    chunks[cj * nc + ci].dirty = true;
  };
  R.markAllDirty = function () { chunks.forEach(function (c) { c.dirty = true; }); };

  // ambient occlusion under tree canopies, baked per vertex
  var aoMap = null;
  function computeAO() {
    var V = T.V;
    aoMap = new Float32Array(V * V);
    var nodes = T.nodes;
    for (var n = 0; n < nodes.length; n++) {
      var nd = nodes[n], def = SB.NODES[nd.kind];
      if (!def || def.noun !== "plant" || nd.kind === "reeds" || nd.kind === "herbs") continue;
      var rad = def.r * nd.s * 2.4, r0 = Math.ceil(rad);
      for (var dz = -r0; dz <= r0; dz++) for (var dx = -r0; dx <= r0; dx++) {
        var i = Math.round(nd.x) + dx, j = Math.round(nd.z) + dz;
        if (i < 0 || j < 0 || i > T.N || j > T.N) continue;
        var d = Math.hypot(i - nd.x, j - nd.z) / rad;
        if (d < 1) aoMap[j * V + i] = Math.min(1, aoMap[j * V + i] + (1 - d) * 0.7);
      }
    }
  }

  var ROCK = SB.hex(0x8a8590), SAND = SB.hex(0xe2cf9a), MUD = SB.hex(0x8a6a48), SNOW = SB.hex(0xf2f5fa);
  function vertexColor(i, j, out) {
    var N = T.N, V = T.V, k = j * V + i;
    // average the biome colours of the up-to-4 tiles touching this vertex
    var r = 0, g = 0, b = 0, n = 0, temp = 0, ash = 0;
    for (var dj = -1; dj <= 0; dj++) for (var di = -1; di <= 0; di++) {
      var ti = i + di, tj = j + dj;
      if (ti < 0 || tj < 0 || ti >= N || tj >= N) continue;
      var t = tj * N + ti, bm = SB.BIOMES[T.biome[t]];
      var hsh = SB.hash(ti, tj, 7);
      var c = SB.hex(hsh < 0.5 ? bm.c[0] : bm.c[1]);
      r += c[0]; g += c[1]; b += c[2]; temp += T.temp[t]; n++;
      if (T.biome[t] === SB.B.ash) ash++;
    }
    r /= n; g /= n; b /= n; temp /= n;
    var h = T.h[k];
    var col = [r, g, b];
    // slopes show rock
    var sl = 0;
    if (i > 0 && j > 0 && i < N && j < N) sl = Math.max(Math.abs(T.h[k + 1] - T.h[k - 1]), Math.abs(T.h[k + V] - T.h[k - V])) * 0.5;
    col = SB.mixC(col, ROCK, SB.smooth((sl - 0.9) / 1.2));
    // snowy peaks
    if (!ash) col = SB.mixC(col, SNOW, SB.smooth((h - 13) / 3) * (temp < 0.5 ? 1 : 0.6)); // no snow on the warm volcano
    // wet banks and lake/river beds
    var w = T.W[k];
    if (w !== T.NONE) {
      var depth = w - h;
      if (depth > -0.25) col = SB.mixC(col, T.oceanDist[k] < 8 ? SAND : MUD, SB.smooth((depth + 0.25) / 0.5) * 0.85);
      if (depth > 0.3) col = SB.mixC(col, [col[0] * 0.6, col[1] * 0.75, col[2] * 0.8], SB.smooth((depth - 0.3) / 2));
    }
    // a little noise so big flat areas aren't flat
    var nz = (SB.hash(i, j, 3) - 0.5) * 0.06;
    out[0] = SB.clamp01(col[0] + nz); out[1] = SB.clamp01(col[1] + nz); out[2] = SB.clamp01(col[2] + nz * 0.7);
    // snow susceptibility (seasonal snow): cold places get it first
    out[3] = SB.clamp01((0.8 - temp) * 2.3) * (w !== T.NONE && w > h ? 0 : 1);
    return out;
  }

  // Terrain: 32x32 quads per chunk, flat-shaded triangles. Vertex = pos3 nrm3 col4 misc4 (14 floats).
  var TSTRIDE = 14;
  function buildTerrainLOD(c, step) {
    var S = SB.CHUNK, V = T.V, i0 = c.ci * S, j0 = c.cj * S;
    var nq = (S / step) * (S / step), out = new Float32Array(nq * 6 * TSTRIDE), o = 0;
    var vc = [0, 0, 0, 0];
    var colCache = {};
    function colAt(i, j) {
      var key = j * V + i;
      var cc = colCache[key];
      if (!cc) { cc = colCache[key] = vertexColor(i, j, [0, 0, 0, 0]).concat([aoMap[key] || 0]); }
      return cc;
    }
    var minY = 1e9, maxY = -1e9;
    for (var j = j0; j < j0 + S; j += step) for (var i = i0; i < i0 + S; i += step) {
      var a = [i, j], b = [i + step, j], cc = [i + step, j + step], d = [i, j + step];
      var tris = [[a, b, cc], [a, cc, d]];
      var jit = (SB.hash(i, j, 11) - 0.5) * 0.04;
      for (var t = 0; t < 2; t++) {
        var tr = tris[t];
        var p = tr.map(function (q) { return [q[0], T.h[q[1] * V + q[0]], q[1]]; });
        // flat normal (winding is a -> c -> b viewed from above = counter-clockwise in xz with y up)
        var ux = p[1][0] - p[0][0], uy = p[1][1] - p[0][1], uz = p[1][2] - p[0][2];
        var vx = p[2][0] - p[0][0], vy = p[2][1] - p[0][1], vz = p[2][2] - p[0][2];
        var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
        var l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        for (var q = 0; q < 3; q++) {
          var pp = p[q], col = colAt(tr[q][0], tr[q][1]);
          var wet = 0, kk = tr[q][1] * V + tr[q][0];
          if (T.river[kk]) wet = 1;
          out[o++] = pp[0]; out[o++] = pp[1]; out[o++] = pp[2];
          out[o++] = nx; out[o++] = ny; out[o++] = nz;
          out[o++] = SB.clamp01(col[0] * (1 + jit)); out[o++] = SB.clamp01(col[1] * (1 + jit)); out[o++] = SB.clamp01(col[2] * (1 + jit)); out[o++] = col[3];
          out[o++] = col[4]; out[o++] = 0; out[o++] = wet; out[o++] = 0;
          if (pp[1] < minY) minY = pp[1]; if (pp[1] > maxY) maxY = pp[1];
        }
      }
    }
    return { buf: GL.buffer(ctx, out), count: o / TSTRIDE };
  }
  // a chunk's terrain and water at one level of detail (step 1 = every tile, 2 and 4 for far zooms)
  function buildChunkTerrain(c, step) {
    c.lod[step] = buildTerrainLOD(c, step);
    // water: quads where all four corners have a water level and at least one is actually wet
    var S = SB.CHUNK, V = T.V, i0 = c.ci * S, j0 = c.cj * S, NONE = T.NONE;
    var out = [];
    for (var j = j0; j < j0 + S; j += step) for (var i = i0; i < i0 + S; i += step) {
      var ks = [j * V + i, j * V + i + step, (j + step) * V + i + step, (j + step) * V + i];
      var any = false, all = true;
      for (var q = 0; q < 4; q++) { var w = T.W[ks[q]]; if (w === NONE) all = false; else if (w > T.h[ks[q]] + 0.01) any = true; }
      if (!all || !any) continue;
      var P = ks.map(function (k, qi) {
        var x = i + (qi === 1 || qi === 2 ? step : 0), z = j + (qi >= 2 ? step : 0);
        return [x, T.W[k], z, Math.max(0, T.W[k] - T.h[k]), T.river[k] ? 1 : 0];
      });
      [P[0], P[1], P[2], P[0], P[2], P[3]].forEach(function (p) { out.push(p[0], p[1], p[2], p[3], p[4]); });
    }
    c.wat[step] = out.length ? { buf: GL.buffer(ctx, new Float32Array(out)), count: out.length / 5 } : null;
  }
  // which mesh to draw for a chunk this frame: the step the zoom wants, else a coarser one already built
  var LODS = [1, 2, 4], terrBudget = 0, frameNo = 0;
  function chunkLOD(c, want) {
    c.used = frameNo;
    if (c.lod[want]) return want;
    if (terrBudget-- > 0 || want === 4) { buildChunkTerrain(c, want); return want; }
    for (var li = 0; li < LODS.length; li++) if (LODS[li] > want && c.lod[LODS[li]]) return LODS[li];
    buildChunkTerrain(c, 4); return 4;
  }
  // fine meshes of chunks nobody has looked at for a while go back (a 1024 island would not fit otherwise)
  function evictChunks() {
    for (var i = 0; i < chunks.length; i++) {
      var c = chunks[i];
      if (frameNo - c.used < 900) continue;
      for (var s = 1; s <= 2; s++) {
        if (c.lod[s]) { gl.deleteBuffer(c.lod[s].buf); c.lod[s] = null; }
        if (c.wat[s]) { gl.deleteBuffer(c.wat[s].buf); c.wat[s] = null; }
      }
      if (c.decor) { for (var d in c.decor) gl.deleteBuffer(c.decor[d].buf); c.decor = null; }
    }
  }
  R.terrainStep = function () { return cam.zoom < 48 ? 1 : cam.zoom < 115 ? 2 : 4; };
  function buildOceanRing() {
    var N = T.N, E = 900, out = [];
    function rect(x0, z0, x1, z1) {
      [[x0, z0], [x1, z0], [x1, z1], [x0, z0], [x1, z1], [x0, z1]].forEach(function (p) { out.push(p[0], SB.SEA, p[1], 8, 0); });
    }
    rect(-E, -E, N + E, 0); rect(-E, N, N + E, N + E); rect(-E, 0, 0, N); rect(N, 0, N + E, N);
    if (ringBuf) gl.deleteBuffer(ringBuf.buf);
    ringBuf = { buf: GL.buffer(ctx, new Float32Array(out)), count: out.length / 5 };
  }

  /* ---- static instances per chunk: nodes, structures and decor ---- */
  var tmpM = new Float32Array(12);
  // write a 3x4 transform: translate(x,y,z) * rotY(a) * scale(sx,sy,sz)
  function trs(out, o, x, y, z, a, sx, sy, sz) {
    var c = Math.cos(a), s = Math.sin(a);
    out[o] = c * sx; out[o + 1] = 0; out[o + 2] = s * sz; out[o + 3] = x;
    out[o + 4] = 0; out[o + 5] = sy; out[o + 6] = 0; out[o + 7] = y;
    out[o + 8] = -s * sx; out[o + 9] = 0; out[o + 10] = c * sz; out[o + 11] = z;
  }
  R.trs = trs;

  function nodeTint(nd) {
    var t = SB.hash(nd.id, 5, 9);
    var bm = WG.biomeAt(T, nd.x, nd.z);
    var tint = [0.9 + t * 0.2, 0.92 + t * 0.16, 0.9 + (1 - t) * 0.15];
    if (bm === SB.B.savanna || bm === SB.B.desert) tint = [1.15, 1.05, 0.7];
    if (bm === SB.B.taiga || bm === SB.B.tundra) tint = [0.85, 0.95, 1.0];
    if (bm === SB.B.swamp) tint = [0.85, 0.95, 0.75];
    if (nd.kind === "boulder" || nd.kind === "flintrock" || nd.kind === "orevein") tint = [0.95 + t * 0.1, 0.95 + t * 0.1, 0.95 + t * 0.12];
    if (nd.kind === "shroomtree") { var hh = [[0.69, 0.48, 0.88], [0.5, 0.75, 1.0], [1.0, 0.55, 0.7]][(t * 3) | 0]; tint = [hh[0] / 0.69, hh[1] / 0.48, hh[2] / 0.88]; }
    if (bm === SB.B.ash) tint = [0.8, 0.78, 0.8];
    if (bm === SB.B.mesa) tint = [1.12, 0.95, 0.8];
    if (bm === SB.B.mangrove) tint = [0.88, 0.98, 0.8];
    if (bm === SB.B.maple && nd.kind !== "maple") tint = [1.1, 0.95, 0.8];
    return tint;
  }

  function buildChunkInstances(c) {
    if (c.groups) for (var k in c.groups) gl.deleteBuffer(c.groups[k].buf);
    c.groups = {};
    var S = SB.CHUNK, x0 = c.ci * S, z0 = c.cj * S, lists = {};
    function push(key, x, y, z, a, sx, sy, sz, tint, autumn, glow) {
      var L = lists[key] || (lists[key] = []);
      var o = L.length;
      L.length += ISTRIDE;
      trs(L, o, x, y, z, a, sx, sy, sz);
      L[o + 12] = tint[0]; L[o + 13] = tint[1]; L[o + 14] = tint[2]; L[o + 15] = 1;
      L[o + 16] = autumn || 0; L[o + 17] = glow || 0; L[o + 18] = 0; L[o + 19] = 0;
    }
    var nodes = game.world.nodesByChunk ? game.world.nodesByChunk[c.cj * (T.N / S) + c.ci] : T.nodes;
    for (var n = 0; n < nodes.length; n++) {
      var nd = nodes[n];
      if (nd.x < x0 || nd.x >= x0 + S || nd.z < z0 || nd.z >= z0 + S) continue;
      if (!SB.World.isSeen(game.world, nd.x, nd.z)) continue; // under the fog of war
      var y = WG.heightAt(T, nd.x, nd.z) - 0.04;
      var key = "n:" + nd.kind + ":" + (nd.id % 3);
      if (nd.state === "stump") key = "n:stump";
      else if (nd.state === "burnt") key = "n:burnt";
      if (!meshes[key]) continue;
      var s = nd.s * (nd.grow == null ? 1 : 0.3 + 0.7 * nd.grow);
      push(key, nd.x, y, nd.z, nd.rot, s, s, s, nodeTint(nd), ME.DECIDUOUS[nd.kind] ? 1 : 0, 0);
    }
    // places to find (sites.js): drawn once the fog has lifted off them
    var sites = game.sites || [];
    for (var pi = 0; pi < sites.length; pi++) {
      var ps = sites[pi];
      if (ps.gone || ps.x < x0 || ps.x >= x0 + S || ps.z < z0 || ps.z >= z0 + S || !SB.World.isSeen(game.world, ps.x, ps.z)) continue;
      var pk = ps.kind === "pod" ? "s:site_wreck" : ps.kind === "cave" ? "n:cave:0" : ps.kind === "nest" ? "n:nest:0" : ps.kind === "camp" && ps.done ? "s:site_campdone" : "s:site_" + ps.kind;
      if (!meshes[pk]) continue;
      var py = WG.heightAt(T, ps.x, ps.z) - 0.03, psc = ps.kind === "nest" ? 1.8 : ps.kind === "cave" ? 1.3 : ps.kind === "wreck" || ps.kind === "pod" ? 1.3 : 1.6;
      push(pk, ps.x, py, ps.z, ps.rot || 0, psc, psc, psc, [1, 1, 1], 0, ps.kind === "ruin" && !ps.found ? 0.3 : 0);
    }
    var sts = game.world.structures || [];
    for (var si = 0; si < sts.length; si++) {
      var st = sts[si];
      if (st.x < x0 || st.x >= x0 + S || st.z < z0 || st.z >= z0 + S) continue;
      if (!SB.World.isSeen(game.world, st.x, st.z)) continue;
      var sk = "s:" + (st.done ? st.kind : "plot");
      if (!meshes[sk]) continue;
      // sit on the highest ground under the footprint, so nothing sinks into a slope
      var sr = (SB.STRUCTS[st.kind] ? SB.STRUCTS[st.kind].r : 0.8) * 0.8, ys = WG.heightAt(T, st.x, st.z);
      for (var q = 0; q < 4; q++) ys = Math.max(ys, WG.heightAt(T, st.x + (q & 1 ? sr : -sr), st.z + (q & 2 ? sr : -sr)));
      ys -= 0.02;
      push(sk, st.x, ys, st.z, st.rot || 0, st.s || 1, st.s || 1, st.s || 1, st.tint || [1, 1, 1], 0, 0);
      if (st.done && st.kind === "farm") {
        var g = st.data && st.data.grow != null ? st.data.grow : 0.5;
        for (var fz = 0; fz < 4; fz++) for (var fx = 0; fx < 4; fx++) {
          if (g <= 0.02) continue;
          var ca = Math.cos(st.rot || 0), sa = Math.sin(st.rot || 0), lx = -0.7 + fx * 0.47, lz = -0.65 + fz * 0.43;
          push("s:crop", st.x + lx * ca + lz * sa, ys + 0.08, st.z - lx * sa + lz * ca, fx * 1.3 + fz, 0.4 + g * 0.8, 0.3 + g * 0.9, 0.4 + g * 0.8, [1, 1, 1], 0, 0);
        }
      }
    }
    for (var key2 in lists) {
      var arr = new Float32Array(lists[key2]);
      c.groups[key2] = { buf: GL.buffer(ctx, arr), n: arr.length / ISTRIDE };
    }
    c.dirty = false;
  }
  // grass, flowers and pebbles: only for chunks seen up close
  function buildChunkDecor(c) {
    c.decor = {};
    var dl = {}, D = WG.decorChunk(T, c.ci, c.cj);
    for (var di = 0; di < D.length; di += 5) {
      var dx = D[di], dz = D[di + 1];
      if (!SB.World.isSeen(game.world, dx, dz)) continue;
      var type = D[di + 2], sc = D[di + 3], rot = D[di + 4];
      var L = dl[type] || (dl[type] = []), o = L.length;
      L.length += ISTRIDE;
      trs(L, o, dx, WG.heightAt(T, dx, dz) - 0.02, dz, rot, sc, sc, sc);
      var t = SB.hash(dx * 7.1, dz * 3.3, 2);
      var tint = type === 1 || type === 11 ? SB.hsl([0, 45, 200, 280, 330, 50][(t * 6) | 0], 0.75, 0.72).map(function (v) { return v * 1.1; }) : [0.9 + t * 0.2, 0.95 + t * 0.1, 0.9];
      if (type === 0 || type === 3) { var bmc = SB.hex(SB.BIOMES[WG.biomeAt(T, dx, dz)].c[1]); tint = [bmc[0] / 0.5 * (0.8 + t * 0.3), bmc[1] / 0.75 * (0.85 + t * 0.2), bmc[2] / 0.35 * (0.8 + t * 0.2)].map(function (v) { return Math.min(1.4, v); }); }
      if (type === 10) tint = [1.05 + t * 0.1, 0.9 + t * 0.1, 0.7];
      L[o + 12] = tint[0]; L[o + 13] = tint[1]; L[o + 14] = tint[2]; L[o + 15] = 1;
      L[o + 16] = type === 0 || type === 3 || type === 10 ? 0.3 : 0; L[o + 17] = type === 6 ? 0.6 : type === 9 ? 0.8 : 0; L[o + 18] = 0; L[o + 19] = 0;
    }
    for (var ty in dl) { var arr2 = new Float32Array(dl[ty]); c.decor[ty] = { buf: GL.buffer(ctx, arr2), n: arr2.length / ISTRIDE }; }
  }

  /* ================= camera ================= */

  // first person: a perspective camera at a smol's eye. cam.x/z/halfW/halfH become the patch of island
  // in view (bodies, fx and sound cull with them), the zoom reads as "close up" (decor, names)
  function povCamera(dt) {
    var c = cam, p = c.pov, cp = Math.cos(p.pitch), sp = Math.sin(p.pitch), sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
    var far = p.far || 80;
    c.fwd[0] = -sy * cp; c.fwd[1] = sp; c.fwd[2] = -cy * cp;
    c.right[0] = cy; c.right[1] = 0; c.right[2] = -sy;
    c.up[0] = c.right[1] * c.fwd[2] - c.right[2] * c.fwd[1];
    c.up[1] = c.right[2] * c.fwd[0] - c.right[0] * c.fwd[2];
    c.up[2] = c.right[0] * c.fwd[1] - c.right[1] * c.fwd[0];
    var sh = c.shake > 0 ? c.shake * 0.04 : 0;
    if (c.shake > 0) c.shake = Math.max(0, c.shake - dt * 2);
    c.eye[0] = p.x + (Math.random() - 0.5) * sh; c.eye[1] = p.y + (Math.random() - 0.5) * sh; c.eye[2] = p.z;
    M4.lookAt(V, c.eye[0], c.eye[1], c.eye[2], c.eye[0] + c.fwd[0], c.eye[1] + c.fwd[1], c.eye[2] + c.fwd[2], 0, 1, 0);
    M4.perspective(P, p.fov || 1.22, W / H, 0.04, far + 20);
    M4.mul(VP, P, V);
    c.x = p.x - sy * far * 0.42; c.z = p.z - cy * far * 0.42; c.y = p.y;
    c.halfH = far * 0.55; c.halfW = far * 0.55; c.zoom = 6; c.pitch = 1;
    c.povK = canvas.height / (2 * Math.tan((p.fov || 1.22) / 2)); // canvas px per world unit at distance 1
    c.pxPerUnit = H / (2 * Math.tan((p.fov || 1.22) / 2)) / 6;
    c.fwdXZ = [-sy, -cy];
  }
  // screen pixels per world unit at a point (perspective: falls off with distance; 0 behind the eye)
  R.ppuAt = function (x, y, z) {
    if (!cam.pov) return canvas.height / (2 * cam.halfH);
    var d = (x - cam.eye[0]) * cam.fwd[0] + (y - cam.eye[1]) * cam.fwd[1] + (z - cam.eye[2]) * cam.fwd[2];
    return d < 0.06 ? 0 : cam.povK / d;
  };
  function updateCamera(dt) {
    var c = cam;
    if (c.pov) { povCamera(dt); return; }
    if (c.intro) {
      c.intro.t += dt;
      var k = SB.smooth(c.intro.t / c.intro.dur);
      c.zoom = SB.lerp(c.intro.z0, c.intro.z1, k * k * (3 - 2 * k));
      c.yaw = SB.lerp(c.intro.yaw0, c.intro.yaw1, k);
      c.x = SB.lerp(c.intro.x0, c.intro.x1, k); c.z = SB.lerp(c.intro.zz0, c.intro.zz1, k);
      c.tZoom = c.zoom; c.tYaw = c.yaw;
      if (c.intro.t >= c.intro.dur) { var cb = c.intro.done; c.intro = null; if (cb) cb(); }
    } else {
      if (c.follow) {
        var f = c.follow();
        if (f) {
          // with a panel open at the bottom, aim below the smol so it shows up in the visible top part
          var sh = (c.shift || 0) * c.halfH, fl = Math.hypot(c.fwd[0], c.fwd[2]) || 1, upk = Math.max(0.35, Math.abs(c.up[1]));
          var tx = f.x - c.fwd[0] / fl * sh / upk, tz = f.z - c.fwd[2] / fl * sh / upk, sx = (c.shiftX || 0) * c.halfW; // and beside it, for a side panel
          tx += c.right[0] * sx; tz += c.right[2] * sx;
          var kf = 1 - Math.exp(-dt * 4); c.x += (tx - c.x) * kf; c.z += (tz - c.z) * kf;
        }
        else c.follow = null;
      } else if (c.vx || c.vz) {
        c.x += c.vx * dt; c.z += c.vz * dt;
        var damp = Math.exp(-dt * 5); c.vx *= damp; c.vz *= damp;
        if (Math.abs(c.vx) + Math.abs(c.vz) < 0.05) c.vx = c.vz = 0;
      }
      c.zoom += (c.tZoom - c.zoom) * (1 - Math.exp(-dt * 10));
      c.yaw += SB.angDiff(c.yaw, c.tYaw) * (1 - Math.exp(-dt * 10));
    }
    c.zoom = SB.clamp(c.zoom, c.minZoom, c.maxZoom);
    if (T) { c.x = SB.clamp(c.x, -10, T.N + 10); c.z = SB.clamp(c.z, -10, T.N + 10); }
    // pitch eases from a low, cinematic angle up close to a map-like angle far out
    var zt = SB.clamp((Math.log(c.zoom) - Math.log(4)) / (Math.log(70) - Math.log(4)), 0, 1);
    // plus the player's own tilt (right-drag / two-finger drag / R,F): lower to look across the land, higher for a map
    c.pitch = SB.clamp(SB.lerp(0.62, 1.12, zt) + (c.tilt || 0) * (1 - zt * 0.6), 0.42, 1.42);
    var gy = T ? Math.max(SB.SEA, WG.heightAt(T, c.x, c.z)) : 0;
    c.y += (gy - c.y) * (1 - Math.exp(-dt * 3));
    if (c.shake > 0) c.shake = Math.max(0, c.shake - dt * 2);
    var sh = c.shake * c.zoom * 0.02;
    var tx = c.x + (Math.random() - 0.5) * sh, tz = c.z + (Math.random() - 0.5) * sh;
    var cp = Math.cos(c.pitch), sp = Math.sin(c.pitch), sy = Math.sin(c.yaw), cy = Math.cos(c.yaw);
    var dist = 160;
    c.eye[0] = tx + sy * cp * dist; c.eye[1] = c.y + sp * dist; c.eye[2] = tz + cy * cp * dist;
    M4.lookAt(V, c.eye[0], c.eye[1], c.eye[2], tx, c.y, tz, 0, 1, 0);
    var aspect = W / H;
    c.halfH = c.zoom; c.halfW = c.zoom * aspect;
    M4.ortho(P, -c.halfW, c.halfW, -c.halfH, c.halfH, 1, 420);
    M4.mul(VP, P, V);
    c.fwd[0] = -sy * cp; c.fwd[1] = -sp; c.fwd[2] = -cy * cp;
    c.right[0] = cy; c.right[1] = 0; c.right[2] = -sy;
    // up = right x fwd
    c.up[0] = c.right[1] * c.fwd[2] - c.right[2] * c.fwd[1];
    c.up[1] = c.right[2] * c.fwd[0] - c.right[0] * c.fwd[2];
    c.up[2] = c.right[0] * c.fwd[1] - c.right[1] * c.fwd[0];
    c.pxPerUnit = H / (2 * c.halfH);
  }
  R.updateCamera = updateCamera;

  // world units per screen pixel on the ground, for panning
  // a screen drag of (dx, dy) px, as ground movement: the drag in camera space slid along the view ray
  // onto the ground plane. Panning moves the camera the opposite way, so the ground stays under the finger.
  function groundDelta(dxPx, dyPx, out) {
    var c = cam, k = (2 * c.halfH) / H, r = c.right, u = c.up, f = c.fwd;
    var wx = (r[0] * dxPx - u[0] * dyPx) * k, wy = (r[1] * dxPx - u[1] * dyPx) * k, wz = (r[2] * dxPx - u[2] * dyPx) * k;
    var t = Math.abs(f[1]) > 1e-4 ? wy / f[1] : 0;
    out[0] = wx - f[0] * t; out[1] = wz - f[2] * t;
    return out;
  }
  var gd = [0, 0];
  R.groundDelta = function (dxPx, dyPx) { return groundDelta(dxPx, dyPx, [0, 0]); };
  R.panBy = function (dxPx, dyPx) {
    groundDelta(dxPx, dyPx, gd);
    cam.x -= gd[0]; cam.z -= gd[1];
  };
  R.panVelocity = function (vxPx, vyPx) {
    groundDelta(vxPx, vyPx, gd);
    cam.vx = -gd[0]; cam.vz = -gd[1];
  };
  R.zoomAt = function (factor, sx, sy) {
    var c = cam, before = sx != null ? R.pickGround(sx, sy) : null;
    c.tZoom = SB.clamp(c.tZoom * factor, c.minZoom, c.maxZoom);
    if (before && !c.follow) {
      // keep the point under the cursor roughly still
      var k = 1 - c.tZoom / c.zoom;
      c.x += (before.x - c.x) * k * 0.9; c.z += (before.z - c.z) * k * 0.9;
    }
  };
  R.rotateBy = function (a) { cam.tYaw += a; };
  R.flyTo = function (x, z, zoom, dur, done) {
    if (cam.intro && cam.intro.cine) return; // never cut into a cinematic: its ending does important work (the landing shows the UI)
    cam.intro = { t: 0, dur: dur || 1.2, x0: cam.x, zz0: cam.z, x1: x, zz1: z, z0: cam.zoom, z1: zoom || cam.zoom, yaw0: cam.yaw, yaw1: cam.yaw, done: done };
  };
  R.cinematic = function (o) { cam.intro = o; cam.intro.t = 0; cam.intro.cine = true; };

  var pv = [0, 0, 0];
  // world -> CSS pixels {x, y, z(ndc depth), on}
  R.project = function (x, y, z, out) {
    out = out || {};
    M4.project(VP, x, y, z, pv);
    out.x = (pv[0] * 0.5 + 0.5) * W; out.y = (0.5 - pv[1] * 0.5) * H; out.z = pv[2];
    out.on = pv[0] > -1.15 && pv[0] < 1.15 && pv[1] > -1.15 && pv[1] < 1.25 && !(pv[3] < 0);
    return out;
  };
  // CSS pixel -> ground point {x, y, z} (marches the view ray into the heightfield / water)
  // the patch of ground the camera sees: the four screen corners cast onto a flat plane at the
  // height of the ground under the camera (the minimap draws this as the view outline)
  R.viewFootprint = function () {
    var c = cam, y0 = T ? WG.heightAt(T, c.x, c.z) : 0, out = [];
    var corners = [[-1, 1], [1, 1], [1, -1], [-1, -1]];
    for (var i = 0; i < 4; i++) {
      var nx = corners[i][0], ny = corners[i][1];
      var ox = c.eye[0] + c.right[0] * nx * c.halfW + c.up[0] * ny * c.halfH;
      var oy = c.eye[1] + c.right[1] * nx * c.halfW + c.up[1] * ny * c.halfH;
      var oz = c.eye[2] + c.right[2] * nx * c.halfW + c.up[2] * ny * c.halfH;
      var t = (oy - y0) / -c.fwd[1];
      out.push({ x: ox + c.fwd[0] * t, z: oz + c.fwd[2] * t });
    }
    return out;
  };
  R.pickGround = function (sx, sy, ignoreWater) {
    if (!T) return null;
    var c = cam, nx = (sx / W) * 2 - 1, ny = 1 - (sy / H) * 2;
    var ox = c.eye[0] + c.right[0] * nx * c.halfW + c.up[0] * ny * c.halfH;
    var oy = c.eye[1] + c.right[1] * nx * c.halfW + c.up[1] * ny * c.halfH;
    var oz = c.eye[2] + c.right[2] * nx * c.halfW + c.up[2] * ny * c.halfH;
    var dx = c.fwd[0], dy = c.fwd[1], dz = c.fwd[2];
    var t = (oy - 32) / -dy, tEnd = (oy + 9) / -dy, step = 0.35, prevT = t, prevD = 1;
    for (; t < tEnd; t += step) {
      var x = ox + dx * t, y = oy + dy * t, z = oz + dz * t;
      var gh = WG.heightAt(T, x, z);
      if (!ignoreWater) { var wl = WG.waterAt(T, x, z); if (wl !== T.NONE && wl > gh) gh = wl; }
      if (x < 0 || z < 0 || x > T.N || z > T.N) gh = SB.SEA;
      var d = y - gh;
      if (d <= 0) {
        // refine between prevT and t
        var lo = prevT, hi = t;
        for (var it = 0; it < 6; it++) {
          var m = (lo + hi) / 2, mx = ox + dx * m, my = oy + dy * m, mz = oz + dz * m;
          var mh = WG.heightAt(T, mx, mz);
          if (!ignoreWater) { var mw = WG.waterAt(T, mx, mz); if (mw !== T.NONE && mw > mh) mh = mw; }
          if (my - mh > 0) lo = m; else hi = m;
        }
        return { x: ox + dx * hi, y: oy + dy * hi, z: oz + dz * hi };
      }
      prevT = t; prevD = d;
    }
    return null;
  };

  /* ================= environment ================= */

  // keyframes over the day (0 = midnight, 0.25 dawn, 0.5 noon, 0.75 dusk)
  var SKY = [
    { t: 0.0, sun: [0.2, 0.25, 0.44], sky: [0.12, 0.15, 0.3], gnd: [0.06, 0.06, 0.11], fog: [0.05, 0.07, 0.15] },
    { t: 0.17, sun: [0.2, 0.25, 0.44], sky: [0.12, 0.15, 0.3], gnd: [0.06, 0.06, 0.11], fog: [0.05, 0.07, 0.15] },
    { t: 0.235, sun: [0.95, 0.52, 0.36], sky: [0.5, 0.42, 0.58], gnd: [0.26, 0.2, 0.22], fog: [0.62, 0.46, 0.5] },
    { t: 0.32, sun: [1.04, 0.84, 0.6], sky: [0.5, 0.58, 0.82], gnd: [0.34, 0.29, 0.24], fog: [0.74, 0.72, 0.8] },
    { t: 0.5, sun: [1.05, 0.96, 0.82], sky: [0.5, 0.62, 0.86], gnd: [0.36, 0.32, 0.25], fog: [0.72, 0.83, 0.94] },
    { t: 0.66, sun: [1.14, 0.88, 0.58], sky: [0.52, 0.56, 0.78], gnd: [0.36, 0.29, 0.22], fog: [0.8, 0.73, 0.72] },
    { t: 0.72, sun: [1.15, 0.66, 0.38], sky: [0.6, 0.47, 0.56], gnd: [0.34, 0.24, 0.22], fog: [0.78, 0.55, 0.52] },
    { t: 0.785, sun: [0.95, 0.42, 0.3], sky: [0.46, 0.34, 0.5], gnd: [0.22, 0.16, 0.2], fog: [0.5, 0.33, 0.42] },
    { t: 0.83, sun: [0.2, 0.25, 0.44], sky: [0.12, 0.15, 0.3], gnd: [0.06, 0.06, 0.11], fog: [0.05, 0.07, 0.15] },
    { t: 1.0, sun: [0.2, 0.25, 0.44], sky: [0.12, 0.15, 0.3], gnd: [0.06, 0.06, 0.11], fog: [0.05, 0.07, 0.15] }
  ];
  var env = (R.env = { sun: [1, 1, 1], sky: [0.5, 0.5, 0.5], gnd: [0.3, 0.3, 0.3], fog: [0.7, 0.8, 0.9], sunDir: [0.3, 0.8, 0.3], night: 0, cloud: 0.3, wind: 0.5, snow: 0, wet: 0, autumn: 0, freeze: 0, rain: 0, flash: 0 });
  function updateEnv(world) {
    var tday = world ? (world.time / SB.DAY_LENGTH) % 1 : 0.4;
    var a = SKY[0], b = SKY[1];
    for (var i = 0; i < SKY.length - 1; i++) if (tday >= SKY[i].t && tday <= SKY[i + 1].t) { a = SKY[i]; b = SKY[i + 1]; break; }
    var k = (tday - a.t) / Math.max(0.0001, b.t - a.t);
    ["sun", "sky", "gnd", "fog"].forEach(function (key) { env[key] = SB.mixC(a[key], b[key], k); });
    // sun arcs east -> west; at night the "sun" is a soft moon from overhead
    var day = tday > 0.22 && tday < 0.78;
    var ang = (tday - 0.25) / 0.5 * Math.PI;
    if (day) { env.sunDir = norm3([Math.cos(ang) * 0.75, Math.max(0.3, Math.sin(ang)), 0.35]); }
    else { var ma = ((tday + 0.5) % 1 - 0.25) / 0.5 * Math.PI; env.sunDir = norm3([Math.cos(ma) * 0.5, 0.75, 0.3]); }
    env.night = day ? SB.clamp01(1 - Math.min(tday - 0.22, 0.78 - tday) / 0.06) : 1;
    var wx = world && world.weather ? world.weather : null;
    env.cloud = wx ? wx.cloud : 0.25; env.rain = wx ? wx.rain : 0; env.wind = wx ? wx.wind : 0.5;
    env.snow = world ? world.snowCover || 0 : 0; env.autumn = world ? world.autumn || 0 : 0; env.freeze = world ? world.freeze || 0 : 0;
    env.wet += ((env.rain > 0.1 ? 1 : 0) - env.wet) * 0.01;
    // overcast: flatter, greyer light
    var oc = SB.clamp01(env.cloud * 0.8 + env.rain * 0.6);
    env.sun = env.sun.map(function (v) { return v * (1 - oc * 0.55); });
    env.sky = SB.mixC(env.sky, [env.sky[0] * 0.9 + 0.08, env.sky[1] * 0.9 + 0.08, env.sky[2] * 0.9 + 0.08], oc);
    env.fog = SB.mixC(env.fog, [0.55, 0.58, 0.64].map(function (v) { return v * (1 - env.night * 0.85); }), oc * 0.6);
    if (env.flash > 0) {
      env.flash = Math.max(0, env.flash - 0.05);
      var fl = env.flash;
      env.sky = env.sky.map(function (v) { return v + fl * 1.2; });
      env.sun = env.sun.map(function (v) { return v + fl * 0.8; });
    }
  }
  function norm3(v) { var l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; }
  R.flash = function (k) { env.flash = Math.max(env.flash, k || 1); };

  /* ================= frame ================= */

  var lights = new Float32Array(32), lightCols = new Float32Array(24);
  var frameDyn = {}; // dynamic instances: key -> {data: Float32Array, n}
  var dynHolders = {};

  // Dynamic instance submission (creatures, items, effects). Call between beginDynamic() and the draw.
  function dyn(key) {
    var d = frameDyn[key];
    if (!d) d = frameDyn[key] = { data: new Float32Array(ISTRIDE * 64), n: 0 };
    if ((d.n + 1) * ISTRIDE > d.data.length) { var nd = new Float32Array(d.data.length * 2); nd.set(d.data); d.data = nd; }
    return d;
  }
  // submit one instance: m is a 12-float 3x4 matrix (row-major rows of [r0 r1 r2 t])
  R.inst = function (key, m, tint, ext) {
    if (!meshes[key]) return;
    var d = dyn(key), o = d.n * ISTRIDE, a = d.data;
    for (var i = 0; i < 12; i++) a[o + i] = m[i];
    a[o + 12] = tint ? tint[0] : 1; a[o + 13] = tint ? tint[1] : 1; a[o + 14] = tint ? tint[2] : 1; a[o + 15] = 1;
    a[o + 16] = ext ? ext[0] : 0; a[o + 17] = ext ? ext[1] : 0; a[o + 18] = ext ? ext[2] : 0; a[o + 19] = 0;
    d.n++;
  };
  R.instTRS = function (key, x, y, z, rot, s, tint, ext) {
    trs(tmpM, 0, x, y, z, rot, s, s, s);
    R.inst(key, tmpM, tint, ext);
  };

  // shadows (blob) and lights are also collected per frame
  var shadowV = new Float32Array(6 * 6 * 256), shadowN = 0, shadowHolder = {};
  R.shadow = function (x, z, r, a) {
    if (!T || shadowN >= 256) return;
    var o = shadowN * 36, corners = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
    for (var i = 0; i < 6; i++) {
      var px = x + corners[i][0] * r, pz = z + corners[i][1] * r;
      var py = Math.max(WG.heightAt(T, px, pz), WG.waterAt(T, px, pz)) + 0.04;
      shadowV[o++] = px; shadowV[o++] = py; shadowV[o++] = pz; shadowV[o++] = corners[i][0]; shadowV[o++] = corners[i][1]; shadowV[o++] = a == null ? 0.35 : a;
    }
    shadowN++;
  };
  var lightList = [];
  R.light = function (x, y, z, radius, r, g, b) { lightList.push([x, y, z, radius, r, g, b]); };

  var afterObjects = []; // functions(gl, ctx, VP, cam) that draw their own passes after opaque objects (sprites)
  R.afterObjects = function (fn) { afterObjects.push(fn); };
  var hooks = []; // functions(game, alpha) that submit dynamic instances each frame
  R.addHook = function (fn) { hooks.push(fn); };

  // dynamic resolution: keep the frame rate up on weaker phones by rendering fewer pixels
  var perf = (R.perf = { ft: 16, slowT: 0, fastT: 0, draws: 0, tris: 0, show: false });
  function adapt(dt) {
    if (!(dt > 0) || dt > 0.25) return;
    perf.ft += (dt * 1000 - perf.ft) * 0.05;
    if (quality.fixed || R.pixel) return; // pixel mode is already cheap
    if (perf.ft > 38) { perf.slowT += dt; perf.fastT = 0; } else if (perf.ft < 22) { perf.fastT += dt; perf.slowT = 0; } else { perf.slowT = 0; perf.fastT = 0; }
    if (perf.slowT > 2 && quality.scale > 0.5) { quality.scale = Math.max(0.5, quality.scale - 0.15); perf.slowT = 0; R.resize(); }
    else if (perf.fastT > 6 && quality.scale < (quality.max || 1)) { quality.scale = Math.min(quality.max || 1, quality.scale + 0.1); perf.fastT = 0; R.resize(); }
    if (perf.ft > 45 && quality.decor && perf.slowT > 1.5 && quality.scale <= 0.5) quality.decor = false;
  }

  // the explored map as a little texture (one texel per 4×4 tiles, soft-filtered so the cloud edge is fuzzy)
  function updateSeen(world) {
    if (!world || !world.seen) return;
    var S = SB.World.SEEN_N;
    if (!seenTex || seenWorld !== world) {
      seenBuf = new Uint8Array(S * S * 4);
      seenTex = GL.texture(ctx, S, S, null, {});
      seenWorld = world; world.seenDirty = true;
    }
    if (!world.seenDirty) return;
    world.seenDirty = false;
    if (world.seenChunks) { // trees and grass there can show now
      for (var ck in world.seenChunks) { var ch = chunks[ck]; if (!ch) continue; ch.dirty = true; if (ch.decor) { for (var d in ch.decor) gl.deleteBuffer(ch.decor[d].buf); ch.decor = null; } }
      world.seenChunks = {};
    }
    for (var i = 0, s = world.seen; i < s.length; i++) { var o = i * 4; seenBuf[o] = seenBuf[o + 1] = seenBuf[o + 2] = s[i]; seenBuf[o + 3] = 255; }
    gl.bindTexture(gl.TEXTURE_2D, seenTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, S, S, gl.RGBA, gl.UNSIGNED_BYTE, seenBuf);
  }
  R.frame = function (g, dt, alpha) {
    if (!gl || R.lost) return;
    game = g || game;
    time += dt;
    adapt(dt);
    perf.draws = 0; perf.tris = 0;
    updateEnv(game && game.world);
    updateSeen(game && game.world);
    updateCamera(dt);
    for (var k in frameDyn) frameDyn[k].n = 0;
    shadowN = 0; lightList.length = 0;
    for (var h = 0; h < hooks.length; h++) hooks[h](game, alpha || 0, dt);
    if (R.particles) R.particles.update(dt);

    // pick the 8 lights nearest the view centre
    var cx = cam.x, cz = cam.z;
    lightList.sort(function (a, b) { return SB.dist2(a[0], a[2], cx, cz) - SB.dist2(b[0], b[2], cx, cz); });
    lights.fill(0); lightCols.fill(0);
    // only lights that can reach the visible ground; the shader stops after the last one
    var reach = Math.hypot(cam.halfW, cam.halfH / Math.sin(cam.pitch)), cap = Math.min(quality.lights, lightList.length);
    nLights = 0;
    for (var li = 0; li < cap; li++) {
      var L = lightList[li], rr = reach + L[3];
      if (SB.dist2(L[0], L[2], cx, cz) > rr * rr) break;
      nLights++;
      lights[li * 4] = L[0]; lights[li * 4 + 1] = L[1]; lights[li * 4 + 2] = L[2]; lights[li * 4 + 3] = L[3];
      var nk = 0.35 + env.night * 0.9;
      lightCols[li * 3] = L[4] * nk; lightCols[li * 3 + 1] = L[5] * nk; lightCols[li * 3 + 2] = L[6] * nk;
    }

    var P = ensurePost();
    gl.bindFramebuffer(gl.FRAMEBUFFER, P ? P.fb : null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    var fc = env.fog;
    var oc = SB.mixC([0.1, 0.32, 0.52], fc, 0.35);
    if (cam.pov) gl.clearColor(fc[0], fc[1], fc[2], 1); // first person: the horizon is the fog colour
    else gl.clearColor(oc[0] * (1 - env.night * 0.7), oc[1] * (1 - env.night * 0.7), oc[2] * (1 - env.night * 0.6), 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (cam.pov) drawSky();
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.BLEND);
    if (!T) { if (P) drawPost(P); return; }

    var vis = visibleChunks();
    drawTerrain(vis);
    drawShadows();
    drawObjects(vis);
    drawWater(vis);
    // sprites go after the water (they don't write depth): a smol in water is cut off at the waterline instead
    for (var ah = 0; ah < afterObjects.length; ah++) { GL.resetAttribs(ctx); afterObjects[ah](gl, ctx, VP, cam); }
    if (R.particles) R.particles.draw(gl, ctx, progs, VP, cam);
    if (P) drawPost(P);
    if (octx) drawOverlay();
  };

  var corner = [0, 0, 0], nLights = 0;
  function visibleChunks() {
    var out = [], S = SB.CHUNK;
    if (cam.pov) {
      // first person: chunks within the view distance, in front of the eye and inside the view cone
      var e = cam.eye, fx = cam.fwdXZ[0], fz = cam.fwdXZ[1], far = (cam.pov.far || 80) + S * 0.75, half = Math.atan(Math.tan((cam.pov.fov || 1.22) / 2) * W / H) + 0.35;
      for (var pi = 0; pi < chunks.length; pi++) {
        var pc = chunks[pi], mx = pc.ci * S + S / 2 - e[0], mz = pc.cj * S + S / 2 - e[2], md = Math.hypot(mx, mz);
        if (md > far) continue;
        if (md > S * 0.75) { var ca = (mx * fx + mz * fz) / md, ang = Math.acos(SB.clamp(ca, -1, 1)) - Math.asin(Math.min(1, S * 0.72 / md)); if (ang > half) continue; }
        out.push(pc);
      }
      return out;
    }
    for (var i = 0; i < chunks.length; i++) {
      var c = chunks[i], x0 = c.ci * S, z0 = c.cj * S;
      var minx = 9, maxx = -9, miny = 9, maxy = -9;
      for (var q = 0; q < 8; q++) {
        M4.project(VP, x0 + (q & 1 ? S : 0), q & 2 ? c.maxY : c.minY, z0 + (q & 4 ? S : 0), corner);
        if (corner[0] < minx) minx = corner[0]; if (corner[0] > maxx) maxx = corner[0];
        if (corner[1] < miny) miny = corner[1]; if (corner[1] > maxy) maxy = corner[1];
      }
      if (maxx < -1 || minx > 1 || maxy < -1 || miny > 1) continue;
      out.push(c);
    }
    return out;
  }

  function setLightUniforms(p) {
    gl.uniform3fv(p.u.uSunDir, env.sunDir); gl.uniform3fv(p.u.uSunCol, env.sun); gl.uniform3fv(p.u.uSkyCol, env.sky);
    gl.uniform3fv(p.u.uGndCol, env.gnd); gl.uniform3fv(p.u.uFogCol, env.fog);
    var fogFar = cam.halfH * 2.6 / Math.sin(cam.pitch);
    if (cam.pov) {
      // first person: the land fades into the sky colour toward the edge of the view distance
      var pf = cam.pov.far || 80;
      if (p.u.uFog) gl.uniform4f(p.u.uFog, pf * (0.3 - env.rain * 0.12), pf * (0.98 - env.rain * 0.3), 1, 0);
      if (p.u.uCam) gl.uniform4f(p.u.uCam, cam.eye[0], cam.eye[2], cam.fwdXZ[0], cam.fwdXZ[1]);
    } else if (p.u.uFog) gl.uniform4f(p.u.uFog, cam.halfH * 0.4, fogFar, SB.clamp01(0.15 + env.cloud * 0.2 + env.rain * 0.25) * SB.clamp01((cam.zoom - 8) / 40), 0);
    if (p.u.uCam && !cam.pov) {
      var sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
      gl.uniform4f(p.u.uCam, cam.x, cam.z, -sy, -cy);
    }
    if (p.u.uLP) gl.uniform4fv(p.u.uLP, lights);
    if (p.u.uLC) gl.uniform3fv(p.u.uLC, lightCols);
    if (p.u.uNL) gl.uniform1f(p.u.uNL, nLights);
    if (p.u.uNight != null) gl.uniform1f(p.u.uNight, env.night);
    if (p.u.uCloud) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, cloudTex); gl.uniform1i(p.u.uCloud, 0); }
    if (p.u.uCloudP) gl.uniform4f(p.u.uCloudP, time * 0.004 * (0.5 + env.wind), time * 0.0025 * (0.5 + env.wind), 0.012, SB.clamp01(env.cloud * 0.9 + 0.1));
    if (p.u.uSeen) {
      gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, seenTex); gl.uniform1i(p.u.uSeen, 4); gl.activeTexture(gl.TEXTURE0);
      gl.uniform2f(p.u.uSeenK, 1 / SB.WORLD_N, seenTex && !R.noFog ? 1 : 0);
    }
    gl.uniformMatrix4fv(p.u.uVP, false, VP);
  }

  function drawTerrain(vis) {
    var p = progs.terrain;
    GL.resetAttribs(ctx);
    gl.useProgram(p.prog);
    setLightUniforms(p);
    gl.uniform1f(p.u.uSnow, env.snow);
    gl.uniform1f(p.u.uWet, env.wet);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CW);
    frameNo++; terrBudget = 6;
    if (frameNo % 120 === 0) evictChunks();
    var want = R.terrainStep();
    for (var i = 0; i < vis.length; i++) {
      var c = vis[i], st = chunkLOD(c, want), L = c.lod[st];
      c.drawStep = st;
      if (!L) continue;
      GL.attribs(ctx, L.buf, [[p.a.aPos, 3], [p.a.aNrm, 3], [p.a.aCol, 4], [p.a.aMisc, 4]], TSTRIDE, 0);
      gl.drawArrays(gl.TRIANGLES, 0, L.count);
      perf.draws++; perf.tris += L.count / 3;
    }
    gl.disable(gl.CULL_FACE);
  }

  function drawShadows() {
    if (!shadowN) return;
    var p = progs.shadow;
    GL.resetAttribs(ctx);
    gl.useProgram(p.prog);
    gl.uniformMatrix4fv(p.u.uVP, false, VP);
    var sc = SB.mixC([0.05, 0.07, 0.16], [0.02, 0.02, 0.06], env.night);
    gl.uniform3fv(p.u.uShadowCol, sc);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    GL.stream(ctx, shadowHolder, shadowV, shadowN * 36);
    GL.attribs(ctx, shadowHolder.buf, [[p.a.aPos, 3], [p.a.aUvA, 3]], 6, 0);
    gl.drawArrays(gl.TRIANGLES, 0, shadowN * 6);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  function drawInstanced(p, meshKey, buf, n) {
    var m = meshes[meshKey];
    if (!m || !n) return;
    perf.draws++; perf.tris += m.count / 3 * n;
    GL.attribs(ctx, m.buf, [[p.a.aPos, 3], [p.a.aNrm, 3], [p.a.aCol, 4], [p.a.aExt, 2]], STRIDE, 0);
    GL.attribs(ctx, buf, [[p.a.iM0, 4], [p.a.iM1, 4], [p.a.iM2, 4], [p.a.iTint, 4], [p.a.iExt, 4]], ISTRIDE, 1);
    ctx.drawInstanced(gl.TRIANGLES, 0, m.count, n);
  }

  var rebuildBudget = 0;
  function drawObjects(vis) {
    var p = progs.obj;
    GL.resetAttribs(ctx);
    gl.useProgram(p.prog);
    setLightUniforms(p);
    gl.uniform1f(p.u.uTime, time);
    gl.uniform1f(p.u.uWind, 0.4 + env.wind * 1.2 + env.rain * 0.6);
    gl.uniform1f(p.u.uAutumn, env.autumn);
    gl.uniform1f(p.u.uSnow, env.snow);
    rebuildBudget = 4;
    var showDecor = quality.decor && cam.zoom < 26, farObj = R.terrainStep() === 4;
    for (var i = 0; i < vis.length; i++) {
      var c = vis[i];
      if ((c.dirty || !c.groups) && (rebuildBudget-- > 0 || !c.groups)) buildChunkInstances(c);
      for (var key in c.groups) {
        // zoomed right out (big islands) the little plants and rocks are a pixel each: only trees and big rocks
        if (farObj && key.charAt(0) === "n" && meshes[key] && meshes[key].maxY < 1.3) continue;
        drawInstanced(p, key, c.groups[key].buf, c.groups[key].n);
      }
      if (showDecor && !c.decor) buildChunkDecor(c);
      if (showDecor && c.decor) for (var d in c.decor) drawInstanced(p, "d:" + d, c.decor[d].buf, c.decor[d].n);
    }
    for (var k in frameDyn) {
      var dd = frameDyn[k];
      if (!dd.n) continue;
      var hold = dynHolders[k] || (dynHolders[k] = {});
      GL.stream(ctx, hold, dd.data, dd.n * ISTRIDE);
      drawInstanced(p, k, hold.buf, dd.n);
    }
  }

  function drawWater(vis) {
    var p = progs.water;
    GL.resetAttribs(ctx);
    gl.useProgram(p.prog);
    setLightUniforms(p);
    gl.uniform1f(p.u.uTime, time);
    gl.uniform3fv(p.u.uEye, cam.eye);
    gl.uniform1f(p.u.uFreeze, env.freeze);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    for (var i = 0; i < vis.length; i++) {
      var c = vis[i];
      var wt = c.wat[c.drawStep || 1];
      if (!wt) continue;
      GL.attribs(ctx, wt.buf, [[p.a.aPos, 3], [p.a.aInfo, 2]], 5, 0);
      gl.drawArrays(gl.TRIANGLES, 0, wt.count);
    }
    if (ringBuf) { GL.attribs(ctx, ringBuf.buf, [[p.a.aPos, 3], [p.a.aInfo, 2]], 5, 0); gl.drawArrays(gl.TRIANGLES, 0, ringBuf.count); }
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  /* ================= overlay (2D canvas on top) ================= */
  var overlayHooks = [];
  R.addOverlay = function (fn) { overlayHooks.push(fn); };
  function drawOverlay() {
    octx.clearRect(0, 0, W, H);
    for (var i = 0; i < overlayHooks.length; i++) overlayHooks[i](octx, W, H, game);
  }

  // A JPEG/PNG of the current view (for the civilisation card). Renders a frame first so the buffer is fresh.
  R.snapshot = function (type) {
    try { R.frame(game, 0, 0); return canvas.toDataURL(type || "image/jpeg", 0.85); } catch (e) { return null; }
  };
  R.quality = quality;
  R.setLightUniforms = function (p) { setLightUniforms(p); };
  R.LIGHT_GLSL = LIGHT_GLSL; R.PREC = PREC;
  R.canvasSize = function () { return { w: canvas.width, h: canvas.height }; };
  R.canvasScale = function () { return canvas ? canvas.width / W : 1; };
  R.time = function () { return time; };
  R.gl = function () { return ctx; };
  R.programs = progs;
  R.meshes = function () { return meshes; };
  R.terrain = function () { return T; };
})();
