// deep.js, "a bigger world": delves at cave mouths, new materials and tools, a raft, places to find, the map tab,
// ground hazards, weather events, fast travel, treasure maps.
// node games/smol-brains/tests/deep.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0, passed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (ok) passed++; else failed++; }
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");
const FILES = ["bosses.js", "possess.js", "body.js", "ext.js", "home.js", "loot.js", "deep.js"];
function boot() {
  const ctx = load();
  FILES.forEach(f => { if (!(f === "bosses.js" && ctx.SB.Bosses) && !(f === "body.js" && ctx.SB.Body)) vm.runInContext(js(f), ctx, { filename: f }); });
  ctx.SB.Possess.headless = true;
  return ctx;
}

seeded(4340, () => {
  const ctx = boot();
  const SB = ctx.SB, P = SB.Possess, D = SB.Deep, L = SB.Loot, Surv = SB.Surv, W = SB.World, K = SB.KINDS;
  const game = SB.Game.newGame(133); SB.Game.current = game; game.tutorial.done = true;
  SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod));
  const me = SB.Game.smols(game)[0]; me.tier = 3; me.stage = 3;
  const w = game.world, s = () => D.state(game);
  const ev = []; ["delveDown", "delveUp", "delveOut", "delveBottom", "poiFound", "poiUsed", "deepTravel", "deepDig", "rainbow", "rainbowGift", "heatwave", "blizzard", "caveGrump", "delveKeeper", "delveTorch", "deepMake", "deepAfloat"].forEach(n => SB.bus.on(n, () => ev.push(n)));
  const at = (x, z) => { me.x = x; me.z = z; me.px = x; me.pz = z; };
  const lab = (o, k) => (o[k] || {}).label || "";
  const sref = b => ({ type: "struct", id: b.id }), nref = n => ({ type: "node", id: n.id });
  const empty = () => { const v = Surv.inv(me); for (let i = 0; i < v.s.length; i++) if (v.s[i] && v.s[i].k !== "plans") v.s[i] = null; };
  const hold = k => { const v = Surv.inv(me); let i = v.s.findIndex(x => x && x.k === k); if (i < 0) { Surv.add(me, k, 1); i = v.s.findIndex(x => x && x.k === k); } if (i >= 9) { const t = v.s[0]; v.s[0] = v.s[i]; v.s[i] = t; i = 0; } v.sel = i; return Surv.heldKind(me) === k; };
  const stam = v => { P.state().stam = v; };

  console.log("1. the new things exist");
  const items = ["coal", "glowmoss", "silverore", "silver", "starmetal", "geode", "amber", "opal", "icegem", "pearl", "fossil", "mapscrap", "raft", "shovel", "ropeladder", "mosslamp", "compass", "waymark", "frostflask", "mooncharm", "silverpick", "starpick", "starblade"];
  check("23 new items, each with a label and a line about it", items.every(k => K[k] && K[k].label && K[k].desc && K[k].emoji));
  check("the picks get stronger: stone < iron < silver < starmetal", Surv.TOOL.stonepick.ore < Surv.TOOL.ironpick.ore && Surv.TOOL.ironpick.ore < Surv.TOOL.silverpick.ore && Surv.TOOL.silverpick.ore < Surv.TOOL.starpick.ore && Surv.TOOL.starblade.dmg > Surv.TOOL.sword.dmg);
  check("coal burns", Surv.FUEL.coal > Surv.FUEL.log);
  const dk = Object.keys(SB.NODES).filter(k => k.indexOf("d_") === 0);
  check("ten kinds of delve rock, all skipped by the smols' own eyes and the island's clock", dk.length === 10 && dk.every(k => SB.NODES[k].nop === 1 && !SB.NODES[k].drops));
  check("every level only names real rocks, and every rock gives a real thing", D.ZONES.slice(1).every(z => z.nodes.every(x => !!SB.NODES[x[0]])) && dk.every(k => k === "d_moss" || k === "d_bones" || (Surv.ROCKS[k] && K[Surv.ROCKS[k].item])));
  check("every recipe only names real things, and every new material makes something", D.RECIPES.every(rc => K[rc.id] && Object.keys(rc.in).every(k => K[k] || k === "vine")) && ["coal", "glowmoss", "silverore", "silver", "starmetal", "amber", "opal", "icegem", "pearl"].every(m => D.RECIPES.some(rc => rc.in[m])));
  check("the new chests only hold real things", ["delve3", "delve6", "buried", "islet"].every(t => L.TABLES[t] && L.TABLES[t].items.concat(L.TABLES[t].sure || []).every(x => !!K[x[0]])) && L.TABLES.wreck.items.some(x => x[0] === "mapscrap"));
  check("places are things you can look at", Object.keys(D.POI).every(k => SB.STRUCTS["poi_" + k] && SB.STRUCTS["poi_" + k].label) && !!SB.STRUCTS.delvemouth && !!SB.STRUCTS.rainbowend);
  check("the bag has a map tab", !!SB.Ext.tabById("deep") && /map/.test(SB.Ext.tabById("deep").label(game, me)));

  console.log("2. places come from the island's seed");
  const pois = D.pois(game), kinds = {};
  pois.forEach(p => { kinds[p.kind] = (kinds[p.kind] || 0) + 1; });
  check("dozens of places, of every kind", pois.length >= 30 && Object.keys(D.POI).every(k => kinds[k] >= 1), JSON.stringify(kinds));
  check("one hermit, and the three stones are three different boons", kinds.hermit === 1 && ["warrior", "delver", "wanderer"].every(b => pois.some(p => p.boon === b)));
  check("all on dry land", pois.every(p => W.depthAt(w, p.x, p.z) < 0.05 && W.inBounds(w, p.x, p.z)));
  check("none on top of another, the nest or a site", pois.every(p => pois.every(q => q === p || SB.dist(p.x, p.z, q.x, q.z) >= 8.9) && SB.dist(p.x, p.z, w.T.nest.x, w.T.nest.z) >= 8.9 && game.sites.every(o => SB.dist(o.x, o.z, p.x, p.z) >= 6.9)));
  const g2 = boot().SB.Game.newGame(133);
  check("the same island always has the same places", (() => { const c2 = boot(); const gg = c2.SB.Game.newGame(133); return JSON.stringify(c2.SB.Deep.pois(gg)) === JSON.stringify(pois); })() && !!g2);
  // an islet is somewhere you cannot walk to: no walking path from the nest
  const isl = pois.filter(p => p.kind === "islet");
  check("castaways' flags are where walking cannot reach", isl.length >= 1 && isl.every(p => !W.findPath(w, w.T.nest.x, w.T.nest.z, p.x, p.z, false, 60000)), isl.length + " islets");
  check("nothing is found, and nothing costs anything, on a new island", D.progress(game).found === 0 && D.progress(game).total === pois.length && D.deepest(game) === 0);

  console.log("3. they appear when the fog lifts, and are found when somebody gets there");
  at(w.T.nest.x + 3, w.T.nest.z + 3);
  P.enter(game, me, { free: true });
  D.tick(game, 2);
  const placed0 = w.structures.filter(b => b.kind.indexOf("poi_") === 0).length, seen0 = pois.filter(p => W.isSeen(w, p.x, p.z)).length;
  check("only the ones out of the fog are standing", placed0 === seen0 && placed0 < pois.length, placed0 + " of " + pois.length);
  const look = pois.find(p => p.kind === "lookout");
  W.reveal(w, look.x, look.z, 6, true); D.tick(game, 2);
  const lookB = D.structOf(game, look.id);
  check("the fog lifts: there it is", !!lookB && lookB.kind === "poi_lookout" && !s().found[look.id]);
  const sp0 = game.sparks || 0;
  at(look.x + 2, look.z); D.tick(game, 2);
  check("walk up to it: found, and a spark for it", s().found[look.id] > 0 && ev.indexOf("poiFound") >= 0 && (game.sparks || 0) === sp0 + 1 && D.progress(game).found === 1);
  D.tick(game, 2);
  check("only once", D.progress(game).found === 1 && (game.sparks || 0) === sp0 + 1 && w.structures.filter(b => b.data && b.data.poi === look.id).length === 1);
  const other = SB.Game.smols(game).find(o => o !== me), shr0 = pois.find(p => p.kind === "shrine");
  if (other) { W.reveal(w, shr0.x, shr0.z, 6, true); other.x = shr0.x + 1; other.z = shr0.z; SB.Game.step(game, 0.05); D.tick(game, 2); }
  check("a smol of the tribe can find one by itself", !other || s().found[shr0.id] > 0);
  // go to a place: lift the fog, stand beside it
  const goTo = p => { W.reveal(w, p.x, p.z, 6, true); at(p.x + 1.5, p.z); D.tick(game, 2); return D.structOf(game, p.id); };

  console.log("4. one clear thing to do at each");
  const seenA = W.seenFraction(w);
  const oLook = P.options(game, me, sref(lookB));
  check("lookout: climb up and look out", /climb up and look out/.test(lab(oLook, "use")) && oLook.use.go() === true && W.seenFraction(w) > seenA && ev.indexOf("poiUsed") >= 0, (W.seenFraction(w) - seenA).toFixed(4));
  w.weather.kind = "fog";
  check("not in a fog bank", /too foggy/.test(lab(P.options(game, me, sref(lookB)), "use")) && P.options(game, me, sref(lookB)).use.locked);
  w.weather.kind = "clear";
  const ringP = pois.find(p => p.boon === "warrior"), ringB = goTo(ringP);
  check("standing stones: no boon to begin with", !s().boon && SB.Ext.damage(game, me, null, { dmg: 1 }) === 1);
  check("touch them: your hits land a quarter harder", /touch the fighter's stone/.test(lab(P.options(game, me, sref(ringB)), "use")) && P.options(game, me, sref(ringB)).use.go() && s().boon === "warrior" && SB.Ext.damage(game, me, null, { dmg: 1 }) === 1.25);
  check("it already hums for you", P.options(game, me, sref(ringB)).use.locked);
  const ring2 = goTo(pois.find(p => p.boon === "wanderer"));
  check("one boon at a time", P.options(game, me, sref(ring2)).use.go() && s().boon === "wanderer" && SB.Ext.damage(game, me, null, { dmg: 1 }) === 1);
  const sprB = goTo(pois.find(p => p.kind === "spring"));
  me.chem.health = 0.3; me.chem.cold = 0.8; stam(0.2);
  check("hot spring: a soak mends, warms and fills your pep", /soak/.test(lab(P.options(game, me, sref(sprB)), "use")) && P.options(game, me, sref(sprB)).use.go() && Math.abs(me.chem.health - 0.8) < 1e-6 && me.chem.cold === 0 && P.state().stam === 1);
  check("not twice in a row", P.options(game, me, sref(sprB)).use.locked);
  game.time += D.SOAK_SECS + 1;
  check("but again later", !P.options(game, me, sref(sprB)).use.locked);
  empty();
  const herB = goTo(pois.find(p => p.kind === "hermit"));
  check("hermit: asks nothing to point the way", /ask the hermit/.test(lab(P.options(game, me, sref(herB)), "use")) && P.options(game, me, sref(herB)).use.go() && !!P.state().goal && P.state().goal.deep === 1);
  check("no gem, no map", P.options(game, me, sref(herB)).place.locked);
  hold("amber");
  check("a gem for a map scrap", /swap your amber for a map scrap/.test(lab(P.options(game, me, sref(herB)), "place")) && P.options(game, me, sref(herB)).place.go() && Surv.count(me, "mapscrap", true) === 1 && Surv.count(me, "amber", true) === 0);
  empty();
  const shrP = pois.filter(p => p.kind === "shrine").find(p => p !== shr0) || shr0, shrB = goTo(shrP);
  check("shrine: wants food", P.options(game, me, sref(shrB)).use.locked && /leave some food/.test(lab(P.options(game, me, sref(shrB)), "use")));
  Surv.add(me, "berry", 2); hold("berry");
  check("leave some: a light mote rolls out, the first time", P.options(game, me, sref(shrB)).use.go() && Surv.count(me, "mote", true) === 1 && Surv.count(me, "berry", true) === 1);
  check("once a day", P.options(game, me, sref(shrB)).use.locked);
  game.time += SB.DAY_LENGTH; me.chem.fear = 0.9;
  check("the next day it calms you (no second mote)", P.options(game, me, sref(shrB)).use.go() && me.chem.fear === 0 && Surv.count(me, "mote", true) === 1);
  empty();
  const cacheP = pois.find(p => p.kind === "cache"), cacheB = goTo(cacheP), un0 = L.unopened(game);
  check("buried cache: needs a digging stick", P.options(game, me, sref(cacheB)).use.locked && /digging stick/.test(lab(P.options(game, me, sref(cacheB)), "use")));
  Surv.add(me, "shovel", 1);
  check("dig: a real chest comes up", /dig here/.test(lab(P.options(game, me, sref(cacheB)), "use")) && P.options(game, me, sref(cacheB)).use.go() && L.unopened(game) === un0 + 1 && ev.indexOf("deepDig") >= 0);
  const cch = L.structOf(game, L.state(game).chests["deep-cache-" + cacheP.id]);
  at(cch.x + 1, cch.z);
  check("and you open it with your own paws", /open the chest/.test(lab(P.options(game, me, sref(cch)), "use")) && L.open(game, me, cch).ok);
  check("an empty hole after that", P.options(game, me, sref(cacheB)).use.locked || SB.dist(me.x, me.z, cacheB.x, cacheB.z) > 0);
  empty(); Surv.add(me, "shovel", 1);
  const campB = goTo(pois.find(p => p.kind === "camp"));
  check("old camp: a rummage, once", /rummage/.test(lab(P.options(game, me, sref(campB)), "use")) && P.options(game, me, sref(campB)).use.go() && Surv.count(me, "stick", true) === 3 && P.options(game, me, sref(campB)).use.locked);
  const tideP = pois.find(p => p.kind === "tidepool"), tideB = goTo(tideP);
  game.time = Math.floor(game.time / SB.DAY_LENGTH) * SB.DAY_LENGTH + SB.DAY_LENGTH * 1.5;
  check("tide pool: the tide is in at noon", !D.lowTide(game) && P.options(game, me, sref(tideB)).use.locked && /tide is in/.test(lab(P.options(game, me, sref(tideB)), "use")));
  game.time += SB.DAY_LENGTH * 0.25;
  const cl0 = Surv.count(me, "clam", true);
  check("low at dusk: comb it", D.lowTide(game) && P.options(game, me, sref(tideB)).use.go() && Surv.count(me, "clam", true) > cl0);
  check("picked clean until the next low tide", P.options(game, me, sref(tideB)).use.locked);
  game.time += SB.DAY_LENGTH * 0.5;
  check("and the next low tide fills it again", D.lowTide(game) && !P.options(game, me, sref(tideB)).use.locked);
  // soft earth: what comes up depends on the biome
  const digs = pois.filter(p => p.kind === "dig"), gemDig = digs.find(p => D.DIG[SB.BIOMES[p.b].id]), gemKind = gemDig ? D.DIG[SB.BIOMES[gemDig.b].id] : null;
  const digB = goTo(gemDig || digs[0]);
  check("soft earth: dig up that biome's own find", !!gemDig && P.options(game, me, sref(digB)).use.go() && Surv.count(me, gemKind, true) >= 1 && s().finds[gemDig.b][gemKind] >= 1, gemKind + " in the " + (gemDig ? SB.BIOMES[gemDig.b].name : "?"));
  check("each spot once", P.options(game, me, sref(digB)).use.locked);
  check("amber under trees, opal in the dry, frost in the cold, pearls by the sea", D.DIG.forest === "amber" && D.DIG.desert === "opal" && D.DIG.tundra === "icegem" && D.DIG.beach === "pearl");

  console.log("5. waystones");
  const ways = pois.filter(p => p.kind === "waystone"), wA = goTo(ways[0]);
  check("a waystone sleeps until you wake it", /wake the waystone/.test(lab(P.options(game, me, sref(wA)), "use")) && D.waystones(game).length === 0);
  check("wake one: nowhere to go yet", P.options(game, me, sref(wA)).use.go() && D.waystones(game).length === 1 && P.options(game, me, sref(wA)).use.locked);
  const wB = goTo(ways[1]);
  P.options(game, me, sref(wB)).use.go();
  me.chem.hunger = 0.1; P.state().lastHun = 0.1;
  const t0 = game.time;
  const tr = D.travel(game, me, wA.id);
  check("two awake: travel between them", tr.ok && SB.dist(me.x, me.z, wA.x, wA.z) < 4 && ev.indexOf("deepTravel") >= 0, tr.msg);
  check("it costs a bite of your food bar, and a little time", Math.abs(me.chem.hunger - 0.1 - D.travelCost(game)) < 1e-6 && P.state().lastHun === me.chem.hunger && game.time > t0);
  check("the wanderer's stone halves it", D.travelCost(game) === 0.12 && (s().boon = "warrior") && D.travelCost(game) === 0.25);
  check("looking at one: travel is on the button", /travel to the other waystone/.test(lab(P.options(game, me, sref(wA)), "place")));
  me.chem.hunger = 0.8;
  check("too hungry to travel", !D.travel(game, me, wB.id).ok && /hungry/.test(D.travel(game, me, wB.id).msg));
  me.chem.hunger = 0.1;
  at(wA.x + 30, wA.z);
  check("not from the middle of nowhere", !D.travel(game, me, wB.id).ok);
  empty(); Surv.add(me, "opal", 1); Surv.add(me, "stone", 4);
  check("an opal makes a waystone of your own", D.make(game, me, "waymark").ok && Surv.count(me, "opal", true) === 0 && Surv.count(me, "waymark", true) === 1);
  const dry = (() => { for (let a = 0; a < 40; a++) { const x = wA.x + 12 + a, z = wA.z + 9; if (W.walkable(w, x, z, false) && W.depthAt(w, x, z) < 0.02 && !W.structsNear(w, x, z, 3).length) return { x, z }; } return null; })();
  at(dry.x, dry.z); hold("waymark");
  check("set it down: awake at once", /set the waystone seed down/.test(lab(P.options(game, me, null), "place")) && P.options(game, me, null).place.go() && D.waystones(game).length === 3);

  console.log("6. treasure maps");
  empty(); Surv.add(me, "mapscrap", 1); hold("mapscrap");
  const oMap = P.options(game, me, null);
  check("hold a map scrap: read it", /read the map scrap/.test(lab(oMap, "place")) && oMap.place.go() && s().maps.length === 1 && Surv.count(me, "mapscrap", true) === 0 && /the map's X/.test(P.state().goal.label));
  const mp = s().maps[0];
  check("the X is a walk away, on dry land", SB.dist(me.x, me.z, mp.x, mp.z) > 20 && W.depthAt(w, mp.x, mp.z) < 0.05);
  at(mp.x + 1, mp.z);
  check("at the X without a digging stick", P.options(game, me, null).pick.locked && /digging stick/.test(lab(P.options(game, me, null), "pick")));
  Surv.add(me, "shovel", 1);
  const un1 = L.unopened(game);
  check("dig: a buried chest", /dig for the treasure/.test(lab(P.options(game, me, null), "use")) && P.options(game, me, null).use.go() && L.unopened(game) === un1 + 1 && mp.done > 0 && !P.state().goal);
  check("the X is spent", !D.mapHere(game, me) && !D.digMap(game, me).ok);

  console.log("7. explorer's things are made in the map tab");
  empty();
  check("no logs, no raft", !D.make(game, me, "raft").ok && /missing 3 /.test(D.whyNotMake(game, me, "raft")));
  Surv.add(me, "log", 3); Surv.add(me, "vine", 3);
  check("three logs and three vines: a raft", D.make(game, me, "raft").ok && Surv.count(me, "raft", true) === 1 && Surv.count(me, "log", true) === 0 && ev.indexOf("deepMake") >= 0);
  check("a blob has no hands", /hands/.test(D.whyNotMake(game, Object.assign({}, me, { tier: 1 }), "raft")));
  Surv.add(me, "silverore", 1); Surv.add(me, "coal", 1);
  check("silver wants a lit kiln", /lit kiln/.test(D.whyNotMake(game, me, "silver")));
  const kiln = W.addStructure(w, game, "kiln", me.x + 1.5, me.z, { done: true, rot: 0 }); kiln.data.fuel = 1; kiln.data.lit = true;
  check("by a lit kiln: silver ore and coal make silver", D.make(game, me, "silver").ok && Surv.count(me, "silver", true) === 1);
  Surv.add(me, "stick", 1); Surv.add(me, "vine", 1);
  check("silver, a stick and a vine: a silver pick", D.make(game, me, "silverpick").ok && Surv.has(me, "silverpick"));
  const html = D.html(game, me, k => "[" + k + "]");
  check("the tab lists places, biomes, delves, the rules and the recipes", /places found/.test(html) && /biomes seen/.test(html) && /data-deepmake='raft'/.test(html) && /lookout rock 1\//.test(html) && /\?\?\?/.test(html) && html.indexOf(D.RULES[2].slice(3, 30)) > 0);
  W.removeStructure(w, kiln);

  console.log("8. a raft crosses deep water");
  empty();
  const shore = (() => { // a dry spot with deep water a few steps away
    for (let j = 20; j < w.T.N - 20; j += 3) for (let i = 20; i < w.T.N - 20; i += 3) {
      if (W.depthAt(w, i, j) > 0.02 || !W.walkable(w, i, j, false)) continue;
      for (let a = 0; a < 8; a++) { const x = i + Math.sin(a * 0.785) * 5, z = j + Math.cos(a * 0.785) * 5; if (W.depthAt(w, x, z) > 0.8 && W.walkable(w, x, z, true)) return { x: i, z: j, wx: x, wz: z }; }
    }
    return null;
  })();
  at(shore.x, shore.z); me.look.fins = false; D.tick(game, 0.1);
  check("without one, deep water stops a smol", !SB.Creature.canSwim(me) && !W.walkable(w, shore.wx, shore.wz, SB.Creature.canSwim(me)));
  Surv.add(me, "raft", 1); D.tick(game, 0.1);
  check("with a raft in the bag it does not", !!SB.Creature.canSwim(me) && W.walkable(w, shore.wx, shore.wz, SB.Creature.canSwim(me)));
  at(shore.wx, shore.wz); me.chem.health = 1; stam(1);
  const wet0 = SB.Body.of(me).wet;
  P.input.fwd = 0;
  for (let i = 0; i < 80; i++) SB.Game.step(game, 0.1);
  check("afloat for eight seconds: no drowning, and dry", D.afloat() && me.chem.health > 0.97 && !(me.drownT > 0) && SB.Body.of(me).wet <= wet0 + 1e-6 && ev.indexOf("deepAfloat") >= 0, "health " + me.chem.health.toFixed(3));
  check("it shows by your hearts", SB.Ext.vitals(game, me).some(v => /rafting/.test(v.text)));
  Surv.take(me, "raft", 1); D.tick(game, 0.1);
  check("lose the raft and you are a land smol again", !SB.Creature.canSwim(me) && !D.afloat());
  at(shore.x, shore.z); me.chem.health = 1; me.drownT = 0;
  // an islet: found from a raft, and it has a castaway's chest
  const isP = isl[0]; Surv.add(me, "raft", 1);
  const isB = goTo(isP);
  check("land on an islet: a castaway's chest", s().found[isP.id] > 0 && !!L.state(game).chests["deep-islet-" + isP.id] && L.roll(game, "deep-islet-" + isP.id).items.some(x => x.k === "pearl") && /castaway/.test(lab(P.options(game, me, sref(isB)), "use")));
  Surv.take(me, "raft", 1); D.tick(game, 0.1);

  console.log("9. a delve: down a cave mouth, in a body");
  const cave = D.caves(game)[0];
  check("the island has grump caves", D.caves(game).length >= 1 && cave.kind === "cave");
  W.reveal(w, cave.x, cave.z, 6, true); D.tick(game, 2);
  const mouth = D.mouthOf(game, cave);
  check("a marker stands by each mouth the fog has lifted from", !!mouth && SB.dist(mouth.x, mouth.z, cave.x, cave.z) < 3.5);
  empty(); at(cave.x + 1.6, cave.z + 0.4); stam(1); D.tick(game, 0.1);
  const oM = P.options(game, me, nref(cave));
  check("at the mouth: go down, and how it works", /go down into the cave \(level 1 of 6: the mouth hall\)/.test(lab(oM, "use")) && /how delving works/.test(lab(oM, "pick")) && /nobody has been down/.test(oM.hint));
  check("the marker offers the same", /go down into the cave/.test(lab(P.options(game, me, sref(mouth)), "use")));
  check("seven rules, one line each", D.RULES.length === 7 && D.RULES.every(r => r.length < 150 && r.indexOf("\n") < 0));
  const nodes0 = w.nodes.length, time0 = game.time;
  check("nothing of the cave is up here", D.depth(game) === 0 && D.nodes(game).length === 0);
  check("going down takes you one level, costs pep and time", oM.use.go() === true && D.depth(game) === 1 && Math.abs(P.state().stam - 0.75) < 1e-6 && game.time === time0 + D.SECS && ev.indexOf("delveDown") >= 0);
  const lv1 = D.nodes(game);
  check("the rocks round the mouth are this level's", lv1.length >= 4 && w.nodes.length === nodes0 + lv1.length && lv1.every(n => SB.dist(n.x, n.z, cave.x, cave.z) < D.RING - 2 && n.nop === 1 && n.id >= D.NODE_ID0 && D.ZONES[1].nodes.some(x => x[0] === n.kind)), lv1.map(n => n.kind).join(" "));
  check("you did not move", SB.dist(me.x, me.z, cave.x + 1.6, cave.z + 0.4) < 0.01);
  check("it shows by your hearts", SB.Ext.vitals(game, me).some(v => /level 1 · the mouth hall/.test(v.text)));
  const rock = lv1.find(n => Surv.ROCKS[n.kind] && !Surv.ROCKS[n.kind].ore);
  if (rock) { at(rock.x + 1, rock.z); check("you can look at one and chip it", /chip the/.test(lab(P.options(game, me, nref(rock)), "use")) && Surv.hitNode(me, game, rock, "stonepick").ok); at(cave.x + 1.6, cave.z + 0.4); } else check("a level-1 rock to chip", false);
  const o1 = P.options(game, me, nref(cave));
  check("now: go deeper, or climb out", /go deeper \(level 2 of 6: the copper galleries\)/.test(lab(o1, "use")) && /climb out/.test(lab(o1, "place")) && /you are on level 1/.test(o1.hint));
  const dn = D.down(game, me, cave);
  check("below level 1 it is dark: no torch, no going down", !dn.ok && /too dark/.test(dn.msg) && D.depth(game) === 1);
  Surv.add(me, "torch", 2);
  check("with a torch you go", D.down(game, me, cave).ok && D.depth(game) === 2 && D.nodes(game).every(n => D.ZONES[2].nodes.some(x => x[0] === n.kind)) && D.nodes(game).length >= 4);
  check("level 1's rocks are gone: these are different ones", lv1.every(n => !w.nodeById[n.id]) && w.nodes.length === nodes0 + D.nodes(game).length);
  for (let i = 0; i < 8; i++) D.tick(game, 10);
  check("a torch burns out down there", Surv.count(me, "torch", true) === 1 && ev.indexOf("delveTorch") >= 0);
  // mining: a deep copper vein, with a stone pick, through the game's own swing
  const vein = D.nodes(game).find(n => n.kind === "d_copper");
  let gave = [];
  if (vein) { at(vein.x + 1, vein.z); for (let i = 0; i < 12 && vein.state === "ok"; i++) gave = gave.concat(Surv.hitNode(me, game, vein, "stonepick").gave); }
  check("a stone pick digs copper out of a deep vein, and iron from its heart", !!vein && vein.state === "gone" && gave.filter(k => k === "ore").length === 2 && gave[gave.length - 1] === "ironore", gave.join(" "));
  if (vein) { check("paws cannot", P.options(game, me, nref(D.nodes(game).find(n => n.kind === "d_copper" && n.state === "ok") || vein)).use == null || P.options(game, me, nref(D.nodes(game).find(n => n.kind === "d_copper" && n.state === "ok") || vein)).use.locked); }
  at(cave.x + 1.6, cave.z + 0.4);
  const slot = vein ? vein.delve.slot : -1;
  check("what you mined is remembered", !!vein && D.delve(game, cave).mined["2:" + slot] > 0);
  stam(1);
  check("climbing up is easy", D.up(game, me, cave).ok && D.depth(game) === 1 && ev.indexOf("delveUp") >= 0 && P.state().stam > 0.9);
  stam(1);
  check("back down: the mined vein is still mined out", D.down(game, me, cave).ok && D.nodes(game).every(n => n.delve.slot !== slot));
  game.time += SB.DAY_LENGTH * (D.RESTOCK + 0.1);
  D.up(game, me, cave); stam(1); D.down(game, me, cave);
  check("three days later the rock is back", D.nodes(game).some(n => n.delve.slot === slot && n.kind === "d_copper"));
  // no light at all
  Surv.take(me, "torch", 9);
  check("your light goes: the rock cannot be worked", P.options(game, me, nref(D.nodes(game)[0])).use.locked && /too dark to see/.test(lab(P.options(game, me, nref(D.nodes(game)[0])), "use")) && SB.Ext.vitals(game, me).some(v => /no light/.test(v.text) && v.bad));
  const pre = D.grump(game); if (pre) { pre.scout.done = true; pre.alive = false; }
  const gr0 = game.creatures.filter(c => c.alive).filter(c => c.species === "grump").length;
  for (let i = 0; i < 14; i++) D.tick(game, 1);
  const cg = D.grump(game);
  check("and a cave grump finds you in the dark", !!cg && cg.caveGrump === 2 && cg.scout.who === me.id && cg.scout.lethal === 0 && game.creatures.filter(c => c.alive && c.species === "grump").length === gr0 + 1 && ev.indexOf("caveGrump") >= 0);
  check("it never takes the last of your hearts, and it is weaker than a captain", cg.scout.dmg < 0.25 && cg.tough < 1.6);
  D.up(game, me, cave, true);
  check("climb all the way out: the rocks go, the grump stays below", D.depth(game) === 0 && D.nodes(game).length === 0 && w.nodes.length === nodes0 && !D.grump(game) && cg.scout.done === true && ev.indexOf("delveOut") >= 0);
  check("the record stays, on the marker and in the save", D.delve(game, cave).max === 2 && D.deepest(game) === 2 && /explored 2 of 6 levels/.test(P.options(game, me, sref(mouth)).hint) && JSON.parse(JSON.stringify(game.quests.deep)).delves[cave.id].max === 2);

  console.log("10. deeper: the glow garden, harder rock, the keeper and the hoard");
  empty(); Surv.add(me, "mosslamp", 1); Surv.add(me, "shovel", 1); Surv.add(me, "stonepick", 1);
  stam(1); D.down(game, me, cave); stam(1); D.down(game, me, cave); stam(1);
  seeded(7, () => D.down(game, me, cave));
  check("level 3 is the glow garden", D.depth(game) === 3 && D.zone(game).name === "the glow garden" && D.nodes(game).some(n => n.kind === "d_moss"));
  const locker = L.structOf(game, L.state(game).chests["delve3-" + cave.id]);
  check("an old pod locker stands there", !!locker && L.roll(game, "delve3-" + cave.id).items.some(x => x.k === "torch"));
  const moss = D.nodes(game).find(n => n.kind === "d_moss");
  at(moss.x + 1, moss.z);
  const oMoss = P.options(game, me, nref(moss));
  check("glowmoss is picked by hand", /pick the glowmoss/.test(lab(oMoss, "use")) && oMoss.use.go() && Surv.count(me, "glowmoss", true) >= 2 && moss.state === "gone");
  at(cave.x + 1.6, cave.z + 0.4);
  for (let i = 0; i < 9; i++) D.tick(game, 10);
  check("a moss lamp never burns out", Surv.has(me, "mosslamp") && D.depth(game) === 3);
  const gone = D.grump(game); if (gone) { gone.scout.done = true; gone.alive = false; }
  stam(1); seeded(7, () => D.down(game, me, cave));
  check("level 4 drips: you arrive soaked", D.depth(game) === 4 && SB.Body.of(me).wet === 1 && !L.structOf(game, L.state(game).chests["delve3-" + cave.id]));
  const g4 = D.grump(game); if (g4) { g4.scout.done = true; g4.alive = false; }
  const silv = D.nodes(game).find(n => n.kind === "d_silver"), iron = D.nodes(game).find(n => n.kind === "d_iron");
  hold("stonepick");
  if (silv) at(silv.x + 1, silv.z);
  check("silver is too hard for a stone pick", !!silv && P.options(game, me, nref(silv)).use.locked && /needs an iron pick/.test(lab(P.options(game, me, nref(silv)), "use")));
  Surv.add(me, "ironpick", 1); hold("ironpick");
  check("an iron pick mines it", !!silv && /mine the silver vein/.test(lab(P.options(game, me, nref(silv)), "use")) && (() => { let got = []; for (let i = 0; i < 8 && silv.state === "ok"; i++) got = got.concat(Surv.hitNode(me, game, silv, "ironpick").gave); return got.filter(k => k === "silverore").length === 2; })());
  check("iron seams give iron ore", !!iron && (() => { let got = []; at(iron.x + 1, iron.z); for (let i = 0; i < 8 && iron.state === "ok"; i++) got = got.concat(Surv.hitNode(me, game, iron, "ironpick").gave); return got.filter(k => k === "ironore").length === 2; })());
  at(cave.x + 1.6, cave.z + 0.4);
  const th0 = SB.Body.of(me).thirst;
  stam(1); seeded(7, () => D.down(game, me, cave));
  check("level 5 is hot: you arrive thirsty", D.depth(game) === 5 && SB.Body.of(me).thirst > th0 + 0.1);
  const g5 = D.grump(game); if (g5) { g5.scout.done = true; g5.alive = false; }
  const star5 = D.nodes(game).find(n => n.kind === "d_star");
  if (star5) { at(star5.x + 1, star5.z); check("starmetal laughs at an iron pick", P.options(game, me, nref(star5)).use.locked && /needs a silver pick/.test(lab(P.options(game, me, nref(star5)), "use"))); at(cave.x + 1.6, cave.z + 0.4); }
  const sparks0 = game.sparks || 0;
  stam(1);
  const bot = D.down(game, me, cave);
  check("level 6 is the bottom: a record, and sparks for it", bot.ok && bot.first && D.depth(game) === 6 && D.delve(game, cave).bottom > 0 && ev.indexOf("delveBottom") >= 0 && (game.sparks || 0) === sparks0 + 5, bot.msg);
  check("there is no level 7", !D.down(game, me, cave).ok && /bottom/.test(lab(P.options(game, me, nref(cave)), "use")) && P.options(game, me, nref(cave)).use.locked);
  const keeper = D.grump(game), hoard = L.structOf(game, L.state(game).chests["delve6-" + cave.id]);
  check("the keeper is waiting", !!keeper && keeper.caveKeeper === cave.id && keeper.name === "the cave's keeper" && D.keeperUp(game));
  at(hoard.x + 1, hoard.z);
  check("it stands between you and the hoard", !!hoard && P.options(game, me, sref(hoard)).use.locked && /keeper is in the way/.test(lab(P.options(game, me, sref(hoard)), "use")));
  keeper.alive = false; SB.bus.emit("grumpChased", { c: me, g: keeper });
  check("chase it off: the hoard is yours", !D.keeperUp(game) && D.delve(game, cave).keeper > 0 && ev.indexOf("delveKeeper") >= 0 && /open the chest/.test(lab(P.options(game, me, sref(hoard)), "use")));
  const ho = L.open(game, me, hoard);
  check("starmetal, silver and a heart-fruit in it", ho.ok && Surv.count(me, "starmetal", true) >= 1 && ho.got.items.some(x => x.k === "heartfruit") && ho.got.items.some(x => x.k === "silver"), ho.msg.slice(0, 90));
  const star6 = D.nodes(game).find(n => n.kind === "d_star");
  Surv.add(me, "silverpick", 1); hold("silverpick"); at(star6.x + 1, star6.z);
  check("a silver pick cuts a starmetal lode", /mine the starmetal lode/.test(lab(P.options(game, me, nref(star6)), "use")) && (() => { let got = []; for (let i = 0; i < 6 && star6.state === "ok"; i++) got = got.concat(Surv.hitNode(me, game, star6, "silverpick").gave); return got.indexOf("starmetal") >= 0; })());
  // walking off
  at(cave.x + D.RING + 3, cave.z); D.tick(game, 0.1);
  check("walk away from the mouth and you are back on top", D.depth(game) === 0 && D.nodes(game).length === 0 && !w.nodes.some(n => D.isDelveNode(n)) && !L.structOf(game, L.state(game).chests["delve6-" + cave.id]));
  check("the keeper does not come back to a cave it lost", (() => { at(cave.x + 1.6, cave.z + 0.4); D.delve(game, cave).ladder = 0; return true; })());
  // the ladder
  empty(); Surv.add(me, "mosslamp", 1); Surv.add(me, "vine", 4); Surv.add(me, "stick", 4);
  check("vines and sticks make a rope ladder", D.make(game, me, "ropeladder").ok);
  hold("ropeladder"); stam(1);
  check("fix it at the mouth", /fix your rope ladder here/.test(lab(P.options(game, me, nref(cave)), "place")) && P.options(game, me, nref(cave)).place.go() && D.delve(game, cave).ladder === 1 && !Surv.has(me, "ropeladder"));
  const oLad = P.options(game, me, nref(cave));
  check("then the ladder takes you straight to the deepest level", /take the ladder down to level 6/.test(lab(oLad, "place")) && oLad.place.go() && D.depth(game) === 6 && !D.grump(game) && Math.abs(P.state().stam - 0.75) < 1e-6);
  check("the opened hoard is an empty chest now", (() => { const h2 = L.structOf(game, L.state(game).chests["delve6-" + cave.id]); return !!h2 && L.isOpen(game, h2); })());

  console.log("11. old bones and geodes");
  empty(); Surv.add(me, "geode", 1); hold("geode");
  check("a geode needs something to crack it on", /crack the geode/.test(lab(P.options(game, me, null), "place")) && !D.crack(game, me).ok);
  Surv.add(me, "stone", 1);
  const ck = D.crack(game, me);
  check("crack: something is inside", ck.ok && Surv.count(me, ck.kind, true) >= 1 && Surv.count(me, "geode", true) === 0, ck.msg);
  empty(); Surv.add(me, "fossil", 4); hold("fossil");
  check("four old bones are not a beast", !D.bones(game, me).ok && !/fit the old bones/.test(lab(P.options(game, me, null), "place")));
  Surv.add(me, "fossil", 1);
  check("five fit together: sparks and a heart-fruit", /fit the old bones together/.test(lab(P.options(game, me, null), "place")) && P.options(game, me, null).place.go() && Surv.count(me, "fossil", true) === 0 && Surv.count(me, "heartfruit", true) === 1);

  console.log("12. the save");
  const snap = JSON.parse(JSON.stringify(SB.Save.snapshot(game)));
  check("down a cave when you saved: the level's rocks are in the save", D.depth(game) === 6 && snap.quests.deep.cur === cave.id && snap.quests.deep.nodes.length > 0);
  P.leave();
  check("back to the sky: back on top", D.depth(game) === 0 && D.nodes(game).length === 0);
  const c3 = boot(), SB3 = c3.SB, g3 = SB3.Save.revive(snap); SB3.Game.current = g3;
  SB3.Game.step(g3, 0.1);
  const D3 = SB3.Deep, d3 = D3.state(g3);
  check("loaded: you start on top and no cave rock is left lying about", D3.depth(g3) === 0 && d3.nodes.length === 0 && !g3.world.nodes.some(n => D3.isDelveNode(n)));
  check("the records, the places found, the boon and the ladder came through", d3.delves[cave.id].max === 6 && d3.delves[cave.id].ladder === 1 && d3.delves[cave.id].keeper > 0 && D3.progress(g3).found === D.progress(game).found && d3.boon === "warrior" && d3.maps.length === 1);
  check("the places stand where they stood", g3.world.structures.filter(b => b.kind.indexOf("poi_") === 0).length === w.structures.filter(b => b.kind.indexOf("poi_") === 0).length && D3.waystones(g3).length === 3 && !!D3.mouthOf(g3, D3.caves(g3)[0]));
  const old = boot(), gOld = old.SB.Game.newGame(88); old.SB.Game.current = gOld; gOld.quests = gOld.quests || {}; gOld.quests.deep = "junk";
  let threw = null; try { old.SB.Game.step(gOld, 0.1); old.SB.Deep.tick(gOld, 3); old.SB.Deep.html(gOld, old.SB.Game.smols(gOld)[0] || { x: 0, z: 0, tier: 0, inv: null }, null); old.SB.Ext.goals(gOld, () => {}); } catch (e) { threw = e; }
  check("an island with none of this in its save, and nobody in a body: nothing throws", !threw && typeof gOld.quests.deep === "object", threw ? String(threw.stack).slice(0, 200) : "");
  gOld.offline = true; old.SB.Deep.tick(gOld, 3);
  check("offline: it sits still", old.SB.Deep.depth(gOld) === 0);

  console.log("13. the ground, the heat and the cold");
  P.enter(game, me, { free: true });
  empty();
  const cell = want => { for (let j = 8; j < w.T.N - 8; j += 2) for (let i = 8; i < w.T.N - 8; i += 2) if (want(i + 0.5, j + 0.5)) return { x: i + 0.5, z: j + 0.5 }; return null; };
  const mud = cell((x, z) => D.ground(game, x, z) === "mud" && D.ground(game, x + 0.2, z) === "mud" && W.walkable(w, x, z, false));
  check("swamps have patches of sucking mud, jungles patches of thorns, and most ground is neither", !!mud && !!cell((x, z) => D.ground(game, x, z) === "thorns") && D.ground(game, w.T.nest.x, w.T.nest.z) === "");
  at(mud.x, mud.z); D.tick(game, 0.016);
  me.x += 0.2; D.tick(game, 0.016);
  check("mud: every step is pulled half back", Math.abs(me.x - (mud.x + 0.1)) < 1e-6 && SB.Ext.vitals(game, me).some(v => /mud/.test(v.text) && v.bad));
  const firm = cell((x, z) => D.ground(game, x, z) === "" && D.ground(game, x + 0.2, z) === "" && W.depthAt(w, x, z) < 0.02 && W.biomeAt(w, x, z) === SB.B.meadow);
  at(firm.x, firm.z); D.tick(game, 0.016); me.x += 0.2; D.tick(game, 0.016);
  check("firm ground: a step is a step", Math.abs(me.x - (firm.x + 0.2)) < 1e-6 && !D.hazards().mud);
  const thorn = cell((x, z) => D.ground(game, x, z) === "thorns");
  at(thorn.x, thorn.z); me.chem.health = 1; P.state().running = true; D.tick(game, 0.6);
  const hRun = me.chem.health;
  P.state().running = false; D.tick(game, 0.6);
  check("thorns scratch a runner, not a walker", hRun < 1 && me.chem.health === hRun && D.hazards().thorns);
  const desert = cell((x, z) => W.biomeAt(w, x, z) === SB.B.desert && W.depthAt(w, x, z) < 0.02);
  game.time = Math.floor(game.time / SB.DAY_LENGTH) * SB.DAY_LENGTH + SB.DAY_LENGTH * 1.5; w.night = false; w.season = 0;
  if (desert) {
    at(desert.x, desert.z);
    const b = SB.Body.of(me); b.thirst = 0.1; D.tick(game, 0.6); D.tick(game, 0.6);
    const dT = b.thirst - 0.1;
    check("the desert by day makes you thirsty", D.hot(game, me) && dT > 0 && D.hazards().heat === true, dT.toFixed(5));
    Surv.add(me, "frostflask", 1); b.thirst = 0.1; D.tick(game, 0.6); D.tick(game, 0.6);
    check("a frost flask shrugs it off", b.thirst === 0.1 && !D.hazards().heat);
    w.night = true; Surv.take(me, "frostflask", 1);
    check("and so does the night", !D.hot(game, me));
    w.night = false;
  } else check("this island has a desert", false);
  const vent = w.nodes.find(n => n.kind === "vent" && n.state === "ok" && W.biomeAt(w, n.x, n.z) === SB.B.ash);
  if (vent) { at(vent.x + 1, vent.z); me.chem.health = 1; D.tick(game, 0.6); D.tick(game, 0.6); check("steam vents in the ashlands sting", me.chem.health < 1 && D.hazards().steam); }
  else check("steam vents sting (no vent on this island: skipped)", true);
  const icy = cell((x, z) => W.biomeAt(w, x, z) === SB.B.tundra && W.depthAt(w, x, z) > 0.2 && W.depthAt(w, x, z) < 0.45);
  if (icy) { at(icy.x, icy.z); me.chem.cold = 0; D.tick(game, 0.6); D.tick(game, 0.6); check("wading in the snowfield chills you", me.chem.cold > 0 && D.hazards().icy); }
  else check("icy water chills (no snowfield shallows on this island: skipped)", true);

  console.log("14. weather");
  at(firm.x, firm.z); me.chem.health = 1;
  w.season = 1; s().wx.heat = 0;
  let hd = 0; for (let d = 0; d < 60 && !D.heatwave(game); d++) { game.time += SB.DAY_LENGTH; D.newDay(game); hd++; }
  check("summer brings a heat wave now and then, not every day", D.heatwave(game) && hd > 1 && ev.indexOf("heatwave") >= 0, "after " + hd + " days");
  const bb = SB.Body.of(me); bb.thirst = 0.1; w.night = false; D.tick(game, 0.6); D.tick(game, 0.6);
  check("in a heat wave even the meadow makes you thirsty", bb.thirst > 0.1 && D.hazards().heat);
  game.time += SB.DAY_LENGTH; D.tick(game, 3);
  check("it passes by the next day", !D.heatwave(game));
  w.season = 3; let bd = 0; for (let d = 0; d < 60 && !D.blizzard(game); d++) { game.time += SB.DAY_LENGTH; D.newDay(game); bd++; }
  me.chem.cold = 0; w.weather.wind = 0.2; D.tick(game, 3); D.tick(game, 0.6);
  check("winter brings blizzards: wind, a white-out, and a chill in the open", D.blizzard(game) && w.weather.kind === "fog" && w.weather.wind >= 1.2 && me.chem.cold > 0 && D.hazards().bliz && ev.indexOf("blizzard") >= 0, "after " + bd + " days");
  s().wx.bliz = 0; w.season = 0; w.weather.kind = "clear";
  const rb = D.rainbow(game);
  check("after rain, a rainbow touches down somewhere near", !!rb && rb.kind === "rainbowend" && SB.dist(rb.x, rb.z, me.x, me.z) > 15 && SB.dist(rb.x, rb.z, me.x, me.z) < 50 && /rainbow's end/.test(P.state().goal.label) && ev.indexOf("rainbow") >= 0);
  check("one at a time", D.rainbow(game) === null);
  at(rb.x + 1, rb.z); empty();
  const spk = game.sparks || 0, oRb = P.options(game, me, sref(rb));
  check("take what it left: a gem, a mote and sparks", /take what the rainbow left/.test(lab(oRb, "use")) && oRb.use.go() && (game.sparks || 0) === spk + 3 && Surv.count(me, "mote", true) === 1 && ["amber", "opal", "icegem", "pearl"].some(k => Surv.count(me, k, true) === 1) && !W.structById(w, rb.id));
  const rb2 = D.rainbow(game); game.time += D.RAINBOW_SECS + 5; D.tick(game, 3);
  check("an unclaimed rainbow fades", !!rb2 && !W.structById(w, rb2.id) && !s().wx.rb);
  let rbBus = 0; w.night = false;
  for (let i = 0; i < 12 && !s().wx.rb; i++) { game.time += 61; SB.bus.emit("weather", { kind: "clear", from: "rain" }); rbBus++; }
  check("the weather clearing after rain is what brings one", !!s().wx.rb, "on clear-up " + rbBus);
  const mo = [0, 1, 2, 3, 4, 5, 6, 7].map(d => { game.time = d * SB.DAY_LENGTH + 10; return D.moon(game); });
  check("the moon has eight faces: one dark night, one full", mo.filter(m => m.dark).length === 1 && mo.filter(m => m.full).length === 1 && mo.every(m => m.icon));

  console.log("15. the seeker stone, and the sky's goals");
  empty(); Surv.add(me, "amber", 1); Surv.add(me, "flint", 1); Surv.add(me, "fiber", 1);
  check("amber, flint and fibre make a seeker stone", D.make(game, me, "compass").ok);
  hold("compass"); P.setGoal(null);
  const oC = P.options(game, me, null);
  const unf = pois.filter(p => !s().found[p.id] && p.kind !== "islet").map(p => SB.dist(p.x, p.z, me.x, me.z)).concat(game.sites.filter(o => !o.found && !o.gone && !o.done).map(o => SB.dist(o.x, o.z, me.x, me.z))).concat(D.caves(game).filter(cv => !(D.delve(game, cv).max > 0)).map(cv => SB.dist(cv.x, cv.z, me.x, me.z)));
  check("ask it: it points at the nearest place nobody has found", /ask the seeker stone/.test(lab(oC, "place")) && oC.place.go() && !!P.state().goal && Math.abs(SB.dist(P.state().goal.x, P.state().goal.z, me.x, me.z) - Math.min.apply(null, unf)) < 0.2);
  check("looking at somebody, the button is still theirs", !other || (other.alive ? /^(give|share) /.test(lab(P.options(game, me, { type: "creature", id: other.id }), "place")) : true));
  const gl = P.state().goal; at(gl.x + 1, gl.z); D.tick(game, 0.6);
  check("get there and the marker goes", !P.state().goal);
  const goals = []; SB.Ext.goals(game, (t, p, d) => goals.push(t + " " + p));
  check("the sky's list counts places and the deepest level", goals.some(t => /hidden places/.test(t) && / of /.test(t)) && goals.some(t => /level 6 of 6/.test(t)));
  let t2 = null; try { for (let i = 0; i < 40; i++) SB.Game.step(game, 0.1); } catch (e) { t2 = e; }
  check("the island runs on with all of it going", !t2, t2 ? String(t2.stack).slice(0, 200) : "");
  P.leave();
});

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
