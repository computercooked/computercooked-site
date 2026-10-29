// the first minute in a blob has a grump in it: about 20 s in it catches your scent and chases you. reach the nest
// (or two friends) and it gives up for +2 sparks; it stings but never takes the last quarter of your hearts.
// node games/smol-brains/tests/threat.test.js
"use strict";
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
function island(seed) {
  const ctx = load(), SB = ctx.SB;
  const fs = require("fs"), path = require("path"), vm = require("vm");
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "play", "js", "possess.js"), "utf8"), ctx, { filename: "possess.js" }); SB.Possess.headless = true;
  const game = SB.Game.newGame(seed); SB.Game.current = game; game.tutorial.done = true; game.time = 300; game.podT = 1e9;
  if (game.dir) game.dir.nextT = 1e9;
  game.strangerT = 1e9;
  const cs = SB.Debug.spawnTier(0, 2);
  const h = SB.Society.home(game, 0);
  SB.Debug.reveal();
  cs.forEach(c => { c.asleep = false; c.chem.hunger = 0.1; c.age = 700; });
  // the possessed blob is out on its own, away from the nest
  for (let a = 0; a < 64; a++) { const x = h.x + Math.cos(a * 0.7) * 22, z = h.z + Math.sin(a * 0.7) * 22; if (SB.World.walkable(game.world, x, z) && SB.World.depthAt(game.world, x, z) < 0.05) { cs[0].x = x; cs[0].z = z; break; } }
  cs[1].x = h.x; cs[1].z = h.z;
  return { SB, game, c: cs[0], h };
}
function run(SB, game, secs, until) { for (let t = 0; t < secs; t += SB.TICK) { SB.Game.step(game, SB.TICK); if (until && until()) return t; } return secs; }

console.log("1. it comes about 20 s in, and it stings");
seeded(901, () => {
  const { SB, game, c } = island(91);
  SB.Possess.enter(game, c);
  run(SB, game, SB.Possess.SCOUT_AT - 3);
  check("not straight away", !SB.Possess.scout());
  run(SB, game, 6);
  const g = SB.Possess.scout();
  check("then a grump is after you", !!g && g.species === "grump" && g.scout && g.scout.who === c.id);
  check("well off, where you can see it", !!g && SB.dist(g.x, g.z, c.x, c.z) > 12, g && SB.dist(g.x, g.z, c.x, c.z).toFixed(1));
  let hits = 0; SB.bus.on("scoutHit", () => hits++);
  check("it growls first, then comes", g && g.scout.t < 3.5);
  run(SB, game, 20); // standing still
  check("it catches you if you stand there", hits >= 1, hits + " hits");
  check("it hurts, but never the last quarter", c.alive && c.chem.health >= 0.25, c.chem.health.toFixed(2));
  run(SB, game, SB.Possess.SCOUT_MAX);
  check("after a while it gets bored", !SB.Possess.scout() && game.settings.povThreat === "done");
  check("you're still alive", c.alive);
  SB.Possess.leave();
});

console.log("2. run home to the nest and it gives up: +2 sparks");
seeded(902, () => {
  const { SB, game, c, h } = island(92);
  SB.Possess.enter(game, c);
  run(SB, game, SB.Possess.SCOUT_AT + 2, () => !!SB.Possess.scout());
  check("the grump came", !!SB.Possess.scout());
  const s0 = game.sparks || 0;
  let end = null; SB.bus.on("scoutEnd", d => { end = d; });
  c.x = h.x + 2; c.z = h.z; // made it home
  run(SB, game, 4);
  check("not straight away: it comes at you for a few seconds first", !end && !!SB.Possess.scout());
  run(SB, game, 6);
  check("safe at the nest: it gives up", end && end.ok && !SB.Possess.scout());
  check("+2 sparks", (game.sparks || 0) >= s0 + 2 - 0.01, ((game.sparks || 0) - s0).toFixed(1));
  run(SB, game, 3);
  const g = game.creatures.find(o => o.species === "grump");
  check("the grump heads off", !g || !g.alive || g.goingHome);
  SB.Possess.leave();
});

