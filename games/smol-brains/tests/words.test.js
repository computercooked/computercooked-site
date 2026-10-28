// The word book: teaching by showing, no spam, calls, and shared words making the tribe smarter.
// node games/smol-brains/tests/words.test.js
"use strict";
const load = require("./_load.js");
const ctx = load();
const SB = ctx.SB;

let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }

const game = SB.Game.newGame(7);
SB.Game.current = game;
const W = game.world, sp = W.T.spawn;
// a fresh little tribe of tool-users, awake and nearby
game.creatures.slice().forEach(c => { c.alive = false; c.gone = true; });
game.creatures = [];
const smols = [0, 1, 2].map(i => { const [c] = SB.Debug.spawnTier(2, 1); c.x = sp.x + i; c.z = sp.z; c.asleep = false; c.vocab = {}; return c; });
const apple = SB.World.add(W, game, "apple", sp.x + 1, sp.z + 1.5, {});
const hitApple = { type: "item", ref: apple };

console.log("1. spamming does nothing");
for (let i = 0; i < 25; i++) SB.Words.teach(game, "food", hitApple);
const afterSpam = smols.map(c => c.vocab.food || 0);
check("25 instant taps = one lesson each, nobody knows it yet", afterSpam.every(v => v > 0 && v < 1), afterSpam.map(v => v.toFixed(2)).join(","));

console.log("2. spaced lessons work");
let lessons = 1;
while (smols.some(c => (c.vocab.food || 0) < 1) && lessons < 10) { game.time += SB.Words.COOLDOWN + 0.1; SB.Words.teach(game, "food", hitApple); lessons++; }
check("all three learn “food” in a handful of slow lessons", smols.every(c => c.vocab.food >= 1) && lessons <= 5, lessons + " lessons");

console.log("3. showing the wrong thing teaches nothing");
const stick = SB.World.add(W, game, "stick", sp.x, sp.z + 1, {});
game.time += 20;
const r = SB.Words.teach(game, "rock", { type: "item", ref: stick });
check("“rock” on a stick is refused", !r.ok && r.wrong && smols.every(c => !c.vocab.rock), r.msg);

console.log("4. words unlock with evolution");
const locked = SB.Words.teach(game, "build", { type: "creature", ref: smols[0] });
check("builders' words are locked for tool-users", !locked.ok && /ready/.test(locked.msg), locked.msg);

console.log("5. a feeling is taught when the smol feels it");
const s0 = smols[0];
SB.Chem.apply(s0.chem, { hunger: -1, cold: -1, bored: -1, lonely: -1, sleepy: -1, tired: -1, fear: -1 });
s0.chem.hunger = 0.1;
game.time += 20;
const notHungry = SB.Words.teach(game, "hungry", { type: "creature", ref: s0 });
s0.chem.hunger = 0.9; game.time += 20;
const hungry = SB.Words.teach(game, "hungry", { type: "creature", ref: s0 });
check("“hungry” only lands on a hungry smol", !notHungry.ok && hungry.ok && (s0.vocab.hungry || 0) > 0.2, (s0.vocab.hungry || 0).toFixed(2));
s0.chem.hunger = 0.2;

console.log("6. calls: a known word gets a response");
smols.forEach(c => { c.vocab.come = 1.2; c.action = null; c.plan = null; c.asleep = false; });
const tx = sp.x + 9, tz = sp.z + 3;
const d0 = smols.map(c => SB.dist(c.x, c.z, tx, tz));
const heard = SB.Words.call(game, "come", tx, tz);
const d1 = d0.slice();
for (let t = 0; t < 12 / 0.1; t++) { game.time += 0.1; smols.forEach((c, i) => { SB.Creature.tick(c, 0.1, game); d1[i] = Math.min(d1[i], SB.dist(c.x, c.z, tx, tz)); }); }
const closer = d1.filter((d, i) => d < d0[i] - 2).length;
check("smols who know “come” come (closest they got)", heard === 3 && closer >= 2, `heard ${heard}, ${closer}/3 closer: ${d0.map(d => d.toFixed(1))} -> ${d1.map(d => d.toFixed(1))}`);

