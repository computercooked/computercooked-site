// 4.39: starving smols eat. A starving smol turns down calls (the shiny cube pulled the nearest four to it every second,
// and five smols starved beside it), ignores food it cannot stand at (fruit in a pond), stretches for food an arm's
// length off, picks no fights, and smols that are not starving leave its food alone. Edge markers clear of the stick
// on a phone held sideways.
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
function step(SB, game, secs, each) { for (let s = 0; s < secs / SB.TICK; s++) { SB.Game.step(game, SB.TICK); if (SB.Ext) SB.Ext.tick(game, SB.TICK); if (each) each(s); } }
const isFood = (SB, o) => SB.KINDS[o.kind] && SB.KINDS[o.kind].noun === "food";
// clear the food near a spot so a test controls what there is to eat
function clearFood(SB, game, x, z, r) { game.world.items.filter(o => isFood(SB, o) && Math.hypot(o.x - x, o.z - z) < r).forEach(o => SB.World.remove ? SB.World.remove(game.world, o) : (o.x += 500)); }

console.log("1. a starving smol turns down calls");
seeded(4391, () => {
  const { SB, game } = island(4391), C = SB.Creature, [a, b] = SB.Game.smols(game);
  check("there is a starving point", C.STARVING > 0.8 && C.STARVING < 0.95, C.STARVING);
  a.chem.hunger = 0.97; b.chem.hunger = 0.3;
  check("a starving smol turns down a call", C.sendTo(a, a.x + 5, a.z, game, 10) === false);
  check("…unless the call is forced", C.sendTo(a, a.x + 5, a.z, game, 10, true) === true && a.action && a.action.called);
  check("a fed smol still comes", C.sendTo(b, b.x + 5, b.z, game, 10) === true);
  a._pov = true; check("the smol you are playing goes where it is sent", C.sendTo(a, a.x + 5, a.z, game, 10) === true); a._pov = false;
});
seeded(4392, () => {
  // the shiny cube, played again: something calls the smol to a spot beside it every second, food five steps off
  const { SB, game } = island(4392), C = SB.Creature, me = SB.Game.smols(game)[0];
  clearFood(SB, game, me.x, me.z, 30);
  const apple = SB.World.add(game.world, game, "apple", me.x + 5, me.z, {});
  me.chem.hunger = 0.97; me.action = null; me.plan = null;
  const h0 = me.chem.hunger, spot = { x: me.x - 1.5, z: me.z - 1 }; // the cube: a fixed spot, away from the food
  step(SB, game, 40, s => { if (s % 20 === 0 && Math.hypot(me.x - spot.x, me.z - spot.z) > 1.2) C.sendTo(me, spot.x, spot.z, game, 10); });
  check("called every second, it still walks to the food and eats", me.chem.hunger < h0 - 0.1 || !game.world.items.includes(apple), "hunger " + me.chem.hunger.toFixed(2));
});

console.log("2. food it cannot stand at");
seeded(4393, () => {
  const { SB, game } = island(4393), C = SB.Creature, me = SB.Game.smols(game)[0], w = game.world;
  // the nearest deep water to the smol
  let wet = null, wd = 1e9;
  for (let dz = -40; dz <= 40; dz += 0.5) for (let dx = -40; dx <= 40; dx += 0.5) { const x = me.x + dx, z = me.z + dz; if (SB.World.inBounds(w, x, z) && SB.World.depthAt(w, x, z) > 0.8) { const d = Math.hypot(dx, dz); if (d < wd) { wd = d; wet = { x, z }; } } }
  check("there is a pond to test with", !!wet, wet ? "at " + wd.toFixed(1) : "");
  if (wet) {
    me.x = wet.x; me.z = wet.z; // walk it to the bank: the nearest dry spot
    let bank = null, bd = 1e9; for (let dz = -12; dz <= 12; dz += 0.25) for (let dx = -12; dx <= 12; dx += 0.25) { const x = wet.x + dx, z = wet.z + dz; if (SB.World.walkable(w, x, z, false) && SB.World.depthAt(w, x, z) < 0.05) { const d = Math.hypot(dx, dz); if (d < bd) { bd = d; bank = { x, z }; } } }
    me.x = bank.x; me.z = bank.z; me.y = SB.World.heightAt(w, me.x, me.z);
    clearFood(SB, game, me.x, me.z, 40);
    const inPond = SB.World.add(w, game, "apple", wet.x, wet.z, {});
    const ang = Math.atan2(me.x - wet.x, me.z - wet.z); let dry = null;
    for (let r = 4; r < 14 && !dry; r += 0.5) { const x = me.x + Math.sin(ang) * r, z = me.z + Math.cos(ang) * r; if (SB.World.walkable(w, x, z, false) && SB.World.depthAt(w, x, z) < 0.05) dry = { x, z }; }
    const onLand = SB.World.add(w, game, "apple", dry.x, dry.z, {});
    check("the pond apple is nearer than the dry one", Math.hypot(inPond.x - me.x, inPond.z - me.z) < Math.hypot(onLand.x - me.x, onLand.z - me.z));
    me.look = me.look || {}; me.look.fins = false; me.tier = Math.min(me.tier, 3); me.wade = 0;
    me.chem.hunger = 0.96; me.action = null; me.plan = null;
    let wentForPond = 0; step(SB, game, 30, () => { const a = me.action; if (a && a.verb === SB.V.eat && a.target && a.target.id === inPond.id) wentForPond++; });
    check("a starving smol without fins never heads for fruit in the pond", wentForPond === 0, wentForPond + " ticks");
    check("…and eats the dry apple instead", !w.items.includes(onLand) || me.chem.hunger < 0.8, "hunger " + me.chem.hunger.toFixed(2));
  }
});

console.log("3. no fights, a stretch, and its food left alone");
{
  const cj = js("creature.js");
  check("too hungry to pick a fight", /hunger ?> ?C\.STARVING && ?c\.species ?=== ?"smol" && ?noun ?=== ?"smol"\) ?mask\[V\.hit\] ?= ?false/.test(cj));
  check("no grudges or tantrums while starving", /c\.grudge && c\.species === "smol"[^)]*ch\.hunger <= C\.STARVING/.test(cj) && /c\.tantrum && c\.species === "smol" && ch\.hunger <= C\.STARVING/.test(cj));
  check("stuck an arm's length off, it stretches", /starvingFor\(c, ?a\) && tgt\.type ?=== ?"item" && dist ?< ?reach ?\+ ?1\.1/.test(cj));
}
seeded(4394, () => {
  const { SB, game } = island(4394), [a, b] = SB.Game.smols(game);
  clearFood(SB, game, a.x, a.z, 40);
  const apple = SB.World.add(game.world, game, "apple", a.x + 6, a.z, {});
  apple.starveFor = { id: b.id, t: game.time };
  a.chem.hunger = 0.84; a.action = null; a.plan = null;
  let ateIt = false; step(SB, game, 20, () => { apple.starveFor.t = game.time; const x = a.action; if (x && x.verb === SB.V.eat && x.target && x.target.id === apple.id) ateIt = true; });
  check("a peckish smol leaves alone the food a starving one is walking to", !ateIt);
});

console.log("4. a phone held sideways");
check("edge markers sit above the stick when the screen is short", /H ?\* ?\(H ?< ?520 ?&& ?phone\(\) ?\? ?0\.27 ?: ?0\.5\)/.test(js("povhud.js")));

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
