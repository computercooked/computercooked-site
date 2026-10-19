// Teaching experiments with the real modules: late taps vs poison, commands from praise.
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = path.join(__dirname, "..", "play", "js");
const ctx = { console, Math, Date, JSON, Float32Array, Int8Array, Uint8Array, performance, btoa: (s) => Buffer.from(s, "binary").toString("base64"), atob: (s) => Buffer.from(s, "base64").toString("binary") };
ctx.window = ctx; vm.createContext(ctx);
for (const f of ["core", "genome", "brain", "chemistry", "world", "creature"]) vm.runInContext(fs.readFileSync(path.join(dir, f + ".js"), "utf8"), ctx);
ctx.document = { readyState: "loading", addEventListener() {} }; ctx.addEventListener = () => {};
vm.runInContext(fs.readFileSync(path.join(dir, "main.js"), "utf8"), ctx);
const SB = ctx.SB; SB.Render = { fx() {} };
const B = SB.Brain;

function probe(b, drive, noun, heard) {
  const x = new Float32Array(SB.N_IN);
  for (let i = 0; i < SB.N_DRIVES; i++) x[i] = 0.1;
  x[SB.IN.DRIVE0 + SB.D[drive]] = 0.9; x[SB.IN.NOUN0 + SB.N[noun]] = 1; x[SB.IN.NEAR] = 1; x[SB.IN.BIAS] = 1;
  if (heard != null) x[SB.IN.HEARD0 + SB.V[heard]] = 1;
  b.x.set(x);
  // estimate choice probability by sampling decide (traces don't matter here)
  const rng = SB.rng(7); let n = 0, N = 400, mask = null;
  const counts = {};
  for (let k = 0; k < N; k++) { b.x.set(x); const a = B.decide(b, rng, mask); counts[a] = (counts[a] || 0) + 1; }
  return (v) => (counts[SB.V[v]] || 0) / N;
}

let ok = true;
const game = SB.Game.create(44); game.tutorial.done = true;
// 1) poison: a smol eats a red shroom; player taps 1s after it finishes. 4 lessons.
{
  const c = SB.Game.spawnSmol(game, { age: 1300 });
  const twin = B.clone(c.brain);
  const before = probe(c.brain, "hunger", "mushroom")("eat");
  const foodBefore = probe(c.brain, "hunger", "food")("eat");
  for (let i = 0; i < 4; i++) {
    const x = new Float32Array(SB.N_IN); for (let k = 0; k < 12; k++) x[k] = 0.1; x[SB.D.hunger] = 0.9; x[SB.IN.NOUN0 + SB.N.mushroom] = 1; x[SB.IN.NEAR] = 1; x[SB.IN.BIAS] = 1;
    c.lastDone = { x, a: SB.V.eat, t: game.time }; c.action = null;
    game.time += 1.0;
    SB.Creature.tap(c, game);
  }
  const after = probe(c.brain, "hunger", "mushroom")("eat");
  const twinP = probe(twin, "hunger", "mushroom")("eat");
  console.log(`poison: P(eat shroom) before ${before.toFixed(2)} after 4 late taps ${after.toFixed(2)} (twin ${twinP.toFixed(2)})`);
  if (!(after < before * 0.5 + 0.02)) ok = false;
  const foodP = probe(c.brain, "hunger", "food")("eat");
  console.log(`  real food: before ${foodBefore.toFixed(2)} after ${foodP.toFixed(2)}`);
  if (foodP < foodBefore * 0.6) ok = false;
}
// 2) commands: say "come" while smol sees the hand; tickle when it approaches. Count lessons to 60%.
{
  const c = SB.Game.spawnSmol(game, { age: 1300 });
  const rng = SB.rng(3);
  const x = new Float32Array(SB.N_IN); for (let k = 0; k < 12; k++) x[k] = 0.2; x[SB.IN.NOUN0 + SB.N.hand] = 1; x[SB.IN.HEARD0 + SB.V.approach] = 1; x[SB.IN.BIAS] = 1;
  const x0 = new Float32Array(x); x0[SB.IN.HEARD0 + SB.V.approach] = 0;
  let lessons = 0, curve = [];
  for (let trial = 0; trial < 40; trial++) {
    c.brain.x.set(x);
    const a = B.decide(c.brain, rng, null);
    if (a === SB.V.approach) { c.lastDone = { x: new Float32Array(x), a, t: game.time }; c.action = null; SB.Creature.tickle(c, game); lessons++; }
    if (trial % 5 === 4) curve.push(probe(c.brain, "lonely", "hand", "approach")("approach").toFixed(2));
  }
  const withWord = probe(c.brain, "lonely", "hand", "approach")("approach");
  c.brain.x.set(x0);
  const noWord = probe(c.brain, "lonely", "hand")("approach");
  console.log(`command "come": P(approach) with word ${withWord.toFixed(2)} vs without ${noWord.toFixed(2)} after ${lessons} tickled obeys; curve ${curve.join(" ")}`);
  if (!(withWord > 0.8)) ok = false;
}
console.log(ok ? "all passed" : "FAILED");
process.exit(ok ? 0 : 1);
