/* smol brains 2 — economy.js
   Money as memory. A gift is remembered as a debt ("i owe Bink one"), and small heads forget debts, so the
   first economy is just favours. When favours pile up a thinker carves tally sticks, and debts stop being
   forgotten. A town agrees that shells are worth something; a city stamps copper at a mint. Prices are never
   set by anyone: a smol's price for a good is how badly it needs it, how far away it remembers finding it,
   and how much money is going round. Stalls ask, buyers compare, and the asks settle. The sky's bounty
   miracle drops shells too, and more shells chasing the same apples is inflation: you are the money printer.
   Once a week the market day fills the square, and gossip and ideas pass from stall to stall. */
(function () {
  "use strict";
  var SB = window.SB;
  var E = (SB.Economy = {});

  // the goods a stall can sell (fewer than 8 kinds keeps the price tags readable)
  E.GOODS = {
    food: { name: "food", icon: "🍎", base: 1, kinds: ["apple", "berry", "banana", "nutmeat", "carrot", "pumpkin", "grain", "cooked", "honey", "pricklypear", "glowcap"] },
    fish: { name: "fish", icon: "🐟", base: 1.4, kinds: ["fish", "clam", "meat"] },
    bread: { name: "bread", icon: "🍞", base: 2.2, kinds: ["bread"] },
    pot: { name: "pots", icon: "🏺", base: 3, kinds: ["pot", "basket"] },
    cloak: { name: "cloaks", icon: "🧥", base: 4, kinds: ["cloak", "fur"] },
    tool: { name: "tools", icon: "🔨", base: 3.5, kinds: ["axe", "stoneaxe", "spear", "hammer", "blade", "rod", "club"] },
    wood: { name: "wood", icon: "🪵", base: 0.6, kinds: ["stick", "log", "fiber"] },
    stone: { name: "stone", icon: "🪨", base: 0.7, kinds: ["stone", "clay", "flint", "ore", "metal"] }
  };
  var GOODS = Object.keys(E.GOODS);
  E.goodOf = function (kind) { for (var i = 0; i < GOODS.length; i++) if (E.GOODS[GOODS[i]].kinds.indexOf(kind) >= 0) return GOODS[i]; return null; };
  // what each job puts on its stall
  var JOB_GOOD = { farmer: "food", fisher: "fish", potter: "pot", smith: "tool", builder: "wood", trader: "food", teacher: "bread", guard: "stone", scribe: "bread" };

  function era(game) { return SB.Civ ? SB.Civ.era(game) : 0; }
  function adults(game) { return game.creatures.filter(function (c) { return c.alive && c.species === "smol" && !c.stranger && c.stage >= 3; }); }
  function knows(game, id) { return game.creatures.some(function (c) { return c.alive && c.species === "smol" && SB.Ideas.known(c, id); }); }

  E.init = function (game) {
    var e = game.econ;
    if (!e || typeof e !== "object") e = game.econ = {};
    if (!e.price || typeof e.price !== "object") e.price = {};
    GOODS.forEach(function (g) { if (!(e.price[g] > 0)) e.price[g] = E.GOODS[g].base; });
    if (!Array.isArray(e.cpi)) e.cpi = [];
    e.gives = e.gives || 0; e.sales = e.sales || 0; e.printed = e.printed || 0; e.minted = e.minted || 0;
    e.marketDay = e.marketDay || null; e.lastDay = e.lastDay == null ? -1 : e.lastDay;
    return e;
  };

  /* ---------------- money ---------------- */

  // "money": what this island uses to settle up. favours → tally → shells → copper
  E.money = function (game) {
    var e = game.econ || {};
    return e.copper ? "copper" : e.coins ? "shells" : e.tally ? "tally" : "favours";
  };
  E.moneyIcon = function (game) { var m = E.money(game); return m === "copper" ? "🪙" : m === "shells" ? "🐚" : m === "tally" ? "🪵" : "🤝"; };
  E.supply = function (game) { var n = 0; game.creatures.forEach(function (c) { if (c.alive && c.purse > 0) n += c.purse; }); return n; };
  // how many coins per grown-up are going round, relative to the 3 everyone started with
  E.moneyFactor = function (game) {
    if (!game.econ || !game.econ.coins) return 1;
    var a = adults(game).length || 1;
    return SB.clamp(Math.pow(Math.max(0.2, E.supply(game) / a / 3), 0.7), 0.5, 6);
  };

  /* ---------------- debts: money as memory ---------------- */

  // how many debts a head can hold before it forgets the oldest. tally sticks remember for you
  E.debtCap = function (c, game) { return game.econ && game.econ.tally ? 24 : 1 + Math.floor((c.tier || 0) / 2); };
  E.owe = function (game, debtor, lender, amt, why) {
    if (!debtor || !lender || debtor === lender) return;
    var o = debtor.owe || (debtor.owe = {});
    // paying back first: if the lender already owes the debtor, it cancels
    var back = lender.owe && lender.owe[debtor.id];
    if (back > 0) {
      var k = Math.min(back, amt);
      lender.owe[debtor.id] = Math.round((back - k) * 100) / 100; amt -= k;
      if (lender.owe[debtor.id] <= 0.01) delete lender.owe[debtor.id];
      if (SB.Mind && k > 0) SB.Mind.remember(lender, game, "social", debtor.name + " and i are square", 0.2, null, null, debtor.name);
    }
    if (amt <= 0.01) return;
    o[lender.id] = Math.round(((o[lender.id] || 0) + amt) * 100) / 100;
    if (SB.Mind) SB.Mind.remember(debtor, game, "social", "i owe " + lender.name + " " + (why || "one"), 0.35, null, null, lender.name);
    // small heads forget: the smallest debts slip away
    var ids = Object.keys(o), cap = E.debtCap(debtor, game);
    if (ids.length > cap) {
      ids.sort(function (a, b) { return o[a] - o[b]; });
      for (var i = 0; i < ids.length - cap; i++) { delete o[ids[i]]; game.econ.forgot = (game.econ.forgot || 0) + 1; }
    }
  };
  E.debts = function (game) {
    var n = 0, m = 0;
    game.creatures.forEach(function (c) { if (c.alive && c.owe) for (var k in c.owe) { n++; m += c.owe[k]; } });
    return { n: n, total: Math.round(m * 10) / 10 };
  };

  /* ---------------- prices ---------------- */

  // how much one smol would pay for a good: need, and how far away it remembers getting one
  E.valueFor = function (c, good, game) {
    var g = E.GOODS[good], ch = c.chem, need = 1;
    if (good === "food" || good === "fish" || good === "bread") need = 0.5 + ch.hunger * 1.6;
    else if (good === "cloak") need = 0.6 + (ch.cold || 0) * 1.8;
    else if (good === "tool" || good === "pot") need = 0.8 + (ch.bored || 0) * 0.6;
    else need = 0.7;
    // the cognitive map: a food patch remembered nearby makes bought food less tempting
    var far = 1;
    if ((good === "food" || good === "fish") && SB.Mind && c.mind) {
      var p = SB.Mind.recall(c, game, "food");
      far = p ? SB.clamp(0.6 + SB.dist(p.x, p.z, c.x, c.z) / 30, 0.6, 1.8) : 1.6;
    }
    return g.base * need * far * E.moneyFactor(game);
  };
  // the island's going rate: the average of what the grown-ups would pay
  function reprice(game) {
    var e = game.econ, a = adults(game);
    if (!a.length) return;
    var idx = 0;
    GOODS.forEach(function (g) {
      var s = 0;
      for (var i = 0; i < a.length; i++) s += E.valueFor(a[i], g, game);
      var v = s / a.length;
      e.price[g] = Math.round((e.price[g] + (v - e.price[g]) * 0.3) * 100) / 100;
      idx += e.price[g] / E.GOODS[g].base;
    });
    e.index = Math.round(idx / GOODS.length * 100) / 100;
  }

  /* ---------------- stalls ---------------- */

  E.stalls = function (game) { return game.world.structures.filter(function (s) { return s.kind === "stall" && s.done; }); };
  function setupStall(st, game) {
    var d = st.data;
    if (d.good && d.ask > 0) return;
    var owner = SB.Game.byId(game, d.owner != null ? d.owner : (st.builders || [])[0]);
    if (!owner || !owner.alive) owner = adults(game).filter(function (c) { return SB.dist(c.x, c.z, st.x, st.z) < 30; })[0];
    d.owner = owner ? owner.id : null;
    d.good = (owner && JOB_GOOD[owner.job]) || game.rng.pick(["food", "food", "wood", "pot", "fish"]);
    d.ask = game.econ.price[d.good] || 1;
    d.stock = d.stock || 2; d.sold = d.sold || 0; d.idle = 0; d.hist = d.hist || [];
  }
  function restock(st, game, dt) {
    var d = st.data, owner = SB.Game.byId(game, d.owner);
    if (!owner || !owner.alive) { d.owner = null; d.good = null; d.ask = 0; return; }
    // the keeper's trade sets what the stall sells
    var want = JOB_GOOD[owner.job];
    if (want && want !== d.good && d.stock <= 0) { d.good = want; d.ask = game.econ.price[want]; }
    d.restockT = (d.restockT || 0) + dt;
    if (d.restockT > 30 && d.stock < 5) { d.restockT = 0; d.stock++; }
    // unsold for a while: the ask drops. a sale nudges it up (see buy). over time it settles
    d.idle = (d.idle || 0) + dt;
    if (d.idle > 45) { d.idle = 0; d.ask = Math.max(E.GOODS[d.good].base * 0.3, d.ask * 0.93); }
    var p = game.econ.price[d.good];
    d.ask = SB.clamp(d.ask, p * 0.4, p * 3);
    d.ask = Math.round(d.ask * 100) / 100;
  }
  // has this stall's ask stopped moving much?
  E.settled = function (st) { var h = st.data.hist || []; if (h.length < 4) return false; var lo = Math.min.apply(null, h), hi = Math.max.apply(null, h); return hi - lo < hi * 0.15; };

  // a buyer pays (shells, tally or a plain favour) and gets the good
  E.buy = function (game, c, st) {
    var d = st.data, seller = SB.Game.byId(game, d.owner), e = game.econ;
    if (!seller || d.stock <= 0 || seller === c) return false;
    var price = d.ask;
    if (e.coins) {
      if ((c.purse || 0) < price) return false;
      c.purse = Math.round((c.purse - price) * 100) / 100;
      seller.purse = Math.round(((seller.purse || 0) + price) * 100) / 100;
    } else E.owe(game, c, seller, price, "for " + E.GOODS[d.good].name);
    d.stock--; d.sold++; d.idle = 0;
    d.ask = Math.round(d.ask * 1.08 * 100) / 100;
    d.hist.push(price); if (d.hist.length > 8) d.hist.shift();
    e.sales++;
    var g = d.good;
    if (g === "food" || g === "fish" || g === "bread") SB.Chem.apply(c.chem, { hunger: g === "bread" ? -0.6 : -0.4 });
    else if (g === "cloak") SB.Chem.apply(c.chem, { cold: -0.4 });
    else SB.Chem.apply(c.chem, { bored: -0.25 });
    if (SB.Creature) { SB.Creature.emote(c, "yum", 1.2); SB.Creature.emote(seller, "happy", 1); }
    if (SB.Social) SB.Social.remember(game, c, seller, "trade", 3, "sold me " + E.GOODS[g].name, 3600, 12);
    if (SB.Mind) SB.Mind.learnPlace(c, game, "food", st.x, st.z, "the market", 0.5);
    SB.bus.emit("sale", { seller: seller, buyer: c, good: g, price: price, st: st });
    return true;
  };

  // grown-ups with a need and nothing to do go shopping: the cheapest ask they can reach, counting the walk
  function shop(game) {
    var stalls = E.stalls(game).filter(function (s) { return s.data.good && s.data.stock > 0; });
    if (!stalls.length) return;
    adults(game).forEach(function (c) {
      var sh = c._shop;
      if (sh) {
        var st = game.world.structures.find(function (s) { return s.id === sh.id; });
        if (!st || game.time - sh.t > 40) { c._shop = null; return; }
        if (SB.dist(c.x, c.z, st.x, st.z) < 2.6) { E.buy(game, c, st); c._shop = null; }
        return;
      }
      if (!SB.Social || !SB.Social.free(c) || c.asleep) return;
      var best = null, bv = 0;
      stalls.forEach(function (s) {
        var d = s.data;
        if (d.owner === c.id) return;
        var dist = SB.dist(c.x, c.z, s.x, s.z);
        if (dist > 40) return;
        var worth = E.valueFor(c, d.good, game), cost = d.ask + dist * 0.02 * E.moneyFactor(game);
        if (game.econ.coins && (c.purse || 0) < d.ask) return;
        var gain = worth - cost;
        if (gain > bv) { bv = gain; best = s; }
      });
      if (!best || game.rng() > 0.35) return;
      c._shop = { id: best.id, t: game.time };
      SB.Creature.sendTo(c, best.x + (game.rng() - 0.5), best.z + (game.rng() - 0.5), game, 30);
    });
  }

  /* ---------------- market day ---------------- */

  // every couple of days, mid-morning, the free smols gather at the stalls for a few minutes
  E.MARKET_EVERY = 2;
  function marketDay(game, dt) {
    var e = game.econ, w = game.world, stalls = E.stalls(game);
    if (stalls.length < 2) { e.marketDay = null; return; }
    var day = Math.floor(game.time / SB.DAY_LENGTH), tod = (game.time / SB.DAY_LENGTH) % 1;
    if (!e.marketDay && day % E.MARKET_EVERY === 0 && day !== e.lastDay && tod > 0.32 && tod < 0.4) {
      var x = 0, z = 0;
      stalls.forEach(function (s) { x += s.x; z += s.z; });
      e.marketDay = { t0: game.time, x: x / stalls.length, z: z / stalls.length, n: 0, ideas: 0, gossip: 0 };
      e.lastDay = day;
      SB.bus.emit("marketDay", { md: e.marketDay });
      SB.Game.note(game, "it's market day! 🏪 everyone heads to the stalls");
      if (SB.Social) SB.Social.chronicle(game, "🏪", "market day in the square");
    }
    var md = e.marketDay;
    if (!md) return;
    if (game.time - md.t0 > 240 || w.night) {
      SB.bus.emit("marketDayEnd", { md: md });
      if (md.ideas || md.gossip) SB.Game.note(game, "market day's over: " + md.gossip + " bits of gossip and " + md.ideas + " ideas changed hands");
      e.marketDay = null;
      return;
    }
    // the crowd: free grown-ups wander to the square, and anyone standing there chats with a neighbour
    adults(game).forEach(function (c) {
      var d = SB.dist(c.x, c.z, md.x, md.z);
      if (d > 7 && d < 60 && SB.Social && SB.Social.free(c) && game.rng() < 0.3) { SB.Creature.sendTo(c, md.x + (game.rng() - 0.5) * 8, md.z + (game.rng() - 0.5) * 8, game, 40); return; }
      if (d > 8 || game.rng() > 0.25) return;
      md.n++;
      var other = null;
      SB.World.creaturesNear(w, game, c.x, c.z, 4, function (o) { if (!other && o !== c && o.alive && o.species === "smol" && o.stage >= 2) other = o; });
      if (!other) return;
      if (SB.Mind && SB.Mind.tell(c, other, game)) md.gossip++;
      if (SB.Ideas.teach(c, other, game)) md.ideas++;
      if (game.rng() < 0.3 && SB.Social) SB.Social.remember(game, other, c, "market", 2, "chatted at the market", 3600, 10);
    });
  }

  /* ---------------- tally, shells, copper ---------------- */

  function thinkerFor(game, id) {
    var cands = game.creatures.filter(function (c) { return c.alive && c.species === "smol" && !c.stranger && SB.Ideas.canHold(c, id) && !SB.Ideas.known(c, id); });
    cands.sort(function (a, b) { return (b.genome.genes.curiosity || 0) - (a.genome.genes.curiosity || 0); });
    return cands[0] || null;
  }
  function inventions(game, dt) {
    var e = game.econ, r = game.rng;
    // tally sticks: when the island's heads are full of debts (and forgetting them), a thinker starts notching sticks
    if (!knows(game, "tally")) {
      var db = E.debts(game);
      if ((db.n >= 8 || (e.forgot || 0) >= 6) && era(game) >= 1 && r() < 0.25 * dt / 2) {
        var t = thinkerFor(game, "tally");
        if (t && SB.Ideas.discover(t, "tally", game)) { SB.Game.note(game, t.name + " started notching who owes whom on a stick. debts won't be forgotten now 🪵"); if (SB.Social) SB.Social.chronicle(game, "🪵", t.name + " invented tally sticks"); }
      }
    }
    e.tally = knows(game, "tally") || !!e.coins;
    // shells: a town that keeps tallies agrees that shells can stand in for the notches
    if (!knows(game, "coins") && e.tally && era(game) >= 2 && r() < 0.2 * dt / 2) {
      var s = thinkerFor(game, "coins");
      if (s && SB.Ideas.discover(s, "coins", game)) startCoins(game, s);
    }
    if (!e.coins && knows(game, "coins")) startCoins(game, null);
    // copper: at the mint, a smith stamps copper into coins everyone trusts
    if (era(game) >= 3 && !knows(game, "mint") && knows(game, "coins") && r() < 0.15 * dt / 2) {
      var m = thinkerFor(game, "mint");
      if (m) SB.Ideas.discover(m, "mint", game);
    }
    game.world.structures.forEach(function (st) {
      if (st.kind !== "mint" || !st.done) return;
      st.data.t = (st.data.t || 0) + dt;
      if (st.data.t < 40) return;
      st.data.t = 0;
      var metal = game.world.items.find(function (o) { return o.kind === "metal" && o.heldBy == null && SB.dist(o.x, o.z, st.x, st.z) < 12; });
      // copper lying nearby makes a big batch; without it the mint scrapes together a coin or two from offcuts
      var each = metal ? 2 : 1;
      if (metal) SB.World.remove(game.world, metal);
      if (!e.copper) { e.copper = true; SB.Game.note(game, "the mint stamped its first copper coins 🪙. shells are old news"); if (SB.Social) SB.Social.chronicle(game, "🪙", "the first copper coins"); SB.bus.emit("copper", {}); }
      // new coins go to the people the city pays: the council, guards and the scribe first, then whoever's nearest
      var paid = adults(game).filter(function (c) { return c.job === "guard" || c.job === "scribe" || (game.civ && game.civ.council && game.civ.council.leader === c.id); });
      if (!paid.length) paid = adults(game).slice(0, 3);
      paid.forEach(function (c) { c.purse = (c.purse || 0) + each; e.minted += each; });
    });
  }
  function startCoins(game, by) {
    var e = game.econ;
    if (e.coins) return;
    e.coins = true; e.coinsT = game.time;
    // every grown-up gets a handful of shells, and old tallies become shell debts
    adults(game).forEach(function (c) { c.purse = (c.purse || 0) + 3; });
    SB.Game.note(game, (by ? by.name + " convinced everyone that" : "everyone agrees") + " shells are worth something. money! 🐚");
    if (SB.Social) SB.Social.chronicle(game, "🐚", "shell money" + (by ? ", thanks to " + by.name : ""));
    SB.bus.emit("coins", { c: by });
  }

  /* ---------------- tick ---------------- */

  var acc = 0, slow = 0;
  E.tick = function (game, dt) {
    acc += dt;
    if (acc < 2) return;
    var step = acc; acc = 0;
    E.init(game);
    if (era(game) < 1 && !E.stalls(game).length) return;
    inventions(game, step);
    E.stalls(game).forEach(function (st) { setupStall(st, game); restock(st, game, step); });
    shop(game);
    marketDay(game, step);
    slow += step;
    if (slow >= 10) {
      slow = 0;
      reprice(game);
      var cpi = game.econ.cpi, last = cpi[cpi.length - 1];
      if (!last || game.time - last[0] >= 60) { cpi.push([Math.round(game.time), game.econ.index || 1]); if (cpi.length > 120) cpi.shift(); }
      // newborn grown-ups in a coin town get a couple of shells from their family
      if (game.econ.coins) adults(game).forEach(function (c) { if (c.purse == null) c.purse = 1; });
    }
  };

  /* ---------------- events ---------------- */

  E.wire = function () {
    var on = SB.bus.on;
    function g() { return SB.Game && SB.Game.current; }
    on("give", function (d) {
      var game = g();
      if (!game || !d.c || !d.to || d.c.species !== "smol" || d.to.species !== "smol") return;
      E.init(game); game.econ.gives++;
      var good = d.item && E.goodOf(d.item.kind);
      E.owe(game, d.to, d.c, good ? E.GOODS[good].base : 1, good ? "for the " + E.GOODS[good].name : "a favour");
    });
    // the bounty miracle at a town with money: shells fall with the apples
    on("miracle", function (d) {
      var game = g();
      if (!game || d.id !== "bounty" || !game.econ || !game.econ.coins) return;
      var n = 0;
      SB.World.creaturesNear(game.world, game, d.x, d.z, 10, function (c) { if (c.alive && c.species === "smol" && c.stage >= 3) { c.purse = (c.purse || 0) + 2; n += 2; } });
      game.econ.printed += n;
      if (n) { SB.Game.note(game, "shells rained down with the fruit (+" + n + " 🐚). more money, same apples: prices will climb"); SB.bus.emit("printed", { n: n }); }
    });
  };
  E.wire();

  /* ---------------- save ---------------- */

  E.serialize = function (game) {
    var e = game.econ;
    if (!e) return null;
    return { price: e.price, cpi: e.cpi.slice(-120), gives: e.gives, sales: e.sales, printed: e.printed, minted: e.minted, tally: !!e.tally, coins: !!e.coins, coinsT: e.coinsT || 0, copper: !!e.copper, forgot: e.forgot || 0, lastDay: e.lastDay, index: e.index || 1 };
  };
  E.revive = function (game, data) {
    game.econ = {};
    if (data && typeof data === "object") {
      var e = game.econ;
      ["gives", "sales", "printed", "minted", "coinsT", "forgot", "lastDay", "index"].forEach(function (k) { if (typeof data[k] === "number" && isFinite(data[k])) e[k] = data[k]; });
      e.tally = !!data.tally; e.coins = !!data.coins; e.copper = !!data.copper;
      if (data.price && typeof data.price === "object") { e.price = {}; GOODS.forEach(function (g) { var v = data.price[g]; if (typeof v === "number" && v > 0 && isFinite(v)) e.price[g] = v; }); }
      if (Array.isArray(data.cpi)) e.cpi = data.cpi.filter(function (p) { return Array.isArray(p) && isFinite(p[0]) && isFinite(p[1]); });
    }
    E.init(game);
    game.creatures.forEach(function (c) {
      if (c.purse != null && !(typeof c.purse === "number" && isFinite(c.purse) && c.purse >= 0)) c.purse = 0;
      if (c.owe && typeof c.owe !== "object") c.owe = null;
      if (c.owe) for (var k in c.owe) if (!(c.owe[k] > 0)) delete c.owe[k];
    });
  };
})();
