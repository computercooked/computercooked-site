/* smol brains 2 — bodies.js
   Draws everything that moves: smols and grumps assembled from instanced parts (body, eyes, ears, legs,
   arms, tails, fins, horns, wings, big brains, halos — all driven by genes, so evolution is visible),
   items and critters, buildings under construction, flames and windmill blades, blob shadows, fire lights,
   and the 2D overlay (names, speech bubbles, emotes, prayers, building progress, village names). */
(function () {
  "use strict";
  var SB = window.SB;
  var R = SB.Render, K = SB.KINDS, SK = SB.STRUCTS;
  var B = (SB.Bodies = {});

  /* ---------------- tiny affine helpers ---------------- */
  var bm = new Float32Array(12), out = new Float32Array(12), rl = new Float32Array(9);
  // base = translate(x,y,z) * rotY(a) * uniform scale s
  function setBase(x, y, z, a, s) {
    var c = Math.cos(a), sn = Math.sin(a);
    bm[0] = c * s; bm[1] = 0; bm[2] = sn * s; bm[3] = x;
    bm[4] = 0; bm[5] = s; bm[6] = 0; bm[7] = y;
    bm[8] = -sn * s; bm[9] = 0; bm[10] = c * s; bm[11] = z;
  }
  // local rotation Ry(ry) * Rx(rx) * Rz(rz)
  function rot(ry, rx, rz) {
    var cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx), cz = Math.cos(rz), sz = Math.sin(rz);
    // Rx*Rz
    var a00 = cz, a01 = -sz, a02 = 0, a10 = cx * sz, a11 = cx * cz, a12 = -sx, a20 = sx * sz, a21 = sx * cz, a22 = cx;
    rl[0] = cy * a00 + sy * a20; rl[1] = cy * a01 + sy * a21; rl[2] = cy * a02 + sy * a22;
    rl[3] = a10; rl[4] = a11; rl[5] = a12;
    rl[6] = -sy * a00 + cy * a20; rl[7] = -sy * a01 + cy * a21; rl[8] = -sy * a02 + cy * a22;
  }
  // emit a part in the current base frame
  function part(key, lx, ly, lz, ry, rx, rz, sx, sy, sz, tint, ext) {
    rot(ry, rx, rz);
    for (var r = 0; r < 3; r++) {
      var b0 = bm[r * 4], b1 = bm[r * 4 + 1], b2 = bm[r * 4 + 2];
      out[r * 4] = (b0 * rl[0] + b1 * rl[3] + b2 * rl[6]) * sx;
      out[r * 4 + 1] = (b0 * rl[1] + b1 * rl[4] + b2 * rl[7]) * sy;
      out[r * 4 + 2] = (b0 * rl[2] + b1 * rl[5] + b2 * rl[8]) * sz;
      out[r * 4 + 3] = b0 * lx + b1 * ly + b2 * lz + bm[r * 4 + 3];
    }
    R.inst(key, out, tint, ext);
  }
  B.part = part; B.setBase = setBase;

  var colCache = {};
  function lookCols(c) {
    var lk = c.look, key = c.id + ":" + lk.hue + ":" + lk.hue2 + ":" + c.tier;
    if (c._cols && c._colKey === key) return c._cols;
    var body = SB.hsl(lk.hue, lk.sat / 100, lk.light / 100);
    var second = SB.hsl(lk.hue2, Math.min(1, lk.sat / 100 + 0.1), Math.min(0.85, lk.light / 100 + 0.12));
    var belly = SB.mixC(body, [1, 0.97, 0.92], 0.55);
    var dark = SB.mixC(body, [0.1, 0.08, 0.12], 0.45);
    c._colKey = key;
    c._cols = { body: body, second: second, belly: belly, dark: dark, cheek: [1, 0.55, 0.62], white: [1, 1, 1], mouth: [0.25, 0.08, 0.12], horn: SB.mixC(second, [0.95, 0.9, 0.8], 0.6), pink: [1, 0.62, 0.74] };
    return c._cols;
  }

  var EXT = [0, 0, 0], EXT_GLOW = [0, 0.7, 0];
  var SEL = [0.77, 1, 0.29];

  /* ---------------- creatures ---------------- */

  function drawCreature(c, alpha, t, game) {
    if (!c.heldBy && !SB.World.isSeen(game.world, c.x, c.z)) return; // hidden under the fog of war
    var x = c.px + (c.x - c.px) * alpha, z = c.pz + (c.z - c.pz) * alpha;
    var y = c.y;
    if (c.py && Math.abs(c.y - c.py) < 2) y = c.py + (c.y - c.py) * alpha;
    var cam = R.camera;
    if (Math.abs(x - cam.x) > cam.halfW * 1.4 + 3 || Math.abs(z - cam.z) > cam.halfH * 2.2 + 3) return;
    var lk = c.look, an = c.anim, cols = lookCols(c);
    var Rr = SB.Creature.radius(c) * (c.dying ? 1 - c.fade : 1);
    if (Rr <= 0.01) return;
    if (R.pixel && SB.Pixel) {
      // pixel mode: a sprite painted from its genes (pixel.js), plus the 3D shadow, glow and selection ring
      R.shadow(x, z, Rr * 1.05, 0.3);
      SB.Pixel.creature(c, x, y, z, t, alpha);
      if (lk.glow > 0.5 && !c.far) R.light(x, y + Rr * 2, z, 3 + Rr * 4, 0.6, 0.55, 1);
      if (game.selectedId === c.id) { setBase(x, SB.World.groundY(game.world, x, z) + 0.03, z, t * 0.6, 1); part("p:ring", 0, 0, 0, 0, 0, 0, Rr * 1.6, Rr * 0.6, Rr * 1.6, SEL, [0, 0.9, 0]); }
      return;
    }
    var grump = c.species === "grump";
    var legs = lk.legs, legH = legs ? 0.35 + lk.legLen * 0.9 : 0;
    var moving = c.moving || (c.action && c.action.phase === "go") || !!c.plan;
    var hop = 0, sq = an.squash;
    if (!legs && moving && !c.asleep && c.onGround) {
      var hp = Math.abs(Math.sin(an.walk * 1.1));
      hop = hp * 0.45; sq += (1 - hp) * 0.12 - 0.06;
    }
    var breath = Math.sin(an.bob) * 0.03;
    if (c.asleep) sq = 0.25;
    var ext = an.flash > 0 ? [0, lk.glow * 0.6, an.flash] : lk.glow ? [0, lk.glow * 0.6, 0] : EXT;
    var tierGlow = lk.glow;
    setBase(x, y + hop * Rr, z, c.facing, Rr);
    var cy = 1 + legH;
    var bw = 0.85 + (lk.body - 0.8) * 0.55;
    var upright = grump ? 1.05 : 1 + Math.min(4, c.tier) * 0.06;
    var sy = (1 + breath) * (1 - sq) * upright, sxz = bw * (1 + sq * 0.45) / Math.sqrt(upright);
    // shadow
    R.shadow(x, z, Rr * 1.1 * bw, 0.3 * (1 - hop * 0.5));

    // legs
    if (legs) {
      var sw = moving ? Math.sin(an.walk * 1.6) * 0.65 : 0, lr = 0.13 + lk.legLen * 0.05, ll = legH * 1.05;
      if (legs === 2) {
        part("p:limb", 0.36 * bw, cy - 0.35, 0, 0, Math.PI + sw, 0.06, lr, ll, lr, cols.dark, ext);
        part("p:limb", -0.36 * bw, cy - 0.35, 0, 0, Math.PI - sw, -0.06, lr, ll, lr, cols.dark, ext);
      } else {
        for (var li = 0; li < 4; li++) {
          var lx = (li & 1 ? -0.42 : 0.42) * bw, lz = li < 2 ? 0.35 : -0.35, ph = (li === 0 || li === 3) ? sw : -sw;
          part("p:limb", lx, cy - 0.3, lz, 0, Math.PI + ph, (li & 1 ? -0.1 : 0.1), lr, ll, lr, cols.dark, ext);
        }
      }
    }
    // body
    part("p:body", 0, cy, 0, 0, 0, 0, sxz, sy, sxz * 0.96, cols.body, ext);
    // belly / spots / stripes
    if (lk.pattern === 1) part("p:ball", 0, cy - 0.12 * sy, 0.32, 0, 0, 0, 0.72 * sxz, 0.72 * sy, 0.66, cols.belly, ext);
    else if (lk.pattern === 2) {
      var sr = SB.rng(lk.spotsSeed);
      for (var si = 0; si < 5; si++) {
        var sa = sr() * 6.283, se = (sr() - 0.3) * 1.2;
        var px = Math.sin(sa) * Math.cos(se) * sxz, pz = Math.cos(sa) * Math.cos(se) * sxz * 0.96, py = Math.sin(se) * sy;
        if (pz > 0.55 && py > 0) continue; // keep the face clear
        part("p:ball", px * 0.97, cy + py * 0.97, pz * 0.97, 0, 0, 0, 0.17, 0.17, 0.17, cols.second, ext);
      }
    } else if (lk.pattern === 3) {
      for (var st = 0; st < 2; st++) part("p:ball", 0, cy + (st ? 0.3 : -0.05) * sy, -0.05, 0, 0, 0, sxz * 1.012, 0.09, sxz * 0.97, cols.second, ext);
    }
    // fluff
    if (lk.fluff) for (var fi = 0; fi < 7; fi++) { var fa = fi / 7 * 6.283 + 0.3; part("p:ball", Math.sin(fa) * 0.8 * sxz, cy - 0.45 * sy, Math.cos(fa) * 0.78 * sxz, 0, 0, 0, 0.3, 0.24, 0.3, cols.belly, ext); }
    // big head for thinkers
    var top = cy + 0.92 * sy, headY = cy;
    if (lk.head > 0.4 || c.tier >= 5) {
      var hs = 0.55 + Math.min(1, lk.head) * 0.45;
      part("p:body", 0, cy + 0.62 * sy, -0.05, 0, 0, 0, hs * bw, hs * 0.9, hs * bw, cols.body, ext);
      top = cy + 0.62 * sy + hs * 0.88; headY = cy + 0.35;
      if (lk.brainy) part("p:brain", 0, top - 0.12, -0.08, 0, 0, 0, hs * 0.62, hs * 0.5, hs * 0.66, cols.pink, [0, 0.25 + tierGlow * 0.5, ext[2]]);
    }
    // face: eyes look toward the attended thing
    var look = 0, tilt = 0;
    if (c.attn && c.attn.x != null) { look = SB.clamp(SB.angDiff(c.facing, Math.atan2(c.attn.x - x, c.attn.z - z)), -0.6, 0.6); }
    var es = 0.21 * lk.eyes * (c.stage === 0 ? 1.15 : 1), blink = c.asleep ? 0.12 : 1 - an.blink * 0.9;
    var eyY = headY + 0.25 * sy, eyZ = 0.8 * sxz;
    var eyeTint = grump ? [1, 0.35, 0.3] : null, eyeExt = grump ? [0, 0.4 + SB.Render.env.night * 0.8, 0] : ext;
    part("p:eye", 0.34 * bw, eyY, eyZ - 0.06, look + 0.25, -0.1, 0, es, es * blink, es, eyeTint, eyeExt);
    part("p:eye", -0.34 * bw, eyY, eyZ - 0.06, look - 0.25, -0.1, 0, es, es * blink, es, eyeTint, eyeExt);
    var mo = an.mouth, mh = mo === "open" || mo === "o" ? 0.1 : mo === "chew" ? 0.04 + Math.abs(Math.sin(t * 14)) * 0.07 : 0.045;
    part("p:mouth", 0, headY - 0.02 * sy, 0.9 * sxz, 0, 0, 0, mo === "frown" ? 0.1 : 0.13, mh, 0.08, null, EXT);
    if (grump) { part("p:cone", 0.07, headY - 0.07, 0.86 * sxz, 0, Math.PI, 0, 0.04, 0.09, 0.04, cols.white, EXT); part("p:cone", -0.07, headY - 0.07, 0.86 * sxz, 0, Math.PI, 0, 0.04, 0.09, 0.04, cols.white, EXT); }
    if (lk.cheeks && !grump) { part("p:ball", 0.5 * bw, headY + 0.03, 0.66 * sxz, 0, 0, 0, 0.11, 0.07, 0.06, cols.cheek, EXT); part("p:ball", -0.5 * bw, headY + 0.03, 0.66 * sxz, 0, 0, 0, 0.11, 0.07, 0.06, cols.cheek, EXT); }
    // ears
    var ear = lk.ears, wig = Math.sin(t * 3 + c.id) * 0.08;
    if (ear === 1) { part("p:cone", 0.42 * bw, top - 0.2, 0, 0, 0, -0.45 + wig, 0.2, 0.42, 0.14, cols.body, ext); part("p:cone", -0.42 * bw, top - 0.2, 0, 0, 0, 0.45 - wig, 0.2, 0.42, 0.14, cols.body, ext); }
    else if (ear === 2) { part("p:leaf", 0.25 * bw, top - 0.15, 0, 0, -0.2, -0.25 + wig, 0.28, 0.85, 0.3, cols.second, ext); part("p:leaf", -0.25 * bw, top - 0.15, 0, 0, -0.2, 0.25 - wig, 0.28, 0.85, 0.3, cols.second, ext); }
    else if (ear === 3) { part("p:ball", 0.5 * bw, top - 0.2, -0.05, 0, 0, 0, 0.22, 0.22, 0.12, cols.second, ext); part("p:ball", -0.5 * bw, top - 0.2, -0.05, 0, 0, 0, 0.22, 0.22, 0.12, cols.second, ext); }
    else if (ear === 4) { part("p:leaf", 0.55 * bw, headY + 0.25, -0.1, 1.2, 0, -1.1 + wig, 0.35, 0.55, 0.3, cols.body, ext); part("p:leaf", -0.55 * bw, headY + 0.25, -0.1, -1.2, 0, 1.1 - wig, 0.35, 0.55, 0.3, cols.body, ext); }
    if (lk.antenna || grump) {
      part("p:limb", 0.12, top - 0.08, 0.05, 0, -0.3, -0.25, 0.025, 0.45, 0.025, cols.dark, ext);
      part("p:ball", 0.12 + Math.sin(0.25) * 0.45, top + 0.33, 0.05 - Math.sin(0.3) * 0.45, 0, 0, 0, 0.09, 0.09, 0.09, grump ? [0.9, 0.3, 1] : SEL, [0, 0.6, 0]);
    }
    if (lk.horns) { part("p:cone", 0.25, top - 0.15, 0.15, 0, 0.35, -0.3, 0.09, 0.32, 0.09, cols.horn, ext); part("p:cone", -0.25, top - 0.15, 0.15, 0, 0.35, 0.3, 0.09, 0.32, 0.09, cols.horn, ext); }
    if (grump) for (var gs = 0; gs < 4; gs++) part("p:cone", 0, cy + 0.6 - gs * 0.28, -0.55 - gs * 0.12 + gs * 0.05, 0, -0.5 - gs * 0.35, 0, 0.12, 0.3, 0.12, cols.dark, ext);
    // fins and wings
    if (lk.fins) {
      part("p:leaf", 0, cy + 0.65 * sy, -0.35, 0, -0.5, 0, 0.35, 0.5, 0.3, cols.second, ext);
      part("p:leaf", 0.8 * sxz, cy - 0.1, -0.1, 1.57, 0, -1.2 - Math.sin(t * 4 + c.id) * 0.2, 0.3, 0.45, 0.3, cols.second, ext);
      part("p:leaf", -0.8 * sxz, cy - 0.1, -0.1, -1.57, 0, 1.2 + Math.sin(t * 4 + c.id) * 0.2, 0.3, 0.45, 0.3, cols.second, ext);
    }
    if (lk.wings) {
      var flap = Math.sin(t * (c.tier >= 6 ? 3 : 1.5) + c.id) * 0.35;
      part("p:leaf", 0.3, cy + 0.2, -0.6, 0.6, -0.4, -0.9 - flap, 0.7, 1.2, 0.3, SB.mixC(cols.second, [1, 1, 1], 0.4), [0, tierGlow * 0.4, ext[2]]);
      part("p:leaf", -0.3, cy + 0.2, -0.6, -0.6, -0.4, 0.9 + flap, 0.7, 1.2, 0.3, SB.mixC(cols.second, [1, 1, 1], 0.4), [0, tierGlow * 0.4, ext[2]]);
    }
    // tail
    var tl = lk.tail, wag = Math.sin(t * (moving ? 9 : 3) + c.id) * 0.35;
    if (tl === 1) part("p:ball", 0, cy - 0.35, -0.92 * sxz, 0, 0, 0, 0.18, 0.18, 0.18, cols.second, ext);
    else if (tl === 2) { part("p:limb", 0, cy - 0.3, -0.85 * sxz, wag, -2.2, 0, 0.07, 0.65, 0.07, cols.body, ext); }
    else if (tl === 3) part("p:ball", Math.sin(wag) * 0.1, cy - 0.15, -1.0 * sxz, 0, 0, 0, 0.3, 0.3, 0.3, cols.belly, ext);
    // arms
    // culture shows on the body: tribe headbands with a feather, builder tool belts
    if (!grump && c.tier >= 3 && c.tier < 6) {
      var hbY = lk.head > 0.4 || c.tier >= 5 ? top - 0.35 : cy + 0.62 * sy;
      var hbR = (lk.head > 0.4 || c.tier >= 5 ? (0.55 + Math.min(1, lk.head) * 0.45) * 0.86 : 0.8 * sxz);
      part("p:ring", 0, hbY, 0, 0, -0.12, 0, hbR, 0.6, hbR, c.tier >= 4 ? [0.85, 0.35, 0.3] : [0.95, 0.75, 0.25], ext);
      part("p:leaf", -hbR * 0.7, hbY + 0.05, -hbR * 0.55, -0.6, -0.5, 0.35, 0.22, 0.6, 0.3, c.tier >= 4 ? [0.3, 0.75, 0.95] : [1, 0.45, 0.35], ext);
    }
    if (!grump && c.tier >= 4) {
      part("p:ring", 0, cy - 0.32 * sy, 0, 0, 0, 0, 0.93 * sxz, 0.8, 0.93 * sxz, [0.5, 0.33, 0.2], ext);
      part("p:ball", -0.45 * sxz, cy - 0.38 * sy, -0.65 * sxz, 0, 0, 0, 0.22, 0.2, 0.16, [0.62, 0.42, 0.25], ext);
    }
    if (lk.arms) {
      var holding = c.holding != null, armL = 0.42 + lk.armLen * 0.55, ar = 0.12;
      var swing = moving ? Math.sin(an.walk * 1.6) * 0.5 : 0, work = c.plan || (c.action && c.action.phase === "do" && (c.action.verb === SB.V.use || c.action.verb === SB.V.pickup));
      var wave = an.wave > 0 ? Math.sin(t * 9) * 0.4 : 0;
      var rA = holding ? -1.25 + (work ? Math.sin(t * 10) * 0.3 : 0) : Math.PI + swing, lA = holding ? -1.1 : Math.PI - swing;
      if (an.wave > 0) { rA = -2.6 + wave; lA = -2.6 - wave; }
      part("p:limb", 0.8 * sxz, cy + 0.05, 0.05, 0, rA, 0.25, ar, armL, ar, cols.body, ext);
      part("p:limb", -0.8 * sxz, cy + 0.05, 0.05, 0, lA, -0.25, ar, armL, ar, cols.body, ext);
    }
    // halo
    if (lk.halo) part("p:halo", 0, top + 0.35 + Math.sin(t * 2 + c.id) * 0.05, 0, t * 0.5, 0.15, 0, 0.42, 0.42, 0.42, [1, 0.92, 0.55], [0, 1, 0]);
    if (tierGlow > 0.5 && !c.far) R.light(x, y + Rr * 2, z, 3 + Rr * 4, 0.6, 0.55, 1);
    // selection ring
    if (game.selectedId === c.id) {
      setBase(x, SB.World.groundY(game.world, x, z) + 0.03, z, t * 0.6, 1);
      part("p:ring", 0, 0, 0, 0, 0, 0, Rr * 1.6, Rr * 0.6, Rr * 1.6, SEL, [0, 0.9, 0]);
    }
  }

  /* ---------------- items ---------------- */

  function drawItems(game, t) {
    var its = game.world.items, cam = R.camera, zoomFar = cam.zoom > 30;
    for (var i = 0; i < its.length; i++) {
      var o = its[i];
      if (o.inBag && o.heldBy != null) continue;
      if (o.heldBy == null && !SB.World.isSeen(game.world, o.x, o.z)) continue;
      if (Math.abs(o.x - cam.x) > cam.halfW * 1.4 + 2 || Math.abs(o.z - cam.z) > cam.halfH * 2.2 + 2) continue;
      if (zoomFar && !o.heldBy && o.kind !== "egg" && !K[o.kind].glow) continue;
      var def = K[o.kind], s = 1, rx = 0, rz = 0, ry = o.rot || 0, y = o.y;
      var ext = def.glow ? EXT_GLOW : EXT;
      if (o.kind === "egg") {
        var wob = (o.data.wobble || 0) * Math.sin(t * 22) * 0.25;
        rz = wob; s = 1 + (o.data.progress || 0) * 0.15;
        var eg = o.data.genome, tint = eg && eg.genes ? SB.mixC([1, 1, 1], SB.hsl(eg.genes.hue * 360, 0.6, 0.7), 0.35) : null;
        if (o.data.starter && !o.data.progress) ext = [0, 0.25 + Math.sin(t * 3) * 0.15, 0];
        setBase(o.x, y, o.z, ry, 1);
        if (o.data.pod) { // the escape pod: rattles when you tap it, smokes until it opens
          part("i:pod", 0, 0, 0, 0.6, 0, rz * 0.4, 1.1, 1.1, 1.1, null, o.data.progress ? [0, 0.2 + o.data.progress * 0.5, 0] : ext);
          if (SB.FX && Math.random() < 0.06) SB.FX.burst("smoke", o.x + 0.2, y + 0.8, o.z, 1, { r: 0.2 });
        } else part("i:egg", 0, 0, 0, 0, 0, rz, s, s, s, tint, ext);
        if (o.data.starter || o.data.wild) R.light(o.x, y + 0.6, o.z, 2.5, 1, 0.9, 0.6);
      } else {
        if (def.critter === "fly") rx = Math.sin(t * 18 + o.id) * 0.4;
        if (o.onBelt) { ry = o.rot; rz = 1.2; }
        setBase(o.x, y, o.z, ry, 1);
        part("i:" + o.kind, 0, 0, 0, 0, rx, rz, s, s, s, o.data.rotten ? [0.55, 0.6, 0.4] : null, ext);
      }
      if (!o.heldBy && cam.zoom < 18) R.shadow(o.x, o.z, (o.r || 0.15) * 1.2, 0.22);
      if (o.kind === "torch") R.light(o.x, y + 0.5, o.z, 4.5, 1, 0.6, 0.25);
      else if (def.glow && SB.Render.env.night > 0.3) R.light(o.x, y + 0.3, o.z, 1.6, 0.4, 0.8, 1);
    }
  }

  /* ---------------- structures (moving / unfinished parts) ---------------- */

  // a hut with someone home: smoke curls from the chimney (on cold days and at night) and the window throws
  // a warm glow on the ground after dark
  function hutLife(game, s, gy) {
    var cs = game.creatures, home = false, env = SB.Render.env;
    for (var i = 0; i < cs.length && !home; i++) { var c = cs[i]; if (c.alive && c.species === "smol" && Math.abs(c.x - s.x) < 2.2 && Math.abs(c.z - s.z) < 2.2) home = true; }
    if (!home) return;
    var ca = Math.cos(s.rot || 0), sa = Math.sin(s.rot || 0), sc = s.s || 1;
    if ((env.night > 0.3 || game.world.season === 3 || game.world.season === 2) && SB.FX && Math.random() < 0.035) SB.FX.burst("smoke", s.x + (-0.4 * ca - 0.34 * sa) * sc, gy + 1.9 * sc, s.z + (0.4 * sa - 0.34 * ca) * sc, 1, { scale: 0.7 });
    if (env.night > 0.5) R.light(s.x + 0.6 * sa, gy + 0.5, s.z + 0.6 * ca, 2.8, 1, 0.68, 0.32);
  }
  function drawStructures(game, t) {
    var sts = game.world.structures, cam = R.camera, w = game.world;
    for (var i = 0; i < sts.length; i++) {
      var s = sts[i];
      if (Math.abs(s.x - cam.x) > cam.halfW * 1.4 + 6 || Math.abs(s.z - cam.z) > cam.halfH * 2.2 + 6) continue;
      var gy = SB.World.heightAt(w, s.x, s.z);
      if (!s.done) {
        var tot = 0, left = 0;
        for (var k in SK[s.kind].cost) { tot += SK[s.kind].cost[k]; left += s.need[k] || 0; }
        var prog = (tot ? (1 - left / tot) * 0.6 : 0.6) + Math.min(1, s.work / SK[s.kind].work) * 0.4;
        if (prog > 0.02) { setBase(s.x, gy, s.z, s.rot || 0, 1); part("s:" + s.kind, 0, 0, 0, 0, 0, 0, 1, 0.1 + prog * 0.9, 1, [0.85, 0.8, 0.7], EXT); }
        continue;
      }
      if ((s.kind === "campfire" || s.kind === "kiln") && s.data.lit) {
        var f = 0.55 + s.data.fuel * 0.6, fl = 1 + Math.sin(t * 13 + s.id) * 0.12 + Math.sin(t * 7.3) * 0.08;
        setBase(s.x, gy + (s.kind === "kiln" ? 0.15 : 0.05), s.z, t * 2, 1);
        if (s.kind === "campfire") { part("s:flame", 0, 0, 0, 0, 0, 0, f, f * fl, f, null, [0, 0.15, 0]); part("s:flame", 0.12, 0, -0.08, 1.3, 0, 0.15, f * 0.6, f * 0.8 * (2 - fl), f * 0.6, null, [0, 0.15, 0]); }
        else part("s:flame", 0, 0.05, 0.72, 0, 0, 0, 0.5, 0.45 * fl, 0.4, null, [0, 0.15, 0]);
        R.light(s.x, gy + 0.9, s.z, s.kind === "kiln" ? 4 : 5.5 + s.data.fuel * 3, 1, 0.58, 0.25);
      }
      if (s.kind === "hut") hutLife(game, s, gy);
      if (s.kind === "windmill") { setBase(s.x, gy, s.z, s.rot || 0, 1); part("s:blades", 0, 2.6, 0.75, 0, 0, t * (0.8 + w.weather.wind * 2), 1, 1, 1, null, EXT); }
      if (s.kind === "spire") { R.light(s.x, gy + 7, s.z, 14, 0.7, 0.9, 1); }
      if (s.kind === "totem" && SB.Render.env.night > 0.5) R.light(s.x, gy + 1.5, s.z, 2, 0.8, 0.7, 1);
    }
    // burning trees
    (w.burning || []).forEach(function (n) {
      if (Math.abs(n.x - cam.x) > cam.halfW * 1.4 + 6 || Math.abs(n.z - cam.z) > cam.halfH * 2.2 + 6) return;
      var gy2 = SB.World.heightAt(w, n.x, n.z), fl2 = 1 + Math.sin(t * 11 + n.id) * 0.15;
      setBase(n.x, gy2 + 1.2 * n.s, n.z, t * 1.5 + n.id, 1);
      part("s:flame", 0, 0, 0, 0, 0, 0, 1.6 * n.s, 2.2 * n.s * fl2, 1.6 * n.s, null, [0, 0.2, 0]);
      R.light(n.x, gy2 + 2, n.z, 9, 1, 0.5, 0.2);
    });
    // glowing plants light up the night
    if (SB.Render.env.night > 0.4) {
      SB.World.eachNodeNear(w, cam.x, cam.z, Math.max(cam.halfW, cam.halfH) + 4, function (n) {
        if (n.kind === "shroomtree" || n.kind === "crystals") R.light(n.x, SB.World.heightAt(w, n.x, n.z) + 1.5, n.z, 3.5, n.kind === "crystals" ? 0.5 : 0.7, 0.55, 1);
      });
    }
  }

  /* ---------------- per-frame hook ---------------- */

  R.addHook(function (game, alpha) {
    if (!game) return;
    var t = R.time();
    drawStructures(game, t);
    drawItems(game, t);
    var cs = game.creatures;
    for (var i = 0; i < cs.length; i++) if (cs[i].alive || cs[i].dying) drawCreature(cs[i], alpha, t, game);
    var bd = game.bodies; if (bd) for (var bi = 0; bi < bd.length; bi++) if (!bd[bi].gone2 && !bd[bi].away) drawCreature(bd[bi], alpha, t, game); // the dead, waiting for their funeral
    // the god hand's ground marker
    var h = game.hand;
    if (h.visible && h.marker) {
      setBase(h.x, SB.World.groundY(game.world, h.x, h.z) + 0.03, h.z, t, 1);
      part("p:ring", 0, 0, 0, 0, 0, 0, 0.35, 0.2, 0.35, h.tool === "tap" ? [1, 0.4, 0.4] : h.tool === "tickle" ? [1, 0.6, 0.8] : SEL, [0, 0.9, 0]);
    }
  });

  /* ---------------- overlay ---------------- */

  var EMOTE = { happy: "✨", love: "💕", ouch: "💢", sad: "💧", huh: "❓", idea: "💡", zzz: "💤", yum: "😋", sick: "🤢", angry: "😠", proud: "⭐", pray: "🙏" };
  var NEED_EMOJI = {};
  SB.DRIVES.forEach(function (d, i) { NEED_EMOJI[d] = SB.DRIVE_EMOJI[i]; });
  var pp = {};
  B.labels = true;

  // a chunky pixel box: 2px dark border with notched corners, like the sprites' outlines
  function pxBox(ctx, x, y, w, h, fill, line) {
    ctx.fillStyle = line;
    ctx.fillRect(x + 2, y, w - 4, h); ctx.fillRect(x, y + 2, w, h - 4); ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = fill;
    ctx.fillRect(x + 3, y + 2, w - 6, h - 4); ctx.fillRect(x + 2, y + 3, w - 4, h - 6);
  }
  B.pxBox = pxBox;
  var FONT = "Pixelify, ui-rounded, system-ui, sans-serif";
  B.FONT = FONT;
  // wrap a line of speech into at most 3 lines of ~200px
  function wrap(ctx, text, maxW) {
    var words = String(text).split(" "), lines = [], cur = "";
    for (var i = 0; i < words.length; i++) {
      var t = cur ? cur + " " + words[i] : words[i];
      if (cur && ctx.measureText(t).width > maxW) { lines.push(cur); cur = words[i]; } else cur = t;
    }
    if (cur) lines.push(cur);
    if (lines.length > 3) { lines.length = 3; lines[2] += "…"; }
    return lines;
  }
  function bubble(ctx, x, y, text, kind) {
    ctx.font = "700 14px " + FONT;
    var lines = wrap(ctx, text, 210), lw = 0;
    for (var li = 0; li < lines.length; li++) lw = Math.max(lw, ctx.measureText(lines[li]).width);
    var w = Math.round(lw + 18), h = 8 + lines.length * 16;
    var bx = Math.round(x - w / 2), by = Math.round(y - h - 8);
    var fill = kind === "babble" ? "#e9e4f2" : kind === "think" ? "#d8d2ea" : "#fbf8f0", line = "#1a1222";
    pxBox(ctx, bx, by, w, h, fill, line);
    // the little tail, in steps
    x = Math.round(x);
    ctx.fillStyle = line; ctx.fillRect(x - 5, by + h - 2, 10, 4); ctx.fillRect(x - 3, by + h + 2, 6, 2); ctx.fillRect(x - 1, by + h + 4, 2, 2);
    ctx.fillStyle = fill; ctx.fillRect(x - 3, by + h - 3, 6, 4); ctx.fillRect(x - 1, by + h + 1, 2, 2);
    if (kind === "think") { ctx.fillStyle = line; ctx.fillRect(x - 3, by + h - 2, 2, 2); ctx.fillRect(x + 1, by + h - 2, 2, 2); }
    ctx.fillStyle = "#1a1222"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (var lj = 0; lj < lines.length; lj++) SB.Icons.fillText(ctx, lines[lj], x, by + 4 + 8 + lj * 16 + 1, 14);
    return h;
  }

  R.addOverlay(function (ctx, W, H, game) {
    if (!game) return;
    var cam = R.camera, t = R.time(), cs = game.creatures, zoom = cam.zoom;
    var showNames = zoom < 16;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    // villages and tribe names when zoomed out
    if (zoom > 18 && game.villages) {
      ctx.font = "800 14px ui-rounded, system-ui, sans-serif";
      game.villages.forEach(function (v) {
        R.project(v.x, SB.World.heightAt(game.world, v.x, v.z) + 3, v.z, pp);
        if (!pp.on) return;
        ctx.fillStyle = "rgba(16,17,20,0.65)"; var tw = ctx.measureText(v.name).width + 16;
        ctx.fillRect(pp.x - tw / 2, pp.y - 11, tw, 22);
        ctx.fillStyle = "#c5ff49"; SB.Icons.fillText(ctx, "🏘 " + v.name, pp.x, pp.y + 1, 14);
      });
    }
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i];
      if (!c.alive || c.far || !SB.World.isSeen(game.world, c.x, c.z)) continue;
      var Rr = SB.Creature.radius(c), lk = c.look;
      var headH = Rr * (2.3 + (lk.legs ? 0.35 + lk.legLen * 0.9 : 0) + (lk.head > 0.4 ? 1 : 0) + (lk.halo ? 0.6 : 0));
      if (R.pixel && c._pxH) { R.project(c.x, c.y, c.z, pp); pp.y -= c._pxH; } // sprites: above the painted head
      else R.project(c.x, c.y + headH, c.z, pp);
      if (!pp.on) continue;
      var x = pp.x, y = pp.y;
      if (c.speech && (zoom < 26 || game.selectedId === c.id)) { y -= bubble(ctx, x, y - 4, c.speech.text, c.speech.kind) + 10; }
      else if (c.anim.emote && zoom < 22) {
        SB.Icons.fillText(ctx, EMOTE[c.anim.emote] || "", x, Math.round(y - 10 - Math.abs(Math.sin(t * 4)) * 4), 28);
        y -= 26;
      }
      if (c.species === "smol" && (showNames || game.selectedId === c.id) && B.labels) {
        ctx.font = "700 12px " + FONT;
        var label = c.name + (c.tier ? " " + SB.TIERS[c.tier].icon : "");
        ctx.fillStyle = game.selectedId === c.id ? "#c5ff49" : "rgba(245,243,237,0.92)";
        ctx.strokeStyle = "rgba(16,17,20,0.75)"; ctx.lineWidth = 3;
        R.project(c.x, c.y - 0.05, c.z, pp);
        SB.Icons.fillText(ctx, label, pp.x, pp.y + 12, 14, true);
      }
      // starving / sick warnings so the player can help
      if (c.species === "smol" && (c.chem.hunger > 0.85 || c.chem.sick > 0.5 || c.chem.cold > 0.75) && !c.speech) {
        SB.Icons.fillText(ctx, c.chem.hunger > 0.85 ? "🍎❗" : c.chem.sick > 0.5 ? "🤢" : "🥶", x, Math.round(y - 8 + Math.sin(t * 5) * 2), 14);
      }
    }
    // the dead: a little candle and their name, until the tribe has said goodbye
    (game.bodies || []).forEach(function (b) {
      if (b.gone2 || b.away || b.drift || !SB.World.isSeen(game.world, b.x, b.z)) return;
      R.project(b.x, b.y + 1.3, b.z, pp);
      if (!pp.on) return;
      SB.Icons.fillText(ctx, "🕯", pp.x, Math.round(pp.y + Math.sin(t * 2 + b.id) * 2), 14);
      if (B.labels) { ctx.font = "700 11px " + FONT; ctx.fillStyle = "rgba(245,243,237,0.7)"; ctx.strokeStyle = "rgba(16,17,20,0.75)"; ctx.lineWidth = 3; SB.Icons.fillText(ctx, b.name, pp.x, pp.y + 16, 12, true); }
    });
    // places nobody has explored yet: a bobbing marker, so you know where to send them
    (game.sites || []).forEach(function (st) {
      if (st.kind === "pod" && !st.done && !st.gone) { // a downed pod: someone's inside, waiting
        R.project(st.x, SB.World.groundY(game.world, st.x, st.z) + 2.6, st.z, pp);
        if (!pp.on) return;
        var py = Math.round(pp.y + Math.sin(t * 3 + st.id) * 4);
        ctx.fillStyle = "rgba(16,17,20,0.75)"; ctx.fillRect(pp.x - 13, py - 13, 26, 26);
        ctx.fillStyle = Math.sin(t * 6) > 0 ? "#8fe6dc" : "#c5ff49"; ctx.fillRect(pp.x - 11, py - 11, 22, 22);
        SB.Icons.fillText(ctx, "🛸", pp.x, py, 16);
        return;
      }
      if (st.gone || st.found || !SB.World.isSeen(game.world, st.x, st.z)) return;
      R.project(st.x, SB.World.groundY(game.world, st.x, st.z) + 2.4, st.z, pp);
      if (!pp.on) return;
      var by = Math.round(pp.y + Math.sin(t * 2.5 + st.id) * 4);
      ctx.fillStyle = "rgba(16,17,20,0.75)"; ctx.fillRect(pp.x - 12, by - 12, 24, 24);
      ctx.fillStyle = st.kind === "camp" ? "#ff5f5f" : "#ffd84a"; ctx.fillRect(pp.x - 10, by - 10, 20, 20);
      ctx.fillStyle = "#101114"; ctx.font = "700 16px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(st.kind === "camp" ? "!" : "?", pp.x, by + 1);
    });
    // prayers
    (game.prayers || []).forEach(function (p) {
      var c = SB.Game.byId(game, p.id);
      if (!c || !c.alive || p.answered) return;
      R.project(c.x, c.y + SB.Creature.radius(c) * 4.4, c.z, pp);
      if (!pp.on) return;
      var a = 0.6 + Math.sin(t * 4) * 0.4;
      ctx.globalAlpha = a;
      SB.Icons.fillText(ctx, "🙏" + (NEED_EMOJI[p.need] || "✨"), pp.x, pp.y - 30, 28);
      ctx.globalAlpha = 1;
    });
    // building sites: what they still need
    if (zoom < 24) game.world.structures.forEach(function (s) {
      if (s.done) return;
      R.project(s.x, SB.World.heightAt(game.world, s.x, s.z) + 1.4, s.z, pp);
      if (!pp.on) return;
      var parts = [];
      for (var k in s.need) if (s.need[k] > 0) parts.push(K[k] ? K[k].emoji + s.need[k] : k);
      var txt = SK[s.kind].emoji + " " + (parts.length ? parts.join(" ") : Math.round(s.work / SK[s.kind].work * 100) + "%");
      ctx.font = "700 12px ui-rounded, system-ui, sans-serif";
      var tw = ctx.measureText(txt).width + 14;
      ctx.fillStyle = "rgba(16,17,20,0.7)"; ctx.fillRect(pp.x - tw / 2, pp.y - 10, tw, 20);
      ctx.fillStyle = "#f5f3ed"; ctx.fillText(txt, pp.x, pp.y + 1);
    });
    // eggs: progress rings
    game.world.items.forEach(function (o) {
      if (o.kind !== "egg" || zoom > 24) return;
      R.project(o.x, o.y + 0.65, o.z, pp);
      if (!pp.on) return;
      var pr = o.data.progress || 0;
      ctx.strokeStyle = "rgba(16,17,20,0.6)"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(pp.x, pp.y, 9, 0, 6.283); ctx.stroke();
      ctx.strokeStyle = "#c5ff49"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(pp.x, pp.y, 9, -1.57, -1.57 + pr * 6.283); ctx.stroke();
    });
    // the hand's words
    var hd = game.hand;
    if (hd.saying && hd.visible) { R.project(hd.x, hd.y + 0.6, hd.z, pp); bubble(ctx, pp.x, pp.y, "“" + hd.saying + "”", "say"); }
  });
})();
