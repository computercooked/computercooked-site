// The island after dark (v4.19): difficulty, true darkness and torches, the prowler, a bed to wake at,
// the iron tier, and a survival run.
// node games/smol-brains/tests/wilds.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js");
const ctx = load();
["possess.js", "body.js", "wilds.js"].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8"), ctx, { filename: f }));
const SB = ctx.SB, P = SB.Possess, B = SB.Body, W = SB.Wilds, Sv = SB.Surv;
P.headless = true;

let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
function fresh(seed, tier) {
  const g = SB.Game.newGame(seed); SB.Game.current = g; g.headless = true;
  g.tutorial.done = true; g.podT = 1e9; if (g.dir) g.dir.nextT = 1e9;
  g.settings = g.settings || {}; g.settings.povHungry = 1; g.settings.povThreat = "done"; g.settings.povBlobQuest = "done"; g.settings.povQuest = "done";
  const cs = SB.Debug.spawnTier(tier == null ? 2 : tier, 3);
  cs.forEach(c => { c.age = Math.max(c.age, 900); c.asleep = false; c.chem.hunger = 0.1; c.chem.sleepy = 0; c.chem.tired = 0; B.of(c); });
  return { g, cs, c: cs[0] };
}
function at(g, frac) { const d = SB.DAY_LENGTH, t = Math.floor(g.time / d) * d + d * frac; g.time = t; g.world.time = t; g.world.night = frac < 0.18 || frac > 0.82; }
function calm(g) { g.creatures.forEach(o => { if (o.species === "grump") { o.alive = false; o.gone = true; } }); }
function hold(c, kind) { Sv.add(c, kind, 1); Sv.select(c, Sv.inv(c).s.findIndex(s => s && s.k === kind)); }
function open(g, c) { // somewhere with no roof and no fire
  const realS = SB.World.shelterAt, realF = B.litFireNear;
  SB.World.shelterAt = () => null; B.litFireNear = () => false;
  return () => { SB.World.shelterAt = realS; B.litFireNear = realF; };
}
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");

console.log("1. how hard it bites");
{
  const { g, c, cs } = fresh(21);
  at(g, 0.5); P.enter(g, c, { free: true });
  check("normal by default, and it changes nothing", W.level(g) === "normal" && W.needMul(g) === 1 && W.biteMul(g, c) === 1);
  const h0 = P.hungerRate();
  check("harsh makes you hungrier", W.set(g, "harsh") && Math.abs(P.hungerRate() / h0 - 1.3) < 1e-9);
  check("and bites on you hurt more, but not on anyone else", W.biteMul(g, c) === 1.4 && W.biteMul(g, cs[1]) === 1);
  check("cosy slows your needs", W.set(g, "cosy") && Math.abs(P.hungerRate() / h0 - 0.75) < 1e-9);
  check("a made-up level is refused", !W.set(g, "nightmare") && W.level(g) === "cosy");
  const S = P.state(); S.hungerClock = false; c.body.thirst = 0;
  for (let i = 0; i < 60; i++) B.tick(g, c, S, 1, () => {});
  const cosyT = c.body.thirst; c.body.thirst = 0; W.set(g, "harsh");
  for (let i = 0; i < 60; i++) B.tick(g, c, S, 1, () => {});
  check("thirst follows the level too", c.body.thirst > cosyT * 1.6, cosyT.toFixed(3) + " -> " + c.body.thirst.toFixed(3));
  const back = SB.Save.revive(JSON.parse(JSON.stringify(SB.Save.snapshot(g))));
  check("the level is saved with the island", back.settings.wilds === "harsh");
  P.leave();
  check("with nobody possessed, nothing scales", W.biteMul(g, c) === 1);
}

