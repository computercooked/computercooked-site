/* smol brains — world + save tests (stubbed Game/Genome/Brain). Run: node games/smol-brains/tests/world.test.js */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const JS = path.join(__dirname, "..", "play", "js");
const store = {};
const ctx = {
  console, Math, Date, JSON, Object, Array, String, Number, Boolean, Error, isFinite, Float32Array, Uint8Array, ArrayBuffer,
  TextEncoder, TextDecoder,
  btoa: (s) => Buffer.from(s, "binary").toString("base64"),
  atob: (s) => Buffer.from(s, "base64").toString("binary"),
  localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } }
};
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ["core.js", "world.js", "save.js"]) vm.runInContext(fs.readFileSync(path.join(JS, f), "utf8"), ctx, { filename: f });
const SB = ctx.SB;

let failed = 0;
function check(name, ok, info) {
  console.log((ok ? "  ok   " : "  FAIL ") + name + (info ? "  (" + info + ")" : ""));
  if (!ok) failed++;
}

// ---- stubs for modules owned by other builders ----
let hatched = 0, grumpsSpawned = 0;
SB.Game = {
  newId: (g) => g.nextId++,
  byId: (g, id) => g.creatures.find((c) => c.id === id) || g.world.objects.find((o) => o.id === id) || null,
  unlock: (g, id) => { if (g.achievements[id]) return false; g.achievements[id] = 1; return true; },
  note: (g, t) => g.log.push({ t: g.time, text: t }),
  hatch: (g, egg) => { hatched++; SB.World.remove(g.world, egg); },
  spawnGrump: (g, x) => {
    grumpsSpawned++;
    const c = { id: g.nextId++, species: "grump", alive: true, x, y: SB.World.groundY(g.world, x), born: g.time };
    g.creatures.push(c);
    return c;
  }
};
SB.Genome = {
  random: (r) => ({ v: 1, species: "smol", gen: 1, genes: { a: r(), b: r() }, driveW: [0.1, 0.2], instincts: [], mutated: [] }),
  encode: (g) => JSON.stringify(g),
  decode: (s) => JSON.parse(s)
};
SB.Brain = {
  serialize: (b) => ({ nHid: b.nHid, w: Array.from(b.w) }),
  deserialize: (o) => ({ nHid: o.nHid, w: Float32Array.from(o.w) })
};

function newGame(seed) {
  const game = {
    v: 1, seed, time: 0, speed: 1, rng: SB.rng(seed), nextId: 1, world: null, creatures: [], selectedId: null,
    hand: { x: SB.HOME_X, y: 300, visible: false, tool: "grab", heldId: null, saying: null, sayT: 0 },
    family: {}, stats: { hatched: 0, eggsLaid: 0, maxGen: 1, wordsTaught: 0, tickles: 0, taps: 0, deaths: 0, bestIQ: 0, grumpNights: 0, cured: 0, imported: 0, exported: 0 },
    achievements: {}, tutorial: { step: 0, done: true }, log: []
  };
  game.world = SB.World.create(game);
  return game;
}

console.log("1. creation");
const game = newGame(4242);
const world = game.world;
check("ground length", world.ground.length === SB.WORLD_W / 10 + 1);
let gmin = 1e9, gmax = -1e9;
for (const v of world.ground) { gmin = Math.min(gmin, v); gmax = Math.max(gmax, v); }
check("ground in range", gmin >= 395 && gmax <= 505, gmin.toFixed(0) + ".." + gmax.toFixed(0));
check("decor generated", world.decor.length > 100, world.decor.length + " items");
const types = new Set(world.decor.map((d) => d.type));
check("decor types", ["tree", "pine", "mushroom_big", "lab_wall", "dock", "reeds", "cave_mouth", "crystal", "snowdrift", "nest"].every((t) => types.has(t)), [...types].join(","));
check("water", world.water.length === 1 && world.water[0].x0 > 3600 && world.water[0].x1 < 4500);
check("pads", world.pads.length === 2);
const kinds = (k) => SB.World.byKind(world, k).length;
check("fixed objects", kinds("grumpcave") === 1 && kinds("shroomring") === 2 && kinds("appletree") === 3 && kinds("bed") === 3 && kinds("incubator") === 1);
check("incubator near HOME_X-120", Math.abs(SB.World.byKind(world, "incubator")[0].x - (SB.HOME_X - 120)) < 1);
check("critters", kinds("butterfly") === 5 && kinds("beetle") === 5);
check("clock start 07:00", SB.World.clock(game).label === "Day 1 · 07:00", SB.World.clock(game).label);
check("regen deterministic", (() => {
  const g2 = { seed: 4242 }, w2 = { decor: [] };
  SB.World.regen(w2, g2);
  return w2.ground.every((v, i) => v === world.ground[i]) && w2.decor.length === world.decor.length;
})());
const machineFlat = SB.World.byKind(world, "snackbox")[0];
check("flat under machines", Math.abs(SB.World.slope(world, machineFlat.x)) < 0.01);

