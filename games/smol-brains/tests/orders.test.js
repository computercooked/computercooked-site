// The sky's orders: a rally gathers the smols who trust you, a blueprint gets built where you put it,
// a no-go zone is kept clear, low trust means fewer followers, over-ordering annoys them, work marks get
// done, the stockpile fills up, job interests nudge the brain, and it all saves.
// node games/smol-brains/tests/orders.test.js
"use strict";
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
function run(SB, game, secs) { for (let t = 0; t < secs / SB.TICK; t++) SB.Game.step(game, SB.TICK); }
function runFed(SB, game, secs) { for (let t = 0; t < secs; t += 1) { run(SB, game, 1); SB.Game.smols(game).forEach(c => { c.chem.hunger = Math.min(c.chem.hunger, 0.2); c.chem.sick = 0; c.chem.sleepy = Math.min(c.chem.sleepy, 0.3); c.chem.tired = Math.min(c.chem.tired, 0.3); c.chem.health = Math.max(c.chem.health, 0.8); }); } }

function tribe(seed, tier, n, trust, setup) {
  const SB = load().SB;
  const game = SB.Game.newGame(seed); SB.Game.current = game; game.tutorial.done = true; game.time = 300; game.podT = 1e9;
  if (game.dir) game.dir.nextT = 1e9;
  game.strangerT = 1e9;
  const cs = SB.Debug.spawnTier(tier, n);
  const h = SB.Society.home(game, 0);
  SB.Debug.reveal();
  cs.forEach((c, i) => { c.asleep = false; c.x = h.x + (i % 4) * 1.2 - 2; c.z = h.z + Math.floor(i / 4) * 1.2 - 1; c.chem.hunger = 0.1; c.age = Math.max(c.age, 700); if (trust != null) c.trust = trust; c.genome.genes.obedience = 0.5; });
  if (setup) setup(SB, game, cs);
  return { SB, game, cs, h };
}
// a dry, walkable spot about d away from home
function spotAway(SB, game, h, d, kind) {
  for (let a = 0; a < 64; a++) {
    const ang = a * 0.7, x = h.x + Math.cos(ang) * d, z = h.z + Math.sin(ang) * d;
    if (kind ? SB.Orders.canPlace(game, kind, x, z) : SB.World.walkable(game.world, x, z) && SB.World.depthAt(game.world, x, z) < 0.05) return { x, z };
  }
  return null;
}

console.log("1. the orders tool: rally, home and no-go for blobs once the tutorial is done; the rest at tool-user");
{
  const a = tribe(11, 0, 3);
  a.game.tutorial.done = false;
  check("blobs in the tutorial: not yet", !a.SB.Orders.unlocked(a.game));
  a.game.tutorial.done = true;
  check("blobs after it: unlocked", a.SB.Orders.unlocked(a.game));
  const K = a.SB.Orders.KINDS;
  check("blobs get rally, home and no-go", K.rally.tier === 0 && K.home.tier === 0 && K.nogo.tier === 0 && K.mark.tier === 2 && K.build.tier === 2);
  const b = tribe(12, 2, 3);
  check("tool-users: unlocked", b.SB.Orders.unlocked(b.game));
}

console.log("1b. a rally flag is a go-there for blobs");
{
  const { SB, game, cs, h } = tribe(13, 0, 8, 0.95);
  const p = spotAway(SB, game, h, 14);
  check("found a spot", !!p);
  check("rally placed", SB.Orders.place(game, "rally", p.x, p.z).ok);
  runFed(SB, game, 40);
  const near = cs.filter(c => c.alive && SB.dist(c.x, c.z, p.x, p.z) < 5).length;
  check("trusting blobs go there", near >= 4, near + "/8");
}

console.log("2. a rally gathers the willing");
let highNear = 0, lowNear = 0;
{
  const { SB, game, cs, h } = tribe(21, 3, 10, 0.95);
  const p = spotAway(SB, game, h, 16);
  check("found a rally spot", !!p);
  const res = SB.Orders.place(game, "rally", p.x, p.z);
  check("rally placed", res.ok && game.orders.list.length === 1);
  runFed(SB, game, 40);
  highNear = cs.filter(c => c.alive && SB.dist(c.x, c.z, p.x, p.z) < 5).length;
  check("most smols who trust you came", highNear >= 6, highNear + "/10 at the flag");
  check("they said why", cs.some(c => c.ord && Object.values(c.ord).some(d => d.f)));
  runFed(SB, game, 20);
  const still = cs.filter(c => c.alive && SB.dist(c.x, c.z, p.x, p.z) < 5).length;
  check("and they stay around the flag", still >= 5, still + "/10");
}

