// Possession (v3.7, controls rebuilt in v4.4): step into one smol and play it first person. Its brain stops deciding and learns from
// you instead, its needs keep running, interact drives the normal actions, death and saves bring you back
// to god mode cleanly.
// node games/smol-brains/tests/possess.test.js
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const load = require("./_load.js");
const ctx = load();
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "play", "js", "possess.js"), "utf8"), ctx, { filename: "possess.js" });
const SB = ctx.SB, P = SB.Possess, V = SB.V;
P.headless = true;

let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
function fresh(seed, tier, n) {
  const g = SB.Game.newGame(seed); SB.Game.current = g;
  g.tutorial.done = true; g.podT = 1e9; if (g.dir) g.dir.nextT = 1e9;
  const cs = SB.Debug.spawnTier(tier, n || 3);
  cs.forEach(c => { c.age = Math.max(c.age, 900); c.asleep = false; c.chem.hunger = 0.1; c.chem.sleepy = 0; c.chem.tired = 0; });
  return { g, cs };
}
function run(g, secs) { for (let t = 0; t < secs / SB.TICK; t++) SB.Game.step(g, SB.TICK); }
function ahead(c, d) { return { x: c.x + Math.sin(c.facing) * d, z: c.z + Math.cos(c.facing) * d }; }

console.log("1. entering and leaving");
{
  const { g, cs } = fresh(41, 2);
  const c = cs[0];
  g.sparks = 12;
  check("a grump can't be possessed", !!P.canEnter(g, { type: "creature", alive: true, species: "grump" }));
  g.stats.possessed = 1; // the first possession is free (tricks.test.js covers that); after it, it costs
  check("enter costs sparks", P.enter(g, c) && g.sparks === 12 - P.COST, "sparks " + g.sparks);
  check("the smol knows", c._pov && P.active && P.c === c && /watched/.test((c.speech && c.speech.text) || ""));
  check("can't possess two at once", !!P.canEnter(g, cs[1]));
  P.leave();
  check("leaving lets go", !c._pov && !P.active && P.c === null && g.speed === 1);
  g.sparks = 1;
  check("too poor to possess", !P.enter(g, c) && !P.active);
}

console.log("2. the brain stops deciding while you drive");
{
  const { g, cs } = fresh(42, 2, 4);
  const c = cs[0];
  const orig = SB.Brain.decide; let mine = 0, others = 0;
  SB.Brain.decide = function (b) { if (b === c.brain) mine++; else others++; return orig.apply(this, arguments); };
  P.enter(g, c, { free: true });
  run(g, 30);
  check("no decisions for the possessed smol", mine === 0, mine + " vs " + others + " for the rest");
  check("the others still think", others > 5);
  P.leave();
  run(g, 20);
  check("it thinks again once you leave", mine > 0, mine + " decisions");
  SB.Brain.decide = orig;
}

console.log("3. walking, and needs keep running");
{
  const { g, cs } = fresh(43, 2);
  const c = cs[0];
  P.enter(g, c, { free: true });
  const x0 = c.x, z0 = c.z, h0 = c.chem.hunger;
  P.input.fwd = 1;
  run(g, 3);
  P.input.fwd = 0;
  const moved = Math.hypot(c.x - x0, c.z - z0);
  check("forward walks", moved > 0.8, moved.toFixed(2) + " units");
  run(g, 120);
  check("hunger keeps growing", c.chem.hunger > h0 + 0.02, h0.toFixed(2) + " -> " + c.chem.hunger.toFixed(2));
  check("standing still, nothing chosen for it", !c.action || c.action.verb === V.idle);
  P.input.jump = true; run(g, 0.1);
  check("space hops", c.onGround === false || c.vy !== 0 || c.y > SB.World.groundY(g.world, c.x, c.z) + 0.01);
  run(g, 2);
  P.leave();
}

