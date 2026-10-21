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

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
