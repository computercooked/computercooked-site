/* smol brains — friends.js ("friends and characters"): the Sims and Stardew side of the people.
   Smols already have opinions of each other, courtship, partners and wishes. This file is about you and them:
     tastes      every smol loves, likes, dislikes or hates each thing, decided for life by its genes and its own dice.
                 you find out by giving. one gift a day counts; a hatch-day gift counts four times.
     hearts      0 to 10 with every smol (not only "your smol"). a daily chat, gifts, granted wishes and chased grumps
                 raise them, and each level opens something: it comes when called, tells you its favourite, follows
                 you, leaves gifts at dawn, teaches you what it knows, fights beside you, and at ten an ember.
     commands    look at a smol in a body and "ask": come, stay, follow me, go home, get <thing>. or call anyone by name.
     weddings    new partners are wed at the fire with the tribe around them. be there in a body, or bless it.
     pranks      playful smols prank each other; kids roll in snow and leaf piles. you can joke, dance and prank too.
     life wish   one big goal per smol from its nature (see a snowfield, catch 10 fish, have 3 children...).
     traits      one named trait at "all grown up", from how it was raised, each with a small real effect.
     matchmaking nudge two grown smols toward each other, once a day.
     festivals   the first day of each season: a dance, a feast, a contest, a gift swap. join in a body for a prize.
     moods       timed moodlets from all of the above, and each smol remembers what you did for it.
   State: game.quests.friends = { h: { smolId: { p, n, k: {kind: taste}, gd, td, ... } }, fol: [ids], fest, wed }
   and one plain field on a smol, c.fr = { life, up, trait, m, fish, keep }. Rolls its own dice (island + smol). */
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var F = SB.Friends = {};
  F.MAX = 10; F.PER = 250;          // hearts, and points in a heart
  F.PTS = { "2": 80, "1": 45, "0": 20, "-1": -20, "-2": -40, talk: 20, tickle: 10, wish: 50, saved: 30, social: 10, fetch: 3 };
  F.HATCHDAY = 4;                   // a gift on its hatch-day counts this many times
  F.MAX_FOL = 3;
  F.FEST_LEN = 360; F.WED_GATHER = 25; F.WED_LEN = 8;
  F.UNLOCK = { 1: "it comes when you call its name", 2: "it tells you its favourite thing", 3: "it will follow you", 4: "it leaves you gifts at dawn", 5: "it teaches you what it knows", 6: "it fights beside you", 8: "a keepsake, and 5 ✨", 10: "best friends: a memory ember" };
  F.WORD = { "2": "loves", "1": "likes", "0": "doesn't mind", "-1": "doesn't like", "-2": "hates" };

  /* ---------------- new things ---------------- */
  var K0 = SB.KINDS;
  if (K0) {
    if (!K0.posy) K0.posy = { noun: "toy", label: "posy", emoji: "💐", r: 0.13, color: 0xf2a0c8, desc: "leaves and berries tied in a bunch. nearly everyone likes one. it cheers the sick and helps a courtship along." };
    if (!K0.knot) K0.knot = { noun: "toy", label: "wedding knot", emoji: "🎀", r: 0.11, color: 0xff8fb0, desc: "a keepsake from a wedding you were at." };
    if (!K0.ribbon) K0.ribbon = { noun: "toy", label: "festival ribbon", emoji: "🎗", r: 0.11, color: 0x6fb8ff, desc: "the best bonk at the autumn log. yours to keep, or to give." };
  }
  F.POSY = { leaves: 2, berry: 1 };

  /* ---------------- small helpers ---------------- */
  function Q(game) { return game.quests || (game.quests = { ch: 0, done: {}, n: {} }); }
  function st(game) {
    var q = Q(game);
    if (!q.friends || typeof q.friends !== "object") q.friends = { h: {}, fol: [] };
    if (!q.friends.h) q.friends.h = {};
    if (!Array.isArray(q.friends.fol)) q.friends.fol = [];
    return q.friends;
  }
  F.state = st;
  function Sv() { return SB.Surv || SB.Survival; }
  function K() { return SB.KINDS || {}; }
  function cur() { return SB.Game && SB.Game.current; }
  function day(game) { return Math.floor((game.time || 0) / SB.DAY_LENGTH) + 1; }
  function label(k) { return K()[k] && K()[k].label ? K()[k].label : k; }
  function emo(k) { return K()[k] && K()[k].emoji ? K()[k].emoji : ""; }
  function hashKey(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function dice(game, key) { return SB.rng((hashKey(key) ^ (game.seed >>> 0)) >>> 0); }
  function gene(c, k) { var v = c && c.genome && c.genome.genes ? c.genome.genes[k] : null; return v == null ? 0.5 : v; }
  function isSmol(c) { return !!c && c.species === "smol" && c.alive && !c.stranger; }
  function tribe(game) { return SB.Game.smols(game).filter(function (c) { return isSmol(c); }); }
  function of(c) { if (!c.fr || typeof c.fr !== "object") c.fr = {}; return c.fr; }
  function speak(c, text, t) { if (c && c.alive) c.speech = { text: text, t: t || 2, kind: "say" }; }
  function emote(c, e, t) { if (c && c.anim && SB.Creature && SB.Creature.emote) SB.Creature.emote(c, e, t || 1.6); }
  function me() { var P = SB.Possess; return P && P.active && P.c && P.c.alive ? P.c : null; }
  function quiet(game) { return !game || game.offline || game.offlineRunning; }
  // the first day and the first night belong to the story: no weddings, festivals or pranks talk over them
  function story(game) { return !!(game.tutorial && game.tutorial.done === false) || !!(SB.FirstNight && SB.FirstNight.active && SB.FirstNight.active(game)); }
  function toast(game, html, at, cls) { if (quiet(game) || !SB.UI || !SB.UI.toast) return; try { SB.UI.toast(html, cls || "", 4600, at || undefined); } catch (e) {} }
  // one line to the player wherever they are: the body's own voice, or a toast from the sky
  function tell(game, text, at) { if (quiet(game)) return; var P = SB.Possess; if (me() && P.say) P.say(text); else toast(game, text, at); }
  function sound(name, vol) { var P = SB.Possess; if (SB.Audio && SB.Audio.play && !(P && P.headless)) { try { SB.Audio.play(name, { vol: vol == null ? 0.7 : vol }); } catch (e) {} } }
  function fx(kind, c, n) { if (SB.FX && SB.FX.burst && c && !c.far) { try { SB.FX.burst(kind, c.x, (c.y || 0) + 1, c.z, n || 6); } catch (e) {} } }
  function sendTo(c, x, z, game, dur) { if (!c || !c.alive || c._pov || c.heldBy != null || !SB.Creature || !SB.Creature.sendTo) return false; try { return SB.Creature.sendTo(c, x, z, game, dur || 14); } catch (e) { return false; } }
  function opinion(game, a, b) { return SB.Social && SB.Social.opinion ? SB.Social.opinion(game, a, b) : 0; }
  function remember(game, a, b, key, d, txt, life, stack) { if (SB.Social && SB.Social.remember) SB.Social.remember(game, a, b, key, d, txt, life || 2400, stack || 0); }
  function diary(game, c, icon, txt) { if (SB.Social && SB.Social.log) SB.Social.log(game, c, icon, txt); }
  function sparks(game, n, c) { if (SB.Game.addSparks) SB.Game.addSparks(game, n, c || null); }
  function addItem(game, c, kind, n) { var left = Sv().add(c, kind, n); if (left > 0 && Sv().spawn) Sv().spawn(game, kind, left, c.x + 0.6, c.z + 0.4); }
  // loose things near a spot, straight off the list (these are rare asks, and never wait on the world's grid)
  function itemsNear(game, x, z, r, fn) { var L = game.world.items, r2 = r * r; for (var i = 0; i < L.length; i++) if (SB.dist2(L[i].x, L[i].z, x, z) <= r2) fn(L[i]); }
  function gatherSpot(game, x, z) {
    var w = game.world, f = SB.World.nearestFire ? SB.World.nearestFire(w, x, z, 40) : null;
    if (f) return { x: f.x + 1.6, z: f.z + 0.8, fire: true };
    return { x: x, z: z, fire: false };
  }

  /* ---------------- moodlets (timed, on any smol) ---------------- */
  // id: [icon, text, how good (-2..2), seconds, what it does to the chemistry once]
  F.MOODS = {
    loved: ["💝", "got my favourite thing", 2, 900, { bored: -0.3, lonely: -0.3 }], liked: ["🎁", "got a nice gift", 1, 600, { bored: -0.15, lonely: -0.15 }],
    yuck: ["🤢", "got a yucky gift", -1, 500, { anger: 0.1 }], chat: ["💬", "had a good chat", 1, 400, { lonely: -0.2 }],
    wed: ["💒", "our wedding day", 2, 2400, { lonely: -0.5, bored: -0.3 }], guest: ["🎉", "went to a wedding", 1, 900, { bored: -0.3, lonely: -0.2 }],
    laugh: ["😆", "had a good laugh", 1, 500, { bored: -0.3 }], pranked: ["😤", "got pranked", -1, 400, { anger: 0.15 }],
    saved: ["🛡", "saved from a grump", 2, 1200, { fear: -0.4 }], fest: ["🎪", "festival day", 1, 1200, { bored: -0.4, lonely: -0.3 }],
    dream: ["🌠", "my dream came true", 2, 3600, { bored: -0.5, lonely: -0.3 }], bday: ["🎂", "my growing-up party", 2, 1200, { lonely: -0.4 }],
    moment: ["🍂", "a silly, happy moment", 1, 400, { bored: -0.25 }], matched: ["💘", "someone has caught my eye", 1, 900, {}],
    posy: ["💐", "flowers by my bed", 1, 900, { sick: -0.1, bored: -0.1 }], blessed: ["✨", "the Lantern blessed us", 2, 1800, {}]
  };
  F.mood = function (game, c, id) {
    var d = F.MOODS[id]; if (!d || !c || !c.alive) return false;
    var f = of(c), m = f.m || (f.m = []), until = Math.round(game.time + d[3]), had = false;
    for (var i = 0; i < m.length; i++) if (m[i][0] === id) { m[i][1] = until; had = true; }
    if (!had) { m.push([id, until]); if (m.length > 6) m.shift(); if (c.chem && SB.Chem && SB.Chem.apply) SB.Chem.apply(c.chem, d[4]); }
    return true;
  };
  // the live ones: [{id, icon, text, v, left}]
  F.moods = function (game, c) {
    var f = c && c.fr, out = [];
    if (!f || !f.m) return out;
    f.m = f.m.filter(function (x) { return F.MOODS[x[0]] && x[1] > game.time; });
    f.m.forEach(function (x) { var d = F.MOODS[x[0]]; out.push({ id: x[0], icon: d[0], text: d[1], v: d[2], left: Math.round(x[1] - game.time) }); });
    return out;
  };
  F.moodScore = function (game, c) { var n = 0; F.moods(game, c).forEach(function (m) { n += m.v; }); return n; };

  /* ---------------- tastes ---------------- */
  var UNI = { honey: 1.2, heartfruit: 1.1, posy: 0.8, mote: 0.5, plush: 0.45, cooked: 0.35, bread: 0.35, ball: 0.3, crystal: 0.3, knot: 0.3, ribbon: 0.3, cherry: 0.2, berry: 0.15, apple: 0.15,
    shroom: -1, log: -0.5, firewood: -0.5, stone: -0.45, clay: -0.4, plank: -0.4, stick: -0.35, leaves: -0.3, fiber: -0.3, flint: -0.3, ore: -0.3, ironore: -0.3, sharpstone: -0.3, vine: -0.3, meat: -0.3, beetle: -0.3, seed: -0.2, sapling: -0.2 };
  var SHINY = { crystal: 1, metal: 1, iron: 1, mote: 1, lens: 1, glowcap: 1 };
  var FAV = ["honey", "apple", "berry", "cherry", "banana", "fish", "cooked", "bread", "carrot", "pumpkin", "nutmeat", "clam", "glowcap", "crystal", "ball", "plush", "posy", "fur"];
  // the one thing it loves best, for life
  F.favourite = function (game, c) {
    var pool = FAV.filter(function (k) { return K()[k]; });
    return pool.length ? pool[Math.floor(dice(game, "fav:" + c.id)() * pool.length) % pool.length] : null;
  };
  // 2 loves, 1 likes, 0 doesn't mind, -1 doesn't like, -2 hates. the same smol always feels the same about a thing
  F.taste = function (game, c, kind) {
    var d = K()[kind]; if (!d || !c) return 0;
    if (kind === F.favourite(game, c)) return 2;
    var s = dice(game, "taste:" + kind + ":" + c.id)() * 1.8 - 0.9 + (UNI[kind] || 0);
    if (d.noun === "toy" || d.noun === "ball") s += (gene(c, "playfulness") - 0.5) * 1.2;
    else if (d.food && d.noun === "food") s += (gene(c, "appetite") - 0.5) * 0.8;
    else if (d.tool) s += (gene(c, "bravery") - 0.5) * 0.6;
    if (SHINY[kind] || d.noun === "mushroom") s += (gene(c, "curiosity") - 0.5) * 1.2;
    s -= (gene(c, "grumpiness") - 0.5) * 0.4;
    var t = s > 0.75 ? 2 : s > 0.2 ? 1 : s > -0.3 ? 0 : s > -0.85 ? -1 : -2;
    if (t < 1 && d.food && d.noun === "food" && F.trait(c) === "greedy") t = 1; // a greedy smol never says no to food
    return t;
  };

  /* ---------------- hearts ---------------- */
  function rec(game, c) { var s = st(game), r = s.h[c.id]; if (!r) r = s.h[c.id] = { p: 0, n: c.name, k: {}, lv: 0 }; if (!r.k) r.k = {}; r.n = c.name; return r; }
  F.rec = rec;
  F.points = function (game, c) { var r = c && st(game).h[c.id]; return r ? r.p || 0 : 0; };
  F.hearts = function (game, c) { return Math.min(F.MAX, Math.floor(F.points(game, c) / F.PER)); };
  F.heartsText = function (game, c) { var h = F.hearts(game, c), out = ""; for (var i = 1; i <= F.MAX; i++) out += h >= i ? "♥" : "♡"; return out; };
  F.known = function (game, c) { var r = c && st(game).h[c.id]; return r ? r.k : {}; };
  F.nextUnlock = function (game, c) { var h = F.hearts(game, c); for (var i = h + 1; i <= F.MAX; i++) if (F.UNLOCK[i]) return { at: i, text: F.UNLOCK[i] }; return null; };
  function note(game, c, text) { var r = rec(game, c), m = r.mem || (r.mem = []); m.push([day(game), text]); if (m.length > 4) m.shift(); }
  F.memories = function (game, c) { var r = c && st(game).h[c.id]; return r && r.mem ? r.mem : []; };
  function levelUp(game, c, lv) {
    var r = rec(game, c), text = F.UNLOCK[lv] || "";
    if (SB.Orders && SB.Orders.addTrust) SB.Orders.addTrust(c, 0.02);
    if (lv === 2) { var fav = F.favourite(game, c); if (fav) { r.k[fav] = 2; text = "it tells you its favourite thing: " + emo(fav) + " " + label(fav); } }
    if (lv === 8) { r.keep = day(game); sparks(game, 5, c); }
    if (lv === 10) {
      var E = SB.Embers, got = false;
      if (E && E.add) { try { got = E.add(game, "bestfriend", c.name + " became your best friend", c); } catch (e) {} }
      if (!got) { sparks(game, 8, c); text = "best friends: 8 ✨"; }
    }
    SB.bus.emit("friendLevel", { c: c, level: lv, text: text });
    emote(c, "love", 2.2); fx("hearts", c, 4);
    tell(game, "💗 " + c.name + ": " + lv + " heart" + (lv > 1 ? "s" : "") + (text ? ". " + text : ""), c);
    sound("achievement", 0.5);
  }
  F.add = function (game, c, pts) {
    if (!game || !isSmol(c) || !pts) return 0;
    var r = rec(game, c), was = r.p || 0;
    r.p = Math.max(0, Math.min(F.MAX * F.PER, was + pts));
    r.seen = day(game);
    var h = Math.floor(r.p / F.PER);
    while ((r.lv || 0) < h) { r.lv = (r.lv || 0) + 1; levelUp(game, c, r.lv); }
    return r.p - was;
  };
  F.isHatchDay = function (game, c) {
    var d = day(game), born = Math.floor((c.born || 0) / SB.DAY_LENGTH) + 1, year = Math.max(1, Math.round(SB.seasonDays(game) * 4));
    return d > born && (d - born) % year === 0;
  };

  /* ---------------- gifts ---------------- */
  var LINES = { "2": ["ooh! %k! best thing!", "%k!! me love!", "for me? %k! yay!"], "1": ["%k. nice!", "oh, %k. thank!", "me like %k"], "0": ["oh. %k. okay", "a %k. thank"], "-1": ["%k? hm. no like", "oh. %k."], "-2": ["%k?! yuck!", "bleh! no %k!"] };
  // to: who gets it. by: the smol you are (or null: the sky's hand). works out the taste, the hearts and the moment
  F.gift = function (game, to, kind, by) {
    if (!game || !isSmol(to) || !K()[kind] || to === by) return null;
    var r = rec(game, to), d = day(game), t = F.taste(game, to, kind), isNew = r.k[kind] == null, counted = r.gd !== d, bday = F.isHatchDay(game, to);
    r.k[kind] = t; r.gifts = (r.gifts || 0) + 1;
    var pts = counted ? F.PTS[String(t)] * (bday ? F.HATCHDAY : 1) : 0;
    if (counted) r.gd = d;
    if (to.stage < 3) bump(to, "spoil");
    var line = LINES[String(t)]; line = line[Math.floor(Math.random() * line.length)].replace("%k", label(kind));
    speak(to, line, 2.4); emote(to, t >= 2 ? "love" : t >= 1 ? "happy" : t <= -2 ? "angry" : t < 0 ? "sad" : "huh", 2);
    F.mood(game, to, t >= 2 ? "loved" : t >= 1 ? "liked" : t < 0 ? "yuck" : "chat");
    if (by && t !== 0) remember(game, to, by, "taste", [-16, -8, 0, 8, 16][t + 2], t >= 2 ? "gave me my favourite thing" : t >= 1 ? "gave me something nice" : "gave me a yucky " + label(kind), 3000, 30);
    if ((kind === "honey" || kind === "posy") && to.chem && to.stage >= 3) to.chem.love = Math.min(1, (to.chem.love || 0) + 0.2); // sweet things turn a head
    if (kind === "posy") F.mood(game, to, "posy");
    if (t >= 1) note(game, to, "you gave me " + label(kind));
    var got = F.add(game, to, pts);
    var msg = (t >= 1 ? "💝 " : t < 0 ? "🙈 " : "🎁 ") + to.name + " " + F.WORD[String(t)] + " " + label(kind) + (bday && counted ? " (its hatch-day: ×" + F.HATCHDAY + ")" : "") + (counted ? (got > 0 ? " · +" + got : got < 0 ? " · " + got : "") : " · one gift a day counts");
    var res = { ok: true, taste: t, pts: got, counted: counted, isNew: isNew, bday: bday, line: line, msg: msg, kind: kind, to: to };
    // the winter gift swap
    var fe = st(game).fest;
    if (by && fe && fe.k === 3 && !fe.done && fe.who === to.id) { var fr = festReward(game, by, t >= 1 ? 2 : t === 0 ? 1 : 0, to); res.msg = msg + ". " + fr; }
    SB.bus.emit("gift", { to: to, by: by || null, kind: kind, taste: t, pts: got, sky: !by, counted: counted });
    return res;
  };
  // the sky's hand: whatever you carried to a smol and it took (or ate) is a gift from you
  var skySeen = {}, skyN = 0;
  function skyGift(game, c, it) {
    if (!it || skySeen[it.id] || !isSmol(c) || c._pov) return;
    skySeen[it.id] = 1; if (++skyN > 80) { skySeen = {}; skyN = 0; }
    var r = F.gift(game, c, it.kind, null);
    if (r && (r.counted || r.isNew)) toast(game, r.msg, c);
  }
  function skyScan(game) {
    var f = game.fh; if (!f || !f.recent || !f.recent.length) return;
    for (var i = 0; i < f.recent.length; i++) {
      var rr = f.recent[i]; if (rr.type === "creature" || skySeen[rr.id]) continue;
      var it = SB.World.itemById(game.world, rr.id);
      if (it && typeof it.heldBy === "number") skyGift(game, SB.Game.byId(game, it.heldBy), it);
    }
  }
  function handled(game, id) { var f = game.fh; return !!(f && f.recent && f.recent.some(function (x) { return x.id === id && x.type !== "creature"; })); }

  /* ---------------- talking ---------------- */
  // what it has to say to you, from how well it knows you and what it remembers
  F.line = function (game, c) {
    var h = F.hearts(game, c), mem = F.memories(game, c), lw = F.lifeOf(game, c), md = F.moods(game, c), r = Math.random();
    if (h < 1 && !mem.length) return ["who you?", "hm? hello", "you new"][Math.floor(r * 3)];
    if (md.length && r < 0.25) return md[md.length - 1].text.replace(/^my /, "me ").replace(/^our /, "we ") + "!";
    if (mem.length && r < 0.55) return mem[mem.length - 1][1] + ". " + (h >= 5 ? "you good friend" : "me remember");
    if (lw && !lw.done && r < 0.8) return "one day me " + lw.def.t;
    return h >= 8 ? "you best friend" : h >= 4 ? "you good. me like you" : h >= 1 ? "you okay" : "hm";
  };
  // a chat in a body. the first one each day is worth a little; now and then it lets slip something it likes
  F.talk = function (game, by, to) {
    if (!game || !isSmol(to) || to === by) return null;
    var r = rec(game, to), d = day(game), first = r.td !== d, hint = null;
    var line = F.line(game, to);
    if (first) {
      r.td = d; F.mood(game, to, "chat");
      var pool = Object.keys(K()).filter(function (k) { return r.k[k] == null && K()[k].noun !== "critter" && k !== "egg" && Math.abs(F.taste(game, to, k)) === 2; });
      if (pool.length && dice(game, "hint:" + to.id + ":" + d)() < 0.45) { hint = pool[Math.floor(dice(game, "hintk:" + to.id + ":" + d)() * pool.length) % pool.length]; r.k[hint] = F.taste(game, to, hint); line = r.k[hint] > 0 ? "me love " + label(hint) : "me no like " + label(hint) + ". yuck"; }
    }
    speak(to, line, 2.6);
    var got = first ? F.add(game, to, F.PTS.talk) : 0;
    SB.bus.emit("friendTalk", { to: to, by: by || null, first: first, hint: hint });
    return { ok: true, first: first, pts: got, hint: hint, line: line, msg: "💬 " + to.name + ": “" + line + "”" + (got > 0 ? " · +" + got : "") };
  };

  /* ---------------- commands, by name ---------------- */
  // will it do what you ask? your hearts with it count, and so does what it thinks of the smol you are
  F.willing = function (game, by, c, need) {
    if (F.hearts(game, c) >= need) return true;
    if (!by || need > 3) return false;
    return c.partner === by.id || opinion(game, c, by) >= (SB.Social ? SB.Social.FRIEND : 25) || !!(SB.Game.related && SB.Game.related(game, c, by));
  };
  F.NEED = { come: 1, stay: 1, home: 1, get: 2, follow: 3 };
  F.following = function (game, c) { return !!c && st(game).fol.indexOf(c.id) >= 0; };
  F.followers = function (game) { var s = st(game), out = []; s.fol = s.fol.filter(function (id) { var c = SB.Game.byId(game, id); if (isSmol(c)) { out.push(c); return true; } return false; }); return out; };
  F.unfollow = function (game, c) { var s = st(game), i = s.fol.indexOf(c.id); if (i >= 0) s.fol.splice(i, 1); return i >= 0; };
  // loose things near a smol that it could be sent for: [kind]
  F.fetchables = function (game, c) {
    var seen = {}, out = [];
    itemsNear(game, c.x, c.z, 26, function (o) {
      var d = K()[o.kind];
      if (!d || d.critter || o.heldBy != null || o.gone || o.kind === "egg" || (o.data && (o.data.pod || o.data.rotten))) return;
      if (!seen[o.kind]) { seen[o.kind] = SB.dist(o.x, o.z, c.x, c.z); out.push(o.kind); }
    });
    return out.sort(function (a, b) { return seen[a] - seen[b]; }).slice(0, 5);
  };
  var jobs = []; // errands under way (not saved: a smol on an errand when you quit just forgets)
  F.errands = function () { return jobs; };
  F.command = function (game, by, c, cmd, arg) {
    if (!game || !by || !isSmol(c) || c === by) return { ok: false, msg: "nobody to ask" };
    if (c.asleep && cmd !== "come") return { ok: false, msg: "💤 " + c.name + " is asleep" };
    var need = F.NEED[cmd];
    if (need == null) return { ok: false, msg: "it doesn't know that one" };
    if (!F.willing(game, by, c, need)) { speak(c, "hm?", 1.6); emote(c, "huh", 1.4); return { ok: false, msg: c.name + " doesn't know you well enough for that (" + need + " ♥)" }; }
    if (cmd !== "follow") c._frStay = 0;
    if (c.asleep) { c.asleep = false; c.inBed = false; c.action = null; }
    if (SB.Creature && SB.Creature.hear) { try { SB.Creature.hear(c, c.name, game, {}); } catch (e) {} } // it hears its own name
    if (cmd === "come") {
      sendTo(c, by.x + 0.9, by.z + 0.6, game, 16); speak(c, "coming!", 1.6);
      SB.bus.emit("friendCommand", { c: c, by: by, cmd: cmd });
      return { ok: true, msg: "📣 " + c.name + ", come! it's on its way" };
    }
    if (cmd === "stay") {
      F.unfollow(game, c); c._frStay = game.time + 45;
      if (SB.Creature && SB.Creature.startAction) { try { SB.Creature.startAction(c, game, SB.V.idle, null); if (c.action) c.action.dur = 45; } catch (e) {} }
      speak(c, "me stay", 1.6);
      SB.bus.emit("friendCommand", { c: c, by: by, cmd: cmd });
      return { ok: true, msg: "✋ " + c.name + ", stay. it waits here" };
    }
    if (cmd === "home") {
      F.unfollow(game, c);
      var n = game.world.T && game.world.T.nest, hm = SB.Society && SB.Society.home ? SB.Society.home(game, c.tribe || 0) : null, hx = hm && hm.x != null ? hm.x : n ? n.x : c.x, hz = hm && hm.z != null ? hm.z : n ? n.z : c.z;
      sendTo(c, hx, hz, game, 30); speak(c, "me go home", 1.6);
      SB.bus.emit("friendCommand", { c: c, by: by, cmd: cmd });
      return { ok: true, msg: "🏠 " + c.name + ", go home. off it goes" };
    }
    if (cmd === "follow") {
      var s = st(game);
      if (F.following(game, c)) { F.unfollow(game, c); speak(c, "okay. bye", 1.6); return { ok: true, msg: c.name + " stops following you" }; }
      if (F.followers(game).length >= F.MAX_FOL) return { ok: false, msg: "three is a crowd: ask someone to stay first" };
      s.fol.push(c.id); c._frStay = 0; speak(c, "me follow!", 1.6); emote(c, "happy", 1.6);
      SB.bus.emit("friendCommand", { c: c, by: by, cmd: cmd });
      return { ok: true, msg: "🐾 " + c.name + ", follow me! it tags along" + (F.hearts(game, c) >= 6 ? ", and it'll fight beside you" : "") };
    }
    // get <thing>: the nearest loose one
    var best = null, bd = 1e9;
    itemsNear(game, c.x, c.z, 30, function (o) { if (o.kind !== arg || o.heldBy != null || o.gone || (o.data && (o.data.pod || o.data.rotten))) return; var dd = SB.dist(o.x, o.z, c.x, c.z); if (dd < bd) { bd = dd; best = o; } });
    if (!best) { speak(c, "no " + label(arg) + " here", 1.8); return { ok: false, msg: c.name + " can't see any " + label(arg) + " around" }; }
    jobs = jobs.filter(function (j) { return j.c !== c; });
    jobs.push({ c: c, k: arg, id: best.id, ph: "go", until: game.time + 40, by: by.id });
    sendTo(c, best.x, best.z, game, 20); speak(c, "get " + label(arg) + "!", 1.6);
    SB.bus.emit("friendCommand", { c: c, by: by, cmd: cmd, kind: arg });
    return { ok: true, msg: "👉 " + c.name + ", get " + label(arg) + "! off it trots" };
  };
  function errandTick(game) {
    for (var i = jobs.length - 1; i >= 0; i--) {
      var j = jobs[i], c = j.c, by = SB.Game.byId(game, j.by);
      if (!isSmol(c) || game.time > j.until) { if (j.ph === "back" && c && c.alive && Sv().spawn) Sv().spawn(game, j.k, 1, c.x, c.z); jobs.splice(i, 1); continue; }
      if (j.ph === "go") {
        var it = SB.World.itemById(game.world, j.id);
        if (!it || it.gone || it.heldBy != null) { speak(c, "gone!", 1.4); jobs.splice(i, 1); continue; }
        if (SB.dist(c.x, c.z, it.x, it.z) < 1.5) {
          if (Sv().pileN && Sv().pileN(it) > 1 && Sv().split) it = Sv().split(game, it);
          SB.World.remove(game.world, it);
          j.ph = "back"; j.until = game.time + 40;
        } else if (!c.action || !c.action.called) sendTo(c, it.x, it.z, game, 20);
      } else {
        if (!by || !by.alive) { if (Sv().spawn) Sv().spawn(game, j.k, 1, c.x, c.z); jobs.splice(i, 1); continue; }
        if (SB.dist(c.x, c.z, by.x, by.z) < 2.2) {
          addItem(game, by, j.k, 1); speak(c, "here!", 1.6); emote(c, "proud", 1.6);
          F.add(game, c, F.PTS.fetch);
          SB.bus.emit("fetched", { c: c, by: by, kind: j.k });
          if (by._pov) tell(game, "📦 " + c.name + " brought you " + (/s$/.test(label(j.k)) ? "" : "a ") + label(j.k));
          jobs.splice(i, 1);
        } else if (!c.action || !c.action.called) sendTo(c, by.x + 0.8, by.z + 0.5, game, 20);
      }
    }
  }
  // everyone who'd come: your friends within earshot
  F.callAll = function (game, by) {
    var n = 0;
    tribe(game).forEach(function (c) { if (c === by || c.asleep || SB.dist(c.x, c.z, by.x, by.z) > 34 || !F.willing(game, by, c, 2)) return; if (sendTo(c, by.x + (n % 3) - 1, by.z + 1 + Math.floor(n / 3), game, 16)) n++; });
    SB.bus.emit("friendCall", { by: by, n: n });
    return { ok: n > 0, n: n, msg: n ? "📣 you call, and " + n + " friend" + (n > 1 ? "s come" : " comes") + " running" : "nobody near knows you well enough to come (2 ♥)" };
  };
  function followTick(game) {
    var c = me(), fol = F.followers(game);
    if (!c || !fol.length) return;
    var grump = null, gd = 9;
    game.creatures.forEach(function (o) { if (o.species !== "grump" || !o.alive || o.gone) return; var d = SB.dist(o.x, o.z, c.x, c.z); if (d < gd) { gd = d; grump = o; } });
    fol.forEach(function (f, i) {
      if (f.asleep || f.heldBy != null || (f._frStay || 0) > game.time) return;
      if (jobs.some(function (j) { return j.c === f; })) return;
      if (grump && F.fights(game, f)) { if (!(f.action && f.action.verb === SB.V.hit) && SB.Creature.provoke) { try { SB.Creature.provoke(f, grump, game); } catch (e) {} } return; }
      var d = SB.dist(f.x, f.z, c.x, c.z);
      if (d > 4.5 && !(f.action && f.action.called && SB.dist(f.action.tx, f.action.tz, c.x, c.z) < 3.5)) sendTo(f, c.x + Math.sin(i * 2.1 + 1) * 1.6, c.z + Math.cos(i * 2.1 + 1) * 1.6, game, 10);
    });
  }
  F.fights = function (game, c) { return F.following(game, c) && (F.hearts(game, c) >= 6 || (F.trait(c) === "brave" && F.hearts(game, c) >= 4)); };

  /* ---------------- what a friend teaches you ---------------- */
  F.learnFrom = function (game, by, c) {
    if (!by || !isSmol(c)) return { ok: false, msg: "" };
    if (F.hearts(game, c) < 5) return { ok: false, msg: c.name + " will teach you at 5 ♥" };
    var r = rec(game, c), d = day(game), I = SB.Ideas;
    if (r.ld === d) return { ok: false, msg: c.name + " has taught you today. ask again tomorrow" };
    var id, w;
    if (I && c.ideas) for (id in c.ideas) if (I.known(c, id) && I.canHold(by, id) && !I.known(by, id)) {
      try { I.learn(by, id, 3, game, "taught"); } catch (e) {}
      if (!I.known(by, id)) { by.ideas = by.ideas || {}; by.ideas[id] = 1; }
      r.ld = d; var nm = I.BY && I.BY[id] ? I.BY[id].name : id;
      SB.bus.emit("friendTaught", { c: c, by: by, idea: id });
      return { ok: true, idea: id, msg: "📖 " + c.name + " showed " + by.name + " how: " + nm };
    }
    var C = SB.Creature;
    if (C && C.knows && c.vocab) for (w in c.vocab) if (C.knows(c, w) && !C.knows(by, w)) {
      C.learnWord(by, w, 3, game);
      if (!C.knows(by, w)) by.vocab[w] = 1;
      r.ld = d;
      SB.bus.emit("friendTaught", { c: c, by: by, word: w });
      return { ok: true, word: w, msg: "📖 " + c.name + " taught " + by.name + " a word: “" + w + "”" };
    }
    var pool = Object.keys(K()).filter(function (k) { return r.k[k] == null && F.taste(game, c, k) === 2; });
    if (pool.length) { r.k[pool[0]] = 2; r.ld = d; return { ok: true, taste: pool[0], msg: c.name + " has nothing new to teach. but it tells you it loves " + label(pool[0]) }; }
    return { ok: false, msg: c.name + " has nothing new to teach " + by.name };
  };

  /* ---------------- pranks, jokes, dances and little moments ---------------- */
  F.PRANKS = [["jumped out at %b and yelled boo", "boo!", "eep!"], ["tickled %b and ran away", "hehehe", "hey!"], ["put a beetle on %b's head", "psst. look up", "aaa! bug!"], ["swapped %b's stick for a wet leaf", "heh", "…a leaf?"], ["made a rude noise right behind %b", "pfffbt", "!!"], ["hid, and let %b look everywhere", "…", "where you go?"]];
  F.prank = function (game, a, b, byPlayer) {
    if (!game || !a || !b || a === b || !b.alive || b.asleep) return null;
    var p = F.PRANKS[Math.floor(Math.random() * F.PRANKS.length)], txt = p[0].replace("%b", b.name);
    var funny = gene(b, "grumpiness") < 0.55 || F.trait(a) === "cheeky" || opinion(game, b, a) >= 25;
    speak(a, p[1], 2); emote(a, "happy", 2); speak(b, funny ? p[2] + " …haha!" : p[2] + " not funny!", 2.6); emote(b, funny ? "huh" : "angry", 2);
    if (a.stage < 3) bump(a, "play");
    if (funny) { remember(game, b, a, "prank", 6, "pranked me. it was funny", 2400, 18); remember(game, a, b, "prank", 4, "fun to prank", 2400, 12); F.mood(game, b, "laugh"); F.mood(game, a, "laugh"); }
    else { remember(game, b, a, "pranked", -8, "pranked me", 2400, 24); F.mood(game, b, "pranked"); F.mood(game, a, "laugh"); }
    diary(game, a, "😜", txt.replace(b.name, b.name)); diary(game, b, "😜", a.name + " " + p[0].replace("%b", "me") + (funny ? ". we laughed" : ". not funny"));
    var res = { ok: true, funny: funny, text: txt, a: a, b: b, msg: "😜 " + a.name + " " + txt + (funny ? ". " + b.name + " laughs" : ". " + b.name + " sulks") };
    SB.bus.emit("prank", { a: a, b: b, funny: funny, text: txt, byPlayer: !!byPlayer });
    return res;
  };
  // things to do to a smol in a body, beyond talk and hug
  F.SOCIALS = { joke: ["😄", "tell a joke"], dance: ["💃", "dance"], prank: ["😜", "play a prank"], cheer: ["🙌", "cheer"] };
  F.social = function (game, by, to, kind) {
    if (!by || !isSmol(to) || to === by || !F.SOCIALS[kind]) return { ok: false, msg: "" };
    if (to.asleep) return { ok: false, msg: "💤 " + to.name + " is asleep" };
    if (SB.dist(by.x, by.z, to.x, to.z) > 7) return { ok: false, msg: "get closer to " + to.name };
    var r = rec(game, to), d = day(game), first = r.sd !== d, good = true, msg;
    if (kind === "prank") { var pr = F.prank(game, by, to, true); good = pr.funny; msg = pr.msg.replace(by.name + " ", "you "); }
    else if (kind === "joke") { good = gene(to, "playfulness") + gene(to, "sociability") > 0.7 || F.hearts(game, to) >= 3; speak(to, good ? "hahaha!" : "…me no get it", 2.2); emote(to, good ? "happy" : "huh", 2); if (good) F.mood(game, to, "laugh"); msg = good ? "😄 " + to.name + " laughs at your joke" : "😶 " + to.name + " doesn't get it"; }
    else if (kind === "dance") { good = F.willing(game, by, to, 2) || gene(to, "playfulness") > 0.6; emote(by, "happy", 3); if (good) { emote(to, "happy", 3); speak(to, "♪ ♪", 2.4); F.mood(game, to, "laugh"); } else { speak(to, "…no dance", 2); emote(to, "huh", 1.6); } msg = good ? "💃 you and " + to.name + " dance" : "🙈 " + to.name + " is too shy to dance with you yet (2 ♥)"; }
    else { emote(by, "proud", 2); emote(to, "happy", 2); speak(to, "yay!", 1.6); msg = "🙌 you cheer for " + to.name; }
    remember(game, to, by, "fun", good ? 5 : -3, good ? "we had fun" : "was a bit much", 2400, 15);
    var got = first ? F.add(game, to, good ? F.PTS.social : -F.PTS.social) : 0;
    if (first) r.sd = d;
    SB.bus.emit("friendSocial", { to: to, by: by, kind: kind, good: good });
    return { ok: true, good: good, pts: got, msg: msg + (got ? " · " + (got > 0 ? "+" : "") + got : "") };
  };
  var ambLast = -999;
  function ambient(game, a, text) { // a toast for a little moment, never more than one every minute and a half, and only if you'd care
    var m = me(), mine = SB.Mine && SB.Mine.get ? SB.Mine.get(game) : null;
    if (m && SB.dist(m.x, m.z, a.x, a.z) < 14) { if (game.time - ambLast > 40) { ambLast = game.time; tell(game, text); } return; }
    if (game.time - ambLast < 90 || (mine && a !== mine && SB.dist(mine.x, mine.z, a.x, a.z) > 12 && Math.random() < 0.6)) return;
    ambLast = game.time; toast(game, text, a);
  }
  function awake(c) { return isSmol(c) && !c.asleep && !c.far && !c._pov && c.heldBy == null && !c.dying; }
  F.autoPrank = function (game) {
    var list = tribe(game).filter(function (c) { return awake(c) && c.stage >= 1 && (gene(c, "playfulness") > 0.6 || F.trait(c) === "cheeky"); });
    if (!list.length) return null;
    var a = list[Math.floor(Math.random() * list.length)], b = null, bd = 9;
    tribe(game).forEach(function (o) { if (o === a || !awake(o)) return; var d = SB.dist(o.x, o.z, a.x, a.z); if (d < bd) { bd = d; b = o; } });
    if (!b) return null;
    var r = F.prank(game, a, b, false);
    if (r) ambient(game, a, r.msg);
    return r;
  };
  // snow play, leaf piles, puddle hops
  F.moment = function (game, c) {
    var w = game.world, list = c ? [c] : tribe(game).filter(function (o) { return awake(o) && (o.stage === 1 || o.stage === 2 || gene(o, "playfulness") > 0.7); });
    if (!list.length) return null;
    c = list[Math.floor(Math.random() * list.length)];
    var rain = w.weather && w.weather.rain > 0.3, s = w.season || 0;
    var m = rain ? ["💦", "hopped in every puddle it could find"] : s === 3 ? ["❄", "rolled in the snow until it was a snowball"] : s === 2 ? ["🍂", "jumped into a pile of leaves"] : s === 0 ? ["🦋", "chased a butterfly in circles"] : ["☀", "flopped in the sun and wiggled"];
    speak(c, "wheee!", 2); emote(c, "happy", 2.4);
    F.mood(game, c, "moment"); if (c.stage < 3) bump(c, "play");
    diary(game, c, m[0], m[1]);
    SB.bus.emit("moment", { c: c, icon: m[0], text: m[1] });
    ambient(game, c, m[0] + " " + c.name + " " + m[1]);
    return { c: c, icon: m[0], text: m[1] };
  };

  /* ---------------- the life wish ---------------- */
  var biomeCache = { seed: null, has: {} };
  function hasBiome(game, id) {
    if (biomeCache.seed !== game.seed) biomeCache = { seed: game.seed, has: {} };
    if (biomeCache.has[id] != null) return biomeCache.has[id];
    var T = game.world && game.world.T, idx = SB.B ? SB.B[id] : null, found = false;
    if (T && T.biome && idx != null) for (var i = 0; i < T.biome.length; i += 3) if (T.biome[i] === idx) { found = true; break; }
    return (biomeCache.has[id] = found);
  }
  function seen(id) { return function (c) { return c.visited && c.visited[id] ? 1 : 0; }; }
  function stat(k) { return function (c) { return (c.stats && c.stats[k]) || 0; }; }
  F.WISHES = [
    { id: "sea", focus: "explorer", icon: "🌊", t: "see the sea", need: 1, n: seen("beach") },
    { id: "snow", focus: "explorer", icon: "❄", t: "see a snowfield", need: 1, n: seen("tundra"), ok: function (c, game) { return hasBiome(game, "tundra"); } },
    { id: "peaks", focus: "explorer", icon: "⛰", t: "see the mountains", need: 1, n: seen("mountain"), ok: function (c, game) { return hasBiome(game, "mountain"); } },
    { id: "roam", focus: "explorer", icon: "🧭", t: "walk 5 kinds of land", need: 5, n: function (c) { return c.visited ? Object.keys(c.visited).length : 0; } },
    { id: "grump", focus: "explorer", icon: "🏏", t: "chase off a grump", need: 1, n: stat("grumpsChased"), ok: function (c) { return gene(c, "bravery") > 0.45; } },
    { id: "kids", focus: "family", icon: "🥚", t: "have 3 children", need: 3, n: function (c, game) { var n = 0; game.creatures.forEach(function (o) { if (o.parents && o.parents.indexOf(c.id) >= 0) n++; }); return n; } },
    { id: "partner", focus: "family", icon: "💕", t: "find a partner", need: 1, n: function (c) { return c.partner != null ? 1 : 0; } },
    { id: "invent", focus: "maker", icon: "💡", t: "invent something", need: 1, n: function (c) { return c.invented ? Object.keys(c.invented).length : 0; }, ok: function (c) { return c.tier >= 2; } },
    { id: "fish", focus: "maker", icon: "🎣", t: "catch 10 fish", need: 10, n: function (c) { return (c.fr && c.fr.fish) || 0; }, ok: function (c) { return c.tier >= 2; } },
    { id: "teach", focus: "thinker", icon: "🎓", t: "teach 5 lessons", need: 5, n: stat("taught"), ok: function (c) { return c.tier >= 2; } },
    { id: "words", focus: "thinker", icon: "💬", t: "know 15 words", need: 15, n: function (c) { return SB.Creature && SB.Creature.knownCount ? SB.Creature.knownCount(c) : 0; } },
    { id: "friends", focus: "friend", icon: "🫂", t: "make 3 friends", need: 3, n: function (c, game) { var n = 0, S = SB.Social; if (!S || !c.ops) return 0; for (var id in c.ops) { var o = SB.Game.byId(game, +id); if (o && o.alive && S.opinion(game, c, o) >= S.FRIEND) n++; } return n; } },
    { id: "gifts", focus: "friend", icon: "🎁", t: "give 6 gifts", need: 6, n: stat("gifts") }
  ];
  F.WISH = {}; F.WISHES.forEach(function (w) { F.WISH[w.id] = w; });
  F.FOCUS = { family: "a family smol", maker: "a maker", explorer: "an explorer", thinker: "a thinker", friend: "a friend to all" };
  // what it cares about most, from its genes
  F.focus = function (game, c) {
    var r = dice(game, "focus:" + c.id), sc = {
      family: gene(c, "affection") + gene(c, "fertility"), maker: gene(c, "dexterity") + gene(c, "curiosity") * 0.8, explorer: gene(c, "curiosity") + gene(c, "bravery"),
      thinker: gene(c, "learnRate") + gene(c, "chattiness") * 0.8, friend: gene(c, "sociability") + gene(c, "playfulness")
    }, best = null, bv = -1;
    for (var k in sc) { var v = sc[k] + r() * 0.5; if (v > bv) { bv = v; best = k; } }
    return best;
  };
  // its one big wish: { def, n, need, done } (picked the first time anyone asks; never one it has already done)
  F.lifeOf = function (game, c) {
    if (!game || !c || c.species !== "smol" || c.stranger) return null;
    var f = of(c);
    if (!f.life || !F.WISH[f.life.id]) {
      var fo = F.focus(game, c), open = F.WISHES.filter(function (w) { return (!w.ok || w.ok(c, game)) && w.n(c, game) < w.need; });
      var pool = open.filter(function (w) { return w.focus === fo; });
      if (!pool.length) pool = open;
      if (!pool.length) pool = [F.WISH.words];
      f.life = { id: pool[Math.floor(dice(game, "life:" + c.id)() * pool.length) % pool.length].id };
    }
    var def = F.WISH[f.life.id], n = Math.min(def.need, def.n(c, game));
    return { def: def, n: f.life.done ? def.need : n, need: def.need, done: !!f.life.done };
  };
  function lifeCheck(game, c) {
    var lw = F.lifeOf(game, c);
    if (!lw || lw.done || lw.n < lw.need || !c.alive) return false;
    var f = of(c), E = SB.Embers, ember = false, pay = SB.Mine && SB.Mine.is && SB.Mine.is(game, c) ? 10 : 6;
    f.life.done = day(game);
    if (E && E.add) { try { ember = E.add(game, "lifewish", c.name + "'s life wish came true", c); } catch (e) {} }
    if (!ember) sparks(game, pay, c);
    if (c.lifespan) c.lifespan = Math.round(c.lifespan * 1.05); // a full heart lives a little longer
    F.mood(game, c, "dream"); emote(c, "love", 3); speak(c, "me did it!", 3); fx("sparkle", c, 16);
    diary(game, c, "🌠", "my life wish came true: " + lw.def.t);
    if (SB.Social && SB.Social.chronicle && !quiet(game)) SB.Social.chronicle(game, "🌠", c.name + "'s life wish came true: to " + lw.def.t);
    SB.bus.emit("lifeWish", { c: c, wish: lw.def, ember: !!ember, sparks: ember ? 0 : pay });
    toast(game, "🌠 " + c.name + "'s life wish came true: to " + lw.def.t + "! " + (ember ? "a memory ember" : "+" + pay + " ✨"), c);
    sound("achievement", 0.6);
    return true;
  }
  F.lifeCheck = lifeCheck;

  /* ---------------- traits, from how it was raised ---------------- */
  F.TRAITS = {
    brave: { icon: "🦁", why: "it stood up for itself as a kid", does: "fear leaves it fast, and it fights beside a friend sooner" },
    gentle: { icon: "🕊", why: "it was raised with tickles, never a tap", does: "everyone it talks to warms to it" },
    clever: { icon: "🦉", why: "it was taught a lot when it was small", does: "it wakes up inspired every morning" },
    greedy: { icon: "🍯", why: "it was spoiled with gifts and treats", does: "any food is a good gift. it's always peckish, and gives nothing back" },
    cheeky: { icon: "😜", why: "it played all day as a kid", does: "it pranks twice as much, and its pranks always land" },
    tough: { icon: "🪨", why: "it took its knocks growing up", does: "pain fades from it fast" },
    kind: { icon: "💛", why: "it shared what it had as a kid", does: "it leaves you gifts sooner, and more often" },
    curious: { icon: "🔍", why: "it wandered far as a kid", does: "it turns up with something it found, some mornings" }
  };
  function bump(c, k, n) { var f = of(c), u = f.up || (f.up = {}); u[k] = (u[k] || 0) + (n || 1); }
  F.upbringing = function (c) { return (c && c.fr && c.fr.up) || {}; };
  F.trait = function (c) { return c && c.fr && F.TRAITS[c.fr.trait] ? c.fr.trait : null; };
  F.scoreTraits = function (game, c) {
    var u = F.upbringing(c), r = dice(game, "trait:" + c.id), ex = c.visited ? Object.keys(c.visited).length : 0;
    function n(k) { return u[k] || 0; }
    return {
      brave: n("fight") * 2 + (ex >= 4 ? 2 : 0) + gene(c, "bravery") * 4 + r(), gentle: n("tickle") * 1.2 - n("tap") * 2 - n("fight") + gene(c, "affection") * 4 + r(),
      clever: n("word") * 1.5 + n("taught") * 2 + gene(c, "learnRate") * 4 + r(), greedy: n("spoil") * 2 + gene(c, "appetite") * 3.5 + r(),
      cheeky: n("play") * 3 + gene(c, "playfulness") * 4 + r(), tough: n("tap") * 2 + gene(c, "toughness") * 3.5 + r(),
      kind: n("share") * 3 + gene(c, "sociability") * 3.5 + r(), curious: ex * 0.8 + gene(c, "curiosity") * 4 + r()
    };
  };
  F.grantTrait = function (game, c, announce) {
    if (!c || c.species !== "smol") return null;
    var f = of(c); if (F.TRAITS[f.trait]) return f.trait;
    var sc = F.scoreTraits(game, c), best = null, bv = -1e9;
    for (var k in sc) if (sc[k] > bv) { bv = sc[k]; best = k; }
    f.trait = best;
    if (announce) {
      diary(game, c, F.TRAITS[best].icon, "grew up " + best + ": " + F.TRAITS[best].why.replace(/\bit\b/g, "I").replace("its", "my").replace("itself", "myself"));
      toast(game, "🎂 " + c.name + " is all grown up, and grew up " + F.TRAITS[best].icon + " <b>" + best + "</b>: " + F.TRAITS[best].why, c);
    }
    SB.bus.emit("trait", { c: c, trait: best, announced: !!announce });
    return best;
  };
  // a hatchling's one clear quirk, read straight from its genes
  F.quirk = function (c) {
    if (!c || c.stage > 1) return null;
    var q = [["clingy", gene(c, "affection")], ["wild", gene(c, "bravery")], ["sleepy", gene(c, "sleepiness")], ["chatty", gene(c, "chattiness")], ["shy", 1 - gene(c, "sociability")], ["nosy", gene(c, "curiosity")]];
    q.sort(function (a, b) { return b[1] - a[1]; });
    return q[0][0];
  };
  // the growing-up party: family gathers round
  function party(game, c) {
    var n = 0;
    tribe(game).forEach(function (o) {
      if (o === c || n >= 5 || !awake(o) || SB.dist(o.x, o.z, c.x, c.z) > 30) return;
      if (!(SB.Game.related && SB.Game.related(game, o, c)) && opinion(game, o, c) < 25) return;
      if (sendTo(o, c.x + Math.sin(n * 1.3) * 1.5, c.z + Math.cos(n * 1.3) * 1.5, game, 12)) { n++; speak(o, "🎂 yay " + c.name + "!", 2.4); }
    });
    F.mood(game, c, "bday"); speak(c, "me big now!", 2.4);
    SB.bus.emit("party", { c: c, guests: n });
    return n;
  }
  F.party = party;

  /* ---------------- matchmaking ---------------- */
  F.matchWhy = function (game, a, b) {
    var S = SB.Social;
    if (!S || !a || !b || a === b) return "pick two smols";
    if (!S.eligible(game, a, b)) return a.stage !== 3 || b.stage !== 3 ? "both have to be grown-ups, and not elders" : a.sex === b.sex ? "these two would only ever be friends" : "these two are family";
    if (S.partnerOf(game, a) || S.partnerOf(game, b)) return "one of them has a partner already";
    if (st(game).md === day(game)) return "one nudge a day. let it work";
    return "";
  };
  F.candidates = function (game, a) { var S = SB.Social; if (!S) return []; return tribe(game).filter(function (b) { return b !== a && S.eligible(game, a, b) && !S.partnerOf(game, a) && !S.partnerOf(game, b); }).sort(function (x, y) { return opinion(game, a, y) - opinion(game, a, x); }).slice(0, 4); };
  F.match = function (game, a, b) {
    var why = F.matchWhy(game, a, b);
    if (why) return { ok: false, msg: why };
    var s = st(game); s.md = day(game);
    [[a, b], [b, a]].forEach(function (p) {
      p[0].chem.love = Math.max(p[0].chem.love || 0, 0.5); p[0].shy = null;
      remember(game, p[0], p[1], "matched", 10, "the Lantern thinks we'd get along", 3000, 20);
      F.mood(game, p[0], "matched"); emote(p[0], "love", 2);
      diary(game, p[0], "💘", "can't stop thinking about " + p[1].name);
    });
    var mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
    sendTo(a, mx + 0.5, mz, game, 20); sendTo(b, mx - 0.5, mz, game, 20);
    s.match = { a: a.id, b: b.id, until: Math.round(game.time + 60) };
    SB.bus.emit("matched", { a: a, b: b });
    return { ok: true, msg: "💘 you nudge " + a.name + " and " + b.name + " toward each other. the rest is up to them" };
  };
  function matchTick(game) {
    var s = st(game), m = s.match; if (!m) return;
    var a = SB.Game.byId(game, m.a), b = SB.Game.byId(game, m.b);
    if (!isSmol(a) || !isSmol(b) || game.time > m.until) { s.match = null; return; }
    if (SB.dist(a.x, a.z, b.x, b.z) < 2.6) {
      s.match = null;
      var ok = false; try { ok = SB.Social.court(game, a, b, "talk"); } catch (e) {}
      speak(a, "…hi", 2); speak(b, "hi!", 2);
      SB.bus.emit("matchMet", { a: a, b: b, courting: !!ok });
    }
  }

  /* ---------------- weddings ---------------- */
  F.wedding = function (game) { return st(game).wed || null; };
  function startWedding(game, a, b) {
    var s = st(game);
    if (s.wed || !isSmol(a) || !isSmol(b)) return null;
    var sp = gatherSpot(game, (a.x + b.x) / 2, (a.z + b.z) / 2), n = 0;
    s.wed = { a: a.id, b: b.id, t: Math.round(game.time), x: sp.x, z: sp.z, fire: sp.fire ? 1 : 0, ph: 0, bless: 0 };
    sendTo(a, sp.x + 0.5, sp.z, game, 24); sendTo(b, sp.x - 0.5, sp.z, game, 24);
    tribe(game).filter(function (o) { return o !== a && o !== b && awake(o) && SB.dist(o.x, o.z, sp.x, sp.z) < 45; })
      .sort(function (x, y) { return SB.dist2(x.x, x.z, sp.x, sp.z) - SB.dist2(y.x, y.z, sp.x, sp.z); }).slice(0, 10)
      .forEach(function (o) { if (sendTo(o, sp.x + Math.sin(n * 0.7) * 2.6, sp.z + Math.cos(n * 0.7) * 2.6, game, 24)) n++; });
    SB.bus.emit("weddingStart", { a: a, b: b, x: sp.x, z: sp.z, invited: n });
    tell(game, "💒 " + a.name + " and " + b.name + " are getting wed" + (sp.fire ? " at the fire" : "") + "! the tribe is gathering. be there, or bless them", a);
    return s.wed;
  }
  F.startWedding = startWedding;
  // bless it: a tickle from the sky on either of them, or the button in a body
  F.bless = function (game) {
    var w = st(game).wed; if (!w || w.bless) return { ok: false, msg: w ? "it's blessed already" : "no wedding to bless" };
    w.bless = 1;
    var a = SB.Game.byId(game, w.a), b = SB.Game.byId(game, w.b);
    [a, b].forEach(function (c) { if (isSmol(c)) { F.mood(game, c, "blessed"); F.add(game, c, 20); fx("sparkle", c, 12); } });
    SB.bus.emit("weddingBlessed", { a: a, b: b });
    sound("chime", 0.6);
    return { ok: true, msg: "✨ the Lantern blesses " + (a ? a.name : "them") + " and " + (b ? b.name : "them") };
  };
  function wedTick(game) {
    var s = st(game), w = s.wed; if (!w) return;
    var a = SB.Game.byId(game, w.a), b = SB.Game.byId(game, w.b);
    if (!isSmol(a) || !isSmol(b) || a.partner !== b.id) { s.wed = null; return; }
    if (w.ph === 0) {
      var both = SB.dist(a.x, a.z, w.x, w.z) < 4 && SB.dist(b.x, b.z, w.x, w.z) < 4;
      if (!both && game.time - w.t < F.WED_GATHER) return;
      // the vows
      w.ph = 1; w.t1 = Math.round(game.time);
      var guests = tribe(game).filter(function (o) { return o !== a && o !== b && !o.asleep && SB.dist(o.x, o.z, w.x, w.z) < 9; });
      var m = me(), there = !!m && SB.dist(m.x, m.z, w.x, w.z) < 11; // (your own wedding counts)
      var q = Math.min(4, Math.floor(guests.length / 2)) + (w.fire ? 1 : 0) + (w.bless ? 2 : 0) + (there ? 1 : 0), word = q >= 6 ? "grand" : q >= 4 ? "lovely" : q >= 2 ? "sweet" : "quiet";
      w.q = q; w.n = guests.length;
      [[a, b], [b, a]].forEach(function (p) {
        F.mood(game, p[0], "wed"); emote(p[0], "love", 4); speak(p[0], "💍", 3); fx("hearts", p[0], 8);
        remember(game, p[0], p[1], "wedding", 8 + q * 2, "our " + word + " wedding", 6000, 30);
        of(p[0]).keep = { n: p[1].name, d: day(game), q: word };
        diary(game, p[0], "💒", "wed " + p[1].name + ". a " + word + " wedding, " + guests.length + " came");
      });
      guests.forEach(function (o, i) {
        F.mood(game, o, "guest"); emote(o, "happy", 3); if (i < 5) speak(o, ["yay!", "aww", "hooray!", "♪", "💕"][i], 2.4);
        if (i < 8) { remember(game, o, a, "wedguest", 5, "danced at their wedding", 3000, 10); remember(game, o, b, "wedguest", 5, "danced at their wedding", 3000, 10); }
      });
      if (SB.Social && SB.Social.chronicle) SB.Social.chronicle(game, "💒", a.name + " and " + b.name + " had a " + word + " wedding" + (w.fire ? " by the fire" : "") + " (" + guests.length + " came" + (w.bless ? ", and the Lantern blessed it" : "") + ")");
      if (there) {
        addItem(game, m, "knot", 1); F.add(game, a, 30); F.add(game, b, 30); w.there = 1;
        note(game, a, "you came to my wedding"); note(game, b, "you came to my wedding");
      }
      s.weds = (s.weds || 0) + 1;
      SB.bus.emit("wedding", { a: a, b: b, quality: q, word: word, guests: guests.length, blessed: !!w.bless, attended: there });
      tell(game, "💒 " + a.name + " and " + b.name + " are wed! a " + word + " wedding, " + guests.length + " came" + (there ? ". you keep a 🎀 wedding knot" : ""), a);
      sound("achievement", 0.6);
      return;
    }
    if (game.time - w.t1 > F.WED_LEN) { s.wed = null; SB.bus.emit("weddingEnd", { a: a, b: b }); }
  }

  /* ---------------- festivals: the first day of every season ---------------- */
  F.FESTS = [
    { id: "dance", icon: "🌸", name: "the blossom dance", join: "join the blossom dance", how: "dance by the fire. look at a friend first and you dance together" },
    { id: "feast", icon: "🍲", name: "the big summer feast", join: "bring your food to the feast", how: "hold some food and add it to the pot. cooked food makes a better feast" },
    { id: "contest", icon: "🪵", name: "the autumn log-bonk", join: "take your turn at the log", how: "bonk the log as hard as you can. the best bonk wins the ribbon" },
    { id: "swap", icon: "🎁", name: "the winter gift swap", join: "who is my secret friend?", how: "give your secret friend something they like before the fire burns down" }
  ];
  F.fest = function (game) { var f = st(game).fest; return f && game.time < f.until ? f : null; };
  F.nextFest = function (game) {
    var sd = SB.seasonDays(game), t = (game.time || 0) / SB.DAY_LENGTH, nextAt = (Math.floor(t / sd + 1e-9) + 1) * sd;
    return { def: F.FESTS[(Math.floor(t / sd + 1e-9) + 1) % 4], days: Math.round((nextAt - t) * 10) / 10 };
  };
  F.startFest = function (game, k) {
    var s = st(game), def = F.FESTS[k], list = tribe(game);
    if (!def || list.length < 3 || story(game)) return null;
    var n = game.world.T && game.world.T.nest, sp = gatherSpot(game, n ? n.x : list[0].x, n ? n.z : list[0].z);
    s.fest = { k: k, day: day(game), t: Math.round(game.time), until: Math.round(game.time + F.FEST_LEN), x: sp.x, z: sp.z, done: 0, gT: 0 };
    if (k === 3) { var m = me(), pool = list.filter(function (c) { return c !== m; }); s.fest.who = pool[Math.floor(dice(game, "swap:" + day(game))() * pool.length) % pool.length].id; }
    festGather(game);
    SB.bus.emit("festival", { k: k, def: def, x: sp.x, z: sp.z });
    toast(game, def.icon + " <b>" + def.name + "!</b> the tribe is gathering" + (sp.fire ? " by the fire" : " at the nest") + ". step into a smol and join in", { x: sp.x, z: sp.z });
    if (me() && SB.Possess.say) SB.Possess.say(def.icon + " " + def.name + "! the tribe is gathering" + (sp.fire ? " by the fire" : " at the nest") + ". go and join in");
    return s.fest;
  };
  function festGather(game) {
    var f = st(game).fest, n = 0; if (!f) return;
    tribe(game).forEach(function (c) {
      if (n >= 12 || !awake(c) || c.plan || (c.chem && c.chem.hunger > 0.7) || F.following(game, c)) return;
      var d = SB.dist(c.x, c.z, f.x, f.z);
      if (d > 60) return;
      if (d > 5) sendTo(c, f.x + Math.sin(n * 0.55) * 3, f.z + Math.cos(n * 0.55) * 3, game, 30);
      else if (Math.random() < 0.3) { emote(c, "happy", 2.4); speak(c, f.k === 1 ? "yum!" : "♪", 2); }
      n++;
    });
  }
  F.atFest = function (game, c) { var f = F.fest(game); return !!f && !!c && SB.dist(c.x, c.z, f.x, f.z) < 13; };
  function festReward(game, c, grade, other) {
    var f = st(game).fest, def = F.FESTS[f.k], sp = [1, 3, 5][grade], msg;
    f.done = 1; f.grade = grade;
    sparks(game, sp, c); F.mood(game, c, "fest");
    if (f.k === 0) { addItem(game, c, "posy", 1); msg = (other ? "💃 you and " + other.name + " dance the blossom dance" : "💃 you dance the blossom dance by yourself") + ". a 💐 posy, and +" + sp + " ✨"; if (other) F.add(game, other, 40); }
    else if (f.k === 1) msg = ["🍲 you came empty-handed. the feast is plain, but there's a place for you", "🍲 into the pot it goes. a good feast", "🍲 what a feast! everyone eats until they're round"][grade] + ". +" + sp + " ✨";
    else if (f.k === 2) { if (grade === 2) addItem(game, c, "ribbon", 1); msg = (grade === 2 ? "🪵 BONK! " + f.mine + " beats " + (other ? other.name + "'s " : "") + f.best + ". the 🎗 ribbon is yours" : "🪵 bonk. " + f.mine + ": " + (other ? other.name : "someone") + " wins with " + f.best) + ". +" + sp + " ✨"; }
    else { if (grade === 2) { var back = K().heartfruit && dice(game, "swapback:" + f.day)() < 0.35 ? "heartfruit" : "honey"; addItem(game, c, back, 1); msg = "🎁 your secret friend loved it, and gives you " + label(back) + " back"; } else msg = grade === 1 ? "🎁 your secret friend says thank you" : "🎁 your secret friend makes a face. it's the thought"; msg += ". +" + sp + " ✨"; }
    SB.bus.emit("festJoin", { k: f.k, def: def, c: c, grade: grade, sparks: sp });
    sound("achievement", 0.6);
    return msg;
  }
  // take part, in a body. look: the smol you are looking at (the dance)
  F.joinFest = function (game, c, look) {
    var f = F.fest(game); if (!f || !c) return { ok: false, msg: "no festival today" };
    if (f.done) return { ok: false, msg: "you've had your turn. enjoy the day" };
    if (!F.atFest(game, c)) return { ok: false, msg: "the festival is over there: go to where the tribe is" };
    if (f.k === 0) {
      var p = isSmol(look) && look !== c && SB.dist(look.x, look.z, c.x, c.z) < 8 ? look : null;
      if (p && !(F.willing(game, c, p, 2) || opinion(game, p, c) >= 8)) { speak(p, "…no dance", 2); return { ok: false, msg: "🙈 " + p.name + " is too shy to dance with you (2 ♥). ask someone else, or dance alone" }; }
      if (p) { emote(p, "love", 3); speak(p, "♪ ♪ ♪", 3); }
      emote(c, "happy", 3);
      return { ok: true, msg: festReward(game, c, p ? 2 : 1, p) };
    }
    if (f.k === 1) {
      var v = Sv().inv(c), sl = Sv().held(c), grade = 0;
      if (sl && Sv().edible(sl.k)) { grade = { cooked: 2, bread: 2, honey: 2, heartfruit: 2 }[sl.k] ? 2 : 1; Sv().removeAt(c, v.sel, 1); }
      tribe(game).forEach(function (o) { if (SB.dist(o.x, o.z, f.x, f.z) < 13 && o.chem) { o.chem.hunger = Math.max(0, o.chem.hunger - 0.15 * (grade + 1)); if (grade && o !== c) F.add(game, o, 5 * grade); } });
      return { ok: true, msg: festReward(game, c, grade) };
    }
    if (f.k === 2) {
      var r = dice(game, "bonk:" + f.day + ":" + c.id), sk = SB.Body && SB.Body.bonus ? SB.Body.bonus(c, "fight") : 0;
      f.mine = Math.round(35 + (c.tier || 0) * 6 + Math.min(20, sk * 40) + gene(c, "toughness") * 10 + r() * 30);
      var rivals = tribe(game).filter(function (o) { return o !== c && o.stage >= 2 && SB.dist(o.x, o.z, f.x, f.z) < 20; }), rv = rivals.length ? rivals[Math.floor(r() * rivals.length) % rivals.length] : null;
      f.best = Math.round(40 + r() * 45 + (rv ? gene(rv, "toughness") * 10 : 0));
      if (rv) { emote(rv, f.mine > f.best ? "huh" : "proud", 2.4); speak(rv, f.mine > f.best ? "whoa!" : "me win!", 2.4); }
      return { ok: true, msg: festReward(game, c, f.mine > f.best ? 2 : 1, rv) };
    }
    var who = SB.Game.byId(game, f.who);
    if (!isSmol(who)) { f.who = null; return { ok: true, msg: festReward(game, c, 1, null) }; }
    return { ok: true, msg: "🎁 your secret friend is " + who.name + ". give them something they'd like" };
  };
  function festTick(game) {
    var s = st(game), f = s.fest; if (!f) return;
    if (game.time >= f.until) {
      tribe(game).forEach(function (c) { if (SB.dist(c.x, c.z, f.x, f.z) < 13) F.mood(game, c, "fest"); });
      s.last = { k: f.k, day: f.day, joined: f.done ? 1 : 0 }; s.fest = null;
      SB.bus.emit("festivalEnd", { k: f.k, joined: !!f.done });
      return;
    }
    if (game.time >= (f.gT || 0)) { f.gT = Math.round(game.time + 30); festGather(game); }
  }

  /* ---------------- dawn: gifts back, hatch-days, drifting apart ---------------- */
  F.BACK = ["berry", "apple", "honey", "fish", "cooked", "herb", "fiber", "flint", "nutmeat", "cherry"];
  function dawn() {
    var game = cur(); if (!game || quiet(game) || story(game)) return;
    var s = st(game), d = day(game), m = me(), mine = SB.Mine && SB.Mine.get ? SB.Mine.get(game) : null, home = SB.Home && SB.Home.get ? SB.Home.get(game) : null, gave = 0, bdays = [];
    for (var id in s.h) {
      var c = SB.Game.byId(game, +id), r = s.h[id];
      if (!c || !c.alive) { if (!c || c.gone) delete s.h[id]; continue; }
      var h = F.hearts(game, c), tr = F.trait(c);
      if (h < F.MAX && (r.seen || 0) < d - 1 && r.p > 0) r.p = Math.max(0, r.p - 4); // out of sight, a little out of mind
      if (h >= 1 && F.isHatchDay(game, c)) bdays.push(c);
      if (gave < 2 && tr !== "greedy" && h >= (tr === "kind" ? 3 : 4) && dice(game, "back:" + id + ":" + d)() < (tr === "kind" ? 0.6 : 0.35)) {
        var pool = F.BACK.filter(function (k) { return K()[k]; }), k = pool[Math.floor(dice(game, "backk:" + id + ":" + d)() * pool.length) % pool.length], where;
        if (home && SB.Home.has(game, "chest") && SB.Home.put(game, k, 1) === 0) where = "in your chest";
        else { var at = m || mine || c; if (Sv().spawn) Sv().spawn(game, k, 1, (home ? home.x : at.x) + 0.9, (home ? home.z : at.z) + 0.7); where = home ? "at your door" : m || mine ? "at " + (m || mine).name + "'s feet" : "by the nest"; }
        gave++; r.back = d;
        SB.bus.emit("friendGift", { c: c, kind: k, where: where });
        tell(game, "🎁 " + c.name + " left you " + (/s$/.test(label(k)) ? "some " : "a ") + label(k) + " " + where, c);
      }
    }
    if (bdays.length) toast(game, "🎂 it's " + bdays[0].name + "'s hatch-day" + (bdays.length > 1 ? " (and " + (bdays.length - 1) + " more)" : "") + ": a gift today counts " + F.HATCHDAY + " times", bdays[0]);
    tribe(game).forEach(function (c) {
      var tr = F.trait(c);
      if (tr === "clever") c.inspired = Math.max(c.inspired || 0, 90);
      if (tr === "curious" && !c._pov && Sv().spawn && dice(game, "find:" + c.id + ":" + d)() < 0.25) { var fk = ["flint", "berry", "fiber", "seed", "crystal"].filter(function (x) { return K()[x]; }); fk = fk[Math.floor(dice(game, "findk:" + c.id + ":" + d)() * fk.length) % fk.length]; Sv().spawn(game, fk, 1, c.x + 0.5, c.z + 0.4); diary(game, c, "🔍", "found a " + label(fk) + " on my wanderings"); SB.bus.emit("friendFound", { c: c, kind: fk }); }
    });
  }
  F._dawn = dawn;

  /* ---------------- the frame ---------------- */
  var tT = 0, slowT = 0, playT = 50, cursor = 0;
  function visit(game, c) { // one smol's slow upkeep: its wish, its trait, its mood
    if (!isSmol(c)) return;
    lifeCheck(game, c);
    if (c.stage >= 3 && !F.trait(c)) F.grantTrait(game, c, false);
    var tr = F.trait(c), ch = c.chem; if (!ch) return;
    if (tr === "brave" && ch.fear > 0) ch.fear = Math.max(0, ch.fear - 0.15);
    else if (tr === "tough" && ch.pain > 0) ch.pain = Math.max(0, ch.pain - 0.1);
    else if (tr === "greedy" && !c._pov) ch.hunger = Math.min(1, ch.hunger + 0.02);
    var ms = F.moodScore(game, c);
    if (ms > 0) { ch.bored = Math.max(0, ch.bored - 0.02 * ms); ch.lonely = Math.max(0, ch.lonely - 0.02 * ms); }
    else if (ms < 0) ch.anger = Math.min(1, (ch.anger || 0) - 0.02 * ms);
  }
  F.visit = visit;
  F.tick = function (game, dt) {
    if (!game || quiet(game)) return;
    if ((tT -= dt) > 0) return;
    var step = 0.5 - tT; tT = 0.5;
    errandTick(game); followTick(game); matchTick(game); wedTick(game); festTick(game); skyScan(game);
    if ((slowT -= step) <= 0) {
      slowT = 2;
      var list = SB.Game.smols(game);
      for (var i = 0; i < 6 && list.length; i++) { cursor = (cursor + 1) % list.length; visit(game, list[cursor]); }
    }
    if (story(game)) return;
    if ((playT -= step) <= 0) {
      playT = 45 + Math.random() * 45;
      if (tribe(game).some(function (c) { return F.trait(c) === "cheeky"; })) playT *= 0.6;
      if (Math.random() < 0.6) F.autoPrank(game); else F.moment(game);
    }
  };

  /* ---------------- hooks ---------------- */
  var hooked = false;
  F.hook = function () {
    if (hooked || !SB.bus) return; hooked = true;
    var on = SB.bus.on;
    function up(d, k) { if (d && d.c && d.c.species === "smol" && d.c.stage < 3) bump(d.c, k); }
    on("dawn", dawn);
    // a gift in a body goes through the game's own "give"
    on("give", function (d) {
      var game = cur(); if (!game || !d || !d.c || !d.to || !d.item) return;
      up(d, "share");
      if (d.c._pov && d.to.species === "smol") F._lastGift = F.gift(game, d.to, d.item.kind, d.c);
    });
    on("eat", function (d) { var game = cur(); if (game && d && d.c && d.obj && handled(game, d.obj.id)) skyGift(game, d.c, d.obj); });
    on("tickle", function (d) {
      var game = cur(), c = d && d.c; if (!game || !c || c.species !== "smol") return;
      up(d, "tickle");
      var w = st(game).wed;
      if (w && !w.bless && (w.a === c.id || w.b === c.id)) { var b = F.bless(game); if (b.ok) toast(game, b.msg, c); }
      if (!isSmol(c)) return;
      var r = rec(game, c);
      if (r.kd !== day(game)) { r.kd = day(game); F.add(game, c, F.PTS.tickle); }
    });
    on("tap", function (d) { up(d, "tap"); });
    on("learnWord", function (d) { up(d, "word"); });
    on("teach", function (d) { if (d && d.student && d.student.stage < 3) bump(d.student, "taught"); });
    on("hit", function (d) {
      var game = cur(); up(d, "fight");
      if (!game || !d || !d.c || !d.target || d.target.species !== "grump" || !d.target.alive || !F.fights(game, d.c)) return;
      var need = SB.Threats && SB.Threats.whacksNeeded ? SB.Threats.whacksNeeded(d.target) : 3; // a friend softens it up: the last blow is yours
      d.target.whacked = Math.min(Math.max(d.target.whacked || 0, need - 0.5), (d.target.whacked || 0) + (F.trait(d.c) === "brave" ? 0.75 : 0.5));
      SB.bus.emit("friendFought", { c: d.c, g: d.target });
    });
    on("fish", function (d) { if (d && d.c && d.c.species === "smol") { var f = of(d.c); f.fish = (f.fish || 0) + 1; } });
    on("wishGranted", function (d) { var game = cur(); if (game && d && isSmol(d.c)) { F.add(game, d.c, F.PTS.wish); note(game, d.c, "you gave me my wish"); bump(d.c, "spoil"); } });
    // you chased a grump off: everyone who saw it remembers
    on("grumpChased", function (d) {
      var game = cur(), c = d && d.c; if (!game || !c || !c._pov || quiet(game)) return;
      var n = 0;
      tribe(game).forEach(function (o) { if (o === c || SB.dist(o.x, o.z, c.x, c.z) > 14) return; n++; F.mood(game, o, "saved"); F.add(game, o, F.PTS.saved); note(game, o, "you chased a grump off"); remember(game, o, c, "hero", 12, "chased a grump off for us", 3600, 24); if (SB.Orders && SB.Orders.addTrust) SB.Orders.addTrust(o, 0.03); if (n <= 3) { emote(o, "love", 2.4); speak(o, "hero!", 2.4); } });
      if (n) { var k = K().cooked ? "cooked" : "berry"; if (Sv().spawn) Sv().spawn(game, k, 1, c.x + 0.7, c.z + 0.5); SB.bus.emit("hero", { c: c, n: n, gift: k }); }
    });
    on("partners", function (d) { var game = cur(); if (game && d && d.a && d.b && !quiet(game) && !story(game)) startWedding(game, d.a, d.b); });
    on("season", function () { var game = cur(); if (game && !quiet(game)) F.startFest(game, game.world.season || 0); });
    on("grow", function (d) {
      var game = cur(), c = d && d.c; if (!game || !c || c.species !== "smol" || c.stage !== 3 || quiet(game)) return;
      if (!F.trait(c)) { F.grantTrait(game, c, true); party(game, c); }
    });
    // a gentle smol: whoever it talks to warms to it
    on("convo", function (d) {
      var game = cur(); if (!game || !d || !d.a || !d.b) return;
      if (F.trait(d.a) === "gentle") remember(game, d.b, d.a, "gentle", 3, "is so gentle", 2400, 12);
      if (F.trait(d.b) === "gentle") remember(game, d.a, d.b, "gentle", 3, "is so gentle", 2400, 12);
    });
    on("unpossess", function () { jobs = []; });
  };
  F.hook();

  /* ---------------- in a body: the buttons ---------------- */
  F._focus = null;
  F.focusOn = function (c) { F._focus = c ? c.id : null; };
  function options(game, c, r, o, x) {
    if (!game || !c) return;
    var fe = F.fest(game), cr = r && r.type === "creature" ? r.ref : null;
    if (cr && cr.species === "smol" && cr !== c && cr.alive && !cr.stranger) {
      if (o.use && !o.use.locked && /^talk to /.test(o.use.label || "")) {
        var go0 = o.use.go;
        o.use.go = function () { var ok = go0(); if (ok) { var t = F.talk(game, c, cr); if (t) x.say(t.msg); } return ok; };
      }
      if (x.held && x.hk && x.hk !== "plans") {
        var known = F.known(game, cr)[x.hk], hk = x.hk;
        o.place = x.op("give " + cr.name + " your " + label(hk) + (known != null ? " (" + F.WORD[String(known)] + " it)" : " (a gift)"), function () {
          if (SB.dist(cr.x, cr.z, c.x, c.z) > 2.6) { x.say("get closer to give it"); return false; }
          F._lastGift = null;
          var it = Sv().give(c, game, cr, Sv().inv(c).sel);
          if (!it) return false;
          x.say(F._lastGift ? F._lastGift.msg : "you gave " + cr.name + " your " + label(hk));
          x.audio(F._lastGift && F._lastGift.taste < 0 ? "bonk" : "chime", 0.5);
          return true;
        }, SB.V ? SB.V.give : null);
      }
      var w = F.wedding(game);
      if (w && !w.bless && w.ph === 0 && (w.a === cr.id || w.b === cr.id)) o.pick = x.op("bless the wedding", function () { var b = F.bless(game); x.say(b.msg); return b.ok; }, null);
      else if (fe && fe.k === 0 && !fe.done && F.atFest(game, c)) o.pick = x.op("dance with " + cr.name, function () { var j = F.joinFest(game, c, cr); x.say(j.msg); return j.ok; }, null);
      else o.pick = x.op("ask " + cr.name + "… (" + F.hearts(game, cr) + " ♥)", function () { F._focus = cr.id; x.openBag("friends"); return true; }, null);
      return;
    }
    if (fe && !fe.done && F.atFest(game, c) && !o.pick && (!r || r.type === "struct")) {
      var def = F.FESTS[fe.k];
      o.pick = x.op(def.icon + " " + def.join, function () { var j = F.joinFest(game, c, null); x.say(j.msg); return j.ok; }, null);
    }
  }
  F.options = options;
  // the smol the tab is about: the one you asked, else the nearest
  F.focus0 = function (game, c) {
    var f = F._focus != null ? SB.Game.byId(game, F._focus) : null;
    if (isSmol(f) && f !== c) return f;
    var best = null, bd = 9;
    tribe(game).forEach(function (o) { if (o === c) return; var d = SB.dist(o.x, o.z, c.x, c.z); if (d < bd) { bd = d; best = o; } });
    return best;
  };
  F.canPosy = function (c) { for (var k in F.POSY) if (Sv().count(c, k, true) < F.POSY[k]) return false; return c.tier >= 2; };
  F.makePosy = function (game, c) {
    if (c.tier < 2) return { ok: false, msg: "it takes hands: a tool-user and up" };
    if (!F.canPosy(c)) return { ok: false, msg: "a posy needs 2 leaves and 1 berry" };
    for (var k in F.POSY) Sv().take(c, k, F.POSY[k]);
    addItem(game, c, "posy", 1);
    SB.bus.emit("craft", { c: c, id: "posy", pov: !!c._pov });
    return { ok: true, msg: "💐 a posy. nearly everyone likes one" };
  };

  /* ---------------- the bag's "friends" tab ---------------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]; }); }
  function btn(attr, val, text, off, go) { return "<button class='btn" + (go ? " go" : "") + "' data-fr" + attr + "='" + esc(val) + "' " + (off ? "disabled" : "") + ">" + text + "</button>"; }
  function tastesHtml(game, c) {
    var k = F.known(game, c), groups = { "2": [], "1": [], "0": [], "-1": [], "-2": [] }, out = [];
    for (var id in k) if (groups[String(k[id])] && K()[id]) groups[String(k[id])].push(emo(id) + " " + esc(label(id)));
    ["2", "1", "0", "-1", "-2"].forEach(function (t) { if (groups[t].length) out.push("<b>" + F.WORD[t] + "</b> " + groups[t].join(", ")); });
    return out.length ? out.join(" · ") : "you don't know what it likes yet. give it things and see";
  }
  F.html = function (game, c, icon) {
    var out = "", fe = F.fest(game), w = F.wedding(game), s = st(game), d = day(game), row = "<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
    if (fe) { var def = F.FESTS[fe.k], who = fe.k === 3 && fe.who != null ? SB.Game.byId(game, fe.who) : null; out += "<div class='lbl'>" + def.icon + " today: " + esc(def.name) + "</div><p>" + esc(def.how) + (who && !fe.done ? ". your secret friend: <b>" + esc(who.name) + "</b>" : "") + "</p>" + row + btn("fest", "1", fe.done ? "you've had your turn" : def.join, !!fe.done || !F.atFest(game, c), true) + (F.atFest(game, c) ? "" : "<span class='help'>go to where the tribe is gathered</span>") + "</div>"; }
    else { var nf = F.nextFest(game); out += "<div class='lbl'>" + nf.def.icon + " next: " + esc(nf.def.name) + ", in " + nf.days + " day" + (nf.days === 1 ? "" : "s") + "</div>"; }
    if (w) { var wa = SB.Game.byId(game, w.a), wb = SB.Game.byId(game, w.b); if (wa && wb) out += "<div class='lbl'>💒 " + esc(wa.name) + " and " + esc(wb.name) + " are getting wed</div>" + row + btn("bless", "1", "✨ bless the wedding", !!w.bless, true) + "<span class='help'>be near them when they tie the knot and you keep a keepsake</span></div>"; }
    var f = F.focus0(game, c);
    if (f) {
      var h = F.hearts(game, f), nx = F.nextUnlock(game, f), lw = F.lifeOf(game, f), tr = F.trait(f), md = F.moods(game, f), r = rec(game, f), near = SB.dist(f.x, f.z, c.x, c.z) < 7, fol = F.following(game, f), q = F.quirk(f), keep = f.fr && f.fr.keep;
      out += "<div class='lbl'>" + esc(f.name) + " · <span style='color:#ff6b9a'>" + F.heartsText(game, f) + "</span>" + (F.isHatchDay(game, f) ? " · 🎂 hatch-day" : "") + "</div><div class='rlist'>";
      out += "<div class='rc'><span class='big'>💗</span><div class='t'>" + h + " of " + F.MAX + " hearts" + (r.td === d ? " · talked today" : " · say hello today") + (r.gd === d ? " · had a gift today" : "") + "<small>" + (nx ? "at " + nx.at + " ♥: " + esc(nx.text) : "best friends") + "</small></div></div>";
      out += "<div class='rc'><span class='big'>🎁</span><div class='t'>tastes<small>" + tastesHtml(game, f) + "</small></div></div>";
      if (tr) out += "<div class='rc'><span class='big'>" + F.TRAITS[tr].icon + "</span><div class='t'>" + tr + "<small>" + esc(F.TRAITS[tr].why) + ". " + esc(F.TRAITS[tr].does) + "</small></div></div>";
      else if (q) out += "<div class='rc'><span class='big'>🐣</span><div class='t'>a " + q + " little one<small>how it's raised decides what it grows up to be</small></div></div>";
      if (lw) out += "<div class='rc'><span class='big'>" + lw.def.icon + "</span><div class='t'>life wish: " + esc(lw.def.t) + "<small>" + esc(F.FOCUS[lw.def.focus] || "") + " · " + (lw.done ? "it came true" : lw.n + "/" + lw.need) + "</small></div>" + (lw.done ? "<span class='ok'>✓</span>" : "") + "</div>";
      if (md.length || keep) out += "<div class='rc'><span class='big'>" + (md.length ? md[md.length - 1].icon : "💒") + "</span><div class='t'>feeling<small>" + md.map(function (m) { return m.icon + " " + esc(m.text); }).join(" · ") + (keep ? (md.length ? " · " : "") + "💒 wed to " + esc(keep.n) + " (a " + esc(keep.q) + " wedding)" : "") + "</small></div></div>";
      out += "</div><div class='lbl'>ask " + esc(f.name) + "</div>" + row + btn("cmd", "come", "📣 come") + btn("cmd", "stay", "✋ stay") + btn("cmd", "follow", fol ? "🐾 stop following" : "🐾 follow me") + btn("cmd", "home", "🏠 go home");
      F.fetchables(game, f).forEach(function (k) { out += btn("get", k, "👉 get " + (icon ? icon(k, 16) + " " : "") + esc(label(k))); });
      out += "</div><div class='lbl'>together" + (near ? "" : " · get closer") + "</div>" + row;
      for (var sk in F.SOCIALS) out += btn("soc", sk, F.SOCIALS[sk][0] + " " + F.SOCIALS[sk][1], !near);
      out += btn("learn", "1", "📖 teach me", h < 5 || r.ld === d) + "</div>";
      var cand = F.candidates(game, f);
      if (cand.length) { out += "<div class='lbl'>💘 nudge " + esc(f.name) + " toward…" + (s.md === d ? " (one a day)" : "") + "</div>" + row; cand.forEach(function (b) { out += btn("match", b.id, "💘 " + esc(b.name), s.md === d); }); out += "</div>"; }
    } else out += "<p><b>nobody near.</b> look at a smol and choose “ask”, or call someone by name below.</p>";
    out += "<div class='lbl'>everyone · call by name</div>" + row + btn("all", "1", "📣 call your friends") + btn("posy", "1", "💐 tie a posy (2 leaves, 1 berry)", !F.canPosy(c)) + "</div><div class='rlist'>";
    tribe(game).filter(function (o) { return o !== c; }).sort(function (a, b) { return F.points(game, b) - F.points(game, a) || a.id - b.id; }).slice(0, 24).forEach(function (o) {
      var r2 = s.h[o.id] || {};
      out += "<div class='rc'><div class='t'>" + esc(o.name) + (F.following(game, o) ? " 🐾" : "") + (F.isHatchDay(game, o) ? " 🎂" : "") + " <span style='color:#ff6b9a'>" + F.heartsText(game, o) + "</span><small>" + (r2.td === d ? "💬✓ " : "💬– ") + (r2.gd === d ? "🎁✓" : "🎁–") + (F.trait(o) ? " · " + F.trait(o) : "") + "</small></div>" + btn("pick", o.id, "ask") + btn("call", o.id, "call") + "</div>";
    });
    return out + "</div>";
  };
  F.wire = function (root, game, c, redraw, say) {
    function done(r) { if (r && r.msg && say) say(r.msg); if (r && r.ok) sound("craft", 0.5); redraw(); }
    function each(attr, fn) { root.querySelectorAll("[data-fr" + attr + "]").forEach(function (b) { b.addEventListener("click", function () { fn(b.getAttribute("data-fr" + attr)); }); }); }
    function f() { return F.focus0(game, c); }
    each("cmd", function (v) { done(F.command(game, c, f(), v)); });
    each("get", function (v) { done(F.command(game, c, f(), "get", v)); });
    each("soc", function (v) { done(F.social(game, c, f(), v)); });
    each("learn", function () { done(F.learnFrom(game, c, f())); });
    each("match", function (v) { done(F.match(game, f(), SB.Game.byId(game, +v))); });
    each("fest", function () { done(F.joinFest(game, c, null)); });
    each("bless", function () { done(F.bless(game)); });
    each("all", function () { done(F.callAll(game, c)); });
    each("posy", function () { done(F.makePosy(game, c)); });
    each("pick", function (v) { F._focus = +v; redraw(); });
    each("call", function (v) { done(F.command(game, c, SB.Game.byId(game, +v), "come")); });
  };

  /* ---------------- plugging in (ext.js) ---------------- */
  if (SB.Ext) {
    SB.Ext.on("tick", function (game, dt) { F.tick(game, dt); });
    SB.Ext.on("options", options);
    SB.Ext.on("vitals", function (game, c) { return F.moods(game, c).slice(-2).map(function (m) { return { icon: m.icon, text: m.text, bad: m.v < 0 }; }); });
    SB.Ext.on("goals", function (game, add) {
      var fe = F.fest(game), w = F.wedding(game), mine = SB.Mine && SB.Mine.get ? SB.Mine.get(game) : null, lw = mine ? F.lifeOf(game, mine) : null;
      if (fe) add(F.FESTS[fe.k].icon + " " + F.FESTS[fe.k].name + ": join in as a smol", fe.done ? "1/1" : "0/1", !!fe.done, false);
      if (w) add("💒 a wedding: be there as a smol, or tickle one of them to bless it", w.bless ? "blessed" : "", !!w.bless, false);
      if (lw && !lw.done) add(lw.def.icon + " " + mine.name + "'s life wish: " + lw.def.t, lw.n + "/" + lw.need, false, false);
    });
    SB.Ext.tab({ id: "friends", label: function () { return "💗 friends"; }, show: function (game, c) { return !!game && !!c; }, html: function (game, c, icon) { return F.html(game, c, icon); }, wire: function (root, game, c, redraw, say) { F.wire(root, game, c, redraw, say); } });
  }
})();
