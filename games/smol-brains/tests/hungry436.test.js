// 4.36: a hungry smol eats first. Smols were starving a step from food because funerals, story events and calls
// home (C.sendTo) kept pulling them off it, and each death called another funeral. They also lay down hungry.
// node games/smol-brains/tests/hungry436.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra != null && extra !== "" ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const dir = path.join(__dirname, "..", "play", "js");
const html = fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8");
const order = (html.match(/src="js\/([a-z0-9-]+)\.js"/g) || []).map(s => s.slice(8, -4));
const EXTRA = ["ext", "bosses", "body", "possess", "home", "loot", "friends", "town", "dark", "powers", "fight", "deep", "harvest", "animals", "qol", "wear", "shapes", "wardrobe3", "motion3", "world3", "helpers3", "arrivals3", "minds3"];
function island(seed) {
  const ctx = load(), SB = ctx.SB;
  order.filter(n => EXTRA.indexOf(n) >= 0).forEach(n => { if (n === "bosses" && SB.Bosses) return; vm.runInContext(fs.readFileSync(path.join(dir, n + ".js"), "utf8"), ctx, { filename: n + ".js" }); });
  if (SB.Possess) SB.Possess.headless = true;
  const game = SB.Game.newGame(seed); SB.Game.current = game; game.tutorial.done = true;
  SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod));
  const sp = game.world.T.spawn; for (let i = 0; i < 2; i++) SB.Game.spawnSmol(game, { x: sp.x - 1 + i * 2, z: sp.z + 2, age: 560 });
  return { SB, game };
}
console.log("1. the rules");
seeded(4360, () => {
  const { SB, game } = island(4360), C = SB.Creature, V = SB.V || {}, me = SB.Game.smols(game)[0], other = SB.Game.smols(game)[1];
  check("there is one number for 'this hungry'", C.HUNGRY_AWAKE > 0.5 && C.HUNGRY_AWAKE < 0.85, C.HUNGRY_AWAKE);
  me.chem.hunger = 0.2;
  check("a fed smol goes where it is sent", C.sendTo(me, me.x + 5, me.z, game, 10) === true && me.action && me.action.called);
  me.action = null; me.chem.hunger = C.HUNGRY_AWAKE + 0.05;
  check("a hungry one does not: it has eating to do", C.sendTo(me, me.x + 5, me.z, game, 10) === false && !me.action);
  me._pov = true;
  check("a smol you are inside still goes (that is you walking)", C.sendTo(me, me.x + 5, me.z, game, 10) === true);
  me._pov = false; me.action = null;
  const g = SB.Game.spawnGrump(game, me.x + 30, me.z);
  g.chem.hunger = 0.95;
  check("the rule is for smols: a grump is sent as before", C.sendTo(g, g.x + 3, g.z, game, 5) === true);
  g.alive = false; g.gone = true;
  // asleep and hungry: it wakes
  other.asleep = true; other.action = null; other.chem.hunger = C.HUNGRY_AWAKE + 0.05; other.chem.sleepy = 0.9; other.chem.tired = 0.5;
  for (let i = 0; i < 20 && other.asleep; i++) { other.chem.hunger = C.HUNGRY_AWAKE + 0.05; SB.Game.step(game, SB.TICK); }
  check("a hungry sleeper wakes", other.asleep === false);
  let slept = 0; other.chem.hunger = C.HUNGRY_AWAKE + 0.1;
  for (let i = 0; i < 400; i++) { other.chem.hunger = Math.max(other.chem.hunger, C.HUNGRY_AWAKE + 0.1); other.chem.sleepy = 0.95; SB.Game.step(game, SB.TICK); if (other.asleep) slept++; }
  check("and does not lie down again while it is that hungry, however sleepy", slept === 0, slept + " ticks asleep");
});
console.log("2. islands where smols used to starve beside food (two days, every system loaded)");
[[23, 9], [77, 7]].forEach(pair => {
  seeded(pair[0], () => {
    const { SB, game } = island(pair[0]);
    let starved = 0, pulled = 0;
    SB.bus.on("death", d => { if (d && d.c && d.c.species === "smol" && d.cause === "starved" && !d.c.stranger) starved++; });
    const steps = Math.round(2 * SB.DAY_LENGTH / SB.TICK);
    for (let s = 0; s < steps; s++) {
      SB.Game.step(game, SB.TICK); if (SB.Ext) SB.Ext.tick(game, SB.TICK);
      if (s % 10 === 0) SB.Game.smols(game).forEach(c => { if (c.chem.hunger > 0.9 && c.action && c.action.called && !c._pov) pulled++; });
    }
    const n = SB.Game.smols(game).length;
    check("island " + pair[0] + ": no starving smol is walking to a summons", pulled === 0, pulled);
    check("island " + pair[0] + ": the tribe is alive and at most two starved (it was " + pair[1] + " in three days)", n >= 4 && starved <= 2, n + " smols, " + starved + " starved");
  });
});
console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
