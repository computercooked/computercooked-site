// memory embers and the Lantern (K-0041 P4): each memory the smols win back is one ember (the same memory only once),
// five relight the Lantern to stage 1 (the "lantern" event, sparks, a less dark night), and it all survives a save.
// node games/smol-brains/tests/embers.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }

seeded(4400, () => {
  const ctx = load();
  ["embers.js"].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8"), ctx, { filename: f }));
  const SB = ctx.SB, E = SB.Embers;
  const game = SB.Game.newGame(44); SB.Game.current = game; game.headless = true;
  const embers = [], stages = []; SB.bus.on("ember", d => embers.push(d)); SB.bus.on("lantern", d => stages.push(d.stage));
  game.world.items.filter(o => o.kind === "egg" || (o.data && o.data.pod)).slice().forEach(o => SB.Game.hatch(game, o));
  const smols = SB.Game.smols(game), a = smols[0], b = smols[1];
  check("there are smols to remember things", smols.length >= 2, smols.length);

  console.log("1. one ember per memory");
  check("a new island has none", E.count(game) === 0 && E.stage(game) === 0 && E.next(game) === 5);
  check("the first night gives one", E.add(game, "night1", "Pip remembered fire"));
  check("the same memory doesn't count twice", !E.add(game, "night1", "again") && E.count(game) === 1);

  console.log("2. the memories that count");
  SB.bus.emit("tickle", { c: a });
  SB.bus.emit("tickle", { c: b });
  check("the first tickle (once)", E.count(game) === 2, E.count(game));
  ["mo", "pa", "zu", "ki"].forEach(w => SB.bus.emit("learnWord", { c: a, word: w }));
  check("the first three words, not a fourth", E.count(game) === 5, E.count(game));
  check("five embers: the Lantern catches, stage 1", E.stage(game) === 1 && stages.join(",") === "1", stages.join(","));
  check("the next stage is at 15", E.next(game) === 15);
  check("each ember says why", embers.length === 5 && embers.every(d => d.why && d.n > 0), embers.map(d => d.why).join(" | "));
  const n0 = E.count(game);
  SB.bus.emit("ideaLearned", { c: a, id: "fire" });
  SB.bus.emit("partners", { a: a, b: b });
  SB.bus.emit("partners", { a: b, b: a });
  check("a discovery and a couple (once each way round)", E.count(game) === n0 + 2, E.count(game) - n0);
  SB.bus.emit("tickle", { c: { species: "grump", alive: true } });
  check("grumps don't give embers", E.count(game) === n0 + 2);

  console.log("3. the Lantern's light");
  check("stage 1 takes 12% off the night", Math.abs(E.nightLight(game) - 0.12) < 1e-9, E.nightLight(game));
  check("never more than half", E.nightLight({ lantern: { stage: 9 } }) === 0.5);

  console.log("4. saved with the island");
  const back = SB.Save.revive(JSON.parse(JSON.stringify(SB.Save.snapshot(game))));
  check("embers, stage and memories come back", back.lantern && back.lantern.embers === E.count(game) && back.lantern.stage === 1 && back.lantern.got.night1 === 1, back.lantern && JSON.stringify([back.lantern.embers, back.lantern.stage]));
  check("an old save without a Lantern starts at 0", (() => { const s = JSON.parse(JSON.stringify(SB.Save.snapshot(game))); delete s.lantern; const g2 = SB.Save.revive(s); return E.count(g2) === 0 && E.stage(g2) === 0; })());
});

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
