/* smol brains — the mind: episodic memory, the map in its head, sleep replay, curiosity, theory of mind,
   goals, the inner voice, and saving all of it.
   Run: node games/smol-brains/tests/mind.test.js */
"use strict";
const load = require("./_load.js");
const ctx = load();
const SB = ctx.SB;
SB.Render = undefined;
const Mi = SB.Mind, V = SB.V;

let failed = 0;
function check(name, ok, info) {
  console.log((ok ? "  ok   " : "  FAIL ") + name + (info ? "  (" + info + ")" : ""));
  if (!ok) failed++;
}
function calm(c) { SB.DRIVES.forEach(k => { c.chem[k] = 0; }); }

const game = SB.Game.newGame(4242); game.tutorial.done = true; SB.Game.current = game;
const spawn = (tier, n) => { const cs = SB.Debug.spawnTier(tier, n || 1); cs.forEach(c => { c.age = 900; c.stage = 3; calm(c); Mi.ensure(c); }); return cs; };

console.log("1. episodic memory");
{
  const [c] = spawn(0);
  const cap = Mi.caps(c).ep;
  for (let i = 0; i < cap + 3; i++) Mi.remember(c, game, "life", "thing " + i, 0.2 + i * 0.05);
  check("the diary is capped by tier", c.mind.ep.length === cap, c.mind.ep.length + "/" + cap);
  check("the faintest are the ones forgotten", !c.mind.ep.some(e => e.w === "thing 0") && c.mind.ep.some(e => e.w === "thing " + (cap + 2)));
  const before = c.mind.ep.find(e => e.w === "thing " + (cap + 2)).s;
  Mi.remember(c, game, "life", "thing " + (cap + 2), 0.5);
  check("the same thing again sticks harder instead of duplicating", c.mind.ep.filter(e => e.w === "thing " + (cap + 2)).length === 1 && c.mind.ep.find(e => e.w === "thing " + (cap + 2)).s > before);
  const e = c.mind.ep[0], now = Mi.salience(c, e, game.time), later = Mi.salience(c, e, game.time + 3000);
  check("memories fade with time", later < now * 0.8, now.toFixed(2) + " -> " + later.toFixed(2));
  const [hi] = spawn(5);
  const tLow = Mi.salience(c, { s: 1, t: 0 }, 1200), tHi = Mi.salience(hi, { s: 1, t: 0 }, 1200);
  check("bigger minds forget slower", tHi > tLow, tLow.toFixed(2) + " vs " + tHi.toFixed(2));
  check("ascended smols hold more memories", Mi.caps(hi).ep > cap && Mi.caps(hi).pl > Mi.caps(c).pl);
  Mi.remember(c, game, "hurt", "a grump hit me", 1.2);
  check("vivid() puts the strongest first", Mi.vivid(c, game, 1)[0].w === "a grump hit me");
}

console.log("2. the map in its head");
{
  const [c] = spawn(2);
  const fx = c.x + 20, fz = c.z;
  Mi.learnPlace(c, game, "food", fx, fz, "berry bush", 0.6);
  Mi.learnPlace(c, game, "food", fx + 1, fz, "berry bush", 0.6);
  check("nearby sightings merge into one place", c.mind.pl.filter(p => p.k === "food").length === 1);
  check("recall finds it", Mi.recall(c, game, "food") && Mi.recall(c, game, "food").x > c.x + 15);
  c.chem.hunger = 0.8;
  const wt = Mi.wanderTarget(c, game);
  check("hungry, it walks to where food was", wt && SB.dist(wt.x, wt.z, fx, fz) < 3 && /food/.test(wt.why), wt && wt.why);
  const [blob] = spawn(0); blob.chem.hunger = 0.9;
  check("a blob has no map to follow", Mi.wanderTarget(blob, game) === null);
  // reality check: stand on the remembered spot, see no food, and the place loses value until it's forgotten
  const p = Mi.recall(c, game, "food"); c.x = p.x; c.z = p.z;
  c._mt.nt = 0;
  for (let i = 0; i < 3; i++) Mi.notice(c, game, []);
  check("no food where it was: the place loses value", c.mind.pl[0] && c.mind.pl[0].v < 0.5, c.mind.pl[0] && c.mind.pl[0].v.toFixed(2));
  for (let i = 0; i < 9; i++) Mi.notice(c, game, []);
  check("...and is dropped from the map", !c.mind.pl.some(q => q.k === "food"));
  check("...and it remembers the disappointment", c.mind.ep.some(e => /no food left/.test(e.w)));
  Mi.learnPlace(c, game, "danger", c.x + 5, c.z + 5, "grumps", 0.7);
  check("it knows where it got hurt", !!Mi.dangerAt(c, game, c.x + 6, c.z + 5) && !Mi.dangerAt(c, game, c.x - 20, c.z));
  const cap = Mi.caps(c).pl;
  for (let i = 0; i < cap + 4; i++) Mi.learnPlace(c, game, "water", c.x + i * 10, c.z + 40, "pond " + i, 0.3 + i * 0.01);
  check("the map is capped by tier", c.mind.pl.length === cap, c.mind.pl.length + "/" + cap);
}

