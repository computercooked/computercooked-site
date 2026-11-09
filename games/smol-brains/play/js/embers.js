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
  // the lore journal (4.14): every few embers a page of what the smols forgot comes back. [embers, title, text]
  E.LORE = [
    [1, "a tune", "warmth. a light on a hill, and somebody humming. that's all, for now. nobody knows whose voice it was, but every smol stops walking when it hears the tune."],
    [3, "the hill", "the Lantern's hill isn't a hill. it's a knuckle. the giant sleeps curled up, and the smols live in the hollow of one great hand. that's how the Hollow got its name."],
    [5, "who lit it", "the first Lantern was lit by a smol called Oru, who was afraid of forgetting her children's names. she said every name she knew into the flame, and the flame kept them."],
    [7, "why brains are smol", "a smol's memory isn't kept in its head. it's kept in the light. the brighter the Lantern, the more a smol can hold. when it dims they forget the way home, then the words, then each other."],
    [10, "the long dark", "once the Lantern nearly went out for a whole winter. the smols who lived through it called it the long dark. the ones who wandered off into it came back different, and angry."],
    [12, "what grumps are", "grumps aren't monsters. a grump is a smol who forgot everything, even its own name, and only remembers that the light means something it lost. so it hunts the light, to get it back. it never works."],
    [15, "the sky ships", "smols didn't always live on one giant. long ago they sailed between sleeping giants in arks of woven reed and glowshroom, carrying a little flame from each Lantern to the next."],
    [18, "the warship", "the grump warship that caught Pip's ark wasn't built by grumps. it was an ark once. its crew forgot, one by one, until it was a ship full of grumps steering toward the light of other ships."],
    [21, "the pods", "when an ark is caught it breaks into pods, so that somebody makes it. every pod carries an egg and a spark. most of the sparks go out on the way down. you didn't."],
    [24, "Pip", "Pip hatched the night the Lantern guttered, which is why Pip is so small and remembers so little. Pip has carried a berry up the hill every evening since. nobody asked Pip to."],
    [27, "the giant's dreams", "the Hollow dreams. when it dreams of rain, it rains. when it dreams of winter, the snow comes. the seasons on its back are the seasons in its sleep."],
    [30, "the spire", "the old stories say a people bright enough could raise a spire tall enough to reach the giant's ear and whisper the big thought into it. nobody remembers what the big thought was. that's the point."],
    [35, "names", "every ember is a name coming back: a word for water, a friend's face, the way to the berry bushes. the grumps out in the dark are full of names too. lost, not gone. light is how you find them."],
    [40, "the other lights", "on clear nights the smols can see other lights far off in the sky: other Lanterns on other giants. some burn bright. some flicker. one went out while they were watching."],
    [45, "why the Hollow sleeps", "the Hollow fell asleep to keep the smols safe. a giant awake walks, and nothing can live on a walking giant. it has been waiting for its passengers to remember enough to hold on."],
    [50, "the waking", "the Lantern is whole. the Hollow stirs, and every grump on its back stops, looks up at the light and remembers its own name. some of them cry. then they go home."]
  ];
  E.pages = function (game) { var n = E.count(game); return E.LORE.filter(function (p) { return n >= p[0]; }); };
  E.nextPage = function (game) { var n = E.count(game); for (var i = 0; i < E.LORE.length; i++) if (E.LORE[i][0] > n) return E.LORE[i]; return null; };
  // one ember. key: the same memory only counts once
  E.add = function (game, key, why, c) {
    var l = L(game);
    if (!l) return false;
    if (key && l.got[key]) return false;
    if (key) l.got[key] = 1;
    l.embers++;
    l.log.push({ t: Math.round(game.time), why: why }); if (l.log.length > 60) l.log.shift();
    SB.bus.emit("ember", { why: why, c: c || null, n: l.embers, next: E.next(game) });
    for (var pi = 0; pi < E.LORE.length; pi++) if (E.LORE[pi][0] === l.embers) SB.bus.emit("lorePage", { page: E.LORE[pi], i: pi }); // a page of the journal comes back
    if (c && SB.FX && !game.headless && !game.offline) SB.FX.burst("sparkle", c.x, (c.y || 0) + 0.8, c.z, 14);
    var need = E.next(game);
    if (need != null && l.embers >= need) {
      l.stage++;
      if (l.stage >= E.STAGES.length) E.wake(game);
      if (SB.Game.addSparks) SB.Game.addSparks(game, 10 * l.stage);
      SB.bus.emit("lantern", { stage: l.stage, embers: l.embers });
      var st = l.stage;
      film(game, st >= E.STAGES.length ? "wake" : "stage" + st, { done: function () { SB.bus.emit("lanternShown", { stage: st }); } });
    }
    return true;
  };
  // the finale: every grump on the island remembers its name and goes home, and there are no more grump nights
  E.wake = function (game) {
    var l = L(game); if (!l || l.woke) return false;
    l.woke = true;
    game.creatures.forEach(function (c) { if (c.species === "grump" && c.alive) { c.goingHome = true; if (c.scout) c.scout.done = true; if (SB.FX && !game.headless && !game.offline) SB.FX.burst("sparkle", c.x, (c.y || 0) + 0.8, c.z, 30); } });
    if (SB.Game.note) SB.Game.note(game, "🌅 the Hollow wakes. the grumps remembered their names and went home.");
    return true;
  };
  E.woke = function (game) { return !!(game && game.lantern && game.lantern.woke); };
  function film(game, id, opts) { if (SB.Lantern && SB.Lantern.moment) SB.Lantern.moment(game, id, opts); }
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
      var par = (d.obj && d.obj.data && d.obj.data.parents) || [], pip = g.tutorial && g.tutorial.night && g.tutorial.night.pip;
      if (pip != null && par.indexOf(pip) >= 0) { film(g, "growup"); if (g.lantern.films) g.lantern.films.baby = 1; } // Pip's own little one: Pip grows up
      else film(g, "baby");
    });
    // a smol that dies alone in the dark, far from any fire, while the Lantern is still low: its light goes out and
    // it gets up a grump (the first time on an island, with a film)
    on("death", function (d) {
      var g = cur(), c = d.c, l = L(g);
      if (!g || !c || c.species !== "smol" || c._pov || d.cause === "old" || d.cause === "drowned" || !g.world.night || l.woke || l.turned || E.stage(g) >= 3) return;
      if (SB.World.nearestFire && SB.World.nearestFire(g.world, c.x, c.z, 8)) return;
      l.turned = c.name;
      var gr = SB.Game.spawnGrump(g, c.x, c.z); if (gr) { gr.name = "grump (was " + c.name + ")"; gr.wasSmol = c.name; }
      if (SB.Game.note) SB.Game.note(g, "👹 " + c.name + "'s light went out, alone in the dark. a grump got up where it fell.");
      film(g, "grump");
    });
    on("ideaLearned", function (d) { var g = cur(); if (g && smol(d.c)) E.add(g, "idea:" + d.id, "a discovery: " + ((SB.Ideas && SB.Ideas.BY_ID[d.id] && SB.Ideas.BY_ID[d.id].name) || d.id), d.c); });
    on("built", function (d) { var g = cur(); if (g && d.st && g.tutorial && g.tutorial.night && g.tutorial.night.lit !== d.st.id) E.add(g, "built:" + d.st.kind, "a first " + d.st.kind); });
    on("partners", function (d) {
      var g = cur(), l = L(g); if (!g) return;
      var n = Object.keys(l.got).filter(function (k) { return k.indexOf("pair:") === 0; }).length;
      if (n < 3 && d.a && d.b) E.add(g, "pair:" + Math.min(d.a.id, d.b.id) + "-" + Math.max(d.a.id, d.b.id), d.a.name + " and " + d.b.name + " found each other", d.a);
    });
    on("grow", function (d) { var g = cur(); if (g && d.c && g.tutorial && g.tutorial.night && d.c.id === g.tutorial.night.pip && d.c.stage >= 4) film(g, "growup"); });
    on("povBlobQuestDone", function () { var g = cur(); if (g) E.add(g, "quest:blob", "a small body's day, lived"); });
    on("povQuestDone", function () { var g = cur(); if (g) E.add(g, "quest:tool", "a first tool, made by your light"); });
  };
  E.hook();
})();
