// the first day (4.23, "wake up"): the opening is played in Pip's own eyes. Eat, wake the others (knock on the pod),
// gather two sticks, light a fire at the nest, and make it through the night; then dawn, the first memory ember and
// the sky. Left alone Pip muddles through the daytime steps; "skip" goes straight to morning; an island saved in the
// old sky-view opening carries over.
// node games/smol-brains/tests/firstnight.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }

seeded(4230, () => {
  const ctx = load();
  ["possess.js", "firstnight.js"].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8"), ctx, { filename: f }));
  const SB = ctx.SB, P = SB.Possess, FN = SB.FirstNight; P.headless = true;
  function island(seed) {
    const game = SB.Game.newGame(seed); SB.Game.current = game; game.headless = true;
    const run = (s, until) => { for (let t = 0; t < s; t += SB.TICK) { SB.Game.step(game, SB.TICK); if (until && until()) return t; } return s; };
    return { game, run };
  }
  const tod = g => g.time / SB.DAY_LENGTH - Math.floor(g.time / SB.DAY_LENGTH);
  const st = g => FN.state(g);

  const A = island(41), game = A.game, run = A.run;
  const steps = []; SB.bus.on("firstNight", d => { if (SB.Game.current === game) steps.push(d.step); });

  console.log("1. a new island wakes up in Pip");
  check("a fresh island wants it", FN.wants(game));
  const pip = FN.start(game);
  check("Pip is there, starving", pip && pip.name === "Pip" && pip.chem.hunger >= 0.75 && st(game).s === "wake");
  check("nothing else today: no incidents, strangers or second pods", (!game.dir || game.dir.nextT > game.time + 600) && game.strangerT > game.time + 600 && game.podT > game.time + 600);
  check("the pod is still shut, two sleepers inside", !!FN.pod(game) && SB.Game.smols(game).length === 1);
  check("into Pip's eyes", FN.begin(game) && P.active && P.c === pip && FN.inBody(game));
  check("the first day's list is on screen", P.quest() && P.quest().kind === "open" && P.questStep().id === "eat" && P.questList().length === 5);
  check("that possession is the story's, not yours: the first real one stays free", !(game.stats.possessed > 0));
  run(20);
  check("still hungry until you eat", pip.chem.hunger >= 0.7 && st(game).s === "wake");
  check("the morning waits for you", tod(game) <= FN.TOD.wake + 1e-6, (tod(game) * 24).toFixed(1) + " h");
  const b = FN.bush(game);
  check("a bush is marked", !!b && !!P.quest().target);

  console.log("2. eat, then wake the others");
  const o0 = P.options(game, pip, { type: "node", id: b.id });
  check("a hungry little body eats with the plain click", o0.use && /nibble/.test(o0.use.label) && o0.place && /shake|pull/.test(o0.place.label), o0.use && o0.use.label);
  SB.bus.emit("nibble", { c: pip, node: b });
  check("ate: on to the pod", st(game).s === "pod" && P.questStep().id === "pod");
  const pod = FN.pod(game);
  const op = P.options(game, pip, { type: "item", id: pod.id });
  check("the pod can be knocked on from down here", op.use && /knock on the pod/.test(op.use.label) && P.label(op.r) === "the pod", op.use && op.use.label);
  pip.x = pod.x + 1; pip.z = pod.z;
  P.act("use", { type: "item", id: pod.id }); run(0.6); P.act("use", { type: "item", id: pod.id });
  run(2, () => st(game).s === "sticks");
  const others = SB.Game.smols(game).filter(o => o !== pip);
  check("two knocks: the founders climb out", others.length === 2 && st(game).s === "sticks", others.length + " out, " + st(game).s);
  check("hungry, and off to the same bush", others.every(o => o.chem.hunger >= 0.6));
  run(0.2);
  check("midday already", tod(game) >= FN.TOD.sticks0 - 1e-6 && tod(game) < FN.TOD.sticks1, (tod(game) * 24).toFixed(1) + " h");

  console.log("3. two sticks and a fire");
  check("sticks are laid out, and the list asks for two", st(game).stickIds.length >= 2 && P.questStep().id === "sticks");
  st(game).stickIds.forEach(id => { const it = SB.Game.byId(game, id); if (!it || it.gone || st(game).sticks >= 2) return; pip.x = it.x; pip.z = it.z; run(0.2); });
  check("walked over two", st(game).sticks === 2);
  run(0.4);
  check("the list moves on to the fire", P.questStep().id === "fire");
  const nest = game.world.T.nest; pip.x = nest.x + 1; pip.z = nest.z; run(0.4);
  check("at the nest: lit", st(game).lit != null && !!SB.Game.byId(game, st(game).lit));
  run(0.5);
  check("a fire brings the evening on", st(game).s === "dusk" && P.questStep().id === "night", st(game).s);

  console.log("4. dusk, the grump, the light");
  const dusk = run(FN.SUNSET + 2, () => st(game).s === "chase");
  check("dark in about " + FN.SUNSET + " s", dusk <= FN.SUNSET + 1 && game.world.night, dusk.toFixed(1) + " s");
  const g = FN.grump(game);
  check("a grump came out of the trees", g && g.alive && g.scout && SB.dist(g.x, g.z, pip.x, pip.z) > 10);
  check("and it's after you", st(game).s === "chase" && P.scout() === g && !g.scout.hold);
  check("it runs at 90% of your running speed", g.scout.speedK === 0.9);
  const ended = run(40, () => st(game).s === "won" || st(game).done);
  check("you stayed by the fire: the light scares it off", st(game).s === "won" || st(game).done, ended.toFixed(1) + " s");
  check("Pip wasn't touched", pip.alive && pip.chem.health > 0.9, pip.chem.health.toFixed(2));

  console.log("5. dawn: the first ember, and the sky");
  run(5, () => st(game).done);
  check("the night is done, and you're back in the sky", st(game).done && !P.active);
  run(0.3);
  check("it's the morning of day 2", game.world.time / SB.DAY_LENGTH > 1.2 && game.world.time / SB.DAY_LENGTH < 1.3 && !game.world.night, (game.world.time / SB.DAY_LENGTH).toFixed(2));
  check("the first memory ember", st(game).ember === 1);
  check("the steps went in order", steps.join(",") === "wake,pod,sticks,dusk,chase,won,dawn,done", steps.join(","));
  check("the grump goes home", !g.alive || g.goingHome);

  console.log("6. a second island: no fire by dark. three bites and Pip is caught; the others bring fire (K-0058)");
  const B = island(42), g2 = B.game;
  const pip2 = FN.start(g2); FN.begin(g2);
  SB.bus.emit("nibble", { c: pip2, node: FN.bush(g2) });
  SB.Game.hatch(g2, FN.pod(g2)); B.run(1);
  check("on the sticks step", st(g2).s === "sticks");
  const t0 = B.run(FN.STICK_TIME + 5, () => st(g2).s === "dusk");
  check("dawdle, and the sun goes down anyway", st(g2).s === "dusk" && t0 >= FN.STICK_TIME - 2, t0.toFixed(0) + " s");
  check("the clock reached late afternoon by itself", tod(g2) >= FN.TOD.sticks1 - 0.01, (tod(g2) * 24).toFixed(1) + " h");
  B.run(FN.SUNSET + 2, () => st(g2).s === "chase");
  check("the chase starts with no fire", st(g2).s === "chase" && st(g2).lit == null);
  st(g2).stickIds.forEach(id => { const it = SB.Game.byId(g2, id); if (it) SB.World.remove(g2.world, it); }); // no sticks: no way to light it yourself
  let bites = 0; SB.bus.on("scoutHit", d => { if (d.c === pip2) bites++; });
  B.run(80, () => st(g2).s !== "chase");
  check("caught on the third bite", bites === FN.BITES && (st(g2).s === "won" || st(g2).done), bites + " bites, " + st(g2).s);
  check("hurt, never killed", pip2.alive && pip2.chem.health >= 0.25 && pip2.chem.health < 1, pip2.chem.health.toFixed(2));
  check("the nest is lit for Pip", st(g2).lit != null);
  B.run(6, () => st(g2).done);
  check("back to the sky, and on to dawn", st(g2).done && !P.active);

  console.log("7. a third island: you let go of Pip");
  const C = island(43), g3 = C.game;
  const pip3 = FN.start(g3); FN.begin(g3);
  P.leave();
  check("out of the body, the day waits where it was", st(g3).s === "wake" && !P.active);
  C.run(FN.FALLBACK + 40, () => st(g3).s !== "wake");
  check("left alone, Pip finds the berries itself", st(g3).s !== "wake", st(g3).s);
  C.run(FN.FALLBACK + 5, () => st(g3).s === "sticks");
  check("and the others climb out by themselves", st(g3).s === "sticks" && SB.Game.smols(g3).length === 3);
  C.run(FN.STICK_TIME + FN.SUNSET + 6, () => st(g3).s === "lurk");
  C.run(0.3);
  const g3g = FN.grump(g3);
  check("at dark with nobody in Pip: a grump waits, Pip frozen", st(g3).s === "lurk" && g3g && g3g.scout.hold && pip3.chem.fear >= 0.8);
  const gx = g3g.x; C.run(4);
  check("it keeps waiting", Math.abs(g3g.x - gx) < 0.3);
  check("step back in: the chase", FN.begin(g3) && st(g3).s === "chase" && P.scout() === g3g);
  P.leave(); C.run(0.3);
  const again = FN.grump(g3);
  check("let go again: it waits again", st(g3).s === "lurk" && again && again.alive && again.scout && again.scout.hold);
  check("and the way back in still works", FN.begin(g3) && st(g3).s === "chase" && !!P.scout());
  P.leave();

  console.log("8. skip");
  const D = island(44), g4 = D.game;
  FN.start(g4); FN.begin(g4);
  check("the list's skip ends the first day at once", (P.skipQuest(), st(g4).done && !P.active));
  check("the pod is open and the fire is lit", SB.Game.smols(g4).length === 3 && st(g4).lit != null);
  check("and it's the next morning", g4.time / SB.DAY_LENGTH > 1.2 && g4.time / SB.DAY_LENGTH < 1.3, (g4.time / SB.DAY_LENGTH).toFixed(2));

  console.log("9. an island saved in the old sky-view opening");
  const E = island(45), g5 = E.game;
  const pip5 = FN.start(g5);
  SB.Game.hatch(g5, FN.pod(g5));
  g5.tutorial.night = { s: "fed", t: 30, pip: pip5.id, grump: null, sticks: 0, stickIds: [], lit: null, bush: null, freeOk: 1 }; // as 4.22 saved it
  E.run(0.5);
  check("the old free day becomes the sticks step, with sticks", st(g5).s === "sticks" && st(g5).v === 2 && st(g5).stickIds.length >= 2, st(g5).s);
  g5.tutorial.night = { s: "hungry", t: 3, pip: pip5.id, grump: null, sticks: 0, stickIds: [], lit: null, bush: null };
  E.run(0.2);
  check("“nudge Pip” becomes waking up hungry", st(g5).s === "wake");
});

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