console.log("4. the controls: right click eats, F picks up into the hotbar");
{
  const { g, cs } = fresh(44, 2);
  const c = cs[0];
  P.enter(g, c, { free: true });
  c.chem.hunger = 0.7;
  const p = ahead(c, 0.9);
  const apple = SB.World.add(g.world, g, "apple", p.x, p.z, {});
  cs.slice(1).forEach(o => { o.x += 30; o.z += 30; }); // nobody else in the way
  g.world.items.filter(o => o !== apple && SB.dist(o.x, o.z, c.x, c.z) < 6).forEach(o => SB.World.remove(g.world, o)); // (the pod egg, mostly)
  run(g, SB.TICK * 2); // the spatial grid catches up
  const t = P.look(g, c, null, -0.5);
  check("the crosshair finds the apple", t && t.type === "item" && t.id === apple.id, JSON.stringify(t));
  const o = P.options(g, c, t);
  check("F on food picks it up", o.pick && /pick up/.test(o.pick.label), o.pick && o.pick.label);
  check("E does the same", o.ctx === o.pick);
  P.act("pick", t);
  check("it's in the hotbar", SB.Surv.count(c, "apple", true) === 1 && apple.gone);
  P.select(SB.Surv.inv(c).s.findIndex(x => x && x.k === "apple"));
  const o2 = P.options(g, c, null);
  check("right click with food in hand eats it", o2.place && /eat/.test(o2.place.label), o2.place && o2.place.label);
  P.act("place", null);
  check("eaten", SB.Surv.count(c, "apple", true) === 0 && c.chem.hunger < 0.6, "hunger " + c.chem.hunger.toFixed(2));
  const q = ahead(c, 0.9);
  const stone = SB.World.add(g.world, g, "stone", q.x, q.z, {});
  P.act("ctx", { type: "item", id: stone.id });
  check("E on a stone picks it up", SB.Surv.count(c, "stone", true) === 1);
  P.select(SB.Surv.inv(c).s.findIndex(x => x && x.k === "stone"));
  check("Q drops what's in your hand", P.drop() && SB.Surv.count(c, "stone", true) === 0);
  P.leave();
  // a blob can't pick up a stone (too big for its mouth). it kicks stones about
  const g3 = fresh(45, 0).g, b = g3.creatures.find(x => x.species === "smol" && x.tier === 0);
  const s2 = SB.World.add(g3.world, g3, "stone", b.x + 0.5, b.z, {});
  const vb = P.options(g3, b, { type: "item", id: s2.id });
  check("a blob kicks a stone about instead", vb.use && /kick/.test(vb.use.label) && vb.pick && vb.pick.locked, vb.use && vb.use.label);
  check("a blob has one mouth slot and no recipes", SB.Surv.hotN(b) === 1 && SB.Surv.recipes(b, g3).length === 0);
}

console.log("5. the brain learns from what you choose");
{
  const { g, cs } = fresh(46, 2);
  const c = cs[0], B = SB.Brain;
  P.enter(g, c, { free: true });
  c.chem.hunger = 0.7;
  const p = ahead(c, 0.6);
  const apple = SB.World.add(g.world, g, "apple", p.x, p.z, {});
  const r = SB.Creature.resolve(g, { type: "item", id: apple.id });
  function qOf(verb) {
    SB.Chem.drives(c.chem, new Float32Array(SB.N_DRIVES)); // (just to touch it)
    const drv = SB.Chem.drives(c.chem, new Float32Array(SB.N_DRIVES));
    B.input(c.brain, { drives: drv, noun: SB.N.food, heardVerb: -1, heardName: false, near: true, holding: false, dark: g.world.night, knows: false, friends: false, rain: false, home: false });
    const qs = B.forward(c.brain); let mx = -1e9; for (let i = 0; i < qs.length; i++) if (i !== verb && qs[i] > mx) mx = qs[i];
    return qs[verb] - mx;
  }
  const before = qOf(V.play);
  for (let i = 0; i < 25; i++) P._learn(g, c, V.play, r);
  const after = qOf(V.play);
  check("playing with food, again and again, shifts its brain toward that", after > before + 0.05, before.toFixed(2) + " -> " + after.toFixed(2));
  check("lessons are counted", P.lessons() === 25);
  const tr = c.brain.traces[(c.brain.traceHead + c.brain.traces.length - 1) % c.brain.traces.length];
  check("your choice is the decision its next reward teaches", tr.a === V.play && tr.e === 1);
  let left = null; SB.bus.on("unpossess", d => { left = d; });
  P.leave();
  check("leaving reports what it learned", left && left.lessons === 25);
}

