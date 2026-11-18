// 4.49: what the proof pass and the island traces turned up next.
//   1. an egg's gift is a strength: "give it NAME's X" only ever passes a gene the smol is strong in (over the middle)
//      AND has more of than the egg has. a smol with nothing like that has nothing to give, the button says so, and
//      no sparks are spent. no gift ever lowers a gene. (4.48 took the gene furthest from the middle, either way:
//      on the test island a smol with no affection at all took an egg's affection from 0.62 to 0.)
// node games/smol-brains/tests/play449.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra != null && extra !== "" ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");
const STAND = ["ears", "size", "fluff", "bravery", "playfulness", "learnRate", "toughness", "speed", "curiosity", "affection"];

seeded(4490, () => {
  const ctx = load();
  ["possess.js", "ext.js", "home.js", "friends.js"].forEach(f => vm.runInContext(js(f), ctx, { filename: f }));
  const SB = ctx.SB, P = SB.Possess, F = SB.Friends; P.headless = true;
  const game = SB.Game.newGame(88); SB.Game.current = game; game.tutorial.done = true;
  SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod));
  const nest = game.world.T.nest;
  const mk = (name, sex, dx, dz) => { const c = SB.Game.spawnSmol(game, { name, sex, x: nest.x + dx, z: nest.z + dz, age: 400 }); if (game.creatures.indexOf(c) < 0) game.creatures.push(c); c.tier = 3; c.stage = 3; return c; };
  const me = SB.Game.smols(game)[0]; me.tier = 3; me.stage = 3; me.x = nest.x + 6; me.z = nest.z + 6;
  const pa = mk("Pa", "m", 8, 6), ma = mk("Ma", "f", 9, 6), don = mk("Chu", "f", 7, 7);
  P.enter(game, me, { free: true });
  const newEgg = () => { pa.eggCooldown = 0; ma.eggCooldown = 0; return SB.Game.layEgg(game, pa, ma, me.x + 1, me.z); };
  const setAll = (o, v) => STAND.forEach(g => { o[g] = v; });
  const genes = e => Object.assign({}, e.data.genome.genes);
  const lowered = (a, b) => Object.keys(a).filter(g => b[g] < a[g] - 1e-12);
  const label = egg => { F._focus = don.id; const o = P.options(game, me, { type: "item", id: egg.id }); return o && o.place ? o.place : null; };
  game.sparks = 500;

  console.log("1. an egg's gift is a strength the egg lacks");
  // the case from the test island: a smol whose one gene far from the middle is a lack
  let egg = newEgg();
  setAll(don.genome.genes, 0.5); don.genome.genes.affection = 0; setAll(egg.data.genome.genes, 0.5); egg.data.genome.genes.affection = 0.62;
  let before = genes(egg), sp = game.sparks;
  check("a smol with no affection and nothing above the middle stands out in nothing", F.standout(don) === null && F.standout(don, egg) === null, String(F.standout(don)));
  let b = label(egg);
  check("the egg's button says there is nothing to give", !!b && /Chu has nothing to give this egg/.test(b.label) && !/3 ✨/.test(b.label), b && b.label);
  let r = F.geneCopy(game, don, egg);
  check("asking anyway is refused, costs nothing and changes nothing", !r.ok && r.none === true && game.sparks === sp && !egg.data.frGene && lowered(before, genes(egg)).length === 0 && egg.data.genome.genes.affection === 0.62, r.msg);
  check("...and the egg can still be given something by another smol", (function () { pa.genome.genes.ears = 0.97; const q = F.geneCopy(game, pa, egg); return q.ok && q.gene === "ears" && egg.data.genome.genes.ears === 0.97 && game.sparks === sp - 3; })());

  // a lack and a strength in one smol: the strength is the gift, even when the lack is further from the middle
  egg = newEgg();
  setAll(don.genome.genes, 0.5); don.genome.genes.affection = 0; don.genome.genes.ears = 0.8; setAll(egg.data.genome.genes, 0.5); egg.data.genome.genes.affection = 0.62; egg.data.genome.genes.ears = 0.4;
  before = genes(egg); sp = game.sparks;
  b = label(egg);
  check("the button names the strength, not the lack", !!b && /give it Chu's /.test(b.label) && /3 ✨/.test(b.label) && !/affection/.test(b.label) && F.standout(don, egg) === "ears", b && b.label);
  r = b && b.go ? (b.go(), { gene: egg.data.frGene && egg.data.frGene[0] }) : {};
  check("pressing it gives the egg the ears and leaves its affection alone", r.gene === "ears" && egg.data.genome.genes.ears === 0.8 && egg.data.genome.genes.affection === 0.62 && game.sparks === sp - 3 && lowered(before, genes(egg)).length === 0);
  check("one gift an egg", !F.geneCopy(game, don, egg).ok && game.sparks === sp - 3);

  // the smol's best gene is no better than the egg's own: the next strength the egg lacks is the gift
  egg = newEgg();
  setAll(don.genome.genes, 0.5); don.genome.genes.ears = 0.9; don.genome.genes.speed = 0.8; setAll(egg.data.genome.genes, 0.5); egg.data.genome.genes.ears = 0.95; egg.data.genome.genes.speed = 0.3;
  check("a strength the egg already tops is passed over for one it lacks", F.standout(don) === "ears" && F.standout(don, egg) === "speed");
  r = F.geneCopy(game, don, egg);
  check("...and that is what the egg gets", r.ok && r.gene === "speed" && egg.data.genome.genes.speed === 0.8 && egg.data.genome.genes.ears === 0.95);

  // an egg that tops the smol in every strength
  egg = newEgg();
  setAll(don.genome.genes, 0.5); don.genome.genes.ears = 0.7; don.genome.genes.bravery = 0.6; setAll(egg.data.genome.genes, 0.75);
  sp = game.sparks; r = F.geneCopy(game, don, egg);
  check("an egg with more of everything gets nothing, for nothing", !r.ok && r.none === true && game.sparks === sp && F.standout(don, egg) === null && /nothing to give/.test((label(egg) || {}).label || ""));

  // any smol, any egg: a gift never lowers a gene, and what it passes is over the middle
  let tried = 0, given = 0, down = 0, weak = 0, wrong = 0, seedN = 12345;
  const rnd = () => { seedN = (seedN * 1103515245 + 12345) & 0x7fffffff; return seedN / 0x7fffffff; };
  for (let i = 0; i < 300; i++) {
    egg = newEgg(); if (!egg) continue;
    STAND.forEach(g => { don.genome.genes[g] = rnd(); egg.data.genome.genes[g] = rnd(); });
    before = genes(egg); game.sparks = 500; tried++;
    const want = F.standout(don, egg); r = F.geneCopy(game, don, egg);
    if (r.ok) {
      given++;
      if (lowered(before, genes(egg)).length) down++;
      if (!(don.genome.genes[r.gene] > 0.5)) weak++;
      if (r.gene !== want || Object.keys(before).filter(g => before[g] !== egg.data.genome.genes[g]).join() !== r.gene) wrong++;
    } else if (want !== null || game.sparks !== 500 || lowered(before, genes(egg)).length) wrong++;
    SB.World.remove(game.world, egg);
  }
  check("300 smols and eggs at random: no gift lowered a gene", tried === 300 && down === 0, tried + " tried, " + given + " given, " + down + " lowered");
  check("...every gift was a gene over the middle, and only that one gene changed", weak === 0 && wrong === 0 && given > 150, weak + " weak, " + wrong + " wrong");
  check("the old rule (furthest from the middle, either way) is gone from the source", !/Math\.abs\(gene\(c, g\) - 0\.5\)/.test(fs.readFileSync(path.join(__dirname, "..", "src", "friends.js"), "utf8")));
});
console.log(failed ? "\n" + failed + " FAILED" : "\nall passed");
process.exit(failed ? 1 : 0);
