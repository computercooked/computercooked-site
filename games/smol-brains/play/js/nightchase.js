// smol brains — night chases (K-0057 item 4: "still no grump chase in normal play"). The first night's chase, any night:
//   spot    a night grump closes on a smol out alone in the dark: no fire near, no hut, away from the nest.
//   prompt  time slows, the camera goes to them, the grump glares (it waits for you) and one glowing button shows:
//           "lend your light". ignore it for a few seconds and the night goes on without you.
//   chase   you're that smol, in possess.js's scout chase (90% of your running speed, a wind-up, then a pounce).
//           reach light (a fire, a torch, a friend holding one, the nest) or carry a torch and it turns tail.
//   end     win: sparks, the smol is braver for it, and the first win is a memory ember. three bites and you're
//           caught: the smol is hurt (bites never take the last quarter of its hearts) and you're thrown out.
// at most one chase a night (two prompts if you let the first go), never in the first night, films or fast-forward
// ends, and settings → "night chases" turns it off. counts live in game.settings.chase (saved with the settings).
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var NC = SB.NightChase = {};
  NC.SPOT = 7;          // a grump this close to a lone smol has locked on
  NC.FIRE_OK = 6;       // a smol this close to a fire isn't alone in the dark
  NC.HOME_OK = 7;       // ...nor this close to the nest
  NC.PROMPT = 6;        // real seconds the button stays up
  NC.SLOW = 0.3;        // how slow time runs while it's up
  NC.PROMPTS = 2;       // prompts a night, at most
  NC.LOOK = 0.5;        // how often the grumps are checked (sim seconds)
  NC.BITES = 3;         // bites before you're caught
  NC.SAFE = 3.5;        // this close to a fire's light counts as reaching it
  NC.PAY = 3;
  NC.LEAVE = 3;         // seconds in the body after it ends, then back to the sky

  var ui = null, lookT = 0;
  function st(game) { var s = game.settings || (game.settings = {}); return s.chase || (s.chase = { night: -1, prompts: 0, wins: 0, losses: 0 }); }
  NC.state = function (game) { return st(game); };
  NC.on = function (game) { return !(game.settings && game.settings.nightChase === false); };
  function nightIdx(game) { return Math.floor(game.world.time / SB.DAY_LENGTH); }
  function byId(game, id) { return id == null ? null : SB.Game.byId(game, id); }
  function busy(game) {
    return (SB.Possess && SB.Possess.active) || (SB.Intro && SB.Intro.covering) || (SB.FirstNight && SB.FirstNight.active(game)) ||
      (SB.UI && SB.UI.modalOpen) || game.offline || game.showcase || game.ended;
  }
  // can this smol be cornered? out in the open, awake or not, and nobody's got it
  function lone(game, o) {
    var w = game.world, hm = SB.Society.home(game, 0);
    if (!o.alive || o.species !== "smol" || o.heldBy || o.carriedBy != null || o.captive != null || o.stranger || o.dying || o.inBed) return false;
    if (SB.World.shelterAt(w, o.x, o.z) || SB.World.nearestFire(w, o.x, o.z, NC.FIRE_OK)) return false;
    return SB.dist(o.x, o.z, hm.x, hm.z) > NC.HOME_OK;
  }
  function hunter(g) { return g.alive && g.species === "grump" && !g.scout && !g.raider && !g.goingHome && g.carry == null && !g.heldBy && !g.dying && !(g.chem && g.chem.fear > 0.5); }
  // the grump-and-smol pair that would make a chase right now, or null
  NC.find = function (game) {
    var best = null, bd = NC.SPOT;
    game.creatures.forEach(function (g) {
      if (!hunter(g)) return;
      SB.World.creaturesNear(game.world, game, g.x, g.z, NC.SPOT, function (o) {
        if (o.species !== "smol" || !lone(game, o)) return;
        var d = SB.dist(g.x, g.z, o.x, o.z);
        if (d < bd) { bd = d; best = { g: g, c: o }; }
      });
    });
    return best;
  };

  NC.tick = function (game, dt) {
    var s = st(game), w = game.world;
    if (s.leaving != null) NC.after(game, dt);
    if (s.prompt) { promptTick(game, s, dt); return; }
    if (s.live) return; // possess.js runs the chase; the bus ends it
    if (!w.night || !NC.on(game) || !game.tutorial || !game.tutorial.done || busy(game)) return;
    if ((lookT -= dt) > 0) return;
    lookT = NC.LOOK;
    var k = nightIdx(game);
    if (s.night !== k) { s.night = k; s.prompts = 0; s.done = false; }
    if (s.done || s.prompts >= NC.PROMPTS || (s.nextT && game.time < s.nextT)) return;
    var hit = NC.find(game);
    if (hit) NC.offer(game, hit.g, hit.c);
  };
  NC.offer = function (game, g, c) {
    var s = st(game);
    s.prompts++; s.night = nightIdx(game);
    s.prompt = { g: g.id, c: c.id, t: NC.PROMPT };
    if (game.skip && SB.Game.skipStop) SB.Game.skipStop(game, { why: "👹 a grump has " + c.name + " cornered!", c: c });
    if (game.speed > 1) game.speed = 1; // a moment you watch, not a blur
    g.scout = { who: c.id, t: 0, hitT: 0, hold: true, speedK: 0.9, night: true, nc: true }; // it glares and waits for your light (creature.js)
    c.action = null; c.plan = null; c.asleep = false;
    c.chem.fear = Math.max(c.chem.fear || 0, 0.85);
    c.speech = { text: "!!", t: 2, kind: "say" };
    if (SB.Input && SB.Input.follow && !game.headless) { SB.Input.follow(c); var cm = SB.Render && SB.Render.camera; if (cm && cm.tZoom > 8) cm.tZoom = 7; } // close enough to see the eyes
    if (SB.Audio && SB.Audio.play && !game.headless) SB.Audio.play("grump", { vol: 0.9 });
    SB.bus.emit("nightChase", { step: "prompt", c: c, g: g });
    show(game);
  };
  function promptTick(game, s, dt) {
    var p = s.prompt, g = byId(game, p.g), c = byId(game, p.c);
    if (!g || !g.alive || !c || !c.alive || c.heldBy || (SB.Possess && SB.Possess.active)) { drop(game, s); return; }
    c.action = null; c.plan = null; // frozen with fear while you decide
    p.t -= dt / NC.SLOW; // the clock runs at NC.SLOW, the button on real seconds
    if (p.t <= 0) drop(game, s);
  }
  // the button went unpressed: the grump goes back to its night, and another grump may try later
  function drop(game, s) {
    var p = s.prompt; if (!p) return;
    var g = byId(game, p.g);
    if (g && g.scout && g.scout.nc) g.scout = null;
    s.prompt = null; s.nextT = game.time + 30;
    SB.bus.emit("nightChase", { step: "missed" });
    show(game);
  }
  NC.slow = function (game) { return game && game.settings && game.settings.chase && game.settings.chase.prompt ? NC.SLOW : 1; };

  NC.lend = function (game) {
    var s = st(game), p = s.prompt;
    if (!p || !SB.Possess) return false;
    var g = byId(game, p.g), c = byId(game, p.c);
    s.prompt = null;
    if (!g || !c || !c.alive || !g.alive) { show(game); return false; }
    if (!SB.Possess.enter(game, c, { free: true, nightChase: true, face: { x: g.x, z: g.z } })) { if (g.scout && g.scout.nc) g.scout = null; show(game); return false; }
    s.live = { g: g.id, c: c.id };
    SB.Possess.adoptScout(g, { keep: true });
    SB.bus.emit("nightChase", { step: "chase", c: c, g: g });
    show(game);
    return true;
  };

  // possess.js asks, each tick of the chase: is the smol in light?
  NC.safe = function (game, c) {
    var w = game.world, hm = SB.Society.home(game, 0);
    if (SB.World.nearestFire(w, c.x, c.z, NC.SAFE + 2)) return "🔥 into the light! the grump won't follow.";
    if (SB.Surv && SB.Surv.has && SB.Surv.has(c, "torch")) return "🔥 you held up your torch: the grump turned tail!";
    if (SB.dist(c.x, c.z, hm.x, hm.z) < 5) return "🏠 home to the nest! the grump won't come this close.";
    return "";
  };

  function end(game, ok, why) {
    var s = st(game), live = s.live; if (!live) return;
    s.live = null; s.done = true; s.nextT = game.time + 60;
    var c = byId(game, live.c);
    if (ok) {
      s.wins++;
      if (c) {
        c.braveNights = (c.braveNights || 0) + 1;
        c.chem.fear = 0;
        if (SB.Game.note) SB.Game.note(game, "🕯 " + c.name + " outran a grump in the dark" + (c.braveNights > 1 ? " (" + c.braveNights + " times now)" : "") + ".");
      }
      if (SB.Embers) SB.Embers.add(game, "nightchase", (c ? c.name : "a smol") + " outran the dark", c);
    } else if (why === "caught") {
      s.losses++;
      if (c && c.alive) { SB.Chem.apply(c.chem, { pain: 0.3, fear: 0.4 }); if (SB.Game.note) SB.Game.note(game, "👹 the grump caught " + c.name + ". hurt, but alive."); }
    }
    s.leaveT = NC.LEAVE; s.leaving = live.c;
    SB.bus.emit("nightChase", { step: ok ? "won" : why || "lost", c: c });
    show(game);
  }
  // after it's over: a beat in the body, then back to the sky
  NC.after = function (game, dt) {
    var s = st(game);
    if (s.leaving == null) return;
    if ((s.leaveT -= dt) > 0) return;
    var P = SB.Possess;
    if (P && P.active && P.c && P.c.id === s.leaving) P.leave("chase");
    s.leaving = null;
  };

  var hooked = false;
  NC.hook = function () {
    if (hooked || !SB.bus) return; hooked = true;
    SB.bus.on("scoutHit", function (d) {
      var game = SB.Game.current, s = game && st(game);
      if (!s || !s.live || !d || !d.c || d.c.id !== s.live.c || !d.g || !d.g.scout) return;
      if ((d.g.scout.hits || 0) >= NC.BITES && SB.Possess && SB.Possess.endScout) SB.Possess.endScout("👹 it caught you! hurt, but alive. next time, run for light sooner", 0, "caught");
    });
    SB.bus.on("scoutEnd", function (d) {
      var game = SB.Game.current, s = game && st(game);
      if (!s || !s.live || !d || !d.c || d.c.id !== s.live.c) return;
      end(game, !!d.ok, d.why);
    });
    SB.bus.on("unpossess", function (d) {
      var game = SB.Game.current, s = game && st(game);
      if (!s) return;
      if (s.live && d && d.c && d.c.id === s.live.c) end(game, false, "left");
      if (s.leaving != null && d && d.c && d.c.id === s.leaving) s.leaving = null;
    });
  };
  NC.hook();

  // on screen: the one button
  function show(game) {
    if (typeof document === "undefined" || !document.getElementById) return;
    var root = document.getElementById("ui"); if (!root) return;
    if (!ui) {
      ui = document.createElement("button");
      ui.className = "lendbtn ncbtn";
      ui.onclick = function (e) { e.stopPropagation(); var g = SB.Game.current; if (g) NC.lend(g); };
      root.appendChild(ui);
    }
    var s = st(game), c = s.prompt ? byId(game, s.prompt.c) : null;
    if (c) ui.innerHTML = "🕯 lend your light<small>" + c.name + " is cornered: be them, run for light</small>";
    ui.classList.toggle("on", !!c);
  }
  NC.ui = function () { return ui; };
  NC.frame = function (game) {
    var s = game && game.settings && game.settings.chase;
    if (ui && s && s.prompt) ui.style.setProperty("--nc", Math.max(0, s.prompt.t / NC.PROMPT).toFixed(3));
  };
})();
