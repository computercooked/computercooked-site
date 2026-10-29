// K-0025 (the bot's v4.8.0 playtest): a rally says "N going" the moment it lands, wishes don't end a skip,
// a blob's first day in your hands starts hungry, and its step banners never cover each other.
// node games/smol-brains/tests/firstminutes.test.js
"use strict";
const load = require("./_load.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
function tribe(seed, n) {
  const ctx = load(), SB = ctx.SB;
  const fs = require("fs"), path = require("path"), vm = require("vm");
  if (!SB.Possess) { vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "play", "js", "possess.js"), "utf8"), ctx, { filename: "possess.js" }); SB.Possess.headless = true; }
  const game = SB.Game.newGame(seed); SB.Game.current = game; game.tutorial.done = true; game.time = 300; game.podT = 1e9;
  if (game.dir) game.dir.nextT = 1e9;
  game.strangerT = 1e9;
  const cs = SB.Debug.spawnTier(0, n);
  const h = SB.Society.home(game, 0);
  SB.Debug.reveal();
  cs.forEach((c, i) => { c.asleep = false; c.x = h.x + (i % 4) * 1.2 - 2; c.z = h.z + Math.floor(i / 4) * 1.2 - 1; c.chem.hunger = 0.1; c.chem.fear = 0; c.age = Math.max(c.age, 700); c.trust = 0.2; });
  return { SB, game, cs, h };
}
function spotAway(SB, game, h, d) {
  for (let a = 0; a < 64; a++) { const ang = a * 0.7, x = h.x + Math.cos(ang) * d, z = h.z + Math.sin(ang) * d; if (SB.World.walkable(game.world, x, z) && SB.World.depthAt(game.world, x, z) < 0.05) return { x, z }; }
  return null;
}

console.log("1. the first rally: everyone in earshot answers the moment it lands");
{
  const { SB, game, cs, h } = tribe(81, 6);
  cs[5].chem.hunger = 0.9; // one is starving: it says why
  const p = spotAway(SB, game, h, 14);
  const o = SB.Orders.place(game, "rally", p.x, p.z).o;
  check("five said yes straight away, before anyone thought again", o.yes === 5, "yes " + o.yes);
  check("the hungry one said no, with a reason", o.no === 1 && Object.keys(o.whys || {}).some(k => /hungry/.test(k)), JSON.stringify(o.whys));
}

console.log("2. a wish doesn't end a skip (it opens its own window)");
{
  const { SB, game, cs } = tribe(82, 2);
  game.speed = 1;
  SB.Game.skip(game);
  game.time += 5;
  SB.bus.emit("wish", { c: cs[0], w: { kind: "food" } });
  SB.bus.emit("pray", { c: cs[0], need: "hunger" });
  check("still skipping", !!game.skip && game.speed === 16);
  SB.bus.emit("grow", { c: cs[0] });
  check("growing up still stops it", !game.skip && game.speed === 1);
}

console.log("3. a blob's first day in your hands starts hungry");
{
  const { SB, game, cs } = tribe(83, 2);
  const c = cs[0]; c.chem.hunger = 0.1;
  delete game.settings.povBlobQuest;
  SB.Possess.enter(game, c);
  const q = SB.Possess.quest();
  check("the blob quest is on", !!q && q.kind === "blob", q && q.kind);
  check("its tummy is rumbling (the food bar is low)", c.chem.hunger >= SB.Possess.START_HUNGER - 0.01, c.chem.hunger.toFixed(2));
  SB.Possess.leave();
}

