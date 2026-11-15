/* smol brains — qol.js (4.35, "the book"): the interface and convenience side of the game, in one place.
   The owner's rule for this file: the screen gets calmer, not busier. So nothing here is a new window or a new
   pop-up. Everything lives in ONE tab of the bag ("📖 book", also a tab of the sky menu) with seven small pages:
     bag       sort, quick-stack and deposit to the home chest, take all, star a thing (never dropped or put away by
               mistake), a bin with undo, hotbar loadouts, one-button "eat the best thing", item facts (value, food,
               rarity), names for tools and the chest, a pouch (four small mixed stacks), buy a stall's whole stock
     you       any smol's page: body bars, pulse and temperature, germs and poison, eggs, gear, wounds, bonds, job,
               skill challenges, what it knows, milestones, a note, a new name, where it came from
     places    clock and compass, what the ground here is like, pins you can point the marker at, the whole map
               (land, warmth or danger), secrets shown for sparks, how much of the island the dark still holds
     island    calendar and forecast, the town board (who needs what), stalls, scores, charts, the news log,
               the grump book, duels, the ideas web
     smols     your family row (hop between them), search for anything by name, wildlife nearby, copy job rules
     recipes   every recipe and building you know, with a search and categories ("what uses this?")
     more      options (quiet news, captions, auto tool, contrast, view width, hud fade, gamepad, keys), the smol
               shelf (smol codes kept on this device, with a letter and a life story packed in), pictures,
               the island's name and a file of it, two shell games, tunes, a debug page
   Also: drums and flutes you make and play (smols dance), chime stones, sparks in the sky at feasts and after a
   captain, a tip or a line of lore on the waking screen, a gamepad, your own keys.
   State: game.quests.qol (pins, stars, log, charts, grump book...), game.settings.qol (options), and plain fields on a
   smol (note, pron, ms, pouch, from, letter). Pictures and the smol shelf stay on the device (localStorage).
   Rolls its own dice. Nothing here touches game.rng. */
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var Q = SB.Qol = {};
  Q.PINS = 12; Q.LOG = 40; Q.HIST = 40; Q.POUCH = 4; Q.POUCH_STACK = 6; Q.ALBUM = 8; Q.BIN = 12; Q.REVEAL = 6; Q.GAMES_A_DAY = 12;

  function quests(game) { return game.quests || (game.quests = { ch: 0, done: {}, n: {} }); }
  function st(game) {
    var q = quests(game), s = q.qol;
    if (!s || typeof s !== "object") s = q.qol = {};
    if (!s.star) s.star = {}; if (!Array.isArray(s.pins)) s.pins = []; if (!Array.isArray(s.roster)) s.roster = [];
    if (!Array.isArray(s.log)) s.log = []; if (!s.best) s.best = {}; if (!Array.isArray(s.duels)) s.duels = [];
    if (!Array.isArray(s.hist)) s.hist = []; if (!s.load) s.load = {}; if (!s.games) s.games = { day: 0, n: 0, won: 0, lost: 0 };
    return s;
  }
  Q.state = st;
  function opt(game) { var s = game.settings || (game.settings = {}); if (!s.qol || typeof s.qol !== "object") s.qol = {}; return s.qol; }
  Q.opt = opt;
  function Sv() { return SB.Surv || SB.Survival; }
  function KK() { return SB.KINDS || {}; }
  function P() { return SB.Possess; }
  function cur() { return SB.Game && SB.Game.current; }
  function day(game) { return Math.floor((game.time || 0) / SB.DAY_LENGTH) + 1; }
  function label(k) { var d = KK()[k]; return d && d.label ? d.label : k; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]; }); }
  function plainText(html) { return String(html == null ? "" : html).replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim(); }
  function clean(s, n) { return String(s == null ? "" : s).replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, n || 24); }
  function hashKey(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function dice(game, key) { return SB.rng((hashKey(key) ^ (game.seed >>> 0)) >>> 0); }
  function r2(v) { return Math.round(v * 100) / 100; }
  function c01(v) { return v < 0 ? 0 : v > 1 ? 1 : v || 0; }
  function bar(v, n) { n = n || 5; var f = Math.round(c01(v) * n), s = ""; for (var i = 0; i < n; i++) s += i < f ? "▮" : "▯"; return s; }
  function spark(arr) { if (!arr || !arr.length) return ""; var lo = Infinity, hi = -Infinity, s = "", B = "▁▂▃▄▅▆▇█"; arr.forEach(function (v) { if (v < lo) lo = v; if (v > hi) hi = v; }); arr.forEach(function (v) { s += B.charAt(hi > lo ? Math.round((v - lo) / (hi - lo) * 7) : 3); }); return s; }
  Q.bar = bar; Q.spark = spark;
  function smols(game) { return SB.Game.smols(game).filter(function (c) { return !c.stranger; }); }
  function mine(game) { return SB.Mine && SB.Mine.get ? SB.Mine.get(game) : null; }
  function me(game) { var p = P(); return p && p.active && p.c ? p.c : null; }
  function nestOf(game) { var T = game.world && game.world.T; return T && T.nest ? T.nest : { x: T ? T.N / 2 : 0, z: T ? T.N / 2 : 0 }; }
  function store(key, val) {
    try {
      if (val === undefined) { var t = window.localStorage.getItem(key); return t ? JSON.parse(t) : null; }
      window.localStorage.setItem(key, JSON.stringify(val)); return true;
    } catch (e) { return val === undefined ? null : false; }
  }
  var DIRS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
  // the map has north at the top: z grows south, x grows east
  Q.dir = function (dx, dz) { if (Math.abs(dx) < 0.5 && Math.abs(dz) < 0.5) return "here"; var a = Math.atan2(dx, -dz); return DIRS[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8]; };
  function away(c, x, z) { return Math.round(SB.dist(c.x, c.z, x, z)) + "m " + Q.dir(x - c.x, z - c.z); }

  /* ================= the bag ================= */
  var CATS = ["tools", "food", "medicine", "materials", "things"];
  Q.CATS = CATS;
  Q.cat = function (kind) {
    var d = KK()[kind]; if (!d) return "things";
    if (d.tool) return "tools";
    if (d.noun === "medicine") return "medicine";
    if (d.food && (d.noun === "food" || d.noun === "mushroom" || d.noun === "bug")) return "food";
    if (d.mat || d.noun === "material" || d.noun === "stick" || d.noun === "stone") return "materials";
    return "things";
  };
  function slotOrder(a, b) { var ca = CATS.indexOf(Q.cat(a.k)), cb = CATS.indexOf(Q.cat(b.k)); return ca - cb || (label(a.k) < label(b.k) ? -1 : label(a.k) > label(b.k) ? 1 : (b.n - a.n)); }
  // merge loose stacks of one kind, then order by what a thing is. arr is a list of slots (or null); mx(kind) is a stack's size
  function tidy(arr, mx) {
    var list = [], by = {};
    arr.forEach(function (sl) {
      if (!sl) return;
      var m = Math.max(1, mx(sl.k)), o = by[sl.k];
      if (m > 1 && sl.w == null && !sl.nm) {
        var n = sl.n;
        while (n > 0) { if (!o || o.n >= m) { o = by[sl.k] = { k: sl.k, n: 0 }; list.push(o); } var t = Math.min(n, m - o.n); o.n += t; n -= t; }
      } else list.push(sl);
    });
    list.sort(slotOrder);
    return list;
  }
  // tidy the bag (not the hands: what you hold stays where you put it)
  Q.sort = function (game, c) {
    var S = Sv(), v = S.inv(c), hn = S.hotN(c), cap = S.cap(c);
    if (cap <= hn) return { ok: false, msg: "no bag to tidy yet" };
    var list = tidy(v.s.slice(hn, cap), function (k) { return S.stackFor ? S.stackFor(c, k) : S.stackOf(k); });
    for (var i = hn; i < cap; i++) v.s[i] = list[i - hn] || null;
    return { ok: true, msg: "🧹 tidied: " + list.length + " stack" + (list.length === 1 ? "" : "s") };
  };
  Q.starred = function (game, kind) { return !!(game && game.quests && game.quests.qol && game.quests.qol.star && game.quests.qol.star[kind]); };
  Q.star = function (game, kind) { var s = st(game); if (s.star[kind]) delete s.star[kind]; else s.star[kind] = 1; return !!s.star[kind]; };
  function chestWhy(game, c) { var H = SB.Home; return !H ? "no home" : !H.has(game, "chest") ? "your home has no chest yet" : !H.at(game, c) ? "the chest is at home" : ""; }
  // a slot that may be put away in one go: not what you hold, not starred, not your plans
  function loose(game, c, i, sl) { return !!sl && i >= Sv().hotN(c) && sl.k !== "plans" && !Q.starred(game, sl.k); }
  function putAway(game, c, only) {
    var why = chestWhy(game, c); if (why) return { ok: false, msg: why, n: 0 };
    var H = SB.Home, v = Sv().inv(c), ch = H.chest(game), have = {}, moved = 0;
    ch.forEach(function (x) { if (x) have[x.k] = 1; });
    for (var i = 0; i < v.s.length; i++) {
      var sl = v.s[i];
      if (!loose(game, c, i, sl) || (only && !have[sl.k])) continue;
      var left = H.put(game, sl.k, sl.n, sl.w);
      moved += sl.n - left;
      if (left > 0) sl.n = left; else v.s[i] = null;
    }
    return { ok: moved > 0, n: moved, msg: moved ? "📦 put away " + moved : only ? "nothing in your bag matches what's in the chest" : "nothing to put away (stars and what you hold stay with you)" };
  }
  // quick-stack: only kinds the chest already holds. deposit: everything loose
  Q.quickStack = function (game, c) { return putAway(game, c, true); };
  Q.depositAll = function (game, c) { return putAway(game, c, false); };
  Q.lootAll = function (game, c) {
    var why = chestWhy(game, c); if (why) return { ok: false, msg: why, n: 0 };
    var ch = SB.Home.chest(game), got = 0;
    for (var i = 0; i < ch.length; i++) { var sl = ch[i]; if (!sl) continue; var left = Sv().add(c, sl.k, sl.n, sl.w); got += sl.n - left; if (left > 0) sl.n = left; else ch[i] = null; }
    return { ok: got > 0, n: got, msg: got ? "🎒 took " + got : "nothing fits (or the chest is empty)" };
  };
  Q.sortChest = function (game, c) {
    var why = chestWhy(game, c); if (why) return { ok: false, msg: why };
    var ch = SB.Home.chest(game), list = tidy(ch, function (k) { return Sv().stackOf(k); });
    for (var i = 0; i < ch.length; i++) ch[i] = list[i] || null;
    return { ok: true, msg: "🧹 the chest is tidy" };
  };
  Q.chestName = function (game, name) { var s = st(game); if (name !== undefined) { s.chest = clean(name, 20) || null; } return s.chest || "the chest"; };
  // the bin: one thing at a time, and you can change your mind
  Q.trash = function (game, c, i) {
    var v = Sv().inv(c), sl = v.s[i];
    if (!sl || sl.k === "plans") return { ok: false, msg: "nothing to bin" };
    if (Q.starred(game, sl.k)) return { ok: false, msg: "⭐ that's starred. take the star off first" };
    st(game).trash = { k: sl.k, n: sl.n, w: sl.w, nm: sl.nm };
    v.s[i] = null;
    return { ok: true, msg: "🗑 binned " + sl.n + " " + label(sl.k) + ". you can take it back out" };
  };
  Q.undoTrash = function (game, c) {
    var s = st(game), t = s.trash;
    if (!t) return { ok: false, msg: "the bin is empty" };
    var left = Sv().add(c, t.k, t.n, t.w);
    if (left > 0 && Sv().spawn) Sv().spawn(game, t.k, left, c.x + 0.5, c.z + 0.4, { w: t.w });
    s.trash = null;
    return { ok: true, msg: "took it back out of the bin" };
  };
  // loadouts: remember what sits in your hands, and put it back that way
  Q.saveLoadout = function (game, c, n) {
    var S = Sv(), v = S.inv(c), hn = S.hotN(c), out = [];
    for (var i = 0; i < hn; i++) out.push(v.s[i] ? v.s[i].k : null);
    st(game).load[n] = out;
    return { ok: true, msg: "hands " + n + " remembered" };
  };
  Q.useLoadout = function (game, c, n) {
    var L = st(game).load[n], S = Sv(), v = S.inv(c), hn = S.hotN(c), done = 0;
    if (!L) return { ok: false, msg: "nothing remembered there yet" };
    for (var i = 0; i < hn && i < L.length; i++) {
      var k = L[i]; if (!k || (v.s[i] && v.s[i].k === k)) continue;
      for (var j = 0; j < v.s.length; j++) {
        if (j === i || !v.s[j] || v.s[j].k !== k || (j < hn && L[j] === k)) continue;
        var t = v.s[i]; v.s[i] = v.s[j]; v.s[j] = t; done++; break;
      }
    }
    return { ok: true, msg: done ? "hands " + n + ": " + done + " thing" + (done === 1 ? "" : "s") + " swapped in" : "hands " + n + ": already like that" };
  };
  // the best thing to eat right now: something that mends when you're hurt, else the most filling
  Q.bestBite = function (game, c) {
    var S = Sv(), v = S.inv(c), best = -1, bs = 0, hurt = c.chem && c.chem.health < 0.7, sick = c.chem && ((c.chem.antigen || 0) > 0.25 || (c.chem.toxin || 0) > 0.25);
    for (var i = 0; i < v.s.length; i++) {
      var sl = v.s[i], d = sl && KK()[sl.k];
      if (!d || !d.food || sl.k === "nut" || !S.edible(sl.k)) continue;
      var fill = -(d.food.hunger || 0), ch = d.chem || {}, med = (ch.medicine || 0) + (ch.health || 0) + (d.noun === "medicine" ? 0.5 : 0);
      var sc = fill * (c.chem && c.chem.hunger > 0.3 ? 1 : 0.3) + med * (hurt || sick ? 3 : 0.1) - (sl.k === "heartfruit" ? 5 : 0) - (ch.toxin || 0) * 4;
      if (sc > bs) { bs = sc; best = i; }
    }
    return best;
  };
  Q.quickHeal = function (game, c) {
    var i = Q.bestBite(game, c);
    if (i < 0) return { ok: false, msg: "nothing in your bag to eat" };
    var S = Sv(), k = S.inv(c).s[i].k;
    S.removeAt(c, i, 1);
    var r = S.eat(c, game, k, null);
    return { ok: true, kind: k, msg: (r && r.msg) || "ate " + label(k) };
  };
  // the best tool in your hands for what you look at (trees, rock, grumps). -> a hotbar index, or -1 to stay as you are
  Q.bestTool = function (game, c, r) {
    var S = Sv(), v = S.inv(c), hn = S.hotN(c), key = null, n = r && r.ref;
    if (!r || hn < 2) return -1;
    if (r.type === "node" && n) key = S.isTree && S.isTree(n) ? "wood" : S.isRock && S.isRock(n) ? "stone" : null;
    else if (r.type === "creature" && n && n.species === "grump") key = "dmg";
    if (!key) return -1;
    function val(sl) { var t = sl && S.TOOL[sl.k]; return t ? t[key] || 0 : 0; }
    var best = v.sel, bv = val(v.s[v.sel]);
    for (var i = 0; i < hn; i++) if (val(v.s[i]) > bv + 1e-6) { bv = val(v.s[i]); best = i; }
    return best === v.sel ? -1 : best;
  };
  // how rare a thing is, from what it's worth: 0 common .. 3 treasure
  Q.RARE = [["common", "#cfd3da"], ["uncommon", "#7bd860"], ["rare", "#6fb7ff"], ["treasure", "#ffd84a"]];
  Q.value = function (game, kind) { return SB.Loot && SB.Loot.sellPrice ? SB.Loot.sellPrice(game, kind) : KK()[kind] && KK()[kind].tool ? 1.5 : 0.3; };
  Q.rarity = function (game, kind) { var v = Q.value(game, kind); return kind === "heartfruit" || kind === "mote" || v >= 4 ? 3 : v >= 1.5 ? 2 : v >= 0.6 ? 1 : 0; };
  Q.itemInfo = function (game, kind, sl) {
    var d = KK()[kind] || {}, S = Sv(), out = [], t = S.TOOL[kind];
    if (d.desc) out.push(d.desc);
    if (d.food && d.food.hunger) out.push("fills " + Math.round(-d.food.hunger * 100) + "% of a belly");
    if (d.chem && d.chem.medicine) out.push("medicine: " + Math.round(d.chem.medicine * 100));
    if (d.chem && d.chem.toxin) out.push("a little poison in it");
    if (t) out.push("wood " + t.wood + " · stone " + t.stone + " · bonk " + t.dmg + (sl && sl.w != null ? " · " + Math.max(0, Math.round(sl.w)) + " of " + S.uses(kind) + " uses left" : " · " + S.uses(kind) + " uses"));
    out.push("worth " + r2(Q.value(game, kind)) + " " + (SB.Loot ? SB.Loot.moneyIcon(game) : "🐚") + " each · " + Q.RARE[Q.rarity(game, kind)][0] + " · " + S.stackOf(kind) + " to a stack");
    var uses = Q.usesOf(kind);
    if (uses.length) out.push("goes into: " + uses.slice(0, 6).join(", "));
    return out;
  };
  Q.usesOf = function (kind) { var out = []; try { Sv().allRecipes().forEach(function (rc) { if (rc.in && rc.in[kind]) out.push(rc.out && KK()[rc.out] ? label(rc.out) : rc.name); }); } catch (e) {} return out; };
  Q.nameItem = function (c, i, name) { var sl = Sv().inv(c).s[i]; if (!sl || sl.k === "plans") return { ok: false, msg: "nothing to name" }; var n = clean(name, 20); if (n) sl.nm = n; else delete sl.nm; return { ok: true, msg: n ? "it's “" + n + "” now" : "just " + label(sl.k) + " again" }; };
  Q.nameOf = function (sl) { return sl ? (sl.nm ? sl.nm : label(sl.k)) : ""; };
  // a pouch: four small mixed stacks in one bag slot. what's tucked in stays with the smol even if the pouch is lost
  Q.pouch = function (c) { if (!Array.isArray(c.pouch)) c.pouch = []; return c.pouch; };
  Q.tuck = function (game, c, i) {
    var S = Sv(), v = S.inv(c), sl = v.s[i], p = Q.pouch(c);
    if (!S.has(c, "pouch")) return { ok: false, msg: "you need a pouch (fibre and something bendy)" };
    if (!sl || sl.k === "pouch" || sl.k === "plans" || (KK()[sl.k] && KK()[sl.k].tool)) return { ok: false, msg: "that won't go in a pouch" };
    if (sl.n > Q.POUCH_STACK) return { ok: false, msg: "too many: a pouch takes small handfuls (" + Q.POUCH_STACK + " or fewer)" };
    if (p.length >= Q.POUCH) return { ok: false, msg: "the pouch is full" };
    p.push({ k: sl.k, n: sl.n }); v.s[i] = null;
    return { ok: true, msg: "👝 tucked away" };
  };
  Q.untuck = function (game, c, j) {
    var p = Q.pouch(c), it = p[j]; if (!it) return { ok: false, msg: "" };
    var left = Sv().add(c, it.k, it.n);
    if (left === it.n) return { ok: false, msg: "your bag is full" };
    if (left > 0) it.n = left; else p.splice(j, 1);
    return { ok: true, msg: "" };
  };
  // buy until the stall is empty, your purse is, or your bag is full
  Q.buyAll = function (game, c, b) {
    if (!SB.Loot || !b) return { ok: false, msg: "nobody to buy from here", n: 0 };
    var n = 0, r = null;
    for (var i = 0; i < 12; i++) { r = SB.Loot.buy(game, c, b); if (!r.ok) break; n++; }
    return { ok: n > 0, n: n, msg: n ? "bought " + n + " lot" + (n === 1 ? "" : "s") : r.msg };
  };

  /* ================= places ================= */
  Q.clock = function (game) {
    var ck = SB.World.clock(game.world), sd = SB.seasonDays(game), t = (game.time || 0) / SB.DAY_LENGTH, into = Math.floor(t % sd) + 1;
    function pad(n) { return n < 10 ? "0" + n : "" + n; }
    return { day: ck.day, hour: ck.hour, min: ck.min, night: !!ck.night, season: String(ck.season), into: into, of: sd, left: r2(sd - (t % sd)),
      text: "day " + ck.day + " · " + pad(ck.hour) + ":" + pad(ck.min) + (ck.night ? " 🌙" : " ☀") + " · " + ck.season + ", day " + into + " of " + sd };
  };
  // steps and direction from the nest (the island has no numbers of its own)
  Q.coords = function (game, c) { var n = nestOf(game), d = Math.round(SB.dist(c.x, c.z, n.x, n.z)); return { steps: d, dir: Q.dir(c.x - n.x, c.z - n.z), text: d < 2 ? "at the nest" : d + " steps " + Q.dir(c.x - n.x, c.z - n.z) + " of the nest" }; };
  Q.facing = function () { var p = P(), S = p && p.active && p.state ? p.state() : null; if (!S || S.yaw == null) return ""; return Q.dir(-Math.sin(S.yaw), -Math.cos(S.yaw)); };
  // the ground here: biome, warmth, wetness and what grows close by
  Q.where = function (game, x, z) {
    var W = SB.World, w = game.world, bi = W.biomeAt(w, x, z), b = SB.BIOMES[bi] || { name: "somewhere" }, t = W.tempAt(w, x, z), dp = W.depthAt ? W.depthAt(w, x, z) : 0;
    var warm = t < 0.2 ? "freezing" : t < 0.35 ? "cold" : t < 0.6 ? "mild" : t < 0.78 ? "warm" : "hot";
    var wet = dp > 0.6 ? "deep water" : dp > 0.02 ? "shallows" : w.weather && w.weather.rain > 0.3 ? "raining" : (W.waterNear && W.waterNear(w, x, z)) ? "water close by" : "dry";
    var grows = {}, list = [];
    (w.nodes || []).forEach(function (n) { if (n && !n.gone && SB.dist(n.x, n.z, x, z) < 12) { var d = SB.NODES[n.kind]; if (d && d.label && !grows[d.label]) { grows[d.label] = 1; list.push(d.label); } } });
    return { biome: b.name, temp: r2(t), warm: warm, wet: wet, grows: list.slice(0, 6), text: b.name + " · " + warm + " · " + wet + (list.length ? " · here: " + list.slice(0, 6).join(", ") : "") };
  };
  Q.pins = function (game) { return st(game).pins; };
  Q.pin = function (game, x, z, name) {
    var s = st(game);
    if (s.pins.length >= Q.PINS) return { ok: false, msg: "that's " + Q.PINS + " pins. pull one out first" };
    var nm = clean(name, 18);
    if (!nm) { var b = SB.BIOMES[SB.World.biomeAt(game.world, x, z)]; nm = (b ? b.name : "spot") + " " + (s.pins.length + 1); }
    s.pins.push({ x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, n: nm });
    return { ok: true, msg: "📍 pinned: " + nm, i: s.pins.length - 1 };
  };
  Q.unpin = function (game, i) { var s = st(game); if (!s.pins[i]) return false; s.pins.splice(i, 1); if (Q.pointed() === i) Q.unpoint(); return true; };
  Q.renamePin = function (game, i, name) { var p = st(game).pins[i], n = clean(name, 18); if (!p || !n) return false; p.n = n; return true; };
  // point the in-body marker at a spot (a pin, a search hit, a place on the map). in the sky the camera flies there instead
  Q.pointAt = function (game, x, z, text, pinI) {
    var p = P();
    if (p && p.active && p.setGoal) { p.setGoal({ x: x, z: z, label: text, small: true, qol: pinI == null ? -1 : pinI }); return { ok: true, msg: "the marker points to " + text }; }
    if (SB.Render && SB.Render.flyTo) { try { SB.Render.flyTo(x, z, 7, 0.7); if (SB.UI && SB.UI.modalOpen && SB.UI.closeModal) SB.UI.closeModal(); } catch (e) {} return { ok: true, msg: "" }; }
    return { ok: false, msg: "" };
  };
  Q.point = function (game, i) { var p = st(game).pins[i]; return p ? Q.pointAt(game, p.x, p.z, "📍 " + p.n, i) : { ok: false, msg: "" }; };
  Q.pointed = function () { var p = P(), S = p && p.active && p.state ? p.state() : null; return S && S.goal && S.goal.qol != null ? S.goal.qol : null; };
  Q.unpoint = function () { var p = P(); if (p && p.active && Q.pointed() != null) p.setGoal(null); };
  var SITE = { wreck: ["🛸", "the wreck"], ruin: ["🏛", "a ruin"], cave: ["💎", "a crystal cave"], nest: ["🪺", "a wild nest"], camp: ["⛺", "a grump camp"], pod: ["🥚", "a pod"] };
  Q.secretsLeft = function (game) { return (game.sites || []).filter(function (s) { return s && !s.found && !s.gone; }).length; };
  // pay sparks and every place nobody has found yet goes on the map
  Q.reveal = function (game) {
    var s = st(game), n = Q.secretsLeft(game);
    if (!n) return { ok: false, msg: "nothing left to find. the whole island is known" };
    if (s.shown === n) return { ok: false, msg: "they're on the map already" };
    if (!SB.Game.spend(game, Q.REVEAL)) return { ok: false, msg: "that takes " + Q.REVEAL + " ✨" };
    s.shown = n;
    return { ok: true, msg: "✨ " + n + " place" + (n === 1 ? "" : "s") + " nobody has found: on the map now" };
  };
  // how much of the island the dark still holds (the lightwells push it back)
  Q.darkShare = function (game) {
    var D = SB.Dark; if (!D || !D.LIFTS || !D.lifted) return null;
    var ids = Object.keys(D.LIFTS), n = 0; if (!ids.length) return null;
    ids.forEach(function (id) { if (D.lifted(game, id)) n++; });
    return { lifted: n, of: ids.length, pct: Math.round((1 - n / ids.length) * 100) };
  };
  Q.seenShare = function (game) { var s = game.world && game.world.seen; if (!s || !s.length) return null; var n = 0; for (var i = 0; i < s.length; i++) if (s[i]) n++; return Math.round(n / s.length * 100); };
  // everything worth a mark on the map
  Q.marks = function (game, c) {
    var out = [], s = st(game), n = nestOf(game), w = game.world;
    out.push({ icon: "🪹", name: "the nest", x: n.x, z: n.z });
    var h = SB.Home && SB.Home.get ? SB.Home.get(game) : null;
    if (h) out.push({ icon: "🏠", name: SB.Town && SB.Town.homeName ? SB.Town.homeName(game) : "your home", x: h.x, z: h.z });
    (game.sites || []).forEach(function (o) {
      if (!o || o.gone) return;
      var d = SITE[o.kind] || ["❔", "a place"];
      if (o.found) out.push({ icon: d[0], name: d[1] + (o.done ? " (done)" : ""), x: o.x, z: o.z });
      else if (s.shown) out.push({ icon: "❔", name: "somewhere nobody has been", x: o.x, z: o.z, secret: true });
    });
    var B = SB.Bosses;
    if (B && B.state && B.LIST) { var bl = B.state(game).list || {}; B.LIST.forEach(function (d) { var e = bl[d.id]; if (e && e.found && e.x != null) out.push({ icon: d.icon, name: d.name + (e.beaten ? " (beaten)" : "'s lair"), x: e.x, z: e.z, danger: !e.beaten }); }); }
    (game.villages || []).forEach(function (v, i) { if (v && v.x != null) out.push({ icon: "🏘", name: v.name || "village " + (i + 1), x: v.x, z: v.z }); });
    if (SB.Deep && SB.Deep.waystones) { try { SB.Deep.waystones(game).forEach(function (b) { out.push({ icon: "🗿", name: b.name || "a waystone", x: b.x, z: b.z }); }); } catch (e) {} }
    (w.structures || []).forEach(function (b) { if (b.kind === "chimestone") out.push({ icon: "🎐", name: "a chime stone", x: b.x, z: b.z }); });
    s.pins.forEach(function (p, i) { out.push({ icon: "📍", name: p.n, x: p.x, z: p.z, pin: i }); });
    if (c) out.push({ icon: "🙂", name: "you", x: c.x, z: c.z, you: true });
    return out;
  };
  // how risky a spot is, 0..1: unbeaten lairs, live camps, grumps about, the night
  Q.dangerAt = function (game, x, z) {
    var d = 0;
    (game.sites || []).forEach(function (o) { if (o && o.kind === "camp" && !o.done && !o.gone) d = Math.max(d, 1 - SB.dist(x, z, o.x, o.z) / 40); });
    var B = SB.Bosses;
    if (B && B.state) { var bl = B.state(game).list || {}; for (var id in bl) if (!bl[id].beaten && bl[id].x != null) d = Math.max(d, 1 - SB.dist(x, z, bl[id].x, bl[id].z) / 45); }
    SB.Game.grumps(game).forEach(function (g) { d = Math.max(d, 0.9 - SB.dist(x, z, g.x, g.z) / 25); });
    if (game.world.night) d += 0.15;
    var f = SB.World.nearestFire(game.world, x, z, 8); if (f) d -= 0.3;
    return c01(d);
  };

  /* ================= search ================= */
  Q.search = function (game, q, c) {
    q = String(q || "").toLowerCase().trim();
    var out = [], w = game.world, from = c || nestOf(game), seen = {};
    if (q.length < 2) return out;
    function hit(icon, name, what, o, ref) { out.push({ icon: icon, name: name, what: what, x: o.x, z: o.z, d: Math.round(SB.dist(from.x, from.z, o.x, o.z)), ref: ref || null }); }
    function nearest(list, key, test, mk) {
      var by = {};
      list.forEach(function (o) { if (!o || o.gone) return; var k = key(o); if (!k || !test(k, o)) return; var d = SB.dist(from.x, from.z, o.x, o.z); if (!by[k] || d < by[k].d) by[k] = { o: o, d: d }; });
      for (var k in by) mk(k, by[k].o);
    }
    game.creatures.forEach(function (o) { if (o.alive && ((o.name && String(o.name).toLowerCase().indexOf(q) >= 0) || (o.species !== "smol" && String(o.species).indexOf(q) >= 0))) hit(o.species === "smol" ? SB.TIERS[o.tier | 0].icon : "👹", o.name || o.species, o.species === "smol" ? (o.stranger ? "a stranger" : "a smol") : "a " + o.species, o, o); });
    (w.structures || []).forEach(function (b) { var d = SB.STRUCTS[b.kind]; if (!d || seen[b.kind + (b.name || "")]) return; var nm = (b.name || d.label || b.kind); if (String(nm).toLowerCase().indexOf(q) >= 0 || String(d.label || "").toLowerCase().indexOf(q) >= 0) { seen[b.kind + (b.name || "")] = 1; hit(d.emoji || "🏠", nm, b.done ? "a building" : "being built", b, b); } });
    nearest(w.items || [], function (o) { return o.kind; }, function (k) { return label(k).toLowerCase().indexOf(q) >= 0; }, function (k, o) { hit(KK()[k] && KK()[k].emoji || "·", label(k), "on the ground", o, o); });
    nearest(w.nodes || [], function (o) { return o.kind; }, function (k) { var d = SB.NODES[k]; return !!d && String(d.label || k).toLowerCase().indexOf(q) >= 0; }, function (k, o) { hit(SB.NODES[k].emoji || "🌳", SB.NODES[k].label || k, "growing", o, o); });
    st(game).pins.forEach(function (p) { if (p.n.toLowerCase().indexOf(q) >= 0) hit("📍", p.n, "your pin", p, null); });
    out.sort(function (a, b) { return a.d - b.d; });
    return out.slice(0, 12);
  };
  Q.wildlife = function (game, c) {
    var A = SB.Animals, out = [], from = c || nestOf(game); if (!A || !A.wildOf) return out;
    (game.world.items || []).forEach(function (it) { if (it && !it.gone && A.wildOf(it)) { var d = SB.dist(from.x, from.z, it.x, it.z); if (d < 60) out.push({ it: it, d: Math.round(d), name: label(it.kind), icon: KK()[it.kind] && KK()[it.kind].emoji || "🐾" }); } });
    out.sort(function (a, b) { return a.d - b.d; });
    return out.slice(0, 8);
  };

  /* ================= smols ================= */
  Q.inRoster = function (game, c) { return st(game).roster.indexOf(c.id) >= 0; };
  Q.rosterToggle = function (game, c) { var r = st(game).roster, i = r.indexOf(c.id); if (i >= 0) r.splice(i, 1); else { if (r.length >= 8) r.shift(); r.push(c.id); } return i < 0; };
  // your family row: your smol first, then the ones you starred (the dead drop off by themselves)
  Q.roster = function (game) {
    var s = st(game), out = [], m = mine(game);
    if (m && m.alive) out.push(m);
    s.roster = s.roster.filter(function (id) { var c = SB.Game.byId(game, id); return !!c && c.alive && c.species === "smol"; });
    s.roster.forEach(function (id) { var c = SB.Game.byId(game, id); if (c !== m) out.push(c); });
    return out;
  };
  Q.moodWord = function (game, c) {
    var ch = c.chem || {}, worst = [["hungry", ch.hunger], ["scared", ch.fear], ["hurting", ch.pain], ["sick", ch.sick], ["lonely", ch.lonely], ["bored", ch.bored], ["sleepy", ch.sleepy]].sort(function (a, b) { return (b[1] || 0) - (a[1] || 0); })[0];
    return (worst[1] || 0) > 0.55 ? worst[0] : (ch.health || 1) < 0.5 ? "hurt" : "fine";
  };
  // step out of the smol you're in and into another one
  Q.hop = function (game, o) {
    var p = P(); if (!p || !o || !o.alive) return { ok: false, msg: "nobody there" };
    if (p.active && p.c === o) return { ok: false, msg: "that's you" };
    if (p.active) p.leave("hop");
    try { if (SB.UI && SB.UI.modalOpen && SB.UI.closeModal) SB.UI.closeModal(); } catch (e) {}
    var why = p.canEnter ? p.canEnter(game, o) : "";
    if (why) return { ok: false, msg: why };
    return p.enter(game, o) ? { ok: true, msg: "" } : { ok: false, msg: "couldn't step in" };
  };
  Q.rename = function (game, c, name) { var n = clean(name, 24); if (!c || !n) return { ok: false, msg: "a name needs a letter or two" }; var old = c.name; c.name = n; if (game.family && game.family[c.id]) game.family[c.id].name = n; Q.milestone(game, c, "renamed", "was " + old + " before"); return { ok: true, msg: old + " is " + n + " now" }; };
  Q.note = function (c, text) { if (text !== undefined) { var t = clean(text, 120); if (t) c.note = t; else delete c.note; } return c.note || ""; };
  Q.PRON = [["", "(by name)"], ["she", "she / her"], ["he", "he / him"], ["they", "they / them"], ["it", "it / its"]];
  Q.pron = function (c, set) { if (set !== undefined) { if (set) c.pron = set; else delete c.pron; } return c.pron || ""; };
  Q.nextPron = function (c) { var i = 0; Q.PRON.forEach(function (p, j) { if (p[0] === (c.pron || "")) i = j; }); return Q.pron(c, Q.PRON[(i + 1) % Q.PRON.length][0]); };
  Q.they = function (c) { return c.pron || c.name; };
  // a smol's firsts, kept on the smol: [day, key, text]
  Q.milestone = function (game, c, key, text) {
    if (!c || typeof c !== "object" || c.species !== "smol") return false;
    if (!Array.isArray(c.ms)) c.ms = [];
    for (var i = 0; i < c.ms.length; i++) if (c.ms[i][1] === key) return false;
    c.ms.push([day(game), key, String(text).slice(0, 60)]);
    if (c.ms.length > 24) c.ms.shift();
    return true;
  };
  Q.milestones = function (c) { return Array.isArray(c.ms) ? c.ms : []; };
  // read straight off the body's chemistry
  Q.pulse = function (c) { var ch = c.chem || {}; return Math.round(70 + 60 * c01(ch.adrenaline) + 35 * c01(ch.fear) + 25 * c01(1 - (ch.health == null ? 1 : ch.health)) - 15 * c01(ch.sleepy)); };
  Q.fever = function (game, c) {
    var ch = c.chem || {}, air = SB.World.tempAt(game.world, c.x, c.z), hot = c01(ch.antigen) * 0.6 + c01(ch.toxin) * 0.3;
    return { air: r2(air), word: hot > 0.25 ? "a fever" : hot > 0.12 ? "a warm brow" : air < 0.25 ? "shivering" : air > 0.85 ? "too hot" : "comfortable" };
  };
  Q.organs = function (c) {
    var ch = c.chem || {};
    return [["💗", "heart", c01(ch.health == null ? 1 : ch.health)], ["🍖", "belly", c01(1 - (ch.hunger || 0))], ["🍯", "blood sugar", c01(ch.glucose)], ["🧈", "fat", c01(ch.fat)], ["😴", "rest", c01(1 - Math.max(ch.tired || 0, ch.sleepy || 0))], ["🛡", "antibodies", c01((ch.antibody || 0) * 2)], ["🦠", "germs", c01(ch.antigen), true], ["☠", "poison", c01(ch.toxin), true]];
  };
  Q.eggLine = function (game, c) {
    if (c.stage !== 3) return "not grown up yet";
    var pt = c.partner != null ? SB.Game.byId(game, c.partner) : null;
    if (!pt || !pt.alive) return "no partner";
    if (c.eggCooldown > 0) return "with " + pt.name + " · resting after an egg (about " + Math.max(1, Math.round(c.eggCooldown / 60)) + " min)";
    return "with " + pt.name + " · love " + bar((c.chem.love || 0)) + (((c.chem.love || 0) + (pt.chem.love || 0)) >= 0.85 ? " · an egg could come any time" : " · not in the mood yet");
  };
  Q.bonds = function (game, c) {
    var SO = SB.Social, out = { friend: null, fv: 0, love: null, lv: 0 }; if (!SO || !SO.opinion) return out;
    smols(game).forEach(function (o) { if (o === c) return; var v = SO.opinion(game, c, o); if (c.partner === o.id) { out.love = o; out.lv = v; } else if (v > out.fv) { out.fv = v; out.friend = o; } });
    return out;
  };
  Q.jobLine = function (c) {
    var J = c.job && SB.Civ && SB.Civ.JOBS ? SB.Civ.JOBS[c.job] : null; if (!J) return "";
    var xp = c.jobXp && c.jobXp[c.job] || 0;
    return J.icon + " " + J.name + " " + bar(Math.min(1, xp / 20)) + " " + Math.round(xp);
  };
  Q.CHALLENGES = [["felled", 10, "🌳 fell ten trees"], ["mined", 10, "🪨 break ten rocks"], ["made", 12, "🛠 make a dozen things"], ["cooked", 8, "🍖 cook eight meals"], ["fish", 6, "🐟 land six fish"], ["grumps", 5, "👹 chase off five grumps"], ["nights", 5, "🌙 five safe nights"], ["drinks", 20, "💧 twenty drinks"]];
  Q.challenges = function (c) { var b = SB.Body ? SB.Body.of(c) : { n: {} }; return Q.CHALLENGES.map(function (x) { var n = (b.n && b.n[x[0]]) || 0; return { text: x[2], n: Math.min(n, x[1]), of: x[1], done: n >= x[1] }; }); };
  Q.knows = function (c) { var out = []; if (!SB.Ideas) return out; SB.Ideas.LIST.forEach(function (d) { if (SB.Ideas.known(c, d.id)) out.push(d.icon + " " + d.name); }); return out; };
  // the sick, hurt or cold are carried to the nearest fire (or home, or the nest)
  Q.carry = function (game, c) {
    if (!c || !c.alive) return { ok: false, msg: "nobody to carry" };
    var ch = c.chem || {}, bad = (ch.health || 1) < 0.6 || (ch.antigen || 0) > 0.25 || (ch.sick || 0) > 0.4 || SB.World.tempAt(game.world, c.x, c.z) < 0.28;
    if (!bad) return { ok: false, msg: c.name + " is fine where " + Q.they(c) + " is" };
    if (c._carryT > game.time) return { ok: false, msg: "just carried. let " + c.name + " rest" };
    var f = SB.World.nearestFire(game.world, c.x, c.z), h = SB.Home && SB.Home.get ? SB.Home.get(game) : null, to = f || h || nestOf(game);
    c.x = to.x + 1.1; c.z = to.z + 0.6; c._carryT = game.time + 60;
    if (c.chem.fear != null) c.chem.fear = Math.max(0, c.chem.fear - 0.3);
    SB.bus.emit("qolCarried", { c: c, to: to });
    return { ok: true, msg: "🫳 " + c.name + " is by the " + (f ? "fire" : h ? "door at home" : "nest") + " now" };
  };
  // send a smol away for good: it walks off as a stranger. never your own smol, never one of the last three
  Q.exile = function (game, c) {
    if (!c || !c.alive || c.species !== "smol" || c.stranger) return { ok: false, msg: "nobody to send away" };
    if (c === mine(game) || c === me(game)) return { ok: false, msg: "not your own smol" };
    if (smols(game).length <= 3) return { ok: false, msg: "too few smols left to lose one" };
    var n = nestOf(game), a = Math.atan2(c.x - n.x, c.z - n.z);
    c.stranger = { state: "leaving", t: game.time, x0: n.x + Math.sin(a) * 34, z0: n.z + Math.cos(a) * 34, exiled: true };
    var r = st(game).roster, i = r.indexOf(c.id); if (i >= 0) r.splice(i, 1);
    if (SB.Game.note) SB.Game.note(game, "🚪 " + c.name + " was sent away");
    SB.bus.emit("qolExiled", { c: c });
    return { ok: true, msg: "🚪 " + c.name + " packs up and walks off" };
  };
  // a wish you pin doesn't fade
  Q.wishOf = function (game, c) { var f = game.fh; if (!f || !f.wishes) return null; for (var i = 0; i < f.wishes.length; i++) if (f.wishes[i].id === c.id && !f.wishes[i].done) return f.wishes[i]; return null; };
  Q.lockWish = function (game, c) { var w = Q.wishOf(game, c); if (!w) return { ok: false, msg: c.name + " isn't wishing for anything" }; w.pin = !w.pin; return { ok: true, msg: w.pin ? "📌 the wish stays until it's granted" : "the wish can fade again" }; };
  // job rules: copy one smol's, give them to another
  var clip = null;
  Q.copyRules = function (c) { clip = { name: c.name, prio: JSON.parse(JSON.stringify(c.prio || {})) }; return { ok: true, msg: "copied " + c.name + "'s job rules" }; };
  Q.pasteRules = function (c) {
    if (!clip || !SB.Orders) return { ok: false, msg: "copy a smol's rules first" };
    SB.Orders.PRIO.forEach(function (p) { SB.Orders.setPrio(c, p[0], clip.prio[p[0]] || 0); });
    return { ok: true, msg: c.name + " now works like " + clip.name };
  };
  Q.rulesText = function (c) { if (!SB.Orders) return ""; var out = []; SB.Orders.PRIO.forEach(function (p) { var v = c.prio && c.prio[p[0]] || 0; if (v) out.push(p[1] + (v > 0 ? "▲" : "▼")); }); return out.length ? out.join(" ") : "no rules"; };
  Q.follow = function (o) { if (o && SB.Input && SB.Input.follow && !(P() && P().active)) { try { SB.Input.follow(o.alive === undefined ? Object.defineProperties({}, { alive: { get: function () { return !o.gone; } }, x: { get: function () { return o.x; } }, z: { get: function () { return o.z; } } }) : o); if (SB.UI && SB.UI.modalOpen && SB.UI.closeModal) SB.UI.closeModal(); return true; } catch (e) {} } return false; };

  /* ================= the island ================= */
  Q.calendar = function (game) {
    var ck = Q.clock(game), out = [], w = game.world, F = SB.Friends, wx = w.weather || {};
    out.push({ icon: "🗓", text: ck.season + ", day " + ck.into + " of " + ck.of + " · " + SB.SEASONS[(SB.SEASONS.indexOf(ck.season) + 1) % 4] + " in " + (ck.left < 1 ? "under a day" : Math.ceil(ck.left) + " day" + (Math.ceil(ck.left) === 1 ? "" : "s")) });
    if (F && F.fest && F.fest(game)) { var fd = F.FESTS[F.fest(game).k]; if (fd) out.push({ icon: fd.icon, text: fd.name + " is on right now" }); }
    else if (F && F.nextFest) { var nf = F.nextFest(game); if (nf && nf.def) out.push({ icon: nf.def.icon, text: nf.def.name + " in " + (nf.days < 1 ? "under a day" : Math.round(nf.days) + " day" + (Math.round(nf.days) === 1 ? "" : "s")) }); }
    var eggs = (w.items || []).filter(function (o) { return o && !o.gone && o.kind === "egg"; }).length;
    if (eggs) out.push({ icon: "🥚", text: eggs + " egg" + (eggs === 1 ? "" : "s") + " waiting to hatch" });
    if (SB.Deep && SB.Deep.moon) { try { var m = SB.Deep.moon(game); out.push({ icon: m.icon, text: m.name }); } catch (e) {} }
    var fc = Q.forecast(game);
    out.push({ icon: fc.icon, text: fc.text });
    var d = game.dir, soon = d && d.nextT != null ? d.nextT - game.time : null;
    out.push({ icon: d && d.active ? "⚠" : "🌿", text: d && d.active ? "something is happening right now" : soon != null && soon < 150 ? "the air feels wrong. trouble may be close" : "quiet for now" + (wx.kind === "storm" ? ", but for the storm" : "") });
    return out;
  };
  var WXI = { clear: "☀", cloudy: "☁", rain: "🌧", storm: "⛈", fog: "🌫" };
  var LIKELY = [["rain", "clear"], ["clear", "storm"], ["rain", "fog"], ["cloudy", "clear"]];
  Q.forecast = function (game) {
    var w = game.world, wx = w.weather || { kind: "clear", t: 0, next: 0 }, left = Math.max(0, (wx.next || 0) - (wx.t || 0)), lk = LIKELY[w.season | 0] || LIKELY[0];
    var nxt = lk[0] === wx.kind ? lk[1] : lk[0];
    return { now: wx.kind, icon: WXI[wx.kind] || "☀", holds: Math.round(left / 60), next: nxt, text: wx.kind + " now, for about " + Math.max(1, Math.round(left / 60)) + " min · then most likely " + nxt };
  };
  // the town board: who needs what, right now
  Q.alerts = function (game) {
    var out = [], w = game.world, cs = smols(game);
    function names(list) { return list.slice(0, 3).map(function (c) { return c.name; }).join(", ") + (list.length > 3 ? " +" + (list.length - 3) : ""); }
    function add(icon, text, list, bad) { if (list.length) out.push({ icon: icon, text: text + ": " + names(list), at: list[0], bad: !!bad, n: list.length }); }
    add("🍎", "hungry", cs.filter(function (c) { return (c.chem.hunger || 0) > 0.75; }), true);
    add("🤒", "sick", cs.filter(function (c) { return (c.chem.antigen || 0) > 0.35 || (c.chem.sick || 0) > 0.5; }), true);
    add("🩹", "hurt", cs.filter(function (c) { return (c.chem.health == null ? 1 : c.chem.health) < 0.45; }), true);
    add("🥶", "cold", cs.filter(function (c) { return SB.World.tempAt(w, c.x, c.z) < 0.25; }), true);
    add("😢", "lonely", cs.filter(function (c) { return (c.chem.lonely || 0) > 0.8; }));
    var d = game.dir;
    if (d && d.active && d.active.raiders) { var left = Q.raidLeft(game); out.push({ icon: "👹", text: "a raid: " + left.left + " of " + left.of + " still coming", bad: true, n: left.left }); }
    var gr = SB.Game.grumps(game).length;
    if (gr && !(d && d.active && d.active.raiders)) out.push({ icon: "👹", text: gr + " grump" + (gr === 1 ? "" : "s") + " on the island", n: gr });
    if (w.night && cs.length && cs[0].tier >= 2 && w.fires && !w.fires.length) out.push({ icon: "🔥", text: "night, and not one fire lit", bad: true, n: 1 });
    if (SB.Harvest && SB.Harvest.beds && SB.Harvest.ripe) { try { var ripe = SB.Harvest.beds(game).filter(SB.Harvest.ripe); if (ripe.length) out.push({ icon: "🌾", text: ripe.length + " bed" + (ripe.length === 1 ? "" : "s") + " ripe for picking", at: ripe[0], n: ripe.length }); } catch (e) {} }
    var wr = (w.structures || []).filter(function (b) { return b.wrecked || (b.data && b.data.wrecked); });
    if (wr.length) out.push({ icon: "🏚", text: wr.length + " building" + (wr.length === 1 ? "" : "s") + " wrecked", at: wr[0], n: wr.length });
    if (SB.Loot && SB.Loot.unopened) { var un = SB.Loot.unopened(game); if (un) out.push({ icon: "🧰", text: un + " chest" + (un === 1 ? "" : "s") + " nobody has opened", n: un }); }
    var bw = SB.Game.beaconWaiting ? SB.Game.beaconWaiting(game) : null;
    if (bw) out.push({ icon: "🌟", text: "the beacon is waiting to be lit", at: bw, n: 1 });
    return out;
  };
  Q.raidLeft = function (game) {
    var d = game.dir, inc = d && d.active, ids = inc && inc.raiders ? inc.raiders : [], n = 0;
    ids.forEach(function (id) { var g = SB.Game.byId(game, id); if (g && g.alive && g.raider) n++; });
    return { left: n, of: ids.length };
  };
  Q.stalls = function (game) {
    var out = [], L = SB.Loot; if (!L || !L.stallInfo) return out;
    (game.world.structures || []).forEach(function (b) { var s = b.kind === "stall" ? L.stallInfo(game, b) : null; if (s) out.push(s); });
    return out;
  };
  Q.wealth = function (game) {
    var v = 0;
    smols(game).forEach(function (c) { v += c.purse || 0; });
    (game.world.structures || []).forEach(function (b) { if (b.done && b.kind !== "lootchest") v += 5; });
    if (SB.Home && game.quests && game.quests.home) (game.quests.home.chest || []).forEach(function (sl) { if (sl) v += Q.value(game, sl.k) * sl.n; });
    return Math.round(v);
  };
  Q.mood = function (game) { var cs = smols(game), t = 0; if (!cs.length) return 0; cs.forEach(function (c) { var ch = c.chem || {}; t += 1 - Math.max(ch.hunger || 0, ch.fear || 0, ch.pain || 0, ch.sick || 0, ch.lonely || 0, ch.bored || 0); }); return Math.round(t / cs.length * 100); };
  // hatched, lost, eggs, generations and the island's age in one number
  Q.breeder = function (game) { var s = game.stats || {}; return Math.max(0, Math.round((s.hatched || 0) * 10 + (s.eggsLaid || 0) * 4 + (s.maxGen || 1) * 15 + day(game) * 2 - (s.deaths || 0) * 6 + smols(game).length * 5)); };
  Q.sample = function (game) {
    var s = st(game), row = [day(game), Q.wealth(game), Q.mood(game), smols(game).length];
    if (s.hist.length && s.hist[s.hist.length - 1][0] === row[0]) s.hist[s.hist.length - 1] = row; else s.hist.push(row);
    if (s.hist.length > Q.HIST) s.hist.splice(0, s.hist.length - Q.HIST);
    return row;
  };
  // one percent over everything there is to finish
  Q.perfection = function (game) {
    var parts = [], m = me(game) || mine(game) || smols(game)[0];
    function part(icon, name, n, of) { if (of > 0) parts.push({ icon: icon, name: name, n: Math.min(n, of), of: of, pct: Math.round(Math.min(1, n / of) * 100) }); }
    if (SB.Collect && SB.Collect.dexTotal) part("✨", "smoldex", SB.Collect.dexCount(game), SB.Collect.dexTotal());
    if (SB.Ideas) part("💡", "ideas", Object.keys((game.culture && game.culture.found) || {}).length, SB.Ideas.LIST.length);
    if (SB.Body && m) part("🐾", "skills", SB.Body.total(m), SB.Body.SKILLS.length * SB.Body.MAX);
    var sites = (game.sites || []).filter(function (s) { return s && !s.gone; });
    part("🧭", "places found", sites.filter(function (s) { return s.found; }).length, sites.length);
    if (SB.Bosses && SB.Bosses.LIST && SB.Bosses.state) { var bl = SB.Bosses.state(game).list || {}, bn = 0; SB.Bosses.LIST.forEach(function (d) { if (bl[d.id] && bl[d.id].beaten) bn++; }); part("👑", "captains", bn, SB.Bosses.LIST.length); }
    if (SB.Loot && m) part("💗", "heart-fruit", SB.Loot.hp(m), SB.Loot.MAX_HP);
    if (SB.ACHIEVEMENTS) part("🏆", "achievements", Object.keys(game.achievements || {}).length, SB.ACHIEVEMENTS.length);
    if (SB.Music && SB.Music.heard) { var songs = SB.Music.all ? SB.Music.all() : (SB.Music.SONGS || []); part("🎵", "songs heard", songs.filter(function (s) { return SB.Music.heard(s.id); }).length, songs.length); }
    var t = 0; parts.forEach(function (p) { t += p.pct; });
    return { pct: parts.length ? Math.round(t / parts.length) : 0, parts: parts };
  };
  // the log: news that would have been a pop-up, kept to scroll back through
  Q.logAdd = function (game, text) {
    var s = st(game), t = plainText(text).slice(0, 110); if (!t) return;
    if (s.log.length && s.log[s.log.length - 1][1] === t) return;
    s.log.push([day(game), t]);
    if (s.log.length > Q.LOG) s.log.splice(0, s.log.length - Q.LOG);
  };
  Q.log = function (game) { return st(game).log; };
  // which pop-ups you want. ui.js asks before it shows one: true = keep it off the screen (it goes in the log instead)
  Q.TOASTS = [["news", "small news"], ["ach", "achievements"], ["day", "the morning card"], ["song", "song titles"]];
  Q.hush = function (html, cls) {
    var game = cur(); if (!game) return false;
    var o = opt(game), kind = cls === "ach" ? "ach" : cls === "day" ? "day" : cls === "song" ? "song" : cls === "ember" || cls === "night" || cls === "wrecked" ? null : "news";
    Q.logAdd(game, html);
    if (!kind) return false;
    return !!(o.mute && o.mute[kind]);
  };
  Q.muted = function (game, kind) { var o = opt(game); return !!(o.mute && o.mute[kind]); };
  Q.mute = function (game, kind) { var o = opt(game); if (!o.mute) o.mute = {}; o.mute[kind] = !o.mute[kind]; return o.mute[kind]; };
  // the grump book: the more of a kind you chase off, the more it says
  Q.BEASTS = [
    { id: "grump", icon: "👹", name: "grump", facts: ["a lump of dark that hates light. it bites.", "fire turns most of them back. a club or a spear sends them home.", "they come from the camps, and from the dark between the stars. free a camp and fewer come."] },
    { id: "raider", icon: "⚔", name: "raider", facts: ["a grump that came with a war party, in daylight.", "hurt or frightened enough, it runs and the rest lose heart.", "raids grow with the village. walls and watch fires thin them out."] },
    { id: "hunter", icon: "👁", name: "night hunter", facts: ["a grump that picks one smol and follows it.", "it gives up at a lit fire, and at a hearth at home.", "it winds up before it bites: step aside, then bonk."] },
    { id: "cave", icon: "🕳", name: "cave grump", facts: ["it lives under the island, where there's no light at all.", "deeper ones are tougher. a dark moon makes them tougher still.", "carry a light and they hang back."] },
    { id: "named", icon: "🏴", name: "named grump", facts: ["one with a name and a bad habit of its own.", "the notice board pays for each one driven off.", "each has one trick. learn it and it's just a grump."] },
    { id: "captain", icon: "👑", name: "captain", facts: ["one of the three who broke the ark.", "each needs a better weapon than the last, and each leaves a hoard.", "beat all three and the beacon can be lit."] }
  ];
  Q.beastOf = function (g) { return !g ? "grump" : g.boss ? "captain" : g.caveGrump != null || g.caveKeeper != null ? "cave" : g.named || g.nm || g.darkId ? "named" : g.raider ? "raider" : g.scout ? "hunter" : "grump"; };
  Q.bestiary = function (game) {
    var s = st(game);
    return Q.BEASTS.map(function (b) { var n = s.best[b.id] || 0, tier = n >= 15 ? 3 : n >= 5 ? 2 : n >= 1 ? 1 : 0; return { id: b.id, icon: b.icon, name: n ? b.name : "???", n: n, tier: tier, facts: b.facts.slice(0, tier), next: tier >= 3 ? 0 : [1, 5, 15][tier] - n }; });
  };
  // the ideas web: what the tribe could think of next, and what each one waits for
  Q.ideasWeb = function (game) {
    var out = { ready: [], waiting: [], found: 0, of: 0 }, I = SB.Ideas; if (!I) return out;
    var found = (game.culture && game.culture.found) || {};
    out.of = I.LIST.length;
    I.LIST.forEach(function (d) {
      if (found[d.id]) { out.found++; return; }
      var lack = (d.needs || []).filter(function (n) { return !found[n]; });
      (lack.length ? out.waiting : out.ready).push({ id: d.id, icon: d.icon, name: d.name, tier: d.tier, needs: (d.needs || []).map(function (n) { var x = I.BY_ID && I.BY_ID[n]; return (found[n] ? "✓ " : "") + (x ? x.name : n); }), lack: lack.length });
    });
    out.waiting.sort(function (a, b) { return a.lack - b.lack || a.tier - b.tier; });
    return out;
  };

  /* ================= recipes ================= */
  // every recipe this smol knows (nothing it hasn't worked out: riddles stay riddles), filtered by words and kind
  Q.recipes = function (game, c, q, cat) {
    var out = [], S = Sv(); q = String(q || "").toLowerCase().trim();
    function match(name, ins) { if (!q) return true; if (name.toLowerCase().indexOf(q) >= 0) return true; for (var k in ins) if (label(k).toLowerCase().indexOf(q) >= 0) return true; return false; }
    if (c && c.tier >= 2) S.recipes(c, game).forEach(function (r) {
      if (!r.known) return;
      var rc = r.rc, name = rc.out && KK()[rc.out] ? label(rc.out) : rc.name, ct = rc.out ? Q.cat(rc.out) : "things";
      if ((cat && cat !== ct) || !match(name, rc.in || {})) return;
      out.push({ id: r.id, name: name, out: rc.out || null, icon: rc.icon || "", cat: ct, ins: rc.in || {}, tool: rc.tool || null, at: r.station || rc.at || null, ok: r.ok, make: true });
    });
    var p = P();
    if (p && p.active && p.c === c && p.buildable && (!cat || cat === "buildings")) p.buildable().forEach(function (b) {
      var d = SB.STRUCTS[b.kind]; if (!d || !match(d.label || b.kind, b.cost || {})) return;
      out.push({ id: b.kind, name: d.label || b.kind, icon: d.emoji || "🏠", cat: "buildings", ins: b.cost || {}, ok: !!b.can, build: true });
    });
    return out;
  };

  /* ================= things kept on this device: pictures and the smol shelf ================= */
  function b64e(str) { var s = unescape(encodeURIComponent(str)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function b64d(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return decodeURIComponent(escape(atob(s))); }
  function payloadOf(code) { try { var s = String(code).replace(/\s+/g, ""), m = /^SMOL(\d*):/i.exec(s); if (m) s = s.slice(m[0].length); var p = JSON.parse(b64d(s)); return p && typeof p === "object" ? p : null; } catch (e) { return null; } }
  // a smol code with a letter, the island it came from and a few lines of its life packed in. it still opens anywhere
  Q.packSmol = function (game, c, letter) {
    var code = SB.Save.exportSmol(c), p = payloadOf(code); if (!p) return code;
    var out = {}, k;
    for (k in p) if (k !== "ck") out[k] = p[k];
    var lt = clean(letter, 140); if (lt) out.lt = lt;
    out.fr = clean(game.wname || (game.tribes && game.tribes[0] && game.tribes[0].name) || SB.worldCode(game.seed), 40);
    var hist = Q.milestones(c).slice(-6).map(function (m) { return "day " + m[0] + ": " + m[2]; });
    if (hist.length) out.hs = hist;
    if (c.note) out.nt = clean(c.note, 120);
    var bag = []; try { Sv().list(c).forEach(function (x) { if (bag.length < 6 && x.k !== "plans" && KK()[x.k]) bag.push([x.k, Math.min(x.n, Sv().stackOf(x.k))]); }); } catch (e) {}
    if (bag.length) out.bg = bag;
    if (p.ck != null && SB.Collect) out.ck = SB.Collect.checksum(JSON.stringify(out));
    return "SMOL2:" + b64e(JSON.stringify(out));
  };
  Q.readSmol = function (code) { var p = payloadOf(code); if (!p) return null; return { name: clean(p.name, 24), letter: clean(p.lt, 140), from: clean(p.fr, 40), hist: Array.isArray(p.hs) ? p.hs.slice(0, 6).map(function (x) { return clean(x, 80); }) : [], note: clean(p.nt, 120), bag: Array.isArray(p.bg) ? p.bg.slice(0, 6).filter(function (x) { return Array.isArray(x) && KK()[x[0]] && x[1] > 0; }).map(function (x) { return [x[0], Math.min(24, Math.floor(x[1]))]; }) : [] }; };
  Q.bin = function () { var b = store("smolbrains-bin"); return Array.isArray(b) ? b : []; };
  Q.binAdd = function (game, c, letter) {
    var b = Q.bin(); if (b.length >= Q.BIN) return { ok: false, msg: "the shelf is full (" + Q.BIN + "). take one off first" };
    b.push({ n: c.name, code: Q.packSmol(game, c, letter), d: day(game), fr: clean(game.wname || SB.worldCode(game.seed), 40) });
    return store("smolbrains-bin", b) ? { ok: true, msg: "📚 " + c.name + " is on the shelf. bring them into any island on this device" } : { ok: false, msg: "this browser won't keep it" };
  };
  Q.binRemove = function (i) { var b = Q.bin(); if (!b[i]) return false; b.splice(i, 1); store("smolbrains-bin", b); return true; };
  // bring a smol in from a code: the same way the world tab does, and then its letter and story are unpacked
  Q.bringIn = function (game, code) {
    var d, x = Q.readSmol(code);
    try { d = SB.Save.importSmol(code); } catch (e) { return { ok: false, msg: e && e.tampered ? "that smol code has been changed or mistyped 🔒" : "that's not a smol code 🤔" }; }
    if (SB.Collect && d.key && SB.Collect.seenImport(game, d.key, d.oid)) return { ok: false, msg: "🌌 " + d.name + " is already on this island. each smol can only come in once" };
    var sp = SB.Society && SB.Society.home ? SB.Society.home(game, 0) : nestOf(game);
    var c = SB.Game.spawnSmol(game, { genome: d.genome, name: d.name, gen: d.gen, vocab: d.vocab, ideas: d.ideas, age: d.age, x: sp.x + 1, z: sp.z + 1, brain: d.brain && SB.Brain && SB.Brain.deserialize ? SB.Brain.deserialize(d.brain, d.genome, dice(game, "bring" + d.name)) : null, how: "import" });
    if (SB.Collect && d.key) { if (d.oid) c.oid = d.oid; SB.Collect.markImport(game, d.key); }
    if (game.stats) game.stats.imported = (game.stats.imported || 0) + 1;
    if (SB.Game.unlock) SB.Game.unlock(game, "import");
    Q.arrive(game, c, x);
    return { ok: true, c: c, msg: "🌌 " + c.name + " arrived" + (x && x.from ? " from " + x.from : "") + (x && x.letter ? ", with a letter" : "") };
  };
  Q.arrive = function (game, c, x) {
    if (!c || !x) return;
    if (x.from) c.from = x.from; if (x.letter) c.letter = x.letter; if (x.note && !c.note) c.note = x.note;
    (x.hist || []).forEach(function (h, i) { Q.milestone(game, c, "old" + i, "before: " + h); });
    if (c.tier >= 2) (x.bag || []).forEach(function (b) { Sv().add(c, b[0], b[1]); }); // it comes with what it was carrying
    Q.milestone(game, c, "arrived", "arrived" + (x.from ? " from " + x.from : ""));
  };
  Q.album = function () { var a = store("smolbrains-album"); return Array.isArray(a) ? a : []; };
  Q.albumAdd = function (game, src, who) {
    var a = Q.album();
    a.push({ d: day(game), n: who ? who.name : "the island", src: src, w: clean(game.wname || SB.worldCode(game.seed), 40) });
    while (a.length > Q.ALBUM) a.shift();
    store("smolbrains-album", a);
    if (who) Q.milestone(game, who, "photo" + day(game), "had a picture taken");
    return a.length;
  };
  Q.albumRemove = function (i) { var a = Q.album(); if (!a[i]) return false; a.splice(i, 1); store("smolbrains-album", a); return true; };
  // photo mode: everything on the screen but the island goes away, a picture goes in the album, any key or tap brings it back
  var photo = { on: false, want: false };
  Q.photoOn = function () { return photo.on; };
  Q.photo = function (game) {
    photo.on = true; photo.want = true;
    setBody("sb-photo", true);
    if (SB.PovHud && SB.PovHud.bagOpen && SB.PovHud.bagOpen() && SB.PovHud.closeBag) SB.PovHud.closeBag();
    if (SB.UI && SB.UI.closeModal && SB.UI.modalOpen) { try { SB.UI.closeModal(); } catch (e) {} }
    if (typeof window.addEventListener === "function") {
      var off = function () { Q.photoOff(); try { window.removeEventListener("keydown", off, true); window.removeEventListener("pointerdown", off, true); } catch (e) {} };
      setTimeout(function () { try { window.addEventListener("keydown", off, true); window.addEventListener("pointerdown", off, true); } catch (e) {} }, 400);
    }
    return { ok: true, msg: "" };
  };
  Q.photoOff = function () { photo.on = false; photo.want = false; setBody("sb-photo", false); };
  function capture(game) {
    try {
      var cv = document.getElementById("view"); if (!cv || !cv.width || !document.createElement) return false;
      var t = document.createElement("canvas"); t.width = 240; t.height = Math.max(90, Math.round(240 * cv.height / cv.width));
      t.getContext("2d").drawImage(cv, 0, 0, t.width, t.height);
      Q.albumAdd(game, t.toDataURL("image/jpeg", 0.6), me(game) || mine(game));
      return true;
    } catch (e) { return false; }
  }
  // the island as a file (to keep somewhere safe), and its name
  Q.worldName = function (game, name) { if (name !== undefined) { var n = clean(name, 40); if (n) game.wname = n; } return game.wname || "my first island"; };
  Q.exportWorld = function (game) { try { return JSON.stringify(SB.Save.snapshot(game)); } catch (e) { return ""; } };
  function download(name, text) {
    try {
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "application/json" })); a.download = name;
      document.body.appendChild(a); a.click(); setTimeout(function () { try { a.remove(); } catch (e) {} }, 500);
      return true;
    } catch (e) { return false; }
  }

  /* ================= tunes, chime stones, sparks in the sky ================= */
  var PLAY = { drum: { icon: "🥁", sound: "bonk", verb: "bang the drum", word: "boom ba-boom" }, flute: { icon: "🎶", sound: "chime", verb: "play the flute", word: "toot-a-loo" } };
  Q.INSTRUMENTS = PLAY;
  var playT = 0;
  // play what you hold: everyone close by cheers up and dances. three or more of you is a song circle, and it gets better with practice
  Q.play = function (game, c, kind) {
    var d = PLAY[kind]; if (!d) return { ok: false, msg: "" };
    if (!Sv().has(c, kind)) return { ok: false, msg: "you don't have a " + label(kind) };
    if (playT > game.time) return { ok: false, msg: "let the last tune ring out" };
    playT = game.time + 3;
    var s = st(game), near = smols(game).filter(function (o) { return o !== c && SB.dist(o.x, o.z, c.x, c.z) < 9; });
    var circle = near.length >= 2, lv = Math.min(5, Math.floor((s.tunes || 0) / 5)), lift = 0.12 + lv * 0.03 + (circle ? 0.08 : 0);
    var fest = SB.Friends && SB.Friends.fest && SB.Friends.fest(game) ? 1 : 0;
    if (fest) lift += 0.1;
    near.concat([c]).forEach(function (o) {
      if (o.chem.bored != null) o.chem.bored = Math.max(0, o.chem.bored - lift);
      if (o.chem.lonely != null) o.chem.lonely = Math.max(0, o.chem.lonely - lift * 0.7);
      if (o !== c) { if (SB.Creature && SB.Creature.emote) SB.Creature.emote(o, "happy", 2.5); o.speech = { text: "♪", t: 2, kind: "say" }; o.danceT = game.time + 4; }
    });
    s.tunes = (s.tunes || 0) + 1;
    if (SB.Audio && SB.Audio.play) SB.Audio.play(d.sound, 0.6);
    if (SB.FX && SB.FX.burst) { try { SB.FX.burst("sparkle", c.x, (c.y || 0) + 0.8, c.z, 6); } catch (e) {} }
    Q.milestone(game, c, "tune", "played a first tune");
    SB.bus.emit("qolTune", { c: c, kind: kind, near: near.length, circle: circle, fest: !!fest });
    return { ok: true, n: near.length, circle: circle, msg: d.icon + " " + d.word + (near.length ? circle ? ". a song circle! " + near.length + " join in" + (fest ? ", and the feast gets louder" : "") : ". " + near[0].name + " dances" : ". nobody near to hear it") };
  };
  Q.circleLevel = function (game) { return Math.min(5, Math.floor((st(game).tunes || 0) / 5)); };
  // two of you take turns: the one who has practised more usually wins, and both end up happier
  Q.singOff = function (game, c, o) {
    if (!o || !o.alive || o.species !== "smol" || SB.dist(o.x, o.z, c.x, c.z) > 6) return { ok: false, msg: "get closer" };
    var s = st(game), r = dice(game, "sing" + (s.sings || 0) + ":" + o.id)(), mineP = 0.35 + Q.circleLevel(game) * 0.08, win = r < mineP;
    s.sings = (s.sings || 0) + 1;
    [c, o].forEach(function (x) { if (x.chem.bored != null) x.chem.bored = Math.max(0, x.chem.bored - 0.25); });
    if (SB.Creature && SB.Creature.emote) SB.Creature.emote(win ? c : o, "happy", 2.5);
    if (SB.Audio && SB.Audio.play) SB.Audio.play("chime", 0.5);
    if (win) Q.milestone(game, c, "singoff", "won a sing-off against " + o.name);
    SB.bus.emit("qolSingOff", { c: c, o: o, win: win });
    return { ok: true, win: win, msg: win ? "🎤 you out-sing " + o.name + ". " + o.name + " claps anyway" : "🎤 " + o.name + " holds the last note longer. practise and try again" };
  };
  // ask for a song you've heard before (by a fire, with somebody who knows how to sing)
  Q.requestSong = function (game, c, id) {
    var M = SB.Music; if (!M || !M.play || !M.heard) return { ok: false, msg: "no music here" };
    if (!Sv().nearFire(c, game, 6)) return { ok: false, msg: "songs are for the fireside" };
    var songs = (M.all ? M.all() : M.SONGS || []).filter(function (s) { return M.heard(s.id); });
    if (!songs.length) return { ok: false, msg: "nobody knows a song yet" };
    var pick = null; songs.forEach(function (s) { if (s.id === id) pick = s; });
    if (!pick) pick = songs[Math.floor(dice(game, "song" + Math.floor(game.time / 30))() * songs.length)];
    try { M.play(pick.id, { pin: true }); } catch (e) {}
    return { ok: true, id: pick.id, msg: "🎵 “" + pick.title + "”" };
  };
  Q.CHIME = { stone: 2, stick: 1 };
  Q.chimes = function (game) { return (game.world.structures || []).filter(function (b) { return b.kind === "chimestone"; }); };
  // a chime stone: set it down, and it rings when a smol walks past
  Q.placeChime = function (game, c) {
    var S = Sv(), k;
    if (!SB.STRUCTS.chimestone) return { ok: false, msg: "" };
    if (c.tier < 2) return { ok: false, msg: "it takes hands: a tool-user and up" };
    for (k in Q.CHIME) if (S.count(c, k, true) < Q.CHIME[k]) return { ok: false, msg: "a chime stone takes 2 stone and a stick" };
    if (Q.chimes(game).length >= 8) return { ok: false, msg: "eight chime stones is plenty" };
    var p = P(), S2 = p && p.active && p.state ? p.state() : null, yaw = S2 && S2.yaw != null ? S2.yaw : 0, x = c.x - Math.sin(yaw) * 1.4, z = c.z - Math.cos(yaw) * 1.4;
    if (SB.World.walkable && !SB.World.walkable(game.world, x, z, false)) return { ok: false, msg: "not there. find flat dry ground" };
    for (k in Q.CHIME) S.take(c, k, Q.CHIME[k]);
    var b = { id: SB.Game.newId(game), type: "struct", kind: "chimestone", noun: "wonder", x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, rot: 0, s: 0.6, done: true, work: 0, need: {}, tribe: 0, builders: [c.id], data: { by: c.name, t: 0 }, born: game.time, name: null };
    game.world.structures.push(b);
    if (SB.Render && SB.Render.markDirty) SB.Render.markDirty(b.x, b.z);
    SB.bus.emit("qolChime", { st: b, c: c });
    return { ok: true, st: b, msg: "🎐 a chime stone. it rings when somebody walks past" };
  };
  function chimeTick(game) {
    var list = Q.chimes(game); if (!list.length) return;
    var hear = me(game), cs = SB.Game.smols(game);
    list.forEach(function (b) {
      if (!b.data) b.data = {};
      if ((b.data.t || 0) > game.time) return;
      for (var i = 0; i < cs.length; i++) {
        var o = cs[i];
        if (SB.dist(o.x, o.z, b.x, b.z) > 1.8) continue;
        b.data.t = game.time + 25; b.data.n = (b.data.n || 0) + 1;
        if (o.chem.bored != null) o.chem.bored = Math.max(0, o.chem.bored - 0.08);
        if (!game.headless && SB.Audio && SB.Audio.play && (!hear || SB.dist(hear.x, hear.z, b.x, b.z) < 22)) SB.Audio.play("chime", 0.3);
        SB.bus.emit("qolChimed", { st: b, c: o });
        break;
      }
    });
  }
  // sparks in the sky: a feast, a beaten captain
  var fw = [];
  Q.fireworks = function (game, x, z, n) { for (var i = 0; i < (n || 5); i++) fw.push({ t: game.time + i * 0.7, x: x + Math.sin(i * 2.4) * 3, z: z + Math.cos(i * 2.4) * 3, k: ["gold", "stars", "magic", "sparkle"][i % 4] }); st(game).fw = (st(game).fw || 0) + 1; return fw.length; };
  Q.fireworksQueued = function () { return fw.length; };
  function fwTick(game) {
    for (var i = fw.length - 1; i >= 0; i--) {
      if (fw[i].t > game.time) continue;
      var f = fw.splice(i, 1)[0];
      if (SB.FX && SB.FX.burst && !game.headless) { try { SB.FX.burst(f.k, f.x, SB.World.groundY(game.world, f.x, f.z) + 5, f.z, 26); } catch (e) {} }
    }
  }

  /* ================= two shell games (at a stall, or at a feast) ================= */
  function gamesOk(game, c) {
    var s = st(game), L = SB.Loot;
    if (!L) return "no shells on this island";
    if (!(L.partner && L.partner(game, c)) && !(SB.Friends && SB.Friends.fest && SB.Friends.fest(game))) return "the shell games are played at a market stall, or at a feast";
    if (s.games.day !== day(game)) { s.games.day = day(game); s.games.n = 0; }
    if (s.games.n >= Q.GAMES_A_DAY) return "that's enough games for one day";
    return "";
  }
  // three cups, one pebble. a shell to play, three back if you find it
  Q.toss = function (game, c, pick) {
    var why = gamesOk(game, c), s = st(game); if (why) return { ok: false, msg: why };
    if ((c.purse || 0) < 1) return { ok: false, msg: "it costs a shell to play" };
    var at = Math.floor(dice(game, "toss" + (s.games.won + s.games.lost) + ":" + day(game))() * 3) % 3, win = at === (pick | 0);
    c.purse = r2((c.purse || 0) - 1 + (win ? 3 : 0)); s.games.n++; if (win) s.games.won++; else s.games.lost++;
    return { ok: true, win: win, at: at, msg: win ? "🥥 there it is! three shells back" : "🥥 empty. it was under cup " + (at + 1) };
  };
  // twenty-one with numbered shells: nearer to 21 than the stall keeper, without going over
  function total(a) { var t = 0; a.forEach(function (v) { t += v; }); return t; }
  Q.jack = function (game, c, act) {
    var s = st(game), j = s.jack, r;
    function draw() { r = dice(game, "jack" + (s.jackN = (s.jackN || 0) + 1)); return 1 + Math.floor(r() * 10); }
    if (act === "deal") {
      var why = gamesOk(game, c); if (why) return { ok: false, msg: why };
      if (j && !j.done) return { ok: false, msg: "finish this hand first" };
      if ((c.purse || 0) < 1) return { ok: false, msg: "it costs a shell to play" };
      c.purse = r2(c.purse - 1); s.games.n++;
      j = s.jack = { me: [draw(), draw()], house: [draw()], done: false, msg: "" };
      return { ok: true, j: j, msg: "you have " + total(j.me) };
    }
    if (!j || j.done) return { ok: false, msg: "deal a hand first" };
    if (act === "hit") {
      j.me.push(draw());
      if (total(j.me) > 21) { j.done = true; j.win = -1; s.games.lost++; j.msg = "over 21. the shell is gone"; }
      return { ok: true, j: j, msg: j.msg || "you have " + total(j.me) };
    }
    if (act === "stand") {
      while (total(j.house) < 17) j.house.push(draw());
      var a = total(j.me), b = total(j.house);
      j.done = true; j.win = b > 21 || a > b ? 1 : a === b ? 0 : -1;
      if (j.win > 0) { c.purse = r2((c.purse || 0) + 2); s.games.won++; j.msg = "you win with " + a + " to " + b + ": two shells"; }
      else if (j.win === 0) { c.purse = r2((c.purse || 0) + 1); j.msg = "a draw at " + a + ". your shell back"; }
      else { s.games.lost++; j.msg = "the keeper wins, " + b + " to " + a; }
      return { ok: true, j: j, msg: j.msg };
    }
    return { ok: false, msg: "" };
  };

  /* ================= options ================= */
  Q.OPTS = [
    ["autoTool", "🪓 auto tool", "your hands switch to the best tool for what you look at"],
    ["captions", "💬 sound captions", "a line of words for sounds: a growl, thunder, a chime"],
    ["clock", "🕑 clock by the hearts", "the time of day, in a body"],
    ["heartNum", "❤ hearts as a number", "a count beside the hearts"],
    ["contrast", "◐ stronger contrast", "bolder colours and edges"],
    ["hudDim", "🌫 fade the hud", "the in-body buttons and bars go half see-through"],
    ["pauseBag", "⏸ pause in the bag", "the island waits while your bag is open"],
    ["watching", "🫥 just watching", "hide the sky hand: smols stop noticing it"],
    ["noPad", "🎮 gamepad off", "ignore a plugged-in gamepad"]
  ];
  Q.FOVS = [["narrow", 55], ["normal", 70], ["wide", 85], ["widest", 100]];
  Q.on = function (game, key) { return !!(game && game.settings && game.settings.qol && game.settings.qol[key]); };
  Q.toggle = function (game, key) { var o = opt(game); o[key] = !o[key]; Q.apply(game); return o[key]; };
  Q.setFov = function (game, name) { var o = opt(game); o.fov = name; Q.apply(game); return Q.fov(game); };
  Q.fov = function (game) { var n = (game && game.settings && game.settings.qol && game.settings.qol.fov) || "normal", d = 70; Q.FOVS.forEach(function (f) { if (f[0] === n) d = f[1]; }); return d; };
  function setBody(cls, on) { try { if (typeof document !== "undefined" && document.body && document.body.classList) document.body.classList.toggle(cls, !!on); } catch (e) {} }
  var styled = false;
  Q.apply = function (game) {
    if (!game) return;
    var o = opt(game), p = P();
    if (p) { p.FOV = Q.fov(game) * Math.PI / 180; try { if (p.active && SB.Render && SB.Render.camera && SB.Render.camera.pov) SB.Render.camera.pov.fov = p.FOV; } catch (e) {} }
    watchHand(game);
    if (typeof document === "undefined" || !document.body || !document.body.classList) return;
    if (!styled && document.createElement && document.head) {
      styled = true;
      try {
        var el = document.createElement("style");
        el.textContent = "body.sb-contrast #view{filter:contrast(1.25) saturate(1.15)}body.sb-contrast #pov,body.sb-contrast #ui{text-shadow:0 0 2px #000}" +
          "body.sb-huddim #pov>*:not(.bag){opacity:.5}body.sb-photo #pov,body.sb-photo #ui,body.sb-photo #qol-cap{visibility:hidden!important}" +
          "#qol-cap{position:fixed;left:50%;bottom:22%;transform:translateX(-50%);padding:3px 10px;border-radius:8px;background:rgba(0,0,0,.55);color:#fff;font:600 13px system-ui,sans-serif;pointer-events:none;opacity:0;transition:opacity .3s;z-index:40}#qol-cap.on{opacity:1}" +
          ".qol .pages{display:flex;flex-wrap:wrap;gap:4px;margin:0 0 8px}.qol .pages button{padding:3px 8px}.qol .pages button.on{outline:2px solid #c4ff4a}.qol .line{margin:2px 0;overflow-wrap:anywhere}.qol .line.bad{color:#ff9aa5}.qol small{opacity:.7}" +
          ".qol input[type=text]{width:100%;box-sizing:border-box;margin:2px 0;padding:4px 6px;border-radius:6px;border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.25);color:inherit;font:inherit}" +
          ".qol .row{display:flex;flex-wrap:wrap;gap:4px;margin:3px 0}.qol canvas{width:100%;max-width:320px;border-radius:8px;display:block;image-rendering:pixelated}.qol .pics{display:flex;flex-wrap:wrap;gap:6px}.qol .pics img{width:120px;border-radius:6px;display:block}.qol .mono{font-family:var(--mono,monospace)}" +
          ".qol .lbl{font:600 11px var(--mono,monospace);opacity:.6;margin:9px 0 4px}.qol .tally{display:flex;flex-wrap:wrap;gap:4px 10px;font-size:12px}.qol .tally .bad{color:#ff9aa5}.qol .row>span{flex:1 1 140px;min-width:0;overflow-wrap:anywhere}.qol .row .btn{padding:3px 8px}" +
          ".qol .detail{padding:6px 8px;margin:4px 0;border-radius:8px;background:rgba(255,255,255,.06)}.qol .rc{display:flex;gap:8px;align-items:center;padding:6px}.qol .rc .t{flex:1;min-width:0}.qol .need{font-size:12px;opacity:.85}";
        document.head.appendChild(el);
      } catch (e) {}
    }
    setBody("sb-contrast", o.contrast); setBody("sb-huddim", o.hudDim);
  };
  // "just watching": the sky hand is hidden from the smols (and from you), so nothing reacts to it
  function watchHand(game) {
    var h = game.hand; if (!h || h._qolWatch) return;
    try {
      var v = !!h.visible;
      Object.defineProperty(h, "visible", { configurable: true, enumerable: true, get: function () { return Q.on(game, "watching") ? false : v; }, set: function (x) { v = !!x; } });
      Object.defineProperty(h, "_qolWatch", { value: true, enumerable: false });
    } catch (e) {}
  }
  // captions: one line, replaced not stacked, only for sounds that mean something
  Q.CAPTIONS = { grump: "a grump growls", thunder: "thunder", sick: "somebody coughs", hatch: "an egg cracks", chime: "a chime", bonk: "bonk", eureka: "an idea!", achievement: "a little fanfare", whoosh: "whoosh" };
  var capT = {}, capEl = null, capOff = null;
  Q.lastCaption = "";
  Q.caption = function (name) {
    var game = cur(), text = Q.CAPTIONS[name]; if (!game || !text || !Q.on(game, "captions")) return false;
    var now = Date.now(); if (capT[name] && now - capT[name] < 4000) return false;
    capT[name] = now; Q.lastCaption = text;
    try {
      if (typeof document !== "undefined" && document.createElement && document.body && document.body.appendChild) {
        if (!capEl) { capEl = document.createElement("div"); capEl.id = "qol-cap"; document.body.appendChild(capEl); }
        capEl.textContent = "[" + text + "]"; capEl.className = "on";
        clearTimeout(capOff); capOff = setTimeout(function () { if (capEl) capEl.className = ""; }, 2200);
      }
    } catch (e) {}
    return true;
  };
  /* keys: give any of these a key of your own (in a body) */
  Q.ACTIONS = [["use", "e", "do the thing"], ["pick", "f", "pick up"], ["drop", "q", "drop"], ["sleep", "z", "sleep"], ["sniff", "g", "sniff"], ["jump", " ", "jump"], ["rotate", "r", "turn a plan"], ["heal", "h", "eat the best thing"], ["book", "j", "open the book"], ["pin", "p", "pin this spot"]];
  Q.keyOf = function (game, act) { var o = opt(game), k = o.keys && o.keys[act]; if (k) return k; for (var i = 0; i < Q.ACTIONS.length; i++) if (Q.ACTIONS[i][0] === act) return Q.ACTIONS[i][1]; return ""; };
  Q.keyName = function (k) { return k === " " ? "space" : k; };
  Q.FIXED = { w: 1, a: 1, s: 1, d: 1, tab: 1, i: 1, c: 1, b: 1, escape: 1, backspace: 1, shift: 1, x: 1, v: 1, "1": 1, "2": 1, "3": 1, "4": 1, "5": 1, "6": 1, "7": 1, "8": 1, "9": 1 };
  Q.rebind = function (game, act, key) {
    key = String(key || "").toLowerCase();
    var o = opt(game), found = false; Q.ACTIONS.forEach(function (a) { if (a[0] === act) found = true; });
    if (!found) return { ok: false, msg: "" };
    if (!key || Q.FIXED[key]) return { ok: false, msg: "that key is taken by moving, the bag or the hotbar" };
    for (var i = 0; i < Q.ACTIONS.length; i++) if (Q.ACTIONS[i][0] !== act && Q.keyOf(game, Q.ACTIONS[i][0]) === key) return { ok: false, msg: "“" + Q.keyName(key) + "” already does: " + Q.ACTIONS[i][2] };
    if (!o.keys) o.keys = {};
    o.keys[act] = key;
    return { ok: true, msg: Q.keyName(key) + " now does: " + act };
  };
  Q.resetKeys = function (game) { delete opt(game).keys; return true; };
  function doAction(game, c, act) {
    var p = P(), H = SB.PovHud;
    if (act === "use") p.act("ctx");
    else if (act === "pick") p.act("pick");
    else if (act === "drop") p.drop(false);
    else if (act === "sleep") p.sleep();
    else if (act === "sniff") p.sniff();
    else if (act === "jump") p.input.jump = true;
    else if (act === "rotate") { if (p.rotateGhost) p.rotateGhost(); }
    else if (act === "heal") { var r = Q.quickHeal(game, c); if (p.say) p.say(r.msg); }
    else if (act === "book") { ui.page = ui.page || "bag"; if (H && H.openBag) H.openBag("book"); }
    else if (act === "pin") { var r2_ = Q.pin(game, c.x, c.z); if (p.say) p.say(r2_.msg); }
  }
  // the key hook: your own keys first. a default key that you moved somewhere else does nothing any more
  Q.key = function (game, c, key, down) {
    var o = opt(game), i, a;
    for (i = 0; i < Q.ACTIONS.length; i++) {
      a = Q.ACTIONS[i];
      var mineK = Q.keyOf(game, a[0]), moved = o.keys && o.keys[a[0]] && o.keys[a[0]] !== a[1];
      if (key === mineK && (moved || a[0] === "heal" || a[0] === "book" || a[0] === "pin")) { if (down) doAction(game, c, a[0]); return true; }
    }
    for (i = 0; i < Q.ACTIONS.length; i++) { a = Q.ACTIONS[i]; if (key === a[1] && o.keys && o.keys[a[0]] && o.keys[a[0]] !== a[1]) return true; }
    return false;
  };
  /* a gamepad: left stick walks (it presses w a s d for you), right stick looks, the buttons are the buttons */
  var pad = { keys: {}, btn: {}, seen: false };
  var PADKEYS = { 0: "e", 1: "f", 3: "tab", 8: "escape", 9: "j" };
  function sendKey(type, key) { try { window.dispatchEvent(new window.KeyboardEvent(type, { key: key, bubbles: true })); } catch (e) {} }
  function padKey(key, on) { if (!!pad.keys[key] === !!on) return; pad.keys[key] = !!on; sendKey(on ? "keydown" : "keyup", key); }
  Q.padState = function () { return pad; };
  // read one gamepad snapshot ({axes, buttons}); dt in real seconds. split out so a test can feed it one
  Q.padRead = function (game, gp, dt) {
    if (!gp || !gp.axes) return false;
    var ax = gp.axes, b = gp.buttons || [], p = P(), dz = 0.28;
    function down(i) { var x = b[i]; return !!(x && (x.pressed || x.value > 0.5 || x === 1)); }
    pad.seen = true;
    padKey("a", ax[0] < -dz); padKey("d", ax[0] > dz); padKey("w", ax[1] < -dz); padKey("s", ax[1] > dz);
    padKey("shift", down(10));
    if (p && p.active && p.look2 && (Math.abs(ax[2] || 0) > 0.15 || Math.abs(ax[3] || 0) > 0.15)) p.look2((ax[2] || 0) * 900 * dt, (ax[3] || 0) * 500 * dt);
    for (var i in PADKEYS) padKey(PADKEYS[i], down(+i));
    function edge(i) { var d = down(i), was = pad.btn[i]; pad.btn[i] = d; return d && !was; }
    if (p && p.active) {
      if (edge(7) || edge(2)) p.act("use");
      if (p.input) { if (down(7) || down(2)) { p.input.use = true; pad.use = true; } else if (pad.use) { p.input.use = false; pad.use = false; } }
      if (edge(6)) p.act("place");
      if (edge(4)) p.scroll(-1);
      if (edge(5)) p.scroll(1);
      if (edge(12)) { var r = Q.quickHeal(game, p.c); if (p.say) p.say(r.msg); }
    }
    return true;
  };
  function padTick(game, dt) {
    if (Q.on(game, "noPad") || typeof navigator === "undefined" || !navigator.getGamepads) return;
    var list; try { list = navigator.getGamepads(); } catch (e) { return; }
    for (var i = 0; list && i < list.length; i++) if (list[i] && list[i].connected !== false) { Q.padRead(game, list[i], dt); return; }
    if (pad.seen) { pad.seen = false; for (var k in pad.keys) padKey(k, false); }
  }

  /* ================= tips, lore, a debug page ================= */
  Q.TIPS = [
    "tip: a lit fire turns most grumps back.", "tip: star a thing in the book and it can't be dropped by mistake.", "tip: the book's map shows every place a smol has found.",
    "tip: what parents practise, their babies are born better at.", "tip: cooked food fills a belly more than raw.", "tip: pin a spot in the book and the marker will lead you back.",
    "lore: the ark was called Lantern. you are what's left of its light.", "lore: grumps live in the dark between the stars. they hate light.", "lore: three captains broke the ark. each one kept a piece.",
    "lore: the long sleep took everything the smols knew. that's why the brains are smol.", "a smol has never once read a tip.", "somewhere, a smol is trying to eat a rock.", "loading smols. please do not tap the glass.", "now with 100% more brain (still smol)."
  ];
  Q.tip = function (seed) { return Q.TIPS[(seed >>> 0) % Q.TIPS.length]; };
  function watchVeil() {
    try {
      if (typeof document === "undefined" || typeof window.MutationObserver !== "function" || !document.documentElement) return;
      var n = 0;
      new window.MutationObserver(function (list) {
        for (var i = 0; i < list.length; i++) {
          var add = list[i].addedNodes;
          for (var j = 0; add && j < add.length; j++) {
            var el = add[j].nodeType === 3 ? add[j].parentNode : add[j];
            if (!el || el.nodeType !== 1 || el._qolTip) continue;
            var t = el.textContent || "";
            if (t.length > 40 || !/waking the island/.test(t) || el.children.length) continue;
            el._qolTip = 1;
            var d = document.createElement("div"); d._qolTip = 1;
            d.style.cssText = "font-size:.75em;opacity:.8;margin-top:8px;font-weight:400";
            d.textContent = Q.tip(Date.now() + n++);
            el.appendChild(d);
          }
        }
      }).observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {}
  }
  var fps = { t: 0, n: 0, v: 0 };
  Q.debug = function (game, c) {
    var w = game.world, out = [];
    out.push("island " + (SB.worldCode ? SB.worldCode(game.seed) : game.seed) + " · seed " + game.seed);
    out.push("time " + Math.round(game.time) + "s · speed " + game.speed + "× · " + (fps.v ? fps.v + " frames a second" : "frames not counted yet"));
    out.push("smols " + SB.Game.smols(game).length + " · grumps " + SB.Game.grumps(game).length + " · things " + (w.items || []).length + " · buildings " + (w.structures || []).length + " · plants and rocks " + (w.nodes || []).length);
    if (c) out.push("you: x " + r2(c.x) + " z " + r2(c.z) + " · facing " + (Q.facing() || "?") + " · tier " + c.tier);
    out.push("book: " + st(game).pins.length + " pins · " + st(game).log.length + " log lines · " + Q.album().length + " pictures · " + Q.bin().length + " on the shelf");
    return out;
  };
  // a tiny console, for sandbox islands only: give <thing> [n] · heal · sparks <n> · home · day
  Q.console = function (game, c, text) {
    if (!(SB.Game.sandbox && SB.Game.sandbox(game))) return { ok: false, msg: "the console only works on a sandbox island" };
    var a = String(text || "").toLowerCase().trim().split(/\s+/), n = Math.max(1, Math.min(99, parseInt(a[2] || a[1], 10) || 1));
    if (a[0] === "give" && c && KK()[a[1]]) { var left = Sv().add(c, a[1], n); return { ok: left < n, msg: "gave " + (n - left) + " " + label(a[1]) }; }
    if (a[0] === "heal" && c) { c.chem.health = 1; c.chem.hunger = 0.1; return { ok: true, msg: "all better" }; }
    if (a[0] === "sparks") { SB.Game.addSparks(game, n, null); return { ok: true, msg: "+" + n + " ✨" }; }
    if (a[0] === "home" && c) { var h = (SB.Home && SB.Home.get && SB.Home.get(game)) || nestOf(game); c.x = h.x + 1.2; c.z = h.z + 0.8; return { ok: true, msg: "home" }; }
    if (a[0] === "day") return { ok: true, msg: Q.clock(game).text };
    return { ok: false, msg: "try: give berry 5 · heal · sparks 10 · home · day" };
  };

  /* ================= hooks ================= */
  var tT = 0, sT = 0, wrapped = false, hooked = false, lastFest = false, duel = null;
  function wrap() {
    if (wrapped) return; var p = P();
    if (!p || !p.drop) return; wrapped = true;
    // a starred thing can't be dropped with the drop key, or put away with one tap
    var drop0 = p.drop;
    p.drop = function (all) {
      var game = cur(), S = p.state ? p.state() : null, hk = S && S.c ? Sv().heldKind(S.c) : null;
      if (game && hk && Q.starred(game, hk)) { if (p.say) p.say("⭐ " + label(hk) + " is starred. take the star off in the book to drop it"); return null; }
      return drop0.apply(p, arguments);
    };
    if (SB.Home && SB.Home.stash) {
      var stash0 = SB.Home.stash;
      SB.Home.stash = function (game, c, i) { var sl = Sv().inv(c).s[i]; if (sl && Q.starred(game, sl.k)) return { ok: false, msg: "⭐ " + label(sl.k) + " is starred: it stays with you" }; return stash0.apply(SB.Home, arguments); };
    }
    if (SB.Audio && SB.Audio.play) { var play0 = SB.Audio.play; SB.Audio.play = function (name) { try { Q.caption(name); } catch (e) {} return play0.apply(SB.Audio, arguments); }; }
  }
  Q.tick = function (game, dt) {
    if (!game || game.offline) return;
    if (fw.length) fwTick(game);
    if (!game.headless) {
      var now = typeof performance !== "undefined" ? performance.now() : Date.now();
      fps.n++; if (now - fps.t > 1000) { fps.v = Math.round(fps.n * 1000 / (now - (fps.t || now - 1000))); fps.n = 0; fps.t = now; }
      padTick(game, 1 / 60);
      if (photo.want) { photo.want = false; var g = game; if (typeof Promise !== "undefined") Promise.resolve().then(function () { capture(g); }); else setTimeout(function () { capture(g); }, 0); }
    }
    if ((tT -= dt) > 0) return;
    tT = 1;
    wrap();
    chimeTick(game);
    // pinned wishes don't fade
    var f = game.fh;
    if (f && f.wishes) f.wishes.forEach(function (w) { if (w.pin && !w.done) w.t = Math.max(w.t, game.time - 10); });
    var fest = !!(SB.Friends && SB.Friends.fest && SB.Friends.fest(game));
    if (fest && !lastFest) { var fe = SB.Friends.fest(game); Q.fireworks(game, fe.x != null ? fe.x : nestOf(game).x, fe.z != null ? fe.z : nestOf(game).z, 6); }
    lastFest = fest;
    if ((sT -= 1) > 0) return;
    sT = 20;
    Q.apply(game);
    // the body chart: a sample of the smol you are (or your smol) every twenty seconds
    var c = me(game) || mine(game), s = st(game);
    if (c && c.alive) {
      if (!s.chem || s.chem.id !== c.id) s.chem = { id: c.id, h: [], g: [], f: [] };
      s.chem.h.push(r2(c.chem.health == null ? 1 : c.chem.health)); s.chem.g.push(r2(c.chem.glucose || 0)); s.chem.f.push(r2(1 - (c.chem.hunger || 0)));
      ["h", "g", "f"].forEach(function (k) { if (s.chem[k].length > 30) s.chem[k].shift(); });
    }
  };
  Q.hook = function () {
    if (hooked || !SB.bus) return; hooked = true;
    var on = SB.bus.on;
    function ms(name, key, text) { on(name, function (d) { var game = cur(); if (game && d && d.c) Q.milestone(game, d.c, key, typeof text === "function" ? text(d) : text); }); }
    on("note", function (d) { var game = cur(); if (game && d && d.text) Q.logAdd(game, d.text); });
    on("achievement", function (d) { var game = cur(); if (game && d && d.a) Q.logAdd(game, d.a.icon + " " + d.a.name + ": " + d.a.desc); });
    on("dawn", function () { var game = cur(); if (game) { try { Q.sample(game); } catch (e) {} } });
    on("grumpChased", function (d) {
      var game = cur(); if (!game || !d) return;
      var s = st(game), k = Q.beastOf(d.g);
      s.best[k] = (s.best[k] || 0) + 1;
      if (d.c) Q.milestone(game, d.c, "grump", "chased off a first grump");
    });
    on("bossFight", function (d) { var game = cur(); if (!game || !d || !d.boss) return; duel = { id: d.boss.id, name: d.boss.name, t0: game.time, hits: 0, bites: 0 }; });
    on("scoutHit", function (d) { if (duel && d && d.g && d.g.boss) duel.bites++; });
    on("bossBeaten", function (d) {
      var game = cur(); if (!game || !d || !d.boss) return;
      var s = st(game), x = duel && duel.id === d.boss.id ? duel : { id: d.boss.id, name: d.boss.name, t0: game.time, hits: 0, bites: 0 };
      s.duels.push({ id: x.id, name: x.name, d: day(game), hits: x.hits, bites: x.bites, secs: Math.round(game.time - x.t0) });
      if (s.duels.length > 6) s.duels.shift();
      s.best.captain = (s.best.captain || 0) + (d.c ? 0 : 1); // a duel won from the sky still goes in the book
      duel = null;
      Q.fireworks(game, d.x != null ? d.x : nestOf(game).x, d.z != null ? d.z : nestOf(game).z, 8);
      if (d.c) Q.milestone(game, d.c, "boss-" + d.boss.id, "beat " + d.boss.name);
    });
    ms("hatch", "hatched", "hatched");
    ms("learnWord", "word", function (d) { return "learned a first word: " + d.word; });
    ms("ideaLearned", "idea", function (d) { var x = SB.Ideas && SB.Ideas.BY_ID && SB.Ideas.BY_ID[d.id]; return "a first idea: " + (x ? x.name : d.id); });
    ms("eureka", "eureka", function (d) { var x = SB.Ideas && SB.Ideas.BY_ID && SB.Ideas.BY_ID[d.id]; return "thought of " + (x ? x.name : d.id) + " before anyone else"; });
    ms("craft", "made", "made a first thing");
    ms("fish", "fish", "caught a first fish");
    ms("skillUp", "skill", function (d) { return "got better at " + d.id; });
    ms("job", "job", function (d) { return "became a " + d.job; });
    ms("tierUp", "tier", "grew into something new");
    ms("heartFruit", "heart", "ate a heart-fruit");
    ms("chestOpened", "chest", "opened a first chest");
    ms("homeClaimed", "home", "got a home");
    on("partners", function (d) { var game = cur(); if (!game || !d) return; [[d.a, d.b], [d.b, d.a]].forEach(function (p) { if (p[0] && p[1]) Q.milestone(game, p[0], "partner", "paired up with " + p[1].name); }); });
    on("possess", function () { var game = cur(); if (game) Q.apply(game); });
  };

  /* ================= the book: one tab, seven small pages ================= */
  var ui = Q.ui = { page: "bag", q: "", rq: "", cat: "", who: null, mode: "land", info: -1, ask: null, key: null, said: "" };
  var PAGES = [["bag", "🎒 bag"], ["you", "🙂 smol"], ["places", "🧭 places"], ["island", "🏝 island"], ["smols", "👪 smols"], ["recipes", "📒 recipes"], ["more", "⚙ more"]];
  function btn(act, text, arg, off, cls) { return "<button class='btn" + (cls ? " " + cls : "") + "' data-qol='" + act + "'" + (arg != null ? " data-arg='" + esc(arg) + "'" : "") + (off ? " disabled" : "") + ">" + text + "</button>"; }
  function line(text, bad) { return "<div class='line" + (bad ? " bad" : "") + "'>" + text + "</div>"; }
  function lbl(text) { return "<div class='lbl'>" + text + "</div>"; }
  function who(game, c) { var o = ui.who != null ? SB.Game.byId(game, ui.who) : null; return o && o.alive && o.species === "smol" ? o : c || mine(game) || smols(game)[0] || null; }

  function pageBag(game, c, icon) {
    var S = Sv(), v = S.inv(c), hn = S.hotN(c), s = st(game), out = "", home = !chestWhy(game, c), i;
    out += "<div class='row'>" + btn("sort", "🧹 tidy the bag") + btn("heal", "🍎 eat the best thing", null, Q.bestBite(game, c) < 0) + (s.trash ? btn("undo", "↩ out of the bin (" + s.trash.n + " " + esc(label(s.trash.k)) + ")") : "") + "</div>";
    if (SB.Home && SB.Home.has && SB.Home.has(game, "chest")) out += lbl("📦 " + esc(Q.chestName(game)) + (home ? "" : " · walk home to use it")) + "<div class='row'>" + btn("qstack", "quick-stack", null, !home) + btn("deposit", "put everything away", null, !home) + btn("loot", "take everything", null, !home) + btn("sortchest", "tidy it", null, !home) + "</div>" + (home ? "<input type='text' data-qolin='chest' maxlength='20' placeholder='name the chest' value='" + esc(s.chest || "") + "'>" : "");
    out += lbl("tap a thing for its facts · ⭐ starred things are never dropped or put away by mistake") + "<div class='row'>";
    var any = false;
    for (i = 0; i < v.s.length; i++) {
      var sl = v.s[i]; if (!sl || sl.k === "plans") continue; any = true;
      out += "<button class='btn" + (ui.info === i ? " go" : "") + "' data-qol='info' data-arg='" + i + "' style='border-left:3px solid " + Q.RARE[Q.rarity(game, sl.k)][1] + "'>" + (Q.starred(game, sl.k) ? "⭐ " : "") + icon(sl.k, 16) + " " + esc(Q.nameOf(sl)) + (sl.n > 1 ? " ×" + sl.n : "") + "</button>";
    }
    out += (any ? "" : "<span class='help'>your bag is empty</span>") + "</div>";
    var it = ui.info >= 0 ? v.s[ui.info] : null;
    if (it && it.k !== "plans") {
      out += "<div class='detail'><b>" + icon(it.k, 20) + " " + esc(Q.nameOf(it)) + "</b>" + Q.itemInfo(game, it.k, it).map(function (t) { return line(esc(t)); }).join("") + "<div class='row'>" +
        btn("star", Q.starred(game, it.k) ? "take the star off" : "⭐ star it", it.k) + btn("trash", "🗑 bin it", ui.info, Q.starred(game, it.k)) + (S.has(c, "pouch") && it.k !== "pouch" ? btn("tuck", "👝 into the pouch", ui.info) : "") + btn("uses", "what uses this?", it.k) + "</div>" +
        (S.stackOf(it.k) === 1 ? "<input type='text' data-qolin='item' maxlength='20' placeholder='give it a name' value='" + esc(it.nm || "") + "'>" : "") + "</div>";
    }
    var p = Q.pouch(c);
    if (p.length || S.has(c, "pouch")) out += lbl("👝 pouch · " + p.length + " of " + Q.POUCH) + "<div class='row'>" + (p.length ? p.map(function (x, j) { return btn("untuck", icon(x.k, 16) + " " + esc(label(x.k)) + (x.n > 1 ? " ×" + x.n : ""), j); }).join("") : "<span class='help'>tap a small thing above, then “into the pouch”</span>") + "</div>";
    if (hn > 1) out += lbl("hands · remember what you hold, and swap back to it") + "<div class='row'>" + [1, 2, 3].map(function (n) { return btn("lsave", "keep " + n, n) + btn("luse", "use " + n, n, !s.load[n]); }).join("") + "</div>";
    var pt = SB.Loot && SB.Loot.partner ? SB.Loot.partner(game, c) : null;
    if (pt && pt.stall) out += "<div class='row'>" + btn("buyall", "🛒 buy the stall's whole stock") + "</div>";
    return out;
  }
  Q.smolHtml = function (game, o, c, icon) {
    var out = "", B = SB.Body, T = SB.TIERS[o.tier | 0] || SB.TIERS[0], own = o === c, S = Sv(), fv = Q.fever(game, o), bd = Q.bonds(game, o), s = st(game);
    out += lbl(T.icon + " " + esc(o.name) + (o.pron ? " (" + esc(o.pron) + ")" : "") + " · " + esc(T.name) + (SB.STAGES[o.stage] ? " · " + SB.STAGES[o.stage].name : "") + " · " + (o.sex === "f" ? "girl" : "boy") + (o.from ? " · from " + esc(o.from) : ""));
    if (o.letter) out += line("✉ “" + esc(o.letter) + "”");
    out += "<div class='tally'>" + Q.organs(o).map(function (x) { return "<span class='" + (x[3] && x[2] > 0.3 ? "bad" : "") + "'>" + x[0] + " " + x[1] + " " + bar(x[2]) + "</span>"; }).join("") + "</div>";
    out += line("💓 " + Q.pulse(o) + " thumps a minute · 🌡 " + fv.word + " · feeling " + Q.moodWord(game, o));
    if (B && B.status) { var stt = B.status(o, game); if (stt.length) out += line("🩺 " + stt.map(function (x) { return x.e + " " + esc(x.label); }).join(" · ")); }
    if (SB.Powers && o.pw && o.pw.buffs) { var bf = []; for (var id in o.pw.buffs) { var left = o.pw.buffs[id] - game.time; if (left > 0) bf.push(esc(id) + " " + (left > 90 ? Math.round(left / 60) + "m" : Math.round(left) + "s")); } if (bf.length) out += line("✨ " + bf.join(" · ")); }
    out += line("🥚 " + esc(Q.eggLine(game, o)));
    out += line("💛 best friend " + (bd.friend ? esc(bd.friend.name) + " " + bar(bd.fv / 100) : "nobody yet") + " · 💗 " + (bd.love ? esc(bd.love.name) + " " + bar(bd.lv / 100) : "no sweetheart"));
    var jl = Q.jobLine(o); if (jl) out += line(jl);
    if (SB.Orders) out += line("📋 " + esc(Q.rulesText(o)));
    var gear = S.list(o).slice(0, 8).map(function (x) { return icon(x.k, 16) + " " + esc(label(x.k)) + (x.n > 1 ? " ×" + x.n : ""); });
    out += line("🎒 " + (gear.length ? gear.join(" · ") : "carrying nothing"));
    if (s.chem && s.chem.id === o.id && s.chem.h.length > 2) out += line("<span class='mono'>hearts " + spark(s.chem.h) + " · sugar " + spark(s.chem.g) + " · belly " + spark(s.chem.f) + "</span> <small>the last ten minutes</small>");
    var w = Q.wishOf(game, o);
    out += "<div class='row'>" + btn("roster", Q.inRoster(game, o) ? "★ in your family row" : "☆ add to your family row", o.id) + (own ? "" : btn("hop", "👁 step in", o.id)) + btn("carry", "🫳 carry to the fire", o.id) + (w ? btn("wish", w.pin ? "📌 wish pinned" : "📌 pin the wish", o.id) : "") + btn("pron", "said as: " + (o.pron || "name"), o.id) +
      (SB.Orders ? btn("copyr", "copy job rules", o.id) + btn("paster", "paste job rules", o.id, !clip) : "") + btn("shelf", "📚 onto the shelf", o.id) + (own || o === mine(game) ? "" : btn("exile", ui.ask === "exile" + o.id ? "really send " + esc(o.name) + " away?" : "🚪 send away", o.id, false, ui.ask === "exile" + o.id ? "warn" : "")) + "</div>";
    out += "<input type='text' data-qolin='name' data-arg='" + o.id + "' maxlength='24' placeholder='a new name for " + esc(o.name) + "'><input type='text' data-qolin='note' data-arg='" + o.id + "' maxlength='120' placeholder='a note about " + esc(o.name) + "' value='" + esc(o.note || "") + "'>";
    var ch = Q.challenges(o).filter(function (x) { return x.n > 0; });
    if (ch.length) out += lbl("challenges") + "<div class='tally'>" + ch.map(function (x) { return "<span>" + (x.done ? "✅ " : "") + esc(x.text) + " " + x.n + "/" + x.of + "</span>"; }).join("") + "</div>";
    var kn = Q.knows(o);
    if (kn.length) out += lbl("knows " + kn.length + " idea" + (kn.length === 1 ? "" : "s")) + line("<small>" + esc(kn.slice(0, 24).join(" · ")) + (kn.length > 24 ? " …" : "") + "</small>");
    var ml = Q.milestones(o);
    if (ml.length) out += lbl("milestones") + ml.slice(-8).map(function (m) { return line("<small>day " + m[0] + "</small> " + esc(m[2])); }).join("");
    return out;
  };
  function pagePlaces(game, c) {
    var out = "", s = st(game), from = c || nestOf(game), ds = Q.darkShare(game), seen = Q.seenShare(game), pt = Q.pointed();
    out += line("🕑 " + esc(Q.clock(game).text));
    if (c) out += line("🧭 " + esc(Q.coords(game, c).text) + (Q.facing() ? " · facing " + Q.facing() : "")) + line("🌱 " + esc(Q.where(game, c.x, c.z).text));
    out += line((seen != null ? "🗺 " + seen + "% of the island seen · " : "") + (ds ? "🌑 the dark still holds " + ds.pct + "% (" + ds.lifted + " of " + ds.of + " wells lit)" : "") + (Q.secretsLeft(game) ? " · " + Q.secretsLeft(game) + " place" + (Q.secretsLeft(game) === 1 ? "" : "s") + " nobody has found" : ""));
    out += "<canvas data-qolmap width='256' height='256'></canvas><div class='row'>" + [["land", "land"], ["warm", "warmth"], ["danger", "danger"]].map(function (m) { return btn("mode", m[1], m[0], false, ui.mode === m[0] ? "go" : ""); }).join("") + (Q.secretsLeft(game) && s.shown !== Q.secretsLeft(game) ? btn("reveal", "show what's left · " + Q.REVEAL + " ✨") : "") + "</div><small>tap the map to pin a spot</small>";
    out += lbl("pins · " + s.pins.length + " of " + Q.PINS) + "<div class='row'>" + (c ? btn("pinhere", "📍 pin where i stand") : "") + (pt != null ? btn("unpoint", "stop pointing") : "") + "</div>";
    s.pins.forEach(function (p, i) { out += "<div class='row'><span>📍 " + esc(p.n) + " <small>" + away(from, p.x, p.z) + "</small></span>" + btn("point", pt === i ? "pointing" : c ? "point" : "go", i, pt === i) + btn("unpin", "✕", i) + "</div>"; });
    out += lbl("places") + Q.marks(game, c).filter(function (m) { return !m.you && m.pin == null; }).map(function (m) { return "<div class='row'><span>" + m.icon + " " + esc(m.name) + " <small>" + away(from, m.x, m.z) + "</small></span>" + btn("goto", c ? "point" : "go", r2(m.x) + "," + r2(m.z) + "," + m.icon + " " + m.name) + "</div>"; }).join("");
    return out;
  }
  function pageIsland(game, c) {
    var out = "", s = st(game), pf = Q.perfection(game), al = Q.alerts(game), bs = Q.bestiary(game), web = Q.ideasWeb(game), sl = Q.stalls(game), mi = SB.Loot ? SB.Loot.moneyIcon(game) : "🐚";
    out += lbl("calendar") + Q.calendar(game).map(function (x) { return line(x.icon + " " + esc(x.text)); }).join("");
    out += lbl("the town board") + (al.length ? al.map(function (a) { return line(a.icon + " " + esc(a.text), a.bad); }).join("") : line("🙂 nobody needs anything right now"));
    if (sl.length) out += lbl("stalls today") + sl.map(function (x) { return line(x.icon + " " + esc(x.owner ? x.owner.name : "nobody") + ": " + x.n + " " + esc(label(x.kind)) + " for " + x.ask + " " + mi + " · " + (x.stock > 0 ? x.stock + " left" : "sold out")); }).join("");
    out += lbl("how it's going") + line("🏆 " + pf.pct + "% of everything · 🐣 breeder's score " + Q.breeder(game) + " · 💰 wealth " + Q.wealth(game) + " · 🙂 mood " + Q.mood(game) + "% · civ score " + SB.Game.score(game));
    out += "<div class='tally'>" + pf.parts.map(function (p) { return "<span>" + p.icon + " " + p.name + " " + p.n + "/" + p.of + "</span>"; }).join("") + "</div>";
    if (s.hist.length > 1) out += line("<span class='mono'>wealth " + spark(s.hist.map(function (r) { return r[1]; })) + " · mood " + spark(s.hist.map(function (r) { return r[2]; })) + " · smols " + spark(s.hist.map(function (r) { return r[3]; })) + "</span> <small>one mark a day</small>");
    out += lbl("the grump book") + bs.map(function (b) { return line(b.icon + " " + esc(b.name) + (b.n ? " · " + b.n + " chased off" : "") + (b.facts.length ? "<br><small>" + esc(b.facts.join(" ")) + "</small>" : "") + (b.n && b.next > 0 ? " <small>(" + b.next + " more to learn more)</small>" : "")); }).join("");
    if (s.duels.length) out += lbl("duels") + s.duels.map(function (d) { return line("👑 " + esc(d.name) + ", day " + d.d + ": " + d.hits + " hits landed, " + d.bites + " bites taken, " + (d.secs >= 90 ? Math.round(d.secs / 60) + " min" : d.secs + " s")); }).join("");
    out += lbl("ideas · " + web.found + " of " + web.of) + (web.ready.length ? line("ready to be thought of: " + web.ready.slice(0, 8).map(function (x) { return x.icon + " " + esc(x.name); }).join(" · ")) : "") +
      web.waiting.slice(0, 6).map(function (x) { return line("<small>" + x.icon + " " + esc(x.name) + " waits for: " + esc(x.needs.join(", ")) + "</small>"); }).join("");
    var lg = s.log.slice(-14).reverse();
    out += lbl("the news · what would have popped up") + (lg.length ? lg.map(function (x) { return line("<small>day " + x[0] + "</small> " + esc(x[1])); }).join("") : line("<small>nothing yet</small>"));
    if (SB.Days && SB.Days.recap) { try { var rc = SB.Days.recap(game); if (rc && rc.lines && rc.lines.length) out += lbl("today so far") + line(esc(rc.lines.join(" · "))); } catch (e) {} }
    return out;
  }
  function pageSmols(game, c) {
    var out = "", from = c || nestOf(game), ro = Q.roster(game), hits = Q.search(game, ui.q, c), wl = Q.wildlife(game, c), p = P();
    out += lbl("your family row") + (ro.length ? ro.map(function (o) {
      return "<div class='row'><span>" + SB.TIERS[o.tier | 0].icon + " <b>" + esc(o.name) + "</b> <small>" + Q.moodWord(game, o) + " · " + away(from, o.x, o.z) + "</small></span>" + btn("who", "page", o.id) + (o === c ? "" : btn("hop", "👁 step in" + (p && p.cost && p.cost(game, o) ? " · " + p.cost(game, o) + " ✨" : ""), o.id)) + "</div>";
    }).join("") : line("<small>star a smol on its page and it shows here, one tap away</small>"));
    out += lbl("find anything by name") + "<input type='text' data-qolin='q' maxlength='24' placeholder='a smol, a thing, a building, a plant…' value='" + esc(ui.q) + "'>";
    if (ui.q) out += hits.length ? hits.map(function (h, i) { return "<div class='row'><span>" + h.icon + " " + esc(h.name) + " <small>" + esc(h.what) + " · " + h.d + "m</small></span>" + btn("found", c ? "point" : "go", i) + (!c && h.ref ? btn("follow", "follow", i) : "") + (h.ref && h.ref.species === "smol" && !h.ref.stranger ? btn("who", "page", h.ref.id) : "") + "</div>"; }).join("") : line("<small>nothing by that name</small>");
    var all = smols(game);
    out += lbl("everyone · " + all.length) + "<div class='row'>" + all.slice(0, 40).map(function (o) { return btn("who", SB.TIERS[o.tier | 0].icon + " " + esc(o.name), o.id, false, Q.inRoster(game, o) ? "go" : ""); }).join("") + "</div>";
    if (wl.length) out += lbl("wildlife close by") + wl.map(function (x, i) { return "<div class='row'><span>" + x.icon + " " + esc(x.name) + " <small>" + x.d + "m</small></span>" + btn("wild", c ? "point" : "go", i) + (c ? "" : btn("followw", "follow", i)) + "</div>"; }).join("");
    return out;
  }
  function pageRecipes(game, c, icon) {
    var out = "", list = c ? Q.recipes(game, c, ui.rq, ui.cat) : [];
    out += "<input type='text' data-qolin='rq' maxlength='24' placeholder='search: a name, or something it is made from' value='" + esc(ui.rq) + "'><div class='row'>" + [["", "all"]].concat(CATS.map(function (k) { return [k, k]; })).concat([["buildings", "buildings"]]).map(function (k) { return btn("cat", k[1], k[0], false, ui.cat === k[0] ? "go" : ""); }).join("") + "</div><div class='rlist'>";
    if (!c || c.tier < 2) out += "<div class='rc'><div class='t'>recipes take hands: a tool-user and up</div></div>";
    else if (!list.length) out += "<div class='rc'><div class='t'>nothing you know matches. new recipes show as riddles on the make tab</div></div>";
    list.slice(0, 30).forEach(function (r) {
      var need = []; for (var k in r.ins) need.push(icon(k, 16) + " " + r.ins[k] + " " + esc(label(k)));
      if (r.tool) need.push("tool: " + esc(label(r.tool)));
      if (r.at) need.push("by a " + esc(r.at));
      out += "<div class='rc'>" + (r.out ? icon(r.out, 32) : "<span class='big'>" + (r.icon || "🔥") + "</span>") + "<div class='t'>" + esc(r.name) + "<div class='need'>" + need.join(" · ") + "</div></div><button class='btn go' " + (r.build ? "data-build" : "data-make") + "='" + esc(r.id) + "' " + (r.ok ? "" : "disabled") + ">" + (r.build ? "plan" : "make") + "</button></div>";
    });
    return out + "</div>";
  }
  function pageMore(game, c) {
    var out = "", o = opt(game), s = st(game), bin = Q.bin(), al = Q.album(), M = SB.Music;
    out += lbl("options") + "<div class='row'>" + Q.OPTS.map(function (x) { return "<button class='btn" + (o[x[0]] ? " go" : "") + "' data-qol='opt' data-arg='" + x[0] + "' title='" + esc(x[2]) + "'>" + x[1] + (o[x[0]] ? " ✓" : "") + "</button>"; }).join("") + "</div>";
    out += lbl("what pops up · the rest goes to the news on the island page") + "<div class='row'>" + Q.TOASTS.map(function (x) { return btn("mute", (Q.muted(game, x[0]) ? "🔕 " : "🔔 ") + x[1], x[0], false, Q.muted(game, x[0]) ? "" : "go"); }).join("") + "</div>";
    out += lbl("how wide you see, in a body") + "<div class='row'>" + Q.FOVS.map(function (f) { return btn("fov", f[0], f[0], false, Q.fov(game) === f[1] ? "go" : ""); }).join("") + "</div>";
    out += lbl("keys, in a body · tap one, then press the key you want") + "<div class='row'>" + Q.ACTIONS.map(function (a) { return btn("key", (ui.key === a[0] ? "press a key… " : "") + esc(a[2]) + ": " + esc(Q.keyName(Q.keyOf(game, a[0]))), a[0], false, ui.key === a[0] ? "go" : ""); }).join("") + btn("keys0", "back to the usual keys", null, !o.keys) + "</div><small>a gamepad works too: left stick walks, right stick looks, the triggers use and place, the bumpers change what you hold.</small>";
    out += lbl("pictures · kept on this device") + "<div class='row'>" + btn("photo", "📷 photo mode (everything hides; any key brings it back)") + "</div>" + (al.length ? "<div class='pics'>" + al.map(function (a, i) { return "<div><img alt='' src='" + esc(a.src) + "'><small>" + esc(a.n) + ", day " + a.d + "</small> " + btn("unpic", "✕", i) + "</div>"; }).join("") + "</div>" : "");
    out += lbl("the smol shelf · smols kept on this device, for any island") + (c ? "<input type='text' data-qolin='letter' maxlength='140' placeholder='a letter to go with " + esc((who(game, c) || c).name) + " (optional)' value='" + esc(ui.letter || "") + "'><div class='row'>" + btn("shelf", "📚 put " + esc((who(game, c) || c).name) + " on the shelf", (who(game, c) || c).id) + btn("code", "copy the code instead", (who(game, c) || c).id) + "</div>" : "") +
      bin.map(function (b, i) { var x = Q.readSmol(b.code) || {}; return "<div class='row'><span>🧬 " + esc(b.n) + " <small>from " + esc(b.fr || "?") + (x.letter ? " · ✉" : "") + "</small></span>" + btn("bring", "bring in", i) + btn("unbin", "✕", i) + "</div>"; }).join("");
    out += lbl("this island") + "<input type='text' data-qolin='wname' maxlength='40' placeholder='name this island' value='" + esc(game.wname || "") + "'><div class='row'>" + btn("export", "💾 save the island as a file") + "</div>";
    if (c) {
      var why = gamesOk(game, c), j = s.jack;
      out += lbl("shell games · " + (SB.Loot ? SB.Loot.purse(c) + " " + SB.Loot.moneyIcon(game) : "") + " · won " + s.games.won + ", lost " + s.games.lost) + (why ? line("<small>" + esc(why) + "</small>") : "<div class='row'>" + [0, 1, 2].map(function (n) { return btn("toss", "🥥 cup " + (n + 1), n); }).join("") + "</div><div class='row'>" + (j && !j.done ? "<span>you: " + j.me.join(" + ") + " = " + total(j.me) + " · keeper shows " + j.house[0] + "</span>" + btn("jack", "one more", "hit") + btn("jack", "stop there", "stand") : btn("jack", "🐚 twenty-one: deal", "deal")) + "</div>") + (ui.said ? line(esc(ui.said)) : "");
      out += lbl("tunes · the song circle is level " + Q.circleLevel(game)) + "<div class='row'>" + ["drum", "flute"].map(function (k) { return btn("play", PLAY[k].icon + " " + PLAY[k].verb, k, !Sv().has(c, k)); }).join("") + (M && M.heard ? btn("song", "🎵 ask for a song (by a fire)") : "") + btn("chime", "🎐 set a chime stone (2 stone, 1 stick)") + "</div>";
    }
    out += lbl("under the bonnet") + Q.debug(game, c).map(function (t) { return line("<small class='mono'>" + esc(t) + "</small>"); }).join("") + (SB.Game.sandbox && SB.Game.sandbox(game) ? "<input type='text' data-qolin='cmd' maxlength='40' placeholder='sandbox console: give berry 5 · heal · sparks 10 · home'>" : "");
    return out;
  }
  // c may be null (the sky's book: the pages that need a body are left out)
  Q.html = function (game, c, icon) {
    icon = icon || function (k) { var d = KK()[k]; return d && d.emoji ? d.emoji : ""; };
    var pages = PAGES.filter(function (p) { return c || (p[0] !== "bag" && p[0] !== "recipes"); }), ok = false, out;
    pages.forEach(function (p) { if (p[0] === ui.page) ok = true; });
    if (!ok) ui.page = pages[0][0];
    out = "<div class='qol'><div class='pages'>" + pages.map(function (p) { return "<button class='btn" + (p[0] === ui.page ? " on" : "") + "' data-qolpage='" + p[0] + "'>" + (p[0] === ui.page ? p[1] : p[1].split(" ")[0]) + "</button>"; }).join("") + "</div>";
    try {
      if (ui.page === "bag") out += pageBag(game, c, icon);
      else if (ui.page === "you") { var o = who(game, c); out += o ? Q.smolHtml(game, o, c, icon) : line("no smols yet"); }
      else if (ui.page === "places") out += pagePlaces(game, c);
      else if (ui.page === "island") out += pageIsland(game, c);
      else if (ui.page === "smols") out += pageSmols(game, c);
      else if (ui.page === "recipes") out += pageRecipes(game, c, icon);
      else out += pageMore(game, c);
    } catch (e) { out += line("<small>this page tripped over something: " + esc(e && e.message) + "</small>"); }
    return out + "</div>";
  };
  // one place where every button of the book lands. -> {ok, msg} (also what the tests press)
  Q.act = function (game, c, act, arg) {
    var o, i, r = null, s = st(game), hits;
    function smol() { return SB.Game.byId(game, +arg); }
    switch (act) {
      case "sort": return Q.sort(game, c);
      case "heal": return Q.quickHeal(game, c);
      case "undo": return Q.undoTrash(game, c);
      case "qstack": return Q.quickStack(game, c);
      case "deposit": return Q.depositAll(game, c);
      case "loot": return Q.lootAll(game, c);
      case "sortchest": return Q.sortChest(game, c);
      case "info": ui.info = ui.info === +arg ? -1 : +arg; return { ok: true, msg: "" };
      case "star": return { ok: true, msg: Q.star(game, arg) ? "⭐ starred" : "star off" };
      case "trash": r = Q.trash(game, c, +arg); if (r.ok) ui.info = -1; return r;
      case "tuck": r = Q.tuck(game, c, +arg); if (r.ok) ui.info = -1; return r;
      case "untuck": return Q.untuck(game, c, +arg);
      case "uses": ui.page = "recipes"; ui.rq = label(arg); ui.cat = ""; return { ok: true, msg: "" };
      case "lsave": return Q.saveLoadout(game, c, +arg);
      case "luse": return Q.useLoadout(game, c, +arg);
      case "buyall": o = SB.Loot && SB.Loot.partner ? SB.Loot.partner(game, c) : null; return Q.buyAll(game, c, o && o.stall);
      case "mode": ui.mode = arg; return { ok: true, msg: "" };
      case "reveal": return Q.reveal(game);
      case "pinhere": return c ? Q.pin(game, c.x, c.z) : { ok: false, msg: "" };
      case "point": return Q.point(game, +arg);
      case "unpoint": Q.unpoint(); return { ok: true, msg: "" };
      case "unpin": return { ok: Q.unpin(game, +arg), msg: "" };
      case "goto": o = String(arg).split(","); return Q.pointAt(game, +o[0], +o[1], o.slice(2).join(","));
      case "found": hits = Q.search(game, ui.q, c); o = hits[+arg]; return o ? Q.pointAt(game, o.x, o.z, o.icon + " " + o.name) : { ok: false, msg: "" };
      case "wild": hits = Q.wildlife(game, c); o = hits[+arg]; return o ? Q.pointAt(game, o.it.x, o.it.z, o.icon + " " + o.name) : { ok: false, msg: "" };
      case "follow": hits = Q.search(game, ui.q, c); o = hits[+arg]; return { ok: !!(o && o.ref && Q.follow(o.ref)), msg: "" };
      case "followw": hits = Q.wildlife(game, c); o = hits[+arg]; return { ok: !!(o && Q.follow(o.it)), msg: "" };
      case "who": ui.who = +arg; ui.page = "you"; return { ok: true, msg: "" };
      case "roster": o = smol(); return o ? { ok: true, msg: Q.rosterToggle(game, o) ? o.name + " is in your family row" : o.name + " left your family row" } : { ok: false, msg: "" };
      case "hop": return Q.hop(game, smol());
      case "carry": return Q.carry(game, smol());
      case "wish": o = smol(); return o ? Q.lockWish(game, o) : { ok: false, msg: "" };
      case "pron": o = smol(); if (!o) return { ok: false, msg: "" }; Q.nextPron(o); return { ok: true, msg: "" };
      case "copyr": o = smol(); return o ? Q.copyRules(o) : { ok: false, msg: "" };
      case "paster": o = smol(); return o ? Q.pasteRules(o) : { ok: false, msg: "" };
      case "exile": if (ui.ask !== "exile" + arg) { ui.ask = "exile" + arg; return { ok: true, msg: "" }; } ui.ask = null; return Q.exile(game, smol());
      case "shelf": o = smol(); r = o ? Q.binAdd(game, o, ui.letter) : { ok: false, msg: "" }; if (r.ok) ui.letter = ""; return r;
      case "code": o = smol(); if (!o) return { ok: false, msg: "" }; r = Q.packSmol(game, o, ui.letter); try { navigator.clipboard.writeText(r); } catch (e) {} return { ok: true, code: r, msg: "smol code copied" };
      case "bring": o = Q.bin()[+arg]; return o ? Q.bringIn(game, o.code) : { ok: false, msg: "" };
      case "unbin": return { ok: Q.binRemove(+arg), msg: "" };
      case "unpic": return { ok: Q.albumRemove(+arg), msg: "" };
      case "photo": return Q.photo(game);
      case "export": r = Q.exportWorld(game); return r && download(String(Q.worldName(game)).replace(/[^a-z0-9 _-]/gi, "") + ".smolbrains.json", r) ? { ok: true, msg: "💾 saved as a file" } : { ok: false, msg: "this browser wouldn't save a file" };
      case "opt": Q.toggle(game, arg); return { ok: true, msg: "" };
      case "mute": Q.mute(game, arg); return { ok: true, msg: "" };
      case "fov": Q.setFov(game, arg); return { ok: true, msg: "" };
      case "key": ui.key = ui.key === arg ? null : arg; return { ok: true, msg: "" };
      case "keys0": Q.resetKeys(game); ui.key = null; return { ok: true, msg: "the usual keys again" };
      case "cat": ui.cat = arg || ""; return { ok: true, msg: "" };
      case "toss": r = Q.toss(game, c, +arg); ui.said = r.msg; return r;
      case "jack": r = Q.jack(game, c, arg); ui.said = r.msg; return r;
      case "play": return Q.play(game, c, arg);
      case "song": return Q.requestSong(game, c);
      case "chime": return Q.placeChime(game, c);
    }
    return { ok: false, msg: "" };
  };
  // typed things: a name, a note, a search
  Q.typed = function (game, c, what, arg, val) {
    var o;
    if (what === "q") { ui.q = clean(val, 24); return { ok: true, msg: "" }; }
    if (what === "rq") { ui.rq = clean(val, 24); return { ok: true, msg: "" }; }
    if (what === "letter") { ui.letter = clean(val, 140); return { ok: true, msg: "" }; }
    if (what === "chest") { Q.chestName(game, val); return { ok: true, msg: "" }; }
    if (what === "item") return c ? Q.nameItem(c, ui.info, val) : { ok: false, msg: "" };
    if (what === "wname") { Q.worldName(game, val); return { ok: true, msg: val ? "this island is “" + Q.worldName(game) + "” now" : "" }; }
    if (what === "name") { o = SB.Game.byId(game, +arg); return o && clean(val) ? Q.rename(game, o, val) : { ok: false, msg: "" }; }
    if (what === "note") { o = SB.Game.byId(game, +arg); if (o) Q.note(o, val); return { ok: !!o, msg: "" }; }
    if (what === "cmd") return Q.console(game, c, val);
    return { ok: false, msg: "" };
  };
  // the map, drawn (browser only): the island, the cloud over what nobody has seen, a tint, the marks
  Q.drawMap = function (cv, game, c) {
    try {
      var x = cv.getContext("2d"), T = game.world.T, N = T.N, W = cv.width, k = W / N, i, j;
      if (SB.WorldGen && SB.WorldGen.minimap && document.createElement) {
        var b = document.createElement("canvas"); b.width = b.height = N;
        var bx = b.getContext("2d"), img = bx.createImageData(N, N); img.data.set(SB.WorldGen.minimap(T)); bx.putImageData(img, 0, 0);
        x.imageSmoothingEnabled = false; x.drawImage(b, 0, 0, W, W);
      }
      if (ui.mode !== "land") {
        var G = 32, cs = W / G;
        for (j = 0; j < G; j++) for (i = 0; i < G; i++) {
          var wx = (i + 0.5) / G * N, wz = (j + 0.5) / G * N;
          if (SB.World.depthAt(game.world, wx, wz) > 0.3) continue;
          if (ui.mode === "warm") { var t = SB.World.tempAt(game.world, wx, wz); x.fillStyle = "rgba(" + Math.round(255 * c01(t * 1.4)) + ",80," + Math.round(255 * c01(1.2 - t * 1.6)) + ",.55)"; }
          else { var d = Q.dangerAt(game, wx, wz); if (d < 0.08) continue; x.fillStyle = "rgba(255,40,60," + r2(d * 0.7) + ")"; }
          x.fillRect(i * cs, j * cs, cs + 1, cs + 1);
        }
      }
      var seen = game.world.seen, SN = SB.World.SEEN_N;
      if (seen && SN) { var fs = W / SN; x.fillStyle = "rgba(52,48,72,.92)"; for (j = 0; j < SN; j++) for (i = 0; i < SN; i++) if (!seen[j * SN + i]) x.fillRect(i * fs, j * fs, fs + 1, fs + 1); }
      x.font = "14px system-ui,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
      Q.marks(game, c).forEach(function (m) { x.fillText(m.icon, m.x * k, m.z * k); });
    } catch (e) {}
  };
  Q.wire = function (root, game, c, redraw, say) {
    if (!root || !root.querySelectorAll) return;
    if (!styled) Q.apply(game);
    function done(r) { try { if (r && r.msg && say) say(r.msg); if (r && r.ok && r.msg && SB.Audio && SB.Audio.play) SB.Audio.play("pop", 0.4); if (root.isConnected !== false) redraw(); } catch (e) {} }
    root.querySelectorAll("[data-qolpage]").forEach(function (b) { b.addEventListener("click", function () { ui.page = b.getAttribute("data-qolpage"); ui.info = -1; ui.ask = null; redraw(); }); });
    root.querySelectorAll("[data-qol]").forEach(function (b) {
      b.addEventListener("click", function () {
        var act = b.getAttribute("data-qol"), arg = b.getAttribute("data-arg"), r = Q.act(game, c, act, arg);
        if (act === "key" && ui.key) {
          var grab = function (e) { try { window.removeEventListener("keydown", grab, true); e.preventDefault(); e.stopPropagation(); } catch (er) {} var k = String(e.key || "").toLowerCase(), a = ui.key; ui.key = null; done(k === "escape" ? { ok: false, msg: "" } : Q.rebind(game, a, k)); };
          try { window.addEventListener("keydown", grab, true); } catch (e) {}
        }
        if (act === "hop" && r && r.ok) return; // the bag went with the smol you left
        if (act !== "photo") done(r);
      });
    });
    root.querySelectorAll("[data-qolin]").forEach(function (inp) {
      inp.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
      inp.addEventListener("keydown", function (e) { e.stopPropagation(); if (e.key === "Enter") inp.blur(); });
      inp.addEventListener("change", function () { done(Q.typed(game, c, inp.getAttribute("data-qolin"), inp.getAttribute("data-arg"), inp.value)); });
    });
    var cv = root.querySelector("canvas[data-qolmap]");
    if (cv) {
      Q.drawMap(cv, game, c);
      cv.addEventListener("click", function (e) { var r = cv.getBoundingClientRect(), N = game.world.T.N; done(Q.pin(game, (e.clientX - r.left) / r.width * N, (e.clientY - r.top) / r.height * N)); });
    }
  };
  // the sky menu's "📖 book" tab (ui.js calls this with the tab's empty body)
  Q.menu = function (body) {
    var game = cur(); if (!game || !body) return;
    var c = me(game);
    body.innerHTML = Q.html(game, c, null);
    Q.wire(body, game, c, function () { Q.menu(body); }, function (t) { if (SB.UI && SB.UI.toast) SB.UI.toast(esc(t)); });
  };

  /* ================= in a body: the buttons, the chips, the keys ================= */
  Q.options = function (game, c, r, o, x) {
    if (!c) return;
    if (Q.on(game, "autoTool")) { var bi = Q.bestTool(game, c, r); if (bi >= 0) { if (P() && P().active && P().c === c && P().select) P().select(bi); else Sv().select(c, bi); } }
    var hk = x && x.hk, d = PLAY[hk];
    if (d) {
      if (r && r.type === "creature" && r.ref && r.ref.species === "smol" && !o.pick) o.pick = x.op("🎤 a sing-off with " + r.ref.name, function () { var z = Q.singOff(game, c, r.ref); x.say(z.msg); return z.ok; }, null);
      if (!r && !o.use) o.use = x.op(d.icon + " " + d.verb, function () { var z = Q.play(game, c, hk); x.say(z.msg); return z.ok; }, null);
      else if (!o.place) o.place = x.op(d.icon + " " + d.verb, function () { var z = Q.play(game, c, hk); x.say(z.msg); return z.ok; }, null);
    }
    if (r && r.type === "struct" && r.ref) {
      var b = r.ref, ow = Q.ownerOf(game, b);
      // the eyedropper: holding your plans and looking at a finished building plans another like it
      if (hk === "plans" && b.done && !o.pick && P() && P().buildable && P().buildable().some(function (z) { return z.kind === b.kind && z.can; })) o.pick = x.op("plan another " + (SB.STRUCTS[b.kind].label || b.kind), function () { P().startBuild(b.kind); return true; }, null);
      if (ow && !o.pick) o.pick = x.no(ow);
    }
    if (r && r.type === "item" && r.ref && r.ref.kind === "egg" && !o.pick) { var eg = Q.eggHint(game, r.ref); if (eg) o.pick = x.no(eg); }
  };
  // whose it is, for the look-at label
  Q.ownerOf = function (game, b) {
    if (!b) return "";
    if (SB.Home && SB.Home.is && SB.Home.is(game, b)) return "🏠 yours";
    var d = b.data || {}, id = d.owner != null ? d.owner : d.keeper != null ? d.keeper : null, o = id != null ? SB.Game.byId(game, id) : null;
    if (o && o.name) return (b.kind === "stall" ? "🏪 " : "🔑 ") + o.name + "'s";
    if (d.by) return "made by " + d.by;
    if (b.founder) return "built by " + b.founder;
    if (b.builders && b.builders.length) { var f = SB.Game.byId(game, b.builders[0]); if (f && f.name) return "built by " + f.name; }
    return "";
  };
  // what an egg will be like. its sex is the island's own dice, thrown when it hatches
  Q.eggHint = function (game, egg) {
    var d = egg && egg.data; if (!d || !d.genome) return "";
    var parts = [];
    try { var lk = SB.Genome.look ? SB.Genome.look(d.genome) : null; if (lk && lk.hue != null) parts.push(lk.hue < 30 || lk.hue > 330 ? "reddish" : lk.hue < 90 ? "golden" : lk.hue < 170 ? "green" : lk.hue < 260 ? "blue" : "purple"); } catch (e) {}
    if (d.gen) parts.push("generation " + d.gen);
    if (d.parents && d.parents.length) { var ps = d.parents.map(function (id) { var f = game.family && game.family[id]; return f && f.name; }).filter(Boolean); if (ps.length) parts.push("of " + ps.join(" and ")); }
    return parts.length ? "🥚 " + parts.join(" · ") : "";
  };
  Q.vitals = function (game, c) {
    var out = [], p = P(), S = p && p.active && p.state ? p.state() : null;
    if (Q.on(game, "clock")) { var ck = Q.clock(game); out.push({ icon: ck.night ? "🌙" : "🕑", text: (ck.hour < 10 ? "0" : "") + ck.hour + ":" + (ck.min < 10 ? "0" : "") + ck.min }); }
    if (Q.on(game, "heartNum")) out.push({ icon: "❤", text: Math.round((c.chem.health == null ? 1 : c.chem.health) * 10) + "/10", bad: c.chem.health < 0.35 });
    // only while it matters: a ruler while you place a plan, a meter in a raid, a bar on the grump that's after you
    if (S && S.ghost && S.ghost.x != null) { var n = nestOf(game); out.push({ icon: "📏", text: Math.round(SB.dist(c.x, c.z, S.ghost.x, S.ghost.z) * 10) / 10 + "m off · " + Math.round(SB.dist(n.x, n.z, S.ghost.x, S.ghost.z)) + "m from the nest" }); }
    var d = game.dir;
    if (d && d.active && d.active.raiders && d.active.raiders.length) { var rl = Q.raidLeft(game); if (rl.left) out.push({ icon: "👹", text: "raid " + bar(1 - rl.left / rl.of) + " " + rl.left + " left", bad: true }); }
    var g = p && p.active && p.scout ? p.scout() : null;
    if (g && g.alive && !g.boss) { var need = SB.Threats && SB.Threats.whacksNeeded ? SB.Threats.whacksNeeded(g) : 3; out.push({ icon: "👹", text: (Q.beastOf(g) === "grump" ? "grump" : Q.BEASTS.filter(function (b) { return b.id === Q.beastOf(g); })[0].name) + " " + bar(1 - (g.whacked || 0) / need), bad: true }); }
    return out;
  };

  /* ================= things: a drum, a flute, a pouch, the chime stone ================= */
  var K = SB.KINDS, SK = SB.STRUCTS;
  if (K) {
    if (!K.drum) K.drum = { noun: "toy", label: "drum", emoji: "🥁", r: 0.2, color: 0xb9814a, desc: "a log with a skin on it. bang it and everyone close by dances." };
    if (!K.flute) K.flute = { noun: "toy", label: "flute", emoji: "🎶", r: 0.14, color: 0xd9c08a, desc: "a hollow stick with holes. play it and smols stop being bored." };
    if (!K.pouch) K.pouch = { noun: "material", label: "pouch", emoji: "👝", r: 0.14, color: 0xa9825a, mat: 1, desc: "holds four small handfuls of different things in one slot. see the book." };
  }
  if (SK && !SK.chimestone) SK.chimestone = { noun: "wonder", label: "chime stone", emoji: "🎐", r: 0.4, cost: { stone: 2, stick: 1 }, work: 1, desc: "it rings when a smol walks past." };
  var EX = Sv() && Sv().EXTRA;
  if (EX && !EX.some(function (r) { return r.id === "drum"; })) {
    EX.push({ id: "drum", name: "drum", icon: "🥁", in: { log: 1, fur: 1 }, out: "drum", idea: "song", hint: "a log, and something to stretch over it" });
    EX.push({ id: "flute", name: "flute", icon: "🎶", in: { stick: 2, vine: 1 }, out: "flute", idea: "song", hint: "two sticks and something bendy" });
    EX.push({ id: "pouch", name: "pouch", icon: "👝", in: { fiber: 3, vine: 1 }, out: "pouch", idea: "lashing", hint: "fibre and something bendy" });
  }
  var ME = SB.Meshes || SB.ME;
  if (ME && ME.STRUCT_BUILDERS && ME.builder) {
    try {
      ME.STRUCT_BUILDERS.chimestone = function () {
        var b = ME.builder();
        b.color(0x8f8a94).push().translate(0, 0.3, 0).box(0.34, 0.6, 0.3).pop();
        b.color(0xa7a2ad).push().translate(0, 0.66, 0).box(0.46, 0.1, 0.4).pop();
        b.color(0x6fd6e6).push().translate(0.14, 0.48, 0.17).box(0.06, 0.22, 0.03).pop().push().translate(-0.1, 0.44, 0.17).box(0.06, 0.3, 0.03).pop();
        return b.finish();
      };
    } catch (e) {}
  }

  Q.hook();
  if (SB.Ext) {
    SB.Ext.on("tick", function (game, dt) { Q.tick(game, dt); });
    SB.Ext.on("options", function (game, c, r, o, x) { Q.options(game, c, r, o, x); });
    SB.Ext.on("key", function (game, c, key, down) { return Q.key(game, c, key, down); });
    SB.Ext.on("vitals", function (game, c) { return Q.vitals(game, c); });
    SB.Ext.on("damage", function (game, c, g) { if (duel && g && g.boss) duel.hits++; return 1; });
    SB.Ext.tab({ id: "book", label: function () { return "📖 book"; }, show: function () { return true; }, html: Q.html, wire: Q.wire });
  }
  watchVeil();
})();
