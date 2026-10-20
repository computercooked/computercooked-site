// The god economy: spamming miracles isn't the best way to play.
// node games/smol-brains/tests/economy.test.js
"use strict";
const load = require("./_load.js");
const ctx = load();
const SB = ctx.SB;

let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }

const game = SB.Game.newGame(11);
SB.Game.current = game;
game.speed = 1;
for (let i = 0; i < 4; i++) SB.Debug.spawnTier(3, 1);

console.log("1. miracles get dearer when you lean on them, then cool off");
const c0 = SB.Game.miracleCost(game, 5);
for (let i = 0; i < 5; i++) SB.Game.usedMiracle(game, "bounty");
const c5 = SB.Game.miracleCost(game, 5);
game.godHeat = Math.max(0, game.godHeat - 600 / 60);
const cCool = SB.Game.miracleCost(game, 5);
check("5 bounties in a row: price climbs", c5 >= c0 * 2, c0 + " → " + c5);
check("ten quiet minutes later it's back to normal", cCool === c0, cCool);

console.log("2. fast-forward makes miracles cost double");
game.speed = 16;
const fast = SB.Game.miracleCost(game, 5);
game.speed = 1;
check("at 16× a 5-spark miracle costs 10", fast === 10, fast);

console.log("3. handouts to a fed tribe spoil it");
const smols = SB.Game.smols(game);
smols.forEach(c => { c.chem.hunger = 0.2; });
game.spoil = 0;
let fired = false;
SB.bus.on("spoiled", () => { fired = true; });
for (let i = 0; i < 3; i++) SB.Game.spoilFrom(game, "bounty");
check("three bounties on full bellies → spoiled", game.spoil >= 0.35 && fired, game.spoil.toFixed(2));
smols.forEach(c => { c.chem.hunger = 0.8; });
const before = game.spoil;
SB.Game.spoilFrom(game, "bounty");
check("feeding a hungry tribe barely spoils it", game.spoil - before < 0.05, (game.spoil - before).toFixed(2));

console.log("4. answering a prayer properly pays; a tickle barely does");
game.spoil = 0;
const s = smols[0] || SB.Debug.spawnTier(3, 1)[0];
function pray() { game.prayers = game.prayers || []; game.prayers.push({ id: s.id, need: "hunger", t: game.time, input: new Float32Array(s.brain.x.length) }); }
let how = null;
SB.bus.on("prayerAnswered", d => { how = d.how; });
pray(); SB.Creature.prayerAnswered(s, game, "comfort"); const tickle = SB.Game.prayerPay(game, how);
pray(); SB.Creature.prayerAnswered(s, game, "miracle"); const miracle = SB.Game.prayerPay(game, how);
check("tickle pays 1, the right miracle pays 5", tickle === 1 && miracle === 5, tickle + " / " + miracle);

console.log("5. a blessing amplifies how the parents lived");
const rng = SB.rng(5);
const base = SB.Genome.random(rng, { species: "smol" });
base.genes.limbs = 0.3;
const bless = { limbs: 0.18 };
let lazy = 0, raised = 0;
for (let i = 0; i < 40; i++) {
  const g1 = JSON.parse(JSON.stringify(base)), g2 = JSON.parse(JSON.stringify(base));
  SB.Genome.mutate(g1, SB.rng(100 + i), 0, {}, bless);
  SB.Genome.mutate(g2, SB.rng(100 + i), 0, { limbs: 1 }, bless);
  lazy += g1.genes.limbs - 0.3; raised += g2.genes.limbs - 0.3;
}
check("blessing legs on a family that walks gives far more than on one that doesn't", raised > lazy * 1.8, "lazy +" + (lazy / 40).toFixed(3) + ", walkers +" + (raised / 40).toFixed(3));

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
