/* smol brains — mind.js
   Everything a smol's neural net doesn't do on its own: the rest of a mind, built in layers that switch
   on as a species evolves (so a blob is a bundle of reflexes and an ascended smol thinks in full sentences).

   1. episodic memory (all): a short diary of vivid moments (what, where, how it felt), each with a salience
      that fades over time unless it's replayed. better memory genes and bigger brains forget slower.
   2. a cognitive map (critter+): remembered places (food, water, fire, beds, danger) that steer wandering,
      checked against reality when the smol gets there (the berries were gone: that place loses value).
   3. sleep replay (all): a buffer of recent experiences (input, action, reward). asleep, the brain retrains
      on them, vivid ones first: real experience replay, like a hippocampus at night. the smol "dreams".
   4. curiosity (all, scaled by the curiosity gene, damped by fear): an intrinsic reward for doing new things
      to new kinds of thing, and for a world that keeps surprising its predictions.
   5. theory of mind (tribe+): reads other smols' moods from what's visible (more accurately the cleverer and
      more affectionate it is), then comforts sad friends, steers clear of angry ones, feeds hungry kin and
      follows skilled teachers around to watch them.
   6. goals (builder+): a utility-based goal chosen from drives and memories, held for a while (no
      dithering), that biases what the net picks and where the smol walks. thinkers weigh the runner-up.
   7. an inner voice: feel → want → remember → read → decide, in smol words, for the card and the brain viewer.

   Persistent state is c.mind (saved, compact); working state is c._mt (not saved: the replay buffer and
   the current goal are rebuilt by living). */
