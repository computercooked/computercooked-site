// The body you live in while possessed (v4.18): thirst, wet fur, a cosy morning, bruises and cuts, nine skills
// that grow by doing, sleeping the night away, and all of it saved on the smol.
// node games/smol-brains/tests/body.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js");
const ctx = load();
["possess.js", "body.js"].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8"), ctx, { filename: f }));
const SB = ctx.SB, P = SB.Possess, B = SB.Body, V = SB.V;
P.headless = true;

let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
function fresh(seed, tier) {
  const g = SB.Game.newGame(seed); SB.Game.current = g; g.headless = true;
  g.tutorial.done = true; g.podT = 1e9; if (g.dir) g.dir.nextT = 1e9;
  g.settings = g.settings || {}; g.settings.povHungry = 1; g.settings.povThreat = "on"; g.settings.povBlobQuest = "done"; g.settings.povQuest = "done";
  const cs = SB.Debug.spawnTier(tier == null ? 2 : tier, 3);
  cs.forEach(c => { c.age = Math.max(c.age, 900); c.asleep = false; c.chem.hunger = 0.1; c.chem.sleepy = 0; c.chem.tired = 0; });
  return { g, cs, c: cs[0] };
}
function run(g, secs) { for (let t = 0; t < secs / SB.TICK; t++) SB.Game.step(g, SB.TICK); }
function noon(g) { const d = SB.DAY_LENGTH, t = Math.floor(g.time / d) * d + d * 0.5; g.time = t; g.world.time = t; }
function calm(g) { g.creatures.forEach(o => { if (o.species === "grump") { o.alive = false; o.gone = true; } }); }
const quiet = () => {};

console.log("1. thirst");
{
  const { g, c } = fresh(11);
  noon(g); P.enter(g, c, { free: true });
  const S = P.state(); S.hungerClock = false;
  check("a new body starts with a full water bar", B.of(c).thirst === 0 && Array.isArray(c.body.wounds));
  run(g, 60);
  const th = c.body.thirst;
  check("a minute in a body makes you a little thirsty", th > 0.1 && th < 0.25, th.toFixed(3));
  c.body.thirst = 0.8;
  check("thirst caps your pep", B.pepCap(c) < 1, String(B.pepCap(c)));
  check("a drink gives most of the bar back", B.drink(c) > 0.55 && c.body.thirst < 0.25, c.body.thirst.toFixed(2));
  c.body.thirst = 1; c.chem.health = 0.9;
  for (let i = 0; i < 400; i++) B.tick(g, c, S, 0.5, quiet);
  check("parched: hearts drain, but never the last of them", c.chem.health < 0.9 && c.chem.health >= 0.2 - 1e-9, c.chem.health.toFixed(3));
  P.leave();
  // the lessons are left alone
  const b2 = fresh(12); noon(b2.g);
  P.enter(b2.g, b2.c, { free: true });
  P.state().hungerClock = true;
  run(b2.g, 30);
  check("no thirst during the first-possession hunger lesson", b2.c.body.thirst === 0, String(b2.c.body.thirst));
  P.leave();
}

console.log("2. wet fur");
{
  const { g, c } = fresh(13);
  noon(g); calm(g);
  const S = { }, w = g.world;
  const shelter = SB.World.shelterAt;
  SB.World.shelterAt = () => null;
  w.weather.rain = 0.8; c.chem.cold = 0;
  for (let i = 0; i < 60; i++) { w.weather.rain = 0.8; B.tick(g, c, S, 0.5, quiet); }
  const wet = c.body.wet;
  check("rain with no roof soaks you", wet >= 0.99, wet.toFixed(2));
  check("wet fur is cold fur", c.chem.cold > 0, c.chem.cold.toFixed(3));
  check("the sign says soaked", B.status(c, g).some(x => x.k === "wet" && x.label === "soaked"));
  SB.World.shelterAt = () => ({ kind: "leanto" });
  for (let i = 0; i < 20; i++) { w.weather.rain = 0.8; B.tick(g, c, S, 0.5, quiet); }
  check("a roof keeps the rain off and dries you slowly", c.body.wet < wet && c.body.wet > 0.4, c.body.wet.toFixed(2));
  // a cloak sheds half
  const d = fresh(14); noon(d.g);
  SB.World.shelterAt = () => null;
  SB.Surv.add(d.c, "cloak", 1);
  for (let i = 0; i < 20; i++) { d.g.world.weather.rain = 0.8; B.tick(d.g, d.c, {}, 0.5, quiet); }
  check("a cloak sheds half the rain", Math.abs(d.c.body.wet - 0.2) < 0.02, d.c.body.wet.toFixed(3));
  SB.World.shelterAt = shelter;
}

