/* smol brains — quests.js
   The quest board: short, concrete jobs in chapters, so there's always something to do next and a reward
   for doing it. Each quest reads the game (or a counter fed by the bus) for [have, need]; it completes by
   itself, pays sparks, and when a chapter's quests are all done the next chapter opens with a bonus.
   Data-driven (Q.CHAPTERS) and pure sim: ui.js draws it, the tests run it headless. */
(function () {
  "use strict";
  var SB = window.SB;
  var Q = (SB.Quests = {});

  function smols(g) { return SB.Game.smols(g); }
  function maxTier(g) { var m = 0; smols(g).forEach(function (c) { if (c.tier > m) m = c.tier; }); return Math.max(m, g.stats.maxTier || 0); }
  function n(g, k) { return (g.quests && g.quests.n && g.quests.n[k]) || 0; }
  function A(g, k) { return g.achievements && g.achievements[k] ? 1 : 0; }
  function tricks() { return SB.Tricks; }

  // how: the hint under the quest. go: what "show me" does (ui.js knows the names).
  Q.CHAPTERS = [
    { id: "sparks", name: "first sparks", bonus: 5, quests: [
      { id: "trick1", icon: "🎓", t: "teach a smol its first trick", pay: 3, go: "tricks",
        how: "tap a smol → 🎓 tricks. pick one, press “set it up”, then tickle or tap at the right moment.", get: function (g) { return [Math.min(1, g.stats.tricks || 0), 1]; } },
      { id: "word1", icon: "💬", t: "teach a first word", pay: 2, go: "talk",
        how: "💬 talk, pick “food”, then tap food while a smol is looking at it.", get: function (g) { return [A(g, "word1"), 1]; } },
      { id: "possess", icon: "👁", t: "see the island through a smol's eyes", pay: 2, go: "possess",
        how: "tap a smol → 👁 possess. the first time is free. wasd or the thumbstick to walk.", get: function (g) { return [Math.min(1, n(g, "possess")), 1]; } },
      { id: "poveat", icon: "😋", t: "eat something while possessing a smol", pay: 2, go: "possess",
        how: "possess a smol, look at food and right click (or the action button). what you do, it learns.", get: function (g) { return [Math.min(1, n(g, "povEat")), 1]; } }
    ] },
    { id: "grow", name: "growing up", bonus: 6, quests: [
      { id: "tricks3", icon: "🎓", t: "your smols know 3 different tricks", pay: 4, go: "tricks",
        how: "each smol learns on its own. try “come when called” and “leave red shrooms alone”.", get: function (g) { return [Math.min(3, tricks() ? tricks().colony(g).kinds : 0), 3]; } },
      { id: "explore2", icon: "🧭", t: "find 2 new places", pay: 3,
        how: "smols clear the cloud as they wander. possess one and walk into the fog, or teach it “explore”.", get: function (g) { return [Math.min(2, n(g, "biomes")), 2]; } },
      { id: "wish2", icon: "⭐", t: "grant 2 wishes", pay: 3,
        how: "little smols wish for things (the ⭐ bubble). do what it asks with ✋ grab.", get: function (g) { return [Math.min(2, g.stats.wishes || 0), 2]; } },
      { id: "egg1", icon: "🥚", t: "a new smol hatches", pay: 4,
        how: "grown-ups who are fed, rested and happy fall in love. a wild egg may turn up too.", get: function (g) { return [Math.min(1, Math.max(0, (g.stats.hatched || 0) - 2)), 1]; } }
    ] },
    { id: "family", name: "a family", bonus: 8, quests: [
      { id: "smart5", icon: "🧠", t: "one smol knows 5 tricks", pay: 5, go: "tricks",
        how: "pick your cleverest smol and keep training it. watch the meters: lessons can undo each other.", get: function (g) { return [Math.min(5, tricks() ? tricks().best(g) : 0), 5]; } },
      { id: "critter", icon: "🦎", t: "evolve into critters", pay: 5,
        how: "kids inherit a mix of their parents plus what the parents practised (the +🤲 pips).", get: function (g) { return [maxTier(g) >= 1 ? 1 : 0, 1]; } },
      { id: "prayer1", icon: "🙏", t: "answer a prayer with the right miracle", pay: 4,
        how: "when a smol prays (🙏 at the top), ✨ magic has the miracle it needs.", get: function (g) { return [Math.min(1, g.stats.prayersAnswered || 0), 1]; } },
      { id: "gen3", icon: "🌳", t: "a grandchild hatches", pay: 5,
        how: "generation 3: the kids of your first kids.", get: function (g) { return [(g.stats.maxGen || 1) >= 3 ? 1 : 0, 1]; } }
    ] },
    { id: "hands", name: "hands", bonus: 10, quests: [
      { id: "tooluser", icon: "🤲", t: "evolve into tool-users", pay: 6,
        how: "smols that carry things a lot have kids with hands.", get: function (g) { return [maxTier(g) >= 2 ? 1 : 0, 1]; } },
      { id: "idea1", icon: "💡", t: "a smol invents an idea", pay: 5,
        how: "tool-users invent by fiddling with things. ✋ hand them sticks and stones, or ✨ magic → 💡 inspire.", get: function (g) { return [Math.min(1, Object.keys(g.culture.found).length), 1]; } },
      { id: "stranger", icon: "🧳", t: "welcome a stranger", pay: 4,
        how: "survivors from other pods walk up to the village. say yes.", get: function (g) { return [A(g, "stranger"), 1]; } },
      { id: "povtool", icon: "🪓", t: "possess a tool-user and make a tool", pay: 6, go: "possess",
        how: "possess a smol with hands. the first-time guide walks you from a stick to a campfire.", get: function (g) { return [Math.min(1, n(g, "povTool")), 1]; } }
    ] },
    { id: "builders", name: "builders", bonus: 12, quests: [
      { id: "tribe", icon: "🔥", t: "become a tribe", pay: 6,
        how: "tribe smols talk, pray and pass ideas on.", get: function (g) { return [maxTier(g) >= 3 ? 1 : 0, 1]; } },
      { id: "builder", icon: "🛖", t: "evolve into builders", pay: 8,
        how: "builders need planning: teach them, and let them work things out.", get: function (g) { return [maxTier(g) >= 4 ? 1 : 0, 1]; } },
      { id: "built", icon: "🏗", t: "finish a building", pay: 6,
        how: "builders build when they need something. 🚩 orders → blueprints asks for one.", get: function (g) { return [A(g, "built"), 1]; } },
      { id: "village", icon: "🏘", t: "found a village", pay: 8,
        how: "huts around a campfire.", get: function (g) { return [A(g, "village"), 1]; } }
    ] },
    { id: "thought", name: "the big thought", bonus: 20, quests: [
      { id: "thinker", icon: "🤓", t: "evolve into thinkers", pay: 8, get: function (g) { return [maxTier(g) >= 5 ? 1 : 0, 1]; }, how: "big brains: lots of teaching, writing and story poles." },
      { id: "ascended", icon: "🌟", t: "evolve into the ascended", pay: 10, get: function (g) { return [maxTier(g) >= 6 ? 1 : 0, 1]; }, how: "the last step. bless eggs toward 🌟 glow." },
      { id: "spire", icon: "✨", t: "raise the spire", pay: 20, get: function (g) { return [A(g, "bigthought"), 1]; }, how: "follow the steps in the next list." }
    ] }
  ];
  Q.BY = {};
  Q.CHAPTERS.forEach(function (ch, i) { ch.i = i; ch.quests.forEach(function (q) { q.ch = i; Q.BY[q.id] = q; }); });

  function st(g) { var s = g.quests || (g.quests = { ch: 0, done: {}, n: {} }); s.done = s.done || {}; s.n = s.n || {}; return s; }
  Q.state = st;
  Q.chapter = function (g) { var s = st(g); return Q.CHAPTERS[s.ch] || null; };
  Q.progress = function (g, q) { try { var r = q.get(g); return { have: r[0], need: r[1], frac: SB.clamp01(r[0] / r[1]) }; } catch (e) { return { have: 0, need: 1, frac: 0 }; } };
  // the open chapter's quests with their progress, for the board
  Q.board = function (g) {
    var s = st(g), ch = Q.CHAPTERS[s.ch];
    if (!ch) return null;
    return { ch: ch, n: s.ch + 1, of: Q.CHAPTERS.length, quests: ch.quests.map(function (q) { var p = Q.progress(g, q); return { q: q, done: !!s.done[q.id], have: p.have, need: p.need, frac: s.done[q.id] ? 1 : p.frac }; }) };
  };
  Q.count = function (g, k, by) { var s = st(g); s.n[k] = (s.n[k] || 0) + (by == null ? 1 : by); };

  var t = 0;
  Q.tick = function (g, dt) {
    if (g.showcase) return;
    t -= dt;
    if (t > 0) return;
    t = 1;
    var s = st(g), ch = Q.CHAPTERS[s.ch];
    if (!ch || (g.tutorial && !g.tutorial.done)) return;
    var all = true;
    ch.quests.forEach(function (q) {
      if (s.done[q.id]) return;
      var p = Q.progress(g, q);
      if (p.frac >= 1) {
        s.done[q.id] = Math.round(g.time);
        SB.Game.addSparks(g, q.pay, null);
        SB.bus.emit("questDone", { q: q, ch: ch });
      } else all = false;
    });
    if (all) {
      s.ch++;
      SB.Game.addSparks(g, ch.bonus, null);
      SB.bus.emit("chapterDone", { ch: ch, next: Q.CHAPTERS[s.ch] || null });
    }
  };

  // counters the game doesn't already keep
  function cur() { return SB.Game.current; }
  SB.bus.on("possess", function () { var g = cur(); if (g) Q.count(g, "possess"); });
  SB.bus.on("eat", function (d) { var g = cur(); if (g && d && d.c && d.c._pov) Q.count(g, "povEat"); }); // nibbling a bush, drinking
  SB.bus.on("povEat", function () { var g = cur(); if (g) Q.count(g, "povEat"); });                        // eating from the ground or the bag
  SB.bus.on("newBiome", function () { var g = cur(); if (g && !g.offline) Q.count(g, "biomes"); });
  SB.bus.on("povQuestDone", function () { var g = cur(); if (g) Q.count(g, "povTool"); });
  SB.bus.on("povGain", function (d) { var g = cur(); if (g && d && /tool|axe|pick|spear|club/.test(d.kind || "")) Q.count(g, "povTool"); });
})();