console.log("2. three days, no creatures");
const ev = {};
for (const e of ["night", "dawn", "day", "weather", "thunder", "spawn", "splash", "use"]) SB.bus.on(e, () => { ev[e] = (ev[e] || 0) + 1; });
const weatherSeen = new Set([world.weather.kind]);
let maxFood = 0, bad = null, maxHerb = 0, maxShroom = 0;
const t0 = Date.now();
const steps = Math.round((3 * SB.DAY_LENGTH) / SB.TICK);
for (let s = 0; s < steps; s++) {
  game.time += SB.TICK;
  SB.World.tick(world, SB.TICK, game);
  // grumps would be despawned by the creature module at dawn
  if (!world.night) game.creatures = game.creatures.filter((c) => c.species !== "grump");
  weatherSeen.add(world.weather.kind);
  if (s % 15 === 0) {
    let food = 0, herb = 0;
    for (const o of world.objects) {
      if (SB.KINDS[o.kind].noun === "food" && !o.kind.startsWith("shroom")) food++;
      if (o.kind === "herb") herb++;
      if (!isFinite(o.x) || !isFinite(o.y) || o.x < 0 || o.x > SB.WORLD_W || o.y < 0 || o.y > SB.WORLD_H) bad = bad || (o.kind + " " + o.x + "," + o.y);
    }
    for (const ring of SB.World.byKind(world, "shroomring")) maxShroom = Math.max(maxShroom, world.objects.filter((o) => o.kind.startsWith("shroom_") && Math.abs(o.x - ring.x) < 150).length);
    maxFood = Math.max(maxFood, food); maxHerb = Math.max(maxHerb, herb);
  }
  if (!isFinite(world.light) || world.light < 0 || world.light > 1) bad = bad || "light " + world.light;
}
const ms = Date.now() - t0;
check("perf", ms < 4000, ms + "ms for " + steps + " ticks, " + (ms / steps * 1000).toFixed(1) + "µs/tick");
check("no NaN / out of bounds", !bad, bad || "");
check("food capped", maxFood <= 14, "max " + maxFood);
check("herbs capped", maxHerb <= 3, "max " + maxHerb);
check("shrooms capped", maxShroom <= 6, "max " + maxShroom);
check("night/dawn events", ev.night >= 3 && ev.dawn >= 2, "night " + ev.night + " dawn " + ev.dawn);
check("day events", ev.day >= 2, String(ev.day));
check("weather changed", ev.weather >= 2 && weatherSeen.size >= 2, [...weatherSeen].join(","));
check("plants spawned", ev.spawn > 10, String(ev.spawn));
check("fish jumped", ev.splash >= 1, String(ev.splash || 0));
check("grumps spawned", grumpsSpawned >= 2 && grumpsSpawned <= 12, String(grumpsSpawned));
check("grumpNights counted + achievement", game.stats.grumpNights >= 2 && game.achievements.grump, String(game.stats.grumpNights));
check("critters persist", kinds("butterfly") >= 2 && kinds("beetle") >= 3, kinds("butterfly") + " / " + kinds("beetle"));
check("clock day 4", SB.World.clock(game).day === 4, SB.World.clock(game).label);

console.log("3. temperature");
const peakT = SB.World.tempAt(world, 4500 + 100), pondT = SB.World.tempAt(world, 3600 + 100);
const heater = SB.World.byKind(world, "heater")[0];
check("peak colder than pond", peakT < pondT, peakT.toFixed(2) + " < " + pondT.toFixed(2));
check("heater warms", SB.World.tempAt(world, heater.x) > peakT, SB.World.tempAt(world, heater.x).toFixed(2));

console.log("4. eggs");
const inc = SB.World.byKind(world, "incubator")[0];
const starter = SB.World.add(world, game, "egg", inc.x, SB.World.groundY(world, inc.x) - 30, { genome: SB.Genome.random(game.rng), progress: 0, starter: true });
const egg2 = SB.World.add(world, game, "egg", inc.x + 5, SB.World.groundY(world, inc.x) - 30, { genome: SB.Genome.random(game.rng), progress: 0 });
for (let s = 0; s < 30 * 30; s++) { game.time += SB.TICK; SB.World.tick(world, SB.TICK, game); }
check("starter waits for warmth", starter.data.progress === 0 && world.objects.includes(starter));
check("incubated egg progresses", egg2.data.progress > 0.3 && egg2.data.progress < 0.6, egg2.data.progress.toFixed(2));
const h0 = hatched;
for (let i = 0; i < 5; i++) SB.World.warmEgg(world, game, starter);
check("starter wobbles", starter.data.wobble > 0.5);
game.time += SB.TICK; SB.World.tick(world, SB.TICK, game);
check("starter hatched after 5 warms", hatched === h0 + 1 && !world.objects.includes(starter));
for (let s = 0; s < 60 * 30 && world.objects.includes(egg2); s++) { game.time += SB.TICK; SB.World.tick(world, SB.TICK, game); }
check("incubated egg hatches in ~75s", !world.objects.includes(egg2));

