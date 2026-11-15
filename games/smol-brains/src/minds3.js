/* smol brains — minds3.js: rules the smols' own minds honour.
   Per smol (plain fields, saved with it): area, diet, treat, hut, jobs (orders.js), route, sorter, study (civ.js),
   board, nav (learned urge for bridges and doors). Per tribe (on the tribe): way, pin (society.js). Per island
   (game.quests.minds3): keep (standing "keep making"), routes, lost (lost and found), eyes, gran1, nomad, remix.
   creature.js, orders.js, civ.js, economy.js, body.js and wilds.js call in here behind a guard, and every call is a
   no-op on an island with no rule set. Never uses game.rng. The controls are lines in the "you" page (wilds.js). */
(function () {
  "use strict";
  var SB = window.SB, Mn = (SB.Minds = {}), V = SB.V, K = SB.KINDS, dist = SB.dist;
  var C = function () { return SB.Creature; }, W = function () { return SB.World; };
  Mn.TREATS = { honey: 1, potion: 1, herb: 1 };
  Mn.DIETS = { meat: ["🍖", "meat", ["meat", "fish", "clam", "cooked"]], bugs: ["🐞", "bugs", ["beetle", "butterfly"]], shrooms: ["🍄", "shrooms", ["shroom", "glowcap"]], sweets: ["🍯", "sweets", ["honey", "berry", "cherry"]] };
  Mn.WAYS = { bugs: ["🐞", "bug-loving", "bug"], shrooms: ["🍄", "shroom-loving", "mushroom"] };
  Mn.TERM = 240;

  function peek(game) { return game && game.quests && game.quests.minds3; }
  function Q(game) {
    var q = game.quests || (game.quests = {}), s = q.minds3;
    if (!s || typeof s !== "object") s = q.minds3 = {};
    if (!Array.isArray(s.keep)) s.keep = [];
    if (!Array.isArray(s.routes)) s.routes = [];
    if (!Array.isArray(s.lost)) s.lost = [];
    return s;
  }
  Mn.state = Q;
  function h01(a, b) { var x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); }
  function smols(game) { return game.creatures.filter(function (c) { return c.alive && c.species === "smol" && !c.stranger; }); }
  function pov() { var P = SB.Possess, s = P && P.state ? P.state() : null; return s && s.c ? s.c : null; }
  function tribeOf(game, c) { return game.tribes && game.tribes[c.tribe || 0]; }
  function homeOf(game, c) { return SB.Society ? SB.Society.home(game, c.tribe || 0) : game.world.T.spawn; }
  function label(k) { return K[k] ? K[k].label : k; }
  function note(game, t) { if (SB.Game && SB.Game.note) SB.Game.note(game, t); }
  function log(game, c, i, t) { if (SB.Social && SB.Social.log) SB.Social.log(game, c, i, t); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (m) { return "&#" + m.charCodeAt(0) + ";"; }); }
  function day(game) { return Math.floor(game.time / SB.DAY_LENGTH); }
  function urgent(c) { var ch = c.chem; return ch.hunger > 0.8 || ch.sick > 0.6 || ch.sleepy > 0.9 || ch.fear > 0.7; }

  /* ---------------- what a smol sees, wants and where it walks (creature.js) ---------------- */
  // null when nothing limits this smol; else fn(x, z, thing) -> may it notice that
  Mn.sees = function (c, game) {
    var q = peek(game), eyes = q && q.eyes, ar = c.area, diet = c.diet, tr = c.treat;
    if (!eyes && !ar && !diet && !tr) return null;
    var ch = c.chem, starving = ch.hunger > 0.85, f = c.facing || 0, fx = Math.sin(f), fz = Math.cos(f);
    return function (x, z, o) {
      var dx = x - c.x, dz = z - c.z, d2 = dx * dx + dz * dz;
      if (eyes && d2 > 9 && dx * fx + dz * fz < -0.17 * Math.sqrt(d2)) return false; // behind it, and too far to hear
      if (starving) return true;
      if (ar && d2 > 4 && dist(x, z, ar.x, ar.z) > ar.r) return false;
      if (o && o.type === "item") {
        if (diet && diet[o.kind]) return false;
        if (tr && (o.noun === "medicine" || Mn.TREATS[o.kind]) && (tr === "never" || (ch.sick < 0.3 && ch.pain < 0.4))) return false;
      }
      return true;
    };
  };
  Mn.wayNoun = function (c, game) { var t = tribeOf(game, c), w = t && t.way && Mn.WAYS[t.way]; return w ? SB.N[w[2]] : -1; };
  Mn.bias = function (c, game, noun, mask, bias) {
    var any = false, t = tribeOf(game, c), w = t && t.way && Mn.WAYS[t.way];
    if (w && noun === w[2] && mask[V.eat] && c.chem.hunger > 0.25) { bias[V.eat] += 0.5; any = true; }
    if (mask[V.make] && Mn.wanted(c, game)) { bias[V.make] += 0.6; any = true; }
    return any;
  };
  Mn.steer = function (c, game, a) {
    if (a.called) return;
    var ar = c.area, t = tribeOf(game, c), n = c.nav, j = h01(c.id, game.time);
    if (ar && dist(a.tx, a.tz, ar.x, ar.z) > ar.r) {
      var an = Math.atan2(a.tx - ar.x, a.tz - ar.z), r = ar.r * (0.3 + 0.6 * j);
      a.tx = ar.x + Math.sin(an) * r; a.tz = ar.z + Math.cos(an) * r;
    } else if (t && t.trek > game.time && dist(c.x, c.z, t.home.x, t.home.z) > 8) {
      a.tx = t.home.x + (j - 0.5) * 6; a.tz = t.home.z + (h01(game.time, c.id) - 0.5) * 6; a.dur = 14; a.why = "to the new nest";
    } else if (n && n.bridge > 0.2 && !a.why && j < n.bridge * 0.5) {
      var b = W().structsNear(game.world, c.x, c.z, 16, function (s) { return s.kind === "bridge" && s.done; })[0];
      if (b && (!ar || dist(b.x, b.z, ar.x, ar.z) < ar.r)) {
        var d = dist(b.x, b.z, c.x, c.z) || 1;
        a.tx = b.x + (b.x - c.x) / d * 3; a.tz = b.z + (b.z - c.z) / d * 3; a.dur = 10; a.why = "over the bridge";
      }
    }
  };
  // jobs it does on its own account, after the sky's orders and before its brain picks
  Mn.think = function (c, game) {
    var q = peek(game), t = tribeOf(game, c), horn = q && q.horn, trek = t && t.trek > game.time;
    if (!c.area && c.route == null && !c.sorter && !c.study && !c.board && !horn && !c.nav && !trek) return false;
    if (c.stranger || c.heldBy || c.convo || urgent(c)) return false;
    var ar = c.area, h = t ? t.home : null;
    if (c.board && board(c, game)) return true;
    if (horn && game.time < horn.t && dist(c.x, c.z, horn.x, horn.z) < 40) {
      if (dist(c.x, c.z, horn.x, horn.z) > 3.5) return C().sendTo(c, horn.x + (h01(c.id, 1) - 0.5) * 4, horn.z + (h01(c.id, 2) - 0.5) * 4, game, 14);
      C().startOn(c, game, V.idle, null); if (c.action) c.action.dur = 2;
      return true;
    }
    if (ar && dist(c.x, c.z, ar.x, ar.z) > ar.r + 1.5) return C().sendTo(c, ar.x + (h01(c.id, 3) - 0.5) * ar.r, ar.z + (h01(c.id, 4) - 0.5) * ar.r, game, 16);
    if (trek && h && !ar && dist(c.x, c.z, h.x, h.z) > 18) return C().sendTo(c, h.x + (h01(c.id, 5) - 0.5) * 6, h.z + (h01(c.id, 6) - 0.5) * 6, game, 25);
    if (c.route != null && q && haul(c, game, q)) return true;
    if (c.sorter && sort(c, game)) return true;
    if (c.study && !game.world.night) {
      var ac = Mn.academy(game, c.study.m);
      if (ac && dist(c.x, c.z, ac.x, ac.z) > 7) return C().sendTo(c, ac.x + (h01(c.id, 7) - 0.5) * 5, ac.z + (h01(c.id, 8) - 0.5) * 5, game, 20);
    }
    if (c.nav && c.nav.door > 0.25 && game.world.weather && game.world.weather.rain > 0.5 && !c.inBed && !(c.action && c.action.called)) {
      var hut = W().structsNear(game.world, c.x, c.z, 20, function (s) { return s.done && (s.kind === "hut" || s.kind === "house"); })[0];
      if (hut && dist(hut.x, hut.z, c.x, c.z) > 2.2 && (!ar || dist(hut.x, hut.z, ar.x, ar.z) < ar.r)) { c._mt && (c._mt.why = "in through the door, out of the rain"); return C().sendTo(c, hut.x, hut.z, game, 12); }
    }
    return false;
  };

  /* ---------------- rules for one smol ---------------- */
  Mn.setArea = function (c, x, z, r) { if (x == null) c.area = null; else c.area = { x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, r: r || 12 }; return c.area; };
  Mn.setDiet = function (c, group, on) {
    var g = Mn.DIETS[group]; if (!g) return false;
    var d = c.diet || {};
    g[2].forEach(function (k) { if (on) d[k] = 1; else delete d[k]; });
    c.diet = Object.keys(d).length ? d : null;
    return true;
  };
  Mn.dietHas = function (c, group) { var g = Mn.DIETS[group]; return !!(g && c.diet && c.diet[g[2][0]]); };
  Mn.setTreat = function (c, v) { c.treat = v === "never" || v === "sick" ? v : null; return c.treat; };
  Mn.forbid = function (game, it, on) { if (!it || !it.data) return false; if (on) it.data.forbid = 1; else delete it.data.forbid; return true; };
  // a named smol in a named hut (creature.js findBed honours c.hut)
  Mn.residents = function (game, st) { return smols(game).filter(function (c) { return c.hut === st.id; }); };
  Mn.house = function (game, c, st) {
    if (!st) { c.hut = null; return true; }
    if (!st.done || (st.kind !== "hut" && st.kind !== "house")) return false;
    c.hut = st.id;
    if (!st.name) st.name = c.name + "'s " + (st.kind === "house" ? "house" : "hut");
    log(game, c, "🏠", "moved into " + st.name);
    SB.bus.emit("housed", { c: c, st: st });
    return true;
  };
  Mn.hutOf = function (game, c) { var s = c.hut != null ? W().structById(game.world, c.hut) : null; return s && s.done ? s : null; };
  // move out: the emptiest other home of its own village. merge: b moves in with a
  Mn.moveOut = function (game, c) {
    var best = null, bn = 1e9;
    game.world.structures.forEach(function (s) {
      if (!s.done || (s.kind !== "hut" && s.kind !== "house") || s.id === c.hut || (s.tribe || 0) !== (c.tribe || 0)) return;
      var n = Mn.residents(game, s).length;
      if (n < bn) { bn = n; best = s; }
    });
    return best ? Mn.house(game, c, best) && best : null;
  };
  Mn.merge = function (game, a, b) { var s = Mn.hutOf(game, a); if (!s || a === b) return false; b.tribe = a.tribe; return Mn.house(game, b, s); };

  /* ---------------- stockpiles: filters and fill order (orders.js) ---------------- */
  function goodOf(k) { return (SB.Economy && SB.Economy.goodOf(k)) || "other"; }
  Mn.zoneOk = function (o, k) { return !o.only || !!(o.only[goodOf(k)] || o.only[k]); };
  Mn.setOnly = function (o, g, on) {
    if (!o || o.kind !== "stock") return false;
    if (g == null) { delete o.only; return true; }
    var m = o.only || {};
    if (on) m[g] = 1; else delete m[g];
    if (Object.keys(m).length) o.only = m; else delete o.only;
    return true;
  };
  Mn.setPri = function (o, p) { if (!o || o.kind !== "stock") return false; if (p) o.pri = p > 0 ? 1 : -1; else delete o.pri; return true; };
  // null when no stockpile has a rule (the old nearest-pile choice stands); else the best pile for this cargo
  Mn.stockFor = function (game, c, goods) {
    var l = game.orders.list, any = false, best = null, bp = -9, bd = 60, i;
    for (i = 0; i < l.length; i++) if (l[i].kind === "stock" && (l[i].only || l[i].pri)) any = true;
    if (!any) return null;
    l.forEach(function (o) {
      if (o.kind !== "stock") return;
      var d = dist(o.x, o.z, c.x, c.z), p = o.pri || 0;
      if (d >= 60) return;
      var g = goods.filter(function (it) { return Mn.zoneOk(o, it.kind); });
      if (g.length && (p > bp || (p === bp && d < bd))) { bp = p; bd = d; best = { z: o, goods: g }; }
    });
    return best || { z: null, goods: [] };
  };
  function grans(game) { return game.world.structures.filter(function (s) { return s.kind === "granary" && s.done; }); }
  // food goes to the granary before the open pile. true when the smol set off for it
  Mn.granFirst = function (c, game, goods) {
    var q = peek(game), v = game.civ;
    if (!q || !q.gran1 || !v) return false;
    var gs = grans(game), g = null, food = goods.filter(function (it) { return K[it.kind].noun === "food"; });
    if (!food.length || !gs.length || (v.granary || 0) >= 30 * gs.length) return false;
    gs.forEach(function (s) { if (!g || dist(s.x, s.z, c.x, c.z) < dist(g.x, g.z, c.x, c.z)) g = s; });
    if (dist(g.x, g.z, c.x, c.z) > 60) return false;
    if (dist(g.x, g.z, c.x, c.z) > 2.8) return C().sendTo(c, g.x + 1.4, g.z + 0.6, game, 20);
    var n = 0;
    food.forEach(function (it) { var m = (it.data && it.data.n) || 1; n += m; C().consume(c, it, game); goods.splice(goods.indexOf(it), 1); });
    v.granary = Math.min(30 * gs.length, (v.granary || 0) + n);
    SB.bus.emit("stockpiled", { c: c, n: n, granary: true });
    return false;
  };

  /* ---------------- "keep making this" ---------------- */
  var cnt = { g: null, t: -9, m: {} };
  Mn.have = function (game, k) {
    if (cnt.g !== game || game.time - cnt.t > 4 || game.time < cnt.t) { cnt.g = game; cnt.t = game.time; cnt.m = {}; }
    if (cnt.m[k] == null) { var n = 0, it = game.world.items; for (var i = 0; i < it.length; i++) if (it[i].kind === k && !it[i].gone) n += (it[i].data && it[i].data.n) || 1; cnt.m[k] = n; }
    return cnt.m[k];
  };
  Mn.keep = function (game, k, n) {
    var q = Q(game);
    q.keep = q.keep.filter(function (o) { return o.k !== k; });
    if (n > 0 && K[k]) q.keep.push({ k: k, n: Math.min(9, n) });
    cnt.t = -9;
    return q.keep;
  };
  // the idea this smol should make next for a standing order, or null
  Mn.wanted = function (c, game) {
    var q = peek(game), I = SB.Ideas;
    if (!q || !q.keep || !q.keep.length || !I || c.tier < 2) return null;
    for (var i = 0; i < q.keep.length; i++) {
      var o = q.keep[i];
      if (Mn.have(game, o.k) >= o.n) continue;
      for (var j = 0; j < I.LIST.length; j++) { var d = I.LIST[j]; if (d.kind === "craft" && !d.pov && d.make.out === o.k && I.known(c, d.id)) return d; }
    }
    return null;
  };
  if (SB.Ideas && SB.Ideas.chooseMake) {
    var cm0 = SB.Ideas.chooseMake;
    SB.Ideas.chooseMake = function (c, game) {
      var d = Mn.wanted(c, game);
      if (!d || !c.ideaQ) return cm0(c, game);
      var old = c.ideaQ[d.id];
      c.ideaQ[d.id] = 6;
      try { return cm0(c, game); } finally { if (old == null) delete c.ideaQ[d.id]; else c.ideaQ[d.id] = old; }
    };
  }

  // a builder fetching what a plan needs passes a forbidden thing by too
  if (SB.Ideas && SB.Ideas.findSource) {
    var fs0 = SB.Ideas.findSource;
    SB.Ideas.findSource = function (c, want, game, R) {
      var r = fs0(c, want, game, R);
      for (var n = 0; r && r.item && r.item.data && r.item.data.forbid && n < 4; n++) { (c.unreach || (c.unreach = {}))[r.item.id] = game.time + 40; r = fs0(c, want, game, R); }
      return r && r.item && r.item.data && r.item.data.forbid ? null : r;
    };
  }

  /* ---------------- stores, hauler routes and the sorter ---------------- */
  // a store is named "z<order id>" (stockpile), "g" (the granary), "c" (your home chest) or "s<building id>" (stall, storehouse)
  function store(game, ref) {
    var t = ref.charAt(0), id = +ref.slice(1), o, b;
    if (t === "z") { o = SB.Orders && SB.Orders.byId(game, id); return o && o.kind === "stock" ? { t: t, o: o, x: o.x, z: o.z, name: "📦 pile" } : null; }
    if (t === "g") { b = grans(game)[0]; return b && game.civ ? { t: t, b: b, x: b.x, z: b.z, name: "🛢 granary" } : null; }
    if (t === "c") { o = SB.Home && SB.Home.get && SB.Home.get(game); return o && SB.Home.has(game, "chest") ? { t: t, x: o.x, z: o.z, name: "🧰 chest" } : null; }
    b = W().structById(game.world, id);
    if (!b || !b.done) return null;
    if (b.kind === "stall" && b.data.good) return { t: "s", b: b, x: b.x, z: b.z, name: "🏪 stall" };
    if (b.kind === "storehouse" && SB.Town && SB.Town.store) return { t: "h", b: b, x: b.x, z: b.z, name: "🏚 storehouse" };
    return null;
  }
  Mn.stores = function (game) {
    var out = [];
    ((game.orders && game.orders.list) || []).forEach(function (o) { if (o.kind === "stock") out.push("z" + o.id); });
    if (store(game, "g")) out.push("g");
    if (store(game, "c")) out.push("c");
    game.world.structures.forEach(function (b) { if (b.done && (b.kind === "stall" || b.kind === "storehouse") && store(game, "s" + b.id)) out.push("s" + b.id); });
    return out;
  };
  Mn.storeName = function (game, ref) { var s = store(game, ref); return s ? s.name : "?"; };
  function slots(game, s) { return s.t === "c" ? SB.Home.chest(game) : SB.Town.store(game, s.b); }
  function accepts(game, s, k) {
    if (s.t === "z") return Mn.zoneOk(s.o, k);
    if (s.t === "g") return K[k] && K[k].noun === "food";
    if (s.t === "s") return goodOf(k) === s.b.data.good;
    return true;
  }
  // does this store hold kind k already (the sorter's "matching chest")
  function holds(game, s, k) {
    if (s.t === "z") { if (s.o.only) return Mn.zoneOk(s.o, k); var f = false; W().itemsNear(game.world, s.x, s.z, s.o.r, function (o) { if (o.kind === k && o.heldBy == null) f = true; }); return f; }
    if (s.t === "g" || s.t === "s") return accepts(game, s, k);
    return slots(game, s).some(function (sl) { return sl && sl.k === k; });
  }
  // take up to n of one kind that `ok` likes out of a store: {k, n} or null. dry: only look
  function takeFrom(game, s, n, ok, dry) {
    var got = null, i, sl;
    if (s.t === "z") {
      var all = [], m = 0;
      W().itemsNear(game.world, s.x, s.z, s.o.r, function (o) { if (o.heldBy == null && !o.gone && !o.reserved && !(o.data && (o.data.forbid || o.data.rotten)) && K[o.kind] && !K[o.kind].critter && ok(o.kind) && (!got || o.kind === got.kind)) { got = o; all.push(o); } });
      if (!got) return null;
      for (i = 0; i < all.length && m < n; i++) {
        var have = (all[i].data && all[i].data.n) || 1, t = Math.min(n - m, have);
        m += t;
        if (!dry) { if (have > t) all[i].data.n = have - t; else W().remove(game.world, all[i]); }
      }
      return { k: got.kind, n: m };
    }
    if (s.t === "g") { if ((game.civ.granary || 0) < 1 || !ok("grain")) return null; m = Math.min(n, Math.floor(game.civ.granary)); if (!dry) game.civ.granary -= m; return { k: "grain", n: m }; }
    if (s.t === "s") { var k = SB.Economy.GOODS[s.b.data.good].kinds[0]; if (!(s.b.data.stock > 1) || !ok(k)) return null; m = Math.min(n, s.b.data.stock - 1); if (!dry) s.b.data.stock -= m; return { k: k, n: m }; }
    var ch = slots(game, s);
    for (i = 0; i < ch.length; i++) { sl = ch[i]; if (sl && sl.k !== "plans" && K[sl.k] && ok(sl.k)) { m = Math.min(n, sl.n); if (!dry) { sl.n -= m; if (sl.n <= 0) ch[i] = null; } return { k: sl.k, n: m }; } }
    return null;
  }
  // put n of k into a store; returns how many did not fit
  function putTo(game, s, k, n) {
    var i, t;
    if (!accepts(game, s, k)) return n;
    if (s.t === "z") { for (i = 0; i < n; i++) { var it = W().add(game.world, game, k, s.x + (h01(game.time, i) - 0.5) * s.o.r, s.z + (h01(i, game.time) - 0.5) * s.o.r, {}); it.data.piled = 1; } s.o.n = (s.o.n || 0) + n; return 0; }
    if (s.t === "g") { t = Math.min(n, Math.max(0, 30 * grans(game).length - (game.civ.granary || 0))); game.civ.granary = (game.civ.granary || 0) + t; return n - t; }
    if (s.t === "s") { t = Math.min(n, Math.max(0, 9 - (s.b.data.stock || 0))); s.b.data.stock = (s.b.data.stock || 0) + t; return n - t; }
    if (s.t === "c") return SB.Home.put(game, k, n);
    var ch = slots(game, s);
    for (i = 0; i < ch.length && n > 0; i++) if (ch[i] && ch[i].k === k && ch[i].n < 8) { t = Math.min(n, 8 - ch[i].n); ch[i].n += t; n -= t; }
    for (i = 0; i < ch.length && n > 0; i++) if (!ch[i]) { t = Math.min(n, 8); ch[i] = { k: k, n: t }; n -= t; }
    return n;
  }
  Mn._put = function (game, ref, k, n) { var s = store(game, ref); return s ? putTo(game, s, k, n) : n; };
  Mn._count = function (game, ref, k) { var s = store(game, ref), n = 0; if (!s) return 0; if (s.t === "g") return game.civ.granary || 0; if (s.t === "s") return s.b.data.stock || 0; if (s.t === "z") { W().itemsNear(game.world, s.x, s.z, s.o.r, function (o) { if (o.kind === k && o.heldBy == null) n += (o.data && o.data.n) || 1; }); return n; } slots(game, s).forEach(function (sl) { if (sl && sl.k === k) n += sl.n; }); return n; };
  Mn.route = function (game, a, b, c) {
    var q = Q(game);
    if (a === b || !store(game, a) || !store(game, b)) return null;
    var r = { id: (q.rid = (q.rid || 0) + 1), a: a, b: b, n: 0 };
    q.routes.push(r);
    if (c) { c.route = r.id; c.load = null; log(game, c, "🚚", "carries from the " + Mn.storeName(game, a).slice(2).trim() + " to the " + Mn.storeName(game, b).slice(2).trim()); }
    return r;
  };
  Mn.unroute = function (game, id) {
    var q = Q(game);
    q.routes = q.routes.filter(function (r) { return r.id !== id; });
    game.creatures.forEach(function (c) { if (c.route === id) { c.route = null; unload(c, game); } });
  };
  Mn.routeOf = function (game, c) { var q = peek(game); if (!q || c.route == null) return null; for (var i = 0; i < q.routes.length; i++) if (q.routes[i].id === c.route) return q.routes[i]; return null; };
  function unload(c, game) { if (c.load && K[c.load.k]) for (var i = 0; i < c.load.n; i++) W().add(game.world, game, c.load.k, c.x + 0.3 * i, c.z + 0.3, {}); c.load = null; c.sortTo = null; }
  function carryTo(c, game, s, r) {
    if (dist(c.x, c.z, s.x, s.z) > 2.6) return C().sendTo(c, s.x + 1.2, s.z + 0.5, game, 25);
    var left = putTo(game, s, c.load.k, c.load.n), moved = c.load.n - left;
    c.load.n = left;
    if (r) r.n = (r.n || 0) + moved;
    if (left > 0) unload(c, game); else c.load = null;
    c.sortTo = null;
    if (moved) { SB.bus.emit("hauled", { c: c, k: s.t, n: moved }); if (SB.Orders) SB.Orders.addTrust(c, 0.002); }
    return false;
  }
  function haul(c, game, q) {
    var r = Mn.routeOf(game, c);
    if (!r) { c.route = null; if (c.load) unload(c, game); return false; }
    var a = store(game, r.a), b = store(game, r.b);
    if (!a || !b) return false;
    if (c.load) return carryTo(c, game, b, r);
    if (c._haulT > game.time) return false;
    var ok = function (k) { return accepts(game, b, k); };
    if (!takeFrom(game, a, 4, ok, true)) { c._haulT = game.time + 12; return false; }
    if (dist(c.x, c.z, a.x, a.z) > 2.6) return C().sendTo(c, a.x + 1.2, a.z + 0.5, game, 25);
    c.load = takeFrom(game, a, 4, ok);
    return !!c.load && carryTo(c, game, b, r);
  }
  // the sorter: files loose things into the store that already holds that kind
  Mn.matchFor = function (game, k) {
    var refs = Mn.stores(game);
    for (var i = 0; i < refs.length; i++) { var s = store(game, refs[i]); if (s && s.t !== "s" && accepts(game, s, k) && holds(game, s, k)) return refs[i]; }
    return null;
  };
  function sort(c, game) {
    if (c.load && c.sortTo) { var s = store(game, c.sortTo); if (!s) { unload(c, game); return false; } return carryTo(c, game, s, null); }
    if (c._haulT > game.time) return false;
    var to = null, it = W().nearestItem(game.world, c.x, c.z, 16, function (o) {
      if (o.heldBy != null || o.gone || o.reserved || !o.data || o.data.piled || o.data.forbid || o.data.rotten || o.hid != null || !K[o.kind] || K[o.kind].critter) return false;
      var m = Mn.matchFor(game, o.kind);
      if (m) to = m;
      return !!m;
    });
    if (!it) { c._haulT = game.time + 10; return false; }
    if (dist(c.x, c.z, it.x, it.z) > 1.6) return C().sendTo(c, it.x, it.z, game, 15);
    c.load = { k: it.kind, n: (it.data && it.data.n) || 1 }; c.sortTo = Mn.matchFor(game, it.kind) || to;
    W().remove(game.world, it);
    c.sorted = (c.sorted || 0) + c.load.n;
    return true;
  }

  /* ---------------- the tribe: food ways, the nest, a second village ---------------- */
  Mn.setWay = function (game, id, way) { var t = game.tribes && game.tribes[id || 0]; if (!t) return false; if (Mn.WAYS[way]) t.way = way; else delete t.way; SB.bus.emit("tribeWay", { tribe: t }); return true; };
  var pend = [];
  SB.bus.on("eat", function (d) {
    var g = SB.Game && SB.Game.current, c = d && d.c, o = d && d.obj;
    if (!g || !c || !o || c.species !== "smol") return;
    var t = tribeOf(g, c), w = t && t.way && Mn.WAYS[t.way];
    if (w && o.noun === w[2]) pend.push(c);
  });
  Mn.moveNest = function (game, c, x, z) {
    var So = SB.Society, id = c ? c.tribe || 0 : 0;
    if (x == null) { x = c.x; z = c.z; }
    if (!So || !So.moveNest || !So.moveNest(game, id, x, z)) return false;
    note(game, "🧺 " + (So.tribe(game, id).name || "the tribe") + " is moving its nest");
    return true;
  };
  Mn.found = function (game, c) {
    var So = SB.Society;
    if (!So || !So.found) return { ok: false, msg: "?" };
    if (game.tribes.length > 1) return { ok: false, msg: "there is a second village already" };
    var all = smols(game), h = So.home(game, 0);
    if (all.length < 8) return { ok: false, msg: "a second village needs eight smols" };
    if (dist(c.x, c.z, h.x, h.z) < 40) return { ok: false, msg: "too close to the first village: walk further out" };
    var movers = all.filter(function (o) { return o !== c && o.stage >= 2 && !o._pov; }).sort(function (a, b) { return dist(a.x, a.z, c.x, c.z) - dist(b.x, b.z, c.x, c.z); }).slice(0, Math.max(2, Math.floor(all.length / 3) - 1));
    var t = So.found(game, c.x, c.z, [c].concat(movers));
    if (!t) return { ok: false, msg: "it needs dry, open ground" };
    Q(game).at = t.id;
    if (SB.Orders && SB.Orders.unlocked(game)) SB.Orders.place(game, "stock", c.x + 3, c.z + 2);
    note(game, "🏕 " + c.name + " and " + movers.length + " more set out to found a second village");
    return { ok: true, t: t, msg: "🏕 a second village starts here" };
  };
  // which village the sky is looking after, and switching
  Mn.at = function (game) { var q = peek(game); return q && q.at && game.tribes[q.at] ? q.at : 0; };
  Mn.switchTo = function (game, id) {
    var t = game.tribes && game.tribes[id];
    if (!t) return false;
    Q(game).at = id;
    if (SB.Render && SB.Render.flyTo && !pov()) SB.Render.flyTo(t.home.x, t.home.z);
    SB.bus.emit("villageSwitch", { tribe: t, x: t.home.x, z: t.home.z });
    return true;
  };
  Mn.other = function (game, c) { return game.tribes && game.tribes.length > 1 ? ((c.tribe || 0) === 0 ? 1 : 0) : -1; };
  Mn.moveTo = function (game, c, id) {
    var t = game.tribes && game.tribes[id];
    if (!t || (c.tribe || 0) === id) return false;
    c.tribe = id; c.hut = null; c.area = null;
    var p = c.partner != null ? SB.Game.byId(game, c.partner) : null;
    if (p && p.alive && p.partner === c.id && !p._pov) { p.tribe = id; p.hut = null; C().sendTo(p, t.home.x + 1, t.home.z + 1, game, 40); }
    if (!c._pov) C().sendTo(c, t.home.x, t.home.z, game, 40);
    log(game, c, "🎒", "moved to " + (t.name || "the other village"));
    SB.bus.emit("movedVillage", { c: c, tribe: t });
    return true;
  };
  // boarding school: a young one lives a day in the other village and brings its ideas home
  Mn.board = function (game, c) {
    var to = Mn.other(game, c);
    if (to < 0) return { ok: false, msg: "there is no other village to send it to" };
    if (c.stage > 2 || c.stage < 1) return { ok: false, msg: "only the young ones go away to school" };
    if (c.board) return { ok: false, msg: c.name + " is away at school already" };
    c.board = { h: c.tribe || 0, t: game.time + SB.DAY_LENGTH };
    c.tribe = to;
    log(game, c, "🎒", "went to school in the other village");
    return { ok: true, msg: "🎒 " + c.name + " is off to school in the other village for a day" };
  };
  function board(c, game) {
    var b = c.board, t = tribeOf(game, c), I = SB.Ideas;
    if (game.time < b.t) {
      if (t && dist(c.x, c.z, t.home.x, t.home.z) > 16) return C().sendTo(c, t.home.x + (h01(c.id, 9) - 0.5) * 6, t.home.z + (h01(c.id, 10) - 0.5) * 6, game, 40);
      return false;
    }
    var got = [];
    if (I) smols(game).forEach(function (a) {
      if ((a.tribe || 0) !== (c.tribe || 0) || a.stage < 3) return;
      for (var id in a.ideas) if (got.length < 3 && a.ideas[id] >= 1 && !I.known(c, id) && I.canHold(c, id)) { for (var n = 0; n < 3 && !I.known(c, id); n++) I.learn(c, id, 1, game, "boarding school"); if (I.known(c, id)) got.push(I.BY_ID[id].name); }
    });
    c.tribe = b.h; c.board = null; c.schooled = (c.schooled || 0) + 1;
    var h = homeOf(game, c);
    if (!c._pov) C().sendTo(c, h.x, h.z, game, 40);
    log(game, c, "🎒", "came home from school" + (got.length ? " knowing " + got.join(", ") : ""));
    note(game, "🎒 " + c.name + " is home from school" + (got.length ? " with new ideas: " + got.join(", ") : ""));
    SB.bus.emit("schooled", { c: c, ideas: got });
    return true;
  }

  /* ---------------- the academy (civ.js runs the terms) ---------------- */
  Mn.academy = function (game, m) {
    return SB.Civ && SB.Civ.academyAt ? SB.Civ.academyAt(game, m) : null;
  };

  /* ---------------- luck ---------------- */
  // one number for a smol, -1..1: today's dice, charms worn, mood, a broken taboo
  Mn.luck = function (c, game) {
    game = game || (SB.Game && SB.Game.current);
    if (!c || !game) return 0;
    var l = (SB.hash(game.seed | 0, c.id | 0, day(game)) - 0.5) * 0.5, q = peek(game);
    if (SB.Wear && SB.Wear.on) SB.Wear.on(c).forEach(function (w) { if (w.place === "charm") l += 0.15; });
    var m = Mn.mood(game, c);
    l += m >= 70 ? 0.1 : m < 30 ? -0.1 : 0;
    if (c.stats && c.stats.taboos) l -= 0.1;
    if (c.degree) l += 0.05;
    if (q && q.luck) l += q.luck;
    return SB.clamp(Math.round(l * 100) / 100, -1, 1);
  };
  // a chance, tilted by luck (for any roll: loot, harvest, traits)
  Mn.lucky = function (c, p, game) { return SB.clamp(p * (1 + 0.5 * Mn.luck(c, game)), 0, 1); };
  Mn.luckWord = function (l) { return l > 0.25 ? "very good" : l > 0.08 ? "good" : l < -0.25 ? "rotten" : l < -0.08 ? "poor" : "so-so"; };
  SB.luck = Mn.luck;

  /* ---------------- mood: prices, and a happy village's travel stone ---------------- */
  Mn.mood = function (game, c) {
    var F = SB.Friends, ch = c && c.chem;
    if (!ch) return 50;
    if (F && F.moodBar) return F.moodBar(game, c);
    return SB.clamp(Math.round(85 - Math.max(ch.hunger || 0, ch.lonely || 0, ch.bored || 0, ch.anger || 0, ch.pain || 0, ch.cold || 0, ch.fear || 0, ch.sick || 0) * 80), 0, 100);
  };
  // a happy keeper asks less, a miserable one more
  Mn.moodMul = function (game, seller) { return seller ? SB.clamp(Math.round((1.2 - Mn.mood(game, seller) * 0.004) * 100) / 100, 0.8, 1.2) : 1; };
  function stones(game) {
    var w = game.world;
    (game.villages || []).forEach(function (v) {
      var n = 0, s = 0;
      W().creaturesNear(w, game, v.x, v.z, 18, function (c) { if (c.alive && c.species === "smol" && !c.stranger) { n++; s += Mn.mood(game, c); } });
      var happy = n >= 3 && s / n >= 65;
      v.joy = SB.clamp((v.joy || 0) + (happy ? 1 : -1), 0, 6);
      var st = v.stone != null ? W().structById(w, v.stone) : null;
      if (st) {
        if (v.joy === 0 && st.data.awake) { st.data.awake = 0; note(game, "🌀 " + v.name + " is glum. its travel stone went dark"); }
        else if (v.joy >= 3 && !st.data.awake) { st.data.awake = 1; note(game, "🌀 " + v.name + " cheered up, and its travel stone is lit again"); }
      } else if (v.joy >= 3 && SB.STRUCTS.poi_waystone) {
        for (var k = 0; k < 8; k++) {
          var a = k / 8 * 6.2832, x = v.x + Math.sin(a) * 4.5, z = v.z + Math.cos(a) * 4.5;
          if (!W().inBounds(w, x, z) || !W().walkable(w, x, z) || W().depthAt(w, x, z) > 0.05 || W().structsNear(w, x, z, 2).length) continue;
          st = { id: SB.Game.newId(game), type: "struct", kind: "poi_waystone", noun: SB.STRUCTS.poi_waystone.noun, x: x, z: z, rot: 0, s: 1, done: true, work: 0, need: {}, tribe: v.tribe || 0, builders: [], data: { awake: 1, raised: 1, happy: v.id }, born: game.time, name: v.name + "'s stone" };
          w.structures.push(st); W().markNode(w, st);
          v.stone = st.id;
          note(game, "🌀 " + v.name + " is so happy it lit a travel stone. step up to it to travel");
          SB.bus.emit("happyStone", { village: v, st: st });
          break;
        }
      }
    });
  }
  Mn._stones = stones;

  /* ---------------- finding someone who died: the alarm ---------------- */
  var bodies = [];
  SB.bus.on("death", function (e) {
    var g = SB.Game && SB.Game.current;
    if (!g || !e || !e.c || e.c.species !== "smol" || e.cause === "old") return;
    bodies.push({ g: g, name: e.c.name, id: e.c.id, x: e.c.x, z: e.c.z, t: g.time });
    if (bodies.length > 6) bodies.shift();
  });
  function alarms(game) {
    for (var i = bodies.length - 1; i >= 0; i--) {
      var b = bodies[i], who = null;
      if (b.g !== game || game.time - b.t > 400 || game.time < b.t) { bodies.splice(i, 1); continue; }
      W().creaturesNear(game.world, game, b.x, b.z, 7, function (c) { if (!who && c.alive && c.species === "smol" && !c.asleep && !c.stranger && c.id !== b.id && c.stage >= 1) who = c; });
      if (who) { bodies.splice(i, 1); Mn.alarm(game, who, b); }
    }
  }
  Mn.alarm = function (game, who, b) {
    var sent = 0, grump = game.creatures.some(function (o) { return o.alive && o.species === "grump" && dist(o.x, o.z, b.x, b.z) < 25; });
    SB.Chem.apply(who.chem, { fear: 0.25 });
    if (!who.far) C().say(who, who.tier >= 3 ? "help! " + b.name + "!" : "!!", game);
    smols(game).forEach(function (c) {
      if (c === who || c.asleep || c.heldBy || c._pov || dist(c.x, c.z, b.x, b.z) > 30) return;
      SB.Chem.apply(c.chem, { fear: 0.12 });
      if (c.stage <= 1 && grump) { var h = W().structsNear(game.world, c.x, c.z, 14, function (s) { return s.done && (s.kind === "hut" || s.kind === "house"); })[0]; if (h) c.hideAt = { x: h.x, z: h.z, t: game.time + 25 }; }
      else if (sent < 3 && c.stage === 3 && (c.job === "guard" || (c.genome && c.genome.genes && c.genome.genes.bravery > 0.6))) { sent++; C().sendTo(c, b.x + sent - 2, b.z + 1, game, 14); }
    });
    if (SB.Social && SB.Social.chronicle) SB.Social.chronicle(game, "🚨", who.name + " found " + b.name + " and raised the alarm");
    note(game, "🚨 " + who.name + " found " + b.name + " and raised the alarm" + (sent ? ". " + sent + " came running" : ""));
    SB.bus.emit("alarm", { c: who, name: b.name, x: b.x, z: b.z, came: sent });
    return sent;
  };
  Mn._bodies = bodies;

  /* ---------------- the horn: a sign's words, read out to everyone ---------------- */
  Mn.signNear = function (game, c) { return W().structsNear(game.world, c.x, c.z, 5, function (s) { return s.kind === "sign" && s.done && s.name; })[0] || null; };
  Mn.horn = function (game, c) {
    var s = Mn.signNear(game, c), q = Q(game);
    if (!s) return { ok: false, msg: "stand by a sign with words on it" };
    if (q.horn && game.time < q.horn.t + 30) return { ok: false, msg: "the horn is still ringing" };
    q.horn = { x: s.x, z: s.z, t: game.time + 25, w: s.name };
    if (SB.Audio && SB.Audio.play && !(SB.Possess && SB.Possess.headless)) SB.Audio.play("chime");
    if (SB.UI && SB.UI.toast) SB.UI.toast("📯 " + esc(s.name), "", 6000);
    SB.bus.emit("horn", { c: c, st: s, text: s.name });
    return { ok: true, msg: "📯 “" + s.name + "”" };
  };

  /* ---------------- lost and found ---------------- */
  SB.bus.on("friendGift", function (d) {
    var g = SB.Game && SB.Game.current, me = pov();
    if (!g || !d || !d.kind || !K[d.kind] || d.where === "in your chest") return;
    var hm = SB.Home && SB.Home.get && SB.Home.get(g), at = hm || (SB.Mine && SB.Mine.get && SB.Mine.get(g)) || d.c;
    if (!at || (me && dist(me.x, me.z, at.x, at.z) < 12)) return; // you were there to get it
    var it = null, its = g.world.items; // dropped this tick, so not in the grid yet: look at the newest few
    for (var i = its.length - 1; i >= Math.max(0, its.length - 40) && !it; i--) if (its[i].kind === d.kind && its[i].heldBy == null && !its[i].gone && dist(its[i].x, its[i].z, at.x + 0.9, at.z + 0.7) < 3) it = its[i];
    if (!it) return;
    if (((it.data && it.data.n) || 1) > 1) it.data.n--; else W().remove(g.world, it);
    Mn.lose(g, d.kind, 1, d.c ? d.c.name : null);
  });
  Mn.lose = function (game, k, n, from) { var q = Q(game); q.lost.push({ k: k, n: n || 1, by: from || null, d: day(game) }); if (q.lost.length > 12) q.lost.shift(); return q.lost.length; };
  Mn.atHome = function (game, c) { var h = homeOf(game, c); return (SB.Home && SB.Home.at && SB.Home.at(game, c)) || dist(c.x, c.z, h.x, h.z) < 10; };
  Mn.claim = function (game, c) {
    var q = Q(game), S = SB.Surv, got = [];
    if (!q.lost.length) return { ok: false, msg: "the lost and found is empty" };
    if (!Mn.atHome(game, c)) return { ok: false, msg: "the lost and found box is at home" };
    q.lost = q.lost.filter(function (e) {
      var left = S && S.add ? S.add(c, e.k, e.n) : (W().add(game.world, game, e.k, c.x + 0.4, c.z + 0.3, {}), 0);
      if (left < e.n) got.push(label(e.k) + (e.by ? " from " + e.by : ""));
      e.n = left;
      return left > 0;
    });
    return got.length ? { ok: true, msg: "📦 you took: " + got.join(", ") } : { ok: false, msg: "your bag is full" };
  };

  /* ---------------- shuffled offering sets (the village's asks, dark.js D.ASKS) ---------------- */
  var asks0 = null, POOL = ["apple", "clam", "log", "flint", "clay", "honey", "grain", "fur", "banana", "reeds", "nutmeat", "carrot", "ore", "shell"];
  Mn.remix = function (game, on) {
    var q = Q(game), A = SB.Dark && SB.Dark.ASKS;
    if (on != null) q.remix = on ? 1 : 0;
    if (!A) return null;
    if (!asks0) asks0 = A.map(function (a) { return a.slice(); });
    var r = SB.rng(((game.seed | 0) ^ 0x51ed) >>> 0), pool = POOL.filter(function (k) { return K[k] && !asks0.some(function (a) { return a[0] === k; }); });
    asks0.forEach(function (a, i) {
      A[i] = a.slice();
      if (q.remix && pool.length) A[i][0] = pool.splice(r.int(pool.length), 1)[0];
    });
    A.length = asks0.length;
    return A;
  };

  /* ---------------- the glowshroom grove: no grump sets foot there (wilds.js W.grove) ---------------- */
  function grove(game) {
    var Wi = SB.Wilds, n = 0;
    if (!Wi || !Wi.grove) return 0;
    game.creatures.forEach(function (g) {
      if (!g.alive || g.species !== "grump" || g.heldBy) return;
      var t = Wi.grove(game, g.x, g.z);
      if (!t) return;
      var d = dist(g.x, g.z, t.x, t.z) || 1;
      C().sendTo(g, g.x + (g.x - t.x) / d * 9, g.z + (g.z - t.z) / d * 9, game, 5);
      n++;
    });
    if (n) SB.bus.emit("groveSafe", { n: n });
    return n;
  }
  Mn._grove = grove;

  /* ---------------- learning the bridges and the doors ---------------- */
  function learnWays(game) {
    var w = game.world, br = w.structures.filter(function (s) { return s.kind === "bridge" && s.done; });
    game.creatures.forEach(function (c) {
      if (!c.alive || c.species !== "smol") return;
      var n = c.nav, on = false, i;
      for (i = 0; i < br.length && !on; i++) if (dist(br[i].x, br[i].z, c.x, c.z) < 1.4) on = true;
      if (on || c.inBed) {
        n = c.nav || (c.nav = { bridge: 0, door: 0 });
        var k = on ? "bridge" : "door", was = n[k] || 0;
        n[k] = Math.min(1, was + 0.06);
        if (was <= 0.2 && n[k] > 0.2) { log(game, c, on ? "🌉" : "🚪", on ? "learned to trust the bridge" : "learned that doors keep the rain out"); SB.bus.emit("navLearned", { c: c, k: k }); }
      }
    });
  }
  Mn._learnWays = learnWays;

  /* ---------------- tick ---------------- */
  var t1 = 0, t5 = 0, t20 = 0, mixed = null;
  Mn.tick = function (game, dt) {
    var i, c;
    if (pend.length) { for (i = 0; i < pend.length; i++) { c = pend[i]; if (c.alive) SB.Chem.apply(c.chem, { toxin: -0.45, pain: -0.3, bored: -0.15, hunger: -0.08 }); } pend.length = 0; }
    t1 += dt; t5 += dt; t20 += dt;
    if (t1 >= 1) { t1 = 0; if (bodies.length) alarms(game); grove(game); var q = peek(game); if (q && q.horn && game.time > q.horn.t + 30) delete q.horn; }
    if (t5 >= 5) {
      t5 = 0; learnWays(game);
      var qq = peek(game), me = pov();
      if (mixed !== game) { mixed = game; if (qq && qq.remix) Mn.remix(game); else if (asks0) Mn.remix(game, 0); }
      if (qq && qq.nomad && me) { var h = homeOf(game, me); if (dist(me.x, me.z, h.x, h.z) > 30 && W().depthAt(game.world, me.x, me.z) < 0.05) Mn.moveNest(game, me); }
    }
    if (t20 >= 20) { t20 = 0; stones(game); }
  };
  if (SB.Ext) SB.Ext.on("tick", Mn.tick);

  /* ---------------- the lines in the "you" page, and what their buttons do ---------------- */
  var op = {};
  function btn(cmd, text, on, dis) { return "<button class='btn" + (on ? " go" : "") + "' data-mn='" + cmd + "'" + (dis ? " disabled" : "") + ">" + text + "</button>"; }
  function row(name, body) { return "<div class='st'><b>" + name + "</b><span style='display:flex;gap:4px;flex-wrap:wrap;align-items:center'>" + body + "</span></div>"; }
  Mn.html = function (game, c) {
    var q = peek(game) || {}, t = tribeOf(game, c) || {}, O = SB.Orders, h = "", s, i, k;
    h += "<div class='sep'></div><details data-mnd='a'" + (op.a ? " open" : "") + "><summary class='lbl'>" + esc(c.name) + "'s rules · kept when you leave</summary>";
    var hut = Mn.hutOf(game, c), nearHut = W().structsNear(game.world, c.x, c.z, 6, function (b) { return b.done && (b.kind === "hut" || b.kind === "house"); })[0];
    s = hut ? esc(hut.name || "a hut") + " " + btn("moveout", "move out") + btn("unhouse", "✕") : "sleeps anywhere ";
    if (nearHut && nearHut !== hut) s += btn("house:" + nearHut.id, "live in " + esc(nearHut.name || "this hut"));
    h += row("🏠 home", s);
    h += row("🧭 area", c.area ? "stays within " + c.area.r + " m of a spot " + btn("area:0", "roam free") : btn("area:12", "stay near here") + btn("area:25", "stay round here (wide)"));
    s = "";
    for (k in Mn.DIETS) s += btn("diet:" + k, Mn.DIETS[k][0] + " no " + Mn.DIETS[k][1], Mn.dietHas(c, k));
    h += row("🍽 food", s);
    h += row("🍯 treats", btn("treat:any", "any time", !c.treat) + btn("treat:sick", "only when poorly", c.treat === "sick") + btn("treat:never", "never", c.treat === "never"));
    if (O && O.queueOf) {
      var jq = O.queueOf(game, c), nm = O.markNear ? O.markNear(game, c, 10) : null;
      s = jq.map(function (m, j) { return "<span>" + (j + 1) + ". " + esc(m.label) + "</span>" + (j ? btn("qup:" + m.id, "▲") : "") + btn("qdel:" + m.id, "✕"); }).join(" ");
      if (nm && (c.jobs || []).indexOf(nm.id) < 0) s += btn("qadd:" + nm.id, "+ " + esc(nm.label) + " here");
      if (s) h += row("📋 jobs", s);
    }
    var refs = Mn.stores(game), r = Mn.routeOf(game, c);
    if (refs.length > 1 || r || c.sorter) {
      s = r ? Mn.storeName(game, r.a) + " → " + Mn.storeName(game, r.b) + " · " + (r.n || 0) + " carried " + btn("unroute", "stop") : "";
      if (!r) for (i = 0; i < refs.length && i < 3; i++) for (k = 0; k < refs.length && k < 4; k++) if (i !== k && refs[i].charAt(0) !== refs[k].charAt(0)) s += btn("route:" + refs[i] + ":" + refs[k], Mn.storeName(game, refs[i]) + " → " + Mn.storeName(game, refs[k]));
      s += btn("sorter", "🗂 sort things into matching stores", !!c.sorter);
      h += row("🚚 carry", s);
    }
    var MJ = SB.Civ && SB.Civ.MAJORS;
    if (MJ && c.tier >= 5 && (c.study || c.degree || Mn.academy(game, "stars") || Mn.academy(game, "law"))) {
      s = c.degree ? "🎓 a degree in " + MJ[c.degree].name : "";
      if (c.study) s += "studying " + MJ[c.study.m].name + " · " + Math.round(c.study.p) + "% " + btn("study:0", "stop");
      else if (!c.degree) for (k in MJ) s += btn("study:" + k, MJ[k].e + " " + MJ[k].name);
      h += row("🎓 academy", s);
    }
    var oth = Mn.other(game, c);
    if (oth >= 0) h += row("🎒 village", (c.board ? "away at school" : (c.stage <= 2 && c.stage >= 1 ? btn("board", "a day at school in the other village") : "") + btn("moveto:" + oth, "move to " + esc(game.tribes[oth].name || "the other village"))));
    h += "<div class='help'>🍀 luck today: " + Mn.luckWord(Mn.luck(c, game)) + "</div></details>";

    h += "<details data-mnd='b'" + (op.b ? " open" : "") + "><summary class='lbl'>the tribe's ways</summary>";
    s = btn("way:none", "anything", !t.way);
    for (k in Mn.WAYS) s += btn("way:" + k, Mn.WAYS[k][0] + " " + Mn.WAYS[k][1], t.way === k);
    h += row("🍽 food way", s);
    h += row("👀 eyes", btn("eyes:0", "all round", !q.eyes) + btn("eyes:1", "only what they face", !!q.eyes));
    h += row("🧺 nest", btn("nest", "move the nest here") + btn("nomad", "the tribe follows me", !!q.nomad) + (game.tribes && game.tribes.length > 1 ? btn("switch", "look after " + esc(game.tribes[Mn.at(game) ? 0 : 1].name || "the other village")) : btn("found", "found a second village here")));
    var zone = O && O.zoneAt ? O.zoneAt(game, c.x, c.z, "stock") : null;
    if (zone) {
      s = btn("only:" + zone.id + ":all", "everything", !zone.only);
      ["food", "fish", "wood", "stone", "tool", "other"].forEach(function (g) { var G = SB.Economy && SB.Economy.GOODS[g]; s += btn("only:" + zone.id + ":" + g, (G ? G.icon : "❔") + " " + (G ? G.name : "the rest"), !!(zone.only && zone.only[g])); });
      s += btn("pri:" + zone.id + ":1", "fill first", zone.pri > 0) + btn("pri:" + zone.id + ":-1", "fill last", zone.pri < 0);
      h += row("📦 this pile", s);
    }
    if (grans(game).length) h += row("🛢 granary", btn("gran1", "food goes here before the piles", !!q.gran1));
    var hk = SB.Ideas && SB.Ideas.heldKind ? SB.Ideas.heldKind(c, game) : null;
    s = (q.keep || []).map(function (o) { return "<span>" + o.n + " " + esc(label(o.k)) + "</span>" + btn("keep:" + o.k + ":0", "✕"); }).join(" ");
    if (hk && !(q.keep || []).some(function (o) { return o.k === hk; })) s += btn("keep:" + hk + ":3", "🔁 keep 3 " + esc(label(hk)) + " made");
    if (s) h += row("🔁 keep making", s);
    var it = W().nearestItem(game.world, c.x, c.z, 2.5, function (o) { return o.heldBy == null && !o.gone && K[o.kind] && !K[o.kind].critter; });
    if (it) h += row("🚫 this " + esc(label(it.kind)), btn("forbid:" + it.id, it.data.forbid ? "forbidden · allow it" : "forbid it: no smol will touch it", !!it.data.forbid));
    if (Mn.signNear(game, c)) h += row("📯 horn", btn("horn", "read the sign out to everyone"));
    if (q.lost && q.lost.length) h += row("📦 lost and found", q.lost.length + (q.lost.length === 1 ? " thing " : " things ") + btn("claim", "take", false, !Mn.atHome(game, c)));
    if (SB.Dark && SB.Dark.ASKS) h += row("🔀 asks", btn("remix", "shuffled offering sets", !!q.remix));
    return h + "</details>";
  };
  // one button press. returns a short line to say (or "")
  Mn.cmd = function (game, c, cmd) {
    var p = String(cmd).split(":"), a = p[1], b = p[2], q = Q(game), O = SB.Orders, w = game.world, r, o;
    switch (p[0]) {
      case "house": return Mn.house(game, c, W().structById(w, +a)) ? "🏠 " + c.name + " lives there now" : "that is not a home";
      case "unhouse": c.hut = null; return "";
      case "moveout": o = Mn.moveOut(game, c); return o ? "🏠 moved to " + o.name : "there is no other home to move to";
      case "area": Mn.setArea(c, +a ? c.x : null, c.z, +a); return +a ? "🧭 " + c.name + " will stay round here" : "";
      case "diet": Mn.setDiet(c, a, !Mn.dietHas(c, a)); return "";
      case "treat": Mn.setTreat(c, a); return "";
      case "qadd": return O.queue(game, c, +a) ? "📋 added to " + c.name + "'s jobs" : "";
      case "qdel": O.unqueue(game, c, +a); return "";
      case "qup": O.bump(c, +a, -1); return "";
      case "route": return Mn.route(game, a, b, c) ? "🚚 " + c.name + " will carry that way" : "";
      case "unroute": if (c.route != null) Mn.unroute(game, c.route); return "";
      case "sorter": c.sorter = c.sorter ? null : 1; if (!c.sorter && c.load) unload(c, game); return "";
      case "study": r = SB.Civ && SB.Civ.enroll ? SB.Civ.enroll(game, c, a === "0" ? null : a) : null; return r ? r.msg : "";
      case "board": return Mn.board(game, c).msg;
      case "moveto": return Mn.moveTo(game, c, +a) ? "🎒 off to the other village" : "";
      case "way": Mn.setWay(game, c.tribe, a); return "";
      case "eyes": q.eyes = +a ? 1 : 0; return "";
      case "nest": return Mn.moveNest(game, c) ? "🧺 the nest moves here. they will come" : "it needs dry ground";
      case "nomad": q.nomad = q.nomad ? 0 : 1; return q.nomad ? "🧺 the tribe will follow you" : "";
      case "found": return Mn.found(game, c).msg;
      case "switch": return Mn.switchTo(game, Mn.at(game) ? 0 : 1) ? "" : "";
      case "only": o = O.byId(game, +a); Mn.setOnly(o, b === "all" ? null : b, !(o && o.only && o.only[b])); return "";
      case "pri": o = O.byId(game, +a); Mn.setPri(o, o && o.pri === +b ? 0 : +b); return "";
      case "gran1": q.gran1 = q.gran1 ? 0 : 1; return "";
      case "keep": Mn.keep(game, a, +b); return +b ? "🔁 the makers will keep " + b + " " + label(a) + " about" : "";
      case "forbid": o = SB.Game.byId(game, +a); Mn.forbid(game, o, !(o && o.data && o.data.forbid)); return o && o.data.forbid ? "🚫 no smol will touch that " + label(o.kind) : "";
      case "horn": return Mn.horn(game, c).msg;
      case "claim": return Mn.claim(game, c).msg;
      case "remix": Mn.remix(game, !q.remix); return q.remix ? "🔀 the village will ask for other things" : "";
    }
    return "";
  };
  Mn.wire = function (root, game, c, redraw) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll("[data-mnd]").forEach(function (el) { el.addEventListener("toggle", function () { op[el.getAttribute("data-mnd")] = !!el.open; }); });
    root.querySelectorAll("[data-mn]").forEach(function (el) {
      el.addEventListener("click", function () {
        var m = Mn.cmd(game, c, el.getAttribute("data-mn"));
        if (m && pov() && SB.Possess.say) SB.Possess.say(m);
        else if (m && SB.UI && SB.UI.toast) SB.UI.toast(esc(m), "", 4000);
        if (redraw) redraw();
      });
    });
  };
})();
