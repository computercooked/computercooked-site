// 4.42: peckish smols stay in at night (from 0.5 hunger they were up in the dark looking for food, and were bitten
// three times as often), and four things that read badly from the sky: 29 keepsakes that were one gold cup, a square
// great glowshroom, the healer's flat green roof, the shop's plain green awning.
// node games/smol-brains/tests/play442.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra != null && extra !== "" ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const dir = path.join(__dirname, "..", "play", "js");
const html = fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8");
const js = f => fs.readFileSync(path.join(dir, f), "utf8");
const order = (html.match(/src="js\/([a-z0-9-]+)\.js"/g) || []).map(s => s.slice(8, -4));
const EXTRA = ["ext", "bosses", "body", "possess", "home", "loot", "friends", "town", "dark", "powers", "fight", "deep", "harvest", "animals", "qol", "wear", "shapes", "wardrobe3", "motion3", "world3", "helpers3", "arrivals3", "minds3"];
const ctx = load(), SB = ctx.SB;
vm.runInContext(js("meshes.js"), ctx, { filename: "meshes.js" }); // the mesh builder, so the shapes below are really built
order.filter(n => EXTRA.indexOf(n) >= 0).forEach(n => { if (n === "bosses" && SB.Bosses) return; vm.runInContext(js(n + ".js"), ctx, { filename: n + ".js" }); });
const C = SB.Creature, cj = js("creature.js");

console.log("1. peckish by day, not by night");
check("two numbers: 0.5 by day, the old 0.65 by night", C.PECKISH === 0.5 && C.PECKISH_NIGHT === 0.65);
check("the day number by day", C.peckish({ world: { night: false } }) === 0.5);
check("the night number at night", C.peckish({ world: { night: true } }) === 0.65);
check("at night it is still under 'too hungry to sleep', so a hungry smol still gets up", C.PECKISH_NIGHT < C.HUNGRY_AWAKE);
check("all five places ask which it is", (cj.match(/peckish\(game\)/g) || []).length >= 8 && !/ch\.hunger ?> ?C\.PECKISH\b/.test(cj) && !/c\.chem\.hunger ?> ?C\.PECKISH\b/.test(cj), (cj.match(/peckish\(game\)/g) || []).length + " uses");
check("food in sight", /mask\[V\.eat\] ?&& ?ch\.hunger ?> ?peckish\(game\)\)/.test(cj));
check("the walk when nothing is in sight", /ch\.hunger ?> ?peckish\(game\) ?\+ ?0\.05 ?&& ?nearestOf\[N\.food\] ?== ?null/.test(cj));
check("its nose, the spot where food was, the idle snack", /c\.chem\.hunger ?> ?peckish\(game\) ?&& ?\(sniff ?= ?sniffFood/.test(cj) && /c\.foodSpot ?&& ?c\.chem\.hunger ?> ?peckish\(game\) ?- ?0\.05/.test(cj) && /ch\.hunger ?> ?peckish\(game\) ?\? ?3 ?: ?1\.5/.test(cj));

console.log("1b. a bite does not stack the sickness");
check("only a smol that does not have it can catch it from a bite", C.BITE_CATCH === 0.2 && /game\.rng\.chance\(0\.2\) ?&& ?oc\.antigen ?< ?C\.BITE_CATCH\) ?oc\.antigen ?= ?Math\.min\(1, ?oc\.antigen ?\+ ?0\.25\)/.test(cj));
check("a rotten meal (0.25) or a first bite (0.25) is over the line, so the next bite adds nothing", 0.25 >= C.BITE_CATCH);

console.log("2. keepsakes you can tell apart");
{
  const ks = Object.keys(SB.KINDS).filter(k => /^trophy_/.test(k));
  check("there is a keepsake for every big beast", ks.length >= 27 && ks.length === SB.Dark.BEASTS.filter(d => d.big).length, ks.length);
  const pairs = {}, metals = {}; let wrong = [];
  ks.forEach(k => { const d = SB.KINDS[k], sh = SB.Meshes.shapeOf(k, d); if (!sh || sh[0] !== "keepsake") wrong.push(k); pairs[d.color + "/" + d.top] = (pairs[d.color + "/" + d.top] || 0) + 1; metals[d.metal] = 1; });
  check("every one is drawn as a keepsake (the torch god's was drawn as a hat)", wrong.length === 0, wrong.join(" "));
  check("no two share a colour and a topper", Object.values(pairs).every(v => v === 1), Object.keys(pairs).length + " pairs");
  check("nine colours, eight toppers, three metals", SB.Dark.KEEP_COLORS.length === 9 && ks.every(k => SB.KINDS[k].top >= 0 && SB.KINDS[k].top < 8) && Object.keys(metals).length === 3);
  // every topper builds a mesh with something in it
  let built = 0;
  for (let top = 0; top < 8; top++) { try { const b = SB.Meshes.builder(); SB.Meshes.generic("trophy_x", { noun: "toy", label: "x keepsake", color: 0xe0564a, top: top, metal: top % 3 }, b); const m = b.finish(); if (m) built++; } catch (e) { console.log("    topper " + top + ": " + e.message); } }
  check("each of the eight toppers builds", built === 8, built);
  check("an ordinary trophy is still a trophy", SB.Meshes.shapeOf("goldtrophy", { label: "gold trophy", color: 1 })[0] === "trophy");
}

console.log("3. three buildings from the sky");
{
  const pw = js("powers.js"), tw = js("town.js");
  const sm = (pw.match(/function shroomMesh\(\) \{[\s\S]*?return b\.finish\(\);/) || [""])[0];
  check("the great glowshroom is round: a dome, no square slabs", /\.sphere\(1, ?function ?\(x, ?y\) ?\{ ?return y ?< ?0 ?\? ?0\.01 ?: ?1; ?\}\)/.test(sm) && !/box\(2\.4/.test(sm) && !/\.box\(/.test(sm));
  check("with spots that glow, set on the dome", /glow\(0\.7\)/.test(sm) && /2\.66 ?\+ ?0\.95 ?\* ?Math\.sqrt/.test(sm));
  let ok = false; try { const m = SB.Meshes.STRUCT_BUILDERS.glowshroom(); ok = !!m; } catch (e) { console.log("    " + e.message); }
  check("it builds", ok);
  const he = (tw.match(/healer: function \(\) \{[\s\S]*?return b\.finish\(\);/) || [""])[0];
  check("the healer's hut: a darker eave, a white band, a bigger banner", /color\(0x3f7a34, ?1\)/.test(he) && /color\(0xffffff, ?1\)\.push\(\)\.translate\(0, ?1\.2, ?0\)\.cyl\(10, ?0\.62, ?0\.5, ?0\.12\)/.test(he) && /box\(0\.36, ?0\.34, ?0\.02\)/.test(he));
  const sh = (tw.match(/shop: function \(\) \{[\s\S]*?return b\.finish\(\);/) || [""])[0];
  check("the shop: a striped awning", /for ?\(var aw ?= ?0; ?aw ?< ?5; ?aw\+\+\) ?b\.color\(aw ?% ?2 ?\? ?0xf2ead8 ?: ?0x5fa04a, ?1\)/.test(sh));
}

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
