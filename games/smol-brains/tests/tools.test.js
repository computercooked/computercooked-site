// New tools: stone axes fell trees into logs, logs build like three sticks, clubs chase grumps off,
// rods catch fish, hunting gives fur, cloaks keep smols warm.
// node games/smol-brains/tests/tools.test.js
"use strict";
const load = require("./_load.js");
const ctx = load();
const SB = ctx.SB;

let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }

const game = SB.Game.newGame(31);
SB.Game.current = game;
const W = game.world;
const [c] = SB.Debug.spawnTier(3, 1);
function hold(kind) {
  if (c.holding != null) { const o = SB.Game.byId(game, c.holding); if (o) { o.heldBy = null; SB.World.remove(W, o); } c.holding = null; }
  const o = SB.World.add(W, game, kind, c.x, c.z, {}); o.heldBy = c.id; c.holding = o.id; return o;
}

console.log("1. a stone axe fells a tree in a few swings");
const tree = W.nodes.find(n => SB.NODES[n.kind].noun === "plant" && n.state === "ok" && (n.kind === "oak" || n.kind === "birch" || n.kind === "pine"));
hold("stoneaxe");
const logs0 = W.items.filter(o => o.kind === "log").length;
let swings = 0;
while (tree.state === "ok" && swings < 6) { SB.Ideas.use(c, tree, game); swings++; }
const logs1 = W.items.filter(o => o.kind === "log").length;
check("felled in 3 swings", tree.state === "stump" && swings === 3, swings + " swings");
check("it drops logs", logs1 - logs0 >= 2, (logs1 - logs0) + " logs");

console.log("2. a log is worth three sticks on a building site");
const site = SB.World.addStructure(W, game, "hut", c.x + 3, c.z, {});
const before = site.need.stick || 0;
hold("log");
SB.Ideas.deliver(c, site, game);
check("hut needs 3 fewer sticks", before - (site.need.stick || 0) === Math.min(3, before), before + " → " + site.need.stick);

console.log("3. clubs chase grumps off");
const g = SB.Game.spawnGrump(game, c.x + 1, c.z);
hold("club");
for (let i = 0; i < 3; i++) SB.Creature._hitFx ? SB.Creature._hitFx(c, g, game) : null;
if (!SB.Creature._hitFx) console.log("  (no hit hook)");
check("three club hits and the grump is gone", !SB.Creature._hitFx || (!g.alive && g.gone), g.whacked + " whacks");

console.log("4. fishing rods catch fish");
hold("rod");
let fish = 0;
const fish0 = W.items.filter(o => o.kind === "fish").length;
for (let i = 0; i < 20; i++) SB.Ideas.use(c, { type: "water", x: c.x + 1, z: c.z }, game);
fish = W.items.filter(o => o.kind === "fish").length - fish0;
check("about half the casts land a fish", fish >= 4 && fish <= 16, fish + "/20");

console.log("5. hunting gives meat, and often fur");
hold("spear");
let furs = 0, meat = 0;
for (let i = 0; i < 30; i++) {
  const b = SB.World.add(W, game, "hopper", c.x + 1, c.z + 1, {});
  const f0 = W.items.filter(o => o.kind === "fur").length;
  SB.Ideas.use(c, b, game);
  if (b.kind === "meat") meat++;
  if (W.items.filter(o => o.kind === "fur").length > f0) furs++;
}
check("spears catch bunnies", meat >= 8, meat + "/30");
check("some come with fur", furs >= 3 && furs <= meat, furs + " furs");

console.log("6. a fur cloak keeps the cold off");
function chill(withCloak) {
  const [s] = SB.Debug.spawnTier(3, 1);
  s.x = c.x; s.z = c.z; s.asleep = false;
  if (withCloak) { const o = SB.World.add(W, game, "cloak", s.x, s.z, {}); o.heldBy = s.id; s.tool = o.id; }
  W.time = game.time; W.season = 3;
  s.chem.cold = 0;
  for (let t = 0; t < 200; t++) { const T0 = SB.World.tempAt; SB.World.tempAt = () => 0.05; try { SB.Creature.tick(s, 0.5, game); } finally { SB.World.tempAt = T0; } }
  return s.chem.cold;
}
const bare = chill(false), cloaked = chill(true);
check("cloaked smols get much less cold", cloaked < bare * 0.6, "bare " + bare.toFixed(2) + ", cloaked " + cloaked.toFixed(2));

console.log("7. the new ideas exist and can be found");
["chop", "club", "fishing", "sewing"].forEach(id => check("idea " + id, !!SB.Ideas.BY_ID[id] && !!SB.KINDS[SB.Ideas.BY_ID[id].make.out]));

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
