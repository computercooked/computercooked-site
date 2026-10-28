// Money as memory: gifts become remembered debts, small heads forget them, tally sticks stop the forgetting,
// shells arrive with the town and copper with the city's mint. Prices come from need and from each smol's map,
// stalls ask and settle, buyers pick the best deal, the bounty miracle prints money (and prices climb), and the
// weekly market day spreads gossip and ideas.
// node games/smol-brains/tests/economy2.test.js
"use strict";
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
function run(SB, game, secs) { for (let t = 0; t < secs / SB.TICK; t++) SB.Game.step(game, SB.TICK); }
function fed(SB, game) { SB.Game.smols(game).forEach(c => { c.chem.cold = 0; c.chem.health = Math.max(c.chem.health, 0.9); c.chem.sick = 0; }); }
function runFed(SB, game, secs) { for (let t = 0; t < secs; t += 1) { run(SB, game, 1); fed(SB, game); } }

function island(seed, tier, n, setup) {
  const SB = load().SB;
  const game = SB.Game.newGame(seed); SB.Game.current = game; game.tutorial.done = true; game.time = 1500; game.podT = 1e9; game.strangerT = 1e9;
  if (game.dir) game.dir.nextT = 1e9;
  game.world.items.filter(o => o.kind === "egg").forEach(o => SB.World.remove(game.world, o));
  const cs = SB.Debug.spawnTier(tier, n);
  const h = SB.Society.home(game, 0);
  cs.forEach((c, i) => { c.asleep = false; c.x = h.x + (i % 8) - 3.5; c.z = h.z + Math.floor(i / 8) - 2; c.age = Math.max(c.age, 700); c.lifespan = 1e7; c.chem.hunger = 0.1; });
  if (setup) setup(SB, game, cs, h);
  return { SB, game, cs, h };
}
function town(seed, n, ideas) {
  return island(seed, 5, n || 18, (SB, game, cs, h) => {
    cs.forEach(c => SB.Debug.ideas(c, ideas || SB.Ideas.LIST.filter(d => !d.civ || d.id === "market").map(d => d.id)));
    SB.Debug.build("campfire", h.x, h.z + 6); SB.Debug.build("hut", h.x - 5, h.z + 8); SB.Debug.build("hut", h.x + 5, h.z + 8);
    SB.Debug.build("stall", h.x + 7, h.z - 2); SB.Debug.build("stall", h.x + 8.5, h.z - 3.5);
  });
}

console.log("1. a gift is a debt, remembered");
{
  const { SB, game, cs } = island(71, 5, 4);
  const [a, b] = cs;
  SB.bus.emit("give", { c: a, to: b, item: { kind: "apple" } });
  check("the receiver owes the giver", b.owe && b.owe[a.id] > 0, JSON.stringify(b.owe));
  check("and remembers it", b.mind.ep.some(e => /i owe/.test(e.w) && e.w.indexOf(a.name) >= 0));
  SB.bus.emit("give", { c: b, to: a, item: { kind: "apple" } });
  check("giving back squares it", !b.owe[a.id] && !(a.owe && a.owe[b.id]));
  check("the island counts the debts", SB.Economy.debts(game).n === 0 && game.econ.gives === 2);
}

console.log("2. small heads forget debts; tally sticks don't");
{
  const { SB, game, cs } = island(72, 1, 6);
  const kid = cs[0];
  cs.slice(1).forEach(o => SB.bus.emit("give", { c: o, to: kid, item: { kind: "berry" } }));
  check("a critter keeps only a debt or so", Object.keys(kid.owe).length <= 1, Object.keys(kid.owe).length);
  check("the rest are forgotten", game.econ.forgot >= 3, game.econ.forgot);
  game.econ.tally = true;
  const big = cs[1];
  cs.slice(2).concat([kid]).forEach(o => SB.bus.emit("give", { c: o, to: big, item: { kind: "berry" } }));
  check("with tally sticks every debt is kept", Object.keys(big.owe).length === 5, Object.keys(big.owe).length);
}

