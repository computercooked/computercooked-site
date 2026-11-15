/* smol brains — animals.js (4.34, "animals"): taming, pets, kept animals, a mount, and a grump you can turn back.
   Until now the island's animals were things to eat: bunnies, flutterbies and beetles. Now, in a body:
     wild ones   cluckers (day, they roost at night), woollies (in herds: scare one and they all run), lopers (big,
                 fast, they kick back), glowbugs (night only), and once in a while a golden bug worth sparks. Some
                 wear the coat of where they live. Every one is an item that hops, crawls or flies, as bunnies do.
     taming      offer the food it likes, wait, tickle it. Rush it and it nips. A loper has to be ridden out too.
     pets        a tamed animal has a name, a mood, hunger, a bond and a trait. It follows you, digs things up,
                 warns of grumps, fights beside you if it is the fighting kind, learns tricks for treats, nuzzles,
                 and wanders off if you forget it (a collar stops that).
     pens        a pen (then a big pen, then a roofed pen) you build by hand: a trough to fill, and eggs, milk and
                 coats to collect, more when they are happy. Fed pairs have young that grow up.
     a mount     ride a tamed loper: faster, faster still with a basket saddle, which also carries six slots.
     a grump     beat a small grump with a vine lead in your bag and it is tied, not chased off. Pen it, feed it,
                 tickle it. Day by day its light comes back, and then it remembers it was a smol and guards your home.
   State: game.quests.animals = { n, list: { id: animal }, gone: [], tamed, dawn, ride } (saved with the quest board).
   An animal's body is an item (saved by the world); the record is the truth and re-makes the body if it is lost.
   A pen keeps its trough and its produce on the building (st.data). Rolls its own dice; never the island's. */
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var A = SB.Animals = {};
  var K = SB.KINDS, SK = SB.STRUCTS;
  A.FOLLOW_MAX = 3;       // followers at once (one to start, one more for each pet that fully trusts you)
  A.RIDE = 1.45; A.RIDE_SADDLE = 1.8; A.RIDE_HIT = 1.25;
  A.FIND_EVERY = 150;     // seconds of following between finds, for a pet that trusts you halfway
  A.WARN_R = 16; A.GUARD_R = 12; A.WARN_GAP = 45;
  A.TROUGH = 12; A.OUT_MAX = 12; A.GROW_DAYS = 3; A.PACK = 6;
  A.HUNGER_DAYS = 2.5;    // a full belly lasts this long
  A.PENS = {
    pen: { cap: 3, cost: { stick: 6, vine: 2 }, next: "bigpen" },
    bigpen: { cap: 5, cost: { stick: 6, plank: 2 }, next: "roofpen" },
    roofpen: { cap: 8, cost: { stick: 4, leaves: 6 }, next: null }
  };
  // what each kind is like. likes: food -> how much (1 = favourite). finds: [kind, weight]
  A.SP = {
    hopper: { name: "bunny", icon: "🐇", move: "hop", likes: { carrot: 1, berry: 0.7, apple: 0.7 }, shy: 5, pet: 1, native: 1, finds: [["carrot", 3], ["seed", 3], ["berry", 2], ["flint", 1], ["glowcap", 1]], coat: [["fur", 1]], coatDays: 2, life: 30 },
    butterfly: { name: "flutterby", icon: "🦋", move: "fly", likes: { honey: 1, berry: 0.7 }, shy: 0, pet: 1, small: 1, native: 1, pollinate: 1, bug: "butterfly", life: 14 },
    beetle: { name: "beetle", icon: "🐞", move: "crawl", likes: { berry: 1, apple: 0.7, nutmeat: 0.7 }, shy: 0, pet: 1, small: 1, native: 1, finds: [["flint", 3], ["stone", 3], ["clay", 2], ["ore", 1]], bug: "beetle", life: 14 },
    clucker: { name: "clucker", icon: "🐤", move: "hop", likes: { grain: 1, seed: 0.8, berry: 0.6 }, shy: 4, stock: 1, daily: "cluckegg", fight: 0.3, finds: [["seed", 4], ["berry", 1]], life: 30, kidName: "chick", meat: 1 },
    woolly: { name: "woolly", icon: "🐑", move: "hop", likes: { grain: 1, carrot: 0.7, herb: 0.7 }, shy: 5.5, herd: 1, stock: 1, daily: "milk", fight: 0.45, coat: [["fiber", 2], ["fur", 1]], coatDays: 3, life: 40, kidName: "lamb", meat: 1, fur: 1 },
    loper: { name: "loper", icon: "🦘", move: "hop", likes: { carrot: 1, apple: 0.8, honey: 0.8 }, shy: 7, ride: 1, big: 1, fight: 0.7, kick: 1, life: 60, kidName: "foal", meat: 2, fur: 1 },
    glowbug: { name: "glowbug", icon: "✨", move: "fly", likes: { honey: 1, glowcap: 0.9, berry: 0.5 }, shy: 0, pet: 1, small: 1, night: 1, life: 14 },
    grump: { name: "grump", icon: "👿", move: "hop", likes: {}, shy: 0, fight: 1.2, finds: [["stone", 2], ["stick", 2], ["flint", 1]], life: 0 }
  };
  A.COATS = {
    clucker: [["", "", 0xf2d9a0], ["blue", "blue ", 0x7fb4e6], ["gold", "golden ", 0xffd24a]],
    woolly: [["", "", 0xf3ead8], ["dusk", "dusky ", 0x8d7fa8], ["snow", "snow ", 0xffffff]],
    loper: [["", "", 0xc9a06a], ["ember", "ember ", 0xd9603a]]
  };
  A.TRAITS = { greedy: "greedy: eats more, and loves you for every bite", brave: "brave: hits harder", nosy: "nosy: finds more", sleepy: "sleepy: easy to please, finds less", loyal: "loyal: slow to forget you" };
  A.TRICKS = { fetch: "fetch: brings you the nearest loose thing", roll: "roll: a happy roll. everyone near cheers up", speak: "speak: warns of grumps from further off" };
  A.NAMES = ["Bun", "Pip", "Mo", "Dot", "Nib", "Fig", "Tuft", "Bean", "Moss", "Pebble", "Clover", "Biscuit", "Nettle", "Button", "Sprout", "Wisp", "Pudding", "Acorn", "Burr", "Thistle", "Crumb", "Dandy", "Flick", "Mallow", "Noodle", "Pickle", "Quill", "Rusty", "Smudge", "Twig", "Wobble", "Yam", "Zig", "Fern", "Honey", "Jelly", "Kip", "Lark", "Muffin", "Peanut"];
  A.GRUMP_NAMES = ["Ember", "Cinder", "Dusk", "Glim", "Lumen", "Wick", "Flint", "Sol", "Halo", "Tallow"];
  // things made by hand in the animals tab: [id, out kind, how many, what it takes]
  A.MAKES = [
    { id: "feed", out: "feed", n: 2, cost: { leaves: 2 } },
    { id: "treat", out: "treat", n: 2, cost: { berry: 2, seed: 1 } },
    { id: "brush", out: "brush", n: 1, cost: { stick: 1, fiber: 2 } },
    { id: "collar", out: "collar", n: 1, cost: { vine: 1, stone: 1 } },
    { id: "lead", out: "lead", n: 1, cost: { vine: 2 } },
    { id: "whistle", out: "whistle", n: 1, cost: { stick: 1, fiber: 1 } },
    { id: "saddle", out: "saddle", n: 1, cost: { basket: 1, fur: 1, vine: 1 } },
    { id: "pad", out: "pad", n: 1, cost: { fur: 2, vine: 1 } },
    { id: "cheese", out: "cheese", n: 1, cost: { milk: 2 } }
  ];

  /* ---------------- the new things ---------------- */
  function addKind(k, def) { if (K && !K[k]) K[k] = def; }
  function kindFor(sp, coat, kid) {
    if (sp === "hopper") return kid ? "hopper_kid" : "hopper";
    if (!A.COATS[sp]) return sp;
    return sp + (coat ? "_" + coat : "") + (kid ? "_kid" : "");
  }
  A.kindFor = kindFor;
  (function kinds() {
    if (!K) return;
    var sp, i, c, s;
    for (sp in A.COATS) for (i = 0; i < A.COATS[sp].length; i++) {
      c = A.COATS[sp][i]; s = A.SP[sp];
      addKind(kindFor(sp, c[0], false), { noun: "critter", label: c[1] + s.name, emoji: s.icon, r: s.big ? 0.45 : 0.22, color: c[2], critter: s.move, an: { sp: sp, coat: c[0], kid: false }, desc: sp === "clucker" ? "pecks about by day and roosts at night. it loves grain and seeds." : sp === "woolly" ? "a fluffy thing that lives in herds. scare one and they all run. it loves grain." : "big, fast and proud. it kicks. it loves sunroots, and it can be ridden by someone it trusts." });
      addKind(kindFor(sp, c[0], true), { noun: "critter", label: c[1] + s.name + " " + s.kidName, emoji: s.icon, r: 0.14, color: c[2], critter: s.move, an: { sp: sp, coat: c[0], kid: true }, desc: "a little one. it grows up in a few days." });
    }
    addKind("hopper_kid", { noun: "critter", label: "bunny kit", emoji: "🐇", r: 0.12, color: 0xd9c7a8, critter: "hop", an: { sp: "hopper", coat: "", kid: true }, desc: "a tiny bunny. it grows up in a few days." });
    addKind("glowbug", { noun: "critter", label: "glowbug", emoji: "✨", r: 0.1, color: 0xc5ff49, critter: "fly", glow: 1, an: { sp: "glowbug", coat: "", kid: false }, desc: "a little light that comes out at night. it loves honey." });
    addKind("goldbug", { noun: "critter", label: "golden bug", emoji: "🪙", r: 0.1, color: 0xffd24a, critter: "crawl", glow: 1, gold: 1, desc: "rare and quick. catch it and the Lantern pays in sparks." });
    addKind("pengrump", { noun: "critter", label: "grump", emoji: "👿", r: 0.32, color: 0x4a2f5a, critter: "hop", an: { sp: "grump", coat: "", kid: false }, desc: "a grump on a lead. grumps are smols whose light went out." });
    addKind("pengrump2", { noun: "critter", label: "grump", emoji: "😠", r: 0.32, color: 0x6a4a7a, critter: "hop", glow: 1, an: { sp: "grump", coat: "half", kid: false }, desc: "something is flickering in its chest." });
    addKind("tamegrump", { noun: "critter", label: "old grump", emoji: "🙂", r: 0.32, color: 0x8a6aa0, critter: "hop", glow: 1, an: { sp: "grump", coat: "lit", kid: false }, desc: "its light came back. it guards the home now." });
    addKind("feed", { noun: "material", label: "hay", emoji: "🌾", r: 0.15, color: 0xd9c060, mat: 1, desc: "dried leaves for a trough. kept animals eat one a day each." });
    addKind("treat", { noun: "material", label: "critter treat", emoji: "🍪", r: 0.1, color: 0xb8793a, mat: 1, desc: "berries and seeds squashed into a ball. any animal likes it. it also pays for tricks." });
    addKind("brush", { noun: "material", label: "brush", emoji: "🪮", r: 0.14, color: 0xa07a50, mat: 1, desc: "a stick with reed bristles. a brushed animal is a happy animal." });
    addKind("collar", { noun: "material", label: "collar", emoji: "📿", r: 0.12, color: 0xc5ff49, mat: 1, desc: "a vine collar with a name stone. an animal wearing one never wanders off." });
    addKind("lead", { noun: "material", label: "vine lead", emoji: "➰", r: 0.13, color: 0x4f9a3a, mat: 1, desc: "a loop of vine. one more animal can follow you, and a beaten grump can be tied instead of chased off." });
    addKind("whistle", { noun: "material", label: "reed whistle", emoji: "🎵", r: 0.1, color: 0xb8c46a, mat: 1, desc: "your animals hear it from anywhere and come running." });
    addKind("saddle", { noun: "material", label: "basket saddle", emoji: "🧺", r: 0.18, color: 0xc9a05a, mat: 1, desc: "for a loper: a faster ride, and six slots to carry things in." });
    addKind("pad", { noun: "material", label: "padding", emoji: "🛡", r: 0.16, color: 0xc8b48a, mat: 1, desc: "fur padding for an animal that fights. it gets hurt half as much." });
    addKind("cluckegg", { noun: "food", label: "clucker egg", emoji: "🥚", r: 0.11, color: 0xf5ead0, food: { hunger: -0.3 }, chem: { glucose: 0.22 }, rots: 1400, desc: "from a kept clucker. good raw, better cooked." });
    addKind("milk", { noun: "food", label: "woolly milk", emoji: "🥛", r: 0.13, color: 0xffffff, food: { hunger: -0.28, pain: -0.05 }, chem: { glucose: 0.2 }, rots: 900, desc: "from a kept woolly. you need a pot to carry it off." });
    addKind("cheese", { noun: "food", label: "woolly cheese", emoji: "🧀", r: 0.13, color: 0xf2c84a, food: { hunger: -0.6 }, chem: { glucose: 0.35 }, rots: 0, desc: "two milks, pressed. filling, and it never goes off." });
    if (SK) {
      if (!SK.pen) SK.pen = { noun: "shelter", label: "pen", emoji: "🐾", r: 1.3, cost: { stick: 6, vine: 2 }, work: 6, desc: "a fence, a trough and a sign. three animals live here and give something each morning." };
      if (!SK.bigpen) SK.bigpen = { noun: "shelter", label: "big pen", emoji: "🐾", r: 1.6, cost: { stick: 12, vine: 2, plank: 2 }, work: 8, desc: "room for five." };
      if (!SK.roofpen) SK.roofpen = { noun: "shelter", label: "roofed pen", emoji: "🛖", r: 1.8, cost: { stick: 16, vine: 2, plank: 2, leaves: 6 }, work: 10, desc: "room for eight, dry in the rain, warm in winter, and nothing spooks them at night." };
    }
  })();

  /* ---------------- small helpers ---------------- */
  function Q(game) { return game.quests || (game.quests = { ch: 0, done: {}, n: {} }); }
  function st(game) {
    var q = Q(game);
    if (!q.animals || typeof q.animals !== "object") q.animals = { n: 1, list: {}, gone: [], tamed: 0, dawn: 0, ride: null };
    var s = q.animals;
    if (!s.list || typeof s.list !== "object") s.list = {};
    if (!s.gone) s.gone = [];
    if (!(s.n >= 1)) s.n = 1;
    return s;
  }
  A.state = st;
  function Sv() { return SB.Surv || SB.Survival; }
  function day(game) { return Math.floor((game.time || 0) / SB.DAY_LENGTH) + 1; }
  function label(k) { return K[k] && K[k].label ? K[k].label : k; }
  function hashKey(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function dice(game, key) { return SB.rng((hashKey(key) ^ (game.seed >>> 0)) >>> 0); }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function you(game) { var P = SB.Possess; return P && P.active && P.c && P.c.alive ? P.c : null; }
  function quiet(game) { var P = SB.Possess; return !!(game.headless || (P && P.headless)); }
  function snd(game, name, vol) { if (SB.Audio && SB.Audio.play && !quiet(game)) SB.Audio.play(name, { vol: vol == null ? 1 : vol }); }
  function fx(game, kind, x, y, z, n) { if (SB.FX && SB.FX.burst && !quiet(game)) SB.FX.burst(kind, x, y, z, n || 8); }
  // one line to the player: on the screen of the smol they are in, or a toast from the sky
  function tell(game, msg, cls) {
    A.last = msg;
    var P = SB.Possess;
    if (P && P.active && P.say) P.say(msg);
    else if (SB.UI && SB.UI.toast && !quiet(game)) SB.UI.toast(msg, cls || "", 4500);
  }
  function spOf(kind) { var d = K[kind]; return d && d.an ? d.an.sp : (kind === "hopper" || kind === "butterfly" || kind === "beetle") ? kind : null; }
  A.speciesOf = spOf;
  function isKid(kind) { return !!(K[kind] && K[kind].an && K[kind].an.kid); }
  function coatOf(kind) { return K[kind] && K[kind].an ? K[kind].an.coat : ""; }
  function dry(game, x, z) { var W = SB.World, w = game.world; return W.walkable(w, x, z, false) && W.depthAt(w, x, z) < 0.05; }
  function recKind(rec) {
    if (rec.k === "grump") return rec.lit ? "tamegrump" : (rec.light || 0) >= 0.5 ? "pengrump2" : "pengrump";
    return kindFor(rec.k, rec.coat || "", !!rec.kid);
  }
  function recLabel(rec) { return rec.k === "grump" ? (rec.lit ? "old grump" : "grump") : label(recKind(rec)); }
  function nm(rec) { return rec.name || "the " + recLabel(rec); }
  function all(game) { var s = st(game), out = []; for (var id in s.list) out.push(s.list[id]); return out; }
  A.all = all;
  A.byItem = function (game, it) { return it && it.data && it.data.an != null ? st(game).list[it.data.an] || null : null; };

  /* ---------------- bodies: an animal's item in the world ---------------- */
  var IT = {}, live = [], wild = [], curGame = null, wr = null, fails = {};
  function dress(o, rec) { o.noun = "toy"; o.data.an = rec.id; o.data.keep = 1; o.data.t = 1e6; delete o.data.tr; delete o.data.calm; delete o.data.stray; delete o.data.buck; }
  function body(game, rec) {
    var w = game.world, o = IT[rec.id];
    if (o && !o.gone && o.data && o.data.an === rec.id) return o;
    o = rec.item != null ? SB.World.itemById(w, rec.item) : null;
    if (o && (o.gone || spOf(o.kind) !== rec.k)) o = null;
    if (!o) { // lost (cleared away, or a save from before it was put down): the record makes it again
      var x = rec.x, z = rec.z;
      if (!(x > 0) || !(z > 0)) { var t = w.T && w.T.spawn ? w.T.spawn : { x: 128, z: 128 }; x = t.x; z = t.z; }
      o = SB.World.add(w, game, recKind(rec), x, z, {});
      rec.item = o.id;
    }
    dress(o, rec);
    if (o.kind !== recKind(rec)) swapKind(o, recKind(rec));
    IT[rec.id] = o;
    return o;
  }
  A.body = body;
  function swapKind(o, kind) { if (!K[kind]) return; o.kind = kind; o.r = K[kind].r; }
  function anchor(game, rec) {
    var W = SB.World;
    if (rec.mode === "pen" && rec.pen != null) { var p = W.structById(game.world, rec.pen); if (p) return { x: p.x, z: p.z, r: Math.max(0.5, SK[p.kind].r * 0.62) }; }
    return { x: rec.sx != null ? rec.sx : rec.x, z: rec.sz != null ? rec.sz : rec.z, r: rec.mode === "guard" ? 3.5 : 2.2 };
  }
  // steer an item with the island's own critter legs (world.js moves it): hop, crawl or fly toward a spot
  function moveTo(o, move, tx, tz, stop, fast, dt) {
    var d = o.data;
    d.t = 1e6;
    if (tx == null) { rest(o, move); return true; }
    var dx = tx - o.x, dz = tz - o.z, l = Math.sqrt(dx * dx + dz * dz);
    if (l <= stop) { rest(o, move); return true; }
    d.flee = fast ? 0.5 : 0;
    if (move === "fly") { d.tx = tx; d.tz = tz; }
    else if (move === "crawl") { d.dir = Math.atan2(dx, dz); d.go = true; }
    else {
      d.dir = Math.atan2(dx, dz);
      d.rest = (d.rest || 0) - dt;
      if (!(d.hop > 0) && d.rest <= 0) { d.hop = 0.45; d.rest = fast ? 0.5 : 1; }
    }
    return false;
  }
  function rest(o, move) { var d = o.data; d.t = 1e6; d.flee = 0; if (move === "fly") { d.tx = o.x; d.tz = o.z; } else if (move === "crawl") d.go = false; }
  function blink(game, o, x, z) {
    for (var i = 0; i < 8; i++) { var a = i * 0.785, px = x + Math.sin(a) * 1.4, pz = z + Math.cos(a) * 1.4; if (dry(game, px, pz)) { o.x = px; o.z = pz; o.y = SB.World.groundY(game.world, px, pz); return true; } }
    return false;
  }

  /* ---------------- taming ---------------- */
  function likeOf(sp, kind) { return kind === "treat" ? 1.5 : (sp.likes && sp.likes[kind]) || 0; }
  A.likes = function (kind, food) { var sp = A.SP[spOf(kind)]; return sp ? likeOf(sp, food) : 0; };
  function bestFood(sp) { var b = null, bv = 0; for (var k in sp.likes) if (K[k] && sp.likes[k] > bv) { bv = sp.likes[k]; b = k; } return b ? label(b) : "a critter treat"; }
  A.wildOf = function (it) { return !!it && !!spOf(it.kind) && spOf(it.kind) !== "grump" && !(it.data && it.data.an != null); };
  // hold out the food it likes. the first bites it may nip instead; wait a moment between bites
  A.offer = function (game, c, it) {
    var S = Sv(), hk = S.heldKind(c), spk = spOf(it.kind), sp = A.SP[spk], d = it.data, s = st(game);
    if (!sp || !A.wildOf(it)) return { ok: false, msg: "" };
    var like = hk ? likeOf(sp, hk) : 0;
    if (!like) return { ok: false, msg: "the " + sp.name + " sniffs and looks away. it likes " + bestFood(sp) };
    if (SB.dist(c.x, c.z, it.x, it.z) > 3.4) return { ok: false, msg: "too far. walk up slowly with it in your paw" };
    if ((d.cd || 0) > game.time) return { ok: false, msg: "give it a moment. patience" };
    S.take(c, hk, 1);
    d.cd = game.time + 3; d.calm = 45;
    if ((d.tr || 0) < 0.25 && !d.stray && Math.random() < (sp.shy > 5 ? 0.22 : 0.14)) {
      d.tr = (d.tr || 0) + 0.06;
      c.chem.health = Math.max(0.05, c.chem.health - 0.03);
      SB.bus.emit("animalNip", { c: c, it: it });
      return { ok: true, nip: true, msg: "ow! it snatched the " + label(hk) + " and nipped you. slowly now" };
    }
    d.tr = (d.tr || 0) + 0.34 * like * (1 + 0.08 * Math.min(5, s.tamed || 0));
    fx(game, "hearts", it.x, it.y + 0.4, it.z, 3);
    if (d.tr >= 1) { if (sp.ride && !isKid(it.kind)) return { ok: true, msg: "the loper eats from your paw. now hop on, and hold tight" }; return A.tame(game, c, it); }
    return { ok: true, msg: "it eats from your paw (" + Math.round(d.tr * 100) + "%). a tickle now, or more " + label(hk) };
  };
  A.tickle = function (game, c, it) {
    var sp = A.SP[spOf(it.kind)], d = it.data;
    if (!sp || !A.wildOf(it)) return { ok: false, msg: "" };
    if (!(d.calm > 0) && !d.stray) return { ok: false, msg: "it won't let you near. offer it " + bestFood(sp) + " first" };
    if (SB.dist(c.x, c.z, it.x, it.z) > 3.4) return { ok: false, msg: "too far" };
    if ((d.cd || 0) > game.time) return { ok: false, msg: "give it a moment. patience" };
    d.cd = game.time + 3; d.calm = Math.max(d.calm || 0, 30);
    d.tr = (d.tr || 0) + 0.12;
    fx(game, "hearts", it.x, it.y + 0.4, it.z, 2);
    if (d.tr >= 1) { if (sp.ride && !isKid(it.kind)) return { ok: true, msg: "the loper leans on you. now hop on, and hold tight" }; return A.tame(game, c, it); }
    return { ok: true, msg: "it likes that (" + Math.round(d.tr * 100) + "%)" };
  };
  // a loper is ridden out: hop on, then hold on three times before it throws you
  A.buckStart = function (game, c, it) {
    var d = it.data;
    if (!A.wildOf(it) || !(d.tr >= 1) || !A.SP[spOf(it.kind)].ride) return { ok: false, msg: "it doesn't trust you yet" };
    if (SB.dist(c.x, c.z, it.x, it.z) > 3.4) return { ok: false, msg: "too far" };
    d.buck = { n: 0, t: 7, who: c.id };
    SB.bus.emit("buck", { c: c, it: it });
    return { ok: true, msg: "you're on! it bucks. hold on! (three times)" };
  };
  A.hold = function (game, c, it) {
    var d = it.data;
    if (!d.buck) return { ok: false, msg: "" };
    d.buck.n++;
    if (d.buck.n < 3) return { ok: true, msg: "hold on! (" + d.buck.n + " of 3)" };
    d.buck = null;
    var r = A.tame(game, c, it);
    if (r.ok && r.rec) A.ride(game, c, r.rec);
    return r;
  };
  function pickName(game, id, list) {
    var s = st(game), r = dice(game, "name" + id), used = {}, k;
    for (k in s.list) if (s.list[k].name) used[s.list[k].name] = 1;
    for (var i = 0; i < 30; i++) { var n = list[Math.floor(r() * list.length)]; if (!used[n]) return n; }
    return list[id % list.length] + " " + id;
  }
  A.followers = function (game) { return all(game).filter(function (r) { return r.mode === "follow"; }); };
  A.followCap = function (game, c) {
    var n = 1;
    all(game).forEach(function (r) { if ((r.bond || 0) >= 0.9 && r.k !== "grump") n++; });
    n = Math.min(A.FOLLOW_MAX, n);
    if (c && Sv() && Sv().has(c, "lead")) n++;
    return n;
  };
  A.tame = function (game, c, it) {
    var s = st(game), spk = spOf(it.kind), sp = A.SP[spk];
    if (!sp || !A.wildOf(it)) return { ok: false, msg: "" };
    var id = s.n++, r = dice(game, "trait" + id), tk = ["greedy", "brave", "nosy", "sleepy", "loyal"];
    var rec = { id: id, k: spk, coat: coatOf(it.kind), kid: isKid(it.kind), name: pickName(game, id, A.NAMES), item: it.id, x: it.x, z: it.z, owner: c.id, by: c.name,
      mode: "stay", pen: null, sx: it.x, sz: it.z, bond: 0.45, hunger: 0.15, mood: 0.75, age: isKid(it.kind) ? 0 : 6, born: day(game), trait: tk[Math.floor(r() * tk.length)], coatT: 0, tricks: {}, gear: {} };
    s.list[id] = rec;
    s.tamed = (s.tamed || 0) + 1;
    IT[id] = it; dress(it, rec);
    if (A.followers(game).length < A.followCap(game, c)) rec.mode = "follow";
    live.push({ rec: rec, it: it });
    snd(game, "achievement", 0.7); fx(game, "hearts", it.x, it.y + 0.5, it.z, 10);
    if (SB.Game.note) SB.Game.note(game, c.name + " tamed a " + label(it.kind) + ". its name is " + rec.name + " 🐾");
    SB.bus.emit("tamed", { c: c, rec: rec, it: it });
    return { ok: true, rec: rec, msg: sp.icon + " tamed! this " + label(it.kind) + " is " + rec.name + " now (" + rec.trait + "). " + (rec.mode === "follow" ? "it follows you" : "it waits here: you have enough followers") };
  };
  // a waiting stranger is a smol gone wild: two gifts of food and it stays
  A.woo = function (game, c, o) {
    var S = Sv(), hk = S.heldKind(c);
    if (!o || !o.stranger || o.stranger.state !== "waiting" || !SB.Strangers || !SB.Strangers.decide) return { ok: false, msg: "" };
    if (!hk || !S.edible(hk)) return { ok: false, msg: "hold some food out" };
    if (SB.dist(c.x, c.z, o.x, o.z) > 4) return { ok: false, msg: "get closer" };
    S.take(c, hk, 1);
    o.stranger.gifts = (o.stranger.gifts || 0) + 1;
    if (o.chem) { o.chem.hunger = Math.max(0, o.chem.hunger - 0.25); }
    if (o.stranger.gifts < 2) return { ok: true, msg: o.name + " takes the " + label(hk) + " and watches you. one more" };
    SB.Strangers.decide(game, o, true);
    SB.bus.emit("strangerWon", { c: c, o: o });
    return { ok: true, won: true, msg: "🧳 " + o.name + " eats, and stays. the wild one is one of yours now" };
  };

  /* ---------------- looking after a tamed animal ---------------- */
  function near(c, o, r) { return SB.dist(c.x, c.z, o.x, o.z) <= (r || 3.6); }
  A.feed = function (game, c, rec) {
    var S = Sv(), hk = S.heldKind(c), sp = A.SP[rec.k], it = body(game, rec);
    if (rec.k === "grump" && !rec.lit) return A.grumpFeed(game, c, rec);
    var like = hk ? (hk === "feed" ? 0.5 : rec.k === "grump" ? (S.edible(hk) ? 0.8 : 0) : likeOf(sp, hk)) : 0;
    if (!like) return { ok: false, msg: rec.name + " doesn't fancy that. it likes " + (rec.k === "grump" ? "any food" : bestFood(sp)) };
    if (!near(c, it)) return { ok: false, msg: "get closer" };
    if ((rec.hunger || 0) < 0.08 && hk !== "treat") return { ok: false, msg: rec.name + " is full" };
    S.take(c, hk, 1);
    rec.hunger = clamp01((rec.hunger || 0) - 0.5 * Math.min(1.2, like + 0.3));
    rec.bond = clamp01((rec.bond || 0) + 0.06 * like * (rec.trait === "greedy" ? 1.6 : 1));
    rec.mood = clamp01((rec.mood || 0) + 0.1);
    rec.neglect = 0;
    if (hk === "treat") rec.love = day(game);
    snd(game, "eat", 0.6); fx(game, "hearts", it.x, it.y + 0.4, it.z, 3);
    SB.bus.emit("animalFed", { c: c, rec: rec, kind: hk });
    return { ok: true, msg: rec.name + " eats the " + label(hk) + ". " + moodWord(rec) };
  };
  A.pet = function (game, c, rec) {
    var it = body(game, rec);
    if (rec.k === "grump" && !rec.lit) return A.grumpTickle(game, c, rec);
    if (!near(c, it)) return { ok: false, msg: "get closer" };
    if ((rec.petT || 0) <= game.time) { rec.petT = game.time + 20; rec.bond = clamp01((rec.bond || 0) + 0.04); rec.mood = clamp01((rec.mood || 0) + 0.08); if (c.chem) { c.chem.lonely = Math.max(0, (c.chem.lonely || 0) - 0.08); c.chem.bored = Math.max(0, (c.chem.bored || 0) - 0.05); } }
    fx(game, "hearts", it.x, it.y + 0.4, it.z, 3);
    SB.bus.emit("animalPetted", { c: c, rec: rec });
    return { ok: true, msg: rec.name + " " + (rec.k === "grump" ? "hums" : A.SP[rec.k].move === "fly" ? "lands on your paw" : "leans into your paw") + ". " + moodWord(rec) };
  };
  A.brush = function (game, c, rec) {
    var it = body(game, rec);
    if (!Sv().has(c, "brush")) return { ok: false, msg: "you need a brush" };
    if (!near(c, it)) return { ok: false, msg: "get closer" };
    if (rec.brushed === day(game)) return { ok: false, msg: rec.name + " is already brushed and shining today" };
    rec.brushed = day(game); rec.mood = clamp01((rec.mood || 0) + 0.2); rec.bond = clamp01((rec.bond || 0) + 0.03);
    SB.bus.emit("animalBrushed", { c: c, rec: rec });
    return { ok: true, msg: "you brush " + rec.name + ". it shines" };
  };
  // a grown coat comes off with a blade (or a sharp stone): no need to hunt for fur
  A.shear = function (game, c, rec) {
    var S = Sv(), sp = A.SP[rec.k], it = body(game, rec);
    if (!sp.coat || rec.kid) return { ok: false, msg: "nothing to shear" };
    if (!S.has(c, "blade") && !S.has(c, "sharpstone")) return { ok: false, msg: "you need a blade to shear with" };
    if (!near(c, it)) return { ok: false, msg: "get closer" };
    if ((rec.coatT || 0) < 1) return { ok: false, msg: rec.name + "'s coat hasn't grown back yet" };
    rec.coatT = 0;
    var parts = [];
    sp.coat.forEach(function (x) { var left = S.add(c, x[0], x[1]); if (left > 0) S.spawn(game, x[0], left, it.x + 0.4, it.z + 0.3); parts.push(x[1] + " " + label(x[0])); });
    SB.bus.emit("animalSheared", { c: c, rec: rec });
    return { ok: true, msg: "✂ " + parts.join(", ") + " off " + rec.name + ". it looks cooler" };
  };
  A.fit = function (game, c, rec, kind) {
    var S = Sv(), sp = A.SP[rec.k], it = body(game, rec), g = rec.gear || (rec.gear = {});
    if (!S.has(c, kind)) return { ok: false, msg: "you don't have one" };
    if (!near(c, it)) return { ok: false, msg: "get closer" };
    if (kind === "collar") { if (rec.tag) return { ok: false, msg: rec.name + " already wears one" }; rec.tag = 1; }
    else if (kind === "saddle") { if (!sp.ride || rec.kid) return { ok: false, msg: "a saddle is for a grown loper" }; if (g.saddle) return { ok: false, msg: "already saddled" }; g.saddle = 1; rec.pack = []; }
    else if (kind === "pad") { if (!sp.fight) return { ok: false, msg: rec.name + " is no fighter" }; if (g.pad) return { ok: false, msg: "already padded" }; g.pad = 1; }
    else return { ok: false, msg: "" };
    S.take(c, kind, 1);
    SB.bus.emit("animalGear", { c: c, rec: rec, kind: kind });
    return { ok: true, msg: kind === "collar" ? rec.name + " wears your collar. it will never wander off" : kind === "saddle" ? rec.name + " is saddled: a faster ride, and six slots to carry" : rec.name + " is padded for a fight" };
  };
  A.rename = function (game, rec) {
    rec.nameN = (rec.nameN || 0) + 1;
    var list = rec.k === "grump" ? A.GRUMP_NAMES : A.NAMES, r = dice(game, "rename" + rec.id + ":" + rec.nameN), used = {};
    all(game).forEach(function (o) { used[o.name] = 1; });
    for (var i = 0; i < 40; i++) { var n = list[Math.floor(r() * list.length)]; if (!used[n]) { rec.name = n; break; } }
    return { ok: true, msg: "its name is " + rec.name + " now" };
  };
  A.setMode = function (game, c, rec, mode) {
    var it = body(game, rec);
    if (rec.k === "grump" && !rec.lit) return { ok: false, msg: "it only goes where the lead goes" };
    if (rec.kid && mode === "follow") return { ok: false, msg: rec.name + " is too little to leave home" };
    if (mode === "follow") {
      if (rec.mode === "follow") return { ok: true, msg: rec.name + " is with you" };
      if ((rec.hurt || 0) >= 1) return { ok: false, msg: rec.name + " is hurt and resting until morning" };
      if (A.followers(game).length >= A.followCap(game, c)) return { ok: false, msg: "that's too many at your heels. a pet that fully trusts you makes room for one more, and so does a vine lead" };
      rec.mode = "follow"; rec.pen = null;
      return { ok: true, msg: rec.name + " comes with you" };
    }
    if (st(game).ride === rec.id) A.dismount(game);
    rec.mode = rec.k === "grump" ? "guard" : "stay"; rec.pen = null; rec.sx = it.x; rec.sz = it.z; rec.fight = null;
    return { ok: true, msg: rec.name + (rec.mode === "guard" ? " stands guard here" : " waits here") };
  };
  A.sendHome = function (game, c, rec) {
    var h = SB.Home && SB.Home.get ? SB.Home.get(game) : null;
    if (!h) return { ok: false, msg: "you have no home yet" };
    var r = A.setMode(game, c, rec, "stay"); if (!r.ok) return r;
    rec.sx = h.x + 1.8; rec.sz = h.z + 1.4;
    return { ok: true, msg: rec.name + " heads home" };
  };
  A.release = function (game, rec) {
    var s = st(game), it = body(game, rec);
    if (s.ride === rec.id) A.dismount(game);
    spill(game, rec, it);
    delete s.list[rec.id]; delete IT[rec.id];
    live = live.filter(function (e) { return e.rec !== rec; });
    if (rec.k === "grump") SB.World.remove(game.world, it);
    else { it.noun = K[it.kind].noun; delete it.data.an; delete it.data.keep; it.data.t = 0; it.data.calm = 0; it.data.tr = 0; }
    SB.bus.emit("animalReleased", { rec: rec });
    return { ok: true, msg: rec.name + (rec.k === "grump" ? " walks off into the island, and waves" : " is wild again. off it goes") };
  };
  function spill(game, rec, it) { (rec.pack || []).forEach(function (sl) { if (sl) Sv().spawn(game, sl.k, sl.n, it.x + 0.5, it.z + 0.4); }); rec.pack = rec.gear && rec.gear.saddle ? [] : null; }
  function moodWord(rec) {
    var m = rec.mood || 0, h = rec.hunger || 0;
    return h > 0.8 ? "it is very hungry" : h > 0.55 ? "it is hungry" : m > 0.8 ? "it is very happy" : m > 0.55 ? "it is happy" : m > 0.3 ? "it is all right" : "it is glum";
  }
  A.moodWord = moodWord;
  // the whistle: every follower runs to you; with a whistle in your bag they hear it from anywhere
  A.call = function (game, c) {
    var far = Sv().has(c, "whistle"), n = 0, s = st(game);
    all(game).forEach(function (rec) {
      if (rec.mode !== "follow" && !(rec.id === s.mount && far)) return;
      var it = body(game, rec), d = SB.dist(c.x, c.z, it.x, it.z);
      if (d < 4) return;
      if (d > 30 && !far) return;
      if (rec.mode !== "follow" && A.followers(game).length >= A.followCap(game, c)) return;
      rec.mode = "follow"; rec.pen = null;
      if (blink(game, it, c.x, c.z)) n++;
    });
    SB.bus.emit("animalCall", { c: c, n: n });
    return { ok: n > 0, msg: n ? "🎵 " + n + " come running" : far ? "nobody needed calling" : "nobody near enough to hear. a reed whistle carries further" };
  };

  /* ---------------- tricks ---------------- */
  A.teach = function (game, c, rec, trick) {
    var S = Sv(), it = body(game, rec);
    if (!A.TRICKS[trick]) return { ok: false, msg: "" };
    if (rec.k === "grump" && !rec.lit) return { ok: false, msg: "not yet" };
    if ((rec.tricks || (rec.tricks = {}))[trick] >= 1) return { ok: false, msg: rec.name + " knows that one" };
    if (!S.has(c, "treat")) return { ok: false, msg: "a trick costs a critter treat each try" };
    if (!near(c, it, 5)) return { ok: false, msg: "get closer" };
    S.take(c, "treat", 1);
    rec.tricks[trick] = Math.min(1, (rec.tricks[trick] || 0) + 0.3 + (rec.bond || 0) * 0.25);
    rec.bond = clamp01((rec.bond || 0) + 0.02);
    if (rec.tricks[trick] >= 1) { snd(game, "chime"); SB.bus.emit("trickLearned", { c: c, rec: rec, trick: trick }); return { ok: true, learned: true, msg: "💡 " + rec.name + " has it! " + A.TRICKS[trick] }; }
    return { ok: true, msg: rec.name + " nearly has it (" + Math.round(rec.tricks[trick] * 100) + "%). another treat" };
  };
  A.doTrick = function (game, c, rec, trick) {
    var it = body(game, rec);
    if (!(rec.tricks && rec.tricks[trick] >= 1)) return { ok: false, msg: rec.name + " doesn't know that yet" };
    if (!near(c, it, 9)) return { ok: false, msg: rec.name + " can't hear you from there" };
    if (trick === "roll") {
      if ((rec.rollT || 0) > game.time) return { ok: false, msg: rec.name + " is dizzy. in a bit" };
      rec.rollT = game.time + 30; rec.spin = 1.3; rec.mood = clamp01((rec.mood || 0) + 0.05);
      SB.World.creaturesNear(game.world, game, it.x, it.z, 6, function (o) { if (o.alive && o.species === "smol" && o.chem) { o.chem.bored = Math.max(0, (o.chem.bored || 0) - 0.12); } });
      SB.bus.emit("trick", { c: c, rec: rec, trick: trick });
      return { ok: true, msg: rec.name + " does a happy roll. everyone watching cheers up" };
    }
    if (trick === "fetch") {
      var t = SB.World.nearestItem(game.world, it.x, it.z, 10, function (o) { return o.heldBy == null && !K[o.kind].critter && o.kind !== "egg" && !(o.data && (o.data.pod || o.data.starter)) && !Sv().whyNot(c, o.kind); });
      if (!t) return { ok: false, msg: rec.name + " looks about. nothing to fetch" };
      rec.fetch = { id: t.id, got: false };
      SB.bus.emit("trick", { c: c, rec: rec, trick: trick });
      return { ok: true, msg: rec.name + " is off after the " + label(t.kind) };
    }
    return { ok: true, msg: rec.name + " is listening for grumps" };
  };

  /* ---------------- riding ---------------- */
  A.mount = function (game) { var s = st(game); return s.ride != null ? s.list[s.ride] || null : null; };
  A.ride = function (game, c, rec) {
    var s = st(game), it = body(game, rec);
    if (!A.SP[rec.k].ride || rec.kid) return { ok: false, msg: rec.name + " can't carry you" };
    if (!near(c, it)) return { ok: false, msg: "get closer" };
    if ((rec.hunger || 0) >= 0.95) return { ok: false, msg: rec.name + " is too hungry to carry you. feed it" };
    if ((rec.hurt || 0) >= 1) return { ok: false, msg: rec.name + " is hurt and resting until morning" };
    s.ride = rec.id; s.mount = rec.id; c._ride = rideMul(rec);
    snd(game, "whoosh", 0.6);
    SB.bus.emit("mounted", { c: c, rec: rec });
    return { ok: true, msg: "🦘 you're riding " + rec.name + (rec.gear && rec.gear.saddle ? "" : " bareback. a basket saddle would be faster") };
  };
  function rideMul(rec) { return (rec.gear && rec.gear.saddle ? A.RIDE_SADDLE : A.RIDE) * (rec.coat === "ember" ? 1.1 : 1); }
  A.dismount = function (game) {
    var s = st(game), rec = A.mount(game), P = SB.Possess;
    s.ride = null;
    if (P && P.c) P.c._ride = 0;
    game.creatures.forEach(function (o) { if (o._ride) o._ride = 0; });
    if (!rec) return { ok: false, msg: "" };
    if (rec.mode !== "follow") { var it = body(game, rec); rec.sx = it.x; rec.sz = it.z; }
    SB.bus.emit("dismounted", { rec: rec });
    return { ok: true, msg: "you hop off " + rec.name };
  };
  // the mount's pack: six slots that travel with it
  A.packOf = function (rec) { if (!rec.gear || !rec.gear.saddle) return null; var p = rec.pack || (rec.pack = []); while (p.length < A.PACK) p.push(null); return p; };
  A.packPut = function (game, c, rec, i) {
    var p = A.packOf(rec), v = Sv().inv(c), sl = v.s[i];
    if (!p) return { ok: false, msg: "no saddle, no pack" };
    if (!near(c, body(game, rec), 4.5) && st(game).ride !== rec.id) return { ok: false, msg: rec.name + " is over there" };
    if (!sl || sl.k === "plans") return { ok: false, msg: "nothing there" };
    for (var j = 0; j < p.length; j++) if (!p[j]) { p[j] = { k: sl.k, n: sl.n }; if (sl.w != null) p[j].w = sl.w; v.s[i] = null; return { ok: true, msg: "packed " + sl.n + " " + label(sl.k) + " on " + rec.name }; }
    return { ok: false, msg: "the pack is full" };
  };
  A.packTake = function (game, c, rec, j) {
    var p = A.packOf(rec), sl = p && p[j];
    if (!sl) return { ok: false, msg: "nothing there" };
    if (!near(c, body(game, rec), 4.5) && st(game).ride !== rec.id) return { ok: false, msg: rec.name + " is over there" };
    var left = Sv().add(c, sl.k, sl.n, sl.w);
    if (left === sl.n) return { ok: false, msg: "your bag is full" };
    if (left > 0) sl.n = left; else p[j] = null;
    return { ok: true, msg: "took the " + label(sl.k) };
  };

  /* ---------------- pens ---------------- */
  function isPen(b) { return !!b && !!A.PENS[b.kind] && !!b.done; }
  A.isPen = isPen;
  function penData(b) { var d = b.data || (b.data = {}); if (!(d.feed >= 0)) d.feed = 0; if (!d.out || typeof d.out !== "object") d.out = {}; return d; }
  A.pens = function (game) { return game.world.structures.filter(isPen); };
  A.penAnimals = function (game, b) { return all(game).filter(function (r) { return r.pen === b.id && r.mode === "pen"; }); };
  A.penCap = function (b) { return A.PENS[b.kind].cap; };
  function costText(cost) { var out = []; for (var k in cost) out.push(cost[k] + " " + label(k)); return out.join(", "); }
  A.costText = costText;
  function lacks(c, cost) { for (var k in cost) if (Sv().count(c, k, true) < cost[k]) return "needs " + costText(cost); return ""; }
  function pay(c, cost) { for (var k in cost) Sv().take(c, k, cost[k]); }
  A.buildPen = function (game, c) {
    var S = Sv(), W = SB.World, P = SB.Possess;
    if (c.tier < 2) return { ok: false, msg: "you need hands to build a pen" };
    var why = lacks(c, A.PENS.pen.cost); if (why) return { ok: false, msg: "a pen " + why };
    var ag = P && P.active && P.c === c && P.aimGround ? P.aimGround(game, c, 7) : null, spots = [], i;
    if (ag) spots.push([ag.x, ag.z]);
    for (i = 0; i < 12; i++) { var a = c.facing + i * 0.5236, dd = 2.8 + (i > 5 ? 1.2 : 0); spots.push([c.x + Math.sin(a) * dd, c.z + Math.cos(a) * dd]); }
    for (i = 0; i < spots.length; i++) {
      var x = spots[i][0], z = spots[i][1];
      if (SB.dist(x, z, c.x, c.z) < 2 || !(S.canPlace ? S.canPlace(game, "pen", x, z) : W.siteFree(game.world, x, z, SK.pen.r))) continue;
      pay(c, A.PENS.pen.cost);
      var b = W.addStructure(game.world, game, "pen", x, z, { done: true, tribe: c.tribe, rot: c.facing + Math.PI, data: { feed: 0, out: {}, pov: 1 } });
      b.founder = c.name;
      snd(game, "build");
      SB.bus.emit("penBuilt", { c: c, st: b });
      return { ok: true, st: b, msg: "🐾 a pen! lead an animal in, and keep the trough full" };
    }
    return { ok: false, msg: "no room here: a pen needs flat, open ground" };
  };
  A.upgradePen = function (game, c, b) {
    if (!isPen(b)) return { ok: false, msg: "" };
    var nx = A.PENS[b.kind].next; if (!nx) return { ok: false, msg: "it's as good as a pen gets" };
    if (!near(c, b, 5)) return { ok: false, msg: "stand at the pen" };
    var why = lacks(c, A.PENS[nx].cost); if (why) return { ok: false, msg: "a " + SK[nx].label + " " + why };
    pay(c, A.PENS[nx].cost);
    b.kind = nx;
    if (SB.World.markNode) SB.World.markNode(game.world, b);
    snd(game, "build");
    SB.bus.emit("penUpgraded", { c: c, st: b });
    return { ok: true, msg: "🐾 it's a " + SK[nx].label + " now: room for " + A.PENS[nx].cap };
  };
  A.intoPen = function (game, c, rec, b) {
    if (!isPen(b)) return { ok: false, msg: "" };
    var inside = A.penAnimals(game, b), it = body(game, rec), wildG = rec.k === "grump" && !rec.lit;
    if (c && !near(c, b, 6)) return { ok: false, msg: "bring it to the pen" };
    if (c && !near(c, it, 9)) return { ok: false, msg: rec.name ? rec.name + " isn't with you" : "the grump isn't with you" };
    if (wildG && inside.length) return { ok: false, msg: "not in with the others: a grump needs a pen of its own" };
    if (!wildG && inside.some(function (r) { return r.k === "grump" && !r.lit; })) return { ok: false, msg: "there's a grump in there" };
    if (inside.length >= A.penCap(b)) return { ok: false, msg: "the pen is full (" + A.penCap(b) + ")" };
    if (st(game).ride === rec.id) A.dismount(game);
    rec.mode = "pen"; rec.pen = b.id; rec.fight = null;
    var d = penData(b); if (!inside.length) { d.sign = rec.k; b.name = wildG ? "the grump's pen" : "the " + A.SP[rec.k].name + " pen"; }
    it.x = b.x + 0.3; it.z = b.z + 0.2;
    SB.bus.emit("penned", { c: c, rec: rec, st: b });
    return { ok: true, msg: wildG ? "the grump is in the pen. it glares. feed it, then tickle it, a little every day" : nm(rec) + " settles into the pen" };
  };
  // one unit of anything an animal eats: hay, or a food some animal likes
  function feedWorth(kind) { if (kind === "feed") return 1; for (var k in A.SP) if (A.SP[k].likes[kind]) return 1; return 0; }
  A.fill = function (game, c, b) {
    if (!isPen(b)) return { ok: false, msg: "" };
    var S = Sv(), v = S.inv(c), d = penData(b), sl = S.held(c);
    if (!sl || !feedWorth(sl.k)) return { ok: false, msg: "hold hay, or a food they like" };
    if (!near(c, b, 5)) return { ok: false, msg: "get closer" };
    var n = Math.min(sl.n, A.TROUGH - d.feed);
    if (n <= 0) return { ok: false, msg: "the trough is full" };
    var k = sl.k;
    S.removeAt(c, v.sel, n);
    d.feed += n;
    SB.bus.emit("troughFilled", { c: c, st: b, n: n });
    return { ok: true, msg: n + " " + label(k) + " in the trough (" + d.feed + " of " + A.TROUGH + ")" };
  };
  A.outN = function (b) { var d = penData(b), n = 0; for (var k in d.out) n += d.out[k]; return n; };
  A.outText = function (b) { var d = penData(b), out = []; for (var k in d.out) if (d.out[k] > 0) out.push(d.out[k] + " " + label(k)); return out.join(", "); };
  A.collect = function (game, c, b) {
    if (!isPen(b)) return { ok: false, msg: "" };
    var S = Sv(), d = penData(b), parts = [], held = false;
    if (!near(c, b, 5)) return { ok: false, msg: "get closer" };
    for (var k in d.out) {
      var n = d.out[k]; if (!(n > 0)) continue;
      if (k === "milk" && !S.has(c, "pot")) { held = true; continue; }
      var left = S.add(c, k, n);
      if (left < n) parts.push((n - left) + " " + label(k));
      d.out[k] = left;
    }
    if (!parts.length) return { ok: false, msg: held ? "the milk is waiting, but you need a pot to carry it" : A.outN(b) ? "your bag is full" : "nothing yet. they give something each morning if they're fed" };
    snd(game, "pop");
    SB.bus.emit("penCollected", { c: c, st: b });
    return { ok: true, msg: "🧺 " + parts.join(", ") + (held ? " (the milk needs a pot)" : "") };
  };
  A.setHerder = function (game, c, b, on) {
    if (!isPen(b)) return { ok: false, msg: "" };
    var d = penData(b);
    if (!on) { d.herder = 0; return { ok: true, msg: "you'll mind this pen yourself" }; }
    if (SB.Game.smols(game).filter(function (o) { return o.tier >= 3; }).length < 3) return { ok: false, msg: "the tribe is too small to spare a herder (three smols of the tribe or more)" };
    d.herder = 1;
    SB.bus.emit("herder", { c: c, st: b });
    return { ok: true, msg: "the tribe will mind this pen: they keep the trough topped up and carry what it gives to your home's chest" };
  };
  A.penLine = function (game, b) {
    var d = penData(b), an = A.penAnimals(game, b);
    if (!an.length) return "empty · room for " + A.penCap(b);
    return an.map(function (r) { return nm(r); }).join(", ") + " · trough " + d.feed + "/" + A.TROUGH + (A.outN(b) ? " · waiting: " + A.outText(b) : "");
  };

  /* ---------------- the grump ---------------- */
  A.grump = function (game) { var out = null; all(game).forEach(function (r) { if (r.k === "grump" && !r.lit) out = r; }); return out; };
  A.canCapture = function (game, c, g) { return !!g && !g.boss && !(g.tough > 1.6) && !A.grump(game) && !!c && Sv().has(c, "lead"); };
  A.capture = function (game, c, g) {
    if (!A.canCapture(game, c, g)) return null;
    var s = st(game), id = s.n++;
    Sv().take(c, "lead", 1);
    var rec = { id: id, k: "grump", coat: "", kid: false, name: null, item: null, x: g.x, z: g.z, owner: c.id, by: c.name, mode: "led", pen: null, light: 0, bond: 0, hunger: 0.6, mood: 0.1, age: 0, born: day(game), caught: day(game), tricks: {}, gear: {} };
    s.list[id] = rec;
    var it = body(game, rec);
    live.push({ rec: rec, it: it });
    SB.bus.emit("grumpCaught", { c: c, rec: rec, g: g });
    tell(game, "➰ you loop your vine lead round the beaten grump. it's yours to lead: find it a pen of its own before morning");
    return rec;
  };
  var GRUMP_SAYS = [["grr.", "…", "mine!", "go away"], ["…warm?", "more.", "hm.", "…not bad"], ["i had a name. once.", "the dark is… thinner", "you came back", "…friend?"]];
  A.grumpLine = function (game, rec) { var st2 = (rec.light || 0) < 0.34 ? 0 : (rec.light || 0) < 0.67 ? 1 : 2, r = dice(game, "gl" + rec.id + ":" + Math.floor(game.time / 7)); return GRUMP_SAYS[st2][Math.floor(r() * 4)]; };
  function grumpDay(game, rec) { var d = day(game); if (rec.gDay !== d) { rec.gDay = d; rec.fedN = 0; rec.tickN = 0; } }
  function grumpGain(game, c, rec, v) {
    var was = rec.light || 0;
    rec.light = Math.min(1, was + v);
    var it = body(game, rec);
    fx(game, "sparkle", it.x, it.y + 0.5, it.z, 4);
    if (rec.light >= 1) return A.turn(game, c, rec);
    if (was < 0.5 && rec.light >= 0.5) { swapKind(it, recKind(rec)); snd(game, "chime"); SB.bus.emit("grumpFlicker", { c: c, rec: rec }); return { ok: true, msg: "the grump's chest flickers. something in there is waking up (" + Math.round(rec.light * 100) + "%)" }; }
    return null;
  }
  A.grumpFeed = function (game, c, rec) {
    var S = Sv(), hk = S.heldKind(c), it = body(game, rec);
    if (rec.mode !== "pen") return { ok: false, msg: "pen it first: it bites on the lead" };
    if (!hk || !S.edible(hk)) return { ok: false, msg: "hold some food. it likes meat best" };
    if (!near(c, it, 4.5)) return { ok: false, msg: "get closer" };
    grumpDay(game, rec);
    if (rec.fedN >= 2) return { ok: false, msg: "it's full for today. patience: a little every day" };
    S.take(c, hk, 1);
    rec.fedN++; rec.hunger = 0; rec.fedDay = day(game);
    snd(game, "eat", 0.6);
    SB.bus.emit("grumpFed", { c: c, rec: rec, kind: hk });
    var g = grumpGain(game, c, rec, hk === "meat" || hk === "cooked" || hk === "fish" ? 0.2 : 0.16);
    return g || { ok: true, msg: "it grabs the " + label(hk) + " and eats with its back to you. “" + A.grumpLine(game, rec) + "” (" + Math.round(rec.light * 100) + "%)" };
  };
  A.grumpTickle = function (game, c, rec) {
    var it = body(game, rec);
    if (rec.mode !== "pen") return { ok: false, msg: "pen it first: it bites on the lead" };
    if (!near(c, it, 4.5)) return { ok: false, msg: "get closer" };
    grumpDay(game, rec);
    if ((rec.tT || 0) > game.time) return { ok: false, msg: "give it a moment" };
    rec.tT = game.time + 4;
    if (rec.fedDay !== day(game)) {
      c.chem.health = Math.max(0.05, c.chem.health - 0.03);
      SB.bus.emit("grumpSnap", { c: c, rec: rec });
      return { ok: false, snap: true, msg: "it snaps at your paw! feed it first: a fed grump is a softer grump" };
    }
    if (rec.tickN >= 3) return { ok: false, msg: "enough for today. it's pretending not to smile" };
    rec.tickN++;
    SB.bus.emit("grumpTickled", { c: c, rec: rec });
    var g = grumpGain(game, c, rec, 0.08);
    return g || { ok: true, msg: "it squirms. it nearly laughs. “" + A.grumpLine(game, rec) + "” (" + Math.round(rec.light * 100) + "%)" };
  };
  // the moment: its light comes back, it remembers it was a smol, and it stays to guard the home
  A.turn = function (game, c, rec) {
    var it = body(game, rec), W = SB.World, pen = rec.pen != null ? W.structById(game.world, rec.pen) : null, h = SB.Home && SB.Home.get ? SB.Home.get(game) : null;
    rec.light = 1; rec.lit = day(game);
    rec.name = pickName(game, rec.id, A.GRUMP_NAMES);
    rec.mode = "guard"; rec.pen = null; rec.bond = 0.85; rec.mood = 0.95; rec.hunger = 0.1; rec.trait = "brave";
    var ax = h ? h.x + 2 : pen ? pen.x + SK[pen.kind].r + 1.2 : it.x, az = h ? h.z - 1.6 : pen ? pen.z : it.z;
    rec.sx = ax; rec.sz = az;
    if (pen) { pen.name = null; if (pen.data) pen.data.sign = null; if (dry(game, ax, az)) { it.x = ax; it.z = az; } }
    swapKind(it, "tamegrump");
    snd(game, "achievement"); fx(game, "sparkle", it.x, it.y + 0.6, it.z, 30); fx(game, "hearts", it.x, it.y + 0.8, it.z, 10);
    if (SB.Game.addSparks) SB.Game.addSparks(game, 5, c || it);
    if (SB.Game.note) SB.Game.note(game, "a grump's light came back. it remembers it was a smol. its name is " + rec.name + " ✨");
    SB.bus.emit("grumpTurned", { c: c, rec: rec });
    return { ok: true, turned: true, msg: "✨ its light came back! it blinks, and remembers it was a smol once. “" + rec.name + ". i was " + rec.name + ".” it will guard your home now (+5 ✨)" };
  };

  /* ---------------- hunting ---------------- */
  // a spear on one of the new animals: meat and fur, a herd that scatters, and a loper that kicks back
  A.hunt = function (game, c, it) {
    var sp = A.SP[spOf(it.kind)], W = SB.World;
    if (!sp || !A.wildOf(it)) return { ok: false, msg: "" };
    if (SB.dist(c.x, c.z, it.x, it.z) > 3.6) return { ok: false, msg: "too far: get closer" };
    var skill = SB.Body && SB.Body.bonus ? SB.Body.bonus(c, "hunt") : 0, x = it.x, z = it.z;
    scare(game, it, c, 9);
    if (Math.random() < 0.5 + Math.min(0.35, skill * 0.7) && !isKid(it.kind)) {
      W.remove(game.world, it);
      Sv().spawn(game, "meat", sp.meat || 1, x, z, { by: c.id });
      if (sp.fur) Sv().spawn(game, "fur", sp.fur, x + 0.3, z, { by: c.id });
      if (SB.Body && SB.Body.xp) SB.Body.xp(c, "hunt", 2);
      SB.bus.emit("hunt", { c: c, kind: it.kind });
      return { ok: true, msg: "got it! " + (sp.herd ? "the rest of the herd bolts" : "") };
    }
    if (sp.kick && SB.dist(c.x, c.z, x, z) < 2.4) {
      c.chem.health = Math.max(0.05, c.chem.health - 0.08);
      var a = Math.atan2(c.x - x, c.z - z), kx = c.x + Math.sin(a) * 1.8, kz = c.z + Math.cos(a) * 1.8;
      if (W.walkable(game.world, kx, kz, false)) { c.x = kx; c.z = kz; }
      SB.bus.emit("animalKick", { c: c, it: it });
      return { ok: false, kick: true, msg: "missed, and the loper kicks back! ow" };
    }
    return { ok: false, msg: isKid(it.kind) ? "it's only little. you let it go" : "missed" };
  };
  function scare(game, it, from, r) {
    var kin = spOf(it.kind);
    wild.forEach(function (o) {
      if (o.gone || (o !== it && (spOf(o.kind) !== kin || !A.SP[kin].herd)) || SB.dist(o.x, o.z, it.x, it.z) > r) return;
      var a = Math.atan2(o.x - from.x, o.z - from.z); o.data.gx = o.x + Math.sin(a) * 10; o.data.gz = o.z + Math.cos(a) * 10; o.data.run = 4; o.data.th = 3; o.data.calm = 0;
    });
  }
  A.catchGold = function (game, c, it) {
    if (SB.dist(c.x, c.z, it.x, it.z) > 3) return { ok: false, msg: "too far" };
    if (Math.random() < 0.6) {
      SB.World.remove(game.world, it);
      if (SB.Game.addSparks) SB.Game.addSparks(game, 3, c);
      snd(game, "chime");
      SB.bus.emit("goldBug", { c: c });
      return { ok: true, msg: "🪙 caught the golden bug! it melts into light: +3 ✨" };
    }
    var a = Math.atan2(it.x - c.x, it.z - c.z); it.data.gx = it.x + Math.sin(a) * 6; it.data.gz = it.z + Math.cos(a) * 6; it.data.run = 3; it.data.th = 2;
    return { ok: false, msg: "it skitters off. quick, again" };
  };

  /* ---------------- every frame: legs ---------------- */
  function chaseOff(game, rec, g) {
    var c = you(game) || SB.Game.byId(game, rec.owner) || SB.Game.smols(game)[0];
    g.alive = false; g.gone = true; g.dying = false;
    fx(game, "crumbs", g.x, g.y + 0.5, g.z, 14);
    rec.fight = null; rec.wins = (rec.wins || 0) + 1; rec.bond = clamp01((rec.bond || 0) + 0.05);
    if (SB.Game.note) SB.Game.note(game, rec.name + " chased a grump off for good! 🐾");
    if (c && c.alive) SB.bus.emit("grumpChased", { c: c, g: g, pet: rec.id });
    SB.bus.emit("petWon", { rec: rec, g: g });
    tell(game, A.SP[rec.k].icon + " " + rec.name + " chased a grump off for good!");
  }
  function driveTame(game, e, dt, me) {
    var rec = e.rec, o = e.it, d = o.data, sp = A.SP[rec.k], s = st(game);
    if (o.gone || !sp) return;
    if (o.heldBy != null && o.heldBy !== "hand") { var hb = SB.Game.byId(game, o.heldBy); if (hb && hb.holding === o.id) hb.holding = null; o.heldBy = null; }
    if (o.heldBy === "hand") return;
    if (rec.spin > 0) { rec.spin -= dt; o.rot = (o.rot || 0) + dt * 12; rest(o, sp.move); return; }
    if (s.ride === rec.id) {
      if (!me) { s.ride = null; return; }
      o.x = me.x - Math.sin(me.facing) * 0.25; o.z = me.z - Math.cos(me.facing) * 0.25; o.rot = me.facing; rest(o, sp.move); d.hop = 0; return;
    }
    var tx = null, tz = null, stop = 0.5, fast = false, dd;
    if (rec.fight != null) {
      var g = SB.Game.byId(game, rec.fight);
      if (!g || !g.alive || g.gone || g.species !== "grump") rec.fight = null;
      else {
        tx = g.x; tz = g.z; stop = 1.1; fast = true;
        if (SB.dist(o.x, o.z, g.x, g.z) < 1.6) {
          rec.hitT = (rec.hitT || 0) - dt;
          if (rec.hitT <= 0) {
            rec.hitT = 1.3;
            g.whacked = (g.whacked || 0) + sp.fight * (rec.trait === "brave" ? 1.25 : 1) * ((rec.hunger || 0) > 0.8 ? 0.5 : 1);
            if (g.chem && SB.Chem) SB.Chem.apply(g.chem, { pain: 0.15, fear: 0.25 });
            rec.hurt = (rec.hurt || 0) + (rec.k === "grump" ? 0.04 : rec.gear && rec.gear.pad ? 0.07 : 0.14);
            fx(game, "stars", g.x, g.y + 0.6, g.z, 4); snd(game, "bonk", 0.5);
            if (g.whacked >= (SB.Threats && SB.Threats.whacksNeeded ? SB.Threats.whacksNeeded(g) : 3)) chaseOff(game, rec, g);
            else if (rec.hurt >= 1) { rec.fight = null; rec.mode = rec.k === "grump" ? "guard" : "stay"; if (s.ride === rec.id) A.dismount(game); tell(game, rec.name + " is hurt and limps off to rest until morning"); }
          }
        }
      }
    }
    if (rec.fight == null && rec.fetch) {
      var f = SB.World.itemById(game.world, rec.fetch.id);
      if (!f || f.gone || (f.heldBy != null) || !me) rec.fetch = null;
      else if (!rec.fetch.got) { tx = f.x; tz = f.z; stop = 0.7; fast = true; if (SB.dist(o.x, o.z, f.x, f.z) < 0.9) rec.fetch.got = true; }
      else {
        f.x = o.x; f.z = o.z; f.y = o.y + 0.25; f.onGround = false; tx = me.x; tz = me.z; stop = 1.5; fast = true;
        if (SB.dist(o.x, o.z, me.x, me.z) < 1.8) { f.x = me.x + Math.sin(me.facing) * 0.6; f.z = me.z + Math.cos(me.facing) * 0.6; f.onGround = false; rec.fetch = null; rec.bond = clamp01((rec.bond || 0) + 0.02); tell(game, rec.name + " drops the " + label(f.kind) + " at your feet"); SB.bus.emit("fetched", { rec: rec, it: f }); }
      }
    }
    if (tx == null && rec.fight == null) {
      if ((rec.mode === "follow" || rec.mode === "led") && me) {
        dd = SB.dist(o.x, o.z, me.x, me.z);
        if (dd > 24) { blink(game, o, me.x, me.z); return; }
        if (sp.small && dd > 1.4) { // little ones ride along at your shoulder
          var k = Math.min(1, dt * 3.5), sx = me.x + Math.cos(me.facing) * 0.7, sz = me.z - Math.sin(me.facing) * 0.7;
          o.x += (sx - o.x) * k; o.z += (sz - o.z) * k; rest(o, sp.move); return;
        }
        tx = me.x; tz = me.z; stop = rec.mode === "led" ? 2.6 : 1.9 + (e.slot || 0) * 0.5; fast = dd > (rec.mode === "led" ? 7 : 4.5);
      } else if (rec.mode !== "follow" && rec.mode !== "led") {
        var an = anchor(game, rec);
        dd = SB.dist(o.x, o.z, an.x, an.z);
        if (dd > an.r + 1.5) { tx = an.x; tz = an.z; stop = an.r * 0.5; fast = dd > 9; if (dd > 60) { blink(game, o, an.x, an.z); return; } }
        else {
          d.wT = (d.wT || 0) - dt;
          if (d.wT <= 0) {
            d.wT = 2 + Math.random() * 5;
            if (Math.random() < 0.55 && !(game.world.night && !sp.night)) { var wa = Math.random() * 6.283, wd = Math.random() * an.r; d.wx = an.x + Math.sin(wa) * wd; d.wz = an.z + Math.cos(wa) * wd; }
            else d.wx = null;
          }
          if (d.wx != null) { tx = d.wx; tz = d.wz; stop = 0.35; }
        }
      }
    }
    moveTo(o, sp.move, tx, tz, stop, fast, dt);
  }
  function driveWild(game, o, dt, me) {
    var d = o.data, def = K[o.kind], spk = spOf(o.kind), sp = A.SP[spk], W = SB.World;
    if (o.gone || o.heldBy != null) return;
    if (d.calm > 0) d.calm -= dt;
    if (d.buck) { // being ridden out
      var rider = SB.Game.byId(game, d.buck.who);
      d.buck.t -= dt; d.t = 1e6;
      d.bT = (d.bT || 0) - dt;
      if (d.bT <= 0) { d.bT = 0.6; var ba = Math.random() * 6.283; d.gx = o.x + Math.sin(ba) * 5; d.gz = o.z + Math.cos(ba) * 5; }
      moveTo(o, sp.move, d.gx, d.gz, 0.3, true, dt);
      if (rider && rider.alive && W.walkable(game.world, o.x, o.z, false)) { rider.x = o.x; rider.z = o.z; }
      if (d.buck.t <= 0 || !rider || !rider.alive) {
        d.buck = null; d.tr = 0.7; d.calm = 0;
        if (rider && rider.alive) { rider.chem.health = Math.max(0.05, rider.chem.health - 0.04); SB.bus.emit("thrown", { c: rider, it: o }); if (rider === me) tell(game, "thrown off! the loper trots away, looking pleased. offer it something and try again"); }
      }
      return;
    }
    if (def.an || def.gold) d.t = 1e6;
    else { // bunnies, flutterbies and beetles run themselves, unless you have calmed one
      if (d.calm > 0 || d.stray) rest(o, sp.move); else if (d.t > 1e5) d.t = 0;
      return;
    }
    if (d.run > 0) d.run -= dt;
    d.th = (d.th || 0) - dt;
    if (d.th <= 0) {
      d.th = 0.6 + Math.random() * 0.5;
      var lure = false, threat = null, td = 1e9;
      if (!sp) sp = { move: "crawl", shy: 3.5 };
      if (d.calm > 0 || d.stray) { d.gx = null; }
      else {
        if (me && sp.likes) { var hk = Sv().heldKind(me), md = SB.dist(me.x, me.z, o.x, o.z); if (hk && likeOf(sp, hk) && md < 9) { lure = true; if (md > 2) { d.gx = me.x; d.gz = me.z; } else d.gx = null; } }
        if (!lure) {
          var shy = sp.shy * (game.world.night && spk === "clucker" ? 0.4 : 1);
          if (shy > 0) W.creaturesNear(game.world, game, o.x, o.z, shy, function (c) { if (!c.alive) return; var q = SB.dist(c.x, c.z, o.x, o.z); if (q < td) { td = q; threat = c; } });
          if (threat) { var fa = Math.atan2(o.x - threat.x, o.z - threat.z) + (Math.random() - 0.5) * 0.8; d.gx = o.x + Math.sin(fa) * 8; d.gz = o.z + Math.cos(fa) * 8; d.run = 2.5; if (sp.herd) scare(game, o, threat, 8); }
          else if (!(d.run > 0)) {
            if (game.world.night && !sp.night && !def.gold) d.gx = null; // asleep
            else {
              var cx = 0, cz = 0, n = 0;
              if (sp.herd) wild.forEach(function (w2) { if (w2 !== o && !w2.gone && spOf(w2.kind) === spk && SB.dist(w2.x, w2.z, o.x, o.z) < 16) { cx += w2.x; cz += w2.z; n++; } });
              if (n && SB.dist(cx / n, cz / n, o.x, o.z) > 4.5) { d.gx = cx / n; d.gz = cz / n; }
              else if (Math.random() < 0.3) { var wa2 = Math.random() * 6.283; d.gx = o.x + Math.sin(wa2) * 3.5; d.gz = o.z + Math.cos(wa2) * 3.5; }
              else if (Math.random() < 0.5) d.gx = null;
            }
          }
        }
      }
      if (d.gx != null && !dry(game, d.gx, d.gz)) d.gx = null;
    }
    moveTo(o, sp ? sp.move : "crawl", d.gx, d.gz, 0.4, d.run > 0, dt);
  }

  /* ---------------- once a second: who is where ---------------- */
  function sync(game) {
    var s = st(game), w = game.world, id, slot = 0;
    live = [];
    for (id in s.list) {
      var rec = s.list[id], o = body(game, rec);
      rec.x = Math.round(o.x * 10) / 10; rec.z = Math.round(o.z * 10) / 10;
      if (rec.mode === "pen" && (rec.pen == null || !isPen(SB.World.structById(w, rec.pen)))) { rec.mode = rec.k === "grump" && !rec.lit ? "led" : "stay"; rec.pen = null; rec.sx = o.x; rec.sz = o.z; }
      live.push({ rec: rec, it: o, slot: rec.mode === "follow" ? slot++ : 0 });
    }
    wild = [];
    for (var i = 0; i < w.items.length; i++) {
      var it = w.items[i], def = K[it.kind];
      if (!def || !def.critter || (it.data && it.data.an != null)) continue;
      if (def.an || def.gold || (it.data && (it.data.calm > 0 || it.data.stray || it.data.t > 1e5))) wild.push(it);
    }
    if (s.ride != null && (!s.list[s.ride] || !you(game))) A.dismount(game);
  }
  A.sync = sync;

  /* ---------------- wild ones come and go ---------------- */
  var HOME_B = {
    clucker: ["meadow", "forest", "flowers", "blossom", "savanna", "bamboo", "maple", "jungle"],
    woolly: ["meadow", "taiga", "tundra", "mountain", "flowers", "maple", "crystal"],
    loper: ["savanna", "meadow", "desert", "mesa", "ash", "flowers", "beach"]
  };
  A.CAP = { clucker: 4, woolly: 5, loper: 2, glowbug: 5 };
  function coatFor(game, sp, bm, r) {
    var B = SB.B || {};
    if (sp === "woolly") return bm === B.tundra || bm === B.taiga || bm === B.mountain ? "snow" : r() < 0.08 ? "dusk" : "";
    if (sp === "loper") return bm === B.ash || bm === B.mesa || bm === B.desert ? "ember" : "";
    if (sp === "clucker") { var v = r(); return v < 0.02 ? "gold" : v < 0.1 ? "blue" : ""; }
    return "";
  }
  A.spawnWild = function (game, sp, x, z, coat, kid) {
    var k = kindFor(sp, coat || "", !!kid);
    if (!K[k]) return null;
    var o = SB.World.add(game.world, game, k, x, z, {});
    o.data.t = 1e6;
    wild.push(o);
    return o;
  };
  function populate(game) {
    var w = game.world, W = SB.World, me = you(game), focus = me || (SB.Mine && SB.Mine.get ? SB.Mine.get(game) : null) || SB.Game.smols(game)[0];
    if (!focus || !wr) return;
    var counts = { clucker: 0, woolly: 0, loper: 0, glowbug: 0, goldbug: 0 }, i, B = SB.B || {};
    for (i = wild.length - 1; i >= 0; i--) {
      var o = wild[i], spk = o.kind === "goldbug" ? "goldbug" : spOf(o.kind);
      if (o.gone || counts[spk] == null) continue;
      var far = SB.dist(o.x, o.z, focus.x, focus.z) > 75, d = o.data;
      if (!d.stray && !(d.tr > 0) && !d.buck && (far || (spk === "glowbug" && !w.night) || (spk === "goldbug" && (o.age || 0) > 500))) { W.remove(w, o); wild.splice(i, 1); continue; }
      counts[spk]++;
    }
    var cm = SB.wopt ? SB.wopt(game, "critters") : 1;
    for (var sp in A.CAP) {
      if (counts[sp] >= Math.round(A.CAP[sp] * cm)) continue;
      if (sp === "glowbug" ? !w.night : w.night) continue;
      var a = wr() * 6.283, dd = 16 + wr() * 14, x = focus.x + Math.sin(a) * dd, z = focus.z + Math.cos(a) * dd;
      if (!W.inBounds(w, x, z) || !dry(game, x, z)) continue;
      var bm = W.biomeAt ? W.biomeAt(w, x, z) : -1, ok = sp === "glowbug" || (fails[sp] || 0) > 8;
      if (!ok) (HOME_B[sp] || []).forEach(function (b) { if (B[b] === bm) ok = true; });
      if (bm === B.ocean) ok = false;
      if (!ok) { fails[sp] = (fails[sp] || 0) + 1; continue; }
      var n = sp === "woolly" ? 3 : sp === "glowbug" ? 2 : 1, coat = coatFor(game, sp, bm, wr);
      for (i = 0; i < n; i++) { var px = x + (wr() - 0.5) * 3, pz = z + (wr() - 0.5) * 3; if (dry(game, px, pz)) A.spawnWild(game, sp, px, pz, sp === "woolly" && i ? coatFor(game, sp, bm, wr) : coat, false); }
    }
    if (!counts.goldbug && !w.night && wr() < 0.03) {
      var ga = wr() * 6.283, gx = focus.x + Math.sin(ga) * 14, gz = focus.z + Math.cos(ga) * 14;
      if (dry(game, gx, gz)) { var gb = W.add(w, game, "goldbug", gx, gz, {}); gb.data.t = 1e6; wild.push(gb); SB.bus.emit("goldBugSeen", { it: gb }); }
    }
  }
  A.populate = populate;

  /* ---------------- every two seconds: needs, noses, teeth ---------------- */
  var warnT = 0, nuzT = 60;
  function grumpNear(game, x, z, r) {
    var best = null, bd = r;
    SB.World.creaturesNear(game.world, game, x, z, r, function (o) { if (!o.alive || o.gone || o.species !== "grump" || o.boss) return; var q = SB.dist(o.x, o.z, x, z); if (q < bd) { bd = q; best = o; } });
    return best;
  }
  function find(game, rec, o, me) {
    var sp = A.SP[rec.k], list = (sp.finds || []).filter(function (x) { return K[x[0]]; });
    if (!list.length) return null;
    var r = dice(game, "find" + rec.id + ":" + (rec.finds || 0)), tot = 0, i;
    for (i = 0; i < list.length; i++) tot += list[i][1];
    var roll = r() * tot; i = 0; while (i < list.length - 1 && (roll -= list[i][1]) > 0) i++;
    var kind = list[i][0];
    rec.finds = (rec.finds || 0) + 1;
    Sv().spawn(game, kind, 1, o.x + 0.3, o.z + 0.2, { by: me ? me.id : null });
    SB.bus.emit("petFound", { rec: rec, kind: kind });
    return kind;
  }
  function slow(game, dt) {
    var s = st(game), me = you(game), w = game.world, W = SB.World, rate = dt / (SB.DAY_LENGTH * A.HUNGER_DAYS);
    warnT -= dt;
    var meGrump = me ? grumpNear(game, me.x, me.z, A.WARN_R * 1.5) : null;
    live.forEach(function (e) {
      var rec = e.rec, o = e.it, sp = A.SP[rec.k], pen = rec.mode === "pen" ? W.structById(w, rec.pen) : null;
      // hunger: slower when grazing in a pen by day (not in winter); a trough feeds whoever is peckish
      var graze = pen && !w.night && w.season !== 3 && !(rec.k === "grump");
      rec.hunger = clamp01((rec.hunger || 0) + rate * (rec.trait === "greedy" ? 1.3 : 1) * (graze ? 0.5 : 1) * (s.ride === rec.id ? 2 : 1));
      if (pen && rec.hunger > 0.5 && penData(pen).feed > 0 && !(rec.k === "grump" && !rec.lit)) { penData(pen).feed--; rec.hunger = clamp01(rec.hunger - 0.6); rec.neglect = 0; }
      if (rec.k === "grump" && !rec.lit) return;
      if (s.ride === rec.id && rec.hunger >= 0.95) { A.dismount(game); tell(game, rec.name + " is too hungry to carry you any further"); }
      var withMe = me && (rec.mode === "follow" || s.ride === rec.id);
      // teeth: a fighter goes for a grump near you, or near what it guards
      if (sp.fight && rec.fight == null && !rec.kid && (rec.hurt || 0) < 1) {
        var g = withMe ? (meGrump && SB.dist(meGrump.x, meGrump.z, me.x, me.z) < 9 ? meGrump : null) : rec.mode !== "pen" ? grumpNear(game, o.x, o.z, rec.mode === "guard" ? A.GUARD_R : 6) : null;
        if (g && s.ride !== rec.id) { rec.fight = g.id; rec.hitT = 0.4; SB.bus.emit("petFight", { rec: rec, g: g }); }
      }
      // a warning: thumping, clucking, growling
      var wg = withMe ? (meGrump && SB.dist(meGrump.x, meGrump.z, me.x, me.z) < A.WARN_R * (rec.tricks && rec.tricks.speak >= 1 ? 1.5 : 1) ? meGrump : null) : (rec.mode === "stay" || rec.mode === "guard") ? grumpNear(game, o.x, o.z, A.GUARD_R) : null;
      if (wg && warnT <= 0 && (withMe || !me || SB.dist(me.x, me.z, o.x, o.z) < 45)) {
        warnT = A.WARN_GAP;
        SB.bus.emit("petWarn", { rec: rec, g: wg });
        tell(game, sp.icon + " " + rec.name + (rec.k === "grump" ? " growls" : sp.move === "fly" ? " is flashing about" : rec.k === "clucker" ? " is clucking like mad" : " is thumping") + ": a grump" + (withMe ? " is close!" : " is near your home!"), "night");
      }
      if (!withMe) {
        // a pet at home keeps the village company
        if (rec.mode === "stay" && sp.pet) W.creaturesNear(w, game, o.x, o.z, 5, function (c) { if (c.alive && c.species === "smol" && c.chem && !c._pov) { c.chem.lonely = Math.max(0, (c.chem.lonely || 0) - 0.004 * dt); c.chem.bored = Math.max(0, (c.chem.bored || 0) - 0.004 * dt); } });
        // flutterbies (and any pet with wings) at rest make the bushes round them fruit faster
        if (sp.pollinate && W.eachNodeNear) W.eachNodeNear(w, o.x, o.z, 6, function (n) { if (n.dropT > 0 && n.state === "ok" && SB.NODES[n.kind] && SB.NODES[n.kind].drops) n.dropT -= dt * 0.5; });
        return;
      }
      // a nose: now and then a follower digs something up
      if (sp.finds && s.ride !== rec.id) {
        if (rec.findT == null) rec.findT = A.FIND_EVERY;
        rec.findT -= dt * (0.5 + (rec.bond || 0)) * (rec.trait === "nosy" ? 1.4 : rec.trait === "sleepy" ? 0.7 : 1);
        if (rec.findT <= 0) { rec.findT = A.FIND_EVERY; var kind = find(game, rec, o, me); if (kind) tell(game, sp.icon + " " + rec.name + " dug up " + label(kind) + "!"); }
      }
      // a familiar: once, a pet that fully trusts you licks you back onto your feet
      if (me.chem.health < 0.15 && me.chem.health > 0 && (rec.bond || 0) >= 0.9 && !rec.saved) { rec.saved = day(game); me.chem.health = 0.5; fx(game, "hearts", me.x, me.y + 1, me.z, 12); SB.bus.emit("petSaved", { rec: rec, c: me }); tell(game, "💗 " + rec.name + " won't leave you. it nuzzles you back onto your feet (once)"); }
    });
    // a pet with you sends a prowler packing, once a night
    var P = SB.Possess, ps = P && P.state ? P.state() : null;
    if (me && ps && ps.prowl != null && SB.Wilds && SB.Wilds.endProwl && s.prowlDay !== day(game)) {
      var brave = null; live.forEach(function (e) { if (e.rec.mode === "follow" && e.rec.k !== "grump" && !brave) brave = e.rec; });
      if (brave) { s.prowlDay = day(game); SB.Wilds.endProwl(A.SP[brave.k].icon + " " + brave.name + " puffs up and squeaks. the prowler thinks better of it", true); SB.bus.emit("petScare", { rec: brave }); }
    }
    // nuzzling: a small lift, said out loud only once in a long while
    nuzT -= dt;
    if (me && nuzT <= 0) {
      nuzT = 90;
      var nz = null; live.forEach(function (e) { if (e.rec.mode === "follow" && e.rec.k !== "grump" && SB.dist(e.it.x, e.it.z, me.x, me.z) < 3 && !nz) nz = e.rec; });
      if (nz) { me.chem.lonely = Math.max(0, (me.chem.lonely || 0) - 0.1); me.chem.bored = Math.max(0, (me.chem.bored || 0) - 0.05); nz.mood = clamp01((nz.mood || 0) + 0.03); SB.bus.emit("nuzzle", { rec: nz, c: me }); if ((s.nuzSaid || 0) + 300 < game.time) { s.nuzSaid = game.time; tell(game, A.SP[nz.k].icon + " " + nz.name + " nuzzles your foot"); } }
    }
    // night: a grump at an open pen spooks what's in it (a roof, or a guard, stops that)
    if (w.night) A.pens(game).forEach(function (b) {
      var d = penData(b), dn = day(game);
      if (b.kind === "roofpen" || d.spook === dn) return;
      var an = A.penAnimals(game, b); if (!an.length || (an[0].k === "grump" && !an[0].lit)) return;
      var g = grumpNear(game, b.x, b.z, 5); if (!g) return;
      var guard = false; live.forEach(function (e) { if (e.rec.fight != null || ((e.rec.k === "grump" ? e.rec.lit : A.SP[e.rec.k].fight) && e.rec.mode !== "pen" && SB.dist(e.it.x, e.it.z, b.x, b.z) < A.GUARD_R)) guard = true; });
      if (guard) return;
      d.spook = dn;
      an.forEach(function (r) { r.mood = clamp01((r.mood || 0) - 0.35); });
      SB.bus.emit("penSpooked", { st: b, g: g });
      tell(game, "🌙 a grump got at your pen in the night. nobody's hurt, but they're shaken. a roof or a guard would stop it", "night");
    });
  }
  A.slow = slow;

  /* ---------------- each dawn ---------------- */
  function die(game, rec, why) {
    var s = st(game), o = body(game, rec), me = you(game);
    if (s.ride === rec.id) A.dismount(game);
    spill(game, rec, o);
    s.gone.push({ name: rec.name, k: rec.k, born: rec.born, died: day(game) }); if (s.gone.length > 12) s.gone.shift();
    delete s.list[rec.id]; delete IT[rec.id];
    SB.World.remove(game.world, o);
    var who = me || SB.Game.byId(game, rec.owner);
    if (who && who.alive && who.chem && (rec.bond || 0) > 0.5) { who.chem.lonely = Math.min(1, (who.chem.lonely || 0) + 0.3); if (SB.Chem && SB.Chem.apply) SB.Chem.apply(who.chem, { reward: -0.2 }); }
    SB.bus.emit("animalDied", { rec: rec, why: why });
    tell(game, "🕯 " + rec.name + " the " + A.SP[rec.k].name + " grew old and went to sleep for good. it had a good life with you");
  }
  A.dawn = function (game) {
    if (!game || game.offline) return;
    var s = st(game), dn = day(game), w = game.world, W = SB.World, made = {}, news = [];
    if (s.dawn === dn) return;
    s.dawn = dn;
    sync(game);
    var h = SB.Home && SB.Home.get ? SB.Home.get(game) : null;
    all(game).forEach(function (rec) {
      var sp = A.SP[rec.k], o = body(game, rec), pen = rec.mode === "pen" ? W.structById(w, rec.pen) : null;
      rec.age = (rec.age || 0) + 1; rec.hurt = 0;
      if (rec.k === "grump" && !rec.lit) {
        if (rec.mode === "led") { delete s.list[rec.id]; delete IT[rec.id]; W.remove(w, o); SB.bus.emit("grumpSlipped", { rec: rec }); news.push("the grump chewed through the lead in the night and is gone"); return; }
        if (rec.fedDay !== dn - 1 && rec.fedDay !== dn) rec.light = Math.max(0, (rec.light || 0) - 0.04);
        if ((rec.light || 0) < 0.5 && o.kind !== "pengrump") swapKind(o, "pengrump");
        return;
      }
      if (rec.kid && rec.age >= A.GROW_DAYS) { rec.kid = false; rec.age = 4; swapKind(o, recKind(rec)); SB.bus.emit("animalGrew", { rec: rec }); news.push(rec.name + " is all grown up"); }
      // mood settles toward how it is being kept
      var crowd = pen ? Math.max(0, A.penAnimals(game, pen).length - A.penCap(pen)) * 0.2 : 0;
      var cold = pen && w.season === 3 && pen.kind !== "roofpen" && !(W.nearestFire && W.nearestFire(w, pen.x, pen.z, 6)) ? 0.25 : 0;
      var target = clamp01(0.95 - (rec.hunger || 0) * 0.8 - crowd - cold + (rec.brushed === dn - 1 ? 0.15 : 0) + (rec.trait === "sleepy" ? 0.1 : 0));
      rec.mood = clamp01((rec.mood || 0) * 0.5 + target * 0.5);
      // forgotten animals drift away (a collar holds them)
      if ((rec.hunger || 0) >= 0.95) {
        rec.neglect = (rec.neglect || 0) + 1;
        rec.bond = clamp01((rec.bond || 0) - (rec.tag ? 0.04 : rec.trait === "loyal" ? 0.08 : 0.16));
        if (rec.bond < 0.12 && !rec.tag && rec.k !== "grump") { news.push(rec.name + " was hungry too long and has gone back to the wild"); A.release(game, rec); SB.bus.emit("animalLeft", { rec: rec }); return; }
      } else rec.neglect = 0;
      if (sp.life && rec.age > sp.life) { die(game, rec, "age"); return; }
      if (sp.coat && !rec.kid) rec.coatT = Math.min(1, (rec.coatT || 0) + 1 / sp.coatDays);
      // what a kept animal gives: nothing glum, one fine, two happy (a rare coat sometimes one more)
      if (pen && !rec.kid && (rec.hunger || 0) < 0.6) {
        var d = penData(pen), n = rec.mood >= 0.75 ? 2 : rec.mood >= 0.3 ? 1 : 0;
        if (n && rec.coat && rec.coat !== "snow" && dice(game, "rare" + rec.id + ":" + dn)() < 0.5) n++;
        if (sp.daily && n) { d.out[sp.daily] = Math.min(A.OUT_MAX, (d.out[sp.daily] || 0) + n); made[sp.daily] = (made[sp.daily] || 0) + n; }
        if (sp.bug && n && dice(game, "bug" + rec.id + ":" + dn)() < 0.6) { W.add(w, game, sp.bug, pen.x + 1.5, pen.z + 0.8, {}); made[sp.bug] = (made[sp.bug] || 0) + 1; }
      }
      // a pet that stays home leaves a little something by the door
      if (!pen && rec.mode === "stay" && sp.finds && (rec.bond || 0) >= 0.6 && !rec.kid) { var kind = find(game, rec, h && SB.dist(o.x, o.z, h.x, h.z) < 12 ? { x: h.x + 1, z: h.z + 1 } : o, null); if (kind) made[kind] = (made[kind] || 0) + 1; }
    });
    // young: a fed, happy pair in a pen with room. a treat the day before nearly settles it
    A.pens(game).forEach(function (b) {
      var d = penData(b), an = A.penAnimals(game, b), by = {}, k;
      if (d.herder) { // the tribe minds it: the trough is topped up, and what it gave goes to your chest
        d.feed = Math.max(d.feed, Math.min(A.TROUGH, an.length));
        if (h && SB.Home.has && SB.Home.has(game, "chest") && SB.Home.put) for (k in d.out) if (d.out[k] > 0) d.out[k] = SB.Home.put(game, k, d.out[k]);
      }
      if (an.length >= A.penCap(b)) return;
      an.forEach(function (r) { if (!r.kid && r.k !== "grump" && (r.mood || 0) >= 0.6 && (r.hunger || 0) < 0.5) (by[r.k] || (by[r.k] = [])).push(r); });
      for (k in by) {
        if (by[k].length < 2 || A.SP[k].small) continue;
        var pa = by[k][0], pb = by[k][1], keen = pa.love >= dn - 1 && pb.love >= dn - 1, r = dice(game, "baby" + b.id + ":" + dn);
        if (r() >= (keen ? 0.85 : 0.3)) continue;
        var coat = r() < 0.5 ? pa.coat : pb.coat; if (r() < 0.1 && A.COATS[k]) coat = A.COATS[k][Math.floor(r() * A.COATS[k].length)][0];
        var id = s.n++, tk = ["greedy", "brave", "nosy", "sleepy", "loyal"];
        var kid = { id: id, k: k, coat: coat || "", kid: true, name: pickName(game, id, A.NAMES), item: null, x: b.x + 0.4, z: b.z - 0.3, owner: pa.owner, by: pa.by, mode: "pen", pen: b.id, bond: 0.5, hunger: 0.1, mood: 0.85, age: 0, born: dn, trait: r() < 0.5 ? pa.trait : tk[Math.floor(r() * tk.length)], coatT: 0, tricks: {}, gear: {}, bornHere: 1 };
        s.list[id] = kid; body(game, kid);
        SB.bus.emit("animalBorn", { rec: kid, st: b, a: pa, b: pb });
        news.push(pa.name + " and " + pb.name + " have a little one: " + kid.name);
        break;
      }
    });
    // a stray: now and then something hungry hangs about a pen with food in it
    var pens = A.pens(game), sr = dice(game, "stray:" + dn);
    if (pens.length && sr() < 0.22 && !wild.some(function (o) { return o.data && o.data.stray && !o.gone; })) {
      var pb2 = pens[Math.floor(sr() * pens.length)];
      if (penData(pb2).feed > 0 && A.penAnimals(game, pb2).length < A.penCap(pb2)) {
        var sk = sr() < 0.5 ? "clucker" : "hopper", sx = pb2.x + SK[pb2.kind].r + 1.4, sz = pb2.z + 0.6;
        if (dry(game, sx, sz)) { var so = W.add(w, game, kindFor(sk, "", false), sx, sz, {}); so.data.stray = 1; so.data.tr = 0.7; so.data.t = 1e6; wild.push(so); SB.bus.emit("stray", { it: so, st: pb2 }); news.push("a stray " + A.SP[sk].name + " is hanging about your pen. one snack would win it"); }
      }
    }
    var parts = []; for (var mk in made) parts.push(made[mk] + " " + label(mk));
    if (parts.length) news.unshift("morning: " + parts.join(", ") + " from your animals");
    if (news.length) { SB.bus.emit("animalsDawn", { made: made, news: news }); tell(game, "🐾 " + news.slice(0, 3).join(" · ")); }
    sync(game);
  };

  /* ---------------- the tick ---------------- */
  var tS = 0, tW = 0, tN = 0;
  A.tick = function (game, dt) {
    if (!game || game.offline || game.showcase || !game.world) return;
    if (game !== curGame) { curGame = game; IT = {}; live = []; wild = []; fails = {}; tS = 0; tW = 3; tN = 1; wr = dice(game, "animals:wild:" + Math.floor(game.time || 0)); }
    if (!game.quests || !game.quests.animals) st(game);
    if ((tS -= dt) <= 0) { tS = 1; sync(game); }
    var me = you(game), i;
    if (me) { var m = A.mount(game); me._ride = m ? rideMul(m) : 0; }
    for (i = 0; i < live.length; i++) driveTame(game, live[i], dt, me);
    for (i = 0; i < wild.length; i++) driveWild(game, wild[i], dt, me);
    if ((tN -= dt) <= 0) { tN = 2; slow(game, 2); }
    if ((tW -= dt) <= 0) { tW = 7; if (!game.headless) populate(game); }
  };

  /* ---------------- hooks ---------------- */
  function wildOptions(game, c, it, o, x) {
    var spk = spOf(it.kind), sp = A.SP[spk], d = it.data || {}, hk = x.hk, name = label(it.kind);
    function run(fn) { return function () { var r = fn(game, c, it); if (r.msg) x.say(r.msg); if (r.ok) x.audio(r.nip ? "bonk" : "pop", 0.6); return true; }; }
    if (d.buck) { o.use = o.pick = x.op("hold on!", run(A.hold), null); o.place = null; return; }
    var like = hk ? likeOf(sp, hk) : 0;
    if (like) o.place = x.op("offer your " + label(hk) + " to the " + name, run(A.offer), null);
    if (d.tr >= 1 && sp.ride && !isKid(it.kind)) o.use = x.op("hop on the " + name + " and hold tight", run(A.buckStart), null);
    else if (d.calm > 0 || d.stray) o.use = x.op("tickle the " + name, run(A.tickle), null);
    else if (hk === "spear" && K[it.kind].an) o.use = x.op("spear the " + name, function () { if (x.swing) x.swing(); var r = A.hunt(game, c, it); if (r.msg) x.say(r.msg); x.audio("bonk", 0.6); return true; }, null);
    o.pick = like ? o.place : (d.calm > 0 || d.stray) ? o.use : x.op("watch the " + name, function () { x.say(sp.icon + " " + name + ": it likes " + bestFood(sp) + ". hold some out, wait, then tickle it" + (sp.ride ? ". then ride it out" : "")); return true; }, null);
  }
  function tameOptions(game, c, rec, it, o, x) {
    var sp = A.SP[rec.k], hk = x.hk, S = Sv(), s = st(game), name = nm(rec);
    function run(fn, a, b) { return function () { var r = fn(game, c, rec, a, b); if (r && r.msg) x.say(r.msg); if (r && r.ok) x.audio(r.turned ? "achievement" : "pop", 0.6); return true; }; }
    o.use = null; o.place = null; o.pick = null;
    if (rec.k === "grump" && !rec.lit) {
      o.use = x.op("tickle the grump", run(A.grumpTickle), null);
      if (hk && S.edible(hk)) o.place = x.op("feed the grump your " + label(hk), run(A.grumpFeed), null);
      o.pick = x.op("listen to the grump", function () { x.say("“" + A.grumpLine(game, rec) + "” · its light: " + Math.round((rec.light || 0) * 100) + "%. " + (rec.mode === "pen" ? "feed it, then tickle it, a little every day" : "it needs a pen of its own")); return true; }, null);
      return;
    }
    if (hk === "brush") o.use = x.op("brush " + name, run(A.brush), null);
    else if ((hk === "blade" || hk === "sharpstone") && sp.coat && (rec.coatT || 0) >= 1 && !rec.kid) o.use = x.op("shear " + name, run(A.shear), null);
    else if (sp.ride && !rec.kid && s.ride == null) o.use = x.op("ride " + name, run(A.ride), null);
    else o.use = x.op((rec.k === "grump" ? "pat " : "pet ") + name, run(A.pet), null);
    if (hk === "collar" || hk === "saddle" || hk === "pad") o.place = x.op(hk === "collar" ? "put your collar on " + name : hk === "saddle" ? "saddle " + name : "fit your padding on " + name, run(A.fit, hk), null);
    else if (hk && (hk === "feed" || likeOf(sp, hk) || (rec.k === "grump" && S.edible(hk)))) o.place = x.op("feed " + name + " your " + label(hk), run(A.feed), null);
    else if (rec.tricks && rec.tricks.fetch >= 1 && rec.mode === "follow") o.place = x.op(name + ", fetch!", run(A.doTrick, "fetch"), null);
    if (rec.mode === "follow") o.pick = x.op("tell " + name + (rec.k === "grump" ? " to guard here" : " to wait here"), run(A.setMode, "stay"), null);
    else if (!rec.kid) o.pick = x.op("call " + name + " to heel", run(A.setMode, "follow"), null);
    else o.pick = o.use;
  }
  function penOptions(game, c, b, o, x) {
    var hk = x.hk, an = A.penAnimals(game, b), cand = null, g = A.grump(game);
    function run(fn, a, b2) { return function () { var r = fn(game, c, a, b2); if (r && r.msg) x.say(r.msg); if (r && r.ok) x.audio("pop", 0.6); return true; }; }
    if (g && g.mode === "led") cand = g;
    else A.followers(game).forEach(function (r) { if (!cand && !A.SP[r.k].ride && SB.dist(body(game, r).x, body(game, r).z, b.x, b.z) < 9) cand = r; });
    if (cand) o.use = x.op("put " + nm(cand) + " in the pen", function () { var r = A.intoPen(game, c, cand, b); if (r.msg) x.say(r.msg); if (r.ok) x.audio("pop", 0.6); return true; }, null);
    else o.use = x.op("look over the pen", function () { x.say("🐾 " + A.penLine(game, b)); x.openBag("animals"); return true; }, null);
    if (hk && feedWorth(hk)) o.place = x.op("put your " + label(hk) + " in the trough", run(A.fill, b), null);
    if (A.outN(b)) o.pick = x.op("collect " + A.outText(b), run(A.collect, b), null);
    else if (!o.pick) o.pick = x.op("look over the pen", function () { x.say("🐾 " + A.penLine(game, b) + (an.length ? "" : ". lead an animal here and choose “put in the pen”")); return true; }, null);
  }
  A.options = function (game, c, r, o, x) {
    if (!game || !c || !Sv()) return;
    var s = st(game);
    if (r && r.type === "item" && r.ref && K[r.ref.kind] && K[r.ref.kind].critter) {
      var it = r.ref, rec = A.byItem(game, it);
      if (it.kind === "goldbug") o.use = o.pick = x.op("catch the golden bug", function () { var q = A.catchGold(game, c, it); x.say(q.msg); return true; }, null);
      else if (rec) tameOptions(game, c, rec, it, o, x);
      else if (A.wildOf(it)) wildOptions(game, c, it, o, x);
    } else if (r && r.type === "struct" && isPen(r.ref)) penOptions(game, c, r.ref, o, x);
    else if (r && r.type === "creature" && r.ref && r.ref.stranger && r.ref.stranger.state === "waiting" && x.hk && Sv().edible(x.hk)) {
      var cr = r.ref;
      o.place = x.op("win " + cr.name + " over with your " + label(x.hk), function () { var q = A.woo(game, c, cr); if (q.msg) x.say(q.msg); if (q.ok) x.audio("pop", 0.6); return true; }, null);
    }
    if (s.ride != null && !r && !o.pick) { var m = A.mount(game); if (m) o.pick = x.op("hop off " + m.name, function () { var q = A.dismount(game); if (q.msg) x.say(q.msg); return true; }, null); }
  };
  A.vitals = function (game, c) {
    if (!game || !game.quests || !game.quests.animals) return [];
    var s = st(game), out = [], m = A.mount(game), hungry = null, g = A.grump(game);
    if (m) out.push({ icon: "🦘", text: "riding " + m.name, tip: "look away from everything and pick up to hop off" });
    all(game).forEach(function (r) { if ((r.mode === "follow" || s.ride === r.id) && (r.hunger || 0) > 0.75 && !hungry) hungry = r; });
    if (hungry) out.push({ icon: A.SP[hungry.k].icon, text: hungry.name + " is hungry", bad: true });
    if (g && g.mode === "led") out.push({ icon: "➰", text: "grump on the lead", bad: true, tip: "find it a pen of its own before morning" });
    return out;
  };
  A.goals = function (game, add) {
    if (!game || !game.quests || !game.quests.animals) return;
    var g = A.grump(game);
    if (g) add("bring the penned grump's light back", Math.round((g.light || 0) * 100) + "%", false);
  };
  var hooked = false;
  A.hook = function () {
    if (hooked || !SB.bus) return; hooked = true;
    function cur() { return SB.Game && SB.Game.current; }
    SB.bus.on("dawn", function () { var game = cur(); if (game) A.dawn(game); });
    // a beaten grump, and a vine lead in your bag: it is tied, not chased off
    SB.bus.on("grumpChased", function (d) {
      var game = cur(), me = game ? you(game) : null;
      if (!game || !d || !d.g || d.pet != null || !me || d.c !== me) return;
      A.capture(game, me, d.g);
    });
    if (SB.Ext) {
      SB.Ext.on("tick", A.tick);
      SB.Ext.on("options", A.options);
      SB.Ext.on("vitals", A.vitals);
      SB.Ext.on("goals", A.goals);
      SB.Ext.on("damage", function (game, c) { return c && c._ride ? A.RIDE_HIT : 1; });
      SB.Ext.tab({ id: "animals", label: function () { return "🐾 animals"; }, show: function (game, c) { return !!c && (c.tier >= 2 || all(game).length > 0); }, html: function (game, c, icon) { return A.html(game, c, icon); }, wire: function (root, game, c, redraw, say) { A.wire(root, game, c, redraw, say); } });
    }
    // riding: the smol you are in moves at its mount's pace
    var C = SB.Creature;
    if (C && C.speedOf && !C._animalsSpeed) { var so = C.speedOf; C.speedOf = function (c, a) { var v = so(c, a); return c && c._ride > 0 ? v * c._ride : v; }; C._animalsSpeed = 1; }
    // pedlars carry a few animal things too
    if (SB.Loot && SB.Loot.PACK && K.treat) { SB.Loot.PACK.push(["treat", 2, 2], ["collar", 1, 3], ["whistle", 1, 3]); }
  };
  A.hook();

  /* ---------------- making things ---------------- */
  A.makeWhy = function (game, c, id) {
    var m = null; A.MAKES.forEach(function (x) { if (x.id === id) m = x; });
    if (!m) return "that's not a thing";
    if (c.tier < 2) return "you need hands to make things";
    return lacks(c, m.cost);
  };
  A.make = function (game, c, id) {
    var why = A.makeWhy(game, c, id), m = null;
    if (why) return { ok: false, msg: why };
    A.MAKES.forEach(function (x) { if (x.id === id) m = x; });
    pay(c, m.cost);
    var left = Sv().add(c, m.out, m.n);
    if (left > 0) Sv().spawn(game, m.out, left, c.x + 0.5, c.z + 0.4);
    SB.bus.emit("animalMade", { c: c, kind: m.out });
    return { ok: true, msg: "made " + m.n + " " + label(m.out) };
  };

  /* ---------------- the bag's "animals" tab ---------------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]; }); }
  function bar(v) { var n = Math.round(clamp01(v) * 5), out = ""; for (var i = 0; i < 5; i++) out += i < n ? "●" : "○"; return out; }
  A.nearPen = function (game, c) { var best = null, bd = 6; A.pens(game).forEach(function (b) { var d = SB.dist(b.x, b.z, c.x, c.z); if (d < bd) { bd = d; best = b; } }); return best; };
  A.html = function (game, c, icon) {
    icon = icon || function () { return ""; };
    var s = st(game), list = all(game), out = "", pen = A.nearPen(game, c), S = Sv();
    function btn(act, id, text, off) { return "<button class='btn' data-an='" + act + "' data-id='" + id + "' " + (off ? "disabled" : "") + ">" + text + "</button>"; }
    if (!list.length) out += "<p><b>no animals yet.</b> hold out the food a wild one likes, wait, and tickle it. bunnies like sunroots, cluckers like grain and seeds, woollies like grain, lopers like sunroots, and flutterbies and glowbugs like honeycomb. a critter treat works on anything.</p>";
    else {
      out += "<div class='lbl'>your animals · " + A.followers(game).length + " of " + A.followCap(game, c) + " at your heels <button class='btn' data-an='call' data-id='0'>🎵 call them</button></div><div class='rlist'>";
      list.forEach(function (rec) {
        var sp = A.SP[rec.k], wildG = rec.k === "grump" && !rec.lit, where = s.ride === rec.id ? "you're riding it" : rec.mode === "follow" ? "with you" : rec.mode === "pen" ? "in a pen" : rec.mode === "led" ? "on your lead" : rec.mode === "guard" ? "on guard" : "waiting";
        out += "<div class='rc'><span class='big'>" + sp.icon + "</span><div class='t'>" + esc(nm(rec)) + " · " + esc(recLabel(rec)) + " · " + where;
        if (wildG) out += "<small>its light " + bar(rec.light || 0) + " · " + (rec.mode === "pen" ? "feed it (twice a day), then tickle it (three times). a little every day" : "it needs a pen of its own before morning") + "</small></div></div>";
        else {
          out += "<small>bond " + bar(rec.bond) + " · " + esc(moodWord(rec)) + (rec.kid ? " · little" : "") + (rec.trait ? " · " + esc(A.TRAITS[rec.trait] || rec.trait) : "") + (rec.tag ? " · collar" : "") + (rec.gear && rec.gear.pad ? " · padded" : "") + (sp.coat && (rec.coatT || 0) >= 1 && !rec.kid ? " · coat ready to shear" : "") + "</small>";
          out += "<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
          if (s.ride === rec.id) out += btn("off", rec.id, "hop off");
          else {
            out += rec.mode === "follow" ? btn("stay", rec.id, rec.k === "grump" ? "guard here" : "wait here") : btn("follow", rec.id, "follow me", rec.kid);
            if (rec.mode !== "pen" && pen && !sp.ride) out += btn("pen", rec.id, "into the pen");
            if (SB.Home && SB.Home.get && SB.Home.get(game) && rec.mode !== "pen") out += btn("home", rec.id, "go home");
          }
          out += btn("name", rec.id, "new name");
          for (var tk in A.TRICKS) { var tv = (rec.tricks && rec.tricks[tk]) || 0; out += tv >= 1 ? (tk === "speak" ? "" : btn("do:" + tk, rec.id, tk + "!")) : btn("teach:" + tk, rec.id, "teach " + tk + (tv ? " " + Math.round(tv * 100) + "%" : ""), !S.has(c, "treat")); }
          out += btn("free", rec.id, "let it go") + "</div>";
          var p = A.packOf(rec);
          if (p) {
            out += "<div class='grid' style='grid-template-columns:repeat(6,minmax(0,40px))'>";
            for (var j = 0; j < p.length; j++) out += "<div class='slot' data-an='take' data-id='" + rec.id + "' data-j='" + j + "' title='" + (p[j] ? esc(label(p[j].k)) : "") + "'>" + (p[j] ? icon(p[j].k, 32) + (p[j].n > 1 ? "<em>" + p[j].n + "</em>" : "") : "") + "</div>";
            out += "</div>";
            var v = S.inv(c), puts = "";
            for (var i = 0; i < v.s.length; i++) if (v.s[i] && v.s[i].k !== "plans") puts += "<button class='btn' data-an='put' data-id='" + rec.id + "' data-j='" + i + "'>" + icon(v.s[i].k, 16) + " " + esc(label(v.s[i].k)) + (v.s[i].n > 1 ? " ×" + v.s[i].n : "") + "</button>";
            if (puts) out += "<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'><span class='help'>pack:</span>" + puts + "</div>";
          }
          out += "</div></div>";
        }
      });
      out += "</div>";
    }
    out += "<div class='lbl'>pens</div><div class='rlist'>";
    if (pen) {
      var d = penData(pen), nx = A.PENS[pen.kind].next;
      out += "<div class='rc'><span class='big'>🐾</span><div class='t'>" + esc(SK[pen.kind].label) + " · " + A.penAnimals(game, pen).length + " of " + A.penCap(pen) + "<small>" + esc(A.penLine(game, pen)) + "</small></div>" +
        (A.outN(pen) ? "<button class='btn go' data-an='collect' data-id='" + pen.id + "'>collect</button>" : "") +
        "<button class='btn' data-an='herder' data-id='" + pen.id + "'>" + (d.herder ? "mind it myself" : "ask the tribe to mind it") + "</button></div>";
      if (nx) out += "<div class='rc'><span class='big'>🔨</span><div class='t'>make it a " + esc(SK[nx].label) + "<small>" + esc(SK[nx].desc) + " · " + esc(costText(A.PENS[nx].cost)) + "</small></div><button class='btn go' data-an='up' data-id='" + pen.id + "' " + (lacks(c, A.PENS[nx].cost) ? "disabled" : "") + ">build</button></div>";
    }
    out += "<div class='rc'><span class='big'>🐾</span><div class='t'>a new pen, right here<small>" + esc(SK.pen.desc) + " · " + esc(costText(A.PENS.pen.cost)) + "</small></div><button class='btn go' data-an='build' data-id='0' " + (c.tier < 2 || lacks(c, A.PENS.pen.cost) ? "disabled" : "") + ">build</button></div></div>";
    out += "<div class='lbl'>make</div><div class='rlist'>";
    A.MAKES.forEach(function (m) {
      var need = [];
      for (var k in m.cost) { var n = S.count(c, k, true); need.push("<span class='" + (n >= m.cost[k] ? "ok" : "no") + "'>" + icon(k, 16) + " " + Math.min(n, m.cost[k]) + "/" + m.cost[k] + "</span>"); }
      out += "<div class='rc'><span class='big'>" + icon(m.out, 28) + "</span><div class='t'>" + (m.n > 1 ? m.n + " " : "") + esc(label(m.out)) + "<small>" + esc(K[m.out].desc) + "</small><div class='need'>" + need.join("") + "</div></div><button class='btn go' data-an='make' data-id='" + m.id + "' " + (A.makeWhy(game, c, m.id) ? "disabled" : "") + ">make</button></div>";
    });
    out += "</div>";
    if (s.gone.length) out += "<div class='lbl'>remembered · " + s.gone.map(function (g) { return esc(g.name) + " (" + A.SP[g.k].icon + " day " + g.born + " to " + g.died + ")"; }).join(" · ") + "</div>";
    return out;
  };
  A.act = function (game, c, act, id, j) {
    var s = st(game), rec = s.list[id], b = SB.World.structById ? SB.World.structById(game.world, +id) : null;
    if (act === "call") return A.call(game, c);
    if (act === "build") return A.buildPen(game, c);
    if (act === "make") return A.make(game, c, id);
    if (act === "up") return A.upgradePen(game, c, b);
    if (act === "collect") return A.collect(game, c, b);
    if (act === "herder") return A.setHerder(game, c, b, !(b && b.data && b.data.herder));
    if (!rec) return { ok: false, msg: "it's gone" };
    if (act === "off") return A.dismount(game);
    if (act === "stay" || act === "follow") return A.setMode(game, c, rec, act);
    if (act === "home") return A.sendHome(game, c, rec);
    if (act === "pen") { var p = A.nearPen(game, c); return p ? A.intoPen(game, c, rec, p) : { ok: false, msg: "stand at a pen" }; }
    if (act === "name") return A.rename(game, rec);
    if (act === "free") return A.release(game, rec);
    if (act === "take") return A.packTake(game, c, rec, +j);
    if (act === "put") return A.packPut(game, c, rec, +j);
    if (act.indexOf("teach:") === 0) return A.teach(game, c, rec, act.slice(6));
    if (act.indexOf("do:") === 0) return A.doTrick(game, c, rec, act.slice(3));
    return { ok: false, msg: "" };
  };
  A.wire = function (root, game, c, redraw, say) {
    root.querySelectorAll("[data-an]").forEach(function (el) {
      el.addEventListener("click", function () {
        var r = A.act(game, c, el.getAttribute("data-an"), el.getAttribute("data-id"), el.getAttribute("data-j"));
        if (r && r.msg && say) say(r.msg);
        if (r && r.ok && SB.Audio && SB.Audio.play) SB.Audio.play("craft");
        redraw();
      });
    });
  };

  /* ---------------- the models ---------------- */
  var ME = SB.Meshes || SB.ME;
  function eyes(b, x, y, z, s) { b.color(0x1a1a22).push().translate(x, y, z).scale(s).sphere(0).pop().push().translate(-x, y, z).scale(s).sphere(0).pop(); }
  function clucker(col, s) {
    return function () {
      var b = ME.builder(); b.push().scale(s);
      b.smoothShade(true).color(col).push().translate(0, 0.16, 0).scale(0.13, 0.13, 0.17).sphere(1).pop();
      b.push().translate(0, 0.31, 0.11).scale(0.085).sphere(1).pop();
      b.push().translate(0, 0.24, -0.17).scale(0.05, 0.09, 0.04).sphere(0).pop();
      b.color(0xff9a3d).push().translate(0, 0.3, 0.19).rotX(1.57).cone(4, 0.03, 0.07).pop();
      b.color(0xe5484d).push().translate(0, 0.4, 0.11).scale(0.025, 0.04, 0.05).sphere(0).pop();
      eyes(b, 0.05, 0.33, 0.17, 0.014);
      b.color(0xff9a3d).push().translate(0.05, 0, 0).cyl(4, 0.012, 0.012, 0.07).pop().push().translate(-0.05, 0, 0).cyl(4, 0.012, 0.012, 0.07).pop();
      b.pop(); return b.finish();
    };
  }
  function woolly(col, s) {
    return function () {
      var b = ME.builder(), dark = 0x4a3f3a; b.push().scale(s);
      b.smoothShade(true).color(col).push().translate(0, 0.22, 0).scale(0.2, 0.17, 0.24).sphere(1).pop();
      [[0.1, 0.3, 0.08], [-0.1, 0.3, 0.06], [0.08, 0.3, -0.1], [-0.09, 0.29, -0.12], [0, 0.34, -0.02]].forEach(function (p) { b.push().translate(p[0], p[1], p[2]).scale(0.1).sphere(0).pop(); });
      b.color(dark).push().translate(0, 0.27, 0.24).scale(0.08, 0.08, 0.09).sphere(1).pop();
      b.push().translate(0.09, 0.3, 0.22).scale(0.04, 0.02, 0.03).sphere(0).pop().push().translate(-0.09, 0.3, 0.22).scale(0.04, 0.02, 0.03).sphere(0).pop();
      b.color(0xffffff).push().translate(0.035, 0.3, 0.31).scale(0.014).sphere(0).pop().push().translate(-0.035, 0.3, 0.31).scale(0.014).sphere(0).pop();
      b.color(dark); [[0.1, 0.12], [-0.1, 0.12], [0.1, -0.12], [-0.1, -0.12]].forEach(function (p) { b.push().translate(p[0], 0, p[1]).cyl(4, 0.025, 0.025, 0.1).pop(); });
      b.pop(); return b.finish();
    };
  }
  function loper(col, s) {
    return function () {
      var b = ME.builder(); b.push().scale(s);
      b.smoothShade(true).color(col).push().translate(0, 0.5, -0.05).scale(0.3, 0.3, 0.42).sphere(1).pop();
      b.push().translate(0, 0.86, 0.36).scale(0.17, 0.16, 0.2).sphere(1).pop();
      b.push().translate(0, 0.66, 0.24).scale(0.13, 0.2, 0.14).sphere(1).pop();
      b.push().translate(0.08, 1.02, 0.3).rotX(-0.25).scale(0.04, 0.2, 0.03).sphere(0).pop().push().translate(-0.08, 1.02, 0.3).rotX(-0.25).scale(0.04, 0.2, 0.03).sphere(0).pop();
      b.color(0xf5e8d8).push().translate(0, 0.5, -0.46).scale(0.1).sphere(0).pop();
      b.push().translate(0, 0.82, 0.53).scale(0.07, 0.05, 0.05).sphere(0).pop();
      eyes(b, 0.11, 0.9, 0.48, 0.022);
      b.color(col); [[0.19, -0.12], [-0.19, -0.12]].forEach(function (p) { b.push().translate(p[0], 0.24, p[1]).scale(0.11, 0.24, 0.17).sphere(1).pop(); b.push().translate(p[0], 0.03, p[1] + 0.12).scale(0.07, 0.03, 0.17).sphere(0).pop(); });
      [[0.14, 0.22], [-0.14, 0.22]].forEach(function (p) { b.push().translate(p[0], 0, p[1]).cyl(4, 0.035, 0.03, 0.34).pop(); });
      b.pop(); return b.finish();
    };
  }
  function bunnyKit() {
    var b = ME.builder(), col = 0xd9c7a8; b.push().scale(0.6);
    b.smoothShade(true).color(col).push().translate(0, 0.16, 0).scale(0.16, 0.15, 0.2).sphere(1).pop();
    b.push().translate(0, 0.26, 0.15).scale(0.11).sphere(1).pop();
    b.push().translate(0.05, 0.4, 0.12).scale(0.03, 0.1, 0.02).sphere(0).pop().push().translate(-0.05, 0.4, 0.12).scale(0.03, 0.1, 0.02).sphere(0).pop();
    b.color(0xf5e8d8).push().translate(0, 0.17, -0.2).scale(0.07).sphere(0).pop();
    eyes(b, 0.06, 0.29, 0.23, 0.018);
    b.pop(); return b.finish();
  }
  function bug(col, glow) {
    return function () {
      var b = ME.builder();
      b.smoothShade(true).color(col).glow(glow).push().translate(0, 0.06, 0).scale(0.07, 0.06, 0.09).sphere(1).pop().glow(0);
      b.color(0x1a1a22).push().translate(0, 0.06, 0.08).scale(0.035).sphere(0).pop();
      b.color(0xf5f3ed).push().translate(0.07, 0.11, 0).rotZ(-0.5).box(0.12, 0.008, 0.06).pop().push().translate(-0.07, 0.11, 0).rotZ(0.5).box(0.12, 0.008, 0.06).pop();
      return b.finish();
    };
  }
  // a grump as the island draws them, small: a dark round body, horns, a scowl. as the light comes back it pales and its chest glows
  function grump(col, light) {
    return function () {
      var b = ME.builder();
      b.smoothShade(true).color(col).push().translate(0, 0.3, 0).scale(0.3, 0.29, 0.3).sphere(1).pop();
      b.color(0xe8e0d0).push().translate(0.16, 0.52, 0.02).rotZ(-0.5).cone(5, 0.05, 0.16).pop().push().translate(-0.16, 0.52, 0.02).rotZ(0.5).cone(5, 0.05, 0.16).pop();
      b.color(light >= 2 ? 0xffffff : 0xffe27a).glow(light >= 2 ? 0 : 0.5).push().translate(0.1, 0.36, 0.26).scale(0.045).sphere(0).pop().push().translate(-0.1, 0.36, 0.26).scale(0.045).sphere(0).pop().glow(0);
      b.color(0x1a1a22).push().translate(0.1, 0.36, 0.3).scale(0.02).sphere(0).pop().push().translate(-0.1, 0.36, 0.3).scale(0.02).sphere(0).pop();
      if (light < 2) b.push().translate(0.1, 0.43, 0.27).rotZ(0.45).box(0.11, 0.025, 0.03).pop().push().translate(-0.1, 0.43, 0.27).rotZ(-0.45).box(0.11, 0.025, 0.03).pop(); // the scowl
      b.color(0x1a1a22).push().translate(0, 0.24, 0.29).box(light >= 2 ? 0.1 : 0.08, 0.018, 0.02).pop();
      if (light >= 1) b.color(0xffd27a).glow(light >= 2 ? 1.2 : 0.5).push().translate(0, 0.2, 0.25).scale(light >= 2 ? 0.07 : 0.045).sphere(0).pop().glow(0);
      if (light >= 2) b.color(0xc5ff49).push().translate(0, 0.5, 0).scale(0.2, 0.025, 0.2).sphere(0).pop(); // a collar of its own
      b.color(col).push().translate(0.14, 0, 0.04).cyl(5, 0.06, 0.05, 0.08).pop().push().translate(-0.14, 0, 0.04).cyl(5, 0.06, 0.05, 0.08).pop();
      return b.finish();
    };
  }
  var THINGS = {
    feed: function () { var b = ME.builder(); b.color(0xd9c060).push().translate(0, 0.07, 0).box(0.26, 0.14, 0.18).pop(); b.color(0x8a6440).push().translate(0, 0.07, 0).box(0.04, 0.15, 0.19).pop(); return b.finish(); },
    treat: function () { var b = ME.builder(); b.smoothShade(true).color(0xb8793a).push().translate(0, 0.05, 0).scale(0.08, 0.05, 0.08).sphere(1).pop(); b.color(0x6c5ce7).push().translate(0.03, 0.09, 0.01).scale(0.02).sphere(0).pop(); return b.finish(); },
    brush: function () { var b = ME.builder(); b.color(0xa07a50).push().translate(0, 0.05, 0).box(0.3, 0.04, 0.07).pop(); b.color(0xb8c46a).push().translate(0.07, 0.02, 0).box(0.14, 0.05, 0.06).pop(); return b.finish(); },
    collar: function () { var b = ME.builder(); b.color(0x4f9a3a).cyl(8, 0.11, 0.11, 0.035, false); b.color(0xc5ff49).push().translate(0, 0.02, 0.11).scale(0.03).sphere(0).pop(); return b.finish(); },
    lead: function () { var b = ME.builder(); b.color(0x4f9a3a).cyl(8, 0.13, 0.13, 0.03, false); b.push().translate(0.13, 0.015, 0).rotZ(-1.5).cyl(4, 0.012, 0.012, 0.28).pop(); return b.finish(); },
    whistle: function () { var b = ME.builder(); b.color(0xb8c46a).push().translate(-0.1, 0.03, 0).rotZ(-1.57).cyl(5, 0.022, 0.018, 0.2).pop(); b.color(0x6a7a30).push().translate(0.02, 0.05, 0).box(0.03, 0.01, 0.02).pop(); return b.finish(); },
    saddle: function () { var b = ME.builder(); b.color(0xc8b48a).push().translate(0, 0.05, 0).box(0.34, 0.06, 0.24).pop(); b.color(0xc9a05a).push().translate(0.18, 0, 0).cyl(8, 0.07, 0.09, 0.14, false).pop().push().translate(-0.18, 0, 0).cyl(8, 0.07, 0.09, 0.14, false).pop(); return b.finish(); },
    pad: function () { var b = ME.builder(); b.color(0xc8b48a).push().translate(0, 0.04, 0).box(0.3, 0.07, 0.22).pop(); b.color(0x4f9a3a).push().translate(0, 0.08, 0).box(0.31, 0.012, 0.03).pop(); return b.finish(); },
    cluckegg: function () { var b = ME.builder(); b.smoothShade(true).color(0xf5ead0).push().translate(0, 0.09, 0).scale(0.075, 0.095, 0.075).sphere(1).pop(); return b.finish(); },
    milk: function () { var b = ME.builder(); b.color(0xb0603a).cyl(6, 0.08, 0.07, 0.15); b.color(0xffffff).push().translate(0, 0.15, 0).cyl(6, 0.065, 0.065, 0.01).pop(); return b.finish(); },
    cheese: function () { var b = ME.builder(); b.color(0xf2c84a).push().translate(0, 0.06, 0).box(0.2, 0.12, 0.14).pop(); b.color(0xd9a830).push().translate(0.04, 0.09, 0.071).box(0.04, 0.04, 0.005).pop(); return b.finish(); },
    hopper_kid: bunnyKit, glowbug: bug(0xc5ff49, 1.2), goldbug: bug(0xffd24a, 0.6),
    pengrump: grump(0x4a2f5a, 0), pengrump2: grump(0x6a4a7a, 1), tamegrump: grump(0x8a6aa0, 2)
  };
  function fence(b, R, rails, gate) {
    var n = Math.round(R * 9), i, a;
    for (i = 0; i < n; i++) {
      a = i / n * 6.283;
      if (gate && i === 0) continue;
      b.color(0x8a5a36).push().translate(Math.sin(a) * R, 0, Math.cos(a) * R).cyl(4, 0.05, 0.04, 0.5 + (i % 2) * 0.06).pop();
    }
    var seg = 6.283 * R / n + 0.06;
    for (i = 0; i < n; i++) {
      if (gate && (i === 0 || i === n - 1)) continue;
      a = (i + 0.5) / n * 6.283;
      for (var r = 0; r < rails; r++) b.color(0x9a6a3c).push().translate(Math.sin(a) * R, 0.2 + r * 0.18, Math.cos(a) * R).rotY(a).box(seg, 0.04, 0.03).pop();
    }
  }
  function penModel(R, rails, roof) {
    return function () {
      var b = ME.builder();
      fence(b, R, rails, true);
      b.color(0x7a5232).push().translate(-R * 0.45, 0.08, -R * 0.2).box(0.6, 0.16, 0.26).pop();   // the trough
      b.color(0xd9c060).push().translate(-R * 0.45, 0.17, -R * 0.2).box(0.52, 0.04, 0.2).pop();
      b.color(0x8a5a36).push().translate(0.42, 0, R + 0.12).cyl(4, 0.03, 0.03, 0.62).pop();        // the sign by the gate
      b.color(0xd9b88a).push().translate(0.42, 0.56, R + 0.14).box(0.34, 0.2, 0.03).pop();
      b.color(0x5a3b26).push().translate(0.42, 0.56, R + 0.16).box(0.12, 0.08, 0.01).pop();
      if (roof) {
        b.color(0x8a5a36);
        [[R * 0.25, -R * 0.75], [R * 0.75, -R * 0.25], [-R * 0.05, -R * 0.35], [R * 0.4, 0.05]].forEach(function (p) { b.push().translate(p[0], 0, p[1]).cyl(4, 0.05, 0.05, 0.95).pop(); });
        b.color(0x6cc04a).push().translate(R * 0.34, 1.0, -R * 0.33).rotY(0.785).rotX(0.22).box(R * 0.95, 0.07, R * 0.95).pop();
        b.color(0x58a83e).push().translate(R * 0.34, 1.05, -R * 0.33).rotY(0.785).rotX(0.22).box(R * 0.7, 0.04, R * 0.7).pop();
      }
      return b.finish();
    };
  }
  if (ME && ME.builder) {
    try {
      var c0, i0, sp0, im0 = ME.itemMesh;
      for (sp0 in A.COATS) for (i0 = 0; i0 < A.COATS[sp0].length; i0++) {
        c0 = A.COATS[sp0][i0];
        var mk = sp0 === "clucker" ? clucker : sp0 === "woolly" ? woolly : loper;
        THINGS[kindFor(sp0, c0[0], false)] = mk(c0[2], 1);
        THINGS[kindFor(sp0, c0[0], true)] = mk(c0[2], 0.55);
      }
      if (im0) ME.itemMesh = function (kind) { if (THINGS[kind]) { try { return THINGS[kind](); } catch (e) {} } return im0(kind); };
      if (ME.STRUCT_BUILDERS) { ME.STRUCT_BUILDERS.pen = penModel(1.15, 1, false); ME.STRUCT_BUILDERS.bigpen = penModel(1.45, 2, false); ME.STRUCT_BUILDERS.roofpen = penModel(1.65, 2, true); }
    } catch (e) {}
  }
  A.MESHES = THINGS;
})();
