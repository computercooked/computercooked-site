
  /* ---------------- difficulty and modes (all in game.settings) ---------------- */
  var NORMAL = { id: "normal", dmg: 1, hunger: 1, price: 1 };
  PW.diff = function (game) { var d = game && game.settings && game.settings.diff; return d && typeof d === "object" && d.dmg > 0 && d.hunger > 0 && d.price > 0 ? d : NORMAL; };
  PW.setDiff = function (game, id) {
    var p = PW.PRESET[id], s = set(game); if (!p) return false;
    s.diff = { id: id, dmg: p.dmg, hunger: p.hunger, price: p.price };
    s.peaceful = !!p.peaceful;
    if (SB.Wilds && SB.Wilds.set) SB.Wilds.set(game, p.wilds); // (a survival run keeps the level it started on)
    emit("difficulty", { id: id });
    return true;
  };
  // one of the three knobs, a step up (and round again): dmg, hunger, price
  PW.knob = function (game, key) {
    if (key !== "dmg" && key !== "hunger" && key !== "price") return false;
    var d = PW.diff(game), n = { id: "custom", dmg: d.dmg, hunger: d.hunger, price: d.price }, i = 0;
    while (i < PW.KNOBS.length && PW.KNOBS[i] <= d[key] + 1e-6) i++;
    n[key] = PW.KNOBS[i % PW.KNOBS.length];
    set(game).diff = n;
    emit("difficulty", { id: "custom" });
    return n[key];
  };
  PW.on = function (game, key) { return !!(game && game.settings && game.settings[key]); };
  PW.toggle = function (game, key) {
    if (!PW.TOGGLES[key]) return false;
    if (key === "god" && !(SB.Game.sandbox && SB.Game.sandbox(game))) return false;
    var s = set(game); s[key] = !s[key];
    if (key === "holdToggle" && !s[key]) runLock = false;
    applyAccess(game);
    emit("mode", { key: key, on: !!s[key] });
    return true;
  };
  function godOn(game) { return !!(game && game.settings && game.settings.god && SB.Game && SB.Game.sandbox && SB.Game.sandbox(game)); }
  var runLock = false, styled = false;
  PW.runLocked = function () { return runLock; };
  PW.setRunLock = function (on) { runLock = !!on; return runLock; };
  function applyAccess(game) {
    if (typeof document === "undefined" || !document.body || !document.body.classList) return;
    var s = set(game);
    if (!styled && document.createElement && document.head) {
      styled = true;
      try {
        var el = document.createElement("style");
        el.textContent = "body.sb-bigmarks #pov .qmark span{font-size:17px;font-weight:800}body.sb-bigmarks #pov .qmark i{width:18px;height:18px;box-shadow:0 0 0 3px rgba(255,255,255,.7)}body.sb-noflash #pov .hurt,body.sb-noflash #pov .flash{animation:none!important;opacity:0!important}";
        document.head.appendChild(el);
      } catch (e) {}
    }
    document.body.classList.toggle("sb-bigmarks", !!s.bigMarks);
    document.body.classList.toggle("sb-noflash", !!s.noFlash);
  }

  /* ---------------- the body, every frame ---------------- */
  var tr = { id: null }, lastH = null, lastId = null;
  function tracker(c) {
    if (tr.id !== c.id) { var b = c.body; tr = { id: c.id, ag: c.chem.antigen || 0, tox: c.chem.toxin || 0, cut: hasCut(c), cutT: 0, chill: 0, expo: 0, rest: 0, fire: false, bound: b && b.n ? b.n.bound || 0 : 0 }; }
    return tr;
  }
  // a blow just landed (was -> now). what it really costs, after the island's bite, your guard, a lantern skin
  function blow(game, c, S, p, f, was, now, lesson) {
    var d = was - now, grump = false, mul = 1;
    near(game, c.x, c.z, 5, function (o) { if (o.species === "grump" && o.alive) grump = true; });
    if (godOn(game)) mul = 0;
    else if (p.shield > 0 && PW.has(c, "shield", game)) {
      p.shield--; mul = 0;
      if (!p.shield) PW.clear(c, "shield");
      tell(game, c, "🛡 the glow soaks it" + (p.shield ? " (" + p.shield + " left)" : ". that was the last of it"));
    } else {
      if (grump) mul *= PW.diff(game).dmg;
      mul *= 1 - Math.min(0.6, (f.guard || 0) + (S.running ? f.runGuard || 0 : 0));
      if (PW.has(c, "critter", game)) mul *= 1.25;
    }
    var nh = clamp(was - d * mul, 0.02, 1);
    if (grump && mul > 0 && !lesson) {
      p.hits = (p.hits || 0) + 1;
      if (S.running && p.hits % 4 === 0 && PW.sprain(game, c)) tell(game, c, "🦶 you turned your paw running. a splint sets it; until then running costs more");
    }
    if (nh < 0.2 && mul > 0 && !lesson && PW.owns(game, "wind") && st(game).windDay !== day(game)) {
      st(game).windDay = day(game); nh = 0.5;
      tell(game, c, "🪽 second wind! the Lantern catches you: back to half (once a day)");
      emit("secondWind", { c: c });
    }
    return nh;
  }
  function bodyFrame(game, c, S, dt) {
    var p = me(c), f = fxOf(game, c), ch = c.chem, B = SB.Body, b = B ? B.of(c) : null, s = set(game), T = tracker(c), ill = p.ill;
    var lesson = !!(S.firstNight || S.nightChase || S.hungerClock);
    if (lastId === c.id && ch.health > 0 && lastH - ch.health >= 0.02) ch.health = blow(game, c, S, p, f, lastH, ch.health, lesson);
    if (!lesson) {
      var hm = PW.diff(game).hunger * (s.survival ? 1.3 : 1) * (ill && ill.id === "tummy" ? 1 + 0.25 * ill.stage : 1);
      if (hm !== 1 && P().hungerRate) { var ex = dt * P().hungerRate() * (hm - 1); ch.hunger = clamp(ch.hunger + ex, 0, 1); if (S.lastHun != null) S.lastHun = clamp(S.lastHun + ex, 0, 1); }
    }
    // pep
    if (S.running) { var back = (f.runPep || 0) - (PW.sprained(c, game) ? 0.6 : 0); if (back) S.stam = clamp(S.stam + dt * 0.11 * back, 0, 1); }
    else {
      var regen = (f.pepRegen || 0) + (PW.has(c, "cheered", game) ? 0.5 : 0) + (PW.has(c, "calm", game) ? 0.3 : 0) + (PW.has(c, "boon", game) ? 0.3 : 0);
      if (regen) S.stam = Math.min(1, S.stam + dt * 0.1 * regen);
    }
    var cap = illCap(p) - (ill && ill.id === "dims" && !game.world.night ? 0.15 * ill.stage : 0);
    if (S.stam > cap) S.stam = Math.max(0.15, cap);
    if (godOn(game)) S.stam = 1;
    // water and warmth
    if (b && !lesson) {
      if (f.thirst) b.thirst = Math.max(0, b.thirst - dt * B.THIRST * Math.min(0.8, f.thirst));
      if (ill && ill.id === "daze") b.thirst = Math.min(1, b.thirst + dt * B.THIRST * 0.5 * ill.stage);
    }
    var warm = PW.has(c, "warm", game);
    if (f.warmth || warm) ch.cold = Math.max(0, (ch.cold || 0) - dt * (0.006 * (f.warmth || 0) + (warm ? 0.03 : 0)));
    if (ill && ill.id === "shivers") ch.cold = Math.min(1, (ch.cold || 0) + dt * 0.004 * ill.stage);
    if (s.survival && game.world.night && !T.fire && !lesson) ch.cold = Math.min(1, (ch.cold || 0) + dt * 0.004);
    if (ill && ill.id === "rot" && ch.health > 0.2) ch.health = Math.max(0.2, ch.health - dt * 0.0015 * ill.stage);
    // rest heals (not in survival, not while hunted, not on an empty tummy)
    T.rest = !c._povMove && !S.running ? T.rest + dt : 0;
    if (T.rest > 5 && !s.survival && ch.hunger < 0.75 && S.scout == null && ch.health < 1 && !(ill && ill.id === "rot"))
      ch.health = Math.min(1, ch.health + dt * 0.003 * (1 + (f.regen || 0) + (PW.has(c, "wellfed", game) ? 1 : 0)) * (c.asleep ? 2 : 1));
    lastH = ch.health; lastId = c.id;
  }
  PW.resting = function (c) { return !!c && tr.id === c.id && (tr.rest > 5 || !!c.asleep); };
  // twice a second: what you catch, what closes, what passes
  function bodySlow(game, c, S, step) {
    var p = me(c), ch = c.chem, B = SB.Body, b = B ? B.of(c) : null, f = fxOf(game, c), t = game.time, T = tracker(c), k;
    var lesson = !!(S.firstNight || S.nightChase || S.hungerClock);
    for (k in p.buffs) if (p.buffs[k] <= t) delete p.buffs[k];
    if (p.sprain && p.sprain <= t) { p.sprain = 0; tell(game, c, "your sprain has eased"); }
    T.fire = !!(B && B.litFireNear && B.litFireNear(game.world, c, 4));
    if (PW.has(c, "hushed", game) || PW.has(c, "critter", game)) hushScout(game, c, S);
    if (lesson) { T.ag = ch.antigen || 0; T.tox = ch.toxin || 0; T.cut = hasCut(c); return; }
    // causes
    if ((ch.antigen || 0) - T.ag > 0.1) PW.catchIll(game, c, "tummy");
    else if ((ch.toxin || 0) - T.tox > 0.1) PW.catchIll(game, c, "daze");
    T.ag = ch.antigen || 0; T.tox = ch.toxin || 0;
    if (b && b.wet > 0.6 && (ch.cold || 0) > 0.45) { if ((T.chill += step) >= 20) { T.chill = 0; PW.catchIll(game, c, "shivers"); } } else T.chill = Math.max(0, T.chill - step);
    var cut = hasCut(c), boundN = b && b.n ? b.n.bound || 0 : 0;
    if (cut && !T.cut) {
      p.bound = 0; T.cutT = 0; T.bound = boundN;
      if (game.world.night && !(SB.Wilds && SB.Wilds.lit && SB.Wilds.lit(game, c))) { p.nightBites = (p.nightBites || 0) + 1; if (p.nightBites % 2 === 0) PW.catchIll(game, c, "dims"); }
    }
    if (cut && (T.cutT += step) >= 80) { T.cutT = 0; PW.catchIll(game, c, "rot"); }
    if (!cut && T.cut && !p.bound && boundN === T.bound && (p.scars || 0) < PW.MAX_SCARS) {
      p.scars = (p.scars || 0) + 1; stamp++;
      tell(game, c, "the cut closed on its own and left a scar. a bandage keeps it clean");
      emit("scar", { c: c, n: p.scars });
    }
    T.cut = cut;
    // a sick smol close by
    var sick = false, mine = p.ill && p.ill.id === "sniffles";
    near(game, c.x, c.z, 2.5, function (o) {
      if (o === c || o.species !== "smol" || !o.alive) return;
      if ((o.chem.sick || 0) > 0.3 || (o.pw && o.pw.ill && o.pw.ill.id === "sniffles")) sick = true;
      if (mine) o.chem.antigen = Math.min(1, (o.chem.antigen || 0) + 0.01 * step); // and you can pass yours on
    });
    if (sick) { if ((T.expo += step) >= (st(game).plague > t ? 4 : 10)) { T.expo = 0; PW.catchIll(game, c, "sniffles"); } } else T.expo = Math.max(0, T.expo - step * 0.5);
    // getting over it, or getting worse
    var ill = p.ill;
    if (ill) {
      var resting = PW.resting(c);
      ill.heal += step * (resting ? 3 : 1) * (1 + (f.regen || 0));
      if (ill.heal >= PW.ILL_REST) PW.recover(game, c, "rest");
      else if (!resting && (ill.w += step) >= PW.ILL_WORSE && ill.stage < 3) {
        ill.stage++; ill.w = 0;
        tell(game, c, PW.ILL[ill.id].icon + " " + PW.ILL[ill.id].name + " is getting worse. rest, or take " + label(PW.ILL[ill.id].cure));
        emit("illnessWorse", { c: c, id: ill.id, stage: ill.stage });
      }
    }
  }

  /* ---------------- the island, on a timer ---------------- */
  function story(game) { var S = PS(); return !!(S && (S.firstNight || S.nightChase)) || !!(game.tutorial && !game.tutorial.done) || !!(SB.FirstNight && SB.FirstNight.active && SB.FirstNight.active(game)); }
  function sendHome(g) { if (g.goingHome) return; g.goingHome = true; if (g.chem) g.chem.fear = 1; }
  function wardTick(game) {
    var s = st(game), t = game.time;
    if (!s.wards.length) return;
    s.wards = s.wards.filter(function (wd) { return wd.until > t; });
    s.wards.forEach(function (wd) { near(game, wd.x, wd.z, wd.r || PW.WARD_R, function (g) { if (g.species === "grump" && g.alive && !g.boss) sendHome(g); }); });
  }
  PW.warded = function (game, x, z) { var s = st(game), t = game.time; return s.wards.some(function (wd) { return wd.until > t && SB.dist(wd.x, wd.z, x, z) <= (wd.r || PW.WARD_R); }); };
  function peaceTick(game) {
    if (story(game)) return;
    var cs = game.creatures;
    for (var i = 0; i < cs.length; i++) if (cs[i].species === "grump" && cs[i].alive && !cs[i].boss) sendHome(cs[i]);
  }
  // one life: a faint is the end (asked for in the modes page). otherwise friends carry a fainted smol home
  var goneQ = [];
  function flushGone(game) {
    while (goneQ.length) {
      var c = goneQ.shift();
      if (!c || !c.alive) continue;
      if (P() && P().active && P().c === c) P().leave("ko");
      if (SB.Game.note) SB.Game.note(game, "🕯 one life: " + c.name + "'s light went out.");
      if (SB.Creature && SB.Creature.die) SB.Creature.die(c, game, "hurt");
      emit("oneLifeLost", { c: c });
    }
  }
  function carryHome(game, c) {
    var pals = 0, h = PW.homeSpot(game, c);
    near(game, c.x, c.z, 14, function (o) { if (o !== c && o.species === "smol" && o.alive && o.stage >= 1) pals++; });
    if (!pals || !h || SB.dist(c.x, c.z, h.x, h.z) < 8) return false;
    c.x = h.x; c.z = h.z; if (c.px != null) { c.px = c.x; c.pz = c.z; }
    me(c).carried = (c.pw.carried || 0) + 1;
    if (SB.Game.note) SB.Game.note(game, "💤 " + c.name + " fainted. friends carried it " + h.name + ".");
    emit("carriedHome", { c: c, to: h });
    return true;
  }
  var tT = 0;
  PW.tick = function (game, dt) {
    if (!game || game.offline || !game.world) return;
    hookAll();
    if (stunned.length) stunFrame(game);
    var S = PS(), on = !!(S && S.game === game && !S.dead && S.c && S.c.alive);
    if (slowUntil && (!on || game.time >= slowUntil)) { if (game.speed === PW.SLOW) game.speed = 1; slowUntil = 0; }
    if (on) bodyFrame(game, S.c, S, dt); else lastId = null;
    if ((tT -= dt) > 0) return;
    tT = 0.5;
    PW.placeStones(game);
    wardTick(game);
    if (set(game).peaceful) peaceTick(game);
    if (goneQ.length) flushGone(game);
    if (on) bodySlow(game, S.c, S, 0.5);
    skyHook(game);
  };

  /* ---------------- hooks: wraps of public functions, the bus, ext.js ---------------- */
  function hookAll() {
    var Po = P(), B = SB.Body, Wi = SB.Wilds, R = SB.Render;
    if (Po && Po.drive && !Po.drive._pw) {
      var d0 = Po.drive;
      Po.drive = function (c, dt, game) {
        var s = Po.state ? Po.state() : null, mine = !!(s && s.c === c && !s.dead);
        if (mine) {
          if (runLock && game.settings && game.settings.holdToggle) Po.input.run = true;
          if (PW.slowed(game) && game.speed === PW.SLOW) dt = dt / PW.SLOW; // the island crawls: you keep your own pace
        }
        var r = d0.call(Po, c, dt, game);
        if (mine && c._povMove) {
          var k = (PW.has(c, "swift", game) ? 0.3 : 0) + (PW.has(c, "critter", game) ? 0.3 : 0) + (s.running ? fxOf(game, c).speed || 0 : 0);
          if (k > 0 && SB.Creature && SB.Creature.speedOf) {
            var step = SB.Creature.speedOf(c, null) * k * dt, nx = c.x + Math.sin(c.facing) * step, nz = c.z + Math.cos(c.facing) * step;
            if (SB.World.walkable(game.world, nx, nz, SB.Creature.canSwim ? SB.Creature.canSwim(c) : false)) { c.x = nx; c.z = nz; }
          }
        }
        return r;
      };
      Po.drive._pw = 1;
    }
    if (B && B.xp && !B.xp._pw) {
      var xp0 = B.xp;
      B.xp = function (c, id, n) {
        var g = cur();
        if (g && c && c._pov) { var f = fxOf(g, c), m = 1 + (f.xpAll || 0) + (f["xp_" + id] || 0); if (m !== 1) n = (n == null ? 1 : n) * m; }
        return xp0.call(B, c, id, n);
      };
      B.xp._pw = 1;
    }
    if (Wi && Wi.lit && !Wi.lit._pw) {
      var lit0 = Wi.lit;
      Wi.lit = function (game, c) { return lit0.call(Wi, game, c) || (PW.has(c, "glowing", game) ? "torch" : ""); };
      Wi.lit._pw = 1;
    }
    if (Wi && Wi.darkness && !Wi.darkness._pw) {
      var dk0 = Wi.darkness;
      Wi.darkness = function (game, s, night) { var d = dk0.call(Wi, game, s, night); return s && s.c && d > 0 ? d * (PW.has(s.c, "nightsight", game) ? 0.3 : PW.has(s.c, "glowing", game) ? 0.6 : 1) : d; };
      Wi.darkness._pw = 1;
    }
    if (R && R.flash && !R.flash._pw) {
      var fl0 = R.flash;
      R.flash = function () { var g = cur(); if (g && g.settings && g.settings.noFlash) { if (R.camera) R.camera.shake = 0; return; } return fl0.apply(R, arguments); };
      R.flash._pw = 1;
    }
  }
  PW.hookAll = hookAll;
  var hooked = false;
  PW.hook = function () {
    if (hooked || !SB.bus) return; hooked = true;
    var on = SB.bus.on.bind(SB.bus);
    function pov(d) { var g = cur(); return g && d && d.c && d.c._pov ? g : null; }
    function bonus(g, c, key, kind, n) { if (roll(c, key, fxOf(g, c)[key])) { give(g, c, kind, n || 1); emit("perkBonus", { c: c, key: key, kind: kind }); return true; } return false; }
    function pep(c, v) { var S = inBody(c); if (S && v) S.stam = Math.min(1, S.stam + v); }
    on("chop", function (d) { var g = pov(d); if (!g || !d.pov) return; var c = d.c; bonus(g, c, "chopStick", "stick"); bonus(g, c, "chopLog", "log"); bonus(g, c, "chopLeaves", "leaves", 2); bonus(g, c, "chopSapling", "sapling"); pep(c, fxOf(g, c).chopPep); });
    on("rockGone", function (d) { var g = pov(d); if (!g) return; var c = d.c, ore = d.node && (d.node.kind === "orevein" || d.node.kind === "vent"); bonus(g, c, "mineStone", "stone"); bonus(g, c, "mineFlint", "flint"); if (ore) bonus(g, c, "mineOre", "ore"); bonus(g, c, "mineCrystal", "crystal"); pep(c, fxOf(g, c).minePep); });
    on("povGain", function (d) {
      var g = pov(d), kd = d && K()[d.kind]; if (!g || !kd || !(kd.food || d.kind === "herb")) return;
      var c = d.c;
      if (d.kind === "herb") bonus(g, c, "forHerb", "herb");
      bonus(g, c, "forMore", d.kind); bonus(g, c, "forSeed", "seed");
    });
    on("craft", function (d) {
      var g = pov(d); if (!g || !d.pov || d.remedy) return;
      var c = d.c, f = fxOf(g, c), kind = d.item && d.item.kind;
      bonus(g, c, "craftStick", "stick");
      if (kind && K()[kind] && !K()[kind].tool) bonus(g, c, "craftDouble", kind);
      if (kind && K()[kind] && K()[kind].tool && f.toolW && Sv().uses) { var v = Sv().inv(c), full = Sv().uses(kind); for (var i = 0; i < v.s.length; i++) if (v.s[i] && v.s[i].k === kind && v.s[i].w === full) { v.s[i].w = Math.round(full * (1 + f.toolW)); break; } }
    });
    on("fish", function (d) { var g = pov(d); if (!g) return; bonus(g, d.c, "fishMore", "fish"); bonus(g, d.c, "fishClam", "clam"); pep(d.c, fxOf(g, d.c).fishPep); });
    on("hunt", function (d) { var g = pov(d); if (!g) return; bonus(g, d.c, "huntMeat", "meat"); bonus(g, d.c, "huntFur", "fur"); pep(d.c, fxOf(g, d.c).huntPep); });
    on("grumpChased", function (d) { var g = pov(d); if (!g) return; var h = fxOf(g, d.c).chaseHeal; if (h) d.c.chem.health = Math.min(1, d.c.chem.health + h); });
    on("povEat", function (d) {
      var g = pov(d); if (!g) return;
      var c = d.c, f = fxOf(g, c), k = d.kind, p = me(c), ch = c.chem, S = inBody(c);
      if (k === "herb" || k === "potion") { p.bound = 1; if (p.ill) { if (k === "potion") PW.recover(g, c, "cured"); else easeIll(g, c, 1); } }
      if (k === "cooked" || k === "bread") {
        if (f.cookFill) { ch.hunger = Math.max(0, ch.hunger - f.cookFill); if (S && S.lastHun != null) S.lastHun = ch.hunger; }
        if (f.cookWarm) ch.cold = Math.max(0, (ch.cold || 0) - f.cookWarm);
        if (f.cookHeal) ch.health = Math.min(1, ch.health + f.cookHeal);
        pep(c, f.cookPep);
        if (f.cookBuff) PW.buff(c, "wellfed", f.cookBuff, g);
      }
      if (k === "berry" || k === "apple" || k === "banana") pep(c, f.eatPep);
      if ((k === "fish" || k === "cooked") && f.fishWarm) { if (c.body) c.body.wet = 0; ch.cold = Math.max(0, (ch.cold || 0) - 0.3); }
      if (k === "glowcap" && g.world.night && !PW.has(c, "glowing", g)) { PW.buff(c, "glowing", 300, g); tell(g, c, "✨ a glowcap after dark: you are glowing! nothing prowls up on a light"); emit("glowing", { c: c }); }
    });
    on("skillUp", function (d) { var g = pov(d); if (g && !d.shared && PW.PERK_LEVELS.indexOf(d.level) >= 0 && PW.PERKS[d.id]) tell(g, d.c, "⭐ " + SB.Body.BY_ID[d.id].label + " level " + d.level + ": a perk to pick, in your bag's lantern tab"); });
    on("sale", function (d) { // the island's prices (stalls and pedlars alike)
      var g = cur(), m = g ? PW.diff(g).price : 1;
      if (!g || !d || !d.byHand || !d.buyer || m === 1 || !(d.price > 0)) return;
      var extra = Math.round(d.price * (m - 1) * 100) / 100;
      d.buyer.purse = Math.max(0, Math.round(((d.buyer.purse || 0) - extra) * 100) / 100);
      if (d.seller && d.seller.purse != null && extra > 0) d.seller.purse = Math.round((d.seller.purse + extra) * 100) / 100;
    });
    on("soldByHand", function (d) { var g = cur(), k = g && d && d.c ? fxOf(g, d.c).sell : 0; if (k && d.pay > 0) d.c.purse = Math.round(((d.c.purse || 0) + d.pay * k) * 100) / 100; });
    on("incident", function (d) { var g = cur(); if (g && d && d.inc && d.inc.id === "sick") { st(g).plague = Math.round(g.time + 600); emit("plague", { until: st(g).plague }); } });
    on("dawn", function () { var S = PS(); if (S && S.c && S.c.pw && S.c.pw.buffs) delete S.c.pw.buffs.glowing; });
    on("knockout", function (d) { var g = cur(); if (!g || !d || !d.c) return; if (set(g).oneLife) goneQ.push(d.c); else carryHome(g, d.c); });
    on("respawn", function (d) { var g = cur(); if (g && d && d.c && set(g).oneLife) goneQ.push(d.c); });
    on("possess", function () { var g = cur(); tr = { id: null }; lastId = null; runLock = false; if (g) applyAccess(g); });
    on("unpossess", function () { runLock = false; });
  };
  PW.hook();
  hookAll();

  // the fastest thing to shout or cast at a grump in front of you (the third button on a phone)
  PW.quick = function (game, c) {
    var S = inBody(c); if (!S) return null;
    if (PW.wordLevel(game, "roar") && !PW.cdLeft(game, "w:roar")) return { label: "roar! 🦁", go: function () { var r = PW.shout(game, c, "roar"); if (P().say) P().say(r.msg); return r.ok; } };
    if (PW.owns(game, "burst") && !PW.cdLeft(game, "burst") && S.stam >= PW.BY.burst.pep) return { label: "burst of light 💥", go: function () { var r = PW.cast(game, "burst", c); if (P().say) P().say(r.msg); return r.ok; } };
    return null;
  };
  var X = SB.Ext;
  if (X) {
    X.on("tick", PW.tick);
    X.on("options", function (game, c, r, o, x) {
      var hk = x.hk;
      if (hk && PW.usable(hk) && !(r && r.type === "creature")) o.place = x.op(PW.useLabel(hk), function () { var res = PW.use(game, c, hk); x.say(res.msg); if (res.ok) x.audio(PW.RECIPE[hk].group === "care" ? "craft" : "eat", 0.6); return res.ok; }, null);
      if (r && r.type === "struct" && r.kind === "blessstone") o.use = x.op("touch the blessing stone", function () { var res = PW.touch(game, c, r.ref); x.say(res.msg); if (res.ok) { page = "you"; x.audio("chime", 0.7); x.openBag("lantern"); } return res.ok; }, null);
      else if (r && r.type === "struct" && r.kind === "wordstone") o.use = x.op(st(game).heard[r.ref.data && r.ref.data.pw] ? "the whisper stone (heard)" : "listen to the whisper stone", function () { var res = PW.hear(game, c, r.ref); x.say(res.msg); if (res.ok) x.audio("eureka", 0.7); return res.ok; }, null);
      else if (r && r.type === "creature" && !o.pick) {
        var cr = r.ref;
        if (cr.species === "grump" && cr.alive) { var q = PW.quick(game, c); if (q) o.pick = x.op(q.label, q.go, null); }
        else if (cr.species === "smol" && SB.Ideas && SB.Ideas.known(cr, "herbal") && (PW.illOf(c) || wounded(c, game))) o.pick = x.op("ask " + cr.name + " to tend you", function () { var res = PW.tend(game, c, cr); x.say(res.msg); if (res.ok) x.audio("chime", 0.6); return res.ok; }, null);
      }
    });
    X.on("damage", function (game, c, target) {
      var f = fxOf(game, c), p = me(c), m = 1 + (f.dmg || 0) + (target && target.boss ? f.bossDmg || 0 : 0);
      if (PW.has(c, "strong", game)) m += 0.5;
      if (PW.has(c, "critter", game)) m *= 0.5;
      if (p.ill && p.ill.id === "dims" && game.world.night) m *= 1 - 0.1 * p.ill.stage;
      if (f.stagger) { p.swings = (p.swings || 0) + 1; if (p.swings % f.stagger === 0 && target && target.alive) PW.stun(game, target, target.boss ? 0.6 : 1.5); }
      return m;
    });
    X.on("key", function (game, c, key, down) {
      if (key !== "shift" || !game.settings || !game.settings.holdToggle) return false;
      if (down) runLock = !runLock;
      return true;
    });
    X.on("goals", function (game, add) {
      if (SB.Game.sandbox && SB.Game.sandbox(game)) return;
      var can = PW.TREE.filter(function (n) { return !PW.whyNotLearn(game, n.id); });
      if (can.length) add("🕯 " + PW.points(game) + " ember" + (PW.points(game) > 1 ? "s" : "") + " to spend: ✨ magic → the Lantern's powers", PW.owned(game) + "/" + PW.TREE.length, false);
    });
    X.on("vitals", function (game, c) {
      var out = [], p = c.pw; if (!p) return out;
      var ill = PW.illOf(c);
      if (ill) out.push({ icon: PW.ILL[ill.id].icon, text: PW.ILL[ill.id].name + (ill.stage > 1 ? " " + (ill.stage === 2 ? "II" : "III") : ""), bad: true, tip: PW.ILL[ill.id].sym.join(", ") + ". " + label(PW.ILL[ill.id].cure) + " cures it, and so does rest" });
      if (PW.sprained(c, game)) out.push({ icon: "🦶", text: "sprained", bad: true, tip: "running costs more pep. a splint sets it" });
      PW.buffsOf(c, game).forEach(function (id) { var d = PW.BUFFS[id] || { icon: "", text: id }; out.push({ icon: d.icon || "", text: d.text + (id === "shield" && p.shield ? " ×" + p.shield : ""), bad: !!d.bad, tip: d.tip || "" }); });
      if (PW.slowed(game)) out.push({ icon: "⏳", text: "slow time", tip: "the island crawls" });
      if (runLock) out.push({ icon: "🏃", text: "running", tip: "tap shift to stop" });
      return out;
    });
    X.tab({ id: "lantern", label: function (game, c) { return "🕯 lantern" + (PW.perkOpen(c).length ? " ⭐" : ""); }, show: function () { return true; },
      html: function (game, c, icon) { return PW.html(game, c, icon, false); }, wire: function (root, game, c, redraw, say) { PW.wire(root, game, c, redraw, say, false); } });
  }

  /* ---------------- the lantern tab (in a body) and the sky's window: light · body · modes ---------------- */
  var page = "light";
  PW.page = function (p) { if (p) page = p; return page; };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]; }); }
  function rc(big, t, small, right) { return "<div class='rc' style='display:flex;align-items:center;gap:8px;margin:3px 0'><span class='big' style='font-size:20px'>" + big + "</span><div class='t' style='flex:1;min-width:0'>" + t + (small ? "<small style='display:block;opacity:.8'>" + small + "</small>" : "") + "</div>" + (right || "") + "</div>"; }
  function btn(attr, val, text, off, go) { return "<button class='btn" + (go ? " go" : "") + "' data-" + attr + "='" + val + "'" + (off ? " disabled" : "") + ">" + text + "</button>"; }
  function lbl(t) { return "<div class='lbl' style='margin-top:8px'>" + t + "</div>"; }
  function dots(n, of) { var s = ""; for (var i = 0; i < of; i++) s += i < n ? "●" : "○"; return s; }
  var NEEDS_SMOL = { skin: 1, recall: 1, mend: 1, share: 1 };
  function lightHtml(game, c, sky) {
    var s = st(game), S = inBody(c), out = "", any = false;
    out += lbl("embers to spend: <b>" + (PW.points(game) >= 99 ? "∞" : PW.points(game)) + "</b> · the Lantern remembers " + PW.owned(game) + " of " + PW.TREE.length);
    out += lbl(S ? "your inner light · costs pep" : "from the sky · costs sparks" + (c ? " · around " + esc(c.name) : " · where you are looking")) + "<div class='rlist'>";
    PW.TREE.forEach(function (n) {
      if (n.kind !== "cast" || !s.tree[n.id]) return;
      any = true;
      var left = PW.cdLeft(game, n.id), rk = PW.rank(game, n.id), cost = S ? Math.round(n.pep * (1 - Math.min(0.5, fxOf(game, c).cost || 0)) * 100) + "% pep" : n.id === "slow" ? "in a body only" : (SB.Game.miracleCost ? SB.Game.miracleCost(game, n.sparks) : n.sparks) + " ✨";
      var off = left > 0 || (!S && (n.id === "slow" || (NEEDS_SMOL[n.id] && !c)));
      out += rc(n.icon, esc(n.name) + (rk > 1 ? " " + dots(rk, 3) : ""), esc(n.desc) + " · " + cost + (!S && NEEDS_SMOL[n.id] && !c ? " · tap a smol first" : ""), btn("pwcast", n.id, left > 0 ? Math.ceil(left) + "s" : "cast", off, !off));
    });
    out += (any ? "" : "<p class='help'>nothing yet. spend an ember below and the Lantern remembers a power.</p>") + "</div>";
    out += lbl("words of power · found at whisper stones") + "<div class='rlist'>";
    PW.WORDS.forEach(function (w) {
      var L = PW.wordLevel(game, w.id), left = PW.cdLeft(game, "w:" + w.id);
      out += rc(w.icon, esc(w.name) + " " + dots(L, 3), L ? esc(w.desc) : "not found yet", L && S ? btn("pwsay", w.id, left > 0 ? Math.ceil(left) + "s" : "say", left > 0, left <= 0) : "");
    });
    out += "</div>";
    ["light", "life", "mind"].forEach(function (br) {
      out += lbl(PW.BRANCH[br][0] + " " + PW.BRANCH[br][1]) + "<div class='rlist'>";
      PW.TREE.forEach(function (n) {
        if (n.branch !== br) return;
        var why = PW.whyNotLearn(game, n.id);
        out += rc(n.icon, esc(n.name) + (n.kind === "gift" ? " <small style='display:inline;opacity:.7'>always on</small>" : ""), esc(n.desc), s.tree[n.id] ? "<span class='ok'>✓</span>" : "<button class='btn" + (why ? "" : " go") + "' data-pwlearn='" + n.id + "' title='" + esc(why) + "'" + (why ? " disabled" : "") + ">" + n.cost + " 🔥</button>");
      });
      out += "</div>";
    });
    return out;
  }
  function youHtml(game, c, icon) {
    var p = me(c), B = SB.Body, out = "", bl = PW.blessingOf(c), offer = PW.offered(game, c), ill = PW.illOf(c);
    out += lbl("body level <b>" + PW.bodyLevel(c) + "</b> · every skill level counts") + "<div class='rlist'>";
    out += rc(bl ? bl.icon : "🗿", bl ? "blessed by " + esc(bl.name) : "no blessing yet", bl ? esc(bl.desc) : "three blessing stones stand on the island. touch one to pick a blessing");
    offer.forEach(function (b) { out += rc(b.icon, esc(b.name), esc(b.desc), p.bless === b.id ? "<span class='ok'>✓</span>" : btn("pwbless", b.id, p.bless ? "swap" : "take", false, true)); });
    out += "</div>" + lbl("health") + "<div class='rlist'>";
    var lines = 0;
    if (ill) { var d = PW.ILL[ill.id]; lines++; out += rc(d.icon, esc(d.name) + " · stage " + ill.stage + " of 3", "from " + esc(d.cause) + " · " + esc(d.sym.join(", ")) + " · cure: " + esc(label(d.cure)) + ", a healer, or rest"); }
    if (B && B.has(c, "cut")) { lines++; out += rc("🩸", "a cut", "a bandage binds it clean. left alone it scars, and can go bad"); }
    if (B && B.has(c, "bruise")) { lines++; out += rc("🤕", "a bruise", "bark chew takes the ache out"); }
    if (PW.sprained(c, game)) { lines++; out += rc("🦶", "a sprain", "running costs more pep. a splint sets it"); }
    if (p.scars) { lines++; out += rc("⚔", p.scars + " scar" + (p.scars > 1 ? "s" : ""), "each one took " + 2 + "% off every hurt since"); }
    var imm = Object.keys(p.immune).filter(function (k) { return PW.immune(game, c, k) && PW.ILL[k]; });
    if (imm.length) { lines++; out += rc("🛡", "had it, won't catch it again soon", esc(imm.map(function (k) { return PW.ILL[k].name; }).join(", "))); }
    var bf = PW.buffsOf(c, game);
    if (bf.length) { lines++; out += rc("✨", "on you now", esc(bf.map(function (id) { return (PW.BUFFS[id] ? PW.BUFFS[id].text : id) + " " + Math.ceil(PW.left(c, id, game)) + "s"; }).join(" · "))); }
    if (!lines) out += "<p class='help'>fit and well. standing still heals, and a smol who knows herb lore will tend you.</p>";
    out += "</div>";
    if (B) {
      var open = PW.perkOpen(c), had = false;
      if (open.length) {
        out += lbl("⭐ perks to pick") + "<div class='rlist'>";
        open.forEach(function (o) {
          var L = PW.PERKS[o.skill][PW.PERK_LEVELS.indexOf(o.lvl)], sk = B.BY_ID[o.skill];
          out += rc(sk.emoji, esc(sk.label) + " " + o.lvl, "pick one", "");
          L.forEach(function (pk, i) { out += rc("", esc(pk[0]), esc(pk[1]), btn("pwperk", o.skill + ":" + o.lvl + ":" + i, "pick", false, true)); });
        });
        out += "</div>";
      }
      var mine = "";
      B.SKILLS.forEach(function (sk) {
        var got = [];
        PW.PERK_LEVELS.forEach(function (lv) { var pk = PW.perkOf(c, sk.id, lv); if (pk) got.push(pk[0]); });
        if (got.length) { had = true; mine += rc(sk.emoji, esc(sk.label), esc(got.join(" · ")), btn("pwreset", sk.id, "clear · 1 🔥", PW.points(game) < 1)); }
      });
      out += lbl("your perks") + "<div class='rlist'>" + (had ? mine : "<p class='help'>every skill gives a pick of two perks at levels 3, 6 and 9.</p>") + "</div>";
    }
    [["care", "wounds and care"], ["cure", "cures"], ["brew", "brews · one at a time"]].forEach(function (g) {
      out += lbl(g[1]) + "<div class='rlist'>";
      PW.RECIPES.forEach(function (rcp) {
        if (rcp.group !== g[0]) return;
        var need = [];
        for (var k in rcp.in) { var n = Sv().count(c, k, true); need.push("<span class='" + (n >= rcp.in[k] ? "ok" : "no") + "'>" + icon(k, 16) + " " + Math.min(n, rcp.in[k]) + "/" + rcp.in[k] + "</span>"); }
        var have = Sv().count(c, rcp.id, true);
        out += rc(icon(rcp.id, 24), esc(label(rcp.id)) + (have ? " ×" + have : ""), esc(K()[rcp.id].desc) + (rcp.at ? " · by a fire" : "") + "<div class='need'>" + need.join(" ") + "</div>",
          (have ? btn("pwuse", rcp.id, "use", false, true) : "") + btn("pwmake", rcp.id, "make", !!PW.whyNotMake(game, c, rcp.id)));
      });
      out += "</div>";
    });
    return out;
  }
  function modesHtml(game) {
    var d = PW.diff(game), s = set(game), out = lbl("how hard the island bites") + "<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
    PW.PRESETS.forEach(function (p) { out += "<button class='btn" + (d.id === p.id ? " go" : "") + "' data-pwdiff='" + p.id + "' title='" + esc(p.tip) + "'>" + p.icon + " " + p.name + "</button>"; });
    out += "</div><p class='help'>" + esc(PW.PRESET[d.id] ? PW.PRESET[d.id].tip : "your own mix.") + " tap a number to change just that.</p><div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
    [["dmg", "grump bites"], ["hunger", "hunger"], ["price", "prices"]].forEach(function (k) { out += btn("pwknob", k[0], k[1] + " ×" + d[k[0]], false, false); });
    out += "</div>" + lbl("ways to play") + "<div class='rlist'>";
    ["peaceful", "oneLife", "survival", "god"].forEach(function (k) {
      var t = PW.TOGGLES[k], sand = SB.Game.sandbox && SB.Game.sandbox(game);
      if (k === "god" && !sand) return;
      out += rc(t[0], t[1], esc(t[2]), btn("pwtog", k, s[k] ? "on" : "off", false, !!s[k]));
    });
    out += "</div>" + lbl("easier to see and hold") + "<div class='rlist'>";
    ["noFlash", "bigMarks", "holdToggle"].forEach(function (k) { var t = PW.TOGGLES[k]; out += rc(t[0], t[1], esc(t[2]), btn("pwtog", k, s[k] ? "on" : "off", false, !!s[k])); });
    if (s.holdToggle && PS()) out += rc("🏃", "run", "for a phone or a tired finger", btn("pwrun", "1", runLock ? "running" : "walking", false, runLock));
    out += "</div>";
    return out;
  }
  PW.html = function (game, c, icon, sky) {
    icon = icon || function (k) { return K()[k] ? K()[k].emoji : ""; };
    var pages = c ? [["light", "🕯 light"], ["you", "🐾 body"], ["modes", "⚙ modes"]] : [["light", "🕯 light"], ["modes", "⚙ modes"]];
    if (!c && page === "you") page = "light";
    var out = "<div class='row' style='display:flex;gap:4px;margin:0 0 4px'>" + pages.map(function (p) { return btn("pwpage", p[0], p[1], false, page === p[0]); }).join("") + "</div>";
    return out + (page === "you" ? youHtml(game, c, icon) : page === "modes" ? modesHtml(game) : lightHtml(game, c, !!sky));
  };
  PW.wire = function (root, game, c, redraw, say, sky) {
    function done(r, sound) { if (r && r.msg && say) say(r.msg); if (r && r.ok) snd(sound || "craft", 0.5); redraw(); }
    function each(sel, fn) { var L = root.querySelectorAll("[data-" + sel + "]"); for (var i = 0; i < L.length; i++) (function (b) { b.addEventListener("click", function () { fn(b.getAttribute("data-" + sel), b); }); })(L[i]); }
    each("pwpage", function (v) { page = v; redraw(); });
    each("pwcast", function (v) { done(PW.cast(game, v, c, c ? null : skyAt(game)), "chime"); });
    each("pwsay", function (v) { done(c ? PW.shout(game, c, v) : null, "chime"); });
    each("pwlearn", function (v) { done(PW.learn(game, v), "eureka"); });
    each("pwbless", function (v) { done(PW.bless(game, c, v), "achievement"); });
    each("pwperk", function (v) { var a = v.split(":"); done(PW.pickPerk(game, c, a[0], +a[1], +a[2]), "achievement"); });
    each("pwreset", function (v) { done(PW.resetPerks(game, c, v)); });
    each("pwmake", function (v) { done(PW.make(game, c, v)); });
    each("pwuse", function (v) { done(PW.use(game, c, v), "eat"); });
    each("pwdiff", function (v) { PW.setDiff(game, v); done({ ok: true, msg: PW.PRESET[v].icon + " " + PW.PRESET[v].name + ": " + PW.PRESET[v].tip }); });
    each("pwknob", function (v) { PW.knob(game, v); redraw(); });
    each("pwtog", function (v) { var okd = PW.toggle(game, v); done(okd ? { ok: true, msg: PW.TOGGLES[v][0] + " " + PW.TOGGLES[v][1] + (PW.on(game, v) ? " on: " + PW.TOGGLES[v][2] : " off") } : null); });
    each("pwrun", function () { runLock = !runLock; redraw(); });
  };

  /* ---------------- the sky's way in: a button on the ✨ magic sheet, and a window ---------------- */
  function skyTarget(game) { var c = game.selectedId != null && SB.Game.byId ? SB.Game.byId(game, game.selectedId) : null; if (c && c.alive && c.species === "smol") return c; return null; }
  function skyAt(game) { var cm = SB.Render && SB.Render.camera; if (cm && cm.x != null) return { x: cm.x, z: cm.z }; var m = SB.Mine && SB.Mine.get ? SB.Mine.get(game) : null; return m ? { x: m.x, z: m.z } : null; }
  PW.skyTarget = skyTarget;
  PW.openSky = function (game) {
    game = game || cur();
    if (!game || typeof document === "undefined" || !document.createElement || !SB.UI || !SB.UI.modal) return false;
    var body = document.createElement("div");
    function draw() {
      var c = skyTarget(game);
      body.innerHTML = PW.html(game, c, null, true);
      PW.wire(body, game, c, draw, function (m) { if (SB.UI.toast) SB.UI.toast(m); }, true);
    }
    draw();
    SB.UI.modal("🕯 the Lantern's powers", body, {});
    return true;
  };
  function skyHook(game) {
    if (typeof document === "undefined" || !document.querySelector || !document.createElement || (P() && P().active)) return;
    var sheet = document.querySelector(".dock .sheet");
    if (!sheet || !sheet.dataset || sheet.dataset.kind !== "magic" || (sheet.classList && sheet.classList.contains("hide")) || sheet.querySelector("[data-pwsky]")) return;
    var b = document.createElement("button");
    b.className = "btn"; b.setAttribute("data-pwsky", "1"); b.style.cssText = "width:100%;margin-top:6px";
    b.textContent = "🕯 the Lantern's powers · " + PW.points(game) + " embers to spend";
    b.onclick = function () { PW.openSky(cur()); };
    sheet.appendChild(b);
  }

  /* ---------------- the new things: items, recipes, models ---------------- */
  (function () {
    var KK = SB.KINDS, S = Sv(), k;
    if (KK) for (k in PW.ITEMS) if (!KK[k]) KK[k] = PW.ITEMS[k];
    // real recipes in the make tab too, for smols who know herb lore (survival.js keeps a recipe pushed on later)
    if (S && S.EXTRA && S.craft && KK) {
      PW.RECIPES.forEach(function (rc0) { if (!S.EXTRA.some(function (r) { return r.id === rc0.id; })) S.EXTRA.push({ id: rc0.id, name: KK[rc0.id].label, icon: KK[rc0.id].emoji, in: rc0.in, at: rc0.at, out: rc0.id, idea: "herbal", hint: PW.costText(rc0) }); });
      // an older survival.js doesn't know a recipe pushed on late: take ours back out so the make tab shows nothing broken
      var probe = null; try { probe = S.craft({ tier: 0, species: "smol" }, null, PW.RECIPES[0].id); } catch (e) { probe = null; }
      if (!probe || /not a recipe/.test(probe.msg || "")) for (var i = S.EXTRA.length - 1; i >= 0; i--) if (PW.RECIPE[S.EXTRA[i].id] && S.EXTRA[i].idea === "herbal" && S.EXTRA[i].out === S.EXTRA[i].id) S.EXTRA.splice(i, 1);
    }
  })();
  var ME = SB.Meshes || SB.ME;
  function standing() {
    var b = ME.builder();
    b.color(0x7d828c).push().translate(0, 0.08, 0).box(0.95, 0.16, 0.75).pop();                       // the foot
    b.color(0x9aa0aa).push().translate(0, 0.95, 0).box(0.5, 1.6, 0.34).pop();                         // the stone
    b.color(0xa8aeb8).push().translate(0, 1.82, 0).box(0.36, 0.16, 0.26).pop();                       // its cap
    b.color(0xffe27a).push().translate(0, 1.2, 0.18).box(0.2, 0.2, 0.02).pop();                       // a lit mark
    b.color(0xffe27a).push().translate(0, 0.78, 0.18).box(0.06, 0.44, 0.02).pop();
    return b.finish();
  }
  function whisper() {
    var b = ME.builder();
    b.color(0x6f7480).push().translate(0, 0.3, 0).rotX(0.12).box(0.44, 0.6, 0.3).pop();               // a small leaning stone
    b.color(0x858b96).push().translate(0, 0.63, 0.03).box(0.3, 0.1, 0.22).pop();
    b.color(0xc9a8ff).push().translate(0, 0.36, 0.16).box(0.16, 0.05, 0.02).pop();                    // three lines: a word
    b.color(0xc9a8ff).push().translate(0, 0.27, 0.16).box(0.22, 0.05, 0.02).pop();
    b.color(0xc9a8ff).push().translate(0, 0.18, 0.16).box(0.12, 0.05, 0.02).pop();
    return b.finish();
  }
  if (ME && ME.STRUCT_BUILDERS && ME.builder) { try { ME.STRUCT_BUILDERS.blessstone = standing; ME.STRUCT_BUILDERS.wordstone = whisper; } catch (e) {} }
})();
