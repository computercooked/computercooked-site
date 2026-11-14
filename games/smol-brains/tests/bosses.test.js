// 4.26: the three grump captains. Each waits at a lair far from the nest; you go to it in a smol's body and fight.
// Each one's hide turns a weaker weapon (a club, then a proper weapon, then iron). Walk away and it lets you go;
// win and its stolen light comes home.
// node games/smol-brains/tests/bosses.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");

seeded(4260, () => {
  const ctx = load();
  ["possess.js", "embers.js", "bosses.js"].forEach(f => { if (!(f === "embers.js" && ctx.SB.Embers)) vm.runInContext(js(f), ctx, { filename: f }); });
  const SB = ctx.SB, B = SB.Bosses, P = SB.Possess, Surv = SB.Surv; P.headless = true;
  const game = SB.Game.newGame(91); SB.Game.current = game; game.headless = true;
  game.tutorial.done = true;
  SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod));
  const run = (s, until) => { for (let t = 0; t < s; t += SB.TICK) { SB.Game.step(game, SB.TICK); B.tick(game, SB.TICK); if (until && until()) return t; } return s; };
  let draws = 0;
  const o = game.rng, w = function () { draws++; return o.apply(this, arguments); };
  Object.keys(o).forEach(k => { const f = o[k]; w[k] = typeof f === "function" ? function () { draws++; return f.apply(o, arguments); } : f; });

  console.log("1. three lairs, far from the nest");
  check("nothing on the first days", !B.open(game) && B.next(game) == null);
  game.time = SB.DAY_LENGTH * 3.3; game.world.time = game.time;
  game.rng = w; const d0 = draws; const s = B.place(game); game.rng = o;
  check("placing them never touches the island's own dice", draws === d0);
  const hm = SB.Society.home(game, 0), L = B.LIST.map(d => s.list[d.id]);
  check("three captains", B.LIST.length === 3 && L.every(Boolean));
  check("each lair is well away from the nest, on dry ground", L.every(e => SB.dist(e.x, e.z, hm.x, hm.z) > 30 && SB.World.walkable(game.world, e.x, e.z, false)), L.map(e => Math.round(SB.dist(e.x, e.z, hm.x, hm.z))).join(" "));
  check("and from each other", SB.dist(L[0].x, L[0].z, L[1].x, L[1].z) > 20 && SB.dist(L[1].x, L[1].z, L[2].x, L[2].z) > 20);
  check("the same island always puts them in the same places", JSON.stringify(B.place(game).list) === JSON.stringify(s.list));
  check("each needs more hits, and a harder weapon, than the last", B.need(B.LIST[0]) < B.need(B.LIST[1]) && B.need(B.LIST[1]) < B.need(B.LIST[2]) && B.LIST[0].armour < B.LIST[1].armour && B.LIST[1].armour < B.LIST[2].armour);

  console.log("2. they wake as the island grows hands");
  game.stats.maxTier = 1;
  check("blobs and critters: nobody to fight yet", !B.awake(game, B.LIST[0]) && B.next(game) == null);
  game.stats.maxTier = 2;
  check("tool-users: Gloom is out there", B.awake(game, B.LIST[0]) && B.next(game).boss.id === "gloom" && !B.next(game).found);
  game.stats.maxTier = 6;
  check("the second waits for the first to fall", !B.awake(game, B.LIST[1]));
  run(1);
  const gloom = B.LIST[0], g = B.creature(game, gloom), e = s.list.gloom;
  check("Gloom sits at its lair", g && g.boss === "gloom" && SB.dist(g.x, g.z, e.x, e.z) < 2 && g.scout && g.scout.hold);
  check("it's big and tough", g.tough === gloom.tough && (!g.look || g.look.size > 1.2));
  const gx = g.x; run(6);
  check("and it doesn't go anywhere", Math.abs(g.x - gx) < 0.5 && g.alive);

  console.log("3. finding it");
  const me = SB.Game.smols(game)[0]; me.tier = 2; me.stage = 3; me.age = 600;
  let found = null; SB.bus.on("bossFound", d => { found = d; });
  me.x = e.x + 30; me.z = e.z; run(1);
  check("a smol wandering near finds the lair", found && found.boss.id === "gloom" && e.found && B.next(game).found);
  check("the goals line says which way", /north|south|east|west/.test(B.next(game).where));

  console.log("4. the fight");
  me.x = e.x + 20; me.z = e.z; me.chem.health = 1; me.chem.hunger = 0.1;
  P.enter(game, me, { free: true });
  run(1);
  check("at a distance it leaves you alone", !P.scout());
  let fight = null; SB.bus.on("bossFight", d => { fight = d; });
  me.x = e.x + 6; me.z = e.z; run(1);
  check("walk up, and it comes for you", P.scout() === g && fight && !g.scout.hold && e.tries === 1);
  const ref = { type: "creature", id: g.id };
  const near = () => { me.x = g.x + 1.4; me.z = g.z; };
  const hit = () => { near(); const r = P.act("use", ref); run(0.6); return r; };
  // bare paws
  near(); P.act("use", ref); run(0.6);
  check("paws bounce off its hide", (g.whacked || 0) === 0 && /bounce/.test(B.blocks(g, 0, null)));
  Surv.add(me, "pokestick", 1); Surv.select(me, Surv.inv(me).s.findIndex(x => x && x.k === "pokestick"));
  hit();
  check("so does a poke stick", (g.whacked || 0) === 0);
  Surv.add(me, "club", 1); Surv.select(me, Surv.inv(me).s.findIndex(x => x && x.k === "club"));
  check("holding a club", Surv.heldKind(me) === "club");
  const hp0 = B.hp(game, gloom);
  for (let i = 0; i < 4; i++) { me.chem.health = 1; hit(); }
  check("a club marks it", g.whacked > 0 && B.hp(game, gloom) < hp0, "hp " + B.hp(game, gloom).toFixed(2));
  check("it bites back", true);
  // walk away
  const hurt = g.whacked;
  { // walk off toward home, on land
    const dh = SB.dist(hm.x, hm.z, e.x, e.z), k = (B.LEASH + 4) / dh; let px = e.x + (hm.x - e.x) * k, pz = e.z + (hm.z - e.z) * k;
    for (let t = 0; t < 40 && !SB.World.walkable(game.world, px, pz, false); t++) { px += (hm.x - e.x) / dh; pz += (hm.z - e.z) / dh; }
    me.x = px; me.z = pz; me.px = px; me.pz = pz; run(1.2);
  }
  check("walk away and it lets you go", !P.scout() && g.alive);
  run(1); check("back at its lair, waiting", g.scout && g.scout.hold && SB.dist(g.x, g.z, e.x, e.z) < 2);
  run(25); check("and it mends", (g.whacked || 0) < hurt, (g.whacked || 0).toFixed(1) + " from " + hurt.toFixed(1));
  // lose
  me.x = e.x + 5; me.z = e.z; me.chem.health = 1; run(1);
  check("back for another go", P.scout() === g && e.tries === 2);
  me.chem.health = 0.25; run(1);
  check("beaten down: you crawl away, alive", !P.scout() && me.alive && g.alive);
  // win
  me.chem.health = 1; me.x = e.x + 5; me.z = e.z; run(1);
  let beaten = null; SB.bus.on("bossBeaten", d => { beaten = d; });
  const em0 = SB.Embers ? SB.Embers.count(game) : 0, sp0 = game.sparks;
  for (let i = 0; i < 80 && g.alive; i++) { me.chem.health = 1; hit(); }
  check("enough hits and it's down", !g.alive && beaten && beaten.boss.id === "gloom" && e.beaten);
  check("its stolen light comes home: embers and sparks", (!SB.Embers || SB.Embers.count(game) === em0 + gloom.embers) && game.sparks >= sp0 + gloom.sparks);
  run(1.5);
  check("the duel is over", !P.scout());
  check("it stays beaten", (run(3), !B.creature(game, gloom)) && B.beaten(game) === 1);

  console.log("5. the next one");
  check("Murk wakes once Gloom has fallen", B.awake(game, B.LIST[1]) && B.next(game).boss.id === "murk");
  run(1);
  const murk = B.creature(game, B.LIST[1]);
  check("it's at its own lair", murk && murk.boss === "murk" && SB.dist(murk.x, murk.z, s.list.murk.x, s.list.murk.z) < 2);
  check("a rock-on-a-stick bounces off Murk; a club doesn't", !!B.blocks(murk, Surv.power("primtool").dmg, "rock-on-a-stick") && !B.blocks(murk, Surv.power("club").dmg, "club"));
  const night = B.LIST[2];
  check("only iron marks the Long Night", !!B.blocks({ boss: "night" }, Surv.power("club").dmg, "club") && !B.blocks({ boss: "night" }, Surv.power("ironaxe").dmg, "iron axe"));
  check("a captain lost from a save is put back", (murk.alive = false, murk.gone = true, run(1), !!B.creature(game, B.LIST[1])));
  const sv = JSON.parse(JSON.stringify(game.quests.boss));
  check("who's beaten and where they live saves with the quest board", sv.placed && sv.list.gloom.beaten && !sv.list.murk.beaten && sv.list.night.x === s.list.night.x);
  console.log("5b. the beacon waits for all three");
  const builder = SB.Game.smols(game)[0];
  check("with captains still out there, nobody starts the spire", B.gates(game) === false && SB.Ideas.buildNeed(builder, "spire", game) === 0);
  B.win(game, B.LIST[1], me); B.win(game, B.LIST[2], me);
  check("all three beaten: the beacon can be raised", B.gates(game) === true && B.beaten(game) === 3 && SB.Ideas.buildNeed(builder, "spire", game) > 0);
  check("nothing left on the goals list", B.next(game) == null);
  const early = SB.Game.newGame(92); early.headless = true;
  check("an island too young for captains isn't gated", B.gates(early) === true);
  P.leave();
});

console.log("6. the files");
const ui = js("ui.js"), po = js("possess.js"), ph = js("povhud.js"), main = js("main.js"), html = fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8");
check("bosses.js is loaded and ticked", /<script defer src="js\/bosses\.js"><\/script>/.test(html) && /SB\.Bosses\.tick\(game, dt\)/.test(main));
check("a duel has its own banner: name, a bar, when to move", /boss\.icon \+ " " \+ boss\.name \+ " " \+ bar/.test(ph) && /it's reeling: hit it now!/.test(ph));
check("possess.js asks bosses.js how a duel ends, and what bounces", /SB\.Bosses\.duel\(game, c, gr\)/.test(po) && /SB\.Bosses\.blocks\(o, pw\.dmg/.test(po));
check("the next captain is on the goals list", /SB\.Bosses\.next\(g\)/.test(ui) && /a grump captain/.test(ui));
check("finding one and beating one are told", /on\("bossFound"/.test(ui) && /on\("bossBeaten"/.test(ui));

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