console.log("2. true darkness, and what keeps it off");
{
  const { g, c } = fresh(22);
  calm(g); at(g, 0.95); P.enter(g, c, { free: true });
  const S = P.state(); S.firstNight = false; S.nightChase = false;
  const mk = () => ({ night: 1, sky: [0.3, 0.3, 0.4], gnd: [0.2, 0.2, 0.3], sun: [0.4, 0.4, 0.5], fog: [0.2, 0.2, 0.3] });
  const e1 = mk(); W.env(e1, 1);
  check("a night in a body is darker than it was", e1.gnd[0] < 0.2 * 0.6 && e1.sky[2] < 0.4 * 0.6, e1.gnd[0].toFixed(3));
  check("but never black on normal", e1.gnd[0] > 0.2 * 0.4);
  W.set(g, "harsh"); const e2 = mk(); W.env(e2, 1);
  W.set(g, "cosy"); const e3 = mk(); W.env(e3, 1);
  check("harsh is blacker, cosy stays dim", e2.gnd[0] < e1.gnd[0] && e3.gnd[0] > e1.gnd[0]);
  W.set(g, "normal");
  const e4 = mk(); e4.night = 0; W.env(e4, 1);
  check("the day is untouched", e4.gnd[0] === 0.2 && e4.sky[0] === 0.3);
  const e5 = mk(); W.env(e5, 0);
  check("and so is the sky view", e5.gnd[0] === 0.2);
  S.firstNight = true; const e6 = mk(); W.env(e6, 1); S.firstNight = false;
  check("the first night keeps its old light", e6.gnd[0] === 0.2);
  const done = open(g, c);
  check("out in the open with empty paws you're in the dark", W.lit(g, c) === "");
  check("the chip says so", W.chips(g, c, S).some(x => x.k === "dark" && x.bad));
  hold(c, "torch");
  check("a held torch keeps it off", W.lit(g, c) === "torch" && W.chips(g, c, S).some(x => x.k === "torch" && !x.bad));
  done();
  check("render.js asks wilds for the dark after the eyes adjust", /SB\.Wilds\.env\(env, povAdj\)/.test(js("render.js")));
  P.leave();
}

console.log("3. a bed, and waking there");
{
  const { g, c } = fresh(23);
  calm(g); at(g, 0.5); P.enter(g, c, { free: true });
  const S = P.state();
  check("no bed to start with", W.bed(g, c) === null);
  const hx = c.x, hz = c.z;
  const st = SB.World.addStructure(g.world, g, "leanto", hx, hz, { done: true, rot: 0 });
  c.asleep = true; W.tick(g, c, S, 0.1); c.asleep = false;
  check("sleeping under a lean-to makes it your bed", !!W.bed(g, c) && c.body.bed.kind === "leanto");
  Sv.add(c, "stick", 3);
  // walk off and fall
  let fx = hx, fz = hz;
  for (let a = 0; a < 16; a++) { const x = hx + Math.sin(a * 0.39) * 8, z = hz + Math.cos(a * 0.39) * 8; if (SB.World.walkable(g.world, x, z)) { fx = x; fz = z; break; } }
  c.x = fx; c.z = fz; c.chem.health = 0; c.chem.hunger = 0.95; c.body.thirst = 0.95;
  let woke = null; SB.bus.on("respawn", d => { woke = d; });
  const r = P.ko(c, "grump");
  check("you fall, and you're still in the body", r === true && P.state() && P.state().c === c);
  check("you wake at the lean-to", SB.dist(c.x, c.z, hx, hz) < 0.01 && !c.asleep, c.x + "," + c.z);
  check("half healed, and not starving", c.chem.health === W.WAKE_HEALTH && c.chem.hunger <= 0.7 && c.body.thirst <= 0.7);
  check("your things stayed where you fell", Sv.count(c, "stick") === 0 && woke && woke.items.some(i => i.k === "stick"));
  check("and a marker points back to them", S.goal && S.goal.pack === 1 && S.goal.x === fx && S.goal.z === fz);
  c.x = fx; c.z = fz; W.tick(g, c, S, 0.1);
  check("the marker goes when you get there", !S.goal);
  check("the fall is counted", c.body.n.falls === 1);
  const back = SB.Save.revive(JSON.parse(JSON.stringify(SB.Save.snapshot(g))));
  const bc = back.creatures.find(o => o.id === c.id);
  check("the bed is saved on the smol", bc && bc.body && bc.body.bed && bc.body.bed.kind === "leanto");
  st.done = false;
  check("a bed that's gone is no bed", W.bed(g, c) === null);
  c.chem.health = 0;
  check("with no bed you go back to the sky, as before", P.ko(c, "grump") === true && P.state() === null);
}

