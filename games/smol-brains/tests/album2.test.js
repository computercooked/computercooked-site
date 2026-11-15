// 4.31: the second album, "the long way home". Sixteen more songs beside the first twenty (nothing replaced),
// new voices and scales, a duel piece for captain fights, and a jukebox that lists both albums.
// node games/smol-brains/tests/album2.test.js
"use strict";
const fs = require("fs"), path = require("path");
const load = require("./_load.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");
const vm = require("vm");
const ctx = load(); vm.runInContext(js("music.js"), ctx, { filename: "music.js" });
const SB = ctx.SB, M = SB.Music;

console.log("1. two albums");
check("the first album is still its twenty songs", M.SONGS.length === 20 && M.SONGS[0].id === "smolbrains" && M.SONGS[19].id === "bigthought");
check("the second has sixteen", M.ALBUM2.length === 16, M.ALBUM2.length);
const all = M.all();
check("thirty-six in all, every id and title its own", all.length === 36 && new Set(all.map(s => s.id)).size === 36 && new Set(all.map(s => s.title)).size === 36);
check("the albums have names", M.ALBUMS.length === 2 && M.ALBUMS[1].title === "the long way home" && M.ALBUMS[1].songs === M.ALBUM2);

console.log("2. every new song is well-formed");
const badLen = [], badEv = [], short = [], src = js("music.js");
const voices = new Set(), scales = new Set(), accs = new Set();
M.ALBUM2.forEach(s => {
  ["A", "B"].forEach(k => {
    const toks = s[k].mel.split(/\s+/).filter(x => x && x !== "|"), bars = s[k].ch.split(/\s+/).length;
    if (toks.length !== bars * s.bar) badLen.push(s.id + k + " " + toks.length + "/" + bars * s.bar);
    toks.forEach(t => { if (!/^([#b]?[1-7][',]*|\.|-)$/.test(t)) badLen.push(s.id + k + " token " + t); });
  });
  const sc = M._score(s);
  sc.ev.forEach(e => { if (!(e.t >= 0) || !(e.d > 0) || !(e.v > 0) || (e.m !== 0 && !(e.m > 20 && e.m < 110)) || src.indexOf("    " + e.i + ": function") < 0) badEv.push(s.id + ":" + e.i + ":" + e.m); });
  if (sc.dur < 45 || sc.dur > 240) short.push(s.id + " " + Math.round(sc.dur) + "s");
  voices.add(s.lead); voices.add(s.lead2); scales.add(s.scale); accs.add(s.acc);
});
check("every bar has the right number of steps", !badLen.length, badLen.slice(0, 4).join(" · "));
check("every note is playable by a voice that exists", !badEv.length, badEv.slice(0, 5).join(" "));
check("each runs between 45 seconds and 4 minutes", !short.length, short.join(" "));
check("new voices: kalimba, whistle, cello, glass, choir", ["kalimba", "whistle", "cello", "glass", "choir"].every(v => voices.has(v)));
check("new scales: lydian, mixolydian, phrygian, harmonic minor", ["lydian", "mixo", "phrygian", "hminor"].every(v => scales.has(v)));
check("new ways for the band to play: drone, pulse, march, lull, roll", ["drone", "pulse", "march", "lull", "roll"].every(v => accs.has(v)));

console.log("3. the island plays both");
const game = { world: { season: 0, night: false, weather: { rain: 0 } }, stats: { maxTier: 2 }, playTime: 1000 };
const fitsNow = () => all.filter(s => M._fits(s, game)).map(s => s.id);
const springDay = fitsNow();
check("a spring day draws on both albums", springDay.some(id => M.SONGS.some(s => s.id === id)) && springDay.some(id => M.ALBUM2.some(s => s.id === id)), springDay.length + " fit");
check("the duel piece is never picked by the island", springDay.indexOf("duel") < 0 && !M._fits(M.byId("duel"), null));
check("“gloom” is only heard from inside a smol", springDay.indexOf("gloom") < 0);
game.world.night = true; SB.Possess = { active: true };
check("at night, in a body, it can play", fitsNow().indexOf("gloom") >= 0);
SB.Possess = null;
game.world.season = 3; game.world.night = false;
check("winter has its own new song", fitsNow().indexOf("snowhearth") >= 0);
game.world.season = 1;
check("which summer never hears", fitsNow().indexOf("snowhearth") < 0);
game.stats.maxTier = 5;
check("clever smols unlock “every smol looks up”", fitsNow().indexOf("looksup") >= 0);
let seen = new Set(); for (let i = 0; i < 400; i++) { const s = M._pick(game); if (s) seen.add(s.id); }
check("the picker really does choose from both", [...seen].some(id => M.ALBUM2.some(s => s.id === id)) && [...seen].some(id => M.SONGS.some(s => s.id === id)), seen.size + " different songs in 400 picks");

console.log("4. a captain's fight has its own music");
const g2 = { world: { night: false }, dir: {} };
const P = b => ({ active: true, c: { alive: true, x: 0, z: 0, chem: { health: 1 } }, scout: () => ({ boss: b }) });
check("a duel with a captain: “dodge, then swing”", M.moodOf(g2, P("gloom"), 0) === "duel" && M.byId("duel").title === "dodge, then swing");
check("an ordinary chase keeps the old danger layer", M.moodOf(g2, P(null), 0) === "danger");

console.log("5. the jukebox");
const ui = js("ui.js");
check("lists both albums by name", /MU\.ALBUMS/.test(ui) && /"album " \+ al\.id \+ " · " \+ al\.title/.test(ui));
check("counts every song", /allSongs\.length \+ " songs/.test(ui));

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
