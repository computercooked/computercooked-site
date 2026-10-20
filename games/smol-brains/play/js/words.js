// smol brains — the word book. Words aren't typed: they're a set of things your tribe can learn, unlocked
// as they evolve, taught by *showing* (point at food and say "food", ask a smol to "come" and praise it
// when it does). Each smol can only take in a word every few seconds, so mashing does nothing.
// Words the whole tribe shares make every smol a bit smarter, and turn into calls you can give them.
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var WD = SB.Words = {};

  // tier = the evolution stage the word becomes teachable at; call = what saying it does once they know it
  var BOOK = [
    { w: "food", tier: 0, call: "hungry smols go and eat" },
    { w: "come", tier: 0, call: "smols who know it come to you" },
    { w: "sleep", tier: 0, call: "tired smols go to bed" },
    { w: "play", tier: 0, call: "bored smols find something fun" },
    { w: "hug", tier: 0, call: "lonely smols cuddle up" },
    { w: "water", tier: 0 },
    { w: "smol", tier: 0 },
    { w: "egg", tier: 0 },
    { w: "hungry", tier: 0 },
    { w: "scared", tier: 0 },
    { w: "eat", tier: 1, call: "anyone holding food eats it" },
    { w: "run", tier: 1, call: "everyone runs from danger" },
    { w: "wait", tier: 1, call: "smols stop what they're doing" },
    { w: "explore", tier: 1, call: "smols wander off and look around" },
    { w: "grump", tier: 1 },
    { w: "tree", tier: 1 },
    { w: "bunny", tier: 1 },
    { w: "cold", tier: 1 },
    { w: "sick", tier: 1 },
    { w: "get", tier: 2, call: "smols pick up what's in front of them" },
    { w: "drop", tier: 2, call: "smols put down what they're holding" },
    { w: "make", tier: 2, call: "smols try crafting something" },
    { w: "stick", tier: 2 },
    { w: "rock", tier: 2 },
    { w: "tool", tier: 2 },
    { w: "herb", tier: 2 },
    { w: "fire", tier: 3 },
    { w: "home", tier: 3 },
    { w: "talk", tier: 3, call: "smols chat (and share words)" },
    { w: "teach", tier: 3, call: "smols pass on what they know" },
    { w: "give", tier: 3, call: "smols share what they hold" },
    { w: "pray", tier: 3 },
    { w: "goods", tier: 3 },
    { w: "build", tier: 4, call: "builders get back to building" },
    { w: "crop", tier: 4 },
    { w: "totem", tier: 5 },
    { w: "wonder", tier: 5 }
  ];
  WD.BOOK = BOOK;
  WD.byWord = {};
  BOOK.forEach(function (b) { WD.byWord[b.w] = b; });

  var COOLDOWN = 9; // seconds before the same smol can take in the same word again
  WD.COOLDOWN = COOLDOWN;

  function lex(w) { return SB.LEXICON[w]; }
  WD.kind = function (w) { var l = lex(w); return l ? l.type : null; };
  WD.icon = function (w) {
    var l = lex(w);
    if (!l) return "✨";
    if (l.type === "noun") return SB.NOUN_EMOJI[l.i];
    if (l.type === "verb") return SB.VERB_EMOJI[l.i];
    if (l.type === "drive") return SB.DRIVE_EMOJI[l.i];
    return "💡";
  };
  // what you have to do to teach it
  var MASS = { food: 1, water: 1, goods: 1, fire: 1 };
  WD.how = function (w) {
    var k = WD.kind(w);
    if (k === "noun") return "tap " + (MASS[w] ? "some " + w : (/^[aeiou]/.test(w) ? "an " : "a ") + w) + " where your smols can see it";
    if (k === "verb") return "tap a smol. when it does it, that's a lesson";
    if (k === "drive") return "tap a smol that feels " + w;
    return "";
  };

  function smols(game) { return game.creatures.filter(function (c) { return c.alive && c.species === "smol"; }); }
  WD.topTier = function (game) { var t = 0; smols(game).forEach(function (c) { if (c.tier > t) t = c.tier; }); return t; };
  WD.unlocked = function (game, b) { return (game.wordTier || 0) >= b.tier || WD.topTier(game) >= b.tier; };
  // fraction of grown-up-ish smols (not eggs/babies only) who know a word
  WD.share = function (game, w) {
    var all = smols(game), n = 0, k = 0;
    all.forEach(function (c) { if (c.stage === 0 && all.length > 3) return; n++; if ((c.vocab[w] || 0) >= 1) k++; });
    return n ? k / n : 0;
  };
  // the tribe's shared words (known by at least half): every one makes everybody a bit smarter
  WD.update = function (game) {
    var cul = game.culture || (game.culture = { words: {} }), n = 0;
    BOOK.forEach(function (b) { if (WD.share(game, b.w) >= 0.5) n++; });
    if (n > (cul.sharedMax || 0)) {
      if (cul.sharedMax != null && SB.bus) SB.bus.emit("sharedWord", { n: n });
      cul.sharedMax = n;
    }
    cul.shared = n;
    return n;
  };
  // learning bonus from shared words: +3% each, up to +60%
  WD.smarts = function (game) { return Math.min(0.6, ((game.culture && game.culture.shared) || 0) * 0.03); };

  function ready(c, w, game) {
    c.lessonT = c.lessonT || {};
    var t = c.lessonT[w];
    return t == null || game.time - t >= COOLDOWN;
  }
  function stamp(c, w, game) { c.lessonT = c.lessonT || {}; c.lessonT[w] = game.time; }
  function hearers(game, x, z, r) {
    return smols(game).filter(function (c) { return !c.asleep && SB.dist(c.x, c.z, x, z) < r; });
  }

  /* Teach `w` by pointing at `hit` (a world thing or a smol). Returns { ok, msg, learned: [...], tried: n }. */
  WD.teach = function (game, w, hit) {
    var b = WD.byWord[w], k = WD.kind(w);
    if (!b || !k) return { ok: false, msg: "they don't have that word" };
    if (!WD.unlocked(game, b)) return { ok: false, msg: "your smols aren't ready for that word yet" };
    var C = SB.Creature, out = { ok: false, learned: [], tried: 0, msg: "" };
    if (k === "noun") {
      if (!hit || hit.type === "creature" && w !== "smol" && w !== "grump" && w !== "bunny") { out.msg = "tap the thing itself"; return out; }
      var ref = hit.ref, noun = hit.type === "creature" ? (ref.species === "grump" ? "grump" : ref.species === "smol" ? "smol" : "critter") : ref.noun || (hit.type === "node" ? SB.NODES[ref.kind].noun : null);
      if (SB.NOUN_WORDS[SB.N[noun]] !== w) { out.msg = "that's not " + (/^[aeiou]/.test(w) ? "an " : "a ") + w + "!"; out.wrong = true; hearers(game, ref.x, ref.z, 10).forEach(function (c) { c.speech = { text: "?", t: 1, kind: "think" }; }); return out; }
      var about = { type: hit.type === "struct" ? "struct" : hit.type, id: ref.id, x: ref.x, z: ref.z };
      hearers(game, ref.x, ref.z, 11).forEach(function (c) {
        if (c === ref) return;
        out.tried++;
        if (!ready(c, w, game)) { c.speech = { text: "…", t: 0.8, kind: "think" }; return; }
        stamp(c, w, game);
        // attention matters: a smol that's looking at the thing learns a lot more
        c.attn = { type: about.type, id: about.id, noun: noun, x: about.x, z: about.z };
        if (C.lessonWord(c, w, game, 0.36)) out.learned.push(c);
      });
      out.ok = out.tried > 0;
      if (!out.tried) out.msg = "no smols close enough to see it";
      return out;
    }
    // verbs and feelings are taught to one smol
    if (!hit || hit.type !== "creature" || hit.ref.species !== "smol") { out.msg = "tap a smol to say it to"; return out; }
    var c = hit.ref;
    if (c.asleep) { out.msg = c.name + " is asleep"; return out; }
    out.tried = 1;
    if (!ready(c, w, game)) { out.msg = c.name + " needs a moment to think about it"; c.speech = { text: "…", t: 0.8, kind: "think" }; return out; }
    stamp(c, w, game);
    if (k === "drive") {
      var top = SB.Chem.top(c.chem);
      if (top.i !== lex(w).i || top.v < 0.35) { out.msg = c.name + " doesn't feel " + w + " right now"; out.wrong = true; c.speech = { text: "?", t: 1, kind: "think" }; return out; }
      out.ok = true;
      if (C.lessonWord(c, w, game, 0.4)) out.learned.push(c);
      return out;
    }
    // a verb: it hears the request; the lesson lands when it actually does it (see Creature: obey)
    C.hear(c, w, game, {});
    c.pendingWord = { w: w, t: game.time };
    out.ok = true; out.pending = true;
    return out;
  };

  /* Once a word is known, saying it is a call: everyone nearby who knows it responds. */
  WD.call = function (game, w, x, z) {
    var n = 0;
    hearers(game, x, z, 16).forEach(function (c) {
      if ((c.vocab[w] || 0) < 1) return;
      SB.Creature.hear(c, w, game, { call: true, x: x, z: z });
      n++;
    });
    return n;
  };
})();
