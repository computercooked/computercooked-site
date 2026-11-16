// 4.39: a waypoint reached is progress (a route that leads away first was dropped after eight seconds, and the walk
// to food with it), and edge markers clear of the stick on a phone held sideways.
// node games/smol-brains/tests/play439.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra != null && extra !== "" ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const dir = path.join(__dirname, "..", "play", "js");
const html = fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8");
const js = f => fs.readFileSync(path.join(dir, f), "utf8");
const order = (html.match(/src="js\/([a-z0-9-]+)\.js"/g) || []).map(s => s.slice(8, -4));
const EXTRA = ["ext", "bosses", "body", "possess", "home", "loot", "friends", "town", "dark", "powers", "fight", "deep", "harvest", "animals", "qol", "wear", "shapes", "wardrobe3", "motion3", "world3", "helpers3", "arrivals3", "minds3"];
function island(seed) {
  const ctx = load(), SB = ctx.SB;
  order.filter(n => EXTRA.indexOf(n) >= 0).forEach(n => { if (n === "bosses" && SB.Bosses) return; vm.runInContext(js(n + ".js"), ctx, { filename: n + ".js" }); });
  if (SB.Possess) SB.Possess.headless = true;
  const game = SB.Game.newGame(seed); SB.Game.current = game; game.tutorial.done = true;
  SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod));
  const sp = game.world.T.spawn; for (let i = 0; i < 2; i++) SB.Game.spawnSmol(game, { x: sp.x - 1 + i * 2, z: sp.z + 2, age: 560 });
  return { SB, game };
}
function run(SB, game, secs) { for (let s = 0; s < secs / SB.TICK; s++) { SB.Game.step(game, SB.TICK); if (SB.Ext) SB.Ext.tick(game, SB.TICK); } }

console.log("1. a waypoint reached is progress");
{
  const cj = js("creature.js");
  check("reaching a waypoint resets the 'getting nowhere' clock of the walk", /wp ?= ?c\.path\[\+\+c\.pathI\]; ?c\.wBestT ?= ?0; ?c\.pathAt ?= ?game\.time;/.test(cj));
  check("…and of the errand the walk is for", /if ?\(c\.path ?&& ?c\.pathAt ?=== ?game\.time\) ?a\.bestT ?= ?a\.t;/.test(cj));
}
seeded(4390, () => {
  const { SB, game } = island(4390), C = SB.Creature, me = SB.Game.smols(game)[0];
  // a route that goes away from the goal before it comes back: three waypoints behind the smol, then the goal
  const gx = me.x + 6, gz = me.z;
  me.pathGoal = { x: gx, z: gz }; me.pathTried = true; me.wBest = 6; me.wBestT = 7.99;
  me.path = [{ x: me.x - 0.3, z: me.z }, { x: me.x - 0.6, z: me.z }, { x: gx, z: gz }]; me.pathI = 0;
  me.plan = null; me.action = { verb: SB.V.eat, phase: "go", t: 20, best: 6, bestT: 13.02, target: { type: "item", id: SB.World.add(game.world, game, "apple", gx, gz, {}).id } };
  me.chem.hunger = 0.5;
  SB.Game.step(game, SB.TICK);
  check("a smol about to be called lost, reaching the next waypoint, keeps its route", !!me.path && me.wBestT < 1 && !!me.action && me.action.verb === SB.V.eat, "path " + !!me.path + " wBestT " + (me.wBestT || 0).toFixed(2) + " action " + !!me.action);
});

console.log("2. a phone held sideways");
check("edge markers sit above the stick when the screen is short", /H ?\* ?\(H ?< ?520 ?&& ?phone\(\) ?\? ?0\.27 ?: ?0\.5\)/.test(js("povhud.js")));

if (process.argv[2] === "quick") { console.log(failed ? failed + " FAILED" : "quick: all passed"); process.exit(failed ? 1 : 0); }
console.log("3. island 5, three days: nobody starves (4.38: one did, and the tribe was half the size)");
seeded(5, () => {
  const { SB, game } = island(5);
  let starved = 0; SB.bus.on("death", d => { if (d && d.c && d.c.species === "smol" && d.cause === "starved") starved++; });
  run(SB, game, 3 * SB.DAY_LENGTH);
  const n = SB.Game.smols(game).length;
  check("island 5: the tribe grew and nobody starved", n >= 10 && starved === 0, n + " alive, " + starved + " starved");
});

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
