// smol brains — places to find. The island hides the wrecks of other escape pods (loot, and the ark's
// logs that tell the story), old ruins carved with ideas, crystal caves, giant nests, and grump camps
// holding captured smols. All under the fog until a smol walks close enough to see.
// Positions come from the world seed, so only what's been found and cleared is saved.
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var S = SB.Sites = {};

  S.KINDS = {
    wreck: { icon: "🛸", name: "pod wreck", n: 4, dist: [22, 95] },
    ruin: { icon: "🗿", name: "old ruins", n: 3, dist: [30, 110] },
    cave: { icon: "💎", name: "crystal cave", n: 2, dist: [40, 120] },
    nest: { icon: "🪺", name: "giant nest", n: 2, dist: [25, 90] },
    camp: { icon: "⛺", name: "grump camp", n: 2, dist: [55, 130] }
  };
  // the ark's logs, found one by one in the wrecks: the story of how the smols got here, and how they get home
  S.LOGS = [
    "ark log, day 1: four thousand smols asleep in the pods. the new world is three hundred years away. sweet dreams, everyone.",
    "ark log, day 211: a grump warship is following us. they want the thought engine. grumps think brains are a waste of food.",
    "ark log, day 212: they caught us. pods away! scatter! whoever lands, remember: you were clever once.",
    "pod 7 log: crashed in a swamp. three of us made it out. we're already forgetting words. ba... bana... the yellow thing.",
    "pod 12 log: the island is changing us. our kids are simpler. smaller brains. they'll have to grow them back, one generation at a time.",
    "pod 2 log: the old ones say that if enough smols think hard enough, all at once, the ark's engine will hear them.",
    "captain's log, last entry: the big thought isn't a building. it's a signal. build it, and the ark will know where you are. come home."
  ];

  function rng(seed) { return SB.rng((seed * 7919 + 1337) >>> 0); }
  S.generate = function (game) {
    var w = game.world, T = w.T, r = rng(game.seed), out = [], id = 0, sp = T.spawn;
    Object.keys(S.KINDS).forEach(function (k) {
      var def = S.KINDS[k];
      for (var i = 0; i < def.n; i++) {
        for (var tries = 0; tries < 60; tries++) {
          var a = r() * 6.283, d = def.dist[0] + r() * (def.dist[1] - def.dist[0]);
          var x = sp.x + Math.sin(a) * d, z = sp.z + Math.cos(a) * d;
          if (!SB.World.inBounds(w, x, z) || !SB.World.walkable(w, x, z, false) || SB.World.depthAt(w, x, z) > 0.05) continue;
          if (out.some(function (o) { return SB.dist(o.x, o.z, x, z) < 18; })) continue;
          out.push({ id: id++, kind: k, x: x, z: z, rot: r() * 6.283, found: false, done: false });
          break;
        }
      }
    });
    game.sites = out;
    return out;
  };
  S.serialize = function (game) { return (game.sites || []).filter(function (s) { return s.found || s.done; }).map(function (s) { return [s.id, s.found ? 1 : 0, s.done ? 1 : 0, s.log == null ? -1 : s.log]; }); };
  S.revive = function (game, data) {
    if (!game.sites) S.generate(game);
    (Array.isArray(data) ? data : []).forEach(function (p) { var s = game.sites[p[0]]; if (s) { s.found = !!p[1]; s.done = !!p[2]; if (p[3] >= 0) s.log = p[3]; } });
  };
  S.near = function (game, x, z, r) { return (game.sites || []).filter(function (s) { return SB.dist(s.x, s.z, x, z) < r; }); };
  function mark(s) { if (SB.Render && SB.Render.markDirty) SB.Render.markDirty(s.x, s.z); }
  function chron(game, icon, t) { if (SB.Social) SB.Social.chronicle(game, icon, t); }
  function diary(game, c, icon, t) { if (SB.Social) SB.Social.log(game, c, icon, t); }

  // a smol walks close enough to see it: find it
  var acc = 0;
  S.tick = function (game, dt) {
    acc += dt;
    if (acc < 1) return;
    acc = 0;
    if (!game.sites) S.generate(game);
    var sm = game.creatures.filter(function (c) { return c.alive && c.species === "smol" && !c.stranger && !c.asleep; });
    game.sites.forEach(function (s) {
      if (s.found) return;
      for (var i = 0; i < sm.length; i++) if (SB.dist(sm[i].x, sm[i].z, s.x, s.z) < 6) { S.find(game, s, sm[i]); return; }
    });
    // a camp that's been found but not dealt with waits for the storyteller to be free
    if (SB.Director) { var d = SB.Director.state(game); if (!d.active && game.sites.some(function (s) { return s.kind === "camp" && s.found && !s.done && !s.asked; })) SB.Director.fire(game, "camp"); }
  };

  S.find = function (game, s, c) {
    s.found = true;
    mark(s);
    SB.World.reveal(game.world, s.x, s.z, 8);
    var w = game.world, r = game.rng, out = { site: s, c: c, icon: S.KINDS[s.kind].icon, title: "", text: [] };
    c.visited = c.visited || {}; c.visited["site" + s.id] = 1;
    if (SB.Social) SB.Social.checkTitle(game, c);
    switch (s.kind) {
      case "wreck": {
        s.done = true;
        var loot = ["stick", "stone", "fiber", "stone", "flint", "fiber", "stick"];
        for (var i = 0; i < 5; i++) { var a = r() * 6.28, d = 1 + r() * 1.5; SB.World.add(w, game, r.pick(loot), s.x + Math.sin(a) * d, s.z + Math.cos(a) * d, {}); }
        var n = (game.logsFound || 0);
        out.title = "another escape pod!";
        out.text.push(c.name + " found the wreck of another escape pod, half buried. there's useful stuff scattered around it.");
        if (n < S.LOGS.length) { s.log = n; game.logsFound = n + 1; out.log = S.LOGS[n]; out.text.push("inside, a little screen still flickers (" + (n + 1) + " of " + S.LOGS.length + "):"); }
        SB.Game.addSparks(game, 5);
        chron(game, "🛸", c.name + " found a crashed escape pod" + (out.log ? " with a log inside" : ""));
        diary(game, c, "🛸", "found a crashed escape pod");
        break;
      }
      case "ruin": {
        s.done = true;
        var known = game.culture.found, can = SB.Ideas.LIST.filter(function (d) { return !known[d.id] && SB.Ideas.canHold(c, d.id); });
        out.title = "old ruins";
        out.text.push(c.name + " found stones carved by smols who lived here long ago.");
        if (can.length) {
          var idea = r.pick(can);
          SB.Ideas.discover(c, idea.id, game);
          out.text.push("the carvings show how to make " + idea.icon + " " + idea.name + "! " + c.name + " gets it right away.");
          chron(game, "🗿", c.name + " learned " + idea.name + " from carvings in the old ruins");
        } else {
          SB.Game.addSparks(game, 8);
          SB.World.creaturesNear(w, game, s.x, s.z, 10, function (o) { if (o.species === "smol") o.inspired = 90; });
          out.text.push("the carvings are too strange to follow yet, but they get everyone thinking. (+8 ✨, inspired)");
          chron(game, "🗿", c.name + " found the old ruins");
        }
        diary(game, c, "🗿", "found the old ruins");
        break;
      }
      case "cave": {
        s.done = true;
        for (var j = 0; j < 4; j++) { var a2 = j * 1.57 + r() * 0.5, d2 = 1.5 + r() * 1.5; SB.World.addNode(w, game, "crystals", s.x + Math.sin(a2) * d2, s.z + Math.cos(a2) * d2, 0.8 + r() * 0.5); }
        out.title = "a crystal cave";
        out.text.push(c.name + " squeezed into a cave and found it glittering with thought crystals. they hum when a smol thinks near them.", "thinkers make lenses with them, and the biggest dream of all needs six.");
        SB.Game.addSparks(game, 6);
        chron(game, "💎", c.name + " found a cave full of thought crystals");
        diary(game, c, "💎", "found a crystal cave");
        break;
      }
      case "nest": {
        s.done = true;
        var best = game.creatures.filter(function (o) { return o.alive && o.species === "smol"; }).reduce(function (b, o) { return !b || o.tier > b.tier ? o : b; }, null);
        var g = best ? SB.Genome.forTier(r, Math.max(0, best.tier - 1)) : SB.Genome.random(r, { species: "smol" });
        g.gen = best ? best.gen : 1;
        SB.World.add(w, game, "egg", s.x, s.z, { genome: g, parents: [], gen: g.gen, progress: 0.4, wild: true });
        out.title = "a giant nest";
        out.text.push(c.name + " found an enormous nest with an egg still in it. nobody in your tribe is related to whatever's inside.", "carry it home and keep it warm.");
        chron(game, "🪺", c.name + " found an egg in a giant nest");
        diary(game, c, "🪺", "found an egg in a giant nest");
        break;
      }
      case "camp":
        out.title = "a grump camp!";
        out.text.push(c.name + " spotted a grump camp: spiky fences, a smoky fire, and smols in a cage.");
        chron(game, "⛺", c.name + " found a grump camp holding captured smols");
        diary(game, c, "⛺", "found a grump camp");
        SB.Chem.apply(c.chem, { fear: 0.5 });
        break;
    }
    if (s.kind !== "camp") SB.bus.emit("siteFound", out);
    return out;
  };

  // freeing a camp's captives: survivors from other pods, grateful, and not related to anyone
  S.free = function (game, s) {
    s.done = true; mark(s);
    var hm = SB.Society.home(game, 0), r = game.rng, n = 2 + (r.chance(0.4) ? 1 : 0), out = [];
    var top = 0; game.creatures.forEach(function (c) { if (c.alive && c.species === "smol" && c.tier > top) top = c.tier; });
    for (var i = 0; i < n; i++) {
      var g = SB.Genome.forTier(r, Math.max(0, Math.min(4, top - (r.chance(0.5) ? 1 : 0))));
      var c = SB.Game.spawnSmol(game, { genome: g, x: s.x + r.range(-1.5, 1.5), z: s.z + r.range(-1.5, 1.5), age: SB.STAGES[3].from + 60, gen: g.gen || 1, sex: i % 2 ? "m" : "f" });
      if (!c) continue;
      c.tribe = 0;
      SB.Creature.sendTo(c, hm.x + r.range(-3, 3), hm.z + r.range(-3, 3), game, 60);
      diary(game, c, "⛺", "was freed from a grump camp");
      if (SB.Social) game.creatures.forEach(function (o) { if (o !== c && o.alive && o.species === "smol" && SB.dist(o.x, o.z, s.x, s.z) < 15) SB.Social.remember(game, c, o, "freed", 35, "freed me from the grumps", 7200); });
      out.push(c);
    }
    chron(game, "⛓", out.map(function (c) { return c.name; }).join(", ") + " were freed from the grump camp and joined the tribe");
    return out;
  };
})();
