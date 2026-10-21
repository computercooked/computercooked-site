// Create world (v3.6): world options change the island the way they say and nothing else, a classic island
// is unchanged, the choices survive a save, and the islands list for "load game" works.
// node games/smol-brains/tests/worlds.test.js
"use strict";
const load = require("./_load.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
function sum(a) { let s = 0; for (let i = 0; i < a.length; i += 7) s += a[i]; return s; }
function mean(a) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s / a.length; }

console.log("1. the classic island is untouched");
{
  const SB = load().SB;
  const fx = SB.worldFx(null);
  check("no options = all neutral", fx.land === 1 && fx.mtn === 1 && fx.temp === 0 && fx.food === 1 && fx.grumps === 1 && fx.crew === 2);
  const a = SB.Game.create(77, 256), b = SB.Game.create(77, 256, { size: "small", land: "island", climate: "temperate", quirks: [] });
  check("default choices make the same terrain", sum(a.world.T.h || a.world.T.tileH) === sum(b.world.T.h || b.world.T.tileH) && sum(a.world.T.temp) === sum(b.world.T.temp));
}

console.log("2. the choices do what they say");
{
  const SB = load().SB;
  const base = SB.Game.create(78, 256), cold = SB.Game.create(78, 256, { climate: "frozen" }), hot = SB.Game.create(78, 256, { climate: "tropical" }), dry = SB.Game.create(78, 256, { climate: "dry" });
  const tb = mean(base.world.T.temp), tc = mean(cold.world.T.temp), th = mean(hot.world.T.temp);
  check("frozen is colder, tropical warmer", tc < tb - 0.1 && th > tb + 0.08, tc.toFixed(2) + " < " + tb.toFixed(2) + " < " + th.toFixed(2));
  check("dry is drier", mean(dry.world.T.moist) < mean(base.world.T.moist) - 0.1);
  const land = g => { const T = g.world.T; let n = 0; for (let i = 0; i < T.tileH.length; i++) if (T.tileH[i] > SB.SEA) n++; return n; };
  const isles = SB.Game.create(79, 256, { land: "isles" }), big = SB.Game.create(79, 256, { land: "big" }), mid = SB.Game.create(79, 256);
  check("little isles < one island < big land", land(isles) < land(mid) && land(mid) < land(big), land(isles) + " < " + land(mid) + " < " + land(big));
  const g = SB.Game.newGame(80, 256, { crew: "crew" });
  check("two pods make a crew of four", g.world.items.filter(o => o.data && o.data.pod).length === 2);
  check("one pod by default", SB.Game.newGame(80, 256).world.items.filter(o => o.data && o.data.pod).length === 1);
  check("size choice picks the island size", SB.WORLD_CHOICES.size.large === 512 && SB.Game.create(81, SB.WORLD_CHOICES.size.small).world.T.N === 256);
  const q = SB.worldFx({ grumps: "few", quirks: ["grumpmoon"] });
  check("a quirk stacks on the choices", Math.abs(q.grumps - 0.75) < 1e-9 && q.sparks > 1);
  check("unknown choices and quirks are ignored", SB.worldFx({ climate: "lava", quirks: ["nope", 5] }).temp === 0);
}

console.log("3. no grumps means no grumps");
{
  const SB = load().SB;
  const g = SB.Game.newGame(82, 256, { grumps: "none" }); SB.Game.current = g; g.tutorial.done = true; g.podT = 1e9; if (g.dir) g.dir.nextT = 1e9;
  SB.Debug.spawnTier(3, 6);
  g.time = SB.DAY_LENGTH * 0.9; g.world.time = g.time; // night
  for (let t = 0; t < 120 / SB.TICK; t++) SB.Game.step(g, SB.TICK);
  check("a whole night without one", !g.creatures.some(c => c.species === "grump"), "night " + g.world.night);
}

console.log("4. the choices, the name and the id survive a save");
{
  const SB = load().SB;
  const g = SB.Game.newGame(83, 256, { climate: "frozen", food: "plenty", quirks: ["bunnies"] }); SB.Game.current = g;
  g.wid = "wtest1"; g.wname = "frosty isle";
  const d = JSON.parse(JSON.stringify(SB.Save.snapshot(g)));
  const g2 = SB.Save.revive(d);
  check("settings.world kept", g2.settings.world && g2.settings.world.climate === "frozen" && g2.settings.world.quirks[0] === "bunnies");
  check("the same frozen terrain comes back", Math.abs(mean(g2.world.T.temp) - mean(g.world.T.temp)) < 1e-6);
  check("food multiplier applies after load", SB.wopt(g2, "food") > 1.5 && SB.wopt(g2, "critters") > 2);
  check("world id and name kept", g2.wid === "wtest1" && g2.wname === "frosty isle");
  const m = SB.Save.meta(d);
  check("load-screen line", m.name === "frosty isle" && m.n === 256 && m.day >= 1 && m.quirks[0] === "bunnies");
}

console.log("5. the islands list");
{
  const ctx = load(), SB = ctx.SB;
  check("empty to start", SB.Save.worlds().length === 0);
  const g = SB.Game.newGame(84, 256); SB.Game.current = g;
  SB.Save.save(g);
  const ws = SB.Save.worlds();
  check("a saved island is listed with an id", ws.length === 1 && /^w/.test(ws[0].id) && ws[0].name === "my first island", JSON.stringify(ws[0]));
  // a save from before v3.6 (no id) still shows up
  const old = JSON.parse(ctx.localStorage.getItem("smolbrains-save-v2")); delete old.wid; delete old.wname;
  ctx.localStorage._d = { "smolbrains-save-v2": JSON.stringify(old) };
  check("an old save is listed too", SB.Save.worlds().length === 1 && SB.Save.worlds()[0].id === "legacy");
  let got = null; SB.Save.loadWorld("legacy").then(d => { got = d; });
  setTimeout(() => {
    check("and loads", got && got.seed === 84);
    SB.Save.removeWorld("legacy");
    check("deleting it clears the live save", !SB.Save.load() && SB.Save.worlds().length === 0);
    const sc = SB.Game.create(85, 256); sc.showcase = true;
    check("the title screen's city is never saved", SB.Save.save(sc) === false && !SB.Save.load());
    console.log(failed ? "\n" + failed + " FAILED" : "\nall passed");
    process.exit(failed ? 1 : 0);
  }, 50);
}