console.log("4. the prowler");
{
  const { g, c } = fresh(24);
  calm(g); at(g, 0.95); P.enter(g, c, { free: true });
  const S = P.state(); S.firstNight = false; S.nightChase = false;
  const done = open(g, c);
  for (let i = 0; i < 12; i++) W.tick(g, c, S, 1);
  check("standing in the dark, nothing yet", S.prowl == null && S.darkT > 10);
  for (let i = 0; i < 20 && S.prowl == null; i++) W.tick(g, c, S, 1);
  const pr = S.prowl != null ? SB.Game.byId(g, S.prowl) : null;
  check("after " + W.PROWL_DARK + " s in the dark a prowler comes", !!pr && pr.prowler === 1 && pr.species === "grump" && pr.scout && pr.scout.who === c.id);
  check("it starts a way off", pr && Math.abs(SB.dist(pr.x, pr.z, c.x, c.z) - W.PROWL_FAR) < 0.5);
  check("its bite can end you", pr && pr.scout.lethal === 1 && /sc\.lethal \? 0 : 0\.25/.test(js("creature.js")));
  check("the chip shouts", W.chips(g, c, S).some(x => x.k === "prowl"));
  hold(c, "torch"); pr.scout.t = 4; W.tick(g, c, S, 0.1);
  check("light sends it off", S.prowl == null && (!pr.scout || pr.scout.done) && c.body.n.prowlers === 1);
  S.prowlGap = 0; Sv.take(c, "torch", 1);
  for (let i = 0; i < 40; i++) W.tick(g, c, S, 1);
  check("one a night on normal", S.prowl == null && S.prowlN === 1);
  at(g, 0.5); W.tick(g, c, S, 0.1); at(g, 0.95);
  W.set(g, "cosy");
  for (let i = 0; i < 40; i++) W.tick(g, c, S, 1);
  check("none at all on cosy", S.prowl == null && !S.prowlN);
  W.set(g, "normal"); g.settings.povThreat = "on";
  for (let i = 0; i < 40; i++) W.tick(g, c, S, 1);
  check("and none before the first grump lesson is over", S.prowl == null);
  g.settings.povThreat = "done";
  for (let i = 0; i < 40 && S.prowl == null; i++) W.tick(g, c, S, 1);
  const p2 = SB.Game.byId(g, S.prowl);
  at(g, 0.5); W.tick(g, c, S, 0.1);
  check("dawn ends it", !!p2 && S.prowl == null);
  at(g, 0.95); S.prowlGap = 0; S.prowlN = 0;
  for (let i = 0; i < 40 && S.prowl == null; i++) W.tick(g, c, S, 1);
  const p3 = SB.Game.byId(g, S.prowl);
  c.chem.health = 0; SB.bus.emit("scoutHit", { c: c, g: p3 });
  check("a last bite with no bed sends you back to the sky", P.state() === null);
  check("and it loses the scent", !p3.scout || p3.scout.done);
  done();
  const { g: g2, c: b } = fresh(25, 0);
  calm(g2); at(g2, 0.95); P.enter(g2, b, { free: true });
  const S2 = P.state(); S2.firstNight = false; S2.nightChase = false;
  const done2 = open(g2, b);
  for (let i = 0; i < 60; i++) W.tick(g2, b, S2, 1);
  check("blobs are left alone", S2.prowl == null);
  done2(); P.leave();
}

console.log("5. the iron tier");
{
  const K = SB.KINDS || SB.K;
  check("the tools are real tools", ["ironaxe", "ironpick", "sword"].every(k => Sv.TOOL[k] && Sv.TOOL[k].uses >= 500) && Sv.TOOL.ironaxe.wood > Sv.TOOL.axe.wood && Sv.TOOL.ironpick.ore > Sv.TOOL.stonepick.ore && Sv.TOOL.sword.dmg > Sv.TOOL.club.dmg);
  check("every iron thing has an icon and a mesh", ["ironore", "iron", "ironaxe", "ironpick", "sword"].every(k => new RegExp("\\n    " + k + ": \\[").test(js("survival-art.js")) && new RegExp("\\n    " + k + ": function").test(js("survival-art.js")) && new RegExp("\\n    " + k + ": \\{ noun").test(js("core.js"))));
  const ids = Sv.allRecipes().map(r => r.id);
  check("four new recipes", ["iron", "ironaxe", "ironpick", "sword"].every(i => ids.indexOf(i) >= 0));
  const { g, c } = fresh(26, 5);
  calm(g); at(g, 0.5); P.enter(g, c, { free: true });
  Sv.add(c, "ironore", 1); Sv.add(c, "log", 1);
  check("iron is past a brain that doesn't know kilns", !Sv.craft(c, g, "iron").ok && Sv.count(c, "ironore") === 1);
  c.ideas.kiln = 1;
  const kiln = Sv.nearKiln; Sv.nearKiln = () => false;
  check("iron needs a lit kiln", !Sv.craft(c, g, "iron").ok);
  Sv.nearKiln = () => true;
  const r1 = Sv.craft(c, g, "iron");
  check("ore and a log in the kiln make iron", r1.ok && Sv.count(c, "iron") === 1 && Sv.count(c, "ironore") === 0, r1.msg);
  check("working it out teaches smelting", SB.Ideas.known(c, "smelt"));
  Sv.nearKiln = kiln;
  Sv.add(c, "stick", 1); Sv.add(c, "vine", 1);
  const r2 = Sv.craft(c, g, "ironpick");
  check("iron, a stick and a vine make an iron pick", r2.ok && Sv.count(c, "ironpick") === 1, r2.msg);
  check("the crafting grid finds it too", (Sv.match(["iron", "iron", "stick"]) || {}).id === "sword" && (Sv.match(["metal", "stick"]) || {}).id === "axe");
  P.leave();
  const { g: g3, c: t } = fresh(27, 2);
  calm(g3); at(g3, 0.5);
  check("a tool-user's brain can't see iron yet", !Sv.craft(t, g3, "iron").ok);
  const vein = (c2) => SB.World.addNode(g3.world, g3, "orevein", c2.x + 0.8, c2.z, 1);
  function dig(c2, n) { const gave = []; for (let i = 0; i < 40 && n.state !== "gone"; i++) { const r = Sv.hitNode(c2, g3, n, "stonepick"); (r.gave || []).forEach(k => gave.push(k)); } return gave; }
  const a = dig(t, vein(t));
  check("a villager digging a vein gets copper ore, as before", a.length === 3 && a.every(k => k === "ore"), a.join(","));
  P.enter(g3, t, { free: true });
  const b = dig(t, vein(t));
  check("dig one out yourself with a pick and its heart is iron ore", b.length === 3 && b[2] === "ironore" && b[0] === "ore", b.join(","));
  P.leave();
}

