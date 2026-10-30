/* smol brains 2 — ui.js
   Everything DOM: the HUD (time, era, sparks, speed), the tool dock (grab, tickle, tap, talk, magic),
   the smol card, talk bar and miracles, toasts and big "moments", the goals strip, the smolpedia
   (evolution tree, idea web, smols, achievements, world, settings), the live brain viewer, the intro and
   tutorial, the "while you were away" screen, the civilisation card and the name prompt. */
(function () {
  "use strict";
  var SB = window.SB;
  var UI = (SB.UI = {});
  var R = SB.Render;
  var game = null, root = null, el = {}, state = { tool: "grab", sheet: null, inspect: null, talkTarget: null, armed: null, menuTab: "evolution" };
  UI.modalOpen = false;
  var povHeld = []; // god windows that came up while possessing (see modal), shown in order on the way out
  // leaving a body: the held windows join the event queue (they wait out the grace period like the rest)
  UI.povDone = function () { lastPovOut = now(); while (povHeld.length) popQ.push(povHeld.shift()); };
  /* event windows are paced (the bot's K-0021: "4 modals in about 90 s, each eating a click"): one at a time,
     at least EVENT_GAP seconds apart, never while a button is down or just after a click, and not within
     POV_GRACE seconds of leaving a body. Story cards past the second waiting one become toasts. Windows you
     open yourself (menu, brain, card) are never held. The game pauses while any window is open. */
  UI.EVENT_GAP = 25; UI.POV_GRACE = 4; UI.CLICK_GRACE = 0.8;
  var lastEventClose = -1e9, lastPovOut = -1e9, lastPointer = -1e9, pointerDown = false;
  function now() { return (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000; }
  UI.eventReady = function () {
    var t = now();
    if (el.modal || pointerDown) return false;
    if (SB.Lantern && SB.Lantern.running) return false; // never behind a film
    if (SB.Possess && SB.Possess.active) return false;
    return t - lastEventClose >= UI.EVENT_GAP && t - lastPovOut >= UI.POV_GRACE && t - lastPointer >= UI.CLICK_GRACE;
  };
  if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("pointerdown", function () { pointerDown = true; lastPointer = now(); }, true);
    window.addEventListener("pointerup", function () { pointerDown = false; lastPointer = now(); }, true);
    window.addEventListener("pointercancel", function () { pointerDown = false; }, true);
  }
  // called every frame: show the next waiting event window when it's time
  function pumpEvents() {
    var back = popQ[0] && popQ[0][2] && popQ[0][2].resume && !el.modal && !(SB.Lantern && SB.Lantern.running) && !(SB.Possess && SB.Possess.active) && now() - lastPovOut >= 1; // the window you had open comes straight back
    if ((!popQ.length && !cardQ.length) || !(back || UI.eventReady())) return;
    var m = popQ.shift();
    if (m) modal(m[0], m[1], Object.assign({}, m[2], { paced: true })); else nextCard();
  }
  UI.pendingEvents = function () { return popQ.length + cardQ.length; };
  UI.armed = null;

  /* ---------------- dom helpers ---------------- */
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k === "html") e.innerHTML = v;
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
      else if (k === "style") e.style.cssText = v;
      else e.setAttribute(k, v);
    }
    if (kids != null) (Array.isArray(kids) ? kids : [kids]).forEach(function (c) { if (c == null || c === false) return; e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function clear(e) { while (e.firstChild) e.removeChild(e.firstChild); }
  function fmtTime(sec) { sec = Math.round(sec); if (sec < 60) return sec + "s"; var m = Math.floor(sec / 60); if (m < 60) return m + "m"; return Math.floor(m / 60) + "h " + (m % 60) + "m"; }
  function rgb(c) { return "rgb(" + Math.round(c[0] * 255) + "," + Math.round(c[1] * 255) + "," + Math.round(c[2] * 255) + ")"; }
  function bodyColor(look) { return look ? rgb(SB.hsl(look.hue, look.sat / 100, look.light / 100)) : "#b59aff"; }
  function avatar(look, tier, size) {
    var a = h("div", { class: "av", style: "background:" + bodyColor(look) + (size ? ";width:" + size + "px;height:" + size + "px;font-size:" + Math.round(size / 2) + "px" : "") }, (SB.TIERS[tier || 0] || SB.TIERS[0]).icon);
    return a;
  }

  /* ---------------- init ---------------- */

  UI.init = function (g, opts) {
    setTimeout(function () { try { versionLabel(); } catch (e) {} }, 0);
    game = g; opts = opts || {};
    try { if (/[?&]nostory=1/.test(location.search)) UI.noStory = true; } catch (e) {} // for testing: skip the opening story
    root = document.getElementById("ui");
    clear(root);
    if (SB.Icons && !UI._icons) { UI._icons = true; SB.Icons.watch(document.body); } // every emoji the UI writes becomes a pixel icon
    buildHud(); buildToasts(); buildDock(); buildMinimap();
    if (SB.Orders && !UI._ordOv) { UI._ordOv = true; R.addOverlay(SB.Orders.draw); } // flags, zones and blueprints on the ground
    SB.Input.init(document.getElementById("stage"), g);
    wireBus();
    var sp = document.getElementById("splash");
    if (sp) { sp.classList.add("gone"); setTimeout(function () { sp.remove(); }, 800); }
    if (opts.fresh) intro();
    else {
      var c = g.creatures.filter(function (x) { return x.alive && x.species === "smol"; })[0];
      var focus = c || g.world.T.spawn;
      R.camera.x = focus.x; R.camera.z = focus.z; R.camera.zoom = R.camera.tZoom = 10; R.camera.yaw = R.camera.tYaw = 0.5;
      if (opts.migrated) setTimeout(function () { moment("🛶", "old friends!", "your smols from the old valley woke up on an island", "lilac"); }, 600);
      if (!g.tutorial.done && g.tutorial.step < 2) g.tutorial.step = 2;
    }
    setTool(g.hand.tool || "grab");
  };
  UI.setGame = function (g) {
    game = g; SB.Input.setGame(g); mini.base = null; ordUnlockedSeen = false; ordUnlockedAt = -1; // per island: an old island's clock made the toast come at once (K-0025)
    closeSheet(); state.inspect = null;
    if (el.goals) el.goals.innerHTML = "";
  };

  /* ---------------- minimap ----------------
     The whole island in a corner. The white outline is what the camera sees; tap or drag anywhere on
     the map to look there. Lime dots are smols, white squares buildings, red dots grumps. */
  var mini = { base: null, t: 0, drag: null };
  function buildMinimap() {
    var cv = h("canvas", { class: "minimap", "aria-label": "island map: tap or drag to move the camera" });
    el.mini = cv; mini.base = null;
    root.appendChild(cv);
    var toWorld = function (e) {
      var r = cv.getBoundingClientRect(), N = game.world.T.N;
      return { x: SB.clamp((e.clientX - r.left) / r.width, 0, 1) * N, z: SB.clamp((e.clientY - r.top) / r.height, 0, 1) * N };
    };
    var look = function (p) {
      var c = R.camera; c.follow = null; c.vx = c.vz = 0;
      if (c.intro && !c.intro.cine) c.intro = null; // a camera flight would carry on over the top of you (K-0037: "clicking the minimap didn't move the camera")
      c.x = p.x - (mini.drag ? mini.drag.dx : 0); c.z = p.z - (mini.drag ? mini.drag.dz : 0);
    };
    cv.addEventListener("pointerdown", function (e) {
      e.preventDefault(); e.stopPropagation();
      try { cv.setPointerCapture(e.pointerId); } catch (er) {}
      var p = toWorld(e), c = R.camera;
      // grabbed inside the view outline: drag it from where you grabbed; elsewhere: jump there
      var inside = SB.dist(p.x, p.z, c.x, c.z) < Math.max(4, c.halfH * 0.8);
      mini.drag = inside ? { dx: p.x - c.x, dz: p.z - c.z } : { dx: 0, dz: 0 };
      look(p);
    });
    cv.addEventListener("pointermove", function (e) { if (mini.drag) { e.preventDefault(); look(toWorld(e)); } });
    var end = function () { mini.drag = null; };
    cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
    cv.addEventListener("wheel", function (e) { e.preventDefault(); R.zoomAt(e.deltaY > 0 ? 1.15 : 0.87); }, { passive: false });
  }
  function drawMinimap(dt) {
    var cv = el.mini;
    if (!cv || !game) return;
    var hide = (game.settings && game.settings.minimap === false) || state.introRunning || (game.tutorial && !game.tutorial.done && (state.tutStep || 0) < 2);
    cv.classList.toggle("hide", !!hide);
    cv.classList.toggle("sheetopen", !!state.sheet);
    if (hide) return;
    var T = game.world.T, N = T.N;
    if (!mini.base) {
      mini.base = document.createElement("canvas"); mini.base.width = mini.base.height = N;
      var bx = mini.base.getContext("2d"), img = bx.createImageData(N, N);
      img.data.set(SB.WorldGen.minimap(T)); bx.putImageData(img, 0, 0);
    }
    if ((mini.t -= dt) > 0 && !mini.drag) return;
    mini.t = 0.2;
    var dpr = Math.min(window.devicePixelRatio || 1, 2), size = cv.clientWidth || 120;
    if (cv.width !== Math.round(size * dpr)) { cv.width = cv.height = Math.round(size * dpr); }
    var x = cv.getContext("2d"), k = cv.width / N;
    x.imageSmoothingEnabled = true;
    x.drawImage(mini.base, 0, 0, cv.width, cv.height);
    // unexplored: cloud
    var seen = game.world.seen, S = SB.World.SEEN_N;
    if (seen) {
      if (!mini.fog || mini.fogWorld !== game.world || game.world._miniSeenV !== mini.fogV) {
        mini.fog = mini.fog || document.createElement("canvas"); mini.fog.width = mini.fog.height = S; mini.fogWorld = game.world;
        var fx = mini.fog.getContext("2d"), fi = fx.createImageData(S, S);
        for (var q = 0; q < seen.length; q++) { var o4 = q * 4; fi.data[o4] = 52; fi.data[o4 + 1] = 48; fi.data[o4 + 2] = 72; fi.data[o4 + 3] = seen[q] ? 0 : 255; }
        fx.putImageData(fi, 0, 0); mini.fogV = game.world._miniSeenV;
      }
      x.imageSmoothingEnabled = true; x.drawImage(mini.fog, 0, 0, cv.width, cv.height);
    }
    // buildings, eggs, creatures
    game.world.structures.forEach(function (st) { x.fillStyle = st.done ? "#f5f3ed" : "rgba(245,243,237,0.5)"; var r = Math.max(2, 1.6 * k); x.fillRect(st.x * k - r / 2, st.z * k - r / 2, r, r); });
    (game.sites || []).forEach(function (st) {
      if (st.gone) return;
      if (st.kind === "pod" && !st.done) { var pr = Math.max(5, 3 * k) + (Math.sin(performance.now() / 200) + 1) * 1.5; x.fillStyle = "#8fe6dc"; x.fillRect(st.x * k - pr / 2, st.z * k - pr / 2, pr, pr); x.fillStyle = "#101114"; x.fillRect(st.x * k - 1, st.z * k - 1, 2, 2); return; }
      if (!SB.World.isSeen(game.world, st.x, st.z)) return; var r = Math.max(3, 2 * k); x.fillStyle = st.found ? "rgba(245,243,237,0.35)" : st.kind === "camp" ? "#ff5f5f" : "#ffd84a"; x.fillRect(st.x * k - r / 2, st.z * k - r / 2, r, r); });
    ((game.dir && game.dir.marks) || []).forEach(function (m) { x.fillStyle = "#a8e6ff"; x.beginPath(); x.arc(m.x * k, m.z * k, Math.max(2.4, 1.8 * k), 0, 6.283); x.fill(); x.strokeStyle = "#ffffff"; x.lineWidth = 1; x.stroke(); });
    game.world.items.forEach(function (o) { if (o.kind === "egg" && o.heldBy == null) { x.fillStyle = "#fff6d6"; x.beginPath(); x.arc(o.x * k, o.z * k, Math.max(1.6, 1.2 * k), 0, 6.283); x.fill(); } });
    game.creatures.forEach(function (c) {
      if (!c.alive || !SB.World.isSeen(game.world, c.x, c.z)) return;
      var sel = c.id === game.selectedId, r = (c.species === "grump" ? 2.8 + Math.sin(performance.now() / 160) * 0.8 : sel ? 2.6 : 1.7) * Math.max(1, k * 0.9); // grumps pulse, big and red
      x.fillStyle = c.species === "grump" ? "#ff5f5f" : sel ? "#ffffff" : "#c5ff49";
      x.beginPath(); x.arc(c.x * k, c.z * k, r, 0, 6.283); x.fill();
      if (sel) { x.strokeStyle = "#101114"; x.lineWidth = 1; x.stroke(); }
    });
    // what the camera sees
    var fp = R.viewFootprint();
    x.beginPath(); fp.forEach(function (p, i) { if (i) x.lineTo(p.x * k, p.z * k); else x.moveTo(p.x * k, p.z * k); }); x.closePath();
    x.fillStyle = "rgba(255,255,255,0.18)"; x.fill();
    x.strokeStyle = "rgba(16,17,20,0.7)"; x.lineWidth = 3.5 * dpr; x.stroke();
    x.strokeStyle = "#ffffff"; x.lineWidth = 1.8 * dpr; x.stroke();
    x.fillStyle = "#ffffff"; x.beginPath(); x.arc(R.camera.x * k, R.camera.z * k, 1.8 * dpr, 0, 6.283); x.fill();
  }

  /* ---------------- HUD ---------------- */
  function buildHud() {
    el.hud = h("div", { class: "hud" });
    el.clock = h("button", { class: "chipbtn glass live", title: "time and weather", onclick: function () { openMenu("world"); } });
    el.era = h("button", { class: "chipbtn glass live era", title: "evolution", onclick: function () { openMenu("evolution"); } });
    el.sparks = h("button", { class: "chipbtn glass live", title: "sparks: spend them on miracles", onclick: function () { setTool("magic"); } });
    el.speed = h("button", { class: "chipbtn glass live speed", title: "speed (space pauses, [ ] changes)", onclick: function () { cycleSpeed(1); } });
    el.skip = h("button", { class: "chipbtn glass live skipbtn", title: "skip to the next interesting thing (n)", "aria-label": "skip ahead", onclick: function () { toggleSkip(); } }, "⏭");
    el.menu = h("button", { class: "chipbtn glass live menu-btn", title: "smolpedia and settings", "aria-label": "menu", onclick: function () { openMenu(state.menuTab); } }, "☰");
    var mid = h("div", { class: "grow" }, el.era);
    // prayers waiting: tap to fly to the next one
    var prayI = 0;
    el.pray = h("button", { class: "chipbtn glass live pray hide", title: "smols praying to you: tap to go to one", onclick: function () {
      var ps = (game.prayers || []).filter(function (p) { return !p.answered && SB.Game.prayerLive(game, p); }).map(function (p) { return SB.Game.byId(game, p.id); }).filter(function (c) { return c && c.alive; });
      if (!ps.length) return;
      var c = ps[prayI++ % ps.length];
      SB.Game.select(game, c.id); SB.Input.follow(c); if (R.camera.tZoom > 12) R.camera.tZoom = 9;
    } });
    // autosave: a 💾 blinks by the menu each time the island is saved (every 20 s and when you leave)
    el.saved = h("span", { class: "savedot", title: "saved", "aria-hidden": "true" }, "💾");
    el.hud.appendChild(el.clock); el.hud.appendChild(mid); el.hud.appendChild(el.pray); el.hud.appendChild(el.sparks); el.lantern = h("button", { class: "chipbtn glass live lanternchip", title: "the Lantern: memory embers relight it", onclick: function () { lanternSheet(); } }); el.hud.appendChild(el.lantern); el.hud.appendChild(el.speed); el.hud.appendChild(el.skip); el.hud.appendChild(el.saved); el.hud.appendChild(el.menu);
    root.appendChild(el.hud);
    el.goals = h("div", { class: "goals glass live", onclick: function (e) { var q = e.target.closest && e.target.closest("[data-q]"); if (q) { questHelp(q.getAttribute("data-q")); return; } el.goals.classList.toggle("min"); } });
    root.appendChild(el.goals);
  }
  var savedT = null;
  SB.bus.on("saved", function () {
    if (!el.saved) return;
    el.saved.classList.remove("on"); void el.saved.offsetWidth; el.saved.classList.add("on");
    clearTimeout(savedT); savedT = setTimeout(function () { el.saved.classList.remove("on"); }, 1400);
  });
  var hudT = 0;
  function updateHud(dt) {
    hudT -= dt;
    if (hudT > 0) return;
    hudT = 0.25;
    var w = game.world, ck = SB.World.clock(w);
    var wx = w.weather.kind, icon = ck.night ? "🌙" : { clear: "☀️", cloudy: "⛅", rain: "🌧", storm: "⛈", fog: "🌫" }[wx] || "☀️";
    if (wx === "rain" && SB.World.tempAt(w, R.camera.x, R.camera.z) < 0.28) icon = "🌨";
    el.clock.innerHTML = '<span class="ico">' + icon + '</span><span><span class="long">day </span>' + ck.day + ' <span class="dim long">· ' + ck.season + ' </span>· ' + pad(ck.hour) + ":" + pad(Math.floor(ck.min / 10) * 10) + "</span>"; // ten-minute steps: a calmer clock
    var smols = SB.Game.smols(game), maxT = game.stats.maxTier || 0, gen = game.stats.maxGen;
    var best = smols.reduce(function (b, c) { return c.tier > (b ? b.tier : -1) ? c : b; }, null);
    var prog = 0;
    if (best) prog = tierProgress(best);
    el.era.innerHTML = '<span class="ico">' + SB.TIERS[maxT].icon + '</span><span><span class="long">' + SB.TIERS[maxT].name + " · </span>gen " + gen + " · " + smols.length + ' 🐣</span><span class="bar"><i style="width:' + Math.round(prog * 100) + '%"></i></span>';
    el.sparks.innerHTML = '<span class="ico">✨</span><b>' + Math.floor(game.sparks || 0) + "</b>";
    if (el.lantern && SB.Embers) { var en = SB.Embers.count(game), nx = SB.Embers.next(game); el.lantern.style.display = en > 0 ? "" : "none"; el.lantern.innerHTML = '<span class="ico">🏮</span><b>' + en + (nx ? " / " + nx : "") + "</b><small>embers</small>"; }
    var np = (game.prayers || []).filter(function (p) { return !p.answered && SB.Game.prayerLive(game, p); }).length;
    el.pray.classList.toggle("hide", !np);
    if (np) el.pray.innerHTML = '<span class="ico">🙏</span><b>' + np + "</b>";
    el.speed.textContent = game.speed === 0 ? "⏸ paused" : "▶ " + game.speed + "×";
    if (el.skip) { el.skip.classList.toggle("on", !!game.skip); el.skip.textContent = game.skip ? "⏭ …" : "⏭"; }
    el.speed.classList.toggle("paused", game.speed === 0);
    updateGoals();
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  // 0..1 toward the next tier for one smol (the weakest requirement)
  function tierProgress(c) {
    var needs = SB.Genome.nextNeeds(c.genome);
    if (!needs.length) return c.tier >= 6 ? 1 : 0.99;
    var worst = 1;
    needs.forEach(function (n) { worst = Math.min(worst, n.have / n.need); });
    return SB.clamp01(worst);
  }
  // ⏭: fast until something worth seeing happens (main.js Game.skip)
  function toggleSkip() {
    if (game.skip) { SB.Game.skipStop(game, { why: "⏭ stopped", c: null }); return; }
    if (SB.Possess && SB.Possess.active) { toast("leave the body first (Esc)"); return; }
    if (SB.Game.skip(game)) { toast("⏭ skipping ahead until something happens…", "", 2500); hudT = 0; }
  }
  UI.toggleSkip = toggleSkip;
  SB.bus.on("skipDone", function (d) {
    if (!el.skip) return;
    hudT = 0;
    if (d.why === "⏭ stopped") return;
    var sp = d.why.indexOf(" "), ic = sp > 0 && sp <= 3 ? d.why.slice(0, sp) : "⏭";
    moment(ic, d.why.slice(sp > 0 && sp <= 3 ? sp + 1 : 0), "⏭ skipped to here · back to " + (game.speed || 1) + "×", "", true);
    if (d.at && d.at.x != null) R.flyTo(d.at.x, d.at.z, Math.min(R.camera.tZoom, 10), 1.0); // you asked to be shown: always fly
  });
  function cycleSpeed(d) {
    if (game.skip && d !== 0) { SB.Game.skipStop(game, { why: "⏭ stopped", c: null }); hudT = 0; return; } // mid-skip, [ or ] just stops it
    var i = SB.SPEEDS.indexOf(game.speed);
    if (d === 0) { game.speed = game.speed === 0 ? (game._lastSpeed || 1) : (game._lastSpeed = game.speed, 0); }
    else { i = (i + d + SB.SPEEDS.length) % SB.SPEEDS.length; game.speed = SB.SPEEDS[i]; } // 16× wraps round to paused (phones have no space bar)
    hudT = 0;
  }

  /* ---------------- goals ---------------- */
  function goalsList() {
    var g = game, out = [], A = g.achievements, smols = SB.Game.smols(g);
    function add(t, p, done) { out.push({ t: t, p: p, done: done }); }
    if (!A.hatch) add(g.world.items.some(function (o) { return o.data && o.data.pod; }) ? "tap the crashed pod to open it" : "tap the glowing egg to warm it 🥚", "");
    else if (!A.word1 && !g.ngPlus) add("teach a first word: 💬 talk, pick “food”, tap food near a smol (a few times, slowly)", "");
    if (A.hatch && !A.tickle && !g.ngPlus) add("tickle a smol when it does something good 🪶", "");
    if (A.hatch && !A.egg) {
      var adults = smols.filter(function (c) { return c.stage >= 3; }).length;
      var young = smols.filter(function (c) { return c.stage < 3; }).sort(function (a, b) { return b.age - a.age; })[0];
      add("two grown-up smols make an egg 💕", adults >= 2 ? "in love soon" : young ? "grows up in " + fmtTime(SB.STAGES[3].from - young.age) : adults + "/2 adults");
    }
    var maxT = 0; // the colony as it is now, not its best ever
    smols.forEach(function (c) { if (c.tier > maxT) maxT = c.tier; });
    if (!smols.length) maxT = g.stats.maxTier || 0;
    if (maxT < 6 && A.hatch) {
      var best = null, bp = -1;
      smols.forEach(function (c) { if (c.tier === maxT) { var p = tierProgress(c); if (p > bp) { bp = p; best = c; } } });
      var nx = SB.TIERS[maxT + 1];
      var hint = best ? SB.Genome.nextNeeds(best.genome).map(function (n) { return n.label; }).slice(0, 2).join(" + ") : "";
      var nudge = !g.blessing && (g.sparks || 0) >= 15 && hint ? " · try ✨ magic → 🧬 bless" : "";
      var job = best ? echoJob(best, smols) : "";
      add("evolve into " + nx.icon + " " + nx.name + (job ? ": " + job : hint ? " (needs more " + hint + ")" : "") + nudge, Math.round(Math.max(0, bp) * 100) + "%");
    }
    var found = Object.keys(g.culture.found).length;
    if (maxT >= 2 && found < 3) add("a tool-user discovers an idea 💡 (try 💡 inspire)", found + "/3");
    if (maxT >= 4 && !A.built) add("builders finish a building 🛖", "");
    if (A.built && !A.village) add("3 huts around a campfire make a village 🏘", "");
    civGoals(add);
    if (maxT >= 5 && !A.bigthought) {
      // the last project, step by step: the two ideas, then the spire's materials, then the work
      var F = g.culture.found, sp = g.world.structures.filter(function (s) { return s.kind === "spire"; })[0], SK = SB.STRUCTS.spire;
      if (!F.astronomy || !F.resonance || !F.bigthought) {
        var got = ["astronomy", "resonance", "bigthought"].filter(function (k) { return F[k]; }).length;
        var tips = { astronomy: "🔭 astronomy (thinkers with lenses stargazing at night)", resonance: "💠 resonance (ascended smols holding thought crystals)", bigthought: "✨ the idea itself (ascended friends together by the story pole, or holding crystals)" };
        var nextK = ["astronomy", "resonance", "bigthought"].filter(function (k) { return !F[k]; })[0];
        add("the big thought ✨ needs " + tips[nextK] + (nextK === "bigthought" ? "" : ", then more"), got + "/3");
      } else if (!sp) add("ascended smols will raise the spire ✨ (needs " + Object.keys(SK.cost).map(function (k) { return SK.cost[k] + " " + k; }).join(", ") + ")", "");
      else if (!SB.Ideas.siteReady(sp)) {
        var miss = Object.keys(sp.need).filter(function (k) { return sp.need[k] > 0; }).map(function (k) { return (SK.cost[k] - sp.need[k]) + "/" + SK.cost[k] + " " + k; });
        add("bring the spire " + miss.join(" · ") + (miss.some(function (m) { return / crystal/.test(m); }) ? " (💎 crystal caves, fallen stars)" : "") + (miss.some(function (m) { return / metal/.test(m); }) ? " (ascended pull copper out of ore rocks)" : ""), "");
      } else add("raising the spire ✨", Math.round(Math.min(1, sp.work / SK.work) * 100) + "%");
      var asc = smols.filter(function (c) { return c.tier >= 6; }).length;
      if (maxT >= 6 && asc < 3) add("⚠ only " + asc + " ascended left: bless eggs toward 🌟 glow to keep the line going", "");
    }
    return out.slice(0, 3);
  }
  // "needs more hands" as a job you can see happening: who is practising it, and how far they've got
  function echoJob(best, smols) {
    var FH = SB.FirstHour;
    if (!FH) return "";
    var want = FH.wanted(best)[0];
    if (!want) return "";
    var parents = smols.filter(function (c) { return c.stage >= 2 && !c.stranger; }), top = null;
    parents.forEach(function (c) { var p = FH.echoProgress(c, want); if (!top || p.frac > top.frac || (p.frac === top.frac && c.tier > top.c.tier)) { top = p; top.c = c; } });
    if (!top) return "";
    var i = top.info;
    if (top.frac >= 1) return top.c.name + " is full of " + i.word + " " + i.icon + " → " + i.kids + " next";
    return top.c.name + " " + i.did + " " + top.n + "/" + top.of + " " + i.what + " → " + i.kids;
  }
  function kidsHTML(c) {
    var FH = SB.FirstHour, want = FH.wanted(c), out = [];
    var genes = want.concat(Object.keys(FH.ECHO).filter(function (g) { return want.indexOf(g) < 0 && FH.echoProgress(c, g).frac > 0.05; })).slice(0, 3);
    if (!genes.length) genes = ["arms"];
    genes.forEach(function (g) {
      var p = FH.echoProgress(c, g), star = want.indexOf(g) >= 0;
      out.push('<div class="fhk' + (star ? " want" : "") + '" title="' + esc(p.info.kids + ": what " + c.name + " practises nudges its babies' genes") + '"><span class="e">' + p.info.icon + '</span><span class="l">' + esc(p.info.kids) + (star ? " ★" : "") + '</span><span class="b"><i style="width:' + Math.round(p.frac * 100) + "%;background:" + p.info.col + '"></i></span><span class="n mono">' + p.n + "/" + p.of + "</span></div>");
    });
    return out.join("") + (want.length ? '<div class="note">★ what the next tier needs. watch for +' + FH.ECHO[want[0]].icon + " while it practises.</div>" : "");
  }
  var goalKey = "";
  function updateGoals() {
    if (state.introRunning || (game.tutorial && !game.tutorial.done)) { el.goals.classList.add("hide"); goalKey = ""; return; }
    var qb = SB.Quests && !game.showcase ? SB.Quests.board(game) : null;
    var list = goalsList();
    if (qb) list = list.filter(function (g) { return !/first word|tickle a smol/.test(g.t); }).slice(0, 2);
    var qs = qb ? qb.quests.map(function (x) { return [x.q.id, x.done ? 1 : 0, x.have, x.need]; }) : null;
    var key = JSON.stringify([list, qs, qb && qb.n]);
    if (key === goalKey) return;
    goalKey = key;
    el.goals.classList.toggle("hide", !list.length && !qb);
    var html = "";
    if (qb) {
      html += '<div class="head"><span>chapter ' + qb.n + " · " + esc(qb.ch.name) + "</span><span>" + (el.goals.classList.contains("min") ? "▾" : "▴") + "</span></div>";
      html += qb.quests.map(function (x) {
        var p = x.done ? "✓" : x.need > 1 ? x.have + "/" + x.need : "";
        return '<div class="g q' + (x.done ? " done" : "") + '" data-q="' + x.q.id + '"><span class="e">' + x.q.icon + '</span><span class="t">' + esc(x.q.t) + '</span><span class="p">' + p + '</span><span class="r">+' + x.q.pay + "✨</span></div>";
      }).join("");
      if (list.length) html += '<div class="head sub"><span>also</span></div>';
    } else html += '<div class="head"><span>next</span><span>' + (el.goals.classList.contains("min") ? "▾" : "▴") + "</span></div>";
    html += list.map(function (g) { return '<div class="g' + (g.done ? " done" : "") + '"><span class="t">' + esc(g.t) + '</span><span class="p">' + esc(g.p) + "</span></div>"; }).join("");
    el.goals.innerHTML = html;
  }
  // tapping a quest: what to do, and a shortcut where there is one
  function questHelp(id) {
    var q = SB.Quests && SB.Quests.BY[id];
    if (!q) return;
    toast(q.icon + " <b>" + esc(q.t) + "</b><br>" + esc(q.how || ""), "", 6500);
    var c = SB.Game.byId(game, game.selectedId);
    if (!c || !c.alive || c.species !== "smol") { c = SB.Game.smols(game).filter(function (k) { return !k.stranger; })[0]; if (c && (q.go === "tricks" || q.go === "possess")) { SB.Game.select(game, c); R.flyTo(c.x, c.z, 6, 0.8); } }
    if (!c) return;
    if (q.go === "tricks") setTimeout(function () { openSheet("tricks"); }, 50);
    else if (q.go === "talk") setTool("talk", true);
  }

  /* ---------------- toasts & moments ---------------- */
  function buildToasts() { el.toasts = h("div", { class: "toasts" }); root.appendChild(el.toasts); }
  // at most two toasts on screen; the rest wait their turn (repeats are dropped, old news falls off)
  var toastQ = [];
  var nightHeld = [];
  function lanternSheet() {
    var g = SB.Game.current; if (!g || !SB.Embers) return;
    var l = SB.Embers.state(g), nx = SB.Embers.next(g);
    toast("🏮 <b>the Lantern</b> · stage " + l.stage + " · " + l.embers + " memory embers" + (nx ? ", the next stage at " + nx : "") + ".<br>" + l.log.slice(-4).reverse().map(function (e) { return "🔥 " + esc(e.why); }).join("<br>"), "", 7000);
  }
  function toast(html, cls, ms) {
    if (game && SB.FirstNight && SB.FirstNight.active(game) && cls !== "night" && !/^🧪/.test(html)) { if (cls === "ach") nightHeld.push([html, cls, ms]); return; } // the first night speaks through the island; achievements wait for dawn
    var live = [].filter.call(el.toasts.children, function (t) { return !t.classList.contains("out"); });
    if (live.some(function (t) { return t._html === html; }) || toastQ.some(function (q) { return q[0] === html; })) return;
    if (live.length >= 2) { // a full queue drops its oldest ordinary toast; memory embers go first and are never dropped (K-0048)
      if (cls === "ember") toastQ.unshift([html, cls, ms]); else toastQ.push([html, cls, ms]);
      if (toastQ.length > 5) { var dk = toastQ.findIndex(function (q) { return q[1] !== "ember"; }); if (dk >= 0) toastQ.splice(dk, 1); }
      return;
    }
    var t = h("div", { class: "toast glass " + (cls || ""), html: html });
    t._html = html;
    el.toasts.appendChild(t);
    setTimeout(function () {
      t.classList.add("out");
      setTimeout(function () { t.remove(); var q = toastQ.shift(); if (q) toast(q[0], q[1], q[2]); }, 500);
    }, ms || 4200);
  }
  UI.toast = toast;
  // ?cctest=1: "🧪 test possession" drops you into a first possession as a new player gets it (hungry, a grump at
  // 20 s, the blob's day from the start), on the smol nearest the camera. a playtester without held keys needs it (K-0037)
  function testHook() {
    if (!SB.TEST || el.testBtn || !SB.Possess) return;
    SB.Possess.noLock = true; // no mouse lock in a playtest: clicks walk, a drag looks, and one Esc leaves
    el.testBtn = root.appendChild(h("button", { class: "chipbtn glass live testbtn", title: "playtest: a fresh first possession", onclick: function () {
      var cs = SB.Game.smols(game).filter(function (c) { return c.alive && !c.held; });
      if (!cs.length) { toast("no smols yet: open the pod first"); return; }
      var cam = R.camera;
      cs.sort(function (a, b) { return (a.tier - b.tier) * 1000 + SB.dist(a.x, a.z, cam.x, cam.z) - SB.dist(b.x, b.z, cam.x, cam.z); });
      var c = cs[0], st = game.settings || (game.settings = {}), hm = SB.Society.home(game, 0);
      if (SB.dist(c.x, c.z, hm.x, hm.z) < 25) for (var k = 0; k < 40; k++) { var a = k * 0.9, rr = 28 + (k % 4) * 3, x = hm.x + Math.sin(a) * rr, z = hm.z + Math.cos(a) * rr; if (SB.World.walkable(game.world, x, z) && SB.World.depthAt(game.world, x, z) < 0.05) { c.x = x; c.z = z; c.action = null; break; } } // K-0042: out 25-40 m, so the grump means a run home
      delete st.povHungry; delete st.povThreat; delete st.povBlobQuest; delete st.povQuest;
      try { localStorage.removeItem("smolbrains-blobquest"); localStorage.removeItem("smolbrains-firsttool"); } catch (e) {}
      game.sparks = Math.max(game.sparks || 0, 50);
      SB.Possess.enter(game, c);
      toast("🧪 test possession: click the ground left or right of centre to walk that way", "", 6000);
    } }, "🧪 test possession"));
  }
  function versionLabel() {
    testHook();
    if (el.ver) return;
    var v = document.documentElement.getAttribute("data-version");
    if (v) el.ver = root.appendChild(h("div", { class: "verlbl" }, "v" + v)); // K-0033: which build am I on?
  }
  UI.versionLabel = versionLabel;
  var momentQ = [], momentBusy = false;
  function moment(icon, big, sub, cls, first) {
    if (game && game.offlineRunning) return;
    if (game && SB.FirstNight && SB.FirstNight.active(game)) return; // the first night speaks through the island
    if (first) momentQ.unshift([icon, big, sub, cls]); else momentQ.push([icon, big, sub, cls]); // big news (a new era) skips the queue
    if (!momentBusy) nextMoment();
  }
  function nextMoment() {
    if (SB.Intro && SB.Intro.covering) { momentBusy = true; setTimeout(nextMoment, 800); return; } // wait for the cutscene
    var m = momentQ.shift();
    if (!m) { momentBusy = false; return; }
    momentBusy = true;
    var d = h("div", { class: "moment " + (m[3] || "") }, [h("div", { class: "icon" }, m[0]), h("div", { class: "big" }, m[1]), m[2] ? h("div", { class: "sub" }, m[2]) : null]);
    root.appendChild(d);
    setTimeout(function () { d.remove(); nextMoment(); }, 3300);
  }
  UI.moment = moment;
  // the camera flies to things that happen (an egg, a stranger, a storm) only when you haven't just moved it
  // yourself: K-0022 found the new-game camera panning and jumping under the player's hand
  function autoFly(x, z, zoom, dur) {
    if (SB.Input && SB.Input.touchedT && performance.now() - SB.Input.touchedT < 8000) return;
    R.flyTo(x, z, zoom, dur);
  }

  /* story cards: the first time something big happens, the game pauses and explains it (what happened,
     why, what you can do). Later times are just a quick moment. */
  var cardQ = [];
  UI.QUIET_START = 300; // real seconds into an island when story cards stop being toasts
  function storyCard(key, icon, title, paras, fallback) {
    var seen = (game.settings = game.settings || {}).cards || (game.settings.cards = {});
    if (game.offlineRunning) return; // the "welcome back" card sums up the catch-up
    if (seen[key] || game.settings.guide === false) { if (fallback) moment(fallback[0], fallback[1], fallback[2], fallback[3]); return; }
    seen[key] = 1;
    if (((game.playTime || 0) < UI.QUIET_START || (SB.FirstNight && SB.FirstNight.active(game))) && !game.ngPlus) { toast(icon + " <b>" + esc(title) + "</b>: " + paras[0], "", 9000); return; } // the first minutes: no windows
    if (cardQ.length >= 2) { toast(icon + " <b>" + esc(title) + "</b>: " + paras[0], "", 6500); return; } // too many waiting: a toast instead
    cardQ.push([icon, title, paras]);
  }
  function nextCard() {
    var c = cardQ.shift();
    if (!c) return;
    var body = h("div", { class: "story" }, [h("div", { class: "icon" }, c[0]), h("h3", null, c[1])].concat(c[2].map(function (p) { return h("p", { html: p }); })).concat([h("div", { class: "row" }, [h("span", { class: "sp" }), h("button", { class: "btn go", onclick: function () { closeModal(); } }, "got it")])]));
    modal("", body, { story: true, paced: true });
  }
  UI.storyCard = storyCard;
  var NEXT_HELP = {
    1: "let smols carry and fiddle with things (✋ hand them sticks and stones; every carry pops a +🤲), or ✨ magic → 🧬 bless the next eggs toward <b>hands</b>.",
    2: "talk to them a lot and let them hang out together: social smols have social kids. 🧬 bless toward <b>language</b> helps.",
    3: "builders plan ahead: smols that make things and finish plans have planning kids. 🧬 bless toward <b>planning</b>.",
    4: "thinkers have big heads: smols that learn, study and teach have brainier kids. 🧬 bless toward <b>big heads</b> or <b>bigger brains</b>.",
    5: "the last step needs huge, glowing brains. keep thinkers alive and teaching, and 🧬 bless toward <b>inner glow</b>."
  };
  var TIER_NEW = {
    1: "critters walk further and see more, so they find food on their own better.",
    2: "tool-users pick things up on purpose and <b>discover ideas</b> by fiddling: poke sticks, fire, baskets. watch for 💡. <b>👁 possess</b> one (on its card) to borrow its hands: a hotbar, a bag, and a guide from a stick to your first tool and a campfire.",
    3: "tribes talk in sentences, <b>teach each other</b>, share food, and <b>pray to you</b> when they need help (🙏 answer with ✨ magic).",
    4: "builders make <b>huts, farms and villages</b>. farms are the big one: they feed everybody, even in winter.",
    5: "thinkers carve ideas into story poles so they're never forgotten, and study the sky.",
    6: "ascended smols glow and float, and can start on the big thought. you made this."
  };

  /* ---------------- dock ---------------- */
  var TOOLS = [["grab", "✋", "grab"], ["tickle", "🪶", "tickle"], ["tap", "👆", "tap"], ["talk", "💬", "talk"], ["magic", "✨", "magic"], ["orders", "🚩", "orders"]];
  function buildDock() {
    el.dock = h("div", { class: "dock" });
    el.sheet = h("div", { class: "sheet glass live hide" });
    el.tools = h("div", { class: "tools glass live" });
    TOOLS.forEach(function (t, i) {
      var b = h("button", { class: "tool", "data-tool": t[0], title: t[2] + " (" + (i + 1) + ")", onclick: function () { setTool(t[0], true); } }, [h("span", { class: "ico" }, t[1]), t[2]]);
      el.tools.appendChild(b);
    });
    el.dock.appendChild(el.sheet); el.dock.appendChild(el.tools);
    root.appendChild(el.dock);
  }
  function setTool(t, user) {
    var prev = state.tool;
    if (user && prev === t && (t === "talk" || t === "magic" || t === "orders")) t = "grab"; // tap the open book's button again to put it away
    if (t === "orders" && !(SB.Orders && SB.Orders.unlocked(game))) { if (user) toast("🚩 orders open when the tutorial is done"); t = "grab"; } // tool-users first
    state.tool = t; game.hand.tool = t;
    [].forEach.call(el.tools.children, function (b) { b.classList.toggle("on", b.getAttribute("data-tool") === t); });
    disarm(); state.order = null;
    if (t === "talk") { if (tutIs("word") && !state.teach) state.teach = "food"; openSheet("talk"); }
    else if (t === "magic") { openSheet("magic"); tutDone("magic"); }
    else if (t === "orders") openSheet("orders");
    else if (state.sheet === "talk" || state.sheet === "magic" || state.sheet === "orders" || (user && prev === t && state.sheet)) { if (game.selectedId) openSheet("smol"); else closeSheet(); }
    else if (game.selectedId && user) openSheet("smol");
  }
  UI.setTool = setTool;

  /* ---------------- sheets ---------------- */
  function openSheet(kind) {
    state.sheet = kind;
    el.sheet.dataset.kind = "";
    el.sheet.classList.remove("hide");
    el.sheet.classList.toggle("side", kind === "smol" || kind === "inspect" || kind === "tricks");
    el.sheet.classList.toggle("talkside", kind === "talk"); // the word book sits at the side, so the island stays in view
    sheetT = 0;
    renderSheet(true);
    frameSheet();
  }
  // the followed smol shouldn't sit under the panel: frame it in the part of the screen still visible
  function frameSheet() {
    var cs = window.getComputedStyle(el.sheet), W = window.innerWidth || 1;
    if (cs.position === "fixed") { R.camera.shift = 0; R.camera.shiftX = Math.min(0.6, (el.sheet.offsetWidth + 10) / W); }
    else { R.camera.shiftX = 0; R.camera.shift = state.sheet === "smol" || state.sheet === "inspect" || state.sheet === "tricks" ? (W < 600 ? 0.45 : 0) : 0.4; }
  }
  function closeSheet() { state.sheet = null; el.sheet.classList.add("hide"); clear(el.sheet); R.camera.shift = 0; R.camera.shiftX = 0; }
  UI.closeSheet = closeSheet;
  var sheetT = 0, sheetKey = "";
  function renderSheet(force) {
    if (!state.sheet) return;
    if (state.sheet === "smol") return renderSmol(force);
    if (state.sheet === "talk") return renderTalk(force);
    if (state.sheet === "magic") return renderMagic(force);
    if (state.sheet === "orders") return renderOrders(force);
    if (state.sheet === "inspect") return renderInspect(force);
    if (state.sheet === "tricks") return renderTricks(force);
  }

  /* ---- tricks: train one smol, with every bar read live from its net ---- */
  var trT = 0;
  function renderTricks(force) {
    var c = SB.Game.byId(game, game.selectedId), T = SB.Tricks;
    if (!T || !c || !c.alive || c.species !== "smol") { closeSheet(); return; }
    if (!force && el.sheet.dataset.tid === String(c.id)) return updateTricks(c);
    el.sheet.dataset.tid = c.id; el.sheet.dataset.id = "";
    clear(el.sheet);
    el.sheet.appendChild(h("div", { class: "row" }, [
      avatar(c.look, c.tier),
      h("div", { style: "min-width:0;flex:1" }, [h("div", { class: "nm" }, "🎓 " + c.name + "'s tricks"), el.trSub = h("div", { class: "sub2" })]),
      h("button", { class: "ibtn", title: "back to its card", onclick: function () { el.sheet.dataset.tid = ""; openSheet("smol"); } }, "‹"),
      h("button", { class: "ibtn", title: "close", onclick: function () { SB.Game.select(game, null); closeSheet(); } }, "✕")
    ]));
    el.sheet.appendChild(h("div", { class: "note" }, "each bar is read from " + c.name + "'s own brain: how far it has come since you started teaching it. press “set it up”, wait until it does the thing, then 🪶 tickle (or 👆 tap) right then. a full bar is a learned trick. lessons can undo each other."));
    el.trRows = T.LIST.map(function (d) {
      var bar = h("i"), pct = h("span", { class: "n mono" }), star = h("span", { class: "st" });
      var row = h("div", { class: "trick" + (d.avoid ? " avoid" : "") }, [
        h("div", { class: "top" }, [h("span", { class: "e" }, d.icon), h("span", { class: "l" }, d.name), star, pct]),
        h("div", { class: "tbar" }, [bar]),
        h("div", { class: "how" }, [h("span", null, d.how), d.practice ? h("button", { class: "btn small go", onclick: function () {
          if (d.drive && c.chem[d.drive] != null && c.chem[d.drive] < 0.3) { toast(esc(c.name) + " isn't " + (d.drive === "hunger" ? "hungry" : d.drive) + " yet (" + Math.round(c.chem[d.drive] * 100) + "%), so it won't bite. try again in a bit, or pick a " + (d.drive === "hunger" ? "hungrier" : "different") + " smol.", "", 5000); return; }
          if (T.practice(game, c, d.id)) {
            setTool(d.avoid ? "tap" : "tickle");
            if (R.camera.follow === c) SB.Input.follow(null); // the camera holds still, so the smol stays under your finger
            trCue.c = c; trCue.shown = false;
            var row = this.closest && this.closest(".trick"); if (row && row.scrollIntoView) try { row.scrollIntoView({ block: "nearest" }); } catch (e) {}
            var full = false;
            toast((d.practice.say ? "you said “" + d.practice.say + "”. 🪶 tickle " + esc(c.name) + " when it comes over." : d.avoid ? "👆 tap " + esc(c.name) + " the moment it nibbles." : "🪶 wait for “tickle now!”, then tickle " + esc(c.name) + " while it " + trickVerb(d) + ".") +
              (full ? " (it isn't very " + (d.drive === "hunger" ? "hungry" : d.drive) + " right now, so it may not bite. a hungry smol learns this best.)" : ""), "", 6000);
          }
        } }, d.practice.say ? "💬 say it" : "set it up") : null])
      ]);
      row._d = d; row._bar = bar; row._pct = pct; row._star = star; row._m = -1;
      return row;
    });
    el.trRows.forEach(function (r) { el.sheet.appendChild(r); });
    updateTricks(c, true);
  }
  function updateTricks(c, force) {
    var T = SB.Tricks, now = performance.now();
    if (!force && now - trT < 150) return;
    trT = now;
    var n = 0;
    var ses = T.session && T.session(c, game);
    el.trRows.forEach(function (r) {
      var m = T.shown ? T.shown(c, r._d) : T.meter(c, r._d), on = T.known(c, r._d.id);
      if (on) { n++; m = 1; }
      if (r._m >= 0 && Math.abs(m - r._m) > 0.03) { r.classList.remove("up", "down"); void r.offsetWidth; r.classList.add(m > r._m ? "up" : "down"); }
      r._m = m;
      r._bar.style.width = Math.round(m * 100) + "%";
      var rr = c.tricks && c.tricks[r._d.id], live = !!(ses && ses.id === r._d.id);
      r._pct.textContent = on ? "learned" : Math.round(m * 100) + "%" + (live || (rr && rr.n) ? " · lessons " + Math.min(T.REPS, (rr && rr.n) || 0) + "/" + T.REPS : "");
      r._star.textContent = on ? "⭐" : "";
      r.classList.toggle("on", on);
      r.classList.toggle("live", !!(ses && ses.id === r._d.id));
    });
    el.trSub.textContent = n + " of " + T.LIST.length + " learned · " + (c.stats.lessons || 0) + " lessons (tickles and taps) so far";
  }

  function trickVerb(d) { return d.verb === "play" ? "plays" : d.verb === "approach" ? "comes over" : d.verb === "cuddle" ? "hugs" : d.verb === "flee" ? "runs" : d.avoid ? "nibbles it" : "eats"; }
  // a word that floats up from a smol (+12%, wait for it…)
  function float(c, txt, cls) {
    if (!c || !root) return;
    var p = R.project(c.x, c.y + 1.4, c.z);
    if (!p.on) return;
    var z = (SB.Title && SB.Title.zoom) || 1;
    var d = h("div", { class: "trfloat " + (cls || ""), style: "left:" + Math.round(p.x / z) + "px;top:" + Math.round(p.y / z) + "px" }, txt);
    root.appendChild(d);
    setTimeout(function () { d.remove(); }, 1400);
  }
  // "🪶 now!" over a smol in a trick session while it does the thing
  var trCue = { c: null, el: null, shown: false };
  function updateTrickCue() {
    var T = SB.Tricks, c = trCue.c, s = c && T && T.session && c.alive ? T.session(c, game) : null;
    var on = false, d = s && T.BY[s.id], t = performance.now();
    if (d && T.doing(c, game, d) && !trCue.until) trCue.until = t + 3000; // once it's up, it stays up about 3 s
    if (d && (T.doing(c, game, d) || t < (trCue.until || 0))) {
      var p = R.project(c.x, c.y + 1.7, c.z), z = (SB.Title && SB.Title.zoom) || 1;
      if (p.on) {
        if (!trCue.el) { trCue.el = h("div", { class: "trcue" }); root.appendChild(trCue.el); }
        trCue.el.textContent = (d.avoid ? "👆 tap now!" : "🪶 tickle now!") + " it " + trickVerb(d);
        trCue.el.style.left = Math.round(p.x / z) + "px"; trCue.el.style.top = Math.round(p.y / z) + "px";
        on = true;
        if (!trCue.shown) { trCue.shown = true; if (SB.Audio && SB.Audio.play) SB.Audio.play("pop"); }
      }
    } else if (!s) trCue.c = null;
    if (!on) { trCue.shown = false; trCue.until = 0; }
    if (trCue.el) trCue.el.classList.toggle("on", on);
  }

  /* ---- the smol card ---- */
  var cardMore = false;
  function renderSmol(force) {
    var c = SB.Game.byId(game, game.selectedId);
    if (!c || !c.alive || c.type !== "creature") { closeSheet(); return; }
    if (!force && el.sheet.dataset.id === String(c.id)) return updateSmol(c);
    el.sheet.dataset.id = c.id;
    clear(el.sheet);
    var head = h("div", { class: "row" }, [
      el.cAv = avatar(c.look, c.tier),
      h("div", { style: "min-width:0;flex:1" }, [el.cName = h("div", { class: "nm" }), el.cSub = h("div", { class: "sub2" })]),
      SB.Possess && c.species === "smol" ? h("button", { class: "ibtn", title: "possess: see through its eyes", onclick: function () { SB.Possess.enter(game, c); } }, "👁") : h("button", { class: "ibtn", title: "follow with the camera (f)", onclick: function () { var on = !R.camera.follow; SB.Input.follow(on ? c : null); this.classList.toggle("on", on); } }, "🎥"),
      h("button", { class: "ibtn", title: "brain viewer (b)", onclick: function () { openBrain(c); } }, "🧠"),
      h("button", { class: "ibtn", title: "close", onclick: function () { SB.Game.select(game, null); closeSheet(); } }, "✕")
    ]);
    el.sheet.appendChild(head);
    el.sheet.appendChild(el.cThought = h("div", { class: "thought" }));
    if (c.species === "smol") el.sheet.appendChild(el.cWho = h("div", { class: "who note" })); else el.cWho = null;
    if (c.species !== "grump") el.sheet.appendChild(el.cPeople = h("div", { class: "chips people" }));
    el.sheet.appendChild(el.cDrives = h("div", { class: "drives" }));
    if (c.species === "smol" && SB.FirstHour) { el.sheet.appendChild(h("div", { class: "sec" }, [h("span", null, "what its kids will inherit"), h("span", { class: "dim" }, "💫 echoes")])); el.sheet.appendChild(el.cKids = h("div", { class: "fhkids" })); }
    else el.cKids = null;
    el.sheet.appendChild(h("div", { class: "sec" }, [h("span", null, "ideas"), el.cIdeaN = h("span", { class: "dim" })]));
    el.sheet.appendChild(el.cIdeas = h("div", { class: "chips" }));
    el.sheet.appendChild(h("div", { class: "sec" }, [h("span", null, "words"), el.cWordN = h("span", { class: "dim" })]));
    el.sheet.appendChild(el.cWords = h("div", { class: "chips" }));
    el.sheet.appendChild(el.cMore = h("div", { class: cardMore ? "" : "hide" }));
    if (c.species === "grump") { // grumps get a short card: no words, no family, no code
      el.sheet.appendChild(h("div", { class: "note" }, "a grump. they came down with the warship and never stopped being grumpy. a club or a spear chases them off; fire and palisades keep them out."));
      updateSmol(c, true);
      return;
    }
    el.sheet.appendChild(h("div", { class: "btnrow" }, [
      SB.Possess ? h("button", { class: "btn go", title: "see the world through its eyes (costs " + SB.Possess.COST + " sparks)", onclick: function () { SB.Possess.enter(game, c); } }, "👁 possess" + (SB.Possess.cost && SB.Possess.cost(game) === 0 ? " · free" : "")) : null,
      SB.Tricks ? h("button", { class: "btn go", title: "train it: every bar is read from its brain", onclick: function () { openSheet("tricks"); } }, "🎓 tricks " + SB.Tricks.count(c) + "/" + SB.Tricks.LIST.length) : null,
      h("button", { class: "btn go", title: "watch its neural net think and learn, live (b)", onclick: function () { openBrain(c); } }, "🧠 brain"),
      h("button", { class: "btn", onclick: function () { cardMore = !cardMore; el.cMore.classList.toggle("hide", !cardMore); this.textContent = cardMore ? "less ▴" : "genes & more ▾"; } }, cardMore ? "less ▴" : "genes & more ▾"),
      h("button", { class: "btn", onclick: function () { setTool("talk", true); UI.talkTo(c); } }, "💬 talk"),
      h("button", { class: "btn", onclick: function () { openStory(c); } }, "📜 story"),
      SB.Cards ? h("button", { class: "btn", onclick: function () { SB.Cards.open(c); } }, "✨ card") : null,
      h("button", { class: "btn", onclick: function () { shareSmol(c); } }, "📤 code"),
      h("button", { class: "btn", onclick: function () { openMenu("family", c); } }, "🌳 family")
    ]));
    renderMore(c);
    updateSmol(c, true);
  }
  function updateSmol(c, force) {
    sheetT -= 1;
    if (!force && sheetT > 0) return;
    sheetT = 6;
    var stage = SB.STAGES[c.stage].name, tier = SB.TIERS[c.tier];
    el.cName.textContent = (c.species === "smol" ? (c.sex === "f" ? "♀ " : "♂ ") : "") + c.name + (c.title ? " the " + c.title : "");
    if (el.cPeople && SB.Social) {
      var rel = SB.Social.relations(game, c).slice(0, 4), mood = [];
      if (c.tantrum) mood.push('<span class="chip warnc">😤 tantrum!</span>');
      if (c.grief) mood.push('<span class="chip dim">🕯 missing ' + esc(c.grief.name) + "</span>");
      if (c.convo) mood.push('<span class="chip lime">💬 talking</span>');
      if (SB.Orders && SB.Orders.unlocked(game) && !c.stranger) mood.push(orderChip(c));
      el.cPeople.innerHTML = mood.join("") + rel.map(function (r) { var ic = r.label === "partner" ? "💕" : r.v >= 25 ? "💚" : r.v <= -25 ? "⚔" : "·"; return '<span class="chip ' + (r.v >= 25 ? "lime" : r.v <= -25 ? "warnc" : "dim") + '" title="' + esc(r.label) + '">' + ic + " " + esc(r.c.name) + " " + (r.v > 0 ? "+" : "") + r.v + "</span>"; }).join("") || '<span class="note">no friends or rivals yet</span>';
    }
    el.cSub.innerHTML = '<span class="tierpill" style="color:' + tier.color + '">' + tier.icon + " " + tier.name + "</span> " + stage + " · gen " + c.gen + " · iq <b class='lime'>" + c.iq + "</b> · " + fmtTime(c.age) + jobChip(c) + (game.clades && game.clades[c.clade] ? " · <span class='lilac'>" + esc(game.clades[c.clade].name) + "</span>" : "");
    var mood = SB.Chem.MOOD_EMOJI[SB.Chem.mood(c.chem)] || "🙂";
    el.cThought.innerHTML = mood + " <b>" + esc(SB.Creature.thought(c, game)) + "</b>" + (SB.Mind && SB.Mind.cardLine ? SB.Mind.cardLine(c, game) : "");
    // drives: the 6 strongest
    var ds = SB.DRIVES.map(function (d, i) { return { i: i, v: c.chem[d] }; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 6);
    el.cDrives.innerHTML = ds.map(function (d) { return '<div class="drive" title="' + SB.DRIVES[d.i] + '"><span class="e">' + SB.DRIVE_EMOJI[d.i] + '</span><span class="b"><i style="width:' + Math.round(d.v * 100) + "%;background:" + SB.DRIVE_COLORS[d.i] + '"></i></span></div>'; }).join("") +
      '<div class="drive" title="health"><span class="e">❤️</span><span class="b"><i style="width:' + Math.round(c.chem.health * 100) + '%;background:#c5ff49"></i></span></div>';
    if (el.cKids) el.cKids.innerHTML = kidsHTML(c);
    if (el.cWho) el.cWho.innerHTML = whoHTML(c);
    var ids = Object.keys(c.ideas).filter(function (k) { return SB.Ideas.BY_ID[k]; });
    el.cIdeaN.textContent = SB.Ideas.count(c) + (c.tier < 2 ? " · needs hands" : "");
    el.cIdeas.innerHTML = ids.length ? ids.map(function (k) { var d = SB.Ideas.BY_ID[k], v = c.ideas[k]; return '<span class="chip ' + (v >= 1 ? "lime" : "dim") + '" title="' + esc(d.desc) + '">' + d.icon + " " + esc(game.culture.words[k] || d.name) + (v < 1 ? " " + Math.round(v * 100) + "%" : "") + "</span>"; }).join("") : '<span class="note">' + (c.tier < 2 ? "blobs and critters can't hold ideas yet. evolve hands." : "nothing yet. curious smols discover things by fiddling.") + "</span>";
    var words = Object.keys(c.vocab).filter(function (w) { return c.vocab[w] >= 0.25; }).sort(function (a, b) { return c.vocab[b] - c.vocab[a]; });
    el.cWordN.textContent = SB.Creature.knownCount(c) + " known";
    el.cWords.innerHTML = words.length ? words.slice(0, 30).map(function (w) { var v = c.vocab[w]; return '<span class="chip ' + (v >= 1 ? "lime" : "dim") + '">' + esc(v >= 1 ? w : SB.Creature.garble(w, v)) + "</span>"; }).join("") : '<span class="note">no words yet. talk to it.</span>';
    if (cardMore) renderMore(c);
  }
  // who it is, at a glance (the bot's K-0011): personality, where it comes from, who it likes and who it doesn't
  function whoHTML(c) {
    var out = [], tr = SB.Genome.traits(c.genome).slice(0, 3);
    if (tr.length) out.push("🎭 " + tr.map(esc).join(", "));
    var fam = game.family || {}, f = fam[c.id];
    var ps = (c.parents || (f && f.parents) || []).map(function (id) { var p = SB.Game.byId(game, id) || fam[id]; return p && p.name; }).filter(Boolean);
    out.push(ps.length ? "👪 child of " + ps.map(esc).join(" & ") : c.gen > 1 ? "👪 parents unknown" : "🥚 one of the first");
    if (c.stranger) out.push("🧳 a stranger");
    if (SB.Social) {
      var rel = SB.Social.relations(game, c), best = rel.filter(function (r) { return r.v >= 25 && r.label !== "partner"; })[0], foe = rel.filter(function (r) { return r.v <= -25; }).sort(function (a, b) { return a.v - b.v; })[0];
      var nm = function (r) { var o = r.c || SB.Game.byId(game, r.id); return o && o.name; };
      if (best && nm(best)) out.push("💚 best friend " + esc(nm(best)));
      else out.push("💚 first friend: still looking…"); // early on nobody's close yet (K-0022: the line was empty)
      if (foe && nm(foe)) out.push("⚔ can't stand " + esc(nm(foe)));
    }
    return out.join(" · ");
  }
  function renderMore(c) {
    if (!el.cMore) return;
    var g = c.genome.genes, needs = SB.Genome.nextNeeds(c.genome), needMap = {};
    needs.forEach(function (n) { needMap[n.gene] = n.need; });
    var layers = SB.Genome.layers(c.genome);
    var html = '<div class="sec"><span>brain</span><span class="dim">' + SB.Brain.size(c.brain) + " neurons · " + SB.Brain.synapses(c.brain) + " synapses</span></div>";
    html += '<div class="note">layers ' + c.brain.hidden.join(" → ") + (c.brain.nMem ? " · " + c.brain.nMem + " memory units" : "") + " · plans " + SB.Genome.planDepth(c.genome) + " steps ahead</div>";
    html += '<div class="sec"><span>evolution genes</span><span class="dim">' + (needs.length ? "next: " + SB.TIERS[c.tier + 1].name : c.tier >= 6 ? "ascended" : "ready") + "</span></div><div class='genes'>";
    SB.Genome.EVO_GENES.forEach(function (k) {
      var v = g[k] || 0;
      html += '<div class="gene"><div class="row"><span>' + SB.Genome.GENE_LABELS[k] + '</span><span class="sp"></span><span class="dim mono">' + v.toFixed(2) + '</span></div><div class="b"><i style="width:' + Math.round(v * 100) + '%"></i>' + (needMap[k] ? '<u style="left:' + Math.round(needMap[k] * 100) + '%"></u>' : "") + "</div></div>";
    });
    html += "</div>";
    if (needs.length) html += '<div class="note">to evolve into a ' + SB.TIERS[c.tier + 1].name + ": " + needs.map(function (n) { return n.label + " " + (n.gene === "neurons" || n.gene === "layers" ? n.have + "/" + n.need : n.have.toFixed(2) + "/" + n.need); }).join(", ") + ". genes change through kids. what parents practise echoes in their babies.</div>";
    var echo = SB.Creature.echo(c), top = Object.keys(echo).filter(function (k) { return echo[k] > 0.15; }).sort(function (a, b) { return echo[b] - echo[a]; }).slice(0, 4);
    if (top.length) html += '<div class="note">💫 echoes for its kids: ' + top.map(function (k) { return SB.Genome.GENE_LABELS[k] + " +" + Math.round(echo[k] * 100) + "%"; }).join(", ") + "</div>";
    html += '<div class="sec"><span>traits</span></div><div class="chips">' + SB.Genome.traits(c.genome).map(function (t) { return '<span class="chip">' + esc(t) + "</span>"; }).join("") + "</div>";
    if (c.genome.mutated && c.genome.mutated.length) html += '<div class="note">born with: ' + c.genome.mutated.slice(0, 6).map(esc).join(", ") + "</div>";
    var ch = c.chem;
    html += '<div class="sec"><span>body</span></div><div class="note">glucose ' + ch.glucose.toFixed(2) + " · fat " + ch.fat.toFixed(2) + " · toxin " + ch.toxin.toFixed(2) + " · germs " + ch.antigen.toFixed(2) + " · antibodies " + ch.antibody.toFixed(2) + "</div>";
    el.cMore.innerHTML = html;
  }

  /* ---- talk: the word book ---- */
  // no typing: your tribe has a book of words to learn, unlocked as it evolves. pick one, then show it:
  // tap a thing for its name, or tap a smol and ask it to do something (it learns when it does it).
  // words most of the tribe knows make everyone smarter, and become calls you can give.
  function renderTalk(force) {
    if (!force && el.sheet.dataset.kind === "talk") return updateTalk();
    el.sheet.dataset.kind = "talk"; el.sheet.dataset.id = "";
    clear(el.sheet);
    el.sheet.appendChild(h("div", { class: "row" }, [h("div", { class: "nm", style: "font-size:15px" }, "💬 word book"), h("span", { class: "sp" }), h("button", { class: "btn x", title: "close the word book", onclick: function () { setTool("grab", true); } }, "✕")]));
    el.sheet.appendChild(el.talkShared = h("div", { class: "mono lime small" }));
    el.sheet.appendChild(el.talkInfo = h("div", { class: "teachbar" }));
    el.sheet.appendChild(el.talkWords = h("div", { class: "wordbook" }));
    updateTalk(true);
  }
  function updateTalk(force) {
    if (!el.talkWords) return;
    var WD = SB.Words, cul = game.culture || {};
    var key = state.teach + ":" + WD.topTier(game) + ":" + WD.BOOK.map(function (b) { return Math.round(WD.progress(game, b.w) * 20); }).join("") + ":" + (state.talkTarget && state.teach ? Math.round((state.talkTarget.vocab[state.teach] || 0) * 10) : "");
    if (!force && key === el.talkWords.dataset.key) return;
    el.talkWords.dataset.key = key;
    el.talkShared.innerHTML = "shared " + (cul.shared || 0) + " · smarts +" + Math.round(WD.smarts(game) * 100) + "%";
    clear(el.talkWords);
    WD.BOOK.forEach(function (b) {
      var open = WD.unlocked(game, b), sh = WD.share(game, b.w), known = sh >= 0.5;
      var card = h("button", { class: "word" + (open ? "" : " locked") + (state.teach === b.w ? " on" : "") + (known ? " known" : ""), title: open ? WD.how(b.w) + (b.call ? ". once they know it: " + b.call : "") : "unlocks at " + SB.TIERS[b.tier].name,
        onclick: function () { if (!open) { toast("“" + b.w + "” unlocks when you have a " + SB.TIERS[b.tier].icon + " " + SB.TIERS[b.tier].name); return; } state.teach = state.teach === b.w ? null : b.w; updateTalk(true); } }, [
        h("span", { class: "wi" }, open ? WD.icon(b.w) : "🔒"),
        h("span", { class: "ww" }, open ? b.w : "?"),
        h("span", { class: "wb" }, [h("i", { style: "width:" + Math.round(WD.progress(game, b.w) * 100) + "%" })])
      ]);
      if (open && b.call && sh > 0) card.appendChild(h("span", { class: "call", title: "call: " + b.call, onclick: function (e) { e.stopPropagation(); callWord(b.w); } }, "📣"));
      el.talkWords.appendChild(card);
    });
    var t = state.teach;
    var tc = state.talkTarget && state.talkTarget.alive ? state.talkTarget : null, tv = tc && t ? Math.min(1, tc.vocab[t] || 0) : 0;
    el.talkInfo.innerHTML = (tc && t ? "<b>" + esc(tc.name) + "</b>: " + (tv >= 1 ? "knows “" + esc(t) + "”! ✔" : Math.round(tv * 100) + "% of the way to “" + esc(t) + "”") + "<br>" : "") + (t ? "teaching <b class='lime'>“" + esc(t) + "”</b>: " + esc(WD.how(t)) + (WD.byWord[t].call ? ". <span class='dim'>when they know it, 📣 " + esc(WD.byWord[t].call) + ".</span>" : "") :
      "pick a word, then show them what it means. one lesson per smol every 4 seconds. a friend nearby who knows the word helps (👯), and a smol that learns one says it to the others. words most of the tribe knows make everyone smarter.");
  }
  function listeners(x, z, r) {
    var out = [];
    game.creatures.forEach(function (c) { if (c.alive && SB.dist(c.x, c.z, x, z) < r) out.push(c); });
    return out;
  }
  function showSay(word, x, z, high) {
    var hd = game.hand;
    hd.x = x; hd.z = z; hd.y = SB.World.groundY(game.world, x, z) + (high ? 1.6 : 1.0); hd.visible = true;
    hd.saying = word; hd.sayT = 2.4;
    if (SB.Audio) SB.Audio.voice(word, 0.35);
  }
  // say a word with no lesson (a smol's name, praise)
  function say(raw, at) {
    var word = String(raw || "").toLowerCase().trim().replace(/[^a-zü' ]/g, "");
    if (!word) return;
    var c = at || (state.talkTarget && state.talkTarget.alive ? state.talkTarget : SB.Game.byId(game, game.selectedId));
    var cx = c ? c.x : R.camera.x, cz = c ? c.z : R.camera.z;
    showSay(word, cx, cz, true);
    listeners(cx, cz, 9).forEach(function (o) { SB.Creature.hear(o, word, game, {}); });
  }
  UI.say = say;
  function callWord(w) {
    var c = SB.Game.byId(game, game.selectedId), x = c ? c.x : R.camera.x, z = c ? c.z : R.camera.z;
    showSay(w + "!", x, z, true);
    var n = SB.Words.call(game, w, x, z);
    toast(n ? "📣 “" + esc(w) + "!” " + n + " smol" + (n > 1 ? "s" : "") + " heard you" : "📣 nobody nearby knows “" + esc(w) + "” yet");
  }
  UI.callWord = callWord;
  var teachToastT = 0;
  // the talk tool tapped the world: teach the armed word (or, with none armed, the tapped thing's name)
  UI.teachAt = function (hit) {
    var WD = SB.Words, w = state.teach;
    if (!w) {
      if (hit && hit.type === "creature") { SB.Game.select(game, hit.ref.id); state.talkTarget = hit.ref; say(hit.ref.name.toLowerCase(), hit.ref); toast("pick a word in the 💬 word book, then tap " + esc(hit.ref.name) + " to teach it"); return; }
      var ref = hit && hit.ref, noun = ref && (ref.noun || (hit.type === "node" ? SB.NODES[ref.kind].noun : null)), nw = noun && SB.NOUN_WORDS[SB.N[noun]];
      if (!nw || !WD.byWord[nw]) return;
      if (!WD.unlocked(game, WD.byWord[nw])) { toast("your smols aren't ready for “" + nw + "” yet"); return; }
      w = nw;
    }
    var ref2 = hit && hit.ref, x = ref2 ? ref2.x : R.camera.x, z = ref2 ? ref2.z : R.camera.z;
    var res = WD.teach(game, w, hit);
    if (res.pending && hit && hit.ref) hit.ref.holdUntil = null; // you asked it to do something: let it go and do it
    if (res.tried || res.ok) showSay(w, x, z, hit && hit.type === "creature");
    var now = performance.now();
    // every lesson shows how far it got: "+36% food" floats up from each smol that took it in
    (res.gains || []).slice(0, 6).forEach(function (g) { if (g.v < 1) float(g.c, "+" + Math.round(g.d * 100) + "% “" + w + "”" + (g.friend ? " 👯" : "")); });
    if (res.learned && res.learned.length) {
      res.learned.forEach(function (c) { if (SB.FX) SB.FX.burst("sparkle", c.x, c.y + 0.8, c.z, 10); });
      toast("✨ " + res.learned.map(function (c) { return esc(c.name); }).slice(0, 3).join(", ") + (res.learned.length > 3 ? " +" + (res.learned.length - 3) : "") + " learned “" + esc(w) + "”!", "ach");
    } else if (res.msg && now - teachToastT > 1500) { teachToastT = now; toast(esc(res.msg)); }
    else if (res.pending && now - teachToastT > 1500) { teachToastT = now; toast("you asked " + esc(hit.ref.name) + " to “" + esc(w) + "”. if it does, that's a lesson. 🪶 tickle helps."); }
    if (res.ok) tutDone("word");
    if (state.sheet === "talk") updateTalk(true);
  };
  UI.talkTo = function (c) { state.talkTarget = c; if (state.sheet === "talk") updateTalk(true); };
  UI.sayAbout = function (hit) { UI.teachAt(hit); };


  /* ---- miracles ---- */
  var MIRACLES = [
    { id: "bounty", e: "🍎", name: "bounty", cost: 5, desc: "food falls from the sky", answers: { hunger: 1 } },
    { id: "heal", e: "💚", name: "heal", cost: 6, desc: "cure sickness and pain nearby", answers: { sick: 1, pain: 1 } },
    { id: "rain", e: "🌧", name: "rain", cost: 6, desc: "plants grow faster, fires go out", answers: { hot: 1 } },
    { id: "sun", e: "☀️", name: "sunshine", cost: 4, desc: "clear the sky, warm things up", answers: { cold: 1, sleepy: 0 } },
    { id: "bolt", e: "⚡", name: "lightning", cost: 10, desc: "strike a tree. fire! (smart smols learn from it)", answers: { cold: 1 } },
    { id: "inspire", e: "💡", name: "inspire", cost: 8, desc: "smols nearby get ideas 3× faster for a minute", answers: { bored: 1 } },
    { id: "bless", e: "🧬", name: "bless eggs", cost: 20, desc: "the next eggs evolve in a direction you pick", answers: {} },
    { id: "gift", e: "🎁", name: "gift", cost: 3, desc: "a toy, or a starter kit for tool-users", answers: { bored: 1, lonely: 1 } }
  ];
  var spawnBtns = [];
  function renderMagic(force) {
    spawnBtns = [];
    if (!force && el.sheet.dataset.kind === "magic") return updateMagic();
    el.sheet.dataset.kind = "magic"; el.sheet.dataset.id = "";
    clear(el.sheet);
    el.sheet.appendChild(h("div", { class: "row" }, [h("div", { class: "nm", style: "font-size:14px" }, "miracles"), h("span", { class: "sp" }), el.magicSparks = h("span", { class: "mono lime" })]));
    el.mirGrid = h("div", { class: "miracles" });
    MIRACLES.forEach(function (m) {
      m.btn = h("button", { class: "mir", title: m.desc, onclick: function () { arm(m); } }, [h("span", { class: "e" }, m.e), h("span", null, m.name), m.costEl = h("span", { class: "c" }, "✨" + m.cost)]);
      el.mirGrid.appendChild(m.btn);
    });
    el.sheet.appendChild(el.mirGrid);
    if (SB.Game.sandbox(game)) {
      // 🧪 the sandbox palette: pick one, then tap the island (it stays picked, so you can place lots)
      el.sheet.appendChild(h("div", { class: "sec" }, [h("span", null, "🧪 spawn"), h("span", { class: "dim" }, "sandbox")]));
      var sp = h("div", { class: "miracles spawns" });
      SB.Game.SPAWNS.forEach(function (k) {
        var t = /^t(\d)$/.exec(k), T = t && SB.TIERS[+t[1]];
        var m = { id: "spawn", what: k, cost: 0, e: T ? T.icon : k === "egg" ? "🥚" : k === "grump" ? "👹" : "🍎", name: T ? T.name : k, desc: T ? "a grown " + T.name : k === "egg" ? "an egg, nearly ready" : k === "grump" ? "a grump (they're grumpy)" : "a pile of fruit" };
        m.btn = h("button", { class: "mir", "data-spawn": k, title: m.desc, onclick: function () { arm(m); } }, [h("span", { class: "e" }, m.e), h("span", null, m.name)]);
        m.costEl = { _t: "" };
        sp.appendChild(m.btn); spawnBtns.push(m);
      });
      el.sheet.appendChild(sp);
    }
    el.sheet.appendChild(el.magicWarn = h("div", { class: "note warn hide" }));
    el.sheet.appendChild(el.magicInfo = h("div", { class: "note" }, "sparks come from new discoveries, new words, hatchings, and prayers answered with the right miracle. pick a miracle, then tap the world."));
    updateMagic();
  }
  function updateMagic() {
    if (!el.magicSparks) return;
    el.magicSparks.textContent = "✨ " + Math.floor(game.sparks || 0);
    MIRACLES.forEach(function (m) {
      var cost = SB.Game.miracleCost(game, m.cost), txt = "✨" + cost;
      if (m.costEl._t !== txt) { m.costEl._t = txt; m.costEl.textContent = txt; }
      m.btn.classList.toggle("poor", (game.sparks || 0) < cost); m.btn.classList.toggle("on", UI.armed === m);
    });
    spawnBtns.forEach(function (m) { m.btn.classList.toggle("on", UI.armed === m); });
    var warn = [];
    if (game.speed >= 8) warn.push("⏩ time is flying: miracles cost double");
    if ((game.godHeat || 0) >= 1.5) warn.push("🔥 you're leaning on miracles: they cost more for a while");
    if ((game.spoil || 0) >= 0.3) warn.push("🍬 your smols are spoiled: they wait for handouts. let them fend for themselves");
    var wt = warn.join("<br>");
    if (el.magicWarn && el.magicWarn._t !== wt) { el.magicWarn._t = wt; el.magicWarn.innerHTML = wt; el.magicWarn.classList.toggle("hide", !wt); }
  }
  function arm(m) {
    var mc = SB.Game.miracleCost(game, m.cost);
    if ((game.sparks || 0) < mc) { toast("not enough sparks ✨ (" + mc + " needed)"); return; }
    if (m.id === "rain" || m.id === "sun" || m.id === "bless") { cast(m, R.camera.x, R.camera.z); return; }
    UI.armed = UI.armed === m ? null : m;
    el.magicInfo.textContent = UI.armed ? m.e + " " + m.desc + ". tap where." : "pick a miracle, then tap the world.";
    updateMagic();
  }
  function disarm() { UI.armed = null; if (el.magicInfo) updateMagic(); }
  UI.castAt = function (x, z) { var m = UI.armed; if (!m) return; cast(m, x, z); };
  function cast(m, x, z) {
    if (m.id === "bless") { blessChooser(m); return; }
    if (m.id === "spawn") {
      var made = SB.Game.sandboxSpawn(game, m.what, x, z);
      if (!made) { toast("can't put that there"); return; }
      if (SB.FX) SB.FX.burst("sparkle", x, SB.World.groundY(game.world, x, z) + 0.6, z, 12);
      if (SB.Audio) SB.Audio.play("pop", { vol: 0.4 });
      return; // stays armed: tap again for another
    }
    if (!SB.Game.spend(game, SB.Game.miracleCost(game, m.cost))) { toast("not enough sparks ✨"); return; }
    SB.Game.usedMiracle(game, m.id);
    SB.Game.spoilFrom(game, m.id);
    var w = game.world, r = game.rng, gy = SB.World.groundY(w, x, z);
    switch (m.id) {
      case "bounty": {
        var kinds = ["apple", "berry", "banana", "apple", "berry"];
        for (var i = 0; i < 7; i++) { var a = r() * 6.28, d = r.range(0.3, 2.2), o = SB.World.add(w, game, r.pick(kinds), x + Math.cos(a) * d, z + Math.sin(a) * d, {}, gy + 6 + r() * 3); o.onGround = false; }
        if (SB.FX) SB.FX.burst("gold", x, gy + 4, z, 20, { r: 2 });
        break;
      }
      case "heal":
        listeners(x, z, 4.5).forEach(function (c) { if (c.species !== "smol") return; SB.Chem.apply(c.chem, { sick: -0.6, pain: -0.6, toxin: -0.5, antigen: -0.5, health: 0.35, fear: -0.2 }); SB.Creature.emote(c, "love", 2); });
        if (SB.FX) SB.FX.burst("sparkle", x, gy + 0.6, z, 26, { r: 3, col: [0.5, 1, 0.6] });
        break;
      case "rain": game.forceWeather = "rain"; w.weather.t = w.weather.next; toast("🌧 the sky opens up"); break;
      case "sun": game.forceWeather = "clear"; w.weather.t = w.weather.next; toast("☀️ the clouds roll away"); break;
      case "bolt": SB.World.lightning(w, game, x, z, true); R.flash(1, true); R.camera.shake = 0.6; break;
      case "inspire":
        listeners(x, z, 6).forEach(function (c) { if (c.species !== "smol") return; c.inspired = 60; SB.Chem.apply(c.chem, { bored: -0.3 }); SB.Creature.emote(c, "idea", 2); });
        if (SB.FX) SB.FX.burst("magic", x, gy + 1, z, 24, { r: 4 });
        break;
      case "gift": {
        var near = listeners(x, z, 10).filter(function (c) { return c.species === "smol"; });
        var tu = near.some(function (c) { return c.tier >= 2; });
        if (tu) { SB.World.add(w, game, "stick", x + 0.4, z, {}); SB.World.add(w, game, "stone", x - 0.4, z, {}); SB.World.add(w, game, "fiber", x, z + 0.4, {}); }
        else SB.World.add(w, game, r.chance(0.5) ? "ball" : "plush", x, z, {}, gy + 3);
        if (SB.FX) SB.FX.burst("sparkle", x, gy + 1, z, 12);
        break;
      }
    }
    game.stats.miracles = (game.stats.miracles || 0) + 1;
    SB.Game.unlock(game, "miracle");
    SB.bus.emit("miracle", { id: m.id, x: x, z: z });
    // answered prayers nearby
    (game.prayers || []).forEach(function (p) {
      var c = SB.Game.byId(game, p.id);
      if (!c || p.answered) return;
      if (SB.dist(c.x, c.z, x, z) < 7 && (m.answers[p.need] || m.id === "heal" && p.need === "nothing")) SB.Creature.prayerAnswered(c, game, "miracle");
    });
    UI.armed = null;
    updateMagic();
    if (el.magicInfo) el.magicInfo.textContent = m.e + " done. pick another or close.";
  }
  var BLESS = [
    { e: "🦵", name: "legs", genes: { limbs: 0.18, senses: 0.09 } },
    { e: "🤲", name: "hands", genes: { arms: 0.18, dexterity: 0.12 } },
    { e: "🧠", name: "bigger brains", genes: { cortex: 0.15, layers: 0.12, recall: 0.09 } },
    { e: "🗣", name: "language", genes: { social: 0.18 } },
    { e: "📐", name: "planning", genes: { planning: 0.18, layers: 0.09 } },
    { e: "👁", name: "big heads", genes: { head: 0.18, recall: 0.09 } },
    { e: "🐟", name: "fins", genes: { fins: 0.22 } },
    { e: "🧶", name: "fluff", genes: { fluff: 0.22 } },
    { e: "✨", name: "inner glow", genes: { glow: 0.18, wings: 0.12 } }
  ];
  function blessChooser(m) {
    var body = h("div", null, [h("p", { class: "note" }, "the next 3 eggs lean this way. a blessing amplifies what their parents practise: bless legs on a family that walks a lot, hands on one that carries things, language on chatty ones. on its own it's much weaker.")]);
    var grid = h("div", { class: "grid2" });
    // which blessings help the most-evolved smols reach their next tier
    var maxT = game.stats.maxTier || 0, want = {};
    SB.Game.smols(game).forEach(function (c) { if (c.tier === maxT) SB.Genome.nextNeeds(c.genome).forEach(function (n) { want[n.gene] = 1; }); });
    BLESS.forEach(function (b) {
      var helps = Object.keys(b.genes).some(function (k) { return want[k]; });
      grid.appendChild(h("button", { class: "card", style: "text-align:left", onclick: function () {
        if (!SB.Game.spend(game, SB.Game.miracleCost(game, m.cost))) { toast("not enough sparks ✨"); return; }
        SB.Game.usedMiracle(game, "bless");
        game.blessing = { name: b.name, genes: b.genes, uses: 3 }; game.stats.blessed = (game.stats.blessed || 0) + 1;
        game.stats.miracles = (game.stats.miracles || 0) + 1;
        SB.Game.unlock(game, "miracle");
        SB.bus.emit("miracle", { id: "bless" });
        closeModal(); toast("🧬 blessed: the next 3 eggs lean toward " + b.name);
      } }, [h("div", { class: "big" }, b.e), h("h4", null, b.name), helps ? h("div", { class: "tag" }, "next evolution") : null]));
    });
    body.appendChild(grid);
    modal("🧬 bless the next eggs", body);
  }

  /* ---- orders: signs from the sky (orders.js) ----
     You can't steer a smol, but you can leave signs. Pick one, then tap the island. Who follows is up to them. */
  var ORDER_BTNS = ["rally", "explore", "mark", "build", "nogo", "stock", "home"];
  var ORDER_HELP = "signs from the sky, not commands. smols who trust you follow; stubborn, hungry or scared ones may not. pick one, then tap the island.";
  function renderOrders(force) {
    if (!force && el.sheet.dataset.kind === "orders") return updateOrders();
    el.sheet.dataset.kind = "orders"; el.sheet.dataset.id = "";
    clear(el.sheet);
    el.sheet.appendChild(h("div", { class: "row" }, [h("div", { class: "nm", style: "font-size:14px" }, "🚩 orders"), h("span", { class: "sp" }), el.ordObey = h("span", { class: "mono lime ordobey", title: "about how often your smols follow an order right now" }), h("button", { class: "btn x", title: "close", onclick: function () { setTool("grab", true); } }, "✕")]));
    el.ordGrid = h("div", { class: "miracles orders" });
    ORDER_BTNS.forEach(function (k) {
      var K = SB.Orders.KINDS[k];
      el.ordGrid.appendChild(h("button", { class: "mir", "data-ord": k, title: K.desc, onclick: function () { armOrder(k); } }, [h("span", { class: "e" }, K.e), h("span", null, K.name), h("span", { class: "c need" }, "needs " + SB.TIERS[K.tier].name + "s")]));
    });
    el.ordGrid.appendChild(h("button", { class: "mir", "data-ord": "jobs", title: "nudge what each smol likes doing", onclick: function () { openJobs(); } }, [h("span", { class: "e" }, "📋"), h("span", null, "jobs")]));
    el.sheet.appendChild(el.ordGrid);
    el.sheet.appendChild(el.ordBuild = h("div", { class: "chips ordbuild hide" }));
    el.sheet.appendChild(el.ordWarn = h("div", { class: "note warn hide" }));
    el.sheet.appendChild(el.ordInfo = h("div", { class: "note" }, ORDER_HELP));
    el.sheet.appendChild(el.ordList = h("div", { class: "chips ordlist" }));
    updateOrders(true);
  }
  function updateOrders(force) {
    if (!el.ordGrid || !SB.Orders) return;
    var O = SB.Orders, od = O.ensure(game), maxT = game.stats.maxTier || 0, so = state.order;
    el.ordObey.innerHTML = (od.rallies || 0) < 2 ? "your first 🚩: <b>they come</b>" : "they listen <b>" + Math.round(O.obedience(game) * 100) + "%</b>"; // the first two rally flags always work (orders.js)
    [].forEach.call(el.ordGrid.children, function (b) {
      var k = b.getAttribute("data-ord"), K = O.KINDS[k];
      b.classList.toggle("on", !!so && so.kind === k);
      b.classList.toggle("poor", !!K && maxT < K.tier);
    });
    // which building the blueprint is for
    var showB = !!so && so.kind === "build";
    el.ordBuild.classList.toggle("hide", !showB);
    if (showB) {
      var bl = O.buildable(game), bk = bl.map(function (b) { return b.kind; }).join() + ":" + so.build;
      if (force || el.ordBuild.dataset.key !== bk) {
        el.ordBuild.dataset.key = bk; clear(el.ordBuild);
        if (!bl.length) el.ordBuild.appendChild(h("span", { class: "note" }, "nobody knows how to build anything yet. builders invent huts, farms and fires."));
        bl.forEach(function (b) { el.ordBuild.appendChild(h("button", { class: "chip" + (so.build === b.kind ? " lime" : ""), onclick: function () { so.build = b.kind; el.ordInfo.innerHTML = "📐 " + esc(b.name) + ": tap flat, open ground. green means it fits."; updateOrders(true); } }, b.e + " " + b.name)); });
      }
    }
    var warn = od.heat > 2.5 ? "😤 that's a lot of orders. they're getting annoyed and listen less for a while." : "";
    if (el.ordWarn._t !== warn) { el.ordWarn._t = warn; el.ordWarn.textContent = warn; el.ordWarn.classList.toggle("hide", !warn); }
    // what's out there now
    var key = od.list.map(function (o) { return o.id + ":" + O.followers(game, o) + ":" + (o.yes || 0) + ":" + (o.no || 0) + ":" + (o.n || 0); }).join(",");
    if (!force && el.ordList.dataset.key === key) return;
    el.ordList.dataset.key = key; clear(el.ordList);
    od.list.forEach(function (o) {
      var K = O.KINDS[o.kind], f = O.followers(game, o);
      var txt = o.kind === "mark" ? o.label : o.kind === "build" ? "📐 " + (SB.STRUCTS[o.build] ? SB.STRUCTS[o.build].label : "") : K.e + " " + K.name;
      if (o.kind === "rally") f = Math.max(f, o.yes || 0);
      if (!K.zone && o.kind !== "mark") txt += " · " + f + " going" + (o.no ? ", " + o.no + " nah" : "") + (o.whys ? " (" + Object.keys(o.whys).sort(function (a, b) { return o.whys[b] - o.whys[a]; }).slice(0, 2).join(", ") + ")" : "");
      if (o.kind === "stock" && o.n) txt += " · " + o.n + " brought";
      el.ordList.appendChild(h("span", { class: "chip ordchip" }, [h("button", { class: "lnk", title: "look", onclick: function () { R.flyTo(o.x, o.z, Math.min(R.camera.tZoom, 12), 0.7); } }, txt), h("button", { class: "lnk x", title: "take it back", onclick: function () { O.remove(game, o.id); updateOrders(true); } }, "✕")]));
    });
  }
  function armOrder(k) {
    var K = SB.Orders.KINDS[k];
    if ((game.stats.maxTier || 0) < K.tier) { toast(K.e + " " + K.name + " needs a " + SB.TIERS[K.tier].icon + " " + SB.TIERS[K.tier].name); return; }
    state.order = state.order && state.order.kind === k ? null : { kind: k };
    if (state.order && k === "build") { var bl = SB.Orders.buildable(game); state.order.build = bl.length ? bl[0].kind : null; }
    el.ordInfo.innerHTML = state.order ? K.e + " " + esc(K.desc) + (K.zone ? " tap to place one, tap it again to clear it." : " tap the island.") : ORDER_HELP;
    updateOrders(true);
  }
  UI.orderArmed = function () { return state.tool === "orders" ? state.order : null; };
  UI.armOrder = armOrder;
  // the orders tool tapped the island
  UI.orderTap = function (g, hit) {
    var so = state.order;
    if (hit && hit.type === "creature" && (!so || so.kind !== "mark")) { SB.Game.select(game, hit.ref.id); return; }
    if (!so) { toast("pick an order first: 🚩 rally, 🪓 work, 📐 build…"); return; }
    if (!g) return;
    if (so.kind === "build" && !so.build) { toast("nobody knows how to build anything yet"); return; }
    var res = SB.Orders.place(game, so.kind, g.x, g.z, { hit: hit, build: so.build });
    if (!res.ok) { toast(res.msg || "can't put that there"); return; }
    if (res.removed) toast(res.msg);
    else {
      var K = SB.Orders.KINDS[so.kind];
      if (SB.FX) SB.FX.burst("sparkle", res.o.x, SB.World.groundY(game.world, res.o.x, res.o.z) + 0.6, res.o.z, 10);
      if (SB.Audio) SB.Audio.play("chime", { vol: 0.4 });
      if (so.kind === "rally" || so.kind === "explore") {
        toast(res.o && res.o.first ? "🚩 your first flag: watch them come. the 🚩! bubbles are the ones on their way" : K.e + " " + K.name + " placed. about " + Math.round(SB.Orders.obedience(game, so.kind) * 100) + "% of them will listen", "", 6000);
        state.order = null; el.ordInfo.innerHTML = ORDER_HELP;
        setTimeout(function () { if (state.tool === "orders" && !state.order) setTool("grab"); }, 3000);
        if (res.o && R.camera.tZoom < 12) R.flyTo((res.o.x + R.camera.x) / 2, (res.o.z + R.camera.z) / 2, Math.max(R.camera.tZoom, 13), 0.8); // pull back so the walk is in view
      }
    }
    updateOrders(true);
  };
  function orderChip(c) {
    var p = Math.round(SB.Orders.willing(c, game, "rally") * 100), tr = SB.Orders.trust(c);
    return '<span class="chip ' + (p >= 50 ? "lime" : p < 25 ? "warnc" : "dim") + '" title="trusts the sky ' + Math.round(tr * 100) + '%. tickles, answered prayers and orders that work out build trust">🚩 ' + p + "%</span>";
  }
  // the jobs board: a nudge per smol (high / normal / low) for each kind of work. stubborn smols mostly ignore it
  function openJobs() {
    var O = SB.Orders, smols = SB.Game.smols(game).filter(function (c) { return !c.stranger && c.tier >= 1; });
    var body = h("div", null, [h("p", { class: "note" }, "tap a box to cycle ▲ more, · normal, ▼ less. it's a nudge, not a command: stubborn smols barely notice, and smols who trust you listen more.")]);
    var tbl = h("div", { class: "jobs" });
    tbl.appendChild(h("div", { class: "jrow jhead" }, [h("span", { class: "jn" }, "smol")].concat(O.PRIO.map(function (p) { return h("span", { class: "jc", title: p[2] }, p[1]); }))));
    smols.slice(0, 60).forEach(function (c) {
      var row = h("div", { class: "jrow" }, [h("span", { class: "jn", title: "follows orders ~" + Math.round(O.willing(c, game, "rally") * 100) + "%" }, esc(c.name) + (c.genome.genes.obedience < 0.3 ? " 🙄" : ""))]);
      O.PRIO.forEach(function (p) {
        var v = c.prio && c.prio[p[0]] || 0;
        var b = h("button", { class: "jc jb" + (v > 0 ? " up" : v < 0 ? " down" : ""), title: p[2] }, v > 0 ? "▲" : v < 0 ? "▼" : "·");
        b.addEventListener("click", function () { var nv = v === 0 ? 1 : v > 0 ? -1 : 0; v = nv; O.setPrio(c, p[0], nv); b.textContent = nv > 0 ? "▲" : nv < 0 ? "▼" : "·"; b.className = "jc jb" + (nv > 0 ? " up" : nv < 0 ? " down" : ""); });
        row.appendChild(b);
      });
      tbl.appendChild(row);
    });
    if (!smols.length) tbl.appendChild(h("p", { class: "note" }, "no smols yet."));
    body.appendChild(tbl);
    body.appendChild(h("p", { class: "note" }, O.PRIO.map(function (p) { return p[1] + " " + p[2]; }).join(" · ")));
    modal("📋 jobs", body);
  }
  UI.openJobs = openJobs;
  var ordUnlockedAt = -1, ordUnlockedSeen = false, ordT = 0, annoyT = 0;
  function updateOrdersUI(dt) {
    if (!SB.Orders || !el.tools) return;
    var on = SB.Orders.unlocked(game), b = el.tools.querySelector('[data-tool="orders"]');
    if (b) b.classList.toggle("locked", !on);
    el.tools.classList.add("six");
    if (on && game.tutorial.done && ordUnlockedAt < 0) ordUnlockedAt = game.playTime || 0;
    // blobs: no window the moment the tutorial ends (K-0022: a calm first day). a toast a minute and a half in instead
    if (on && !ordUnlockedSeen && (game.stats.maxTier || 0) < 2 && game.tutorial.done && ordUnlockedAt >= 0 && (game.playTime || 0) - ordUnlockedAt > 90) {
      ordUnlockedSeen = true;
      var seenC = (game.settings = game.settings || {}).cards || (game.settings.cards = {});
      if (!seenC.ordersBlob) { seenC.ordersBlob = 1; toast("🚩 new: <b>orders</b> (key 6). put down a rally flag and your blobs walk to it. tap 🚩 at the bottom to try", "ach", 9000); }
    }
    if (on && !ordUnlockedSeen && (game.stats.maxTier || 0) >= 2 && game.tutorial.done && !state.introRunning && !el.modal) {
      ordUnlockedSeen = true;
      storyCard("orders", "🚩", "the sky's orders", [
        "your smols are clever enough now to notice signs from the sky. pick <b>🚩 orders</b> (key 6) and leave one: a <b>rally flag</b>, an <b>explore beacon</b>, <b>work marks</b> on trees, rocks, bushes, fields and bunnies, <b>blueprints</b> for buildings they know, and <b>zones</b> (no-go, stockpile, home).",
        "they're suggestions, not commands. a smol follows if it <b>trusts you</b> (tickles, answered prayers and orders that worked out build trust; taps cost some), if it isn't stubborn, and if it isn't starving or scared. order too much and they get annoyed.",
        "📋 jobs nudges what each smol likes doing. the strategy is asking for the right thing at the right time: walls round the village before the raid, farms by the river before winter."
      ]);
    }
    if (state.sheet === "orders" && (ordT -= dt) < 0) { ordT = 0.5; updateOrders(false); }
  }
  /* ---- inspecting things ---- */
  UI.inspect = function (hit) {
    state.inspect = hit;
    if (!hit) { if (state.sheet === "inspect") closeSheet(); return; }
    openSheet("inspect");
  };
  function renderInspect(force) {
    var hit = state.inspect;
    if (!hit) { closeSheet(); return; }
    if (!force) return;
    el.sheet.dataset.kind = "inspect"; el.sheet.dataset.id = "";
    clear(el.sheet);
    var ref = hit.ref, def, emoji, label, desc, extra = "";
    if (hit.type === "item") { def = SB.KINDS[ref.kind]; emoji = def.emoji; label = def.label; desc = def.desc; if (ref.data.rotten) extra = "it's gone bad. smols who eat it get sick."; if (ref.kind === "egg") extra = "hatching: " + Math.round((ref.data.progress || 0) * 100) + "%" + (ref.data.genome ? " · gen " + ref.data.gen + " · " + SB.TIERS[SB.Genome.tierOf(ref.data.genome)].name : "") + (ref.data.blessed ? " · blessed 🧬" : ""); }
    else if (hit.type === "node") { def = SB.NODES[ref.kind]; emoji = def.emoji; label = def.label; desc = def.desc; if (ref.state === "burning") extra = "it's on fire!"; if (ref.state === "stump") extra = "chopped. it'll grow back."; if (ref.state === "burnt") extra = "burnt. it'll grow back, slowly."; }
    else if (hit.type === "struct") {
      def = SB.STRUCTS[ref.kind]; emoji = def.emoji; label = def.label; desc = def.desc;
      if (!ref.done) { var need = []; for (var k in ref.need) if (ref.need[k] > 0) need.push(SB.KINDS[k].emoji + " " + ref.need[k] + " " + SB.KINDS[k].label); extra = need.length ? "still needs: " + need.join(", ") : "building… " + Math.round(ref.work / def.work * 100) + "%"; if (ref.founder) extra += " · started by " + ref.founder; }
      else if (ref.kind === "totem") { var ids = Object.keys(ref.data.ideas || {}); extra = ids.length ? "carved here: " + ids.map(function (i) { return SB.Ideas.BY_ID[i].icon + " " + (game.culture.words[i] || SB.Ideas.BY_ID[i].name); }).join(", ") : "blank, for now"; }
      else if (ref.kind === "campfire" || ref.kind === "kiln") extra = ref.data.lit ? "burning · fuel " + Math.round(ref.data.fuel * 100) + "%" : "cold. a smol who knows fire can light it.";
      else if (ref.kind === "farm") extra = "growing: " + Math.round((ref.data.grow || 0) * 100) + "%";
      else if (ref.kind === "grave" && ref.data) { label = "🪦 " + (ref.data.name || "a smol"); extra = ref.data.epitaph || ""; }
    }
    el.sheet.appendChild(h("div", { class: "row" }, [h("div", { class: "av", style: "background:#22242b" }, emoji), h("div", { style: "flex:1;min-width:0" }, [h("div", { class: "nm" }, label), h("div", { class: "sub2" }, desc)]), h("button", { class: "ibtn", onclick: function () { UI.inspect(null); } }, "✕")]));
    if (extra) el.sheet.appendChild(h("div", { class: "thought" }, extra));
    var word = SB.NOUN_WORDS[SB.N[ref.noun]];
    if (word) el.sheet.appendChild(h("div", { class: "note" }, "smols lump this in with “" + word + "”. teach it with 💬 talk."));
  }

  /* ---------------- modals ---------------- */
  function modal(title, body, opts) {
    opts = opts || {};
    if (SB.Possess && SB.Possess.active && !opts.pov) { povHeld.push([title, body, opts]); return; } // no god windows in a smol's eyes: shown on the way out
    if (SB.Lantern && SB.Lantern.running && !opts.live) { popQ.push([title, body, opts]); return; } // a film is playing: it waits (K-0048)
    // an event card (story, stranger, storyteller…) never replaces another one: it waits its turn
    if ((opts.story || opts.sticky) && !opts.paced && !opts.now && !UI.eventReady()) { popQ.push([title, body, opts]); return; }
    if (el.modal && el.modalOpts && (opts.story || opts.sticky) && (el.modalOpts.story || el.modalOpts.sticky)) { popQ.push([title, body, opts]); return; }
    closeModal();
    UI.modalOpen = !opts.live;
    var wrap = h("div", { class: "modal-wrap", onclick: function (e) { if (e.target === wrap && !opts.sticky) closeModal(); } });
    var m = h("div", { class: "modal glass" + (opts.story ? " storycard" : "") + (opts.big ? " big" : "") }, [
      opts.story ? null : h("div", { class: "mh" }, [h("h2", null, title), opts.sticky ? null : h("button", { class: "ibtn", "aria-label": "close", onclick: closeModal }, "✕")]),
      opts.tabs || null,
      h("div", { class: "mb" }, body)
    ]);
    wrap.appendChild(m);
    root.appendChild(wrap);
    el.modal = wrap; el.modalBody = m.querySelector(".mb"); el.modalOpts = opts; el.modalArgs = [title, body, opts];
    root.classList.add("hasmodal");
    return wrap;
  }
  var popQ = []; // event windows waiting for the one on screen to close
  function closeModal() {
    if (el.modal) { if (el.modalOpts && (el.modalOpts.story || el.modalOpts.sticky)) lastEventClose = now(); el.modal.remove(); el.modal = null; el.modalOpts = null; }
    if (root) root.classList.remove("hasmodal");
    UI.modalOpen = false;
    state.brainC = null;
  }
  UI.closeModal = closeModal;
  // a film is starting: the window on screen steps aside and comes back after it
  UI.holdForFilm = function () {
    if (!el.modal || !el.modalArgs || (el.modalOpts && el.modalOpts.live)) return;
    var a = el.modalArgs; closeModal();
    popQ.unshift([a[0], a[1], Object.assign({}, a[2], { resume: true })]);
  };
  UI.modal = modal;

  /* ---------------- menu / smolpedia ---------------- */
  /* ---------------- civilization: eras, money, council, laws ---------------- */
  function jobChip(c) { var J = c.job && SB.Civ && SB.Civ.JOBS[c.job]; return J ? " · <span class='lilac'>" + J.icon + " " + J.name + "</span>" : ""; }
  function eraMissing() {
    if (!SB.Civ) return "";
    var e = SB.Civ.era(game), n = SB.Civ.needs(game)[e];
    return n ? n.filter(function (x) { return !x.ok; }).map(function (x) { return x.label; }).join(", ") : "";
  }
  // goals-strip steps toward the next era
  function civGoals(add) {
    if (!SB.Civ || !game.civ) return;
    var e = SB.Civ.era(game), n = SB.Civ.needs(game)[e], A = game.achievements;
    if (!n || (e === 0 && !A.built)) return;
    var got = n.filter(function (x) { return x.ok; }).length, miss = n.filter(function (x) { return !x.ok; })[0];
    add("become a " + SB.Civ.ERAS[e + 1].icon + " " + SB.Civ.ERAS[e + 1].name + (miss ? ": " + miss.label : ": any moment now"), got + "/" + n.length);
  }
  function tabCiv(body) {
    var C = SB.Civ, E = SB.Economy, v = game.civ || {}, e = C ? C.era(game) : 0;
    if (!C) return;
    body.appendChild(h("div", { class: "sec" }, [h("span", null, "era"), h("span", { class: "dim" }, "room for " + SB.Game.POP_CAP + " smols")]));
    var row = h("div", { class: "erarow", style: "display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 8px" });
    C.ERAS.forEach(function (E2, i) { row.appendChild(h("span", { class: "chip " + (i === e ? "lime" : i < e ? "" : "dim") }, E2.icon + " " + E2.name + (v.eraT && v.eraT[i] != null ? " · day " + (Math.floor(v.eraT[i] / SB.DAY_LENGTH) + 1) : ""))); });
    body.appendChild(row);
    body.appendChild(h("p", { class: "note" }, C.ERAS[e].desc + " eras live in heads: if the smols lose what made them a " + C.ERAS[e].name + ", it slides back."));
    var nx = C.needs(game)[e];
    if (nx) {
      body.appendChild(h("div", { class: "sec" }, "to become a " + C.ERAS[e + 1].icon + " " + C.ERAS[e + 1].name));
      nx.forEach(function (x) { body.appendChild(h("div", { class: "it list" }, (x.ok ? "✅ " : "⬜ ") + x.label)); });
    }
    // money
    if (E && game.econ) {
      var ec = game.econ, db = E.debts(game);
      body.appendChild(h("div", { class: "sec" }, [h("span", null, "money"), h("span", { class: "dim" }, E.moneyIcon(game) + " " + E.money(game))]));
      var lines = [];
      lines.push(db.n + " debts remembered (" + db.total + " owed)" + (ec.forgot ? ", " + ec.forgot + " forgotten" : ""));
      if (ec.coins) lines.push(Math.round(E.supply(game)) + " " + (ec.copper ? "coins" : "shells") + " going round" + (ec.printed ? " · " + ec.printed + " fell from the sky" : "") + (ec.minted ? " · " + ec.minted + " minted" : ""));
      lines.push("prices are " + Math.round((ec.index || 1) * 100) + "% of the old normal" + (ec.cpi.length > 3 ? " (was " + Math.round(ec.cpi[Math.max(0, ec.cpi.length - 30)][1] * 100) + "% half an hour ago)" : ""));
      lines.push(ec.sales + " things sold at stalls");
      lines.forEach(function (t) { body.appendChild(h("p", { class: "note" }, t)); });
      var pr = h("div", { style: "display:flex;gap:6px;flex-wrap:wrap" });
      Object.keys(E.GOODS).forEach(function (g) { pr.appendChild(h("span", { class: "chip" }, E.GOODS[g].icon + " " + ec.price[g].toFixed(1))); });
      body.appendChild(pr);
      if (ec.coins) body.appendChild(h("p", { class: "note" }, "the 🍎 bounty miracle drops shells too. more shells, same apples: prices go up."));
      var st = E.stalls(game);
      if (st.length) {
        body.appendChild(h("div", { class: "sec" }, "stalls"));
        st.forEach(function (s) { var d = s.data, o = SB.Game.byId(game, d.owner); if (!d.good) return; body.appendChild(h("div", { class: "it list", onclick: function () { closeModal(); R.flyTo(s.x, s.z, 6, 0.9); } }, E.GOODS[d.good].icon + " " + E.GOODS[d.good].name + " · asks " + d.ask.toFixed(1) + " · " + d.stock + " left · " + (o ? o.name : "nobody") + (E.settled(s) ? " · settled" : ""))); });
      }
    }
    // jobs
    var jobs = {};
    SB.Game.smols(game).forEach(function (c) { if (c.job) (jobs[c.job] = jobs[c.job] || []).push(c.name); });
    if (Object.keys(jobs).length) {
      body.appendChild(h("div", { class: "sec" }, "jobs"));
      Object.keys(jobs).forEach(function (j) { body.appendChild(h("p", { class: "note" }, C.JOBS[j].icon + " " + jobs[j].length + " " + C.JOBS[j].name + (jobs[j].length > 1 ? "s" : "") + ": " + jobs[j].slice(0, 6).join(", "))); });
    }
    if (v.districts && v.districts.length) {
      body.appendChild(h("div", { class: "sec" }, "quarters"));
      v.districts.forEach(function (d) { body.appendChild(h("div", { class: "it list", onclick: function () { closeModal(); R.flyTo(d.x, d.z, 14, 0.9); } }, "🗺 " + d.name + " · " + d.n + " buildings")); });
    }
    // council and law
    if (e >= 3 && v.council) {
      var L = v.council.leader != null && SB.Game.byId(game, v.council.leader);
      body.appendChild(h("div", { class: "sec" }, [h("span", null, "council"), h("span", { class: "dim" }, v.council.approval != null ? "approval " + v.council.approval : "")]));
      body.appendChild(h("p", { class: "note" }, L ? "🏛 " + L.name + " leads: " + C.policyText(v.council.policies).join(", ") + "." : "no leader yet. the next season's vote will pick one."));
      body.appendChild(h("div", { class: "sec" }, "the law of the sky"));
      if (!v.laws.length) body.appendChild(h("p", { class: "note" }, "the scribe is watching what you 👆 tap and 🪶 tickle, and what the smol was doing. do the same thing often and it'll be written down as law. guards enforce it."));
      v.laws.slice().reverse().forEach(function (l) { body.appendChild(h("div", { class: "it list" }, "📜 " + l.text + (l.misread ? " (misread)" : "") + " · " + (l.act === "tap" ? l.broken + " told off" : l.kept + " praised"))); });
    } else body.appendChild(h("p", { class: "note" }, "cities get a council, a leader voted in each season, and laws the scribe reads off your taps and tickles."));
  }
  var TABS = [["evolution", "🧬 evolution"], ["tree", "🌿 tree of life"], ["ideas", "💡 ideas"], ["civ", "🏛 civilization"], ["smols", "🐣 smols"], ["family", "🌳 family"], ["dex", "✨ smoldex"], ["chronicle", "📜 chronicle"], ["goals", "🏆 goals"], ["world", "🏝 world"], ["settings", "⚙️ settings"], ["help", "❓ help"]];
  function openMenu(tab, arg) {
    state.menuTab = tab || "evolution";
    var tabs = h("div", { class: "tabs" });
    TABS.forEach(function (t) { tabs.appendChild(h("button", { class: "tab" + (t[0] === state.menuTab ? " on" : ""), onclick: function () { openMenu(t[0]); } }, t[1])); });
    var body = h("div");
    modal("smolpedia", body, { tabs: tabs, big: true });
    ({ evolution: tabEvolution, tree: tabTree, ideas: tabIdeas, civ: tabCiv, smols: tabSmols, family: tabFamily, dex: tabDex, chronicle: tabChronicle, goals: tabGoals, world: tabWorld, settings: tabSettings, help: tabHelp })[state.menuTab](body, arg);
  }
  UI.openMenu = openMenu;

  function tabDex(body) { if (SB.Cards) SB.Cards.tabDex(body); else body.appendChild(h("p", { class: "note" }, "the smoldex isn't here.")); }
  // the island's history, newest first (Dwarf Fortress legends, tiny)
  function when(t) { var day = Math.floor(t / SB.DAY_LENGTH) + 1, hh = (t / SB.DAY_LENGTH % 1) * 24; return "day " + day + ", " + pad(Math.floor(hh)) + ":" + pad(Math.floor((hh % 1) * 60)); }
  function tabChronicle(body) {
    var ch = (game.chronicle || []).slice().reverse();
    body.appendChild(h("p", { class: "note" }, "everything that mattered on this island: inventions, firsts, brawls, newcomers, the ones we lost."));
    if (!ch.length) { body.appendChild(h("p", { class: "note" }, "nothing yet. give it time.")); return; }
    var list = h("div", { class: "chron" });
    ch.slice(0, 160).forEach(function (e) { list.appendChild(h("div", { class: "ce" }, [h("span", { class: "ci" }, e[1]), h("span", { class: "ct" }, e[2]), h("span", { class: "cd" }, when(e[0]))])); });
    body.appendChild(list);
  }
  // one smol's whole story and social life (RimWorld's social tab)
  function openStory(c) {
    var body = h("div");
    var rel = SB.Social ? SB.Social.relations(game, c) : [];
    body.appendChild(h("div", { class: "sec" }, [h("span", null, "people"), h("span", { class: "dim" }, rel.length ? rel.length + " known" : "")]));
    if (!rel.length) body.appendChild(h("p", { class: "note" }, "doesn't really know anyone yet."));
    rel.slice(0, 14).forEach(function (r) {
      var why = SB.Social.reasons(game, c, r.c).slice(0, 3).map(function (x) { return (x.v > 0 ? "+" : "") + x.v + " " + x.t; }).join(" · ");
      var col = r.v >= 25 ? "lime" : r.v <= -25 ? "warnc" : "dim";
      body.appendChild(h("div", { class: "relrow" }, [
        avatar(r.c.look, r.c.tier),
        h("div", { style: "flex:1;min-width:0" }, [h("div", null, [h("b", null, r.c.name), h("span", { class: "dim" }, " · " + r.label)]), h("div", { class: "note" }, why || "")]),
        h("span", { class: "relv " + col }, (r.v > 0 ? "+" : "") + r.v)
      ]));
    });
    body.appendChild(h("div", { class: "sec" }, "story"));
    var d = (c.diary || []).slice().reverse();
    if (!d.length) body.appendChild(h("p", { class: "note" }, "nothing has happened yet."));
    d.forEach(function (e) { body.appendChild(h("div", { class: "ce" }, [h("span", { class: "ci" }, e[1]), h("span", { class: "ct" }, e[2]), h("span", { class: "cd" }, when(e[0]))])); });
    modal((c.sex === "f" ? "♀ " : "♂ ") + c.name + (c.title ? " the " + c.title : ""), body);
  }
  UI.openStory = openStory;
  function tabEvolution(body) {
    var maxT = game.stats.maxTier || 0;
    var ladder = h("div", { class: "grid2" });
    SB.TIERS.forEach(function (t, i) {
      var got = i <= maxT;
      var need = SB.Genome.TIER_NEEDS[i];
      var needTxt = need ? Object.keys(need).filter(function (k) { return need[k]; }).map(function (k) { return k === "neurons" ? need[k] + " neurons" : k === "layers" ? need[k] + " brain layers" : (SB.Genome.GENE_LABELS[k] || k) + " " + need[k]; }).join(", ") : "where it starts";
      ladder.appendChild(h("div", { class: "card " + (got ? "got" : "locked") }, [h("div", { class: "big" }, got ? t.icon : "❔"), h("h4", { style: "color:" + (got ? t.color : "inherit") }, (i + 1) + ". " + t.name), h("div", null, got ? t.desc : "???"), h("div", { class: "note" }, "needs: " + needTxt)]));
    });
    body.appendChild(h("div", { class: "sec" }, "the ladder"));
    body.appendChild(ladder);
    body.appendChild(h("div", { class: "btnrow" }, [h("button", { class: "btn", onclick: function () { openMenu("tree"); } }, "🌿 see the tree of life (" + SB.Species.count(game) + " species)")]));
  }
  // the tree of life gets a whole tab, sized to fit the menu so you can see every branch at once
  function tabTree(body) {
    body.appendChild(h("div", { class: "sec" }, [h("span", null, "tree of life"), h("span", { class: "dim" }, SB.Species.count(game) + " species · " + SB.Species.living(game) + " alive")]));
    var cap = h("div", { class: "note treecap" }, "tap a species to see its name.");
    var cv = h("canvas", { class: "treecv" });
    body.appendChild(h("div", { class: "tree" }, cv));
    body.appendChild(cap);
    body.appendChild(h("p", { class: "note" }, "new species branch off when a baby climbs a tier or drifts far from its family's genes. species too far apart can't have eggs together. 💫 echoes: what parents practise (walking, carrying, talking, building, thinking) nudges their kids' genes."));
    requestAnimationFrame(function () { drawTree(cv, cap); });
  }
  function drawTree(cv, cap) {
    var clades = game.clades, ids = Object.keys(clades).map(Number).sort(function (a, b) { return a - b; });
    var kids = {};
    ids.forEach(function (id) { var p = clades[id].parent; if (p != null) (kids[p] = kids[p] || []).push(id); });
    // layout: depth = tier-ish order, leaves spread horizontally
    var pos = {}, col = 0;
    function place(id, depth) {
      var ch = kids[id] || [];
      if (!ch.length) { pos[id] = { x: col++, y: depth }; return pos[id].x; }
      var xs = ch.map(function (k) { return place(k, depth + 1); });
      pos[id] = { x: (Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2, y: depth };
      return pos[id].x;
    }
    place(0, 0);
    var cols = Math.max(1, col), depth = 0;
    for (var k in pos) depth = Math.max(depth, pos[k].y);
    // fit the whole tree in the space the menu has: shrink the spacing (and the labels) before ever scrolling
    var W = cv.parentNode.clientWidth || 600, mb = el.modalBody, room = mb ? mb.clientHeight - 150 : 420;
    var sx = Math.max(34, Math.min(130, W / cols)), sy = Math.max(46, Math.min(92, (Math.max(260, room) - 50) / (depth + 1)));
    var dpr = Math.min(2, window.devicePixelRatio || 1), cw = Math.max(W, cols * sx), H = Math.max(160, (depth + 1) * sy + 30);
    var rad = Math.max(8, Math.min(16, Math.min(sx, sy) * 0.2)), full = sx >= 92, short = sx >= 56;
    cv.style.width = cw + "px"; cv.style.height = H + "px";
    cv.parentNode.style.overflowX = cw > W + 1 ? "auto" : "hidden";
    cv.width = cw * dpr; cv.height = H * dpr;
    var ctx = cv.getContext("2d");
    ctx.scale(dpr, dpr);
    function px(id) { return { x: (pos[id].x + 0.5) * cw / cols, y: 22 + rad + pos[id].y * sy }; }
    cv.onclick = function (e) {
      var r = cv.getBoundingClientRect(), zx = cv.offsetWidth / (r.width || 1), zy = cv.offsetHeight / (r.height || 1), mx = (e.clientX - r.left) * zx, my = (e.clientY - r.top) * zy, hit = null, hd = 1e9; // the UI may be zoomed
      ids.forEach(function (id) { if (!pos[id]) return; var p = px(id), d = Math.hypot(p.x - mx, p.y - my); if (d < hd) { hd = d; hit = id; } });
      if (hit == null || hd > rad * 2.2 || !cap) return;
      var c = clades[hit], t = SB.TIERS[c.tier] || SB.TIERS[0];
      cap.textContent = c.name + " (" + c.sci + ") · " + t.name + " · " + (c.extinct ? "extinct" : c.alive + " alive");
    };
    ctx.lineWidth = 2;
    ids.forEach(function (id) { var p = clades[id].parent; if (p == null || !pos[id] || !pos[p]) return; var a = px(p), b = px(id); ctx.strokeStyle = "rgba(181,154,255,0.5)"; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.bezierCurveTo(a.x, (a.y + b.y) / 2, b.x, (a.y + b.y) / 2, b.x, b.y); ctx.stroke(); });
    ids.forEach(function (id) {
      if (!pos[id]) return;
      var c = clades[id], p = px(id), t = SB.TIERS[c.tier] || SB.TIERS[0];
      ctx.globalAlpha = c.extinct ? 0.4 : 1;
      ctx.fillStyle = c.look ? bodyColor(c.look) : "#b59aff";
      ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, 6.283); ctx.fill();
      ctx.strokeStyle = c.alive ? "#c5ff49" : "rgba(255,255,255,0.25)"; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.font = "15px system-ui, apple color emoji"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      SB.Icons.fillText(ctx, t.icon, p.x, p.y + 1, Math.round(rad * 0.9));
      if (short) { ctx.fillStyle = "#f5f3ed"; ctx.font = "800 10px ui-monospace, monospace"; ctx.fillText(c.name.slice(0, full ? 22 : Math.floor(sx / 7)), p.x, p.y + rad + 11); }
      if (full) { ctx.fillStyle = "rgba(245,243,237,0.55)"; ctx.font = "10px system-ui"; ctx.fillText((c.extinct ? "extinct" : c.alive + " alive") + " · " + c.sci, p.x, p.y + rad + 24); }
      ctx.globalAlpha = 1;
    });
  }

  function tabIdeas(body) {
    var cu = game.culture, cs = SB.Ideas.census(game);
    body.appendChild(h("p", { class: "note" }, "ideas live in smols' heads. they're discovered by curious tool-users, then spread by watching, teaching and story poles. if everyone who knows one dies, it's lost."));
    var grid = h("div", { class: "grid2" });
    SB.Ideas.LIST.forEach(function (d) {
      var f = cu.found[d.id], alive = cs.counts[d.id] || 0, lost = cu.lost[d.id] && !alive && !cs.poles[d.id];
      var card = h("div", { class: "card " + (f ? (lost ? "" : "got") : "locked") }, [
        h("div", { class: "big" }, f ? d.icon : "❔"),
        h("h4", null, f ? d.name + (cu.words[d.id] ? " “" + cu.words[d.id] + "”" : "") : "???"),
        h("div", null, f ? d.desc : "hint: " + d.hint),
        h("div", { class: "note" }, f ? (lost ? "🕯 lost. it can be rediscovered." : "known by " + alive + (cs.poles[d.id] ? " · carved on a pole" : "") + " · first: " + f.by + " (gen " + f.gen + ")") : SB.TIERS[d.tier].icon + " " + SB.TIERS[d.tier].name + "s" + (d.needs.length ? " · after " + d.needs.map(function (n) { return SB.Ideas.BY_ID[n].name; }).join(" + ") : ""))
      ]);
      grid.appendChild(card);
    });
    body.appendChild(grid);
  }

  function tabSmols(body) {
    var list = h("div", { class: "list" });
    var cs = game.creatures.filter(function (c) { return c.alive && c.species === "smol"; }).sort(function (a, b) { return b.tier - a.tier || b.iq - a.iq; });
    if (!cs.length) list.appendChild(h("p", { class: "note" }, "no smols right now. an egg is coming."));
    cs.forEach(function (c) {
      list.appendChild(h("div", { class: "it", onclick: function () { closeModal(); SB.Game.select(game, c.id); R.flyTo(c.x, c.z, 7, 0.9); SB.Input.follow(c); } }, [
        avatar(c.look, c.tier, 36),
        h("div", { style: "flex:1;min-width:0" }, [h("div", { class: "mono", style: "font-weight:800" }, c.name), h("div", { class: "sub2" }, SB.TIERS[c.tier].name + " · " + SB.STAGES[c.stage].name + (c.job && SB.Civ && SB.Civ.JOBS[c.job] ? " · " + SB.Civ.JOBS[c.job].icon + " " + SB.Civ.JOBS[c.job].name : "") + " · gen " + c.gen + " · iq " + c.iq + " · " + SB.Ideas.count(c) + " ideas · " + SB.Creature.knownCount(c) + " words")]),
        h("span", { class: "dim" }, "›")
      ]));
    });
    body.appendChild(list);
    // eggs
    var eggs = game.world.items.filter(function (o) { return o.kind === "egg"; });
    if (eggs.length) {
      body.appendChild(h("div", { class: "sec" }, "eggs"));
      eggs.forEach(function (o) { body.appendChild(h("div", { class: "it list", onclick: function () { closeModal(); R.flyTo(o.x, o.z, 6, 0.9); } }, "🥚 gen " + (o.data.gen || 1) + " · " + Math.round((o.data.progress || 0) * 100) + "% · " + (o.data.genome ? SB.TIERS[SB.Genome.tierOf(o.data.genome)].name : ""))); });
    }
  }

  function tabFamily(body, c) {
    var fam = game.family, ids = Object.keys(fam).map(Number);
    if (!ids.length) { body.appendChild(h("p", { class: "note" }, "no family yet.")); return; }
    var byGen = {};
    ids.forEach(function (id) { var f = fam[id]; (byGen[f.gen] = byGen[f.gen] || []).push(f); });
    Object.keys(byGen).map(Number).sort(function (a, b) { return b - a; }).slice(0, 30).forEach(function (g) {
      body.appendChild(h("div", { class: "sec" }, "generation " + g));
      var row = h("div", { class: "chips" });
      byGen[g].slice(-40).forEach(function (f) {
        var live = game.creatures.some(function (x) { return x.id === f.id && x.alive; });
        row.appendChild(h("button", { class: "chip" + (c && c.id === f.id ? " on" : live ? " lime" : " dim"), title: f.died ? "died: " + (f.cause || "") : "alive", onclick: function () { var x = SB.Game.byId(game, f.id); if (x && x.alive) { closeModal(); SB.Game.select(game, x.id); R.flyTo(x.x, x.z, 7, 0.8); } } }, (SB.TIERS[f.tier || 0] || SB.TIERS[0]).icon + " " + f.name + (f.died ? " 🕊" : "")));
      });
      body.appendChild(row);
    });
  }

  function tabGoals(body) {
    if (SB.Quests && SB.Quests.CHAPTERS) {
      var qs = (game.quests || { ch: 0, done: {} }), qb = SB.Quests.board(game);
      body.appendChild(h("div", { class: "sec" }, "quests · chapter " + Math.min(qs.ch + 1, SB.Quests.CHAPTERS.length) + " of " + SB.Quests.CHAPTERS.length));
      SB.Quests.CHAPTERS.forEach(function (ch, i) {
        var state2 = i < qs.ch ? "done" : i === qs.ch ? "now" : "later";
        body.appendChild(h("h4", { class: "qch " + state2 }, (state2 === "done" ? "✓ " : state2 === "now" ? "▸ " : "🔒 ") + "chapter " + (i + 1) + " · " + ch.name));
        if (state2 !== "now" || !qb) return;
        qb.quests.forEach(function (x) {
          var p = x.done ? "✓" : x.need > 1 ? x.have + "/" + x.need : "";
          body.appendChild(h("div", { class: "qrow" + (x.done ? " done" : ""), onclick: function () { closeModal(); questHelp(x.q.id); } }, [h("span", null, x.q.icon + " " + x.q.t), h("span", { class: "dim" }, p + "  +" + x.q.pay + "✨")]));
        });
      });
      body.appendChild(h("div", { class: "sec" }, "milestones"));
    }
    var got = Object.keys(game.achievements).length;
    body.appendChild(h("p", { class: "note" }, got + " / " + SB.ACHIEVEMENTS.length + " milestones"));
    var grid = h("div", { class: "grid2" });
    SB.ACHIEVEMENTS.forEach(function (a) {
      var has = !!game.achievements[a.id];
      grid.appendChild(h("div", { class: "card " + (has ? "got" : "locked") }, [h("div", { class: "big" }, has ? a.icon : "🔒"), h("h4", null, a.name), h("div", null, a.desc)]));
    });
    body.appendChild(grid);
  }

  function tabWorld(body) {
    var code = SB.worldCode(game.seed), s = game.stats;
    var url = "https://computercooked.com/games/smol-brains/play/?world=" + code;
    body.appendChild(h("div", { class: "sec" }, "this world"));
    body.appendChild(h("div", { class: "row wrap" }, [h("span", { class: "chip lime mono", style: "font-size:14px" }, "🌱 " + code), h("button", { class: "btn", onclick: function () { copy(url, "world link copied. friends who open it get the same island."); SB.Game.unlock(game, "seed"); } }, "copy world link"), h("button", { class: "btn go", onclick: function () { civCard(); } }, "🪪 civilisation card")]));
    var tribe = game.tribes && game.tribes[0];
    var stats = [
      ["tribe", tribe && tribe.name ? tribe.name : "(not named yet)"], ["highest tier", SB.TIERS[s.maxTier || 0].icon + " " + SB.TIERS[s.maxTier || 0].name], ["generations", s.maxGen],
      ["ideas discovered", Object.keys(game.culture.found).length + " / " + SB.Ideas.LIST.length], ["species ever", SB.Species.count(game)], ["villages", game.villages.length],
      ["smols hatched", s.hatched], ["smols remembered", s.deaths], ["words taught", s.wordsTaught], ["best iq", s.bestIQ], ["buildings", s.built || 0], ["prayers answered", s.prayersAnswered || 0],
      ["day", SB.World.clock(game.world).day], ["civ score", SB.Game.score(game)]
    ];
    stats.forEach(function (r) { body.appendChild(h("div", { class: "stat" }, [h("span", null, r[0]), h("b", null, String(r[1]))])); });
    body.appendChild(h("div", { class: "sec" }, "another world"));
    var inp = h("input", { type: "text", placeholder: "world code, e.g. mossy-otter-4821 (or any word)", style: "width:100%" });
    body.appendChild(inp);
    body.appendChild(h("div", { class: "btnrow" }, [
      h("button", { class: "btn", onclick: function () { var sd = SB.parseWorldCode(inp.value); if (!sd) { toast("type a world code first"); return; } confirmNew(sd); } }, "go to that world"),
      h("button", { class: "btn", onclick: function () { confirmNew(SB.newSeed()); } }, "🎲 random new world")
    ]));
    body.appendChild(h("p", { class: "note" }, "a new world doesn't delete this one: it stays under 📂 load game on the title screen. your smols don't come along, but you can bring any smol with its code."));
    body.appendChild(h("div", { class: "sec" }, "bring a smol in"));
    var imp = h("input", { type: "text", placeholder: "paste a SMOL code", style: "width:100%" });
    body.appendChild(imp);
    body.appendChild(h("div", { class: "btnrow" }, [h("button", { class: "btn", onclick: function () { importSmol(imp.value); } }, "🌌 bring it in")]));
  }
  function confirmNew(seed) {
    var body = h("div", null, [h("p", null, "make world " + SB.worldCode(seed) + "? this island is saved and waits for you under 📂 load game. you'll pick a name, a size and the world settings next."), h("div", { class: "btnrow" }, [h("button", { class: "btn go", onclick: function () { closeModal(); newWorld(seed); } }, "🌱 create world"), h("button", { class: "btn", onclick: closeModal }, "cancel")])]);
    modal("new world?", body);
  }
  // a new island goes through the title screen's "create world" page (this one is saved first)
  function newWorld(seed) {
    try { SB.Save.save(game); } catch (e) {}
    try { window.sessionStorage.setItem("smolbrains-newseed", String(seed || "")); } catch (e) {}
    SB.Game.reloadTo("title");
  }
  UI.toTitle = function () { try { SB.Save.save(game); } catch (e) {} SB.Game.reloadTo("title"); };
  UI.confirmRestart = function () { // from the menu or the site's restart button (K-0051: "restart did nothing visible": a window in a body waits for you to leave)
    if (SB.Possess && SB.Possess.active) SB.Possess.leave("menu");
    confirmNew(SB.newSeed());
  };

  function importSmol(code) {
    try {
      var d = SB.Save.importSmol(code);
      if (SB.Collect && d.key && SB.Collect.seenImport(game, d.key, d.oid)) { toast("🌌 " + esc(d.name) + " is already on this island. each smol can only come in once."); return; }
      var sp = SB.Society.home(game, 0);
      var c = SB.Game.spawnSmol(game, { genome: d.genome, name: d.name, gen: d.gen, vocab: d.vocab, ideas: d.ideas, age: d.age, x: sp.x + 1, z: sp.z + 1, brain: d.brain ? SB.Brain.deserialize(d.brain, d.genome, game.rng) : null, how: "import" });
      if (SB.Collect && d.key) { if (d.oid) c.oid = d.oid; SB.Collect.markImport(game, d.key); }
      game.stats.imported++;
      SB.Game.unlock(game, "import");
      closeModal(); SB.Game.select(game, c.id); R.flyTo(c.x, c.z, 7, 1);
      var ci = SB.Collect && SB.Collect.info(c);
      moment("🌌", c.name + " arrived!", ci && ci.tier >= 2 ? "a " + ci.rarity.name + " smol from somewhere else (" + ci.rarest.name + ")" : "a smol from somewhere else", "lilac");
    } catch (e) { toast(e && e.tampered ? "that smol code has been changed or mistyped, so it won't work 🔒" : "that's not a smol code 🤔"); }
  }
  function shareSmol(c) {
    var code = SB.Save.exportSmol(c);
    var body = h("div", null, [h("p", { class: "note" }, "this code is " + c.name + ": genes, trained brain, words and ideas. paste it into any world (smolpedia → world)."), h("div", { class: "code" }, code), h("div", { class: "btnrow" }, [h("button", { class: "btn go", onclick: function () { copy(code, "smol code copied"); game.stats.exported++; SB.Game.unlock(game, "share"); } }, "copy code")])]);
    modal("📤 " + c.name + "'s code", body);
  }
  function copy(text, msg) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast(msg); }, function () { toast(text); });
      else toast(text);
    } catch (e) { toast(text); }
  }

  function tabSettings(body) {
    var muted = SB.Audio && SB.Audio.isUserMuted && SB.Audio.isUserMuted();
    body.appendChild(h("div", { class: "btnrow" }, [
      h("button", { class: "btn", onclick: function () { SB.Audio.setMuted(!SB.Audio.isUserMuted(), "user"); openMenu("settings"); } }, muted ? "🔇 sound off" : "🔊 sound on"),
      h("button", { class: "btn", onclick: function () { SB.Bodies.labels = !SB.Bodies.labels; openMenu("settings"); } }, SB.Bodies.labels ? "🏷 names on" : "🏷 names off"),
      h("button", { class: "btn", onclick: function () {
        // the look is chosen when the 3D view starts, so switching saves and reloads: pixel art → hd pixel → classic 3D
        try { window.localStorage.setItem("smolbrains-look", R.hd ? "3d" : R.pixel ? "hd" : "pixel"); } catch (e) {}
        SB.Save.save(game); location.reload();
      } }, R.hd ? "✨ hd pixel (tap for classic 3D)" : R.pixel ? "👾 pixel art (tap for hd pixel)" : "🧊 classic 3D (tap for pixel art)"),
      R.pixel ? null : h("button", { class: "btn", onclick: function () { var q = R.quality; q.scale = q.scale >= 1 ? 0.6 : 1; R.resize(); openMenu("settings"); } }, R.quality.scale >= 1 ? "🖥 sharp" : "🔋 battery saver"),
      R.hd ? h("button", { class: "btn", onclick: function () { var q = R.quality; q.fx = !q.fx; q.fxPinned = true; try { window.localStorage.setItem("smolbrains-hdfx", q.fx ? "1" : "0"); } catch (e) {} R.resize(); openMenu("settings"); } }, R.quality.fx ? "🌅 soft focus & glow on" : "🔋 soft focus & glow off") : null,
      h("button", { class: "btn", onclick: function () { R.quality.decor = !R.quality.decor; openMenu("settings"); } }, R.quality.decor ? "🌼 grass & flowers on" : "🌼 grass off"),
      h("button", { class: "btn", onclick: function () { var set = game.settings = game.settings || {}; set.guide = !guideOn(); if (set.guide) set.cards = {}; openMenu("settings"); toast(set.guide ? "🧭 tutorial tips on. explanations will show again as things happen." : "🧭 tutorial tips off."); } }, guideOn() ? "🧭 tutorial tips on" : "🧭 tutorial tips off"),
      h("button", { class: "btn", onclick: function () { UI.replayIntro(); } }, "🏮 watch the opening again"),
      game.ended ? h("button", { class: "btn", onclick: function () { closeModal(); SB.Intro.play({ scene: "end", noGate: true }); } }, "🌟 watch the ending again") : null
    ]));
    // the soundtrack: a volume, and a jukebox of every song you've heard so far
    if (SB.Music) {
      var MU = SB.Music, mv = MU.volume(), np = MU.now();
      body.appendChild(h("div", { class: "sec" }, "music: songs for small minds"));
      body.appendChild(h("div", { class: "btnrow" }, [["off", 0], ["quiet", 0.4], ["normal", 0.8], ["loud", 1]].map(function (o) {
        return h("button", { class: "btn" + (Math.abs(mv - o[1]) < 0.05 ? " go" : ""), onclick: function () { MU.setVolume(o[1]); openMenu("settings"); } }, "♪ " + o[0]);
      }).concat([np ? h("button", { class: "btn", onclick: function () { MU.skip(); setTimeout(function () { openMenu("settings"); }, 300); } }, "⏭ next song") : null])));
      var nHeard = MU.SONGS.filter(function (s) { return MU.heard(s.id); }).length;
      body.appendChild(h("p", { class: "note", html: (np ? "now playing: <b class='lime'>" + np.title + "</b>. " : "") + "you've heard " + nHeard + " of " + MU.SONGS.length + " songs. some only play in one season, at night, in the rain, or once the smols get clever." }));
      body.appendChild(h("div", { class: "jukebox" }, MU.SONGS.map(function (s, i) {
        var got = MU.heard(s.id);
        return h("button", { class: "track" + (np && np.id === s.id ? " on" : "") + (got ? "" : " locked"), disabled: got ? null : "disabled", onclick: function () { if (!MU.volume()) MU.setVolume(0.8); MU.play(s.id, { pin: true }); setTimeout(function () { openMenu("settings"); }, 300); } },
          (i + 1) + ". " + (got ? s.title : "???"));
      })));
    }
    // the storyteller: how often trouble (and luck) comes, and how hard
    var ST = [["calm", "🌿 calm", "fewer, gentler events. for watching your smols grow."], ["balanced", "⚖️ balanced", "the way it's meant to be played."], ["wild", "🔥 wild", "more raids, more storms, more chaos."]];
    var cur = (game.settings && game.settings.storyteller) || "balanced";
    body.appendChild(h("div", { class: "sec" }, "storyteller"));
    body.appendChild(h("div", { class: "btnrow" }, ST.map(function (o) { return h("button", { class: "btn" + (o[0] === cur ? " go" : ""), onclick: function () { (game.settings = game.settings || {}).storyteller = o[0]; openMenu("settings"); } }, o[1]); })));
    body.appendChild(h("p", { class: "note" }, ST.filter(function (o) { return o[0] === cur; })[0][2] + (game.ngPlus ? " (new game+ " + game.ngPlus + ": the grumps remember you.)" : "")));
    // seasons: 40 minutes each, or 10 to see the whole year sooner
    var sh = game.settings && game.settings.seasons === "short";
    body.appendChild(h("div", { class: "sec" }, "seasons"));
    body.appendChild(h("div", { class: "btnrow" }, [["normal", "🍂 normal"], ["short", "⏩ short"]].map(function (o) { return h("button", { class: "btn" + ((o[0] === "short") === sh ? " go" : ""), onclick: function () { var s = (game.settings = game.settings || {}); if (o[0] === "short") s.seasons = "short"; else delete s.seasons; openMenu("settings"); } }, o[1]); })));
    body.appendChild(h("p", { class: "note" }, sh ? "10 minutes a season at 1×: a whole year in 40 minutes." : "40 minutes a season at 1×. short seasons show you the whole year sooner."));
    body.appendChild(h("div", { class: "sec" }, "save"));
    var ago = SB.Save.lastAt ? Math.round((Date.now() - SB.Save.lastAt) / 1000) : -1;
    body.appendChild(h("p", { class: "note" }, "the game saves itself every 20 seconds (💾 blinks by the menu) and when you leave. " + (ago >= 0 ? "last saved " + (ago < 5 ? "just now" : ago + " s ago") + ". " : "") + "while you're away, the island keeps going for a while."));
    var nCopies = SB.Save.copies ? SB.Save.copies(game).length : 0;
    body.appendChild(h("div", { class: "btnrow" }, [h("button", { class: "btn", onclick: function () { SB.Save.save(game); toast("saved 💾"); } }, "save now"),
      SB.Save.keepCopy ? h("button", { class: "btn", title: "a save slot: keep this island as it is now, to come back to from 📂 load game", onclick: function () {
        var b = this; b.disabled = true;
        SB.Save.keepCopy(game).then(function (m) {
          b.disabled = false;
          if (!m) { toast("this browser can only keep one island, so there's no room for a copy"); return; }
          toast("📌 kept a copy: “" + esc(m.name) + "”. it's in 🏠 title screen → 📂 load game", "ach");
          if (state.menuTab === "settings" && el.modal) openMenu("settings");
        });
      } }, "📌 keep a copy" + (nCopies ? " (" + nCopies + ")" : "")) : null, h("button", { class: "btn", onclick: function () { UI.toTitle(); } }, "🏠 title screen · other islands"), h("button", { class: "btn warn", onclick: function () { UI.confirmRestart(); } }, "🌱 new world")]));
    // text size: the whole interface zooms as one
    if (SB.Title) {
      var uz = SB.Title.uiScale();
      body.appendChild(h("div", { class: "sec" }, "text & menu size"));
      body.appendChild(h("div", { class: "btnrow" }, [["auto", "auto"], ["1", "normal"], ["1.2", "big"], ["1.4", "bigger"], ["1.65", "huge"]].map(function (o) { return h("button", { class: "btn" + (o[0] === uz ? " go" : ""), onclick: function () { SB.Title.setUiScale(o[0]); openMenu("settings"); } }, o[1]); })));
    }
    if (SB.Save.loadV1()) body.appendChild(h("p", { class: "note" }, "your old valley save (v1) is still kept safe on this device."));
  }

  function tabHelp(body) {
    body.innerHTML = "<p><b class='lime'>the last lantern</b>: the smols are tiny, forgetful creatures living on the back of a sleeping giant, the Hollow. long ago they lit a Lantern to remember who they are. every night it burns a little lower, and as it fades their memories fade with it: that's why their brains are smol. <b>you are the Lantern's last spark.</b> Pip, the smallest smol, made one last wish into the dying flame, and it lifted you into the sky. you can watch over them and nudge them, but you can't touch the world. you can only <b>lend your light</b> to one smol at a time (👁 possess): while you're inside it remembers everything and is brave. <b>grumps</b> are smols whose light went out completely. they hunt the light, and that includes you.</p>" +
      "<p><b class='lime'>smol brains</b> is an island of tiny creatures with real neural-network brains. you don't control them. you raise them.</p>" +
      "<p><b class='lime'>your role</b>: you're their god. smols decide everything themselves, by trial and error. you nudge: reward the good stuff, scold the bad, teach words, move things around, and spend sparks on miracles when they pray. the goals list (top left) always says what's next.</p>" +
      "<p><b class='lime'>food & survival</b>: smols forage berries, apples, sunroots, gourds, honey and more. hunger, cold, sickness, grumps at night and deep water can kill them. once they're builders, farms feed the colony through winter. when food runs short, they stop having babies.</p>" +
      "<p>✋ <b>grab</b>: tap a smol to see inside it, drag smols and things around, throw them (gently: the dotted arc shows where they'll land). grab a tree and wiggle it side to side to shake fruit down. drag empty ground to move the camera.<br>🪶 <b>tickle</b>: a reward. tap or rub a smol right after it does something good.<br>👆 <b>tap</b>: a scolding. it stops and learns not to.<br>💬 <b>talk</b>: the word book. pick a word, then show it: tap a thing for its name, or tap a smol and ask it to do something. one lesson per smol every few seconds. words most of the tribe knows make everyone smarter and become 📣 calls.<br>📜 <b>story</b>: every smol remembers who hit it, who shared food, who taught it things. friends stick together, rivals shove and brawl, and builders and up hold real conversations (gossip spreads grudges). tap a smol, then 📜 story. a gift of food mends a grudge; 👆 tap ends a tantrum; 🪶 tickle comforts the grieving.<br>✨ <b>magic</b>: spend sparks on miracles. sparks come from smols learning, discovering, hatching and praying.<br>🚩 <b>orders</b>: signs from the sky. after the tutorial even blobs follow a rally flag (\"go there\") and keep to home and no-go zones; tool-users add an explore beacon, work marks, building blueprints and a stockpile. smols follow if they trust you; 📋 jobs nudges what each one likes doing.</p>" +
      "<p><b class='lilac'>evolution</b>: genes mutate when eggs are made. and what parents practise echoes into their babies: smols that walk a lot have kids with longer legs, smols that fiddle with things have kids with hands, smols that learn have kids with bigger brains. climb the ladder: blob → critter → tool-user → tribe → builder → thinker → ascended.</p>" +
      "<p><b class='lilac'>ideas</b>: tool-users discover crafts (poke sticks, fire, spears…), tribes teach each other and pray to you, builders make huts, farms and villages, thinkers write ideas on story poles so nothing is forgotten.</p>" +
      "<p><b class='lime'>👁 possess</b> (smol card, " + (SB.Possess ? SB.Possess.COST : 3) + " sparks): live as one smol, first person. survival-game rules: a 9-slot hotbar (1-9 or the wheel), a bag (tab) with crafting beside it, hearts and drumsticks to keep up. left click uses what you hold on what you point at (a tool chops trees and chips rock, paws only shake and punch), right click eats, plants, gives or places, f picks up, q drops, e does what the prompt says, b opens your building plans (r turns the ghost). put a stick, a vine (they hang off cliffs, rocks and riverbanks) and a rock together for your first tool. at zero hearts the smol dies for real, with everything it carried. phones: thumbstick on the left, drag the right side to look, the big button does what it says, tap a hotbar slot to hold it.</p>" +
      "<p>camera: drag to pan, pinch or wheel to zoom, twist with two fingers (or right-drag, or q/e) to rotate, slide two fingers up or down (or right-drag up/down, or r/v) to tilt and look across the land. the map (bottom left) jumps anywhere: tap it or drag the white box. keys: wasd pan, 1-6 tools, space pause, [ ] speed, f follow, b brain, m map, esc close.</p>";
    body.appendChild(h("div", { class: "btnrow" }, [h("button", { class: "btn", onclick: function () { UI.replayIntro(); } }, "🏮 watch the last lantern (the intro)")]));
    var gm = SB.Game.current, films = SB.Lantern && gm && gm.lantern && gm.lantern.films ? Object.keys(SB.Lantern.SCENES).filter(function (k) { return gm.lantern.films[k] || (k === "dawn" && gm.tutorial && gm.tutorial.night && gm.tutorial.night.done); }) : [];
    if (films.length) body.appendChild(h("div", { class: "btnrow" }, films.map(function (k) { return h("button", { class: "btn", onclick: function () { closeModal(); closeSheet(); SB.Lantern.play({ scene: k, noGate: true }); } }, "🎞 " + SB.Lantern.SCENES[k].name); })));
  }

  /* ---------------- brain viewer ---------------- */
  function openBrain(c) {
    SB.Game.unlock(game, "brain");
    var cv = h("canvas", { class: "braincv" });
    var info = h("div", { class: "note" });
    // the rest of its mind (SB.Mind): inner voice, memories, the map in its head, dreams
    var mind = h("div", { class: "mindp" });
    var mcss = h("style", null, ".mindp{margin-top:10px;font-size:13px;line-height:1.45}.mindp .mindv{background:rgba(255,255,255,.05);border-radius:8px;padding:8px 10px}.mindp .ml b{display:inline-block;min-width:68px;color:#c5ff49;font-weight:600}.mindp .ml.read b,.mindp .ml.dream b{color:#c9a7ff}.mindp .mindl{margin:8px 0;font-size:12px}.mindp .mindl span{margin-right:8px;white-space:nowrap}.mindp .mindl .off{opacity:.45}.mindp .mindh{margin-top:8px;font-weight:600;color:#f5f3ed}.mindp .mm{padding-left:8px}.mindp .dim{opacity:.55;font-size:11px}");
    var body = h("div", null, [h("p", { class: "note" }, "live: left are its senses (feelings, what it sees and hears, memory), middle its hidden neurons, right the actions it could take. lime lines push up, pink push down, flashes are learning."), cv, info, mcss, h("p", { class: "note" }, "its mind: the net picks actions; around it sit memories, a map of places, dreams that retrain the net overnight, curiosity, reading other smols and goals. more switch on as its kind evolves."), mind]);
    modal("🧠 " + c.name + "'s brain", body, { live: true });
    state.brainC = { c: c, cv: cv, info: info, mind: mind, t: 0, mt: 0 };
    tutDone("brain");
  }
  function drawBrain(dt) {
    var B = state.brainC;
    if (!B || !el.modal) return;
    B.t -= dt;
    if (B.t > 0) return;
    B.t = 0.1;
    var c = B.c, b = c.brain, cv = B.cv;
    if (!c.alive) { B.info.textContent = c.name + " is gone. 🕊"; return; }
    if (B.mind && SB.Mind && c.species === "smol" && (B.mt -= 0.1) <= 0) { B.mt = 0.5; B.mind.innerHTML = SB.Mind.panel(c, game); }
    var W = cv.clientWidth || 600, Hh = Math.min(520, Math.max(320, W * 0.75)), dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr); cv.style.height = Hh + "px"; }
    var ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, Hh);
    // pick inputs to show: drives + active ones + memory
    var x = b.x, inIdx = [];
    for (var i = 0; i < b.nIn; i++) if (i < SB.N_DRIVES || x[i] !== 0) inIdx.push(i);
    var L = b.W.length, cols = [inIdx.length].concat(b.hidden).concat([SB.N_VERBS]);
    var colX = function (k) { return 70 + (W - 160) * k / (cols.length - 1); };
    var pos = [];
    for (var k = 0; k < cols.length; k++) {
      var n = cols[k], arr = [];
      var gap = Math.min(22, (Hh - 30) / Math.max(1, n));
      var y0 = (Hh - gap * (n - 1)) / 2;
      for (var j = 0; j < n; j++) arr.push({ x: colX(k), y: y0 + j * gap });
      pos.push(arr);
    }
    // edges: strongest few per neuron
    ctx.lineWidth = 1;
    for (var l = 0; l < L; l++) {
      var Wl = b.W[l], nI = b.sizes[l], nO = b.sizes[l + 1], dW = b.dW[l], acts = b.acts[l];
      for (var o = 0; o < nO; o++) {
        var best = [];
        var srcList = l === 0 ? inIdx : null;
        var nn = l === 0 ? inIdx.length : nI;
        for (var s = 0; s < nn; s++) {
          var si = l === 0 ? srcList[s] : s;
          var w = Wl[o * nI + si], a = l === 0 ? x[si] : acts[si];
          var v = w * (a || 0.05);
          best.push({ s: s, v: v, w: w, f: dW[o * nI + si] });
        }
        best.sort(function (p, q) { return Math.abs(q.v) - Math.abs(p.v); });
        for (var e = 0; e < Math.min(3, best.length); e++) {
          var ed = best[e], A = pos[l][ed.s], Bp = pos[l + 1][o];
          var al = Math.min(0.85, 0.12 + Math.abs(ed.v) * 0.6 + ed.f * 0.8);
          ctx.strokeStyle = ed.f > 0.15 ? "rgba(255,255,255," + al + ")" : ed.w >= 0 ? "rgba(197,255,73," + al + ")" : "rgba(255,95,162," + al + ")";
          ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(Bp.x, Bp.y); ctx.stroke();
        }
      }
    }
    // neurons
    var q = b.q, qmax = -1e9, qmin = 1e9, chosen = b.lastVerb;
    for (i = 0; i < q.length; i++) { if (q[i] > qmax) qmax = q[i]; if (q[i] < qmin) qmin = q[i]; }
    ctx.font = "10px ui-monospace, monospace"; ctx.textBaseline = "middle";
    for (k = 0; k < cols.length; k++) {
      for (j = 0; j < pos[k].length; j++) {
        var P = pos[k][j], act, label = null;
        if (k === 0) { var ii = inIdx[j]; act = x[ii]; label = SB.Brain.inputLabel(b, ii); }
        else if (k === cols.length - 1) { act = (q[j] - qmin) / Math.max(0.001, qmax - qmin) * 2 - 1; label = SB.VERB_EMOJI[j] + " " + SB.VERB_WORDS[j] + " " + q[j].toFixed(2); }
        else act = b.acts[k][j];
        var r = k === 0 || k === cols.length - 1 ? 5 : 4;
        ctx.fillStyle = act > 0 ? "rgba(197,255,73," + (0.25 + Math.min(1, act) * 0.75) + ")" : "rgba(255,95,162," + (0.25 + Math.min(1, -act) * 0.75) + ")";
        ctx.beginPath(); ctx.arc(P.x, P.y, r + (k === cols.length - 1 && j === chosen ? 3 : 0), 0, 6.283); ctx.fill();
        if (k === cols.length - 1 && j === chosen) { ctx.strokeStyle = "#f5f3ed"; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1; }
        if (label) {
          ctx.fillStyle = k === cols.length - 1 && j === chosen ? "#c5ff49" : "rgba(245,243,237,0.75)";
          ctx.textAlign = k === 0 ? "right" : "left";
          ctx.fillText(label.slice(0, 22), P.x + (k === 0 ? -8 : 8), P.y);
        }
      }
    }
    var ex = chosen >= 0 ? SB.Brain.explain(b, chosen) : [];
    B.info.innerHTML = "now: <b class='lime'>" + esc(SB.Creature.thought(c, game)) + "</b>" + (ex.length ? " · because: " + ex.map(function (e2) { return esc(e2.label); }).join(" + ") : "") + "<br>" + b.hidden.join("→") + " hidden neurons" + (b.nMem ? " + " + b.nMem + " memory" : "") + " · learned from " + b.updates + " experiences · last surprise " + b.lastErr.toFixed(2);
  }

  /* ---------------- a pod comes down ----------------
     the cutscene (the pod falling), then the whole island as a map with the crash site marked, then
     back to exactly where you were. the storyteller then asks whether to send a rescue party. */
  var podQ = [];
  function nextPod() {
    var s = podQ[0];
    if (!s) return;
    if (el.modal || state.introRunning || (SB.Intro && SB.Intro.covering) || (R.camera.intro)) { setTimeout(nextPod, 1500); return; }
    if (game.skip) SB.Game.skipStop(game, { why: "🛸 a pod came down", c: null });
    var sp = game.speed || 1; game.speed = 0;
    // back where you were: the first time, a word on what pods are; then straight to "send a rescue party?"
    var resume = function () {
      if (!game.speed) game.speed = sp; podQ.shift();
      if (0) storyCard("podcard", "🛸", "the other pods", ["the ark had thousands of escape pods. some are still drifting in orbit, and every so often one falls.", "each one may hold survivors who aren't related to your tribe, so they can start new families. pods also carry supplies and the ark's logs, which tell the story (and the way home).", "send a rescue party, or they'll climb out after a while and come looking for you."]);
      if (SB.Director && !s.done && game.tutorial.done) setTimeout(function () { if (!s.done && !SB.Director.state(game).active) SB.Director.fire(game, "pod"); }, 20000); // not straight after the map: that ate taps (K-0025)
      if (podQ.length) setTimeout(nextPod, 4000);
    };
    if (SB.Intro && !UI.noStory) SB.Intro.play({ scene: "pod", noGate: true, done: function () { podMap(s, resume); } });
    else podMap(s, resume);
  }
  UI.podBusy = function () { return podQ.length > 0; }; // the cutscene and map are still up: the storyteller waits
  UI.podMap = function (s, done) { podMap(s, done || function () {}); };
  function podMap(s, done) {
    var T = game.world.T, N = T.N, hm = SB.Society.home(game, 0), seenP = (game.settings = game.settings || {}).cards || (game.settings.cards = {}), first = !seenP.podcard;
    seenP.podcard = 1;
    var size = Math.round(Math.min(window.innerWidth * 0.9, window.innerHeight * 0.68, 560));
    var dpr = Math.min(window.devicePixelRatio || 1, 2), cv = h("canvas", { class: "podmapcv", style: "width:" + size + "px;height:" + size + "px" });
    cv.width = cv.height = Math.round(size * dpr);
    var d = Math.round(SB.dist(s.x, s.z, hm.x, hm.z)), a = (Math.atan2(s.x - hm.x, -(s.z - hm.z)) * 180 / Math.PI + 360) % 360;
    var dir = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"][Math.round(a / 45) % 8];
    var cap = h("div", { class: "podcap" }, [h("b", null, "🛸 pod " + (s.n || "") + " came down here"), h("span", null, d + " steps " + dir + " of the village. it's marked on your map."), first ? h("span", { class: "podwhy" }, "the ark's other escape pods still fall now and then. survivors inside aren't family, so they can start new families. pods carry supplies too.") : null]);
    var ok = h("button", { class: "btn go" }, "ok");
    var wrap = h("div", { class: "podmap" }, [cv, cap, ok]);
    root.appendChild(wrap);
    if (!mini.base) { mini.base = document.createElement("canvas"); mini.base.width = mini.base.height = N; var bx = mini.base.getContext("2d"), img = bx.createImageData(N, N); img.data.set(SB.WorldGen.minimap(T)); bx.putImageData(img, 0, 0); }
    var x = cv.getContext("2d"), k = cv.width / N, t0 = performance.now(), closed = false, raf = 0;
    function close() { if (closed) return; closed = true; cancelAnimationFrame(raf); wrap.classList.add("out"); setTimeout(function () { wrap.remove(); }, 400); done(); }
    ok.onclick = function (e) { e.stopPropagation(); close(); };
    wrap.onclick = close;
    (function frame() {
      if (closed) return;
      var t = (performance.now() - t0) / 1000;
      x.imageSmoothingEnabled = false; x.drawImage(mini.base, 0, 0, cv.width, cv.height);
      if (mini.fog) { x.globalAlpha = 0.85; x.imageSmoothingEnabled = true; x.drawImage(mini.fog, 0, 0, cv.width, cv.height); x.globalAlpha = 1; }
      // the village
      x.fillStyle = "#c5ff49"; x.fillRect(hm.x * k - 5 * dpr, hm.z * k - 5 * dpr, 10 * dpr, 10 * dpr);
      x.fillStyle = "#101114"; x.font = "700 " + Math.round(12 * dpr) + "px monospace"; x.textAlign = "center"; x.fillText("home", hm.x * k, hm.z * k - 9 * dpr);
      // the pod streaks in, then the impact rings pulse where it landed
      var fall = Math.min(1, t / 1.1), sx = s.x * k, sz = s.z * k;
      if (fall < 1) {
        var px0 = sx - (1 - fall) * cv.width * 0.5, pz0 = sz - (1 - fall) * cv.height * 0.6;
        for (var i = 0; i < 14; i++) { x.fillStyle = i < 3 ? "#ffffff" : i < 7 ? "#ffd84a" : "#ff9f43"; var q = i * 6 * dpr; x.fillRect(px0 - q * 0.8, pz0 - q, (6 - i / 3) * dpr, (6 - i / 3) * dpr); }
      } else {
        for (var j = 0; j < 3; j++) { var rr = ((t - 1.1) * 40 + j * 22) % 66; x.strokeStyle = "rgba(143,230,220," + Math.max(0, 1 - rr / 66) + ")"; x.lineWidth = 3 * dpr; x.beginPath(); x.arc(sx, sz, rr * dpr, 0, 6.283); x.stroke(); }
        x.fillStyle = "#8fe6dc"; x.fillRect(sx - 6 * dpr, sz - 6 * dpr, 12 * dpr, 12 * dpr); x.fillStyle = "#101114"; x.fillRect(sx - 2 * dpr, sz - 2 * dpr, 4 * dpr, 4 * dpr);
        x.setLineDash([4 * dpr, 4 * dpr]); x.strokeStyle = "rgba(245,243,237,0.7)"; x.lineWidth = 2 * dpr; x.beginPath(); x.moveTo(hm.x * k, hm.z * k); x.lineTo(sx, sz); x.stroke(); x.setLineDash([]);
      }
      if (t > 7) return close();
      raf = requestAnimationFrame(frame);
    })();
    if (SB.Audio && SB.Audio.play) try { SB.Audio.play("whoosh"); setTimeout(function () { SB.Audio.play("thunder", { vol: 0.5 }); }, 1000); } catch (e) {}
  }

  /* ---------------- intro & tutorial ---------------- */
  function intro() {
    state.introRunning = true;
    el.hud.classList.add("hide"); el.tools.classList.add("hide");
    // from the hub's "tap to play" card (cc.autostart): that tap was the start, so go straight to the island
    var auto = false; try { auto = !!(window.cc && cc.autostart && cc.autostart()); } catch (e) {}
    // the opening film, "The Last Lantern" (K-0041): always the first time on a device, even from "play now"; after that when you asked for the story
    // K-0045: the ark battle and its falling pod open it, then the pod knocks the Lantern down and Pip makes the wish
    if (SB.Lantern && !UI.noStory && SB.Lantern.shouldPlay(game, !!SB.Game.quickStart, auto)) { SB.Intro.play({ noGate: !!SB.Game.fromTitle || auto, noSkip: !SB.Lantern.skippable(), skipped: function () { if (SB.TEST) return SB.Lantern.play({ noGate: true, done: landing }); SB.Lantern.markSeen(); landing(); }, done: function () { SB.Lantern.play({ noGate: true, done: landing }); } }); return; } // playtests: skipping the ark film goes on to the Lantern's (the crash), skip again to land // the "create world" tap already let the sound start
    landing();
  }
  UI.replayIntro = function () { closeModal(); closeSheet(); if (SB.Intro) SB.Intro.play({ noGate: true, done: function () { if (SB.Lantern) SB.Lantern.play({ noGate: true }); } }); };
  // after the story: the camera falls with the pod onto the island
  function landing() {
    var T = game.world.T, nest = T.nest;
    // the island's name, and its quirk (a "surprise me" quirk is revealed right here)
    var qk = ((game.settings && game.settings.world && game.settings.world.quirks) || []).map(function (k) { return SB.QUIRKS && SB.QUIRKS[k]; }).filter(Boolean)[0];
    var title = h("div", { class: "title" }, [h("h1", { html: "smol<br><span>brains</span>" }), h("p", null, game.wname ? "the Hollow: " + game.wname + "." : "the Hollow. one last Lantern."), h("p", { class: "quirk" }, "you are its last spark. watch over them."), qk ? h("p", { class: "quirk", html: qk.icon + " <b>" + esc(qk.name) + "</b>: " + esc(qk.desc) }) : null]);
    root.appendChild(title);
    R.camera.x = T.N / 2; R.camera.z = T.N / 2 + 20; R.camera.zoom = R.camera.tZoom = 95; R.camera.yaw = R.camera.tYaw = -0.9;
    R.cinematic({ dur: SB.Game.quickStart ? 2.4 : 5.5, x0: T.N / 2, zz0: T.N / 2 + 20, x1: nest.x, zz1: nest.z, z0: 95, z1: 5.5, yaw0: -0.9, yaw1: 0.35, skippable: true, done: function () {
      title.classList.add("out"); setTimeout(function () { title.remove(); }, 1000);
      el.hud.classList.remove("hide"); el.tools.classList.remove("hide");
      state.introRunning = false;
      askTutorial();
    } });
  }
  // the first question: guided or not. the guide is the opening steps plus tips for the whole game
  function askTutorial() {
    var st = game.tutorial, set = game.settings = game.settings || {};
    if (SB.FirstNight && SB.FirstNight.wants(game)) { set.guide = true; st.step = 0; SB.FirstNight.start(game); tutShow(); return; }
    if (game.ngPlus || st.done || set.guide != null) { st.step = st.step || 0; tutShow(); return; }
    if (SB.Game.quickStart) { set.guide = true; st.step = 0; tutShow(); return; } // play now: the guide starts by itself ("skip tutorial" is always on its card)
    modal("🐣 play the tutorial?", h("div", null, [
      h("p", null, "the tutorial walks you through the first few minutes, then stays with you for the whole game: whenever something new happens (eggs, prayers, raids, crashed pods, seasons…) it explains it, and if you're ever not sure what to do, a tip shows you."),
      h("p", { class: "note" }, "you can switch it on or off any time in ☰ menu → settings."),
      h("div", { class: "btnrow" }, [
        h("button", { class: "btn go", onclick: function () { set.guide = true; closeModal(); st.step = 0; tutShow(); } }, "yes, show me how"),
        h("button", { class: "btn", onclick: function () { set.guide = false; st.done = true; closeModal(); tutShow(); toast("tap the crashed pod to begin. ❓ help is in the menu."); } }, "no, i know how to play")
      ])
    ]), { sticky: true, now: true });
  }
  UI.askTutorial = askTutorial;
  // after the first night: the god's tools (reward, words, tricks) as the next lessons
  UI.afterNight = function () { var held = nightHeld; nightHeld = []; held.forEach(function (t, k) { setTimeout(function () { toast(t[0], t[1], t[2]); }, 2500 + k * 1500); }); var st = game.tutorial; if (st.done) return; var i = TUT.map(function (d) { return d.id; }).indexOf("tickle"); st.step = i >= 0 ? i : st.step; tutShow(); };
  function guideOn() { return !game.settings || game.settings.guide !== false; }
  // the tutorial walks through every mechanic. "do" steps wait for you to try the thing; "read" steps
  // have a next button. it never blocks taps on the island, and it can be skipped at any point.
  var TUT = [
    { id: "pod", t: "tap the crashed pod", s: "something's moving in that pod. tap it a few times to open it." },
    { id: "name", t: "they're out!", s: "" },
    { id: "why", read: 1, t: "why you're here", s: "you're the Lantern's last spark, lifted into the sky by Pip's wish. you can't touch the world, but you can watch over the smols: feed, teach, protect and bless them, or <b>lend your light</b> to one (👁 possess) and live as it. raise them from blobs into a people clever enough to remember who they are." },
    { id: "look", t: "look around", s: "drag to move, pinch or scroll to zoom. <b>tap one of your smols</b> to pick it: it stops still for a few seconds so you can teach it, and its card shows what it's thinking." },
    { id: "food", t: "it's hungry", s: "smols learn by trying things and remembering what felt good. they find food on their own, but you can help: with ✋ grab, <b>drag the apple next to a smol</b>." },
    { id: "tickle", t: "reward it", hl: '[data-tool="tickle"]', s: "🪶 tickle means “yes, more of that”. pick tickle and <b>tap a smol</b> while it eats. 👆 tap means “no, stop that”. rewards and scoldings are how you shape its brain." },
    { id: "word", t: "teach it a word", hl: '[data-tool="talk"]', s: "💬 talk opens the word book at the side. pick “food”, then <b>tap the apple</b> while your smol can see it. one lesson every few seconds. words the whole tribe knows make everyone smarter." },
    { id: "trick", t: "teach it a trick", s: "tap a smol, then <b>🎓 tricks</b> on its card. every bar is read straight from its brain (a real neural network: 🧠 shows it). pick a trick without a ⭐, press <b>set it up</b>, then 🪶 tickle or 👆 tap at the right moment." },
    { id: "guide", read: 1, t: "that's the basics", hl: ".goals", s: "you'll learn the rest as it happens: eggs, evolution, prayers and magic, ideas, buildings, crashed pods, raids, seasons. whenever something new turns up, i'll pop up and explain it. the <b>next</b> list (top left) always shows your next goal, and if you're ever stuck, a tip appears down here with a <b>show me</b> button." }
  ];
  function tutIs(id) { var d = TUT[state.tutStep]; return !!d && d.id === id && !game.tutorial.done; }
  function tutDone(id) { if (tutIs(id)) tutAdvance(); }
  UI.tutIs = tutIs;
  function tutShow() {
    if (el.coach) { el.coach.remove(); el.coach = null; }
    [].forEach.call(document.querySelectorAll(".tutglow"), function (n) { n.classList.remove("tutglow"); });
    var st = game.tutorial;
    if (st.done) { state.tutStep = -1; return; }
    if (SB.FirstNight && SB.FirstNight.active(game) && st.step >= 1) { state.tutStep = -1; return; } // the first night teaches by itself
    state.tutStep = st.step;
    if (st.step === 1) return; // name prompt handles it
    var d = TUT[st.step];
    if (!d) { st.done = true; state.tutStep = -1; return; }
    var last = st.step === TUT.length - 1;
    el.coach = h("div", { class: "coach glass" }, [
      h("div", { class: "t" }, [st.step >= 2 ? h("span", { class: "n" }, (st.step - 1) + "/" + (TUT.length - 2) + " ") : null, d.t]), // the pod comes before step 1 (it read "-1/7")
      d.s ? h("div", { class: "s", html: d.s }) : null,
      h("div", { class: "row" }, [
        !last ? h("button", { class: "btn", onclick: function () { st.done = true; tutShow(); toast("tutorial skipped. ❓ help is in the menu."); } }, "skip tutorial") : null,
        h("span", { class: "sp" }),
        d.read ? h("button", { class: "btn go", onclick: function () { if (last) { st.done = true; tutShow(); } else tutAdvance(); } }, last ? "let's go!" : "next ▸")
          : st.step >= 3 ? h("button", { class: "btn", onclick: function () { tutAdvance(); } }, "next ▸") : null
      ])
    ]);
    root.appendChild(el.coach);
    if (d.hl) [].forEach.call(document.querySelectorAll(d.hl), function (n) { n.classList.add("tutglow"); });
  }
  function tutAdvance(to) {
    var st = game.tutorial;
    if (st.done) return;
    st.step = to != null ? to : st.step + 1;
    if (st.step >= TUT.length) st.done = true;
    tutShow();
  }
  /* ---------------- the guide: tips for the whole game ----------------
     after the opening steps, a small card answers "what's happening / what do i do now". urgent things
     (a smol drowning, a pod down, a prayer, a stranger at the gate) show straight away; the next goal and
     how to get there shows when you've been idle for a bit. each tip has a "show me". */
  var lastAct = performance.now(), guideT = 0, guideKey = "", snooze = {};
  UI.userActed = function () { lastAct = performance.now(); };
  var HOW = [
    [/crashed pod/, "tap the pod a few times. you're helping it open."],
    [/first word/, "tap 💬 talk, pick “food”, then tap a piece of food while a smol is looking at it. one lesson every few seconds."],
    [/tickle/, "pick 🪶 tickle and tap a smol right after it does something good, like eating."],
    [/egg/, "grown-ups who are fed, healthy and happy fall in love. feed them, tickle them, keep them company."],
    [/evolve/, "evolution happens through eggs: kids get a mix of their parents plus a nudge from how they lived (the +🤲 pips). the next list shows who's practising what. ✨ magic → 🧬 bless makes the next 3 eggs lean the way you pick."],
    [/idea/, "tool-users invent by fiddling with things. ✋ hand them sticks and stones, or ✨ magic → 💡 inspire one."],
    [/building/, "builders build by themselves when they need something (huts for cold, farms for food). keep them fed and give them sticks and stones."],
    [/village/, "builders put huts round the campfire when the tribe grows. more smols, more huts."],
    [/big thought|spire/, "the last project: follow the steps in the next list. ascended smols do the work."]
  ];
  function guideTips() {
    var g = game, out = [], smols = SB.Game.smols(g), idle = performance.now() - lastAct > 20000;
    function fly(o, z) { R.flyTo(o.x, o.z, z || 7, 0.9); }
    var dr = smols.filter(function (c) { return (c.drownT || 0) > 0; })[0];
    if (dr) out.push({ key: "drown" + dr.id, icon: "🌊", t: dr.name + " is drowning!", s: "pick ✋ grab and drag " + dr.name + " back onto land.", go: function () { fly(dr, 6); setTool("grab", true); } });
    var pod = (g.sites || []).filter(function (x) { return x.kind === "pod" && !x.done && !x.gone; })[0], act = g.dir && g.dir.active;
    if (pod && !(act && act.id === "pod")) out.push({ key: "pod" + pod.id, icon: "🛸", t: "a pod is down, with survivors inside", s: "send a rescue party before they give up and wander off. it's the flashing 🛸 on your map.", btn: "send rescue", go: function () { if (!(g.dir && g.dir.active)) { pod.asked = false; pod.againT = 0; SB.Director.fire(g, "pod"); } else UI.podMap(pod); } });
    var fu = (g.funerals || []).filter(function (f) { return f.phase === "gather" || f.phase === "rite" || f.phase === "mourn"; })[0];
    if (fu) { var fn = fu.names || "a friend"; out.push({ key: "fun" + fu.id, icon: "🕯", t: "a funeral for " + fn, s: { river: "the tribe is carrying them to the water " + fu.where + ".", pyre: "the tribe is gathering " + fu.where + " for a pyre.", burial: "the tribe is digging a grave " + fu.where + ".", cairn: "the tribe is piling stones " + fu.where + "." }[fu.rite] + " come and watch, or tickle a mourner to comfort them.", btn: "go there", go: function () { R.flyTo(fu.x, fu.z, 8, 1.0); } }); }
    var str = SB.Strangers && SB.Strangers.pending(g);
    if (str && !el.modal) out.push({ key: "str" + str.id, icon: "🧳", t: str.name + " is waiting to join", s: "a survivor is at the edge of the village. welcome them in: newcomers aren't family, so they can start new families.", go: function () { strangerCard(str); } });
    var pr = (g.prayers || []).filter(function (p) { return !p.answered && SB.Game.prayerLive(g, p) && SB.Game.byId(g, p.id); })[0];
    if (pr) {
      var pc = SB.Game.byId(g, pr.id), soft = /lonely|love|bored|fear/.test(pr.need), fix = { hunger: "🍎 bounty", sick: "💚 heal", pain: "💚 heal", cold: "☀️ sun", hot: "🌧 rain", tired: "💤 rest" }[pr.need] || "a miracle";
      out.push({ key: "pray" + pr.id + pr.t, icon: "🙏", t: pc.name + " is praying for " + (NEED_TEXT[pr.need] || pr.need), s: soft ? "it just wants you: pick 🪶 tickle and tap it." : "open ✨ magic, pick " + fix + ", and tap near " + pc.name + ". the right miracle earns sparks.", go: function () { fly(pc, 6); setTool(soft ? "tickle" : "magic", true); } });
    }
    var wsh = g.fh && g.fh.wishes.filter(function (w) { return !w.done && SB.Game.byId(g, w.id); })[0];
    if (wsh) {
      var wc = SB.Game.byId(g, wsh.id), wd = SB.FirstHour.WISHES[wsh.kind];
      var wh = { food: "✋ shake a tree near it (grab the tree and wiggle), or carry it some food.", friend: "✋ carry another smol over and set it down next to " + wc.name + ".", warm: "✋ carry " + wc.name + " to the fire.", toy: "✋ carry it a ball, a stick or a rock." }[wsh.kind];
      out.push({ key: "wish" + wsh.id + wsh.t, icon: "💭", t: wc.name + " wishes for " + wd.text, s: wh + " a granted wish earns " + wd.sparks + " ✨ and a happy memory.", go: function () { fly(wc, 6); setTool("grab", true); } });
    }
    var gr = g.creatures.filter(function (c) { return c.alive && c.species === "grump" && !c.goingHome && smols.some(function (o) { return SB.dist(o.x, o.z, c.x, c.z) < 8; }); })[0];
    if (gr && !(act && act.id === "raid")) out.push({ key: "grump" + gr.id, icon: "👺", t: "a grump is bothering your smols", s: "pick 👆 tap and tap the grump 3 times to chase it off. a campfire keeps them away at night.", go: function () { fly(gr, 7); setTool("tap", true); } });
    var starving = smols.filter(function (c) { return c.chem.hunger > 0.8; });
    if (starving.length >= 2) out.push({ key: "hungry", icon: "🍎", t: starving.length + " smols are starving", s: "✋ carry food to them, or ✨ magic → 🍎 bounty. long term: builders make farms.", go: function () { fly(starving[0], 7); setTool("magic", true); } });
    var sick = smols.filter(function (c) { return c.chem.sick > 0.55; })[0];
    if (sick) out.push({ key: "sick" + sick.id, icon: "🤢", t: sick.name + " is sick", s: "✨ magic → 💚 heal cures it. sick smols pass it on, and herb-lore smols can nurse them.", go: function () { fly(sick, 6); setTool("magic", true); } });
    var egg = g.world.items.filter(function (o) { return o.kind === "egg" && o.data && o.data.wild && o.heldBy == null && (o.data.progress || 0) < 1; })[0];
    if (egg) out.push({ key: "egg" + egg.id, icon: "🥚", t: "a wild egg is out there", s: "✋ carry it home and keep it by the fire or in a hut. a baby from outside your family is gold.", go: function () { fly(egg, 6); setTool("grab", true); } });
    if (!idle) return out;
    // idle: what to do next, and how
    var site = (g.sites || []).filter(function (x) { return !x.gone && !x.found && SB.World.isSeen(g.world, x.x, x.z); })[0];
    if (site) out.push({ key: "site" + site.id, icon: "❓", t: "something's out in the fog", s: "that ? marker is a place nobody's visited. smols explore on their own; ✋ carry one over there to look sooner.", go: function () { fly(site, 9); setTool("grab", true); } });
    var maxT = smols.reduce(function (m, c) { return Math.max(m, c.tier); }, 0);
    if ((g.sparks || 0) >= 20 && !(g.stats.blessed) && maxT < 6) out.push({ key: "bless", icon: "🧬", t: "you've saved up " + Math.floor(g.sparks) + " sparks", s: "spend them: ✨ magic → 🧬 bless makes the next 3 eggs lean toward what you pick. it's the fastest way to evolve.", go: function () { setTool("magic", true); } });
    if (SB.Orders && SB.Orders.unlocked(g) && !SB.Orders.ensure(g).placed) out.push({ key: "orders1", icon: "🚩", t: "your smols can follow orders now", s: maxT >= 2 ? "pick 🚩 orders and put down a 📐 blueprint, a 🪓 work mark or a 🚩 rally flag. they follow if they trust you." : "pick 🚩 orders and put down a 🚩 rally flag: \"go there\". or a 🏠 home zone they drift back to. they follow if they trust you.", btn: "try it", go: function () { setTool("orders", true); } });
    if (maxT >= 2 && (g.stats.wordsTaught || 0) < 6) out.push({ key: "words", icon: "💬", t: "teach more words", s: "every word the whole tribe knows makes everyone learn faster. 💬 talk, pick a word, show it.", go: function () { setTool("talk", true); } });
    if (g.speed === 1 && g.playTime > 600 && !g._spedUp) out.push({ key: "speed", icon: "⏩", t: "waiting for something?", s: "tap ▶ 1× (top right) to speed time up. evolution takes generations.", go: function () { g._spedUp = true; cycleSpeed(1); } });
    var goal = goalsList()[0];
    if (goal) { var how = HOW.filter(function (x) { return x[0].test(goal.t); })[0]; out.push({ key: "goal:" + goal.t.replace(/[:(].*$/, ""), icon: "🎯", t: "next: " + goal.t.replace(/ \(.*$/, ""), s: how ? how[1] : "the next list (top left) tracks it.", go: function () { el.goals.classList.remove("min"); el.goals.classList.add("tutglow"); setTimeout(function () { el.goals.classList.remove("tutglow"); }, 3000); } }); }
    return out;
  }
  function updateGuide(dt) {
    if ((guideT -= dt) > 0) return;
    guideT = 1;
    var on = guideOn() && game.tutorial.done && !state.introRunning && !(SB.Intro && SB.Intro.covering) && !el.modal && !state.sheet;
    var now = performance.now(), tip = on ? guideTips().filter(function (x) { return !(snooze[x.key] > now); })[0] : null;
    if (!tip) { if (el.guide) { el.guide.remove(); el.guide = null; guideKey = ""; } return; }
    if (tip.key === guideKey && el.guide) return;
    guideKey = tip.key;
    if (el.guide) el.guide.remove();
    el.guide = h("div", { class: "guide glass" }, [
      h("div", { class: "gi" }, tip.icon),
      h("div", { class: "gb" }, [h("div", { class: "t" }, tip.t), h("div", { class: "s" }, tip.s)]),
      h("div", { class: "gx" }, [
        h("button", { class: "btn go", onclick: function () { tip.go(); } }, tip.btn || "show me"),
        h("button", { class: "btn", title: "hide this tip for a while", onclick: function () { snooze[tip.key] = performance.now() + 180000; el.guide.remove(); el.guide = null; guideKey = ""; } }, "✕")
      ])
    ]);
    root.appendChild(el.guide);
  }
  UI.guideTips = function () { return guideTips(); };

  function namePrompt(c, twin) {
    var inp = h("input", { type: "text", value: c.name, maxlength: 16, autocapitalize: "words", onkeydown: function (e) { if (e.key === "Enter") ok(); e.stopPropagation(); } });
    var inp2 = twin ? h("input", { type: "text", value: twin.name, maxlength: 16, autocapitalize: "words", onkeydown: function (e) { if (e.key === "Enter") ok(); e.stopPropagation(); } }) : null;
    function clean(v) { return v.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 16); }
    function ok() {
      var n = clean(inp.value), was = [c.name, twin && twin.name];
      if (n) c.name = n;
      if (game.family[c.id]) game.family[c.id].name = c.name;
      if (twin) { var n2 = clean(inp2.value); if (n2) twin.name = n2; if (game.family[twin.id]) game.family[twin.id].name = twin.name; }
      // the log already said "x hatched": use the names you chose
      (game.log || []).forEach(function (e) { if (was[0] && was[0] !== c.name) e.text = e.text.split(was[0]).join(c.name); if (twin && was[1] && was[1] !== twin.name) e.text = e.text.split(was[1]).join(twin.name); });
      SB.Game.unlock(game, "name");
      closeModal();
      SB.Input.follow(c);
      tutAdvance(2);
    }
    var rnd = function (i) { return function () { i.value = SB.makeName(SB.rng((Date.now() + i.value.length * 77) >>> 0), game); }; };
    var body = twin ? h("div", null, [
      h("p", null, game.ngPlus ? "a girl and a boy climbed out of the pod: the great-great-grandkids of your best smols, on a brand new island. what are they called?" : "two little blobs climbed out of the pod: a girl and a boy. the last smols. what are they called?"),
      h("div", { class: "namebox" }, [h("span", { class: "sexi" }, "♀"), inp, h("button", { class: "btn", title: "random name", onclick: rnd(inp) }, "🎲")]),
      h("div", { class: "namebox" }, [h("span", { class: "sexi" }, "♂"), inp2, h("button", { class: "btn", title: "random name", onclick: rnd(inp2) }, "🎲")]),
      h("div", { class: "btnrow" }, [h("button", { class: "btn go", onclick: ok }, "name them")])
    ]) : h("div", null, [h("p", null, "it's a smol! a blob, for now. what's it called?"), h("div", { class: "namebox" }, [inp, h("button", { class: "btn go", onclick: ok }, "name it"), h("button", { class: "btn", title: "random name", onclick: rnd(inp) }, "🎲")])]);
    if (SB.TEST || (SB.FirstNight && SB.FirstNight.active(game))) { ok(); toast("🧪 test mode: the founders keep their names (" + esc(c.name) + (twin ? " & " + esc(twin.name) : "") + ")"); return; }
    modal(twin ? "🐣 the founders" : "🐣 hello, world", body, { sticky: true, now: true });
    setTimeout(function () { try { inp.focus(); inp.select(); } catch (e) { } }, 50);
  }

  var NEED_TEXT = { hunger: "food", tired: "rest", sleepy: "sleep", bored: "something to do", lonely: "company", pain: "healing", fear: "safety", cold: "warmth", hot: "shade", sick: "healing", love: "love", anger: "calm" };

  /* ---------------- strangers ---------------- */
  function strangerCard(c) {
    if (!c.alive || !c.stranger || c.stranger.state !== "waiting") return;
    if (el.modal) { setTimeout(function () { strangerCard(c); }, 3000); return; } // wait for the current card
    autoFly(c.x, c.z, 6, 1.0);
    var t = SB.TIERS[c.tier], s = c.stranger, idea = s.brings && SB.Ideas.BY_ID[s.brings];
    var lines = [
      h("div", { class: "row" }, [avatar(c.look, c.tier), h("div", { style: "flex:1;min-width:0" }, [h("div", { class: "nm" }, (c.sex === "f" ? "♀ " : "♂ ") + c.name), h("div", { class: "sub2", html: '<span class="tierpill" style="color:' + t.color + '">' + t.icon + " " + t.name + "</span> · " + esc(s.trait) }) ])]),
      h("p", null, "a survivor from another escape pod has been living wild. now " + (c.sex === "f" ? "she" : "he") + "'s at the edge of your village, waiting."),
      idea ? h("p", { html: "they know something your smols don't: <b class='lime'>" + idea.icon + " " + esc(idea.name) + "</b>." }) : null,
      h("p", { class: "note" }, "not related to anyone in your tribe, so they could start a family. " + (s.trait === "grumpy" ? "a bit grumpy, though." : s.trait === "hungry" ? "they look hungry: one more mouth to feed." : "")),
      h("div", { class: "btnrow" }, [
        h("button", { class: "btn go", onclick: function () { closeModal(); SB.Strangers.decide(game, c, true); } }, "🏠 welcome them"),
        h("button", { class: "btn", onclick: function () { closeModal(); SB.Strangers.decide(game, c, false); } }, "send them away")
      ])
    ];
    modal("🧳 a stranger approaches", h("div", null, lines), { sticky: true });
  }

  /* ---------------- the storyteller (director.js) ---------------- */
  function incidentCard(inc) {
    if (!inc || inc.phase !== "ask") return;
    if (el.modal || (SB.Possess && SB.Possess.active)) { setTimeout(function () { incidentCard(inc); }, 2500); return; }
    if (inc.x != null && inc.id !== "pod") autoFly(inc.x, inc.z, 9, 1.0);
    var body = h("div", { class: "incident" }, [
      h("div", { class: "story" }, [h("div", { class: "icon" }, inc.icon), h("h3", null, inc.title)]),
      h("div", null, inc.text.map(function (p) { return h("p", null, p); })),
      h("div", { class: "choices" }, inc.choices.map(function (c) {
        var poor = c.cost && (game.sparks || 0) < c.cost;
        return h("button", { class: "choice" + (poor ? " poor" : ""), onclick: function () {
          if (poor) { toast("not enough sparks ✨ (" + c.cost + " needed)"); return; }
          if (SB.Director.choose(game, inc, c.key)) closeModal();
        } }, [h("span", { class: "cl" }, c.label), c.cost ? h("span", { class: "cc" }, "✨" + c.cost) : null, h("span", { class: "ch" }, c.hint)]);
      }))
    ]);
    modal("", body, { story: true, sticky: true });
    if (SB.Audio && SB.Audio.play) try { SB.Audio.play(inc.id === "raid" || inc.id === "storm" ? "alert" : "chime"); } catch (e) {}
  }
  UI.incidentCard = incidentCard;
  function incidentStatus(inc) {
    var t = Math.max(0, Math.ceil(inc.t1 - game.time)), mm = Math.floor(t / 60) + ":" + ("0" + t % 60).slice(-2);
    if (inc.phase === "warn") return inc.id === "raid" ? "👺 grumps arrive in " + mm : inc.id === "storm" ? "⛈ storm in " + mm : inc.icon + " " + mm;
    if (inc.phase !== "on") return "";
    switch (inc.id) {
      case "raid": return "👺 raid! " + (inc.left == null ? inc.n : inc.left) + " grump" + (inc.left === 1 ? "" : "s") + " left";
      case "storm": return "⛈ storm overhead";
      case "sick": return "🤧 the sniffles are going round";
      case "star": return "👣 explorers heading for the crater";
      case "feud": return "🥊 the fight is on!";
      case "pod": return "🧭 rescue party on the way";
      case "lost": var k = SB.Game.byId(game, inc.kid); return "🦋 " + (k ? k.name : "a kid") + " is lost";
      case "feast": return "🎉 feast!";
    }
    return inc.icon + " " + inc.title;
  }
  function incidentWhere(inc) {
    if (inc.id === "raid" && inc.raiders) { var g = inc.raiders.map(function (id) { return SB.Game.byId(game, id); }).filter(function (c) { return c && c.alive; })[0]; if (g) return g; }
    if (inc.id === "lost") { var k = SB.Game.byId(game, inc.kid); if (k) return k; }
    if (inc.id === "feud") { var a = SB.Game.byId(game, inc.a); if (a) return a; }
    return inc;
  }
  var alertT = 0;
  function updateAlert(dt) {
    if ((alertT -= dt) > 0) return;
    alertT = 0.25;
    var inc = game.dir && game.dir.active, txt = inc ? incidentStatus(inc) : "";
    if (!el.alert) { el.alert = h("button", { class: "alert hide", onclick: function () { var i = game.dir && game.dir.active; if (i) { var p = incidentWhere(i); if (p && p.x != null) R.flyTo(p.x, p.z, 9, 0.8); } } }); root.appendChild(el.alert); }
    if (el.alert._t !== txt) { el.alert._t = txt; el.alert.textContent = txt; el.alert.classList.toggle("hide", !txt); el.alert.classList.toggle("bad", !!inc && (inc.id === "raid" || inc.id === "storm")); }
  }

  /* ---------------- while you were away ---------------- */
  UI.awayScreen = function (g, awaySec, budget) {
    var bar = h("i", { style: "width:0%" });
    var body = h("div", null, [h("p", null, "you were gone " + fmtTime(awaySec) + ". the island kept going…"), h("div", { class: "prog" }, bar), h("p", { class: "note" }, "simulating " + fmtTime(budget) + " of smol life")]);
    modal("🌙 while you were away", body, { sticky: true, now: true });
    SB.Game.runOffline(g, budget, function (p) { bar.style.width = Math.round(p * 100) + "%"; }, function (rep) {
      var lines = [];
      if (rep.hatched) lines.push("🐣 " + rep.hatched + " hatched");
      if (rep.deaths) lines.push("🕊 " + rep.deaths + " passed on");
      if (rep.words) lines.push("💬 " + rep.words + " words learned");
      if (rep.ideas) lines.push("💡 " + rep.ideas + " new ideas");
      if (rep.built) lines.push("🛖 " + rep.built + " things built");
      if (rep.species) lines.push("🧬 " + rep.species + " new species");
      if (rep.villages) lines.push("🏘 " + rep.villages + " new villages");
      if (rep.gens) lines.push("👪 " + rep.gens + " new generations");
      if (rep.tier != null) lines.push(SB.TIERS[rep.tier].icon + " evolved into " + SB.TIERS[rep.tier].name + "s!");
      if (rep.sparks > 0) lines.push("✨ +" + rep.sparks + " sparks");
      var b2 = h("div", null, [h("p", null, lines.length ? "while you were away:" : "a quiet time. everyone napped."), h("div", { class: "chips" }, lines.map(function (l) { return h("span", { class: "chip lime" }, l); })), rep.log && rep.log.length ? h("div", { class: "note", html: rep.log.slice(-6).map(esc).join("<br>") }) : null, h("div", { class: "btnrow" }, h("button", { class: "btn go", onclick: closeModal }, "see them"))]);
      modal("🌅 welcome back", b2);
    });
  };

  /* ---------------- civilisation card ---------------- */
  UI.civCard = function () { closeModal(); setTimeout(civCard, 50); };
  // after the ending: what you made, and what next (keep this island, or new game+ with your best two)
  function endCard() {
    function pl(n, w) { return n + " " + w + (n === 1 ? "" : "s"); }
    var g = game, s = g.stats, days = Math.floor(g.time / SB.DAY_LENGTH) + 1, ideas = Object.keys(g.culture.found).length;
    var champs = SB.Game.champions(g), names = champs.map(function (c) { return "<b>" + esc(c.name) + "</b>"; }).join(" and ");
    var mins = Math.round((g.playTime || 0) / 60), lvl = (g.ngPlus || 0) + 1;
    var body = h("div", { class: "story" }, [
      h("div", { class: "icon" }, "🌟"), h("h3", null, "you raised a civilisation"),
      h("p", { html: "from one cold egg to the stars: <b>" + pl(days, "day") + "</b>, <b>" + pl(s.maxGen || 1, "generation") + "</b>, <b>" + pl(ideas, "idea") + "</b>, " + pl(s.hatched, "smol") + " hatched, " + pl(s.built || 0, "building") + ", " + pl(s.prayersAnswered || 0, "prayer") + " answered" + (mins ? ", in " + fmtTime(mins * 60) + " of your time" : "") + "." }),
      h("p", { html: "score <b>" + SB.Game.score(g) + "</b>" + (g.ngPlus ? " · new game+ " + g.ngPlus : "") + ". the smols who stayed get a lasting boost: they all think faster now." }),
      h("p", { html: champs.length ? "<b>new game+</b>: a new island, harder storyteller, and " + names + "'s descendants in the pod. they keep their looks and personalities, but start again as tool-users." : "" }),
      h("div", { class: "btnrow" }, [
        h("button", { class: "btn", onclick: function () { closeModal(); } }, "keep playing"),
        h("button", { class: "btn", onclick: function () { UI.civCard(); } }, "🪪 share"),
        champs.length ? h("button", { class: "btn go", onclick: function () { closeModal(); try { SB.Save.save(g); } catch (e) {} var ng = SB.Game.newGamePlus(g, SB.newSeed()); SB.Game.swap(ng); UI.init(ng, { fresh: true }); } }, "🌱 new game+" + (lvl > 1 ? " " + lvl : "")) : null
      ])
    ]);
    modal("", body, { story: true, sticky: true, now: true });
  }
  UI.endCard = endCard;
  function civCard() {
    SB.Game.unlock(game, "card");
    // frame the tribe's home for the photo, then put the camera back
    var cam = R.camera, keep = { x: cam.x, z: cam.z, zoom: cam.zoom, tZoom: cam.tZoom, follow: cam.follow, y: cam.y };
    var home = SB.Society.home(game, 0);
    if (cam.zoom > 22 || SB.dist(cam.x, cam.z, home.x, home.z) > 40) { cam.follow = null; cam.x = home.x; cam.z = home.z; cam.zoom = cam.tZoom = 11; cam.y = SB.World.heightAt(game.world, home.x, home.z); }
    R.updateCamera(0);
    var shot = R.snapshot("image/jpeg");
    cam.x = keep.x; cam.z = keep.z; cam.zoom = keep.zoom; cam.tZoom = keep.tZoom; cam.follow = keep.follow; cam.y = keep.y;
    var cv = document.createElement("canvas"); cv.width = 1080; cv.height = 1350;
    var ctx = cv.getContext("2d");
    ctx.fillStyle = "#101114"; ctx.fillRect(0, 0, 1080, 1350);
    var img = new Image();
    img.onload = function () {
      // cover-crop the snapshot into the top area
      var tw = 1080, th = 760, s = Math.max(tw / img.width, th / img.height), iw = img.width * s, ih = img.height * s;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, tw, th); ctx.clip();
      ctx.imageSmoothingEnabled = !R.pixel; // pixel art scales up crisp
      ctx.drawImage(img, (tw - iw) / 2, (th - ih) / 2, iw, ih); ctx.restore(); ctx.imageSmoothingEnabled = true;
      var gr = ctx.createLinearGradient(0, th - 200, 0, th); gr.addColorStop(0, "rgba(16,17,20,0)"); gr.addColorStop(1, "#101114");
      ctx.fillStyle = gr; ctx.fillRect(0, th - 200, tw, 200);
      finish();
    };
    img.onerror = finish;
    if (shot) img.src = shot; else finish();
    function finish() {
      var s = game.stats, tribe = game.tribes && game.tribes[0] && game.tribes[0].name, maxT = SB.TIERS[s.maxTier || 0];
      ctx.fillStyle = "#c5ff49"; ctx.font = "800 34px ui-monospace, monospace"; ctx.textAlign = "left";
      ctx.fillText("smol brains", 60, 70);
      ctx.fillStyle = "#f5f3ed"; ctx.font = "800 64px ui-monospace, monospace";
      ctx.fillText(tribe || "my smols", 60, 840);
      ctx.font = "600 30px system-ui"; ctx.fillStyle = "rgba(245,243,237,0.7)";
      ctx.fillText("world " + SB.worldCode(game.seed) + " · day " + SB.World.clock(game.world).day, 60, 890);
      var rows = [[maxT.icon, maxT.name, "highest tier"], ["👪", s.maxGen, "generations"], ["💡", Object.keys(game.culture.found).length, "ideas"], ["🧬", SB.Species.count(game), "species"], ["🏘", game.villages.length, "villages"], ["🧠", s.bestIQ, "best iq"]];
      rows.forEach(function (r, i) {
        var x = 60 + (i % 3) * 330, y = 960 + Math.floor(i / 3) * 150;
        ctx.fillStyle = "#17181d"; roundRect(ctx, x, y, 300, 128, 24); ctx.fill();
        ctx.font = "44px system-ui, apple color emoji"; ctx.textBaseline = "middle"; SB.Icons.fillText(ctx, r[0], x + 22, y + 60, 42); ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#c5ff49"; ctx.font = "800 40px ui-monospace, monospace"; ctx.fillText(String(r[1]).slice(0, 10), x + 90, y + 62);
        ctx.fillStyle = "rgba(245,243,237,0.6)"; ctx.font = "600 24px system-ui"; ctx.fillText(r[2], x + 90, y + 100);
      });
      ctx.fillStyle = "#b59aff"; ctx.font = "800 26px ui-monospace, monospace";
      ctx.fillText("computercooked.com/games/smol-brains", 60, 1300);
      var url = cv.toDataURL("image/png");
      var im = h("img", { src: url, style: "width:100%;border-radius:14px;display:block" });
      var body = h("div", null, [im, h("div", { class: "btnrow" }, [
        h("button", { class: "btn go", onclick: function () { shareCard(cv); } }, "📤 share"),
        h("a", { class: "btn", href: url, download: "smol-civilisation.png" }, "⬇ download"),
        h("button", { class: "btn", onclick: function () { copy("https://computercooked.com/games/smol-brains/play/?world=" + SB.worldCode(game.seed), "world link copied"); } }, "🌱 copy world link")
      ])]);
      modal("🪪 my civilisation", body);
    }
  }
  function shareCard(cv) {
    SB.Game.unlock(game, "share");
    var text = "my smols reached " + SB.TIERS[game.stats.maxTier || 0].name + " on world " + SB.worldCode(game.seed) + ". smol brains on computer cooked games";
    if (cv.toBlob && navigator.canShare) {
      cv.toBlob(function (blob) {
        try {
          var file = new File([blob], "smol-civilisation.png", { type: "image/png" });
          if (navigator.canShare({ files: [file] })) { navigator.share({ files: [file], text: text, title: "smol brains" }).catch(function () {}); return; }
        } catch (e) { }
        copy(text, "caption copied. download the image to post it.");
      });
    } else copy(text, "caption copied. download the image to post it.");
  }
  function roundRect(ctx, x, y, w, hh, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + hh, r); ctx.arcTo(x + w, y + hh, x, y + hh, r); ctx.arcTo(x, y + hh, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  /* ---------------- bus ---------------- */
  /* ---------------- the first hour: wishes, the hatch reveal, big tier moments ---------------- */
  var TIER_SHOUT = { 1: "LEGS!", 2: "HANDS!", 3: "WORDS!", 4: "PLANS!", 5: "BIG BRAINS!", 6: "ASCENDED!" };
  var revealEl = null, revealSkip = 0;
  function hatchReveal(c, d) {
    var FH = SB.FirstHour, why = d.why || [], ps = (d.parents || []).map(function (id) { return SB.Game.byId(game, id) || (game.family[id] ? { name: game.family[id].name } : null); }).filter(Boolean);
    if (revealEl) revealEl.remove();
    var from = d.pTier || 0, to = FH.tierProgress(c.genome), nx = SB.TIERS[c.tier + 1];
    var bar = h("i", { style: "width:" + Math.round(from * 100) + "%" });
    revealEl = h("div", { class: "fhhatch glass", onclick: function () { SB.Game.select(game, c.id); if (revealEl) { revealEl.remove(); revealEl = null; } } }, [
      h("div", { class: "row" }, [avatar(c.look, c.tier), h("div", { style: "flex:1;min-width:0" }, [h("div", { class: "nm" }, "🐣 " + c.name + " hatched!"), h("div", { class: "sub2" }, ps.length ? "child of " + ps.map(function (p) { return p.name; }).join(" & ") + " · gen " + c.gen : "gen " + c.gen)])]),
      h("div", { class: "fhwhy" }, why.length ? why.map(function (w) { return h("div", { class: w.d >= 0 ? "up" : "dn" }, FH.reasonText(w)); }) : [h("div", { class: "dim" }, "just like its parents, this time")]),
      nx ? h("div", { class: "fhbar" }, [h("span", null, "next: " + nx.icon + " " + nx.name), h("span", { class: "b" }, [bar]), h("span", { class: "mono" }, Math.round(to * 100) + "%")]) : null
    ]);
    root.appendChild(revealEl);
    var me = revealEl;
    setTimeout(function () { bar.style.width = Math.round(to * 100) + "%"; }, 60);
    setTimeout(function () { if (me.parentNode) me.classList.add("out"); }, 2400);
    setTimeout(function () { if (me.parentNode) me.remove(); if (revealEl === me) revealEl = null; }, 2900);
  }
  function wireFirstHour(on) {
    if (!SB.FirstHour) return;
    on("hatch", function (d) {
      var dd = d.obj && d.obj.data;
      if (!dd || dd.starter || !(dd.parents || []).length || d.c.far || state.introRunning || revealSkip === d.c.id) return;
      hatchReveal(d.c, dd);
    });
    on("tierUp", function (d) {
      revealSkip = d.c.id; // the evolution card says it bigger
      var seen = (game.settings && game.settings.cards) || {};
      if (TIER_SHOUT[d.tier] && !seen["tier" + d.tier] && !(game.settings && game.settings.guide === false)) moment(SB.TIERS[d.tier].icon, TIER_SHOUT[d.tier], d.c.name + " is the first " + SB.TIERS[d.tier].name + "!", "lilac");
    });
    on("wish", function (d) {
      storyCard("wish", "💭", "a wish!", [
        "<b>" + esc(d.c.name) + "</b> is wishing for " + esc(SB.FirstHour.WISHES[d.w.kind].text) + ". little smols can't pray yet, but they can hope the sky notices.",
        "grant it with ✋ the hand: carry food or a toy over, bring a friend, carry them to the fire. you can even grab a tree and wiggle it to shake fruit down.",
        "a granted wish earns ✨ sparks and the smol remembers that the sky one helped."
      ]);
    });
    on("wishGranted", function (d) {
      if (SB.FX) SB.FX.burst("hearts", d.c.x, d.c.y + 0.8, d.c.z, 6);
      toast("💭 wish granted! <b>" + esc(d.c.name) + "</b> got " + esc(SB.FirstHour.WISHES[d.w.kind].text) + " · +" + d.sparks + " ✨");
      if (SB.Audio && SB.Audio.play) try { SB.Audio.play("chime"); } catch (e) {}
    });
    on("handShake", function (d) { if (d.o && SB.Audio && SB.Audio.play) try { SB.Audio.play("pop"); } catch (e) {} });
  }

  var wired = false;
  function wireBus() {
    if (wired) return;
    wired = true;
    var on = SB.bus.on;
    wireFirstHour(on);
    on("note", function (d) { toast(esc(d.text)); });
    on("achievement", function (d) { toast(d.a.icon + " <b>" + esc(d.a.name) + "</b> · " + esc(d.a.desc), "ach", 5000); });
    on("hatch", function (d) {
      if (d.obj && d.obj.data && d.obj.data.starter) {
        var tw = d.obj.data.twin;
        game.tutorial.step = 1; tutShow();
        R.flyTo(d.c.x + 0.3, d.c.z, 3.6, 1.2); // close-up: the founders climb out
        d.c.speech = { text: "bi!", t: 2, kind: "say" };
        if (tw) setTimeout(function () { tw.speech = { text: "ba!", t: 2, kind: "say" }; if (SB.Audio) SB.Audio.voice("ba", 0.7); }, 600);
        if (SB.Audio) SB.Audio.voice("bi", 0.6);
        setTimeout(function () { namePrompt(d.c, tw); }, 2200);
      }
      if (SB.FX) SB.FX.burst("sparkle", d.c.x, d.c.y + 0.4, d.c.z, 18);
    });
    on("eat", function (d) { if (d.c.species === "smol") tutDone("food"); if (SB.FX && !d.c.far) SB.FX.burst("crumbs", d.c.x, d.c.y + 0.3, d.c.z, 5); });
    on("tickle", function () { tutDone("tickle"); });
    on("trickLearned", function (d) {
      if (d.first) {
        moment("🎓", d.c.name + " learned a trick!", d.trick.icon + " " + d.trick.name + " · +" + SB.Tricks.PAY + " ✨");
        if (SB.FX && !d.c.far) SB.FX.burst("stars", d.c.x, d.c.y + 0.8, d.c.z, 16);
        if (SB.Audio && SB.Audio.play) SB.Audio.play("chime");
      } else toast("🎓 " + esc(d.c.name) + " remembers how to " + esc(d.trick.name) + " again");
      tutDone("trick");
    });
    var waitT = 0;
    on("possess", function () { el.heldSheet = state.sheet && state.sheet !== "smol" ? state.sheet : null; if (state.sheet) closeSheet(); });
    on("unpossess", function (d) { var k = el.heldSheet; el.heldSheet = null; if (k && d.why !== "died") setTimeout(function () { if (!(SB.Possess && SB.Possess.active) && !state.sheet) openSheet(k); }, 450); });
    on("possess", function () { if (el.modal && el.modalArgs && !(el.modalOpts && el.modalOpts.pov)) { var a = el.modalArgs; closeModal(); povHeld.unshift([a[0], a[1], Object.assign({}, a[2], { resume: true })]); } }); // hidden in first person, it paused the island (K-0037 "freeze")
    on("knockout", function (d) { toast("💫 <b>" + esc(d.c.name) + "</b> was knocked out" + (d.items.length ? " and dropped what it carried" : "") + ". your light needs " + (SB.Possess ? SB.Possess.KO_COOLDOWN : 30) + " s to gather itself.", "", 7000); });
    on("ember", function (d) {
      var g = SB.Game.current; if (!g || g.offline) return;
      var html = "🔥 <b>memory ember +1</b>: " + esc(d.why) + (d.next ? " <span class=\"dim\">(" + d.n + " of " + d.next + ")</span>" : "");
      (function show() { if (SB.Lantern && SB.Lantern.running) return setTimeout(show, 1500); toast(html, "ember", 5500); if (el.lantern) { el.lantern.classList.remove("pulse"); void el.lantern.offsetWidth; el.lantern.classList.add("pulse"); } })();
    });
    on("lantern", function (d) {
      var g = SB.Game.current; if (!g || !d.stage || g.offline) return; // stage 0 is the first night's ember
      if (SB.Game.note && d.stage < SB.Embers.STAGES.length) SB.Game.note(g, "🏮 the Lantern caught: stage " + d.stage + ". the nights are a little less dark."); // (sparks: embers.js)
    });
    on("lanternShown", function (d) {
      var g = SB.Game.current; if (!g) return;
      if (d.stage >= SB.Embers.STAGES.length) toast("🌅 <b>the Hollow wakes</b> · the grumps remembered their names and went home. no more grump nights. +" + 10 * d.stage + " ✨. the island is yours to keep.", "ach", 10000);
      else toast("🏮 <b>the Lantern: stage " + d.stage + "</b> · nights are less dark, +" + 10 * d.stage + " ✨. next stage at " + (SB.Embers.next(g) || "—") + " embers.", "ach", 7000);
    });
    on("trickNudge", function (d) { if (!d.c.far) float(d.c, "👀 hmm?", "wait"); toast("👀 <b>" + esc(d.c.name) + "</b> is thinking about it…", "", 4000); });
    on("trickNoBite", function (d) {
      toast("🤷 <b>" + esc(d.c.name) + "</b> isn't biting: " + esc(d.why) + ". press <b>set it up</b> to try again" + (/hungry/.test(d.why) ? ", or wait till it's hungrier" : "") + ".", "", 7000);
      if (trCue.c === d.c) trCue.c = null;
      if (state.sheet === "tricks") renderTricks(true);
    });
    on("trickWait", function (d) {
      if (performance.now() - waitT < 1800) return;
      waitT = performance.now();
      float(d.c, "wait for it…", "wait");
      toast("⏳ not yet: 🪶 tickle " + esc(d.c.name) + " while it " + trickVerb(d.trick) + ", not before.", "", 2600);
    });
    on("trickDelta", function (d) {
      var n = Math.round((d.to - d.from) * 100);
      if (n) float(d.c, (n > 0 ? "+" : "") + n + "%", n > 0 ? "up" : "down");
    });
    on("trickForgot", function (d) { toast("💭 " + esc(d.c.name) + " forgot how to " + esc(d.trick.name) + ". lessons can undo each other."); });
    on("questDone", function (d) { toast("✅ <b>" + esc(d.q.t) + "</b> · +" + d.q.pay + " ✨", "ach", 4500); if (SB.Audio && SB.Audio.play) SB.Audio.play("chime"); goalKey = ""; });
    on("chapterDone", function (d) { moment("📖", "chapter " + (d.ch.i + 1) + " done!", (d.next ? "next: " + d.next.name : "every chapter finished") + " · +" + d.ch.bonus + " ✨", "", true); goalKey = ""; });
    on("learnWord", function (d) {
      if (d.c.species !== "smol") return;
      if (game.stats.wordsTaught === 1) moment("💬", "first word!", "“" + d.word + "!” " + d.c.name + " learned a word. you did that.");
      tutDone("word");
    });
    on("eureka", function (d) {
      if (SB.FX) SB.FX.burst("stars", d.c.x, d.c.y + 0.9, d.c.z, 20);
      if (!d.first) return;
      var idea = SB.Ideas.BY_ID[d.id], fb = [idea.icon, idea.name + "!", d.c.name + " figured it out. they call it “" + d.word + "”"];
      storyCard("idea", idea.icon, d.c.name + " invented " + idea.name + "!", [
        "nobody showed them. " + esc(d.c.name) + " was fiddling with things and it clicked. they call it <b>“" + esc(d.word) + "”</b>.",
        "<b>ideas live in heads.</b> other smols learn them by watching, or by being taught. if everyone who knows an idea dies, it's gone.",
        "you can speed inventing up with ✨ magic → 💡 inspire. the 💡 ideas tab in the menu tracks what your smols know."
      ], fb);
    });
    var brawlT = 0;
    on("brawl", function (d) {
      if (SB.FX) SB.FX.burst("crumbs", d.b.x, d.b.y + 0.5, d.b.z, 10, { col: [0.9, 0.85, 0.7] });
      storyCard("brawl", "👊", "a brawl!", ["<b>" + esc(d.a.name) + "</b> and <b>" + esc(d.b.name) + "</b> can't stand each other, and it came to blows.",
        "smols remember who hit them, who shared food, who taught them things. tap a smol and open 📜 story to see who they love and who they've got a grudge against, and why.",
        "a gift of food mends a grudge. 👆 tap scolds a bully."], ["👊", "brawl!", esc(d.a.name) + " vs " + esc(d.b.name)]);
      if (performance.now() - brawlT > 20000) { brawlT = performance.now(); toast("👊 " + esc(d.a.name) + " and " + esc(d.b.name) + " are fighting!"); }
    });
    on("tantrum", function (d) { toast("😤 " + esc(d.c.name) + " is throwing a tantrum!"); });
    on("title", function (d) { toast("🏆 " + esc(d.c.name) + " is now known as <b>" + esc(d.c.name) + " the " + esc(d.title) + "</b>", "ach"); });
    on("inspired", function (d) { if (!d.c.far) toast("💡 " + esc(d.c.name) + " feels inspired! ideas come faster for a minute."); });
    on("convo", function (d) {
      if (d.a.tier >= 4 && !d.argue) storyCard("convo", "💬", "they're talking", ["your smols are clever enough now for real conversations: gossip, ideas, the weather, the sky, the ones they miss.",
        "gossip spreads opinions: if one smol tells another that someone's a grump, the listener starts to think so too. ideas spread this way as well."]);
    });
    on("death", function (d) {
      if (d.c.species !== "smol" || d.c.stranger) return;
      // a founder's death is a moment, not a footnote
      if (d.c.gen === 1 && !(d.c.parents || []).length) {
        var f = game.family[d.c.id], kids = f && f.kids ? f.kids.length : 0, days = Math.max(1, Math.round((game.time - (f ? f.born : game.time)) / SB.DAY_LENGTH));
        moment("🕯", "farewell, " + d.c.name, "a founder of your tribe. " + days + (days === 1 ? " day" : " days") + ", " + kids + (kids === 1 ? " kid" : " kids") + ". everyone here comes from them.", "lilac");
        autoFly(d.c.x, d.c.z, Math.min(R.camera.tZoom, 9), 1.4);
      }
      storyCard("grave", "🕯", "goodbye, " + esc(d.c.name), ["when a smol dies, its body stays where it fell (look for the 🕯). in a little while the tribe gathers to say goodbye, the way their culture knows how.",
        "early smols float their dead down the river to the sea. once they know fire, they give them to the flames. builders dig a grave at a favourite place, with an epitaph you can tap to read.",
        "friends and family grieve for a while: they get lonely and slow, and visit the place. a tickle comforts them. the 📜 chronicle in the menu remembers everyone."]);
    });
    on("stranger", function (d) { setTimeout(function () { strangerCard(d.c); }, 400); });
    on("podCrash", function (d) { podQ.push(d.site); if (podQ.length === 1) setTimeout(nextPod, 300); });
    on("funeral", function (d) {
      var how = { river: "carrying " + (d.n > 1 ? "them" : "the body") + " to the water", pyre: "gathering for a pyre", burial: "digging a grave", cairn: "piling stones" }[d.rite];
      toast("🕯 the smols are planning a funeral for <b>" + esc(d.names) + "</b>: " + how + ".", "", 6000);
    });
    on("funeralDone", function (d) { moment("🕯", "goodbye, " + d.names, "the tribe " + d.how + ".", "sad"); });
    on("podOpened", function (d) {
      if (d.self) { toast("🛸 " + esc(d.title) + (d.survivors.length ? ": " + d.survivors.map(function (c) { return esc(c.name); }).join(" and ") + " went looking for the village." : "")); if (d.log) cardQ.push(["🛸", "a log from the pod", ['<span class="podlog">' + esc(d.log) + "</span>"]]); if (!el.modal) nextCard(); return; }
      var paras = d.text.map(esc);
      if (d.log) paras.push('<span class="podlog">' + esc(d.log) + "</span>");
      cardQ.push([d.icon, esc(d.title), paras]);
      if (!el.modal) nextCard();
      d.survivors.forEach(function (c) { if (SB.FX) SB.FX.burst("sparkle", c.x, c.y + 0.6, c.z, 10); });
      if (SB.Audio && SB.Audio.play) try { SB.Audio.play("hatch"); } catch (e) {}
    });
    on("siteFound", function (d) {
      var paras = d.text.map(esc);
      if (d.log) { paras.push('<span class="podlog">' + esc(d.log) + "</span>"); cardQ.push([d.icon, esc(d.title), paras]); if (!el.modal) nextCard(); }
      else {
        var cards = (game.settings = game.settings || {}).cards || {}, again = !!cards["site_" + d.site.kind];
        storyCard("site_" + d.site.kind, d.icon, esc(d.title), paras, [d.icon, d.title, "", "lilac"]); // the first of each kind gets a card, later ones a moment and a note
        if (again) toast(d.icon + " " + esc(d.text.join(" ")));
      }
      if (SB.Audio && SB.Audio.play) try { SB.Audio.play("chime"); } catch (e) {}
    });
    on("incident", function (d) { setTimeout(function () { incidentCard(d.inc); }, 300); });
    on("incidentNote", function (d) { toast(esc(d.inc.note)); });
    on("nursed", function (d) { if (!d.c.far || game.selectedId === d.c.id || game.selectedId === d.p.id) toast("🌿 <b>" + esc(d.c.name) + "</b> nursed <b>" + esc(d.p.name) + "</b> back to health."); });
    on("incidentEnd", function (d) { if (!d.text) return; toast(d.inc.icon + " " + esc(d.text), d.ok && (d.inc.id === "raid" || d.inc.id === "star") ? "ach" : ""); if (d.inc.id === "raid" && d.ok && d.inc.choice === "fight") moment("🏏", "raid broken!", "the village fought them off"); });
    on("strangerLeft", function (d) { toast(esc(d.c.name) + (d.auto ? " gave up waiting and walked back into the wild." : " walks back into the wild.")); });
    on("kin", function (d) { storyCard("kin", "👪", "family can't have kids together", [
      esc(d.a.name) + " and " + esc(d.b.name) + " are in love, but they're family. <b>parents, brothers and sisters, and cousins can't have kids together.</b>",
      "your tribe needs newcomers: wild eggs, and strangers from the other escape pods who sometimes walk up to the village. welcome them in."
    ]); });
    on("spoiled", function () {
      storyCard("spoiled", "🍬", "your smols are getting spoiled", [
        "food keeps falling from the sky, so they've stopped looking for it. peckish smols now just <b>sit and wait for you</b>, and they're slower to learn new things.",
        "it wears off if you let them fend for themselves for a while. help when they're really hungry, or when they pray: that's what miracles are for."
      ], ["🍬", "spoiled!", "too many handouts: they wait for food from the sky"]);
    });
    on("sharedWord", function (d) {
      if (d.n === 1) storyCard("shared", "💬", "your tribe shares a word", [
        "most of your smols now know the same word. <b>shared words make every smol smarter</b> (+3% learning each), and they can be called with 📣 in the word book.",
        "smols teach each other words when they chat, so a talkative tribe gets clever fast."
      ], ["💬", "shared word!", "the whole tribe gets a little smarter"]);
      else toast("💬 " + d.n + " shared words: the tribe learns " + Math.round(SB.Words.smarts(game) * 100) + "% faster");
    });
    on("tierUp", function (d) {
      var t = SB.TIERS[d.tier], nx = SB.TIERS[d.tier + 1];
      if (SB.FX) SB.FX.burst("gold", d.c.x, d.c.y + 0.6, d.c.z, 30);
      autoFly(d.c.x, d.c.z, 6, 1.2);
      var need = SB.Genome.nextNeeds(d.c.genome).map(function (n) { return n.label; }).slice(0, 2).join(" + ");
      setTimeout(function () {
        storyCard("tier" + d.tier, t.icon, "evolution: " + esc(d.c.name) + " is a " + t.name + "!", [
          "<b>" + esc(d.c.name) + "</b> hatched different from its parents: " + t.desc,
          "<b>why?</b> babies get a mix of their parents' genes plus small mutations. and what parents <i>do</i> echoes into their kids: smols that walk a lot have kids with longer legs, smols that fiddle with things have kids with hands.",
          TIER_NEW[d.tier] || "",
          nx ? "<b>next: " + nx.icon + " " + nx.name + "</b>" + (need ? " (needs more " + esc(need) + ")" : "") + ". " + (NEXT_HELP[d.tier] || "") : ""
        ], [t.icon, "evolution: " + t.name, d.c.name + " is the first " + t.name + ". " + t.desc, "lilac"]);
      }, 1300);
    });
    on("egg", function (d) {
      if (!d.obj || !d.obj.data || !d.obj.data.parents || !d.obj.data.parents.length) return;
      var ps = d.obj.data.parents.map(function (id) { var p = SB.Game.byId(game, id); return p ? p.name : "?"; });
      storyCard("egg", "🥚", "an egg!", [
        "<b>" + esc(ps.join(" and ")) + "</b> fell in love and laid an egg. grown-up smols do that when they're fed, healthy and happy (and the colony isn't going hungry).",
        "it hatches in a couple of minutes. tap it to warm it, or keep it near a fire or in a hut to speed it up.",
        "the baby gets a mix of its parents' genes, and a nudge from how they lived. that's evolution: generation by generation, your smols change."
      ]);
    });
    on("harvest", function () {
      storyCard("harvest", "🌾", "the first harvest", ["a farm ripened. farms grow grain, sunroots or gourds every couple of minutes, all by themselves, faster in the rain and near a windmill.", "grain keeps for ages: it's what gets a colony through winter. more smols need more farms, and builders will make them when food runs short."]);
    });
    on("death", function (d) {
      if (d.c.species !== "smol" || d.cause === "old") return;
      if (d.cause === "starved") storyCard("starved", "🍂", esc(d.c.name) + " starved", ["there wasn't enough food nearby. smols forage on their own, but a big colony can outgrow the land around it, especially in winter.", "what helps: ✨ magic → 🍎 bounty in a pinch; long-term, smols that reach <b>builder</b> make farms. smols also stop having babies when food is short, so it evens out."]);
      else if (d.cause === "drowned") storyCard("drowned", "🌊", esc(d.c.name) + " drowned", ["smols without fins can't swim. dropped (or wandered) into deep water, they paddle for the shore and drown if it's too far.", "if you see one splashing, ✋ grab it and pull it out. smols that spend time in shallow water have kids with fins, eventually."]);
    });
    on("newSpecies", function (d) { if (d.c.tier === (game.stats.maxTier || 0) && d.clade.why === "tier") return; toast("🧬 new species: <b>" + esc(d.clade.name) + "</b>", "ach"); });
    on("village", function (d) { moment("🏘", d.village.name, "a village is born"); });
    on("era", function (d) { var E = SB.Civ.ERAS[d.era]; if (d.up) moment(E.icon, "a " + E.name + "!", E.desc, "era", true); else moment("💔", "back to a " + E.name, "the " + SB.Civ.ERAS[d.from].name + " fell apart. win it back: " + eraMissing(), "era", true); });
    on("law", function (d) { toast("📜 new law: <b>" + esc(d.law.text) + "</b>" + (d.law.misread ? " <span class='dim'>(misread?)</span>" : ""), "", 6000); });
    on("coup", function (d) { moment("😠", "a coup!", d.c.name + " threw " + d.old.name + " out of the council"); });
    on("marketDay", function () { toast("🏪 market day! the smols gather at the stalls"); });
    on("song", function (d) { if (!SB.Intro || !SB.Intro.covering) toast("♪ <i>" + esc(d.title) + "</i>", "song", 3200); });
    on("season", function (d) {
      var S = { spring: ["🌸", "spring", "blossoms, rain showers, baby bunnies. everything grows fast."], summer: ["🌞", "summer", "long warm days, thunderstorms, and fireflies at night."], autumn: ["🍂", "autumn", "falling leaves and big harvests. stock up: winter is next."], winter: ["❄️", "winter", "snow, frozen ponds, and slow-growing food. keep your smols warm by the fire."] }[d.season];
      if (S) moment(S[0], S[1], S[2], d.season === "winter" ? "lilac" : null);
    });
    on("tribe", function (d) { moment("🔥", d.tribe.name, "your smols have a name for themselves now", "lilac"); });
    on("ideaLost", function (d) { toast("🕯 <b>" + esc(SB.Ideas.BY_ID[d.id].name) + "</b> is lost. nobody alive remembers it."); });
    on("pray", function (d) {
      if (!game.settings || !game.settings.cards || !game.settings.cards.pray) storyCard("pray", "🙏", esc(d.c.name) + " is praying to you", ["smols pray when they need something they can't fix themselves. this one needs <b>" + esc(NEED_TEXT[d.need] || d.need) + "</b>.", "answer with ✨ magic: 🍎 bounty for hunger, 💚 heal for sickness, ☀️ sun for cold. answered prayers earn sparks, and smols remember that you listen."]);
    });
    on("pray", function (d) { if (!d.c.far) toast("🙏 " + esc(d.c.name) + (d.need !== "nothing" ? " prays for " + SB.DRIVE_EMOJI[SB.D[d.need]] + " " + esc(NEED_TEXT[d.need] || d.need) : " says thank you to the sky") + (/lonely|love|bored|fear/.test(d.need) ? ". it just wants you: 🪶 tickle it." : ". the right ✨ miracle nearby answers it. (tap 🙏 up top to find it)")); });
    on("dusk", function () {
      var lit = game.world.fires.some(function (f) { return f.kind === "campfire"; }), day = SB.World.clock(game.world).day;
      if (day <= 3 || !lit) toast("🌙 night is falling. grumps prowl in the dark: " + (lit ? "smols near the fire are safe." : "a campfire or a hut keeps smols safe."));
    });
    on("prayerAnswered", function (d) { if (SB.FX) SB.FX.burst("magic", d.c.x, d.c.y + 1, d.c.z, 14); });
    on("select", function (d) { if (d.c) { tutDone("look"); state.talkTarget = d.c; if (state.tool === "talk") updateTalk(true); else openSheet(state.sheet === "tricks" ? "tricks" : "smol"); } else if (state.sheet === "smol") closeSheet(); });
    on("wildEgg", function (d) { autoFly(d.obj.x, d.obj.z, 7, 1.4); });
    on("drowning", function (d) { if (!d.c.far || game.selectedId === d.c.id) toast("🌊 <b>" + esc(d.c.name) + "</b> is drowning! drag it out with ✋ grab"); });
    on("bigThought", function (d) {
      moment("🌟", "the big thought", "every smol mind on the island, thinking one thought. it's beautiful. it's about snacks.", "lilac");
      if (!d.first) return;
      setTimeout(function () {
        if (!SB.Intro || UI.noStory) { endCard(); return; }
        if (game.skip) SB.Game.skipStop(game, null);
        var sp = game.speed; game.speed = 0; closeModal();
        if (SB.Audio) SB.Audio.play("chime");
        SB.Intro.play({ scene: "end", noGate: true, done: function () { game.speed = sp || 1; endCard(); } });
      }, 3600);
    });
    on("dusk", function () { if (game.tutorial.done) storyCard("night", "🌙", "the first night", ["night falls, and <b>grumps</b> come out of the caves. they steal food and shove smols around.", "👆 tap a grump 3 times and it gives up and goes home. smols near a <b>fire</b> or in a hut are safe, so the first idea worth hoping for is fire."]); });
    on("sick", function (d) { if (d.c.species === "smol") storyCard("sick", "🤢", d.c.name + " is sick", ["smols catch the sniffles from bad food, cold and each other. sick smols get weak and can pass it on.", "✨ magic → 💚 heal cures one. later, smols with herb lore pick healroot and nurse their friends."]); });
    on("season", function (d) { if (d.season === "winter") storyCard("winter", "❄️", "winter", ["it's cold: food grows slowly, ponds freeze, and smols far from a fire start to shiver (🥶 above their heads).", "keep them near fires and huts, stock up grain from farms, and later, fur cloaks keep the cold off. ✨ ☀️ sun warms a spot when it's bad."]); });
    on("incident", function () { setTimeout(function () { if (!game.settings.cards || !game.settings.cards.incident) { storyCard("incident", "📜", "story cards", ["every few minutes something happens on the island: raids, storms, sickness, falling stars, feuds, lost kids, visions. the storyteller asks what you want to do.", "answers with ✨ cost sparks. if you don't answer in time, the free one happens. you can make the storyteller calmer or wilder in settings."]); } }, 200); });
    on("lightning", function () { R.flash(0.9); R.camera.shake = Math.max(R.camera.shake, 0.3); });
    on("death", function (d) { if (game.selectedId === d.c.id) closeSheet(); });
    on("orderDone", function (d) { if (d.msg) toast(esc(d.msg)); });
    on("ordersAnnoyed", function () { var now = performance.now(); if (now - annoyT < 30000) return; annoyT = now; toast("😤 too many orders: your smols are getting annoyed. they'll listen less for a while"); });
    on("grumpArrive", function () { if ((game.stats.grumpNights || 0) === 0 && !game._grumpWarned) { game._grumpWarned = true; toast("👺 grumps come out at night. 👆 tap them 3 times to shoo them. fire scares them too."); } });
    // threats.js: disasters, smols carried off, buildings wrecked
    on("disaster", function (d) {
      var def = SB.Threats && SB.Threats.DIS[d.kind];
      if (!def) return;
      moment(def.icon, "the " + def.name + "!", d.inc.choice === "shelter" ? "everyone's taking cover" : "hold on tight", "");
      R.camera.shake = Math.max(R.camera.shake, 0.6); R.flash(0.4);
      if (SB.Audio) try { SB.Audio.play("thunder", { vol: 0.8 }); } catch (e) {}
      storyCard("disaster", "🌋", "natural disasters", ["very rarely, the island itself turns on the smols. what can happen depends on where they live: <b>tsunamis</b> on the coast, <b>hurricanes</b> in the warm months, <b>sandstorms</b> near the savanna, <b>earthquakes</b> under the mountains, and once in a long while a <b>tornado</b>.", "you always get a warning. ✨ magic can stop it outright; taking cover keeps smols safe (buildings still suffer); riding it out is a gamble. builders put back what's wrecked. a star dome and thinkers see them coming much earlier."]);
    });
    on("grumpGrab", function (d) {
      if (!d.c.far || game.selectedId === d.c.id) autoFly(d.g.x, d.g.z, 8, 1.0);
      storyCard("grab", "👺", "a grump grabbed " + d.c.name + "!", ["grumps carry off kids and sleepers caught out in the open. 👆 tap the grump, or let a smol with a club whack it, and it drops them.", "if it gets away, " + d.c.name + " is held at a grump camp until you free them (or they escape on their own, eventually). huts keep kids safe at night."]);
    });
    on("wrecked", function (d) {
      if (!d.st || (game.dir && game.dir.active)) return; // raids and disasters report their own damage
      toast("💥 the " + SB.STRUCTS[d.st.kind].label + " was " + (d.how || "wrecked") + ". builders will fix it");
    });
  }

  /* ---------------- keys ---------------- */
  UI.key = function (e) {
    var k = e.key.toLowerCase();
    if (k === "backspace") { k = "escape"; e.preventDefault(); } // esc also leaves fullscreen, so backspace closes things too
    if (k === "escape") { if (el.modal) closeModal(); else if (UI.armed) disarm(); else if (state.sheet) { SB.Game.select(game, null); closeSheet(); } return true; }
    if (el.modal && !state.brainC) return false;
    if (k === " ") { cycleSpeed(0); e.preventDefault(); return true; }
    if (k === "[") { cycleSpeed(-1); return true; }
    if (k === "]") { cycleSpeed(1); return true; }
    if (k >= "1" && k <= "6") { setTool(TOOLS[+k - 1][0], true); return true; }
    if (k === "t") { setTool("talk", true); e.preventDefault(); return true; }
    if (k === "m") { game.settings = game.settings || {}; game.settings.minimap = game.settings.minimap === false; toast(game.settings.minimap === false ? "map hidden (m to show)" : "map on"); return true; }
    if (k === "b") { var c = SB.Game.byId(game, game.selectedId); if (!c || c.type !== "creature") c = brainPick(); if (c) { SB.Game.select(game, c.id); openBrain(c); } else toast("no smols to look inside yet"); return true; }
    if (k === "n") { toggleSkip(); return true; }
    if (k === "f") { var c2 = SB.Game.byId(game, game.selectedId); if (c2) SB.Input.follow(R.camera.follow ? null : c2); return true; }
    if (k === "h") { root.classList.toggle("hide"); return true; }
    return false;
  };

  // "b" with nobody picked: the smol the camera follows, else the living smol nearest the middle of the screen
  function brainPick() {
    var f = R.camera.follow; if (f && f.alive && f.type === "creature" && f.species === "smol") return f;
    var best = null, bd = Infinity;
    SB.Game.smols(game).forEach(function (c) { var d = (c.x - R.camera.x) * (c.x - R.camera.x) + (c.z - R.camera.z) * (c.z - R.camera.z); if (d < bd) { bd = d; best = c; } });
    return best;
  }

  /* ---------------- per frame ---------------- */
  var perfEl = null, perfT = 0;
  UI.frame = function (g, dt) {
    if (!game) return;
    pumpEvents();
    SB.Input.frame(dt);
    if (R.perf.show) {
      if (!perfEl) { perfEl = h("div", { class: "glass mono", style: "position:absolute;left:8px;bottom:90px;padding:6px 8px;font-size:10px;pointer-events:none" }); root.appendChild(perfEl); }
      if ((perfT -= dt) < 0) { perfT = 0.5; perfEl.textContent = Math.round(1000 / R.perf.ft) + " fps · " + R.perf.ft.toFixed(1) + " ms · " + R.perf.draws + " draws · " + Math.round(R.perf.tris / 1000) + "k tris · res " + R.quality.scale.toFixed(2) + " · sim " + (SB.Game.stepMs || 0).toFixed(2) + " ms · " + game.creatures.length + " creatures · " + game.world.items.length + " items"; }
    }
    updateHud(dt);
    updateAlert(dt);
    if (el.coach && game.tutorial.done) { el.coach.remove(); el.coach = null; }
    if (!el.coach) updateGuide(dt); else if (el.guide) { el.guide.remove(); el.guide = null; guideKey = ""; }
    drawMinimap(dt);
    updateOrdersUI(dt);
    if (state.sheet === "smol") renderSmol(false);
    else if (state.sheet === "tricks") renderTricks(false);
    else if (state.sheet === "talk") { if (el.talkWords) updateTalk(false); }
    else if (state.sheet === "magic") { if ((magicT -= dt) < 0) { magicT = 0.5; updateMagic(); } }
    drawBrain(dt);
    updateTrickCue();
    if (el.coach) el.coach.classList.toggle("top", !!state.sheet && state.sheet !== "talk" && state.sheet !== "magic" || state.sheet === "smol");
    // tutorial: egg warmed
    if (state.tutStep === 0) { var egg = game.world.items.filter(function (o) { return o.kind === "egg" && o.data.starter; })[0]; if (egg && egg.data.progress > 0 && el.coach) { el.coach.querySelector(".s").textContent = "keep tapping! it's hatching… " + Math.round(egg.data.progress * 100) + "%"; } }
    if (game.hand.hover === false) game.hand.visible = false;
  };
  var magicT = 0;

  UI.noWebGL = function () {
    root = document.getElementById("ui");
    var sp = document.getElementById("splash"); if (sp) sp.remove();
    root.appendChild(h("div", { class: "nowebgl" }, h("div", { class: "glass", style: "padding:24px;max-width:420px" }, [h("h2", { class: "mono" }, "no 3D here 😢"), h("p", null, "smol brains needs WebGL, and this browser or device doesn't have it switched on. try another browser (chrome, safari, firefox), or turn on hardware acceleration.")])));
  };
})();
