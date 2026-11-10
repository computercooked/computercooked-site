/* smol brains — body.js (4.18): the body you live in while you're a smol.
   Thirst, getting wet, a cosy night's sleep, bruises and cuts, and nine skills that grow by doing.
   All of it lives on the creature (c.body), so it saves with the island and the smol keeps what it learned.
   possess.js calls B.tick every frame of a possession and asks B for the small bonuses; povhud.js draws it. */
(function () {
  "use strict";
  var SB = window.SB, B = SB.Body = {};

  B.SKILLS = [
    { id: "chop", label: "chopping", emoji: "🪓", perk: "swings cost less pep, and axes last longer" },
    { id: "mine", label: "mining", emoji: "⛏", perk: "swings cost less pep, and picks last longer" },
    { id: "forage", label: "foraging", emoji: "🧺", perk: "you gather faster" },
    { id: "craft", label: "crafting", emoji: "🛠", perk: "tools you make last longer" },
    { id: "cook", label: "cooking", emoji: "🍖", perk: "now and then, a second helping from one piece" },
    { id: "fish", label: "fishing", emoji: "🎣", perk: "more bites" },
    { id: "hunt", label: "hunting", emoji: "🏹", perk: "your spear lands more often" },
    { id: "fight", label: "fighting", emoji: "🏏", perk: "harder whacks" },
    { id: "run", label: "running", emoji: "🏃", perk: "running costs less pep" }
  ];
  B.BY_ID = {}; B.SKILLS.forEach(function (s) { B.BY_ID[s.id] = s; });
  B.MAX = 10;
  B.STEP = 0.05;            // each level is worth 5%
  B.THIRST = 1 / 420;       // a full water bar lasts 7 minutes in a body
  B.DRINK = 0.6;            // one drink gives back most of the bar
  B.WET_RAIN = 1 / 25;      // soaked after 25 s out in the rain
  B.DRY = 1 / 90; B.DRY_FIRE = 1 / 10; B.DRY_ROOF = 1 / 30;
  B.COSY_SLEEP = 20;        // game seconds asleep under a roof for the cosy morning
  B.BRUISE = 90; B.CUT = 240;

  B.of = function (c) {
    var b = c.body;
    if (!b || typeof b !== "object") b = c.body = {};
    if (typeof b.thirst !== "number") b.thirst = 0;
    if (typeof b.wet !== "number") b.wet = 0;
    if (typeof b.cosy !== "number") b.cosy = 0;
    if (!Array.isArray(b.wounds)) b.wounds = [];
    if (!b.sk || typeof b.sk !== "object") b.sk = {};
    if (!b.n || typeof b.n !== "object") b.n = {};
    if (!b.acc || typeof b.acc !== "object") b.acc = {};
    return b;
  };

  /* ---------------- skills ---------------- */
  B.need = function (lv) { return 4 + lv * lv * 3; }; // xp from this level to the next
  B.level = function (c, id) { var b = c && c.body, s = b && b.sk && b.sk[id]; return s ? s.l || 0 : 0; };
  B.bonus = function (c, id) { return B.level(c, id) * B.STEP; };
  B.progress = function (c, id) { var b = c && c.body, s = b && b.sk && b.sk[id]; if (!s) return 0; return s.l >= B.MAX ? 1 : SB.clamp((s.x || 0) / B.need(s.l), 0, 1); };
  B.xp = function (c, id, n) {
    if (!B.BY_ID[id]) return 0;
    var b = B.of(c), s = b.sk[id] || (b.sk[id] = { l: 0, x: 0 }), up = 0;
    if (s.l >= B.MAX) return 0;
    s.x += n == null ? 1 : n;
    while (s.l < B.MAX && s.x >= B.need(s.l)) { s.x -= B.need(s.l); s.l++; up++; }
    if (s.l >= B.MAX) s.x = 0;
    if (up) SB.bus.emit("skillUp", { c: c, id: id, level: s.l });
    return up;
  };
  // a perk that lands "bonus" of the time, with no dice: it builds up and pays out, so a level 4 cook gets a
  // second helping every fifth piece
  B.roll = function (c, id) {
    var bn = B.bonus(c, id); if (!bn) return false;
    var b = B.of(c); b.acc[id] = (b.acc[id] || 0) + bn;
    if (b.acc[id] >= 1) { b.acc[id] -= 1; return true; }
    return false;
  };
  B.count = function (c, what, n) { var b = B.of(c); b.n[what] = (b.n[what] || 0) + (n == null ? 1 : n); return b.n[what]; };
  B.total = function (c) { var t = 0; B.SKILLS.forEach(function (s) { t += B.level(c, s.id); }); return t; };

  /* ---------------- wounds ---------------- */
  B.has = function (c, kind) { var b = c && c.body; return !!(b && b.wounds && b.wounds.some(function (w) { return w.k === kind; })); };
  B.wound = function (c, kind, game) {
    var b = B.of(c), t = game.time, dur = kind === "cut" ? B.CUT : B.BRUISE, w = null;
    b.wounds.forEach(function (x) { if (x.k === kind) w = x; });
    if (w) { w.until = t + dur; return w; } // a second one of the same kind just lasts longer
    w = { k: kind, until: t + dur }; b.wounds.push(w);
    SB.bus.emit("wound", { c: c, kind: kind });
    return w;
  };
  // every blow bruises, and every third one cuts
  B.hurt = function (c, game) {
    var b = B.of(c); b.hits = (b.hits || 0) + 1;
    B.wound(c, "bruise", game);
    if (b.hits % 3 === 0) { B.wound(c, "cut", game); return "cut"; }
    return "bruise";
  };
  B.heal = function (c, kind) {
    var b = B.of(c), n = b.wounds.length;
    b.wounds = b.wounds.filter(function (w) { return kind && w.k !== kind; });
    return n - b.wounds.length;
  };

  /* ---------------- what the body does to you ---------------- */
  B.cosy = function (c, game) { var b = c && c.body; return !!(b && b.cosy > game.time); };
  B.hungerMul = function (c, game) { return B.cosy(c, game) ? 0.75 : 1; };
  B.pepCap = function (c) {
    var b = c && c.body; if (!b) return 1;
    var cap = 1;
    if (b.thirst > 0.85) cap -= 0.35; else if (b.thirst > 0.7) cap -= 0.15;
    if (B.has(c, "bruise")) cap -= 0.2;
    return Math.max(0.15, cap);
  };
  B.pepGain = function (c, game) { return B.cosy(c, game) ? 1.5 : 1; };
  B.runCost = function (c) { return 1 - B.bonus(c, "run"); };
  B.drink = function (c) { var b = B.of(c), was = b.thirst; b.thirst = Math.max(0, b.thirst - B.DRINK); B.count(c, "drinks"); return was - b.thirst; };

  function litFireNear(w, c, r) {
    var s = w.structures;
    for (var i = 0; i < s.length; i++) if (s[i].done && (s[i].kind === "campfire" || s[i].kind === "kiln") && s[i].data && s[i].data.lit && SB.dist(s[i].x, s[i].z, c.x, c.z) < r) return s[i];
    return null;
  }
  function inWater(w, c) { return SB.World.depthAt(w, c.x, c.z) > 0.4; } // deeper than a paddle
  B.litFireNear = litFireNear; B.inWater = inWater;
  B.cloaked = function (c) { return !!(c.inv && c.inv.s && c.inv.s.some(function (sl) { return sl && sl.k === "cloak"; })); };

  // one step of the body. S is possess.js's state for this possession, say() talks on the HUD.
  // the first night, a lent night chase and the first-possession hunger lesson are left alone: they teach one thing each
  B.tick = function (game, c, S, dt, say) {
    var b = B.of(c), ch = c.chem, w = game.world, t = game.time;
    say = say || function () {};
    var lesson = !!(S.firstNight || S.nightChase || S.hungerClock);
    var roof = SB.World.shelterAt(w, c.x, c.z), fire = litFireNear(w, c, 3.6), wade = inWater(w, c);
    var rain = (w.weather.rain || 0) > 0.3;

    // thirst
    if (!lesson) {
      var rate = B.THIRST * (S.running ? 1.5 : 1) * ((ch.hot || 0) > 0.3 ? 1.5 : 1) * (c.asleep ? 0.3 : 1) * (SB.Wilds ? SB.Wilds.needMul(game) : 1);
      b.thirst = Math.min(1, b.thirst + dt * rate);
      if (b.thirst > 0.72 && !S.thirstWarned) { S.thirstWarned = true; say("💧 thirsty. look at water and right click to drink"); }
      if (b.thirst < 0.5) S.thirstWarned = false;
      if (b.thirst >= 1) {
        if (!S.parchedWarned) { S.parchedWarned = true; say("💧 parched! you're losing hearts. drink"); }
        if (ch.health > 0.2) ch.health = Math.max(0.2, ch.health - dt * 0.004); // it never takes the last of your hearts by itself
      } else S.parchedWarned = false;
    }

    // wet: rain with no roof, or wading. a fire dries you fast, a roof slowly, and a cloak sheds half the rain
    var was = b.wet;
    if (wade) b.wet = Math.min(1, b.wet + dt / 4);
    else if (rain && !roof) b.wet = Math.min(1, b.wet + dt * B.WET_RAIN * (B.cloaked(c) ? 0.5 : 1));
    else b.wet = Math.max(0, b.wet - dt * (fire ? B.DRY_FIRE : roof ? B.DRY_ROOF : B.DRY * (w.night ? 0.5 : 1)));
    if (b.wet > 0.6 && was <= 0.6 && !lesson) say(wade ? "💦 soaked. dry off by a fire, or you'll get cold" : "🌧 you're getting soaked. find a roof or a fire");
    if (b.wet <= 0.02 && was > 0.02 && !lesson) say("dry again");
    if (b.wet > 0.3 && !fire) ch.cold = Math.min(1, (ch.cold || 0) + dt * 0.012 * b.wet); // wet fur is cold fur

    // wounds: a blow from a grump bruises, every third one cuts. a cut bleeds until it's bound or it closes
    if (S.bodyHp != null && ch.health < S.bodyHp - 0.03 && !lesson) {
      var grump = false;
      SB.World.creaturesNear(w, game, c.x, c.z, 4, function (o) { if (o.species === "grump" && o.alive) grump = true; });
      if (grump) {
        var k = B.hurt(c, game);
        say(k === "cut" ? "🩸 a cut! bind it with leaves or a healroot, or it keeps bleeding" : "🤕 bruised. you tire faster until it fades");
      }
    }
    if (b.wounds.length) {
      var closed = [];
      b.wounds = b.wounds.filter(function (x) { var left = (x.until - t) > 0; if (!left) closed.push(x.k); return left; });
      if (B.has(c, "cut") && ch.health > 0.15) ch.health = Math.max(0.15, ch.health - dt * 0.0022);
      if (closed.length) say(closed.indexOf("cut") >= 0 ? "your cut has closed" : "the bruise has faded");
      if (c.asleep) b.wounds.forEach(function (x) { x.until -= dt * 2; }); // sleep mends three times as fast
    }
    S.bodyHp = ch.health;

    // sleep: under a roof it counts toward a cosy morning (dry, and better still by a fire)
    if (c.asleep) {
      S.sleptT = (S.sleptT || 0) + dt;
      if (roof && b.wet < 0.3) S.cosyT = (S.cosyT || 0) + dt * (fire ? 2 : 1);
      S.wasAsleep = true;
    } else if (S.wasAsleep) {
      S.wasAsleep = false;
      if ((S.cosyT || 0) >= B.COSY_SLEEP) {
        b.cosy = t + SB.DAY_LENGTH * 0.6; B.count(c, "cosy");
        say("☀️ you slept warm and dry. cosy: your food lasts longer and your pep comes back faster today");
        SB.bus.emit("cosy", { c: c });
      } else if ((S.sleptT || 0) >= B.COSY_SLEEP) say("you slept rough. a roof and a fire make a better morning");
      S.sleptT = 0; S.cosyT = 0;
    }
    if (S.running) { S.runAcc = (S.runAcc || 0) + dt; if (S.runAcc >= 4) { S.runAcc -= 4; B.xp(c, "run", 1); } }
  };

  // the little signs over the vitals, and the lines in the paw journal
  B.status = function (c, game) {
    var b = c && c.body, out = [], ch = c.chem || {};
    if (!b) return out;
    if (b.thirst > 0.72) out.push({ k: "thirst", e: "💧", label: b.thirst >= 1 ? "parched" : "thirsty", tip: "drink from any water (look at it, right click)", bad: true });
    if (b.wet > 0.3) out.push({ k: "wet", e: "💦", label: b.wet > 0.7 ? "soaked" : "damp", tip: "wet fur gets cold. dry off by a fire or under a roof", bad: true });
    if (B.has(c, "cut")) out.push({ k: "cut", e: "🩸", label: "cut", tip: "it bleeds. hold leaves or a healroot and right click to bind it, or sleep it off", bad: true });
    if (B.has(c, "bruise")) out.push({ k: "bruise", e: "🤕", label: "bruised", tip: "less pep until it fades. sleep mends it faster", bad: true });
    if ((ch.sick || 0) > 0.3) out.push({ k: "sick", e: "🤢", label: "sick", tip: "raw or rotten food did this. healroot or a brew cures it; cook your food", bad: true });
    if (B.cosy(c, game)) out.push({ k: "cosy", e: "☀️", label: "cosy", tip: "you slept warm and dry: food lasts longer and pep comes back faster" });
    return out;
  };

  /* ---------------- bookkeeping from the bus ---------------- */
  var hooked = false;
  B.hook = function () {
    if (hooked) return; hooked = true;
    var on = SB.bus.on.bind(SB.bus);
    function pov(d) { return d && d.c && d.c._pov; }
    on("chop", function (d) { if (pov(d) && d.pov) B.count(d.c, "felled"); });
    on("rockGone", function (d) { if (pov(d)) B.count(d.c, "mined"); });
    on("craft", function (d) { if (pov(d) && d.pov) { B.xp(d.c, "craft", 3); B.count(d.c, "made"); } });
    on("fish", function (d) { if (pov(d)) { B.xp(d.c, "fish", 3); B.count(d.c, "fish"); } });
    on("hunt", function (d) { if (pov(d)) { B.xp(d.c, "hunt", 4); B.count(d.c, "hunted"); } });
    on("grumpChased", function (d) { if (pov(d)) { B.xp(d.c, "fight", 5); B.count(d.c, "grumps"); } });
    on("povSafeNight", function (d) { if (pov(d)) B.count(d.c, "nights"); });
    on("povEat", function (d) {
      if (!pov(d)) return;
      // medicine closes a cut (healroot) or mends everything (a brew)
      if (d.kind === "potion") B.heal(d.c);
      else if (d.kind === "herb") B.heal(d.c, "cut");
    });
  };
  if (SB.bus) B.hook();
})();
