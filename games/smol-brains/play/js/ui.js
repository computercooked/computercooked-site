/* smol brains — ui.js
   Everything DOM: canvas input (the hand), HUD, minimap, roster, toolbar, talk bar, smol panel,
   live brain viewer, modals (menu, smolpedia, achievements, family tree, creature card, import/export,
   naming, confirm), tutorial coach marks, toasts and the notes ticker.
   Defensive by design: every call into another module goes through call()/has() so the UI still loads
   while other modules are stubs. */
(function () {
  "use strict";
  var SB = window.SB;
  var UI = (SB.UI = SB.UI || {});
  UI.modalOpen = false;

  var G = null; // the live game
  var built = false, bound = false;
  var root = null, view = null;
  var E = {}; // element refs
  var reduced = false;
  try { reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  /* =====================================================================
     tiny helpers
     ===================================================================== */

  // el("div", {class: "x", onclick: fn, text: "hi", html: "<b>"}, [children])
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k === "html") n.innerHTML = v;
      else if (k === "style" && typeof v === "object") for (var s in v) n.style[s] = v[s];
      else if (k.slice(0, 2) === "on" && typeof v === "function") n.addEventListener(k.slice(2), v);
      else if (k === "data" && typeof v === "object") for (var d in v) n.dataset[d] = v[d];
      else n.setAttribute(k, v === true ? "" : v);
    }
    if (kids != null) {
      if (!Array.isArray(kids)) kids = [kids];
      for (var i = 0; i < kids.length; i++) {
        var c = kids[i];
        if (c == null || c === false) continue;
        n.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
      }
    }
    return n;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]; }); }
  function has(mod, name) { return !!(SB[mod] && typeof SB[mod][name] === "function"); }
  function call(mod, name) {
    if (!has(mod, name)) return undefined;
    try { return SB[mod][name].apply(SB[mod], Array.prototype.slice.call(arguments, 2)); }
    catch (e) { console.warn("[ui] " + mod + "." + name + " failed", e); return undefined; }
  }
  function now() { return performance.now(); }
  function setText(n, t) { t = String(t); if (n && n.textContent !== t) n.textContent = t; }
  function setHTML(n, h) { if (n && n._h !== h) { n._h = h; n.innerHTML = h; } }
  function fmt(v, d) { return (typeof v === "number" && isFinite(v) ? v : 0).toFixed(d == null ? 2 : d); }
  function sfx(name) { if (has("Audio", "play")) call("Audio", "play", name); }

  function byId(id) {
    if (!G || id == null) return null;
    if (SB.Game && SB.Game.byId) { try { return SB.Game.byId(G, id); } catch (e) {} }
    for (var i = 0; i < G.creatures.length; i++) if (G.creatures[i].id === id) return G.creatures[i];
    return null;
  }
  function creatureById(id) {
    if (!G || id == null) return null;
    for (var i = 0; i < G.creatures.length; i++) if (G.creatures[i].id === id) return G.creatures[i];
    return null;
  }
  function smols() { return G ? G.creatures.filter(function (c) { return c.alive && c.species === "smol"; }) : []; }
  function grumps() { return G ? G.creatures.filter(function (c) { return c.alive && c.species === "grump"; }) : []; }
  function selected() { var c = G && creatureById(G.selectedId); return c && c.alive ? c : null; }
  function objects() { return (G && G.world && G.world.objects) || []; }
  function nounIdx(n) { return typeof n === "number" ? n : SB.N[n] != null ? SB.N[n] : -1; }
  function nounName(n) { var i = nounIdx(n); return i >= 0 ? SB.NOUNS[i] : String(n || "thing"); }
  function verbIdx(v) { return typeof v === "number" ? v : SB.V[v] != null ? SB.V[v] : -1; }

  function drivesOf(c) {
    var d = c && c.chem && call("Chem", "drives", c.chem);
    if (d && d.length) return d;
    var out = [];
    for (var i = 0; i < SB.N_DRIVES; i++) out.push(c && c.chem ? +c.chem[SB.DRIVES[i]] || 0 : 0);
    return out;
  }
  function topDrive(c) {
    var t = c && c.chem && call("Chem", "top", c.chem);
    if (t && t.i != null) return t;
    var d = drivesOf(c), bi = 0;
    for (var i = 1; i < d.length; i++) if (d[i] > d[bi]) bi = i;
    return { i: bi, v: d[bi] || 0 };
  }
  var MOOD_EMOJI = { happy: "😊", ok: "🙂", sad: "😢", sick: "🤢", scared: "😱", angry: "😠", sleepy: "😴" };
  var MOOD_COLOR = { happy: "#c5ff49", ok: "#8fd3ff", sad: "#7d8cff", sick: "#8bd450", scared: "#ffd166", angry: "#ff4d4d", sleepy: "#b59aff" };
  function moodOf(c) {
    if (c && c.asleep) return "sleepy";
    var m = c && c.chem && call("Chem", "mood", c.chem);
    return MOOD_EMOJI[m] ? m : "ok";
  }
  function iqOf(c) {
    var v = call("Creature", "iq", c);
    if (typeof v !== "number" || !isFinite(v)) v = c && typeof c.iq === "number" ? c.iq : 0;
    return Math.round(v);
  }
  function stageName(c) { var s = SB.STAGES[c && c.stage | 0]; return s ? s.name : "smol"; }
  function ageText(sec) {
    sec = sec || 0;
    if (sec < SB.DAY_LENGTH) return Math.max(1, Math.round(sec / 60)) + " min";
    var d = sec / SB.DAY_LENGTH;
    return (d < 10 ? d.toFixed(1) : Math.round(d)) + " days";
  }
  function toWorld(sx, sy) { var p = call("Render", "toWorld", sx, sy); return p && isFinite(p.x) ? p : { x: sx, y: sy }; }
  function toScreen(wx, wy) { var p = call("Render", "toScreen", wx, wy); return p && isFinite(p.x) ? p : null; }
  function camera() { return (SB.Render && SB.Render.camera) || null; }
  function follow(id) { var cam = camera(); if (cam) cam.follow = id; }
  function isPhone() { return window.innerWidth < 700 && window.innerHeight > 520; }
  function isCompact() { return isPhone() || window.innerHeight <= 520; }

  // Portrait into a canvas (box px). Falls back to a cute blob if render.js has no portrait yet.
  function portrait(cv, look, box, opts) {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var px = Math.round(box * dpr);
    if (cv.width !== px) { cv.width = px; cv.height = px; }
    var ctx = cv.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, px, px);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!look) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, box, box); ctx.clip();
    var ok = false;
    if (has("Render", "portrait")) {
      // render.js draws babies smaller than adults at the same size; zoom young ones in so the face fills the tile
      var st = opts && opts.stage != null ? opts.stage : 3;
      var zoom = st <= 0 ? 1.45 : st === 1 ? 1.2 : st === 2 ? 1.05 : 0.95;
      try { SB.Render.portrait(ctx, look, box / 2, box / 2 + box * 0.04, box * zoom, opts || {}); ok = true; } catch (e) { ok = false; }
    }
    if (!ok) blob(ctx, look, box / 2, box / 2 + box * 0.06, box * 0.36);
    ctx.restore();
  }
  function blob(ctx, look, cx, cy, r) {
    var grump = look.species === "grump";
    ctx.fillStyle = "hsl(" + (look.hue || 0) + "," + (look.sat || 60) + "%," + (look.light || 60) + "%)";
    ctx.beginPath(); ctx.ellipse(cx, cy, r * (look.body || 1), r, 0, 0, Math.PI * 2); ctx.fill();
    if (grump) {
      ctx.beginPath();
      for (var i = 0; i < 5; i++) { var a = -Math.PI * 0.85 + i * Math.PI * 0.175; ctx.moveTo(cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.8); ctx.lineTo(cx + Math.cos(a) * r * 1.35, cy + Math.sin(a) * r * 1.35); ctx.lineTo(cx + Math.cos(a + 0.2) * r * 0.85, cy + Math.sin(a + 0.2) * r * 0.85); }
      ctx.fill();
    }
    var er = r * 0.2 * (look.eyes || 1);
    ctx.fillStyle = "#fff";
    [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.arc(cx + s * r * 0.38, cy - r * 0.12, er, 0, 7); ctx.fill(); });
    ctx.fillStyle = "#16161a";
    [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.arc(cx + s * r * 0.38, cy - r * 0.1, er * 0.55, 0, 7); ctx.fill(); });
    if (look.cheeks) { ctx.fillStyle = "rgba(255,120,150,.5)"; [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.arc(cx + s * r * 0.62, cy + r * 0.2, r * 0.13, 0, 7); ctx.fill(); }); }
  }
  function lookOf(c) { return (c && c.look) || (c && c.genome && call("Genome", "look", c.genome)) || { hue: 200, sat: 60, light: 60 }; }

  /* =====================================================================
     build the DOM (once)
     ===================================================================== */

  var TOOLS = [
    { id: "grab", em: "✋", lb: "grab", key: "1" },
    { id: "tickle", em: "🪶", lb: "tickle", key: "2" },
    { id: "tap", em: "👆", lb: "tap", key: "3" },
    { id: "talk", em: "💬", lb: "talk", key: "4" }
  ];
  var SPEED_LBL = { 0: "⏸", 1: "1×", 2: "2×", 4: "4×", 8: "8×" };
  var ICON_PAUSE = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="1.5" width="3.6" height="11" rx="1.2" fill="currentColor"/><rect x="8.4" y="1.5" width="3.6" height="11" rx="1.2" fill="currentColor"/></svg>';
  var ICON_PLAY = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.8v10.4c0 .7.8 1.1 1.4.7l8-5.2c.5-.3.5-1.1 0-1.4l-8-5.2C3.8.7 3 1.1 3 1.8z" fill="currentColor"/></svg>';

  function build() {
    root = document.getElementById("ui");
    if (!root) { root = el("div", { id: "ui" }); document.body.appendChild(root); }
    view = document.getElementById("view");
    root.innerHTML = "";

    // --- HUD
    E.clockWx = el("span", { class: "wx", text: "☀️" });
    E.clockLbl = el("span", { text: "day 1" });
    E.clock = el("div", { class: "clock glass", title: "time & weather" }, [E.clockWx, E.clockLbl]);
    E.map = el("canvas", { "aria-label": "minimap: tap to jump there" });
    E.mapWrap = el("div", { class: "mapwrap glass" }, E.map);
    E.speed = el("div", { class: "speed glass", role: "group", "aria-label": "time speed" });
    E.speedBtns = {};
    SB.SPEEDS.forEach(function (s) {
      var b = el("button", { class: "sp-full" + (s === 0 ? " glyph" : ""), data: { speed: s }, "aria-label": s === 0 ? "pause" : "speed " + s, text: s === 0 ? null : SPEED_LBL[s] || s + "×", html: s === 0 ? ICON_PAUSE : null });
      E.speedBtns[s] = b; E.speed.appendChild(b);
    });
    E.spPause = el("button", { class: "sp-mini glyph", data: { act: "pause" }, "aria-label": "pause or resume", html: ICON_PAUSE });
    E.spCycle = el("button", { class: "sp-mini", data: { act: "cycle" }, "aria-label": "change speed", text: "1×" });
    E.speed.appendChild(E.spPause); E.speed.appendChild(E.spCycle);
    E.statSmols = el("span", { text: "🐣 0" });
    E.statGrumps = el("span", { text: "👺 0" });
    E.statIQ = el("span", { class: "iq", text: "🧠 0" });
    E.stats = el("div", { class: "stats glass", title: "smols · grumps · best IQ ever" }, [E.statSmols, E.statGrumps, E.statIQ]);
    E.menuBtn = el("button", { class: "icon-btn menu-btn glass", data: { act: "menu" }, "aria-label": "menu", text: "☰" });
    E.roster = el("div", { class: "roster", "aria-label": "your smols" });
    E.hud = el("div", { class: "hud" }, [el("div", { class: "hud-row" }, [E.clock, E.mapWrap, E.speed, E.stats, E.menuBtn]), E.roster]);

    // --- ticker
    E.ticker = el("div", { class: "ticker ghost", "aria-live": "polite" });

    // --- dock: toasts, talk bar, panel, toolbar
    E.toasts = el("div", { class: "toasts" });
    E.talkInput = el("input", { type: "text", placeholder: "say something… (food, eat, good)", maxlength: 60, enterkeyhint: "send", autocomplete: "off", autocapitalize: "off", spellcheck: "false", "aria-label": "say a word" });
    E.talkSend = el("button", { class: "btn primary", data: { act: "talk-send" }, text: "say" });
    E.talkTo = el("div", { class: "talk-to" });
    E.chips = el("div", { class: "chips" });
    E.talkbar = el("div", { class: "talkbar glass" }, [el("div", { class: "talk-row" }, [E.talkInput, E.talkSend]), E.chips, E.talkTo]);
    E.toolbar = el("div", { class: "toolbar glass", role: "toolbar", "aria-label": "hand tools" });
    E.toolBtns = {};
    TOOLS.forEach(function (t) {
      var b = el("button", { class: "tool", data: { tool: t.id }, "aria-label": t.lb + " tool (" + t.key + ")" }, [
        el("span", { class: "em", text: t.em }), el("span", { class: "lb" }, [t.lb + " ", el("span", { class: "key", text: t.key })])
      ]);
      E.toolBtns[t.id] = b; E.toolbar.appendChild(b);
    });
    E.panel = buildPanel();
    E.dock = el("div", { class: "dock" }, [E.talkbar, E.panel, E.toolbar]);

    // --- brain viewer
    E.brainCv = el("canvas");
    E.bwTitle = el("h2", { html: "brain" });
    E.bwExplain = el("div", { class: "bw-explain" });
    E.bwAtt = el("div", { class: "bw-att" });
    E.brain = el("div", { class: "brainwin glass", role: "dialog", "aria-label": "brain viewer" }, [
      el("div", { class: "bw-head" }, [E.bwTitle, el("button", { class: "icon-btn", data: { act: "brain-close" }, "aria-label": "close brain viewer", text: "✕" })]),
      el("div", { class: "bw-canvas" }, E.brainCv),
      el("div", { class: "bw-legend", html: '<span><i style="background:#c5ff49"></i>excites</span><span><i style="background:#ff5fa2"></i>inhibits</span><span><i style="background:#fff;box-shadow:0 0 6px #fff"></i>learning just happened</span>' }),
      el("div", { class: "bw-foot" }, [E.bwExplain, E.bwAtt])
    ]);

    // --- coach + arrow + tooltip + pause + celebration + modal layer
    E.coachText = el("div", { class: "ct" });
    E.coachStep = el("span", { class: "cs" });
    E.coachBtns = el("div", { class: "cbtns" });
    E.coach = el("div", { class: "coach glass", role: "status" }, [E.coachText, el("div", { class: "cr" }, [E.coachStep, E.coachBtns])]);
    E.arrow = el("div", { class: "arrow ghost", html: '<div class="ring"></div><div class="a-in"><svg viewBox="0 0 44 52"><path d="M14 2h16v24h12L22 50 2 26h12z" fill="#c5ff49" stroke="#101114" stroke-width="3" stroke-linejoin="round"/></svg></div>' });
    E.tip = el("div", { class: "tip glass ghost" });
    E.pauseT = el("div", { class: "pt", text: "paused" });
    E.pauseS = el("div", { class: "ps", text: "the smols are frozen in time. rude." });
    E.pause = el("div", { class: "pausebadge glass" }, [el("div", null, [E.pauseT, E.pauseS]), el("button", { class: "btn primary", data: { act: "resume" }, html: ICON_PLAY + " play" })]);
    E.celebrate = el("div", { class: "celebrate ghost" });
    E.modal = el("div", { class: "modal glass" });
    E.layer = el("div", { class: "modal-layer" }, E.modal);

    [E.hud, E.ticker, E.dock, E.toasts, E.brain, E.coach, E.pause, E.tip, E.celebrate, E.arrow, E.layer].forEach(function (n) { root.appendChild(n); });
    built = true;
  }

  function buildPanel() {
    E.pPor = el("canvas", { class: "p-por" });
    E.pName = el("input", { type: "text", maxlength: 14, "aria-label": "name (tap to rename)", autocomplete: "off", spellcheck: "false" });
    E.pSub = el("div", { class: "p-sub" });
    E.pMood = el("span", { class: "p-mood" });
    E.pBrain = el("button", { class: "icon-btn brain-btn", data: { act: "brain" }, "aria-label": "open brain viewer", text: "🧠" });
    E.pToggle = el("button", { class: "p-toggle", data: { act: "panel-toggle" }, "aria-label": "expand or collapse", text: "▾" });
    E.pClose = el("button", { class: "icon-btn", data: { act: "deselect" }, "aria-label": "close", text: "✕" });
    E.pThink = el("span", { class: "txt" });
    E.pBody = el("div", { class: "p-body" });
    return el("div", { class: "panel glass", "aria-label": "selected creature" }, [
      el("div", { class: "p-head" }, [E.pPor, el("div", { class: "p-id" }, [el("div", { class: "p-name" }, [E.pName]), E.pSub]), E.pBrain, E.pClose]),
      el("div", { class: "p-think" }, [E.pMood, el("span", { class: "lbl", text: "thinking:" }), E.pThink, E.pToggle]),
      E.pBody
    ]);
  }

  /* =====================================================================
     input: the hand
     ===================================================================== */

  var ptrs = {}; // pointerId -> {x, y, x0, y0}
  var gesture = null; // {mode: "pending"|"pan"|"carry"|"rub"|"pinch", pick, id, ...}
  var handScreen = null; // last pointer pos (css px, canvas space)
  var handHideAt = 0;
  var lastW = null, vel = { x: 0, y: 0 }, lastMoveAt = 0;
  var tickleAt = 0;
  var carryOff = { x: 0, y: 0 };
  var keys = {};
  var audioPrimed = false;

  function ptrCount() { return Object.keys(ptrs).length; }
  function canvasXY(e) { var r = view.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function pick(sx, sy) { var p = call("Render", "pick", G, sx, sy); return p && p.ref ? p : null; }

  function setHand(p, visible) {
    handScreen = p;
    var w = toWorld(p.x, p.y);
    G.hand.x = w.x; G.hand.y = w.y;
    if (visible != null) G.hand.visible = visible;
  }

  function primeAudio() {
    if (audioPrimed) return;
    audioPrimed = true;
    ["resume", "unlock", "init"].some(function (f) { if (has("Audio", f)) { call("Audio", f); return f !== "init"; } return false; });
  }

  function onDown(e) {
    if (!G) return;
    primeAudio();
    try { view.setPointerCapture(e.pointerId); } catch (er) {}
    var p = canvasXY(e);
    ptrs[e.pointerId] = { x: p.x, y: p.y, x0: p.x, y0: p.y };
    hideTip();
    var n = ptrCount();
    if (n === 2) {
      endCarry(false);
      var pp = pinchInfo();
      gesture = { mode: "pinch", d: pp.d, mx: pp.mx, my: pp.my };
      return;
    }
    if (n > 2) return;
    setHand(p, true);
    lastW = { x: G.hand.x, y: G.hand.y, t: now() };
    vel.x = vel.y = 0;
    var pk = pick(p.x, p.y);
    gesture = { mode: "pending", pick: pk, id: e.pointerId, touch: e.pointerType !== "mouse" };
    if (G.hand.tool === "tickle" && pk && pk.type === "creature") { doTickle(pk.ref); gesture.mode = "rub"; gesture.rubbed = true; }
  }

  function pinchInfo() {
    var ids = Object.keys(ptrs), a = ptrs[ids[0]], b = ptrs[ids[1]];
    return { d: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  }

  function onMove(e) {
    if (!G) return;
    var p = canvasXY(e);
    var pt = ptrs[e.pointerId];
    if (!pt) { if (e.pointerType === "mouse") setHand(p, true); return; }
    var dx = p.x - pt.x, dy = p.y - pt.y;
    pt.x = p.x; pt.y = p.y;
    if (!gesture) return;
    if (gesture.mode === "pinch") {
      if (ptrCount() < 2) return;
      var pp = pinchInfo();
      call("Render", "zoomAt", pp.mx, pp.my, pp.d / gesture.d);
      call("Render", "panBy", pp.mx - gesture.mx, pp.my - gesture.my);
      gesture.d = pp.d; gesture.mx = pp.mx; gesture.my = pp.my;
      return;
    }
    if (e.pointerId !== gesture.id) return;
    setHand(p, true);
    var t = now();
    if (lastW) {
      var dt = Math.max(0.008, (t - lastW.t) / 1000);
      var ivx = (G.hand.x - lastW.x) / dt, ivy = (G.hand.y - lastW.y) / dt;
      vel.x = vel.x * 0.4 + ivx * 0.6; vel.y = vel.y * 0.4 + ivy * 0.6;
    }
    lastW = { x: G.hand.x, y: G.hand.y, t: t }; lastMoveAt = t;
    var moved = Math.hypot(p.x - pt.x0, p.y - pt.y0) > (gesture.touch ? 10 : 6);

    if (gesture.mode === "pending" && moved) {
      var pk = gesture.pick;
      if (G.hand.tool === "grab" && pk && carriable(pk.ref, pk.type)) startCarry(pk);
      else {
        gesture.mode = "pan";
        follow(null);
        call("Render", "panBy", p.x - pt.x0, p.y - pt.y0);
      }
    } else if (gesture.mode === "pan") {
      call("Render", "panBy", dx, dy);
    } else if (gesture.mode === "rub") {
      var pk2 = pick(p.x, p.y);
      if (pk2 && pk2.type === "creature") doTickle(pk2.ref);
      else if (moved && !pk2) { /* rubbing empty air does nothing */ }
    }
  }

  function onUp(e) {
    if (!G) return;
    var pt = ptrs[e.pointerId];
    delete ptrs[e.pointerId];
    if (!gesture) return;
    if (gesture.mode === "pinch") { if (ptrCount() === 0) gesture = null; return; }
    if (e.pointerId !== gesture.id) return;
    if (e.type === "pointercancel") { endCarry(false); gesture = null; return; }
    if (gesture.mode === "pending" && pt) tapAction(gesture.pick, { x: pt.x, y: pt.y });
    else if (gesture.mode === "rub" && !gesture.moved) { /* tickle already happened on down */ }
    if (gesture.mode === "carry") endCarry(true);
    gesture = null;
    if (e.pointerType !== "mouse") handHideAt = now() + 1400;
  }

  function onLeave(e) { if (e.pointerType === "mouse" && !ptrCount() && G) G.hand.visible = false; }

  function onWheel(e) {
    if (!G) return;
    e.preventDefault();
    var p = canvasXY(e);
    var dy = e.deltaY * (e.deltaMode === 1 ? 30 : 1);
    call("Render", "zoomAt", p.x, p.y, Math.exp(-SB.clamp(dy, -120, 120) * 0.0016));
  }

  function carriable(ref, type) {
    if (!ref) return false;
    if (type === "creature") return ref.alive !== false;
    return !ref.fixed;
  }

  function startCarry(pk) {
    var r = pk.ref;
    gesture.mode = "carry";
    r.heldBy = "hand";
    G.hand.heldId = r.id;
    G.hand.heldType = pk.type;
    carryOff.x = SB.clamp((r.x || 0) - G.hand.x, -20, 20);
    carryOff.y = SB.clamp((r.y || 0) - G.hand.y, -20, 20);
    sfx("pop");
    hideTip();
  }

  function endCarry(doThrow) {
    if (!G || G.hand.heldId == null) return;
    var r = byId(G.hand.heldId);
    G.hand.heldId = null; G.hand.heldType = null;
    if (!r) return;
    if (r.heldBy === "hand") r.heldBy = null;
    var stale = now() - lastMoveAt > 90;
    var vx = doThrow && !stale ? vel.x : 0, vy = doThrow && !stale ? vel.y : 0;
    r.vx = SB.clamp(vx, -1100, 1100);
    r.vy = SB.clamp(vy, -1100, 1100);
    if (r.onGround != null) r.onGround = false;
    if (Math.hypot(vx, vy) > 400) sfx("whoosh");
  }

  function doTickle(c) {
    var t = now();
    if (t - tickleAt < 250) return;
    tickleAt = t;
    if (!c.alive && c.alive !== undefined) return;
    call("Creature", "tickle", c, G);
    if (c.species === "smol" && G.selectedId == null) selectC(c, false);
  }

  function warmEgg(egg) { call("World", "warmEgg", G.world, G, egg); }

  function tapAction(pk, p) {
    var tool = G.hand.tool;
    if (!pk) { hideTip(); return; }
    var r = pk.ref;
    if (pk.type === "creature") {
      if (tool === "grab") selectC(r, false);
      else if (tool === "tickle") doTickle(r);
      else if (tool === "tap") { call("Creature", "tap", r, G); if (r.species === "smol" && G.selectedId == null) selectC(r, false); }
      else if (tool === "talk") UI.say(r.species === "smol" ? r.name : "grump", { aboutNoun: SB.N[r.species], aboutId: r.id, near: r });
      return;
    }
    // objects
    var ni = nounIdx(r.noun);
    if (r.kind === "egg") {
      warmEgg(r);
      if (tool === "talk") UI.say("egg", { aboutNoun: SB.N.egg, aboutId: r.id });
      return;
    }
    if (tool === "talk") { UI.say(SB.NOUN_WORDS[ni] || r.kind, { aboutNoun: ni, aboutId: r.id }); return; }
    showTip(r, p);
  }

  function showTip(obj, p) {
    var k = SB.KINDS[obj.kind] || {};
    var word = SB.NOUN_WORDS[nounIdx(obj.noun)];
    E.tip.innerHTML = "<b>" + esc((k.emoji || "") + " " + (k.label || obj.kind)) + "</b>" + esc(k.desc || "a thing.") +
      (word ? '<div class="muted" style="margin-top:4px">smol word: “' + esc(word) + "”" + (k.fixed ? " · can't be carried" : "") + "</div>" : "");
    var x = SB.clamp(p.x, 130, window.innerWidth - 130), y = Math.max(90, p.y);
    E.tip.style.left = x + "px"; E.tip.style.top = y + "px";
    E.tip.classList.add("open");
    clearTimeout(showTip.t);
    showTip.t = setTimeout(hideTip, 3200);
  }
  function hideTip() { if (E.tip) E.tip.classList.remove("open"); }

  /* =====================================================================
     talking
     ===================================================================== */

  function cleanWords(text) {
    var names = {};
    if (G) G.creatures.forEach(function (c) { if (c.species === "smol" && c.name) names[String(c.name).toLowerCase()] = c.name; });
    var clean;
    try { clean = String(text || "").replace(/[^\p{L}\p{N}'\s-]/gu, " "); } catch (e) { clean = String(text || "").replace(/[^A-Za-z0-9'\s-]/g, " "); }
    return clean.split(/\s+/).filter(Boolean).slice(0, 6).map(function (w) { var l = w.toLowerCase(); return names[l] || l; });
  }

  // UI.say(text, {aboutNoun, aboutId, to: creature, near: creature})
  UI.say = function (text, opts) {
    if (!G) return;
    opts = opts || {};
    var words = cleanWords(text);
    if (!words.length) return;
    var center = opts.to || opts.near || null;
    var cx = center ? center.x : G.hand.x, cy = center ? center.y : G.hand.y;
    if (opts.to) { // talking from the bar to a selected smol: pop the hand next to it so the bubble shows
      G.hand.x = opts.to.x + 46; G.hand.y = opts.to.y - 56; G.hand.visible = true; handHideAt = now() + 2200;
    }
    G.hand.saying = words.join(" ");
    G.hand.sayT = 2;
    var listeners = [];
    if (opts.to && opts.to.alive) listeners.push(opts.to);
    var all = smols();
    for (var i = 0; i < all.length; i++) {
      var c = all[i];
      if (listeners.indexOf(c) >= 0) continue;
      if (SB.dist(c.x, c.y, cx, cy) <= 350 || SB.dist(c.x, c.y, G.hand.x, G.hand.y) <= 350) listeners.push(c);
    }
    if (!listeners.length && opts.fallbackNearest) {
      var best = null, bd = 1e9;
      all.forEach(function (c) { var d = SB.dist(c.x, c.y, cx, cy); if (d < bd) { bd = d; best = c; } });
      if (best) listeners.push(best);
    }
    words.forEach(function (w) {
      listeners.forEach(function (c) {
        call("Creature", "hear", c, w, G, { fromHand: true, aboutNoun: opts.aboutNoun, aboutId: opts.aboutId });
      });
    });
    sfx("click");
    return listeners.length;
  };

  function talkFromBar(text) {
    var words = cleanWords(text);
    if (!words.length) return;
    var sel = selected();
    var n;
    if (sel && sel.species === "smol") n = UI.say(words.join(" "), { to: sel });
    else {
      // nobody selected: talk where the hand is, or to the middle of the screen if the hand is elsewhere
      if (!G.hand.visible || !handScreen) {
        var w = toWorld(window.innerWidth / 2, window.innerHeight / 2);
        G.hand.x = w.x; G.hand.y = w.y - 40; G.hand.visible = true; handHideAt = now() + 2200;
      }
      n = UI.say(words.join(" "), { fallbackNearest: true });
    }
    if (!n) toast({ icon: "🦗", title: "nobody heard that", desc: "move the hand near a smol, or select one first." });
  }

  function rebuildChips() {
    var sel = selected();
    var key = (sel ? sel.id + ":" + sel.name : "-");
    if (E.chips._key === key) return;
    E.chips._key = key;
    E.chips.innerHTML = "";
    if (sel && sel.species === "smol") E.chips.appendChild(el("button", { class: "chip name", data: { word: sel.name }, text: sel.name }));
    E.chips.appendChild(el("button", { class: "chip praise", data: { word: "good" }, text: "👍 good" }));
    E.chips.appendChild(el("button", { class: "chip scold", data: { word: "bad" }, text: "👎 bad" }));
    SB.VERB_WORDS.forEach(function (w, i) { E.chips.appendChild(el("button", { class: "chip", data: { word: w } }, [SB.VERB_EMOJI[i] + " " + w])); });
    setHTML(E.talkTo, sel && sel.species === "smol" ? "talking to <b>" + esc(sel.name) + "</b> (and anyone nearby)" : "talking to smols near the hand · tip: tap a thing with 💬 to say its name");
  }

  var coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  function openTalk(focus) {
    E.talkbar.classList.add("open");
    E.dock.classList.add("talking"); // phones: the talk bar replaces the smol sheet so the world stays visible
    rebuildChips();
    if (focus && !coarse) setTimeout(function () { try { E.talkInput.focus(); } catch (e) {} }, 30);
  }
  function closeTalk() { E.talkbar.classList.remove("open"); E.dock.classList.remove("talking"); try { E.talkInput.blur(); } catch (e) {} }

  // Tell the renderer how much of the screen the HUD and dock cover, so the ground sits in the visible gap.
  var insetT = 0, lastIns = "";
  function updateInsets(t) {
    if (t - insetT < 250) return;
    insetT = t;
    var vr = view.getBoundingClientRect();
    var top = 0, bot = vr.bottom;
    var cx = vr.left + vr.width / 2;
    if (vr.height > vr.width) top = Math.max(0, E.hud.getBoundingClientRect().bottom - vr.top);
    // dock pieces over the middle of the screen (talk bar, phone sheet, toolbar); side panels don't count
    Array.prototype.forEach.call(E.dock.children, function (ch) {
      var r = ch.getBoundingClientRect();
      if (r.height > 0 && r.left < cx && r.right > cx && getComputedStyle(ch).display !== "none" && r.top < bot) bot = r.top;
    });
    var key = Math.round(top) + "," + Math.round(vr.bottom - bot);
    if (key === lastIns) return;
    lastIns = key;
    call("Render", "setInsets", top, vr.bottom - bot);
  }

  /* =====================================================================
     tools, speed, selection
     ===================================================================== */

  function setTool(t) {
    if (!G) return;
    if (G.hand.tool !== t) endCarry(false);
    G.hand.tool = t;
    for (var k in E.toolBtns) { E.toolBtns[k].classList.toggle("on", k === t); E.toolBtns[k].setAttribute("aria-pressed", k === t ? "true" : "false"); }
    if (t === "talk") openTalk(false); else closeTalk();
    sfx("click");
  }

  var lastSpeed = 1;
  function setSpeed(s) {
    if (!G) return;
    if (SB.SPEEDS.indexOf(s) < 0) s = 1;
    if (G.speed > 0) lastSpeed = G.speed;
    G.speed = s;
    if (s > 0) lastSpeed = s;
    refreshSpeed();
    sfx("click");
  }
  function togglePause() { if (G.speed === 0) setSpeed(lastSpeed || 1); else setSpeed(0); }
  function stepSpeed(d) {
    var i = SB.SPEEDS.indexOf(G.speed);
    if (i < 0) i = 1;
    setSpeed(SB.SPEEDS[SB.clamp(i + d, 0, SB.SPEEDS.length - 1)]);
  }
  function refreshSpeed() {
    for (var k in E.speedBtns) E.speedBtns[k].classList.toggle("on", +k === G.speed);
    setHTML(E.spPause, G.speed === 0 ? ICON_PLAY : ICON_PAUSE);
    setText(E.spCycle, (G.speed || lastSpeed) + "×");
  }

  function selectC(c, doFollow) {
    if (!c) return;
    if (SB.Game && SB.Game.select) SB.Game.select(G, c.id); else { G.selectedId = c.id; SB.bus.emit("select", { c: c }); }
    if (doFollow) follow(c.id);
    refreshPanel(true);
  }
  function deselect() {
    if (SB.Game && SB.Game.select) SB.Game.select(G, null); else G.selectedId = null;
    var cam = camera(); if (cam && cam.follow != null && !creatureById(cam.follow)) cam.follow = null;
    refreshPanel(true);
  }

  /* =====================================================================
     event binding (once)
     ===================================================================== */

  function bind() {
    view.addEventListener("pointerdown", onDown);
    view.addEventListener("pointermove", onMove);
    view.addEventListener("pointerup", onUp);
    view.addEventListener("pointercancel", onUp);
    view.addEventListener("pointerleave", onLeave);
    view.addEventListener("wheel", onWheel, { passive: false });
    view.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    document.addEventListener("gesturestart", function (e) { e.preventDefault(); });

    root.addEventListener("click", onClick);
    root.addEventListener("pointerdown", primeAudio);

    // minimap
    E.map.addEventListener("pointerdown", function (e) {
      var r = E.map.getBoundingClientRect();
      var fx = SB.clamp((e.clientX - r.left) / r.width, 0, 1);
      follow(null);
      call("Render", "centerOn", fx * SB.WORLD_W);
      sfx("click");
    });

    // talk input
    E.talkInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); talkFromBar(E.talkInput.value); E.talkInput.value = ""; }
      else if (e.key === "Escape") { e.preventDefault(); E.talkInput.blur(); }
      e.stopPropagation();
    });

    // rename
    function commitName() {
      var c = selected(); if (!c || c.species !== "smol") return;
      var v = E.pName.value.trim().slice(0, 14);
      if (!v) { E.pName.value = c.name; return; }
      if (v !== c.name) renameSmol(c, v);
    }
    E.pName.addEventListener("change", commitName);
    E.pName.addEventListener("blur", commitName);
    E.pName.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === "Escape") { if (e.key === "Escape") E.pName.value = (selected() || {}).name || ""; E.pName.blur(); } e.stopPropagation(); });

    E.layer.addEventListener("pointerdown", function (e) { if (e.target === E.layer && modal && modal.dismiss !== false) { e.preventDefault(); closeModal(); } });

    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", function (e) { keys[e.key.toLowerCase()] = false; });
    window.addEventListener("blur", function () { keys = {}; });
    window.addEventListener("resize", function () { hudDirty = true; });

    // bus
    var on = function (ev, fn) { SB.bus.on(ev, function (d) { if (G) fn(d || {}); }); };
    on("achievement", function (d) { if (d.a) toast({ icon: d.a.icon, title: d.a.name, desc: d.a.desc, cls: "t-ach", ms: 4200 }); });
    on("note", function (d) { if (d.text) tick(d.text); });
    on("hatch", onHatch);
    on("named", function (d) { tutEvent("named", d); });
    on("eat", function (d) { tutEvent("eat", d); });
    on("tickle", function (d) { tutEvent("tickle", d); });
    on("learnWord", function (d) { tutEvent("learnWord", d); onFirstWord(d); });
    on("select", function () { refreshPanel(true); });
    on("say", function (d) {
      if (!d.c || !d.text) return;
      var l = chat[d.c.id] || (chat[d.c.id] = []);
      l.push({ text: d.text, t: G.time });
      if (l.length > 6) l.shift();
      if (G.selectedId === d.c.id) panelChatDirty = true;
    });
    on("death", function (d) {
      if (d.c && d.c.species === "smol") { toast({ icon: "🕊", title: (d.c.name || "a smol") + " has passed on", desc: d.cause === "old" ? "a full life." : d.cause ? "cause: " + d.cause : "", ms: 5000 }); }
    });
    on("grumpArrive", function (d) {
      var t = now();
      if (t - lastGrumpToast > 90000) {
        lastGrumpToast = t;
        toast({ icon: "👺", title: "grumps are out", desc: "they're heading for your smols. tap here to look, then 👆 tap them till they run home.", ms: 6000,
          onClick: function () { var g = d && d.c; if (g && g.alive) call("Render", "centerOn", g.x); } });
      }
    });
    bound = true;
  }
  var lastGrumpToast = -1e9;

  function onClick(e) {
    var t = e.target.closest("button, [data-act]");
    if (!t || !root.contains(t)) return;
    var d = t.dataset || {};
    if (d.tool) { setTool(d.tool); return; }
    if (d.speed != null) { setSpeed(+d.speed); return; }
    if (d.word) { talkFromBar(d.word); return; }
    if (d.sel != null) {
      var c = creatureById(+d.sel);
      if (c && c.alive) { selectC(c, true); if (d.close) closeModal(); }
      return;
    }
    var a = d.act;
    if (!a) return;
    switch (a) {
      case "menu": openMenu(); break;
      case "pause": togglePause(); break;
      case "cycle": { var i = SB.SPEEDS.indexOf(G.speed); var nx = SB.SPEEDS[(i + 1) % SB.SPEEDS.length] || 1; setSpeed(nx === 0 ? 1 : nx); break; }
      case "resume": if (SB.Game && SB.Game.hostPaused) SB.Game.hostPaused = false; setSpeed(G.speed || lastSpeed || 1); break;
      case "talk-send": talkFromBar(E.talkInput.value); E.talkInput.value = ""; break;
      case "brain": openBrain(); break;
      case "brain-close": closeBrain(); break;
      case "panel-toggle": panelCollapsed = !panelCollapsed; userToggledPanel = true; refreshPanel(true); break;
      case "deselect": deselect(); break;
      case "follow": { var s = selected(); if (s) { var cam = camera(); follow(cam && cam.follow === s.id ? null : s.id); refreshPanel(true); } break; }
      case "card": { var s2 = selected(); if (s2) openCard(s2); break; }
      case "share": { var s3 = selected(); if (s3) openExport(s3); break; }
      case "family": openFamily(); break;
      case "modal-close": closeModal(); break;
      case "skip-tut": tutDone(); break;
      case "tut-ok": tutDone(); break;
      case "rost": break;
    }
    if (t._fn) t._fn(e);
  }

  function typing(e) { var t = e.target; return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable); }

  function onKey(e) {
    if (!G) return;
    if (typing(e)) return;
    var k = e.key.toLowerCase();
    if (e.key === "Escape") { escape(); return; }
    if (UI.modalOpen) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    switch (k) {
      case "1": setTool("grab"); break;
      case "2": setTool("tickle"); break;
      case "3": setTool("tap"); break;
      case "4": setTool("talk"); openTalk(true); break;
      case " ": e.preventDefault(); togglePause(); break;
      case "[": case "-": case "_": stepSpeed(-1); break;
      case "]": case "=": case "+": stepSpeed(1); break;
      case "t": e.preventDefault(); if (E.talkbar.classList.contains("open") && G.hand.tool !== "talk") closeTalk(); else openTalk(true); break;
      case "b": if (E.brain.classList.contains("open")) closeBrain(); else openBrain(); break;
      case "f": { var s = selected(); if (s) { var cam = camera(); follow(cam && cam.follow === s.id ? null : s.id); refreshPanel(true); } break; }
      case "arrowleft": case "arrowright": case "arrowup": case "arrowdown": case "a": case "d":
        e.preventDefault(); keys[k] = true; follow(null); break;
    }
  }

  function escape() {
    if (UI.modalOpen) { if (!modal || modal.dismiss !== false) closeModal(); return; }
    if (document.activeElement === E.talkInput) { E.talkInput.blur(); return; }
    if (E.talkbar.classList.contains("open")) { closeTalk(); return; }
    if (E.brain.classList.contains("open")) { closeBrain(); return; }
    if (E.tip.classList.contains("open")) { hideTip(); return; }
    if (G.selectedId != null) deselect();
  }

  /* =====================================================================
     toasts, ticker, celebration
     ===================================================================== */

  var toastQueue = [];
  function toast(o) {
    // while a dialog is up, hold toasts and play them when it closes (copy/save confirmations still show)
    if (UI.modalOpen && !o.now) { toastQueue.push(o); if (toastQueue.length > 4) toastQueue.shift(); return null; }
    var n = el("div", { class: "toast " + (o.cls || "") + (o.onClick ? " click" : ""), role: "status" }, [
      el("div", { class: "ti", text: o.icon || "✨" }),
      el("div", null, [el("div", { class: "tt", text: o.title || "" }), o.desc ? el("div", { class: "td", text: o.desc }) : null])
    ]);
    if (o.onClick) n.addEventListener("click", function () { o.onClick(); kill(); });
    E.toasts.appendChild(n);
    while (E.toasts.children.length > 3) E.toasts.removeChild(E.toasts.firstChild);
    var dead = false;
    function kill() { if (dead) return; dead = true; n.classList.add("out"); setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 450); }
    setTimeout(kill, o.ms || (isPhone() ? 2400 : 3200));
    return n;
  }
  UI.toast = toast;
  function flushToasts() {
    var q = toastQueue; toastQueue = [];
    q.forEach(function (o, i) { setTimeout(function () { if (UI.modalOpen) toastQueue.push(o); else toast(o); }, 250 + i * 450); });
  }

  function tick(text) {
    var n = el("div", { class: "tick", text: text });
    E.ticker.appendChild(n);
    while (E.ticker.children.length > 3) E.ticker.removeChild(E.ticker.firstChild);
    setTimeout(function () { n.classList.add("out"); }, 5200);
    setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 5900);
  }

  function celebrate(big, word, who) {
    var kids = [el("div", { class: "big", text: big })];
    if (word) kids.push(el("div", { class: "word", text: "“" + word + "!”" }));
    if (who) kids.push(el("div", { class: "who", text: who }));
    E.celebrate.innerHTML = "";
    kids.forEach(function (k) { E.celebrate.appendChild(k); });
    if (!reduced) {
      var bits = ["🎉", "✨", "💬", "⭐", "💚", "🎊"];
      for (var i = 0; i < 14; i++) {
        var a = (i / 14) * Math.PI * 2, d = 140 + Math.random() * 120;
        var c = el("span", { class: "confetti", text: bits[i % bits.length] });
        c.style.setProperty("--dx", "calc(-50% + " + Math.round(Math.cos(a) * d) + "px)");
        c.style.setProperty("--dy", "calc(-50% + " + Math.round(Math.sin(a) * d) + "px)");
        c.style.setProperty("--rot", Math.round(Math.random() * 360 - 180) + "deg");
        E.celebrate.appendChild(c);
      }
    }
    E.celebrate.classList.remove("open"); void E.celebrate.offsetWidth; E.celebrate.classList.add("open");
    clearTimeout(celebrate.t);
    celebrate.t = setTimeout(function () { E.celebrate.classList.remove("open"); }, 2900);
  }

  function onFirstWord(d) {
    if (!G.tutorial) G.tutorial = { step: 0, done: false };
    if (G.tutorial.firstWord) return;
    G.tutorial.firstWord = true;
    celebrate("first word!", d.word, d.c ? d.c.name + " learned a word. you did that." : "");
    if (window.cc && cc.event) try { cc.event("firstWord", { word: d.word }); } catch (e) {}
  }

  /* =====================================================================
     modals
     ===================================================================== */

  var modal = null; // {onClose, dismiss}

  function openModal(o) {
    if (modal && modal.onClose) { var f = modal.onClose; modal.onClose = null; try { f(); } catch (e) {} }
    modal = { onClose: o.onClose, dismiss: o.dismiss };
    E.modal.className = "modal glass " + (o.cls || "");
    E.modal.innerHTML = "";
    var head = el("div", { class: "m-head" }, [
      el("h2", { html: esc(o.title) + (o.sub ? '<span class="sub">' + esc(o.sub) + "</span>" : "") }),
      o.dismiss === false ? null : el("button", { class: "icon-btn", data: { act: "modal-close" }, "aria-label": "close", text: "✕" })
    ]);
    E.modal.appendChild(head);
    if (o.tabs) E.modal.appendChild(o.tabs);
    var body = el("div", { class: "m-body " + (o.bodyCls || "") });
    if (o.body) (Array.isArray(o.body) ? o.body : [o.body]).forEach(function (b) { if (b) body.appendChild(b); });
    E.modal.appendChild(body);
    if (o.foot && o.foot.length) E.modal.appendChild(el("div", { class: "m-foot " + (o.footCls || "") }, o.foot));
    E.layer.classList.add("open");
    root.classList.add("modal-on");
    UI.modalOpen = true;
    endCarry(false);
    hideTip();
    E.coach.classList.remove("open");
    E.arrow.classList.remove("open");
    return body;
  }
  function closeModal() {
    if (!modal) { E.layer.classList.remove("open"); UI.modalOpen = false; return; }
    var f = modal.onClose;
    modal = null;
    E.layer.classList.remove("open");
    root.classList.remove("modal-on");
    E.modal.innerHTML = "";
    UI.modalOpen = false;
    if (f) try { f(); } catch (e) { console.warn(e); }
    renderCoach();
    flushToasts();
  }
  UI.closeModal = closeModal;

  function btn(label, cls, fn, attrs) {
    var b = el("button", Object.assign({ class: "btn " + (cls || "") }, attrs || {}), label);
    if (fn) b.addEventListener("click", fn);
    return b;
  }

  function copyText(text, okMsg) {
    function done() { toast({ icon: "📋", title: okMsg || "copied!", now: true }); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
    function fallback() {
      var ta = el("textarea", { style: { position: "fixed", left: "-9999px" } }); ta.value = text;
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { toast({ icon: "🤷", title: "couldn't copy", desc: "select the text and copy it by hand.", now: true }); }
      document.body.removeChild(ta);
    }
  }

  /* ---------- menu ---------- */
  function openMenu() {
    var nAch = Object.keys(G.achievements || {}).length;
    var muted = audioMuted();
    var day = Math.floor((G.time || 0) / SB.DAY_LENGTH) + 1;
    var s = G.stats || {};
    var grid = el("div", { class: "menu-grid" }, [
      mbtn("💾", "save now", function () {
        var ok = true; try { if (SB.Save && SB.Save.save) SB.Save.save(G); else ok = false; } catch (e) { ok = false; }
        closeModal(); toast(ok ? { icon: "💾", title: "saved", desc: "your smols are safe in this browser." } : { icon: "😬", title: "couldn't save", desc: "storage might be full or blocked." });
      }),
      mbtn("📖", "smolpedia", function () { openPedia(); }),
      mbtn("📤", "export smol code", function () {
        var c = selected() && selected().species === "smol" ? selected() : smols()[0];
        if (!c) { toast({ icon: "🥚", title: "no smols to share", desc: "hatch one first." }); return; }
        openExport(c);
      }),
      mbtn("🌌", "import smol code", function () { openImport(); }),
      mbtn("🏆", "achievements " + nAch + "/" + SB.ACHIEVEMENTS.length, function () { openAchievements(); }),
      mbtn("🌳", "family tree", function () { openFamily(); }),
      mbtn(muted ? "🔇" : "🔊", muted ? "sound: off" : "sound: on", function () {
        var m = !audioMuted();
        call("Audio", "setMuted", m, "user");
        if (SB.Audio && typeof SB.Audio.setMuted !== "function") SB.Audio.muted = m;
        localMuted = m;
        openMenu();
      }),
      mbtn("🎓", "replay tutorial", function () { closeModal(); tutRestart(); }),
      mbtn("🧨", "new game", function () { UI.confirmRestart(); }, "full")
    ]);
    openModal({
      title: "menu", sub: "day " + day + " · hatched " + (s.hatched || 0) + " · max gen " + (s.maxGen || 1),
      cls: "small", body: [grid, el("p", { class: "muted", style: { marginTop: "12px", marginBottom: "0" }, html: "keys: <b>1-4</b> tools · <b>space</b> pause · <b>[ ]</b> speed · <b>T</b> talk · <b>B</b> brain · <b>F</b> follow · <b>←→</b> pan" })]
    });
  }
  function mbtn(em, label, fn, extra) {
    return btn([el("span", { class: "em", text: em }), el("span", { text: label })], extra || "", fn);
  }
  var localMuted = false;
  function audioMuted() {
    var A = SB.Audio;
    if (!A) return localMuted;
    if (typeof A.isUserMuted === "function") { try { return !!A.isUserMuted(); } catch (e) {} }
    if (typeof A.isMuted === "function") { try { return !!A.isMuted(); } catch (e) {} }
    if (typeof A.muted === "boolean") return A.muted;
    if (A.state && typeof A.state.muted === "boolean") return A.state.muted;
    return localMuted;
  }

  /* ---------- confirm / new game ---------- */
  UI.confirmRestart = function () {
    if (!built || !G) return;
    openModal({
      title: "start over?", cls: "small",
      body: el("p", { html: "this wipes your valley, every smol, every word they learned and the whole family tree. <b>forever.</b> the smols will not remember you. (they barely did anyway.)" }),
      foot: [btn("keep my smols", "", closeModal), btn("🧨 wipe it", "danger", function () {
        closeModal();
        try { call("Save", "wipe"); } catch (e) {}
        if (SB.Game && SB.Game.swap && SB.Game.newGame) SB.Game.swap(SB.Game.newGame());
      })]
    });
  };

  /* ---------- export ---------- */
  function openExport(c) {
    var code = call("Save", "exportSmol", c);
    if (!code) { toast({ icon: "😬", title: "couldn't make a code", desc: "the save module isn't ready." }); return; }
    var ta = el("textarea", { readonly: true, rows: 5 }); ta.value = code;
    ta.addEventListener("focus", function () { ta.select(); });
    G.stats.exported = (G.stats.exported || 0) + 1;
    unlock("share");
    openModal({
      title: "share " + c.name, sub: code.length + " chars", cls: "small",
      body: [el("p", { class: "muted", text: "this code is " + c.name + ": genes, trained brain and every word. send it to a friend; they paste it into “import smol code” and " + c.name + " pops out of their warp gate. (a copy. " + c.name + " stays here too.)" }), ta],
      foot: [btn("🪪 card", "", function () { openCard(c); }), btn("📋 copy code", "primary", function () { copyText(code, "smol code copied"); })]
    });
  }

  /* ---------- import ---------- */
  function openImport() {
    var ta = el("textarea", { rows: 5, placeholder: "paste a SMOL1:… code here" });
    var err = el("div", { class: "err" });
    openModal({
      title: "import smol code", cls: "small",
      body: [el("p", { class: "muted", text: "got a code from a friend? paste it. the smol arrives through the warp gate in the lab, brain and words included." }), ta, err],
      foot: [btn("cancel", "", closeModal), btn("🌌 warp them in", "primary", function () {
        var code = (ta.value || "").trim();
        if (!code) { err.textContent = "paste a code first. the warp gate can't read minds."; return; }
        var data = null;
        try { data = SB.Save && SB.Save.importSmol ? SB.Save.importSmol(code) : null; } catch (e) { data = null; err.textContent = "that code didn't work: " + (e && e.message ? e.message : "it's scrambled") + ". check you copied all of it."; return; }
        if (!data || !data.genome) { err.textContent = "that doesn't look like a smol code. they start with SMOL1:"; return; }
        var gate = objects().filter(function (o) { return o.kind === "warpgate"; })[0];
        var brain = null;
        try { brain = data.brain && SB.Brain && SB.Brain.deserialize ? SB.Brain.deserialize(data.brain, data.genome) : null; } catch (e) { brain = null; }
        var c = null;
        try {
          c = SB.Game.spawnSmol(G, { genome: data.genome, brain: brain || undefined, vocab: data.vocab, name: data.name, gen: data.gen, age: data.age, x: gate ? gate.x : SB.HOME_X });
        } catch (e) { err.textContent = "the warp gate sneezed: " + (e && e.message ? e.message : "unknown error"); return; }
        G.stats.imported = (G.stats.imported || 0) + 1;
        unlock("import");
        if (SB.Game.note) SB.Game.note(G, c.name + " arrived through the warp gate! 🌌");
        closeModal();
        selectC(c, true);
        toast({ icon: "🌌", title: c.name + " has arrived", desc: "gen " + (c.gen || 1) + " · knows " + knownWords(c).length + " words" });
      })]
    });
    setTimeout(function () { try { ta.focus(); } catch (e) {} }, 50);
  }

  function unlock(id) { if (SB.Game && SB.Game.unlock) SB.Game.unlock(G, id); }

  /* ---------- naming ---------- */
  function openNaming(c) {
    if (!c || !c.alive) return;
    var cv = el("canvas");
    var inp = el("input", { type: "text", maxlength: 14, "aria-label": "name", autocomplete: "off", spellcheck: "false" });
    inp.value = c.name || "";
    var applied = false;
    function apply() {
      if (applied) return; applied = true;
      var v = (inp.value || "").trim().slice(0, 14) || c.name;
      renameSmol(c, v);
      selectC(c, true);
    }
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); closeModal(); } e.stopPropagation(); });
    var body = el("div", { class: "namebox" }, [
      cv,
      el("p", { class: "muted", style: { margin: 0 }, text: "a " + stageName(c) + " smol, gen " + (c.gen || 1) + ". it's looking at you. it needs a name." }),
      el("div", { class: "row" }, [inp, btn("🎲", "", function () { inp.value = SB.makeName(G.rng || SB.rng(Date.now())); }, { "aria-label": "shuffle name", title: "random name" })])
    ]);
    openModal({ title: "name your smol", cls: "small", body: body, foot: [btn("that's the one ✓", "primary", function () { closeModal(); })], onClose: apply });
    portrait(cv, lookOf(c), 120, { stage: c.stage });
    if (!("ontouchstart" in window)) setTimeout(function () { try { inp.focus(); inp.select(); } catch (e) {} }, 60);
  }

  function renameSmol(c, name) {
    c.name = name;
    if (G.family && G.family[c.id]) G.family[c.id].name = name;
    unlock("name");
    SB.bus.emit("named", { c: c });
    E.chips._key = null;
    if (E.talkbar.classList.contains("open")) rebuildChips();
    refreshPanel(true);
  }

  function onHatch(d) {
    var c = d.c;
    if (!c || c.species !== "smol") return;
    tutEvent("hatch", d);
    if (!G.tutorial.done || (G.stats && G.stats.hatched <= 1)) openNaming(c);
    else toast({ icon: "🐣", title: c.name + " hatched!", desc: "tap to name them", onClick: function () { openNaming(c); }, ms: 7000 });
  }

  /* ---------- achievements ---------- */
  function openAchievements() {
    var got = G.achievements || {};
    var n = SB.ACHIEVEMENTS.filter(function (a) { return got[a.id]; }).length;
    var grid = el("div", { class: "ach-grid" }, SB.ACHIEVEMENTS.map(function (a) {
      var g = !!got[a.id];
      return el("div", { class: "ach " + (g ? "got" : "locked"), title: g ? "unlocked " + new Date(got[a.id]).toLocaleDateString() : "locked" }, [
        el("div", { class: "ai", text: a.icon }), el("div", { class: "an", text: a.name }), el("div", { class: "ad", text: a.desc })
      ]);
    }));
    openModal({ title: "achievements", sub: n + "/" + SB.ACHIEVEMENTS.length, cls: "wide", body: [el("div", { class: "progress" }, el("div", { style: { width: (100 * n / SB.ACHIEVEMENTS.length) + "%" } })), grid] });
  }

  /* ---------- family tree ---------- */
  function openFamily() {
    var fam = G.family || {};
    var list = Object.keys(fam).map(function (k) { return fam[k]; });
    if (!list.length) {
      openModal({ title: "family tree", cls: "small", body: el("p", { class: "empty", text: "no smols yet. the tree is a twig. hatch an egg to plant it." }) });
      return;
    }
    var gens = {};
    list.forEach(function (f) { var g = f.gen || 1; (gens[g] = gens[g] || []).push(f); });
    var gkeys = Object.keys(gens).map(Number).sort(function (a, b) { return a - b; });
    var STEP = 90, ROWH = 112, LEFT = 30, pos = {};
    var maxN = 0;
    gkeys.forEach(function (g) { maxN = Math.max(maxN, gens[g].length); });
    var W = Math.max(320, LEFT + maxN * STEP + 10), H = gkeys.length * ROWH + 10;
    var wrap = el("div", { class: "tree", style: { width: W + "px", height: H + "px" } });
    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", W); svg.setAttribute("height", H);
    wrap.appendChild(svg);
    var selId = G.selectedId;
    var toDraw = [];
    gkeys.forEach(function (g, row) {
      var arr = gens[g];
      arr.forEach(function (f) {
        var px = (f.parents || []).map(function (p) { return pos[p] ? pos[p].x : null; }).filter(function (v) { return v != null; });
        f._ord = px.length ? px.reduce(function (a, b) { return a + b; }, 0) / px.length : -1e6 + (f.born || 0);
      });
      arr.sort(function (a, b) { return a._ord - b._ord || (a.born || 0) - (b.born || 0); });
      var rowW = arr.length * STEP, x0 = LEFT + (W - LEFT - rowW) / 2;
      wrap.appendChild(el("div", { class: "genlbl", style: { top: (row * ROWH + 22) + "px" }, text: "G" + g }));
      arr.forEach(function (f, i) {
        var x = x0 + i * STEP, y = row * ROWH + 4;
        pos[f.id] = { x: x + 38, y: y };
        var live = creatureById(f.id);
        var alive = !!(live && live.alive && f.died == null);
        var cv = el("canvas");
        var node = el("button", { class: "tnode " + (alive ? "alive" : "dead") + (f.id === selId ? " sel" : ""), style: { left: x + "px", top: y + "px" }, data: alive ? { sel: f.id, close: "1" } : null, title: f.name + (alive ? " (tap to select)" : " 🕊") }, [
          cv, el("div", { class: "tn", text: (alive ? "" : "🕊 ") + (f.name || "?") }), el("div", { class: "tg", text: alive ? stageName(live) + " · IQ " + iqOf(live) : (f.cause || "gone") })
        ]);
        wrap.appendChild(node);
        toDraw.push({ cv: cv, look: f.look || (live && live.look), stage: live ? live.stage : 3 });
        (f.parents || []).forEach(function (p) {
          var pp = pos[p];
          if (!pp) return;
          var path = document.createElementNS(svgNS, "path");
          var sy = pp.y + 60 + 26, ey = y;
          path.setAttribute("d", "M" + pp.x + " " + sy + " C" + pp.x + " " + (sy + 20) + " " + (x + 38) + " " + (ey - 20) + " " + (x + 38) + " " + ey);
          path.setAttribute("fill", "none");
          path.setAttribute("stroke", alive ? "rgba(197,255,73,.55)" : "rgba(245,243,237,.25)");
          path.setAttribute("stroke-width", "2");
          svg.appendChild(path);
        });
      });
    });
    var alive = list.filter(function (f) { var c = creatureById(f.id); return c && c.alive; }).length;
    openModal({ title: "family tree", sub: list.length + " smols · " + alive + " alive · " + gkeys.length + " generations", cls: "wide", bodyCls: "nopad", body: el("div", { class: "treewrap" }, wrap) });
    toDraw.forEach(function (t) { portrait(t.cv, t.look, 56, { stage: t.stage }); });
  }

  /* ---------- creature card ---------- */
  function knownWords(c) {
    var v = (c && c.vocab) || {};
    return Object.keys(v).filter(function (w) { return v[w] >= 1; }).sort(function (a, b) { return v[b] - v[a]; });
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function drawCard(c, code) {
    var W = 1080, H = 1350;
    var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var ctx = cv.getContext("2d");
    var mono = "JBM, ui-monospace, Menlo, monospace", sans = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    var look = lookOf(c);
    // background
    ctx.fillStyle = "#101114"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(245,243,237,0.05)";
    for (var gx = 60; gx < W; gx += 40) for (var gy = 60; gy < H; gy += 40) ctx.fillRect(gx, gy, 2, 2);
    // frame
    ctx.strokeStyle = "#c5ff49"; ctx.lineWidth = 8; rr(ctx, 30, 30, W - 60, H - 60, 44); ctx.stroke();
    // header
    ctx.fillStyle = "#c5ff49"; ctx.font = "800 40px " + mono; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    ctx.fillText("smol brains", 80, 112);
    ctx.textAlign = "right"; ctx.fillStyle = "#b59aff"; ctx.fillText("gen " + (c.gen || 1), W - 80, 112);
    // portrait stage
    var cx = W / 2, cy = 470;
    var grd = ctx.createRadialGradient(cx, cy - 40, 30, cx, cy, 330);
    grd.addColorStop(0, "hsla(" + look.hue + ",80%,72%,0.95)"); grd.addColorStop(1, "hsla(" + (look.hue2 != null ? look.hue2 : look.hue) + ",60%,40%,0.25)");
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cx, cy, 310, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(245,243,237,0.15)"; ctx.lineWidth = 4; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 306, 0, Math.PI * 2); ctx.clip();
    var drew = false;
    if (has("Render", "portrait")) { try { SB.Render.portrait(ctx, look, cx, cy + 10, 540, { stage: c.stage, mood: "happy" }); drew = true; } catch (e) {} }
    if (!drew) blob(ctx, look, cx, cy + 30, 200);
    ctx.restore();
    // name
    ctx.textAlign = "center"; ctx.fillStyle = "#f5f3ed";
    var nm = c.name || "smol", fs = 112;
    ctx.font = "800 " + fs + "px " + mono;
    while (ctx.measureText(nm).width > W - 200 && fs > 50) { fs -= 6; ctx.font = "800 " + fs + "px " + mono; }
    ctx.fillText(nm, cx, 900);
    ctx.font = "600 38px " + sans; ctx.fillStyle = "rgba(245,243,237,0.7)";
    ctx.fillText("gen " + (c.gen || 1) + " · IQ " + iqOf(c) + " · " + ageText(c.age) + " " + stageName(c), cx, 960);
    // chips
    function chips(words, y, fill, ink, max) {
      ctx.font = "700 32px " + sans;
      var rows = [[]], rowW = [0], pad = 26, gap = 14, maxW = W - 180;
      words.slice(0, max).forEach(function (w) {
        var ww = ctx.measureText(w).width + pad * 2;
        if (rowW[rowW.length - 1] + ww > maxW && rows[rows.length - 1].length) { rows.push([]); rowW.push(0); }
        rows[rows.length - 1].push({ w: w, ww: ww }); rowW[rowW.length - 1] += ww + gap;
      });
      rows.slice(0, 2).forEach(function (r, ri) {
        var x = cx - (rowW[ri] - gap) / 2, yy = y + ri * 64;
        r.forEach(function (ch) {
          ctx.fillStyle = fill; rr(ctx, x, yy, ch.ww, 52, 26); ctx.fill();
          if (fill === "transparent") { ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.stroke(); }
          ctx.fillStyle = ink; ctx.textAlign = "center"; ctx.fillText(ch.w, x + ch.ww / 2, yy + 37);
          x += ch.ww + gap;
        });
      });
      return Math.min(2, rows.length);
    }
    var traits = (c.genome && call("Genome", "traits", c.genome)) || [];
    chips(traits.slice(0, 4), 995, "transparent", "#b59aff", 4);
    var kw = knownWords(c);
    var learning = Object.keys(c.vocab || {}).filter(function (w) { return c.vocab[w] >= 0.25 && c.vocab[w] < 1; }).map(function (w) { return w + "?"; });
    if (!kw.length && learning.length) kw = learning.slice(0, 8);
    var used = chips(kw.length ? kw : ["no words yet"], 1065, kw.length ? "#c5ff49" : "rgba(245,243,237,0.12)", kw.length ? "#101114" : "rgba(245,243,237,0.6)", 12);
    // mini brain
    var by = used > 1 ? 1190 : 1140;
    miniBrain(ctx, c.brain, 120, by, W - 240, 1222 - by);
    // footer
    ctx.textAlign = "center";
    if (code) { ctx.font = "800 26px " + mono; ctx.fillStyle = "#c5ff49"; ctx.fillText(String(code).slice(0, 16) + "…", cx, H - 92); }
    ctx.font = "700 25px " + sans; ctx.fillStyle = "rgba(245,243,237,0.55)";
    ctx.fillText("smol brains · computercooked.com/games/smol-brains", cx, H - 56);
    return cv;
  }

  function miniBrain(ctx, b, x, y, w, h) {
    if (!b || !b.w1 || !b.nHid) return;
    var nIn = b.nIn || SB.N_IN, nH = b.nHid, nO = b.nOut || SB.N_VERBS;
    function px(i, n) { return x + (n === 1 ? w / 2 : (i / (n - 1)) * w); }
    var y0 = y, y1 = y + h / 2, y2 = y + h;
    var edges = [];
    for (var j = 0; j < nH; j++) {
      for (var i = 0; i < nIn; i++) edges.push([px(i, nIn), y0, px(j, nH), y1, b.w1[j * nIn + i]]);
      for (var k = 0; k < nO; k++) edges.push([px(j, nH), y1, x + w * 0.1 + (k / (nO - 1)) * w * 0.8, y2, b.w2[k * nH + j]]);
    }
    edges.sort(function (a, c) { return Math.abs(c[4]) - Math.abs(a[4]); });
    var top = edges.slice(0, 160), mx = Math.abs(top[0] ? top[0][4] : 1) || 1;
    ctx.lineWidth = 2;
    top.forEach(function (e) {
      ctx.strokeStyle = e[4] >= 0 ? "rgba(197,255,73," + (0.1 + 0.5 * Math.abs(e[4]) / mx) + ")" : "rgba(255,95,162," + (0.1 + 0.5 * Math.abs(e[4]) / mx) + ")";
      ctx.beginPath(); ctx.moveTo(e[0], e[1]); ctx.lineTo(e[2], e[3]); ctx.stroke();
    });
    ctx.fillStyle = "rgba(245,243,237,0.5)";
    for (var a = 0; a < nIn; a++) { ctx.beginPath(); ctx.arc(px(a, nIn), y0, 3, 0, 7); ctx.fill(); }
    ctx.fillStyle = "#b59aff";
    for (var bb = 0; bb < nH; bb++) { ctx.beginPath(); ctx.arc(px(bb, nH), y1, 6, 0, 7); ctx.fill(); }
    ctx.fillStyle = "#c5ff49";
    for (var c2 = 0; c2 < nO; c2++) { ctx.beginPath(); ctx.arc(x + w * 0.1 + (c2 / (nO - 1)) * w * 0.8, y2, 5, 0, 7); ctx.fill(); }
  }

  function openCard(c) {
    var code = call("Save", "exportSmol", c) || "";
    var img = el("img", { class: "cardprev", alt: c.name + "'s creature card" });
    var cv = null;
    function render() {
      cv = drawCard(c, code);
      try { img.src = cv.toDataURL("image/png"); } catch (e) {}
    }
    try { if (document.fonts && document.fonts.load) document.fonts.load('800 40px "JBM"').then(render, render); } catch (e) {}
    render();
    unlock("share");
    var fname = (c.name || "smol").toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-smol-card.png";
    var foot = [
      btn("⬇️ download", "", function () {
        if (!cv) return;
        var a = el("a", { href: cv.toDataURL("image/png"), download: fname });
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        G.stats.exported = (G.stats.exported || 0) + 1;
      })
    ];
    if (navigator.share) foot.push(btn("📤 share", "", function () {
      if (!cv || !cv.toBlob) return;
      cv.toBlob(function (blob) {
        var data = { title: c.name + " · smol brains", text: "meet " + c.name + ", my gen " + (c.gen || 1) + " smol. IQ " + iqOf(c) + ". raise your own: computercooked.com/games/smol-brains" };
        try {
          var f = new File([blob], fname, { type: "image/png" });
          if (navigator.canShare && navigator.canShare({ files: [f] })) data.files = [f];
        } catch (e) {}
        navigator.share(data).catch(function () {});
      }, "image/png");
    }));
    if (code) foot.push(btn("📋 copy code", "primary", function () { copyText(code, "smol code copied"); }));
    openModal({ title: c.name + "'s card", cls: "small", body: img, foot: foot });
  }

  /* ---------- smolpedia ---------- */
  var PEDIA_TABS = ["smols", "grumps", "things", "feelings", "words", "brains", "body", "genes", "tips"];
  var pediaTab = "smols";

  function openPedia(tab) {
    if (tab) pediaTab = tab;
    var tabs = el("div", { class: "tabs", role: "tablist" });
    var body;
    function show(t) {
      pediaTab = t;
      Array.prototype.forEach.call(tabs.children, function (b) {
        b.classList.toggle("on", b.dataset.t === t);
        if (b.dataset.t === t) { try { tabs.scrollLeft = Math.max(0, b.offsetLeft - tabs.clientWidth / 2 + b.offsetWidth / 2); } catch (e) {} }
      });
      body.innerHTML = "";
      body.scrollTop = 0;
      var c = PEDIA[t]();
      (Array.isArray(c) ? c : [c]).forEach(function (n) { body.appendChild(n); });
    }
    PEDIA_TABS.forEach(function (t) {
      var b = el("button", { class: "tab", role: "tab", data: { t: t }, text: t });
      b.addEventListener("click", function () { show(t); });
      tabs.appendChild(b);
    });
    body = openModal({ title: "smolpedia", sub: "everything a smol parent should know", cls: "wide", tabs: tabs, bodyCls: "pedia" });
    show(pediaTab);
  }

  function H(t) { return el("h3", { text: t }); }
  function P(h) { return el("p", { html: h }); }
  function UL(items) { return el("ul", null, items.map(function (h) { return el("li", { html: h }); })); }
  function cardEl(em, name, desc, extra) {
    return el("div", { class: "card" }, [el("div", { class: "ce", text: em }), el("div", null, [el("div", { class: "cn", text: name }), el("div", { class: "cd", text: desc }), extra ? el("div", { class: "cw", text: extra }) : null])]);
  }

  var PEDIA = {
    smols: function () {
      var st = SB.STAGES.map(function (s, i) {
        var nx = SB.STAGES[i + 1];
        return "<b>" + s.name + "</b> " + (nx ? "· " + Math.round(s.from / 60) + "–" + Math.round(nx.from / 60) + " min" : "· " + Math.round(s.from / 60) + " min until the end");
      });
      return [
        H("what's a smol?"),
        P("a smol is a tiny round creature with a <b>real neural network</b> for a brain, a body full of chemicals, and a genome it got from its parents. nothing it does is scripted. it looks around, picks something to pay attention to, guesses which action will make it feel better, tries it, and learns from what happened. so: it will do dumb things. that's the point. you're the parent, not the puppeteer."),
        H("growing up"),
        P("smols hatch as babies and grow up as sim time passes (minutes below are at 1× speed; a day is " + Math.round(SB.DAY_LENGTH / 60) + " minutes):"),
        UL(st),
        P("babies babble. kids start saying real words and little sentences (“want ball”). adults can fall in love and make eggs. elders are wise, slow, and eventually say goodbye after about " + Math.round(SB.BASE_LIFESPAN / SB.DAY_LENGTH) + " in-game days, give or take what their <b>lifespan</b> gene says. the family tree remembers them."),
        H("raising one"),
        UL([
          "<b>feed it.</b> hunger is the first thing a baby feels. drag food to it with ✋ grab, or let it find the trees.",
          "<b>reward the good stuff.</b> 🪶 tickle right after it does something smart. the brain credits whatever it just did.",
          "<b>discourage the bad stuff.</b> 👆 tap after it eats a red shroom or hits a friend. gently. it's smol.",
          "<b>talk to it.</b> 💬 tap a thing to say its name. smols looking at it learn the word after a few tries.",
          "<b>keep it company.</b> lonely smols are sad smols. friends, cuddles and the hand all help."
        ])
      ];
    },
    grumps: function () {
      return [
        H("grumps"),
        P("spiky little purple goblins with too many teeth. they live in the <b>grump cave</b> in Grump Hollow (far left of the valley), sleep all day, and come out <b>at night</b>."),
        H("what they get up to"),
        UL([
          "<b>hitting smols.</b> it hurts (pain), it's scary (fear), and it can make a smol sick: grumps carry <b>antigens</b>.",
          "<b>stealing food.</b> they pick it up and wander off with it. rude.",
          "<b>teaching bad habits.</b> smols learn by watching. a smol that watches a grump hit things may start hitting things too.",
          "<b>going home at dawn.</b> grumps hate the sun. they waddle back to the cave in the morning."
        ]),
        H("dealing with grumps"),
        UL([
          "👆 <b>tap a grump</b> a few times and it gets scared and runs home. (achievement: Shoo!)",
          "✋ <b>grab one</b> and yeet it back toward the hollow. very satisfying. throw speed counts.",
          "teach your smols to <b>run</b> from grumps (instinct: scared + grump → run). tickle a smol that flees.",
          "keep smols near the meadow at night: beds, the heater, friends."
        ]),
        P("grumps have small brains (6–11 hidden neurons) and grumpy genes. they can learn too, technically. mostly they learn that hitting is fun.")
      ];
    },
    things: function () {
      var kinds = Object.keys(SB.KINDS).map(function (k) { return [k, SB.KINDS[k]]; });
      var loose = kinds.filter(function (k) { return !k[1].fixed; }), fixed = kinds.filter(function (k) { return k[1].fixed; });
      function cards(arr) { return el("div", { class: "cards" }, arr.map(function (k) { return cardEl(k[1].emoji, k[1].label, k[1].desc, "smol word: “" + (SB.NOUN_WORDS[SB.N[k[1].noun]] || k[1].noun) + "”"); })); }
      return [H("things you can carry"), P("drag these with ✋ grab, throw them, or tap them with 💬 talk to teach their word."), cards(loose), H("fixtures"), P("these stay put. smols use them by playing with them (push, poke, sit). tap one with ✋ to read about it."), cards(fixed)];
    },
    feelings: function () {
      var fixes = {};
      SB.GOOD.forEach(function (g) { (fixes[g.drive] = fixes[g.drive] || []).push(g.verb + " " + SB.NOUN_WORDS[SB.N[g.noun]]); });
      var extra = { hot: "play fan, stay out of Sunny Pond at noon", cold: "play heater, cuddle, stay off Frost Peak", bored: "play with anything fun", anger: "hit something (a ball, ideally, not a friend)", pain: "rest, medi", hunger: "eat food" };
      return [
        H("drives"),
        P("a smol's feelings are just chemical levels from 0 to 1, and it wants them <b>low</b>. when an action makes a drive go down, that drop is the <b>reward</b> its brain learns from. how much each drive matters is set by genes, so some smols care a lot more about snacks than friends."),
        el("div", { class: "cards" }, SB.DRIVES.map(function (d, i) {
          return cardEl(SB.DRIVE_EMOJI[i], d, "fix: " + ((fixes[d] || []).join(", ") || extra[d] || "time"), "smol word: “" + SB.DRIVE_WORDS[i] + "”");
        })),
        H("mood"),
        P("the little dot and emoji over a smol sum it up: 😊 happy, 🙂 ok, 😢 sad, 🤢 sick, 😱 scared, 😠 angry, 😴 sleepy.")
      ];
    },
    words: function () {
      var who = {};
      smols().forEach(function (c) { knownWords(c).forEach(function (w) { (who[w] = who[w] || []).push(c.name); }); });
      function group(title, words, emo) {
        return [H(title), el("div", { class: "wordgroup" }, words.map(function (w, i) {
          var k = who[w] || [];
          return el("div", { class: "wordpill" + (k.length ? " k" : ""), title: k.length ? "known by " + k.join(", ") : "nobody knows this yet" }, [
            (emo ? emo[i] + " " : ""), el("b", { text: w }), el("span", { text: k.length ? k.slice(0, 3).join(", ") + (k.length > 3 ? " +" + (k.length - 3) : "") : "—" })
          ]);
        }))];
      }
      var total = Object.keys(who).length;
      return [].concat(
        [P("smols can learn " + SB.ALL_WORDS.length + " words. your smols know <b>" + total + "</b> of them between them. a word counts as known once its strength passes 1 (the meter in the smol panel).")],
        group("verbs: things to do", SB.VERB_WORDS, SB.VERB_EMOJI),
        [P("say a verb while a smol is doing it to teach it. say it any other time and it's a <b>command</b>: the “heard” neurons light up, and if you tickle the smol for obeying, it learns to listen. it won't obey just because you asked. relatable.")],
        group("nouns: things", SB.NOUN_WORDS, SB.NOUN_EMOJI),
        [P("tap a thing with 💬 talk. any smol looking at it hears the word with the thing in view. three-ish repetitions and it sticks.")],
        group("feelings", SB.DRIVE_WORDS, SB.DRIVE_EMOJI),
        [P("feeling words come from the <b>Word Machine</b> in the Lab. a smol that knows them can tell you “Bobo hungry”."),
          H("praise"), el("div", { class: "wordgroup" }, [el("div", { class: "wordpill" }, ["👍 ", el("b", { text: "good" }), el("span", { text: "= a little tickle" })]), el("div", { class: "wordpill" }, ["👎 ", el("b", { text: "bad" }), el("span", { text: "= a little tap" })])]),
          P("synonyms work too: “stop” means wait, “apple” means food, “kiss” means hug, and so on.")]
      );
    },
    brains: function () {
      return [
        H("a real brain, but smol"),
        P("every smol has a small neural network built from its genes. it's the same idea as the brains in big AI, just tiny enough to watch."),
        brainDiagram(),
        UL([
          "<b>45 inputs</b> (the perception lobe): its 12 drives, which of 16 kinds of thing it's looking at, which of 12 verbs it just heard, plus “heard its name”, “near it”, “holding something”, “it's dark” and a constant bias.",
          "<b>attention</b>: a separate little layer picks <i>what</i> to look at, from drives plus salience (close, moving, new, or something you just named). it learns too: a hungry smol learns to look at food.",
          "<b>6 to 24 hidden neurons</b> (brain-size gene) mix those inputs into concepts like “hungry and sees food”.",
          "<b>12 outputs</b>, one per verb. each one is the brain's guess of how good that action would feel right now. the smol usually picks the best guess, but the <b>curiosity</b> gene adds randomness so it keeps trying new things."
        ]),
        H("how it learns"),
        P("after each action the brain compares what it <i>expected</i> to feel with what it <i>actually</i> felt (drives going down = good, plus any tickle 🪶 or tap 👆). the difference, the <b>surprise</b>, nudges the weights that led to the choice. this is called reward-modulated learning; it's a tiny cousin of reinforcement learning."),
        P("recent decisions stay <b>eligible</b> for a few seconds (the original Creatures called this dendrite susceptibility), so a tickle a moment late still rewards the right thing. tickle late and it might credit the wrong action. that's how smols learn weird superstitions."),
        H("instincts and dreams"),
        P("genes carry instincts like “hungry + food → eat”. a newborn dreams them as practice lessons before hatching, so it starts with hunches, not knowledge. mutated instincts make babies with very strange hunches."),
        H("watching each other"),
        P("smols copy what they see others do. good smols teach good habits. grumps teach hitting. choose your smol's friends carefully."),
        H("the brain viewer 🧠"),
        P("select a smol and press 🧠. lines are weights: <b style='color:#c5ff49'>lime</b> excites, <b style='color:#ff5fa2'>pink</b> inhibits, brighter = stronger. white flashes show where learning <i>just</i> changed a weight. the outputs on the right are its guesses; the highlighted one is what it chose.")
      ];
    },
    body: function () {
      return [
        H("chemistry"),
        P("under the fluff, a smol is a bag of chemicals, and the chemicals <i>are</i> its feelings."),
        UL([
          "<b>glucose</b> is energy. food delivers it, the body burns it at the <b>metabolism</b> gene's rate. low glucose raises hunger.",
          "<b>fat</b> buffers glucose. a well-fed smol can skip a meal. a starving one loses health.",
          "<b>reward</b> and <b>punish</b> are the teaching chemicals. drive relief makes reward; tickles add it; taps add punish. the brain learns from both.",
          "<b>adrenaline</b> spikes when scared: faster legs, worse sleep.",
          "<b>toxin</b> comes from red shrooms. it causes sickness and drains health until it wears off.",
          "<b>antigen</b> is germs, from grumps and rotten food. it multiplies until <b>antibodies</b> (the <b>immunity</b> gene) catch up. that's being sick.",
          "<b>medicine</b> (healroot 🌿, medi pills 💊 from the Medbot) helps antibodies win and soothes pain.",
          "<b>health</b> is the bottom line. zero health means goodbye."
        ]),
        H("temperature"),
        P("each biome has a temperature, nights are colder, snow chills and noon at Sunny Pond is toasty. cold and hot are drives. heaters, fans, beds and cuddles help."),
        H("sleep"),
        P("sleep restores tiredness and sleepiness and <b>consolidates learning</b>. a bed makes it twice as restful. smols that never sleep get cranky and learn badly. just like you.")
      ];
    },
    genes: function () {
      return [
        H("the genome"),
        P("each smol has ~38 genes (numbers from 0 to 1) plus 12 drive weights and a list of instincts. genes decide how it looks (colours, ears, eyes, tail, pattern, size), its brain (size, learning speed, curiosity, memory), its temperament (brave, chatty, playful, grumpy, obedient…) and its body (metabolism, immunity, lifespan, voice)."),
        H("eggs and breeding"),
        P("two grown-up smols who love each other (the love drive, cuddling) can make an <b>egg</b> 🥚. eggs need warmth: the incubator 🧺, cuddles, or the hand (tap the egg). keep it warm and it hatches."),
        UL([
          "<b>crossover</b>: each gene comes from one parent, sometimes a blend of both.",
          "<b>mutation</b>: each gene has about a 5% chance to wiggle. rarely a gene jumps somewhere totally new.",
          "<b>instincts</b> are inherited, and can be lost, duplicated or rewired. a rewired instinct might make a baby that thinks “hungry + ball → eat”. good luck.",
          "the egg remembers what mutated, and the family tree tracks generations."
        ]),
        P("the <b>brain is not inherited</b>, only the genes that build it. every smol has to learn the world itself. but a smart-genes smol learns a lot faster."),
        H("sharing"),
        P("a <b>smol code</b> packs genes, the trained brain and vocabulary into one string. send it to a friend: their copy arrives through the warp gate 🌌 knowing everything yours knew.")
      ];
    },
    tips: function () {
      return [
        H("tips from experienced smol parents"),
        UL([
          "tickle <b>right after</b> the good thing. a second later is fine. ten seconds later rewards whatever it's doing now.",
          "teach nouns first (food, ball), then verbs while it does them (“eat” while eating).",
          "a <b>bored</b> smol explores. give it a ball before it finds the red shrooms.",
          "speed up time (⏩) when everyone's asleep. slow down when teaching.",
          "<b>follow</b> a smol (F) to keep the camera on it.",
          "the brain viewer is the cheat code. if the eat neuron lights up for shrooms, you know what to tap.",
          "the hand can drop a sick smol right next to the Medbot.",
          "IQ measures how well the brain does on a test of sensible choices (hungry + food → eat, scared + grump → run…) minus the dumb ones. teach well, breed the clever ones.",
          "your valley autosaves every 20 seconds. smol codes are the best backup for a favourite."
        ])
      ];
    }
  };

  function brainDiagram() {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 520 200"); svg.setAttribute("class", "diagram"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "inputs to hidden neurons to actions");
    var ins = [["🍎 hungry", 1], ["😴 sleepy", 0.2], ["👀 sees food", 1], ["👂 heard “eat”", 0.6], ["🌙 dark", 0]];
    var hid = [0.9, -0.3, 0.6, 0.1, -0.7];
    var outs = [["eat", 0.71, true], ["play", 0.2], ["sleep", 0.05], ["run", -0.3]];
    var h = "";
    function y(i, n) { return 26 + i * (150 / (n - 1)); }
    ins.forEach(function (a, i) { hid.forEach(function (v, j) { var w = Math.sin(i * 3.1 + j * 1.7); h += '<line x1="150" y1="' + y(i, 5) + '" x2="260" y2="' + y(j, 5) + '" stroke="' + (w > 0 ? "#c5ff49" : "#ff5fa2") + '" stroke-opacity="' + (0.1 + Math.abs(w) * a[1] * 0.6).toFixed(2) + '" stroke-width="2"/>'; }); });
    hid.forEach(function (v, j) { outs.forEach(function (o, k) { var w = Math.cos(j * 2.3 + k * 1.3); h += '<line x1="260" y1="' + y(j, 5) + '" x2="380" y2="' + y(k, 4) + '" stroke="' + (w > 0 ? "#c5ff49" : "#ff5fa2") + '" stroke-opacity="' + (0.12 + Math.abs(w * v) * 0.6).toFixed(2) + '" stroke-width="2"/>'; }); });
    ins.forEach(function (a, i) { h += '<circle cx="150" cy="' + y(i, 5) + '" r="5" fill="' + (a[1] > 0.3 ? "#f5f3ed" : "#555") + '"/><text x="140" y="' + (y(i, 5) + 4) + '" text-anchor="end" font-size="12" fill="' + (a[1] > 0.3 ? "#f5f3ed" : "#888") + '">' + a[0] + "</text>"; });
    hid.forEach(function (v, j) { h += '<circle cx="260" cy="' + y(j, 5) + '" r="' + (5 + Math.abs(v) * 7) + '" fill="' + (v > 0 ? "#c5ff49" : "#ff5fa2") + '" fill-opacity="' + (0.3 + Math.abs(v) * 0.7) + '"/>'; });
    outs.forEach(function (o, k) {
      var yy = y(k, 4);
      if (o[2]) h += '<rect x="372" y="' + (yy - 12) + '" width="140" height="24" rx="12" fill="#c5ff49" fill-opacity=".18"/>';
      h += '<circle cx="380" cy="' + yy + '" r="6" fill="' + (o[2] ? "#c5ff49" : "#888") + '"/><text x="394" y="' + (yy + 4) + '" font-size="12" fill="' + (o[2] ? "#c5ff49" : "#bbb") + '">' + o[0] + " " + o[1].toFixed(2) + "</text>";
    });
    h += '<text x="150" y="196" text-anchor="middle" font-size="11" fill="#b59aff">senses</text><text x="260" y="196" text-anchor="middle" font-size="11" fill="#b59aff">hidden</text><text x="400" y="196" text-anchor="middle" font-size="11" fill="#b59aff">actions</text>';
    svg.innerHTML = h;
    return svg;
  }

  /* =====================================================================
     smol panel
     ===================================================================== */

  var panelFor = null, panelCollapsed = false, userToggledPanel = false, panelChatDirty = false;
  var chat = {}; // creature id -> [{text, t}]
  var P_ = {}; // live refs inside panel body

  function refreshPanel(force) {
    var c = selected();
    var open = !!c;
    E.panel.classList.toggle("open", open);
    root.classList.toggle("has-panel", open);
    root.classList.toggle("has-nopanel", !open);
    if (!open) { panelFor = null; if (E.brain.classList.contains("open")) drawBrainNow(); rebuildChipsIfOpen(); return; }
    if (force || panelFor !== c.id) {
      if (panelFor !== c.id && !userToggledPanel) panelCollapsed = isCompact();
      panelFor = c.id;
      buildPanelBody(c);
      rebuildChipsIfOpen();
    }
    E.panel.classList.toggle("collapsed", panelCollapsed);
    setText(E.pToggle, panelCollapsed ? "more ▴" : "less ▾");
    E.pToggle.setAttribute("aria-expanded", panelCollapsed ? "false" : "true");
    updatePanel(c);
  }
  function rebuildChipsIfOpen() { if (E.talkbar.classList.contains("open")) rebuildChips(); }

  function bar(color, emoji, label) {
    var f = el("div", { class: "f", style: { background: color } }), n = el("span", { class: "n", text: label });
    var b = el("div", { class: "bar", title: label }, [el("span", { class: "e", text: emoji }), el("div", { class: "t" }, [f, n])]);
    b._f = f;
    return b;
  }

  function buildPanelBody(c) {
    var grump = c.species === "grump";
    P_ = {};
    E.pBody.innerHTML = "";
    E.pName.readOnly = grump;
    E.pName.value = c.name || (grump ? "grump" : "smol");
    portrait(E.pPor, lookOf(c), 52, { stage: c.stage, mood: moodOf(c) });
    var cam = camera();
    var following = cam && cam.follow === c.id;
    var acts = el("div", { class: "p-actions" }, [
      el("button", { class: "btn" + (following ? " on" : ""), data: { act: "follow" }, "aria-pressed": following ? "true" : "false" }, [el("span", { class: "em", text: "🎥" }), following ? "following" : "follow"]),
      grump ? null : el("button", { class: "btn", data: { act: "card" } }, [el("span", { class: "em", text: "🪪" }), "card"]),
      grump ? null : el("button", { class: "btn", data: { act: "share" } }, [el("span", { class: "em", text: "📤" }), "code"]),
      grump ? null : el("button", { class: "btn", data: { act: "family" } }, [el("span", { class: "em", text: "🌳" }), "family"])
    ]);
    E.pBody.appendChild(acts);
    if (grump) {
      E.pBody.appendChild(el("p", { class: "grump-blurb", style: { marginTop: "10px" }, html: pickGrumpLine(c.id) }));
    }
    // drives
    E.pBody.appendChild(H("feelings"));
    var bars = el("div", { class: "bars" });
    P_.drives = SB.DRIVES.map(function (d, i) { var b = bar(SB.DRIVE_COLORS[i], SB.DRIVE_EMOJI[i], d); bars.appendChild(b); return b; });
    P_.health = bar("#c5ff49", "❤️", "health"); P_.health.classList.add("wide");
    bars.appendChild(P_.health);
    E.pBody.appendChild(bars);
    // chemicals
    E.pBody.appendChild(H("body chemistry"));
    P_.chem = {};
    var cl = el("div", { class: "chemlist" });
    ["reward", "punish", "glucose", "toxin", "antigen", "antibody"].forEach(function (k) { var v = el("b", { text: "0" }); P_.chem[k] = v; cl.appendChild(el("div", null, [k, v])); });
    E.pBody.appendChild(cl);
    if (!grump) {
      E.pBody.appendChild(H("words"));
      P_.vocab = el("div", { class: "vocab" });
      E.pBody.appendChild(P_.vocab);
      E.pBody.appendChild(H("recent chatter"));
      P_.chat = el("div", { class: "chat" });
      E.pBody.appendChild(P_.chat);
      panelChatDirty = true;
    }
    // traits
    var traits = (c.genome && call("Genome", "traits", c.genome)) || [];
    E.pBody.appendChild(H("personality"));
    E.pBody.appendChild(el("div", { class: "traits" }, traits.length ? traits.map(function (t) { return el("span", { class: "trait", text: t }); }) : [el("span", { class: "empty", text: "mysterious" })]));
    var muts = (c.genome && c.genome.mutated) || [];
    if (muts.length) {
      E.pBody.appendChild(H("mutations ✨"));
      E.pBody.appendChild(el("div", { class: "muted", text: muts.slice(0, 6).join(" · ") }));
    }
    var kv = el("div", { class: "kv", style: { marginTop: "10px" } });
    P_.kv = kv;
    E.pBody.appendChild(kv);
    if (!grump) {
      var f = (G.family || {})[c.id];
      E.pBody.appendChild(H("family"));
      var links = el("div", { class: "links" });
      function link(id) {
        var fam = (G.family || {})[id], live = creatureById(id);
        var alive = !!(live && live.alive);
        return el("button", { class: "lk" + (alive ? "" : " dead"), data: alive ? { sel: id } : null, text: (alive ? "" : "🕊 ") + ((fam && fam.name) || (live && live.name) || "#" + id) });
      }
      var parents = (f && f.parents) || c.parents || [];
      var kids = (f && f.kids) || [];
      links.appendChild(el("span", { class: "muted", text: "parents:" }));
      if (parents.length) parents.forEach(function (p) { links.appendChild(link(p)); }); else links.appendChild(el("span", { class: "empty", text: "the stork (gen 1)" }));
      E.pBody.appendChild(links);
      var kl = el("div", { class: "links", style: { marginTop: "6px" } }, [el("span", { class: "muted", text: "kids:" })]);
      if (kids.length) kids.forEach(function (k) { kl.appendChild(link(k)); }); else kl.appendChild(el("span", { class: "empty", text: "none yet" }));
      E.pBody.appendChild(kl);
    }
  }

  var GRUMP_LINES = [
    "a <b>grump</b>. it would like to hit your smols and eat your snacks, in that order. tap it with 👆 until it goes home.",
    "<b>grump</b>. spiky. smelly. surprisingly good at stealing apples. fun fact: hates mornings.",
    "this is a <b>grump</b>. it has a small brain and a big attitude. throw it back to the hollow with ✋.",
    "<b>grump</b>. carries germs. do not let it hug anyone. it won't want to, but still."
  ];
  function pickGrumpLine(id) { return GRUMP_LINES[(id || 0) % GRUMP_LINES.length]; }

  function thinking(c) {
    if (!c.alive) return "🕊 nothing anymore";
    var th = call("Creature", "thought", c);
    if (typeof th === "string" && th) {
      if (c.heldBy === "hand") return "😵 " + th;
      if (c.asleep) return "💤 " + th;
      var t0 = topDrive(c);
      return (t0 && t0.v > 0.35 ? SB.DRIVE_EMOJI[t0.i] : "😌") + " " + th;
    }
    if (c.heldBy === "hand") return "😵 being carried. wheee?";
    if (c.asleep) return "💤 zzz… dreaming about " + (c.species === "grump" ? "hitting things" : "snacks");
    var td = topDrive(c);
    var dw = td && td.v > 0.18 ? SB.DRIVE_EMOJI[td.i] + " " + SB.DRIVE_WORDS[td.i] : "😌 fine, actually";
    var a = c.action, vi = a ? verbIdx(a.verb) : -1;
    var nn = c.attn ? nounName(c.attn.noun) : null;
    if (vi >= 0) {
      var tgt = SB.VERB_NEEDS_TARGET[vi] && nn ? " " + nn : "";
      return dw + " → " + SB.VERBS[vi] + tgt;
    }
    if (nn) return dw + " · looking at " + nn;
    return dw + " · the smol is thinking. barely.";
  }

  function updatePanel(c) {
    if (!c) return;
    var grump = c.species === "grump";
    var mood = moodOf(c);
    setText(E.pMood, MOOD_EMOJI[mood]);
    E.pMood.title = mood;
    if (document.activeElement !== E.pName && E.pName.value !== c.name) E.pName.value = c.name || "";
    var iq = iqOf(c);
    setHTML(E.pSub, (grump ? "grump" : stageName(c)) + " · gen " + (c.gen || 1) + " · <b>IQ " + iq + "</b> · " + ageText(c.age));
    setText(E.pThink, thinking(c));
    if (panelCollapsed) return;
    var d = drivesOf(c);
    if (P_.drives) P_.drives.forEach(function (b, i) { var v = SB.clamp01(d[i] || 0); b._f.style.width = (v * 100).toFixed(1) + "%"; });
    var hp = c.chem && c.chem.health != null ? SB.clamp01(c.chem.health) : 1;
    if (P_.health) { P_.health._f.style.width = (hp * 100).toFixed(1) + "%"; P_.health._f.style.background = hp > 0.5 ? "#c5ff49" : hp > 0.25 ? "#ffd166" : "#ff4d4d"; }
    if (P_.chem) for (var k in P_.chem) setText(P_.chem[k], fmt(c.chem ? c.chem[k] : 0, 2));
    if (P_.vocab) {
      var v = c.vocab || {};
      var ws = Object.keys(v).filter(function (w) { return v[w] > 0.02; }).sort(function (a, b) { return v[b] - v[a]; });
      var key = ws.map(function (w) { return w + (v[w] * 20 | 0); }).join(",");
      if (P_.vocab._key !== key) {
        P_.vocab._key = key;
        P_.vocab.innerHTML = "";
        if (!ws.length) P_.vocab.appendChild(el("span", { class: "empty", text: "no words yet. tap things with 💬 talk." }));
        ws.forEach(function (w) {
          var s = v[w];
          P_.vocab.appendChild(el("span", { class: "vw" + (s >= 1 ? " known" : ""), title: w + ": " + fmt(s, 2) + (s >= 1 ? " (known)" : " (learning)") }, [w, el("i", { style: { width: Math.min(100, s / 1.5 * 100) + "%" } })]));
        });
      }
    }
    if (P_.chat && panelChatDirty) {
      panelChatDirty = false;
      var l = chat[c.id] || [];
      P_.chat.innerHTML = "";
      if (!l.length) P_.chat.appendChild(el("span", { class: "empty", text: c.stage === 0 ? "babies babble. give it time." : "quiet so far." }));
      l.slice().reverse().forEach(function (m) { P_.chat.appendChild(el("div", null, [el("b", { text: c.name + ": " }), "“" + m.text + "”"])); });
    }
    if (P_.kv) {
      var b = c.brain || {};
      setHTML(P_.kv, "<span>brain <b>" + (b.nHid || "?") + "</b> neurons</span><span>lessons <b>" + (b.updates || 0) + "</b></span>" + (grump ? "" : "<span>known words <b>" + knownWords(c).length + "</b></span>"));
    }
  }

  /* =====================================================================
     brain viewer
     ===================================================================== */

  var brainAcc = 0, brainFor = null;

  function openBrain() {
    var c = selected();
    if (!c) {
      var s = smols()[0];
      if (s) selectC(s, false); else { toast({ icon: "🧠", title: "no brains here yet", desc: "hatch a smol first. eggs don't think much." }); return; }
    }
    E.brain.classList.add("open");
    root.classList.add("brain-on");
    closeTalk();
    if (isPhone()) { panelCollapsed = true; userToggledPanel = false; refreshPanel(true); }
    unlock("brain");
    tutEvent("brainOpen", {});
    drawBrainNow();
    sfx("click");
  }
  function closeBrain() { E.brain.classList.remove("open"); root.classList.remove("brain-on"); }

  function drawBrainNow() {
    var c = selected();
    var cv = E.brainCv;
    var box = cv.parentNode.getBoundingClientRect();
    var w = Math.max(10, box.width | 0), h = Math.max(10, box.height | 0);
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    var ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!c) {
      setHTML(E.bwTitle, "brain");
      ctx.fillStyle = "rgba(245,243,237,.6)"; ctx.font = "600 14px system-ui"; ctx.textAlign = "center";
      ctx.fillText("select a smol to look inside its head", w / 2, h / 2);
      setHTML(E.bwExplain, ""); setHTML(E.bwAtt, "");
      return;
    }
    setHTML(E.bwTitle, "inside <span>" + esc(c.name || "grump") + "</span>'s head");
    var b = c.brain;
    if (!b || !b.w1 || !b.nHid) {
      ctx.fillStyle = "rgba(245,243,237,.6)"; ctx.font = "600 14px system-ui"; ctx.textAlign = "center";
      ctx.fillText("no brain data yet. suspicious.", w / 2, h / 2);
      return;
    }
    drawNet(ctx, w, h, c, b);
    explainBrain(c, b);
  }

  var GROUPS = [{ from: 0, to: 12, name: "feel" }, { from: 12, to: 28, name: "see" }, { from: 28, to: 40, name: "hear" }, { from: 40, to: 45, name: "misc" }];
  var edgeBuf = [];

  function chosenVerb(c, b) {
    if (c.action && verbIdx(c.action.verb) >= 0) return verbIdx(c.action.verb);
    if (b.lastVerb != null) return verbIdx(b.lastVerb);
    return -1;
  }

  function drawNet(ctx, w, h, c, b) {
    var nIn = b.nIn || SB.N_IN, nH = b.nHid, nO = b.nOut || SB.N_VERBS;
    var x = b.x || [], hh = b.h || [], q = b.q || [];
    var compact = w < 420;
    var top = 10, bot = h - 8;
    var xIn = compact ? 74 : 104, xO = w - (compact ? 108 : 132), xH = (xIn + xO) / 2;
    var gap = 8, rowH = (bot - top - gap * 3) / nIn;
    var yIn = new Array(nIn);
    for (var gi = 0, yy = top; gi < GROUPS.length; gi++) {
      var g = GROUPS[gi];
      for (var i = g.from; i < Math.min(g.to, nIn); i++) { yIn[i] = yy + rowH / 2; yy += rowH; }
      yy += gap;
    }
    var hStep = (bot - top) / nH, yH = function (j) { return top + hStep * (j + 0.5); };
    var oStep = (bot - top) / nO, yO = function (k) { return top + oStep * (k + 0.5); };
    var chosen = chosenVerb(c, b);

    // edges: strongest |w * activation|
    var E2 = edgeBuf; E2.length = 0;
    var mx = 1e-6;
    for (var j = 0; j < nH; j++) {
      for (var ii = 0; ii < nIn; ii++) {
        var xi = x[ii] || 0;
        if (xi === 0) continue;
        var v = b.w1[j * nIn + ii] * xi, s = Math.abs(v);
        if (s < 0.02) continue;
        E2.push({ a: 0, i: ii, j: j, v: v, s: s });
        if (s > mx) mx = s;
      }
      var hj = hh[j] || 0;
      if (hj === 0) continue;
      for (var k = 0; k < nO; k++) {
        var v2 = b.w2[k * nH + j] * hj, s2 = Math.abs(v2);
        if (s2 < 0.02) continue;
        E2.push({ a: 1, i: j, j: k, v: v2, s: s2 });
        if (s2 > mx) mx = s2;
      }
    }
    E2.sort(function (p, r) { return r.s - p.s; });
    var lim = Math.min(250, E2.length);
    ctx.lineCap = "round";
    for (var e = lim - 1; e >= 0; e--) {
      var ed = E2[e], t = ed.s / mx;
      ctx.strokeStyle = ed.v >= 0 ? "#c5ff49" : "#ff5fa2";
      ctx.globalAlpha = 0.06 + 0.64 * t;
      ctx.lineWidth = 0.6 + 2.2 * t;
      ctx.beginPath();
      if (ed.a === 0) { ctx.moveTo(xIn, yIn[ed.i]); ctx.lineTo(xH, yH(ed.j)); }
      else { ctx.moveTo(xH, yH(ed.i)); ctx.lineTo(xO, yO(ed.j)); }
      ctx.stroke();
    }
    // learning flashes: where |Δw| was recently large
    var flashes = [], fmx = 0;
    if (b.dw1) for (var f1 = 0; f1 < b.dw1.length; f1++) { var d1 = b.dw1[f1]; if (d1 > fmx) fmx = d1; if (d1 > 1e-4) flashes.push([0, f1, d1]); }
    if (b.dw2) for (var f2 = 0; f2 < b.dw2.length; f2++) { var d2 = b.dw2[f2]; if (d2 > fmx) fmx = d2; if (d2 > 1e-4) flashes.push([1, f2, d2]); }
    if (fmx > 1e-4 && flashes.length) {
      flashes.sort(function (p, r) { return r[2] - p[2]; });
      ctx.save();
      ctx.strokeStyle = "#ffffff";
      ctx.shadowColor = "#ffffff"; ctx.shadowBlur = reduced ? 0 : 8;
      for (var fi = 0; fi < Math.min(40, flashes.length); fi++) {
        var fl = flashes[fi], ft = fl[2] / fmx;
        if (ft < 0.15) break;
        ctx.globalAlpha = 0.25 + 0.75 * ft; ctx.lineWidth = 1 + 2 * ft;
        ctx.beginPath();
        if (fl[0] === 0) { var jj = (fl[1] / nIn) | 0, i2 = fl[1] % nIn; ctx.moveTo(xIn, yIn[i2]); ctx.lineTo(xH, yH(jj)); }
        else { var kk = (fl[1] / nH) | 0, j2 = fl[1] % nH; ctx.moveTo(xH, yH(j2)); ctx.lineTo(xO, yO(kk)); }
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // group labels (vertical, far left)
    ctx.font = "800 9px JBM, ui-monospace, monospace";
    ctx.fillStyle = "#b59aff";
    GROUPS.forEach(function (g) {
      if (g.from >= nIn) return;
      var y0 = yIn[g.from], y1 = yIn[Math.min(g.to, nIn) - 1];
      ctx.save(); ctx.translate(8, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.fillText(g.name, 0, 3); ctx.restore();
      ctx.globalAlpha = 0.25; ctx.fillRect(13, y0 - 2, 1.5, y1 - y0 + 4); ctx.globalAlpha = 1;
    });

    // inputs: dots + labels for active ones (collision-avoided)
    var lastLabelY = -1e9;
    // drives are almost always non-zero: label only the strongest few so the column stays readable
    var dOrder = [];
    for (var di = 0; di < 12; di++) dOrder.push(di);
    dOrder.sort(function (p, r) { return (x[r] || 0) - (x[p] || 0); });
    var dLabel = {};
    dOrder.slice(0, compact ? 3 : 4).forEach(function (di2) { if ((x[di2] || 0) > 0.25) dLabel[di2] = true; });
    ctx.textAlign = "right";
    ctx.font = (compact ? "600 9px" : "600 10px") + " system-ui, sans-serif";
    for (var n = 0; n < nIn; n++) {
      var val = x[n] || 0, act = Math.abs(val) > 0.08 && n !== SB.IN.BIAS;
      var col = n < 12 ? SB.DRIVE_COLORS[n] : n < 28 ? "#b59aff" : n < 40 ? "#c5ff49" : "#f5f3ed";
      ctx.globalAlpha = act ? 0.35 + 0.65 * Math.min(1, Math.abs(val)) : 0.22;
      ctx.fillStyle = act ? col : "#f5f3ed";
      ctx.beginPath(); ctx.arc(xIn, yIn[n], act ? 3.2 : 1.8, 0, 7); ctx.fill();
      if (act && (n >= 12 || dLabel[n])) {
        var ly = Math.max(yIn[n], lastLabelY + (compact ? 10 : 11.5));
        if (ly < bot) {
          if (ly - yIn[n] > 3) { ctx.globalAlpha = 0.3; ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xIn - 4, yIn[n]); ctx.lineTo(xIn - 6, ly); ctx.stroke(); }
          lastLabelY = ly;
          ctx.globalAlpha = 0.5 + 0.5 * Math.min(1, Math.abs(val));
          var lbl = n < 12 ? SB.DRIVE_EMOJI[n] + " " + SB.DRIVES[n] : SB.INPUT_LABELS[n] || "in " + n;
          if (compact && lbl.length > 13) lbl = lbl.slice(0, 12) + "…";
          ctx.fillText(lbl, xIn - 7, ly + 3.5);
        }
      }
    }
    ctx.globalAlpha = 1;

    // hidden
    var rMax = Math.max(3, Math.min(10, hStep * 0.42));
    for (var hj2 = 0; hj2 < nH; hj2++) {
      var av = hh[hj2] || 0, aa = Math.min(1, Math.abs(av));
      ctx.fillStyle = "#22242b"; ctx.beginPath(); ctx.arc(xH, yH(hj2), rMax, 0, 7); ctx.fill();
      ctx.fillStyle = av >= 0 ? "#c5ff49" : "#ff5fa2";
      ctx.globalAlpha = 0.25 + 0.75 * aa;
      ctx.beginPath(); ctx.arc(xH, yH(hj2), rMax * (0.35 + 0.65 * aa), 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // outputs
    var qmin = Infinity, qmax = -Infinity;
    for (var k2 = 0; k2 < nO; k2++) { var qv = q[k2] || 0; if (qv < qmin) qmin = qv; if (qv > qmax) qmax = qv; }
    var span = Math.max(0.05, qmax - qmin);
    var barW = compact ? 34 : 44;
    ctx.textAlign = "left";
    var ofs = Math.max(8, Math.min(compact ? 10 : 11, oStep * 0.72));
    ctx.font = "700 " + ofs.toFixed(1) + "px system-ui, sans-serif";
    var bh = Math.max(3, Math.min(6, oStep * 0.35));
    for (var k3 = 0; k3 < nO; k3++) {
      var y = yO(k3), on = k3 === chosen, qq = q[k3] || 0;
      if (on) { ctx.fillStyle = "rgba(197,255,73,.16)"; rr(ctx, xO - 9, y - oStep / 2 + 1, w - xO + 6, oStep - 2, 6); ctx.fill(); }
      ctx.fillStyle = on ? "#c5ff49" : "#f5f3ed"; ctx.globalAlpha = on ? 1 : 0.4 + 0.5 * ((qq - qmin) / span);
      ctx.beginPath(); ctx.arc(xO, y, on ? 5 : 3.5, 0, 7); ctx.fill();
      ctx.fillText((oStep >= 15 ? (SB.VERB_EMOJI[k3] || "") + " " : "") + SB.VERBS[k3], xO + 9, y + ofs * 0.36);
      ctx.globalAlpha = 1;
      var bx = w - barW - 6;
      ctx.fillStyle = "#101114"; ctx.fillRect(bx, y - bh / 2, barW, bh);
      ctx.fillStyle = on ? "#c5ff49" : qq >= 0 ? "rgba(197,255,73,.55)" : "rgba(255,95,162,.6)";
      ctx.fillRect(bx, y - bh / 2, Math.max(1, barW * (qq - qmin) / span), bh);
    }
  }

  function explainBrain(c, b) {
    var chosen = chosenVerb(c, b);
    var parts = [];
    var ex = chosen >= 0 ? call("Brain", "explain", b, chosen) : null;
    if (ex && ex.length) {
      ex.filter(function (r) { return r.v > 0 && r.i !== SB.IN.BIAS; }).slice(0, 3).forEach(function (r) {
        var l = r.label || SB.INPUT_LABELS[r.i] || "";
        if (r.i < 12) l = SB.DRIVE_WORDS[r.i];
        else if (r.i < 28) l = "sees " + SB.NOUNS[r.i - 12];
        parts.push(esc(l));
      });
    }
    if (!parts.length) {
      var x = b.x || [];
      var td = topDrive(c);
      if (td.v > 0.15) parts.push(SB.DRIVE_WORDS[td.i]);
      for (var i = 12; i < 28; i++) if (x[i] > 0.5) { parts.push("sees " + SB.NOUNS[i - 12]); break; }
      for (var j = 28; j < 40; j++) if (x[j] > 0.5) { parts.push('heard "' + SB.VERB_WORDS[j - 28] + '"'); break; }
    }
    var q = b.q || [];
    var name = esc(c.name || "grump");
    var html = "<b>" + name + "</b>: " + (parts.length ? parts.join(" + ") : "just vibing");
    html += chosen >= 0 ? " → <b>" + SB.VERBS[chosen] + "</b> (" + fmt(q[chosen], 2) + ")" : " → deciding…";
    var r = typeof c.lastReward === "number" ? c.lastReward : null;
    var lesson = "";
    if (r != null && Math.abs(r) > 0.005) lesson = 'last lesson: <span class="' + (r >= 0 ? "pos" : "neg") + '">' + (r >= 0 ? "+" : "") + fmt(r, 2) + " reward</span>";
    else if (typeof b.lastErr === "number") lesson = 'last surprise: <span class="' + (b.lastErr >= 0 ? "pos" : "neg") + '">' + (b.lastErr >= 0 ? "+" : "") + fmt(b.lastErr, 2) + "</span>";
    lesson += (lesson ? " · " : "") + (b.updates || 0) + " lessons so far";
    setHTML(E.bwExplain, html + '<div class="lesson">' + lesson + "</div>");

    // attention: which noun the drives pull it toward
    var att = b.att;
    if (att && att.length >= SB.N_NOUNS * 13) {
      var xs = b.x || [], sc = [];
      for (var n = 0; n < SB.N_NOUNS; n++) {
        var s = att[n * 13 + 12] || 0;
        for (var d = 0; d < 12; d++) s += att[n * 13 + d] * (xs[d] || 0);
        sc.push({ n: n, s: s });
      }
      var m = Math.max.apply(null, sc.map(function (o) { return o.s; }));
      var sum = 0;
      sc.forEach(function (o) { o.p = Math.exp((o.s - m) * 3); sum += o.p; });
      sc.sort(function (p, r2) { return r2.p - p.p; });
      var cur = c.attn ? nounIdx(c.attn.noun) : -1;
      var rows = sc.slice(0, isPhone() ? 4 : 5).map(function (o) {
        var pct = Math.round(100 * o.p / sum);
        return '<div class="att-row' + (o.n === cur ? " cur" : "") + '" title="' + SB.NOUNS[o.n] + " " + pct + '%"><span>' + SB.NOUN_EMOJI[o.n] + '</span><div class="t"><div class="f" style="width:' + Math.max(3, pct) + '%"></div></div></div>';
      }).join("");
      var curTxt = cur >= 0 ? " · looking at " + SB.NOUN_EMOJI[cur] : "";
      setHTML(E.bwAtt, '<div class="lbl">drawn to' + curTxt + "</div>" + rows);
    } else setHTML(E.bwAtt, "");
  }

  /* =====================================================================
     HUD, roster, minimap
     ===================================================================== */

  var WX = { sun: "☀️", sunny: "☀️", clear: "☀️", cloudy: "⛅", clouds: "⛅", rain: "🌧️", snow: "❄️", storm: "⛈️", thunder: "⛈️", fog: "🌫️", wind: "💨" };
  var hudDirty = true, lastHudH = 0, lastDockH = -1;

  function updateHUD() {
    var clk = call("World", "clock", G);
    var label = clk && clk.label;
    if (!label) {
      var t = G.time || 0, day = Math.floor(t / SB.DAY_LENGTH) + 1, f = (t % SB.DAY_LENGTH) / SB.DAY_LENGTH;
      var mins = Math.floor(f * 24 * 60 + 6 * 60) % (24 * 60);
      label = "day " + day + " · " + ("0" + Math.floor(mins / 60)).slice(-2) + ":" + ("0" + (mins % 60)).slice(-2);
    }
    setText(E.clockLbl, String(label).toLowerCase());
    var w = G.world && G.world.weather, kind = w && w.kind ? String(w.kind) : "sun";
    var icon = WX[kind] || "☀️";
    var night = clk && clk.night != null ? clk.night : G.world && typeof G.world.light === "number" ? G.world.light < 0.35 : false;
    if (night && icon === "☀️") icon = "🌙";
    setText(E.clockWx, icon);
    E.clock.title = kind + (night ? " · night" : "");
    var ns = 0, ng = 0;
    G.creatures.forEach(function (c) { if (!c.alive) return; if (c.species === "smol") ns++; else ng++; });
    setText(E.statSmols, "🐣 " + ns);
    setText(E.statGrumps, "👺 " + ng);
    E.statGrumps.style.opacity = ng ? "1" : "0.45";
    setText(E.statIQ, "🧠 " + Math.round((G.stats && G.stats.bestIQ) || 0));
    refreshSpeed();
    // pause overlay
    var hp = !!(SB.Game && SB.Game.hostPaused);
    var paused = (G.speed === 0 || hp) && !UI.modalOpen;
    E.pause.classList.toggle("open", paused);
    if (paused) { setText(E.pauseT, hp ? "paused" : "paused"); setText(E.pauseS, hp ? "the page paused the game. the smols didn't notice." : "the smols are frozen in time. rude."); }
    // measured HUD height drives the top of panels/coach
    var hb = E.hud.getBoundingClientRect().bottom;
    if (Math.abs(hb - lastHudH) > 1 || hudDirty) { lastHudH = hb; hudDirty = false; document.documentElement.style.setProperty("--hudH", Math.round(hb) + "px"); }
    var dr = E.dock.getBoundingClientRect(), dh = dr.height > 1 ? Math.round(window.innerHeight - dr.top) : 0;
    if (dh !== lastDockH) { lastDockH = dh; document.documentElement.style.setProperty("--dockH", dh + "px"); }
  }

  var rosterKey = "", rosterPortraitAt = -1e9;
  function updateRoster() {
    var list = smols();
    var key = list.map(function (c) { return c.id + ":" + c.stage; }).join(",");
    var t = now();
    if (key !== rosterKey) {
      rosterKey = key;
      E.roster.innerHTML = "";
      list.forEach(function (c) {
        var cv = el("canvas");
        var b = el("button", { class: "rost glass", data: { sel: c.id }, title: c.name, "aria-label": "select " + c.name }, [cv, el("span", { class: "dot" }), el("span", { class: "nm", text: c.name })]);
        b._cv = cv; b._id = c.id;
        E.roster.appendChild(b);
      });
      rosterPortraitAt = -1e9;
    }
    var redraw = t - rosterPortraitAt > 2000;
    if (redraw) rosterPortraitAt = t;
    var box = E.roster.firstChild ? E.roster.firstChild.clientWidth || 48 : 48;
    Array.prototype.forEach.call(E.roster.children, function (b) {
      var c = creatureById(b._id);
      if (!c) return;
      if (redraw) portrait(b._cv, lookOf(c), box, { stage: c.stage, mood: moodOf(c), eyesClosed: !!c.asleep });
      b.classList.toggle("sel", c.id === G.selectedId);
      var dot = b.children[1], mc = MOOD_COLOR[moodOf(c)];
      if (dot.style.background !== mc) dot.style.background = mc;
      var nm = b.children[2]; if (nm.textContent !== c.name) { nm.textContent = c.name; b.title = c.name; }
    });
  }

  function updateMinimap() {
    var cv = E.map, w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    var ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (has("Render", "minimap")) { try { ctx.clearRect(0, 0, w, h); SB.Render.minimap(ctx, w, h, G); return; } catch (e) {} }
    // fallback minimap
    var rw = w / SB.ROOMS.length;
    SB.ROOMS.forEach(function (r, i) { ctx.fillStyle = r.sky[1]; ctx.fillRect(i * rw, 0, rw, h); ctx.fillStyle = r.ground; ctx.fillRect(i * rw, h * 0.7, rw, h * 0.3); });
    G.creatures.forEach(function (c) {
      if (!c.alive) return;
      ctx.fillStyle = c.species === "grump" ? "#7a2fb0" : c.id === G.selectedId ? "#c5ff49" : "#fff";
      ctx.beginPath(); ctx.arc(c.x / SB.WORLD_W * w, h * 0.62, c.id === G.selectedId ? 3.5 : 2.5, 0, 7); ctx.fill();
    });
    var cam = camera();
    if (cam && view) {
      var a = toWorld(0, 0), b = toWorld(view.clientWidth, 0);
      ctx.strokeStyle = "#c5ff49"; ctx.lineWidth = 1.5;
      ctx.strokeRect(a.x / SB.WORLD_W * w, 1, Math.max(4, (b.x - a.x) / SB.WORLD_W * w), h - 2);
    }
  }

  /* =====================================================================
     tutorial
     ===================================================================== */

  var TUT = [
    { text: "an egg! <em>tap it</em> to warm it up 🥚", on: "hatch", target: function () { var e = starterEgg(); return e ? { w: e, dy: -(e.r || 13) - 6 } : null; } },
    { text: "it hatched! give your smol a name.", on: "named", target: function () { return null; } },
    { text: "your smol is hungry. <em>drag the apple</em> to it 🍎", on: "eat", enter: function () { setTool("grab"); ensureFood(); },
      target: function () { var f = tutFood(); return f ? { w: f, dy: -(f.r || 11) - 6 } : null; } },
    { text: "it ate! now <em>tickle it</em> with the feather 🪶 to say good job", on: "tickle",
      target: function () { if (G.hand.tool !== "tickle") return { el: E.toolBtns.tickle }; var c = tutSmol(); return c ? { w: c, dy: -38 } : null; } },
    { text: "teach it a word: pick <em>💬 talk</em> and tap the food (or the ball) a few times", on: "learnWord", enter: function () { ensureFood(); var cam = SB.Render && SB.Render.camera; if (cam) cam.follow = null; },
      target: function () { if (G.hand.tool !== "talk") return { el: E.toolBtns.talk }; var f = tutFood() || tutBall(); return f ? { w: f, dy: -(f.r || 11) - 6 } : null; } },
    { text: "peek inside its head 🧠", on: "brainOpen", enter: function () { var c = tutSmol(); if (c && !selected()) selectC(c, true); },
      target: function () { return E.panel.classList.contains("open") ? { el: E.pBrain } : null; } },
    { text: "you're a smol parent now. 🎓 keep it fed, teach it words, tickle the good stuff, tap the bad stuff, and watch out at night: <em>grumps</em> 👺. goals live in ☰ → achievements.", final: true, target: function () { return null; } }
  ];

  function starterEgg() {
    var eggs = objects().filter(function (o) { return o.kind === "egg"; });
    return eggs.filter(function (o) { return o.data && o.data.starter; })[0] || eggs[0] || null;
  }
  function tutSmol() { return selected() && selected().species === "smol" ? selected() : smols()[0] || null; }
  function isFood(o) { return o.noun === "food" || o.noun === SB.N.food; }
  function nearest(pred, c, r) {
    var best = null, bd = r || 1e9;
    objects().forEach(function (o) { if (!pred(o) || o.heldBy && o.heldBy !== "hand") return; var d = SB.dist(o.x, o.y, c.x, c.y); if (d < bd) { bd = d; best = o; } });
    return best;
  }
  function tutFood() { var c = tutSmol(); return c ? nearest(isFood, c, 700) : null; }
  function tutBall() { var c = tutSmol(); return c ? nearest(function (o) { return o.kind === "ball"; }, c, 700) : null; }
  function ensureFood() {
    var c = tutSmol();
    if (!c || !G.world) return;
    if (nearest(isFood, c, 250)) return;
    call("World", "add", G.world, G, "apple", c.x + 120, c.y - 200);
  }

  function tutActive() { return G && G.tutorial && !G.tutorial.done; }
  function tutGo(step) {
    G.tutorial.step = step;
    var s = TUT[step];
    if (s && s.enter) try { s.enter(); } catch (e) { console.warn(e); }
    renderCoach();
    if (s && s.on && s.on !== "named" && G.tutorial.seen && G.tutorial.seen[s.on]) {
      setTimeout(function () { if (tutActive() && G.tutorial.step === step) tutGo(step + 1); }, 1400);
    }
  }
  function tutEvent(name, d) {
    if (!tutActive()) return;
    // remember it, so doing things out of order (tickling before feeding) never stalls the tutorial
    if (!G.tutorial.seen) G.tutorial.seen = {};
    G.tutorial.seen[name] = true;
    var s = TUT[G.tutorial.step];
    if (!s || s.on !== name) return;
    var nextStep = G.tutorial.step + 1;
    // naming is handled by the dialog that opens on hatch
    setTimeout(function () { if (tutActive() && G.tutorial.step === nextStep - 1) tutGo(nextStep); }, name === "eat" ? 900 : 350);
  }
  function tutDone() {
    if (!G.tutorial) G.tutorial = {};
    G.tutorial.done = true;
    E.coach.classList.remove("open");
    E.arrow.classList.remove("open");
  }
  function tutRestart() {
    G.tutorial.done = false;
    var hasSmol = smols().length > 0;
    tutGo(hasSmol ? 2 : starterEgg() ? 0 : 2);
  }
  function tutResume() {
    if (!G.tutorial) G.tutorial = { step: 0, done: false };
    if (G.tutorial.done) { E.coach.classList.remove("open"); return; }
    var st = G.tutorial.step | 0;
    if (st <= 1 && smols().length) st = 2; // reloaded mid-tutorial, smol already here
    if (st === 0 && !starterEgg() && !smols().length) st = 0;
    tutGo(st);
  }

  function renderCoach() {
    if (!G || !tutActive() || UI.modalOpen) { E.coach.classList.remove("open"); E.arrow.classList.remove("open"); return; }
    var st = G.tutorial.step, s = TUT[st];
    if (!s) { tutDone(); return; }
    if (st === 1 && !UI.modalOpen) {
      // the naming dialog should be up; if not (e.g. closed oddly), skip ahead
      if (smols().length) { tutGo(2); return; }
    }
    E.coachText.innerHTML = s.text;
    setText(E.coachStep, (st + 1) + "/" + TUT.length);
    E.coachBtns.innerHTML = "";
    if (s.final) E.coachBtns.appendChild(el("button", { class: "btn primary sm", data: { act: "tut-ok" }, text: "let's go" }));
    else E.coachBtns.appendChild(el("button", { class: "btn ghosty sm", data: { act: "skip-tut" }, text: "skip tutorial" }));
    E.coach.classList.add("open");
  }

  function placeArrow() {
    if (!tutActive() || UI.modalOpen) { E.arrow.classList.remove("open"); return; }
    var s = TUT[G.tutorial.step];
    var t = s && s.target ? s.target() : null;
    if (!t) { E.arrow.classList.remove("open"); return; }
    var x, y, up = false, side = false;
    if (t.el) {
      var r = t.el.getBoundingClientRect();
      if (!r.width) { E.arrow.classList.remove("open"); return; }
      x = r.left + r.width / 2;
      if (r.right < 120 && window.innerHeight <= 520) { side = true; x = r.right + 2; y = r.top + r.height / 2; }
      else if (r.top > window.innerHeight * 0.45) y = r.top - 2;
      else { y = r.bottom + 2; up = true; }
    } else if (t.w) {
      var p = toScreen(t.w.x, t.w.y + (t.dy || 0));
      if (!p) { E.arrow.classList.remove("open"); return; }
      var vr = view.getBoundingClientRect();
      x = SB.clamp(p.x + vr.left, 30, window.innerWidth - 30);
      y = SB.clamp(p.y + vr.top, 70, window.innerHeight - 40);
      // the target is hidden behind a panel or sheet: don't point through the UI
      var under = document.elementFromPoint(x, Math.min(window.innerHeight - 1, y + 8));
      if (under && under !== view && !E.arrow.contains(under)) { E.arrow.classList.remove("open"); return; }
    }
    E.arrow.classList.toggle("up", up);
    E.arrow.classList.toggle("side", side);
    E.arrow.style.transform = "translate(" + Math.round(x) + "px," + Math.round(y) + "px)";
    E.arrow.classList.add("open");
  }

  /* =====================================================================
     public: init + frame
     ===================================================================== */

  UI.init = function (game) {
    G = game;
    if (!G.hand) G.hand = { x: SB.HOME_X, y: 300, visible: false, tool: "grab", heldId: null, saying: null, sayT: 0 };
    if (!G.tutorial) G.tutorial = { step: 0, done: false };
    if (!G.stats) G.stats = {};
    if (!G.achievements) G.achievements = {};
    if (!built) build();
    if (!bound) bind();
    // reset per-game state
    ptrs = {}; gesture = null; keys = {}; chat = {}; toastQueue = []; rosterKey = ""; panelFor = null; userToggledPanel = false;
    E.chips._key = null;
    if (modal) { modal.onClose = null; }
    closeModal();
    closeBrain();
    hideTip();
    E.toasts.innerHTML = ""; E.ticker.innerHTML = "";
    lastSpeed = G.speed > 0 ? G.speed : 1;
    setTool(G.hand.tool || "grab");
    closeTalk();
    if (G.hand.tool === "talk") openTalk(false);
    refreshPanel(true);
    updateHUD();
    tutResume();
    var sp = document.getElementById("splash");
    if (sp && !sp.classList.contains("gone")) { sp.classList.add("gone"); setTimeout(function () { if (sp.parentNode) sp.parentNode.removeChild(sp); }, 600); }
  };

  var slowAcc = 1, mapAcc = 1;
  UI.frame = function (game, dt) {
    if (!built) return;
    if (game && game !== G) UI.init(game);
    if (!G) return;
    dt = dt || 0;
    var t = now();

    updateInsets(t);

    // keyboard panning
    var kx = (keys.arrowleft || keys.a ? -1 : 0) + (keys.arrowright || keys.d ? 1 : 0);
    var ky = (keys.arrowup ? -1 : 0) + (keys.arrowdown ? 1 : 0);
    if (kx || ky) call("Render", "panBy", -kx * 700 * dt, -ky * 500 * dt);

    // the hand follows the pointer in world space even while the camera moves
    if (handScreen && (gesture || G.hand.visible)) {
      var w = toWorld(handScreen.x, handScreen.y);
      if (!(G.hand.sayT > 0 && !gesture && handHideAt > t)) { G.hand.x = w.x; G.hand.y = w.y; }
    }
    if (handHideAt && t > handHideAt && !gesture) { G.hand.visible = false; handHideAt = 0; }

    // carried thing sticks to the hand
    if (G.hand.heldId != null) {
      var held = byId(G.hand.heldId);
      if (!held || held.alive === false || (held.heldBy && held.heldBy !== "hand")) { G.hand.heldId = null; G.hand.heldType = null; if (gesture && gesture.mode === "carry") gesture.mode = "pan"; }
      else {
        held.x = SB.clamp(G.hand.x + carryOff.x, 10, SB.WORLD_W - 10);
        held.y = G.hand.y + carryOff.y;
        held.vx = 0; held.vy = 0;
      }
    }

    placeArrow();

    slowAcc += dt;
    if (slowAcc >= 0.13) {
      slowAcc = 0;
      updateHUD();
      updateRoster();
      var c = selected();
      if (!c && panelFor != null) refreshPanel(true);
      else if (c && panelFor !== c.id) refreshPanel(true);
      else if (c) updatePanel(c);
      if (tutActive() && !UI.modalOpen && !E.coach.classList.contains("open")) renderCoach();
    }
    mapAcc += dt;
    if (mapAcc >= 0.16) { mapAcc = 0; updateMinimap(); }

    if (E.brain.classList.contains("open")) {
      brainAcc += dt;
      if (brainAcc >= 0.05) { brainAcc = 0; drawBrainNow(); }
    }
  };

  // handy for other modules / debugging
  UI.select = function (c, f) { selectC(c, f); };
  UI.openBrain = openBrain;
  UI.openNaming = openNaming;
  UI.openPedia = openPedia;
  UI.setTool = setTool;
  UI.el = el;
})();
