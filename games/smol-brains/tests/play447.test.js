// 4.47: what the proof pass turned up in skills and social (smol-brains-handover/PROOF-PASS.md).
//   1. the kick course you ask a grown smol for can be asked for: the bag's friends tab has the button when you carry a ball
//   2. the lantern tab's body page no longer calls the sum of skill levels "body level" (the grow tab's number has that name)
//   3. a mastery pick says so when it is earned
//   4. the study line fits the place: carvings on a story pole, a book in a town, neither at a lookout
//   5. the flare in the first pod says where it lies
//   6. a wave place says when it is a storyteller card that is in the way
//   7. a starving kid or elder leaves the hut to eat while a grump stands near home, and goes back in fed (island 102)
// node games/smol-brains/tests/play447.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra != null && extra !== "" ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const dir = path.join(__dirname, "..", "play", "js");
const js = f => fs.readFileSync(path.join(dir, f), "utf8");
const order = (fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8").match(/src="js\/([a-z0-9-]+)\.js"/g) || []).map(s => s.slice(8, -4));
const EXTRA = ["ext", "bosses", "body", "possess", "home", "loot", "friends", "town", "dark", "powers", "fight", "deep", "harvest", "animals", "qol", "wear", "shapes", "wardrobe3", "motion3", "world3", "helpers3", "arrivals3", "minds3"];
// a day-5 island by day with a tribe of five grown thinkers, the tutorial done, nothing going on
function fresh(seed) {
  const ctx = load(), SB = ctx.SB;
  order.filter(n => EXTRA.indexOf(n) >= 0).forEach(n => { if (n === "bosses" && SB.Bosses) return; vm.runInContext(js(n + ".js"), ctx, { filename: n + ".js" }); });
  if (SB.Possess) SB.Possess.headless = true;
  const game = SB.Game.newGame(seed); SB.Game.current = game; game.tutorial.done = true; (game.settings = game.settings || {}).povThreat = "done";
  const sp = game.world.T.spawn, folk = [];
  for (let i = 0; i < 5; i++) { const c = SB.Game.spawnSmol(game, { x: sp.x - 2 + i, z: sp.z + 2, age: 700 }); c.tier = 3; c.stage = 3; folk.push(c); }
  game.time = SB.DAY_LENGTH * 4 + 10 * 50; game.world.time = game.time; game.stats.maxTier = 3; // day 5, ten in the morning
  SB.Dark._h.st(game).raid.truce = game.time + 1e7;
  const run = sec => { for (let t = 0; t < sec; t += SB.TICK) { SB.Game.step(game, SB.TICK); if (SB.Ext && SB.Ext.tick) SB.Ext.tick(game, SB.TICK); folk.forEach(c => { c.chem.health = 1; c.chem.hunger = 0.2; }); } };
  run(1);
  const DR = SB.Director.state(game); DR.active = null; DR.nextT = game.time + 1e6;
  return { SB, game, ctx, folk, run };
}
// a stand-in for the bag's panel: F.wire only asks it for its buttons
function panel(html) {
  const hooks = {};
  return {
    hooks,
    querySelectorAll(sel) {
      const m = /^\[(data-[a-z0-9-]+)\]$/.exec(sel); if (!m) return [];
      const re = new RegExp(m[1] + "='([^']*)'([^>]*)>", "g"), out = []; let x;
      while ((x = re.exec(html))) { const val = x[1], off = /disabled/.test(x[2]); out.push({ off, getAttribute: () => val, addEventListener: (ev, fn) => { (hooks[m[1]] = hooks[m[1]] || []).push({ val, off, fn }); } }); }
      return out;
    }
  };
}

seeded(447, () => {

console.log("1. the kick course can be asked for");
{
  const { SB, game, folk } = fresh(4471), P = SB.Possess, F = SB.Friends, M = SB.Motion3, Surv = SB.Surv, c = folk[0], k = folk[1];
  M.state(game).golf.keeper = -1; // no course of the island's own turns up in the middle of this
  P.enter(game, c, { free: true });
  F._focus = k.id;
  check("with no ball the friends tab has no kick course button", !/data-frcourse/.test(F.html(game, c)));
  Surv.add(c, "ball", 1); Surv.select(c, Surv.inv(c).s.findIndex(x => x && x.k === "ball"));
  const o = P.options(game, c, { type: "creature", id: k.id });
  check("looking at a smol with a ball in the paw, the third button is still \"ask...\" (why the old offer never showed)", !!o.pick && /^ask .+…/.test(o.pick.label) && !/kick course/.test(o.pick.label), o.pick && o.pick.label);
  const h = F.html(game, c);
  check("carrying a ball, the friends tab offers the kick course under \"ask\"", /data-frcourse='1' >[^<]*put up a kick course/.test(h), (h.match(/data-frcourse[^<]*/) || [""])[0]);
  k.tier = 1;
  check("not from a little one", !/data-frcourse/.test(F.html(game, c)) && !M.askCourse(game, c, k).ok);
  k.tier = 3;
  const said = [], root = panel(h);
  F.wire(root, game, c, () => {}, m => said.push(m));
  const b = (root.hooks["data-frcourse"] || [])[0];
  check("the button is wired", !!b && !b.off);
  const f0 = game.world.structures.filter(s => s.kind === "kickflag").length;
  if (b) b.fn();
  const flags = game.world.structures.filter(s => s.kind === "kickflag");
  check("pressing it puts three flags up on dry ground", flags.length === f0 + 3 && flags.every(f => SB.World.depthAt(game.world, f.x, f.z) <= 0.05), flags.length - f0);
  check("the smol you asked is the keeper, and it says so", M.state(game).golf.keeper === k.id && k.kickKeeper === 1 && /put up 3 flags/.test(said.join("|")), said.join("|"));
  const again = M.askCourse(game, c, k);
  check("one new course a day", !again.ok && /a day/.test(again.msg) && game.world.structures.filter(s => s.kind === "kickflag").length === f0 + 3, again.msg);
  game.time += SB.DAY_LENGTH;
  check("the next day it can be asked again", M.askCourse(game, c, k).ok === true);
  Surv.take(c, "ball", Surv.count(c, "ball", true)); game.time += SB.DAY_LENGTH;
  check("never without a ball", !M.askCourse(game, c, k).ok);
  k.x = c.x + 20;
  Surv.add(c, "ball", 1);
  check("from far off the button is greyed", /data-frcourse='1' disabled/.test(F.html(game, c)));
  P.exit && P.exit(game);
}

console.log("2. one number is called body level, not two");
{
  const { SB, game, folk } = fresh(4472), PW = SB.Powers, Fi = SB.Fight, c = folk[0];
  SB.Possess.enter(game, c, { free: true });
  SB.Body.of(c).sk.craft = { l: 3, x: 0 }; c.body.sk.mine = { l: 4, x: 0 };
  PW.page("you");
  const h = PW.html(game, c, x => x);
  check("the lantern tab's body page counts skill levels by that name", /skill levels in all <b>\d+<\/b>/.test(h) && !/body level <b>/.test(h), (h.match(/skill levels in all[^<]*<b>\d+<\/b>[^<]*/) || [""])[0]);
  check("and says how they make a body level", /every three make a body level/.test(h));
  check("the grow tab keeps \"body level\"", /body level \d+/.test(Fi.htmlGrow(game, c)));
}

console.log("3. a mastery pick says so");
{
  const { SB, game, folk, run } = fresh(4473), Fi = SB.Fight, B = SB.Body, P = SB.Possess, c = folk[0], d = folk[1];
  const got = []; SB.bus.on("masteryReady", e => got.push(e));
  P.enter(game, c, { free: true });
  B.of(c).sk.mine = { l: B.MAX, x: 0 };
  check("no pick yet at the top level", Fi.masterLeft(c) === 0);
  let n = 0; while (Fi.masterLeft(c) < 1 && n++ < 400) B.xp(c, "mine", 1);
  check("practice past the top earns a pick", Fi.masterLeft(c) === 1, "after " + n + " practice");
  check("and the island hears it once", got.length === 1 && got[0].c === c && got[0].left === 1, got.length);
  check("the body is told where to pick", /mastery/.test(P.state().madeSay || "") && /grow tab/.test(P.state().madeSay || ""), P.state().madeSay);
  run(0.2);
  B.xp(c, "mine", 3);
  check("more practice short of the next step says nothing more", got.length === 1);
  n = 0; while (Fi.masterLeft(c) < 2 && n++ < 400) B.xp(c, "mine", 1);
  check("the next step is told too", got.length === 2 && Fi.masterLeft(c) === 2, got.length);
  B.of(d).sk.mine = { l: B.MAX, x: 0 };
  let threw = null; try { n = 0; while (Fi.masterLeft(d) < 1 && n++ < 400) B.xp(d, "mine", 1); } catch (e) { threw = e; }
  check("a smol nobody is living as earns its pick with no fuss", !threw && Fi.masterLeft(d) === 1 && got.length === 3, threw ? threw.message : got.length);
}

console.log("4. the study line fits the place");
{
  const { SB, game, folk } = fresh(4474), Fi = SB.Fight, c = folk[0];
  SB.Possess.enter(game, c, { free: true });
  const a = Fi.study(game, c, "t901"), b = Fi.study(game, c, "p902"), r = Fi.study(game, c, "rfire");
  check("a story pole: the carvings", a.ok && /^📖 the carvings show a trick of /.test(a.msg), a.msg);
  check("a lookout or a ruin: the place, no carvings", b.ok && /^📖 this place shows you a trick of /.test(b.msg) && !/carving/.test(b.msg), b.msg);
  check("a town book: the book", r.ok && /^📖 the book shows a trick of /.test(r.msg), r.msg);
  check("each only once", !Fi.study(game, c, "p902").ok);
}

console.log("5. the pod's flare says where it lies");
{
  const { SB, game, folk } = fresh(4475), c = folk[0];
  delete SB.Fight.state(game).flare;
  const n0 = game.world.items.filter(o => o.kind === "arkflare").length, l0 = game.log.length;
  SB.bus.emit("podOpened", { site: { x: c.x + 3, z: c.z } });
  const lines = game.log.slice(Math.max(0, l0 - 2)).map(e => e.text).join("|");
  check("the flare is on the ground by the pod", game.world.items.filter(o => o.kind === "arkflare").length === n0 + 1);
  check("and the island's log says so", /ark flare lay in the pod/.test(lines), lines.slice(-160));
  const l1 = game.log.filter(e => /ark flare lay in the pod/.test(e.text)).length;
  SB.bus.emit("podOpened", { site: { x: c.x + 5, z: c.z } });
  check("only the first pod", game.world.items.filter(o => o.kind === "arkflare").length === n0 + 1 && game.log.filter(e => /ark flare lay in the pod/.test(e.text)).length === l1);
}

console.log("6. a wave place says when a storyteller card is in the way");
{
  const { SB, game, folk } = fresh(4476), D = SB.Dark, DR = SB.Director.state(game), c = folk[0];
  check("nothing on: no such refusal", !/not now/.test(D.waveWhy(game, "arena", c) || ""), D.waveWhy(game, "arena", c));
  DR.active = { id: "x", phase: "ask", choices: [], t0: game.time };
  const w = D.waveWhy(game, "arena", c);
  check("a card waiting: it says so, and where to answer it", /storyteller card is waiting/.test(w || "") && /sky/.test(w || ""), w);
  SB.Surv.add(c, "warhorn", 1);
  const hb = D.blowHorn(game, c);
  check("the war horn says the same", !hb.ok && /storyteller card is waiting/.test(hb.msg), hb.msg);
  DR.active = { id: "x", phase: "run", choices: [], t0: game.time };
  const w2 = D.waveWhy(game, "arena", c);
  check("an event that is running: the island has its hands full", /hands full/.test(w2 || "") && !/card/.test(w2 || ""), w2);
  DR.active = null;
}

console.log("7. a starving elder leaves the hut to eat (island 102's winter)");
{
  const { SB, game, folk } = fresh(4477), W = SB.World, hm = SB.Society.home(game, 0);
  W.addStructure(game.world, game, "hut", hm.x + 3, hm.z, { done: true, rot: 0 });
  const hut = game.world.structures.filter(s => s.kind === "hut" && s.done).sort((a, b) => Math.hypot(a.x - hm.x - 3, a.z - hm.z) - Math.hypot(b.x - hm.x - 3, b.z - hm.z))[0];
  const old = SB.Game.spawnSmol(game, { x: hut.x + 0.3, z: hut.z + 0.3, age: 3300 }); old.tier = 3; old.lifespan = 1e7;
  const pin = { x: hm.x + 12, z: hm.z }, g = SB.Game.spawnGrump(game, pin.x, pin.z); // 12 paces from home, about 9 from the hut
  for (let i = 0; i < 8; i++) SB.Surv.spawn(game, "berry", 1, hut.x - 2 - (i % 4) * 0.8, hut.z + (i < 4 ? 1.5 : -1.5)); // 2 to 5 paces from the hut, away from the grump
  let ate = 0, firstMeal = -1, hidSecs = 0, backIn = false, grumpNear = true, t0 = 0;
  SB.bus.on("eat", d => { if (d && d.c === old) { ate++; if (firstMeal < 0) firstMeal = game.time - t0; } });
  const dHut = () => Math.hypot(old.x - hut.x, old.z - hut.z);
  const go = (sec, each) => { for (let t = 0; t < sec; t += SB.TICK) {
    g.x = pin.x; g.z = pin.z; g.vx = g.vz = 0; g.goingHome = false; g.gone = false; g.chem.health = 1; // the grump stands where it is, whatever anyone does to it
    folk.forEach(c => { c.chem.health = 1; c.chem.hunger = 0.2; });
    if (each) each();
    SB.Game.step(game, SB.TICK); if (SB.Ext && SB.Ext.tick) SB.Ext.tick(game, SB.TICK);
    if (!g.alive || Math.hypot(g.x - hm.x, g.z - hm.z) >= 16) grumpNear = false;
  } };
  // fed: it hides, as before
  go(20, () => { old.chem.hunger = 0.4; old.chem.health = 0.8; });
  check("the elder is an elder, and the grump stands inside 16 paces of home", old.stage === 4 && g.alive && grumpNear, "stage " + old.stage);
  check("fed, it is sent to hide by the game itself, and sits in the hut", !!old.hideAt && dHut() < 1.3 && ate === 0, "hiding " + !!old.hideAt + ", " + dHut().toFixed(1) + " paces from the hut");
  // starving: out to eat, and it lives
  old.chem.hunger = 0.9; old.chem.health = 0.5; t0 = game.time;
  let after = false;
  go(300, () => { if (old.alive && old.hideAt) hidSecs += SB.TICK; if (ate > 0 && old.chem.hunger <= 0.85) after = true; if (after && old.alive && old.hideAt && dHut() < 1.3) backIn = true; });
  check("the grump never left", grumpNear && g.alive);
  check("it was still being told to hide the whole time", hidSecs > 250, Math.round(hidSecs) + "s of 300");
  check("starving, it came out and ate", ate >= 1 && firstMeal >= 0 && firstMeal < 90, ate + " meals, the first after " + Math.round(firstMeal) + "s");
  check("it is alive and well after five minutes", old.alive === true && old.chem.health > 0.2, "health " + (old.chem.health || 0).toFixed(2) + ", hunger " + (old.chem.hunger || 0).toFixed(2));
  check("fed again, it went back into the hut", backIn);
  check("it never got past the point where hunger hurts for long", old.chem.hunger < 0.92, (old.chem.hunger || 0).toFixed(2));
}

});
console.log(failed ? "\n" + failed + " FAILED" : "\nall passed");
process.exit(failed ? 1 : 0);
