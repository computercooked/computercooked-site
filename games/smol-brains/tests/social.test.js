// Social life: opinions with reasons, shoves vs punches, rivals fighting, gossip, conversations,
// graves and grief, titles, the chronicle, tantrums, and saving all of it.
// node games/smol-brains/tests/social.test.js
"use strict";
const load = require("./_load.js");
const ctx = load();
const SB = ctx.SB;
const SO = SB.Social;

let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }

const game = SB.Game.newGame(41);
SB.Game.current = game;
game.tutorial.done = true;
game.creatures = [];
const [a, b, c, d] = [4, 4, 4, 4].map(t => SB.Debug.spawnTier(t, 1)[0]);
[a, b, c, d].forEach((s, i) => { s.x = game.world.T.spawn.x + i * 1.2; s.z = game.world.T.spawn.z; s.asleep = false; s.chem.anger = 0; });

console.log("1. opinions come from what happens, with reasons");
const o0 = SO.opinion(game, b, a);
SB.Creature._hitFx(a, b, game);
const o1 = SO.opinion(game, b, a);
check("a shove makes b like a less", o1 < o0, o0 + " → " + o1);
check("…and b remembers why", SO.reasons(game, b, a).some(r => /shoved me/.test(r.t)), SO.reasons(game, b, a).map(r => r.t + " " + r.v).join(", "));
SO.onGive(game, c, b, SB.World.add(game.world, game, "apple", b.x, b.z, {}));
check("sharing food makes a friend", SO.opinion(game, b, c) > SO.opinion(game, b, a) + 15, SO.opinion(game, b, c) + " vs " + SO.opinion(game, b, a));

console.log("2. shoves vs punches");
const pain0 = d.chem.pain;
SB.Creature._hitFx(c, d, game); // not rivals: a shove
const shove = d.chem.pain - pain0;
for (let i = 0; i < 4; i++) SO.remember(game, a, d, "test" + i, -20, "test grudge", 9999);
const pain1 = d.chem.pain;
SB.Creature._hitFx(a, d, game); // rivals: a punch
const punch = d.chem.pain - pain1;
check("rivals punch much harder than an annoyed shove", punch > shove * 2, "shove " + shove.toFixed(2) + ", punch " + punch.toFixed(2));
check("the victim holds a grudge", d.grudge && d.grudge.id === a.id);

console.log("3. rivals fight when they meet");
const r1 = SB.Debug.spawnTier(3, 1)[0], r2 = SB.Debug.spawnTier(3, 1)[0];
r1.x = r2.x = game.world.T.spawn.x + 8; r1.z = game.world.T.spawn.z + 4; r2.z = r1.z + 0.8;
for (let i = 0; i < 4; i++) { SO.remember(game, r1, r2, "x" + i, -25, "stole my berries", 9999); SO.remember(game, r2, r1, "y" + i, -25, "called me a grump", 9999); }
r1.chem.anger = r2.chem.anger = 0.3;
let hits = 0;
SB.bus.on("hit", e => { if ((e.c === r1 && e.target === r2) || (e.c === r2 && e.target === r1)) hits++; });
for (let t = 0; t < 300 / 0.1; t++) { game.time += 0.1; SO.tick(game, 0.1); [r1, r2].forEach(s => SB.Creature.tick(s, 0.1, game)); if (SB.dist(r1.x, r1.z, r2.x, r2.z) > 3) { r2.x = r1.x; r2.z = r1.z + 0.8; } }
check("they come to blows", hits >= 1, hits + " hits in 5 min");
const f1 = SB.Debug.spawnTier(3, 1)[0], f2 = SB.Debug.spawnTier(3, 1)[0];
f1.x = f2.x = game.world.T.spawn.x - 8; f1.z = game.world.T.spawn.z + 4; f2.z = f1.z + 0.8;
for (let i = 0; i < 3; i++) { SO.remember(game, f1, f2, "p" + i, 25, "best pals", 9999); SO.remember(game, f2, f1, "q" + i, 25, "best pals", 9999); }
let fh = 0;
SB.bus.on("hit", e => { if ((e.c === f1 && e.target === f2) || (e.c === f2 && e.target === f1)) fh++; });
for (let t = 0; t < 90 / 0.1; t++) { game.time += 0.1; SO.tick(game, 0.1); [f1, f2].forEach(s => SB.Creature.tick(s, 0.1, game)); if (SB.dist(f1.x, f1.z, f2.x, f2.z) > 3) { f2.x = f1.x; f2.z = f1.z + 0.8; } }
check("best friends don't", fh === 0, fh + " hits");