console.log("4. K-0027: G, G walks a blob to food it can eat, and it eats it when it gets there");
{
  const { SB, game, cs } = tribe(84, 2);
  const c = cs[0];
  delete game.settings.povBlobQuest; delete game.settings.povHungry;
  SB.Possess.enter(game, c);
  check("first time in a blob on this island: hungry", c.chem.hunger >= SB.Possess.START_HUNGER - 0.01, c.chem.hunger.toFixed(2));
  SB.Possess.sniff();
  const sn = SB.Possess.sniffing();
  const tgt = sn && sn.ref && SB.Creature.resolve(game, sn.ref);
  check("the nose found something a blob can eat", !!tgt && (sn.ref.type === "item" || ["bush", "roots", "gourds"].indexOf(tgt.ref.kind) >= 0), sn && sn.ref ? sn.ref.type + " " + (tgt && tgt.ref.kind) : "nothing");
  SB.Possess.sniff(); // G again: off you go
  const h0 = c.chem.hunger;
  let ate = false; SB.bus.on("povEat", () => { ate = true; }); SB.bus.on("nibble", () => { ate = true; });
  for (let t = 0; t < 45 && !ate; t += SB.TICK) SB.Game.step(game, SB.TICK);
  check("it walked there and ate", ate, "hunger " + h0.toFixed(2) + " → " + c.chem.hunger.toFixed(2));
  check("the food bar filled back up", c.chem.hunger < h0, c.chem.hunger.toFixed(2));
  SB.Possess.leave();
}

console.log("5. K-0027: a day-1 birthday doesn't end a skip; coming of age does");
{
  const { SB, game, cs } = tribe(85, 2);
  game.speed = 1; SB.Game.skip(game); game.time += 5;
  cs[0].stage = 1; SB.bus.emit("grow", { c: cs[0] });
  check("a new kid: still skipping", !!game.skip);
  cs[0].stage = 3; SB.bus.emit("grow", { c: cs[0] });
  check("a new adult: stops", !game.skip);
}

console.log("6. a tickle at the right moment in a lesson always counts (even when the net barely moves)");
{
  const { SB, game, cs } = tribe(86, 1);
  const c = cs[0], T = SB.Tricks, d = T.LIST.find(x => x.practice && !x.avoid && !x.practice.say);
  c.chem.hunger = 0.6;
  if (!c.tricks) T.seed(c, game);
  c.tricks[d.id].on = 0; c.tricks[d.id].n = 0;
  T.practice(game, c, d.id);
  const n = () => c.tricks[d.id].n || 0;
  SB.Creature.tickle(c, game); // too early: held back
  check("a tickle before it does the thing is held back", n() === 0, n() + "/3");
  for (let k = 0; k < 2; k++) {
    game.time += 3;
    c.lastDone = { a: SB.V[d.verb], t: game.time, x: new Float32Array(c.brain.nIn) }; // it just did the thing
    SB.Creature.tickle(c, game);
  }
  check("two good tickles: two lessons", n() === 2, n() + "/3");
  SB.Creature.tickle(c, game);
  check("but not twice for the same go", n() === 2, n() + "/3");
}

console.log("7. a set-up that goes nowhere: another look at 8 s, and a plain \"not biting\" at 16 s");
{
  const { SB, game, cs } = tribe(87, 1);
  const c = cs[0], T = SB.Tricks, d = T.BY.eat;
  c.chem.hunger = 0.2; // not hungry: it won't bite
  if (!c.tricks) T.seed(c, game);
  T.practice(game, c, "eat");
  let nudge = 0, nob = null;
  SB.bus.on("trickNudge", () => nudge++); SB.bus.on("trickNoBite", e => { nob = e; });
  const busy = () => { c.action = { verb: SB.V.wander, phase: "go", x: new Float32Array(c.brain.nIn), start: new Float32Array(SB.N_DRIVES), t: 0, dur: 99 }; c.lastDone = null; c.chem.hunger = 0.2; };
  for (let t = 0; t < 10; t += SB.TICK) { busy(); SB.Game.step(game, SB.TICK); }
  check("8 s in: it takes another look", nudge === 1 && !nob);
  for (let t = 0; t < 8; t += SB.TICK) { busy(); SB.Game.step(game, SB.TICK); }
  check("16 s in: over, and it says why", !!nob && /hungry/.test(nob.why), nob && nob.why);
  check("the lesson is closed, so you can set it up again", !c.trickSession);
}

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