console.log("6. a survival run");
{
  const { g, c } = fresh(28);
  calm(g); at(g, 0.5);
  check("no run without a body", !W.startRun(g));
  P.enter(g, c, { free: true });
  W.set(g, "harsh");
  check("a run starts", W.startRun(g) && g.settings.run && g.settings.run.level === "harsh" && g.settings.run.who === c.id);
  check("and locks the level", !W.set(g, "cosy") && W.level(g) === "harsh");
  g.time += SB.DAY_LENGTH * 2.5;
  check("it counts the days", Math.abs(W.runDays(g) - 2.5) < 1e-9 && W.chips(g, c, P.state()).some(x => x.k === "run" && x.label === "day 3"));
  check("the you tab shows it", /day 3/.test(W.youHtml(g, c)) && /data-wilds='harsh'/.test(W.youHtml(g, c)));
  const back = SB.Save.revive(JSON.parse(JSON.stringify(SB.Save.snapshot(g))));
  check("the run is saved", back.settings.run && back.settings.run.level === "harsh");
  SB.World.addStructure(g.world, g, "leanto", c.x, c.z, { done: true, rot: 0 });
  c.asleep = true; W.tick(g, c, P.state(), 0.1); c.asleep = false;
  let end = null; SB.bus.on("runEnd", r => { end = r; });
  c.chem.health = 0;
  check("harsh is one life: a bed doesn't save you", !!W.bed(g, c) && P.ko(c, "grump") === true && P.state() === null);
  check("the run ends with your days", end && end.days === 2.5 && end.level === "harsh" && end.best === true && !g.settings.run);
  check("and the best is kept", g.settings.runBest === 2.5 && g.settings.runBestLevel === "harsh");
  P.cooldownUntil = 0; c.asleep = false; c.chem.health = 1;
  P.enter(g, c, { free: true }); W.set(g, "normal"); W.startRun(g); g.time += SB.DAY_LENGTH;
  c.chem.health = 0;
  check("on normal the bed saves the run", P.ko(c, "grump") === true && P.state() && g.settings.run.falls === 1);
  P.leave();
  check("a shorter run doesn't beat the best", end.days === 1 && end.best === false && g.settings.runBest === 2.5);
}

console.log("7. wired in");
{
  const html = fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8"), hud = js("povhud.js"), pos = js("possess.js");
  check("wilds.js loads after body.js and before the hud", html.indexOf("js/body.js") < html.indexOf("js/wilds.js") && html.indexOf("js/wilds.js") < html.indexOf("js/povhud.js"));
  check("possess.js ticks it awake and asleep, and asks it before a knockout", (pos.match(/SB\.Wilds\.tick\(game, c, S, dt\)/g) || []).length === 2 && /SB\.Wilds\.respawn\(game, c, cause, items\)/.test(pos));
  check("the hud shows the chips and the you tab", /SB\.Wilds\.chips\(game, c, s\)/.test(hud) && /SB\.Wilds\.youHtml\(s\.game, c\)/.test(hud) && /SB\.Wilds\.wire\(root, s\.game, drawBag\)/.test(hud));
  check("no sound is made in code", !/AudioContext|createOscillator/.test(js("wilds.js")));
}

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