console.log("4. conversations at the builder age, with gossip");
for (let i = 0; i < 3; i++) SO.remember(game, a, c, "z" + i, -20, "stole my berries", 9999);
SO.remember(game, a, b, "pals", 70, "old pals", 9999); SO.remember(game, b, a, "pals", 70, "old pals", 9999); // friends gossip; strangers often trade insults
const bc0 = SO.opinion(game, b, c) + SO.opinion(game, b, d);
let gossiped = false, lines = 0;
for (let k = 0; k < 40 && !gossiped; k++) {
  a.convo = b.convo = null; a.action = b.action = null; a.chem.anger = b.chem.anger = 0;
  const cv = SO.startConvo(game, a, b);
  if (!cv) continue;
  lines = Math.max(lines, cv.lines.length);
  if (cv.topic === c.name || cv.topic === d.name) gossiped = true;
  for (let t = 0; t < 40 && a.convo; t += 0.5) { game.time += 0.5; SO.convoTick(game, a, 0.5); }
}
check("builders hold multi-line conversations", lines >= 4, lines + " lines");
check("they gossip about a third smol", gossiped);
const bc1 = SO.opinion(game, b, c) + SO.opinion(game, b, d);
check("gossip changes what the listener thinks", bc1 !== bc0, bc0 + " → " + bc1);
check("it's in the diary", (a.diary || []).some(e => /talked with|argued with/.test(e[2])));

console.log("5. graves, grief and the chronicle");
for (let i = 0; i < 3; i++) SO.remember(game, b, d, "w" + i, 20, "my friend", 9999);
const graves0 = game.world.structures.filter(s => s.kind === "grave").length;
SB.Creature.die(d, game, "old");
check("the body keeps an epitaph for its funeral (funeral.js digs the grave)", d.body && /here lies/.test(d.body.epitaph) && game.world.structures.filter(s => s.kind === "grave").length === graves0, d.body && d.body.epitaph);
check("friends grieve", b.grief && b.grief.id === d.id && b.diary.some(e => /lost/.test(e[2])));
check("the island remembers", (game.chronicle || []).some(e => e[2].indexOf(d.name) >= 0));

console.log("6. titles");
a.stats.grumpsChased = 1; SO.checkTitle(game, a);
check("chasing a grump earns a title", a.title === "grump-chaser", a.title);

console.log("7. tantrums");
const t1 = SB.Debug.spawnTier(2, 1)[0];
t1.chem.anger = 0.95;
let tantrums = 0; SB.bus.on("tantrum", e => { if (e.c === t1) tantrums++; });
for (let i = 0; i < 60; i++) { game.time += 2; SO.tick(game, 2); t1.chem.anger = 0.95; if (t1.tantrum) break; }
check("a furious smol throws a tantrum", tantrums >= 1 && !!t1.tantrum);

console.log("8. it all saves");
const snap = JSON.parse(JSON.stringify(SB.Save.snapshot(game)));
const g2 = SB.Save.revive(snap);
const b2 = g2.creatures.find(x => x.id === b.id);
check("a body still waiting for its funeral gets a grave on load", g2.world.structures.some(s => s.kind === "grave" && s.data && s.data.name === d.name && /here lies/.test(s.data.epitaph)));
check("opinions, diary and chronicle survive a save", b2 && b2.ops && b2.ops[a.id] && b2.diary.length === b.diary.length && g2.chronicle.length === game.chronicle.length);