console.log("3. sleep replay (the brain learns while it dreams)");
{
  const [c] = spawn(2);
  const b = c.brain, x = new Float32Array(b.nIn);
  for (let i = 0; i < b.nIn; i++) x[i] = (i * 7) % 5 === 0 ? 1 : 0;
  const val = () => { b.x.set(x); return SB.Brain.forward(b)[V.eat]; };
  const W0 = Array.from(b.W[b.W.length - 1]), v0 = val();
  check("replay() changes the weights", SB.Brain.replay(b, x, V.eat, 1, b.lr) !== 0 && b.W[b.W.length - 1].some((w, i) => w !== W0[i]));
  for (let i = 0; i < 30; i++) SB.Brain.replay(b, x, V.eat, 1, b.lr);
  check("replaying a good memory raises what the net expects from it", val() > v0 + 0.05, v0.toFixed(2) + " -> " + val().toFixed(2));
  check("replay ignores a malformed memory", SB.Brain.replay(b, [1, 2, 3], V.eat, 1) === 0);
  // through the mind: experiences go into the buffer, sleep replays them
  for (let i = 0; i < 6; i++) Mi.experience(c, game, { verb: V.eat, x: Float32Array.from(x) }, null, i === 3 ? -0.9 : 0.3);
  check("experiences fill the replay buffer", c._mt.rb.length === 6);
  const Wb = Array.from(b.W[0]), nr0 = c.mind.nr;
  for (let i = 0; i < 4; i++) Mi.sleep(c, game, 4.1);
  check("asleep, it replays them", c.mind.nr > nr0 && b.W[0].some((w, i) => w !== Wb[i]), (c.mind.nr - nr0) + " replays");
  check("...and dreams", c.mind.dream && typeof c.mind.dream.w === "string", c.mind.dream && c.mind.dream.w);
  c.asleep = true;
  check("the card shows the dream", /dreaming/.test(SB.Creature.thought(c, game)), SB.Creature.thought(c, game));
  c.asleep = false;
  const cap = Mi.caps(c).rb;
  for (let i = 0; i < cap + 10; i++) Mi.experience(c, game, { verb: V.play, x: Float32Array.from(x) }, null, 0.1);
  check("the buffer is a ring (bounded)", c._mt.rb.length === cap);
}

console.log("4. curiosity");
{
  const [c] = spawn(1); c.brain.lastErr = 0;
  const a = { verb: V.eat }, t = { type: "item", kind: "berry", noun: "food", x: c.x, z: c.z };
  const r1 = Mi.curiosity(c, game, a, t), r2 = Mi.curiosity(c, game, a, t), r3 = Mi.curiosity(c, game, a, t);
  check("new things are rewarding, and less so each time", r1 > r2 && r2 > r3 && r1 > 0.02, [r1, r2, r3].map(v => v.toFixed(3)).join(" > "));
  check("doing something for the first time is a memory", c.mind.ep.some(e => /something new: ate the berries/.test(e.w)));
  const [s] = spawn(1); s.brain.lastErr = 0; s.chem.fear = 0.9;
  const rf = Mi.curiosity(s, game, a, t);
  check("fear smothers curiosity", rf < r1 * 0.3, rf.toFixed(3) + " vs " + r1.toFixed(3));
  c.brain.lastErr = 0.8;
  check("a surprising world is interesting too", Mi.curiosity(c, game, a, t) > r3);
  check("wandering and idling aren't curiosity", Mi.curiosity(c, game, { verb: V.wander }, null) === 0);
}

