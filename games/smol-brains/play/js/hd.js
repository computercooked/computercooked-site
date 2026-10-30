/* smol brains — hd.js
   The "hd pixel" look (settings → look, or ?look=hd), in the spirit of HD-2D games: the pixel look's low-res
   3D scene and 1px outlines, plus generated pixel-art tiles on the ground and on every tree, rock and
   building (art/hd/tiles.png: grass, dirt, sand, rock, snow, farmland, water, bark, four kinds of leaves,
   stone brick, thatch, planks and roof tiles), drawn pickup sprites (art/hd/items.png, three sizes so they
   stay crisp at every zoom), warm sunlight, and a final pass that softly blurs what's out of focus (depth of
   field), adds a little bloom and grades the colour. The art is only fetched in this look; until it arrives
   (or if it never does) the scene draws exactly like the pixel look. Low quality (weak phones, or the
   settings switch) keeps the tiles and sprites but skips the blur and bloom.
   render.js calls: HD.init, HD.materials (per mesh), HD.uniforms, HD.env, HD.target + HD.post (after the
   outline pass); bodies.js calls HD.item for loose and carried things. */
(function () {
  "use strict";
  var SB = window.SB, R = SB.Render, GL = SB.GL;
  var HD = (SB.HD = {});
  HD.ROWS = 320; // art pixels on the short side of the screen, roughly (the pixel look uses 240)
  HD.BASE = "art/hd/";
  var TILE = { grass: 0, dirt: 1, sand: 2, rock: 3, snow: 4, farmland: 5, water: 6, bark: 7, leaves: 8, needles: 9, blossom: 10, palm: 11, brick: 12, thatch: 13, planks: 14, roof: 15 };
  HD.TILE = TILE;
  var tilesTex = null, itemsTex = null, itemIdx = null, ctxRef = null;

  HD.init = function (ctx) {
    ctxRef = ctx; tilesTex = itemsTex = null; itemIdx = null; prog = null; post = null;
    try { var fx = window.localStorage.getItem("smolbrains-hdfx"); if (fx === "0" || fx === "1") { R.quality.fx = fx === "1"; R.quality.fxPinned = true; } } catch (e) {}
    R.loadArt({ hdTiles: { url: HD.BASE + "tiles.png" }, hdItems: { url: HD.BASE + "items.png" } }, function (art) {
      tilesTex = art.tex.hdTiles || null; itemsTex = art.tex.hdItems || null;
    });
    try {
      if (typeof fetch === "function") fetch(HD.BASE + "items.json").then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j && j.items) itemIdx = j; }, function () {});
    } catch (e) {}
  };
  HD.ready = function () { return !!tilesTex; };
  // the voxel look (vox.js) uses only the last pass: no tiles or sprites are fetched
  HD.initPost = function (ctx) {
    ctxRef = ctx; tilesTex = itemsTex = null; itemIdx = null; prog = null; post = null;
    try { var fx = window.localStorage.getItem("smolbrains-hdfx"); if (fx === "0" || fx === "1") { R.quality.fx = fx === "1"; R.quality.fxPinned = true; } } catch (e) {}
  };

  /* ---------------- which tile each mesh vertex wears ---------------- */
  // From the vertex colour (meshes.js paints parts in flat colours) and what the mesh is. 0 = no tile.
  var LEAFY = { oak: "leaves", birch: "leaves", bush: "leaves", maple: "leaves", mangrove: "leaves", pine: "needles", sakura: "blossom", palm: "palm", giant: "palm", bamboo: "palm", deadtree: "leaves", shroomtree: null, cactus: "palm" };
  var ROCKY = { boulder: 1, flintrock: 1, orevein: 1, basalt: 1, redrock: 1, cave: 1, vent: 1, claybank: 1 };
  function hsl(r, g, b) {
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn, h = 0, s = 0;
    if (d > 1e-4) {
      s = d / (1 - Math.abs(2 * l - 1) || 1);
      h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return [h, Math.min(1, s), l];
  }
  function classify(key, r, g, b, tinted) {
    var kind = key.split(":")[1] || "", t = key.charAt(0), c = hsl(r, g, b), h = c[0], s = c[1], l = c[2];
    if (t === "n") {
      if (ROCKY[kind]) return s < 0.32 || kind === "redrock" || kind === "basalt" ? TILE.rock : 0;
      if (kind === "stump" || kind === "burnt") return TILE.bark;
      if (kind in LEAFY) {
        var fam = LEAFY[kind];
        var leafy = tinted && (h > 55 && h < 175 || kind === "sakura" || kind === "maple");
        if (leafy && fam) return TILE[fam];
        if (kind === "birch" && l > 0.8) return TILE.bark;
        if (h > 8 && h < 55 && s > 0.12 && l < 0.62) return TILE.bark;
        return 0;
      }
      if (kind === "hive" || kind === "nest") return h > 20 && h < 60 ? TILE.thatch : 0;
      return 0;
    }
    if (t === "s") {
      if (kind === "road") return TILE.dirt;
      if (kind === "flame" || kind === "winglow" || kind === "crop") return 0;
      if (kind === "farm" && h > 10 && h < 40 && l < 0.4) return TILE.farmland;
      if (h > 30 && h < 56 && s > 0.45 && l > 0.45) return TILE.thatch;
      if ((h < 22 || h > 340) && s > 0.35 && l > 0.3 && l < 0.7) return TILE.roof;
      if (h > 12 && h < 48 && s > 0.15 && l < 0.66) return TILE.planks;
      if (s < 0.2 && l > 0.25 && l < 0.85) return TILE.brick;
      return 0;
    }
    return 0; // items, creature parts, decor: their own colours (items are sprites in this look anyway)
  }
  HD.classify = classify;
  HD.materials = function (key, data, count, stride) {
    var out = new Float32Array(count), memo = {};
    for (var i = 0; i < count; i++) {
      var o = i * stride + 6, r = data[o], g = data[o + 1], b = data[o + 2], t = data[o + 3] > 0.5;
      var mk = ((r * 255) | 0) + "," + ((g * 255) | 0) + "," + ((b * 255) | 0) + (t ? "t" : "");
      var m = memo[mk]; if (m == null) m = memo[mk] = classify(key, r, g, b, t);
      out[i] = m ? m + 1 : 0; // the shader reads tile = aMat - 1
    }
    return out;
  };

  /* ---------------- per-frame uniforms and light ---------------- */
  var GROUND_TPU = 0.25, GROUND_TPU_POV = 0.6, OBJ_TPU = 0.3; // tiles per world unit (from above a ground tile covers 4x4 world tiles; finer underfoot in first person)
  HD.uniforms = function (gl, p, cam, bh) {
    gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, tilesTex || R.art.blank); gl.uniform1i(p.u.uTiles, 6); gl.activeTexture(gl.TEXTURE0);
    gl.uniform4f(p.u.uHdK, tilesTex ? 0.85 : 0, cam.pov ? 0 : bh / (2 * cam.halfH), cam.pov ? GROUND_TPU_POV : GROUND_TPU, OBJ_TPU);
    if (p.u.uHdE) gl.uniform4f(p.u.uHdE, cam.eye[0], cam.eye[1], cam.eye[2], cam.povK || 1);
  };
  // warm late-afternoon sun, cooler sky fill (the shadows lean lilac), a softer warm haze in the day
  HD.env = function (env) {
    var day = 1 - env.night;
    // (a stronger key light and a dimmer fill: shapes get a lit side and a shadow side)
    env.sun = [env.sun[0] * (1 + 0.16 * day), env.sun[1] * (1 + 0.06 * day), env.sun[2] * (1 - 0.08 * day)];
    env.sky = [env.sky[0] * (1 - 0.18 * day), env.sky[1] * (1 - 0.15 * day), env.sky[2] * (1 - 0.04 * day)];
    env.fog = SB.mixC(env.fog, [env.fog[0] * 1.06, env.fog[1] * 1.0, env.fog[2] * 0.9], day * 0.6);
  };

  // quality fallback: if the soft focus and glow are on and frames stay slow (under ~25 fps for 4 s), turn them
  // off for this visit (unless the player switched them on in settings). The tiles and sprites stay.
  var slowT = 0;
  HD.adapt = function (perf, dt, quality) {
    if (!quality.fx || quality.fxPinned) { slowT = 0; return; }
    slowT = perf.ft > 40 ? slowT + dt : 0;
    if (slowT > 4) { quality.fx = false; slowT = 0; R.resize(); }
  };

  /* ---------------- the final pass: depth of field, bloom, colour ---------------- */
  var post = null; // {fb, col, w, h, ha: {fb, tex}, hb: {fb, tex}, pBlur, pComp, quad}
  var PREC = R.PREC;
  var VS_Q = "attribute vec2 aPos; varying vec2 vUv; void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }";
  // circle of confusion (0 sharp .. 1 fully soft) from the depth buffer. uDof: x = on/strength, y = 1 perspective,
  // z = near, w = far. uFoc: x = focus distance, y = blur starts at focus*y (perspective) or +y units (ortho),
  // z = fully soft at focus*z / +z
  var COC = [
    "uniform sampler2D uDep; uniform vec4 uDof; uniform vec3 uFoc;",
    "float lin(float z) { if (uDof.y < 0.5) return uDof.z + z * (uDof.w - uDof.z); float n = uDof.z, f = uDof.w; return 2.0 * n * f / (f + n - (z * 2.0 - 1.0) * (f - n)); }",
    "float coc(vec2 uv) {",
    "  float d = lin(texture2D(uDep, uv).r), c;",
    "  if (uDof.y > 0.5) {", // first person: focus on what's under the crosshair (an arm's length to 18 units out)
    "    float f = clamp(lin(texture2D(uDep, vec2(0.5, 0.45)).r), 2.5, 18.0);",
    "    c = smoothstep(f * uFoc.y, f * uFoc.z, d) + (1.0 - smoothstep(0.25, 0.9, d)) * 0.6;",
    "  } else c = smoothstep(uFoc.y, uFoc.z, uv.y) + (1.0 - smoothstep(0.0, uFoc.x, uv.y)) * 0.45;", // god view: tilt-shift (the far top and the very bottom go soft)
    "  return clamp(c, 0.0, 1.0) * uDof.x;",
    "}"
  ].join("\n");
  // separable 9-tap gaussian at half resolution; the first pass also downsamples and keeps only what is
  // out of focus or bright (so in-focus things don't smear into the blur around them)
  var FS_BLUR = [PREC,
    "uniform sampler2D uSrc; uniform vec2 uStep; uniform float uFirst;", COC,
    "varying vec2 vUv;",
    "vec4 acc; float wsum;",
    "void tap(vec2 uv, float g) {",
    "  vec4 c = texture2D(uSrc, uv);",
    "  if (uFirst > 0.5) { float br = max(c.r, max(c.g, c.b)); c.a = max(coc(uv), smoothstep(0.72, 0.95, br) * 0.6); }",
    "  float w = g * (0.04 + c.a);", // what's in focus hardly bleeds into the blur round it
    "  acc += c * w; wsum += w;",
    "}",
    "void main() {",
    "  acc = vec4(0.0); wsum = 0.0;",
    "  tap(vUv, 0.2270);",
    "  tap(vUv + uStep * 1.3846, 0.3162); tap(vUv - uStep * 1.3846, 0.3162);",
    "  tap(vUv + uStep * 3.2308, 0.0703); tap(vUv - uStep * 3.2308, 0.0703);",
    "  gl_FragColor = acc / max(wsum, 0.0001);",
    "}"].join("\n");
  var FS_COMP = [PREC,
    "uniform sampler2D uSharp; uniform sampler2D uBlur; uniform vec4 uGrade; uniform vec2 uVig; uniform float uFx;", COC,
    "varying vec2 vUv;",
    "void main() {",
    "  vec3 c = texture2D(uSharp, vUv).rgb;",
    "  if (uFx > 0.5) {",
    "    vec4 b = texture2D(uBlur, vUv);",
    "    float k = coc(vUv);",
    "    c = mix(c, b.rgb, smoothstep(0.0, 0.85, k));",
    "    vec3 glow = max(b.rgb - 0.8, 0.0);",
    "    c += glow * uGrade.w;",                                       // bloom: bright things bleed light
    "  }",
    "  float l = dot(c, vec3(0.299, 0.587, 0.114));",
    "  c = mix(vec3(l), c, uGrade.x);",                                // a little more colour
    "  c = (c - 0.5) * uGrade.y + 0.5;",                               // and contrast
    "  c *= mix(vec3(0.96, 0.95, 1.02), vec3(1.04, 1.0, 0.92), smoothstep(0.15, 0.75, l));", // lilac shadows, honey highlights
    "  vec2 q = vUv - 0.5; c *= 1.0 - dot(q, q) * uVig.x;",            // soft vignette
    "  if (uVig.y > 0.5) c = uVig.y > 1.5 ? vec3(coc(vUv)) : texture2D(uBlur, vUv).rgb;", // SB.HD.debug: 1 = the blur, 2 = focus
    "  gl_FragColor = vec4(c, 1.0);",
    "}"].join("\n");

  function rt(gl, w, h, linear) {
    var t = GL.texture(ctxRef, w, h, null, { nearest: !linear });
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return ok ? { fb: fb, tex: t, w: w, h: h } : null;
  }
  function free(gl, t) { if (t) { gl.deleteFramebuffer(t.fb); gl.deleteTexture(t.tex); } }
  // the buffer the outline pass draws into (null: draw straight to the screen, as in the pixel look)
  HD.target = function (ctx, P) {
    var gl = ctx.gl;
    if (post && post.failed) return null;
    if (post && post.w === P.w && post.h === P.h) return post.a.fb;
    try {
      if (!post) post = { pBlur: GL.program(ctx, VS_Q, FS_BLUR), pComp: GL.program(ctx, VS_Q, FS_COMP), quad: GL.buffer(ctx, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1])) };
      free(gl, post.a); free(gl, post.ha); free(gl, post.hb);
      var hw = Math.max(1, P.w >> 1), hh = Math.max(1, P.h >> 1);
      post.a = rt(gl, P.w, P.h, false); post.ha = rt(gl, hw, hh, true); post.hb = rt(gl, hw, hh, true);
      if (!post.a || !post.ha || !post.hb) { post = { failed: true }; return null; }
      post.w = P.w; post.h = P.h;
      return post.a.fb;
    } catch (e) { post = { failed: true }; return null; }
  };
  function quadDraw(gl, ctx, p) { GL.attribs(ctx, post.quad, [[p.a.aPos, 2]], 2, 0); gl.drawArrays(gl.TRIANGLES, 0, 6); }
  function dofUniforms(gl, p, P, cam) {
    var fx = R.quality.fx;
    if (cam.pov) {
      // first person: focus on what the crosshair is on (at least an arm's length out); the distance goes soft
      var far = (cam.pov.far || 80) + 20;
      gl.uniform4f(p.u.uDof, fx ? 1 : 0, 1, 0.04, far); gl.uniform3f(p.u.uFoc, 0, 1.5, 3.4);
    } else {
      // god view: a gentle tilt-shift. The middle of the screen is sharp, far ground softens a little;
      // zoomed out to a map it switches off so everything stays readable
      var z = cam.zoom, k = 0.8 * (1 - SB.smooth(SB.clamp01((z - 16) / 26)));
      gl.uniform4f(p.u.uDof, fx ? k : 0, 0, 1, 420); gl.uniform3f(p.u.uFoc, 0.16, 0.66, 1.0);
    }
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, P.dep); gl.uniform1i(p.u.uDep, 1);
  }
  HD.post = function (ctx, P, env, cam, canvas) {
    var gl = ctx.gl, fx = R.quality.fx && post.ha;
    GL.resetAttribs(ctx);
    if (fx) {
      var pb = post.pBlur;
      gl.useProgram(pb.prog);
      dofUniforms(gl, pb, P, cam);
      gl.activeTexture(gl.TEXTURE0);
      // pass 1: downsample + horizontal (spacing grows a bit in first person for a softer background)
      var sp = cam.pov ? 1.6 : 1.2;
      gl.bindFramebuffer(gl.FRAMEBUFFER, post.ha.fb); gl.viewport(0, 0, post.ha.w, post.ha.h);
      gl.bindTexture(gl.TEXTURE_2D, post.a.tex); gl.uniform1i(pb.u.uSrc, 0);
      gl.uniform2f(pb.u.uStep, sp / post.ha.w, 0); gl.uniform1f(pb.u.uFirst, 1);
      quadDraw(gl, ctx, pb);
      gl.bindFramebuffer(gl.FRAMEBUFFER, post.hb.fb);
      gl.bindTexture(gl.TEXTURE_2D, post.ha.tex);
      gl.uniform2f(pb.u.uStep, 0, sp / post.hb.h); gl.uniform1f(pb.u.uFirst, 0);
      quadDraw(gl, ctx, pb);
      // a second, wider round in first person: the sample look has a properly soft background
      if (cam.pov) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, post.ha.fb); gl.bindTexture(gl.TEXTURE_2D, post.hb.tex);
        gl.uniform2f(pb.u.uStep, sp * 1.8 / post.ha.w, 0); quadDraw(gl, ctx, pb);
        gl.bindFramebuffer(gl.FRAMEBUFFER, post.hb.fb); gl.bindTexture(gl.TEXTURE_2D, post.ha.tex);
        gl.uniform2f(pb.u.uStep, 0, sp * 1.8 / post.hb.h); quadDraw(gl, ctx, pb);
      }
    }
    var pc = post.pComp;
    gl.useProgram(pc.prog);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    dofUniforms(gl, pc, P, cam);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, post.a.tex); gl.uniform1i(pc.u.uSharp, 0);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, fx ? post.hb.tex : post.a.tex); gl.uniform1i(pc.u.uBlur, 2);
    gl.activeTexture(gl.TEXTURE0);
    var night = env.night;
    gl.uniform1f(pc.u.uFx, fx ? 1 : 0);
    if (R.voxel) gl.uniform4f(pc.u.uGrade, 1.08, 1.06, 0, 0.75 + night * 0.5); // voxel: a richer grade, the Lantern and eyes bloom
    else gl.uniform4f(pc.u.uGrade, 1.0, 1.05, 0, 0.5 + night * 0.4);
    gl.uniform2f(pc.u.uVig, 0.45, HD.debug || 0);
    quadDraw(gl, ctx, pc);
    if (R.perf) R.perf.draws += fx ? (cam.pov ? 5 : 3) : 1;
  };

  /* ---------------- pickup sprites ---------------- */
  // Called by bodies.js for each item it would draw as a 3D mesh. Returns false (draw the mesh) for things
  // with no sprite (critters, the pod, plushies) or before the art has arrived.
  var IS = 13, inst = new Float32Array(IS * 64), n = 0, holder = {}, quad = null, prog = null, pp = {};
  HD.item = function (o, x, y, z, s, tint, glow) {
    if (!itemsTex || !itemIdx) return false;
    var e = itemIdx.items[o.kind];
    if (!e) return false;
    var cam = R.camera, cs = R.canvasSize(), ppu = cs.h / (2 * cam.halfH);
    var def = SB.KINDS[o.kind], r = def ? def.r : 0.15;
    if (cam.pov) { ppu = R.ppuAt(x, y + 0.1, z); if (!ppu || ppu > cam.povK / 0.3) return true; }
    // how tall it should be in art pixels; a native sprite size when it's close to one (crisp), else scaled
    var want = ppu * r * 2.6 * s, size, k;
    if (cam.pov) { size = want < 14 ? 12 : want < 26 ? 16 : 32; k = want / size; }
    else if (want < 14) { size = 12; k = want < 7 ? Math.max(0.5, want / 12) : 1; }
    else if (want < 30) { size = 16; k = 1; }
    else { size = 32; k = Math.max(1, Math.min(2, Math.floor(want / 32 + 0.2))); }
    var c = e[size];
    if (n * IS >= inst.length) { var ni = new Float32Array(inst.length * 2); ni.set(inst); inst = ni; }
    var W = itemIdx.w, H = itemIdx.h, of = n * IS;
    inst[of] = x; inst[of + 1] = y; inst[of + 2] = z;
    inst[of + 3] = size * k; inst[of + 4] = size * k;
    inst[of + 5] = c[0] / W; inst[of + 6] = c[1] / H; inst[of + 7] = (c[0] + size) / W; inst[of + 8] = (c[1] + size) / H;
    inst[of + 9] = tint ? tint[0] : 1; inst[of + 10] = tint ? tint[1] : 1; inst[of + 11] = tint ? tint[2] : 1;
    inst[of + 12] = glow || 0;
    n++;
    return true;
  };
  var VS_S = [
    "attribute vec2 aCorner;",
    "attribute vec3 iPos; attribute vec2 iPx; attribute vec4 iUV; attribute vec3 iTint; attribute float iGlow;",
    "uniform mat4 uVP; uniform vec2 uRes; uniform vec2 uZo; uniform vec4 uFog; uniform vec4 uCam;",
    "varying vec2 vUV; varying vec3 vW; varying vec3 vTint; varying float vGlow; varying float vFog;",
    "void main() {",
    "  vec4 c = uVP * vec4(iPos, 1.0);",
    "  vec2 pix = floor((c.xy / c.w * 0.5 + 0.5) * uRes + 0.5);",
    "  vec2 p = pix + vec2(floor((aCorner.x - 0.5) * iPx.x + 0.5), aCorner.y * iPx.y - 1.0);",
    "  gl_Position = vec4(p / uRes * 2.0 - 1.0, c.z / c.w - uZo.x - uZo.y / (c.w * c.w), 1.0);",
    "  vUV = vec2(mix(iUV.x, iUV.z, aCorner.x), mix(iUV.w, iUV.y, aCorner.y));",
    "  vW = iPos + vec3(0.0, aCorner.y * 0.3, 0.0); vTint = iTint; vGlow = iGlow;",
    "  vFog = smoothstep(uFog.x, uFog.y, dot(iPos.xz - uCam.xy, uCam.zw)) * uFog.z;",
    "}"
  ].join("\n");
  function fsS() {
    return [R.PREC, R.LIGHT_GLSL,
      "uniform sampler2D uItems;",
      "varying vec2 vUV; varying vec3 vW; varying vec3 vTint; varying float vGlow; varying float vFog;",
      "void main() {",
      "  vec4 t = texture2D(uItems, vUV);",
      "  if (t.a < 0.5) discard;",
      "  vec3 col = shade(t.rgb * vTint, normalize(vec3(-0.15, 0.85, 0.5)), vW, vGlow, vFog);",
      "  gl_FragColor = vec4(col, 0.0);", // alpha 0: sprites carry their own outline
      "}"].join("\n");
  }
  R.afterObjects(function (gl, ctx, VP, cam) {
    if (!n || !itemsTex) { n = 0; return; }
    if (!prog) { prog = GL.program(ctx, VS_S, fsS()); quad = GL.buffer(ctx, new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1])); }
    var p = prog;
    gl.useProgram(p.prog);
    R.setLightUniforms(p);
    var cs = R.canvasSize();
    gl.uniform2f(p.u.uRes, cs.w, cs.h);
    if (cam.pov) gl.uniform2f(p.u.uZo, 0, 2 * 0.04 * 0.2); else gl.uniform2f(p.u.uZo, 0.003, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, itemsTex); gl.uniform1i(p.u.uItems, 1);
    GL.attribs(ctx, quad, [[p.a.aCorner, 2]], 2, 0);
    GL.stream(ctx, holder, inst, n * IS);
    GL.attribs(ctx, holder.buf, [[p.a.iPos, 3], [p.a.iPx, 2], [p.a.iUV, 4], [p.a.iTint, 3], [p.a.iGlow, 1]], IS, 1);
    gl.depthMask(!!cam.pov);
    ctx.drawInstanced(gl.TRIANGLES, 0, 6, n);
    gl.depthMask(true);
    gl.activeTexture(gl.TEXTURE0);
    if (R.perf) R.perf.draws++;
    n = 0;
  });
})();
