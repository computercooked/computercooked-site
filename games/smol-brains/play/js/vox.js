/* smol brains — vox.js
   The voxel look (the default from 4.10; settings → look, or ?look=voxel), after the Higgsfield ad: chunky
   block terrain on the back of the sleeping giant, the Lantern as a real warm light, golden-hour light and a
   soft depth of field. It rides on the pixel look's pipeline (the outline pass, sprites far away, voxel smols
   up close) but renders at full resolution, and hd.js's last pass adds the blur, the glow and the grade.
   - Terrain: half-unit cubes. Each column's top is the island's own height at the column's middle, rounded
     to the cube size, plus the giant's spine and ribs (visual only). Tops are greedy-meshed (one quad per run
     of columns at one height) and sides are merged along each edge, so a chunk is a few thousand quads.
     The colour comes from a texture of the island's vertex colours (one texel per vertex, filled per chunk
     as it's built), so merged quads keep every column's own colour; the shader adds grass tops with dirt and
     stone under them, a grass fringe, a faint bevel on every cube and a little per-cube jitter.
   - The sim never sees any of this: it walks on the smooth heightfield. Things are drawn at the visual height
     instead (R.gh / R.vdy), so smols, trees and huts stand on the blocks.
   - The Lantern stands by the nest: a voxel lantern whose amber light grows with each stage.
   render.js calls: Vox.terrainLOD, Vox.drawTerrain, Vox.groundAt, Vox.env, Vox.setWorld. */
