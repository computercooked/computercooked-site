// the chapters never stall on one skill (4.16): once the smols have evolved past a chapter and it has been open a day,
// the story moves on; its unfinished quests stay as "left behind" and still pay when done. a finished chapter still pays its bonus.
// node games/smol-brains/tests/chapters.test.js
"use strict";
const load = require("./_load.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const ctx = load();
const SB = ctx.SB, Q = SB.Quests;
const g = SB.Game.newGame(416); SB.Game.current = g; g.headless = true;
g.tutorial = { done: true };
const done = []; SB.bus.on("chapterDone", d => done.push(d));
const tick = () => { for (let i = 0; i < 3; i++) Q.tick(g, 1.1); };
tick();
check("a new island starts on chapter 1", g.quests.ch === 0);
g.stats.maxTier = 2; tick();
check("evolved past it, but it opened just now: it waits", g.quests.ch === 0);
g.time += SB.DAY_LENGTH + 1; tick();
check("a day later the story moves on to chapter 2", g.quests.ch >= 1 && done[0] && done[0].outgrown > 0, JSON.stringify(done.map(d => [d.ch.id, d.outgrown])));
check("chapter 1's unfinished quests are left behind, not lost", g.quests.left.includes("possess") && Q.board(g).left.some(x => x.q.id === "possess"));
const sp = g.sparks;
SB.bus.emit("possess", {}); tick();
check("a left-behind quest still pays when done", !g.quests.left.includes("possess") && g.quests.done.possess && g.sparks >= sp + 2, (g.sparks - sp).toFixed(1));
g.quests.ch = 4; g.quests.since = g.time; g.stats.maxTier = 9;
g.time += SB.DAY_LENGTH * 3; tick();
check("the builders chapter is never skipped (its quests come by themselves)", g.quests.ch === 4 || done[done.length - 1].outgrown === undefined);
g.quests.ch = 5; g.quests.since = 0; g.time += SB.DAY_LENGTH * 5; tick();
check("nor is the last chapter, the spire", g.quests.ch === 5);
const back = SB.Save.revive(JSON.parse(JSON.stringify(SB.Save.snapshot(g))));
check("left-behind quests are saved", back.quests && Array.isArray(back.quests.left));
console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