console.log("3. skills");
{
  const { g, c } = fresh(15);
  let ups = 0; SB.bus.on("skillUp", d => { if (d.c === c) ups++; });
  check("level 0 to start, no bonus", B.level(c, "chop") === 0 && B.bonus(c, "chop") === 0 && !B.roll(c, "chop"));
  for (let i = 0; i < 4; i++) B.xp(c, "chop", 1);
  check("four swings make level 1", B.level(c, "chop") === 1 && ups === 1, "lv " + B.level(c, "chop"));
  for (let i = 0; i < 7; i++) B.xp(c, "chop", 1);
  check("the next level takes longer", B.level(c, "chop") === 2 && B.progress(c, "chop") === 0, "lv " + B.level(c, "chop") + " x " + c.body.sk.chop.x);
  B.xp(c, "chop", 100000);
  check("skills stop at 10", B.level(c, "chop") === B.MAX && B.progress(c, "chop") === 1 && B.xp(c, "chop", 5) === 0);
  check("level 10 is +50%", Math.abs(B.bonus(c, "chop") - 0.5) < 1e-9);
  let hits = 0; for (let i = 0; i < 10; i++) if (B.roll(c, "chop")) hits++;
  check("a 50% perk lands every other time, no dice", hits === 5, String(hits));
  check("an unknown skill is ignored", B.xp(c, "juggling", 5) === 0 && !c.body.sk.juggling);
  check("running costs less with practice", (B.xp(c, "run", 4), B.runCost(c) < 1));
  // doing things in a body earns it
  const t = fresh(16); noon(t.g);
  P.enter(t.g, t.c, { free: true });
  SB.bus.emit("craft", { c: t.c, id: "x", item: "stick", pov: true });
  SB.bus.emit("fish", { c: t.c });
  SB.bus.emit("grumpChased", { c: t.c });
  check("making, fishing and fighting earn xp while possessed", t.c.body.sk.craft.x === 3 && t.c.body.sk.fish.x === 3 && B.level(t.c, "fight") === 1 && t.c.body.n.made === 1 && t.c.body.n.grumps === 1);
  P.leave();
  SB.bus.emit("fish", { c: t.c });
  check("…and not when the smol does it by itself", t.c.body.n.fish === 1);
}

console.log("4. wounds");
{
  const { g, c } = fresh(17);
  noon(g);
  check("the first blow bruises", B.hurt(c, g) === "bruise" && B.has(c, "bruise") && !B.has(c, "cut"));
  check("a bruise caps your pep", B.pepCap(c) === 0.8, String(B.pepCap(c)));
  B.hurt(c, g);
  check("the third blow cuts", B.hurt(c, g) === "cut" && B.has(c, "cut") && c.body.wounds.length === 2);
  c.chem.health = 0.8;
  const S = {};
  for (let i = 0; i < 40; i++) B.tick(g, c, S, 0.5, quiet);
  check("a cut bleeds", c.chem.health < 0.8 && c.chem.health > 0.7, c.chem.health.toFixed(3));
  c._pov = true;
  SB.bus.emit("povEat", { c: c, kind: "herb" });
  check("healroot closes the cut, the bruise stays", !B.has(c, "cut") && B.has(c, "bruise"));
  B.hurt(c, g); B.hurt(c, g); B.hurt(c, g);
  SB.bus.emit("povEat", { c: c, kind: "potion" });
  check("a brew mends everything", c.body.wounds.length === 0);
  c._pov = false;
  B.wound(c, "bruise", g);
  g.time += B.BRUISE + 1;
  let said = "";
  B.tick(g, c, S, 0.5, m => { said = m; });
  check("a bruise fades by itself", !B.has(c, "bruise") && /faded/.test(said), said);
  // binding with leaves, in a body
  const t = fresh(18); noon(t.g);
  P.enter(t.g, t.c, { free: true });
  B.wound(t.c, "cut", t.g);
  SB.Surv.add(t.c, "leaves", 2);
  const v = SB.Surv.inv(t.c); v.sel = v.s.findIndex(s => s && s.k === "leaves");
  const o = P.options(null);
  check("holding leaves with a cut offers to bind it", o && o.place && /bind/.test(o.place.label), o && o.place && o.place.label);
  if (o && o.place && o.place.fn) o.place.fn(); else if (o && o.place) P.act("place", null);
  check("binding uses a leaf and stops the bleeding", !B.has(t.c, "cut") && SB.Surv.count(t.c, "leaves", true) === 1, "leaves " + SB.Surv.count(t.c, "leaves", true));
  P.leave();
}

