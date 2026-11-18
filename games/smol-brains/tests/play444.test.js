// 4.44: what the proof pass turned up in its first four systems (smol-brains-handover/PROOF-PASS.md).
//   1. a smol that "goes down and is carried home" is never announced dead (no death event, no "died" line)
//   2. "no story prompts" also hides a running lesson's line, its marker and the tutorial cards
//   3. sandbox "copy this" is a tool you can reach
//   4. a button on the town tab acts once per press
//   5. found places stay where they were found, whatever changes on the island
//   6. words, and honey island's hives
//   7. a thing added to the island in play is still there after a load
//   8. the welcome-back card reads as a generation passing
//   9. the bag drops a handler wired twice to one button, on every tab
// node games/smol-brains/tests/play444.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra != null && extra !== "" ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const dir = path.join(__dirname, "..", "play", "js");
const js = f => fs.readFileSync(path.join(dir, f), "utf8");
const order = (fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8").match(/src="js\/([a-z0-9-]+)\.js"/g) || []).map(s => s.slice(8, -4));
const EXTRA = ["ext", "bosses", "body", "possess", "home", "loot", "friends", "town", "dark", "powers", "fight", "deep", "harvest", "animals", "qol", "wear", "shapes", "wardrobe3", "motion3", "world3", "helpers3", "arrivals3", "minds3"];
function fresh(seed) {
  const ctx = load(), SB = ctx.SB;
  order.filter(n => EXTRA.indexOf(n) >= 0).forEach(n => { if (n === "bosses" && SB.Bosses) return; vm.runInContext(js(n + ".js"), ctx, { filename: n + ".js" }); });
  if (SB.Possess) SB.Possess.headless = true;
  const game = SB.Game.newGame(seed); SB.Game.current = game; game.tutorial.done = true;
  return { SB, game, ctx };
}
function trio(SB, game) {
  const sp = game.world.T.spawn, out = [];
  for (let i = 0; i < 3; i++) out.push(SB.Game.spawnSmol(game, { x: sp.x - 1 + i, z: sp.z + 2, age: 560 }));
  for (let k = 0; k < 3; k++) SB.Game.step(game, SB.TICK); // "who is near" reads a grid that fills on a tick
  out.forEach(c => { c.chem.health = 1; c.chem.hunger = 0.2; });
  return out;
}

console.log("1. a smol that goes down is not announced dead");
{
  const { SB, game } = fresh(4441), [a, b, c] = trio(SB, game);
  const deaths = []; SB.bus.on("death", d => { if (d && d.c) deaths.push(d.c.name + ":" + d.cause); });
  const downs = []; SB.bus.on("downed", d => { if (d && d.c) downs.push(d.c.name); });
  const log0 = game.log.length, n0 = game.stats.deaths;
  SB.Creature.die(a, game, "hurt");
  const lines = game.log.slice(log0).map(l => String(l.text || ""));
  check("hurt too badly, with friends near: it is alive and asleep", a.alive && !a.dying && a.asleep && a.chem.health > 0.3);
  check("no death was announced for it", deaths.length === 0, deaths.join(" "));
  check("the deaths count did not move", game.stats.deaths === n0, game.stats.deaths + " vs " + n0);
  check("the log says it went down, and never that it died", lines.some(t => /went down, and was carried home/.test(t)) && !lines.some(t => /got hurt too badly|died/.test(t)), lines.join(" | ").slice(0, 160));
  check("\"downed\" was told once", downs.length === 1 && downs[0] === a.name, downs.join(" "));
  check("it is not on the list of bodies and has no funeral", !(game.bodies || []).some(x => x === a) && !(game.funerals || []).some(f => f.ids && f.ids.indexOf(a.id) >= 0));
  SB.Creature.die(a, game, "hurt");
  check("a second fall the same day is real", !a.alive && deaths.length === 1 && deaths[0] === a.name + ":hurt", deaths.join(" "));
  SB.Creature.die(b, game, "starved");
  check("starving is not a fall: that death is real too", !b.alive && deaths.length === 2);
}
{
  const { SB, game } = fresh(4442), [a, b, c] = trio(SB, game);
  const deaths = []; SB.bus.on("death", d => { if (d && d.c) deaths.push(d.c.name + ":" + d.cause); });
  SB.Powers.toggle(game, "noDeath");
  check("the switch is on", !!game.settings.noDeath);
  SB.Creature.die(a, game, "starved");
  check("\"nobody is lost\": a starving smol goes down instead", a.alive && deaths.length === 0, deaths.join(" "));
  game.tutorial.done = false;
  SB.Creature.die(b, game, "hurt");
  check("and it holds while the first lesson is still running", b.alive && deaths.length === 0, deaths.join(" "));
  game.tutorial.done = true;
  SB.Creature.die(c, game, "old");
  check("old age is still old age", !c.alive && deaths.length === 1 && /:old$/.test(deaths[0]), deaths.join(" "));
}
{
  const { SB, game } = fresh(4443), sp = game.world.T.spawn;
  const lone = SB.Game.spawnSmol(game, { x: sp.x + 60, z: sp.z + 60, age: 560 });
  const deaths = []; SB.bus.on("death", d => { if (d && d.c) deaths.push(d.c.name); });
  SB.Creature.die(lone, game, "hurt");
  check("with nobody near to carry it, a hurt smol is lost", !lone.alive && deaths.length === 1);
  check("creature.js asks before it announces", /SB\.Powers\.catchFall\(game, ?c, ?cause\)/.test(js("creature.js")) && js("creature.js").indexOf("catchFall") < js("creature.js").indexOf("game.stats.deaths++"));
}

console.log("2. \"no story prompts\"");
{
  const { SB, game } = fresh(4444);
  let told = null; SB.bus.on("guideSet", d => { told = d; });
  game.tutorial.done = false;
  SB.Powers.toggle(game, "noGoal");
  check("the switch turns the guide off and says so at once", game.settings.guide === false && told && told.on === false);
  check("and the tutorial is over: the island is not left in its lesson rules", game.tutorial.done === true);
  check("switched on in the first lesson, it ends the lesson too", /SB\.FirstNight\.active\(game\)\) ?\{ ?try ?\{ ?SB\.FirstNight\.skip\(game\);/.test(js("powers.js")));
  SB.Powers.toggle(game, "noGoal");
  check("off again: the guide is back", game.settings.guide !== false && told && told.on === true);
  const hud = js("povhud.js"), pos = js("possess.js"), ui = js("ui.js");
  check("the lesson's line is hidden while it is on", /if ?\(!q ?\|\| ?\(s\.game ?&& ?s\.game\.settings ?&& ?s\.game\.settings\.guide ?=== ?false\)\)/.test(hud));
  check("its marker, the lair pointer and the beacon pointer too", /quiet ?= ?!!\(s ?&& ?s\.game ?&& ?s\.game\.settings ?&& ?s\.game\.settings\.guide ?=== ?false\)/.test(hud) && /var bw ?= ?!quiet ?&&/.test(hud) && /if ?\(!t ?&& ?!quiet ?&& ?!chased/.test(hud));
  check("a marker the player chose stays (goals marked small)", /goal ?= ?s ?&& ?s\.goal ?&& ?!\(quiet ?&& ?!s\.goal\.small\) ?\? ?s\.goal ?: ?null/.test(hud));
  check("no lesson line starts when you step into a smol", /if ?\(st\.guide ?=== ?false\) ?return;/.test(pos));
  check("no tutorial cards either, and the sky hears the switch", /if ?\(game\.settings ?&& ?game\.settings\.guide ?=== ?false\) ?\{ ?state\.tutStep ?= ?-1; ?return; ?\}/.test(ui) && /on\("guideSet", ?function ?\(\) ?\{ ?tutShow\(\); ?\}\)/.test(ui));
}

console.log("3. sandbox: copy is a tool");
{
  const { SB } = fresh(4445), pw = js("powers.js");
  check("the tool can be picked up and put away", SB.Powers.sandTool("copy") === "copy" && SB.Powers.sandTool(null) === null);
  check("with it, the first button on a thing on the ground is \"copy this\"", /tool ?=== ?"copy" ?&& ?r ?&& ?r\.type ?=== ?"item" ?&& ?K\(\)\[r\.kind\]\) ?o\.use ?= ?x\.op\("copy this/.test(pw));
  check("the sandbox page has its button", /data-pw2='tool:copy'>[^<]*copy things<\/button>/.test(pw));
  check("and a word back", /tool ?=== ?"copy" ?\? ?"[^"]*look at a thing on the ground and copy it"/.test(pw));
}

console.log("4. one press, one act on the town tab");
{
  const town = js("town.js"), hud = js("povhud.js");
  const w2 = town.slice(town.indexOf("function wire2("), town.indexOf("function wire2(") + 900);
  check("a button already wired is left alone", /if ?\(el\._t2w\) ?return; ?el\._t2w ?= ?1;/.test(w2) && w2.indexOf("_t2w") < w2.indexOf("addEventListener"));
  check("(why it matters: the bag still wires the home buttons on every draw)", /SB\.Home\.wire\(root, ?s\.game, ?c, ?drawBag, ?HUD\.say\)/.test(hud));
  // the same thing, run: two wirings of one fake button, one press
  const m0 = town.match(/function wire2\(root, ?game, ?c, ?redraw, ?sayFn\) ?\{[\s\S]*?\}\)\(L\[i\]\);\r?\n\s*\}/), m = m0 ? [m0[0]] : null;
  check("wire2 found to run", !!m);
  if (m) {
    let acts = 0;
    const el = { ls: [], getAttribute: () => "buy", addEventListener(t, f) { this.ls.push(f); } };
    const root = { querySelectorAll: () => [el] };
    const ctx = { T: { act: () => { acts++; return { ok: true }; } }, SB: {} };
    const fn = vm.runInNewContext("(" + m[0] + ")", ctx);
    fn(root, {}, {}, () => {}, null); fn(root, {}, {}, () => {}, null);
    el.ls.forEach(f => f());
    check("wired twice, pressed once: one act", acts === 1 && el.ls.length === 1, acts + " acts, " + el.ls.length + " listeners");
  }
}

console.log("5. found places stay put");
{
  const { SB, game } = fresh(4446), D = SB.Deep;
  const key = l => l.map(p => p.id + "@" + p.x + "," + p.z).join(" ");
  const first = D.pois(game), k0 = key(first);
  check("the list is kept with the island", Array.isArray(game.quests.deep.places) && game.quests.deep.places.length === first.length && first.length > 20, first.length);
  // things that change in play and used to shift the list: a new site by a place, a cave gone
  const p5 = first[5];
  game.sites = (game.sites || []).concat([{ kind: "ruin", x: p5.x + 1, z: p5.z + 1, found: true }, { kind: "camp", x: first[9].x, z: first[9].z }]);
  delete game._deepPois;
  check("a new site on top of a place does not move anything", key(D.pois(game)) === k0);
  const round = JSON.parse(JSON.stringify(game.quests.deep.places));
  game.quests.deep.places = round; delete game._deepPois;
  check("nor does a save and a load", key(D.pois(game)) === k0);
  // an island from before 4.44: no kept list, markers standing somewhere else
  const tomb = first.find(p => p.kind === "tomb");
  check("this island has a barrow to test with", !!tomb);
  if (tomb) {
    const mark = { id: 990001, kind: "poi_tomb", x: tomb.x + 40, z: tomb.z - 30, done: true, data: { poi: tomb.id } };
    game.world.structures.push(mark);
    delete game.quests.deep.places; delete game._deepPois;
    const again = D.pois(game), t2 = again.find(p => p.id === tomb.id);
    check("where a marker already stands, that is where its place is", t2 && Math.abs(t2.x - mark.x) < 0.11 && Math.abs(t2.z - mark.z) < 0.11, t2 && t2.x + "," + t2.z);
    const an = D.anchor(game, tomb.id);
    check("and its way in is at the marker", an && Math.abs(an.x - mark.x) < 0.11 && Math.abs(an.z - mark.z) < 0.11);
    check("that list is kept from then on", Array.isArray(game.quests.deep.places) && game.quests.deep.places.some(a => a[0] === tomb.id && Math.abs(a[2] - mark.x) < 0.11));
  }
}

console.log("5b. a real island from before 4.44: every marker against its place");
{
  // tests/places-guix-cove.json: the seed, world settings, sites and every place marker of an island played on 4.42 and
  // 4.43 to day 20, taken from its save. on 4.43, 33 of its markers did not stand where the game put their place, and
  // 18 spots carried two markers (a place that drifted onto a found spot was found there a second time)
  const fx = JSON.parse(fs.readFileSync(path.join(__dirname, "places-guix-cove.json"), "utf8"));
  const ctx = load(), SB = ctx.SB;
  order.filter(n => EXTRA.indexOf(n) >= 0).forEach(n => { if (n === "bosses" && SB.Bosses) return; vm.runInContext(js(n + ".js"), ctx, { filename: n + ".js" }); });
  if (SB.Possess) SB.Possess.headless = true;
  const game = SB.Game.newGame(fx.seed, fx.n, fx.world); SB.Game.current = game; game.tutorial.done = true;
  const D = SB.Deep, w = game.world;
  game.sites = fx.sites.map(s => Object.assign({}, s));
  const made = D.pois(game), ids = new Set(made.map(p => p.id));
  check("the island is made the same as it was: it has every place the save has a marker for", fx.markers.every(m => ids.has(m[0])), fx.markers.filter(m => !ids.has(m[0])).map(m => m[0]).join(" "));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const off0 = fx.markers.filter(m => { const p = made.find(q => q.id === m[0]); return p && dist(p, { x: m[2], z: m[3] }) > 1.5; }).length;
  check("as the game made it afresh, markers and places disagree (the bug this fixes)", off0 >= 10, off0 + " of " + fx.markers.length);
  // now it is the old save: the markers stand, their places are marked found, and there is no kept list
  let sid = 900000;
  fx.markers.forEach(m => { w.structures.push({ id: sid++, type: "struct", kind: m[1], noun: "material", x: m[2], z: m[3], rot: 0, s: 1, done: true, work: 0, need: {}, builders: [], data: { poi: m[0] } }); });
  const sx = game.quests.deep; sx.found = sx.found || {}; fx.markers.forEach(m => { sx.found[m[0]] = 1; });
  delete sx.places; delete game._deepPois;
  const places = D.pois(game), left = w.structures.filter(b => b.data && b.data.poi && /^poi_/.test(b.kind));
  const offNow = left.filter(b => { const p = places.find(q => q.id === b.data.poi); return !p || dist(p, b) > 0.11; });
  check("every marker left standing is on its place", offNow.length === 0, offNow.map(b => b.data.poi).slice(0, 8).join(" "));
  const spots = new Set(left.map(b => b.x + "," + b.z));
  check("no spot carries two markers any more", spots.size === left.length, left.length + " markers on " + spots.size + " spots");
  check("the 18 second markers are gone, and the older marker kept each spot", left.length === 78 && fx.markers.filter((m, i) => fx.markers.findIndex(o => o[2] === m[2] && o[3] === m[3]) === i).every(m => left.some(b => b.data.poi === m[0])), left.length);
  const goneIds = fx.markers.map(m => m[0]).filter(id => !left.some(b => b.data.poi === id));
  check("their places are back on the island, not found yet", goneIds.length === 18 && goneIds.every(id => places.some(p => p.id === id) && !sx.found[id]), goneIds.length);
  let minD = 1e9, pair = "";
  for (let i = 0; i < places.length; i++) for (let j = i + 1; j < places.length; j++) { const d = dist(places[i], places[j]); if (d < minD) { minD = d; pair = places[i].id + " " + places[j].id; } }
  check("no place sits on another", minD > 1.5, minD.toFixed(1) + " (" + pair + ")");
  check("it still has all its places", places.length === made.length, places.length + " vs " + made.length);
  const key = l => l.map(p => p.id + "@" + p.x + "," + p.z).join(" "), k1 = key(places);
  delete game._deepPois;
  check("and from here on nothing moves: the list is kept with the island", Array.isArray(sx.places) && key(D.pois(game)) === k1);
  const tomb = left.find(b => b.kind === "poi_tomb"), an = tomb && D.anchor(game, tomb.data.poi);
  check("a barrow's way in is at its marker", !!an && dist(an, tomb) < 0.11);
}

console.log("6. words, and honey island's hives");
{
  const town = js("town.js"), deep = js("deep.js");
  check("\"an apprentice\"", /"ready to be " ?\+ ?\(\/\^\[aeiou\]\/\.test\(nx\[1\]\) ?\? ?"an " ?: ?"a "\)/.test(town));
  check("\"at your stall\", not \"at the your stall\"", /work a shift at " ?\+ ?\(\/\^\(your\|the\|an\?\) \/\.test\(T\.nameOf\(wp\)\) ?\? ?"" ?: ?"the "\)/.test(town));
  check("no \"take 5 undefined\" on a market stall", /b\.data\.stock ?> ?0 ?&& ?b\.data\.stockKind\)/.test(town));
  check("\"an amber goes on the keeping shelf\"", /\(\/\^\[aeiou\]\/i\.test\(label\(k\)\) ?\? ?"an " ?: ?"a "\) ?\+ ?label\(k\) ?\+ ?" goes on the keeping shelf/.test(deep));
  check("the deepest delve is counted against the levels that are open", /pr\.deepest ?\+ ?"<\/b> of " ?\+ ?\(D\.underOpen\(game\) ?\? ?D\.UNDER_MAX ?: ?D\.MAX\)/.test(deep));
  const { SB, game } = fresh(4447);
  const hives = () => game.world.nodes.filter(n => n.kind === "hive").length, h0 = hives();
  const r = SB.Powers.secret(game, "not the bees");
  check("honey island adds hives", r && r.ok && hives() >= h0 + 20, h0 + " to " + hives());
  const again = SB.Powers.secret(game, "not the bees"), h1 = hives();
  check("once", !again.ok && hives() === h1);
}

console.log("7. a thing added to the island is still there after a load");
{
  // W.addNode used to hand out "the highest id that is not a vine or sea ice, plus one": the id of the first iceberg.
  // on the next load the iceberg was there first, so the added thing was dropped
  const { SB, game } = fresh(4448), W = SB.World, w = game.world, sp = w.T.spawn;
  const taken = new Set(w.nodes.map(n => n.id));
  const made = [];
  for (let i = 0; i < 6; i++) { const n = W.addNode(w, game, "hive", sp.x + 3 + i, sp.z + 3); if (n) made.push(n); }
  check("six things added", made.length === 6);
  check("each has an id nothing else has", made.every(n => !taken.has(n.id)) && new Set(made.map(n => n.id)).size === 6);
  check("from the range kept for added things", made.every(n => n.id >= W.ADD_ID0) && W.ADD_ID0 > 3e7 + 1e6, made.map(n => n.id).slice(0, 2).join(" "));
  const ids = w.nodes.map(n => n.id);
  check("no two nodes on the island share an id", new Set(ids).size === ids.length, ids.length - new Set(ids).size + " shared");
  const w2 = W.revive(JSON.parse(JSON.stringify(W.serialize(w))), game);
  check("all six are there after a save and a load", made.every(n => w2.nodeById[n.id] && w2.nodeById[n.id].kind === "hive" && w2.nodeById[n.id].added), made.filter(n => !(w2.nodeById[n.id] && w2.nodeById[n.id].kind === "hive")).length + " lost");
  const again = W.addNode(w2, game, "hive", sp.x + 12, sp.z + 3);
  check("and the next thing added after the load gets a new id again", again && !made.some(n => n.id === again.id) && again.id >= W.ADD_ID0);
  check("the planting code in world3.js uses the same range", /A0 ?= ?Wd\(\)\.ADD_ID0 ?\|\| ?4e7/.test(js("world3.js")) && /while ?\(w\.nodeById\[id\]\) ?id\+\+;/.test(js("world3.js")));
  check("a delve's rocks no longer share ids with what worldgen adds last", SB.Deep.NODE_ID0 !== SB.WorldGen.ARR_ID0 && SB.Deep.NODE_ID0 > W.ADD_ID0, SB.Deep.NODE_ID0 + " vs " + SB.WorldGen.ARR_ID0);
}

console.log("8. coming back reads as a generation passing");
{
  const { SB, game } = fresh(4449), sp = game.world.T.spawn;
  const six = trio(SB, game).concat(trio(SB, game));
  const t0 = game.time, pop0 = SB.Game.smols(game).length;
  game.time += 1; // the clock moves at the start of every step, so nothing in the away time happens at t0 itself
  SB.Creature.die(six[0], game, "old"); SB.Creature.die(six[1], game, "old"); SB.Creature.die(six[2], game, "starved");
  const baby = SB.Game.spawnSmol(game, { x: sp.x + 2, z: sp.z + 4, age: 0 }); baby.age = 5;
  game.time += 100;
  const rec = SB.Game.awayRecord(game, t0, pop0);
  check("who was born: the baby, and nobody who was already here", rec.born.length === 1 && rec.born[0].name === baby.name, rec.born.map(e => e.name).join(" "));
  check("who grew old, by name", rec.old.length === 2 && rec.old.map(e => e.name).sort().join() === [six[0].name, six[1].name].sort().join());
  check("any other loss is kept apart, by its cause", Object.keys(rec.other).join() === "starved" && rec.other.starved.length === 1 && rec.other.starved[0].name === six[2].name);
  check("the head count before and after", rec.pop0 === pop0 && rec.pop1 === pop0 - 3 + 1, rec.pop0 + " to " + rec.pop1);
  check("nothing from before the away time is counted", SB.Game.awayRecord(game, game.time, rec.pop1).old.length === 0 && SB.Game.awayRecord(game, game.time, rec.pop1).born.length === 0);
  const main = js("main.js"), ui = js("ui.js");
  check("the catch-up hands the card its record", /var before ?= ?snapshotStats\(g\), ?awayT0 ?= ?g\.time ?\|\| ?0, ?awayPop0 ?= ?Game\.smols\(g\)\.length;/.test(main) && /rep\.away ?= ?Game\.awayRecord\(g, ?awayT0, ?awayPop0\);/.test(main) && !/function chunk\(\) ?\{[^}]*awayT0 ?=/.test(main));
  const a = ui.indexOf("UI.awayScreen"), card = ui.slice(a, ui.indexOf("welcome back", a) + 40);
  check("the card leads with who was born, then who grew old", card.indexOf('" born")') > 0 && card.indexOf('" born")') < card.indexOf('" grew old")'));
  check("a name on it opens that smol's page in the chronicle", /openMenu\("chronicle", ?\{ ?memorial: ?e\.id ?\}\)/.test(card));
  check("no skull, and no \"passed on\" count", !/\u{1F480}|☠|passed on|deaths ?\+/u.test(card));
  check("the head count is only spelled out when more than a third are gone", /if ?\(aw\.pop0 ?>= ?3 ?&& ?aw\.pop1 ?< ?aw\.pop0 ?\* ?2 ?\/ ?3\)/.test(card) && /an old generation/.test(card));
  check("a loss that is not old age gets its own plain line", /AWAY_CAUSE\[k\] ?\|\| ?"lost"/.test(card) && /starved: ?"starved"/.test(ui));
  {
    // the whole catch-up, run for real: the record the card is handed is about the away time and nothing else
    const f2 = fresh(4450), S2 = f2.SB, g2 = f2.game, sp2 = g2.world.T.spawn;
    trio(S2, g2);
    const kid = S2.Game.spawnSmol(g2, { x: sp2.x + 2, z: sp2.z + 4, age: 0 }); kid.age = 1;
    const before = S2.Game.smols(g2).length; let rep = null;
    f2.ctx.setTimeout = fn => fn(); S2.Game.OFFLINE_WALL_MS = Infinity;
    S2.Game.runOffline(g2, 200, null, r => { rep = r; });
    check("a real catch-up hands over the record", !!(rep && rep.away) && rep.away.pop0 === before, rep && rep.away && rep.away.pop0 + " vs " + before);
    check("and it is measured from the moment you left: the newborn is in it, the grown-ups are not", !!(rep && rep.away) && rep.away.born.some(e => e.name === kid.name) && rep.away.born.every(e => e.age <= 202), rep && rep.away && rep.away.born.map(e => e.name + ":" + Math.round(e.age)).join(" "));
  }
  check("the page says how long a smol lived, from its age and not from the clock", game.family[six[0].id].age === Math.round(six[0].age) && game.family[six[0].id].age >= 560 && /days ?= ?f\.age ?> ?0 ?\? ?f\.age ?\/ ?SB\.DAY_LENGTH ?: ?0/.test(ui) && /" \u00b7 lived "|" · lived "/.test(ui));
  check("the chronicle has the page", /function tabChronicle\(body, ?arg\)/.test(ui) && /UI\.goneList ?= ?goneList;/.test(ui) && /remembered/.test(ui));
}

console.log("9. one press, one act, on every tab of the bag");
{
  const hud = js("povhud.js");
  const m = hud.match(/HUD\.onceEach ?= ?function ?\(root\) ?\{[\s\S]*?\}\);\r?\n\s*\};/);
  check("the bag has its guard", !!m);
  check("and it runs before anything is wired", /function wireBag\(\) ?\{\r?\n\s*var root ?= ?bag\.el[^\n]*\n\s*HUD\.onceEach\(root\);/.test(hud));
  if (m) {
    const HUD = { dupes: {} };
    vm.runInNewContext(m[0], { HUD });
    const mkEl = name => ({ ls: [], attrs: [name], getAttributeNames() { return this.attrs; }, addEventListener(t, f) { this.ls.push(t); } });
    const buy = mkEl("data-t2"), other = mkEl("data-homemake"), root = { querySelectorAll: () => [buy, other] };
    HUD.onceEach(root);
    const handler = () => function () { return "act"; }; // two closures of one handler: what two wirings of one module make
    buy.addEventListener("click", handler()); buy.addEventListener("click", handler());
    check("the same handler wired twice to one button is kept once", buy.ls.length === 1, buy.ls.length);
    check("and what was dropped is counted by the button's name", HUD.dupes["data-t2"] === 1, JSON.stringify(HUD.dupes));
    buy.addEventListener("click", function () { return "something else"; });
    buy.addEventListener("keydown", handler());
    check("a different handler, or another kind of event, still goes on", buy.ls.length === 3, buy.ls.join(" "));
    other.addEventListener("click", handler());
    check("each button is counted on its own", other.ls.length === 1);
    HUD.onceEach(root); buy.addEventListener("click", handler());
    check("guarding the same bag twice changes nothing", buy.ls.length === 3);
  }
}

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
