/* smol brains — wilds.js (4.19): the island after dark, while you're a smol.
   - how hard it bites: cosy, normal or harsh (game.settings.wilds). needs, bites, darkness and prowlers scale with it
   - true darkness: a night in a body is properly dark now. a held torch, a fire or a roof is what you want
   - a prowler: stand in the dark too long and something small and fast comes. light sends it off; its bite can end you
   - a bed: sleep under a roof and it's yours. fall, and you wake there (your pack stays where you fell)
   - a survival run: count the days you last in one body
   possess.js calls W.tick every frame of a possession (awake or asleep) and asks W.respawn when you fall;
   render.js asks W.env for the dark; povhud.js draws the chips and the "you" tab's controls. */
(function () {
  "use strict";
  var SB = window.SB, W = SB.Wilds = {};
  function P() { return SB.Possess; }
  function PS() { return SB.Possess && SB.Possess.state ? SB.Possess.state() : null; }
  function set(game) { return game.settings || (game.settings = {}); }
  function say(msg) { if (P() && P().say) P().say(msg); }
  function hud() { return P() && !P().headless && SB.PovHud && SB.PovHud.on && SB.PovHud.on() ? SB.PovHud : null; }
  function audio(name, vol) { if (SB.Audio && SB.Audio.play && !(P() && P().headless)) SB.Audio.play(name, { vol: vol == null ? 1 : vol }); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (m) { return "&#" + m.charCodeAt(0) + ";"; }); }

  /* ---------------- how hard it bites ---------------- */

  W.LEVELS = {
    cosy: { label: "cosy", e: "🌼", need: 0.75, bite: 0.7, dark: 0.25, prowlers: 0, tip: "hunger and thirst run slower, bites hurt less, nights stay dim and nothing prowls." },
    normal: { label: "normal", e: "🌿", need: 1, bite: 1, dark: 0.55, prowlers: 1, tip: "dark nights, and one prowler a night if you stand around without a light." },
    harsh: { label: "harsh", e: "💀", need: 1.3, bite: 1.4, dark: 0.85, prowlers: 2, tip: "you get hungry and thirsty faster, bites hurt more, nights are black, and a survival run has one life." }
  };
  W.ORDER = ["cosy", "normal", "harsh"];
  W.level = function (game) { var k = game && game.settings && game.settings.wilds; return W.LEVELS[k] ? k : "normal"; };
  W.cfg = function (game) { return W.LEVELS[W.level(game)]; };
  W.set = function (game, k) {
    if (!game || !W.LEVELS[k] || set(game).run) return false; // a run keeps the level it started on
    set(game).wilds = k;
    SB.bus.emit("wilds", { level: k });
    return true;
  };
  W.needMul = function (game) { return W.cfg(game).need; };
  // a scout's bite on the smol you're in (creature.js)
  W.biteMul = function (game, prey) { var s = PS(); return s && s.c === prey ? W.cfg(game).bite : 1; };

  /* ---------------- light and dark ---------------- */

  W.FIRE_R = 5; W.TORCH_R = 9;
  // what keeps the dark off this smol: "torch" (held), "fire", "roof", or ""
  W.lit = function (game, c) {
    var Sv = SB.Surv, w = game.world;
    if (Sv && Sv.heldKind && c.inv && Sv.heldKind(c) === "torch") return "torch";
    if (SB.Body && SB.Body.litFireNear && SB.Body.litFireNear(w, c, W.FIRE_R)) return "fire";
    if (SB.World.shelterAt(w, c.x, c.z)) return "roof";
    return "";
  };
  // how dark the night is through a smol's eyes, 0..1 (blobs can't carry a light: they get half)
  W.darkness = function (game, s, night) {
    if (!s || s.firstNight || s.nightChase) return 0;
    return W.cfg(game).dark * SB.clamp01(night) * (s.c.tier < 2 ? 0.5 : 1);
  };
  // render.js, after the eyes have adjusted: take the light back out
  W.env = function (env, povAdj) {
    var s = PS();
    if (!s || !(povAdj > 0.002)) return;
    var k = W.darkness(s.game, s, env.night) * povAdj;
    if (k <= 0.001) return;
    function mul(a, f) { return a.map(function (v) { return v * (1 - k * f); }); }
    env.sky = mul(env.sky, 0.8); env.gnd = mul(env.gnd, 0.8); env.sun = mul(env.sun, 0.6); env.fog = mul(env.fog, 0.85);
  };
  // the torch in your paw lights the ground around you
  if (SB.Render && SB.Render.addHook) SB.Render.addHook(function (game) {
    var s = PS();
    if (!s || !game || s.game !== game) return;
    var c = s.c;
    if (c.inv && SB.Surv && SB.Surv.heldKind(c) === "torch") SB.Render.light(c.x, (c.y || 0) + 0.9, c.z, W.TORCH_R, 1, 0.62, 0.28);
  });

  /* ---------------- a bed ---------------- */

  W.BED = { leanto: 1, hut: 1, house: 1, hall: 1 };
  W.WAKE_HEALTH = 0.5;
  // the roof you'd wake under, if it still stands
  W.bed = function (game, c) {
    var bd = c && c.body && c.body.bed;
    if (!bd) return null;
    var b = SB.World.shelterAt(game.world, bd.x, bd.z);
    return b && W.BED[b.kind] ? bd : null;
  };
  W.setBed = function (game, c, b) {
    if (!b || !W.BED[b.kind] || !SB.Body) return false;
    var body = SB.Body.of(c);
    if (body.bed && SB.dist(body.bed.x, body.bed.z, b.x, b.z) < 0.5) return false;
    body.bed = { x: b.x, z: b.z, kind: b.kind };
    say("🛏 this " + bedName(b.kind) + " is your bed now. if you fall, you wake up here");
    SB.bus.emit("bed", { c: c, st: b });
    return true;
  };
  function bedName(kind) { var d = SB.STRUCTS && SB.STRUCTS[kind]; return d && d.label ? d.label : kind === "leanto" ? "lean-to" : kind; }
  // possess.js, when the smol you're in falls: wake at the bed instead of going back to the sky.
  // (your things are already on the ground where you fell)
  W.respawn = function (game, c, cause, items) {
    var s = PS(), bd = W.bed(game, c), run = set(game).run;
    if (!s || s.c !== c || !bd) return false;
    if (run && run.level === "harsh") return false; // one life
    var fell = { x: c.x, z: c.z }, body = SB.Body.of(c);
    endProwl(game, s, null);
    c.x = bd.x; c.z = bd.z;
    c.chem.health = W.WAKE_HEALTH; c.chem.pain = 0; c.chem.fear = 0;
    c.chem.hunger = Math.min(c.chem.hunger, 0.7); s.lastHun = c.chem.hunger;
    body.thirst = Math.min(body.thirst, 0.7);
    c.asleep = false; c.inBed = false; c.action = null;
    s.darkT = 0; s.prowlGap = W.PROWL_GAP;
    if (run) run.falls = (run.falls || 0) + 1;
    body.n = body.n || {}; body.n.falls = (body.n.falls || 0) + 1;
    if (items && items.length) P().setGoal({ x: fell.x, z: fell.z, label: "🎒 your pack", small: true, pack: 1 });
    var msg = "💫 you wake at your " + bedName(bd.kind) + (items && items.length ? ". your pack is where you fell: follow 🎒" : "");
    say(msg);
    var h = hud(); if (h) { if (h.hurt) h.hurt(1); if (h.beat) h.beat("💫 you fell", "…and woke at your " + bedName(bd.kind) + (items && items.length ? " · your pack is where you fell" : "")); }
    audio("chime", 0.8);
    SB.bus.emit("respawn", { c: c, cause: cause, items: items || [], bed: bd, fell: fell });
    return true;
  };

  /* ---------------- the prowler ---------------- */

  W.PROWL_DARK = 25;  // seconds in the dark before one comes
  W.PROWL_MAX = 45;   // it gives up after this long
  W.PROWL_FAR = 12;   // how far off it appears
  W.PROWL_GAP = 60;   // quiet after one leaves
  W.PROWL_DMG = 0.12; W.PROWL_SPEED = 0.9; W.PROWL_TOUGH = 0.6;
  function spot(game, c, s) {
    var w = game.world, a0 = Math.random() * 6.283;
    for (var a = 0; a < 16; a++) {
      var ang = a0 + a * 0.393, x = c.x + Math.sin(ang) * W.PROWL_FAR, z = c.z + Math.cos(ang) * W.PROWL_FAR;
      if (SB.World.walkable(w, x, z) && SB.World.depthAt(w, x, z) < 0.05 && !SB.World.shelterAt(w, x, z)) return { x: x, z: z };
    }
    return null;
  }
  W.spawnProwler = function (game, c, s) {
    var at = spot(game, c, s);
    if (!at) return null;
    var g = SB.Game.spawnGrump(game, at.x, at.z);
    g.name = "a prowler"; g.prowler = 1; g.tough = W.PROWL_TOUGH;
    if (g.look) { g.look.size = (g.look.size || 1) * 0.72; }
    g.scout = { who: c.id, t: 0, hitT: 0, speedK: W.PROWL_SPEED, dmg: W.PROWL_DMG, lethal: 1 };
    s.prowl = g.id; s.prowlN = (s.prowlN || 0) + 1; s.darkT = 0;
    audio("grump", 0.7);
    say("🌑 a prowler! it hunts in the dark: hold a torch, or get to a fire or a roof");
    var h = hud(); if (h && h.beat) h.beat("🌑 a prowler", "it hunts in the dark · light sends it off");
    SB.bus.emit("prowler", { c: c, g: g });
    return g;
  };
  function endProwl(game, s, msg, scared) {
    var g = s && s.prowl != null ? SB.Game.byId(game, s.prowl) : null;
    if (g && g.scout) { g.scout.done = true; g.chem.fear = 1; g.goingHome = true; }
    if (!s || s.prowl == null) return;
    s.prowl = null; s.prowlGap = W.PROWL_GAP; s.darkT = 0;
    if (scared && SB.Body) { var b = SB.Body.of(s.c); b.n = b.n || {}; b.n.prowlers = (b.n.prowlers || 0) + 1; }
    if (msg) { say(msg); audio(scared ? "achievement" : "chime", 0.8); }
    SB.bus.emit("prowlEnd", { c: s.c, ok: !!scared });
  }
  W.endProwl = function (msg, scared) { var s = PS(); if (s) endProwl(s.game, s, msg, scared); };

  // every frame of a possession, awake or asleep
  W.tick = function (game, c, s, dt) {
    var w = game.world, night = !!w.night, cfg = W.cfg(game);
    if (c.asleep) { var roof = SB.World.shelterAt(w, c.x, c.z); if (roof && W.BED[roof.kind]) W.setBed(game, c, roof); }
    if (s.goal && s.goal.pack && SB.dist(c.x, c.z, s.goal.x, s.goal.z) < 2.2) P().setGoal(null);
    if (game.offline) return;
    if (!night) { s.prowlN = 0; s.darkWarned = false; }
    if (s.prowl != null) {
      var g = SB.Game.byId(game, s.prowl);
      if (!g || !g.alive || !g.scout) { var beat = !!g && !g.alive; s.prowl = null; s.prowlGap = W.PROWL_GAP; s.darkT = 0; SB.bus.emit("prowlEnd", { c: c, ok: beat }); return; }
      var lit = g.scout.t > 3 ? W.lit(game, c) : "";
      if (lit === "roof") endProwl(game, s, "🏠 the prowler won't follow you under a roof", true);
      else if (lit) endProwl(game, s, "🔥 the prowler slinks away from the light", true);
      else if (!night) endProwl(game, s, "🌅 dawn. the prowler is gone", false);
      else if (g.scout.t > W.PROWL_MAX) endProwl(game, s, "😮‍💨 the prowler lost you in the dark", false);
      return;
    }
    if (!night || s.firstNight || s.nightChase || s.scout != null || s.dead || c.tier < 2 || !cfg.prowlers || set(game).povThreat !== "done") { s.darkT = 0; return; }
    if ((s.prowlGap = Math.max(0, (s.prowlGap || 0) - dt)) > 0) return;
    if ((s.prowlN || 0) >= cfg.prowlers) return;
    if (W.lit(game, c)) { s.darkT = Math.max(0, (s.darkT || 0) - dt * 2); return; }
    s.darkT = (s.darkT || 0) + dt;
    if (s.darkT > W.PROWL_DARK * 0.5 && !s.darkWarned) { s.darkWarned = true; say("🌑 it's very dark out here, and something is watching. hold a torch or get to a fire"); }
    if (s.darkT >= W.PROWL_DARK) { if (!W.spawnProwler(game, c, s)) s.darkT = W.PROWL_DARK - 3; }
  };

  /* ---------------- a survival run ---------------- */

  W.runDays = function (game) { var r = game && game.settings && game.settings.run; return r ? Math.max(0, (game.time - r.t0) / SB.DAY_LENGTH) : 0; };
  W.startRun = function (game) {
    var s = PS(), st = set(game);
    if (!s || s.game !== game || st.run) return false;
    st.run = { who: s.c.id, t0: game.time, falls: 0, level: W.level(game) };
    say("🏕 survival run started on " + st.run.level + ". stay in this body as long as you can: it ends when you go back to the sky");
    var h = hud(); if (h && h.beat) h.beat("🏕 day 1", "your survival run starts now", true);
    audio("chime", 0.8);
    SB.bus.emit("runStart", { c: s.c, level: st.run.level });
    return true;
  };
  W.endRun = function (game, why) {
    var st = set(game), r = st.run;
    if (!r) return null;
    var days = Math.round(W.runDays(game) * 10) / 10, res = { days: days, falls: r.falls || 0, level: r.level, why: why || "left", best: false };
    delete st.run;
    if (!(st.runBest >= days)) { st.runBest = days; st.runBestLevel = r.level; res.best = days > 0; }
    SB.bus.emit("runEnd", res);
    return res;
  };
  function daysText(d) { return d === 1 ? "1 day" : d + " days"; }

  /* ---------------- what the screen shows ---------------- */

  // status chips next to the body's own (povhud.js)
  W.chips = function (game, c, s) {
    var out = [], st = game.settings || {}, night = !!game.world.night;
    if (st.run) out.push({ k: "run", e: "🏕", label: "day " + (Math.floor(W.runDays(game)) + 1), tip: "your survival run on " + st.run.level + ". it ends when you go back to the sky", bad: false });
    if (s && s.prowl != null) out.push({ k: "prowl", e: "🌑", label: "prowler!", tip: "it hunts in the dark. hold a torch, or get to a fire or a roof", bad: true });
    else if (night && s && !s.firstNight && !s.nightChase && c.tier >= 2) {
      var lit = W.lit(game, c);
      if (lit === "torch") out.push({ k: "torch", e: "🔥", label: "torch lit", tip: "nothing prowls near a lit torch", bad: false });
      else if (!lit && W.cfg(game).prowlers) out.push({ k: "dark", e: "🌑", label: "in the dark", tip: "prowlers hunt in the dark. hold a torch, or stay by a fire or under a roof", bad: true });
    }
    return out;
  };
  // the "you" tab of the bag: difficulty, your bed, the survival run
  W.youHtml = function (game, c) {
    var st = game.settings || {}, lv = W.level(game), run = st.run, h = "<div class='sep'></div><div class='lbl'>the wilds · how hard the island bites</div><div class='wl' style='display:flex;gap:6px;flex-wrap:wrap'>";
    W.ORDER.forEach(function (k) { var L = W.LEVELS[k]; h += "<button class='btn" + (k === lv ? " go" : "") + "' data-wilds='" + k + "' title='" + esc(L.tip) + "'" + (run ? " disabled" : "") + ">" + L.e + " " + L.label + "</button>"; });
    h += "</div><div class='help'>" + esc(W.LEVELS[lv].tip) + (run ? " (locked during a run)" : "") + "</div>";
    var bd = W.bed(game, c);
    h += "<div class='st " + (bd ? "good" : "") + "'><b>🛏 bed</b><span>" + (bd ? "your " + esc(bedName(bd.kind)) + ", " + Math.round(SB.dist(c.x, c.z, bd.x, bd.z)) + " m away. if you fall you wake there, and your pack waits where you fell." : "none yet. sleep under a roof (a lean-to will do) and you wake there if you fall, instead of going back to the sky.") + "</span></div>";
    h += "<div class='sep'></div><div class='lbl'>survival run</div>";
    if (run) h += "<div class='st good'><b>🏕 day " + (Math.floor(W.runDays(game)) + 1) + "</b><span>on " + esc(run.level) + (run.falls ? " · fell " + run.falls + (run.falls === 1 ? " time" : " times") : "") + ". it ends when you go back to the sky" + (run.level === "harsh" ? ", or the first time you fall" : "") + ".</span></div>";
    else h += "<div><button class='btn go' data-run='start'>🏕 start a survival run</button></div><div class='help'>count the days you last in this body. it ends when you go back to the sky." + (st.runBest > 0 ? " best so far: " + daysText(st.runBest) + " on " + esc(st.runBestLevel || "normal") + "." : "") + "</div>";
    return h;
  };
  W.wire = function (root, game, redraw) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll("[data-wilds]").forEach(function (b) { b.addEventListener("click", function () { if (W.set(game, b.getAttribute("data-wilds"))) redraw(); }); });
    root.querySelectorAll("[data-run]").forEach(function (b) { b.addEventListener("click", function () { if (W.startRun(game)) redraw(); }); });
  };

  /* ---------------- wiring ---------------- */

  SB.bus.on("scoutHit", function (d) {
    var s = PS();
    if (!s || !d || d.c !== s.c || !d.g || !d.g.prowler) return;
    if (SB.Body) SB.Body.wound(s.c, "cut", s.game); // a prowler's teeth always leave a cut
    if (s.c.chem.health <= 0.01 && P().ko) P().ko(s.c, "prowler");
  });
  SB.bus.on("built", function (d) {
    var s = PS();
    if (!s || !d || !d.st || !d.st.done || !W.BED[d.st.kind]) return;
    if ((d.st.builders || []).indexOf(s.c.id) >= 0 || d.st.founder === s.c.name) W.setBed(s.game, s.c, d.st);
  });
  SB.bus.on("possess", function () { var g = SB.Game && SB.Game.current; if (g && g.settings && g.settings.run) W.endRun(g, "stale"); }); // a run left over from a reload
  SB.bus.on("unpossess", function (d) {
    var g = SB.Game && SB.Game.current;
    if (!g) return;
    (g.creatures || []).forEach(function (o) { if (o.prowler && o.scout) { o.scout.done = true; o.goingHome = true; } }); // it loses the scent
    var res = W.endRun(g, d && d.why);
    if (res && SB.UI && SB.UI.toast && !(P() && P().headless)) SB.UI.toast("🏕 <b>survival run over</b>: " + esc(d && d.c ? d.c.name : "you") + " lasted " + daysText(res.days) + " on " + res.level + (res.falls ? ", falling " + res.falls + (res.falls === 1 ? " time" : " times") : "") + "." + (res.best ? " a new best!" : ""), "", 9000);
  });
})();
