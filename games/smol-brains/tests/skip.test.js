// ⏭ skip to the next interesting thing: time runs at 16x until something worth seeing happens (or half a day
// passes), then the speed goes back and it says what happened.
// node games/smol-brains/tests/skip.test.js
"use strict";
const load = require("./_load.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
function island(seed) {
  const SB = load().SB;
  const g = SB.Game.newGame(seed); SB.Game.current = g; g.tutorial.done = true; g.podT = 1e9; if (g.dir) g.dir.nextT = 1e9; g.strangerT = 1e9;
  return { SB, g };
}
// what the frame loop does: speed-scaled steps
function play(SB, g, simSecs) { let t = 0; while (t < simSecs && g.skip !== undefined) { SB.Game.step(g, SB.TICK); t += SB.TICK; if (!g.skip) break; } return t; }

console.log("1. it stops at the next thing worth seeing");
{
  const { SB, g } = island(61);
  const [a, b] = SB.Debug.spawnTier(0, 2);
  a.age = 30; b.age = 30; // little ones: growing up is coming
  [a, b].forEach(c => { c.asleep = false; c.chem.hunger = 0.1; });
  for (let i = 0; i < 20; i++) SB.Game.step(g, SB.TICK); // let their stages settle first
  g.speed = 1;
  const done = []; SB.bus.on("skipDone", d => done.push(d));
  check("it starts", SB.Game.skip(g) && g.skip && g.speed === 16);
  check("one at a time", !SB.Game.skip(g));
  const t = play(SB, g, SB.Game.SKIP_MAX + 5);
  check("it stopped with a reason", done.length === 1 && !!done[0].why, done[0] && done[0].why);
  check("after a while, before half a day ran out", t > 1 && t < SB.Game.SKIP_MAX, Math.round(t) + " sim s");
  check("and the speed went back", g.speed === 1 && !g.skip);
}

console.log("2. a quiet stretch ends after half a day");
{
  const { SB, g } = island(62);
  g.creatures.forEach(c => { c.alive = false; c.gone = true; }); g.creatures = []; // nobody to make news
  g.speed = 2;
  const done = []; SB.bus.on("skipDone", d => done.push(d));
  SB.Game.skip(g);
  const t0 = g.time;
  play(SB, g, SB.Game.SKIP_MAX + 5);
  check("it gives up after half a day", done.length === 1 && /quietly/.test(done[0].why) && g.time - t0 >= SB.Game.SKIP_MAX - 1, done[0] && done[0].why);
  check("back to the speed you had", g.speed === 2);
}

console.log("3. changing the speed yourself stops it");
{
  const { SB, g } = island(63);
  SB.Game.skip(g); g.speed = 4; SB.Game.step(g, SB.TICK);
  check("set 4x: the skip is off", !g.skip && g.speed === 4);
}

console.log(failed ? "\n" + failed + " FAILED" : "\nall passed");
process.exit(failed ? 1 : 0);
