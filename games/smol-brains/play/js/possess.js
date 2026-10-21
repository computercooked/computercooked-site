/* smol brains — possess.js
   The second game: step down into one smol and see the island through its eyes. No god hand, no miracles:
   you walk, you get hungry, the night has grumps in it. The smol's own brain switches off while you drive
   and watches instead, learning from every choice you make (supervised: "in a moment like this, do that"),
   so a smol you've lived as comes back a little more like you. Everything here drives the creature's normal
   actions (creature.js), so eating, chopping, talking and sleeping work exactly the way they do for the AI.
   render.js draws the first-person camera (cam.pov), input.js stands down while IN.mode is "pov". */
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
  P.active = false;
  P.c = null;
  P.input = { fwd: 0, side: 0, run: false, jump: false }; // the controls, whoever's holding them (keys, joystick, a test)

  var S = null; // the possession: {c, game, saved camera, yaw, pitch, lessons, ...}
  var EDIBLE = { food: 1, mushroom: 1, bug: 1, medicine: 1 };
  var NIBBLE = { bush: 1, roots: 1, gourds: 1 };
  var ROCKS = { boulder: 1, flintrock: 1, orevein: 1, crystals: 1 };
  var drv = new Float32Array(SB.N_DRIVES);

  function R() { return SB.Render; }
  function I() { return SB.Ideas; }
  function cam() { return SB.Render && SB.Render.camera; }
  function dom() { return typeof document !== "undefined" && document.body && document.createElement && !P.headless; }

  /* ---------------- entering and leaving ---------------- */

  P.canEnter = function (game, c) {
    if (!game || !c || !c.alive || c.type !== "creature") return "nobody there";
    if (c.species !== "smol") return "only smols can be possessed";
    if (c.heldBy || c.dying || c.corpse) return "not right now";
    if (P.active) return "you're already someone";
    if ((game.sparks || 0) < P.COST) return "possessing a smol costs " + P.COST + " sparks ✨";
    return "";
  };

  P.enter = function (game, c, opts) {
    opts = opts || {};
    var why = opts.free ? (c && c.alive && c.species === "smol" && !P.active ? "" : "nope") : P.canEnter(game, c);
    if (why) { if (SB.UI && SB.UI.toast) SB.UI.toast(why); return false; }
    if (!opts.free) SB.Game.spend(game, P.COST);
    var C = SB.Creature;
    if (c.plan) C.endPlan(c, game, false);
    c.action = null; c.asleep = false; c.inBed = false; c.called = null; c.callVerb = null;
    c._pov = true;
    S = {
      c: c, game: game, yaw: c.facing + Math.PI, pitch: -0.06, lessons: 0, verbs: {}, bob: 0, stepAcc: 0, friendT: 2, hudT: 0,
      speed: game.speed, work: null, dead: false, t: 0, born: game.time
    };
    P.active = true; P.c = c;
    P.input.fwd = P.input.side = 0; P.input.run = P.input.jump = false;
    game.speed = 1; // a smol lives in real time
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
    if (dom()) buildHud();
    SB.bus.emit("possess", { c: c });
    return true;
  };

  P.leave = function (why) {
    if (!S) return;
    var s = S, c = s.c, game = s.game;
    S = null; P.active = false; P.c = null;
    c._pov = false; c._povMove = false;
    if (c.alive && !c.action) c.thinkT = 0.3;
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
    removeHud();
    if (c.alive && SB.Game.select) SB.Game.select(game, c.id);
    var name = c.name;
    if (SB.UI && SB.UI.toast && !P.headless) {
      if (s.lessons) SB.UI.toast("👁 back in the sky. " + name + " learned from " + s.lessons + " of your choices: its brain leans a little more your way now.", "", 6000);
      else SB.UI.toast("👁 back in the sky.");
    }
    if (SB.UI && SB.UI.povDone) setTimeout(function () { if (!P.active) SB.UI.povDone(); }, 400);
    SB.bus.emit("unpossess", { c: c, lessons: s.lessons, why: why || "left" });
  };

  P.lessons = function () { return S ? S.lessons : 0; };
  function farFor() { var q = SB.Render && SB.Render.quality; return q && q.scale < 0.75 ? 52 : 78; }

  /* ---------------- driving (called from the creature's tick instead of its brain) ---------------- */

  P.drive = function (c, dt, game) {
    if (!S || S.c !== c) { c._pov = false; return; } // a stale flag (a reload, a swapped island)
    if (S.dead) return;
    S.t += dt;
    var w = game.world, C = SB.Creature, ch = c.chem, inp = P.input;
    var f = inp.fwd || 0, sd = inp.side || 0, mag = Math.hypot(f, sd);
    c._povMove = false;
    if (mag > 0.08) {
      if (mag > 1) { f /= mag; sd /= mag; mag = 1; }
      if (c.plan) C.endPlan(c, game, false);
      if (c.action) c.action = null;
      S.work = null;
      if (c.asleep) { c.asleep = false; c.inBed = false; }
      var sy = Math.sin(S.yaw), cy = Math.cos(S.yaw);
      // forward is (-sin yaw, -cos yaw), right is (cos yaw, -sin yaw)
      var dx = -sy * f + cy * sd, dz = -cy * f - sy * sd, dl = Math.hypot(dx, dz) || 1;
      dx /= dl; dz /= dl;
      var run = inp.run && c.stage >= 1 && ch.tired < 0.85;
      var sp = C.speedOf(c, null) * (run ? 1.75 : 1) * mag * (c.tier === 0 ? 1.1 : 1);
      var step = sp * dt, swim = C.canSwim(c), moved = 0;
      var nx = c.x + dx * step, nz = c.z + dz * step;
      if (ok(w, nx, nz, swim)) { c.x = nx; c.z = nz; moved = step; }
      else if (ok(w, nx, c.z, swim)) { c.x = nx; moved = Math.abs(dx * step); } // slide along whatever's in the way
      else if (ok(w, c.x, nz, swim)) { c.z = nz; moved = Math.abs(dz * step); }
      if (moved > 0) {
        c.facing += SB.angDiff(c.facing, Math.atan2(dx, dz)) * Math.min(1, dt * 12);
        c.anim.walk += moved * 3.2; c.moving = true; c._povMove = true;
        c.stats.walked += moved;
        if (run) SB.Chem.apply(ch, { tired: dt * 0.006 });
        S.bob += moved * (run ? 2.4 : 2.9);
        S.stepAcc += moved;
        if (S.stepAcc > (c.stage === 0 ? 0.35 : 0.55)) { S.stepAcc = 0; footstep(c, w); }
      }
    } else if (!c.action && !c.plan) {
      c.facing += SB.angDiff(c.facing, S.yaw + Math.PI) * Math.min(1, dt * 6); // looking about turns the body
    }
    if (inp.jump) {
      inp.jump = false;
      if (c.onGround !== false && !c.asleep) {
        var jy = Math.sin(S.yaw), jc = Math.cos(S.yaw), js = mag > 0.08 ? C.speedOf(c, null) * (inp.run ? 1.6 : 1) : 0;
        var jx = (-jy * f + jc * sd), jz = (-jc * f - jy * sd), jl = Math.hypot(jx, jz) || 1;
        c.vx = jx / jl * js; c.vz = jz / jl * js; c.vy = c.stage === 0 ? 4.6 : 5.6; c.onGround = false;
        c.anim.squash = 0.3;
        SB.Chem.apply(ch, { tired: 0.004, bored: -0.01 });
        if (SB.Audio && SB.Audio.play) SB.Audio.play("boing", { vol: 0.25 });
      }
    }
    // building: keep at it while the site needs work
    if (S.work) {
      var st = SB.Game.byId(game, S.work.id);
      if (!st || st.done || S.work.t <= 0 || SB.dist(st.x, st.z, c.x, c.z) > SK[st.kind].r * (st.s || 1) + 2) S.work = null;
      else {
        S.work.t -= dt;
        if (I().siteReady(st)) { c.anim.squash = Math.abs(Math.sin(S.t * 8)) * 0.2; if (I().work(c, st, dt, game)) { S.work = null; C.emote(c, "proud", 2); } }
        else S.work = null;
      }
    }
    // friends tag along, and share food with a hungry you
    if ((S.friendT -= dt) <= 0) { S.friendT = 6; friends(c, game); }
  };
  function ok(w, x, z, swim) { return SB.World.walkable(w, x, z, swim); }

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
  function footstep(c, w) {
    if (!SB.Audio || !SB.Audio.play) return;
    SB.Audio.play("step_" + surface(c, w), { vol: 0.5 + (c.stage || 0) * 0.12 });
  }

  /* ---------------- what am I looking at? ---------------- */

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
      if (o.gone || (o.heldBy != null && o.heldBy !== c.id) || o.heldBy === c.id) return;
      consider({ type: "item", id: o.id }, o.x, o.y + (o.r || 0.15), o.z, (o.r || 0.15) + 0.12);
    });
    SB.World.eachNodeNear(w, ex, ez, P.REACH + 2, function (n) {
      if (n.state && n.state !== "ok" && n.state !== "stump" && !NIBBLE[n.kind]) return;
      var r = NK[n.kind].r * (n.s || 1);
      consider({ type: "node", id: n.id }, n.x, (n.y || SB.World.groundY(w, n.x, n.z)) + Math.min(1.2, r * 1.4), n.z, r, 0.15); // big things lose ties to small ones
    });
    SB.World.structsNear(w, ex, ez, P.REACH + 3).forEach(function (st) {
      var r = SK[st.kind].r * (st.s || 1);
      consider({ type: "struct", id: st.id }, st.x, SB.World.groundY(w, st.x, st.z) + 0.5, st.z, r, 0.25);
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

  function heldKind(c, game) { var it = c.holding != null ? SB.Game.byId(game, c.holding) : null; return it ? it.kind : null; }
  function toolKind(c, game) { var t = c.tool != null ? SB.Game.byId(game, c.tool) : null; return t ? t.kind : null; }
  function tool(c, game) { var hk = heldKind(c, game); return hk && K[hk] && K[hk].tool ? hk : toolKind(c, game); }
  function label(r) {
    if (!r) return "";
    if (r.type === "creature") return r.ref.species === "smol" ? r.ref.name : r.ref.species;
    if (r.type === "water") return "water";
    var d = r.type === "item" ? K[r.kind] : r.type === "node" ? NK[r.kind] : SK[r.kind];
    return d ? d.label : r.kind;
  }

  // what E (primary), F (alt) and R (hit) do to a target, given who you are. tier limits what you can do:
  // a blob rolls, hops and eats; a tool-user picks things up, uses tools and crafts; builders build
  P.verbFor = function (game, c, t, which) {
    var C = SB.Creature, tier = c.tier, r = t ? C.resolve(game, t) : null, nm = label(r);
    var hk = heldKind(c, game), tl = tool(c, game), Id = I();
    function m(verb, lbl, special) { return { verb: verb, tgt: t, label: lbl, special: special || null, r: r }; }
    if (which === "hit") return r ? m(V.hit, (r.type === "creature" ? "hit " : "whack the ") + nm) : null;
    if (!r) {
      if (which === "alt") return null;
      if (hk && K[hk] && EDIBLE[K[hk].noun]) return { verb: V.eat, tgt: { type: "item", id: c.holding }, label: "eat your " + K[hk].label, r: C.resolve(game, { type: "item", id: c.holding }) };
      return { verb: V.play, tgt: null, label: tier === 0 ? "roll about" : "play", r: null };
    }
    var alt = which === "alt";
    if (r.type === "creature") {
      var o = r.ref;
      if (o.species === "grump") return alt ? m(V.flee, "run from the grump!") : m(V.hit, "hit the grump" + (tl === "club" || tl === "spear" ? " with your " + tl : ""));
      if (o.species !== "smol") return alt ? null : m(V.hit, "pounce on the " + nm);
      if (alt) return m(V.cuddle, (o.stage === 0 ? "pet " : "hug ") + o.name);
      if (tier >= 3 && c.holding != null) return m(V.give, "give " + o.name + " your " + (K[hk] ? K[hk].label : "thing"));
      return m(V.talk, "talk to " + o.name);
    }
    if (r.type === "water") {
      if (!alt) return m(V.eat, "drink");
      if (tier >= 2 && (tl === "rod" || tl === "spear")) return m(V.use, "fish");
      return tier >= 2 ? m(V.use, "splash about") : null;
    }
    if (r.type === "item") {
      var it = r.ref, def = K[it.kind] || {};
      if (def.critter) return alt ? null : tier >= 2 && tl === "spear" ? m(V.use, "spear the " + nm) : m(V.hit, "pounce on the " + nm);
      var edible = EDIBLE[it.noun];
      if (!alt) return edible ? m(V.eat, "eat the " + nm) : tier >= 2 ? m(V.pickup, "pick up the " + nm) : m(V.play, "roll the " + nm + " about");
      if (edible && tier >= 2) return m(V.pickup, "pick up the " + nm);
      if (!edible && tier >= 2 && it.kind === "nut" && (tl === "hammer" || hk === "stone")) return m(V.use, "crack the nut");
      return m(V.hit, "kick the " + nm);
    }
    if (r.type === "node") {
      var n = r.ref, nd = NK[n.kind], g = Id && Id.GATHER[n.kind];
      var canGather = g && tier >= Math.max(2, g[3]) && (!g[1] || tl === g[1]);
      var choppable = nd.noun === "plant" && !NIBBLE[n.kind] && n.kind !== "reeds" && n.kind !== "herbs" && n.kind !== "hive" && n.kind !== "cactus";
      if (alt) {
        if (canGather) return m(V.pickup, "gather " + g[0]);
        if (nd.noun === "plant" && nd.drops) return m(V.play, "shake the " + nm);
        return null;
      }
      if (n === game.world.T.nest) return m(V.sleep, "sleep in the nest", "sleep");
      if (tier >= 2 && (tl === "axe" || tl === "stoneaxe") && choppable && n.state === "ok") return m(V.use, "chop the " + nm);
      if (tier >= 2 && tl === "hammer" && ROCKS[n.kind]) return m(V.use, "mine the " + nm);
      if (tier >= 2 && tl === "blade" && (n.kind === "bush" || n.kind === "reeds")) return m(V.use, "cut the " + nm);
      if (NIBBLE[n.kind]) return m(V.eat, "nibble the " + nm);
      if (nd.noun === "plant" && nd.drops) return m(V.play, "shake the " + nm);
      if (canGather) return m(V.pickup, "gather " + g[0]);
      return m(V.hit, "whack the " + nm);
    }
    if (r.type === "struct") {
      var st = r.ref, d = st.data || {}, near = SB.dist(st.x, st.z, c.x, c.z) < SK[st.kind].r * (st.s || 1) + 2.2;
      if (!st.done) {
        if (alt || tier < 2) return null;
        var has = Id && Id.inv(c, game).some(function (o) { for (var k in st.need) if (st.need[k] > 0 && Id.matches(o.kind, k)) return true; return false; });
        if (has) return m(V.build, "add to the " + nm, "deliver");
        if (Id && Id.siteReady(st)) return m(V.build, "build the " + nm, "work");
        var want = Object.keys(st.need).filter(function (k) { return st.need[k] > 0; });
        return { verb: null, tgt: t, label: "the " + nm + " needs " + want.map(function (k) { return st.need[k] + " " + k; }).join(", "), r: r };
      }
      if (st.kind === "campfire" || st.kind === "kiln") {
        if (alt) return near ? m(V.idle, "sit by the fire", "sit") : m(V.approach, "go to the fire");
        if (hk === "stick" && Id.known(c, "fire")) return m(V.use, "feed the fire");
        if (!d.lit && (hk === "torch" || (Id.known(c, "fire") && (hk === "flint" || toolKind(c, game) === "hammer")))) return m(V.use, "light the fire");
        return tier >= 2 ? m(V.use, d.lit ? "warm your paws" : "poke the cold fire") : m(V.approach, "go to the fire");
      }
      if (st.kind === "hut") return alt ? m(V.approach, "go in") : m(V.sleep, "sleep in the hut", "sleep");
      if (st.kind === "farm") return alt ? null : tier >= 2 ? m(V.use, d.grow > 0.6 ? "harvest" : "check the crop") : m(V.play, "play in the " + nm);
      if (st.kind === "totem" || st.kind === "observatory") return alt ? null : tier >= 2 ? m(V.use, "study the " + nm) : m(V.approach, "look at the " + nm);
      return alt ? null : m(V.approach, "go to the " + nm);
    }
    return null;
  };

  // act on whatever's under the crosshair (which: "main" E, "alt" F, "hit" R)
  P.interact = function (which, t) {
    if (!S || S.dead) return null;
    var c = S.c, game = S.game;
    if (t === undefined) t = P.look(game, c);
    var mv = P.verbFor(game, c, t, which || "main");
    if (!mv || mv.verb == null) { if (mv) say(mv.label); return null; }
    return P.doVerb(game, c, mv);
  };

  P.doVerb = function (game, c, mv) {
    var C = SB.Creature, Id = I();
    if (SB.VERB_TIER[mv.verb] > c.tier && mv.special !== "sit") { say("not yet: " + SB.TIERS[SB.VERB_TIER[mv.verb]].name + "s can do that"); return null; }
    learn(game, c, mv.verb, mv.r);
    if (mv.special === "deliver") {
      var st = mv.r.ref;
      if (SB.dist(st.x, st.z, c.x, c.z) > SK[st.kind].r * (st.s || 1) + 1.6) { C.startAction(c, game, V.approach, mv.tgt); return mv; }
      var n = Id.deliver(c, st, game);
      if (n) { C.emote(c, "proud", 1.2); if (SB.Audio && SB.Audio.play) SB.Audio.play("build"); }
      if (Id.siteReady(st)) S.work = { id: st.id, t: 3 };
      return mv;
    }
    if (mv.special === "work") {
      var st2 = mv.r.ref;
      if (SB.dist(st2.x, st2.z, c.x, c.z) > SK[st2.kind].r * (st2.s || 1) + 1.6) { C.startAction(c, game, V.approach, mv.tgt); return mv; }
      S.work = { id: st2.id, t: 3 };
      if (SB.Audio && SB.Audio.play) SB.Audio.play("build");
      return mv;
    }
    if (mv.special === "sit") { C.startAction(c, game, V.idle, null); c.action.dur = 8; C.emote(c, "happy", 1.5); return mv; }
    C.startAction(c, game, mv.verb, mv.verb === V.play && !mv.tgt ? null : mv.tgt);
    return mv;
  };

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
      drives: drv, noun: noun, heardVerb: -1, heardName: false, near: near, holding: c.holding != null, dark: w.night,
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
    S.lessons++;
    S.verbs[verb] = (S.verbs[verb] || 0) + 1;
  }
  P._learn = learn;

  /* ---------------- making things ---------------- */

  // what you could make or build right now, with what's missing
  P.recipes = function (game, c) {
    var Id = I(), out = [];
    if (!Id || c.tier < 2) return out;
    Id.LIST.forEach(function (d) {
      if (!Id.known(c, d.id)) return;
      if (d.kind === "craft" && d.make) {
        var miss = Id.missingFor(c, d, game), st = d.make.at ? Id.stationFor(c, d.make.at, game) : { self: true };
        var near = st && (st.self || (st.fire && SB.dist(st.fire.x, st.fire.z, c.x, c.z) < 3) || (st.struct && SB.dist(st.struct.x, st.struct.z, c.x, c.z) < 3.5));
        out.push({ id: d.id, d: d, kind: "craft", miss: miss, ok: !miss.length && !!near, why: miss.length ? "need " + miss.map(function (m) { return m.n + " " + m.want; }).join(", ") : !near ? "do it at a " + d.make.at : "" });
      } else if (d.kind === "build" && d.build) {
        out.push({ id: d.id, d: d, kind: "build", ok: true, why: "costs " + Object.keys(SK[d.build].cost).map(function (k) { return SK[d.build].cost[k] + " " + k; }).join(", ") });
      }
    });
    return out;
  };
  P.make = function (id) {
    if (!S) return false;
    var c = S.c, game = S.game, Id = I(), d = Id.BY_ID[id];
    if (!d) return false;
    if (d.kind === "craft") {
      var it = Id.craft(c, id, game);
      if (!it) { say("missing something for the " + d.name); return false; }
      learn(game, c, V.make, null);
      SB.Creature.emote(c, "proud", 1.5);
      if (SB.Audio && SB.Audio.play) SB.Audio.play("craft");
      say("made a " + (K[it.kind] ? K[it.kind].label : d.name) + "!");
      return true;
    }
    // building: lay out the site right in front of you, then bring it materials
    var r = SK[d.build].r, a = S.yaw, x = c.x - Math.sin(a) * (r + 1.2), z = c.z - Math.cos(a) * (r + 1.2);
    if (!SB.World.siteFree(game.world, x, z, r)) { say("no room for a " + d.name + " there"); return false; }
    var st = SB.World.addStructure(game.world, game, d.build, x, z, { tribe: c.tribe, rot: a });
    st.founder = c.name;
    SB.bus.emit("siteStarted", { c: c, st: st });
    learn(game, c, V.build, null);
    say("a " + d.name + " site: bring it " + Object.keys(st.need).map(function (k) { return st.need[k] + " " + k; }).join(", "));
    return st;
  };

  /* ---------------- the camera (each rendered frame) ---------------- */

  function eyeY(c) {
    var r = SB.Creature.radius(c);
    return c.y + r * (c.look && c.look.legs ? 2.1 + c.look.legLen * 0.9 : 1.7) + 0.05;
  }
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
    cm.pov.yaw = S.yaw + Math.sin(S.bob * Math.PI * 0.5) * 0.006 * S.bobK; cm.pov.pitch = S.pitch + (c.asleep ? -0.25 : 0);
    if (c.drownT > 0) cm.pov.y = Math.max(SB.World.groundY(S.game.world, x, z) + 0.05, cm.pov.y - 0.15);
    if ((S.hudT -= dt) <= 0) { S.hudT = 0.1; if (hud) updateHud(); }
    if (hud) { if (S.mdx || S.mdy) { look(S.mdx, S.mdy); S.mdx = S.mdy = 0; } paws(dt); }
    readKeys();
  }

  function look(dx, dy) {
    if (!S) return;
    S.yaw -= dx * 0.0032;
    S.pitch = SB.clamp(S.pitch - dy * 0.0032, -1.25, 1.2);
  }
  P.look2 = look;
  // point the eyes somewhere (screenshots, tests): yaw 0 faces north (-z)
  P.view = function (yaw, pitch) { if (!S) return; if (yaw != null) S.yaw = yaw; if (pitch != null) S.pitch = pitch; };
  P.faceTo = function (x, z, pitch) { if (!S) return; S.yaw = Math.atan2(-(x - S.c.x), -(z - S.c.z)); if (pitch != null) S.pitch = pitch; };

  /* ---------------- the body dies ---------------- */
  var busHooked = false;
  function hookBus() {
    if (busHooked || !SB.bus) return;
    busHooked = true;
    SB.bus.on("death", function (d) {
      if (!S || !d || d.c !== S.c || S.dead) return;
      S.dead = true;
      var why = { starved: "starved", sick: "got too sick", hurt: "was hurt too badly", old: "grew old", cold: "froze", drowned: "drowned" }[d.cause] || "died";
      SB.bus.emit("possessedDeath", { c: d.c, cause: d.cause });
      if (!hud) { P.leave("died"); return; }
      deathScreen(d.c, why);
    });
  }

  /* ---------------- the survival HUD ---------------- */

  var hud = null, keys = {};
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  var CSS = [
    "body.pov #ui{display:none!important}",
    "#pov{position:fixed;inset:0;z-index:40;pointer-events:none;font:600 13px ui-rounded,system-ui,sans-serif;color:#f5f3ed;user-select:none;-webkit-user-select:none;touch-action:none}",
    "#pov .glassy{background:rgba(16,17,20,.62);border:1px solid rgba(255,255,255,.1);border-radius:12px;backdrop-filter:blur(6px)}",
    "#pov .cross{position:absolute;left:50%;top:50%;width:14px;height:14px;margin:-7px 0 0 -7px}",
    "#pov .cross:before,#pov .cross:after{content:'';position:absolute;background:rgba(255,255,255,.85);box-shadow:0 0 2px #000}",
    "#pov .cross:before{left:6px;top:0;width:2px;height:14px}#pov .cross:after{top:6px;left:0;height:2px;width:14px}",
    "#pov .cross.on:before,#pov .cross.on:after{background:#c5ff49}",
    "#pov .prompt{position:absolute;left:50%;top:calc(50% + 22px);transform:translateX(-50%);padding:6px 10px;white-space:nowrap;text-align:center;line-height:1.5}",
    "#pov .prompt:empty{display:none}#pov .prompt b{color:#c5ff49;font-family:ui-monospace,monospace}",
    "#pov .compass{position:absolute;left:50%;top:10px;width:min(360px,60vw);height:26px;transform:translateX(-50%);overflow:hidden}",
    "#pov .compass span{position:absolute;top:4px;transform:translateX(-50%);font-family:ui-monospace,monospace;font-size:12px;opacity:.8}",
    "#pov .compass span.c{color:#c5ff49;opacity:1;font-weight:800}#pov .compass:after{content:'';position:absolute;left:50%;top:0;bottom:0;width:2px;background:#c5ff49;opacity:.6}",
    "#pov .clock{position:absolute;left:50%;top:42px;transform:translateX(-50%);font-size:12px;opacity:.85;text-shadow:0 1px 2px #000;white-space:nowrap}",
    "#pov .bars{position:absolute;left:12px;bottom:12px;padding:10px 12px;display:grid;grid-template-columns:20px 110px;gap:5px 6px;align-items:center}",
    "#pov .bar{height:9px;border-radius:5px;background:rgba(255,255,255,.12);overflow:hidden}#pov .bar i{display:block;height:100%;border-radius:5px;transition:width .3s}",
    "#pov .bar.low i{animation:povblink .8s infinite}@keyframes povblink{50%{opacity:.35}}",
    "#pov .who{position:absolute;left:12px;top:12px;padding:8px 12px;max-width:42vw}#pov .who small{display:block;opacity:.7;font-weight:500}",
    "#pov .leave{position:absolute;right:12px;top:12px;pointer-events:auto;font:800 15px ui-rounded,system-ui,sans-serif;padding:12px 16px;border-radius:14px;border:2px solid #c5ff49;background:rgba(16,17,20,.75);color:#c5ff49;cursor:pointer}",
    "#pov .held{position:absolute;right:12px;bottom:12px;padding:8px 12px;text-align:right;max-width:40vw}",
    "#pov .paws{position:absolute;left:50%;bottom:-30px;width:300px;height:120px;transform:translateX(-50%)}",
    "#pov .paw{position:absolute;bottom:0;width:78px;height:96px;border-radius:44% 44% 30% 30%;box-shadow:inset -10px -8px 0 rgba(0,0,0,.18),0 0 0 3px rgba(20,16,30,.55)}",
    "#pov .paw.l{left:10px;transform:rotate(14deg)}#pov .paw.r{right:10px;transform:rotate(-14deg)}",
    "#pov .paws .item{position:absolute;right:30px;bottom:72px;font-size:42px;filter:drop-shadow(0 2px 0 rgba(0,0,0,.4))}",
    "#pov .toast{position:absolute;left:50%;top:64px;transform:translateX(-50%);padding:7px 12px;opacity:0;transition:opacity .3s;white-space:nowrap;max-width:90vw;overflow:hidden;text-overflow:ellipsis}#pov .toast.on{opacity:1}",
    "#pov .warn{position:absolute;inset:0;box-shadow:inset 0 0 120px rgba(255,40,60,.0);transition:box-shadow .5s}#pov .warn.on{box-shadow:inset 0 0 140px rgba(255,40,60,.45)}",
    "#pov .intro{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(10,8,18,.6);transition:opacity 1.2s;text-align:center;gap:8px}",
    "#pov .intro.out{opacity:0}#pov .intro h2{margin:0;font-size:30px;color:#c5ff49}#pov .intro p{margin:0;opacity:.85;max-width:520px;padding:0 16px;line-height:1.6}",
    "#pov .death{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:rgba(20,6,12,.82);pointer-events:auto;text-align:center}",
    "#pov .death h2{margin:0;font-size:34px}#pov .death button,#pov .menu button{font:800 15px ui-rounded,system-ui,sans-serif;padding:11px 16px;border-radius:12px;border:0;background:#c5ff49;color:#101114;cursor:pointer}",
    "#pov .menu{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:14px;width:min(420px,92vw);max-height:70vh;overflow:auto;pointer-events:auto;background:rgba(16,17,20,.94);z-index:2}",
    "#pov .menu h3{margin:0 0 8px}#pov .menu .r{display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid rgba(255,255,255,.08)}#pov .menu .r .t{flex:1}#pov .menu .r small{display:block;opacity:.65;font-weight:500}",
    "#pov .menu button[disabled]{background:#444;color:#999}#pov .menu .x{background:transparent;color:#f5f3ed;border:1px solid rgba(255,255,255,.2)}",
    "#pov .lockhint{position:absolute;left:50%;bottom:150px;transform:translateX(-50%);padding:6px 10px;font-size:12px;opacity:.85}",
    // phone controls
    "#pov .touch{display:none}#pov.phone .touch{display:block}#pov.phone .lockhint{display:none}#pov.phone .paws{bottom:-50px;width:240px}",
    "#pov .stickzone{position:absolute;left:0;bottom:0;width:45vw;height:55vh;pointer-events:auto}",
    "#pov .lookzone{position:absolute;right:0;top:70px;width:55vw;bottom:0;pointer-events:auto}",
    "#pov .stick{position:absolute;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;border:2px solid rgba(255,255,255,.35);background:rgba(16,17,20,.3);left:90px;bottom:auto;top:calc(100% - 110px)}",
    "#pov .stick i{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;background:rgba(245,243,237,.75)}",
    "#pov .btns{position:absolute;right:14px;bottom:18px;display:grid;grid-template-columns:repeat(3,64px);gap:10px;pointer-events:auto}",
    "#pov .btns button{width:64px;height:64px;border-radius:50%;border:2px solid rgba(255,255,255,.3);background:rgba(16,17,20,.62);color:#f5f3ed;font:800 12px ui-rounded,system-ui,sans-serif;line-height:1.1;padding:0}",
    "#pov .btns button.big{background:rgba(197,255,73,.88);color:#101114;border-color:#c5ff49}#pov .btns button.on{border-color:#c5ff49;color:#c5ff49}",
    "#pov.phone .toast{top:auto;bottom:250px;white-space:normal;text-align:center;max-width:80vw}",
    "#pov.phone .bars{bottom:auto;top:118px;left:8px;transform:scale(.85);transform-origin:left top}#pov.phone .held{display:none}#pov.phone .who{display:none}",
    "@media (max-width:640px){#pov .compass{top:58px}#pov .clock{top:88px}#pov .leave{font-size:13px;padding:10px 12px}}"
  ].join("\n");

  function phone() { try { return ("ontouchstart" in window) || (window.matchMedia && window.matchMedia("(pointer: coarse)").matches); } catch (e) { return false; } }

  function buildHud() {
    removeHud();
    if (!document.getElementById("pov-css")) { var st = el("style"); st.id = "pov-css"; st.textContent = CSS; document.head.appendChild(st); }
    var c = S.c, root = el("div", P.forcePhone || phone() ? "phone" : "");
    root.id = "pov";
    hud = { root: root };
    hud.warn = root.appendChild(el("div", "warn"));
    hud.paws = root.appendChild(el("div", "paws"));
    var hue = c.look && c.look.hue != null ? c.look.hue : 40, col = "hsl(" + hue + ",55%," + (52 + (c.look.light || 0) * 0.2) + "%)";
    hud.pawL = hud.paws.appendChild(el("div", "paw l")); hud.pawR = hud.paws.appendChild(el("div", "paw r"));
    hud.pawL.style.background = hud.pawR.style.background = col;
    hud.item = hud.paws.appendChild(el("div", "item"));
    hud.cross = root.appendChild(el("div", "cross"));
    hud.prompt = root.appendChild(el("div", "prompt glassy"));
    hud.compass = root.appendChild(el("div", "compass glassy"));
    hud.clock = root.appendChild(el("div", "clock"));
    hud.who = root.appendChild(el("div", "who glassy"));
    hud.bars = root.appendChild(el("div", "bars glassy"));
    hud.bar = {};
    [["food", "🍎"], ["health", "❤️"], ["warm", "🔥"], ["energy", "⚡"]].forEach(function (b) {
      hud.bars.appendChild(el("span", null, b[1]));
      var bar = hud.bars.appendChild(el("div", "bar")), fill = bar.appendChild(el("i"));
      hud.bar[b[0]] = { bar: bar, fill: fill, icon: hud.bars.children[hud.bars.children.length - 2] };
    });
    hud.held = root.appendChild(el("div", "held glassy"));
    hud.toast = root.appendChild(el("div", "toast glassy"));
    hud.lockhint = root.appendChild(el("div", "lockhint glassy", "click to look around · WASD move · E / F / R act · C make · Esc leave"));
    var leave = root.appendChild(el("button", "leave", "⬆ leave body"));
    leave.title = "back to god view (Esc)";
    leave.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
    leave.addEventListener("click", function (e) { e.stopPropagation(); P.leave(); });
    // phone: joystick on the left, drag to look on the right, big buttons
    var tz = root.appendChild(el("div", "touch"));
    hud.stickZone = tz.appendChild(el("div", "stickzone"));
    hud.stick = hud.stickZone.appendChild(el("div", "stick")); hud.knob = hud.stick.appendChild(el("i"));
    hud.lookZone = tz.appendChild(el("div", "lookzone"));
    var btns = tz.appendChild(el("div", "btns"));
    function btn(txt, cls, fn, hold) {
      var b = btns.appendChild(el("button", cls || "", txt));
      b.addEventListener("pointerdown", function (e) { e.preventDefault(); e.stopPropagation(); fn(true, b); });
      if (hold) { b.addEventListener("pointerup", function (e) { e.preventDefault(); fn(false, b); }); b.addEventListener("pointercancel", function () { fn(false, b); }); }
      return b;
    }
    btn("make", "", function () { toggleMenu(); });
    hud.btnAlt = btn("F<br><small>alt</small>", "", function () { P.interact("alt"); });
    hud.btnAct = btn("E<br><small>act</small>", "big", function () { P.interact("main"); });
    btn("drop", "", function () { drop(); });
    hud.btnRun = btn("run", "", function (on, b) { P.input.run = !P.input.run; b.classList.toggle("on", P.input.run); });
    btn("hop", "", function () { P.input.jump = true; });
    hud.intro = root.appendChild(el("div", "intro", "<h2>you are " + esc(c.name) + "</h2><p>no miracles down here. find food, keep warm, sleep somewhere safe before the grumps come out.</p><p style='opacity:.6;font-size:12px'>" + (root.classList.contains("phone") ? "left thumb walks · drag right side to look · E acts on what you're looking at" : "WASD walk · mouse looks · space hops · shift runs · E / F act · R hits · Q drops · Z sleeps · C makes things · Esc leaves") + "</p>"));
    setTimeout(function () { if (hud && hud.intro) { hud.intro.classList.add("out"); setTimeout(function () { if (hud && hud.intro) { hud.intro.remove(); hud.intro = null; } }, 1300); } }, 2600);
    document.body.appendChild(root);
    document.body.classList.add("pov");
    bindInputs();
    updateHud();
  }
  function removeHud() {
    unbindInputs();
    if (typeof document !== "undefined" && document.body && document.body.classList) document.body.classList.remove("pov");
    if (hud && hud.root) hud.root.remove();
    hud = null; keys = {};
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]; }); }

  var toastT = null;
  function say(msg) {
    if (!hud) return;
    hud.toast.textContent = msg; hud.toast.classList.add("on");
    clearTimeout(toastT); toastT = setTimeout(function () { if (hud) hud.toast.classList.remove("on"); }, 2600);
  }
  P.say = say;

  function pct(v) { return Math.round(SB.clamp01(v) * 100) + "%"; }
  function setBar(b, v, colA, colB) {
    var x = hud.bar[b]; x.fill.style.width = pct(v); x.fill.style.background = v < 0.3 ? colB : colA; x.bar.classList.toggle("low", v < 0.2);
  }
  var DIRS = [["N", 0], ["NE", 45], ["E", 90], ["SE", 135], ["S", 180], ["SW", 225], ["W", 270], ["NW", 315]];
  function updateHud() {
    var c = S.c, game = S.game, w = game.world, ch = c.chem, Id = I();
    // bars: full is good
    setBar("food", 1 - ch.hunger, "#ffb347", "#ff5d5d");
    setBar("health", ch.health, "#ff6b8b", "#ff3b3b");
    var cold = ch.cold || 0, hot = ch.hot || 0;
    setBar("warm", 1 - Math.max(cold, hot), hot > cold ? "#ffd166" : "#8fd3ff", hot > cold ? "#ff8c42" : "#5d9bff");
    hud.bar.warm.icon.textContent = cold > 0.35 ? "🥶" : hot > 0.35 ? "🥵" : "🔥";
    setBar("energy", 1 - Math.max(ch.tired || 0, (ch.sleepy || 0) * 0.9), "#c5ff49", "#b59aff");
    // who you are
    var tier = SB.TIERS[c.tier];
    hud.who.innerHTML = esc(c.name) + " <span style='color:" + tier.color + "'>" + tier.icon + " " + tier.name + "</span><small>" + SB.STAGES[c.stage].name + (c.asleep ? " · asleep (move to wake)" : "") + (S.lessons ? " · 🧠 " + S.lessons + " learned from you" : "") + "</small>";
    // what's in your paws
    var hk = heldKind(c, game), tk = toolKind(c, game), bag = (c.bag || []).map(function (id) { var o = SB.Game.byId(game, id); return o && K[o.kind] ? K[o.kind].emoji : ""; }).join("");
    hud.item.textContent = hk && K[hk] ? K[hk].emoji : "";
    hud.held.innerHTML = (hk ? "✋ " + (K[hk] ? K[hk].emoji + " " + K[hk].label : hk) : "<span style='opacity:.6'>empty paws</span>") + (tk ? "<br>🔧 " + (K[tk] ? K[tk].emoji + " " + K[tk].label : tk) : "") + (bag ? "<br>🎒 " + bag : "");
    // time of day and compass
    var tday = (w.time / SB.DAY_LENGTH) % 1, hh = Math.floor(tday * 24), mm = Math.floor((tday * 24 - hh) * 60);
    var part = w.night ? "night 🌙" : tday < 0.27 ? "dawn 🌅" : tday < 0.45 ? "morning ☀️" : tday < 0.58 ? "midday ☀️" : tday < 0.74 ? "afternoon 🌤" : "dusk 🌇";
    var wx = w.weather.rain > 0.3 ? (w.weather.snow || SB.World.tempAt(w, c.x, c.z) < 0.25 ? " · snowing ❄️" : " · raining 🌧") : w.weather.wind > 0.7 ? " · windy 💨" : "";
    var pf = SB.Render && SB.Render.perf;
    hud.clock.textContent = ("0" + hh).slice(-2) + ":" + ("0" + mm).slice(-2) + " · " + part + wx + (pf && pf.show && pf.ft ? " · " + Math.round(1000 / pf.ft) + " fps" : "");
    var head = ((-S.yaw * 180 / Math.PI) % 360 + 360) % 360, wpx = hud.compass.clientWidth || 300, span = 120, html = "";
    DIRS.forEach(function (d) {
      var off = ((d[1] - head + 540) % 360) - 180;
      if (Math.abs(off) < span / 2) html += "<span class='" + (d[0].length === 1 ? "c" : "") + "' style='left:" + (50 + off / span * 100) + "%'>" + d[0] + "</span>";
    });
    var home = SB.Society ? SB.Society.home(game, c.tribe) : w.T.spawn;
    if (home && SB.dist(home.x, home.z, c.x, c.z) > 3) {
      var ha = Math.atan2(home.x - c.x, -(home.z - c.z)) * 180 / Math.PI, ho = ((ha - head + 540) % 360) - 180;
      if (Math.abs(ho) < span / 2) html += "<span style='left:" + (50 + ho / span * 100) + "%;top:2px'>🏠</span>";
    }
    hud.compass.innerHTML = html;
    void wpx;
    // what you're looking at
    if (!S.dead) {
      var t = P.look(game, c), m1 = P.verbFor(game, c, t, "main"), m2 = t ? P.verbFor(game, c, t, "alt") : null, desk = !hud.root.classList.contains("phone");
      var parts = [];
      if (m1) parts.push((desk && m1.verb != null ? "<b>E</b> " : "") + esc(m1.label));
      if (m2 && m2.verb != null) parts.push((desk ? "<b>F</b> " : "") + esc(m2.label));
      hud.prompt.innerHTML = t || (m1 && m1.tgt) ? parts.join(" &nbsp;·&nbsp; ") : "";
      hud.cross.classList.toggle("on", !!t);
      if (hud.btnAlt) hud.btnAlt.style.opacity = m2 && m2.verb != null ? 1 : 0.4;
    }
    // danger: a grump close by at night
    var g = null, gd = 12;
    game.creatures.forEach(function (o) { if (o.alive && o.species === "grump") { var d = SB.dist(o.x, o.z, c.x, c.z); if (d < gd) { gd = d; g = o; } } });
    hud.warn.classList.toggle("on", !!g || ch.health < 0.25);
    if (g && !S.grumpWarned) { S.grumpWarned = true; say("👺 a grump! hit it with a club, run, or get near a fire"); }
    if (!g) S.grumpWarned = false;
    if (w.night && !S.nightWarned) { S.nightWarned = true; say("🌙 night. grumps come out: find a fire or a hut"); }
    if (!w.night) S.nightWarned = false;
    if (ch.hunger > 0.75 && !S.hungryWarned) { S.hungryWarned = true; say("🍎 so hungry… look for food"); }
    if (ch.hunger < 0.6) S.hungryWarned = false;
    hud.lockhint.style.display = locked() ? "none" : "";
  }

  var pawT = 0;
  function paws(dt) {
    pawT += dt;
    var b = S.bobK || 0, s = Math.sin(S.bob * Math.PI), a = S.c.action;
    var busy = a && a.phase === "do" && a.verb !== V.idle && a.verb !== V.sleep ? Math.abs(Math.sin(pawT * 9)) * 18 : 0;
    hud.pawL.style.transform = "translateY(" + (s * 8 * b + busy * 0.4) + "px) rotate(14deg)";
    hud.pawR.style.transform = "translateY(" + (-s * 8 * b - busy) + "px) rotate(-14deg)";
    hud.paws.style.opacity = S.c.asleep ? 0.2 : 1;
  }

  function deathScreen(c, why) {
    var d = hud.root.appendChild(el("div", "death", "<div style='font-size:48px'>🕯</div><h2>" + esc(c.name) + " " + esc(why) + "</h2><p style='opacity:.75;max-width:420px;line-height:1.6;margin:0;padding:0 16px'>you rise out of the little body and back up into the sky. the others will remember " + esc(c.name) + ".</p>"));
    var b = d.appendChild(el("button", null, "back to the sky"));
    var done = false, go = function () { if (done) return; done = true; P.leave("died"); };
    b.addEventListener("click", go);
    setTimeout(go, 7000);
  }

  /* crafting / building menu (C) */
  function toggleMenu() {
    if (!hud) return;
    if (hud.menu) { hud.menu.remove(); hud.menu = null; return; }
    var c = S.c, game = S.game, list = P.recipes(game, c);
    if (document.exitPointerLock && locked()) try { document.exitPointerLock(); } catch (e) {}
    var m = hud.root.appendChild(el("div", "menu glassy"));
    hud.menu = m;
    m.appendChild(el("h3", null, "🛠 make & build"));
    if (c.tier < 2) m.appendChild(el("p", null, "a " + SB.TIERS[c.tier].name + " has no hands for this yet. tool-users can make things; their ideas show here."));
    else if (!list.length) m.appendChild(el("p", null, esc(c.name) + " doesn't know how to make anything yet. ideas come from playing with things (and from your miracles, up in the sky)."));
    list.forEach(function (r) {
      var row = m.appendChild(el("div", "r"));
      row.appendChild(el("div", "t", (r.d.icon || "") + " " + esc(r.d.name) + "<small>" + esc(r.why || r.d.desc || "") + "</small>"));
      var b = row.appendChild(el("button", null, r.kind === "build" ? "place" : "make"));
      if (!r.ok || (r.kind === "build" && c.tier < 2)) b.disabled = true;
      b.addEventListener("click", function () { P.make(r.id); toggleMenu(); });
    });
    var x = m.appendChild(el("button", "x", "close (C)"));
    x.addEventListener("click", function () { toggleMenu(); });
  }
  P.toggleMenu = toggleMenu;
  function drop() { if (S && S.c.holding != null) { learn(S.game, S.c, V.drop, null); SB.Creature.startAction(S.c, S.game, V.drop, null); } }
  function sleep() {
    if (!S) return;
    var c = S.c, ch = c.chem;
    if (ch.sleepy < 0.15 && ch.tired < 0.25) { say("not sleepy"); return; }
    learn(S.game, c, V.sleep, null);
    SB.Creature.startAction(c, S.game, V.sleep, null);
    say("zzz… (move to wake up)");
  }

  /* ---------------- desktop and phone controls ---------------- */
  var bound = null;
  function locked() { return typeof document !== "undefined" && !!document.pointerLockElement; }
  function canvasEl() { return document.getElementById("overlay") || document.getElementById("view"); }
  function bindInputs() {
    var cv = canvasEl(), drag = null, stick = null, lookP = null;
    var h = {
      keydown: function (e) {
        if (!S) return;
        var k = e.key.toLowerCase();
        if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
        keys[k] = true;
        if (k === "escape") { if (hud && hud.menu) toggleMenu(); else P.leave(); e.preventDefault(); return; }
        if (S.dead) return;
        if (k === " ") { P.input.jump = true; e.preventDefault(); }
        else if (k === "e" || k === "enter") P.interact("main");
        else if (k === "f") P.interact("alt");
        else if (k === "r") P.interact("hit");
        else if (k === "q") drop();
        else if (k === "z") sleep();
        else if (k === "c" || k === "tab") { toggleMenu(); e.preventDefault(); }
        if (k.indexOf("arrow") === 0) e.preventDefault();
      },
      keyup: function (e) { keys[e.key.toLowerCase()] = false; },
      blur: function () { keys = {}; },
      down: function (e) {
        if (!S || S.dead || (hud && hud.menu) || e.pointerType !== "mouse") return;
        if (!locked() && cv.requestPointerLock && !P.noLock) { try { var pr = cv.requestPointerLock(); if (pr && pr.catch) pr.catch(function () {}); } catch (er) {} }
        if (locked()) { if (e.button === 0) P.interact("main"); else if (e.button === 2) P.interact("alt"); return; }
        drag = { x: e.clientX, y: e.clientY, moved: 0, b: e.button };
      },
      move: function (e) {
        if (!S) return;
        if (locked()) { S.mdx = (S.mdx || 0) + (e.movementX || 0); S.mdy = (S.mdy || 0) + (e.movementY || 0); return; }
        if (drag) { var dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy); look(dx * 1.4, dy * 1.4); }
      },
      up: function () { if (drag && drag.moved < 6) P.interact(drag.b === 2 ? "alt" : "main"); drag = null; },
      ctx: function (e) { if (S) e.preventDefault(); },
      stickDown: function (e) { e.preventDefault(); stick = { id: e.pointerId, x: e.clientX, y: e.clientY }; var r = hud.stickZone.getBoundingClientRect(); hud.stick.style.left = (e.clientX - r.left) + "px"; hud.stick.style.top = (e.clientY - r.top) + "px"; try { hud.stickZone.setPointerCapture(e.pointerId); } catch (er) {} },
      stickMove: function (e) {
        if (!stick || e.pointerId !== stick.id) return;
        var dx = e.clientX - stick.x, dy = e.clientY - stick.y, d = Math.hypot(dx, dy), mx = 48;
        if (d > mx) { dx *= mx / d; dy *= mx / d; }
        hud.knob.style.transform = "translate(" + dx + "px," + dy + "px)";
        P.input.side = dx / mx; P.input.fwd = -dy / mx;
        P.input.run = P.input.run || d > mx * 1.6;
      },
      stickUp: function (e) { if (!stick || e.pointerId !== stick.id) return; stick = null; hud.knob.style.transform = ""; P.input.side = P.input.fwd = 0; },
      lookDown: function (e) { e.preventDefault(); lookP = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 }; try { hud.lookZone.setPointerCapture(e.pointerId); } catch (er) {} },
      lookMove: function (e) { if (!lookP || e.pointerId !== lookP.id) return; var dx = e.clientX - lookP.x, dy = e.clientY - lookP.y; lookP.x = e.clientX; lookP.y = e.clientY; lookP.moved += Math.abs(dx) + Math.abs(dy); look(dx * 1.6, dy * 1.6); },
      lookUp: function (e) { if (!lookP || e.pointerId !== lookP.id) return; if (lookP.moved < 8 && performance.now() - lookP.t < 300) P.interact("main"); lookP = null; },
      lockChange: function () { if (hud) updateHud(); }
    };
    window.addEventListener("keydown", h.keydown);
    window.addEventListener("keyup", h.keyup);
    window.addEventListener("blur", h.blur);
    if (cv) { cv.addEventListener("pointerdown", h.down); cv.addEventListener("contextmenu", h.ctx); }
    window.addEventListener("pointermove", h.move);
    window.addEventListener("pointerup", h.up);
    document.addEventListener("pointerlockchange", h.lockChange);
    hud.stickZone.addEventListener("pointerdown", h.stickDown); hud.stickZone.addEventListener("pointermove", h.stickMove);
    hud.stickZone.addEventListener("pointerup", h.stickUp); hud.stickZone.addEventListener("pointercancel", h.stickUp);
    hud.lookZone.addEventListener("pointerdown", h.lookDown); hud.lookZone.addEventListener("pointermove", h.lookMove);
    hud.lookZone.addEventListener("pointerup", h.lookUp); hud.lookZone.addEventListener("pointercancel", h.lookUp);
    bound = { h: h, cv: cv };
  }
  function unbindInputs() {
    if (!bound) return;
    var h = bound.h, cv = bound.cv;
    window.removeEventListener("keydown", h.keydown);
    window.removeEventListener("keyup", h.keyup);
    window.removeEventListener("blur", h.blur);
    if (cv) { cv.removeEventListener("pointerdown", h.down); cv.removeEventListener("contextmenu", h.ctx); }
    window.removeEventListener("pointermove", h.move);
    window.removeEventListener("pointerup", h.up);
    document.removeEventListener("pointerlockchange", h.lockChange);
    bound = null;
  }
  // held keys -> the move vector (the joystick writes P.input directly)
  function readKeys() {
    if (!hud || !bound) return;
    if (hud.root.classList.contains("phone") && !(keys.w || keys.a || keys.s || keys.d || keys.arrowup || keys.arrowdown || keys.arrowleft || keys.arrowright)) return;
    var f = 0, s = 0;
    if (keys.w || keys.arrowup) f += 1;
    if (keys.s || keys.arrowdown) f -= 1;
    if (keys.a || keys.arrowleft) s -= 1;
    if (keys.d || keys.arrowright) s += 1;
    P.input.fwd = f; P.input.side = s; P.input.run = !!keys.shift;
  }

  /* ---------------- a hint after the first hatch ---------------- */
  if (SB.bus) SB.bus.on("hatch", function () {
    var g = SB.Game && SB.Game.current;
    if (!g || g.showcase || P.headless) return;
    var st = g.settings || (g.settings = {});
    if (st.povTip) return;
    st.povTip = 1;
    setTimeout(function () { if (SB.UI && SB.UI.toast && !P.active) SB.UI.toast("👁 tap a smol, then <b>possess</b> on its card to see the island through its eyes (" + P.COST + " ✨)", "", 7000); }, 9000);
  });
})();