(function () {
  "use strict";
  var SB = window.SB;
  var Mi = (SB.Mind = {});
  var V = SB.V, D = SB.D;

  function gene(c, k, d) { var g = c.genome && c.genome.genes; return g && g[k] != null ? g[k] : d; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---------------- state ---------------- */
  function ensure(c) {
    var m = c.mind;
    if (!m || typeof m !== "object") m = c.mind = {};
    if (!Array.isArray(m.ep)) m.ep = [];
    if (!Array.isArray(m.pl)) m.pl = [];
    if (!m.val || typeof m.val !== "object") m.val = {};
    if (!m.seen || typeof m.seen !== "object") m.seen = {};
    if (typeof m.nr !== "number") m.nr = 0; // replays, ever
    if (!c._mt) c._mt = { rb: [], rbHead: 0, goal: null, read: null, dreamT: 2, nt: 0, cur: 0, why: null };
    return m;
  }
  Mi.ensure = ensure;
  // revive: keep only well-formed bits of a saved mind
  Mi.revive = function (c) {
    var m = c.mind;
    c.mind = null; c._mt = null;
    ensure(c);
    if (!m || typeof m !== "object") return;
    var n = c.mind;
    if (Array.isArray(m.ep)) n.ep = m.ep.filter(function (e) { return e && typeof e.w === "string" && isFinite(e.t) && isFinite(e.s); }).slice(-24);
    if (Array.isArray(m.pl)) n.pl = m.pl.filter(function (p) { return p && typeof p.k === "string" && isFinite(p.x) && isFinite(p.z) && isFinite(p.v); }).slice(-24);
    if (m.val && typeof m.val === "object") for (var k in m.val) if (isFinite(m.val[k])) n.val[k] = clamp(+m.val[k], -1, 1);
    if (m.seen && typeof m.seen === "object") for (var s in m.seen) if (isFinite(m.seen[s])) n.seen[s] = Math.min(999, +m.seen[s] | 0);
    if (isFinite(m.nr)) n.nr = +m.nr;
    if (m.dream && typeof m.dream.w === "string") n.dream = { w: m.dream.w, t: +m.dream.t || 0 };
  };

  // how much each layer holds, by tier
  function caps(c) {
    var t = c.tier || 0;
    return { ep: 4 + t * 2, pl: c.tier >= 1 ? 3 + t * 3 : 1, rb: 12 + t * 4 };
  }
  Mi.caps = caps;
  function tau(c) { return 600 * (0.6 + 1.6 * gene(c, "memory", 0.5)) * (1 + (c.tier || 0) * 0.5); }
  function sal(c, e, now) { return e.s * Math.exp(-Math.max(0, now - e.t) / tau(c)); }
  Mi.salience = sal;

  /* ---------------- 1. episodic memory ---------------- */
  // k: kind of memory (food, hurt, social, sky, idea, loss, place, life); w: what happened, in smol words
  Mi.remember = function (c, game, k, w, s, x, z, about) {
    if (!c || c.species !== "smol" || !c.alive) return null;
    var m = ensure(c), now = game.time, i;
    for (i = m.ep.length - 1; i >= 0; i--) {
      var o = m.ep[i];
      if (o.w === w && now - o.t < 90) { o.s = Math.min(1.5, sal(c, o, now) + s * 0.5); o.t = now; return o; } // the same thing again: it sticks harder
    }
    var e = { t: now, k: k, w: w, s: clamp(s, 0, 1.5) };
    if (x != null) { e.x = Math.round(x * 10) / 10; e.z = Math.round(z * 10) / 10; }
    if (about) e.a = about;
    m.ep.push(e);
    var cap = caps(c).ep;
    while (m.ep.length > cap) { // forget the faintest
      var wi = 0, wv = 1e9;
      for (i = 0; i < m.ep.length; i++) { var v = sal(c, m.ep[i], now); if (v < wv) { wv = v; wi = i; } }
      m.ep.splice(wi, 1);
    }
    return e;
  };
  // the most vivid memories right now, optionally of one kind
  Mi.vivid = function (c, game, n, k) {
    var m = ensure(c), now = game.time;
    return m.ep.filter(function (e) { return !k || e.k === k; }).map(function (e) { return { e: e, v: sal(c, e, now) }; })
      .sort(function (a, b) { return b.v - a.v; }).slice(0, n || 3).map(function (o) { return o.e; });
  };

  /* ---------------- 2. the cognitive map ---------------- */
  function placeName(game, label, x, z) {
    var w = game.world, b = SB.BIOMES[SB.World.biomeAt(w, x, z)], home = SB.Society ? SB.Society.home(game, 0) : w.T.spawn;
    var d = SB.dist(x, z, home.x, home.z);
    return label + (d < 9 ? " near home" : " in the " + (b ? b.name : "wild"));
  }
  Mi.placeName = placeName;
  // k: food | water | fire | bed | danger
  Mi.learnPlace = function (c, game, k, x, z, label, v) {
    if (!c || c.species !== "smol" || !isFinite(x) || !isFinite(z)) return null;
    var m = ensure(c), now = game.time, i, p;
    for (i = 0; i < m.pl.length; i++) {
      p = m.pl[i];
      if (p.k === k && SB.dist(p.x, p.z, x, z) < 4) {
        p.x += (x - p.x) * 0.3; p.z += (z - p.z) * 0.3;
        p.v = clamp(Math.max(p.v * 0.9 + v * 0.3, v), 0, 1.5); p.t = now;
        if (label) p.l = label;
        return p;
      }
    }
    p = { k: k, x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, v: clamp(v, 0, 1.5), t: now, l: label || k };
    m.pl.push(p);
    var cap = caps(c).pl;
    while (m.pl.length > cap) {
      var wi = 0, wv = 1e9;
      for (i = 0; i < m.pl.length; i++) { var q = m.pl[i], s = q.v * Math.exp(-(now - q.t) / (tau(c) * 3)); if (s < wv) { wv = s; wi = i; } }
      m.pl.splice(wi, 1);
    }
    return p;
  };
  // best remembered place of a kind: valuable, fresh and not too far
  Mi.recall = function (c, game, k, minD) {
    var m = ensure(c), best = null, bs = 0, now = game.time;
    for (var i = 0; i < m.pl.length; i++) {
      var p = m.pl[i];
      if (p.k !== k) continue;
      var d = SB.dist(p.x, p.z, c.x, c.z);
      if (minD && d < minD) continue;
      var s = p.v * Math.exp(-(now - p.t) / (tau(c) * 3)) / (1 + d / 30);
      if (s > bs) { bs = s; best = p; }
    }
    return best;
  };
  // is a spot somewhere this smol has learned to fear?
  Mi.dangerAt = function (c, game, x, z) {
    var m = c.mind;
    if (!m || !m.pl) return null;
    for (var i = 0; i < m.pl.length; i++) { var p = m.pl[i]; if (p.k === "danger" && p.v > 0.3 && SB.dist(p.x, p.z, x, z) < 6 && game.time - p.t < tau(c) * 2) return p; }
    return null;
  };

  // what the eyes take in on a look around: good places go on the map, remembered ones get checked
  var FOODY = {};
  Mi.notice = function (c, game, cands) {
    if (c.species !== "smol" || c.tier < 1) return;
    var mt = c._mt || (ensure(c), c._mt);
    if ((mt.nt = (mt.nt + 1) % 3) !== 0) return; // a proper look every third thought is plenty
    var sawFood = false, w = game.world;
    for (var i = 0; i < cands.length; i++) {
      var cd = cands[i], noun = SB.NOUNS[cd.noun];
      if (cd.d > 7) continue;
      var t = cd.t;
      if (noun === "food" || noun === "plant") {
        var r = SB.Creature.resolve(game, t);
        if (!r) continue;
        var fruit = noun === "food" || (r.type === "node" && FOODY[r.kind] == null ? (FOODY[r.kind] = !!(SB.NODES[r.kind] && SB.NODES[r.kind].drops && SB.KINDS[SB.NODES[r.kind].drops] && SB.KINDS[SB.NODES[r.kind].drops].noun === "food")) : FOODY[r.kind]);
        if (!fruit) continue;
        sawFood = true;
        if (r.type === "node") Mi.learnPlace(c, game, "food", r.x, r.z, placeName(game, (SB.NODES[r.kind] || {}).label || "food", r.x, r.z), 0.5);
      } else if (noun === "water") Mi.learnPlace(c, game, "water", t.x, t.z, placeName(game, "water", t.x, t.z), 0.4);
      else if (noun === "fire" && t.type === "struct") { var fs = SB.Creature.resolve(game, t); if (fs) Mi.learnPlace(c, game, "fire", fs.x, fs.z, placeName(game, "a fire", fs.x, fs.z), 0.6); }
      else if (noun === "grump" && w.night) Mi.learnPlace(c, game, "danger", c.x, c.z, placeName(game, "grumps", c.x, c.z), 0.5);
    }
    // reality check: standing where food was, and there's none to be seen
    var m = c.mind;
    for (var j = m.pl.length - 1; j >= 0; j--) {
      var p = m.pl[j];
      if (p.k !== "food" || SB.dist(p.x, p.z, c.x, c.z) > 3.5 || sawFood) continue;
      p.v *= 0.5; p.t = game.time;
      if (p.v < 0.15) { m.pl.splice(j, 1); if (c.tier >= 2) Mi.remember(c, game, "place", "the " + p.l + " had no food left", 0.3); }
    }
  };

  /* ---------------- 3. sleep replay ---------------- */
  function pushReplay(c, x, a, r) {
    var mt = c._mt, cap = caps(c).rb;
    if (!x || x.length !== c.brain.nIn) return;
    var e = { x: x, a: a, r: r };
    if (mt.rb.length < cap) mt.rb.push(e);
    else { mt.rb[mt.rbHead] = e; mt.rbHead = (mt.rbHead + 1) % cap; }
  }
  // asleep: every few seconds, relive a few experiences (prioritised by how much they mattered)
  Mi.sleep = function (c, game, dt) {
    if (c.species !== "smol") return;
    var mt = c._mt || (ensure(c), c._mt);
    if ((mt.dreamT -= dt) > 0) return;
    mt.dreamT = game.offline ? 12 : 4;
    var rb = mt.rb, m = c.mind;
    if (!rb.length) return;
    var n = 2 + Math.floor((c.tier || 0) / 2), tot = 0, i, rng = game.rng;
    for (i = 0; i < rb.length; i++) tot += Math.abs(rb[i].r) + 0.05;
    var frac = c.brain.lr * 0.35, best = null;
    for (var k = 0; k < n; k++) {
      var pick = rng() * tot, e = rb[0];
      for (i = 0; i < rb.length; i++) { pick -= Math.abs(rb[i].r) + 0.05; if (pick <= 0) { e = rb[i]; break; } }
      SB.Brain.replay(c.brain, e.x, e.a, e.r, frac);
      if (!best || Math.abs(e.r) > Math.abs(best.r)) best = e;
      m.nr++;
    }
    // what it dreams about: a vivid memory (which the replay keeps fresh), or the strongest replayed moment
    var viv = Mi.vivid(c, game, 1)[0];
    if (viv && rng() < 0.7) { viv.t = Math.max(viv.t, game.time - tau(c) * 0.25); m.dream = { w: viv.w, t: game.time }; }
    else if (best) {
      var nn = -1; for (i = 0; i < SB.N_NOUNS; i++) if (best.x[SB.IN.NOUN0 + i] > 0.5) { nn = i; break; }
      m.dream = { w: (best.r >= 0 ? "" : "bad dream: ") + SB.VERB_WORDS[best.a] + (nn >= 0 ? " " + SB.NOUNS[nn] : ""), t: game.time };
    }
  };

  /* ---------------- 4. curiosity ---------------- */
  // intrinsic reward for an action just finished: novelty of what it touched, plus how surprising the world
  // has been for its predictions lately. curious genes feel it more; fear smothers it.
  Mi.curiosity = function (c, game, a, tgt) {
    if (c.species !== "smol" || !a || a.verb === V.idle || a.verb === V.sleep || a.verb === V.wander) return 0;
    var m = ensure(c), key = SB.VERBS[a.verb] + ":" + (tgt ? tgt.kind || tgt.noun : "self");
    var n = m.seen[key] || 0;
    m.seen[key] = Math.min(999, n + 1);
    var novelty = 1 / (1 + n), surprise = Math.min(1, Math.abs(c.brain.lastErr || 0));
    var r = (0.4 + gene(c, "curiosity", 0.5)) * (0.12 * novelty + 0.025 * surprise) * (1 - c.chem.fear) * (c.tier >= 1 ? 1 : 0.6);
    c._mt.cur = r;
    if (n === 0 && c.tier >= 1 && tgt && tgt.kind && !c.far) Mi.remember(c, game, "life", "tried something new: " + did(a.verb, tgt), 0.35, c.x, c.z);
    return r;
  };

  // what it did, in the past tense, to what (creatures by name, things with an article)
  var PAST = { wait: "waited by", come: "went up to", eat: "ate", play: "played with", hit: "hit", get: "picked up", drop: "dropped", sleep: "slept by", run: "ran from", talk: "talked with", hug: "hugged", explore: "explored", use: "used", make: "made something from", build: "built", teach: "taught", give: "gave something to", pray: "prayed to" };
  function did(verb, t) {
    var w = SB.VERB_WORDS[verb];
    return (PAST[w] || w) + " " + (t && t.type === "creature" && t.ref && t.ref.species === "smol" ? label(t) : "the " + label(t));
  }
  function label(t) {
    if (!t) return "thing";
    var d = t.type === "node" ? SB.NODES[t.kind] : t.type === "struct" ? SB.STRUCTS[t.kind] : t.type === "creature" ? null : SB.KINDS[t.kind];
    if (t.type === "creature" && t.ref) return t.ref.species === "smol" ? t.ref.name : t.ref.species;
    return (d && d.label) || t.noun || t.kind || "thing";
  }

  // everything an action taught it: replay buffer, how it feels about that kind of thing, places, the diary
  Mi.experience = function (c, game, a, tgt, r) {
    if (c.species !== "smol") return;
    var m = ensure(c);
    pushReplay(c, a.x, a.verb, r);
    var noun = tgt ? tgt.noun : null;
    if (noun) m.val[noun] = clamp((m.val[noun] || 0) * 0.85 + r * 0.15, -1, 1);
    if (!tgt) { if (a.verb === V.sleep && c.inBed) Mi.learnPlace(c, game, "bed", c.x, c.z, placeName(game, "a bed", c.x, c.z), 0.7); return; }
    var lb = label(tgt);
    if (a.verb === V.eat && r > 0.05) {
      if (tgt.type === "water") Mi.learnPlace(c, game, "water", tgt.x, tgt.z, placeName(game, "water", tgt.x, tgt.z), 0.6);
      else Mi.learnPlace(c, game, "food", tgt.x, tgt.z, placeName(game, lb, tgt.x, tgt.z), 0.5 + r);
    }
    if (c.chem.pain > 0.3 && r < -0.15) Mi.learnPlace(c, game, "danger", c.x, c.z, placeName(game, lb, c.x, c.z), 0.6);
    // the diary keeps what was vivid
    if (Math.abs(r) > 0.32 && !c.far) {
      var w = a.verb === V.eat ? (r > 0 ? "ate " + lb + ". so good" : "ate " + lb + " and felt awful") :
        did(a.verb, tgt) + (r > 0 ? " and it felt great" : " and it went badly");
      Mi.remember(c, game, a.verb === V.eat ? "food" : r > 0 ? "life" : "hurt", w, Math.min(1, Math.abs(r)), tgt.x, tgt.z, noun);
    }
    // being comforted: talking or cuddling a sad friend lifts them, and they remember who did it
    if (tgt.type === "creature" && tgt.ref && tgt.ref.species === "smol" && (a.verb === V.talk || a.verb === V.cuddle) && c.tier >= 3) {
      var o = tgt.ref;
      if (o.grief || o.chem.lonely > 0.5) {
        SB.Chem.apply(o.chem, { lonely: -0.15 });
        if (o.grief) o.grief.until -= 40;
        Mi.remember(o, game, "social", c.name + " comforted me", 0.6, o.x, o.z, c.name);
        if (SB.Social && SB.Social.log) SB.Social.log(game, o, "🤗", c.name + " cheered me up");
      }
      if (a.verb === V.talk) Mi.tell(c, o, game);
    }
  };
  // talk shares the map: tribe smols pass on their best place to whoever they're chatting with
  Mi.tell = function (c, o, game) {
    if (c.tier < 3 || o.species !== "smol" || !c.mind) return null;
    var best = null;
    c.mind.pl.forEach(function (p) { if (p.k !== "danger" && (!best || p.v > best.v)) best = p; });
    var bad = Mi.dangerAt(c, game, c.x, c.z) || c.mind.pl.filter(function (p) { return p.k === "danger"; })[0];
    var share = bad && game.rng.chance(0.4) ? bad : best;
    if (!share) return null;
    var np = Mi.learnPlace(o, game, share.k, share.x, share.z, share.l, share.v * 0.7);
    if (np && o.tier >= 2) Mi.remember(o, game, "social", c.name + " told me about " + share.l, 0.25, null, null, c.name);
    return np;
  };

  /* ---------------- 5. theory of mind ---------------- */
  // read another smol from the outside: tantrums and tears are obvious; quieter moods take a clever eye
  Mi.read = function (c, o, game) {
    if (o.tantrum || o.chem.anger > 0.6) return { mood: "angry", v: o.chem.anger };
    if (o.grief) return { mood: "sad", v: 0.8 };
    var top = SB.Chem.top(o.chem);
    var acc = clamp(0.35 + c.tier * 0.1 + gene(c, "affection", 0.5) * 0.25, 0, 0.98);
    if (top.v < 0.45 || game.rng() > acc) return { mood: "fine", v: 0 };
    var mood = top.i === D.lonely ? "sad" : top.i === D.hunger ? "hungry" : top.i === D.fear ? "scared" : top.i === D.sick || top.i === D.pain ? "hurting" : top.i === D.anger ? "angry" : top.i === D.tired || top.i === D.sleepy ? "tired" : "fine";
    return { mood: mood, v: top.v };
  };
  // returns something to do for someone else, or null. tribe+ only, never while it has its own emergency
  Mi.social = function (c, game) {
    if (c.species !== "smol" || c.tier < 3 || c.stranger || c.stage < 2) return null;
    var ch = c.chem;
    if (Math.max(ch.hunger, ch.fear, ch.pain, ch.sick, ch.sleepy) > 0.55) return null;
    var rng = game.rng;
    if (!rng.chance(0.12 + gene(c, "affection", 0.5) * 0.16)) return null; // mostly it minds its own business
    var best = null, bp = 0, mt = c._mt || (ensure(c), c._mt), myIdeas = SB.Ideas ? SB.Ideas.count(c) : 0;
    SB.World.creaturesNear(game.world, game, c.x, c.z, 9, function (o) {
      if (o === c || o.species !== "smol" || !o.alive || o.asleep || o.stranger || o.heldBy) return;
      var op = SB.Social ? SB.Social.opinion(game, c, o) : 0, kin = SB.Game.related && SB.Game.related(game, c, o), d = SB.dist(o.x, o.z, c.x, c.z);
      var rd = Mi.read(c, o, game), p = 0, act = null;
      if (rd.mood === "angry" && d < 5 && !(c.grudge && c.grudge.id === o.id)) { p = 0.9; act = { avoid: o, why: o.name + " looks angry. better keep away" }; }
      else if (rd.mood === "sad" && rd.v >= 0.6 && (op >= 5 || kin)) { p = 0.6 + op / 200; act = { verb: !kin && op >= 25 && ch.love < 0.5 ? V.cuddle : V.talk, o: o, why: o.name + " looks sad. i'll cheer them up" }; }
      else if (rd.mood === "hungry" && (kin || op >= 15) && c.holding != null && ch.hunger < 0.45) {
        var h = SB.Game.byId(game, c.holding);
        if (h && h.noun === "food") { p = 0.8; act = { verb: V.give, o: o, why: o.name + " is hungry. they can have my " + ((SB.KINDS[h.kind] || {}).label || "food") }; }
      } else if (SB.Ideas && op >= 0 && ch.bored > 0.25 && (o.plan || (o.action && o.action.verb === V.use)) && SB.Ideas.count(o) >= myIdeas + 3 && d > 2) {
        p = 0.35; act = { verb: V.approach, o: o, why: o.name + " knows lots. i want to watch how they do it" };
      }
      if (act && p > bp) { bp = p; best = act; best.mood = rd.mood; }
    });
    if (best) mt.read = { n: (best.o || best.avoid).name, mood: best.mood, why: best.why, t: game.time };
    return best;
  };

  /* ---------------- 6. goals ---------------- */
  var GOALS = {
    eat: { want: "food", verbs: [V.eat, V.pickup], nouns: { food: 1, plant: 1 }, place: "food" },
    rest: { want: "a good sleep", verbs: [V.sleep], place: "bed" },
    warm: { want: "to get warm", verbs: [V.approach, V.use], nouns: { fire: 1 }, place: "fire" },
    safe: { want: "to feel safe", verbs: [V.flee], nouns: { grump: 1 }, place: "home" },
    friends: { want: "company", verbs: [V.talk, V.cuddle, V.play], nouns: { smol: 1 } },
    play: { want: "something fun", verbs: [V.play], nouns: { toy: 1, ball: 1, bug: 1 } },
    learn: { want: "to find out new things", verbs: [V.use, V.play, V.pickup], place: "frontier" },
    work: { want: "to make something", verbs: [V.make, V.build] }
  };
  Mi.GOALS = GOALS;
  // score every goal from drives and memory, keep the current one unless another is clearly better
  Mi.deliberate = function (c, game, drv) {
    if (c.species !== "smol" || c.tier < 4) return null;
    var mt = c._mt || (ensure(c), c._mt), ch = c.chem, w = game.world;
    var maxD = 0; for (var i = 0; i < drv.length; i++) if (drv[i] > maxD) maxD = drv[i];
    var calm = 1 - maxD, curious = gene(c, "curiosity", 0.5), knowsWork = SB.Ideas && c.ideas && Object.keys(c.ideas).some(function (id) { var d = SB.Ideas.BY_ID[id]; return d && c.ideas[id] >= 1 && (d.kind === "build" || d.kind === "craft"); });
    var U = {
      eat: Math.pow(ch.hunger, 1.4) * 1.3 * (Mi.recall(c, game, "food") ? 1.1 : 0.9),
      rest: Math.max(ch.tired, ch.sleepy) * 0.9 * (w.night ? 1.2 : 0.8),
      warm: ch.cold * 1.1,
      safe: ch.fear * 1.1 + (w.night && !SB.World.nearestFire(w, c.x, c.z, 6) ? 0.1 : 0),
      friends: Math.max(ch.lonely, ch.love) * 0.85,
      play: ch.bored * 0.6,
      learn: calm * (0.15 + curious * 0.35),
      work: knowsWork ? calm * 0.4 : 0
    };
    var order = Object.keys(U).sort(function (a, b) { return U[b] - U[a]; }), top = order[0], cur = mt.goal;
    // commitment: stick with a goal for a while unless something clearly beats it
    if (cur && U[cur.id] != null && game.time - cur.t < 25 && U[top] < U[cur.id] + 0.15) { cur.u = U[cur.id]; return cur; }
    var g = { id: top, u: U[top], t: game.time, alt: order[1], altU: U[order[1]] };
    var DRV = { eat: "hunger", rest: "tiredness", warm: "the cold", safe: "fear", friends: ch.love > ch.lonely ? "love" : "loneliness", play: "boredom", learn: "curiosity", work: "nothing pressing" };
    g.why = c.tier >= 5 ? "i want " + GOALS[top].want + ": " + DRV[top] + " " + Math.round(g.u * 100) + " beats " + (DRV[g.alt] || g.alt) + " " + Math.round(g.altU * 100)
      : "i want " + GOALS[top].want;
    mt.goal = g;
    return g;
  };
  // the current goal's nudge on what the net picks (bias is the creature's per-verb bias array)
  Mi.goalBias = function (c, noun, mask, bias) {
    var g = c._mt && c._mt.goal;
    if (!g) return false;
    var G = GOALS[g.id], used = false;
    if (G.nouns && noun && !G.nouns[noun]) return false;
    var amt = 0.12 + (c.tier >= 5 ? 0.06 : 0);
    for (var i = 0; i < G.verbs.length; i++) if (mask[G.verbs[i]]) { bias[G.verbs[i]] += amt; used = true; }
    return used;
  };
  // memory-guided wandering: walk to where the thing you need was, explore when calm, and keep clear of
  // places that hurt. returns {x, z, why} or null (then the old wander rules apply)
  Mi.wanderTarget = function (c, game) {
    if (c.species !== "smol" || c.tier < 1 || c.stranger) return null;
    ensure(c);
    var ch = c.chem, w = game.world, p = null, why = null;
    if (ch.hunger > 0.5) { p = Mi.recall(c, game, "food", 2.5); why = "i remember food at the " + (p && p.l); }
    if (!p && ch.hot > 0.5) { p = Mi.recall(c, game, "water", 1.5); why = "the " + (p && p.l) + " will cool me down"; }
    if (!p && (ch.cold > 0.45 || (w.night && ch.fear > 0.3))) { p = Mi.recall(c, game, "fire", 2); why = "it's warm and safe by " + (p && p.l); }
    if (!p && (ch.tired > 0.6 || ch.sleepy > 0.6)) { p = Mi.recall(c, game, "bed", 2); why = "i know " + (p && p.l); }
    if (p) { c._mt.why = why; return { x: p.x + game.rng.range(-1, 1), z: p.z + game.rng.range(-1, 1), why: why, place: p }; }
    var g = c._mt.goal;
    var home = SB.Society ? SB.Society.home(game, c.tribe) : w.T.spawn;
    if (g && g.id === "learn" && c.tier >= 4 && game.rng.chance(0.3) && SB.dist(c.x, c.z, home.x, home.z) < 12 + gene(c, "curiosity", 0.5) * 14 + c.tier * 3) {
      // explore: head away from everywhere already on the map (but not so far it loses the tribe)
      var mx = 0, mz = 0, n = 0;
      c.mind.pl.forEach(function (q) { mx += q.x; mz += q.z; n++; });
      var ang = n ? Math.atan2(c.x - mx / n, c.z - mz / n) + game.rng.range(-0.7, 0.7) : game.rng() * 6.283, dist = game.rng.range(6, 10);
      c._mt.why = "i wonder what's out there";
      return { x: c.x + Math.sin(ang) * dist, z: c.z + Math.cos(ang) * dist, why: c._mt.why };
    }
    return null;
  };

  /* ---------------- 7. the inner voice ---------------- */
  function feelWord(c) { var top = SB.Chem.top(c.chem); return top.v > 0.35 ? SB.DRIVE_WORDS[top.i] : "fine"; }
  Mi.monologue = function (c, game) {
    ensure(c);
    var out = [], t = c.tier || 0, mt = c._mt, m = c.mind, now = game.time;
    out.push({ k: "feel", t: "i feel " + feelWord(c) + (mt.cur > 0.08 ? ", and curious" : "") });
    if (t >= 1 && mt.why && c.action && c.action.verb === V.wander) out.push({ k: "think", t: mt.why });
    if (t >= 4 && mt.goal) out.push({ k: "want", t: mt.goal.why });
    else if (t >= 1) { var top = SB.Chem.top(c.chem); if (top.v > 0.4) out.push({ k: "want", t: "i want " + ({ hunger: "food", tired: "a rest", sleepy: "sleep", bored: "fun", lonely: "a friend", pain: "it to stop hurting", fear: "to be safe", cold: "warmth", hot: "shade", sick: "to feel better", love: "a cuddle", anger: "to hit something" })[SB.DRIVES[top.i]] }); }
    if (t >= 2) { var v = Mi.vivid(c, game, 1)[0]; if (v && (!mt.why || mt.why.indexOf(v.w) < 0)) out.push({ k: "remember", t: "i remember: " + v.w }); }
    if (t >= 3 && mt.read && now - mt.read.t < 30) out.push({ k: "read", t: mt.read.why });
    if (c.action || c.plan) out.push({ k: "decide", t: "so: " + SB.Creature.thought(c, game, true).replace(/^[^·]*· /, "") });
    if (m.dream && now - m.dream.t < 240) out.push({ k: "dream", t: "last dream: " + m.dream.w });
    return out;
  };
  // one short clause for the card's thought line (tribe+), or null
  Mi.aside = function (c, game) {
    var mt = c._mt;
    if (!mt || c.tier < 3) return null;
    if (mt.read && game.time - mt.read.t < 12) return mt.read.why;
    if (mt.why && c.action && c.action.verb === V.wander) return mt.why;
    if (c.tier >= 5 && mt.goal && game.time - mt.goal.t < 20) return mt.goal.why;
    return null;
  };

  // the brain viewer's "mind" panel (HTML)
  function esc(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]; }); }
  var LAYERS = [["memories", 0], ["a map in its head", 1], ["dreams that teach", 0], ["curiosity", 0], ["reading others", 3], ["goals", 4], ["weighing choices", 5]];
  Mi.panel = function (c, game) {
    ensure(c);
    var m = c.mind, mt = c._mt, now = game.time, t = c.tier || 0, h = [];
    h.push("<div class='mindv'>" + Mi.monologue(c, game).map(function (l) { return "<div class='ml " + l.k + "'><b>" + l.k + "</b> " + esc(l.t) + "</div>"; }).join("") + "</div>");
    h.push("<div class='mindl'>" + LAYERS.map(function (L) { return "<span class='" + (t >= L[1] ? "on" : "off") + "'>" + (t >= L[1] ? "✔ " : "🔒 ") + L[0] + "</span>"; }).join(" ") + "</div>");
    var viv = Mi.vivid(c, game, 5);
    h.push("<div class='mindh'>memories (" + m.ep.length + "/" + caps(c).ep + ")</div>" + (viv.length ? viv.map(function (e) { return "<div class='mm'>" + esc(e.w) + " <span class='dim'>" + Math.max(1, Math.round((now - e.t) / 60)) + "m ago · " + Math.min(100, Math.round(sal(c, e, now) * 100)) + "%</span></div>"; }).join("") : "<div class='dim'>nothing vivid yet</div>"));
    if (t >= 1) {
      var pls = m.pl.slice().sort(function (a, b) { return b.v - a.v; }).slice(0, 5);
      var ICON = { food: "🍎", water: "💧", fire: "🔥", bed: "🛏", danger: "⚠️" };
      h.push("<div class='mindh'>places it knows (" + m.pl.length + "/" + caps(c).pl + ")</div>" + (pls.length ? pls.map(function (p) { return "<div class='mm'>" + (ICON[p.k] || "•") + " " + esc(p.l) + " <span class='dim'>" + Math.round(SB.dist(p.x, p.z, c.x, c.z)) + "m away</span></div>"; }).join("") : "<div class='dim'>none yet</div>"));
    }
    h.push("<div class='mindh'>sleep</div><div class='mm'>" + (mt.rb.length) + " moments waiting to be dreamed over · " + m.nr + " replayed so far" + (m.dream ? "<br><span class='dim'>last dream: " + esc(m.dream.w) + "</span>" : "") + "</div>");
    return h.join("");
  };

  /* ---------------- life events that become memories ---------------- */
  function hook() {
    var on = SB.bus.on, G = function () { return SB.Game.current; };
    on("hit", function (e) {
      var g = G(); if (!g || !e || !e.target || e.target.species !== "smol") return;
      var who = e.c.species === "smol" ? e.c.name : "a grump";
      Mi.remember(e.target, g, "hurt", who + " hit me", e.kind === "shove" ? 0.35 : 0.8, e.target.x, e.target.z, e.c.species === "smol" ? e.c.name : "grump");
      if (e.c.species === "grump") Mi.learnPlace(e.target, g, "danger", e.target.x, e.target.z, placeName(g, "grumps", e.target.x, e.target.z), 0.9);
    });
    on("death", function (e) {
      var g = G(); if (!g || !e || !e.c || e.c.species !== "smol") return;
      var dead = e.c;
      g.creatures.forEach(function (o) {
        if (o === dead || !o.alive || o.species !== "smol") return;
        var op = SB.Social ? SB.Social.opinion(g, o, dead) : 0, kin = SB.Game.related && SB.Game.related(g, o, dead);
        if (op >= 20 || kin) Mi.remember(o, g, "loss", dead.name + " died" + (e.cause === "old" ? " of old age" : ""), kin ? 1.2 : 0.9, dead.x, dead.z, dead.name);
      });
    });
    on("tickle", function (e) { var g = G(); if (g && e && e.c) Mi.remember(e.c, g, "sky", "the sky tickled me", 0.35); });
    on("tap", function (e) { var g = G(); if (g && e && e.c) Mi.remember(e.c, g, "sky", "the sky told me off", 0.35); });
    on("eureka", function (e) { var g = G(); if (g && e && e.c && SB.Ideas) { var d = SB.Ideas.BY_ID[e.id]; if (d) Mi.remember(e.c, g, "idea", "i figured out " + d.name + "!", e.first ? 1.1 : 0.7, e.c.x, e.c.z); } });
    on("give", function (e) { var g = G(); if (g && e && e.to && e.c) Mi.remember(e.to, g, "social", e.c.name + " gave me " + ((e.item && SB.KINDS[e.item.kind] && SB.KINDS[e.item.kind].label) || "something"), 0.6, null, null, e.c.name); });
    on("prayerAnswered", function (e) { var g = G(); if (g && e && e.c) Mi.remember(e.c, g, "sky", "i prayed and the sky answered", 0.9); });
    on("hatch", function (e) {
      var g = G(); if (!g || !e || !e.c || e.c.species !== "smol") return;
      var kid = e.c;
      (kid.parents || []).forEach(function (pid) {
        var p = SB.Game.byId(g, pid);
        if (!p || !p.alive || p.species !== "smol") return;
        Mi.remember(p, g, "life", "my baby " + kid.name + " hatched", 1.2, kid.x, kid.z, kid.name);
        // parents who can think pass on where the good things are
        if (p.tier >= 2 && p.mind) p.mind.pl.slice().sort(function (a, b) { return b.v - a.v; }).slice(0, 2 + Math.floor(p.tier / 2)).forEach(function (q) { Mi.learnPlace(kid, g, q.k, q.x, q.z, q.l, q.v * 0.6); });
      });
    });
  }
  if (SB.bus) hook();
})();
