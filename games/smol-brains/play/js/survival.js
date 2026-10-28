/* smol brains — survival.js (v4.4 "first tool")
   The rules of being down there yourself, kept apart from the screen so they can be tested headless:
   - an inventory like every survival game's: a 9-slot hotbar and a bag of stacks (c.inv, saved with the smol)
   - recipes you find by putting things together (stick + vine + rock = a rock-on-a-stick), which teach the
     idea through the ideas web, so the tribe can learn it by watching
   - trees, rocks and ore with hit points: chop, chip, mine, fell, split; stumps and rocks grow back
   - piles (one world item that stands for many), so dropping a bag of sticks can't flood the item cap
   - vines on cliffs, riverbanks, boulders and ruins (never on trees), placed from the seed
   - what a smol you lived as does with the pack you leave it, and what's lost when it dies.
   The god-game AI never takes any of these paths by itself (it doesn't see vines, never "discovers" these
   recipes, and never mines with hit points), so the island paces exactly as before. */
(function () {
  "use strict";
  var SB = window.SB;
  var S = (SB.Surv = {});
  var K = SB.KINDS, NK = SB.NODES, SK = SB.STRUCTS;
  function I() { return SB.Ideas; }
  function W() { return SB.World; }
  function emit(ev, d) { if (SB.bus) SB.bus.emit(ev, d); }

  /* ---------------- inventory ---------------- */

  S.HOT = 9;
  var BAG = [0, 0, 9, 12, 15, 18, 27]; // bag slots by tier (blob, critter, tool-user, tribe, builder, thinker, ascended)
  S.stackOf = function (kind) {
    var d = K[kind];
    if (!d) return 1;
    if (d.tool || d.noun === "fire") return 1;
    if (d.noun === "food" || d.noun === "medicine" || d.noun === "mushroom" || d.noun === "bug") return 12;
    return 24;
  };
  S.stackFor = function (c, kind) { return c.tier < 2 ? Math.min(3, S.stackOf(kind)) : S.stackOf(kind); }; // a mouthful is three
  // blobs and critters carry one thing in their mouth (a blob only small soft things); tool-users get the full hotbar
  S.hotN = function (c) { return c.tier >= 2 ? S.HOT : 1; };
  S.SOFT = { leaves: 1, fiber: 1, fur: 1 }; // what lines a nest
  S.mouthy = function (kind) { return S.edible(kind) || !!S.SOFT[kind] || kind === "seed" || kind === "ball" || kind === "plush" || kind === "nut"; };
  S.bagN = function (c) {
    var n = BAG[Math.min(6, c.tier | 0)] || 0;
    if (n && c.inv && c.inv.s) for (var i = 0; i < c.inv.s.length; i++) if (c.inv.s[i] && c.inv.s[i].k === "basket") { n += 9; break; }
    return n;
  };
  S.cap = function (c) { return S.hotN(c) + S.bagN(c); };
  // why this thing can't go in your pockets ("" = it can)
  S.whyNot = function (c, kind) {
    var d = K[kind];
    if (!d) return "that's not a thing";
    if (kind === "egg") return "eggs need two paws and a warm nest, not a pocket";
    if (d.critter) return "it wriggles out of your paws";
    if (S.cap(c) <= 0) return "a blob has no hands to hold things. eat it, or roll it about";
    if (c.tier < 1 && !S.mouthy(kind)) return "too big for a blob's mouth. nudge it along instead";
    if (d.tool && c.tier < 2) return "you need hands for tools: a tool-user can hold one";
    return "";
  };
  S.inv = function (c) {
    var v = c.inv;
    if (!v || !Array.isArray(v.s)) v = c.inv = { s: [], sel: 0 };
    var cap = S.cap(c);
    while (v.s.length < cap) v.s.push(null);
    if (!(v.sel >= 0 && v.sel < S.hotN(c))) v.sel = 0;
    return v;
  };
  S.TOOL = {
    paws: { wood: 0, stone: 0.34, ore: 0, dmg: 0 },
    primtool: { wood: 1, stone: 1, ore: 0, dmg: 0.5, uses: 40 },
    stoneaxe: { wood: 2, stone: 0.5, ore: 0, dmg: 0.75, uses: 120 },
    stonepick: { wood: 0.5, stone: 2, ore: 1, dmg: 0.75, uses: 120 },
    axe: { wood: 4, stone: 0.5, ore: 0, dmg: 1, uses: 300 },
    hammer: { wood: 0, stone: 1, ore: 1, dmg: 0.4, uses: 200 },
    club: { wood: 0.3, stone: 0.5, ore: 0, dmg: 1, uses: 150 },
    spear: { wood: 0, stone: 0, ore: 0, dmg: 1, uses: 150 },
    blade: { wood: 0.5, stone: 0, ore: 0, dmg: 0.5, uses: 120 },
    pokestick: { wood: 0, stone: 0, ore: 0, dmg: 0.25, uses: 100 },
    torch: { wood: 0, stone: 0, ore: 0, dmg: 0.5, uses: 60 }
  };
  S.uses = function (kind) { return (S.TOOL[kind] && S.TOOL[kind].uses) || 100; };
  S.power = function (kind) { return S.TOOL[kind] || S.TOOL.paws; };

  // put n of a kind into the inventory: onto matching stacks, then the first empty hotbar slot, then the bag.
  // returns how many didn't fit
  S.add = function (c, kind, n, w) {
    n = n == null ? 1 : n;
    if (S.whyNot(c, kind)) return n;
    var v = S.inv(c), cap = S.cap(c), mx = S.stackFor(c, kind), i, t;
    if (mx > 1) for (i = 0; i < cap && n > 0; i++) { var sl = v.s[i]; if (sl && sl.k === kind && sl.n < mx) { t = Math.min(n, mx - sl.n); sl.n += t; n -= t; } }
    for (i = 0; i < cap && n > 0; i++) if (!v.s[i]) {
      t = Math.min(n, mx);
      v.s[i] = { k: kind, n: t };
      if (K[kind].tool) v.s[i].w = w != null ? w : S.uses(kind);
      n -= t;
    }
    return n;
  };
  S.room = function (c, kind) { // how many more of this kind would fit
    if (S.whyNot(c, kind)) return 0;
    var v = S.inv(c), cap = S.cap(c), mx = S.stackFor(c, kind), r = 0;
    for (var i = 0; i < cap; i++) { var sl = v.s[i]; if (!sl) r += mx; else if (sl.k === kind) r += mx - sl.n; }
    return r;
  };
  function matches(kind, want) { return I() ? I().matches(kind, want) : kind === want; }
  S.count = function (c, want, exact) {
    var v = S.inv(c), n = 0;
    for (var i = 0; i < v.s.length; i++) { var sl = v.s[i]; if (sl && (exact ? sl.k === want : matches(sl.k, want))) n += sl.n; }
    return n;
  };
  S.has = function (c, kind) { return S.count(c, kind, true) > 0; };
  // take n of something out (the exact kind first, then whatever else counts for it). returns the kinds taken
  S.take = function (c, want, n) {
    var v = S.inv(c), out = [];
    n = n == null ? 1 : n;
    for (var pass = 0; pass < 2 && n > 0; pass++) {
      for (var i = v.s.length - 1; i >= 0 && n > 0; i--) {
        var sl = v.s[i];
        if (!sl || (pass === 0 ? sl.k !== want : sl.k === want || !matches(sl.k, want))) continue;
        while (sl.n > 0 && n > 0) { sl.n--; n--; out.push(sl.k); }
        if (sl.n <= 0) v.s[i] = null;
      }
    }
    return out;
  };
  S.removeAt = function (c, i, n) {
    var v = S.inv(c), sl = v.s[i];
    if (!sl) return null;
    n = Math.min(n == null ? sl.n : n, sl.n);
    var out = { k: sl.k, n: n, w: sl.w };
    sl.n -= n;
    if (sl.n <= 0) v.s[i] = null;
    return out;
  };
  S.held = function (c) { var v = S.inv(c); return S.hotN(c) ? v.s[v.sel] : null; };
  S.heldKind = function (c) { var h = S.held(c); return h ? h.k : null; };
  S.select = function (c, i) { var v = S.inv(c), hn = S.hotN(c); if (!hn) return; v.sel = ((i % hn) + hn) % hn; };
  // move / swap / merge between two slots (drag and drop, or tap one then the other)
  S.move = function (c, from, to) {
    var v = S.inv(c), a = v.s[from], b = v.s[to];
    if (from === to || from < 0 || to < 0 || from >= v.s.length || to >= v.s.length || !a) return false;
    if (b && b.k === a.k && S.stackOf(a.k) > 1) {
      var t = Math.min(a.n, S.stackOf(a.k) - b.n);
      b.n += t; a.n -= t;
      if (a.n <= 0) v.s[from] = null;
      return true;
    }
    v.s[from] = b; v.s[to] = a;
    return true;
  };
  // half a stack into the first empty slot (right-click / long-press "split")
  S.splitStack = function (c, i) {
    var v = S.inv(c), sl = v.s[i];
    if (!sl || sl.n < 2) return false;
    for (var j = 0; j < S.cap(c); j++) if (!v.s[j]) { var h = Math.floor(sl.n / 2); v.s[j] = { k: sl.k, n: h }; sl.n -= h; return j; }
    return false;
  };
  // a tool wears a little each time it's used; at 0 it breaks
  S.wear = function (c, game, i, amount) {
    var v = S.inv(c), sl = v.s[i];
    if (!sl || !K[sl.k] || !K[sl.k].tool) return false;
    sl.w = (sl.w == null ? S.uses(sl.k) : sl.w) - (amount || 1);
    if (sl.w > 0) return false;
    v.s[i] = null;
    emit("toolBroke", { c: c, kind: sl.k });
    return true;
  };
  // anything past the slots this smol has (it lost its basket, or shrank... it happens) goes on the ground
  S.fit = function (c, game) {
    var v = S.inv(c), cap = S.cap(c), out = [];
    for (var i = cap; i < v.s.length; i++) if (v.s[i]) { var sl = v.s[i]; var left = S.add(c, sl.k, sl.n, sl.w); if (left) { S.spawn(game, sl.k, left, c.x, c.z, { w: sl.w }); out.push(sl.k); } v.s[i] = null; }
    v.s.length = Math.max(cap, 0);
    return out;
  };
  S.list = function (c) { // [{k, n}] of everything carried, merged
    var v = S.inv(c), m = {}, out = [];
    v.s.forEach(function (sl) { if (sl) m[sl.k] = (m[sl.k] || 0) + sl.n; });
    for (var k in m) out.push({ k: k, n: m[k] });
    return out;
  };

  /* ---------------- piles: one world item standing in for many ---------------- */

  // drop n of a kind at x,z: onto a loose pile of the same thing close by if there is one, else a new pile
  S.spawn = function (game, kind, n, x, z, opts) {
    opts = opts || {};
    var w = game.world, pile = null;
    if (!K[kind] || n <= 0) return null;
    function fits(o) { return !pile && o.kind === kind && o.heldBy == null && !o.gone && !o.data.rotten && !K[kind].critter && SB.dist(o.x, o.z, x, z) < 0.9; }
    if (S.stackOf(kind) > 1) {
      SB.World.itemsNear(w, x, z, 0.9, function (o) { if (fits(o)) pile = o; });
      // things dropped this tick aren't in the spatial grid yet: look at the newest few too
      for (var i = w.items.length - 1; i >= Math.max(0, w.items.length - 40) && !pile; i--) if (fits(w.items[i])) pile = w.items[i];
    }
    if (pile) {
      pile.data.n = (pile.data.n || 1) + n; pile.age = Math.min(pile.age, 1);
      if (opts.by != null) pile.data.by = opts.by;
      return pile;
    }
    var o = SB.World.add(w, game, kind, x, z, {}, opts.y);
    if (n > 1) o.data.n = n;
    if (opts.w != null && K[kind].tool) o.data.w = opts.w;
    if (opts.by != null) o.data.by = opts.by;
    if (opts.keep) o.data.keep = 1;
    if (opts.y != null) o.onGround = false;
    return o;
  };
  // take one off the top of a pile (the AI, or the god hand, picks up one thing at a time)
  S.split = function (game, pile) {
    var n = pile.data.n || 1;
    if (n <= 1) { delete pile.data.n; return pile; }
    pile.data.n = n - 1;
    if (pile.data.n <= 1) delete pile.data.n;
    var o = SB.World.add(game.world, game, pile.kind, pile.x, pile.z, {}, pile.y);
    o.rot = pile.rot + 1.3;
    return o;
  };
  S.pileN = function (o) { return (o && o.data && o.data.n) || 1; };
  // pick a whole pile (or as much as fits) up into the inventory. returns how many were taken
  S.pickup = function (c, game, o) {
    if (!o || o.gone || (o.heldBy != null && o.heldBy !== c.id)) return 0;
    if (o.data.rotten) return 0;
    var n = S.pileN(o), left = S.add(c, o.kind, n, o.data.w), took = n - left;
    if (!took) return 0;
    if (left > 0) { o.data.n = left; if (left === 1) delete o.data.n; return took; }
    if (o.heldBy === c.id) SB.Creature.release(c, o);
    if (o.hid != null && SB.Mind && SB.Mind.took) SB.Mind.took(c, o, game);
    SB.World.remove(game.world, o);
    return took;
  };

  /* ---------------- entering and leaving a body ---------------- */

  // what the smol carried as a creature (hand, bag, belt) moves into its inventory
  S.absorb = function (c, game) {
    S.inv(c);
    var ids = [];
    if (c.holding != null) ids.push(c.holding);
    (c.bag || []).forEach(function (id) { ids.push(id); });
    if (c.tool != null) ids.push(c.tool);
    ids.forEach(function (id) {
      var o = SB.Game.byId(game, id);
      if (!o || o.type !== "item") return;
      if (S.whyNot(c, o.kind)) { SB.Creature.release(c, o); o.x = c.x + 0.4; o.z = c.z; o.onGround = false; o.vy = 1; return; }
      var n = S.pileN(o), left = S.add(c, o.kind, n, o.data.w);
      SB.Creature.release(c, o);
      if (left > 0) { o.data.n = left; o.x = c.x + 0.3; o.z = c.z; o.onGround = false; }
      else SB.World.remove(game.world, o);
    });
  };
  // leaving: the body goes back to its brain. its best tool goes on its belt (so the AI uses it), the rest
  // stays in the pack; S.tick lets the smol eat from it and bring materials to the tribe's building sites
  var TOOL_RANK = { axe: 9, stoneaxe: 8, spear: 7, club: 6, stonepick: 5, blade: 5, hammer: 4, pokestick: 3, rod: 3, primtool: 2, torch: 1, cloak: 6, lens: 6, basket: 0, pot: 2 };
  S.release = function (c, game) {
    if (c.tier < 2 || !c.inv) return null;
    var v = S.inv(c), best = -1, bv = -1;
    v.s.forEach(function (sl, i) { if (sl && K[sl.k] && K[sl.k].tool && sl.k !== "basket" && (TOOL_RANK[sl.k] || 0) > bv) { bv = TOOL_RANK[sl.k] || 0; best = i; } });
    if (best < 0 || c.tool != null) return null;
    var sl = S.removeAt(c, best, 1);
    var o = SB.World.add(game.world, game, sl.k, c.x, c.z, sl.w != null ? { w: sl.w } : {});
    SB.Creature.carry(c, o, game, false);
    if (c.holding === o.id && c.tool == null) { c.holding = null; c.tool = o.id; }
    return o;
  };

  /* ---------------- eating ---------------- */

  function addTo(dst, src, mul) { if (!src) return; for (var k in src) dst[k] = (dst[k] || 0) + src[k] * (mul == null ? 1 : mul); }
  S.edible = function (kind) { var d = K[kind]; return !!d && !!d.food && (d.noun === "food" || d.noun === "mushroom" || d.noun === "medicine" || d.noun === "bug") && kind !== "nut"; };
  // eat one of a kind (from the inventory, or straight off the ground: o). same body effects as the AI eating
  S.eat = function (c, game, kind, o) {
    var def = K[kind];
    if (!def || !def.food) return null;
    if (kind === "nut") return { msg: "too hard to bite. crack it with a rock first" };
    var deltas = {}, chem = {}, rotten = !!(o && o.data && o.data.rotten), msg = null;
    if (rotten) { addTo(deltas, def.food, 0.4); addTo(chem, def.chem, 0.5); chem.antigen = 0.25; deltas.pain = 0.2; msg = "yuck! it had gone bad"; }
    else {
      addTo(deltas, def.food); addTo(chem, def.chem);
      if (def.chem && def.chem.toxin) { deltas.pain = (deltas.pain || 0) + 0.3; msg = "that was a bad idea…"; }
      if (def.raw && game.rng.chance(0.35)) { chem.antigen = (chem.antigen || 0) + 0.18; msg = "raw " + def.label + ". your tummy grumbles"; }
    }
    SB.Chem.apply(c.chem, deltas); SB.Chem.apply(c.chem, chem);
    c.stats.eaten = (c.stats.eaten || 0) + 1;
    if (SB.Creature.emote) SB.Creature.emote(c, rotten || (def.chem && def.chem.toxin) ? "sick" : "yum", 1.4);
    if (c.anim) c.anim.mouth = "chew";
    c.foodSpot = { x: c.x, z: c.z };
    emit("eat", { c: c, obj: o || { kind: kind, noun: def.noun, x: c.x, z: c.z, data: {} } });
    if (c.species === "smol") SB.Game.unlock(game, "feed");
    return { ok: true, msg: msg, deltas: deltas };
  };

  /* ---------------- recipes ---------------- */

  // vague words for what's missing, so a close recipe reads as a riddle, not a shopping list
  var VAGUE = { vine: "something bendy", stone: "something hard", stick: "something long and straight", leaves: "something dry and leafy", sharpstone: "something sharp", fiber: "something stringy", flint: "a sharp kind of rock", blade: "a blade", hammer: "a hammerstone", clay: "something squishy", fur: "something soft", metal: "something shiny", crystal: "something glowing" };
  // the fire drill isn't an item: two sticks spun on dry leaves teach fire itself
  S.FIREDRILL = { id: "firedrill", name: "fire drill", icon: "🔥", in: { stick: 2, leaves: 1 }, teaches: "fire", hint: "spin a stick on another stick… on something dry" };
  function recipeOf(d) { return d.id === "firedrill" ? S.FIREDRILL : { id: d.id, name: d.name, icon: d.icon, in: d.make.in, tool: d.make.tool, at: d.make.at, out: d.make.out, d: d }; }
  // every recipe a pair of paws could ever make (the ideas web's crafts, tier 2 and up, plus the fire drill)
  S.allRecipes = function () {
    var out = [];
    I().LIST.forEach(function (d) { if (d.kind === "craft" && d.make && d.tier <= 6) out.push(recipeOf(d)); });
    out.push(S.FIREDRILL);
    return out;
  };
  function haveFor(c, rc) {
    var have = {}, ok = true, lack = [];
    for (var k in rc.in) { var h = Math.min(rc.in[k], S.count(c, k)); have[k] = h; if (h < rc.in[k]) { ok = false; lack.push({ want: k, n: rc.in[k] - h }); } }
    if (rc.tool) { var ht = S.count(c, rc.tool, true) > 0; have["tool:" + rc.tool] = ht ? 1 : 0; if (!ht) { ok = false; lack.push({ want: rc.tool, n: 1, tool: true }); } }
    return { have: have, ok: ok, lack: lack };
  }
  S.nearFire = function (c, game, r) { return !!SB.World.nearestFire(game.world, c.x, c.z, r || 3.2); };
  S.nearKiln = function (c, game) { return SB.World.structsNear(game.world, c.x, c.z, 3.6, function (s) { return s.kind === "kiln" && s.done && s.data.lit; }).length > 0; };
  function stationOk(c, game, rc) { return !rc.at || (rc.at === "fire" ? S.nearFire(c, game) || S.has(c, "torch") : rc.at === "kiln" ? S.nearKiln(c, game) : true); }
  function canHoldIdea(c, id) { return id === "firedrill" ? I().canHold(c, "fire") : I().canHold(c, id); }
  function knowsIdea(c, id) { return id === "firedrill" ? I().known(c, "fire") : I().known(c, id); }
  // what the crafting panel lists: known recipes (with have / lack), and "???" riddles for ones you're close to
  S.recipes = function (c, game) {
    var out = [];
    if (c.tier < 2) return out;
    S.allRecipes().forEach(function (rc) {
      var known = knowsIdea(c, rc.id), hold = canHoldIdea(c, rc.id);
      var h = haveFor(c, rc), st = stationOk(c, game, rc);
      if (known) { out.push({ id: rc.id, rc: rc, known: true, ok: h.ok && st, have: h.have, lack: h.lack, station: st ? null : rc.at }); return; }
      if (!hold) return;
      // close: you're holding at least one of the things it takes (or it's one of the very first tools)
      var any = 0, tot = 0;
      for (var k in rc.in) { tot++; if (h.have[k] > 0) any++; }
      var starter = rc.id === "lashing" || rc.id === "firedrill";
      if (!any && !starter) return;
      var riddle = h.lack.length ? "needs " + h.lack.map(function (l) { return VAGUE[l.want] || "something else"; }).filter(function (x, i, a) { return a.indexOf(x) === i; }).join(" and ") + "…" : "you have everything it takes. try putting them together";
      out.push({ id: rc.id, rc: rc, known: false, ok: false, close: any / Math.max(1, tot), have: h.have, lack: h.lack, riddle: riddle, hint: rc.d ? rc.d.hint : rc.hint });
    });
    out.sort(function (a, b) { return (b.known - a.known) || (b.ok - a.ok) || ((b.close || 0) - (a.close || 0)); });
    return out;
  };
  // which recipe these exact things make (the crafting grid): a multiset match on kinds
  S.match = function (kinds) {
    var bag = {};
    kinds.forEach(function (k) { if (k) bag[k] = (bag[k] || 0) + 1; });
    var list = S.allRecipes();
    for (var i = 0; i < list.length; i++) {
      var rc = list[i], ok = true, used = 0;
      for (var w in rc.in) {
        var n = rc.in[w], got = 0;
        for (var k in bag) if (matches(k, w)) got += bag[k];
        if (got < n) { ok = false; break; }
        used += n;
      }
      if (rc.tool) { if (!bag[rc.tool]) ok = false; else used++; }
      if (ok && used === kinds.filter(Boolean).length) return rc;
    }
    return null;
  };
  // make something (by recipe id), or try a combination (kinds from the crafting grid).
  // returns {ok, out, idea, learned, msg}
  S.craft = function (c, game, id) {
    var rc = id === "firedrill" ? S.FIREDRILL : I().BY_ID[id] && I().BY_ID[id].make ? recipeOf(I().BY_ID[id]) : null;
    if (!rc) return { ok: false, msg: "that's not a recipe" };
    return make(c, game, rc);
  };
  S.combine = function (c, game, kinds) {
    if (c.tier < 2) return { ok: false, msg: "you need hands to put things together" };
    var rc = S.match(kinds);
    if (!rc) return { ok: false, msg: !kinds.filter(Boolean).length ? "put some things in first" : kinds.filter(Boolean).length < 2 ? "nothing happens. maybe with something else?" : "nothing happens. these don't go together… yet" };
    return make(c, game, rc);
  };
  function make(c, game, rc) {
    if (c.tier < 2) return { ok: false, msg: "you need hands to make things" };
    var known = knowsIdea(c, rc.id);
    if (!known && !canHoldIdea(c, rc.id)) {
      var d0 = rc.d || I().BY_ID[rc.teaches];
      return { ok: false, msg: "your brain can't quite see how… (" + (d0 ? SB.TIERS[d0.tier].name + "s" : "a bigger brain") + " might)" };
    }
    var h = haveFor(c, rc);
    if (!h.ok) return { ok: false, msg: "missing " + h.lack.map(function (l) { return l.n + " " + (K[l.want] ? K[l.want].label : l.want); }).join(", ") };
    if (!stationOk(c, game, rc)) return { ok: false, msg: "do this by a " + (rc.at === "kiln" ? "lit kiln" : "fire") };
    // the ingredients go (the tool stays); the fire drill burns one stick and the leaves
    var used = [];
    for (var k in rc.in) used = used.concat(S.take(c, k, rc.id === "firedrill" && k === "stick" ? 1 : rc.in[k]));
    var res = { ok: true, idea: rc.id === "firedrill" ? "fire" : rc.id, used: used, learned: false };
    if (!known) {
      // a eureka in your own paws: the idea goes into this smol's head (a first for the island, or not)
      var iid = res.idea;
      if (!I().known(c, iid)) { if (!game.culture.found[iid]) I().discover(c, iid, game); else I().learn(c, iid, 1, game, "figured out"); }
      res.learned = I().known(c, iid);
      if (rc.id === "firedrill" && I().canHold(c, "campfire") && !I().known(c, "campfire")) I().learn(c, "campfire", 1, game, "figured out");
    }
    if (rc.out) {
      var left = S.add(c, rc.out, 1);
      if (left) S.spawn(game, rc.out, left, c.x + Math.sin(c.facing) * 0.5, c.z + Math.cos(c.facing) * 0.5, { by: c.id });
      res.out = rc.out;
      res.msg = (res.learned ? "you figured something out! " : "") + "made a " + K[rc.out].label;
    } else res.msg = res.learned ? "smoke… then a flame! you know fire now" : "a wisp of smoke. you already know fire";
    // the tribe learns by watching (I.observe nudges every smol within 7 toward the idea)
    I().observe(c, res.idea, game);
    if (res.idea === "fire") I().observe(c, "campfire", game);
    c.stats.crafted = (c.stats.crafted || 0) + 1;
    game.stats.crafted = (game.stats.crafted || 0) + 1;
    I().habit(c, "hands", 2);
    emit("craft", { c: c, id: res.idea, item: rc.out ? { kind: rc.out } : null, pov: true });
    return res;
  }

  /* ---------------- trees, rocks, ore: hit points ---------------- */

  var NOT_TREE = { bush: 1, reeds: 1, herbs: 1, hive: 1, clams: 1, roots: 1, gourds: 1, cactus: 1, shrooms: 1 };
  var ROCKS = { boulder: { item: "stone", left: 6, hp: 1.5 }, redrock: { item: "stone", left: 6, hp: 1.5 }, flintrock: { item: "flint", left: 4, hp: 1.8 }, basalt: { item: "flint", left: 4, hp: 1.8 }, orevein: { item: "ore", left: 3, hp: 2.5, ore: 1 }, vent: { item: "ore", left: 2, hp: 2.5, ore: 1 }, crystals: { item: "crystal", left: 2, hp: 3, ore: 1, crystal: 1 } };
  S.ROCKS = ROCKS;
  S.isTree = function (n) { var d = NK[n.kind]; return !!d && d.noun === "plant" && !NOT_TREE[n.kind]; };
  S.isRock = function (n) { return !!ROCKS[n.kind]; };
  S.treeHP = function (n) {
    var s = n.s || 1;
    if (n.kind === "deadtree") return 3;
    if (n.kind === "bamboo") return 2;
    if (n.kind === "giant" || n.kind === "mangrove") return 9;
    return Math.round(4 + 2 * s);
  };
  S.rockOf = function (n) { return ROCKS[n.kind] || null; };
  S.shrinkOf = function (n) { var r = ROCKS[n.kind]; return r && n.left != null ? 0.45 + 0.55 * n.left / r.left : 1; };
  function fresh(n, game) { // a tree or rock left alone for a while heals its scratches
    if (n.hitT != null && game.time - n.hitT > 40) { n.hp = null; }
    n.hitT = game.time;
  }
  // an animation for render (survival-art.js): shake when hit, topple when felled
  S.anims = [];
  function anim(n, kind, extra) {
    for (var i = 0; i < S.anims.length; i++) if (S.anims[i].n === n && S.anims[i].kind === kind) { S.anims[i].t = 0; return; }
    var a = { n: n, kind: kind, t: 0, dur: kind === "fall" ? 1.6 : 0.3 };
    for (var k in extra || {}) a[k] = extra[k];
    S.anims.push(a);
    if (kind === "shake" && !n._anim) { n._anim = 1; SB.World.markNode(null, n); }
  }
  S.animTick = function (dt) {
    for (var i = S.anims.length - 1; i >= 0; i--) {
      var a = S.anims[i];
      a.t += dt;
      if (a.t >= a.dur) {
        S.anims.splice(i, 1);
        if (a.kind === "shake" && !S.anims.some(function (b) { return b.n === a.n && b.kind === "shake"; })) { a.n._anim = 0; SB.World.markNode(null, a.n); }
        if (a.done) a.done();
      }
    }
  };
  // the tool in hand decides what a hit does. returns {ok, msg, kind:"chop"|"chip"|"mine"|"split"|"shake"|"punch", broke, felled, gave:[kinds]}
  S.hitNode = function (c, game, n, toolKind) {
    var w = game.world, tk = toolKind || "paws", P = S.power(tk), res = { ok: false, gave: [] };
    if (!n || (n.state && n.state !== "ok" && n.state !== "stump")) return res;
    var gy = SB.World.groundY(w, n.x, n.z);
    // a log waiting on a stump: split it
    if (n.state === "stump") {
      if (!n.block) { res.msg = "a stump. put a log on it (right click) and split it"; return res; }
      if (P.wood <= 0) { res.msg = "you need something sharp to split a log"; return res; }
      n.blockHp = (n.blockHp == null ? 2 : n.blockHp) - P.wood;
      res.ok = true; res.kind = "split"; anim(n, "shake");
      if (n.blockHp <= 0) {
        n.block = 0; n.blockHp = null; SB.World.markNode(w, n);
        drop(game, c, n, "plank", 2); drop(game, c, n, "firewood", 1);
        res.gave = ["plank", "plank", "firewood"]; res.msg = "split! 2 planks and some firewood";
        emit("split", { c: c, node: n });
      } else res.msg = "crack…";
      fx(n, gy + 0.3, "wood");
      return res;
    }
    if (S.isTree(n)) {
      if (P.wood <= 0) {
        // paws can't chop: they shake. sometimes something falls out
        var o = SB.World.shake(w, game, n, false);
        res.ok = true; res.kind = "shake"; anim(n, "shake");
        res.msg = o ? "something fell out!" : tk === "paws" ? "you shake the " + NK[n.kind].label + ". your paws can't chop wood: you need a tool" : "that's no good for chopping";
        if (o) { o.data.by = c.id; }
        return res;
      }
      fresh(n, game);
      if (n.hp == null) n.hp = S.treeHP(n);
      n.hp -= P.wood;
      res.ok = true; res.kind = "chop"; anim(n, "shake");
      fx(n, gy + 0.9, "wood");
      if (n.hp > 0) { res.msg = "thok"; return res; }
      res.felled = true; res.msg = "timber!";
      S.fell(c, game, n);
      return res;
    }
    var rk = ROCKS[n.kind];
    if (rk) {
      var pw = rk.ore ? P.ore : P.stone;
      if (rk.ore && tk === "hammer" && c.tier < 4) pw = 0; // a hammerstone mines ore for builders, as it always did
      if (rk.crystal && tk === "stonepick" && c.tier < 4) pw = 0;
      if (pw <= 0) { res.msg = rk.crystal ? "too hard: it needs a pick (and a builder's know-how)" : rk.ore ? "the ore is locked in the rock: you need a stone pick" : "ow!"; if (!rk.ore && tk === "paws") res.kind = "punch"; return res; }
      fresh(n, game);
      if (n.left == null) n.left = rk.left;
      if (n.hp == null) n.hp = rk.hp;
      n.hp -= pw;
      res.ok = true; res.kind = rk.ore ? "mine" : "chip"; anim(n, "shake");
      fx(n, gy + 0.4, rk.ore ? "ore" : "stone");
      if (tk === "paws") { SB.Chem.apply(c.chem, { pain: 0.025 }); res.msg = "ow. it chips… slowly. a tool would help"; }
      while (n.hp <= 0 && n.left > 0) {
        n.hp += rk.hp; n.left--;
        drop(game, c, n, rk.item, 1); res.gave.push(rk.item);
        SB.World.markNode(w, n);
      }
      if (res.gave.length) res.msg = "a " + K[rk.item].label + " broke off!";
      else if (!res.msg) res.msg = rk.ore ? "tink" : "tok";
      if (n.left <= 0) { n.state = "gone"; n.regrowT = 1500; n.hp = null; SB.World.markNode(w, n); res.gone = true; res.msg = "the " + NK[n.kind].label + " crumbled away"; emit("rockGone", { c: c, node: n }); }
      return res;
    }
    res.msg = "nothing to chop here";
    return res;
  };
  // a tree comes down: it topples (render), leaves a stump, and logs, sticks, leaves (and maybe a sapling) land where it fell
  S.fell = function (c, game, n) {
    var w = game.world, a = Math.atan2(n.x - c.x, n.z - c.z);
    n.hp = null; n.chop = 0;
    var kind = n.kind, s = n.s || 1, len = 1.6 * s;
    anim(n, "fall", { dir: a, key: "n:" + kind + ":" + (n.id % 3), s: s, rot: n.rot, x: n.x, z: n.z, y: SB.World.groundY(w, n.x, n.z) - 0.04 });
    n.state = "stump"; n.regrowT = 900; SB.World.markNode(w, n);
    var fx0 = n.x + Math.sin(a) * len, fz0 = n.z + Math.cos(a) * len, gave = [];
    var logs = kind === "deadtree" ? 1 : kind === "bamboo" ? 0 : kind === "giant" || kind === "mangrove" ? 4 : 2 + (s > 1.05 ? 1 : 0);
    var sticks = kind === "bamboo" ? 4 : 2, leaves = kind === "deadtree" ? 0 : 2;
    function put(k, nn, d) { if (nn > 0) { var o = S.spawn(game, k, nn, n.x + Math.sin(a) * d + Math.cos(a) * 0.3, n.z + Math.cos(a) * d - Math.sin(a) * 0.3, { by: c.id }); if (o) { o.vy = 2; o.onGround = false; } for (var q = 0; q < nn; q++) gave.push(k); } }
    put("log", logs, len * 0.5); put("stick", sticks, len * 0.8); put("leaves", leaves, len);
    if (kind === "bamboo") put("fiber", 1, len);
    if (kind !== "deadtree" && kind !== "bamboo" && game.rng.chance(0.4)) put("sapling", 1, len * 1.1);
    I().habit(c, "hands", 2);
    emit("chop", { c: c, node: n, pov: true });
    void fx0; void fz0;
    return gave;
  };
  function drop(game, c, n, kind, cnt) {
    var a = Math.atan2(c.x - n.x, c.z - n.z) + (Math.random() - 0.5) * 0.8, r = (NK[n.kind] ? NK[n.kind].r : 0.4) * (n.s || 1) + 0.3;
    var o = S.spawn(game, kind, cnt, n.x + Math.sin(a) * r, n.z + Math.cos(a) * r, { by: c.id });
    if (o) { o.vy = 2.2; o.vx = Math.sin(a) * 0.8; o.vz = Math.cos(a) * 0.8; o.onGround = false; o.y = SB.World.groundY(game.world, o.x, o.z) + 0.4; }
    return o;
  }
  function fx(n, y, what) {
    if (!SB.FX || !SB.FX.burst) return;
    var col = what === "wood" ? [0.62, 0.42, 0.24] : what === "ore" ? [0.9, 0.55, 0.25] : [0.68, 0.66, 0.7];
    SB.FX.burst("crumbs", n.x, y, n.z, 7, { col: col });
    if (what === "wood" && S.isTree(n) && n.state === "ok") SB.FX.burst("leaves", n.x, y + 1.2, n.z, 3);
  }
  // put a log on a stump to split it
  S.setBlock = function (c, game, n) {
    if (!n || n.state !== "stump" || n.block) return false;
    if (!S.take(c, "log", 1).length) return false;
    n.block = 1; n.blockHp = 2; SB.World.markNode(game.world, n);
    return true;
  };
  // gathering by hand (F): vines pulled, sticks snapped off, a rock prised loose, reeds pulled for fibre...
  // returns {kind, secs} for what it would give, or null
  S.gatherOf = function (c, game, n) {
    if (!n) return null;
    if (n.kind === "vines") return n.state === "ok" ? { kind: "vine", secs: 1.1, verb: "pull a vine" } : null;
    if (n.state !== "ok") return null;
    var rk = ROCKS[n.kind];
    if (rk && !rk.ore) return { kind: rk.item, secs: 1.6, verb: "prise a " + K[rk.item].label + " loose" };
    if (S.isTree(n) && n.kind !== "shroomtree") return { kind: "stick", secs: 1.0, verb: "snap off a stick" };
    var g = I() && I().GATHER[n.kind];
    if (g && c.tier >= Math.max(0, g[3]) && !g[1] && !rk) return { kind: g[0], secs: Math.max(0.8, g[2] * 0.5), verb: "pick " + K[g[0]].label };
    return null;
  };
  S.gather = function (c, game, n) {
    var g = S.gatherOf(c, game, n);
    if (!g) return null;
    if (!S.room(c, g.kind)) return { full: true, kind: g.kind };
    if (n.kind === "vines") {
      if (n.left == null) n.left = 3;
      n.left--;
      if (n.left <= 0) { n.state = "picked"; n.regrowT = 240; n.left = null; SB.World.markNode(game.world, n); }
      anim(n, "shake");
    } else if (ROCKS[n.kind]) {
      var rk = ROCKS[n.kind];
      if (n.left == null) n.left = rk.left;
      n.left--; n.hp = rk.hp;
      SB.World.markNode(game.world, n);
      if (n.left <= 0) { n.state = "gone"; n.regrowT = 1500; SB.World.markNode(game.world, n); }
    } else if (S.isTree(n)) anim(n, "shake");
    S.add(c, g.kind, 1);
    return { kind: g.kind, n: 1 };
  };

  /* ---------------- planting ---------------- */

  var BIOME_TREE = { meadow: "oak", forest: "oak", jungle: "palm", savanna: "oak", swamp: "birch", taiga: "pine", tundra: "pine", mountain: "pine", beach: "palm", blossom: "sakura", maple: "maple", mangrove: "mangrove", bamboo: "bamboo", flowers: "birch", desert: "palm", mesa: "deadtree", ash: "deadtree", shroom: "shroomtree", crystal: "pine" };
  S.plantSpot = function (game, x, z) {
    var w = game.world;
    if (!SB.World.walkable(w, x, z) || SB.World.depthAt(w, x, z) > 0.02 || !SB.World.isSeen(w, x, z)) return false;
    var free = true;
    SB.World.eachNodeNear(w, x, z, 1.6, function (n) { if (SB.dist(n.x, n.z, x, z) < (NK[n.kind].r * (n.s || 1)) + 0.7) free = false; });
    if (!free) return false;
    var sts = w.structures;
    for (var i = 0; i < sts.length; i++) if (SB.dist(x, z, sts[i].x, sts[i].z) < SK[sts[i].kind].r + 0.8) return false;
    return true;
  };
  S.plant = function (c, game, kind, x, z) {
    var w = game.world;
    if (!S.plantSpot(game, x, z)) return null;
    var nk;
    if (kind === "sapling") {
      var b = SB.BIOMES[SB.World.biomeAt(w, x, z)];
      nk = (b && BIOME_TREE[b.id]) || "oak";
      if (!NK[nk] || !(SB.Meshes && SB.Meshes.NODE_BUILDERS ? SB.Meshes.NODE_BUILDERS[nk] : true)) nk = "oak";
    } else if (kind === "seed") nk = "bush";
    else return null;
    if (!S.take(c, kind, 1).length) return null;
    var n = SB.World.addNode(w, game, nk, x, z, 0.85 + Math.random() * 0.3);
    if (!n) { S.add(c, kind, 1); return null; }
    n.grow = 0; SB.World.markNode(w, n);
    emit("planted", { c: c, node: n });
    return n;
  };

  /* ---------------- building ---------------- */

  S.canPlace = function (game, kind, x, z) {
    var def = SK[kind];
    if (!def || !SB.World.isSeen(game.world, x, z) || !SB.World.siteFree(game.world, x, z, def.r)) return false;
    var vine = false; // (siteFree ignores vines so the AI builds exactly as before; you don't build on them)
    SB.World.eachNodeNear(game.world, x, z, def.r + 0.8, function (n) { if (n.nop) vine = true; });
    return !vine;
  };
  S.place = function (c, game, kind, x, z, rot) {
    if (!S.canPlace(game, kind, x, z)) return null;
    var st = SB.World.addStructure(game.world, game, kind, x, z, { tribe: c.tribe, rot: rot || 0 });
    st.founder = c.name; st.data.pov = 1;
    emit("siteStarted", { c: c, st: st });
    return st;
  };
  // bring a site what you carry. sticks: a log counts 3, a plank 2. returns [{k, n}] delivered
  var STICK_VAL = { log: 3, plank: 2, firewood: 1, stick: 1 };
  S.deliver = function (c, game, st) {
    if (!st || st.done) return [];
    var v = S.inv(c), got = {};
    for (var k in st.need) {
      if (!(st.need[k] > 0)) continue;
      // smallest pieces first, so a log isn't wasted on the last stick
      var order = k === "stick" ? ["stick", "firewood", "plank", "log"] : [k];
      for (var o = 0; o < order.length && st.need[k] > 0; o++) {
        for (var i = 0; i < v.s.length && st.need[k] > 0; i++) {
          var sl = v.s[i];
          if (!sl || sl.k !== order[o]) continue;
          while (sl.n > 0 && st.need[k] > 0) { sl.n--; st.need[k] = Math.max(0, st.need[k] - (k === "stick" ? STICK_VAL[sl.k] || 1 : 1)); got[sl.k] = (got[sl.k] || 0) + 1; }
          if (sl.n <= 0) v.s[i] = null;
        }
      }
    }
    var out = [];
    for (var g in got) out.push({ k: g, n: got[g] });
    if (out.length) {
      if (st.builders.indexOf(c.id) < 0) st.builders.push(c.id);
      I().habit(c, "build", out.length);
      emit("deliver", { c: c, st: st, n: out.length });
    }
    return out;
  };
  S.needs = function (st) { var out = []; for (var k in st.need) if (st.need[k] > 0) out.push({ k: k, n: st.need[k] }); return out; };
  S.canDeliver = function (c, st) { if (!st || st.done) return false; for (var k in st.need) if (st.need[k] > 0 && S.count(c, k) > 0) return true; return false; };

  /* ---------------- fires ---------------- */
  var FUEL = { stick: 0.45, firewood: 0.9, log: 1, plank: 0.6, leaves: 0.2 };
  S.FUEL = FUEL;
  S.feedFire = function (c, game, st, kind) {
    if (!st || !st.done || (st.kind !== "campfire" && st.kind !== "kiln") || !FUEL[kind]) return false;
    if (!S.take(c, kind, 1).length) return false;
    var d = st.data;
    if (!d.lit && !I().known(c, "fire")) { S.add(c, kind, 1); return "cold"; }
    d.fuel = Math.min(1, (d.fuel || 0) + FUEL[kind]); d.lit = true;
    emit("fireFed", { c: c, st: st });
    return true;
  };
  S.lightFire = function (c, game, st) {
    if (!st || !st.done || st.data.lit) return false;
    if (S.has(c, "torch") || (I().known(c, "fire") && (S.take(c, "stick", 1).length))) {
      st.data.fuel = Math.max(st.data.fuel || 0, 0.5); st.data.lit = true;
      emit("fireLit", { c: c, st: st });
      return true;
    }
    return false;
  };

  /* ---------------- giving ---------------- */
  /* ---------------- small bodies: leaves off plants, and the nest (blobs and critters) ---------------- */
  // tug a few leaves off a bush or a low branch, straight into your mouth. each plant gives one every 40 s
  S.TUG_GAP = 40;
  S.canTug = function (game, n) {
    if (!n || n.state !== "ok" || !NK[n.kind] || NK[n.kind].noun !== "plant" || n.kind === "cactus" || n.kind === "hive" || n.kind === "clams" || n.kind === "shrooms") return false;
    var t = (game._tug || {})[n.id];
    return t == null || game.time - t >= S.TUG_GAP;
  };
  S.tug = function (c, game, n) {
    if (!S.canTug(game, n)) return { msg: "no loose leaves left here. try another plant" };
    if (!S.room(c, "leaves")) return { msg: "your mouth is full. drop it (Q) or take it somewhere" };
    (game._tug || (game._tug = {}))[n.id] = game.time;
    S.add(c, "leaves", 1);
    if (SB.Creature.habit) SB.Creature.habit(c, "hands", 0.35);
    emit("tug", { c: c, node: n });
    return { ok: true, msg: "a mouthful of leaves" };
  };
  // the nest: soft things brought home make it cosier (eggs by it hatch faster: see world.js tickEgg)
  S.NEST_STEP = 3; S.NEST_MAX = 3;
  S.nest = function (game) { return game.nest || (game.nest = { fluff: 0, cosy: 0 }); };
  S.lineNest = function (c, game, i) {
    var v = S.inv(c), sl = v.s[i];
    if (!sl || !S.SOFT[sl.k]) return null;
    var n = S.nest(game);
    if (n.cosy >= S.NEST_MAX) return { full: true, cosy: n.cosy };
    S.removeAt(c, i, 1);
    n.fluff++;
    var up = n.fluff >= S.NEST_STEP * (n.cosy + 1);
    if (up) n.cosy++;
    if (SB.Creature.habit) SB.Creature.habit(c, "hands", 0.35);
    emit("nestLined", { c: c, cosy: n.cosy, up: up });
    return { cosy: n.cosy, up: up, left: n.cosy >= S.NEST_MAX ? 0 : S.NEST_STEP * (n.cosy + 1) - n.fluff };
  };
  S.give = function (c, game, o, i) {
    var v = S.inv(c), sl = v.s[i];
    if (!sl || !o || !o.alive) return null;
    var it = SB.World.add(game.world, game, sl.k, o.x, o.z, sl.w != null ? { w: sl.w } : {});
    S.removeAt(c, i, 1);
    SB.Creature.carry(o, it, game, true);
    SB.Chem.apply(c.chem, { lonely: -0.15 });
    if (SB.Creature.emote) SB.Creature.emote(o, "happy", 1.5);
    if ((it.noun === "food" && o.chem.hunger > 0.4) || (it.noun === "medicine" && o.chem.sick > 0.3)) {
      var r = S.eat(o, game, it.kind, null);
      if (r && r.ok) SB.Creature.consume(o, it, game);
    }
    if (I() && !I().known(c, "share") && I().canHold(c, "share")) I().discover(c, "share", game);
    if (SB.Social && SB.Social.onGive) SB.Social.onGive(game, c, o, it);
    emit("give", { c: c, to: o, item: it });
    return it;
  };

  /* ---------------- dying with a pack ---------------- */
  S.onDeath = function (c, game) {
    var lost = [];
    if (c.inv && c.inv.s) {
      c.inv.s.forEach(function (sl) { if (sl) { lost.push({ k: sl.k, n: sl.n }); S.spawn(game, sl.k, sl.n, c.x + (Math.random() - 0.5) * 0.8, c.z + (Math.random() - 0.5) * 0.8, { w: sl.w }); } });
      c.inv.s = [];
    }
    // ideas nobody else alive knows (and no story pole holds) die with it
    var only = [];
    if (c.ideas && I()) {
      var cs = I().census(game);
      for (var id in c.ideas) if (c.ideas[id] >= 1 && !cs.counts[id] && !cs.poles[id] && I().BY_ID[id]) only.push(id);
    }
    return { items: lost, ideas: only };
  };

  /* ---------------- vines: from the seed ---------------- */

  S.VINE_ID0 = 1e7;
  // cliffs, riverbanks and boulders, never by trees. own random stream, so nothing else on the island changes
  S.placeVines = function (world) {
    var T = world.T;
    if (!T || T._vines) return;
    T._vines = 1;
    var WG = SB.WorldGen, N = T.N, r = SB.rng((T.seed * 31 + 17) >>> 0), out = [], cap = Math.max(24, Math.floor(N * N / 900));
    var nodes = world.nodes, grid = {};
    function key(x, z) { return ((x / 4) | 0) + "," + ((z / 4) | 0); }
    nodes.forEach(function (n) { var k = key(n.x, n.z); (grid[k] || (grid[k] = [])).push(n); });
    function near(x, z, rad, fn) {
      for (var gx = Math.floor((x - rad) / 4); gx <= Math.floor((x + rad) / 4); gx++) for (var gz = Math.floor((z - rad) / 4); gz <= Math.floor((z + rad) / 4); gz++) {
        var L = grid[gx + "," + gz]; if (!L) continue;
        for (var i = 0; i < L.length; i++) if (SB.dist(L[i].x, L[i].z, x, z) < rad && fn(L[i])) return true;
      }
      return false;
    }
    function treeNear(x, z, rad) { return near(x, z, rad, function (n) { return n.kind !== "vines" && NK[n.kind] && NK[n.kind].noun === "plant" && !NOT_TREE[n.kind]; }); }
    function crowded(x, z) { return near(x, z, 1.1, function () { return true; }) || out.some(function (v) { return SB.dist(v.x, v.z, x, z) < 3.5; }); }
    function ok(x, z) { return x > 4 && z > 4 && x < N - 4 && z < N - 4 && WG.walkable(T, x, z) && WG.depthAt(T, x, z) <= 0.02; }
    function waterBy(x, z) { for (var a = 0; a < 6.28; a += 0.785) if (WG.depthAt(T, x + Math.sin(a) * 1.6, z + Math.cos(a) * 1.6) > 0.3) return a; return null; }
    function uphill(x, z) { var dx = WG.heightAt(T, x + 0.6, z) - WG.heightAt(T, x - 0.6, z), dz = WG.heightAt(T, x, z + 0.6) - WG.heightAt(T, x, z - 0.6); return Math.atan2(dx, dz); }
    function add(x, z, kindOf, face) {
      var n = { id: S.VINE_ID0 + out.length, kind: "vines", x: x, z: z, s: 0.85 + r() * 0.35, rot: face, seed: (r() * 1e9) | 0, on: kindOf };
      out.push(n); var k = key(x, z); (grid[k] || (grid[k] = [])).push(n);
      return n;
    }
    function tryAt(x, z, relaxed) {
      if (!ok(x, z) || crowded(x, z) || treeNear(x, z, relaxed ? 1.8 : 2.6)) return false;
      var sl = WG.slopeAt(T, x, z);
      if (sl > 1.15 && sl < 2.55) return add(x, z, "cliff", uphill(x, z) + Math.PI);
      var wb = waterBy(x, z);
      if (wb != null && (relaxed || r() < 0.6)) return add(x, z, "bank", wb);
      var rock = null;
      near(x, z, 1.9, function (n) { if (n.kind === "boulder" || n.kind === "basalt" || n.kind === "redrock" || n.kind === "flintrock") { rock = n; return true; } return false; });
      if (rock && (relaxed || r() < 0.55)) return add(x, z, "rock", Math.atan2(x - rock.x, z - rock.z) + Math.PI);
      if (relaxed && sl > 0.6) return add(x, z, "cliff", uphill(x, z) + Math.PI);
      return false;
    }
    // the nest first: a first-time player should find vines within a short walk
    var nest = T.nest || T.spawn, home = 0;
    for (var t = 0; t < 900 && home < 3; t++) {
      var a = r() * 6.283, d = 7 + r() * (10 + t * 0.03);
      if (tryAt(nest.x + Math.sin(a) * d, nest.z + Math.cos(a) * d, t > 300)) home++;
    }
    for (t = 0; t < 400 && home < 3; t++) { // no rock, cliff or river nearby at all: a vine-covered stone pile then
      var a2 = r() * 6.283, d2 = 8 + r() * 10, x2 = nest.x + Math.sin(a2) * d2, z2 = nest.z + Math.cos(a2) * d2;
      if (ok(x2, z2) && !crowded(x2, z2) && !treeNear(x2, z2, 1.6)) { add(x2, z2, "mound", a2 + Math.PI); home++; }
    }
    for (t = 0; t < cap * 30 && out.length < cap; t++) tryAt(4 + r() * (N - 8), 4 + r() * (N - 8), false);
    out.forEach(function (n) { nodes.push(n); });
    return out;
  };
  // old ruins get vines too (sites.js places ruins after the world exists, so they're added on the first tick)
  S.ruinVines = function (game) {
    var w = game.world;
    if (w._ruinVines || !game.sites) return;
    w._ruinVines = 1;
    var r = SB.rng((game.seed * 53 + 29) >>> 0), k = 0, added = [];
    game.sites.forEach(function (s) {
      if (s.kind !== "ruin") return;
      for (var i = 0, made = 0; i < 12 && made < 2; i++) {
        var a = r() * 6.283, d = 1.6 + r() * 1.4, x = s.x + Math.sin(a) * d, z = s.z + Math.cos(a) * d;
        if (!SB.World.walkable(w, x, z) || SB.World.depthAt(w, x, z) > 0.02) continue;
        var n = { id: S.VINE_ID0 + 50000 + k++, kind: "vines", x: x, z: z, s: 0.9 + r() * 0.3, rot: a + Math.PI, seed: (r() * 1e9) | 0, type: "node", noun: NK.vines.noun, nop: 1, dropT: 1e9, alsoT: 1e9, state: "ok", on: "ruin" };
        w.nodes.push(n); w.nodeById[n.id] = n; added.push(n); made++;
      }
    });
    // saved states for these (picked clean before the last save) were held back by World.revive
    (w._orphans || []).forEach(function (p) { var n = w.nodeById[p.id]; if (n) S.applySaved(n, p); });
    w._orphans = null;
    if (added.length && SB.World.rebuildNodeGrid) SB.World.rebuildNodeGrid(w);
    return added;
  };
  S.applySaved = function (n, p) {
    n.state = p.state || "ok"; n.regrowT = p.regrowT; n.grow = p.grow == null ? null : p.grow;
    if (p.left != null) n.left = p.left;
    if (p.hp != null) n.hp = p.hp;
    if (p.block) n.block = 1;
  };

  /* ---------------- the tick ---------------- */

  var acc = 0, regrowAcc = 0;
  S.tick = function (game, dt) {
    if (!game || !game.world) return;
    if (!game.world._ruinVines && game.sites) S.ruinVines(game);
    S.animTick(dt);
    regrowAcc += dt;
    if (regrowAcc >= 5) {
      var step = regrowAcc; regrowAcc = 0;
      var ns = game.world.nodes;
      for (var i = 0; i < ns.length; i++) {
        var n = ns[i];
        if (n.state === "gone" || n.state === "picked") {
          n.regrowT = (n.regrowT || 300) - step;
          if (n.regrowT <= 0) { n.state = "ok"; n.left = null; n.hp = null; SB.World.markNode(game.world, n); }
        } else if (n.left != null && n.state === "ok" && n.hitT != null && game.time - n.hitT > 600) {
          // a chipped rock slowly heals back to full size
          var rk = ROCKS[n.kind];
          if (rk && n.left < rk.left && (n.healT = (n.healT || 0) + step) > 120) { n.healT = 0; n.left++; if (n.left >= rk.left) n.left = null; SB.World.markNode(game.world, n); }
        }
      }
    }
    acc += dt;
    if (acc < 2) return;
    var dts = acc; acc = 0;
    // smols you once were, still carrying their pack: they eat from it, and bring what they carry to the tribe's sites
    for (var c2 = 0; c2 < game.creatures.length; c2++) {
      var c = game.creatures[c2];
      if (!c.alive || c._pov || !c.inv || !c.inv.s || !c.inv.s.length || c.asleep || c.heldBy) continue;
      var v = c.inv, any = false;
      for (var q = 0; q < v.s.length; q++) if (v.s[q]) { any = true; break; }
      if (!any) { if (v.s.length) v.s = []; continue; }
      if (c.chem.hunger > 0.6) {
        for (q = 0; q < v.s.length; q++) { var sl = v.s[q]; if (sl && S.edible(sl.k) && !(K[sl.k].chem && K[sl.k].chem.toxin)) { S.removeAt(c, q, 1); S.eat(c, game, sl.k, null); break; } }
      }
      var sites = SB.World.structsNear(game.world, c.x, c.z, 7, function (s) { return !s.done && s.tribe === c.tribe; });
      for (var si = 0; si < sites.length; si++) if (S.canDeliver(c, sites[si])) { S.deliver(c, game, sites[si]); break; }
      if (c.tool == null && c.tier >= 2) S.release(c, game);
    }
    void dts;
  };
})();
