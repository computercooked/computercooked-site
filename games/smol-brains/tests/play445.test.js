// 4.45: the opening story ends on time.
// The "story" used to stay on until the last of the seven basics cards was finished or skipped, with no limit. While
// it was on a smol was never "carried home", and the storyteller, the night chase, pods, weddings and festivals waited.
//   1. while a basics card is up, a smol that falls is carried home (only a taught night is left to end its own way)
//   2. during the first night a fall is still real, unless "nobody is lost" is on
//   3. the cards are put away by themselves at the dawn of day 3, once, and never before
//   4. after that nothing counts as the story any more
//   5. the sky hears of it: the card comes off and one line says where help is
// node games/smol-brains/tests/play445.test.js
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
function fresh(seed) {
  const ctx = load(), SB = ctx.SB;
  order.filter(n => EXTRA.indexOf(n) >= 0).forEach(n => { if (n === "bosses" && SB.Bosses) return; vm.runInContext(js(n + ".js"), ctx, { filename: n + ".js" }); });
  vm.runInContext(js("firstnight.js"), ctx, { filename: "firstnight.js" }); // the first night itself (the base harness leaves it out)
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
// the island as it is while a basics card is up: the first night is over, the cards are not
function cards(game, step) { game.tutorial.done = false; game.tutorial.step = step == null ? 3 : step; game.tutorial.night = { done: true, s: "done", t: 0 }; }

console.log("1. while a basics card is up, a fall is caught");
{
  const { SB, game } = fresh(4451), [a, b] = trio(SB, game), U = SB.Powers._;
  cards(game);
  const deaths = []; SB.bus.on("death", d => { if (d && d.c) deaths.push(d.c.name + ":" + d.cause); });
  check("the cards still count as the story", U.story(game) === true);
  check("but they are not a taught night", U.lesson(game) === false);
  const log0 = game.log.length;
  SB.Creature.die(a, game, "hurt");
  const lines = game.log.slice(log0).map(l => String(l.text || ""));
  check("hurt too badly, with friends near: carried home, alive and asleep", a.alive && !a.dying && a.asleep && a.chem.health > 0.3);
  check("no death was announced", deaths.length === 0, deaths.join(" "));
  check("the log says it was carried home", lines.some(t => /went down, and was carried home/.test(t)), lines.join(" | ").slice(0, 160));
  SB.Creature.die(b, game, "starved");
  check("starving is still real", !b.alive && deaths.length === 1, deaths.join(" "));
}

console.log("2. the first night ends its own way");
{
  const { SB, game } = fresh(4452), [a, b, c] = trio(SB, game), U = SB.Powers._;
  game.tutorial.done = false; game.tutorial.step = 2; game.tutorial.night = { done: false, s: "wake", t: 0 };
  const deaths = []; SB.bus.on("death", d => { if (d && d.c) deaths.push(d.c.name + ":" + d.cause); });
  check("the first night is a taught night", SB.FirstNight.active(game) === true && U.lesson(game) === true);
  check("a fall in it is not caught", SB.Powers.catchFall(game, a, "hurt") === false && a.alive);
  SB.Powers.toggle(game, "noDeath");
  check("with \"nobody is lost\" on it is", !!game.settings.noDeath && SB.Powers.catchFall(game, a, "hurt") === true && a.alive && a.asleep && deaths.length === 0, deaths.join(" "));
}

console.log("3. the cards are put away at the dawn of day 3");
{
  const { SB, game } = fresh(4453), D = SB.DAY_LENGTH, G = SB.Game;
  trio(SB, game); cards(game, 4);
  const over = []; SB.bus.on("tutorialOver", d => over.push(d && d.auto ? "auto" : "?"));
  check("the dawn of day 3 is the line", G.CARDS_END === 2.21 && Math.floor(G.CARDS_END) + 1 === 3);
  game.time = G.CARDS_END * D - 0.3; game.world.time = game.time;
  for (let k = 0; k < 3; k++) G.step(game, SB.TICK);
  check("a moment before: the card is still up", game.tutorial.done === false && over.length === 0, over.join(" "));
  for (let k = 0; k < 6; k++) G.step(game, SB.TICK);
  check("at the dawn of day 3 the cards are over", game.tutorial.done === true);
  check("it was told once, as the island's doing", over.length === 1 && over[0] === "auto", over.join(" "));
  for (let k = 0; k < 20; k++) G.step(game, SB.TICK);
  check("and only once", over.length === 1);
}
{
  const { SB, game } = fresh(4454), D = SB.DAY_LENGTH, G = SB.Game;
  const over = []; SB.bus.on("tutorialOver", d => over.push(1));
  game.tutorial.done = false; game.tutorial.step = 0; delete game.tutorial.night;
  game.time = 3 * D; game.world.time = game.time;
  check("before the pod is opened nothing is put away (no smol is out yet)", G.cardsOver(game) === false && game.tutorial.done === false);
  game.tutorial.step = 2; game.tutorial.night = { done: false, s: "wake", t: 0 };
  check("nor while the first night runs, however late it is", G.cardsOver(game) === false && game.tutorial.done === false);
  game.tutorial.night.done = true;
  check("once the night is done it is", G.cardsOver(game) === true && game.tutorial.done === true && over.length === 1);
  check("a finished tutorial is left alone", G.cardsOver(game) === false && over.length === 1);
  game.tutorial.done = false; game.time = 2 * D; game.world.time = game.time;
  check("on day 2 the cards stay", G.cardsOver(game) === false && game.tutorial.done === false);
}

console.log("4. after that nothing counts as the story");
{
  const { SB, game } = fresh(4455), D = SB.DAY_LENGTH;
  trio(SB, game); cards(game, 5);
  const FS = SB.Friends._x.story, PS = SB.Powers._.story;
  check("while a card is up, friends and powers both hold back", FS(game) === true && PS(game) === true);
  game.time = SB.Game.CARDS_END * D + 1; game.world.time = game.time;
  for (let k = 0; k < 3; k++) SB.Game.step(game, SB.TICK);
  check("after the dawn of day 3 neither does", game.tutorial.done === true && FS(game) === false && PS(game) === false);
  check("the storyteller, pods and the night chase read the same switch", /!game\.tutorial \|\| !game\.tutorial\.done/.test(src("director.js")) && /!game\.tutorial\.done/.test(src("sites.js")) && /!game\.tutorial\.done/.test(src("nightchase.js")));
}

console.log("5. the sky hears of it");
{
  const ui = src("ui.js"), pw = src("powers.js");
  check("the card comes off and one line says where help is", /on\("tutorialOver", function \(d\) \{ tutShow\(\); if \(d && d\.auto\) toast\("the basics cards are put away now\. ❓ help is in the menu\."\); \}\)/.test(ui));
  check("carried home asks for a taught night, in both places", (pw.match(/c\.stranger \|\| \(U\.lesson\(game\) && !se\.noDeath\)/g) || []).length === 2 && !/U\.story\(game\) && !se\.noDeath/.test(pw));
}

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
