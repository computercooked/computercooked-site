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
const F = 32, NF = Object.keys(SB.Pixel.FR).length;
const opaque = (fr) => { let n = 0; for (let i = 3; i < fr.d.length; i += 4) if (fr.d[i]) n++; return n; };
const touchesEdge = (fr) => { for (let i = 0; i < F; i++) for (const [x, y] of [[i, 0], [0, i], [F - 1, i]]) if (fr.d[(y * F + x) * 4 + 3]) return true; return false; };

console.log("1. every tier paints a full sheet");
for (let tier = 0; tier <= 6; tier++) {
  const [c] = SB.Debug.spawnTier(tier, 1);
  for (const stage of [0, 3, 4]) {
    c.stage = stage;
    const sheet = SB.Pixel.paint(c);
    const sizes = sheet.frames.map(opaque);
    check(`tier ${tier} stage ${stage}: ${NF} frames, none empty`, sheet.frames.length === NF && sizes.every((n, i) => n > (i === SB.Pixel.FR.dot ? 12 : 40)), sizes.join(","));
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
if (gr) { const gs = SB.Pixel.paint(gr); check("grumps paint", gs.frames.every((f, i) => opaque(f) > (i === SB.Pixel.FR.dot ? 12 : 40))); }
// many random genomes: never throws, never empty
let bad = 0;
for (let i = 0; i < 200; i++) {
  const g = SB.Genome.random(SB.rng(1000 + i), { species: "smol" });
  for (const k of SB.Genome.EVO_GENES) g.genes[k] = SB.rng(i * 7 + k.length)();
  const c = SB.Game.spawnSmol(game, { genome: g, x: s.x, z: s.z, age: 600 });
  try { const p = SB.Pixel.paint(c); if (p.frames.some((f, i) => i !== SB.Pixel.FR.dot && opaque(f) < 30)) bad++; } catch (e) { bad++; console.log(e.stack); }
  c.alive = false; c.gone = true;
}
check("200 random genomes all paint", bad === 0, bad + " bad");

console.log("4. grown-up faces follow the mood (tribe on); early tiers keep the cute smile");
const calm = { hunger: 0.45, tired: 0.2, sleepy: 0.2, bored: 0.4, lonely: 0.3, pain: 0, fear: 0, cold: 0, hot: 0, sick: 0, love: 0, anger: 0, reward: 0 };
const faceFor = (extra, cur) => SB.Chem.face(Object.assign({}, calm, extra), cur);
check("at rest the face is neutral, not a smile", faceFor({}) === "neutral");
check("content, rewarded or in love: a smile", faceFor({ hunger: 0.1, bored: 0.1, lonely: 0.1 }) === "smile" && faceFor({ reward: 0.4 }) === "smile" && faceFor({ love: 0.8 }) === "smile");
check("bad moods: sad, worried, angry, tired, sick", faceFor({ hunger: 0.8 }) === "sad" && faceFor({ fear: 0.6 }) === "worried" && faceFor({ anger: 0.7 }) === "angry" && faceFor({ sleepy: 0.85 }) === "tired" && faceFor({ sick: 0.6 }) === "sick");
check("a need right on a line keeps the face it has", faceFor({ hunger: 0.68 }, "sad") === "sad" && faceFor({ hunger: 0.68 }, "neutral") === "neutral");
const [tr] = SB.Debug.spawnTier(4, 1);
tr.asleep = false; Object.assign(tr.chem, calm); SB.Creature.settleFace(tr);
check("a fresh tribe smol settles on neutral", tr.anim.face === "neutral", tr.anim.face);
// a mood that flips every 0.3 s for 10 s must not flip the face that often
let flips = 0, last = tr.anim.face;
for (let t = 0; t < 10; t += 0.05) { tr.chem.anger = Math.floor(t / 0.3) % 2 ? 0.8 : 0; SB.Creature.faceStep(tr, 0.05); if (tr.anim.face !== last) { flips++; last = tr.anim.face; } }
check("a flickering mood doesn't flicker the face", flips === 0, flips + " switches");
for (let t = 0; t < 5; t += 0.05) { tr.chem.anger = 0.8; SB.Creature.faceStep(tr, 0.05); }
check("a mood that lasts shows within a few seconds", tr.anim.face === "angry", tr.anim.face);
tr.asleep = true; SB.Creature.faceStep(tr, 0.05);
check("falling asleep shows at once", tr.anim.face === "sleep");
tr.asleep = false;
const idle = (c, f) => { c.anim.face = f; return SB.Pixel.paint(c).frames[FR.idle0]; };
const faces = ["neutral", "smile", "sad", "worried", "angry", "tired", "sick"].map(f => idle(tr, f));
let distinct = 0; for (let i = 0; i < faces.length; i++) for (let j = i + 1; j < faces.length; j++) if (!same(faces[i], faces[j])) distinct++;
check("every tribe face paints differently", distinct === faces.length * (faces.length - 1) / 2, distinct + " distinct pairs");
const diffPx = (a, b) => { let n = 0; for (let i = 3; i < a.d.length; i += 4) if (a.d[i - 3] !== b.d[i - 3] || a.d[i - 2] !== b.d[i - 2] || a.d[i - 1] !== b.d[i - 1]) n++; return n; };
check("faces differ by a few pixels, not a repaint", faces.slice(1).every(f => diffPx(f, faces[0]) <= 20), faces.slice(1).map(f => diffPx(f, faces[0])).join(","));
for (let tier = 0; tier <= 2; tier++) {
  const [e] = SB.Debug.spawnTier(tier, 1);
  check(`tier ${tier} keeps its cute look whatever its mood`, same(idle(e, "angry"), idle(e, "neutral")) && SB.Pixel.faceOf(e) === "");
}
// grown-ups stand taller than tribe babies, with a smaller head for their height
const [gu] = SB.Debug.spawnTier(3, 1);
gu.stage = 3; const adult = SB.Pixel.paint(gu); gu.stage = 0; const baby = SB.Pixel.paint(gu); gu.stage = 3;
check("grown-ups are taller, with a smaller head for their size", adult.bodyPx > baby.bodyPx && adult.head.r / adult.bodyPx < baby.head.r / baby.bodyPx, adult.bodyPx + " vs " + baby.bodyPx);
let cut = 0;
for (let i = 0; i < 120; i++) {
  const g = SB.Genome.forTier(SB.rng(77 + i), 3 + (i % 4));
  for (const k of ["body", "size", "head", "legLen"]) if (g.genes[k] != null) g.genes[k] = SB.rng(i * 3 + k.length)();
  const c = SB.Game.spawnSmol(game, { genome: g, x: s.x, z: s.z, age: 700 });
  for (const f of ["neutral", "angry"]) { c.anim.face = f; if (SB.Pixel.paint(c).frames.some(fr => touchesEdge(fr))) cut++; }
  c.alive = false; c.gone = true;
}
check("tall grown-ups still fit their frame", cut === 0, cut + " cut");

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
