// Headless whole-game simulation: loads every non-DOM module and runs the island for a while.
// node games/smol-brains/tests/sim.test.js [simMinutes] [seed] [afk]
// Reports deaths, words, ideas, tiers, species, buildings, perf, and NaN/bounds checks.
"use strict";
const load = require("./_load.js");
const ctx = load();
const SB = ctx.SB;
SB.Render = undefined;
const minutes = +(process.argv[2] || 30);
const seed = +(process.argv[3] || 12345);
const player = process.argv[4] !== "afk";
const t0 = performance.now();
const game = SB.Game.newGame(seed);
console.log("worldgen", game.world.T.genMs + "ms", "nodes", game.world.nodes.length);
game.tutorial.done = true;
const events = {};
for (const ev of ["hatch", "death", "learnWord", "egg", "eat", "obey", "sick", "cured", "grumpArrive", "achievement", "eureka", "craft", "built", "newSpecies", "tierUp", "teach", "ideaLost", "lightning", "wildfire", "pray", "village", "tribe"]) {
  SB.bus.on(ev, (d) => {
    events[ev] = (events[ev] || 0) + 1;
    if (ev === "death") console.log(`  t=${(game.time / 60).toFixed(1)}m death: ${d.c.name} (${d.cause}) age ${(d.c.age / 60).toFixed(1)}m`);
    if (ev === "eureka" || ev === "newSpecies" || ev === "built" || ev === "tierUp" || ev === "village") console.log(`  t=${(game.time / 60).toFixed(1)}m ${ev}: ${d.c ? d.c.name : ""} ${d.id || (d.clade && d.clade.name) || (d.st && d.st.kind) || (d.village && d.village.name) || d.tier || ""}`);
  });
}
// hatch the starter egg and add a few smols
const egg = game.world.items.find((o) => o.kind === "egg");
egg.data.progress = 1;
const sp = game.world.T.spawn;
for (let i = 0; i < 3; i++) SB.Game.spawnSmol(game, { x: sp.x - 2 + i * 2, z: sp.z + 2, age: i < 1 ? 0 : 560 });
const steps = Math.round((minutes * 60) / SB.TICK);
let bad = 0;
const ts = performance.now();
for (let s = 0; s < steps; s++) {
  SB.Game.step(game, SB.TICK);
  if (player && s % 400 === 0) {
    for (const c of SB.Game.smols(game)) {
      const near = SB.World.itemsNear(game.world, c.x, c.z, 6).filter((o) => !o.heldBy);
      if (near.length) {
        const o = near[0];
        game.hand.x = o.x; game.hand.z = o.z; game.hand.y = o.y + 1; game.hand.visible = true;
        const w = SB.NOUN_WORDS[SB.N[o.noun]];
        if (w) SB.Creature.hear(c, w, game, { about: { type: "item", id: o.id, x: o.x, z: o.z }, aboutNoun: o.noun });
      }
      if (c.action && c.action.verb === SB.V.eat) SB.Creature.tickle(c, game);
      if (c.chem.hunger > 0.75) { const a = SB.World.add(game.world, game, "apple", c.x + 0.5, c.z, {}); }
    }
    game.hand.visible = false;
  }
  if (s % 200 === 0) for (const c of game.creatures) {
    if (!isFinite(c.x) || !isFinite(c.z) || !isFinite(c.y)) { bad++; console.log("NaN pos", c.name); }
    for (const k in c.chem) if (!isFinite(c.chem[k])) { bad++; console.log("NaN chem", c.name, k); }
    if (c.x < 0 || c.z < 0 || c.x > 256 || c.z > 256) { bad++; console.log("out of bounds", c.name, c.x, c.z); }
  }
}
const ms = performance.now() - ts;
const smols = SB.Game.smols(game);
console.log(`\nsimulated ${minutes} min in ${(ms / 1000).toFixed(1)}s (${(ms / steps).toFixed(3)} ms/step), ${smols.length} smols alive, ${game.world.items.length} items, ${game.world.structures.length} structures`);
console.log("events", JSON.stringify(events));
console.log("stats", JSON.stringify(game.stats));
console.log("ideas found", Object.keys(game.culture.found).join(", ") || "-");
console.log("species", Object.values(game.clades).map((c) => c.name + "(" + c.alive + ")").join(", "));
for (const c of smols) console.log(`  ${c.name} gen${c.gen} ${SB.TIERS[c.tier].name} age ${(c.age / 60).toFixed(1)}m iq ${c.iq} words ${SB.Creature.knownCount(c)} ideas ${SB.Ideas.count(c)} neurons ${SB.Brain.size(c.brain)} limbs ${c.genome.genes.limbs.toFixed(2)} arms ${c.genome.genes.arms.toFixed(2)} hunger ${c.chem.hunger.toFixed(2)} health ${c.chem.health.toFixed(2)}`);
// save round trip
const snap = SB.Save.snapshot(game);
const json = JSON.stringify(snap);
const g2 = SB.Save.revive(JSON.parse(json));
console.log("save size", (json.length / 1024).toFixed(0) + "KB", "revived smols", SB.Game.smols(g2).length, "items", g2.world.items.length);
for (let s = 0; s < 200; s++) SB.Game.step(g2, SB.TICK);
console.log(bad ? "FAIL: " + bad + " bad values" : "OK", "total", ((performance.now() - t0) / 1000).toFixed(1) + "s");
process.exit(bad ? 1 : 0);