console.log("3. low trust: fewer followers");
{
  const { SB, game, cs, h } = tribe(21, 3, 10, 0.05, (SB, game, cs) => cs.forEach(c => { c.genome.genes.obedience = 0.2; }));
  const p = spotAway(SB, game, h, 16);
  SB.Orders.place(game, "rally", p.x, p.z);
  runFed(SB, game, 40);
  lowNear = cs.filter(c => c.alive && SB.dist(c.x, c.z, p.x, p.z) < 5).length;
  check("hardly anyone came", lowNear <= 3 && lowNear < highNear, lowNear + "/10 (trusting tribe: " + highNear + "/10)");
  check("the willingness estimate agrees", SB.Orders.obedience(game) < 0.2, SB.Orders.obedience(game).toFixed(2));
  // and trust grows from how you treat them
  const c = cs[0], t0 = SB.Orders.trust(c);
  for (let i = 0; i < 5; i++) { game.time += 5; SB.Creature.tickle(c, game); }
  (game.prayers = game.prayers || []).push({ id: c.id, need: "hunger", t: game.time, input: new Float32Array(c.brain.nIn) });
  SB.Creature.prayerAnswered(c, game, "miracle");
  check("tickles and answered prayers build trust", SB.Orders.trust(c) > t0 + 0.12, t0.toFixed(2) + " → " + SB.Orders.trust(c).toFixed(2));
  const t1 = SB.Orders.trust(c); SB.Creature.tap(c, game);
  check("taps cost a little", SB.Orders.trust(c) < t1);
}

console.log("4. over-ordering annoys them");
{
  const { SB, game, cs, h } = tribe(22, 3, 6, 0.6);
  const t0 = cs.reduce((s, c) => s + SB.Orders.trust(c), 0) / cs.length, w0 = SB.Orders.obedience(game);
  let annoyed = 0; SB.bus.on("ordersAnnoyed", () => annoyed++);
  for (let i = 0; i < 9; i++) SB.Orders.place(game, "rally", h.x + (i % 3) * 2, h.z + 6);
  const t1 = cs.reduce((s, c) => s + SB.Orders.trust(c), 0) / cs.length, w1 = SB.Orders.obedience(game);
  check("the sky got bossy", annoyed > 0 && game.orders.heat > 4, "heat " + game.orders.heat.toFixed(1));
  check("they trust it less", t1 < t0 - 0.05, t0.toFixed(2) + " → " + t1.toFixed(2));
  check("and follow less", w1 < w0 * 0.8, w0.toFixed(2) + " → " + w1.toFixed(2));
  check("one flag at a time", game.orders.list.filter(o => o.kind === "rally").length === 1);
  run(SB, game, 380);
  check("it cools off", game.orders.heat < 1, game.orders.heat.toFixed(2));
}

console.log("5. a blueprint gets built where you put it");
{
  const { SB, game, cs, h } = tribe(23, 4, 6, 0.9, (SB, game, cs) => {
    cs.forEach(c => { SB.Ideas.discover(c, "campfire", game); c.ideas.campfire = 1; });
    // plenty of sticks and stones by the village
    for (let i = 0; i < 8; i++) { const h = SB.Society.home(game, 0); SB.World.add(game.world, game, i % 2 ? "stone" : "stick", h.x + (i % 4) - 1.5, h.z - 3 - (i >> 2), {}); }
  });
  const kinds = SB.Orders.buildable(game).map(b => b.kind);
  check("they know a campfire", kinds.includes("campfire"), kinds.join(","));
  const p = spotAway(SB, game, h, 9, "campfire");
  check("found a spot", !!p);
  const bad = SB.Orders.place(game, "build", h.x, h.z, { build: "hut" });
  check("can't place what nobody knows", !bad.ok, bad.msg);
  const res = SB.Orders.place(game, "build", p.x, p.z, { build: "campfire" });
  check("blueprint placed", res.ok, res.msg);
  const st = SB.World.structById(game.world, res.o.site);
  check("it's a ghost site, marked as the sky's", st && !st.done && st.data.bp === 1);
  let built = false;
  for (let i = 0; i < 300 && !built; i++) { runFed(SB, game, 1); built = st.done; }
  check("they built it", built, built ? "" : JSON.stringify(st.need) + " work " + st.work);
  check("right where you put it", Math.abs(st.x - p.x) < 0.01 && Math.abs(st.z - p.z) < 0.01);
  run(SB, game, 2);
  check("the order is done", !game.orders.list.some(o => o.kind === "build"));
  // an untouched blueprint can be taken back
  const p2 = spotAway(SB, game, h, 12, "campfire");
  const r2 = SB.Orders.place(game, "build", p2.x, p2.z, { build: "campfire" });
  SB.Orders.remove(game, r2.o.id);
  check("an untouched blueprint can be cancelled", !SB.World.structById(game.world, r2.o.site));
}

