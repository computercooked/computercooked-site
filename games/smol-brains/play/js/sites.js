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
      var def = S.KINDS[k], K = T.N / 256, n = Math.round(def.n * K * K); // a bigger island hides more, further out
      for (var i = 0; i < n; i++) {
        for (var tries = 0; tries < 60; tries++) {
          var a = r() * 6.283, d = (def.dist[0] + r() * (def.dist[1] - def.dist[0])) * K;
          var x = sp.x + Math.sin(a) * d, z = sp.z + Math.cos(a) * d;
          if (!SB.World.inBounds(w, x, z) || !SB.World.walkable(w, x, z, false) || SB.World.depthAt(w, x, z) > 0.05) continue;
          if (out.some(function (o) { return SB.dist(o.x, o.z, x, z) < 18; })) continue;
          out.push({ id: id++, kind: k, x: x, z: z, rot: r() * 6.283, found: false, done: false, gone: k === "wreck" });
          break;
        }
      }
    });
    game.sites = out;
    return out;
  };
  // crashed pods aren't from the seed, so they save where they are and what's still inside
  S.serialize = function (game) { return (game.sites || []).filter(function (s) { return s.found || s.done; }).map(function (s) { var p = [s.id, s.found ? 1 : 0, s.done ? 1 : 0, s.log == null ? -1 : s.log, s.asked ? Math.round(s.againT || 0) : 0]; if (s.kind === "pod") p.push([Math.round(s.x * 10) / 10, Math.round(s.z * 10) / 10, Math.round(s.rot * 100) / 100, s.surv, Math.round(s.crashT), s.n]); return p; }); };
  S.revive = function (game, data) {
    if (!game.sites) S.generate(game);
    (Array.isArray(data) ? data : []).forEach(function (p) {
      if (Array.isArray(p[5])) { var q = p[5]; game.sites[p[0]] = { id: p[0], kind: "pod", x: q[0], z: q[1], rot: q[2], surv: q[3], crashT: q[4], n: q[5] }; }
      var s = game.sites[p[0]]; if (s) { s.found = !!p[1]; s.done = !!p[2]; if (s.found && s.kind === "wreck") s.gone = false; if (p[3] >= 0) s.log = p[3]; if (p[4] > 0) { s.asked = true; s.againT = p[4]; } }
    });
    for (var i = 0; i < game.sites.length; i++) if (!game.sites[i]) game.sites[i] = { id: i, kind: "pod", x: 0, z: 0, gone: true, found: true, done: true }; // never leave holes
  };
  S.live = function (s) { return !!s && !s.gone; };
  S.near = function (game, x, z, r) { return (game.sites || []).filter(function (s) { return !s.gone && SB.dist(s.x, s.z, x, z) < r; }); };
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
      if (s.gone) return;
      if (s.kind === "pod") { // a smol who wanders right up to a downed pod opens it
        if (s.done) return;
        for (var j = 0; j < sm.length; j++) if (SB.dist(sm[j].x, sm[j].z, s.x, s.z) < 2.6 && !(sm[j].action && sm[j].action.called)) { S.openPod(game, s, sm[j], []); return; }
        // left alone long enough, the survivors climb out and go looking for you themselves
        if (game.time - s.crashT > POD_WAIT) S.openPod(game, s, null, []);
        return;
      }
      if (s.found) return;
      for (var i = 0; i < sm.length; i++) if (SB.dist(sm[i].x, sm[i].z, s.x, s.z) < 6) { S.find(game, s, sm[i]); return; }
    });
    S.podTick(game, sm);
    // a camp or a pod that hasn't been dealt with waits for the storyteller to be free
    if (SB.Director) {
      var d = SB.Director.state(game), waiting = function (k) { return game.sites.some(function (s) { return s.kind === k && !s.gone && s.found && !s.done && (!s.asked || game.time > (s.againT || 0)); }); };
      if (!d.active && game.tutorial && game.tutorial.done && !game.offline && game.time - (d.lastT == null ? -1e9 : d.lastT) > 120 && (!game.playTime || game.playTime - (d.realT || -1e9) > 45)) { if (waiting("pod")) SB.Director.fire(game, "pod"); else if (waiting("camp")) SB.Director.fire(game, "camp"); }
    }
  };

  /* ---------------- escape pods still coming down ----------------
     the ark's other pods have been drifting in orbit. every so often one falls: you see it come down,
     the map shows where, and you can send a rescue party for whoever's inside (plus the ark's logs). */
  var POD_FIRST = 600, POD_GAP = [540, 900], POD_WAIT = 720, POD_MAX = 12;
  S.podTick = function (game, sm) {
    if (game.offline || !game.tutorial || !game.tutorial.done || !sm.length) return;
    if (game.podT == null) game.podT = Math.max(game.time + 60, POD_FIRST);
    if (game.time < game.podT) return;
    var n = (game.podsDown || 0);
    if (n >= POD_MAX || game.sites.some(function (s) { return s.kind === "pod" && !s.done && !s.gone; })) { game.podT = game.time + 120; return; }
    if (sm.length + 1 >= SB.Game.POP_CAP) { game.podT = game.time + 300; return; }
    S.crash(game);
  };
  S.crash = function (game, at) {
    var w = game.world, r = game.rng, hm = SB.Society ? SB.Society.home(game, 0) : w.T.spawn, spot = at || null;
    for (var tries = 0; !spot && tries < 80; tries++) {
      var a = r() * 6.283, d = r.range(24, 80), x = hm.x + Math.sin(a) * d, z = hm.z + Math.cos(a) * d;
      if (!SB.World.inBounds(w, x, z) || !SB.World.walkable(w, x, z, false) || SB.World.depthAt(w, x, z) > 0.05) continue;
      if (game.sites.some(function (o) { return !o.gone && SB.dist(o.x, o.z, x, z) < 8; })) continue;
      if (!SB.World.pathOpen || SB.World.pathOpen(w, x, z)) spot = { x: x, z: z };
    }
    if (!spot) { game.podT = game.time + 120; return null; }
    var n = game.podsDown = (game.podsDown || 0) + 1;
    // the first pods always carry someone; later ones are sometimes just wreckage and a log
    var surv = n <= 2 ? 2 : r() < 0.2 ? 0 : r() < 0.6 ? 1 : 2 + (r() < 0.3 ? 1 : 0);
    var s = { id: game.sites.length, kind: "pod", x: spot.x, z: spot.z, rot: r() * 6.283, found: true, done: false, surv: surv, crashT: game.time, n: n };
    game.sites.push(s);
    game.podT = game.time + r.range(POD_GAP[0], POD_GAP[1]) * (game.settings && game.settings.storyteller === "calm" ? 1.3 : 1);
    SB.World.reveal(w, s.x, s.z, 9);
    mark(s);
    SB.World.add(w, game, "stone", s.x + 1.2, s.z + 0.4, {}); // a little crater rubble
    chron(game, "🛸", "an escape pod crashed " + Math.round(SB.dist(s.x, s.z, hm.x, hm.z)) + " steps from the village");
    SB.bus.emit("podCrash", { site: s, home: hm });
    return s;
  };
  // open a downed pod: by a rescue party (rescuers), a passing smol (c), or the survivors themselves (c null)
  S.openPod = function (game, s, c, rescuers, how) {
    if (s.done) return null;
    s.done = true; mark(s);
    var w = game.world, r = game.rng, hm = SB.Society ? SB.Society.home(game, 0) : w.T.spawn, out = [], magic = how === "magic", self = !magic && !c && !(rescuers && rescuers.length);
    var top = 0; game.creatures.forEach(function (o) { if (o.alive && o.species === "smol" && !o.stranger && o.tier > top) top = o.tier; });
    var fs = game.creatures.filter(function (o) { return o.alive && o.species === "smol" && !o.stranger; }), f = fs.filter(function (o) { return o.sex === "f"; }).length;
    for (var i = 0; i < s.surv; i++) {
      if (game.creatures.filter(function (o) { return o.alive && o.species === "smol"; }).length >= SB.Game.POP_CAP) break;
      // survivors have been asleep in orbit: about as evolved as your tribe, never past builder
      var g = SB.Genome.forTier(r, Math.max(0, Math.min(4, top - (r() < 0.4 ? 1 : 0))));
      var sex = i === 0 ? (f * 2 < fs.length ? "f" : "m") : (out[0] && out[0].sex === "f" ? "m" : "f");
      var nc = SB.Game.spawnSmol(game, { genome: g, x: s.x + r.range(-1.2, 1.2), z: s.z + r.range(-1.2, 1.2), age: SB.STAGES[3].from + 20 + r() * 100, gen: g.gen || 1, sex: sex });
      if (!nc) continue;
      nc.tribe = 0; nc.podId = s.n;
      if (self) { nc.stranger = { state: "waiting", t: game.time + 60, x0: s.x, z0: s.z, wx: hm.x + r.range(-6, 6), wz: hm.z + r.range(-6, 6), trait: r.pick(["shy", "brave", "chatty", "cheerful", "curious"]) }; SB.bus.emit("stranger", { c: nc }); }
      else SB.Creature.sendTo(nc, hm.x + r.range(-3, 3), hm.z + r.range(-3, 3), game, 90);
      diary(game, nc, "🛸", self ? "climbed out of a crashed pod and went looking for others" : "was rescued from a crashed escape pod");
      (rescuers || []).concat(c ? [c] : []).forEach(function (o) { if (SB.Social && o && o.alive) SB.Social.remember(game, nc, o, "rescued", 40, "pulled me out of my pod", 7200); });
      out.push(nc);
    }
    var loot = ["stick", "stone", "fiber", "flint", "fiber", "berry"];
    for (var k = 0; k < 4; k++) { var a = r() * 6.28, d = 1 + r() * 1.5; SB.World.add(w, game, r.pick(loot), s.x + Math.sin(a) * d, s.z + Math.cos(a) * d, {}); }
    var n = game.logsFound || 0, res = { site: s, c: c, rescuers: rescuers || [], survivors: out, self: self, icon: "🛸", title: "", text: [] };
    if (n < S.LOGS.length) { s.log = n; game.logsFound = n + 1; res.log = S.LOGS[n]; }
    if (!self) SB.Game.addSparks(game, 4 + out.length * 2);
    var names = out.map(function (o) { return o.name; }).join(" and ");
    if (self) {
      res.title = out.length ? "they climbed out on their own" : "the pod went quiet";
      res.text.push(out.length ? "nobody came for the pod, so " + names + " climbed out and went looking for other smols. they'll turn up at the village and you can decide whether to take them in." : "nobody came, and the pod is cold now. it was empty except for some supplies.");
    } else {
      var who = magic ? "a warm wind" : c ? c.name : (rescuers || []).map(function (o) { return o.name; }).slice(0, 3).join(", ");
      res.title = out.length ? (out.length === 1 ? "a survivor!" : out.length + " survivors!") : "the pod was empty";
      res.text.push(out.length ? who + (magic ? " lifted the pod's door off." : " pried the pod open.") + " inside: " + names + ", blinking at the light. they're coming home with you. (not related to anyone, so they can start families)" : who + " pried the pod open. nobody inside, just supplies scattered around.");
    }
    if (res.log) res.text.push("a little screen in the pod still flickers (" + (n + 1) + " of " + S.LOGS.length + "):");
    chron(game, "🛸", self ? "survivors climbed out of pod " + s.n + " on their own" : (out.length ? names + (out.length > 1 ? " were" : " was") + " rescued from pod " + s.n : "pod " + s.n + " was opened: empty"));
    if (c) diary(game, c, "🛸", "opened a crashed escape pod");
    (rescuers || []).forEach(function (o) { diary(game, o, "🧭", "rescued " + (names || "nobody, but found supplies") + " from a crashed pod"); });
    SB.bus.emit("podOpened", res);
    return res;
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