console.log("5. a cosy morning");
{
  const { g, c } = fresh(19);
  noon(g); calm(g);
  const shelter = SB.World.shelterAt;
  SB.World.shelterAt = () => ({ kind: "leanto" });
  const S = {}; let said = "";
  c.asleep = true;
  for (let i = 0; i < 50; i++) B.tick(g, c, S, 0.5, quiet);
  c.asleep = false;
  B.tick(g, c, S, 0.5, m => { said = m; });
  check("sleeping under a roof makes a cosy morning", B.cosy(c, g) && /cosy/.test(said), said);
  check("cosy: food lasts longer and pep comes back faster", B.hungerMul(c, g) === 0.75 && B.pepGain(c, g) === 1.5);
  g.time += SB.DAY_LENGTH;
  check("it wears off by the next day", !B.cosy(c, g) && B.hungerMul(c, g) === 1);
  // out in the open
  const d = fresh(20); noon(d.g); calm(d.g);
  SB.World.shelterAt = () => null;
  const S2 = {}; said = "";
  d.c.asleep = true;
  for (let i = 0; i < 50; i++) B.tick(d.g, d.c, S2, 0.5, quiet);
  d.c.asleep = false;
  B.tick(d.g, d.c, S2, 0.5, m => { said = m; });
  check("sleeping rough doesn't", !B.cosy(d.c, d.g) && /rough/.test(said), said);
  SB.World.shelterAt = shelter;
}

console.log("6. sleeping the night away");
{
  const { g, c } = fresh(21);
  P.enter(g, c, { free: true });
  P.state().hungerClock = false;
  const d = SB.DAY_LENGTH, t = Math.floor(g.time / d) * d + d * 0.9;
  g.time = t; g.world.time = t;
  run(g, 1); calm(g);
  c.chem.sleepy = 0.6; c.chem.tired = 0.5;
  P.sleep();
  run(g, 3); calm(g);
  check("asleep at night, the night flies by", c.asleep && g.speed === P.SLEEP_SPEED, "asleep " + c.asleep + " speed " + g.speed);
  c.chem.sleepy = 0; c.chem.tired = 0; c.chem.hunger = 0.1;
  run(g, 20); calm(g);
  check("a possessed smol sleeps on till morning, even rested", c.asleep && g.world.night, "asleep " + c.asleep);
  const th0 = c.body.thirst;
  run(g, 30);
  check("you still get thirsty in your sleep, slowly", c.body.thirst > th0 && c.body.thirst - th0 < 30 * B.THIRST * 0.5, (c.body.thirst - th0).toFixed(4));
  // a grump close by wakes you
  c.asleep = false; c.action = null;
  run(g, 0.5);
  check("awake: time is back to normal", g.speed === 1, "speed " + g.speed);
  P.leave();
  check("leaving gives the old speed back", g.speed === 1);
}

console.log("7. it saves with the smol");
{
  const { g, c } = fresh(22);
  B.xp(c, "mine", 9); B.hurt(c, g); B.of(c).thirst = 0.42; B.count(c, "felled", 3);
  const g2 = SB.Save.revive(JSON.parse(JSON.stringify(SB.Save.snapshot(g))));
  const c2 = g2.creatures.find(o => o.id === c.id);
  check("skills, wounds, thirst and tallies come back", c2 && c2.body && B.level(c2, "mine") === B.level(c, "mine") && B.level(c2, "mine") >= 1 && B.has(c2, "bruise") && Math.abs(c2.body.thirst - 0.42) < 0.01 && c2.body.n.felled === 3, c2 && JSON.stringify(c2.body).slice(0, 120));
  // an old save with no body
  delete c2.body;
  check("an old smol with no body gets a fresh one", B.of(c2).thirst === 0 && B.level(c2, "mine") === 0 && B.status(c2, g2).length === 0);
  c2.body = { thirst: "x", wounds: 3 };
  check("a broken body is mended", B.of(c2).thirst === 0 && Array.isArray(c2.body.wounds) && B.pepCap(c2) === 1);
}

console.log(failed ? "\n" + failed + " FAILED" : "\nall body tests passed");
process.exit(failed ? 1 : 0);