console.log("5. theory of mind");
{
  const cs = spawn(3, 2);
  const [c, o] = cs;
  const far = { x: c.x + 60, z: c.z + 60 };
  // put the pair off on their own so nobody else gets in the way
  c.x = far.x; c.z = far.z; o.x = far.x + 2; o.z = far.z;
  SB.World.rebuildCreatureGrid(game.world, game);
  const ask = () => { for (let i = 0; i < 200; i++) { const r = Mi.social(c, game); if (r) return r; } return null; };
  SB.Social.remember(game, c, o, "test", 40, "my pal", 99999);
  o.grief = { until: game.time + 200 };
  let r = ask();
  check("sees a sad friend and goes to comfort them", r && r.o === o && (r.verb === V.cuddle || r.verb === V.talk), r && r.why);
  check("the thought line says why", r && /sad/.test(Mi.aside(c, game) || ""), Mi.aside(c, game));
  const lonely0 = 0.8; o.chem.lonely = lonely0;
  Mi.experience(c, game, { verb: V.cuddle }, { type: "creature", id: o.id, ref: o, noun: "smol", x: o.x, z: o.z }, 0.2);
  check("comforting actually helps", o.chem.lonely < lonely0 && o.mind.ep.some(e => e.w === c.name + " comforted me"));
  o.grief = null; o.chem.lonely = 0;
  o.chem.anger = 0.95;
  r = ask();
  check("steers clear of an angry smol", r && r.avoid === o, r && r.why);
  o.chem.anger = 0; o.chem.hunger = 0.95;
  const food = SB.World.add(game.world, game, "berry", c.x, c.z); food.heldBy = c.id; c.holding = food.id;
  r = ask();
  check("shares its food with a hungry friend", r && r.verb === V.give && r.o === o, r && r.why);
  c.chem.hunger = 0.9;
  check("not while it's starving itself", Array.from({ length: 50 }, () => Mi.social(c, game)).every(v => v === null));
  c.chem.hunger = 0; c.holding = null;
  const [young] = spawn(2);
  young.x = far.x; young.z = far.z + 1; SB.World.rebuildCreatureGrid(game.world, game);
  check("a pre-tribe smol doesn't think about others", Array.from({ length: 50 }, () => Mi.social(young, game)).every(v => v === null));
  // reading moods: the cleverer, the better
  o.chem.hunger = 0.6;
  const acc = who => { let n = 0; for (let i = 0; i < 400; i++) if (Mi.read(who, o, game).mood === "hungry") n++; return n / 400; };
  const [sage] = spawn(5);
  check("cleverer smols read moods better", acc(sage) > acc(young), acc(young).toFixed(2) + " vs " + acc(sage).toFixed(2));
  // talk spreads the map
  Mi.learnPlace(c, game, "food", c.x + 30, c.z, "apple tree", 0.9);
  Mi.tell(c, o, game);
  check("talking shares where the good things are", o.mind.pl.some(p => p.l === "apple tree") || o.mind.pl.some(p => p.k === "danger"));
}

console.log("6. goals and weighing choices");
{
  const [c] = spawn(4);
  c.chem.hunger = 0.9;
  let g = Mi.deliberate(c, game, [0.9]);
  check("a hungry builder makes food its goal", g && g.id === "eat", g && g.why);
  c.chem.hunger = 0.3; c.chem.lonely = 0.4;
  check("it sticks with a goal instead of dithering", Mi.deliberate(c, game, [0.4]).id === "eat");
  game.time += 30;
  g = Mi.deliberate(c, game, [0.4]);
  check("...but changes its mind once the goal is stale", g.id !== "eat", g.id);
  const mask = SB.VERB_WORDS.map(() => true), bias = SB.VERB_WORDS.map(() => 0);
  c._mt.goal = { id: "eat", t: game.time, why: "i want food" };
  check("the goal nudges the net toward it", Mi.goalBias(c, "food", mask, bias) && bias[V.eat] > 0 && bias[V.cuddle] === 0);
  const [t5] = spawn(5); t5.chem.cold = 0.8;
  g = Mi.deliberate(t5, game, [0.8]);
  check("a thinker weighs the runner-up", g && /beats/.test(g.why), g && g.why);
  const [b3] = spawn(3);
  check("tribe smols don't deliberate yet", Mi.deliberate(b3, game, [0.5]) === null);
}