console.log("6. dying while possessed brings you home");
{
  const { g, cs } = fresh(47, 2);
  const c = cs[0];
  P.enter(g, c, { free: true });
  let died = 0; SB.bus.on("possessedDeath", () => died++);
  c.chem.health = 0.0001; c.chem.hunger = 1; c.chem.pain = 1;
  let ok = true;
  try { run(g, 5); } catch (e) { ok = false; console.log(e); }
  check("death noticed", died === 1 && !c.alive);
  check("back in god mode", !P.active && !c._pov && ok);
  try { run(g, 10); } catch (e) { ok = false; console.log(e); }
  check("the island carries on", ok);
}

console.log("7. a save made while possessed loads in god mode");
{
  const { g, cs } = fresh(48, 2);
  const c = cs[0];
  P.enter(g, c, { free: true });
  run(g, 2);
  const d = JSON.parse(JSON.stringify(SB.Save.snapshot(g)));
  const g2 = SB.Save.revive(d);
  check("nobody is possessed in the save", !g2.creatures.some(o => o._pov) && !JSON.stringify(d).includes("_pov"));
  P.leave();
  SB.Game.current = g2; g2.tutorial.done = true; g2.podT = 1e9; if (g2.dir) g2.dir.nextT = 1e9;
  const c2 = g2.creatures.find(o => o.id === c.id);
  const orig = SB.Brain.decide; let n = 0;
  SB.Brain.decide = function (b) { if (c2 && b === c2.brain) n++; return orig.apply(this, arguments); };
  run(g2, 20);
  SB.Brain.decide = orig;
  check("it thinks for itself after loading", c2 && n > 0, n + " decisions");
}

