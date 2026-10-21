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
  // the face a sheet is painted with: blobs, critters and tool-users always wear their cute smile (""),
  // tribe smols and up show their mood (SB.Chem.face, held steady by creature.js); asleep they rest "tired"
  function faceOf(c) {
    if (c.species === "grump" || !(c.tier >= 3)) return "";
    var f = c.anim && c.anim.face;
    return f === "sleep" ? "tired" : f || "neutral";
  }
  PX.faceOf = faceOf;
  // Everything the painter decides from the genes before it paints: palette, pattern functions and body
  // proportions. Shared with voxel.js, so the 3D smols are built from exactly the same numbers.
  function spec(c, faceIn) {
    var lk = c.look, grump = c.species === "grump", tier = grump ? 0 : c.tier, st = c.stage || 0;
    var elder = st >= 4, r = SB.rng(((lk.spotsSeed || 1) * 31 + (lk.hue | 0)) >>> 0);
    // collectible traits (see collect.js): pattern, eyes, accessory, palette, fluff
    var cx = !grump && lk.cx && SB.Collect ? lk.cx : null;
    function trait(slot) { return cx ? SB.Collect.entry(slot, cx[slot])[0] : ""; }
    var pat = trait("pat"), eyeT = trait("eye"), acc = trait("acc"), pal = trait("pal"), fluffF = cx ? cx.f : 0.5;
    // palette
    var hue = lk.hue, hue2 = lk.hue2, sat = lk.sat / 100 * (elder ? 0.7 : 1), lig = lk.light / 100;
    if (pal === "pastel") { sat *= 0.5; lig = Math.min(0.84, lig + 0.13); }
    else if (pal === "midnight") { sat = Math.min(1, sat * 0.7 + 0.2); lig = 0.3; hue2 = hue + 180; }
    else if (pal === "shiny") { hue += 150; hue2 += 150; sat = Math.min(1, sat + 0.15); }
    if (pat === "galaxy") { hue = 252; sat = 0.55; lig = 0.24; hue2 = 300; }
    else if (pat === "gold") { hue2 = 45; }
    var base = hsl(hue, sat, lig), light = hsl(hue - 6, sat * 0.85, Math.min(0.9, lig + 0.14)), dark = hsl(hue + 8, sat, Math.max(0.12, lig - 0.17));
    var second = hsl(hue2, Math.min(1, sat + 0.1), Math.min(0.85, lig + (pal === "midnight" ? 0.3 : 0.1))), belly = mix(base, [255, 250, 240], 0.55);
    var outline = grump ? [20, 12, 24] : pat === "galaxy" ? [16, 10, 40] : hsl(hue + 10, sat * 0.6, Math.max(0.08, lig - 0.45));
    var seed = lk.spotsSeed || 1;
    // the body's colour at a pixel for the special patterns (null: use the usual shading and pattern)
    var shine = function (col, u, v) { var d = u * 0.55 + v * 0.75; return d < -0.62 ? mix(col, WHITE, 0.35) : d > 0.62 ? mix(col, INK, 0.3) : col; };
    function special(x, y, u, v) {
      if (pal === "prism") return shine(hsl(hue + x * 22 + y * 7, 0.75, 0.66), u, v);
      if (pat === "holo") return shine(SB.hash(x, y, seed) < 0.06 ? WHITE : hsl(hue + (x + y) * 24, 0.5, 0.76), u, v);
      if (pat === "galaxy") {
        if (SB.hash(x, y, seed + 7) < 0.08) return SB.hash(x, y, seed) < 0.5 ? WHITE : [255, 200, 240];
        if (SB.hash(x >> 2, y >> 2, seed + 3) < 0.35) return shine(hsl(300 + (x - y) * 4, 0.55, 0.36), u, v);
        return null;
      }
      return null;
    }
    function patternAt(x, y, u, v) {
      if (pat === "gradient") return v < -0.25 ? null : v < 0.3 ? mix(base, second, 0.5) : second;
      if (pat === "tiger") return u > -0.75 && (x + (y >> 1)) % 4 === 0 ? dark : null;
      if (pat === "calico") { var hc = SB.hash(Math.floor(x / 3), Math.floor(y / 3), seed); return hc < 0.28 ? second : hc < 0.45 ? CREAM : null; }
      if (pat === "gold") return SB.hash(x, y, seed + 11) < 0.2 ? (SB.hash(y, x, seed) < 0.5 ? GOLD : [255, 238, 160]) : null;
      if (pat === "freckles") return v > -0.15 && v < 0.35 && SB.hash(x, y, seed + 5) < 0.13 ? mix(base, [150, 70, 50], 0.5) : null;
      return null;
    }
    var classic = !pat || pat === "classic";
    // body size: babies are smaller, big bodies are bigger, evolved smols stand a bit taller
    var shrink = [4, 2, 1, 0, 0][Math.min(4, st)] || 0;
    var bw = Math.round(11 + (lk.body - 0.8) * 9 + (lk.size - 1) * 8 + Math.min(tier, 4) * 0.4) - shrink;
    var bh = Math.round(bw * 0.86) + (tier >= 3 ? 1 : 0) + (lk.head > 0.4 || tier >= 5 ? 2 : 0);
    if (grump) { bw += 1; bh += 1; }
    // from tribe on, smols stand up: a head on a torso, two legs, two arms (a little person)
    var upright = !grump && tier >= 3;
    // grown-ups (tribe on, teen and older) lose the baby proportions: a longer torso and legs, broader
    // shoulders, a head no bigger than radius 5 (thinkers keep their big one), small pupils and brows
    var grown = upright && st >= 2, face = upright ? faceIn || faceOf(c) || "neutral" : "";
    var legs = upright ? 2 : lk.legs, legH = upright ? 3 + Math.round(lk.legLen * 2) - (st < 2 ? 1 : 0) + (grown ? 1 : 0) : legs ? 2 + Math.round(lk.legLen * 3) - (st < 2 ? 1 : 0) : 0;
    var hasArms = lk.arms || upright;
    var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
    var tw = clamp(Math.round(bw * 0.55) + (grown ? 1 : 0), 5, grown ? 9 : 8), th = clamp(Math.round(bh * 0.45) + (grown ? 1 : 0), 4, grown ? 8 : 7);
    var hr = clamp(Math.round(bw * 0.36) + (tier >= 5 ? 1 : 0), 4, grown && tier < 5 ? 5 : 6), hry = hr * 0.9;
    if (grown && hr >= 6 && lk.ears === 2) legH--; // a big thinker head with tall ears: no room to stand taller
    return { lk: lk, grump: grump, tier: tier, st: st, elder: elder, pat: pat, eyeT: eyeT, acc: acc, pal: pal, fluffF: fluffF, hue: hue, hue2: hue2, sat: sat, lig: lig,
      base: base, light: light, dark: dark, second: second, belly: belly, outline: outline, seed: seed, special: special, patternAt: patternAt, classic: classic,
      bw: bw, bh: bh, upright: upright, grown: grown, face: face, legs: legs, legH: legH, hasArms: hasArms, tw: tw, th: th, hr: hr, hry: hry };
  }
  PX.spec = spec;
  function paint(c, faceIn) {
    var S = spec(c, faceIn), lk = S.lk, grump = S.grump, tier = S.tier, elder = S.elder, pat = S.pat, eyeT = S.eyeT, acc = S.acc, pal = S.pal, fluffF = S.fluffF;
    var base = S.base, light = S.light, dark = S.dark, second = S.second, belly = S.belly, outline = S.outline, special = S.special, patternAt = S.patternAt, classic = S.classic;
    var bw = S.bw, bh = S.bh, upright = S.upright, grown = S.grown, face = S.face, legs = S.legs, legH = S.legH, hasArms = S.hasArms, tw = S.tw, th = S.th, hr = S.hr, hry = S.hry;
    var headAt = null;
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
      if (acc === "crystal") for (var cr = 0; cr < 3; cr++) { var crx = Math.round(cx - rx * 0.35 - cr * 2.4), cry = Math.round(top + 1 + cr * 1.8); f.rect(crx, cry - 3, 2, 3, [120, 220, 255]); f.px(crx, cry - 4, [220, 250, 255]); f.px(crx + 1, cry - 2, [200, 245, 255]); }
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
        var sp2 = special(x, y, u, v); if (sp2) return sp2;
        var sh = shade(x, y, u, v); if (sh) return sh;
        if (!classic) return patternAt(x, y, u, v) || base;
        if (lk.pattern === 1 && v > 0.05 && u > -0.35) return belly;
        if (lk.pattern === 3 && (Math.abs(v + 0.25) < 0.13 || Math.abs(v - 0.2) < 0.13)) return second;
        return base;
      });
      if (lk.pattern === 2 && classic) { var rs = SB.rng(lk.spotsSeed || 3); for (var s = 0; s < (upright ? 2 : 4); s++) { var px = bcx - brx * 0.7 + rs() * brx * 0.9, py = bcy - bry * 0.6 + rs() * bry * 1.1; f.rect(px, py, 2, 1 + (s & 1), second); } }
      if (lk.fluff) for (var fl = 0; fl < brx * 2; fl += 2) f.px(bcx - brx + fl + 0.5, bot - 1 + ((fl / 2) % 2), mix(belly, WHITE, 0.4));
      // ---- head (upright smols): a round head sitting on the torso
      if (upright) f.oval(cx, cy, rx, ry, function (x, y, u, v) { return special(x, y, u, v) || shade(x, y, u, v) || (pat === "freckles" || pat === "gold" || pat === "calico" ? patternAt(x, y, u, v) : null) || base; });
      // ---- worn things: a flower bud, a crown, a leaf scarf, a scruffy tuft
      if (acc === "bud") { f.px(cx - 2, top - 1, [80, 170, 80]); f.px(cx - 2, top - 2, [80, 170, 80]); f.px(cx - 3, top - 3, PINK); f.px(cx - 1, top - 3, PINK); f.px(cx - 2, top - 4, PINK); f.px(cx - 2, top - 3, GOLD); }
      if (acc === "crown") { f.rect(cx - 2, top - 1, 5, 1, GOLD); f.px(cx - 2, top - 2, GOLD); f.px(cx, top - 2, GOLD); f.px(cx + 2, top - 2, GOLD); f.px(cx, top - 1, [255, 90, 150]); }
      if (acc === "scarf") {
        var scy = upright ? Math.round(bcy - bry + 1) : Math.round(cy + ry * 0.45);
        for (var scx = 0; scx < F; scx++) if (f.on(scx, scy)) f.px(scx, scy, scx % 2 ? [96, 196, 92] : [58, 150, 72]);
        f.px(Math.round(bcx - brx * 0.5), scy + 1, [58, 150, 72]); f.px(Math.round(bcx - brx * 0.5) - 1, scy + 2, [96, 196, 92]);
      }
      if (fluffF > 0.85) { f.px(cx - 1, top - 1, light); f.px(cx, top - 2, light); }
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
      var es = lk.eyes > 1.15 && !grown ? 3 : 2, ey = Math.round(cy - ry * 0.2) - (es === 3 ? 1 : 0);
      var e1 = Math.round(cx + rx * 0.05), e2 = Math.round(cx + rx * 0.55), eyeC = grump ? [255, 70, 70] : INK;
      var mouthX = Math.round((e1 + e2) / 2 + 0.5), mouthY = ey + es + 1;
      if (fi === 0) headAt = { x: cx, y: cy, r: rx, ey: ey };
      if (upright) {
        // what evolution wears on the head: a headband with a feather (under the face, so brows sit on it)
        if (tier < 6) {
          var hb = Math.min(Math.round(top + 2), ey - 2);
          for (var hx = Math.ceil(cx - rx); hx <= cx + rx; hx++) if (f.on(hx, hb)) f.px(hx, hb, tier >= 4 ? [220, 80, 70] : [240, 190, 60]);
          f.rect(Math.round(cx - rx + 1), hb - 3, 1, 3, tier >= 4 ? [90, 190, 240] : [255, 110, 90]);
        }
        paintFace(faceInk(f), fi, { e1: e1, e2: e2, ey: ey, es: es, mx: mouthX, my: mouthY, grown: grown, face: face, eyeT: eyeT, elder: elder, cheeks: lk.cheeks, dark: dark, outline: outline, glasses: tier === 5 });
      } else cuteFace(faceInk(f), fi, { e1: e1, e2: e2, ey: ey, es: es, mx: mouthX, my: mouthY, grump: grump, eyeT: eyeT, elder: elder, cheeks: lk.cheeks, dark: dark, outline: outline });
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
      // ---- what evolution wears (the tribe headband went on with the face)
      if (!grump && tier >= 4) { // builder's tool belt
        var by = Math.round(bcy + bry * 0.3);
        for (var bx = Math.ceil(bcx - brx); bx <= bcx + brx; bx++) if (f.on(bx, by)) f.px(bx, by, [120, 80, 45]);
        f.px(Math.round(bcx + brx * 0.3), by, GOLD);
      }
      if (!grump && tier === 5) glasses(faceInk(f), e1, e2, ey, es); // thinkers: little round glasses
      f.outline(outline);
      var gl9 = function (x, y, c) { if (x >= 1 && x <= F - 2 && y >= 1) f.px(x, y, c, 9); };
      if (acc === "halo" && tier < 6) for (var hh2 = -2; hh2 <= 2; hh2++) { gl9(cx + hh2, top - 4 - (Math.abs(hh2) < 2 ? 1 : 0), [190, 240, 255]); if (Math.abs(hh2) === 2) gl9(cx + hh2, top - 4, [190, 240, 255]); }
      if (acc === "moon") { var ma = fi * 0.95, mx = Math.round(cx + Math.cos(ma) * (rx + 3)), my = Math.round(cy - ry * 0.3 + Math.sin(ma) * 3); gl9(mx, my, [235, 230, 255]); gl9(mx + 1, my, [235, 230, 255]); gl9(mx, my + 1, [235, 230, 255]); gl9(mx + 1, my + 1, [165, 150, 230]); }
      if (pal === "shiny" || pal === "prism" || fluffF < 0.07) { // a twinkle that moves between frames
        var spk = [[cx + rx + 1, top + 1], [cx - rx - 1, cy], [cx + rx * 0.4, top - 2], [cx - rx * 0.5, top]][fi % 4], skx = Math.round(spk[0]), sky = Math.round(spk[1]);
        if (!f.on(skx, sky)) { gl9(skx, sky, WHITE); if (pal !== "natural" && pal !== "pastel" && pal !== "midnight") { [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { if (!f.on(skx + d[0], sky + d[1])) gl9(skx + d[0], sky + d[1], pal === "prism" ? hsl(fi * 40, 0.9, 0.7) : GOLD); }); } }
      }
      if (!grump && tier >= 6) { // halo, unoutlined so it glows
        var hy = top - 4;
        for (var hh = -3; hh <= 3; hh++) { f.px(cx + hh, hy - (Math.abs(hh) < 3 ? 1 : 0), GOLD, 9); if (Math.abs(hh) === 3) f.px(cx + hh, hy, GOLD, 9); }
      }
      frames.push(f);
    }
    var tallPx = upright ? th + Math.round(hry * 2) + legH : bh + legH;
    return { frames: frames, bodyPx: tallPx, head: headAt, face: face };
  }
  PX.paint = paint;

  // Face pixels carry their own tag (5), so the hd treatment (hdify) shades the body around them and never the
  // eyes and mouth. Glowing bits (tag 9) keep theirs.
  function faceInk(f) {
    return { px: function (x, y, c, t) { f.px(x, y, c, t === 9 ? 9 : 5); }, rect: function (x, y, w, h, c, t) { f.rect(x, y, w, h, c, t === 9 ? 9 : 5); } };
  }
  // The cute face (blobs, critters, tool-users): big sparkly eyes and a smile, or a grump's scowl. Also painted
  // on the front of the 3D smols (voxel.js), so o carries the positions.
  function cuteFace(f, fi, o) {
    var e1 = o.e1, e2 = o.e2, ey = o.ey, es = o.es, eyeT = o.eyeT, grump = o.grump, eyeC = grump ? [255, 70, 70] : INK, mouthX = o.mx, mouthY = o.my;
    [e1, e2].forEach(function (ex, i) {
      if (fi === FR.blink || fi === FR.sleep) { f.rect(ex, ey + es - 1, 2, 1, INK); return; }
      if (fi === FR.happy) { f.px(ex, ey + es - 1, INK); f.px(ex + 1, ey + es - 2, INK); f.px(ex + 2, ey + es - 1, i ? null : INK); return; }
      if (fi === FR.scared) { f.rect(ex, ey - 1, 2, es + 1, WHITE); f.px(ex + 1, ey + 1, INK); return; }
      var ec = eyeT === "hetero" ? (i ? [235, 165, 45] : [70, 150, 235]) : eyeT === "star" ? [255, 200, 50] : eyeT === "heart" ? [240, 60, 125] : eyeT === "cosmic" ? [80, 40, 150] : eyeC;
      f.rect(ex, ey, 2, es, ec);
      if (eyeT === "sleepy") { f.rect(ex, ey, 2, es - 1, o.dark); return; }
      if (!grump) f.px(ex, ey, eyeT === "cosmic" ? [150, 245, 255] : WHITE);
      if (eyeT === "cosmic") f.px(ex + 1, ey + es - 1, [255, 120, 220]);
      if (eyeT === "heart") f.px(ex + 1, ey + es - 1, [170, 20, 80]);
      if (eyeT === "star" && i) f.px(ex + 2, ey - 1, WHITE, 9);
    });
    if (grump || fi === FR.sad) { f.px(e1 - 1, ey - 2 + (grump ? 0 : 1), INK); f.px(e1, ey - 1 - (grump ? 0 : 1), INK); f.px(e2 + 2, ey - 2 + (grump ? 0 : 1), INK); f.px(e2 + 1, ey - 1 - (grump ? 0 : 1), INK); }
    if (o.elder && !grump) { f.rect(e1, ey - 2, 2, 1, [230, 230, 230]); f.rect(e2, ey - 2, 2, 1, [230, 230, 230]); }
    if (o.cheeks && !grump && fi !== FR.sad) { f.px(e1 - 1, ey + es, PINK); f.px(e2 + 2, ey + es, PINK); }
    var mc = grump ? [40, 10, 20] : o.outline;
    if (fi === FR.eat || fi === FR.scared) f.rect(mouthX - 1, mouthY, 2, 2, mc);
    else if (fi === FR.sad) { f.px(mouthX - 1, mouthY + 1, mc); f.px(mouthX, mouthY, mc); f.px(mouthX + 1, mouthY + 1, mc); }
    else if (fi === FR.sleep) f.px(mouthX, mouthY, mc);
    else { f.px(mouthX - 1, mouthY, mc); f.px(mouthX, mouthY + 1, mc); f.px(mouthX + 1, mouthY, mc); }
    if (grump) { f.px(mouthX - 1, mouthY + 1, WHITE); f.px(mouthX + 1, mouthY + 1, WHITE); }
  }
  function glasses(f, e1, e2, ey, es) {
    var gc = [70, 55, 95];
    [e1, e2].forEach(function (ex) { f.px(ex - 1, ey, gc); f.px(ex + 2, ey, gc); f.rect(ex, ey - 1, 2, 1, gc); f.rect(ex, ey + es, 2, 1, gc); });
    f.px(Math.round((e1 + e2) / 2) + 1, ey, gc);
  }
  PX.cuteFace = cuteFace; PX.glasses = glasses;

  // A tribe-and-on face, readable from the god view in a couple of pixels: brows that tilt (angry: in and
  // down, sad and worried: in and up), the mouth (smile, flat, frown, a little "o"), sleepy lids. Grown-ups
  // get small one-pixel pupils without the sparkle and only blush when they smile; tribe babies keep the
  // big shiny eyes. The special frames (blink, sleep, eat, happy, sad, scared) still win over the mood.
  var BLUSH = PINK, SICKLY = [128, 190, 96];
  function paintFace(f, fi, o) {
    var e1 = o.e1, e2 = o.e2, ey = o.ey, es = o.es, face = o.face, eyeT = o.eyeT;
    var mood = fi === FR.sad ? "sad" : fi === FR.happy ? "smile" : fi === FR.scared ? "worried" : face;
    var closed = fi === FR.blink || fi === FR.sleep, lid = mood === "tired" || eyeT === "sleepy";
    // eyes
    [e1, e2].forEach(function (ex, i) {
      if (closed) { f.rect(ex, ey + es - 1, 2, 1, INK); return; }
      if (fi === FR.happy) { f.px(ex, ey + es - 1, INK); f.px(ex + 1, ey + es - 2, INK); f.px(ex + 2, ey + es - 1, i ? null : INK); return; }
      if (fi === FR.scared) { f.rect(ex, ey - 1, 2, es + 1, WHITE); f.px(ex + 1, ey + 1, INK); return; }
      var ec = eyeT === "hetero" ? (i ? [235, 165, 45] : [70, 150, 235]) : eyeT === "star" ? [255, 200, 50] : eyeT === "heart" ? [240, 60, 125] : eyeT === "cosmic" ? [80, 40, 150] : INK;
      if (o.grown) {
        if (lid) { f.rect(ex, ey, 2, 1, o.dark); f.px(ex + 1, ey + 1, ec); return; } // heavy lids
        f.rect(ex + 1, ey, 1, 2, ec); // a small pupil
        if (mood === "worried") f.px(ex, ey, mix(WHITE, ec, 0.15)); // eyes wide
        return;
      }
      f.rect(ex, ey, 2, es, ec);
      if (lid) { f.rect(ex, ey, 2, es - 1, o.dark); return; }
      f.px(ex, ey, eyeT === "cosmic" ? [150, 245, 255] : WHITE);
      if (eyeT === "cosmic") f.px(ex + 1, ey + es - 1, [255, 120, 220]);
      if (eyeT === "heart") f.px(ex + 1, ey + es - 1, [170, 20, 80]);
      if (eyeT === "star" && i) f.px(ex + 2, ey - 1, WHITE, 9);
    });
    // brows: above the glasses for thinkers; white for elders; softer when the face is at rest
    var by = o.glasses ? ey - 2 : ey - 1, strong = mood === "angry" || mood === "sad" || mood === "worried" || mood === "sick";
    var bc = o.elder ? [232, 232, 232] : strong ? INK : mix(o.dark, INK, 0.45);
    if (o.grown || strong || o.elder) [e1, e2].forEach(function (ex, i) {
      var inner = i ? ex : ex + 1, outer = i ? ex + 1 : ex;
      if (mood === "angry") { f.px(outer, by - 1, bc); f.px(inner, by, bc); }
      else if (strong) { f.px(outer, by, bc); f.px(inner, by - 1, bc); }
      else if (!closed || o.grown) f.rect(ex, by - (mood === "smile" && !closed ? 1 : 0), 2, 1, bc);
    });
    // cheeks: grown-ups blush when they smile; a sick smol goes a little green
    if (mood === "sick") { f.px(e1 - 1, ey + es, SICKLY); f.px(e2 + 2, ey + es, SICKLY); }
    else if (o.cheeks && (mood === "smile" || !o.grown) && mood !== "sad") { f.px(e1 - 1, ey + es, BLUSH); f.px(e2 + 2, ey + es, BLUSH); }
    // mouth
    var mx = o.mx, my = o.my, mc = o.outline;
    if (fi === FR.eat || fi === FR.scared) f.rect(mx - 1, my, 2, 2, mc);
    else if (fi === FR.sleep) f.px(mx, my, mc);
    else if (mood === "smile") { f.px(mx - 1, my, mc); f.px(mx, my + 1, mc); f.px(mx + 1, my, mc); }
    else if (mood === "sad" || mood === "sick") { f.px(mx - 1, my + 1, mc); f.px(mx, my, mc); f.px(mx + 1, my + 1, mc); }
    else if (mood === "worried") f.rect(mx, my, 1, 2, mc);
    else if (mood === "angry") f.rect(mx - 1, my + 1, 3, 1, mc);
    else f.rect(mx - 1, my, 2, 1, mc); // neutral, tired: a flat little line
  }
  PX.paintFace = paintFace;

  /* ---------------- the hd treatment ----------------
     In the hd look every painted frame gets the generated world art's rendering, procedurally, so every gene
     variation keeps working: a soft dome of normals from the silhouette lit from the upper left in five steps
     (lilac deep shade, shade, base, warm light, a honey highlight) with ordered dithering at the steps, a fine
     skin or fur texture (more for fluffy smols), a cool rim of sky light on the far edge, and outlines coloured
     from what they wrap: dark under the feet, a little lighter along the top. Faces (tag 5), glowing bits
     (tag 9) and the outline itself are never shaded. */
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  var TONES = [[0.64, 0.62, 0.8], [0.82, 0.8, 0.92], [1, 1, 1], [1.1, 1.07, 0.97]], HONEY = [255, 244, 214], SKY = [196, 222, 255];
  function hdify(sheet, c) {
    var seed = (c && c.look && c.look.spotsSeed) || 7, fluffy = !!(c && c.look && c.look.fluff), A = new Float32Array(F * F), B = new Float32Array(F * F);
    for (var fi = 0; fi < sheet.frames.length; fi++) {
      if (fi === FR.dot) continue;
      var f = sheet.frames[fi], d = f.d, tg = f.tag, x, y, i;
      // a blurred silhouette (two box passes, radius 2): its slope is the surface normal near the edges
      for (i = 0; i < F * F; i++) A[i] = d[i * 4 + 3] ? 1 : 0;
      var cyy = 0, cn = 0, top = F, bot = 0;
      for (i = 0; i < F * F; i++) if (A[i]) { var yi = (i / F) | 0; cyy += yi; cn++; if (yi < top) top = yi; if (yi > bot) bot = yi; }
      cyy = cn ? cyy / cn : 16;
      for (var pass = 0; pass < 2; pass++) {
        for (y = 0; y < F; y++) for (x = 0; x < F; x++) { var s = 0; for (var k = -3; k <= 3; k++) { var xx = x + k; s += xx >= 0 && xx < F ? A[y * F + xx] : 0; } B[y * F + x] = s / 7; }
        for (y = 0; y < F; y++) for (x = 0; x < F; x++) { var s2 = 0; for (var k2 = -3; k2 <= 3; k2++) { var yy = y + k2; s2 += yy >= 0 && yy < F ? B[yy * F + x] : 0; } A[y * F + x] = s2 / 7; }
      }
      var out = new Uint8ClampedArray(d);
      for (y = 1; y < F - 1; y++) for (x = 1; x < F - 1; x++) {
        i = y * F + x;
        var o = i * 4;
        if (!d[o + 3]) continue;
        var t = tg[i];
        if (t === 2) { // the outline: a dark shade of what it wraps (darkest under the feet, warmer along the top)
          var src = -1, nb = [i - 1, i + 1, i - F, i + F];
          for (var q = 0; q < 4; q++) if (d[nb[q] * 4 + 3] && tg[nb[q]] !== 2 && tg[nb[q]] !== 9) { src = nb[q]; break; }
          if (src < 0) continue;
          var kk = src === i - F ? 0.16 : src === i + F ? 0.34 : 0.24;
          out[o] = d[src * 4] * kk + 14 * (1 - kk); out[o + 1] = d[src * 4 + 1] * kk + 10 * (1 - kk); out[o + 2] = d[src * 4 + 2] * kk + 26 * (1 - kk);
          continue;
        }
        if (t === 5 || t === 9) continue;
        var gx = A[i + 1] - A[i - 1], gy = A[i + F] - A[i - F];
        var nx = -gx * 4, ny = -gy * 4, nz = 1, nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
        var lam = (nx * -0.55 + ny * -0.68 + nz * 0.48) / nl; // light from the upper left, a little in front
        var tone = lam * 0.5 + 0.5 - (y - cyy) / Math.max(6, bot - top) * 0.32 + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.47) * 0.12;
        var r = d[o], g = d[o + 1], b = d[o + 2], T;
        if (tone < 0.36) T = TONES[0]; else if (tone < 0.5) T = TONES[1]; else if (tone < 0.73) T = TONES[2]; else T = TONES[3];
        r *= T[0]; g *= T[1]; b *= T[2];
        if (tone > 0.86) { r += (HONEY[0] - r) * 0.3; g += (HONEY[1] - g) * 0.3; b += (HONEY[2] - b) * 0.3; }
        // skin and fur: a sparse texture of slightly darker (and, on fluffy smols, lighter) pixels
        var hsh = SB.hash(x, y + fi * 0, seed);
        if (hsh < (fluffy ? 0.16 : 0.08)) { r *= 0.9; g *= 0.9; b *= 0.93; }
        else if (fluffy && hsh > 0.9) { r += (255 - r) * 0.12; g += (255 - g) * 0.12; b += (255 - b) * 0.12; }
        // rim light on the far (right) edge, where the sky catches it
        if (!d[(i + 1) * 4 + 3] || tg[i + 1] === 2) { r += (SKY[0] - r) * 0.38; g += (SKY[1] - g) * 0.38; b += (SKY[2] - b) * 0.38; }
        out[o] = r; out[o + 1] = g; out[o + 2] = b;
      }
      f.d = out;
    }
    sheet.hd = true;
    return sheet;
  }
  PX.hdify = hdify;

  /* ---------------- atlas ---------------- */
  var atlas = null, tex = null, slots = {}, slotUse = [], frameNo = 0, glctx = null;
  function sheetKey(c) {
    var lk = c.look;
    return [c.species, lk.hue, lk.hue2, lk.sat | 0, lk.light | 0, lk.pattern, lk.ears, (lk.eyes * 10) | 0, lk.tail, (lk.body * 10) | 0, lk.legs, (lk.legLen * 10) | 0, lk.arms ? 1 : 0,
      lk.head > 0.4 ? 1 : 0, lk.fins ? 1 : 0, lk.fluff ? 1 : 0, lk.horns ? 1 : 0, lk.wings ? 1 : 0, lk.antenna ? 1 : 0, lk.cheeks ? 1 : 0, c.tier, Math.min(4, c.stage || 0), c.holding != null ? 1 : 0, lk.spotsSeed, lk.cxKey || "", (lk.size * 20) | 0, faceOf(c)].join(",");
  }
  function ensureAtlas(ctx) {
    if (tex && glctx === ctx) return;
    glctx = ctx; slots = {}; slotUse = [];
    var gl = ctx.gl;
    tex = GL.texture(ctx, AW, AH, null, { nearest: true });
    atlas = document.createElement("canvas"); atlas.width = F * NF; atlas.height = F;
  }
  function sheetFor(c, ctx) {
    var face = faceOf(c); // a variant per face: the atlas keeps the recent ones, so a smol switching back and forth doesn't repaint
    var key = c._pxKey && c._pxLook === c.look && c._pxTier === c.tier && c._pxStage === c.stage && c._pxHold === (c.holding != null) && c._pxFace === face ? c._pxKey : null;
    if (!key) { key = sheetKey(c); c._pxKey = key; c._pxLook = c.look; c._pxTier = c.tier; c._pxStage = c.stage; c._pxHold = c.holding != null; c._pxFace = face; }
    var s = slots[key];
    if (s) { slotUse[s.i] = frameNo; return s; }
    // find a free slot, or the least recently used one
    var idx = -1, oldest = Infinity;
    for (var i = 0; i < SLOTS; i++) { if (slotUse[i] == null) { idx = i; break; } if (slotUse[i] < oldest && slotUse[i] < frameNo - 2) { oldest = slotUse[i]; idx = i; } }
    if (idx < 0) return null;
    for (var k in slots) if (slots[k].i === idx) delete slots[k];
    var sheet = (PX.override && PX.override(c, F, NF, FR)) || paint(c), gl = ctx.gl, a2 = atlas.getContext("2d"), img = a2.createImageData(F * NF, F);
    if (R.hd && !sheet.hd) hdify(sheet, c); // the hd look: richer shading, a little texture, rim light, coloured outlines
    for (var fi = 0; fi < NF; fi++) for (var y = 0; y < F; y++) img.data.set(sheet.frames[fi].d.subarray(y * F * 4, (y + 1) * F * 4), (y * F * NF + fi * F) * 4);
    var ox = (idx % SLOTS_X) * F * NF, oy = ((idx / SLOTS_X) | 0) * F;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, ox, oy, gl.RGBA, gl.UNSIGNED_BYTE, img);
    s = slots[key] = { i: idx, ox: ox, oy: oy, bodyPx: sheet.bodyPx };
    slotUse[idx] = frameNo;
    return s;
  }
  PX.sheetFor = sheetFor;
  // Art hook: a later pass can hand in drawn sprite sheets (e.g. sliced from SB.Render.art.img.sprites).
  // PX.override(c, frameSize, frameCount, FR) returns { frames: [{ d: Uint8ClampedArray(32*32*4) } x 13], bodyPx }
  // in the same layout paint() makes, or null to keep the painted sheet. Call PX.flush() after changing it.
  PX.override = null;
  PX.flush = function () { slots = {}; slotUse = []; };

  /* ---------------- per-frame sprite list ---------------- */
  var IS = 14, inst = new Float32Array(IS * 128), n = 0, holder = {}, quad = null, prog = null;
  function frameFor(c, t) {
    var an = c.anim, a = c.action;
    if (c.asleep) return FR.sleep;
    if (c.heldBy === "hand" && an.held) return an.held === "giggle" ? FR.happy : FR.scared; // grabbed: a giggle or a squeal
    if ((c.drownT || 0) > 0 || c.chem.fear > 0.65) return FR.scared;
    if (a && a.verb === SB.V.eat && a.phase === "do") return ((t * 6) | 0) % 2 ? FR.eat : FR.idle0;
    if (an.emote === "happy" || an.emote === "love" || an.emote === "yum" || an.emote === "proud") return FR.happy;
    if (an.emote === "sad" || an.emote === "ouch" || an.emote === "sick") return FR.sad;
    var moving = c.moving || (a && a.phase === "go") || !!c.plan;
    if (moving && c.onGround !== false) return FR.walk0 + ((an.walk * 0.9) | 0) % 4;
    if (an.blink > 0.5) return FR.blink;
    return Math.sin(an.bob) > 0 ? FR.idle1 : FR.idle0;
  }
  PX.frameFor = frameFor;
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
    if (cam.pov) { // first person: each sprite scales with its own distance, and nothing behind the eye
      ppu = R.ppuAt(x, y + 0.3, z);
      if (!ppu || ppu > cam.povK / 0.75) return; // behind the eye, or so close it would fill the screen
      ratio = 0.38 * 2.2 * ppu / 16; dot = ratio < 0.12; k = SB.clamp(ratio, 0.12, cs.h * 0.45 / F);
    }
    c._pxH = (s.bodyPx + 6) * k * (R.pixelSize || 1); // on-screen height in CSS px, for speech bubbles
    var fr = dot ? FR.dot : frameFor(c, t);
    if (dot) c._pxH = 8 * (R.pixelSize || 1);
    if (c.tier >= 6 && c.species === "smol" && !c.heldBy && !c.corpse) y += Math.sin(t * 1.7 + c.id) * 0.06; // a slow, smooth hover
    // facing: which way it's heading on screen
    var fa = c._mo ? c._mo.face : c.facing, sx = Math.sin(fa), sz = Math.cos(fa), flip = (sx * cam.right[0] + sz * cam.right[2]) < 0 ? 1 : 0;
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
    // squash and stretch from bodies.js's springs (landing thumps, bonks, play, stretch in the air), a breath
    // when idle, a squish sideways as it turns round, and a lean into its stride that wobbles back when it stops
    var mo = c._mo, sq = c.heldBy === "hand" ? c.anim.squash || 0 : mo ? mo.sq : 0, lean = mo && !dot ? mo.ln : 0;
    if (!dot && !c.corpse && !c.asleep && fr !== FR.sleep) sq += Math.sin(c.anim.bob * 1.3) * 0.03;
    if (mo) { if (mo.flip >= 0 && mo.flip !== flip && !dot) mo.turn = 1; mo.flip = flip; }
    var turnK = mo && mo.turn > 0 ? 1 - Math.sin(mo.turn * Math.PI) * 0.45 : 1;
    inst[o + 3] = F * k * (1 + sq * 0.5) * turnK; inst[o + 4] = (F - cutPx) * k * (1 - sq);
    inst[o + 13] = (flip ? -1 : 1) * lean * 9 * k; // art pixels the top shifts forward
    inst[o + 5] = (s.ox + fr * F) / AW; inst[o + 6] = s.oy / AH; inst[o + 7] = (s.ox + (fr + 1) * F) / AW; inst[o + 8] = (s.oy + F - cutPx) / AH;
    inst[o + 9] = flip; inst[o + 10] = lk.glow ? 0.35 + lk.glow * 0.4 : 0; inst[o + 11] = c.anim.flash || 0; inst[o + 12] = c.corpse ? 2 : c.dying ? 1 - c.fade : 1; // 2: a body (drawn grey and still)
    n++;
  };

  var VS = [
    "attribute vec2 aCorner;",
    "attribute vec3 iPos; attribute vec2 iPx; attribute vec4 iUV; attribute vec4 iMisc; attribute float iShear;",
    "uniform mat4 uVP; uniform vec2 uRes; uniform vec2 uZo;",
    "varying vec2 vUV; varying vec3 vW; varying vec2 vMisc; varying float vFog; varying float vA;",
    "uniform vec4 uFog; uniform vec4 uCam;",
    "void main() {",
    "  vec4 c = uVP * vec4(iPos, 1.0);",
    "  vec2 pix = floor((c.xy / c.w * 0.5 + 0.5) * uRes + 0.5);",          // snap the feet to the pixel grid
    "  float k = iPx.x / 32.0;",
    "  vec2 p = pix + vec2(floor((aCorner.x - 0.5) * iPx.x + 0.5 + aCorner.y * iShear), aCorner.y * iPx.y - (iPx.y < iPx.x ? 0.0 : k));",
    "  gl_Position = vec4(p / uRes * 2.0 - 1.0, c.z / c.w - uZo.x - uZo.y / (c.w * c.w), 1.0);",
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
      "  if (vA > 1.5) { float g = dot(col, vec3(0.3, 0.59, 0.11)); col = mix(col, vec3(g * 0.8 + 0.06, g * 0.8 + 0.06, g * 0.85 + 0.1), 0.8); }",
      "  gl_FragColor = vec4(col, 0.0);", // alpha 0: the outline pass leaves sprites alone (they carry their own)
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
    // pulled a little toward the eye so they stand in front of the ground they're on (a perspective depth
    // buffer squeezes far away, so there it's a fixed distance, not a fixed depth)
    if (cam.pov) gl.uniform2f(p.u.uZo, 0, 2 * 0.04 * 0.35); else gl.uniform2f(p.u.uZo, 0.004, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(p.u.uAtlas, 1);
    GL.attribs(ctx, quad, [[p.a.aCorner, 2]], 2, 0);
    GL.stream(ctx, holder, inst, n * IS);
    GL.attribs(ctx, holder.buf, [[p.a.iPos, 3], [p.a.iPx, 2], [p.a.iUV, 4], [p.a.iMisc, 4], [p.a.iShear, 1]], IS, 1);
    gl.depthMask(!!cam.pov); // sprites carry their own painted outline; keep them out of the outline pass (not in first person: one can fill half the screen, and the ink of what's behind mustn't show through it)
    ctx.drawInstanced(gl.TRIANGLES, 0, 6, n);
    gl.depthMask(true);
    gl.activeTexture(gl.TEXTURE0);
    if (R.perf) R.perf.draws++;
    n = 0;
  });
})();
