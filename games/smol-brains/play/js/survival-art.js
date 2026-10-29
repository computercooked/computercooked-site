/* smol brains — survival-art.js (v4.4 "first tool")
   The looks for survival.js: vines on the rock, a picked-clean vine rock, the lean-to, the new items
   (vine, leaves, plank, firewood, sharp stone, rock-on-a-stick, stone pick, sapling), and the motion:
   trees and rocks shake when hit, a felled tree topples, piles show a few extra copies. Also 16×16 pixel
   icons for the new items, in the same outlined style as the hd item sprites, for the hotbar. */
(function () {
  "use strict";
  var SB = window.SB;
  var ME = SB.Meshes, R = SB.Render;
  var A = (SB.SurvArt = {});
  if (!ME) return;
  var C = ME.C || {};

  /* ---------------- meshes ---------------- */

  function slab(b, seed) { // the mossy rock the vines hang off
    b.color(0x847b7e).shadeY(0, 1.1, 0.4).push().translate(0, 0.42, -0.12).scale(0.55, 0.62, 0.3).blob(1, 0.3, seed).pop().shadeY(null);
    b.color(0x6e9e48, 1).push().translate(0, 0.98, -0.1).scale(0.5, 0.12, 0.3).blob(0, 0.3, seed + 1).pop();
  }
  function vines(seed) {
    var b = ME.builder().flex(1 / 1.4, 0, 0.5);
    slab(b, seed);
    b.sides(true);
    for (var i = 0; i < 7; i++) {
      var x = -0.42 + i * 0.14 + Math.sin(seed + i * 2.1) * 0.03, top = 1.0 - Math.abs(i - 3) * 0.06, len = 0.55 + ((Math.sin(seed * 3 + i * 1.7) + 1) * 0.5) * (top - 0.15);
      var z = 0.12 + Math.cos(i * 1.3 + seed) * 0.04;
      b.color(i % 2 ? 0x3f8a3a : 0x4f9e40, 1).push().translate(x, top - len, z).cyl(3, 0.018, 0.022, len, false).pop();
      for (var l = 0; l < 4; l++) {
        var ly = top - len * (0.15 + l * 0.24);
        b.color(l % 2 ? 0x5ab04a : 0x6cc04a, 1).push().translate(x + (l % 2 ? 0.03 : -0.03), ly, z + 0.02).rotZ(l % 2 ? -0.9 : 0.9).leaf(0.09, 0.13, 0.03).pop();
      }
    }
    // a few hanging curls at the bottom
    b.color(0x3f8a3a, 1).push().translate(-0.1, 0.12, 0.16).torus(0.06, 0.012, 7, 3).pop();
    return b.sides(false).finish();
  }
  function picked() {
    var b = ME.builder();
    slab(b, 3.1);
    b.color(0x5a7a3a, 1);
    for (var i = 0; i < 6; i++) b.push().translate(-0.36 + i * 0.14, 0.82, 0.1).cyl(3, 0.016, 0.02, 0.16, false).pop();
    return b.finish();
  }
  function leanto() {
    var b = ME.builder();
    // two forked posts and a ridge pole across them
    b.color(C.bark || 0x8a5a36);
    [-0.75, 0.75].forEach(function (x) {
      b.push().translate(x, 0, 0.25).cyl(5, 0.05, 0.04, 1.05).pop();
      b.push().translate(x, 0.95, 0.25).rotZ(x > 0 ? -0.5 : 0.5).cyl(4, 0.03, 0.02, 0.22).pop();
    });
    b.color(0x7a5232).push().translate(-0.9, 1.0, 0.25).rotZ(-1.5708).cyl(5, 0.045, 0.045, 1.8).pop();
    // sticks leaned from the ridge to the ground behind
    b.color(0x9a6a3c);
    for (var i = 0; i < 8; i++) {
      var x = -0.7 + i * 0.2;
      b.push().translate(x, 0.02, -0.75).rotX(0.86).cyl(4, 0.035, 0.03, 1.32).pop();
    }
    // leaf thatch, in rows, over the sticks
    b.sides(true).flex(1 / 1.2, 0.4, 0.25);
    for (var r = 0; r < 4; r++) for (var j = 0; j < 7; j++) {
      var t = 0.18 + r * 0.24, lx = -0.68 + j * 0.23 + (r % 2) * 0.1;
      b.color((r + j) % 3 ? 0x6cc04a : 0x5aa83e, 1).push().translate(lx, 0.06 + t * 0.95, -0.72 + t * 0.85).rotX(-0.75).rotY(Math.sin(j * 3.1 + r) * 0.3).leaf(0.3, 0.42, 0.06).pop();
    }
    b.sides(false).flex(0);
    // a vine lashing at each end, a bed of leaves inside, and a little stone ring in front
    b.color(0x4f9a3a).push().translate(-0.75, 0.98, 0.25).torus(0.07, 0.018, 8, 3).pop().push().translate(0.75, 0.98, 0.25).torus(0.07, 0.018, 8, 3).pop();
    b.color(0x9bcf5a, 1).push().translate(0, 0.03, -0.2).scale(0.6, 0.05, 0.38).blob(0, 0.3, 4).pop();
    b.color(0x9a948e);
    for (var s = 0; s < 6; s++) { var a = s / 6 * 6.283; b.push().translate(Math.cos(a) * 0.2, 0.04, 0.85 + Math.sin(a) * 0.2).scale(0.07, 0.05, 0.06).blob(0, 0.3, s).pop(); }
    return b.finish();
  }
  var ITEMS = {
    vine: function () { var b = ME.builder().color(0x4f9a3a); b.push().translate(0, 0.03, 0).torus(0.11, 0.022, 10, 4).pop().push().translate(0.02, 0.07, 0.01).torus(0.08, 0.02, 9, 4).pop(); b.sides(true).color(0x6cc04a); b.push().translate(0.11, 0.06, 0).rotZ(-1.2).leaf(0.07, 0.1).pop().push().translate(-0.1, 0.08, 0.03).rotZ(1.1).leaf(0.07, 0.1).pop(); return b.sides(false).finish(); },
    leaves: function () { var b = ME.builder().sides(true); for (var i = 0; i < 6; i++) b.color(i % 2 ? 0x6cc04a : 0x58a83e).push().translate(0, 0.03 + i * 0.012, 0).rotY(i * 1.05).rotX(-1.35).leaf(0.16, 0.26, 0.04).pop(); return b.sides(false).finish(); },
    plank: function () { var b = ME.builder().color(0xc9935a); b.push().translate(0, 0.0, 0).box(0.52, 0.05, 0.15).pop(); b.color(0xa8743e).push().translate(0, 0.05, 0).box(0.5, 0.004, 0.02).pop(); return b.finish(); },
    firewood: function () { var b = ME.builder(); [[-0.07, 0, 0.3], [0.07, 0, -0.2], [0, 0.07, 0.1]].forEach(function (p, i) { b.color(i % 2 ? 0x9a6a3c : 0x8a5a33).push().translate(p[0], p[1] + 0.04, 0).rotY(p[2]).rotZ(1.5708).translate(0, -0.18, 0).cyl(3, 0.05, 0.05, 0.36).pop(); }); return b.finish(); },
    sharpstone: function () { var b = ME.builder().color(0x8a8694).shadeY(0, 0.14, 0.3); b.push().translate(0, 0.06, 0).scale(0.13, 0.06, 0.09).blob(0, 0.25, 4).pop().shadeY(null); b.color(0xd8d4e0).push().translate(0.1, 0.06, 0).rotZ(-1.5708).cone(3, 0.05, 0.12).pop(); return b.finish(); },
    primtool: function () { var b = ME.builder(); b.color(0x8a5a36).push().translate(-0.24, 0.04, 0).rotZ(-1.5).cyl(4, 0.028, 0.024, 0.5).pop(); b.color(0x9a96a0).push().translate(0.25, 0.06, 0).scale(0.1, 0.08, 0.09).blob(0, 0.3, 5).pop(); b.color(0x4f9a3a).push().translate(0.18, 0.05, 0).rotZ(1.5708).torus(0.045, 0.014, 8, 3).pop(); return b.finish(); },
    stonepick: function () { var b = ME.builder(); b.color(0x8a5a36).push().translate(-0.24, 0.04, 0).rotZ(-1.5).cyl(4, 0.026, 0.022, 0.52).pop(); b.color(0x8a8694); b.push().translate(0.24, 0.05, 0).rotX(1.5708).cone(4, 0.05, 0.2).pop().push().translate(0.24, 0.05, 0).rotX(-1.5708).cone(4, 0.05, 0.2).pop(); b.color(0x4f9a3a).push().translate(0.24, 0.05, 0).rotZ(1.5708).torus(0.05, 0.014, 8, 3).pop(); return b.finish(); },
    sapling: function () { var b = ME.builder(); b.color(0x6a4a2a).cyl(4, 0.025, 0.018, 0.24); b.sides(true).color(0x6cc04a); for (var i = 0; i < 3; i++) b.push().translate(0, 0.16 + i * 0.03, 0).rotY(i * 2.1).rotX(-0.7).leaf(0.1, 0.16, 0.03).pop(); b.color(0x8a6a48).push().translate(0, 0.0, 0).scale(0.08, 0.03, 0.08).sphere(0).pop(); return b.sides(false).finish(); }
  };
  ME.NODE_BUILDERS.vines = vines;
  ME.STRUCT_BUILDERS.leanto = leanto;
  var itemMesh0 = ME.itemMesh;
  ME.itemMesh = function (kind) { return ITEMS[kind] ? ITEMS[kind]() : itemMesh0(kind); };
  var extra0 = ME.extraMeshes;
  ME.extraMeshes = function () { var o = extra0 ? extra0() : {}; o["n:picked"] = picked(); return o; };
  A.ITEM_MESHES = ITEMS;

  /* ---------------- motion: shakes, a tree coming down, piles ---------------- */
  var tm = new Float32Array(12);
  // T * tilt(about the horizontal axis perpendicular to dir, by th) * rotY(rot) * scale
  function mat(out, x, y, z, rot, s, dir, th) {
    var ka = Math.cos(dir), kc = -Math.sin(dir), c = Math.cos(th), sn = Math.sin(th), v = 1 - c;
    // rodrigues with k = (ka, 0, kc)
    var r00 = c + ka * ka * v, r01 = -kc * sn, r02 = ka * kc * v;
    var r10 = kc * sn, r11 = c, r12 = -ka * sn;
    var r20 = kc * ka * v, r21 = ka * sn, r22 = c + kc * kc * v;
    var cy = Math.cos(rot) * s, sy = Math.sin(rot) * s;
    // rotY*scale = [[cy,0,sy],[0,s,0],[-sy,0,cy]]
    out[0] = r00 * cy - r02 * sy; out[1] = r01 * s; out[2] = r00 * sy + r02 * cy; out[3] = x;
    out[4] = r10 * cy - r12 * sy; out[5] = r11 * s; out[6] = r10 * sy + r12 * cy; out[7] = y;
    out[8] = r20 * cy - r22 * sy; out[9] = r21 * s; out[10] = r20 * sy + r22 * cy; out[11] = z;
    return out;
  }
  A.mat = mat;
  function keyOf(n) {
    if (n.state === "stump") return "n:stump";
    if (n.state === "burnt") return "n:burnt";
    if (n.state === "picked") return "n:picked";
    return "n:" + n.kind + ":" + (n.id % 3);
  }
  function draw(game) {
    var Sv = SB.Surv, w = game && game.world;
    if (!Sv || !w || !R.hasMesh) return;
    var T = w.T;
    for (var i = 0; i < Sv.anims.length; i++) {
      var a = Sv.anims[i], n = a.n, k = Math.min(1, a.t / a.dur);
      if (a.kind === "shake") {
        if (a.n.state === "gone") continue;
        var s = (n.s || 1) * (n.grow == null ? 1 : 0.3 + 0.7 * n.grow) * Sv.shrinkOf(n), amp = 0.07 * (1 - k) * Math.sin(a.t * 55);
        var y = SB.WorldGen.heightAt(T, n.x, n.z) - 0.04;
        R.inst(keyOf(n), mat(tm, n.x, y, n.z, n.rot, s, (n.id % 7) * 0.9, amp), null, null);
        if (n.block && n.state === "stump") R.inst("i:log", mat(tm, n.x, y + 0.25 * s, n.z, n.rot + 0.6, 1.2, 0, amp * 2), null, null);
      } else if (a.kind === "fall") {
        // falls slowly, then fast (gravity), bounces a touch on landing, then sinks away
        var t = a.t, land = 1.05, th, sink = 0, sc = a.s;
        if (t < land) th = 1.48 * Math.pow(t / land, 2.2);
        else { var u = t - land; th = 1.48 - Math.abs(Math.sin(u * 9)) * 0.07 * Math.max(0, 1 - u * 3); sink = Math.max(0, u - 0.25) * 0.9; sc = a.s * (1 - Math.max(0, u - 0.3) * 0.9); }
        if (sc > 0.05) R.inst(a.key, mat(tm, a.x, a.y - sink, a.z, a.rot, sc, a.dir, th), null, null);
        if (!a.thud && t >= land) {
          a.thud = 1;
          if (SB.FX && SB.FX.burst) for (var q = 0; q < 4; q++) { var d = 0.5 + q * 0.6 * a.s; SB.FX.burst("dust", a.x + Math.sin(a.dir) * d, a.y + 0.2, a.z + Math.cos(a.dir) * d, 4, { r: 0.4 }); }
          if (SB.FX && SB.FX.burst) SB.FX.burst("leaves", a.x + Math.sin(a.dir) * 1.6 * a.s, a.y + 0.5, a.z + Math.cos(a.dir) * 1.6 * a.s, 10);
        }
      }
    }
    // piles: a few more of the thing beside it, so a pile reads as a pile
    var cam = R.camera, cx = cam.pov ? cam.pov.x : cam.x, cz = cam.pov ? cam.pov.z : cam.z, its = w.items, reach = cam.pov ? 30 : 60;
    for (var j = 0; j < its.length; j++) {
      var o = its[j];
      if (!o.data || !(o.data.n > 1) || o.heldBy != null || Math.abs(o.x - cx) > reach || Math.abs(o.z - cz) > reach) continue;
      var extra = Math.min(3, o.data.n - 1);
      for (var e = 0; e < extra; e++) {
        var ang = o.rot + e * 2.1 + 0.6, rr = 0.13 + e * 0.04, px = o.x + Math.sin(ang) * rr, pz = o.z + Math.cos(ang) * rr, py = (o.onGround === false ? o.y : SB.WorldGen.heightAt(T, px, pz)) + (e === 2 ? 0.08 : 0);
        if (R.hd && SB.HD && SB.HD.item && SB.HD.item(o, px, py, pz, 1.15, null, 0)) continue;
        R.instTRS("i:" + o.kind, px, py, pz, ang * 1.7, 1.15, null, [0, 0, 0, 1]);
      }
    }
  }
  if (R && R.addHook) R.addHook(function (game) { try { draw(game); } catch (e) { if (!A._warned) { A._warned = 1; if (window.console) console.warn("[survival-art]", e); } } });

  /* ---------------- 16×16 pixel icons for the new items (hotbar, bag) ---------------- */
  // same palette letters as icons.js; drawn with a dark outline. the hd sprite sheet covers the older items
  var PAL = { k: "#2a1f33", w: "#ffffff", g: "#7bd860", G: "#3f9a4a", h: "#2f7a36", n: "#b97d4b", N: "#6e4528", m: "#8f5f33", e: "#b4b2c4", E: "#6f6c82", d: "#55526a", c: "#e6e2f0", y: "#ffd84a", o: "#ff9f43", r: "#ff4f5e", s: "#d9a46a", S: "#a8743e", b: "#6fc8ff", l: "#c5ff49", p: "#ff9cc8", W: "#d9d4e6", v: "#9a6a3c" };
  A.ART = {
    vine: ["................", "......GGG.......", "....GGgggG......", "...Gg....gG.....", "..Gg..ggg..G....", "..G..G...g.G....", "..G.G..g..gG....", "..G.G.ggG.G.....", "..G..G...GG..gg.", "...G..GGG...ggG.", "....GG....GgG...", "......GGGGgG....", "........gG......", ".......gg.......", "......gG........", "................"],
    leaves: ["................", ".........gg.....", ".......ggggG....", "......gggggG....", "..gg..ggg.GG....", ".ggggg.gGGG.....", ".gggggG.G.......", "..ggGGG.G..gg...", "....G...G.gggg..", "........GgggggG.", "...ggg..GgggGG..", "..ggggg.G.GG....", "..gggGGG........", "...GGG..........", "................", "................"],
    plank: ["................", "................", "................", "...........ssss.", "........sssssSS.", ".....sssssSSsSS.", "..sssssSSsssSS..", ".ssSSssssssSS...", ".sssssssSSSS....", ".SSssSSSS.......", ".SSSSS..........", "................", "................", "................", "................", "................"],
    firewood: ["................", "................", "......nnn.......", ".....nsssn......", ".....nssSn.nnn..", "......nnNNnsssn.", "...nnn..NNnsSSn.", "..nsssn.N.nnNN..", "..nssSnN...NNN..", "...nnNNN........", "....NNN.........", "................", "................", "................", "................", "................"],
    sharpstone: ["................", "................", "................", "............c...", "..........ccW...", "........eecWe...", "......eeeeWee...", "....eeeeeeeeE...", "...eWeeeeeeEE...", "..eeeeeeeeEEE...", "..eeeeeeEEEE....", "...EEEEEEE......", "................", "................", "................", "................"],
    primtool: ["................", "..........eee...", ".........eeeeE..", "........eWeeeEE.", "........eeeeEEE.", ".........GgEEE..", "........nGgG....", ".......nNGG.....", "......nN........", ".....nN.........", "....nN..........", "...nN...........", "..nN............", ".nN.............", ".N..............", "................"],
    stonepick: ["................", "...c.......c....", "...eeE...eeE....", "....eeEeeeE.....", ".....eEgGeE.....", "......nGgN......", ".....nN.........", "....nN..........", "...nN...........", "..nN............", ".nN.............", "nN..............", "N...............", "................", "................", "................"],
    sapling: ["................", "................", "......gg........", ".....gggg..gg...", "....gggGG.gggg..", ".....GG.G.gGG...", ".......GnG......", "...gg...n.......", "..gggg..n.......", "...GGG.Gn.......", ".......Nn.......", ".......Nn.......", ".....SSSSSS.....", "....SSSSSSSS....", "................", "................"],
    plans: ["................", "..WWWWWWWWWWW...", "..WccccccccW....", "..Wc..n...cW....", "..Wc.nNn..cW....", "..WcnN.Nn.cW....", "..WcN...NncW....", "..Wcn...ncWl....", "..Wcn.y.nlll....", "..Wcnnnnnllll...", "..Wccccccllll...", "..WWWWWWWlll....", "........ll......", "................", "................", "................"],
    paws: ["................", "................", "....s..s..s.....", "...ss.ss.ss.....", "...ss.ss.ss.s...", "....s..s..sss...", "...sssssssss....", "..sssssssssS....", "..sssssssssS....", "..sssssssssS....", "...sssssssS.....", "....ssssSS......", "................", "................", "................", "................"]
  };
  var cache = {};
  function outline(ctx, S) {
    var img = ctx.getImageData(0, 0, S, S), d = img.data, a = new Uint8Array(S * S), i, x, y;
    for (i = 0; i < S * S; i++) a[i] = d[i * 4 + 3] > 100 ? 1 : 0;
    for (y = 0; y < S; y++) for (x = 0; x < S; x++) {
      i = y * S + x;
      if (a[i]) continue;
      if ((x > 0 && a[i - 1]) || (x < S - 1 && a[i + 1]) || (y > 0 && a[i - S]) || (y < S - 1 && a[i + S])) { d[i * 4] = 26; d[i * 4 + 1] = 18; d[i * 4 + 2] = 34; d[i * 4 + 3] = 255; }
    }
    ctx.putImageData(img, 0, 0);
  }
  // a data url (18×18: 16 + outline) for one of the new items, or null
  A.icon = function (name) {
    if (name in cache) return cache[name];
    var rows = A.ART[name];
    if (!rows || typeof document === "undefined" || !document.createElement) return (cache[name] = null);
    try {
      var cv = document.createElement("canvas"); cv.width = cv.height = 18;
      var ctx = cv.getContext("2d", { willReadFrequently: true });
      rows.forEach(function (r, y) { for (var x = 0; x < r.length; x++) { var col = PAL[r[x]]; if (col) { ctx.fillStyle = col; ctx.fillRect(x + 1, y + 1, 1, 1); } } });
      outline(ctx, 18);
      return (cache[name] = cv.toDataURL());
    } catch (e) { return (cache[name] = null); }
  };
})();
