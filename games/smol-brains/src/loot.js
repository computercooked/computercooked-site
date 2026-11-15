/* smol brains — loot.js (4.33, "trade and treasure"): wave 2 of the feature plan.
   The island pays you for going somewhere. Until now a wreck or a ruin gave a few sticks and a line of text, a
   beaten grump gave nothing, and a smol you were inside could not buy from the stalls its own tribe runs.
     chests     one at every site a smol has found (wreck, ruin, crystal cave, wild nest, freed camp, opened pod) and at
                every beaten captain's lair. You open them with your own paws, in a body. What is inside depends on
                the place. A chest is a small building nobody builds (kind "lootchest"), so you can look at it.
     motes      a grump you beat drops a mote of the light it stole: let it go for sparks.
     heart-fruit rare, in chests: eat one and that smol takes a tenth less from every hurt, for good (up to five).
     trade      look at a market stall from inside a smol and trade: buy what it sells, sell what you carry. Your
                money is that smol's own purse, the same one the smols use among themselves.
     pedlars    now and then the stranger at the edge of the village is a pedlar with rare things to sell.
     trophies   each captain leaves one. They hang in your home.
   State: game.quests.loot = { chests: { key: { id, x, z, kind, open } }, trophies: { bossId: day } } (saved with the
   quest board). Bonus hearts live on the smol (c.body.hp). Rolls its own dice, seeded from the island and the chest. */
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var L = SB.Loot = {};
  L.MAX_HP = 5;      // heart-fruits one smol can use
  L.HP_STEP = 0.1;   // each takes this much off every hurt
  L.MOTE_SPARKS = 2;
  L.SIZE = 0.55;     // how big a chest is drawn (building models are made large)
  function dirty(b) { if (SB.Render && SB.Render.markDirty) SB.Render.markDirty(b.x, b.z); }
  L.SELL = 0.6;      // you sell at this share of the going price
  // what a chest can hold: [kind, least, most, weight]; shells: [least, most]; mote / fruit: the chance of one
  L.TABLES = {
    wreck: { name: "the wreck's locker", shells: [2, 5], mote: 0.5, fruit: 0.2, items: [["metal", 1, 2, 3], ["flint", 1, 3, 2], ["fiber", 2, 4, 2], ["plank", 2, 4, 2], ["torch", 1, 1, 1], ["basket", 1, 1, 1]] },
    ruin: { name: "a chest in the ruin", shells: [1, 4], mote: 0.6, fruit: 0.25, items: [["crystal", 1, 1, 2], ["clay", 2, 3, 2], ["pot", 1, 1, 1], ["herb", 1, 2, 2], ["potion", 1, 1, 1], ["stone", 2, 4, 2]] },
    cave: { name: "a chest in the crystals", shells: [0, 2], mote: 0.4, fruit: 0.3, items: [["crystal", 1, 2, 3], ["ore", 2, 3, 3], ["ironore", 1, 2, 2], ["flint", 2, 3, 1]] },
    nest: { name: "a stash by the wild nest", shells: [0, 1], mote: 0.2, fruit: 0.35, items: [["fur", 1, 2, 2], ["berry", 3, 5, 3], ["honey", 1, 1, 2], ["seed", 2, 3, 2]] },
    camp: { name: "the grumps' pile", shells: [3, 6], mote: 0.8, fruit: 0.15, items: [["club", 1, 1, 2], ["spear", 1, 1, 1], ["cooked", 2, 2, 2], ["fur", 1, 1, 2]] },
    pod: { name: "the pod's locker", shells: [1, 3], mote: 0.5, fruit: 0.3, items: [["metal", 1, 2, 2], ["plank", 2, 2, 2], ["cloak", 1, 1, 1], ["bread", 2, 2, 2]] },
    gloom: { name: "Gloom's hoard", shells: [6, 6], motes: 3, fruits: 1, sure: [["spear", 1], ["stoneaxe", 1]], items: [["fur", 2, 2, 1], ["cooked", 2, 3, 1]] },
    murk: { name: "Murk's hoard", shells: [10, 10], motes: 3, fruits: 1, sure: [["axe", 1], ["ironore", 3]], items: [["crystal", 1, 2, 1], ["potion", 1, 1, 1]] },
    night: { name: "the Long Night's hoard", shells: [16, 16], motes: 4, fruits: 2, sure: [["sword", 1], ["iron", 2]], items: [["crystal", 2, 3, 1], ["potion", 2, 2, 1]] }
  };
  L.TROPHY = { gloom: ["🦷", "Gloom's tooth"], murk: ["🪶", "Murk's black feather"], night: ["🌑", "a shard of the Long Night"] };
  // what a stall hands over for one sale of each good (the smols' own stalls only count stock)
  L.GOOD_ITEM = { food: ["apple", 2], fish: ["fish", 1], bread: ["bread", 1], pot: ["pot", 1], cloak: ["cloak", 1], tool: ["stoneaxe", 1], wood: ["stick", 4], stone: ["stone", 4] };
  // a pedlar's pack: [kind, n, price]
  L.PACK = [["heartfruit", 1, 9], ["mote", 1, 3], ["potion", 1, 4], ["seed", 3, 2], ["honey", 1, 2], ["iron", 1, 6], ["crystal", 1, 5], ["torch", 1, 2], ["basket", 1, 4], ["cloak", 1, 5]];

  function Q(game) { return game.quests || (game.quests = { ch: 0, done: {}, n: {} }); }
  function st(game) { var q = Q(game); if (!q.loot || typeof q.loot !== "object") q.loot = { chests: {}, trophies: {} }; if (!q.loot.chests) q.loot.chests = {}; if (!q.loot.trophies) q.loot.trophies = {}; return q.loot; }
  L.state = st;
  function Sv() { return SB.Surv || SB.Survival; }
  function K() { return SB.KINDS; }
  function day(game) { return Math.floor((game.time || 0) / SB.DAY_LENGTH) + 1; }
  function label(k) { return K()[k] && K()[k].label ? K()[k].label : k; }
  function hashKey(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  /* ---------------- chests ---------------- */
  // a dry, walkable spot beside a place, a little off its middle
  function spotNear(game, x, z, key) {
    var w = game.world, r = SB.rng((hashKey(key) ^ (game.seed >>> 0)) >>> 0), W = SB.World;
    for (var t = 0; t < 24; t++) {
      var a = r() * 6.283, d = 1.6 + r() * 1.6 + t * 0.12, px = x + Math.sin(a) * d, pz = z + Math.cos(a) * d;
      if (W.inBounds && !W.inBounds(w, px, pz)) continue;
      if (W.walkable && !W.walkable(w, px, pz, false)) continue;
      if (W.depthAt && W.depthAt(w, px, pz) > 0.02) continue;
      if (t < 16 && W.groundY && Math.max(Math.abs(W.groundY(w, px + 1, pz) - W.groundY(w, px - 1, pz)), Math.abs(W.groundY(w, px, pz + 1) - W.groundY(w, px, pz - 1))) > 0.7) continue; // level ground first: a chest on a cliff face is one nobody finds
      return { x: Math.round(px * 10) / 10, z: Math.round(pz * 10) / 10 };
    }
    return { x: x + 1.5, z: z + 1 };
  }
  L.structOf = function (game, e) {
    if (!e) return null;
    var w = game.world, b = e.id != null && SB.World.structById ? SB.World.structById(w, e.id) : null;
    if (b && b.kind === "lootchest") return b;
    for (var i = 0; i < w.structures.length; i++) { var o = w.structures[i]; if (o.kind === "lootchest" && SB.dist(o.x, o.z, e.x, e.z) < 0.6) { e.id = o.id; return o; } }
    return null;
  };
  // put a chest down for this key (once). table: a key of L.TABLES. Not announced as a building: nobody built it.
  L.place = function (game, key, table, x, z) {
    var s = st(game);
    if (s.chests[key] || !L.TABLES[table] || !SB.STRUCTS.lootchest) return null;
    var p = spotNear(game, x, z, key);
    var b = { id: SB.Game.newId(game), type: "struct", kind: "lootchest", noun: "wonder", x: p.x, z: p.z, rot: (hashKey(key) % 628) / 100, s: L.SIZE,
      done: true, work: 0, need: {}, tribe: 0, builders: [], data: { loot: key, table: table }, born: game.time, name: null };
    game.world.structures.push(b);
    dirty(b);
    s.chests[key] = { id: b.id, x: p.x, z: p.z, kind: table, open: 0 };
    SB.bus.emit("chestPlaced", { st: b, key: key, table: table });
    return b;
  };
  L.keyOf = function (b) { return b && b.kind === "lootchest" && b.data ? b.data.loot : null; };
  L.isOpen = function (game, b) { var k = L.keyOf(b), e = k ? st(game).chests[k] : null; return !e || !!e.open; };
  L.unopened = function (game) { var s = st(game), n = 0; for (var k in s.chests) if (!s.chests[k].open && L.structOf(game, s.chests[k])) n++; return n; };
  // what is in it: decided by the island and the chest, so the same chest always holds the same things
  L.roll = function (game, key) {
    var e = st(game).chests[key], T = e ? L.TABLES[e.kind] : null, out = { items: [], shells: 0, name: T ? T.name : "" };
    if (!T) return out;
    var r = SB.rng((hashKey("roll:" + key) ^ (game.seed >>> 0)) >>> 0), KK = K();
    function add(k, n) { if (KK[k] && n > 0) out.items.push({ k: k, n: n }); }
    (T.sure || []).forEach(function (x) { add(x[0], x[1]); });
    var pool = T.items.slice(), picks = Math.min(pool.length, T.sure ? 2 : 3);
    for (var i = 0; i < picks; i++) {
      var tot = 0; pool.forEach(function (x) { tot += x[3]; });
      var roll = r() * tot, j = 0; while (j < pool.length - 1 && (roll -= pool[j][3]) > 0) j++;
      var it = pool.splice(j, 1)[0];
      add(it[0], it[1] + Math.floor(r() * (it[2] - it[1] + 1)));
    }
    // 4.37: the opener's luck (minds3.js) tilts the rare finds. the same chest still rolls the same for the same smol on the same day
    var who3 = SB.Possess && SB.Possess.active && SB.Possess.c, lp = function (p) { return who3 && SB.Minds && SB.Minds.lucky ? SB.Minds.lucky(who3, p, game) : p; };
    if (T.motes) add("mote", T.motes); else if (r() < lp(T.mote || 0)) add("mote", 1);
    if (T.fruits) add("heartfruit", T.fruits); else if (r() < lp(T.fruit || 0)) add("heartfruit", 1);
    out.shells = T.shells[0] + Math.floor(r() * (T.shells[1] - T.shells[0] + 1));
    return out;
  };
  // open it, in a body. What fits goes in the bag; the rest is left on the ground beside it
  L.open = function (game, c, b) {
    var key = L.keyOf(b), e = key ? st(game).chests[key] : null;
    if (!e) return { ok: false, msg: "it's empty" };
    if (e.open) return { ok: false, msg: "it's empty: somebody has been here" };
    if (SB.dist(c.x, c.z, b.x, b.z) > 3.2) return { ok: false, msg: "get closer" };
    var got = L.roll(game, key), parts = [], spilled = 0;
    got.items.forEach(function (it) {
      var left = Sv().add(c, it.k, it.n);
      if (left > 0 && Sv().spawn) { Sv().spawn(game, it.k, left, b.x + 0.9, b.z + 0.5); spilled += left; }
      parts.push(it.n + " " + label(it.k));
    });
    if (got.shells > 0) { c.purse = Math.round(((c.purse || 0) + got.shells) * 100) / 100; parts.push(got.shells + " " + L.moneyIcon(game)); }
    e.open = day(game); e.by = c.name;
    b.data.open = true; dirty(b);
    if (L.TROPHY[e.kind]) { st(game).trophies[e.kind] = day(game); parts.push(L.TROPHY[e.kind][1] + " (a trophy for your home)"); }
    SB.bus.emit("chestOpened", { st: b, c: c, key: key, table: e.kind, got: got, spilled: spilled });
    return { ok: true, msg: "🧰 " + got.name + ": " + parts.join(", ") + (spilled ? " (your bag is full: the rest is on the ground)" : ""), got: got };
  };
  L.trophies = function (game) { var s = st(game), out = []; for (var k in L.TROPHY) if (s.trophies[k]) out.push({ id: k, icon: L.TROPHY[k][0], name: L.TROPHY[k][1], day: s.trophies[k] }); return out; };

  /* ---------------- motes and heart-fruit ---------------- */
  L.hp = function (c) { return (c && c.body && c.body.hp) || 0; };
  // eating a heart-fruit (possess.js calls this after the bite)
  L.heart = function (game, c) {
    if (!c) return { ok: false, msg: "" };
    if (!c.body) c.body = {};
    if ((c.body.hp || 0) >= L.MAX_HP) return { ok: false, msg: "💗 sweet. but " + c.name + "'s heart is as big as it gets" };
    c.body.hp = (c.body.hp || 0) + 1;
    c.chem.health = 1;
    SB.bus.emit("heartFruit", { c: c, hp: c.body.hp });
    return { ok: true, msg: "💗 " + c.name + "'s heart grew! every hurt now costs " + Math.round(c.body.hp * L.HP_STEP * 100) + "% less (" + c.body.hp + " of " + L.MAX_HP + ")" };
  };
  // let a mote go: the light it held comes back as sparks
  L.release = function (game, c) {
    if (!Sv().count(c, "mote", true)) return { ok: false, msg: "no mote to let go" };
    Sv().take(c, "mote", 1);
    if (SB.Game.addSparks) SB.Game.addSparks(game, L.MOTE_SPARKS, c);
    SB.bus.emit("moteReleased", { c: c });
    return { ok: true, msg: "✨ the mote drifts up to the Lantern: +" + L.MOTE_SPARKS + " ✨" };
  };
  // a bigger heart: part of every hurt is given back (one place, instead of touching every bite in the game)
  var lastH = null, lastId = null;
  L.frame = function (game) {
    var P = SB.Possess, c = P && P.active ? P.c : null;
    if (!c || !c.alive) { lastId = null; return; }
    var h = c.chem.health, hp = L.hp(c);
    if (lastId === c.id && hp > 0 && h < lastH - 1e-6 && h > 0) c.chem.health = h = Math.min(1, h + (lastH - h) * Math.min(0.5, hp * L.HP_STEP));
    lastH = h; lastId = c.id;
  };

  /* ---------------- trade ---------------- */
  function econ(game) { return game.econ || null; }
  L.moneyIcon = function (game) { return SB.Economy && SB.Economy.moneyIcon ? SB.Economy.moneyIcon(game) : "🐚"; };
  L.moneyWord = function (game) { var m = SB.Economy && SB.Economy.money ? SB.Economy.money(game) : "shells"; return m === "copper" ? "coppers" : m === "tally" ? "tally marks" : m === "favours" ? "favours" : "shells"; };
  L.purse = function (c) { return Math.round((c.purse || 0) * 100) / 100; };
  function r2(v) { return Math.round(v * 100) / 100; }
  // what selling one of this kind pays here
  L.sellPrice = function (game, kind) {
    var E = SB.Economy, e = econ(game), g = E && E.goodOf ? E.goodOf(kind) : null;
    if (kind === "mote") return 2; if (kind === "heartfruit") return 5; if (kind === "plans") return 0;
    if (!g) return K()[kind] && K()[kind].tool ? 1.5 : 0.3;
    var p = e && e.price && e.price[g] != null ? e.price[g] : E.GOODS[g].base, per = L.GOOD_ITEM[g] ? L.GOOD_ITEM[g][1] : 1;
    return Math.max(0.1, r2(p * L.SELL / per));
  };
  L.stallInfo = function (game, b) {
    if (!b || b.kind !== "stall" || !b.done || !b.data) return null;
    var E = SB.Economy, d = b.data, owner = SB.Game.byId(game, d.owner), g = E && E.GOODS[d.good];
    if (!g) return null;
    var gi = L.GOOD_ITEM[d.good] || ["apple", 1];
    return { st: b, owner: owner && owner.alive ? owner : null, good: d.good, icon: g.icon, name: g.name, ask: r2(d.ask || g.base), stock: d.stock || 0, kind: gi[0], n: gi[1] };
  };
  L.buy = function (game, c, b) {
    var s = L.stallInfo(game, b); if (!s) return { ok: false, msg: "nothing for sale" };
    if (SB.dist(c.x, c.z, b.x, b.z) > 4.5) return { ok: false, msg: "the stall is over there" };
    if (s.stock <= 0) return { ok: false, msg: "sold out. come back later" };
    if (L.purse(c) < s.ask) return { ok: false, msg: "not enough " + L.moneyWord(game) + ": it's " + s.ask + ", you have " + L.purse(c) + ". sell something first" };
    if (Sv().whyNot && Sv().whyNot(c, s.kind)) return { ok: false, msg: Sv().whyNot(c, s.kind) };
    var left = Sv().add(c, s.kind, s.n);
    if (left === s.n) return { ok: false, msg: "your bag is full" };
    if (left > 0 && Sv().spawn) Sv().spawn(game, s.kind, left, c.x + 0.6, c.z + 0.4);
    c.purse = r2(L.purse(c) - s.ask);
    if (s.owner) s.owner.purse = r2((s.owner.purse || 0) + s.ask);
    var d = b.data; d.stock--; d.sold = (d.sold || 0) + 1; d.idle = 0; d.ask = r2(d.ask * 1.08); (d.hist || (d.hist = [])).push(s.ask); if (d.hist.length > 8) d.hist.shift();
    if (econ(game)) econ(game).sales = (econ(game).sales || 0) + 1;
    SB.bus.emit("sale", { seller: s.owner, buyer: c, good: s.good, price: s.ask, st: b, byHand: true });
    return { ok: true, msg: s.icon + " bought " + s.n + " " + label(s.kind) + " for " + s.ask + " " + L.moneyIcon(game) };
  };
  // sell one whole bag slot to whoever keeps the stall (or to a pedlar)
  L.sell = function (game, c, i, to) {
    var v = Sv().inv(c), sl = v.s[i];
    if (!sl || sl.k === "plans") return { ok: false, msg: "nothing to sell" };
    var each = L.sellPrice(game, sl.k), pay = r2(each * sl.n);
    if (pay <= 0) return { ok: false, msg: "nobody wants that" };
    var k = sl.k, n = sl.n;
    v.s[i] = null;
    c.purse = r2(L.purse(c) + pay);
    if (to && to.purse != null) to.purse = Math.max(0, r2(to.purse - pay));
    SB.bus.emit("soldByHand", { c: c, kind: k, n: n, pay: pay, to: to || null });
    return { ok: true, msg: "sold " + n + " " + label(k) + " for " + pay + " " + L.moneyIcon(game) };
  };
  /* ---- pedlars ---- */
  L.isPedlar = function (c) { return !!(c && c.alive && c.stranger && c.stranger.pack && c.stranger.state !== "leaving"); };
  function makePedlar(game, c) {
    var r = SB.rng((hashKey("pack:" + c.id) ^ (game.seed >>> 0)) >>> 0), pool = L.PACK.filter(function (x) { return K()[x[0]]; }), pack = [];
    for (var i = 0; i < 4 && pool.length; i++) { var x = pool.splice(Math.floor(r() * pool.length), 1)[0]; pack.push({ k: x[0], n: x[1], price: x[2], left: 1 + Math.floor(r() * 2) }); }
    c.stranger.pack = pack;
    return pack;
  }
  L.buyFrom = function (game, c, ped, i) {
    if (!L.isPedlar(ped)) return { ok: false, msg: "the pedlar has gone" };
    var it = ped.stranger.pack[i];
    if (!it || it.left <= 0) return { ok: false, msg: "sold out" };
    if (SB.dist(c.x, c.z, ped.x, ped.z) > 5) return { ok: false, msg: "the pedlar is over there" };
    if (L.purse(c) < it.price) return { ok: false, msg: "not enough " + L.moneyWord(game) + ": it's " + it.price + ", you have " + L.purse(c) };
    var left = Sv().add(c, it.k, it.n);
    if (left === it.n) return { ok: false, msg: "your bag is full" };
    c.purse = r2(L.purse(c) - it.price); it.left--;
    SB.bus.emit("sale", { seller: ped, buyer: c, good: it.k, price: it.price, byHand: true, pedlar: true });
    return { ok: true, msg: "bought " + it.n + " " + label(it.k) + " for " + it.price + " " + L.moneyIcon(game) };
  };

  /* ---------------- hooks ---------------- */
  var tT = 0;
  L.tick = function (game, dt) {
    if (!game || game.offline) return;
    L.frame(game);
    if ((tT -= dt) > 0) return;
    tT = 2;
    // every found place has its chest (this also gives one to islands from before 4.33)
    (game.sites || []).forEach(function (s) {
      if (!s.found || s.kind === "pod" && !s.done) return;
      if (s.kind === "camp" && !s.done) return; // the grumps are still sitting on it
      L.place(game, "site" + s.id, s.kind, s.x, s.z);
    });
    var B = SB.Bosses;
    if (B && B.state) { var bl = B.state(game).list || {}; for (var id in bl) if (bl[id].beaten && L.TABLES[id]) L.place(game, "lair-" + id, id, bl[id].x, bl[id].z); }
  };
  var hooked = false;
  L.hook = function () {
    if (hooked || !SB.bus) return; hooked = true;
    function cur() { return SB.Game && SB.Game.current; }
    // a beaten grump drops the light it was carrying (a captain's goes in its hoard instead)
    SB.bus.on("grumpChased", function (d) {
      var game = cur(); if (!game || !d || !d.g || d.g.boss || game.headless) return;
      var r = Math.random();
      if (r < 0.6 && Sv() && Sv().spawn && K().mote) { Sv().spawn(game, "mote", 1, d.g.x, d.g.z); SB.bus.emit("grumpDrop", { c: d.c, g: d.g, kind: "mote" }); }
    });
    // finding a place is "somewhere new" for today's job, as well as a new biome
    SB.bus.on("siteFound", function () { var game = cur(); if (game && SB.Mine && SB.Mine.count) SB.Mine.count(game, "explore"); });
    // about one stranger in three is a pedlar
    SB.bus.on("stranger", function (d) {
      var game = cur(), c = d && d.c; if (!game || !c || !c.stranger || c.stranger.exiled || c.stranger.pack) return;
      if (SB.rng((hashKey("ped:" + c.id) ^ (game.seed >>> 0)) >>> 0)() < 0.34) { makePedlar(game, c); SB.bus.emit("pedlar", { c: c }); }
    });
  };
  L.hook();
  L.makePedlar = makePedlar; // for tests

  /* ---------------- the bag's "trade" tab ---------------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]; }); }
  // who you could trade with from where you stand: the nearest stall, or a pedlar
  L.partner = function (game, c) {
    var best = null, bd = 4.5;
    game.world.structures.forEach(function (b) { if (b.kind !== "stall" || !b.done) return; var d = SB.dist(b.x, b.z, c.x, c.z); if (d < bd) { bd = d; best = { stall: b }; } });
    game.creatures.forEach(function (o) { if (!L.isPedlar(o)) return; var d = SB.dist(o.x, o.z, c.x, c.z); if (d < Math.min(bd, 5)) { bd = d; best = { pedlar: o }; } });
    return best;
  };
  L.html = function (game, c, icon) {
    icon = icon || function () { return ""; };
    var p = L.partner(game, c), mi = L.moneyIcon(game), out = "<div class='lbl'>your purse: <b>" + L.purse(c) + " " + mi + "</b></div>";
    if (!p) return out + "<p><b>nobody to trade with here.</b> stand at a market stall (the smols build them once they have the idea of a market), or find a pedlar among the strangers.</p>";
    if (p.stall) {
      var s = L.stallInfo(game, p.stall);
      out += "<div class='lbl'>" + s.icon + " " + esc(s.owner ? s.owner.name + "'s stall" : "an empty stall") + " · sells " + esc(s.name) + "</div><div class='rlist'><div class='rc'><span class='big'>" + s.icon + "</span><div class='t'>" + s.n + " " + esc(label(s.kind)) + "<small>" + (s.stock > 0 ? s.stock + " left" : "sold out") + " · the price goes up as it sells</small></div><button class='btn go' data-tradebuy='1' " + (s.stock > 0 && L.purse(c) >= s.ask ? "" : "disabled") + ">buy · " + s.ask + " " + mi + "</button></div></div>";
    } else {
      out += "<div class='lbl'>🎒 " + esc(p.pedlar.name) + " the pedlar · rare things, while they're here</div><div class='rlist'>";
      p.pedlar.stranger.pack.forEach(function (it, i) {
        out += "<div class='rc'><span class='big'>" + icon(it.k, 28) + "</span><div class='t'>" + it.n + " " + esc(label(it.k)) + "<small>" + (it.left > 0 ? it.left + " left" : "sold out") + (SB.KINDS[it.k].desc ? " · " + esc(SB.KINDS[it.k].desc) : "") + "</small></div><button class='btn go' data-tradeped='" + i + "' " + (it.left > 0 && L.purse(c) >= it.price ? "" : "disabled") + ">buy · " + it.price + " " + mi + "</button></div>";
      });
      out += "</div>";
    }
    var v = Sv().inv(c), sells = [];
    for (var i = 0; i < v.s.length; i++) { var sl = v.s[i]; if (!sl || sl.k === "plans") continue; var pay = Math.round(L.sellPrice(game, sl.k) * sl.n * 100) / 100; if (pay > 0) sells.push("<button class='btn' data-tradesell='" + i + "'>" + icon(sl.k, 16) + " " + esc(label(sl.k)) + (sl.n > 1 ? " ×" + sl.n : "") + " · " + pay + " " + mi + "</button>"); }
    out += "<div class='lbl'>sell</div><div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>" + (sells.length ? sells.join("") : "<span class='help'>nothing in your bag to sell</span>") + "</div>";
    return out;
  };
  L.wire = function (root, game, c, redraw, say) {
    function done(r) { if (r && r.msg && say) say(r.msg); if (r && r.ok && SB.Audio && SB.Audio.play) SB.Audio.play("craft"); redraw(); }
    var p = L.partner(game, c);
    root.querySelectorAll("[data-tradebuy]").forEach(function (b) { b.addEventListener("click", function () { done(p && p.stall ? L.buy(game, c, p.stall) : null); }); });
    root.querySelectorAll("[data-tradeped]").forEach(function (b) { b.addEventListener("click", function () { done(p && p.pedlar ? L.buyFrom(game, c, p.pedlar, +b.getAttribute("data-tradeped")) : null); }); });
    root.querySelectorAll("[data-tradesell]").forEach(function (b) { b.addEventListener("click", function () { var to = p && p.stall ? SB.Game.byId(game, p.stall.data.owner) : p && p.pedlar ? null : null; done(p ? L.sell(game, c, +b.getAttribute("data-tradesell"), to) : { ok: false, msg: "nobody to sell to here" }); }); });
  };

  /* ---------------- the chest's model ---------------- */
  var ME = SB.Meshes || SB.ME;
  function chest(open) {
    return function () {
      var b = ME.builder();
      b.color(0x7a4a26).push().translate(0, 0.19, 0).box(0.62, 0.38, 0.42).pop();                     // the box
      b.color(0xd8b24a).push().translate(0, 0.19, 0.215).box(0.66, 0.06, 0.02).pop();                  // a brass band
      b.color(0xd8b24a).push().translate(-0.26, 0.19, 0).box(0.05, 0.4, 0.44).pop().push().translate(0.26, 0.19, 0).box(0.05, 0.4, 0.44).pop();
      if (open) { b.color(0x8a5630).push().translate(0, 0.52, -0.2).rotX(-1.1).box(0.62, 0.1, 0.42).pop(); b.color(0x241a12).push().translate(0, 0.37, 0).box(0.52, 0.03, 0.32).pop(); }
      else { b.color(0x8a5630).push().translate(0, 0.43, 0).box(0.64, 0.12, 0.44).pop(); b.color(0xffe27a).push().translate(0, 0.33, 0.225).box(0.09, 0.11, 0.03).pop(); }
      return b.finish();
    };
  }
  if (ME && ME.STRUCT_BUILDERS && ME.builder) { try { ME.STRUCT_BUILDERS.lootchest = chest(false); ME.STRUCT_BUILDERS.lootchest_open = chest(true); } catch (e) {} }
})();
