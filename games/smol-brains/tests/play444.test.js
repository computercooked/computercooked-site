// 4.44: what the proof pass turned up in its first four systems (smol-brains-handover/PROOF-PASS.md).
//   1. a smol that "goes down and is carried home" is never announced dead (no death event, no "died" line)
//   2. "no story prompts" also hides a running lesson's line, its marker and the tutorial cards
//   3. sandbox "copy this" is a tool you can reach
//   4. a button on the town tab acts once per press
//   5. found places stay where they were found, whatever changes on the island
//   6. words, and honey island's hives
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
  return { SB, game };
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
  SB.Powers.toggle(game, "noGoal");
  check("the switch turns the guide off and says so at once", game.settings.guide === false && told && told.on === false);
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
  const m = town.match(/function wire2\(root, ?game, ?c, ?redraw, ?sayFn\) ?\{[\s\S]*?\n  \}/);
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

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
