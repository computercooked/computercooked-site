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
  var M = function () { return SB.Mind; };

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
  // smols who talk (tribe and on) have fewer eggs and live longer: grown-up for longer, and two-fifths more life
  C.TALKER_LIFE = 1.4;
  function lifeK(c) { return c && c.species === "smol" && (c.tier || 0) >= 3 ? C.TALKER_LIFE : 1; }
  C.lifeK = lifeK;
  function stageFor(age, c) { var s = 0; for (var i = 0; i < SB.STAGES.length; i++) if (age >= SB.STAGES[i].from * (i === 4 ? lifeK(c) : 1)) s = i; return s; }
  C.stageFor = stageFor;
  // Grown-up faces (tribe and on): an.face follows the mood (SB.Chem.face) but never flickers. A new feeling
  // has to last FACE_WANT seconds and the old face is held at least FACE_HOLD, except falling asleep and
  // waking up, which show at once. Render-only state: anim is never saved.
  var FACE_WANT = 1.2, FACE_HOLD = 2.5;
  function faceStep(c, dt) {
    var an = c.anim, want = c.asleep ? "sleep" : SB.Chem.face(c.chem, an.face, an.emote);
    if (!an.face) { an.face = want; an.faceHold = 0; an.faceWant = want; an.faceWantT = 0; return; }
    an.faceHold += dt;
    if (want === an.face) { an.faceWantT = 0; return; }
    if (want !== an.faceWant) { an.faceWant = want; an.faceWantT = 0; }
    an.faceWantT += dt;
    if (want === "sleep" || an.face === "sleep" || (an.faceWantT >= FACE_WANT && an.faceHold >= FACE_HOLD)) { an.face = want; an.faceHold = 0; an.faceWantT = 0; }
  }
  C.faceStep = faceStep;
  // jump straight to the face its mood calls for (screenshots, a freshly loaded smol)
  C.settleFace = function (c) { if (c.anim) { c.anim.face = null; faceStep(c, 0); } };
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
      tribe: o.tribe || 0, clade: genome.clade || 0, sex: o.sex || (game.rng.chance(0.5) ? "f" : "m"),
      eggCooldown: 0, thinkT: 0.5, chatT: 3 + Math.random() * 5, tapCount: 0, tapT: 0, stuckT: 0, inspired: 0,
      lifespan: SB.BASE_LIFESPAN * (0.8 + 0.4 * gene(genome, "lifespan", 0.5))
    };
    derive(c);
    if (lifeK(c) > 1) { c.lifespan *= lifeK(c); c.lifeX = 1; c.stage = stageFor(c.age, c); }
    c.brain = o.brain || C.newBrain(genome, c.tier, game.rng);
    if (c.species === "grump") { c.chem.hunger = 0.5; c.chem.anger = 0.3; }
    if (c.stage === 0) c.chem.hunger = 0.45;
    c.iq = C.iq(c, true);
    return c;
  };
  C.newBrain = function (genome, tier, rng) {
    var b = SB.Brain.create(genome, rng);
    if (genome.species !== "grump" && tier >= 1 && SB.Ideas) SB.Brain.dream(b, SB.Ideas.tierInstincts(tier), Math.round((90 + 70 * tier) * (SB.quickBrains || 1)), rng); // quickBrains: the title screen's city doesn't need deep sleepers
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
    c.visited = p.visited || {}; c.vocab = renameWords(p.vocab || {}); c.habits = p.habits || {}; c.ideas = p.ideas || {}; c.ideaQ = p.ideaQ || {};
    c.chem = Object.assign(SB.Chem.create(c.genome), p.chem || {});
    if (c.z == null) { // a v1 smol: it lived on a 1D line; find it a spot on the island
      var sp = game.world.T.spawn;
      c.x = sp.x + (Math.random() - 0.5) * 6; c.z = sp.z + (Math.random() - 0.5) * 6;
    }
    c.y = SB.World.groundY(game.world, c.x, c.z); c.px = c.x; c.pz = c.z; c.vx = c.vy = c.vz = 0; c.onGround = true;
    if (typeof c.facing !== "number" || Math.abs(c.facing) === 1) c.facing = Math.random() * 6.28;
    if (!c.lifespan) c.lifespan = SB.BASE_LIFESPAN;
    if (lifeK(c) > 1 && !c.lifeX) { c.lifespan *= lifeK(c); c.lifeX = 1; } // a talker from an older save gets the longer life too
    if (c.tribe == null) c.tribe = 0;
    if (c.sex !== "f" && c.sex !== "m") c.sex = c.id % 2 ? "f" : "m"; // older saves
    c.clade = c.genome.clade || 0;
    c.thinkT = 0.5; c.chatT = 4; c.tapCount = 0; c.tapT = 0; c.stuckT = 0; c.eggCooldown = c.eggCooldown || 0; c.inspired = c.inspired || 0;
    c.stage = stageFor(c.age, c);
    c.iq = C.iq(c, true);
    if (M()) M().revive(c);
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
  var RENAMED = { plant: "tree", stuff: "goods", medi: "herb", hopper: "bunny" }; // v3 gave vague words real names
  function renameWords(v) { for (var k in RENAMED) if (v[k] != null) { v[RENAMED[k]] = Math.max(v[RENAMED[k]] || 0, v[k]); delete v[k]; } return v; }
  function knows(c, w) { return (c.vocab[w] || 0) >= 1; }
  // a proper lesson from the god (see words.js): a bigger step, and a little cheer when it lands
  C.lessonWord = function (c, w, game, amt) {
    var got = learnWord(c, w, amt, game);
    if (!got) { var s = c.vocab[w] || 0; if (s >= 0.25) say(c, garble(w, s), game, c.stage === 0 ? "babble" : "say"); else emote(c, "huh", 1); }
    c.stats.lessons = (c.stats.lessons || 0) + 1;
    habit(c, "social", 0.5); // being taught words makes for chattier kids (language)
    return got;
  };
  C.knows = knows;
  C.knownCount = function (c) { var n = 0; for (var w in c.vocab) if (c.vocab[w] >= 1) n++; return n; };
  function habit(c, k, amt) { c.habits[k] = (c.habits[k] || 0) + amt; if (C.onHabit) C.onHabit(c, k, amt); }
  C.habitOf = habit;
  C.habit = habit;

  function learnWord(c, word, amt, game) {
    if (!SB.LEXICON[word]) return false;
    var before = c.vocab[word] || 0;
    var rate = amt * (0.6 + gene(c.genome, "attnLearn", 0.5) * 0.8) * (c.stage === 0 ? 1.1 : 1) * (1 + gene(c.genome, "social", 0.2) * 0.6) * (1 + (SB.Words ? SB.Words.smarts(game) : 0));
    var after = Math.min(1.5, before + rate);
    c.vocab[word] = after;
    if (before < 1 && after >= 1) {
      c.stats.words++;
      game.stats.wordsTaught++;
      habit(c, "think", 0.6);
      say(c, word + "!", game);
      emote(c, "idea", 2);
      SB.bus.emit("learnWord", { c: c, word: word });
      // it says its new word to whoever's near, and they pick some of it up (each smol passes a word on once)
      if (c.species === "smol" && SB.World && SB.World.creaturesNear) SB.World.creaturesNear(game.world, game, c.x, c.z, 6, function (o) { if (o !== c && o.species === "smol" && o.alive && !o.asleep && (o.vocab[word] || 0) < 1) learnWord(o, word, 0.2, game); });
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
    if (o.data && o.data.n > 1 && SB.Surv) o = SB.Surv.split(game, o); // a pile (survival.js): take one off the top
    if (o.hid != null && M()) M().took(c, o, game);
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
    habit(c, "hands", o.skyT != null && game.time - o.skyT < 180 ? 0.9 : 0.35); // a thing from the sky hand is extra interesting
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
  C.consume = function (c, o, game) { if (!o) return; if (o.hid != null && M()) M().took(c, o, game); C.release(c, o); SB.World.remove(game.world, o); };
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
  // start one action on purpose (a possessed smol, possess.js): the same actions the brain picks from
  C.startAction = function (c, game, verb, tgt) {
    var r = tgt ? resolve(game, tgt) : null;
    if (tgt && !r) return false;
    if (c.asleep) { c.asleep = false; c.inBed = false; }
    startAction(c, game, verb, tgt, r, r ? r.noun : null);
    return true;
  };
  C.canSwim = function (c) { return swim(c); };

  /* ---------------- perception ---------------- */

  var nearestOf = new Array(SB.N_NOUNS), nearestD = new Float32Array(SB.N_NOUNS), cands = [];
  var drv = new Float32Array(SB.N_DRIVES), mask = new Array(NV), bias = new Float32Array(NV);

  function perceive(c, game) {
    var R = c.viewR, w = game.world, i;
    for (i = 0; i < SB.N_NOUNS; i++) { nearestOf[i] = null; nearestD[i] = 1e9; }
    function consider(n, t, d) { if (n == null) return; if (d < nearestD[n]) { nearestD[n] = d; nearestOf[n] = t; } }
    SB.World.itemsNear(w, c.x, c.z, R, function (o, d2) {
      if (o.heldBy === c.id) return;
      if (o.hid != null && M() && !M().canSee(c, o)) return; // hidden food: only its owner and whoever watched know it's there
      if (c.unreach && isUnreachable(c, o.id, game)) return;
      var d = Math.sqrt(d2);
      if (o.heldBy === "hand") d *= 0.4;
      else if (o.heldBy != null) d += 3;
      consider(N[o.noun], { type: "item", id: o.id }, d);
    });
    if (c.holding != null) { var h0 = SB.Game.byId(game, c.holding); if (h0) consider(N[h0.noun], { type: "item", id: h0.id }, 0.5); }
    for (i = 0; i < c.bag.length; i++) { var bi = SB.Game.byId(game, c.bag[i]); if (bi && (bi.noun === "food" || bi.noun === "medicine")) consider(N[bi.noun], { type: "item", id: bi.id }, 0.6); }
    SB.World.eachNodeNear(w, c.x, c.z, R * 0.85, function (n, d2) { if (n.nop || n.state === "gone") return; if (c.unreach && isUnreachable(c, n.id, game)) return; consider(N[n.noun], { type: "node", id: n.id }, Math.sqrt(d2) + 0.5); });
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
    if (c.convo) { startAction(c, game, V.idle, null, null, null); c.action.dur = 1.2; return; } // mid-conversation
    if (c.tantrum && c.species === "smol") { // lashing out: shove whoever's nearest, or stomp about
      var vic = null, vd = 4;
      game.creatures.forEach(function (o) { if (o !== c && o.alive && o.species === "smol" && !o.heldBy) { var dd = SB.dist(o.x, o.z, c.x, c.z); if (dd < vd) { vd = dd; vic = o; } } });
      if (vic && rng.chance(0.45)) { var vt = { type: "creature", id: vic.id }, vr = resolve(game, vt); if (vr) { startAction(c, game, V.hit, vt, vr, "smol"); return; } }
      startAction(c, game, V.wander, null, null, null); c.action.dur = 2.5;
      if (!c.far && rng.chance(0.3)) say(c, rng.pick(["grr!", "hmph!", "BAD!", "no no no"]), game);
      return;
    }
    // hit just now: brave smols hit back (a shove becomes a scuffle)
    if (c.grudge && c.species === "smol" && game.time - c.grudge.t < 6 && ch.pain < 0.6 && rng.chance(0.35 + gene(c.genome, "bravery", 0.5) * 0.5)) {
      var foe = SB.Game.byId(game, c.grudge.id);
      if (foe && foe.alive && SB.dist(foe.x, foe.z, c.x, c.z) < 4 && C.provoke(c, foe, game)) return;
    }
    // the god's orders (see director.js): the sick keep apart, everyone shelters at home
    if (c.quarantine && c.species === "smol") {
      if (ch.sick < 0.15 && ch.antigen < 0.1) c.quarantine = null;
      else if (SB.dist(c.x, c.z, c.quarantine.x, c.quarantine.z) > 2.5) { C.sendTo(c, c.quarantine.x, c.quarantine.z, game, 12); return; }
    }
    if (c.captive != null && c.species === "smol") { // held at a grump camp (threats.js): huddled in the cage
      var cs0 = game.sites && game.sites[c.captive];
      if (cs0 && SB.dist(c.x, c.z, cs0.x, cs0.z) > 1.8) { C.sendTo(c, cs0.x + rng.range(-1, 1), cs0.z + rng.range(-1, 1), game, 10); return; }
      startAction(c, game, V.idle, null, null, null); c.action.dur = 3; if (!c.far && rng.chance(0.1)) say(c, rng.pick(["let me go!", "i want to go home", "...", "help?"]), game); return;
    }
    if (c.hideAt && c.species === "smol") { // grumps or a disaster: kids and elders hide in a hut
      if (game.time > c.hideAt.t) c.hideAt = null;
      else if (SB.dist(c.x, c.z, c.hideAt.x, c.hideAt.z) > 0.9) { C.sendTo(c, c.hideAt.x, c.hideAt.z, game, 10); return; }
      else { startAction(c, game, V.idle, null, null, null); c.action.dur = 2; return; }
    }
    if (c.shelterT > 0 && c.species === "smol" && !c.quarantine) {
      var hm = SB.Society.home(game, c.tribe || 0);
      if (SB.dist(c.x, c.z, hm.x, hm.z) > 4) { C.sendTo(c, hm.x + rng.range(-2, 2), hm.z + rng.range(-2, 2), game, 12); return; }
      startAction(c, game, V.idle, null, null, null); c.action.dur = 2; return;
    }
    if (c.stranger && SB.Strangers) { // a stranger walks up to the village and waits for your answer (or walks away)
      var sg = SB.Strangers.think(c, game);
      if (sg && sg.wait) { startAction(c, game, V.idle, null, null, null); c.action.dur = 2.5; if (!c.far && rng.chance(0.15)) say(c, rng.pick(["hello?", "me friend", "pls?", "..."]), game); return; }
      if (sg) { startAction(c, game, V.wander, null, null, null); c.action.tx = sg.x; c.action.tz = sg.z; c.action.dur = 12; c.action.called = c.stranger.state !== "leaving"; return; }
    }
    if (c.species === "smol" && SB.Orders && SB.Orders.think(c, game)) return; // the sky's orders (orders.js): followed if it trusts you
    // partners both ready for a baby (in love, rested from the last one) find each other at the end of a job, even in a
    // busy village: otherwise builders who work all day never meet. Not when hungry, scared or hurting
    if (c.species === "smol" && c.stage === 3 && c.partner != null && ch.love > 0.5 && c.eggCooldown <= 0 && Math.max(ch.hunger, ch.fear, ch.pain, ch.sick) < 0.5 && rng.chance(0.5)) {
      var pt = SB.Game.byId(game, c.partner);
      if (pt && pt.alive && pt.partner === c.id && pt.stage === 3 && !pt.heldBy && pt.eggCooldown <= 0 && ch.love + pt.chem.love >= 0.85 && SB.dist(pt.x, pt.z, c.x, c.z) < 40) {
        var ptT = { type: "creature", id: pt.id }, ptR = resolve(game, ptT);
        if (ptR) { c.attn = { type: "creature", id: pt.id, noun: "smol", x: ptR.x, z: ptR.z }; startAction(c, game, V.cuddle, ptT, ptR, "smol"); if (c.action) return; }
      }
    }
    // a builder or thinker with nobody, in love: goes looking for someone free to court (otherwise the one clever smol
    // works all day, never meets anyone, and dies without passing the next step on)
    var SOc = SB.Social;
    if (SOc && SOc.eligible && c.species === "smol" && c.stage === 3 && c.tier >= 4 && ch.love > 0.4 && !SOc.partnerOf(game, c) && !(c.widowT && game.time < c.widowT) && Math.max(ch.hunger, ch.fear, ch.pain, ch.sick) < 0.5 && rng.chance(0.3)) {
      var best = null, bd = 30;
      for (var mi = 0; mi < game.creatures.length; mi++) {
        var m = game.creatures[mi];
        if (m.species !== "smol" || m.tier < 3 || m.heldBy || m.asleep || SOc.partnerOf(game, m) || (m.widowT && game.time < m.widowT) || (c.shy && c.shy.id === m.id && game.time < c.shy.t)) continue;
        var md = SB.dist(m.x, m.z, c.x, c.z);
        if (md < bd && SOc.eligible(game, c, m)) { best = m; bd = md; }
      }
      if (best && bd > 2.5) {
        var mT = { type: "creature", id: best.id }, mR = resolve(game, mT);
        if (mR) { c.attn = { type: "creature", id: best.id, noun: "smol", x: mR.x, z: mR.z }; startAction(c, game, V.approach, mT, mR, "smol"); if (c.action) return; }
      }
    }
    perceive(c, game);
    if (c.species === "grump") {
      var prey = false;
      for (var pi = 0; pi < cands.length; pi++) if (cands[pi].noun === N.smol || cands[pi].noun === N.food) prey = true;
      if (!prey) { c.attn = null; startAction(c, game, V.wander, null, null, null); if (c.raider) { c.action.tx = c.raider.x + rng.range(-3, 3); c.action.tz = c.raider.z + rng.range(-3, 3); c.action.dur = 8; } return; } // raiders march on the village
    }
    SB.Chem.drives(ch, drv);
    // innate drive-directed attention: a hungry smol's eyes go to food, a cold one's to fire
    for (var ci = 0; ci < cands.length; ci++) {
      var gl = GOOD_BY_NOUN[cands[ci].noun], boost = 0;
      if (gl) for (var gk = 0; gk < gl.length; gk++) { var dv = drv[gl[gk][0]]; if (dv > 0.3) boost = Math.max(boost, (dv - 0.3) * 1.8 * gl[gk][1]); }
      if (c.tier < 2 && MATERIAL[cands[ci].noun]) cands[ci].sal -= 0.15;
      cands[ci].sal += boost;
      if (ch.love > 0.35 && cands[ci].t.type === "creature" && (c.partner != null ? cands[ci].t.id === c.partner && ch.love > 0.5 : c.court && cands[ci].t.id === c.court.id)) cands[ci].sal += 0.3 + ch.love * 0.5; // eyes for the one they love (or are courting)
      if (c.mind && c.tier >= 1) { var mv = c.mind.val[SB.NOUNS[cands[ci].noun]]; if (mv) cands[ci].sal += mv * 0.15; } // how things went last time
      if (c.lure && cands[ci].t.id === c.lure.id) cands[ci].sal += 3; // the sky set something down for it (tricks.js): its eyes go there, what it does is up to its brain
    }
    if (c.lure && game.time > c.lure.t) c.lure = null;
    var pick = cands.length ? SB.Brain.attend(c.brain, drv, cands, rng) : -1;
    var cand = pick >= 0 ? cands[pick] : null;
    var tgt = cand ? cand.t : null;
    var target = tgt ? resolve(game, tgt) : null;
    if (!target) { cand = null; tgt = null; }
    c.attn = cand ? { type: tgt.type, id: tgt.id, noun: SB.NOUNS[cand.noun], x: target.x, z: target.z } : null;
    if (M() && c.species === "smol") M().notice(c, game, cands);

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

    // spoiled by too many handouts: a peckish smol waits for food to fall from the sky instead of looking for it
    var spoil = game.spoil || 0;
    if (c.species === "smol" && spoil > 0.3 && ch.hunger > 0.45 && ch.hunger < 0.85 && !c.plan && rng.chance(spoil * 0.6)) {
      startAction(c, game, V.idle, null, null, null); c.action.dur = 3;
      if (!c.far && rng.chance(0.25)) say(c, rng.pick(["food sky?", "sky food pls", "wait food"]), game);
      return;
    }
    // starving: instinct takes over from the net. go straight for the nearest food you can smell
    if (c.species === "smol" && ch.hunger > 0.85 && !c.plan && rng.chance(0.7)) {
      var sf = sniffFood(c, game);
      if (sf) {
        var st = sf.kind && K[sf.kind] && K[sf.kind].noun === "food" && sf.heldBy !== undefined ? { type: "item", id: sf.id } : { type: "node", id: sf.id };
        var sr = resolve(game, st);
        if (sr) { startAction(c, game, st.type === "item" ? V.eat : NIBBLE[sf.kind] ? V.eat : V.play, st, sr, st.type === "item" ? "food" : "plant"); return; }
      }
    }

    // a call it understands (a word it knows, from its god): it mostly just does it
    var call = c.called && game.time - c.called.t < 8 ? c.called : null;
    if (call && c.species === "smol" && !c.plan) {
      c.called = null;
      if (!rng.chance(0.8 + gene(c.genome, "obedience", 0.5) * 0.2)) say(c, "no!", game); // a stubborn one
      else if (answerCall(c, game, call)) return;
    }

    // thinking about others (tribe+): comfort, keep clear, share, go and watch a clever one
    // the mind's own plans (tool-user+): hiding food, stealing it back, a ritual, trying another way
    if (M() && c.species === "smol" && !c.plan && M().scheme(c, game)) return;
    var so = M() && c.species === "smol" && !c.plan ? M().social(c, game) : null;
    if (so) {
      if (so.avoid) {
        startAction(c, game, V.wander, null, null, null);
        var aw = Math.atan2(c.x - so.avoid.x, c.z - so.avoid.z);
        c.action.tx = c.x + Math.sin(aw) * 7; c.action.tz = c.z + Math.cos(aw) * 7; c.action.dur = 4;
        return;
      }
      var st2 = { type: "creature", id: so.o.id }, sr2 = resolve(game, st2);
      if (sr2 && c.tier >= SB.VERB_TIER[so.verb]) { startAction(c, game, so.verb, st2, sr2, "smol"); return; }
    }
    var goal = M() && c.species === "smol" ? M().deliberate(c, game, drv) : null;

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
    if (c.callVerb && game.time - c.callVerb.t < 8 && mask[c.callVerb.v]) { bias[c.callVerb.v] += 0.9; useBias = true; }
    if (heardV >= 0 && mask[heardV]) { bias[heardV] = gene(c.genome, "obedience", 0.5) * 0.18 + (c.heard.name ? 0.05 : 0); useBias = true; }
    if (recent && c.heard.idea && SB.Ideas) { // a spoken idea word: "do that thing"
      var hd = SB.Ideas.BY_ID[c.heard.idea];
      if (hd && SB.Ideas.known(c, hd.id)) { var hv = hd.kind === "build" ? V.build : hd.kind === "craft" ? V.make : V.use; if (mask[hv]) { bias[hv] += 0.25; useBias = true; } }
    }
    // hard-wired reflexes for emergencies (the net still decides everything else)
    if (noun === "food" && mask[V.eat] && ch.hunger > 0.65) { bias[V.eat] += (ch.hunger - 0.55) * 1.4; useBias = true; }
    if (noun === "grump" && mask[V.flee] && ch.fear > 0.6) { bias[V.flee] += (ch.fear - 0.5) * 0.8; useBias = true; }
    // armed and brave: stand up to grumps (a club or spear chases them off for good)
    if (noun === "grump" && mask[V.hit] && c.species === "smol" && SB.Ideas) {
      var wpn = SB.Ideas.heldKind(c, game) || SB.Ideas.toolKind(c, game);
      if ((wpn === "club" || wpn === "spear") && gene(c.genome, "bravery", 0.5) > 0.35 && ch.pain < 0.5) { bias[V.hit] += 0.6; useBias = true; }
    }
    if (mask[V.sleep] && (ch.sleepy > 0.85 || ch.tired > 0.9)) { bias[V.sleep] += 0.3; useBias = true; }
    if (ch.hunger > 0.8 && c.species === "smol") mask[V.sleep] = false; // too hungry to sleep
    // smol on smol: hit back when hit, rivals pick fights, friends and family mostly don't,
    // and everyone else shoves each other about now and then (it's funny)
    if (noun === "smol" && c.species === "smol" && mask[V.hit] && target.ref) {
      var foe = target.ref, op = SB.Social ? SB.Social.opinion(game, c, foe) : 0;
      var kin = SB.Game.related && SB.Game.related(game, c, foe);
      var grudge = c.grudge && c.grudge.id === foe.id && game.time - c.grudge.t < 10;
      if (grudge && gene(c.genome, "bravery", 0.5) > 0.3 && ch.pain < 0.6) { bias[V.hit] += 0.7; useBias = true; }
      else if (op <= -25 && ch.anger > 0.12) { bias[V.hit] += 0.2 + Math.min(0.5, (-op - 25) / 100); useBias = true; }
      else if (op >= 25 || (kin && ch.anger < 0.7)) mask[V.hit] = false;
      else if (ch.anger < 0.45 && rng.chance(0.7)) mask[V.hit] = false;
    }
    if (goal && M().goalBias(c, noun, mask, bias)) useBias = true;
    if (c.prio && SB.Orders && SB.Orders.bias(c, game, noun, mask, bias)) useBias = true; // job interests you nudged
    if (ch.hunger > 0.65 && nearestOf[N.food] == null && c.species === "smol") { bias[V.wander] += (ch.hunger - 0.5) * 0.9; useBias = true; }
    // in love, but not with family (or the same sex): go and find someone else instead
    if (noun === "smol" && mask[V.cuddle] && ch.love > 0.6 && c.stage === 3 && c.species === "smol" && target.ref && (target.ref.sex === c.sex || SB.Game.related(game, c, target.ref))) { mask[V.cuddle] = false; if (mask[V.wander]) { bias[V.wander] += 0.4; useBias = true; } }
    if (noun === "smol" && mask[V.cuddle] && c.species === "smol" && target.ref && SB.Social) {
      var mine = SB.Social.intimate(game, c, target.ref), suit = !mine && ch.love > 0.3 && !SB.Social.partnerOf(game, c) && SB.Social.eligible(game, c, target.ref) && !SB.Social.partnerOf(game, target.ref);
      // grown-ups from the tribe on don't hug just anyone: family, friends, and the one they're sweet on
      // (a grown-up with a partner, or one who has one, only by way of comfort: mind.js)
      if (c.stage === 3 && c.tier >= 3 && !mine && !suit && !SB.Game.related(game, c, target.ref)) {
        var tr = target.ref, op2 = SB.Social.opinion(game, c, tr);
        if (tr.stage >= 3 ? op2 < SB.Social.FRIEND || SB.Social.partnerOf(game, c) || SB.Social.partnerOf(game, tr) : op2 < 8) mask[V.cuddle] = false;
      }
      // in love: lean toward the partner, or the one being courted, not toward everyone
      else if (ch.love > 0.7 && c.stage === 3 && (mine ? target.ref.partner === c.id : suit)) { bias[V.cuddle] += 0.25 + (ch.love - 0.7); useBias = true; }
    } else if (noun === "smol" && mask[V.cuddle] && ch.love > 0.7 && c.stage === 3) { bias[V.cuddle] += 0.25 + (ch.love - 0.7); useBias = true; }
    // partners both ready for a baby (in love, rested from the last one): the pull to them beats everything but emergencies
    if (noun === "smol" && mask[V.cuddle] && c.stage === 3 && target.ref && c.partner === target.ref.id && target.ref.partner === c.id && ch.love > 0.5 && ch.love + target.ref.chem.love >= 0.85 && c.eggCooldown <= 0 && target.ref.eggCooldown <= 0) { bias[V.cuddle] += 0.6 + ch.love * 0.5 + Math.max(0, (c.duty || 0) - 0.4) * 0.8; useBias = true; }
    // a grown-up with work to do (builder age on): the duty drive pulls toward building and making, away from cuddles and games
    if ((c.duty || 0) > 0.45 && c.stage === 3) {
      var dd = c.duty - 0.4;
      if (mask[V.build]) { bias[V.build] += dd * 0.9; useBias = true; }
      if (mask[V.make]) { bias[V.make] += dd * 0.5; useBias = true; }
      if (mask[V.use] && knowsUse) { bias[V.use] += dd * 0.4; useBias = true; }
      if (mask[V.cuddle]) { bias[V.cuddle] -= dd * 0.8; useBias = true; }
      if (mask[V.play] && !(c.tier >= 5 && (noun === "totem" || noun === "wonder"))) { bias[V.play] -= dd * 0.5; useBias = true; }
    }
    // a sick friend and a healer who knows herbs: bring medicine
    if (noun === "smol" && mask[V.give] && target.ref.chem.sick > 0.4 && c.holding != null) { var hk = SB.Game.byId(game, c.holding); if (hk && hk.noun === "medicine") { bias[V.give] += 0.4; useBias = true; } }

    var any = false;
    for (v = 0; v < NV; v++) if (mask[v]) { any = true; break; }
    var urgent = Math.max(ch.hunger, ch.fear, ch.pain, ch.sick, ch.cold);
    var tempScale = urgent > 0.5 ? 1 - 0.7 * Math.min(1, (urgent - 0.5) * 2.2) : 1;
    var verb = any ? SB.Brain.decide(c.brain, rng, mask, useBias ? bias : null, tempScale) : V.idle;
    startAction(c, game, verb, tgt, target, noun);

    if (c.callVerb && verb === c.callVerb.v) c.callVerb = null;
    if (heardV >= 0 && verb === heardV) {
      c.stats.obeyed++;
      // asked to do something, and did it: that's how a verb is learned. friends watching pick it up too
      var pw = c.pendingWord;
      if (pw && SB.LEXICON[pw.w] && SB.LEXICON[pw.w].i === verb && game.time - pw.t < 15 && c.species === "smol") {
        c.pendingWord = null;
        C.lessonWord(c, pw.w, game, 0.45);
        emote(c, "proud", 1.5);
        SB.World.creaturesNear(w, game, c.x, c.z, 6, function (o) { if (o !== c && o.species === "smol" && !o.asleep) learnWord(o, pw.w, 0.12, game); });
        SB.bus.emit("verbLesson", { c: c, word: pw.w });
      }
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
  var CALL_VERB = { come: "approach", food: "eat", eat: "eat", sleep: "sleep", play: "play", hug: "cuddle", run: "flee", wait: "idle", explore: "wander", get: "pickup", drop: "drop", make: "make", talk: "talk", teach: "teach", give: "give", build: "build" };
  function answerCall(c, game, call) {
    var w = call.w, vn = CALL_VERB[w];
    if (vn == null) return false;
    var ch = c.chem, rng = game.rng;
    if (w === "come") {
      startAction(c, game, V.wander, null, null, null);
      var a = c.action; a.tx = call.x + rng.range(-1.2, 1.2); a.tz = call.z + rng.range(-1.2, 1.2); a.dur = 9; a.called = true;
      say(c, "ok!", game);
      return true;
    }
    if (w === "food" || w === "eat") {
      if (ch.hunger < 0.3) { say(c, "no hungry", game); return true; }
      var sf = sniffFood(c, game);
      if (!sf) { say(c, "no food?", game); return true; }
      var st = K[sf.kind] && K[sf.kind].noun === "food" && sf.heldBy !== undefined ? { type: "item", id: sf.id } : { type: "node", id: sf.id }, sr = resolve(game, st);
      if (!sr) return false;
      startAction(c, game, st.type === "item" ? V.eat : NIBBLE[sf.kind] ? V.eat : V.play, st, sr, st.type === "item" ? "food" : "plant");
      return true;
    }
    if (w === "sleep") { if (ch.sleepy < 0.25 && ch.tired < 0.3) { say(c, "no sleepy", game); return true; } startAction(c, game, V.sleep, null, null, null); return true; }
    if (w === "wait") { startAction(c, game, V.idle, null, null, null); c.action.dur = 6; return true; }
    if (w === "explore") { startAction(c, game, V.wander, null, null, null); return true; }
    if (w === "drop") { if (c.holding == null) return false; startAction(c, game, V.drop, null, null, null); return true; }
    c.callVerb = { v: V[vn], t: game.time }; // the rest need a target: lean hard toward it and let the brain pick what
    return false;
  }
  // go and hit someone (a fight, a grudge, a tantrum): skips the brain's choice
  C.start = function (c, game, verb, tgt, target, noun) { startAction(c, game, verb, tgt || null, target || null, noun || null); };
  C.provoke = function (c, o, game) {
    var t = { type: "creature", id: o.id }, r = resolve(game, t);
    if (!r || c.plan) return false;
    startAction(c, game, V.hit, t, r, "smol");
    return true;
  };
  // walk somewhere on the god's say-so (everyone home!, a search party): drops whatever the brain was doing
  C.sendTo = function (c, x, z, game, dur) {
    if (!c.alive || c.heldBy) return false;
    if (c.plan && SB.Ideas) C.dropPlan(c, game);
    c.asleep = false; c.inBed = false;
    startAction(c, game, V.wander, null, null, null);
    c.action.tx = x; c.action.tz = z; c.action.dur = dur || 20; c.action.called = true;
    return true;
  };
  // do one thing on the sky's say-so (orders.js): skips the brain's choice, like provoke
  C.startOn = function (c, game, verb, tgt) {
    var r = tgt ? resolve(game, tgt) : null;
    if (tgt && !r) return false;
    if (c.plan) endPlan(c, game, false);
    c.asleep = false; c.inBed = false;
    startAction(c, game, verb, tgt, r, r ? r.noun : null);
    return !!c.action;
  };
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
        } else if (c.chem.love > 0.45 && c.stage === 3 && (sniff = findMate(c, game))) {
          // smitten: go looking for someone to cuddle
          ang = Math.atan2(sniff.x - c.x, sniff.z - c.z) + rng.range(-0.2, 0.2);
          dist = Math.min(12, SB.dist(c.x, c.z, sniff.x, sniff.z));
          a.dur = 8;
        } else if (c.chem.hunger > 0.6 && (sniff = sniffFood(c, game))) {
          // hungry and nothing in sight: follow your nose toward the nearest food (or a fruit tree)
          ang = Math.atan2(sniff.x - c.x, sniff.z - c.z) + rng.range(-0.25, 0.25);
          dist = Math.min(12, SB.dist(c.x, c.z, sniff.x, sniff.z));
          a.dur = 8;
        } else if (M() && (sniff = M().wanderTarget(c, game))) {
          // the map in its head: back to where the good thing was (or off exploring)
          ang = Math.atan2(sniff.x - c.x, sniff.z - c.z);
          dist = Math.min(14, SB.dist(c.x, c.z, sniff.x, sniff.z));
          a.dur = 8; a.why = sniff.why;
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
        // a place it learned to fear: turn round
        var dz = c.species === "smol" && !a.why && M() ? M().dangerAt(c, game, a.tx, a.tz) : null;
        if (dz) { a.tx = c.x - Math.sin(ang) * dist; a.tz = c.z - Math.cos(ang) * dist; c._mt.why = dz.why || "not that way. that's where it hurt"; }
        if (c.species === "smol" && SB.Orders) SB.Orders.steer(c, game, a); // no-go and home zones
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
        if (plan) { if (c.plan) C.dropPlan(c, game); SB.Ideas.inv(c, game).forEach(function (o) { if (o.reserved === c.id) o.reserved = null; }); c.plan = plan; plan.x = a.x; plan.verb = verb; plan.start = a.start; c.action = null; if (M() && c.species === "smol") M().planStarted(c, game, plan); return; }
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
    var p = c.partner != null && SB.Game.byId(game, c.partner);
    if (p && p.alive) return p.stage === 3 && SB.dist(p.x, p.z, c.x, c.z) > 2 ? p : null; // go and find your partner (and only them)
    if (c.widowT && game.time < c.widowT) return null; // still grieving
    var best = null, bs = -1e9;
    game.creatures.forEach(function (o) {
      if (o !== c && o.alive && o.species === "smol" && o.stage === 3 && (o.eggCooldown <= 0 || (c.court && c.court.id === o.id)) && o.sex !== c.sex && !o.stranger && !(SB.Game.related && SB.Game.related(game, c, o)) && !(o.partner != null && o.partner !== c.id && SB.Game.byId(game, o.partner) && SB.Game.byId(game, o.partner).alive) && !(c.shy && c.shy.id === o.id && game.time < c.shy.t)) {
        var d = SB.dist(o.x, o.z, c.x, c.z); if (d > 45 || d < 2) return;
        var s = (SB.Social ? SB.Social.opinion(game, c, o) : 0) - d * 0.8 + (c.court && c.court.id === o.id ? 25 : 0); // someone you like (or are courting), not too far
        if (s > bs) { bs = s; best = o; }
      }
    });
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
      if (!s.done || (s.kind !== "hut" && s.kind !== "house")) return;
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

  // palisades: grumps won't walk through pointy sticks. A raid party pushes through after a while
  var wallsT = -1, walls = [];
  function fenced(c, x, z, game, dt) {
    if (wallsT !== game.time) { wallsT = game.time; walls = game.world.structures.filter(function (s) { return s.kind === "wall" && s.done; }); }
    for (var i = 0; i < walls.length; i++) {
      var s = walls[i];
      if (Math.abs(s.x - x) > 2.2 || Math.abs(s.z - z) > 2.2 || SB.dist(s.x, s.z, x, z) > 2.1 || SB.dist(s.x, s.z, x, z) > SB.dist(s.x, s.z, c.x, c.z)) continue;
      if (c.raider) { c.raider.wallT = (c.raider.wallT || 0) + dt; if (c.raider.wallT > (SB.Threats ? SB.Threats.wallTime(game) : 25)) { if (SB.Threats && SB.Threats.gear(game).rams && !c.raider.rammed) { c.raider.rammed = true; SB.Threats.wreck(game, s, "rammed"); } return false; } if (!c.raider.walled) { c.raider.walled = true; SB.bus.emit("walled", { c: c, st: s }); } }
      else SB.Chem.apply(c.chem, { fear: dt * 0.4 });
      return true;
    }
    return false;
  }
  // a smol you just tapped stands still for a few (real) seconds, so it's easy to teach or tickle.
  // a game-time cap keeps it from sticking at high speed, or in headless runs where real time doesn't pass.
  C.hold = function (c, game, secs) {
    if (!c || c.species !== "smol") return;
    c.holdUntil = (game.playTime || 0) + secs; c.holdGT = game.time + secs * 4;
  };
  function held(c, game) { return c.holdUntil != null && (game.playTime || 0) < c.holdUntil && game.time < c.holdGT && !(c.action && c.action.verb === V.flee); }
  C.isHeld = held;
  function stepToward(c, tx, tz, dt, sp, game, arriveR) {
    var dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz);
    if (d < (arriveR || 0.1)) return true;
    if (held(c, game)) return false;
    var w = game.world, want = Math.atan2(dx, dz), step = Math.min(d, sp * dt * SB.World.roadSpeed(w, c.x, c.z));
    var tries = [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9], moved = false;
    // once deflected by an obstacle, keep hugging it for a moment instead of bouncing back and forth
    if (c.deflect > 0) { c.deflect -= dt; want += c.deflectA; }
    for (var i = 0; i < tries.length; i++) {
      var a = want + tries[i] * (c.steer || 1);
      var nx = c.x + Math.sin(a) * step, nz = c.z + Math.cos(a) * step;
      if (SB.World.walkable(w, nx, nz, swim(c)) && SB.World.walkable(w, c.x + Math.sin(a) * 0.5, c.z + Math.cos(a) * 0.5, swim(c)) && !(c.species === "grump" && fenced(c, nx, nz, game, dt))) {
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
      case V.wander:
        if (walkToward(c, a.tx, a.tz, dt, speedOf(c, a) * (a.called ? 1 : 0.8), game, a.called ? 1.2 : 0.3)) {
          if (a.called) { startAction(c, game, V.idle, null, null, null); c.action.dur = 3; emote(c, "happy", 1.5); return; } // here! waits to see what you want
          a.doT = a.dur;
        }
        else if ((c.stuckT > 1 && !c.path) || (c.noPath && game.time - c.noPath.t < 0.2)) {
          // called over but bumped into a friend or a rock: try a spot next to it instead of giving up
          if (a.called && a.doT < a.dur - 1) { a.tx += game.rng.range(-1.5, 1.5); a.tz += game.rng.range(-1.5, 1.5); c.stuckT = 0; }
          else a.doT = a.dur;
        }
        break;
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
      case V.cuddle: if (Math.random() < dt * 2 && SB.FX && heartsFor(c, tgt, game)) SB.FX.burst("hearts", c.x, c.y + C.radius(c) * 2.2, c.z, 1); break;
      case V.hit: c.anim.squash = a.doT < 0.3 ? -0.2 : 0; break;
      case V.pray: c.anim.wave = 1; break;
      case V.use: case V.pickup: c.anim.squash = Math.abs(Math.sin(a.doT * 6)) * 0.15; break;
    }
    if (tgt && a.verb !== V.flee && a.verb !== V.wander) c.facing += SB.angDiff(c.facing, Math.atan2(tgt.x - c.x, tgt.z - c.z)) * Math.min(1, dt * 6);
    if (a.verb !== V.sleep && a.doT >= a.dur) complete(c, game, a, tgt);
  }

  // floating hearts while cuddling: your partner, your own kid or parent, your own egg, or the sky's hand
  function heartsFor(c, tgt, game) {
    if (!tgt) return false;
    if (tgt.type === "hand") return true;
    if (tgt.type === "creature") return !SB.Social || SB.Social.intimate(game, c, tgt.ref);
    return tgt.type === "item" && tgt.ref.kind === "egg" && !!(tgt.ref.data && tgt.ref.data.parents && tgt.ref.data.parents.indexOf(c.id) >= 0);
  }
  C.heartsFor = heartsFor;
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
    if (listener && SB.Social) SB.Social.onChat(game, c, listener);
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
    if (M() && c.species === "smol") r += M().curiosity(c, game, a, tgt); // the thrill of something new
    r = SB.clamp(r, -1, 1);
    c.lastReward = r;
    // while you're away (offline catch-up) brains learn from a quarter of what happens: same direction,
    // far less work, so the catch-up screen is quick on phones
    if (!game.offline || Math.random() < 0.25 || Math.abs(r) > 0.4) SB.Brain.reinforce(c.brain, r);
    if (r > 0.25 && !c.anim.emote) emote(c, "happy", 1.2);
    else if (r < -0.2) emote(c, "sad", 1.2);

    if (M() && c.species === "smol") M().experience(c, game, a, tgt, r);
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
      if (!c.far) emote(c, "yum", 1.2);
      SB.bus.emit("nibble", { c: c, node: n }); // a nibble is eating too (the blob guide's first step, K-0021)
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

  C._hitFx = function (c, o, game) { return creatureEffects(c, o, V.hit, game); }; // for tests
  function creatureEffects(c, o, verb, game) {
    var oc = o.chem;
    if (verb === V.hit) {
      c.stats.hits++;
      // smol on smol: a shove when they're just annoyed, a real punch between rivals, in a grudge or a tantrum
      var both = c.species === "smol" && o.species === "smol";
      var punch = both && SB.Social && (SB.Social.rival(game, c, o) || c.tantrum);
      // hurting one of your own when you weren't even angry feels bad (the brain learns from this)
      if (both && c.chem.anger < 0.4 && !punch) { SB.Chem.apply(c.chem, { lonely: 0.15, bored: 0.05 }); emote(c, "sad", 1.4); }
      var hard = c.species === "grump" ? 0.3 * Math.min(1.6, c.str || 1) : both ? (punch ? 0.16 : 0.05) : 0.2;
      if (o.inBed && c.species === "grump") hard *= 0.2; // huts protect
      SB.Chem.apply(oc, { pain: hard, fear: 0.18, anger: 0.15 });
      o.anim.squash = 0.35; emote(o, "ouch", 1.5);
      if (o.species === "smol") say(o, knows(o, "ouch") ? "ouch!" : "eek!", game);
      if (c.species === "grump" && o.species === "smol" && game.rng.chance(0.2)) oc.antigen = Math.min(1, oc.antigen + 0.25);
      if (c.species === "grump" && o.species === "smol" && SB.Threats) SB.Threats.wound(game, c, o);
      if (c.species === "smol" && o.species === "grump") {
        habit(c, "fight", 1); SB.Chem.apply(oc, { fear: 0.2 });
        if (o.carry != null && SB.Threats) SB.Threats.drop(game, o, c); // a whack makes it let go
        // armed: a club or a spear really hurts. three good whacks and the grump runs off for good
        var wk = SB.Ideas ? (SB.Ideas.heldKind(c, game) || SB.Ideas.toolKind(c, game)) : null;
        if (wk === "club" || wk === "spear") {
          SB.Chem.apply(oc, { pain: 0.35 / (o.tough || 1), fear: 0.5 / (o.tough || 1) });
          o.whacked = (o.whacked || 0) + 1;
          if (o.whacked >= (SB.Threats ? SB.Threats.whacksNeeded(o) : 3)) { o.alive = false; o.gone = true; o.dying = false; if (SB.FX && !o.far) SB.FX.burst("crumbs", o.x, o.y + 0.5, o.z, 14, { col: [0.5, 0.3, 0.6] }); SB.Game.note(game, c.name + " chased a grump off for good! 🏏"); SB.bus.emit("grumpChased", { c: c, g: o }); }
          else { o.action = null; o.thinkT = 0; }
        }
      }
      if (o.asleep) { o.asleep = false; o.inBed = false; o.action = null; }
      var a = Math.atan2(o.x - c.x, o.z - c.z), kf = both && !punch ? 1.5 : 2.5;
      knock(o, Math.sin(a) * kf, Math.cos(a) * kf, both && !punch ? 2 : 3);
      if (both && SB.Social) { SB.Social.onHit(game, c, o, punch ? "punch" : "shove"); if (c.grudge && c.grudge.id === o.id) c.grudge = null; if (punch && SB.FX && !o.far) SB.FX.burst("crumbs", o.x, o.y + 0.4, o.z, 6, { col: [0.85, 0.8, 0.7] }); }
      SB.bus.emit("hit", { c: c, target: o, kind: both ? (punch ? "punch" : "shove") : "hit" });
    } else if (verb === V.cuddle && o.species === "smol") {
      SB.Chem.apply(oc, { lonely: -0.2 });
      // hearts are for partners and for parents with their kids. Friends hug: a smile, no hearts, and a hug
      // from someone who isn't the one doesn't settle a smitten heart
      if (!SB.Social || SB.Social.intimate(game, c, o)) { emote(c, "love", 1.8); emote(o, "love", 1.8); }
      else { emote(c, "happy", 1.4); emote(o, "happy", 1.4); }
      // only a partner settles a smitten heart: a hug for a friend or a cuddle with your kid leaves the longing as it was
      if (o.id !== c.partner && SB.Social && c.action && c.action.start) c.chem.love = Math.max(c.chem.love, c.action.start[D.love] * 0.92);
      if (SB.Social) SB.Social.onCuddle(game, c, o);
      tryBreed(c, o, game, c.action ? c.action.start[D.love] : c.chem.love);
    } else if (verb === V.play && o.species === "smol") {
      SB.Chem.apply(oc, { bored: -0.15 });
      if (SB.Social) SB.Social.onPlay(game, c, o);
    } else if (verb === V.teach && o.species === "smol" && SB.Ideas) {
      var id = SB.Ideas.teach(c, o, game);
      talkTo(c, o, game);
      c.stats.taught++;
      if (id && !c.far) say(c, (game.culture.words[id] || SB.Ideas.BY_ID[id].name) + "!", game);
      if (id && SB.Ideas.known(o, id)) { SB.Game.note(game, c.name + " taught " + o.name + " " + SB.Ideas.BY_ID[id].name + " " + SB.Ideas.BY_ID[id].icon); if (SB.Social) SB.Social.onTeach(game, c, o, SB.Ideas.BY_ID[id].name); }
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
        if (SB.Social) SB.Social.onGive(game, c, o, it);
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
    var p = { id: c.id, name: c.name, need: need, t: game.time, rt: game.playTime || 0, answered: false, input: new Float32Array(c.brain.x) };
    game.prayers = (game.prayers || []).filter(function (q) { return q.id !== c.id && SB.Game.prayerLive(game, q); });
    game.prayers.push(p);
    habit(c, "social", 0.5);
    emote(c, "pray", 3);
    if (!c.far) say(c, need === "nothing" ? "thank you sky" : ["please", "sky", "help"][game.rng.int(3)] + " " + (SB.DRIVE_WORDS[top.i] || ""), game);
    SB.bus.emit("pray", { c: c, need: need, prayer: p });
  }
  // the god answered: reward the praying (credited to the prayer decision)
  // how: "miracle" (you gave what they asked for) or "comfort" (a tickle: nice, but it doesn't fix anything)
  C.prayerAnswered = function (c, game, how) {
    var p = (game.prayers || []).filter(function (q) { return q.id === c.id && !q.answered; })[0];
    if (!p) return false;
    p.answered = true;
    how = how || "comfort";
    SB.Brain.teach(c.brain, p.input, V.pray, how === "miracle" ? 0.8 : 0.3, 1.5);
    emote(c, "love", 2);
    SB.bus.emit("prayerAnswered", { c: c, prayer: p, how: how });
    return true;
  };

  function knock(o, vx, vz, vy) { o.vx = vx; o.vz = vz; o.vy = vy; o.onGround = false; }
  C.knock = knock;

  // aLove: the actor's love before this cuddle relieved it
  C._tryBreed = function (a, b, game, aLove) { return tryBreed(a, b, game, aLove); }; // for tests
  function tryBreed(a, b, game, aLove) {
    if (a.stage !== 3 || b.stage !== 3) return;
    // the pair's love together, so two smols who keep cuddling (and relieving each other) still get there
    if (aLove + b.chem.love < 0.8 || Math.max(aLove, b.chem.love) < 0.5) return;
    if (a.eggCooldown > 0 || b.eggCooldown > 0) return;
    if (a.sex === b.sex) return;
    if (SB.Social && (SB.Social.opinion(game, a, b) < -10 || SB.Social.opinion(game, b, a) < -10)) { emote(a, "huh", 1.2); return; } // not with someone you can't stand
    if (a.partner && a.partner !== b.id && SB.Game.byId(game, a.partner) && SB.Game.byId(game, a.partner).alive) return; // already taken
    // family can't have kids together (parents, brothers and sisters, cousins): a colony needs newcomers
    if (SB.Game.related && SB.Game.related(game, a, b)) { a.chem.love *= 0.5; b.chem.love *= 0.5; if (!a.far) say(a, "we family!", game); SB.bus.emit("kin", { a: a, b: b }); return; }
    if (SB.Species && !SB.Species.compatible(a, b)) { emote(a, "huh", 1.5); SB.bus.emit("incompatible", { a: a, b: b }); return; }
    // from the tribe on, only partners have eggs (courting comes first: social.js). blobs and critters just pair up
    if (SB.Social && Math.min(a.tier, b.tier) >= 3 && a.partner !== b.id) return;
    var pop = SB.Game.smols(game).length + game.world.items.filter(function (o) { return o.kind === "egg"; }).length;
    if (pop >= SB.Game.POP_CAP) { say(a, "too many smols", game); return; }
    // a home for it: from the builder age on, no egg while every hut and house is full
    var room = SB.Civ && SB.Civ.room ? SB.Civ.room(game) : Infinity;
    if (pop >= room) { if (!a.far) say(a, a.tier >= 3 ? "no room for a baby. we need a hut" : "no room", game); a.eggCooldown = b.eggCooldown = 90; SB.bus.emit("noRoom", { a: a, b: b, room: room }); return; }
    // hard times: when the colony is going hungry, nobody starts a family
    // (and a big colony needs food lying around to raise another: about one bite per smol, more in winter)
    if (SB.Game.colonyHunger && (SB.Game.colonyHunger(game) > 0.55 || (pop > 6 && SB.Game.foodPerSmol(game) < (game.world.season === 3 ? 1.2 : 0.7)))) { say(a, "not now. hungry", game); return; }
    if (Math.min(a.tier, b.tier) >= 3 && !payEgg(game, a, b)) { say(a, "not now. hungry", game); return; } // (blobs, critters and tool-users just have them)
    SB.Game.layEgg(game, a, b, (a.x + b.x) / 2, (a.z + b.z) / 2);
    a.chem.love = 0; b.chem.love = 0;
    a.eggCooldown = b.eggCooldown = C.eggGap(game, a, b);
    a.stats.kids++; b.stats.kids++;
  }
  // time between a couple's eggs: 12 minutes of rest, and with love coming back slowly after, about a quarter-hour
  // from egg to egg (a band of a few smols, with room and the island to fill, has them sooner), plus a little more for
  // every little one they're still raising
  C.EGG_GAP = 720;
  C.eggGap = function (game, a, b) {
    var pop = SB.Game.smols(game).length, young = 0;
    game.creatures.forEach(function (k) { if (k.alive && k.species === "smol" && k.stage < 3 && k.parents && (k.parents.indexOf(a.id) >= 0 || k.parents.indexOf(b.id) >= 0)) young++; });
    var band = Math.min(a.tier, b.tier) < 3 ? 0.19 : pop < 6 ? 0.3 : pop < 10 ? 0.5 : pop < 14 ? 0.75 : 1; // a pair of blobs, critters or tool-users: about every 3 min, as before
    return Math.round(C.EGG_GAP * band + 40 * Math.min(4, young) * band);
  };
  // an egg costs food: two bites from the granary or what the couple has to hand (or lying near), and the mother's
  // reserves. A couple with nothing put by and empty bellies waits
  function payEgg(game, a, b) {
    var mum = a.sex === "f" ? a : b, need = 2, v = game.civ;
    if (v && v.granary >= 2 && game.world.structures.some(function (s) { return s.kind === "granary" && s.done; })) { v.granary -= 2; need = 0; }
    var food = function (o) { return o && o.noun === "food" && !(o.data && o.data.rotten) && (o.heldBy == null || o.heldBy === a.id || o.heldBy === b.id); };
    [a, b].forEach(function (p) { if (need > 0 && SB.Ideas) SB.Ideas.inv(p, game).forEach(function (o) { if (need > 0 && food(o)) { C.consume(p, o, game); need--; } }); });
    if (need > 0) {
      var eat = [];
      SB.World.itemsNear(game.world, (a.x + b.x) / 2, (a.z + b.z) / 2, 9, function (o) { if (eat.length < need && food(o) && o.heldBy == null && !o.reserved && !(SB.Ideas && SB.Ideas.claimed(o, game))) eat.push(o); });
      eat.forEach(function (o) { SB.World.remove(game.world, o); need--; });
    }
    if (need > 0 && (a.chem.hunger > 0.45 || b.chem.hunger > 0.45)) return false;
    // what nobody could find comes out of the parents
    SB.Chem.apply(mum.chem, { fat: -0.25, hunger: 0.06 * need });
    SB.Chem.apply((mum === a ? b : a).chem, { hunger: 0.06 * need });
    return true;
  }
  C._payEgg = payEgg; // for tests

  // how fast love grows (chemistry.js multiplies its slow base rate by this): only in settled grown-ups, who are fed,
  // warm, calm, healthy and not grieving or out fighting; from the builder age on, best with a hut or house to nest
  // in; most of all in spring. A small band falls for each other faster (there's an island to fill)
  C.LOVE_SEASON = [1.5, 1.1, 0.85, 0.5];
  C.LOVE_BAND = 0.009 / 0.0022; // = the old rate
  C.loveK = function (c, game) {
    if (c.species !== "smol" || c.stage !== 3 || c.stranger) return 0;
    if (c._lkT != null && game.time - c._lkT < 2 && game.time >= c._lkT) return c._lk;
    c._lkT = game.time;
    var ch = c.chem, k = 0, top = game.stats.maxTier || 0;
    // smols who can't talk yet (blobs, critters, tool-users) fall in love as quickly as they always did: the band needs generations
    if ((c.tier || 0) < 3) return (c._lk = ch.hunger < 0.65 && ch.health > 0.5 && ch.sick < 0.35 ? C.LOVE_BAND : 0);
    var settled = ch.hunger < 0.5 && ch.cold < 0.35 && ch.fear < 0.35 && ch.sick < 0.3 && ch.pain < 0.4 && ch.health > 0.5 && !c.grief && !c.rally && !c.hideAt && c.captive == null && !c.tantrum;
    if (settled) {
      k = C.LOVE_SEASON[game.world.season || 0] || 1;
      var pop = game._smolN != null && game._smolNT === Math.floor(game.time) ? game._smolN : (game._smolNT = Math.floor(game.time), game._smolN = SB.Game.smols(game).length);
      k *= pop < 6 ? 3 : pop < 10 ? 2 : pop < 14 ? 1.4 : 1;
      if (top >= 4 && SB.Game.cultureKnows(game, "hut") && !game.world.structures.some(function (s) { return s.done && (s.kind === "hut" || s.kind === "house") && s.tribe === c.tribe; })) k *= 0.6;
    }
    return (c._lk = k);
  };

  // Habits -> echo: what a parent practised, mapped onto evolution genes (0..1 each)
  C.echo = function (c) {
    var h = c.habits || {}, e = {};
    function f(v, n) { return Math.min(1, (v || 0) / n); }
    e.limbs = f(h.walk, 150); e.senses = f(h.walk, 300);
    e.arms = f(h.hands, 6.3); e.dexterity = f(h.hands, 11);
    e.cortex = f(h.think, 6); e.recall = f(h.think, 10); e.head = f(h.think, 14);
    e.layers = f((h.think || 0) + (h.plan || 0) + (h.build || 0), 18);
    e.planning = f((h.plan || 0) + (h.build || 0), 5); e.social = f(h.social, 4);
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
          var src = Id.findSource(c, s.want, game, s.R); // as far as the plan looked (a builder hauls further than a crafter)
          if (!src) { p.fails++; return endPlan(c, game, false); }
          s.src = src.item ? { type: "item", id: src.item.id } : { type: "node", id: src.node.id };
          s.yieldKind = src.yield || null; s.yieldTime = src.time || null; s.fell = src.fell || null;
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
          if (s.fell && t.type === "node" && t.ref.state === "ok") { Id.fell(c, t.ref, game, s.fell === "axe" ? 2 : 1); if (!c.far) say(c, "timber!", game); } // the rest of the tree, for later
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
  // drop a plan without judging it (called away, a chat, a stranger leaving): let go of what it claimed and reserved,
  // or those things stay invisible to every other builder for good
  C.dropPlan = function (c, game) {
    var p = c.plan;
    c.plan = null;
    if (!p) return;
    if (SB.Ideas) SB.Ideas.inv(c, game).forEach(function (o) { if (o.reserved === c.id) o.reserved = null; });
    (p.steps || []).forEach(function (s) { if (s.src && s.src.type === "item") { var o = SB.Game.byId(game, s.src.id); if (o && o.claimed === c.id) o.claimed = null; } });
  };
  function endPlan(c, game, ok) {
    var p = c.plan;
    c.plan = null;
    if (ok && c.duty > 0.3) { SB.Chem.apply(c.chem, { bored: -0.1, lonely: -0.05 }); c.duty = Math.max(0, c.duty - 0.4); } // a job done: feeling useful
    if (M() && c.species === "smol") M().planEnded(c, game, p, ok);
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
    var a = c.action, t = null, tt = SB.Tricks && SB.Tricks.target ? SB.Tricks.target(c, game) : null;
    if (tt) t = tt;
    else if (c.plan && c.plan.x) t = { x: c.plan.x, a: c.plan.verb };
    else if (a && a.x && (a.phase === "do" || a.verb === V.approach)) t = { x: a.x, a: a.verb };
    else if (c.lastDone && game.time - c.lastDone.t < 2.5) t = c.lastDone;
    var b = c.brain, probe = t && t.x.length === b.nIn ? t : null;
    if (!probe) { var tr = b.traces[(b.traceHead + b.traces.length - 1) % b.traces.length]; if (tr && tr.e > 0.05 && tr.x.length === b.nIn) probe = { x: tr.x, a: tr.a }; }
    var before = probe ? SB.Brain.qOf(b, probe.x, probe.a) : 0, px = probe ? Float32Array.from(probe.x) : null;
    if (t && t.x.length === b.nIn) SB.Brain.teach(b, t.x, t.a, delta, 2);
    else SB.Brain.reinforce(b, SB.clamp(delta * 0.7, -1, 1));
    // what the lesson actually changed in the net, for the "🍎 eat apple ↑" chip
    if (probe) { var nn = -1; for (var i = 0; i < SB.N_NOUNS; i++) if (px[SB.IN.NOUN0 + i] > 0.5) { nn = i; break; } SB.bus.emit("learned", { c: c, verb: probe.a, noun: nn, delta: SB.Brain.qOf(b, px, probe.a) - before }); }
    c.lastReward = SB.clamp(delta, -1, 1);
    c.stats.lessons = (c.stats.lessons || 0) + 1;
    habit(c, "think", 0.35); // being taught grows the next generation's brains
  }
  C.lesson = lesson;

  C.tickle = function (c, game) {
    if (c.grief) { SB.Chem.apply(c.chem, { lonely: -0.2 }); c.grief.until -= 60; } // the sky's comfort shortens the grieving
    if (!c.alive) return;
    if (SB.Tricks && SB.Tricks.gate && !SB.Tricks.gate(c, game, 1)) { emote(c, "huh", 0.8); return; } // a trick session: wait for the moment
    c.chem.reward = Math.min(1, c.chem.reward + 0.5);
    SB.Chem.apply(c.chem, { lonely: -0.05, bored: -0.03 });
    lesson(c, game, 1);
    c.stats.tickles++; game.stats.tickles++;
    emote(c, c.species === "grump" ? "huh" : "happy", 1.4);
    c.anim.squash = 0.2; c.anim.flash = 0.6;
    if (c.asleep && game.rng.chance(0.3)) { c.asleep = false; c.inBed = false; c.action = null; }
    if (c.species === "smol") { SB.Game.unlock(game, "tickle"); C.prayerAnswered(c, game, "comfort"); }
    SB.bus.emit("tickle", { c: c });
  };

  C.tap = function (c, game) {
    if (c.tantrum) { c.tantrum = null; c.chem.anger *= 0.4; if (SB.Social) SB.Social.log(game, c, "👆", "the sky told me to calm down"); } // a firm tap ends a tantrum
    if (!c.alive) return;
    if (SB.Tricks && SB.Tricks.gate && !SB.Tricks.gate(c, game, -1)) return; // a trick session: wait for the moment
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
      if (c.carry != null && SB.Threats) SB.Threats.drop(game, c, null); // the sky flicks it: it lets go
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
    if (opts.call && knows(c, word) && !c.asleep && c.species === "smol") { c.called = { w: word, t: game.time, x: opts.x != null ? opts.x : c.x, z: opts.z != null ? opts.z : c.z }; c.thinkT = Math.min(c.thinkT || 0, 0.2 + game.rng() * 0.5); if (c.action && !c.plan && (c.action.verb === V.idle || c.action.verb === V.wander || c.action.phase === "go")) c.action = null; }
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
    if (SB.Funeral) SB.Funeral.add(game, c, cause); // the body stays until the tribe says goodbye
    SB.bus.emit("death", { c: c, cause: cause });
  }
  C.die = die;
  function causeOfDeath(ch) {
    if (ch.hunger > 0.9) return "starved";
    if (ch.sick > 0.4 || ch.toxin > 0.2) return "sick";
    if (ch.cold > 0.8) return "cold";
    return "hurt";
  }

  // the duty drive (builder age on): grown-ups want to be useful in the daytime. It rises while they idle, wander,
  // play or cuddle, and falls while they work (a plan, a job, using a tool, gathering); a finished job feels good
  // (endPlan). Kids keep their play and elders their stories. Not a brain drive, so old brains and saves are untouched
  var WORKY = {};
  function dutyTick(c, dt, game) {
    if (c.stage !== 3 || c.stranger || c.captive != null || (game.stats.maxTier || 0) < 4) { if (c.duty) c.duty = Math.max(0, c.duty - dt * 0.01); return; }
    if (!WORKY.ok) { WORKY.ok = 1; [V.build, V.make, V.use, V.pickup, V.give, V.teach].forEach(function (v) { WORKY[v] = 1; }); }
    var d = c.duty || 0;
    var study = c.tier >= 5 && c.action && (c.action.noun === "totem" || c.action.noun === "wonder"); // a thinker at a story pole or a wonder is working too
    if (c.plan || c.nursing || study || (c.action && WORKY[c.action.verb]) || (c.job && c.action && c.action.called)) d -= dt * 0.02;
    else if (!c.asleep && !game.world.night) d += dt * (c.tier >= 5 ? 0.002 : 0.004); // (thinkers mull things over: half as restless)
    c.duty = d < 0 ? 0 : d > 1 ? 1 : d;
  }
  C.dutyTick = dutyTick;

  /* ---------------- main tick ---------------- */

  C.tick = function (c, dt, game) {
    if (c.dying) { c.fade += dt / 2.5; if (c.fade >= 1) c.gone = true; return; }
    var w = game.world, ch = c.chem, an = c.anim;
    c.px = c.x; c.pz = c.z; c.py = c.y;
    c.age += dt;
    c.moving = false;
    var st = stageFor(c.age, c);
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
    if (c.shelterT > 0) c.shelterT -= dt;
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
      else if (temp < 0.45 && SB.Ideas && (SB.Ideas.toolKind(c, game) === "cloak" || SB.Ideas.heldKind(c, game) === "cloak")) temp = temp + (0.5 - temp) * 0.6; // a fur cloak
      if (temp < 0.3) habit(c, "cold", dt);
      // the dark is scary away from fire and home (tribe smols most of all: they know what's out there)
      if (w.night && c.tier >= 1 && !c.asleep && !SB.World.nearestFire(w, c.x, c.z, 6) && !SB.World.shelterAt(w, c.x, c.z)) ch.fear = Math.min(1, ch.fear + dt * 0.0035 * (1 - gene(c.genome, "bravery", 0.5)));
      if (c.tier >= 5) { var cry = SB.World.nearestNode(w, c.x, c.z, 4, function (n) { return n.kind === "crystals"; }); if (cry) habit(c, "glow", dt * 0.2); }
    }
    SB.Chem.tick(ch, dt, {
      temp: temp, dark: w.night, asleep: c.asleep, inBed: c.inBed,
      moving: !!(c.action && c.action.phase === "go") || !!c.plan || (c.action && (c.action.verb === V.wander || c.action.verb === V.flee || c.action.verb === V.play)) || !!c._povMove,
      nearFriends: friends, stage: c.stage, species: c.species, loveK: c.species === "smol" ? C.loveK(c, game) : null
    }, c.genome);
    if (c.species === "smol") dutyTick(c, dt, game);
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
      if (ch.love > 0.8 && c.stage === 3 && !an.emote && Math.random() < dt * 0.15) { var pt = SB.Social && SB.Social.partnerOf(game, c); if (!SB.Social || (pt && SB.dist(pt.x, pt.z, c.x, c.z) < 6)) emote(c, "love", 1.5); } // mooning over a partner nearby, not at nobody
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
    if (c.species === "smol" && c.tier >= 3) faceStep(c, dt);

    if (c.heldBy === "hand") {
      c.asleep = false; c.inBed = false; c.action = null; c.onGround = false; c.vx = c.vy = c.vz = 0;
      if (c.plan) endPlan(c, game, false);
      an.walk += dt * 10;
      positionHeld(c, game);
      return;
    }

    // carried off by a grump (threats.js): dangling from its arms, kicking
    if (c.carriedBy != null) {
      var cb = SB.Game.byId(game, c.carriedBy);
      if (cb && cb.alive && !cb.gone) {
        c.asleep = false; c.inBed = false; c.action = null; c.onGround = false; c.vx = c.vy = c.vz = 0;
        c.x = cb.x; c.z = cb.z; c.y = cb.y + 0.75; an.walk += dt * 14;
        if (!c.speech && Math.random() < dt * 0.4) say(c, c.stage <= 1 ? "waaah!" : "help!!", game);
        SB.Chem.apply(ch, { fear: dt * 0.3 });
        return;
      }
    }

    // airborne (thrown, knocked)
    var gy = SB.World.groundY(w, c.x, c.z), hover = c.tier >= 6 && c.species === "smol" ? HOVER : 0;
    if (!c.onGround || c.y > gy + hover + 0.02) {
      c.vy -= GRAV * dt;
      var nx = c.x + c.vx * dt, nz = c.z + c.vz * dt;
      if (SB.World.inBounds(w, nx, nz)) { c.x = nx; c.z = nz; }
      c.y += c.vy * dt;
      gy = SB.World.groundY(w, c.x, c.z);
      if (c.y <= gy + hover) {
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

    // a scout grump (possess.js: the first minute in a blob) chases the smol you're in, day or night. it stings,
    // but it never takes the last quarter of a heart bar, and it gives up when possess.js says so
    if (c.species === "grump" && c.scout && !c.scout.done) {
      var sc = c.scout, prey = SB.Game.byId(game, sc.who);
      sc.t += dt; sc.hitT = Math.max(0, (sc.hitT || 0) - dt);
      if (!prey || !prey.alive) sc.done = true;
      else {
        c.asleep = false; c.action = null; c.goingHome = false;
        walkToward(c, prey.x, prey.z, dt, speedOf(prey, null) * 1.35, game, 0.9);
        if (SB.dist(c.x, c.z, prey.x, prey.z) < 1.2 && !sc.hitT) {
          sc.hitT = 1.6; sc.hits = (sc.hits || 0) + 1;
          prey.chem.health = Math.max(0.25, prey.chem.health - 0.1);
          SB.Chem.apply(prey.chem, { fear: 0.3, pain: 0.2 });
          emote(c, "angry", 1);
          SB.bus.emit("scoutHit", { c: prey, g: c });
        }
        positionHeld(c, game); finishTick(c, game, gy);
        return;
      }
    }
    if (c.species === "grump" && c.scout && c.scout.done) { c.scout = null; c.goingHome = true; }
    // grumps go home at dawn (or when shooed, or when they see fire)
    if (c.species === "grump") {
      var fire = SB.World.nearestFire(w, c.x, c.z, 4.5);
      if (fire && c.raider && SB.Threats && SB.Threats.gear(game).torches) fire = null; // raiders with torches of their own aren't scared of your fire
      var spear = false;
      SB.World.creaturesNear(w, game, c.x, c.z, 2.5, function (o) { if (o.species === "smol" && o.tool != null) { var t = SB.Game.byId(game, o.tool); if (t && (t.kind === "spear" || t.kind === "torch")) spear = true; } });
      if (fire || spear) { SB.Chem.apply(ch, { fear: dt * 0.8 }); if (ch.fear > 0.7 && !c.goingHome) { c.goingHome = true; say(c, "hot! nope!", game); game.stats.scaredOff = (game.stats.scaredOff || 0) + 1; } }
      if ((!w.night && !c.raider) || c.goingHome) {
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
        if (M() && c.species === "smol") M().sleep(c, game, dt); // dreams: the day's experiences replayed
        positionHeld(c, game); finishTick(c, game, gy);
        return;
      }
    }

    // interrupts (not for a possessed smol: the player decides)
    if (c.species === "smol" && !c._pov) {
      if (c.plan && (ch.fear > 0.65 || ch.hunger > 0.78 || ch.pain > 0.6 || (ch.sleepy > 0.9 && c.stage < 3))) endPlan(c, game, false);
      if (c.action && c.action.verb !== V.flee && ch.fear > 0.6 && c.action.phase === "go") c.thinkT = 0;
      if (ch.hunger > 0.45 && !c.plan && c.action && (c.action.verb === V.idle || c.action.verb === V.wander || c.action.verb === V.talk || c.action.verb === V.approach) && (c.foodT = (c.foodT || 0) - dt) <= 0) {
        c.foodT = 0.5;
        var snack = SB.World.nearestItem(w, c.x, c.z, ch.hunger > 0.7 ? 4 : 1.5, function (o) { return o.noun === "food" && o.heldBy !== "hand" && o.kind !== "nut"; });
        if (snack && c.action.noun !== "food") { c.action = null; c.thinkT = 0; }
      }
    }

    if (c.convo && SB.Social) SB.Social.convoTick(game, c, dt);
    if (c._pov && SB.Possess) SB.Possess.drive(c, dt, game); // possessed: the player moves it and picks its actions, the brain only watches
    if (c.plan) runPlan(c, dt, game);
    else {
      if (!c.action && !c._pov) { c.thinkT -= dt * (c.far ? 0.5 : 1); if (c.thinkT <= 0) think(c, game); }
      if (c.action) act(c, dt, game);
    }

    if (c.species === "grump" && c.holding != null && (!c.action || c.action.verb !== V.eat) && game.rng.chance(dt * 0.3)) c.goingHome = true;

    c.chatT -= dt;
    if (c.chatT <= 0) {
      c.chatT = 6 + game.rng() * 10;
      if (c.species === "smol" && !c.speech && !c._pov) maybeChat(c, game, c.action ? c.action.verb : V.idle, c.attn ? c.attn.noun : null);
    }
    finishTick(c, game, gy);
    c.iqT -= dt;
    if (c.iqT <= 0) { c.iq = C.iq(c, true); c.iqT = c.species === "smol" && !c.far ? 10 : 30; }
  };

  var HOVER = 0.25;
  function finishTick(c, game, gy) {
    var w = game.world;
    c.x = SB.clamp(c.x, 3, w.T.N - 3); c.z = SB.clamp(c.z, 3, w.T.N - 3);
    var g = SB.World.groundY(w, c.x, c.z);
    if (c.onGround) c.y = g;
    if (c.tier >= 6 && c.species === "smol") c.y = g + HOVER; // ascended smols float a little
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
    var shared = c.species === "smol" && SB.Game.current && SB.Game.current.culture ? (SB.Game.current.culture.shared || 0) * 1.5 : 0; // a tribe that shares words thinks better together
    return Math.round(25 + 60 * t.good + 15 * t.bad + 1.5 * words + exp * 0.5 + taught + ideas * 5 + c.tier * 10 + size + shared);
  };

  /* ---------------- explain (for the UI) ---------------- */

  // what a smol is up to, in plain words: "hungry · eating the berry bush"
  var DOING = ["resting", "walking over to %", "eating %", "playing with %", "picking a fight with %", "picking up %", "putting things down", "going to sleep", "running from %", "chatting with %", "cuddling %", "wandering about", "using %", "making something", "building", "teaching %", "giving % something", "praying to the sky"];
  function thingName(c, game) {
    var t = c.action && c.action.target ? resolve(game, c.action.target) : null;
    if (!t) return c.action && c.action.noun ? (SB.NOUN_WORDS[N[c.action.noun]] || c.action.noun) : "something";
    if (t.type === "creature") return t.ref.species === "smol" ? t.ref.name : "a grump";
    if (t.type === "hand") return "the sky hand";
    if (t.type === "water") return "the water";
    var def = t.type === "node" ? NK[t.kind] : t.type === "struct" ? SK[t.kind] : K[t.kind];
    return def ? "the " + def.label : "something";
  }
  C.thought = function (c, game, raw) {
    var t0 = thought0(c, game);
    if (raw || !M() || c.species !== "smol" || !c.alive || c.asleep || c.plan || c.convo) return t0;
    var as = M().aside(c, game);
    return as ? t0 + " (" + as + ")" : t0;
  };
  function thought0(c, game) {
    if (!c.alive) return "…";
    if (c.heldBy === "hand") return "wheee! (being carried)";
    if (c.asleep) { var dr = c.mind && c.mind.dream; return dr && game.time - dr.t < 60 ? "zzz · dreaming: " + dr.w : "zzz (sleeping" + (c.inBed ? " under a roof" : "") + ")"; }
    var top = SB.Chem.top(c.chem);
    var feel = top.v > 0.35 ? SB.DRIVE_WORDS[top.i] : "happy";
    if (c.tantrum) return "furious · throwing a tantrum!";
    if (c.convo) { var o = c.convo.a === c ? c.convo.b : c.convo.a; return feel + " · talking with " + o.name + " about " + c.convo.topic; }
    if (c.stranger) return "hopeful · waiting to be let in";
    if (c.plan) {
      var d = SB.Ideas.BY_ID[c.plan.idea], st = c.plan.steps[c.plan.i];
      var what = d ? d.name : "something";
      var step = !st ? "" : st.do === "fetch" ? ", fetching " + (K[st.want] ? K[st.want].label : st.want === "food" ? "food" : st.want) : st.do === "station" ? ", heading to the " + st.at : st.do === "deliver" ? ", bringing materials" : st.do === "work" ? ", hard at work" : "";
      return feel + " · " + (c.plan.kind === "build" ? "building: " : "making: ") + what + step;
    }
    if (c.grief && (!c.action || c.action.verb === V.idle || c.action.verb === V.wander)) return "sad · missing " + c.grief.name;
    if (!c.action) return feel + " · thinking…";
    var phrase = DOING[c.action.verb] || SB.VERB_WORDS[c.action.verb];
    if (c.action.verb === V.wander && c.action.called) phrase = "coming when called";
    if (c.action.verb === V.hit && c.action.target && c.action.target.type === "creature") { var tg = SB.Game.byId(game, c.action.target.id); if (tg && tg.species === "smol" && SB.Social && !SB.Social.rival(game, c, tg)) phrase = "shoving %"; }
    return feel + " · " + phrase.replace("%", thingName(c, game));
  };
})();
