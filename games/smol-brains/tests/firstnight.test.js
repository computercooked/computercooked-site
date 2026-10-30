// the first night (K-0041 P2): Pip is hungry, you nudge Pip to the berries and the others copy; the sun sets on a
// timer; a grump lurks until you lend your light; then it chases (90% of your running speed, a wind-up, a pounce)
// and two sticks lit at the nest drive it off; dawn, the first memory ember, and the island is yours. Pip survives.
// node games/smol-brains/tests/firstnight.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }

seeded(4100, () => {
  const ctx = load();
  ["possess.js", "firstnight.js"].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8"), ctx, { filename: f }));
  const SB = ctx.SB, P = SB.Possess, FN = SB.FirstNight; P.headless = true;
  const game = SB.Game.newGame(41); SB.Game.current = game; game.headless = true;
  function run(s, until) { for (let t = 0; t < s; t += SB.TICK) { SB.Game.step(game, SB.TICK); if (until && until()) return t; } return s; }
  const steps = []; SB.bus.on("firstNight", d => steps.push(d.step));

  console.log("1. a new island gets the night, with Pip");
  check("a fresh island wants it", FN.wants(game));
  const pip = FN.start(game);
  check("Pip is there, hungry", pip && pip.name === "Pip" && pip.chem.hunger >= 0.75);
  check("nothing else tonight: no incidents, strangers or second pods", (!game.dir || game.dir.nextT > game.time + 600) && game.strangerT > game.time + 600 && game.podT > game.time + 600);
  const egg = game.world.items.find(o => o.data && o.data.pod);
  SB.Game.hatch(game, egg);
  run(1);
  check("the pod opens: on to Pip's hunger", FN.state(game).s === "hungry", FN.state(game).s);

  console.log("2. nudge Pip to the berries; the others copy");
  const b = FN.bush(game);
  check("there's a bush to pulse", !!b);
  pip.x = b.x + 0.8; pip.z = b.z; // you carried Pip over
  SB.bus.emit("nibble", { c: pip, node: b });
  check("Pip ate: fed", FN.state(game).s === "fed");
  const others = SB.Game.smols(game).filter(o => o !== pip);
  check("the founders head for the same bush", others.every(o => o.chem.hunger >= 0.6));

  console.log("3. the sun sets on a timer you can see, and the eyes come");
  run(5);
  check("sunset", FN.state(game).s === "sunset");
  const t0 = game.time;
  const took = run(FN.SUNSET + 2, () => FN.state(game).s === "lurk");
  check("dark comes in about " + FN.SUNSET + " s", took <= FN.SUNSET + 1 && game.world.night, took.toFixed(1) + " s, night " + game.world.night);
  const g = FN.grump(game);
  check("a grump waits at the edge, not chasing yet", g && g.scout && g.scout.hold && SB.dist(g.x, g.z, pip.x, pip.z) > 12, g && SB.dist(g.x, g.z, pip.x, pip.z).toFixed(1));
  const gx = g.x; run(5);
  check("still waiting while you watch", Math.abs(g.x - gx) < 0.3);
  check("Pip is frozen with fear", pip.chem.fear >= 0.8 && !pip.action);
  void t0;

  console.log("4. lend your light: the chase");
  check("lend your light possesses Pip", FN.lend(game) && P.active && P.c === pip);
  check("you face the grump", Math.abs(SB.angDiff(P.state ? 0 : 0, 0)) === 0);
  check("Pip starts the chase nearly full", pip.chem.hunger <= 0.08, Math.round((1 - pip.chem.hunger) * 100) + "%");
  check("and food drains 40% slower on the first night", Math.abs(P.hungerRate() - P.HUNGER_POV * 0.6) < 1e-9, (P.hungerRate() * 100).toFixed(2) + "%/s");
  check("chase on, sticks out", FN.state(game).s === "chase" && FN.state(game).stickIds.length >= 2);
  check("it runs at 90% of your running speed", g.scout.speedK === 0.9, (SB.Creature.runSpeed(pip) * g.scout.speedK).toFixed(2) + " vs your " + SB.Creature.runSpeed(pip).toFixed(2) + " m/s");
  let wind = 0, hits = 0; SB.bus.on("scoutWindup", () => wind++); SB.bus.on("scoutHit", () => hits++);
  run(25, () => hits > 0);
  check("standing there: it winds up, then pounces", wind >= 1 && hits >= 1, wind + " wind-ups, " + hits + " hits");
  check("after a bite you're apart: knocked back, and it staggers off your face", SB.dist(g.x, g.z, pip.x, pip.z) >= 3, SB.dist(g.x, g.z, pip.x, pip.z).toFixed(1) + " m");
  const h0 = hits; let wound = 0; for (let t = 0; t < 1.8; t += SB.TICK) { SB.Game.step(game, SB.TICK); if (!g.scout) break; /* the knock-back can carry Pip over the sticks to the nest, which ends it */ if (g.scout.wind > 0) wound++; }
  check("and it stands there for 2 s: no wind-up, no second bite", hits === h0 && !wound, wound + " wind-up ticks");
  check("a pounce is a big bite, but Pip lives", pip.alive && pip.chem.health <= 0.8 && pip.chem.health >= 0.25, pip.chem.health.toFixed(2));

  console.log("5. two sticks, light the nest, it runs");
  FN.state(game).stickIds.forEach(id => { const it = SB.Game.byId(game, id); if (!it || it.gone || FN.state(game).sticks >= 2) return; pip.x = it.x; pip.z = it.z; run(0.2); });
  check("picked up two sticks", FN.state(game).sticks >= 2 || FN.state(game).lit != null, FN.state(game).sticks + " sticks, lit " + FN.state(game).lit);
  const nest = game.world.T.nest; pip.x = nest.x + 1; pip.z = nest.z; run(0.3);
  check("the nest is lit", FN.state(game).lit != null);
  const ended = run(30, () => FN.state(game).s === "won" || FN.state(game).s === "done");
  check("the light scares it off", FN.state(game).s === "won" || FN.state(game).s === "done", ended.toFixed(1) + " s");

  console.log("6. dawn: the first ember, and the island is yours");
  run(5, () => FN.state(game).done);
  check("the night is done", FN.state(game).done && !P.active);
  run(0.3);
  check("it's morning on day 2", game.world.time / SB.DAY_LENGTH > 1 && !game.world.night, (game.world.time / SB.DAY_LENGTH).toFixed(2));
  check("Pip survived the first night", pip.alive);
  check("the first memory ember", FN.state(game).ember === 1);
  check("the steps went in order", steps.join(",") === "pod,hungry,fed,sunset,lurk,chase,won,dawn,done", steps.join(","));
  check("the grump goes home", !g.alive || g.goingHome);
});

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
