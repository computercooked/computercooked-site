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
   A pen keeps its trough and its produce on the building (st.data). Rolls its own dice; never the island's.
   4.35 adds thirty more kinds (see "more beasts" near the end): things that hunt, things to ride over water, eggs,
   bugs and a bug house, dyes, a herder, a bee box, small graves. Same state, same rules. */
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
    clucker: [["", "", 0xf2d9a0], ["blue", "blue ", 0x7fb4e6], ["gold", "golden ", 0xffd24a], ["red", "red ", 0xd9534a, "dye"], ["green", "green ", 0x7fc45a, "dye"]],
    woolly: [["", "", 0xf3ead8], ["dusk", "dusky ", 0x8d7fa8], ["snow", "snow ", 0xffffff], ["shroom", "glowcap ", 0x9a7ad8, "rare"], ["red", "red ", 0xd9534a, "dye"], ["blue", "blue ", 0x7fb4e6, "dye"], ["green", "green ", 0x7fc45a, "dye"], ["gold", "golden ", 0xffd24a, "dye"]],
    loper: [["", "", 0xc9a06a], ["ember", "ember ", 0xd9603a], ["star", "star ", 0xf5f0ff, "rare"], ["red", "red ", 0xd9534a, "dye"], ["blue", "blue ", 0x7fb4e6, "dye"], ["green", "green ", 0x7fc45a, "dye"], ["gold", "golden ", 0xffd24a, "dye"]]
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
    { id: "cheese", out: "cheese", n: 1, cost: { milk: 2 } },
    { id: "bugnet", out: "bugnet", n: 1, cost: { stick: 1, fiber: 2 } },
    { id: "lurestick", out: "lurestick", n: 1, cost: { stick: 1, vine: 1, carrot: 1 } },
    { id: "glowgrass", out: "glowgrass", n: 2, cost: { glowcap: 1, leaves: 2 } },
    { id: "everbud", out: "everbud", n: 1, cost: { honey: 1, glowcap: 1 } },
    { id: "dye_red", out: "dye_red", n: 1, cost: { berry: 2 } },
    { id: "dye_blue", out: "dye_blue", n: 1, cost: { glowcap: 2 } },
    { id: "dye_green", out: "dye_green", n: 1, cost: { herb: 2 } },
    { id: "dye_gold", out: "dye_gold", n: 1, cost: { honey: 1 } },
    { id: "platepad", out: "platepad", n: 1, cost: { plate: 3, vine: 1 } },
    { id: "shellpad", out: "platepad", n: 1, cost: { shell: 2, vine: 1 } },
    { id: "wetpuff", out: "wetpuff", n: 1, cost: { drypuff: 1 }, wet: 1 }
  ];

  /* ---------------- the new things ---------------- */
  function addKind(k, def) { if (K && !K[k]) K[k] = def; }
  function rawKind(sp, coat, kid) { return sp + (coat ? "_" + coat : "") + (kid ? "_kid" : ""); }
  // the kind an animal of this sort, coat and age is drawn as (the nearest one that exists)
  function kindFor(sp, coat, kid) {
    var k = rawKind(sp, coat, kid);
    if (K && K[k]) return k;
    if (kid && K && K[sp + "_kid"]) return sp + "_kid";
    k = rawKind(sp, coat, false);
    return K && K[k] ? k : sp;
  }
  A.kindFor = kindFor;
  (function kinds() {
    if (!K) return;
    var sp, i, c, s;
    for (sp in A.COATS) for (i = 0; i < A.COATS[sp].length; i++) {
      c = A.COATS[sp][i]; s = A.SP[sp];
      addKind(rawKind(sp, c[0], false), { noun: "critter", label: c[1] + s.name, emoji: s.icon, r: s.big ? 0.45 : 0.22, color: c[2], critter: s.move, an: { sp: sp, coat: c[0], kid: false }, desc: sp === "clucker" ? "pecks about by day and roosts at night. it loves grain and seeds." : sp === "woolly" ? "a fluffy thing that lives in herds. scare one and they all run. it loves grain." : "big, fast and proud. it kicks. it loves sunroots, and it can be ridden by someone it trusts." });
      addKind(rawKind(sp, c[0], true), { noun: "critter", label: c[1] + s.name + " " + s.kidName, emoji: s.icon, r: 0.14, color: c[2], critter: s.move, an: { sp: sp, coat: c[0], kid: true }, desc: "a little one. it grows up in a few days." });
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
    if (sp.gift) return A.gift(game, c, it);
    if (sp.notame) return { ok: false, msg: "the " + sp.name + " is nobody's pet" };
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
    d.tr = (d.tr || 0) + 0.34 * like * (1 + 0.08 * Math.min(5, s.tamed || 0)) * (hk !== "glowgrass" && S.has(c, "glowgrass") ? 1.3 : 1);
    fx(game, "hearts", it.x, it.y + 0.4, it.z, 3);
    if (d.tr >= 1) { if (sp.ride && !isKid(it.kind)) return { ok: true, msg: "the " + sp.name + " eats from your paw. now hop on, and hold tight" }; return A.tame(game, c, it); }
    return { ok: true, msg: "it eats from your paw (" + Math.round(d.tr * 100) + "%). a tickle now, or more " + label(hk) };
  };
  A.tickle = function (game, c, it) {
    var sp = A.SP[spOf(it.kind)], d = it.data;
    if (!sp || !A.wildOf(it) || sp.notame) return { ok: false, msg: "" };
    if (!(d.calm > 0) && !d.stray) return { ok: false, msg: "it won't let you near. offer it " + bestFood(sp) + " first" };
    if (SB.dist(c.x, c.z, it.x, it.z) > 3.4) return { ok: false, msg: "too far" };
    if ((d.cd || 0) > game.time) return { ok: false, msg: "give it a moment. patience" };
    d.cd = game.time + 3; d.calm = Math.max(d.calm || 0, 30);
    d.tr = (d.tr || 0) + 0.12;
    fx(game, "hearts", it.x, it.y + 0.4, it.z, 2);
    if (d.tr >= 1) { if (sp.ride && !isKid(it.kind)) return { ok: true, msg: "the " + sp.name + " leans on you. now hop on, and hold tight" }; return A.tame(game, c, it); }
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
    tamed2(game, c, rec);
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
    var like = hk ? (hk === "feed" ? 0.5 : hk === "glowgrass" ? 1 : rec.k === "grump" ? (S.edible(hk) ? 0.8 : 0) : likeOf(sp, hk)) : 0;
    if (!like) return { ok: false, msg: rec.name + " doesn't fancy that. it likes " + (rec.k === "grump" ? "any food" : bestFood(sp)) };
    if (!near(c, it)) return { ok: false, msg: "get closer" };
    if ((rec.hunger || 0) < 0.08 && hk !== "treat") return { ok: false, msg: rec.name + " is full" };
    S.take(c, hk, 1);
    if (wants(game, rec, "food")) wantMet(game, c, rec, "food");
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
    if ((rec.petT || 0) <= game.time) { if (wants(game, rec, "pet")) wantMet(game, c, rec, "pet"); rec.petT = game.time + 20; rec.bond = clamp01((rec.bond || 0) + 0.04); rec.mood = clamp01((rec.mood || 0) + 0.08); if (c.chem) { c.chem.lonely = Math.max(0, (c.chem.lonely || 0) - 0.08); c.chem.bored = Math.max(0, (c.chem.bored || 0) - 0.05); } }
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
    return { ok: true, msg: "you brush " + rec.name + ". it shines" + shed(game, c, rec) };
  };
  // a grown coat comes off with a blade (or a sharp stone): no need to hunt for fur
  A.shear = function (game, c, rec) {
    var S = Sv(), sp = A.SP[rec.k], it = body(game, rec);
    if (!sp.coat || sp.shed || rec.kid) return { ok: false, msg: sp.shed ? "no blade for this one: brush it" : "nothing to shear" };
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
    else if (kind === "saddle") { if (!sp.ride || sp.nosaddle || rec.kid) return { ok: false, msg: "a saddle is for a grown loper, or something like one" }; if (g.saddle) return { ok: false, msg: "already saddled" }; g.saddle = 1; rec.pack = []; }
    else if (kind === "pad") { if (!sp.fight) return { ok: false, msg: rec.name + " is no fighter" }; if (g.pad) return { ok: false, msg: "already padded" }; g.pad = 1; }
    else if (kind === "platepad") { if (!sp.fight) return { ok: false, msg: rec.name + " is no fighter" }; if (g.plate) return { ok: false, msg: "already plated" }; g.plate = 1; }
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
  function spill(game, rec, it) { (rec.pack || []).forEach(function (sl) { if (sl) Sv().spawn(game, sl.k, sl.n, it.x + 0.5, it.z + 0.4); }); rec.pack = (rec.gear && rec.gear.saddle) || (A.SP[rec.k] && A.SP[rec.k].pack) ? [] : null; }
  function moodWord(rec) {
    var m = rec.mood || 0, h = rec.hunger || 0;
    return h > 0.8 ? "it is very hungry" : h > 0.55 ? "it is hungry" : m > 0.8 ? "it is very happy" : m > 0.55 ? "it is happy" : m > 0.3 ? "it is all right" : "it is glum";
  }
  A.moodWord = moodWord;
  // the whistle: every follower runs to you; with a whistle in your bag they hear it from anywhere
  A.call = function (game, c) {
    var far = Sv().has(c, "whistle") || Sv().has(c, "ramhorn"), n = 0, s = st(game);
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
      if (wants(game, rec, "play")) wantMet(game, c, rec, "play"); rec.rollT = game.time + 30; rec.spin = 1.3; rec.mood = clamp01((rec.mood || 0) + 0.05);
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
  // who can carry you: a mount, or (with a sunroot on a stick in your bag) a woolly or a grunter
  function canRide(rec, c) { var sp = A.SP[rec.k]; return !rec.kid && (!!sp.ride || (!!sp.lure && !!c && Sv().has(c, "lurestick"))); }
  A.canRide = canRide;
  A.ride = function (game, c, rec) {
    var s = st(game), it = body(game, rec), sp = A.SP[rec.k];
    if (!canRide(rec, c)) return { ok: false, msg: sp.lure && !rec.kid ? rec.name + " needs steering: make a sunroot on a stick" : rec.name + " can't carry you" };
    if (!near(c, it)) return { ok: false, msg: "get closer" };
    if ((rec.hunger || 0) >= 0.95) return { ok: false, msg: rec.name + " is too hungry to carry you. feed it" };
    if ((rec.hurt || 0) >= 1) return { ok: false, msg: rec.name + " is hurt and resting until morning" };
    s.ride = rec.id; s.mount = rec.id; c._ride = rideMul(rec);
    snd(game, "whoosh", 0.6);
    SB.bus.emit("mounted", { c: c, rec: rec });
    return { ok: true, msg: sp.icon + " you're riding " + rec.name + (sp.over ? ". it carries you over deep water too" : !sp.ride ? ", following the sunroot" : sp.nosaddle || (rec.gear && rec.gear.saddle) ? "" : " bareback. a basket saddle would be faster") };
  };
  function rideMul(rec) { var sp = A.SP[rec.k]; return (sp.ride ? sp.mul || A.RIDE : 1.2) * (rec.gear && rec.gear.saddle ? A.RIDE_SADDLE / A.RIDE : 1) * (rec.coat === "ember" ? 1.1 : 1) * (rec.spd || 1); }
  A.dismount = function (game) {
    var s = st(game), rec = A.mount(game), P = SB.Possess;
    s.ride = null;
    if (P && P.c) P.c._ride = 0;
    if (s.fins != null) unfin(game, SB.Game.byId(game, s.fins));
    game.creatures.forEach(function (o) { if (o._ride) o._ride = 0; });
    if (!rec) return { ok: false, msg: "" };
    if (rec.mode !== "follow") { var it = body(game, rec); rec.sx = it.x; rec.sz = it.z; }
    SB.bus.emit("dismounted", { rec: rec });
    return { ok: true, msg: "you hop off " + rec.name };
  };
  // the mount's pack: six slots that travel with it
  A.packOf = function (rec) { var sp = A.SP[rec.k] || {}, n = Math.max(sp.pack || 0, rec.gear && rec.gear.saddle ? A.PACK : 0); if (!n) return null; var p = rec.pack || (rec.pack = []); while (p.length < n) p.push(null); return p; };
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
  A.buildPen = function (game, c, kind) {
    var S = Sv(), W = SB.World, P = SB.Possess;
    if (c.tier < 2) return { ok: false, msg: "you need hands to build a pen" };
    kind = A.PENS[kind] || A.BUILDS[kind] ? kind : "pen";
    var def = A.PENS[kind] || A.BUILDS[kind], why = lacks(c, def.cost); if (why) return { ok: false, msg: "a " + SK[kind].label + " " + why };
    var ag = P && P.active && P.c === c && P.aimGround ? P.aimGround(game, c, 7) : null, spots = [], i;
    if (ag) spots.push([ag.x, ag.z]);
    for (i = 0; i < 12; i++) { var a = c.facing + i * 0.5236, dd = 2.8 + (i > 5 ? 1.2 : 0); spots.push([c.x + Math.sin(a) * dd, c.z + Math.cos(a) * dd]); }
    for (i = 0; i < spots.length; i++) {
      var x = spots[i][0], z = spots[i][1];
      if (SB.dist(x, z, c.x, c.z) < 2 || !(S.canPlace ? S.canPlace(game, kind, x, z) : W.siteFree(game.world, x, z, SK[kind].r))) continue;
      pay(c, def.cost);
      var b = W.addStructure(game.world, game, kind, x, z, { done: true, tribe: c.tribe, rot: c.facing + Math.PI, data: { feed: 0, out: {}, pov: 1 } });
      b.founder = c.name;
      snd(game, "build");
      SB.bus.emit("penBuilt", { c: c, st: b });
      return { ok: true, st: b, msg: def.msg || "🐾 a pen! lead an animal in, and keep the trough full" };
    }
    return { ok: false, msg: "no room here: it needs flat, open ground" };
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
    if (A.PENS[b.kind].bugs && !A.SP[rec.k].small) return { ok: false, msg: "only little bugs fit in a bug house" };
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
  function feedWorth(kind) {
    if (kind === "feed" || kind === "glowgrass") return 1;
    if (kind === "stick" || kind === "leaves" || kind === "beetle" || kind === "butterfly" || kind === "sapling" || kind === "heartfruit") return 0;
    for (var k in A.SP) if (!A.SP[k].notame && A.SP[k].likes[kind]) return 1;
    return 0;
  }
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
    if (k === "glowgrass") d.glow = 3;
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
    if (!an.length) return "empty · room for " + A.penCap(b) + (d.eggs && d.eggs.length ? " · " + d.eggs.length + " in the straw" : "");
    return an.map(function (r) { return nm(r); }).join(", ") + " · trough " + d.feed + "/" + A.TROUGH + (A.outN(b) ? " · waiting: " + A.outText(b) : "") + (d.eggs && d.eggs.length ? " · " + d.eggs.length + " in the straw" : "") + (d.glow > 0 ? " · glow grass" : "");
  };

  /* ---------------- the grump ---------------- */
  A.grump = function (game) { var out = null; all(game).forEach(function (r) { if (r.k === "grump" && !r.lit) out = r; }); return out; };
  A.canCapture = function (game, c, g) { return !!g && !g.boss && !A.grump(game) && !!c && Sv().has(c, "lead"); };
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
    if (sp.hp) return A.strike(game, c, it);
    if (sp.nohunt) return { ok: false, msg: "not this one" };
    if (SB.dist(c.x, c.z, it.x, it.z) > (sp.swim ? 5 : 3.6)) return { ok: false, msg: "too far: get closer" };
    if (it.data.curl > 0) return { ok: false, msg: "it's a ball. your spear slides right off" };
    var skill = SB.Body && SB.Body.bonus ? SB.Body.bonus(c, "hunt") : 0, x = it.x, z = it.z;
    scare(game, it, c, 9);
    if (Math.random() < 0.5 + Math.min(0.35, skill * 0.7) && !isKid(it.kind)) {
      W.remove(game.world, it);
      Sv().spawn(game, sp.flesh || "meat", sp.meat || 1, sp.swim ? c.x + 0.4 : x, sp.swim ? c.z + 0.3 : z, { by: c.id });
      logAdd(game, spOf(it.kind));
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
    if (Sv().heldKind(c) === "bugnet" || Math.random() < 0.6) {
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
      o.x = me.x - Math.sin(me.facing) * 0.25; o.z = me.z - Math.cos(me.facing) * 0.25; o.rot = me.facing; rest(o, sp.move); d.hop = 0;
      if (sp.over) { o.y = SB.World.groundY(game.world, o.x, o.z) + (sp.move === "fly" ? 0.35 : -0.05); o.onGround = false; }
      return;
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
            rec.hurt = (rec.hurt || 0) + (rec.k === "grump" ? 0.04 : rec.gear && rec.gear.plate ? 0.035 : rec.gear && rec.gear.pad ? 0.07 : 0.14);
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
    if (o.gone || o.heldBy != null || d.an != null) return;
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
        if (rider && rider.alive) { rider.chem.health = Math.max(0.05, rider.chem.health - 0.04); SB.bus.emit("thrown", { c: rider, it: o }); if (rider === me) tell(game, "thrown off! it trots away, looking pleased. offer it something and try again"); }
      }
      return;
    }
    if (def.ghost) { ghostMove(game, o, dt); return; }
    if (def.an || def.gold) d.t = 1e6;
    else { // bunnies, flutterbies and beetles run themselves, unless you have calmed one
      if (d.mad && madHop(game, o, dt)) return;
      if (d.calm > 0 || d.stray) rest(o, sp.move); else if (d.t > 1e5) d.t = 0;
      return;
    }
    if (sp && sp.ai && AI[sp.ai] && AI[sp.ai](game, o, dt, me, sp, d)) return;
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
      if (def.an || def.gold || def.ghost || (it.data && (it.data.calm > 0 || it.data.stray || it.data.t > 1e5))) wild.push(it);
    }
    if (s.ride != null && (!s.list[s.ride] || !you(game))) A.dismount(game);
    else if (s.ride == null && s.fins != null) unfin(game, SB.Game.byId(game, s.fins));
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
    if (A.SP[sp] && A.SP[sp].coatFor) return A.SP[sp].coatFor(bm, r, B);
    if (sp === "woolly") return bm === B.shroom ? "shroom" : bm === B.tundra || bm === B.taiga || bm === B.mountain ? "snow" : r() < 0.08 ? "dusk" : "";
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
    var counts = { goldbug: 0 }, i, B = SB.B || {}, sp, dn = day(game);
    for (sp in A.CAP) counts[sp] = 0;
    for (i = wild.length - 1; i >= 0; i--) {
      var o = wild[i], spk = o.kind === "goldbug" ? "goldbug" : spOf(o.kind), S0 = A.SP[spk] || {};
      if (o.gone || counts[spk] == null) continue;
      var far = SB.dist(o.x, o.z, focus.x, focus.z) > 75, d = o.data;
      if (!d.stray && !(d.tr > 0) && !d.buck && (far || (S0.night && !S0.anytime && !w.night) || (spk === "goldbug" && (o.age || 0) > 500))) { W.remove(w, o); wild.splice(i, 1); continue; }
      counts[spk]++;
    }
    var cm = SB.wopt ? SB.wopt(game, "critters") : 1;
    for (sp in A.CAP) {
      var S1 = A.SP[sp] || {};
      if (counts[sp] >= Math.round(A.CAP[sp] * cm)) continue;
      if (!S1.anytime && (S1.night ? !w.night : w.night)) continue;
      if (S1.fromDay && dn < S1.fromDay) continue;
      if (S1.spawn) { S1.spawn(game, focus); continue; }
      var a = wr() * 6.283, dd = 16 + wr() * 14, x = focus.x + Math.sin(a) * dd, z = focus.z + Math.cos(a) * dd;
      if (!W.inBounds(w, x, z)) continue;
      if (S1.swim) { if (W.depthAt(w, x, z) >= (S1.deep || 0.5)) A.spawnWild(game, sp, x, z, "", false); continue; }
      if (!dry(game, x, z)) continue;
      var bm = W.biomeAt ? W.biomeAt(w, x, z) : -1, ok = sp === "glowbug" || (!S1.strict && (fails[sp] || 0) > 8);
      if (!ok) (HOME_B[sp] || []).forEach(function (b) { if (B[b] === bm) ok = true; });
      if (bm === B.ocean) ok = false;
      if (ok && S1.water && !wetNear(game, x, z)) ok = false;
      if (!ok) { fails[sp] = (fails[sp] || 0) + 1; continue; }
      var n = S1.herd ? 3 : sp === "glowbug" ? 2 : 1, coat = coatFor(game, sp, bm, wr);
      for (i = 0; i < n; i++) { var px = x + (wr() - 0.5) * 3, pz = z + (wr() - 0.5) * 3; if (dry(game, px, pz)) A.spawnWild(game, sp, px, pz, sp === "woolly" && i ? coatFor(game, sp, bm, wr) : coat, !!S1.wildKid && wr() < 0.3); }
    }
    if (!counts.goldbug && !w.night && wr() < 0.03) {
      var ga = wr() * 6.283, gx = focus.x + Math.sin(ga) * 14, gz = focus.z + Math.cos(ga) * 14;
      if (dry(game, gx, gz)) { var gb = W.add(w, game, "goldbug", gx, gz, {}); gb.data.t = 1e6; wild.push(gb); SB.bus.emit("goldBugSeen", { it: gb }); }
    }
    populate2(game, focus);
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
    var kind = list[i][0], s2 = st(game);
    if (!s2.oldEgg && (rec.finds || 0) >= 2 && K.oldegg && r() < 0.08) { kind = "oldegg"; s2.oldEgg = 1; }
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
      rec.hunger = clamp01((rec.hunger || 0) + rate * (rec.trait === "greedy" ? 1.3 : rec.trait === "lazy" ? 0.7 : 1) * (graze ? 0.5 : 1) * (s.ride === rec.id && rec.coat !== "star" ? 2 : 1) * (sp.thrift || 1));
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
        rec.findT -= dt * (0.5 + (rec.bond || 0)) * (rec.trait === "nosy" ? 1.4 : rec.trait === "sleepy" ? 0.7 : 1) * (sp.nose || 1);
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
    slow2(game, dt, me);
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
    grave(game, rec, o);
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
      if (rec.kid && !rec.small && rec.age >= A.GROW_DAYS) { rec.kid = false; rec.age = 4; swapKind(o, recKind(rec)); SB.bus.emit("animalGrew", { rec: rec }); news.push(rec.name + " is all grown up"); }
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
        var dk = dailyOf(rec);
        if (n && fancy(rec) && dice(game, "rare" + rec.id + ":" + dn)() < 0.5) n++;
        if (dk && n) { d.out[dk] = Math.min(A.OUT_MAX, (d.out[dk] || 0) + n); made[dk] = (made[dk] || 0) + n; }
        if (sp.bug && n && dice(game, "bug" + rec.id + ":" + dn)() < 0.6) { var bk = bugKid(game, pen, rec, dn); W.add(w, game, bk, pen.x + SK[pen.kind].r + 0.6, pen.z + 0.8, {}); made[bk] = (made[bk] || 0) + 1; }
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
        var coat = r() < 0.5 ? nat(pa) : nat(pb); if (r() < 0.1 && A.COATS[k]) { var pc = plainCoats(k); coat = pc[Math.floor(r() * pc.length)]; }
        var id = s.n++, tk = ["greedy", "brave", "nosy", "sleepy", "loyal"];
        var kid = { id: id, k: k, coat: coat || "", kid: true, name: pickName(game, id, A.NAMES), item: null, x: b.x + 0.4, z: b.z - 0.3, owner: pa.owner, by: pa.by, mode: "pen", pen: b.id, bond: 0.5, hunger: 0.1, mood: 0.85, age: 0, born: dn, trait: r() < 0.5 ? pa.trait : tk[Math.floor(r() * tk.length)], coatT: 0, tricks: {}, gear: {}, bornHere: 1 };
        if (A.SP[k].ride) kid.spd = breedSpd(pa, pb, r);
        s.list[id] = kid; body(game, kid); logAdd(game, k);
        SB.bus.emit("animalBorn", { rec: kid, st: b, a: pa, b: pb });
        news.push(pa.name + " and " + pb.name + " have a little one: " + kid.name);
        break;
      }
    });
    // a stray: now and then something hungry hangs about a pen with food in it
    var pens = A.pens(game).filter(function (b) { return !A.PENS[b.kind].bugs; }), sr = dice(game, "stray:" + dn);
    if (pens.length && sr() < 0.22 && !wild.some(function (o) { return o.data && o.data.stray && !o.gone; })) {
      var pb2 = pens[Math.floor(sr() * pens.length)];
      if (penData(pb2).feed > 0 && A.penAnimals(game, pb2).length < A.penCap(pb2)) {
        var sk = sr() < 0.5 ? "clucker" : "hopper", sx = pb2.x + SK[pb2.kind].r + 1.4, sz = pb2.z + 0.6;
        if (dry(game, sx, sz)) { var so = W.add(w, game, kindFor(sk, "", false), sx, sz, {}); so.data.stray = 1; so.data.tr = 0.7; so.data.t = 1e6; wild.push(so); SB.bus.emit("stray", { it: so, st: pb2 }); news.push("a stray " + A.SP[sk].name + " is hanging about your pen. one snack would win it"); }
      }
    }
    dawn2(game, s, dn, news);
    var parts = []; for (var mk in made) parts.push(made[mk] + " " + label(mk));
    if (parts.length) news.unshift("morning: " + parts.join(", ") + " from your animals");
    if (news.length) { SB.bus.emit("animalsDawn", { made: made, news: news }); tell(game, "🐾 " + news.slice(0, 3).join(" · ")); }
    sync(game);
  };

  /* ---------------- the tick ---------------- */
  var tS = 0, tW = 0, tN = 0;
  A.tick = function (game, dt) {
    if (!game || game.offline || game.showcase || !game.world) return;
    if (game !== curGame) { curGame = game; IT = {}; live = []; wild = []; fails = {}; saidT = {}; tS = 0; tW = 3; tN = 1; wr = dice(game, "animals:wild:" + Math.floor(game.time || 0)); }
    if (!game.quests || !game.quests.animals) st(game);
    if ((tS -= dt) <= 0) { tS = 1; sync(game); }
    var me = you(game), i;
    if (me) { var m = A.mount(game); me._ride = m ? rideMul(m) : 0; tick2(game, dt, me); }
    for (i = 0; i < live.length; i++) driveTame(game, live[i], dt, me);
    for (i = 0; i < wild.length; i++) driveWild(game, wild[i], dt, me);
    if ((tN -= dt) <= 0) { tN = 2; slow(game, 2); }
    if ((tW -= dt) <= 0) { tW = 7; if (!game.headless) populate(game); }
  };

  /* ---------------- hooks ---------------- */
  function wildOptions(game, c, it, o, x) {
    var spk = spOf(it.kind), sp = A.SP[spk], d = it.data || {}, hk = x.hk, name = label(it.kind), soft = (d.calm > 0 || d.stray) && !sp.notame;
    function run(fn) { return function () { var r = fn(game, c, it); if (r.msg) x.say(r.msg); if (r.ok) x.audio(r.nip ? "bonk" : "pop", 0.6); return true; }; }
    function hit(fn) { return function () { if (x.swing) x.swing(); var r = fn(game, c, it); if (r.msg) x.say(r.msg); x.audio("bonk", 0.6); return true; }; }
    if (d.buck) { o.use = o.pick = x.op("hold on!", run(A.hold), null); o.place = null; return; }
    var like = hk && (!sp.notame || sp.gift) ? likeOf(sp, hk) : 0;
    if (like) o.place = x.op("offer your " + label(hk) + " to the " + name, run(A.offer), null);
    if (hk === "bugnet" && A.canNet(it)) o.use = x.op("net the " + name, run(A.net), null);
    else if (hk === "pot" && sp.pot) o.use = x.op("scoop the " + name + " into your pot", run(A.scoop), null);
    else if (d.tr >= 1 && sp.ride && !isKid(it.kind)) o.use = x.op("hop on the " + name + " and hold tight", run(A.buckStart), null);
    else if (soft) o.use = x.op("tickle the " + name, run(A.tickle), null);
    else if (sp.hp && (!sp.calmHerd || hk === "spear")) o.use = x.op((hk === "spear" ? "spear the " : "shoo the ") + name, hit(A.strike), null);
    else if (hk === "spear" && K[it.kind].an && !sp.nohunt) o.use = x.op("spear the " + name, hit(A.hunt), null);
    else if (sp.poke) o.use = x.op(sp.poke + " the " + name, run(A.poke), null);
    else if (hk === "spear" || sp.ai || sp.swim) o.use = null; // nobody spears or pounces on these by accident: the button below watches instead
    var watch = x.op("watch the " + name, function () { logAdd(game, spk); x.say(sp.icon + " " + name + ": " + (sp.watch || ("it likes " + bestFood(sp) + ". hold some out, wait, then tickle it" + (sp.ride ? ". then ride it out" : "")))); return true; }, null);
    if (!o.use) o.use = watch;
    o.pick = like ? o.place : soft ? o.use : watch;
  }
  function tameOptions(game, c, rec, it, o, x) {
    var sp = A.SP[rec.k], hk = x.hk, S = Sv(), s = st(game), name = nm(rec), wt = A.want(game, rec);
    function run(fn, a, b) { return function () { var r = fn(game, c, rec, a, b); if (r && r.msg) x.say(r.msg); if (r && r.ok) x.audio(r.turned ? "achievement" : "pop", 0.6); return true; }; }
    o.use = null; o.place = null; o.pick = null;
    if (rec.k === "grump" && !rec.lit) {
      o.use = x.op("tickle the grump", run(A.grumpTickle), null);
      if (hk && S.edible(hk)) o.place = x.op("feed the grump your " + label(hk), run(A.grumpFeed), null);
      o.pick = x.op("listen to the grump", function () { x.say("“" + A.grumpLine(game, rec) + "” · its light: " + Math.round((rec.light || 0) * 100) + "%. " + (rec.mode === "pen" ? "feed it, then tickle it, a little every day" : "it needs a pen of its own")); return true; }, null);
      return;
    }
    if (hk === "brush") o.use = x.op("brush " + name, run(A.brush), null);
    else if ((hk === "blade" || hk === "sharpstone") && sp.coat && !sp.shed && (rec.coatT || 0) >= 1 && !rec.kid) o.use = x.op("shear " + name, run(A.shear), null);
    else if (canRide(rec, c) && s.ride == null) o.use = x.op("ride " + name, run(A.ride), null);
    else o.use = x.op((rec.k === "grump" ? "pat " : "pet ") + name + (wt ? " " + wt.e : ""), run(A.pet), null);
    if (hk && hk.indexOf("dye_") === 0) o.place = x.op("dye " + name + " " + hk.slice(4), run(A.dye, hk.slice(4)), null);
    else if (hk === "everbud" && rec.kid) o.place = x.op("give " + name + " the everbud", run(A.everbud), null);
    else if (hk === "collar" || hk === "saddle" || hk === "pad" || hk === "platepad") o.place = x.op(hk === "collar" ? "put your collar on " + name : hk === "saddle" ? "saddle " + name : "fit your padding on " + name, run(A.fit, hk), null);
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
    else A.followers(game).forEach(function (r) { if (!cand && !A.SP[r.k].ride && penOK(b, r) && SB.dist(body(game, r).x, body(game, r).z, b.x, b.z) < 9) cand = r; });
    if (cand) o.use = x.op("put " + nm(cand) + " in the pen", function () { var r = A.intoPen(game, c, cand, b); if (r.msg) x.say(r.msg); if (r.ok) x.audio("pop", 0.6); return true; }, null);
    else o.use = x.op("look over the pen", function () { x.say("🐾 " + A.penLine(game, b)); x.openBag("animals"); return true; }, null);
    if (A.EGGS[hk]) o.place = x.op("tuck your " + label(hk) + " into the straw", run(A.setEgg, b), null);
    else if (hk && feedWorth(hk)) o.place = x.op("put your " + label(hk) + " in the trough", run(A.fill, b), null);
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
    options2(game, c, r, o, x, s);
    if (s.ride != null && !r && !o.pick) { var m = A.mount(game); if (m) o.pick = x.op("hop off " + m.name, function () { var q = A.dismount(game); if (q.msg) x.say(q.msg); return true; }, null); }
  };
  A.vitals = function (game, c) {
    if (!game || !game.quests || !game.quests.animals) return [];
    var s = st(game), out = [], m = A.mount(game), hungry = null, g = A.grump(game);
    if (m) out.push({ icon: A.SP[m.k].icon, text: "riding " + m.name, tip: "look away from everything and pick up to hop off" });
    all(game).forEach(function (r) { if ((r.mode === "follow" || s.ride === r.id) && (r.hunger || 0) > 0.75 && !hungry) hungry = r; });
    if (hungry) out.push({ icon: A.SP[hungry.k].icon, text: hungry.name + " is hungry", bad: true });
    if (g && g.mode === "led") out.push({ icon: "➰", text: "grump on the lead", bad: true, tip: "find it a pen of its own before morning" });
    return out;
  };
  A.goals = function (game, add) {
    if (!game || !game.quests || !game.quests.animals) return;
    var g = A.grump(game);
    if (g) add("bring the penned grump's light back", Math.round((g.light || 0) * 100) + "%", false);
    goals2(game, add);
  };
  var hooked = false;
  A.hook = function () {
    if (hooked || !SB.bus) return; hooked = true;
    function cur() { return SB.Game && SB.Game.current; }
    SB.bus.on("dawn", function () { var game = cur(); if (game) A.dawn(game); });
    hook2(cur);
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
      SB.Ext.on("damage", function (game, c) { return (c && c._ride ? A.RIDE_HIT : 1) * (c && A.companion(game) ? A.COMPANION : 1); });
      SB.Ext.tab({ id: "animals", label: function () { return "🐾 animals"; }, show: function (game, c) { return !!c && (c.tier >= 2 || all(game).length > 0); }, html: function (game, c, icon) { return A.html(game, c, icon); }, wire: function (root, game, c, redraw, say) { A.wire(root, game, c, redraw, say); } });
    }
    // riding: the smol you are in moves at its mount's pace
    var C = SB.Creature;
    if (C && C.speedOf && !C._animalsSpeed) { var so = C.speedOf; C.speedOf = function (c, a) { var v = so(c, a); if (c && c._web && SB.Game.current && c._web > SB.Game.current.time) v *= 0.45; return c && c._ride > 0 ? v * c._ride : v; }; C._animalsSpeed = 1; }
    // pedlars carry a few animal things too
    if (SB.Loot && SB.Loot.PACK && K.treat) { SB.Loot.PACK.push(["treat", 2, 2], ["collar", 1, 3], ["whistle", 1, 3]); }
  };
  A.hook();

  /* ---------------- making things ---------------- */
  A.makeWhy = function (game, c, id) {
    var m = null; A.MAKES.forEach(function (x) { if (x.id === id) m = x; });
    if (!m) return "that's not a thing";
    if (c.tier < 2) return "you need hands to make things";
    if (m.wet && !wetNear(game, c.x, c.z)) return "do that at the water's edge";
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
          out += "<small>bond " + bar(rec.bond) + " · " + esc(moodWord(rec)) + (rec.kid ? " · little" : "") + (rec.trait ? " · " + esc(A.TRAITS[rec.trait] || rec.trait) : "") + extraLine(game, rec) + (rec.tag ? " · collar" : "") + (rec.gear && rec.gear.plate ? " · plated" : rec.gear && rec.gear.pad ? " · padded" : "") + (sp.coat && (rec.coatT || 0) >= 1 && !rec.kid ? (sp.shed ? " · ready to brush out" : " · coat ready to shear") : "") + "</small>";
          out += "<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
          if (s.ride === rec.id) out += btn("off", rec.id, "hop off");
          else {
            out += rec.mode === "follow" ? btn("stay", rec.id, rec.k === "grump" ? "guard here" : "wait here") : btn("follow", rec.id, "follow me", rec.kid);
            if (rec.mode !== "pen" && pen && penFor(game, c, rec)) out += btn("pen", rec.id, A.PENS[penFor(game, c, rec).kind].bugs ? "into the bug house" : "into the pen");
            if (SB.Home && SB.Home.get && SB.Home.get(game) && rec.mode !== "pen") out += btn("home", rec.id, "go home");
          }
          out += btn("name", rec.id, "new name") + lookBtns(game, rec, btn);
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
        "<button class='btn' data-an='herder' data-id='" + pen.id + "'>" + (d.herder ? "mind it myself" : "ask the tribe to mind it") + "</button><button class='btn' data-an='keep' data-id='" + pen.id + "'>" + (d.keep ? "keeps " + d.keep + " at most" : "keeps all") + "</button></div>";
      if (nx) out += "<div class='rc'><span class='big'>🔨</span><div class='t'>make it a " + esc(SK[nx].label) + "<small>" + esc(SK[nx].desc) + " · " + esc(costText(A.PENS[nx].cost)) + "</small></div><button class='btn go' data-an='up' data-id='" + pen.id + "' " + (lacks(c, A.PENS[nx].cost) ? "disabled" : "") + ">build</button></div>";
    }
    out += "<div class='rc'><span class='big'>🐾</span><div class='t'>a new pen, right here<small>" + esc(SK.pen.desc) + " · " + esc(costText(A.PENS.pen.cost)) + "</small></div><button class='btn go' data-an='build' data-id='0' " + (c.tier < 2 || lacks(c, A.PENS.pen.cost) ? "disabled" : "") + ">build</button></div></div>";
    out += html2(game, c, icon, pen) + "<div class='lbl'>make</div><div class='rlist'>";
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
    if (act === "build") return A.buildPen(game, c, id);
    if (act === "make") return A.make(game, c, id);
    if (act === "up") return A.upgradePen(game, c, b);
    if (act === "collect") return A.collect(game, c, b);
    if (act === "herder") return A.setHerder(game, c, b, !(b && b.data && b.data.herder));
    var r2 = act2(game, c, act, id, j, rec, b); if (r2) return r2;
    if (!rec) return { ok: false, msg: "it's gone" };
    if (act === "off") return A.dismount(game);
    if (act === "stay" || act === "follow") return A.setMode(game, c, rec, act);
    if (act === "home") return A.sendHome(game, c, rec);
    if (act === "pen") { var p = penFor(game, c, rec) || A.nearPen(game, c); return p ? A.intoPen(game, c, rec, p) : { ok: false, msg: "stand at a pen" }; }
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

  /* ================= 4.35: more beasts, mounts, eggs, bugs, a herder =================
     One or two animals for every biome, and things that hunt: stalkers after bunnies (and a smol alone at night),
     nippers, weavers that spit web, tuskers that charge, sneaks that lift food at night, a thornling that turns the
     grove on you, puffbugs that pop. Gentle ones too: the big ones at the giant nests, glimmers, turtles, fish in
     the water, a finback that tows a drowning smol ashore. More to ride (over water, with a jump, steered by a
     sunroot on a stick), speed that passes to the young, eggs to hatch in a pen's straw, a bug net and a bug house,
     dyes, a look to pick on the day you tame, wants shown as small signs, a small grave and a little light, a
     herder who sells animals, a spare queen for a bee box, and a pen that keeps only so many. */
  A.FIN = 0.02; A.COMPANION = 1.15; A.UNIQUE_AT = 6;
  A.TRAITS.playful = "playful: rolls about by itself, and cheers smols up";
  A.TRAITS.lazy = "lazy: sleeps in. hunger comes slowly";
  A.EGGS = { lizardegg: "firelizard", oldegg: "snuffler", wetpuff: "skypuff" };
  A.DYES = { red: 1, blue: 1, green: 1, gold: 1 };
  A.BUILDS = { beebox: { cost: { queenbee: 1, plank: 2, stick: 2 }, msg: "🐝 a bee box! honeycomb every morning, and no stings" } };
  A.PENS.bughouse = { cap: 6, cost: { stick: 4, fiber: 2 }, next: null, bugs: 1, msg: "🪲 a bug house! bugs you tame or net live here, and the pairs you keep choose the colours of the new ones" };
  A.SHOP = [
    { sp: "hopper", price: 0, need: 0, pair: 1, once: "starter", label: "a starter pair of bunnies" },
    { sp: "clucker", price: 3, need: 0 }, { sp: "woolly", price: 5, need: 2 }, { sp: "rammer", price: 5, need: 4 }, { sp: "lugger", price: 7, need: 6 },
    { sp: "loper", price: 10, need: 8 }, { sp: "humper", price: 10, need: 10 }, { sp: "shroomsnail", price: 12, need: 12 }
  ];
  var MODEL = {}, AI = {}, saidT = {}, emoT = 0;
  A.AI = AI;

  function wetNear(game, x, z) { var W = SB.World, w = game.world; for (var i = 0; i < 6; i++) { var a = i * 1.047; if (W.depthAt(w, x + Math.sin(a) * 3, z + Math.cos(a) * 3) > 0.2) return true; } return W.depthAt(w, x, z) > 0.05; }
  A.wetNear = wetNear;
  function shore(game, x, z, R) { for (var r = 1; r < R; r += 1) for (var a = 0; a < 6.28; a += 0.4) { var px = x + Math.sin(a) * r, pz = z + Math.cos(a) * r; if (SB.World.inBounds(game.world, px, pz) && dry(game, px, pz)) return { x: px, z: pz }; } return null; }
  function say1(game, key, gap, msg, cls) { if ((saidT[key] == null ? -1e9 : saidT[key]) + gap > game.time) return; saidT[key] = game.time; tell(game, msg, cls); }
  function place(c, x, z) { c.x = x; c.z = z; if (c.px != null) { c.px = x; c.pz = z; } }
  function logAdd(game, k) { var s = st(game), l = s.log || (s.log = {}); l[k] = (l[k] || 0) + 1; }
  A.logCount = function (game) { var n = 0, l = st(game).log || {}; for (var k in l) if (A.SP[k]) n++; return n; };
  A.logTotal = function () { var n = 0; for (var k in A.SP) if (k !== "grump") n++; return n; };
  function plainCoats(k) { return (A.COATS[k] || [[""]]).filter(function (c) { return !c[3]; }).map(function (c) { return c[0]; }); }
  A.plainCoats = plainCoats;
  function nat(rec) { return rec.made ? (rec.coat0 || "") : (rec.coat || ""); }
  function fancy(rec) { return !rec.made && (rec.coat === "blue" || rec.coat === "gold" || rec.coat === "dusk" || rec.coat === "ember" || rec.coat === "star"); }
  function dailyOf(rec) { return rec.k === "woolly" && rec.coat === "shroom" ? "glowstew" : A.SP[rec.k].daily; }
  A.dailyOf = dailyOf;
  function give(game, c, kind, n) { var left = Sv().add(c, kind, n); if (left > 0) Sv().spawn(game, kind, left, c.x + 0.5, c.z + 0.4); }
  function smolNear(game, x, z, r) { var best = null, bd = r; SB.World.creaturesNear(game.world, game, x, z, r, function (c) { if (!c.alive || c.species !== "smol") return; var q = SB.dist(c.x, c.z, x, z); if (q < bd) { bd = q; best = c; } }); return best; }
  function fireNear(game, c) {
    var hk = null;
    if (c === you(game)) hk = Sv().heldKind(c); else if (c.holding != null) { var it = SB.World.itemById(game.world, c.holding); hk = it ? it.kind : null; }
    return hk === "torch" || !!(SB.World.nearestFire && SB.World.nearestFire(game.world, c.x, c.z, 5));
  }
  function nipC(game, c, hp, pain) { if (c.chem.health > 0.25) c.chem.health = Math.max(0.25, c.chem.health - hp); if (SB.Chem && SB.Chem.apply) SB.Chem.apply(c.chem, { pain: pain || 0.1, fear: 0.15 }); }
  function away(o, from, dist) { var a = Math.atan2(o.x - from.x, o.z - from.z); o.data.gx = o.x + Math.sin(a) * dist; o.data.gz = o.z + Math.cos(a) * dist; o.data.run = 3; }
  function guardPet() { for (var i = 0; i < live.length; i++) { var r = live[i].rec; if (r.mode === "follow" && !r.kid && (r.k === "grump" ? r.lit : A.SP[r.k].fight) && (r.hurt || 0) < 1) return r; } return null; }
  function lured(c, sp, me) { if (c !== me) return false; var hk = Sv().heldKind(c); return !!hk && !!likeOf(sp, hk); }

  /* ---------------- what the new ones do by themselves ---------------- */
  // a stalker: bunnies and cluckers first; at night a smol on its own, away from any fire
  AI.pred = function (game, o, dt, me, sp, d) {
    var W = SB.World, w = game.world;
    d.at = (d.at || 0) - dt;
    if (d.at <= 0) {
      d.at = 0.7; d.prey = null; d.vic = null;
      if (!(d.full > game.time)) {
        var p = W.nearestItem(w, o.x, o.z, 14, function (q) { return !q.gone && q.heldBy == null && !(q.data && q.data.an != null) && (spOf(q.kind) === "hopper" || spOf(q.kind) === "clucker"); });
        if (p) d.prey = p.id;
        else if (w.night) {
          var v = smolNear(game, o.x, o.z, 10), n = 0;
          if (v && !v.asleep && !fireNear(game, v)) { W.creaturesNear(w, game, v.x, v.z, 5, function (c) { if (c.alive && c.species === "smol") n++; }); if (n <= 1) d.vic = v.id; }
        }
      }
    }
    if (d.prey != null) {
      var p2 = W.itemById(w, d.prey);
      if (!p2 || p2.gone) { d.prey = null; return false; }
      if (SB.dist(o.x, o.z, p2.x, p2.z) < 1.1) {
        W.remove(w, p2); d.prey = null; d.full = game.time + 150; d.gx = null;
        fx(game, "dust", o.x, o.y + 0.2, o.z, 6);
        SB.bus.emit("predHunt", { it: o, kind: p2.kind });
        if (me && SB.dist(me.x, me.z, o.x, o.z) < 20) say1(game, "pred", 90, "🐆 a stalker caught a " + label(p2.kind) + " over there");
        return true;
      }
      moveTo(o, sp.move, p2.x, p2.z, 0.5, true, dt); return true;
    }
    if (d.vic != null) {
      var v2 = SB.Game.byId(game, d.vic), gp = v2 && v2 === me ? guardPet() : null;
      if (!v2 || !v2.alive) { d.vic = null; return false; }
      if (gp || fireNear(game, v2)) {
        d.vic = null; d.full = game.time + 90; away(o, v2, 12);
        if (gp) { SB.bus.emit("petShoo", { rec: gp, it: o }); say1(game, "shoo", 60, A.SP[gp.k].icon + " " + gp.name + " sees the stalker off"); }
        return false;
      }
      if (SB.dist(o.x, o.z, v2.x, v2.z) < 1.4) {
        if (!((d.biteT || 0) > game.time)) { d.biteT = game.time + 8; nipC(game, v2, 0.04, 0.15); SB.bus.emit("predBite", { it: o, c: v2 }); if (v2 === me) say1(game, "predb", 10, "🐆 a stalker nips at you! shoo it, or get to a fire", "night"); }
        rest(o, sp.move); return true;
      }
      moveTo(o, sp.move, v2.x, v2.z, 1, SB.dist(o.x, o.z, v2.x, v2.z) < 6, dt); return true;
    }
    return false;
  };
  // nippers: small biters that follow a smol about. smoke keeps them off
  AI.pest = function (game, o, dt, me, sp, d) {
    d.at = (d.at || 0) - dt;
    if (d.at <= 0) { d.at = 0.8; var v = smolNear(game, o.x, o.z, 7); d.vic = v && !fireNear(game, v) ? v.id : null; if (v && d.vic == null) away(o, v, 8); }
    var v2 = d.vic != null ? SB.Game.byId(game, d.vic) : null;
    if (!v2 || !v2.alive) return false;
    if (SB.dist(o.x, o.z, v2.x, v2.z) < 1.2 && !((d.biteT || 0) > game.time)) {
      d.biteT = game.time + 6; nipC(game, v2, 0.01, 0.06);
      SB.bus.emit("pestBite", { it: o, c: v2 });
      if (v2 === me) say1(game, "pest", 60, "🦟 nippers! a torch or a fire keeps them off, and frogs eat them");
    }
    moveTo(o, sp.move, v2.x, v2.z, 0.6, false, dt); return true;
  };
  // a sneak: food left lying about at night is fair game
  AI.thief = function (game, o, dt, me, sp, d) {
    var W = SB.World, w = game.world;
    if (d.calm > 0 || d.stray) return false;
    if (d.loot) {
      var c0 = smolNear(game, o.x, o.z, 8);
      if (c0 && !(d.run > 0)) away(o, c0, 12);
      if (d.gx != null && !dry(game, d.gx, d.gz)) d.gx = null;
      moveTo(o, sp.move, d.gx, d.gz, 0.4, true, dt); return true;
    }
    d.at = (d.at || 0) - dt;
    if (d.at <= 0) {
      d.at = 1;
      var f = (d.full > game.time) ? null : W.nearestItem(w, o.x, o.z, 16, function (q) { return !q.gone && q.heldBy == null && K[q.kind] && K[q.kind].food && K[q.kind].noun === "food" && !(q.data && (q.data.pod || q.data.starter || q.data.keep)); });
      d.aim = f ? f.id : null;
    }
    var f2 = d.aim != null ? W.itemById(w, d.aim) : null;
    if (!f2 || f2.gone || f2.heldBy != null) { d.aim = null; return false; }
    if (SB.dist(o.x, o.z, f2.x, f2.z) < 0.9) {
      d.loot = f2.kind; W.remove(w, f2); d.aim = null; d.gx = null;
      SB.bus.emit("sneakStole", { it: o, kind: d.loot });
      if (me && SB.dist(me.x, me.z, o.x, o.z) < 14) say1(game, "sneak", 60, "🦊 a sneak made off with a " + label(d.loot) + "! shoo it and it drops it", "night");
      return true;
    }
    moveTo(o, sp.move, f2.x, f2.z, 0.4, true, dt); return true;
  };
  // rammers, tuskers, and a grunter herd once one of them has been hit: head down, and at you
  AI.ram = function (game, o, dt, me, sp, d) {
    if (d.calm > 0 || d.stray) return false;
    var W = SB.World;
    if (!d.chg) {
      if ((d.ramT || 0) > game.time) return false;
      if (sp.calmHerd && !(d.mad > game.time)) return false;
      var v = smolNear(game, o.x, o.z, sp.sight || 4);
      if (!v || lured(v, sp, me)) return false;
      d.chg = { who: v.id, t: sp.chgT || 2.2 };
      SB.bus.emit("charge", { it: o, c: v });
    }
    var c = SB.Game.byId(game, d.chg.who);
    d.chg.t -= dt;
    if (!c || !c.alive || d.chg.t <= 0) { d.chg = null; d.ramT = game.time + 6; return false; }
    if (SB.dist(o.x, o.z, c.x, c.z) < 1.2) {
      d.chg = null; d.ramT = game.time + (sp.calmHerd ? 3 : 8);
      nipC(game, c, sp.hit || 0.05, 0.15);
      var a = Math.atan2(c.x - o.x, c.z - o.z), kx = c.x + Math.sin(a) * 2, kz = c.z + Math.cos(a) * 2;
      if (W.walkable(game.world, kx, kz, false)) place(c, kx, kz);
      fx(game, "stars", c.x, c.y + 0.5, c.z, 5); snd(game, "bonk", 0.5);
      if (sp.horn && Math.random() < 0.35) Sv().spawn(game, sp.horn, 1, o.x + 0.4, o.z + 0.3);
      SB.bus.emit("rammed", { it: o, c: c });
      if (c === me) say1(game, "ram" + sp.name, 8, sp.icon + " the " + sp.name + " rams you! ow" + (sp.notame ? "" : ". hold out " + bestFood(sp) + " and it calms down"));
      return true;
    }
    moveTo(o, sp.move, c.x, c.z, 0.6, true, dt); return true;
  };
  // a roller: it doesn't run, it rolls up
  AI.curl = function (game, o, dt, me, sp, d) {
    if (d.calm > 0 || d.stray) { d.curl = 0; return false; }
    d.at = (d.at || 0) - dt;
    if (d.at <= 0) { d.at = 0.6; var v = smolNear(game, o.x, o.z, 4); if (v && !lured(v, sp, me)) d.curl = 3; }
    if (d.curl > 0) { d.curl -= dt; rest(o, sp.move); o.rot = (o.rot || 0) + dt * 0.5; return true; }
    return false;
  };
  // the big ones: slow, at home round their nest
  AI.gentle = function (game, o, dt, me, sp, d) {
    d.at = (d.at || 0) - dt;
    if (d.at <= 0) {
      d.at = 4 + Math.random() * 5;
      var a = Math.random() * 6.283, r = 2 + Math.random() * 4;
      d.gx = (d.hx == null ? o.x : d.hx) + Math.sin(a) * r; d.gz = (d.hz == null ? o.z : d.hz) + Math.cos(a) * r;
      if (game.world.night || !dry(game, d.gx, d.gz)) d.gx = null;
    }
    moveTo(o, sp.move, d.gx, d.gz, 0.6, false, dt); return true;
  };
  // a weaver: web from a few steps off slows you; the great ones bite too
  AI.web = function (game, o, dt, me, sp, d) {
    d.at = (d.at || 0) - dt;
    if (d.at <= 0) {
      d.at = 1;
      var v = smolNear(game, o.x, o.z, 7);
      d.vic = v && !fireNear(game, v) ? v.id : null;
      if (v && d.vic == null) away(o, v, 8);
      if (d.vic != null && !((d.spitT || 0) > game.time)) {
        d.spitT = game.time + 6; v._web = game.time + 3.5;
        fx(game, "dust", v.x, v.y + 0.4, v.z, 6);
        SB.bus.emit("webbed", { it: o, c: v });
        if (v === me) say1(game, "web", 15, "🕷 a weaver spits web at you: slow legs for a moment. a torch sends it scuttling");
      }
    }
    var v2 = d.vic != null ? SB.Game.byId(game, d.vic) : null, great = coatOf(o.kind) === "great";
    if (!v2 || !v2.alive) return false;
    if (great && SB.dist(o.x, o.z, v2.x, v2.z) < 1.3 && !((d.biteT || 0) > game.time)) { d.biteT = game.time + 5; nipC(game, v2, 0.04, 0.12); SB.bus.emit("weaverBite", { it: o, c: v2 }); }
    moveTo(o, sp.move, v2.x, v2.z, great ? 0.9 : 3, false, dt); return true;
  };
  // a thornling: walk in on it and the grove turns on you, until it is given something to plant
  AI.spirit = function (game, o, dt, me, sp, d) {
    d.at = (d.at || 0) - dt;
    if (d.at <= 0) {
      d.at = 5;
      var v = d.friend === day(game) ? null : smolNear(game, o.x, o.z, 7), n = 0, W = SB.World, w = game.world;
      if (v && !lured(v, sp, me)) {
        W.nearestItem(w, o.x, o.z, 12, function (q) { if (!q.gone && q.kind === "hopper" && q.heldBy == null && !(q.data && q.data.an != null)) { q.data.mad = game.time + 9; q.data.madAt = v.id; q.data.t = 1e6; if (wild.indexOf(q) < 0) wild.push(q); n++; } return false; });
        if (W.nearestNode(w, o.x, o.z, 12, function (q) { return q.kind === "hive" && q.state === "ok"; })) { nipC(game, v, 0.02, 0.12); n++; }
        fx(game, "leaves", o.x, o.y + 0.5, o.z, 8);
        SB.bus.emit("spiritAngry", { it: o, c: v, n: n });
        if (v === me) say1(game, "thorn", 20, "🌿 a thornling rustles, and the bees and bunnies turn on you! it wants a seed or a sapling");
      }
    }
    rest(o, sp.move); return true;
  };
  // a puffbug: startle it and it pops
  AI.pop = function (game, o, dt, me, sp, d) {
    d.at = (d.at || 0) - dt;
    if (d.at <= 0) { d.at = 0.4; var v = null; SB.World.creaturesNear(game.world, game, o.x, o.z, 2.2, function (c) { if (c.alive) v = c; }); if (v) { A.pop(game, o, v); return true; } }
    return false;
  };
  // things that swim: they keep to water deep enough, just under the top
  AI.swim = function (game, o, dt, me, sp, d) {
    var W = SB.World, w = game.world, min = sp.deep || 0.5;
    d.at = (d.at || 0) - dt;
    if (d.gx != null && W.depthAt(w, d.gx, d.gz) < min) d.gx = null;
    if (d.at <= 0 || d.gx == null) {
      d.at = 2 + Math.random() * 4;
      for (var i = 0; i < 6; i++) { var a = Math.random() * 6.283, r = 2 + Math.random() * 6, x = o.x + Math.sin(a) * r, z = o.z + Math.cos(a) * r; if (W.inBounds(w, x, z) && W.depthAt(w, x, z) >= min) { d.gx = x; d.gz = z; break; } }
    }
    if (d.run > 0) d.run -= dt;
    if (d.gx != null) {
      var dx = d.gx - o.x, dz = d.gz - o.z, l = Math.sqrt(dx * dx + dz * dz), v = (sp.fast || 1.1) * (d.run > 0 ? 2 : 1) * dt;
      if (l > 0.3) { o.x += dx / l * v; o.z += dz / l * v; o.rot = Math.atan2(dx, dz); } else d.gx = null;
    }
    o.y = W.groundY(w, o.x, o.z) - 0.18 + (sp.leap ? Math.max(0, Math.sin(game.time * 1.3 + o.id)) * 0.5 : Math.sin(game.time * 2 + o.id) * 0.04);
    o.onGround = false; d.t = 1e6;
    return true;
  };
  // a bunny the thornling has turned: it comes at you, for a few breaths
  function madHop(game, o, dt) {
    var d = o.data, v = d.mad > game.time ? SB.Game.byId(game, d.madAt) : null;
    if (!v || !v.alive) { d.mad = 0; d.t = 0; return false; }
    moveTo(o, "hop", v.x, v.z, 0.7, true, dt);
    if (SB.dist(o.x, o.z, v.x, v.z) < 1 && !((d.biteT || 0) > game.time)) { d.biteT = game.time + 3; nipC(game, v, 0.015, 0.05); SB.bus.emit("bunnyNip", { it: o, c: v }); }
    return true;
  }
  function ghostMove(game, o, dt) {
    var b = o.data.grave != null ? SB.World.structById(game.world, o.data.grave) : null, t = game.time * 0.6 + o.id;
    if (!b) { SB.World.remove(game.world, o); return; }
    moveTo(o, "fly", b.x + Math.sin(t) * 0.9, b.z + Math.cos(t) * 0.9, 0.1, false, dt);
  }

  /* ---------------- shooing, popping, poking ---------------- */
  function hpOf(it) { var sp = A.SP[spOf(it.kind)], c = coatOf(it.kind); return sp.hp + (c === "mid" ? 1 : c === "great" ? 2 : 0); }
  // anything with fight in it can be seen off with whatever is in your paw. a spear or a sword also gets what it carries
  A.strike = function (game, c, it) {
    var spk = spOf(it.kind), sp = A.SP[spk], d = it.data, S = Sv(), hk = S.heldKind(c), dropped = null;
    if (!sp || !sp.hp || it.gone || d.an != null) return { ok: false, msg: "" };
    if (SB.dist(c.x, c.z, it.x, it.z) > 3.8) return { ok: false, msg: "too far: get closer" };
    var sharp = hk === "spear" || hk === "sword", dmg = sharp || hk === "club" ? 2 : 1;
    d.hp = (d.hp == null ? hpOf(it) : d.hp) - dmg;
    d.vic = null; d.prey = null; d.chg = null; d.aim = null; d.calm = 0; d.full = game.time + 40; d.ramT = game.time + 5; d.spitT = game.time + 6;
    fx(game, "stars", it.x, it.y + 0.4, it.z, 4);
    if (d.loot) { S.spawn(game, d.loot, 1, it.x, it.z, { by: c.id }); dropped = d.loot; d.loot = null; }
    if (sp.calmHerd) wild.forEach(function (q) { if (!q.gone && spOf(q.kind) === spk && q.data.an == null && SB.dist(q.x, q.z, it.x, it.z) < 14) { q.data.mad = game.time + 12; q.data.ramT = 0; q.data.calm = 0; } });
    else away(it, c, 9);
    if (d.hp <= 0) {
      var parts = [], x = it.x, z = it.z;
      SB.World.remove(game.world, it);
      if (sharp) (sp.drops || []).forEach(function (q) { S.spawn(game, q[0], q[1], x + 0.3, z, { by: c.id }); parts.push(q[1] + " " + (q[0] === "meat" ? "meat" : label(q[0]))); });
      if (SB.Body && SB.Body.xp) SB.Body.xp(c, "hunt", 2);
      logAdd(game, spk);
      SB.bus.emit("beastGone", { c: c, kind: it.kind, drops: parts.length });
      return { ok: true, gone: true, msg: (dropped ? "it drops the " + label(dropped) + ". " : "") + (parts.length ? "got it: " + parts.join(", ") : "the " + sp.name + (sp.gone || " runs off for good")) };
    }
    SB.bus.emit("beastHit", { c: c, it: it });
    return { ok: true, msg: (dropped ? "it drops the " + label(dropped) + ". " : "") + (sp.calmHerd ? "the whole herd turns on you!" : "the " + sp.name + " backs off. again, and it's gone") };
  };
  A.pop = function (game, o, by) {
    var W = SB.World, x = o.x, z = o.z, y = o.y, n = 0, me = you(game);
    if (o.gone) return { ok: false, msg: "" };
    W.remove(game.world, o);
    fx(game, "smoke", x, y + 0.2, z, 10); fx(game, "embers", x, y + 0.3, z, 14); snd(game, "pop", 0.8);
    W.creaturesNear(game.world, game, x, z, 4, function (c) {
      if (!c.alive) return;
      if (c.species === "grump" && !c.boss) { c.whacked = (c.whacked || 0) + 1; n++; }
      if (c.chem && SB.Chem && SB.Chem.apply) SB.Chem.apply(c.chem, { fear: c.species === "grump" ? 0.5 : 0.1 });
    });
    if (SB.Game.addSparks) SB.Game.addSparks(game, 1, { x: x, y: y, z: z });
    logAdd(game, "puffbug");
    SB.bus.emit("puffPop", { by: by, grumps: n });
    if (by && by === me) say1(game, "puff", 30, "💨 pop! smoke and sparks (+1 ✨). grumps hate that");
    return { ok: true, grumps: n, msg: "pop!" };
  };
  A.punt = function (game, c, it) {
    var a = Math.atan2(c.x - it.x, c.z - it.z);
    for (var dd = 7; dd >= 2; dd--) { var x = c.x + Math.sin(a) * dd, z = c.z + Math.cos(a) * dd; if (SB.World.inBounds(game.world, x, z) && dry(game, x, z)) { place(c, x, z); break; } }
    nipC(game, c, 0.08, 0.2);
    fx(game, "stars", c.x, c.y + 0.5, c.z, 8); snd(game, "bonk", 0.8);
    SB.bus.emit("punted", { c: c, it: it });
    return { ok: true, punt: true, msg: "🦣 the big one blinks, and punts you clean across the clearing. don't poke it" };
  };
  // a natter blurts a word the tribe knows; everyone in earshot knows it a little better
  A.chatter = function (game, c, it) {
    var d = it.data, pool = [];
    if ((d.cd2 || 0) > game.time) return { ok: false, msg: "it's out of breath. in a bit" };
    d.cd2 = game.time + 12; d.calm = Math.max(d.calm || 0, 6);
    SB.Game.smols(game).forEach(function (o) { for (var w in o.vocab) if (o.vocab[w] >= 1 && pool.indexOf(w) < 0) pool.push(w); });
    if (!pool.length) pool = (SB.NOUN_WORDS || ["food"]).slice();
    var word = pool[Math.floor(Math.random() * pool.length)], before = (c.vocab && c.vocab[word]) || 0;
    if (SB.Creature && SB.Creature.learnWord) SB.World.creaturesNear(game.world, game, it.x, it.z, 6, function (o) { if (o.alive && o.species === "smol") SB.Creature.learnWord(o, word, 0.2, game); });
    SB.bus.emit("natter", { c: c, it: it, word: word });
    return { ok: true, word: word, msg: "🐿 “" + word + "! " + word + "!” " + (before >= 1 ? "everyone near hears it again" : "you know that word a little better now") };
  };
  A.poke = function (game, c, it) {
    var sp = A.SP[spOf(it.kind)];
    if (!sp || SB.dist(c.x, c.z, it.x, it.z) > 4.5) return { ok: false, msg: "too far" };
    logAdd(game, spOf(it.kind));
    return sp.words ? A.chatter(game, c, it) : sp.ai === "gentle" ? A.punt(game, c, it) : { ok: false, msg: "" };
  };
  // the big ones and the thornling can't be tamed, but they can be given something
  A.gift = function (game, c, it) {
    var S = Sv(), hk = S.heldKind(c), spk = spOf(it.kind), sp = A.SP[spk], d = it.data, dn = day(game), like = hk ? likeOf(sp, hk) : 0;
    if (!like) return { ok: false, msg: "the " + sp.name + " isn't interested. it likes " + bestFood(sp) };
    if (SB.dist(c.x, c.z, it.x, it.z) > 4.5) return { ok: false, msg: "get closer" };
    if (d.friend === dn) return { ok: false, msg: "it has had its treat today" };
    S.take(c, hk, 1); d.friend = dn; logAdd(game, spk);
    fx(game, "hearts", it.x, it.y + 0.6, it.z, 5);
    if (sp.ai === "gentle") {
      S.spawn(game, "fur", 1, it.x + 1.2, it.z + 0.6, { by: c.id }); S.spawn(game, "fiber", 2, it.x + 1.4, it.z + 0.2, { by: c.id });
      SB.bus.emit("bigFriend", { c: c, it: it });
      return { ok: true, msg: "🦣 the big one eats it in one go, and sheds a tuft for you. it won't mind you in the nest today" };
    }
    if (SB.Game.addSparks) SB.Game.addSparks(game, 2, c);
    if (SB.World.eachNodeNear) SB.World.eachNodeNear(game.world, it.x, it.z, 10, function (n) { if (n.dropT > 0) n.dropT *= 0.5; });
    SB.bus.emit("spiritCalm", { c: c, it: it });
    return { ok: true, msg: "🌿 the thornling takes the " + label(hk) + " and plants it. the grove settles, and things near it grow faster today (+2 ✨)" };
  };

  /* ---------------- nets, pots, eggs, the nest ---------------- */
  A.canNet = function (it) { var sp = A.SP[spOf(it.kind)]; return it.kind === "goldbug" || (!!sp && (!!sp.small || sp.ai === "pest") && !(it.data && it.data.an != null)); };
  A.net = function (game, c, it) {
    var spk = spOf(it.kind), sp = A.SP[spk];
    if (Sv().heldKind(c) !== "bugnet") return { ok: false, msg: "you need a bug net in your paw" };
    if (!A.canNet(it)) return { ok: false, msg: "too big for a net" };
    if (SB.dist(c.x, c.z, it.x, it.z) > 3.8) return { ok: false, msg: "too far" };
    if (it.kind === "goldbug") return A.catchGold(game, c, it);
    logAdd(game, spk);
    SB.bus.emit("netted", { c: c, kind: it.kind });
    if (sp.ai === "pest") { SB.World.remove(game.world, it); return { ok: true, msg: "🥅 netted the " + sp.name + ", and let it go far from here" }; }
    var r = A.tame(game, c, it);
    if (r.ok) r.msg = "🥅 netted! " + r.msg + ". a bug house would suit it";
    return r;
  };
  A.scoop = function (game, c, it) {
    var S = Sv(), sp = A.SP[spOf(it.kind)];
    if (!sp || !sp.pot || !S.has(c, "pot")) return { ok: false, msg: "you need a pot" };
    if (SB.dist(c.x, c.z, it.x, it.z) > 3.8) return { ok: false, msg: "too far" };
    if (S.has(c, "pondpot")) return { ok: false, msg: "one pondpup is company enough" };
    S.take(c, "pot", 1); give(game, c, "pondpot", 1);
    SB.World.remove(game.world, it); logAdd(game, spOf(it.kind));
    SB.bus.emit("scooped", { c: c });
    return { ok: true, msg: "🐡 the pondpup is in your pot. carry it with you: it mends you a little, all day" };
  };
  A.unpot = function (game, c) {
    var S = Sv();
    if (!S.has(c, "pondpot")) return { ok: false, msg: "" };
    if (!wetNear(game, c.x, c.z)) return { ok: false, msg: "at the water's edge" };
    S.take(c, "pondpot", 1); give(game, c, "pot", 1);
    return { ok: true, msg: "off it wriggles. you keep the pot" };
  };
  A.setEgg = function (game, c, b) {
    var S = Sv(), hk = S.heldKind(c);
    if (!isPen(b) || !A.EGGS[hk]) return { ok: false, msg: "" };
    if (A.PENS[b.kind].bugs) return { ok: false, msg: "too small. a pen with straw in it" };
    if (!near(c, b, 5)) return { ok: false, msg: "get closer" };
    var d = penData(b), e = d.eggs || (d.eggs = []);
    if (e.length >= 2) return { ok: false, msg: "there are two in the straw already" };
    S.take(c, hk, 1); e.push({ k: hk, d: day(game) });
    SB.bus.emit("eggSet", { c: c, st: b, kind: hk });
    return { ok: true, msg: "you tuck the " + label(hk) + " into the straw. two mornings, and room in the pen" };
  };
  A.nestNear = function (game, c) { var out = null; (game.sites || []).forEach(function (q) { if (q.kind === "nest" && !q.gone && SB.dist(q.x, q.z, c.x, c.z) < 6) out = q; }); return out; };
  A.searchNest = function (game, c, site) {
    var s = st(game), dn = day(game), ne = s.nests || (s.nests = {}), big = null;
    wild.forEach(function (o) { if (!o.gone && spOf(o.kind) === "biggun" && SB.dist(o.x, o.z, site.x, site.z) < 14 && o.data.friend !== dn) big = o; });
    if (big) { A.punt(game, c, big); return { ok: false, punt: true, msg: "🦣 the big one doesn't know you, and punts you out of its nest! bring it something to eat first" }; }
    if (ne[site.id] != null && dn - ne[site.id] < 12) return { ok: false, msg: "nothing but old straw. give it a couple of weeks" };
    ne[site.id] = dn; s.nestN = (s.nestN || 0) + 1;
    var kind = s.nestN % 2 === 1 ? "lizardegg" : "oldegg";
    give(game, c, kind, 1);
    SB.bus.emit("nestEgg", { c: c, kind: kind });
    return { ok: true, kind: kind, msg: "🥚 under the straw: a " + label(kind) + ". tuck it into a pen's straw and wait" };
  };
  // a spare queen, smoked out of a wild hive, starts a bee box
  A.queen = function (game, c, n) {
    var s = st(game), q = s.queens || (s.queens = {}), dn = day(game);
    if (!n || n.kind !== "hive") return { ok: false, msg: "" };
    if (Sv().heldKind(c) !== "torch") return { ok: false, msg: "smoke first: hold a torch" };
    if (q[n.id] != null && dn - q[n.id] < 8) return { ok: false, msg: "this hive is raising a new queen. give it a week" };
    q[n.id] = dn; give(game, c, "queenbee", 1);
    SB.bus.emit("queen", { c: c, node: n });
    return { ok: true, msg: "👑 the smoke calms them, and you lift out a spare queen. she needs a bee box (animals tab)" };
  };
  A.takeHoney = function (game, c, b) {
    var d = penData(b), n = d.out.honey || 0;
    if (!near(c, b, 5)) return { ok: false, msg: "get closer" };
    if (!n) return { ok: false, msg: "a steady hum. honeycomb comes each morning, except in winter" };
    var left = Sv().add(c, "honey", n);
    if (left === n) return { ok: false, msg: "your bag is full" };
    d.out.honey = left;
    SB.bus.emit("honeyTaken", { c: c, st: b, n: n - left });
    return { ok: true, msg: "🍯 " + (n - left) + " honeycomb, and not one sting" };
  };

  /* ---------------- looks, dyes, staying little, wants ---------------- */
  A.look = function (game, rec, coat) {
    if (rec.pick !== day(game)) return { ok: false, msg: "its look is settled now. a dye would change it" };
    if (plainCoats(rec.k).indexOf(coat) < 0) return { ok: false, msg: "" };
    rec.coat = coat; rec.made = 1; swapKind(body(game, rec), recKind(rec));
    SB.bus.emit("petLook", { rec: rec });
    return { ok: true, msg: rec.name + " is a " + recLabel(rec) + " now" };
  };
  A.dye = function (game, c, rec, col) {
    var S = Sv(), it = body(game, rec), has = false;
    (A.COATS[rec.k] || []).forEach(function (x) { if (x[0] === col) has = true; });
    if (!A.DYES[col] || !S.has(c, "dye_" + col)) return { ok: false, msg: "you need a dye" };
    if (!has) return { ok: false, msg: "dye only takes on woollies, cluckers and lopers" };
    if (!near(c, it)) return { ok: false, msg: "get closer" };
    if (rec.coat === col) return { ok: false, msg: rec.name + " is that colour already" };
    if (!rec.made) rec.coat0 = rec.coat || "";
    rec.coat = col; rec.made = 1; swapKind(it, recKind(rec)); S.take(c, "dye_" + col, 1);
    SB.bus.emit("petDyed", { c: c, rec: rec, col: col });
    return { ok: true, msg: "🎨 " + rec.name + " is a " + recLabel(rec) + " now" };
  };
  A.everbud = function (game, c, rec) {
    var S = Sv();
    if (!S.has(c, "everbud")) return { ok: false, msg: "you need an everbud" };
    if (!rec.kid) return { ok: false, msg: rec.name + " is grown already" };
    if (!near(c, body(game, rec))) return { ok: false, msg: "get closer" };
    S.take(c, "everbud", 1); rec.small = rec.small ? 0 : 1;
    SB.bus.emit("everbud", { c: c, rec: rec });
    return { ok: true, msg: rec.small ? "🌼 " + rec.name + " eats the everbud, and will stay little for good" : rec.name + " eats another, and will grow up after all" };
  };
  A.want = function (game, rec) {
    if (!rec || (rec.k === "grump" && !rec.lit)) return null;
    if ((rec.hurt || 0) >= 1) return { k: "rest", e: "🩹", t: "wants to rest" };
    if ((rec.hunger || 0) > 0.6) return { k: "food", e: "🍽", t: "wants food" };
    if ((rec.mood || 0) < 0.45) return { k: "play", e: "🎾", t: "wants to play" };
    if (game.time > (rec.petT || 0) + 200 && (rec.bond || 0) < 0.95) return { k: "pet", e: "💗", t: "wants a pet" };
    if (game.world.night && !A.SP[rec.k].night && rec.mode === "follow") return { k: "sleep", e: "💤", t: "is sleepy" };
    return null;
  };
  function wants(game, rec, k) { var w = A.want(game, rec); return !!w && w.k === k; }
  function wantMet(game, c, rec, k) { rec.bond = clamp01((rec.bond || 0) + 0.04); rec.mood = clamp01((rec.mood || 0) + 0.15); SB.bus.emit("wantMet", { c: c, rec: rec, k: k }); }
  function shed(game, c, rec) {
    var sp = A.SP[rec.k], parts = [];
    if (!sp.shed || !sp.coat || rec.kid || (rec.coatT || 0) < 1) return "";
    rec.coatT = 0;
    sp.coat.forEach(function (x) { give(game, c, x[0], x[1]); parts.push(x[1] + " " + label(x[0])); });
    SB.bus.emit("animalShed", { c: c, rec: rec });
    return ", and " + parts.join(", ") + " comes loose";
  }

  /* ---------------- a grave, and a little light ---------------- */
  function grave(game, rec, o) {
    if (!SK.petgrave || rec.k === "grump") return null;
    var W = SB.World, w = game.world, x = o.x, z = o.z, ok = false;
    for (var r = 0; r < 4.6 && !ok; r += 1.5) for (var i = 0; i < 8 && !ok; i++) { x = o.x + Math.sin(i * 0.785) * r; z = o.z + Math.cos(i * 0.785) * r; ok = dry(game, x, z) && W.siteFree(w, x, z, 0.4); }
    if (!ok) return null;
    var b = W.addStructure(w, game, "petgrave", x, z, { done: true, name: rec.name + "'s grave", data: { name: rec.name, k: rec.k, born: rec.born, died: day(game), pov: 1 } });
    SB.bus.emit("petGrave", { rec: rec, st: b });
    return b;
  }
  A.remember = function (game, c, b) {
    var d = b.data || {}, sp = A.SP[d.k];
    return { ok: true, msg: "🕯 " + d.name + " the " + (sp ? sp.name : "friend") + ". day " + d.born + " to day " + d.died + ". " + (d.rest ? "at rest" : "some nights a little light comes back here") };
  };
  A.farewell = function (game, c, it) {
    var b = it.data.grave != null ? SB.World.structById(game.world, it.data.grave) : null, name = b && b.data ? b.data.name : "it";
    if (SB.dist(c.x, c.z, it.x, it.z) > 5) return { ok: false, msg: "get closer" };
    if (b && b.data) b.data.rest = 1;
    fx(game, "hearts", it.x, it.y + 0.3, it.z, 8); fx(game, "sparkle", it.x, it.y + 0.3, it.z, 12);
    SB.World.remove(game.world, it);
    if (c.chem) c.chem.lonely = Math.max(0, (c.chem.lonely || 0) - 0.2);
    SB.bus.emit("petFarewell", { c: c, st: b });
    return { ok: true, msg: "✨ " + name + "'s little light circles you once, and goes up. goodbye, " + name };
  };

  /* ---------------- the herder: animals for coins (or grain, before coins) ---------------- */
  A.herderAt = function (game, c) { var best = null, bd = 6; A.pens(game).forEach(function (b) { var d = SB.dist(b.x, b.z, c.x, c.z); if (d < bd && b.data && b.data.herder && !A.PENS[b.kind].bugs) { bd = d; best = b; } }); return best; };
  // the nearest pen this animal fits in (a bug house only takes bugs), with room if there is one
  function penFor(game, c, rec) {
    var best = null, bd = 1e9;
    A.pens(game).forEach(function (b) { var d = SB.dist(b.x, b.z, c.x, c.z); if (d >= 6 || !penOK(b, rec)) return; if (A.penAnimals(game, b).length >= A.penCap(b)) d += 100; if (d < bd) { bd = d; best = b; } });
    return best;
  }
  A.penFor = penFor;
  A.stock = function (game) { var n = A.logCount(game), s = st(game); return A.SHOP.filter(function (o) { return n >= o.need && !(o.once && s[o.once]); }); };
  function coins(game) { return !!(game.econ && game.econ.coins); }
  A.priceText = function (game, o) { return !o.price ? "free, once" : coins(game) ? o.price + " coins" : o.price * 2 + " grain"; };
  A.buy = function (game, c, i) {
    var pen = A.herderAt(game, c), o = A.stock(game)[i], s = st(game), S = Sv();
    if (!pen) return { ok: false, msg: "the herder minds a pen: stand at one the tribe is minding" };
    if (!o) return { ok: false, msg: "" };
    var n = o.pair ? 2 : 1, cost = coins(game) ? o.price : o.price * 2, have = coins(game) ? Math.floor(c.purse || 0) : S.count(c, "grain", true), names = [];
    if (A.penAnimals(game, pen).length + n > A.penCap(pen)) return { ok: false, msg: "no room in this pen" };
    if (have < cost) return { ok: false, msg: "the herder wants " + A.priceText(game, o) };
    if (cost && coins(game)) c.purse = Math.round(((c.purse || 0) - cost) * 100) / 100; else if (cost) S.take(c, "grain", cost);
    if (o.once) s[o.once] = day(game);
    for (var j = 0; j < n; j++) {
      var rec = makeRec(game, o.sp, { x: pen.x + 0.3 * j, z: pen.z, bond: 0.35, spd: A.SP[o.sp].ride ? Math.round((1 + dice(game, "spd" + s.n)() * 0.2) * 100) / 100 : 0 });
      A.intoPen(game, null, rec, pen); names.push(rec.name);
    }
    SB.bus.emit("animalBought", { c: c, sp: o.sp, n: n });
    return { ok: true, msg: "🐾 " + names.join(" and ") + (n > 1 ? " hop" : " trots") + " into the pen. yours now" };
  };
  A.setKeep = function (game, b) {
    if (!isPen(b)) return { ok: false, msg: "" };
    var d = penData(b), cap = A.penCap(b);
    d.keep = !d.keep ? 2 : d.keep + 1 > cap ? 0 : d.keep + 1;
    return { ok: true, msg: d.keep ? "this pen keeps " + d.keep + " at most. each morning the rest are let go (never one with a collar)" : "this pen keeps them all" };
  };
  // a tame animal made from nothing: hatched, bought, or a gift
  function makeRec(game, spk, o) {
    var s = st(game), id = s.n++, r = dice(game, "trait" + id), tk = ["greedy", "brave", "nosy", "sleepy", "loyal"], me = you(game);
    var rec = { id: id, k: spk, coat: o.coat || "", kid: !!o.kid, name: o.name || pickName(game, id, A.NAMES), item: null, x: o.x, z: o.z, owner: me ? me.id : null, by: me ? me.name : "", mode: "stay", pen: null, sx: o.x, sz: o.z,
      bond: o.bond == null ? 0.5 : o.bond, hunger: 0.1, mood: 0.85, age: o.kid ? 0 : 6, born: day(game), trait: tk[Math.floor(r() * tk.length)], coatT: 0, tricks: {}, gear: {}, bornHere: 1 };
    if (o.spd) rec.spd = o.spd;
    s.list[id] = rec; body(game, rec); logAdd(game, spk);
    return rec;
  }
  A.makeRec = makeRec;
  function breedSpd(pa, pb, r) { return Math.round(Math.max(0.9, Math.min(1.45, ((pa.spd || 1) + (pb.spd || 1)) / 2 + (r() - 0.4) * 0.14)) * 100) / 100; }
  A.breedSpd = breedSpd;
  function third(k, a, b) { var out = a; (A.COATS[k] || []).forEach(function (c) { if (!c[3] && c[0] !== a && c[0] !== b) out = c[0]; }); return out; }
  // bugs: the new one takes after the pair you keep; two colours together now and then make the third
  function bugKid(game, pen, rec, dn) {
    var sp = A.SP[rec.k];
    if (!A.COATS[rec.k]) return sp.bug;
    var mates = A.penAnimals(game, pen).filter(function (r) { return r.k === rec.k && r !== rec; }), r = dice(game, "bugkid" + rec.id + ":" + dn), coat = rec.coat || "";
    if (mates.length) { var m = mates[Math.floor(r() * mates.length)], mc = m.coat || ""; if (mc !== coat) { var v = r(); coat = v < 0.4 ? coat : v < 0.8 ? mc : third(rec.k, coat, mc); } }
    return kindFor(rec.k, coat, false);
  }
  A.bugKid = bugKid;
  function tamed2(game, c, rec) {
    var s = st(game), sp = A.SP[rec.k], r = dice(game, "t2:" + rec.id), kinds = s.kinds || (s.kinds = {});
    rec.pick = day(game);
    if (sp.ride) rec.spd = Math.round((1 + r() * 0.2) * 100) / 100;
    if (sp.moods) rec.trait = ["playful", "lazy", "sleepy", "greedy", "nosy"][Math.floor(r() * 5)];
    logAdd(game, rec.k); kinds[rec.k] = 1;
    if (!s.windfoot && Object.keys(kinds).length >= A.UNIQUE_AT) {
      s.windfoot = day(game);
      var u = makeRec(game, "loper", { coat: "star", name: "Windfoot", x: c.x + 2.5, z: c.z + 1, bond: 0.8, spd: 1.3 });
      u.tag = 1; u.owner = c.id; u.by = c.name;
      if (SB.Game.note) SB.Game.note(game, c.name + " has befriended " + A.UNIQUE_AT + " kinds of animal, and a star loper walked out of the grass: Windfoot 🌟");
      SB.bus.emit("uniqueMount", { c: c, rec: u });
      tell(game, "🌟 " + A.UNIQUE_AT + " kinds of animal trust you now, and a star loper has walked out of the grass to join you. its name is Windfoot: it never tires");
    }
  }
  A.companion = function (game) { for (var i = 0; i < live.length; i++) { var r = live[i].rec, sp = A.SP[r.k]; if (r.mode === "follow" && sp && sp.small && sp.move === "fly") return r; } return null; };

  /* ---------------- riding: water, air, and a jump ---------------- */
  function unfin(game, c) {
    var s = st(game), sh;
    if (c && c.look && c.look.fins === A.FIN) c.look.fins = s.finsWas || 0;
    s.fins = null; s.finsWas = null;
    if (c && c.alive && SB.World.depthAt(game.world, c.x, c.z) > 0.5 && !(c.look && c.look.fins) && (sh = shore(game, c.x, c.z, 60))) { place(c, sh.x, sh.z); c.drownT = 0; }
  }
  function tick2(game, dt, me) {
    if (!me) return;
    var s = st(game), m = A.mount(game), sp = m ? A.SP[m.k] : null;
    if (sp && sp.over && me.look) { if (!me.look.fins) { s.finsWas = me.look.fins || 0; me.look.fins = A.FIN; s.fins = me.id; } if (me.drownT) me.drownT = 0; }
    if (m && me.onGround === false) { if (!me._rj && me.vy > 4) { me.vy *= 1.3; me._rj = 1; SB.bus.emit("mountJump", { c: me, rec: m }); } }
    else me._rj = 0;
  }

  /* ---------------- every two seconds, and each dawn ---------------- */
  function slow2(game, dt, me) {
    var w = game.world, W = SB.World, dn = day(game), B = SB.B || {}, i;
    // a finback tows a drowning smol to the shore, once a day each
    game.creatures.forEach(function (c) {
      if (!c.alive || c.species !== "smol" || !(c.drownT > 2) || c.finDay === dn) return;
      var bm = W.biomeAt(w, c.x, c.z);
      if (bm !== B.ocean && bm !== B.reef && bm !== B.beach && bm !== B.mangrove) return;
      var sh = shore(game, c.x, c.z, 40), ox = c.x, oz = c.z;
      if (!sh) return;
      c.finDay = dn; place(c, sh.x, sh.z); c.drownT = 0; c.shore = null;
      fx(game, "splash", ox, 0.1, oz, 12);
      if (K.finback && !wild.some(function (o) { return o.kind === "finback" && !o.gone; })) A.spawnWild(game, "finback", ox, oz, "", false);
      logAdd(game, "finback");
      SB.bus.emit("finRescue", { c: c });
      if (c === me || (me && SB.dist(me.x, me.z, sh.x, sh.z) < 30)) say1(game, "fin", 20, "🐬 a finback gets under " + (c === me ? "you" : c.name) + " and tows " + (c === me ? "you" : "it") + " to the shore");
    });
    // frogs eat nippers; the little lights go out by day
    for (i = wild.length - 1; i >= 0; i--) {
      var o = wild[i], eaten = false;
      if (o.gone) continue;
      if (o.kind === "petghost") { if (!w.night) { W.remove(w, o); wild.splice(i, 1); } continue; }
      if (o.kind !== "nipper") continue;
      live.forEach(function (e) { if (!eaten && e.rec.k === "frog" && SB.dist(e.it.x, e.it.z, o.x, o.z) < 6) eaten = true; });
      if (!eaten) wild.forEach(function (q) { if (!eaten && !q.gone && spOf(q.kind) === "frog" && SB.dist(q.x, q.z, o.x, o.z) < 4) eaten = true; });
      if (eaten) { W.remove(w, o); wild.splice(i, 1); SB.bus.emit("frogAte", { it: o }); }
    }
    if (!me) return;
    // a pondpup in a pot mends you a little; a fire lizard or a cinderleg keeps the cold off
    if (Sv().has(me, "pondpot") && me.chem.health < 1) me.chem.health = Math.min(1, me.chem.health + 0.002 * dt);
    var warm = false, m = A.mount(game);
    if (m && A.SP[m.k].warm) warm = true;
    live.forEach(function (e) { if (A.SP[e.rec.k] && A.SP[e.rec.k].warm && e.rec.mode === "follow" && SB.dist(e.it.x, e.it.z, me.x, me.z) < 5) warm = true; });
    if (warm && me.chem.cold > 0) me.chem.cold = Math.max(0, me.chem.cold - 0.02 * dt);
    // a pet shows what it wants: a small puff over its head now and then. a playful one rolls by itself
    emoT -= dt;
    if (emoT <= 0) {
      emoT = 14;
      live.forEach(function (e) {
        var wt = e.rec.mode === "follow" ? A.want(game, e.rec) : null;
        if (wt) { fx(game, wt.k === "pet" ? "hearts" : wt.k === "food" ? "crumbs" : "dust", e.it.x, e.it.y + 0.5, e.it.z, 2); SB.bus.emit("petWant", { rec: e.rec, k: wt.k }); }
        if (e.rec.trait === "playful" && !e.rec.kid && Math.random() < 0.3) { e.rec.spin = 1.2; W.creaturesNear(w, game, e.it.x, e.it.z, 6, function (c) { if (c.alive && c.species === "smol" && c.chem) c.chem.bored = Math.max(0, (c.chem.bored || 0) - 0.05); }); }
      });
    }
    // some nights a little light comes back to a grave
    if (w.night) w.structures.forEach(function (b) {
      if (b.kind !== "petgrave" || !b.data || b.data.rest || b.data.gday === dn || SB.dist(b.x, b.z, me.x, me.z) > 25) return;
      b.data.gday = dn;
      var g = W.add(w, game, "petghost", b.x + 0.4, b.z, { grave: b.id }); g.data.t = 1e6; wild.push(g);
      SB.bus.emit("petGhost", { st: b, it: g });
    });
  }
  function turtleNest(game) {
    var w = game.world, W = SB.World, B = SB.B || {}, f = you(game) || SB.Game.smols(game)[0] || w.T.spawn;
    if (!f || !K.shelly) return null;
    for (var r = 6; r < 70; r += 5) for (var a = 0; a < 6.28; a += 0.5) {
      var x = f.x + Math.sin(a) * r, z = f.z + Math.cos(a) * r;
      if (!W.inBounds(w, x, z) || !dry(game, x, z) || W.biomeAt(w, x, z) !== B.beach) continue;
      for (var i = 0; i < 2; i++) { var o = A.spawnWild(game, "shelly", x + i * 0.6, z, "", true); if (o) o.data.tr = 0.01; }
      Sv().spawn(game, "shell", 1, x - 0.5, z + 0.4);
      SB.bus.emit("turtleNest", { x: x, z: z });
      return { x: x, z: z };
    }
    return null;
  }
  A.turtleNest = turtleNest;
  function dawn2(game, s, dn, news) {
    var w = game.world;
    A.pens(game).forEach(function (b) {
      var d = penData(b), an = A.penAnimals(game, b);
      if (d.glow > 0) { d.glow--; an.forEach(function (r) { if (r.k !== "grump") { r.bond = clamp01((r.bond || 0) + 0.05); r.mood = clamp01((r.mood || 0) + 0.1); } }); }
      if (d.eggs && d.eggs.length) d.eggs = d.eggs.filter(function (e) {
        if (dn - e.d < 2 || !A.EGGS[e.k] || A.penAnimals(game, b).length >= A.penCap(b)) return true;
        var rec = makeRec(game, A.EGGS[e.k], { kid: true, x: b.x + 0.3, z: b.z - 0.2, bond: 0.6 });
        A.intoPen(game, null, rec, b);
        SB.bus.emit("hatched", { rec: rec, st: b, egg: e.k });
        news.push("the " + label(e.k) + " hatched: a little " + A.SP[rec.k].name + " called " + rec.name);
        return false;
      });
      if (d.keep > 0) {
        var all2 = A.penAnimals(game, b).filter(function (r) { return r.k !== "grump"; }), n = all2.length;
        all2.sort(function (x, y) { return ((x.kid ? 1 : 0) - (y.kid ? 1 : 0)) || ((x.bond || 0) - (y.bond || 0)); });
        while (n > d.keep && all2.length) { var out = all2.shift(); if (out.tag) continue; n--; news.push(out.name + " was let go: this pen keeps " + d.keep); A.release(game, out); SB.bus.emit("herdCap", { rec: out, st: b }); }
      }
    });
    w.structures.forEach(function (b) {
      if (b.kind !== "beebox" || !b.done) return;
      var d = penData(b), n = w.season === 3 ? 0 : 2;
      if (n) all(game).forEach(function (r) { if (A.SP[r.k].pollinate && r.mode !== "follow" && SB.dist(r.x, r.z, b.x, b.z) < 10) n = 3; });
      d.out.honey = Math.min(6, (d.out.honey || 0) + n);
    });
    if (s.season !== w.season) { s.season = w.season; if (turtleNest(game)) news.push("turtles came up the beach in the night: hatchlings, and a shell"); }
    all(game).forEach(function (r) { if (A.SP[r.k].spark && (r.bond || 0) >= 0.6 && !r.kid) { if (SB.Game.addSparks) SB.Game.addSparks(game, 1, body(game, r)); news.push(r.name + " left a spark of light ✨"); } });
  }

  /* ---------------- where the special ones come from ---------------- */
  function bigSpawn(game, f) {
    (game.sites || []).forEach(function (q) {
      if (q.kind !== "nest" || q.gone || SB.dist(q.x, q.z, f.x, f.z) > 60) return;
      if (wild.some(function (o) { return !o.gone && spOf(o.kind) === "biggun" && SB.dist(o.x, o.z, q.x, q.z) < 16; })) return;
      for (var i = 0; i < 8; i++) {
        var x = q.x + Math.sin(i * 0.785) * 3.5, z = q.z + Math.cos(i * 0.785) * 3.5;
        if (!dry(game, x, z)) continue;
        var o = A.spawnWild(game, "biggun", x, z, "", false);
        if (o) { o.data.hx = q.x; o.data.hz = q.z; }
        return;
      }
    });
  }
  function weaverSpawn(game, f) {
    var W = SB.World, w = game.world, B = SB.B || {}, cave = W.nearestNode(w, f.x, f.z, 45, function (q) { return q.kind === "cave"; }), a = wr() * 6.283, x, z;
    if (cave) { x = cave.x + Math.sin(a) * 3; z = cave.z + Math.cos(a) * 3; }
    else if (w.night) { x = f.x + Math.sin(a) * 22; z = f.z + Math.cos(a) * 22; var bm = W.inBounds(w, x, z) ? W.biomeAt(w, x, z) : -1; if (bm !== B.forest && bm !== B.taiga && bm !== B.swamp && bm !== B.shroom) return; }
    else return;
    if (!W.inBounds(w, x, z) || !dry(game, x, z)) return;
    var v = wr();
    A.spawnWild(game, "weaver", x, z, v < 0.5 ? "" : v < 0.85 ? "mid" : "great", false);
  }
  // a dried puff now and then on hot, dry ground
  function populate2(game, f) {
    var s = st(game), w = game.world, W = SB.World, B = SB.B || {};
    if (w.night || (s.puffs || 0) >= 3 || wr() > 0.05 || !K.drypuff) return;
    var a = wr() * 6.283, x = f.x + Math.sin(a) * 12, z = f.z + Math.cos(a) * 12;
    if (!W.inBounds(w, x, z) || !dry(game, x, z)) return;
    var bm = W.biomeAt(w, x, z);
    if (bm !== B.desert && bm !== B.mesa && bm !== B.ash && bm !== B.savanna) return;
    s.puffs = (s.puffs || 0) + 1;
    W.add(w, game, "drypuff", x, z, { keep: 1 });
    SB.bus.emit("dryPuff", { x: x, z: z });
  }

  /* ---------------- the buttons, and the tab ---------------- */
  function options2(game, c, r, o, x, s) {
    var hk = x.hk;
    function go(fn, a) { return function () { var q = fn(game, c, a); if (q && q.msg) x.say(q.msg); if (q && q.ok) x.audio("pop", 0.6); return true; }; }
    if (r && r.type === "item" && r.ref && r.ref.kind === "petghost") { o.use = o.pick = x.op("say goodbye", go(A.farewell, r.ref), null); o.place = null; }
    else if (r && r.type === "struct" && r.ref && r.ref.kind === "petgrave") o.use = o.pick = x.op("remember " + ((r.ref.data && r.ref.data.name) || "them"), go(A.remember, r.ref), null);
    else if (r && r.type === "struct" && r.ref && r.ref.kind === "beebox" && r.ref.done) o.use = o.pick = x.op(A.outN(r.ref) ? "take the honeycomb (" + A.outN(r.ref) + ")" : "listen to the bee box", go(A.takeHoney, r.ref), null);
    else if (r && r.type === "node" && r.ref && r.ref.kind === "hive" && hk === "torch" && !o.place) o.place = x.op("smoke out a spare queen", go(A.queen, r.ref), null);
    else if (r && r.type === "water" && hk === "drypuff") o.place = x.op("soak the dried puff", function () { var q = A.make(game, c, "wetpuff"); if (q.msg) x.say(q.msg); return true; }, null);
    else if (r && r.type === "water" && hk === "pondpot") o.place = x.op("let the pondpup go", go(A.unpot), null);
    else if (!r) {
      var site = A.nestNear(game, c);
      if (site) { var op = x.op("feel about in the giant nest", go(A.searchNest, site), null); if (!o.pick && s.ride == null) o.pick = op; else if (!o.place) o.place = op; else if (!o.use) o.use = op; }
    }
  }
  function goals2(game, add) {
    var s = st(game), n = Object.keys(s.kinds || {}).length;
    if (n > 0 && !s.windfoot) add("befriend " + A.UNIQUE_AT + " kinds of animal", n + "/" + A.UNIQUE_AT, false);
  }
  function penOK(b, rec) { return !A.PENS[b.kind].bugs || !!A.SP[rec.k].small; }
  function extraLine(game, rec) {
    var sp = A.SP[rec.k], wt = A.want(game, rec), out = "";
    if (wt) out += " · " + wt.e + " " + wt.t;
    if (sp.ride && rec.spd) out += " · speed " + bar((rec.spd - 0.9) / 0.5);
    if (rec.small) out += " · little for good";
    if (rec.said) out += " · says “" + esc(rec.said) + "”";
    return out;
  }
  function lookBtns(game, rec, btn) {
    var out = "";
    if (rec.pick !== day(game)) return out;
    plainCoats(rec.k).forEach(function (c) { if (c !== (rec.coat || "") && K[rawKind(rec.k, c, false)]) out += btn("look:" + c, rec.id, "look: " + (c || "plain")); });
    return out;
  }
  function html2(game, c, icon, pen) {
    var s = st(game), S = Sv(), n = A.logCount(game), out = "<div class='rlist'>", hp = A.herderAt(game, c), seen = [];
    function card(big, title, small, act, id, text, off) { return "<div class='rc'><span class='big'>" + big + "</span><div class='t'>" + title + "<small>" + small + "</small></div><button class='btn go' data-an='" + act + "' data-id='" + id + "' " + (off ? "disabled" : "") + ">" + text + "</button></div>"; }
    out += card("🪲", "a bug house, right here", esc(SK.bughouse.desc) + " · " + esc(costText(A.PENS.bughouse.cost)), "build", "bughouse", "build", c.tier < 2 || !!lacks(c, A.PENS.bughouse.cost));
    if (S.has(c, "queenbee")) out += card("🐝", "a bee box, right here", esc(SK.beebox.desc) + " · " + esc(costText(A.BUILDS.beebox.cost)), "build", "beebox", "build", c.tier < 2 || !!lacks(c, A.BUILDS.beebox.cost));
    out += "</div>";
    if (hp) {
      out += "<div class='lbl'>the herder · " + (coins(game) ? Math.floor(c.purse || 0) + " coins" : S.count(c, "grain", true) + " grain") + " to spend</div><div class='rlist'>";
      A.stock(game).forEach(function (o, i) { var sp = A.SP[o.sp]; out += card(sp.icon, esc(o.label || "a " + sp.name), esc(A.priceText(game, o)) + " · into this pen", "buy", i, o.price ? "buy" : "take", false); });
      var nx = A.SHOP.filter(function (o) { return o.need > n; })[0];
      if (nx) out += "<div class='help'>meet " + (nx.need - n) + " more kinds of animal and the herder brings more</div>";
      out += "</div>";
    }
    for (var k in s.log || {}) if (A.SP[k]) seen.push(A.SP[k].icon);
    out += "<div class='lbl'>critter log · " + n + " of " + A.logTotal() + " kinds met " + seen.join("") + "</div>";
    return out;
  }
  function act2(game, c, act, id, j, rec, b) {
    if (act === "buy") return A.buy(game, c, +id);
    if (act === "keep") return A.setKeep(game, b);
    if (rec && act.indexOf("look:") === 0) return A.look(game, rec, act.slice(5));
    return null;
  }
  // a chirper in earshot repeats what a smol says; whoever hears it twice learns it a little
  function hook2(cur) {
    SB.bus.on("say", function (d) {
      var game = cur();
      if (!game || !d || !d.c || !d.text || d.c.species !== "smol" || !game.quests || !game.quests.animals) return;
      var s = st(game);
      if ((s.echoT || 0) > game.time) return;
      for (var i = 0; i < live.length; i++) {
        var e = live[i], sp = A.SP[e.rec.k];
        if (!sp || !sp.echo || SB.dist(e.it.x, e.it.z, d.c.x, d.c.z) > 8) continue;
        var word = String(d.text).toLowerCase().split(/[^a-z]+/).filter(function (w) { return w.length > 1; })[0];
        if (!word) return;
        s.echoT = game.time + 25; e.rec.said = word; e.rec.saidN = (e.rec.saidN || 0) + 1;
        if (SB.LEXICON && SB.LEXICON[word] && SB.Creature && SB.Creature.learnWord) SB.World.creaturesNear(game.world, game, e.it.x, e.it.z, 6, function (o) { if (o.alive && o.species === "smol" && o !== d.c) SB.Creature.learnWord(o, word, 0.08, game); });
        SB.bus.emit("parrot", { rec: e.rec, word: word, c: d.c });
        return;
      }
    });
  }

  /* ---------------- the new animals ---------------- */
  function species(id, def, o) {
    o = o || {};
    if (!def.likes) def.likes = {};
    A.SP[id] = def;
    var coats = o.coats || [["", "", o.col]], mv = def.swim ? "swim" : def.move;
    if (coats.length > 1) A.COATS[id] = coats;
    coats.forEach(function (c) {
      var k = rawKind(id, c[0], false);
      addKind(k, { noun: "critter", label: c[1] + def.name, emoji: def.icon, r: o.r || 0.2, color: c[2], critter: mv, glow: o.glow ? 1 : 0, an: { sp: id, coat: c[0], kid: false }, desc: o.desc || def.watch || "" });
      if (o.model) MODEL[k] = o.model(c[2], 1, c[0]);
      if (def.kidName) {
        addKind(k + "_kid", { noun: "critter", label: c[1] + (def.kidLabel || def.name + " " + def.kidName), emoji: def.icon, r: (o.r || 0.2) * 0.6, color: c[2], critter: mv, glow: o.glow ? 1 : 0, an: { sp: id, coat: c[0], kid: true }, desc: "a little one. it grows up in a few days." });
        if (o.model) MODEL[k + "_kid"] = o.model(c[2], 0.55, c[0]);
      }
    });
    if (o.home) HOME_B[id] = o.home;
    if (o.cap) A.CAP[id] = o.cap;
  }
  // one body for most of them: a round trunk, a head, and whatever else it has
  function beast(o) {
    return function (col, s, coat) {
      return function () {
        var b = ME.builder(), h = o.h, bx = o.bx, by = o.by, bz = o.bz, hd = o.hd || 0, hy = h + by * 0.55 + (o.neck || 0), hz = bz * 0.85, i;
        b.push().scale(s * (o.s || 1) * (coat === "mid" ? 1.5 : coat === "great" ? 2.3 : 1));
        b.smoothShade(true).color(col).glow(o.glow || 0).push().translate(0, h, 0).scale(bx, by, bz).sphere(1).pop();
        if (hd) b.push().translate(0, hy, hz).scale(hd).sphere(1).pop();
        if (o.neck) b.push().translate(0, h + by * 0.4 + o.neck * 0.5, bz * 0.75).scale(hd * 0.6, o.neck * 0.75, hd * 0.6).sphere(0).pop();
        if (o.hump) b.push().translate(0, h + by * 0.85, -bz * 0.1).scale(bx * 0.6, by * 0.6, bz * 0.45).sphere(0).pop();
        if (o.tail === 1) b.push().translate(0, h + by * 0.2, -bz * 1.05).scale(bx * 0.3, by * 0.3, bz * 0.5).sphere(0).pop();
        b.glow(0);
        if (o.ears) b.color(o.earc || col);
        if (o.ears === "long") b.push().translate(hd * 0.5, hy + hd * 1.3, hz - 0.02).scale(hd * 0.3, hd, hd * 0.2).sphere(0).pop().push().translate(-hd * 0.5, hy + hd * 1.3, hz - 0.02).scale(hd * 0.3, hd, hd * 0.2).sphere(0).pop();
        else if (o.ears === "round") b.push().translate(hd * 0.7, hy + hd * 0.7, hz - 0.01).scale(hd * 0.4).sphere(0).pop().push().translate(-hd * 0.7, hy + hd * 0.7, hz - 0.01).scale(hd * 0.4).sphere(0).pop();
        else if (o.ears === "point") b.push().translate(hd * 0.55, hy + hd * 0.6, hz).cone(4, hd * 0.35, hd * 0.8).pop().push().translate(-hd * 0.55, hy + hd * 0.6, hz).cone(4, hd * 0.35, hd * 0.8).pop();
        if (o.horns) b.color(o.horns).push().translate(hd * 0.5, hy + hd * 0.6, hz).rotZ(-0.5).cone(5, hd * 0.25, hd * 1.3).pop().push().translate(-hd * 0.5, hy + hd * 0.6, hz).rotZ(0.5).cone(5, hd * 0.25, hd * 1.3).pop();
        if (o.horn1) b.color(0xfff2a0).glow(0.9).push().translate(0, hy + hd * 0.8, hz + hd * 0.3).rotX(0.5).cone(5, hd * 0.2, hd * 1.7).pop().glow(0);
        if (o.tusks) b.color(0xf5f0e0).push().translate(hd * 0.5, hy - hd * 0.5, hz + hd * 0.7).rotX(1.2).cone(4, hd * 0.18, hd * 0.9).pop().push().translate(-hd * 0.5, hy - hd * 0.5, hz + hd * 0.7).rotX(1.2).cone(4, hd * 0.18, hd * 0.9).pop();
        if (o.nose) b.color(o.nose).push().translate(0, hy - hd * 0.15, hz + hd * 0.9).scale(hd * 0.45, hd * 0.35, hd * 0.4).sphere(0).pop();
        if (o.trunk) b.color(col).push().translate(0, hy - hd * 0.9, hz + hd * 0.9).scale(hd * 0.25, hd * 0.9, hd * 0.25).sphere(0).pop();
        if (hd) eyes(b, hd * 0.5, hy + hd * 0.2, hz + hd * 0.8, Math.max(0.012, hd * 0.17));
        else if (o.face) eyes(b, bx * 0.35, h + by * 0.25, bz * 0.92, Math.max(0.015, bx * 0.1));
        if (o.belly) b.color(o.belly).push().translate(0, h - by * 0.25, bz * 0.2).scale(bx * 0.8, by * 0.7, bz * 0.75).sphere(0).pop();
        if (o.shell) b.color(o.shell).push().translate(0, h + by * (o.shellUp || 0.35), -bz * 0.08).scale(bx * 1.08, by * (o.shellH || 0.9), bz * (o.shellL || 0.9)).sphere(1).pop();
        if (o.fluff) { b.color(o.fluff); for (i = 0; i < 4; i++) b.push().translate(Math.sin(i * 1.6) * bx * 0.5, h + by * 0.8, Math.cos(i * 1.6) * bz * 0.4).scale(bx * 0.45).sphere(0).pop(); }
        if (o.spots) { b.color(o.spots); for (i = 0; i < 3; i++) b.push().translate((i - 1) * bx * 0.4, h + by * 0.85, (i - 1) * bz * 0.3).scale(bx * 0.18).sphere(0).pop(); }
        if (o.tail && o.tail !== 1) b.color(o.tail).push().translate(0, h + by * 0.3, -bz * 1.1).scale(bx * 0.4, by * 0.4, bz * 0.5).sphere(0).pop();
        if (o.wings) b.color(o.wings).push().translate(bx, h + by * 0.5, 0).rotZ(-0.5).box(bx * 1.6, 0.012, bz).pop().push().translate(-bx, h + by * 0.5, 0).rotZ(0.5).box(bx * 1.6, 0.012, bz).pop();
        if (o.fin) b.color(col).push().translate(0, h + by * 0.9, 0).scale(bx * 0.15, by * 0.7, bz * 0.3).sphere(0).pop().push().translate(0, h, -bz * 1.15).scale(bx * 0.9, by * 0.2, bz * 0.3).sphere(0).pop();
        if (o.legs8) { b.color(o.legc || col); for (i = 0; i < 4; i++) b.push().translate(bx * 1.1, h * 0.7, (i - 1.5) * bz * 0.45).rotZ(-0.6).box(bx * 1.5, 0.015, 0.02).pop().push().translate(-bx * 1.1, h * 0.7, (i - 1.5) * bz * 0.45).rotZ(0.6).box(bx * 1.5, 0.015, 0.02).pop(); }
        else if (o.legs !== 0) {
          var lx = bx * 0.6, lz = bz * 0.55, lh = Math.max(0.03, h - by * 0.6);
          b.color(o.legc || col);
          if (o.legs === 2) b.push().translate(lx, 0, 0).cyl(4, bx * 0.14, bx * 0.1, lh).pop().push().translate(-lx, 0, 0).cyl(4, bx * 0.14, bx * 0.1, lh).pop();
          else [[lx, lz], [-lx, lz], [lx, -lz], [-lx, -lz]].forEach(function (p) { b.push().translate(p[0], 0, p[1]).cyl(4, bx * 0.17, bx * 0.14, lh).pop(); });
        }
        b.pop();
        return b.finish();
      };
    };
  }
  function lump(col, sx, sy, sz, glow, top) {
    return function () {
      var b = ME.builder();
      b.smoothShade(true).color(col).glow(glow || 0).push().translate(0, sy, 0).scale(sx, sy, sz).sphere(1).pop().glow(0);
      if (top) b.color(top).push().translate(0, sy * 1.9, 0).scale(sx * 0.45, sy * 0.3, sz * 0.45).sphere(0).pop();
      return b.finish();
    };
  }
  function stickThing(col, tip, glow) {
    return function () {
      var b = ME.builder();
      b.color(0x8a5a36).push().translate(-0.2, 0.03, 0).rotZ(-1.5).cyl(4, 0.02, 0.018, 0.42).pop();
      b.color(tip).glow(glow || 0).push().translate(0.24, 0.06, 0).scale(col, col * 0.8, col).sphere(0).pop().glow(0);
      return b.finish();
    };
  }
  (function animals2() {
    if (!K) return;
    var B4 = ["meadow", "forest", "maple", "flowers"];
    A.COATS.hopper = [["", "", 0xd9c7a8], ["snow", "snow ", 0xffffff], ["dusk", "dusky ", 0x6a5a4a]];
    A.COATS.beetle = [["", "", 0xe5484d], ["blue", "blue ", 0x4a8ae6], ["green", "green ", 0x5ac46a]];
    var bun = beast({ h: 0.16, bx: 0.16, by: 0.15, bz: 0.2, hd: 0.1, ears: "long", tail: 0xf5e8d8, legs: 0 }), btl = beast({ h: 0.05, bx: 0.08, by: 0.05, bz: 0.1, hd: 0.04, legs: 0 });
    [["hopper", "bunny", "🐇", 0.22, "hop", bun], ["beetle", "beetle", "🐞", 0.1, "crawl", btl]].forEach(function (q) {
      A.COATS[q[0]].forEach(function (c) {
        if (!c[0]) return;
        var k = q[0] + "_" + c[0];
        addKind(k, { noun: "critter", label: c[1] + q[1], emoji: q[2], r: q[3], color: c[2], critter: q[4], an: { sp: q[0], coat: c[0], kid: false }, desc: q[0] === "hopper" ? "a bunny in another coat. it likes sunroots." : "a beetle of another colour. keep a pair in a bug house and the new ones take after them." });
        MODEL[k] = q[5](c[2], 1, c[0]);
      });
    });
    A.SP.hopper.coatFor = function (bm, r, B) { return bm === B.tundra || bm === B.taiga || bm === B.mountain ? "snow" : "dusk"; };
    A.SP.hopper.strict = 1; HOME_B.hopper = ["tundra", "taiga", "mountain", "forest", "maple"]; A.CAP.hopper = 1;
    A.SP.beetle.coatFor = function (bm, r) { return r() < 0.5 ? "blue" : "green"; };
    A.SP.beetle.strict = 1; HOME_B.beetle = ["jungle", "forest", "swamp", "bamboo", "flowers", "meadow"]; A.CAP.beetle = 2;
    HOME_B.woolly.push("shroom"); A.SP.woolly.lure = 1;

    species("stalker", { name: "stalker", icon: "🐆", move: "hop", shy: 3, notame: 1, ai: "pred", hp: 3, anytime: 1, strict: 1, fromDay: 3, drops: [["fur", 2]], gone: " slinks off for good", watch: "it hunts bunnies and cluckers, and at night a smol out on its own. it hates fire, and a pet that fights sees it off" },
      { col: 0x8a7a5a, r: 0.3, home: ["forest", "jungle", "taiga", "savanna", "maple"], cap: 1, model: beast({ h: 0.24, bx: 0.13, by: 0.12, bz: 0.3, hd: 0.1, ears: "point", tail: 1, spots: 0x3a3028, s: 1.2 }) });
    species("puffbug", { name: "puffbug", icon: "💨", move: "crawl", shy: 0, notame: 1, ai: "pop", strict: 1, nohunt: 1, watch: "walk up to it and it pops in smoke and sparks. grumps hate that" },
      { col: 0xe08a4a, r: 0.12, glow: 1, home: ["ash", "desert", "mesa", "savanna"], cap: 2, model: beast({ h: 0.09, bx: 0.09, by: 0.08, bz: 0.1, hd: 0.04, legs: 0, glow: 0.6 }) });
    species("glimmer", { name: "glimmer", icon: "🦄", move: "hop", likes: { honey: 1, glowcap: 0.8, heartfruit: 1 }, shy: 8, pet: 1, spark: 1, strict: 1, nohunt: 1, life: 80 },
      { col: 0xe8ecff, r: 0.4, glow: 1, home: ["crystal"], cap: 1, desc: "rare, shy, and it glows. it lives on the crystal steppe and loves honeycomb. a tame one leaves a spark each morning.", model: beast({ h: 0.4, bx: 0.16, by: 0.17, bz: 0.3, hd: 0.12, neck: 0.2, ears: "point", horn1: 1, tail: 0xffffff, glow: 0.5 }) });
    species("firelizard", { name: "fire lizard", icon: "🦎", move: "crawl", likes: { meat: 1, cooked: 0.8, beetle: 0.7 }, shy: 0, fight: 0.9, warm: 1, kidName: "hatchling", life: 90, finds: [["flint", 2], ["ore", 1], ["firewood", 2]] },
      { col: 0xd9603a, r: 0.28, glow: 1, desc: "hatched from a warm speckled egg out of a giant nest. it fights beside you and keeps the cold off.", model: beast({ h: 0.1, bx: 0.09, by: 0.07, bz: 0.24, hd: 0.08, tail: 1, glow: 0.5, spots: 0xffd24a }) });
    species("skypuff", { name: "sky puff", icon: "☁️", move: "fly", likes: { honey: 1, berry: 0.8, glowcap: 0.8 }, shy: 0, ride: 1, over: 1, mul: 1.9, nosaddle: 1, big: 1, kidName: "puffling", life: 0 },
      { col: 0xf5f8ff, r: 0.5, desc: "a dried puff, soaked and hatched. grown, it carries a smol over land and water alike.", model: beast({ h: 0.5, bx: 0.42, by: 0.36, bz: 0.45, legs: 0, face: 1, wings: 0xdfeaf5 }) });
    species("natter", { name: "natter", icon: "🐿", move: "hop", likes: { nutmeat: 1, seed: 0.8, berry: 0.6 }, shy: 2.5, pet: 1, poke: "poke", words: 1, strict: 1, life: 30, finds: [["seed", 3], ["nutmeat", 2]] },
      { col: 0xb8743a, r: 0.16, home: ["forest", "maple", "blossom", "taiga"], cap: 2, desc: "a chatty thing in the trees. poke it and it blurts a word it has heard smols say.", model: beast({ h: 0.13, bx: 0.08, by: 0.09, bz: 0.11, hd: 0.075, ears: "round", tail: 0xd9a05a }) });
    species("chirper", { name: "chirper", icon: "🦜", move: "fly", likes: { seed: 1, berry: 0.8, banana: 0.8 }, shy: 0, pet: 1, small: 1, echo: 1, strict: 1, life: 40 },
      { col: 0x3ac46a, r: 0.11, home: ["jungle", "bamboo", "mangrove", "blossom"], cap: 2, desc: "a bright bird. tame, it rides your shoulder and repeats what smols say, so they learn the word.", model: beast({ h: 0.1, bx: 0.06, by: 0.07, bz: 0.09, hd: 0.055, legs: 0, wings: 0xf2c84a, nose: 0xff9a3d }) });
    species("nipper", { name: "nipper", icon: "🦟", move: "fly", shy: 0, notame: 1, ai: "pest", hp: 1, strict: 1, nohunt: 1, gone: " is swatted away", watch: "a small biter. a torch or a fire keeps it off, a net catches it, and frogs eat it" },
      { col: 0x554a5a, r: 0.07, home: ["swamp", "jungle", "mangrove"], cap: 3, model: function (col) { return bug(col, 0); } });
    species("frog", { name: "frog", icon: "🐸", move: "hop", likes: { beetle: 1, butterfly: 0.8, berry: 0.4 }, shy: 3, pet: 1, small: 1, water: 1, strict: 1, wildKid: 1, kidName: "tadpole", kidLabel: "tadpole", life: 25,
      coatFor: function (bm, r, B) { return bm === B.tundra || bm === B.taiga || bm === B.mountain ? "snow" : bm === B.jungle || bm === B.mangrove || bm === B.savanna || bm === B.desert ? "ember" : ""; } },
      { coats: [["", "", 0x5ab04a], ["snow", "snow ", 0xdfeef5], ["ember", "ember ", 0xe08a3a]], r: 0.12, home: ["swamp", "mangrove", "jungle", "meadow", "forest", "taiga", "tundra", "flowers"], cap: 3, desc: "it lives by water, and its colour is the weather it grew up in. it eats nippers.", model: beast({ h: 0.07, bx: 0.09, by: 0.06, bz: 0.1, hd: 0.07, legs: 0, belly: 0xf0eec0 }) });
    species("shelly", { name: "shelly", icon: "🐢", move: "crawl", likes: { clam: 1, herb: 0.7, berry: 0.5 }, shy: 0, pet: 1, strict: 1, water: 1, coat: [["shell", 1]], coatDays: 6, shed: 1, kidName: "hatchling", life: 120, nohunt: 1 },
      { col: 0x7aa86a, r: 0.2, home: ["beach", "reef", "mangrove"], cap: 1, desc: "a beach turtle. they come up the sand each season and leave hatchlings and a shell. a tame one sheds a shell when brushed.", model: beast({ h: 0.08, bx: 0.13, by: 0.07, bz: 0.16, hd: 0.06, shell: 0x6a8a4a }) });
    species("minnows", { name: "minnows", icon: "🐟", swim: 1, move: "swim", ai: "swim", shy: 0, notame: 1, anytime: 1, flesh: "fish", meat: 1, deep: 0.4, watch: "fish, in the water. a spear from the bank gets you one" },
      { col: 0x8ac4e6, r: 0.18, cap: 3, model: beast({ h: 0.05, bx: 0.035, by: 0.05, bz: 0.13, legs: 0, face: 1, fin: 1 }) });
    species("inkling", { name: "inkling", icon: "🦑", swim: 1, move: "swim", ai: "swim", shy: 0, notame: 1, night: 1, flesh: "fish", meat: 2, deep: 0.8, watch: "it comes up at night. a spear gets you two fish's worth" },
      { col: 0xc86a9a, r: 0.22, glow: 1, cap: 1, model: beast({ h: 0.08, bx: 0.07, by: 0.08, bz: 0.16, legs: 0, face: 1, legs8: 1, glow: 0.4 }) });
    species("finback", { name: "finback", icon: "🐬", swim: 1, move: "swim", ai: "swim", shy: 0, notame: 1, nohunt: 1, anytime: 1, deep: 1.2, fast: 2.6, leap: 1, watch: "a finback. it tows a drowning smol back to the shore, once a day each" },
      { col: 0x6a8ab0, r: 0.5, cap: 1, model: beast({ h: 0.12, bx: 0.13, by: 0.13, bz: 0.42, legs: 0, face: 1, fin: 1, belly: 0xe8eef5 }) });
    species("rammer", { name: "rammer", icon: "🐐", move: "hop", likes: { herb: 1, grain: 0.8, leaves: 0.6 }, shy: 0, stock: 1, daily: "milk", fight: 0.5, ai: "ram", sight: 4, horn: "ramhorn", kidName: "kid", life: 40, meat: 1, fur: 1, strict: 1 },
      { col: 0xd9d2c4, r: 0.26, home: ["mountain", "tundra", "mesa"], cap: 2, desc: "a mountain thing that puts its head down and rams. now and then a horn comes off. it likes herbs, and gives milk in a pen.", model: beast({ h: 0.3, bx: 0.13, by: 0.14, bz: 0.22, hd: 0.09, horns: 0xb8a888, tail: 1 }) });
    species("snuffler", { name: "snuffler", icon: "🦥", move: "crawl", likes: { seed: 1, carrot: 0.8, herb: 0.6 }, shy: 0, pet: 1, nose: 2.2, kidName: "pup", life: 100, finds: [["seed", 5], ["sapling", 2], ["carrot", 2], ["pumpkin", 1], ["herb", 2]] },
      { col: 0x8a9a5a, r: 0.3, desc: "hatched from an old stone egg. it noses out buried seeds all day.", model: beast({ h: 0.2, bx: 0.17, by: 0.15, bz: 0.26, hd: 0.11, nose: 0xe8a0a0, ears: "round", fluff: 0x6a8a4a }) });
    species("roller", { name: "roller", icon: "🦔", move: "crawl", likes: { beetle: 1, pricklypear: 0.8, berry: 0.7 }, shy: 0, pet: 1, ai: "curl", coat: [["plate", 1]], coatDays: 3, shed: 1, life: 40, strict: 1, meat: 1 },
      { col: 0xc8a888, r: 0.18, home: ["savanna", "mesa", "desert"], cap: 2, desc: "it doesn't run, it rolls up. a tame one sheds a plate when brushed: three make plate padding for a pet that fights.", model: beast({ h: 0.1, bx: 0.11, by: 0.09, bz: 0.15, hd: 0.06, shell: 0xb09a7a, ears: "point" }) });
    species("cinderleg", { name: "cinderleg", icon: "🦩", move: "hop", likes: { pricklypear: 1, shroom: 0.8, glowcap: 0.6 }, shy: 5, ride: 1, mul: 1.5, warm: 1, big: 1, strict: 1, life: 60, kidName: "chick", meat: 1 },
      { col: 0xc8483a, r: 0.4, glow: 1, home: ["ash"], cap: 1, desc: "long legs made for hot ground. it lives only on the ashlands. ridden, it is quick, and it keeps the cold off you.", model: beast({ h: 0.62, bx: 0.15, by: 0.16, bz: 0.22, hd: 0.09, neck: 0.25, legs: 2, nose: 0xffb050, glow: 0.25, s: 1.2 }) });
    species("bobber", { name: "bobber", icon: "🐚", move: "crawl", likes: { clam: 1, fish: 0.9 }, shy: 0, ride: 1, over: 1, mul: 1.25, nosaddle: 1, water: 1, big: 1, strict: 1, life: 80, nohunt: 1 },
      { col: 0xf0c8a0, r: 0.4, home: ["beach", "reef", "mangrove"], cap: 1, desc: "a big shell that swims. tame, it carries a smol right over deep water.", model: beast({ h: 0.22, bx: 0.2, by: 0.18, bz: 0.26, hd: 0.1, legs: 0, shell: 0xe8a878, shellUp: 0.5, shellH: 1.2 }) });
    species("grunter", { name: "grunter", icon: "🐖", move: "hop", likes: { carrot: 1, pumpkin: 0.9, apple: 0.7 }, shy: 0, herd: 1, calmHerd: 1, ai: "ram", sight: 9, hit: 0.03, hp: 3, stock: 1, lure: 1, kidName: "piglet", life: 35, meat: 2, drops: [["meat", 2]], strict: 1 },
      { col: 0xe8a8a0, r: 0.24, home: B4, cap: 3, desc: "a calm herd, until one of them is hit: then they all come for you. tame, one can be ridden with a sunroot on a stick.", model: beast({ h: 0.2, bx: 0.14, by: 0.13, bz: 0.22, hd: 0.1, nose: 0xf0b8b8, ears: "point", tail: 1 }) });
    species("tusker", { name: "tusker", icon: "🐗", move: "hop", shy: 0, notame: 1, ai: "ram", sight: 7, chgT: 3.5, hit: 0.08, hp: 3, big: 1, anytime: 1, fromDay: 3, drops: [["meat", 3], ["fur", 1]], strict: 1, gone: " crashes off into the trees", watch: "it charges whatever comes near. a spear, three good pokes, and it is supper for days" },
      { col: 0x6a5244, r: 0.45, home: ["savanna", "taiga", "jungle"], cap: 1, model: beast({ h: 0.34, bx: 0.22, by: 0.22, bz: 0.36, hd: 0.15, tusks: 1, ears: "point", s: 1.2 }) });
    species("sneak", { name: "sneak", icon: "🦊", move: "hop", likes: { meat: 1, cluckegg: 0.9, fish: 0.9, berry: 0.6 }, shy: 4, pet: 1, night: 1, ai: "thief", hp: 2, fight: 0.3, strict: 1, life: 30, gone: " slips away for good", finds: [["berry", 2], ["cluckegg", 1], ["fish", 1], ["meat", 1]] },
      { col: 0xd9703a, r: 0.22, home: ["forest", "taiga", "tundra", "maple", "meadow"], cap: 1, desc: "it comes at night for food left lying about. shoo it and it drops what it took. it can be won over with meat, and then it brings things home instead.", model: beast({ h: 0.18, bx: 0.09, by: 0.09, bz: 0.2, hd: 0.085, ears: "point", tail: 0xffffff, nose: 0x1a1a22 }) });
    species("bambear", { name: "bambear", icon: "🐼", move: "hop", likes: { leaves: 1, stick: 0.8, apple: 0.7 }, shy: 2, pet: 1, big: 1, moods: 1, strict: 1, life: 70, kidName: "cub", nohunt: 1, finds: [["stick", 3], ["fiber", 2], ["leaves", 2]] },
      { col: 0xf5f5f0, r: 0.38, home: ["bamboo"], cap: 2, desc: "it sits in the bamboo eating leaves and sticks. every one has its own way: playful, lazy, sleepy, greedy or nosy.", model: beast({ h: 0.3, bx: 0.24, by: 0.24, bz: 0.26, hd: 0.16, ears: "round", earc: 0x1a1a22, legc: 0x1a1a22 }) });
    species("pondpup", { name: "pondpup", icon: "🐡", move: "crawl", shy: 0, notame: 1, pot: 1, water: 1, strict: 1, nohunt: 1, watch: "it lives at the water's edge. scoop it up in a pot and carry it: it mends you a little, all day" },
      { col: 0xf0a0b8, r: 0.12, home: ["meadow", "forest", "swamp", "jungle", "flowers", "blossom", "maple", "bamboo"], cap: 1, model: beast({ h: 0.06, bx: 0.06, by: 0.05, bz: 0.13, hd: 0.06, legs: 0, tail: 1 }) });
    species("lugger", { name: "lugger", icon: "🦙", move: "hop", likes: { grain: 1, leaves: 0.7, carrot: 0.7 }, shy: 4, stock: 1, pack: 6, fight: 0.3, coat: [["fiber", 2]], coatDays: 4, kidName: "cria", life: 50, meat: 1, fur: 1, strict: 1 },
      { col: 0xe8dcc0, r: 0.34, home: ["mountain", "mesa", "savanna"], cap: 1, desc: "a long-necked carrier. tame, it follows you with six slots on its back, no saddle needed.", model: beast({ h: 0.42, bx: 0.15, by: 0.16, bz: 0.26, hd: 0.09, neck: 0.3, ears: "long", fluff: 0xf5ecd8 }) });
    species("humper", { name: "humper", icon: "🐫", move: "hop", likes: { pricklypear: 1, grain: 0.8, carrot: 0.7 }, shy: 5, ride: 1, mul: 1.35, pack: 4, thrift: 0.4, big: 1, kidName: "calf", life: 70, meat: 2, fur: 1, strict: 1 },
      { col: 0xd9b070, r: 0.45, home: ["desert", "mesa"], cap: 1, desc: "a desert mount with a hump. it goes days on one meal, and carries four slots as well as you.", model: beast({ h: 0.55, bx: 0.2, by: 0.2, bz: 0.36, hd: 0.11, neck: 0.3, hump: 1, s: 1.15 }) });
    species("shroomsnail", { name: "glow snail", icon: "🐌", move: "crawl", likes: { glowcap: 1, shroom: 0.8, leaves: 0.6 }, shy: 0, ride: 1, mul: 1.15, pack: 8, nosaddle: 1, big: 1, life: 90, strict: 1, nohunt: 1 },
      { col: 0xc8b8e8, r: 0.4, glow: 1, home: ["shroom"], cap: 1, desc: "a snail the size of a hut, from the glowshroom grove. slow to ride, but it glows and carries eight slots.", model: beast({ h: 0.16, bx: 0.16, by: 0.12, bz: 0.4, hd: 0.1, legs: 0, shell: 0x9a7ad8, shellUp: 1.2, shellH: 2, shellL: 0.6, glow: 0.5, horns: 0xc8b8e8 }) });
    species("bigbeetle", { name: "stag beetle", icon: "🪲", move: "crawl", likes: { apple: 1, banana: 0.9, honey: 0.8 }, shy: 0, ride: 1, mul: 1.3, fight: 1, big: 1, life: 60, strict: 1 },
      { col: 0x3a4a6a, r: 0.42, home: ["jungle", "forest", "bamboo"], cap: 1, desc: "a beetle big enough to ride, and it fights grumps with its horns.", model: beast({ h: 0.24, bx: 0.26, by: 0.18, bz: 0.36, hd: 0.12, horns: 0x2a2a30, legs8: 1, legc: 0x1a1a22 }) });
    species("biggun", { name: "big one", icon: "🦣", move: "hop", likes: { pumpkin: 1, apple: 0.8, carrot: 0.8, banana: 0.8 }, shy: 0, notame: 1, gift: 1, ai: "gentle", poke: "poke", nohunt: 1, anytime: 1, spawn: bigSpawn, watch: "huge, slow and gentle. it lives at the giant nest. feed it and it sheds a tuft and lets you look in the nest. poke it and it punts you" },
      { col: 0x9a7a5a, r: 0.9, cap: 2, model: beast({ h: 0.75, bx: 0.5, by: 0.5, bz: 0.7, hd: 0.3, trunk: 1, tusks: 1, ears: "round", fluff: 0x7a5a40, s: 1.4 }) });
    species("weaver", { name: "weaver", icon: "🕷", move: "crawl", shy: 0, notame: 1, ai: "web", hp: 1, anytime: 1, fromDay: 2, drops: [["fiber", 2]], gone: " scuttles off into the dark", spawn: weaverSpawn, watch: "a cave weaver. it spits web that slows your legs. a torch sends it scuttling, and a spear gets its silk" },
      { coats: [["", "little ", 0x4a4458], ["mid", "", 0x3a3448], ["great", "great ", 0x2a2438]], r: 0.2, cap: 3, model: beast({ h: 0.1, bx: 0.1, by: 0.08, bz: 0.12, hd: 0.06, legs8: 1 }) });
    species("thornling", { name: "thornling", icon: "🌿", move: "hop", likes: { seed: 1, sapling: 1, honey: 0.6 }, shy: 0, notame: 1, gift: 1, ai: "spirit", nohunt: 1, strict: 1, watch: "a grove spirit. walk in on it and it turns the bees and bunnies on you. it wants a seed or a sapling to plant" },
      { col: 0x58a83e, r: 0.3, home: ["forest", "blossom", "flowers", "maple"], cap: 1, model: beast({ h: 0.25, bx: 0.14, by: 0.25, bz: 0.14, face: 1, legs: 2, legc: 0x7a5232, fluff: 0x6cc04a }) });
    if (K.woolly_shroom) { K.woolly_shroom.glow = 1; K.woolly_shroom.desc = "a woolly from the glowshroom grove. kept in a pen it gives glow stew, not milk."; }
    if (K.loper_star) { K.loper_star.glow = 1; K.loper_star.desc = "one of a kind. it never tires."; }

    function thing(k, def, model) { addKind(k, def); if (model) MODEL[k] = model; }
    thing("bugnet", { noun: "material", label: "bug net", emoji: "🥅", r: 0.16, color: 0xd9d2c4, mat: 1, desc: "a hoop of vine on a stick. small things that fly or crawl are yours in one swing." }, stickThing(0.09, 0xf5f3ed));
    thing("lurestick", { noun: "material", label: "sunroot on a stick", emoji: "🥕", r: 0.16, color: 0xff9a3d, mat: 1, desc: "with this in your bag a tame woolly or grunter will carry you, following its nose." }, stickThing(0.05, 0xff9a3d));
    thing("glowgrass", { noun: "material", label: "glow grass", emoji: "🌱", r: 0.14, color: 0x7fe6c4, mat: 1, glow: 1, desc: "animals love it. in a trough it lifts everyone's trust for three days, and a wild one smells it on you." }, lump(0x7fe6c4, 0.12, 0.05, 0.12, 0.6));
    thing("everbud", { noun: "material", label: "everbud", emoji: "🌼", r: 0.1, color: 0xffd24a, mat: 1, glow: 1, desc: "a golden bud. fed to a little animal, it stays little for good." }, lump(0xffd24a, 0.06, 0.05, 0.06, 0.8, 0x7fc45a));
    [["red", 0xd9534a, "🟥"], ["blue", 0x4a8ae6, "🟦"], ["green", 0x5ac46a, "🟩"], ["gold", 0xffd24a, "🟨"]].forEach(function (q) {
      thing("dye_" + q[0], { noun: "material", label: q[0] + " dye", emoji: q[2], r: 0.11, color: q[1], mat: 1, desc: "paints the coat of a tame woolly, clucker or loper." }, lump(0xb0603a, 0.08, 0.07, 0.08, 0, q[1]));
    });
    thing("plate", { noun: "material", label: "roller plate", emoji: "🔰", r: 0.12, color: 0xb09a7a, mat: 1, desc: "shed by a tame roller. three make plate padding." }, lump(0xb09a7a, 0.1, 0.03, 0.12));
    thing("shell", { noun: "material", label: "turtle shell", emoji: "🐚", r: 0.14, color: 0x6a8a4a, mat: 1, desc: "left on the beach by turtles. two make plate padding." }, lump(0x6a8a4a, 0.12, 0.06, 0.14));
    thing("platepad", { noun: "material", label: "plate padding", emoji: "🛡", r: 0.17, color: 0xb09a7a, mat: 1, desc: "armour for an animal that fights. it is hurt a quarter as much." }, lump(0xb09a7a, 0.16, 0.05, 0.12, 0, 0x6a8a4a));
    thing("ramhorn", { noun: "material", label: "rammer horn", emoji: "📯", r: 0.13, color: 0xb8a888, mat: 1, desc: "blow it (call them, in the animals tab) and your animals hear it from anywhere." }, lump(0xb8a888, 0.05, 0.05, 0.14));
    thing("lizardegg", { noun: "material", label: "warm speckled egg", emoji: "🥚", r: 0.16, color: 0xe8a070, mat: 1, glow: 1, desc: "from a giant nest. warm to hold. tuck it into a pen's straw for two mornings." }, lump(0xe8a070, 0.1, 0.13, 0.1, 0.4));
    thing("oldegg", { noun: "material", label: "old stone egg", emoji: "🪨", r: 0.16, color: 0x9a9a8a, mat: 1, desc: "very old, and not quite stone. tuck it into a pen's straw for two mornings." }, lump(0x9a9a8a, 0.1, 0.13, 0.1));
    thing("drypuff", { noun: "material", label: "dried puff", emoji: "🤍", r: 0.14, color: 0xd8d0c0, mat: 1, desc: "light as a leaf and dry as dust. soak it at the water's edge." }, lump(0xd8d0c0, 0.09, 0.07, 0.09));
    thing("wetpuff", { noun: "material", label: "soaked puff", emoji: "💧", r: 0.16, color: 0xf5f8ff, mat: 1, desc: "it is breathing. tuck it into a pen's straw for two mornings." }, lump(0xf5f8ff, 0.12, 0.1, 0.12));
    thing("pondpot", { noun: "material", label: "pondpup in a pot", emoji: "🐡", r: 0.15, color: 0xb0603a, mat: 1, desc: "it blinks up at you. while you carry it you mend a little all day. let it go at the water's edge." }, lump(0xb0603a, 0.12, 0.1, 0.12, 0, 0xf0a0b8));
    thing("queenbee", { noun: "material", label: "spare queen", emoji: "👑", r: 0.08, color: 0xffc94a, mat: 1, desc: "smoked out of a wild hive. with planks and sticks she starts a bee box." }, lump(0xffc94a, 0.05, 0.04, 0.08));
    thing("glowstew", { noun: "food", label: "glow stew", emoji: "🍲", r: 0.14, color: 0x9a7ad8, food: { hunger: -0.5, sleepy: -0.15 }, chem: { glucose: 0.3 }, rots: 900, glow: 1, desc: "from a kept glowcap woolly. warm, filling, and a little perky." }, lump(0x8a5a36, 0.12, 0.06, 0.12, 0, 0x9a7ad8));
    thing("petghost", { noun: "critter", label: "a little light", emoji: "✨", r: 0.12, color: 0xf5f8ff, critter: "fly", glow: 1, ghost: 1, desc: "it comes back to its grave some nights, until someone says goodbye." }, lump(0xf5f8ff, 0.07, 0.07, 0.07, 1.4));
    if (SK) {
      if (!SK.bughouse) SK.bughouse = { noun: "shelter", label: "bug house", emoji: "🪲", r: 0.7, cost: { stick: 4, fiber: 2 }, work: 4, desc: "a little house of sticks and reed. six bugs live here, and a new one comes most mornings." };
      if (!SK.beebox) SK.beebox = { noun: "wonder", label: "bee box", emoji: "🐝", r: 0.5, cost: { queenbee: 1, plank: 2, stick: 2 }, work: 4, desc: "a kept hive: two honeycomb each morning (three with a flutterby resting near), and no stings." };
      if (!SK.petgrave) SK.petgrave = { noun: "wonder", label: "little grave", emoji: "🪦", r: 0.3, cost: {}, work: 1, desc: "where an animal you loved rests." };
    }
  })();
  var STRUCT2 = {
    bughouse: function () {
      var b = ME.builder(), i;
      b.color(0x9a6a3c).push().translate(0, 0.25, 0).box(0.7, 0.5, 0.5).pop();
      b.color(0x6cc04a).push().translate(0, 0.56, 0).rotZ(0.02).box(0.84, 0.08, 0.62).pop();
      b.color(0x2a2522); for (i = 0; i < 6; i++) b.push().translate(-0.24 + (i % 3) * 0.24, 0.16 + Math.floor(i / 3) * 0.2, 0.255).box(0.12, 0.1, 0.01).pop();
      return b.finish();
    },
    beebox: function () {
      var b = ME.builder();
      b.color(0xd9b88a).push().translate(0, 0.2, 0).box(0.46, 0.28, 0.4).pop().push().translate(0, 0.48, 0).box(0.46, 0.24, 0.4).pop();
      b.color(0x8a5a36).push().translate(0, 0.64, 0).box(0.56, 0.06, 0.5).pop().push().translate(0.18, 0, 0.15).cyl(4, 0.03, 0.03, 0.08).pop().push().translate(-0.18, 0, -0.15).cyl(4, 0.03, 0.03, 0.08).pop();
      b.color(0x2a2522).push().translate(0, 0.12, 0.205).box(0.16, 0.03, 0.01).pop();
      return b.finish();
    },
    petgrave: function () {
      var b = ME.builder();
      b.color(0x9a948e).push().translate(0, 0.16, 0).box(0.22, 0.32, 0.07).pop().push().translate(0, 0.33, 0).scale(0.11, 0.07, 0.035).sphere(0).pop();
      b.color(0xff9ac8).push().translate(0.13, 0.05, 0.1).scale(0.04).sphere(0).pop();
      b.color(0x7a6a55).push().translate(0, 0.02, 0.18).scale(0.2, 0.03, 0.14).sphere(0).pop();
      return b.finish();
    }
  };
  A.MODEL2 = MODEL; A.HOMES = HOME_B;

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
      for (sp0 in { clucker: 1, woolly: 1, loper: 1 }) for (i0 = 0; i0 < A.COATS[sp0].length; i0++) {
        c0 = A.COATS[sp0][i0];
        var mk = sp0 === "clucker" ? clucker : sp0 === "woolly" ? woolly : loper;
        THINGS[rawKind(sp0, c0[0], false)] = mk(c0[2], 1);
        THINGS[rawKind(sp0, c0[0], true)] = mk(c0[2], 0.55);
      }
      for (var m2 in MODEL) THINGS[m2] = MODEL[m2];
      if (ME.STRUCT_BUILDERS) for (var s2k in STRUCT2) ME.STRUCT_BUILDERS[s2k] = STRUCT2[s2k];
      if (im0) ME.itemMesh = function (kind) { if (THINGS[kind]) { try { return THINGS[kind](); } catch (e) {} } return im0(kind); };
      if (ME.STRUCT_BUILDERS) { ME.STRUCT_BUILDERS.pen = penModel(1.15, 1, false); ME.STRUCT_BUILDERS.bigpen = penModel(1.45, 2, false); ME.STRUCT_BUILDERS.roofpen = penModel(1.65, 2, true); }
    } catch (e) {}
  }
  A.MESHES = THINGS;
})();
