// The sandbox island: a create-world mode with free miracles, a spawn palette and no leaderboard score;
// a normal island can't spawn. And save slots: keepCopy is there (it needs IndexedDB, so the browser check covers it).
// node games/smol-brains/tests/sandbox.test.js
"use strict";
const load = require("./_load.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }

console.log("1. a normal island");
{
  const SB = load().SB;
  const g = SB.Game.newGame(31); SB.Game.current = g;
  const sp = SB.Society.home(g, 0);
  check("is not a sandbox", !SB.Game.sandbox(g));
  check("miracles cost sparks", SB.Game.miracleCost(g, 5) === 5);
  check("can't spawn", SB.Game.sandboxSpawn(g, "t3", sp.x, sp.z) === null);
}

console.log("2. a sandbox island");
{
  const SB = load().SB;
  const g = SB.Game.newGame(32, 0, { mode: "sandbox" }); SB.Game.current = g;
  const sp = SB.Society.home(g, 0);
  check("is a sandbox", SB.Game.sandbox(g));
  check("miracles are free", SB.Game.miracleCost(g, 10) === 0);
  const n0 = SB.Game.smols(g).length;
  const made = [];
  for (let t = 0; t <= 6; t++) { const c = SB.Game.sandboxSpawn(g, "t" + t, sp.x + t * 0.8, sp.z + 1); if (c) made.push(c.tier); }
  check("smols of every tier", made.join() === "0,1,2,3,4,5,6", made.join());
  check("the tribe's top tier counts it", g.stats.maxTier === 6);
  check("they're in the tribe", SB.Game.smols(g).length === n0 + 7);
  const egg = SB.Game.sandboxSpawn(g, "egg", sp.x - 2, sp.z);
  check("an egg", egg && egg.kind === "egg");
  const gr = SB.Game.sandboxSpawn(g, "grump", sp.x + 6, sp.z + 6);
  check("a grump", gr && gr.species === "grump");
  const items0 = g.world.items.length;
  SB.Game.sandboxSpawn(g, "food", sp.x, sp.z - 2);
  check("a pile of food", g.world.items.length >= items0 + 5);
  for (let i = 0; i < 300; i++) SB.Game.step(g, SB.TICK);
  check("the island runs", g.creatures.some(c => c.alive));
  const back = SB.Save.revive(JSON.parse(JSON.stringify(SB.Save.snapshot(g))));
  check("still a sandbox after a save", back && SB.Game.sandbox(back));
}

console.log("3. save slots");
{
  const SB = load().SB;
  check("keepCopy and copies exist", typeof SB.Save.keepCopy === "function" && typeof SB.Save.copies === "function");
}

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
