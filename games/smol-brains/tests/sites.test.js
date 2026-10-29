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
  check("every kind is there", ["ruin", "cave", "nest", "camp"].every(k => kinds.has(k)), [...kinds].join(","));
  check("old buried wrecks are gone: pods come down live now", a.sites.filter(s => s.kind === "wreck").every(s => s.gone));
}

console.log("2. walking up to each kind finds it, and it pays off");
{
  const SB = load().SB;
  const game = SB.Game.newGame(12); SB.Game.current = game; game.tutorial.done = true; game.time = 1200;
  const [c] = SB.Debug.spawnTier(3, 1); c.asleep = false;
  const found = [];
  SB.bus.on("siteFound", d => found.push(d));
  const take = kind => game.sites.find(s => s.kind === kind && !s.found);
  const wreck = game.sites.find(s => s.kind === "wreck");
  c.x = wreck.x + 2; c.z = wreck.z; run(SB, game, 1.5);
  check("walking past an old wreck spot finds nothing", !wreck.found && !found.length);
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
  const w = game.sites.find(s => s.kind === "ruin"); SB.Sites.find(game, w, c);
  const pod = SB.Sites.crash(game), pod2 = SB.Sites.crash(game); SB.Sites.openPod(game, pod2, c, []);
  const g2 = SB.Save.revive(JSON.parse(JSON.stringify(SB.Save.snapshot(game))));
  check("the ruin is still found", g2.sites[w.id].found);
  check("the others are still waiting", g2.sites.filter(s => s.found && s.kind !== "pod").length === 1);
  const p2 = g2.sites[pod.id];
  check("a downed pod is still there, survivors inside", p2 && p2.kind === "pod" && !p2.done && Math.abs(p2.x - pod.x) < 0.2 && p2.surv === pod.surv);
  check("an opened pod stays opened, its log read", g2.sites[pod2.id].done && g2.sites[pod2.id].log === 0 && g2.logsFound === 1 && g2.podsDown === 2);
}

console.log("6. escape pods crash in, and you can rescue who's inside");
{
  const SB = load().SB;
  const game = SB.Game.newGame(16); SB.Game.current = game; game.tutorial.done = true; game.time = 1200;
  for (let i = 0; i < 6; i++) { const [s] = SB.Debug.spawnTier(3, 1); s.asleep = false; s.stage = 3; s.age = SB.STAGES[3].from + 10; }
  SB.Director.state(game).nextT = 1e9;
  const crashes = [], opened = []; let inc = null;
  SB.bus.on("podCrash", d => crashes.push(d.site)); SB.bus.on("podOpened", d => opened.push(d));
  SB.bus.on("incident", d => { if (d.inc.id === "pod") inc = d.inc; });
  game.podT = game.time; run(SB, game, 3);
  const pod = crashes[0];
  check("a pod crashes on its own schedule", !!pod && pod.kind === "pod" && !pod.done && SB.World.isSeen(game.world, pod.x, pod.z));
  check("it's on dry, reachable land 24-80 steps out", pod && SB.World.walkable(game.world, pod.x, pod.z, false) && (d => d > 20 && d < 90)(SB.dist(pod.x, pod.z, SB.Society.home(game, 0).x, SB.Society.home(game, 0).z)));
  check("not while it's still coming down (K-0027)", !inc);
  run(SB, game, 45);
  check("…then the storyteller asks about a rescue", inc && inc.choices.map(c => c.key).join() === "rescue,magic,later");
  const pop0 = SB.Game.smols(game).length;
  SB.Director.choose(game, inc, "rescue");
  check("a rescue party of up to 3 sets out", inc.party.length >= 1 && inc.party.length <= 3);
  let t = 0; while (!pod.done && t < 260) { run(SB, game, 2); t += 2; }
  check("they reach it and open it", pod.done && opened[0] && opened[0].rescuers.length > 0, Math.round(t) + "s");
  check("the first pods always hold survivors, who join the tribe", opened[0] && opened[0].survivors.length === 2 && SB.Game.smols(game).length >= pop0 + 2 && opened[0].survivors.every(c => !c.stranger), opened[0] && opened[0].survivors.length + " survivors, pop " + pop0 + "→" + SB.Game.smols(game).length);
  check("survivors aren't related to anyone", opened[0].survivors.every(a => SB.Game.smols(game).every(b => a === b || !SB.Game.related(game, a, b))));
  check("the pod carried the first ark log", /ark log, day 1/.test(opened[0].log || ""));
  // a pod nobody goes to: the survivors climb out on their own and come looking, as strangers
  const p2 = SB.Sites.crash(game); p2.surv = 1; game.podT = 1e9;
  SB.Game.smols(game).forEach(c => { if (SB.dist(c.x, c.z, p2.x, p2.z) < 10) { c.x = SB.Society.home(game, 0).x; c.z = SB.Society.home(game, 0).z; } });
  game.time += 800; run(SB, game, 2);
  const last = opened[opened.length - 1];
  check("left alone, survivors climb out and come looking as strangers", p2.done && last.self && last.survivors.every(c => c.stranger && c.stranger.state === "waiting"));
  // the magic answer lifts them straight home
  const p3 = SB.Sites.crash(game); p3.surv = 2; game.sparks = 100; inc = null; p3.asked = false;
  SB.Director.state(game).active = null; SB.Director.fire(game, "pod");
  SB.Director.choose(game, inc, "magic");
  const hm = SB.Society.home(game, 0), lifted = opened[opened.length - 1].survivors;
  check("✨ lift them home: they arrive at the village", p3.done && lifted.length === 2 && lifted.every(c => SB.dist(c.x, c.z, hm.x, hm.z) < 5 && !c.stranger));
}

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
