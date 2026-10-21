// From village to city: eras that live in heads (and slide back), population room that grows with the colony,
// jobs from habits and families, desire paths that become roads, districts, the council, the Law of the Sky,
// night lights, saving, and speed with a big city.
// node games/smol-brains/tests/civ.test.js
"use strict";
const load = require("./_load.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
function run(SB, game, secs) { for (let t = 0; t < secs / SB.TICK; t++) SB.Game.step(game, SB.TICK); }
function fed(SB, game) { SB.Game.smols(game).forEach(c => { c.chem.hunger = 0.1; c.chem.cold = 0; c.chem.health = Math.max(c.chem.health, 0.9); c.chem.sick = 0; }); }
function runFed(SB, game, secs) { for (let t = 0; t < secs; t += 1) { run(SB, game, 1); fed(SB, game); } }

function island(seed, tier, n, setup) {
  const SB = load().SB;
  const game = SB.Game.newGame(seed); SB.Game.current = game; game.tutorial.done = true; game.time = 1500; game.podT = 1e9; game.strangerT = 1e9;
  if (game.dir) game.dir.nextT = 1e9;
  game.world.items.filter(o => o.kind === "egg").forEach(o => SB.World.remove(game.world, o));
  const cs = n ? SB.Debug.spawnTier(tier, n) : [];
  const h = SB.Society.home(game, 0);
  cs.forEach((c, i) => { c.asleep = false; c.x = h.x + (i % 8) - 3.5; c.z = h.z + Math.floor(i / 8) - 2; c.age = Math.max(c.age, 700); c.lifespan = 1e7; });
  if (setup) setup(SB, game, cs);
  fed(SB, game);
  return { SB, game, cs, h };
}
// a ready-made city: n thinkers who know everything, a hall, stalls and a fire with huts
function city(seed, n) {
  return island(seed, 5, n || 32, (SB, game, cs) => {
    cs.forEach(c => SB.Debug.ideas(c));
    const h = SB.Society.home(game, 0);
    SB.Debug.build("campfire", h.x, h.z + 6);
    SB.Debug.build("hut", h.x - 5, h.z + 8); SB.Debug.build("hut", h.x + 5, h.z + 8);
    SB.Debug.build("stall", h.x + 7, h.z - 2); SB.Debug.build("stall", h.x + 8.5, h.z - 3.5);
    SB.Debug.build("hall", h.x - 8, h.z - 6);
  });
}

console.log("1. population room grows with the colony");
{
  const { SB, game } = island(51, 0, 2);
  run(SB, game, 3);
  check("blobs: about a dozen", SB.Game.POP_CAP === 12, SB.Game.POP_CAP);
  game.stats.maxTier = 2; run(SB, game, 2.5);
  check("tool-users: 16", SB.Game.POP_CAP === 16, SB.Game.POP_CAP);
  game.stats.maxTier = 3; run(SB, game, 2.5);
  check("a tribe: 20", SB.Game.POP_CAP === 20, SB.Game.POP_CAP);
  game.stats.maxTier = 4; run(SB, game, 2.5);
  check("builders: 28", SB.Game.POP_CAP === 28, SB.Game.POP_CAP);
  check("the era name starts as a band", SB.Civ.eraName(game) === "band");
}

console.log("2. band → village → town → city, with a banner each time");
{
  const { SB, game, h } = island(52, 5, 16, (SB, game, cs) => cs.forEach(c => SB.Debug.ideas(c)));
  const eras = []; SB.bus.on("era", d => eras.push(d));
  SB.Debug.build("campfire", h.x, h.z + 6); SB.Debug.build("hut", h.x - 4, h.z + 8); SB.Debug.build("hut", h.x + 4, h.z + 8);
  runFed(SB, game, 3);
  check("huts around a fire: a village", SB.Civ.era(game) === 1 && eras[0] && eras[0].up && eras[0].name === "village");
  check("no town without a market", (runFed(SB, game, 6), SB.Civ.era(game) === 1));
  SB.Debug.build("stall", h.x + 7, h.z - 2); SB.Debug.build("stall", h.x + 8, h.z - 4);
  runFed(SB, game, 3);
  check("a thinker, 15+ smols and two stalls: a town", SB.Civ.era(game) === 2, SB.Civ.eraName(game));
  check("towns have room for more smols", SB.Game.POP_CAP >= 42, SB.Game.POP_CAP);
  check("the steps toward the city are listed", SB.Civ.needs(game)[2].length === 3 && !SB.Civ.needs(game)[2][0].ok);
  check("the arrival time is remembered", game.civ.eraT[2] > 0);
}
{
  const { SB, game, cs } = city(53, 32);
  runFed(SB, game, 12);
  check("30+ smols, writing and a council hall: a city", SB.Civ.era(game) === 3, SB.Civ.eraName(game) + " pop " + SB.Game.smols(game).length);
  check("cities are bigger still", SB.Game.POP_CAP >= 52, SB.Game.POP_CAP);
  // a plague: the city slides back, but only after a long slump
  const down = []; SB.bus.on("era", d => { if (!d.up) down.push(d); });
  cs.slice(0, 10).forEach(c => SB.Creature.die(c, game, "sick"));
  runFed(SB, game, 60);
  check("a short slump doesn't end a city", SB.Civ.era(game) === 3);
  runFed(SB, game, 150);
  check("a long one does: back to a town", SB.Civ.era(game) === 2 && down.length === 1 && down[0].name === "town");
}
{
  // eras live in heads: if nobody remembers how to write, the city is a town again
  const { SB, game, cs } = city(54, 32);
  runFed(SB, game, 12);
  check("a city to start with", SB.Civ.era(game) === 3, SB.Civ.eraName(game));
  cs.forEach(c => { delete c.ideas.writing; delete c.ideas.totem; });
  runFed(SB, game, 200);
  check("forget writing and the city falls back to a town", SB.Civ.era(game) === 2, SB.Civ.eraName(game));
}

console.log("3. jobs grow from habits and run in families");
{
  const { SB, game, cs } = island(55, 5, 8, (SB, game, cs) => { const h = SB.Society.home(game, 0); SB.Debug.build("campfire", h.x, h.z + 6); SB.Debug.build("hut", h.x - 4, h.z + 8); SB.Debug.build("hut", h.x + 4, h.z + 8); });
  const potter = cs[0], fisher = cs[1];
  for (let i = 0; i < 6; i++) { SB.bus.emit("craft", { c: potter, id: "pottery", item: null }); SB.bus.emit("fish", { c: fisher }); }
  runFed(SB, game, 12);
  check("lots of pots: a potter", potter.job === "potter", potter.job);
  check("lots of fish: a fisher", fisher.job === "fisher", fisher.job);
  check("one pot doesn't make a job", !cs[3].job);
  const kid = SB.Game.spawnSmol(game, { genome: SB.Genome.forTier(game.rng, 5), x: potter.x + 1, z: potter.z, age: 200, parents: [potter.id, cs[2].id] });
  SB.bus.emit("hatch", { c: kid, obj: null });
  check("the potter's kid leans toward pottery", kid.jobLean === "potter");
  SB.Social.remember(game, cs[2], fisher, "play", 40, "we play together", 1e6, 40);
  runFed(SB, game, 11);
  check("the kid apprentices with someone", kid.mentor != null, kid.mentor);
}

console.log("4. desire paths become trails, then roads");
{
  const { SB, game, h } = city(56, 18);
  const w = game.world, N = w.T.N;
  let line = [];
  for (let i = -12; i <= 12; i++) { const x = Math.floor(h.x + i), z = Math.floor(h.z + 3); if (SB.World.depthAt(w, x + 0.5, z + 0.5) < 0.1) { w.wear[z * N + x] = 30; line.push([x, z]); } }
  game.creatures.forEach(c => { if (c.alive) delete c.ideas.paving; });
  runFed(SB, game, 12);
  const t = line[Math.floor(line.length / 2)];
  check("worn ground is a trail", SB.World.roadAt(w, t[0] + 0.5, t[1] + 0.5) === 1, line.length + " tiles");
  check("trails are quicker to walk", SB.World.roadSpeed(w, t[0] + 0.5, t[1] + 0.5) > 1);
  SB.Debug.ideas(SB.Game.smols(game)[0], ["paving"]);
  runFed(SB, game, 11);
  check("a town that knows paving paves them", SB.World.roadAt(w, t[0] + 0.5, t[1] + 0.5) === 2);
  check("roads are faster than trails", SB.World.roadSpeed(w, t[0] + 0.5, t[1] + 0.5) > 1.3);
  check("they're counted", SB.Civ.roadCount(game).paved >= line.length - 2, JSON.stringify(SB.Civ.roadCount(game)));
}

console.log("5. buildings of a kind cluster into named districts");
{
  const { SB, game, h } = city(57, 18);
  const ds = []; SB.bus.on("district", d => ds.push(d.d));
  SB.Debug.build("house", h.x - 14, h.z + 14); SB.Debug.build("house", h.x - 11, h.z + 15); SB.Debug.build("house", h.x - 13, h.z + 11);
  runFed(SB, game, 22);
  const homes = game.civ.districts.find(d => d.g === "homes");
  check("three houses make a quarter with a name", homes && /end$/.test(homes.name), homes && homes.name);
  check("its buildings get the quarter's colour", game.world.structures.filter(s => s.kind === "house").every(s => Array.isArray(s.tint)));
  check("the name sticks", (runFed(SB, game, 22), game.civ.districts.find(d => d.g === "homes").name === homes.name));
  check("new town buildings go next to their own kind", (() => { const c = SB.Game.smols(game)[0]; const s = SB.Ideas.pickSite(c, "house", game); return s && SB.dist(s.x, s.z, homes.x, homes.z) < 10; })());
}

console.log("6. the council: the most liked leads, a hated leader gets thrown out");
{
  const { SB, game, cs } = city(58, 32);
  const fav = cs[5];
  cs.forEach(c => { if (c !== fav) SB.Social.remember(game, c, fav, "nice", 50, "is lovely", 1e7, 60); });
  runFed(SB, game, 12);
  check("a city", SB.Civ.era(game) === 3);
  check("the best-liked smol leads the council", game.civ.council.leader === fav.id, game.civ.council.leader);
  check("their genes set the policies", SB.Civ.policyText(game.civ.council.policies).length === 3, SB.Civ.policyText(game.civ.council.policies).join(", "));
  const coups = []; SB.bus.on("coup", d => coups.push(d));
  cs.forEach(c => { if (c !== fav) SB.Social.remember(game, c, fav, "awful", -200, "ruined everything", 1e7, 200); });
  cs.forEach(c => { if (c !== fav) c.genome.genes.bravery = 0.9; });
  runFed(SB, game, 240);
  check("a hated leader is overthrown", coups.length >= 1 && game.civ.council.leader !== fav.id, coups.length + " coups");
  const before = game.civ.stats.elections;
  SB.bus.emit("season", { season: "summer" });
  check("every season there's a vote", game.civ.stats.elections === before + 1);
  check("there are guards and a scribe", SB.Game.smols(game).some(c => c.job === "guard") && SB.Game.smols(game).some(c => c.job === "scribe"));
}

console.log("7. the Law of the Sky: what the hand does becomes law, and guards keep it");
{
  const { SB, game, cs } = city(59, 32);
  runFed(SB, game, 12);
  cs.forEach(c => SB.Debug.ideas(c, ["law"]));
  runFed(SB, game, 11);
  const laws = []; SB.bus.on("law", d => laws.push(d.law));
  for (let i = 0; i < 4; i++) { const c = cs[10 + i]; c._doing = { v: SB.V.eat, n: SB.N.mushroom, t: game.time }; SB.Creature.tap(c, game); }
  check("the taps are logged with what the smol was doing", game.civ.hand["tap:" + SB.V.eat + ":" + SB.N.mushroom] === 4);
  SB.bus.emit("season", { season: "autumn" });
  check("the scribe writes the commonest one as law", laws.length === 1 && /^no /.test(laws[0].text), laws[0] && laws[0].text + (laws[0].misread ? " (misread)" : ""));
  check("a tickled habit becomes a 'the sky likes it' law", (() => { for (let i = 0; i < 3; i++) { const c = cs[15 + i]; c._doing = { v: SB.V.play, n: SB.N.ball, t: game.time }; SB.Creature.tickle(c, game); } SB.bus.emit("season", { season: "winter" }); return laws.length === 2 && /sky likes it/.test(laws[1].text); })(), laws[1] && laws[1].text);
  // enforcement: a guard next to someone breaking the (first) law tells them off
  const law = game.civ.laws[0], guard = SB.Game.smols(game).find(c => c.job === "guard"), bad = cs.find(c => c.job !== "guard" && c !== guard);
  const told = []; SB.bus.on("lawBroken", d => told.push(d));
  bad.x = guard.x + 1; bad.z = guard.z; bad._lawT = 0;
  bad.action = { verb: law.verb, noun: law.noun, kind: "x", phase: "go", dur: 5, t: 0 };
  run(SB, game, 2.1);
  check("a guard tells off a law-breaker", told.length >= 1 && told[0].c === bad, told.length);
  check("and the offender remembers it", SB.Social.opinion(game, bad, guard) < SB.Social.opinion(game, cs.find(c => c !== bad && c !== guard), guard) + 1);
  // a scribe who can barely read misreads a lot: over many laws, some come out wrong
  const scribe = SB.Game.byId(game, game.civ.scribe); scribe.genome.genes.learnRate = 0;
  let mis = 0;
  for (let i = 0; i < 12; i++) { game.civ.hand["tap:" + SB.V.hit + ":" + i] = 5; SB.bus.emit("season", { season: "spring" }); }
  game.civ.laws.forEach(l => { if (l.misread) mis++; });
  check("misreadings happen", mis >= 1, mis + " of " + game.civ.laws.length);
}

console.log("8. night lights in the city");
{
  const { SB, game, h } = city(60, 32);
  SB.Debug.build("house", h.x - 14, h.z + 14);
  runFed(SB, game, 12);
  check("house and hall windows are lit in a city", SB.Civ.lit(game) && SB.Civ.lights(game).some(s => s.kind === "house") && SB.Civ.lights(game).some(s => s.kind === "hall"));
}

console.log("9. it all saves, and old saves load");
{
  const { SB, game, cs, h } = city(61, 32);
  runFed(SB, game, 12);
  const w = game.world, N = w.T.N; w.road[(Math.floor(h.z) + 4) * N + Math.floor(h.x)] = 2; w.road[(Math.floor(h.z) + 4) * N + Math.floor(h.x) + 1] = 1;
  cs[0].job = "smith"; cs[0].purse = 7.5; cs[0].owe = { [cs[1].id]: 2 };
  game.civ.laws.push({ key: "tap:2:4", act: "tap", verb: 2, noun: 4, text: "no eating shrooms!", t: 1, n: 3, broken: 0, kept: 0 });
  const data = JSON.parse(JSON.stringify(SB.Save.snapshot(game)));
  const g2 = SB.Save.revive(data); SB.Game.current = g2;
  const c0 = SB.Game.byId(g2, cs[0].id);
  check("the era is kept", SB.Civ.era(g2) === 3);
  check("laws, council and districts are kept", g2.civ.laws.length === game.civ.laws.length && g2.civ.council.leader === game.civ.council.leader);
  check("roads are kept", SB.World.roadAt(g2.world, Math.floor(h.x) + 0.5, Math.floor(h.z) + 4.5) === 2 && SB.World.roadAt(g2.world, Math.floor(h.x) + 1.5, Math.floor(h.z) + 4.5) === 1);
  check("jobs, purses and debts are kept", c0.job === "smith" && c0.purse === 7.5 && c0.owe[cs[1].id] === 2);
  check("the population room is right after loading", SB.Game.POP_CAP >= 52, SB.Game.POP_CAP);
  delete data.civ; delete data.econ;
  const g3 = SB.Save.revive(data);
  check("a save from before towns works out its era", SB.Civ.era(g3) === 3 && g3.econ && g3.econ.price.food > 0);
  const bad = SB.Save.revive(Object.assign({}, data, { civ: { era: 99, laws: [null, 5], districts: "x", roads: "zz,!!" }, econ: { price: { food: -1 }, cpi: "no" } }));
  check("broken civ data is ignored", bad && SB.Civ.era(bad) >= 0 && SB.Civ.era(bad) <= 3 && bad.econ.price.food > 0 && Array.isArray(bad.civ.laws));
  run(SB, bad, 3);
}

console.log("10. a big city still steps quickly");
{
  const { SB, game } = city(62, 64);
  runFed(SB, game, 20);
  // time the town and city code on its own (the rest of the step is the smols themselves)
  let civMs = 0;
  [[SB.Civ, "tick"], [SB.Economy, "tick"]].forEach(([M, n]) => { const f = M[n]; M[n] = function () { const t = process.hrtime.bigint(); f.apply(this, arguments); civMs += Number(process.hrtime.bigint() - t) / 1e6; }; });
  const t0 = process.hrtime.bigint(), steps = 30 / SB.TICK;
  for (let i = 0; i < steps; i++) SB.Game.step(game, SB.TICK);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / steps;
  check("64 smols in a city: towns and money cost under 1 ms a step", civMs / steps < 1, (civMs / steps).toFixed(2) + " ms of " + ms.toFixed(2) + " ms, pop " + SB.Game.smols(game).length);
}

console.log(failed ? "\n" + failed + " FAILED" : "\nall passed");
process.exit(failed ? 1 : 0);
