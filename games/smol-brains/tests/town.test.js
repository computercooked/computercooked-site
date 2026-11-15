// home and town (town.js): furniture and comfort, home upgrades, the yard, keepsakes, dye, town buildings with
// keepers, upkeep and mending, names, taking down, visitors and the guest book. Driven the way a player would.
// node games/smol-brains/tests/town.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0, count = 0;
function check(name, ok, extra) { count++; console.log((ok ? "  ok  " : "  FAIL ") + name + (extra != null ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");

seeded(4340, () => {
  const ctx = load();
  ["ext.js", "possess.js", "body.js", "home.js", "loot.js", "town.js"].forEach(f => vm.runInContext(js(f), ctx, { filename: f }));
  const SB = ctx.SB, P = SB.Possess, H = SB.Home, T = SB.Town, X = SB.Ext, Surv = SB.Survival || SB.Surv, W = SB.World; P.headless = true;
  const game = SB.Game.newGame(88); SB.Game.current = game; game.tutorial.done = true;
  SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod));
  const me = SB.Game.smols(game)[0]; me.tier = 4; me.stage = 3;
  const nest = game.world.T.nest;
  const events = []; ["townFurniture", "townCosy", "homeUpgraded", "townKeeper", "townGuest", "townParty", "townKeepsake", "townWorn", "townWatch", "townBetterTool", "townTaught"].forEach(n => SB.bus.on(n, d => events.push(n)));
  const give = cost => { for (const k in cost) Surv.add(me, k, cost[k]); };
  const empty = () => { Surv.inv(me).s.fill(null); };
  const nextDay = () => { game.time += SB.DAY_LENGTH; SB.bus.emit("dawn", {}); };
  const ref = b => ({ type: "struct", id: b.id });
  const lab = (b, which) => ((P.options(game, me, ref(b))[which || "use"]) || {}).label || "";
  const put = (kind, dx, dz) => W.addStructure(game.world, game, kind, hut.x + dx, hut.z + dz, { done: true, tribe: me.tribe });
  let hut;

  console.log("1. before there is a home");
  check("the new buildings are real buildings", ["lodge", "fence", "path", "flowerbed", "beehive", "vegplot", "bench", "lamp", "sign", "swing", "well", "inn", "bakery", "smithy", "library", "watchtower", "shrine", "storehouse", "healer"].every(k => SB.STRUCTS[k] && SB.STRUCTS[k].work > 0 && SB.STRUCTS[k].desc && T.MODELS[k] && SB.Ideas.forStruct[k]));
  check("their nouns are ones the game knows", Object.keys(T.META).every(k => "food mushroom toy ball medicine egg bug plant water stick stone material fire shelter tool critter crop totem wonder".split(" ").indexOf(SB.STRUCTS[k].noun) >= 0));
  check("no home: no comfort, nothing to make", T.comfort(game).n === 0 && T.comfort(game).name === "bare" && /no home/.test(T.whyNot(game, me, "table")));
  check("the home tab still says how to get a home", /no home yet/.test(H.html(game, me)));
  check("the yard comes with a home", /comes with a home/.test(T.planWhy(game, me, "fence")));
  check("nothing throws with nobody in a body", (() => { T.tick(game, 5); T.tick(game, 5); SB.bus.emit("dawn", {}); return T.furnitureCount(game) === 0 && T.keeps(game).length === 0; })());

  console.log("2. a home, and furniture made at the door");
  me.x = nest.x + 6; me.z = nest.z + 6;
  P.enter(game, me, { free: true });
  hut = W.addStructure(game.world, game, "hut", me.x + 2, me.z, { done: true });
  check("the hut you finish is your home, with a hut's chest", H.get(game) === hut && (T.sync(game), H.CHEST === 18) && H.chest(game).length === 18);
  check("a hut alone is plain comfort: 1", T.comfort(game).n === 1 && T.comfort(game).step === 0);
  check("no sticks, no table", !T.make(game, me, "table").ok && /needs 6 stick/.test(T.whyNot(game, me, "table")));
  give({ stick: 6 });
  me.x = hut.x + 20; check("not from across the island", /at home/.test(T.whyNot(game, me, "table")));
  me.x = hut.x - 2;
  const r1 = T.make(game, me, "table");
  check("a table and stools: the sticks are spent, comfort is up", r1.ok && T.has(game, "table") && Surv.count(me, "stick") === 0 && T.comfort(game).n === 3 && events.indexOf("townFurniture") >= 0);
  check("only one of each", /has one/.test(T.whyNot(game, me, "table")));
  check("a blob can't", /hands/.test(T.whyNot(game, Object.assign({}, me, { tier: 1 }), "rug")));
  check("the home tab lists furniture round home.js's own list", (() => { const h = H.html(game, me, () => ""); return /comfort <b>3<\/b>/.test(h) && /data-townmake='rug'/.test(h) && /data-homemake='bed'/.test(h) && !/data-townmake='table'/.test(h); })());

  console.log("3. what the furniture does");
  ["shelf", "lantern", "barrel", "musicbox", "mirror", "bench", "pot", "basket", "board"].forEach(id => { give(T.FBY[id].cost); T.make(game, me, id); });
  check("ten things fit in a hut, and no more", T.furnitureCount(game) === 10 && (give(T.FBY.rug.cost), /no room left in a hut/.test(T.whyNot(game, me, "rug"))));
  check("a shelf: six more chest slots", H.CHEST === 24 && H.chest(game).length === 24);
  check("a lantern: the hearth's ring is wider", H.SAFE === 10);
  me.chem.hunger = 0.5; SB.bus.emit("povEat", { c: me, kind: "berry" });
  check("a table: a meal at home fills you more", Math.abs(me.chem.hunger - 0.42) < 1e-9);
  SB.Body.of(me).thirst = 0.8;
  check("a rain barrel: drink at home", T.drink(game, me, null).ok && SB.Body.of(me).thirst < 0.8);
  me.chem.bored = 0.9;
  check("a music box: boredom melts", T.music(game, me).ok && me.chem.bored < 0.5);
  const hue0 = me.look.hue;
  check("a mirror: no berries, no dye", !T.dye(game, me, "berry").ok);
  give({ berry: 2 });
  check("dye your fur berry purple", T.dye(game, me, "berry").ok && me.look.hue === 285 && me.dye === 285 && Surv.count(me, "berry") === 0);
  me.look.hue = hue0; T.scan(game, 4);
  check("the dye comes back after a load", me.look.hue === 285);
  check("and washes out", T.dye(game, me, "wash").ok && me.look.hue === hue0 && me.dye == null);
  empty(); Surv.add(me, "stoneaxe", 1);
  const full = Surv.uses("stoneaxe");
  SB.bus.emit("craft", { c: me, id: "hafting", item: { kind: "stoneaxe" }, pov: true });
  check("a workbench: a tool made at home lasts a quarter longer", Surv.inv(me).s.find(x => x && x.k === "stoneaxe").w === Math.round(full * 1.25) && events.indexOf("townBetterTool") >= 0);
  empty();

  console.log("4. comfort sets the morning");
  [["bed", { leaves: 4 }], ["chest", { stick: 4, vine: 1 }], ["hearth", { stone: 4, stick: 2 }], ["garden", { seed: 2 }]].forEach(x => { give(x[1]); H.make(game, me, x[0]); });
  const cf = T.comfort(game);
  check("it adds up: the hut, home.js's four things, the furniture", cf.n === 1 + 4 + 12 && cf.name === "snug" && cf.next[1] === "cosy", cf.n + " " + cf.name);
  me.chem.bored = 0.8; me.chem.health = 0.5; me.chem.tired = 0.4;
  nextDay();
  check("wake in your own bed in a snug home: a better mood", me.chem.health === 1 && me.chem.bored <= 0.5 + 1e-9 && me.snug === 3 && T.snug(me, game) === 3 && events.indexOf("townCosy") >= 0);
  check("and a longer cosy day", SB.Body.cosy(me, game) && me.body.cosy >= game.time + SB.DAY_LENGTH * 0.8);
  check("it shows by your hearts", X.vitals(game, me).some(v => /snug home/.test(v.text)));
  me.chem.tired = 0.5; T.tick(game, 2);
  check("the day tires you less", me.chem.tired < 0.5);
  check("the cooking pot left a hot meal in the chest", H.chest(game).some(x => x && x.k === "cooked"));
  check("no trophies, no swagger", X.damage(game, me, {}, { hk: null, dmg: 1 }) === 1);
  SB.Loot.state(game).trophies.gloom = 1;
  check("a captain's trophy on the wall makes you bolder", Math.abs(X.damage(game, me, {}, { hk: null, dmg: 1 }) - 1.04) < 1e-9 && T.comfort(game).parts.wall === 1);
  give(T.FBY.rack.cost); // (no room in a hut: checked again after the upgrade)
  check("the goals list asks for a snug home until it is one", (() => { const L = []; X.goals(game, (t, p) => L.push(t + " " + p)); return L.length === 0; })());

  console.log("5. a bigger home, in place");
  check("a hut can become a house", T.upgradeTo(game) === "house" && /needs/.test(T.upgradeWhy(game, me)));
  give(SB.STRUCTS.house.cost);
  const up = T.upgrade(game, me);
  check("lean-to, hut, house: same spot, everything kept", up.ok && hut.kind === "house" && H.get(game) === hut && H.has(game, "bed") && T.has(game, "table") && H.chest(game).some(x => x && x.k === "cooked") && events.indexOf("homeUpgraded") >= 0);
  check("more chest, more room", H.CHEST === 30 && T.room(game) === 16 && T.make(game, me, "rack").ok);
  check("the rack shows the trophy off: it counts twice", T.comfort(game).parts.wall === 2);
  give(SB.STRUCTS.lodge.cost);
  check("a house can become a lodge, and that is the top", T.upgrade(game, me).ok && hut.kind === "lodge" && H.is(game, hut) && T.upgradeTo(game) == null && H.CHEST === 36 && T.comfort(game).parts.home === 5);
  check("looking at your lodge: open your home, or sleep", /open your home/.test(lab(hut)) && /sleep in the lodge/.test(lab(hut, "place")));
  check("a lodge is a roof", W.shelterAt(game.world, hut.x, hut.z) === hut);
  empty();

  console.log("6. the yard");
  check("plans: a fence can be planned now, and the ghost is a fence", T.planWhy(game, me, "fence") === "" && T.startBuild(game, me, "fence").ok && P.state().ghost && P.state().ghost.kind === "fence");
  P.cancelBuild();
  check("the build tab's own list is left alone", !P.buildable().some(b => T.META[b.kind]));
  const site = Surv.place(me, game, "flowerbed", hut.x + 4, hut.z + 3, 0);
  give({ seed: 2, stick: 1 });
  check("a flower bed, built by hand like any building", !!site && Surv.deliver(me, game, site).length === 2 && SB.Ideas.siteReady(site) && (SB.Ideas.work(me, site, 100, game), site.done));
  const before = T.comfort(game).n;
  const fence = put("fence", -4, 3), hive = put("beehive", 4, -3), plot = put("vegplot", -4, -4), farHive = put("beehive", 30, 0);
  check("yard things near home count for comfort; far ones don't", T.yard(game).fence === 1 && T.yard(game).beehive === 1 && T.yard(game).flowerbed === 1 && T.comfort(game).n === before + 3, T.comfort(game).n - before);
  H.chest(game).fill(null);
  while (T.state(game).lastDawn % 2 === 0 || T.state(game).lastDawn == null) nextDay(); // an odd day: the next is even
  H.chest(game).fill(null);
  nextDay();
  const inChest = k => H.chest(game).reduce((n, x) => n + (x && x.k === k ? x.n : 0), 0);
  check("morning: the fence saves a third handful of berries", inChest("berry") === 3, inChest("berry"));
  check("the hive's honey and the plot's carrot go to your chest", inChest("honey") === 1 && inChest("carrot") === 1);
  check("a hive away from home keeps its honey until you take it", farHive.data.stock === 1 && /take the honey/.test(lab(farHive)));
  me.x = farHive.x + 1; me.z = farHive.z;
  check("take it", T.take(game, me, farHive).ok && Surv.count(me, "honey") === 1 && farHive.data.stock === 0 && /bees are busy/.test(lab(farHive)));
  me.x = hut.x - 2; me.z = hut.z;
  const swing = put("swing", 6, 6), kid = SB.Game.smols(game)[1];
  if (kid) { kid.x = swing.x + 1; kid.z = swing.z; kid.chem.bored = 0.5; T.scan(game, 4); check("a smol by the swing is less bored", kid.chem.bored < 0.5); }
  const bench = put("bench", 6, -6);
  me.chem.tired = 0.5;
  check("sit on the bench", /sit on the bench/.test(lab(bench)) && T.sit(game, me, bench, "sit").ok && me.chem.tired < 0.5);

  console.log("7. buildings for the town");
  check("a bakery waits for the idea of baking", /learn/.test(T.planWhy(game, me, "bakery")));
  me.ideas = me.ideas || {}; me.ideas.bake = 1; me.ideas.hut = 1;
  check("then it can be planned", T.planWhy(game, me, "bakery") === "" && T.plans(game, me, "town").length === 9);
  const well = put("well", 10, 0);
  SB.Body.of(me).thirst = 0.9; me.x = well.x + 1; me.z = well.z;
  check("a well: drink anywhere", /drink from the well/.test(lab(well)) && T.drink(game, me, well).ok && SB.Body.of(me).thirst < 0.9);
  game.stats.maxTier = 4;
  const room0 = SB.Civ.room(game), inn = put("inn", 14, 5);
  check("a common house: eight more beds, a roof, somewhere to sleep", SB.Civ.room(game) === room0 + 8 + 0 && W.shelterAt(game.world, inn.x, inn.z) === inn && /sleep at the common house/.test(lab(inn)), SB.Civ.room(game) - room0);
  const bakery = put("bakery", 10, 8), other = SB.Game.smols(game).find(c => c !== me);
  nextDay();
  check("a bakery: a loaf every morning", bakery.data.stock === 1 && bakery.data.stockKind === "bread" && /take the bread/.test(lab(bakery)));
  me.x = bakery.x + 1; me.z = bakery.z;
  check("take the loaf", T.take(game, me, bakery).ok && Surv.count(me, "bread") === 1);
  if (other) {
    other.tier = 3; other.stage = 3; other.tribe = me.tribe; other.x = bakery.x + 3; other.z = bakery.z;
    check("the town tab offers a smol the job", /data-townkeep='/.test(T.html(game, me, () => "")) && T.candidates(game, me, bakery).indexOf(other) >= 0);
    const as = T.assign(game, bakery, other);
    check("a baker", as.ok && T.keeper(game, bakery) === other && other.postJob === "baker" && events.indexOf("townKeeper") >= 0 && /baker/.test(as.msg));
    const loaves = () => game.world.items.reduce((n, o) => n + (o.kind === "bread" && !o.gone ? (o.data.n || 1) : 0), 0), l0 = loaves();
    nextDay();
    check("with a baker there is bread for the tribe too", loaves() === l0 + 2 && bakery.data.stock === 1, loaves() - l0);
    check("a common house with a keeper sleeps twelve", (T.assign(game, inn, other), SB.Civ.room(game) === room0 + 12) && T.keeper(game, bakery) == null);
    T.assign(game, bakery, other);
  }
  const smithy = put("smithy", 16, -4);
  empty(); Surv.add(me, "stoneaxe", 1); Surv.inv(me).s[0].w = 3; Surv.inv(me).sel = 0; me.x = smithy.x + 1; me.z = smithy.z;
  check("a smithy: no stone, no mending", /mend your/.test(lab(smithy)) && !T.fixTool(game, me, smithy).ok);
  Surv.add(me, "stone", 1);
  check("a worn tool, good as new for a stone", T.fixTool(game, me, smithy).ok && Surv.inv(me).s[0].w === full && Surv.count(me, "stone") === 0);
  Surv.add(me, "club", 1);
  SB.bus.emit("craft", { c: me, id: "club", item: { kind: "club" }, pov: true });
  check("a tool made at the smithy lasts half as long again", Surv.inv(me).s.find(x => x && x.k === "club").w === Math.round(Surv.uses("club") * 1.5));
  empty();
  const library = put("library", 20, 4), idea = SB.Ideas.LIST.find(d => !SB.Ideas.known(me, d.id) && SB.Ideas.canHold(me, d.id));
  me.x = library.x + 1; me.z = library.z;
  check("an archive with nothing new in it", !T.read(game, me, library).ok);
  if (other && idea) {
    other.ideas = other.ideas || {}; other.ideas[idea.id] = 1;
    const rr = T.read(game, me, library);
    check("read what the tribe knows", rr.ok && SB.Ideas.known(me, idea.id) && /learned/.test(rr.msg), idea.id);
  }
  const tower = put("watchtower", 22, -6), inc = { id: "raid", phase: "warn", t1: 100 };
  SB.bus.emit("incidentChoice", { inc: inc, choice: {} });
  check("a watchtower: the war party takes longer to arrive", inc.t1 === 125 && events.indexOf("townWatch") >= 0 && (SB.bus.emit("incidentChoice", { inc: inc, choice: {} }), inc.t1 === 125));
  check("climb it and look", /climb up/.test(lab(tower)) && /quiet|grump/.test(T.lookOut(game, me, tower).msg));
  const shrine = put("shrine", 26, 3), sp0 = game.sparks;
  me.x = shrine.x + 1; me.z = shrine.z; Surv.add(me, "berry", 2); Surv.inv(me).sel = Surv.inv(me).s.findIndex(x => x && x.k === "berry");
  check("a shrine: an offering for a spark, once a day", /offering/.test(lab(shrine)) && T.offer(game, me, shrine).ok && game.sparks > sp0 && Surv.count(me, "berry") === 1 && !T.offer(game, me, shrine).ok);
  const healer = put("healer", 28, -4);
  me.x = healer.x + 1; me.z = healer.z; me.chem.health = 0.4;
  check("a healer's hut: rest and mend, once a day", T.rest(game, me, healer).ok && me.chem.health > 0.7 && !T.rest(game, me, healer).ok);
  if (other) { other.x = healer.x + 2; other.z = healer.z; other.chem.health = 0.5; T.scan(game, 4); check("hurt smols near it mend", other.chem.health > 0.5); }
  const store = put("storehouse", 32, 4);
  me.x = store.x + 1; me.z = store.z;
  const bi = Surv.inv(me).s.findIndex(x => x && x.k === "berry");
  check("a storehouse: eighteen slots away from home", T.store(game, store).length === 18 && T.storeStash(game, me, store, bi).ok && Surv.count(me, "berry") === 0 && /data-townfetch/.test(T.html(game, me, () => "")));
  me.x = store.x + 30; check("not from far away", !T.storeFetch(game, me, store, 0).ok); me.x = store.x + 1;
  check("take it back", T.storeFetch(game, me, store, T.store(game, store).findIndex(x => x)).ok && Surv.count(me, "berry") === 1);

  console.log("8. upkeep, mending, names, taking down");
  for (let i = 0; i < 15; i++) nextDay();
  check("left alone, a building wears out and stops working", T.worn(well) && !T.works(well) && events.indexOf("townWorn") >= 0 && well.data.dmg < 0.6, well.data.dmg);
  check("one with a keeper never does", !other || !T.worn(bakery));
  me.x = well.x + 1; me.z = well.z; empty();
  check("a worn-out well gives no water; the button says mend", !T.drink(game, me, well).ok && /mend the well/.test(lab(well)));
  check("your home wears too, and the leak costs comfort", T.worn(hut) && T.comfort(game).parts.worn === -3);
  check("mending takes a stick", /takes a stick/.test(T.mendWhy(game, me, well)));
  Surv.add(me, "stick", 3);
  check("mend it with a stick or two", T.mend(game, me, well).ok && T.mend(game, me, well).ok && T.works(well) && T.drink(game, me, well).ok && /drink/.test(lab(well)));
  const nm = T.rename(game, well);
  check("name it: no typing, each tap carves the next name", nm.ok && typeof well.name === "string" && /well/.test(well.name) && (T.rename(game, well), well.name) !== nm.msg && /🪧/.test(nm.msg));
  me.x = hut.x - 2; me.z = hut.z;
  check("name your home", T.rename(game, hut).ok && T.homeName(game) === hut.name && /the |end|side|corner|rest|nook|house|den|honeypot|nine/.test(hut.name), hut.name);
  check("your home can't be taken down; a bench can, for half its sticks", !T.canTakeDown(game, hut) && (me.x = bench.x + 1, me.z = bench.z, empty(), T.takeDown(game, me, bench).ok) && Surv.count(me, "stick") === 2 && game.world.structures.indexOf(bench) < 0);
  const site2 = Surv.place(me, game, "sign", hut.x - 8, hut.z + 8, 0);
  me.x = site2.x + 1; me.z = site2.z; me.purse = 0;
  check("a site: no shells, no help", T.commissionPrice(site2) === 1 && !T.commission(game, me, site2).ok);
  me.purse = 5;
  check("pay the tribe and they bring the rest", T.commission(game, me, site2).ok && me.purse === 4 && SB.Ideas.siteReady(site2) && T.nearest(game, me) === site2);

  console.log("9. keepsakes, visitors, a housewarming");
  me.x = hut.x - 2; me.z = hut.z; empty(); Surv.add(me, "stick", 3); T.mend(game, me, hut); T.mend(game, me, hut);
  SB.bus.emit("fish", { c: me });
  check("your biggest fish goes on the wall", T.state(game).fish && T.state(game).fish.len >= 1 && T.keeps(game).some(k => k.id === "fish") && events.indexOf("townKeepsake") >= 0);
  const n0 = T.keeps(game).length; for (let i = 0; i < 20; i++) SB.bus.emit("fish", { c: me });
  check("only a bigger one replaces it", T.keeps(game).length === n0);
  SB.bus.emit("marketDay", {});
  check("a ribbon from market day", T.keeps(game).some(k => k.id === "market"));
  if (other) {
    const v = T.visit(game, true);
    check("a visitor signs the guest book and leaves something in the basket", !!v && T.state(game).book.length >= 1 && typeof v.n === "string" && !!v.g && events.indexOf("townGuest") >= 0);
    check("the home tab shows the wall and the book", (() => { const h = H.html(game, me, () => ""); return /the guest book/.test(h) && h.indexOf(v.n) >= 0 && /paws long/.test(h) && /data-towndo='party'/.test(h); })());
    check("a housewarming needs snacks", /3 things to eat/.test(T.partyWhy(game, me)));
    Surv.add(me, "berry", 3);
    const sp1 = game.sparks, pr = T.party(game, me);
    check("a housewarming: guests, a garland, the snacks eaten", pr.ok && Surv.count(me, "berry") === 0 && game.sparks > sp1 && T.keeps(game).some(k => k.id === "party:lodge") && events.indexOf("townParty") >= 0);
    check("one per home", /had its housewarming/.test(T.partyWhy(game, me)));
  }

  console.log("10. paths, and what is saved");
  Surv.add(me, "stone", 2);
  check("no village yet, no paving", game.civ ? true : !T.pave(game, me).ok);
  if (!game.civ) SB.Civ.init(game);
  const pv = T.pave(game, me), ti = Math.floor(me.z) * game.world.T.N + Math.floor(me.x);
  check("lay a paving stone where you stand", pv.ok && game.world.road[ti] === 2 && Surv.count(me, "stone") === 1 && W.roadSpeed(game.world, me.x, me.z) > 1 && !T.pave(game, me).ok);
  const sv = JSON.parse(JSON.stringify(game.quests.town));
  check("it's all in the save", sv.fur.table && sv.keeps.length >= 2 && sv.book && sv.stores[store.id].length === 18 && sv.name === hut.name && hut.data.dmg != null);
  const meSaved = SB.Save && SB.Save.plain ? SB.Save.plain(me) : me;
  check("a keeper's post is a plain field on the smol", !other || (other.postId === bakery.id && typeof other.postJob === "string"));
  void meSaved;
  delete game.quests.town; T.sync(game);
  check("an old save with none of this still works", T.comfort(game).n > 0 && !T.has(game, "table") && typeof T.html(game, me, () => "") === "string" && typeof H.html(game, me, () => "") === "string" && (T.tick(game, 9), SB.bus.emit("dawn", {}), true));
  P.leave();
  check("and with nobody in a body", (T.tick(game, 9), nextDay(), X.vitals(game, me).length >= 0));
});

console.log("11. the files");
const src = js("town.js"), idx = fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8");
check("the game loads it after ext, home and loot, before the hud", idx.indexOf("js/town.js") > idx.indexOf("js/loot.js") && idx.indexOf("js/town.js") < idx.indexOf("js/povhud.js"));
check("it never touches the island's dice", !/game\.rng/.test(src));
check("old-phone javascript only", !/=>|\blet \b|\bconst \b|`|\bclass \b|\?\./.test(src));
check("at least thirty checks", count >= 30, count);

console.log(failed ? "\n" + failed + " failed" : "\nall passed (" + count + ")");
process.exit(failed ? 1 : 0);
