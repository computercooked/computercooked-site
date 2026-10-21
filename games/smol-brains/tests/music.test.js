// The soundtrack: 20 songs that are all well-formed, and a playlist that respects the seasons, day and
// night, the rain and the late game. Also: a smol you tap holds still for a moment, then carries on.
// node games/smol-brains/tests/music.test.js
"use strict";
const load = require("./_load.js");

let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }

const ctx = load(["core", "genome", "brain", "chemistry", "lang", "ideas", "words", "worldgen", "world", "creature", "species", "society", "strangers", "social", "director", "sites", "save", "main", "music"]);
const { SB } = ctx;
const M = SB.Music, SONGS = M.SONGS;

console.log("1. the album");
{
  check("20 songs", SONGS.length === 20, SONGS.length);
  check("ids and titles are unique", new Set(SONGS.map(s => s.id)).size === 20 && new Set(SONGS.map(s => s.title)).size === 20);
  const INST = ["box", "bell", "piano", "epiano", "flute", "pluck", "marimba", "strings", "bass", "shaker", "kick"];
  let badLen = [], badEv = [], durs = [];
  SONGS.forEach(s => {
    ["A", "B"].forEach(k => {
      const toks = s[k].mel.split(/\s+/).filter(x => x && x !== "|"), bars = s[k].ch.split(/\s+/).length;
      if (toks.length !== bars * s.bar) badLen.push(s.id + k);
      if (!toks.every(t => /^([#b]?[1-7][',]*|\.|-)$/.test(t))) badLen.push(s.id + k + " token");
    });
    const sc = M._score(s);
    durs.push(sc.dur);
    sc.ev.forEach(e => { if (!isFinite(e.t) || e.t < 0 || INST.indexOf(e.i) < 0 || !(e.d > 0) || !(e.v > 0) || (e.i !== "shaker" && e.i !== "kick" && (e.m < 24 || e.m > 110))) badEv.push(s.id + ":" + e.i + ":" + e.m); });
  });
  check("every bar has the right number of steps", !badLen.length, badLen.join(" "));
  check("every note is playable", !badEv.length, badEv.slice(0, 5).join(" "));
  check("songs run 1–5 minutes", durs.every(d => d > 60 && d < 300), durs.map(d => Math.round(d)).join(","));
  check("about 40 minutes of music", durs.reduce((a, b) => a + b, 0) > 35 * 60, Math.round(durs.reduce((a, b) => a + b, 0) / 60) + " min");
}

console.log("2. the playlist follows the island");
{
  const game = SB.Game.newGame(5); SB.Game.current = game;
  const w = game.world;
  function fitting(season, night, rain, tier) {
    w.season = season; w.night = night; w.weather.rain = rain || 0; game.stats.maxTier = tier || 0;
    return SONGS.filter(s => M._fits(s, game)).map(s => s.id);
  }
  const seasonal = id => SONGS.find(s => s.id === id).tags.filter(t => SB.SEASONS.indexOf(t) >= 0);
  let leaks = [], exclusive = [];
  for (let s = 0; s < 4; s++) {
    const day = fitting(s, false), night = fitting(s, true);
    day.concat(night).forEach(id => { const ss = seasonal(id); if (ss.length && ss.indexOf(SB.SEASONS[s]) < 0) leaks.push(SB.SEASONS[s] + ":" + id); });
    exclusive.push(SONGS.filter(x => { const ss = x.tags.filter(t => SB.SEASONS.indexOf(t) >= 0); return ss.length === 1 && ss[0] === SB.SEASONS[s]; }).length);
    check(SB.SEASONS[s] + ": songs for day (" + day.length + ") and night (" + night.length + ")", day.length >= 4 && night.length >= 3);
  }
  check("no song plays outside its season", !leaks.length, leaks.join(" "));
  check("every season has songs of its own", exclusive.every(n => n >= 2), exclusive.join(","));
  check("day songs wait for morning", fitting(1, true).indexOf("sunny") < 0 && fitting(1, false).indexOf("sunny") >= 0);
  check("night songs wait for dark", fitting(1, false).indexOf("fireflies") < 0 && fitting(1, true).indexOf("fireflies") >= 0);
  check("rainy-day song waits for rain", fitting(0, false, 0).indexOf("rainyday") < 0 && fitting(0, false, 0.7).indexOf("rainyday") >= 0);
  check("winter rain is snow: no rainy-day song", fitting(3, false, 0.7).indexOf("rainyday") < 0);
  check("the big thought waits for thinkers", fitting(2, false, 0, 4).indexOf("bigthought") < 0 && fitting(2, false, 0, 5).indexOf("bigthought") >= 0);
  game.playTime = 1000; M._grief(-1e9);
  check("missing you is a night song", fitting(2, false).indexOf("missingyou") < 0 && fitting(2, true).indexOf("missingyou") >= 0);
  M._grief(990);
  check("…and plays by day after a death", fitting(2, false).indexOf("missingyou") >= 0);
  M._grief(-1e9);
  let empty = 0;
  for (let s = 0; s < 4; s++) for (const n of [false, true]) for (const r of [0, 0.8]) { fitting(s, n, r); if (!M._pick(game)) empty++; }
  check("there is always something to play", empty === 0);
}

console.log("3. a tapped smol holds still");
{
  const game = SB.Game.newGame(9); SB.Game.current = game; game.tutorial.done = true;
  const [c] = SB.Debug.spawnTier(2, 1); c.asleep = false;
  const hm = SB.Society.home(game, 0);
  let moved = 0;
  SB.Creature.hold(c, game, 3);
  const x0 = c.x, z0 = c.z;
  for (let i = 0; i < 20; i++) { SB.Creature.walkToward(c, x0 + 10, z0, 0.05, 2, game, 0.1); game.time += 0.05; }
  moved = Math.hypot(c.x - x0, c.z - z0);
  check("it doesn't walk while held", moved < 1e-6, moved.toFixed(3));
  game.time += 20;
  SB.Creature.walkToward(c, x0 + 10, z0, 0.05, 2, game, 0.1);
  check("then it carries on", Math.hypot(c.x - x0, c.z - z0) > 0.01);
  check("only smols are held", (function () { const o = { species: "grump" }; SB.Creature.hold(o, game, 3); return o.holdUntil == null; })());
}

console.log(failed ? "\n" + failed + " FAILED" : "\nall music checks passed");
process.exit(failed ? 1 : 0);
