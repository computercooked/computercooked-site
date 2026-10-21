// Names: lots of them, cute and sayable, never repeated on one island, and kids sometimes echo a parent.
// node games/smol-brains/tests/names.test.js
"use strict";
const load = require("./_load.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const SB = load().SB;
const r = SB.rng(42), seen = new Set();
for (let i = 0; i < 5000; i++) seen.add(SB.makeName(r));
check("thousands of different names", seen.size > 4300, seen.size + " of 5000");
check("all short and sayable", [...seen].every(n => /^[A-Z][a-z]{2,7}$/.test(n) && !/[^aeiouy]{3}/i.test(n)), [...seen].filter(n => !/^[A-Z][a-z]{2,7}$/.test(n)).slice(0, 5).join(","));
const g = SB.Game.newGame(3);
const names = [];
for (let i = 0; i < 500; i++) names.push(SB.Game.spawnSmol(g, {}).name.toLowerCase());
check("never two the same on one island", new Set(names).size === names.length);
const dead = g.creatures[5]; SB.Creature.die(dead, g, "old");
const after = []; for (let i = 0; i < 300; i++) after.push(SB.Game.spawnSmol(g, {}).name.toLowerCase());
check("the dead's names aren't reused", !after.includes(dead.name.toLowerCase()));
const [ma, pa] = g.creatures, kids = [];
for (let i = 0; i < 60; i++) kids.push(SB.Game.spawnSmol(g, { parents: [ma.id, pa.id] }).name);
const echo = kids.filter(k => [ma.name, pa.name].some(p => k.toLowerCase().startsWith(p.toLowerCase().slice(0, 2)))).length;
check("some kids echo a parent's name", echo >= 3, echo + " of 60 · " + ma.name + "/" + pa.name + " → " + kids.slice(0, 8).join(" "));
console.log(failed ? "\n" + failed + " FAILED" : "\nall passed");
process.exit(failed ? 1 : 0);
