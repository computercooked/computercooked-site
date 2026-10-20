// smol brains — the social life of smols (RimWorld opinions, Dwarf Fortress chronicle, Creatures graves).
// Every smol keeps an opinion of every other smol it has dealt with, built from memories with reasons
// ("hit me", "shared food", "taught me fire") that fade over time, plus how well their temperaments fit.
// Rivals shove and brawl and hold grudges, friends stick up for each other, gossip spreads opinions,
// and from the builder age on smols hold real conversations. Each smol keeps a diary, earns titles,
// mourns its friends at their graves, and the island keeps a chronicle of everything that mattered.
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var SO = SB.Social = {};

  var MAX_MEM = 6, MAX_DIARY = 40, MAX_CHRON = 220;
  SO.FRIEND = 25; SO.BEST = 60; SO.RIVAL = -25; SO.ENEMY = -55;

  function g(c, k) { var v = c.genome && c.genome.genes ? c.genome.genes[k] : null; return v == null ? 0.5 : v; }
  function smol(c) { return c && c.species === "smol"; }
  function game0() { return SB.Game.current; }
  function nm(c) { return c.name + (c.title ? " the " + c.title : ""); }

  /* ---------------- opinions ---------------- */
  // how well two temperaments fit, -15..+20 (family adds a bond)
  function compat(game, a, b) {
    var cache = a._compat || (a._compat = {});
    if (cache[b.id] != null) return cache[b.id];
    var d = 0, ks = ["sociability", "bravery", "playfulness", "curiosity", "chattiness"];
    for (var i = 0; i < ks.length; i++) d += Math.abs(g(a, ks[i]) - g(b, ks[i]));
    var v = Math.round(16 - d / ks.length * 48);
    if (SB.Game.related && SB.Game.related(game, a, b)) v += 18;
    return (cache[b.id] = Math.max(-15, Math.min(30, v)));
  }
  SO.compat = compat;
  // memory: [delta, time, life, key, text]
  SO.remember = function (game, a, b, key, d, txt, life, stack) {
    if (!smol(a) || !smol(b) || a === b || !a.alive) return;
    var ops = a.ops || (a.ops = {}), r = ops[b.id] || (ops[b.id] = { n: b.name, m: [] });
    r.n = b.name;
    var now = game.time;
    if (stack) for (var i = 0; i < r.m.length; i++) if (r.m[i][3] === key) { var m = r.m[i]; m[0] = Math.max(-stack, Math.min(stack, m[0] * fade(m, now) + d)); m[1] = now; return; }
    r.m.push([d, now, life || 1800, key, txt]);
    if (r.m.length > MAX_MEM) { r.m.sort(function (x, y) { return Math.abs(y[0]) * fade(y, now) - Math.abs(x[0]) * fade(x, now); }); r.m.length = MAX_MEM; }
  };
  function fade(m, now) { return Math.max(0, 1 - (now - m[1]) / m[2]); }
  SO.opinion = function (game, a, b) {
    if (!a || !b || a === b) return 0;
    var v = compat(game, a, b), r = a.ops && a.ops[b.id];
    if (r) for (var i = 0; i < r.m.length; i++) v += r.m[i][0] * fade(r.m[i], game.time);
    if (a.partner === b.id) v += 30;
    return Math.max(-100, Math.min(100, Math.round(v)));
  };
  SO.label = function (v, partner) { return partner ? "partner" : v >= SO.BEST ? "best friend" : v >= SO.FRIEND ? "friend" : v <= SO.ENEMY ? "enemy" : v <= SO.RIVAL ? "rival" : v >= 8 ? "acquaintance" : v <= -8 ? "doesn't like" : "neutral"; };
  // why a thinks what it does of b: the strongest live memories
  SO.reasons = function (game, a, b) {
    var out = [], r = a.ops && a.ops[b.id], now = game.time;
    var cp = compat(game, a, b);
    if (SB.Game.related && SB.Game.related(game, a, b)) out.push({ t: "family", v: 18 });
    if (Math.abs(cp) >= 6) out.push({ t: cp > 0 ? "we get along" : "we just don't click", v: cp - (out.length ? 18 : 0) });
    if (r) r.m.forEach(function (m) { var v = Math.round(m[0] * fade(m, now)); if (v) out.push({ t: m[4], v: v }); });
    if (a.partner === b.id) out.push({ t: "my partner", v: 30 });
    return out.sort(function (x, y) { return Math.abs(y.v) - Math.abs(x.v); });
  };
  // everyone a smol has feelings about, strongest first
  SO.relations = function (game, a) {
    var out = [];
    game.creatures.forEach(function (b) {
      if (!b.alive || !smol(b) || b === a) return;
      var v = SO.opinion(game, a, b), known = (a.ops && a.ops[b.id]) || Math.abs(v) >= 15 || a.partner === b.id;
      if (known) out.push({ c: b, v: v, label: SO.label(v, a.partner === b.id) });
    });
    return out.sort(function (x, y) { return Math.abs(y.v) - Math.abs(x.v); });
  };
  SO.rival = function (game, a, b) { return SO.opinion(game, a, b) <= SO.RIVAL; };

  /* ---------------- diary, chronicle, titles ---------------- */
  SO.log = function (game, c, icon, txt) {
    if (!c || !smol(c)) return;
    var d = c.diary || (c.diary = []);
    var last = d[d.length - 1];
    if (last && last[2] === txt && game.time - last[0] < 60) return;
    d.push([Math.round(game.time), icon, txt]);
    if (d.length > MAX_DIARY) d.splice(0, d.length - MAX_DIARY);
  };
  SO.chronicle = function (game, icon, txt) {
    var ch = game.chronicle || (game.chronicle = []);
    ch.push([Math.round(game.time), icon, txt]);
    if (ch.length > MAX_CHRON) ch.splice(0, ch.length - MAX_CHRON);
    SB.bus.emit("chronicle", { icon: icon, text: txt });
  };
  // deeds earn a smol a title; the most remarkable one sticks
  var TITLES = [
    ["grump-chaser", function (c, s) { return s.grumpsChased >= 1; }, 9],
    ["fire-finder", function (c) { return c.invented && c.invented.fire; }, 8],
    ["inventor", function (c) { return c.invented && Object.keys(c.invented).length >= 2; }, 7],
    ["peacemaker", function (c, s) { return s.makeups >= 3; }, 6],
    ["brawler", function (c, s) { return s.fights >= 4; }, 5],
    ["teacher", function (c, s) { return s.taught >= 6; }, 5],
    ["wordsmith", function (c) { return SB.Creature.knownCount(c) >= 18; }, 4],
    ["explorer", function (c) { return c.visited && Object.keys(c.visited).length >= 8; }, 4],
    ["gossip", function (c, s) { return s.gossip >= 8; }, 3],
    ["kind", function (c, s) { return s.gifts >= 5; }, 3],
    ["wise", function (c) { return c.stage >= 4 && c.tier >= 3; }, 2]
  ];
  SO.checkTitle = function (game, c) {
    if (!smol(c)) return;
    var s = c.stats || {}, best = null, bp = c._titleP || 0;
    for (var i = 0; i < TITLES.length; i++) if (TITLES[i][2] > bp && TITLES[i][1](c, s)) { best = TITLES[i]; bp = TITLES[i][2]; }
    if (!best || c.title === best[0]) return;
    c.title = best[0]; c._titleP = best[2];
    SO.log(game, c, "🏆", "became known as " + c.name + " the " + c.title);
    SO.chronicle(game, "🏆", c.name + " became known as “" + c.name + " the " + c.title + "”");
    SB.bus.emit("title", { c: c, title: c.title });
  };
  function stat(c, k, n) { c.stats = c.stats || {}; c.stats[k] = (c.stats[k] || 0) + (n || 1); }

  /* ---------------- reacting to what happens ---------------- */
  var lastBrawl = {};
  SO.onHit = function (game, a, b, kind) {
    if (!smol(a) || !smol(b)) return;
    var punch = kind === "punch";
    SO.remember(game, b, a, punch ? "punched" : "shoved", punch ? -22 : -9, punch ? "punched me" : "shoved me", punch ? 2400 : 1200, punch ? 0 : 28);
    SO.remember(game, a, b, "fought", punch ? -4 : -2, "we fought", 1500, 16);
    b.grudge = { id: a.id, t: game.time };
    stat(a, "fights");
    SO.log(game, a, punch ? "👊" : "💢", (punch ? "punched " : "shoved ") + b.name);
    SO.log(game, b, punch ? "🤕" : "💢", "got " + (punch ? "punched" : "shoved") + " by " + a.name);
    // friends who saw it take sides
    game.creatures.forEach(function (w) {
      if (w === a || w === b || !w.alive || !smol(w) || w.asleep || SB.dist(w.x, w.z, b.x, b.z) > 7) return;
      if (SO.opinion(game, w, b) >= SO.FRIEND) { SO.remember(game, w, a, "hurtfriend", -8, "hurt my friend " + b.name, 1800, 20); if (punch && game.rng.chance(0.35) && g(w, "bravery") > 0.5) { w.grudge = { id: a.id, t: game.time }; w.speech = { text: "hey! leave " + b.name + " alone!", t: 2, kind: "say" }; } }
    });
    // a real brawl between two who can't stand each other is island news (now and then)
    var key = Math.min(a.id, b.id) + ":" + Math.max(a.id, b.id);
    if (punch && SO.rival(game, a, b) && SO.rival(game, b, a) && game.time - (lastBrawl[key] || -1e9) > 600) {
      lastBrawl[key] = game.time;
      SO.chronicle(game, "👊", a.name + " and " + b.name + " got into a brawl" + (a.ops && a.ops[b.id] && a.ops[b.id].m[0] ? " (" + bestReason(game, a, b) + ")" : ""));
      SB.bus.emit("brawl", { a: a, b: b });
    }
    SO.checkTitle(game, a);
  };
  function bestReason(game, a, b) { var r = SO.reasons(game, a, b).filter(function (x) { return x.v < 0; })[0]; return r ? r.t : "old grudges"; }
  SO.onCuddle = function (game, a, b) {
    if (!smol(a) || !smol(b)) return;
    SO.remember(game, a, b, "cuddle", 6, "cuddles", 2400, 24); SO.remember(game, b, a, "cuddle", 6, "cuddles", 2400, 24);
    SO.log(game, a, "💕", "cuddled with " + b.name);
  };
  SO.onGive = function (game, a, b, item) {
    if (!smol(a) || !smol(b)) return;
    var food = item && item.noun === "food";
    SO.remember(game, b, a, food ? "fed" : "gift", food ? 14 : 10, food ? "shared food with me" : "gave me a " + (SB.KINDS[item.kind] ? SB.KINDS[item.kind].label : "thing"), 3000, 30);
    stat(a, "gifts");
    SO.log(game, a, "🎁", "gave " + b.name + " " + (item && SB.KINDS[item.kind] ? "some " + SB.KINDS[item.kind].label : "something"));
    SO.log(game, b, "🎁", a.name + " gave me " + (item && SB.KINDS[item.kind] ? "some " + SB.KINDS[item.kind].label : "something"));
    // making up: a gift to someone you fought with mends things
    if (SO.opinion(game, b, a) < 5 && a.ops && a.ops[b.id] && a.ops[b.id].m.some(function (m) { return m[3] === "fought"; })) { SO.remember(game, b, a, "makeup", 12, "made up after a fight", 2400); stat(a, "makeups"); SO.log(game, a, "🕊", "made up with " + b.name); }
    SO.checkTitle(game, a);
  };
  SO.onTeach = function (game, a, b, ideaName) {
    if (!smol(a) || !smol(b)) return;
    SO.remember(game, b, a, "taught", 8, "taught me " + ideaName, 3600, 24);
    SO.log(game, b, "📖", a.name + " taught me " + ideaName);
    SO.log(game, a, "📖", "taught " + b.name + " " + ideaName);
    SO.checkTitle(game, a);
  };
  SO.onChat = function (game, a, b) {
    if (!smol(a) || !smol(b)) return;
    SO.remember(game, a, b, "chat", 2, "we chat", 1800, 12); SO.remember(game, b, a, "chat", 2, "we chat", 1800, 12);
  };
  SO.onPlay = function (game, a, b) {
    if (!smol(a) || !smol(b)) return;
    SO.remember(game, a, b, "play", 3, "we play together", 1800, 15); SO.remember(game, b, a, "play", 3, "we play together", 1800, 15);
  };

  /* ---------------- death, grief and graves ---------------- */
  SO.onDeath = function (game, c, cause) {
    if (!smol(c) || c.stranger) return;
    var w = game.world, age = Math.round(c.age / 60);
    var title = c.title ? " the " + c.title : "";
    var deeds = (c.diary || []).filter(function (d) { return /invented|became known|chased|taught|joined/.test(d[2]); }).slice(-2).map(function (d) { return d[2]; });
    var why = { starved: "starved", sick: "fell sick", hurt: "was hurt", old: "grew old", cold: "froze", drowned: "drowned" }[cause] || "passed";
    var epitaph = "here lies " + c.name + title + ". " + why + " at " + age + " minutes old." + (deeds.length ? " " + deeds.join(". ") + "." : "");
    try {
      var gr = SB.World.addStructure(w, game, "grave", c.x, c.z, { done: true });
      if (gr) { gr.data = { name: c.name, title: c.title || null, epitaph: epitaph, died: Math.round(game.time), id: c.id }; gr.name = c.name; }
      var graves = w.structures.filter(function (s) { return s.kind === "grave"; });
      if (graves.length > 24) SB.World.removeStructure(w, graves[0]);
    } catch (e) { }
    SO.chronicle(game, cause === "old" ? "🕯" : "🕊", c.name + title + " " + why + ", aged " + age + " min" + (c.gen ? " (gen " + c.gen + ")" : ""));
    // the people who loved it mourn
    var mourners = 0;
    game.creatures.forEach(function (o) {
      if (!o.alive || !smol(o) || o === c) return;
      var v = SO.opinion(game, o, c), fam = SB.Game.related && SB.Game.related(game, o, c);
      var wasPartner = o.partner === c.id;
      if (v >= SO.FRIEND || fam || wasPartner) {
        mourners++;
        o.grief = { id: c.id, name: c.name, until: game.time + (v >= SO.BEST || wasPartner ? 420 : 200), x: c.x, z: c.z };
        SB.Chem.apply(o.chem, { lonely: 0.45, bored: 0.1 });
        if (wasPartner) o.partner = null;
        SO.log(game, o, "🕯", "lost " + (wasPartner ? "my partner " : "") + c.name);
      } else if (v <= SO.ENEMY) SO.log(game, o, "😶", c.name + " is gone. we never got along");
    });
    if (mourners >= 3) SO.chronicle(game, "🕯", mourners + " smols mourned " + c.name);
  };

  /* ---------------- conversations ---------------- */
  // tribe smols swap a few short phrases; builders and up hold real conversations with topics,
  // gossip (which spreads opinions), ideas (which spread know-how), the sky, family, and the old stories
  function pick(game, arr) { return arr[game.rng.int(arr.length)]; }
  function cap(s) { return s; }
  function topDrive(c) { var t = SB.Chem.top(c.chem); return { k: SB.DRIVES[t.i], v: t.v }; }
  function third(game, a, b) {
    var best = null, bv = 0;
    if (!a.ops) return null;
    for (var id in a.ops) {
      var z = SB.Game.byId(game, +id);
      if (!z || !z.alive || z === b || z === a || !smol(z)) continue;
      var v = SO.opinion(game, a, z);
      if (Math.abs(v) > Math.abs(bv) && Math.abs(v) >= 20) { bv = v; best = z; }
    }
    return best ? { z: best, v: bv } : null;
  }
  function weatherLine(game) {
    var w = game.world;
    if (w.night) return pick(game, ["it's so dark tonight", "i don't like the night. grumps", "the stars are out"]);
    if (w.weather.rain > 0.3) return pick(game, ["rain again", "my fur is all wet", "the farm will like this rain"]);
    if (w.season === 3) return pick(game, ["it's so cold", "winter is long this year", "stay near the fire"]);
    if (w.season === 1) return pick(game, ["hot day", "the sun is happy today", "too hot to work"]);
    return pick(game, ["nice day", "the sky is pretty", "smells like flowers"]);
  }
  // the lines of one conversation: [[speaker, text, effect?], ...]
  SO.makeConvo = function (game, a, b) {
    var lv = Math.min(a.tier, b.tier), r = game.rng, L = [], topic = "this and that";
    var rivals = SO.opinion(game, a, b) <= SO.RIVAL || SO.opinion(game, b, a) <= SO.RIVAL;
    var hi = lv >= 4, deep = lv >= 5;
    function add(s, t, fx) { L.push([s, t, fx]); }
    if (rivals) {
      topic = "an argument";
      var why = bestReason(game, a, b);
      add(a, pick(game, hi ? ["you again.", "what do you want, " + b.name + "?", "oh. it's you."] : ["grr", b.name.toLowerCase() + " bad", "go away"]));
      add(b, pick(game, hi ? ["i was here first.", "don't start, " + a.name + ".", "you " + (why === "punched me" ? "punched me!" : "always do this.")] : ["no! you go", "grr!"]));
      add(a, pick(game, hi ? ["you're the worst.", "i'm telling the sky about you.", "everyone thinks you're a grump."] : ["bad!", "grump!"]));
      add(b, pick(game, hi ? ["say that again.", "fine. whatever.", "leave me alone."] : ["hmph", "grr!!"]), { argue: true });
      return { lines: L, topic: topic, argue: true };
    }
    add(a, pick(game, hi ? ["hi " + b.name + "!", b.name + "! how are you?", "hey, " + b.name + "."] : ["hi " + b.name.toLowerCase(), b.name.toLowerCase() + "!"]));
    var need = topDrive(b);
    add(b, need.v > 0.55 ? (hi ? { hunger: "i'm so hungry.", tired: "i'm tired.", sleepy: "i need a nap.", bored: "i'm bored.", lonely: "i was lonely. glad you're here.", cold: "i'm freezing.", sick: "i don't feel good.", fear: "i'm scared.", anger: "i'm grumpy today.", pain: "ouch, i hurt." }[need.k] || "i'm okay." : "me " + (SB.DRIVE_WORDS[SB.DRIVES.indexOf(need.k)] || "ok")) : pick(game, hi ? ["good! you?", "i'm great.", "not bad. " + weatherLine(game) + "."] : ["good", "happy"]));
    var opts = ["weather"];
    var gz = third(game, a, b);
    if (gz) opts.push("gossip", "gossip");
    var teachable = SB.Ideas ? Object.keys(a.ideas).filter(function (k) { return a.ideas[k] >= 1 && SB.Ideas.BY_ID[k] && !SB.Ideas.known(b, k) && SB.Ideas.canHold(b, k); }) : [];
    if (teachable.length) opts.push("idea");
    if ((game.prayers && game.prayers.length) || game.stats.miracles) opts.push("sky");
    if (a.grief) opts.push("grief", "grief");
    if (need.v > 0.55 && need.k === "hunger") opts.push("food");
    if (deep) opts.push("stars", "stars");
    var t = pick(game, opts);
    if (t === "weather") { topic = "the weather"; add(a, weatherLine(game) + (hi ? "." : "")); add(b, pick(game, hi ? ["yeah.", "i know, right?", "mm."] : ["yes", "mm"])); }
    else if (t === "gossip") {
      var z = gz.z, zn = z.name;
      topic = zn;
      if (gz.v < 0) {
        add(a, hi ? pick(game, ["have you seen " + zn + "? " + bestReason(game, a, z).replace(/\bme\b/, "me") + ".", zn + " is such a grump.", "don't trust " + zn + "."]) : zn.toLowerCase() + " bad");
        var bz = SO.opinion(game, b, z);
        if (bz > 15) add(b, hi ? pick(game, [zn + "'s nice to me.", "that's not fair. " + zn + " is my friend."]) : zn.toLowerCase() + " good!", { defend: z });
        else add(b, hi ? pick(game, ["ugh, " + zn + "...", "i heard that too.", "yeah. " + zn + " is the worst."]) : "yes. bad", { spread: z, d: -6 });
      } else {
        add(a, hi ? pick(game, [zn + " is great.", zn + " " + (bestReason(game, a, z) === "shared food with me" ? "shared food with me!" : "is really kind."), "i like " + zn + "."]) : zn.toLowerCase() + " good");
        add(b, hi ? pick(game, ["yeah, " + zn + "'s nice.", "really? huh.", "i should talk to " + zn + " more."]) : "good", { spread: z, d: 4 });
      }
      stat(a, "gossip");
    } else if (t === "idea") {
      var id = pick(game, teachable), d = SB.Ideas.BY_ID[id], word = (game.culture.words[id] || d.name);
      topic = d.name;
      add(a, hi ? pick(game, ["have you tried " + word + "? " + d.desc.split(".")[0] + ".", "i can show you " + word + ".", "you know " + word + "? it's easy."]) : word + "! " + word + "!");
      add(b, hi ? pick(game, ["ooh, show me!", "really? how?", "i'll try it."]) : "ooh", { learn: id });
    } else if (t === "sky") {
      topic = "the sky one";
      var spoiled = (game.spoil || 0) > 0.3;
      add(a, hi ? (spoiled ? "why work? the sky will bring food." : pick(game, ["i prayed and the sky answered.", "do you think the sky watches us?", "the sky one tickled me once."])) : "sky good");
      add(b, hi ? (spoiled ? "...we're getting lazy, aren't we." : pick(game, ["i think the sky likes us.", "sometimes i talk to the sky.", "the sky is big."])) : "sky big");
    } else if (t === "grief") {
      topic = a.grief.name;
      add(a, hi ? "i miss " + a.grief.name + "." : a.grief.name.toLowerCase() + "...");
      add(b, hi ? pick(game, ["me too.", a.grief.name + " was the best.", "i'm sorry."]) : "sad", { comfort: true });
    } else if (t === "food") {
      topic = "food";
      var spot = a.foodSpot;
      add(a, hi ? (spot ? "there's food by the " + (SB.World.depthAt(game.world, spot.x + 2, spot.z) > 0.2 ? "water" : "trees") + ". come on." : "let's find something to eat.") : "food! come");
      add(b, hi ? "thank you!" : "yay", { feed: true });
    } else if (t === "stars") {
      topic = "the stars";
      add(a, pick(game, ["do you ever wonder where we came from?", "the old songs say we fell from the stars.", "why do you think the grumps hate us?"]));
      add(b, pick(game, ["the pod. the first two came in a pod.", "grandma said there was a big ship. and a fight.", "maybe one day we'll go back up there."]));
      if (r.chance(0.5)) add(a, pick(game, ["maybe.", "i'd like to see it.", "one day."]));
    }
    if (hi && r.chance(0.6)) { add(a, pick(game, ["anyway. see you.", "gotta go.", "bye " + b.name + "!"])); add(b, pick(game, ["bye!", "see you.", "later."])); }
    return { lines: L, topic: topic };
  };
  // apply what a line does when it's said
  function lineFx(game, cv, line) {
    var fx = line[2], s = line[0], o = s === cv.a ? cv.b : cv.a;
    if (!fx) return;
    if (fx.spread) SO.remember(game, s, fx.spread, "gossip", fx.d, fx.d < 0 ? "heard bad things" : "heard good things", 1800, 18);
    if (fx.defend) { SO.remember(game, o, s, "defended", -3, "defended " + fx.defend.name, 1200, 9); }
    if (fx.learn && SB.Ideas) SB.Ideas.learn(s, fx.learn, 0.35, game, "talked");
    if (fx.comfort) { SB.Chem.apply(o.chem, { lonely: -0.2 }); SO.remember(game, o, s, "comfort", 8, "comforted me", 2400, 16); }
    if (fx.argue) cv.argued = true;
  }
  SO.startConvo = function (game, a, b) {
    var cv = SO.makeConvo(game, a, b);
    if (!cv.lines.length) return null;
    cv.a = a; cv.b = b; cv.i = 0; cv.t = 0; cv.id = a.id + ":" + b.id;
    a.convo = cv; b.convo = cv;
    [a, b].forEach(function (c) { c.action = null; c.plan = null; });
    return cv;
  };
  SO.convoTick = function (game, c, dt) {
    var cv = c.convo;
    if (!cv || cv.a !== c) return; // the first speaker drives it
    var a = cv.a, b = cv.b;
    if (!a.alive || !b.alive || a.asleep || b.asleep || SB.dist(a.x, a.z, b.x, b.z) > 4.5 || (a.chem.fear > 0.7) || (b.chem.fear > 0.7)) return endConvo(game, cv, true);
    cv.t -= dt;
    if (cv.t > 0) return;
    if (cv.i >= cv.lines.length) return endConvo(game, cv, false);
    var line = cv.lines[cv.i++], s = line[0];
    if (!s.far) { s.speech = { text: line[1], t: 2.6, kind: "say" }; if (SB.Audio && SB.Audio.voice && !game.offline) SB.Audio.voice(line[1], 0.5); }
    lineFx(game, cv, line);
    // face each other
    a.facing = Math.atan2(b.x - a.x, b.z - a.z); b.facing = Math.atan2(a.x - b.x, a.z - b.z);
    cv.t = 2.2 + line[1].length * 0.03;
  };
  function endConvo(game, cv, cut) {
    var a = cv.a, b = cv.b;
    if (a.convo === cv) a.convo = null;
    if (b.convo === cv) b.convo = null;
    if (cut) return;
    if (cv.argued || cv.argue) {
      SO.remember(game, a, b, "argued", -6, "we argued", 1800, 18); SO.remember(game, b, a, "argued", -6, "we argued", 1800, 18);
      SO.log(game, a, "💢", "argued with " + b.name); SO.log(game, b, "💢", "argued with " + a.name);
      SB.Chem.apply(a.chem, { anger: 0.25 }); SB.Chem.apply(b.chem, { anger: 0.25 });
      if (game.rng.chance(0.55)) { a.grudge = { id: b.id, t: game.time }; a.thinkT = 0; } // words turn to shoves
    } else {
      SO.remember(game, a, b, "talk", 4, "nice talks", 2400, 20); SO.remember(game, b, a, "talk", 4, "nice talks", 2400, 20);
      SB.Chem.apply(a.chem, { lonely: -0.25, bored: -0.15 }); SB.Chem.apply(b.chem, { lonely: -0.25, bored: -0.15 });
      SO.log(game, a, "💬", "talked with " + b.name + " about " + cv.topic); SO.log(game, b, "💬", "talked with " + a.name + " about " + cv.topic);
      if (SB.Creature && SB.Creature.habitOf) { SB.Creature.habitOf(a, "social", 0.6); SB.Creature.habitOf(b, "social", 0.6); }
    }
    SO.checkTitle(game, a);
    SB.bus.emit("convo", { a: a, b: b, topic: cv.topic, argue: !!(cv.argued || cv.argue) });
  }
  SO.free = function (c) { return c.alive && smol(c) && !c.asleep && !c.convo && !c.plan && !c.stranger && !c.heldBy && !c.tantrum && (!c.action || c.action.verb === SB.V.idle || c.action.verb === SB.V.wander || c.action.verb === SB.V.talk); };

  /* ---------------- moods: tantrums and inspiration ---------------- */
  function moodTick(game, c) {
    var ch = c.chem;
    if (c.tantrum && game.time > c.tantrum) { c.tantrum = null; SO.log(game, c, "😌", "calmed down"); }
    if (c.grief && game.time > c.grief.until) c.grief = null;
    if (c.tantrum || c.stage < 1) return;
    var worst = Math.max(ch.hunger, ch.lonely, ch.bored, ch.anger, ch.pain, ch.cold);
    c._bad = worst > 0.8 ? (c._bad || 0) + 2 : Math.max(0, (c._bad || 0) - 4);
    if (ch.anger > 0.75 || c._bad > 60) {
      if (game.rng.chance(0.25 + (1 - g(c, "obedience")) * 0.25)) {
        c.tantrum = game.time + 25; c._bad = 0;
        SO.log(game, c, "😤", "threw a tantrum");
        if (!c.far) c.speech = { text: game.rng.pick(["GRAAAH!", "everything is BAD!", "i hate this!!", "nooo!"]), t: 2.2, kind: "say" };
        SB.bus.emit("tantrum", { c: c });
      }
    }
    // a happy, rested smol sometimes has a flash of inspiration (ideas come 3× faster for a minute)
    var best = Math.max(ch.hunger, ch.lonely, ch.bored, ch.pain, ch.fear, ch.cold, ch.sick);
    if (best < 0.25 && c.tier >= 2 && !c.inspired && game.rng.chance(0.004)) {
      c.inspired = 60;
      SO.log(game, c, "💡", "felt inspired");
      SB.bus.emit("inspired", { c: c });
    }
  }

  /* ---------------- tick (every 2 s) ---------------- */
  var acc = 0;
  SO.tick = function (game, dt) {
    acc += dt;
    if (acc < 2) return;
    var step = acc; acc = 0;
    var sm = game.creatures.filter(function (c) { return c.alive && smol(c); });
    for (var i = 0; i < sm.length; i++) {
      var c = sm[i];
      moodTick(game, c);
      SO.checkTitle(game, c);
      // grief: now and then, wander back to the grave and say something
      if (c.grief && SO.free(c) && game.rng.chance(0.06) && !c.far) c.speech = { text: game.rng.pick(["i miss " + c.grief.name, c.grief.name + "...", "bye " + c.grief.name]), t: 2.2, kind: "think" };
      // rivals who cross paths start something (a RimWorld-style social fight)
      if (SO.free(c) && c.stage >= 1 && game.rng.chance(0.1 + c.chem.anger * 0.3)) {
        for (var k = 0; k < sm.length; k++) {
          var r = sm[k];
          if (r === c || r.heldBy || SB.dist(r.x, r.z, c.x, c.z) > 5 || SO.opinion(game, c, r) > SO.RIVAL) continue;
          if (SB.Creature.provoke(c, r, game)) { if (!c.far) c.speech = { text: game.rng.pick(c.tier >= 4 ? ["you again!", "that's it, " + r.name + "!", "you asked for it!"] : ["grr!", "you!", "hmph!"]), t: 1.8, kind: "say" }; break; }
        }
      }
      // strike up a conversation (tribe and up)
      if (c.tier >= 3 && SO.free(c) && game.rng.chance(0.05 + g(c, "chattiness") * 0.06)) {
        var mate = null, md = 4;
        for (var j = 0; j < sm.length; j++) { var o = sm[j]; if (o === c || o.tier < 3 || !SO.free(o)) continue; if (SO.opinion(game, c, o) <= SO.RIVAL && game.rng.chance(0.7)) continue; var d = SB.dist(o.x, o.z, c.x, c.z); if (d < md) { md = d; mate = o; } }
        if (mate) SO.startConvo(game, c, mate);
      }
    }
  };

  /* ---------------- wire up to the rest of the game ---------------- */
  var wired = false;
  SO.wire = function () {
    if (wired) return; wired = true;
    var on = SB.bus.on;
    on("death", function (d) { var game = game0(); if (game) SO.onDeath(game, d.c, d.cause); });
    on("hatch", function (d) {
      var game = game0(); if (!game) return;
      var c = d.c, ps = (c.parents || []).map(function (id) { return SB.Game.byId(game, id); }).filter(Boolean);
      SO.log(game, c, "🐣", ps.length ? "hatched. parents: " + ps.map(function (p) { return p.name; }).join(" and ") : "climbed out into the world");
      ps.forEach(function (p) { SO.log(game, p, "🐣", "had a baby: " + c.name); });
      if (ps.length === 2 && !ps[0].partner && !ps[1].partner) { ps[0].partner = ps[1].id; ps[1].partner = ps[0].id; SO.log(game, ps[0], "💕", "became partners with " + ps[1].name); SO.log(game, ps[1], "💕", "became partners with " + ps[0].name); }
    });
    on("eureka", function (d) {
      var game = game0(); if (!game || !d.first) return;
      var idea = SB.Ideas.BY_ID[d.id];
      (d.c.invented || (d.c.invented = {}))[d.id] = 1;
      SO.log(game, d.c, "💡", "invented " + idea.name + "!");
      SO.chronicle(game, "💡", d.c.name + " invented " + idea.name + " (they call it “" + (d.word || idea.name) + "”)");
      SO.checkTitle(game, d.c);
    });
    on("ideaLost", function (d) { var game = game0(); if (game) SO.chronicle(game, "🌑", "the knowledge of " + (SB.Ideas.BY_ID[d.id] ? SB.Ideas.BY_ID[d.id].name : d.id) + " was lost"); });
    on("tierUp", function (d) { var game = game0(); if (game) SO.chronicle(game, SB.TIERS[d.tier].icon, "the first " + SB.TIERS[d.tier].name + " was born: " + d.c.name); });
    on("strangerJoined", function (d) { var game = game0(); if (!game) return; SO.log(game, d.c, "🧳", "joined the tribe"); SO.chronicle(game, "🧳", d.c.name + ", a stranger from another pod, joined the tribe"); });
    on("grumpChased", function (d) { var game = game0(); if (!game) return; stat(d.c, "grumpsChased"); SO.log(game, d.c, "🏏", "chased off a grump"); SO.chronicle(game, "🏏", d.c.name + " chased a grump off for good"); SO.checkTitle(game, d.c); });
    on("learnWord", function (d) { var game = game0(); if (game && d.c.species === "smol") SO.log(game, d.c, "💬", "learned the word “" + d.word + "”"); });
    on("prayerAnswered", function (d) { var game = game0(); if (game) SO.log(game, d.c, "🙏", d.how === "miracle" ? "prayed, and the sky answered" : "prayed. the sky tickled me"); });
    on("built", function (d) { var game = game0(); if (game && d.st && d.st.done && d.st.kind !== "grave") { var b = (d.st.builders || []).map(function (id) { return SB.Game.byId(game, id); }).filter(Boolean); b.forEach(function (c) { SO.log(game, c, "🔨", "helped build a " + SB.STRUCTS[d.st.kind].label); }); } });
    on("tribe", function (d) { var game = game0(); if (game) SO.chronicle(game, "🔥", "the smols began calling themselves " + d.tribe.name); });
    on("village", function (d) { var game = game0(); if (game) SO.chronicle(game, "🏘", "a village was founded: " + d.village.name); });
    on("chop", function (d) { var game = game0(); if (game && d.c) { stat(d.c, "chopped"); if ((d.c.stats.chopped || 0) % 5 === 1) SO.log(game, d.c, "🪓", "felled a tree"); } });
    on("kin", function (d) { var game = game0(); if (game) SO.log(game, d.a, "💔", "loves " + d.b.name + ", but we're family"); });
    on("tickle", function (d) { var game = game0(); if (game && d.c && d.c.species === "smol" && game.time - (d.c._tkl || -999) > 90) { d.c._tkl = game.time; SO.log(game, d.c, "🪶", "the sky tickled me"); } });
  };
  SO.wire();
})();
