/* smol brains — fight.js ("a real fight"): the fighting half of a smol's life, in first person.
   Until now a smol in your paws could tap a grump with what it held, dodge, and run. This adds:
     big swings   hold the use button on a grump to wind up, let go to swing: much harder, costs pep, staggers.
                  a sword's big swing sweeps, a spear's is a lunge, a club or maul swung in mid-hop is a slam.
     weapons      every weapon feels different (F.W): reach, knockback, stagger, swing speed, crits, burning.
                  new: bow + arrows (flint, grump-tooth, iron), sling + stones, shield, log maul, crystal blade.
     bows         aim with the crosshair, hold to draw, let go to shoot. arrows are used up (half can be picked
                  up again), the hit gets weaker with distance, far shots can go wide. works on grumps, captains
                  (their hide still turns what is too soft), bunnies and the practice dummy.
     sneaking     a crouch: slow, grumps lose track of you unless you are close, bunnies sit still, the prowler
                  takes longer to come, and the first hit on a grump that has not noticed you counts double.
     guard        brace (with or without a shield) and the next bites cost less, for pep. a captain's bite
                  knocks your guard down.
     traps        a snare (holds a grump), a pit trap (holds and hurts) and a practice dummy, set from the bag.
     quality      tools and weapons you make roll shoddy / plain / fine / masterwork from the maker's crafting
                  skill: it changes damage and uses and shows in the name.
     perks        fighting levels 2, 3, 4, 6, 8 and 10 each unlock a perk; at 5 and 10 you pick a style.
     feel         crits, knockback, a stagger meter, burning, a shroom-rubbed weapon, grump teeth as drops, and
                  rewards for the grumps you chase off yourself.
   State: game.quests.fight = { n (dice), chased, caught, tiers } (saved with the quest board). A smol's style picks
   live on c.body.fp. A tool's quality rides in the fraction of its wear number (slot.w), so it survives being
   dropped, stored, handed over and saved without touching the inventory code. Traps are small buildings
   (data.trap). Grumps are not saved, so stagger, pins and burns live on the grump with a leading underscore.
   Rolls its own dice, seeded from the island. Plugs in through ext.js only. */
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var F = SB.Fight = {};

  F.TAP = 0.25;        // hold the button longer than this and you are winding up, not tapping
  F.WIND = 0.9;        // a full wind-up
  F.MIN_CHARGE = 0.35; // let go before this and nothing happens
  F.POWER_MIN = 1.6; F.POWER_MAX = 2.5;
  F.POWER_PEP = 0.22;
  F.DRAW = 0.8;        // a full draw of the bow
  F.SNEAK_SPEED = 0.55; F.SNEAK_SEE = 3.2; F.SNEAK_HIT = 2;
  F.GUARD_T = 3.5; F.GUARD_BARE = 0.3; F.GUARD_SHIELD = 0.5; F.GUARD_PEP = 0.12;
  F.CRIT = 0.06; F.CRIT_MUL = 2;
  F.STUN = 2.5;        // seconds a staggered grump reels
  F.SNARE_HOLD = 8; F.PIT_HOLD = 6; F.PIT_DMG = 1;
  F.DUMMY_MAX = 4;     // a dummy teaches up to this level
  F.TOOTH = 0.4;       // a grump you beat yourself drops a tooth this often

  // shoddy / plain / fine / masterwork. f is the fraction of slot.w that marks it
  F.QUAL = [
    { id: "shoddy", f: 0.125, dmg: 0.8, uses: 0.6 },
    { id: "plain", f: 0.25, dmg: 1, uses: 1 },
    { id: "fine", f: 0.5, dmg: 1.15, uses: 1.3 },
    { id: "masterwork", f: 0.75, dmg: 1.35, uses: 1.7 }
  ];
  // how each weapon feels. reach: extra swing reach. kb: knockback. stg: stagger per hit. sp: time between swings.
  // crit: extra crit chance. sweep: a big swing hits every grump in front. burn: keeps hurting. sneak: a better sneak hit
  F.W = {
    club: { kb: 0.9, stg: 1.5, slam: 1, note: "knocks them back. swing it in mid-hop for a slam" },
    spear: { reach: 1.1, kb: 0.4, stg: 0.8, note: "a long reach. a big swing is a lunge" },
    sword: { crit: 0.1, sweep: 1, note: "more crits. a big swing sweeps every grump in front" },
    crystalblade: { crit: 0.15, sweep: 1, sp: 0.9, note: "quick, sharp, and it sweeps" },
    hammer: { stg: 3, sp: 1.4, slam: 1, note: "slow, light, and it stuns" },
    maul: { stg: 3, kb: 1.2, sp: 1.7, pep: 0.05, slam: 1, note: "two paws: slow and heavy. it staggers and shoves" },
    blade: { sp: 0.7, sneak: 3, note: "quick. a sneak hit counts three times" },
    torch: { burn: 1, note: "singes: the grump keeps hurting" },
    axe: { stg: 1.2, sp: 1.15, note: "a heavy chop" }, stoneaxe: { stg: 1.2, sp: 1.15, note: "a heavy chop" }, ironaxe: { stg: 1.3, sp: 1.15, note: "a heavy chop" },
    shield: { kb: 0.8, stg: 1.5, note: "carry it and brace: bites cost half" }
  };
  F.RANGED = {
    bow: { ammo: ["ironarrow", "tootharrow", "arrow"], range: 16, full: 5, cd: 0.6, word: "arrow", none: "no arrows. make some: a stick and a flint" },
    sling: { ammo: ["stone"], range: 11, full: 4, cd: 0.5, word: "stone", none: "no stones to sling" }
  };
  F.AMMO = { arrow: { dmg: 1 }, tootharrow: { dmg: 1.15, stg: 1.6 }, ironarrow: { dmg: 1.4 }, stone: { dmg: 0.5, stg: 3 } };
  // made in the bag's fight tab. "a|b" means either will do
  F.RECIPES = [
    { id: "bow", out: "bow", n: 1, tier: 2, cost: { stick: 2, "vine|fiber": 1 } },
    { id: "arrow", out: "arrow", n: 4, tier: 2, cost: { stick: 1, "flint|sharpstone": 1 } },
    { id: "tootharrow", out: "tootharrow", n: 4, tier: 2, cost: { stick: 1, tooth: 1 } },
    { id: "ironarrow", out: "ironarrow", n: 6, tier: 4, cost: { stick: 1, iron: 1 } },
    { id: "sling", out: "sling", n: 1, tier: 2, cost: { "fiber|vine": 2, "fur|leaves": 1 } },
    { id: "shield", out: "shield", n: 1, tier: 2, cost: { "plank|log": 2, "vine|fiber": 1 } },
    { id: "maul", out: "maul", n: 1, tier: 3, cost: { log: 1, stick: 1, "vine|fiber": 1 } },
    { id: "crystalblade", out: "crystalblade", n: 1, tier: 4, cost: { crystal: 2, iron: 1, stick: 1 } }
  ];
  F.TRAPS = {
    snare: { tier: 2, cost: { "vine|fiber": 2, stick: 1 }, text: "holds a grump by the foot for a while. one catch" },
    pittrap: { tier: 2, cost: { stick: 3, leaves: 3 }, text: "a grump falls in: stuck and hurt. cover it again with leaves" },
    dummy: { tier: 2, cost: { stick: 3, "leaves|fiber": 2 }, text: "whack it or shoot it to practise, up to level " + F.DUMMY_MAX }
  };
  F.PERKS = [
    { lv: 2, id: "quick", name: "quick paws", text: "swings come 15% faster" },
    { lv: 3, id: "breath", name: "steady breath", text: "big swings and blocks cost a quarter less pep" },
    { lv: 4, id: "eye", name: "sharp eye", text: "+10% chance of a crit" },
    { lv: 6, id: "heavy", name: "heavy paw", text: "more knockback and stagger" },
    { lv: 8, id: "hide", name: "thick hide", text: "every bite costs 10% less" },
    { lv: 10, id: "master", name: "master-at-arms", text: "crits hit two and a half times as hard" }
  ];
  F.STYLES = {
    5: [{ id: "bruiser", name: "bruiser", text: "+20% with anything you swing" }, { id: "marksman", name: "marksman", text: "+20% with bow and sling, and they reach further" }],
    10: [{ id: "guardian", name: "guardian", text: "your guard stops more and costs half the pep" }, { id: "trickster", name: "trickster", text: "+10% crits, and a sneak hit counts three times" }]
  };
  // hunting levels make a better sneak
  F.SNEAK_PERKS = [{ lv: 3, name: "soft paws", text: "you creep faster" }, { lv: 6, name: "shadow", text: "grumps have to be closer to notice you" }];
  // grumps you chase off yourself: [how many, sparks, what they call you]
  F.TIERS = [[3, 5, "grump-chaser"], [10, 10, "grump-bane"], [25, 20, "night-warden"], [50, 40, "terror of the dark"]];

  /* ---------------- the new things ---------------- */
  var K = SB.KINDS, SK = SB.STRUCTS;
  function kind(id, def) { if (K && !K[id]) K[id] = def; }
  kind("bow", { noun: "tool", label: "bow", emoji: "🏹", r: 0.16, color: 0x8a5a36, tool: "shoot", desc: "aim with the crosshair, hold to draw, let go to shoot. needs arrows." });
  kind("arrow", { noun: "material", label: "arrow", emoji: "➶", r: 0.1, color: 0xc9b28a, mat: 1, desc: "a flint-tipped arrow for a bow. about half can be picked up again." });
  kind("tootharrow", { noun: "material", label: "tooth arrow", emoji: "➶", r: 0.1, color: 0xf0ead8, mat: 1, desc: "tipped with a grump's tooth. hits harder and makes them wobble." });
  kind("ironarrow", { noun: "material", label: "iron arrow", emoji: "➶", r: 0.1, color: 0x9aa4b0, mat: 1, desc: "an iron-tipped arrow. the only arrow the Long Night feels." });
  kind("sling", { noun: "tool", label: "sling", emoji: "🪢", r: 0.12, color: 0xb89a6a, tool: "sling", desc: "flings stones from your bag. a small hit, but it makes a grump dizzy." });
  kind("shield", { noun: "tool", label: "shield", emoji: "🛡", r: 0.2, color: 0x9a6a3a, tool: "guard", desc: "carry it anywhere in your bag and brace: bites cost half." });
  kind("maul", { noun: "tool", label: "log maul", emoji: "🔨", r: 0.2, color: 0x7a5230, tool: "smash", desc: "a log on a stick. slow and heavy: it staggers and shoves." });
  kind("crystalblade", { noun: "tool", label: "crystal blade", emoji: "⚔", r: 0.16, color: 0x8fe8ff, tool: "slash", desc: "crystal set in iron. the sharpest thing on the island." });
  kind("tooth", { noun: "material", label: "grump tooth", emoji: "🦷", r: 0.08, color: 0xf0ead8, mat: 1, desc: "a grump left it behind. tips an arrow nicely." });
  function tool(id, def) { var T = SB.Surv && SB.Surv.TOOL; if (T && !T[id]) T[id] = def; }
  tool("bow", { wood: 0, stone: 0, ore: 0, dmg: 0, uses: 120 });
  tool("sling", { wood: 0, stone: 0, ore: 0, dmg: 0, uses: 80 });
  tool("shield", { wood: 0, stone: 0, ore: 0, dmg: 0.25, uses: 60 });
  tool("maul", { wood: 0, stone: 1, ore: 0, dmg: 1.2, uses: 160 });
  tool("crystalblade", { wood: 0.3, stone: 0, ore: 0, dmg: 2.4, uses: 400 });
  function struct(id, def) { if (SK && !SK[id]) SK[id] = def; }
  struct("snare", { noun: "material", label: "snare", emoji: "🪤", r: 0.35, cost: {}, work: 1, desc: "a loop of vine on a bent stick. it grabs a grump by the foot." });
  struct("pittrap", { noun: "material", label: "pit trap", emoji: "🕳", r: 0.5, cost: {}, work: 1, desc: "a hole under sticks and leaves. a grump that steps on it is stuck, and sorry." });
  struct("dummy", { noun: "material", label: "practice dummy", emoji: "🎯", r: 0.35, cost: {}, work: 1, desc: "a grump made of sticks. whack it or shoot it to practise." });

  /* ---------------- small helpers ---------------- */
  function P() { return SB.Possess; }
  function Sv() { return SB.Surv || SB.Survival; }
  function PS(c) { var p = P(), s = p && p.active && p.state ? p.state() : null; return s && !s.dead && (!c || s.c === c) ? s : null; }
  function lesson(s) { return !!(s && (s.firstNight || s.nightChase)); } // the taught nights stay exactly as they were
  function Q(game) { return game.quests || (game.quests = { ch: 0, done: {}, n: {} }); }
  function st(game) { var q = Q(game); if (!q.fight || typeof q.fight !== "object") q.fight = { n: 0, chased: 0, caught: 0, tiers: {} }; if (!q.fight.tiers) q.fight.tiers = {}; return q.fight; }
  F.state = st;
  function dice(game) { var s = st(game); s.n = ((s.n || 0) + 1) % 1000000; return SB.rng((((game.seed >>> 0) ^ Math.imul(s.n, 2654435761)) ^ 0xf167) >>> 0)(); }
  F._dice = dice;
  function day(game) { return Math.floor((game.time || 0) / SB.DAY_LENGTH) + 1; }
  function lab(k) { return K[k] && K[k].label ? K[k].label : k; }
  function words(key) { return key.split("|").map(lab).join(" or "); }
  function say(msg) { var p = P(); if (p && p.active && p.say && msg) p.say(msg); }
  function audio(name, vol) { var p = P(); if (SB.Audio && SB.Audio.play && !(p && p.headless)) SB.Audio.play(name, { vol: vol == null ? 1 : vol }); }
  function burst(kindOf, x, y, z, n, opts) { if (SB.FX && SB.FX.burst) SB.FX.burst(kindOf, x, y, z, n, opts); }
  function lv(c, id) { return SB.Body ? SB.Body.level(c, id) : 0; }
  function bonus(c, id) { return SB.Body ? SB.Body.bonus(c, id) : 0; }
  function isTool(k) { return !!(k && K[k] && K[k].tool); }
  function dmgOf(k) { return Sv().power(isTool(k) ? k : "paws").dmg || 0; }
  function prof(k) { return (k && F.W[k]) || {}; }
  function isGrump(o) { return !!(o && o.species === "grump" && o.alive); }
  function tut(g) { return !!(g && g.scout && (g.scout.night || g.scout.nc)); } // the first night's grump and a night chase's: left alone
  function gy(game, x, z) { return SB.World.groundY(game.world, x, z); }
  F.has = function (c, id) { for (var i = 0; i < F.PERKS.length; i++) if (F.PERKS[i].id === id) return lv(c, "fight") >= F.PERKS[i].lv; return false; };
  F.style = function (c, at) { return (c && c.body && c.body.fp && c.body.fp[at]) || null; };
  F.pick = function (game, c, at, id) {
    var list = F.STYLES[at];
    if (!list || !list.some(function (x) { return x.id === id; })) return { ok: false, msg: "that's not a style" };
    if (lv(c, "fight") < at) return { ok: false, msg: "reach fighting level " + at + " first" };
    if (F.style(c, at)) return { ok: false, msg: "you've already picked" };
    if (!c.body || typeof c.body !== "object") c.body = {};
    if (!c.body.fp || typeof c.body.fp !== "object") c.body.fp = {};
    c.body.fp[at] = id;
    SB.bus.emit("fightStyle", { c: c, at: at, id: id });
    return { ok: true, msg: "🏏 " + c.name + " fights as a " + id + " now" };
  };
  function pepMul(c) { return (F.has(c, "breath") ? 0.75 : 1) * Math.pow(0.92, attr(c).pep || 0); }

  /* ---------------- quality ---------------- */
  // which quality a slot (or a wear number) carries: 0 shoddy, 1 plain, 2 fine, 3 masterwork
  F.qualOf = function (sl) {
    var w = sl && typeof sl === "object" ? sl.w : sl;
    if (typeof w !== "number") return 1;
    var f = w - Math.floor(w);
    return Math.abs(f - 0.125) < 0.01 ? 0 : Math.abs(f - 0.5) < 0.01 ? 2 : Math.abs(f - 0.75) < 0.01 ? 3 : 1;
  };
  F.rolled = function (sl) { var w = sl && sl.w; return typeof w === "number" && w - Math.floor(w) > 0.01; };
  F.wearFor = function (k, q) { return Math.round(Sv().uses(k) * F.QUAL[q].uses) + F.QUAL[q].f; };
  // the maker's crafting skill decides: a beginner botches some, a master makes masterworks
  F.rollQual = function (game, c) {
    var l = lv(c, "craft"), r = dice(game);
    var pm = l >= 6 ? (l - 5) * 0.06 : 0, pf = 0.08 + l * 0.05, ps = Math.max(0, 0.3 - l * 0.06);
    return r < pm ? 3 : r < pm + pf ? 2 : r > 1 - ps ? 0 : 1;
  };
  F.name = function (sl) { if (!sl) return ""; var q = F.qualOf(sl); return (isTool(sl.k) && q !== 1 ? F.QUAL[q].id + " " : "") + lab(sl.k); };
  // a tool the smol just made by the ordinary recipes: find it (fresh, unrolled) and roll it
  function stampFresh(game, c, k) {
    var v = Sv().inv(c);
    for (var i = 0; i < v.s.length; i++) {
      var sl = v.s[i];
      if (!sl || sl.k !== k || sl.w !== Sv().uses(k)) continue;
      var q = F.rollQual(game, c);
      sl.w = F.wearFor(k, q);
      SB.bus.emit("quality", { c: c, kind: k, q: q, name: F.name(sl) });
      return q;
    }
    return -1;
  }

  /* ---------------- stagger, pins, burns ---------------- */
  var now = 0;            // this file's own clock (seconds of running island)
  var pins = [], dots = [];
  function pinned(g) { for (var i = 0; i < pins.length; i++) if (pins[i].id === g.id && !pins[i].search) return pins[i]; return null; }
  function pin(g, o) { o.id = g.id; pins.push(o); return o; }
  F.staggered = function (g) { return !!(g && g._stun > now); };
  F.staggerOf = function (g) { return g && g._stg ? Math.max(0, g._stg - (now - (g._stgT || 0)) * 0.3) : 0; };
  F.staggerAt = function (g) { return 2 + (g.tough || 1); };
  // add to a grump's stagger meter; when it fills, the grump reels and takes more from every hit. captains don't
  F.addStagger = function (game, g, amt) {
    if (!isGrump(g) || g.boss || tut(g) || !(amt > 0) || F.staggered(g)) return false;
    var v = F.staggerOf(g) + amt;
    g._stgT = now;
    if (v < F.staggerAt(g)) { g._stg = v; return false; }
    g._stg = 0; g._stun = now + F.STUN;
    if (!pinned(g)) pin(g, { until: now + F.STUN, spin: true });
    if (g.scout) g.scout.reel = 0.8;
    if (SB.Creature.emote) SB.Creature.emote(g, "huh", F.STUN);
    burst("crumbs", g.x, (g.y || 0) + 0.9, g.z, 8, { col: [1, 0.9, 0.4] });
    SB.bus.emit("staggered", { g: g });
    return true;
  };
  function shove(game, c, g, d) {
    if (g.boss || pinned(g) || !(d > 0)) return;
    var a = Math.atan2(g.x - c.x, g.z - c.z), nx = g.x + Math.sin(a) * d, nz = g.z + Math.cos(a) * d;
    if (SB.World.walkable(game.world, nx, nz)) { g.x = nx; g.z = nz; }
  }
  function tickPins(game, dt) {
    for (var i = pins.length - 1; i >= 0; i--) {
      var p = pins[i], g = SB.Game.byId(game, p.id);
      if (!g || !g.alive || g.species !== "grump" || now >= p.until) {
        if (g && g.alive && p.search && SB.Creature.emote) SB.Creature.emote(g, "huh", 1.4);
        if (g && g.alive && p.heal) { g.whacked = (g.whacked || 0) * 0.6; SB.bus.emit("grumpBack", { g: g }); } // it found its nerve again, and comes back
        pins.splice(i, 1); continue;
      }
      g.action = null; g.thinkT = Math.max(g.thinkT || 0, 0.4);
      if (p.run) { // running from something: a stink, a shout, or you
        var ax = g.x - p.fx, az = g.z - p.fz, ad = Math.hypot(ax, az) || 1, rx = g.x + ax / ad * 2.4 * dt, rz = g.z + az / ad * 2.4 * dt;
        g.facing = Math.atan2(ax, az);
        if (SB.World.walkable(game.world, rx, rz)) { g.x = rx; g.z = rz; }
        continue;
      }
      if (p.x != null) { g.x = p.x; g.z = p.z; g.px = p.x; g.pz = p.z; if (g.anim) g.anim.squash = 0.12 * Math.abs(Math.sin(now * 9)); }
      if (p.spin) g.facing = (g.facing || 0) + dt * 9;
      if (p.search) { // it lost you: it goes to where it last saw you and sniffs about
        var dx = p.sx - g.x, dz = p.sz - g.z, d = Math.hypot(dx, dz);
        if (d > 0.8) { var nx = g.x + dx / d * 1.1 * dt, nz = g.z + dz / d * 1.1 * dt; g.facing = Math.atan2(dx, dz); if (SB.World.walkable(game.world, nx, nz)) { g.x = nx; g.z = nz; } }
        else g.facing = (g.facing || 0) + Math.sin(now * 2.2) * dt * 2.5;
      } else if (g.scout && !g.boss) g.scout.hitT = Math.max(g.scout.hitT || 0, 1); // (the same beat a grump stands for after a bite)
    }
  }
  function tickDots(game) {
    for (var i = dots.length - 1; i >= 0; i--) {
      var d = dots[i], g = SB.Game.byId(game, d.id);
      if (!g || !g.alive || d.n <= 0) { dots.splice(i, 1); continue; }
      if (now < d.at) continue;
      d.at = now + 1.2; d.n--;
      burst("crumbs", g.x, (g.y || 0) + 0.6, g.z, 5, { col: [1, 0.55, 0.2] });
      hurt(game, g, 0.15, SB.Game.byId(game, d.by));
    }
  }
  F.burning = function (g) { return dots.some(function (d) { return d.id === g.id; }); };

  /* ---------------- hurting a grump ---------------- */
  function need(g) { return SB.Threats && SB.Threats.whacksNeeded ? SB.Threats.whacksNeeded(g) : 3; }
  // gone for good: the same as a smol's own third whack (possess.js attack, creature.js)
  function chase(game, g, c, how) {
    g.alive = false; g.gone = true; g.dying = false;
    burst("crumbs", g.x, (g.y || 0) + 0.5, g.z, 14, { col: [0.5, 0.3, 0.6] });
    if (!c || !c.alive) c = (P() && P().active && P().c) || SB.Game.smols(game)[0] || null;
    if (!c) return;
    if (!g.boss) SB.Game.note(game, how || (c.name + " chased a grump off for good! 🏏"));
    SB.bus.emit("grumpChased", { c: c, g: g });
  }
  function hurt(game, g, dmg, c, how) {
    if (!isGrump(g) || !(dmg > 0)) return false;
    g.whacked = (g.whacked || 0) + dmg;
    if (g.whacked < need(g)) return false;
    chase(game, g, c, how);
    return true;
  }
  F.hurt = hurt;
  F.aware = function (g, c) {
    if (!g || !c) return true;
    if (g._fSeen != null && now - g._fSeen < 8) return true;
    if (g.asleep) return false;
    if (g.scout) return g.scout.who === c.id && !g.scout.hold;
    return !!((g.attn && g.attn.type === "creature" && g.attn.id === c.id) || (g.action && g.action.target && g.action.target.type === "creature" && g.action.target.id === c.id));
  };

  // every hit a smol in your paws lands on a grump comes through here (ext.js "damage"): what it is multiplied by,
  // and what else it does. info: { hk, dmg } from possess.js, plus { power, ranged, fall, ammo } from F.strike
  F.last = null;
  F.onDamage = function (game, c, g, info) {
    var s = PS(c);
    F.last = null;
    if (!s || lesson(s) || !g || g.species !== "grump") return 1;
    info = info || {};
    var hk = info.hk, pr = prof(hk), sl = Sv().held(c), k = 1, notes = [], ranged = !!info.ranged, power = info.power || 0, lvl = lv(c, "fight");
    var am = ranged && info.ammo ? F.AMMO[info.ammo] || {} : {};
    if (sl && sl.k === hk && isTool(hk)) k *= F.QUAL[F.qualOf(sl)].dmg;
    if (F.style(c, 5) === (ranged ? "marksman" : "bruiser")) k *= 1.2;
    var cls = info.cls || (ranged ? am.cls || "shot" : pr.cls || "paw"); // paw, shot, light or tribe: each grows with its own skill
    if (!ranged) k *= 1 + 0.1 * F.rank(c, "hard") + F.gearSum(c, "melee");
    if (cls === "light") { k *= 1 + bonus(c, "light") + (F.rank(c, "dawn") ? 0.33 : 0); if (Bd) Bd.xp(c, "light", 1); }
    if (F.marked(g)) k *= F.MARK_HIT;
    if (power) { k *= F.POWER_MIN + (F.POWER_MAX - F.POWER_MIN) * power; notes.push(pr.reach ? "lunge" : info.sweep ? "sweep" : "big swing"); }
    if (ranged && info.fall != null) k *= info.fall;
    // from the shadows: the first hit on a grump that has not noticed you (crouched, or it is asleep)
    if ((F.sneaking(c) || g.asleep) && !F.aware(g, c)) { k *= Math.max(F.SNEAK_HIT, pr.sneak || 0, F.style(c, 10) === "trickster" ? 3 : 0); notes.push("sneak hit"); if (Bd) Bd.xp(c, "sneak", 2); }
    g._fSeen = now;
    if (!ranged && pr.slam && c.onGround === false) { k *= 1.5; notes.push("slam"); }
    var reel = F.staggered(g) || !!(g.boss && SB.Bosses && SB.Bosses.reeling(g));
    if (F.staggered(g)) k *= 1.5;
    var cc = F.CRIT + (pr.crit || 0) + (F.has(c, "eye") ? 0.1 : 0) + (F.style(c, 10) === "trickster" ? 0.1 : 0);
    var crit = dice(game) < cc;
    if (crit) { k *= F.has(c, "master") ? 2.5 : F.CRIT_MUL; notes.push("crit"); burst("crumbs", g.x, (g.y || 0) + 0.8, g.z, 10, { col: [1, 0.95, 0.5] }); }
    // what the blow does besides hurt
    var heavy = F.has(c, "heavy") ? 1.3 : 1, sg = (info.dmg || 0) * (ranged ? am.stg || 1 : pr.stg || 1) * (power ? 2 : 1) * heavy;
    if (sl && sl.px > 0 && !ranged) { sl.px--; sg += 2.5; notes.push("dizzy"); if (!sl.px) delete sl.px; }
    if (pr.flash) sg += 2;
    var off = ranged ? null : F.dual(c); // something light in the other paw: every second blow is its
    if (off && (lefty = !lefty)) { notes.push("both paws"); sg += 1; if (K[off].light && !g.boss && !F.burning(g)) { dots.push({ id: g.id, by: c.id, n: 3, at: now + 1.2 }); notes.push("singed"); } }
    if (F.addStagger(game, g, sg)) notes.push("staggered");
    if (!ranged) {
      shove(game, c, g, (pr.kb || 0.25) * (power ? 2 : 1) * heavy);
      if (s.swingT > 0) s.swingT *= (pr.sp || 1) * (F.has(c, "quick") ? 0.85 : 1) * (off ? 0.75 : 1);
      if (pr.burn && !g.boss && !F.burning(g)) { dots.push({ id: g.id, by: c.id, n: 3, at: now + 1.2 }); notes.push("singed"); }
    } else { // what the arrow was tipped with
      if (am.burn && !g.boss && !F.burning(g)) { dots.push({ id: g.id, by: c.id, n: 3, at: now + 1.2 }); notes.push("singed"); }
      if (am.slow && !g.boss) { slow(g, 8); notes.push("slowed"); }
      if (am.glow) { F.mark(game, c, g, true); notes.push("lit up"); }
    }
    if (reel) s.stam = Math.min(1, s.stam + 0.05); // a hit on a reeling grump gives a little pep back
    F.last = { k: k, crit: crit, notes: notes, power: power, ranged: ranged, cls: cls };
    if (notes.length) { s.fightSay = "💥 " + notes.join(" + ") + "!"; say(s.fightSay); }
    SB.bus.emit("fightHit", { c: c, g: g, k: k, crit: crit, notes: notes, cls: cls });
    maybeYield(game, c, g, (g.whacked || 0) + (info.dmg || 0) * k);
    return k;
  };

  // one blow of your own (a big swing, a long spear, an arrow). o: { power, ranged, dmg, fall, ammo, name, sweep }
  F.strike = function (game, c, g, o) {
    o = o || {};
    var Surv = Sv(), hk = Surv.heldKind(c), dmg = o.dmg != null ? o.dmg : dmgOf(hk);
    if (!g || !g.alive) return { ok: false };
    SB.Creature._hitFx(c, g, game);
    if (g.species !== "grump") return { ok: true, dmg: 0 };
    if (g.boss && SB.Bosses) { // a captain's hide turns anything too soft, arrows too
      var b = SB.Bosses.blocks(g, dmg, o.name || (isTool(hk) ? lab(hk) : null));
      if (b) { say(b); audio("bonk", 0.4); return { ok: true, bounced: true, msg: b, dmg: 0 }; }
    }
    if (!(dmg > 0)) { audio("bonk", 0.6); return { ok: true, dmg: 0 }; }
    SB.Chem.apply(g.chem, g.boss ? { pain: 0.05 } : { pain: 0.35 * dmg / (g.tough || 1), fear: 0.5 * dmg / (g.tough || 1) });
    var info = { hk: hk, dmg: dmg, power: o.power || 0, ranged: !!o.ranged, fall: o.fall, ammo: o.ammo, sweep: !!o.sweep, cls: o.cls };
    var mul = SB.Ext ? SB.Ext.damage(game, c, g, info) : F.onDamage(game, c, g, info);
    var total = dmg * mul * (1 + bonus(c, o.ranged ? "hunt" : "fight")) * (g.boss && SB.Bosses && SB.Bosses.reeling(g) ? SB.Bosses.REEL : 1);
    if (SB.Body) SB.Body.xp(c, "fight", 1);
    var boss = !!g.boss, gone = hurt(game, g, total, c);
    if (gone) { say(boss ? "it's down!" : "the grump runs off for good!"); if (!boss && (o.power || (F.last && F.last.crit) || F.rank(c, "bonk"))) lastBonk(game, c, g); } else { g.action = null; g.thinkT = 0; }
    audio("bonk", 0.8);
    return { ok: true, dmg: total, mul: mul, gone: gone };
  };
  function wearHeld(game, c) {
    var v = Sv().inv(c), sl = v.s[v.sel];
    if (!sl || !isTool(sl.k)) return;
    var nm = F.name(sl);
    if (Sv().wear(c, game, v.sel)) { audio("snap"); say("your " + nm + " broke!"); }
  }
  function reachOf(c, g, hk) { return SB.Creature.radius(c) + SB.Creature.radius(g) + 1.2 + (g.boss ? (P().BOSS_REACH || 0.9) : 0) + (prof(hk).reach || 0); }

  /* ---------------- swings: a tap, a held wind-up, a long spear ---------------- */
  var hold = 0, draw = null, tgtT = -9, cur = null;
  // the use button on a grump. baseGo is possess.js's own attack
  F.swing = function (game, c, g, baseGo) {
    var s = PS(c);
    if (!s || lesson(s)) return baseGo();
    var hk = Sv().heldKind(c), dmg = dmgOf(hk);
    if (dmg > 0 && hold > F.TAP && P().input.use) return false; // the button is held: you are winding up, not tapping
    var d = SB.dist(g.x, g.z, c.x, c.z), base = reachOf(c, g, null);
    if (prof(hk).reach && d > base && d <= reachOf(c, g, hk)) { // a spear lands where a paw would fall short
      if (s.swingT > 0) return false;
      s.swing = 1; s.swingT = P().SWING || 0.42; s.stam = Math.max(0, s.stam - 0.03);
      var r = F.strike(game, c, g, {});
      if (r.ok && !r.bounced) wearHeld(game, c);
      return true;
    }
    return baseGo();
  };
  // 4.46: what a button calls the grump in front of you. a captain by its name, a beast by its own ("the memory
  // echo", "the ring grump"), a plain one "the grump". the crosshair already said the name; the button said "grump"
  F.who = function (g) {
    if (!g) return "the grump";
    if (g.boss && g.name) return g.name;
    return g.name && g.name !== "grump" ? String(g.name).replace(/^an? /, "the ") : "the grump";
  };
  F.charge = function (c) {
    var s = PS(c);
    if (!s || !P().input.use || hold <= F.TAP || now - tgtT > 0.6) return 0;
    var hk = Sv().heldKind(c);
    if (F.RANGED[hk] || !(dmgOf(hk) > 0)) return 0;
    return SB.clamp((hold - F.TAP) / (F.WIND - F.TAP), 0, 1);
  };
  // let go of a held swing. held: how long the button was down
  F.release = function (game, c, held) {
    var s = PS(c);
    if (!s || lesson(s) || c.asleep) return null;
    var charge = SB.clamp((held - F.TAP) / (F.WIND - F.TAP), 0, 1);
    if (charge < F.MIN_CHARGE) return null;
    var hk = Sv().heldKind(c), pr = prof(hk);
    if (F.RANGED[hk] || !(dmgOf(hk) > 0)) return null;
    var t = P().look(game, c), r = t ? SB.Creature.resolve(game, t) : null, g = r && r.type === "creature" && isGrump(r.ref) ? r.ref : null;
    var cost = (F.POWER_PEP + (pr.pep || 0)) * pepMul(c);
    if (pr.beam && (!g || SB.dist(g.x, g.z, c.x, c.z) > reachOf(c, g, hk) + 0.2)) return sliver(game, c, s, charge, cost); // a crystal blade's big swing throws a sliver of light
    if (!g) return null; // nothing in front of you: the wind-up just relaxes
    if (s.stam < cost) { say("too puffed for a big swing. catch your breath"); return null; }
    var reach = reachOf(c, g, hk) + (pr.reach ? 0.7 : 0.2);
    s.swing = 1; s.swingT = (P().SWING || 0.42) * 1.4;
    if (SB.dist(g.x, g.z, c.x, c.z) > reach) { say("too far: get closer"); return null; }
    s.stam = Math.max(0, s.stam - cost);
    var res = F.strike(game, c, g, { power: charge }), swept = 0;
    if (pr.sweep || pr.whirl) { // a sword's big swing takes every grump in front of you. a flail's takes every grump around you
      var fa = Math.atan2(g.x - c.x, g.z - c.z);
      game.creatures.slice().forEach(function (o) {
        if (o === g || !isGrump(o) || o.heldBy || SB.dist(o.x, o.z, c.x, c.z) > reachOf(c, o, hk) + 0.4) return;
        if (!pr.whirl && Math.abs(SB.angDiff(fa, Math.atan2(o.x - c.x, o.z - c.z))) > 1.1) return;
        F.strike(game, c, o, { power: charge * 0.6, sweep: true }); swept++;
      });
    }
    if (res.ok && !res.bounced) wearHeld(game, c);
    res.charge = charge; res.swept = swept; res.power = true;
    SB.bus.emit("powerHit", { c: c, g: g, charge: charge, swept: swept });
    return res;
  };

  /* ---------------- bow and sling ---------------- */
  F.ammo = function (c, rw) { if (rw.self) return rw.self; for (var i = 0; i < rw.ammo.length; i++) if (K[rw.ammo[i]] && Sv().count(c, rw.ammo[i], true) > 0) return rw.ammo[i]; return null; };
  F.ammoN = function (c, rw) { var n = 0; if (rw.self) return 1; rw.ammo.forEach(function (k) { n += Sv().count(c, k, true); }); return n; };
  // far arrows fall: past rw.drop paces the crosshair has to sit a little above the target
  F.dropAt = function (rw, d) { return rw && rw.drop && d > rw.drop ? Math.min(0.12, 0.004 * (d - rw.drop) * (d - rw.drop)) : 0; };
  function eye(game, c) { var r = SB.Creature.radius(c), base = c.onGround === false && c.y != null ? c.y : gy(game, c.x, c.z); return base + r * (c.look && c.look.legs ? 2.1 + (c.look.legLen || 0) * 0.9 : 1.7) + 0.05; }
  function rangeOf(c, rw, pull) { return rw.range * (0.6 + 0.4 * pull) * (F.style(c, 5) === "marksman" ? 1.2 : 1); }
  // what the crosshair is on, out to range: { type: "grump" | "critter" | "dummy", ref, d } or null
  var aimC = null;
  F.aim = function (game, c, range, fresh) {
    var s = PS(c);
    if (!fresh && aimC && aimC.c === c.id && now - aimC.t < 0.1 && aimC.r === range) return aimC.v;
    var yaw = s ? s.yaw : c.facing + Math.PI, pitch = s ? s.pitch : 0, w = game.world, ex = c.x, ez = c.z, ey = eye(game, c);
    var fx = -Math.sin(yaw) * Math.cos(pitch), fy = Math.sin(pitch), fz = -Math.cos(yaw) * Math.cos(pitch), best = null, bs = 1e9;
    function consider(type, ref, x, y, z, r) {
      var dx = x - ex, dy = y - ey, dz = z - ez, d = Math.hypot(dx, dy, dz);
      if (d < 0.3 || d - r > range) return;
      var ang = Math.acos(SB.clamp((dx * fx + dy * fy + dz * fz) / d, -1, 1)), allow = (0.08 + Math.atan2(r, d)) * (type === "grump" && mark === ref.id ? 1.6 : 1); // a marked grump is easier to find
      if (ang > allow) return;
      var sc = ang / allow + d * 0.03;
      if (sc < bs) { bs = sc; best = { type: type, ref: ref, d: d }; }
    }
    game.creatures.forEach(function (o) { if (!isGrump(o) || o.heldBy) return; var r = SB.Creature.radius(o); consider("grump", o, o.x, gy(game, o.x, o.z) + r, o.z, r); });
    var its = w.items;
    for (var i = 0; i < its.length; i++) { var it = its[i]; if (it.gone || it.heldBy != null || !K[it.kind] || K[it.kind].critter !== "hop") continue; consider("critter", it, it.x, gy(game, it.x, it.z) + 0.2, it.z, 0.3); }
    var ss = w.structures;
    for (i = 0; i < ss.length; i++) if (ss[i].kind === "dummy") consider("dummy", ss[i], ss[i].x, gy(game, ss[i].x, ss[i].z) + 0.6, ss[i].z, 0.4);
    if (best) for (var k2 = 1; k2 < best.d - 1; k2 += 0.75) if (ey + fy * k2 < gy(game, ex + fx * k2, ez + fz * k2) - 0.35) { best = null; break; } // a hill in the way
    aimC = { c: c.id, t: now, r: range, v: best };
    return best;
  };
  // turn the view onto something (tests, and aim help)
  F.lookAt = function (game, c, o, up) {
    var s = PS(c); if (!s || !o) return;
    var dx = o.x - c.x, dz = o.z - c.z, ty = gy(game, o.x, o.z) + (up == null ? (o.type === "creature" ? SB.Creature.radius(o) : 0.3) : up);
    s.yaw = Math.atan2(-dx, -dz); s.pitch = Math.atan2(ty - eye(game, c), Math.hypot(dx, dz) || 0.001) + F.dropAt(F.RANGED[Sv().heldKind(c)], Math.hypot(dx, dz)) * 0.6; c.facing = s.yaw + Math.PI; aimC = null;
  };
  // the use button with a bow or sling in your paw: start the draw. it flies when you let go (a tap is a quick, weak shot)
  F.draw = function (game, c) {
    var s = PS(c);
    if (!s || draw || s.swingT > 0) return false;
    var rw = F.RANGED[Sv().heldKind(c)];
    if (!rw) return false;
    if (!F.ammo(c, rw)) { say(rw.none); return false; }
    body(c);
    if (rw.loaded || rw.self) return !!F.shoot(game, c, 1); // a crossbow is already drawn; a boomerang or a lens needs no draw
    draw = { t: 0, id: c.id };
    return true;
  };
  F.drawing = function () { return draw ? SB.clamp(draw.t / F.DRAW, 0, 1) : -1; };
  F.shoot = function (game, c, pull) {
    var s = PS(c), Surv = Sv(), hk = Surv.heldKind(c), rw = F.RANGED[hk];
    if (!s || !rw) return null;
    var ammo = F.ammo(c, rw);
    if (!ammo) { say(rw.none); return null; }
    if (rw.beam && !F.lit(game, c)) { say("no light to focus. wait for day, or stand by a fire"); return null; }
    pull = SB.clamp(pull == null || rw.loaded || rw.self ? 1 : pull, 0.35, 1);
    s.swing = 1; s.swingT = rw.cd; s.stam = Math.max(0, s.stam - 0.02);
    var kept = rw.self ? true : !!(SB.Body && SB.Body.roll(c, "hunt")); // a practised hunter wastes fewer
    if (!kept) Surv.take(c, ammo, 1);
    audio("tap", 0.7);
    var range = rangeOf(c, rw, pull), tg = F.aim(game, c, range, true), yaw = s.yaw, out = { ok: true, hit: false, ammo: ammo, kept: kept, pull: pull, target: tg ? tg.type : null };
    function land(x, z, odds) { if (!kept && dice(game) < odds && SB.World.walkable(game.world, x, z)) { Surv.spawn(game, ammo, 1, x, z, {}); out.left = true; } }
    if (!tg) { land(c.x - Math.sin(yaw) * Math.min(range, 7), c.z - Math.cos(yaw) * Math.min(range, 7), 0.5); SB.bus.emit("shot", { c: c, kind: hk, ammo: ammo, hit: false }); wearHeld(game, c); return out; }
    var d = tg.d, far = d <= rw.full ? 0 : Math.min(1, (d - rw.full) / Math.max(0.1, range - rw.full));
    // close is certain. far shots can go wide: hunting skill, a full draw and a crouch steady the paw
    var odds = 1 - 0.45 * far + (far > 0 ? bonus(c, "hunt") * 0.6 + (F.sneaking(c) ? 0.1 : 0) + (F.style(c, 5) === "marksman" ? 0.1 : 0) - (1 - pull) * 0.25 : 0);
    odds += 0.1 * F.rank(c, "steady");
    if (rw.beam || F.mastered(c, "fletch")) odds = 2; // light does not miss, and neither does a master
    out.odds = odds; out.d = d;
    var ref = tg.ref, up = F.dropAt(rw, d), short = false;
    if (up > 0 && odds < 2) { // the arrow falls on the way
      var cy = gy(game, ref.x, ref.z) + (tg.type === "grump" ? SB.Creature.radius(ref) : tg.type === "critter" ? 0.2 : 0.6);
      short = (s.pitch || 0) - Math.atan2(cy - eye(game, c), Math.hypot(ref.x - c.x, ref.z - c.z) || 0.001) < up * 0.5 - 0.03;
    }
    arc(game, c, ref.x, ref.z);
    if (short || dice(game) > odds) {
      land(ref.x + Math.sin(yaw) * -1.5, ref.z + Math.cos(yaw) * -1.5, 0.5);
      if (tg.type === "critter") ref.data.flee = 2;
      out.short = short;
      if (!strayShot(game, c, ref)) say(short ? "it dropped short. far shots fall: aim a little above" : "wide! a full draw and a steady paw land more");
      if (SB.Body) SB.Body.xp(c, "hunt", 1);
      SB.bus.emit("shot", { c: c, kind: hk, ammo: ammo, hit: false, target: tg.type });
      wearHeld(game, c);
      return out;
    }
    out.hit = true;
    var fall = (1 - 0.6 * far) * (0.55 + 0.45 * pull);
    if (tg.type === "grump") {
      var res = F.strike(game, c, ref, { ranged: true, dmg: F.AMMO[ammo].dmg, fall: fall, ammo: ammo, name: lab(ammo) });
      out.dmg = res.dmg; out.bounced = !!res.bounced; out.gone = !!res.gone; out.fall = fall;
      if (SB.Body) SB.Body.xp(c, "hunt", 1);
    } else if (tg.type === "critter") {
      var x = ref.x, z = ref.z;
      SB.World.remove(game.world, ref);
      Surv.spawn(game, "meat", 1, x, z, { by: c.id });
      if (dice(game) < 0.6) Surv.spawn(game, "fur", 1, x + 0.3, z, { by: c.id });
      SB.bus.emit("hunt", { c: c, bow: true });
      say("got it! a clean shot");
    } else {
      if (lv(c, "hunt") < F.DUMMY_MAX && SB.Body) { SB.Body.xp(c, "hunt", 1); say("thunk. right in the straw"); } else say("thunk. the dummy has nothing more to teach your aim");
      audio("bonk", 0.4);
    }
    land(ref.x + 0.3, ref.z + 0.2, ammo === "stone" ? 0.7 : 0.5);
    SB.bus.emit("shot", { c: c, kind: hk, ammo: ammo, hit: true, target: tg.type, d: d });
    wearHeld(game, c);
    return out;
  };

  /* ---------------- sneaking ---------------- */
  var sneak = null, snT = 0;
  F.sneaking = function (c) { return !!(sneak && c && sneak === c.id); };
  F.setSneak = function (game, c, on) {
    var s = PS(c); if (!s) return false;
    on = on == null ? !F.sneaking(c) : !!on;
    if (on === F.sneaking(c)) return on;
    body(c);
    sneak = on ? c.id : null;
    say(on ? "🤫 you crouch low. grumps lose you unless you're close, and your first hit from the shadows counts double. you move slowly" : "you stand up");
    SB.bus.emit("sneak", { c: c, on: on });
    return on;
  };
  F.sneakSpeed = function (c) { return lv(c, "hunt") >= 3 ? 0.7 : F.SNEAK_SPEED; };
  F.sneakSee = function (c) { return F.SNEAK_SEE * (lv(c, "hunt") >= 6 ? 0.75 : 1) * (1 - bonus(c, "sneak") * 0.6) * (F.gearSum(c, "quiet") ? 0.75 : 1) * (F.rank(c, "tiny") ? 0.6 : 1); };
  function sneakTick(game, c, s) {
    var see = F.sneakSee(c);
    game.creatures.forEach(function (g) {
      if (!isGrump(g) || g.scout || g.boss || g.heldBy || g.goingHome) return;
      var d = SB.dist(g.x, g.z, c.x, c.z);
      if (d <= see || d > 16 || (g._fSeen != null && now - g._fSeen < 8)) return;
      if (!F.aware(g, c)) return;
      g.attn = null; g.action = null; // it loses you, and goes to sniff where you were
      if (!pins.some(function (p) { return p.id === g.id; })) pin(g, { until: now + 4, search: true, sx: c.x, sz: c.z });
      SB.bus.emit("lostYou", { c: c, g: g });
    });
    var its = game.world.items;
    for (var i = 0; i < its.length; i++) { // a bunny does not bolt from a smol it has not noticed
      var it = its[i];
      if (it.gone || !K[it.kind] || K[it.kind].critter !== "hop" || it.data.flee > 0) continue;
      var dd = SB.dist(it.x, it.z, c.x, c.z);
      if (dd < 6 && dd > 1.5) it.data.t = Math.max(it.data.t || 0, 0.6);
    }
  }

  /* ---------------- guard ---------------- */
  var guard = 0, hp0 = null, pain0 = 0, lx = 0, lz = 0, lastBiter = null;
  F.shieldAt = function (c) { var v = c && c.inv && c.inv.s; if (!v) return -1; for (var i = 0; i < v.length; i++) if (v[i] && v[i].k === "shield") return i; return -1; };
  F.guarding = function (c) { return !!(c && cur === c.id && guard > now); };
  F.guardShare = function (c) {
    var i = F.shieldAt(c), sh = i < 0 ? F.GUARD_BARE : F.GUARD_SHIELD + (F.qualOf(c.inv.s[i]) - 1) * 0.05;
    return Math.min(0.8, sh + (F.style(c, 10) === "guardian" ? 0.15 : 0));
  };
  F.brace = function (game, c) {
    var s = PS(c);
    if (!s || c.asleep) return false;
    if (s.stam < 0.05) { say("too puffed to hold a guard"); return false; }
    body(c);
    var was = F.guarding(c);
    guard = now + F.GUARD_T;
    if (!was) { say(F.shieldAt(c) >= 0 ? "🛡 shield up! the next bites cost about half" : "🛡 you brace. a bite will cost less (a shield stops more)"); SB.bus.emit("guard", { c: c }); }
    return true;
  };
  // a sudden hurt with a grump about: your guard, and a thick hide, give part of it back
  function guardTick(game, c, s) {
    var ch = c.chem, h = ch.health;
    if (hp0 != null && h < hp0 - 0.02 && h > 0) {
      var near = false, drop = hp0 - h;
      game.creatures.forEach(function (g) { if (isGrump(g) && SB.dist(g.x, g.z, c.x, c.z) < 7) near = true; });
      var d0 = drop;
      if (near) { drop = soften(game, c, s, drop); if (drop < d0) ch.health = h = Math.min(1, h + (d0 - drop)); } // a side-hop, cover, what you wear, spare hearts
      if (near && drop > 0) {
        if (F.has(c, "hide")) ch.health = h = Math.min(1, h + drop * 0.1);
        if (F.guarding(c)) {
          var cost = F.GUARD_PEP * pepMul(c) * (F.style(c, 10) === "guardian" ? 0.5 : 1), share = F.guardShare(c), si = F.shieldAt(c);
          if (s.stam >= cost * 0.5) {
            s.stam = Math.max(0, s.stam - cost);
            var saved = drop * share;
            ch.health = h = Math.min(1, h + saved);
            var moved = Math.hypot(c.x - lx, c.z - lz); // a shield also takes half the shove
            if (si >= 0 && moved > 1.5) { var bx = lx + (c.x - lx) * 0.5, bz = lz + (c.z - lz) * 0.5; if (SB.World.walkable(game.world, bx, bz)) { c.x = bx; c.z = bz; } }
            var big = !!(lastBiter && lastBiter.boss && now - lastBiter.t < 0.5), broke = si >= 0 && Sv().wear(c, game, si);
            if (big) guard = 0; // a captain's bite knocks your guard down
            say("🛡 blocked! that bite cost " + Math.round(share * 100) + "% less" + (big ? ". it knocked your guard down: brace again" : "") + (broke ? ". your shield broke!" : ""));
            audio("bonk", 0.5);
            SB.bus.emit("blocked", { c: c, drop: drop, saved: saved, guardDown: big });
          } else { guard = 0; say("too puffed to hold your guard"); }
        }
      }
    }
    var pn = ch.pain || 0;
    if (F.guarding(c) && pn > pain0 + 0.1) ch.pain = pn = pn - (pn - pain0) * F.guardShare(c);
    hp0 = h; pain0 = pn;
  }

  /* ---------------- traps and the dummy ---------------- */
  function haveOf(c, key) { var n = 0; key.split("|").forEach(function (k) { n += Sv().count(c, k, k !== "stick"); }); return n; }
  function lacks(c, cost) { var out = []; for (var k in cost) { var h = haveOf(c, k); if (h < cost[k]) out.push((cost[k] - h) + " " + words(k)); } return out; }
  function pay(c, cost) {
    Object.keys(cost).forEach(function (key) {
      var n = cost[key];
      key.split("|").forEach(function (k) { if (n > 0) n -= Sv().take(c, k, Math.min(n, Sv().count(c, k, k !== "stick"))).length; });
    });
  }
  function costText(cost) { return Object.keys(cost).map(function (k) { return cost[k] + " " + words(k); }).join(", "); }
  F.isTrap = function (b) { return !!(b && (b.kind === "snare" || b.kind === "pittrap")); };
  F.traps = function (game) { return game.world.structures.filter(function (b) { return F.isTrap(b) || b.kind === "dummy"; }); };
  // put one down where you are looking (or just in front of you)
  F.setTrap = function (game, c, kindOf) {
    var T = F.TRAPS[kindOf], s = PS(c), w = game.world;
    if (!T || !SK[kindOf]) return { ok: false, msg: "that's not a trap" };
    if (c.tier < T.tier) return { ok: false, msg: "you need hands for that" };
    var miss = lacks(c, T.cost);
    if (miss.length) return { ok: false, msg: "missing " + miss.join(", ") };
    var ag = s && P().aimGround ? P().aimGround(game, c, 4) : null, yaw = s ? s.yaw : c.facing + Math.PI;
    var x = ag && !ag.far ? ag.x : c.x - Math.sin(yaw) * 1.4, z = ag && !ag.far ? ag.z : c.z - Math.cos(yaw) * 1.4;
    if (SB.dist(x, z, c.x, c.z) < 0.9) { x = c.x - Math.sin(yaw) * 1.2; z = c.z - Math.cos(yaw) * 1.2; }
    if (!SB.World.walkable(w, x, z, false) || SB.World.depthAt(w, x, z) > 0.05) return { ok: false, msg: "not here: find dry, flat ground" };
    if (SB.World.structsNear(w, x, z, 1.1).length) return { ok: false, msg: "too close to something else" };
    pay(c, T.cost);
    var b = { id: SB.Game.newId(game), type: "struct", kind: kindOf, noun: SK[kindOf].noun, x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, rot: Math.round(yaw * 100) / 100, s: 1,
      done: true, work: 0, need: {}, tribe: c.tribe || 0, builders: [], data: { trap: 1, armed: 1, by: c.id }, born: game.time, name: null };
    w.structures.push(b);
    if (SB.World.markNode) SB.World.markNode(w, b);
    trapT = 0;
    SB.bus.emit("trapSet", { c: c, st: b, kind: kindOf });
    return { ok: true, st: b, msg: kindOf === "dummy" ? "🎯 a practice dummy. whack it, or shoot it from a way off" : F.SEN[kindOf] ? SK[kindOf].emoji + " the " + SK[kindOf].label + " stands watch" + (kindOf === "flinger" ? ". look at it and load it with logs" : "") : kindOf === "guardpost" ? "🛡 the guard post is up. look at it for today's bounty" : kindOf === "crystaltree" ? "💎 the seed takes: a crystal tree. tap it once a day" : SK[kindOf].emoji + " the " + SK[kindOf].label + " is set. a grump that walks over it is in trouble" };
  };
  F.takeDown = function (game, c, b) {
    if (!b || !F.TRAPS[b.kind] || game.world.structures.indexOf(b) < 0) return false;
    SB.World.removeStructure(game.world, b);
    var back = b.kind === "snare" ? "vine" : "stick";
    if (Sv().add(c, back, 1)) Sv().spawn(game, back, 1, b.x, b.z, {});
    say("you take the " + SK[b.kind].label + " down");
    return true;
  };
  F.rearm = function (game, c, b) {
    if (!b || b.kind !== "pittrap" || b.data.armed) return false;
    if (haveOf(c, "leaves") < 2) { say("covering the pit again takes 2 leaves"); return false; }
    Sv().take(c, "leaves", 2); b.data.armed = 1;
    say("🕳 covered over. the pit is set again"); audio("build", 0.6);
    return true;
  };
  function spring(game, b, g) {
    var s = st(game), owner = SB.Game.byId(game, b.data.by), mine = PS() && SB.dist(PS().c.x, PS().c.z, b.x, b.z) < 25;
    s.caught = (s.caught || 0) + 1;
    g._fSeen = now;
    if (b.kind === "snare") {
      pin(g, { until: now + F.SNARE_HOLD * (1 + bonus(owner, "logic")), x: b.x, z: b.z });
      if (owner && owner.alive && Bd) Bd.xp(owner, "logic", 2); // a trap that works is a puzzle solved
      SB.World.removeStructure(game.world, b);
      if (dice(game) < 0.5) Sv().spawn(game, "vine", 1, b.x + 0.4, b.z, {});
      if (mine) say("🪤 the snare has a grump by the foot! it can't move for a bit");
    } else {
      pin(g, { until: now + F.PIT_HOLD, x: b.x, z: b.z });
      b.data.armed = 0;
      if (mine) say("🕳 a grump fell in the pit! it's stuck, and sorry");
      hurt(game, g, F.PIT_DMG, owner && owner.alive ? owner : null, "a grump fell in a pit trap and ran off for good! 🕳");
    }
    burst("leaves", b.x, gy(game, b.x, b.z) + 0.3, b.z, 12);
    audio("snap", 0.7);
    SB.bus.emit("trapSprung", { st: b, g: g, kind: b.kind });
  }
  var trapT = 0, trapList = [], listT = 0;
  function trapTick(game) {
    if ((listT -= 0.25) <= 0 || trapT === 0) { listT = 1.5; trapList = game.world.structures.filter(F.isTrap); }
    trapT = 1;
    if (!trapList.length) return;
    var gs = null;
    for (var i = 0; i < trapList.length; i++) {
      var b = trapList[i];
      if (!b.data || !b.data.armed) continue;
      if (!gs) gs = game.creatures.filter(function (o) { return isGrump(o) && !o.boss && !o.heldBy && !tut(o); });
      for (var j = 0; j < gs.length; j++) if (gs[j].alive && SB.dist(gs[j].x, gs[j].z, b.x, b.z) < 0.95 && !pinned(gs[j])) { spring(game, b, gs[j]); listT = 0; break; }
    }
  }
  F.train = function (game, c, b) {
    var s = PS(c);
    if (!s || s.swingT > 0) return false;
    s.swing = 1; s.swingT = P().SWING || 0.42; s.stam = Math.max(0, s.stam - 0.03);
    audio("bonk", 0.5);
    if (lv(c, "fight") < F.DUMMY_MAX && SB.Body) SB.Body.xp(c, "fight", 1);
    else if (!s.dummySaid) { s.dummySaid = true; say("the dummy has nothing more to teach you. find a real grump"); }
    SB.bus.emit("trained", { c: c, st: b });
    return true;
  };

  /* ---------------- making things ---------------- */
  F.recipe = function (id) { for (var i = 0; i < F.RECIPES.length; i++) if (F.RECIPES[i].id === id) return F.RECIPES[i]; return null; };
  var making = false;
  F.make = function (game, c, id) {
    var rc = F.recipe(id), Surv = Sv();
    if (!rc || !K[rc.out]) return { ok: false, msg: "that's not a recipe" };
    if (c.tier < rc.tier) return { ok: false, msg: "your paws can't manage that yet (" + SB.TIERS[rc.tier].name + "s can)" };
    var miss = lacks(c, rc.cost);
    if (miss.length) return { ok: false, msg: "missing " + miss.join(", ") };
    pay(c, rc.cost);
    var q = -1, w, nm = (rc.n > 1 ? rc.n + " " : "a ") + lab(rc.out) + (rc.n > 1 ? "s" : "");
    if (isTool(rc.out)) { q = F.rollQual(game, c); if (F.mastered(c, "maker")) q = Math.min(3, q + 1); w = F.wearFor(rc.out, q); nm = "a " + (q !== 1 ? F.QUAL[q].id + " " : "") + lab(rc.out); }
    var left = Surv.add(c, rc.out, rc.n, w);
    if (left > 0) Surv.spawn(game, rc.out, left, c.x + Math.sin(c.facing) * 0.5, c.z + Math.cos(c.facing) * 0.5, { by: c.id, w: w });
    if (c.stats) c.stats.crafted = (c.stats.crafted || 0) + 1;
    making = true;
    try { SB.bus.emit("craft", { c: c, id: rc.id, item: { kind: rc.out }, pov: true, fight: true }); } finally { making = false; }
    if (q >= 0) SB.bus.emit("quality", { c: c, kind: rc.out, q: q, name: nm });
    return { ok: true, out: rc.out, n: rc.n, q: q, msg: "made " + nm + (q === 3 ? ". a masterwork!" : q === 0 ? ". a bit wonky: more crafting makes better ones" : "") };
  };
  // rub a red shroom on what you hold: the next few hits make a grump dizzy
  F.rub = function (game, c) {
    var sl = Sv().held(c);
    if (!sl || !isTool(sl.k) || !(dmgOf(sl.k) > 0)) return { ok: false, msg: "hold a weapon first" };
    if (!Sv().count(c, "shroom", true)) return { ok: false, msg: "you need a red shroom" };
    Sv().take(c, "shroom", 1); sl.px = 5;
    return { ok: true, msg: "🍄 red shroom on your " + F.name(sl) + ": the next 5 hits make a grump dizzy" };
  };

  /* ---------------- the frame ---------------- */
  var tT = 0;
  function reset() { hold = 0; draw = null; sneak = null; guard = 0; hp0 = null; cur = null; aimC = null; iT = 0; dodgeT = 0; flareChk = false; dashT = 0; flashT = 0; moveT = 0; sleepT = 0; lastY = null; wasAir = false; endSlow(); }
  // a new body: nothing carries over from the last one
  function body(c) { if (cur === c.id) return; reset(); cur = c.id; lx = c.x; lz = c.z; hp0 = c.chem.health; pain0 = c.chem.pain || 0; }
  F.tick = function (game, dt) {
    if (!game || game.offline || !game.world) return;
    now += dt;
    if (pins.length) tickPins(game, dt);
    if (slowEnd && Date.now() >= slowEnd) endSlow();
    else if (!slowG && game.speed === F.SLOWMO) game.speed = 1; // (a save caught mid slow-motion)
    if (slows.length) tickSlows(game);
    if ((tT -= dt) <= 0) { tT = 0.25; trapTick(game); senTick(game); if (clouds.length) cloudTick(game); if (dots.length) tickDots(game); }
    if ((t2 -= dt) <= 0) { t2 = 2; slowTick(game); }
    var s = PS(), c = s ? s.c : null;
    if (!c || !c.alive || s.game !== game) { if (cur != null || sneak != null) reset(); return; }
    body(c);
    growTick(game, c, s, dt);
    if (s.madeSay) { say(s.madeSay); s.madeSay = null; } // (a frame after "made a spear", so it is the line you read)
    if (lesson(s)) { hp0 = c.chem.health; lx = c.x; lz = c.z; return; }
    var use = !!P().input.use, hk = Sv().heldKind(c);
    // the bow: drawn while the button is down, loosed when it comes up
    if (draw) {
      if (draw.id !== c.id || !F.RANGED[hk]) draw = null;
      else if (use) { draw.t += dt; s.swing = Math.max(s.swing || 0, 0.45); if (draw.t >= F.DRAW && !draw.slow && F.rank(c, "slowaim")) { draw.slow = 1; slowmo(game, 1.2); } }
      else { var pull = draw.t / F.DRAW; draw = null; F.shoot(game, c, pull); }
    }
    // a held swing: winds up while the button is down, lands when it comes up
    if (use) { hold += dt; if (F.charge(c) > 0) s.swing = Math.max(s.swing || 0, 0.3 + 0.3 * F.charge(c)); }
    else { var held = hold; hold = 0; if (held > F.TAP) F.release(game, c, held); }
    // crouched: slow, and no running
    if (F.sneaking(c) && s.running) F.setSneak(game, c, false);
    var k = (F.sneaking(c) ? F.sneakSpeed(c) : 1) * F.speedMul(c), mv = Math.hypot(c.x - lx, c.z - lz); // crouched, or in heavy copper, or snug in fur
    if (k !== 1 && mv > 1e-5 && mv < 1.5) { var nx = lx + (c.x - lx) * k, nz = lz + (c.z - lz) * k; if (SB.World.walkable(game.world, nx, nz, true)) { c.x = nx; c.z = nz; } }
    if (F.sneaking(c)) {
      {
        if (s.darkT > 0) s.darkT = Math.max(0, s.darkT - dt * 0.5); // the prowler takes twice as long to find a creeping smol
        if ((snT -= dt) <= 0) { snT = 0.3; sneakTick(game, c, s); }
      }
    }
    guardTick(game, c, s);
    lx = c.x; lz = c.z;
  };

  /* ---------------- what the buttons do ---------------- */
  F.options = function (game, c, r, o, x) {
    var s = x && x.state;
    if (!s || s.c !== c || s.ghost || lesson(s)) return;
    var Surv = Sv(), sl = Surv.held(c), hk = sl ? sl.k : null, rw = F.RANGED[hk];
    var g = r && r.type === "creature" && r.ref.species === "grump" ? r.ref : null;
    if (g) tgtT = now;
    // a bow or a sling in your paw: the use button shoots, at whatever the crosshair is on
    var shootable = !r || g || r.type === "water" || (r.type === "creature" && r.ref.species !== "smol") || r.type === "node" || (r.type === "item" && K[r.kind] && K[r.kind].critter) || (r.type === "struct" && r.kind === "dummy");
    if (rw && c.tier >= (rw.tier || 2) && shootable) {
      if (!F.ammo(c, rw)) o.use = x.no(rw.none);
      else {
        var tg = F.aim(game, c, rangeOf(c, rw, 1)), what = !tg ? null : tg.type === "grump" ? F.who(tg.ref) : tg.type === "critter" ? "the " + lab(tg.ref.kind) : "the dummy";
        o.use = x.op(rw.act ? rw.act + (what ? " at " + what : "") : (hk === "sling" ? (what ? "sling a stone at " + what : "sling a stone") : (what ? "shoot " + what : "loose an arrow")) + " (" + F.ammoN(c, rw) + ")", function () { return F.draw(game, c); }, null);
      }
    } else if (F.POTS[hk] && shootable) o.use = x.op("throw the " + lab(hk), function () { return !!F.lob(game, c); }, null);
    else if (hk === "arkflare" && shootable) o.use = x.op("fire the ark flare", function () { return F.flare(game, c).ok; }, null);
    else if (hk === "musk" && shootable) o.use = x.op("open the dark lure", function () { return F.musk(game, c).ok; }, null);
    else if (hk === "horn" && shootable && F.aimGrump(game, c, 16)) o.use = x.op("blow your horn at the grump", function () { var t = F.aimGrump(game, c, 16, true); return !!(t && F.mark(game, c, t)); }, null);
    else if (hk === "stone" && !r && F.sneaking(c) && nearestGrump(game, c, 12)) o.use = x.op("toss the stone past the grump", function () { var q = F.distract(game, c); if (q.msg) say(q.msg); return q.ok; }, null);
    else if (hk === "spear" && !r && F.farGrump(game, c, 8)) o.use = x.op("throw your spear at the grump", function () { return !!F.throwSpear(game, c); }, null);
    else if (g && !isTool(hk) && F.rank(c, "nip")) o.use = x.op("nip the grump", function () { return F.nip(game, c, g); }, null);
    else if (g && o.use && !o.use.locked) {
      var base = o.use, who = F.who(g);
      o.use = x.op("hit " + who + (isTool(hk) ? " with your " + F.name(sl) : ""), function () { return F.swing(game, c, g, base.go); }, base.verb);
    }
    // 4.46: with a club or a pick in the paw the second button was "put down the club" even face to face with a grump,
    // so a shield could only be raised with empty paws, and a press meant for it dropped the weapon. Q still drops
    var freeP = !o.place || o.place.fbrace || /^put down/.test(o.place.label || "");
    if (g && F.guarding(c) && F.shieldAt(c) >= 0 && freeP) o.place = x.op("bash with your shield", function () { return !!F.bash(game, c, g).ok; }, null);
    else if (g && F.lightIn(c) && F.flashReady(c) && freeP) o.place = x.op("flash your light", function () { return !!F.flash(game, c).ok; }, null);
    else if (g && (!o.place || /^put down/.test(o.place.label || ""))) o.place = x.op(F.guarding(c) ? "hold your guard" : F.shieldAt(c) >= 0 ? "raise your shield" : "brace for the bite", function () { return F.brace(game, c); }, null, { fbrace: 1 });
    if (g && !o.pick) o.pick = x.op("hop aside", function () { return !!F.dash(game, c).ok; }, null);
    if (r && r.type === "struct" && r.kind === "totem" && r.ref.done && !o.pick && !F.hasRead(c, "t" + r.ref.id)) o.pick = x.op("study the carvings", function () { return !!F.study(game, c, "t" + r.ref.id).ok; }, null);
    if (r && r.type === "struct" && F.TRAPS[r.kind]) {
      var b = r.ref;
      if (b.kind === "dummy") { if (!rw) o.use = x.op("whack the practice dummy", function () { return F.train(game, c, b); }, null); }
      else if (b.kind === "pittrap" && !b.data.armed) o.use = x.op("cover the pit again (2 leaves)", function () { return F.rearm(game, c, b); }, null);
      else if (b.kind === "flinger") o.use = (b.data.logs || 0) < F.SEN.flinger.max && Sv().count(c, "log", true) ? x.op("load a log (" + (b.data.logs || 0) + "/" + F.SEN.flinger.max + ")", function () { return F.loadFlinger(game, c, b); }, null) : x.no("the log flinger: " + (b.data.logs || 0) + " logs loaded" + (b.data.logs ? "" : ". it needs logs"));
      else if (b.kind === "guardpost") o.use = x.op(F.bountyText(game), function () { var q = F.claim(game, c); say(q.msg); return q.ok; }, null);
      else if (b.kind === "crystaltree") o.use = b.data.sap === day(game) ? x.no("the crystal tree. tapped for today") : x.op("tap the crystal tree for thought sap", function () { return !!F.tap(game, c, b).ok; }, null);
      else o.use = x.no("a " + SK[b.kind].label + (F.SEN[b.kind] ? ", keeping watch" : ", set and waiting"));
      o.place = x.op("take the " + SK[b.kind].label + " down", function () { return F.takeDown(game, c, b); }, null);
    }
    if (!r && !o.place) o.place = x.op(F.sneaking(c) ? "stand up" : "crouch and sneak", function () { F.setSneak(game, c); return true; }, null);
  };
  F.key = function (game, c, key, down) {
    var s = PS(c);
    if (!s || !down || lesson(s)) return false;
    if (key === "x") { F.setSneak(game, c); return true; }
    if (key === "v") { F.brace(game, c); return true; }
    if (key === "h") { F.dash(game, c); return true; }
    if (key === "l" && F.lightIn(c)) { var fl = F.flash(game, c); if (fl.msg) say(fl.msg); return true; }
    if (key === "m") { var mk = F.doIt(game, c, "mark"); if (mk.msg) say(mk.msg); return true; }
    if (key === "n" && F.setOf(c)) { var sm = F.setMove(game, c); if (sm.msg) say(sm.msg); return true; }
    return false;
  };
  F.vitals = function (game, c) {
    var s = PS(c), out = [];
    if (!s) return out;
    if (F.sneaking(c)) out.push({ icon: "🤫", text: "sneaking", tip: "grumps lose you unless you're close. your first hit from the shadows counts double" });
    if (F.guarding(c)) out.push({ icon: "🛡", text: "guard up", tip: "the next bites cost less, for a little pep" });
    var ch = F.charge(c);
    if (ch > 0) out.push({ icon: "💪", text: ch >= 1 ? "big swing ready" : "winding up", tip: "let go to swing" });
    var hk = Sv().heldKind(c), rw = F.RANGED[hk];
    var sp = F.spare(c), cap = F.spareCap(c);
    if (cap > 0) out.push({ icon: "💛", text: Math.round(sp / F.HEART) + " spare", tip: "spare hearts take a bite before your own do. they come back when you rest" });
    if (F.inCover(game, c)) out.push({ icon: "🪨", text: "in cover", tip: "crouched or braced beside something solid: bites cost a quarter less" });
    if (rw && !rw.self) { var n = F.ammoN(c, rw); out.push({ icon: hk === "bow" ? "🏹" : "🪢", text: (draw ? (draw.t >= F.DRAW ? "full draw · " : "drawing · ") : "") + n + " " + rw.word + (n === 1 ? "" : "s"), bad: n === 0, tip: "hold to draw, let go to shoot" }); }
    return out;
  };
  F.nextTier = function (game) { var s = st(game); for (var i = 0; i < F.TIERS.length; i++) if (!s.tiers[F.TIERS[i][0]]) return F.TIERS[i]; return null; };
  F.goals = function (game, add) {
    var s = st(game), t = F.nextTier(game);
    if (!s.chased || !t) return;
    add("chase off " + t[0] + " grumps with your own paws", s.chased + "/" + t[0], false);
  };

  /* ---------------- the bus ---------------- */
  var hooked = false;
  F.hook = function () {
    if (hooked || !SB.bus) return; hooked = true;
    function game0() { return SB.Game && SB.Game.current; }
    // a tool made by the ordinary recipes gets its quality too
    SB.bus.on("craft", function (d) {
      var game = game0();
      if (making || !game || !d || !d.pov || !d.c || !d.c._pov || !d.item || !isTool(d.item.kind)) return;
      var q = stampFresh(game, d.c, d.item.kind), s = PS(d.c);
      if (q >= 0 && q !== 1 && s) s.madeSay = "🛠 a " + F.QUAL[q].id + " " + lab(d.item.kind) + (q === 0 ? ". it won't last as long: more crafting makes better ones" : "! it lasts longer, and a weapon hits harder");
    });
    SB.bus.on("scoutHit", function (d) { if (d && d.g) lastBiter = { boss: !!d.g.boss, t: now }; });
    SB.bus.on("skillUp", function (d) {
      if (!d || d.id !== "fight" || !PS(d.c)) return;
      var pk = null; F.PERKS.forEach(function (p) { if (p.lv === d.level) pk = p; });
      if (pk) say("⭐ fighting level " + d.level + "! new perk: " + pk.name + " (" + pk.text + ")");
      else if (F.STYLES[d.level]) say("⭐ fighting level " + d.level + "! pick a fighting style in your bag's fight tab");
    });
    SB.bus.on("grumpChased", function (d) {
      var game = game0();
      if (!game || game.offline || !d || !d.g || !d.c || !d.c._pov) return;
      var s = st(game);
      s.chased = (s.chased || 0) + 1;
      if (!d.g.boss && Sv() && Sv().spawn && K.tooth && dice(game) < F.TOOTH) { Sv().spawn(game, "tooth", 1, d.g.x + 0.3, d.g.z, {}); SB.bus.emit("grumpDrop", { c: d.c, g: d.g, kind: "tooth", rar: 0 }); }
      F.TIERS.forEach(function (t) {
        if (s.chased < t[0] || s.tiers[t[0]]) return;
        s.tiers[t[0]] = day(game);
        if (SB.Game.addSparks) SB.Game.addSparks(game, t[1], d.c);
        SB.Game.note(game, "🏅 " + d.c.name + " has chased off " + t[0] + " grumps: a " + t[2] + "! +" + t[1] + " ✨");
        SB.bus.emit("fightTier", { c: d.c, n: t[0], title: t[2], sparks: t[1] });
      });
    });
  };
  F.hook();
  if (SB.Ext) {
    SB.Ext.on("tick", function (game, dt) { F.tick(game, dt); });
    SB.Ext.on("options", function (game, c, r, o, x) { F.options(game, c, r, o, x); });
    SB.Ext.on("damage", function (game, c, g, info) { return F.onDamage(game, c, g, info); });
    SB.Ext.on("key", function (game, c, key, down) { return F.key(game, c, key, down); });
    SB.Ext.on("vitals", function (game, c) { return F.vitals(game, c); });
    SB.Ext.on("goals", function (game, add) { F.goals(game, add); });
  }

  /* ---------------- the bag's "fight" tab ---------------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]; }); }
  F.html = function (game, c, icon) {
    icon = icon || function () { return ""; };
    var Surv = Sv(), sl = Surv.held(c), l = lv(c, "fight"), out = "", s = st(game);
    out += "<div class='lbl'>how you fight</div><div class='row' style='display:flex;flex-wrap:wrap;gap:4px'><button class='btn" + (F.sneaking(c) ? " go" : "") + "' data-fsneak='1'>🤫 " + (F.sneaking(c) ? "stand up" : "crouch and sneak") + "</button><button class='btn' data-fbrace='1'>🛡 " + (F.shieldAt(c) >= 0 ? "raise your shield" : "brace") + "</button></div>";
    out += "<div class='help'>hold the use button on a grump to wind up a big swing, and let go. with a bow, hold to draw.</div>";
    if (sl && isTool(sl.k)) {
      var pr = prof(sl.k), rw = F.RANGED[sl.k], q = F.qualOf(sl), d = dmgOf(sl.k) * F.QUAL[q].dmg;
      out += "<div class='lbl'>in your paw</div><div class='rlist'><div class='rc'><span class='big'>" + icon(sl.k, 28) + "</span><div class='t'>" + esc(F.name(sl)) + "<small>" + (rw ? "shoots " + rw.word + "s · you have " + F.ammoN(c, rw) : d > 0 ? "hits for " + (Math.round(d * 100) / 100) : "not a weapon") + (pr.note ? " · " + esc(pr.note) : "") + (sl.px ? " · 🍄 " + sl.px + " dizzy hits" : "") + "</small></div>" +
        (d > 0 && !rw && !sl.px && Surv.count(c, "shroom", true) ? "<button class='btn' data-frub='1'>rub a red shroom on it</button>" : "") + "</div></div>";
    }
    out += "<div class='lbl'>🏏 fighting level " + l + "</div>";
    F.PERKS.forEach(function (p) { out += "<div class='help'>" + (l >= p.lv ? "✓ " : "🔒 level " + p.lv + ": ") + "<b>" + esc(p.name) + "</b> · " + esc(p.text) + "</div>"; });
    [5, 10].forEach(function (at) {
      var got = F.style(c, at);
      if (got) out += "<div class='help'>✓ style: <b>" + esc(got) + "</b></div>";
      else if (l >= at) out += "<div class='help'>pick a style:</div><div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>" + F.STYLES[at].map(function (x) { return "<button class='btn go' data-fstyle='" + at + ":" + x.id + "'>" + esc(x.name) + " · " + esc(x.text) + "</button>"; }).join("") + "</div>";
      else out += "<div class='help'>🔒 level " + at + ": pick a style (" + F.STYLES[at].map(function (x) { return x.name; }).join(" or ") + ")</div>";
    });
    F.SNEAK_PERKS.forEach(function (p) { out += "<div class='help'>" + (lv(c, "hunt") >= p.lv ? "✓ " : "🔒 hunting " + p.lv + ": ") + "<b>" + esc(p.name) + "</b> · " + esc(p.text) + "</div>"; });
    out += F.html2(game, c, icon);
    if (c.tier >= 2) {
      out += "<div class='lbl'>make</div>" + row(F.GROUPS.filter(function (gp) { return !SB.Wear || (gp[0] !== "wear" && gp[0] !== "charms"); }).map(function (gp) { return btn("fgrp", gp[0], gp[1], tabG === gp[0]); }).join("")) + "<div class='rlist'>";
      F.RECIPES.forEach(function (rc) {
        if ((rc.g || "weapons") !== tabG || c.tier < rc.tier || !K[rc.out]) return;
        var miss = lacks(c, rc.cost);
        out += "<div class='rc'><span class='big'>" + icon(rc.out, 28) + "</span><div class='t'>" + (rc.n > 1 ? rc.n + " " : "") + esc(lab(rc.out)) + (rc.n > 1 ? "s" : "") + "<small>" + esc(costText(rc.cost)) + (miss.length ? " · missing " + esc(miss.join(", ")) : "") + "</small></div><button class='btn go' data-fmake='" + rc.id + "' " + (miss.length ? "disabled" : "") + ">make</button></div>";
      });
      out += "</div><div class='lbl'>traps (set where you're looking)</div><div class='rlist'>";
      Object.keys(F.TRAPS).forEach(function (k) {
        var T = F.TRAPS[k], miss = lacks(c, T.cost);
        if (c.tier < T.tier || (T.hide && miss.length)) return;
        out += "<div class='rc'><span class='big'>" + SK[k].emoji + "</span><div class='t'>" + esc(SK[k].label) + "<small>" + esc(costText(T.cost)) + " · " + esc(T.text) + "</small></div><button class='btn go' data-ftrap='" + k + "' " + (miss.length ? "disabled" : "") + ">set</button></div>";
      });
      out += "</div>";
    } else out += "<div class='help'>bows, shields and traps need hands: a tool-user can make them.</div>";
    var nt = F.nextTier(game);
    out += "<div class='help'>grumps chased off with your own paws: <b>" + (s.chased || 0) + "</b>" + (nt ? " · " + nt[0] + " makes you a " + nt[2] + " (+" + nt[1] + " ✨)" : "") + (s.caught ? " · caught in traps: " + s.caught : "") + "</div>";
    return out;
  };
  F.wire = function (root, game, c, redraw, tell) {
    function done(r) { if (r && r.msg && tell) tell(r.msg); if (r && r.ok) audio("craft"); redraw(); }
    function each(sel, fn) { var L = root.querySelectorAll(sel); for (var i = 0; i < L.length; i++) (function (b) { b.addEventListener("click", function () { fn(b); }); })(L[i]); }
    each("[data-fsneak]", function () { F.setSneak(game, c); redraw(); });
    each("[data-fbrace]", function () { F.brace(game, c); redraw(); });
    each("[data-frub]", function () { done(F.rub(game, c)); });
    each("[data-fstyle]", function (b) { var p = b.getAttribute("data-fstyle").split(":"); done(F.pick(game, c, +p[0], p[1])); });
    each("[data-fmake]", function (b) { done(F.make(game, c, b.getAttribute("data-fmake"))); });
    each("[data-ftrap]", function (b) { var r = F.setTrap(game, c, b.getAttribute("data-ftrap")); if (r.ok) audio("build", 0.7); if (r.msg && tell) tell(r.msg); redraw(); });
    each("[data-fgrp]", function (b) { tabG = b.getAttribute("data-fgrp"); redraw(); });
    each("[data-fwear]", function (b) { done(F.wear(game, c, b.getAttribute("data-fwear"))); });
    each("[data-foff]", function (b) { done(F.setOff(game, c, b.getAttribute("data-foff"))); });
    each("[data-fdo]", function (b) { done(F.doIt(game, c, b.getAttribute("data-fdo"))); });
    each("[data-fbuy]", function (b) { done(F.buy(game, c, b.getAttribute("data-fbuy"))); });
  };
  if (SB.Ext) SB.Ext.tab({ id: "fight", label: "🏏 fight", show: function (game, c) { return !!c && c.tier >= 1; }, html: F.html, wire: F.wire });
  F.wireGrow = function (root, game, c, redraw, tell) {
    function done(r) { if (r && r.msg && tell) tell(r.msg); if (r && r.ok) audio("chime", 0.5); redraw(); }
    function each(sel, fn) { var L = root.querySelectorAll(sel); for (var i = 0; i < L.length; i++) (function (b) { b.addEventListener("click", function () { fn(b.getAttribute(sel.slice(1, -1))); }); })(L[i]); }
    each("[data-gpage]", function (v) { growG = v; redraw(); });
    each("[data-gattr]", function (v) { done(F.grow(game, c, v)); });
    each("[data-gperk]", function (v) { done(F.buyPerk(game, c, v)); });
    each("[data-glegend]", function (v) { done(F.legend(game, c, v)); });
    each("[data-gmaster]", function (v) { done(F.master(game, c, v)); });
    each("[data-gcall]", function (v) { done(F.call(game, c, v)); });
    each("[data-gday]", function (v) { done(F.setDay(game, c, v)); });
    each("[data-gall]", function (v) { done(F.setDay(game, c, v, true)); });
    each("[data-gresp]", function (v) { done(F.setResp(game, c, v)); });
    each("[data-gteach]", function (v) { done(F.learnFrom(game, c, SB.Game.byId(game, +v))); });
    each("[data-gspar]", function (v) { done(F.spar(game, c, SB.Game.byId(game, +v))); });
  };
  if (SB.Ext) SB.Ext.tab({ id: "grow", label: "⭐ grow", show: function (game, c) { return !!c; }, html: function (game, c) { return F.htmlGrow(game, c); }, wire: F.wireGrow });

  /* ================= round 2 =================
     what you wear     hat, cloak and boots slots (fur, bark, copper sets; a spine cloak, a moss cloak, job hats), a
                       charm slot, set bonuses and a set move. worn things stay in your bag: the slot only says which.
     your other paw    a second thing held: a torch beside a club, two light weapons that swing faster, a shield to bash with.
     a side-hop        a dodge that nothing can bite through, and a breath of safety after every bite.
     pots and light    fire pots, thunder pots, stink, smoke, brews that leave a cloud, a light flask; a flash that
                       stuns; a lens that fires a beam; a crossbow, a boomerang, a flail, a flash stick, a horn that marks.
     helpers           a ward post, a clay guard, a log flinger, a guard post with a bounty, and smols you mark a grump for.
     a body that grows more skills (quiet ones too), passions, callings, rust, mastery, stars, a body level with picks,
                       perk stars, trainers, sparring, carvings, and practice that sinks in while you sleep.
     State: plain fields on c.body (wear, off, at, pk, pas, star, mx, mp, role, day, resp, bank, xh, rd, tr, lu) and
     game.quests.fight (musk, flare, bounty, drops). Grumps are not saved: marks, slows and clouds are not either. */
  var Bd = SB.Body;
  var iT = 0, dodgeT = 0, dashT = 0, dashSide = 1, flashT = 0, moveT = 0, sleepT = 0, lastY = null, wasAir = false, lefty = false, mark = null, sparT = 0, lastDay = null, t2 = 0, biteT = -99;
  var clouds = [], slows = [], senList = [], senT = 0, slowEnd = 0, slowG = null, tabG = "weapons", growG = "skills";
  var flareChk = false;
  var skT = 0, swimA = 0, climbA = 0, sneakA = 0, drillN = 0, muskT = 0, sx0 = 0, sz0 = 0;
  F.SLOWMO = 0.37;     // how slow a breath of slow time runs (a speed nothing else uses)
  F.SAFE = 0.6;        // after a bite lands, nothing else can bite for this long
  F.DASH = 2.2; F.DASH_CD = 1.2; F.DASH_PEP = 0.12; F.DASH_SAFE = 0.45;
  F.YIELD = 0.5;       // a badly hurt grump turns tail this often (and comes back)
  F.LOOT = 1;          // scales what a beaten grump drops
  F.BEETLES = 0.15;    // a broken rock hides beetles this often
  F.FLASH_CD = 12; F.FLASH_R = 5; F.MARK_HIT = 1.15;
  F.HEART = 0.1;       // one spare heart
  F.MASTER_STEP = 40; F.BANK = 0.25; F.DECAY_DAYS = 4;
  function attr(c) { return (c && c.body && c.body.at) || {}; }
  function bod(c) { if (Bd) return Bd.of(c); if (!c.body || typeof c.body !== "object") c.body = {}; return c.body; }
  function sub(c, key) { var b = bod(c); if (!b[key] || typeof b[key] !== "object") b[key] = {}; return b[key]; }
  function near(game, x, z, r, fn) { game.creatures.forEach(function (o) { if (SB.dist(o.x, o.z, x, z) <= r) fn(o); }); }
  function cur0() { return SB.Game && SB.Game.current; }
  function emit(name, d) { if (SB.bus) SB.bus.emit(name, d); }
  function pct(x) { return Math.round(x * 100) + "%"; }
  function plural(n, w) { return n + " " + w + (n === 1 ? "" : "s"); }
  function nearestGrump(game, c, r) { var best = null, bd = r; game.creatures.forEach(function (g) { if (!isGrump(g) || g.heldBy) return; var d = SB.dist(g.x, g.z, c.x, c.z); if (d <= bd) { bd = d; best = g; } }); return best; }
  function splash(game, x, z, r, fn) { game.creatures.slice().forEach(function (g) { if (isGrump(g) && !g.heldBy && !tut(g) && SB.dist(g.x, g.z, x, z) <= r + SB.Creature.radius(g)) fn(g); }); }
  // a hurt that is not a swing: a pot, a flash, a helper. cls says whose skill it grows with
  function zap(game, c, g, dmg, name, cls) {
    if (!isGrump(g)) return false;
    if (g.boss && SB.Bosses && SB.Bosses.blocks(g, dmg, name)) return false;
    g._fSeen = now;
    return hurt(game, g, dmg * (1 + bonus(c, cls === "light" ? "light" : cls === "tribe" ? "charm" : "hunt")), c);
  }
  function scare(g, x, z, t) { if (g.boss || tut(g) || g.scout || pinned(g)) return false; g.attn = null; g.action = null; pin(g, { until: now + t, run: 1, fx: x, fz: z }); return true; }
  function slow(g, t) { if (g.boss || tut(g)) return; var had = g._slow > now; g._slow = Math.max(g._slow || 0, now + t); if (!had) slows.push({ id: g.id, lx: g.x, lz: g.z }); }
  F.slowed = function (g) { return !!(g && g._slow > now); };
  function tickSlows(game) {
    for (var i = slows.length - 1; i >= 0; i--) {
      var e = slows[i], g = SB.Game.byId(game, e.id);
      if (!g || !g.alive || !(g._slow > now)) { slows.splice(i, 1); continue; }
      g.x = e.lx + (g.x - e.lx) * 0.5; g.z = e.lz + (g.z - e.lz) * 0.5; e.lx = g.x; e.lz = g.z;
    }
  }
  function pushAway(game, g, x, z, d) { if (g.boss || pinned(g)) return; var a = Math.atan2(g.x - x, g.z - z), nx = g.x + Math.sin(a) * d, nz = g.z + Math.cos(a) * d; if (SB.World.walkable(game.world, nx, nz)) { g.x = nx; g.z = nz; } }
  function arc(game, c, x, z) { if (!SB.FX || !SB.FX.burst) return; var y0 = eye(game, c), d = Math.hypot(x - c.x, z - c.z); for (var i = 1; i <= 4; i++) { var t = i / 5; burst("crumbs", c.x + (x - c.x) * t, y0 + Math.sin(t * Math.PI) * d * 0.12, c.z + (z - c.z) * t, 1, { col: [1, 1, 0.8] }); } }
  // slow time for a breath: a last bonk, a steady aim. only ever from normal speed, and always put back
  function slowmo(game, sec) { if (!game || game.speed !== 1 || slowG) return false; game.speed = F.SLOWMO; slowG = game; slowEnd = Date.now() + sec * 1000; return true; }
  function endSlow() { if (slowG && slowG.speed === F.SLOWMO) slowG.speed = 1; slowG = null; slowEnd = 0; }
  F._endSlow = endSlow; F.slowTime = function () { return !!slowG; };
  function lastBonk(game, c, g) { slowmo(game, 0.5); burst("crumbs", g.x, (g.y || 0) + 1.2, g.z, 20, { col: [1, 1, 1] }); say("💫 the last bonk! the grump goes tumbling away over the hill"); emit("lastBonk", { c: c, g: g }); }
  function maybeYield(game, c, g, will) {
    if (!(F.YIELD > 0) || g.boss || tut(g) || g.scout || g._yield || will < need(g) * 0.7 || will >= need(g)) return;
    if (dice(game) >= F.YIELD) { g._yield = 2; return; }
    g._yield = 1; g.attn = null;
    if (!pinned(g)) pin(g, { until: now + 5, run: 1, heal: 1, fx: c.x, fz: c.z });
    say("🏳 the grump turns tail! it will be back when it finds its nerve");
    emit("grumpYield", { c: c, g: g });
  }
  // a stray shot bonks a friend, who remembers
  function strayShot(game, c, ref) {
    var pal = null;
    near(game, ref.x, ref.z, 2.5, function (o) { if (!pal && o !== c && o.species === "smol" && o.alive) pal = o; });
    if (!pal || dice(game) >= 0.5) return false;
    SB.Chem.apply(pal.chem, { pain: 0.1, anger: 0.2 });
    if (SB.Creature.emote) SB.Creature.emote(pal, "angry", 2);
    if (SB.Social && SB.Social.remember) SB.Social.remember(game, pal, c, "bonked", -8, "bonked me with a stray shot", 1800, 20);
    say("oops! that one bonked " + pal.name + ". they won't forget it in a hurry");
    emit("friendlyFire", { c: c, pal: pal });
    return true;
  }

  /* ---------------- more things to hold ---------------- */
  kind("crossbow", { noun: "tool", label: "crossbow", emoji: "🏹", r: 0.18, color: 0x9a6a3a, tool: "shoot", desc: "it holds one shot ready: no draw, a hard flat hit, a slow reload. uses arrows." });
  kind("boomerang", { noun: "tool", label: "boomerang", emoji: "🪃", r: 0.14, color: 0xb08a5a, tool: "throw", desc: "a bent stick that comes back. it makes a grump wobble." });
  kind("flail", { noun: "tool", label: "flail", emoji: "⛓", r: 0.16, color: 0x8a8a92, tool: "smash", desc: "a stone on a vine. a big swing whirls it at every grump around you." });
  kind("flashstick", { noun: "fire", label: "flash stick", emoji: "✴", r: 0.14, color: 0xfff2a0, tool: "burn", light: 1, glow: 1, desc: "a glowcap torch. every hit is a flash of light, and grumps reel." });
  kind("horn", { noun: "tool", label: "shell horn", emoji: "📯", r: 0.13, color: 0xf0e0c8, tool: "call", desc: "blow it at a grump: it is marked, and your helpers go for it." });
  kind("firearrow", { noun: "material", label: "fire arrow", emoji: "➶", r: 0.1, color: 0xff8a3a, mat: 1, desc: "a torch-tipped arrow. the grump keeps hurting." });
  kind("glowarrow", { noun: "material", label: "glow arrow", emoji: "➶", r: 0.1, color: 0x67d4ff, mat: 1, glow: 1, desc: "a glowcap-tipped arrow. it lights the grump up: marked, dazzled, and your helpers see it." });
  kind("brewarrow", { noun: "material", label: "brew arrow", emoji: "➶", r: 0.1, color: 0x8de0c0, mat: 1, desc: "dipped in shroom brew. the grump goes slow." });
  kind("firepot", { noun: "material", label: "fire pot", emoji: "🧨", r: 0.13, color: 0xd8602a, mat: 1, desc: "throw it: fire for every grump where it lands, and it cracks rock." });
  kind("thunderpot", { noun: "material", label: "thunder pot", emoji: "💥", r: 0.14, color: 0xe8d870, mat: 1, desc: "throw it: a great bang. everything near it reels, and rock breaks." });
  kind("stinkpot", { noun: "material", label: "stink pot", emoji: "💨", r: 0.13, color: 0x9ab850, mat: 1, desc: "throw it: a cloud grumps run from." });
  kind("smokepot", { noun: "material", label: "smoke pot", emoji: "🌫", r: 0.13, color: 0x9a9a9a, mat: 1, desc: "throw it: thick smoke. grumps lose whoever is inside." });
  kind("sickbrew", { noun: "material", label: "queasy brew", emoji: "🫧", r: 0.13, color: 0x7ad08a, mat: 1, desc: "throw it: a cloud that leaves grumps slow and green." });
  kind("oddbrew", { noun: "material", label: "strange brew", emoji: "🌀", r: 0.13, color: 0xc080ff, mat: 1, desc: "throw it and see. beetles, or a great wind." });
  kind("lightflask", { noun: "material", label: "lantern flask", emoji: "🌟", r: 0.13, color: 0xfff2a0, mat: 1, glow: 1, desc: "throw it: a burst of lantern light. grumps hate it." });
  kind("musk", { noun: "material", label: "dark lure", emoji: "🌑", r: 0.12, color: 0x3a2a4a, mat: 1, desc: "open it and grumps come looking, and drop more when you beat them." });
  kind("tuft", { noun: "material", label: "grump tuft", emoji: "🧶", r: 0.1, color: 0x5a3d6a, mat: 1, desc: "uncommon. a tuft of grump fluff. it smells of the dark." });
  kind("nightpearl", { noun: "material", label: "night pearl", emoji: "⚫", r: 0.09, color: 0x2a2a44, mat: 1, glow: 1, desc: "rare. a grump was keeping it somewhere safe." });
  kind("arkflare", { noun: "material", label: "ark flare", emoji: "🎇", r: 0.13, color: 0xff5a4a, mat: 1, desc: "from the wreck of the pod. one shot: it clears every grump off the island." });
  kind("crystalseed", { noun: "material", label: "crystal seed", emoji: "💠", r: 0.1, color: 0xa8e6ff, mat: 1, glow: 1, desc: "a master's reward. set it in the ground (fight tab) and a crystal tree grows." });
  kind("thoughtsap", { noun: "food", label: "thought sap", emoji: "🔷", r: 0.1, color: 0x8fd8ff, food: { hunger: -0.05 }, chem: { glucose: 0.05 }, glow: 1, desc: "from a crystal tree. eat it and the last thing you practised sinks in deeper." });
  tool("crossbow", { wood: 0, stone: 0, ore: 0, dmg: 0, uses: 150 });
  tool("boomerang", { wood: 0, stone: 0, ore: 0, dmg: 0, uses: 90 });
  tool("flail", { wood: 0, stone: 0, ore: 0, dmg: 0.9, uses: 120 });
  tool("flashstick", { wood: 0, stone: 0, ore: 0, dmg: 0.7, uses: 80 });
  tool("horn", { wood: 0, stone: 0, ore: 0, dmg: 0, uses: 200 });
  F.W.flail = { reach: 0.5, stg: 1.6, kb: 0.6, sp: 1.25, whirl: 1, note: "a big swing whirls it at every grump around you" };
  F.W.flashstick = { burn: 1, flash: 1, cls: "light", note: "a weapon of light: every hit dazzles" };
  F.W.torch.cls = "light";
  F.W.crystalblade.beam = 1; F.W.crystalblade.note = "quick, sharp, it sweeps, and a big swing throws a sliver of light";
  F.RANGED.bow.ammo = ["firearrow", "brewarrow", "glowarrow", "ironarrow", "tootharrow", "arrow"];
  F.RANGED.bow.drop = 10;
  F.RANGED.crossbow = { ammo: F.RANGED.bow.ammo, range: 20, full: 10, cd: 1.8, word: "arrow", none: "no arrows for the crossbow", loaded: 1, tier: 5 };
  F.RANGED.boomerang = { self: "boomerang", ammo: [], range: 9, full: 4, cd: 0.9, word: "boomerang", act: "throw your boomerang" };
  F.RANGED.lens = { self: "lens", ammo: [], range: 12, full: 12, cd: 1, word: "beam", act: "shine a beam", beam: 1, tier: 5 };
  F.AMMO.firearrow = { dmg: 1, burn: 1 }; F.AMMO.glowarrow = { dmg: 0.9, stg: 2.5, glow: 1, cls: "light" }; F.AMMO.brewarrow = { dmg: 0.9, slow: 1 };
  F.AMMO.boomerang = { dmg: 0.7, stg: 2.5 }; F.AMMO.lens = { dmg: 1.2, cls: "light" };
  F.GROUPS = [["weapons", "🏹 weapons"], ["arrows", "➶ arrows"], ["pots", "🧨 pots"], ["wear", "🧥 wear"], ["charms", "📿 charms"]];
  [
    { id: "crossbow", out: "crossbow", n: 1, tier: 5, cost: { "plank|log": 1, metal: 1, "vine|fiber": 1 } },
    { id: "boomerang", out: "boomerang", n: 1, tier: 2, cost: { stick: 2, "sharpstone|flint": 1 } },
    { id: "flail", out: "flail", n: 1, tier: 2, cost: { stone: 1, stick: 1, "vine|fiber": 1 } },
    { id: "flashstick", out: "flashstick", n: 1, tier: 2, cost: { stick: 1, glowcap: 2 } },
    { id: "horn", out: "horn", n: 1, tier: 2, cost: { clam: 1, "vine|fiber": 1 } },
    { id: "firearrow", out: "firearrow", n: 4, tier: 2, g: "arrows", cost: { arrow: 4, "torch|firewood": 1 } },
    { id: "glowarrow", out: "glowarrow", n: 4, tier: 2, g: "arrows", cost: { arrow: 4, glowcap: 1 } },
    { id: "brewarrow", out: "brewarrow", n: 4, tier: 2, g: "arrows", cost: { arrow: 4, shroom: 1 } },
    { id: "firepot", out: "firepot", n: 2, tier: 2, g: "pots", cost: { clay: 1, "firewood|stick": 1, "fiber|leaves": 1 } },
    { id: "thunderpot", out: "thunderpot", n: 1, tier: 4, g: "pots", cost: { clay: 1, "ironore|ore": 1, crystal: 1 } },
    { id: "stinkpot", out: "stinkpot", n: 2, tier: 2, g: "pots", cost: { shroom: 2, leaves: 1 } },
    { id: "smokepot", out: "smokepot", n: 2, tier: 2, g: "pots", cost: { leaves: 3, "firewood|stick": 1 } },
    { id: "sickbrew", out: "sickbrew", n: 1, tier: 2, g: "pots", cost: { shroom: 1, "herb|berry": 1, clay: 1 } },
    { id: "oddbrew", out: "oddbrew", n: 1, tier: 2, g: "pots", cost: { shroom: 1, glowcap: 1, clay: 1 } },
    { id: "lightflask", out: "lightflask", n: 1, tier: 2, g: "pots", cost: { glowcap: 2, "mote|crystal": 1 } },
    { id: "musk", out: "musk", n: 1, tier: 2, g: "pots", cost: { tuft: 1, "meat|fish": 1 } }
  ].forEach(function (rc) { F.RECIPES.push(rc); });

  /* ---------------- what you wear ---------------- */
  F.GEAR = {
    furhat: { slot: "hat", set: "fur", arm: 0.05, cost: { fur: 2 }, label: "fur hat", e: "🧢", col: 0xc8b48a },
    cloak: { slot: "cloak", set: "fur", arm: 0.05 }, // the fur cloak the island already has
    furgreaves: { slot: "boots", set: "fur", arm: 0.05, cost: { fur: 2, "vine|fiber": 1 }, label: "fur boots", e: "🥾", col: 0xc8b48a },
    barkhat: { slot: "hat", set: "bark", arm: 0.08, cost: { log: 1, "vine|fiber": 1 }, label: "bark hat", e: "🪖", col: 0x7a5230 },
    barkvest: { slot: "cloak", set: "bark", arm: 0.1, heart: 1, cost: { log: 2, "vine|fiber": 2 }, label: "bark vest", e: "🦺", col: 0x7a5230 },
    barkboots: { slot: "boots", set: "bark", arm: 0.07, cost: { log: 1, "vine|fiber": 1 }, label: "bark boots", e: "🥾", col: 0x7a5230 },
    copperhat: { slot: "hat", set: "copper", arm: 0.12, heavy: 1, tier: 4, cost: { metal: 2 }, label: "copper helm", e: "⛑", col: 0xe08a4a },
    coppervest: { slot: "cloak", set: "copper", arm: 0.16, heavy: 1, heart: 1, tier: 4, cost: { metal: 3, fur: 1 }, label: "copper coat", e: "🦺", col: 0xe08a4a },
    copperboots: { slot: "boots", set: "copper", arm: 0.1, heavy: 1, tier: 4, cost: { metal: 2 }, label: "copper boots", e: "🥾", col: 0xe08a4a },
    spinecloak: { slot: "cloak", arm: 0.04, thorns: 0.5, cost: { pricklypear: 2, "vine|fiber": 1 }, label: "spine cloak", e: "🌵", col: 0x6aa84a },
    mosscloak: { slot: "cloak", arm: 0.03, quiet: 1, cost: { leaves: 4, "vine|fiber": 1 }, label: "moss cloak", e: "🍃", col: 0x4f8a40 },
    guardhelm: { slot: "hat", arm: 0.08, taunt: 1, melee: 0.1, tier: 3, cost: { "plank|log": 1, tooth: 1 }, label: "guard's helm", e: "🪖", col: 0x8a8a92 },
    anglerhat: { slot: "hat", arm: 0.02, xp: "fish", cost: { leaves: 2, "vine|fiber": 1 }, label: "fisher's hat", e: "👒", col: 0x8fb8d8 },
    farmerhat: { slot: "hat", arm: 0.02, xp: "forage", cost: { leaves: 2, stick: 1 }, label: "farmer's hat", e: "👒", col: 0xe0c060 }
  };
  F.SETS = {
    fur: { name: "snug", icon: "🧥", text: "never cold, and a tenth quicker on your paws", move: "roll", moveText: "a long roll nothing can bite through" },
    bark: { name: "rooted", icon: "🌳", text: "a bite never shoves you about", move: "shout", moveText: "a shout that sends grumps running" },
    copper: { name: "the bell", icon: "🔔", text: "every fourth bite bounces off", move: "stomp", moveText: "a stomp that makes every grump close by reel" }
  };
  F.SLOTS = ["hat", "cloak", "boots", "charm", "charm2"];
  if (Bd) Bd.SKILLS.forEach(function (s) { F.GEAR["charm_" + s.id] = { slot: "charm", skill: s.id, cost: { tooth: 1, "vine|fiber": 1 }, label: s.label + " charm", e: "📿", col: 0xf0ead8, g: "charms" }; });
  F.gearText = function (k) {
    var g = F.GEAR[k], t = [];
    if (!g) return "";
    if (g.skill) return "wear it: +10% " + (Bd ? Bd.BY_ID[g.skill].label : g.skill) + ".";
    if (g.arm) t.push("armour " + pct(g.arm));
    if (g.set) t.push("part of the " + g.set + " set");
    if (g.heavy) t.push("heavy: a little slower");
    if (g.heart) t.push("+1 spare heart");
    if (g.thorns) t.push("whatever bites you gets pricked");
    if (g.quiet) t.push("grumps notice you later");
    if (g.taunt) t.push("+10% with anything you swing, and grumps come for you, not the others");
    if (g.xp) t.push("you learn " + (Bd ? Bd.BY_ID[g.xp].label : g.xp) + " half as fast again");
    return t.join(". ") + ".";
  };
  Object.keys(F.GEAR).forEach(function (k) {
    var g = F.GEAR[k];
    if (!g.cost) return;
    kind(k, { noun: "tool", label: g.label, emoji: g.e, r: 0.15, color: g.col, wearable: g.slot, desc: "worn (bag, fight tab). " + F.gearText(k) });
    F.RECIPES.push({ id: k, out: k, n: 1, tier: g.tier || 2, g: g.g || "wear", cost: g.cost });
  });
  F.wearing = function (c, slot) { var w = c && c.body && c.body.wear, k = w && w[slot]; return k && F.GEAR[k] && c.inv && Sv().count(c, k, true) > 0 ? k : null; };
  F.isWorn = function (c, k) { var g = F.GEAR[k]; return !!g && (F.wearing(c, g.slot) === k || (g.slot === "charm" && F.wearing(c, "charm2") === k)); };
  F.gearSum = function (c, f) { var w = c && c.body && c.body.wear, t = 0; if (!w) return 0; for (var i = 0; i < F.SLOTS.length; i++) { var k = F.wearing(c, F.SLOTS[i]); if (k && F.GEAR[k][f]) t += F.GEAR[k][f]; } return t; };
  F.setOf = function (c) { var a = F.wearing(c, "hat"), b = F.wearing(c, "cloak"), d = F.wearing(c, "boots"), s = a && F.GEAR[a].set; return s && b && d && F.GEAR[b].set === s && F.GEAR[d].set === s ? s : null; };
  F.wear = function (game, c, k) {
    var g = F.GEAR[k];
    if (!g) return { ok: false, msg: "you can't wear that" };
    if (!Sv().count(c, k, true)) return { ok: false, msg: "you don't have one" };
    var w = sub(c, "wear");
    if (F.isWorn(c, k)) { if (w[g.slot] === k) delete w[g.slot]; else delete w.charm2; emit("worn", { c: c, kind: k, off: true }); return { ok: true, off: true, msg: "you take off the " + lab(k) }; }
    var slot = g.slot;
    if (slot === "charm" && F.wearing(c, "charm") && F.mastered(c, "veteran")) slot = "charm2";
    w[slot] = k;
    var set = F.setOf(c);
    emit("worn", { c: c, kind: k, slot: slot, set: set });
    return { ok: true, slot: slot, msg: "you put on the " + lab(k) + (set && g.set === set ? ". the whole " + set + " set (" + F.SETS[set].name + "): " + F.SETS[set].text : "") };
  };
  // crouched or braced beside something solid
  F.inCover = function (game, c) {
    if (!c || (!F.sneaking(c) && !F.guarding(c))) return false;
    var w = game.world;
    return SB.World.structsNear(w, c.x, c.z, 1.6, function (b) { return b.done && !F.TRAPS[b.kind]; }).length > 0 || SB.World.nodesNear(w, c.x, c.z, 1.4, function (n) { return !n.state || n.state === "ok"; }).length > 0;
  };
  F.armour = function (game, c) { return Math.min(0.7, F.gearSum(c, "arm") + (game && F.inCover(game, c) ? 0.25 : 0)); };
  F.speedMul = function (c) { if (!c || !c.body || !c.body.wear) return 1; return (1 - 0.04 * F.gearSum(c, "heavy")) * (F.setOf(c) === "fur" ? 1.1 : 1); };
  F.spareCap = function (c) { if (!c || !c.body) return 0; return F.HEART * (Math.floor(lv(c, "fight") / 4) + (attr(c).heart || 0) + (F.mastered(c, "veteran") ? 1 : 0) + F.gearSum(c, "heart")); };
  F.spare = function (c) { var b = c && c.body; return b ? Math.min(F.spareCap(c), b.xh || 0) : 0; };
  // what is left of a bite after a side-hop, cover, what you wear and your spare hearts
  function soften(game, c, s, drop) {
    var b = bod(c);
    if (iT > now) { if (dodgeT > now) { say("💨 it missed you!"); emit("dodged", { c: c }); } else emit("spared", { c: c }); return 0; }
    var a = F.armour(game, c), set = F.setOf(c);
    if (a > 0) drop *= 1 - a;
    if (set === "copper") { b.bn = (b.bn || 0) + 1; if (b.bn % 4 === 0) { say("🔔 clang! that one bounced off your copper"); drop = 0; } }
    if (set === "bark" && Math.hypot(c.x - lx, c.z - lz) > 1.5 && SB.World.walkable(game.world, lx, lz)) { c.x = lx; c.z = lz; }
    if (drop > 0 && b.xh > 0) { var t = Math.min(b.xh, drop); b.xh -= t; drop -= t; if (drop < 1e-9) drop = 0; }
    var th = F.gearSum(c, "thorns");
    if (th) { var g = nearestGrump(game, c, 3); if (g && !tut(g)) { burst("crumbs", g.x, (g.y || 0) + 0.6, g.z, 6, { col: [0.5, 0.9, 0.4] }); if (!g.boss) F.addStagger(game, g, 1); hurt(game, g, th, c); emit("thorns", { c: c, g: g }); } }
    biteT = now;
    if (F.SAFE > 0) iT = Math.max(iT, now + F.SAFE);
    return drop;
  }

  /* ---------------- a side-hop, a bash, a mark, a flash ---------------- */
  function hopTo(game, c, ang, far) { var x = c.x, z = c.z, d = 0; for (var t = 0.4; t <= far + 1e-6; t += 0.4) { var nx = c.x + Math.sin(ang) * t, nz = c.z + Math.cos(ang) * t; if (!SB.World.walkable(game.world, nx, nz)) break; x = nx; z = nz; d = t; } return { x: x, z: z, d: d }; }
  F.dash = function (game, c) {
    var s = PS(c);
    if (!s || c.asleep || lesson(s)) return { ok: false };
    if (now < dashT) return { ok: false, msg: "not yet: you only just landed" };
    var cost = F.mastered(c, "feather") ? 0 : F.DASH_PEP * pepMul(c);
    if (s.stam < cost) { say("too puffed to hop"); return { ok: false, msg: "too puffed to hop" }; }
    body(c);
    var g = nearestGrump(game, c, 8), a = g ? Math.atan2(g.x - c.x, g.z - c.z) : s.yaw + Math.PI, winged = !!(c.look && c.look.wings);
    var far = F.DASH * (winged ? 2 : 1) * (F.rank(c, "scurry") ? 2 : 1), best = null;
    dashSide = -dashSide;
    [dashSide, -dashSide].forEach(function (sd) { if (best) return; var p = hopTo(game, c, a + sd * Math.PI / 2, far); if (p.d >= far * 0.5) best = p; });
    if (!best) return { ok: false, msg: "no room to hop" };
    c.x = best.x; c.z = best.z; lx = c.x; lz = c.z;
    s.stam = Math.max(0, s.stam - cost);
    iT = Math.max(iT, now + F.DASH_SAFE); dodgeT = now + F.DASH_SAFE;
    dashT = now + F.DASH_CD * (F.rank(c, "wind") ? 0.5 : 1) * (1 - Math.min(0.5, bonus(c, "climb") * 0.6));
    if (Bd) Bd.xp(c, "run", 1);
    burst("leaves", c.x, gy(game, c.x, c.z) + 0.2, c.z, 6); audio("tap", 0.5);
    emit("dash", { c: c, winged: winged, d: best.d });
    return { ok: true, d: best.d, winged: winged };
  };
  F.safe = function () { return iT > now; };
  // a small body with the nip star: bare paws that really hurt
  F.nip = function (game, c, g) {
    var s = PS(c), r = F.rank(c, "nip");
    if (!s || !r || !isGrump(g) || s.swingT > 0) return false;
    if (SB.dist(g.x, g.z, c.x, c.z) > reachOf(c, g, null)) { say("too far to nip"); return false; }
    s.swing = 1; s.swingT = P().SWING || 0.42; s.stam = Math.max(0, s.stam - 0.03);
    return !!F.strike(game, c, g, { dmg: 0.3 * r, name: "nip" }).ok;
  };
  // a shield in your bag and your guard up: knock the pounce out of a grump
  F.bash = function (game, c, g) {
    var s = PS(c), si = F.shieldAt(c);
    if (!s || !isGrump(g) || si < 0 || !F.guarding(c)) return { ok: false, msg: "raise your shield first" };
    if (s.swingT > 0) return { ok: false };
    if (SB.dist(g.x, g.z, c.x, c.z) > reachOf(c, g, null) + 0.3) { say("too far to bash"); return { ok: false, msg: "too far to bash" }; }
    var cost = 0.1 * pepMul(c);
    if (s.stam < cost) { say("too puffed to bash"); return { ok: false, msg: "too puffed to bash" }; }
    s.stam = Math.max(0, s.stam - cost); s.swing = 1; s.swingT = 0.6;
    var stopped = false;
    if (!g.boss) {
      if (g.scout && g.scout.wind > 0) { g.scout.wind = 0; g.scout.hitT = Math.max(g.scout.hitT || 0, 1); stopped = true; } // it was winding up to pounce. not any more
      shove(game, c, g, 1.2); F.addStagger(game, g, 99);
    }
    g._fSeen = now;
    Sv().wear(c, game, si);
    if (Bd) Bd.xp(c, "fight", 1);
    audio("bonk", 0.8);
    say(g.boss ? "🛡 bash! it barely notices" : stopped ? "🛡 bash! you knocked the pounce right out of it" : "🛡 bash! the grump reels");
    emit("bash", { c: c, g: g, stopped: stopped });
    return { ok: true, stopped: stopped };
  };
  F.marked = function (g) { return !!(g && mark != null && g.id === mark && g.alive); };
  F.markId = function () { return mark; };
  // mark a grump: your hits on it land harder, your aim finds it easier, and armed smols near it go for it
  F.mark = function (game, c, g, quiet) {
    if (!isGrump(g)) return false;
    mark = g.id; g._fSeen = now;
    var n = 0;
    near(game, g.x, g.z, 14, function (o) {
      if (o === c || o.species !== "smol" || !o.alive || o.asleep || o.stage < 3) return;
      var hk = SB.Ideas && SB.Ideas.heldKind ? SB.Ideas.heldKind(o, game) : null;
      if (!(o.job === "guard" || hk === "club" || hk === "spear" || (SB.Friends && SB.Friends.following && SB.Friends.following(game, o)))) return;
      o.attn = { type: "creature", id: g.id }; o.thinkT = 0; SB.Chem.apply(o.chem, { fear: -0.2, anger: 0.2 }); n++;
    });
    if (!quiet) { if (Bd) Bd.xp(c, "charm", 1); audio("chime", 0.6); say("🎯 marked" + (n ? ". " + n + " of yours go for it" : ". your hits on it land harder")); }
    emit("marked", { c: c, g: g, helpers: n });
    return true;
  };
  F.LIGHTS = { torch: 1, flashstick: 1, lens: 1 };
  F.OFFOK = { torch: 1, flashstick: 1, shield: 1, club: 1, blade: 1, hammer: 1, crystalblade: 1, horn: 1 };
  F.LIGHTW = { club: 1, blade: 1, torch: 1, flashstick: 1, hammer: 1, crystalblade: 1 };
  // the thing in your other paw (it stays in your bag: this only says which)
  F.off = function (c) { var k = c && c.body && c.body.off; if (!k || !K[k] || !c.inv) return null; return Sv().count(c, k, true) > (Sv().heldKind(c) === k ? 1 : 0) ? k : null; };
  F.dual = function (c) { var k = F.off(c); return k && F.LIGHTW[k] && F.LIGHTW[Sv().heldKind(c)] ? k : null; };
  F.setOff = function (game, c, k) {
    var b = bod(c);
    if (c.tier < 2) return { ok: false, msg: "you need two paws for that" };
    if (b.off === k) { delete b.off; return { ok: true, msg: "your other paw is empty" }; }
    if (!F.OFFOK[k] || !Sv().count(c, k, true)) return { ok: false, msg: "you can't hold that in your other paw" };
    b.off = k;
    emit("offhand", { c: c, kind: k });
    return { ok: true, msg: "your other paw holds the " + lab(k) + (F.LIGHTW[k] ? ". swing something light and both paws go" : "") };
  };
  F.lightIn = function (c) { var hk = Sv().heldKind(c), o = F.off(c); return F.LIGHTS[hk] ? hk : o && F.LIGHTS[o] ? o : null; };
  F.lit = function (game, c) { var o = F.off(c); return !game.world.night || !!(o && F.LIGHTS[o] && o !== "lens") || Sv().nearFire(c, game, 5); };
  F.flashReady = function () { return now >= flashT; };
  function reveal(game, c) {
    var s = PS(c), n = 0;
    if (s && s.darkT > 0) s.darkT = 0; // whatever was creeping up in the dark has to start again
    splash(game, c.x, c.z, 14, function (g) { g._fSeen = now; n++; if (g.prowler && SB.dist(g.x, g.z, c.x, c.z) < 8) zap(game, c, g, 1, "light", "light"); });
    if (mark == null || !F.marked(SB.Game.byId(game, mark))) { var g0 = nearestGrump(game, c, 14); if (g0) mark = g0.id; }
    emit("revealed", { c: c, n: n });
    return n;
  }
  // a torch, a flash stick or a lens: one great flash. every grump close by reels, and nothing can creep up unseen
  F.flash = function (game, c) {
    var s = PS(c);
    if (!s) return { ok: false };
    if (!F.lightIn(c)) return { ok: false, msg: "hold a torch, a flash stick or a lens" };
    if (now < flashT) return { ok: false, msg: "the light needs a moment" };
    body(c);
    flashT = now + (F.rank(c, "quickflash") ? 8 : F.FLASH_CD);
    var n = 0, r = F.FLASH_R + 2 * F.rank(c, "bright");
    splash(game, c.x, c.z, r, function (g) { n++; if (!g.boss) F.addStagger(game, g, 99); });
    var seen = reveal(game, c);
    if (Bd) Bd.xp(c, "light", 2);
    burst("crumbs", c.x, gy(game, c.x, c.z) + 1, c.z, 16, { col: [1, 1, 0.8] }); audio("chime", 0.7);
    var msg = n ? "✴ flash! " + plural(n, "grump") + " reel" + (n === 1 ? "s" : "") + ", blinking" : seen ? "✴ flash! " + plural(seen, "grump") + " out there, too far to dazzle" : "✴ flash! nothing is lurking close by";
    say(msg);
    emit("flash", { c: c, n: n, seen: seen });
    return { ok: true, n: n, seen: seen };
  };
  // the move a whole matching set gives you
  F.setMove = function (game, c) {
    var s = PS(c), set = F.setOf(c), n = 0, msg;
    if (!s || !set) return { ok: false, msg: "wear a whole matching set first" };
    if (now < moveT) return { ok: false, msg: "not yet: catch your breath" };
    moveT = now + 30; body(c);
    if (set === "fur") { var p = hopTo(game, c, s.yaw + Math.PI, 3.5); c.x = p.x; c.z = p.z; lx = c.x; lz = c.z; iT = dodgeT = now + 0.8; msg = "you tuck and roll. nothing can bite you for a moment"; }
    else if (set === "bark") { splash(game, c.x, c.z, 5, function (g) { if (scare(g, c.x, c.z, 4)) n++; }); msg = "📣 RAAH! " + (n ? plural(n, "grump") + " run" + (n === 1 ? "s" : "") + " for it" : "nothing was close enough to hear"); }
    else { splash(game, c.x, c.z, 3.5, function (g) { if (!g.boss) { F.addStagger(game, g, 99); n++; } }); msg = "🔔 stomp! " + (n ? plural(n, "grump") + " reel" + (n === 1 ? "s" : "") : "the ground rings"); }
    audio("bonk", 0.7);
    emit("setMove", { c: c, set: set, n: n });
    return { ok: true, n: n, set: set, msg: msg };
  };
  F.squeak = function (game, c) {
    var s = PS(c), n = 0;
    if (!s || !F.rank(c, "squeak")) return { ok: false, msg: "that is a small body's trick" };
    if (now < moveT) return { ok: false, msg: "not yet: catch your breath" };
    moveT = now + 15;
    splash(game, c.x, c.z, 3, function (g) { if (!g.boss) { F.addStagger(game, g, 99); n++; } });
    emit("squeak", { c: c, n: n });
    return { ok: true, n: n, msg: "❗ SQUEAK! " + (n ? plural(n, "grump") + " jump" + (n === 1 ? "s" : "") + " out of " + (n === 1 ? "its" : "their") + " fur" : "nobody heard") };
  };
  // toss a stone past a grump: it goes to look
  F.distract = function (game, c) {
    var s = PS(c), g = nearestGrump(game, c, 12);
    if (!s) return { ok: false };
    if (!Sv().count(c, "stone", true)) return { ok: false, msg: "you need a stone to toss" };
    if (!g) return { ok: false, msg: "no grump near enough to fool" };
    if (g.boss || g.scout || tut(g)) return { ok: false, msg: "that one is not so easily fooled" };
    Sv().take(c, "stone", 1);
    var a = Math.atan2(g.x - c.x, g.z - c.z), p = hopTo(game, g, a, 4);
    arc(game, c, p.x, p.z);
    Sv().spawn(game, "stone", 1, p.x, p.z, {});
    for (var i = pins.length - 1; i >= 0; i--) if (pins[i].id === g.id && pins[i].search) pins.splice(i, 1);
    g.attn = null; g.action = null; g._fSeen = null;
    if (!pinned(g)) pin(g, { until: now + 5, search: true, sx: p.x, sz: p.z });
    if (Bd) Bd.xp(c, "sneak", 1);
    emit("distracted", { c: c, g: g, x: p.x, z: p.z });
    return { ok: true, msg: "clack. the grump turns its head and goes to look" };
  };

  /* ---------------- pots, clouds, the flare, the lure ---------------- */
  F.POTS = {
    firepot: { r: 2.2, dmg: 1.2, burn: 1, flee: 3, crack: 2, col: [1, 0.5, 0.15], line: "🔥 whoomp! fire where it lands" },
    thunderpot: { r: 3.5, dmg: 2, stun: 1, crack: 4, col: [1, 1, 0.6], line: "💥 KRAK! the ground shakes" },
    stinkpot: { r: 3, flee: 7, cloud: 6, col: [0.6, 0.8, 0.3], line: "💨 phew! grumps can't stand it" },
    smokepot: { r: 3, cloud: 9, col: [0.7, 0.7, 0.7], line: "🌫 thick smoke. nothing in it can be seen" },
    sickbrew: { r: 2.5, slow: 8, sick: 1, cloud: 6, col: [0.5, 0.9, 0.6], line: "🫧 a queasy cloud. grumps in it go slow and green" },
    oddbrew: { r: 1.8, odd: 1, col: [0.8, 0.5, 1], line: "" },
    lightflask: { r: 4, dmg: 0.8, flash: 1, cls: "light", col: [1, 1, 0.8], line: "🌟 a burst of lantern light!" }
  };
  function crack(game, c, x, z, r, n) {
    var hit = 0;
    SB.World.nodesNear(game.world, x, z, r, function (m) { return Sv().isRock(m) && (!m.state || m.state === "ok"); }).forEach(function (m) {
      hit++;
      for (var i = 0; i < n; i++) { try { Sv().hitNode(c, game, m, "ironpick"); } catch (e) {} }
    });
    return hit;
  }
  function odd(game, c, g, out) {
    if (dice(game) < 0.5) {
      var soft = !g.boss && (g.tough || 1) <= 1.5, x = g.x, z = g.z;
      for (var i = 0; i < (soft ? 3 : 2); i++) Sv().spawn(game, "beetle", 1, x + (i - 1) * 0.4, z + 0.3, {});
      say("🐞 pop! " + (soft ? "the grump bursts into beetles" : "beetles everywhere. the grump is not pleased"));
      out.odd = "beetles";
      if (soft) { chase(game, g, c, "a grump burst into beetles! 🐞"); out.gone++; } else if (zap(game, c, g, 1, "odd brew")) out.gone++;
    } else {
      if (!g.boss && !pinned(g)) { var p = hopTo(game, g, Math.atan2(g.x - c.x, g.z - c.z), 6); g.x = p.x; g.z = p.z; g.px = p.x; g.pz = p.z; }
      if (!g.boss) F.addStagger(game, g, 99);
      say("🌀 whoosh! a great wind takes the grump clean off its feet");
      out.odd = "wind";
    }
  }
  // what a pot does where it lands
  F.blast = function (game, c, pk, x, z) {
    var T = F.POTS[pk], out = { ok: true, hit: 0, gone: 0, kind: pk, x: x, z: z };
    if (!T) return { ok: false };
    burst("crumbs", x, gy(game, x, z) + 0.5, z, 18, { col: T.col }); audio(T.dmg ? "bonk" : "tap", 0.9);
    var ran = 0; // 4.46: a posted or hunting grump does not run from a smell. the line says so
    if (T.line && !T.flee) say(T.line);
    splash(game, x, z, T.r, function (g) {
      out.hit++;
      if (T.odd) { if (out.hit === 1) odd(game, c, g, out); return; }
      if (T.dmg && zap(game, c, g, T.dmg, lab(pk), T.cls)) { out.gone++; return; }
      if (!g.alive) return;
      if ((T.burn || T.sick) && !g.boss && !F.burning(g)) dots.push({ id: g.id, by: c.id, n: 3, at: now + 1.2 });
      if ((T.stun || T.flash) && !g.boss) F.addStagger(game, g, 99);
      if (T.flee && (scare(g, x, z, T.flee) || pinned(g))) ran++;
      if (T.slow) slow(g, T.slow);
    });
    if (T.line && T.flee) say(out.hit && !ran ? "💨 phew! but a grump on guard or on the hunt won't run from a smell" : T.line);
    if (T.crack) out.rocks = crack(game, c, x, z, T.r, T.crack);
    if (T.cloud) clouds.push({ x: x, z: z, r: T.r, until: now + T.cloud, kind: pk, by: c.id });
    if (T.flash) reveal(game, c);
    if (T.cls === "light" && Bd) Bd.xp(c, "light", 2);
    emit("blast", { c: c, kind: pk, x: x, z: z, hit: out.hit, gone: out.gone });
    return out;
  };
  // throw the pot in your paw: at the grump under the crosshair, or in an arc. look higher and it flies further
  F.lob = function (game, c) {
    var s = PS(c), sl = Sv().held(c), pk = sl && F.POTS[sl.k] ? sl.k : null;
    if (!s || !pk || s.swingT > 0) return null;
    body(c);
    var tg = F.aim(game, c, 10, true), x, z;
    if (tg && tg.type === "grump") { x = tg.ref.x; z = tg.ref.z; }
    else { var d = SB.clamp(5 + (s.pitch || 0) * 9, 1.5, 11); x = c.x - Math.sin(s.yaw) * d; z = c.z - Math.cos(s.yaw) * d; }
    Sv().removeAt(c, Sv().inv(c).sel, 1);
    s.swing = 1; s.swingT = 0.7; s.stam = Math.max(0, s.stam - 0.04);
    arc(game, c, x, z);
    if (Bd) Bd.xp(c, "hunt", 1);
    var out = F.blast(game, c, pk, x, z);
    out.d = Math.hypot(x - c.x, z - c.z);
    return out;
  };
  F.inSmoke = function (o) { return clouds.some(function (cl) { return cl.kind === "smokepot" && SB.dist(o.x, o.z, cl.x, cl.z) <= cl.r; }); };
  F.clouds = function () { return clouds; };
  function cloudTick(game) {
    for (var i = clouds.length - 1; i >= 0; i--) {
      var cl = clouds[i];
      if (now >= cl.until) { clouds.splice(i, 1); continue; }
      if (cl.kind === "smokepot") smoke(game, cl);
      else splash(game, cl.x, cl.z, cl.r, function (g) { if (cl.kind === "stinkpot") scare(g, cl.x, cl.z, 4); else slow(g, 3); });
      if (Math.random() < 0.3) burst("crumbs", cl.x + (Math.random() - 0.5) * cl.r, gy(game, cl.x, cl.z) + 0.6, cl.z + (Math.random() - 0.5) * cl.r, 3, { col: F.POTS[cl.kind].col });
    }
  }
  // a grump after someone who is in the smoke loses them
  function smoke(game, cl) {
    game.creatures.forEach(function (g) {
      if (!isGrump(g) || g.boss || g.scout || tut(g) || g.heldBy) return;
      var t = g.attn && g.attn.type === "creature" ? SB.Game.byId(game, g.attn.id) : null;
      if (!t || SB.dist(t.x, t.z, cl.x, cl.z) > cl.r) return;
      g.attn = null; g.action = null; g._fSeen = null;
      if (!pins.some(function (p) { return p.id === g.id; })) pin(g, { until: now + 3, search: true, sx: g.x + (g.x - cl.x) * 0.5, sz: g.z + (g.z - cl.z) * 0.5 });
      emit("lostYou", { c: t, g: g, smoke: true });
    });
  }
  // the pod wreck holds one flare
  F.takeFlare = function (game, c) {
    var s = st(game);
    if (s.flare) return { ok: false, msg: "the wreck has no more" };
    if (c.tier < 2) return { ok: false, msg: "you need hands for that" };
    s.flare = day(game);
    if (Sv().add(c, "arkflare", 1) > 0) Sv().spawn(game, "arkflare", 1, c.x, c.z, {});
    say("🎇 an ark flare, still good. one shot: it clears every grump off the island");
    emit("flareFound", { c: c });
    return { ok: true };
  };
  F.flare = function (game, c) {
    if (!Sv().count(c, "arkflare", true)) return { ok: false, msg: "you have no flare" };
    Sv().take(c, "arkflare", 1);
    var n = 0;
    game.creatures.slice().forEach(function (g) {
      if (!isGrump(g) || g.boss || tut(g) || g.heldBy) return;
      g.alive = false; g.gone = true; g.dying = false; n++;
      burst("crumbs", g.x, (g.y || 0) + 0.5, g.z, 10, { col: [1, 0.4, 0.3] });
    });
    var msg = "🎇 the ark flare lit the whole sky. " + (n ? plural(n, "grump") + " ran for the sea" : "there was nothing out there to scare");
    SB.Game.note(game, msg); say(msg); audio("eureka", 0.8);
    emit("arkFlare", { c: c, n: n });
    return { ok: true, n: n, msg: msg };
  };
  F.musky = function (game) { return (st(game).musk || 0) > (game.time || 0); };
  F.musk = function (game, c) {
    if (!Sv().count(c, "musk", true)) return { ok: false, msg: "you have no dark lure" };
    Sv().take(c, "musk", 1);
    st(game).musk = (game.time || 0) + 120; muskT = 0;
    var msg = "🌑 the dark lure is open. grumps will come looking, and drop twice as much";
    say(msg);
    emit("musk", { c: c });
    return { ok: true, msg: msg };
  };
  function muskTick(game, c) {
    if ((muskT -= 2) > 0) return;
    muskT = 14;
    var n = 0; game.creatures.forEach(function (g) { if (isGrump(g) && SB.dist(g.x, g.z, c.x, c.z) < 25) n++; });
    if (n >= 3) return;
    for (var i = 0; i < 6; i++) {
      var a = dice(game) * Math.PI * 2, x = c.x + Math.sin(a) * 13, z = c.z + Math.cos(a) * 13;
      if (!SB.World.walkable(game.world, x, z)) continue;
      var g = SB.Game.spawnGrump(game, x, z);
      g.attn = { type: "creature", id: c.id }; g._musk = 1;
      emit("muskGrump", { c: c, g: g });
      return;
    }
  }

  /* ---------------- thrown and flung: a spear, a sliver of light, a lucky tool ---------------- */
  F.aimGrump = function (game, c, range, fresh) { var t = F.aim(game, c, range, fresh); return t && t.type === "grump" ? t.ref : null; };
  F.farGrump = function (game, c, range) { var t = F.aim(game, c, range); return t && t.type === "grump" && t.d > reachOf(c, t.ref, "spear") ? t.ref : null; };
  F.throwSpear = function (game, c) {
    var s = PS(c), sl = Sv().held(c);
    if (!s || !sl || sl.k !== "spear" || s.swingT > 0) return null;
    var g = F.farGrump(game, c, 8);
    if (!g) return null;
    body(c);
    s.swing = 1; s.swingT = 0.8; s.stam = Math.max(0, s.stam - 0.05);
    arc(game, c, g.x, g.z);
    var keep = !!F.rank(c, "back"), w = sl.w, gx = g.x, gz = g.z;
    var res = F.strike(game, c, g, { ranged: true, dmg: dmgOf("spear") * 1.2, name: lab("spear") });
    if (Bd) Bd.xp(c, "hunt", 1);
    if (!keep) { Sv().removeAt(c, Sv().inv(c).sel, 1); Sv().spawn(game, "spear", 1, gx + 0.3, gz, { w: w }); }
    if (!res.gone) say(keep ? "the spear flies, lands, and comes back to your paw" : "your spear is on the ground by the grump. go and get it");
    res.kept = keep;
    emit("spearThrown", { c: c, g: g, kept: keep });
    return res;
  };
  function sliver(game, c, s, charge, cost) {
    var tg = F.aim(game, c, 7, true);
    if (!tg || tg.type !== "grump") return null;
    if (s.stam < cost) { say("too puffed for a big swing. catch your breath"); return null; }
    s.stam = Math.max(0, s.stam - cost); s.swing = 1; s.swingT = (P().SWING || 0.42) * 1.4;
    arc(game, c, tg.ref.x, tg.ref.z);
    var res = F.strike(game, c, tg.ref, { ranged: true, dmg: dmgOf("crystalblade") * 0.4 * (0.6 + 0.4 * charge), name: "sliver of light", cls: "light" });
    res.sliver = true; res.charge = charge;
    emit("sliver", { c: c, g: tg.ref });
    return res;
  }
  // rub a light mote (or a thought crystal) on an axe or a pick: the next dozen trees or rocks it finishes give one more
  F.imbue = function (game, c) {
    var sl = Sv().held(c), p = sl && isTool(sl.k) ? Sv().power(sl.k) : null;
    if (!p || !(p.wood > 0 || p.stone > 0 || p.ore > 0)) return { ok: false, msg: "hold an axe or a pick first" };
    var m = Sv().count(c, "mote", true) ? "mote" : Sv().count(c, "crystal", true) ? "crystal" : null;
    if (!m) return { ok: false, msg: "you need a light mote or a thought crystal" };
    Sv().take(c, m, 1); sl.lk = 12;
    emit("imbued", { c: c, kind: sl.k });
    return { ok: true, msg: "✨ your " + F.name(sl) + " is lucky now: the next 12 trees or rocks it finishes give one more" };
  };
  function lucky(game, c, k, n) {
    var sl = Sv().held(c);
    if (!sl || !(sl.lk > 0) || !K[k] || !n) return;
    sl.lk--; if (!sl.lk) delete sl.lk;
    Sv().spawn(game, k, 1, n.x + 0.3, n.z + 0.2, { by: c.id });
    say("✨ your lucky " + lab(sl.k) + " shook one more loose");
    emit("luckyDrop", { c: c, kind: k });
  }

  /* ---------------- helpers that stand and fight: ward post, clay guard, log flinger. and the guard post ---------------- */
  struct("wardpost", { noun: "material", label: "ward post", emoji: "🏮", r: 0.3, cost: {}, work: 1, desc: "a light on a stick. grumps are pushed back from it. it burns out." });
  struct("clayguard", { noun: "material", label: "clay guard", emoji: "🗿", r: 0.4, cost: {}, work: 1, desc: "a clay smol with a club. it bonks any grump beside it, until it crumbles." });
  struct("flinger", { noun: "material", label: "log flinger", emoji: "🪵", r: 0.6, cost: {}, work: 1, desc: "a thinker's machine. load it with logs and it flings them at grumps." });
  struct("guardpost", { noun: "material", label: "guard post", emoji: "🛡", r: 0.4, cost: {}, work: 1, desc: "a bounty on grumps every day, and weapons for grump teeth." });
  struct("crystaltree", { noun: "material", label: "crystal tree", emoji: "💎", r: 0.4, cost: {}, work: 1, desc: "it grew from a master's seed. tap it once a day for thought sap." });
  F.TRAPS.wardpost = { tier: 2, cost: { stick: 2, "glowcap|mote|crystal": 1 }, text: "grumps are pushed back from its light. it burns out after a while" };
  F.TRAPS.clayguard = { tier: 3, cost: { clay: 4, stone: 2 }, text: "bonks any grump beside it, until it crumbles" };
  F.TRAPS.flinger = { tier: 5, cost: { log: 4, stone: 2, "vine|fiber": 2 }, text: "load it with logs and it flings them at grumps a long way off" };
  F.TRAPS.guardpost = { tier: 3, cost: { log: 2, stick: 2, tooth: 1 }, text: "a bounty every day, and it trades weapons for grump teeth" };
  F.TRAPS.crystaltree = { tier: 2, hide: 1, cost: { crystalseed: 1 }, text: "tap it once a day for thought sap" };
  F.SEN = { wardpost: { r: 4, every: 1, life: 90 }, clayguard: { r: 2.4, every: 1.5, hp: 8, dmg: 0.6 }, flinger: { r: 12, min: 2.5, every: 5, dmg: 1.5, max: 6 } };
  function senTick(game) {
    if ((senT -= 0.25) <= 0) { senT = 1.5; senList = game.world.structures.filter(function (b) { return !!F.SEN[b.kind]; }); }
    if (!senList.length) return;
    var gs = null, me = PS();
    senList.forEach(function (b) {
      var T = F.SEN[b.kind], d = b.data || (b.data = {});
      if (b._off) return;
      if (T.life && (game.time || 0) - (b.born || 0) > T.life) {
        b._off = true; SB.World.removeStructure(game.world, b); senT = 0;
        if (me && SB.dist(me.c.x, me.c.z, b.x, b.z) < 20) say("🏮 the ward post has burned out");
        emit("sentryGone", { st: b, kind: b.kind });
        return;
      }
      if ((b._t = (b._t || 0) - 0.25) > 0) return;
      if (b.kind === "flinger" && !(d.logs > 0)) return;
      if (!gs) gs = game.creatures.filter(function (o) { return isGrump(o) && !o.heldBy && !tut(o); });
      var best = null, bd = T.r;
      gs.forEach(function (g) { var dd = SB.dist(g.x, g.z, b.x, b.z); if (g.alive && dd <= bd && dd >= (T.min || 0)) { best = g; bd = dd; } });
      if (!best) return;
      b._t = T.every;
      var owner = SB.Game.byId(game, d.by), who = owner && owner.alive ? owner : null;
      if (b.kind === "wardpost") gs.forEach(function (g) { if (g.alive && SB.dist(g.x, g.z, b.x, b.z) <= T.r) { pushAway(game, g, b.x, b.z, 1.2); if (!g.boss) F.addStagger(game, g, 0.8); } });
      else {
        if (b.kind === "flinger") d.logs--;
        if (!best.boss) F.addStagger(game, best, b.kind === "flinger" ? 3 : 1.2);
        zap(game, who, best, T.dmg, SK[b.kind].label, "tribe");
        if (b.kind === "clayguard") {
          d.hp = (d.hp == null ? T.hp : d.hp) - 1;
          if (d.hp <= 0) { b._off = true; SB.World.removeStructure(game.world, b); senT = 0; Sv().spawn(game, "clay", 2, b.x, b.z, {}); emit("sentryGone", { st: b, kind: b.kind }); }
        }
      }
      burst("crumbs", best.x, (best.y || 0) + 0.7, best.z, 6, { col: [1, 0.9, 0.5] });
      emit("sentry", { st: b, g: best, kind: b.kind });
    });
  }
  F.loadFlinger = function (game, c, b) {
    if (!b || b.kind !== "flinger" || !Sv().count(c, "log", true) || (b.data.logs || 0) >= F.SEN.flinger.max) return false;
    Sv().take(c, "log", 1); b.data.logs = (b.data.logs || 0) + 1;
    say("🪵 loaded. " + b.data.logs + " in the flinger"); audio("build", 0.5);
    return true;
  };
  F.tap = function (game, c, b) {
    if (!b || b.kind !== "crystaltree" || b.data.sap === day(game)) return { ok: false };
    b.data.sap = day(game);
    if (Sv().add(c, "thoughtsap", 1) > 0) Sv().spawn(game, "thoughtsap", 1, c.x, c.z, {});
    say("🔷 a bead of thought sap. eat it and the last thing you practised sinks in deeper");
    emit("tapped", { c: c, st: b });
    return { ok: true };
  };
  F.hasPost = function (game, c) { return game.world.structures.some(function (b) { return b.kind === "guardpost" && (!c || SB.dist(b.x, b.z, c.x, c.z) < 8); }); };
  F.bounty = function (game) { var s = st(game), d = day(game); if (!s.bounty || s.bounty.day !== d) s.bounty = { day: d, need: 2 + (d % 3), got: 0, paid: 0 }; return s.bounty; };
  F.bountyText = function (game) { var b = F.bounty(game); return b.paid ? "today's bounty is paid. a new one at dawn" : b.got >= b.need ? "claim the bounty (+" + (3 + b.need) + " ✨)" : "today's bounty: chase off " + plural(b.need, "grump") + " (" + b.got + "/" + b.need + ")"; };
  F.claim = function (game, c) {
    var b = F.bounty(game);
    if (b.paid) return { ok: false, msg: "today's bounty is paid. a new one at dawn" };
    if (b.got < b.need) return { ok: false, msg: "today's bounty: chase off " + plural(b.need, "grump") + " with your own paws (" + b.got + "/" + b.need + ")" };
    b.paid = 1;
    var pay0 = 3 + b.need, coins = game.econ && game.econ.coins ? 3 : 0;
    if (SB.Game.addSparks) SB.Game.addSparks(game, pay0, c);
    if (coins) c.purse = (c.purse || 0) + coins;
    if (Bd) Bd.xp(c, "charm", 2);
    emit("bountyPaid", { c: c, sparks: pay0, coins: coins });
    return { ok: true, sparks: pay0, msg: "📜 bounty paid: +" + pay0 + " ✨" + (coins ? " and " + coins + " coins" : "") };
  };
  F.SHOP = [["club", 1, 2], ["spear", 1, 3], ["arrow", 8, 2], ["shield", 1, 4], ["firepot", 2, 3]]; // what, how many, grump teeth
  F.priceOf = function (c, k) { for (var i = 0; i < F.SHOP.length; i++) if (F.SHOP[i][0] === k) return Math.max(1, F.SHOP[i][2] - (lv(c, "charm") >= 5 ? 1 : 0)); return 0; };
  F.buy = function (game, c, k) {
    var it = null; F.SHOP.forEach(function (x) { if (x[0] === k) it = x; });
    if (!it || !K[k]) return { ok: false, msg: "the post doesn't have that" };
    if (!F.hasPost(game, c)) return { ok: false, msg: "stand by a guard post" };
    var t = F.priceOf(c, k), how;
    if (Sv().count(c, "tooth", true) >= t) { Sv().take(c, "tooth", t); how = plural(t, "grump tooth").replace("tooths", "teeth"); }
    else if (game.econ && game.econ.coins && (c.purse || 0) >= t * 2) { c.purse -= t * 2; how = t * 2 + " coins"; }
    else return { ok: false, msg: "that costs " + t + " grump teeth" + (game.econ && game.econ.coins ? ", or " + t * 2 + " coins" : "") };
    var left = Sv().add(c, k, it[1], isTool(k) ? F.wearFor(k, 1) : undefined);
    if (left > 0) Sv().spawn(game, k, left, c.x, c.z, { by: c.id });
    emit("postBought", { c: c, kind: k, n: it[1] });
    return { ok: true, msg: "the guard post hands over " + (it[1] > 1 ? it[1] + " " + lab(k) + "s" : "a " + lab(k)) + " for " + how };
  };

  /* ---------------- a body that grows ---------------- */
  // quiet skills: nobody tells you about them. they turn up in the grow tab once you have done the thing
  F.MORE = [
    { id: "swim", label: "swimming", emoji: "🏊", perk: "wet fur chills you less", quiet: 1 },
    { id: "climb", label: "climbing", emoji: "🧗", perk: "a side-hop comes back sooner", quiet: 1 },
    { id: "dance", label: "dancing", emoji: "💃", perk: "a hop by the fire gives pep back", quiet: 1 },
    { id: "sneak", label: "sneaking", emoji: "🤫", perk: "grumps have to be closer to notice you" },
    { id: "light", label: "light", emoji: "🔆", perk: "torches, lenses and flasks hit harder" },
    { id: "charm", label: "charm", emoji: "💬", perk: "helpers hit harder, and teachers ask less" },
    { id: "logic", label: "puzzling", emoji: "🧩", perk: "traps hold longer, and carvings teach more" }
  ];
  F.GROUPS3 = [["body", "the body", ["run", "swim", "climb", "dance", "fight", "sneak"]], ["paws", "the paws", ["chop", "mine", "forage", "craft", "cook", "fish", "hunt"]], ["wits", "the wits", ["light", "charm", "logic"]]];
  F.ALL = function () { return (Bd ? Bd.SKILLS : []).concat(F.MORE); };
  F.CALLINGS = {
    fighter: { icon: "🏏", skills: ["fight", "run"], ban: "cook", gear: "a club, a shield and a guard's helm" },
    hunter: { icon: "🏹", skills: ["hunt", "sneak"], ban: "mine", gear: "a bow and a moss cloak" },
    miner: { icon: "⛏", skills: ["mine", "chop"], ban: "fish", gear: "a pick, fire pots and a bark set" },
    fisher: { icon: "🎣", skills: ["fish", "swim"], ban: "fight", gear: "a rod and a fisher's hat" },
    grower: { icon: "🧺", skills: ["forage", "cook"], ban: "hunt", gear: "a basket and a farmer's hat" },
    maker: { icon: "🛠", skills: ["craft", "logic"], ban: "run", gear: "traps, a log flinger and a clay guard" }
  };
  F.passions = function (c) {
    var b = bod(c);
    if (!b.pas || typeof b.pas !== "object") {
      var game = cur0(), r = SB.rng((((game ? game.seed : 1) >>> 0) ^ Math.imul((c.id | 0) + 11, 40503) ^ 0x9a55) >>> 0), cold = [];
      b.pas = {};
      (Bd ? Bd.SKILLS : []).forEach(function (s) { var v = r(); if (v < 0.12) b.pas[s.id] = 2; else if (v < 0.34) b.pas[s.id] = 1; else cold.push(s.id); });
      if (cold.length && r() < 0.3) b.pas[cold[Math.floor(r() * cold.length)]] = -1; // one thing it is all thumbs at
    }
    return b.pas;
  };
  F.passion = function (c, id) { return F.passions(c)[id] || 0; };
  F.xpMul = function (c, id) {
    var p = F.passion(c, id), b = c.body || {}, m = p === 2 ? 2 : p === 1 ? 1.5 : p === -1 ? 0.3 : 1, role = b.role && F.CALLINGS[b.role];
    if (role) { if (role.ban === id) return 0; if (role.skills.indexOf(id) >= 0) m *= 1.5; }
    if (b.wear) { var h = F.wearing(c, "hat"); if (h && F.GEAR[h].xp === id) m *= 1.5; }
    return m;
  };
  // what a skill is worth on top of its level: stars, a calling, a charm
  F.extra = function (c, id) {
    var b = c && c.body, x = 0;
    if (!b) return 0;
    if (b.star && b.star[id]) x += 0.03 * b.star[id];
    if (b.role && F.CALLINGS[b.role] && F.CALLINGS[b.role].skills.indexOf(id) >= 0) x += 0.1;
    if (b.wear && (b.wear.charm || b.wear.charm2) && (F.wearing(c, "charm") === "charm_" + id || F.wearing(c, "charm2") === "charm_" + id)) x += 0.1;
    return x;
  };
  var xp0 = null, inXp = false;
  if (Bd) {
    F.MORE.forEach(function (s) { if (!Bd.BY_ID[s.id]) Bd.BY_ID[s.id] = s; });
    xp0 = Bd.xp;
    var bonus0 = Bd.bonus;
    Bd.xp = function (c, id, n) {
      if (inXp || !c || !Bd.BY_ID[id]) return xp0.call(Bd, c, id, n);
      var b = Bd.of(c), game = cur0();
      n = (n == null ? 1 : n) * F.xpMul(c, id);
      if (!(n > 0)) return 0; // its calling won't have it
      if (game) (b.lu || (b.lu = {}))[id] = day(game);
      b.last = id;
      var s = b.sk[id];
      if (s && s.l >= Bd.MAX) { // past the top, practice fills the mastery bar
        var ml0 = F.masterLeft(c);
        b.mx = (b.mx || 0) + n;
        if (F.masterLeft(c) > ml0) { var me0 = PS(c); if (me0) me0.madeSay = "🌟 mastery! a reward to pick, at the foot of your bag's grow tab"; emit("masteryReady", { c: c, left: F.masterLeft(c) }); } // 4.47: it used to arrive with no word
        return 0;
      }
      if (c._pov) { var bk = b.bank || (b.bank = {}); bk[id] = Math.min(Bd.need(s ? s.l : 0), (bk[id] || 0) + n * F.BANK); } // and a little of it waits for tonight's sleep
      if (F.passion(c, id) === 2 && c.chem) c.chem.bored = Math.max(0, (c.chem.bored || 0) - 0.02); // it loves doing this
      return xp0.call(Bd, c, id, n);
    };
    Bd.bonus = function (c, id) { return bonus0.call(Bd, c, id) + F.extra(c, id); };
    var bagN0 = Sv() && Sv().bagN;
    if (bagN0) Sv().bagN = function (c) { var n = bagN0(c); return n ? n + 2 * (attr(c).bag || 0) : n; };
  }
  F.totalLv = function (c) { var t = 0, b = c && c.body; F.ALL().forEach(function (s) { t += lv(c, s.id); }); if (b && b.star) for (var k in b.star) t += 10 * b.star[k]; return t; };
  F.bodyLv = function (c) { return Math.floor(F.totalLv(c) / 3); };
  F.ATTR = { heart: { max: 5, name: "❤ +1 spare heart" }, pep: { max: 5, name: "⚡ big moves cost less pep" }, bag: { max: 3, name: "🎒 +2 bag slots" } };
  F.attrLeft = function (c) { var a = attr(c); return F.bodyLv(c) - ((a.heart || 0) + (a.pep || 0) + (a.bag || 0)); };
  F.grow = function (game, c, id) {
    var A = F.ATTR[id];
    if (!A) return { ok: false, msg: "that's not a pick" };
    if (F.attrLeft(c) <= 0) return { ok: false, msg: "no pick to spend. every three skill levels gives one" };
    var a = sub(c, "at");
    if ((a[id] || 0) >= A.max) return { ok: false, msg: "that one is as high as it goes" };
    a[id] = (a[id] || 0) + 1;
    if (id === "heart") bod(c).xh = F.spareCap(c);
    if (id === "bag") Sv().inv(c);
    emit("grew", { c: c, id: id, n: a[id] });
    return { ok: true, msg: "⭐ " + A.name.slice(2) + " (" + a[id] + "/" + A.max + ")" };
  };
  // perk stars: one point for every body level, spent along a star shape
  F.TREES = [
    { id: "paw", name: "the paw", stars: [
      { id: "hard", name: "hard paws", ranks: 2, text: "+10% with anything you swing, each rank" },
      { id: "wind", name: "long wind", text: "a side-hop comes back twice as fast" },
      { id: "second", name: "second wind", text: "once a fight, low hearts fill your pep" },
      { id: "bonk", name: "last bonk", text: "every grump you finish goes tumbling in slow time" }] },
    { id: "eye", name: "the eye", stars: [
      { id: "steady", name: "steady paw", ranks: 2, text: "far shots land a tenth more often, each rank" },
      { id: "slowaim", name: "held breath", text: "time slows for a breath at a full draw" },
      { id: "back", name: "homing spear", text: "a thrown spear comes back to your paw" }] },
    { id: "lamp", name: "the lamp", stars: [
      { id: "bright", name: "bright", ranks: 2, text: "your flash reaches 2 paces further, each rank" },
      { id: "quickflash", name: "quick wick", text: "flash again in 8 seconds, not 12" },
      { id: "dawn", name: "little dawn", text: "weapons of light hit a third harder" }] },
    { id: "small", name: "the small body", small: 1, stars: [
      { id: "scurry", name: "scurry", text: "a side-hop carries twice as far" },
      { id: "nip", name: "nip", ranks: 2, text: "bare paws can nip a grump and it hurts, more each rank" },
      { id: "squeak", name: "squeak", text: "a squeak (fight tab) that startles every grump close by" },
      { id: "tiny", name: "underfoot", text: "grumps have to be much closer to notice you" }] }
  ];
  F.STAR = {};
  F.TREES.forEach(function (t) { t.stars.forEach(function (p, i) { p.tree = t; p.i = i; p.ranks = p.ranks || 1; F.STAR[p.id] = p; }); });
  // a small body's stars only shine in a small body (a blob or a critter)
  F.rank = function (c, id) { var p = c && c.body && c.body.pk, r = (p && p[id]) || 0; return r && F.STAR[id] && F.STAR[id].tree.small && c.tier > 1 ? 0 : r; };
  F.perkLeft = function (c) { var p = (c && c.body && c.body.pk) || {}, n = 0; for (var k in p) n += p[k]; return F.bodyLv(c) - n; };
  F.buyPerk = function (game, c, id) {
    var p = F.STAR[id], pk = sub(c, "pk");
    if (!p) return { ok: false, msg: "that's not a star" };
    if (p.tree.small && c.tier > 1) return { ok: false, msg: "those stars are for a blob or a critter" };
    if ((pk[id] || 0) >= p.ranks) return { ok: false, msg: "that star is as bright as it gets" };
    if (p.i > 0 && !pk[p.tree.stars[p.i - 1].id]) return { ok: false, msg: "light " + p.tree.stars[p.i - 1].name + " first" };
    if (F.perkLeft(c) <= 0) return { ok: false, msg: "no star to spend. every three skill levels gives one" };
    pk[id] = (pk[id] || 0) + 1;
    emit("perkStar", { c: c, id: id, rank: pk[id] });
    return { ok: true, msg: "✦ " + p.name + (p.ranks > 1 ? " " + pk[id] + "/" + p.ranks : "") + ": " + p.text };
  };
  F.starSvg = function (t, c) {
    var pk = (c && c.body && c.body.pk) || {}, pts = t.stars.map(function (p, i) { return [14 + i * 30, i % 2 ? 12 : 34]; }), out = "<svg viewBox='0 0 120 46' width='120' height='46' style='display:block'>";
    for (var i = 1; i < pts.length; i++) out += "<line x1='" + pts[i - 1][0] + "' y1='" + pts[i - 1][1] + "' x2='" + pts[i][0] + "' y2='" + pts[i][1] + "' stroke='" + (pk[t.stars[i].id] ? "#ffe9a0" : "#777") + "' stroke-width='1.5'/>";
    t.stars.forEach(function (p, j) {
      var r = pk[p.id] || 0;
      if (r) out += "<circle cx='" + pts[j][0] + "' cy='" + pts[j][1] + "' r='9' fill='#ffe9a0' opacity='0.25'/>";
      out += "<circle cx='" + pts[j][0] + "' cy='" + pts[j][1] + "' r='" + (r ? 3.5 + r : 3.5) + "' fill='" + (r ? "#ffe9a0" : "none") + "' stroke='" + (r ? "#fff6cf" : "#999") + "' stroke-width='1.2'/>";
    });
    return out + "</svg>";
  };
  // past level 10, practice fills a mastery bar; each fill is a pick
  F.MASTERY = [
    { id: "veteran", name: "old paw", text: "a second charm slot and one more spare heart" },
    { id: "maker", name: "maker's eye", text: "everything you make comes out one grade better" },
    { id: "seed", name: "crystal seed", text: "a seed for a crystal tree: tap it each day for thought sap", gives: "crystalseed" },
    { id: "fletch", name: "true flight", text: "your arrows and stones never go wide" },
    { id: "feather", name: "feather feet", text: "a side-hop costs no pep" }
  ];
  F.mastered = function (c, id) { return !!(c && c.body && c.body.mp && c.body.mp[id]); };
  F.masterLeft = function (c) { var b = (c && c.body) || {}, n = 0; for (var k in b.mp || {}) n++; return Math.min(F.MASTERY.length, Math.floor((b.mx || 0) / F.MASTER_STEP)) - n; };
  F.master = function (game, c, id) {
    var m = null; F.MASTERY.forEach(function (x) { if (x.id === id) m = x; });
    if (!m) return { ok: false, msg: "that's not a mastery" };
    if (F.mastered(c, id)) return { ok: false, msg: "you have that one" };
    if (F.masterLeft(c) <= 0) return { ok: false, msg: "fill the mastery bar first: keep using a skill that is at level " + (Bd ? Bd.MAX : 10) };
    sub(c, "mp")[id] = 1;
    if (m.gives && K[m.gives] && Sv().add(c, m.gives, 1) > 0) Sv().spawn(game, m.gives, 1, c.x, c.z, {});
    if (id === "veteran") bod(c).xh = F.spareCap(c);
    emit("mastery", { c: c, id: id });
    return { ok: true, msg: "🌟 mastery: " + m.name + ". " + m.text };
  };
  // start a level-10 skill again for a star. the star is worth 3% for good, and counts ten levels toward your body level
  F.legend = function (game, c, id) {
    if (!Bd || !Bd.BY_ID[id]) return { ok: false, msg: "that's not a skill" };
    if (lv(c, id) < Bd.MAX) return { ok: false, msg: "reach level " + Bd.MAX + " first" };
    var b = Bd.of(c), stars = sub(c, "star");
    b.sk[id] = { l: 0, x: 0 }; stars[id] = (stars[id] || 0) + 1;
    emit("legend", { c: c, id: id, stars: stars[id] });
    return { ok: true, msg: "★ " + Bd.BY_ID[id].label + " starts again, with a star: +3% for good, and you keep learning" };
  };
  F.call = function (game, c, id) {
    var R = F.CALLINGS[id], b = bod(c);
    if (!R) return { ok: false, msg: "that's not a calling" };
    if (b.role) return { ok: false, msg: c.name + " is a " + b.role + " already" };
    b.role = id;
    emit("calling", { c: c, id: id });
    return { ok: true, msg: R.icon + " " + c.name + " is a " + id + " now: quicker at " + R.skills.map(function (s) { return Bd ? Bd.BY_ID[s].label : s; }).join(" and ") + ", and done with " + (Bd ? Bd.BY_ID[R.ban].label : R.ban) };
  };
  // carvings (a story pole, a ruin, a town book): each teaches one thing, once
  F.hasRead = function (c, key) { return !!(c && c.body && c.body.rd && c.body.rd[key]); };
  F.study = function (game, c, key) {
    if (!Bd) return { ok: false };
    if (F.hasRead(c, key)) return { ok: false, msg: "you've read these already" };
    sub(c, "rd")[key] = 1;
    var all = F.ALL(), h = game.seed >>> 0, i, sk = null;
    for (i = 0; i < key.length; i++) h = (Math.imul(h, 31) + key.charCodeAt(i)) >>> 0;
    for (i = 0; i < all.length && !sk; i++) { var cand = all[(h + i) % all.length]; if (lv(c, cand.id) < Bd.MAX && F.xpMul(c, cand.id) > 0) sk = cand; }
    var what = key.charAt(0) === "t" ? "the carvings show" : key.charAt(0) === "r" ? "the book shows" : "this place shows you"; // 4.47: a lookout has no carvings
    if (!sk) return { ok: true, msg: key.charAt(0) === "t" ? "old carvings. nothing in them you don't know" : "nothing here you don't know" };
    var l0 = lv(c, sk.id), n = Math.ceil(Bd.need(l0) * (1 + bonus(c, "logic")));
    inXp = true; try { xp0.call(Bd, c, sk.id, n); } finally { inXp = false; } // a whole level's worth, whatever its passions
    Bd.xp(c, "logic", 2);
    var msg = "📖 " + what + " a trick of " + sk.label + ". you'll remember it";
    say(msg);
    emit("studied", { c: c, key: key, skill: sk.id, n: n });
    return { ok: true, skill: sk.id, msg: msg };
  };
  // smols with a job teach its skill, for coins or a gift
  F.TEACH = { farmer: "forage", fisher: "fish", potter: "craft", smith: "mine", builder: "chop", trader: "charm", teacher: "logic", guard: "fight", scribe: "logic" };
  F.trainers = function (game, c) { var out = []; near(game, c.x, c.z, 6, function (o) { if (o !== c && o.species === "smol" && o.alive && !o.asleep && o.job && F.TEACH[o.job]) out.push(o); }); return out; };
  F.price = function (c) { return Math.max(1, 3 - Math.floor(lv(c, "charm") / 4)); };
  F.learnFrom = function (game, c, o) {
    if (!Bd || !o || !o.alive || !F.TEACH[o.job]) return { ok: false, msg: "nobody here to learn from" };
    if (SB.dist(o.x, o.z, c.x, c.z) > 7) return { ok: false, msg: o.name + " is too far away" };
    var id = F.TEACH[o.job], tr = sub(c, "tr"), d = day(game);
    if (tr[o.id] === d) return { ok: false, msg: o.name + " has shown you enough for today" };
    if (lv(c, id) >= Bd.MAX) return { ok: false, msg: o.name + " has nothing left to teach you" };
    if (F.xpMul(c, id) <= 0) return { ok: false, msg: "a " + c.body.role + " won't learn " + Bd.BY_ID[id].label };
    var price = F.price(c), paid;
    if (game.econ && game.econ.coins && (c.purse || 0) >= price) { c.purse -= price; o.purse = (o.purse || 0) + price; paid = plural(price, "coin"); }
    else {
      var sl = Sv().held(c);
      if (!sl || isTool(sl.k)) return { ok: false, msg: "hold a gift for " + o.name + " (food, or something nice)" + (game.econ && game.econ.coins ? ", or bring " + plural(price, "coin") : "") };
      paid = "a " + lab(sl.k); Sv().removeAt(c, Sv().inv(c).sel, 1);
    }
    tr[o.id] = d;
    var n = Math.max(3, Math.round(Bd.need(lv(c, id)) * 0.4));
    Bd.xp(c, id, n); Bd.xp(c, "charm", 1);
    if (SB.Creature.emote) SB.Creature.emote(o, "happy", 2);
    emit("taughtSkill", { c: c, by: o, skill: id, n: n });
    return { ok: true, skill: id, msg: "🏫 " + o.name + " the " + o.job + " shows you a thing or two about " + Bd.BY_ID[id].label + " (for " + paid + ")" };
  };
  // sparring: soft bonks for practice, and ranks. a sulking teen gets guard drills instead of a telling-off
  F.RANKS = [[0, "pup"], [2, "scrapper"], [4, "guard"], [7, "warden"], [10, "master-at-arms"]];
  F.rankOf = function (c) { var l = lv(c, "fight") + 10 * (((c && c.body && c.body.star) || {}).fight || 0), r = F.RANKS[0][1]; F.RANKS.forEach(function (x) { if (l >= x[0]) r = x[1]; }); return r; };
  F.pals = function (game, c) { var out = []; near(game, c.x, c.z, 5, function (o) { if (o !== c && o.species === "smol" && o.alive && !o.asleep && o.stage >= 2 && !o.stranger) out.push(o); }); return out; };
  F.spar = function (game, c, o) {
    var s = PS(c);
    if (!Bd || !s || !o || !o.alive || o.species !== "smol" || o.asleep || o.stage < 2) return { ok: false, msg: "nobody to spar with" };
    if (SB.dist(o.x, o.z, c.x, c.z) > 6) return { ok: false, msg: o.name + " is too far away" };
    if (now < sparT) return { ok: false, msg: "catch your breath first" };
    if (s.stam < 0.1) return { ok: false, msg: "too puffed to spar" };
    sparT = now + 20; s.stam = Math.max(0, s.stam - 0.1);
    var was = F.rankOf(c), drill = o.stage === 2 || !!o.tantrum;
    Bd.xp(c, "fight", 2); Bd.xp(o, "fight", 2); Bd.xp(c, "charm", 1);
    if (drill) { o.tantrum = null; SB.Chem.apply(o.chem, { anger: -0.4, bored: -0.3 }); Bd.of(o).drill = day(game); Bd.xp(o, "fight", 2); }
    else SB.Chem.apply(o.chem, { bored: -0.2, lonely: -0.1 });
    if (SB.Creature.emote) SB.Creature.emote(o, "happy", 2);
    audio("bonk", 0.4);
    var rk = F.rankOf(c), msg = (drill ? "🥋 you put " + o.name + " through guard drills. the sulk is gone, and it stands a little straighter" : "🥋 you and " + o.name + " (a " + F.rankOf(o) + ") trade soft bonks. nobody is hurt") + (rk !== was ? ". you're a " + rk + " now" : "");
    emit("spar", { c: c, o: o, drill: drill, rank: rk });
    return { ok: true, drill: drill, rank: rk, msg: msg };
  };
  // a day plan a smol leans toward, and what it does when grumps come
  F.PLANS = {
    lark: { name: "early bird", icon: "🌅", text: "sleeps early, works the morning, plays before dusk", sleep: [[0.74, 1], [0, 0.12]], play: [[0.58, 0.74]] },
    owl: { name: "night owl", icon: "🦉", text: "sleeps the morning away, works late, plays at noon", sleep: [[0.14, 0.42]], play: [[0.42, 0.56]] },
    steady: { name: "as it likes", icon: "🙂", text: "no plan" }
  };
  F.slot = function (plan, frac) {
    function inside(L) { return !!L && L.some(function (r) { return frac >= r[0] && frac < r[1]; }); }
    return !plan || !plan.sleep ? null : inside(plan.sleep) ? "sleep" : inside(plan.play) ? "play" : "work";
  };
  F.setDay = function (game, c, id, all) {
    if (!F.PLANS[id]) return { ok: false, msg: "that's not a plan" };
    var who = all ? SB.Game.smols(game).filter(function (o) { return o.alive && o.tribe === c.tribe; }) : [c];
    who.forEach(function (o) { var b = bod(o); if (id === "steady") delete b.day; else b.day = id; });
    emit("dayPlan", { c: c, id: id, n: who.length });
    return { ok: true, n: who.length, msg: F.PLANS[id].icon + " " + (all ? "everyone" : c.name) + ": " + F.PLANS[id].name + (F.PLANS[id].sleep ? " (" + F.PLANS[id].text + ")" : "") };
  };
  F.RESP = { stand: { name: "stand and fight", icon: "🏏" }, hide: { name: "run and hide", icon: "🙈" }, own: { name: "as it likes", icon: "🙂" } };
  F.setResp = function (game, c, id) {
    if (!F.RESP[id]) return { ok: false, msg: "that's not a choice" };
    var b = bod(c);
    if (id === "own") delete b.resp; else b.resp = id;
    emit("hostility", { c: c, id: id });
    return { ok: true, msg: F.RESP[id].icon + " when grumps come, " + c.name + " will " + (id === "own" ? "do as it likes" : F.RESP[id].name) + (id === "own" ? "" : " (when you are not in its paws)") };
  };
  function lean(o, slot) {
    var ch = o.chem;
    if (slot === "sleep") ch.sleepy = Math.min(1, (ch.sleepy || 0) + 0.04);
    else if (slot === "play") ch.bored = Math.min(1, (ch.bored || 0) + 0.04);
    else { ch.bored = Math.max(0, (ch.bored || 0) - 0.03); ch.sleepy = Math.max(0, (ch.sleepy || 0) - 0.02); }
  }
  // skills go rusty when they are left alone (never a passion, never a starred skill, never below level 3)
  function newDay(game, d) {
    if (!Bd) return;
    SB.Game.smols(game).forEach(function (o) {
      var b = o.body;
      if (!b || !b.sk) return;
      var lu = b.lu || (b.lu = {});
      Bd.SKILLS.forEach(function (sk) {
        var s = b.sk[sk.id];
        if (!s || s.l < 4) return;
        if (lu[sk.id] == null) { lu[sk.id] = d; return; }
        if (d - lu[sk.id] < F.DECAY_DAYS || (b.pas && b.pas[sk.id] > 0) || (b.star && b.star[sk.id])) return;
        s.x -= 3;
        if (s.x < 0) { if (s.l > 3 && s.l < Bd.MAX) { s.l--; s.x = Math.max(0, Bd.need(s.l) + s.x); if (o._pov) say("your " + sk.label + " has gone a little rusty"); emit("skillRust", { c: o, id: sk.id, level: s.l }); } else s.x = 0; }
      });
    });
  }
  F._newDay = newDay;
  function slowTick(game) {
    var d = day(game), me = PS(), mc = me && me.game === game && !lesson(me) ? me.c : null;
    if (d !== lastDay) { if (lastDay != null && d > lastDay) newDay(game, d); lastDay = d; }
    if (mc && F.musky(game)) muskTick(game, mc);
    var frac = ((game.time || 0) % SB.DAY_LENGTH) / SB.DAY_LENGTH, gs = null, dummies = null, drill = (++drillN % 5) === 0;
    SB.Game.smols(game).forEach(function (o) {
      var b = o.body;
      if (!o.alive || o === mc || (!b && o.job !== "guard")) return;
      if (b && b.day && F.PLANS[b.day] && !o.asleep) { var sl = F.slot(F.PLANS[b.day], frac); if (sl) lean(o, sl); }
      if (b && b.resp) {
        if (!gs) gs = game.creatures.filter(isGrump);
        if (gs.some(function (g) { return SB.dist(g.x, g.z, o.x, o.z) < 10; })) SB.Chem.apply(o.chem, b.resp === "stand" ? { fear: -0.15, anger: 0.08 } : { fear: 0.15 });
      }
      // guards (and teens you drilled) keep practising on a dummy
      if (drill && Bd && !o.asleep && (o.job === "guard" || (b && b.drill != null && d - b.drill <= 3)) && lv(o, "fight") < 6) {
        if (!dummies) dummies = game.world.structures.filter(function (x) { return x.kind === "dummy"; });
        if (dummies.some(function (x) { return SB.dist(x.x, x.z, o.x, o.z) < 12; })) { Bd.xp(o, "fight", 1); emit("guardDrill", { c: o }); }
      }
    });
    if (!mc) return;
    // a guard's helm draws grumps off the others; a moss cloak lets you slip their notice
    if (F.gearSum(mc, "taunt")) game.creatures.forEach(function (g) {
      if (!isGrump(g) || g.boss || g.scout || tut(g) || pinned(g) || SB.dist(g.x, g.z, mc.x, mc.z) > 9) return;
      if (g.attn && g.attn.type === "creature" && g.attn.id !== mc.id) { g.attn = { type: "creature", id: mc.id }; g.action = null; emit("taunted", { c: mc, g: g }); }
    });
    if (F.gearSum(mc, "quiet") && !F.sneaking(mc)) game.creatures.forEach(function (g) {
      if (!isGrump(g) || g.boss || g.scout || tut(g) || g.heldBy || pins.some(function (p) { return p.id === g.id; })) return;
      var dd = SB.dist(g.x, g.z, mc.x, mc.z);
      if (dd < 7 || dd > 16 || (g._fSeen != null && now - g._fSeen < 8) || !F.aware(g, mc)) return;
      g.attn = null; g.action = null; pin(g, { until: now + 4, search: true, sx: mc.x, sz: mc.z }); emit("lostYou", { c: mc, g: g, moss: true });
    });
    // second wind: once a fight, low hearts fill your pep
    if (F.rank(mc, "second")) { var near = !!nearestGrump(game, mc, 8); if (!near) me.wind2 = false; else if (!me.wind2 && mc.chem.health < 0.35) { me.wind2 = true; me.stam = 1; say("💨 second wind!"); emit("secondWind", { c: mc }); } }
  }
  function dream(game, c) {
    var b = c.body, bk = b && b.bank, names = [], tot = 0;
    if (!b || !Bd) return 0;
    b.xh = F.spareCap(c);
    if (!bk) return 0;
    inXp = true;
    try { for (var id in bk) { var n = Math.round(bk[id]); if (n >= 1 && Bd.BY_ID[id] && lv(c, id) < Bd.MAX) { xp0.call(Bd, c, id, n); tot += n; names.push(Bd.BY_ID[id].label); } } } finally { inXp = false; }
    b.bank = {};
    if (tot) { say("💤 you dreamt the day over: +" + tot + " practice (" + names.slice(0, 3).join(", ") + ")"); emit("dreamt", { c: c, n: tot }); }
    return tot;
  }
  F._dream = dream;
  F.banked = function (c) { var bk = c && c.body && c.body.bank, t = 0; for (var k in bk || {}) t += bk[k]; return Math.round(t); };
  // every frame in a body: spare hearts, the dream bank, and the quiet skills that grow by doing
  function growTick(game, c, s, dt) {
    var b = c.body;
    if (!b || !Bd) return;
    var cap = F.spareCap(c);
    if ((b.xh || 0) > cap) b.xh = cap;
    else if (cap > 0 && (b.xh || 0) < cap && now - biteT > 10) b.xh = Math.min(cap, (b.xh || 0) + dt * F.HEART / 30);
    if (c.asleep) sleepT += dt; else if (sleepT > 0) { if (sleepT >= 12) dream(game, c); sleepT = 0; }
    if (c.chem.cold > 0 && F.setOf(c) === "fur") c.chem.cold = Math.max(0, c.chem.cold - dt * 0.05);
    if (lesson(s)) return;
    var air = c.onGround === false;
    if (air && !wasAir && Sv().nearFire(c, game, 4)) { Bd.xp(c, "dance", 1); s.stam = Math.min(1, s.stam + 0.01 * (1 + lv(c, "dance"))); }
    wasAir = air;
    if ((skT += dt) < 1) return;
    skT = 0;
    if (!flareChk) { flareChk = true; var fs0 = st(game); if (!fs0.flare && c.tier >= 2 && ((game.logsFound || 0) > 0 || day(game) >= 2)) { fs0.flare = day(game); if (Sv().add(c, "arkflare", 1) > 0) Sv().spawn(game, "arkflare", 1, c.x, c.z, {}); s.madeSay = "🎇 an ark flare from the pod wreck was in your pack all along. one shot: it clears every grump off the island"; emit("flareFound", { c: c, old: true }); } } // nobody has opened a crashed pod by the second day (or they were opened long ago): it was in the wreck you came in
    var y = gy(game, c.x, c.z), mv = Math.hypot(c.x - sx0, c.z - sz0);
    sx0 = c.x; sz0 = c.z;
    if (lastY != null && y > lastY && mv < 8) { climbA += y - lastY; if (climbA >= 3) { climbA -= 3; Bd.xp(c, "climb", 1); } }
    lastY = y;
    if (Bd.inWater(game.world, c)) {
      if (mv > 0.3 && ++swimA >= 3) { swimA = 0; Bd.xp(c, "swim", 1); }
    } else if (b.wet > 0.3 && c.chem.cold > 0) c.chem.cold = Math.max(0, c.chem.cold - 0.012 * b.wet * Math.min(1, lv(c, "swim") * 0.1)); // a swimmer's fur sheds the chill
    if (F.sneaking(c) && nearestGrump(game, c, 12) && ++sneakA >= 4) { sneakA = 0; Bd.xp(c, "sneak", 1); }
  }
  F.doIt = function (game, c, what) {
    if (what === "dash") return F.dash(game, c);
    if (what === "mark") { var g = nearestGrump(game, c, 16); if (!g) return { ok: false, msg: "no grump close enough to mark" }; F.mark(game, c, g); return { ok: true }; }
    if (what === "flash") return F.flash(game, c);
    if (what === "setmove") return F.setMove(game, c);
    if (what === "squeak") return F.squeak(game, c);
    if (what === "imbue") return F.imbue(game, c);
    if (what === "musk") return F.musk(game, c);
    if (what === "stone") return F.distract(game, c);
    if (what === "flare") return F.flare(game, c);
    return { ok: false };
  };

  /* ---------------- what a beaten grump leaves, and the rest of the bus ---------------- */
  F.RAR = [{ name: "common", col: "#b8c0c8" }, { name: "uncommon", col: "#5fd08a" }, { name: "rare", col: "#b58cff" }];
  F.DROPS = [{ k: "tuft", p: 0.18, rar: 1 }, { k: "heartfruit", p: 0.07, rar: 2 }, { k: "nightpearl", p: 0.05, rar: 2 }, { spark: 1, p: 0.15, rar: 1 }];
  var hooked2 = false;
  F.hook2 = function () {
    if (hooked2 || !SB.bus) return; hooked2 = true;
    var on = SB.bus.on.bind(SB.bus);
    function pov(d) { return d && d.c && d.c._pov ? cur0() : null; }
    function ai(d) { return Bd && d && d.c && !d.c._pov && d.c.species === "smol" && d.c.alive; }
    on("grumpChased", function (d) {
      var game = pov(d);
      if (ai(d) && !d.pet) Bd.xp(d.c, "fight", 3);
      if (!game || game.offline || !d.g) return;
      var s = st(game);
      if (mark === d.g.id) mark = null;
      if (!d.g.boss && F.LOOT > 0) {
        var k = F.LOOT * (1 + 0.25 * Math.max(0, (d.g.tough || 1) - 1)) * (F.musky(game) ? 2 : 1), log = s.drops || (s.drops = {});
        F.DROPS.forEach(function (dr, i) {
          if (dice(game) >= dr.p * k) return;
          if (dr.spark) { if (SB.Game.addSparks) SB.Game.addSparks(game, 1, d.g); }
          else if (K[dr.k]) Sv().spawn(game, dr.k, 1, d.g.x - 0.3 + i * 0.2, d.g.z + 0.3, {});
          else return;
          log[dr.k || "spark"] = (log[dr.k || "spark"] || 0) + 1;
          emit("grumpDrop", { c: d.c, g: d.g, kind: dr.k || "spark", rar: dr.rar });
          if (dr.rar === 2) say("✨ a rare drop: a " + lab(dr.k));
        });
      }
      if (F.hasPost(game)) { var b = F.bounty(game); if (!b.paid && b.got < b.need) { b.got++; if (b.got === b.need) say("📜 that's today's bounty done. claim it at the guard post"); } }
    });
    on("grumpDrop", function (d) { var game = pov(d); if (game && d.kind === "tooth") { var s = st(game); (s.drops || (s.drops = {})).tooth = (s.drops.tooth || 0) + 1; } });
    on("rockGone", function (d) {
      var game = pov(d);
      if (!game || !d.node) return;
      lucky(game, d.c, (Sv().rockOf(d.node) || {}).item || "stone", d.node);
      if (!(F.BEETLES > 0) || dice(game) >= F.BEETLES) return;
      Sv().spawn(game, "beetle", 1, d.node.x + 0.3, d.node.z, {}); Sv().spawn(game, "beetle", 1, d.node.x - 0.3, d.node.z + 0.2, {});
      d.c.chem.health = Math.max(0.1, d.c.chem.health - 0.03); hp0 = d.c.chem.health;
      say("🐞 beetles! they were hiding in the rock, and one nipped you");
      emit("infested", { c: d.c, node: d.node });
    });
    on("chop", function (d) { var game = pov(d); if (game && d.pov) lucky(game, d.c, "log", d.node); else if (ai(d)) Bd.xp(d.c, "chop", 1); });
    on("craft", function (d) {
      if (ai(d) && !d.pov) { Bd.xp(d.c, "craft", 1); return; }
      var game = pov(d);
      if (!game || !Bd || !d.id) return;
      var made = sub(d.c, "md"); // the first time you make a thing is a puzzle solved
      if (!made[d.id]) { made[d.id] = 1; Bd.xp(d.c, "logic", 1); }
    });
    on("hunt", function (d) { if (ai(d)) Bd.xp(d.c, "hunt", 2); });
    on("fish", function (d) { if (ai(d)) Bd.xp(d.c, "fish", 2); });
    on("povEat", function (d) {
      if (!pov(d) || d.kind !== "thoughtsap" || !Bd) return;
      var b = Bd.of(d.c), id = b.last && lv(d.c, b.last) < Bd.MAX ? b.last : null;
      if (!id) F.ALL().forEach(function (s) { if (!id && lv(d.c, s.id) < Bd.MAX) id = s.id; });
      if (!id) return;
      Bd.xp(d.c, id, 6);
      say("🔷 it tastes of thinking. your " + Bd.BY_ID[id].label + " sinks in deeper");
      emit("sapEaten", { c: d.c, skill: id });
    });
    on("podOpened", function (d) { // the first pod anyone opens has a flare in it
      var game = cur0(), s = game && st(game);
      if (!s || s.flare || !d || !d.site || !K.arkflare) return;
      s.flare = day(game);
      Sv().spawn(game, "arkflare", 1, d.site.x + 0.6, d.site.z + 0.4, {});
      if (SB.Game.note) SB.Game.note(game, "🎇 an ark flare lay in the pod. it is on the ground by the wreck: the island's only one, so have a smol pick it up"); // 4.47: it used to land with no word
      emit("flareFound", { c: d.c || null, site: d.site });
    });
    on("poiUsed", function (d) { var game = pov(d); if (game && d.st && d.st.id != null) F.study(game, d.c, "p" + d.st.id); });
    on("townRead", function (d) { var game = pov(d); if (game && d.idea) F.study(game, d.c, "r" + d.idea); });
    // a fall shakes the day's banked practice out of your head; whoever was following you is by your bed when you wake
    on("respawn", function (d) {
      var game = cur0();
      if (!game || !d || !d.c) return;
      var b = d.c.body, lost = F.banked(d.c), n = 0;
      if (b && b.bank) b.bank = {};
      if (SB.Friends && SB.Friends.followers) SB.Friends.followers(game).forEach(function (o, i) {
        if (!o || !o.alive || o === d.c) return;
        var x = d.c.x + 1 + i * 0.6, z = d.c.z + 0.8;
        if (SB.World.walkable(game.world, x, z)) { o.x = x; o.z = z; o.px = x; o.pz = z; o.action = null; n++; }
      });
      emit("wokeTogether", { c: d.c, lost: lost, rejoined: n });
    });
    on("skillUp", function (d) {
      if (!d || !PS(d.c)) return;
      var b = d.c.body;
      if (F.totalLv(d.c) % 3 === 0) { var me = PS(d.c); me.madeSay = "⭐ body level " + F.bodyLv(d.c) + "! a pick and a star to spend (bag, grow tab)"; emit("bodyLevel", { c: d.c, level: F.bodyLv(d.c) }); }
      if (b && F.spareCap(d.c) > (b.xh || 0) && d.id === "fight") b.xh = F.spareCap(d.c);
    });
  };
  F.hook2();

  /* ---------------- the tabs ---------------- */
  function row(btns) { return "<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>" + btns + "</div>"; }
  function btn(attrName, val, text, on, dis) { return "<button class='btn" + (on ? " go" : "") + "' data-" + attrName + "='" + val + "'" + (dis ? " disabled" : "") + ">" + text + "</button>"; }
  function help(t) { return "<div class='help'>" + t + "</div>"; }
  // the fight tab's second half: moves, what you wear, your other paw, the four ways to fight, the guard post, drops
  F.html2 = function (game, c, icon) {
    var out = "", Surv = Sv(), v = Surv.inv(c), seen = {}, wear = "", offs = "", set = F.setOf(c), s = st(game);
    var mv = btn("fdo", "dash", "💨 hop aside") + btn("fdo", "mark", "🎯 mark the nearest grump");
    if (F.lightIn(c)) mv += btn("fdo", "flash", "✴ flash your light", false, !F.flashReady());
    if (set) mv += btn("fdo", "setmove", F.SETS[set].icon + " " + F.SETS[set].move, false, now < moveT);
    if (F.rank(c, "squeak")) mv += btn("fdo", "squeak", "❗ squeak", false, now < moveT);
    if (Surv.count(c, "stone", true)) mv += btn("fdo", "stone", "🪨 toss a stone past a grump");
    var hs = Surv.held(c), hp = hs && isTool(hs.k) ? Surv.power(hs.k) : null;
    if (hp && (hp.wood > 0 || hp.stone > 0 || hp.ore > 0) && !hs.lk && (Surv.count(c, "mote", true) || Surv.count(c, "crystal", true))) mv += btn("fdo", "imbue", "✨ make your " + esc(lab(hs.k)) + " lucky");
    out += row(mv);
    for (var i = 0; i < v.s.length; i++) {
      var sl = v.s[i];
      if (!sl || seen[sl.k]) continue;
      seen[sl.k] = 1;
      if (F.GEAR[sl.k] && !SB.Wear) wear += btn("fwear", sl.k, (F.isWorn(c, sl.k) ? "✓ " : "") + esc(lab(sl.k)), F.isWorn(c, sl.k));
      if (F.OFFOK[sl.k] && c.tier >= 2 && (i !== v.sel || sl.n > 1)) offs += btn("foff", sl.k, (F.off(c) === sl.k ? "✓ " : "") + esc(lab(sl.k)), F.off(c) === sl.k);
    }
    if (wear || (SB.Wear && SB.Wear.on(c).length)) {
      var th = F.gearSum(c, "thorns");
      out += "<div class='lbl'>wear · armour " + pct(F.armour(game, c)) + "</div>" + row(wear) + help(set ? "✓ the whole " + set + " set, <b>" + esc(F.SETS[set].name) + "</b>: " + esc(F.SETS[set].text) + ". its move: " + esc(F.SETS[set].moveText) : "a hat, a cloak or vest, and boots. three of one kind (fur, bark, copper) is a set, with a bonus and a move" + (th ? ". your cloak pricks whatever bites you" : ""));
    }
    if (offs) out += "<div class='lbl'>your other paw</div>" + row(offs) + help("a torch beside a club. two light weapons swing faster. a shield there can bash");
    var cl = F.CLASSES.map(function (x) { return x[1] + " " + x[0] + " +" + pct(bonus(c, x[2])); }).join(" · ");
    out += help("four ways to fight, each with its own skill: " + cl);
    if (F.hasPost(game, c)) {
      out += "<div class='lbl'>🛡 the guard post</div>" + help(esc(F.bountyText(game))) + "<div class='rlist'>";
      F.SHOP.forEach(function (x) { if (K[x[0]]) out += "<div class='rc'><span class='big'>" + icon(x[0], 28) + "</span><div class='t'>" + (x[1] > 1 ? x[1] + " " : "") + esc(lab(x[0])) + (x[1] > 1 ? "s" : "") + "<small>" + F.priceOf(c, x[0]) + " grump teeth</small></div>" + btn("fbuy", x[0], "trade") + "</div>"; });
      out += "</div>";
    }
    var dl = Object.keys(s.drops || {}).map(function (k) {
      var rar = k === "tooth" ? 0 : 1; F.DROPS.forEach(function (dr) { if ((dr.k || "spark") === k) rar = dr.rar; });
      return "<span style='color:" + F.RAR[rar].col + "' title='" + F.RAR[rar].name + "'>● " + (k === "spark" ? "spark" : esc(lab(k))) + " ×" + s.drops[k] + "</span>";
    });
    if (dl.length) out += help("grumps have dropped: " + dl.join(" "));
    return out;
  };
  F.CLASSES = [["paw", "🐾", "fight"], ["shot", "🏹", "hunt"], ["light", "🔆", "light"], ["helpers", "🤝", "charm"]];
  // the grow tab: skills, stars, and the tribe
  F.htmlGrow = function (game, c) {
    if (!Bd) return "";
    var b = Bd.of(c), out = "", tl = F.totalLv(c), bl = F.bodyLv(c), a = attr(c), R0 = b.role && F.CALLINGS[b.role];
    out += row([["skills", "📈 skills"], ["stars", "✦ stars"], ["tribe", "🏘 tribe"]].map(function (p) { return btn("gpage", p[0], p[1], growG === p[0]); }).join(""));
    out += "<div class='lbl'>" + esc(c.name) + " · body level " + bl + " · a " + F.rankOf(c) + (R0 ? " · " + esc(b.role) : "") + "</div>";
    out += "<div class='sk'><span>⭐</span><span>next level</span><span class='bar'><b style='width:" + Math.round((tl % 3) / 3 * 100) + "%'></b></span><span>" + (tl % 3) + "/3</span></div>";
    if (growG === "skills") {
      if (F.attrLeft(c) > 0) out += help("a pick to spend:") + row(Object.keys(F.ATTR).map(function (k) { return btn("gattr", k, F.ATTR[k].name + " (" + (a[k] || 0) + "/" + F.ATTR[k].max + ")", true, (a[k] || 0) >= F.ATTR[k].max); }).join(""));
      else out += help("every three skill levels is a body level: a pick (❤ " + (a.heart || 0) + " · ⚡ " + (a.pep || 0) + " · 🎒 " + (a.bag || 0) + ") and a star");
      F.GROUPS3.forEach(function (gp) {
        var lines = "";
        gp[2].forEach(function (id) {
          var sk = Bd.BY_ID[id], l = lv(c, id), p = Bd.progress(c, id), pas = F.passion(c, id), stars = (b.star && b.star[id]) || 0, ban = !!R0 && R0.ban === id;
          if (!sk || (sk.quiet && !l && !p)) return;
          lines += "<div class='sk" + (l || p ? "" : " zero") + "' title='" + esc(sk.perk) + "'><span>" + sk.emoji + "</span><span>" + sk.label + (pas === 2 ? " 🔥🔥" : pas === 1 ? " 🔥" : pas === -1 ? " 💤" : "") + (stars ? " " + new Array(stars + 1).join("★") : "") + (ban ? " 🚫" : "") + "</span><span class='bar'><b style='width:" + Math.round(p * 100) + "%'></b></span><span>" + l + "</span></div>";
          if (l >= Bd.MAX) lines += row(btn("glegend", id, "★ start " + sk.label + " again for a star"));
        });
        if (lines) out += "<div class='lbl'>" + gp[1] + "</div>" + lines;
      });
      out += help("🔥 it learns this faster, and likes doing it · 💤 all thumbs · 🚫 its calling won't have it. skills left alone for " + F.DECAY_DAYS + " days go a little rusty");
      if (F.banked(c)) out += help("💤 waiting for tonight's sleep: " + F.banked(c) + " practice. a fall loses it");
      var mx = b.mx || 0;
      if (mx > 0 || F.masterLeft(c) > 0 || b.mp) {
        out += "<div class='lbl'>mastery</div><div class='sk'><span>🌟</span><span>past level " + Bd.MAX + "</span><span class='bar'><b style='width:" + Math.round((mx % F.MASTER_STEP) / F.MASTER_STEP * 100) + "%'></b></span><span>" + Math.floor(mx / F.MASTER_STEP) + "</span></div>";
        F.MASTERY.forEach(function (m) { out += F.mastered(c, m.id) ? help("✓ <b>" + m.name + "</b> · " + m.text) : F.masterLeft(c) > 0 ? row(btn("gmaster", m.id, m.name + " · " + m.text, true)) : help("🔒 <b>" + m.name + "</b> · " + m.text); });
      }
    } else if (growG === "stars") {
      out += help("stars to spend: <b>" + Math.max(0, F.perkLeft(c)) + "</b>. light them in order, left to right");
      F.TREES.forEach(function (t) {
        if (t.small && c.tier > 1 && !t.stars.some(function (p) { return (b.pk || {})[p.id]; })) return;
        out += "<div class='lbl'>" + t.name + (t.small ? " (a blob or a critter)" : "") + "</div>" + F.starSvg(t, c);
        t.stars.forEach(function (p, i) {
          var r = (b.pk || {})[p.id] || 0, open = (i === 0 || (b.pk || {})[t.stars[i - 1].id]) && r < p.ranks && F.perkLeft(c) > 0 && !(t.small && c.tier > 1);
          out += open ? row(btn("gperk", p.id, "✦ " + p.name + (p.ranks > 1 ? " " + r + "/" + p.ranks : "") + " · " + p.text, true)) : help((r >= p.ranks ? "✓ " : r ? "✦ " + r + "/" + p.ranks + " " : "· ") + "<b>" + p.name + "</b> · " + p.text);
        });
      });
    } else {
      out += "<div class='lbl'>a calling</div>";
      if (R0) out += help(R0.icon + " <b>" + esc(b.role) + "</b>: quicker at " + R0.skills.map(function (x) { return Bd.BY_ID[x].label; }).join(" and ") + ", done with " + Bd.BY_ID[R0.ban].label + ". its kit: " + R0.gear);
      else out += help("pick once. two skills grow half as fast again and count for more; one is given up for good") + row(Object.keys(F.CALLINGS).map(function (k) { var R = F.CALLINGS[k]; return btn("gcall", k, R.icon + " " + k + " (no " + Bd.BY_ID[R.ban].label + ")"); }).join(""));
      out += "<div class='lbl'>" + esc(c.name) + "'s day</div>" + row(Object.keys(F.PLANS).map(function (k) { return btn("gday", k, F.PLANS[k].icon + " " + F.PLANS[k].name, (b.day || "steady") === k); }).join("")) + row(btn("gall", b.day || "steady", "tell the whole tribe the same"));
      out += "<div class='lbl'>when grumps come</div>" + row(Object.keys(F.RESP).map(function (k) { return btn("gresp", k, F.RESP[k].icon + " " + F.RESP[k].name, (b.resp || "own") === k); }).join(""));
      var tr = F.trainers(game, c), pals = F.pals(game, c);
      if (tr.length) out += "<div class='lbl'>learn from someone</div>" + row(tr.map(function (o) { return btn("gteach", o.id, "🏫 " + esc(o.name) + " the " + o.job + ": " + Bd.BY_ID[F.TEACH[o.job]].label, false, (b.tr || {})[o.id] === day(game)); }).join("")) + help("for " + plural(F.price(c), "coin") + ", or hold a gift");
      if (pals.length) out += "<div class='lbl'>spar</div>" + row(pals.slice(0, 4).map(function (o) { return btn("gspar", o.id, "🥋 " + esc(o.name) + (o.stage === 2 || o.tantrum ? " (drills)" : " (a " + F.rankOf(o) + ")"), false, now < sparT); }).join(""));
      if (!tr.length && !pals.length) out += help("stand near other smols to spar with them, or to learn a skill from one with a job");
    }
    return out;
  };

  /* ---------------- how the new things look ---------------- */
  var ME = SB.Meshes || SB.ME;
  var ITEMS = {
    bow: function (b) { b.color(0x8a5a36); for (var i = 0; i < 5; i++) { var a = (i - 2) * 0.42; b.push().translate(Math.cos(a) * 0.16 - 0.1, 0.2 + Math.sin(a) * 0.19, 0).rotZ(a).box(0.03, 0.1, 0.03).pop(); } b.color(0xe8e0c8).push().translate(-0.065, 0.2, 0).box(0.008, 0.36, 0.008).pop(); },
    arrow: function (b, tip) { b.color(0xb08a5a).push().translate(0, 0.04, 0).rotZ(1.5708).translate(0, -0.14, 0).cyl(4, 0.012, 0.012, 0.28).pop(); b.color(tip || 0x6a6a72).push().translate(0.15, 0.04, 0).box(0.05, 0.035, 0.035).pop(); b.color(0xf0f0f0).push().translate(-0.13, 0.04, 0).box(0.05, 0.05, 0.01).pop(); },
    tootharrow: function (b) { ITEMS.arrow(b, 0xf0ead8); },
    ironarrow: function (b) { ITEMS.arrow(b, 0xaab4c0); },
    sling: function (b) { b.color(0xb89a6a).push().translate(0, 0.05, 0).box(0.1, 0.03, 0.07).pop(); b.push().translate(-0.1, 0.07, 0).rotZ(0.5).box(0.14, 0.012, 0.012).pop().push().translate(0.1, 0.07, 0).rotZ(-0.5).box(0.14, 0.012, 0.012).pop(); },
    shield: function (b) { b.color(0x9a6a3a).push().translate(0, 0.2, 0).box(0.3, 0.36, 0.04).pop(); b.color(0xd8b24a).push().translate(0, 0.2, 0.025).box(0.08, 0.08, 0.02).pop(); b.color(0x6a4526).push().translate(0, 0.37, 0.005).box(0.32, 0.03, 0.05).pop().push().translate(0, 0.03, 0.005).box(0.32, 0.03, 0.05).pop(); },
    maul: function (b) { b.color(0x8a6a48).cyl(5, 0.02, 0.02, 0.4); b.color(0x6a4a2e).push().translate(0, 0.4, 0).rotZ(1.5708).translate(0, -0.12, 0).cyl(7, 0.08, 0.08, 0.24).pop(); },
    crystalblade: function (b) { b.color(0x7a5a3a).cyl(4, 0.018, 0.018, 0.1); b.color(0x9aa4b0).push().translate(0, 0.1, 0).box(0.1, 0.02, 0.03).pop(); b.color(0x8fe8ff).glow(0.5).push().translate(0, 0.11, 0).cyl(4, 0.035, 0.004, 0.32).pop().glow(0); },
    tooth: function (b) { b.color(0xf0ead8).push().translate(0, 0.0, 0).cone(5, 0.035, 0.1).pop(); }
  };
  function potM(col, glow) { return function (b) { b.color(col); if (glow) b.glow(0.5); b.cyl(7, 0.07, 0.09, 0.13); if (glow) b.glow(0); b.color(0x6a4a2e).push().translate(0, 0.13, 0).cyl(6, 0.04, 0.04, 0.03).pop(); }; }
  function hatM(col) { return function (b) { b.color(col).push().translate(0, 0.02, 0).cyl(8, 0.15, 0.15, 0.02).pop().push().translate(0, 0.04, 0).cyl(7, 0.1, 0.07, 0.1).pop(); }; }
  function vestM(col) { return function (b) { b.color(col).push().translate(0, 0.14, 0).box(0.24, 0.26, 0.1).pop().push().translate(-0.15, 0.2, 0).box(0.07, 0.1, 0.08).pop().push().translate(0.15, 0.2, 0).box(0.07, 0.1, 0.08).pop(); }; }
  function bootM(col) { return function (b) { b.color(col); [-0.07, 0.07].forEach(function (x) { b.push().translate(x, 0.07, 0).box(0.08, 0.14, 0.08).pop().push().translate(x, 0.03, 0.05).box(0.08, 0.06, 0.1).pop(); }); }; }
  ITEMS.crossbow = function (b) { ITEMS.bow(b); b.color(0x6a4526).push().translate(0.02, 0.2, 0).box(0.26, 0.04, 0.04).pop(); };
  ITEMS.boomerang = function (b) { b.color(0xb08a5a).push().translate(-0.06, 0.03, 0).rotY(0.5).box(0.18, 0.025, 0.05).pop().push().translate(0.06, 0.03, 0).rotY(-0.5).box(0.18, 0.025, 0.05).pop(); };
  ITEMS.flail = function (b) { b.color(0x8a6a48).cyl(4, 0.018, 0.018, 0.3); b.color(0x4f9e40).push().translate(0.05, 0.3, 0).rotZ(-0.9).box(0.012, 0.14, 0.012).pop(); b.color(0x8a8a92).push().translate(0.13, 0.27, 0).scale(0.06).sphere(1).pop(); };
  ITEMS.flashstick = function (b) { b.color(0x8a6a48).cyl(4, 0.018, 0.018, 0.3); b.color(0xfff2a0).glow(0.8).push().translate(0, 0.33, 0).scale(0.06).sphere(1).pop().glow(0); };
  ITEMS.horn = function (b) { b.color(0xf0e0c8).push().translate(0, 0.06, 0).rotZ(1.2).cone(7, 0.07, 0.24).pop(); };
  ITEMS.firearrow = function (b) { ITEMS.arrow(b, 0xff8a3a); }; ITEMS.glowarrow = function (b) { ITEMS.arrow(b, 0x67d4ff); }; ITEMS.brewarrow = function (b) { ITEMS.arrow(b, 0x8de0c0); };
  ITEMS.firepot = potM(0xd8602a); ITEMS.thunderpot = potM(0xe8d870); ITEMS.stinkpot = potM(0x9ab850); ITEMS.smokepot = potM(0x9a9a9a); ITEMS.sickbrew = potM(0x7ad08a); ITEMS.oddbrew = potM(0xc080ff); ITEMS.lightflask = potM(0xfff2a0, true); ITEMS.musk = potM(0x3a2a4a);
  ITEMS.tuft = function (b) { b.color(0x5a3d6a).push().translate(0, 0.06, 0).scale(0.07, 0.06, 0.07).sphere(1).pop().push().translate(0.04, 0.1, 0).scale(0.04).sphere(1).pop(); };
  ITEMS.nightpearl = function (b) { b.color(0x2a2a44).glow(0.4).push().translate(0, 0.06, 0).scale(0.06).sphere(1).pop().glow(0); b.color(0xc8c8e8).push().translate(0.02, 0.1, 0.03).box(0.015, 0.015, 0.015).pop(); };
  ITEMS.arkflare = function (b) { b.color(0xff5a4a).cyl(6, 0.035, 0.035, 0.22); b.color(0xf0f0f0).push().translate(0, 0.22, 0).cone(6, 0.045, 0.08).pop(); };
  ITEMS.crystalseed = function (b) { b.color(0xa8e6ff).glow(0.5).cone(5, 0.05, 0.12).push().translate(0.05, 0, 0.02).cone(4, 0.03, 0.07).pop().glow(0); };
  ITEMS.thoughtsap = function (b) { b.color(0x8fd8ff).glow(0.6).push().translate(0, 0.06, 0).scale(0.05, 0.07, 0.05).sphere(1).pop().push().translate(0, 0.13, 0).cone(5, 0.02, 0.05).pop().glow(0); };
  Object.keys(F.GEAR).forEach(function (k) {
    var g = F.GEAR[k];
    if (!g.cost) return;
    ITEMS[k] = g.slot === "hat" ? hatM(g.col) : g.slot === "boots" ? bootM(g.col) : g.slot === "cloak" ? vestM(g.col) : function (b) { b.color(g.col).push().translate(0, 0.03, 0).torus(0.07, 0.012, 10, 4).pop(); b.color(0xffd24a).push().translate(0.07, 0.03, 0).scale(0.03).sphere(1).pop(); };
  });  var STRUCTS = {
    snare: function () { var b = ME.builder(); b.color(0x8a6a48).push().translate(-0.2, 0, 0).rotZ(-0.35).cyl(4, 0.02, 0.015, 0.5).pop(); b.color(0x4f9e40).push().translate(0.08, 0.02, 0).torus(0.16, 0.015, 10, 4).pop(); b.push().translate(-0.02, 0.24, 0).rotZ(1.1).box(0.012, 0.3, 0.012).pop(); return b.finish(); },
    pittrap: function () { var b = ME.builder(); b.color(0x2a2018).push().translate(0, 0.01, 0).cyl(10, 0.46, 0.46, 0.02, true).pop(); b.color(0x8a6a48); for (var i = 0; i < 5; i++) b.push().translate(-0.32 + i * 0.16, 0.04, 0).rotY(0.25 * (i % 2 ? 1 : -1)).box(0.03, 0.03, 0.8).pop(); b.color(0x5ab04a); for (i = 0; i < 6; i++) b.push().translate(Math.cos(i * 1.9) * 0.25, 0.07, Math.sin(i * 2.3) * 0.25).rotY(i).box(0.16, 0.012, 0.1).pop(); return b.finish(); },
    dummy: function () { var b = ME.builder(); b.color(0x8a6a48).cyl(5, 0.03, 0.03, 0.9); b.push().translate(0, 0.62, 0).rotZ(1.5708).translate(0, -0.3, 0).cyl(5, 0.025, 0.025, 0.6).pop(); b.color(0xd8c070).push().translate(0, 0.5, 0).scale(0.2, 0.26, 0.16).sphere(1).pop(); b.color(0x5a3d6a).push().translate(0, 0.93, 0).scale(0.15).sphere(1).pop(); b.color(0xff5a4a).push().translate(0, 0.5, 0.15).box(0.1, 0.1, 0.02).pop(); return b.finish(); }
  };
  STRUCTS.wardpost = function () { var b = ME.builder(); b.color(0x8a6a48).cyl(5, 0.03, 0.03, 0.8); b.color(0x6a4526).push().translate(0, 0.78, 0).cyl(6, 0.08, 0.08, 0.03).pop(); b.color(0xfff2a0).glow(0.9).push().translate(0, 0.9, 0).scale(0.11).sphere(1).pop().glow(0); return b.finish(); };
  STRUCTS.clayguard = function () { var b = ME.builder(); b.color(0xb86b45).cyl(8, 0.2, 0.16, 0.55); b.push().translate(0, 0.7, 0).scale(0.17).sphere(1).pop(); b.push().translate(-0.24, 0.4, 0).box(0.08, 0.26, 0.08).pop().push().translate(0.24, 0.4, 0).box(0.08, 0.26, 0.08).pop(); b.color(0x8a6a48).push().translate(0.3, 0.45, 0.1).rotZ(-0.4).cyl(5, 0.03, 0.05, 0.4).pop(); b.color(0x2a2018).push().translate(-0.06, 0.73, 0.15).box(0.03, 0.03, 0.02).pop().push().translate(0.06, 0.73, 0.15).box(0.03, 0.03, 0.02).pop(); return b.finish(); };
  STRUCTS.flinger = function () { var b = ME.builder(); b.color(0x7a5230); [-0.3, 0.3].forEach(function (x) { b.push().translate(x, 0.06, 0).box(0.08, 0.12, 0.9).pop().push().translate(x, 0.35, 0).box(0.07, 0.6, 0.07).pop(); }); b.push().translate(0, 0.62, 0).box(0.7, 0.06, 0.06).pop(); b.color(0x8a6a48).push().translate(0, 0.62, -0.1).rotZ(0.5).box(0.06, 0.9, 0.06).pop(); b.color(0x6a4a2e).push().translate(0, 0.3, 0.35).rotZ(1.5708).translate(0, -0.15, 0).cyl(7, 0.07, 0.07, 0.3).pop(); return b.finish(); };
  STRUCTS.guardpost = function () { var b = ME.builder(); b.color(0x7a5230).cyl(5, 0.05, 0.05, 1.1); b.color(0xc9b28a).push().translate(0, 0.8, 0.06).box(0.5, 0.34, 0.04).pop(); b.color(0x9a6a3a).push().translate(0, 0.42, 0.07).box(0.22, 0.26, 0.04).pop(); b.color(0xd8b24a).push().translate(0, 0.42, 0.1).box(0.06, 0.06, 0.02).pop(); return b.finish(); };
  STRUCTS.crystaltree = function () { var b = ME.builder(); b.color(0x9aa4b0).cyl(6, 0.07, 0.04, 0.6); b.color(0x8fe8ff).glow(0.6); [[0, 0.6, 0, 0.5], [-0.14, 0.45, 0.05, 0.32], [0.13, 0.5, -0.06, 0.36], [0.03, 0.4, 0.14, 0.26]].forEach(function (p) { b.push().translate(p[0], p[1], p[2]).cone(5, 0.09, p[3]).pop(); }); b.glow(0); return b.finish(); };
  if (ME && ME.builder && ME.itemMesh) {
    var itemMesh0 = ME.itemMesh;
    ME.itemMesh = function (k) {
      if (ITEMS[k]) { try { var b = ME.builder(); ITEMS[k](b); return b.finish(); } catch (e) {} }
      return itemMesh0(k);
    };
    if (ME.STRUCT_BUILDERS) Object.keys(STRUCTS).forEach(function (k) { try { STRUCTS[k](); ME.STRUCT_BUILDERS[k] = STRUCTS[k]; } catch (e) {} });
  }
  F._reset = function () { reset(); pins.length = 0; dots.length = 0; clouds.length = 0; slows.length = 0; now = 0; trapT = 0; trapList = []; senList = []; senT = 0; mark = null; sparT = 0; lastDay = null; t2 = 0; }; // for tests
  F._now = function () { return now; };
})();
