/* smol brains: the first hour. Echoes you can see (+🤲 pips and "what its kids will inherit"), the hatch
   reveal (what changed in the baby and why), little wishes the hand can grant, and a livelier hand
   (grabbed smols wiggle and giggle or squeal, the sky can shake fruit out of trees). Sim side only;
   ui.js, bodies.js and input.js draw and drive it. */
(function () {
  "use strict";
  var SB = window.SB, FH = (SB.FirstHour = {});

  // gene <- the habit that echoes into it. caps match SB.Creature.echo (tests/firsthour.test.js checks)
  FH.ECHO = {
    arms: { habits: ["hands"], cap: 6.3, unit: 0.35, icon: "🤲", did: "has carried", what: "things", kids: "hands-y babies", by: "carried a lot", word: "hands", col: "#ffd166" },
    limbs: { habits: ["walk"], cap: 150, unit: 10, icon: "🦶", did: "has gone on", what: "walks", kids: "leggy babies", by: "walked a lot", word: "legs", col: "#8fd3ff" },
    cortex: { habits: ["think"], cap: 6, unit: 0.35, icon: "🧠", did: "has had", what: "lessons", kids: "brainy babies", by: "learned a lot", word: "brains", col: "#ff7eb6" },
    social: { habits: ["social"], cap: 4, unit: 0.5, icon: "💬", did: "has had", what: "chats", kids: "chatty babies", by: "chatted a lot", word: "words", col: "#ff9f43" },
    planning: { habits: ["plan", "build"], cap: 5, unit: 0.6, icon: "🔨", did: "has done", what: "jobs", kids: "planner babies", by: "built a lot", word: "plans", col: "#c5ff49" }
  };
  // other echoes, for the hatch reasons
  var BY = { dexterity: "carried a lot", senses: "walked a lot", recall: "learned a lot", head: "learned a lot", layers: "thought a lot", fins: "swam a lot", fluff: "lived in the cold", horns: "fought a lot", glow: "sat by crystals", wings: "sat by crystals" };
  var HABIT_GENE = {};
  Object.keys(FH.ECHO).forEach(function (g) { FH.ECHO[g].habits.forEach(function (k) { HABIT_GENE[k] = g; }); });
  // brain genes count toward the neuron total of the next tier
  var NEURON_GENES = { cortex: 1 };

  function habitSum(c, info) { var s = 0, h = c.habits || {}; for (var i = 0; i < info.habits.length; i++) s += h[info.habits[i]] || 0; return s; }
  // how far a smol's practice has got toward a gene's echo: {gene, n, of, frac}
  FH.echoProgress = function (c, gene) {
    var info = FH.ECHO[gene];
    if (!info) return null;
    var s = habitSum(c, info), of = Math.round(info.cap / info.unit);
    return { gene: gene, info: info, n: Math.min(of, Math.floor(s / info.unit + 1e-6)), of: of, frac: Math.min(1, s / info.cap) };
  };
  // which echo genes the next tier wants (neurons -> cortex)
  FH.wanted = function (c) {
    var out = [];
    SB.Genome.nextNeeds(c.genome).forEach(function (n) {
      var g = FH.ECHO[n.gene] ? n.gene : n.gene === "neurons" || n.gene === "layers" ? "cortex" : null;
      if (g && out.indexOf(g) < 0) out.push(g);
    });
    return out;
  };
  // the next tier, as one number (the worst need), same as the goals strip
  FH.tierProgress = function (g) {
    var needs = SB.Genome.nextNeeds(g);
    if (!needs.length) return 1;
    var worst = 1;
    needs.forEach(function (n) { worst = Math.min(worst, n.have / n.need); });
    return Math.max(0, Math.min(1, worst));
  };

  /* ---------------- floaters: "+🤲" pips and learning chips (drawn by bodies.js) ---------------- */
  function float(c, text, kind, col) {
    var f = c._fl || (c._fl = []);
    f.push({ t: text, k: kind || "pip", col: col || null });
    if (f.length > 4) f.shift();
  }
  FH.float = float;

  FH.onHabit = function (c, k, amt) {
    var g = HABIT_GENE[k];
    if (!g || c.species !== "smol" || c.far) return;
    var info = FH.ECHO[g], acc = c._pip || (c._pip = {});
    acc[k] = (acc[k] || 0) + amt;
    if (acc[k] < info.unit) return;
    acc[k] = acc[k] % info.unit;
    if (habitSum(c, info) - amt >= info.cap) return; // already echoing as hard as it can
    float(c, "+" + info.icon, "pip", info.col);
  };
  if (SB.Creature) SB.Creature.onHabit = FH.onHabit;

  // the "🍎 eat food ↑" chip: what a tickle or a tap actually changed in the net
  FH.chipText = function (verb, noun, delta) {
    var vw = SB.VERB_WORDS[verb] || "that", nw = noun >= 0 ? SB.NOUN_WORDS[noun] : "", em = noun >= 0 ? SB.NOUN_EMOJI[noun] : "🧠";
    return em + " " + vw + (nw ? " " + nw : "") + (delta > 0 ? " ↑" : " ↓");
  };
  SB.bus.on("learned", function (d) {
    if (!d.c || d.c.species !== "smol" || Math.abs(d.delta) < 0.005) return;
    float(d.c, FH.chipText(d.verb, d.noun, d.delta), d.delta > 0 ? "up" : "down");
  });

  /* ---------------- eggs: what the baby leans toward, and why ---------------- */
  function parentWord(p) { return p.sex === "f" ? "mum" : p.sex === "m" ? "dad" : p.name; }
  FH.onEgg = function (game, egg, a, b, bless) {
    var d = egg.data, child = d.genome;
    if (!child || !a.genome || !b.genome) return;
    var ea = a.habits ? SB.Creature.echo(a) : {}, eb = b.habits ? SB.Creature.echo(b) : {};
    var why = [], best = 0, lean = null;
    SB.Genome.EVO_GENES.forEach(function (n) {
      var pv = ((a.genome.genes[n] || 0) + (b.genome.genes[n] || 0)) / 2, dv = (child.genes[n] || 0) - pv;
      if (Math.abs(dv) < 0.03) return;
      var r, x = ea[n] || 0, y = eb[n] || 0, by = (FH.ECHO[n] && FH.ECHO[n].by) || BY[n] || "practised it";
      if (bless && bless[n] && dv > 0) r = "your blessing";
      else if (dv > 0 && Math.max(x, y) > 0.15) r = x > 0.3 && y > 0.3 ? "both parents " + by : (x >= y ? parentWord(a) : parentWord(b)) + " " + by;
      else if (dv > 0.07) r = "mutation";
      else if (dv > 0) r = "a lucky mix";
      else r = "a different mix";
      why.push({ g: n, d: Math.round(dv * 100) / 100, r: r });
      if (FH.ECHO[n] && dv > best) { best = dv; lean = n; }
    });
    why.sort(function (p, q) { return Math.abs(q.d) - Math.abs(p.d); });
    d.why = why.slice(0, 4);
    d.lean = best > 0.03 ? lean : null;
    d.pTier = Math.max(FH.tierProgress(a.genome), FH.tierProgress(b.genome));
    d.pMax = Math.max(a.tier || 0, b.tier || 0);
  };
  FH.reasonText = function (w) {
    var info = FH.ECHO[w.g], icon = info ? info.icon : "🧬", lbl = SB.Genome.GENE_LABELS[w.g] || w.g;
    if (w.r === "mutation") return "✨ mutation: " + lbl + "!";
    return icon + " " + lbl + " " + (w.d > 0 ? "+" : "") + w.d.toFixed(2) + " (" + w.r + ")";
  };

  /* ---------------- the hand: grabbed smols react, trees can be shaken ---------------- */
  var GIGGLE = ["hehe!", "wheee!", "again!", "hihi!"], SQUEAL = ["eep!", "aaa!", "put me down!", "nooo!"];
  SB.bus.on("handGrab", function (d) {
    var c = d.ref, game = SB.Game.current;
    if (!c || c.type !== "creature" || !game) return;
    var g = c.genome.genes, brave = (g.bravery || 0.5) * 0.6 + (g.playfulness || 0.5) * 0.4 + (c.chem.reward || 0) * 0.2 - (c.chem.fear || 0) * 0.5;
    var giggle = c.species === "smol" && brave > 0.42;
    c.anim.held = giggle ? "giggle" : "squeal";
    var pool = c.species === "grump" ? ["grr!", "hrmph!"] : giggle ? GIGGLE : SQUEAL;
    c.speech = { text: pool[Math.floor(Math.random() * pool.length)], t: 1.4, kind: "say" };
    if (c.species === "smol") SB.Chem.apply(c.chem, giggle ? { bored: -0.06 } : { fear: 0.08 });
    SB.bus.emit("heldReact", { c: c, giggle: giggle });
  });
  SB.bus.on("handDrop", function (d) {
    var game = SB.Game.current, ref = d.ref;
    if (!ref) return;
    if (ref.type === "creature" && ref.anim) ref.anim.held = null;
    else if (ref.type !== "creature" && game) ref.skyT = game.time; // smols find things from the sky extra interesting (see Creature.carry)
    if (game) handled(game, ref);
  });
  function handled(game, ref) {
    var f = fh(game);
    f.recent.push({ id: ref.id, type: ref.type === "creature" ? "creature" : "item", t: game.time });
    if (f.recent.length > 8) f.recent.shift();
  }
  FH.handled = handled;

  FH.SHAKE_CD = 20;
  // shaking a tree with the hand: fruit for free, once every SHAKE_CD seconds per tree
  FH.handShake = function (game, n) {
    var f = fh(game);
    if (!n || (f.shakeCD[n.id] || 0) > game.time) return null;
    var o = SB.World.shake(game.world, game, n, true);
    f.shakeCD[n.id] = game.time + (o ? FH.SHAKE_CD : 4);
    if (o) handled(game, o);
    SB.bus.emit("handShake", { n: n, o: o });
    return o;
  };
  FH.canShake = function (n) { var def = n && SB.NODES[n.kind]; return !!(def && def.drops && def.noun === "plant" && n.state === "ok"); };

  /* ---------------- wishes: tiny asks the hand can grant, before smols know how to pray ---------------- */
  FH.WISHES = {
    food: { icon: "🍎", text: "an apple, up high", sparks: 1, mem: "I wished for an apple and the sky one helped me" },
    friend: { icon: "🫂", text: "a friend", sparks: 2, mem: "I was lonely and the sky one brought me a friend" },
    warm: { icon: "🔥", text: "to be warm", sparks: 2, mem: "I was cold and the sky one carried me to the fire" },
    toy: { icon: "⚽", text: "something to play with", sparks: 1, mem: "the sky one gave me something to play with" }
  };
  FH.WISH_LIFE = 75;
  function fh(game) { return game.fh || (game.fh = { wishT: 45, wishes: [], recent: [], shakeCD: {} }); }
  FH.state = fh;
  function wisher(game, c) {
    return c.alive && c.species === "smol" && !c.far && !c.asleep && c.heldBy == null && !c.stranger && !c.dying && (c.tier || 0) <= 2 && c.stage >= 1;
  }
  function kindsFor(game, c, smols) {
    var k = [], w = game.world;
    if (c.chem.hunger > 0.25 || SB.World.nearestNode(w, c.x, c.z, 10, function (n) { return FH.canShake(n); })) k.push("food");
    if (smols.length >= 2 && smols.some(function (o) { return o !== c && SB.dist(o.x, o.z, c.x, c.z) > 4; })) k.push("friend");
    var fire = SB.World.nearestFire(w, c.x, c.z, 30);
    if (fire && fire.heat > 0.2 && SB.World.fireWarmth(w, c.x, c.z) < 0.1 && (c.chem.cold > 0.2 || SB.World.clock(w).night)) k.push("warm");
    if (w.items.some(function (o) { return o.noun !== "food" && o.kind !== "egg" && o.heldBy == null && SB.dist(o.x, o.z, c.x, c.z) < 30; })) k.push("toy");
    return k;
  }
  FH.makeWish = function (game, c, kind) {
    var f = fh(game);
    var w = { id: c.id, kind: kind, t: game.time };
    f.wishes.push(w);
    c.speech = { text: "💭" + FH.WISHES[kind].icon, t: 2, kind: "think" };
    SB.bus.emit("wish", { c: c, w: w });
    return w;
  };
  function granted(game, c, w, f) {
    var near = function (o) { return o && SB.dist(o.x, o.z, c.x, c.z) < 2.4; };
    for (var i = 0; i < f.recent.length; i++) {
      var r = f.recent[i];
      if (r.t < w.t - 1) continue;
      if (r.type === "creature") {
        var o = SB.Game.byId(game, r.id);
        if (w.kind === "friend" && o && o !== c && o.species === "smol" && o.alive && o.heldBy == null && near(o)) return true;
        if (w.kind === "warm" && o === c && c.heldBy == null && SB.World.fireWarmth(game.world, c.x, c.z) > 0.05) return true;
      } else {
        var it = SB.World.itemById(game.world, r.id);
        if (!it || it.heldBy === "hand") continue;
        if (w.kind === "food" && it.noun === "food" && near(it)) return true;
        if (w.kind === "toy" && it.noun !== "food" && it.kind !== "egg" && near(it)) return true;
      }
    }
    if (w.kind === "warm" && c.heldBy == null && SB.World.fireWarmth(game.world, c.x, c.z) > 0.05 && f.recent.some(function (r) { return r.id === c.id && r.type === "creature" && r.t >= w.t; })) return true;
    return false;
  }
  function grant(game, c, w) {
    var def = FH.WISHES[w.kind];
    w.done = true;
    SB.Game.addSparks(game, def.sparks, c);
    SB.Chem.apply(c.chem, { lonely: -0.12, bored: -0.1 });
    c.chem.reward = Math.min(1, (c.chem.reward || 0) + 0.4);
    SB.Creature.emote(c, "love", 2);
    c.speech = { text: "yay!", t: 1.6, kind: "say" };
    if (SB.Mind && SB.Mind.remember) SB.Mind.remember(c, game, "sky", def.mem, 0.9, c.x, c.z);
    if (SB.Social && SB.Social.log) SB.Social.log(game, c, "💭", def.mem);
    game.stats.wishes = (game.stats.wishes || 0) + 1;
    SB.bus.emit("wishGranted", { c: c, w: w, sparks: def.sparks });
  }
  FH.tick = function (game, dt) {
    var f = fh(game);
    // held smols squirm: a squish and a kick
    if (game.hand && game.hand.heldId != null && game.hand.heldType === "creature") {
      var hc = SB.Game.byId(game, game.hand.heldId);
      if (hc && hc.anim) hc.anim.squash = Math.sin(game.time * (hc.anim.held === "giggle" ? 11 : 17)) * (hc.anim.held === "giggle" ? 0.12 : 0.2);
    }
    for (var i = f.wishes.length - 1; i >= 0; i--) {
      var w = f.wishes[i], c = SB.Game.byId(game, w.id);
      if (w.done || !c || !c.alive || game.time - w.t > FH.WISH_LIFE) { f.wishes.splice(i, 1); if (c && c.alive && !w.done) SB.bus.emit("wishFaded", { c: c, w: w }); continue; }
      if (granted(game, c, w, f)) { grant(game, c, w); f.wishes.splice(i, 1); }
    }
    while (f.recent.length && game.time - f.recent[0].t > 8) f.recent.shift();
    if (game.offline || (game.tutorial && !game.tutorial.done)) return;
    f.wishT -= dt;
    if (f.wishT > 0 || f.wishes.length >= 2) return;
    var smols = SB.Game.smols(game), cands = smols.filter(function (c) { return wisher(game, c) && !f.wishes.some(function (w) { return w.id === c.id; }); });
    if (!cands.length) { f.wishT = 30; return; } // no little ones: look again later
    var r = SB.rng((game.time * 977 + cands.length) >>> 0); // its own dice: wishes never shift the sim's random stream
    f.wishT = r.range(50, 90);
    var c = cands[r.int(cands.length)], kinds = kindsFor(game, c, smols);
    if (kinds.length) FH.makeWish(game, c, kinds[r.int(kinds.length)]);
  };
  FH.wishOf = function (game, c) { var f = game.fh; if (!f) return null; for (var i = 0; i < f.wishes.length; i++) if (f.wishes[i].id === c.id) return f.wishes[i]; return null; };
})();