console.log("3. tally sticks, then shells, are invented when they're needed");
{
  const { SB, game, cs } = town(73, 18);
  const ev = []; let atCoins = null; ["eureka", "coins"].forEach(k => SB.bus.on(k, d => ev.push([k, d.id]))); SB.bus.on("coins", () => { atCoins = SB.Game.smols(game).filter(c => c.stage >= 3 && !c.stranger).map(c => c.purse || 0); });
  runFed(SB, game, 6);
  check("a town", SB.Civ.era(game) === 2, SB.Civ.eraName(game));
  for (let i = 0; i < 12; i++) SB.bus.emit("give", { c: cs[i], to: cs[i + 1], item: { kind: "apple" } });
  runFed(SB, game, 120);
  check("a thinker carves tally sticks when debts pile up", ev.some(e => e[1] === "tally"));
  check("a town with tallies agrees on shell money", game.econ.coins && ev.some(e => e[0] === "coins"));
  check("every grown-up gets a few shells", atCoins && atCoins.every(p => p >= 3), atCoins && atCoins.slice(0, 5).join(","));
  check("the money is called shells", SB.Economy.money(game) === "shells");
}

console.log("4. prices come from need and from the map in each head");
{
  const { SB, game, cs } = island(74, 5, 3);
  SB.Economy.init(game);
  const [a] = cs;
  a.chem.hunger = 0.1; const full = SB.Economy.valueFor(a, "food", game);
  a.chem.hunger = 0.9; const hungry = SB.Economy.valueFor(a, "food", game);
  check("hungry smols pay more for food", hungry > full * 1.5, full.toFixed(2) + " → " + hungry.toFixed(2));
  SB.Mind.ensure(a); a.mind.pl = []; const lost = SB.Economy.valueFor(a, "food", game);
  SB.Mind.learnPlace(a, game, "food", a.x + 1, a.z, "berries near home", 1); const near = SB.Economy.valueFor(a, "food", game);
  check("knowing a food patch nearby makes food cheaper", near < lost, lost.toFixed(2) + " → " + near.toFixed(2));
  a.chem.cold = 0.9; const cold = SB.Economy.valueFor(a, "cloak", game); a.chem.cold = 0;
  check("cold smols want cloaks", cold > SB.Economy.valueFor(a, "cloak", game));
  check("fewer than 8 kinds of goods", Object.keys(SB.Economy.GOODS).length <= 8);
}

console.log("5. stalls ask, buyers compare, prices settle");
seeded(75, () => { // seeded: whether a hungry smol reaches a stall or grabs a berry on the way is luck
  const { SB, game, cs } = town(75, 18);
  runFed(SB, game, 6);
  game.econ.coins = true; cs.forEach(c => c.purse = 20);
  const stalls = SB.Economy.stalls(game);
  check("each stall has a keeper, a good and an asking price", stalls.every(s => s.data.owner != null && s.data.good && s.data.ask > 0), stalls.map(s => s.data.good + "@" + s.data.ask).join(" "));
  stalls.forEach(s => { s.data.good = "food"; s.data.stock = 5; });
  stalls[0].data.ask = 0.5; stalls[1].data.ask = 2.5;
  const buyer = cs.find(c => c.id !== stalls[0].data.owner && c.id !== stalls[1].data.owner);
  buyer.chem.hunger = 0.9;
  const sales = []; SB.bus.on("sale", d => sales.push(d));
  const ask0 = stalls[0].data.ask, p0 = buyer.purse;
  check("a buyer can buy", SB.Economy.buy(game, buyer, stalls[0]));
  check("money changes hands", buyer.purse < p0 && SB.Game.byId(game, stalls[0].data.owner).purse > 20);
  check("a sale nudges the ask up", stalls[0].data.ask > ask0);
  check("and the buyer eats", buyer.chem.hunger < 0.9);
  // shopping: hungry smols walk to the cheaper stall
  sales.length = 0;
  SB.Game.smols(game).forEach(c => { c.chem.hunger = 0.85; c._shop = null; });
  for (let t = 0; t < 40; t++) { run(SB, game, 1); }
  const cheap = sales.filter(s => s.st === stalls[0]).length, dear = sales.filter(s => s.st === stalls[1]).length;
  check("hungry smols go shopping", sales.length >= 2, sales.length + " sales");
  check("they prefer the cheaper stall", cheap >= dear, cheap + " vs " + dear);
  // an unsold stall drops its price
  const s1 = stalls[1]; s1.data.stock = 5; const a1 = s1.data.ask;
  SB.Game.smols(game).forEach(c => { c.chem.hunger = 0; c.purse = 0; });
  runFed(SB, game, 100);
  check("unsold, the ask comes down", s1.data.ask < a1, a1.toFixed(2) + " → " + s1.data.ask.toFixed(2));
  s1.data.hist = [1, 1.05, 1.02, 0.98];
  check("a stall whose prices stopped moving has settled", SB.Economy.settled(s1));
});

