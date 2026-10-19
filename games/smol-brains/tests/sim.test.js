// Headless whole-game simulation: loads every non-DOM module and runs the world for a while.
// node games/smol-brains/tests/sim.test.js [simMinutes] [seed]
// Reports: deaths and causes, words learned, IQ, eggs, grump nights, perf, and NaN/bounds checks.
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = path.join(__dirname, "..", "play", "js");
const ctx = {
  console, Math, Date, JSON, Object, Array, String, Number, Boolean, Error, isNaN, isFinite, parseInt, parseFloat,
  Float32Array, Float64Array, Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, ArrayBuffer, DataView,
  TextEncoder, TextDecoder, setTimeout, clearTimeout, performance,
  btoa: (s) => Buffer.from(s, "binary").toString("base64"),
  atob: (s) => Buffer.from(s, "base64").toString("binary"),
  localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } }
};
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ["core", "genome", "brain", "chemistry", "world", "creature", "save"]) {
  vm.runInContext(fs.readFileSync(path.join(dir, f + ".js"), "utf8"), ctx, { filename: f + ".js" });
}
// main.js boots on DOMContentLoaded; give it a fake document so its helpers load without booting.
ctx.document = { readyState: "loading", addEventListener() {}, getElementById() { return null; } };
ctx.addEventListener = () => {};
vm.runInContext(fs.readFileSync(path.join(dir, "main.js"), "utf8"), ctx, { filename: "main.js" });
const SB = ctx.SB;
SB.Render = { fx() {} };

const minutes = +(process.argv[2] || 60);
const seed = +(process.argv[3] || 12345);
const player = process.argv[4] !== "afk"; // a lazy scripted player that feeds and teaches

const game = SB.Game.create(seed);
game.tutorial.done = true;
const events = {};
for (const ev of ["hatch", "death", "learnWord", "egg", "eat", "obey", "sick", "cured", "grumpArrive", "achievement", "say", "hit"]) {
  SB.bus.on(ev, (d) => { events[ev] = (events[ev] || 0) + 1; if (ev === "death") console.log(`  t=${(game.time / 60).toFixed(1)}m death: ${d.c.name} (${d.cause}) age ${(d.c.age / 60).toFixed(1)}m stage ${d.c.stage}`); });
}
for (let i = 0; i < 4; i++) SB.Game.spawnSmol(game, { x: SB.HOME_X - 200 + i * 120, age: i < 2 ? 0 : 1300 });

const steps = Math.round((minutes * 60) / SB.TICK);
const t0 = performance.now();
let bad = 0;
for (let s = 0; s < steps; s++) {
  game.time += SB.TICK;
  SB.World.tick(game.world, SB.TICK, game);
  for (const c of game.creatures) if (c.alive || c.dying) SB.Creature.tick(c, SB.TICK, game);
  for (let j = game.creatures.length - 1; j >= 0; j--) if (game.creatures[j].gone) game.creatures.splice(j, 1);
  // scripted player every 20 sim s: teach a word to a random smol about something it's near, praise good eating
  if (player && s % 600 === 0) {
    const smols = SB.Game.smols(game);
    for (const c of smols) {
      const near = SB.World.near(game.world, c.x, c.y, 300).filter((o) => !o.fixed);
      if (near.length) {
        const o = near[0];
        game.hand.x = o.x; game.hand.y = o.y - 40; game.hand.visible = true;
        SB.Creature.hear(c, SB.NOUN_WORDS[SB.N[o.noun]], game, { fromHand: true, aboutNoun: o.noun, aboutId: o.id });
      }
      if (c.action && c.action.verb === SB.V.eat) SB.Creature.tickle(c, game);
      if (c.chem.hunger > 0.75) { // feed the hungry
        const f = SB.World.add(game.world, game, "apple", c.x + 30, c.y - 40);
      }
    }
  }
  if (s % 300 === 0) {
    for (const c of game.creatures) if (!isFinite(c.x) || !isFinite(c.y) || c.x < 0 || c.x > SB.WORLD_W) { bad++; console.log("BAD creature pos", c.name, c.x, c.y); }
    for (const o of game.world.objects) if (!isFinite(o.x) || !isFinite(o.y)) { bad++; console.log("BAD obj", o.kind, o.x, o.y); }
  }
  if (s % Math.round(600 / SB.TICK) === 0) {
    const smols = SB.Game.smols(game);
    const line = smols.map((c) => `${c.name}[${["B", "K", "T", "A", "E"][c.stage]} iq${SB.Creature.iq(c, true)} w${SB.Creature.knownCount(c)} h${c.chem.health.toFixed(2)} hu${c.chem.hunger.toFixed(2)}]`).join(" ");
    console.log(`t=${(game.time / 60).toFixed(0)}m day ${SB.World.clock(game).day} smols=${smols.length} grumps=${SB.Game.grumps(game).length} objs=${game.world.objects.length} | ${line}`);
  }
}
const ms = performance.now() - t0;
console.log("\nevents:", JSON.stringify(events));
console.log("stats:", JSON.stringify(game.stats));
console.log("achievements:", Object.keys(game.achievements).join(", "));
console.log(`sim ${minutes} min in ${ms.toFixed(0)} ms (${((ms / steps) * 1000).toFixed(1)} µs/step) bad=${bad}`);

// save roundtrip
SB.Save.save(game);
const data = SB.Save.load();
const g2 = SB.Game.revive(data);
console.log("save size KB:", (ctx.localStorage._d["smolbrains-save-v1"].length / 1024).toFixed(1), "revived creatures:", g2.creatures.length, "objects:", g2.world.objects.length);
const best = SB.Game.smols(game).sort((a, b) => b.iq - a.iq)[0];
if (best) {
  const code = SB.Save.exportSmol(best);
  const back = SB.Save.importSmol(code);
  console.log("smol code length:", code.length, "import ok:", !!back.genome, back.name);
}
if (bad) process.exit(1);
