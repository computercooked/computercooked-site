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
    [1, "waking", "a hum. warmth. a light somewhere above. that's all there is, at first. you don't know your own name yet, but the little ones stop walking when they hear the hum."],
    [3, "the Lantern", "you are the Lantern. not a lamp: a ship. the ark's light, the voice that sang the sleepers through the dark. the ship is in pieces at the foot of the hill, but the light is still on. the light is you."],
    [5, "the sleepers", "smols are small because sleeping takes less room. the ark carried every one of them that was left, curled up in pods, dreaming. you promised to wake them when you found somewhere green."],
    [7, "why brains are smol", "the long sleep took nearly everything. they woke as blobs with room for one thought at a time. but each one raised in your light keeps a little more, and hands it on to its children. brains grow back."],
    [10, "the dark", "between the stars it's dark for a very long way, and things live in that dark that have never seen a morning. the old crew called them grumps, because that was the nicest word they had."],
    [12, "what grumps want", "grumps hate light. it hurts their eyes, and it shows them to each other. the ark was the brightest thing in the sky, so they came to put it out. they're still trying. to a grump, a campfire is a very small ark."],
    [15, "the old home", "there was a first home, with two suns and rivers the colour of tea. it's in the log, but the pictures are gone. the smols left it when the grumps came, and they've been looking for the next one ever since."],
    [18, "the night it broke", "the grumps caught the ark right above this island. you couldn't outrun them and you couldn't fight. so you did the last thing an ark can do: you let go of every pod at once, and hoped."],
    [21, "the pods", "an ark breaks into pods so that somebody makes it. each one holds sleepers and a little of your light to steer by. most came down hard, far apart. they're still out there, waiting for a knock."],
    [24, "Pip", "Pip was the last one tucked in and the first one thrown clear. Pip woke up alone in the grass before you'd even found your own voice, and went looking for breakfast anyway. keep an eye on Pip."],
    [27, "the island", "the island isn't on any chart. it has four seasons, soft ground and berries. the last line in the log before the crash reads: “green. finally.” you were trying to land here all along."],
    [30, "the beacon", "an ark can't be rebuilt out of sticks. a light can. the old crew drew up a spire, taller than any tree, to carry your light high enough that every lost pod could see it. the plan is still in the log."],
    [35, "names", "every ember is something a smol got back: a word for water, a friend's face, how fire works. each one comes back to you too. you are their memory, and they are yours."],
    [40, "the others", "on clear nights there are lights moving, far off in the sky. other arks. one of them has been slowing down. it's looking for something, and it can't see an island with no light on it."],
    [45, "hands", "you can't touch the island. a light has no hands. but you can lend yourself to a smol for a while and see through its eyes, and it remembers everything the two of you did. that's how you teach."],
    [50, "somewhere green", "the Lantern is whole. your light reaches the edge of the island and past it, and the grumps go back to the dark, where it doesn't hurt. this is the somewhere green. you kept your promise."]
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
    if (SB.Game.note) SB.Game.note(game, "🌅 the Lantern is whole. the grumps couldn't stand the light and went back to the dark.");
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
    on("built", function (d) { var g = cur(); if (g && d.st && g.tutorial && g.tutorial.night && g.tutorial.night.lit !== d.st.id) E.add(g, "built:" + d.st.kind, "a first " + ((SB.STRUCTS[d.st.kind] && SB.STRUCTS[d.st.kind].label) || d.st.kind)); });
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