(function () {
  "use strict";
  var SB = window.SB, R = SB.Render, GL = SB.GL, WG = SB.WorldGen, ME = SB.Meshes;
  var V = (SB.Vox = {});
  V.CELL = 0.5; // world units per cube (one tile is 2×2 columns up close)

  /* ---------------- the giant: a spine and ribs down the island (visual relief) ---------------- */
  var T = null, spine = null;
  function makeSpine(t) {
    // through the island's middle, along its longer axis (from the land's spread), clear of the nest
    var N = t.N, sx = 0, sz = 0, n = 0, i, j;
    for (j = 4; j < N - 4; j += 4) for (i = 4; i < N - 4; i += 4) if (t.h[j * t.V + i] > SB.SEA + 0.4) { sx += i; sz += j; n++; }
    if (!n) return null;
    var cx = sx / n, cz = sz / n, xx = 0, zz = 0, xz = 0;
    for (j = 4; j < N - 4; j += 4) for (i = 4; i < N - 4; i += 4) if (t.h[j * t.V + i] > SB.SEA + 0.4) { var dx = i - cx, dz = j - cz; xx += dx * dx; zz += dz * dz; xz += dx * dz; }
    var a = 0.5 * Math.atan2(2 * xz, xx - zz), dxv = Math.cos(a), dzv = Math.sin(a);
    var half = Math.sqrt(Math.max(xx, zz) / n) * 1.7;
    return { cx: cx, cz: cz, dx: dxv, dz: dzv, half: half, nx: t.spawn ? t.spawn.x : -999, nz: t.spawn ? t.spawn.z : -999 };
  }
  V.spine = function () { return spine; };
  // how high the giant's bones push the ground here (0 off them), and how rocky it is (0..1)
  var RELIEF = [0, 0];
  function relief(x, z, out) {
    out[0] = 0; out[1] = 0;
    var s = spine;
    if (!s) return out;
    var px = x - s.cx, pz = z - s.cz, t = px * s.dx + pz * s.dz, d = -px * s.dz + pz * s.dx, ad = Math.abs(d);
    if (Math.abs(t) > s.half || ad > 14) return out;
    var nd = (x - s.nx) * (x - s.nx) + (z - s.nz) * (z - s.nz);
    if (nd < 100) return out; // the nest's hill stays as it is
    var end = 1 - SB.smooth(SB.clamp01((Math.abs(t) - s.half * 0.75) / (s.half * 0.25))), keep = SB.smooth(SB.clamp01((nd - 100) / 120));
    // the spine: a low ridge with a vertebra every 6 units
    var m = ((t % 6) + 6) % 6, vert = SB.smooth(SB.clamp01(1 - Math.abs(m - 3) / 2.1)), across = SB.smooth(SB.clamp01(1 - ad / 1.7));
    var hs = across * (0.5 + vert * 1.0);
    // ribs: every 18 units a low curve out to each side, sweeping back toward the tail
    var rm = ((t + ad * 0.35) % 18 + 18) % 18, rib = SB.smooth(SB.clamp01(1 - Math.abs(rm - 9) / 0.9)) * SB.smooth(SB.clamp01((ad - 1.2) / 1.5)) * SB.smooth(SB.clamp01((13 - ad) / 4));
    var h = Math.max(hs, rib * 0.5) * end * keep;
    out[0] = h; out[1] = Math.max(across * end * keep, rib * end * keep * 0.8);
    return out;
  }
  V.relief = function (x, z) { var o = relief(x, z, [0, 0]); return o[0]; };

  // the top of the cube column at (x, z) (step: 1 = half-unit cubes, 2 and 4 for far zooms)
  function q(h) { return Math.round(h * 2) / 2; }
  function colTop(ci, cj, cell) {
    var x = (ci + 0.5) * cell, z = (cj + 0.5) * cell, h = WG.heightAt(T, x, z);
    if (h > SB.SEA + 0.25) { var w = WG.waterAt(T, x, z); if (w === T.NONE || w <= h + 0.05) h += relief(x, z, RELIEF)[0]; }
    return q(h);
  }
  V.groundAt = function (x, z) { return T ? colTop(Math.floor(x / V.CELL), Math.floor(z / V.CELL), V.CELL) : 0; };
  // how much higher the drawn ground is than the sim's here (0 in water: swimmers stay at the surface)
  V.dy = function (x, z) {
    if (!T) return 0;
    var h = WG.heightAt(T, x, z), w = WG.waterAt(T, x, z);
    if (w !== T.NONE && w > h + 0.1) return 0;
    return V.groundAt(x, z) - h;
  };

  /* ---------------- colour textures: one texel per island vertex, filled chunk by chunk ---------------- */
  var texA = null, texB = null, texV = 0, texCtx = null, filled = null;
  V.setWorld = function (t, ctx) {
    T = t; spine = makeSpine(t);
    var gl = ctx.gl;
    if (texA && texCtx === ctx) { gl.deleteTexture(texA); gl.deleteTexture(texB); }
    texCtx = ctx; texV = t.V;
    texA = GL.texture(ctx, texV, texV, null, {}); texB = GL.texture(ctx, texV, texV, null, {});
    filled = {};
  };
  var BONE = [0.66, 0.63, 0.56], MOSS = [0.38, 0.52, 0.26];
  function fillChunk(c) {
    var key = c.ci + "," + c.cj;
    if (filled[key]) return;
    filled[key] = true;
    var S = SB.CHUNK, i0 = c.ci * S, j0 = c.cj * S, n = S + 1, A = new Uint8Array(n * n * 4), Bb = new Uint8Array(n * n * 4), vc = [0, 0, 0, 0], V2 = T.V;
    for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) {
      var vi = i0 + i, vj = j0 + j, o = (j * n + i) * 4;
      if (vi >= V2 || vj >= V2) continue;
      R.vertexColor(vi, vj, vc);
      var rl = relief(vi, vj, RELIEF)[1];
      if (rl > 0.02 && T.h[vj * V2 + vi] > SB.SEA + 0.25) { // the giant's bones: weathered stone with moss in the cracks
        var mossy = SB.hash(vi, vj, 21) < 0.35 ? 1 : 0, bc = mossy ? MOSS : BONE, k = Math.min(1, rl * 1.2);
        vc[0] += (bc[0] - vc[0]) * k; vc[1] += (bc[1] - vc[1]) * k; vc[2] += (bc[2] - vc[2]) * k;
      }
      A[o] = vc[0] * 255; A[o + 1] = vc[1] * 255; A[o + 2] = vc[2] * 255; A[o + 3] = vc[3] * 255;
      Bb[o] = Math.min(1, R.aoAt(vj * V2 + vi)) * 255; Bb[o + 1] = T.river[vj * V2 + vi] ? 255 : 0; Bb[o + 2] = rl * 255; Bb[o + 3] = 255;
    }
    var gl = texCtx.gl, w = Math.min(n, V2 - i0), h = Math.min(n, V2 - j0);
    if (w <= 0 || h <= 0) return;
    if (w < n || h < n) { // the last row and column of the island: copy just what fits
      var A2 = new Uint8Array(w * h * 4), B2 = new Uint8Array(w * h * 4);
      for (var r = 0; r < h; r++) { A2.set(A.subarray(r * n * 4, r * n * 4 + w * 4), r * w * 4); B2.set(Bb.subarray(r * n * 4, r * n * 4 + w * 4), r * w * 4); }
      A = A2; Bb = B2;
    }
    gl.bindTexture(gl.TEXTURE_2D, texA); gl.texSubImage2D(gl.TEXTURE_2D, 0, i0, j0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, A);
    gl.bindTexture(gl.TEXTURE_2D, texB); gl.texSubImage2D(gl.TEXTURE_2D, 0, i0, j0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, Bb);
  }

  /* ---------------- the chunk mesher ---------------- */
  // 7 floats a vertex: position, normal, the top of the column this face belongs to
  var VSTRIDE = (V.STRIDE = 7);
  V.terrainLOD = function (c, step, ctx) {
    fillChunk(c);
    var S = SB.CHUNK, cell = V.CELL * step, G = Math.round(S / cell), ci0 = Math.round(c.ci * S / cell), cj0 = Math.round(c.cj * S / cell);
    var GW = G + 2, H = new Float32Array(GW * GW), x, z, i, j;
    for (j = 0; j < GW; j++) for (i = 0; i < GW; i++) H[j * GW + i] = colTop(ci0 + i - 1, cj0 + j - 1, cell);
    var out = [], minY = 1e9, maxY = -1e9;
    function vtx(px, py, pz, nx, ny, nz, top) { out.push(px, py, pz, nx, ny, nz, top); }
    function quad(a, b, cc, d, nx, ny, nz, top) { // a b c d in order round the quad
      vtx(a[0], a[1], a[2], nx, ny, nz, top); vtx(b[0], b[1], b[2], nx, ny, nz, top); vtx(cc[0], cc[1], cc[2], nx, ny, nz, top);
      vtx(a[0], a[1], a[2], nx, ny, nz, top); vtx(cc[0], cc[1], cc[2], nx, ny, nz, top); vtx(d[0], d[1], d[2], nx, ny, nz, top);
    }
    var X0 = ci0 * cell, Z0 = cj0 * cell;
    // tops, greedy: grow each run along x, then down z while the whole row matches
    var used = new Uint8Array(G * G);
    for (j = 0; j < G; j++) for (i = 0; i < G; i++) {
      if (used[j * G + i]) continue;
      var h = H[(j + 1) * GW + i + 1], w = 1, d = 1;
      while (i + w < G && !used[j * G + i + w] && H[(j + 1) * GW + i + w + 1] === h) w++;
      grow: while (j + d < G) { for (x = 0; x < w; x++) if (used[(j + d) * G + i + x] || H[(j + d + 1) * GW + i + x + 1] !== h) break grow; d++; }
      for (z = 0; z < d; z++) for (x = 0; x < w; x++) used[(j + z) * G + i + x] = 1;
      var xa = X0 + i * cell, xb = xa + w * cell, za = Z0 + j * cell, zb = za + d * cell;
      quad([xa, h, za], [xb, h, za], [xb, h, zb], [xa, h, zb], 0, 1, 0, h);
      if (h < minY) minY = h; if (h > maxY) maxY = h;
    }
    // sides: where a column stands above its neighbour, a wall down to it, merged along the edge. Both chunks
    // draw the walls on their shared border, so nothing is missing when only one of them is in view.
    // edge e lies between local columns e-1 and e (H is offset by one for the border ring)
    function HA(alongX, e, r) { return alongX ? H[(r + 1) * GW + e] : H[e * GW + r + 1]; }
    function HB(alongX, e, r) { return alongX ? H[(r + 1) * GW + e + 1] : H[(e + 1) * GW + r + 1]; }
    function walls(alongX) {
      for (var e = 0; e <= G; e++) {
        var r = 0;
        while (r < G) {
          var ha = HA(alongX, e, r), hb = HB(alongX, e, r);
          if (ha === hb) { r++; continue; }
          var run = 1; // merge with the following rows while this edge has the same two heights
          while (r + run < G && HA(alongX, e, r + run) === ha && HB(alongX, e, r + run) === hb) run++;
          var hi = Math.max(ha, hb), lo = Math.min(ha, hb), sgn = ha > hb ? 1 : -1; // the wall faces the lower side
          var p = (alongX ? X0 : Z0) + e * cell, s0 = (alongX ? Z0 : X0) + r * cell, s1 = s0 + run * cell;
          if (alongX) quad([p, hi, s0], [p, hi, s1], [p, lo, s1], [p, lo, s0], sgn, 0, 0, hi);
          else quad([s0, hi, p], [s1, hi, p], [s1, lo, p], [s0, lo, p], 0, 0, sgn, hi);
          if (lo < minY) minY = lo;
          r += run;
        }
      }
    }
    walls(true); walls(false);
    var arr = new Float32Array(out);
    return { buf: GL.buffer(ctx, arr), count: arr.length / VSTRIDE, minY: minY, maxY: maxY };
  };

  /* ---------------- the terrain shader ---------------- */
  var VS = [
    "attribute vec3 aPos; attribute vec3 aNrm; attribute float aTop;",
    "uniform mat4 uVP; uniform vec4 uFog; uniform vec4 uCam;",
    "varying vec3 vN; varying vec3 vW; varying float vTop; varying float vFog;",
    "void main() {",
    "  vN = aNrm; vW = aPos; vTop = aTop;",
    "  vFog = smoothstep(uFog.x, uFog.y, dot(aPos.xz - uCam.xy, uCam.zw)) * uFog.z;",
    "  gl_Position = uVP * vec4(aPos, 1.0);",
    "}"
  ].join("\n");
  function fsSrc() {
    return [R.PREC, R.LIGHT_GLSL,
      "uniform sampler2D uTA; uniform sampler2D uTB; uniform vec4 uTK; uniform float uSnow; uniform float uWet;",
      "varying vec3 vN; varying vec3 vW; varying float vTop; varying float vFog;",
      "float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }",
      "void main() {",
      "  vec3 n = normalize(vN);",
      "  float cs = uTK.y;",
      "  vec3 qp = vW - n * 0.01;", // just inside the cube this face belongs to
      "  vec3 cid = floor(qp / cs);",
      "  vec2 uv = ((cid.xz + 0.5) * cs + 0.5) * uTK.x;",
      "  vec4 A = texture2D(uTA, uv); vec4 B = texture2D(uTB, uv);",
      "  vec3 top = A.rgb, col;",
      "  float j = hash(cid), depth = vTop - vW.y;",
      "  float green = smoothstep(0.02, 0.12, top.g - max(top.r, top.b) * 0.92) * (1.0 - B.b);",
      // mossy patches (darker, bluer green) drift across the grass, and every cube is a shade off its neighbours
      "  float moss = smoothstep(0.42, 0.62, texture2D(uCloud, (cid.xz + 0.5) * cs * 0.045).r) * green;",
      "  top = mix(top, top * vec3(0.74, 0.88, 0.7), moss);",
      "  if (n.y > 0.5) col = top * (0.9 + 0.16 * j);",
      "  else {",
      // under grass is earth, under sand more sand, under rock and bone more rock; deeper down it is all stone
      "    vec3 soil = mix(top * 0.8, vec3(0.47, 0.33, 0.22), green * 0.9);",
      "    vec3 stone = mix(vec3(0.46, 0.44, 0.47), top * 0.7, 0.3);",
      "    col = mix(soil, stone, smoothstep(1.0, 2.2, depth));",
      "    float fr = 0.06 + 0.1 * hash(vec3(floor((qp.x + qp.z) * 10.0), cid.y, 3.0));", // the grass hangs over the edge, ragged
      "    col = mix(col, top * 0.95, green * (1.0 - step(fr, depth)));",
      "    col *= (0.9 + 0.1 * j) * (1.0 - smoothstep(0.0, 3.0, depth) * 0.22);",
      "  }",
      // a faint bevel round every cube (fades out zoomed far away, where it would shimmer)
      "  vec3 f = fract(qp / cs); vec3 e = min(f, 1.0 - f);",
      "  float ed = n.y > 0.5 ? min(e.x, e.z) : abs(n.x) > 0.5 ? min(e.y, e.z) : min(e.x, e.y);",
      "  col *= 1.0 - uTK.z * (1.0 - smoothstep(0.0, 0.07, ed)) + uTK.z * 0.35 * (1.0 - smoothstep(0.07, 0.14, ed)) * step(0.5, n.y);",
      "  float s = smoothstep(0.28, 0.62, A.a * uSnow + (n.y - 1.0) * 0.6);",
      "  col = mix(col, vec3(0.93, 0.95, 0.98), s);",
      "  col *= 1.0 - B.r * 0.35;", // shade under the trees
      "  col *= 1.0 - uWet * 0.18 * (1.0 - s);",
      "  gl_FragColor = vec4(shade(col, n, vW, 0.0, vFog), 1.0);",
      "}"].join("\n");
  }
  var prog = null, progCtx = null;
  V.drawTerrain = function (gl, ctx, list, setLight, env, cam, perf) {
    if (progCtx !== ctx) { prog = GL.program(ctx, VS, fsSrc()); progCtx = ctx; }
    var p = prog;
    GL.resetAttribs(ctx);
    gl.useProgram(p.prog);
    setLight(p);
    gl.uniform1f(p.u.uSnow, env.snow); gl.uniform1f(p.u.uWet, env.wet);
    gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, texA); gl.uniform1i(p.u.uTA, 5);
    gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, texB); gl.uniform1i(p.u.uTB, 6);
    gl.activeTexture(gl.TEXTURE0);
    var bevel = cam.pov ? 0.12 : 0.12 * (1 - SB.smooth(SB.clamp01((cam.zoom - 14) / 24)));
    for (var i = 0; i < list.length; i++) {
      var L = list[i];
      gl.uniform4f(p.u.uTK, 1 / texV, V.CELL * L.step, bevel, 0);
      GL.attribs(ctx, L.buf, [[p.a.aPos, 3], [p.a.aNrm, 3], [p.a.aTop, 1]], VSTRIDE, 0);
      gl.drawArrays(gl.TRIANGLES, 0, L.count);
      perf.draws++; perf.tris += L.count / 3;
    }
  };

  /* ---------------- golden hour ---------------- */
  // the whole day leans warm: a honey sun with long light, cooler lilac shade, a warm haze
  V.env = function (env) {
    var day = 1 - env.night;
    env.sun = [env.sun[0] * (1 + 0.14 * day), env.sun[1] * (1 + 0.03 * day), env.sun[2] * (1 - 0.1 * day)];
    env.sky = [env.sky[0] * (1 - 0.08 * day), env.sky[1] * (1 - 0.04 * day), env.sky[2] * (1 + 0.06 * day)];
    env.fog = SB.mixC(env.fog, [env.fog[0] * 1.1 + 0.03, env.fog[1] * 0.98, env.fog[2] * 0.84], day * 0.7);
    // a lower sun: long, raking light that picks out every block edge
    var sd = env.sunDir, ly = Math.min(sd[1], 0.62 + env.night * 0.4), lh = Math.hypot(sd[0], sd[2]) || 1, hz = Math.sqrt(Math.max(0, 1 - ly * ly));
    env.sunDir = [sd[0] / lh * hz, ly, sd[2] / lh * hz];
  };

  /* ---------------- meshes: the Lantern ---------------- */
  // a little box builder in meshes.js's vertex format (pos, normal, rgb + tint mask, flex, glow)
  function boxes(list) {
    var out = [], F = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    list.forEach(function (b) {
      var x0 = b[0], y0 = b[1], z0 = b[2], x1 = b[3], y1 = b[4], z1 = b[5], c = b[6], em = b[7] || 0;
      F.forEach(function (n) {
        var ax = n[0] ? 0 : n[1] ? 1 : 2, P = [];
        var lo = [x0, y0, z0], hi = [x1, y1, z1], t1 = ax === 0 ? 1 : 0, t2 = ax === 2 ? 1 : 2;
        [[0, 0], [1, 0], [1, 1], [0, 1]].forEach(function (k) { var p = [0, 0, 0]; p[ax] = n[ax] > 0 ? hi[ax] : lo[ax]; p[t1] = k[0] ? hi[t1] : lo[t1]; p[t2] = k[1] ? hi[t2] : lo[t2]; P.push(p); });
        var sh = n[1] < 0 ? 0.7 : 1;
        [0, 1, 2, 0, 2, 3].forEach(function (k) { var p = P[k]; out.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0] * sh, c[1] * sh, c[2] * sh, 0, 0, em); });
      });
    });
    var a = new Float32Array(out), minY = 1e9, maxY = -1e9, rad = 0;
    for (var i = 0; i < a.length; i += 12) { minY = Math.min(minY, a[i + 1]); maxY = Math.max(maxY, a[i + 1]); rad = Math.max(rad, Math.hypot(a[i], a[i + 2])); }
    return { data: a, count: a.length / 12, minY: minY, maxY: maxY, rad: rad };
  }
  V.boxes = boxes;
  function lanternMesh() {
    var stone = [0.52, 0.5, 0.5], stone2 = [0.42, 0.4, 0.42], iron = [0.2, 0.17, 0.16], wood = [0.45, 0.3, 0.18], amber = [1.0, 0.56, 0.16], gold = [0.95, 0.75, 0.32];
    var u = 0.1, L = [];
    function b(x, y, z, w, h, d, c, em) { L.push([x * u, y * u, z * u, (x + w) * u, (y + h) * u, (z + d) * u, c, em]); }
    // a stepped stone plinth
    b(-6, 0, -6, 12, 2, 12, stone2); b(-5, 2, -5, 10, 2, 10, stone); b(-2, 4, -2, 4, 6, 4, stone2);
    // the lamp: a dark iron cage round a glowing amber heart, with a roof and a ring on top
    b(-4, 10, -4, 8, 1, 8, iron);
    [[-4, -4], [3, -4], [-4, 3], [3, 3]].forEach(function (p) { b(p[0], 11, p[1], 1, 7, 1, iron); });
    b(-3, 11, -3, 6, 6, 6, amber, 1); b(-2, 12, -2, 4, 4, 4, [1.0, 0.78, 0.4], 1.4);
    b(-5, 18, -5, 10, 1, 10, iron); b(-4, 19, -4, 8, 1, 8, wood); b(-2, 20, -2, 4, 1, 4, iron); b(-1, 21, -1, 2, 2, 2, gold, 0.4);
    return boxes(L);
  }
  /* ---------------- the voxelizer: any meshes.js shape as chunky blocks ---------------- */
  // A grid of cells, each holding an attribute index (0 = empty), meshed into quads: only faces that look out
  // (toward cells reachable from outside the grid, so the hollow inside a shell is never drawn), merged greedily
  // per slice where neighbouring cells share an attribute. attrs[k] = [r, g, b, tintMask, flex, glow].
  function meshCells(cell, nx, ny, nz, vs, ox, oy, oz, attrs) {
    var NX = nx + 2, NY = ny + 2, NZ = nz + 2, out = new Uint8Array(NX * NY * NZ), stack = [0];
    function I(x, y, z) { return (y * NZ + z) * NX + x; } // padded coordinates
    function C(x, y, z) { return x < 1 || y < 1 || z < 1 || x > nx || y > ny || z > nz ? 0 : cell[((y - 1) * nz + (z - 1)) * nx + (x - 1)]; }
    // flood the empty space from the padded corner: what it reaches is "outside"
    out[0] = 1;
    while (stack.length) {
      var k = stack.pop(), x = k % NX, r = (k - x) / NX, z = r % NZ, y = (r - z) / NZ;
      var nb = [[x + 1, y, z], [x - 1, y, z], [x, y + 1, z], [x, y - 1, z], [x, y, z + 1], [x, y, z - 1]];
      for (var q = 0; q < 6; q++) {
        var a = nb[q][0], b = nb[q][1], c = nb[q][2];
        if (a < 0 || b < 0 || c < 0 || a >= NX || b >= NY || c >= NZ) continue;
        var ii = I(a, b, c);
        if (out[ii] || C(a, b, c)) continue;
        out[ii] = 1; stack.push(ii);
      }
    }
    var verts = [], DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], dims = [nx, ny, nz];
    for (var d = 0; d < 6; d++) {
      var D = DIRS[d], ax = D[0] ? 0 : D[1] ? 1 : 2, u = (ax + 1) % 3, v = (ax + 2) % 3, du = dims[u], dv = dims[v];
      var mask = new Int32Array(du * dv), p = [0, 0, 0];
      for (var s = 1; s <= dims[ax]; s++) {
        for (var j = 0; j < dv; j++) for (var i = 0; i < du; i++) {
          p[ax] = s; p[u] = i + 1; p[v] = j + 1;
          var cv = C(p[0], p[1], p[2]);
          mask[j * du + i] = cv && out[I(p[0] + D[0], p[1] + D[1], p[2] + D[2])] ? cv : 0;
        }
        for (j = 0; j < dv; j++) for (i = 0; i < du; ) {
          var m = mask[j * du + i];
          if (!m) { i++; continue; }
          var w = 1, h = 1;
          while (i + w < du && mask[j * du + i + w] === m) w++;
          grow: while (j + h < dv) { for (var e = 0; e < w; e++) if (mask[(j + h) * du + i + e] !== m) break grow; h++; }
          for (var y2 = 0; y2 < h; y2++) for (var x2 = 0; x2 < w; x2++) mask[(j + y2) * du + i + x2] = 0;
          // the quad, in world units
          var A = attrs[m], sh = D[1] < 0 ? 0.78 : 1, P = [], base = [0, 0, 0];
          base[ax] = (D[ax] > 0 ? s : s - 1); base[u] = i; base[v] = j;
          [[0, 0], [w, 0], [w, h], [0, h]].forEach(function (o) { var q3 = base.slice(); q3[u] += o[0]; q3[v] += o[1]; P.push([ox + q3[0] * vs, oy + q3[1] * vs, oz + q3[2] * vs]); });
          [0, 1, 2, 0, 2, 3].forEach(function (k2) { var pp = P[k2]; verts.push(pp[0], pp[1], pp[2], D[0], D[1], D[2], A[0] * sh, A[1] * sh, A[2] * sh, A[3], A[4], A[5]); });
          i += w;
        }
      }
    }
    var arr = new Float32Array(verts), minY = 1e9, maxY = -1e9, rad = 0;
    for (var t = 0; t < arr.length; t += 12) { if (arr[t + 1] < minY) minY = arr[t + 1]; if (arr[t + 1] > maxY) maxY = arr[t + 1]; rad = Math.max(rad, Math.hypot(arr[t], arr[t + 2])); }
    return { data: arr, count: arr.length / 12, minY: minY, maxY: maxY, rad: rad };
  }
  V.meshCells = meshCells;
  // a mesh's triangles, sampled densely, mark the cells they pass through with that triangle's colour
  V.voxelize = function (mesh, opts) {
    opts = opts || {};
    var a = mesh.data, n = mesh.count, S = ME.STRIDE, i;
    var lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (i = 0; i < n; i++) for (var k = 0; k < 3; k++) { var c = a[i * S + k]; if (c < lo[k]) lo[k] = c; if (c > hi[k]) hi[k] = c; }
    var big = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
    if (!(big > 0)) return mesh;
    var vs = opts.vs || SB.clamp(big / (opts.res || 13), opts.min || 0.04, 0.26);
    var ox = Math.floor(lo[0] / vs) * vs, oy = Math.floor(lo[1] / vs) * vs, oz = Math.floor(lo[2] / vs) * vs;
    var nx = Math.ceil((hi[0] - ox) / vs) + 1, ny = Math.ceil((hi[1] - oy) / vs) + 1, nz = Math.ceil((hi[2] - oz) / vs) + 1;
    if (nx * ny * nz > 220000) return mesh;
    var cell = new Int32Array(nx * ny * nz), attrs = [null], akey = {};
    function attrOf(o) {
      var key = (a[o + 6] * 31 | 0) + "," + (a[o + 7] * 31 | 0) + "," + (a[o + 8] * 31 | 0) + "," + (a[o + 9] > 0.5 ? 1 : 0) + "," + Math.round(a[o + 10] * 6) + "," + Math.round(a[o + 11] * 4);
      var id = akey[key];
      if (!id) { id = akey[key] = attrs.length; attrs.push([a[o + 6], a[o + 7], a[o + 8], a[o + 9] > 0.5 ? 1 : 0, Math.round(a[o + 10] * 6) / 6, Math.round(a[o + 11] * 4) / 4]); }
      return id;
    }
    for (var t = 0; t + 2 < n; t += 3) {
      var o0 = t * S, o1 = o0 + S, o2 = o1 + S, id = attrOf(o0);
      var e1 = Math.hypot(a[o1] - a[o0], a[o1 + 1] - a[o0 + 1], a[o1 + 2] - a[o0 + 2]), e2 = Math.hypot(a[o2] - a[o0], a[o2 + 1] - a[o0 + 1], a[o2 + 2] - a[o0 + 2]);
      var st = Math.max(1, Math.ceil(Math.max(e1, e2) / (vs * 0.45)));
      for (var p = 0; p <= st; p++) for (var q2 = 0; q2 <= st - p; q2++) {
        var fa = p / st, fb = q2 / st, fc = 1 - fa - fb;
        var x = a[o0] * fc + a[o1] * fa + a[o2] * fb, y = a[o0 + 1] * fc + a[o1 + 1] * fa + a[o2 + 1] * fb, z = a[o0 + 2] * fc + a[o1 + 2] * fa + a[o2 + 2] * fb;
        var cx = Math.floor((x - ox) / vs), cy = Math.floor((y - oy) / vs), cz = Math.floor((z - oz) / vs);
        if (cx < 0 || cy < 0 || cz < 0 || cx >= nx || cy >= ny || cz >= nz) continue;
        cell[(cy * nz + cz) * nx + cx] = id;
      }
    }
    var m = meshCells(cell, nx, ny, nz, vs, ox, oy, oz, attrs);
    m.minY = mesh.minY; m.maxY = mesh.maxY; m.rad = mesh.rad;
    return m.count ? m : mesh;
  };
  // which meshes become blocks in the voxel look, and how fine (grass and flowers need finer cells to keep their shape)
  V.voxOpts = function (key) {
    var t = key.charAt(0), kind = key.split(":")[1] || "";
    if (t === "p" || key === "s:road" || key === "s:winglow" || key === "s:ring" || t === "v") return null;
    if (t === "d") return { res: 6, min: 0.028 }; // grass and flowers: a few small cubes each (there are thousands)
    if (t === "i") return { res: 8, min: 0.025 };
    if (kind === "reeds" || kind === "herbs" || kind === "roots") return { res: 7, min: 0.05 };
    if (kind === "boulder" || kind === "flintrock" || kind === "orevein" || kind === "redrock" || kind === "claybank") return { res: 8 };
    return { res: 12 };
  };

  /* ---------------- crash debris ---------------- */
  function debrisMeshes() {
    var hull = [0.78, 0.8, 0.84], dark = [0.28, 0.29, 0.33], scorch = [0.18, 0.15, 0.14], dirt = [0.45, 0.32, 0.22], u = 0.06, o = {};
    function B(L, x, y, z, w, h, d, c, em) { L.push([x * u, y * u, z * u, (x + w) * u, (y + h) * u, (z + d) * u, c, em]); }
    var a = []; B(a, -2, 0, -1, 4, 1, 3, hull); B(a, -1, 1, -1, 2, 1, 2, dark); o["v:deb0"] = boxes(a); // a hull plate
    var b = []; B(b, -1, 0, -1, 2, 2, 2, dark); B(b, -1, 2, 0, 1, 1, 1, [0.4, 0.9, 1.0], 0.8); o["v:deb1"] = boxes(b); // a burnt-out box with a light still on
    var c = []; B(c, -2, 0, -2, 4, 1, 4, scorch); B(c, -1, 1, -1, 2, 1, 2, dirt); o["v:deb2"] = boxes(c); // scorched clods
    var d = []; B(d, -3, 0, 0, 6, 1, 1, hull); B(d, 2, 1, 0, 1, 1, 1, hull); o["v:deb3"] = boxes(d); // a bent strut
    return o;
  }
  // a pod's wreckage: chunks thrown out along its skid, scorched earth round it (positions fixed by the pod)
  V.debris = function (x, z, seed, s) {
    var out = [];
    for (var i = 0; i < 11; i++) {
      var a = SB.hash(seed, i, 41) * 6.283, r = (0.9 + SB.hash(seed, i, 42) * 1.9) * s, k = (SB.hash(seed, i, 43) * 4) | 0;
      out.push({ key: "v:deb" + k, x: x + Math.cos(a) * r, z: z + Math.sin(a) * r, rot: SB.hash(seed, i, 44) * 6.283, s: (0.8 + SB.hash(seed, i, 45) * 0.8) * s });
    }
    return out;
  };

  /* ---------------- the Hollow: the giant's head and hand, asleep in the sea past the end of its spine ---------------- */
  // One cube per world unit. Local x runs out from the coast along the spine, y up from the sea, z across.
  // The head lies on its cheek facing +z: a closed eye with heavy lashes, a nose, a long mouth line, an ear,
  // moss and grass over the crown; a hand rests by the face with its fingers in the water.
  function giantMesh() {
    var NX = 52, NY = 26, NZ = 70, OXg = -6, OYg = -10, OZg = -36, cell = new Int32Array(NX * NY * NZ), attrs = [null], ak = {};
    function A(c, em) { var k = c.join(",") + (em || 0); if (!ak[k]) { ak[k] = attrs.length; attrs.push([c[0], c[1], c[2], 0, 0, em || 0]); } return ak[k]; }
    function put(x, y, z, c) { x -= OXg; y -= OYg; z -= OZg; if (x < 0 || y < 0 || z < 0 || x >= NX || y >= NY || z >= NZ) return; cell[(y * NZ + z) * NX + x] = A(c); }
    function get(x, y, z) { x -= OXg; y -= OYg; z -= OZg; if (x < 0 || y < 0 || z < 0 || x >= NX || y >= NY || z >= NZ) return 0; return cell[(y * NZ + z) * NX + x]; }
    function top(x, z) { for (var yy = OYg + NY - 1; yy >= OYg; yy--) if (get(x, yy, z)) return yy; return -999; }
    var SKIN = [0.8, 0.64, 0.52], SKIN2 = [0.72, 0.56, 0.45], SHADE = [0.6, 0.46, 0.38], MOSSC = [0.34, 0.5, 0.24], GRASS = [0.45, 0.66, 0.3], LASH = [0.2, 0.13, 0.12], LIP = [0.62, 0.36, 0.34], BROW = [0.36, 0.42, 0.22];
    // the head, face up: forehead toward the island (x small), chin out to sea, a broad dome
    var hcx = 19, hcy = 0, hcz = 0, rx = 17, ry = 11, rz = 15, x, y, z;
    for (y = OYg; y < OYg + NY; y++) for (z = OZg; z < OZg + NZ; z++) for (x = OXg; x < OXg + NX; x++) {
      var u = (x + 0.5 - hcx) / rx, v = (y + 0.5 - hcy) / ry, w = (z + 0.5 - hcz) / rz;
      if (u * u + v * v + w * w > 1) continue;
      var h = SB.hash(x, y * 3 + z, 77), c = h < 0.25 ? SKIN2 : SKIN;
      if (u < -0.45 || Math.abs(w) > 0.8) c = h < 0.55 ? MOSSC : GRASS; // moss for hair, round the brow and the sides
      put(x, y, z, c);
    }
    // the face on top: shut eyes with long lashes, mossy brows, a nose, a sleepy mouth
    [-1, 1].forEach(function (sd) {
      for (z = 3; z <= 9; z++) { var zz = z * sd, ex = 13 + (z === 3 || z === 9 ? -1 : 0), ty = top(ex, zz); if (ty > -999) { put(ex, ty, zz, LASH); put(ex + 1, ty, zz, SHADE); if (z % 2) put(ex - 1, ty + 1, zz, LASH); } }
      for (z = 2; z <= 10; z++) { var bx = 9 + (z > 4 && z < 9 ? -1 : 0), by = top(bx, z * sd); if (by > -999) put(bx, by + 1, z * sd, BROW); }
      // an ear on each side
      for (x = 11; x <= 17; x++) for (y = -3; y <= 3; y++) if (Math.abs(x - 14) + Math.abs(y) * 0.8 < 4.2) { put(x, y, sd * rz, SKIN2); put(x, y, sd * (rz + 1), Math.abs(x - 14) < 2 && Math.abs(y) < 2 ? SHADE : SKIN2); }
    });
    for (x = 16; x <= 22; x++) for (z = -2; z <= 2; z++) { var ny = top(x, z); if (ny > -999 && Math.abs(z) < 2 + (x > 19 ? 1 : 0)) { put(x, ny + 1, z, SKIN); if (x > 18 && Math.abs(z) < 2) put(x, ny + 2, z, SKIN); } }
    for (z = -5; z <= 5; z++) { var mx = 26 + (Math.abs(z) > 3 ? -1 : 0), my = top(mx, z); if (my > -999) put(mx, my, z, LIP); }
    // a hand beside the face, palm down in the sea, four thick fingers
    var hx = 14, hz = 19;
    for (y = -3; y <= 1; y++) for (z = hz; z < hz + 10; z++) for (x = hx; x < hx + 11; x++) put(x, y, z, SB.hash(x, z, 5) < 0.3 ? SKIN2 : SKIN);
    for (var f = 0; f < 4; f++) { var fx = hx + f * 3; for (var k = 0; k < 8; k++) for (var dx = 0; dx < 2; dx++) put(fx + dx, k < 5 ? 1 : 0, hz + 10 + k, k === 7 ? [0.88, 0.76, 0.68] : SKIN); }
    for (z = hz + 2; z < hz + 8; z++) for (x = hx + 1; x < hx + 10; x++) if (SB.hash(x, z, 9) < 0.45) put(x, 2, z, MOSSC);
    return meshCells(cell, NX, NY, NZ, 2, OXg * 2, OYg * 2, OZg * 2, attrs); // two world units a cube: the giant is huge
  }
  // where the giant lies: past the coast at the far end of the spine from the nest
  var giantAt = null, giantWorld = null;
  function placeGiant(t) {
    // the first open sea past a coast (room for the head, inside the map), along the spine first, then all round the nest
    var s = spine, N = t.N, tries = [];
    if (s) { tries.push([s.cx, s.cz, s.dx, s.dz, 1]); tries.push([s.cx, s.cz, -s.dx, -s.dz, 1]); }
    var ox = t.spawn ? t.spawn.x : N / 2, oz = t.spawn ? t.spawn.z : N / 2;
    for (var k = 0; k < 16; k++) tries.push([ox, oz, Math.cos(k / 16 * 6.283), Math.sin(k / 16 * 6.283), 0]);
    var best = null;
    tries.forEach(function (tr) {
      var land = false, sea = 0, start = 0;
      for (var r = 0; r < N; r++) {
        var x = tr[0] + tr[2] * r, z = tr[1] + tr[3] * r;
        if (x < 24 || z < 24 || x > N - 24 || z > N - 24) return;
        if (WG.heightAt(t, x, z) < SB.SEA - 1.2) { if (land) { if (!sea) start = r; if (++sea >= 46) break; } }
        else { land = true; sea = 0; }
      }
      if (sea < 46) return;
      var hx = tr[0] + tr[2] * (start + 8), hz = tr[1] + tr[3] * (start + 8), score = tr[4] * 1000 - start; // the spine wins; nearer is better
      if (!best || score > best.score) best = { x: hx, z: hz, a: Math.atan2(-tr[3], tr[2]), score: score };
    });
    return best;
  }
  R.addHook(function (game) {
    if (!R.voxel || !game || !T || !R.hasMesh("v:giant")) return;
    if (giantWorld !== T) { giantWorld = T; giantAt = placeGiant(T); }
    if (!giantAt) return;
    var br = 1 + Math.sin(R.time() * 0.35) * 0.012; // it breathes, slowly
    R.instTRS("v:giant", giantAt.x, SB.SEA - 0.6 + (br - 1) * 8, giantAt.z, giantAt.a, 1, null, [0, 0, 0, 2]);
  });
  V.giant = function () { return giantAt; };

  var extra0 = ME.extraMeshes;
  ME.extraMeshes = function () {
    var o = extra0 ? extra0() : {};
    if (R.voxel) { o["v:lantern"] = lanternMesh(); o["v:giant"] = giantMesh(); var dm = debrisMeshes(); for (var k in dm) o[k] = dm[k]; }
    return o;
  };
  V.LANTERN_DX = 1.7; V.LANTERN_DZ = -1.4;
  V.lanternPos = function (game) {
    var t = game && game.world && game.world.T;
    if (!t || !t.spawn) return null;
    return { x: t.spawn.x + V.LANTERN_DX, z: t.spawn.z + V.LANTERN_DZ };
  };
  // the Lantern burns low until the embers come back: its light and glow grow a stage at a time
  R.addHook(function (game) {
    if (!R.voxel || !game || !R.hasMesh("v:lantern")) return;
    var lp = V.lanternPos(game);
    if (!lp || !SB.World.isSeen(game.world, lp.x, lp.z)) return;
    var cam = R.camera;
    if (!cam.pov && (Math.abs(lp.x - cam.x) > cam.halfW * 1.6 + 14 || Math.abs(lp.z - cam.z) > cam.halfH * 2.4 + 14)) return;
    var st = SB.Embers ? SB.Embers.stage(game) : 0, t = R.time();
    var fl = 0.88 + Math.sin(t * 7.3) * 0.06 + Math.sin(t * 13.1 + 1.3) * 0.04 + Math.sin(t * 2.1) * 0.03;
    var y = V.groundAt(lp.x, lp.z);
    R.instTRS("v:lantern", lp.x, y - 0.02, lp.z, 0.4, 0.8, null, [0, (0.5 + st * 0.25) * fl, 0]);
    R.light(lp.x, y + 1.3, lp.z, (10 + st * 3) * fl, 1.9 * fl, 1.05 * fl, 0.38 * fl);
  });
})();
