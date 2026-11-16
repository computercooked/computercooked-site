// round 4, world / deep / animals: things the visible pass list flagged that code could settle.
// These read the shipped play/js files (what strip.js writes), so they also prove the strip was run.
//   1. a raft in the bag must not turn look.fins on (the body drew fins on a smol that only carried a raft)
//   2. a rider on an "over water" mount must not be given a fin (look.fins = A.FIN drew one)
//   3. a patch that changes biome must bake again every render chunk it reaches, not only the one under its middle
// node games/smol-brains/tests/round4-world.test.js
"use strict";
const fs = require("fs"), path = require("path");
let failed = 0, passed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (ok) passed++; else failed++; }
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");
const deep = js("deep.js"), animals = js("animals.js"), world3 = js("world3.js"), creature = js("creature.js"), render = js("render.js");

console.log("1. the raft floats a smol without fins");
check("the swim check in creature.js still reads c.wade", /c\.look\.fins \|\| c\.tier >= 6\)\) \|\| c\.wade > 0/.test(creature));
check("a raft in the bag no longer sets look.fins", !/if \(boat && c\.look && !c\.look\.fins\) \{ c\.look\.fins = true/.test(deep));
check("only the ice path sets look.fins", (deep.match(/c\.look\.fins = true/g) || []).length === 1 && /if \(ice && c\.look && !c\.look\.fins\) \{ c\.look\.fins = true; raft = \{ c: c, fin: 1 \}/.test(deep));
check("the raft keeps c.wade topped up", /c\.wade = RAFT_WADE/.test(deep) && /RAFT_WADE = 1\.5/.test(deep));
check("losing the raft ends the wade at once", /else if \(!\(raft\.c\.wade > RAFT_WADE\)\) raft\.c\.wade = 0/.test(deep));
check("the quick step asks the swim check, not the fins", /walkable\(w, qnx, qnz, !!\(SB\.Creature && SB\.Creature\.canSwim/.test(deep));

console.log("2. a rider over water gets no fin");
check("riding no longer sets look.fins", !/me\.look\.fins = A\.FIN/.test(animals));
check("it keeps c.wade topped up instead", /me\.wade = A\.RIDE_WADE/.test(animals) && /A\.RIDE_WADE = 1\.5/.test(animals));
check("getting off ends the wade", /s\.fins === c\.id && !\(c\.wade > A\.RIDE_WADE\)\) c\.wade = 0/.test(animals));
check("a fin left by an older save is still taken off", /c\.look\.fins === A\.FIN\) c\.look\.fins = s\.finsWas \|\| 0/.test(animals));

console.log("3. changed ground is baked again in every chunk the patch reaches");
check("render.js has markGround and it drops the baked terrain", /R\.markGround = function \(x, z\)/.test(render) && /c\.lod\[s\] = null/.test(render));
check("paint marks the patch's four corners, two tiles out", /xs = \[i0 - 2, i1 \+ 2\], zs = \[j0 - 2, j1 \+ 2\]/.test(world3) && /for \(var a = 0; a < 2; a\+\+\) for \(var q = 0; q < 2; q\+\+\) mk\.call\(Rn,/.test(world3));
// the same sum as paint(), on a 256 island (48 patches of 5.33 tiles, 32-tile chunks): the old single mark missed chunks
(function () {
  const N = 256, G = 48, cs = N / G, S = 32, nc = N / S;
  const chunkOf = (x, z) => Math.min(nc - 1, Math.max(0, (z / S) | 0)) * nc + Math.min(nc - 1, Math.max(0, (x / S) | 0));
  let missedOld = 0, missedNew = 0;
  for (let c = 0; c < G * G; c++) {
    const i0 = Math.floor((c % G) * cs), j0 = Math.floor((c / G | 0) * cs), i1 = Math.floor((c % G + 1) * cs), j1 = Math.floor(((c / G | 0) + 1) * cs);
    const need = new Set();
    // a vertex blends the tiles from two before it to one after it, and a chunk owns vertices ci*S .. ci*S+S
    for (let vj = j0 - 1; vj <= j1 + 1; vj++) for (let vi = i0 - 1; vi <= i1 + 1; vi++) {
      if (vi < 0 || vj < 0 || vi > N || vj > N) continue;
      [[vi, vj], [vi - 1, vj], [vi, vj - 1], [vi - 1, vj - 1]].forEach(p => { if (p[0] >= 0 && p[1] >= 0 && p[0] < N && p[1] < N) need.add(chunkOf(p[0], p[1])); });
    }
    const old = new Set([chunkOf((c % G + 0.5) * cs, ((c / G | 0) + 0.5) * cs)]), now = new Set();
    const cl = v => Math.max(0, Math.min(N - 1, v));
    [i0 - 2, i1 + 2].forEach(x => [j0 - 2, j1 + 2].forEach(z => now.add(chunkOf(cl(x), cl(z)))));
    need.forEach(k => { if (!old.has(k)) missedOld++; if (!now.has(k)) missedNew++; });
  }
  check("one mark under the middle missed chunks (the old way)", missedOld > 0, missedOld + " missed");
  check("the four corners miss none", missedNew === 0, missedNew + " missed");
})();

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
