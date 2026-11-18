/* smol brains: motion3.js (round 3, "motion"): how you move and what you see.
   In a body: glide, flutter-jump and hover (wings / ascended), a vine rope and reed flippers on your belt, an aim lock,
   an over-the-shoulder camera, a follow shot on a thrown spear, wriggling free of a grump, ladders / steps / a rope lift /
   a log slide you lay by hand, a cart on the trails, a kick course. From the sky: a glow under loose things, a menu per
   object, a tickle / scold glyph, a prize grab, a sketch on the ground, a turning model, skills as stars.
   Four tiny canvas games sit on "the slate" (a section of the moves tab, and the sky menu of a hall or school).
   State: game.quests.motion3, and plain fields on a smol (m3rope, m3flip, m3fin, kickKeeper). */
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var M = SB.Motion3 = {}, K = SB.KINDS, SK = SB.STRUCTS, W = SB.World;
  if (!K || !SK || !W) return;
  function P() { return SB.Possess; }
  function Sv() { return SB.Surv; }
  function R() { return SB.Render; }
  function ps() { return P() && P().active ? P().state() : null; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  function say(t) { if (P() && P().say && ps()) P().say(t); }
  function snd(n) { if (SB.Audio && SB.Audio.play && !(P() && P().headless)) SB.Audio.play(n, { vol: 0.6 }); }
  function emit(n, d) { if (SB.bus) SB.bus.emit(n, d); }
  function q(game) {
    var Q = game.quests || (game.quests = {}), s = Q.motion3;
    if (!s || typeof s !== "object") s = Q.motion3 = {};
    if (!Array.isArray(s.sketch)) s.sketch = [];
    if (!s.best) s.best = {};
    if (!s.golf) s.golf = { kicks: 0, holes: 0, best: 0 };
    return s;
  }
  M.state = q;

  /* ---------------- things ---------------- */
  // deep.js has a vine rope too (thrown up a cliff): it is the same rope, and theirs is the recipe when it is there
  if (!K.vinerope) K.vinerope = { noun: "material", label: "vine rope", emoji: "🪢", r: 0.14, color: 0x4f9a3a, mat: 1, desc: "on your belt, it gets you up any cliff." };
  K.flippers = { noun: "material", label: "reed flippers", emoji: "🩴", r: 0.14, color: 0xb8c46a, mat: 1, desc: "on your feet, you can swim." };
  K.cart = { noun: "material", label: "cart", emoji: "🛒", r: 0.2, color: 0xc9935a, mat: 1, desc: "rolls fast along a trail. a thinker's toy." };
  M.MAKE = { vinerope: { vine: 3 }, flippers: { fiber: 2, leaves: 2 }, cart: { plank: 2, log: 1 } };
  SK.ladder = { noun: "material", label: "vine ladder", emoji: "🪜", r: 0.5, cost: { vine: 2, stick: 2 }, work: 1, desc: "a way up a cliff. anyone can use it." };
  SK.steps = { noun: "material", label: "stone steps", emoji: "🧱", r: 0.6, cost: { stone: 4 }, work: 1, desc: "steps up a steep bit." };
  SK.lift = { noun: "material", label: "rope lift", emoji: "🛗", r: 0.5, cost: { vine: 3, log: 1 }, work: 1, desc: "pull the rope: up you go. pull it at the top to come down." };
  SK.slide = { noun: "material", label: "log slide", emoji: "🛝", r: 0.6, cost: { log: 2 }, work: 1, desc: "wheee. lay a few in a row down a hill." };
  SK.kickflag = { noun: "material", label: "kick flag", emoji: "⛳", r: 0.3, cost: { stick: 1, leaves: 1 }, work: 1, desc: "kick the ball to it in as few kicks as you can." };
  M.BUILD = ["ladder", "steps", "lift", "slide", "kickflag"];
  var REACH = { ladder: 1.4, steps: 1.8, lift: 1.2 };
  M.LIFT = 5; M.SLIDE = 6;
  var ME = SB.Meshes;
  if (ME && ME.STRUCT_BUILDERS && ME.builder) {
    try {
      ME.STRUCT_BUILDERS.ladder = function () {
        var b = ME.builder().color(0x4f9a3a), i;
        b.push().translate(-0.2, 0.7, 0).box(0.05, 1.4, 0.05).pop().push().translate(0.2, 0.7, 0).box(0.05, 1.4, 0.05).pop().color(0x8a5a33);
        for (i = 0; i < 5; i++) b.push().translate(0, 0.2 + i * 0.27, 0).box(0.44, 0.05, 0.05).pop();
        return b.finish();
      };
      ME.STRUCT_BUILDERS.steps = function () {
        var b = ME.builder().color(0x9a96a0), i;
        for (i = 0; i < 4; i++) b.push().translate(0, 0.1 + i * 0.2, i * 0.3 - 0.45).box(0.9, 0.2, 0.3).pop();
        return b.finish();
      };
      ME.STRUCT_BUILDERS.lift = function () {
        var b = ME.builder().color(0x8a5a33);
        b.push().translate(0, 0.9, 0).box(0.1, 1.8, 0.1).pop().push().translate(0, 1.75, 0.3).box(0.08, 0.08, 0.7).pop();
        b.color(0x4f9a3a).push().translate(0, 1.1, 0.6).box(0.04, 1.3, 0.04).pop().color(0xc9935a).push().translate(0, 0.4, 0.6).box(0.5, 0.08, 0.5).pop();
        return b.finish();
      };
      ME.STRUCT_BUILDERS.slide = function () {
        var b = ME.builder().color(0x8a5a35);
        b.push().translate(-0.3, 0.12, 0).box(0.14, 0.2, 2.6).pop().push().translate(0.3, 0.12, 0).box(0.14, 0.2, 2.6).pop();
        b.color(0xc9935a).push().translate(0, 0.04, 0).box(0.5, 0.06, 2.6).pop();
        return b.finish();
      };
      ME.STRUCT_BUILDERS.kickflag = function () {
        var b = ME.builder().color(0x8a5a33);
        b.push().translate(0, 0.5, 0).box(0.04, 1, 0.04).pop().color(0xff5a4a).push().translate(0.14, 0.88, 0).box(0.26, 0.18, 0.02).pop();
        return b.finish();
      };
    } catch (e) {}
  }
  function costText(cost) { var o = []; for (var k in cost) o.push(cost[k] + " " + (K[k] ? K[k].label : k)); return o.join(", "); }
  function lacks(c, cost) { for (var k in cost) if (Sv().count(c, k, true) < cost[k]) return true; return false; }
  function pay(c, cost) { for (var k in cost) Sv().take(c, k, cost[k]); }
  M.whyNot = function (game, c, kind) {
    var cost = SK[kind] ? SK[kind].cost : M.MAKE[kind];
    if (!cost || !c) return "nope";
    if (c.tier < 2) return "needs paws that can hold things";
    if (kind === "vinerope" && SB.Deep) return "it is in your crafting list";
    if (kind === "cart" && c.tier < 5) return "only a thinker can work out a cart";
    if (lacks(c, cost)) return "needs " + costText(cost);
    return "";
  };
  M.make = function (game, c, kind) {
    var why = M.MAKE[kind] ? M.whyNot(game, c, kind) : "nope";
    if (why) return { ok: false, msg: why };
    pay(c, M.MAKE[kind]); Sv().add(c, kind, 1);
    return { ok: true, msg: "made: " + K[kind].label };
  };
  // put one of the five down where you look (they are small: no site, no waiting)
  M.place = function (game, c, kind) {
    var why = SK[kind] && M.BUILD.indexOf(kind) >= 0 ? M.whyNot(game, c, kind) : "nope";
    if (why) return { ok: false, msg: why };
    var s = ps(), yaw = s && s.c === c ? s.yaw : c.facing + Math.PI, ag = s && s.c === c && P().aimGround ? P().aimGround(game, c, 4) : null;
    var x = ag ? ag.x : c.x - Math.sin(yaw) * 1.6, z = ag ? ag.z : c.z - Math.cos(yaw) * 1.6;
    if (!W.inBounds(game.world, x, z) || W.depthAt(game.world, x, z) > 0.3) return { ok: false, msg: "not there" };
    pay(c, SK[kind].cost);
    var st = W.addStructure(game.world, game, kind, x, z, { done: true, rot: yaw + Math.PI });
    LW = null;
    emit("m3built", { c: c, st: st });
    return { ok: true, msg: "a " + SK[kind].label + "! " + SK[kind].emoji, st: st };
  };

  /* ---------------- where you can walk: ladders, steps, the lift, your rope ---------------- */
  var LW = null, LN = -1, L = [], SL = [], FL = [];
  function refresh(world) {
    LW = world; LN = world.structures.length; L = []; SL = []; FL = [];
    for (var i = 0; i < LN; i++) {
      var s = world.structures[i];
      if (!s.done) continue;
      if (REACH[s.kind]) L.push(s);
      if (s.kind === "slide") SL.push(s); else if (s.kind === "kickflag") FL.push(s);
    }
  }
  function lists(world) { if (LW !== world || LN !== world.structures.length) refresh(world); }
  M.rides = [];
  var w0 = W.walkable;
  W.walkable = function (world, x, z, swim) {
    if (w0(world, x, z, swim)) return true;
    if (!W.inBounds(world, x, z) || (W.depthAt(world, x, z) > 0.5 && !swim)) return false;
    lists(world);
    var i, s, r;
    for (i = 0; i < L.length; i++) { s = L[i]; r = REACH[s.kind]; if (Math.abs(x - s.x) < r && Math.abs(z - s.z) < r) return true; }
    for (i = 0; i < M.rides.length; i++) { s = M.rides[i].c; if (Math.abs(x - s.x) < 1 && Math.abs(z - s.z) < 1) return true; }
    s = P() && P().active ? P().c : null;
    return !!(s && s.m3rope && Math.abs(x - s.x) < 1.5 && Math.abs(z - s.z) < 1.5);
  };
  M.walk0 = w0;

  /* ---------------- rides: the lift, the slide, the cart ---------------- */
  function line(world, x, z, rot, len) {
    var pts = [], dx = Math.sin(rot), dz = Math.cos(rot);
    for (var k = 1; k <= len; k++) { var px = x + dx * k, pz = z + dz * k; if (!W.inBounds(world, px, pz) || W.depthAt(world, px, pz) > 0.5) break; pts.push([px, pz]); }
    return pts;
  }
  M.riding = function (c) { for (var i = 0; i < M.rides.length; i++) if (M.rides[i].c === c) return M.rides[i]; return null; };
  function ride(c, pts, sp, kind) {
    if (!pts.length || M.riding(c)) return false;
    M.rides.push({ c: c, pts: pts, i: 0, sp: sp, kind: kind });
    emit("m3ride", { c: c, kind: kind });
    return true;
  }
  M.useLift = function (game, c, st) {
    var bx = st.x + Math.sin(st.rot) * M.LIFT, bz = st.z + Math.cos(st.rot) * M.LIFT, up = SB.dist(c.x, c.z, st.x, st.z) <= SB.dist(c.x, c.z, bx, bz);
    var pts = line(game.world, st.x, st.z, st.rot, M.LIFT);
    if (!up) { pts.reverse(); pts.push([st.x, st.z]); pts.shift(); }
    return ride(c, pts, 3.2, "lift");
  };
  M.useSlide = function (game, c, st) {
    lists(game.world);
    var pts = [[st.x, st.z]], cur = st, seen = {}, n = 0;
    while (cur && n++ < 8) {
      seen[cur.id] = 1;
      var seg = line(game.world, cur.x, cur.z, cur.rot, M.SLIDE), end = seg[seg.length - 1], nx = null;
      pts = pts.concat(seg);
      if (!end || seg.length < M.SLIDE) break;
      for (var i = 0; i < SL.length; i++) if (!seen[SL[i].id] && SB.dist(SL[i].x, SL[i].z, end[0], end[1]) < 2.5) { nx = SL[i]; break; }
      cur = nx;
    }
    return ride(c, pts, 7, "slide");
  };
  // the cart: follow the trail (world.road) the way you face
  M.roll = function (game, c, yaw) {
    var w = game.world, N = w.T && w.T.N, rd = w.road;
    if (!rd || !N) return false;
    var i = c.x | 0, j = c.z | 0, hx = -Math.sin(yaw), hz = -Math.cos(yaw), pts = [], seen = {};
    if (!rd[j * N + i]) return false;
    seen[j * N + i] = 1;
    for (var n = 0; n < 90; n++) {
      var best = -0.2, bi = 0, bj = 0, got = false;
      for (var a = -1; a <= 1; a++) for (var b = -1; b <= 1; b++) {
        if (!a && !b) continue;
        var t = (j + b) * N + i + a, d = (a * hx + b * hz) / Math.hypot(a, b);
        if (t < 0 || t >= rd.length || !rd[t] || seen[t] || d <= best) continue;
        best = d; bi = a; bj = b; got = true;
      }
      if (!got) break;
      i += bi; j += bj; seen[j * N + i] = 1;
      var hl = Math.hypot(bi, bj); hx = hx * 0.5 + bi / hl * 0.5; hz = hz * 0.5 + bj / hl * 0.5;
      pts.push([i + 0.5, j + 0.5]);
    }
    return pts.length >= 3 && ride(c, pts, 8, "cart");
  };
  function rideTick(game, dt) {
    for (var n = M.rides.length - 1; n >= 0; n--) {
      var r = M.rides[n], c = r.c, s = ps(), mine = s && s.c === c, left = r.sp * dt;
      if (!c.alive || c.heldBy || c.carriedBy != null || (mine && P().input.jump)) { M.rides.splice(n, 1); continue; }
      while (left > 0 && r.i < r.pts.length) {
        var p = r.pts[r.i], dx = p[0] - c.x, dz = p[1] - c.z, d = Math.hypot(dx, dz);
        if (d <= left) { c.x = p[0]; c.z = p[1]; left -= d; r.i++; }
        else { c.x += dx / d * left; c.z += dz / d * left; c.facing = Math.atan2(dx, dz); left = 0; }
      }
      c.action = null; c.path = null; c.moving = true; if (c.anim) c.anim.walk += dt * 4;
      if (r.i >= r.pts.length) {
        M.rides.splice(n, 1); c._m3r = game.time;
        if (SB.Chem && c.chem) SB.Chem.apply(c.chem, { bored: -0.2 });
        if (!mine && r.kind === "slide" && SB.Creature && SB.Creature.say) SB.Creature.say(c, "wheee!", game);
        emit("m3rideEnd", { c: c, kind: r.kind });
      }
    }
  }

  /* ---------------- in a body, every tick ---------------- */
  M.wings = function (c) { return !!(c && ((c.look && c.look.wings) || c.tier >= 6)); };
  M.GLIDE = 1.5; M.HOVER = 3; M.FLUTTER = 4.8;
  function air(game, c, s, dt) {
    var inp = P().input, C = SB.Creature;
    if (c.onGround !== false) { s.m3flut = false; s.m3hovUsed = false; s.m3hov = 0; s.m3air = null; return; }
    if (c.carriedBy != null || c.heldBy) return;
    var f = inp.fwd || 0, sd = inp.side || 0, mag = Math.hypot(f, sd), sy = Math.sin(s.yaw), cy = Math.cos(s.yaw);
    var dx = -sy * f + cy * sd, dz = -cy * f - sy * sd, dl = Math.hypot(dx, dz) || 1, sp = C.speedOf(c, null);
    if (inp.jump && c.tier >= 6 && !s.m3hovUsed) { inp.jump = false; s.m3hovUsed = true; s.m3hov = M.HOVER; s.m3hy = c.y; s.m3air = "hover"; snd("chime"); }
    else if (inp.jump && M.wings(c) && !s.m3flut) { inp.jump = false; s.m3flut = true; c.vy = M.FLUTTER; s.m3air = "flutter"; if (c.anim) c.anim.squash = 0.2; snd("boing"); emit("m3flutter", { c: c }); }
    if (s.m3hov > 0) {
      s.m3hov -= dt; c.vy = 0; c.y = s.m3hy; s.m3air = "hover";
      c.vx = mag > 0.08 ? dx / dl * sp : 0; c.vz = mag > 0.08 ? dz / dl * sp : 0;
    } else if (M.wings(c) && c.vy < -M.GLIDE && mag > 0.08) {
      c.vy = -M.GLIDE; c.vx = dx / dl * sp * 1.3; c.vz = dz / dl * sp * 1.3; s.m3air = "glide";
    } else if (s.m3air === "hover" || s.m3air === "glide") s.m3air = null;
  }
  // aim lock: the view stays on one grump
  M.lock = function (o) { var s = ps(); if (!s) return false; s.m3lock = o && s.m3lock !== o.id ? o.id : null; return true; };
  M.locked = function () { var s = ps(); return s && s.m3lock != null ? SB.Game.byId(s.game, s.m3lock) : null; };
  function lockTick(game, c, s, dt) {
    var o = SB.Game.byId(game, s.m3lock);
    if (!o || !o.alive || o.gone || SB.dist(o.x, o.z, c.x, c.z) > 14) { s.m3lock = null; return; }
    var dx = o.x - c.x, dz = o.z - c.z, k = Math.min(1, dt * 10), r = SB.Creature.radius(o);
    s.yaw += SB.angDiff(s.yaw, Math.atan2(-dx, -dz)) * k;
    s.pitch += (Math.atan2(o.y + r - (c.y + SB.Creature.radius(c) * 1.7), Math.hypot(dx, dz) || 1) - s.pitch) * k;
  }
  // grabbed by a grump: wriggle (mash jump, hold use, or push the stick about) and it drops you
  function jail(game, c, s, dt) {
    var inp = P().input;
    if (c.carriedBy == null) { s.m3wr = 0; return; }
    if (!s.m3wr) say("💪 wriggle! mash jump or hold use");
    s.m3wr = (s.m3wr || 0.001) + (inp.use || Math.abs(inp.fwd) + Math.abs(inp.side) > 0.3 ? dt * 0.35 : 0);
    if (inp.jump) { inp.jump = false; s.m3wr += 0.2; }
    if (s.m3wr < 1) return;
    var g = SB.Game.byId(game, c.carriedBy);
    if (g && SB.Threats && SB.Threats.drop) SB.Threats.drop(game, g, null); else { c.carriedBy = null; c.onGround = false; c.vy = 3; }
    s.m3wr = 0; say("you wriggled free! run!"); snd("bonk");
    emit("m3free", { c: c, how: "wriggle" });
  }
  M.slip = function (game, c) {
    var s = ps();
    if (!s || c.captive == null) return false;
    s.m3slip = (s.m3slip || 0) + 0.34;
    if (s.m3slip < 1) { say("the knot is giving… again"); return true; }
    s.m3slip = 0; c.captive = null; c.captiveT = null;
    say("you slipped the ropes. home, quietly"); snd("achievement");
    emit("m3free", { c: c, how: "slip" });
    return true;
  };
  // flippers are fins while they are on (the body draws them, and the swim rules already know fins)
  function fins(c) {
    if (!c.look) return;
    if (c.m3flip && !c.look.fins) { c.look.fins = true; c.m3fin = 1; }
    else if (!c.m3flip && c.m3fin) { c.look.fins = false; c.m3fin = 0; }
  }
  M.belt = function (game, c, kind) {
    var f = kind === "vinerope" ? "m3rope" : kind === "flippers" ? "m3flip" : null;
    if (!f || !c) return { ok: false, msg: "nope" };
    if (c[f]) { c[f] = 0; Sv().add(c, kind, 1); fins(c); return { ok: true, msg: "off: " + K[kind].label }; }
    if (!Sv().has(c, kind)) return { ok: false, msg: "you have no " + K[kind].label };
    Sv().take(c, kind, 1); c[f] = 1; fins(c);
    return { ok: true, msg: kind === "vinerope" ? "rope on your belt: cliffs are yours" : "flippers on: in you go" };
  };

  /* ---------------- the kick course ---------------- */
  M.keeper = function (game, k, at) {
    var g = q(game).golf, w = game.world, r = SB.rng(((game.seed | 0) ^ 0x601f) + (g.set || 0) * 7), n = 0;
    at = at || k;
    for (var t = 0; t < 40 && n < 3; t++) {
      var a = r() * 6.283, d = 7 + r() * 7, x = at.x + Math.sin(a) * d, z = at.z + Math.cos(a) * d;
      if (!w0(w, x, z) || W.depthAt(w, x, z) > 0.05) continue;
      W.addStructure(w, game, "kickflag", x, z, { done: true, rot: 0 }); n++;
    }
    if (n) { g.keeper = k.id; g.set = (g.set || 0) + 1; k.kickKeeper = 1; LW = null; emit("kickCourse", { c: k, n: n }); }
    return n;
  };
  // 4.47: asking for one. the look-at button it was offered on is never free on a smol in the full game (friends.js
  // puts "ask X..." there), so the bag's friends tab asks too, under "ask X", when the body carries a ball
  M.askCourse = function (game, c, k) {
    if (!game || !c || !k || k.species !== "smol" || !k.alive) return { ok: false, msg: "nobody to ask" };
    if (!(k.tier >= 2)) return { ok: false, msg: k.name + " is too little to keep a course" };
    if (!Sv().has(c, "ball")) return { ok: false, msg: "bring a ball first" };
    var g = q(game).golf, d = Math.floor((game.time || 0) / SB.DAY_LENGTH);
    if (g.askD === d) return { ok: false, msg: "one new course a day is plenty" };
    var n = M.keeper(game, k, c);
    if (!n) return { ok: false, msg: "no room for a course here" };
    g.askD = d;
    return { ok: true, n: n, msg: k.name + " put up " + n + " flags ⛳ kick a ball to each" };
  };
  function kicked(d) {
    var s = ps(), it = d && d.it;
    if (!s || !it || it.kind !== "ball") return;
    var g = q(s.game).golf, pw = 4 + clamp(s.pitch + 0.3, 0, 1) * 5;
    W.toss(it, -Math.sin(s.yaw) * pw, -Math.cos(s.yaw) * pw, 2 + clamp(s.pitch + 0.2, 0, 1) * 5);
    lists(s.game.world);
    if (FL.length) { g.kicks++; g.ball = it.id; }
  }
  function golfTick(game) {
    var g = q(game).golf, b = g.ball != null ? SB.Game.byId(game, g.ball) : null;
    if (!b || b.gone || b.onGround === false || b.heldBy != null) return;
    lists(game.world);
    for (var i = 0; i < FL.length; i++) {
      var f = FL[i];
      if (f.id === g.last || SB.dist(f.x, f.z, b.x, b.z) > 1.1) continue;
      g.holes++; g.last = f.id; if (!g.best || g.kicks < g.best) g.best = g.kicks;
      say("⛳ in! " + g.kicks + (g.kicks === 1 ? " kick" : " kicks")); snd("achievement");
      var s = ps(); if (s && SB.Chem) SB.Chem.apply(s.c.chem, { bored: -0.3 });
      emit("kickHole", { kicks: g.kicks, holes: g.holes });
      g.kicks = 0; g.ball = null;
      return;
    }
  }

  var tA = 0, tB = 0;
  function tick(game, dt) {
    if (!game || !game.world) return;
    var s = ps(), c = s && s.game === game ? s.c : null;
    if (M.rides.length) rideTick(game, dt);
    if (c && !s.dead) {
      air(game, c, s, dt);
      if (s.m3lock != null) lockTick(game, c, s, dt);
      if (c.carriedBy != null || s.m3wr) jail(game, c, s, dt);
    }
    if ((tA -= dt) <= 0) {
      tA = 0.5;
      if (q(game).golf.ball != null) golfTick(game);
      if (c) fins(c);
      lists(game.world);
      // a smol standing at the top of a slide goes down it (drop one there from the sky)
      for (var i = 0; i < SL.length; i++) W.creaturesNear(game.world, game, SL[i].x, SL[i].z, 1.2, function (o) {
        if (o.species === "smol" && o.alive && !o._pov && !o.heldBy && o.onGround !== false && !(game.time - o._m3r < 20)) M.useSlide(game, o, SL[i]);
      });
    }
    if ((tB -= dt) <= 0) {
      tB = 8;
      var cs = game.creatures, g = q(game).golf, t3 = [];
      for (var j = 0; j < cs.length; j++) { var o = cs[j]; if (o.m3flip || o.m3fin) fins(o); if (o.species === "smol" && o.alive && o.tier >= 3 && !o._pov && !o.stranger) t3.push(o); }
      // a tribe with a few grown smols gets a keeper, who sets a course up by the nest
      if (g.keeper == null && t3.length >= 4 && K.ball) {
        var nest = game.world.T && game.world.T.nest;
        if (M.keeper(game, t3[0], nest || t3[0]) && SB.Game.note) SB.Game.note(game, t3[0].name + " set up a kick course ⛳ bring a ball");
      }
    }
  }

  /* ---------------- buttons in a body ---------------- */
  function options(game, c, r, o, x) {
    if (c.captive != null) { o.use = x.op("slip the ropes", function () { return M.slip(game, c); }, null); return; }
    if (M.riding(c)) return;
    if (r && r.type === "struct" && r.ref.done) {
      var st = r.ref;
      if (st.kind === "lift") o.use = x.op("ride the rope lift", function () { return M.useLift(game, c, st); }, null);
      else if (st.kind === "slide") o.use = x.op("slide down", function () { return M.useSlide(game, c, st); }, null);
      else if (st.kind === "kickflag") { var g = q(game).golf; o.use = x.no("kick a ball here" + (g.best ? " · best " + g.best : "")); }
    }
    if (r && r.type === "creature" && !o.pick) {
      var cr = r.ref;
      if (cr.species === "grump") o.pick = x.op(x.state && x.state.m3lock === cr.id ? "let go of the lock" : "lock on", function () { return M.lock(cr); }, null);
      else if (cr.species === "smol" && cr.tier >= 2 && x.hk === "ball") o.pick = x.op("ask " + cr.name + " for a kick course", function () { var a = M.askCourse(game, c, cr); x.say(a.msg); return a.ok; }, null);
    }
    if (x.hk === "cart" && !(r && r.type === "creature")) o.place = c.tier >= 5 ? x.op("roll along the trail", function () { var ok = M.roll(game, c, x.state ? x.state.yaw : c.facing + Math.PI); if (!ok) x.say("stand on a trail first"); return ok; }, null) : x.no("only a thinker can drive a cart");
  }
  function key(game, c, k, down) {
    var s = ps();
    if (!down || !s) return false;
    if (k === "v") { M.third(); return true; }
    if (k === "t") { var t = s.target && SB.Creature.resolve(game, s.target); if (s.m3lock != null) s.m3lock = null; else if (t && t.type === "creature" && t.ref.species === "grump") M.lock(t.ref); else return false; return true; }
    return false;
  }
  function vitals(game, c) {
    var s = ps(), out = [];
    if (!s || s.c !== c) return out;
    if (s.m3lock != null) out.push({ icon: "🎯", text: "locked" });
    if (s.m3wr) out.push({ icon: "💪", text: "wriggle " + Math.round(s.m3wr * 100) + "%", bad: true });
    if (s.m3air) out.push({ icon: "🪽", text: s.m3air });
    return out;
  }

  /* ---------------- the camera: over the shoulder, and the spear's follow shot ---------------- */
  M.third = function (on) { var s = ps(); if (!s) return false; s.third = on == null ? !s.third : !!on; return s.third; };
  M.cam = function (s, pov, dt) {
    var kc = s.m3kc, w = s.game.world, k;
    pov.third = false;
    if (kc) {
      kc.t += dt;
      if (kc.t >= kc.dur) s.m3kc = null;
      else {
        k = SB.smooth(kc.t / (kc.dur * 0.6)) * SB.smooth((kc.dur - kc.t) / (kc.dur * 0.25));
        pov.x += (kc.x - pov.x) * k; pov.y += (kc.y - pov.y) * k; pov.z += (kc.z - pov.z) * k; pov.third = k > 0.15;
        return;
      }
    }
    k = s.m3k = (s.m3k || 0) + ((s.third ? 1 : 0) - (s.m3k || 0)) * Math.min(1, dt * 6);
    if (k < 0.02) return;
    var cp = Math.cos(pov.pitch), sy = Math.sin(pov.yaw), cy = Math.cos(pov.yaw), d = 2.6 * k;
    var x = pov.x + sy * cp * d + cy * 0.55 * k, z = pov.z + cy * cp * d - sy * 0.55 * k, y = pov.y - Math.sin(pov.pitch) * d + 0.35 * k;
    pov.x = x; pov.z = z; pov.y = Math.max(y, W.groundY(w, x, z) + 0.3); pov.third = k > 0.3;
  };
  function shotCam(tx, ty, tz) {
    var s = ps();
    if (!s || SB.dist(tx, tz, s.c.x, s.c.z) < 3) return;
    var a = Math.atan2(s.c.x - tx, s.c.z - tz);
    s.m3kc = { x: tx + Math.sin(a) * 1.8, y: ty + 0.9, z: tz + Math.cos(a) * 1.8, t: 0, dur: 1.2 };
  }
  if (SB.bus) {
    SB.bus.on("spearThrown", function (d) { var s = ps(); if (s && d && d.c === s.c && d.g) shotCam(d.g.x, d.g.y || 0, d.g.z); });
    SB.bus.on("kick", kicked);
    SB.bus.on("unpossess", function (d) { M.rides = M.rides.filter(function (r) { return !d || r.c !== d.c; }); });
  }

  /* ---------------- the sky: glow, sketch, glyph, stars ---------------- */
  M.glowOf = function (o, t) { return 0.5 + 0.9 * (0.5 + 0.5 * Math.sin(t * 4 + (o.id || 0))); };
  var glow = [], tG = 0;
  M.glowing = function (game) {
    var s = ps(), h = game.hand, x, z, r, out = [];
    if (s) { x = s.c.x; z = s.c.z; r = 7; } else if (h && h.visible) { x = h.x; z = h.z; r = 5; } else return out;
    W.itemsNear(game.world, x, z, r, function (o) { if (!o.gone && o.heldBy == null && o.onGround !== false && out.length < 20) out.push(o); });
    return out;
  };
  M.sketching = false;
  var stroke = null;
  M.sketchAt = function (game, x, z, start) {
    var sk = q(game).sketch, n = 0;
    if (start || !stroke || sk.indexOf(stroke) < 0) { stroke = []; sk.push(stroke); }
    for (var i = 0; i < sk.length; i++) n += sk[i].length;
    if (n >= 800) sk.shift();
    var l = stroke.length;
    if (l && SB.dist(stroke[l - 2], stroke[l - 1], x, z) < 0.35) return false;
    stroke.push(Math.round(x * 10) / 10, Math.round(z * 10) / 10);
    return true;
  };
  M.rub = function (game) { q(game).sketch = []; stroke = null; };
  // skills as star shapes: nine shapes round the night sky, one star lit per level
  M.stars = function (c) {
    var B = SB.Body, out = [];
    if (!B || !B.SKILLS || !c) return out;
    B.SKILLS.forEach(function (sk, i) {
      var lv = B.level(c, sk.id), az = i * 0.698, el = 0.6 + (i % 3) * 0.17, pts = [];
      for (var j = 0; j < 5; j++) pts.push({ az: az + (SB.hash(i, j, 31) - 0.5) * 0.26, el: el + (SB.hash(i, j, 57) - 0.5) * 0.2, lit: j < lv });
      out.push({ id: sk.id, emoji: sk.emoji, level: lv, pts: pts });
    });
    return out;
  };
  M.glyph = function (game) {
    var h = game && game.hand;
    if (!h || h.hoverId == null || ps()) return "";
    return h.tool === "tickle" ? "😇" : h.tool === "tap" ? "😈" : "";
  };
  if (R() && R().addHook) {
    R().addHook(function (game, alpha, dt) {
      if (!game || !game.world) return;
      var Rr = R(), t = Rr.time ? Rr.time() : 0, i, j;
      if ((tG -= dt || 0.016) <= 0) { tG = 0.4; glow = M.glowing(game); }
      for (i = 0; i < glow.length; i++) { var o = glow[i]; if (!o.gone && o.heldBy == null) Rr.instTRS("s:ring", o.x, o.y + 0.04, o.z, 0, (o.r || 0.15) * 1.7, [1, 0.93, 0.55], [0, M.glowOf(o, t), 0]); }
      var sk = game.quests && game.quests.motion3 && game.quests.motion3.sketch, cm = Rr.camera;
      if (sk && sk.length && cm) for (i = 0; i < sk.length; i++) for (j = 0; j < sk[i].length; j += 2) {
        var x = sk[i][j], z = sk[i][j + 1];
        if (Math.abs(x - cm.x) > cm.halfW + 4 || Math.abs(z - cm.z) > cm.halfH * 2 + 4) continue;
        Rr.instTRS("s:ring", x, W.groundY(game.world, x, z) + 0.05, z, 0, 0.13, [1, 1, 1], [0, 0.8, 0]);
      }
    });
    if (R().addOverlay) R().addOverlay(function (cx, w, h, game) {
      if (!game || !game.world) return;
      var g = M.glyph(game), hd = game.hand, s = ps(), cm = R().camera, o = {}, i, j;
      if (g && hd.sx != null) { cx.font = "22px sans-serif"; cx.textAlign = "center"; cx.fillText(g, hd.sx + 18, hd.sy - 14); }
      if (!s || !cm || !cm.pov || !game.world.night) return;
      var st = M.stars(s.c);
      for (i = 0; i < st.length; i++) {
        var px = null, py = 0;
        cx.strokeStyle = "rgba(255,240,190,0.35)"; cx.beginPath();
        for (j = 0; j < 5; j++) {
          var p = st[i].pts[j], ce = Math.cos(p.el);
          R().project(cm.eye[0] + Math.sin(p.az) * ce * 60, cm.eye[1] + Math.sin(p.el) * 60, cm.eye[2] + Math.cos(p.az) * ce * 60, o);
          if (!o.on || o.z > 1) { px = null; continue; }
          cx.fillStyle = p.lit ? "#fff3c0" : "rgba(255,255,255,0.3)";
          cx.fillRect(o.x - (p.lit ? 2 : 1), o.y - (p.lit ? 2 : 1), p.lit ? 4 : 2, p.lit ? 4 : 2);
          if (p.lit) { if (px != null) { cx.moveTo(px, py); cx.lineTo(o.x, o.y); } px = o.x; py = o.y; }
          if (!j && st[i].level) { cx.font = "12px sans-serif"; cx.textAlign = "center"; cx.fillText(st[i].emoji, o.x, o.y - 8); }
        }
        cx.stroke();
      }
    });
  }

  /* ---------------- the sky hand's menu ---------------- */
  function doc() { return typeof document !== "undefined" && typeof document.createElement === "function" && document.body ? document : null; }
  var box = null, boxT = null, dn = null;
  function close() {
    if (M._run) M._run.stop();
    if (boxT) clearTimeout(boxT);
    if (box && box.parentNode) box.parentNode.removeChild(box);
    box = null; boxT = null;
  }
  M.close = close;
  function open(cx, cy, ms) {
    var d = doc(); close();
    if (!d) return null;
    box = d.createElement("div");
    box.style.cssText = "position:fixed;z-index:60;max-width:240px;padding:5px;border-radius:10px;background:rgba(20,24,34,.88);color:#fff;font-size:13px;display:flex;flex-wrap:wrap;gap:4px;left:" +
      clamp(cx - 60, 4, (window.innerWidth || 400) - 244) + "px;top:" + clamp(cy + 18, 4, (window.innerHeight || 600) - 270) + "px";
    d.body.appendChild(box);
    if (ms) boxT = setTimeout(close, ms);
    return box;
  }
  M.slateFor = function (game, c) {
    var out = [["king", "acorn king"], ["ride", "log ride"]], s = q(game);
    if (M.canGrab(game)) out.push(["grab", "prize grab"]);
    if (c && SB.Embers && SB.Embers.count && SB.Embers.count(game) > (s.dreams || 0)) out.push(["dream", "ember dream"]);
    // 4.49: the wreck you can stand at is a crashed pod that has been opened. The slate asked for a site of kind "wreck",
    // and those are made hidden and never shown, so "inside the wreck" was never offered on any island
    if (c && (game.sites || []).some(function (t) { return ((t.kind === "wreck" && t.found) || (t.kind === "pod" && t.done && !t.gone)) && SB.dist(t.x, t.z, c.x, c.z) < 8; })) out.push(["ark", "inside the wreck"]);
    return out;
  };
  // what the hand can do to the thing it tapped: [{label, go}] (go returns true to keep the menu open)
  M.menuFor = function (game, hit, g, cx, cy) {
    var out = [], ref = hit && hit.ref, C = SB.Creature;
    function add(label, go) { out.push({ label: label, go: go }); }
    function sketch() { add(M.sketching ? "done sketching" : "✏ sketch a plan", function () { M.sketching = !M.sketching; stroke = null; }); if (q(game).sketch.length) add("rub it out", function () { M.rub(game); }); }
    if (!hit) { if (M.sketching || q(game).sketch.length) sketch(); return out; }
    if (hit.type === "creature") {
      if (ref.species === "smol") add("😇 tickle", function () { C.tickle(ref, game); });
      add("😈 scold", function () { C.tap(ref, game); });
      add("follow", function () { if (SB.Input && SB.Input.follow) SB.Input.follow(ref); });
      if (ref.species === "smol" && P() && !P().canEnter(game, ref)) add("step in", function () { P().enter(game, ref); });
    } else if (hit.type === "item") {
      add("🔍 look closer", function () { M.look3(game, ref.kind, cx, cy); return true; });
      if ((ref.kind === "ball" || ref.noun === "toy") && M.canGrab(game)) add("prize grab", function () { M.slate(game, null, cx, cy, "grab"); return true; });
    } else if (hit.type === "struct") {
      if (ref.done && (ref.kind === "hall" || ref.kind === "school")) add("🪨 play the slate", function () { M.slate(game, null, cx, cy); return true; });
      sketch();
    } else sketch();
    return out;
  };
  M.menuAt = function (game, sx, sy, touch, cx, cy) {
    var IN = SB.Input, hit = IN && IN.pick ? IN.pick(sx, sy, { touch: touch }) : null, g = R() && R().pickGround ? R().pickGround(sx, sy) : null;
    var items = M.menuFor(game, hit, g, cx, cy), b = items.length ? open(cx, cy, 6000) : (close(), null);
    if (b) items.forEach(function (it) {
      var bt = doc().createElement("button");
      bt.className = "btn"; bt.textContent = it.label;
      bt.addEventListener("click", function () { if (!it.go()) close(); });
      b.appendChild(bt);
    });
    return items;
  };
  // input.js hands every pointer on the island here first (capture). It only listens, except while sketching.
  M.ptr = function (type, pt, e) {
    var IN = SB.Input, game = SB.Game && SB.Game.current, now = Date.now();
    if (!IN || IN.mode !== "god" || !game || !game.hand) return;
    if (M.sketching) {
      var g = (type === "down" || stroke) && R() && R().pickGround ? R().pickGround(pt.x, pt.y) : null;
      if (type === "down") { if (e.stopImmediatePropagation) e.stopImmediatePropagation(); dn = { x: pt.x, y: pt.y, t: now, far: 0 }; if (g) M.sketchAt(game, g.x, g.z, true); }
      else if (type === "move" && dn && g) { dn.far = Math.max(dn.far, Math.hypot(pt.x - dn.x, pt.y - dn.y)); M.sketchAt(game, g.x, g.z); }
      else if (type === "up" && dn) { if (dn.far < 8) M.menuAt(game, pt.x, pt.y, e.pointerType === "touch", e.clientX, e.clientY); dn = null; stroke = null; }
      return;
    }
    if (type === "down") { close(); dn = { x: pt.x, y: pt.y, t: now }; }
    else if (type === "move") { if (dn && Math.hypot(pt.x - dn.x, pt.y - dn.y) > 10) dn = null; }
    else if (dn) {
      var ok = now - dn.t < 400 && game.hand.tool === "grab" && !(SB.UI && SB.UI.armed);
      dn = null;
      if (ok) M.menuAt(game, pt.x, pt.y, e.pointerType === "touch", e.clientX, e.clientY);
    }
  };

  /* ---------------- a big turning model ---------------- */
  // the item's own mesh, turned by ang and drawn flat: [[x1, y1, x2, y2, x3, y3, depth, r, g, b]] far ones first
  M.spin = function (kind, ang, size) {
    var m = ME && ME.itemMesh && K[kind] ? ME.itemMesh(kind) : null, out = [];
    if (!m || !m.data) return out;
    var a = m.data, S = ME.STRIDE || 12, n = m.count - m.count % 3, step = n > 1800 ? 3 * Math.ceil(n / 1800) : 3;
    var ca = Math.cos(ang), sa = Math.sin(ang), mid = (m.minY + m.maxY) / 2, sc = size * 0.42 / Math.max(m.rad, (m.maxY - m.minY) / 2, 0.01);
    for (var i = 0; i + 2 < n; i += step) {
      var t = [], z = 0;
      for (var k = 0; k < 3; k++) { var o = (i + k) * S, x = a[o] * ca + a[o + 2] * sa, d = -a[o] * sa + a[o + 2] * ca; t.push(size / 2 + x * sc, size / 2 - (a[o + 1] - mid) * sc + d * sc * 0.25); z += d; }
      o = i * S;
      var nx = a[o + 3] * ca + a[o + 5] * sa, nz = -a[o + 3] * sa + a[o + 5] * ca, li = clamp(0.55 + 0.3 * a[o + 4] + 0.25 * nx + 0.2 * nz, 0.3, 1.15);
      t.push(z / 3, a[o + 6] * li, a[o + 7] * li, a[o + 8] * li);
      out.push(t);
    }
    out.sort(function (p, r) { return p[6] - r[6]; });
    return out;
  };
  function paint(cx, tris, size) {
    cx.clearRect(0, 0, size, size);
    for (var i = 0; i < tris.length; i++) {
      var t = tris[i];
      cx.fillStyle = "rgb(" + (clamp(t[7], 0, 1) * 255 | 0) + "," + (clamp(t[8], 0, 1) * 255 | 0) + "," + (clamp(t[9], 0, 1) * 255 | 0) + ")";
      cx.beginPath(); cx.moveTo(t[0], t[1]); cx.lineTo(t[2], t[3]); cx.lineTo(t[4], t[5]); cx.fill();
    }
  }
  M.look3 = function (game, kind, cx, cy) {
    var b = open(cx, cy), k = K[kind];
    if (!b || !k) return false;
    b.innerHTML = "<canvas width='170' height='170' style='width:170px;height:170px'></canvas><div style='width:100%'><b>" + esc((k.emoji || "") + " " + k.label) + "</b><br>" + esc(k.desc || "") + "</div>";
    var cv = b.firstChild, c2 = cv.getContext && cv.getContext("2d"), me = b, a = 0;
    b.addEventListener("click", close);
    function loop() { if (box !== me || !c2) return; a += 0.03; paint(c2, M.spin(kind, a, 170), 170); requestAnimationFrame(loop); }
    loop();
    return true;
  };

  /* ---------------- the slate: four tiny games ---------------- */
  // each: init(seed) -> state, step(state, dt, {dx, dy, a}), draw(ctx, state, w, h). state.over ends it, state.win is a win.
  function bg(cx, w, h, col) { cx.fillStyle = col; cx.fillRect(0, 0, w, h); cx.textAlign = "left"; cx.font = "13px sans-serif"; }
  function dot(cx, x, y, r, col) { cx.fillStyle = col; cx.beginPath(); cx.arc(x, y, r, 0, 6.3); cx.fill(); }
  var G = M.GAMES = {};
  // acorn king: grumps walk in from the edges, you lob acorns at the nearest one by yourself. chase off 25
  G.king = {
    name: "acorn king", goal: 25,
    init: function (seed) { return { r: SB.rng(seed), x: 0.5, y: 0.5, hp: 3, t: 0, sh: 0, sp: 1, g: [], a: [], score: 0 }; },
    step: function (s, dt, i) {
      var k, j, o, d;
      s.t += dt; s.x = clamp(s.x + i.dx * dt * 0.5, 0.05, 0.95); s.y = clamp(s.y + i.dy * dt * 0.5, 0.05, 0.95);
      if ((s.sp -= dt) <= 0) { s.sp = Math.max(0.3, 1 - s.t * 0.03); k = s.r() * 4 | 0; d = s.r(); s.g.push(k < 2 ? { x: d, y: k } : { x: k - 2, y: d }); }
      if ((s.sh -= dt) <= 0 && s.g.length) {
        o = s.g.reduce(function (b, e) { return !b || Math.hypot(e.x - s.x, e.y - s.y) < Math.hypot(b.x - s.x, b.y - s.y) ? e : b; }, null);
        d = Math.hypot(o.x - s.x, o.y - s.y) || 1; s.a.push({ x: s.x, y: s.y, vx: (o.x - s.x) / d * 0.9, vy: (o.y - s.y) / d * 0.9, t: 1.6 }); s.sh = 0.8;
      }
      for (k = s.a.length - 1; k >= 0; k--) {
        o = s.a[k]; o.x += o.vx * dt; o.y += o.vy * dt;
        if ((o.t -= dt) <= 0) { s.a.splice(k, 1); continue; }
        for (j = s.g.length - 1; j >= 0; j--) if (Math.hypot(s.g[j].x - o.x, s.g[j].y - o.y) < 0.05) { s.g.splice(j, 1); s.a.splice(k, 1); s.score++; break; }
      }
      for (k = s.g.length - 1; k >= 0; k--) {
        o = s.g[k]; d = Math.hypot(s.x - o.x, s.y - o.y) || 1; j = (0.2 + s.t * 0.006) * dt; o.x += (s.x - o.x) / d * j; o.y += (s.y - o.y) / d * j;
        if (d < 0.05) { s.g.splice(k, 1); s.hp--; }
      }
      if (s.hp <= 0) s.over = true; else if (s.score >= G.king.goal) { s.over = true; s.win = true; }
    },
    draw: function (cx, s, w, h) {
      bg(cx, w, h, "#d8c690");
      s.g.forEach(function (o) { cx.fillStyle = "#7a3b2e"; cx.fillRect(o.x * w - 7, o.y * h - 7, 14, 14); });
      s.a.forEach(function (o) { dot(cx, o.x * w, o.y * h, 3, "#5a3a1c"); });
      dot(cx, s.x * w, s.y * h, 8, "#ffd75a");
      cx.fillStyle = "#333"; cx.fillText("♥♥♥".slice(0, s.hp) + "  " + s.score + "/" + G.king.goal, 6, 16);
    }
  };
  // log ride: the river runs by itself; tap to hop the rocks. 15 rocks is a win
  G.ride = {
    name: "log ride", goal: 15,
    init: function (seed) { var r = SB.rng(seed), o = [], x = 1.2; for (var i = 0; i < 40; i++) { o.push(x); x += 0.55 + r() * 0.6; } return { y: 0, vy: 0, d: 0, sp: 0.55, obs: o, score: 0 }; },
    step: function (s, dt, i) {
      if (i.a && s.y === 0) s.vy = 1.5;
      s.vy -= 4.5 * dt; s.y = Math.max(0, s.y + s.vy * dt); if (s.y === 0) s.vy = 0;
      s.d += s.sp * dt; s.sp += dt * 0.012;
      while (s.obs.length && s.obs[0] < s.d + 0.16) { s.obs.shift(); s.score++; }
      if (s.obs.length && Math.abs(s.obs[0] - s.d - 0.2) < 0.045 && s.y < 0.1) s.over = true;
      if (s.score >= G.ride.goal) { s.over = true; s.win = true; }
    },
    draw: function (cx, s, w, h) {
      bg(cx, w, h, "#bfe3f2"); cx.fillStyle = "#3f8fc4"; cx.fillRect(0, h * 0.7, w, h * 0.3);
      cx.fillStyle = "#8a8f98"; s.obs.forEach(function (o) { var x = (o - s.d) * w; if (x < w) { cx.beginPath(); cx.moveTo(x - 9, h * 0.72); cx.lineTo(x, h * 0.72 - 20); cx.lineTo(x + 9, h * 0.72); cx.fill(); } });
      cx.fillStyle = "#8a5a35"; cx.fillRect(w * 0.2 - 16, h * 0.7 - 8 - s.y * h, 32, 10); dot(cx, w * 0.2, h * 0.7 - 15 - s.y * h, 7, "#ffd75a");
      cx.fillStyle = "#333"; cx.fillText(s.score + "/" + G.ride.goal, 6, 16);
    }
  };
  // prize grab: the claw sweeps; tap to drop it. three goes
  M.PRIZES = ["ball", "shell", "feather", "honey", "berry", "acorn", "gem", "stick"];
  G.grab = {
    name: "prize grab",
    init: function (seed) {
      var r = SB.rng(seed), ks = M.PRIZES.filter(function (k) { return K[k]; }), pr = [];
      for (var i = 0; i < 5; i++) pr.push({ x: 0.15 + i * 0.175, k: ks[r() * ks.length | 0] || "stick" });
      return { x: 0.5, dir: 1, y: 0, ph: 0, tries: 3, pr: pr, got: null, score: 0 };
    },
    step: function (s, dt, i) {
      if (s.ph === 0) {
        s.x += (i.dx ? i.dx : s.dir) * dt * 0.45;
        if (s.x > 0.95) { s.x = 0.95; s.dir = -1; } else if (s.x < 0.05) { s.x = 0.05; s.dir = 1; }
        if (i.a) s.ph = 1;
      } else if (s.ph === 1) {
        if ((s.y += dt * 1.3) >= 1) { s.y = 1; s.ph = 2; for (var k = 0; k < s.pr.length; k++) if (Math.abs(s.pr[k].x - s.x) < 0.06) { s.got = s.pr[k].k; s.pr.splice(k, 1); break; } }
      } else if ((s.y -= dt * 1.3) <= 0) {
        s.y = 0; s.ph = 0;
        if (s.got) { s.over = true; s.win = true; s.score = 1; } else if (--s.tries <= 0) s.over = true;
      }
    },
    draw: function (cx, s, w, h) {
      bg(cx, w, h, "#2c3350"); cx.font = "20px sans-serif"; cx.textAlign = "center";
      s.pr.forEach(function (p) { cx.fillText(K[p.k].emoji || "?", p.x * w, h - 12); });
      var y = 14 + s.y * (h - 50);
      cx.strokeStyle = "#ddd"; cx.beginPath(); cx.moveTo(s.x * w, 0); cx.lineTo(s.x * w, y); cx.moveTo(s.x * w - 10, y + 10); cx.lineTo(s.x * w, y); cx.lineTo(s.x * w + 10, y + 10); cx.stroke();
      if (s.got) cx.fillText(K[s.got].emoji || "?", s.x * w, y + 26);
      cx.font = "13px sans-serif"; cx.textAlign = "left"; cx.fillStyle = "#fff"; cx.fillText("goes: " + s.tries, 6, 16);
    }
  };
  // a short level to walk: nine by nine, pillars to go round, five lights to find, one slow shade
  function walker(name, floor, wall, light) {
    return {
      name: name, goal: 5,
      init: function (seed) {
        var r = SB.rng(seed), wi = [];
        while (wi.length < 5) { var x = (r() * 5 | 0) * 2 + 0.5, y = (r() * 5 | 0) * 2 + 0.5; if ((x > 1 || y > 1) && !wi.some(function (o) { return o.x === x && o.y === y; })) wi.push({ x: x, y: y }); }
        return { x: 0.5, y: 0.5, sx: 8.5, sy: 8.5, wi: wi, score: 0, t: 0 };
      },
      step: function (s, dt, i) {
        var nx = clamp(s.x + i.dx * dt * 3, 0.3, 8.7), ny = clamp(s.y + i.dy * dt * 3, 0.3, 8.7);
        function blocked(x, y) { return (x | 0) % 2 === 1 && (y | 0) % 2 === 1; }
        if (!blocked(nx, s.y)) s.x = nx;
        if (!blocked(s.x, ny)) s.y = ny;
        s.t += dt;
        var d = Math.hypot(s.x - s.sx, s.y - s.sy) || 1;
        s.sx += (s.x - s.sx) / d * dt * 0.9; s.sy += (s.y - s.sy) / d * dt * 0.9;
        for (var k = s.wi.length - 1; k >= 0; k--) if (Math.hypot(s.wi[k].x - s.x, s.wi[k].y - s.y) < 0.55) { s.wi.splice(k, 1); s.score++; }
        if (d < 0.5) s.over = true; else if (!s.wi.length) { s.over = true; s.win = true; }
      },
      draw: function (cx, s, w, h) {
        var u = w / 9, v = h / 9, i, j;
        bg(cx, w, h, floor); cx.fillStyle = wall;
        for (i = 1; i < 9; i += 2) for (j = 1; j < 9; j += 2) cx.fillRect(i * u + 2, j * v + 2, u - 4, v - 4);
        s.wi.forEach(function (o) { dot(cx, o.x * u, o.y * v, 5 + Math.sin(s.t * 5), light); });
        dot(cx, s.sx * u, s.sy * v, 9, "rgba(20,10,40,.8)"); dot(cx, s.x * u, s.y * v, 7, "#ffd75a");
        cx.fillStyle = "#fff"; cx.fillText(s.score + "/5", 6, 16);
      }
    };
  }
  G.dream = walker("ember dream", "#3a2550", "#59407a", "#ffb35a");
  G.ark = walker("inside the wreck", "#39424a", "#6b7780", "#8fe3ff");
  function day(game) { return Math.floor((game.time || 0) / 600); }
  M.canGrab = function (game) { return q(game).grabDay !== day(game); };
  // a game is over: best scores, and what a win is worth. returns the line to show
  M.finish = function (game, c, id, st) {
    var s = q(game), g = G[id], msg = st.win ? "you did it!" : "so close. again?";
    if (!g) return "";
    if (!(s.best[id] >= st.score)) s.best[id] = st.score;
    if (c && c.chem && SB.Chem) SB.Chem.apply(c.chem, { bored: -0.3 });
    if (id === "grab") {
      s.grabDay = day(game);
      if (st.win && K[st.got]) {
        if (c && c._pov) Sv().add(c, st.got, 1); else if (Sv().spawn && game.hand) Sv().spawn(game, st.got, 1, game.hand.x || (c ? c.x : 0), game.hand.z || (c ? c.z : 0));
        msg = "you grabbed a " + K[st.got].label + "! " + (K[st.got].emoji || "");
      } else msg = "it slipped. come back tomorrow";
    } else if (st.win && id === "dream") {
      s.dreams = (s.dreams || 0) + 1;
      var B = SB.Body, sk = B && B.SKILLS ? B.SKILLS[(s.dreams - 1) % B.SKILLS.length] : null;
      if (sk && c) { B.xp(c, sk.id, 40); msg = "the ember showed you something: " + sk.label + " comes easier now"; }
    } else if (st.win && id === "ark") {
      s.ark = (s.ark || 0) + 1;
      if (c && SB.Body) SB.Body.xp(c, "craft", 20);
      msg = "bunks for four thousand, all empty. you remember how things were made";
    }
    if (st.win) snd("achievement");
    emit("m3game", { id: id, win: !!st.win, score: st.score });
    return msg;
  };
  M.play = function (game, c, id, cv, done) {
    var g = G[id];
    if (!g || !cv || !cv.getContext || typeof requestAnimationFrame !== "function") return null;
    var cx = cv.getContext("2d"), st = g.init(((game.seed | 0) ^ 0x51a7e) + (Date.now() & 0xffff)), inp = { dx: 0, dy: 0, a: false }, last = 0, run = { st: st };
    function at(e) { var r = cv.getBoundingClientRect(); inp.dx = clamp(((e.clientX - r.left) / r.width - 0.5) * 3, -1, 1); inp.dy = clamp(((e.clientY - r.top) / r.height - 0.5) * 3, -1, 1); }
    function down(e) { at(e); inp.a = true; e.preventDefault(); }
    function move(e) { if (e.buttons || e.pointerType === "touch") at(e); }
    function up() { inp.dx = inp.dy = 0; }
    function key(e) {
      var k = e.key.toLowerCase(), d = e.type === "keydown" ? 1 : 0;
      if (k === "arrowleft" || k === "a") inp.dx = -d; else if (k === "arrowright" || k === "d") inp.dx = d;
      else if (k === "arrowup" || k === "w") inp.dy = -d; else if (k === "arrowdown" || k === "s") inp.dy = d;
      else if (k === " ") { if (d) inp.a = true; } else return;
      e.preventDefault(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }
    run.stop = function () {
      if (M._run === run) M._run = null;
      cv.removeEventListener("pointerdown", down); cv.removeEventListener("pointermove", move); cv.removeEventListener("pointerup", up);
      window.removeEventListener("keydown", key, true); window.removeEventListener("keyup", key, true);
    };
    function loop(t) {
      if (M._run !== run) return;
      if (cv.isConnected === false) { run.stop(); return; }
      var dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016; last = t;
      g.step(st, dt, inp); inp.a = false; g.draw(cx, st, cv.width, cv.height);
      if (st.over) { run.stop(); var msg = M.finish(game, c, id, st); if (done) done(msg); return; }
      requestAnimationFrame(loop);
    }
    if (M._run) M._run.stop();
    M._run = run;
    cv.style.touchAction = "none";
    cv.addEventListener("pointerdown", down); cv.addEventListener("pointermove", move); cv.addEventListener("pointerup", up);
    window.addEventListener("keydown", key, true); window.addEventListener("keyup", key, true);
    requestAnimationFrame(loop);
    return run;
  };
  M.slateHtml = function (game, c) {
    var s = q(game);
    return "<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>" + M.slateFor(game, c).map(function (g) { return "<button class='btn' data-m3play='" + g[0] + "'>" + esc(g[1]) + (s.best[g[0]] ? " · " + s.best[g[0]] : "") + "</button>"; }).join("") +
      "</div><canvas data-m3cv width='220' height='220' style='width:220px;height:220px;display:none;border-radius:8px;margin-top:4px'></canvas><div class='help' data-m3msg></div>";
  };
  M.slateWire = function (root, game, c, redraw, start) {
    var cv = root.querySelector("[data-m3cv]"), msg = root.querySelector("[data-m3msg]");
    function go(id) { if (!cv) return; cv.style.display = "block"; if (msg) msg.textContent = id === "ride" || id === "grab" ? "tap to " + (id === "ride" ? "hop" : "drop the claw") : "drag to move"; M.play(game, c, id, cv, function (m) { if (msg) msg.textContent = m; if (redraw && id === "grab") redraw(); }); }
    root.querySelectorAll("[data-m3play]").forEach(function (b) { b.addEventListener("click", function () { go(b.getAttribute("data-m3play")); }); });
    if (start) go(start);
  };
  M.slate = function (game, c, cx, cy, start) {
    var b = open(cx, cy);
    if (!b) return false;
    b.innerHTML = "<div>" + M.slateHtml(game, c) + "</div><button class='btn' data-m3x>✕</button>";
    b.querySelector("[data-m3x]").addEventListener("click", close);
    M.slateWire(b, game, c, null, start);
    return true;
  };

  /* ---------------- the moves tab ---------------- */
  M.html = function (game, c) {
    var s = ps(), out = "<div class='lbl'>on your belt</div><div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
    function btn(attr, id, text, why) { return "<button class='btn' data-m3" + attr + "='" + id + "'" + (why ? " disabled title='" + esc(why) + "'" : "") + ">" + esc(text) + (why ? " <small>(" + esc(why) + ")</small>" : "") + "</button>"; }
    [["vinerope", "m3rope"], ["flippers", "m3flip"]].forEach(function (b) { out += btn("belt", b[0], (c[b[1]] ? "take off the " : "put on the ") + K[b[0]].label, !c[b[1]] && !Sv().has(c, b[0]) ? "you have none" : ""); });
    out += "</div><div class='lbl'>make</div><div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
    for (var k in M.MAKE) if (k !== "vinerope" || !SB.Deep) out += btn("make", k, K[k].emoji + " " + K[k].label, M.whyNot(game, c, k));
    out += "</div><div class='lbl'>put down where you look</div><div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
    M.BUILD.forEach(function (b) { out += btn("put", b, SK[b].emoji + " " + SK[b].label, M.whyNot(game, c, b)); });
    out += "</div><div class='lbl'>view</div>" + btn("view", "1", s && s.third ? "back to your own eyes" : "look over your shoulder", "");
    if (M.wings(c)) out += "<div class='help'>" + (c.tier >= 6 ? "jump in the air to hover a moment. " : "") + "wings: jump again in the air to flutter, hold a direction to glide</div>";
    return out + "<div class='lbl'>the slate</div>" + M.slateHtml(game, c);
  };
  M.wire = function (root, game, c, redraw, tell) {
    function done(r) { if (r && r.msg && tell) tell(r.msg); if (r && r.ok) snd("craft"); redraw(); }
    function on(attr, fn) { root.querySelectorAll("[data-m3" + attr + "]").forEach(function (b) { b.addEventListener("click", function () { fn(b.getAttribute("data-m3" + attr)); }); }); }
    on("belt", function (k) { done(M.belt(game, c, k)); });
    on("make", function (k) { done(M.make(game, c, k)); });
    on("put", function (k) { done(M.place(game, c, k)); });
    on("view", function () { M.third(); redraw(); });
    M.slateWire(root, game, c, redraw);
  };
  if (SB.Ext) {
    SB.Ext.on("tick", tick);
    SB.Ext.on("options", options);
    SB.Ext.on("key", key);
    SB.Ext.on("vitals", vitals);
    SB.Ext.tab({ id: "motion3", label: "🪜 moves", show: function (game, c) { return !!game && !!c; }, html: M.html, wire: M.wire });
  }
  M._tick = tick;
})();
