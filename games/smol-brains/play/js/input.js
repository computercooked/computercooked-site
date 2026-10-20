/* smol brains 2 — input.js
   Touch first, mouse and keyboard too. One finger: drag empty ground to pan, drag a smol or a thing to
   carry and throw it, tap to use the current tool. Two fingers: pinch to zoom, twist to rotate.
   Mouse: wheel zooms at the cursor, right-drag (or shift-drag) rotates and tilts. Keys: WASD/arrows pan, Q/E rotate, R/V tilt,
   +/- zoom, 1-5 tools, space pause, [ ] speed, F follow, B brain, Esc closes things. */
(function () {
  "use strict";
  var SB = window.SB;
  var IN = (SB.Input = {});
  var R = SB.Render;
  var el = null, game = null;
  var ptrs = {}, nPtr = 0;
  var drag = null, pinch = null, keys = {}, lastTap = { t: 0, x: 0, y: 0 };
  var tickleRub = 0;

  IN.init = function (element, g) {
    el = element; game = g;
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", function (e) { keys[e.key.toLowerCase()] = false; });
    window.addEventListener("blur", function () { keys = {}; });
  };
  IN.setGame = function (g) { game = g; };

  /* ---------------- picking ---------------- */
  var pp = {};
  // the thing under a screen point: {type: "creature"|"item"|"struct"|"node", ref} or null
  IN.pick = function (sx, sy, opts) {
    opts = opts || {};
    var best = null, bd = 1e9, cam = R.camera, ppu = cam.pxPerUnit;
    function test(type, ref, x, y, z, rad, pri) {
      R.project(x, y, z, pp);
      if (!pp.on) return;
      var d = Math.hypot(pp.x - sx, pp.y - sy), lim = Math.max(opts.touch ? 26 : 16, rad * ppu * 1.25);
      if (d < lim && d - pri < bd) { bd = d - pri; best = { type: type, ref: ref }; }
    }
    var cs = game.creatures;
    for (var i = 0; i < cs.length; i++) { var c = cs[i]; if (!c.alive || c.far) continue; var r = SB.Creature.radius(c); test("creature", c, c.x, c.y + r * (1.2 + (c.look.legs ? 0.6 : 0)), c.z, r * 1.3, 30); }
    if (opts.creaturesOnly) return best;
    var its = game.world.items;
    for (i = 0; i < its.length; i++) { var o = its[i]; if (o.inBag && o.heldBy != null) continue; if (o.heldBy != null && o.heldBy !== "hand") continue; test("item", o, o.x, o.y + 0.15, o.z, Math.max(0.25, o.r * 1.5), 12); }
    if (opts.carryable) return best;
    var sts = game.world.structures;
    for (i = 0; i < sts.length; i++) { var s = sts[i]; test("struct", s, s.x, SB.World.heightAt(game.world, s.x, s.z) + 0.5, s.z, SB.STRUCTS[s.kind].r, 0); }
    var g = R.pickGround(sx, sy);
    if (g && !best) {
      var n = SB.World.nearestNode(game.world, g.x, g.z, 1.6);
      if (n) best = { type: "node", ref: n };
    }
    return best;
  };

  function local(e) {
    var r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function setHand(sx, sy, show) {
    var g = R.pickGround(sx, sy);
    var h = game.hand;
    if (!g) { h.visible = false; return null; }
    h.x = g.x; h.z = g.z; h.y = g.y + 1.0; h.visible = show !== false; h.marker = h.visible;
    h.sx = sx; h.sy = sy;
    return g;
  }

  /* ---------------- pointer events ---------------- */

  function down(e) {
    if (!game || (SB.UI && SB.UI.modalOpen)) return;
    el.setPointerCapture && el.setPointerCapture(e.pointerId);
    var p = local(e);
    ptrs[e.pointerId] = { x: p.x, y: p.y, x0: p.x, y0: p.y, t0: performance.now(), type: e.pointerType, button: e.button };
    nPtr = Object.keys(ptrs).length;
    SB.Audio && SB.Audio.init && SB.Audio.init();
    if (SB.UI && SB.UI.userActed) SB.UI.userActed();
    R.camera.vx = R.camera.vz = 0;
    if (R.camera.intro && R.camera.intro.skippable) { R.camera.intro.t = R.camera.intro.dur; ptrs = {}; nPtr = 0; drag = null; return; }
    if (nPtr === 2) { startPinch(); drag = null; return; }
    if (nPtr > 2) return;
    var touch = e.pointerType !== "mouse";
    var rotate = e.button === 2 || e.button === 1 || e.shiftKey;
    drag = { id: e.pointerId, mode: rotate ? "rotate" : "pending", touch: touch, hist: [{ x: p.x, y: p.y, t: performance.now() }] };
    var tool = game.hand.tool;
    if (!rotate && tool === "grab") {
      var hit = IN.pick(p.x, p.y, { touch: touch, carryable: true });
      if (hit && (hit.type === "creature" || hit.type === "item")) drag.target = hit;
    }
    if (!rotate && (tool === "tickle")) {
      var hc = IN.pick(p.x, p.y, { touch: touch, creaturesOnly: true });
      if (hc) drag.rub = hc.ref;
    }
    setHand(p.x, p.y, true);
    e.preventDefault();
  }

  function move(e) {
    if (!game) return;
    var p = local(e), ptr = ptrs[e.pointerId];
    if (!ptr) {
      // hover (mouse only): the hand follows the cursor
      if (e.pointerType === "mouse" && !(SB.UI && SB.UI.modalOpen) && e.target === el) { setHand(p.x, p.y, true); game.hand.hover = true; }
      return;
    }
    var dx = p.x - ptr.x, dy = p.y - ptr.y;
    ptr.x = p.x; ptr.y = p.y;
    if (pinch) { updatePinch(); return; }
    if (!drag || drag.id !== e.pointerId) return;
    drag.hist.push({ x: p.x, y: p.y, t: performance.now() });
    if (drag.hist.length > 6) drag.hist.shift();
    var moved = Math.hypot(p.x - ptr.x0, p.y - ptr.y0);
    if (drag.mode === "pending" && moved > (drag.touch ? 10 : 5)) {
      drag.mode = drag.target ? "carry" : drag.rub ? "rub" : "pan";
      if (drag.mode === "carry") pickUp(drag.target);
      if (drag.mode === "pan" && R.camera.follow) R.camera.follow = null;
    }
    if (drag.mode === "pan") R.panBy(dx, dy);
    else if (drag.mode === "rotate") { R.camera.tYaw += dx * 0.008; R.camera.yaw = R.camera.tYaw; tiltBy(dy * 0.004); }
    else if (drag.mode === "carry") { setHand(p.x, p.y, true); carryUpdate(); }
    else if (drag.mode === "rub") {
      setHand(p.x, p.y, true);
      tickleRub += Math.hypot(dx, dy);
      if (tickleRub > 90 && drag.rub && drag.rub.alive) { tickleRub = 0; SB.Creature.tickle(drag.rub, game); if (SB.FX) SB.FX.burst("hearts", drag.rub.x, drag.rub.y + 0.8, drag.rub.z, 2); }
    }
    else setHand(p.x, p.y, true);
  }

  function up(e) {
    var ptr = ptrs[e.pointerId];
    if (!ptr) return;
    delete ptrs[e.pointerId];
    nPtr = Object.keys(ptrs).length;
    if (pinch) { if (nPtr < 2) pinch = null; drag = null; return; }
    if (!drag || drag.id !== e.pointerId) return;
    var p = local(e);
    if (drag.mode === "pending") tap(p.x, p.y, drag.touch);
    else if (drag.mode === "pan") {
      // fling
      var h = drag.hist, a = h[0], b = h[h.length - 1], dt = (b.t - a.t) / 1000;
      if (dt > 0 && dt < 0.25 && h.length > 2) R.panVelocity((b.x - a.x) / dt * 0.6, (b.y - a.y) / dt * 0.6);
    } else if (drag.mode === "carry") release(drag);
    drag = null;
    if (ptr.type !== "mouse") { game.hand.visible = false; game.hand.marker = false; }
  }

  /* ---------------- tools ---------------- */

  function tap(sx, sy, touch) {
    var now = performance.now();
    var dbl = now - lastTap.t < 320 && Math.hypot(sx - lastTap.x, sy - lastTap.y) < 30;
    lastTap = { t: now, x: sx, y: sy };
    var tool = game.hand.tool;
    var g = setHand(sx, sy, true);
    if (SB.UI && SB.UI.armed) { if (g) SB.UI.castAt(g.x, g.z); return; }
    var hit = IN.pick(sx, sy, { touch: touch });
    if (dbl && hit && hit.type === "creature") { SB.Game.select(game, hit.ref.id); R.camera.follow = followFn(hit.ref); if (R.camera.tZoom > 9) R.camera.tZoom = 7; return; }
    if (dbl && !hit && g) { R.flyTo(g.x, g.z, Math.max(R.camera.minZoom, R.camera.tZoom * 0.6), 0.5); return; }
    if (hit && hit.type === "item" && hit.ref.kind === "egg" && hit.ref.data.starter && !hit.ref.data.progress) {
      SB.World.warmEgg(game.world, game, hit.ref); if (SB.FX) SB.FX.burst("sparkle", hit.ref.x, hit.ref.y + 0.4, hit.ref.z, 8); return;
    }
    if (tool === "grab") {
      if (hit && hit.type === "creature") { SB.Game.select(game, hit.ref.id); }
      else if (hit && hit.type === "item" && hit.ref.kind === "egg") { SB.World.warmEgg(game.world, game, hit.ref, hit.ref.data.starter ? 0.24 : 0.06); if (SB.FX) SB.FX.burst("sparkle", hit.ref.x, hit.ref.y + 0.4, hit.ref.z, 5); }
      else if (hit) { if (SB.UI) SB.UI.inspect(hit); }
      else { SB.Game.select(game, null); if (SB.UI) SB.UI.inspect(null); }
    } else if (tool === "tickle" || tool === "tap") {
      if (hit && hit.type === "creature") {
        if (tool === "tickle") { SB.Creature.tickle(hit.ref, game); if (SB.FX) SB.FX.burst("hearts", hit.ref.x, hit.ref.y + 0.8, hit.ref.z, 3); }
        else { SB.Creature.tap(hit.ref, game); if (SB.FX) SB.FX.burst("crumbs", hit.ref.x, hit.ref.y + 0.5, hit.ref.z, 4, { col: [1, 0.4, 0.4] }); }
        if (!game.selectedId) SB.Game.select(game, hit.ref.id);
      }
    } else if (tool === "talk") {
      if (!hit && g && SB.World.depthAt(game.world, g.x, g.z) > 0.1) hit = { type: "water", ref: { x: g.x, z: g.z, noun: "water", id: null } }; // water isn't an object, but you can point at it
      if (hit && SB.UI) SB.UI.teachAt(hit);
    }
  }
  IN.tap = tap;

  function followFn(c) { return function () { return c.alive ? { x: c.x, z: c.z } : null; }; }
  IN.follow = function (c) { R.camera.follow = c ? followFn(c) : null; };

  function pickUp(t) {
    var h = game.hand, ref = t.ref;
    if (t.type === "creature") {
      if (ref.species === "grump") { /* you can carry grumps too, they hate it */ }
      ref.heldBy = "hand"; ref.asleep = false; ref.action = null;
      if (ref.plan) SB.Creature.endPlan(ref, game, false);
    } else {
      if (ref.heldBy != null && ref.heldBy !== "hand") { var cc = SB.Game.byId(game, ref.heldBy); if (cc) SB.Creature.release(cc, ref); }
      ref.heldBy = "hand"; ref.onGround = false; ref.inBag = false; ref.onBelt = false;
    }
    h.heldId = ref.id; h.heldType = t.type;
    if (SB.Audio) SB.Audio.play("whoosh", { vol: 0.5 });
  }
  function carryUpdate() {
    var h = game.hand, ref = SB.Game.byId(game, h.heldId);
    if (!ref) { h.heldId = null; return; }
    ref.x = h.x; ref.z = h.z; ref.y = h.y + 0.2;
    if (ref.type === "creature") { ref.px = ref.x; ref.pz = ref.z; ref.py = ref.y; ref.onGround = false; }
  }
  function release(d) {
    var h = game.hand, ref = SB.Game.byId(game, h.heldId);
    h.heldId = null;
    if (!ref) return;
    var hist = d.hist, a = hist[0], b = hist[hist.length - 1], dt = Math.max(0.016, (b.t - a.t) / 1000);
    // the flick's screen velocity as ground velocity (same mapping as panning, so it flies where you threw it)
    var gv = R.groundDelta((b.x - a.x) / dt, (b.y - a.y) / dt), gx = gv[0], gz = gv[1];
    if (b.t - a.t < 1 || performance.now() - b.t > 90) { gx = 0; gz = 0; } // held still before letting go: just drop it
    var sp = Math.hypot(gx, gz), cap = 9;
    if (sp > cap) { gx *= cap / sp; gz *= cap / sp; }
    if (ref.type === "creature") {
      ref.heldBy = null; ref.vx = gx * 0.8; ref.vz = gz * 0.8; ref.vy = 2 + Math.min(6, sp * 0.3); ref.onGround = false;
      if (sp > 6 && ref.species === "smol") { SB.Chem.apply(ref.chem, { fear: 0.15 }); }
      if (ref.species === "smol") { SB.Chem.apply(ref.chem, { lonely: -0.05 }); }
    } else {
      ref.heldBy = null; SB.World.toss(ref, gx * 0.9, gz * 0.9, sp ? 2 + Math.min(6, sp * 0.35) : 0.5);
      // dropped right in front of a hungry smol? it'll notice
      if (ref.noun === "food") game.creatures.forEach(function (c) { if (c.alive && c.species === "smol" && SB.dist(c.x, c.z, ref.x, ref.z) < 4 && !c.plan && c.chem.hunger > 0.3) { c.action = null; c.thinkT = 0.3; } });
    }
    SB.bus.emit("handDrop", { ref: ref });
  }

  function tiltBy(d) { R.camera.tilt = SB.clamp((R.camera.tilt || 0) + d, -0.22, 0.32); }
  IN.tiltBy = tiltBy;
  /* ---------------- pinch / rotate ---------------- */
  function startPinch() {
    var ids = Object.keys(ptrs), a = ptrs[ids[0]], b = ptrs[ids[1]];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, zoom: R.camera.tZoom, yaw: R.camera.tYaw, mode: null };
    pinch.mx0 = pinch.mx; pinch.my0 = pinch.my;
    if (game.hand.heldId) { var ref = SB.Game.byId(game, game.hand.heldId); if (ref) { ref.heldBy = null; ref.onGround = false; } game.hand.heldId = null; }
  }
  function updatePinch() {
    var ids = Object.keys(ptrs);
    if (ids.length < 2) return;
    var a = ptrs[ids[0]], b = ptrs[ids[1]];
    var d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    // two fingers sliding up or down together (not spreading, not twisting): tilt the camera
    if (!pinch.mode) {
      var mdy = my - pinch.my0, mdx = mx - pinch.mx0, dd = Math.abs(d - pinch.d);
      if (Math.abs(mdy) > 14 && dd < 18 && Math.abs(mdx) < Math.abs(mdy) * 0.6) pinch.mode = "tilt";
      else if (dd > 18 || Math.abs(mdx) > 14 || Math.abs(SB.angDiff(pinch.ang, ang)) > 0.08) pinch.mode = "pinch";
    }
    if (pinch.mode === "tilt") { tiltBy((my - pinch.my) * 0.005); pinch.mx = mx; pinch.my = my; return; }
    R.camera.tZoom = SB.clamp(pinch.zoom * pinch.d / Math.max(20, d), R.camera.minZoom, R.camera.maxZoom);
    R.camera.zoom = R.camera.tZoom;
    var da = SB.angDiff(pinch.ang, ang);
    if (Math.abs(da) > 0.08 || pinch.rotating) { pinch.rotating = true; R.camera.tYaw = pinch.yaw - da; R.camera.yaw = R.camera.tYaw; }
    R.panBy(mx - pinch.mx, my - pinch.my);
    pinch.mx = mx; pinch.my = my;
  }

  function wheel(e) {
    if (!game || (SB.UI && SB.UI.modalOpen)) return;
    e.preventDefault();
    var p = local(e);
    var f = Math.exp((e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY) * 0.0016);
    if (e.ctrlKey) f = Math.exp(e.deltaY * 0.01); // trackpad pinch
    R.zoomAt(f, p.x, p.y);
  }

  /* ---------------- keyboard ---------------- */
  function keydown(e) {
    if (!game) return;
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    var k = e.key.toLowerCase();
    keys[k] = true;
    if (SB.UI && SB.UI.key && SB.UI.key(e)) return;
    if (k === "r") tiltBy(-0.08);
    else if (k === "v") tiltBy(0.08);
    else if (k === "q") R.rotateBy(-Math.PI / 4);
    else if (k === "e") R.rotateBy(Math.PI / 4);
    else if (k === "+" || k === "=" || k === "z") R.zoomAt(0.8);
    else if (k === "-" || k === "_" || k === "x") R.zoomAt(1.25);
  }
  // continuous WASD panning (called every frame)
  IN.frame = function (dt) {
    if (!game) return;
    var px = 0, py = 0, s = 520 * dt;
    if (keys.w || keys.arrowup) py += s;
    if (keys.s || keys.arrowdown) py -= s;
    if (keys.a || keys.arrowleft) px += s;
    if (keys.d || keys.arrowright) px -= s;
    if (px || py) { R.camera.follow = null; R.panBy(px, py); }
  };
})();
