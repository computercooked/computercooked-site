// 3D smols (voxel.js): every tier, stage, grump and random genome builds a model that fits its grid, stands on
// its feet, carries its face on the front, is about as tall as its sprite, and is reused from the cache.
// node games/smol-brains/tests/voxel.test.js
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const load = require("./_load.js");
const ctx = load();
const SB = ctx.SB;
// no WebGL in node: stand-ins for the renderer hooks
SB.Render = { afterObjects() {}, camera: {}, gl() { return null; } };
SB.GL = {};
for (const f of ["pixel.js", "voxel.js"]) vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8"), ctx, { filename: f });
const VX = SB.Voxel, PX = SB.Pixel, FR = PX.FR;

let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }

const game = SB.Game.newGame(5);
SB.Game.current = game;
const G = VX.GRID;
function fits(m) { const b = m.bounds; return m.clipped === 0 && b[0] > G.x0 && b[1] < G.x1 - 1 && b[2] === 0 && b[3] < G.y1 - 1 && b[4] > G.z0 && b[5] < G.z1 - 1; }
function faceQuads(m) { let n = 0; for (const fi of VX.FACE_FRAMES) n += VX.buildFace(m, FR[fi], m.upright ? "neutral" : "").quads; return n; }

console.log("1. every tier and stage builds a model that fits");
for (let tier = 0; tier <= 6; tier++) {
  const [c] = SB.Debug.spawnTier(tier, 1);
  for (const stage of [0, 2, 3, 4]) {
    c.stage = stage; c._vxKey = null;
    const m = VX.build(c), sheet = PX.paint(c);
    check(`tier ${tier} stage ${stage}: fits its grid, feet on the ground`, fits(m), m.bounds.join(","));
    check(`tier ${tier} stage ${stage}: a real mesh (${m.quads} faces)`, m.quads > 60 && m.quads < 16000 && m.index.length === m.quads * 6 && m.verts.length === m.quads * 4 * VX.STRIDE);
    // the same size as its sprite: the painted body height (+ head gear) in pixels = voxels
    check(`tier ${tier} stage ${stage}: as tall as its sprite`, m.height >= sheet.bodyPx - 1 && m.height <= sheet.bodyPx + 12, m.height + " vs " + sheet.bodyPx);
    check(`tier ${tier} stage ${stage}: a face on the front for every face frame`, VX.FACE_FRAMES.every((fi) => VX.buildFace(m, FR[fi], m.upright ? "neutral" : "").quads >= 4));
  }
}

console.log("2. moods, gear and grumps");
const [t3] = SB.Debug.spawnTier(3, 1); t3.stage = 3;
const m3 = VX.build(t3);
const faces = ["neutral", "smile", "sad", "angry", "worried", "tired", "sick"].map((f) => VX.buildFace(m3, FR.idle0, f));
const sig = (f) => Array.from(f.verts).join(",");
check("a grown-up tribe face changes with the mood", new Set(faces.map(sig)).size >= 6);
check("blink, sleep, eat, happy, sad and scared faces differ from idle", ["blink", "sleep", "eat", "happy", "sad", "scared"].every((k) => sig(VX.buildFace(m3, FR[k], "neutral")) !== sig(VX.buildFace(m3, FR.idle0, "neutral"))));
const parts = (m) => { const s = new Set(); for (let i = 10; i < m.verts.length; i += VX.STRIDE) s.add(m.verts[i]); return s; };
const p3 = parts(m3), P = VX.PARTS;
check("tribe smols have two legs and two arms that can swing", [P.legA, P.legB, P.armL, P.armR, P.head].every((p) => p3.has(p)));
const [t6] = SB.Debug.spawnTier(6, 1); t6.stage = 3;
const m6 = VX.build(t6);
check("ascended smols get a floating halo that glows", parts(m6).has(P.float) && (() => { for (let i = 0; i < m6.verts.length; i += VX.STRIDE) if (m6.verts[i + 10] === P.float && m6.verts[i + 9] === 1) return true; return false; })());
const gr = SB.Game.spawnGrump(game, t3.x + 3, t3.z);
const mg = VX.build(gr);
check("grumps build, with a scowl", fits(mg) && VX.buildFace(mg, FR.idle0, "").quads > 6);
const [t1] = SB.Debug.spawnTier(1, 1); t1.stage = 3; t1.look.legs = 4;
check("four-legged critters have both leg pairs", (() => { const s = parts(VX.build(t1)); return s.has(P.legA) && s.has(P.legB); })());

