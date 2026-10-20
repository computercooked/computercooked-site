/* smol brains 2 — creature.js
   A creature's life on the island: senses -> attention -> decision (its neural net) -> walking and doing ->
   drive changes -> reward -> learning. Plus plans (make / build, run step by step), carrying (hand, bag,
   tool belt), language, the god-hand (tickle / tap / talk), imitation, teaching, prayers, breeding,
   habits (which echo into the kids' genes), illness, ageing and death. Smols and grumps share this code. */
(function () {
  "use strict";
  var SB = window.SB;
  var C = (SB.Creature = {});
  var V = SB.V, N = SB.N, D = SB.D, NV = SB.N_VERBS;
  var K = SB.KINDS, NK = SB.NODES, SK = SB.STRUCTS;
  var I = function () { return SB.Ideas; };

  var BODY_R = 0.32;
  var HEAR_T = 5;
  var GRAV = 20;
  var TARGET_VERBS = SB.VERB_NEEDS_TARGET;
  var CUDDLY = { smol: 1, hand: 1, toy: 1, egg: 1 };
  var EDIBLE = { food: 1, mushroom: 1, bug: 1, medicine: 1 };
  var DO_DUR = [0, 0.4, 1.6, 2.2, 0.8, 0.6, 0.3, 0, 2.5, 1.8, 2.2, 0, 1.6, 0, 0, 2.4, 0.8, 3];
  var BABBLE = ["ba", "goo", "bababa", "mmm", "da?", "eep", "boo", "ga ga", "mama?", "pff", "wa"];
  var GRUMP_LINES = ["grr", "mine!", "hehehe", "smol snack", "bonk", "nyeh", "grumble", "gimme"];

  function gene(g, k, d) { return g && g.genes && g.genes[k] != null ? g.genes[k] : d; }

  /* ---------------- create / revive ---------------- */

  C.radius = function (c) {
    var st = SB.STAGES[c.stage] || SB.STAGES[3];
    return BODY_R * st.scale * ((c.look && c.look.size) || 1) * (c.species === "grump" ? 1.1 : 1) * (1 + (c.species === "smol" ? (c.tier || 0) * 0.045 : 0));
  };
  function stageFor(age) { var s = 0; for (var i = 0; i < SB.STAGES.length; i++) if (age >= SB.STAGES[i].from) s = i; return s; }
  C.stageFor = stageFor;
  function freshAnim() { return { walk: 0, blink: 0, blinkT: 1 + Math.random() * 3, squash: 0, emote: null, emoteT: 0, bob: Math.random() * 6, look: 0, mouth: "smile", hop: 0, flash: 0, wave: 0 }; }

  function derive(c) {
    c.look = SB.Genome.look(c.genome);
    c.tier = c.species === "grump" ? 1 : SB.Genome.tierOf(c.genome);
    c.viewR = 7 + gene(c.genome, "senses", 0.2) * 9 + gene(c.genome, "curiosity", 0.5) * 2 + (c.tier >= 1 ? 2 : 0);
    c.searchR = c.viewR * (1.3 + SB.Genome.planDepth(c.genome) * 0.4);
  }

  C.create = function (game, o) {
    var genome = o.genome, age = o.age || 0;
    var x = o.x == null ? game.world.T.spawn.x : o.x, z = o.z == null ? game.world.T.spawn.z : o.z;
    var c = {
      id: SB.Game.newId(game), type: "creature", species: o.species || "smol", name: o.name || "smol",
      gen: o.gen || 1, parents: (o.parents || []).slice(), born: game.time - age, age: age, stage: stageFor(age),
      alive: true, dying: false, gone: false, fade: 0,
      genome: genome, brain: null, chem: SB.Chem.create(genome),
      x: x, y: SB.World.groundY(game.world, x, z), z: z, px: x, pz: z, py: 0, vx: 0, vy: 0, vz: 0,
      facing: Math.random() * 6.28, onGround: true,
      heldBy: null, holding: null, bag: [], tool: null,
      attn: null, action: null, plan: null, asleep: false, inBed: false,
      speech: null, vocab: o.vocab ? Object.assign({}, o.vocab) : {},
      heard: { verb: -1, noun: -1, name: false, t: -99, nounId: null, idea: null },
      anim: freshAnim(), lastReward: 0, iq: 0, iqT: 0, visited: {},
      stats: { eaten: 0, words: 0, tickles: 0, taps: 0, kids: 0, obeyed: 0, hits: 0, walked: 0, crafted: 0, discoveries: 0, taught: 0 },
      habits: {}, ideas: o.ideas ? Object.assign({}, o.ideas) : {}, ideaQ: {},
      tribe: o.tribe || 0, clade: genome.clade || 0,
      eggCooldown: 0, thinkT: 0.5, chatT: 3 + Math.random() * 5, tapCount: 0, tapT: 0, stuckT: 0, inspired: 0,
      lifespan: SB.BASE_LIFESPAN * (0.8 + 0.4 * gene(genome, "lifespan", 0.5))
    };
    derive(c);
    c.brain = o.brain || C.newBrain(genome, c.tier, game.rng);
    if (c.species === "grump") { c.chem.hunger = 0.5; c.chem.anger = 0.3; }
    if (c.stage === 0) c.chem.hunger = 0.45;
    c.iq = C.iq(c, true);
    return c;
  };
  C.newBrain = function (genome, tier, rng) {
    var b = SB.Brain.create(genome, rng);
    if (genome.species !== "grump" && tier >= 1 && SB.Ideas) SB.Brain.dream(b, SB.Ideas.tierInstincts(tier), 90 + 70 * tier, rng);
    return b;
  };

  C.revive = function (p, game) {
    var c = Object.assign({}, p);
    c.genome = SB.Genome.upgrade(p.genome);
    derive(c);
    c.type = "creature";
    c.brain = SB.Brain.deserialize(p.brain, c.genome, game.rng);
    c.anim = freshAnim();
    c.action = null; c.attn = null; c.speech = null; c.plan = null;
    c.heard = { verb: -1, noun: -1, name: false, t: -99, nounId: null, idea: null };
    c.heldBy = null;
    c.bag = Array.isArray(p.bag) ? p.bag.slice() : [];
    c.holding = p.holding == null ? null : p.holding; c.tool = p.tool == null ? null : p.tool;
    c.stats = Object.assign({ eaten: 0, words: 0, tickles: 0, taps: 0, kids: 0, obeyed: 0, hits: 0, walked: 0, crafted: 0, discoveries: 0, taught: 0 }, p.stats || {});
    c.visited = p.visited || {}; c.vocab = p.vocab || {}; c.habits = p.habits || {}; c.ideas = p.ideas || {}; c.ideaQ = p.ideaQ || {};
    c.chem = Object.assign(SB.Chem.create(c.genome), p.chem || {});
    if (c.z == null) { // a v1 smol: it lived on a 1D line; find it a spot on the island
      var sp = game.world.T.spawn;
      c.x = sp.x + (Math.random() - 0.5) * 6; c.z = sp.z + (Math.random() - 0.5) * 6;
    }
    c.y = SB.World.groundY(game.world, c.x, c.z); c.px = c.x; c.pz = c.z; c.vx = c.vy = c.vz = 0; c.onGround = true;
    if (typeof c.facing !== "number" || Math.abs(c.facing) === 1) c.facing = Math.random() * 6.28;
    if (!c.lifespan) c.lifespan = SB.BASE_LIFESPAN;
    if (c.tribe == null) c.tribe = 0;
    c.clade = c.genome.clade || 0;
    c.thinkT = 0.5; c.chatT = 4; c.tapCount = 0; c.tapT = 0; c.stuckT = 0; c.eggCooldown = c.eggCooldown || 0; c.inspired = c.inspired || 0;
    c.stage = stageFor(c.age);
    c.iq = C.iq(c, true);
    return c;
  };

  /* ---------------- small helpers ---------------- */

  function say(c, text, game, kind) {
    c.speech = { text: text, t: 2.2 + Math.min(3, text.length * 0.06), kind: kind || "say" };
    SB.bus.emit("say", { c: c, text: text, kind: kind || "say" });
  }
  C.say = function (c, text, game) { say(c, text, game, "say"); };
  function emote(c, e, t) { c.anim.emote = e; c.anim.emoteT = t || 1.6; }
  C.emote = emote;
  function garble(word, s) {
    if (s >= 1) return word;
    if (s < 0.5) return word.charAt(0) + word.charAt(0) + "..." + (word.length > 2 ? word.charAt(1) : "") + "?";
    var keep = Math.max(2, Math.round(word.length * s));
    return word.slice(0, keep) + (keep < word.length ? word.charAt(keep - 1) : "") + "?";
  }
  C.garble = garble;
  function knows(c, w) { return (c.vocab[w] || 0) >= 1; }
  C.knows = knows;
  C.knownCount = function (c) { var n = 0; for (var w in c.vocab) if (c.vocab[w] >= 1) n++; return n; };
  function habit(c, k, amt) { c.habits[k] = (c.habits[k] || 0) + amt; }
  C.habit = habit;

  function learnWord(c, word, amt, game) {
    if (!SB.LEXICON[word]) return false;
    var before = c.vocab[word] || 0;
    var rate = amt * (0.6 + gene(c.genome, "attnLearn", 0.5) * 0.8) * (c.stage === 0 ? 1.1 : 1) * (1 + gene(c.genome, "social", 0.2) * 0.6);
    var after = Math.min(1.5, before + rate);
    c.vocab[word] = after;
    if (before < 1 && after >= 1) {
      c.stats.words++;
      game.stats.wordsTaught++;
      habit(c, "think", 0.6);
      say(c, word + "!", game);
      emote(c, "idea", 2);
      SB.bus.emit("learnWord", { c: c, word: word });
      var n = C.knownCount(c);
      if (n >= 1) SB.Game.unlock(game, "word1");
      if (n >= 5) SB.Game.unlock(game, "word5");
      if (n >= 15) SB.Game.unlock(game, "word15");
      if (n >= 30) SB.Game.unlock(game, "word30");
      if (window.cc && cc.event && n === 1 && c.species === "smol") try { cc.event("first_word", { word: word }); } catch (e) {}
      return true;
    }
    return false;
  }
  C.learnWord = learnWord;

  /* ---------------- carrying ---------------- */

  C.bagCap = function (c, game) {
    if (c.species !== "smol" || c.tier < 2) return 0;
    var cap = 2 + (c.tier >= 6 ? 3 : 0);
    if (hasKind(c, game, "basket")) cap += 3;
    return cap;
  };
  function hasKind(c, game, kind) {
    if (c.holding != null) { var h = SB.Game.byId(game, c.holding); if (h && h.kind === kind) return h; }
    for (var i = 0; i < c.bag.length; i++) { var b = SB.Game.byId(game, c.bag[i]); if (b && b.kind === kind) return b; }
    if (c.tool != null) { var t = SB.Game.byId(game, c.tool); if (t && t.kind === kind) return t; }
    return null;
  }
  C.hasKind = hasKind;
  // put an item somewhere on the creature. hand first (or forced into the hand), then bag, then tool belt.
  C.carry = function (c, o, game, toHand) {
    if (!o || o.gone) return false;
    if (o.data) o.data.looseT = 0;
    if (o.heldBy === "hand" && game.hand.heldId === o.id) game.hand.heldId = null;
    if (o.heldBy != null && o.heldBy !== c.id && o.heldBy !== "hand") { var other = SB.Game.byId(game, o.heldBy); if (other) C.release(other, o); }
    var isTool = !!K[o.kind].tool && c.tier >= 2;
    if (toHand && c.holding != null && c.holding !== o.id) {
      var cur = SB.Game.byId(game, c.holding);
      c.holding = null;
      if (cur && !stow(c, cur, game)) dropItem(c, cur, game, 0.5);
    }
    if (c.holding == null) c.holding = o.id;
    else if (isTool && c.tool == null) c.tool = o.id;
    else if (c.bag.length < C.bagCap(c, game)) c.bag.push(o.id);
    else {
      var old = SB.Game.byId(game, c.holding);
      c.holding = o.id;
      if (old) dropItem(c, old, game, 0.6);
    }
    o.heldBy = c.id; o.onGround = false; o.claimed = null;
    habit(c, "hands", 0.3);
    return true;
  };
  function stow(c, o, game) {
    if (K[o.kind].tool && c.tool == null && c.tier >= 2) { c.tool = o.id; return true; }
    if (c.bag.length < C.bagCap(c, game)) { c.bag.push(o.id); return true; }
    return false;
  }
  C.release = function (c, o) {
    if (!o) return;
    if (c.holding === o.id) c.holding = null;
    if (c.tool === o.id) c.tool = null;
    var i = c.bag.indexOf(o.id);
    if (i >= 0) c.bag.splice(i, 1);
    if (o.heldBy === c.id) o.heldBy = null;
  };
  C.consume = function (c, o, game) { if (!o) return; C.release(c, o); SB.World.remove(game.world, o); };
  function dropItem(c, o, game, toss) {
    C.release(c, o);
    o.x = c.x + Math.sin(c.facing) * 0.3; o.z = c.z + Math.cos(c.facing) * 0.3;
    SB.World.toss(o, Math.sin(c.facing) * (toss || 0.5), Math.cos(c.facing) * (toss || 0.5), 2.5);
  }
  C.dropItem = dropItem;
  function dropAll(c, game) {
    [c.holding, c.tool].concat(c.bag).forEach(function (id) { if (id != null) { var o = SB.Game.byId(game, id); if (o) dropItem(c, o, game, 1.2); } });
    c.holding = null; c.tool = null; c.bag = [];
  }
  C.dropAll = dropAll;

  /* ---------------- targets ---------------- */

  // {type, id} -> {x, z, y, r, ref, noun, type, kind}
  function resolve(game, t) {
    if (!t) return null;
    var w = game.world;
    if (t.type === "hand") {
      var h = game.hand;
      if (!h.visible) return null;
      return { x: h.x, z: h.z, y: h.y, r: 0.25, ref: h, noun: "hand", type: "hand", kind: "hand" };
    }
    if (t.type === "water") return { x: t.x, z: t.z, y: SB.World.groundY(w, t.x, t.z), r: 0.4, ref: t, noun: "water", type: "water", kind: "water" };
    var ref = t.type === "node" ? w.nodeById[t.id] : SB.Game.byId(game, t.id);
    if (!ref) return null;
    if (t.type === "creature") {
      if (!ref.alive) return null;
      return { x: ref.x, z: ref.z, y: ref.y, r: C.radius(ref), ref: ref, noun: ref.species, type: "creature", kind: ref.species };
    }
    if (t.type === "node") return { x: ref.x, z: ref.z, y: ref.y, r: NK[ref.kind].r * ref.s, ref: ref, noun: ref.noun, type: "node", kind: ref.kind };
    if (t.type === "struct") return { x: ref.x, z: ref.z, y: 0, r: SK[ref.kind].r * (ref.s || 1), ref: ref, noun: ref.noun, type: "struct", kind: ref.kind };
    if (ref.gone) return null;
    return { x: ref.x, z: ref.z, y: ref.y, r: ref.r || 0.15, ref: ref, noun: ref.noun, type: "item", kind: ref.kind };
  }
  C.resolve = resolve;

  /* ---------------- perception ---------------- */

  var nearestOf = new Array(SB.N_NOUNS), nearestD = new Float32Array(SB.N_NOUNS), cands = [];
  var drv = new Float32Array(SB.N_DRIVES), mask = new Array(NV), bias = new Float32Array(NV);

  function perceive(c, game) {
    var R = c.viewR, w = game.world, i;
    for (i = 0; i < SB.N_NOUNS; i++) { nearestOf[i] = null; nearestD[i] = 1e9; }
    function consider(n, t, d) { if (n == null) return; if (d < nearestD[n]) { nearestD[n] = d; nearestOf[n] = t; } }
    SB.World.itemsNear(w, c.x, c.z, R, function (o, d2) {
      if (o.heldBy === c.id) return;
      if (c.unreach && isUnreachable(c, o.id, game)) return;
      var d = Math.sqrt(d2);
      if (o.heldBy === "hand") d *= 0.4;
      else if (o.heldBy != null) d += 3;
      consider(N[o.noun], { type: "item", id: o.id }, d);
    });
    if (c.holding != null) { var h0 = SB.Game.byId(game, c.holding); if (h0) consider(N[h0.noun], { type: "item", id: h0.id }, 0.5); }
    for (i = 0; i < c.bag.length; i++) { var bi = SB.Game.byId(game, c.bag[i]); if (bi && (bi.noun === "food" || bi.noun === "medicine")) consider(N[bi.noun], { type: "item", id: bi.id }, 0.6); }
    SB.World.eachNodeNear(w, c.x, c.z, R * 0.85, function (n, d2) { if (c.unreach && isUnreachable(c, n.id, game)) return; consider(N[n.noun], { type: "node", id: n.id }, Math.sqrt(d2) + 0.5); });
    var sts = w.structures;
    for (i = 0; i < sts.length; i++) {
      var s = sts[i], ds = SB.dist(s.x, s.z, c.x, c.z);
      if (ds < R * 1.2) consider(N[s.noun], { type: "struct", id: s.id }, Math.max(0, ds - SK[s.kind].r));
    }
    SB.World.creaturesNear(w, game, c.x, c.z, R, function (o, d2) { if (o !== c && o.alive && o.heldBy !== "hand") consider(N[o.species], { type: "creature", id: o.id }, Math.sqrt(d2)); });
    var hd = game.hand;
    if (hd.visible && SB.dist(hd.x, hd.z, c.x, c.z) < R) consider(N.hand, { type: "hand" }, SB.dist(hd.x, hd.z, c.x, c.z) * 0.8);
    var wp = SB.World.waterNear(w, c.x, c.z);
    if (wp) { var dw = SB.dist(wp.x, wp.z, c.x, c.z); if (dw < R * 0.8) consider(N.water, { type: "water", x: wp.x, z: wp.z }, dw); }

    cands.length = 0;
    var recent = game.time - c.heard.t < HEAR_T;
    for (i = 0; i < SB.N_NOUNS; i++) {
      if (!nearestOf[i]) continue;
      var sal = 0.35 * (1 - Math.min(1, nearestD[i] / R));
      if (recent && c.heard.noun === i) sal += 1.4;
      if (i === N.hand && recent && c.heard.name) sal += 1.2;
      if (i === N.bug) sal += 0.1;
      if (i === N.grump) sal += 0.25 * (1 - gene(c.genome, "bravery", 0.5));
      if (i === N.fire && w.night) sal += 0.25;
      if (i === N.wonder) sal += 0.3;
      if (c.attn && c.attn.noun === SB.NOUNS[i]) sal += 0.08;
      if (nearestD[i] < 1.4) sal += 0.5;
      cands.push({ noun: i, sal: sal, t: nearestOf[i], d: nearestD[i] });
    }
    return cands;
  }
  C.perceive = perceive;

  /* ---------------- decision ---------------- */

  // innate "this helps with that" attention: [drive, weight] per noun (food beats chasing bugs when starving)
  var GOOD_BY_NOUN = {}, MATERIAL = {};
  var GOOD_W = { bug: 0.35, plant: 0.45, water: 0.6, hand: 0.6 };
  SB.GOOD.forEach(function (g) { var n = SB.N[g.noun]; (GOOD_BY_NOUN[n] = GOOD_BY_NOUN[n] || []).push([SB.D[g.drive], GOOD_W[g.noun] || 1]); });
  ["stick", "stone", "material", "tool", "crop"].forEach(function (n) { MATERIAL[SB.N[n]] = 1; });

  function think(c, game) {
    var ch = c.chem, rng = game.rng, w = game.world;
    perceive(c, game);
    if (c.species === "grump") {
      var prey = false;
      for (var pi = 0; pi < cands.length; pi++) if (cands[pi].noun === N.smol || cands[pi].noun === N.food) prey = true;
      if (!prey) { c.attn = null; startAction(c, game, V.wander, null, null, null); return; }
    }
    SB.Chem.drives(ch, drv);
    // innate drive-directed attention: a hungry smol's eyes go to food, a cold one's to fire
    for (var ci = 0; ci < cands.length; ci++) {
      var gl = GOOD_BY_NOUN[cands[ci].noun], boost = 0;
      if (gl) for (var gk = 0; gk < gl.length; gk++) { var dv = drv[gl[gk][0]]; if (dv > 0.3) boost = Math.max(boost, (dv - 0.3) * 1.8 * gl[gk][1]); }
      if (c.tier < 2 && MATERIAL[cands[ci].noun]) cands[ci].sal -= 0.15;
      cands[ci].sal += boost;
    }
    var pick = cands.length ? SB.Brain.attend(c.brain, drv, cands, rng) : -1;
    var cand = pick >= 0 ? cands[pick] : null;
    var tgt = cand ? cand.t : null;
    var target = tgt ? resolve(game, tgt) : null;
    if (!target) { cand = null; tgt = null; }
    c.attn = cand ? { type: tgt.type, id: tgt.id, noun: SB.NOUNS[cand.noun], x: target.x, z: target.z } : null;

    var recent = game.time - c.heard.t < HEAR_T;
    var reach = C.radius(c) + (target ? target.r : 0) + 0.25;
    var near = !!target && SB.dist(target.x, target.z, c.x, c.z) < reach + 0.3;
    var noun = cand ? SB.NOUNS[cand.noun] : null;
    var Id = I();
    var knowsUse = !!(target && Id && Id.knowsUse(c, noun, target.kind, game));
    var friends = 0;
    if (c.species === "smol") SB.World.creaturesNear(w, game, c.x, c.z, 4, function (o) { if (o !== c && o.species === "smol") friends++; });
    var home = SB.Society ? SB.Society.home(game, c.tribe) : w.T.spawn;
    SB.Brain.input(c.brain, {
      drives: drv, noun: cand ? cand.noun : -1, heardVerb: recent ? c.heard.verb : -1, heardName: recent && c.heard.name,
      near: near, holding: c.holding != null, dark: w.night, knows: knowsUse, friends: friends > 0,
      rain: w.weather.rain > 0.3, home: SB.dist(c.x, c.z, home.x, home.z) < 7
    });

    // starving: instinct takes over from the net. go straight for the nearest food you can smell
    if (c.species === "smol" && ch.hunger > 0.85 && !c.plan && rng.chance(0.7)) {
      var sf = sniffFood(c, game);
      if (sf) {
        var st = sf.kind && K[sf.kind] && K[sf.kind].noun === "food" && sf.heldBy !== undefined ? { type: "item", id: sf.id } : { type: "node", id: sf.id };
        var sr = resolve(game, st);
        if (sr) { startAction(c, game, st.type === "item" ? V.eat : NIBBLE[sf.kind] ? V.eat : V.play, st, sr, st.type === "item" ? "food" : "plant"); return; }
      }
    }

    // what's physically possible
    var obj = target && target.type === "item" ? target.ref : null;
    for (var v = 0; v < NV; v++) mask[v] = c.tier >= SB.VERB_TIER[v];
    for (v = 0; v < NV; v++) if (TARGET_VERBS[v] && !target) mask[v] = false;
    mask[V.drop] = c.holding != null;
    if (target) {
      var tt = target.type;
      if (tt !== "item" || (obj && obj.heldBy === "hand") || (obj && obj.heldBy === c.id) || (K[target.kind] && K[target.kind].critter === "hop")) mask[V.pickup] = false;
      if (tt === "node" && Id && Id.GATHER[target.kind] && c.tier >= Id.GATHER[target.kind][3]) mask[V.pickup] = c.species === "smol";
      if (!(noun in CUDDLY)) mask[V.cuddle] = false;
      if (c.species === "grump" && noun === "egg") mask[V.pickup] = false;
      if (!(noun in EDIBLE) || tt !== "item") mask[V.eat] = false;
      if ((noun === "plant" && NIBBLE[target.kind]) || (noun === "water" && c.chem.hot > 0.25)) mask[V.eat] = true; // drinking only cools you down
      if (tt === "creature" || tt === "hand") mask[V.use] = false;
      if (target.type !== "creature" || target.ref.species !== "smol" || target.ref.asleep) { mask[V.teach] = false; mask[V.give] = false; }
      if (c.holding == null) mask[V.give] = false;
    }
    if (mask[V.make]) mask[V.make] = knowsAny(c, "craft");
    if (mask[V.build]) mask[V.build] = knowsAny(c, "build");
    mask[V.sleep] = ch.sleepy > 0.2 || ch.tired > 0.35;
    // prayers are for when something's really wrong, and not every minute
    if (mask[V.pray]) mask[V.pray] = game.time - (c.prayedAt || -999) > 90 && SB.Chem.top(ch).v > 0.55;
    if (c.species === "grump") { mask[V.cuddle] = false; mask[V.sleep] = false; mask[V.use] = false; }
    if (c.stage === 0) mask[V.hit] = mask[V.hit] && rng.chance(0.3);
    if (c.stage <= 1) { mask[V.build] = false; mask[V.teach] = false; }

    var heardV = recent ? c.heard.verb : -1, useBias = false;
    for (v = 0; v < NV; v++) bias[v] = 0;
    if (heardV >= 0 && mask[heardV]) { bias[heardV] = gene(c.genome, "obedience", 0.5) * 0.18 + (c.heard.name ? 0.05 : 0); useBias = true; }
    if (recent && c.heard.idea && SB.Ideas) { // a spoken idea word: "do that thing"
      var hd = SB.Ideas.BY_ID[c.heard.idea];
      if (hd && SB.Ideas.known(c, hd.id)) { var hv = hd.kind === "build" ? V.build : hd.kind === "craft" ? V.make : V.use; if (mask[hv]) { bias[hv] += 0.25; useBias = true; } }
    }
    // hard-wired reflexes for emergencies (the net still decides everything else)
    if (noun === "food" && mask[V.eat] && ch.hunger > 0.65) { bias[V.eat] += (ch.hunger - 0.55) * 1.4; useBias = true; }
    if (noun === "grump" && mask[V.flee] && ch.fear > 0.6) { bias[V.flee] += (ch.fear - 0.5) * 0.8; useBias = true; }
    if (mask[V.sleep] && (ch.sleepy > 0.85 || ch.tired > 0.9)) { bias[V.sleep] += 0.3; useBias = true; }
    if (ch.hunger > 0.8 && c.species === "smol") mask[V.sleep] = false; // too hungry to sleep
    // smols are reluctant to hit their own kind unless they're really angry (and almost never family)
    if (noun === "smol" && c.species === "smol" && mask[V.hit] && ch.anger < 0.5) {
      var kin = target.ref && SB.Game.related && SB.Game.related(game, c, target.ref);
      if (kin || rng.chance(0.85)) mask[V.hit] = false; else { bias[V.hit] -= 0.3; useBias = true; }
    }
    if (ch.hunger > 0.65 && nearestOf[N.food] == null && c.species === "smol") { bias[V.wander] += (ch.hunger - 0.5) * 0.9; useBias = true; }
    if (noun === "smol" && mask[V.cuddle] && ch.love > 0.7 && c.stage === 3) { bias[V.cuddle] += 0.25 + (ch.love - 0.7); useBias = true; }
    // a sick friend and a healer who knows herbs: bring medicine
    if (noun === "smol" && mask[V.give] && target.ref.chem.sick > 0.4 && c.holding != null) { var hk = SB.Game.byId(game, c.holding); if (hk && hk.noun === "medicine") { bias[V.give] += 0.4; useBias = true; } }

    var any = false;
    for (v = 0; v < NV; v++) if (mask[v]) { any = true; break; }
    var urgent = Math.max(ch.hunger, ch.fear, ch.pain, ch.sick, ch.cold);
    var tempScale = urgent > 0.5 ? 1 - 0.7 * Math.min(1, (urgent - 0.5) * 2.2) : 1;
    var verb = any ? SB.Brain.decide(c.brain, rng, mask, useBias ? bias : null, tempScale) : V.idle;
    startAction(c, game, verb, tgt, target, noun);

    if (heardV >= 0 && verb === heardV) {
      c.stats.obeyed++;
      if (c.species === "smol") {
        SB.Game.unlock(game, "obey");
        SB.bus.emit("obey", { c: c, verb: verb });
        if (knows(c, SB.VERB_WORDS[verb])) say(c, "ok " + SB.VERB_WORDS[verb], game);
        else emote(c, "idea", 1);
      }
      c.heard.verb = -1;
    }
    maybeChat(c, game, verb, noun);
  }
  function knowsAny(c, kind) {
    if (!SB.Ideas) return false;
    for (var id in c.ideas) if (c.ideas[id] >= 1 && SB.Ideas.BY_ID[id] && SB.Ideas.BY_ID[id].kind === kind) return true;
    return false;
  }

  function startAction(c, game, verb, tgt, target, noun) {
    var rng = game.rng;
    var a = { verb: verb, target: tgt, noun: noun, kind: target ? target.kind : null, t: 0, phase: "go", doT: 0, dur: 0, start: SB.Chem.drives(c.chem, new Float32Array(SB.N_DRIVES)), x: new Float32Array(c.brain.x), tx: c.x, tz: c.z };
    switch (verb) {
      case V.idle: a.phase = "do"; a.dur = rng.range(1.2, 2.6); break;
      case V.wander: {
        a.phase = "do"; a.dur = rng.range(3, 6);
        var sniff = null;
        var ang = rng() * 6.283, dist = rng.range(4, 10);
        if (c.species === "grump") {
          var prey = null, pd = 1e9;
          game.creatures.forEach(function (o) { if (o.alive && o.species === "smol") { var d = SB.dist(o.x, o.z, c.x, c.z); if (d < pd) { pd = d; prey = o; } } });
          if (prey) { ang = Math.atan2(prey.x - c.x, prey.z - c.z) + rng.range(-0.4, 0.4); dist = Math.min(pd, 12); a.dur = 6; }
        } else if (c.chem.love > 0.6 && c.stage === 3 && (sniff = findMate(c, game))) {
          // smitten: go looking for someone to cuddle
          ang = Math.atan2(sniff.x - c.x, sniff.z - c.z) + rng.range(-0.2, 0.2);
          dist = Math.min(12, SB.dist(c.x, c.z, sniff.x, sniff.z));
          a.dur = 8;
        } else if (c.chem.hunger > 0.6 && (sniff = sniffFood(c, game))) {
          // hungry and nothing in sight: follow your nose toward the nearest food (or a fruit tree)
          ang = Math.atan2(sniff.x - c.x, sniff.z - c.z) + rng.range(-0.25, 0.25);
          dist = Math.min(12, SB.dist(c.x, c.z, sniff.x, sniff.z));
          a.dur = 8;
        } else if (c.foodSpot && c.chem.hunger > 0.55 && SB.dist(c.x, c.z, c.foodSpot.x, c.foodSpot.z) > 2) {
          ang = Math.atan2(c.foodSpot.x - c.x, c.foodSpot.z - c.z) + rng.range(-0.3, 0.3);
          dist = Math.min(10, SB.dist(c.x, c.z, c.foodSpot.x, c.foodSpot.z));
        } else if (rng.chance(0.4)) {
          // stay roughly around home, curious ones roam further
          var home = SB.Society ? SB.Society.home(game, c.tribe) : game.world.T.spawn, dh = SB.dist(c.x, c.z, home.x, home.z);
          var roam = 14 + gene(c.genome, "curiosity", 0.5) * 22 + c.tier * 4 + Math.max(0, c.chem.hunger - 0.4) * 60;
          if (dh > roam) ang = Math.atan2(home.x - c.x, home.z - c.z) + rng.range(-0.6, 0.6);
        }
        a.tx = c.x + Math.sin(ang) * dist; a.tz = c.z + Math.cos(ang) * dist;
        break;
      }
      case V.sleep:
        a.phase = "do"; a.dur = 999;
        var bed = findBed(c, game);
        if (bed) { a.phase = "go"; a.target = bed; a.bedSeek = true; }
        break;
      case V.drop: a.phase = "do"; a.dur = DO_DUR[verb]; break;
      case V.talk: a.phase = target ? "go" : "do"; a.dur = DO_DUR[verb]; break;
      case V.flee: a.phase = "do"; a.dur = rng.range(1.8, 3); break;
      case V.pray: a.phase = "do"; a.dur = DO_DUR[verb]; break;
      case V.make: case V.build: {
        var plan = verb === V.make ? SB.Ideas.chooseMake(c, game) : SB.Ideas.chooseBuild(c, game);
        if (plan) { c.plan = plan; plan.x = a.x; plan.verb = verb; plan.start = a.start; c.action = null; return; }
        a.phase = "do"; a.dur = 0.6; a.futile = true; // wanted to, couldn't think how
        break;
      }
      default: a.dur = DO_DUR[verb] || 1.2;
    }
    if (verb === V.approach) a.dur = 0.3;
    if (target && target.type === "node" && verb === V.pickup) a.dur = SB.Ideas && SB.Ideas.GATHER[target.kind] ? SB.Ideas.GATHER[target.kind][2] : 2;
    c.action = a;
  }

  function findMate(c, game) {
    var best = null, bd = 45;
    game.creatures.forEach(function (o) { if (o !== c && o.alive && o.species === "smol" && o.stage === 3 && o.eggCooldown <= 0) { var d = SB.dist(o.x, o.z, c.x, c.z); if (d < bd && d > 2) { bd = d; best = o; } } });
    return best;
  }
  function sniffFood(c, game) {
    // the hungrier, the further a smol's nose reaches (a starving one will cross the island)
    var reach = 32 + Math.max(0, c.chem.hunger - 0.6) * 110;
    var it = SB.World.nearestItem(game.world, c.x, c.z, reach, function (o) { return o.noun === "food" && o.heldBy == null && !(o.data && o.data.rotten) && !isUnreachable(c, o.id, game); });
    if (it) return it;
    // a plant only smells of food when it's nearly ready to drop some
    return SB.World.nearestNode(game.world, c.x, c.z, reach, function (n) { var d = NK[n.kind]; return d.drops && K[d.drops] && K[d.drops].noun === "food" && n.state === "ok" && n.kind !== "palm" && !d.stings && (n.dropT == null || n.dropT < d.every * 0.5) && !isUnreachable(c, n.id, game); });
  }

  function unreachable(c, id, game) {
    var u = c.unreach || (c.unreach = {});
    u[id] = game.time + 40;
  }
  function isUnreachable(c, id, game) { return c.unreach && c.unreach[id] != null && c.unreach[id] > game.time; }
  C.unreachable = unreachable;

  function findBed(c, game) {
    var w = game.world, best = null, bd = 1e9;
    w.structures.forEach(function (s) {
      if (!s.done || s.kind !== "hut") return;
      var d = SB.dist(s.x, s.z, c.x, c.z) + (s.tribe === c.tribe ? 0 : 10);
      if (d < bd && d < 25) { bd = d; best = { type: "struct", id: s.id }; }
    });
    if (!best && w.T.nest && SB.dist(w.T.nest.x, w.T.nest.z, c.x, c.z) < 18) best = { type: "node", id: w.T.nest.id };
    return best;
  }

  /* ---------------- chatting ---------------- */

  function maybeChat(c, game, verb, noun) {
    if (c.speech && c.speech.t > 0.5) return;
    if (c.far) return;
    var rng = game.rng;
    if (c.species === "grump") { if (rng.chance(0.25)) say(c, rng.pick(GRUMP_LINES), game); return; }
    var chat = (0.05 + gene(c.genome, "chattiness", 0.5) * 0.15) * (c.tier >= 3 ? 1.4 : 1);
    if (!rng.chance(chat)) return;
    if (c.stage === 0 && C.knownCount(c) === 0) { say(c, rng.pick(BABBLE), game, "babble"); return; }
    var top = SB.Chem.top(c.chem), parts = [], dw = SB.DRIVE_WORDS[top.i];
    if (top.v > 0.5) {
      var ds = c.vocab[dw] || 0;
      if (ds >= 0.4) parts.push(c.stage >= 1 && rng.chance(0.5) ? "me" : c.name.toLowerCase(), garble(dw, ds));
    }
    if (noun && SB.NOUN_WORDS[N[noun]]) {
      var nw = SB.NOUN_WORDS[N[noun]], vw = SB.VERB_WORDS[verb];
      var ns = c.vocab[nw] || 0, vs = c.vocab[vw] || 0;
      if (vs >= 0.5 && ns >= 0.5 && verb !== V.idle && verb !== V.wander) parts.push(garble(vw, vs), garble(nw, ns));
      else if (ns >= 0.4 && rng.chance(0.4) && top.v <= 0.5) parts.push(garble(nw, ns));
    }
    // tribe smols talk about their ideas in their own words
    if (c.tier >= 3 && parts.length < 3 && rng.chance(0.4) && game.culture) {
      var ids = Object.keys(c.ideas).filter(function (k) { return c.ideas[k] >= 1 && game.culture.words[k]; });
      if (ids.length) parts.push(game.culture.words[rng.pick(ids)], rng.pick(["good", "!", "yes", "warm", "make", "big"]));
    }
    if (top.v > 0.5 && parts.length < 3) {
      for (var gi = 0; gi < SB.GOOD.length; gi++) {
        var gr = SB.GOOD[gi];
        if (gr.drive !== SB.DRIVES[top.i]) continue;
        var gw = SB.NOUN_WORDS[N[gr.noun]], gs = c.vocab[gw] || 0;
        if (gs >= 0.5) { parts.push("want", garble(gw, gs)); break; }
      }
    }
    if (!parts.length) { if (c.stage === 0 && rng.chance(0.6)) say(c, rng.pick(BABBLE), game, "babble"); return; }
    say(c, parts.join(" "), game);
    var full = 0;
    for (var i = 0; i < parts.length; i++) if (SB.LEXICON[parts[i]] && knows(c, parts[i])) full++;
    if (full >= 2) SB.Game.unlock(game, "sentence");
  }

  /* ---------------- moving ---------------- */

  function speedOf(c, a) {
    if (c.species === "grump") return a && a.verb === V.flee ? 3.6 : 2.0;
    var base = [0.7, 1.05, 1.3, 1.45, 1.25][c.stage] || 1.3;
    var lk = c.look;
    var legs = lk.legs ? 0.85 + lk.legLen * 0.7 : 0.75;
    base *= legs * (0.8 + gene(c.genome, "speed", 0.5) * 0.4);
    if (a && a.verb === V.flee) base *= 1.8;
    if (c.chem.tired > 0.8) base *= 0.6;
    if (c.chem.fear > 0.6) base *= 1.25;
    if (c.tier >= 6) base *= 1.2;
    return base;
  }
  C.speedOf = speedOf;
  var swim = function (c) { return c.look && (c.look.fins || c.tier >= 6); };

  // step toward (tx, tz); steer around water and cliffs; returns true when arrived
  // walk toward (tx, tz); if the straight line is blocked for a moment, plan a route around (A*) and follow it
  function walkToward(c, tx, tz, dt, sp, game, arriveR) {
    var d0 = Math.hypot(tx - c.x, tz - c.z);
    if (d0 < (arriveR || 0.1)) { c.path = null; return true; }
    var goalMoved = !c.pathGoal || Math.abs(c.pathGoal.x - tx) + Math.abs(c.pathGoal.z - tz) > 1.5;
    if (goalMoved) { c.path = null; c.pathGoal = { x: tx, z: tz }; c.wBest = d0; c.wBestT = 0; c.pathTried = false; }
    c.wBestT = (c.wBestT || 0) + dt;
    if (d0 < c.wBest - 0.2) { c.wBest = d0; c.wBestT = 0; }
    if (!c.path && !c.pathTried && (c.wBestT > 0.8 || c.stuckT > 0.4) && d0 > 1.5) {
      c.pathTried = true;
      c.path = SB.World.findPath(game.world, c.x, c.z, tx, tz, swim(c), 5000);
      c.pathI = 0;
      if (!c.path) c.noPath = { x: tx, z: tz, t: game.time };
    }
    // following a route but getting nowhere (a ledge the coarse map thinks is fine): scramble back to proper ground
    if (c.path && c.wBestT > 8) { c.path = null; c.lost = true; }
    if (c.path) {
      var wp = c.path[c.pathI];
      while (wp && Math.hypot(wp.x - c.x, wp.z - c.z) < 0.7 && c.pathI < c.path.length - 1) wp = c.path[++c.pathI];
      if (wp) return stepToward(c, wp.x, wp.z, dt, sp, game, c.pathI >= c.path.length - 1 ? arriveR : 0.3) && c.pathI >= c.path.length - 1;
    }
    return stepToward(c, tx, tz, dt, sp, game, arriveR);
  }
  C.pathing = function (c) { return !!c.path; };

  function stepToward(c, tx, tz, dt, sp, game, arriveR) {
    var dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz);
    if (d < (arriveR || 0.1)) return true;
    var want = Math.atan2(dx, dz), step = Math.min(d, sp * dt), w = game.world;
    var tries = [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9], moved = false;
    // once deflected by an obstacle, keep hugging it for a moment instead of bouncing back and forth
    if (c.deflect > 0) { c.deflect -= dt; want += c.deflectA; }
    for (var i = 0; i < tries.length; i++) {
      var a = want + tries[i] * (c.steer || 1);
      var nx = c.x + Math.sin(a) * step, nz = c.z + Math.cos(a) * step;
      if (SB.World.walkable(w, nx, nz, swim(c)) && SB.World.walkable(w, c.x + Math.sin(a) * 0.5, c.z + Math.cos(a) * 0.5, swim(c))) {
        c.x = nx; c.z = nz; moved = true;
        c.facing += SB.angDiff(c.facing, a) * Math.min(1, dt * 10);
        if (i > 0) { c.steer = tries[i] > 0 ? 1 : -1; if (!(c.deflect > 0)) { c.deflect = 0.6; c.deflectA = tries[i] * c.steer * 0.8; } }
        break;
      }
    }
    if (!moved) { c.stuckT += dt; if (c.stuckT > 3 && !SB.World.pathOpen(w, c.x, c.z)) c.lost = true; return false; }
    c.stuckT = Math.max(0, c.stuckT - dt * 0.5);
    c.anim.walk += step * 3.2;
    c.moving = true;
    c.stats.walked += step;
    habit(c, "walk", step);
    if (SB.World.depthAt(w, c.x, c.z) > 0.35) habit(c, "swim", dt);
    if ((c.anim.walk | 0) % 4 === 0 && Math.random() < 0.05) SB.World.wearAt(w, c.x, c.z);
    return Math.hypot(tx - c.x, tz - c.z) < (arriveR || 0.1);
  }
  C.walkToward = walkToward;

  /* ---------------- acting ---------------- */

  function act(c, dt, game) {
    var a = c.action;
    a.t += dt;
    var tgt = a.target ? resolve(game, a.target) : null;
    if (a.target && !tgt && a.verb !== V.sleep) { finish(c, game); return; }
    if (a.phase === "go") {
      if (!tgt) { a.phase = "do"; return; }
      var reach = C.radius(c) + tgt.r + 0.12;
      if (tgt.type === "item" && tgt.ref.heldBy === c.id) reach = 99;
      var dist = SB.dist(tgt.x, tgt.z, c.x, c.z);
      if (a.bedSeek) reach = 0.4;
      if (dist > reach) {
        // aim for the edge of the target, not its centre
        var gx = tgt.x + (c.x - tgt.x) / (dist || 1) * (reach - 0.05), gz = tgt.z + (c.z - tgt.z) / (dist || 1) * (reach - 0.05);
        if (a.bedSeek) { gx = tgt.x; gz = tgt.z; }
        walkToward(c, gx, gz, dt, speedOf(c, a), game, 0.05);
      }
      dist = SB.dist(tgt.x, tgt.z, c.x, c.z);
      if (a.best == null || dist < a.best - 0.25) { a.best = dist; a.bestT = a.t; }
      if (dist <= reach + 0.05) {
        a.phase = "do"; a.doT = 0;
        c.facing = Math.atan2(tgt.x - c.x, tgt.z - c.z);
        beginDo(c, game, a, tgt);
      } else if (a.t > 25 || (c.stuckT > 1.5 && !c.path) || (a.t - a.bestT > 2.5 && !c.path) || a.t - a.bestT > 7 || (c.noPath && game.time - c.noPath.t < 0.2)) {
        // can't get there (cliff, water, going round in circles): remember that for a while
        c.stuckT = 0;
        if (a.target && a.target.id != null) unreachable(c, a.target.id, game);
        finish(c, game);
      }
      return;
    }
    a.doT += dt;
    switch (a.verb) {
      case V.wander: if (walkToward(c, a.tx, a.tz, dt, speedOf(c, a) * 0.8, game, 0.3) || (c.stuckT > 1 && !c.path) || (c.noPath && game.time - c.noPath.t < 0.2)) a.doT = a.dur; break;
      case V.flee: {
        var away = tgt ? Math.atan2(c.x - tgt.x, c.z - tgt.z) : c.facing;
        walkToward(c, c.x + Math.sin(away) * 3, c.z + Math.cos(away) * 3, dt, speedOf(c, a), game, 0.1);
        break;
      }
      case V.sleep:
        if (!c.asleep) { c.asleep = true; c.inBed = !!(tgt && SB.World.shelterAt(game.world, c.x, c.z)); emote(c, "zzz", 2); }
        break;
      case V.play: c.anim.squash = Math.abs(Math.sin(a.doT * 9)) * 0.25; break;
      case V.eat: c.anim.mouth = "chew"; break;
      case V.cuddle: if (Math.random() < dt * 2 && SB.FX) SB.FX.burst("hearts", c.x, c.y + C.radius(c) * 2.2, c.z, 1); break;
      case V.hit: c.anim.squash = a.doT < 0.3 ? -0.2 : 0; break;
      case V.pray: c.anim.wave = 1; break;
      case V.use: case V.pickup: c.anim.squash = Math.abs(Math.sin(a.doT * 6)) * 0.15; break;
    }
    if (tgt && a.verb !== V.flee && a.verb !== V.wander) c.facing += SB.angDiff(c.facing, Math.atan2(tgt.x - c.x, tgt.z - c.z)) * Math.min(1, dt * 6);
    if (a.verb !== V.sleep && a.doT >= a.dur) complete(c, game, a, tgt);
  }

  function beginDo(c, game, a, tgt) {
    if (a.verb === V.talk && tgt) talkTo(c, tgt.type === "creature" ? tgt.ref : null, game);
    if (a.verb === V.hit) c.anim.squash = -0.25;
  }

  function talkTo(c, listener, game) {
    var rng = game.rng, known = [];
    for (var w in c.vocab) if (c.vocab[w] >= 1) known.push(w);
    if (c.species === "grump") { say(c, rng.pick(GRUMP_LINES), game); return; }
    if (!known.length) { say(c, rng.pick(BABBLE), game, "babble"); return; }
    var word = rng.pick(known), rate = 0.2 * (1 + c.tier * 0.15);
    if (listener && listener.attn && listener.attn.noun) {
      var focus = SB.NOUN_WORDS[N[listener.attn.noun]];
      if (focus && knows(c, focus)) { word = focus; rate = 0.32 * (1 + c.tier * 0.15); }
    }
    say(c, word, game);
    habit(c, "social", 0.3);
    if (listener && listener.species === "smol" && listener.alive && !listener.asleep) { learnWord(listener, word, rate, game); habit(listener, "social", 0.2); }
  }

  var ctxD = {};
  function complete(c, game, a, tgt) {
    var verbName = SB.VERBS[a.verb], noun = tgt ? tgt.noun : null, ch = c.chem, futile = !!a.futile;
    var deltas = noun && TARGET_VERBS[a.verb] ? (SB.STIM[noun] || {})[verbName] : SB.SELF_STIM[verbName];
    if (a.verb === V.talk && noun) deltas = (SB.STIM[noun] || {}).talk || SB.SELF_STIM.talk;
    if (deltas) SB.Chem.apply(ch, deltas); else futile = true;
    var bonus = 0, ideaUsed = null;
    var ref = tgt ? tgt.ref : null, tt = tgt ? tgt.type : null;

    if (tt === "item" && a.verb !== V.approach && a.verb !== V.flee) {
      var res = useItem(c, ref, verbName, game);
      if (res.deltas) { SB.Chem.apply(ch, res.deltas); if (Object.keys(res.deltas).length) futile = false; }
      if (res.chem) SB.Chem.apply(ch, res.chem);
      if (res.picked) futile = false;
    } else if (tt === "node" && a.verb !== V.approach && a.verb !== V.flee) {
      var rn = useNode(c, ref, verbName, game);
      if (rn.deltas) SB.Chem.apply(ch, rn.deltas);
      if (rn.ok) futile = false;
    } else if (tt === "struct" && (a.verb === V.play || a.verb === V.hit) && ref.noun === "fire") {
      SB.Chem.apply(ch, { pain: 0.25, fear: 0.1 }); emote(c, "ouch", 1.2); say(c, "hot!", game);
    } else if (tt === "water" && a.verb === V.eat) { SB.Chem.apply(ch, { hot: -0.15 }); futile = false; }

    if (a.verb === V.use && tgt && SB.Ideas) {
      var ru = SB.Ideas.use(c, tt === "water" ? { type: "water", x: tgt.x, z: tgt.z } : ref, game);
      if (ru.deltas) SB.Chem.apply(ch, ru.deltas);
      if (ru.ok) { futile = false; bonus += 0.12; ideaUsed = toolIdea(c, game, tgt); }
      if (ru.msg && !c.far) say(c, ru.msg, game, "think");
      habit(c, "hands", 0.4);
    }
    if (a.verb === V.drop && c.holding != null) { var hh = SB.Game.byId(game, c.holding); if (hh) dropItem(c, hh, game, 1); }
    if (tt === "creature") creatureEffects(c, ref, a.verb, game);
    if (tt === "hand") handEffects(c, a.verb, game);
    if (a.verb === V.pray) pray(c, game);
    if (a.verb === V.sleep && c.inBed) bonus += 0.05;

    // reward = how much the drives went down, weighted by genes
    var r = 0, dw = c.genome.driveW || [];
    for (var i = 0; i < SB.N_DRIVES; i++) r += (a.start[i] - ch[SB.DRIVES[i]]) * (dw[i] || 1);
    r = r * 2.2 + bonus;
    if (futile) r -= 0.04;
    r = SB.clamp(r, -1, 1);
    c.lastReward = r;
    // while you're away (offline catch-up) brains learn from a quarter of what happens: same direction,
    // far less work, so the catch-up screen is quick on phones
    if (!game.offline || Math.random() < 0.25 || Math.abs(r) > 0.4) SB.Brain.reinforce(c.brain, r);
    if (r > 0.25 && !c.anim.emote) emote(c, "happy", 1.2);
    else if (r < -0.2) emote(c, "sad", 1.2);

    observe(c, a.verb, noun, r, game);
    if (ideaUsed && SB.Ideas) SB.Ideas.observe(c, ideaUsed, game);
    if (Math.abs(r) > 0.15) habit(c, "think", 0.03); // every vivid experience is a little practice at thinking
    c.lastDone = { x: a.x, a: a.verb, t: game.time };
    if (a.verb === V.eat && ref && tt === "item" && ((ref.data && ref.data.rotten) || (K[ref.kind] && K[ref.kind].chem && K[ref.kind].chem.toxin))) c.badMeal = { x: a.x, a: a.verb, t: game.time };

    // a eureka?
    if (SB.Ideas && c.species === "smol" && c.tier >= 2 && !c.far && game.rng.chance(0.7) || (SB.Ideas && c.species === "smol" && c.tier >= 2 && game.rng.chance(0.35))) {
      var hItem = c.holding != null ? SB.Game.byId(game, c.holding) : null;
      ctxD.verb = verbName; ctxD.noun = noun; ctxD.targetKind = tgt ? tgt.kind : null; ctxD.held = hItem ? hItem.kind : null; ctxD.heldNoun = hItem ? hItem.noun : null;
      ctxD.hasTool = SB.Ideas.toolKind(c, game); ctxD.nearFire = !!SB.World.nearestFire(game.world, c.x, c.z, 4);
      ctxD.friends = 0; SB.World.creaturesNear(game.world, game, c.x, c.z, 5, function (o) { if (o !== c && o.species === "smol") ctxD.friends++; });
      ctxD.night = game.world.night; ctxD.sick = ch.sick > 0.3 || a.start[D.sick] > 0.3; ctxD.cold = ch.cold > 0.4; ctxD.raining = game.world.weather.rain > 0.3;
      ctxD.windy = game.world.weather.wind > 0.7; ctxD.tier = c.tier;
      SB.Ideas.tryDiscover(c, ctxD, game);
    }
    c.action = null;
    c.thinkT = 0.15 + game.rng() * 0.35;
  }

  function toolIdea(c, game, tgt) {
    var hk = SB.Ideas.heldKind(c, game), tk = SB.Ideas.toolKind(c, game);
    var t = hk && K[hk].tool ? hk : tk;
    var map = { pokestick: "poke", hammer: "bonk", blade: "knap", spear: "spear", torch: "torch", axe: "axe" };
    if (tgt && tgt.noun === "fire") return "fire";
    return map[t] || null;
  }

  function finish(c, game) {
    if (c.asleep) { c.asleep = false; c.inBed = false; }
    c.action = null;
    c.thinkT = 0.2;
  }

  // v1-style item interactions (eat, play, hit, pickup, cuddle)
  function useItem(c, o, verb, game) {
    var res = { deltas: {}, chem: {} }, def = K[o.kind], d = o.data;
    if (o.gone) return res;
    if (verb === "eat" && def.food) {
      if (c.species === "grump") res.deltas.hunger = def.food.hunger || -0.2;
      else if (d.rotten) {
        addTo(res.deltas, def.food, 0.4); addTo(res.chem, def.chem, 0.5);
        res.chem.antigen = (res.chem.antigen || 0) + 0.25; res.deltas.pain = (res.deltas.pain || 0) + 0.2;
        say(c, "yuck", game);
      } else {
        addTo(res.deltas, def.food); addTo(res.chem, def.chem);
        if (def.chem && def.chem.toxin) { res.deltas.pain = (res.deltas.pain || 0) + 0.3; say(c, "yuck", game); }
        if (def.raw && game.rng.chance(0.35)) res.chem.antigen = (res.chem.antigen || 0) + 0.18;
        if (o.kind === "nut") { res.deltas.pain = (res.deltas.pain || 0) + 0.05; say(c, "hard...", game, "think"); }
      }
      if (o.kind === "nut") { res.deltas.hunger = -0.02; return res; } // too hard to eat; you need a rock
      c.stats.eaten++; emote(c, "yum", 1.4); c.anim.mouth = "chew";
      c.foodSpot = { x: c.x, z: c.z }; // remember where the food was
      SB.bus.emit("eat", { c: c, obj: o });
      if (c.species === "smol") SB.Game.unlock(game, "feed");
      if ((o.kind === "berry" || o.kind === "grain" || o.kind === "banana") && game.rng.chance(0.12) && c.species === "smol") { var sd = SB.World.add(game.world, game, "seed", c.x, c.z, {}); sd.data.fromMeal = true; }
      if (game.hand.heldId === o.id) game.hand.heldId = null;
      C.consume(c, o, game);
    } else if (verb === "pickup") {
      if (o.heldBy === "hand") return res;
      C.carry(c, o, game, true);
      res.picked = true;
    } else if (verb === "play" || verb === "hit") {
      var away = Math.atan2(o.x - c.x, o.z - c.z);
      if (o.heldBy === c.id) { if (o.kind === "egg") SB.World.warmEgg(game.world, game, o, 0.02); return res; }
      if (def.critter) { o.data.flee = 1.5; if (def.critter === "hop") o.data.t = 0; }
      else if (o.kind === "egg") { if (verb === "hit") { SB.World.toss(o, Math.sin(away) * 0.5, Math.cos(away) * 0.5, 1.5); } }
      else { SB.World.toss(o, Math.sin(away) * (verb === "hit" ? 5 : 3.5), Math.cos(away) * (verb === "hit" ? 5 : 3.5), verb === "hit" ? 5 : 4); }
      if (o.kind === "nut" && verb === "hit" && c.holding != null) { var hs = SB.Game.byId(game, c.holding); if (hs && (hs.kind === "stone" || hs.kind === "hammer")) { SB.World.transform(game.world, o, "nutmeat"); say(c, "crack!", game); } }
    } else if (verb === "cuddle" && o.kind === "egg") SB.World.warmEgg(game.world, game, o);
    return res;
  }
  // low plants a smol can nibble straight off (a little food, no shaking needed)
  var NIBBLE = { bush: 0.06, roots: 0.08, gourds: 0.08 };
  function addTo(dst, src, mul) { if (!src) return; for (var k in src) dst[k] = (dst[k] || 0) + src[k] * (mul == null ? 1 : mul); }

  // nodes: shake trees (play), nibble bushes (eat), gather (pickup)
  function useNode(c, n, verb, game) {
    var res = { deltas: {}, ok: false };
    var def = NK[n.kind];
    if (verb === "play" || verb === "hit") {
      if (def.noun === "plant" && n.state === "ok") { var o = SB.World.shake(game.world, game, n, false); if (o) { res.ok = true; habit(c, "hands", 0.2); } }
      // bees: shaking a hive without smoke (a torch) gets you stung. honey is worth it... sometimes.
      if (def.stings && SB.Ideas && SB.Ideas.heldKind(c, game) !== "torch" && game.rng.chance(0.55)) {
        res.deltas.pain = (res.deltas.pain || 0) + 0.3; res.deltas.fear = (res.deltas.fear || 0) + 0.2;
        emote(c, "ouch", 1.5); if (SB.FX) SB.FX.burst("crumbs", n.x, SB.World.groundY(game.world, n.x, n.z) + 0.9, n.z, 6, { col: [1, 0.85, 0.2] });
      }
      if (n.kind === "boulder" && verb === "hit" && game.rng.chance(0.3)) { SB.World.dropFrom(game.world, game, n, "stone"); res.ok = true; }
    } else if (verb === "eat" && NIBBLE[n.kind]) {
      res.deltas.hunger = -NIBBLE[n.kind]; res.ok = true;
    } else if (verb === "pickup" && SB.Ideas) {
      var g = SB.Ideas.GATHER[n.kind];
      if (g && c.tier >= g[3] && n.state === "ok" && game.world.items.length < 420) {
        if (g[1] && SB.Ideas.toolKind(c, game) !== g[1] && SB.Ideas.heldKind(c, game) !== g[1]) return res;
        var it = SB.World.add(game.world, game, g[0], c.x, c.z, {});
        C.carry(c, it, game, true);
        res.ok = true; habit(c, "hands", 0.5);
      }
    }
    return res;
  }

  function creatureEffects(c, o, verb, game) {
    var oc = o.chem;
    if (verb === V.hit) {
      c.stats.hits++;
      // hurting one of your own when you weren't even angry feels bad (the brain learns from this)
      if (c.species === "smol" && o.species === "smol" && c.chem.anger < 0.4) { SB.Chem.apply(c.chem, { lonely: 0.25, bored: 0.05 }); emote(c, "sad", 1.4); }
      var hard = c.species === "grump" ? 0.3 : 0.2;
      if (o.inBed && c.species === "grump") hard *= 0.2; // huts protect
      SB.Chem.apply(oc, { pain: hard, fear: 0.18, anger: 0.15 });
      o.anim.squash = 0.35; emote(o, "ouch", 1.5);
      if (o.species === "smol") say(o, knows(o, "ouch") ? "ouch!" : "eek!", game);
      if (c.species === "grump" && o.species === "smol" && game.rng.chance(0.2)) oc.antigen = Math.min(1, oc.antigen + 0.25);
      if (c.species === "smol" && o.species === "grump") { habit(c, "fight", 1); SB.Chem.apply(oc, { fear: 0.2 }); }
      if (o.asleep) { o.asleep = false; o.inBed = false; o.action = null; }
      var a = Math.atan2(o.x - c.x, o.z - c.z);
      knock(o, Math.sin(a) * 2.5, Math.cos(a) * 2.5, 3);
      SB.bus.emit("hit", { c: c, target: o });
    } else if (verb === V.cuddle && o.species === "smol") {
      SB.Chem.apply(oc, { lonely: -0.2 });
      emote(c, "love", 1.8); emote(o, "love", 1.8);
      tryBreed(c, o, game, c.action ? c.action.start[D.love] : c.chem.love);
    } else if (verb === V.play && o.species === "smol") {
      SB.Chem.apply(oc, { bored: -0.15 });
    } else if (verb === V.teach && o.species === "smol" && SB.Ideas) {
      var id = SB.Ideas.teach(c, o, game);
      talkTo(c, o, game);
      c.stats.taught++;
      if (id && !c.far) say(c, (game.culture.words[id] || SB.Ideas.BY_ID[id].name) + "!", game);
      if (id && SB.Ideas.known(o, id)) SB.Game.note(game, c.name + " taught " + o.name + " " + SB.Ideas.BY_ID[id].name + " " + SB.Ideas.BY_ID[id].icon);
    } else if (verb === V.give && o.species === "smol" && c.holding != null) {
      var it = SB.Game.byId(game, c.holding);
      if (it) {
        C.release(c, it); C.carry(o, it, game, true);
        habit(c, "social", 1);
        SB.Chem.apply(c.chem, { lonely: -0.15 });
        emote(o, "happy", 1.5);
        // the receiver eats right away if it's food and they're hungry or it's medicine and they're sick
        if ((it.noun === "food" && o.chem.hunger > 0.4) || (it.noun === "medicine" && o.chem.sick > 0.3)) {
          var ru = useItem(o, it, "eat", game);
          SB.Chem.apply(o.chem, ru.deltas); SB.Chem.apply(o.chem, ru.chem);
          SB.Brain.reinforce(c.brain, 0.4); // helping feels good
        }
        if (SB.Ideas && !SB.Ideas.known(c, "share")) SB.Ideas.discover(c, "share", game);
        SB.bus.emit("give", { c: c, to: o, item: it });
      }
    }
  }

  function handEffects(c, verb, game) {
    if (verb === V.cuddle) { emote(c, "love", 1.6); if (SB.FX) SB.FX.burst("hearts", game.hand.x, game.hand.y + 0.3, game.hand.z, 3); }
    if (verb === V.hit) emote(c, c.species === "grump" ? "angry" : "huh", 1.2);
  }

  // a prayer: the god hand gets asked for something specific
  function pray(c, game) {
    var top = SB.Chem.top(c.chem);
    var need = top.v > 0.35 ? SB.DRIVES[top.i] : "nothing";
    c.prayedAt = game.time;
    var p = { id: c.id, name: c.name, need: need, t: game.time, answered: false, input: new Float32Array(c.brain.x) };
    game.prayers = (game.prayers || []).filter(function (q) { return q.id !== c.id && game.time - q.t < 60; });
    game.prayers.push(p);
    habit(c, "social", 0.5);
    emote(c, "pray", 3);
    if (!c.far) say(c, need === "nothing" ? "thank you sky" : ["please", "sky", "help"][game.rng.int(3)] + " " + (SB.DRIVE_WORDS[top.i] || ""), game);
    SB.bus.emit("pray", { c: c, need: need, prayer: p });
  }
  // the god answered: reward the praying (credited to the prayer decision)
  C.prayerAnswered = function (c, game) {
    var p = (game.prayers || []).filter(function (q) { return q.id === c.id && !q.answered; })[0];
    if (!p) return false;
    p.answered = true;
    SB.Brain.teach(c.brain, p.input, V.pray, 0.8, 1.5);
    emote(c, "love", 2);
    SB.bus.emit("prayerAnswered", { c: c, prayer: p });
    return true;
  };

  function knock(o, vx, vz, vy) { o.vx = vx; o.vz = vz; o.vy = vy; o.onGround = false; }
  C.knock = knock;

  // aLove: the actor's love before this cuddle relieved it
  function tryBreed(a, b, game, aLove) {
    if (a.stage !== 3 || b.stage !== 3) return;
    // the pair's love together, so two smols who keep cuddling (and relieving each other) still get there
    if (aLove + b.chem.love < 0.8 || Math.max(aLove, b.chem.love) < 0.5) return;
    if (a.eggCooldown > 0 || b.eggCooldown > 0) return;
    if (SB.Species && !SB.Species.compatible(a, b)) { emote(a, "huh", 1.5); SB.bus.emit("incompatible", { a: a, b: b }); return; }
    var pop = SB.Game.smols(game).length + game.world.items.filter(function (o) { return o.kind === "egg"; }).length;
    if (pop >= SB.Game.POP_CAP) { say(a, "too many smols", game); return; }
    // hard times: when the colony is going hungry, nobody starts a family
    // (and a big colony needs food lying around to raise another: about one bite per smol, more in winter)
    if (SB.Game.colonyHunger && (SB.Game.colonyHunger(game) > 0.55 || (pop > 6 && SB.Game.foodPerSmol(game) < (game.world.season === 3 ? 1.2 : 0.7)))) { say(a, "not now. hungry", game); return; }
    SB.Game.layEgg(game, a, b, (a.x + b.x) / 2, (a.z + b.z) / 2);
    a.chem.love = 0; b.chem.love = 0;
    a.eggCooldown = b.eggCooldown = 170;
    a.stats.kids++; b.stats.kids++;
  }

  // Habits -> echo: what a parent practised, mapped onto evolution genes (0..1 each)
  C.echo = function (c) {
    var h = c.habits || {}, e = {};
    function f(v, n) { return Math.min(1, (v || 0) / n); }
    e.limbs = f(h.walk, 150); e.senses = f(h.walk, 300);
    e.arms = f(h.hands, 8); e.dexterity = f(h.hands, 14);
    e.cortex = f(h.think, 6); e.recall = f(h.think, 10); e.head = f(h.think, 14);
    e.layers = f((h.think || 0) + (h.plan || 0) + (h.build || 0), 18);
    e.planning = f((h.plan || 0) + (h.build || 0), 8); e.social = f(h.social, 6);
    e.fins = f(h.swim, 30); e.fluff = f(h.cold, 90); e.horns = f(h.fight, 3);
    e.glow = f((h.glow || 0) + (c.tier >= 5 ? (h.think || 0) * 0.3 : 0), 16); e.wings = f(h.glow, 40);
    return e;
  };

  // watching others act teaches the brain (for better or worse)
  var obsX = null;
  function observe(actor, verb, noun, r, game) {
    if (!noun || verb === V.idle || verb === V.wander || actor.far) return;
    var rate = actor.species === "grump" ? (verb === V.hit ? 0.12 : 0.04) : r > 0.1 ? 0.1 : 0;
    if (!rate) return;
    var watched = 0;
    SB.World.creaturesNear(game.world, game, actor.x, actor.z, 6, function (w) {
      if (w === actor || !w.alive || w.species !== "smol" || w.asleep || w.far || watched >= 3) return;
      watched++;
      var n = N[noun];
      if (!obsX || obsX.length !== w.brain.nIn) obsX = new Float32Array(w.brain.nIn); else obsX.fill(0);
      SB.Chem.drives(w.chem, drv);
      for (var k = 0; k < SB.N_DRIVES; k++) obsX[SB.IN.DRIVE0 + k] = drv[k];
      obsX[SB.IN.NOUN0 + n] = 1; obsX[SB.IN.NEAR] = 1; obsX[SB.IN.DARK] = game.world.night ? 1 : 0; obsX[SB.IN.BIAS] = 1;
      if (verb < w.brain.nOut && w.tier >= SB.VERB_TIER[verb]) SB.Brain.imitate(w.brain, obsX, verb, rate);
    });
  }

  /* ---------------- plans (make / build) ---------------- */

  function runPlan(c, dt, game) {
    var p = c.plan, Id = SB.Ideas, w = game.world;
    p.t += dt;
    if (p.t > 90 || p.fails > 3) return endPlan(c, game, false);
    var s = p.steps[p.i];
    if (!s) return endPlan(c, game, true);
    s.t = (s.t || 0) + dt;
    var sp = speedOf(c, null);
    switch (s.do) {
      case "fetch": {
        var have = Id.inv(c, game).some(function (o) { return Id.matches(o.kind, s.want) && !o.reserved; });
        if (have && !s.src) { reserveOne(c, game, s.want); p.i++; return; }
        if (!s.src) {
          var src = Id.findSource(c, s.want, game);
          if (!src) { p.fails++; return endPlan(c, game, false); }
          s.src = src.item ? { type: "item", id: src.item.id } : { type: "node", id: src.node.id };
          s.yieldKind = src.yield || null; s.yieldTime = src.time || null;
          if (src.item) src.item.claimed = c.id;
          c.attn = { type: s.src.type, id: s.src.id, noun: (src.item || src.node).noun, x: (src.item || src.node).x, z: (src.item || src.node).z };
        }
        var t = resolve(game, s.src);
        if (!t || (t.type === "item" && t.ref.heldBy != null && t.ref.heldBy !== c.id)) { s.src = null; p.fails++; return; }
        var reach = C.radius(c) + t.r + 0.15, dd = SB.dist(t.x, t.z, c.x, c.z);
        if (dd > reach) {
          if (s.best == null || dd < s.best - 0.25) { s.best = dd; s.bestT = s.t; }
          walkToward(c, t.x, t.z, dt, sp, game, reach);
          if ((c.stuckT > 2 && !c.path) || (s.t - s.bestT > 3 && !c.path) || (c.noPath && game.time - c.noPath.t < 0.2)) { c.stuckT = 0; unreachable(c, t.ref.id, game); if (t.type === "item" && t.ref.claimed === c.id) t.ref.claimed = null; s.src = null; s.best = null; p.fails++; }
          return;
        }
        s.work = (s.work || 0) + dt;
        c.anim.squash = Math.abs(Math.sin(s.work * 7)) * 0.15;
        if (t.type === "item") { C.carry(c, t.ref, game, false); t.ref.reserved = c.id; p.i++; return; }
        var g = s.yieldKind ? [s.yieldKind, null, s.yieldTime || 2] : Id.GATHER[t.kind];
        if (!g) { s.src = null; p.fails++; return; }
        if (s.work >= g[2]) {
          var it = SB.World.add(w, game, g[0], c.x, c.z, {});
          C.carry(c, it, game, false); it.reserved = c.id;
          habit(c, "hands", 0.5);
          p.i++;
        }
        return;
      }
      case "station": {
        var st = Id.stationFor(c, s.at, game);
        if (!st) { p.fails++; return endPlan(c, game, false); }
        if (st.self) { p.i++; return; }
        var sx = st.fire ? st.fire.x : st.struct.x, sz = st.fire ? st.fire.z : st.struct.z;
        if (SB.dist(sx, sz, c.x, c.z) > 1.6) { walkToward(c, sx, sz, dt, sp, game, 1.5); if (c.stuckT > 2) { c.stuckT = 0; p.fails++; } return; }
        c.facing = Math.atan2(sx - c.x, sz - c.z);
        if (st.struct && st.struct.kind === "kiln" && !st.struct.data.lit) { st.struct.data.fuel = 0.6; st.struct.data.lit = true; if (!c.far) say(c, "more fire", game); }
        p.i++;
        return;
      }
      case "craft": {
        var d = Id.BY_ID[s.idea], ws = SB.World.structsNear(w, c.x, c.z, 6, function (x) { return x.kind === "workshop" && x.done; }).length ? 0.5 : 1;
        c.anim.squash = Math.abs(Math.sin(s.t * 8)) * 0.18;
        if (Math.random() < dt * 3 && SB.FX && !c.far) SB.FX.burst("dust", c.x, c.y + 0.2, c.z, 1);
        if (s.t < d.make.time * ws) return;
        var out = Id.craft(c, s.idea, game);
        if (!out) { p.fails++; return endPlan(c, game, false); }
        emote(c, "proud", 1.6);
        if (!c.far) say(c, (game.culture.words[s.idea] || "") + (out ? " " + K[out.kind].emoji : ""), game, "say");
        Id.observe(c, s.idea, game);
        p.i++;
        return;
      }
      case "deliver": {
        var site = SB.World.structById(w, s.site);
        if (!site || site.done) return endPlan(c, game, true);
        if (SB.dist(site.x, site.z, c.x, c.z) > SK[site.kind].r + C.radius(c) + 0.4) { walkToward(c, site.x, site.z, dt, sp, game, SK[site.kind].r + 0.3); if (c.stuckT > 2) { c.stuckT = 0; p.fails++; } return; }
        Id.deliver(c, site, game);
        if (Id.siteReady(site)) { p.steps.push({ do: "work", site: site.id }); }
        p.i++;
        return;
      }
      case "work": {
        var site2 = SB.World.structById(w, s.site);
        if (!site2 || site2.done) return endPlan(c, game, true);
        if (SB.dist(site2.x, site2.z, c.x, c.z) > SK[site2.kind].r + C.radius(c) + 0.5) { walkToward(c, site2.x, site2.z, dt, sp, game, SK[site2.kind].r + 0.35); if (c.stuckT > 2) { c.stuckT = 0; p.fails++; } return; }
        c.facing = Math.atan2(site2.x - c.x, site2.z - c.z);
        c.anim.squash = Math.abs(Math.sin(s.t * 10)) * 0.2;
        if (Math.random() < dt * 4 && SB.FX && !c.far) SB.FX.burst("dust", site2.x + (Math.random() - 0.5), W0(game, site2) + 0.3, site2.z + (Math.random() - 0.5), 1);
        if (!Id.siteReady(site2)) return endPlan(c, game, true);
        if (Id.work(c, site2, dt, game) || s.t > 10) p.i++;
        return;
      }
    }
  }
  function W0(game, s) { return SB.World.heightAt(game.world, s.x, s.z); }
  function reserveOne(c, game, want) {
    var items = SB.Ideas.inv(c, game);
    for (var i = 0; i < items.length; i++) if (SB.Ideas.matches(items[i].kind, want) && !items[i].reserved) { items[i].reserved = c.id; return; }
  }
  function endPlan(c, game, ok) {
    var p = c.plan;
    c.plan = null;
    habit(c, "plan", ok ? 0.6 + p.i * 0.2 : 0.15);
    SB.Ideas.inv(c, game).forEach(function (o) { o.reserved = null; });
    p.steps.forEach(function (s) { if (s.src && s.src.type === "item") { var o = SB.Game.byId(game, s.src.id); if (o && o.claimed === c.id) o.claimed = null; } });
    // the plan's outcome teaches the brain whether "make"/"build" was worth it, and how much this idea is worth
    var ch = c.chem, r = 0, dw = c.genome.driveW || [];
    if (p.start) for (var i = 0; i < SB.N_DRIVES; i++) r += (p.start[i] - ch[SB.DRIVES[i]]) * (dw[i] || 1);
    r = r * 2 + (ok ? 0.25 : -0.12);
    r = SB.clamp(r, -1, 1);
    if (p.x) SB.Brain.teach(c.brain, p.x, p.verb, r * 0.6, 1);
    if (p.idea) c.ideaQ[p.idea] = SB.clamp((c.ideaQ[p.idea] == null ? 0.2 : c.ideaQ[p.idea]) + (r - (c.ideaQ[p.idea] || 0.2)) * 0.3, -1, 1.5);
    c.lastReward = r;
    c.thinkT = 0.3;
    if (!ok && !c.far && game.rng.chance(0.4)) emote(c, "huh", 1.2);
  }
  C.endPlan = endPlan;

  /* ---------------- the hand ---------------- */

  function lesson(c, game, delta) {
    var a = c.action, t = null;
    if (c.plan && c.plan.x) t = { x: c.plan.x, a: c.plan.verb };
    else if (a && a.x && (a.phase === "do" || a.verb === V.approach)) t = { x: a.x, a: a.verb };
    else if (c.lastDone && game.time - c.lastDone.t < 2.5) t = c.lastDone;
    if (t && t.x.length === c.brain.nIn) SB.Brain.teach(c.brain, t.x, t.a, delta, 2);
    else SB.Brain.reinforce(c.brain, SB.clamp(delta * 0.7, -1, 1));
    c.lastReward = SB.clamp(delta, -1, 1);
    c.stats.lessons = (c.stats.lessons || 0) + 1;
    habit(c, "think", 0.35); // being taught grows the next generation's brains
  }
  C.lesson = lesson;

  C.tickle = function (c, game) {
    if (!c.alive) return;
    c.chem.reward = Math.min(1, c.chem.reward + 0.5);
    SB.Chem.apply(c.chem, { lonely: -0.05, bored: -0.03 });
    lesson(c, game, 1);
    c.stats.tickles++; game.stats.tickles++;
    emote(c, c.species === "grump" ? "huh" : "happy", 1.4);
    c.anim.squash = 0.2; c.anim.flash = 0.6;
    if (c.asleep && game.rng.chance(0.3)) { c.asleep = false; c.inBed = false; c.action = null; }
    if (c.species === "smol") { SB.Game.unlock(game, "tickle"); C.prayerAnswered(c, game); }
    SB.bus.emit("tickle", { c: c });
  };

  C.tap = function (c, game) {
    if (!c.alive) return;
    c.chem.punish = Math.min(1, c.chem.punish + 0.5);
    SB.Chem.apply(c.chem, { pain: 0.06, fear: c.species === "grump" ? 0.25 : 0.05 });
    lesson(c, game, -1);
    c.stats.taps++; game.stats.taps++;
    emote(c, "ouch", 1.2);
    c.anim.squash = 0.3;
    if (c.asleep) { c.asleep = false; c.inBed = false; }
    c.action = null; c.thinkT = 0.4;
    if (c.plan) endPlan(c, game, false);
    if (c.species === "grump") {
      if (game.time - c.tapT > 10) c.tapCount = 0;
      c.tapT = game.time; c.tapCount++;
      if (c.tapCount >= 3) { if (!c.goingHome) say(c, "fine! FINE!", game); c.goingHome = true; SB.Game.unlock(game, "scare"); }
    } else SB.Game.unlock(game, "tap");
    SB.bus.emit("tap", { c: c });
  };

  /* ---------------- hearing ---------------- */

  C.hear = function (c, raw, game, opts) {
    if (!c.alive) return;
    opts = opts || {};
    var word = String(raw || "").toLowerCase().replace(/[^a-zü' ]/g, "").trim();
    if (!word) return;
    if (SB.SYNONYMS[word] && !SB.LEXICON[word]) word = SB.SYNONYMS[word];
    var name = c.name.toLowerCase();
    if (c.asleep) { if (word === name && game.rng.chance(0.6)) { c.asleep = false; c.inBed = false; c.action = null; emote(c, "huh", 1.2); } return; }
    if (c.species === "grump") { if (game.rng.chance(0.3)) say(c, "huh?", game); return; }
    var now = game.time;
    if (word === "good" || word === "bad") {
      lesson(c, game, (word === "good" ? 0.5 : -0.5) * (0.5 + gene(c.genome, "obedience", 0.5)));
      emote(c, word === "good" ? "happy" : "sad", 1.2);
      return;
    }
    if (word === name) {
      c.heard.name = true; c.heard.t = now;
      emote(c, "huh", 1.2);
      if (c.action && (c.action.verb === V.idle || c.action.verb === V.wander)) { c.action = null; c.thinkT = 0.2; }
      return;
    }
    var lex = SB.LEXICON[word];
    if (!lex) { if (game.rng.chance(0.5)) c.speech = { text: "?", t: 1.2, kind: "think" }; return; }
    if (lex.type === "verb") {
      c.heard.verb = lex.i; c.heard.t = now;
      if ((c.action && c.action.verb === lex.i) || (c.plan && c.plan.verb === lex.i)) learnWord(c, word, 0.4, game);
      else learnWord(c, word, 0.06, game);
      if (!c.plan && (!c.action || c.action.phase === "go" || c.action.verb === V.idle || c.action.verb === V.wander)) { c.action = null; c.thinkT = 0.25; }
      echo(c, word, game);
      return;
    }
    if (lex.type === "noun") {
      c.heard.noun = lex.i; c.heard.t = now; c.heard.nounId = opts.aboutId || null;
      var looking = false;
      if (opts.about) {
        var ab = opts.about;
        if (SB.dist(ab.x, ab.z, c.x, c.z) < c.viewR + 3) { looking = true; c.attn = { type: ab.type, id: ab.id, noun: SB.NOUNS[lex.i], x: ab.x, z: ab.z }; }
      } else if (c.attn && c.attn.noun === SB.NOUNS[lex.i]) looking = true;
      var correct = opts.aboutNoun == null || opts.aboutNoun === SB.NOUNS[lex.i];
      if (correct) learnWord(c, word, looking ? 0.42 : 0.16, game);
      if (!c.plan && c.action && (c.action.verb === V.idle || c.action.verb === V.wander)) { c.action = null; c.thinkT = 0.3; }
      echo(c, word, game);
      return;
    }
    if (lex.type === "drive") {
      var top = SB.Chem.top(c.chem);
      learnWord(c, word, top.i === lex.i && top.v > 0.4 ? 0.34 : 0.08, game);
      echo(c, word, game);
      return;
    }
    if (lex.type === "idea") {
      // the smols' own word for an idea: those who know it get the hint, others learn the word a little
      c.heard.idea = lex.id; c.heard.t = now;
      learnWord(c, word, SB.Ideas && SB.Ideas.known(c, lex.id) ? 0.5 : 0.1, game);
      if (!c.plan && c.action && (c.action.verb === V.idle || c.action.verb === V.wander)) { c.action = null; c.thinkT = 0.25; }
      echo(c, word, game);
    }
  };
  function echo(c, word, game) {
    var s = c.vocab[word] || 0;
    if (s >= 1) { if (!c.speech || c.speech.t < 0.3) say(c, word, game); return; }
    if (s >= 0.25) say(c, garble(word, s), game, c.stage === 0 ? "babble" : "say");
    else c.speech = { text: "?", t: 1, kind: "think" };
  }

  /* ---------------- life & death ---------------- */

  function die(c, game, cause) {
    if (!c.alive) return;
    c.alive = false; c.dying = true; c.fade = 0; c.asleep = false;
    if (c.plan) endPlan(c, game, false);
    dropAll(c, game);
    if (c.heldBy === "hand") { game.hand.heldId = null; c.heldBy = null; }
    if (c.species === "grump") { c.gone = true; return; }
    game.stats.deaths++;
    var f = game.family[c.id];
    if (f) { f.died = game.time; f.cause = cause; f.name = c.name; f.ideas = Object.keys(c.ideas).filter(function (k) { return c.ideas[k] >= 1; }); }
    var why = { starved: "starved 😢", sick: "got too sick", hurt: "got hurt too badly", old: "passed away of old age, surrounded by snacks", cold: "got too cold", drowned: "drowned. smols without fins can't swim 🌊" }[cause] || "died";
    SB.Game.note(game, c.name + " " + why + ".");
    if (cause === "old") SB.Game.unlock(game, "goodbye");
    if (game.selectedId === c.id) game.selectedId = null;
    SB.bus.emit("death", { c: c, cause: cause });
  }
  C.die = die;
  function causeOfDeath(ch) {
    if (ch.hunger > 0.9) return "starved";
    if (ch.sick > 0.4 || ch.toxin > 0.2) return "sick";
    if (ch.cold > 0.8) return "cold";
    return "hurt";
  }

  /* ---------------- main tick ---------------- */

  C.tick = function (c, dt, game) {
    if (c.dying) { c.fade += dt / 2.5; if (c.fade >= 1) c.gone = true; return; }
    var w = game.world, ch = c.chem, an = c.anim;
    c.px = c.x; c.pz = c.z; c.py = c.y;
    c.age += dt;
    c.moving = false;
    var st = stageFor(c.age);
    if (st !== c.stage) {
      c.stage = st;
      if (c.species === "smol") {
        SB.Game.note(game, c.name + " is now " + (st === 3 || st === 4 ? "an " : "a ") + SB.STAGES[st].name + "!");
        emote(c, "idea", 2);
        SB.bus.emit("grow", { c: c });
      }
    }
    if (c.species === "smol" && c.age > c.lifespan) { die(c, game, "old"); return; }
    if (c.eggCooldown > 0) c.eggCooldown -= dt;
    if (c.inspired > 0) c.inspired -= dt;
    if (c.species === "smol") {
      var bm = SB.World.biomeAt(w, c.x, c.z);
      c.visited[SB.BIOMES[bm].id] = true;
    }

    // body chemistry
    var friends = 0, temp = SB.World.tempAt(w, c.x, c.z);
    if (c.species === "smol") {
      SB.World.creaturesNear(w, game, c.x, c.z, 3.5, function (o) { if (o !== c && o.species === "smol") friends++; });
      var h = game.hand;
      if (h.visible && SB.dist(h.x, h.z, c.x, c.z) < 2.5) friends += 0.5;
      if (c.inBed || SB.World.shelterAt(w, c.x, c.z)) temp = temp + (0.55 - temp) * 0.7;
      if (temp < 0.3) habit(c, "cold", dt);
      // the dark is scary away from fire and home (tribe smols most of all: they know what's out there)
      if (w.night && c.tier >= 1 && !c.asleep && !SB.World.nearestFire(w, c.x, c.z, 6) && !SB.World.shelterAt(w, c.x, c.z)) ch.fear = Math.min(1, ch.fear + dt * 0.0035 * (1 - gene(c.genome, "bravery", 0.5)));
      if (c.tier >= 5) { var cry = SB.World.nearestNode(w, c.x, c.z, 4, function (n) { return n.kind === "crystals"; }); if (cry) habit(c, "glow", dt * 0.2); }
    }
    SB.Chem.tick(ch, dt, {
      temp: temp, dark: w.night, asleep: c.asleep, inBed: c.inBed,
      moving: !!(c.action && c.action.phase === "go") || !!c.plan || (c.action && (c.action.verb === V.wander || c.action.verb === V.flee || c.action.verb === V.play)),
      nearFriends: friends, stage: c.stage, species: c.species
    }, c.genome);
    if (ch.health <= 0) { die(c, game, causeOfDeath(ch)); return; }
    if (c.badMeal) {
      if (game.time - c.badMeal.t > 45) c.badMeal = null;
      else if (ch.sick > 0.2 || ch.pain > 0.35) {
        if (c.badMeal.x.length === c.brain.nIn) SB.Brain.teach(c.brain, c.badMeal.x, c.badMeal.a, -0.9, 1.5);
        c.badMeal = null; emote(c, "sick", 1.6);
        if (c.species === "smol" && !c.speech) say(c, "bleh", game);
      }
    }
    if (c.species === "smol") {
      if (!c.wasSick && ch.sick > 0.5) { c.wasSick = true; SB.Game.note(game, c.name + " is feeling sick 🤢 healroot helps (it grows in damp places)"); SB.bus.emit("sick", { c: c }); }
      else if (c.wasSick && ch.sick < 0.15) { c.wasSick = false; game.stats.cured++; SB.Game.unlock(game, "cure"); SB.bus.emit("cured", { c: c }); }
      if (ch.love > 0.8 && c.stage === 3 && !an.emote && Math.random() < dt * 0.15) emote(c, "love", 1.5);
    }

    // anim timers
    an.blinkT -= dt;
    if (an.blinkT <= 0) { an.blink = 1; an.blinkT = 2 + Math.random() * 4; }
    an.blink = Math.max(0, an.blink - dt * 8);
    an.squash *= Math.max(0, 1 - dt * 6);
    an.flash = Math.max(0, an.flash - dt * 2);
    an.wave = Math.max(0, an.wave - dt);
    an.bob += dt * (c.asleep ? 1.5 : 3);
    if (an.emoteT > 0) { an.emoteT -= dt; if (an.emoteT <= 0) an.emote = null; }
    if (c.speech) { c.speech.t -= dt; if (c.speech.t <= 0) c.speech = null; }
    an.mouth = c.asleep ? "o" : ch.sick > 0.5 || ch.pain > 0.5 ? "frown" : c.action && c.action.verb === V.eat && c.action.phase === "do" ? "chew" : ch.reward > 0.2 || ch.fear > 0.5 ? "open" : SB.Chem.mood(ch) === "sad" ? "frown" : "smile";

    if (c.heldBy === "hand") {
      c.asleep = false; c.inBed = false; c.action = null; c.onGround = false; c.vx = c.vy = c.vz = 0;
      if (c.plan) endPlan(c, game, false);
      an.walk += dt * 10;
      positionHeld(c, game);
      return;
    }

    // airborne (thrown, knocked)
    var gy = SB.World.groundY(w, c.x, c.z);
    if (!c.onGround || c.y > gy + 0.02) {
      c.vy -= GRAV * dt;
      var nx = c.x + c.vx * dt, nz = c.z + c.vz * dt;
      if (SB.World.inBounds(w, nx, nz)) { c.x = nx; c.z = nz; }
      c.y += c.vy * dt;
      gy = SB.World.groundY(w, c.x, c.z);
      if (c.y <= gy) {
        if (c.vy < -9 && c.species === "smol") { SB.Chem.apply(ch, { pain: 0.12 + (-c.vy - 9) / 40, fear: 0.1 }); emote(c, "ouch", 1.2); }
        c.y = gy; c.vy = 0; c.vx = 0; c.vz = 0; c.onGround = true; an.squash = 0.35;
        if (SB.World.depthAt(w, c.x, c.z) > 0.5 && !c.far && SB.FX) SB.FX.burst("splash", c.x, gy, c.z, 14, { r: 0.4 });
      } else { c.onGround = false; positionHeld(c, game); return; }
    }

    // in over its head: a smol that can't swim flails toward the nearest good shore and slowly drowns.
    // c.lost is also how a smol that's wedged somewhere (a pocket of shallows, a ledge) scrambles out.
    var depth = SB.World.depthAt(w, c.x, c.z);
    var deep = depth > 0.5 && !swim(c) && !SB.World.bridgeAt(w, c.x, c.z);
    if (!deep && !c.lost && c.onGround && c.species === "smol" && !SB.World.walkable(w, c.x, c.z, swim(c))) c.lost = true; // perched somewhere impossible
    if (deep || c.lost) {
      c.asleep = false; c.inBed = false; c.action = null;
      if (c.plan) endPlan(c, game, false);
      if (!c.shore || game.time > c.shoreT) { c.shore = findShore(c, game); c.shoreT = game.time + 2.5; }
      var sh = c.shore;
      if (sh) {
        var psp = deep ? 0.35 + gene(c.genome, "limbs", 0.2) * 0.6 : speedOf(c, null) * 0.8; // paddling is slow, legs help
        var pa = Math.atan2(sh.x - c.x, sh.z - c.z) + (deep ? Math.sin(game.time * 2.3 + c.id) * 0.7 : 0);
        var px = c.x + Math.sin(pa) * psp * dt, pz = c.z + Math.cos(pa) * psp * dt;
        if (SB.World.inBounds(w, px, pz)) { c.x = px; c.z = pz; }
        c.facing += SB.angDiff(c.facing, pa) * Math.min(1, dt * 6); c.moving = true; an.walk += dt * (deep ? 9 : 4);
      }
      if (deep) {
        c.drownT = (c.drownT || 0) + dt;
        SB.Chem.apply(ch, { fear: dt * 0.6 });
        ch.health -= dt * (c.drownT > 6 ? 0.05 : 0.03);
        if (!c.far && SB.FX && Math.random() < dt * 3) SB.FX.burst("splash", c.x + (Math.random() - 0.5) * 0.4, SB.World.groundY(w, c.x, c.z), c.z + (Math.random() - 0.5) * 0.4, 3, { r: 0.2 });
        if (Math.random() < dt * 0.6) { emote(c, "huh", 1); if (c.species === "smol" && game.rng.chance(0.3)) say(c, knows(c, "help") ? "help!" : "blub!", game); }
        if (c.drownT > 0.5 && !c.drownNoted && c.species === "smol") { c.drownNoted = true; SB.bus.emit("drowning", { c: c }); }
        if (ch.health <= 0) { die(c, game, "drowned"); return; }
      } else { c.drownT = 0; c.drownNoted = false; }
      if (!deep && (!sh || SB.World.pathOpen(w, c.x, c.z) || SB.dist(c.x, c.z, sh.x, sh.z) < 0.4)) { c.lost = false; c.shore = null; c.stuckT = 0; }
      if (c.lost || deep) {
        finishTick(c, game, gy);
        if (deep) c.y = SB.World.groundY(w, c.x, c.z) - 0.28 + Math.sin(game.time * 5 + c.id) * 0.06; // bobbing, half under
        return;
      }
    }

    // grumps go home at dawn (or when shooed, or when they see fire)
    if (c.species === "grump") {
      var fire = SB.World.nearestFire(w, c.x, c.z, 4.5);
      var spear = false;
      SB.World.creaturesNear(w, game, c.x, c.z, 2.5, function (o) { if (o.species === "smol" && o.tool != null) { var t = SB.Game.byId(game, o.tool); if (t && (t.kind === "spear" || t.kind === "torch")) spear = true; } });
      if (fire || spear) { SB.Chem.apply(ch, { fear: dt * 0.8 }); if (ch.fear > 0.7 && !c.goingHome) { c.goingHome = true; say(c, "hot! nope!", game); game.stats.scaredOff = (game.stats.scaredOff || 0) + 1; } }
      if (!w.night || c.goingHome) {
        var cave = nearestCave(w, c);
        c.asleep = false; c.action = null;
        if (c.holding != null && game.rng.chance(dt * 0.1)) { var held = SB.Game.byId(game, c.holding); if (held && held.kind !== "egg") SB.World.remove(w, held); c.holding = null; }
        walkToward(c, cave.x, cave.z, dt, speedOf(c, null) * 1.4, game, 1);
        c.homeT = (c.homeT || 0) + dt;
        if (SB.dist(c.x, c.z, cave.x, cave.z) < 1.5 || c.homeT > 40) { dropAll(c, game); c.alive = false; c.gone = true; }
        positionHeld(c, game); finishTick(c, game, gy);
        return;
      }
    }

    if (c.asleep) {
      if ((ch.sleepy < 0.05 && ch.tired < 0.1) || ch.pain > 0.45 || ch.fear > 0.55 || ch.hunger > 0.85) {
        c.asleep = false; c.inBed = false;
        if (c.action && c.action.verb === V.sleep) complete(c, game, c.action, null);
        emote(c, "happy", 1);
      } else {
        if (Math.random() < dt * 0.4 && !c.far) emote(c, "zzz", 1.5);
        positionHeld(c, game); finishTick(c, game, gy);
        return;
      }
    }

    // interrupts
    if (c.species === "smol") {
      if (c.plan && (ch.fear > 0.65 || ch.hunger > 0.78 || ch.pain > 0.6 || (ch.sleepy > 0.9 && c.stage < 3))) endPlan(c, game, false);
      if (c.action && c.action.verb !== V.flee && ch.fear > 0.6 && c.action.phase === "go") c.thinkT = 0;
      if (ch.hunger > 0.45 && !c.plan && c.action && (c.action.verb === V.idle || c.action.verb === V.wander || c.action.verb === V.talk || c.action.verb === V.approach) && (c.foodT = (c.foodT || 0) - dt) <= 0) {
        c.foodT = 0.5;
        var snack = SB.World.nearestItem(w, c.x, c.z, ch.hunger > 0.7 ? 4 : 1.5, function (o) { return o.noun === "food" && o.heldBy !== "hand" && o.kind !== "nut"; });
        if (snack && c.action.noun !== "food") { c.action = null; c.thinkT = 0; }
      }
    }

    if (c.plan) runPlan(c, dt, game);
    else {
      if (!c.action) { c.thinkT -= dt * (c.far ? 0.5 : 1); if (c.thinkT <= 0) think(c, game); }
      if (c.action) act(c, dt, game);
    }

    if (c.species === "grump" && c.holding != null && (!c.action || c.action.verb !== V.eat) && game.rng.chance(dt * 0.3)) c.goingHome = true;

    c.chatT -= dt;
    if (c.chatT <= 0) {
      c.chatT = 6 + game.rng() * 10;
      if (c.species === "smol" && !c.speech) maybeChat(c, game, c.action ? c.action.verb : V.idle, c.attn ? c.attn.noun : null);
    }
    finishTick(c, game, gy);
    c.iqT -= dt;
    if (c.iqT <= 0) { c.iq = C.iq(c, true); c.iqT = c.species === "smol" && !c.far ? 10 : 30; }
  };

  function finishTick(c, game, gy) {
    var w = game.world;
    c.x = SB.clamp(c.x, 3, w.T.N - 3); c.z = SB.clamp(c.z, 3, w.T.N - 3);
    var g = SB.World.groundY(w, c.x, c.z);
    if (c.onGround) c.y = g;
    if (c.tier >= 6 && c.species === "smol") c.y = g + 0.25; // ascended smols float a little
    positionHeld(c, game);
  }
  function nearestCave(w, c) {
    var best = w.T.caves[0] || w.T.spawn, bd = 1e9;
    w.T.caves.forEach(function (cv) { var d = SB.dist(cv.x, cv.z, c.x, c.z); if (d < bd) { bd = d; best = cv; } });
    return best;
  }
  // the nearest proper land: walkable and on the open path grid (so not another little pocket)
  function findShore(c, game) {
    var w = game.world, fallback = null;
    for (var r = 0.8; r < 18; r += 0.8) for (var a = 0; a < 6.28; a += 0.4) {
      var x = c.x + Math.sin(a) * r, z = c.z + Math.cos(a) * r;
      if (!SB.World.walkable(w, x, z, false) || SB.World.depthAt(w, x, z) > 0.3) continue;
      if (SB.World.pathOpen(w, x, z)) return { x: x, z: z };
      if (!fallback) fallback = { x: x, z: z };
    }
    return fallback;
  }

  function positionHeld(c, game) {
    var r = C.radius(c), s = Math.sin(c.facing), co = Math.cos(c.facing);
    if (c.holding != null) {
      var o = SB.Game.byId(game, c.holding);
      if (!o || o.heldBy !== c.id) c.holding = null;
      else { o.x = c.x + s * r * 0.95; o.z = c.z + co * r * 0.95; o.y = c.y + r * (c.look.arms ? 0.7 : 0.55); o.vx = o.vy = o.vz = 0; o.rot = c.facing; }
    }
    if (c.tool != null) {
      var t = SB.Game.byId(game, c.tool);
      if (!t || t.heldBy !== c.id) c.tool = null;
      else { t.x = c.x - co * r * 0.8; t.z = c.z + s * r * 0.8; t.y = c.y + r * 0.6; t.rot = c.facing + 1.2; t.onBelt = true; }
    }
    for (var i = c.bag.length - 1; i >= 0; i--) {
      var b = SB.Game.byId(game, c.bag[i]);
      if (!b || b.heldBy !== c.id) { c.bag.splice(i, 1); continue; }
      b.x = c.x - s * r * 0.7; b.z = c.z - co * r * 0.7; b.y = c.y + r * (1.1 + i * 0.25); b.inBag = true;
    }
  }
  C.positionHeld = positionHeld;

  /* ---------------- IQ ---------------- */

  C.iq = function (c, recompute) {
    if (!recompute && c.iq) return c.iq;
    var t = SB.Brain.iqTest(c.brain);
    var words = C.knownCount(c);
    var exp = Math.min(10, (c.brain.updates || 0) / 60);
    var taught = Math.min(15, (c.stats && c.stats.lessons || 0) * 0.15);
    var ideas = SB.Ideas ? SB.Ideas.count(c) : 0;
    var size = Math.min(40, SB.Brain.size(c.brain) * 0.25);
    return Math.round(25 + 60 * t.good + 15 * t.bad + 1.5 * words + exp * 0.5 + taught + ideas * 5 + c.tier * 10 + size);
  };

  /* ---------------- explain (for the UI) ---------------- */

  C.thought = function (c, game) {
    if (!c.alive) return "…";
    if (c.heldBy === "hand") return "wheee (being carried)";
    if (c.asleep) return "zzz (sleeping" + (c.inBed ? " under a roof" : "") + ")";
    var top = SB.Chem.top(c.chem);
    var feel = top.v > 0.35 ? SB.DRIVE_WORDS[top.i] : "fine";
    if (c.plan) {
      var d = SB.Ideas.BY_ID[c.plan.idea], s = c.plan.steps[c.plan.i];
      var what = d ? d.icon + " " + d.name : "something";
      var step = !s ? "" : s.do === "fetch" ? " (getting " + (K[s.want] ? K[s.want].label : s.want) + ")" : s.do === "station" ? " (going to the " + s.at + ")" : s.do === "deliver" ? " (bringing stuff)" : s.do === "work" ? " (building)" : "";
      return feel + " → " + (c.plan.kind === "build" ? "build " : "make ") + what + step;
    }
    if (!c.action) return feel + " → thinking…";
    var v = SB.VERB_WORDS[c.action.verb];
    var n = c.action.noun ? " " + (SB.NOUN_WORDS[N[c.action.noun]] || c.action.noun) : "";
    if (!SB.VERB_NEEDS_TARGET[c.action.verb] && c.action.verb !== V.talk) n = "";
    return feel + " → " + v + n;
  };
})();
