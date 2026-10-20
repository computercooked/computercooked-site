// Pixel-art sprites: every kind of smol (and a grump) paints a full, outlined sheet that fits its frame.
// node games/smol-brains/tests/pixel.test.js
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const load = require("./_load.js");
const ctx = load();
const SB = ctx.SB;
// pixel.js registers a draw pass with the renderer; give it a stand-in (no WebGL in node)
SB.Render = { afterObjects() {}, camera: {}, gl() { return null; } };
SB.GL = {};
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "play", "js", "pixel.js"), "utf8"), ctx, { filename: "pixel.js" });

let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }

const game = SB.Game.newGame(3);
SB.Game.current = game;
const F = 32;
const opaque = (fr) => { let n = 0; for (let i = 3; i < fr.d.length; i += 4) if (fr.d[i]) n++; return n; };
const touchesEdge = (fr) => { for (let i = 0; i < F; i++) for (const [x, y] of [[i, 0], [0, i], [F - 1, i]]) if (fr.d[(y * F + x) * 4 + 3]) return true; return false; };

console.log("1. every tier paints a full sheet");
for (let tier = 0; tier <= 6; tier++) {
  const [c] = SB.Debug.spawnTier(tier, 1);
  for (const stage of [0, 3, 4]) {
    c.stage = stage;
    const sheet = SB.Pixel.paint(c);
    const sizes = sheet.frames.map(opaque);
    check(`tier ${tier} stage ${stage}: 12 frames, none empty`, sheet.frames.length === 12 && sizes.every(n => n > 40), sizes.join(","));
    check(`tier ${tier} stage ${stage}: fits the frame (nothing cut off at the sides or top)`, sheet.frames.every(f => !touchesEdge(f)));
    check(`tier ${tier} stage ${stage}: body height is sane`, sheet.bodyPx >= 6 && sheet.bodyPx <= 28, sheet.bodyPx);
  }
}

console.log("2. outlines, faces and frames differ");
const [s] = SB.Debug.spawnTier(3, 1);
const sh = SB.Pixel.paint(s), FR = SB.Pixel.FR;
const fr0 = sh.frames[FR.idle0];
let outlined = 0;
for (let i = 0; i < F * F; i++) if (fr0.tag[i] === 2) outlined++;
check("sprites have a 1px outline", outlined > 20, outlined + " outline px");
const same = (a, b) => a.d.every((v, i) => v === b.d[i]);
check("walk frames animate", !same(sh.frames[FR.walk0], sh.frames[FR.walk1]));
check("blink, sleep, eat, happy, sad and scared all look different from idle", ["blink", "sleep", "eat", "happy", "sad", "scared"].every(k => !same(sh.frames[FR[k]], fr0)));

console.log("3. grumps and variety");
const gr = SB.Game.spawnGrump ? SB.Game.spawnGrump(game, s.x + 3, s.z) : null;
if (gr) { const gs = SB.Pixel.paint(gr); check("grumps paint", gs.frames.every(f => opaque(f) > 40)); }
// many random genomes: never throws, never empty
let bad = 0;
for (let i = 0; i < 200; i++) {
  const g = SB.Genome.random(SB.rng(1000 + i), { species: "smol" });
  for (const k of SB.Genome.EVO_GENES) g.genes[k] = SB.rng(i * 7 + k.length)();
  const c = SB.Game.spawnSmol(game, { genome: g, x: s.x, z: s.z, age: 600 });
  try { const p = SB.Pixel.paint(c); if (p.frames.some(f => opaque(f) < 30)) bad++; } catch (e) { bad++; console.log(e.stack); }
  c.alive = false; c.gone = true;
}
check("200 random genomes all paint", bad === 0, bad + " bad");

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
