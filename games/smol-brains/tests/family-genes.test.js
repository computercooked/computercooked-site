// 4.20: a child next to its parents (the NeuraQuarium idea), the drowning card that stuck, the pod card on a short screen.
// node games/smol-brains/tests/family-genes.test.js
"use strict";
const fs = require("fs"), path = require("path");
const load = require("./_load.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const ctx = load(), SB = ctx.SB, G = SB.Genome;
const game = SB.Game.newGame(420); SB.Game.current = game; game.headless = true;
const T = game.world.T.spawn;

console.log("1. a gene snapshot");
const a = SB.Game.spawnSmol(game, { x: T.x, z: T.z, sex: "f" }), b = SB.Game.spawnSmol(game, { x: T.x + 1, z: T.z, sex: "m" });
const s = G.snap(a.genome), back = G.unsnap(s);
check("two hex characters per compared gene", s.length === G.CMP.length * 2 && /^[0-9a-f]+$/.test(s), s.length + "");
check("it comes back within a rounding step", G.CMP.every(k => Math.abs(back[k] - (a.genome.genes[k] || 0)) <= 1 / 255 + 1e-9));
check("the evolution genes and the personality are compared", G.CMP.indexOf("arms") >= 0 && G.CMP.indexOf("bravery") >= 0 && G.CMP.indexOf("hue") < 0);
check("garbage decodes to nothing, not a crash", G.unsnap(null) === null && G.unsnap("") === null);

console.log("2. the family tree keeps it");
check("a new smol's family record has its genes and sex", game.family[a.id].gx === s && game.family[a.id].sex === "f");
const kidG = G.cross(a.genome, b.genome, game.rng);
const kid = SB.Game.spawnSmol(game, { x: T.x, z: T.z + 1, genome: kidG, parents: [a.id, b.id] });
const saved = SB.Save.revive(JSON.parse(JSON.stringify(SB.Save.snapshot(game))));
check("and it survives a save", saved.family[kid.id].gx === G.snap(kid.genome) && saved.family[a.id].gx === s);

console.log("3. child vs parents");
const me = Object.assign({}, a.genome.genes), pa = Object.assign({}, a.genome.genes), pb = Object.assign({}, a.genome.genes);
pa.arms = 0.2; pb.arms = 0.4; me.arms = 0.7;
pa.bravery = 0.6; pb.bravery = 0.8; me.bravery = 0.1;
pa.speed = 0.3; pb.speed = 0.5; me.speed = 0.42;
const cmp = G.compare(me, [pa, pb]), by = {}; cmp.forEach(x => by[x.gene] = x);
check("one row per compared gene", cmp.length === G.CMP.length);
check("more hands than either parent", by.arms.beyond === 1 && Math.abs(by.arms.d - 0.4) < 1e-9 && by.arms.label === "hands");
check("less brave than either parent", by.bravery.beyond === -1 && by.bravery.d < 0);
check("between its parents is not past them", by.speed.beyond === 0);
check("one known parent still compares", G.compare(me, [pa, null]).length === G.CMP.length && G.compare(me, []).length === 0);

console.log("4. the card shows it");
const ui = fs.readFileSync(path.join(__dirname, "..", "play", "js", "ui.js"), "utf8"), css = fs.readFileSync(path.join(__dirname, "..", "play", "style.css"), "utf8");
check("genes & more has a 'vs its parents' section", /vs its parents/.test(ui) && /function parentsHTML/.test(ui) && /html \+= parentsHTML\(c, ps\)/.test(ui));
check("a parent who's gone is read back from the family tree", /SB\.Genome\.unsnap\(r\.gx\)/.test(ui));
check("parents' marks sit on the gene bars, pink and blue", /class="' \+ \(p\.sex === "f" \? "pf" : "pm"\)/.test(ui) && /\.gene \.b s\.pm/.test(css));

console.log("5. the drowning card lets go on land");
kid.drownT = 4; kid.drownNoted = true; kid.heldBy = null;
SB.Creature.tick(kid, 0.05, game);
check("a smol on dry land isn't drowning any more", !kid.drownT && !kid.drownNoted, kid.drownT + "");

console.log("6. the pod card on a short screen");
check("the pod card moves aside on windows up to 680 px tall", /@media \(max-height: 680px\) \{ \.coach\.pod \{/.test(css));

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
