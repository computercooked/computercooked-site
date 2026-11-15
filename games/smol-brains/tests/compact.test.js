// The game loads compact copies of its code (play/js), packed from the readable sources (src) by tools/strip.js.
// Every other test runs on the readable sources. This one proves the packing changes nothing: it runs the same
// island, same seed, same steps, with every plug-in system loaded, once on each, and the two must come out
// identical, smol by smol and number by number.
// node games/smol-brains/tests/compact.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra != null && extra !== "" ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const dir = path.join(__dirname, "..", "play", "js");
const html = fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8");
const order = (html.match(/src="js\/([a-z0-9-]+)\.js"/g) || []).map(s => s.slice(8, -4));
const EXTRA = ["ext", "bosses", "body", "possess", "home", "loot", "friends", "town", "dark", "powers", "fight", "deep", "harvest", "animals", "qol", "wear", "shapes", "wardrobe3", "motion3", "world3", "helpers3", "arrivals3", "minds3"];
const r3 = v => typeof v === "number" ? Math.round(v * 1000) / 1000 : v;
function run(compact, seed, steps) {
  if (compact) process.env.SB_COMPACT = "1"; else delete process.env.SB_COMPACT;
  try {
    return seeded(seed, () => {
      const ctx = load(), SB = ctx.SB, errs = [];
      order.filter(n => EXTRA.indexOf(n) >= 0).forEach(n => { if (n === "bosses" && SB.Bosses) return; try { vm.runInContext(fs.readFileSync(path.join(dir, n + ".js"), "utf8"), ctx, { filename: n + ".js" }); } catch (e) { errs.push(n + ": " + e.message); } });
      if (SB.Possess) SB.Possess.headless = true;
      const game = SB.Game.newGame(seed); SB.Game.current = game; game.tutorial.done = true;
      SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod));
      const sp = game.world.T.spawn;
      for (let i = 0; i < 5; i++) SB.Game.spawnSmol(game, { x: sp.x - 3 + i * 1.5, z: sp.z + 2, age: i < 1 ? 0 : 560 });
      SB.Game.spawnGrump(game, sp.x + 9, sp.z + 6);
      const ev = {};
      ["hatch", "death", "learnWord", "egg", "eat", "craft", "built", "tierUp", "eureka", "grumpArrive"].forEach(k => SB.bus.on(k, () => { ev[k] = (ev[k] || 0) + 1; }));
      for (let s = 0; s < steps; s++) { SB.Game.step(game, SB.TICK); if (SB.Ext) SB.Ext.tick(game, SB.TICK); if (s === Math.floor(steps / 4)) SB.Game.smols(game).forEach((c, i) => { c.tier = Math.max(c.tier, 2 + (i % 3)); }); }
      const off = SB.Ext ? Object.keys(SB.Ext._handlers).map(k => k + ":" + SB.Ext._handlers[k].filter(f => f._off).length).join(" ") : "";
      const smols = game.creatures.map(c => [c.id, c.species, c.name, c.alive ? 1 : 0, r3(c.x), r3(c.z), c.tier, r3(c.chem && c.chem.hunger), r3(c.chem && c.chem.health), r3(c.chem && c.chem.fear), (c.words && Object.keys(c.words).length) || 0, c.inv && c.inv.s ? c.inv.s.map(s => s ? s.k + s.n : "").join(",") : ""]);
      const items = {}; game.world.items.forEach(o => { items[o.kind] = (items[o.kind] || 0) + 1; });
      return { errs, off, n: Object.keys(SB.KINDS).length, st: Object.keys(SB.STRUCTS).length, time: r3(game.time), smols: JSON.stringify(smols), items: JSON.stringify(Object.keys(items).sort().map(k => k + ":" + items[k])), structs: game.world.structures.map(s => s.kind + "@" + r3(s.x) + "," + r3(s.z)).join(" "), quests: Object.keys(game.quests || {}).sort().join(" "), ev: JSON.stringify(Object.keys(ev).sort().map(k => k + ":" + ev[k])), creatures: game.creatures.length };
    });
  } finally { delete process.env.SB_COMPACT; }
}
const STEPS = 7000;
[4351, 77].forEach(seed => {
  console.log("island " + seed + ", " + STEPS + " steps, every system loaded");
  const a = run(false, seed, STEPS), b = run(true, seed, STEPS);
  check("both load every system without an error", !a.errs.length && !b.errs.length, a.errs.concat(b.errs).slice(0, 3).join(" · "));
  check("the same things exist (" + a.n + " kinds, " + a.st + " buildings)", a.n === b.n && a.st === b.st && a.n > 500);
  check("no plug-in handler was switched off in either", !/:[1-9]/.test(a.off) && a.off === b.off, a.off + " | " + b.off);
  check("the island lived: creatures moved, ate and learned", a.creatures >= 6 && a.ev.split(":").length > 4, a.creatures + " creatures, " + a.ev);
  check("the same clock", a.time === b.time, a.time + " / " + b.time);
  check("every creature is in the same place, in the same state, holding the same things", a.smols === b.smols, a.smols === b.smols ? "" : firstDiff(a.smols, b.smols));
  check("the same things lie on the ground", a.items === b.items, a.items === b.items ? "" : firstDiff(a.items, b.items));
  check("the same buildings stand in the same places", a.structs === b.structs);
  check("the same events happened the same number of times", a.ev === b.ev, a.ev + " | " + b.ev);
  check("the same saved state", a.quests === b.quests);
});
function firstDiff(x, y) { let i = 0; while (i < x.length && x[i] === y[i]) i++; return "at " + i + ": " + x.slice(Math.max(0, i - 30), i + 40) + " | " + y.slice(Math.max(0, i - 30), i + 40); }
console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
