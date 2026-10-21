// Funerals: the dead stay where they fell, the tribe gathers after a while and says goodbye the way its culture
// knows how (river, pyre, grave, cairn), mourners come and remember, deaths close together share one funeral,
// and a save never leaves a body lying around.
// node games/smol-brains/tests/funeral.test.js
"use strict";
const load = require("./_load.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
function run(SB, game, secs) { for (let t = 0; t < secs / SB.TICK; t++) SB.Game.step(game, SB.TICK); }

// a little tribe at a given tier, everyone fed, near home
function tribe(seed, tier, n, setup) {
  const SB = load().SB;
  const game = SB.Game.newGame(seed); SB.Game.current = game; game.tutorial.done = true; game.time = 1500; game.podT = 1e9;
  if (game.dir) game.dir.nextT = 1e9;
  const cs = SB.Debug.spawnTier(tier, n);
  const h = SB.Society.home(game, 0);
  cs.forEach((c, i) => { c.asleep = false; c.x = h.x + (i % 4) - 1.5; c.z = h.z + Math.floor(i / 4) - 1; c.chem.hunger = 0.1; c.age = Math.max(c.age, 600); });
  if (setup) setup(SB, game, cs);
  return { SB, game, cs, h };
}
function runFed(SB, game, secs) { for (let t = 0; t < secs; t += 1) { run(SB, game, 1); SB.Game.smols(game).forEach(c => { c.chem.hunger = 0.1; c.chem.cold = 0; c.chem.health = Math.max(c.chem.health, 0.8); }); } }

console.log("1. a death leaves a body, and a funeral gets planned");
{
  const { SB, game, cs } = tribe(31, 1, 6);
  const events = []; SB.bus.on("funeral", d => events.push(d));
  const dead = cs[0], x = dead.x, z = dead.z;
  SB.Creature.die(dead, game, "old");
  run(SB, game, 0.5);
  check("the body is out of the living", !game.creatures.includes(dead) && !SB.Game.byId(game, dead.id));
  check("it lies where it fell", game.bodies.length === 1 && Math.abs(game.bodies[0].x - x) < 0.01 && Math.abs(game.bodies[0].z - z) < 0.01);
  check("no grave straight away", !game.world.structures.some(s => s.kind === "grave" && s.data && s.data.id === dead.id));
  check("a funeral is being planned", game.funerals.length === 1 && game.funerals[0].phase === "plan");
  SB.Creature.die(cs[1], game, "sick");
  check("a second death soon after joins the same funeral", game.funerals.length === 1 && game.funerals[0].ids.length === 2);
  runFed(SB, game, 60);
  check("nothing happens for a while", !events.length);
  runFed(SB, game, 50);
  check("then the tribe gathers", events.length === 1 && /and/.test(events[0].names), events[0] && events[0].names + " · " + events[0].rite);
}

console.log("2. the rite follows what they know");
{
  const a = tribe(32, 1, 5);
  check("critters with no fire: the river or a cairn", ["river", "cairn"].includes(a.SB.Funeral.riteFor(a.game).rite), a.SB.Funeral.riteFor(a.game).rite);
  const b = tribe(33, 3, 5, (SB, game, cs) => { cs.forEach(c => c.ideas.fire = 1); const h = SB.Society.home(game, 0); SB.World.addStructure(game.world, game, "campfire", h.x + 3, h.z + 3, { done: true }); });
  check("fire and a campfire: a pyre", b.SB.Funeral.riteFor(b.game).rite === "pyre");
  const done = []; b.SB.bus.on("funeralDone", d => done.push(d));
  b.SB.Creature.die(b.cs[0], b.game, "old");
  runFed(b.SB, b.game, 101 + 90 + 60);
  check("the pyre burns and it ends", done.length === 1 && /fire/.test(done[0].how) && !b.game.bodies.length, done[0] && done[0].how);
  const c = tribe(34, 4, 5);
  check("builders: a grave", c.SB.Funeral.riteFor(c.game).rite === "burial");
}

console.log("3. a builder funeral: carried, buried, mourned, remembered");
{
  const { SB, game, cs } = tribe(35, 4, 7);
  const dead = cs[0], friend = cs[1];
  SB.Social.remember(game, friend, dead, "play", 40, "we play together", 1e6, 40);
  const done = []; SB.bus.on("funeralDone", d => done.push(d));
  SB.Creature.die(dead, game, "old");
  runFed(SB, game, 101);
  const f = game.funerals[0];
  check("the funeral started", f && f.phase !== "plan", f && f.phase);
  check("a friend came", f && f.mourners.includes(friend.id));
  let carried = false;
  for (let i = 0; i < 100 && game.funerals.length && game.funerals[0].phase === "gather"; i++) { runFed(SB, game, 1); if (game.bodies.some(b => b.carried)) carried = true; }
  check("someone carried the body", carried);
  runFed(SB, game, 80);
  check("it finished", done.length === 1, done[0] && done[0].how);
  const grave = game.world.structures.find(s => s.kind === "grave" && s.data && s.data.id === dead.id);
  check("there's a grave with an epitaph", grave && /here lies/.test(grave.data.epitaph));
  check("the body is laid to rest", !game.bodies.length);
  check("the friend remembers saying goodbye", friend.mind && friend.mind.ep.some(e => /said goodbye/.test(e.w)));
  check("the island remembers", game.chronicle.some(e => /buried/.test(JSON.stringify(e))));
  check("nobody is stuck: mourners go back to life", game.funerals.length === 0);
}

console.log("4. a river funeral: the body drifts away");
{
  // find a seed whose village is near water
  let T = null;
  for (let seed = 40; seed < 70 && !T; seed++) { const t = tribe(seed, 1, 5); if (t.SB.Funeral.riteFor(t.game).rite === "river") T = t; }
  check("found a village by the water", !!T);
  if (T) {
    const { SB, game, cs } = T;
    const done = []; SB.bus.on("funeralDone", d => done.push(d));
    SB.Creature.die(cs[0], game, "old");
    runFed(SB, game, 101 + 95);
    let wet = false;
    for (let i = 0; i < 60 && !done.length; i++) { runFed(SB, game, 1); if (game.bodies.some(b => b.drift && SB.World.depthAt(game.world, b.x, b.z) > 0.3)) wet = true; }
    check("the body went into the water", wet || done.length && /float/.test(done[0].how));
    check("it finished", done.length === 1, done[0] && done[0].how);
    runFed(SB, game, 70);
    check("and drifted away for good", !game.bodies.length);
    check("no grave for a river funeral", !game.world.structures.some(s => s.kind === "grave"));
  }
}

console.log("5. saving never leaves a body lying around");
{
  const { SB, game, cs } = tribe(36, 4, 4);
  SB.Creature.die(cs[0], game, "old");
  run(SB, game, 1);
  const data = JSON.parse(JSON.stringify(SB.Save.snapshot(game)));
  const g2 = SB.Save.revive(data);
  check("the waiting body becomes a quiet grave", g2.world.structures.some(s => s.kind === "grave" && s.data && s.data.id === cs[0].id));
  check("no bodies or funerals left half-done", !g2.bodies.length && !g2.funerals.length);
  const bad = SB.Save.revive(Object.assign({}, data, { bodies: [null, { x: "a" }, 5] }));
  check("broken body data is ignored", bad && !bad.bodies.length);
}

console.log("6. a lonely death: nobody left");
{
  const { SB, game, cs } = tribe(37, 2, 1);
  SB.Creature.die(cs[0], game, "old");
  run(SB, game, 200);
  check("no crash, no funeral without mourners", game.funerals.length <= 1 && game.funerals.every(f => f.phase === "plan"));
}

console.log(failed ? "\n" + failed + " FAILED" : "\nall passed");
process.exit(failed ? 1 : 0);
