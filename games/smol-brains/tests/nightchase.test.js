// night chases (K-0057 item 4): a night grump closes on a lone smol, time slows and "lend your light" shows; let it
// go and the night goes on; lend it and you're that smol in the scout chase. light or the nest wins it (sparks, an
// ember, a braver smol), three bites lose it (hurt, never killed). one chase a night, never in the first night,
// and settings can turn it off.
// node games/smol-brains/tests/nightchase.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }

seeded(5700, () => {
  const ctx = load();
  ["possess.js", "firstnight.js", "nightchase.js"].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8"), ctx, { filename: f }));
  const SB = ctx.SB, P = SB.Possess, NC = SB.NightChase; P.headless = true;
  const game = SB.Game.newGame(57); SB.Game.current = game; game.headless = true;
  game.tutorial.done = true; game.podT = 1e9; if (game.dir) game.dir.nextT = 1e9; game.strangerT = 1e9;
  const w = game.world, hm = SB.Society.home(game, 0);
  function run(s, until) { for (let t = 0; t < s; t += SB.TICK) { SB.Game.step(game, SB.TICK); if (until && until()) return t; } return s; }
  function night(d) { game.time = (d + 0.9) * SB.DAY_LENGTH; w.time = game.time; run(0.2); }
  const steps = []; SB.bus.on("nightChase", d => steps.push(d.step));
  // a smol out alone, well away from the nest and any fire, and a grump near it
  function spot(r) {
    for (let a = 0; a < 64; a++) {
      const ang = a * 0.7, x = hm.x + Math.sin(ang) * r, z = hm.z + Math.cos(ang) * r;
      if (SB.World.walkable(w, x, z) && SB.World.walkable(w, x + 4, z) && SB.World.depthAt(w, x, z) < 0.05 && SB.World.depthAt(w, x + 4, z) < 0.05 && !SB.World.nearestFire(w, x, z, 10) && !SB.World.shelterAt(w, x, z)) return { x, z };
    }
    return null;
  }
  const c = SB.Debug.spawnTier(2, 1)[0];
  function setUp() {
    game.creatures.forEach(o => { if (o.species === "grump") { o.alive = false; o.gone = true; } });
    const s = spot(20);
    c.x = s.x; c.z = s.z; c.asleep = false; c.inBed = false; c.chem.health = 1; c.chem.fear = 0;
    const g = SB.Game.spawnGrump(game, s.x + 4, s.z);
    return g;
  }

  console.log("1. no chases by day, in the first night, or with the setting off");
  setUp(); run(2);
  check("by day: nothing", !NC.state(game).prompt && !w.night);
  game.tutorial.night = { s: "lurk", done: false }; game.time = 0.9 * SB.DAY_LENGTH; w.time = game.time; w.night = true; NC.tick(game, 1); // (straight to the check: the first night's own tick would end a night with no Pip)
  check("in the first night: nothing", !NC.state(game).prompt && SB.FirstNight.active(game));
  game.tutorial.night = { s: "done", done: true };
  game.settings.nightChase = false; run(2);
  check("setting off: nothing", !NC.state(game).prompt);
  delete game.settings.nightChase;

  console.log("2. a grump closes on a lone smol: time slows, the button shows");
  let g = setUp();
  run(2, () => NC.state(game).prompt);
  const p = NC.state(game).prompt;
  check("the prompt comes", !!p && p.c === c.id && p.g === g.id);
  check("time runs slow", NC.slow(game) === NC.SLOW);
  check("the grump glares and waits", g.scout && g.scout.hold && g.scout.nc);
  check("the smol is frozen with fear", c.chem.fear >= 0.8 && !c.action);
  const gx = g.x; run(0.5);
  check("still waiting while you decide", Math.abs(g.x - gx) < 0.3 && c.alive);

  console.log("3. let it go and the night goes on");
  run(NC.PROMPT * NC.SLOW + 0.5, () => !NC.state(game).prompt);
  check("the button times out", !NC.state(game).prompt && NC.slow(game) === 1);
  check("the grump is let go", !g.scout);
  check("not straight back: a pause first", NC.state(game).nextT > game.time + 20);

  console.log("4. lend your light: you're in, the chase is on");
  NC.state(game).nextT = 0; g = setUp();
  run(2, () => NC.state(game).prompt);
  check("a second prompt that night", !!NC.state(game).prompt && NC.state(game).prompts === 2);
  check("lend possesses the smol", NC.lend(game) && P.active && P.c === c);
  check("the grump is your scout, at 90% of your speed", P.scout() === g && !g.scout.hold && g.scout.speedK === 0.9);
  check("no quests or first-minute grump in a chase", game.settings.povThreat == null || game.settings.povThreat === "done");
  run(2);
  check("it doesn't end by itself while you stand in the dark", NC.state(game).live && P.active);

  console.log("5. home to the nest: it turns tail");
  const embers0 = game.lantern ? game.lantern.embers : 0, sp0 = game.sparks;
  run(4);
  c.x = hm.x + 1.5; c.z = hm.z; run(0.5, () => !NC.state(game).live);
  check("safe: the chase is won", !NC.state(game).live && NC.state(game).wins === 1, steps.join(","));
  check("sparks", game.sparks >= sp0 + NC.PAY, sp0 + " → " + game.sparks);
  check("the smol is braver for it", c.braveNights === 1 && c.chem.fear === 0);
  check("the first win is a memory ember", !game.lantern || game.lantern.embers === embers0 + 1 || game.lantern.got.nightchase);
  check("the grump goes home", g.goingHome || !g.alive);
  run(NC.LEAVE + 0.5);
  check("then back to the sky", !P.active);
  run(3);
  check("one chase a night", !NC.state(game).prompt && NC.state(game).done);

  console.log("6. the next night: three bites and you're caught, hurt but alive");
  night(1); g = setUp();
  run(3, () => NC.state(game).prompt);
  check("a new night, a new prompt", !!NC.state(game).prompt);
  NC.lend(game);
  let hits = 0; SB.bus.on("scoutHit", () => hits++);
  run(40, () => !NC.state(game).live);
  check("caught after " + NC.BITES + " bites", NC.state(game).losses === 1 && hits === NC.BITES, hits + " bites, " + steps.slice(-2).join(","));
  check("hurt, never killed", c.alive && c.chem.health >= 0.25 && c.chem.health < 1, c.chem.health.toFixed(2));
  run(NC.LEAVE + 0.5);
  check("thrown out of the body", !P.active);

  console.log("7. leaving mid-chase ends it");
  night(2); g = setUp();
  run(3, () => NC.state(game).prompt);
  NC.lend(game); run(1); P.leave();
  check("left: no chase hanging on", !NC.state(game).live && !P.scout());
  check("the grump lost the scent", !g.scout || g.scout.done);

  console.log("8. it saves");
  const g2 = SB.Save.revive(JSON.parse(JSON.stringify(SB.Save.snapshot(game))));
  const c2 = g2.creatures.find(k => k.id === c.id);
  check("counts and bravery survive a save", g2.settings.chase && g2.settings.chase.wins === 1 && g2.settings.chase.losses === 1 && c2 && c2.braveNights === 1);
});

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
