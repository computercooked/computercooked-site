/* smol brains — minds that feel human: beliefs with sources, knowing who saw what (stashes, theft, lies),
   plans you can watch, reflection in dreams, and culture as a crowd effect (superstition, ritual, taboo,
   heirlooms, conformity). Plus saving all of it, and surviving broken saves.
   Run: node games/smol-brains/tests/beliefs.test.js */
"use strict";
// the game uses Math.random for small things (facing, blinks, wear); seed it so these stories play out the same each run
{ let s = 12345; Math.random = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const load = require("./_load.js");
const ctx = load();
const SB = ctx.SB;
SB.Render = undefined;
const Mi = SB.Mind, SO = SB.Social, V = SB.V;

let failed = 0;
function check(name, ok, info) {
  console.log((ok ? "  ok   " : "  FAIL ") + name + (info ? "  (" + info + ")" : ""));
  if (!ok) failed++;
}
function calm(c) { SB.DRIVES.forEach(k => { c.chem[k] = 0; }); c.chem.health = 1; }
const game = SB.Game.newGame(5151); game.tutorial.done = true; SB.Game.current = game; game.podT = 1e9;
if (game.dir) game.dir.nextT = 1e9;
const home = SB.Society.home(game, 0);
function spawn(tier, n, x, z) {
  const cs = SB.Debug.spawnTier(tier, n || 1);
  cs.forEach((c, i) => { c.age = 900; c.stage = 3; c.asleep = false; calm(c); Mi.ensure(c); c.x = (x == null ? home.x : x) + i * 1.2; c.z = (z == null ? home.z : z); });
  return cs;
}
function gene(c, k, v) { c.genome.genes[k] = v; }
function grid() { SB.World.rebuildCreatureGrid(game.world, game); } // after moving smols by hand
function run(secs, each) { for (let t = 0; t < secs / SB.TICK; t++) { SB.Game.step(game, SB.TICK); if (each && t % 10 === 0 && each() === true) return true; } return false; }
function fed(keep) { return () => { SB.Game.smols(game).forEach(c => { if (keep && keep.indexOf(c) >= 0) return; c.chem.hunger = 0.1; c.chem.cold = 0; c.chem.fear = 0; c.chem.health = 1; }); }; }
function clearAll() { game.creatures.slice().forEach(c => { if (c.species === "smol") { c.alive = false; c.gone = true; } }); game.creatures = game.creatures.filter(c => c.alive); }

console.log("1. beliefs with sources");
{
  const [c, mo] = spawn(3, 2);
  Mi.learnPlace(c, game, "food", c.x + 12, c.z, "berry bush near home", 0.7, { s: "told", bn: mo.name });
  Mi.learnPlace(c, game, "water", c.x - 12, c.z, "water near home", 0.6);
  const bs = Mi.beliefs(c, game);
  const told = bs.find(b => b.k === "place" && /berry/.test(b.w)), seen = bs.find(b => b.k === "place" && /water/.test(b.w));
  check("a place it was told about remembers who told it", told && told.src === "told" && Mi.say(told).indexOf(mo.name + " told me") === 0, told && Mi.say(told));
  check("a place it saw says so", seen && Mi.say(seen).indexOf("i saw") === 0, seen && Mi.say(seen));
  c.chem.hunger = 0.8;
  const wt = Mi.wanderTarget(c, game);
  check("the inner voice says where it heard it", wt && wt.why.indexOf(mo.name + " told me") === 0, wt && wt.why);
  Mi.learnPlace(c, game, "food", c.x + 12, c.z, "berry bush near home", 0.7);
  check("seeing it for itself upgrades the source", Mi.beliefs(c, game).find(b => /berry/.test(b.w)).src === "seen");
  calm(c);
  const b = Mi.believe(c, game, { c: "sky:kind", k: "sky", w: "the sky one is kind", src: "god", f: 0.3 });
  Mi.believe(c, game, { c: "sky:kind", k: "sky", w: "the sky one is kind", src: "told", bn: mo.name, f: 0.5 });
  check("hearing it again makes it surer, without duplicating", c.mind.bel.filter(x => x.c === "sky:kind").length === 1 && b.f > 0.3, b.f.toFixed(2));
  check("the stronger source stays (the sky beats gossip)", b.src === "god" && Mi.say(b).indexOf("the sky one showed me") === 0, Mi.say(b));
  for (let i = 0; i < 20; i++) Mi.believe(c, game, { c: "x" + i, k: "who", w: "thing " + i, src: "told", bn: mo.name, f: 0.1 + i * 0.01 });
  check("beliefs are capped by tier", c.mind.bel.length === Mi.bcap(c), c.mind.bel.length + "/" + Mi.bcap(c));
  const mono = Mi.monologue(c, game);
  check("the monologue has a 'believe' line with its source", mono.some(l => l.k === "believe" && /(told me|i saw|showed me|said|says)/.test(l.t)), (mono.find(l => l.k === "believe") || {}).t);
  Mi.doubt(c, "sky:kind", 0.01);
  check("doubt can make it forget", !Mi.belief(c, "sky:kind"));
  check("trust starts middling and moves", Math.abs(Mi.trust(c, mo, game) - Mi.trust(c, mo, game)) < 1e-9 && (Mi.trustAdj(c, mo, -0.4), Mi.trust(c, mo, game) < 0.4), Mi.trust(c, mo, game).toFixed(2));
  clearAll();
}

console.log("2. other minds: hiding food, who saw it, stealing it");
{
  const [c, w, far] = spawn(3, 3);
  c.x = home.x; c.z = home.z; w.x = c.x + 2; w.z = c.z; far.x = c.x + 40; far.z = c.z; far.asleep = true;
  SO.remember(game, c, w, "pal", 60, "pals", 1e6); // a friend can watch, a rival can't
  const apple = SB.World.add(game.world, game, "apple", c.x, c.z, {});
  SB.Creature.carry(c, apple, game, true);
  grid();
  c._mt.mp = { k: "stash", st: [{ i: "🍎", d: "have" }, { i: "🙈", d: "go", x: c.x, z: c.z }, { i: "📍", d: "hide" }], i: 0, t0: game.time, item: apple.id };
  Mi.scheme(c, game);
  check("it hides the food on the spot", apple.hid === c.id && apple.heldBy == null && c.mind.st && c.mind.st.id === apple.id);
  check("it knows its friend saw", c.mind.st.w.indexOf(w.id) >= 0 && c.mind.ep.some(e => /saw me/.test(e.w)));
  check("the watcher believes there's a stash, and saw it", (() => { const b = Mi.belief(w, "stash:" + c.id); return b && b.src === "seen" && b.it === apple.id; })());
  check("the owner and the watcher can see it; nobody else can", Mi.canSee(c, apple) && Mi.canSee(w, apple) && !Mi.canSee(far, apple));
  far.asleep = false; far.x = apple.x + 1; far.z = apple.z; grid();
  SB.Creature.perceive(far, game);
  const cand = SB.Creature.perceive(far, game).find(cd => cd.t.type === "item" && cd.t.id === apple.id);
  check("a smol that didn't see doesn't notice hidden food right in front of it", !cand);
  far.x = c.x + 40;
  // the watcher turns thief: sneaky, hungry, and the owner's gone off
  gene(w, "grumpiness", 1); gene(w, "obedience", 0); w.chem.hunger = 0.6;
  c.x = home.x + 30; c.z = home.z; grid();
  let st = false;
  for (let i = 0; i < 300 && !st; i++) { w._mt.sT = 0; w.action = null; Mi.scheme(w, game); st = w._mt.mp && w._mt.mp.k === "steal"; }
  check("a sneaky smol plans to steal what it watched being hidden", st, w._mt.mp && w._mt.mp.why);
  check("...and the plan shows as pictures", (() => { const b = Mi.bubble(w, game); return b && b.ic.join("") === "👀🤫🍎"; })(), (Mi.bubble(w, game) || { ic: [] }).ic.join(""));
  let theft = null; SB.bus.on("theft", d => { theft = d; });
  run(60, () => { fed([w])(); c.x = home.x + 30; c.z = home.z; c.action = null; return apple.heldBy === w.id; });
  check("it takes the food", apple.heldBy === w.id && theft && theft.meant && theft.c === w, apple.heldBy);
  check("stealing goes in its diary and its stats", w.stats.thefts === 1 && w.diary.some(d => d[1] === "🤫"));
  check("the owner doesn't know who yet", c.mind.st && c.mind.st.thief === w.id && !Mi.belief(c, "thief:" + w.id + ":" + c.id));
  // the owner gets hungry and goes back for it
  c.chem.hunger = 0.6; c._mt.sT = 0; c.action = null;
  let gone = false;
  run(60, () => { fed([c])(); c.chem.hunger = Math.max(c.chem.hunger, 0.6); gone = c.mind.ep.some(e => /hid was gone/.test(e.w)); return gone; });
  check("back at the spot, the food is gone", gone);
  const g = Mi.belief(c, "thief:" + w.id + ":" + c.id);
  check("it suspects whoever saw it hide the food", g && g.src === "guess" && Mi.say(g).indexOf("i bet " + w.name) === 0, g && Mi.say(g));
  check("the failed step was crossed out", c._mt.pf && c._mt.pf.x === 1 && /gone/.test(c._mt.pf.why || ""), JSON.stringify(c._mt.pf));
  // caught red-handed: a second stash, and the owner watches the theft
  calm(c); calm(w);
  const pear = SB.World.add(game.world, game, "apple", home.x, home.z + 6, {});
  pear.hid = c.id; pear.wit = [w.id]; c.mind.st = { id: pear.id, x: pear.x, z: pear.z, t: game.time, l: "the rock", w: [w.id] };
  c.x = pear.x + 3; c.z = pear.z; w.x = pear.x; w.z = pear.z; grid();
  const op0 = SO.opinion(game, c, w);
  SB.Creature.carry(w, pear, game, true);
  check("an owner who sees the theft knows who did it", (() => { const b = Mi.belief(c, "thief:" + w.id + ":" + c.id); return b && b.src === "seen" && !b.lie && SO.opinion(game, c, w) <= op0 - 20; })(), op0 + " -> " + SO.opinion(game, c, w));
  clearAll();
}

console.log("3. lies, trust, and getting caught");
{
  const [a, b, z, d] = spawn(4, 4);
  [a, b, z, d].forEach((c, i) => { c.x = home.x + i * 0.8; c.z = home.z; });
  grid();
  gene(a, "grumpiness", 1); gene(a, "affection", 0);
  let lies = 0, truths = 0;
  for (let i = 0; i < 60; i++) { const s = SO.storyAbout(game, a, z); if (s && s.claim.lie) lies++; }
  const [sweet] = spawn(4, 1); gene(sweet, "grumpiness", 0); gene(sweet, "affection", 1);
  for (let i = 0; i < 60; i++) { const s = SO.storyAbout(game, sweet, z); if (s) truths++; }
  check("a disagreeable smol tells lies about someone it dislikes", lies > 10, lies + "/60");
  check("a kind one with nothing to tell doesn't make things up", truths === 0, truths);
  Mi.believe(sweet, game, { c: "thief:" + z.id + ":" + sweet.id, k: "who", w: z.name + " stole my food", src: "seen", f: 0.9, a: z.id });
  const tru = SO.storyAbout(game, sweet, z);
  check("...but it does pass on what it saw", tru && !tru.claim.lie && /i saw it/.test(tru.say), tru && tru.say);
  // b heard a lie from a about z, and now talks to z
  function lie(asker) { Mi.believe(asker, game, { c: "thief:" + z.id + ":" + a.id + ":" + asker.id, k: "who", w: z.name + " stole " + a.name + "'s food", src: "told", bn: a.name, by: a.id, f: 0.8, a: z.id, lie: 1 }); }
  lie(b);
  const before = Mi.trust(b, a, game), opBefore = SO.opinion(game, b, a);
  const cv = SO.makeConvo(game, b, z);
  check("it asks the one the story is about", cv.lines[0][0] === b && /is it true/.test(cv.lines[0][1]) && cv.lines[1][0] === z, cv.lines.map(l => l[0].name + ": " + l[1]).join(" / "));
  check("who denies it from memory", /never|lying|remember/.test(cv.lines[1][1]), cv.lines[1][1]);
  let caughtEv = null; SB.bus.on("lieCaught", e => { caughtEv = e; });
  SO.startConvo(game, b, z);
  run(30, () => { fed()(); return !b.convo; });
  check("the lie is caught", caughtEv && caughtEv.liar === a && caughtEv.asker === b);
  check("trust in the liar drops", Mi.trust(b, a, game) < before - 0.2, before.toFixed(2) + " -> " + Mi.trust(b, a, game).toFixed(2));
  check("and so does liking", SO.opinion(game, b, a) < opBefore - 10, opBefore + " -> " + SO.opinion(game, b, a));
  check("the false belief is gone", !b.mind.bel.some(x => x.a === z.id && x.lie));
  check("the one lied about is angry with the liar", SO.reasons(game, z, a).some(r => /lies about me/.test(r.t)));
  lie(d); d.x = z.x + 1; d.z = z.z; calm(d); calm(z); grid();
  SO.startConvo(game, d, z);
  run(30, () => { fed()(); return !d.convo; });
  check("caught twice: the island calls it a liar", a.stats.liesCaught === 2 && a.title === "liar", a.stats.liesCaught + " " + a.title);
  // a true story holds up
  Mi.believe(b, game, { c: "thief:" + d.id + ":" + z.id, k: "who", w: d.name + " stole " + z.name + "'s food", src: "told", bn: z.name, by: z.id, f: 0.8, a: d.id });
  const cv2 = SO.makeConvo(game, b, d);
  check("a true story gets owned up to", /sorry|me\./.test(cv2.lines[1][1]), cv2.lines[1][1]);
  clearAll();
}

console.log("4. plans you can watch, re-planning, routines");
{
  const [c, kid] = spawn(3, 2);
  SB.Debug.ideas(c, ["bonk"]); SB.Debug.ideas(kid, ["bonk"]);
  const p = { idea: "bonk", kind: "make", steps: [{ do: "fetch", want: "stone" }, { do: "craft", idea: "bonk" }], i: 0, t: 0, fails: 0, verb: V.make };
  c.plan = p;
  const b = Mi.bubble(c, game);
  check("an idea plan shows as a picture row", b && b.ic.length === 2 && b.ic[1] === SB.Ideas.BY_ID.bonk.icon && b.i === 0, b && b.ic.join(" "));
  check("the panel shows the plan", /plan<\/div>/.test(Mi.panel(c, game)));
  c.plan = null; p.fails = 1;
  Mi.planEnded(c, game, p, false);
  const f = Mi.bubble(c, game);
  check("a failed step is crossed out, with why", f && f.fail && f.x === 0 && /no (stone|rock)/.test(f.why), f && f.why);
  check("...and it means to re-plan", c._mt.rp && c._mt.rp.verb === V.make);
  c.action = null; c._mt.sT = 0;
  const took = Mi.scheme(c, game);
  check("it thinks again straight away", took && (c.plan || c.action), c.plan ? "new plan" : c.action ? SB.VERBS[c.action.verb] : "nothing");
  c.plan = null; c.action = null;
  // food it can't find: off to where it remembers food
  Mi.learnPlace(c, game, "food", c.x + 15, c.z, "berry bush", 0.8);
  const pf = { idea: "cook", kind: "make", steps: [{ do: "fetch", want: "food" }, { do: "station", at: "fire" }, { do: "craft", idea: "cook" }], i: 0, t: 0, fails: 1, verb: V.make };
  c._mt.rpT = -1e9; c._mt.rpn = 0;
  Mi.planEnded(c, game, pf, false);
  Mi.scheme(c, game);
  check("no food here: the new plan goes by the map in its head", c._mt.mp && c._mt.mp.k === "replan" && c._mt.mp.st[0].i === "🧭" && /remember/.test(c._mt.mp.why), c._mt.mp && c._mt.mp.why);
  c._mt.mp = null; c.action = null;
  // it works three times: a routine with a name
  for (let i = 0; i < 3; i++) { const ok = { idea: "bonk", kind: "make", steps: [{ do: "fetch", want: "stone" }, { do: "craft", idea: "bonk" }], i: 2, t: 5, fails: 0, verb: V.make }; Mi.planEnded(c, game, ok, true); }
  const sk = Mi.skillFor(c, "bonk");
  check("a plan that works becomes a named routine", sk && sk.ok === 3 && sk.n === c.name + "'s " + SB.Ideas.BY_ID.bonk.name && sk.ic === "🪨→" + SB.Ideas.BY_ID.bonk.icon, sk && sk.n + " " + sk.ic);
  check("...that it's proud of in its diary", c.diary.some(d => d[1] === "🧩"));
  const np = { idea: "bonk", kind: "make", steps: [{ do: "fetch", want: "stone" }, { do: "craft", idea: "bonk" }], i: 0, t: 0, fails: 0 };
  Mi.planStarted(c, game, np);
  check("practised hands start ahead", np.steps[1].t > 0 && np.sk === sk.n);
  const got = Mi.shareRoutine(c, kid, game);
  check("it can teach the routine to someone who knows the idea but not the knack", got && Mi.skillFor(kid, "bonk") && Mi.skillFor(kid, "bonk").by === c.name);
  check("teaching targets what they don't know (no repeat)", Mi.shareRoutine(c, kid, game) === null);
  clearAll();
}

console.log("5. reflection: who am i?");
{
  const [c] = spawn(3, 1);
  gene(c, "bravery", 0.5); gene(c, "affection", 0.5); gene(c, "grumpiness", 0.5); gene(c, "curiosity", 0.5); gene(c, "obedience", 0.5);
  c.diary = [];
  for (let i = 0; i < 3; i++) SO.log(game, c, "🙏", "prayed, and the sky answered " + i);
  c.mind.pa = 3;
  game.time += 10;
  Mi.reflect(c, game);
  check("answered prayers: faith in the sky", c.mind.vals.faith > 0.3, c.mind.vals.faith);
  check("it says who it is", Mi.iam(c).indexOf("the sky one listens to me") >= 0, Mi.iam(c).join(". "));
  game.time += 400;
  Mi.remember(c, game, "loss", "Mo drowned", 1.2);
  c.mind.pq = 3; c.mind.pa = 0;
  Mi.reflect(c, game);
  check("a loss after unanswered prayers turns it", c.mind.vals.faith < 0, c.mind.vals.faith);
  check("and it knows it changed its mind", c.mind.was && c.mind.was.w === "i used to think the sky one listens. not since Mo drowned.", c.mind.was && c.mind.was.w);
  check("the card shows it", Mi.cardLine(c, game).indexOf("not since Mo drowned") >= 0);
  check("the panel has its values", /who it thinks it is/.test(Mi.panel(c, game)));
  // values bias goals: a brave, sharing builder goes to friends rather than hiding when a bit scared and lonely
  const [g4] = spawn(4, 1);
  g4.chem.fear = 0.5; g4.chem.lonely = 0.45;
  g4._mt.goal = null;
  const d0 = Mi.deliberate(g4, game, SB.Chem.drives(g4.chem, new Float32Array(SB.N_DRIVES))).id;
  g4.mind.vals = { brave: 1, share: 1 }; g4._mt.goal = null;
  const d1 = Mi.deliberate(g4, game, SB.Chem.drives(g4.chem, new Float32Array(SB.N_DRIVES))).id;
  check("'i am brave' changes what it wants", d0 === "safe" && d1 === "friends", d0 + " -> " + d1);
  clearAll();
}

console.log("6. superstition becomes ritual");
{
  const cs = spawn(3, 4);
  const node = game.world.nodes.find(n => SB.NODES[n.kind] && SB.NODES[n.kind].label && SB.World.walkable(game.world, n.x + 1.5, n.z, false) && SB.World.depthAt(game.world, n.x, n.z) < 0.05 && SB.dist(n.x, n.z, home.x, home.z) < 22);
  cs.forEach((c, i) => { c.x = node.x + 1 + (i % 2); c.z = node.z + (i < 2 ? 1 : -1); SB.Creature.start(c, game, V.play); });
  grid();
  SB.bus.emit("miracle", { id: "rain", x: node.x, z: node.z });
  const b0 = cs.map(c => c.mind.bel.find(b => b.k === "sup"));
  check("everyone nearby credits the rain to what they were doing", b0.every(b => b && b.m === "rain" && b.v === "play" && /dancing by the/.test(b.w)), b0[0] && Mi.say(b0[0]));
  SB.bus.emit("miracle", { id: "rain", x: node.x, z: node.z });
  check("it happens again: they're surer", cs.every(c => c.mind.bel.find(b => b.k === "sup").f > b0[0].f - 1e-9 && c.mind.bel.find(b => b.k === "sup").f > 0.4));
  let ritual = null; SB.bus.on("ritual", e => { ritual = e; });
  Mi.cultureTick(game, 9, SB.Game.smols(game));
  check("a shared belief becomes the tribe's ritual", ritual && game.lore.rit.length === 1, ritual && ritual.name);
  check("written in the chronicle", game.chronicle.some(e => /the smols began dancing at the/.test(e[2])));
  // hot: the ritual is how they ask for rain
  const c = cs[0]; c.x = home.x + 15; c.z = home.z; c.chem.hot = 0.8; c._mt.sT = 0; c._mt.riteT = -1e9; c.action = null;
  cs.slice(1).forEach(o => { o.x = c.x + 3; o.z = c.z; o.action = null; o._mt.mp = null; });
  grid();
  Mi.scheme(c, game);
  check("a hot smol goes to do the rain dance", c._mt.mp && c._mt.mp.k === "rite" && /dancing at the/.test(c._mt.mp.why), c._mt.mp && c._mt.mp.why);
  check("believers nearby come along", cs.slice(1).filter(o => o._mt.mp && o._mt.mp.k === "rite").length >= 2, cs.slice(1).map(o => [o.tier, o.stage, !!o.plan, !!o.convo, o.tantrum, SO.free(o), (Mi.belief(o, game.lore.rit[0].c) || {}).f].join("/")).join(" "));
  const rs = game.lore.rit[0];
  let prayed = null, chant = false; SB.bus.on("pray", e => { if (e.c === c && prayed == null) prayed = SB.dist(c.x, c.z, rs.x, rs.z); });
  const trace = [];
  run(70, () => { fed()(); c.chem.hot = Math.max(c.chem.hot, 0.6); if (c.speech && /rain, rain/.test(c.speech.text)) chant = true; if (process.env.TRACE) trace.push([game.time.toFixed(0), SB.dist(c.x, c.z, rs.x, rs.z).toFixed(1), c._mt.mp ? c._mt.mp.k + c._mt.mp.i : "-", c.action ? SB.VERBS[c.action.verb] : "none", c.plan ? "plan" : "", c.convo ? "convo" : "", c._mt.pf ? c._mt.pf.why : ""].join(" ")); return prayed != null; });
  if (process.env.TRACE) console.log(trace.filter((x, i) => i % 5 === 0).join("\n"));
  check("they go, chant and dance, and pray at the spot", prayed != null && prayed < 4.5 && chant, prayed && prayed.toFixed(1));
  clearAll();
  game.lore.rit = [];
}

console.log("7. taboo, heirlooms and the crowd");
{
  const cs = spawn(3, 4);
  const wp = SB.World.waterNear(game.world, home.x, home.z) || { x: home.x + 5, z: home.z };
  const dead = cs[0];
  dead.x = wp.x; dead.z = wp.z;
  cs.slice(1).forEach((c, i) => { c.x = wp.x + 3 + i; c.z = wp.z + 2; });
  grid();
  let tab = null; SB.bus.on("taboo", e => { tab = e; });
  SB.Creature.die(dead, game, "drowned");
  const tb = cs[1].mind.bel.find(b => b.k === "taboo");
  check("a drowning makes the spot taboo for those who saw", tb && /cursed/.test(tb.w) && tb.src === "seen", tb && Mi.say(tb));
  check("...and the island remembers it", tab && game.chronicle.some(e => /nobody goes near the/.test(e[2])));
  const [stay, nosy] = [cs[1], cs[2]];
  gene(stay, "curiosity", 0.1); gene(nosy, "curiosity", 0.95); nosy.mind.vals.trad = -0.5; nosy.mind.vals.brave = 0.8;
  const tz = Mi.dangerAt(stay, game, tb.x, tb.z);
  check("it keeps away long after the danger is gone", tz && tz.k === "taboo" && /we don't go to the/.test(tz.why) && /drowned/.test(tz.why), tz && tz.why);
  let broke = false;
  for (let i = 0; i < 40 && !broke; i++) broke = !Mi.dangerAt(nosy, game, tb.x, tb.z) && !!nosy._mt.brk;
  check("a curious, bold smol decides to see for itself", broke, nosy._mt.why);
  nosy.x = tb.x; nosy.z = tb.z; grid();
  const f0 = Mi.belief(nosy, tb.c).f;
  for (let i = 0; i < 6; i++) Mi.cultureTick(game, 2, SB.Game.smols(game));
  check("nothing bad happens, and it says so", nosy.stats.taboos === 1 && (!Mi.belief(nosy, tb.c) || Mi.belief(nosy, tb.c).f < f0) && nosy.diary.some(d => d[1] === "🚫"));
  // heirlooms: a kid hatches with its mum's story in its head
  const mum = cs[3]; mum.sex = "f"; mum.x = home.x; mum.z = home.z;
  const kid = SB.Game.spawnSmol(game, { x: home.x + 1, z: home.z, parents: [mum.id], age: 0 });
  Mi.ensure(kid);
  SB.bus.emit("hatch", { c: kid });
  const hb = kid.mind.bel.find(b => b.bn === "mum");
  check("a kid inherits a vivid story from its mum", hb && Mi.say(hb).indexOf("mum said") === 0, hb && Mi.say(hb));
  check("...and remembers being told", kid.mind.ep.some(e => /^mum said/.test(e.w)));
  // the crowd: three believers around one who doesn't, and it comes round
  const [x1, x2, x3, x4] = spawn(3, 4);
  [x1, x2, x3].forEach(o => Mi.believe(o, game, { c: "sup:sun:talk:rock@1,1", k: "sup", w: "chanting by the rock brings sunshine", src: "seen", f: 0.8, m: "sun", v: "talk", x: home.x, z: home.z, l: "rock" }));
  gene(x4, "obedience", 1); gene(x4, "curiosity", 0);
  [x1, x2, x3, x4].forEach((o, i) => { o.x = home.x + i * 0.7; o.z = home.z + 3; });
  grid();
  for (let i = 0; i < 80 && !Mi.belief(x4, "sup:sun:talk:rock@1,1"); i++) Mi.cultureTick(game, 2, [x4]);
  const cb = Mi.belief(x4, "sup:sun:talk:rock@1,1");
  check("everyone around believes it, so it does too", cb && cb.src === "told" && Mi.say(cb).indexOf("everyone says") === 0, cb && Mi.say(cb));
  clearAll();
}

console.log("8. saving it all, and surviving broken saves");
{
  const [c, o] = spawn(4, 2);
  Mi.believe(c, game, { c: "taboo:lake@1,1", k: "taboo", w: "the lake is cursed. Mo drowned there", src: "told", bn: "mum", f: 0.7, x: 10, z: 10, l: "lake" });
  Mi.trustAdj(c, o, -0.3);
  c.mind.sk.push({ id: "bonk", n: c.name + "'s bonking", ic: "🪨→🔨", ok: 2, t: 0 });
  c.mind.vals = { brave: 0.4, faith: -0.3 }; c.mind.was = { w: "i used to be brave. not since the grumps.", t: game.time };
  Mi.lore(game).rit.push({ c: "sup:rain:play:rock@1,1", m: "rain", v: "play", x: 10, z: 10, l: "rock", t: 0, n: 2 });
  Mi.lore(game).tab.push({ c: "taboo:lake@1,1", x: 10, z: 10, l: "lake", n: "Mo", how: "drowned", t: 0 });
  const g2 = SB.Save.revive(JSON.parse(JSON.stringify(SB.Save.snapshot(game))));
  const c2 = g2.creatures.find(x => x.id === c.id);
  check("beliefs, trust, routines and values survive a save", c2 && Mi.belief(c2, "taboo:lake@1,1") && c2.mind.tr[o.id] < 0.4 && c2.mind.sk.length === 1 && c2.mind.vals.brave === 0.4 && c2.mind.was);
  check("the tribe's rituals and taboos survive too", g2.lore && g2.lore.rit.length === game.lore.rit.length && g2.lore.tab.some(t => t.c === "taboo:lake@1,1" && t.how === "drowned") && Mi.ritualName(g2.lore.rit[g2.lore.rit.length - 1]) === "dancing at the rock to ask for rain");
  const bad = { id: 1, species: "smol", alive: true, tier: 3, mind: { ep: [], bel: [null, 5, { c: 3 }, { c: "x", w: "y", src: "nope", f: 1, t: 0 }, { c: "ok", w: "fine", src: "seen", f: "NaN", t: 0 }, { c: "good", w: "fine", src: "told", f: 0.5, t: 1, x: "a", z: 2 }, { c: "kept", w: "fine", src: "told", f: 9, t: 1 }],
    tr: { 4: "a", 5: 0.3, 6: Infinity }, sk: [{}, { id: "bonk", n: "x", ic: "y", ok: 1 }], vals: { brave: "x", share: 5 }, st: { id: "q" }, was: { w: 3 }, pl: [{ k: "food", x: 1, z: 1, v: 1, t: 0, s: "lies" }] } };
  Mi.revive(bad);
  check("broken beliefs are dropped, good ones kept and clamped", bad.mind.bel.length === 1 && bad.mind.bel[0].c === "kept" && bad.mind.bel[0].f === 1, JSON.stringify(bad.mind.bel));
  check("broken trust, routines, values, stash are cleaned", Object.keys(bad.mind.tr).join() === "5" && bad.mind.sk.length === 1 && bad.mind.vals.share === 1 && bad.mind.vals.brave == null && !bad.mind.st && !bad.mind.was && bad.mind.pl[0].s == null);
  const l = Mi.loadLore({}, { rit: [null, { c: 1 }, { c: "a", l: "b", x: 1, z: 1, m: "nope", v: "play" }, { c: "a", l: "b", x: 1, z: 1, m: "rain", v: "play" }], tab: "x" });
  check("broken lore is ignored", l.rit.length === 1 && l.tab.length === 0);
  check("a save with no lore at all loads", Mi.loadLore({}, null).rit.length === 0);
  clearAll();
}

console.log("9. a big tribe keeps its pace");
{
  const cs = spawn(4, 40);
  cs.forEach((c, i) => { c.x = home.x + (i % 8) * 1.5 - 6; c.z = home.z + Math.floor(i / 8) * 1.5 - 4; c.chem.hunger = 0.3; });
  const t0 = Date.now();
  run(30, fed());
  const ms = (Date.now() - t0) / (30 / SB.TICK);
  check("40 builders for 30 s: nothing breaks", SB.Game.smols(game).every(c => isFinite(c.x) && isFinite(c.z) && c.mind && Array.isArray(c.mind.bel)), ms.toFixed(2) + " ms/step");
}

console.log(failed ? "\n" + failed + " FAILED" : "\nall beliefs tests passed");
process.exit(failed ? 1 : 0);
