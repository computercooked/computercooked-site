// a day on the Hollow (4.15): the day's tally, the dawn recap with today's goal, saved with the quest board.
// node games/smol-brains/tests/days.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const ctx = load();
["embers.js", "days.js"].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8"), ctx, { filename: f }));
const SB = ctx.SB, D = SB.Days;
const game = SB.Game.newGame(415); SB.Game.current = game; game.headless = true;
const recaps = []; SB.bus.on("dayRecap", r => recaps.push(r));

console.log("1. the tally");
const c = SB.Game.smols(game)[0] || SB.Game.spawnSmol(game, { x: game.world.T.spawn.x, z: game.world.T.spawn.z });
SB.bus.emit("learnWord", { c, word: "food" }); SB.bus.emit("learnWord", { c, word: "ball" });
SB.bus.emit("hatch", { c }); SB.bus.emit("trickLearned", { c, trick: {} });
SB.bus.emit("nightChase", { step: "won", c }); SB.bus.emit("nightChase", { step: "lost", c });
SB.bus.emit("death", { c: { species: "grump" }, cause: "old" });
const t = D.tally(game);
check("words, hatches, tricks and won chases are counted", t.c.words === 2 && t.c.hatch === 1 && t.c.tricks === 1 && t.c.chases === 1, JSON.stringify(t.c));
check("a lost chase and a grump's death aren't", !t.c.deaths);

console.log("2. dawn: yesterday in one card, and today's goal");
SB.bus.emit("dawn", {});
const r = recaps[recaps.length - 1];
check("one recap at dawn", recaps.length === 1 && r && !r.quiet);
check("it reads like a sentence", r.lines.includes("2 words learned") && r.lines.includes("a smol hatched") && r.lines.includes("a grump chase won"), r.lines.join(" · "));
check("today's goal is the next open quest", r.goal && r.goal.t === SB.Quests.board(game).quests.find(x => !x.done).q.t, r.goal && r.goal.t);
check("and a fresh tally starts", Object.keys(D.tally(game).c).length === 0);
SB.bus.emit("dawn", {});
check("a day with nothing in it says so", recaps[1].quiet && recaps[1].lines.length === 0);

console.log("3. saved with the island, and quiet while you're away");
SB.bus.emit("learnWord", { c, word: "food" });
const back = SB.Save.revive(JSON.parse(JSON.stringify(SB.Save.snapshot(game))));
check("the tally survives a save", back.quests && back.quests.day && back.quests.day.c.words === 1);
game.offlineRunning = true; SB.bus.emit("learnWord", { c, word: "x" }); SB.bus.emit("dawn", {}); game.offlineRunning = false;
check("offline catch-up neither counts nor shows a card", recaps.length === 2);
const ui = fs.readFileSync(path.join(__dirname, "..", "play", "js", "ui.js"), "utf8"), html = fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8");
check("ui.js shows it as a small card, never a window", /on\("dayRecap"[\s\S]{0,1200}toast\(html, "day"/.test(ui));
check("days.js loads after embers.js", html.indexOf("js/embers.js") < html.indexOf("js/days.js") && html.indexOf("js/days.js") < html.indexOf("js/ui.js"));

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
