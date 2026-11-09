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

  console.log("4. the story beats (P5)");
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "play", "js", "lantern.js"), "utf8"), ctx, { filename: "lantern.js" });
  const Lt = SB.Lantern;
  check("stage 1's film is queued once", Lt.moment(game, "stage1") && !Lt.moment(game, "stage1") && game.lantern.films.stage1 === 1);
  game.tutorial.night = { pip: a.id, done: true };
  const egg1 = SB.World.add(game.world, game, "egg", a.x, a.z, { genome: a.genome, genome2: b.genome, parents: [b.id, 999], gen: 2, progress: 0 });
  SB.Game.hatch(game, egg1);
  check("the first baby gets its film", game.lantern.films.baby === 1 && !game.lantern.films.growup);
  const egg2 = SB.World.add(game.world, game, "egg", a.x, a.z, { genome: a.genome, genome2: b.genome, parents: [a.id, b.id], gen: 2, progress: 0 });
  SB.Game.hatch(game, egg2);
  check("Pip's own little one: Pip grows up", game.lantern.films.growup === 1);
  // a smol dies alone in the dark, far from any fire: it gets up a grump
  game.world.night = true;
  const lost = SB.Game.smols(game).find(o => o !== a && o !== b) || b;
  const far = { x: lost.x, z: lost.z };
  const g0 = game.creatures.filter(o => o.species === "grump" && o.alive).length;
  SB.World.nearestFire = () => null;
  SB.bus.emit("death", { c: lost, cause: "hurt" });
  const turned = game.creatures.filter(o => o.species === "grump" && o.alive);
  check("its light goes out: a grump gets up where it fell", turned.length === g0 + 1 && turned.some(o => o.wasSmol === lost.name && SB.dist(o.x, o.z, far.x, far.z) < 0.5), turned.map(o => o.name).join(", "));
  check("with the first grump's film", game.lantern.films.grump === 1);
  SB.bus.emit("death", { c: a, cause: "hurt" });
  check("only the first time", game.creatures.filter(o => o.species === "grump" && o.alive).length === g0 + 1);
  console.log("4b. stage 3: the nest glows and grumps keep away (K-0048)");
  const st0 = game.lantern.stage, nest = game.world.T.nest;
  game.lantern.stage = 3; game.world.night = true;
  const gx = SB.Game.spawnGrump(game, nest.x + 8, nest.z);
  for (let t = 0; t < 4 && !gx.goingHome; t += SB.TICK) SB.Game.step(game, SB.TICK);
  check("a grump 8 m from the glowing nest turns for home", gx.goingHome);
  game.lantern.stage = st0;
  console.log("5. fifty embers: the Hollow wakes");
  const sp0 = game.sparks;
  for (let i = 0; E.next(game) != null && i < 80; i++) E.add(game, "fill:" + i, "a memory");
  check("four stages, the last is the finale", E.stage(game) === 4 && E.count(game) === 50 && E.next(game) === null, E.stage(game) + " / " + E.count(game));
  check("the Lantern's sparks: +20 +30 +40", game.sparks - sp0 >= 89, (game.sparks - sp0).toFixed(1));
  check("the Hollow woke: every grump goes home", E.woke(game) && game.creatures.filter(o => o.species === "grump" && o.alive).every(o => o.goingHome));
  check("the finale's film", game.lantern.films.wake === 1);
  check("the nights are nearly half as dark", Math.abs(E.nightLight(game) - 0.48) < 1e-9, E.nightLight(game));
  const gBefore = game.creatures.filter(o => o.species === "grump" && o.alive).length;
  SB.bus.emit("death", { c: SB.Game.smols(game)[0], cause: "hurt" });
  check("no more grumps get up after it", game.creatures.filter(o => o.species === "grump" && o.alive).length === gBefore);

  console.log("5b. the lore journal (4.14): pages come back with the embers");
  check("16 pages, in ember order, the last at the finale", E.LORE.length === 16 && E.LORE.every((p, i) => !i || p[0] > E.LORE[i - 1][0]) && E.LORE[15][0] === E.STAGES[E.STAGES.length - 1]);
  check("every page has a title and real text", E.LORE.every(p => p[1] && p[2].length > 80));
  check("at 50 embers every page is back", E.pages(game).length === 16 && E.nextPage(game) === null);
  {
    const g9 = SB.Game.newGame(909); const seen = []; const off = SB.bus.on("lorePage", d => seen.push(d.page[1]));
    check("a fresh island: no pages yet, the first at 1 ember", E.pages(g9).length === 0 && E.nextPage(g9)[0] === 1);
    for (let i = 0; i < 12; i++) E.add(g9, "lore:" + i, "a memory");
    check("12 embers: 6 pages, each announced once", E.pages(g9).length === 6 && seen.length === 6, seen.join(", "));
    if (typeof off === "function") off();
  }

  console.log("5c. the Lantern's pull (4.14): eggs lean toward the next tier, more with each stage");
  {
    const g8 = SB.Game.newGame(808), G = SB.Genome;
    const par = SB.Game.smols(g8)[0] || SB.Game.spawnSmol(g8, { x: g8.world.T.spawn.x, z: g8.world.T.spawn.z });
    const need = G.nextNeeds(par.genome).map(x => x.gene === "neurons" ? "cortex" : x.gene).filter(k => par.genome.genes[k] != null)[0];
    const kid = () => JSON.parse(JSON.stringify(par.genome));
    const a = kid(), b = kid(); const v0 = a.genes[need];
    const n0 = SB.Game.lanternPull(g8, a, par.genome, par.genome);
    g8.lantern = { embers: 30, stage: 3, got: {}, log: [] };
    SB.Game.lanternPull(g8, b, par.genome, par.genome);
    check("a needed gene goes up", n0 > 0 && a.genes[need] > v0, need + " " + v0.toFixed(3) + " → " + a.genes[need].toFixed(3));
    check("and further at Lantern stage 3", b.genes[need] > a.genes[need], a.genes[need].toFixed(3) + " vs " + b.genes[need].toFixed(3));
    const gr = kid(); gr.species = "grump"; const gv = JSON.stringify(gr.genes);
    check("grumps don't get it", SB.Game.lanternPull(g8, gr, par.genome, par.genome) === 0 && JSON.stringify(gr.genes) === gv);
  }

  console.log("6. saved with the island");
  const back = SB.Save.revive(JSON.parse(JSON.stringify(SB.Save.snapshot(game))));
  check("embers, stage and memories come back", back.lantern && back.lantern.embers === E.count(game) && back.lantern.stage === E.stage(game) && back.lantern.got.night1 === 1 && back.lantern.woke && back.lantern.films.wake === 1, back.lantern && JSON.stringify([back.lantern.embers, back.lantern.stage]));
  check("an old save without a Lantern starts at 0", (() => { const s = JSON.parse(JSON.stringify(SB.Save.snapshot(game))); delete s.lantern; const g2 = SB.Save.revive(s); return E.count(g2) === 0 && E.stage(g2) === 0; })());
});

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
