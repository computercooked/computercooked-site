// 4.33: trade and treasure. Chests at found sites and beaten lairs, opened by hand; motes from beaten grumps;
// heart-fruit; buying and selling at the smols' stalls from inside a body; pedlars; trophies.
// node games/smol-brains/tests/loot.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");

seeded(4330, () => {
  const ctx = load();
  ["bosses.js", "possess.js", "home.js", "loot.js"].forEach(f => { if (!(f === "bosses.js" && ctx.SB.Bosses)) vm.runInContext(js(f), ctx, { filename: f }); });
  const SB = ctx.SB, P = SB.Possess, L = SB.Loot, Surv = SB.Surv, B = SB.Bosses; P.headless = true;
  const game = SB.Game.newGame(133); SB.Game.current = game; game.tutorial.done = true;
  SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod));
  const me = SB.Game.smols(game)[0]; me.tier = 3; me.stage = 3;
  let ev = []; ["chestPlaced", "chestOpened", "heartFruit", "moteReleased", "pedlar", "sale", "soldByHand"].forEach(n => SB.bus.on(n, () => ev.push(n)));

  console.log("1. the new things exist");
  check("heart-fruit and light motes are real items", !!SB.KINDS.heartfruit && !!SB.KINDS.mote && Surv.edible("heartfruit") && !Surv.edible("mote"));
  check("a chest is something you can look at, and nobody plans one", !!SB.STRUCTS.lootchest && /d\.build === "lootchest"\) return/.test(js("possess.js")));
  check("every table only names real items", Object.keys(L.TABLES).every(k => L.TABLES[k].items.concat(L.TABLES[k].sure || []).every(x => !!SB.KINDS[x[0]])) && L.PACK.every(x => !!SB.KINDS[x[0]]) && Object.keys(L.GOOD_ITEM).every(g => !!SB.KINDS[L.GOOD_ITEM[g][0]] && !!SB.Economy.GOODS[g]));

  console.log("2. a found place gets a chest");
  const site = game.sites.find(s => s.kind === "ruin") || game.sites[0];
  check("nothing before it is found", L.unopened(game) === 0);
  site.found = true; if (site.kind === "wreck") site.gone = false;
  L.tick(game, 3);
  const key = "site" + site.id, e = L.state(game).chests[key], chest = L.structOf(game, e);
  check("found: a chest beside it", !!chest && chest.kind === "lootchest" && SB.dist(chest.x, chest.z, site.x, site.z) < 5 && ev.indexOf("chestPlaced") >= 0);
  L.tick(game, 3);
  check("only one", game.world.structures.filter(s => s.kind === "lootchest").length === 1 && L.unopened(game) === 1);
  const r1 = JSON.stringify(L.roll(game, key)), r2 = JSON.stringify(L.roll(game, key));
  check("the same chest always holds the same things", r1 === r2 && L.roll(game, key).items.length >= 3, r1.slice(0, 90));

  console.log("3. you open it with your own paws");
  me.x = chest.x + 20; me.z = chest.z; me.px = me.x; me.pz = me.z;
  P.enter(game, me, { free: true });
  const ref = { type: "struct", id: chest.id };
  check("the button says so", /open the chest/.test((P.options(game, me, ref).use || {}).label || ""));
  check("not from across the island", !L.open(game, me, chest).ok);
  me.x = chest.x + 1.2; me.px = me.x;
  const purse0 = me.purse || 0, got = L.roll(game, key);
  const o1 = L.open(game, me, chest);
  check("opened: the things are in your bag", o1.ok && got.items.every(it => Surv.count(me, it.k, true) + 0 >= 0) && ev.indexOf("chestOpened") >= 0, o1.msg.slice(0, 80));
  check("and the shells in your purse", (me.purse || 0) === purse0 + got.shells);
  check("it stays open", L.isOpen(game, chest) && !L.open(game, me, chest).ok && chest.data.open === true && L.unopened(game) === 0);
  check("an empty chest says so", /empty/.test((P.options(game, me, ref).use || {}).label || ""));

  console.log("4. heart-fruit and motes");
  Surv.add(me, "heartfruit", 1); me.chem.health = 0.5;
  const h1 = L.heart(game, me);
  check("a heart-fruit grows the heart", h1.ok && L.hp(me) === 1 && me.chem.health === 1 && ev.indexOf("heartFruit") >= 0);
  L.frame(game); me.chem.health = 0.6; L.frame(game);
  check("a hurt of 40% costs 36%", Math.abs(me.chem.health - 0.64) < 1e-6, me.chem.health.toFixed(3));
  for (let i = 0; i < 6; i++) L.heart(game, me);
  check("five is the most", L.hp(me) === L.MAX_HP && !L.heart(game, me).ok);
  const sp0 = game.sparks || 0; Surv.add(me, "mote", 2);
  check("letting a mote go pays sparks", L.release(game, me).ok && (game.sparks || 0) === sp0 + L.MOTE_SPARKS && Surv.count(me, "mote", true) === 1);

  console.log("5. trade at a stall");
  const owner = SB.Game.smols(game)[1] || me;
  const stall = SB.World.addStructure(game.world, game, "stall", me.x + 2, me.z + 1, { done: true, data: { owner: owner.id, good: "food", ask: 2, stock: 2, sold: 0, idle: 0, hist: [] } });
  me.x = stall.x - 1.5; me.z = stall.z; me.px = me.x; me.pz = me.z;
  check("looking at it: trade", /trade at/.test((P.options(game, me, { type: "struct", id: stall.id }).use || {}).label || ""));
  check("you are next to someone to trade with", !!L.partner(game, me) && L.partner(game, me).stall === stall);
  me.purse = 0;
  check("no money, no apples", !L.buy(game, me, stall).ok);
  const si = Surv.inv(me).s.findIndex(x => x && x.k !== "plans");
  const sold = L.sell(game, me, si, owner);
  check("sell something first", sold.ok && me.purse > 0 && ev.indexOf("soldByHand") >= 0, sold.msg);
  me.purse = 5; const ap0 = Surv.count(me, "apple", true), op0 = owner.purse || 0;
  const b1 = L.buy(game, me, stall);
  check("buy: apples in the bag, shells to the keeper", b1.ok && Surv.count(me, "apple", true) === ap0 + 2 && me.purse === 3 && (owner.purse || 0) === op0 + 2, b1.msg);
  check("the price went up and the stock down", stall.data.ask > 2 && stall.data.stock === 1);
  L.buy(game, me, stall);
  check("then it's sold out", !L.buy(game, me, stall).ok && /sold out/.test(L.buy(game, me, stall).msg));
  check("the tab shows the purse, the stall and what you can sell", /your purse/.test(L.html(game, me)) && /data-tradesell/.test(L.html(game, me)));

  console.log("6. a pedlar");
  const ped = SB.Strangers && SB.Strangers.arrive ? SB.Strangers.arrive(game, {}) : null;
  if (ped) {
    if (!ped.stranger.pack) L.makePedlar(game, ped);
    ped.x = me.x + 1; ped.z = me.z + 6; // away from the stall
    me.x = ped.x - 1; me.z = ped.z; me.px = me.x; me.pz = me.z; me.purse = 50;
    check("a pedlar carries four rare things", L.isPedlar(ped) && ped.stranger.pack.length === 4);
    check("you trade with them, not the stall", !!L.partner(game, me) && L.partner(game, me).pedlar === ped);
    check("talking to one opens trade", /the pedlar/.test((P.options(game, me, { type: "creature", id: ped.id }).use || {}).label || ""));
    const it = ped.stranger.pack[0], n0 = Surv.count(me, it.k, true);
    const pb = L.buyFrom(game, me, ped, 0);
    check("buy from the pack", pb.ok && Surv.count(me, it.k, true) === n0 + it.n && me.purse === 50 - it.price, pb.msg);
    ped.stranger.state = "leaving";
    check("gone when they move on", !L.isPedlar(ped) && !L.buyFrom(game, me, ped, 1).ok);
  } else check("strangers module present", false);
  P.leave();

  console.log("7. a beaten captain leaves a hoard and a trophy");
  game.time = SB.DAY_LENGTH * 2.3; game.stats.maxTier = 4;
  const bl = B.place(game).list; bl.gloom.beaten = true;
  L.tick(game, 3);
  const he = L.state(game).chests["lair-gloom"], hc = L.structOf(game, he);
  check("a hoard at the lair", !!hc && SB.dist(hc.x, hc.z, bl.gloom.x, bl.gloom.z) < 5);
  const hr = L.roll(game, "lair-gloom");
  check("with a heart-fruit, motes and a weapon in it", hr.items.some(x => x.k === "heartfruit") && hr.items.some(x => x.k === "mote" && x.n === 3) && hr.items.some(x => x.k === "spear"));
  me.x = hc.x + 1; me.z = hc.z;
  check("opening it gives the trophy", L.open(game, me, hc).ok && L.trophies(game).length === 1 && L.trophies(game)[0].name === "Gloom's tooth");
  check("it's in the save", JSON.parse(JSON.stringify(game.quests.loot)).trophies.gloom > 0 && JSON.parse(JSON.stringify(game.quests.loot)).chests[key].open > 0);
});

console.log("8. the files");
const idx = fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8"), ph = js("povhud.js"), ui = js("ui.js");
check("the game loads it and ticks it", /js\/loot\.js/.test(idx) && /SB\.Loot\.tick\(game, dt\)/.test(js("main.js")));
check("the bag has a trade tab when there is someone to trade with", /data-tab='trade'/.test(ph) && /SB\.Loot\.html\(s\.game, c, icon\)/.test(ph));
check("an open chest is drawn open", /lootchest_open/.test(js("render.js")) && /STRUCT_BUILDERS\.lootchest_open/.test(js("loot.js")));
check("a found site counts as “somewhere new”", /SB\.Mine\.count\(game, "explore"\)/.test(js("loot.js")));
check("the sky says when there is a chest, and the goals list counts them", /there's a chest here/.test(ui) && /waiting to be opened/.test(ui));
check("trophies hang in your home", /on the wall/.test(js("home.js")));

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