console.log("2b. K-0035: it comes even if you never leave the nest");
seeded(904, () => {
  const { SB, game, c, h } = island(94);
  c.x = h.x + 1; c.z = h.z;
  SB.Possess.enter(game, c);
  run(SB, game, SB.Possess.SCOUT_AT + 2, () => !!SB.Possess.scout());
  check("a grump within the first minute, by the nest too", !!SB.Possess.scout() && game.time > 0);
  let end = null; SB.bus.on("scoutEnd", d => { end = d; });
  let bit = 0; SB.bus.on("scoutHit", () => bit++);
  run(SB, game, 25, () => !!end);
  check("...it gets one bite in, then you're safe at the nest (K-0039: felt, not a banner)", end && end.ok && bit >= 1, bit + " bites");
  SB.Possess.leave();
});

console.log("3. once per island");
seeded(903, () => {
  const { SB, game, c } = island(93);
  game.settings.povThreat = "done";
  SB.Possess.enter(game, c);
  run(SB, game, SB.Possess.SCOUT_AT + 5);
  check("not a second time", !SB.Possess.scout());
  SB.Possess.leave();
  delete game.settings.povThreat;
  SB.Possess.enter(game, c);
  run(SB, game, SB.Possess.SCOUT_AT + 2, () => !!SB.Possess.scout());
  SB.Possess.leave();
  const g = game.creatures.find(o => o.species === "grump" && o.alive);
  check("leaving the body: the grump loses the scent", !g || !g.scout || g.scout.done, g && JSON.stringify(g.scout));
});

console.log("4. K-0037: a tool-user's first possession on an old island gets it too");
seeded(905, () => {
  const { SB, game, c } = island(95);
  const [t] = SB.Debug.spawnTier(2, 1); t.x = c.x; t.z = c.z; t.asleep = false; t.chem.hunger = 0.1; t.age = 900;
  SB.Possess.enter(game, t);
  check("it starts hungry", t.chem.hunger >= SB.Possess.START_HUNGER - 0.01, t.chem.hunger.toFixed(2));
  run(SB, game, SB.Possess.SCOUT_AT + 2, () => !!SB.Possess.scout());
  check("and a grump comes", !!SB.Possess.scout());
  SB.Possess.leave();
});

console.log("5. K-0037: coming back runs at most one island day");
{
  const SB = load().SB;
  check("a week away is one day of catch-up", SB.Game.offlineBudget(3600 * 24 * 7) === SB.DAY_LENGTH, SB.Game.offlineBudget(3600 * 24 * 7));
}

console.log("6. K-0039: it really comes, and a bite is felt");
seeded(906, () => {
  const { SB, game, c } = island(96);
  SB.Possess.enter(game, c);
  run(SB, game, SB.Possess.SCOUT_AT + 2, () => !!SB.Possess.scout());
  const g = SB.Possess.scout();
  const d0 = SB.dist(g.x, g.z, c.x, c.z);
  let hit = null; SB.bus.on("scoutHit", d => { if (!hit) hit = { hp: d.c.chem.health, x: d.c.x, z: d.c.z, gd: SB.dist(d.g.x, d.g.z, d.c.x, d.c.z) }; });
  const h0 = c.chem.health;
  const t = run(SB, game, 16, () => !!hit); // standing still
  check("it closes the gap fast: a bite inside 16 s", !!hit, "from " + d0.toFixed(1) + "m in " + t.toFixed(1) + " s");
  check("a bite is a real chunk of hearts", hit && h0 - hit.hp >= 0.14, hit && (h0 - hit.hp).toFixed(2));
  check("and knocks you back", hit && hit.gd > 1.6, hit && hit.gd.toFixed(2));
  SB.Possess.leave();
});

console.log("7. K-0039: hunger is tense, not hopeless");
seeded(907, () => {
  const { SB, game, c } = island(97);
  SB.Possess.enter(game, c);
  run(SB, game, 1);
  const h0 = c.chem.hunger;
  check("it starts about a third full", h0 >= 0.64 && h0 <= 0.72, (1 - h0).toFixed(2) + " food");
  run(SB, game, 60);
  check("a minute later there's still some left", c.chem.hunger < 0.9 && c.chem.hunger > h0 + 0.1, "food " + (1 - c.chem.hunger).toFixed(2));
  const before = c.chem.hunger;
  SB.bus.emit("nibble", { c: c });
  run(SB, game, 0.2);
  check("one meal fills a quarter of the bar or more", before - c.chem.hunger >= 0.25, "+" + (before - c.chem.hunger).toFixed(2));
  SB.Possess.leave();
});

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
