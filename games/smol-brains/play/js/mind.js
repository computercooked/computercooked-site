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
   8. beliefs with sources (critter+): every claim a smol holds says where it came from (i saw it, Mo told me,
      i dreamt it, the sky one showed me) and how sure it is. what you're told counts as much as you trust the teller.
   9. other minds (tool-user+): smols know who saw what. they hide food where rivals can't see, sneaky ones
      steal what they watched being hidden, disagreeable ones tell lies, and a lie is caught when it meets the
      memory of the one it was about (trust drops, and the liar gets a name for it).
  10. plans you can watch (tool-user+): every plan shows over the head as pictures (🪨→🔥→🍖). a failed step is
      crossed out and it re-plans on the spot; plans that work become named routines it can teach.
  11. reflection (critter+): asleep, it sums its days up into values (bravery, sharing, tradition, faith in the
      sky, knowledge), says "i am…" about itself, notices when it changed its mind, and acts on who it thinks it is.
  12. culture as a crowd (tribe+): a miracle gets credited to whatever the smols nearby were doing, and a belief
      enough of them share becomes a ritual. a place where someone died becomes taboo. kids inherit their
      parents' most vivid stories, and everyone drifts toward what the smols around them believe.

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
    if (!Array.isArray(m.bel)) m.bel = []; // beliefs (8)
    if (!m.tr || typeof m.tr !== "object") m.tr = {}; // trust, by id (9)
    if (!Array.isArray(m.sk)) m.sk = []; // routines that worked (10)
    if (!m.vals || typeof m.vals !== "object") m.vals = {}; // who it thinks it is (11)
    if (!c._mt) c._mt = { rb: [], rbHead: 0, goal: null, read: null, dreamT: 2, nt: 0, cur: 0, why: null, mp: null, pf: null, rp: null, sT: 0 };
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
    n.pl.forEach(function (p) { if (p.s != null && SRC[p.s] == null) delete p.s; if (p.bn != null && typeof p.bn !== "string") delete p.bn; });
    if (Array.isArray(m.bel)) n.bel = m.bel.filter(function (b) { return b && typeof b.c === "string" && typeof b.w === "string" && SRC[b.src] != null && isFinite(b.f) && isFinite(b.t) && (b.x == null || (isFinite(b.x) && isFinite(b.z))); })
      .slice(-30).map(function (b) { b.f = clamp(+b.f, 0, 1); if (b.bn != null && typeof b.bn !== "string") delete b.bn; return b; });
    if (m.tr && typeof m.tr === "object") Object.keys(m.tr).slice(0, 60).forEach(function (id) { if (isFinite(m.tr[id])) n.tr[id] = clamp(+m.tr[id], 0, 1); });
    if (Array.isArray(m.sk)) n.sk = m.sk.filter(function (s) { return s && typeof s.id === "string" && typeof s.n === "string" && typeof s.ic === "string" && isFinite(s.ok); }).slice(-10);
    if (m.vals && typeof m.vals === "object") VALS.forEach(function (k) { if (isFinite(m.vals[k])) n.vals[k] = clamp(+m.vals[k], -1, 1); });
    if (m.was && typeof m.was.w === "string" && isFinite(m.was.t)) n.was = { w: m.was.w, t: +m.was.t };
    if (m.st && isFinite(m.st.id) && isFinite(m.st.x) && isFinite(m.st.z)) n.st = { id: +m.st.id, x: +m.st.x, z: +m.st.z, t: +m.st.t || 0, l: typeof m.st.l === "string" ? m.st.l : "a hiding spot", w: Array.isArray(m.st.w) ? m.st.w.filter(isFinite).slice(0, 12) : [] };
    ["pq", "pa", "rf"].forEach(function (k) { if (isFinite(m[k])) n[k] = +m[k]; });
  };

  // where a belief came from, strongest first (seeing beats the sky, which beats being told, which beats a dream)
  var SRC = { seen: 4, god: 3, told: 2, dreamt: 1, guess: 0 };
  var VALS = ["brave", "share", "trad", "faith", "know"];
  var VAL_NAME = { brave: "bravery", share: "sharing", trad: "tradition", faith: "faith in the sky", know: "knowledge" };
  var VAL_ICON = { brave: "🦁", share: "🤝", trad: "🪘", faith: "🙏", know: "💡" };

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
  // k: food | water | fire | bed | danger. src (optional): where the knowledge came from, {s: "told", by, bn}
  // (no src means it saw the place itself, and seeing beats being told)
  Mi.learnPlace = function (c, game, k, x, z, label, v, src) {
    if (!c || c.species !== "smol" || !isFinite(x) || !isFinite(z)) return null;
    var m = ensure(c), now = game.time, i, p;
    for (i = 0; i < m.pl.length; i++) {
      p = m.pl[i];
      if (p.k === k && SB.dist(p.x, p.z, x, z) < 4) {
        p.x += (x - p.x) * 0.3; p.z += (z - p.z) * 0.3;
        p.v = clamp(Math.max(p.v * 0.9 + v * 0.3, v), 0, 1.5); p.t = now;
        if (label) p.l = label;
        if (!src) { delete p.s; delete p.bn; }
        return p;
      }
    }
    p = { k: k, x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, v: clamp(v, 0, 1.5), t: now, l: label || k };
    if (src && src.s) { p.s = src.s; if (src.bn) p.bn = src.bn; }
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
    return Mi.tabooAt(c, game, x, z); // a place someone died: avoided long after the danger is gone
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
    // once a night or so, it thinks over its days: who am i?
    if (c.tier >= 1 && game.time - (m.rf || 0) > 300) reflect(c, game);
    if (viv && rng() < 0.7) { viv.t = Math.max(viv.t, game.time - tau(c) * 0.25); m.dream = { w: viv.w, t: game.time }; dreamBelief(c, game, viv); }
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
  // it tells them something they don't know yet (a smol that can read minds doesn't repeat old news), and
  // how much they take it to heart depends on how much they trust it
  Mi.tell = function (c, o, game) {
    if (c.tier < 3 || o.species !== "smol" || !c.mind) return null;
    ensure(o);
    var knows = function (p) { return o.mind.pl.some(function (q) { return q.k === p.k && SB.dist(q.x, q.z, p.x, p.z) < 5; }); };
    var best = null, bad = null;
    c.mind.pl.forEach(function (p) {
      if (knows(p)) return;
      if (p.k === "danger") { if (!bad || p.v > bad.v) bad = p; }
      else if (!best || p.v > best.v) best = p;
    });
    var share = bad && (game.rng.chance(0.4) || !best) ? bad : best;
    if (!share) { shareRoutine(c, o, game); return shareBelief(c, o, game); }
    var tr = Mi.trust(o, c, game);
    var np = Mi.learnPlace(o, game, share.k, share.x, share.z, share.l, share.v * (0.35 + tr * 0.5), { s: "told", bn: c.name });
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
      else if (rd.mood === "hungry" && (kin || op >= 15) && c.holding != null && ch.hunger < 0.45 && (c.mind.vals.share || 0) > -0.4) {
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
    // who it thinks it is leans on what it wants: "i am brave" frets less, "i want to know everything" explores more
    var vl = c.mind && c.mind.vals;
    if (vl) {
      U.learn = Math.max(0, U.learn + (vl.know || 0) * 0.12);
      U.safe *= 1 - (vl.brave || 0) * 0.25;
      U.friends = Math.max(0, U.friends + (vl.share || 0) * 0.06);
      if (knowsWork) U.work = Math.max(0, U.work + (vl.know || 0) * 0.05 + (vl.trad || 0) * 0.03);
    }
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
    if (ch.hunger > 0.5) { p = Mi.recall(c, game, "food", 2.5); why = p && (p.s === "told" ? (p.bn || "someone") + " told me there's food at the " + p.l : "i saw food at the " + p.l); }
    if (!p && ch.hot > 0.5) { p = Mi.recall(c, game, "water", 1.5); why = "the " + (p && p.l) + " will cool me down"; }
    if (!p && (ch.cold > 0.45 || (w.night && ch.fear > 0.3))) { p = Mi.recall(c, game, "fire", 2); why = "it's warm and safe by " + (p && p.l); }
    if (!p && (ch.tired > 0.6 || ch.sleepy > 0.6)) { p = Mi.recall(c, game, "bed", 2); why = "i know " + (p && p.l); }
    if (p && p.s === "told" && !/told me/.test(why)) why += " (" + (p.bn || "someone") + " said so)";
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
    if (t >= 1) { var bl = Mi.beliefs(c, game).filter(function (b) { return b.k !== "place"; })[0]; if (bl) out.push({ k: "believe", t: Mi.say(bl) }); }
    if (t >= 3 && mt.read && now - mt.read.t < 30) out.push({ k: "read", t: mt.read.why });
    var pb = Mi.bubble(c, game);
    if (pb) out.push({ k: "plan", t: pb.ic.map(function (ic, i) { return pb.x === i ? "✗" + ic : ic; }).join(" → ") + (pb.why ? " · " + pb.why : "") });
    if (c.action || c.plan) out.push({ k: "decide", t: "so: " + SB.Creature.thought(c, game, true).replace(/^[^·]*· /, "") });
    if (m.dream && now - m.dream.t < 240) out.push({ k: "dream", t: "last dream: " + m.dream.w });
    var me = Mi.iam(c);
    if (me.length) out.push({ k: "i am", t: me.join(". ") });
    return out;
  };
  // one short clause for the card's thought line (tribe+), or null
  Mi.aside = function (c, game) {
    var mt = c._mt;
    if (!mt || c.tier < 3) return null;
    if (mt.mp && mt.mp.why) return mt.mp.why;
    if (mt.read && game.time - mt.read.t < 12) return mt.read.why;
    if (mt.why && c.action && c.action.verb === V.wander) return mt.why;
    if (c.tier >= 5 && mt.goal && game.time - mt.goal.t < 20) return mt.goal.why;
    return null;
  };

  // the brain viewer's "mind" panel (HTML)
  function esc(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]; }); }
  var LAYERS = [["memories", 0], ["a map in its head", 1], ["dreams that teach", 0], ["curiosity", 0], ["beliefs", 1], ["knowing who saw what", 2], ["plans", 2], ["reading others", 3], ["values", 1], ["culture", 3], ["goals", 4], ["weighing choices", 5]];
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
    if (t >= 1) {
      var bs = Mi.beliefs(c, game).slice(0, 6), SI = { seen: "👁", told: "💬", dreamt: "💭", god: "✨", guess: "🤔" };
      h.push("<div class='mindh'>what it believes (" + m.bel.length + "/" + bcap(c) + ")</div>" + (bs.length ? bs.map(function (b) { return "<div class='mm'>" + (SI[b.src] || "•") + " " + esc(Mi.say(b)) + " <span class='dim'>" + Math.round(b.f * 100) + "% sure</span></div>"; }).join("") : "<div class='dim'>nothing it's sure of yet</div>"));
    }
    if (t >= 2) {
      var tl = Object.keys(m.tr).map(function (id) { var o = SB.Game.byId(game, +id); return o && o.alive ? { n: o.name, v: m.tr[id] } : null; }).filter(Boolean).sort(function (a, b) { return Math.abs(b.v - 0.55) - Math.abs(a.v - 0.55); }).slice(0, 4);
      if (tl.length) h.push("<div class='mindh'>who it trusts</div><div class='mm'>" + tl.map(function (x) { return esc(x.n) + " <span class='" + (x.v >= 0.55 ? "lime" : "warnc") + "'>" + Math.round(x.v * 100) + "%</span>"; }).join(" · ") + "</div>");
      if (m.st) h.push("<div class='mm'>🙈 hid food by " + esc(m.st.l) + " <span class='dim'>" + (m.st.w.length ? "but " + m.st.w.map(function (id) { var o = SB.Game.byId(game, id); return o ? o.name : "someone"; }).slice(0, 2).join(" and ") + " saw" : "nobody saw") + "</span></div>");
      var pb = Mi.bubble(c, game);
      h.push("<div class='mindh'>plan</div><div class='mm'>" + (pb ? pb.ic.map(function (ic, i) { return "<span class='" + (pb.x === i ? "warnc' style='text-decoration:line-through" : i === pb.i ? "lime" : i < pb.i ? "dim" : "") + "'>" + esc(ic) + "</span>"; }).join(" → ") + (pb.why ? " <span class='dim'>" + esc(pb.why) + "</span>" : "") : "<span class='dim'>no plan right now</span>") + "</div>");
      if (m.sk.length) h.push("<div class='mindh'>routines it knows</div>" + m.sk.slice(-4).map(function (s) { return "<div class='mm'>" + esc(s.ic) + " " + esc(s.n) + " <span class='dim'>×" + s.ok + (s.by ? " · learned from " + esc(s.by) : "") + "</span></div>"; }).join(""));
    }
    if (t >= 1 && Object.keys(m.vals).length) {
      h.push("<div class='mindh'>who it thinks it is</div><div class='mm'>" + VALS.map(function (k) { var v = m.vals[k] || 0; return VAL_ICON[k] + " " + VAL_NAME[k] + " <span class='" + (v > 0.15 ? "lime" : v < -0.15 ? "warnc" : "dim") + "'>" + (v > 0 ? "+" : "") + Math.round(v * 100) + "</span>"; }).join(" · ") +
        (Mi.iam(c).length ? "<br>“" + esc(Mi.iam(c).join(". ")) + "”" : "") + (m.was ? "<br><span class='lilac'>“" + esc(m.was.w) + "”</span>" : "") + "</div>");
    }
    var lo = game.lore;
    if (t >= 3 && lo && (lo.rit.length || lo.tab.length)) h.push("<div class='mindh'>the tribe's ways</div>" + lo.rit.map(function (r) { return "<div class='mm'>🪘 " + esc(ritualName(r)) + (Mi.belief(c, r.c) ? "" : " <span class='dim'>(it doesn't believe it)</span>") + "</div>"; }).join("") +
      lo.tab.filter(function (x) { return !x.off; }).map(function (x) { var mine = Mi.belief(c, x.c); return "<div class='mm'>⛔ nobody goes to the " + esc(x.l) + " <span class='dim'>" + (mine ? Math.round(mine.f * 100) + "% believes it" : "it doesn't care") + "</span></div>"; }).join(""));
    return h.join("");
  };
  // a line for the card, under the thought: who it thinks it is, or how it changed its mind
  Mi.cardLine = function (c, game) {
    var m = c.mind;
    if (!m || c.species !== "smol" || c.tier < 1) return "";
    if (m.was && game.time - m.was.t < 1500) return "<div class='note lilac'>“" + esc(m.was.w) + "”</div>";
    var me = Mi.iam(c);
    return me.length ? "<div class='note dim'>“" + esc(me.join(". ")) + "”</div>" : "";
  };

  /* ---------------- 8. beliefs, with where they came from ---------------- */
  // a belief: {c: claim key, w: the claim in smol words, src: seen | told | dreamt | god | guess, bn: who said so,
  //   f: how sure (0..1), t: when, k: who | stash | sup | taboo | heir | sky | dream, and what it's about
  //   (a: a smol's id, x/z/l: a spot, m: a miracle, v: a verb, it: an item, lie: 1 when it isn't true)}
  function bcap(c) { return 3 + (c.tier || 0) * 2; }
  Mi.bcap = bcap;
  var BKEYS = ["bn", "a", "x", "z", "l", "m", "v", "it", "lie", "by"];
  Mi.believe = function (c, game, b) {
    if (!c || c.species !== "smol" || !c.alive || !b || typeof b.c !== "string" || typeof b.w !== "string") return null;
    var m = ensure(c), now = game.time, src = SRC[b.src] != null ? b.src : "told", f = clamp(+b.f || 0.4, 0.02, 1), i, e;
    for (i = 0; i < m.bel.length; i++) {
      e = m.bel[i];
      if (e.c !== b.c) continue;
      e.f = clamp(e.f + (1 - e.f) * f * 0.5, 0, 1); e.t = now; // heard (or seen) again: surer
      if (SRC[src] > SRC[e.src]) { e.src = src; if (b.bn) e.bn = b.bn; else delete e.bn; e.w = b.w; if (src === "seen") delete e.lie; }
      return e;
    }
    e = { c: b.c, w: b.w, src: src, f: f, t: now, k: b.k || "who" };
    for (i = 0; i < BKEYS.length; i++) if (b[BKEYS[i]] != null) e[BKEYS[i]] = b[BKEYS[i]];
    if (e.x != null) { e.x = Math.round(e.x * 10) / 10; e.z = Math.round(e.z * 10) / 10; }
    m.bel.push(e);
    var cap = bcap(c);
    while (m.bel.length > cap) { // let go of the weakest (old stories, rituals and taboos hang on longer)
      var wi = 0, wv = 1e9;
      for (i = 0; i < m.bel.length; i++) { var q = m.bel[i], s = q.f * Math.exp(-(now - q.t) / (tau(c) * (q.k === "taboo" || q.k === "heir" || q.k === "sup" ? 6 : 2))); if (s < wv) { wv = s; wi = i; } }
      m.bel.splice(wi, 1);
    }
    return e;
  };
  Mi.belief = function (c, claim) { var m = c && c.mind; if (!m || !m.bel) return null; for (var i = 0; i < m.bel.length; i++) if (m.bel[i].c === claim) return m.bel[i]; return null; };
  // less sure (k < 1), and forgotten once it's barely believed
  Mi.doubt = function (c, claim, k) { var e = Mi.belief(c, claim); if (!e) return null; e.f *= k; if (e.f < 0.06) c.mind.bel.splice(c.mind.bel.indexOf(e), 1); return e; };
  var PLACEW = { food: "food", water: "water", fire: "a warm fire", bed: "a good bed", danger: "danger" };
  // everything it holds true, places included, surest first
  Mi.beliefs = function (c, game) {
    var m = ensure(c), now = game.time, out = m.bel.slice();
    m.pl.forEach(function (p) { out.push({ c: "place", k: "place", w: (PLACEW[p.k] || p.k) + " at the " + p.l, src: p.s || "seen", bn: p.bn, f: clamp(p.v * Math.exp(-(now - p.t) / (tau(c) * 3)), 0, 1), t: p.t }); });
    return out.sort(function (a, b) { return b.f - a.f; });
  };
  // a belief out loud, with its source: "i saw it", "Mo told me", "mum said", "everyone says"
  Mi.say = function (b) {
    var who = b.bn || "someone";
    if (b.k === "place") return (b.src === "told" ? who + " told me there's " : "i saw ") + b.w;
    switch (b.src) {
      case "seen": return "i saw it myself: " + b.w;
      case "told": return who === "everyone" ? "everyone says " + b.w : who === "mum" || who === "dad" ? who + " said " + b.w : who + " told me " + b.w;
      case "dreamt": return "i dreamt " + b.w;
      case "god": return "the sky one showed me " + b.w;
      default: return "i bet " + b.w;
    }
  };
  // trust: how much of what o says c takes in. starts middling, follows liking, family trusts family,
  // and moves with every lie caught or story that turned out true
  Mi.trust = function (c, o, game) {
    if (!c || !o) return 0.5;
    var m = ensure(c), base = m.tr[o.id] != null ? m.tr[o.id] : 0.55, op = SB.Social ? SB.Social.opinion(game, c, o) : 0;
    return clamp(base + op / 250 + (SB.Game.related && SB.Game.related(game, c, o) ? 0.1 : 0), 0.03, 1);
  };
  Mi.trustAdj = function (c, o, d) {
    if (!c || !o || c.species !== "smol") return;
    var m = ensure(c), tr = m.tr;
    tr[o.id] = Math.round(clamp((tr[o.id] != null ? tr[o.id] : 0.55) + d, 0, 1) * 100) / 100;
    var ks = Object.keys(tr);
    if (ks.length > 40) { ks.sort(function (a, b) { return Math.abs(tr[a] - 0.55) - Math.abs(tr[b] - 0.55); }); delete tr[ks[0]]; }
  };
  // what it would tell someone who doesn't know it yet: a ritual, a taboo, a story, a thief
  function shareBelief(c, o, game) {
    var tr = Mi.trust(o, c, game), best = null;
    c.mind.bel.forEach(function (b) { if ((b.k === "sup" || b.k === "taboo" || b.k === "heir" || (b.k === "who" && !b.lie)) && b.f >= 0.4 && !Mi.belief(o, b.c) && (!best || b.f > best.f)) best = b; });
    if (!best || (best.a != null && best.a === o.id)) return null;
    return Mi.hear(o, c, game, best, tr);
  }
  Mi.shareBelief = shareBelief;
  // o hears belief b from c: as sure as c was, times how much o trusts c (the obedient take more on board)
  Mi.hear = function (o, c, game, b, tr) {
    if (!b || !o || !c || o.species !== "smol") return null;
    tr = tr == null ? Mi.trust(o, c, game) : tr;
    return Mi.believe(o, game, { c: b.c, k: b.k, w: b.w, src: "told", bn: c.name, by: b.lie ? b.by : c.id, f: b.f * tr * (0.5 + gene(o, "obedience", 0.5) * 0.5), a: b.a, x: b.x, z: b.z, l: b.l, m: b.m, v: b.v, lie: b.lie });
  };

  /* ---------------- 9. other minds: who saw what ---------------- */
  // the smols that could see a spot right now (awake, close, not being carried off)
  Mi.witnesses = function (game, x, z, r, except) {
    var out = [];
    SB.World.creaturesNear(game.world, game, x, z, r || 8, function (o) { if (o !== except && o.alive && o.species === "smol" && !o.asleep && o.stage >= 1 && !o.heldBy && !o.stranger) out.push(o); });
    return out;
  };
  function opn(game, a, b) { return SB.Social ? SB.Social.opinion(game, a, b) : 0; }
  var FRIEND = 25;
  function sneaky(c) { return gene(c, "grumpiness", 0.4) * 0.5 + (1 - gene(c, "obedience", 0.5)) * 0.35 - ((c.mind && c.mind.vals.share) || 0) * 0.2; }
  Mi.sneaky = sneaky;
  function heldFood(c, game) {
    var ids = [c.holding].concat(c.bag || []);
    for (var i = 0; i < ids.length; i++) { if (ids[i] == null) continue; var o = SB.Game.byId(game, ids[i]); if (o && o.noun === "food" && !o.reserved) return o; }
    return null;
  }
  function emoji(kind) { return (SB.KINDS[kind] && SB.KINDS[kind].emoji) || "🍎"; }
  // the nearest thing a smol would name a spot by: a hut, a big rock, a tree, the lake
  function landmark(game, x, z) {
    var w = game.world, best = null, bd = 4.5, wp = SB.World.waterNear ? SB.World.waterNear(w, x, z) : null;
    if (SB.World.depthAt(w, x, z) > 0.15 || (wp && SB.dist(wp.x, wp.z, x, z) < 2.5)) best = { x: x, z: z, l: "lake", water: true };
    if (!best) w.structures.forEach(function (s) { var d = SB.dist(s.x, s.z, x, z), def = SB.STRUCTS[s.kind]; if (d < bd && def && def.label) { bd = d; best = { x: s.x, z: s.z, l: def.label }; } });
    if (!best) SB.World.eachNodeNear(w, x, z, 4, function (n, d2) { if (n.nop) return; var d = Math.sqrt(d2), def = SB.NODES[n.kind]; if (def && def.label && d < bd) { bd = d; best = { x: n.x, z: n.z, l: def.label }; } });
    if (!best) { var b = SB.BIOMES[SB.World.biomeAt(w, x, z)]; best = { x: x, z: z, l: (b ? b.name : "open") + " clearing" }; }
    best.key = best.l.replace(/\s+/g, "_") + "@" + Math.round(best.x / 6) + "," + Math.round(best.z / 6);
    return best;
  }
  Mi.landmark = landmark;
  // somewhere close to hide food, out of sight of anyone it doesn't count as a friend
  function hideSpot(c, game) {
    var w = game.world, rng = game.rng, best = null, bs = 0, home = SB.Society ? SB.Society.home(game, c.tribe) : w.T.spawn, others = [];
    SB.World.creaturesNear(w, game, c.x, c.z, 26, function (o) { if (o !== c && o.alive && o.species === "smol" && !o.asleep && opn(game, c, o) < FRIEND) others.push(o); });
    for (var k = 0; k < 7; k++) {
      var a = rng() * 6.283, d = rng.range(4, 9), x = c.x + Math.sin(a) * d, z = c.z + Math.cos(a) * d;
      if (!SB.World.walkable(w, x, z, false) || SB.World.depthAt(w, x, z) > 0.05 || Mi.dangerAt(c, game, x, z) || SB.dist(x, z, home.x, home.z) > 32) continue;
      var near = 99;
      for (var i = 0; i < others.length; i++) near = Math.min(near, SB.dist(others[i].x, others[i].z, x, z));
      if (near > bs) { bs = near; best = { x: x, z: z, near: near }; }
    }
    return best && best.near >= 8 ? best : null;
  }
  // someone picked up hidden food (creature.js calls this from carry): the owner getting it back, a thief who
  // watched it being hidden, or a lucky find. whoever saw it happen remembers who did it
  Mi.took = function (c, o, game) {
    if (!o || o.hid == null) return;
    var owner = SB.Game.byId(game, o.hid), wit = o.wit || [];
    o.hid = null; o.wit = null;
    if (!owner || owner === c || c.species !== "smol") { if (owner && owner.mind && owner.mind.st && owner.mind.st.id === o.id) owner.mind.st = null; return; }
    var meant = wit.indexOf(c.id) >= 0, SO = SB.Social; // it watched it go in: that's stealing, not finding
    if (owner.mind && owner.mind.st && owner.mind.st.id === o.id) owner.mind.st.thief = c.id;
    c.stats = c.stats || {};
    if (meant) c.stats.thefts = (c.stats.thefts || 0) + 1;
    if (SO) SO.log(game, c, meant ? "🤫" : "🍀", meant ? "took " + owner.name + "'s hidden food" : "found some food someone had hidden");
    Mi.remember(c, game, "food", meant ? "i took " + owner.name + "'s hidden food" : "i found food someone had hidden", 0.5, c.x, c.z, owner.name);
    var claim = "thief:" + c.id + ":" + owner.id;
    Mi.witnesses(game, c.x, c.z, 9, c).forEach(function (w) {
      if (w === owner) {
        if (SO) { SO.remember(game, owner, c, "stole", -24, "stole my food", 3000, 40); SO.log(game, owner, "😠", c.name + " stole my food"); }
        Mi.believe(owner, game, { c: claim, k: "who", w: c.name + " stole my food", src: "seen", f: 0.95, a: c.id });
        Mi.remember(owner, game, "hurt", c.name + " stole my food!", 0.8, owner.x, owner.z, c.name);
        Mi.trustAdj(owner, c, -0.2);
        owner.mind.st = null;
        if (!owner.far) { owner.speech = { text: "hey! that's mine, " + c.name + "!", t: 2.4, kind: "say" }; SB.Creature.emote(owner, "angry", 2); }
      } else if (w.tier >= 2 && meant) Mi.believe(w, game, { c: claim, k: "who", w: c.name + " stole " + owner.name + "'s food", src: "seen", f: 0.85, a: c.id });
    });
    if (meant && SO) SO.checkTitle(game, c);
    SB.bus.emit("theft", { c: c, owner: owner, item: o, meant: meant });
  };
  // can this smol see that hidden item? only its owner and whoever watched it go in
  Mi.canSee = function (c, o) { return o.hid == null || o.hid === c.id || !!(o.wit && o.wit.indexOf(c.id) >= 0); };

  /* ---------------- 10. plans you can watch ---------------- */
  // a mind-made plan: {k, st: [{i: icon, d: what, x, z}], i, t0, why}. it runs between the net's choices, one
  // step per thought, and shows over the head like an idea plan does
  function mplan(c, game, k, steps, why, extra) {
    var p = { k: k, st: steps, i: 0, t0: game.time, why: why };
    if (extra) for (var e in extra) p[e] = extra[e];
    c._mt.mp = p; c._mt.pf = null;
    return p;
  }
  function walkTo(c, game, x, z, dur) {
    SB.Creature.start(c, game, V.wander);
    var a = c.action; a.tx = x; a.tz = z; a.dur = dur || 10; a.why = c._mt.mp && c._mt.mp.why;
    return true;
  }
  function endMind(c, game, ok, failAt, why) {
    var mt = c._mt, p = mt.mp;
    mt.mp = null;
    if (p && !ok && failAt != null) mt.pf = { ic: p.st.map(function (s) { return s.i; }), x: Math.min(failAt, p.st.length - 1), t: game.time, why: why || null };
    return false;
  }
  function failMind(c, game, p, why) { endMind(c, game, false, p.i, why); c._mt.why = why; if (!c.far && game.rng.chance(0.5)) SB.Creature.emote(c, "huh", 1.4); return false; }
  // called from the think loop, before the net picks: returns true when the mind took over this thought
  Mi.scheme = function (c, game) {
    if (c.species !== "smol" || c.tier < 2 || c.stage < 2 || c.stranger || c.convo || c.plan || c.heldBy) return false;
    var mt = c._mt || (ensure(c), c._mt), ch = c.chem, now = game.time;
    var scared = Math.max(ch.fear, ch.pain, ch.sick) > 0.6;
    if (mt.mp) {
      if (now - mt.mp.t0 > 75 || scared || (ch.hunger > 0.85 && mt.mp.k !== "fetch")) return endMind(c, game, false, mt.mp.i, scared ? "too scared to carry on" : null);
      return stepMind(c, game, mt.mp);
    }
    if (scared) return false;
    if (c.mind.st && ch.hunger > 0.5 && fetchStash(c, game)) return true;
    if (ch.hunger > 0.85) return false;
    if (mt.rp) { var rp = mt.rp; mt.rp = null; if (now - rp.t < 8 && replan(c, game, rp)) return true; }
    if (now < mt.sT) return false;
    mt.sT = now + 2.5 + game.rng() * 2.5;
    return (c.tier >= 3 && ritualUrge(c, game)) || stealUrge(c, game) || stashUrge(c, game) || false;
  };
  function stepMind(c, game, p) {
    var s = p.st[p.i];
    if (!s) return endMind(c, game, true);
    switch (s.d) {
      case "have": p.i++; return stepMind(c, game, p); // a picture of what it's carrying: nothing to do
      case "go":
        if (SB.dist(c.x, c.z, s.x, s.z) < (s.r || 1.6)) { p.i++; return stepMind(c, game, p); }
        if ((s.n = (s.n || 0) + 1) > 5) return failMind(c, game, p, "i can't get there");
        return walkTo(c, game, s.x, s.z, 10);
      case "hide": return doHide(c, game, p, s);
      case "dig": return doDig(c, game, p);
      case "take": return doTake(c, game, p, s);
      case "dance": return doDance(c, game, p, s);
      case "ask": p.i++; endMind(c, game, true); SB.Creature.start(c, game, V.pray); return true;
      case "redo": p.i++; endMind(c, game, true); SB.Creature.start(c, game, p.verb); return true;
    }
    p.i++;
    return false;
  }

  // hiding food: carry it somewhere nobody it doesn't trust can see, and if someone turns up, go somewhere else
  function stashUrge(c, game) {
    var m = c.mind, ch = c.chem;
    if (m.st || ch.hunger > 0.45 || c.stage < 2) return false;
    var o = heldFood(c, game);
    if (!o) return false;
    var rivals = 0;
    SB.World.creaturesNear(game.world, game, c.x, c.z, 10, function (x) { if (x !== c && x.alive && x.species === "smol" && (opn(game, c, x) < 0 || x.chem.hunger > 0.5)) rivals++; });
    var worry = (game.world.season === 3 ? 0.15 : 0) + (game.world.night ? 0.05 : 0) - (m.vals.share || 0) * 0.25 + sneaky(c) * 0.25 + Math.min(3, rivals) * 0.08 - 0.1;
    if (!game.rng.chance(clamp(worry, 0, 0.5))) return false;
    var sp = hideSpot(c, game);
    if (!sp) return false;
    var lm = landmark(game, sp.x, sp.z);
    mplan(c, game, "stash", [{ i: emoji(o.kind), d: "have" }, { i: "🙈", d: "go", x: sp.x, z: sp.z, r: 1.3 }, { i: "📍", d: "hide" }],
      rivals ? "i'll hide this where they can't see" : "i'll hide this for later", { item: o.id, l: lm.l });
    return stepMind(c, game, c._mt.mp);
  }
  function doHide(c, game, p, s) {
    var o = SB.Game.byId(game, p.item), m = c.mind;
    if (!o || o.heldBy !== c.id) return failMind(c, game, p, "i lost it on the way");
    var all = Mi.witnesses(game, c.x, c.z, 8, c), wary = all.filter(function (w) { return opn(game, c, w) < FRIEND; });
    if (wary.length && (p.tries = (p.tries || 0) + 1) <= 2) {
      var sp = hideSpot(c, game);
      if (sp) { // someone's watching: cross that spot out, find another
        c._mt.pf = { ic: p.st.map(function (x) { return x.i; }), x: p.i, t: game.time, why: wary[0].name + " is watching" };
        p.st[p.i - 1].x = sp.x; p.st[p.i - 1].z = sp.z; p.st[p.i - 1].n = 0; p.i--;
        p.why = wary[0].name + " is watching. somewhere else";
        p.l = landmark(game, sp.x, sp.z).l;
        return walkTo(c, game, sp.x, sp.z, 10);
      }
    }
    SB.Creature.dropItem(c, o, game, 0.1);
    o.hid = c.id; o.wit = all.map(function (w) { return w.id; });
    var lm = landmark(game, c.x, c.z);
    m.st = { id: o.id, x: Math.round(c.x * 10) / 10, z: Math.round(c.z * 10) / 10, t: game.time, l: "the " + lm.l, w: o.wit.slice(0, 12) };
    all.forEach(function (w) {
      Mi.believe(w, game, { c: "stash:" + c.id, k: "stash", w: c.name + " hides food by the " + lm.l, src: "seen", f: 0.8, a: c.id, it: o.id, x: c.x, z: c.z, l: lm.l });
      if (w.tier >= 2) Mi.remember(w, game, "social", "i saw " + c.name + " hide some food", 0.35, c.x, c.z, c.name);
    });
    Mi.remember(c, game, "food", "i hid my " + ((SB.KINDS[o.kind] || {}).label || "food") + " by the " + lm.l + (all.length ? ". " + all[0].name + " saw me" : ". nobody saw"), 0.5, c.x, c.z);
    if (SB.Social) SB.Social.log(game, c, "🙈", "hid some food by the " + lm.l + (all.length ? " (" + all[0].name + " saw)" : ""));
    c.stats = c.stats || {}; c.stats.hid = (c.stats.hid || 0) + 1;
    if (!c.far) c.speech = { text: all.length ? "uh oh. " + all[0].name + " saw" : "shh. mine for later", t: 2, kind: "think" };
    p.i++;
    SB.bus.emit("stash", { c: c, item: o, seen: all.length });
    return endMind(c, game, true);
  }
  // hungry: go back to the hiding spot. if it's gone, someone took it
  function fetchStash(c, game) {
    var st = c.mind.st;
    if (!st || heldFood(c, game)) return false;
    mplan(c, game, "fetch", [{ i: "🧭", d: "go", x: st.x, z: st.z, r: 1.5 }, { i: "🍎", d: "dig" }], "i hid food by " + st.l + ". time to eat it");
    return stepMind(c, game, c._mt.mp);
  }
  function doDig(c, game, p) {
    var st = c.mind.st, o = st && SB.Game.byId(game, st.id);
    c.mind.st = null;
    if (o && !o.gone && o.heldBy == null && SB.dist(o.x, o.z, c.x, c.z) < 3.5) {
      o.hid = null; o.wit = null;
      SB.Creature.carry(c, o, game, true);
      p.i++; endMind(c, game, true);
      var t = { type: "item", id: o.id }, r = SB.Creature.resolve(game, t);
      if (r) { SB.Creature.start(c, game, V.eat, t, r, "food"); return true; }
      return false;
    }
    // gone! who took it? if it saw, it knows; otherwise it suspects whoever watched it go in
    var why = "it's gone!", known = st && Mi.belief(c, "thief:" + st.thief + ":" + c.id);
    if (st && st.w.length && !known) {
      var sus = null, sv = 1e9;
      st.w.forEach(function (id) { var o2 = SB.Game.byId(game, id); if (o2 && o2.alive) { var v = opn(game, c, o2); if (v < sv) { sv = v; sus = o2; } } });
      // a guess: right if the suspect really did it (the truth is in the thief's memory, not the owner's)
      if (sus) { Mi.believe(c, game, { c: "thief:" + sus.id + ":" + c.id, k: "who", w: sus.name + " took my food", src: "guess", f: 0.35, a: sus.id, lie: st.thief === sus.id ? null : 1 }); why = "it's gone! i bet " + sus.name + " took it"; }
    }
    Mi.remember(c, game, "hurt", "the food i hid was gone", 0.6, c.x, c.z);
    if (SB.Social) SB.Social.log(game, c, "😢", "the food i hid was gone");
    if (!c.far) { c.speech = { text: why, t: 2.4, kind: "say" }; SB.Creature.emote(c, "sad", 2); }
    failMind(c, game, p, why);
    if (c.tier >= 5 && c.chem.hunger > 0.6) { SB.Creature.start(c, game, V.pray); return true; } // a thinker has a plan b: ask the sky
    return false;
  }
  // a sneaky smol that watched food being hidden goes back for it when the owner isn't around
  function stealUrge(c, game) {
    var m = c.mind;
    if (c.chem.hunger < 0.35 || sneaky(c) < 0.42 || heldFood(c, game)) return false;
    for (var i = m.bel.length - 1; i >= 0; i--) {
      var b = m.bel[i];
      if (b.k !== "stash" || b.it == null || b.a === c.id) continue;
      var o = SB.Game.byId(game, b.it), owner = SB.Game.byId(game, b.a);
      if (!o || o.gone || o.heldBy != null || o.hid == null) { m.bel.splice(i, 1); continue; } // the stash isn't there any more
      if (owner && owner.alive && !owner.asleep && SB.dist(owner.x, owner.z, o.x, o.z) < 11) continue; // the owner's right there
      if (!game.rng.chance(0.2 + sneaky(c) * 0.5)) return false;
      mplan(c, game, "steal", [{ i: "👀", d: "have" }, { i: "🤫", d: "go", x: o.x, z: o.z, r: 1.3 }, { i: emoji(o.kind), d: "take", it: o.id }],
        (owner ? owner.name : "someone") + " hid food by the " + (b.l || "rocks") + ". nobody's looking", { from: b.a });
      return stepMind(c, game, c._mt.mp);
    }
    return false;
  }
  function doTake(c, game, p, s) {
    var o = SB.Game.byId(game, s.it);
    if (!o || o.gone || o.heldBy != null || SB.dist(o.x, o.z, c.x, c.z) > 2.6) return failMind(c, game, p, "somebody got there first");
    SB.Creature.carry(c, o, game, true); // Mi.took sees to the rest
    p.i++;
    return endMind(c, game, true);
  }

  // idea plans (ideas.js): pictures for each step, and what happens when one fails or works
  var WANT_IC = { food: "🍎", stick: "🪵", stone: "🪨", material: "🪵" };
  function planIcons(p) {
    return p.steps.map(function (s) {
      switch (s.do) {
        case "fetch": return (SB.KINDS[s.want] && SB.KINDS[s.want].emoji) || WANT_IC[s.want] || "📦";
        case "station": return s.at === "kiln" ? "🏺" : s.at === "fire" ? "🔥" : "🛠";
        case "craft": var d = SB.Ideas && SB.Ideas.BY_ID[s.idea]; return d ? d.icon : "🔨";
        case "deliver": return "🏗";
        case "work": return "🔨";
      }
      return "•";
    });
  }
  Mi.planIcons = planIcons;
  function wantWord(w) { return (SB.KINDS[w] && SB.KINDS[w].label) || w || "stuff"; }
  function skillFor(c, id) { var sk = c.mind && c.mind.sk; if (!sk) return null; for (var i = 0; i < sk.length; i++) if (sk[i].id === id) return sk[i]; return null; }
  Mi.skillFor = skillFor;
  // a routine it knows goes quicker: practised hands
  Mi.planStarted = function (c, game, p) {
    if (c.species !== "smol" || !p || !p.steps || !p.idea) return;
    ensure(c);
    var sk = skillFor(c, p.idea);
    if (!sk) return;
    p.sk = sk.n;
    p.steps.forEach(function (s) { if (s.do === "craft" && SB.Ideas) { var d = SB.Ideas.BY_ID[s.idea]; if (d && d.make) s.t = d.make.time * Math.min(0.5, 0.12 * sk.ok); } });
  };
  Mi.planEnded = function (c, game, p, ok) {
    if (c.species !== "smol" || c.tier < 2 || !p || !p.steps) return;
    var mt = c._mt || (ensure(c), c._mt), ic = planIcons(p);
    if (ok) { if (p.idea && p.i >= p.steps.length) learnRoutine(c, game, p, ic); return; }
    if (!(p.fails > 0 || p.t > 90)) return; // interrupted (a fright, a call), not a failure
    var at = Math.min(p.i, p.steps.length - 1), s = p.steps[at] || {};
    var why = s.do === "fetch" ? "no " + wantWord(s.want) + " anywhere near" : s.do === "station" ? "no " + (s.at || "fire") + " to work at" : s.do === "craft" ? "it didn't come out right" : "that didn't work";
    mt.pf = { ic: ic, x: at, t: game.time, why: why };
    mt.why = why + ". let me think again";
    mt.rp = { t: game.time, verb: p.verb, want: s.do === "fetch" ? s.want : null, ic: ic[ic.length - 1], idea: p.idea };
  };
  // after a failed step: find another way. food it can't find nearby might be where it remembers food;
  // otherwise think again from the top (the idea graph often has another way to the same end)
  function replan(c, game, rp) {
    var mt = c._mt;
    mt.rpn = game.time - (mt.rpT || -1e9) < 60 ? (mt.rpn || 0) + 1 : 1;
    mt.rpT = game.time;
    if (mt.rpn > 2 || rp.verb == null) return false;
    var food = rp.want === "food" || (SB.KINDS[rp.want] && SB.KINDS[rp.want].noun === "food");
    var pl = food ? Mi.recall(c, game, "food", 4) : null;
    if (pl) {
      mplan(c, game, "replan", [{ i: "🧭", d: "go", x: pl.x, z: pl.z, r: 2.2 }, { i: rp.ic, d: "redo" }], "no " + wantWord(rp.want) + " here. i remember some at the " + pl.l, { verb: rp.verb });
      return stepMind(c, game, c._mt.mp);
    }
    SB.Creature.start(c, game, rp.verb);
    return true;
  }
  function learnRoutine(c, game, p, ic) {
    var m = c.mind, d = SB.Ideas && SB.Ideas.BY_ID[p.idea];
    if (!d) return;
    var s = skillFor(c, p.idea);
    if (!s) {
      s = { id: p.idea, n: c.name + "'s " + d.name, ic: ic.join("→"), ok: 0, t: game.time };
      m.sk.push(s);
      if (m.sk.length > 2 + c.tier) { m.sk.sort(function (a, b) { return b.ok - a.ok; }); m.sk.splice(1 + c.tier, m.sk.length); m.sk.push(s); }
    }
    s.ok++; s.t = game.time; s.ic = ic.join("→");
    if (s.ok === 3) {
      Mi.remember(c, game, "idea", "i've got the hang of " + d.name, 0.5);
      if (SB.Social) SB.Social.log(game, c, "🧩", "worked out a routine: " + s.n + " " + s.ic);
    }
  }
  // teaching passes the routine on with the idea (or on its own, to someone who knows the idea but not the knack)
  function giveRoutine(c, o, game, s) {
    if (!s || o.species !== "smol" || skillFor(o, s.id)) return null;
    ensure(o);
    var n = { id: s.id, n: s.n, ic: s.ic, ok: 1, t: game.time, by: c.name };
    o.mind.sk.push(n);
    if (o.mind.sk.length > 2 + (o.tier || 0)) o.mind.sk.shift();
    if (o.ideaQ) o.ideaQ[s.id] = Math.min(1.5, (o.ideaQ[s.id] == null ? 0.2 : o.ideaQ[s.id]) + 0.15);
    Mi.remember(o, game, "idea", c.name + " showed me " + s.n, 0.4, null, null, c.name);
    return n;
  }
  function shareRoutine(c, o, game) {
    if (!c.mind || !SB.Ideas) return null;
    for (var i = 0; i < c.mind.sk.length; i++) { var s = c.mind.sk[i]; if (s.ok >= 2 && SB.Ideas.known(o, s.id) && !skillFor(o, s.id)) return giveRoutine(c, o, game, s); }
    return null;
  }
  Mi.shareRoutine = shareRoutine;

  // what shows over the head: {ic: [icons], i: the step it's on, x: a crossed-out step, why}
  Mi.bubble = function (c, game) {
    if (c.species !== "smol" || c.tier < 2 || !c._mt) return null;
    var mt = c._mt;
    if (mt.pf && game.time - mt.pf.t < 3) return { ic: mt.pf.ic, i: -1, x: mt.pf.x, why: mt.pf.why, fail: true };
    if (c.plan && c.plan.steps && c.plan.steps.length) {
      var p = c.plan;
      if (!p._ic || p._ic.length !== p.steps.length) p._ic = planIcons(p);
      return { ic: p._ic, i: p.i, x: -1, why: p.sk ? "the way i know: " + p.sk : null };
    }
    if (mt.mp) return { ic: mt.mp.st.map(function (s) { return s.i; }), i: mt.mp.i, x: -1, why: mt.mp.why };
    return null;
  };
  // the bubble on the 2D overlay (bodies.js), pixel style like the speech bubbles. returns its height
  Mi.drawBubble = function (ctx, x, y, c, game, zoom) {
    if (c.species !== "smol" || c.tier < 2 || (zoom >= 22 && game.selectedId !== c.id) || !SB.Bodies || !SB.Icons) return 0;
    var b = Mi.bubble(c, game);
    if (!b || !b.ic.length) return 0;
    var n = b.ic.length, sz = 20, gap = 13, w = n * sz + (n - 1) * gap + 18, h = 32;
    var bx = Math.round(x - w / 2), by = Math.round(y - h - 8), line = "#1a1222", fill = b.fail ? "#ffe3e0" : "#eef8df";
    SB.Bodies.pxBox(ctx, bx, by, w, h, fill, line);
    x = Math.round(x);
    ctx.fillStyle = line; ctx.fillRect(x - 3, by + h - 2, 2, 2); ctx.fillRect(x + 1, by + h - 2, 2, 2); ctx.fillRect(x - 1, by + h + 2, 2, 2); // thought dots
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (var i = 0; i < n; i++) {
      var cx = bx + 9 + i * (sz + gap) + sz / 2, cy = by + h / 2;
      ctx.globalAlpha = b.i > i ? 0.4 : 1;
      SB.Icons.fillText(ctx, b.ic[i], cx, cy + 1, sz);
      ctx.globalAlpha = 1;
      if (i === b.i) { ctx.fillStyle = "#4f8a00"; ctx.fillRect(cx - 9, by + h - 5, 18, 2); }
      if (i === b.x) { ctx.fillStyle = "#e0303a"; for (var k = -10; k <= 10; k += 2) { ctx.fillRect(cx + k - 1, cy + k - 1, 3, 3); ctx.fillRect(cx + k - 1, cy - k - 1, 3, 3); } }
      if (i < n - 1) { ctx.fillStyle = line; var ax = cx + sz / 2 + 3; ctx.fillRect(ax, cy, 6, 2); ctx.fillRect(ax + 4, cy - 2, 2, 6); }
    }
    return h;
  };

  /* ---------------- 11. reflection: who it thinks it is ---------------- */
  var IAM = { brave: ["i am brave", "i get scared easily"], share: ["i share what i have", "i keep what's mine"], trad: ["i do things the old way", "i do things my own way"], faith: ["the sky one listens to me", "the sky one doesn't listen"], know: ["i want to know everything", "i don't need new ideas"] };
  var WAS = {
    brave: ["i used to be brave. ", "i used to be scared of everything. "], share: ["i used to share everything. ", "i used to keep things to myself. "],
    trad: ["i used to do what the others do. ", "i never cared for the old ways. "], faith: ["i used to think the sky one listens. ", "i never thought the sky one listened. "],
    know: ["i used to want to know everything. ", "i never cared about new ideas. "]
  };
  // diary icons as evidence about itself
  var EVID = { "🏏": { brave: 1.2 }, "👊": { brave: 0.3 }, "🤕": { brave: -0.4 }, "🎁": { share: 0.6 }, "🤫": { share: -1 }, "🙈": { share: -0.4 }, "🙏": { faith: 0.8 }, "🪶": { faith: 0.25 }, "💡": { know: 0.8 }, "📖": { know: 0.4, trad: 0.3 }, "🪘": { trad: 0.8, faith: 0.3 }, "🚫": { trad: -1, brave: 0.5 }, "😠": { share: -0.3 }, "🧩": { know: 0.4, trad: 0.2 }, "🕯": { faith: -0.3 } };
  // "i am…" from its two strongest values
  Mi.iam = function (c) {
    var v = c.mind && c.mind.vals;
    if (!v) return [];
    return VALS.filter(function (k) { return Math.abs(v[k] || 0) >= 0.2; }).sort(function (a, b) { return Math.abs(v[b]) - Math.abs(v[a]); }).slice(0, 2).map(function (k) { return IAM[k][v[k] > 0 ? 0 : 1]; });
  };
  function reflect(c, game) {
    var m = c.mind, now = game.time, since = m.rf || 0, ev = {}, cause = {}, i;
    VALS.forEach(function (k) { ev[k] = 0; });
    (c.diary || []).forEach(function (d) {
      if (d[0] < since) return;
      var e = EVID[d[1]];
      if (e) for (var k in e) { ev[k] += e[k]; if (Math.abs(e[k]) >= 0.4) cause[k + (e[k] > 0 ? "+" : "-")] = d[2]; }
    });
    for (i = 0; i < m.ep.length; i++) {
      var e2 = m.ep[i];
      if (e2.t < since) continue;
      if (e2.k === "loss" && !/goodbye/.test(e2.w)) { ev.faith -= (m.pq || 0) > (m.pa || 0) ? 1.4 : 0.6; cause["faith-"] = e2.w; ev.brave -= 0.2; }
      else if (e2.k === "hurt" && /grump/.test(e2.w)) { ev.brave -= 0.4; cause["brave-"] = e2.w; }
      else if (e2.k === "sky" && /answered/.test(e2.w)) { ev.faith += 0.5; cause["faith+"] = "the sky answered me"; }
      else if (e2.k === "idea") { ev.know += 0.3; cause["know+"] = e2.w.replace(/^i /, "i "); }
      else if (e2.k === "social" && /gave me|comforted me/.test(e2.w)) { ev.share += 0.3; cause["share+"] = e2.w; }
    }
    ev.faith += ((m.pa || 0) - (m.pq || 0) * 0.5) * 0.4; m.pa = 0; m.pq = 0;
    // temperament pulls too: a brave gene feels brave, a curious one wants to know
    ev.brave += (gene(c, "bravery", 0.5) - 0.5) * 0.6; ev.share += (gene(c, "affection", 0.5) - gene(c, "grumpiness", 0.4)) * 0.4;
    ev.know += (gene(c, "curiosity", 0.5) - 0.5) * 0.6; ev.trad += (gene(c, "obedience", 0.5) - 0.5) * 0.6;
    var changed = null;
    VALS.forEach(function (k) {
      var old = m.vals[k] || 0, nv = Math.round(clamp(old * 0.7 + Math.tanh(ev[k]) * 0.45, -1, 1) * 100) / 100;
      if (!changed && old > 0.2 && nv < -0.05) changed = WAS[k][0] + (cause[k + "-"] ? "not since " + cause[k + "-"].replace(/[.!]+$/, "") + "." : "not any more.");
      else if (!changed && old < -0.2 && nv > 0.05) changed = WAS[k][1] + (cause[k + "+"] ? "then " + cause[k + "+"].replace(/[.!]+$/, "") + "." : "but now i do.");
      m.vals[k] = nv;
    });
    m.rf = now;
    if (changed) {
      m.was = { w: changed, t: now };
      Mi.remember(c, game, "life", changed, 0.8);
      if (SB.Social) SB.Social.log(game, c, "💭", changed);
      SB.bus.emit("changedMind", { c: c, w: changed });
    }
  }
  Mi.reflect = reflect;
  // a dream can plant a (weak) belief: a vivid bad moment makes a place feel dangerous, a good one feel lucky
  function dreamBelief(c, game, e) {
    if (!e || e.x == null || c.tier < 1 || game.rng() > 0.35) return;
    var lm = landmark(game, e.x, e.z), bad = e.k === "hurt" || e.k === "loss";
    Mi.believe(c, game, { c: "dream:" + lm.key, k: "dream", w: bad ? "the " + lm.l + " is dangerous" : "good things wait by the " + lm.l, src: "dreamt", f: 0.2, x: lm.x, z: lm.z, l: lm.l });
  }

  /* ---------------- 12. culture: superstition, ritual, taboo, heirlooms, the crowd ---------------- */
  function lore(game) {
    var l = game.lore;
    if (!l || typeof l !== "object") l = game.lore = {};
    if (!Array.isArray(l.rit)) l.rit = [];
    if (!Array.isArray(l.tab)) l.tab = [];
    return l;
  }
  Mi.lore = lore;
  Mi.saveLore = function (game) { var l = lore(game); return { rit: l.rit.slice(0, 6), tab: l.tab.slice(-8) }; };
  Mi.loadLore = function (game, d) {
    var l = game.lore = { rit: [], tab: [] };
    if (!d || typeof d !== "object") return l;
    var ok = function (r) { return r && typeof r.c === "string" && typeof r.l === "string" && isFinite(r.x) && isFinite(r.z); };
    if (Array.isArray(d.rit)) l.rit = d.rit.filter(function (r) { return ok(r) && MIR[r.m] && DOING[r.v]; }).slice(0, 6).map(function (r) { return { c: r.c, m: r.m, v: r.v, x: +r.x, z: +r.z, l: r.l, t: +r.t || 0, n: +r.n || 0, weak: +r.weak || 0 }; });
    if (Array.isArray(d.tab)) l.tab = d.tab.filter(ok).slice(-8).map(function (r) { return { c: r.c, x: +r.x, z: +r.z, l: r.l, n: typeof r.n === "string" ? r.n : "someone", how: typeof r.how === "string" ? r.how : "died", t: +r.t || 0, off: !!r.off }; });
    return l;
  };
  // miracle id: [what it brings, icon, the needs it answers, a chant]
  var MIR = { rain: ["rain", "🌧", { hot: 1 }, "rain, rain, come!"], bounty: ["food from the sky", "🍎", { hunger: 1 }, "food, sky, food!"], heal: ["healing", "💚", { sick: 1, pain: 1 }, "make us better!"], sun: ["sunshine", "☀️", { cold: 1 }, "sun, sun, come out!"], bolt: ["fire from the sky", "⚡", { cold: 1 }, "boom, sky, boom!"], inspire: ["good ideas", "💡", { bored: 1 }, "ideas, come!"], gift: ["presents", "🎁", { bored: 1, lonely: 1 }, "gifts, sky!"] };
  // what the smols were doing when it happened, as a rite: [-ing words, icon]
  var DOING = { idle: ["standing still", "🧍"], approach: ["gathering", "👥"], eat: ["feasting", "🍖"], play: ["dancing", "💃"], hit: ["stomping", "🦶"], pickup: ["piling stones", "🪨"], drop: ["leaving gifts", "🎁"], sleep: ["sleeping", "💤"], flee: ["running about", "🏃"], talk: ["chanting", "🎶"], cuddle: ["hugging", "🤗"], wander: ["walking in circles", "🚶"], use: ["drumming", "🥁"], make: ["making things", "🔨"], build: ["building", "🔨"], teach: ["telling stories", "📖"], give: ["giving gifts", "🎁"], pray: ["praying", "🙏"] };
  Mi.MIR = MIR; Mi.DOING = DOING;
  function ritualName(r) { return DOING[r.v][0] + " at the " + r.l + " to ask for " + MIR[r.m][0]; }
  Mi.ritualName = ritualName;
  // a miracle: everyone nearby credits whatever they were just doing, wherever they were doing it
  function superstition(game, e) {
    if (!MIR[e.id] || !isFinite(e.x) || !isFinite(e.z)) return;
    var lm = landmark(game, e.x, e.z); // where it happened, by the nearest thing they'd name it after
    Mi.witnesses(game, e.x, e.z, 11).forEach(function (c) {
      if (c.tier < 2) return;
      var mt = c._mt || (ensure(c), c._mt);
      var vb = mt.rite && game.time - mt.rite.t < 30 ? mt.rite.v : c.action ? SB.VERBS[c.action.verb] : "idle";
      if (!DOING[vb]) vb = "idle";
      var b = Mi.believe(c, game, { c: "sup:" + e.id + ":" + vb + ":" + lm.key, k: "sup", w: DOING[vb][0] + " by the " + lm.l + " brings " + MIR[e.id][0], src: "seen", f: 0.3 + Math.max(0, c.mind.vals.faith || 0) * 0.2, m: e.id, v: vb, x: c.x, z: c.z, l: lm.l }); // the spot: where it stood (dry land, even "by the lake")
      if (b && b.f > 0.5 && c.tier >= 2) Mi.remember(c, game, "sky", "the sky sent " + MIR[e.id][0] + " again while we were " + DOING[vb][0], 0.5, c.x, c.z);
    });
  }
  // a belief enough smols share becomes the tribe's ritual (and the island's history)
  function rituals(game, L, sm) {
    var count = {}, ex = {}, i;
    for (i = 0; i < sm.length; i++) {
      var bl = sm[i].mind && sm[i].mind.bel;
      if (!bl || sm[i].tier < 2) continue;
      for (var j = 0; j < bl.length; j++) if (bl[j].k === "sup" && bl[j].f >= 0.35) { count[bl[j].c] = (count[bl[j].c] || 0) + 1; ex[bl[j].c] = bl[j]; }
    }
    L.rit.forEach(function (r) { r.weak = count[r.c] ? 0 : (r.weak || 0) + 1; });
    var gone = L.rit.filter(function (r) { return r.weak >= 8; });
    gone.forEach(function (r) { if (SB.Social) SB.Social.chronicle(game, "🍂", "nobody remembers why the smols used to go " + DOING[r.v][0] + " at the " + r.l); });
    if (gone.length) L.rit = L.rit.filter(function (r) { return r.weak < 8; });
    var need = sm.length <= 5 ? 2 : 3;
    for (var cl in count) {
      if (count[cl] < need || L.rit.length >= 4) continue;
      var b = ex[cl];
      if (!MIR[b.m] || !DOING[b.v] || L.rit.some(function (r) { return r.c === cl || r.m === b.m; })) continue;
      var r = { c: cl, m: b.m, v: b.v, x: b.x, z: b.z, l: b.l, t: game.time, n: 0, weak: 0 };
      L.rit.push(r);
      if (SB.Social) SB.Social.chronicle(game, "🪘", "the smols began " + ritualName(r));
      sm.forEach(function (c) { if (Mi.belief(c, cl) && SB.Social) SB.Social.log(game, c, "🪘", "we go " + ritualName(r)); });
      SB.bus.emit("ritual", { r: r, name: ritualName(r) });
    }
  }
  function ritualUrge(c, game) {
    var L = game.lore;
    if (!L || !L.rit.length || c.stage < 2) return false;
    var mt = c._mt, m = c.mind, ch = c.chem;
    if (game.time - (mt.riteT || -1e9) < 200) return false;
    for (var i = 0; i < L.rit.length; i++) {
      var r = L.rit[i], need = MIR[r.m][2], drive = 0;
      for (var d in need) drive = Math.max(drive, ch[d] || 0);
      var bel = Mi.belief(c, r.c), faith = (bel ? bel.f : 0) + (m.vals.trad || 0) * 0.4 + (m.vals.faith || 0) * 0.3;
      if (faith < 0.3 || SB.dist(c.x, c.z, r.x, r.z) > 40) continue;
      if (drive < 0.5 && !(Math.max(ch.hunger, ch.fear, ch.pain) < 0.4 && game.rng.chance(0.02 + Math.max(0, m.vals.trad || 0) * 0.06))) continue;
      startRite(c, game, r, true);
      return stepMind(c, game, c._mt.mp);
    }
    return false;
  }
  Mi.ritualUrge = ritualUrge;
  function startRite(c, game, r, lead) {
    var rng = game.rng;
    c._mt.riteT = game.time;
    mplan(c, game, "rite", [{ i: "🚶", d: "go", x: r.x + rng.range(-1.6, 1.6), z: r.z + rng.range(-1.6, 1.6), r: 2.4 }, { i: DOING[r.v][1], d: "dance", v: r.v }, { i: MIR[r.m][1], d: "ask" }],
      "the old way: " + ritualName(r), { rite: r.c });
    if (!lead) return;
    r.n = (r.n || 0) + 1;
    if (SB.Social) SB.Social.log(game, c, "🪘", "went " + ritualName(r));
    // believers nearby come along
    var n = 0;
    Mi.witnesses(game, c.x, c.z, 16, c).forEach(function (o) {
      if (n >= 4 || o.tier < 2 || o.stage < 2 || !o.mind || o.plan || o.convo || (o._mt && o._mt.mp) || (SB.Social && !SB.Social.free(o))) return;
      var b = Mi.belief(o, r.c), f = (b ? b.f : 0) + (o.mind.vals.trad || 0) * 0.4;
      if (f < 0.25) return;
      ensure(o); startRite(o, game, r, false); o.action = null; o.thinkT = Math.min(o.thinkT || 0, 0.3 + rng() * 0.6); n++;
    });
    SB.bus.emit("rite", { c: c, r: r, n: n + 1 });
  }
  function doDance(c, game, p, s) {
    s.n = (s.n || 0) + 1;
    c._mt.rite = { v: s.v, t: game.time }; // a miracle now gets credited to the rite
    if (s.n > 3) { p.i++; return stepMind(c, game, p); }
    SB.Creature.start(c, game, V.idle);
    c.action.dur = 2.4;
    SB.Creature.emote(c, s.n % 2 ? "happy" : "pray", 2.2);
    var r = (game.lore.rit || []).filter(function (x) { return x.c === p.rite; })[0];
    if (!c.far && s.n === 1 && r) c.speech = { text: MIR[r.m][3], t: 2.2, kind: "say" };
    return true;
  }
  // a death that wasn't old age makes the spot taboo for whoever saw or loved the one who died
  var DIED = { drowned: "drowned", starved: "starved", hurt: "was killed", cold: "froze", sick: "got sick and died", old: "died of old age" };
  function taboo(game, dead, cause, mourners) {
    if (!cause || cause === "old" || cause === "sick" || !isFinite(dead.x)) return;
    var lm = landmark(game, dead.x, dead.z), claim = "taboo:" + lm.key, how = DIED[cause] || "died", n = 0;
    game.creatures.forEach(function (o) {
      if (!o.alive || o.species !== "smol" || o === dead || o.tier < 2) return;
      var saw = !o.asleep && SB.dist(o.x, o.z, dead.x, dead.z) < 12;
      if (!saw && mourners.indexOf(o) < 0) return;
      Mi.believe(o, game, { c: claim, k: "taboo", w: "the " + lm.l + " is cursed. " + dead.name + " " + how + " there", src: saw ? "seen" : "told", bn: saw ? null : "everyone", f: saw ? 0.75 : 0.5, x: lm.x, z: lm.z, l: lm.l, a: dead.id });
      n++;
    });
    var L = lore(game);
    if (n >= 2 && !L.tab.some(function (t) { return t.c === claim && !t.off; })) {
      L.tab.push({ c: claim, x: lm.x, z: lm.z, l: lm.l, n: dead.name, how: how, t: game.time });
      if (L.tab.length > 8) L.tab.shift();
      if (SB.Social) SB.Social.chronicle(game, "⛔", "nobody goes near the " + lm.l + " any more. " + dead.name + " " + how + " there");
      SB.bus.emit("taboo", { l: lm.l, name: dead.name });
    }
  }
  Mi.taboo = taboo;
  // a taboo spot near (x, z) that this smol believes in. the curious and the bold sometimes go anyway
  Mi.tabooAt = function (c, game, x, z) {
    var m = c.mind;
    if (!m || !m.bel || c.tier < 2) return null;
    for (var i = 0; i < m.bel.length; i++) {
      var b = m.bel[i];
      if (b.k !== "taboo" || b.f < 0.3 || SB.dist(b.x, b.z, x, z) > 5) continue;
      var mt = c._mt;
      if (mt && mt.brk && mt.brk.c === b.c) return null;
      if (mt && gene(c, "curiosity", 0.5) > 0.6 && (m.vals.trad || 0) < 0.25 && game.rng.chance(0.25 + Math.max(0, m.vals.brave || 0) * 0.25)) {
        mt.brk = { c: b.c, x: b.x, z: b.z, l: b.l, t: game.time };
        mt.why = "everyone says the " + b.l + " is cursed. i want to see for myself";
        return null;
      }
      return { k: "taboo", l: b.l, x: b.x, z: b.z, why: "we don't go to the " + b.l + ". " + (b.w.split(". ")[1] || "it's cursed") };
    }
    return null;
  };
  function breakTaboo(c, game, br) {
    c._mt.brk = null;
    Mi.doubt(c, br.c, 0.3);
    c.stats = c.stats || {}; c.stats.taboos = (c.stats.taboos || 0) + 1;
    if (SB.Social) SB.Social.log(game, c, "🚫", "went to the " + br.l + ". nothing bad happened");
    Mi.remember(c, game, "life", "i went to the " + br.l + " and nothing bad happened", 0.7, c.x, c.z);
    if (!c.far) c.speech = { text: "see? nothing bad here!", t: 2.4, kind: "say" };
    Mi.witnesses(game, c.x, c.z, 10, c).forEach(function (w) {
      var wb = Mi.belief(w, br.c);
      if (!wb) return;
      if ((w.mind.vals.trad || 0) > 0.3) { if (SB.Social) SB.Social.remember(game, w, c, "taboo", -8, "broke the taboo", 2400, 16); }
      else Mi.doubt(w, br.c, 0.7);
    });
    SB.bus.emit("tabooBroken", { c: c, l: br.l });
  }
  function taboos(game, L, sm) {
    L.tab.forEach(function (t) {
      if (t.off) return;
      var n = 0;
      for (var i = 0; i < sm.length; i++) { var b = Mi.belief(sm[i], t.c); if (b && b.f >= 0.3) n++; }
      if (n) return;
      t.off = true;
      if (SB.Social) SB.Social.chronicle(game, "🌤", "nobody fears the " + t.l + " any more");
    });
  }
  // heirlooms: a parent's most vivid stories, in the kid's head from the start ("mum said the lake bites")
  function heirText(e) {
    if (e.k === "loss") return e.w.replace(/^said goodbye to /, "we lost ") + ". be careful";
    if (e.k === "hurt") return /grump/.test(e.w) ? "grumps hit hard" : "some smols hit. keep away from " + (e.a || "them");
    if (/answered/.test(e.w)) return "the sky one answers if you pray";
    if (/told me off/.test(e.w)) return "the sky one gets cross";
    if (/tickled/.test(e.w)) return "the sky one is kind";
    return e.w;
  }
  function heirlooms(p, kid, game) {
    var who = p.sex === "f" ? "mum" : "dad", out = [];
    p.mind.bel.filter(function (b) { return (b.k === "taboo" || b.k === "sup") && b.f >= 0.3; }).sort(function (a, b) { return b.f - a.f; }).slice(0, 1)
      .forEach(function (b) { out.push({ c: b.c, k: b.k, w: b.w, src: "told", bn: who, f: b.f * 0.8, x: b.x, z: b.z, l: b.l, m: b.m, v: b.v, a: b.a }); });
    var dz = p.mind.pl.filter(function (q) { return q.k === "danger"; }).sort(function (a, b) { return b.v - a.v; })[0];
    if (dz && out.length < 2) {
      var lm = landmark(game, dz.x, dz.z);
      out.push({ c: "heir:" + lm.key, k: "heir", w: "the " + lm.l + " bites", src: "told", bn: who, f: 0.7, x: dz.x, z: dz.z, l: lm.l });
      Mi.learnPlace(kid, game, "danger", dz.x, dz.z, dz.l, dz.v * 0.7, { s: "told", bn: who });
    }
    var v = Mi.vivid(p, game, 4).filter(function (e) { return e.k === "loss" || e.k === "hurt" || e.k === "sky"; })[0];
    if (v && out.length < 2) out.push({ c: "heir:" + p.id + ":" + v.k + ":" + Math.round(v.t), k: "heir", w: heirText(v), src: "told", bn: who, f: 0.6 });
    out.slice(0, 2).forEach(function (b) { if (Mi.believe(kid, game, b)) Mi.remember(kid, game, "life", who + " said " + b.w, 0.6); });
  }
  Mi.heirlooms = heirlooms;
  // the crowd: smols drift toward what the smols around them believe (the obedient faster, the curious slower)
  function crowd(c, game) {
    var mt = c._mt;
    if (mt && mt.brk) { if (game.time - mt.brk.t > 150) mt.brk = null; else if (SB.dist(c.x, c.z, mt.brk.x, mt.brk.z) < 4.5) breakTaboo(c, game, mt.brk); }
    if (c.tier < 3 || c.asleep || c.stranger || !c.mind) return;
    var near = Mi.witnesses(game, c.x, c.z, 8, c);
    if (near.length < 2) return;
    var tally = {}, best = {};
    near.forEach(function (o) {
      if (!o.mind || !o.mind.bel) return;
      o.mind.bel.forEach(function (b) { if ((b.k === "sup" || b.k === "taboo" || b.k === "heir") && b.f >= 0.35) { tally[b.c] = (tally[b.c] || 0) + 1; if (!best[b.c] || b.f > best[b.c].b.f) best[b.c] = { b: b, o: o }; } });
    });
    var pull = 0.1 + gene(c, "obedience", 0.5) * 0.25 + Math.max(0, c.mind.vals.trad || 0) * 0.15 - gene(c, "curiosity", 0.5) * 0.1;
    for (var cl in tally) {
      var n = tally[cl];
      if (n < 2) continue;
      var mine = Mi.belief(c, cl);
      if (mine) { if (!mt.brk || mt.brk.c !== cl) mine.f = clamp(mine.f + 0.02 * n * pull, 0, 1); continue; }
      if (!game.rng.chance(pull * Math.min(1, n / 3))) continue;
      var s = best[cl].b;
      Mi.believe(c, game, { c: s.c, k: s.k, w: s.w, src: "told", bn: n >= 3 ? "everyone" : best[cl].o.name, f: 0.22 + 0.06 * n, x: s.x, z: s.z, l: s.l, m: s.m, v: s.v, a: s.a });
    }
  }
  // every 2 s from social.js: a few smols at a time, so a big tribe costs the same per tick
  var cAcc = 0, cIdx = 0;
  Mi.cultureTick = function (game, dt, sm) {
    if (!sm.length) return;
    var L = lore(game), n = Math.min(sm.length, 8);
    for (var k = 0; k < n; k++) { cIdx = (cIdx + 1) % sm.length; var c = sm[cIdx]; if (c.tier >= 2 && c.mind) crowd(c, game); }
    if ((cAcc += dt) < 8) return;
    cAcc = 0;
    rituals(game, L, sm);
    taboos(game, L, sm);
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
      var dead = e.c, mourners = [];
      g.creatures.forEach(function (o) {
        if (o === dead || !o.alive || o.species !== "smol") return;
        var op = SB.Social ? SB.Social.opinion(g, o, dead) : 0, kin = SB.Game.related && SB.Game.related(g, o, dead);
        if (op >= 20 || kin) { mourners.push(o); Mi.remember(o, g, "loss", dead.name + " " + (DIED[e.cause] || "died"), kin ? 1.2 : 0.9, dead.x, dead.z, dead.name); }
      });
      taboo(g, dead, e.cause, mourners);
    });
    on("tickle", function (e) { var g = G(); if (g && e && e.c) { Mi.remember(e.c, g, "sky", "the sky tickled me", 0.35); Mi.believe(e.c, g, { c: "sky:kind", k: "sky", w: "the sky one is kind", src: "god", f: 0.3 }); } });
    on("tap", function (e) { var g = G(); if (g && e && e.c) { Mi.remember(e.c, g, "sky", "the sky told me off", 0.35); Mi.believe(e.c, g, { c: "sky:cross", k: "sky", w: "the sky one gets cross", src: "god", f: 0.3 }); } });
    on("pray", function (e) { if (e && e.c && e.c.mind) e.c.mind.pq = (e.c.mind.pq || 0) + 1; });
    on("miracle", function (e) { var g = G(); if (g && e) superstition(g, e); });
    on("teach", function (e) { var g = G(); if (g && e && e.c && e.student && e.learned) giveRoutine(e.c, e.student, g, skillFor(e.c, e.id)); });
    on("eureka", function (e) { var g = G(); if (g && e && e.c && SB.Ideas) { var d = SB.Ideas.BY_ID[e.id]; if (d) Mi.remember(e.c, g, "idea", "i figured out " + d.name + "!", e.first ? 1.1 : 0.7, e.c.x, e.c.z); } });
    on("give", function (e) { var g = G(); if (g && e && e.to && e.c) Mi.remember(e.to, g, "social", e.c.name + " gave me " + ((e.item && SB.KINDS[e.item.kind] && SB.KINDS[e.item.kind].label) || "something"), 0.6, null, null, e.c.name); });
    on("prayerAnswered", function (e) {
      var g = G(); if (!g || !e || !e.c) return;
      Mi.remember(e.c, g, "sky", "i prayed and the sky answered", 0.9);
      if (e.c.mind) e.c.mind.pa = (e.c.mind.pa || 0) + 1;
      if (e.how === "miracle") Mi.believe(e.c, g, { c: "sky:listens", k: "sky", w: "the sky one listens", src: "god", f: 0.6 });
    });
    on("hatch", function (e) {
      var g = G(); if (!g || !e || !e.c || e.c.species !== "smol") return;
      var kid = e.c;
      (kid.parents || []).forEach(function (pid) {
        var p = SB.Game.byId(g, pid);
        if (!p || !p.alive || p.species !== "smol") return;
        Mi.remember(p, g, "life", "my baby " + kid.name + " hatched", 1.2, kid.x, kid.z, kid.name);
        // parents who can think pass on where the good things are
        var who = { s: "told", bn: p.sex === "f" ? "mum" : "dad" };
        if (p.tier >= 2 && p.mind) p.mind.pl.slice().sort(function (a, b) { return b.v - a.v; }).slice(0, 2 + Math.floor(p.tier / 2)).forEach(function (q) { Mi.learnPlace(kid, g, q.k, q.x, q.z, q.l, q.v * 0.6, who); });
        if (p.tier >= 2 && p.mind) heirlooms(p, kid, g);
      });
    });
  }
  if (SB.bus) hook();
})();
