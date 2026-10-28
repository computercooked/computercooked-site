// The storyteller: every event card can be dealt, every choice plays out to an end without errors,
// raids actually bring grumps, choices cost sparks, the pacing leaves gaps, and it all survives a save.
// node games/smol-brains/tests/director.test.js
"use strict";
const load = require("./_load.js"), seeded = load.seeded;

let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }

function village(seed) {
  const SB = load().SB;
  const game = SB.Game.newGame(seed); SB.Game.current = game; game.tutorial.done = true;
  const pod = game.world.items.find(o => o.data && o.data.pod); if (pod) SB.World.remove(game.world, pod);
  const hm = SB.Society.home(game, 0);
  ["campfire", "hut", "farm"].forEach((k, i) => { try { SB.Debug.build(k, hm.x + Math.cos(i * 2) * 5, hm.z + Math.sin(i * 2) * 5); } catch (e) {} });
  for (let i = 0; i < 12; i++) { const [s] = SB.Debug.spawnTier(3, 1); s.asleep = false; }
  game.time = 1200; game.sparks = 200;
  return { SB, game };
}
function run(SB, game, secs) { for (let t = 0; t < secs / SB.TICK; t++) SB.Game.step(game, SB.TICK); }

console.log("1. every card, every choice, plays out");
const ids = ["raid", "storm", "sick", "star", "feud", "lost", "feast"];
for (const id of ids) {
  const probe = village(7);
  const def = probe.SB.Director[id];
  const n = id === "feast" ? 2 : id === "star" ? 2 : 3;
  for (let k = 0; k < n; k++) {
    const { SB, game } = village(7 + k);
    const D = SB.Director;
    if (id === "feud") { const cs = SB.Game.smols(game); for (let i = 0; i < 4; i++) { SB.Social.remember(game, cs[0], cs[1], "x" + i, -30, "stole my berries", 9999); SB.Social.remember(game, cs[1], cs[0], "y" + i, -30, "called me a grump", 9999); } }
    if (id === "lost") { const kid = SB.Debug.spawnTier(2, 1)[0]; kid.age = 80; kid.stage = 1; kid.asleep = false; }
    if (id === "feast") { game.world.season = 2; for (let i = 0; i < 40; i++) SB.World.add(game.world, game, "apple", SB.Society.home(game, 0).x + i % 6, SB.Society.home(game, 0).z + 3, {}); }
    let ended = null, err = null;
    const inc = D.fire(game, id);
    SB.bus.on("incidentEnd", d => { if (d.inc === inc) ended = d; });
    game.dir.nextT = 1e9; // just this one story
    if (!inc) { check(id + ": dealt", false, "start() returned nothing"); continue; }
    const key = inc.choices[k].key;
    check(id + " → " + key + ": choice taken", D.choose(game, inc, key));
    try { run(SB, game, 420); } catch (e) { err = e; }
    check(id + " → " + key + ": ends cleanly", !err && !!ended && game.dir.active !== inc, err ? err.message : ended ? ended.text : "still " + (game.dir.active && game.dir.active.phase));
  }
}

console.log("2. raids bring grumps, and the free choice is taken if nobody answers");
seeded(3, () => {
  const { SB, game } = village(3);
  const inc = SB.Director.fire(game, "raid");
  run(SB, game, 50);
  check("nobody answered: the free choice was taken", inc.choice && !inc.choices.find(c => c.key === inc.choice).cost, inc.choice);
  run(SB, game, 60);
  const raiders = SB.Game.grumps(game).filter(g => g.raider);
  check("raiders turn up", raiders.length >= 2 || game.dir.history.some(h => h[1] === "raid"), raiders.length + " raiders");
  run(SB, game, 400);
  // (another card may have been dealt since: it is the raid that has to be over)
  check("…and the raid ends", !(game.dir.active && game.dir.active.id === "raid") && game.dir.history.some(h => h[1] === "raid"), "raid " + inc.phase + ", active " + (game.dir.active ? game.dir.active.id + "/" + game.dir.active.phase : "none") + ", history " + JSON.stringify(game.dir.history));
});

console.log("3. choices cost sparks");
{
  const { SB, game } = village(4);
  game.sparks = 3;
  const inc = SB.Director.fire(game, "storm");
  check("can't afford: refused", !SB.Director.choose(game, inc, "calm") && inc.phase === "ask");
  game.sparks = 50;
  const cost = inc.choices.find(c => c.key === "calm").cost;
  check("can afford: taken and paid", SB.Director.choose(game, inc, "calm") && game.sparks === 50 - cost && cost >= 8, game.sparks + " (cost " + cost + ")");
}

console.log("4. pacing: gaps between stories, a breather after trouble");
{
  const { SB, game } = village(5);
  const fired = [];
  SB.bus.on("incident", d => { fired.push(game.time); setTimeout(() => {}, 0); });
  SB.bus.on("incident", d => SB.Director.choose(game, d.inc, SB.Director.freeChoice(d.inc)));
  game.dir = null; game.time = 0; SB.Director.state(game);
  run(SB, game, 60 * 60);
  const gaps = fired.slice(1).map((t, i) => t - fired[i]);
  check("first story after a few minutes", fired.length && fired[0] >= 400, fired[0] && Math.round(fired[0]) + " s");
  check("several stories in an hour, not a flood", fired.length >= 4 && fired.length <= 14, fired.length + " cards");
  check("never two cards within two minutes", gaps.every(g => g >= 120), gaps.map(Math.round).join(","));
}

console.log("5. it saves");
{
  const { SB, game } = village(6);
  SB.Director.fire(game, "star"); SB.Director.choose(game, game.dir.active, "later");
  const snap = JSON.parse(JSON.stringify(SB.Save.snapshot(game)));
  const g2 = SB.Save.revive(snap);
  check("the storyteller's memory and map marks survive", g2.dir && g2.dir.count === game.dir.count && g2.dir.marks.length === 1 && Math.abs(g2.dir.nextT - game.dir.nextT) < 0.01);
  check("crystals from the fallen star survive", g2.world.nodes.filter(n => n.added && n.kind === "crystals").length === 4);
}

console.log("6. palisades hold grumps back");
{
  const { SB, game } = village(8);
  SB.Director.state(game).nextT = 1e9;
  const hm = SB.Society.home(game, 0);
  let wx = hm.x + 10, wz = hm.z;
  for (let k = 0; k < 40 && !SB.World.walkable(game.world, wx - 4, wz, false); k++) wx += 1;
  SB.Debug.build("wall", wx, wz);
  const g = SB.Game.spawnGrump ? SB.Game.spawnGrump(game, wx + 4, wz) : null;
  if (!g) check("a grump to test with", false);
  else {
    g.x = wx + 4; g.z = wz; g.raider = null;
    let closest = 9;
    for (let t = 0; t < 8 / SB.TICK; t++) { SB.Creature.walkToward(g, wx - 4, wz, SB.TICK, 2, game); closest = Math.min(closest, SB.dist(g.x, g.z, wx, wz)); }
    check("a grump walking at a palisade doesn't go through it", closest > 1.6, "closest " + closest.toFixed(2));
  }
}

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
