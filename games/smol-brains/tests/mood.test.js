// the soundtrack's two mood layers (K-0045): "danger" when a grump is near, at nightfall, or hearts are low;
// "strange" for odd sky things (a pod falling, the Lantern). they crossfade over 1.5 s and go back after.
// node games/smol-brains/tests/mood.test.js
"use strict";
const load = require("./_load.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const ctx = load(["core", "genome", "brain", "chemistry", "lang", "ideas", "words", "worldgen", "world", "creature", "species", "society", "strangers", "social", "director", "sites", "save", "main", "music"]), SB = ctx.SB, M = SB.Music;
const game = SB.Game.newGame(7); SB.Game.current = game;
M._moodEvents();

console.log("1. the layers are real songs in the soundtrack's own style");
["danger", "strange"].forEach(id => {
  const s = M.byId(id), sc = s && M._score(s);
  check(id + " exists, and is a cue (never in the playlist)", !!s && s.tags.indexOf("cue") >= 0 && M.SONGS.indexOf(s) < 0);
  check(id + " scores to notes", sc && sc.ev.length > 50 && sc.dur > 20, sc && sc.ev.length + " notes, " + sc.dur.toFixed(0) + " s");
});
check("the crossfade is about 1.5 s", M.XFADE >= 1 && M.XFADE <= 2, M.XFADE);

console.log("2. which moment wants which layer");
check("a calm island: none", M.moodOf(game, { active: false }, 0) === null);
const c = SB.Debug.spawnTier(0, 1)[0];
const P = { active: true, c: c, scout: () => null };
check("possessed and well: none", M.moodOf(game, P, 0) === null);
c.chem.health = 0.2;
check("hearts low: danger", M.moodOf(game, P, 0) === "danger");
c.chem.health = 1;
P.scout = () => ({ id: 1 });
check("the first-minute grump after you: danger", M.moodOf(game, P, 0) === "danger");
P.scout = () => null;
const g = SB.Game.spawnGrump(game, c.x + 6, c.z);
run(0.2);
check("a grump close by: danger", M.moodOf(game, P, 0) === "danger");
g.alive = false;
check("gone again: none (once the arrival's 30 s of danger is over)", M.moodOf(game, P, Date.now() / 1000 + 60) === null);
SB.bus.emit("dusk", {});
check("nightfall: danger for a bit", M.moodOf(game, { active: false }, Date.now() / 1000 + 5) === "danger" && M.moodOf(game, { active: false }, Date.now() / 1000 + 60) === null);
SB.bus.emit("podCrash", {});
check("a pod falls: strange", M.moodOf(game, P, Date.now() / 1000) === "strange");
check("...for a while, then back to normal", M.moodOf(game, P, Date.now() / 1000 + 60) === null);
function run(s) { for (let t = 0; t < s; t += SB.TICK) SB.Game.step(game, SB.TICK); }

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
