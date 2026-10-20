// Places to find: sites come from the seed, sit on dry land, get found when a smol walks up, each kind pays off,
// grump camps hold captives you can free, visions let you pick an idea, and found sites stay found after a save.
// node games/smol-brains/tests/sites.test.js
"use strict";
const load = require("./_load.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
function run(SB, game, secs) { for (let t = 0; t < secs / SB.TICK; t++) SB.Game.step(game, SB.TICK); }

console.log("1. sites come from the seed");
{
  const SB = load().SB;
  const a = SB.Game.newGame(11), b = SB.Game.newGame(11);
  check("there are places to find", a.sites.length >= 10, a.sites.length + " sites");
  check("same seed, same places", JSON.stringify(a.sites.map(s => [s.kind, Math.round(s.x), Math.round(s.z)])) === JSON.stringify(b.sites.map(s => [s.kind, Math.round(s.x), Math.round(s.z)])));
  check("all on dry land", a.sites.every(s => SB.World.walkable(a.world, s.x, s.z, false) && SB.World.depthAt(a.world, s.x, s.z) <= 0.05));
  const kinds = new Set(a.sites.map(s => s.kind));
  check("every kind is there", ["wreck", "ruin", "cave", "nest", "camp"].every(k => kinds.has(k)), [...kinds].join(","));
}

console.log("2. walking up to each kind finds it, and it pays off");
{
  const SB = load().SB;
  const game = SB.Game.newGame(12); SB.Game.current = game; game.tutorial.done = true; game.time = 1200;
  const [c] = SB.Debug.spawnTier(3, 1); c.asleep = false;
  const found = [];
  SB.bus.on("siteFound", d => found.push(d));
  const take = kind => game.sites.find(s => s.kind === kind && !s.found);
  const wreck = take("wreck"), items0 = game.world.items.length, sp0 = game.sparks;
  c.x = wreck.x + 2; c.z = wreck.z; run(SB, game, 1.5);
  check("a wreck: found, with loot and a log", wreck.found && game.world.items.length > items0 && found[0] && /ark log/.test(found[0].log), found[0] && found[0].log);
  const cave = take("cave"), nodes0 = game.world.nodes.length;
  c.x = cave.x + 2; c.z = cave.z; run(SB, game, 1.5);
  check("a crystal cave: crystals appear", cave.found && game.world.nodes.length === nodes0 + 4);
  const nest = take("nest"), eggs0 = game.world.items.filter(o => o.kind === "egg").length;
  c.x = nest.x + 2; c.z = nest.z; run(SB, game, 1.5);
  check("a giant nest: an egg", nest.found && game.world.items.filter(o => o.kind === "egg").length === eggs0 + 1);
  const ruin = take("ruin"), ideas0 = Object.keys(game.culture.found).length, sp1 = game.sparks;
  c.x = ruin.x + 2; c.z = ruin.z; run(SB, game, 1.5);
  check("old ruins: an idea, or sparks", ruin.found && (Object.keys(game.culture.found).length > ideas0 || game.sparks > sp1));
}

console.log("3. a grump camp: a rescue frees captives who join the tribe");
{
  const SB = load().SB;
  const game = SB.Game.newGame(13); SB.Game.current = game; game.tutorial.done = true; game.time = 1200; game.sparks = 100;
  for (let i = 0; i < 6; i++) { const [s] = SB.Debug.spawnTier(3, 1); s.asleep = false; }
  SB.Director.state(game).nextT = 1e9; // no other stories in the way
  const camp = game.sites.find(s => s.kind === "camp");
  const scout = SB.Game.smols(game)[0];
  scout.x = camp.x + 3; scout.z = camp.z;
  let inc = null; SB.bus.on("incident", d => { if (d.inc.id === "camp") inc = d.inc; });
  run(SB, game, 3);
  check("finding it brings up the camp card", camp.found && inc && inc.choices.length === 3);
  const pop0 = SB.Game.smols(game).length;
  SB.Director.choose(game, inc, "burn");
  run(SB, game, 2);
  check("burning it frees 2-3 captives", camp.done && SB.Game.smols(game).length >= pop0 + 2, (SB.Game.smols(game).length - pop0) + " freed");
  const freed = SB.Game.smols(game).slice(pop0);
  check("…who like their rescuers", freed.every(f => SB.Social.opinion(game, f, scout) > 20));
}

console.log("4. visions: pick one of three ideas");
{
  const SB = load().SB;
  const game = SB.Game.newGame(14); SB.Game.current = game; game.tutorial.done = true; game.time = 1200;
  for (let i = 0; i < 4; i++) { const [s] = SB.Debug.spawnTier(3, 1); s.asleep = false; s.ideas = {}; }
  const inc = SB.Director.fire(game, "vision");
  check("a dream with 2-3 ideas", inc && inc.choices.length >= 2, inc && inc.choices.map(c => c.key).join(","));
  const key = inc.choices[1].key;
  SB.Director.choose(game, inc, key);
  check("the chosen idea comes true", !!game.culture.found[key], key);
  check("…and only that one", inc.choices.filter(c => c.key !== key).every(c => !game.culture.found[c.key]));
}

console.log("5. found places stay found");
{
  const SB = load().SB;
  const game = SB.Game.newGame(15); SB.Game.current = game; game.tutorial.done = true;
  const [c] = SB.Debug.spawnTier(3, 1);
  const w = game.sites.find(s => s.kind === "wreck"); SB.Sites.find(game, w, c);
  const g2 = SB.Save.revive(JSON.parse(JSON.stringify(SB.Save.snapshot(game))));
  check("the wreck is still found, the log still read", g2.sites[w.id].found && g2.sites[w.id].log === 0 && g2.logsFound === 1);
  check("the others are still waiting", g2.sites.filter(s => s.found).length === 1);
}

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