console.log("6. the bounty miracle prints money, and prices climb");
{
  const { SB, game, cs, h } = town(76, 18);
  runFed(SB, game, 6);
  game.econ.coins = true; cs.forEach(c => c.purse = 3);
  for (let i = 0; i < 4; i++) runFed(SB, game, 10);
  const before = game.econ.index, supply = SB.Economy.supply(game);
  const printed = []; SB.bus.on("printed", d => printed.push(d.n));
  for (let i = 0; i < 6; i++) SB.bus.emit("miracle", { id: "bounty", x: h.x, z: h.z });
  check("shells rain down with the fruit", printed.length === 6 && SB.Economy.supply(game) > supply * 2, supply + " → " + Math.round(SB.Economy.supply(game)));
  for (let i = 0; i < 8; i++) runFed(SB, game, 10);
  check("more money, same apples: prices go up", game.econ.index > before * 1.4, before + " → " + game.econ.index);
  check("the price history is kept", game.econ.cpi.length >= 1);
}

console.log("7. market day: a crowd, gossip and ideas");
{
  const { SB, game, cs } = town(77, 18, ["share", "market"]);
  cs.forEach((c, i) => SB.Debug.ideas(c, i < 4 ? SB.Ideas.LIST.filter(d => !d.civ || d.id === "market").map(d => d.id) : ["share", "market"]));
  const day = Math.ceil(game.time / SB.DAY_LENGTH / 2) * 2;
  game.time = day * SB.DAY_LENGTH + SB.DAY_LENGTH * 0.33; game.world.time = game.time;
  const md = []; SB.bus.on("marketDay", d => md.push(d.md)); const end = []; SB.bus.on("marketDayEnd", d => end.push(d.md));
  const ideas0 = cs.reduce((n, c) => n + SB.Ideas.count(c), 0);
  runFed(SB, game, 250);
  check("market day happens", md.length === 1);
  check("and ends", end.length === 1);
  check("people gathered and talked", end[0] && end[0].n > 10, end[0] && end[0].n);
  check("ideas changed hands", cs.reduce((n, c) => n + SB.Ideas.count(c), 0) > ideas0 && end[0].ideas > 0, end[0] && end[0].ideas + " ideas, " + end[0].gossip + " gossip");
  check("not again the same day", (runFed(SB, game, 30), md.length === 1));
}

console.log("8. copper from the city's mint");
{
  const { SB, game, cs, h } = island(78, 5, 32, (SB, game, cs, h) => {
    cs.forEach(c => SB.Debug.ideas(c));
    SB.Debug.build("campfire", h.x, h.z + 6); SB.Debug.build("hut", h.x - 5, h.z + 8); SB.Debug.build("hut", h.x + 5, h.z + 8);
    SB.Debug.build("stall", h.x + 7, h.z - 2); SB.Debug.build("stall", h.x + 8.5, h.z - 3.5); SB.Debug.build("hall", h.x - 8, h.z - 6);
    SB.Debug.build("mint", h.x - 3, h.z - 9);
    for (let i = 0; i < 4; i++) SB.World.add(game.world, game, "metal", h.x - 3 + i * 0.3, h.z - 7, {});
  });
  runFed(SB, game, 100);
  check("a city", SB.Civ.era(game) === 3);
  check("the mint stamps copper", game.econ.copper && game.econ.minted > 0, game.econ.minted);
  check("the money is copper now", SB.Economy.money(game) === "copper");
}

console.log("9. saving the economy");
{
  const { SB, game, cs } = town(79, 18);
  runFed(SB, game, 6);
  game.econ.coins = true; game.econ.tally = true; game.econ.printed = 9; cs[0].purse = 4.25; cs[1].owe = { [cs[0].id]: 1.5 };
  const data = JSON.parse(JSON.stringify(SB.Save.snapshot(game)));
  const g2 = SB.Save.revive(data);
  check("money and prices are kept", g2.econ.coins && g2.econ.printed === 9 && g2.econ.price.food === game.econ.price.food);
  check("purses and debts are kept", SB.Game.byId(g2, cs[0].id).purse === 4.25 && SB.Game.byId(g2, cs[1].id).owe[cs[0].id] === 1.5);
  check("stalls keep their asks", SB.Economy.stalls(g2).every(s => s.data.ask > 0));
  data.creatures[0].purse = "lots"; data.creatures[1].owe = 7;
  const g3 = SB.Save.revive(data);
  check("bad purses and debts are cleaned up", g3.creatures.every(c => c.purse == null || (typeof c.purse === "number" && c.purse >= 0)) && g3.creatures.every(c => !c.owe || typeof c.owe === "object"));
}

console.log(failed ? "\n" + failed + " FAILED" : "\nall passed");
process.exit(failed ? 1 : 0);
