/* smol brains 2 — society.js
   Tribes, homes, villages and the culture census. A tribe's home drifts toward its campfires and huts.
   Three huts around a campfire make a village (named in the smols' tongue). When the last smol who knows
   an idea dies and no story pole holds it, the idea is lost, and a dark age begins. */
(function () {
  "use strict";
  var SB = window.SB;
  var So = (SB.Society = {});
  var COLORS = ["#c5ff49", "#b59aff", "#ff9f43", "#6fd3ff", "#ff7eb6", "#ffd166"];

  So.init = function (game) {
    if (!game.tribes || !game.tribes.length) {
      var sp = game.world.T.spawn;
      game.tribes = [{ id: 0, name: null, home: { x: sp.x, z: sp.z }, color: COLORS[0], founded: null, villages: 0 }];
    }
    game.villages = game.villages || [];
    game.culture = game.culture || {};
    var cu = game.culture;
    cu.words = cu.words || {}; cu.found = cu.found || {}; cu.lost = cu.lost || {}; cu.alive = cu.alive || {}; cu.lostCount = cu.lostCount || 0;
    for (var k in cu.words) SB.Lang.addWord(cu.words[k], { type: "idea", id: k });
  };

  So.home = function (game, id) {
    var t = game.tribes && game.tribes[id || 0];
    return t ? t.home : game.world.T.spawn;
  };
  So.tribe = function (game, id) { return game.tribes && game.tribes[id || 0]; };

  var acc = 0;
  So.tick = function (game, dt) {
    acc += dt;
    if (acc < 4) return;
    acc = 0;
    So.init(game);
    var w = game.world;
    game.tribes.forEach(function (t) {
      // name the tribe once its smols can talk about themselves
      if (!t.name) {
        var talkers = game.creatures.filter(function (c) { return c.alive && c.species === "smol" && c.tribe === t.id && c.tier >= 3; });
        if (talkers.length) {
          var r = SB.rng((game.seed + t.id * 77) >>> 0);
          t.name = "the " + SB.Lang.fresh(game.lang, r, 2) + " tribe";
          t.founded = game.time;
          SB.bus.emit("tribe", { tribe: t });
          SB.Game.note(game, "your smols have started calling themselves " + t.name + " 🔥");
        }
      }
      // home: centre of the campfires (else huts), else the nest
      var fires = w.structures.filter(function (s) { return s.tribe === t.id && s.done && s.kind === "campfire"; });
      var anchor = fires.length ? fires : w.structures.filter(function (s) { return s.tribe === t.id && s.done && s.kind === "hut"; });
      if (anchor.length) {
        var x = 0, z = 0;
        anchor.forEach(function (s) { x += s.x; z += s.z; });
        t.home.x += (x / anchor.length - t.home.x) * 0.5; t.home.z += (z / anchor.length - t.home.z) * 0.5;
      }
    });
    // villages: a lit campfire with 3+ huts around it
    w.structures.forEach(function (f) {
      if (f.kind !== "campfire" || !f.done || f.village) return;
      var huts = w.structures.filter(function (s) { return s.kind === "hut" && s.done && SB.dist(s.x, s.z, f.x, f.z) < 14; });
      if (huts.length < 3) return;
      if (game.villages.some(function (v) { return SB.dist(v.x, v.z, f.x, f.z) < 20; })) { f.village = true; return; }
      var r = SB.rng((game.seed + game.villages.length * 991) >>> 0);
      var name = SB.Lang.fresh(game.lang, r, 2);
      name = name + ["ville", "ton", "holm", "by", "ham", "wick", ""][r.int(7)];
      var v = { id: game.villages.length, name: SB.Lang.cap(name), x: f.x, z: f.z, tribe: f.tribe, founded: game.time };
      game.villages.push(v);
      f.village = true;
      SB.bus.emit("village", { village: v });
      SB.Game.note(game, "a village is born: " + v.name + " 🏘");
    });
    census(game);
  };

  function census(game) {
    if (!SB.Ideas) return;
    var cu = game.culture, cs = SB.Ideas.census(game), writing = false;
    for (var id in cs.counts) {
      var n = cs.counts[id] + (cs.poles[id] ? 1 : 0);
      if ((cu.alive[id] || 0) > 0 && n === 0) {
        cu.lost[id] = game.time; cu.lostCount++;
        SB.bus.emit("ideaLost", { id: id });
        SB.Game.note(game, "nobody remembers " + SB.Ideas.BY_ID[id].name + " " + SB.Ideas.BY_ID[id].icon + " anymore. it's lost. (story poles keep ideas safe)");
      }
      if (n > 0 && cu.lost[id]) cu.lost[id] = 0;
      cu.alive[id] = n;
      if (id === "writing" && n > 0) writing = true;
    }
    cu.writing = writing;
  }

  So.knownIdeas = function (game) {
    var cu = game.culture, n = 0;
    for (var k in cu.alive) if (cu.alive[k] > 0) n++;
    return n;
  };
})();
