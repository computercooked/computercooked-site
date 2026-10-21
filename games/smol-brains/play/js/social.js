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
    if (Math.abs(cp) >= 6) out.push({ t: cp > 0 ? "we get along" : "we just don't click", v: cp });
    var seen = {};
    if (r) r.m.forEach(function (m) { var v = Math.round(m[0] * fade(m, now)); if (!v) return; if (seen[m[4]]) { seen[m[4]].v += v; return; } out.push(seen[m[4]] = { t: m[4], v: v }); });
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
    ["liar", function (c, s) { return s.liesCaught >= 2; }, 6.5],
    ["fire-finder", function (c) { return c.invented && c.invented.fire; }, 8],
    ["inventor", function (c) { return c.invented && Object.keys(c.invented).length >= 2; }, 7],
    ["peacemaker", function (c, s) { return s.makeups >= 3; }, 6],
    ["brawler", function (c, s) { return s.fights >= 12; }, 5],
    ["teacher", function (c, s) { return s.taught >= 30; }, 5],
    ["wordsmith", function (c) { return SB.Creature.knownCount(c) >= 24; }, 4],
    ["explorer", function (c) { return c.visited && Object.keys(c.visited).length >= 12; }, 4],
    ["thief", function (c, s) { return s.thefts >= 3; }, 4.5],
    ["taboo-breaker", function (c, s) { return s.taboos >= 1; }, 3.5],
    ["gossip", function (c, s) { return s.gossip >= 20; }, 3],
    ["kind", function (c, s) { return s.gifts >= 12; }, 3],
    ["wise", function (c) { return c.stage >= 4 && c.tier >= 4; }, 2]
  ];
  SO.checkTitle = function (game, c) {
    if (!smol(c)) return;
    var s = c.stats || {}, best = null, bp = c._titleP || 0;
    // a title means something: at most two living smols share one
    for (var i = 0; i < TITLES.length; i++) if (TITLES[i][2] > bp && TITLES[i][1](c, s) && holders(game, TITLES[i][0]) < 2) { best = TITLES[i]; bp = TITLES[i][2]; }
    if (!best || c.title === best[0]) return;
    c.title = best[0]; c._titleP = best[2];
    SO.log(game, c, "🏆", "became known as " + c.name + " the " + c.title);
    SO.chronicle(game, "🏆", c.name + " became known as “" + c.name + " the " + c.title + "”");
    SB.bus.emit("title", { c: c, title: c.title });
  };
  function holders(game, t) { var n = 0; game.creatures.forEach(function (o) { if (o.alive && o.title === t) n++; }); return n; }
  function stat(c, k, n) { c.stats = c.stats || {}; c.stats[k] = (c.stats[k] || 0) + (n || 1); }

  /* ---------------- reacting to what happens ---------------- */
  var lastBrawl = {};
  SO.onHit = function (game, a, b, kind) {
    if (!smol(a) || !smol(b)) return;
    var punch = kind === "punch";
    SO.remember(game, b, a, punch ? "punched" : "shoved", punch ? -22 : -9, punch ? "punched me" : "shoved me", punch ? 2400 : 1200, punch ? 0 : 28);
    SO.remember(game, a, b, "fought", punch ? -4 : -2, "we fought", 1500, 16);
    var round = a.grudge && a.grudge.id === b.id ? (a.grudge.n || 1) + 1 : 1;
    b.grudge = round < 3 ? { id: a.id, t: game.time, n: round } : null; // a scuffle is two or three blows, then they back off
    stat(a, "fights");
    a._fightT = game.time;
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
    var close = SO.intimate(game, a, b);
    SO.remember(game, a, b, "cuddle", close ? 6 : 4, close ? "cuddles" : "hugs", 2400, close ? 24 : 16); SO.remember(game, b, a, "cuddle", close ? 6 : 4, close ? "cuddles" : "hugs", 2400, close ? 24 : 16);
    if (SB.Creature && SB.Creature.habitOf) { SB.Creature.habitOf(a, "social", 0.3); SB.Creature.habitOf(b, "social", 0.3); } // closeness breeds chattier kids
    SO.log(game, a, close ? "💕" : "🤗", (close ? "cuddled with " : "hugged ") + b.name);
    if (!close) { jealous(game, a, b); jealous(game, b, a); }
    SO.court(game, a, b, "cuddle");
  };

  /* ---------------- love: partners, courtship, jealousy, break-ups ---------------- */
  // Romance is a few real love stories per generation, not ambient hearts. Grown-ups who are settled fall for one
  // smol (love only rises slowly: chemistry.js), court them (a hug, a gift, a shared meal or a good talk, two or three
  // times, each a diary line), and become partners. Only partners make eggs (creature.js tryBreed). Hearts are for
  // partners and for parents with their own kids; friends hug. A partner who sees a hug they don't like gets jealous;
  // three times in a while (twice with a best friend) is a break-up. Widows grieve, and can love again after a day.
  SO.partnerOf = function (game, c) { var p = c && c.partner != null ? SB.Game.byId(game, c.partner) : null; return p && p.alive ? p : null; };
  SO.parentOf = function (a, b) { return !!(b && b.parents && b.parents.indexOf(a.id) >= 0); };
  // hearts are allowed: partners, and a parent with their own kid (either way round)
  SO.intimate = function (game, a, b) { return !!a && !!b && (a.partner === b.id || b.partner === a.id || SO.parentOf(a, b) || SO.parentOf(b, a)); };
  // could these two ever be a couple?
  SO.eligible = function (game, a, b) {
    return smol(a) && smol(b) && a !== b && a.alive && b.alive && a.stage === 3 && b.stage === 3 && a.sex !== b.sex && !a.stranger && !b.stranger &&
      !(SB.Game.related && SB.Game.related(game, a, b)) && !(SB.Species && SB.Species.compatible && !SB.Species.compatible(a, b));
  };
  // free to fall for someone: no partner (or one who has grown old: an adult can move on, kindly), and not newly widowed
  function free2love(game, c) { var p = SO.partnerOf(game, c); return (!p || (p.stage >= 4 && c.stage === 3)) && !(c.widowT && game.time < c.widowT); }
  // how many good moments a courtship takes (a hug, a gift, a shared meal, a good talk, a game)
  // (a builder or thinker is a catch: two)
  SO.courtSteps = function (a, b) { return Math.max(a.tier || 0, b.tier || 0) >= 4 ? 2 : 3; };
  SO.court = function (game, a, b, how) {
    if (!SO.eligible(game, a, b) || Math.min(a.tier, b.tier) < 3) return false; // courting is for talkers (tribe and on)
    if (a.partner === b.id) return false;
    if (!free2love(game, a) || !free2love(game, b)) return false;
    if (a.chem.love < 0.3 && b.chem.love < 0.3) return false; // just friends
    if (b.chem.love > a.chem.love) { var sw = a; a = b; b = sw; } // the one more in love is the one courting
    if (a.shy && a.shy.id === b.id && game.time < a.shy.t) return false;
    var talkers = Math.min(a.tier, b.tier) >= 3, oba = SO.opinion(game, b, a);
    // blobs and critters (a band of a handful) never say no; talkers do, to someone they barely like or when not in the mood
    if (talkers && (oba < 0 || (b.chem.love < 0.1 && game.rng.chance(0.2)))) {
      // turned down: it stings, and makes them a little shy of trying again
      SO.remember(game, a, b, "turneddown", -8, "turned me down", 2400, 16);
      a.chem.love *= 0.75; a.shy = { id: b.id, t: game.time + 300 };
      SO.log(game, a, "💔", b.name + " turned me down");
      if (!a.far && talkers) a.speech = { text: game.rng.pick(["oh. okay.", "never mind then.", "...right."]), t: 2, kind: "say" };
      SB.bus.emit("turnedDown", { a: a, b: b });
      return false;
    }
    var k = a.court && a.court.id === b.id ? a.court : b.court && b.court.id === a.id ? b.court : null;
    if (k && game.time - k.t < 20) return false; // one good moment at a time
    var n = (k ? k.n : 0) + 1;
    a.court = { id: b.id, n: n, t: game.time }; b.court = { id: a.id, n: n, t: game.time };
    var what = { cuddle: "a cuddle", give: "a gift", meal: "a meal", talk: "a long talk", play: "a game" }[how] || "time together";
    SO.log(game, a, "🌸", "courting " + b.name + " (" + what + ")"); SO.log(game, b, "🌸", a.name + " is courting me (" + what + ")");
    SO.remember(game, a, b, "courting", 4, "sweet on them", 2400, 16); SO.remember(game, b, a, "courted", 4, "sweet on me", 2400, 16);
    var need = SO.courtSteps(a, b), fr = 12; // they have to like each other, at least a bit
    if (n >= need && SO.opinion(game, a, b) >= fr && SO.opinion(game, b, a) >= fr) SO.bond(game, a, b);
    return true;
  };
  SO.bond = function (game, a, b) {
    var old = [a, b].map(function (c) { return SO.partnerOf(game, c); });
    old.forEach(function (o, i) { if (o) SO.breakUp(game, [a, b][i], o, "quiet"); });
    a.partner = b.id; b.partner = a.id; a.court = b.court = null; a.jealous = b.jealous = null;
    SO.log(game, a, "💕", "became partners with " + b.name); SO.log(game, b, "💕", "became partners with " + a.name);
    if (Math.min(a.tier, b.tier) >= 3) SO.chronicle(game, "💕", a.name + " and " + b.name + " are partners now");
    if (SB.Creature && SB.Creature.emote) { SB.Creature.emote(a, "love", 2.4); SB.Creature.emote(b, "love", 2.4); }
    if (SB.FX && !a.far) SB.FX.burst("hearts", (a.x + b.x) / 2, a.y + 1, (a.z + b.z) / 2, 5);
    // a widow's kids don't always take to the new one
    [[a, b], [b, a]].forEach(function (p) {
      if (!p[0].widowed) return;
      game.creatures.forEach(function (k) { if (k.alive && smol(k) && k.stage >= 1 && SO.parentOf(p[0], k) && !SO.parentOf(p[1], k) && game.rng.chance(0.6)) SO.remember(game, k, p[1], "stepparent", -12, "not my real " + (p[1].sex === "f" ? "mum" : "dad"), 3600, 12); });
      p[0].widowed = null;
    });
    SB.bus.emit("partners", { a: a, b: b });
  };
  SO.breakUp = function (game, a, b, why, other) {
    if (a.partner === b.id) a.partner = null;
    if (b.partner === a.id) b.partner = null;
    a.court = b.court = null; a.jealous = b.jealous = null;
    if (why === "quiet") return;
    var hurt = why === "cheated" && other ? "left me for " + other.name : "we split up";
    SO.remember(game, b, a, "leftme", why === "cheated" ? -40 : -20, hurt, 4800);
    SO.remember(game, a, b, "splitup", -12, "we split up", 3600);
    SO.log(game, a, "💔", "split up with " + b.name); SO.log(game, b, "💔", why === "cheated" && other ? a.name + " left me for " + other.name : "split up with " + a.name);
    a.shy = { id: b.id, t: game.time + 1800 }; b.shy = { id: a.id, t: game.time + 1800 };
    SB.Chem.apply(b.chem, { anger: 0.3, lonely: 0.3 }); a.chem.love *= 0.5; b.chem.love *= 0.3;
    if (Math.min(a.tier, b.tier) >= 3) SO.chronicle(game, "💔", a.name + " and " + b.name + " split up" + (why === "cheated" && other ? " (" + other.name + " was involved)" : ""));
    if (why === "cheated" && other && SO.opinion(game, b, other) <= SO.RIVAL && g(b, "bravery") > 0.35) { b.grudge = { id: other.id, t: game.time }; b.thinkT = 0; } // and a brawl, maybe
    SB.bus.emit("breakup", { a: a, b: b, why: why });
  };
  // p sees their partner a hug someone (o) they don't rate: a pang of jealousy. twice in a while is a break-up
  function jealous(game, a, o) {
    var p = SO.partnerOf(game, a);
    if (!p || p === o || p.asleep || SB.dist(p.x, p.z, a.x, a.z) > 8) return;
    if (p.tier < 3 || a.tier < 3 || o.stage < 3 || (SB.Game.related && SB.Game.related(game, a, o)) || SO.opinion(game, p, o) >= SO.FRIEND || !game.rng.chance(0.5)) return; // (talkers only; and not every time)
    SO.remember(game, p, a, "jealous", -15, "hugged " + o.name + " right in front of me", 2400, 30);
    SO.remember(game, p, o, "jealousof", -10, "too close to " + a.name, 2400, 20);
    SB.Chem.apply(p.chem, { anger: 0.3 });
    SO.log(game, p, "😒", "saw " + a.name + " hugging " + o.name);
    if (!p.far && p.tier >= 3) p.speech = { text: game.rng.pick(["hey! " + a.name + "!", "what was that?", "hmph."]), t: 2, kind: "say" };
    var j = p.jealous && game.time - p.jealous.t < 1800 ? p.jealous.n + 1 : 1;
    p.jealous = { n: j, t: game.time };
    if (SO.rival(game, p, o) && g(p, "bravery") > 0.4) { p.grudge = { id: o.id, t: game.time }; p.thinkT = 0; }
    if (j >= 3 || (j >= 2 && SO.opinion(game, a, o) >= SO.BEST)) SO.breakUp(game, a, p, "cheated", o); // again and again, or for a best friend: over
  }
  SO.jealous = jealous;
  // couples who have come to dislike each other drift apart now and then
  function driftApart(game, c) {
    var p = SO.partnerOf(game, c);
    if (!p || c.id > p.id || Math.min(c.tier, p.tier) < 3) return;
    var v = Math.min(SO.opinion(game, c, p), SO.opinion(game, p, c)) - 30; // without the partner bonus
    if (v < -20 && game.rng.chance(0.01)) SO.breakUp(game, c, p, "drift");
  }
  SO.onGive = function (game, a, b, item) {
    if (!smol(a) || !smol(b)) return;
    var food = item && item.noun === "food";
    SO.remember(game, b, a, food ? "fed" : "gift", food ? 14 : 10, food ? "shared food with me" : "gave me a " + (SB.KINDS[item.kind] ? SB.KINDS[item.kind].label : "thing"), 3000, 30);
    stat(a, "gifts");
    SO.log(game, a, "🎁", "gave " + b.name + " " + (item && SB.KINDS[item.kind] ? "some " + SB.KINDS[item.kind].label : "something"));
    SO.log(game, b, "🎁", a.name + " gave me " + (item && SB.KINDS[item.kind] ? "some " + SB.KINDS[item.kind].label : "something"));
    // making up: a gift to someone you fought with mends things
    if (SO.opinion(game, b, a) < 5 && a.ops && a.ops[b.id] && a.ops[b.id].m.some(function (m) { return m[3] === "fought"; })) { SO.remember(game, b, a, "makeup", 12, "made up after a fight", 2400); stat(a, "makeups"); SO.log(game, a, "🕊", "made up with " + b.name); }
    SO.court(game, a, b, food ? "meal" : "give");
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
    if (SB.Creature && SB.Creature.habitOf) { SB.Creature.habitOf(a, "social", 0.2); SB.Creature.habitOf(b, "social", 0.2); }
    SO.court(game, a, b, "play");
  };

  /* ---------------- death, grief and graves ---------------- */
  SO.onDeath = function (game, c, cause) {
    if (!smol(c) || c.stranger) return;
    var w = game.world, age = Math.round(c.age / 60);
    var title = c.title ? " the " + c.title : "";
    var deeds = (c.diary || []).filter(function (d) { return /invented|became known|chased|taught|joined/.test(d[2]); }).slice(-2).map(function (d) { return d[2]; });
    var why = { starved: "starved", sick: "fell sick", hurt: "was hurt", old: "grew old", cold: "froze", drowned: "drowned" }[cause] || "passed";
    var epitaph = "here lies " + c.name + title + ". " + why + " at " + age + " minutes old." + (deeds.length ? " " + deeds.join(". ") + "." : "");
    if (c.body) c.body.epitaph = epitaph; // funeral.js lays it to rest later, with the tribe's own rite
    else try {
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
        if (wasPartner) { o.partner = null; o.widowT = game.time + SB.DAY_LENGTH; o.widowed = c.id; } // can love again after a day of mourning
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
    // something one of them heard about the other: ask. the memory of the one it's about settles it,
    // and a lie that meets the truth costs the liar (mind.js, theory of mind)
    var MI = SB.Mind, cf = MI ? confrontable(a, b) || confrontable(b, a) : null;
    if (cf) {
      var ask = cf.x, sub = cf.y, bel = cf.b, teller = bel.src === "guess" ? null : bel.bn || "someone", claimYou = bel.w.split(sub.name).join("you");
      if (teller) claimYou = claimYou.split(teller + "'s").join("their").split(" " + teller).join(" them");
      topic = teller ? "what " + teller + " said" : "the missing food";
      add(ask, hi ? (teller ? pick(game, [teller + " says " + claimYou + ". is it true?", "is it true, " + sub.name + "? " + teller + " told me " + claimYou + "."]) : "did you take my food, " + sub.name + "?") : sub.name.toLowerCase() + " bad?");
      if (bel.lie) {
        add(sub, hi ? pick(game, ["what? i never did that!", "that never happened. i'd remember!", teller ? teller + " is lying about me." : "no! i didn't touch it."]) : "no! no!", { caught: bel, asker: ask });
        add(ask, hi ? (teller ? pick(game, ["huh. " + teller + " lied to me?", "then why would " + teller + " say that?"]) : "oh. sorry, " + sub.name + ".") : "hmm");
      } else {
        add(sub, hi ? pick(game, ["...yes. i'm sorry. i was hungry.", "okay, fine. it was me."]) : "...sorry", { confess: bel, asker: ask });
        add(ask, hi ? "i knew it." : "hmph");
      }
      return { lines: L, topic: topic, argue: !bel.lie };
    }
    if (rivals) {
      topic = "an argument";
      var why = bestReason(game, a, b);
      add(a, pick(game, hi ? ["you again.", "what do you want, " + b.name + "?", "oh. it's you."] : ["grr", b.name.toLowerCase() + " bad", "go away"]));
      add(b, pick(game, hi ? ["i was here first.", "don't start, " + a.name + ".", "you " + (why === "punched me" ? "punched me!" : "always do this.")] : ["no! you go", "grr!"]));
      add(a, pick(game, hi ? ["you're the worst.", "i'm telling the sky about you.", "everyone thinks you're a grump."] : ["bad!", "grump!"]));
      add(b, pick(game, hi ? ["say that again.", "fine. whatever.", "leave me alone."] : ["hmph", "grr!!"]), { argue: true });
      return { lines: L, topic: topic, argue: true };
    }
    // clashing temperaments (or a bad mood) turn a chat into an insult, like RimWorld's slights
    var oab = SO.opinion(game, a, b);
    var slight = (0.06 + Math.min(0.3, Math.max(0, 6 - compat(game, a, b)) / 50) + a.chem.anger * 0.4) * (oab >= SO.FRIEND ? 0.3 : oab >= 8 ? 0.6 : 1);
    if (oab < SO.BEST && a.partner !== b.id && r.chance(slight)) {
      topic = "an insult";
      add(a, pick(game, hi ? ["hi " + b.name + ".", "oh, " + b.name + "."] : [b.name.toLowerCase() + "..."]));
      add(b, pick(game, hi ? ["hey! what's up?", "hi! nice day!"] : ["hi!"]));
      add(a, pick(game, hi ? ["you talk too much.", "you smell like mud.", "nobody likes your songs.", "your hut is the ugliest one.", "you're slow, you know that?"] : ["you smell", "you dumb", "bleh"]), { insult: true });
      add(b, pick(game, hi ? ["what did you just say?!", "rude!", "take that back!"] : ["hey!!", "grr"]), { argue: true });
      return { lines: L, topic: topic, argue: true };
    }
    add(a, pick(game, hi ? ["hi " + b.name + "!", b.name + "! how are you?", "hey, " + b.name + "."] : ["hi " + b.name.toLowerCase(), b.name.toLowerCase() + "!"]));
    var need = topDrive(b);
    add(b, need.v > 0.55 ? (hi ? { hunger: "i'm so hungry.", tired: "i'm tired.", sleepy: "i need a nap.", bored: "i'm bored.", lonely: "i was lonely. glad you're here.", cold: "i'm freezing.", sick: "i don't feel good.", fear: "i'm scared.", anger: "i'm grumpy today.", pain: "ouch, i hurt." }[need.k] || "i'm okay." : "me " + (SB.DRIVE_WORDS[SB.DRIVES.indexOf(need.k)] || "ok")) : pick(game, hi ? ["good! you?", "i'm great.", "not bad. " + weatherLine(game) + "."] : ["good", "happy"]));
    var opts = [];
    var gz = third(game, a, b);
    if (gz) opts.push("gossip", "gossip");
    var teachable = SB.Ideas ? Object.keys(a.ideas).filter(function (k) { return a.ideas[k] >= 1 && SB.Ideas.BY_ID[k] && !SB.Ideas.known(b, k) && SB.Ideas.canHold(b, k); }) : [];
    if (teachable.length) opts.push("idea");
    var tb = MI ? cultureToShare(a, b) : null;
    if (tb) opts.push("belief", "belief");
    if ((game.prayers && game.prayers.length) || game.stats.miracles) opts.push("sky");
    if (a.grief) opts.push("grief", "grief");
    if (need.v > 0.55 && need.k === "hunger") opts.push("food");
    if (deep) opts.push("stars", "stars");
    var news = (a.diary || []).filter(function (e) { return game.time - e[0] < 900 && /^(felled|helped build|learned the word|invented|chased|gave|had a baby|became partners|taught|joined)/.test(e[2]); });
    if (news.length) opts.push("news", "news");
    var kids = (a.diary || []).filter(function (e) { return /^had a baby: /.test(e[2]); }).map(function (e) { return SB.Game.byId(game, game.creatures.reduce(function (id, o) { return o.name === e[2].slice(12) && o.alive ? o.id : id; }, -1)); }).filter(Boolean);
    if (kids.length) opts.push("kids");
    if (!opts.length || r.chance(0.2)) opts.push("weather");
    var t = pick(game, opts);
    if (t === "news") {
      var n = news[news.length - 1][2];
      topic = { felled: "chopping trees", helped: "building", learned: "words", invented: "inventing", chased: "grumps", gave: "sharing", had: "babies", became: "love", taught: "teaching", joined: "the tribe" }[n.split(" ")[0]] || "news";
      add(a, hi ? "i " + n.replace(/[!.]+$/, "").replace(/“|”/g, "\"") + (r.chance(0.5) ? " today!" : ".") : n.split(" ").slice(0, 2).join(" ") + "!");
      add(b, pick(game, hi ? ["nice!", "wow.", "i saw that!", "good for you.", "huh. cool."] : ["ooh", "good!"]), { cheer: true });
    } else if (t === "kids") {
      var kid = pick(game, kids);
      topic = kid.name;
      add(a, hi ? pick(game, ["my little " + kid.name + " is getting so big.", kid.name + " said a new word today.", "have you met my kid " + kid.name + "?"]) : kid.name.toLowerCase() + " big!");
      add(b, pick(game, hi ? [kid.name + " is so cute.", "they grow up fast.", "you must be proud."] : ["cute!", "aww"]));
    } else if (t === "weather") { topic = "the weather"; add(a, weatherLine(game) + (hi ? "." : "")); add(b, pick(game, hi ? ["yeah.", "i know, right?", "mm."] : ["yes", "mm"])); }
    else if (t === "gossip") {
      var z = gz.z, zn = z.name;
      topic = zn;
      if (gz.v < 0) {
        // a story: something true it saw or heard, or (a disagreeable smol with a grudge) a lie
        var story = MI && hi ? storyAbout(game, a, z) : null;
        var bz = SO.opinion(game, b, z);
        if (story) {
          add(a, story.say);
          var tr = MI.trust(b, a, game);
          if (bz > 15 && tr < 0.7) add(b, pick(game, ["no way. " + zn + " wouldn't do that.", "i don't believe you. " + zn + " is my friend."]), { defend: z });
          else if (tr >= 0.4) add(b, pick(game, ["what? that's awful.", "really? i'll keep an eye on " + zn + ".", "i knew " + zn + " was trouble."]), { spread: z, d: -10, claim: story.claim });
          else add(b, pick(game, ["hmm. i'm not sure i believe you.", "you say a lot of things, " + a.name + "."]), { doubt: a });
        } else {
          add(a, hi ? pick(game, ["have you seen " + zn + "? " + bestReason(game, a, z).replace(/\bme\b/, "me") + ".", zn + " is such a grump.", "don't trust " + zn + "."]) : zn.toLowerCase() + " bad");
          if (bz > 15) add(b, hi ? pick(game, [zn + "'s nice to me.", "that's not fair. " + zn + " is my friend."]) : zn.toLowerCase() + " good!", { defend: z });
          else add(b, hi ? pick(game, ["ugh, " + zn + "...", "i heard that too.", "yeah. " + zn + " is the worst."]) : "yes. bad", { spread: z, d: -6 });
        }
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
    } else if (t === "belief") {
      topic = tb.k === "taboo" || tb.k === "heir" ? "the " + (tb.l || "old stories") : "the sky one";
      add(a, hi ? pick(game, ["did you know? " + tb.w + ".", "everyone knows " + tb.w + ".", "listen. " + tb.w + "."]) : (tb.l || "sky") + "!");
      var take = MI.trust(b, a, game) * (0.6 + g(b, "obedience") * 0.6) - g(b, "curiosity") * 0.2 > 0.3;
      add(b, take ? (hi ? pick(game, ["really? i'll remember that.", "i didn't know that!", "huh. so that's why."]) : "ooh") : (hi ? pick(game, ["that's just a story.", "i don't believe that."]) : "no"), take ? { adopt: tb } : null);
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
    var MI = SB.Mind, trust = MI ? MI.trust(s, o, game) : 0.55;
    if (fx.spread) SO.remember(game, s, fx.spread, "gossip", Math.round(fx.d * (0.4 + trust)), fx.d < 0 ? "heard bad things" : "heard good things", 1800, 18);
    if (fx.claim && MI) MI.believe(s, game, Object.assign({}, fx.claim, { f: fx.claim.f * trust }));
    if (fx.adopt && MI) MI.hear(s, o, game, fx.adopt);
    if (fx.doubt && MI) MI.trustAdj(s, fx.doubt, -0.04);
    if (fx.caught && MI) caught(game, fx.asker, s, fx.caught);
    if (fx.confess && MI) { var tl = fx.confess.by != null ? SB.Game.byId(game, fx.confess.by) : null; if (tl) MI.trustAdj(fx.asker, tl, 0.1); fx.confess.f = 1; fx.confess.src = "seen"; SO.remember(game, fx.asker, s, "confessed", -6, "owned up to it", 1800, 12); }
    if (fx.defend) { SO.remember(game, o, s, "defended", -3, "defended " + fx.defend.name, 1200, 9); }
    if (fx.learn && SB.Ideas) SB.Ideas.learn(s, fx.learn, 0.35, game, "talked");
    if (fx.comfort) { SB.Chem.apply(o.chem, { lonely: -0.2 }); SO.remember(game, o, s, "comfort", 8, "comforted me", 2400, 16); }
    if (fx.argue) cv.argued = true;
    if (fx.insult) {
      SO.remember(game, o, s, "insulted", -14, "insulted me", 2400, 45);
      SO.log(game, o, "💢", s.name + " insulted me");
      SB.Chem.apply(o.chem, { anger: 0.2 });
      if (game.rng.chance(0.25 + g(o, "bravery") * 0.3)) { o.grudge = { id: s.id, t: game.time }; o.thinkT = 0; }
    }
    if (fx.cheer) SO.remember(game, o, s, "cheer", 3, "cheered me on", 1800, 9);
  }
  // x heard (or guessed) something about y, and hasn't asked y yet
  function confrontable(x, y) {
    var bl = x.mind && x.mind.bel;
    if (!bl || x.tier < 3) return null;
    for (var i = 0; i < bl.length; i++) if (bl[i].k === "who" && bl[i].a === y.id && (bl[i].src === "told" || bl[i].src === "guess") && bl[i].f >= 0.15) return { x: x, y: y, b: bl[i] };
    return null;
  }
  // something a believes that b doesn't: a rite, a taboo, a parent's story
  function cultureToShare(a, b) {
    var bl = a.mind && a.mind.bel, best = null;
    if (!bl) return null;
    for (var i = 0; i < bl.length; i++) { var x = bl[i]; if ((x.k === "sup" || x.k === "taboo" || x.k === "heir") && x.f >= 0.4 && !SB.Mind.belief(b, x.c) && (!best || x.f > best.f)) best = x; }
    return best;
  }
  // what a will say about z: a true thing it saw or was told, or, if it's disagreeable enough, a lie
  function storyAbout(game, a, z) {
    var bl = a.mind && a.mind.bel, zn = z.name, i;
    if (bl) for (i = 0; i < bl.length; i++) {
      var x = bl[i];
      if (x.k !== "who" || x.a !== z.id || x.f < 0.4 || x.src === "guess") continue;
      var mine = x.w.replace(/\bmy\b/, a.name + "'s");
      return { say: x.src === "seen" ? "i saw it. " + x.w + "!" : (x.bn || "someone") + " says " + x.w + ".", claim: { c: x.c, k: "who", w: mine, src: "told", bn: a.name, by: x.lie ? x.by : a.id, f: x.f, a: z.id, lie: x.lie } };
    }
    var lieP = (g(a, "grumpiness") - 0.45) * 0.9 + (0.5 - g(a, "affection")) * 0.3;
    if (!game.rng.chance(lieP)) return null;
    var hit = a.ops && a.ops[z.id] && a.ops[z.id].m.some(function (m) { return m[3] === "punched" || m[3] === "shoved"; });
    stat(a, "lies");
    if (!hit && game.rng.chance(0.5)) return { say: zn + " hit me when nobody was looking.", claim: { c: "hitter:" + z.id + ":" + a.id, k: "who", w: zn + " hit " + a.name + " when nobody was looking", src: "told", bn: a.name, by: a.id, f: 0.8, a: z.id, lie: 1 } };
    return { say: "you know what " + zn + " did? stole my food!", claim: { c: "thief:" + z.id + ":" + a.id, k: "who", w: zn + " stole " + a.name + "'s food", src: "told", bn: a.name, by: a.id, f: 0.8, a: z.id, lie: 1 } };
  }
  SO.storyAbout = storyAbout;
  // a lie caught: the one who asked stops trusting the liar, the one lied about is angry, the island talks
  function caught(game, asker, sub, bel) {
    var MI = SB.Mind, liar = bel.by != null ? SB.Game.byId(game, bel.by) : null;
    MI.doubt(asker, bel.c, 0);
    if (bel.src !== "told" || !liar) { SO.remember(game, sub, asker, "accused", -4, "blamed me for nothing", 1200, 8); return; }
    MI.trustAdj(asker, liar, -0.35);
    SO.remember(game, asker, liar, "lied", -18, "lied to me", 3600, 36);
    SO.remember(game, sub, liar, "liedabout", -15, "told lies about me", 3600, 30);
    SO.remember(game, asker, sub, "wronged", 6, "i believed a lie about them", 1800, 12);
    stat(liar, "liesCaught");
    SO.log(game, asker, "🤥", liar.name + " lied to me about " + sub.name);
    SO.log(game, sub, "🤥", liar.name + " has been telling lies about me");
    MI.remember(asker, game, "social", liar.name + " lied to me about " + sub.name, 0.7, null, null, liar.name);
    SO.checkTitle(game, liar);
    SB.bus.emit("lieCaught", { liar: liar, asker: asker, about: sub });
  }
  SO.caught = caught;
  SO.startConvo = function (game, a, b) {
    var cv = SO.makeConvo(game, a, b);
    if (!cv.lines.length) return null;
    cv.a = a; cv.b = b; cv.i = 0; cv.t = 0; cv.id = a.id + ":" + b.id;
    a.convo = cv; b.convo = cv;
    [a, b].forEach(function (c) { c.action = null; if (c.plan) SB.Creature.dropPlan(c, game); });
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
      SO.court(game, a, b, "talk");
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
      driftApart(game, c);
      // smitten and free: spending time near someone they could love counts as courting (social.js court)
      if (c.stage === 3 && (c.tier || 0) >= 3 && c.chem.love >= 0.35 && !c.asleep && !c.convo && free2love(game, c) && game.rng.chance(0.2)) {
        for (var ci = 0; ci < sm.length; ci++) { var o = sm[ci]; if (o !== c && !o.asleep && (o.tier || 0) >= 3 && SB.dist(o.x, o.z, c.x, c.z) < 3 && SO.eligible(game, c, o) && SO.court(game, c, o, "near")) break; }
      }
      // lazing about while everyone else works: the workers notice
      if ((c.duty || 0) > 0.8 && c.stage === 3 && SO.free(c) && game.rng.chance(0.1)) {
        for (var wi = 0; wi < sm.length; wi++) { var wk = sm[wi]; if (wk !== c && wk.plan && wk.plan.kind === "build" && SB.dist(wk.x, wk.z, c.x, c.z) < 7) { SO.remember(game, wk, c, "lazy", -3, "never helps", 1800, 12); break; } }
      }
      // grief: now and then, wander back to the grave and say something
      if (c.grief && SO.free(c) && game.rng.chance(0.06) && !c.far) c.speech = { text: game.rng.pick(["i miss " + c.grief.name, c.grief.name + "...", "bye " + c.grief.name]), t: 2.2, kind: "think" };
      // rivals who cross paths start something (a RimWorld-style social fight)
      if (SO.free(c) && c.stage >= 1 && game.rng.chance(0.2) && game.time - (c._fightT || -999) > 120) {
        for (var k = 0; k < sm.length; k++) {
          var r = sm[k], op;
          if (r === c || r.heldBy || SB.dist(r.x, r.z, c.x, c.z) > 5 || (op = SO.opinion(game, c, r)) > SO.RIVAL) continue;
          // the deeper the hate, the shorter the fuse
          if (!game.rng.chance(0.125 + c.chem.anger * 0.6 + (op <= SO.ENEMY ? 0.3 : 0))) break;
          if (SB.Creature.provoke(c, r, game)) { c._fightT = game.time - 90; /* a whiff can retry soon; a landed blow resets the full cooldown in onHit */ if (!c.far) c.speech = { text: game.rng.pick(c.tier >= 4 ? ["you again!", "that's it, " + r.name + "!", "you asked for it!"] : ["grr!", "you!", "hmph!"]), t: 1.8, kind: "say" }; break; }
        }
      }
      // strike up a conversation (tribe and up)
      if (c.tier >= 3 && SO.free(c) && game.rng.chance(0.05 + g(c, "chattiness") * 0.06)) {
        var mate = null, md = 4;
        for (var j = 0; j < sm.length; j++) { var o = sm[j]; if (o === c || o.tier < 3 || !SO.free(o)) continue; if (SO.opinion(game, c, o) <= SO.RIVAL && game.rng.chance(0.7)) continue; var d = SB.dist(o.x, o.z, c.x, c.z); if (d < md) { md = d; mate = o; } }
        if (mate) SO.startConvo(game, c, mate);
      }
    }
    if (SB.Mind && SB.Mind.cultureTick) SB.Mind.cultureTick(game, step, sm); // beliefs spreading through the crowd
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