console.log("9. love: slow, earned, and only between partners");
{
  const S = load().SB, L = S.Social, C = S.Creature;
  const gm = S.Game.newGame(43); S.Game.current = gm; gm.tutorial.done = true;
  gm.world.items.filter(o => o.kind === "egg").forEach(o => S.World.remove(gm.world, o));
  const sp = gm.world.T.spawn;
  const town = S.Debug.spawnTier(4, 16); // a builder village, big enough that nothing is hurried
  town.forEach((s, i) => { s.x = sp.x + (i % 4) * 1.3; s.z = sp.z + Math.floor(i / 4) * 1.3; s.asleep = false; s.age = 900; s.stage = 3; s.chem.hunger = 0.1; s.chem.anger = 0; s.chem.love = 0; s.partner = null; });
  const fs = town.filter(s => s.sex === "f"), ms = town.filter(s => s.sex === "m");
  const [ula, ana] = fs, [bren, odo] = ms;
  const sn = () => S.Game.smols(gm).length;
  // love grows slowly, and only in a settled smol
  gm.world.season = 1; ula.chem.hunger = 0.1;
  const k = C.loveK(ula, gm), rate = S.Chem.LOVE_RATE * k * (0.5 + (ula.genome.genes.fertility ?? 0.5));
  check("a settled grown-up takes minutes, not seconds, to fall in love", k > 0 && 0.45 / rate > 150, (0.45 / rate).toFixed(0) + " s to smitten");
  ana.chem.hunger = 0.7; ana._lkT = null;
  check("a hungry one doesn't fall in love at all", C.loveK(ana, gm) === 0);
  ana.chem.hunger = 0.1; ana._lkT = null; gm.world.season = 3; const kw = C.loveK(ana, gm); gm.world.season = 0; ana._lkT = null; const ks = C.loveK(ana, gm); gm.world.season = 1;
  check("spring is the season for it, winter isn't", ks > kw * 2.5, "spring " + ks.toFixed(2) + ", winter " + kw.toFixed(2));
  // friends hug: no hearts. partners and parents with their kids: hearts
  check("a hug between friends is a smile, not hearts", !L.intimate(gm, ula, odo) && !C.heartsFor(ula, { type: "creature", ref: odo }, gm));
  // courtship: a few good moments, then partners
  [[ula, bren], [bren, ula]].forEach(p => L.remember(gm, p[0], p[1], "talk", 30, "nice talks", 9999));
  ula.chem.love = 0.6; bren.chem.love = 0.5;
  let steps = 0;
  for (let i = 0; i < 6 && ula.partner !== bren.id; i++) { gm.time += 30; if (L.court(gm, ula, bren, i % 2 ? "meal" : "talk")) steps++; }
  check("two who like each other court a few times, then become partners", ula.partner === bren.id && bren.partner === ula.id && steps >= 2, steps + " moments");
  check("…which goes in their diaries and the chronicle", ula.diary.some(e => /courting|courting me/.test(e[2])) && (gm.chronicle || []).some(e => /partners now/.test(e[2])));
  check("now their cuddles get hearts", L.intimate(gm, ula, bren) && C.heartsFor(ula, { type: "creature", ref: bren }, gm));
  // turned down
  [[odo, ana], [ana, odo]].forEach(p => L.remember(gm, p[0], p[1], "punched", -40, "punched me", 9999));
  odo.chem.love = 0.7; ana.chem.love = 0.1;
  L.court(gm, odo, ana, "give");
  check("someone who can't stand you turns you down, and it stings", !odo.partner && L.reasons(gm, odo, ana).some(r => /turned me down/.test(r.t)) && odo.chem.love < 0.7);
  // only partners lay eggs, and an egg costs something
  const eggs = () => gm.world.items.filter(o => o.kind === "egg").length;
  for (let i = 0; i < 24; i++) S.World.add(gm.world, gm, "apple", sp.x + 25 + (i % 6), sp.z + 25 + Math.floor(i / 6), {}); // food put by (a big colony needs some before it has babies)
  const [eve, rob] = [fs[2], ms[2]]; eve.chem.love = rob.chem.love = 0.9; eve.eggCooldown = rob.eggCooldown = 0;
  gm.stats.maxTier = 3; // (no housing rule before the builders)
  const e0 = eggs(); C._tryBreed(eve, rob, gm, 0.9);
  check("two in love who aren't partners lay no egg", eggs() === e0);
  ula.chem.love = bren.chem.love = 0.9; ula.eggCooldown = bren.eggCooldown = 0; ula.chem.fat = 0.6;
  const fat0 = ula.chem.fat;
  C._tryBreed(ula, bren, gm, 0.9);
  check("partners do", eggs() === e0 + 1);
  check("the next one is 12 minutes away at the least (a quarter-hour or so, egg to egg)", ula.eggCooldown >= 700 && ula.eggCooldown <= 1000, Math.round(ula.eggCooldown) + " s");
  check("an egg costs the mother", ula.chem.fat < fat0 - 0.2, fat0.toFixed(2) + " → " + ula.chem.fat.toFixed(2));
  // housing: from the builder age on, no egg without a bed for it
  gm.stats.maxTier = 4; odo.ideas.hut = 1; // (someone knows how to raise a hut)
  gm.world.structures.filter(s => s.kind === "hut" || s.kind === "house").forEach(s => S.World.removeStructure(gm.world, s));
  const room0 = S.Civ.room(gm); let full = 0; S.bus.on("noRoom", () => full++);
  ula.chem.love = bren.chem.love = 0.9; ula.eggCooldown = bren.eggCooldown = 0;
  const e1 = eggs(); C._tryBreed(ula, bren, gm, 0.9);
  check("a full village (" + sn() + " smols, room for " + room0 + ") has no eggs", eggs() === e1 && full === 1);
  const hm = S.Society.home(gm, 0);
  for (let i = 0; i < 5; i++) S.World.addStructure(gm.world, gm, "hut", hm.x + 12 + i * 3, hm.z + 12, { done: true, tribe: 0 });
  ula.eggCooldown = bren.eggCooldown = 0; ula.chem.love = bren.chem.love = 0.9;
  for (let i = 0; i < 3; i++) S.World.add(gm.world, gm, "apple", ula.x, ula.z, {});
  C._tryBreed(ula, bren, gm, 0.9);
  check("five huts later there's room again", S.Civ.room(gm) > sn() && eggs() === e1 + 1, "room " + S.Civ.room(gm));
  // jealousy and break-ups
  [[bren, odo], [odo, bren]].forEach(p => L.remember(gm, p[0], p[1], "punched", -30, "punched me", 9999));
  [[ula, odo], [odo, ula]].forEach(p => L.remember(gm, p[0], p[1], "talk", 30, "nice talks", 9999));
  bren.x = ula.x + 2; bren.z = ula.z; bren.asleep = false; odo.x = ula.x + 0.5; odo.z = ula.z;
  for (let i = 0; i < 8 && ula.partner === bren.id; i++) { gm.time += 60; L.onCuddle(gm, ula, odo); }
  check("a partner who sees a hug they don't like gets jealous", L.reasons(gm, bren, ula).some(r => /right in front of me/.test(r.t)));
  check("…and more than once is a break-up", ula.partner == null && bren.partner == null && (gm.chronicle || []).some(e => /split up/.test(e[2])));
  // widows wait a day
  const [w1, w2] = [fs[3], ms[3]]; L.bond(gm, w1, w2);
  S.Creature.die(w2, gm, "old");
  check("a widow grieves before loving again", w1.partner == null && w1.widowT > gm.time + 600 && !L.court(gm, w1, odo, "talk"));
  // the duty drive: grown-ups want to be useful in the day
  const idle = fs[4] || ms[4]; idle.duty = 0; idle.plan = null; idle.action = null; idle.asleep = false; gm.world.night = false;
  for (let i = 0; i < 100; i++) C.dutyTick(idle, 1, gm);
  const up = idle.duty; idle.plan = { kind: "build", steps: [], i: 0 };
  for (let i = 0; i < 20; i++) C.dutyTick(idle, 1, gm);
  check("idling builds a wish to be useful, and work settles it", up > 0.3 && idle.duty < up - 0.3, up.toFixed(2) + " → " + idle.duty.toFixed(2));
  idle.plan = null;
  const sv = S.Save.revive(JSON.parse(JSON.stringify(S.Save.snapshot(gm))));
  check("partners, courtships and widows survive a save", sv.creatures.some(x => x.id === w1.id && x.widowT === w1.widowT) && sv.creatures.find(x => x.id === eve.id));
  // talkers live longer (fewer eggs): new ones, and ones from a save made before this
  const old = JSON.parse(JSON.stringify(S.Save.snapshot(gm))), oc = old.creatures.find(x => x.id === eve.id);
  delete oc.lifeX; oc.lifespan = 2700; oc.age = 2200;
  const ev2 = S.Save.revive(old).creatures.find(x => x.id === eve.id);
  check("a talker lives longer, and stays grown-up longer (old saves too)", eve.lifeX && ev2.lifespan > 3500 && ev2.stage === 3, Math.round(ev2.lifespan) + " s");
}

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