console.log("7. the inner voice");
{
  const [c0] = spawn(0), [c5] = spawn(5);
  c5.chem.hunger = 0.9; Mi.deliberate(c5, game, [0.9]); Mi.remember(c5, game, "food", "ate apple. so good", 0.9);
  const m0 = Mi.monologue(c0, game).map(l => l.k), m5 = Mi.monologue(c5, game).map(l => l.k);
  check("a blob only feels", m0.indexOf("feel") === 0 && m0.indexOf("want") < 0 && m0.indexOf("remember") < 0, m0.join(","));
  check("a thinker feels, wants and remembers", ["feel", "want", "remember"].every(k => m5.indexOf(k) >= 0), m5.join(","));
  const html = Mi.panel(c5, game);
  check("the brain viewer panel renders", /mindv/.test(html) && /places it knows/.test(html) && /ate apple/.test(html));
  Mi.remember(c5, game, "life", "<script>x</script>", 1.4);
  check("the panel escapes text", Mi.panel(c5, game).indexOf("<script>") < 0);
}

console.log("8. it all runs, and saves");
{
  const g = SB.Game.newGame(99); g.tutorial.done = true; SB.Game.current = g;
  const cs = SB.Debug.spawnTier(3, 6);
  for (let s = 0; s < 20 * 60 * 6; s++) SB.Game.step(g, SB.TICK);
  const smols = SB.Game.smols(g);
  check("living smols build memories", smols.some(c => c.mind && c.mind.ep.length > 0), smols.map(c => c.mind ? c.mind.ep.length : "-").join(" "));
  check("...and maps", smols.some(c => c.mind && c.mind.pl.length > 0), smols.map(c => c.mind ? c.mind.pl.length : "-").join(" "));
  check("...and replay buffers", smols.some(c => c._mt && c._mt.rb.length > 0));
  check("the thought line still reads", smols.every(c => typeof SB.Creature.thought(c, g) === "string"));
  const json = JSON.stringify(SB.Save.snapshot(g));
  check("working state (_mt) is not saved", json.indexOf("rbHead") < 0);
  const g2 = SB.Save.revive(JSON.parse(json));
  const a = cs.find(c => c.alive && c.mind.ep.length), b = a && SB.Game.byId(g2, a.id);
  check("memories and maps survive a save", b && b.mind.ep.length === a.mind.ep.length && b.mind.pl.length === a.mind.pl.length && b.mind.ep[0].w === a.mind.ep[0].w);
  check("...and the loaded smol has fresh working state", b && b._mt && Array.isArray(b._mt.rb) && b._mt.rb.length === 0);
  // an old save with no minds, and a corrupt one
  const old = JSON.parse(json);
  const list = old.creatures || (old.game && old.game.creatures) || [];
  list.forEach((c, i) => { if (i % 2) delete c.mind; else c.mind = { ep: "nope", pl: [{ k: 3 }, { k: "food", x: 1, z: 2, v: 0.5, t: 0, l: "ok" }], val: { food: "x", smol: 0.4 }, nr: "bad" }; });
  const g3 = SB.Save.revive(old);
  const ok = g3.creatures.filter(c => c.species === "smol").every(c => c.mind && Array.isArray(c.mind.ep) && Array.isArray(c.mind.pl) && c.mind.pl.every(p => typeof p.k === "string") && isFinite(c.mind.nr));
  check("old or broken minds load clean", list.length > 0 && ok);
  SB.Game.current = g3;
  for (let s = 0; s < 20 * 60; s++) SB.Game.step(g3, SB.TICK);
  check("and keep running", g3.creatures.every(c => isFinite(c.x) && isFinite(c.z)));
}

console.log(failed ? "\n" + failed + " FAILED" : "\nall mind tests passed");
process.exit(failed ? 1 : 0);
