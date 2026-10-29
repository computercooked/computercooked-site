// smol brains — memory embers and the Lantern (K-0041 P4, "The Last Lantern"). Every memory the smols win back
// (surviving a night, a first word, a first trick, a new baby, a discovery, a first building, a new couple) is an
// ember, and embers relight the Lantern a stage at a time. each stage plays a film, makes the nights less dark and
// gives sparks. stage 1 is reachable in about 15 minutes; 2, 3 and the finale come later.
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var E = SB.Embers = {};
  E.STAGES = [5, 15, 30, 50]; // embers for stage 1, 2, 3 and the finale
  E.NIGHT_LIGHT = 0.12;       // each stage takes this much off the night's darkness

  function L(game) {
    if (!game) return null;
    if (!game.lantern) game.lantern = { embers: 0, stage: 0, got: {}, log: [] };
    return game.lantern;
  }
  E.state = L;
  E.count = function (game) { var l = L(game); return l ? l.embers : 0; };
  E.stage = function (game) { var l = game && game.lantern; return l ? l.stage : 0; };
  E.nightLight = function (game) { return Math.min(0.5, E.stage(game) * E.NIGHT_LIGHT); };
  E.next = function (game) { var l = L(game); return l && l.stage < E.STAGES.length ? E.STAGES[l.stage] : null; };
  // one ember. key: the same memory only counts once
  E.add = function (game, key, why, c) {
    var l = L(game);
    if (!l) return false;
    if (key && l.got[key]) return false;
    if (key) l.got[key] = 1;
    l.embers++;
    l.log.push({ t: Math.round(game.time), why: why }); if (l.log.length > 60) l.log.shift();
    SB.bus.emit("ember", { why: why, c: c || null, n: l.embers, next: E.next(game) });
    if (c && SB.FX && !game.headless && !game.offline) SB.FX.burst("sparkle", c.x, (c.y || 0) + 0.8, c.z, 14);
    var need = E.next(game);
    if (need != null && l.embers >= need) { l.stage++; SB.bus.emit("lantern", { stage: l.stage, embers: l.embers }); }
    return true;
  };
  function cur() { return SB.Game && SB.Game.current; }
  function smol(c) { return c && c.species === "smol" && c.alive; }
  var hooked = false;
  E.hook = function () {
    if (hooked || !SB.bus) return; hooked = true;
    var on = SB.bus.on;
    on("dawn", function () {
      var g = cur(); if (!g) return;
      if (!SB.Game.smols(g).length) return;
      var day = g.world ? g.world.dayIndex : 0;
      E.add(g, "dawn:" + day, "the smols made it through the night");
    });
    on("learnWord", function (d) {
      var g = cur(), l = L(g); if (!g || !smol(d.c)) return;
      var n = Object.keys(l.got).filter(function (k) { return k.indexOf("word:") === 0; }).length;
      if (n < 3) E.add(g, "word:" + d.word, "a word remembered: “" + d.word + "”", d.c);
    });
    on("trickLearned", function (d) {
      var g = cur(), l = L(g); if (!g || !smol(d.c)) return;
      var n = Object.keys(l.got).filter(function (k) { return k.indexOf("trick:") === 0; }).length;
      if (n < 3) E.add(g, "trick:" + (d.trick && d.trick.id || d.trick), d.c.name + " remembered a trick", d.c);
    });
    on("tickle", function (d) {
      var g = cur(); if (!g || !smol(d.c)) return;
      E.add(g, "tickle", "what felt good, remembered", d.c);
    });
    on("hatch", function (d) {
      var g = cur(), l = L(g); if (!g || !d.c || (d.obj && d.obj.data && d.obj.data.starter)) return;
      var n = Object.keys(l.got).filter(function (k) { return k.indexOf("baby:") === 0; }).length;
      if (n < 5) E.add(g, "baby:" + d.c.id, "a new smol: " + d.c.name, d.c);
    });
    on("ideaLearned", function (d) { var g = cur(); if (g && smol(d.c)) E.add(g, "idea:" + d.id, "a discovery: " + ((SB.Ideas && SB.Ideas.BY_ID[d.id] && SB.Ideas.BY_ID[d.id].name) || d.id), d.c); });
    on("built", function (d) { var g = cur(); if (g && d.st && g.tutorial && g.tutorial.night && g.tutorial.night.lit !== d.st.id) E.add(g, "built:" + d.st.kind, "a first " + d.st.kind); });
    on("partners", function (d) {
      var g = cur(), l = L(g); if (!g) return;
      var n = Object.keys(l.got).filter(function (k) { return k.indexOf("pair:") === 0; }).length;
      if (n < 3 && d.a && d.b) E.add(g, "pair:" + Math.min(d.a.id, d.b.id) + "-" + Math.max(d.a.id, d.b.id), d.a.name + " and " + d.b.name + " found each other", d.a);
    });
    on("povBlobQuestDone", function () { var g = cur(); if (g) E.add(g, "quest:blob", "a small body's day, lived"); });
    on("povQuestDone", function () { var g = cur(); if (g) E.add(g, "quest:tool", "a first tool, made by your light"); });
  };
  E.hook();
})();
