/* smol brains — creature.js
   A creature's life loop: senses → attention → decision (its neural net) → walking and doing →
   drive changes → reward → learning. Plus language (hearing, learning and saying words),
   the hand (tickle / tap), imitation, breeding, illness, ageing and death.
   Smols and grumps share this code; grumps just have different genes and go home at dawn. */
(function () {
  "use strict";
  var SB = window.SB;
  var C = (SB.Creature = {});
  var V = SB.V, N = SB.N, D = SB.D;
  var NV = SB.N_VERBS;

  var GRAVITY = 1100;
  var BODY_R = 22;
  var VIEW_R = 340;
  var HEAR_T = 5; // seconds a heard word stays "in mind"

  var TARGET_VERBS = SB.VERB_NEEDS_TARGET;
  var CARRYABLE_NOUNS = { food: 1, mushroom: 1, toy: 1, ball: 1, music: 1, medicine: 1, egg: 1, bug: 1 };
  var CUDDLY_NOUNS = { smol: 1, hand: 1, toy: 1, egg: 1 };
  var DO_DUR = [0, 0.5, 1.6, 2.2, 0.8, 0.6, 0.3, 0, 2.5, 1.8, 2.2, 0];

  var BABBLE = ["ba", "goo", "bababa", "mmm", "da?", "eep", "boo", "ga ga", "mama?", "pff", "wa"];
  var GRUMP_LINES = ["grr", "mine!", "hehehe", "smol snack", "bonk", "nyeh", "grumble", "gimme"];

  /* ---------------- create / revive ---------------- */

  C.radius = function (c) {
    var st = SB.STAGES[c.stage] || SB.STAGES[3];
    return BODY_R * st.scale * ((c.look && c.look.size) || 1) * (c.species === "grump" ? 1.05 : 1);
  };

  function stageFor(age) {
    var s = 0;
    for (var i = 0; i < SB.STAGES.length; i++) if (age >= SB.STAGES[i].from) s = i;
    return s;
  }

  function freshAnim() {
    return { walk: 0, blink: 0, blinkT: 1 + Math.random() * 3, squash: 0, emote: null, emoteT: 0, bob: 0, lookX: 0, mouth: "smile" };
  }

  C.create = function (game, o) {
    var genome = o.genome;
    var age = o.age || 0;
    var x = SB.clamp(o.x == null ? SB.HOME_X : o.x, 30, SB.WORLD_W - 30);
    var c = {
      id: SB.Game.newId(game),
      species: o.species || "smol",
      name: o.name || "smol",
      gen: o.gen || 1,
      parents: (o.parents || []).slice(),
      born: game.time - age,
      age: age,
      stage: stageFor(age),
      alive: true, dying: false, gone: false, fade: 0,
      genome: genome,
      look: SB.Genome.look(genome),
      brain: o.brain || SB.Brain.create(genome, game.rng),
      chem: SB.Chem.create(genome),
      x: x, y: SB.World.groundY(game.world, x), vx: 0, vy: 0, facing: Math.random() < 0.5 ? -1 : 1, onGround: true,
      heldBy: null, holding: null,
      attn: null, action: null, asleep: false, inBed: false,
      speech: null, vocab: o.vocab ? Object.assign({}, o.vocab) : {},
      heard: { verb: -1, noun: -1, name: false, t: -99, nounId: null },
      anim: freshAnim(),
      lastReward: 0, iq: 0, iqT: 0,
      visited: {},
      stats: { eaten: 0, words: 0, tickles: 0, taps: 0, kids: 0, obeyed: 0, hits: 0 },
      wasSick: false, eggCooldown: 0, thinkT: 0.5, chatT: 3 + Math.random() * 5, tapCount: 0, tapT: 0,
      lifespan: SB.BASE_LIFESPAN * (0.8 + 0.4 * gene(genome, "lifespan", 0.5))
    };
    if (c.species === "grump") { c.chem.hunger = 0.5; c.chem.anger = 0.3; }
    if (c.stage === 0) c.chem.hunger = 0.45;
    c.iq = C.iq(c, true);
    return c;
  };

  C.revive = function (p, game) {
    var c = Object.assign({}, p);
    c.brain = SB.Brain.deserialize(p.brain, p.genome);
    c.look = SB.Genome.look(p.genome);
    c.anim = freshAnim();
    c.action = null; c.attn = null; c.speech = null;
    c.heard = { verb: -1, noun: -1, name: false, t: -99, nounId: null };
    c.heldBy = null; c.holding = null;
    c.stats = Object.assign({ eaten: 0, words: 0, tickles: 0, taps: 0, kids: 0, obeyed: 0, hits: 0 }, p.stats || {});
    c.visited = p.visited || {};
    c.vocab = p.vocab || {};
    c.chem = Object.assign(SB.Chem.create(p.genome), p.chem || {});
    if (!c.lifespan) c.lifespan = SB.BASE_LIFESPAN;
    c.thinkT = 0.5; c.chatT = 4; c.tapCount = 0; c.tapT = 0; c.eggCooldown = c.eggCooldown || 0;
    c.iq = C.iq(c, true);
    return c;
  };

  // Plain data for save.js (brain serialized).
  C.serialize = function (c) {
    var o = {};
    for (var k in c) {
      if (k === "brain" || k === "look" || k === "anim" || k === "action" || k === "attn" || k === "speech") continue;
      o[k] = c[k];
    }
    o.brain = SB.Brain.serialize(c.brain);
    return o;
  };

  function gene(g, k, d) { return g && g.genes && g.genes[k] != null ? g.genes[k] : d; }

  /* ---------------- helpers ---------------- */

  function isNight(game) { return !!game.world.night; }

  function resolve(game, t) {
    if (!t) return null;
    if (t.type === "hand") {
      var h = game.hand;
      if (!h.visible) return null;
      return { x: h.x, y: h.y, r: 14, ref: h, noun: "hand", type: "hand" };
    }
    var ref = SB.Game.byId(game, t.id);
    if (!ref) return null;
    if (t.type === "creature") {
      if (!ref.alive) return null;
      return { x: ref.x, y: ref.y - C.radius(ref), r: C.radius(ref), ref: ref, noun: ref.species, type: "creature" };
    }
    if (ref.heldBy && ref.heldBy !== "hand" && typeof ref.heldBy === "number" && t.mine !== true) {
      // someone else is carrying it; you can still go for it
    }
    return { x: ref.x, y: ref.y, r: ref.r || 12, ref: ref, noun: ref.noun, type: "object" };
  }

  function say(c, text, game, kind) {
    c.speech = { text: text, t: 2.2 + Math.min(3, text.length * 0.06), kind: kind || "say" };
    SB.bus.emit("say", { c: c, text: text, kind: kind || "say" });
  }
  C.say = function (c, text, game) { say(c, text, game, "say"); };

  function emote(c, e, t) { c.anim.emote = e; c.anim.emoteT = t || 1.6; }

  // Half-learned words come out garbled.
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

  function learnWord(c, word, amt, game) {
    if (!SB.LEXICON[word]) return false;
    var before = c.vocab[word] || 0;
    var rate = amt * (0.6 + gene(c.genome, "attnLearn", 0.5) * 0.8) * (c.stage === 0 ? 1.1 : 1);
    var after = Math.min(1.5, before + rate);
    c.vocab[word] = after;
    if (before < 1 && after >= 1) {
      c.stats.words++;
      game.stats.wordsTaught++;
      say(c, word + "!", game);
      emote(c, "idea", 2);
      SB.bus.emit("learnWord", { c: c, word: word });
      var n = C.knownCount(c);
      if (n >= 1) SB.Game.unlock(game, "word1");
      if (n >= 5) SB.Game.unlock(game, "word5");
      if (n >= 15) SB.Game.unlock(game, "word15");
      if (n >= 30) SB.Game.unlock(game, "word30");
      if (window.cc && cc.event && n === 1) try { cc.event("first_word", { word: word }); } catch (e) {}
      return true;
    }
    return false;
  }
  C.learnWord = learnWord;

  /* ---------------- perception & decision ---------------- */

  var cands = [];   // reused
  var nearestOf = new Array(SB.N_NOUNS);
  var nearestD = new Float32Array(SB.N_NOUNS);
  var drv = new Float32Array(SB.N_DRIVES);
  var mask = new Array(NV);
  var bias = new Float32Array(NV);

  function perceive(c, game) {
    var R = VIEW_R + gene(c.genome, "curiosity", 0.5) * 80;
    var i;
    for (i = 0; i < SB.N_NOUNS; i++) { nearestOf[i] = null; nearestD[i] = 1e9; }
    var objs = game.world.objects;
    for (i = 0; i < objs.length; i++) {
      var o = objs[i];
      if (o.heldBy === c.id) { consider(N[o.noun], { type: "object", id: o.id }, 1); continue; }
      var d = Math.abs(o.x - c.x);
      if (d > R) continue;
      d += Math.abs(o.y - c.y) * 0.3;
      if (o.heldBy === "hand") d *= 0.4; // things in the hand are eye-catching
      consider(N[o.noun], { type: "object", id: o.id }, d);
    }
    var cs = game.creatures;
    for (i = 0; i < cs.length; i++) {
      var o2 = cs[i];
      if (o2 === c || !o2.alive) continue;
      var d2 = Math.abs(o2.x - c.x);
      if (d2 > R) continue;
      consider(N[o2.species], { type: "creature", id: o2.id }, d2);
    }
    var h = game.hand;
    if (h.visible && Math.abs(h.x - c.x) < R && h.y > c.y - 380) consider(N.hand, { type: "hand", id: null }, Math.abs(h.x - c.x) * 0.8);

    function consider(n, t, d) { if (n == null) return; if (d < nearestD[n]) { nearestD[n] = d; nearestOf[n] = t; } }

    cands.length = 0;
    var recent = game.time - c.heard.t < HEAR_T;
    for (i = 0; i < SB.N_NOUNS; i++) {
      if (!nearestOf[i]) continue;
      var sal = 0.35 * (1 - Math.min(1, nearestD[i] / R));
      if (recent && c.heard.noun === i) sal += 1.4;
      if (i === N.hand && recent && c.heard.name) sal += 1.2;
      if (i === N.bug) sal += 0.1;
      if (i === N.grump) sal += 0.25 * (1 - gene(c.genome, "bravery", 0.5));
      if (c.attn && c.attn.noun === SB.NOUNS[i]) sal += 0.08; // a little focus
      cands.push({ noun: i, sal: sal, t: nearestOf[i], d: nearestD[i] });
    }
    return cands;
  }

  function think(c, game) {
    var ch = c.chem, rng = game.rng;
    perceive(c, game);
    SB.Chem.drives(ch, drv);
    var pick = -1;
    if (cands.length) pick = SB.Brain.attend(c.brain, drv, cands, rng);
    var cand = pick >= 0 ? cands[pick] : null;
    var tgt = cand ? cand.t : null;
    var target = tgt ? resolve(game, tgt) : null;
    if (!target) { cand = null; tgt = null; }
    c.attn = cand ? { type: tgt.type, id: tgt.id, noun: SB.NOUNS[cand.noun] } : null;

    var recent = game.time - c.heard.t < HEAR_T;
    var reach = C.radius(c) + (target ? target.r : 0) + 14;
    var near = !!target && Math.abs(target.x - c.x) < reach + 10;
    SB.Brain.input(c.brain, {
      drives: drv,
      noun: cand ? cand.noun : -1,
      heardVerb: recent ? c.heard.verb : -1,
      heardName: recent && c.heard.name,
      near: near,
      holding: c.holding != null,
      dark: isNight(game)
    });

    // what's physically possible
    var noun = cand ? SB.NOUNS[cand.noun] : null;
    var obj = target && target.type === "object" ? target.ref : null;
    for (var v = 0; v < NV; v++) mask[v] = true;
    for (v = 0; v < NV; v++) if (TARGET_VERBS[v] && !target) mask[v] = false;
    mask[V.drop] = c.holding != null;
    if (target) {
      if (!(noun in CARRYABLE_NOUNS) || (obj && obj.fixed) || (obj && obj.heldBy === "hand") || c.holding != null) mask[V.pickup] = false;
      if (!(noun in CUDDLY_NOUNS)) mask[V.cuddle] = false;
      if (target.type === "hand") mask[V.pickup] = false;
    }
    mask[V.sleep] = ch.sleepy > 0.2 || ch.tired > 0.35;
    if (c.species === "grump") { mask[V.cuddle] = false; mask[V.sleep] = false; }
    if (c.stage === 0) mask[V.hit] = mask[V.hit] && rng.chance(0.3); // babies rarely hit

    // a genetic nudge to go along with a spoken command (the net learns the rest from tickles)
    var heardV = recent ? c.heard.verb : -1;
    var useBias = false;
    for (v = 0; v < NV; v++) bias[v] = 0;
    if (heardV >= 0 && mask[heardV]) { bias[heardV] = gene(c.genome, "obedience", 0.5) * 0.18 + (c.heard.name ? 0.05 : 0); useBias = true; }

    var any = false;
    for (v = 0; v < NV; v++) if (mask[v]) { any = true; break; }
    var verb = any ? SB.Brain.decide(c.brain, rng, mask, useBias ? bias : null) : V.idle;

    startAction(c, game, verb, tgt, target, noun);

    if (heardV >= 0 && verb === heardV) {
      c.stats.obeyed++;
      if (c.species === "smol") {
        SB.Game.unlock(game, "obey");
        SB.bus.emit("obey", { c: c, verb: verb });
        if (knows(c, SB.VERB_WORDS[verb])) say(c, "ok " + SB.VERB_WORDS[verb], game);
        else emote(c, "idea", 1);
      }
      c.heard.verb = -1; // command consumed
    }
    maybeChat(c, game, verb, noun);
  }

  function startAction(c, game, verb, tgt, target, noun) {
    var rng = game.rng;
    var a = { verb: verb, target: tgt, noun: noun, t: 0, phase: "go", doT: 0, dur: 0, start: SB.Chem.drives(c.chem, new Float32Array(SB.N_DRIVES)), tx: c.x };
    switch (verb) {
      case V.idle: a.phase = "do"; a.dur = rng.range(1.2, 2.6); break;
      case V.wander: {
        a.phase = "do"; a.dur = rng.range(3, 6);
        var dir = rng.chance(0.5) ? -1 : 1;
        // curious smols head for rooms they haven't seen
        if (c.species === "smol" && rng.chance(gene(c.genome, "curiosity", 0.5))) {
          var room = SB.World.roomAt(game.world, c.x);
          for (var k = 1; k < SB.ROOMS.length; k++) {
            if (room + k < SB.ROOMS.length && !c.visited[SB.ROOMS[room + k].id]) { dir = 1; break; }
            if (room - k >= 0 && !c.visited[SB.ROOMS[room - k].id]) { dir = -1; break; }
          }
        }
        a.tx = SB.clamp(c.x + dir * rng.range(150, 420), 40, SB.WORLD_W - 40);
        break;
      }
      case V.sleep:
        // walk to a bed if one is close, otherwise flop down here
        a.phase = "do"; a.dur = 999;
        var beds = SB.World.near(game.world, c.x, c.y, 260, function (o) { return o.kind === "bed"; });
        if (beds.length) { a.phase = "go"; a.target = { type: "object", id: beds[0].id }; a.bedSeek = true; }
        break;
      case V.drop: a.phase = "do"; a.dur = DO_DUR[verb]; break;
      case V.talk: a.phase = target ? "go" : "do"; a.dur = DO_DUR[verb]; break;
      case V.flee: a.phase = "do"; a.dur = rng.range(1.8, 3); break;
      default: a.dur = DO_DUR[verb] || 1.2;
    }
    if (verb === V.approach) a.dur = 0.4;
    c.action = a;
  }

  function maybeChat(c, game, verb, noun) {
    if (c.speech && c.speech.t > 0.5) return;
    var rng = game.rng;
    if (c.species === "grump") { if (rng.chance(0.25)) say(c, rng.pick(GRUMP_LINES), game, "say"); return; }
    var chat = 0.12 + gene(c.genome, "chattiness", 0.5) * 0.3;
    if (!rng.chance(chat)) return;
    if (c.stage === 0 && C.knownCount(c) === 0) { say(c, rng.pick(BABBLE), game, "babble"); return; }
    var top = SB.Chem.top(c.chem);
    var parts = [];
    var dw = SB.DRIVE_WORDS[top.i];
    if (top.v > 0.5) {
      var ds = c.vocab[dw] || 0;
      if (ds >= 0.4) parts.push(c.stage >= 1 && rng.chance(0.5) ? "me" : c.name.toLowerCase(), garble(dw, ds));
    }
    if (noun) {
      var nw = SB.NOUN_WORDS[N[noun]], vw = SB.VERB_WORDS[verb];
      var ns = c.vocab[nw] || 0, vs = c.vocab[vw] || 0;
      if (vs >= 0.5 && ns >= 0.5 && verb !== V.idle && verb !== V.wander) parts.push(garble(vw, vs), garble(nw, ns));
      else if (ns >= 0.4 && top.v > 0.5) parts.push("want", garble(nw, ns));
      else if (ns >= 0.4 && rng.chance(0.4)) parts.push(garble(nw, ns));
    }
    if (!parts.length) {
      if (c.stage === 0 && rng.chance(0.6)) say(c, rng.pick(BABBLE), game, "babble");
      return;
    }
    var text = parts.join(" ");
    say(c, text, game, "say");
    // a full sentence: a known feeling word plus a known noun
    var full = 0;
    for (var i = 0; i < parts.length; i++) if (SB.LEXICON[parts[i]] && knows(c, parts[i])) full++;
    if (full >= 2) SB.Game.unlock(game, "sentence");
  }

  /* ---------------- acting ---------------- */

  function speedOf(c, a) {
    var base = [26, 40, 52, 60, 58][c.stage] || 55;
    if (c.species === "grump") base = 62;
    if (a && a.verb === V.flee) base *= 1.9;
    if (c.chem.tired > 0.8) base *= 0.6;
    if (c.chem.fear > 0.6) base *= 1.25;
    return base;
  }

  function walkToward(c, tx, dt, sp) {
    var dx = tx - c.x;
    if (Math.abs(dx) < 2) return true;
    c.facing = dx > 0 ? 1 : -1;
    var step = Math.min(Math.abs(dx), sp * dt);
    c.x += c.facing * step;
    c.anim.walk += step * 0.12;
    c.moving = true;
    return Math.abs(tx - c.x) < 2;
  }

  function act(c, dt, game) {
    var a = c.action;
    a.t += dt;
    var tgt = a.target ? resolve(game, a.target) : null;
    if (a.target && !tgt && a.verb !== V.sleep) { finish(c, game, false); return; }

    if (a.phase === "go") {
      if (!tgt) { a.phase = "do"; return; }
      var reach = C.radius(c) + tgt.r + 8;
      var side = c.x < tgt.x ? -1 : 1;
      var goalX = tgt.x + side * (reach - 6);
      if (a.bedSeek) goalX = tgt.x;
      walkToward(c, goalX, dt, speedOf(c, a));
      c.anim.lookX = SB.clamp((tgt.x - c.x) / 80, -1, 1);
      if (Math.abs(tgt.x - c.x) <= reach || (a.bedSeek && Math.abs(tgt.x - c.x) < 10)) {
        a.phase = "do"; a.doT = 0;
        c.facing = tgt.x >= c.x ? 1 : -1;
        beginDo(c, game, a, tgt);
      } else if (a.t > 9) finish(c, game, false); // gave up
      return;
    }

    // phase "do"
    a.doT += dt;
    switch (a.verb) {
      case V.wander: walkToward(c, a.tx, dt, speedOf(c, a) * 0.8); break;
      case V.flee:
        if (tgt) { c.facing = tgt.x > c.x ? -1 : 1; }
        c.x = SB.clamp(c.x + c.facing * speedOf(c, a) * dt, 30, SB.WORLD_W - 30);
        c.anim.walk += speedOf(c, a) * dt * 0.12; c.moving = true;
        break;
      case V.sleep:
        if (!c.asleep) { c.asleep = true; c.inBed = !!(tgt && tgt.ref && tgt.ref.kind === "bed"); emote(c, "zzz", 2); }
        break;
      case V.play:
        c.anim.squash = Math.abs(Math.sin(a.doT * 9)) * 0.25;
        break;
      case V.eat: c.anim.mouth = "chew"; break;
      case V.cuddle: if (Math.random() < dt * 2) SB.Render && SB.Render.fx && SB.Render.fx("hearts", c.x, c.y - C.radius(c) * 2, { n: 1 }); break;
      case V.hit: c.anim.squash = a.doT < 0.3 ? -0.2 : 0; break;
    }
    if (tgt && a.verb !== V.flee) c.anim.lookX = SB.clamp((tgt.x - c.x) / 80, -1, 1);
    if (a.verb !== V.sleep && a.doT >= a.dur) complete(c, game, a, tgt);
  }

  function beginDo(c, game, a, tgt) {
    if (a.verb === V.talk && tgt) {
      var listener = tgt.type === "creature" ? tgt.ref : null;
      talkTo(c, listener, game);
    }
    if (a.verb === V.hit) c.anim.squash = -0.25;
  }

  // Smols share words when they talk: cultural transmission.
  function talkTo(c, listener, game) {
    var rng = game.rng;
    var known = [];
    for (var w in c.vocab) if (c.vocab[w] >= 1) known.push(w);
    if (c.species === "grump") { say(c, rng.pick(GRUMP_LINES), game); return; }
    if (!known.length) { say(c, rng.pick(BABBLE), game, "babble"); return; }
    var word = rng.pick(known);
    say(c, word, game);
    if (listener && listener.species === "smol" && listener.alive && !listener.asleep) learnWord(listener, word, 0.12, game);
  }

  function complete(c, game, a, tgt) {
    var verbName = SB.VERBS[a.verb];
    var noun = tgt ? tgt.noun : null;
    var ch = c.chem;
    var futile = false;
    var deltas = noun && TARGET_VERBS[a.verb] ? (SB.STIM[noun] || {})[verbName] : SB.SELF_STIM[verbName];
    if (a.verb === V.talk && noun) deltas = (SB.STIM[noun] || {}).talk || SB.SELF_STIM.talk;
    if (deltas) SB.Chem.apply(ch, deltas);
    else futile = true;

    var obj = tgt && tgt.type === "object" ? tgt.ref : null;
    var other = tgt && tgt.type === "creature" ? tgt.ref : null;

    if (obj && a.verb !== V.approach && a.verb !== V.flee) {
      var res = SB.World.use(game.world, game, obj, verbName, c) || {};
      if (res.deltas) { SB.Chem.apply(ch, res.deltas); futile = false; }
      if (res.chem) SB.Chem.apply(ch, res.chem);
      if (res.consumed) {
        if (a.verb === V.eat) {
          c.stats.eaten++; emote(c, "yum", 1.4); c.anim.mouth = "chew";
          SB.bus.emit("eat", { c: c, obj: obj });
          if (c.species === "smol") SB.Game.unlock(game, "feed");
        }
        if (c.holding === obj.id) c.holding = null;
        if (game.hand.heldId === obj.id) game.hand.heldId = null;
        if (game.world.objects.indexOf(obj) >= 0) SB.World.remove(game.world, obj);
      }
      if (res.teach) { learnWord(c, res.teach, 0.55, game); if (!knows(c, res.teach)) say(c, garble(res.teach, c.vocab[res.teach] || 0), game); }
      if (res.teleport != null) { c.x = res.teleport; c.y = SB.World.groundY(game.world, c.x); }
      if (res.jump) { c.vy = -520; c.onGround = false; }
      if (a.verb === V.pickup && !res.consumed && !obj.fixed && !obj.heldBy) { c.holding = obj.id; obj.heldBy = c.id; }
    }
    if (a.verb === V.drop) dropHeld(c, game, 60);

    if (other) creatureEffects(c, other, a.verb, game);
    if (tgt && tgt.type === "hand") handEffects(c, a.verb, game);

    // reward = how much the drives went down, weighted by genes
    var r = 0, dw = c.genome.driveW || [];
    for (var i = 0; i < SB.N_DRIVES; i++) r += (a.start[i] - ch[SB.DRIVES[i]]) * (dw[i] || 1);
    r *= 2.2;
    if (futile) r -= 0.04;
    r = SB.clamp(r, -1, 1);
    c.lastReward = r;
    SB.Brain.reinforce(c.brain, r);
    if (r > 0.25 && !c.anim.emote) emote(c, "happy", 1.2);
    else if (r < -0.2) emote(c, "sad", 1.2);

    observe(c, a.verb, noun, r, game);
    c.action = null;
    c.thinkT = 0.15 + game.rng() * 0.35;
  }

  function finish(c, game, ok) {
    if (c.asleep) { c.asleep = false; c.inBed = false; }
    c.action = null;
    c.thinkT = 0.2;
  }

  function dropHeld(c, game, toss) {
    if (c.holding == null) return;
    var o = SB.Game.byId(game, c.holding);
    c.holding = null;
    if (!o) return;
    o.heldBy = null;
    o.vx = c.facing * (toss || 40);
    o.vy = -120;
  }

  function creatureEffects(c, o, verb, game) {
    var oc = o.chem;
    if (verb === V.hit) {
      c.stats.hits++;
      var hard = c.species === "grump" ? 0.32 : 0.22;
      SB.Chem.apply(oc, { pain: hard, fear: 0.18, anger: 0.15 });
      o.anim.squash = 0.35; emote(o, "ouch", 1.5);
      if (o.species === "smol") say(o, knows(o, "ouch") ? "ouch!" : "eek!", game);
      if (c.species === "grump" && o.species === "smol" && game.rng.chance(0.2)) { oc.antigen = Math.min(1, oc.antigen + 0.25); }
      if (o.asleep) { o.asleep = false; o.inBed = false; o.action = null; }
      o.vx = c.facing * 120; o.vy = -160; o.onGround = false;
      SB.bus.emit("hit", { c: c, target: o });
      // victims learn the attacker is bad news
      if (o.species === "smol" && o.action) o.thinkT = 0;
    } else if (verb === V.cuddle && o.species === "smol") {
      SB.Chem.apply(oc, { lonely: -0.2 });
      emote(c, "love", 1.8); emote(o, "love", 1.8);
      tryBreed(c, o, game, c.action ? c.action.start[D.love] : c.chem.love);
    } else if (verb === V.play && o.species === "smol") {
      SB.Chem.apply(oc, { bored: -0.15 });
    }
  }

  function handEffects(c, verb, game) {
    if (verb === V.cuddle) { emote(c, "love", 1.6); SB.Render && SB.Render.fx && SB.Render.fx("hearts", game.hand.x, game.hand.y, { n: 3 }); }
    if (verb === V.hit) { emote(c, c.species === "grump" ? "angry" : "huh", 1.2); SB.Render && SB.Render.fx && SB.Render.fx("bonk", game.hand.x, game.hand.y); }
  }

  // aLove: the actor's love before this cuddle relieved it
  function tryBreed(a, b, game, aLove) {
    if (a.stage !== 3 || b.stage !== 3) return;
    if (aLove < 0.5 || b.chem.love < 0.4) return;
    if (a.eggCooldown > 0 || b.eggCooldown > 0) return;
    var pop = SB.Game.smols(game).length + game.world.objects.filter(function (o) { return o.kind === "egg"; }).length;
    if (pop >= 16) { say(a, "too many smols", game); return; }
    SB.Game.layEgg(game, a, b, (a.x + b.x) / 2);
    a.chem.love = 0; b.chem.love = 0;
    a.eggCooldown = b.eggCooldown = 600;
    a.stats.kids++; b.stats.kids++;
  }

  // Watching others act teaches you (for better or worse).
  var obsX = new Float32Array(SB.N_IN);
  function observe(actor, verb, noun, r, game) {
    if (!noun || verb === V.idle || verb === V.wander) return;
    var rate = actor.species === "grump" ? (verb === V.hit ? 0.12 : 0.04) : r > 0.1 ? 0.1 : 0;
    if (!rate) return;
    var cs = game.creatures;
    for (var i = 0; i < cs.length; i++) {
      var w = cs[i];
      if (w === actor || !w.alive || w.species !== "smol" || w.asleep) continue;
      if (Math.abs(w.x - actor.x) > 220) continue;
      var n = N[noun];
      if (noun === "smol" && actor.species === "grump") n = N.smol; // the grump hit a smol: "hitting smols works"
      SB.Chem.drives(w.chem, drv);
      for (var k = 0; k < SB.N_IN; k++) obsX[k] = 0;
      for (k = 0; k < SB.N_DRIVES; k++) obsX[SB.IN.DRIVE0 + k] = drv[k];
      obsX[SB.IN.NOUN0 + n] = 1;
      obsX[SB.IN.NEAR] = 1;
      obsX[SB.IN.DARK] = game.world.night ? 1 : 0;
      obsX[SB.IN.BIAS] = 1;
      SB.Brain.imitate(w.brain, obsX, verb, rate);
    }
  }

  /* ---------------- the hand ---------------- */

  C.tickle = function (c, game) {
    if (!c.alive) return;
    c.chem.reward = Math.min(1, c.chem.reward + 0.5);
    SB.Chem.apply(c.chem, { lonely: -0.05, bored: -0.03 });
    SB.Brain.reinforce(c.brain, 0.7);
    c.lastReward = 0.7;
    c.stats.tickles++;
    game.stats.tickles++;
    emote(c, c.species === "grump" ? "huh" : "happy", 1.4);
    c.anim.squash = 0.2;
    if (c.asleep && game.rng.chance(0.3)) { c.asleep = false; c.inBed = false; c.action = null; }
    if (c.species === "smol") SB.Game.unlock(game, "tickle");
    SB.bus.emit("tickle", { c: c });
  };

  C.tap = function (c, game) {
    if (!c.alive) return;
    c.chem.punish = Math.min(1, c.chem.punish + 0.5);
    SB.Chem.apply(c.chem, { pain: 0.06, fear: c.species === "grump" ? 0.25 : 0.05 });
    SB.Brain.reinforce(c.brain, -0.7);
    c.lastReward = -0.7;
    c.stats.taps++;
    game.stats.taps++;
    emote(c, "ouch", 1.2);
    c.anim.squash = 0.3;
    if (c.asleep) { c.asleep = false; c.inBed = false; }
    // a scolded creature stops what it's doing
    c.action = null; c.thinkT = 0.4;
    if (c.species === "grump") {
      if (game.time - c.tapT > 10) c.tapCount = 0;
      c.tapT = game.time;
      c.tapCount++;
      if (c.tapCount >= 3 && !c.goingHome) {
        c.goingHome = true;
        say(c, "fine! FINE!", game);
        SB.Game.unlock(game, "scare");
      }
    } else SB.Game.unlock(game, "tap");
    SB.bus.emit("tap", { c: c });
  };

  /* ---------------- hearing ---------------- */

  C.hear = function (c, raw, game, opts) {
    if (!c.alive) return;
    opts = opts || {};
    var word = String(raw || "").toLowerCase().replace(/[^a-z' ]/g, "").trim();
    if (!word) return;
    if (SB.SYNONYMS[word] && !SB.LEXICON[word]) word = SB.SYNONYMS[word];
    var name = c.name.toLowerCase();
    if (c.asleep) {
      if (word === name && game.rng.chance(0.6)) { c.asleep = false; c.inBed = false; c.action = null; emote(c, "huh", 1.2); }
      return;
    }
    if (c.species === "grump") { if (game.rng.chance(0.3)) say(c, "huh?", game); return; }
    var now = game.time;

    if (word === "good" || word === "bad") {
      var r = (word === "good" ? 0.35 : -0.35) * (0.5 + gene(c.genome, "obedience", 0.5));
      SB.Brain.reinforce(c.brain, r);
      c.lastReward = r;
      emote(c, word === "good" ? "happy" : "sad", 1.2);
      return;
    }
    if (word === name) {
      c.heard.name = true; c.heard.t = now;
      emote(c, "huh", 1.2);
      c.anim.lookX = SB.clamp((game.hand.x - c.x) / 80, -1, 1);
      if (c.action && (c.action.verb === V.idle || c.action.verb === V.wander)) { c.action = null; c.thinkT = 0.2; }
      return;
    }
    var lex = SB.LEXICON[word];
    if (!lex) { if (game.rng.chance(0.5)) c.speech = { text: "?", t: 1.2, kind: "think" }; return; }

    if (lex.type === "verb") {
      c.heard.verb = lex.i; c.heard.t = now;
      if (c.action && c.action.verb === lex.i) learnWord(c, word, 0.4, game);
      else learnWord(c, word, 0.06, game); // hearing a lot helps a little
      // respond quickly: drop idle/wander/approach to reconsider with the command in mind
      if (!c.action || c.action.phase === "go" || c.action.verb === V.idle || c.action.verb === V.wander) { c.action = null; c.thinkT = 0.25; }
      echo(c, word, game);
      return;
    }
    if (lex.type === "noun") {
      c.heard.noun = lex.i; c.heard.t = now; c.heard.nounId = opts.aboutId || null;
      var looking = false;
      if (opts.aboutId != null) {
        var ref = SB.Game.byId(game, opts.aboutId);
        if (ref && Math.abs(ref.x - c.x) < VIEW_R + 60) {
          looking = true;
          c.attn = { type: ref.species ? "creature" : "object", id: ref.id, noun: SB.NOUNS[lex.i] };
          c.anim.lookX = SB.clamp((ref.x - c.x) / 80, -1, 1);
        }
      } else if (c.attn && c.attn.noun === SB.NOUNS[lex.i]) looking = true;
      var correct = opts.aboutNoun == null || opts.aboutNoun === SB.NOUNS[lex.i] || opts.aboutNoun === lex.i;
      if (correct) learnWord(c, word, looking ? 0.36 : 0.12, game);
      if (c.action && (c.action.verb === V.idle || c.action.verb === V.wander)) { c.action = null; c.thinkT = 0.3; }
      echo(c, word, game);
      return;
    }
    if (lex.type === "drive") {
      var top = SB.Chem.top(c.chem);
      learnWord(c, word, top.i === lex.i && top.v > 0.4 ? 0.34 : 0.08, game);
      echo(c, word, game);
    }
  };

  // Try to repeat a word it's learning (the magic moment).
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
    dropHeld(c, game, 0);
    if (c.heldBy === "hand") { game.hand.heldId = null; c.heldBy = null; }
    if (c.species === "grump") { c.gone = true; return; }
    game.stats.deaths++;
    var f = game.family[c.id];
    if (f) { f.died = game.time; f.cause = cause; f.name = c.name; }
    var why = { starved: "starved 😢", sick: "got too sick", hurt: "got hurt too badly", old: "passed away of old age, surrounded by snacks", cold: "got too cold" }[cause] || "died";
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
    var world = game.world, ch = c.chem, an = c.anim;
    c.age += dt;
    c.moving = false;

    // grow up
    var st = stageFor(c.age);
    if (st !== c.stage) {
      c.stage = st;
      if (c.species === "smol") {
        SB.Game.note(game, c.name + " is now " + (st === 3 ? "an " : "a ") + SB.STAGES[st].name + "!");
        emote(c, "idea", 2);
        SB.bus.emit("grow", { c: c });
      }
    }
    if (c.species === "smol" && c.age > c.lifespan) { die(c, game, "old"); return; }
    if (c.eggCooldown > 0) c.eggCooldown -= dt;

    var gy = SB.World.groundY(world, c.x);
    var room = SB.World.roomAt(world, c.x);
    if (c.species === "smol" && SB.ROOMS[room]) c.visited[SB.ROOMS[room].id] = true;

    // body chemistry
    var friends = 0;
    if (c.species === "smol") {
      var cs = game.creatures;
      for (var i = 0; i < cs.length; i++) {
        var o = cs[i];
        if (o !== c && o.alive && o.species === "smol" && Math.abs(o.x - c.x) < 130) friends++;
      }
      var h = game.hand;
      if (h.visible && Math.abs(h.x - c.x) < 90 && Math.abs(h.y - (c.y - 30)) < 120) friends += 0.5;
    }
    SB.Chem.tick(ch, dt, {
      temp: SB.World.tempAt(world, c.x), dark: world.night, asleep: c.asleep, inBed: c.inBed,
      moving: !!(c.action && c.action.phase === "go") || (c.action && (c.action.verb === V.wander || c.action.verb === V.flee || c.action.verb === V.play)),
      nearFriends: friends, stage: c.stage, species: c.species
    }, c.genome);
    if (ch.health <= 0) { die(c, game, causeOfDeath(ch)); return; }

    // illness bookkeeping
    if (c.species === "smol") {
      if (!c.wasSick && ch.sick > 0.5) { c.wasSick = true; SB.Game.note(game, c.name + " is feeling sick 🤢"); SB.bus.emit("sick", { c: c }); }
      else if (c.wasSick && ch.sick < 0.15) { c.wasSick = false; game.stats.cured++; SB.Game.unlock(game, "cure"); SB.bus.emit("cured", { c: c }); }
    }

    // anim timers
    an.blinkT -= dt;
    if (an.blinkT <= 0) { an.blink = 1; an.blinkT = 2 + Math.random() * 4; }
    an.blink = Math.max(0, an.blink - dt * 8);
    an.squash *= Math.max(0, 1 - dt * 6);
    an.bob += dt * (c.asleep ? 1.5 : 3);
    if (an.emoteT > 0) { an.emoteT -= dt; if (an.emoteT <= 0) an.emote = null; }
    if (c.speech) { c.speech.t -= dt; if (c.speech.t <= 0) c.speech = null; }
    an.mouth = c.asleep ? "o" : ch.sick > 0.5 || ch.pain > 0.5 ? "frown" : c.action && c.action.verb === V.eat && c.action.phase === "do" ? "chew" : ch.reward > 0.2 || ch.fear > 0.5 ? "open" : SB.Chem.mood(ch) === "sad" ? "frown" : "smile";

    // in the hand: wriggle, no thinking
    if (c.heldBy === "hand") {
      c.asleep = false; c.inBed = false; c.action = null; c.onGround = false; c.vx = 0; c.vy = 0;
      an.walk += dt * 10;
      positionHeld(c, game);
      return;
    }

    // airborne (thrown, knocked, bouncing)
    if (!c.onGround || c.y < gy - 1 || c.vy < 0) {
      c.vy += GRAVITY * dt;
      c.x = SB.clamp(c.x + c.vx * dt, 30, SB.WORLD_W - 30);
      c.y += c.vy * dt;
      gy = SB.World.groundY(world, c.x);
      if (c.y >= gy) {
        if (c.vy > 650 && c.species === "smol") { SB.Chem.apply(ch, { pain: 0.15 + (c.vy - 650) / 3000, fear: 0.1 }); emote(c, "ouch", 1.2); }
        c.y = gy; c.vy = 0; c.vx = 0; c.onGround = true; an.squash = 0.35;
      } else { c.onGround = false; positionHeld(c, game); return; }
    }
    c.y = gy;

    // grumps go home at dawn (or when shooed)
    if (c.species === "grump" && (!world.night || c.goingHome)) {
      var cave = SB.World.byKind ? SB.World.byKind(world, "grumpcave")[0] : null;
      var hx = cave ? cave.x : 120;
      c.asleep = false;
      c.action = null;
      walkToward(c, hx, dt, speedOf(c, null) * 1.3);
      if (Math.abs(c.x - hx) < 20) {
        // whatever it stole goes into the cave
        if (c.holding != null) { var held = SB.Game.byId(game, c.holding); if (held) SB.World.remove(world, held); c.holding = null; }
        c.alive = false; c.gone = true;
      }
      positionHeld(c, game);
      return;
    }

    // asleep: wake when rested or disturbed
    if (c.asleep) {
      if ((ch.sleepy < 0.05 && ch.tired < 0.1) || ch.pain > 0.45 || ch.fear > 0.55 || ch.hunger > 0.85) {
        c.asleep = false; c.inBed = false;
        if (c.action && c.action.verb === V.sleep) complete(c, game, c.action, null);
        emote(c, "happy", 1);
      } else {
        if (Math.random() < dt * 0.4) emote(c, "zzz", 1.5);
        positionHeld(c, game);
        return;
      }
    }

    // fear interrupts: a grump close by
    if (c.species === "smol" && c.action && c.action.verb !== V.flee && ch.fear > 0.6 && c.action.phase === "go") c.thinkT = 0;

    // think and act
    if (!c.action) {
      c.thinkT -= dt;
      if (c.thinkT <= 0) think(c, game);
    }
    if (c.action) act(c, dt, game);

    // grumps carrying loot head home early
    if (c.species === "grump" && c.holding != null && (!c.action || c.action.verb !== V.eat) && game.rng.chance(dt * 0.3)) c.goingHome = true;

    // chatter now and then even without a new decision
    c.chatT -= dt;
    if (c.chatT <= 0) {
      c.chatT = 6 + game.rng() * 10;
      if (c.species === "smol" && !c.speech) maybeChat(c, game, c.action ? c.action.verb : V.idle, c.attn ? c.attn.noun : null);
    }

    c.x = SB.clamp(c.x, 30, SB.WORLD_W - 30);
    c.y = SB.World.groundY(world, c.x);
    positionHeld(c, game);

    // IQ is expensive-ish: refresh every few seconds
    c.iqT -= dt;
    if (c.iqT <= 0) { c.iq = C.iq(c, true); c.iqT = 3; }
  };

  function positionHeld(c, game) {
    if (c.holding == null) return;
    var o = SB.Game.byId(game, c.holding);
    if (!o || o.heldBy !== c.id) { c.holding = null; return; }
    var r = C.radius(c);
    o.x = c.x + c.facing * (r * 0.9);
    o.y = c.y - r * 0.9;
    o.vx = 0; o.vy = 0;
  }

  /* ---------------- IQ ---------------- */

  // Instinct quality from the net's answers to SB.GOOD / SB.BAD, plus vocabulary and experience.
  C.iq = function (c, recompute) {
    if (!recompute && c.iq) return c.iq;
    var t = SB.Brain.iqTest(c.brain);
    var words = C.knownCount(c);
    var exp = Math.min(10, (c.brain.updates || 0) / 60);
    return Math.round(30 + 50 * t.good + 15 * t.bad + 3 * words + exp);
  };

  /* ---------------- explain (for the UI) ---------------- */

  C.thought = function (c) {
    if (!c.alive) return "…";
    if (c.heldBy === "hand") return "wheee (being carried)";
    if (c.asleep) return "zzz (sleeping" + (c.inBed ? " in bed" : "") + ")";
    var top = SB.Chem.top(c.chem);
    var feel = top.v > 0.35 ? SB.DRIVE_WORDS[top.i] : "fine";
    if (!c.action) return feel + " → thinking…";
    var v = SB.VERB_WORDS[c.action.verb];
    var n = c.action.noun ? " " + SB.NOUN_WORDS[N[c.action.noun]] : "";
    if (!SB.VERB_NEEDS_TARGET[c.action.verb] && c.action.verb !== V.talk) n = "";
    return feel + " → " + v + n;
  };
})();
