// "the dark fights back": what a beaten captain changes, named grumps with bounties, the storytellers and mercy,
// nine new storyteller cards, the notice board, factions with standing, raids with shape, two side stories.
// round 2 (sections 13 to 26): the table of beasts, the big ones, waves, skies, places, quest lines, visitors, wishes,
// gatherings, the council, the watch, the Lantern's score, and a day of the whole game with all of it running.
// node games/smol-brains/tests/dark.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");

seeded(4340, () => {
  const ctx = load();
  ["ext.js", "bosses.js", "possess.js", "home.js", "loot.js", "dark.js"].forEach(f => { if (!(f === "bosses.js" && ctx.SB.Bosses)) vm.runInContext(js(f), ctx, { filename: f }); });
  const SB = ctx.SB, P = SB.Possess, D = SB.Dark, Surv = SB.Surv, B = SB.Bosses, DR = SB.Director; P.headless = true;
  const game = SB.Game.newGame(133); SB.Game.current = game; game.tutorial.done = true;
  SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod));
  const me = SB.Game.smols(game)[0]; me.tier = 3; me.stage = 3;
  (game.settings = game.settings || {}).povThreat = "done";
  const hm = SB.Society.home(game, 0);
  const ev = {}; ["darkLift", "darkNamed", "darkNamedBeaten", "darkDuel", "darkCall", "darkTheft", "darkSnuff", "bountyDone", "bountyPrize", "standing", "mercy", "darkSiege", "darkTruce", "darkChief", "darkChiefDown", "darkScouts", "darkScoutsEnd", "darkPage", "darkChain", "incident", "darkJoined", "darkWard", "darkRest", "notice"].forEach(n => { ev[n] = 0; SB.bus.on(n, () => ev[n]++); });
  const s = () => D.state(game);
  const put = (c, x, z) => { c.x = x; c.z = z; c.px = x; c.pz = z; };
  const beat = (g, by) => { g.alive = false; g.gone = true; SB.bus.emit("grumpChased", { c: by || me, g: g }); };
  const tick = () => D.tick(game, 3);
  const clearGrumps = () => { game.creatures = game.creatures.filter(c => c.species !== "grump"); };

  console.log("1. the new things exist, and the captains are as they were");
  check("six new items, two new places, a new blade", ["duskshard", "cinder", "starmetal", "duskcharm", "warhorn", "lightblade"].every(k => !!SB.KINDS[k]) && !!SB.STRUCTS.lightwell && !!SB.STRUCTS.noticeboard && Surv.TOOL.lightblade.dmg === 2.5);
  check("the three captains' numbers are untouched", B.BY.gloom.tough === 2.3 && B.BY.murk.tough === 5 && B.BY.night.tough === 9 && B.BY.gloom.dmg === 0.15 && B.BY.night.armour === 1.25);
  check("nine new cards are in the storyteller's deck", ["eclipse", "meteors", "healer", "beetles", "caravan", "cold", "refugee", "foundling", "machine"].every(id => DR[id] && DR.DECK.indexOf(DR[id]) >= 0) && DR.DECK.length >= 20, "" + DR.DECK.length);
  check("every table names real items", D.ASKS.every(a => !!SB.KINDS[a[0]]) && D.FORGE.every(f => !!SB.KINDS[f.id] && Object.keys(f.cost).every(k => !!SB.KINDS[k])) && Object.keys(D.LIFTS).every(id => !!SB.KINDS[D.LIFTS[id].item] && D.LIFTS[id].nodes.every(n => !!SB.NODES[n])));
  check("four named grumps, three storytellers and the old tale, three factions", D.NAMED.length === 4 && D.TELLERS.length === 4 && D.FACTIONS.slice(0, 3).map(f => f.id).join() === "grumps,far,wild");

  console.log("2. a new island, and an old save");
  let threw = "";
  try { tick(); delete game.quests.dark; tick(); D.dawn(game); D.dusk(game); SB.Ext.goals(game, () => {}); } catch (e) { threw = String(e && e.stack || e); }
  check("nothing throws with nobody possessed, or on a save with none of this", !threw, threw.slice(0, 200));
  check("the council's board stands by the nest", game.world.structures.filter(b => b.kind === "noticeboard").length === 1 && SB.dist(game.world.structures.find(b => b.kind === "noticeboard").x, game.world.structures.find(b => b.kind === "noticeboard").z, hm.x, hm.z) < 6);
  check("and something is posted on it", D.board(game).list.length >= 1 && D.board(game).list.some(e => e.kind === "bring"), D.board(game).list.map(e => e.t).join(" | "));
  check("standings start where they should", D.standing(game, "grumps") === -40 && D.standing(game, "far") === 0 && D.rank(game, "grumps").key === "enemies" && D.rank(game, "wild").key === "shy");

  console.log("3. beating a captain changes the island");
  game.time = SB.DAY_LENGTH * 2.3; game.stats.maxTier = 4;
  const bl = B.place(game).list, nodes0 = game.world.nodes.length, gs0 = D.standing(game, "grumps");
  B.win(game, B.BY.gloom, me);
  const well = D.wellOf(game, "gloom");
  check("Gloom falls: the dusk lifts, for good", D.lifted(game, "gloom") && ev.darkLift === 1 && !D.lifted(game, "murk"));
  check("a well of light stands at the lair", !!well && SB.dist(well.x, well.z, bl.gloom.x, bl.gloom.z) < 3);
  check("new things grow round it", game.world.nodes.length > nodes0 && game.world.items.some(o => o.kind === "duskshard" && SB.dist(o.x, o.z, bl.gloom.x, bl.gloom.z) < 6), (game.world.nodes.length - nodes0) + " nodes");
  check("and the grumps think less of you", D.standing(game, "grumps") === gs0 - 15);
  bl.murk.beaten = true; tick();
  check("a captain beaten before this was built is caught up", D.lifted(game, "murk") && !!D.wellOf(game, "murk"));
  // Gloom's light: night grumps lose their nerve
  game.world.night = true;
  for (let i = 0; i < 40; i++) SB.Game.spawnGrump(game, hm.x + 30 + i * 0.1, hm.z + 30);
  tick();
  const turned = game.creatures.filter(c => c.species === "grump" && c.goingHome).length;
  check("with Gloom gone, about a third of the night grumps turn back", turned >= 6 && turned <= 22 && s().n.turned === turned, turned + " of 40");
  clearGrumps();
  // Murk's light: fires keep themselves at night
  const fire = SB.World.addStructure(game.world, game, "campfire", hm.x + 3, hm.z + 2, { done: true });
  fire.data.fuel = 0.05; fire.data.lit = true; tick();
  check("with Murk gone, a village fire does not die in the night", fire.data.fuel >= 0.3 && fire.data.lit);
  game.world.night = false;
  // the well
  put(me, well.x + 30, well.z); P.enter(game, me, { free: true });
  const wref = { type: "struct", id: well.id };
  check("look at the well: rest in the light", /rest in the light/.test((P.options(game, me, wref).use || {}).label || "") && /light forge/.test((P.options(game, me, wref).place || {}).label || ""));
  check("not from far away", !D.rest(game, me, well).ok);
  put(me, well.x + 1.5, well.z); me.chem.health = 0.4;
  const sh0 = Surv.count(me, "duskshard", true), r1 = D.rest(game, me, well);
  check("resting mends every heart and leaves a dusk shard", r1.ok && me.chem.health === 1 && Surv.count(me, "duskshard", true) === sh0 + 1 && ev.darkRest === 1, r1.msg);
  check("once a day", !D.rest(game, me, well).ok && /resting/.test((P.options(game, me, wref).use || {}).label || ""));
  // the forge
  Surv.add(me, "duskshard", 2); Surv.add(me, "vine", 1);
  check("the forge shows what its light can make, and not the Long Night's blade yet", D.forgeWhy(game, me, "duskcharm") === "" && /captain/.test(D.forgeWhy(game, me, "lightblade")));
  const f1 = D.forge(game, me, "duskcharm");
  check("forge a dusk charm at the well", f1.ok && Surv.count(me, "duskcharm", true) === 1, f1.msg);
  check("with it in your bag every hit lands a quarter harder", SB.Ext.damage(game, me, {}, { hk: null, dmg: 1 }) === 1.25);
  Surv.add(me, "cinder", 1); Surv.add(me, "stick", 1); put(me, well.x + 40, well.z);
  check("away from a well the forge is cold", /well of light/.test(D.forgeWhy(game, me, "torch")));
  // a cinder
  const gw = SB.Game.spawnGrump(game, me.x + 3, me.z), gb0 = Surv.count(me, "cinder", true);
  const w1 = D.ward(game, me);
  check("a cinder lit as a ward fire sends a grump running", w1.ok && gw.goingHome && Surv.count(me, "cinder", true) === gb0 - 1 && ev.darkWard === 1, w1.msg);
  clearGrumps();

  console.log("4. named grumps");
  const pS = D.spawnNamed(game, "snatch"), gS = D.grumpOf(game, "named-snatch");
  check("Snatch is out there, with a name and its own hide", !!pS && !!gS && gS.name === "Snatch" && gS.tough === 1.6 && gS.scout && gS.scout.hold && !gS.boss && ev.darkNamed === 1);
  check("and there is a bounty on the board", D.board(game).list.some(e => e.kind === "named" && e.ref === "named-snatch" && !e.done && e.pay === 6));
  check("only one Snatch", D.spawnNamed(game, "snatch") === null && D.namedOut(game).length === 1);
  // its twist: it steals at night
  game.world.night = true; Surv.spawn(game, "berry", 1, hm.x + 1, hm.z + 1); pS.tw = 29; put(me, hm.x + 60, hm.z);
  tick();
  check("at night Snatch takes something from the village", pS.stolen.length === 1 && ev.darkTheft === 1, pS.stolen.join(","));
  game.world.night = false;
  // the duel
  put(me, pS.x + 3, pS.z); me.chem.health = 1; tick();
  check("walk up in a body and it comes for you", P.scout() === gS && !gS.scout.hold && ev.darkDuel === 1);
  put(me, pS.x + 40, pS.z); tick();
  check("walk away and it lets you go", !P.scout() || P.scout() !== gS);
  tick();
  check("it goes back to waiting where it stood", !!D.grumpOf(game, "named-snatch") && D.grumpOf(game, "named-snatch").scout.hold && SB.dist(gS.x, gS.z, pS.x, pS.z) < 2);
  const purse0 = me.purse || 0, gst0 = D.standing(game, "grumps");
  beat(gS);
  const bS = D.board(game).list.find(e => e.ref === "named-snatch");
  check("beat it: the bounty is paid into your purse", bS.done && (me.purse || 0) === purse0 + 6 + 3 && ev.darkNamedBeaten === 1 && ev.bountyDone >= 1, "purse " + me.purse);
  check("what it stole is lying where it stood", game.world.items.some(o => o.kind === pS.stolen[0] && SB.dist(o.x, o.z, pS.x, pS.z) < 3) && !D.postOf(game, "named-snatch"));
  check("the grumps like you less for it", D.standing(game, "grumps") === gst0 - 6);
  check("and something odd was in its sack (a found thing)", D.hasPage(game, "b1"));
  // Snuff, and letting one go
  const pF = D.spawnNamed(game, "snuff"), gF = D.grumpOf(game, "named-snuff");
  game.world.night = true; fire.data.fuel = 0.8; fire.data.lit = true; pF.tw = 39; tick();
  check("Snuff puts a fire out", fire.data.lit === false && fire.data.fuel === 0 && ev.darkSnuff === 1);
  game.world.night = false;
  check("you can't let a fresh one go", !D.release(game, me, gF).ok);
  put(me, pF.x + 2, pF.z); me.chem.health = 1; tick();
  gF.whacked = 4; // more than half way
  const gref = { type: "creature", id: gF.id }, gst1 = D.standing(game, "grumps"), purse1 = me.purse || 0;
  check("beaten down, the button offers mercy", /let Snuff go/.test((P.options(game, me, gref).place || {}).label || ""), D.hp(game, "named-snuff").toFixed(2));
  const rl = D.release(game, me, gF);
  check("let it go: half the bounty, and the grumps remember", rl.ok && D.standing(game, "grumps") === gst1 + 10 && (me.purse || 0) === purse1 + 4 && !D.postOf(game, "named-snuff"), rl.msg);
  // Howl calls others
  game.stats.maxTier = 4;
  const pH = D.spawnNamed(game, "howl"), gH = D.grumpOf(game, "named-howl");
  put(me, pH.x + 2, pH.z); me.chem.health = 1; tick();
  pH.duelT = game.time - 30; tick();
  check("Howl calls another grump into the fight", P.scout() === gH && pH.calls === 1 && ev.darkCall === 1 && game.creatures.some(c => c.dark === "pack" && c.scout && c.scout.who === me.id));
  beat(gH);
  check("beating Howl leaves its horn", game.world.items.some(o => o.kind === "warhorn") && game.creatures.filter(c => c.dark === "pack" && c.alive).every(c => c.goingHome || (c.scout && c.scout.done)));
  check("Brag only comes once all three captains are down", !D.NAMED.filter(n => n.id === "brag").some(n => D.nextNamed(game) === n));
  // dusk and dawn
  clearGrumps(); game.time += SB.DAY_LENGTH; s().raid.truce = 0;
  D.dusk(game);
  const out = D.namedOut(game)[0];
  check("at dusk another named grump turns up", !!out && ev.darkNamed === 4, out && out.name);
  out.day = D.state(game).board.day - 5; D.dawn(game);
  check("left alone for two nights it slinks off", D.namedOut(game).length === 0 && D.board(game).list.filter(e => e.kind === "named" && !e.done).length === 0);
  P.leave(); clearGrumps();

  console.log("5. the storyteller you choose, and mercy");
  check("the old tale by default", D.teller(game).id === "classic" && D.gapK(D.teller(game), s()) === 1);
  check("old ember builds up, then rests", D.setTeller(game, "ember") && [0, 1, 2, 3].map(b => D.gapK(D.teller(game), { beat: b })).join() === "0.8,0.6,0.45,2.2");
  check("auntie moss is slow; dice is anything", D.setTeller(game, "moss") && D.gapK(D.teller(game), s()) === 1.5 && D.setTeller(game, "dice") && D.gapK(D.teller(game), s()) >= 0.35 && D.gapK(D.teller(game), s()) <= 2.25 && !D.setTeller(game, "nobody"));
  D.setTeller(game, "classic");
  const d = DR.state(game);
  check("three smols alone are a hurting tribe", D.hurting(game) === "few" && SB.Game.smols(game).length <= 3);
  let badDealt = 0; const inc0 = ev.incident;
  for (let i = 0; i < 2; i++) { const inc = DR.fire(game); if (inc && DR[inc.id].bad) badDealt++; d.active = null; d.last = {}; }
  check("mercy: the next two troubles are held back", badDealt === 0 && s().mercy.n === 2 && s().mercy.total === 2 && ev.mercy === 2);
  // fill the tribe out so it's no longer hurting
  for (let i = 0; i < 4; i++) SB.Game.spawnSmol(game, { genome: SB.Genome.forTier(SB.rng(50 + i), 3), x: hm.x + 1 + i * 0.5, z: hm.z + 2, age: 700 });
  SB.Game.smols(game).forEach(c => { c.chem.hunger = 0.2; });
  check("seven fed smols are not", D.hurting(game) === "");
  SB.Game.smols(game).forEach(c => { c.chem.hunger = 0.9; });
  check("a hungry tribe is", D.hurting(game) === "hungry");
  d.losses.push(game.time - 10); SB.Game.smols(game).forEach(c => { c.chem.hunger = 0.2; });
  check("so is one that lost somebody lately", D.hurting(game) === "grief");
  // a raid dealt to a hurting tribe comes softened
  s().mercy.n = 99; s().raid.truce = 0; D.setTeller(game, "ember"); s().beat = 0;
  const t0 = game.time; let soft = DR.fire(game, "raid"); d.active = null;
  const softN = soft ? soft.n : 0;
  check("a war party has its shape written on the card", !!soft && soft.dkShaped && /^\d+ grumps? (is|are) marching/.test(soft.text[0]) && +soft.text[0].match(/^\d+/)[0] === soft.n, soft && soft.text[0].slice(0, 40));
  d.losses.length = 0;
  s().lift.night = 1; const lifted = DR.fire(game, "raid"); d.active = null; delete s().lift.night;
  check("with the Long Night gone fewer follow", !!lifted && lifted.text.some(t => /fewer follow/.test(t)));
  s().fac.grumps = -90; const war = DR.fire(game, "raid"); d.active = null; s().fac.grumps = -40;
  check("at war with the grumps, more come", !!war && war.text.some(t => /at war/.test(t)));
  d.last = {}; d.lastBad = 0; d.nextT = game.time; s().beat = 3; s().mercy.n = 0;
  const rest = DR.fire(game); d.active = null;
  check("old ember's fourth beat is a rest: no trouble, and a long wait", (!rest || !DR[rest.id].bad) && d.nextT - game.time > 300, Math.round(d.nextT - game.time) + "s");
  D.setTeller(game, "classic");

  console.log("6. raids with shape");
  // scouts first
  check("before any of it, the raid card is free to come", D.raidOk(game));
  D._startScouts(game);
  const scouts = s().posts.filter(p => p.kind === "scout");
  check("scouts watch the village first", scouts.length === 2 && !!s().raid.scouts && ev.darkScouts === 1 && !D.raidOk(game));
  const sg0 = D.grumpOf(game, scouts[0].key), sg1 = D.grumpOf(game, scouts[1].key), sp0 = game.sparks || 0;
  sg0.tapCount = 3; tick();
  check("three taps from the sky shoo one", s().posts.filter(p => p.kind === "scout").length === 1 && s().raid.scouts.off === 1);
  beat(sg1); tick();
  check("see them both off and no war party comes", !s().raid.scouts && !s().raid.pending && (game.sparks || 0) === sp0 + 3 && ev.darkScoutsEnd === 1 && !D.raidOk(game));
  s().raid.truce = 0;
  D._startScouts(game); s().raid.scouts.until = game.time - 1; d.active = null; d.last = {};
  tick();
  check("leave them be and they report: a bigger war party follows", !s().raid.scouts && !!d.active && d.active.id === "raid" && d.active.text.some(t => /scouts that got away/.test(t)), d.active && d.active.text[d.active.text.length - 1]);
  d.active = null; clearGrumps(); s().posts = [];
  // a chief
  const raiders = [0, 1, 2, 3].map(i => { const g = SB.Game.spawnGrump(game, hm.x + 20 + i, hm.z + 20); g.raider = { x: hm.x, z: hm.z }; return g; });
  const tough0 = raiders[0].tough;
  d.active = { id: "raid", phase: "on", raiders: raiders.map(g => g.id), choice: "fight", n: 4, x: hm.x + 20, z: hm.z + 20, t1: game.time, dur: 150 };
  tick();
  check("a war party of four has a chief", /^chief /.test(raiders[0].name) && Math.abs(raiders[0].tough - tough0 * 1.8) < 1e-9 && ev.darkChief === 1, raiders[0].name);
  beat(raiders[0]);
  check("break the chief and the rest run", raiders.slice(1).every(g => g.goingHome) && d.active.dkChiefDown && ev.darkChiefDown === 1);
  // a truce after a beaten raid
  const inc1 = d.active; d.active = null; const gst2 = D.standing(game, "grumps");
  SB.bus.emit("incidentEnd", { inc: inc1, ok: true, text: "" });
  check("a beaten war party means a truce", s().raid.truce > game.time && !D.raidOk(game) && DR.raid.ok(game) === false && ev.darkTruce === 1 && D.standing(game, "grumps") === gst2 - 4);
  P.enter(game, me, { free: true });
  check("the truce shows by your hearts", SB.Ext.vitals(game, me).some(v => v.text === "truce"));
  s().raid.truce = 0; clearGrumps();
  // a siege
  SB.World.addStructure(game.world, game, "wall", hm.x + 6, hm.z, { done: true });
  SB.bus.emit("incidentEnd", { inc: { id: "raid", choice: "hide", n: 4, walled: true, x: hm.x + 30, z: hm.z }, ok: false, text: "" });
  const siegers = s().posts.filter(p => p.kind === "siege");
  check("walls that held: the grumps sit down outside them", !!s().raid.siege && siegers.length === 3 && ev.darkSiege === 1 && D.board(game).list.some(e => e.kind === "siege" && !e.done));
  fire.data.fuel = 0.8; fire.data.lit = true; D.dusk(game);
  check("every dusk the besiegers put a fire out", fire.data.lit === false);
  const sp1 = game.sparks || 0;
  siegers.forEach(p => beat(D.grumpOf(game, p.key)));
  check("chase all three off and the siege is broken", !s().raid.siege && s().raid.truce > game.time && (game.sparks || 0) >= sp1 + 8 && D.board(game).list.find(e => e.kind === "siege").done);
  s().raid.truce = 0; clearGrumps();

  console.log("7. nine new cards, one at a time");
  const run = (id, key, mid) => { d.active = null; const inc = DR.fire(game, id); if (!inc) return null; const one = d.active === inc; game.sparks = 99; DR.choose(game, inc, key); if (mid) mid(inc); inc._one = one; return inc; };
  const all = ["eclipse", "meteors", "healer", "beetles", "caravan", "cold", "refugee", "foundling", "machine"];
  (game.sites.find(q => q.kind === "ruin") || game.sites[0]).found = true;
  check("every card has a title, two lines and at least three choices with hints", all.every(id => { const c = DR[id].start(game); return c && c.title && c.text.length === 2 && c.choices.length >= 3 && c.choices.every(x => x.key && x.label && x.hint); }));
  check("every choice can be taken without a throw", all.every(id => DR[id].start(game).choices.every(ch => { try { const inc = run(id, ch.key); if (inc && inc.phase === "warn") { inc.phase = "on"; DR[id].begin(game, inc); } if (d.active && DR[id].tick) { game.time += 400; DR[id].tick(game, d.active); } if (d.active) DR.end(game, d.active, true); return true; } catch (e) { console.log(id, ch.key, e && e.stack); return false; } })));
  s().cold = null; s().eclipse = 0; clearGrumps(); s().fac = { grumps: -40, far: 0, wild: 0 }; s().raid.escaped = 0;
  const incs0 = ev.incident; const ec = run("eclipse", "watch");
  check("a card is the only card while it asks", ec._one && ev.incident === incs0 + 1 && ec.phase === "warn");
  ec.phase = "on"; DR.eclipse.begin(game, ec);
  check("an eclipse: dark at noon, and grumps by day", s().eclipse > game.time && ec.grumps.length === 3 && ec.grumps.every(id => SB.Game.byId(game, id).raider) && SB.Ext.vitals(game, me).some(v => v.text === "dark sun"));
  const env = { sun: [1, 1, 1], sky: [0.5, 0.7, 1], fog: [0.6, 0.7, 0.8] }; D.env(env);
  check("the sky goes dark with it", env.sun[0] < 0.3 && env.sky[2] < 0.3);
  game.time += 130; DR.eclipse.tick(game, ec);
  check("then the sun comes back and they go", s().eclipse === 0 && !d.active && ec.grumps.every(id => SB.Game.byId(game, id).goingHome));
  clearGrumps();
  const cs = run("cold", "tough");
  const cold0 = (me.chem.cold = 0); put(me, hm.x + 40, hm.z + 40); tick();
  check("a cold snap bites away from fire and roof, for two days", !!s().cold && s().cold.how === "tough" && me.chem.cold > cold0 && SB.Ext.vitals(game, me).some(v => v.text === "cold snap") && cs.phase === "done");
  check("and the storyteller won't deal a second one on top", DR.cold.ok(game) === false);
  const sp2 = game.sparks; game.time += SB.DAY_LENGTH * 2.1; tick();
  check("it passes, and toughing it out is worth something", !s().cold && game.sparks >= sp2 + 5);
  me.chem.cold = 0;
  SB.Game.smols(game).forEach(c => { c.chem.health = 0.5; }); Surv.spawn(game, "apple", 4, hm.x + 1, hm.z + 1);
  const far0 = D.standing(game, "far"); run("healer", "feed");
  check("feed the healer and everyone is mended", SB.Game.smols(game).every(c => c.chem.health === 1) && D.standing(game, "far") === far0 + 5);
  const pop0 = SB.Game.smols(game).length, far1 = D.standing(game, "far"); const rf = run("refugee", "in");
  check("take in a refugee: one more of you, the far tribe remembers, the grumps follow", SB.Game.smols(game).length === pop0 + 1 && D.standing(game, "far") === far1 + 12 && s().raid.escaped === 1 && !!rf.who);
  const far2 = D.standing(game, "far"); run("refugee", "no");
  check("turn one away and word travels", D.standing(game, "far") === far2 - 6);
  const w0 = D.standing(game, "wild"), pop1 = SB.Game.smols(game).length; run("foundling", "keep");
  check("keep a lost child: it's yours, and its people don't forget", SB.Game.smols(game).length === pop1 + 1 && D.standing(game, "wild") === w0 - 10);
  const fd = run("foundling", "home"), walker = SB.Game.byId(game, fd.walker), w1s = D.standing(game, "wild");
  put(walker, fd.x + 1, fd.z); DR.foundling.tick(game, fd);
  check("walk it home instead and the wild smols warm to you", fd.phase === "done" && D.standing(game, "wild") === w1s + 15);
  const mt0 = game.world.items.filter(o => o.kind === "metal").length; run("machine", "parts");
  check("an old machine taken apart is copper and a crystal", game.world.items.filter(o => o.kind === "metal").length > mt0 || game.world.items.some(o => o.kind === "metal" && o.data.n >= 2));
  const mo0 = game.world.items.filter(o => o.kind === "mote").length; run("meteors", "gather");
  check("falling stars leave lights to pick up", game.world.items.filter(o => o.kind === "mote").reduce((n, o) => n + (o.data.n || 1), 0) >= mo0 + 3);
  const farm = SB.World.addStructure(game.world, game, "farm", hm.x - 5, hm.z + 3, { done: true }); farm.data.grow = 0.8; fire.data.lit = false; fire.data.fuel = 0;
  run("beetles", "smoke");
  check("beetles: smoke with no fire lit saves only half", Math.abs(farm.data.grow - 0.4) < 1e-9);
  farm.data.grow = 0.8; fire.data.lit = true; fire.data.fuel = 0.7; run("beetles", "smoke");
  check("with a fire lit the farms are saved", farm.data.grow === 0.8);
  const ax0 = game.world.items.filter(o => o.kind === "stoneaxe" || o.kind === "axe").length; Surv.spawn(game, "apple", 6, hm.x + 1, hm.z + 1); run("caravan", "food");
  check("a caravan swaps five food for an axe", game.world.items.filter(o => o.kind === "stoneaxe" || o.kind === "axe").length === ax0 + 1 && s().n.caravans >= 1);
  s().fac.far = 30; tick();
  check("friends of the far tribe see caravans twice as often", D.rank(game, "far").key === "friends" && DR.caravan.w === 2);
  s().fac.far = -30;
  check("a far tribe gone cold sends none", DR.caravan.ok(game) === false);
  s().fac.far = 0; d.active = null;

  console.log("8. the notice board");
  put(me, hm.x + 1, hm.z + 1);
  game.time += SB.DAY_LENGTH; D.dawn(game);
  let bring = D.board(game).list.find(e => e.kind === "bring" && !e.done);
  check("a fresh notice every dawn", !!bring && D.board(game).day === Math.floor(game.time / SB.DAY_LENGTH) + 1, bring && bring.t);
  check("empty-handed, nothing to hand in", !D.handIn(game, me, bring.id).ok);
  Surv.inv(me).s.forEach((sl, i) => { if (sl && sl.k !== "plans") Surv.inv(me).s[i] = null; });
  Surv.add(me, bring.k, bring.need); put(me, hm.x + 60, hm.z);
  check("not from out in the wild", /village/.test(D.handIn(game, me, bring.id).msg));
  put(me, hm.x + 1, hm.z + 1);
  const purse2 = me.purse || 0, seals0 = D.board(game).seals, hi = D.handIn(game, me, bring.id);
  check("hand it in at the village: paid in shells, and a seal", hi.ok && (me.purse || 0) === purse2 + bring.pay && Surv.count(me, bring.k, true) === 0 && D.board(game).seals === seals0 + 1 && bring.done, hi.msg);
  check("three seals earned a prize from the council", D.board(game).seals >= 3 ? D.board(game).prizes >= 1 && ev.bountyPrize >= 1 : D.board(game).prizes === 0, D.board(game).seals + " seals");
  // a lost smol
  const lost = D._post(game, { kind: "find", who: "Bim", icon: "🔎", t: "find Bim", pay: 6, x: hm.x + 22, z: hm.z + 3 }), wild0 = D.standing(game, "wild");
  D.setPay(game, "sparks"); const sp3 = game.sparks; put(me, lost.x + 1, lost.z); tick();
  check("find the lost smol: paid as sparks this time, and the wild smols hear", lost.done && game.sparks === sp3 + 3 && D.standing(game, "wild") === wild0 + 10);
  D.setPay(game, "shells");
  // a camp
  const camp = game.sites.find(q => q.kind === "camp");
  if (camp) {
    camp.found = true; D.refresh(game, true);
    const ce = D.board(game).list.find(e => e.kind === "camp" && e.ref === camp.id);
    check("a found grump camp goes on the board", !!ce && ce.pay === 12);
    camp.done = true; tick();
    check("clear it and the council pays", ce.done);
  } else check("this island has a grump camp", false);
  const goals = []; D._post(game, { kind: "bring", k: "fish", need: 5, icon: "🐟", t: "bring 5 fish to the village", pay: 6 });
  SB.Ext.goals(game, (t, p, dn, big) => goals.push(t + " " + p));
  check("open notices show on the sky's goals list", goals.some(g => /bring 5 fish/.test(g) && /0\/5/.test(g)), goals.join(" | ").slice(0, 120));
  const nb = game.world.structures.find(b => b.kind === "noticeboard");
  check("look at the board in a body: read it", /notice board/.test((P.options(game, me, { type: "struct", id: nb.id }).use || {}).label || ""));

  console.log("9. factions with standing");
  const nest = game.sites.find(q => q.kind === "nest");
  if (nest) {
    nest.found = true; put(me, nest.x + 2, nest.z); Surv.add(me, "berry", 4);
    const wv = D.standing(game, "wild"), g1 = D.gift(game, me, "wild");
    check("leave food at a wild nest: the wild smols warm to you", g1.ok && D.standing(game, "wild") === wv + 6 && Surv.count(me, "berry", true) === 3, g1.msg);
    D.gift(game, me, "wild");
    check("two gifts a day is plenty", !D.gift(game, me, "wild").ok && Surv.count(me, "berry", true) === 2);
    check("no grumps here to leave anything for", !D.gift(game, me, "grumps").ok);
  } else check("this island has a wild nest", false);
  s().fac.wild = 14; const st0 = ev.standing; D.move(game, "wild", 2, "test");
  check("crossing a line changes how they act", D.rank(game, "wild").key === "curious" && ev.standing === st0 + 1 && D.hearts(game, "wild") === 3);
  const br0 = game.world.items.filter(o => o.kind === "berry").reduce((n, o) => n + (o.data.n || 1), 0);
  game.time += SB.DAY_LENGTH; D.dawn(game);
  check("curious wild smols leave berries by the nest at dawn", game.world.items.filter(o => o.kind === "berry").reduce((n, o) => n + (o.data.n || 1), 0) >= br0 + 2);
  check("and standings drift back toward where they began", D.standing(game, "wild") === 15);
  s().fac.wild = 40; const pop2 = SB.Game.smols(game).length; game.time += SB.DAY_LENGTH; D.dawn(game);
  check("friends: a wild smol walks in and stays", SB.Game.smols(game).length === pop2 + 1 && s().n.wildJoined === 1);
  const far3 = D.standing(game, "far"); SB.bus.emit("strangerJoined", { c: me });
  check("welcoming a stranger pleases the far tribe", D.standing(game, "far") === far3 + 8);
  s().fac.grumps = 20;
  check("a truce with the grumps: no war parties, no named grumps", !D.raidOk(game) && !D.namedOk(game));
  s().fac.grumps = -40; s().fac.far = 60; s().mercy.n = 0; d.losses.length = 0;
  let kin = null; for (let i = 0; i < 12 && !(kin && kin.text.some(t => /far tribe/.test(t))); i++) { d.active = null; kin = DR.fire(game, "raid"); }
  check("kin of the far tribe: their fighters turn raiders back", !!kin && kin.text.some(t => /far tribe's fighters/.test(t)));
  d.active = null; s().fac.far = 0;

  console.log("10. two side stories told through found things");
  check("resting at the well started the officer's trail", D.hasPage(game, "a1") && s().chain.a.step === 1 && /m .* of the nest/.test(D.trailHint(game)), D.trailHint(game));
  const em0 = ev.darkChain;
  for (let i = 0; i < 4; i++) { put(me, s().chain.a.x + 1, s().chain.a.z); tick(); }
  check("walk mark to mark and the pages come, to the end", ["a2", "a3", "a4", "a5"].every(id => D.hasPage(game, id)) && s().chain.a.step === 5 && D.trailHint(game) === "" && ev.darkChain === em0 + 1);
  check("the officer's locker is at the last mark", !!SB.Loot.state(game).chests["dark-officer"]);
  // the grump who wasn't: b1 (a named grump's sack), b2 (the wall at a well), b3 (a gift, answered next morning), b4
  check("the grumps' side: two pages so far", D.hasPage(game, "b1") && D.hasPage(game, "b2") && !D.hasPage(game, "b3"));
  const pB = D.spawnNamed(game, "snatch"); put(me, pB.x + 9, pB.z); Surv.add(me, "berry", 2);
  const gg = D.gift(game, me, "grumps");
  check("leave a gift where a named grump can see it", gg.ok && s().chain.b.gift > 0, gg.msg);
  const gsb = D.standing(game, "grumps");
  game.time += SB.DAY_LENGTH; D.dawn(game);
  check("next morning something is left in return, and you understand", D.hasPage(game, "b3") && D.hasPage(game, "b4") && s().chain.b.done > 0 && D.standing(game, "grumps") >= gsb + 9);

  console.log("11. the bag tab, and the save");
  put(me, well.x + 1, well.z);
  const html = D.html(game, me, () => "");
  check("the tab shows the board, the standings, the forge, the storytellers and the pages", /notice board/.test(html) && /the far tribe/.test(html) && /light forge/.test(html) && /data-dkteller='ember'/.test(html) && /trail, 5/.test(html) && /data-dkpay/.test(html));
  check("the bag lists it as a tab", SB.Ext.shownTabs(game, me).some(t => t.id === "dark"));
  const saved = JSON.parse(JSON.stringify(game.quests.dark));
  check("it all goes in the save", saved.lift.gloom > 0 && saved.posts.length === 1 && saved.board.seals >= 2 && saved.pages.length === 9 && saved.fac.wild > 0 && saved.teller === "classic");
  // a reload loses the grump (grumps are not saved): the post re-makes it
  clearGrumps(); put(me, hm.x + 70, hm.z); tick();
  check("after a reload a posted grump is back where it stood", !!D.grumpOf(game, "named-snatch") && D.grumpOf(game, "named-snatch").name === "Snatch");
  // the horn
  Surv.add(me, "warhorn", 1); d.active = null; s().raid.truce = game.time + 500;
  const hn = D.blowHorn(game, me);
  check("blow Howl's horn: the war party comes when you say, truce or no truce", hn.ok && !!d.active && d.active.id === "raid" && d.active.dkDare && Surv.count(me, "warhorn", true) === 0, hn.msg);
  d.active = null; P.leave();
  let threw2 = "";
  try { for (let i = 0; i < 50; i++) { game.world.night = i % 2 === 0; D.tick(game, 1); } D.dusk(game); D.dawn(game); game.offline = true; D.tick(game, 5); game.offline = false; } catch (e) { threw2 = String(e && e.stack || e); }
  check("it runs on with nobody in a body", !threw2, threw2.slice(0, 200));
});

