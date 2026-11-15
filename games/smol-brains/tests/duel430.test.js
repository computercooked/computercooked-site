// 4.30: the captain fights, walked. Played with real movement (not teleports) the starting weapon could not reach
// Gloom past its own body, and no walking step could dodge a pounce that tracked you to the last frame.
// Now a captain commits to where you stood in the last beat of its wind-up, and your swing reaches a little further.
// node games/smol-brains/tests/duel430.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");

seeded(4301, () => {
  const ctx = load();
  ["bosses.js", "possess.js"].forEach(f => { if (!(f === "bosses.js" && ctx.SB.Bosses)) vm.runInContext(js(f), ctx, { filename: f }); });
  const SB = ctx.SB, P = SB.Possess, B = SB.Bosses, C = SB.Creature, Surv = SB.Survival || SB.Surv; P.headless = true;
  const game = SB.Game.newGame(91); SB.Game.current = game; game.tutorial.done = true;
  SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod));
  game.time = SB.DAY_LENGTH * 2.3; game.stats.maxTier = 4;
  const me = SB.Game.smols(game)[0]; me.tier = 2; me.stage = 3;
  const e = B.place(game).list.gloom;
  for (let i = 0; i < 4; i++) B.tick(game, 0.6);
  const g = B.creature(game, B.LIST[0]);

  console.log("1. the numbers");
  check("each captain commits later than the one before", B.BY.gloom.lock > B.BY.murk.lock && B.BY.murk.lock > B.BY.night.lock && B.BY.night.lock > 0.3);
  check("Gloom bites softest", B.BY.gloom.dmg < B.BY.murk.dmg && B.BY.murk.dmg < B.BY.night.dmg);
  check("a captain's scout carries its lock", !!g && g.scout.lock === B.BY.gloom.lock && g.scout.dmg === B.BY.gloom.dmg);
  g.scout.lock = 0; B.tick(game, 0.6);
  check("a captain from an older save learns it", g.scout.lock === B.BY.gloom.lock);

  console.log("2. your swing reaches past its bulk");
  const reach = C.radius(me) + C.radius(g) + 1.2;
  me.x = g.x + reach + 0.6; me.z = g.z; me.px = me.x; me.pz = me.z;
  P.enter(game, me, { free: true });
  Surv.add(me, "club", 1); Surv.select(me, Surv.inv(me).s.findIndex(x => x && x.k === "club"));
  const ref = { type: "creature", id: g.id };
  P.act("use", ref);
  check("just past a normal swing: it lands on a captain", (g.whacked || 0) > 0, "whacked " + (g.whacked || 0));
  check("but not from across the clearing", P.BOSS_REACH > 0.5 && P.BOSS_REACH < 1.5);

  console.log("3. it commits, so a step aside is a dodge");
  // drive the creature's own tick through a wind-up, twice: once standing still, once stepping aside late
  function pounce(step) {
    let hit = 0, miss = 0;
    const h1 = () => hit++, h2 = () => miss++;
    SB.bus.on("scoutHit", h1); SB.bus.on("scoutMiss", h2);
    me.chem.health = 1; g.whacked = 0;
    g.x = e.x; g.z = e.z; me.x = e.x + 2.2; me.z = e.z; me.px = me.x; me.pz = me.z;
    g.scout = { who: me.id, t: 5, hitT: 0, hold: false, speedK: 0.8, dmg: 0.15, lock: B.BY.gloom.lock, boss: "gloom", wind: C.LUNGE_WIND };
    let moved = false;
    for (let t = 0; t < 40 && !hit && !miss; t++) {
      if (step && !moved && g.scout.wind <= 0.5) { me.z += step; me.pz = me.z; moved = true; } // a late step: after it has fixed on you
      C.tick(g, 0.1, game);
    }
    if (SB.bus.off) { SB.bus.off("scoutHit", h1); SB.bus.off("scoutMiss", h2); }
    return { hit, miss, h: me.chem.health };
  }
  const still = pounce(0);
  check("stand still and it bites", still.hit === 1 && still.h < 1, JSON.stringify(still));
  const side = pounce(1.3);
  check("step aside in the last beat and it misses", side.miss >= 1 && side.h === 1, JSON.stringify(side));
  check("a miss leaves it reeling: hits count double", B.reeling(g));
  P.leave();
});

console.log("4. the files");
const cr = js("creature.js");
check("only a scout with a lock commits (an ordinary chase is unchanged)", /if \(sc\.lock && !sc\.aim && sc\.wind <= sc\.lock\)/.test(cr) && /locked \? C\.LOCK_BITE : 1\.5/.test(cr));

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
