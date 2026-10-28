/* smol brains — possess.js
   The second game: step down into one smol and see the island through its eyes. No god hand, no miracles:
   you walk, you get hungry, the night has grumps in it. The smol's own brain switches off while you drive
   and watches instead, learning from every choice you make (supervised: "in a moment like this, do that"),
   so a smol you've lived as comes back a little more like you.
   v4.4 "first tool": the controls every survival game uses. A hotbar and a bag (survival.js holds the
   rules), left click uses what's in your hand on what you point at (an axe on a tree, a pick on rock, paws
   punch), right click places or uses it (eat, plant, put down a building ghost, give), F picks up, Q drops,
   E does whatever the prompt says. A first-time quest walks you from a stick to a campfire.
   This file is the logic (tests drive it headless); povhud.js is the screen. render.js draws the camera
   (cam.pov), input.js stands down while IN.mode is "pov". */
(function () {
  "use strict";
  var SB = window.SB;
  var P = (SB.Possess = {});
  var V = SB.V;
  var K = SB.KINDS, NK = SB.NODES, SK = SB.STRUCTS;

  P.COST = 3;           // sparks, like a small miracle
  P.FOV = 70 * Math.PI / 180;
  P.REACH = 4.2;        // how far away you can point at something and act on it
  P.LEARN_RATE = 0.15;  // how hard each of your choices pulls on the brain
  P.SWING = 0.42;       // seconds between swings
  P.active = false;
  P.c = null;
  P.input = { fwd: 0, side: 0, run: false, jump: false, use: false }; // the controls, whoever's holding them (keys, joystick, a test)

  var S = null; // the possession: {c, game, yaw, pitch, lessons, busy, ghost, quest, ...}
  var drv = new Float32Array(SB.N_DRIVES);

  function I() { return SB.Ideas; }
  function Sv() { return SB.Surv; }
  function H() { return !P.headless && SB.PovHud && SB.PovHud.on() ? SB.PovHud : null; } // the screen, when there is one
  function cam() { return SB.Render && SB.Render.camera; }
  function audio(name, vol) { if (SB.Audio && SB.Audio.play && !P.headless) SB.Audio.play(name, { vol: vol == null ? 1 : vol }); }
  P.state = function () { return S; };

  /* ---------------- entering and leaving ---------------- */

  // the first time is on the house: it's the best thing in the game, so nobody should miss it
  P.cost = function (game) { return game && !(game.stats && game.stats.possessed) ? 0 : P.COST; };

  P.canEnter = function (game, c) {
    if (!game || !c || !c.alive || c.type !== "creature") return "nobody there";
    if (c.species !== "smol") return "only smols can be possessed";
    if (c.heldBy || c.dying || c.corpse) return "not right now";
    if (P.active) return "you're already someone";
    if ((game.sparks || 0) < P.cost(game)) return "possessing a smol costs " + P.COST + " sparks ✨";
    return "";
  };

  P.enter = function (game, c, opts) {
    opts = opts || {};
    var why = opts.free ? (c && c.alive && c.species === "smol" && !P.active ? "" : "nope") : P.canEnter(game, c);
    if (why) { if (SB.UI && SB.UI.toast) SB.UI.toast(why); return false; }
    if (!opts.free) SB.Game.spend(game, P.cost(game));
    game.stats.possessed = (game.stats.possessed || 0) + 1;
    var C = SB.Creature;
    if (c.plan) C.endPlan(c, game, false);
    c.action = null; c.asleep = false; c.inBed = false; c.called = null; c.callVerb = null;
    c._pov = true;
    S = {
      c: c, game: game, yaw: c.facing + Math.PI, pitch: -0.06, lessons: 0, verbs: {}, bob: 0, stepAcc: 0, friendT: 2,
      speed: game.speed, work: null, dead: false, t: 0, born: game.time, busy: null, swingT: 0, stam: 1, ghost: null,
      pickT: 0, swing: 0, lastHp: c.chem.health, hurtT: 0, aim: null, target: null, opts: null, questT: 0
    };
    P.active = true; P.c = c;
    P.input.fwd = P.input.side = 0; P.input.run = P.input.jump = P.input.use = false;
    game.speed = 1; // a smol lives in real time
    // what it carried as a creature goes into its inventory, and tool-users get their building plans
    Sv().absorb(c, game);
    givePlans(c);
    C.emote(c, "huh", 2);
    C.say(c, "i feel… watched", game);
    if (SB.Input) SB.Input.mode = "pov";
    var cm = cam();
    if (cm) {
      S.cam = { x: cm.x, z: cm.z, zoom: cm.zoom, tZoom: cm.tZoom, yaw: cm.yaw, tYaw: cm.tYaw, follow: cm.follow };
      cm.follow = null; cm.intro = null;
      cm.pov = { x: c.x, y: c.y + 1, z: c.z, yaw: S.yaw, pitch: S.pitch, fov: P.FOV, far: farFor() };
      hookRender();
    }
    if (SB.Game.select) SB.Game.select(game, null);
    hookBus();
    questStart();
    if (!P.headless && SB.PovHud) SB.PovHud.build(S);
    SB.bus.emit("possess", { c: c });
    return true;
  };

  P.leave = function (why) {
    if (!S) return;
    var s = S, c = s.c, game = s.game;
    S = null; P.active = false; P.c = null;
    c._pov = false; c._povMove = false;
    if (SB.Render) SB.Render.ghost = null;
    // the plans are yours, not the smol's
    if (c.inv && c.inv.s) c.inv.s.forEach(function (sl, i) { if (sl && sl.k === "plans") c.inv.s[i] = null; });
    if (c.alive) { Sv().release(c, game); if (!c.action) c.thinkT = 0.3; }
    game.speed = s.speed || 1;
    if (SB.Input) SB.Input.mode = "god";
    var cm = cam();
    if (cm) {
      cm.pov = null;
      cm.x = c.x; cm.z = c.z; cm.y = c.y;
      cm.zoom = cm.tZoom = Math.min(s.cam ? s.cam.tZoom : 8, 9);
      if (s.cam) { cm.yaw = cm.tYaw = s.cam.tYaw; }
      if (c.alive && SB.Input && SB.Input.follow) SB.Input.follow(c);
    }
    if (typeof document !== "undefined" && document.exitPointerLock && document.pointerLockElement) try { document.exitPointerLock(); } catch (e) {}
    if (SB.PovHud) SB.PovHud.remove();
    if (c.alive && SB.Game.select) SB.Game.select(game, c.id);
    var name = c.name;
    if (SB.UI && SB.UI.toast && !P.headless && why !== "died") {
      if (s.lessons) SB.UI.toast("👁 back in the sky. " + name + " learned from " + s.lessons + " of your choices: its brain leans a little more your way now.", "", 6000);
      else SB.UI.toast("👁 back in the sky.");
    }
    if (SB.UI && SB.UI.povDone) setTimeout(function () { if (!P.active) SB.UI.povDone(); }, 400);
    SB.bus.emit("unpossess", { c: c, lessons: s.lessons, why: why || "left" });
  };

  P.lessons = function () { return S ? S.lessons : 0; };
  function farFor() { var q = SB.Render && SB.Render.quality; return q && q.scale < 0.75 ? 52 : 78; }
  function givePlans(c) {
    if (c.tier < 2) return;
    var v = Sv().inv(c);
    for (var i = 0; i < v.s.length; i++) if (v.s[i] && v.s[i].k === "plans") return;
    var at = v.s[8] ? -1 : 8;
    if (at < 0) for (var j = 8; j >= 0; j--) if (!v.s[j]) { at = j; break; }
    if (at < 0) for (j = 9; j < v.s.length; j++) if (!v.s[j]) { at = j; break; }
    if (at >= 0) v.s[at] = { k: "plans", n: 1 };
  }

  /* ---------------- driving (called from the creature's tick instead of its brain) ---------------- */

  P.drive = function (c, dt, game) {
    if (!S || S.c !== c) { c._pov = false; return; } // a stale flag (a reload, a swapped island)
    if (S.dead) return;
    S.t += dt;
    var w = game.world, C = SB.Creature, ch = c.chem, inp = P.input;
    var f = inp.fwd || 0, sd = inp.side || 0, mag = Math.hypot(f, sd);
    c._povMove = false;
    // walking to the sniffed food by itself (G twice, K-0022): any move key takes over again
    if (S.auto) {
      var ax = S.auto.x - c.x, az = S.auto.z - c.z, ad = Math.hypot(ax, az);
      S.auto.t -= dt;
      if (mag > 0.08 || S.auto.t <= 0) S.auto = null;
      else if (ad < 1.6) { S.auto = null; say("here! right click to nibble a bush, or left click food to eat it"); }
      else { S.yaw += SB.angDiff(S.yaw, Math.atan2(-ax, -az)) * Math.min(1, dt * 5); f = 1; sd = 0; mag = 1; }
    }
    // pep: running and swinging use it up, standing still brings it back. tiredness caps it
    var pepMax = SB.clamp(1 - (ch.tired || 0) * 0.7 - (ch.sleepy || 0) * 0.2, 0.15, 1);
    var running = inp.run && mag > 0.08 && c.stage >= 1 && S.stam > 0.04;
    if (running) S.stam = Math.max(0, S.stam - dt * 0.11);
    else S.stam = Math.min(pepMax, S.stam + dt * (mag > 0.08 ? 0.05 : 0.14));
    if (S.stam > pepMax) S.stam = pepMax;
    if (mag > 0.08) {
      if (mag > 1) { f /= mag; sd /= mag; mag = 1; }
      if (c.plan) C.endPlan(c, game, false);
      if (c.action) c.action = null;
      S.work = null;
      if (S.busy) { S.busy = null; }
      if (c.asleep) { c.asleep = false; c.inBed = false; }
      var sy = Math.sin(S.yaw), cy = Math.cos(S.yaw);
      // forward is (-sin yaw, -cos yaw), right is (cos yaw, -sin yaw)
      var dx = -sy * f + cy * sd, dz = -cy * f - sy * sd, dl = Math.hypot(dx, dz) || 1;
      dx /= dl; dz /= dl;
      var sp = C.speedOf(c, null) * (running ? 1.75 : 1) * mag * (c.tier === 0 ? 1.1 : 1);
      var step = sp * dt, swim = C.canSwim(c), moved = 0;
      var nx = c.x + dx * step, nz = c.z + dz * step;
      if (ok(w, nx, nz, swim)) { c.x = nx; c.z = nz; moved = step; }
      else if (ok(w, nx, c.z, swim)) { c.x = nx; moved = Math.abs(dx * step); } // slide along whatever's in the way
      else if (ok(w, c.x, nz, swim)) { c.z = nz; moved = Math.abs(dz * step); }
      if (moved > 0) {
        c.facing += SB.angDiff(c.facing, Math.atan2(dx, dz)) * Math.min(1, dt * 12);
        c.anim.walk += moved * 3.2; c.moving = true; c._povMove = true;
        c.stats.walked += moved;
        if (running) SB.Chem.apply(ch, { tired: dt * 0.006 });
        S.bob += moved * (running ? 2.4 : 2.9);
        S.stepAcc += moved;
        if (S.stepAcc > (c.stage === 0 ? 0.35 : 0.55)) { S.stepAcc = 0; footstep(c, w); }
      }
    } else if (!c.action && !c.plan) {
      c.facing += SB.angDiff(c.facing, S.yaw + Math.PI) * Math.min(1, dt * 6); // looking about turns the body
    }
    apart(c, game, dt); // no walking into other smols: the eye never ends up inside someone
    if (inp.jump) {
      inp.jump = false;
      if (c.onGround !== false && !c.asleep) {
        var jy = Math.sin(S.yaw), jc = Math.cos(S.yaw), js = mag > 0.08 ? C.speedOf(c, null) * (inp.run ? 1.6 : 1) : 0;
        var jx = (-jy * f + jc * sd), jz = (-jc * f - jy * sd), jl = Math.hypot(jx, jz) || 1;
        c.vx = jx / jl * js; c.vz = jz / jl * js; c.vy = c.stage === 0 ? 4.6 : 5.6; c.onGround = false;
        c.anim.squash = 0.3;
        SB.Chem.apply(ch, { tired: 0.004, bored: -0.01 });
        audio("boing", 0.25);
      }
    }
    // a timed job (pulling a vine, snapping a stick off): moving cancels it
    if (S.busy) {
      S.busy.t += dt;
      c.anim.squash = Math.abs(Math.sin(S.busy.t * 9)) * 0.12;
      if (S.busy.t >= S.busy.dur) { var b = S.busy; S.busy = null; b.done(); }
    }
    // building: keep at it while the site needs work
    if (S.work) {
      var st = SB.Game.byId(game, S.work.id);
      if (!st || st.done || S.work.t <= 0 || SB.dist(st.x, st.z, c.x, c.z) > SK[st.kind].r * (st.s || 1) + 2.2) S.work = null;
      else {
        S.work.t -= dt;
        if (I().siteReady(st)) {
          c.anim.squash = Math.abs(Math.sin(S.t * 8)) * 0.2; S.swing = Math.max(S.swing, Math.abs(Math.sin(S.t * 6)));
          if ((S.work.snd = (S.work.snd || 0) - dt) <= 0) { S.work.snd = 0.45; audio("build", 0.6); }
          if (I().work(c, st, dt, game)) { S.work = null; C.emote(c, "proud", 2); say("built the " + SK[st.kind].label + "! " + SK[st.kind].emoji); }
        } else S.work = null;
      }
    }
    // holding the use button down keeps swinging
    S.swingT = Math.max(0, S.swingT - dt);
    S.swing = Math.max(0, S.swing - dt * 3.2);
    if (inp.use && S.swingT <= 0 && !S.busy) P.act("use", undefined, true);
    // walking over your own drops (and anything loose at your feet) picks them up
    if ((S.pickT -= dt) <= 0) { S.pickT = 0.2; autoPickup(c, game); }
    // damage and cold, for the screen: a flash when hurt
    if (ch.health < S.lastHp - 0.004) { S.hurtT = 0.6; if (H()) H().hurt(S.lastHp - ch.health); }
    S.lastHp = ch.health; S.hurtT = Math.max(0, S.hurtT - dt);
    // friends tag along, and share food with a hungry you
    if ((S.friendT -= dt) <= 0) { S.friendT = 6; friends(c, game); }
    if ((S.questT -= dt) <= 0) { S.questT = 0.3; questTick(); }
    if ((S.nightT = (S.nightT || 0) - dt) <= 0) { S.nightT = 0.5; nightTick(c, game); }
    // the nose: the sniff marker fades, or goes when you get there
    S.sniffCd = Math.max(0, (S.sniffCd || 0) - dt);
    if (S.sniff && ((S.sniff.t -= dt) <= 0 || SB.dist(S.sniff.x, S.sniff.z, c.x, c.z) < 1.6)) S.sniff = null;
  };
  function ok(w, x, z, swim) { return SB.World.walkable(w, x, z, swim); }
  // a soft push apart from anyone you bump into (a bit each tick, so it slides rather than snaps)
  function apart(c, game, dt) {
    var C = SB.Creature, rc = C.radius(c), cs = game.creatures, w = game.world;
    for (var i = 0; i < cs.length; i++) {
      var o = cs[i];
      if (o === c || !o.alive || o.heldBy || Math.abs((o.y || 0) - (c.y || 0)) > 1.2) continue;
      var dx = c.x - o.x, dz = c.z - o.z, d = Math.hypot(dx, dz), min = rc + C.radius(o) + 0.05;
      if (d >= min) continue;
      if (d < 1e-4) { dx = Math.sin(S.yaw); dz = Math.cos(S.yaw); d = 1; }
      var k = (min - d) * Math.min(1, dt * 12), nx = c.x + dx / d * k, nz = c.z + dz / d * k;
      if (ok(w, nx, nz, C.canSwim(c))) { c.x = nx; c.z = nz; }
    }
  }
  P.apart = apart;

  function autoPickup(c, game) {
    if (c.tier < 1) return;
    SB.World.itemsNear(game.world, c.x, c.z, 1.7, function (o) {
      if (o.gone || o.heldBy != null || (o.data && o.data.noPick > game.time)) return;
      var d = SB.dist(o.x, o.z, c.x, c.z), mine = o.data && o.data.by === c.id;
      if (d > (mine ? 1.7 : 0.75)) return;
      if (Sv().whyNot(c, o.kind) || K[o.kind].critter || o.kind === "egg" || o.data.rotten || o.data.pod || o.data.starter) return;
      gain(Sv().pickup(c, game, o), o.kind);
    });
  }
  // a "+1 stick" on the screen (and a pop)
  function gain(n, kind) {
    if (!n) return;
    audio("pop", 0.5);
    if (H()) H().gain(kind, n);
    SB.bus.emit("povGain", { c: S && S.c, kind: kind, n: n });
  }
  P._gain = gain;

  function friends(c, game) {
    var n = 0, Soc = SB.Social;
    var near = game.creatures.filter(function (o) { return o !== c && o.alive && o.species === "smol" && !o.heldBy && !o.asleep && !o.stranger && !o.plan && o.tribe === c.tribe; });
    near.sort(function (a, b) { return SB.dist2(a.x, a.z, c.x, c.z) - SB.dist2(b.x, b.z, c.x, c.z); });
    for (var i = 0; i < near.length && n < 3; i++) {
      var o = near[i], d = SB.dist(o.x, o.z, c.x, c.z);
      if (d > 26) break;
      var op = Soc && Soc.opinion ? Soc.opinion(game, o, c) : 0, kin = SB.Game.related && SB.Game.related(game, o, c);
      if (op < 10 && !kin) continue;
      n++;
      var busy = o.action && o.action.verb !== V.idle && o.action.verb !== V.wander;
      // a friend with food and a hungry you: they bring it over
      if (c.chem.hunger > 0.55 && o.holding != null && d < 12 && !busy) {
        var it = SB.Game.byId(game, o.holding);
        if (it && it.noun === "food" && SB.Creature.startAction(o, game, V.give, { type: "creature", id: c.id })) { SB.Creature.say(o, "here. food", game); continue; }
      }
      if (d > 4 && !busy) {
        var a = Math.atan2(o.x - c.x, o.z - c.z) + (Math.random() - 0.5);
        SB.Creature.sendTo(o, c.x + Math.sin(a) * 2, c.z + Math.cos(a) * 2, game, 10);
        if (Math.random() < 0.3) SB.Creature.say(o, Math.random() < 0.5 ? "wait me!" : c.name.toLowerCase() + "!", game);
      }
    }
  }

  function surface(c, w) {
    if (SB.World.depthAt(w, c.x, c.z) > 0.08) return "water";
    if (SB.World.bridgeAt && SB.World.bridgeAt(w, c.x, c.z)) return "wood";
    var b = SB.BIOMES[SB.World.biomeAt(w, c.x, c.z)], id = b ? b.id : "meadow";
    if (id === "beach" || id === "desert" || id === "savanna") return "sand";
    if (id === "tundra") return "snow";
    if (id === "mountain" || id === "crystal") return "stone";
    if (w.season === 3 && SB.World.tempAt(w, c.x, c.z) < 0.35) return "snow"; // winter
    return "grass";
  }
  P.surface = surface;
  function footstep(c, w) { audio("step_" + surface(c, w), 0.5 + (c.stage || 0) * 0.12); }

  /* ---------------- what am I looking at? ---------------- */

  function eyeY(c) {
    var r = SB.Creature.radius(c);
    return c.y + r * (c.look && c.look.legs ? 2.1 + c.look.legLen * 0.9 : 1.7) + 0.05;
  }
  // the thing nearest the middle of the view (and within reach), as a target for creature.js
  P.look = function (game, c, yaw, pitch) {
    c = c || (S && S.c); game = game || (S && S.game);
    if (!c || !game) return null;
    yaw = yaw != null ? yaw : S ? S.yaw : c.facing + Math.PI; pitch = pitch != null ? pitch : S ? S.pitch : 0;
    var w = game.world, ex = c.x, ez = c.z, ey = eyeY(c);
    var fx = -Math.sin(yaw) * Math.cos(pitch), fy = Math.sin(pitch), fz = -Math.cos(yaw) * Math.cos(pitch);
    var best = null, bs = 1e9;
    function consider(t, x, y, z, r, extra) {
      var dx = x - ex, dy = y - ey, dz = z - ez, d = Math.hypot(dx, dy, dz);
      var hd = Math.hypot(dx, dz) - r;
      if (hd > P.REACH || d < 0.01) return;
      var along = (dx * fx + dy * fy + dz * fz) / d, ang = Math.acos(SB.clamp(along, -1, 1));
      var allow = 0.28 + Math.atan2(r, d);
      if (ang > allow) return;
      var s = ang / allow + hd * 0.08 + (extra || 0);
      if (s < bs) { bs = s; best = t; }
    }
    game.creatures.forEach(function (o) {
      if (o === c || !o.alive || o.heldBy || SB.dist2(o.x, o.z, ex, ez) > 49) return;
      var r = SB.Creature.radius(o);
      consider({ type: "creature", id: o.id }, o.x, o.y + r, o.z, r);
    });
    SB.World.itemsNear(w, ex, ez, P.REACH + 1, function (o) {
      if (o.gone || o.heldBy != null) return;
      consider({ type: "item", id: o.id }, o.x, o.y + (o.r || 0.15), o.z, (o.r || 0.15) + 0.12, -0.05);
    });
    SB.World.eachNodeNear(w, ex, ez, P.REACH + 2, function (n) {
      if (n.state === "gone" || n.state === "burning") return;
      var r = NK[n.kind].r * (n.s || 1) * (n.left != null ? Sv().shrinkOf(n) : 1);
      var hy = n.state === "stump" ? 0.3 : n.kind === "vines" ? 0.6 : Math.min(1.2, r * 1.4);
      if (Sv().isTree(n)) r = Math.min(r, 0.7); // you aim at the trunk, not the whole crown
      consider({ type: "node", id: n.id }, n.x, (n.y || SB.World.groundY(w, n.x, n.z)) + hy, n.z, r, 0.15); // big things lose ties to small ones
    });
    SB.World.structsNear(w, ex, ez, P.REACH + 3).forEach(function (st) {
      var r = SK[st.kind].r * (st.s || 1);
      consider({ type: "struct", id: st.id }, st.x, SB.World.groundY(w, st.x, st.z) + 0.5, st.z, r, st.done ? 0.25 : -0.2); // a site you're building wins ties
    });
    if (best) return best;
    // nothing standing there: is it water under the crosshair?
    for (var k = 0.4; k < P.REACH; k += 0.25) {
      var px = ex + fx * k, py = ey + fy * k, pz = ez + fz * k;
      var gy = SB.World.groundY(w, px, pz);
      if (py <= gy + 0.05 || (fy < 0 && k > 2.5)) {
        if (SB.World.depthAt(w, px, pz) > 0.1) return { type: "water", x: px, z: pz };
        break;
      }
    }
    if (SB.World.depthAt(w, ex, ez) > 0.12) return { type: "water", x: ex, z: ez };
    return null;
  };
  // where the view ray meets the ground (for planting, putting things down and placing buildings)
  P.aimGround = function (game, c, maxD) {
    c = c || (S && S.c); game = game || (S && S.game);
    if (!c || !game) return null;
    var yaw = S ? S.yaw : c.facing + Math.PI, pitch = S ? S.pitch : -0.3, w = game.world, ey = eyeY(c);
    var fx = -Math.sin(yaw) * Math.cos(pitch), fy = Math.sin(pitch), fz = -Math.cos(yaw) * Math.cos(pitch), last = null;
    maxD = maxD || 7;
    for (var k = 0.5; k <= maxD; k += 0.2) {
      var px = c.x + fx * k, py = ey + fy * k, pz = c.z + fz * k;
      if (py <= SB.World.groundY(w, px, pz)) return { x: px, z: pz, d: k };
      last = { x: px, z: pz, d: k };
    }
    // looking level or up: the spot on the ground straight ahead at arm's length-ish
    var fl = Math.hypot(fx, fz) || 1, dd = Math.min(maxD, 3.2);
    return last && pitch > -0.05 ? { x: c.x + fx / fl * dd, z: c.z + fz / fl * dd, d: dd, far: true } : last;
  };

  function label(r) {
    if (!r) return "";
    if (r.type === "creature") return r.ref.species === "smol" ? r.ref.name : r.ref.species;
    if (r.type === "water") return "water";
    var d = r.type === "item" ? K[r.kind] : r.type === "node" ? NK[r.kind] : SK[r.kind];
    if (r.type === "node" && r.ref.state === "stump") return "stump";
    return d ? d.label : r.kind;
  }
  P.label = label;
  function kl(k) { return k === "plans" ? "plans" : K[k] ? K[k].label : k; }

  /* ---------------- what each button does, right now ----------------
     use (left click / the big phone button): the thing in your hand, on the thing you point at
     place (right click): eat it, plant it, put it down, give it, place a building
     pick (F): pick up, pull, snap off, prise loose
     E: the best of those three, so one key always does something sensible */
  P.options = function (game, c, t) {
    game = game || (S && S.game); c = c || (S && S.c);
    var Surv = Sv(), C = SB.Creature, Id = I();
    var r = t ? C.resolve(game, t) : null, nm = label(r), tier = c.tier;
    var held = Surv.held(c), hk = held ? held.k : null, P0 = Surv.power(hk && K[hk] && K[hk].tool ? hk : "paws");
    var toolName = hk && K[hk] && K[hk].tool ? K[hk].label : null;
    var o = { use: null, place: null, pick: null, ctx: null, r: r, name: nm };
    function op(label, go, verb, extra) { var x = { label: label, go: go, verb: verb, r: r }; for (var k in extra || {}) x[k] = extra[k]; return x; }
    function no(label) { return { label: label, locked: true, r: r }; }
    var g = S && S.ghost;
    // building mode: right click places, left click / Esc cancels
    if (g) {
      o.place = g.ok ? op("place the " + SK[g.kind].label, function () { return placeGhost(); }, V.build) : no(g.why || "can't build here");
      o.use = op("cancel", function () { P.cancelBuild(); return true; }, null);
      o.ctx = o.place.locked ? null : o.place;
      return o;
    }
    if (r && r.type === "creature") {
      var cr = r.ref;
      if (cr.species === "grump") o.use = op("hit the grump" + (toolName ? " with your " + toolName : ""), function () { return attack(cr); }, V.hit);
      else if (cr.species !== "smol") o.use = op("pounce on the " + nm, function () { return attack(cr); }, V.hit);
      else {
        o.use = op("talk to " + cr.name, function () { return creatureAct(V.talk, t); }, V.talk);
        if (held && hk !== "plans") o.place = op((Surv.edible(hk) ? "share your " + kl(hk) + " with " + cr.name : "give " + cr.name + " your " + kl(hk)), function () { return give(cr); }, V.give);
        else o.place = op((cr.stage === 0 ? "pet " : "hug ") + cr.name, function () { return creatureAct(V.cuddle, t); }, V.cuddle);
      }
    } else if (r && r.type === "item") {
      var it = r.ref, def = K[it.kind] || {}, pn = Surv.pileN(it), why = Surv.whyNot(c, it.kind);
      if (def.critter) {
        if (hk === "spear") o.use = op("spear the " + nm, function () { return spearCritter(it); }, V.use);
        else o.use = op("pounce on the " + nm, function () { return pounce(it); }, V.hit);
      } else {
        if (it.kind === "nut" && (hk === "stone" || hk === "hammer" || hk === "primtool")) o.use = op("crack the nut", function () { return crackNut(it); }, V.use);
        else if (tier === 0 && Surv.edible(it.kind)) o.use = op("eat the " + nm, function () { return eatItem(it); }, V.eat);
        else o.use = op("kick the " + nm, function () { return kick(it); }, V.hit);
        if (!why && !it.data.rotten) o.pick = op("pick up the " + nm + (pn > 1 ? " (" + pn + ")" : ""), function () { return pickItem(it); }, V.pickup);
        else if (Surv.edible(it.kind)) o.pick = op("eat the " + nm, function () { return eatItem(it); }, V.eat);
        else if (it.data.rotten) o.pick = no("it's gone bad");
        else o.pick = no(why);
      }
    } else if (r && r.type === "node") {
      var n = r.ref, nd = NK[n.kind], rk = Surv.rockOf(n), gat = Surv.gatherOf(c, game, n);
      if (n.state === "stump") {
        if (n.block) o.use = P0.wood > 0 ? op("split the log", function () { return hitNode(n, hk); }, V.use) : no("split the log: hold an axe or a rock-on-a-stick");
        else if (hk === "log") o.place = op("put the log on the stump", function () { return putBlock(n); }, V.drop);
        else if (Surv.count(c, "log", true)) o.hint = "a stump: hold a log and right click to split it";
      } else if (n.kind === "vines") {
        if (n.state === "picked") o.pick = no("pulled bare. it grows back");
        else if (tier < 2) o.pick = no("you need hands to pull vines");
        else { o.pick = op("pull a vine", function () { return gather(n); }, V.pickup); o.use = o.pick; }
      } else if (Surv.isTree(n)) {
        if (n.state === "ok" && tier >= 1) o.use = P0.wood > 0 ? op("chop the " + nm, function () { return hitNode(n, hk); }, V.use) : op("shake the " + nm, function () { return hitNode(n, hk); }, V.play);
        else if (n.state === "ok") o.use = op("bump the " + nm, function () { return shakeNode(n); }, V.play);
        if (gat && tier >= 2) o.pick = op(gat.verb, function () { return gather(n); }, V.pickup);
        else if (tier < 2) o.pick = tugOpt(n);
      } else if (rk) {
        var pw = rk.ore ? P0.ore : P0.stone;
        if (rk.ore && hk === "hammer" && tier < 4) pw = 0;
        if (rk.crystal && hk === "stonepick" && tier < 4) pw = 0;
        if (tier >= 1) o.use = pw > 0 ? op((rk.ore ? "mine the " : "chip the ") + nm + (toolName ? "" : " with your paws"), function () { return hitNode(n, hk); }, V.use) : no(rk.crystal ? "too hard: needs a pick, and a builder's know-how" : rk.ore ? "copper ore! dig it out with a stone pick" : "punch it? ouch");
        if (gat && tier >= 2) o.pick = op(gat.verb, function () { return gather(n); }, V.pickup);
      } else if (n === game.world.T.nest) {
        o.place = op("sleep in the nest", function () { return sleepAt(t); }, V.sleep);
        if (held && Surv.SOFT[hk]) o.use = Surv.nest(game).cosy >= Surv.NEST_MAX ? no("the nest is as cosy as it gets") : op("line the nest with your " + kl(hk), function () { return lineNest(); }, V.drop, { nestLine: 1 });
      } else if (n.kind === "bush" || n.kind === "roots" || n.kind === "gourds" || n.kind === "hive" || n.kind === "cactus") {
        o.use = op((n.kind === "roots" ? "pull at the " : "shake the ") + nm, function () { return shakeNode(n); }, V.play);
        if (n.kind === "bush" || n.kind === "roots" || n.kind === "gourds") o.place = op("nibble the " + nm, function () { return creatureAct(V.eat, t); }, V.eat);
        if (tier < 2 && n.kind !== "hive" && n.kind !== "cactus") o.pick = tugOpt(n);
      } else if (gat) {
        o.pick = tier >= 2 ? op(gat.verb, function () { return gather(n); }, V.pickup) : Surv.canTug(game, n) ? tugOpt(n) : no("you need hands for that");
        o.use = o.pick.locked ? null : o.pick;
      }
    } else if (r && r.type === "struct") {
      var st = r.ref, d = st.data || {};
      if (!st.done) {
        if (tier < 2) o.use = no("you need hands to build");
        else if (Surv.canDeliver(c, st)) o.use = op("add your things to the " + nm, function () { return deliver(st); }, V.build);
        else if (Id.siteReady(st)) o.use = op("build the " + nm, function () { return work(st); }, V.build);
        else o.use = no("bring it " + Surv.needs(st).map(function (x) { return x.n + " " + kl(x.k) + (x.n > 1 && x.k !== "leaves" ? "s" : ""); }).join(", "));
        o.place = o.use && !o.use.locked ? o.use : null;
      } else if (st.kind === "campfire" || st.kind === "kiln") {
        if (hk && Surv.FUEL[hk] && (d.lit || Id.known(c, "fire"))) o.use = op((d.lit ? "feed the fire your " : "fuel the fire with your ") + kl(hk), function () { return feed(st, hk); }, V.use);
        else if (!d.lit && (Surv.has(c, "torch") || (Id.known(c, "fire") && Surv.count(c, "stick")))) o.use = op("light the fire", function () { return light(st); }, V.use);
        else if (d.lit) o.use = op("warm your paws", function () { return creatureAct(V.use, t); }, V.use);
        else o.use = no(Id.known(c, "fire") ? "a cold fire. bring a stick to light it" : "a cold fire. you don't know how to light it");
        o.place = op("sit by the fire", function () { return sit(); }, V.idle);
        if (hk && Surv.edible(hk) && K[hk].raw && d.lit) o.place = op("cook your " + kl(hk), function () { return cook(hk); }, V.make);
      } else if (st.kind === "hut" || st.kind === "leanto" || st.kind === "house") {
        o.place = op("sleep in the " + nm, function () { return sleepAt(t); }, V.sleep);
      } else if (st.kind === "farm") {
        o.use = tier >= 2 ? op(d.grow > 0.6 ? "harvest" : "check the crop", function () { return creatureAct(V.use, t); }, V.use) : null;
      } else if (st.kind === "totem" || st.kind === "observatory") {
        o.use = tier >= 2 ? op("study the " + nm, function () { return creatureAct(V.use, t); }, V.use) : null;
      }
    } else if (r && r.type === "water") {
      if (tier >= 2 && (hk === "rod" || hk === "spear")) o.use = op("fish", function () { return fish(hk); }, V.use);
      o.place = op("drink", function () { return creatureAct(V.eat, t); }, V.eat);
      if (!o.use) o.use = o.place;
    }
    // things in your hand that don't need a target
    if (held && !o.place) {
      if (hk === "plans") o.place = op("open your building plans", function () { if (H()) H().openBag("build"); return true; }, null);
      else if (Surv.edible(hk)) o.place = op("eat your " + kl(hk), function () { return eatHeld(); }, V.eat);
      else if (hk === "nut" && (Surv.has(c, "stone") || Surv.has(c, "hammer") || Surv.has(c, "primtool"))) o.place = op("crack your nut", function () { return crackHeld(); }, V.use);
      else if (hk === "sapling" || hk === "seed") {
        var ag = S ? S.aim : P.aimGround(game, c);
        o.place = ag && Surv.plantSpot(game, ag.x, ag.z) ? op("plant the " + kl(hk), function () { return plant(hk, ag); }, V.drop) : no("no room to plant here: find open ground");
      } else if (!o.use || !o.place) {
        var ag2 = S ? S.aim : P.aimGround(game, c);
        if (ag2 && !ag2.far) o.place = op("put down the " + kl(hk), function () { return putDown(ag2); }, V.drop);
      }
    }
    if (!o.use && !r && held && K[hk] && K[hk].tool) o.use = op("swing your " + kl(hk), function () { swingAnim(); return true; }, null);
    o.ctx = o.pick && !o.pick.locked ? o.pick : o.use && !o.use.locked && o.use.label !== "cancel" ? o.use : o.place && !o.place.locked ? o.place : null;
    if (o.use && o.use.nestLine) o.ctx = o.use;
    if (!o.ctx && tier < 2) o.ctx = op(S && S.sniff && !S.auto ? "walk to food" : "sniff for food", function () { return P.sniff(); }, null); // a small body's nose (G)
    return o;
    function tugOpt(n) { return Surv.canTug(game, n) ? op("tug off some leaves", function () { return tug(n); }, V.pickup) : null; }
  };

  // do one of them: which = "use" | "place" | "pick" | "ctx". returns the option done (or null)
  P.act = function (which, t, repeat) {
    if (!S || S.dead) return null;
    var c = S.c, game = S.game;
    if (t === undefined) t = P.look(game, c);
    var o = P.options(game, c, t), op = o[which];
    if (!op) { if (!repeat && which === "use") swingAnim(); return null; }
    if (op.locked) { if (!repeat) say(op.label); return null; }
    if (repeat && (op.verb === V.talk || op.verb === V.cuddle || op.verb === V.give || op.verb === V.eat || op.verb === V.sleep || op.verb === V.build && !op.r)) return null; // holding the button only repeats swings
    var res = op.go();
    if (res && op.verb != null) learn(game, c, op.verb, op.r);
    return res ? op : null;
  };
  // old names (tests, the god-game help): main = E, alt = F, hit = left click
  P.interact = function (which, t) { return P.act(which === "alt" ? "pick" : which === "hit" ? "use" : which === "place" ? "place" : "ctx", t); };

  /* ---------------- the actions ---------------- */

  function say(msg) { if (H()) H().say(msg); S && (S.lastSay = msg); }
  P.say = say;
  function swingAnim() { if (S) { S.swing = 1; S.swingT = P.SWING; } }
  function tired(amount) { if (S) S.stam = Math.max(0, S.stam - amount); }
  function creatureAct(verb, t) {
    var C = SB.Creature;
    if (!C.startAction(S.c, S.game, verb, t)) return false;
    return true;
  }
  function sit() { var C = SB.Creature; C.startAction(S.c, S.game, V.idle, null); S.c.action.dur = 8; C.emote(S.c, "happy", 1.5); return true; }
  function sleepAt(t) {
    var c = S.c, ch = c.chem;
    if (ch.sleepy < 0.12 && ch.tired < 0.2 && !S.game.world.night) { say("not sleepy yet. come back tonight"); return false; }
    SB.Creature.startAction(c, S.game, V.sleep, t);
    say("zzz… (move to wake up)");
    return true;
  }
  P.sleep = function () {
    if (!S) return;
    var c = S.c, ch = c.chem;
    if (ch.sleepy < 0.15 && ch.tired < 0.25) { say("not sleepy"); return; }
    learn(S.game, c, V.sleep, null);
    SB.Creature.startAction(c, S.game, V.sleep, null);
    say("zzz… (move to wake up)");
  };
  function attack(o) {
    var c = S.c, game = S.game, Surv = Sv(), hk = Surv.heldKind(c), pw = Surv.power(hk && K[hk] && K[hk].tool ? hk : "paws");
    if (S.swingT > 0) return false;
    swingAnim(); tired(0.03);
    if (SB.dist(o.x, o.z, c.x, c.z) > SB.Creature.radius(c) + SB.Creature.radius(o) + 1.2) { say("too far: get closer"); return false; }
    SB.Creature._hitFx(c, o, game);
    // weapons from your inventory hurt more (club and spear as the AI's do; a rock-on-a-stick, an axe, a pick a bit)
    if (o.species === "grump" && pw.dmg > 0 && o.alive) {
      SB.Chem.apply(o.chem, { pain: 0.35 * pw.dmg / (o.tough || 1), fear: 0.5 * pw.dmg / (o.tough || 1) });
      o.whacked = (o.whacked || 0) + pw.dmg;
      if (o.whacked >= (SB.Threats ? SB.Threats.whacksNeeded(o) : 3)) {
        o.alive = false; o.gone = true; o.dying = false;
        if (SB.FX && SB.FX.burst) SB.FX.burst("crumbs", o.x, o.y + 0.5, o.z, 14, { col: [0.5, 0.3, 0.6] });
        SB.Game.note(game, c.name + " chased a grump off for good! 🏏"); SB.bus.emit("grumpChased", { c: c, g: o });
        say("the grump runs off for good!");
      } else { o.action = null; o.thinkT = 0; }
      wear();
    }
    audio("bonk", 0.8);
    return true;
  }
  function pounce(it) {
    var c = S.c, game = S.game;
    swingAnim();
    var def = K[it.kind];
    if (def.food && def.noun === "bug" && game.rng.chance(0.5)) { var r = Sv().eat(c, game, it.kind, it); SB.World.remove(game.world, it); if (r && r.msg) say(r.msg); else say("caught it! crunchy"); return true; }
    it.data.flee = 1.5; if (def.critter === "hop") it.data.t = 0;
    say(def.critter === "hop" ? "it hops away. a spear would do it" : "missed!");
    return true;
  }
  function spearCritter(it) {
    var c = S.c, game = S.game;
    swingAnim();
    if (game.rng.chance(0.55)) {
      var x = it.x, z = it.z;
      SB.World.remove(game.world, it);
      Sv().spawn(game, "meat", 1, x, z, { by: c.id });
      if (game.rng.chance(0.6)) Sv().spawn(game, "fur", 1, x + 0.3, z, { by: c.id });
      SB.bus.emit("hunt", { c: c });
      say("got it!");
      wear();
    } else { it.data.flee = 2; say("missed"); }
    return true;
  }
  function crackNut(it) {
    var c = S.c, game = S.game;
    swingAnim();
    if (Sv().pileN(it) > 1) it = Sv().split(S.game, it);
    SB.World.transform(game.world, it, "nutmeat"); it.data.by = c.id;
    say("crack!"); audio("tap");
    return true;
  }
  function crackHeld() {
    var c = S.c, Surv = Sv();
    if (!Surv.take(c, "nut", 1).length) return false;
    var left = Surv.add(c, "nutmeat", 1);
    if (left) Surv.spawn(S.game, "nutmeat", 1, c.x, c.z, { by: c.id });
    say("crack! nut meat"); audio("tap");
    return true;
  }
  function kick(it) {
    var c = S.c, a = Math.atan2(it.x - c.x, it.z - c.z);
    swingAnim();
    if (Sv().pileN(it) > 1) it = Sv().split(S.game, it);
    SB.World.toss(it, Math.sin(a) * 4, Math.cos(a) * 4, 4);
    if (it.data) it.data.noPick = S.game.time + 1.5;
    return true;
  }
  function eatItem(it) {
    var c = S.c, game = S.game;
    if (Sv().pileN(it) > 1) it = Sv().split(game, it);
    var r = Sv().eat(c, game, it.kind, it);
    if (!r) return false;
    if (r.ok) SB.World.remove(game.world, it);
    if (r.msg) say(r.msg);
    audio("eat");
    if (r.ok) SB.bus.emit("povEat", { c: c, kind: it.kind });
    return !!r.ok;
  }
  function eatHeld() {
    var c = S.c, game = S.game, v = Sv().inv(c), sl = v.s[v.sel];
    if (!sl) return false;
    if (c.chem.hunger < 0.05 && K[sl.k].noun === "food") { say("you're full"); return false; }
    var k = sl.k;
    Sv().removeAt(c, v.sel, 1);
    var r = Sv().eat(c, game, k, null);
    if (r && r.msg) say(r.msg);
    audio("eat");
    SB.bus.emit("povEat", { c: c, kind: k });
    return true;
  }
  function pickItem(it) {
    var c = S.c, game = S.game, kind = it.kind;
    if (Sv().whyNot(c, kind)) { say(Sv().whyNot(c, kind)); return false; }
    var n = Sv().pickup(c, game, it);
    if (!n) { say(c.tier < 2 ? "your mouth is full. drop it (Q) first" : "your bag is full"); return false; }
    if (c.tier < 2 && SB.Creature.habit) SB.Creature.habit(c, "hands", 0.35); // carrying in its mouth is practice for hands (echoes)
    gain(n, kind);
    return true;
  }
  function gather(n) {
    var c = S.c, game = S.game, g = Sv().gatherOf(c, game, n);
    if (!g) return false;
    if (!Sv().room(c, g.kind)) { say("your bag is full"); return false; }
    if (S.busy) return false;
    S.busy = { t: 0, dur: g.secs, label: g.verb, done: function () {
      if (!S) return;
      var r = Sv().gather(c, game, n);
      if (r && r.kind && !r.full) { gain(1, r.kind); if (n.kind === "vines") audio("snap", 0.6); }
    } };
    return true;
  }
  function hitNode(n, hk) {
    var c = S.c, game = S.game, Surv = Sv();
    if (S.swingT > 0) return false;
    swingAnim(); tired(0.025);
    var tk = hk && K[hk] && K[hk].tool ? hk : "paws";
    var res = Surv.hitNode(c, game, n, tk);
    if (res.kind === "chop" || res.kind === "split") audio("chop");
    else if (res.kind === "chip" || res.kind === "mine") audio(res.gave.length ? "crumble" : "mine", res.gave.length ? 0.7 : 1);
    else if (res.kind === "shake" || res.kind === "punch") audio("tap", 0.6);
    if (res.felled) { audio("timber"); say("timber! a " + NK[n.kind].label + " comes down"); }
    else if (res.gone) say(res.msg);
    else if (res.msg && (res.kind === "shake" || res.kind === "punch" || !res.ok || res.kind === "split" && res.gave.length)) say(res.msg);
    if (res.ok && tk !== "paws") wear();
    return res.ok;
  }
  function wear() {
    var c = S.c, v = Sv().inv(c), sl = v.s[v.sel];
    if (!sl || !K[sl.k] || !K[sl.k].tool) return;
    if (Sv().wear(c, S.game, v.sel)) { audio("snap"); say("your " + K[sl.k].label + " broke!"); }
  }
  function felledHook(n) {
    // those leaves and sticks… a lean-to! (the idea comes to a smol who already knows lashing)
    var c = S.c, Id = I();
    if (Id.known(c, "lashing") && !Id.known(c, "leanto") && Id.canHold(c, "leanto")) {
      if (!S.game.culture.found.leanto) Id.discover(c, "leanto", S.game); else Id.learn(c, "leanto", 1, S.game, "figured out");
      if (!P.headless) setTimeout(function () { if (S && S.c === c) say("💡 sticks… leaves… a vine: you could make a lean-to! (it's in your plans, B)"); }, 1800);
    }
    void n;
  }
  function tug(n) {
    var r = Sv().tug(S.c, S.game, n);
    if (r.msg) say(r.msg);
    if (r.ok) { swingAnim(); gain(1, "leaves"); }
    return !!r.ok;
  }
  function lineNest() {
    var c = S.c, v = Sv().inv(c), r = Sv().lineNest(c, S.game, v.sel);
    if (!r) return false;
    if (r.full) { say("the nest is as cosy as it gets"); return false; }
    audio(r.up ? "chime" : "build", r.up ? 1 : 0.5);
    say(r.up ? ["", "the nest feels cosier! eggs by it hatch a little faster", "cosier still. the eggs love it", "the cosiest nest on the island"][r.cosy] : "softer… " + r.left + " more to make it cosier");
    return true;
  }
  P.sniffing = function () { return S ? S.sniff : null; };
  // night: get home before the grumps come out. the marker leads to the nearest shelter (a hut, a lean-to,
  // a lit fire, or the nest), and getting there safe pays a spark once a night
  P.shelterFor = function (game, c) {
    var w = game.world, best = null, bd = 1e9;
    w.structures.forEach(function (s) {
      if (!s.done) return;
      var ok = s.kind === "hut" || s.kind === "house" || s.kind === "leanto" || (s.kind === "campfire" && s.data && s.data.lit);
      if (!ok) return;
      var d = SB.dist(s.x, s.z, c.x, c.z); if (d < bd) { bd = d; best = s; }
    });
    var n = w.T.nest, dn = n ? SB.dist(n.x, n.z, c.x, c.z) : 1e9;
    if (n && (dn < bd || !best)) { best = n; bd = dn; }
    return best ? { x: best.x, z: best.z, y: SB.World.groundY(w, best.x, best.z) + 1.4, d: bd, kind: best === n ? "nest" : best.kind } : null;
  };
  P.nightGoal = function () { return S ? S.night : null; };
  function nightTick(c, game) {
    var w = game.world, night = w.night, day = Math.floor(game.time / SB.DAY_LENGTH);
    if (!night) { S.night = null; return; }
    var safeDay = (game.settings || {}).povSafeNight;
    if (safeDay === day && !S.night) return;
    var t = P.shelterFor(game, c);
    if (!t) return;
    if (!S.night) { S.night = t; say("🌙 night is falling. get to the " + (t.kind === "nest" ? "nest" : t.kind === "campfire" ? "fire" : t.kind) + " before the grumps come out (follow the marker)"); return; }
    S.night = t;
    if (t.d < (t.kind === "nest" ? 2.4 : 3.2) || SB.World.shelterAt(w, c.x, c.z)) {
      S.night = null;
      (game.settings || (game.settings = {})).povSafeNight = day;
      if (SB.Game.addSparks) SB.Game.addSparks(game, 1, c);
      say("🏠 safe for the night. +1 ✨ sleep with Z until morning: you heal faster at home");
      SB.bus.emit("povSafeNight", { c: c });
    }
  }
  // G: a small body's nose. points the marker at the nearest food for a while
  P.sniff = function () {
    if (!S || S.dead) return false;
    var c = S.c, game = S.game, w = game.world, Surv = Sv();
    if (S.sniff && !S.auto) { S.auto = { x: S.sniff.x, z: S.sniff.z, t: 40 }; S.sniff.t = Math.max(S.sniff.t, 40); say("👃 off you go… (any move key stops)"); return true; }
    if (S.sniffCd > 0) { say("sniff… your nose needs a moment"); return false; }
    S.sniffCd = 3;
    var it = SB.World.nearestItem(w, c.x, c.z, 45, function (o) { return o.heldBy == null && Surv.edible(o.kind) && !(o.data && o.data.rotten) && !(K[o.kind] && K[o.kind].critter) && !(o.data && o.data.pod); });
    var nd = SB.World.nearestNode(w, c.x, c.z, 45, function (n) { var d = NK[n.kind]; return n.state === "ok" && d && d.drops && Surv.edible(d.drops) && n.kind !== "hive"; });
    var t = it, d1 = it ? SB.dist(it.x, it.z, c.x, c.z) : 1e9, d2 = nd ? SB.dist(nd.x, nd.z, c.x, c.z) : 1e9;
    if (d2 + 4 < d1) t = nd; // loose food beats a plant unless the plant is much nearer
    if (!t) { say("sniff sniff… nothing tasty nearby"); return true; }
    var d = Math.min(d1, d2);
    S.sniff = { x: t.x, z: t.z, y: (t.type === "item" ? t.y : SB.World.groundY(w, t.x, t.z)) + 1.1, t: 14 };
    say("sniff sniff… something tasty, " + Math.round(d) + "m that way. press G again to walk there");
    audio("tap", 0.4);
    SB.bus.emit("sniff", { c: c });
    return true;
  };
  function shakeNode(n) {
    var o = SB.World.shake(S.game.world, S.game, n, false);
    swingAnim();
    if (o) { o.data.by = S.c.id; say("something fell out!"); } else say("nothing ripe right now");
    return true;
  }
  function putBlock(n) { if (!Sv().setBlock(S.c, S.game, n)) return false; say("now hit it with an axe or a rock-on-a-stick"); audio("build", 0.6); return true; }
  function deliver(st) {
    var c = S.c, game = S.game;
    if (SB.dist(st.x, st.z, c.x, c.z) > SK[st.kind].r * (st.s || 1) + 2.4) { say("get closer"); return false; }
    var got = Sv().deliver(c, game, st);
    if (!got.length) return false;
    SB.Creature.emote(c, "proud", 1.2); audio("build");
    var need = Sv().needs(st);
    say(need.length ? "still needs " + need.map(function (x) { return x.n + " " + kl(x.k); }).join(", ") : "it has everything: now build it (hold left click)");
    if (I().siteReady(st)) S.work = { id: st.id, t: 3 };
    return true;
  }
  function work(st) {
    var c = S.c;
    if (SB.dist(st.x, st.z, c.x, c.z) > SK[st.kind].r * (st.s || 1) + 2.4) { say("get closer"); return false; }
    S.work = { id: st.id, t: 3 };
    audio("build");
    return true;
  }
  function feed(st, hk) {
    var r = Sv().feedFire(S.c, S.game, st, hk);
    if (r === "cold") { say("a cold fire, and you don't know how to light it"); return false; }
    if (r) { audio("fire"); say(hk === "firewood" ? "the fire roars" : "more fire"); }
    return !!r;
  }
  function light(st) { if (!Sv().lightFire(S.c, S.game, st)) return false; audio("fire"); say("fire!"); return true; }
  function cook(hk) {
    var c = S.c;
    if (!I().known(c, "cook") && I().canHold(c, "cook")) { if (!S.game.culture.found.cook) I().discover(c, "cook", S.game); else I().learn(c, "cook", 1, S.game, "figured out"); }
    if (!I().known(c, "cook")) { say("you hold it over the fire… and drop it. too hot!"); return false; }
    if (!Sv().take(c, hk, 1).length) return false;
    if (Sv().add(c, "cooked", 1)) Sv().spawn(S.game, "cooked", 1, c.x, c.z, { by: c.id });
    say("cooked! " + K.cooked.emoji); audio("craft");
    I().observe(c, "cook", S.game);
    return true;
  }
  function fish(hk) {
    var c = S.c, game = S.game;
    swingAnim();
    if (game.rng.chance(hk === "rod" ? 0.45 : 0.35)) { Sv().spawn(game, "fish", 1, c.x, c.z, { by: c.id }); say(hk === "rod" ? "a bite!" : "fish!"); SB.bus.emit("fish", { c: c }); wear(); }
    else say(hk === "rod" ? "…nothing yet" : "splash");
    return true;
  }
  function give(o) {
    var c = S.c, v = Sv().inv(c), sl = v.s[v.sel];
    if (!sl || sl.k === "plans") return false;
    if (SB.dist(o.x, o.z, c.x, c.z) > 2.6) { say("get closer to give it"); return false; }
    var k = sl.k, it = Sv().give(c, S.game, o, v.sel);
    if (it) say("you gave " + o.name + " your " + kl(k));
    return !!it;
  }
  function plant(kind, ag) {
    var n = Sv().plant(S.c, S.game, kind, ag.x, ag.z);
    if (!n) { say("no room to plant here"); return false; }
    say(kind === "sapling" ? "planted. it'll be a " + NK[n.kind].label + " one day" : "planted. a bush will grow here");
    audio("build", 0.5);
    return true;
  }
  function putDown(ag) {
    var c = S.c, v = Sv().inv(c), sl = v.s[v.sel];
    if (!sl || sl.k === "plans") return false;
    var o = Sv().removeAt(c, v.sel, 1);
    var it = Sv().spawn(S.game, o.k, 1, ag.x, ag.z, { w: o.w });
    if (it) it.data.noPick = S.game.time + 4;
    return true;
  }
  // Q: drop one of what's in your hand (shift: the whole stack), tossed a little ahead
  P.drop = function (all) {
    if (!S || S.dead) return false;
    var c = S.c, v = Sv().inv(c), sl = v.s[v.sel];
    if (!sl) return false;
    if (sl.k === "plans") { say("your plans stay with you"); return false; }
    var o = Sv().removeAt(c, v.sel, all ? null : 1), a = S.yaw;
    var x = c.x - Math.sin(a) * 0.9, z = c.z - Math.cos(a) * 0.9;
    if (!SB.World.walkable(S.game.world, x, z)) { x = c.x; z = c.z; }
    var it = Sv().spawn(S.game, o.k, o.n, x, z, { w: o.w });
    if (it) { it.data.noPick = S.game.time + 3; it.vy = 2; it.onGround = false; }
    learn(S.game, c, V.drop, null);
    return true;
  };
  P.select = function (i) { if (!S) return; Sv().select(S.c, i); if (S.ghost && Sv().heldKind(S.c) !== "plans") P.cancelBuild(); if (H()) H().selected(); };
  P.scroll = function (d) { if (!S) return; var v = Sv().inv(S.c); P.select(v.sel + (d > 0 ? 1 : -1)); };

  /* ---------------- crafting and building ---------------- */

  P.combine = function (kinds) {
    if (!S) return null;
    var r = Sv().combine(S.c, S.game, kinds);
    afterMake(r);
    return r;
  };
  P.craft = function (id) {
    if (!S) return null;
    var r = Sv().craft(S.c, S.game, id);
    afterMake(r);
    return r;
  };
  P.make = P.craft;
  function afterMake(r) {
    if (!r) return;
    if (r.ok) {
      learn(S.game, S.c, V.make, null);
      SB.Creature.emote(S.c, r.learned ? "idea" : "proud", 2);
      audio(r.learned ? "eureka" : "craft");
      if (r.out) gain(1, r.out);
    }
    if (r.msg) say(r.msg);
  }
  // the buildings this smol (or its tribe) knows, for the build tab
  P.buildable = function () {
    if (!S) return [];
    var c = S.c, game = S.game, Id = I(), out = [];
    Id.LIST.forEach(function (d) {
      if (d.kind !== "build" || !d.build || d.build === "spire" || d.build === "grave") return;
      var known = Id.known(c, d.id), tribe = !known && game.creatures.some(function (o) { return o.alive && o.species === "smol" && o.tribe === c.tribe && Id.known(o, d.id); });
      // the first buildings come straight out of what you already know: a lean-to from lashing, a campfire from fire
      var near = !known && Id.canHold(c, d.id) && (d.id === "leanto" ? Id.known(c, "lashing") : d.id === "campfire" ? Id.known(c, "fire") : false);
      if (!known && !tribe && !near) return;
      out.push({ id: d.id, kind: d.build, d: d, known: known, tribe: tribe, fresh: near, can: known || near || (tribe && c.tier >= Math.min(4, d.tier)), cost: SK[d.build].cost });
    });
    return out;
  };
  P.startBuild = function (kind) {
    if (!S || !SK[kind]) return false;
    var b = P.buildable().filter(function (x) { return x.kind === kind; })[0];
    if (!b || !b.can) { say(b ? "you don't know how to build a " + SK[kind].label + " yet" : "nobody knows how to build that"); return false; }
    if (b.fresh) { var Id = I(); if (!S.game.culture.found[b.id]) Id.discover(S.c, b.id, S.game); else Id.learn(S.c, b.id, 1, S.game, "figured out"); }
    S.ghost = { kind: kind, rot: S.yaw + Math.PI, x: S.c.x, z: S.c.z, ok: false };
    updateGhost();
    if (H()) H().closeBag();
    say(H() && H().phone() ? "aim where it goes, then tap “place”" : "aim where it goes · right click places it · R turns it · Esc cancels");
    return true;
  };
  P.cancelBuild = function () { if (!S) return; S.ghost = null; if (SB.Render) SB.Render.ghost = null; };
  P.rotateGhost = function () { if (S && S.ghost) { S.ghost.rot += Math.PI / 4; updateGhost(); } };
  function updateGhost() {
    var g = S.ghost, c = S.c, game = S.game, def = SK[g.kind], ag = P.aimGround(game, c, 8);
    if (!ag) { g.ok = false; return; }
    var dx = ag.x - c.x, dz = ag.z - c.z, d = Math.hypot(dx, dz) || 1, minD = def.r + 0.9, maxD = def.r + 4.5;
    var dd = SB.clamp(d, minD, maxD);
    g.x = c.x + dx / d * dd; g.z = c.z + dz / d * dd;
    g.ok = Sv().canPlace(game, g.kind, g.x, g.z);
    // a little off where you aim is fine: snap to the nearest spot that fits (so a first-timer isn't stuck on red)
    for (var rr = 0.7; !g.ok && rr <= 2.1; rr += 0.7) for (var k = 0; k < 8 && !g.ok; k++) {
      var a = k * Math.PI / 4, tx = g.x + Math.sin(a) * rr, tz = g.z + Math.cos(a) * rr;
      if (SB.dist(tx, tz, c.x, c.z) < def.r + 0.6) continue;
      if (Sv().canPlace(game, g.kind, tx, tz)) { g.x = tx; g.z = tz; g.ok = true; }
    }
    g.why = g.ok ? "" : SB.World.depthAt(game.world, g.x, g.z) > 0.02 ? "not in the water" : "no room: it needs flat, open ground";
  }
  function placeGhost() {
    var g = S.ghost, c = S.c, game = S.game;
    updateGhost();
    if (!g.ok) { say(g.why); return false; }
    var st = Sv().place(c, game, g.kind, g.x, g.z, g.rot);
    if (!st) { say("can't build there"); return false; }
    S.ghost = null; if (SB.Render) SB.Render.ghost = null;
    audio("build");
    // bring it what you're carrying straight away if you can
    var got = Sv().canDeliver(c, st) ? Sv().deliver(c, game, st) : [];
    var need = Sv().needs(st);
    say("a " + SK[st.kind].label + " site! " + (need.length ? "it needs " + need.map(function (x) { return x.n + " " + kl(x.k); }).join(", ") : "now build it: hold left click on it"));
    void got;
    return st;
  }
  P.placeGhost = function () { return S && S.ghost ? placeGhost() : null; };

  // the bridge between the two games: the smol's brain watches what you chose and learns to choose it too
  function learn(game, c, verb, r) {
    var B = SB.Brain, b = c.brain, w = game.world;
    if (!b || verb == null) return;
    SB.Chem.drives(c.chem, drv);
    var noun = r && r.noun != null && SB.N[r.noun] != null ? SB.N[r.noun] : -1;
    var near = !!r && SB.dist(r.x, r.z, c.x, c.z) < SB.Creature.radius(c) + (r.r || 0) + 0.6;
    var friends = false;
    SB.World.creaturesNear(w, game, c.x, c.z, 4, function (o) { if (o !== c && o.species === "smol") friends = true; });
    var home = SB.Society ? SB.Society.home(game, c.tribe) : w.T.spawn;
    var knows = !!(r && I() && I().knowsUse && I().knowsUse(c, r.noun, r.kind, game));
    B.input(b, {
      drives: drv, noun: noun, heardVerb: -1, heardName: false, near: near, holding: !!Sv().heldKind(c), dark: w.night,
      knows: knows, friends: friends, rain: w.weather.rain > 0.3, home: SB.dist(c.x, c.z, home.x, home.z) < 7
    });
    B.imitate(b, b.x, verb, P.LEARN_RATE);
    // and keep it as the decision the next reward is about (creature.js reinforces the newest trace when the
    // action finishes), so how it turned out teaches the brain too
    var tr = b.traces;
    if (tr && tr.length) {
      for (var i = 0; i < tr.length; i++) tr[i].e *= 0.5;
      var t = tr[b.traceHead];
      b.traceHead = (b.traceHead + 1) % tr.length;
      t.x.set(b.x); t.a = verb; t.e = 1;
      b.lastVerb = verb;
    }
    if (S) { S.lessons++; S.verbs[verb] = (S.verbs[verb] || 0) + 1; }
  }
  P._learn = learn;

  /* ---------------- the first-time quest ---------------- */
  // stick → vine → rock → rock-on-a-stick → chop a tree → a campfire (→ a lean-to, if you like).
  // skippable, and remembered (per browser and per island) once done
  var QKEY = "smolbrains-firsttool";
  P.QUEST = [
    { id: "stick", text: "pick up a stick", tip: "sticks lie under trees. look at one and press F (or snap one off a tree)" },
    { id: "vine", text: "find a vine", tip: "vines hang off cliffs, rocks and riverbanks. follow the green marker, then F" },
    { id: "rock", text: "grab a rock", tip: "loose rocks lie about, or prise one off a boulder with F" },
    { id: "craft", text: "make a rock-on-a-stick", tip: "open your bag (Tab), put the stick, vine and rock together, press combine" },
    { id: "chop", text: "chop down a tree", tip: "hold your new tool (1–9) and left click a tree until it falls" },
    { id: "fire", text: "build a campfire", tip: "open your plans (B), pick the campfire, place it, bring it sticks and rocks" },
    { id: "leanto", text: "build a lean-to (optional)", tip: "in your plans now: sticks, leaves and a vine. sleep under it tonight", optional: true }
  ];
  // a blob's (or critter's) first day: something to do in its body from the first seconds
  var BKEY = "smolbrains-blobquest";
  P.BLOB_QUEST = [
    // find food, eat it, get paid: one loop you can read at a glance (the bot's K-0022 top three)
    { id: "sniff", text: "find food", tip: "press G to sniff: the 👃 marker points at food. press G again and you walk there by yourself" },
    { id: "eat", text: "eat it", tip: "right click a berry bush to nibble it, or left click food on the ground" },
    { id: "tug", text: "tug leaves off a plant", tip: "look at a bush or a tree and press F. the leaves go in your mouth" },
    { id: "nest", text: "line the nest", tip: "carry leaves to the nest (follow the marker) and left click it. a cosy nest hatches eggs faster" },
    { id: "share", text: "bring a friend some food", tip: "pick food up with F, walk to a friend and right click them" }
  ];
  function questStore(key) { try { return localStorage.getItem(key || QKEY); } catch (e) { return null; } }
  function questStart() {
    var game = S.game, c = S.c, st = game.settings || (game.settings = {});
    S.quest = null;
    if (c.tier < 2) {
      if (st.povBlobQuest === "done" || st.povBlobQuest === "skipped" || questStore(BKEY) === "done") return;
      S.quest = { i: 0, kind: "blob", started: game.time, flags: {} };
      if (c.chem.hunger < 0.72) c.chem.hunger = 0.72; // a tummy rumbling: the food bar is low, and eating fills it back up (K-0025)
    } else {
      if (st.povQuest === "done" || st.povQuest === "skipped" || questStore() === "done") return;
      S.quest = { i: 0, started: game.time, flags: {} };
    }
    questTick();
  }
  P.quest = function () { return S && S.quest; };
  P.questList = function () { return S && S.quest && S.quest.kind === "blob" ? P.BLOB_QUEST : P.QUEST; };
  P.questStep = function () { return S && S.quest ? P.questList()[S.quest.i] : null; };
  P.skipQuest = function () {
    if (!S || !S.quest) return;
    var blob = S.quest.kind === "blob";
    S.quest = null;
    (S.game.settings || (S.game.settings = {}))[blob ? "povBlobQuest" : "povQuest"] = "skipped";
    try { localStorage.setItem(blob ? BKEY : QKEY, "done"); } catch (e) {}
    if (H()) H().quest();
  };
  function questTick() {
    var q = S && S.quest;
    if (!q) return;
    var c = S.c, game = S.game, Surv = Sv(), Id = I(), made = Id.known(c, "lashing") || q.flags.craft;
    var list = P.questList(), step = list[q.i], ok = false;
    switch (q.kind === "blob" ? "b:" + step.id : step.id) {
      case "b:eat": ok = !!q.flags.eat; break;
      case "b:sniff": ok = !!q.flags.sniff; break;
      case "b:tug": ok = !!q.flags.tug || Surv.count(c, "leaves", true) > 0; break;
      case "b:nest": ok = (q.flags.lined || 0) >= 3 || Surv.nest(game).cosy >= Surv.NEST_MAX; break;
      case "b:share": ok = !!q.flags.share; break;
      case "stick": ok = Surv.count(c, "stick", true) > 0 || made; break;
      case "vine": ok = Surv.count(c, "vine", true) > 0 || made; break;
      case "rock": ok = Surv.count(c, "stone", true) > 0 || made; break;
      case "craft": ok = Surv.count(c, "primtool", true) > 0 || Surv.count(c, "stoneaxe", true) > 0 || q.flags.craft; break;
      case "chop": ok = !!q.flags.chop; break;
      case "fire": ok = !!q.flags.fire; break;
      case "leanto": ok = !!q.flags.leanto; break;
    }
    if (ok) {
      q.i++;
      audio("chime");
      if (q.kind === "blob" && SB.Game.addSparks) SB.Game.addSparks(game, 1, c); // every step of a blob's day pays a spark
      if (q.i >= list.length) { questDone(); return; }
      if (list[q.i].id === "leanto" && !Id.known(c, "leanto") && !Id.canHold(c, "leanto")) { questDone(); return; }
      if (H()) H().questStep(list[q.i - 1], list[q.i]);
      questTick();
      return;
    }
    // the campfire step changes if the tribe can't make fire yet: rub sticks on leaves first
    q.fireFirst = step.id === "fire" && !Id.known(c, "campfire");
    q.target = questTarget(step.id);
  }
  function questDone() {
    var game = S.game;
    if (S.quest && S.quest.kind === "blob") {
      (game.settings || (game.settings = {})).povBlobQuest = "done";
      try { localStorage.setItem(BKEY, "done"); } catch (e) {}
      S.quest = null;
      if (SB.Game.addSparks) SB.Game.addSparks(game, 3, S.c);
      say("🫧 a good day for a blob. +3 ✨. all that carrying counts: " + S.c.name + "'s kids will lean toward hands");
      SB.bus.emit("povBlobQuestDone", { c: S.c });
      if (H()) H().quest();
      return;
    }
    (game.settings || (game.settings = {})).povQuest = "done";
    try { localStorage.setItem(QKEY, "done"); } catch (e) {}
    S.quest = null;
    say("🏕 you made it from a stick to a fire. the island is yours to figure out now");
    SB.bus.emit("povQuestDone", { c: S.c });
    if (H()) H().quest();
  }
  P.questText = function () {
    var q = S && S.quest;
    if (!q) return null;
    var st = P.questList()[q.i];
    if (q.kind === "blob" && st.id === "nest") return { id: st.id, text: "line the nest (" + Math.min(3, q.flags.lined || 0) + "/3)", tip: st.tip };
    if (st.id === "fire" && q.fireFirst) return { text: "make fire", tip: "you need fire first: in your bag, put 2 sticks and some leaves together (leaves come from a felled tree)" };
    return st;
  };
  // the thing the green marker points at
  function questTarget(id) {
    var c = S.c, w = S.game.world, R2 = 40;
    function node(fn) { return SB.World.nearestNode(w, c.x, c.z, R2, fn); }
    function item(kind) { return SB.World.nearestItem(w, c.x, c.z, 25, function (o) { return o.kind === kind && o.heldBy == null; }); }
    var t = null, Surv = Sv(), q = S.quest, held = Surv.held(c), hk = held && held.k;
    function food() { return SB.World.nearestItem(w, c.x, c.z, 30, function (o) { return o.heldBy == null && Surv.edible(o.kind) && !(o.data && (o.data.rotten || o.data.pod)) && !(K[o.kind] && K[o.kind].critter); }); }
    function plant() { return node(function (n) { return Surv.canTug(S.game, n) && (n.kind === "bush" || Surv.isTree(n)); }); }
    if (q && q.kind === "blob") {
      if (id === "share" && hk && Surv.edible(hk)) { // the nearest friend
        var f = null, fd = 1e9;
        S.game.creatures.forEach(function (o) { if (o === c || !o.alive || o.species !== "smol") return; var d = SB.dist(o.x, o.z, c.x, c.z); if (d < fd) { fd = d; f = o; } });
        return f ? { x: f.x, z: f.z, y: f.y + 1.2 } : null;
      }
      if (id === "eat") t = node(function (n) { return n.kind === "bush" && n.state === "ok"; }) || food();
      else if (id === "tug") t = plant();
      else if (id === "nest") t = hk && Surv.SOFT[hk] ? w.T.nest : plant();
      else if (id === "share") t = food();
      return t ? { x: t.x, z: t.z, y: (t.type === "item" ? t.y : SB.World.groundY(w, t.x, t.z)) + (t.type === "node" && Surv.isTree(t) ? 2.4 : 1.1) } : null;
    }
    if (id === "stick") t = item("stick") || node(function (n) { return n.state === "ok" && Sv().isTree(n) && n.kind !== "shroomtree"; });
    else if (id === "vine") t = node(function (n) { return n.kind === "vines" && n.state === "ok"; }) || SB.World.nearestNode(w, c.x, c.z, 120, function (n) { return n.kind === "vines" && n.state === "ok"; });
    else if (id === "rock") t = item("stone") || node(function (n) { return (n.kind === "boulder" || n.kind === "redrock") && n.state === "ok"; });
    else if (id === "chop") t = node(function (n) { return n.state === "ok" && Sv().isTree(n) && n.kind !== "giant" && n.kind !== "shroomtree"; });
    return t ? { x: t.x, z: t.z, y: (t.type === "item" ? t.y : SB.World.groundY(w, t.x, t.z)) + (t.type === "node" && t.kind !== "vines" && Sv().isTree(t) ? 2.4 : 1.1) } : null;
  }
  var qHooked = false;
  function hookQuest() {
    if (qHooked || !SB.bus) return;
    qHooked = true;
    SB.bus.on("chop", function (d) {
      if (!S || d.c !== S.c) return;
      felledHook(d.node);
      if (S.quest) { S.quest.flags.chop = 1; questTick(); }
    });
    function blobFlag(d, k) { if (S && S.quest && S.quest.kind === "blob" && d && d.c === S.c) { S.quest.flags[k] = (S.quest.flags[k] || 0) + 1; questTick(); } }
    SB.bus.on("povEat", function (d) { blobFlag(d, "eat"); });
    SB.bus.on("eat", function (d) { blobFlag(d, "eat"); });
    SB.bus.on("nibble", function (d) { blobFlag(d, "eat"); });
    SB.bus.on("sniff", function (d) { blobFlag(d, "sniff"); });
    SB.bus.on("tug", function (d) { blobFlag(d, "tug"); });
    SB.bus.on("nestLined", function (d) { blobFlag(d, "lined"); });
    SB.bus.on("give", function (d) { if (d && d.item && Sv().edible(d.item.kind)) blobFlag(d, "share"); });
    SB.bus.on("craft", function (d) { if (S && S.quest && d.c === S.c && (d.id === "lashing" || d.id === "hafting")) { S.quest.flags.craft = 1; questTick(); } });
    SB.bus.on("built", function (d) {
      if (!S || !S.quest || !d.st || !d.st.done) return;
      var mine = (d.st.builders || []).indexOf(S.c.id) >= 0 || d.st.founder === S.c.name;
      if (!mine) return;
      if (d.st.kind === "campfire") S.quest.flags.fire = 1;
      if (d.st.kind === "leanto") S.quest.flags.leanto = 1;
      questTick();
    });
  }
  hookQuest();

  /* ---------------- the camera (each rendered frame) ---------------- */

  var hooked = false;
  function hookRender() {
    if (hooked || !SB.Render || !SB.Render.addHook) return;
    hooked = true;
    SB.Render.addHook(function (game, alpha, dt) { if (S) frame(game, alpha, dt); });
  }
  function frame(game, alpha, dt) {
    var c = S.c, cm = cam();
    if (SB.Game.current && SB.Game.current !== S.game) { P.leave("swap"); return; }
    if (!cm || !cm.pov) return;
    // asleep, the creature's tick never reaches drive(): moving is what wakes you
    if (c.asleep && !S.dead && (Math.abs(P.input.fwd) + Math.abs(P.input.side) > 0.1 || P.input.jump)) { c.asleep = false; c.inBed = false; c.action = null; }
    var x = c.px + (c.x - c.px) * alpha, z = c.pz + (c.z - c.pz) * alpha;
    var y = c.py != null && Math.abs(c.y - c.py) < 2 ? c.py + (c.y - c.py) * alpha : c.y;
    var bobA = c._povMove ? 1 : 0;
    S.bobK = (S.bobK || 0) + (bobA - (S.bobK || 0)) * Math.min(1, dt * 8);
    var bob = Math.sin(S.bob * Math.PI) * 0.035 * S.bobK * (1 + (c.stage || 0) * 0.2);
    var eyeH = eyeY(c) - c.y;
    if (c.asleep) eyeH *= 0.45;
    cm.pov.x = x; cm.pov.z = z; cm.pov.y = y + eyeH + Math.abs(bob);
    // a hit lands with a tiny kick of the view; being hurt shakes it
    var kick = S.swing > 0.6 ? (S.swing - 0.6) * 0.02 : 0, hurt = S.hurtT > 0 ? Math.sin(S.t * 60) * S.hurtT * 0.012 : 0;
    cm.pov.yaw = S.yaw + Math.sin(S.bob * Math.PI * 0.5) * 0.006 * S.bobK + hurt; cm.pov.pitch = S.pitch + (c.asleep ? -0.25 : 0) - kick;
    if (c.drownT > 0) cm.pov.y = Math.max(SB.World.groundY(S.game.world, x, z) + 0.05, cm.pov.y - 0.15);
    // what's under the crosshair, the ground point, and the building ghost
    if (!S.dead) {
      S.aim = P.aimGround(S.game, c);
      S.target = P.look(S.game, c);
      S.opts = P.options(S.game, c, S.target);
      if (S.ghost) {
        updateGhost();
        var g = S.ghost, def = SK[g.kind], gy = SB.World.groundY(S.game.world, g.x, g.z);
        var m = new Float32Array(12);
        SB.Render.trs(m, 0, g.x, gy, g.z, g.rot, 1, 1, 1);
        SB.Render.ghost = { key: "s:" + g.kind, m: m, col: g.ok ? [0.45, 1, 0.5] : [1, 0.32, 0.3] };
        void def;
      } else SB.Render.ghost = null;
    }
    if (H()) H().frame(dt);
  }
  P.view = function (yaw, pitch) { if (!S) return; if (yaw != null) S.yaw = yaw; if (pitch != null) S.pitch = pitch; };
  P.faceTo = function (x, z, pitch) { if (!S) return; S.yaw = Math.atan2(-(x - S.c.x), -(z - S.c.z)); if (pitch != null) S.pitch = pitch; };
  P.look2 = function (dx, dy) { if (!S) return; S.yaw -= dx * 0.0032; S.pitch = SB.clamp(S.pitch - dy * 0.0032, -1.25, 1.2); };

  /* ---------------- the body dies ---------------- */
  var busHooked = false;
  P.CAUSE = { starved: "starved", sick: "got too sick", hurt: "was hurt too badly", old: "grew old", cold: "froze to death", drowned: "drowned" };
  P.CAUSE_WHY = {
    starved: "the food row ran out. eat before it's empty: hold food and right click (the place button on a phone), or nibble a bush",
    sick: "something bad got eaten, or a cut went bad. healroot cures it; cook meat and fish",
    hurt: "too many hits. grumps hunt at night: stay near a fire or under a roof",
    old: "every smol's life runs out in the end",
    cold: "the warmth row ran out. a fire, a hut or a lean-to keeps the cold off",
    drowned: "deep water. smols without fins can't swim"
  };
  function hookBus() {
    if (busHooked || !SB.bus) return;
    busHooked = true;
    SB.bus.on("death", function (d) {
      if (!S || !d || d.c !== S.c || S.dead) return;
      S.dead = true;
      if (SB.Render) SB.Render.ghost = null;
      var lost = Sv().onDeath(d.c, S.game);
      var info = { c: d.c, cause: d.cause, why: P.CAUSE[d.cause] || "died", tip: P.CAUSE_WHY[d.cause] || "", items: lost.items.filter(function (x) { return x.k !== "plans"; }), ideas: lost.ideas, age: d.c.age, lessons: S.lessons, time: S.game.time - S.born };
      S.death = info;
      SB.bus.emit("possessedDeath", { c: d.c, cause: d.cause, info: info });
      if (!H()) { P.leave("died"); return; }
      H().death(info);
    });
  }

  /* ---------------- a hint after the first hatch ---------------- */
  if (SB.bus) SB.bus.on("hatch", function () {
    var g = SB.Game && SB.Game.current;
    if (!g || g.showcase || P.headless) return;
    var st = g.settings || (g.settings = {});
    if (st.povTip) return;
    st.povTip = 1;
    setTimeout(function () { if (SB.UI && SB.UI.toast && !P.active) SB.UI.toast("👁 tap a smol, then <b>possess</b> on its card to live as it: a hotbar, a bag, your own two paws (" + P.COST + " ✨)", "", 7000); }, 9000);
  });
})();
