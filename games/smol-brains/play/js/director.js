// smol brains — the storyteller. Something happens every few minutes, paced like RimWorld's storytellers:
// grump raids that grow with the village, storms, sickness, falling stars, feuds, lost kids, feasts.
// Each one is a card with a choice for the god, and a quiet spell after the bad ones.
// Sim-side only: the UI listens for "incident" (show the card) and "incidentEnd" (say how it went).
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var D = SB.Director = {};

  var FIRST = 480;          // the first story comes about eight minutes in
  var GAP = [200, 380];     // then one every 3.5-6.5 minutes
  var AUTO = 45;            // headless or nobody answering: the free choice is taken after this long
  var PACE = { calm: 1.6, balanced: 1, wild: 0.6 };

  function smols(game) { return game.creatures.filter(function (c) { return c.alive && c.species === "smol" && !c.stranger; }); }
  function home(game) { return SB.Society ? SB.Society.home(game, 0) : game.world.T.spawn; }
  function chron(game, icon, txt) { if (SB.Social) SB.Social.chronicle(game, icon, txt); }
  function diary(game, c, icon, txt) { if (SB.Social) SB.Social.log(game, c, icon, txt); }
  function topTier(game) { var t = 0; smols(game).forEach(function (c) { if (c.tier > t) t = c.tier; }); return t; }
  function pace(game) { return PACE[(game.settings && game.settings.storyteller) || "balanced"] || 1; }
  function dirOf(dx, dz) { var a = Math.atan2(dx, -dz) * 180 / Math.PI; a = (a + 360) % 360; return ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"][Math.round(a / 45) % 8]; }
  // a walkable spot about `dist` from the village, preferring the given angle
  function spot(game, dist, ang) {
    var w = game.world, r = game.rng, hm = home(game);
    for (var i = 0; i < 50; i++) {
      var a = ang != null && i < 25 ? ang + r.range(-0.6, 0.6) : r() * 6.283, d = dist * r.range(0.8, 1.2);
      var x = hm.x + Math.sin(a) * d, z = hm.z + Math.cos(a) * d;
      if (SB.World.inBounds(w, x, z) && SB.World.walkable(w, x, z, false) && SB.World.depthAt(w, x, z) < 0.1) return { x: x, z: z };
    }
    return null;
  }
  // how much the island has to lose: raids grow with it (RimWorld's wealth), and ease off after losses
  function threat(game) {
    var pop = smols(game).length, sts = game.world.structures.filter(function (s) { return s.done; }).length;
    var t = 0.6 + topTier(game) * 0.45 + pop / 10 + sts / 14;
    var d = game.dir, recent = (d.losses || []).filter(function (x) { return game.time - x < 900; }).length;
    t *= 1 + 0.25 * Math.min(4, game.ngPlus || 0); // new game+: the grumps remember you
    return Math.max(0.5, t * (1 - Math.min(0.6, recent * 0.2)) / Math.sqrt(pace(game)));
  }

  D.state = function (game) {
    var d = game.dir || (game.dir = { nextT: FIRST, count: 0, last: {}, losses: [], active: null, history: [] });
    if (!d.losses) d.losses = [];
    if (!d.last) d.last = {};
    if (!d.history) d.history = [];
    return d;
  };

  /* ---------------- the deck ---------------- */
  // ok(game): can it happen now? w: weight. bad: a threat (followed by a quiet spell). start(game) -> incident or null
  var DECK = [];
  function card(def) { DECK.push(def); D[def.id] = def; }
  D.DECK = DECK;

  // --- grump raid: a war party comes in daylight, bigger as the village grows
  card({
    id: "raid", bad: true, minTier: 1, w: 4, gap: 600,
    ok: function (game) { return smols(game).length >= 4 && game.time > 900; },
    start: function (game) {
      var hm = home(game), caves = game.world.T.caves || [], ang = null;
      if (caves.length) { var cv = caves.reduce(function (b, c) { return SB.dist(c.x, c.z, hm.x, hm.z) < SB.dist(b.x, b.z, hm.x, hm.z) ? c : b; }); ang = Math.atan2(cv.x - hm.x, cv.z - hm.z); }
      var camp = (game.sites || []).filter(function (x) { return x.kind === "camp" && x.found && !x.done; })[0];
      if (camp) ang = Math.atan2(camp.x - hm.x, camp.z - hm.z); // the camp you left alone sends war parties
      var at = spot(game, 34, ang);
      if (!at) return null;
      var n = (camp ? 1 : 0) + Math.max(2, Math.min(9, Math.round(threat(game) * game.rng.range(0.8, 1.2))));
      var fires = (game.world.fires || []).filter(function (f) { return SB.dist(f.x, f.z, hm.x, hm.z) < 12; }).length;
      var armed = smols(game).filter(function (c) { return c.tool != null; }).length;
      return {
        icon: "👺", title: "a grump war party!", x: at.x, z: at.z, warn: 50, n: n,
        text: [n + " grumps are marching on the village from the " + (camp ? "grump camp in the " : "") + dirOf(at.x - hm.x, at.z - hm.z) + ". they'll be here in under a minute.",
          (fires ? "your campfire scares grumps off. " : "") + (armed ? armed + " of your smols carry something to fight with." : "nobody has a weapon yet: clubs and spears turn grumps away for good.")],
        choices: [
          { key: "smite", label: "⚡ strike them down", cost: 6 + n * 2, hint: "lightning hits every raider that reaches the village" },
          { key: "hide", label: "🛖 everyone home!", hint: "your smols run home and huddle together. huts keep them safe" },
          { key: "fight", label: "🏏 stand and fight", hint: "the brave ones charge. win and they'll sing about it" }
        ]
      };
    },
    begin: function (game, inc) {
      inc.raiders = [];
      var hm = home(game);
      for (var i = 0; i < inc.n; i++) {
        var g = SB.Game.spawnGrump(game, inc.x + game.rng.range(-2.5, 2.5), inc.z + game.rng.range(-2.5, 2.5));
        g.raider = { x: hm.x, z: hm.z }; g.chem.anger = 0.8; g.chem.hunger = 0.7;
        inc.raiders.push(g.id);
      }
      inc.dur = 210;
      if (inc.choice === "hide") smols(game).forEach(function (c) { c.shelterT = 120; });
      if (inc.choice === "fight") smols(game).forEach(function (c) { if (c.stage >= 2 && c.tier >= 1) { c.rally = 150; SB.Chem.apply(c.chem, { fear: -0.5, anger: 0.3 }); } });
    },
    tick: function (game, inc) {
      var hm = home(game), left = 0;
      inc.raiders.forEach(function (id) {
        var g = SB.Game.byId(game, id);
        if (!g || !g.alive) return;
        left++;
        if (inc.choice === "smite" && !g.smitten && SB.dist(g.x, g.z, hm.x, hm.z) < 20) {
          g.smitten = true;
          SB.World.lightning(game.world, game, g.x, g.z, true);
          SB.Chem.apply(g.chem, { fear: 1, pain: 0.5 });
          g.goingHome = true; inc.smote = (inc.smote || 0) + 1;
          if (game.rng.chance(0.4)) { g.alive = false; g.gone = true; }
        }
      });
      // the brave charge whichever raider is closest
      if (inc.choice === "fight") smols(game).forEach(function (c) {
        if (!(c.rally > 0) || c.action && c.action.verb === SB.V.hit || c.chem.pain > 0.6) return;
        var foe = null, fd = 9;
        inc.raiders.forEach(function (id) { var g = SB.Game.byId(game, id); if (g && g.alive && !g.goingHome) { var dd = SB.dist(g.x, g.z, c.x, c.z); if (dd < fd) { fd = dd; foe = g; } } });
        if (foe && game.rng.chance(0.5)) SB.Creature.provoke(c, foe, game);
      });
      inc.left = left;
      if (!left) return D.end(game, inc, true);
      if (game.time - inc.t1 > inc.dur) { inc.raiders.forEach(function (id) { var g = SB.Game.byId(game, id); if (g) g.goingHome = true; }); return D.end(game, inc, false); }
    },
    finish: function (game, inc, won) {
      smols(game).forEach(function (c) { c.shelterT = 0; c.rally = 0; });
      var hurt = Object.keys(inc.hurt || {}).length, chased = inc.chased || 0;
      if (won && inc.choice === "fight") {
        SB.Game.addSparks(game, 6 + chased * 2);
        var heroes = inc.heroes ? Object.keys(inc.heroes).map(function (id) { return SB.Game.byId(game, +id); }).filter(Boolean) : [];
        heroes.forEach(function (c) { diary(game, c, "🏏", "fought off the grump raid"); c.stats.grumpsChased = (c.stats.grumpsChased || 0) + 1; if (SB.Social) SB.Social.checkTitle(game, c); });
        chron(game, "🏏", "the village fought off a grump raid" + (heroes.length ? ", led by " + heroes.slice(0, 2).map(function (c) { return c.name; }).join(" and ") : ""));
        return "the raid is broken! " + (chased ? chased + " grumps chased off for good. " : "") + "+" + (6 + chased * 2) + " ✨ from a grateful tribe";
      }
      if (won) { chron(game, "👺", "a grump raid came and went" + (inc.smote ? " (the sky struck " + inc.smote + " of them)" : "")); return "the grumps are gone." + (hurt ? " " + hurt + (hurt === 1 ? " smol got" : " smols got") + " hurt." : " nobody got hurt."); }
      chron(game, "👺", "a grump raid wore itself out and slunk home");
      return "the grumps gave up and went home.";
    }
  });

  // --- storm: a big one, announced. lightning starts fires; farms love the rain
  card({
    id: "storm", bad: true, minTier: 0, w: 2, gap: 900,
    ok: function (game) { return game.world.weather.kind !== "storm" && game.world.season !== 3; },
    start: function (game) {
      var hm = home(game), dome = game.world.structures.some(function (s) { return s.kind === "observatory" && s.done; });
      return {
        icon: "⛈", title: "a storm is coming", x: hm.x, z: hm.z, warn: dome ? 90 : 35,
        text: ["black clouds are rolling in off the sea. lightning will hit the tallest trees, and trees can catch fire.", dome ? "the stargazers in the dome saw it coming early, so there's plenty of time." : "farms love the rain, though."],
        choices: [
          { key: "calm", label: "🌤 turn it away", cost: 8, hint: "the clouds break up before they get here" },
          { key: "hide", label: "🛖 everyone indoors", hint: "your smols wait it out at home, out of the way of the lightning" },
          { key: "let", label: "🌧 let it rain", hint: "smart smols watch fire come from the sky" }
        ]
      };
    },
    begin: function (game, inc) {
      var w = game.world;
      inc.dur = 140;
      if (inc.choice === "calm") { game.forceWeather = "clear"; w.weather.t = w.weather.next; return D.end(game, inc, true); }
      game.forceWeather = "storm"; w.weather.t = w.weather.next;
      if (inc.choice === "hide") smols(game).forEach(function (c) { c.shelterT = 110; });
    },
    tick: function (game, inc) {
      var w = game.world;
      if (w.weather.kind === "storm") w.weather.next = Math.max(w.weather.next, w.weather.t + 10);
      if (game.time - inc.t1 > inc.dur) { w.weather.next = w.weather.t + 1; return D.end(game, inc, true); }
    },
    finish: function (game, inc) {
      if (inc.choice === "calm") return "the clouds broke up over the sea. ☀️";
      smols(game).forEach(function (c) { c.shelterT = 0; });
      game.world.structures.forEach(function (s) { if (s.kind === "farm" && s.data) s.data.grow = Math.min(1, (s.data.grow || 0) + 0.3); });
      chron(game, "⛈", "a great storm rolled over the island");
      return "the storm has passed. the farms drank deep. 🌾";
    }
  });

  // --- sickness: one smol gets the sniffles, and it spreads by contact
  card({
    id: "sick", bad: true, minTier: 0, w: 2, gap: 900,
    ok: function (game) { return smols(game).length >= 5; },
    start: function (game) {
      var cs = smols(game).filter(function (c) { return c.stage >= 1 && c.chem.sick < 0.2; });
      if (!cs.length) return null;
      var c = game.rng.pick(cs);
      c.chem.antigen = Math.max(c.chem.antigen, 0.55);
      return {
        icon: "🤧", title: c.name + " has the sniffles", x: c.x, z: c.z, who: c.id, warn: 0,
        text: [c.name + " is sneezing all over everyone. it's catching: every smol who gets close might come down with it.", "healroot cures it, if anyone knows where it grows."],
        choices: [
          { key: "heal", label: "💚 heal everyone", cost: 12, hint: "it's gone before it starts" },
          { key: "apart", label: "🏕 keep the sick apart", hint: "sick smols camp away from the others until they're better" },
          { key: "let", label: "🤞 let it run its course", hint: "the ones who get through it come out tougher" }
        ]
      };
    },
    begin: function (game, inc) {
      inc.dur = 180; inc.caught = {}; inc.caught[inc.who] = 1;
      if (inc.choice === "heal") { smols(game).forEach(function (c) { SB.Chem.apply(c.chem, { sick: -0.8, antigen: -0.8, toxin: -0.5 }); }); return D.end(game, inc, true); }
    },
    tick: function (game, inc) {
      var cs = smols(game), hm = home(game);
      cs.forEach(function (c) {
        if (c.chem.sick < 0.3) return; // only the sneezing ones spread it
        if (inc.choice === "apart" && !c.quarantine) { var sp = spot(game, 11, Math.atan2(c.x - hm.x, c.z - hm.z)) || { x: c.x, z: c.z }; c.quarantine = sp; diary(game, c, "🏕", "camped away from the others while sick"); }
        if (c.quarantine) return;
        cs.forEach(function (o) {
          if (o === c || o.quarantine || o.chem.antibody > 0.5 || SB.dist(o.x, o.z, c.x, c.z) > 1.8) return;
          if (game.rng.chance(0.004)) { o.chem.antigen = Math.min(1, o.chem.antigen + 0.3); inc.caught[o.id] = 1; }
        });
      });
      var ill = cs.filter(function (c) { return c.chem.antigen > 0.1 || c.chem.sick > 0.25; }).length;
      if (!ill || game.time - inc.t1 > inc.dur) return D.end(game, inc, true);
    },
    finish: function (game, inc) {
      var n = Object.keys(inc.caught || {}).length;
      if (inc.choice === "heal") return "a warm green glow, and the sniffles are gone. 💚";
      smols(game).forEach(function (c) { c.quarantine = null; if (inc.caught[c.id] && inc.choice === "let") c.chem.antibody = Math.max(c.chem.antibody, 1); });
      chron(game, "🤧", "the sniffles went round the village (" + n + " caught it)");
      return n <= 1 ? "the sniffles never spread. " + (inc.choice === "apart" ? "good call. +3 ✨" : "") : "the sniffles are over. " + n + " smols caught them" + (inc.choice === "let" ? ", and they won't catch them again." : ".");
    },
    pay: function (game, inc) { if (inc.choice === "apart" && Object.keys(inc.caught || {}).length <= 1) SB.Game.addSparks(game, 3); }
  });

  // --- a falling star: a crater of thought crystals somewhere out in the fog
  card({
    id: "star", minTier: 1, w: 1.5, gap: 1500,
    ok: function (game) { return true; },
    start: function (game) {
      var at = spot(game, 30 + game.rng() * 20, null);
      if (!at) return null;
      var hm = home(game);
      return {
        icon: "☄️", title: "a star fell!", x: at.x, z: at.z, warn: 0,
        text: ["something blazed across the sky and hit the island to the " + dirOf(at.x - hm.x, at.z - hm.z) + " with a great boom.", "everyone saw it. there might be something shiny out there."],
        choices: [
          { key: "go", label: "👣 send explorers", hint: "the three bravest go and look" },
          { key: "later", label: "later", hint: "it'll keep. it's marked on your map" }
        ]
      };
    },
    begin: function (game, inc) {
      var w = game.world;
      SB.World.reveal(w, inc.x, inc.z, 7);
      for (var i = 0; i < 4; i++) { var a = i * 1.57 + game.rng() * 0.6, d = 1.2 + game.rng() * 1.6; SB.World.addNode(w, game, "crystals", inc.x + Math.sin(a) * d, inc.z + Math.cos(a) * d, 0.8 + game.rng() * 0.4); }
      SB.World.lightning(w, game, inc.x, inc.z, false);
      if (SB.FX) SB.FX.burst("magic", inc.x, SB.World.groundY(w, inc.x, inc.z) + 1, inc.z, 40, { r: 3 });
      (game.dir.marks || (game.dir.marks = [])).push({ x: inc.x, z: inc.z, icon: "☄️", t: game.time });
      inc.dur = 240;
      if (inc.choice === "go") {
        inc.party = smols(game).filter(function (c) { return c.stage >= 2 && !c.asleep; }).sort(function (a, b) { return (b.genome.genes.bravery || 0) - (a.genome.genes.bravery || 0); }).slice(0, 3).map(function (c) { return c.id; });
        inc.party.forEach(function (id) { var c = SB.Game.byId(game, id); if (c) SB.Creature.sendTo(c, inc.x, inc.z, game, 60); });
      } else return D.end(game, inc, true);
    },
    tick: function (game, inc) {
      var arrived = null;
      (inc.party || []).forEach(function (id) {
        var c = SB.Game.byId(game, id);
        if (!c || !c.alive) return;
        if (SB.dist(c.x, c.z, inc.x, inc.z) < 3.5) arrived = arrived || c;
        else if (!c.action || !c.action.called) SB.Creature.sendTo(c, inc.x, inc.z, game, 60);
      });
      if (arrived) { inc.finder = arrived.id; return D.end(game, inc, true); }
      if (game.time - inc.t1 > inc.dur) return D.end(game, inc, false);
    },
    finish: function (game, inc, ok) {
      if (inc.choice !== "go") return "the crater's on your map ☄️. thought crystals grow there now.";
      var f = inc.finder && SB.Game.byId(game, inc.finder);
      if (!f) return "the explorers got distracted. the crater's still out there ☄️.";
      SB.Game.addSparks(game, 8);
      diary(game, f, "☄️", "found the fallen star");
      f.visited = f.visited || {}; f.visited["star" + Math.round(game.time)] = 1;
      if (SB.Social) SB.Social.checkTitle(game, f);
      chron(game, "☄️", f.name + " found where the star fell: a crater full of thought crystals");
      return f.name + " found the crater: thought crystals! +8 ✨";
    }
  });

  // --- a feud: two smols who can't stand each other, and the whole village knows it
  card({
    id: "feud", minTier: 2, w: 3, gap: 700,
    ok: function (game) { return !!feudPair(game); },
    start: function (game) {
      var p = feudPair(game);
      if (!p) return null;
      var a = p[0], b = p[1], why = SB.Social.reasons(game, a, b)[0];
      return {
        icon: "💢", title: a.name + " vs " + b.name, x: a.x, z: a.z, a: a.id, b: b.id, warn: 0,
        text: [a.name + " and " + b.name + " can't stand each other" + (why ? " (" + why.t + ")" : "") + ". the whole village is taking sides.", "something has to give."],
        choices: [
          { key: "mend", label: "🤝 make them make up", cost: 6, hint: "a nudge from the sky. they'll be civil, maybe even friends" },
          { key: "duel", label: "🥊 let them settle it", hint: "one big fight, then it's over (one way or another)" },
          { key: "exile", label: "🚪 send " + b.name + " away", hint: b.name + " leaves the village for good" }
        ]
      };
    },
    begin: function (game, inc) {
      var a = SB.Game.byId(game, inc.a), b = SB.Game.byId(game, inc.b), SO = SB.Social;
      if (!a || !b || !a.alive || !b.alive) return D.end(game, inc, false);
      inc.dur = 60;
      if (inc.choice === "mend") {
        [[a, b], [b, a]].forEach(function (p) { var r = p[0].ops && p[0].ops[p[1].id]; if (r) r.m.forEach(function (m) { if (m[0] < 0) m[0] *= 0.2; }); SO.remember(game, p[0], p[1], "madeup", 30, "we made up", 3600); });
        SB.Creature.emote(a, "love", 2); SB.Creature.emote(b, "love", 2);
        return D.end(game, inc, true);
      }
      if (inc.choice === "exile") {
        b.stranger = { state: "leaving", t: game.time, x0: b.x + (b.x - SB.Society.home(game, 0).x) * 2, z0: b.z + (b.z - SB.Society.home(game, 0).z) * 2, exiled: true };
        if (b.partner) { var pt = SB.Game.byId(game, b.partner); if (pt) SO.remember(game, pt, a, "exiled", -30, "got my partner exiled", 3600); }
        return D.end(game, inc, true);
      }
      a.grudge = { id: b.id, t: game.time }; b.grudge = { id: a.id, t: game.time };
      SB.Creature.provoke(a, b, game);
    },
    tick: function (game, inc) {
      var a = SB.Game.byId(game, inc.a), b = SB.Game.byId(game, inc.b);
      if (!a || !b || !a.alive || !b.alive) return D.end(game, inc, false);
      if (SB.dist(a.x, a.z, b.x, b.z) > 2 && !(a.action && a.action.verb === SB.V.hit)) SB.Creature.provoke(a, b, game);
      if (game.time - inc.t1 > inc.dur) return D.end(game, inc, true);
    },
    finish: function (game, inc) {
      var a = SB.Game.byId(game, inc.a), b = SB.Game.byId(game, inc.b), SO = SB.Social;
      if (!a || !b) return "it doesn't matter any more.";
      if (inc.choice === "mend") { chron(game, "🤝", a.name + " and " + b.name + " buried the hatchet (with a little help from the sky)"); diary(game, a, "🤝", "made up with " + b.name); diary(game, b, "🤝", "made up with " + a.name); return a.name + " and " + b.name + " made up. 🤝"; }
      if (inc.choice === "exile") { chron(game, "🚪", b.name + " was sent away after the feud with " + a.name); diary(game, a, "🚪", b.name + " was sent away"); return b.name + " walks off into the wild. the village is quieter."; }
      // the duel: whoever took less damage won; half the time they come out respecting each other
      var winner = a.chem.pain <= b.chem.pain ? a : b, loser = winner === a ? b : a;
      if (game.rng.chance(0.5)) {
        SO.remember(game, a, b, "duel", 35, "fought fair", 3600); SO.remember(game, b, a, "duel", 35, "fought fair", 3600);
        chron(game, "🥊", a.name + " and " + b.name + " had it out, then shook hands. " + winner.name + " won");
        return winner.name + " won the fight, and they shook hands after. weirdly, they get on now.";
      }
      SO.remember(game, loser, winner, "beatme", -20, "beat me up", 3600);
      chron(game, "🥊", winner.name + " beat " + loser.name + " in a fight the whole village watched");
      return winner.name + " won. " + loser.name + " won't forget it.";
    }
  });
  function feudPair(game) {
    if (!SB.Social) return null;
    var cs = smols(game).filter(function (c) { return c.stage >= 2 && !c.asleep; }), best = null, bv = SB.Social.ENEMY + 10;
    for (var i = 0; i < cs.length; i++) for (var j = i + 1; j < cs.length; j++) {
      var v = SB.Social.opinion(game, cs[i], cs[j]) + SB.Social.opinion(game, cs[j], cs[i]);
      if (v / 2 < bv) { bv = v / 2; best = [cs[i], cs[j]]; }
    }
    return best;
  }

  // --- a kid wanders off into the fog chasing a butterfly
  card({
    id: "lost", minTier: 0, w: 2, gap: 1200,
    ok: function (game) { return smols(game).some(function (c) { return c.stage === 1 && !c.asleep; }); },
    start: function (game) {
      var kids = smols(game).filter(function (c) { return c.stage === 1 && !c.asleep; });
      if (!kids.length) return null;
      var k = game.rng.pick(kids), hm = home(game), at = spot(game, 26, Math.atan2(k.x - hm.x, k.z - hm.z));
      if (!at) return null;
      k.x = at.x; k.z = at.z; k.y = SB.World.groundY(game.world, at.x, at.z); k.lost = true;
      SB.Chem.apply(k.chem, { fear: 0.7, lonely: 0.6 });
      var mum = (k.parents || []).map(function (id) { return SB.Game.byId(game, id); }).filter(function (p) { return p && p.alive; })[0];
      return {
        icon: "🦋", title: k.name + " is lost!", x: at.x, z: at.z, kid: k.id, parent: mum ? mum.id : null, warn: 0,
        text: [k.name + " chased a butterfly too far and now can't find the way home. it's getting scared out there" + (game.world.night ? " in the dark." : "."), mum ? mum.name + " is beside " + (mum.sex === "f" ? "herself" : "himself") + "." : "nobody's noticed yet."],
        choices: [
          { key: "guide", label: "✨ light the way home", cost: 5, hint: "a trail of sparkles leads " + k.name + " back" },
          { key: "search", label: "🔦 send a search party", hint: (mum ? mum.name : "a grown-up") + " goes looking (and finds things on the way)" },
          { key: "wait", label: "they'll find their way", hint: "probably" }
        ]
      };
    },
    begin: function (game, inc) {
      var k = SB.Game.byId(game, inc.kid), hm = home(game);
      if (!k) return D.end(game, inc, false);
      inc.dur = 260;
      if (inc.choice === "guide") { SB.Creature.sendTo(k, hm.x, hm.z, game, 90); if (SB.FX) SB.FX.burst("sparkle", k.x, k.y + 1, k.z, 24); }
      if (inc.choice === "search") {
        var s = inc.parent && SB.Game.byId(game, inc.parent);
        if (!s || !s.alive) s = smols(game).filter(function (c) { return c.stage >= 2 && c !== k; }).sort(function (a, b) { return (b.genome.genes.bravery || 0) - (a.genome.genes.bravery || 0); })[0];
        if (s) { inc.seeker = s.id; SB.Creature.sendTo(s, k.x, k.z, game, 90); }
      }
    },
    tick: function (game, inc) {
      var k = SB.Game.byId(game, inc.kid), hm = home(game);
      if (!k || !k.alive) return D.end(game, inc, false);
      if (SB.dist(k.x, k.z, hm.x, hm.z) < 7) return D.end(game, inc, true);
      if (inc.choice === "guide" && (!k.action || !k.action.called)) SB.Creature.sendTo(k, hm.x, hm.z, game, 90);
      if (inc.choice === "search") {
        var s = SB.Game.byId(game, inc.seeker);
        if (s && s.alive) {
          if (SB.dist(s.x, s.z, k.x, k.z) < 2.5) inc.found = true;
          if (inc.found) { if (!k.action || !k.action.called) SB.Creature.sendTo(k, hm.x, hm.z, game, 90); if (!s.action || !s.action.called) SB.Creature.sendTo(s, hm.x, hm.z, game, 90); }
          else if (!s.action || !s.action.called) SB.Creature.sendTo(s, k.x, k.z, game, 90);
        }
      }
      if (inc.choice === "wait" && game.time - inc.t1 > 90 && (!k.action || !k.action.called) && game.rng.chance(0.05)) SB.Creature.sendTo(k, hm.x, hm.z, game, 90);
      if (game.time - inc.t1 > inc.dur) { k.x = hm.x + 2; k.z = hm.z + 2; k.y = SB.World.groundY(game.world, k.x, k.z); return D.end(game, inc, true); }
    },
    finish: function (game, inc) {
      var k = SB.Game.byId(game, inc.kid), s = inc.seeker && SB.Game.byId(game, inc.seeker);
      if (!k) return "";
      k.lost = false;
      SB.Chem.apply(k.chem, { fear: -0.6, lonely: -0.5 });
      if (s && inc.found) {
        SB.Social.remember(game, k, s, "rescued", 40, "found me when i was lost", 5400);
        diary(game, s, "🔦", "found " + k.name + " lost in the wild"); diary(game, k, "🦋", "got lost and " + s.name + " found me");
        SB.Social.checkTitle(game, s);
        chron(game, "🔦", s.name + " found little " + k.name + " lost in the wild and brought " + (k.sex === "f" ? "her" : "him") + " home");
        return s.name + " found " + k.name + " and brought them home! 🏠";
      }
      diary(game, k, "🦋", "got lost chasing a butterfly");
      return k.name + " made it home, a bit shaken. 🏠";
    }
  });

  // --- a feast: autumn, food to spare. everyone gathers at the fire
  card({
    id: "feast", minTier: 3, w: 2, gap: 2000,
    ok: function (game) { return game.world.season === 2 && !!campfire(game) && SB.Game.foodPerSmol(game) > 1.4; },
    start: function (game) {
      var f = campfire(game);
      if (!f) return null;
      return {
        icon: "🎉", title: "harvest feast?", x: f.x, z: f.z, warn: 0,
        text: ["the harvest is in and there's plenty to go round. the tribe wants a feast by the fire: food, songs and dancing.", "it'll use up some of the food, but everyone will remember it."],
        choices: [{ key: "yes", label: "🎉 let's feast!", hint: "everyone gathers at the fire: happier, friendlier, and in the mood for love" }, { key: "no", label: "save the food", hint: "winter is coming" }]
      };
    },
    begin: function (game, inc) {
      if (inc.choice !== "yes") return D.end(game, inc, true);
      inc.dur = 70;
      var eaten = 0;
      game.world.items.slice().forEach(function (o) { if (eaten < smols(game).length && SB.KINDS[o.kind] && SB.KINDS[o.kind].noun === "food" && SB.dist(o.x, o.z, inc.x, inc.z) < 25 && o.heldBy == null) { SB.World.remove(game.world, o); eaten++; } });
      smols(game).forEach(function (c) { c.shelterT = 0; SB.Creature.sendTo(c, inc.x + game.rng.range(-3, 3), inc.z + game.rng.range(-3, 3), game, 30); });
    },
    tick: function (game, inc) {
      if (game.time - inc.t1 > inc.dur) return D.end(game, inc, true);
      if (game.rng.chance(0.3)) { var cs = smols(game).filter(function (c) { return SB.dist(c.x, c.z, inc.x, inc.z) < 6; }); if (cs.length) { var c = game.rng.pick(cs); SB.Creature.emote(c, "happy", 2); if (!c.speech) c.speech = { text: game.rng.pick(["yay!", "♪ la la ♪", "best night ever", "more pie!", "dance!"]), t: 1.8, kind: "say" }; } }
    },
    finish: function (game, inc) {
      if (inc.choice !== "yes") return "they grumble a little, but winter will be easier.";
      var cs = smols(game).filter(function (c) { return SB.dist(c.x, c.z, inc.x, inc.z) < 9; });
      cs.forEach(function (c) { SB.Chem.apply(c.chem, { bored: -0.8, lonely: -0.8, hunger: -0.4, love: c.stage === 3 ? 0.4 : 0 }); diary(game, c, "🎉", "danced at the harvest feast"); cs.forEach(function (o) { if (o !== c) SB.Social.remember(game, c, o, "feast", 5, "the feast", 3600, 10); }); });
      chron(game, "🎉", "the great harvest feast (" + cs.length + " smols danced till dawn)");
      SB.Game.addSparks(game, 5);
      return "what a night! everyone's closer now. +5 ✨";
    }
  });

  function campfire(game) { var hm = home(game), best = null; game.world.structures.forEach(function (st) { if (st.kind === "campfire" && st.done && (!best || SB.dist(st.x, st.z, hm.x, hm.z) < SB.dist(best.x, best.z, hm.x, hm.z))) best = st; }); return best; }

  // --- a grump camp holding captives (found out in the fog, see sites.js): only dealt when one is found
  card({
    id: "camp", minTier: 0, w: 0, gap: 0, bad: true,
    ok: function () { return false; },
    start: function (game) {
      var s = (game.sites || []).filter(function (x) { return x.kind === "camp" && x.found && !x.done && (!x.asked || game.time > (x.againT || 0)); })[0];
      if (!s) return null;
      s.asked = true; s.againT = game.time + 900;
      var armed = smols(game).filter(function (c) { return c.tool != null && c.stage >= 2; }).length;
      return {
        icon: "⛺", title: "a grump camp!", x: s.x, z: s.z, site: s.id, warn: 0,
        text: ["out in the wild there's a grump camp: spiky fences, a smoky fire, and smols in a cage. survivors from another pod, by the look of them.",
          armed ? armed + " of your smols carry clubs or spears. grumps run from a good whack." : "nobody in your tribe has a weapon. bare paws won't scare grumps off: clubs and spears will."],
        choices: [
          { key: "burn", label: "⚡ burn the camp", cost: 16, hint: "lightning scatters the grumps and smashes the cage" },
          { key: "raid", label: "🏏 send a rescue party", hint: "the bravest go in. it's a fight" },
          { key: "later", label: "not yet", hint: "the captives will wait. grumps from that camp may come raiding" }
        ]
      };
    },
    begin: function (game, inc) {
      var s = game.sites[inc.site];
      if (inc.choice === "later") return D.end(game, inc, false);
      if (inc.choice === "burn") {
        for (var i = 0; i < 3; i++) SB.World.lightning(game.world, game, s.x + game.rng.range(-2, 2), s.z + game.rng.range(-2, 2), true);
        inc.freed = SB.Sites.free(game, s).length;
        return D.end(game, inc, true);
      }
      inc.guards = [];
      for (var j = 0; j < 3; j++) { var g = SB.Game.spawnGrump(game, s.x + game.rng.range(-2, 2), s.z + game.rng.range(-2, 2)); g.raider = { x: s.x, z: s.z }; g.chem.anger = 0.7; inc.guards.push(g.id); }
      inc.party = smols(game).filter(function (c) { return c.stage >= 2 && !c.asleep && c.chem.pain < 0.5; }).sort(function (a, b) { return (b.tool != null) - (a.tool != null) || (b.genome.genes.bravery || 0) - (a.genome.genes.bravery || 0); }).slice(0, 4).map(function (c) { return c.id; });
      inc.party.forEach(function (id) { var c = SB.Game.byId(game, id); c.rally = 200; SB.Creature.sendTo(c, s.x, s.z, game, 80); });
      inc.dur = 200;
    },
    tick: function (game, inc) {
      var s = game.sites[inc.site], guards = inc.guards.map(function (id) { return SB.Game.byId(game, id); }).filter(function (g) { return g && g.alive && !g.goingHome; });
      inc.left = guards.length;
      if (!guards.length) { inc.freed = SB.Sites.free(game, s).length; return D.end(game, inc, true); }
      var fighters = 0;
      inc.party.forEach(function (id) {
        var c = SB.Game.byId(game, id);
        if (!c || !c.alive) return;
        if (c.chem.pain > 0.75) { c.rally = 0; return; } // too hurt: limps home
        fighters++;
        if (SB.dist(c.x, c.z, s.x, s.z) > 8) { if (!c.action || !c.action.called) SB.Creature.sendTo(c, s.x, s.z, game, 80); return; }
        if (c.action && c.action.verb === SB.V.hit) return;
        var foe = guards.reduce(function (b, g) { return !b || SB.dist(g.x, g.z, c.x, c.z) < SB.dist(b.x, b.z, c.x, c.z) ? g : b; }, null);
        if (foe && game.rng.chance(0.6)) SB.Creature.provoke(c, foe, game);
      });
      if (!fighters || game.time - inc.t1 > inc.dur) return D.end(game, inc, false);
    },
    finish: function (game, inc, ok) {
      var hm = home(game);
      (inc.party || []).forEach(function (id) { var c = SB.Game.byId(game, id); if (c && c.alive) { c.rally = 0; SB.Creature.sendTo(c, hm.x, hm.z, game, 60); if (ok) { diary(game, c, "⛓", "helped free the grump camp's captives"); c.stats.grumpsChased = (c.stats.grumpsChased || 0) + 1; SB.Social.checkTitle(game, c); } } });
      (inc.guards || []).forEach(function (id) { var g = SB.Game.byId(game, id); if (g) g.goingHome = true; });
      if (inc.choice === "later") return "";
      if (ok) { SB.Game.addSparks(game, 10); return inc.freed + " smols are free, and they're joining your tribe! +10 ✨"; }
      chron(game, "⛺", "a rescue party was driven off from the grump camp");
      return "the grumps drove the rescue party off. the captives are still there. (clubs and spears would help.)";
    }
  });

  // --- a vision: a smol dreams of three ideas, and the god picks which one comes true
  card({
    id: "vision", minTier: 2, w: 2, gap: 900,
    ok: function (game) { return !!dreamer(game); },
    start: function (game) {
      var d = dreamer(game);
      if (!d) return null;
      var opts = game.rng.shuffle ? game.rng.shuffle(d.can.slice()) : d.can.slice().sort(function () { return game.rng() - 0.5; });
      opts = opts.slice(0, 3);
      return {
        icon: "💭", title: d.c.name + " had a dream", x: d.c.x, z: d.c.z, who: d.c.id, warn: 0,
        text: [d.c.name + " woke up with three ideas tangled together, and can only hold on to one.", "which one should it be?"],
        choices: opts.map(function (x) { return { key: x.id, label: x.icon + " " + x.name, hint: x.desc }; })
      };
    },
    begin: function (game, inc) {
      var c = SB.Game.byId(game, inc.who);
      if (c && c.alive) { SB.Ideas.discover(c, inc.choice, game); diary(game, c, "💭", "dreamed up " + SB.Ideas.BY_ID[inc.choice].name); }
      return D.end(game, inc, true);
    },
    finish: function (game, inc) { var c = SB.Game.byId(game, inc.who), d = SB.Ideas.BY_ID[inc.choice]; return c && d ? c.name + " remembered " + d.icon + " " + d.name + "!" : ""; }
  });
  function dreamer(game) {
    var found = game.culture.found, best = null;
    smols(game).forEach(function (c) {
      if (c.stage < 2 || c.tier < 2) return;
      var can = SB.Ideas.LIST.filter(function (d) { return !found[d.id] && SB.Ideas.canHold(c, d.id) && d.id !== "bigthought"; });
      if (can.length >= 2 && (!best || can.length > best.can.length || (can.length === best.can.length && c.tier > best.c.tier))) best = { c: c, can: can };
    });
    return best;
  }

  // --- small good things that don't need a card
  card({
    id: "bloom", minTier: 0, w: 2, gap: 600, quiet: true,
    ok: function (game) { return game.world.season !== 3; },
    start: function (game) {
      var cs = smols(game); if (!cs.length) return null;
      var c = game.rng.pick(cs), w = game.world, n = 0;
      for (var i = 0; i < 8; i++) { var a = game.rng() * 6.28, d = 1 + game.rng() * 4, x = c.x + Math.sin(a) * d, z = c.z + Math.cos(a) * d; if (SB.World.walkable(w, x, z)) { SB.World.add(w, game, game.rng.pick(["berry", "berry", "apple", "banana"]), x, z, {}); n++; } }
      return { icon: "🍓", title: "a bumper crop", x: c.x, z: c.z, note: "the bushes near " + c.name + " are bursting with berries! 🍓" };
    }
  });

  /* ---------------- running it ---------------- */

  var acc = 0;
  D.tick = function (game, dt) {
    acc += dt;
    if (acc < 1) return;
    var step = acc; acc = 0;
    if (game.offline || !game.tutorial || !game.tutorial.done) return;
    var d = D.state(game);
    var inc = d.active;
    if (inc) {
      if (inc.phase === "ask" && game.time - inc.t0 > AUTO) D.choose(game, inc, D.freeChoice(inc));
      else if (inc.phase === "warn" && game.time >= inc.t1) { inc.phase = "on"; D[inc.id].begin(game, inc); }
      else if (inc.phase === "on" && D[inc.id].tick) D[inc.id].tick(game, inc, step);
      return;
    }
    // raiders from a raid that's over (or from before a reload) head home
    game.creatures.forEach(function (c) { if (c.raider && c.alive && !c.goingHome) c.goingHome = true; });
    if (game.time < d.nextT) return;
    if (SB.Strangers && SB.Strangers.pending(game)) { d.nextT = game.time + 30; return; }
    D.fire(game);
  };

  // deal the next card: weighted, gated by tier and each card's own cooldown
  D.fire = function (game, id) {
    var d = D.state(game), tier = topTier(game), r = game.rng;
    var lastBad = d.lastBad && game.time - d.lastBad < 600;
    var hand = DECK.filter(function (c) {
      if (id) return c.id === id;
      if (!c.w) return false;
      if (tier < c.minTier || (c.maxTier != null && tier > c.maxTier)) return false;
      if (d.last[c.id] != null && game.time - d.last[c.id] < c.gap) return false;
      if (c.bad && lastBad) return false;
      return c.ok(game);
    });
    d.nextT = game.time + r.range(GAP[0], GAP[1]) * pace(game) / (1 + 0.1 * Math.min(4, game.ngPlus || 0));
    if (!hand.length) return null;
    var tot = 0; hand.forEach(function (c) { tot += c.w; });
    var pick = r() * tot, def = hand[0];
    for (var i = 0; i < hand.length; i++) { pick -= hand[i].w; if (pick <= 0) { def = hand[i]; break; } }
    var inc = def.start(game);
    d.last[def.id] = game.time;
    if (!inc) return null;
    inc.id = def.id; inc.t0 = game.time; d.count++;
    if (def.quiet) { SB.bus.emit("incidentNote", { inc: inc }); return inc; }
    if (def.bad) d.lastBad = game.time;
    inc.phase = "ask";
    d.active = inc;
    SB.bus.emit("incident", { inc: inc });
    return inc;
  };
  D.freeChoice = function (inc) { var c = inc.choices.filter(function (x) { return !x.cost; }); return (c[0] || inc.choices[inc.choices.length - 1]).key; };
  D.choose = function (game, inc, key) {
    if (!inc || inc.phase !== "ask") return false;
    var ch = inc.choices.filter(function (c) { return c.key === key; })[0];
    if (!ch) return false;
    if (ch.cost && !SB.Game.spend(game, ch.cost)) return false;
    inc.choice = key;
    inc.phase = inc.warn ? "warn" : "on";
    inc.t1 = game.time + (inc.warn || 0);
    if (!inc.warn) D[inc.id].begin(game, inc);
    SB.bus.emit("incidentChoice", { inc: inc, choice: ch });
    return true;
  };
  D.end = function (game, inc, ok) {
    var d = D.state(game);
    if (d.active !== inc) return;
    d.active = null;
    inc.phase = "done";
    var def = D[inc.id], msg = def.finish ? def.finish(game, inc, ok) : "";
    if (def.pay) def.pay(game, inc);
    d.history.push([Math.round(game.time), inc.id, inc.choice || ""]);
    if (d.history.length > 40) d.history.shift();
    if (def.bad) d.nextT = Math.max(d.nextT, game.time + 150 * pace(game)); // a breather after trouble
    SB.bus.emit("incidentEnd", { inc: inc, ok: ok, text: msg });
  };

  // raids: who fought, who got hurt (counted while one is on)
  SB.bus.on("hit", function (e) {
    var game = SB.Game.current, inc = game && game.dir && game.dir.active;
    if (!inc || inc.id !== "raid" || inc.phase !== "on") return;
    if (e.c && e.c.species === "smol" && e.target && e.target.raider) (inc.heroes || (inc.heroes = {}))[e.c.id] = 1;
    if (e.c && e.c.raider && e.target && e.target.species === "smol") (inc.hurt || (inc.hurt = {}))[e.target.id] = 1;
  });
  SB.bus.on("grumpChased", function (e) {
    var game = SB.Game.current, inc = game && game.dir && game.dir.active;
    if (inc && inc.id === "raid" && e.g && e.g.raider) { inc.chased = (inc.chased || 0) + 1; (inc.heroes || (inc.heroes = {}))[e.c.id] = 1; }
  });
  SB.bus.on("walled", function () {
    var game = SB.Game.current, inc = game && game.dir && game.dir.active;
    if (!inc || inc.id !== "raid" || inc.walled) return;
    inc.walled = true; inc.note = "🪵 the palisade is holding the grumps back!";
    SB.bus.emit("incidentNote", { inc: inc });
  });
  SB.bus.on("death", function (e) {
    var game = SB.Game.current;
    if (game && e.c && e.c.species === "smol" && e.cause !== "old") D.state(game).losses.push(game.time);
  });
})();
