// The first hour: echoes you can see (+🤲 pips, "what its kids will inherit"), hands-y parents having
// hands-y kids, the hatch reveal's reasons, learning chips that come from the real change in the net,
// wishes the hand can grant, and a livelier hand (grab reactions, shaking fruit out of trees).
// node games/smol-brains/tests/firsthour.test.js
"use strict";
const load = require("./_load.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
function run(SB, game, secs) { for (let t = 0; t < secs / SB.TICK; t++) SB.Game.step(game, SB.TICK); }

function tribe(seed, tier, n) {
  const SB = load().SB;
  const game = SB.Game.newGame(seed); SB.Game.current = game; game.tutorial.done = true; game.time = 1500; game.podT = 1e9;
  if (game.dir) game.dir.nextT = 1e9;
  const cs = SB.Debug.spawnTier(tier, n);
  const h = SB.Society.home(game, 0);
  cs.forEach((c, i) => { c.asleep = false; c.x = h.x + (i % 4) * 1.5 - 2; c.z = h.z + Math.floor(i / 4) * 1.5 - 1; c.chem.hunger = 0.1; c.age = Math.max(c.age, 600); });
  return { SB, game, cs, h };
}

console.log("1. the echo table matches what Creature.echo really does");
{
  const { SB, cs } = tribe(3, 1, 1), c = cs[0];
  Object.keys(SB.FirstHour.ECHO).forEach(g => {
    const info = SB.FirstHour.ECHO[g];
    c.habits = {}; c.habits[info.habits[0]] = info.cap / 2;
    const e = SB.Creature.echo(c)[g], p = SB.FirstHour.echoProgress(c, g);
    check(g + ": half the habit is half the echo", Math.abs(e - 0.5) < 1e-6 && Math.abs(p.frac - 0.5) < 1e-6, "echo " + e.toFixed(2) + " · " + p.n + "/" + p.of);
  });
}

console.log("2. carrying things pops +🤲 pips, until the echo is full");
{
  const { SB, game, cs } = tribe(5, 1, 1), c = cs[0];
  c.habits = {}; c._fl = [];
  const st = SB.World.add(game.world, game, "stick", c.x + 0.3, c.z, {});
  SB.Creature.carry(c, st, game, true);
  check("a carry gives a hands pip", c._fl.some(f => f.t === "+🤲"), JSON.stringify(c._fl.map(f => f.t)));
  c.habits.hands = 10; c._fl = []; c._pip = {};
  SB.Creature.habit(c, "hands", 0.4);
  check("no pip once the echo is maxed", !c._fl.length);
  c.habits = {}; c._fl = [];
  for (let i = 0; i < 25; i++) SB.Creature.habit(c, "walk", 0.5);
  check("walking pops a 🦶 pip every so often", c._fl.some(f => f.t === "+🦶"));
  c.habits = {};
  const gift = SB.World.add(game.world, game, "stone", c.x + 0.3, c.z, {});
  SB.bus.emit("handDrop", { ref: gift });
  SB.Creature.carry(c, gift, game, true);
  check("a thing the hand gave counts for more", c.habits.hands > 0.8, c.habits.hands);
  c.habits = { hands: 0.35 };
  const p = SB.FirstHour.echoProgress(c, "arms");
  check("progress counts things carried", p.n === 1 && p.of === 18, p.n + "/" + p.of);
}

console.log("3. hands-y parents have hands-y kids");
{
  const { SB, game, cs } = tribe(7, 1, 2), [a, b] = cs;
  a.sex = "f"; b.sex = "m";
  function avgArms(hands) {
    let s = 0;
    a.habits = { hands: hands }; b.habits = { hands: hands };
    const ea = SB.Creature.echo(a), eb = SB.Creature.echo(b), echo = {};
    for (const k in ea) echo[k] = (ea[k] + eb[k]) / 2;
    for (let i = 0; i < 60; i++) s += SB.Genome.cross(a.genome, b.genome, game.rng, echo, null).genes.arms;
    return s / 60;
  }
  a.genome.genes.arms = b.genome.genes.arms = 0.2;
  const idle = avgArms(0), busy = avgArms(6.3);
  check("lots of carrying lifts the kids' hands a lot", busy - idle > 0.25, "idle " + idle.toFixed(2) + " · busy " + busy.toFixed(2));
  check("18 carries each is most of the way to tool-user hands (0.5)", busy > 0.44, busy.toFixed(2));
}

console.log("4. an egg knows what it leans toward, and why");
{
  const { SB, game, cs } = tribe(9, 1, 2), [a, b] = cs;
  a.sex = "f"; b.sex = "m";
  a.genome.genes.arms = b.genome.genes.arms = 0.15;
  a.habits = { hands: 6 }; b.habits = {};
  const egg = SB.Game.layEgg(game, a, b, a.x, a.z);
  const why = egg.data.why || [], hw = why.find(w => w.g === "arms");
  check("the egg leans toward hands", egg.data.lean === "arms", egg.data.lean);
  check("the reason names mum's carrying", hw && hw.d > 0 && /mum carried a lot/.test(hw.r), hw && SB.FirstHour.reasonText(hw));
  check("reason text reads like the card", hw && /^🤲 hands \+0\.\d\d \(mum carried a lot\)$/.test(SB.FirstHour.reasonText(hw)), hw && SB.FirstHour.reasonText(hw));
  check("a mutation reads as one", SB.FirstHour.reasonText({ g: "horns", d: 0.12, r: "mutation" }) === "✨ mutation: horns!", SB.FirstHour.reasonText({ g: "horns", d: 0.12, r: "mutation" }));
  check("it remembers the parents' progress to the next tier", typeof egg.data.pTier === "number" && egg.data.pTier >= 0 && egg.data.pTier <= 1);
  const hatched = []; SB.bus.on("hatch", d => hatched.push(d));
  const kid = SB.Game.hatch(game, egg);
  check("the hatch event carries the reasons", hatched.length === 1 && hatched[0].obj.data.why === why && kid.alive);
}

console.log("5. learning chips come from the change the lesson made");
{
  const { SB, game, cs } = tribe(11, 1, 1), c = cs[0];
  const seen = []; SB.bus.on("learned", d => seen.push(d));
  function lastEat() {
    const x = new Float32Array(c.brain.nIn); x[SB.IN.NOUN0 + SB.N.food] = 1;
    c.action = null; c.plan = null; c.lastDone = { x: x, a: SB.V.eat, t: game.time };
    return x;
  }
  let x = lastEat();
  const before = SB.Brain.qOf(c.brain, x, SB.V.eat);
  SB.Creature.tickle(c, game);
  const after = SB.Brain.qOf(c.brain, x, SB.V.eat), d = seen[seen.length - 1];
  check("a tickle after eating raises 'eat food' in the net", after > before && d && d.verb === SB.V.eat && d.noun === SB.N.food && d.delta > 0, before.toFixed(3) + " → " + after.toFixed(3));
  check("and the reported change is the real one", d && Math.abs(d.delta - (after - before)) < 1e-6);
  check("the chip says so", c._fl.some(f => f.t === "🍎 eat food ↑"), JSON.stringify(c._fl.map(f => f.t)));
  x = lastEat(); c._fl = [];
  SB.Creature.tap(c, game);
  const d2 = seen[seen.length - 1];
  check("a tap lowers it, and the chip points down", d2.delta < 0 && c._fl.some(f => f.t === "🍎 eat food ↓"), d2.delta.toFixed(3));
}

console.log("6. wishes: the hand grants them, for sparks and a memory");
{
  const { SB, game, cs } = tribe(13, 1, 3), [a, b] = cs;
  const fh = SB.FirstHour.state(game); fh.wishT = 1e9;
  const sp0 = game.sparks || 0, got = []; SB.bus.on("wishGranted", d => got.push(d));
  SB.FirstHour.makeWish(game, a, "food");
  const ap = SB.World.add(game.world, game, "apple", a.x + 0.5, a.z, {});
  run(SB, game, 1);
  check("food lying about doesn't grant it: the hand must", got.length === 0 && fh.wishes.length === 1);
  SB.bus.emit("handDrop", { ref: ap });
  run(SB, game, 0.5);
  check("food dropped by the hand grants the wish", got.length === 1 && got[0].c === a && !fh.wishes.length);
  check("it pays a spark", (game.sparks || 0) >= sp0 + 1, sp0 + " → " + game.sparks);
  check("it goes in the diary", (a.diary || []).some(e => /sky one/.test(e[2])));
  if (SB.Mind) check("and in its memory", a.mind && a.mind.ep.some(e => /sky one/.test(e.w)));
  SB.FirstHour.makeWish(game, a, "friend");
  b.x = a.x + 1; b.z = a.z;
  SB.bus.emit("handDrop", { ref: b });
  run(SB, game, 0.5);
  check("carrying a friend over grants a friend wish", got.length === 2 && got[1].w.kind === "friend" && got[1].sparks === 2);
  SB.FirstHour.makeWish(game, b, "toy");
  run(SB, game, SB.FirstHour.WISH_LIFE + 2);
  check("an ungranted wish fades", !fh.wishes.length && got.length === 2);
}

console.log("7. wishes come by themselves to little smols");
{
  const { SB, game } = tribe(17, 1, 4);
  const w = []; SB.bus.on("wish", d => w.push(d));
  run(SB, game, 200);
  check("a wish or two in a few minutes", w.length >= 1 && w.length <= 6, w.map(d => d.w.kind).join(","));
  check("never more than two at once", SB.FirstHour.state(game).wishes.length <= 2);
}

console.log("8. the hand: shaking trees, grab reactions");
{
  const { SB, game, cs } = tribe(19, 1, 2), c = cs[0];
  const tree = game.world.nodes.find(n => n.kind === "oak" && n.state === "ok");
  check("there's an apple tree to shake", !!tree && SB.FirstHour.canShake(tree));
  const o = SB.FirstHour.handShake(game, tree);
  check("shaking it drops fruit for free", o && o.noun === "food", o && o.kind);
  if (o) SB.World.remove(game.world, o);
  check("then it needs a rest", SB.FirstHour.handShake(game, tree) === null);
  game.time += SB.FirstHour.SHAKE_CD + 1;
  const o2 = SB.FirstHour.handShake(game, tree);
  check("and drops again after the cooldown", o2 && o2.noun === "food");
  check("a rock isn't a tree", !SB.FirstHour.canShake(game.world.nodes.find(n => n.kind === "rock")));
  SB.bus.emit("handGrab", { ref: c });
  check("a grabbed smol reacts", c.speech && (c.anim.held === "giggle" || c.anim.held === "squeal"), c.anim.held + " " + (c.speech && c.speech.text));
  SB.bus.emit("handDrop", { ref: c });
  check("and calms down when let go", c.anim.held == null);
}

console.log("9. goals: the next tier's need as a concrete job");
{
  const { SB, cs } = tribe(23, 1, 2);
  cs[0].habits = { hands: 2.8 };
  const want = SB.FirstHour.wanted(cs[0]);
  check("critters need hands next", want[0] === "arms", want.join(","));
  const p = SB.FirstHour.echoProgress(cs[0], "arms");
  check("carried 8 of 18 things", p.n === 8 && p.of === 18, p.n + "/" + p.of);
}

console.log(failed ? "\n" + failed + " FAILED" : "\nall ok");
process.exit(failed ? 1 : 0);