console.log("3. 200 random genomes");
let bad = 0, worst = 0;
for (let i = 0; i < 200; i++) {
  const g = SB.Genome.random(SB.rng(3000 + i), { species: "smol" });
  for (const k of SB.Genome.EVO_GENES) g.genes[k] = SB.rng(i * 11 + k.length)();
  const c = SB.Game.spawnSmol(game, { genome: g, x: t3.x, z: t3.z, age: 600 });
  c.stage = i % 5;
  try {
    const m = VX.build(c);
    worst = Math.max(worst, m.quads);
    if (!fits(m) || m.quads < 40 || VX.buildFace(m, FR.idle0, PX.faceOf(c) || "").quads < 4) bad++;
  } catch (e) { bad++; console.log(e.stack); }
  c.alive = false; c.gone = true;
}
check("200 random genomes all build, fit and have faces", bad === 0, bad + " bad, most faces " + worst);

console.log("4. the cache");
const [a, b] = SB.Debug.spawnTier(4, 2);
const ma = VX.modelFor(a, true);
check("the same smol gets the same model back", VX.modelFor(a, true) === ma);
a.holding = 1; a.anim.face = "angry";
check("holding something or a new mood doesn't rebuild the body", VX.modelFor(a, true) === ma);
const f1 = VX.faceFor(ma, FR.idle0, "neutral", true);
check("faces are cached per frame and mood", VX.faceFor(ma, FR.idle0, "neutral", true) === f1 && VX.faceFor(ma, FR.idle0, "angry", true) !== f1);
check("a different smol gets its own model", VX.modelFor(b, true) !== ma || VX.lookKey(a) === VX.lookKey(b));
a.stage = 4; a._vxKey = null;
check("growing up rebuilds", VX.modelFor(a, true) !== ma);
check("without frame budget nothing new is built (the sprite is drawn instead)", (() => { const [n] = SB.Debug.spawnTier(2, 1); n.look = Object.assign({}, n.look, { hue: (n.look.hue + 77) % 360 }); return VX.modelFor(n) === null; })());
const before = VX.cacheSize();
for (let i = 0; i < 120; i++) { const [c] = SB.Debug.spawnTier(i % 7, 1); c.look = Object.assign({}, c.look, { hue: i * 3 }); VX.modelFor(c, true); VX.tick(); VX.tick(); VX.tick(); }
check("the cache stays bounded", VX.cacheSize() <= VX.MAX_CACHE, before + " -> " + VX.cacheSize());

console.log("5. first person: close smols fade, never pop");
check("solid beyond 0.45 units", VX.nearAlpha(0.45) === 1 && VX.nearAlpha(3) === 1);
check("fades smoothly inside it", VX.nearAlpha(0.3) > VX.nearAlpha(0.2) && VX.nearAlpha(0.2) > VX.nearAlpha(0.1) && VX.nearAlpha(0.2) > 0.1 && VX.nearAlpha(0.2) < 0.9);
check("gone only when the eye is inside it", VX.nearAlpha(0.02) === 0 && VX.bodyDist(0, 0.5, 0, 0, 0, 0, 1, 0.3) === 0);
check("distance is to the body, not its feet", Math.abs(VX.bodyDist(1, 0.5, 0, 0, 0, 0, 1, 0.3) - 0.7) < 1e-6);

console.log("6. hd smols (PX.hdify)");
for (const tier of [0, 3, 6]) {
  const [c] = SB.Debug.spawnTier(tier, 1); c.stage = 3;
  const plain = PX.paint(c), hd = PX.hdify(PX.paint(c), c);
  let shape = true, face = true, changed = 0, n = 0;
  for (let i = 0; i < plain.frames.length; i++) {
    const a = plain.frames[i], b = hd.frames[i];
    for (let p = 0; p < a.tag.length; p++) {
      if (!!a.d[p * 4 + 3] !== !!b.d[p * 4 + 3]) shape = false;
      if (!a.d[p * 4 + 3]) continue;
      const same = a.d[p * 4] === b.d[p * 4] && a.d[p * 4 + 1] === b.d[p * 4 + 1] && a.d[p * 4 + 2] === b.d[p * 4 + 2];
      if ((a.tag[p] === 5 || a.tag[p] === 9) && !same) face = false;
      n++; if (!same) changed++;
    }
  }
  check("tier " + tier + ": hd keeps the silhouette and the face, reshades the rest", shape && face && changed > n * 0.4, changed + "/" + n + " px");
}

console.log(failed ? "\n" + failed + " FAILED" : "\nall voxel tests passed");
process.exit(failed ? 1 : 0);