console.log("9. a small body's day (v4.6): mouth, leaves, the nest, sniffing, sharing");
{
  const { g, cs } = fresh(47, 0, 3);
  const b = cs[0], friend = cs[1], Sv = SB.Surv;
  g.stats.possessed = 0; g.settings.povBlobQuest = null;
  check("possessing a blob starts the blob quest", P.enter(g, b) && P.quest() && P.quest().kind === "blob" && P.questStep().id === "eat");
  // eat
  b.chem.hunger = 0.6;
  const berry = SB.World.add(g.world, g, "berry", b.x + 0.6, b.z, {});
  const ve = P.options(g, b, { type: "item", id: berry.id });
  check("a blob eats food on the ground", ve.use && /eat/.test(ve.use.label) && P.act("use", { type: "item", id: berry.id }));
  run(g, 0.4);
  check("…and the quest moves on to sniffing", P.questStep() && P.questStep().id === "sniff", P.questStep() && P.questStep().id);
  // sniff
  SB.World.add(g.world, g, "apple", b.x + 9, b.z + 2, {});
  check("G sniffs out food and points the marker at it", P.sniff() && P.sniffing() && SB.dist(P.sniffing().x, P.sniffing().z, b.x + 9, b.z + 2) < 12);
  run(g, 0.4);
  check("…then: tug leaves", P.questStep() && P.questStep().id === "tug", P.questStep() && P.questStep().id);
  // tug leaves off a plant, then line the nest three times
  const plant = SB.World.nearestNode(g.world, b.x, b.z, 200, n => Sv.canTug(g, n) && (n.kind === "bush" || Sv.isTree(n)));
  const vt = P.options(g, b, { type: "node", id: plant.id });
  check("F on a plant tugs leaves into the mouth", vt.pick && /leaves/.test(vt.pick.label) && P.act("pick", { type: "node", id: plant.id }) && Sv.count(b, "leaves", true) === 1, vt.pick && vt.pick.label);
  check("the same plant has no more leaves for a while", !Sv.canTug(g, plant));
  Sv.add(b, "leaves", 5);
  check("a mouthful is three", Sv.count(b, "leaves", true) === 3 && /mouth is full/.test(Sv.tug(b, g, SB.World.nearestNode(g.world, b.x, b.z, 200, n => n !== plant && Sv.canTug(g, n))).msg || ""));
  run(g, 0.4);
  check("…then: line the nest", P.questStep() && P.questStep().id === "nest");
  const nest = g.world.T.nest;
  b.x = nest.x + 0.8; b.z = nest.z;
  for (let i = 0; i < 3; i++) {
    if (!Sv.count(b, "leaves", true)) Sv.add(b, "leaves", 1);
    const vn = P.options(g, b, { type: "node", id: nest.id });
    if (i === 0) check("left click on the nest lines it", vn.use && /line the nest/.test(vn.use.label) && vn.ctx === vn.use, vn.use && vn.use.label);
    P.act("use", { type: "node", id: nest.id });
  }
  check("three mouthfuls make the nest cosier", g.nest && g.nest.cosy === 1 && g.nest.fluff === 3, JSON.stringify(g.nest));
  run(g, 0.4);
  check("…then: share food", P.questStep() && P.questStep().id === "share");
  // a cosy nest warms eggs faster
  const e1 = SB.World.add(g.world, g, "egg", nest.x + 1, nest.z, { genome: SB.Genome.random(g.rng, { species: "smol" }), parents: [], gen: 1, progress: 0.1 });
  const far = SB.World.nearestNode(g.world, nest.x + 30, nest.z + 30, 200, n => true);
  const e2 = SB.World.add(g.world, g, "egg", nest.x + 12, nest.z + 12, { genome: SB.Genome.random(g.rng, { species: "smol" }), parents: [], gen: 1, progress: 0.1 });
  void far;
  run(g, 5);
  check("eggs by a cosy nest hatch faster", e1.data.progress > e2.data.progress + 0.005, e1.data.progress.toFixed(3) + " vs " + e2.data.progress.toFixed(3));
  // share
  friend.x = b.x + 1; friend.z = b.z; friend.alive = true;
  Sv.add(b, "berry", 1);
  const vs = P.options(g, b, { type: "creature", id: friend.id });
  check("a blob shares food with a friend", vs.place && /share your/.test(vs.place.label) && P.act("place", { type: "creature", id: friend.id }), vs.place && vs.place.label);
  run(g, 0.4);
  check("the blob quest is done and pays sparks", !P.quest() && g.settings.povBlobQuest === "done");
  check("mouth carrying counts as practice for hands", (b.habits.hands || 0) > 0.6, (b.habits.hands || 0).toFixed(2));
  check("E with nothing in front of a blob sniffs", P.options(g, b, null).ctx && /sniff/.test(P.options(g, b, null).ctx.label));
  P.leave();
  // the nest saves
  const d = JSON.parse(JSON.stringify(SB.Save.snapshot(g)));
  const g2 = SB.Save.revive(d);
  check("the cosy nest is saved", g2.nest && g2.nest.cosy === 1 && g2.nest.fluff === 3);
  // a tool-user still gets the first-tool quest
  const t = fresh(48, 2, 2); t.g.settings.povQuest = null;
  P.enter(t.g, t.cs[0]);
  check("a tool-user still gets the first-tool quest", P.quest() && P.quest().kind !== "blob" && P.questStep().id === "stick");
  P.leave();
}

console.log("10. night: get home before the grumps come out");
{
  const { g, cs } = fresh(49, 0, 2);
  const b = cs[0], nest = g.world.T.nest;
  g.settings.povBlobQuest = "done";
  b.x = nest.x + 14; b.z = nest.z + 2;
  if (!SB.World.walkable(g.world, b.x, b.z)) { b.x = nest.x + 6; b.z = nest.z; }
  P.enter(g, b);
  const d = SB.DAY_LENGTH, t = Math.floor(g.time / d) * d + d * 0.9;
  g.time = t; g.world.time = t;
  run(g, 1.5);
  const ng = P.nightGoal();
  check("at night the marker leads to the nest", g.world.night && ng && ng.kind === "nest" && Math.abs(ng.x - nest.x) < 0.01, ng && ng.kind);
  const s0 = g.sparks;
  b.x = nest.x + 0.8; b.z = nest.z;
  run(g, 1.5);
  check("getting home is safe and pays a spark", !P.nightGoal() && g.sparks >= s0 + 1 && g.settings.povSafeNight != null);
  b.x = nest.x + 14; run(g, 1.5);
  check("once a night", !P.nightGoal());
  P.leave();
}

console.log(failed ? "\n" + failed + " FAILED" : "\nall passed");
process.exit(failed ? 1 : 0);
