/* smol brains 2 — saving, loading, offline progress, smol codes and the v1 -> v2 migration.
   Run: node games/smol-brains/tests/save.test.js */
"use strict";
const load = require("./_load.js");
const ctx = load();
const SB = ctx.SB;
SB.Render = undefined;

let failed = 0;
function check(name, ok, info) {
  console.log((ok ? "  ok   " : "  FAIL ") + name + (info ? "  (" + info + ")" : ""));
  if (!ok) failed++;
}

console.log("1. save and load");
const game = SB.Game.newGame(77); game.tutorial.done = true; SB.Game.current = game;
const cs = SB.Debug.spawnTier(4, 4);
SB.Ideas.discover(cs[0], "hut", game) || SB.Debug.ideas(cs[0], ["weave", "hut", "farm"]);
SB.Debug.build("campfire"); SB.Debug.build("totem");
SB.Creature.hear(cs[1], "food", game, {});
cs[1].vocab.food = 1.2;
for (let s = 0; s < 20 * 60; s++) SB.Game.step(game, SB.TICK);
const snap = SB.Save.snapshot(game);
const json = JSON.stringify(snap);
const g2 = SB.Save.revive(JSON.parse(json));
check("save size is sane", json.length < 600000, (json.length / 1024).toFixed(0) + " KB");
check("same island", g2.world.T.spawn.x === game.world.T.spawn.x && g2.seed === game.seed);
check("same smols", SB.Game.smols(g2).length === SB.Game.smols(game).length && SB.Game.smols(g2).every(c => game.creatures.some(o => o.id === c.id && o.name === c.name && o.tier === c.tier)));
check("ideas, words and culture survive", g2.creatures.some(c => SB.Ideas.count(c) > 0) && g2.creatures.some(c => c.vocab.food > 1) && Object.keys(g2.culture.words).length === Object.keys(game.culture.words).length);
check("buildings survive", g2.world.structures.length === game.world.structures.length);
check("brains survive", g2.creatures.every(c => c.brain && c.brain.hidden.length === (game.creatures.find(o => o.id === c.id) || { brain: c.brain }).brain.hidden.length));
for (let s = 0; s < 20 * 30; s++) SB.Game.step(g2, SB.TICK);
check("a loaded game keeps running", g2.creatures.every(c => isFinite(c.x) && isFinite(c.z)));
ctx.localStorage.setItem("smolbrains-save-v2", json);
check("Save.load reads it back", SB.Save.load() && SB.Save.load().seed === game.seed);

console.log("2. offline progress");
{
  check("budget: nothing for a minute, 1:1 up to 10 min, capped", SB.Game.offlineBudget(30) === 0 && SB.Game.offlineBudget(300) === 300 && SB.Game.offlineBudget(3600 * 20) <= 4500);
  const g3 = SB.Save.revive(JSON.parse(json));
  let done = null;
  const rt = SB.Game.runOffline;
  // run synchronously for the test (no setTimeout chunks)
  ctx.setTimeout = (fn) => fn();
  SB.Game.OFFLINE_WALL_MS = Infinity; // the ~8 s real-time cap is for slow phones: on a loaded test box it would cut the run short
  SB.Game.runOffline(g3, 600, null, (rep) => { done = rep; });
  check("the world keeps going while you're away", done && done.sim === 600 && g3.time > game.time + 590, JSON.stringify(done && { hatched: done.hatched, deaths: done.deaths, words: done.words, ideas: done.ideas }));
  check("…and nobody starves while you're away", done && SB.Game.smols(g3).every(c => c.chem.health >= 0.29));
}

console.log("3. smol codes");
{
  const c = cs[1];
  const code = SB.Save.exportSmol(c);
  const d = SB.Save.importSmol(code);
  check("a smol code round trips", d.name === c.name && d.genome.gen === c.genome.gen && Math.abs(d.vocab.food - c.vocab.food) < 0.02 && code.indexOf("SMOL2:") === 0, (code.length / 1024).toFixed(1) + " KB");
  let threw = false; try { SB.Save.importSmol("hello"); } catch (e) { threw = true; }
  check("junk is rejected", threw);
}

