/* smol brains 2 — fx.js
   Particles and weather effects drawn by the renderer: bursts (hearts, sparkles, dust, smoke, embers,
   splashes, eureka stars), rain streaks and snow around the camera, fireflies at night and lightning bolts.
   Points are round sprites; rain and bolts are lines. All CPU-simulated into one dynamic buffer. */
(function () {
  "use strict";
  var SB = window.SB;
  var FX = (SB.FX = {});
  var GL = SB.GL;
  var MAX = 1600;
  var P = { x: new Float32Array(MAX), y: new Float32Array(MAX), z: new Float32Array(MAX), vx: new Float32Array(MAX), vy: new Float32Array(MAX), vz: new Float32Array(MAX),
    life: new Float32Array(MAX), max: new Float32Array(MAX), size: new Float32Array(MAX), r: new Float32Array(MAX), g: new Float32Array(MAX), b: new Float32Array(MAX), grav: new Float32Array(MAX), drag: new Float32Array(MAX), glow: new Uint8Array(MAX) };
  var n = 0;
  var ptBuf = new Float32Array(MAX * 8), ptHold = {}, lineBuf = new Float32Array(4000 * 7), lineHold = {};
  var fireflies = [], rainSeed = 1;

  var KINDS = {
    hearts: { col: [1, 0.45, 0.7], size: 0.16, life: 1.4, vy: 1.2, spread: 0.3, grav: -0.3, drag: 1.5 },
    sparkle: { col: [0.77, 1, 0.29], size: 0.1, life: 1.0, vy: 1.5, spread: 1.2, grav: 1, drag: 2, glow: 1 },
    stars: { col: [1, 0.92, 0.5], size: 0.14, life: 1.6, vy: 2.5, spread: 2.2, grav: 2, drag: 1.5, glow: 1 },
    dust: { col: [0.72, 0.62, 0.48], size: 0.12, life: 0.8, vy: 0.6, spread: 0.6, grav: 0.4, drag: 2.5 },
    smoke: { col: [0.55, 0.55, 0.58], size: 0.35, life: 3.0, vy: 0.9, spread: 0.2, grav: -0.15, drag: 0.6 },
    embers: { col: [1, 0.55, 0.15], size: 0.07, life: 1.2, vy: 1.6, spread: 0.5, grav: -0.2, drag: 1, glow: 1 },
    splash: { col: [0.6, 0.85, 1], size: 0.09, life: 0.7, vy: 2.5, spread: 1.4, grav: 9, drag: 0.5 },
    leaves: { col: [0.45, 0.75, 0.3], size: 0.1, life: 2.0, vy: 0.3, spread: 1.0, grav: 0.6, drag: 2 },
    crumbs: { col: [0.9, 0.5, 0.3], size: 0.06, life: 0.6, vy: 1.4, spread: 0.8, grav: 6, drag: 0.5 },
    magic: { col: [0.71, 0.6, 1], size: 0.13, life: 1.4, vy: 1.8, spread: 1.6, grav: -0.2, drag: 1.4, glow: 1 },
    gold: { col: [1, 0.85, 0.3], size: 0.12, life: 1.8, vy: 3.2, spread: 2.6, grav: 3, drag: 1, glow: 1 }
  };

  FX.burst = function (kind, x, y, z, count, opts) {
    var k = KINDS[kind] || KINDS.sparkle;
    count = count || 6;
    opts = opts || {};
    for (var i = 0; i < count; i++) {
      var j = n < MAX ? n++ : (Math.random() * MAX) | 0;
      var a = Math.random() * 6.283, sp = k.spread * (0.4 + Math.random() * 0.6);
      P.x[j] = x + (opts.r ? (Math.random() - 0.5) * opts.r : 0); P.y[j] = y; P.z[j] = z + (opts.r ? (Math.random() - 0.5) * opts.r : 0);
      P.vx[j] = Math.cos(a) * sp; P.vz[j] = Math.sin(a) * sp; P.vy[j] = k.vy * (0.6 + Math.random() * 0.8);
      P.life[j] = P.max[j] = k.life * (0.7 + Math.random() * 0.6);
      P.size[j] = k.size * (0.7 + Math.random() * 0.6) * (opts.scale || 1);
      var col = opts.col || k.col;
      P.r[j] = col[0]; P.g[j] = col[1]; P.b[j] = col[2];
      P.grav[j] = k.grav; P.drag[j] = k.drag; P.glow[j] = k.glow ? 1 : 0;
    }
  };

  function update(dt) {
    for (var i = 0; i < n; i++) {
      P.life[i] -= dt;
      if (P.life[i] <= 0) { swap(i, --n); i--; continue; }
      var d = Math.exp(-P.drag[i] * dt);
      P.vx[i] *= d; P.vz[i] *= d; P.vy[i] = P.vy[i] * d - P.grav[i] * dt;
      P.x[i] += P.vx[i] * dt; P.y[i] += P.vy[i] * dt; P.z[i] += P.vz[i] * dt;
    }
  }
  function swap(a, b) {
    for (var k in P) { var t = P[k][a]; P[k][a] = P[k][b]; P[k][b] = t; }
  }

  // ambient: fire smoke and embers, fireflies, shimmering crystals
  var ambT = 0;
  function ambient(game, dt, cam) {
    ambT -= dt;
    if (ambT > 0 || !game) return;
    ambT = 0.12;
    var w = game.world, R = Math.max(cam.halfW, cam.halfH) + 4;
    w.fires.forEach(function (f) {
      if (Math.abs(f.x - cam.x) > R || Math.abs(f.z - cam.z) > R * 1.5) return;
      if (Math.random() < 0.5) FX.burst("embers", f.x, f.y - (f.kind === "wild" ? 0 : 0.3), f.z, 1, { r: 0.4 });
      if (Math.random() < (f.kind === "wild" ? 0.8 : 0.3)) FX.burst("smoke", f.x, f.y + 0.3, f.z, 1, { r: 0.3, scale: f.kind === "wild" ? 1.8 : 1 });
    });
    var env = SB.Render.env;
    if (env.night > 0.5 && w.season !== 3) {
      while (fireflies.length < 24) fireflies.push({ x: cam.x + (Math.random() - 0.5) * R * 2, z: cam.z + (Math.random() - 0.5) * R * 2, ph: Math.random() * 6, y: 0 });
    } else fireflies.length = Math.max(0, fireflies.length - 1);
  }

  var lineN = 0;
  function line(x0, y0, z0, x1, y1, z1, r, g, b, a) {
    if (lineN >= 3990) return;
    var o = lineN * 7;
    lineBuf[o] = x0; lineBuf[o + 1] = y0; lineBuf[o + 2] = z0; lineBuf[o + 3] = r; lineBuf[o + 4] = g; lineBuf[o + 5] = b; lineBuf[o + 6] = a;
    lineBuf[o + 7] = x1; lineBuf[o + 8] = y1; lineBuf[o + 9] = z1; lineBuf[o + 10] = r; lineBuf[o + 11] = g; lineBuf[o + 12] = b; lineBuf[o + 13] = a;
    lineN += 2;
  }

  function weather(game, cam, t) {
    var w = game.world, env = SB.Render.env, T = w.T;
    var rain = env.rain;
    if (rain < 0.05) return;
    var temp = SB.World.tempAt(w, cam.x, cam.z);
    var snow = temp < 0.28;
    var R = Math.max(cam.halfW, cam.halfH * 1.6) + 2, count = Math.round(rain * (snow ? 260 : 420) * SB.clamp(R / 18, 0.6, 2.4));
    var wind = env.wind * 1.5;
    var r = SB.rng(rainSeed);
    for (var i = 0; i < count; i++) {
      var bx = (r() - 0.5) * 2 * R, bz = (r() - 0.5) * 2 * R, ph = r();
      var fall = snow ? 1.2 : 14, H = 9;
      var k = ((t * fall / H) + ph) % 1;
      var x = cam.x + bx + (snow ? Math.sin(t + ph * 20) * 0.6 : wind * (1 - k) * 1.2), z = cam.z + bz;
      var gy = SB.World.groundY(w, x, z);
      var y = gy + H * (1 - k);
      if (snow) { addPoint(x, y, z, 0.07, 0.95, 0.97, 1, 0.9); continue; }
      line(x, y, z, x + wind * 0.15, y - 0.6, z, 0.75, 0.85, 1, 0.5);
      if (k > 0.97 && i % 3 === 0) addPoint(x, gy + 0.05, z, 0.08, 0.8, 0.9, 1, 0.6);
    }
  }

  var ptN = 0;
  function addPoint(x, y, z, size, r, g, b, a) {
    if (ptN >= MAX) return;
    var o = ptN * 8;
    ptBuf[o] = x; ptBuf[o + 1] = y; ptBuf[o + 2] = z; ptBuf[o + 3] = r; ptBuf[o + 4] = g; ptBuf[o + 5] = b; ptBuf[o + 6] = a; ptBuf[o + 7] = size;
    ptN++;
  }

  var tAcc = 0;
  SB.Render.particles = {
    update: function (dt) { update(dt); tAcc += dt; },
    draw: function (gl, ctx, progs, VP, cam) {
      var game = SB.Game.current;
      ambient(game, 1 / 60, cam);
      ptN = 0; lineN = 0;
      var env = SB.Render.env, night = env.night;
      for (var i = 0; i < n; i++) {
        var a = Math.min(1, P.life[i] / P.max[i] * 2);
        var boost = P.glow[i] ? 1 : 1 - night * 0.6;
        addPoint(P.x[i], P.y[i], P.z[i], P.size[i], P.r[i] * boost, P.g[i] * boost, P.b[i] * boost, a);
      }
      if (game) {
        // fireflies
        for (var f = 0; f < fireflies.length; f++) {
          var ff = fireflies[f];
          ff.ph += 0.02;
          ff.x += Math.sin(ff.ph * 0.7) * 0.02; ff.z += Math.cos(ff.ph * 0.5) * 0.02;
          var gy = SB.World.groundY(game.world, ff.x, ff.z);
          var blink = 0.5 + 0.5 * Math.sin(ff.ph * 3);
          addPoint(ff.x, gy + 0.8 + Math.sin(ff.ph) * 0.3, ff.z, 0.09, 0.85, 1, 0.45, blink * night);
          if (Math.abs(ff.x - cam.x) > cam.halfW * 1.6 + 4 || Math.abs(ff.z - cam.z) > cam.halfH * 2 + 4) { fireflies.splice(f, 1); f--; }
        }
        weather(game, cam, tAcc);
        // lightning bolts: jagged lines from the sky
        game.world.bolts.forEach(function (bt) {
          var r = SB.rng((bt.x * 1000 + bt.z) | 0), x = bt.x, z = bt.z, y = bt.y + 30, segs = 12;
          for (var s = 0; s < segs; s++) {
            var ny = y - 30 / segs, nx = s === segs - 1 ? bt.x : x + (r() - 0.5) * 1.6, nz = s === segs - 1 ? bt.z : z + (r() - 0.5) * 1.6;
            line(x, y, z, nx, ny, nz, 1, 1, 0.85, Math.min(1, bt.t * 3));
            x = nx; y = ny; z = nz;
          }
        });
      }
      var gl2 = gl;
      if (ptN) {
        var p = progs.pt;
        GL.resetAttribs(ctx);
        gl2.useProgram(p.prog);
        gl2.uniformMatrix4fv(p.u.uVP, false, VP);
        gl2.uniform1f(p.u.uPx, cam.pxPerUnit * (SB.Render.canvasScale ? SB.Render.canvasScale() : 1));
        gl2.enable(gl2.BLEND); gl2.blendFunc(gl2.SRC_ALPHA, gl2.ONE_MINUS_SRC_ALPHA);
        gl2.depthMask(false);
        GL.stream(ctx, ptHold, ptBuf, ptN * 8);
        GL.attribs(ctx, ptHold.buf, [[p.a.aPos, 3], [p.a.aCol, 4], [p.a.aSize, 1]], 8, 0);
        gl2.drawArrays(gl2.POINTS, 0, ptN);
      }
      if (lineN) {
        var pl = progs.line;
        GL.resetAttribs(ctx);
        gl2.useProgram(pl.prog);
        gl2.uniformMatrix4fv(pl.u.uVP, false, VP);
        gl2.enable(gl2.BLEND); gl2.blendFunc(gl2.SRC_ALPHA, gl2.ONE_MINUS_SRC_ALPHA);
        gl2.depthMask(false);
        GL.stream(ctx, lineHold, lineBuf, lineN * 7);
        GL.attribs(ctx, lineHold.buf, [[pl.a.aPos, 3], [pl.a.aCol, 4]], 7, 0);
        gl2.drawArrays(gl2.LINES, 0, lineN);
      }
      gl2.depthMask(true);
      gl2.disable(gl2.BLEND);
    }
  };
  FX.count = function () { return n; };
})();
