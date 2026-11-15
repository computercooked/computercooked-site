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

  var COOLDOWN = 4; // seconds before the same smol can take in the same word again (9 until 4.7: the bot found it slow)
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
  // how far the tribe is with a word, counting half-learned ones (for the word book's bars)
  WD.progress = function (game, w) {
    var all = smols(game), n = 0, k = 0;
    all.forEach(function (c) { if (c.stage === 0 && all.length > 3) return; n++; k += Math.min(1, c.vocab[w] || 0); });
    return n ? k / n : 0;
  };
  // the tribe's shared words (known by at least half): every one makes everybody a bit smarter
  WD.update = function (game) {
    WD.sync(game);
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
  // a friend nearby who already knows the word says it too: the lesson sticks half again as well
  WD.FRIEND_BONUS = 1.5;
  function friendKnows(game, c, w) {
    return smols(game).some(function (o) { return o !== c && !o.asleep && (o.vocab[w] || 0) >= 1 && SB.dist(o.x, o.z, c.x, c.z) < 6; });
  }
  WD.friendKnows = friendKnows;
  function gain(out, c, w, b) { var d = Math.min(1, c.vocab[w] || 0) - Math.min(1, b); if (d > 0.005) (out.gains || (out.gains = [])).push({ c: c, d: d, v: Math.min(1, c.vocab[w] || 0), friend: !!out._f }); }
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
        var b0 = c.vocab[w] || 0; out._f = friendKnows(game, c, w);
        if (C.lessonWord(c, w, game, 0.36 * (out._f ? WD.FRIEND_BONUS : 1))) out.learned.push(c);
        gain(out, c, w, b0);
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
      var b1 = c.vocab[w] || 0; out._f = friendKnows(game, c, w);
      if (C.lessonWord(c, w, game, 0.4 * (out._f ? WD.FRIEND_BONUS : 1))) out.learned.push(c);
      gain(out, c, w, b1);
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

  /* ---------------- 4.36: your own words, and typing to a smol ----------------
     You can give any word in the book a name of your own ("food" is "nom" on this island): smols answer to it,
     and say it when they learn the word. And you can type to them: every word they could know is heard by the
     smols in earshot, a smol's name speaks to that one, and "good" / "bad" are a lesson. Phones get the same
     through the words tab in a smol's bag. Saved in game.quests.brains3. */
  function st(game) { var q = game.quests || (game.quests = {}); var s = q.brains3 || (q.brains3 = {}); if (!s.words) s.words = {}; return s; }
  function clean(s) { return String(s || "").toLowerCase().replace(/[^a-zü']/g, "").slice(0, 10); }
  var applied = {}, appliedSig = null, tabbed = false;
  // the island's own words live in SB.SYNONYMS while that island is open (that is where a smol's ears look)
  WD.sync = function (game) {
    if (!tabbed && SB.Ext && SB.Ext.tab) { tabbed = true; SB.Ext.tab({ id: "words", label: function () { return "💬 words"; }, html: WD.html, wire: WD.wire }); }
    var ws = game && game.quests && game.quests.brains3 && game.quests.brains3.words, sig = ws ? JSON.stringify(ws) : "", k;
    if (sig === appliedSig) return;
    for (k in applied) if (SB.SYNONYMS[k] === applied[k]) delete SB.SYNONYMS[k];
    applied = {}; appliedSig = sig;
    for (k in ws || {}) if (WD.byWord[k] && ws[k] && !SB.LEXICON[ws[k]] && !SB.SYNONYMS[ws[k]]) { SB.SYNONYMS[ws[k]] = k; applied[ws[k]] = k; }
  };
  WD.mine = function (game, w) { var s = game && game.quests && game.quests.brains3; return (s && s.words && s.words[w]) || null; };
  WD.label = function (game, w) { return WD.mine(game, w) || w; };
  // name a word of the book yourself ("" takes your name off again)
  WD.setWord = function (game, w, mine) {
    if (!WD.byWord[w]) return { ok: false, msg: "that word isn't in the book" };
    var s = st(game), m = clean(mine), k;
    if (!m) { delete s.words[w]; WD.sync(game); return { ok: true, msg: "\"" + w + "\" is just \"" + w + "\" again" }; }
    if (m.length < 2) return { ok: false, msg: "a word needs two letters or more" };
    if (m === w) return { ok: false, msg: "that's already the word" };
    for (k in s.words) if (k !== w && s.words[k] === m) return { ok: false, msg: "\"" + m + "\" already means " + k };
    if (SB.LEXICON[m] || (SB.SYNONYMS[m] && SB.SYNONYMS[m] !== w)) return { ok: false, msg: "\"" + m + "\" already means something" };
    s.words[w] = m;
    WD.sync(game);
    return { ok: true, msg: "on this island, \"" + w + "\" is \"" + m + "\"" };
  };
  // type to the smols near (x, z). Returns { ok, words: [book words heard], heard: smols, to: the smol named, msg }
  WD.say = function (game, text, x, z) {
    WD.sync(game);
    var toks = String(text || "").toLowerCase().replace(/[^a-zü' ]/g, " ").split(/\s+/).filter(Boolean).slice(0, 8);
    var out = { ok: false, words: [], heard: 0, to: null, msg: "" }, C = SB.Creature, all = smols(game);
    if (!toks.length) { out.msg = "type a word"; return out; }
    toks.forEach(function (t) { all.forEach(function (c) { if (!out.to && c.name && c.name.toLowerCase() === t) out.to = c; }); });
    var me = SB.Possess && SB.Possess.active && SB.Possess.state ? SB.Possess.state().c : null;
    var hs = out.to ? [out.to] : hearers(game, x, z, 16).filter(function (c) { return c !== me; });
    hs.sort(function (a, b) { return SB.dist(a.x, a.z, x, z) - SB.dist(b.x, b.z, x, z); });
    out.heard = hs.length;
    if (!hs.length) { out.msg = "no smol close enough to hear"; return out; }
    toks.forEach(function (t) {
      if (out.to && t === out.to.name.toLowerCase()) { C.hear(out.to, t, game, {}); out.ok = true; return; }
      var w = SB.LEXICON[t] || t === "good" || t === "bad" ? t : SB.SYNONYMS[t];
      if (w === "good" || w === "bad") { C.hear(hs[0], w, game, {}); out.words.push(w); return; }
      if (!w || !SB.LEXICON[w]) return;
      out.words.push(w);
      hs.forEach(function (c) { C.hear(c, w, game, { call: true, x: x, z: z }); });
    });
    if (out.words.length) out.ok = true;
    if (!out.ok) { out.msg = "they don't know any of those words"; hs[0].speech = { text: "?", t: 1.2, kind: "think" }; }
    else out.msg = (out.to ? out.to.name : hs.length + (hs.length === 1 ? " smol" : " smols")) + " heard: " + (out.words.join(" ") || out.to.name.toLowerCase());
    return out;
  };
  // a smol that learns a word you named says your name for it
  if (SB.bus) SB.bus.on("learnWord", function (e) {
    var g = SB.Game && SB.Game.current, m = g && e && e.c && WD.mine(g, e.word);
    if (m) e.c.speech = { text: m + "!", t: 1.6, kind: "say" };
  });

  function esc(s) { return String(s).replace(/[&<>"']/g, function (m) { return "&#" + m.charCodeAt(0) + ";"; }); }
  WD.html = function (game) {
    var mine = st(game).words, named = Object.keys(mine).map(function (k) { return esc(k) + " = <b>" + esc(mine[k]) + "</b>"; });
    return "<div class='lbl'>say something to the smols near you</div><div class='row' style='display:flex;gap:4px'><input class='inp' data-wdin='say' maxlength='40' placeholder='come · food · a name · good' style='flex:1;min-width:0'><button class='btn go' data-wd='say'>say</button></div>"
      + "<div class='lbl'>your own word for one of theirs</div><div class='row' style='display:flex;gap:4px'><select class='inp' data-wdin='w'>"
      + BOOK.filter(function (b) { return WD.unlocked(game, b); }).map(function (b) { return "<option>" + b.w + "</option>"; }).join("")
      + "</select><input class='inp' data-wdin='mine' maxlength='10' placeholder='your word' style='flex:1;min-width:0'><button class='btn' data-wd='name'>name it</button></div>"
      + (named.length ? "<div class='lbl'>" + named.join(" · ") + "</div>" : "");
  };
  WD.wire = function (root, game, c, redraw, say) {
    function val(k) { var e = root.querySelector("[data-wdin='" + k + "']"); return e ? e.value : ""; }
    root.querySelectorAll("[data-wd]").forEach(function (b) {
      b.addEventListener("click", function () {
        var r = b.getAttribute("data-wd") === "say" ? WD.say(game, val("say"), c.x, c.z) : WD.setWord(game, val("w"), val("mine"));
        if (r.msg && say) say(r.msg);
        redraw();
      });
    });
  };
})();
