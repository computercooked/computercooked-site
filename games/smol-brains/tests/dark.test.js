// "the dark fights back": what a beaten captain changes, named grumps with bounties, the storytellers and mercy,
// nine new storyteller cards, the notice board, factions with standing, raids with shape, two side stories.
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
  check("four named grumps, three storytellers and the old tale, three factions", D.NAMED.length === 4 && D.TELLERS.length === 4 && D.FACTIONS.length === 3);

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

console.log("12. the files");
const src = js("dark.js"), idx = fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8");
check("the game loads it", /js\/dark\.js/.test(idx));
check("it plugs in through ext.js, and director.js is not edited", /X\.on\("tick", D\.tick\)/.test(src) && /X\.tab\(/.test(src) && !/SB\.Dark/.test(js("director.js")) && !/SB\.Dark/.test(js("bosses.js")));
check("old phones can run it (no arrows, let, const, classes or template strings)", !/=>/.test(src) && !/^\s*(let|const|class)\s/m.test(src) && !/\blet [a-zA-Z_]+ =/.test(src) && src.indexOf("`") < 0 && !/\?\./.test(src));
check("it never touches the island's own dice", !/game\.rng/.test(src));

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