console.log("5. use");
const smol = { id: game.nextId++, species: "smol", alive: true, x: 0, y: 0, vocab: { wait: 1.2 }, holding: null, brain: { nHid: 2, w: new Float32Array([0.5, -1]) } };
game.creatures.push(smol);
const snack = SB.World.byKind(world, "snackbox")[0];
smol.x = snack.x - 30;
let r = SB.World.use(world, game, snack, "play", smol);
check("snackbox gives cake", r.msg === null && SB.World.byKind(world, "cake").length >= 1);
r = SB.World.use(world, game, snack, "play", smol);
check("snackbox cooldown", r.msg === "empty");
const cake = SB.World.byKind(world, "cake")[0];
r = SB.World.use(world, game, cake, "eat", smol);
check("eat cake", r.consumed && r.deltas.hunger === -0.6 && r.chem.glucose === 0.5 && !world.objects.includes(cake));
const rottenApple = SB.World.add(world, game, "apple", smol.x, undefined, { rotten: true });
r = SB.World.use(world, game, rottenApple, "eat", smol);
check("rotten food", r.consumed && r.chem.antigen >= 0.25 && r.deltas.pain > 0 && r.deltas.hunger > -0.45, JSON.stringify(r.deltas));
r = SB.World.use(world, game, SB.World.byKind(world, "computer")[0], "play", smol);
check("computer teaches", typeof r.teach === "string" && r.teach !== "wait", r.teach);
const padA = SB.Game.byId(game, world.pads[0]), padB = SB.Game.byId(game, world.pads[1]);
r = SB.World.use(world, game, padA, "play", smol);
check("teleporter", r.teleport === padB.x);
r = SB.World.use(world, game, SB.World.byKind(world, "trampoline")[0], "play", smol);
check("trampoline", r.jump && r.deltas.bored === -0.45);
const ball = SB.World.byKind(world, "ball")[0];
smol.x = ball.x - 10;
SB.World.use(world, game, ball, "play", smol);
check("ball kicked away", ball.vx === 350 && ball.vy === -250);
r = SB.World.use(world, game, SB.World.byKind(world, "plush")[0], "eat", smol);
check("eat non-edible does nothing", !r.consumed);
r = SB.World.use(world, game, SB.World.byKind(world, "heater")[0], "play", smol);
check("heater", r.deltas.cold === -0.5);
check("use events", ev.use >= 8, String(ev.use));

console.log("6. save / revive roundtrip");
SB.World.byKind(world, "appletree")[0].data.stock = 3;
check("save ok", SB.Save.save(game));
const raw = store["smolbrains-save-v1"];
check("save size", raw.length < 60000, raw.length + " bytes");
const data = SB.Save.load();
const g2 = SB.Save.revive(data);
check("objects restored", g2.world.objects.length === world.objects.length, g2.world.objects.length + " vs " + world.objects.length);
check("ground regenerated", g2.world.ground.every((v, i) => v === world.ground[i]) && g2.world.decor.length === world.decor.length);
check("weather/time restored", g2.world.weather.kind === world.weather.kind && g2.time === game.time && g2.world.dayIndex === world.dayIndex && g2.world.night === world.night);
check("rng state restored", g2.rng() === game.rng());
check("plant data restored", SB.World.byKind(g2.world, "appletree")[0].data.stock === 3);
check("nextId unique", g2.nextId >= game.nextId);
check("creature revived", g2.creatures.some((c) => c.species === "smol" && c.vocab.wait === 1.2));
for (let s = 0; s < 300; s++) { g2.time += SB.TICK; SB.World.tick(g2.world, SB.TICK, g2); }
check("revived world ticks", g2.world.objects.every((o) => isFinite(o.x) && isFinite(o.y)));
check("revive tolerates junk", (() => { const g = SB.Save.revive({ seed: 9 }); return g.world.objects.length > 20 && g.stats.hatched === 0; })());

console.log("7. smol codes");
const c = { name: "Bøbo 🐣", gen: 3, genome: SB.Genome.random(game.rng), brain: { nHid: 4, w: new Float32Array([0.1, -0.25, 0.5]) }, vocab: { eat: 0.987, food: 1.2, x: 0.01 }, age: 99999, born: 700, stats: { eaten: 3 } };
const code = SB.Save.exportSmol(c);
check("prefix", code.startsWith("SMOL1:"), code.length + " chars");
const back = SB.Save.importSmol("  " + code.slice(0, 20) + "\n" + code.slice(20) + "\n");
check("unicode name", back.name === "Bøbo 🐣", back.name);
check("fields", back.gen === 3 && back.vocab.eat === 0.99 && back.vocab.x === undefined && back.age === SB.STAGES[3].from && back.brain.w[1] === -0.25);
check("missing prefix ok", SB.Save.importSmol(code.slice(6)).name === "Bøbo 🐣");
let threw = false;
try { SB.Save.importSmol("hello world"); } catch (e) { threw = e.message === "not a smol code"; }
check("garbage throws", threw);

console.log(failed ? "\n" + failed + " FAILED" : "\nall ok");
process.exit(failed ? 1 : 0);
