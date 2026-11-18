// 4.46: what the proof pass turned up in combat and bosses-threats (smol-brains-handover/PROOF-PASS.md).
//   1. a wave can be fought: the storyteller no longer sends a wave's grumps home the second they arrive
//   1b. a dark pillar can be brought down (the last act needs four)
//   2. the old rule still holds for a plain raider left over from a raid, and an eclipse keeps its grumps to the end
//   3. the ark flare keeps posted grumps off their posts for a day, and a post made later is not held back
//   4. a stink pot only says grumps can't stand it when one of them ran
//   5. a weapon in the paw does not take the second button from the shield, face to face with a grump
//   6. a beast is called by its name under the crosshair
//   7. a thing you throw or fire works from the shallows
// node games/smol-brains/tests/play446.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra != null && extra !== "" ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const dir = path.join(__dirname, "..", "play", "js");
const js = f => fs.readFileSync(path.join(dir, f), "utf8");
const src = f => fs.readFileSync(path.join(__dirname, "..", "src", f), "utf8");
const order = (fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8").match(/src="js\/([a-z0-9-]+)\.js"/g) || []).map(s => s.slice(8, -4));
const EXTRA = ["ext", "bosses", "body", "possess", "home", "loot", "friends", "town", "dark", "powers", "fight", "deep", "harvest", "animals", "qol", "wear", "shapes", "wardrobe3", "motion3", "world3", "helpers3", "arrivals3", "minds3"];
// a day-5 island at night with a tribe of thinkers, the tutorial done, nothing going on
function fresh(seed) {
  const ctx = load(), SB = ctx.SB;
  order.filter(n => EXTRA.indexOf(n) >= 0).forEach(n => { if (n === "bosses" && SB.Bosses) return; vm.runInContext(js(n + ".js"), ctx, { filename: n + ".js" }); });
  if (SB.Possess) SB.Possess.headless = true;
  const game = SB.Game.newGame(seed); SB.Game.current = game; game.tutorial.done = true; (game.settings = game.settings || {}).povThreat = "done";
  const sp = game.world.T.spawn, folk = [];
  for (let i = 0; i < 5; i++) { const c = SB.Game.spawnSmol(game, { x: sp.x - 2 + i, z: sp.z + 2, age: 700 }); c.tier = 3; c.stage = 3; folk.push(c); }
  game.time = SB.DAY_LENGTH * 4 + 22 * 50; game.world.time = game.time; game.stats.maxTier = 3; // day 5, ten at night
  SB.Dark._h.st(game).raid.truce = game.time + 1e7; // no war party of the dark's own turns up by itself in the middle of a check
  const run = sec => { for (let t = 0; t < sec; t += SB.TICK) { SB.Game.step(game, SB.TICK); if (SB.Ext && SB.Ext.tick) SB.Ext.tick(game, SB.TICK); folk.forEach(c => { c.chem.health = 1; c.chem.hunger = 0.2; }); } };
  run(1);
  const DR = SB.Director.state(game); DR.active = null; DR.nextT = game.time + 1e6; // the storyteller is awake, with nothing planned
  return { SB, game, ctx, folk, run, hm: SB.Society.home(game, 0) };
}
const waveGrumps = (SB, game) => game.creatures.filter(g => g.species === "grump" && g.alive && g.dark === "wave");
// chased off the way the game counts it: the grump is gone and the island hears "grumpChased" (as tests/dark.test.js does)
const beat = (SB, g, by) => { g.alive = false; g.gone = true; SB.bus.emit("grumpChased", { c: by, g: g }); };

console.log("1. a wave is not over the second it starts");
{
  const { SB, game, folk, run, hm } = fresh(4461), D = SB.Dark, st = D._h.st(game), X = st.x2;
  check("the dark is open and no storyteller event is on", D.open(game) && !SB.Director.state(game).active);
  const place = D._placeAdd(game, "arena", { x: hm.x + 20, z: hm.z }, {});
  const r = D.startWave(game, "arena", place, folk[0], { place: place.id });
  check("the old ring starts", r.ok === true, r.msg);
  run(0.5);
  const w = st.x2.wave, first = waveGrumps(SB, game);
  check("the first wave is two grumps", !!w && w.i === 0 && first.length === 2, w ? w.i + " / " + first.length : "no wave");
  run(4);
  const w2 = st.x2.wave, now = waveGrumps(SB, game);
  check("four seconds on it is still the first wave (it used to be over by now)", !!w2 && w2.i === 0, w2 ? "wave " + w2.i : "over");
  check("its grumps were not sent home by the storyteller", now.length === 2 && now.every(g => !g.goingHome), now.map(g => g.goingHome ? "home" : "here").join(" "));
  check("and they are still marching on the ring", now.every(g => g.raider && Math.abs(g.raider.x - w2.x) < 0.2));
  // chase the first wave off: the second comes, three strong
  now.forEach(g => beat(SB, g, folk[0]));
  check("each grump chased off is counted by the wave", w2.chased === 2, w2.chased);
  run(1.5);
  const w3 = st.x2.wave, second = waveGrumps(SB, game);
  check("with the first wave chased off, the second comes: three", !!w3 && w3.i === 1 && second.length === 3, w3 ? w3.i + " / " + second.length : "over");
  second.forEach(g => beat(SB, g, folk[0]));
  run(1.5);
  const third = waveGrumps(SB, game);
  check("then the third: four", !!st.x2.wave && st.x2.wave.i === 2 && third.length === 4, third.length);
  third.forEach(g => beat(SB, g, folk[0]));
  const sparks0 = game.sparks, log0 = game.log.length;
  run(1.5);
  const line = game.log.slice(log0).map(l => String(l.text || "")).find(t => /the old ring is over/.test(t)) || "";
  check("nine of nine chased off wins the ring a medal and its pay", !st.x2.wave && /9 of 9 chased off/.test(line) && !/got bored/.test(line) && game.sparks > sparks0, line.slice(0, 90) + " | sparks " + sparks0 + " -> " + game.sparks);
  check("the ring's best medal is kept", (st.x2.medals["wave:arena"] || 0) === 3);
  check("the place's own win ran: the ring pays out loot where it stands", game.world.items.some(o => o.kind === "mote" && SB.dist(o.x, o.z, place.x, place.z) < 3));
  const again = D.placeAct(game, folk[0], place, false);
  folk[0].x = place.x + 1; folk[0].z = place.z;
  const again2 = D.placeAct(game, folk[0], place, false);
  check("the ring's own button: too far says so, close by it starts once a day", again.ok === false && /closer/.test(again.msg) && again2.ok === true && D.placeAct(game, folk[0], place, false).ok === false, again.msg + " | " + again2.msg);
}

console.log("1b. a dark pillar can be brought down");
{
  const { SB, game, folk, run, hm } = fresh(4465), D = SB.Dark, st = D._h.st(game);
  folk.forEach(c => { c.tier = 4; }); game.stats.maxTier = 4;
  const p = D._placeAdd(game, "pillar", { x: hm.x + 20, z: hm.z }, {}), c = folk[0];
  c.x = p.x + 1; c.z = p.z;
  check("its button reads right", D.placeLabel(game, p, false) === "break the dark pillar", D.placeLabel(game, p, false));
  const r = D.placeAct(game, c, p, false), log0 = game.log.length;
  check("breaking it starts its waves", r.ok === true && !!st.x2.wave && st.x2.wave.id === "pillar", r.msg);
  run(3);
  const one = waveGrumps(SB, game);
  check("three seconds on, the first wave of three is still there", st.x2.wave && st.x2.wave.i === 0 && one.length === 3 && one.every(g => !g.goingHome), one.length);
  one.forEach(g => beat(SB, g, c)); run(1.5);
  const two = waveGrumps(SB, game);
  check("then the second, of four", st.x2.wave && st.x2.wave.i === 1 && two.length === 4, two.length);
  two.forEach(g => beat(SB, g, c)); run(1.5);
  const lines = game.log.slice(log0).map(l => String(l.text || ""));
  check("the wave is won", !st.x2.wave && lines.some(t => /a dark pillar is over: 7 of 7 chased off/.test(t)), lines.filter(t => /pillar/.test(t)).join(" | ").slice(0, 160));
  check("the pillar is down: one of four", st.x2.pillars === 1 && lines.some(t => /a dark pillar is down: 1 of 4/.test(t)));
  check("and it is gone from the island", !D.placeById(game, p.id));
}

console.log("2. a plain raider left over from a raid still heads home");
{
  const { SB, game, run, hm } = fresh(4462);
  const g = SB.Game.spawnGrump(game, hm.x + 18, hm.z); g.raider = { x: hm.x, z: hm.z };
  run(2.5);
  check("no event on: the plain raider is sent home", g.goingHome === true);
}
{
  // the eclipse is a storyteller event: fired and answered the way the game does it
  const { SB, game, run } = fresh(4466), DR = SB.Director;
  DR.state(game).nextT = 0;
  DR.fire(game, "eclipse");
  const inc = DR.state(game).active;
  check("the eclipse is a storyteller event", !!inc && inc.id === "eclipse" && inc.phase === "ask", inc && inc.id + ":" + inc.phase);
  DR.choose(game, inc, DR.freeChoice(inc));
  let guard = 0; while (inc.phase !== "on" && guard++ < 200) run(1);
  const eg = () => (inc.grumps || []).map(id => SB.Game.byId(game, id)).filter(Boolean);
  check("it begins, and its grumps march as raiders", inc.phase === "on" && eg().length >= 1 && eg().every(g => g.dark === "eclipse" && g.raider), eg().length);
  run(8);
  check("eight seconds in they are still here", eg().length >= 1 && eg().filter(g => g.alive).every(g => !g.goingHome), eg().map(g => g.goingHome ? "home" : "here").join(" "));
  run(inc.dur - 12);
  check("and just before it ends", DR.state(game).active === inc && eg().filter(g => g.alive).every(g => !g.goingHome));
  run(8);
  check("when the eclipse is over they go home", DR.state(game).active !== inc && eg().filter(g => g.alive).every(g => g.goingHome === true));
}

console.log("3. the ark flare keeps posted grumps off their posts for a day");
{
  const { SB, game, folk, run, hm } = fresh(4463), D = SB.Dark, F = SB.Fight, st = D._h.st(game);
  const at = D._h.spotAt(game, hm.x, hm.z, 20, 26, Math.random, null) || { x: hm.x + 22, z: hm.z };
  const p = D.spawnBeast(game, "starer", at, { quiet: true });
  run(1);
  const g0 = D.grumpOf(game, p.key);
  check("a posted beast stands at its post", !!g0 && g0.alive, p.key);
  SB.Surv.add(folk[0], "arkflare", 1);
  const log0 = game.log.length, r = F.flare(game, folk[0]);
  check("the flare fires and clears it", r.ok === true && r.n >= 1 && !g0.alive, r.msg);
  run(3);
  check("three seconds on, nothing has taken the post up again (it used to be back the next tick)", D.grumpOf(game, p.key) === null);
  check("the post is held off until this time tomorrow", p.off > game.time + SB.DAY_LENGTH - 10 && p.off <= game.time + SB.DAY_LENGTH);
  check("and the island is told", game.log.slice(log0).some(l => /keep off their posts until this time tomorrow/.test(String(l.text || ""))));
  const at2 = D._h.spotAt(game, hm.x, hm.z, 20, 26, Math.random, null) || { x: hm.x - 22, z: hm.z };
  const p2 = D.spawnBeast(game, "starer", at2, { quiet: true });
  run(1);
  check("a beast that turns up after the flare is not held back", !(p2.off > game.time) && !!D.grumpOf(game, p2.key));
  game.time = p.off + 1; game.world.time = game.time;
  run(1);
  const g1 = D.grumpOf(game, p.key);
  check("a day later the post is taken up again", !!g1 && g1.alive && g1 !== g0);
  const data = JSON.parse(JSON.stringify(st.posts.find(q => q.key === p.key)));
  check("the hold is kept with the post (it saves)", typeof data.off === "number");
}

console.log("4. words, buttons and names");
{
  const { SB, game, folk, run, hm } = fresh(4464), D = SB.Dark, F = SB.Fight, P = SB.Possess, S = SB.Surv, c = folk[0];
  const fight = src("fight.js"), poss = src("possess.js");
  check("the stink pot's line waits to see whether anything ran", /if \(T\.line && !T\.flee\) say\(T\.line\);/.test(fight) && /say\(out\.hit && !ran \? "💨 phew! but a grump on guard or on the hunt won't run from a smell" : T\.line\)/.test(fight));
  check("a grump that could not be scared does not count as having run", /if \(T\.flee && \(scare\(g, x, z, T\.flee\) \|\| pinned\(g\)\)\) ran\+\+;/.test(fight));
  check("water under the crosshair does not block a throw or a shot", /var shootable = !r \|\| g \|\| r\.type === "water" \|\|/.test(fight));
  check("looking well up from the shallows is not looking at water", /if \(fy < 0\.35 && SB\.World\.depthAt\(w, ex, ez\) > 0\.12\) return \{ type: "water"/.test(poss));
  // face to face with a grump, a club in the paw and a shield in the bag
  const at = D._h.spotAt(game, hm.x, hm.z, 20, 26, Math.random, null) || { x: hm.x + 22, z: hm.z };
  const p = D.spawnBeast(game, "echo", at, { quiet: true });
  run(1);
  const g = D.grumpOf(game, p.key);
  c.x = g.x + 1.4; c.z = g.z; P.enter(game, c, { free: true });
  S.add(c, "club", 1); S.add(c, "shield", 1);
  const v = S.inv(c), ci = v.s.findIndex(s => s && s.k === "club"); S.select(c, ci);
  const o = P.options(game, c, { type: "creature", id: g.id });
  check("the club is in the paw", S.heldKind(c) === "club");
  check("the crosshair calls the beast by its name", o.name === "a memory echo", o.name);
  check("the second button raises the shield, not \"put down the club\"", !!o.place && o.place.label === "raise your shield", o.place && o.place.label);
  o.place.go();
  const o2 = P.options(game, c, { type: "creature", id: g.id });
  check("guard up, it bashes", F.guarding(c) && !!o2.place && o2.place.label === "bash with your shield", o2.place && o2.place.label);
  const plain = SB.Game.spawnGrump(game, c.x + 1.2, c.z + 1);
  check("a plain grump is still \"grump\"", P.options(game, c, { type: "creature", id: plain.id }).name === "grump");
  S.spawn(game, "apple", 1, c.x + 0.5, c.z + 0.5, {});
  const apple = game.world.items.filter(o => o.kind === "apple" && SB.dist(o.x, o.z, c.x, c.z) < 2)[0];
  check("an apple lies at your feet", !!apple);
  if (apple) { const o3 = P.options(game, c, { type: "item", id: apple.id }); check("looking at something else, the second button is not the shield", !o3.place || !/shield|brace|guard/.test(o3.place.label), o3.place && o3.place.label); }
}

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
