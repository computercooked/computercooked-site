/* smol brains 2 — teaching experiments with the real modules: late taps vs poison, commands from praise,
   first words. Run: node games/smol-brains/tests/teach.test.js */
"use strict";
const load = require("./_load.js");
const ctx = load();
const SB = ctx.SB;
SB.Render = undefined;
const B = SB.Brain;

function input(b, drive, noun, heard) {
  const x = new Float32Array(b.nIn);
  for (let i = 0; i < SB.N_DRIVES; i++) x[i] = 0.1;
  x[SB.IN.DRIVE0 + SB.D[drive]] = 0.9; x[SB.IN.NOUN0 + SB.N[noun]] = 1; x[SB.IN.NEAR] = 1; x[SB.IN.BIAS] = 1;
  if (heard != null) x[SB.IN.HEARD0 + SB.V[heard]] = 1;
  return x;
}
function probe(b, drive, noun, heard) {
  const x = input(b, drive, noun, heard);
  const rng = SB.rng(7), counts = {}, N = 400;
  const mask = new Array(SB.N_VERBS).fill(false); for (let i = 0; i < 12; i++) mask[i] = true;
  for (let k = 0; k < N; k++) { b.x.set(x); const a = B.decide(b, rng, mask); counts[a] = (counts[a] || 0) + 1; }
  return (v) => (counts[SB.V[v]] || 0) / N;
}

let ok = true;
const game = SB.Game.create(44); game.tutorial.done = true; SB.Game.current = game;
// 1) poison: a smol eats a red shroom; the player taps 1 s after it finishes. 4 lessons.
{
  const c = SB.Game.spawnSmol(game, { age: 600 });
  const before = probe(c.brain, "hunger", "mushroom")("eat"), foodBefore = probe(c.brain, "hunger", "food")("eat");
  for (let i = 0; i < 4; i++) {
    c.lastDone = { x: input(c.brain, "hunger", "mushroom"), a: SB.V.eat, t: game.time }; c.action = null;
    game.time += 1.0;
    SB.Creature.tap(c, game);
  }
  const after = probe(c.brain, "hunger", "mushroom")("eat"), foodP = probe(c.brain, "hunger", "food")("eat");
  console.log(`poison: P(eat shroom) before ${before.toFixed(2)} after 4 late taps ${after.toFixed(2)}; real food ${foodBefore.toFixed(2)} -> ${foodP.toFixed(2)}`);
  if (!(after < before * 0.5 + 0.02)) { ok = false; console.log("  FAIL: taps didn't stop shroom eating"); }
  if (foodP < foodBefore * 0.6) { ok = false; console.log("  FAIL: the lesson spilled onto real food"); }
}
// 2) commands: say "come" while it sees the hand; tickle when it approaches.
{
  const c = SB.Game.spawnSmol(game, { age: 600 });
  const rng = SB.rng(3);
  const x = new Float32Array(c.brain.nIn); for (let k = 0; k < 12; k++) x[k] = 0.2; x[SB.IN.NOUN0 + SB.N.hand] = 1; x[SB.IN.HEARD0 + SB.V.approach] = 1; x[SB.IN.BIAS] = 1;
  let lessons = 0;
  const mask = new Array(SB.N_VERBS).fill(false); for (let i = 0; i < 12; i++) mask[i] = true;
  for (let trial = 0; trial < 40; trial++) {
    c.brain.x.set(x);
    const a = B.decide(c.brain, rng, mask);
    if (a === SB.V.approach) { c.lastDone = { x: new Float32Array(x), a, t: game.time }; c.action = null; SB.Creature.tickle(c, game); lessons++; }
  }
  const withWord = probe(c.brain, "lonely", "hand", "approach")("approach"), noWord = probe(c.brain, "lonely", "hand")("approach");
  console.log(`command "come": P(approach) with the word ${withWord.toFixed(2)} vs without ${noWord.toFixed(2)} after ${lessons} tickled obeys`);
  if (!(withWord > 0.8)) { ok = false; console.log("  FAIL: commands not learned"); }
}
// 3) first word: say "food" about an apple a smol is looking at, a few times
{
  const c = SB.Game.spawnSmol(game, { age: 30 });
  const apple = SB.World.add(game.world, game, "apple", c.x + 1, c.z, {});
  let n = 0;
  while (!SB.Creature.knows(c, "food") && n < 10) { SB.Creature.hear(c, "food", game, { about: { type: "item", id: apple.id, x: apple.x, z: apple.z }, aboutNoun: "food" }); n++; }
  console.log(`first word: knows "food" after ${n} tries`);
  if (!(SB.Creature.knows(c, "food") && n <= 4)) { ok = false; console.log("  FAIL: word not learned quickly"); }
  // and it spreads: a smol talking to a friend teaches it
  const d = SB.Game.spawnSmol(game, { age: 30, x: c.x + 0.6, z: c.z });
  d.attn = { noun: "food" };
  for (let i = 0; i < 6; i++) { c.action = { verb: SB.V.talk, phase: "go", t: 0, start: new Float32Array(12), x: new Float32Array(c.brain.nIn) }; }
  // cultural transmission via talkTo
  const before = d.vocab.food || 0;
  for (let i = 0; i < 4; i++) SB.Creature.hear(d, "food", game, {}); // overheard
  console.log(`word spread: friend's "food" ${before.toFixed(2)} -> ${(d.vocab.food || 0).toFixed(2)}`);
  if (!((d.vocab.food || 0) > before)) { ok = false; console.log("  FAIL: no spread"); }
}
// 4) teaching grows the next generation: lessons feed the "think" habit, which echoes into kids' brains
{
  const c = SB.Game.spawnSmol(game, { age: 600 });
  for (let i = 0; i < 20; i++) { c.lastDone = { x: input(c.brain, "hunger", "food"), a: SB.V.eat, t: game.time }; SB.Creature.tickle(c, game); }
  const echo = SB.Creature.echo(c);
  console.log(`taught smol's echo: cortex +${echo.cortex.toFixed(2)}, recall +${echo.recall.toFixed(2)}`);
  if (!(echo.cortex > 0.5)) { ok = false; console.log("  FAIL: lessons don't echo"); }
}
console.log(ok ? "all passed" : "FAILED");
process.exit(ok ? 0 : 1);
