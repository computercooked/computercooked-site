/* smol brains: days.js (built from src/days.js by tools/strip.js: edit that file, not this one) */
(function () {
"use strict";
var SB = window.SB = window.SB || {};
var D = SB.Days = {};
D.LINES = [
["hatch", "a smol hatched", "smols hatched"],
["words", "a word learned", "words learned"],
["tricks", "a trick learned", "tricks learned"],
["ideas", "a new idea", "new ideas"],
["built", "a building finished", "buildings finished"],
["embers", "a memory ember", "memory embers"],
["species", "a new species", "new species"],
["chases", "a grump chase won", "grump chases won"],
["deaths", "a smol lost", "smols lost"]
];
function cur() { return SB.Game && SB.Game.current; }
D.day = function (game) { return Math.floor((game.time || 0) / (SB.DAY_LENGTH || 360)) + 1; };
function tally(game) {
if (!game) return null;
var q = game.quests || (game.quests = { ch: 0, done: {}, n: {} });
if (!q.day || typeof q.day !== "object") q.day = { n: D.day(game), c: {} };
q.day.c = q.day.c || {};
return q.day;
}
D.tally = tally;
D.count = function (game, k, by) {
var t = tally(game); if (!t || game.offlineRunning) return;
t.c[k] = (t.c[k] || 0) + (by == null ? 1 : by);
};
D.recap = function (game) {
var t = tally(game), lines = [];
D.LINES.forEach(function (L) { var n = t.c[L[0]] || 0; if (n) lines.push(n === 1 ? L[1] : n + " " + L[2]); });
var goal = null;
if (SB.Quests && SB.Quests.board) {
var b = SB.Quests.board(game);
if (b) { var open = b.quests.filter(function (x) { return !x.done; })[0]; if (open) goal = { icon: open.q.icon, t: open.q.t }; }
}
return { day: t.n, lines: lines, goal: goal, quiet: !lines.length };
};
D.POP_KEEP = 120;
D.census = function (game) {
if (!game || !game.quests) return null;
var row = [D.day(game)], i;
for (i = 0; i < SB.TIERS.length; i++) row.push(0);
(game.creatures || []).forEach(function (c) { if (c.alive && c.species === "smol") row[1 + Math.min(SB.TIERS.length - 1, c.tier | 0)]++; });
var pop = game.quests.pop = Array.isArray(game.quests.pop) ? game.quests.pop : [];
if (pop.length && pop[pop.length - 1][0] === row[0]) pop[pop.length - 1] = row; else pop.push(row);
if (pop.length > D.POP_KEEP) pop.splice(0, pop.length - D.POP_KEEP);
return row;
};
D.dawn = function (game) {
if (!game) return null;
var r = D.recap(game);
game.quests.day = { n: D.day(game), c: {} };
D.census(game);
if (!game.offlineRunning && !game.headlessQuiet) SB.bus.emit("dayRecap", r);
return r;
};
var hooked = false;
D.hook = function () {
if (hooked || !SB.bus) return; hooked = true;
var on = SB.bus.on;
function smol(d) { return d && d.c && d.c.species === "smol"; }
on("hatch", function (d) { if (smol(d)) D.count(cur(), "hatch"); });
on("learnWord", function (d) { if (smol(d)) D.count(cur(), "words"); });
on("trickLearned", function () { D.count(cur(), "tricks"); });
on("eureka", function () { D.count(cur(), "ideas"); });
on("built", function () { D.count(cur(), "built"); });
on("ember", function () { D.count(cur(), "embers"); });
on("newSpecies", function () { D.count(cur(), "species"); });
on("death", function (d) { if (smol(d)) D.count(cur(), "deaths"); });
on("nightChase", function (d) { if (d && d.step === "won") D.count(cur(), "chases"); });
on("dawn", function () { var g = cur(); if (g) D.dawn(g); });
};
D.hook();
})();