// ---------------------------------------------------------------- round 2: the rest of the dark
seeded(5150, () => {
  const ctx = load();
  ["ext.js", "bosses.js", "possess.js", "home.js", "loot.js", "dark.js"].forEach(f => { if (!(f === "bosses.js" && ctx.SB.Bosses)) vm.runInContext(js(f), ctx, { filename: f }); });
  const SB = ctx.SB, P = SB.Possess, D = SB.Dark, Surv = SB.Surv, B = SB.Bosses, DR = SB.Director, K = SB.KINDS; P.headless = true;
  const game = SB.Game.newGame(133); SB.Game.current = game; game.tutorial.done = true;
  SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod));
  const me = SB.Game.smols(game)[0]; me.tier = 3; me.stage = 3;
  (game.settings = game.settings || {}).povThreat = "done";
  game.time = SB.DAY_LENGTH * 4.3; game.stats.maxTier = 4;
  const hm = SB.Society.home(game, 0), X = () => D.x2(game), s = () => D.state(game);
  const ev = {}; ["darkBeast", "darkBeastDone", "darkBig", "darkWave", "darkWaveStart", "darkSky", "darkSkyEnd", "darkPlace", "darkPlaceDone", "darkLineDone", "darkGuest", "darkWishDone", "darkFeast", "darkVote", "darkJoined", "darkCond", "darkCondEnd", "darkTamed", "darkBreakout", "darkFeat", "darkBoon", "darkRank", "darkBlight"].forEach(n => { ev[n] = 0; SB.bus.on(n, () => ev[n]++); });
  const put = (c, x, z) => { c.x = x; c.z = z; c.px = x; c.pz = z; };
  const tick = () => { D.tick(game, 3); D.tick2(game, 3); };
  const beat = (g, by) => { g.alive = false; g.gone = true; SB.bus.emit("grumpChased", { c: by === undefined ? me : by, g: g }); };
  const clearGrumps = () => { game.creatures = game.creatures.filter(c => c.species !== "grump"); };
  const clearBeasts = () => { s().posts = s().posts.filter(p => p.kind !== "beast"); clearGrumps(); };
  const n = k => D.count2(game, k);
  const have = k => Surv.count(me, k, true);
  const wn = k => game.world.items.filter(o => o.kind === k && !o.gone).reduce((a, o) => a + ((o.data && o.data.n) || 1), 0);
  const hold = k => { Surv.add(me, k, 1); const v = Surv.inv(me); v.sel = v.s.findIndex(sl => sl && sl.k === k); return Surv.held(me) && Surv.held(me).k === k; };
  const emptyBag = () => { me.inv = { s: [], sel: 0 }; Surv.inv(me); };
  const far = (d, a) => ({ x: hm.x + Math.sin(a || 0.7) * d, z: hm.z + Math.cos(a || 0.7) * d });
  const quiet = () => { X().noise = 0; D.setSneak(true); };
  const grumpOf = p => D.grumpOf(game, p.key);
  // start a duel with a posted beast: stand next to it, fit, and let it see you
  const duel = (p) => { put(me, p.x + 2.5, p.z); me.chem.health = 1; p.rest = 0; D.tick(game, 3); return P.scout() === grumpOf(p); };
  const endDuel = () => { if (P.scout()) P.endScout(null, 0, "test"); };
  for (let i = 0; i < 7; i++) D._h.newcomer(game, hm.x + 2 + i * 0.5, hm.z + 2, i === 6, "t" + i);
  const folk = () => SB.Game.smols(game).filter(c => c !== me && !c.stranger);
  folk().forEach(c => { if (c.stage >= 3) c.tier = 3; });
  P.enter(game, me, { free: true });

  console.log("13. round 2: the tables are sound");
  let threw = "";
  try { tick(); delete game.quests.dark.x2; tick(); D.dawn2(game); D.dusk2(game); SB.Ext.goals(game, () => {}); SB.Ext.vitals(game, me); D.html(game, me, () => ""); } catch (e) { threw = String(e && e.stack || e); }
  check("nothing throws on a save with none of round 2", !threw, threw.slice(0, 300));
  clearBeasts(); X().wave = null; X().sky = null; X().feast = null; X().guests = []; X().wishes = [];
  const TW = ["bite", "thirst", "biteKnock", "ranged", "fuse", "stare", "split", "wind", "swallow", "unwatched", "torchEater", "minions", "armour", "needsLight", "yawn", "flee", "flyer", "phase", "near", "nofear", "maskOk", "wound", "sound", "follow", "smash", "sap", "chase", "dayRage", "outlast", "echo", "rageAt", "big", "child", "drop", "only"];
  check("there are 60+ kinds of beast, and every one has a twist of its own or is a child of one", D.BEASTS.length >= 60 && D.BEASTS.every(d => d.twist && d.tough > 0 && TW.some(k => d[k] != null)), D.BEASTS.filter(d => !TW.some(k => d[k] != null)).map(d => d.id).join(","));
  check("every beast table names real things", D.BEASTS.every(d => (!d.drop || K[d.drop[0]]) && (!d.split || D.BEAST_BY[d.split[0]]) && (!d.call || Object.keys(d.call).every(k => K[k])) && (!d.big || K["trophy_" + d.id])), D.BEASTS.filter(d => d.call && !Object.keys(d.call).every(k => K[k])).map(d => d.id).join(","));
  check("every biome a beast asks for is a real biome", D.BEASTS.every(d => !d.biome || d.biome.every(b => SB.BIOMES.some(o => o.id === b))));
  check("the waves, skies, gatherings, makes, rooms and orders name real things", D.WAVES.every(d => d.sizes.length && (!d.boss || D.BEAST_BY[d.boss]) && (!d.call || Object.keys(d.call).every(k => K[k]))) && D.MAKES.every(m => Object.keys(m.cost).every(k => K[k]) && (m.place || K[m.id])) && D.ROOMS.every(R => Object.keys(R.need).every(k => K[k])) && D.ORDERS.every(o => Object.keys(o.need).every(k => K[k])) && D.FEASTS.every(f => f.tasks.length) && D.SKIES.length >= 20);
  const STEP = { go: 1, bring: 1, beat: 1, count: 1, pick: 1, have: 1, place: 1, wave: 1 };
  check("30+ quest lines, every step of a kind the runner knows, every asked-for thing real", D.LINES.length >= 30 && D.LINES.every(L => L.steps.every(st => STEP[st[0]] && (st[0] !== "bring" || Object.keys(st[2]).every(k => K[k])) && (st[0] !== "beat" || D.BEAST_BY[st[2]]) && (st[0] !== "place" || D.PLACE[st[2]]) && (st[0] !== "wave" || D.WAVE_BY[st[2]]) && (st[0] !== "have" || D.COND[st[2]]))), "" + D.LINES.length);
  check("the three captains' numbers are still untouched", B.BY.gloom.tough === 2.3 && B.BY.murk.tough === 5 && B.BY.night.tough === 9 && B.BY.gloom.dmg === 0.15 && B.BY.murk.dmg === 0.22 && B.BY.night.dmg === 0.25 && B.BY.night.armour === 1.25);
  check("six peoples now, three of them hidden until met", D.FACTIONS.length === 6 && !D.metFaction(game, "reed") && !/the reed folk/.test(D.html(game, me, () => "")));

  console.log("14. beasts: one twist each");
  let bad = []; ev.darkBeast = 0;
  D.BEASTS.forEach(d => { const p = D.spawnBeast(game, d.id, far(30, 0.5 + bad.length), { quiet: true }), g = p && grumpOf(p); if (!p || !g || g.name !== d.name || !(g.tough > 0) || !g.scout || !g.scout.hold) bad.push(d.id); });
  check("every kind in the table can be put out as a real, waiting grump", !bad.length && ev.darkBeast === D.BEASTS.length, bad.join(","));
  clearBeasts(); X().places = []; game.world.structures = game.world.structures.filter(b => b.kind !== "darkmark");
  const near0 = D.spawnBeast(game, "thrower", far(10), { quiet: true }), far0 = D.spawnBeast(game, "thrower", far(80), { quiet: true });
  check("danger rings: the same beast is tougher far from the nest", D.danger(game, far(80).x, far(80).z) >= 3 && grumpOf(far0).tough > grumpOf(near0).tough, grumpOf(near0).tough + " vs " + grumpOf(far0).tough);
  clearBeasts();
  // roaming and the cap
  let roamed = 0; for (let i = 0; i < 8; i++) { game.time += 1; if (D.roam(game, true)) roamed++; }
  check("the island puts beasts out by itself, and never more than the cap", roamed === D.cap(game) && D.beastsOut(game).length === D.CAP, roamed + " of " + D.cap(game));
  check("a roamer has a bounty on the board", D.board(game).list.some(e => e.kind === "beast" && !e.done));
  check("what roams fits where it is: a bog grump only in the wet, a night thing only at night", D.BEASTS.filter(d => d.biome).every(d => !D.beastFits(game, d, { x: hm.x, z: hm.z }, true) || d.biome.indexOf(D.biomeId(game, hm.x, hm.z)) >= 0) && !D.beastFits(game, D.BEAST_BY.burster, far(30), false) && D.beastFits(game, D.BEAST_BY.burster, far(30), true));
  game.world.season = 0; const frostOk0 = D.beastFits(game, D.BEAST_BY.frostgrump, { x: hm.x, z: hm.z }, true); game.world.season = 3;
  check("a frost grump comes with the winter", D.beastFits(game, D.BEAST_BY.frostgrump, { x: hm.x, z: hm.z }, true) && (!frostOk0 || ["tundra", "taiga"].indexOf(D.biomeId(game, hm.x, hm.z)) >= 0));
  game.world.season = 1;
  // dawn sends night beasts home
  game.world.night = false; const nb = D.beastsOut(game).filter(p => D.BEAST_BY[p.bid].night).length; put(me, hm.x, hm.z);
  D.dawn2(game);
  check("the sun sends the night's beasts home", nb > 0 && !D.beastsOut(game).some(p => D.BEAST_BY[p.bid].night && !D.BEAST_BY[p.bid].nosun), nb + " went");
  clearBeasts(); X().wave = null; X().sky = null; X().feast = null;
  // thrower
  let p = D.spawnBeast(game, "thrower", far(30), { quiet: true }), g = grumpOf(p);
  check("walk up to one and it is a duel", duel(p));
  put(me, g.x + 6, g.z); p.duelT = game.time - 5; me.chem.health = 1; D.tick(game, 3);
  check("a thrower hits you from a distance", me.chem.health < 1 && n("shots") === 1, "" + me.chem.health);
  put(me, g.x + 1.5, g.z); p.duelT = game.time - 20; const h1 = me.chem.health; D.tick(game, 3);
  check("but not when you are in close", me.chem.health === h1 && n("shots") === 1);
  endDuel(); clearBeasts();
  // floater: bat it back
  p = D.spawnBeast(game, "floater", far(30), { quiet: true }); g = grumpOf(p); duel(p);
  put(me, g.x + 6, g.z); p.duelT = game.time - 5; X().swingT = game.time + 1; const w0 = g.whacked || 0; me.chem.health = 1; D.tick(game, 3);
  check("swing as a floater's shot comes and it is batted back", (g.whacked || 0) === w0 + 1 && me.chem.health === 1 && n("batted") === 1);
  endDuel(); clearBeasts();
  // unseen: needs a light
  emptyBag(); p = D.spawnBeast(game, "unseen", far(40, 2), { quiet: true }); g = grumpOf(p); duel(p); D.tick(game, 3);
  g.whacked = 2; D.tick(game, 3);
  check("an unseen prowler can't be hit in the dark", g.whacked === 0, "" + g.whacked);
  Surv.add(me, "torch", 1); g.whacked = 2; D.tick(game, 3);
  check("carry a torch and your hits count", g.whacked === 2);
  endDuel(); clearBeasts(); emptyBag();
  // brute: armour
  p = D.spawnBeast(game, "brute", far(40, 2), { quiet: true }); g = grumpOf(p); duel(p); D.tick(game, 3); g.whacked = 2; D.tick(game, 3);
  const bare = g.whacked; hold("sword"); g.whacked = 2; D.tick(game, 3);
  check("an armoured brute turns bare paws, and not a sword", bare === 0 && g.whacked === 2, bare + " / " + g.whacked);
  endDuel(); clearBeasts(); emptyBag();
  // starer
  p = D.spawnBeast(game, "starer", far(30), { quiet: true }); g = grumpOf(p);
  const sref = { type: "creature", id: g.id };
  check("a tall thin grump leaves you alone if you don't stare", !duel(p));
  P.options(game, me, sref); D.tick(game, 3);
  check("look straight at it and it comes for you", P.scout() === g);
  endDuel(); clearBeasts();
  // creaker
  p = D.spawnBeast(game, "creaker", far(50, 3), { quiet: true }); g = grumpOf(p);
  const heart = D.placeById(game, p.heartPl);
  put(me, p.x + 20, p.z); const d0 = SB.dist(p.x, p.z, me.x, me.z); tick();
  const d1 = SB.dist(p.x, p.z, me.x, me.z);
  p.look = game.time; tick();
  check("a creaking thing creeps closer only while you aren't looking", d1 < d0 && SB.dist(p.x, p.z, me.x, me.z) === d1 && !!heart, d0 + " > " + d1);
  p.look = -99; duel(p); D.tick(game, 3); g = grumpOf(p); g.whacked = 2; D.tick(game, 3);
  const cw = g.whacked; endDuel();
  hold("stoneaxe"); put(me, heart.x + 1, heart.z);
  const hr = D.placeAct(game, me, heart, false);
  check("nothing marks it until its heart tree is broken", cw === 0 && hr.ok && p.heartDone === 1 && !D.placeById(game, heart.id), hr.msg);
  clearBeasts(); emptyBag();
  // sound
  p = D.spawnBeast(game, "hushguard", far(30), { quiet: true }); quiet();
  check("the hollow's keeper is blind: creep and it never notices", !duel(p));
  X().noise = game.time + 20;
  check("make a noise and it has you", duel(p));
  endDuel(); clearBeasts(); quiet();
  // split
  p = D.spawnBeast(game, "blob", far(30), { quiet: true }); beat(grumpOf(p));
  check("a bog blob splits in two when beaten", s().posts.filter(q => q.bid === "bloblet").length === 2 && n("beat:blob") === 1);
  clearBeasts();
  // burster
  const hut = SB.World.addStructure(game.world, game, "hut", far(30).x + 3, far(30).z, { done: true });
  p = D.spawnBeast(game, "burster", far(30), { quiet: true }); duel(p); p.duelT = game.time - 20; D.tick(game, 3);
  check("a creeping grump bursts and wrecks what is nearest", hut.done === false && !D.postOf(game, p.key));
  clearBeasts();
  // swallow
  emptyBag(); Surv.add(me, "berry", 1);
  p = D.spawnBeast(game, "ventcube", far(30), { quiet: true }); duel(p); D.tick(game, 3); me.chem.health -= 0.1; D.tick(game, 3);
  check("a vent cube swallows something from your bag when it bites", have("berry") === 0 && p.stolen.length === 1 && p.stolen[0] === "berry");
  g = grumpOf(p); endDuel(); beat(g);
  check("beat it and what it swallowed is on the ground", game.world.items.some(o => o.kind === "berry" && SB.dist(o.x, o.z, p.x, p.z) < 4));
  clearBeasts();
  // wound
  p = D.spawnBeast(game, "lairguard", far(30), { quiet: true }); duel(p); D.tick(game, 3); me.chem.health = 0.6; D.tick(game, 3); endDuel();
  me.chem.health = 1; tick();
  check("a lair guard's bite leaves a sore: your hearts won't fill for a while", me.dkSore > game.time && me.chem.health === 0.8 && SB.Ext.vitals(game, me).some(v => v.text === "sore"));
  me.dkSore = 0; clearBeasts();
  // flyer
  p = D.spawnBeast(game, "wyvern", far(30), { quiet: true }); duel(p); g = grumpOf(p);
  p.duelT = game.time - 6; D.tick(game, 3); const upHold = g.scout.hold; g.whacked = 2; D.tick(game, 3); const upW = g.whacked;
  p.duelT = game.time - 1; D.tick(game, 3); const downHold = g.scout.hold;
  check("a flyer swoops, then climbs out of reach, and can only be hit when it lands", upHold === true && upW === 0 && downHold === false);
  g.whacked = D._h.need(D.beastDef(p)) * 0.6; p.lastW = g.whacked; p.duelT = game.time - 6; D.tick(game, 3);
  check("hurt badly, it is grounded", p.grounded === 1 && g.scout.hold === false);
  endDuel(); clearBeasts();
  // minions
  p = D.spawnBeast(game, "packhound", far(30), { quiet: true }); duel(p); g = grumpOf(p); D.tick(game, 3);
  const pack = (p.packs || []).map(id => SB.Game.byId(game, id));
  g.whacked = 2; D.tick(game, 3); const pw = g.whacked;
  pack.forEach(o => { o.goingHome = true; }); g.whacked = 2; D.tick(game, 3);
  check("a grump hound brings its pack, and hides behind it", pack.length === 2 && pw === 0 && g.whacked === 2);
  endDuel(); clearBeasts();
  // wisp
  p = D.spawnBeast(game, "wisp", far(30), { quiet: true });
  let hops = 0; for (let i = 0; i < 5 && D.postOf(game, p.key); i++) { put(me, p.x + 3, p.z); D.tick(game, 3); hops++; }
  check("a snow wisp drifts off as you follow, and leaves a light when you catch it", !D.postOf(game, p.key) && hops === 4 && n("beat:wisp") === 1 && game.world.items.some(o => o.kind === "mote"), hops + " hops");
  clearBeasts();
  // follow
  p = D.spawnBeast(game, "grudge", far(30), { quiet: true }); put(me, far(30).x + 40, far(30).z); me.chem.health = 0.4; D.tick(game, 3);
  check("a grump with a grudge follows you about", SB.dist(p.x, p.z, me.x, me.z) < 9);
  me.chem.health = 1; clearBeasts();
  // unbeatable
  p = D.spawnBeast(game, "stalker", far(30), { quiet: true }); put(me, hm.x, hm.z); beat(grumpOf(p)); D.tick(game, 3); D.tick(game, 3);
  check("the stalker can't be beaten: knock it down and it gets up", !!D.postOf(game, p.key) && !!grumpOf(p) && !n("beat:stalker"));
  clearBeasts();
  // infighting
  X().noise = 0; p = D.spawnBeast(game, "thrower", far(30), { quiet: true }); D.spawnBeast(game, "boggrump", { x: p.x + 6, z: p.z + 6 }, { quiet: true });
  duel(p); g = grumpOf(p); p.duelT = game.time - 7; p.nextShot = 99; D.tick(game, 3);
  check("two different beasts close together turn on each other", n("infights") === 1 && g.whacked === 1);
  endDuel(); clearBeasts();
  // outlast
  p = D.spawnBeast(game, "torchgod", far(30), { quiet: true }); duel(p); p.duelT = game.time - 41; const sp0 = game.sparks; D.tick(game, 3);
  check("dodge the dark that hates torches for forty seconds and it gives up", !D.postOf(game, p.key) && X().big.torchgod === 1 && game.sparks > sp0);
  clearBeasts();
  // capture, feed, tame; and a break-out
  p = D.spawnBeast(game, "boggrump", far(30), { quiet: true }); g = grumpOf(p); duel(p); g.whacked = 99; endDuel();
  check("no catching without a vine", !D.capture(game, me, g).ok);
  Surv.add(me, "vine", 2);
  const gref = { type: "creature", id: g.id };
  check("beaten down, with a vine in your bag: catch it", /catch a bog grump/.test((P.options(game, me, gref).pick || {}).label || ""), (P.options(game, me, gref).pick || {}).label);
  const cp = D.capture(game, me, g);
  check("it goes in the pen by the nest", cp.ok && X().pen.length === 1 && X().pen[0].name === "bog grump" && !D.postOf(game, p.key), cp.msg);
  const fire2 = SB.World.addStructure(game.world, game, "campfire", hm.x + 3, hm.z + 2, { done: true }); fire2.data.fuel = 1; fire2.data.lit = true;
  put(me, hm.x + 2, hm.z); Surv.add(me, "berry", 5);
  for (let i = 0; i < 3; i++) { D.feedPen(game, me, 0); check(i === 0 ? "it eats once a day" : "…", i > 0 || !D.feedPen(game, me, 0).ok); game.time += SB.DAY_LENGTH; }
  check("three feeds and it is tame: it guards the village", X().pen[0].tame > 0 && ev.darkTamed === 1 && D.placesOf(game, "tamegrump").length === 1 && n("tamed") === 1);
  X().pen.push({ name: "thrower", day: 1, fed: 0, tame: 0 }); fire2.data.lit = false; fire2.data.fuel = 0;
  game.world.structures.forEach(b => { if (b.kind === "campfire" && b.data) b.data.lit = false; });
  D._penDusk(game);
  check("with no fire lit at dusk, an untamed one breaks out. the tame one stays", X().pen.length === 1 && ev.darkBreakout === 1);
  fire2.data.lit = true; fire2.data.fuel = 1;
  // banners
  D._bump(game, "chased", 25 - n("chased"));
  check("every ten grumps chased off is a banner", D.banners(game) === 2);

  console.log("15. the big ones");
  emptyBag(); clearBeasts(); put(me, far(30).x, far(30).z);
  check("a big one wants its price", /wants|it wants/.test(D.callWhy(game, me, "chain")) && !D.call(game, me, "chain").ok);
  Surv.add(me, "gloomstone", 2);
  const cc = D.call(game, me, "chain"), pc = s().posts.find(q => q.bid === "chain");
  check("pay it and it answers", cc.ok && !!pc && have("gloomstone") === 0 && !!grumpOf(pc), cc.msg);
  check("one big thing at a time", /one big thing/.test(D.callWhy(game, me, "thoughteater")));
  const spB = game.sparks; beat(grumpOf(pc));
  check("beat it: sparks, a keepsake, and the chain breaks in two", game.sparks >= spB + 14 && X().big.chain === 1 && game.world.items.some(o => o.kind === "trophy_chain") && s().posts.filter(q => q.bid === "chainlink").length === 2 && ev.darkBig >= 2);
  clearBeasts();
  check("a captain's echo needs its captain beaten, and a well", /captain/.test(D.callWhy(game, me, "echogloom")));
  check("new game+ ones only on a new game+ island", /new game\+/.test(D.callWhy(game, me, "twin")));
  game.ngPlus = 1; Surv.add(me, "duskshard", 1); Surv.add(me, "cinder", 1);
  const tw = D.call(game, me, "twin");
  check("the twins turn up together", tw.ok && s().posts.filter(q => q.bid === "twin").length === 2, tw.msg);
  game.ngPlus = 0; clearBeasts();
  check("what is woken can't be called", /woken/.test(D.callWhy(game, me, "kingblob")) && /woken/.test(D.callWhy(game, me, "treegiant")));
  game.world.night = false; Surv.add(me, "mote", 3); game.stats.maxTier = 5;
  const lb = D.call(game, me, "lightbeing"), pl = s().posts.find(q => q.bid === "lightbeing");
  duel(pl); D.tick(game, 3); const dayDmg = grumpOf(pl).scout.dmg; game.world.night = true; D.tick(game, 3);
  check("the bright one is three times worse by day", lb.ok && Math.abs(dayDmg - 0.3) < 1e-9 && Math.abs(grumpOf(pl).scout.dmg - 0.1) < 1e-9, dayDmg + "");
  pl.duelT = game.time - 50; D.tick(game, 3);
  check("drag a big fight out and it starts to rage", pl.rageOn === 1 && Math.abs(grumpOf(pl).scout.dmg - 0.15) < 1e-9);
  endDuel(); clearBeasts(); game.world.night = false; game.stats.maxTier = 4;
  // the word
  check("you can't say a word you don't know", !D.sayWord(game, me).ok);
  D.addBoon(game, "word");
  p = D.spawnBeast(game, "wyvern", far(30), { quiet: true }); duel(p); g = grumpOf(p); p.duelT = game.time - 6;
  const wd = D.sayWord(game, me); D.tick(game, 3); g.whacked = 2; D.tick(game, 3);
  check("the word drags a flyer down where you can hit it", wd.ok && g.whacked === 2 && g.scout.hold === false && p.grounded === 1, wd.msg);
  check("once a day", !D.sayWord(game, me).ok);
  endDuel(); clearBeasts();

  console.log("16. waves");
  put(me, hm.x + 2, hm.z); X().wave = null;
  const chaseAll = () => { const w = X().wave; let k = 0; game.creatures.filter(c => c.species === "grump" && c.alive && c.dark === "wave").forEach(o => { beat(o, folk()[3]); k++; }); s().posts.filter(q => q.kind === "beast" && w && q.wave === w.id).forEach(q => { beat(grumpOf(q), folk()[3]); k++; }); return k; };
  const runWave = () => { let guard = 0; while (X().wave && guard++ < 30) { chaseAll(); D.waveTick(game); } return guard; };
  const farm = SB.World.addStructure(game.world, game, "farm", hm.x + 5, hm.z + 4, { done: true }); farm.data.grow = 0.8;
  const r1 = D.startWave(game, "swarm", null, null), w1 = X().wave;
  const raiders = game.creatures.filter(c => c.species === "grump" && c.dark === "wave");
  check("a swarm: five small raiders heading for the village", r1.ok && raiders.length === 5 && raiders.every(o => o.raider && o.name === "a little grump" && o.tough < 0.5) && w1.total === 11, raiders.length + " " + (raiders[0] && raiders[0].tough));
  check("banners make them softer", Math.abs(raiders[0].tough - 0.5 * 0.88) < 0.011);
  check("one wave at a time", !D.startWave(game, "bunnies", null, null).ok);
  chaseAll(); D.waveTick(game);
  check("chase the first wave off and the second comes", X().wave && X().wave.i === 1 && X().wave.chased === 5 && game.creatures.filter(c => c.species === "grump" && c.alive && c.dark === "wave").length === 6);
  const spW = game.sparks; chaseAll(); D.waveTick(game);
  check("chase them all: gold, and sparks", !X().wave && X().medals["wave:swarm"] === 3 && game.sparks === spW + 6 && n("wave") === 1 && ev.darkWave === 1);
  D.startWave(game, "nibblers", null, null);
  check("nibblers eat half of what is in the farms", Math.abs(farm.data.grow - 0.4) < 1e-9);
  X().wave.until = 0; D.waveTick(game);
  check("ignore a wave and it gets bored and leaves, with no medal", !X().wave && !X().medals["wave:nibblers"] && n("wavesLost") === 1);
  // every invasion in the table can be run to the end
  s().raid.truce = 0; game.world.night = true; let wbad = [];
  const site = { id: game.sites.length, kind: "wreck", x: far(40, 4).x, z: far(40, 4).z, found: true }; game.sites.push(site);
  D.WAVES.forEach(d => {
    clearBeasts(); game.world.season = d.season != null ? d.season : 1; emptyBag(); if (d.call) Object.keys(d.call).forEach(k => Surv.add(me, k, d.call[k]));
    const r = D.startWave(game, d.id, d.at === "here" ? far(30) : null, d.call ? me : null);
    if (!r.ok) { wbad.push(d.id + ":" + r.msg); return; }
    if (d.relic) { const rp = D.placeById(game, X().wave.relicPl); Surv.add(me, "torch", 1); put(me, rp.x + 1, rp.z); const rr = D.placeAct(game, me, rp, false); if (!rr.ok) wbad.push("relic:" + rr.msg); put(me, hm.x + 2, hm.z); }
    runWave();
    if (X().wave || !(X().medals["wave:" + d.id] >= 1)) wbad.push(d.id + ":medal " + X().medals["wave:" + d.id]);
  });
  game.world.season = 1; game.world.structures.forEach(b => { if (b.kind === "farm" || b.kind === "wall" || b.kind === "hut") { b.done = true; b.need = {}; } });
  check("all " + D.WAVES.length + " kinds of invasion run from first raider to medal", !wbad.length, wbad.join(" | "));
  check("the sea raiders' boss and the king blob came out at the end of theirs", X().seen.raftboss.n >= 1 && X().seen.kingblob.n >= 1 && X().seen.ravager.n >= 1 && n("smashed") >= 0);
  check("risers stop the moment the relic is relit", n("relit") === 1 && X().medals["wave:risers"] === 3);
  check("one of the wild blob band stayed", ev.darkJoined >= 1);
  check("the taunt drum and the cinder were used up", have("taunt") === 0 && have("cinder") === 0);
  check("a wave night is winter-only for the frost one, and needs the drum", /winter/.test(D.waveWhy(game, "frostnight", me)) && /taunt/.test(D.waveWhy(game, "wavenight", me)));
  clearBeasts(); game.world.night = false;
  let auto = 0; for (let i = 0; i < 40 && !auto; i++) { game.time += SB.DAY_LENGTH; s().raid.truce = 0; if (D.autoWave(game, i % 2 === 0)) auto = 1; }
  check("now and then one comes by itself", auto === 1 && !!X().wave);
  runWave();

  console.log("17. skies");
  X().sky = null; let sbad = [];
  D.SKIES.forEach(d => { X().sky = null; game.world.season = d.season != null ? d.season : 1; if (!D.startSky(game, d.id, true) || !D.skyIs(game, d.id)) sbad.push(d.id); try { tick(); } catch (e) { sbad.push(d.id + ":" + e.message); } });
  check("all " + D.SKIES.length + " skies start and tick", !sbad.length && ev.darkSky >= D.SKIES.length, sbad.join(","));
  game.world.season = 1; X().sky = null; clearBeasts(); X().places.slice().forEach(q => D._placeEnd(game, q, true));
  D.startSky(game, "dimday", true); const sp1 = game.sparks; SB.Game.addSparks(game, 9); tick();
  check("a dim day: no new sparks reach the Lantern", game.sparks === sp1 && SB.Ext.vitals(game, me).some(v => v.text === "a dim day"));
  check("only one sky at a time", !D.startSky(game, "aurora", true));
  X().sky.until = 0; tick();
  check("and it passes", !D.sky(game) && ev.darkSkyEnd >= 1);
  const out1 = folk()[0]; put(out1, hm.x + 40, hm.z + 40); out1.inBed = false; out1.chem.sick = 0;
  D.startSky(game, "ashfall", true); tick(); tick();
  check("ash fall makes a smol out of doors poorly", out1.chem.sick > 0, "" + out1.chem.sick);
  X().sky = null; put(out1, hm.x + 1, hm.z + 1);
  const it0 = game.world.items.length; farm.data.grow = 0.3; D.startSky(game, "greenrain", true);
  check("glow rain: forage all round the village, and the farms jump", game.world.items.length >= it0 + 8 && Math.abs(farm.data.grow - 0.5) < 1e-9, (game.world.items.length - it0) + " things");
  X().sky = null; D.startSky(game, "bloom", true);
  check("a star-fruit bloom", game.world.items.filter(o => o.kind === "starfruit").length >= 5);
  X().sky = null; D.startSky(game, "cubeday", true);
  const cube = D.placesOf(game, "cube")[0]; folk().forEach(c => { c.chem.bored = 0.9; }); tick();
  check("a shiny cube: smols stop and stare", !!cube && cube.n > 0 && folk().some(c => c.chem.bored < 0.9));
  put(me, cube.x + 1, cube.z); const cr = D.placeAct(game, me, cube, false);
  check("carry it off and they get on with things", cr.ok && have("shinycube") === 1 && !D.placesOf(game, "cube").length, cr.msg);
  X().sky = null; emptyBag();
  // blight
  const farm2 = SB.World.addStructure(game.world, game, "farm", hm.x + 9, hm.z + 4, { done: true }); farm.data.grow = 0.9; farm2.data.grow = 0.9;
  D.startSky(game, "blight", true); const fid = X().sky.farms[0];
  for (let i = 0; i < 12; i++) tick();
  check("blight eats a farm and spreads to the next", X().sky.farms.length === 2 && ev.darkBlight === 1 && SB.World.structById(game.world, fid).data.grow < 0.9);
  const bf = SB.World.structById(game.world, fid); put(me, bf.x + 1, bf.z);
  check("look at a blighted farm: cut it out", /cut out the blight/.test((P.options(game, me, { type: "struct", id: bf.id }).use || {}).label || ""));
  D.cutBlight(game, me, bf); const c2 = D.cutBlight(game, me, SB.World.structById(game.world, X().sky.farms[0])); tick();
  check("cut it out of every farm and it is over", c2.ok && !D.sky(game) && n("blightCut") === 2, c2.msg);
  // sniffles
  game.world.season = 3; X().strain = null; folk().concat([me]).forEach(c => { c.chem.sick = 0; c.dkImm = 0; c.dkCatch = 0; });
  D.startSky(game, "sniffles", true); const lv1 = X().strain.lv, sickN = folk().concat([me]).filter(c => c.dkCatch).length;
  X().sky = null; D.startSky(game, "sniffles", true); const lv2 = X().strain.lv;
  folk().concat([me]).forEach(c => { c.dkCatch = lv2; SB.bus.emit("cured", { c: c }); });
  X().sky = null; D.startSky(game, "sniffles", true);
  check("each winter's sniffles come back nastier, unless enough of you got over the last one", lv1 === 1 && lv2 === 2 && X().strain.lv === 2 && sickN >= 2 && me.dkImm === 2, lv1 + "," + lv2 + "," + X().strain.lv);
  X().sky = null; game.world.season = 1;
  // luck, the stars, the signal, the lullaby
  const l0 = D.luck(game); check("the day's luck is fixed for the day, and changes with the day", D.luck(game) === l0 && l0 >= -1 && l0 <= 1 && D.luckLine(game).length > 5);
  let picked = null; for (let i = 0; i < 30 && !picked; i++) { game.time += SB.DAY_LENGTH; picked = D.pickSky(game); }
  check("tomorrow's sky is chosen a day ahead", !!picked && X().skyNext === picked);
  folk()[1].tier = 5;
  const rs = D.readStars(game, me);
  check("a thinker in the tribe can read it in the stars", rs.ok && rs.msg.indexOf(D.SKY_BY[picked].name) >= 0, rs.msg);
  folk()[1].tier = 3;
  check("with no dome, thinker or well, the stars say nothing", !D.readStars(game, me).ok && !D.signal(game, me).ok);
  SB.World.addStructure(game.world, game, "observatory", hm.x - 6, hm.z + 3, { done: true });
  const sg1 = D.signal(game, me, 0); X().sigDay = 0; const sg2 = D.signal(game, me, 1); X().sigDay = 0; const sg3 = D.signal(game, me, 2);
  check("the far signal, and you choose who to call: news, help, or somebody walking in", sg1.ok && sg2.ok && sg3.ok && /pod 4/.test(sg1.msg) && X().guests.some(q => q.id === "podfolk") && n("signals") === 3, [sg1.msg, sg2.msg, sg3.msg].join(" | ").slice(0, 200));
  check("once a day", !D.signal(game, me).ok);
  game.sparks = 3; const ly0 = D.sing(game); game.sparks = 20; const ly = D.sing(game);
  check("a lullaby costs the Lantern 5 sparks and sweetens a day", !ly0.ok && ly.ok && game.sparks === 15 && D.skyIs(game, "lullaby"));
  X().sky = null; X().guests = [];

  console.log("18. places");
  clearBeasts(); emptyBag(); quiet();
  const at = (i) => far(34, i * 0.4);
  const mk = (kindId, i, data) => { const pp = D._placeAdd(game, kindId, at(i), data || {}); put(me, pp.x + 1, pp.z); return pp; };
  const use = (pp, alt) => D.placeAct(game, me, pp, alt);
  let pbad = [];
  Object.keys(D.PLACE).forEach((k, i) => { const pp = D._placeAdd(game, k, at(i), { room: 0, want: 0, what: 0 }), b = game.world.structures.find(o => o.kind === "darkmark" && o.data.dk === "pl-" + pp.id), lab = D.placeLabel(game, pp, false); const o = b ? P.options(game, me, { type: "struct", id: b.id }) : {}; if (!b || !b.name || !lab || (o.use || {}).label !== lab) pbad.push(k); D._placeEnd(game, pp, true); });
  check("all " + Object.keys(D.PLACE).length + " kinds of place stand in the world with a name, and looking at one offers its thing to do", !pbad.length && !game.world.structures.some(b => b.kind === "darkmark"), pbad.join(","));
  // knots
  B.place(game); const e1 = B.state(game).list.gloom; e1.found = false;
  const k1 = mk("knot", 1, { lair: "gloom" }), k2 = D._placeAdd(game, "knot", at(2), { lair: "gloom" });
  check("a dark knot takes a tool", /tool/.test(use(k1).msg));
  hold("stoneaxe"); const kr = use(k1); put(me, k2.x + 1, k2.z); const kr2 = use(k2);
  check("break the knots near a lair: gloomstone, and the captain stirs", kr.ok && kr2.ok && /stirs/.test(kr2.msg) && e1.found === true && game.world.items.some(o => o.kind === "gloomstone") && n("place:knot") === 2, kr2.msg);
  // snare and rockfall
  let sn = mk("snare", 3); me.chem.health = 1; quiet(); put(me, sn.x + 0.5, sn.z); tick();
  const safe = me.chem.health === 1 && !!D.placeById(game, sn.id);
  X().noise = game.time + 30; D.setSneak(false); tick();
  check("creep and you step over a snare. crash about and it has your foot", safe && me.chem.health < 1 && !D.placeById(game, sn.id) && n("snared") === 1);
  quiet(); me.chem.health = 1; const rf = mk("rockfall", 4); const rr0 = use(rf);
  check("loose rocks can be knocked down from a safe distance", rr0.ok && game.world.items.some(o => o.kind === "stone" && SB.dist(o.x, o.z, rf.x, rf.z) < 2));
  // door
  const dr = mk("door", 5); const dr0 = use(dr); Surv.add(me, "ironpick", 1); const dr1 = use(dr);
  check("a sealed door only opens to an iron pick, and you keep the pick", !dr0.ok && dr1.ok && have("ironpick") === 1 && game.world.items.some(o => o.kind === "book"));
  // pit
  const pit = mk("pit", 6); game.world.night = true; put(me, hm.x, hm.z); tick();
  const guard = s().posts.find(q => q.guard === "pit" + pit.id);
  Surv.add(me, "stone", 4); put(me, pit.x + 1, pit.z); const pr = use(pit);
  check("a dark pit lets a lair guard out at night, until you fill it in", !!guard && guard.bid === "lairguard" && pr.ok && !D.placeById(game, pit.id), pr.msg);
  clearBeasts();
  // patch
  const pa = mk("patch", 7); const spP = game.sparks; const par = use(pa);
  const pa2 = mk("patch", 8); pa2.day -= 3; put(me, hm.x, hm.z); tick();
  check("clearing a dark patch pays. one left three days hatches something", par.ok && game.sparks === spP + 2 && !D.placeById(game, pa2.id) && s().posts.some(q => q.bid === "unseen") && n("hatched") === 1);
  clearBeasts(); game.world.night = false;
  const gdead = SB.Game.spawnGrump(game, far(20).x, far(20).z); let patches = 0; for (let i = 0; i < 60 && !patches; i++) { beat(gdead, folk()[3]); patches = D.placesOf(game, "patch").length; }
  check("where grumps fall, a dark patch may be left", patches === 1);
  D.placesOf(game, "patch").forEach(q => D._placeEnd(game, q, true));
  // bramble
  const core = mk("core", 9); for (let i = 0; i < 3; i++) { game.time += SB.DAY_LENGTH; put(me, hm.x, hm.z); tick(); }
  const brs = D.placesOf(game, "bramble").length; put(me, core.x + 1, core.z); const cr0 = use(core); Surv.add(me, "torch", 1); const cr1 = use(core);
  check("gloom-bramble spreads a patch a day, and burning the core ends all of it", brs === 3 && !cr0.ok && /fire/.test(cr0.msg) && cr1.ok && !D.placesOf(game, "bramble").length, brs + " " + cr0.msg);
  // dark-stone
  const ds = mk("darkstone", 10); farm.data.grow = 0.5; put(farm, ds.x + 3, ds.z); put(folk()[0], ds.x + 2, ds.z); folk()[0].chem.fear = 0; tick();
  const dim = farm.data.grow < 0.5 && folk()[0].chem.fear > 0; put(me, ds.x + 1, ds.z); hold("stoneaxe"); use(ds); use(ds); const ds3 = use(ds);
  check("a dark-stone dims what is near it until it is smashed (three goes)", dim && ds3.ok && !D.placeById(game, ds.id), "" + farm.data.grow);
  put(farm, hm.x + 5, hm.z + 4); put(folk()[0], hm.x + 1, hm.z);
  // ark part
  const ap = mk("arkpart", 11); const m0 = wn("metal"); use(ap); use(ap); const ap3 = use(ap);
  check("a fallen ark part comes apart into metal and a crystal", ap3.ok && wn("metal") >= m0 + 3 && !D.placeById(game, ap.id));
  // pod mend
  emptyBag(); const pm = mk("podmend", 12); const pm0 = use(pm); Surv.add(me, "metal", 2); Surv.add(me, "stick", 4); Surv.add(me, "crystal", 1); use(pm); use(pm); const pm3 = use(pm);
  game.time += SB.DAY_LENGTH; const mo0 = wn("mote"); put(me, hm.x, hm.z); tick();
  check("mend a pod wreck piece by piece: then it leaves a light every dawn", !pm0.ok && pm3.ok && pm.n === 3 && /lamp/.test(D.placeLabel(game, pm, false)) && wn("mote") === mo0 + 1, pm3.msg);
  // pond
  const pond = mk("pond", 13); me.chem.health = 1; put(me, pond.x + 1, pond.z); tick(); const bit = me.chem.health < 1;
  Surv.spawn(game, "egg", 1, pond.x + 1, pond.z + 1); tick(); const eggGone = n("eggsEaten") === 1;
  Surv.add(me, "fish", 1); const pf = use(pond); me.chem.health = 1; game.time += 30; tick();
  check("a snapper pond bites waders and eats dropped eggs. feed it a fish and it settles", bit && eggGone && pf.ok && have("clam") === 2 && me.chem.health === 1);
  // hollow, alarm cap, tunnel
  const hol = mk("hollow", 14); X().noise = game.time + 30; D.setSneak(false); const h0 = use(hol); quiet(); const h1b = use(hol);
  check("the hush hollow: only a quiet smol gets what the keeper guards", !h0.ok && h1b.ok);
  const cap = mk("alarmcap", 15); X().noise = game.time + 30; D.setSneak(false); put(me, cap.x + 0.5, cap.z); tick();
  check("an alarm cap shrieks at a noisy smol and calls the stalker", s().posts.some(q => q.bid === "stalker") && n("alarms") === 1);
  clearBeasts(); quiet(); emptyBag();
  const tun = mk("tunnel", 16); const t0 = use(tun); const blind = s().posts.filter(q => q.bid === "blindgrump").length; Surv.add(me, "torch", 1); const t1 = use(tun);
  check("a lightless tunnel: blind grumps without a torch, treasure with one", !t0.ok && blind === 2 && t1.ok && !D.placeById(game, tun.id));
  clearBeasts(); quiet();
  // nests
  const nest = mk("nest", 17); game.time += SB.DAY_LENGTH * 2; put(me, hm.x, hm.z); tick();
  const spread = D.placesOf(game, "nest").length; D._bump(game, "place:nest", 2); put(me, nest.x + 1, nest.z); const nr = use(nest);
  check("bug nests spread until burned. the third one burned wakes the bug queen", spread === 2 && nr.ok && s().posts.some(q => q.bid === "hivequeen") && game.world.items.some(o => o.kind === "jelly"), spread + " " + nr.msg);
  clearBeasts(); D.placesOf(game, "nest").forEach(q => D._placeEnd(game, q, true));
  // vault and ring
  X().wave = null; const va = mk("vault", 18); const vr = use(va); runWave();
  check("a sealed vault: hold out while it opens, then it is yours", vr.ok && !D.placeById(game, va.id) && X().medals["wave:vault"] === 3);
  const ar = mk("arena", 19); const ar1 = use(ar); runWave(); const ar2 = use(ar); Surv.add(me, "taunt", 1); const ar3 = use(ar, true); runWave();
  check("the old ring: once a day, or a harder run with a taunt drum", ar1.ok && !ar2.ok && ar3.ok && have("taunt") === 0 && X().medals["wave:omen"] === 3);
  // fort
  const fort = mk("fort", 20); const fr = use(fort); runWave();
  check("storm a grump fort and the watch mans it", fr.ok && fort.kind === "watchfort" && n("place:fort") === 1 && n("regions") >= 1 && /watch/.test(D.placeLabel(game, fort, false)));
  // pillars, gate, the dark itself
  for (let i = 0; i < 4; i++) { const pi = mk("pillar", 21 + i); use(pi); runWave(); }
  const gate = mk("gate", 26); emptyBag(); const g0 = use(gate); Surv.add(me, "duskshard", 1); Surv.add(me, "cinder", 1); Surv.add(me, "starmetal", 1); const g1 = use(gate);
  check("four dark pillars come down, and the gate takes the three captains' lights by hand", X().pillars === 4 && !g0.ok && g1.ok && gate.open > 0 && have("starmetal") === 0, g1.msg);
  clearBeasts(); const g2 = use(gate), pd = s().posts.find(q => q.bid === "thedark");
  check("step through: the dark itself, in a last arena", g2.ok && !!pd && D.BEAST_BY.thedark.minions === 3 && D.BEAST_BY.thedark.flyer === 1 && D.BEAST_BY.thedark.rageAt === 40);
  beat(grumpOf(pd));
  check("chase it off: an ending", X().ends.dark > 0 && /only an arch/.test(use(gate).msg));
  clearBeasts();
  // den
  const den = mk("den", 27); Surv.add(me, "cinder", 3); const okRaid0 = D.raidOk(game); s().raid.truce = 0; const okRaid1 = D.raidOk(game); const dn = use(den);
  check("seal the den with three cinders and no war party ever comes again: another ending", dn.ok && okRaid1 === true && D.raidOk(game) === false && X().ends.den > 0, dn.msg + okRaid0);
  // tear, bulb, hive, ruin
  const tear = mk("tear", 28); const te0 = use(tear), tk = s().posts.find(q => q.bid === "tearkeeper"), te1 = use(tear); beat(grumpOf(tk)); const te2 = use(tear);
  check("a dark tear: beat its keeper, then close it", !te0.ok && !!tk && !te1.ok && te2.ok && !D.placeById(game, tear.id));
  clearBeasts(); hold("stoneaxe");
  const bulb = mk("bulb", 29); use(bulb); const hive = mk("hive", 30); clearBeasts(); const hv = use(hive);
  check("break the bulb and the tree giant wakes. raid the great hive and the queen comes", X().seen.treegiant.n >= 2 && hv.ok && have("honey") === 2 && s().posts.some(q => q.bid === "queenbee"));
  clearBeasts(); const ru = mk("sealedruin", 31); Surv.add(me, "ironpick", 1); use(ru);
  check("a sealed ruin has a stone guardian inside", s().posts.some(q => q.bid === "stoneguard"));
  clearBeasts(); emptyBag();
  // monolith and the two ways it ends
  const mono = mk("monolith", 32); const m1 = use(mono), m1b = use(mono); for (let i = 0; i < 3; i++) { game.time += SB.DAY_LENGTH; use(mono); }
  check("study the dark stone a day at a time. the island gets busier for it", m1.ok && !m1b.ok && X().mono === 4 && D.cap(game) === D.CAP + 1 && s().posts.some(q => q.bid === "unseen"));
  check("then: seal it, or speak to it", /seal/.test(D.placeLabel(game, mono, false)) && /speak/.test(D.placeLabel(game, mono, true)));
  const gs0 = D.standing(game, "grumps"); const mf = use(mono, true);
  check("speak to it: the grumps think far better of you, and that is an ending too", mf.ok && X().ends.void === "friend" && D.standing(game, "grumps") === Math.min(100, gs0 + 40));
  clearBeasts();
  // relic
  const rel = mk("talkrelic", 33, { want: 0 }); Surv.add(me, "honey", 1); const fs0 = D.standing(game, "far"); const rl = use(rel);
  check("a talking relic strikes a bargain: a trick for you, and a rude word to the far tribe", rl.ok && D.hasBoon(game, "trick") && D.standing(game, "far") === fs0 - 4);
  const rel2 = mk("talkrelic", 34, { want: 1 }); hold("stoneaxe"); const rl2 = use(rel2, true);
  check("or smash the cheeky thing", rl2.ok && n("relicsSmashed") === 1);
  // hoard, mask, bribe
  emptyBag(); const hoard = mk("hoard", 35); const cg = D.spawnBeast(game, "campguard", { x: hoard.x + 4, z: hoard.z }, { quiet: true });
  Surv.add(me, "grumpmask", 1);
  check("camp guards leave a mask-wearer alone", !duel(cg));
  put(me, hoard.x + 1, hoard.z); const hd = use(hoard);
  check("until you touch their hoard", hd.ok && duel(cg) && n("hoards") === 1);
  endDuel(); X().maskBroke = 0; emptyBag(); me.purse = 6; put(me, hoard.x + 1, hoard.z); const br = use(hoard, true);
  check("or pay them to look away", br.ok && me.purse === 1 && !duel(cg));
  clearBeasts();
  // lamps
  const lamp = mk("lamp", 36); const boss = SB.Game.spawnGrump(game, me.x + 3, me.z); boss.boss = "night"; boss.scout = { who: me.id, t: 0, hitT: 0, hold: true }; boss.whacked = 3; P.adoptScout(boss, { keep: true }); X().lampT = 0; D.tick2(game, 3);
  const mended = boss.whacked; hold("stoneaxe"); P.endScout(null, 0, "t"); put(me, lamp.x + 1, lamp.z); use(lamp); boss.scout = { who: me.id, t: 0, hitT: 0, hold: true }; P.adoptScout(boss, { keep: true }); X().lampT = 0; D.tick2(game, 3);
  check("dark lamps mend the Long Night as you fight it, until you break them", mended === 2.5 && boss.whacked === 2.5 && n("lampMends") === 1 && B.BY.night.tough === 9);
  P.endScout(null, 0, "t"); clearGrumps();
  // ghost light, lodge, tinkers, tide line, road, tracks
  game.world.night = true; SB.World.addStructure(game.world, game, "grave", hm.x - 8, hm.z - 6, { done: true }); X().sky = { id: "lanternnight", until: game.time + 999 }; D.dusk2(game); X().sky = null;
  const gl = D.placesOf(game, "ghostlight")[0]; put(me, gl.x + 1, gl.z); const glr = use(gl);
  check("at night a faint light sits at a grave. sit with it, and it leaves a last wish for its kin", !!gl && glr.ok && X().wishes.some(w => w.wid === "lastwish"), glr.msg);
  game.world.night = false; X().wishes = [];
  const lodge = mk("lodge", 37); const lo0 = use(lodge); me.tier = 5; const lo1 = use(lodge), lo2 = use(lodge); me.tier = 3;
  check("the thinkers' lodge has a door guard, and a rite once a day inside", !lo0.ok && /thinkers only/.test(lo0.msg) && lo1.ok && !lo2.ok && me.inspired >= 120);
  const tc = mk("tinkercamp", 38); Surv.add(me, "stick", 3); const tr = use(tc, true);
  check("the tinkers tie you a tripwire", tr.ok && have("tripwire") === 1);
  const tide = mk("tideline", 39); tide.full = 1; const td = use(tide), td2 = use(tide);
  check("the tide line leaves things every third day. the first time, somebody's lucky socks", td.ok && !td2.ok && have("socks") === 1 && have("clam") === 1);
  check("a story item can't be put down", (function () { const v = Surv.inv(me); v.sel = v.s.findIndex(sl => sl && sl.k === "socks"); const o = P.options(game, me, null); return !o.place || !/^put down/.test(o.place.label || ""); })());
  const road = mk("road", 40, { what: 0 }); const rd = use(road);
  check("something met on the road", rd.ok && n("road:pack") === 1);
  const trk = mk("tracks", 41); use(trk); put(me, trk.x + 1, trk.z); use(trk); put(me, trk.x + 1, trk.z); const t3 = use(trk);
  check("follow the giant's tracks to the gentle giant, and comb out its fluff", t3.ok && have("fluff") === 3 && n("giantFound") === 1);
  // tripwire, rock pile, guardian
  emptyBag(); Surv.add(me, "tripwire", 1); const v0 = Surv.inv(me); v0.sel = v0.s.findIndex(sl => sl && sl.k === "tripwire"); put(me, far(20).x, far(20).z);
  const top0 = P.options(game, me, null); const set = top0.place && top0.place.go ? top0.place.go() : (top0.place && top0.place.act ? top0.place.act() : null);
  const twp = D.placesOf(game, "tripwire")[0];
  check("hold a tripwire: set it here", /tripwire/.test((top0.place || {}).label || "") && !!twp && have("tripwire") === 0, (top0.place || {}).label + " " + Object.keys(top0.place || {}).join(","));
  if (twp) { const rg = SB.Game.spawnGrump(game, twp.x + 1, twp.z); rg.raider = { x: hm.x, z: hm.z }; folk()[0].asleep = true; put(me, hm.x, hm.z); tick();
    check("the first raider through is tangled and turned, and the village wakes", rg.goingHome === true && folk()[0].asleep === false && n("tripped") === 1); }
  clearGrumps();
  const rp2 = mk("rockpile", 42, { n: 2 }); const rg2 = SB.Game.spawnGrump(game, rp2.x + 5, rp2.z); rg2.raider = { x: hm.x, z: hm.z }; put(me, hm.x, hm.z); tick();
  const rpn = rp2.n, rgw = rg2.whacked; clearGrumps();
  const gd = mk("guardian", 43); const rg3 = SB.Game.spawnGrump(game, gd.x + 5, gd.z); rg3.raider = { x: hm.x, z: hm.z }; put(me, hm.x, hm.z); tick();
  check("a loaded rock pile throws at raiders. a stone guardian turns them back", rpn === 1 && rgw === 1 && rg3.goingHome === true && n("turned:guardian") === 1);
  clearGrumps(); folk()[0].chem.anger = 1; SB.bus.emit("tantrum", { c: Object.assign(folk()[0], { x: rp2.x + 1, z: rp2.z }) });
  check("a tantrum next to the rock pile knocks it all loose", rp2.n === 0 && n("knockedLoose") === 1);
  put(folk()[0], hm.x + 1, hm.z);
  // trampling
  const tg = SB.Game.spawnGrump(game, farm.x + 1, farm.z); tg.raider = { x: hm.x, z: hm.z }; farm.data.grow = 1; tick();
  check("raiders trample a farm they cross", Math.abs(farm.data.grow - 0.7) < 1e-9 && n("trampled") === 1);
  clearGrumps();
  // the wreck's rooms
  X().places.slice().forEach(q => D._placeEnd(game, q, true)); clearBeasts(); emptyBag();
  const rooms = [0, 1, 2, 3].map(i => D._placeAdd(game, "room", { x: site.x + 2 + i, z: site.z + 2 }, { room: i }));
  put(me, rooms[0].x + 1, rooms[0].z); const ro0 = use(rooms[0]), warden = s().posts.find(q => q.bid === "wreckwarden");
  check("the ark wreck is sealed by its warden until that is beaten", !ro0.ok && !!warden && !X().wreckOpen);
  beat(grumpOf(warden)); const ro1 = use(rooms[0]);
  check("then each room wants its own offering", X().wreckOpen > 0 && !ro1.ok && /seed/.test(ro1.msg));
  const pop0 = SB.Game.smols(game).length;
  rooms.forEach(rm => { const R = D.ROOMS[rm.room]; Object.keys(R.need).forEach(k => Surv.add(me, k, R.need[k])); put(me, rm.x + 1, rm.z); const r = use(rm); if (!r.ok) pbad.push("room" + rm.room + ":" + r.msg); });
  check("mend all four rooms: each gives something back, and the wreck is whole", !pbad.length && n("rooms") === 4 && X().wreckWhole > 0 && D.roomDone(game, 2) && SB.Game.smols(game).length > pop0, pbad.join(","));
  farm.data.grow = 0.2; game.ended = true; X().did.room5 = 0; put(me, hm.x, hm.z); D.dawn2(game);
  check("the grow room: farms come on a little every dawn", farm.data.grow >= 0.3 - 1e-9);
  check("after the ending one more room turns up: the story room", D.placesOf(game, "room").some(q => q.room === 4));
  game.ended = false; X().wave = null; X().feast = null; X().sky = null; clearBeasts();
  // seeding
  X().did = {}; X().places.slice().forEach(q => D._placeEnd(game, q, true)); e1.beaten = false; game.sites.forEach(q => { if (q.kind === "camp" || q.kind === "ruin" || q.kind === "cave") q.found = true; });
  for (let i = 0; i < 14; i++) { game.time += SB.DAY_LENGTH; D.seed(game); }
  const kinds = {}; X().places.forEach(q => { kinds[q.kind] = (kinds[q.kind] || 0) + 1; });
  check("the island seeds its own places: knots, a snare and loose rocks on the road to a lair, a door, a pit", kinds.knot === 3 && kinds.snare === 1 && kinds.rockfall === 1 && kinds.door === 1 && kinds.pit === 1, JSON.stringify(kinds));
  check("and a ring, a hollow with alarm caps, a hoard at each camp, a nest at each cave, a relic or sealed ruin at each ruin", kinds.arena === 1 && kinds.hollow === 1 && kinds.alarmcap === 2 && kinds.hoard >= 1 && kinds.nest >= 1 && (kinds.sealedruin || 0) + (kinds.talkrelic || 0) >= 1, JSON.stringify(kinds));
  check("with their keepers: a lair guard, a camp guard, a wreck's sleeper, a cave bug, the hollow's keeper", ["lairguard", "campguard", "bug", "hushguard"].every(b => s().posts.some(q => q.bid === b)) && s().posts.some(q => q.bid === "sleeper" || q.bid === "dronelet"), s().posts.map(q => q.bid).join(","));
  check("a lair nobody is ready for has a stalker that can't be beaten", s().posts.some(q => q.bid === "stalker" && q.guard === "early"));
  check("each captain keeps its own kind about its lair", D.LAIR_KIND.gloom !== D.LAIR_KIND.murk && D.LAIR_KIND.murk !== D.LAIR_KIND.night && Object.keys(D.LAIR_KIND).every(k => D.BEAST_BY[D.LAIR_KIND[k]]));
  ["gloom", "murk", "night"].forEach(id => { B.state(game).list[id].beaten = true; }); game.time += SB.DAY_LENGTH; D.seed(game);
  const hx = s().posts.find(q => q.bid === "hexer");
  check("with all three captains down, a grump hexer sets up at the wreck, and nothing of the last act is out yet", !!hx && !D.placesOf(game, "pillar").length && !D.placesOf(game, "gate").length);
  beat(grumpOf(hx)); game.time += SB.DAY_LENGTH; D.seed(game);
  check("its fall starts the last act: four dark pillars, the den, and the gate", X().lastAct > 0 && D.placesOf(game, "pillar").length === 4 && D.placesOf(game, "den").length === 1 && D.placesOf(game, "gate").length === 1);
  ["gloom", "murk", "night"].forEach(id => { B.state(game).list[id].beaten = false; });
  game.settings.wilds = "harsh"; const sf0 = wn("starfruit"); const hb = D.spawnBeast(game, "seawarden", far(30), { quiet: true }); beat(grumpOf(hb)); game.settings.wilds = "normal";
  check("on a harsh island a big one leaves one thing more", wn("starfruit") === sf0 + 1);
  X().places.slice().forEach(q => D._placeEnd(game, q, true)); clearBeasts();

  console.log("19. quest lines");
  X().lines = {}; X().boons = []; X().knack = null; emptyBag(); X().wave = null; game.world.season = 1; put(me, hm.x + 2, hm.z); s().raid.truce = 0;
  const lsp = game.sparks; let lbad = [], sides = {};
  D.LINES.forEach(L => {
    const l = D.lineStart(game, L.id); let guardN = 0;
    if (!l) { lbad.push(L.id + ":start"); return; }
    while (!l.done && guardN++ < 12) {
      const st = L.steps[l.step];
      if (st[0] === "go") { if (l.x == null) { lbad.push(L.id + ":nomark"); break; } put(me, l.x + 1, l.z); D.tick2(game, 3); }
      else if (st[0] === "bring") { Object.keys(st[2]).forEach(k => Surv.add(me, k, st[2][k])); const r = D.lineHand(game, me, L.id); if (!r.ok) { lbad.push(L.id + ":" + r.msg); break; } }
      else if (st[0] === "pick") { const i = st[3] ? st[2].findIndex(o => o[1] === st[3]) : (L.id === "twosides" ? 2 : 0); const r = D.linePick(game, me, L.id, i); if (!r.ok) { lbad.push(L.id + ":" + r.msg); break; } sides[L.id] = l.side; }
      else if (st[0] === "count") { D._bump(game, st[2], st[3]); D.tick2(game, 3); }
      else if (st[0] === "beat") { const q = s().posts.find(o => o.bid === st[2]); if (!q) { lbad.push(L.id + ":nobeast"); break; } beat(grumpOf(q)); D.tick2(game, 3); }
      else if (st[0] === "wave") { const r = D.lineWave(game, me, L.id); if (!r.ok) { lbad.push(L.id + ":" + r.msg); break; } runWave(); D.tick2(game, 3); }
      else if (st[0] === "have") { if (st[2] === "den") X().ends.den = 1; D.tick2(game, 3); }
      else if (st[0] === "place") { const q = D.placeById(game, l.pid); if (!q) { lbad.push(L.id + ":noplace"); break; } D._placeEnd(game, q); D.tick2(game, 3); }
      emptyBag();
    }
    if (!l.done) lbad.push(L.id + ":stuck at " + l.step);
  });
  check("all " + D.LINES.length + " quest lines can be walked from the first found thing to the end", !lbad.length && ev.darkLineDone === D.LINES.length && n("lines") === D.LINES.length, lbad.join(" | "));
  check("and they pay: sparks, boons, items", game.sparks > lsp + 150 && ["word", "stars", "lodge", "hard", "pay", "quiet"].every(b => D.hasBoon(game, b)), (game.sparks - lsp) + " " + X().boons.join(","));
  check("the thinkers' test wants the right answer", (function () { delete X().lines.college; D.lineStart(game, "college"); const r = D.linePick(game, me, "college", 0); return !r.ok && X().lines.college.step === 0 && D.linePick(game, me, "college", 1).ok; })());
  check("the crystal forge made the one thing you chose", sides.forge === "duskcharm");
  check("the inner watch's gift is your knack, and you can change it", D.knack(game) === "quiet" && D.setKnack(game, "hard") && D.knack(game) === "hard" && SB.Ext.damage(game, me, {}, { dmg: 1 }) >= 1.1 && !D.setKnack(game, "stars"));
  check("making the two families eat together ends the feud for good", X().did.peace > 0);
  check("three more endings were reached by story: the far signal, the elder ark, the den", X().ends.journey > 0 && X().ends.ascent > 0 && X().ends.den > 0 && D.metFaction(game, "elder") && D.rank(game, "elder").key === "patrons");
  check("the reed folk and the hush are peoples you have met now, and the tab shows them", D.metFaction(game, "reed") && D.metFaction(game, "hush") && D.placesOf(game, "reedcamp").length === 1 && /the reed folk/.test(D.html(game, me, () => "")));
  const pal = SB.Game.byId(game, X().pal2);
  check("the smol from the sealed pod stays, and has opinions", !!pal && pal.dkPal === 1 && (function () { put(pal, me.x + 2, me.z); X().opT = 0; SB.bus.emit("darkFeast", { def: D.FEASTS[0], medal: 1 }); return n("opinions") === 1; })());
  check("the surveyor pins a note about somewhere nobody has found", X().did.surveyor > 0 && (function () { game.sites.forEach((q, i) => { if (i < 2) { q.found = false; q.gone = false; } }); const e = D._scoutNotice(game, "the surveyor's note"); if (!e) return false; game.sites[e.ref].found = true; D.tick2(game, 3); return e.done === true; })());
  check("only three stories open at once", (function () { X().lines = {}; D.openLines(game); return D.linesOn(game).length === D.LINE_MAX; })());
  Surv.add(me, "starchart", 1); put(me, hm.x - 5, hm.z + 3); const ch = D.readChart(game, me);
  check("the ark's star chart, read at the dome: a vision, and it can't be put down", ch.ok && /vision/.test(ch.msg) && !D.readChart(game, me).ok && D.QUEST.starchart === 1);
  X().lines = {}; X().places.slice().forEach(q => D._placeEnd(game, q, true)); clearBeasts(); emptyBag(); X().wave = null;

  console.log("20. visitors");
  put(me, hm.x + 2, hm.z); X().guests = []; game.world.season = 3; game.world.night = true; me.purse = 30; let gbad = [];
  folk()[0].chem.lonely = 0.9; folk()[2].captive = 0; folk()[2].captiveT = game.time;
  ev.darkGuest = 0;
  D.GUESTS.forEach(d => {
    X().guests = []; emptyBag(); Surv.add(me, "berry", 2); Surv.add(me, "pumpkin", 1); Surv.add(me, "carrot", 1); Surv.add(me, "grain", 1); Surv.add(me, "honey", 1); Surv.add(me, "fish", 2); Surv.add(me, "metal", 2); Surv.add(me, "cooked", 2);
    for (let i = 0; i < 6; i++) Surv.spawn(game, "berry", 1, hm.x + 1 + i * 0.2, hm.z + 1);
    const gq = D.addGuest(game, d.id); if (!gq) { gbad.push(d.id + ":add"); return; }
    if (d.id === "raccoons") Surv.add(me, "berry", 3);
    const r = D.guestAct(game, me, d.id, false); if (!r.ok) gbad.push(d.id + ":" + r.msg);
  });
  check("all " + D.GUESTS.length + " kinds of visitor can be said yes to", !gbad.length && ev.darkGuest === D.GUESTS.length, gbad.join(" | "));
  check("the ransom was paid and the captive is running home", folk()[2].captive == null && n("ransomed") === 1);
  check("the odd visitor only the sad smol could see is gone, and the smol is better", folk()[0].chem.lonely < 0.2 && n("cheered") === 1);
  check("the survivor from another ark joined, with odd genes", n("aliens") === 1 && SB.Game.smols(game).some(c => c.dkOdd === 1));
  check("the clever stranger joined, with a quirk you will find out about", SB.Game.smols(game).some(c => c.dkQuirk) && (function () { const q = SB.Game.smols(game).find(c => c.dkQuirk); q.dkQuirkDay = 0; D.dawn2(game); return q.dkQuirkTold === 1 && n("quirks") === 1; })());
  X().guests = []; X().wave = null; X().feast = null; X().sky = null; clearBeasts();
  check("a visitor has to be answered at the village", (function () { D.addGuest(game, "giant"); put(me, hm.x + 60, hm.z); const r = D.guestAct(game, me, "giant", true); put(me, hm.x + 2, hm.z); return !r.ok && D.guestAct(game, me, "giant", true).ok && !X().guests.length; })());
  // ones that stay, and what happens when they go
  D.addGuest(game, "deserter"); D.guestAct(game, me, "deserter", false); const gd0 = X().guests[0];
  check("a runaway grump hides with you for two days", gd0.keep === 1 && !D.guestAct(game, me, "deserter", true).ok);
  gd0.until = 0; D._guestsDawn(game);
  check("then it slips off, leaving its secrets", n("secrets") === 1 && !X().guests.some(q => q.id === "deserter"));
  X().guests = []; D.addGuest(game, "demand"); X().guests[0].until = 0; s().raid.pending = 0; D._guestsDawn(game);
  check("ignore the grumps' demand and a war party is sent", s().raid.pending > 0);
  s().raid.pending = 0; X().guests = [];
  emptyBag(); Surv.add(me, "metal", 6); for (let i = 0; i < 3; i++) { X().guests = []; D.addGuest(game, "tinkers"); D.guestAct(game, me, "tinkers", false); }
  check("trade with the tinkers three times and they set up a camp of their own", D.placesOf(game, "tinkercamp").length === 1 && n("tinkerTrades") >= 3);
  X().guests = []; emptyBag(); Surv.add(me, "fish", 3); for (let i = 0; i < 3; i++) { X().guests = []; D.addGuest(game, "angler"); D.guestAct(game, me, "angler", false); }
  check("the fisher's daily fish, with something extra at the third", n("angler") >= 3 && (have("rod") >= 1 || !K.rod));
  X().guests = []; let came = 0; for (let i = 0; i < 30 && !came; i++) { game.time += SB.DAY_LENGTH; if (D._guestsDawn(game)) came = 1; }
  check("visitors turn up by themselves some mornings", came === 1 && X().guests.length === 1);
  X().guests = []; game.world.season = 1; game.world.night = false;

  console.log("21. wishes, and things that come over a smol");
  X().wishes = []; emptyBag(); put(me, hm.x + 2, hm.z);
  const A = folk().filter(c => c.stage >= 3);
  const elder = A[0], kid = folk().find(c => c.stage < 3) || A[5]; elder.stage = 4; kid.stage = 1; A[1].age = 1200; A[2].stage = 2;
  const wz = n("wishes"); ev.darkWishDone = 0;
  const w1b = D.addWish(game, "last", elder);
  check("an elder has a last wish", !!w1b && /last wish/.test(D.wishText(game, w1b)) && !D.grant(game, me, 0).ok);
  const need1 = D.WISHES.last.need(elder); Object.keys(need1).forEach(k => Surv.add(me, k, need1[k]));
  const gr1 = D.grant(game, me, 0); SB.bus.emit("death", { c: elder, cause: "old" });
  check("grant it, and the tribe grieves easier when its time comes", gr1.ok && elder.dkLast === 1 && n("wishes") === wz + 1 && n("softened") === 1 && ev.darkWishDone === 1, gr1.msg);
  let wb = [];
  [["midlife", A[1]], ["picky", kid], ["aspire", A[3]], ["plush", kid], ["loud", kid], ["rite", A[4]], ["lastwish", A[3]]].forEach(pr => {
    X().wishes = []; emptyBag(); const w = D.addWish(game, pr[0], pr[1], "Old Bim"); if (!w) { wb.push(pr[0] + ":add"); return; }
    const d = D.WISHES[pr[0]], nd = d.need ? d.need(pr[1]) : null; if (nd) Object.keys(nd).forEach(k => Surv.add(me, k, nd[k]));
    put(pr[1], me.x + 1, me.z); const r = D.grant(game, me, 0); if (!r.ok) wb.push(pr[0] + ":" + r.msg);
  });
  check("a restless adult, a picky kid, an aspiration, a plush that answers back, a loud day, a coming-of-age rite, a ghost's unfinished business: all can be granted", !wb.length && A[1].dkMid === 1 && A[3].dkAsp === 1 && kid.dkPlush === 1 && n("rites2") === 1, wb.join(" | "));
  A[3].dkAsp = 2; X().wishes = []; D.addWish(game, "aspire", A[3]); const na = D.WISHES.aspire.need(A[3]); Object.keys(na).forEach(k => Surv.add(me, k, na[k])); D.grant(game, me, 0);
  check("three steps and a smol has earned a title", A[3].dkAsp === 3 && /^the /.test(A[3].dkTitle));
  X().wishes = []; const wt = D.addWish(game, "teen", A[2]); const far1 = D.grant(game, me, 0); put(me, wt.x + 1, wt.z); const tr1 = D.grant(game, me, 0);
  check("a teen sneaks off to the ruins: go and fetch it", !far1.ok && tr1.ok && n("wish:teen") === 1);
  put(me, hm.x + 2, hm.z); X().wishes = []; const wc = D.addWish(game, "clingy", kid); put(kid, me.x + 20, me.z); kid.action = null; tick();
  check("a clingy kid follows you about", !!wc && !!kid.action);
  X().wishes = []; A[4].stage = 2; SB.bus.emit("grow", { c: Object.assign(A[4], { stage: 3 }) });
  check("a teen growing up brings on its rite", X().wishes.some(w => w.wid === "rite" && w.who === A[4].id));
  X().wishes = []; game.time += SB.DAY_LENGTH; D._wishesDawn(game);
  check("a wish turns up by itself at dawn", X().wishes.length === 1);
  check("every smol has a “before the sleep”", /^before the sleep, /.test(D.before(me)) && D.before(me) === D.before(me) && D.before(me) !== D.before(A[1]));
  check("circles by trade, with standing from granted wishes", ["makers", "hunters", "thinkers", "kids"].indexOf(D.circleOf(A[1])) >= 0 && D.circleOf(kid) === "kids" && Object.keys(X().circ).length >= 2);
  // conditions
  X().conds = []; game.world.night = true;
  const hg = A[2]; SB.bus.emit("scoutHit", { c: hg, g: {} }); let tries = 0; while (!D.condOf(game, hg) && tries++ < 200) SB.bus.emit("scoutHit", { c: hg, g: {} });
  check("now and then a grump's bite at night leaves a smol half-grump", !!D.condOf(game, hg) && D.condOf(game, hg).id === "halfgrump" && ev.darkCond === 1, tries + " bites");
  const fire3 = game.world.structures.find(b => b.kind === "campfire"); fire3.data.lit = true; fire3.data.fuel = 1; fire3.done = true; game.world.fires = [fire3]; put(hg, fire3.x + 1, fire3.z); hg.action = null; hg.chem.anger = 0; tick();
  check("it scowls, and shuns the fire", hg.chem.anger > 0 && !!hg.action);
  game.world.fires = []; put(me, hg.x + 1, hg.z); const href = { type: "creature", id: hg.id };
  check("look at it: a brew would cure it", /brew/.test((P.options(game, me, href).place || {}).label || ""), (P.options(game, me, href).place || {}).label);
  const cu0 = D.cure(game, me, hg); Surv.add(me, "potion", 1); const cu1 = D.cure(game, me, hg);
  check("and does", !cu0.ok && cu1.ok && !D.condOf(game, hg) && n("cured:halfgrump") === 1);
  D.addCond(game, me, "halfgrump"); SB.bus.emit("darkRest", { c: me, id: "gloom" });
  check("resting at a well of light takes it out of you, too", !D.condOf(game, me));
  X().sky = { id: "grumpmoon", until: game.time + 999 }; A.forEach(c => { c.stage = 3; }); D.dusk2(game);
  const feral = X().conds.filter(e => e.id === "feral");
  check("on a grump moon a few smols go feral, and run as a pack behind a leader", feral.length >= 2 && (function () { const L = SB.Game.byId(game, feral[0].cid), o = SB.Game.byId(game, feral[1].cid); put(o, L.x + 20, L.z); o.action = null; tick(); return !!o.action; })(), "" + feral.length);
  emptyBag(); Surv.add(me, "berry", 1); const f1 = SB.Game.byId(game, feral[1].cid); put(me, f1.x + 1, f1.z); const cf = D.cure(game, me, f1);
  X().sky = null; game.world.night = false; tick();
  check("food calms one. dawn ends it for the rest", cf.ok && !X().conds.some(e => e.id === "feral"));
  game.world.night = true; D.addCond(game, A[1], "sleepwalk"); A[1].action = null; tick(); const walking = !!A[1].action; put(me, A[1].x + 1, A[1].z); const wk = D.cure(game, me, A[1]);
  check("a sleepwalker heads for the dark until you wake it", walking && wk.ok);
  game.world.night = false; X().conds = []; clearBeasts(); X().wave = null; X().sky = null; X().feast = null;
  X().places.slice().forEach(q => D._placeEnd(game, q, true));

  console.log("22. gatherings");
  put(me, hm.x + 2, hm.z); emptyBag(); X().feastDay = 0; X().did.year2 = 0;
  game.world.structures.forEach(b => { if (b.kind === "campfire" && b.data) { b.data.lit = true; b.data.fuel = 1; } });
  const f0 = D.startFeast(game, "potluck", me), T0 = D.feastTasks(game);
  check("throw a potluck: a list of things to do, a cook and a singer", f0.ok && T0.length === 2 && T0[0].k === "food" && !T0[0].done && T0[1].done && !!X().feast.cook && !!X().feast.singer, JSON.stringify(T0.map(t => t.have)));
  check("one gathering at a time", !D.startFeast(game, "quiet", me).ok);
  Surv.add(me, "berry", 2); D.feastFood(game, me); D.feastFood(game, me);
  check("food on the table goes twice as far with a cook", D.feastTasks(game)[0].done && have("berry") === 0);
  const gm = D.play(game, me, "ring"), gm2 = D.play(game, me, "ring"), fo = D.play(game, me, "fortune");
  check("the stalls: one go each, and a fortune from an elder", gm.ok && !gm2.ok && fo.ok && /i see/.test(fo.msg) && X().feast.games === 2);
  Surv.add(me, "honey", 1); const px = me.x, hy = D.play(game, me, "honey");
  check("the honey-eating contest ends somewhere silly", hy.ok && SB.dist(me.x, me.z, px, hm.z) > 5 && n("silly") === 1, hy.msg);
  put(me, hm.x + 2, hm.z); const spF = game.sparks; X().feast.until = 0; D.tick2(game, 3);
  check("it ends with a medal: gold for everything done", !X().feast && X().medals["feast:potluck"] === 3 && game.sparks >= spF + 6 && n("gold") >= 1 && ev.darkFeast >= 1, [X().medals["feast:potluck"], game.sparks - spF, n("gold")].join());
  check("one a day", /one a day/.test(D.feastWhy(game, me, "quiet")));
  let fbad = [];
  D.FEASTS.forEach(d => { X().feastDay = 0; X().feast = null; game.world.season = d.season != null ? d.season : 1; emptyBag(); if (d.item) Surv.add(me, d.item, 1); if (d.home && !(SB.Home.get(game))) { const hb = SB.World.addStructure(game.world, game, "hut", hm.x + 8, hm.z - 5, { done: true }); SB.Home.claim(game, hb, me); } if (d.room != null) X().places.push({ id: 99999, kind: "room", room: d.room, done: 1, x: 0, z: 0 });
    const r = D.startFeast(game, d.id, me); if (!r.ok) { if (!(d.biome && /no desert/.test(r.msg))) fbad.push(d.id + ":" + r.msg); return; } try { D.tick2(game, 3); D._feastEnd(game); } catch (e) { fbad.push(d.id + ":" + e.message); } });
  X().places = X().places.filter(q => q.id !== 99999); game.world.season = 1;
  check("all " + D.FEASTS.length + " gatherings can be held from start to finish", !fbad.length && n("feasts") >= D.FEASTS.length - 1, fbad.join(" | "));
  // the egg hunt
  X().feastDay = 0; game.world.season = 0; D.startFeast(game, "egghunt", null); const eggs = D.placesOf(game, "egg");
  eggs.slice(0, 3).forEach(e => { put(me, e.x + 1, e.z); D.placeAct(game, me, e, false); });
  X().feast.kidT = 1; D.tick2(game, 3); const kidsGot = X().feast.kidEggs;
  X().feast.until = 0; D.tick2(game, 3);
  check("the egg hunt: five eggs hidden, the kids are looking too, three finds is gold", eggs.length === 5 && kidsGot === 1 && X().medals["feast:egghunt"] === 3 && !D.placesOf(game, "egg").length, [eggs.length, kidsGot, X().medals["feast:egghunt"]].join());
  // the fair: show and games
  X().feastDay = 0; game.world.season = 2; D.startFeast(game, "fair", null); hold("pumpkin"); const sh = D.show(game, me);
  check("the fair's judged table: a pumpkin wins “biggest gourd”", sh.ok && me.dkTitle === "biggest gourd" && X().titles["biggest gourd"] === me.name && X().feast.show === 1);
  check("fair goods are lying about: a paper lantern, sweets", game.world.items.some(o => o.kind === "paperlantern") && game.world.items.some(o => o.kind === "sweet"));
  D._feastEnd(game);
  // derby
  X().feastDay = 0; game.world.season = 1; D.startFeast(game, "derby", null); for (let i = 0; i < 3; i++) SB.bus.emit("fish", { c: me }); X().feast.until = 0; D.tick2(game, 3);
  check("the fishing derby: three fish in the day wins it, and the title", X().medals["feast:derby"] === 3 && me.dkTitle === "best fisher" && n("fish") >= 3);
  // maze
  X().feastDay = 0; game.world.season = 2; game.world.night = true; D.startFeast(game, "spirits", null);
  check("the dark-night maze: three lanterns out past the palisade, and something prowling", D.placesOf(game, "mazelamp").length === 3 && s().posts.some(q => q.bid === "starer"));
  D.placesOf(game, "mazelamp").forEach(e => { put(me, e.x + 1, e.z); D.placeAct(game, me, e, false); }); D._feastEnd(game);
  check("bring all three in", X().medals["feast:spirits"] === 3);
  clearBeasts(); game.world.night = false; game.world.season = 1; put(me, hm.x + 2, hm.z);
  // holiday tradition, race, socks, year two toast
  X().feastDay = 0; const trd = D.tradition(game, 1); D.startFeast(game, "holiday", null);
  check("a holiday the tribe made up, with its own name and custom", X().feast.name === trd.name && / day$/.test(trd.name) && X().feast.trad === trd.does && D.feastJoin(game, me).ok && D.tradition(game, 1).name === trd.name);
  me.purse = 10; const rc = D.race(game, me, 0), rc2 = D.race(game, me, 1);
  check("bet shells on the kids' race", rc.ok && !rc2.ok && (me.purse === 8 || me.purse === 13) && n("bets") === 1, rc.msg);
  Surv.add(me, "socks", 1); X().did.year2 = 1; D._feastEnd(game);
  X().feastDay = 0; D.startFeast(game, "potluck", me);
  check("from the second year every gathering ends with a toast", D.feastTasks(game).some(t => t.k === "toast") && !D.feastToast(game, me).ok && (Surv.add(me, "berry", 1), D.feastToast(game, me).ok));
  D._feastEnd(game); X().did.year2 = 0;
  // real-world days
  check("real-world days leave something at the nest, once a year", (function () { const it = game.world.items.length; const a = D.holidayCheck(game, new Date(2026, 11, 24)), b = D.holidayCheck(game, new Date(2026, 11, 25)), c = D.holidayCheck(game, new Date(2026, 6, 9)), d = D.holidayCheck(game, new Date(2027, 11, 24)); return !!a && a[3] === "gifts" && b === null && c === null && !!d && game.world.items.length > it && n("holidays") === 2; })());
  // the calendar
  X().held = {}; X().feast = null; X().feastDay = 0; game.world.season = 0; put(me, hm.x + 2, hm.z);
  const cal = (function () { game.time += SB.DAY_LENGTH; D.dawn2(game); return X().feast ? X().feast.id : null; })();
  check("the season's gathering starts by itself", cal === "egghunt", "" + cal);
  if (X().feast) D._feastEnd(game); game.world.season = 1; X().wave = null; X().sky = null; clearBeasts(); X().guests = []; X().wishes = [];

  console.log("23. the council, the watch, clubs, orders, things to make");
  put(me, hm.x + 2, hm.z); emptyBag(); X().rules = {}; X().voteDay = 0;
  let passed = null; for (let i = 0; i < 12 && passed === null; i++) { game.time += SB.DAY_LENGTH; const v = D.vote(game, "curfew"); if (v.ok && X().rules.curfew) passed = v.msg; }
  check("put a rule to the council: they vote, and it passes or it doesn't", !!passed && /votes \d+ to \d+/.test(passed) && ev.darkVote >= 1, "" + passed);
  check("one vote a day", !D.vote(game, "share").ok);
  game.world.night = true; A[1].shelterT = 0; tick();
  check("home by dark: everyone but you goes in", A[1].shelterT > 0);
  game.world.night = false; X().rules = { share: 1, firewatch: 1, drum: 1 };
  A[1].chem.hunger = 0.9; Surv.spawn(game, "berry", 1, hm.x + 1, hm.z + 1); for (let i = 0; i < 11; i++) tick();
  check("share the food: the hungriest is fed from what is lying about", A[1].chem.hunger < 0.9 && n("shared") >= 1);
  const tree = game.world.nodes.find(nn => nn.state === "ok" && SB.NODES[nn.kind] && SB.NODES[nn.kind].noun === "plant" && SB.dist(nn.x, nn.z, hm.x, hm.z) < 30) || null;
  if (tree) { tree.state = "burning"; tree.noun = "fire"; (game.world.burning || (game.world.burning = [])).push(tree); tick(); }
  check("the fire watch puts out a fire near the village", !tree || (tree.state === "ok" && n("doused") === 1));
  A[1].asleep = true; SB.bus.emit("darkTheft", {});
  check("the watch drum wakes the village for a thief", A[1].asleep === false && n("drummed") === 1);
  X().rules = { dues: 1 }; X().duesDay = 0; me.purse = 0; const built0 = game.world.structures.filter(b => b.done && b.kind === "hut").length; D._duesDawn(game);
  X().duesDay = 0; me.purse = 50; D._duesDawn(game);
  check("upkeep dues: unpaid, a building crumbles. paid, nothing does", n("duesMissed") === 1 && n("duesPaid") === 1 && me.purse < 50 && game.world.structures.filter(b => b.done && b.kind === "hut").length === built0 - 1);
  X().rules = {};
  // orders
  X().order = null; X().did = {}; game.time += SB.DAY_LENGTH; D.dawn2(game); if (X().feast) D._feastEnd(game);
  const od = D.order(game);
  check("the tribe posts a week-long order", !!od && od.id === "bell" && !D.ringBell(game).ok && !D.orderHand(game, me).ok);
  Surv.add(me, "metal", 2); Surv.add(me, "stick", 4); put(me, hm.x + 2, hm.z); const oh = D.orderHand(game, me);
  A[1].shelterT = 0; const bell = D.ringBell(game);
  check("fill it and the village has a bell for good: ring it and everyone runs indoors", oh.ok && bell.ok && A[1].shelterT >= 60 && X().did.bell === 1);
  X().order = { id: "guardian", until: 9999 }; Surv.add(me, "stone", 8); Surv.add(me, "crystal", 1); const og = D.orderHand(game, me);
  check("another order leaves a stone guardian standing at the village", og.ok && D.placesOf(game, "guardian").length === 1);
  // makes
  emptyBag(); let mb = [];
  D.MAKES.forEach(m => { emptyBag(); game.world.season = m.winter ? 3 : 1; if (m.thinker) A[0].tier = 5; if (D.make(game, me, m.id).ok) mb.push(m.id + ":free"); Object.keys(m.cost).forEach(k => Surv.add(me, k, m.cost[k])); const r = D.make(game, me, m.id); if (!r.ok) mb.push(m.id + ":" + r.msg); else if (!m.place && have(m.id) !== 1) mb.push(m.id + ":none"); });
  A[0].tier = 3; game.world.season = 1;
  check("eight things to make: a mask, a tripwire, a taunt drum, glow bait, a dark idol, a dusk key, a firework, a snow smol", !mb.length && D.placesOf(game, "snowsmol").length === 1, mb.join(" | "));
  put(me, hm.x, hm.z); tick();
  check("a snow smol melts when winter is over", !D.placesOf(game, "snowsmol").length);
  emptyBag(); Surv.add(me, "darkidol", 1); const vi = Surv.inv(me); vi.sel = vi.s.findIndex(sl => sl && sl.k === "darkidol");
  check("hold the dark idol: set it down, and something answers", /dark idol/.test((P.options(game, me, null).place || {}).label || ""));
  // the watch
  emptyBag(); X().watch = []; X().rankGot = 0; X().n.nights = 0;
  put(A[1], me.x + 2, me.z);
  check("stand by a grown smol: your notices offer to ask it into the night watch", D.html(game, me, () => "").indexOf("data-d2='watch:" + A[1].id + "'") > 0 && D.do2(game, me, "watch", A[1].id).ok && D.x2(game).watch.pop() === A[1].id);
  const jw = D.joinWatch(game, me, A[1]), jw2 = D.joinWatch(game, me, A[1]); D.joinWatch(game, me, A[2]); D.joinWatch(game, me, A[3]);
  check("it joins, once", jw.ok && !jw2.ok && D.watchMembers(game) === 3 && n("joined") >= 3);
  check("a rank needs nights defended AND enough in the watch", D.watchRank(game) === 0 && (function () { X().n.nights = 9; X().watch = [A[1].id]; const a = D.watchRank(game); X().watch = [A[1].id, A[2].id, A[3].id]; return a === 1 && D.watchRank(game) === 3; })());
  X().n.nights = 1; X().nightWon = 1; D._watchDawn(game);
  check("a night defended counts at dawn: watcher, with a badge", n("nights") === 2 && X().rankGot === 1 && have("badge") === 1 && ev.darkRank === 1);
  X().n.nights = 9; D._watchDawn(game);
  check("then warden with a spear, then captain of the watch with a bunk", X().rankGot === 3 && have("spear") === 1 && X().did.bunk === 1);
  check("the people you have looked at count toward saying hello to everyone", Object.keys(X().met).length >= 1);
  // clubs
  X().clubs = []; const cl = D.newClub(game, me); put(A[2], me.x + 2, me.z);
  check("start a club, and ask a smol in", cl.ok && X().clubs.length === 1 && D.html(game, me, () => "").indexOf("data-d2='clubin:" + A[2].id + "'") > 0 && D.do2(game, me, "clubin", A[2].id).ok && !D.joinClub(game, A[2]).ok);
  A[2].action = null; put(A[2], hm.x + 30, hm.z); D.dusk2(game);
  check("the club meets at dusk", !!A[2].action && n("clubMeets") === 1);
  clearBeasts(); X().wave = null; X().sky = null; X().conds = []; if (X().feast) D._feastEnd(game);
  // pay in things, tours, books
  emptyBag(); D.do2(game, me, "payitem"); const en = D._post(game, { kind: "bring", k: "stick", need: 1, icon: "x", t: "bring a stick", pay: 8 }); Surv.add(me, "stick", 1); put(me, hm.x + 2, hm.z); const hi = D.handIn(game, me, en.id);
  check("ask the council to pay in useful things instead", hi.ok && s().board.pay === "item" && /potion|seed|torch/.test(en.paid), en.paid);
  D.setPay(game, "shells");
  const tu = D.tour(game), tu2 = D.tour(game); game.time += SB.DAY_LENGTH; D._tourDawn(game);
  check("send two smols off on a walk: they are back by morning with a story", tu.ok && !tu2.ok && !X().tour && n("tours") === 1);
  me.tier = 4; Surv.add(me, "fiber", 2); const wr = D.write(game, me), wr2 = D.write(game, me); me.tier = 3;
  const vb = Surv.inv(me); vb.sel = vb.s.findIndex(sl => sl && sl.k === "book");
  const rb = P.options(game, me, null).place;
  check("write a book, hold it, read it", wr.ok && !wr2.ok && have("book") === 1 && X().books.length === 1 && /read the book/.test((rb || {}).label || "") && /📕/.test(D.readBook(game, me).msg) && /by /.test(D.readBook(game, me).msg + D.readBook(game, me).msg));

  console.log("24. how the island is doing");
  const sc = D.score(game);
  check("the Lantern's score adds up what you have done", sc.of === 12 && sc.pts >= 4 && sc.flames >= 2 && sc.parts.length === 11, sc.pts + " pts");
  game.time = SB.DAY_LENGTH * 1.5;
  check("not before the island's first full year", !D.judge(game, me).ok && !D.yearOne(game));
  game.time = SB.DAY_LENGTH * (SB.seasonDays(game) * 4 + 2.3);
  s().board.seals = 12; D._bump(game, "gold", 2); D._bump(game, "wishes", 5); D._bump(game, "beasts", 10); s().fac.far = 60; B.state(game).list.gloom.beaten = B.state(game).list.murk.beaten = B.state(game).list.night.beaten = true;
  const j1 = D.judge(game, me);
  check("after it: up to four flames, and you can ask again", j1.ok && D.score(game).flames === 4 && X().score.flames === 4 && /prize/.test(j1.msg), j1.msg);
  const wl = D.wellOf(game, "gloom") || (D.lift(game, "gloom", hm.x + 12, hm.z + 12, true), D.wellOf(game, "gloom")); put(me, wl.x + 1, wl.z); const j2 = D.judge(game, me);
  check("four flames: the prize is at a well of light or the ark wreck", j2.ok && have("keepsake") === 1 && X().did.flames4 > 0 && n("judged") === 2);
  X().did.year2 = 0; const pop1 = SB.Game.smols(game).length; put(me, hm.x + 2, hm.z); D.dawn2(game);
  check("year two: a stranger family walks in, and the feasts change", X().did.year2 > 0 && SB.Game.smols(game).length >= pop1 + 1);
  if (X().feast) D._feastEnd(game); X().wave = null; X().sky = null; clearBeasts();
  const pf_2 = D.perfect(game);
  check("how complete: a percent over beasts, skies, waves, gatherings and stories", pf_2.of > 100 && pf_2.have > 30 && pf_2.pct > 20 && pf_2.pct < 100, pf_2.have + "/" + pf_2.of);
  X().feats = {}; ev.darkFeat = 0; const spFt = game.sparks; D.SKIES.forEach(d => { X().skies[d.id] = 1; }); X().ends = { den: 1, void: "seal", dark: 1 }; D._featsCheck(game);
  check("feats: hard do-them-all goals that pay", X().feats.skies > 0 && X().feats.ends > 0 && game.sparks >= spFt + 35 && ev.darkFeat >= 2 && !X().feats.all, [X().feats.skies, X().feats.ends, game.sparks - spFt, ev.darkFeat, X().feats.all].join());
  D.BEASTS.forEach(d => { (X().seen[d.id] || (X().seen[d.id] = { n: 1 })).beat = 1; }); const pop2 = SB.Game.smols(game).length; D._featsCheck(game);
  check("the whole beast book brings a keeper of beasts to live here", X().feats.beastbook > 0 && SB.Game.smols(game).some(c => c.dkTitle === "the keeper of beasts") && SB.Game.smols(game).length === pop2 + 1);
  D.WAVES.forEach(d => { X().medals["wave:" + d.id] = 3; }); D.FEASTS.forEach(d => { X().medals["feast:" + d.id] = 3; }); D.LINES.forEach(L => { X().lines[L.id] = { step: 9, done: 1 }; }); D._featsCheck(game);
  check("100%: a keepsake at the nest", D.perfect(game).pct === 100 && X().feats.all > 0 && game.world.items.some(o => o.kind === "keepsake"));
  const cr2 = D.credits(game);
  check("credits: who made this island", cr2.length >= 7 && /the Lantern: you/.test(cr2.join("|")) && /thank you for playing/.test(cr2.join("|")) && /endings found: the den/.test(cr2.join("|")));
  const hs = D.holds(game), dyn = D.dynasty(game);
  check("each village has a leader, a greeting, a favourite food, a grudge and a custom", hs.length >= 1 && hs.every(H => H.leader && /!$/.test(H.hello) && K[H.food] && H.grudge && H.custom) && JSON.stringify(D.holds(game)) === JSON.stringify(hs));
  check("your smol's line is a dynasty with a standing and a chief", !!dyn && /^the line of /.test(dyn.name) && dyn.n >= 1 && dyn.standing > 0 && !!dyn.chief);
  const sc1 = D.scene(game, A[1], 2), sc2 = D.scene(game, A[1], 2);
  check("a new heart with a smol unlocks a short scene, once", /💗/.test(sc1) && /before the sleep/.test(sc1) && sc2 === "" && (SB.bus.emit("friendLevel", { c: A[2], level: 4, text: "" }), n("scenes") === 2));
  game.time = SB.DAY_LENGTH * 0.4; X().pal = null; const pals = D.pals(game), sp = D.setPal(game, pals[0].id);
  put(pals[0], me.x + 20, me.z); pals[0].action = null; X().palT = 0; tick();
  check("day one: pick which founder walks with you", pals.length === 2 && sp.ok && !D.setPal(game, pals[1].id).ok && !!pals[0].action);
  game.time = SB.DAY_LENGTH * 20.3;
  check("endings found so far are listed, five to find", Object.keys(D.ENDS).length === 5 && /endings found: 3 of 5/.test(D.html(game, me, () => "")));

  console.log("25. the tab, the buttons, the save");
  X().wave = null; X().feast = null; put(me, hm.x + 2, hm.z); X().guests = []; D.addGuest(game, "giant"); X().wishes = []; D.addWish(game, "aspire", A[3].dkAsp >= 3 ? A[1] : A[3]); X().lines = {}; D.lineStart(game, "makers"); D.startSky(game, "aurora", true);
  const html = D.html(game, me, () => "");
  check("the notices tab shows today, visitors, wishes and stories, and folds the rest away", /beasts about: \d of \d/.test(html) && /danger here/.test(html) && /a gentle giant/.test(html) && /data-d2='guest:giant'/.test(html) && /data-d2='grant:0'/.test(html) && /the makers&#39; bench/.test(html) && /data-d2='hand:makers'/.test(html) && (html.match(/<details>/g) || []).length >= 5 && /lights in the night sky/.test(html), [/beasts about: \d of \d/, /danger here/, /a gentle giant/, /data-d2='guest:giant'/, /data-d2='grant:0'/, /the makers&#39; bench/, /data-d2='hand:makers'/, /lights in the night sky/].map(r => r.test(html) ? 1 : 0).join(""));
  check("it is still the old tab on top", /notice board/.test(html) && /who tells the story/.test(html));
  check("every button in it names a verb the tab knows", (html.match(/data-d2='([a-z2]+)/g) || []).every(m => /watch|clubin|stars|signal|sing|word|pal|here|hereb|ffood|trad|toast|show|play|bet|guest|guestb|grant|hand|pick|lwave|order|feast|call|wave|vote|club|tour|write|bell|feed|make|knack|judge|payitem|socks/.test(m)));
  const clicks = [];
  const root = { querySelectorAll: (sel) => sel === "[data-d2]" ? (html.match(/data-d2='[^']+'/g) || []).slice(0, 400).map(m => ({ getAttribute: () => m.slice(9, -1), addEventListener: (e, fn) => clicks.push(fn) })) : [] };
  let said = 0, threw3 = ""; D.wire(root, game, me, () => {}, () => { said++; });
  try { clicks.forEach(fn => fn()); } catch (e) { threw3 = String(e && e.stack || e); }
  check("pressing every button in the tab never throws", clicks.length > 40 && !threw3 && said > 20, clicks.length + " buttons, " + threw3.slice(0, 300));
  const goals = []; SB.Ext.goals(game, (t, pgs, done, big) => goals.push(t));
  check("stories show on the sky's goals list", goals.some(t => /bench|giant|story|hermit|somebody|lost song|wave|potluck/.test(t)), goals.join(" | ").slice(0, 200));
  put(me, far(80).x, far(80).z);
  check("far from the nest a danger chip shows by your hearts", SB.Ext.vitals(game, me).some(v => /danger/.test(v.text)));
  put(me, hm.x + 2, hm.z);
  // running is loud; walking and creeping are not
  const rsp = SB.Creature.runSpeed(me) * 0.5;
  X().noise = 0; D.setSneak(false); D.tick2(game, 3); game.time += 0.5; me.x += rsp / 1.75; D.tick2(game, 3); const walkQuiet = !(X().noise > game.time);
  game.time += 0.5; me.x += rsp; D.tick2(game, 3); const runLoud = X().noise > game.time;
  X().noise = 0; D.setSneak(true); game.time += 0.5; me.x += rsp; D.tick2(game, 3);
  check("running makes a noise that sound-hunters hear. walking doesn't, and nor does creeping", walkQuiet && runLoud && !(X().noise > game.time), [walkQuiet, runLoud, X().noise, game.time, SB.Creature.runSpeed(me), P.active].join());
  D.setSneak(false); put(me, hm.x + 2, hm.z);
  const keepP = D._placeAdd(game, "cube", far(12), {}); game.world.structures = game.world.structures.filter(b => !(b.kind === "darkmark" && b.data.dk === "pl-" + keepP.id)); game.time += 40; tick();
  check("a marked place lost from the world (a reload, a grump) stands back up with its name", game.world.structures.some(b => b.kind === "darkmark" && b.data.dk === "pl-" + keepP.id && b.name === "the shiny cube" && b.done));
  D._placeEnd(game, keepP, true);
  X().guests = []; D.addGuest(game, "demand"); const goals2 = []; SB.Ext.goals(game, (t, pgs, done, big) => goals2.push([t, big]));
  check("a visitor with something at stake is on the goals list, loudly", goals2.some(g0 => /grump messenger/.test(g0[0]) && g0[1] === true));
  X().guests = [];
  const saved = JSON.parse(JSON.stringify(game.quests.dark));
  check("all of round 2 goes in the save", !!saved.x2 && saved.x2.n.lines >= 30 && Object.keys(saved.x2.medals).length > 20 && saved.x2.boons.length >= 6 && Array.isArray(saved.x2.places) && saved.x2.ends.den === 1);
  game.quests.dark = saved; clearGrumps();
  let threw4 = "";
  try {
    X().wave = null; if (X().feast) D._feastEnd(game);
    for (let dd = 0; dd < 24; dd++) {
      game.world.season = dd % 4; game.world.night = false; D.dawn(game); D.dawn2(game);
      for (let i = 0; i < 6; i++) { game.time += SB.DAY_LENGTH / 14; tick(); }
      game.world.night = true; D.dusk(game); D.dusk2(game);
      for (let i = 0; i < 6; i++) { game.time += SB.DAY_LENGTH / 14; tick(); }
      SB.Ext.goals(game, () => {}); SB.Ext.vitals(game, me); D.html(game, me, () => "");
      if (dd === 12) P.leave();
    }
    game.offline = true; tick(); game.offline = false;
  } catch (e) { threw4 = String(e && e.stack || e); }
  check("24 days and nights of it, in a body and out, never throw", !threw4, threw4.slice(0, 400));
  check("and the island was busy: skies, places, visitors, beasts came and went by themselves", n("skies") > D.SKIES.length + 3 && ev.darkPlace > 100 && ev.darkGuest > D.GUESTS.length + 3 && ev.darkBeast > D.BEASTS.length + 20, [n("skies"), ev.darkPlace, ev.darkGuest, ev.darkBeast].join(","));
  check("posted things stayed within reason", s().posts.length < 40 && X().places.length < 80 && D.board(game).list.length < 40, s().posts.length + " posts, " + X().places.length + " places, " + D.board(game).list.length + " notices");
});

// ---------------------------------------------------------------- round 2 in the real simulation, with every other system loaded
seeded(777, () => {
  const ctx = load(), SBx = ctx.SB;
  const LIST = ["possess.js", "body.js", "wilds.js", "mine.js", "bosses.js", "ext.js", "home.js", "loot.js", "friends.js", "town.js", "dark.js", "powers.js", "fight.js", "deep.js", "harvest.js", "animals.js"];
  const loaded0 = { "possess.js": "Possess", "body.js": "Body", "wilds.js": "Wilds", "mine.js": "Mine", "bosses.js": "Bosses", "ext.js": "Ext" };
  LIST.forEach(f => { if (loaded0[f] && SBx[loaded0[f]]) return; if (fs.existsSync(path.join(__dirname, "..", "play", "js", f))) vm.runInContext(js(f), ctx, { filename: f }); });
  const SB = ctx.SB, P = SB.Possess, D = SB.Dark; P.headless = true;
  const game = SB.Game.newGame(4242); SB.Game.current = game; game.tutorial.done = true; (game.settings = game.settings || {}).povThreat = "done";
  SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod));
  const me = SB.Game.smols(game)[0]; me.tier = 3; me.stage = 3;
  const hm = SB.Society.home(game, 0);
  for (let i = 0; i < 6; i++) { const c = D._h.newcomer(game, hm.x + 2 + i * 0.5, hm.z + 2, false, "s" + i); if (c) c.tier = 3; }
  game.time = SB.DAY_LENGTH * 4.2; game.stats.maxTier = 3;
  console.log("26. round 2 in the real simulation");
  let threw = "", steps = 0;
  const run = (sec) => { for (let t = 0; t < sec; t += 0.25) { SB.Game.step(game, 0.25); steps++; } };
  try {
    run(20);
    const at = D._h.spotAt(game, hm.x, hm.z, 14, 18, Math.random, null);
    ["thrower", "blob", "swooper", "packhound", "creaker", "wisp", "yawn"].forEach((id, i) => D.spawnBeast(game, id, { x: at.x + i * 2, z: at.z + i }, { quiet: true }));
    D.startSky(game, "ashfall", true); D.startWave(game, "swarm", null, null); D.addGuest(game, "giant"); D.startFeast(game, "potluck", null); D.lineStart(game, "bards"); D._placeAdd(game, "cube", { x: hm.x + 5, z: hm.z + 5 }, {}); D._placeAdd(game, "pond", { x: hm.x - 6, z: hm.z + 5 }, {});
    D.addCond(game, SB.Game.smols(game)[2], "halfgrump"); D.x2(game).rules = { share: 1, curfew: 1, firewatch: 1, drum: 1 };
    run(60);
    P.enter(game, me, { free: true }); me.x = at.x + 2; me.z = at.z; me.px = me.x; me.pz = me.z; me.chem.health = 1;
    run(90);
    if (P.active) P.leave();
    run(SB.DAY_LENGTH * 1.2);
    SB.Ext.goals(game, () => {}); D.html(game, me, () => "");
  } catch (e) { threw = String(e && e.stack || e); }
  const off = Object.keys(SB.Ext._handlers).map(k => SB.Ext._handlers[k].filter(f => f._off).length).reduce((a, b) => a + b, 0);
  check("a day and more of the whole game, with beasts out, a wave, a sky, a gathering and somebody in a body: nothing throws", !threw, threw.slice(0, 500));
  check("and no plug-in handler was switched off for throwing", off === 0, off + " off");
  check("the wave and the gathering ran their course by themselves", !D.x2(game).wave && !D.x2(game).feast && steps > 5000, steps + " steps");
  check("the tribe came through it", SB.Game.smols(game).filter(c => !c.stranger).length >= 5, "" + SB.Game.smols(game).length);
});

console.log("12. the files");
const src = js("dark.js"), idx = fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8");
check("the game loads it", /js\/dark\.js/.test(idx));
check("it plugs in through ext.js, and director.js is not edited", /X\.on\("tick", D\.tick\)/.test(src) && /X\.tab\(/.test(src) && !/SB\.Dark/.test(js("director.js")) && !/SB\.Dark/.test(js("bosses.js")));
check("old phones can run it (no arrows, let, const, classes or template strings)", !/=>/.test(src) && !/^\s*(let|const|class)\s/m.test(src) && !/\blet [a-zA-Z_]+ =/.test(src) && src.indexOf("`") < 0 && !/\?\./.test(src));
check("it never touches the island's own dice", !/game\.rng/.test(src));

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
