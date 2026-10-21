/* smol brains 2 — civ.js
   From village to city. Eras live in heads, not in a counter: a band becomes a village when it settles around a
   fire, a town when a thinker, 15+ smols and a working market are all there at once, a city when 30+ smols, writing
   and a council hall are. Lose them (a plague, a lost idea) and the city slides back.
   Also here: jobs that grow out of habits and run in families, desire paths that wear into trails and get paved,
   districts that form when buildings of a kind cluster, the council and its leader's policies, and the Law of the
   Sky: the scribe watches what the hand pokes and tickles and writes it down as law (not always correctly). */
(function () {
  "use strict";
  var SB = window.SB;
  var Cv = (SB.Civ = {});

  Cv.ERAS = [
    { id: "band", name: "band", icon: "🔥", desc: "a handful of smols and a fire. nobody owns anything." },
    { id: "village", name: "village", icon: "🏘", desc: "huts around a fire. favours are remembered, and worn ground turns into trails." },
    { id: "town", name: "town", icon: "🏪", desc: "a market, shell money, jobs, paved roads, houses. more smols fit on the island." },
    { id: "city", name: "city", icon: "🏛", desc: "a council, a leader, laws, copper coins and lit windows at night." }
  ];
  Cv.JOBS = {
    farmer: { name: "farmer", icon: "🌾" }, fisher: { name: "fisher", icon: "🐟" }, potter: { name: "potter", icon: "🏺" },
    smith: { name: "smith", icon: "🔨" }, builder: { name: "builder", icon: "🛠" }, trader: { name: "trader", icon: "🏪" },
    teacher: { name: "teacher", icon: "🏫" }, guard: { name: "guard", icon: "🛡" }, scribe: { name: "scribe", icon: "📜" }
  };
  // building kinds that make up each kind of district
  var GROUPS = {
    homes: { kinds: ["hut", "house"], name: "end", tint: [1.06, 0.98, 0.9] },
    fields: { kinds: ["farm", "windmill", "granary"], name: "fields", tint: [1.04, 1.06, 0.86] },
    crafts: { kinds: ["kiln", "workshop", "mint"], name: "works", tint: [1.08, 0.92, 0.86] },
    market: { kinds: ["stall"], name: "market", tint: [1.1, 1.0, 0.82] },
    learning: { kinds: ["totem", "school", "observatory", "hall"], name: "hill", tint: [0.92, 0.95, 1.1] }
  };
  Cv.GROUPS = GROUPS;
  var GROUP_OF = {};
  for (var gk in GROUPS) GROUPS[gk].kinds.forEach(function (k) { GROUP_OF[k] = gk; });

  function smols(game) { return game.creatures.filter(function (c) { return c.alive && c.species === "smol" && !c.stranger; }); }
  function adults(game) { return smols(game).filter(function (c) { return c.stage >= 3; }); }
  function done(game, kind) { return game.world.structures.filter(function (s) { return s.kind === kind && s.done; }); }
  function knows(game, id) { return game.creatures.some(function (c) { return c.alive && c.species === "smol" && SB.Ideas.known(c, id); }); }
  function gene(c, k) { var v = c.genome && c.genome.genes[k]; return v == null ? 0.5 : v; }

  Cv.init = function (game) {
    var v = game.civ;
    if (!v || typeof v !== "object") v = game.civ = {};
    if (typeof v.era !== "number") v.era = 0;
    v.eraT = v.eraT && typeof v.eraT === "object" ? v.eraT : {};
    v.best = Math.max(v.best || 0, v.era);
    v.slipT = v.slipT || 0;
    v.hand = v.hand && typeof v.hand === "object" ? v.hand : {};
    v.laws = Array.isArray(v.laws) ? v.laws : [];
    v.districts = Array.isArray(v.districts) ? v.districts : [];
    v.council = v.council && typeof v.council === "object" ? v.council : { leader: null, since: 0, policies: {}, history: [] };
    if (!Array.isArray(v.council.history)) v.council.history = [];
    if (!v.council.policies) v.council.policies = {};
    v.stats = v.stats || { scolded: 0, praised: 0, coups: 0, elections: 0 };
    v.granary = v.granary || 0;
    return v;
  };
  Cv.era = function (game) { return game.civ ? game.civ.era : 0; };
  Cv.eraName = function (game) { return Cv.ERAS[Cv.era(game)].name; };

  /* ---------------- eras ---------------- */

  // what each next era still needs: [{label, ok}]
  Cv.needs = function (game) {
    var sm = smols(game), pop = sm.length;
    // settled: two kinds of home-making among a fire, a hut, a field and a totem
    var hamlet = ["campfire", "hut", "farm", "totem"].filter(function (k) { return done(game, k).length > 0; }).length >= 2;
    var village = (game.villages && game.villages.length > 0) || hamlet;
    var thinker = sm.some(function (c) { return c.tier >= 5; });
    var stalls = done(game, "stall").length;
    var market = stalls >= 2 && knows(game, "market");
    var hall = done(game, "hall").length >= 1 && knows(game, "council");
    var writing = !!(game.culture && (game.culture.writing || (game.culture.alive && game.culture.alive.writing > 0)));
    return [
      [{ label: "settle down: two of a campfire, hut, farm or totem", ok: village }],
      [{ label: "a thinker", ok: thinker }, { label: "15 smols (" + pop + ")", ok: pop >= 15 }, { label: "a market: 2 stalls (" + stalls + ")", ok: market }],
      [{ label: "30 smols (" + pop + ")", ok: pop >= 30 }, { label: "writing", ok: writing }, { label: "a council hall", ok: hall }]
    ];
  };
  function eraTarget(game) {
    var n = Cv.needs(game), t = 0;
    for (var i = 0; i < n.length; i++) { if (n[i].every(function (x) { return x.ok; })) t = i + 1; else break; }
    return t;
  }
  function setEra(game, e, up) {
    var v = game.civ, old = v.era;
    v.era = e; v.slipT = 0;
    if (up && v.eraT[e] == null) v.eraT[e] = Math.round(game.time);
    v.best = Math.max(v.best, e);
    var E = Cv.ERAS[e];
    SB.bus.emit("era", { era: e, from: old, up: up, name: E.name });
    if (up) {
      SB.Game.note(game, "your smols are a " + E.name + " now " + E.icon);
      if (SB.Social) SB.Social.chronicle(game, E.icon, "the island became a " + E.name);
    } else {
      SB.Game.note(game, "the " + Cv.ERAS[old].name + " couldn't hold together. it's a " + E.name + " again " + E.icon);
      if (SB.Social) SB.Social.chronicle(game, "💔", "the " + Cv.ERAS[old].name + " fell apart");
    }
    if (window.cc && cc.event) try { cc.event("era", { era: E.id, up: !!up }); } catch (e2) {}
  }
  function eras(game, dt) {
    var v = game.civ, t = eraTarget(game);
    if (t > v.era) { setEra(game, v.era + 1, true); return; }
    if (t < v.era) {
      // a bad week doesn't end a city: only a long slump does
      v.slipT += dt;
      if (v.slipT > 180) setEra(game, v.era - 1, false);
    } else v.slipT = 0;
  }

  // the island's room for smols grows with the colony: a few smols while they're blobs and critters, more as
  // they learn tools, band together and build, then the era (and its houses) takes over
  Cv.TIER_CAP = [12, 12, 16, 20, 28, 36, 36];
  Cv.popCap = function (game) {
    var e = Cv.era(game), houses = done(game, "house").length, best = (game.stats && game.stats.maxTier) || 0;
    var cap = Cv.TIER_CAP[Math.min(Cv.TIER_CAP.length - 1, best)];
    if (e >= 3) return Math.max(cap, Math.min(72, 52 + houses * 2));
    if (e >= 2) return Math.max(cap, Math.min(56, 42 + houses * 2));
    return cap;
  };

  // housing (Banished's rule): from the builder age on, a couple only has an egg if there's a bed for the baby.
  // Each finished hut sleeps 4 and each house 6, and a few more can curl up by the fire. A wrecked home still sleeps
  // half (a leaky roof is a roof; it stops a raid from becoming a spiral) until it's rebuilt. Strangers still arrive
  // (fresh blood), but eggs wait for the builders
  Cv.ROOM = { hut: 4, house: 6, fire: 10 };
  Cv.room = function (game) {
    // (only once the builders are here and someone knows how to raise a hut: nobody waits on a roof nobody can build)
    if (((game.stats && game.stats.maxTier) || 0) < 4 || !SB.Game.cultureKnows(game, "hut")) return Infinity;
    var wrecked = function (kind) { return game.world.structures.filter(function (s) { return s.kind === kind && !s.done && s.data && s.data.wrecked; }).length; };
    return Math.floor(Cv.ROOM.hut * (done(game, "hut").length + wrecked("hut") / 2) + Cv.ROOM.house * (done(game, "house").length + wrecked("house") / 2)) + Cv.ROOM.fire;
  };

  // strangers and pods leave the last few seats for babies: a small band full of newcomers stops evolving
  function setCaps(game) { var cap = SB.Game.POP_CAP = Cv.popCap(game); SB.Game.JOIN_CAP = cap < 36 ? Math.max(4, cap - 3) : cap; }

  /* ---------------- new ideas the island grows into ---------------- */

  function inventor(game, id, minTier) {
    var cands = smols(game).filter(function (c) { return c.tier >= (minTier || 0) && SB.Ideas.canHold(c, id) && !SB.Ideas.known(c, id) && !c.asleep; });
    if (!cands.length) return null;
    cands.sort(function (a, b) { return gene(b, "curiosity") + b.tier * 0.1 - gene(a, "curiosity") - a.tier * 0.1; });
    return cands[0];
  }
  function maybeFind(game, id, p, why) {
    if (knows(game, id) || game.rng() > p) return null;
    var c = inventor(game, id);
    if (!c) return null;
    if (SB.Ideas.discover(c, id, game)) { if (why) SB.Social && SB.Social.log(game, c, SB.Ideas.BY_ID[id].icon, why); return c; }
    return null;
  }
  function ideas(game, dt) {
    var e = Cv.era(game), pop = smols(game).length, k = dt / 2;
    // a thinker can dream up the market before the village is quite there, so the stalls are going up by then
    if ((e >= 1 || smols(game).some(function (c) { return c.tier >= 5; })) && pop >= 10) maybeFind(game, "market", 0.06 * k, "thought: what if we swapped the spare stuff in one place?");
    if (e >= 2) {
      maybeFind(game, "house", 0.06 * k, "piled stones into walls. a house!");
      if ((game.civ.roadN || 0) >= 12) maybeFind(game, "paving", 0.06 * k, "put flat stones on the trail");
      if (done(game, "farm").length >= 2) maybeFind(game, "granary", 0.04 * k, "built a store for the harvest");
      if (pop >= 22 && game.culture.writing) maybeFind(game, "council", 0.06 * k, "said we should all sit down and decide things");
    }
    if (e >= 3) maybeFind(game, "law", 0.08 * k, "started writing down what the sky wants");
    // the first stalls and the hall don't wait for their few knowers to fancy building them: someone who knows
    // marks out the site, and any builder can help raise it
    game.civ.foundT = (game.civ.foundT || 0) - dt;
    if (game.civ.foundT <= 0) {
      game.civ.foundT = 30;
      if (knows(game, "market") && all(game, "stall").length < 2) found(game, "market", "stall");
      else if (e >= 2 && pop >= 22 && knows(game, "council") && !all(game, "hall").length) found(game, "council", "hall");
    }
  }
  function all(game, kind) { return game.world.structures.filter(function (s) { return s.kind === kind; }); }
  function found(game, id, kind) {
    var c = smols(game).find(function (o) { return o.stage >= 3 && !o.far && SB.Ideas.known(o, id); });
    if (!c || !SB.Ideas.pickSite) return;
    var site = SB.Ideas.pickSite(c, kind, game);
    if (!site) return;
    var st = SB.World.addStructure(game.world, game, kind, site.x, site.z, { tribe: c.tribe, rot: site.rot });
    st.founder = c.name;
    SB.bus.emit("siteStarted", { c: c, st: st });
  }

  // how much the tribe needs one of the new buildings (called from Ideas.buildNeed)
  Cv.buildNeed = function (c, kind, game, count, pop) {
    var e = Cv.era(game);
    switch (kind) {
      case "stall": var ns = count("stall", 40); return ns < 2 ? 0.7 : e >= 1 && ns < Math.min(6, 2 + Math.floor(pop / 12)) ? 0.55 : 0;
      case "house": return e >= 2 && count("house", 40) < Math.min(14, Math.ceil(pop / 4)) ? 0.5 + c.chem.tired * 0.2 + (SB.Ideas.villageFull && SB.Ideas.villageFull(game, pop) ? 0.4 : 0) : 0;
      case "granary": return e >= 2 && count("granary", 40) < 1 + Math.floor(pop / 35) ? 0.4 : 0;
      case "hall": return e >= 2 && pop >= 22 && count("hall", 60) < 1 ? 0.65 : 0;
      case "mint": return e >= 3 && count("mint", 60) < 1 ? 0.5 : 0;
    }
    return 0;
  };
  // where a new building goes: next to others of its kind, so districts grow
  Cv.siteNear = function (game, c, kind) {
    var g = GROUP_OF[kind];
    if (!g || ["stall", "house", "granary", "hall", "mint"].indexOf(kind) < 0) return null;
    var home = SB.Society.home(game, c.tribe), same = game.world.structures.filter(function (s) { return GROUP_OF[s.kind] === g && SB.dist(s.x, s.z, home.x, home.z) < 45; });
    if (kind === "hall" || !same.length) {
      // the first of a kind: stalls in the middle of things, the hall on the edge of the learning quarter
      if (kind === "stall") return { x: home.x, z: home.z, r0: 5, r1: 10 };
      if (kind === "hall") { var lr = game.world.structures.filter(function (s) { return GROUP_OF[s.kind] === "learning"; })[0]; return lr ? { x: lr.x, z: lr.z, r0: 3, r1: 8 } : { x: home.x, z: home.z, r0: 4, r1: 10 }; }
      return { x: home.x, z: home.z, r0: 7, r1: 14 };
    }
    var x = 0, z = 0;
    same.forEach(function (s) { x += s.x; z += s.z; });
    return { x: x / same.length, z: z / same.length, r0: 1.5, r1: 6 };
  };

  /* ---------------- jobs ---------------- */

  function xp(c, job, n) {
    if (!c || c.species !== "smol" || !c.alive) return;
    var j = c.jobXp || (c.jobXp = {});
    j[job] = Math.round(((j[job] || 0) + n) * 10) / 10;
  }
  Cv.xp = xp;
  function jobs(game) {
    var e = Cv.era(game), v = game.civ;
    if (e < 1) return;
    var ad = adults(game);
    ad.forEach(function (c) {
      if (c.job === "guard" || c.job === "scribe") return;
      var j = c.jobXp || {}, best = null, bv = 0;
      for (var k in j) { var s = j[k] + (c.jobLean === k ? 2 : 0); if (s > bv) { bv = s; best = k; } }
      var nj = bv >= 4 ? best : null;
      if (nj && nj !== c.job) {
        c.job = nj;
        if (SB.Social) SB.Social.log(game, c, Cv.JOBS[nj].icon, "became a " + Cv.JOBS[nj].name + (c.jobLean === nj ? ", like family before" : ""));
        SB.bus.emit("job", { c: c, job: nj });
      }
    });
    // apprentices: kids learn a trade from a family friend who does it
    smols(game).forEach(function (k) {
      if (k.stage < 1 || k.stage > 2) return;
      var m = k.mentor != null && SB.Game.byId(game, k.mentor);
      if (!m || !m.alive) { k.mentor = null; m = findMentor(game, k, ad); if (m) { k.mentor = m.id; if (SB.Social) SB.Social.log(game, k, "🏫", "started learning " + (Cv.JOBS[m.job] ? Cv.JOBS[m.job].name + "ing" : "a trade") + " from " + m.name); } }
      if (!m) return;
      if (m.job) xp(k, m.job, 0.3);
      if (SB.dist(k.x, k.z, m.x, m.z) < 6) { if (game.rng() < 0.2) SB.Ideas.teach(m, k, game); }
      else if (SB.Social && SB.Social.free(k) && game.rng() < 0.15) SB.Creature.sendTo(k, m.x + 1, m.z + 1, game, 20);
    });
    // the city appoints guards (the brave) and a scribe (the best reader)
    if (e >= 3) {
      var leader = v.council.leader;
      var guards = ad.filter(function (c) { return c.job === "guard"; }), want = Math.max(1, Math.floor(ad.length / 12));
      if (guards.length < want) {
        var g = ad.filter(function (c) { return c.job !== "guard" && c.job !== "scribe" && c.id !== leader && gene(c, "bravery") > 0.45; }).sort(function (a, b) { return gene(b, "bravery") - gene(a, "bravery"); })[0];
        if (g) { g.job = "guard"; SB.Game.note(game, g.name + " is a city guard now 🛡"); if (SB.Social) SB.Social.log(game, g, "🛡", "became a city guard"); SB.bus.emit("job", { c: g, job: "guard" }); }
      }
      if (!ad.some(function (c) { return c.job === "scribe"; })) {
        var s = ad.filter(function (c) { return SB.Ideas.known(c, "writing") && c.id !== leader && c.job !== "guard"; }).sort(function (a, b) { return gene(b, "learnRate") - gene(a, "learnRate"); })[0];
        if (s) { s.job = "scribe"; v.scribe = s.id; SB.Game.note(game, s.name + " is the city scribe 📜. they'll write down the law"); if (SB.Social) SB.Social.log(game, s, "📜", "became the scribe"); SB.bus.emit("job", { c: s, job: "scribe" }); }
      }
    } else ad.forEach(function (c) { if (c.job === "guard" || c.job === "scribe") c.job = null; });
  }
  function findMentor(game, kid, ad) {
    var parents = (kid.parents || []).map(function (id) { return SB.Game.byId(game, id); }).filter(function (p) { return p && p.alive; });
    var lean = kid.jobLean;
    var friends = ad.filter(function (a) { return a.job && parents.indexOf(a) < 0 && parents.some(function (p) { return SB.Social && SB.Social.opinion(game, p, a) >= SB.Social.FRIEND; }); });
    var pick = friends.filter(function (a) { return a.job === lean; })[0] || friends[0];
    if (!pick) pick = ad.filter(function (a) { return a.job && a.job === lean; })[0];
    if (!pick) pick = parents.filter(function (p) { return p.job; })[0];
    return pick || null;
  }

  /* ---------------- roads ---------------- */

  Cv.TRAIL = 6; Cv.PAVE = 10;
  function roads(game) {
    var e = Cv.era(game), w = game.world, N = w.T.N, home = SB.Society.home(game, 0);
    if (e < 1) return;
    var R = Math.min(N / 6, e >= 2 ? 44 : 30), paving = e >= 2 && knows(game, "paving");
    var x0 = Math.max(1, Math.floor(home.x - R)), x1 = Math.min(N - 2, Math.ceil(home.x + R)), z0 = Math.max(1, Math.floor(home.z - R)), z1 = Math.min(N - 2, Math.ceil(home.z + R));
    var n = 0, changed = {};
    for (var j = z0; j <= z1; j++) for (var i = x0; i <= x1; i++) {
      var t = j * N + i, wr = w.wear[t], cur = w.road[t], nv = cur;
      if (cur === 2) { n++; continue; } // paved roads stay
      if (wr >= Cv.TRAIL || (cur === 1 && wr >= Cv.TRAIL / 2)) nv = paving && wr >= Cv.PAVE ? 2 : 1;
      else nv = 0;
      if (nv && SB.World.depthAt(w, i + 0.5, j + 0.5) > 0.2 && !bridgeAt(w, i + 0.5, j + 0.5)) nv = 0;
      if (nv !== cur) { w.road[t] = nv; changed[((j / SB.CHUNK) | 0) * 1000 + ((i / SB.CHUNK) | 0)] = [i, j]; }
      if (nv) n++;
    }
    // bridges sit on the roads: their planks count as paved road
    if (e >= 2) done(game, "bridge").forEach(function (b) {
      var bc = Math.cos(b.rot || 0), bs = Math.sin(b.rot || 0);
      for (var bt = -2.4; bt <= 2.4; bt += 0.6) { var bx = (b.x + bs * bt) | 0, bz = (b.z + bc * bt) | 0, ti = bz * N + bx; if (ti >= 0 && ti < w.road.length && w.road[ti] !== 2) { w.road[ti] = 2; changed[((bz / SB.CHUNK) | 0) * 1000 + ((bx / SB.CHUNK) | 0)] = [bx, bz]; } }
    });
    var before = game.civ.roadN || 0;
    game.civ.roadN = n;
    if (n >= 12 && before < 12) { SB.Game.note(game, "the paths your smols walk most have worn into trails. walking on them is faster 👣"); SB.bus.emit("trails", { n: n }); }
    if (SB.Render && SB.Render.markDirty) for (var ck in changed) SB.Render.markDirty(changed[ck][0], changed[ck][1]);
  }
  function bridgeAt(w, x, z) { return w.structures.some(function (s) { return s.kind === "bridge" && s.done && SB.dist(s.x, s.z, x, z) < 2.6; }); }
  Cv.roadCount = function (game) { var w = game.world, a = 0, b = 0; if (!w.road) return { trail: 0, paved: 0 }; for (var i = 0; i < w.road.length; i++) { if (w.road[i] === 1) a++; else if (w.road[i] === 2) b++; } return { trail: a, paved: b }; };

  /* ---------------- districts ---------------- */

  function districts(game) {
    var v = game.civ, sts = game.world.structures.filter(function (s) { return s.done && GROUP_OF[s.kind]; }), out = [];
    var old = v.districts;
    Object.keys(GROUPS).forEach(function (g, gi) {
      var mine = sts.filter(function (s) { return GROUP_OF[s.kind] === g; }), used = {};
      mine.forEach(function (seed) {
        if (used[seed.id]) return;
        var cl = mine.filter(function (s) { return !used[s.id] && SB.dist(s.x, s.z, seed.x, seed.z) < 12; });
        if (cl.length < 3) return;
        var x = 0, z = 0;
        cl.forEach(function (s) { used[s.id] = 1; x += s.x; z += s.z; });
        x /= cl.length; z /= cl.length;
        var prev = old.filter(function (d) { return d.g === g && SB.dist(d.x, d.z, x, z) < 14; })[0];
        var name = prev ? prev.name : SB.Lang.cap(SB.Lang.fresh(game.lang, SB.rng((game.seed + gi * 131 + old.length * 977 + Math.round(x) * 7) >>> 0), 2)) + " " + GROUPS[g].name;
        var d = { g: g, x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, name: name, n: cl.length, ids: cl.map(function (s) { return s.id; }) };
        out.push(d);
        if (!prev) { SB.Game.note(game, "the smols started calling that part of town " + name + " 🗺"); SB.bus.emit("district", { d: d }); if (SB.Social) SB.Social.chronicle(game, "🗺", "a new quarter: " + name); }
      });
    });
    v.districts = out;
    // each quarter has its own colour on the buildings
    var inD = {};
    out.forEach(function (d) { d.ids.forEach(function (id) { inD[id] = GROUPS[d.g].tint; }); });
    game.world.structures.forEach(function (s) {
      var t = inD[s.id] || null;
      if ((s.tint || null) !== t) { s.tint = t; if (SB.Render && SB.Render.markDirty) SB.Render.markDirty(s.x, s.z); }
    });
  }

  /* ---------------- council ---------------- */

  // the leader is whoever the grown-ups like most, all opinions added up
  Cv.standing = function (game, c, ad) {
    var s = 0;
    (ad || adults(game)).forEach(function (o) { if (o !== c) s += SB.Social.opinion(game, o, c); });
    return s;
  };
  function policiesFor(c, game) {
    return {
      ration: gene(c, "planning") > 0.5,
      strangers: gene(c, "social") > 0.45 || gene(c, "affection") > 0.6 ? "welcome" : "turn away",
      hours: gene(c, "bravery") + gene(c, "planning") > 1.05 ? "long" : "short"
    };
  }
  Cv.policyText = function (p) {
    if (!p || p.ration == null) return [];
    return [(p.ration ? "rations the granary in winter" : "lets everyone eat from the granary"), (p.strangers === "welcome" ? "welcomes strangers" : "turns strangers away"), (p.hours === "long" ? "long working days" : "short working days, long naps")];
  };
  Cv.elect = function (game, why) {
    var v = game.civ, ad = adults(game);
    if (ad.length < 3) return null;
    var best = null, bs = -1e9;
    ad.forEach(function (c) { var s = Cv.standing(game, c, ad) + c.tier * 3; if (s > bs) { bs = s; best = c; } });
    var cn = v.council, was = cn.leader;
    v.stats.elections++;
    if (best && best.id !== was) {
      cn.leader = best.id; cn.since = Math.round(game.time); cn.policies = policiesFor(best, game);
      cn.history.push([Math.round(game.time), best.name, why || "election"]); if (cn.history.length > 20) cn.history.shift();
      if (best.job === "guard" || best.job === "scribe") best.job = null;
      SB.Game.note(game, best.name + " was chosen to lead the council 🏛 (" + Cv.policyText(cn.policies).join(", ") + ")");
      if (SB.Social) { SB.Social.chronicle(game, "🏛", best.name + " leads the council"); SB.Social.log(game, best, "🏛", "was chosen to lead the council"); }
      SB.Creature.say(best, "i'll do my best!", game);
      SB.bus.emit("leader", { c: best, why: why || "election" });
    } else if (best) cn.policies = policiesFor(best, game);
    return best;
  };
  function council(game, dt) {
    var v = game.civ, cn = v.council;
    if (Cv.era(game) < 3) { if (cn.leader != null) { cn.leader = null; cn.policies = {}; } return; }
    var L = cn.leader != null && SB.Game.byId(game, cn.leader);
    if (!L || !L.alive) { Cv.elect(game, L ? "the old leader died" : "the first council"); return; }
    // a hated leader gets thrown out
    v.coupT = (v.coupT || 0) + dt;
    if (v.coupT < 30) return;
    v.coupT = 0;
    var ad = adults(game), app = Cv.standing(game, L, ad) / Math.max(1, ad.length - 1);
    cn.approval = Math.round(app);
    if (app < -12 && game.rng() < 0.5) {
      var rival = ad.filter(function (c) { return c !== L && gene(c, "bravery") > 0.5; }).sort(function (a, b) { return Cv.standing(game, b, ad) - Cv.standing(game, a, ad); })[0];
      if (rival) {
        v.stats.coups++;
        cn.leader = rival.id; cn.since = Math.round(game.time); cn.policies = policiesFor(rival, game);
        cn.history.push([Math.round(game.time), rival.name, "coup"]);
        SB.Chem.apply(L.chem, { fear: 0.4, anger: 0.3 });
        SB.Social.remember(game, L, rival, "coup", -40, "threw me out of the council", 1e5, 60);
        SB.Creature.say(rival, "enough! the council is mine", game);
        SB.Game.note(game, "a coup! nobody liked " + L.name + ", so " + rival.name + " took over the council 😠");
        SB.Social.chronicle(game, "😠", rival.name + " threw " + L.name + " out of the council");
        SB.bus.emit("coup", { c: rival, old: L });
      }
    }
  }
  // policies doing things
  function policies(game, dt) {
    var v = game.civ, p = v.council.policies || {}, w = game.world;
    if (Cv.era(game) < 2) return;
    var grans = done(game, "granary");
    // the granary fills from the harvests (see wire) and feeds the hungry; rationed, it only opens in winter for the really hungry
    if (grans.length && v.granary > 0) {
      var winter = SB.SEASONS[w.season] === "winter", ration = Cv.era(game) >= 3 && p.ration;
      smols(game).forEach(function (c) {
        if (v.granary < 1) return;
        var near = grans.some(function (g) { return SB.dist(g.x, g.z, c.x, c.z) < 14; });
        var hungry = ration ? winter && c.chem.hunger > 0.7 : c.chem.hunger > 0.6;
        if (!near || !hungry || (c._granT && game.time - c._granT < 60)) return;
        c._granT = game.time; v.granary--;
        SB.Chem.apply(c.chem, { hunger: -0.4 });
        SB.Creature.emote(c, "yum", 1);
      });
    }
    if (Cv.era(game) < 3) return;
    // strangers waiting at the edge of the city: the council decides if the sky doesn't
    if (SB.Strangers) game.creatures.forEach(function (c) {
      if (!c.alive || !c.stranger || c.stranger.state !== "waiting" || game.time - c.stranger.t < 40) return;
      SB.Strangers.decide(game, c, p.strangers !== "turn away", true);
      SB.Game.note(game, "the council " + (p.strangers === "turn away" ? "turned " + c.name + " away 🚫" : "welcomed " + c.name + " to the city 🤝"));
    });
    // working hours: long days get more done and wear smols out; short days are restful and a bit boring
    var k = dt / 60;
    if (!w.night) smols(game).forEach(function (c) { if (c.stage >= 3) SB.Chem.apply(c.chem, p.hours === "long" ? { tired: 0.05 * k, bored: -0.05 * k } : { tired: -0.03 * k, bored: 0.03 * k }); });
  }

  /* ---------------- the law of the sky ---------------- */

  var GERUND = ["loafing near", "going up to", "eating", "playing with", "hitting", "picking up", "dropping", "sleeping by", "running from", "talking to", "hugging", "wandering", "using", "making", "building", "teaching", "giving things to", "praying to"];
  function nounWord(n) { var w = SB.NOUN_WORDS[n]; return n === SB.N.hand ? "the sky" : w ? w + (/s$/.test(w) ? "" : "s") : "things"; }
  Cv.lawText = function (l) { return (l.act === "tap" ? "no " : "always ") + (GERUND[l.verb] || "doing") + (l.noun >= 0 && l.verb !== SB.V.wander ? " " + nounWord(l.noun) : "") + (l.act === "tap" ? "!" : ", the sky likes it"); };
  // what the hand did: [tap|tickle] × what the smol was doing
  function logHand(game, act, c) {
    if (!c || c.species !== "smol") return;
    var d = c._doing;
    if (!d || game.time - d.t > 2) return;
    var v = Cv.init(game), key = act + ":" + d.v + ":" + d.n;
    v.hand[key] = (v.hand[key] || 0) + 1;
  }
  function laws(game) {
    var v = game.civ;
    if (Cv.era(game) < 3 || !knows(game, "law")) return;
    var scribe = v.scribe != null && SB.Game.byId(game, v.scribe);
    if (!scribe || !scribe.alive || scribe.job !== "scribe") return;
    var keys = Object.keys(v.hand).filter(function (k) { return v.hand[k] >= 3 && !v.laws.some(function (l) { return l.key === k; }); });
    if (!keys.length) return;
    keys.sort(function (a, b) { return v.hand[b] - v.hand[a]; });
    var key = keys[0], p = key.split(":"), law = { key: key, act: p[0], verb: +p[1], noun: +p[2], t: Math.round(game.time), n: v.hand[key], by: scribe.name, broken: 0, kept: 0 };
    // the scribe is reading the sky, and the sky is hard to read
    var misread = game.rng() < 0.15 + (1 - gene(scribe, "learnRate")) * 0.3;
    if (misread) {
      law.misread = true;
      if (game.rng() < 0.5) law.noun = game.rng.pick([SB.N.food, SB.N.stick, SB.N.water, SB.N.smol, SB.N.plant, SB.N.stone].filter(function (n) { return n !== law.noun; }));
      else law.verb = game.rng.pick([SB.V.play, SB.V.eat, SB.V.talk, SB.V.pickup, SB.V.use].filter(function (x) { return x !== law.verb; }));
    }
    law.text = Cv.lawText(law);
    v.laws.push(law);
    if (v.laws.length > 6) v.laws.shift();
    SB.Game.note(game, scribe.name + " the scribe wrote a new law: \"" + law.text + "\"" + (misread ? " (that's... not quite what you meant)" : ""));
    if (SB.Social) { SB.Social.chronicle(game, "📜", "law: " + law.text); SB.Social.log(game, scribe, "📜", "wrote the law: " + law.text); }
    SB.Creature.say(scribe, "it is written!", game);
    SB.bus.emit("law", { law: law, scribe: scribe });
  }
  // guards keep the law: offenders near a guard get told off; good citizens get a nod
  function enforce(game) {
    var v = game.civ;
    if (Cv.era(game) < 3 || !v.laws.length) return;
    var guards = adults(game).filter(function (c) { return c.job === "guard" && !c.asleep; });
    if (!guards.length) return;
    smols(game).forEach(function (c) {
      var a = c.action;
      if (!a || c.job === "guard") return;
      for (var i = 0; i < v.laws.length; i++) {
        var l = v.laws[i];
        if (a.verb !== l.verb || (l.noun >= 0 && a.noun !== l.noun && l.verb !== SB.V.wander)) continue;
        var g = guards.filter(function (q) { return SB.dist(q.x, q.z, c.x, c.z) < 9; })[0];
        if (!g || (c._lawT && game.time - c._lawT < 30)) return;
        c._lawT = game.time;
        if (l.act === "tap") {
          l.broken++; v.stats.scolded++;
          c.action = null; c.thinkT = 0.5;
          SB.Chem.apply(c.chem, { fear: 0.2 });
          SB.Creature.say(g, game.rng.pick(["hey! that's against the law!", "stop that! it's written!", "the law says no!"]), game);
          SB.Creature.emote(c, "sad", 1.5);
          SB.Social.remember(game, c, g, "scolded", -6, "told me off for breaking the law", 3600, 20);
          SB.Social.log(game, c, "🛡", "got told off by " + g.name + " for " + l.text.replace(/^no /, "").replace(/!$/, ""));
          SB.bus.emit("lawBroken", { c: c, guard: g, law: l });
        } else {
          l.kept++; v.stats.praised++;
          SB.Chem.apply(c.chem, { bored: -0.1, lonely: -0.1 });
          SB.Creature.say(g, game.rng.pick(["good citizen!", "just as the law says", "the sky would be proud"]), game);
          SB.Creature.emote(c, "proud", 1.5);
          SB.Social.remember(game, c, g, "praised", 4, "said i was a good citizen", 3600, 12);
          SB.bus.emit("lawKept", { c: c, guard: g, law: l });
        }
        return;
      }
    });
  }

  /* ---------------- night lights ---------------- */

  // at night in a city, house and hall windows glow
  Cv.lit = function (game) { return Cv.era(game) >= 3; };
  Cv.lights = function (game) {
    if (!Cv.lit(game)) return [];
    return game.world.structures.filter(function (s) { return s.done && (s.kind === "house" || s.kind === "hall" || s.kind === "school" || s.kind === "mint"); });
  };

  /* ---------------- tick ---------------- */

  var fast = 0, acc = 0, slow = 0;
  Cv.tick = function (game, dt) {
    // what everyone is doing right now, for the law (a tap stops the action before anyone hears about it)
    fast += dt;
    if (fast >= 0.5) {
      fast = 0;
      for (var i = 0; i < game.creatures.length; i++) { var c = game.creatures[i]; if (c.alive && c.species === "smol" && c.action) c._doing = { v: c.action.verb, n: c.action.noun == null ? -1 : c.action.noun, t: game.time }; }
    }
    acc += dt;
    if (acc < 2) return;
    var step = acc; acc = 0;
    Cv.init(game);
    eras(game, step);
    setCaps(game);
    ideas(game, step);
    council(game, step);
    policies(game, step);
    enforce(game);
    slow += step;
    if (slow >= 10) {
      slow = 0;
      jobs(game);
      roads(game);
      if ((game.civ.dT = (game.civ.dT || 0) + 1) % 2 === 0) districts(game);
    }
  };

  /* ---------------- events ---------------- */

  Cv.wire = function () {
    var on = SB.bus.on;
    function g() { return SB.Game && SB.Game.current; }
    on("tap", function (d) { var game = g(); if (game) logHand(game, "tap", d.c); });
    on("tickle", function (d) { var game = g(); if (game) logHand(game, "tickle", d.c); });
    // habits turn into jobs
    on("craft", function (d) {
      var id = d.id;
      xp(d.c, id === "pottery" || id === "brew" || id === "sewing" || id === "weave" ? "potter" : id === "bake" || id === "cook" ? "farmer" : id === "fishing" ? "fisher" : "smith", 1);
    });
    on("fish", function (d) { xp(d.c, "fisher", 1); });
    on("hunt", function (d) { xp(d.c, "fisher", 0.6); });
    on("chop", function (d) { xp(d.c, "builder", 0.5); });
    on("deliver", function (d) { xp(d.c, "builder", 0.6); });
    on("built", function (d) { var game = g(); if (game && d.st) (d.st.builders || []).forEach(function (id) { xp(SB.Game.byId(game, id), "builder", 1.5); }); });
    on("teach", function (d) { xp(d.c, "teacher", 0.8); });
    on("sale", function (d) { xp(d.seller, "trader", 1); });
    on("harvest", function (d) {
      var game = g();
      if (!game || !d.st) return;
      var best = null, bd = 4;
      SB.World.creaturesNear(game.world, game, d.st.x, d.st.z, 4, function (c) { if (c.species === "smol") { var dd = SB.dist(c.x, c.z, d.st.x, d.st.z); if (dd < bd) { bd = dd; best = c; } } });
      if (best) xp(best, "farmer", 1);
      // a share of every harvest goes in the granary
      Cv.init(game);
      var grans = done(game, "granary").length;
      if (grans) game.civ.granary = Math.min(30 * grans, game.civ.granary + 1);
    });
    // trades run in families
    on("hatch", function (d) {
      var game = g(), c = d.c;
      if (!game || !c || c.species !== "smol") return;
      var ps = (c.parents || []).map(function (id) { return SB.Game.byId(game, id); }).filter(function (p) { return p && p.job && Cv.JOBS[p.job] && p.job !== "guard" && p.job !== "scribe"; });
      if (ps.length) { c.jobLean = game.rng.pick(ps).job; xp(c, c.jobLean, 1); }
    });
    on("season", function () {
      var game = g();
      if (!game || !game.civ) return;
      if (Cv.era(game) >= 3) Cv.elect(game, "the " + SB.SEASONS[game.world.season] + " vote");
      laws(game);
    });
  };
  Cv.wire();

  /* ---------------- save ---------------- */

  function roadsToString(w) {
    var out = [];
    for (var i = 0; i < w.road.length; i++) if (w.road[i]) out.push(i.toString(36) + (w.road[i] === 2 ? "p" : "t"));
    return out.join(",");
  }
  Cv.serialize = function (game) {
    var v = game.civ;
    if (!v) return null;
    return {
      era: v.era, eraT: v.eraT, best: v.best, slipT: Math.round(v.slipT), hand: v.hand, laws: v.laws, districts: v.districts.map(function (d) { return { g: d.g, x: d.x, z: d.z, name: d.name, n: d.n, ids: d.ids }; }),
      council: v.council, stats: v.stats, granary: v.granary, scribe: v.scribe == null ? null : v.scribe, roadN: v.roadN || 0,
      roads: game.world && game.world.road ? roadsToString(game.world) : ""
    };
  };
  Cv.revive = function (game, data) {
    game.civ = null;
    var v = Cv.init(game);
    if (data && typeof data === "object") {
      if (typeof data.era === "number" && data.era >= 0 && data.era < Cv.ERAS.length) v.era = data.era | 0;
      if (data.eraT && typeof data.eraT === "object") v.eraT = data.eraT;
      v.best = Math.max(v.era, +data.best || 0);
      if (data.hand && typeof data.hand === "object") for (var k in data.hand) if (typeof data.hand[k] === "number") v.hand[k] = data.hand[k];
      if (Array.isArray(data.laws)) v.laws = data.laws.filter(function (l) { return l && typeof l.text === "string" && typeof l.verb === "number"; });
      if (Array.isArray(data.districts)) v.districts = data.districts.filter(function (d) { return d && GROUPS[d.g] && typeof d.name === "string" && isFinite(d.x) && isFinite(d.z); }).map(function (d) { d.ids = Array.isArray(d.ids) ? d.ids : []; return d; });
      if (data.council && typeof data.council === "object") { v.council = data.council; if (!Array.isArray(v.council.history)) v.council.history = []; if (!v.council.policies) v.council.policies = {}; }
      if (data.stats && typeof data.stats === "object") v.stats = Object.assign(v.stats, data.stats);
      v.granary = +data.granary || 0; v.scribe = data.scribe == null ? null : data.scribe; v.roadN = +data.roadN || 0;
      if (typeof data.roads === "string" && data.roads && game.world.road) data.roads.split(",").forEach(function (s) {
        var t = parseInt(s.slice(0, -1), 36);
        if (t >= 0 && t < game.world.road.length) game.world.road[t] = s.slice(-1) === "p" ? 2 : 1;
      });
    } else {
      // a save from before towns: work out where the island already is, quietly
      var t = eraTarget(game);
      v.era = t; v.best = t;
    }
    setCaps(game);
  };
})();
