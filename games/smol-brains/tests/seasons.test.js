// short seasons (an island setting): 10 minutes a season at 1x instead of 40, so a new player sees the whole year
// node games/smol-brains/tests/seasons.test.js
"use strict";
const load = require("./_load.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
function island(seed, short) {
  const SB = load().SB;
  const g = SB.Game.newGame(seed); SB.Game.current = g; g.tutorial.done = true; g.podT = 1e9; if (g.dir) g.dir.nextT = 1e9; g.strangerT = 1e9;
  if (short) g.settings.seasons = "short";
  return { SB, g };
}
// jump the clock to a day fraction, then let one step read it
function at(SB, g, days) { g.time = days * SB.DAY_LENGTH; g.world.time = g.time; SB.Game.step(g, SB.TICK); return SB.SEASONS[g.world.season]; }

console.log("1. normal seasons: two days each");
{
  const { SB, g } = island(71, false);
  check("40 minutes a season", SB.seasonDays(g) === 2 && SB.seasonDays(g) * SB.DAY_LENGTH === 2400);
  check("still spring at day 1.5", at(SB, g, 1.5) === "spring");
  check("summer at day 2.1", at(SB, g, 2.1) === "summer");
}

console.log("2. short seasons: half a day each, the whole year in 40 minutes");
{
  const { SB, g } = island(72, true);
  const seen = []; SB.bus.on("season", d => seen.push(d.season));
  check("10 minutes a season", SB.seasonDays(g) * SB.DAY_LENGTH === 600);
  check("spring at the start", at(SB, g, 0.2) === "spring");
  check("summer by day 0.6", at(SB, g, 0.6) === "summer");
  check("autumn by day 1.1", at(SB, g, 1.1) === "autumn");
  check("winter by day 1.6", at(SB, g, 1.6) === "winter");
  check("spring again on day 2.1", at(SB, g, 2.1) === "spring");
  check("each change was announced", seen.join(",") === "summer,autumn,winter,spring", seen.join(","));
  for (let i = 0; i < 40; i++) SB.Game.step(g, SB.TICK); // achievements are checked once a second
  check("a year in, \"made it through winter\" unlocks", !!g.achievements.winter);
}

console.log("3. the setting is kept in the save");
{
  const { SB, g } = island(73, true);
  const d = JSON.parse(JSON.stringify(SB.Save.snapshot(g)));
  const g2 = SB.Save.revive(d);
  check("short seasons survive a reload", g2.settings.seasons === "short" && SB.seasonDays(g2) === 0.5);
}

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
