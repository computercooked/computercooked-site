// Founders, family and strangers: the pod opens into a girl and a boy, family can't have kids together,
// and strangers turn up who you can welcome or send away.
// node games/smol-brains/tests/strangers.test.js
"use strict";
const load = require("./_load.js");
const ctx = load();
const SB = ctx.SB;

let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }

const game = SB.Game.newGame(21);
SB.Game.current = game;
game.tutorial.done = true;

console.log("1. the pod opens into two founders");
const pod = game.world.items.find(o => o.kind === "egg" && o.data.pod);
check("there's a crashed pod, not a plain egg", !!pod && pod.data.twins && !!pod.data.genome2);
const a = SB.Game.hatch(game, pod), b = pod.data.twin;
check("a girl and a boy climb out", a && b && a.sex === "f" && b.sex === "m", a.sex + " + " + (b && b.sex));
check("the founders aren't related", !SB.Game.related(game, a, b));

console.log("2. family can't have kids together");
[a, b].forEach(c => { c.age = SB.STAGES[3].from + 10; c.stage = 3; });
const k1 = SB.Game.spawnSmol(game, { parents: [a.id, b.id], gen: 2, age: SB.STAGES[3].from + 10, sex: "f" });
const k2 = SB.Game.spawnSmol(game, { parents: [a.id, b.id], gen: 2, age: SB.STAGES[3].from + 10, sex: "m" });
check("brother and sister are related", SB.Game.related(game, k1, k2));
check("a kid and a parent are related", SB.Game.related(game, k1, b));
let kin = 0;
SB.bus.on("kin", () => { kin++; });
const eggs0 = game.world.items.filter(o => o.kind === "egg").length;
[k1, k2].forEach(c => { c.stage = 3; c.chem.love = 0.9; c.eggCooldown = 0; });
SB.Creature._tryBreed ? SB.Creature._tryBreed(k1, k2, game, 0.9) : null;
const eggs1 = game.world.items.filter(o => o.kind === "egg").length;
check("siblings in love lay no egg", eggs1 === eggs0 && (kin > 0 || !SB.Creature._tryBreed), kin + " kin events");
check("but the founders can still have kids", SB.Strangers.breedablePairs(game) >= 1, SB.Strangers.breedablePairs(game) + " pairs");

console.log("3. a stranger walks up and waits");
const s = SB.Strangers.arrive(game, { tier: 1 });
check("a stranger arrives, waiting", s && s.stranger && s.stranger.state === "waiting");
check("the stranger isn't family", s && !SB.Game.related(game, s, a) && !SB.Game.related(game, s, k1));
for (let t = 0; t < 30 / 0.1; t++) { game.time += 0.1; SB.Creature.tick(s, 0.1, game); }
const home = SB.Society.home(game, 0);
check("they walk up to the village", SB.dist(s.x, s.z, home.x, home.z) < 14, SB.dist(s.x, s.z, home.x, home.z).toFixed(1) + " from home");

console.log("4. welcome them");
SB.Strangers.decide(game, s, true);
check("joined: no longer a stranger", !s.stranger && s.alive && game.achievements.stranger);

console.log("5. send one away");
const s2 = SB.Strangers.arrive(game, { tier: 0 });
SB.Strangers.decide(game, s2, false);
for (let t = 0; t < 80 / 0.5; t++) { game.time += 0.5; SB.Creature.tick(s2, 0.5, game); SB.Strangers.tick(game, 0.5); }
check("they leave and disappear", s2.gone && !s2.alive);
check("leaving isn't a death", !Object.values(game.family).some(f => f.id === s2.id && f.cause));

console.log("6. strangers keep coming on their own");
game.strangerT = 5;
let arrived = 0;
SB.bus.on("stranger", () => { arrived++; });
for (let t = 0; t < 10; t++) SB.Strangers.tick(game, 1);
check("the timer brings one", arrived === 1, arrived);
const p = SB.Strangers.pending(game);
game.time += 200;
SB.Strangers.tick(game, 1);
check("ignored too long, they decide for themselves", p && (!p.stranger || p.stranger.state === "leaving"));

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