console.log("4. v1 save migration");
{
  // a hand-made v1 save: 1D world, v1 genome objects (38 genes, v1 noun numbers), v1 brain (45 inputs)
  const r = SB.rng(5);
  function v1genome() {
    const genes = {};
    SB.Genome.GENES.slice(0, 38).forEach(n => genes[n] = r());
    return { v: 1, species: "smol", gen: 3, genes, driveW: new Array(12).fill(1), instincts: [{ drive: SB.D.hunger, noun: 3, verb: SB.V.eat, s: 0.9 }, { drive: SB.D.tired, noun: 8, verb: SB.V.sleep, s: 0.8 }], mutated: [] };
  }
  function pack(n) { const b = new Uint8Array(n); for (let i = 0; i < n; i++) b[i] = (r() * 60) | 0; return { s: 0.02, d: SB.Genome.b64enc(b) }; }
  function v1brain(nHid) { return { v: 1, nHid, lr: 0.2, temp: 0.2, attnLr: 0.05, updates: 120, w1: pack(nHid * 45), b1: pack(nHid), w2: pack(12 * nHid), b2: pack(12), att: pack(16 * 13), cmd: pack(144), nv: pack(16 * 12) }; }
  const v1 = {
    v: 1, savedAt: Date.now() - 5000, seed: 987654321, time: 5000, speed: 2, nextId: 30,
    family: { 3: { id: 3, name: "Bobo", gen: 3, parents: [1, 2], born: 100, died: null, kids: [] } },
    stats: { hatched: 9, wordsTaught: 14, maxGen: 3, bestIQ: 111 }, achievements: { hatch: 1, word1: 2, gen2: 3 },
    tutorial: { step: 7, done: true }, log: [],
    world: { objects: [{ id: 20, kind: "egg", x: 2000, y: 400, data: { genome: v1genome(), parents: [3, 4], gen: 4, progress: 0.4 } }, { id: 21, kind: "apple", x: 2100, y: 400, data: {} }] },
    creatures: [
      { id: 3, species: "smol", name: "Bobo", gen: 3, parents: [1, 2], age: 3000, x: 2200, y: 470, genome: v1genome(), brain: v1brain(14), vocab: { food: 1.2, come: 1.0, ball: 0.4 }, stats: { eaten: 40, words: 2 }, chem: { hunger: 0.3 }, alive: true },
      { id: 4, species: "smol", name: "Kiki", gen: 2, parents: [], age: 900, x: 2300, y: 470, genome: v1genome(), brain: v1brain(9), vocab: { hug: 1.1 }, stats: {}, alive: true },
      { id: 9, species: "grump", name: "grump", gen: 1, age: 1300, x: 100, y: 470, genome: v1genome(), brain: v1brain(6), alive: true }
    ]
  };
  ctx.localStorage.setItem("smolbrains-save-v1", JSON.stringify(v1));
  const d1 = SB.Save.loadV1();
  const mg = SB.Save.migrateV1(d1);
  const names = mg.creatures.map(c => c.name).sort().join(",");
  check("v1 smols wake up on an island (grumps stay home)", names === "Bobo,Kiki", names);
  const bobo = mg.creatures.find(c => c.name === "Bobo");
  check("they keep their words", SB.Creature.knows(bobo, "food") && SB.Creature.knows(bobo, "come"));
  check("they keep their brains (v1 weights mapped)", bobo.brain.hidden[0] === 14 && bobo.brain.nOut === SB.N_VERBS && bobo.brain.updates === 120);
  check("their genomes are upgraded (bed instinct -> shelter)", bobo.genome.v === 2 && bobo.genome.instincts.some(i => i.noun === SB.N.shelter) && bobo.genome.genes.limbs != null);
  check("they're placed on dry land near the nest", mg.creatures.every(c => SB.World.walkable(mg.world, c.x, c.z) && SB.dist(c.x, c.z, mg.world.T.nest.x, mg.world.T.nest.z) < 8));
  check("the unhatched egg comes along", mg.world.items.some(o => o.kind === "egg" && o.data.genome && o.data.genome.v === 2));
  check("stats, family and achievements carry over", mg.stats.wordsTaught === 14 && mg.family[3] && mg.achievements.word1 && mg.achievements.migrate);
  check("ids don't collide", mg.nextId > 21);
  for (let s = 0; s < 20 * 60; s++) SB.Game.step(mg, SB.TICK);
  check("the migrated game runs", mg.creatures.every(c => isFinite(c.x)), SB.Game.smols(mg).length + " smols after a minute");
  check("the v1 save itself is left untouched", ctx.localStorage.getItem("smolbrains-save-v1") === JSON.stringify(v1));
  // a v1 smol code still imports
  const v1code = "SMOL1:" + Buffer.from(JSON.stringify({ name: "Old", gen: 2, genome: SB.Genome.b64enc([1, 0, 0, 2, 38].concat(new Array(38).fill(128), new Array(12).fill(128), [0])), brain: v1brain(8), vocab: { food: 1.1 } })).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const imp = SB.Save.importSmol(v1code);
  const old = SB.Game.spawnSmol(mg, { genome: imp.genome, name: imp.name, vocab: imp.vocab, brain: SB.Brain.deserialize(imp.brain, imp.genome, mg.rng) });
  check("v1 smol codes still import", old.name === "Old" && old.brain.nOut === SB.N_VERBS && SB.Creature.knows(old, "food"));
}

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
