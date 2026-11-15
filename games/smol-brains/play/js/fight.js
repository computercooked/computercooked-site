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
  function pepMul(c) { return F.has(c, "breath") ? 0.75 : 1; }

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
      if (!g || !g.alive || g.species !== "grump" || now >= p.until) { if (g && g.alive && p.search && SB.Creature.emote) SB.Creature.emote(g, "huh", 1.4); pins.splice(i, 1); continue; }
      g.action = null; g.thinkT = Math.max(g.thinkT || 0, 0.4);
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
    if (power) { k *= F.POWER_MIN + (F.POWER_MAX - F.POWER_MIN) * power; notes.push(pr.reach ? "lunge" : info.sweep ? "sweep" : "big swing"); }
    if (ranged && info.fall != null) k *= info.fall;
    // from the shadows: the first hit on a grump that has not noticed you (crouched, or it is asleep)
    if ((F.sneaking(c) || g.asleep) && !F.aware(g, c)) { k *= Math.max(F.SNEAK_HIT, pr.sneak || 0, F.style(c, 10) === "trickster" ? 3 : 0); notes.push("sneak hit"); }
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
    if (F.addStagger(game, g, sg)) notes.push("staggered");
    if (!ranged) {
      shove(game, c, g, (pr.kb || 0.25) * (power ? 2 : 1) * heavy);
      if (s.swingT > 0) s.swingT *= (pr.sp || 1) * (F.has(c, "quick") ? 0.85 : 1);
      if (pr.burn && !g.boss && !F.burning(g)) { dots.push({ id: g.id, by: c.id, n: 3, at: now + 1.2 }); notes.push("singed"); }
    }
    if (reel) s.stam = Math.min(1, s.stam + 0.05); // a hit on a reeling grump gives a little pep back
    F.last = { k: k, crit: crit, notes: notes, power: power, ranged: ranged };
    if (notes.length) { s.fightSay = "💥 " + notes.join(" + ") + "!"; say(s.fightSay); }
    SB.bus.emit("fightHit", { c: c, g: g, k: k, crit: crit, notes: notes });
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
    var info = { hk: hk, dmg: dmg, power: o.power || 0, ranged: !!o.ranged, fall: o.fall, ammo: o.ammo, sweep: !!o.sweep };
    var mul = SB.Ext ? SB.Ext.damage(game, c, g, info) : F.onDamage(game, c, g, info);
    var total = dmg * mul * (1 + bonus(c, o.ranged ? "hunt" : "fight")) * (g.boss && SB.Bosses && SB.Bosses.reeling(g) ? SB.Bosses.REEL : 1);
    if (SB.Body) SB.Body.xp(c, "fight", 1);
    var boss = !!g.boss, gone = hurt(game, g, total, c);
    if (gone) say(boss ? "it's down!" : "the grump runs off for good!"); else { g.action = null; g.thinkT = 0; }
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
    if (!g) return null; // nothing in front of you: the wind-up just relaxes
    var cost = (F.POWER_PEP + (pr.pep || 0)) * pepMul(c);
    if (s.stam < cost) { say("too puffed for a big swing. catch your breath"); return null; }
    var reach = reachOf(c, g, hk) + (pr.reach ? 0.7 : 0.2);
    s.swing = 1; s.swingT = (P().SWING || 0.42) * 1.4;
    if (SB.dist(g.x, g.z, c.x, c.z) > reach) { say("too far: get closer"); return null; }
    s.stam = Math.max(0, s.stam - cost);
    var res = F.strike(game, c, g, { power: charge }), swept = 0;
    if (pr.sweep) { // a sword's big swing takes every grump in front of you
      var fa = Math.atan2(g.x - c.x, g.z - c.z);
      game.creatures.slice().forEach(function (o) {
        if (o === g || !isGrump(o) || o.heldBy || SB.dist(o.x, o.z, c.x, c.z) > reachOf(c, o, hk) + 0.4) return;
        if (Math.abs(SB.angDiff(fa, Math.atan2(o.x - c.x, o.z - c.z))) > 1.1) return;
        F.strike(game, c, o, { power: charge * 0.6, sweep: true }); swept++;
      });
    }
    if (res.ok && !res.bounced) wearHeld(game, c);
    res.charge = charge; res.swept = swept; res.power = true;
    SB.bus.emit("powerHit", { c: c, g: g, charge: charge, swept: swept });
    return res;
  };

  /* ---------------- bow and sling ---------------- */
  F.ammo = function (c, rw) { for (var i = 0; i < rw.ammo.length; i++) if (K[rw.ammo[i]] && Sv().count(c, rw.ammo[i], true) > 0) return rw.ammo[i]; return null; };
  F.ammoN = function (c, rw) { var n = 0; rw.ammo.forEach(function (k) { n += Sv().count(c, k, true); }); return n; };
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
      var ang = Math.acos(SB.clamp((dx * fx + dy * fy + dz * fz) / d, -1, 1)), allow = 0.08 + Math.atan2(r, d);
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
    s.yaw = Math.atan2(-dx, -dz); s.pitch = Math.atan2(ty - eye(game, c), Math.hypot(dx, dz) || 0.001); c.facing = s.yaw + Math.PI; aimC = null;
  };
  // the use button with a bow or sling in your paw: start the draw. it flies when you let go (a tap is a quick, weak shot)
  F.draw = function (game, c) {
    var s = PS(c);
    if (!s || draw || s.swingT > 0) return false;
    var rw = F.RANGED[Sv().heldKind(c)];
    if (!rw) return false;
    if (!F.ammo(c, rw)) { say(rw.none); return false; }
    body(c);
    draw = { t: 0, id: c.id };
    return true;
  };
  F.drawing = function () { return draw ? SB.clamp(draw.t / F.DRAW, 0, 1) : -1; };
  F.shoot = function (game, c, pull) {
    var s = PS(c), Surv = Sv(), hk = Surv.heldKind(c), rw = F.RANGED[hk];
    if (!s || !rw) return null;
    var ammo = F.ammo(c, rw);
    if (!ammo) { say(rw.none); return null; }
    pull = SB.clamp(pull == null ? 1 : pull, 0.35, 1);
    s.swing = 1; s.swingT = rw.cd; s.stam = Math.max(0, s.stam - 0.02);
    var kept = !!(SB.Body && SB.Body.roll(c, "hunt")); // a practised hunter wastes fewer
    if (!kept) Surv.take(c, ammo, 1);
    audio("tap", 0.7);
    var range = rangeOf(c, rw, pull), tg = F.aim(game, c, range, true), yaw = s.yaw, out = { ok: true, hit: false, ammo: ammo, kept: kept, pull: pull, target: tg ? tg.type : null };
    function land(x, z, odds) { if (!kept && dice(game) < odds && SB.World.walkable(game.world, x, z)) { Surv.spawn(game, ammo, 1, x, z, {}); out.left = true; } }
    if (!tg) { land(c.x - Math.sin(yaw) * Math.min(range, 7), c.z - Math.cos(yaw) * Math.min(range, 7), 0.5); SB.bus.emit("shot", { c: c, kind: hk, ammo: ammo, hit: false }); wearHeld(game, c); return out; }
    var d = tg.d, far = d <= rw.full ? 0 : Math.min(1, (d - rw.full) / Math.max(0.1, range - rw.full));
    // close is certain. far shots can go wide: hunting skill, a full draw and a crouch steady the paw
    var odds = 1 - 0.45 * far + (far > 0 ? bonus(c, "hunt") * 0.6 + (F.sneaking(c) ? 0.1 : 0) + (F.style(c, 5) === "marksman" ? 0.1 : 0) - (1 - pull) * 0.25 : 0);
    out.odds = odds; out.d = d;
    var ref = tg.ref;
    if (dice(game) > odds) {
      land(ref.x + Math.sin(yaw) * -1.5, ref.z + Math.cos(yaw) * -1.5, 0.5);
      if (tg.type === "critter") ref.data.flee = 2;
      say("wide! a full draw and a steady paw land more"); if (SB.Body) SB.Body.xp(c, "hunt", 1);
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
  F.sneakSee = function (c) { return F.SNEAK_SEE * (lv(c, "hunt") >= 6 ? 0.75 : 1); };
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
      if (near) {
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
    return { ok: true, st: b, msg: kindOf === "dummy" ? "🎯 a practice dummy. whack it, or shoot it from a way off" : SK[kindOf].emoji + " the " + SK[kindOf].label + " is set. a grump that walks over it is in trouble" };
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
      pin(g, { until: now + F.SNARE_HOLD, x: b.x, z: b.z });
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
    if (isTool(rc.out)) { q = F.rollQual(game, c); w = F.wearFor(rc.out, q); nm = "a " + (q !== 1 ? F.QUAL[q].id + " " : "") + lab(rc.out); }
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
  function reset() { hold = 0; draw = null; sneak = null; guard = 0; hp0 = null; cur = null; aimC = null; }
  // a new body: nothing carries over from the last one
  function body(c) { if (cur === c.id) return; reset(); cur = c.id; lx = c.x; lz = c.z; hp0 = c.chem.health; pain0 = c.chem.pain || 0; }
  F.tick = function (game, dt) {
    if (!game || game.offline || !game.world) return;
    now += dt;
    if (pins.length) tickPins(game, dt);
    if ((tT -= dt) <= 0) { tT = 0.25; trapTick(game); if (dots.length) tickDots(game); }
    var s = PS(), c = s ? s.c : null;
    if (!c || !c.alive || s.game !== game) { if (cur != null || sneak != null) reset(); return; }
    body(c);
    if (s.madeSay) { say(s.madeSay); s.madeSay = null; } // (a frame after "made a spear", so it is the line you read)
    if (lesson(s)) { hp0 = c.chem.health; lx = c.x; lz = c.z; return; }
    var use = !!P().input.use, hk = Sv().heldKind(c);
    // the bow: drawn while the button is down, loosed when it comes up
    if (draw) {
      if (draw.id !== c.id || !F.RANGED[hk]) draw = null;
      else if (use) { draw.t += dt; s.swing = Math.max(s.swing || 0, 0.45); }
      else { var pull = draw.t / F.DRAW; draw = null; F.shoot(game, c, pull); }
    }
    // a held swing: winds up while the button is down, lands when it comes up
    if (use) { hold += dt; if (F.charge(c) > 0) s.swing = Math.max(s.swing || 0, 0.3 + 0.3 * F.charge(c)); }
    else { var held = hold; hold = 0; if (held > F.TAP) F.release(game, c, held); }
    // crouched: slow, and no running
    if (F.sneaking(c)) {
      if (s.running) F.setSneak(game, c, false);
      else {
        var mv = Math.hypot(c.x - lx, c.z - lz);
        if (mv > 1e-5 && mv < 1.5) { var k = F.sneakSpeed(c), nx = lx + (c.x - lx) * k, nz = lz + (c.z - lz) * k; if (SB.World.walkable(game.world, nx, nz, true)) { c.x = nx; c.z = nz; } }
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
    var shootable = !r || g || (r.type === "creature" && r.ref.species !== "smol") || r.type === "node" || (r.type === "item" && K[r.kind] && K[r.kind].critter) || (r.type === "struct" && r.kind === "dummy");
    if (rw && c.tier >= 2 && shootable) {
      if (!F.ammo(c, rw)) o.use = x.no(rw.none);
      else {
        var tg = F.aim(game, c, rangeOf(c, rw, 1)), what = !tg ? null : tg.type === "grump" ? (tg.ref.boss && tg.ref.name ? tg.ref.name : "the grump") : tg.type === "critter" ? "the " + lab(tg.ref.kind) : "the dummy";
        o.use = x.op((hk === "sling" ? (what ? "sling a stone at " + what : "sling a stone") : (what ? "shoot " + what : "loose an arrow")) + " (" + F.ammoN(c, rw) + ")", function () { return F.draw(game, c); }, null);
      }
    } else if (g && o.use && !o.use.locked) {
      var base = o.use, who = g.boss && g.name ? g.name : "the grump";
      o.use = x.op("hit " + who + (isTool(hk) ? " with your " + F.name(sl) : ""), function () { return F.swing(game, c, g, base.go); }, base.verb);
    }
    if (g && !o.place) o.place = x.op(F.guarding(c) ? "hold your guard" : F.shieldAt(c) >= 0 ? "raise your shield" : "brace for the bite", function () { return F.brace(game, c); }, null);
    if (r && r.type === "struct" && F.TRAPS[r.kind]) {
      var b = r.ref;
      if (b.kind === "dummy") { if (!rw) o.use = x.op("whack the practice dummy", function () { return F.train(game, c, b); }, null); }
      else if (b.kind === "pittrap" && !b.data.armed) o.use = x.op("cover the pit again (2 leaves)", function () { return F.rearm(game, c, b); }, null);
      else o.use = x.no("a " + SK[b.kind].label + ", set and waiting");
      o.place = x.op("take the " + SK[b.kind].label + " down", function () { return F.takeDown(game, c, b); }, null);
    }
    if (!r && !o.place) o.place = x.op(F.sneaking(c) ? "stand up" : "crouch and sneak", function () { F.setSneak(game, c); return true; }, null);
  };
  F.key = function (game, c, key, down) {
    var s = PS(c);
    if (!s || !down || lesson(s)) return false;
    if (key === "x") { F.setSneak(game, c); return true; }
    if (key === "v") { F.brace(game, c); return true; }
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
    if (rw) { var n = F.ammoN(c, rw); out.push({ icon: hk === "bow" ? "🏹" : "🪢", text: (draw ? (draw.t >= F.DRAW ? "full draw · " : "drawing · ") : "") + n + " " + rw.word + (n === 1 ? "" : "s"), bad: n === 0, tip: "hold to draw, let go to shoot" }); }
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
      if (!d.g.boss && Sv() && Sv().spawn && K.tooth && dice(game) < F.TOOTH) { Sv().spawn(game, "tooth", 1, d.g.x + 0.3, d.g.z, {}); SB.bus.emit("grumpDrop", { c: d.c, g: d.g, kind: "tooth" }); }
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
    if (c.tier >= 2) {
      out += "<div class='lbl'>make</div><div class='rlist'>";
      F.RECIPES.forEach(function (rc) {
        if (c.tier < rc.tier || !K[rc.out]) return;
        var miss = lacks(c, rc.cost);
        out += "<div class='rc'><span class='big'>" + icon(rc.out, 28) + "</span><div class='t'>" + (rc.n > 1 ? rc.n + " " : "") + esc(lab(rc.out)) + (rc.n > 1 ? "s" : "") + "<small>" + esc(costText(rc.cost)) + (miss.length ? " · missing " + esc(miss.join(", ")) : "") + "</small></div><button class='btn go' data-fmake='" + rc.id + "' " + (miss.length ? "disabled" : "") + ">make</button></div>";
      });
      out += "</div><div class='lbl'>traps (set where you're looking)</div><div class='rlist'>";
      Object.keys(F.TRAPS).forEach(function (k) {
        var T = F.TRAPS[k], miss = lacks(c, T.cost);
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
  };
  if (SB.Ext) SB.Ext.tab({ id: "fight", label: "🏏 fight", show: function (game, c) { return !!c && c.tier >= 1; }, html: F.html, wire: F.wire });

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
  var STRUCTS = {
    snare: function () { var b = ME.builder(); b.color(0x8a6a48).push().translate(-0.2, 0, 0).rotZ(-0.35).cyl(4, 0.02, 0.015, 0.5).pop(); b.color(0x4f9e40).push().translate(0.08, 0.02, 0).torus(0.16, 0.015, 10, 4).pop(); b.push().translate(-0.02, 0.24, 0).rotZ(1.1).box(0.012, 0.3, 0.012).pop(); return b.finish(); },
    pittrap: function () { var b = ME.builder(); b.color(0x2a2018).push().translate(0, 0.01, 0).cyl(10, 0.46, 0.46, 0.02, true).pop(); b.color(0x8a6a48); for (var i = 0; i < 5; i++) b.push().translate(-0.32 + i * 0.16, 0.04, 0).rotY(0.25 * (i % 2 ? 1 : -1)).box(0.03, 0.03, 0.8).pop(); b.color(0x5ab04a); for (i = 0; i < 6; i++) b.push().translate(Math.cos(i * 1.9) * 0.25, 0.07, Math.sin(i * 2.3) * 0.25).rotY(i).box(0.16, 0.012, 0.1).pop(); return b.finish(); },
    dummy: function () { var b = ME.builder(); b.color(0x8a6a48).cyl(5, 0.03, 0.03, 0.9); b.push().translate(0, 0.62, 0).rotZ(1.5708).translate(0, -0.3, 0).cyl(5, 0.025, 0.025, 0.6).pop(); b.color(0xd8c070).push().translate(0, 0.5, 0).scale(0.2, 0.26, 0.16).sphere(1).pop(); b.color(0x5a3d6a).push().translate(0, 0.93, 0).scale(0.15).sphere(1).pop(); b.color(0xff5a4a).push().translate(0, 0.5, 0.15).box(0.1, 0.1, 0.02).pop(); return b.finish(); }
  };
  if (ME && ME.builder && ME.itemMesh) {
    var itemMesh0 = ME.itemMesh;
    ME.itemMesh = function (k) {
      if (ITEMS[k]) { try { var b = ME.builder(); ITEMS[k](b); return b.finish(); } catch (e) {} }
      return itemMesh0(k);
    };
    if (ME.STRUCT_BUILDERS) Object.keys(STRUCTS).forEach(function (k) { try { STRUCTS[k](); ME.STRUCT_BUILDERS[k] = STRUCTS[k]; } catch (e) {} });
  }
  F._reset = function () { reset(); pins.length = 0; dots.length = 0; now = 0; trapT = 0; trapList = []; }; // for tests
  F._now = function () { return now; };
})();
