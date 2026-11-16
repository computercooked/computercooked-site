// 4.38: the last island that lost smols to hunger (a starving smol following a path round a hill was "going in
// circles" after seven seconds), and three more language packs.
// node games/smol-brains/tests/play438.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra != null && extra !== "" ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const dir = path.join(__dirname, "..", "play", "js");
const html = fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8");
const js = f => fs.readFileSync(path.join(dir, f), "utf8");
const order = (html.match(/src="js\/([a-z0-9-]+)\.js"/g) || []).map(s => s.slice(8, -4));
const EXTRA = ["ext", "bosses", "body", "possess", "home", "loot", "friends", "town", "dark", "powers", "fight", "deep", "harvest", "animals", "qol", "wear", "shapes", "wardrobe3", "motion3", "world3", "helpers3", "arrivals3", "minds3"];
function island(seed) {
  const ctx = load(), SB = ctx.SB;
  order.filter(n => EXTRA.indexOf(n) >= 0).forEach(n => { if (n === "bosses" && SB.Bosses) return; vm.runInContext(js(n + ".js"), ctx, { filename: n + ".js" }); });
  if (SB.Possess) SB.Possess.headless = true;
  const game = SB.Game.newGame(seed); SB.Game.current = game; game.tutorial.done = true;
  SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod));
  const sp = game.world.T.spawn; for (let i = 0; i < 2; i++) SB.Game.spawnSmol(game, { x: sp.x - 1 + i * 2, z: sp.z + 2, age: 560 });
  return { SB, game };
}
function run(SB, game, secs) { for (let s = 0; s < secs / SB.TICK; s++) { SB.Game.step(game, SB.TICK); if (SB.Ext) SB.Ext.tick(game, SB.TICK); } }

console.log("1. a starving smol on a winding path keeps walking");
check("no closer for seven seconds ends a walk; twenty for a starving smol that has a path", /a\.t ?- ?a\.bestT ?> ?\(c\.path ?&& ?starvingFor\(c, ?a\) ?\? ?20 ?: ?7\)/.test(js("creature.js")));

console.log("2. four languages besides english");
{
  const ctx = load();
  ["meshes", "ext", "arrivals3", "title"].forEach(n => vm.runInContext(js(n + ".js"), ctx, { filename: n + ".js" }));
  const TR = ctx.SB.Tr, es = Object.keys(TR.packs.es).filter(k => k !== "_name");
  const slots = s => (String(s).match(/\{\}/g) || []).length;
  [["fr", "français"], ["de", "deutsch"], ["pt", "português"]].forEach(l => {
    const p = TR.packs[l[0]] || {};
    const miss = es.filter(k => typeof p[k] !== "string" || !p[k]), bad = es.filter(k => slots(k) !== slots(p[k]));
    check(l[1] + " covers every line the spanish pack does, names and numbers in place", p._name === l[1] && miss.length === 0 && bad.length === 0, TR.count(l[0]) + " lines, " + miss.length + " missing, " + bad.length + " with the wrong blanks");
  });
  TR.set("fr");
  check("pick french: lines come back in french", TR.t("▶ play now") === "▶ jouer" && TR.t("🛏 Mo is your guest for 3 days") === "🛏 Mo est ton invité pour 3 jours");
  TR.set("de");
  check("pick german", TR.t("load game") === "spiel laden" && TR.t("day 4") === "tag 4");
  TR.set("pt");
  check("pick portuguese", TR.t("settings") === "ajustes" && TR.t("Biscuit joined your smols! 🧳") === "Biscuit se juntou aos seus smols! 🧳");
  TR.set("en");
  check("the settings screen lists a button for every pack", Object.keys(TR.packs).length >= 5 && /Object\.keys\(TR\.packs\)\.map/.test(js("title.js")));
}

console.log("3. island 23, three days: nobody starves (4.37: two did, far from home)");
seeded(23, () => {
  const { SB, game } = island(23);
  let starved = 0; SB.bus.on("death", d => { if (d && d.c && d.c.species === "smol" && d.cause === "starved") starved++; });
  run(SB, game, 3 * SB.DAY_LENGTH);
  const n = SB.Game.smols(game).length;
  check("island 23: the tribe grew and nobody starved", n >= 8 && starved === 0, n + " alive, " + starved + " starved");
});

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