console.log("6. a no-go zone is kept clear");
// seeded: the zone and no-zone runs of an island share their luck, so the comparison is like for like
// (unseeded, a no-zone run where the smols happened to drift off on their own could make the zone look useless)
function zoneTime(seed, withZone) { return seeded(seed, () => {
  const { SB, game, cs, h } = tribe(seed, 3, 8, 0.95);
  const z = { x: h.x + 7, z: h.z };
  const r = withZone ? SB.Orders.place(game, "nogo", z.x, z.z) : null;
  // half of them start inside it
  cs.slice(0, 4).forEach((c, i) => { c.x = z.x + (i - 1.5); c.z = z.z + 0.5; });
  let inside = 0, obeyed = 0;
  for (let t = 0; t < 120; t++) { // count once they've had time to walk out
    runFed(SB, game, 1);
    if (t >= 30) cs.forEach(c => {
      if (!c.alive || SB.dist(c.x, c.z, z.x, z.z) >= 6) return;
      inside++;
      const d = r && c.ord && c.ord[r.o.id];
      if (d && d.f) obeyed++;
    });
  }
  const followers = r ? cs.filter(c => c.ord && c.ord[r.o.id] && c.ord[r.o.id].f).length : 0;
  return { inside, obeyed, followers };
}); }
{
  let free = 0, kept = 0, obeyed = 0, followers = 0;
  for (const seed of [31, 32, 33]) {
    free += zoneTime(seed, false).inside;
    const k = zoneTime(seed, true);
    kept += k.inside; obeyed += k.obeyed; followers += k.followers;
  }
  check("smols keep out of a no-go zone", kept < free * 0.5, "smol-seconds inside: " + kept + " vs " + free + " with no zone");
  // the ones who agreed only pass through (the "nah" ones may wander in: that's their call)
  check("the ones who listen stay out", followers > 0 && obeyed / followers < 10, (obeyed / Math.max(1, followers)).toFixed(1) + " s each in 90 s, " + followers + " listened");
}

console.log("7. work marks, the stockpile and job interests");
{
  const { SB, game, cs, h } = tribe(41, 3, 6, 0.95);
  const rock = SB.World.nearestNode(game.world, h.x, h.z, 40, n => n.kind === "boulder" && n.state === "ok");
  check("found a boulder", !!rock);
  const zp = spotAway(SB, game, h, 5);
  const sp = SB.Orders.place(game, "stock", zp.x, zp.z);
  check("stockpile placed", sp.ok);
  const m = SB.Orders.place(game, "mark", rock.x, rock.z, { hit: { type: "node", ref: rock } });
  check("mine mark placed", m.ok && m.o.job === "mine", m.msg);
  runFed(SB, game, 90);
  const piled = game.world.items.filter(o => o.kind === "stone" && o.heldBy == null && SB.dist(o.x, o.z, zp.x, zp.z) < 4).length;
  check("stone mined and carried to the pile", piled >= 2, piled + " stones on the pile");
  const bunnyless = SB.Orders.place(game, "mark", h.x, h.z, { hit: { type: "struct", ref: { kind: "hut", done: true } } });
  check("can't mark nonsense", !bunnyless.ok);
  // job interests: a big nudge toward wandering shows up in what it chooses
  const c = cs[0]; SB.Orders.setPrio(c, "explore", 1);
  const mask = new Array(SB.N_VERBS).fill(true), bias = new Float32Array(SB.N_VERBS);
  check("priorities nudge the brain", SB.Orders.bias(c, game, "stick", mask, bias) && bias[SB.V.wander] > 0.1);
  SB.Orders.setPrio(c, "explore", 0);
  check("and clear back to normal", c.prio == null);
}

console.log("8. orders save and load");
{
  const { SB, game, cs, h } = tribe(51, 4, 4, 0.7, (SB, game, cs) => cs.forEach(c => { c.ideas.campfire = 1; }));
  SB.Orders.place(game, "rally", h.x + 4, h.z);
  SB.Orders.place(game, "home", h.x, h.z);
  const p = spotAway(SB, game, h, 10, "campfire");
  SB.Orders.place(game, "build", p.x, p.z, { build: "campfire" });
  SB.Orders.setPrio(cs[0], "build", 1);
  const data = JSON.parse(JSON.stringify(SB.Save.snapshot(game)));
  const g2 = SB.Save.revive(data);
  check("orders come back", g2.orders.list.length === 3, g2.orders.list.map(o => o.kind).join(","));
  check("the blueprint is still there", g2.world.structures.some(s => s.data && s.data.bp && !s.done));
  check("trust and job interests too", g2.creatures.some(c => c.prio && c.prio.build === 1) && g2.creatures.every(c => Math.abs(c.trust - 0.7) < 0.05));
  const old = Object.assign({}, data); delete old.orders;
  const g3 = SB.Save.revive(old);
  check("an old save without orders loads", g3 && g3.orders && g3.orders.list.length === 0);
  const junk = SB.Save.revive(Object.assign({}, data, { orders: { list: [null, 5, { kind: "nuke", x: 1, z: 1, id: 3 }, { kind: "mark", x: 1, z: 1, id: 4 }], heat: "x" } }));
  check("junk orders are ignored", junk.orders.list.length === 0 && junk.orders.heat === 0);
  run(SB, g2, 5);
  check("and the loaded island runs", g2.creatures.length >= 4);
}

console.log(failed ? "\n" + failed + " FAILED" : "\nall passed");
process.exit(failed ? 1 : 0);