console.log("7. shared words make the tribe smarter");
const iq0 = SB.Creature.iq(smols[1], true);
SB.Words.update(game);
const before = game.culture.shared;
["water", "smol", "egg", "play", "hug", "sleep"].forEach(w => smols.forEach(c => { c.vocab[w] = 1; }));
SB.Words.update(game);
const iq1 = SB.Creature.iq(smols[1], true);
check("shared words counted", game.culture.shared >= before + 6, before + " -> " + game.culture.shared);
check("smarts bonus and iq go up", SB.Words.smarts(game) >= 0.2 && iq1 > iq0, `+${Math.round(SB.Words.smarts(game) * 100)}%, iq ${iq0} -> ${iq1}`);

console.log("8. old saves: vague words get their new names");
const saved = SB.Save.snapshot(game);
if (saved) {
  const g2 = JSON.parse(JSON.stringify(saved));
  const cc = (g2.creatures || []).find(x => x.species === "smol");
  if (cc && cc.vocab) { cc.vocab.plant = 1.1; cc.vocab.stuff = 0.5; }
  const back = SB.Save.revive(g2);
  const b = back.creatures.find(x => x.id === cc.id);
  check("plant → tree, stuff → goods", b && b.vocab.tree >= 1.1 && b.vocab.goods === 0.5 && b.vocab.plant == null, JSON.stringify(b && { tree: b.vocab.tree, goods: b.vocab.goods }));
} else console.log("  (no serialize hook, skipped)");

console.log("9. faster: a friend who knows it helps, and a new word gets passed on");
{
  const g2 = SB.Game.newGame(17); SB.Game.current = g2;
  const W2 = g2.world, p2 = W2.T.spawn;
  g2.creatures.slice().forEach(c => { c.alive = false; c.gone = true; }); g2.creatures = [];
  const mk = (dx, dz) => { const [c] = SB.Debug.spawnTier(2, 1); c.x = p2.x + dx; c.z = p2.z + dz; c.asleep = false; c.vocab = {}; c.genome.genes.attnLearn = 0.5; c.genome.genes.social = 0.2; return c; };
  const lone = mk(0, 0);
  const ap = SB.World.add(W2, g2, "apple", p2.x + 0.5, p2.z + 0.5, {});
  const r1 = SB.Words.teach(g2, "water", null); // a no-op, so nobody's stamped
  g2.time += 10; const ra = SB.Words.teach(g2, "food", { type: "item", ref: ap });
  const alone = lone.vocab.food || 0;
  const pal = mk(1, 0); pal.vocab.food = 1.2;
  lone.vocab.food = 0; g2.time += 10;
  const rb = SB.Words.teach(g2, "food", { type: "item", ref: ap });
  const withPal = lone.vocab.food || 0;
  check("a friend who knows it makes the lesson stick better", withPal > alone * 1.3, alone.toFixed(2) + " → " + withPal.toFixed(2));
  check("the lesson reports how far it got", ra.gains && ra.gains.length === 1 && ra.gains[0].d > 0.2 && rb.gains[0].friend, JSON.stringify(rb.gains && rb.gains.map(x => +x.d.toFixed(2))));
  check("the cooldown is 4 s", SB.Words.COOLDOWN === 4);
  // a smol that learns a word says it to whoever's near
  const ears = [mk(2, 1), mk(-1, 2)];
  SB.World.rebuildGrid && SB.World.rebuildGrid(W2, g2);
  SB.Game.step(g2, SB.TICK);
  lone.vocab.food = 0.99; ears.forEach(c => { c.asleep = false; c.vocab = {}; });
  SB.Creature.learnWord(lone, "food", 0.3, g2);
  check("those nearby pick some of it up", ears.every(c => (c.vocab.food || 0) >= 0.15), ears.map(c => (c.vocab.food || 0).toFixed(2)).join(","));
  void r1;
}

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
