/* smol brains 2 — pixel.js
   Pixel-art creatures. Every smol (and grump) gets a little sprite sheet painted from its genes: body
   shape and colour, pattern, eyes, ears, legs, arms, tail, fins, wings, horns, fluff, and what its stage of
   evolution wears (tribe headband, builder belt, thinker glasses, ascended halo). 12 frames: idle x2,
   walk x4, blink, sleep, eat, happy, sad, scared. Sheets live in one texture atlas and are drawn as
   camera-facing sprites, snapped to the pixel grid at whole-number scales so they never smear, lit by the
   same sun, sky and firelight as the world. Only used in pixel mode (SB.Render.pixel). */
(function () {
  "use strict";
  var SB = window.SB, R = SB.Render, GL = SB.GL;
  var PX = (SB.Pixel = {});
  var F = 32, NF = 13; // frame size in px, frames per sheet
  var AW = F * NF * 4, AH = 1024, SLOTS_X = 4, SLOTS = SLOTS_X * (AH / F) | 0;
  var FR = { idle0: 0, idle1: 1, walk0: 2, walk1: 3, walk2: 4, walk3: 5, blink: 6, sleep: 7, eat: 8, happy: 9, sad: 10, scared: 11, dot: 12 }; // dot: how a smol looks from far away
  PX.FR = FR;

  /* ---------------- colour helpers ---------------- */
  function hsl(h, s, l) { var c = SB.hsl(((h % 360) + 360) % 360, SB.clamp01(s), SB.clamp01(l)); return [c[0] * 255 | 0, c[1] * 255 | 0, c[2] * 255 | 0]; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t | 0, a[1] + (b[1] - a[1]) * t | 0, a[2] + (b[2] - a[2]) * t | 0]; }
  var INK = [26, 20, 32], WHITE = [255, 255, 255], PINK = [255, 140, 165], LIME = [197, 255, 73], GOLD = [255, 214, 92], CREAM = [245, 232, 205];

  /* ---------------- a 32x32 frame you can paint pixels on ---------------- */
  function Frame() { this.d = new Uint8ClampedArray(F * F * 4); this.tag = new Uint8Array(F * F); }
  Frame.prototype.px = function (x, y, c, tag) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= F || y >= F || !c) return;
    var i = (y * F + x) * 4;
    this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = 255;
    this.tag[y * F + x] = tag || 1;
  };
  Frame.prototype.rect = function (x, y, w, h, c, tag) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.px(x + i, y + j, c, tag); };
  // filled ellipse; shade(x,y,u,v) -> colour, u/v in -1..1 across the ellipse
  Frame.prototype.oval = function (cx, cy, rx, ry, shade, tag) {
    for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      var u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry;
      if (u * u + v * v <= 1.0) this.px(x, y, typeof shade === "function" ? shade(x, y, u, v) : shade, tag);
    }
  };
  Frame.prototype.on = function (x, y) { return x >= 0 && y >= 0 && x < F && y < F && this.d[(y * F + x) * 4 + 3] > 0; };
  // 1px outline around everything painted so far (tag 9 = glowy bits that stay unoutlined)
  Frame.prototype.outline = function (c) {
    var add = [];
    for (var y = 0; y < F; y++) for (var x = 0; x < F; x++) {
      if (this.on(x, y)) continue;
      var n = 0;
      if (this.on(x - 1, y) && this.tag[y * F + x - 1] !== 9) n++;
      if (this.on(x + 1, y) && this.tag[y * F + x + 1] !== 9) n++;
      if (this.on(x, y - 1) && this.tag[(y - 1) * F + x] !== 9) n++;
      if (this.on(x, y + 1) && this.tag[(y + 1) * F + x] !== 9) n++;
      if (n) add.push(x, y);
    }
    for (var i = 0; i < add.length; i += 2) this.px(add[i], add[i + 1], c, 2);
  };

  /* ---------------- the painter ----------------
     Facing right. Feet on row 30. Returns frames and a little metadata (body height in px). */
  function paint(c) {
    var lk = c.look, grump = c.species === "grump", tier = grump ? 0 : c.tier, st = c.stage || 0;
    var elder = st >= 4, r = SB.rng(((lk.spotsSeed || 1) * 31 + (lk.hue | 0)) >>> 0);
    // palette
    var sat = lk.sat / 100 * (elder ? 0.7 : 1), lig = lk.light / 100;
    var base = hsl(lk.hue, sat, lig), light = hsl(lk.hue - 6, sat * 0.85, Math.min(0.9, lig + 0.14)), dark = hsl(lk.hue + 8, sat, Math.max(0.12, lig - 0.17));
    var second = hsl(lk.hue2, Math.min(1, sat + 0.1), Math.min(0.85, lig + 0.1)), belly = mix(base, [255, 250, 240], 0.55);
    var outline = grump ? [20, 12, 24] : hsl(lk.hue + 10, sat * 0.6, Math.max(0.08, lig - 0.45));
    // body size: babies are smaller, big bodies are bigger, evolved smols stand a bit taller
    var shrink = [4, 2, 1, 0, 0][Math.min(4, st)] || 0;
    var bw = Math.round(11 + (lk.body - 0.8) * 9 + (lk.size - 1) * 8 + Math.min(tier, 4) * 0.4) - shrink;
    var bh = Math.round(bw * 0.86) + (tier >= 3 ? 1 : 0) + (lk.head > 0.4 || tier >= 5 ? 2 : 0);
    if (grump) { bw += 1; bh += 1; }
    // from tribe on, smols stand up: a head on a torso, two legs, two arms (a little person)
    var upright = !grump && tier >= 3;
    var legs = upright ? 2 : lk.legs, legH = upright ? 3 + Math.round(lk.legLen * 2) - (st < 2 ? 1 : 0) : legs ? 2 + Math.round(lk.legLen * 3) - (st < 2 ? 1 : 0) : 0;
    var hasArms = lk.arms || upright;
    var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
    var tw = clamp(Math.round(bw * 0.55), 5, 8), th = clamp(Math.round(bh * 0.45), 4, 7);
    var hr = clamp(Math.round(bw * 0.36) + (tier >= 5 ? 1 : 0), 4, 6), hry = hr * 0.9;
    var frames = [];
    for (var fi = 0; fi < NF; fi++) {
      var f = new Frame();
      if (fi === FR.dot) { // a little coloured pebble with a highlight, for the zoomed-out view
        f.oval(16, 27.5, 2.6, 2.1, function (x, y, u, v) { return u < -0.2 && v < -0.2 ? light : v > 0.5 ? dark : base; });
        if (!grump && tier >= 6) f.px(16, 24, GOLD, 9);
        f.outline(outline); frames.push(f); continue;
      }
      var walk = fi >= 2 && fi <= 5 ? fi - 2 : -1;
      var hop = 0, sq = 0, breathe = fi === 1 ? 1 : 0;
      if (!legs && walk >= 0) { hop = [1, 3, 1, 0][walk]; sq = walk === 3 ? 1 : 0; }
      if (upright && walk >= 0) hop = walk % 2;
      if (fi === FR.sleep) { sq = 1; }
      var bot = 30 - legH - hop;
      // body = the round blob (or the torso, when upright); head = where the face goes
      var bcx = 15.5, brx, bry, bcy, cx, cy, rx, ry, top;
      if (upright) {
        brx = tw / 2; bry = (th + breathe - sq) / 2; bcy = bot - bry + 0.5;
        cx = 16; rx = hr; ry = hry - sq * 0.5; cy = bcy - bry - ry + 1.5; top = cy - ry;
      } else {
        brx = bw / 2 + sq * 0.6; bry = (bh + breathe - sq) / 2; bcy = bot - bry + 0.5;
        cx = bcx; cy = bcy; rx = brx; ry = bry; top = cy - ry;
      }
      var flap = walk >= 0 ? walk % 2 : 0, swing = walk >= 0 ? (walk % 2 ? 1 : -1) : 0;
      var shade = function (x, y, u, v) { var d = u * 0.55 + v * 0.75; return d < -0.62 ? light : d > 0.62 ? dark : null; };
      // ---- behind: tail, wings, fins, spikes, far legs, far arm
      if (lk.tail === 1) f.oval(bcx - brx + 0.5, bcy + bry * 0.35, 1.6, 1.6, second);
      else if (lk.tail === 2) { for (var t = 0; t < 4; t++) f.px(bcx - brx - t, bcy + bry * 0.3 - t * 0.8 + (t === 3 ? 1 : 0), dark); }
      else if (lk.tail === 3) f.oval(bcx - brx, bcy + bry * 0.2, 2.6, 2.4, function (x, y, u, v) { return v < -0.2 ? WHITE : belly; });
      if (lk.wings) { var wy = (upright ? bcy - bry : top + 3) - flap * 2; f.oval(bcx - brx * 0.5 - (upright ? 2 : 0), wy, 3.2, 2.2 + flap * 0.4, function (x, y, u, v) { return u < -0.3 ? mix(second, WHITE, 0.7) : mix(second, WHITE, 0.45); }); }
      if (lk.fins) { for (var fn = 0; fn < 3; fn++) f.rect(bcx - 1 - fn - (upright ? 2 : 0), (upright ? bcy - bry : top) - 2 + fn, 1, 3 - fn, second); }
      if (grump) for (var sp = 0; sp < 3; sp++) { var sx = cx - rx * 0.2 - sp * 2.6, sy = cy - ry * Math.cos((sp * 0.35)); f.px(sx, sy - 1, dark); f.px(sx, sy - 2, dark); f.px(sx - 1, sy, dark); }
      if (legs) {
        var backX = legs === 4 ? [bcx - brx * 0.55, bcx + brx * 0.15] : upright ? [bcx - 2] : [bcx - brx * 0.25];
        backX.forEach(function (lx, i) { var lift = walk >= 0 && (walk + i) % 2 === 0 ? 1 : 0; f.rect(lx, bot - 1 - lift, 2, legH + 1 - lift, dark); });
      }
      if (hasArms) {
        if (upright) { var fay = bcy - bry + 1; f.rect(bcx - brx - 1, fay - swing, 2, Math.max(3, th - 1), dark); }
        else { var ay = bcy - (c.holding != null ? 2 : 0); f.rect(bcx - brx + 0.5, ay, 2, 3, dark); }
      }
      // ---- body (blob or torso) with soft shading
      f.oval(bcx, bcy, brx, bry, function (x, y, u, v) {
        var sh = shade(x, y, u, v); if (sh) return sh;
        if (lk.pattern === 1 && v > 0.05 && u > -0.35) return belly;
        if (lk.pattern === 3 && (Math.abs(v + 0.25) < 0.13 || Math.abs(v - 0.2) < 0.13)) return second;
        return base;
      });
      if (lk.pattern === 2) { var rs = SB.rng(lk.spotsSeed || 3); for (var s = 0; s < (upright ? 2 : 4); s++) { var px = bcx - brx * 0.7 + rs() * brx * 0.9, py = bcy - bry * 0.6 + rs() * bry * 1.1; f.rect(px, py, 2, 1 + (s & 1), second); } }
      if (lk.fluff) for (var fl = 0; fl < brx * 2; fl += 2) f.px(bcx - brx + fl + 0.5, bot - 1 + ((fl / 2) % 2), mix(belly, WHITE, 0.4));
      // ---- head (upright smols): a round head sitting on the torso
      if (upright) f.oval(cx, cy, rx, ry, function (x, y, u, v) { return shade(x, y, u, v) || base; });
      // ---- near legs
      if (legs) {
        var frontX = legs === 4 ? [bcx - brx * 0.25, bcx + brx * 0.45] : upright ? [bcx + 0.5] : [bcx + brx * 0.2];
        frontX.forEach(function (lx, i) {
          var lift = walk >= 0 && (walk + i) % 2 === 1 ? 1 : 0;
          f.rect(lx, bot - 1 - lift, 2, legH + 1 - lift, base);
          f.rect(lx, 30 - lift, 3, 1, dark); // foot
        });
      }
      // ---- head bits: ears, antenna, horns
      var earC = lk.ears === 2 || lk.ears === 3 ? second : base;
      if (lk.ears === 1) { [[cx - 3, 0], [cx + 2, 1]].forEach(function (e) { for (var k = 0; k < 3; k++) f.rect(e[0] + k * 0.5, top - 3 + k, 3 - k, 1, k === 2 ? earC : e[1] ? light : earC); f.px(e[0] + 1, top - 1, PINK); }); }
      else if (lk.ears === 2) { [[cx - 3, 0], [cx + 1, 1]].forEach(function (e) { var lean = walk >= 0 ? (walk % 2) : 0; f.rect(e[0] - lean * e[1], top - 6, 2, 6, earC); f.rect(e[0] + 0.5 - lean * e[1], top - 5, 1, 4, PINK); }); }
      else if (lk.ears === 3) { f.oval(cx - rx * 0.55, top + 1, 2, 2, earC); f.oval(cx + rx * 0.45, top + 1, 2, 2, earC); }
      else if (lk.ears === 4) { f.rect(cx - rx - 1, cy - ry * 0.4, 2, 4, earC); }
      if (lk.antenna || grump) { f.rect(cx + 1, top - 4, 1, 4, dark); f.rect(cx + 1, top - 6, 2, 2, grump ? [210, 80, 255] : LIME, 9); }
      if (lk.horns) { f.rect(cx - 3, top - 2, 2, 2, CREAM); f.px(cx - 3, top - 3, CREAM); f.rect(cx + 2, top - 2, 2, 2, CREAM); f.px(cx + 3, top - 3, CREAM); }
      // ---- face (three-quarter view: both eyes on the right half)
      var es = lk.eyes > 1.15 ? 3 : 2, ey = Math.round(cy - ry * 0.2) - (es === 3 ? 1 : 0);
      var e1 = Math.round(cx + rx * 0.05), e2 = Math.round(cx + rx * 0.55), eyeC = grump ? [255, 70, 70] : INK;
      var mouthX = Math.round((e1 + e2) / 2 + 0.5), mouthY = ey + es + 1;
      [e1, e2].forEach(function (ex, i) {
        if (fi === FR.blink || fi === FR.sleep) { f.rect(ex, ey + es - 1, 2, 1, INK); return; }
        if (fi === FR.happy) { f.px(ex, ey + es - 1, INK); f.px(ex + 1, ey + es - 2, INK); f.px(ex + 2, ey + es - 1, i ? null : INK); return; }
        if (fi === FR.scared) { f.rect(ex, ey - 1, 2, es + 1, WHITE); f.px(ex + 1, ey + 1, INK); return; }
        f.rect(ex, ey, 2, es, eyeC);
        if (!grump) f.px(ex, ey, WHITE);
      });
      if (grump || fi === FR.sad) { f.px(e1 - 1, ey - 2 + (grump ? 0 : 1), INK); f.px(e1, ey - 1 - (grump ? 0 : 1), INK); f.px(e2 + 2, ey - 2 + (grump ? 0 : 1), INK); f.px(e2 + 1, ey - 1 - (grump ? 0 : 1), INK); }
      if (elder && !grump) { f.rect(e1, ey - 2, 2, 1, [230, 230, 230]); f.rect(e2, ey - 2, 2, 1, [230, 230, 230]); }
      if (lk.cheeks && !grump && fi !== FR.sad) { f.px(e1 - 1, ey + es, PINK); f.px(e2 + 2, ey + es, PINK); }
      var mc = grump ? [40, 10, 20] : outline;
      if (fi === FR.eat || fi === FR.scared) f.rect(mouthX - 1, mouthY, 2, 2, mc);
      else if (fi === FR.sad) { f.px(mouthX - 1, mouthY + 1, mc); f.px(mouthX, mouthY, mc); f.px(mouthX + 1, mouthY + 1, mc); }
      else if (fi === FR.sleep) f.px(mouthX, mouthY, mc);
      else { f.px(mouthX - 1, mouthY, mc); f.px(mouthX, mouthY + 1, mc); f.px(mouthX + 1, mouthY, mc); }
      if (grump) { f.px(mouthX - 1, mouthY + 1, WHITE); f.px(mouthX + 1, mouthY + 1, WHITE); }
      // ---- near arm
      if (hasArms) {
        var hold = c.holding != null;
        if (upright) {
          var nax = bcx + brx - 1, nay = bcy - bry + 1;
          if (hold) f.rect(nax, nay, 3, 2, base); else f.rect(nax, nay + swing, 2, Math.max(3, th - 1), base);
          f.px(nax + (hold ? 2 : 0), nay + (hold ? 1 : Math.max(3, th - 1) + swing - 1), light); // little hand
        } else {
          var ax = bcx + brx - 1.5, ay2 = bcy + (hold ? -1 : 0);
          if (hold) f.rect(ax, ay2, 3, 2, base); else f.rect(ax, ay2 + (walk >= 0 ? (walk % 2) : 0), 2, 3, base);
        }
      }
      // ---- what evolution wears
      if (!grump && tier >= 3 && tier < 6) { // headband with a feather
        var hb = Math.round(top + 2);
        for (var hx = Math.ceil(cx - rx); hx <= cx + rx; hx++) if (f.on(hx, hb)) f.px(hx, hb, tier >= 4 ? [220, 80, 70] : [240, 190, 60]);
        f.rect(Math.round(cx - rx + 1), hb - 3, 1, 3, tier >= 4 ? [90, 190, 240] : [255, 110, 90]);
      }
      if (!grump && tier >= 4) { // builder's tool belt
        var by = Math.round(bcy + bry * 0.3);
        for (var bx = Math.ceil(bcx - brx); bx <= bcx + brx; bx++) if (f.on(bx, by)) f.px(bx, by, [120, 80, 45]);
        f.px(Math.round(bcx + brx * 0.3), by, GOLD);
      }
      if (!grump && tier === 5) { // thinkers: little round glasses
        var gc = [70, 55, 95];
        [e1, e2].forEach(function (ex) { f.px(ex - 1, ey, gc); f.px(ex + 2, ey, gc); f.rect(ex, ey - 1, 2, 1, gc); f.rect(ex, ey + es, 2, 1, gc); });
        f.px(Math.round((e1 + e2) / 2) + 1, ey, gc);
      }
      f.outline(outline);
      if (!grump && tier >= 6) { // halo, unoutlined so it glows
        var hy = top - 4;
        for (var hh = -3; hh <= 3; hh++) { f.px(cx + hh, hy - (Math.abs(hh) < 3 ? 1 : 0), GOLD, 9); if (Math.abs(hh) === 3) f.px(cx + hh, hy, GOLD, 9); }
      }
      frames.push(f);
    }
    var tallPx = upright ? th + Math.round(hry * 2) + legH : bh + legH;
    return { frames: frames, bodyPx: tallPx };
  }
  PX.paint = paint;

  /* ---------------- atlas ---------------- */
  var atlas = null, tex = null, slots = {}, slotUse = [], frameNo = 0, glctx = null;
  function sheetKey(c) {
    var lk = c.look;
    return [c.species, lk.hue, lk.hue2, lk.sat | 0, lk.light | 0, lk.pattern, lk.ears, (lk.eyes * 10) | 0, lk.tail, (lk.body * 10) | 0, lk.legs, (lk.legLen * 10) | 0, lk.arms ? 1 : 0,
      lk.head > 0.4 ? 1 : 0, lk.fins ? 1 : 0, lk.fluff ? 1 : 0, lk.horns ? 1 : 0, lk.wings ? 1 : 0, lk.antenna ? 1 : 0, lk.cheeks ? 1 : 0, c.tier, Math.min(4, c.stage || 0), c.holding != null ? 1 : 0, lk.spotsSeed].join(",");
  }
  function ensureAtlas(ctx) {
    if (tex && glctx === ctx) return;
    glctx = ctx; slots = {}; slotUse = [];
    var gl = ctx.gl;
    tex = GL.texture(ctx, AW, AH, null, { nearest: true });
    atlas = document.createElement("canvas"); atlas.width = F * NF; atlas.height = F;
  }
  function sheetFor(c, ctx) {
    var key = c._pxKey && c._pxLook === c.look && c._pxTier === c.tier && c._pxStage === c.stage && c._pxHold === (c.holding != null) ? c._pxKey : null;
    if (!key) { key = sheetKey(c); c._pxKey = key; c._pxLook = c.look; c._pxTier = c.tier; c._pxStage = c.stage; c._pxHold = c.holding != null; }
    var s = slots[key];
    if (s) { slotUse[s.i] = frameNo; return s; }
    // find a free slot, or the least recently used one
    var idx = -1, oldest = Infinity;
    for (var i = 0; i < SLOTS; i++) { if (slotUse[i] == null) { idx = i; break; } if (slotUse[i] < oldest && slotUse[i] < frameNo - 2) { oldest = slotUse[i]; idx = i; } }
    if (idx < 0) return null;
    for (var k in slots) if (slots[k].i === idx) delete slots[k];
    var sheet = paint(c), gl = ctx.gl, a2 = atlas.getContext("2d"), img = a2.createImageData(F * NF, F);
    for (var fi = 0; fi < NF; fi++) for (var y = 0; y < F; y++) img.data.set(sheet.frames[fi].d.subarray(y * F * 4, (y + 1) * F * 4), (y * F * NF + fi * F) * 4);
    var ox = (idx % SLOTS_X) * F * NF, oy = ((idx / SLOTS_X) | 0) * F;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, ox, oy, gl.RGBA, gl.UNSIGNED_BYTE, img);
    s = slots[key] = { i: idx, ox: ox, oy: oy, bodyPx: sheet.bodyPx };
    slotUse[idx] = frameNo;
    return s;
  }
  PX.sheetFor = sheetFor;

  /* ---------------- per-frame sprite list ---------------- */
  var IS = 13, inst = new Float32Array(IS * 128), n = 0, holder = {}, quad = null, prog = null;
  function frameFor(c, t) {
    var an = c.anim, a = c.action;
    if (c.asleep) return FR.sleep;
    if ((c.drownT || 0) > 0 || c.chem.fear > 0.65) return FR.scared;
    if (a && a.verb === SB.V.eat && a.phase === "do") return ((t * 6) | 0) % 2 ? FR.eat : FR.idle0;
    if (an.emote === "happy" || an.emote === "love" || an.emote === "yum" || an.emote === "proud") return FR.happy;
    if (an.emote === "sad" || an.emote === "ouch" || an.emote === "sick") return FR.sad;
    var moving = c.moving || (a && a.phase === "go") || !!c.plan;
    if (moving && c.onGround !== false) return FR.walk0 + ((an.walk * 0.9) | 0) % 4;
    if (an.blink > 0.5) return FR.blink;
    return Math.sin(an.bob) > 0 ? FR.idle1 : FR.idle0;
  }
  // queue one creature (called from bodies.js instead of the 3D parts)
  PX.creature = function (c, x, y, z, t, alpha) {
    var ctx = R.gl();
    if (!ctx) return;
    ensureAtlas(ctx);
    var s = sheetFor(c, ctx);
    if (!s) return;
    var cam = R.camera, cs = R.canvasSize(), ppu = cs.h / (2 * cam.halfH); // art pixels per world unit
    var Rr = SB.Creature.radius(c), lk = c.look;
    // as tall as the creature is in the world; whole-number pixel scales up close (crisp), and a smooth
    // shrink when zoomed far out so they don't tower over a tiny island
    // one pixel scale for everyone on screen (set by the camera), so neighbours always match; size
    // differences between smols come from how big each one is painted
    // zoomed right in they top out at 2x (no giants); zoomed far out they become dots
    var ratio = 0.38 * 2.2 * ppu / 16, dot = ratio < 0.42;
    var k = dot ? 1 : ratio < 0.8 ? ratio : Math.min(2, Math.max(1, Math.floor(ratio + 0.3)));
    c._pxH = (s.bodyPx + 6) * k * (R.pixelSize || 1); // on-screen height in CSS px, for speech bubbles
    var fr = dot ? FR.dot : frameFor(c, t);
    if (dot) c._pxH = 8 * (R.pixelSize || 1);
    if (c.tier >= 6 && c.species === "smol" && !c.heldBy) y += Math.sin(t * 1.7 + c.id) * 0.06; // a slow, smooth hover
    // facing: which way it's heading on screen
    var sx = Math.sin(c.facing), sz = Math.cos(c.facing), flip = (sx * cam.right[0] + sz * cam.right[2]) < 0 ? 1 : 0;
    if (n * IS >= inst.length) { var ni = new Float32Array(inst.length * 2); ni.set(inst); inst = ni; }
    // in water: only the part above the surface shows (wading, swimming, or sinking while it drowns)
    var w = SB.Game.current && SB.Game.current.world, cut = 0;
    if (w && !c.heldBy && c.onGround !== false) {
      var dep = SB.World.depthAt(w, x, z);
      if (dep > 0.15) { cut = Math.min(0.55, (dep - 0.15) * 0.6 + ((c.drownT || 0) > 0 ? 0.25 : 0)); y = SB.World.groundY(w, x, z); }
    }
    var cutPx = Math.round(cut * (s.bodyPx + 2)) + (cut ? 2 : 0); // rows hidden below the waterline (frame has 2 empty rows at the bottom)
    var o = n * IS;
    inst[o] = x; inst[o + 1] = y; inst[o + 2] = z;
    inst[o + 3] = F * k; inst[o + 4] = (F - cutPx) * k;
    inst[o + 5] = (s.ox + fr * F) / AW; inst[o + 6] = s.oy / AH; inst[o + 7] = (s.ox + (fr + 1) * F) / AW; inst[o + 8] = (s.oy + F - cutPx) / AH;
    inst[o + 9] = flip; inst[o + 10] = lk.glow ? 0.35 + lk.glow * 0.4 : 0; inst[o + 11] = c.anim.flash || 0; inst[o + 12] = c.dying ? 1 - c.fade : 1;
    n++;
  };

  var VS = [
    "attribute vec2 aCorner;",
    "attribute vec3 iPos; attribute vec2 iPx; attribute vec4 iUV; attribute vec4 iMisc;",
    "uniform mat4 uVP; uniform vec2 uRes;",
    "varying vec2 vUV; varying vec3 vW; varying vec2 vMisc; varying float vFog; varying float vA;",
    "uniform vec4 uFog; uniform vec4 uCam;",
    "void main() {",
    "  vec4 c = uVP * vec4(iPos, 1.0);",
    "  vec2 pix = floor((c.xy / c.w * 0.5 + 0.5) * uRes + 0.5);",          // snap the feet to the pixel grid
    "  float k = iPx.x / 32.0;",
    "  vec2 p = pix + vec2(floor((aCorner.x - 0.5) * iPx.x + 0.5), aCorner.y * iPx.y - (iPx.y < iPx.x ? 0.0 : k));",
    "  gl_Position = vec4(p / uRes * 2.0 - 1.0, c.z / c.w - 0.004, 1.0);",
    "  float u = iMisc.x > 0.5 ? 1.0 - aCorner.x : aCorner.x;",
    "  vUV = vec2(mix(iUV.x, iUV.z, u), mix(iUV.w, iUV.y, aCorner.y));",
    "  vW = iPos + vec3(0.0, aCorner.y * 0.8, 0.0);",
    "  vMisc = iMisc.yz; vA = iMisc.w;",
    "  vFog = smoothstep(uFog.x, uFog.y, dot(iPos.xz - uCam.xy, uCam.zw)) * uFog.z;",
    "}"
  ].join("\n");
  function fs() {
    return [R.PREC, R.LIGHT_GLSL,
      "uniform sampler2D uAtlas;",
      "varying vec2 vUV; varying vec3 vW; varying vec2 vMisc; varying float vFog; varying float vA;",
      "void main() {",
      "  vec4 t = texture2D(uAtlas, vUV);",
      "  if (t.a < 0.5 || vA < 0.02) discard;",
      "  vec3 col = shade(t.rgb, normalize(vec3(-0.2, 0.85, 0.5)), vW, vMisc.x, vFog);",
      "  col = mix(col, vec3(1.0), vMisc.y * 0.7);",
      "  gl_FragColor = vec4(col, 1.0);",
      "}"].join("\n");
  }

  R.afterObjects(function (gl, ctx, VP, cam) {
    frameNo++;
    if (!n) return;
    if (!prog) {
      prog = GL.program(ctx, VS, fs());
      quad = GL.buffer(ctx, new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]));
    }
    var p = prog;
    gl.useProgram(p.prog);
    R.setLightUniforms(p);
    var cs = R.canvasSize();
    gl.uniform2f(p.u.uRes, cs.w, cs.h);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(p.u.uAtlas, 1);
    GL.attribs(ctx, quad, [[p.a.aCorner, 2]], 2, 0);
    GL.stream(ctx, holder, inst, n * IS);
    GL.attribs(ctx, holder.buf, [[p.a.iPos, 3], [p.a.iPx, 2], [p.a.iUV, 4], [p.a.iMisc, 4]], IS, 1);
    gl.depthMask(false); // sprites carry their own painted outline; keep them out of the outline pass
    ctx.drawInstanced(gl.TRIANGLES, 0, 6, n);
    gl.depthMask(true);
    gl.activeTexture(gl.TEXTURE0);
    if (R.perf) R.perf.draws++;
    n = 0;
  });
})();
