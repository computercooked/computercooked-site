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
    game = g; opts = opts || {};
    try { if (/[?&]nostory=1/.test(location.search)) UI.noStory = true; } catch (e) {} // for testing: skip the opening story
    root = document.getElementById("ui");
    clear(root);
    if (SB.Icons && !UI._icons) { UI._icons = true; SB.Icons.watch(document.body); } // every emoji the UI writes becomes a pixel icon
    buildHud(); buildToasts(); buildDock(); buildMinimap();
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
    game = g; SB.Input.setGame(g); mini.base = null;
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
    (game.sites || []).forEach(function (st) { if (!SB.World.isSeen(game.world, st.x, st.z)) return; var r = Math.max(3, 2 * k); x.fillStyle = st.found ? "rgba(245,243,237,0.35)" : st.kind === "camp" ? "#ff5f5f" : "#ffd84a"; x.fillRect(st.x * k - r / 2, st.z * k - r / 2, r, r); });
    ((game.dir && game.dir.marks) || []).forEach(function (m) { x.fillStyle = "#a8e6ff"; x.beginPath(); x.arc(m.x * k, m.z * k, Math.max(2.4, 1.8 * k), 0, 6.283); x.fill(); x.strokeStyle = "#ffffff"; x.lineWidth = 1; x.stroke(); });
    game.world.items.forEach(function (o) { if (o.kind === "egg" && o.heldBy == null) { x.fillStyle = "#fff6d6"; x.beginPath(); x.arc(o.x * k, o.z * k, Math.max(1.6, 1.2 * k), 0, 6.283); x.fill(); } });
    game.creatures.forEach(function (c) {
      if (!c.alive || !SB.World.isSeen(game.world, c.x, c.z)) return;
      var sel = c.id === game.selectedId, r = (sel ? 2.6 : 1.7) * Math.max(1, k * 0.9);
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
    el.menu = h("button", { class: "chipbtn glass live menu-btn", title: "smolpedia and settings", "aria-label": "menu", onclick: function () { openMenu(state.menuTab); } }, "☰");
    var mid = h("div", { class: "grow" }, el.era);
    el.hud.appendChild(el.clock); el.hud.appendChild(mid); el.hud.appendChild(el.sparks); el.hud.appendChild(el.speed); el.hud.appendChild(el.menu);
    root.appendChild(el.hud);
    el.goals = h("div", { class: "goals glass live", onclick: function () { el.goals.classList.toggle("min"); } });
    root.appendChild(el.goals);
  }
  var hudT = 0;
  function updateHud(dt) {
    hudT -= dt;
    if (hudT > 0) return;
    hudT = 0.25;
    var w = game.world, ck = SB.World.clock(w);
    var wx = w.weather.kind, icon = ck.night ? "🌙" : { clear: "☀️", cloudy: "⛅", rain: "🌧", storm: "⛈", fog: "🌫" }[wx] || "☀️";
    if (wx === "rain" && SB.World.tempAt(w, R.camera.x, R.camera.z) < 0.28) icon = "🌨";
    el.clock.innerHTML = '<span class="ico">' + icon + '</span><span><span class="long">day </span>' + ck.day + ' <span class="dim long">· ' + ck.season + ' </span>· ' + pad(ck.hour) + ":" + pad(ck.min) + "</span>";
    var smols = SB.Game.smols(game), maxT = game.stats.maxTier || 0, gen = game.stats.maxGen;
    var best = smols.reduce(function (b, c) { return c.tier > (b ? b.tier : -1) ? c : b; }, null);
    var prog = 0;
    if (best) prog = tierProgress(best);
    el.era.innerHTML = '<span class="ico">' + SB.TIERS[maxT].icon + '</span><span><span class="long">' + SB.TIERS[maxT].name + " · </span>gen " + gen + " · " + smols.length + ' 🐣</span><span class="bar"><i style="width:' + Math.round(prog * 100) + '%"></i></span>';
    el.sparks.innerHTML = '<span class="ico">✨</span><b>' + Math.floor(game.sparks || 0) + "</b>";
    el.speed.textContent = game.speed === 0 ? "⏸ paused" : "▶ " + game.speed + "×";
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
  function cycleSpeed(d) {
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
      add("evolve into " + nx.icon + " " + nx.name + (hint ? " (needs more " + hint + ")" : "") + nudge, Math.round(Math.max(0, bp) * 100) + "%");
    }
    var found = Object.keys(g.culture.found).length;
    if (maxT >= 2 && found < 3) add("a tool-user discovers an idea 💡 (try 💡 inspire)", found + "/3");
    if (maxT >= 4 && !A.built) add("builders finish a building 🛖", "");
    if (A.built && !A.village) add("3 huts around a campfire make a village 🏘", "");
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
  var goalKey = "";
  function updateGoals() {
    if (state.introRunning || (game.tutorial && !game.tutorial.done)) { el.goals.classList.add("hide"); goalKey = ""; return; }
    var list = goalsList(), key = JSON.stringify(list);
    if (key === goalKey) return;
    goalKey = key;
    el.goals.classList.toggle("hide", !list.length);
    el.goals.innerHTML = '<div class="head"><span>next</span><span>' + (el.goals.classList.contains("min") ? "▾" : "▴") + "</span></div>" + list.map(function (g) { return '<div class="g' + (g.done ? " done" : "") + '"><span class="t">' + esc(g.t) + '</span><span class="p">' + esc(g.p) + "</span></div>"; }).join("");
  }

  /* ---------------- toasts & moments ---------------- */
  function buildToasts() { el.toasts = h("div", { class: "toasts" }); root.appendChild(el.toasts); }
  // at most two toasts on screen; the rest wait their turn (repeats are dropped, old news falls off)
  var toastQ = [];
  function toast(html, cls, ms) {
    var live = [].filter.call(el.toasts.children, function (t) { return !t.classList.contains("out"); });
    if (live.some(function (t) { return t._html === html; }) || toastQ.some(function (q) { return q[0] === html; })) return;
    if (live.length >= 2) { toastQ.push([html, cls, ms]); if (toastQ.length > 5) toastQ.shift(); return; }
    var t = h("div", { class: "toast glass " + (cls || ""), html: html });
    t._html = html;
    el.toasts.appendChild(t);
    setTimeout(function () {
      t.classList.add("out");
      setTimeout(function () { t.remove(); var q = toastQ.shift(); if (q) toast(q[0], q[1], q[2]); }, 500);
    }, ms || 4200);
  }
  UI.toast = toast;
  var momentQ = [], momentBusy = false;
  function moment(icon, big, sub, cls) {
    momentQ.push([icon, big, sub, cls]);
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

  /* story cards: the first time something big happens, the game pauses and explains it (what happened,
     why, what you can do). Later times are just a quick moment. */
  var cardQ = [];
  function storyCard(key, icon, title, paras, fallback) {
    var seen = (game.settings = game.settings || {}).cards || (game.settings.cards = {});
    if (seen[key]) { if (fallback) moment(fallback[0], fallback[1], fallback[2], fallback[3]); return; }
    seen[key] = 1;
    cardQ.push([icon, title, paras]);
    if (!el.modal) nextCard();
  }
  function nextCard() {
    var c = cardQ.shift();
    if (!c) return;
    var body = h("div", { class: "story" }, [h("div", { class: "icon" }, c[0]), h("h3", null, c[1])].concat(c[2].map(function (p) { return h("p", { html: p }); })).concat([h("div", { class: "row" }, [h("span", { class: "sp" }), h("button", { class: "btn go", onclick: function () { closeModal(); } }, "got it")])]));
    modal("", body, { story: true });
  }
  UI.storyCard = storyCard;
  var NEXT_HELP = {
    1: "let smols carry and fiddle with things (✋ hand them sticks and stones), or ✨ magic → 🧬 bless the next eggs toward <b>hands</b>.",
    2: "talk to them a lot and let them hang out together: social smols have social kids. 🧬 bless toward <b>language</b> helps.",
    3: "builders plan ahead: smols that make things and finish plans have planning kids. 🧬 bless toward <b>planning</b>.",
    4: "thinkers have big heads: smols that learn, study and teach have brainier kids. 🧬 bless toward <b>big heads</b> or <b>bigger brains</b>.",
    5: "the last step needs huge, glowing brains. keep thinkers alive and teaching, and 🧬 bless toward <b>inner glow</b>."
  };
  var TIER_NEW = {
    1: "critters walk further and see more, so they find food on their own better.",
    2: "tool-users pick things up on purpose and <b>discover ideas</b> by fiddling: poke sticks, fire, baskets. watch for 💡.",
    3: "tribes talk in sentences, <b>teach each other</b>, share food, and <b>pray to you</b> when they need help (🙏 answer with ✨ magic).",
    4: "builders make <b>huts, farms and villages</b>. farms are the big one: they feed everybody, even in winter.",
    5: "thinkers carve ideas into story poles so they're never forgotten, and study the sky.",
    6: "ascended smols glow and float, and can start on the big thought. you made this."
  };

  /* ---------------- dock ---------------- */
  var TOOLS = [["grab", "✋", "grab"], ["tickle", "🪶", "tickle"], ["tap", "👆", "tap"], ["talk", "💬", "talk"], ["magic", "✨", "magic"]];
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
    state.tool = t; game.hand.tool = t;
    [].forEach.call(el.tools.children, function (b) { b.classList.toggle("on", b.getAttribute("data-tool") === t); });
    disarm();
    if (t === "talk") { if (state.tutStep === 4 && !state.teach) state.teach = "food"; openSheet("talk"); }
    else if (t === "magic") openSheet("magic");
    else if (state.sheet === "talk" || state.sheet === "magic" || (user && prev === t && state.sheet)) { if (game.selectedId) openSheet("smol"); else closeSheet(); }
    else if (game.selectedId && user) openSheet("smol");
  }
  UI.setTool = setTool;

  /* ---------------- sheets ---------------- */
  function openSheet(kind) {
    state.sheet = kind;
    el.sheet.classList.remove("hide");
    el.sheet.classList.toggle("side", kind === "smol" || kind === "inspect");
    sheetT = 0;
    renderSheet(true);
  }
  function closeSheet() { state.sheet = null; el.sheet.classList.add("hide"); clear(el.sheet); }
  UI.closeSheet = closeSheet;
  var sheetT = 0, sheetKey = "";
  function renderSheet(force) {
    if (!state.sheet) return;
    if (state.sheet === "smol") return renderSmol(force);
    if (state.sheet === "talk") return renderTalk(force);
    if (state.sheet === "magic") return renderMagic(force);
    if (state.sheet === "inspect") return renderInspect(force);
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
      h("button", { class: "ibtn", title: "follow with the camera (f)", onclick: function () { var on = !R.camera.follow; SB.Input.follow(on ? c : null); this.classList.toggle("on", on); } }, "🎥"),
      h("button", { class: "ibtn", title: "brain viewer (b)", onclick: function () { openBrain(c); } }, "🧠"),
      h("button", { class: "ibtn", title: "close", onclick: function () { SB.Game.select(game, null); closeSheet(); } }, "✕")
    ]);
    el.sheet.appendChild(head);
    el.sheet.appendChild(el.cThought = h("div", { class: "thought" }));
    if (c.species !== "grump") el.sheet.appendChild(el.cPeople = h("div", { class: "chips people" }));
    el.sheet.appendChild(el.cDrives = h("div", { class: "drives" }));
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
      h("button", { class: "btn", onclick: function () { cardMore = !cardMore; el.cMore.classList.toggle("hide", !cardMore); this.textContent = cardMore ? "less ▴" : "genes & more ▾"; } }, cardMore ? "less ▴" : "genes & more ▾"),
      h("button", { class: "btn", onclick: function () { setTool("talk", true); UI.talkTo(c); } }, "💬 talk"),
      h("button", { class: "btn", onclick: function () { openStory(c); } }, "📜 story"),
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
      el.cPeople.innerHTML = mood.join("") + rel.map(function (r) { var ic = r.label === "partner" ? "💕" : r.v >= 25 ? "💚" : r.v <= -25 ? "⚔" : "·"; return '<span class="chip ' + (r.v >= 25 ? "lime" : r.v <= -25 ? "warnc" : "dim") + '" title="' + esc(r.label) + '">' + ic + " " + esc(r.c.name) + " " + (r.v > 0 ? "+" : "") + r.v + "</span>"; }).join("") || '<span class="note">no friends or rivals yet</span>';
    }
    el.cSub.innerHTML = '<span class="tierpill" style="color:' + tier.color + '">' + tier.icon + " " + tier.name + "</span> " + stage + " · gen " + c.gen + " · iq <b class='lime'>" + c.iq + "</b> · " + fmtTime(c.age) + (game.clades && game.clades[c.clade] ? " · <span class='lilac'>" + esc(game.clades[c.clade].name) + "</span>" : "");
    var mood = SB.Chem.MOOD_EMOJI[SB.Chem.mood(c.chem)] || "🙂";
    el.cThought.innerHTML = mood + " <b>" + esc(SB.Creature.thought(c, game)) + "</b>";
    // drives: the 6 strongest
    var ds = SB.DRIVES.map(function (d, i) { return { i: i, v: c.chem[d] }; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 6);
    el.cDrives.innerHTML = ds.map(function (d) { return '<div class="drive" title="' + SB.DRIVES[d.i] + '"><span class="e">' + SB.DRIVE_EMOJI[d.i] + '</span><span class="b"><i style="width:' + Math.round(d.v * 100) + "%;background:" + SB.DRIVE_COLORS[d.i] + '"></i></span></div>'; }).join("") +
      '<div class="drive" title="health"><span class="e">❤️</span><span class="b"><i style="width:' + Math.round(c.chem.health * 100) + '%;background:#c5ff49"></i></span></div>';
    var ids = Object.keys(c.ideas).filter(function (k) { return SB.Ideas.BY_ID[k]; });
    el.cIdeaN.textContent = SB.Ideas.count(c) + (c.tier < 2 ? " · needs hands" : "");
    el.cIdeas.innerHTML = ids.length ? ids.map(function (k) { var d = SB.Ideas.BY_ID[k], v = c.ideas[k]; return '<span class="chip ' + (v >= 1 ? "lime" : "dim") + '" title="' + esc(d.desc) + '">' + d.icon + " " + esc(game.culture.words[k] || d.name) + (v < 1 ? " " + Math.round(v * 100) + "%" : "") + "</span>"; }).join("") : '<span class="note">' + (c.tier < 2 ? "blobs and critters can't hold ideas yet. evolve hands." : "nothing yet. curious smols discover things by fiddling.") + "</span>";
    var words = Object.keys(c.vocab).filter(function (w) { return c.vocab[w] >= 0.25; }).sort(function (a, b) { return c.vocab[b] - c.vocab[a]; });
    el.cWordN.textContent = SB.Creature.knownCount(c) + " known";
    el.cWords.innerHTML = words.length ? words.slice(0, 30).map(function (w) { var v = c.vocab[w]; return '<span class="chip ' + (v >= 1 ? "lime" : "dim") + '">' + esc(v >= 1 ? w : SB.Creature.garble(w, v)) + "</span>"; }).join("") : '<span class="note">no words yet. talk to it.</span>';
    if (cardMore) renderMore(c);
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
    el.sheet.appendChild(h("div", { class: "row" }, [h("div", { class: "nm", style: "font-size:15px" }, "💬 word book"), h("span", { class: "sp" }), el.talkShared = h("span", { class: "mono lime" })]));
    el.sheet.appendChild(el.talkInfo = h("div", { class: "teachbar" }));
    el.sheet.appendChild(el.talkWords = h("div", { class: "wordbook" }));
    updateTalk(true);
  }
  function updateTalk(force) {
    if (!el.talkWords) return;
    var WD = SB.Words, cul = game.culture || {};
    var key = state.teach + ":" + WD.topTier(game) + ":" + WD.BOOK.map(function (b) { return Math.round(WD.share(game, b.w) * 10); }).join("");
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
        h("span", { class: "wb" }, [h("i", { style: "width:" + Math.round(sh * 100) + "%" })])
      ]);
      if (open && b.call && sh > 0) card.appendChild(h("span", { class: "call", title: "call: " + b.call, onclick: function (e) { e.stopPropagation(); callWord(b.w); } }, "📣"));
      el.talkWords.appendChild(card);
    });
    var t = state.teach;
    el.talkInfo.innerHTML = t ? "teaching <b class='lime'>“" + esc(t) + "”</b>: " + esc(WD.how(t)) + (WD.byWord[t].call ? ". <span class='dim'>when they know it, 📣 " + esc(WD.byWord[t].call) + ".</span>" : "") :
      "pick a word, then show them what it means. one lesson per smol every few seconds, so take it slow. words most of the tribe knows make everyone smarter.";
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
    if (res.tried || res.ok) showSay(w, x, z, hit && hit.type === "creature");
    var now = performance.now();
    if (res.learned && res.learned.length) {
      res.learned.forEach(function (c) { if (SB.FX) SB.FX.burst("sparkle", c.x, c.y + 0.8, c.z, 10); });
      toast("✨ " + res.learned.map(function (c) { return esc(c.name); }).slice(0, 3).join(", ") + (res.learned.length > 3 ? " +" + (res.learned.length - 3) : "") + " learned “" + esc(w) + "”!", "ach");
    } else if (res.msg && now - teachToastT > 1500) { teachToastT = now; toast(esc(res.msg)); }
    else if (res.pending && now - teachToastT > 1500) { teachToastT = now; toast("you asked " + esc(hit.ref.name) + " to “" + esc(w) + "”. if it does, that's a lesson. 🪶 tickle helps."); }
    if (state.tutStep === 4 && res.ok) tutAdvance();
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
  function renderMagic(force) {
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
      case "bolt": SB.World.lightning(w, game, x, z, true); R.flash(1); R.camera.shake = 0.6; break;
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
        game.blessing = { name: b.name, genes: b.genes, uses: 3 };
        game.stats.miracles = (game.stats.miracles || 0) + 1;
        SB.Game.unlock(game, "miracle");
        SB.bus.emit("miracle", { id: "bless" });
        closeModal(); toast("🧬 blessed: the next 3 eggs lean toward " + b.name);
      } }, [h("div", { class: "big" }, b.e), h("h4", null, b.name), helps ? h("div", { class: "tag" }, "next evolution") : null]));
    });
    body.appendChild(grid);
    modal("🧬 bless the next eggs", body);
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
    closeModal();
    opts = opts || {};
    UI.modalOpen = !opts.live;
    var wrap = h("div", { class: "modal-wrap", onclick: function (e) { if (e.target === wrap && !opts.sticky) closeModal(); } });
    var m = h("div", { class: "modal glass" + (opts.story ? " storycard" : "") }, [
      opts.story ? null : h("div", { class: "mh" }, [h("h2", null, title), opts.sticky ? null : h("button", { class: "ibtn", "aria-label": "close", onclick: closeModal }, "✕")]),
      opts.tabs || null,
      h("div", { class: "mb" }, body)
    ]);
    wrap.appendChild(m);
    root.appendChild(wrap);
    el.modal = wrap; el.modalBody = m.querySelector(".mb");
    return wrap;
  }
  function closeModal() {
    if (el.modal) { el.modal.remove(); el.modal = null; }
    UI.modalOpen = false;
    state.brainC = null;
    if (cardQ.length) setTimeout(function () { if (!el.modal) nextCard(); }, 250);
  }
  UI.closeModal = closeModal;

  /* ---------------- menu / smolpedia ---------------- */
  var TABS = [["evolution", "🧬 evolution"], ["ideas", "💡 ideas"], ["smols", "🐣 smols"], ["family", "🌳 family"], ["chronicle", "📜 chronicle"], ["goals", "🏆 goals"], ["world", "🏝 world"], ["settings", "⚙️ settings"], ["help", "❓ help"]];
  function openMenu(tab, arg) {
    state.menuTab = tab || "evolution";
    var tabs = h("div", { class: "tabs" });
    TABS.forEach(function (t) { tabs.appendChild(h("button", { class: "tab" + (t[0] === state.menuTab ? " on" : ""), onclick: function () { openMenu(t[0]); } }, t[1])); });
    var body = h("div");
    modal("smolpedia", body, { tabs: tabs });
    ({ evolution: tabEvolution, ideas: tabIdeas, smols: tabSmols, family: tabFamily, chronicle: tabChronicle, goals: tabGoals, world: tabWorld, settings: tabSettings, help: tabHelp })[state.menuTab](body, arg);
  }
  UI.openMenu = openMenu;

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
    body.appendChild(h("div", { class: "sec" }, [h("span", null, "tree of life"), h("span", { class: "dim" }, SB.Species.count(game) + " species · " + SB.Species.living(game) + " alive")]));
    var cv = h("canvas", { class: "treecv" });
    body.appendChild(cv);
    body.appendChild(h("p", { class: "note" }, "new species branch off when a baby climbs a tier or drifts far from its family's genes. species too far apart can't have eggs together. 💫 echoes: what parents practise (walking, carrying, talking, building, thinking) nudges their kids' genes."));
    requestAnimationFrame(function () { drawTree(cv); });
  }
  function drawTree(cv) {
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
    var W = cv.clientWidth || 600, dpr = Math.min(2, window.devicePixelRatio || 1), cw = Math.max(W, cols * 120), H = Math.max(160, (depth + 1) * 92 + 30);
    cv.style.width = cw + "px"; cv.style.height = H + "px";
    cv.parentNode.style.overflowX = "auto";
    cv.width = cw * dpr; cv.height = H * dpr;
    var ctx = cv.getContext("2d");
    ctx.scale(dpr, dpr);
    function px(id) { return { x: (pos[id].x + 0.5) * cw / cols, y: 34 + pos[id].y * 92 }; }
    ctx.lineWidth = 2;
    ids.forEach(function (id) { var p = clades[id].parent; if (p == null || !pos[id] || !pos[p]) return; var a = px(p), b = px(id); ctx.strokeStyle = "rgba(181,154,255,0.5)"; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.bezierCurveTo(a.x, (a.y + b.y) / 2, b.x, (a.y + b.y) / 2, b.x, b.y); ctx.stroke(); });
    ids.forEach(function (id) {
      if (!pos[id]) return;
      var c = clades[id], p = px(id), t = SB.TIERS[c.tier] || SB.TIERS[0];
      ctx.globalAlpha = c.extinct ? 0.4 : 1;
      ctx.fillStyle = c.look ? bodyColor(c.look) : "#b59aff";
      ctx.beginPath(); ctx.arc(p.x, p.y, 16, 0, 6.283); ctx.fill();
      ctx.strokeStyle = c.alive ? "#c5ff49" : "rgba(255,255,255,0.25)"; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.font = "15px system-ui, apple color emoji"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      SB.Icons.fillText(ctx, t.icon, p.x, p.y + 1, 14);
      ctx.fillStyle = "#f5f3ed"; ctx.font = "800 10px ui-monospace, monospace";
      ctx.fillText(c.name.slice(0, 22), p.x, p.y + 27);
      ctx.fillStyle = "rgba(245,243,237,0.55)"; ctx.font = "10px system-ui";
      ctx.fillText((c.extinct ? "extinct" : c.alive + " alive") + " · " + c.sci, p.x, p.y + 40);
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
        h("div", { style: "flex:1;min-width:0" }, [h("div", { class: "mono", style: "font-weight:800" }, c.name), h("div", { class: "sub2" }, SB.TIERS[c.tier].name + " · " + SB.STAGES[c.stage].name + " · gen " + c.gen + " · iq " + c.iq + " · " + SB.Ideas.count(c) + " ideas · " + SB.Creature.knownCount(c) + " words")]),
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
    body.appendChild(h("p", { class: "note" }, "a new world replaces this one (your smols don't come along, but you can bring any smol with its code)."));
    body.appendChild(h("div", { class: "sec" }, "bring a smol in"));
    var imp = h("input", { type: "text", placeholder: "paste a SMOL code", style: "width:100%" });
    body.appendChild(imp);
    body.appendChild(h("div", { class: "btnrow" }, [h("button", { class: "btn", onclick: function () { importSmol(imp.value); } }, "🌌 bring it in")]));
  }
  function confirmNew(seed) {
    var body = h("div", null, [h("p", null, "start world " + SB.worldCode(seed) + "? this island and its smols will be gone (save codes for the ones you love first)."), h("div", { class: "btnrow" }, [h("button", { class: "btn warn", onclick: function () { closeModal(); newWorld(seed); } }, "yes, new world"), h("button", { class: "btn", onclick: closeModal }, "cancel")])]);
    modal("new world?", body);
  }
  function newWorld(seed) {
    var g = SB.Game.newGame(seed);
    SB.Game.swap(g);
    UI.init(g, { fresh: true });
  }
  UI.confirmRestart = function () { confirmNew(SB.newSeed()); };

  function importSmol(code) {
    try {
      var d = SB.Save.importSmol(code);
      var sp = SB.Society.home(game, 0);
      var c = SB.Game.spawnSmol(game, { genome: d.genome, name: d.name, gen: d.gen, vocab: d.vocab, ideas: d.ideas, age: d.age, x: sp.x + 1, z: sp.z + 1, brain: d.brain ? SB.Brain.deserialize(d.brain, d.genome, game.rng) : null });
      game.stats.imported++;
      SB.Game.unlock(game, "import");
      closeModal(); SB.Game.select(game, c.id); R.flyTo(c.x, c.z, 7, 1);
      moment("🌌", c.name + " arrived!", "a smol from somewhere else", "lilac");
    } catch (e) { toast("that's not a smol code 🤔"); }
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
        // the look is chosen when the 3D view starts, so switching saves and reloads
        try { window.localStorage.setItem("smolbrains-look", R.pixel ? "3d" : "pixel"); } catch (e) {}
        SB.Save.save(game); location.reload();
      } }, R.pixel ? "👾 pixel art (tap for classic 3D)" : "🧊 classic 3D (tap for pixel art)"),
      R.pixel ? null : h("button", { class: "btn", onclick: function () { var q = R.quality; q.scale = q.scale >= 1 ? 0.6 : 1; R.resize(); openMenu("settings"); } }, R.quality.scale >= 1 ? "🖥 sharp" : "🔋 battery saver"),
      h("button", { class: "btn", onclick: function () { R.quality.decor = !R.quality.decor; openMenu("settings"); } }, R.quality.decor ? "🌼 grass & flowers on" : "🌼 grass off"),
      h("button", { class: "btn", onclick: function () { UI.replayIntro(); } }, "🚀 watch the opening again"),
      game.ended ? h("button", { class: "btn", onclick: function () { closeModal(); SB.Intro.play({ scene: "end", noGate: true }); } }, "🌟 watch the ending again") : null
    ]));
    // the storyteller: how often trouble (and luck) comes, and how hard
    var ST = [["calm", "🌿 calm", "fewer, gentler events. for watching your smols grow."], ["balanced", "⚖️ balanced", "the way it's meant to be played."], ["wild", "🔥 wild", "more raids, more storms, more chaos."]];
    var cur = (game.settings && game.settings.storyteller) || "balanced";
    body.appendChild(h("div", { class: "sec" }, "storyteller"));
    body.appendChild(h("div", { class: "btnrow" }, ST.map(function (o) { return h("button", { class: "btn" + (o[0] === cur ? " go" : ""), onclick: function () { (game.settings = game.settings || {}).storyteller = o[0]; openMenu("settings"); } }, o[1]); })));
    body.appendChild(h("p", { class: "note" }, ST.filter(function (o) { return o[0] === cur; })[0][2] + (game.ngPlus ? " (new game+ " + game.ngPlus + ": the grumps remember you.)" : "")));
    body.appendChild(h("div", { class: "sec" }, "save"));
    body.appendChild(h("p", { class: "note" }, "the game saves itself every 20 seconds and when you leave. while you're away, the island keeps going for a while."));
    body.appendChild(h("div", { class: "btnrow" }, [h("button", { class: "btn", onclick: function () { SB.Save.save(game); toast("saved 💾"); } }, "save now"), h("button", { class: "btn warn", onclick: function () { UI.confirmRestart(); } }, "new world")]));
    if (SB.Save.loadV1()) body.appendChild(h("p", { class: "note" }, "your old valley save (v1) is still kept safe on this device."));
  }

  function tabHelp(body) {
    body.innerHTML = "<p><b class='lime'>smol brains</b> is an island of tiny creatures with real neural-network brains. you don't control them. you raise them.</p>" +
      "<p><b class='lime'>your role</b>: you're their god. smols decide everything themselves, by trial and error. you nudge: reward the good stuff, scold the bad, teach words, move things around, and spend sparks on miracles when they pray. the goals list (top left) always says what's next.</p>" +
      "<p><b class='lime'>food & survival</b>: smols forage berries, apples, sunroots, gourds, honey and more. hunger, cold, sickness, grumps at night and deep water can kill them. once they're builders, farms feed the colony through winter. when food runs short, they stop having babies.</p>" +
      "<p>✋ <b>grab</b>: tap a smol to see inside it, drag smols and things around, throw them (gently). drag empty ground to move the camera.<br>🪶 <b>tickle</b>: a reward. tap or rub a smol right after it does something good.<br>👆 <b>tap</b>: a scolding. it stops and learns not to.<br>💬 <b>talk</b>: the word book. pick a word, then show it: tap a thing for its name, or tap a smol and ask it to do something. one lesson per smol every few seconds. words most of the tribe knows make everyone smarter and become 📣 calls.<br>📜 <b>story</b>: every smol remembers who hit it, who shared food, who taught it things. friends stick together, rivals shove and brawl, and builders and up hold real conversations (gossip spreads grudges). tap a smol, then 📜 story. a gift of food mends a grudge; 👆 tap ends a tantrum; 🪶 tickle comforts the grieving.<br>✨ <b>magic</b>: spend sparks on miracles. sparks come from smols learning, discovering, hatching and praying.</p>" +
      "<p><b class='lilac'>evolution</b>: genes mutate when eggs are made. and what parents practise echoes into their babies: smols that walk a lot have kids with longer legs, smols that fiddle with things have kids with hands, smols that learn have kids with bigger brains. climb the ladder: blob → critter → tool-user → tribe → builder → thinker → ascended.</p>" +
      "<p><b class='lilac'>ideas</b>: tool-users discover crafts (poke sticks, fire, spears…), tribes teach each other and pray to you, builders make huts, farms and villages, thinkers write ideas on story poles so nothing is forgotten.</p>" +
      "<p>camera: drag to pan, pinch or wheel to zoom, twist with two fingers (or right-drag, or q/e) to rotate, slide two fingers up or down (or right-drag up/down, or r/v) to tilt and look across the land. the map (bottom left) jumps anywhere: tap it or drag the white box. keys: wasd pan, 1-5 tools, space pause, [ ] speed, f follow, b brain, m map, esc close.</p>";
  }

  /* ---------------- brain viewer ---------------- */
  function openBrain(c) {
    SB.Game.unlock(game, "brain");
    var cv = h("canvas", { class: "braincv" });
    var info = h("div", { class: "note" });
    var body = h("div", null, [h("p", { class: "note" }, "live: left are its senses (feelings, what it sees and hears, memory), middle its hidden neurons, right the actions it could take. lime lines push up, pink push down, flashes are learning."), cv, info]);
    modal("🧠 " + c.name + "'s brain", body, { live: true });
    state.brainC = { c: c, cv: cv, info: info, t: 0 };
    if (state.tutStep === 5) tutAdvance();
  }
  function drawBrain(dt) {
    var B = state.brainC;
    if (!B || !el.modal) return;
    B.t -= dt;
    if (B.t > 0) return;
    B.t = 0.1;
    var c = B.c, b = c.brain, cv = B.cv;
    if (!c.alive) { B.info.textContent = c.name + " is gone. 🕊"; return; }
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

  /* ---------------- intro & tutorial ---------------- */
  function intro() {
    state.introRunning = true;
    el.hud.classList.add("hide"); el.tools.classList.add("hide");
    if (SB.Intro && !UI.noStory && !game.ngPlus) { SB.Intro.play({ done: landing }); return; }
    landing();
  }
  UI.replayIntro = function () { closeModal(); if (SB.Intro) SB.Intro.play({ noGate: true }); };
  // after the story: the camera falls with the pod onto the island
  function landing() {
    var T = game.world.T, nest = T.nest;
    var title = h("div", { class: "title" }, [h("h1", { html: "smol<br><span>brains</span>" }), h("p", null, "an island of tiny minds. one escape pod.")]);
    root.appendChild(title);
    R.camera.x = T.N / 2; R.camera.z = T.N / 2 + 20; R.camera.zoom = R.camera.tZoom = 95; R.camera.yaw = R.camera.tYaw = -0.9;
    R.cinematic({ dur: 5.5, x0: T.N / 2, zz0: T.N / 2 + 20, x1: nest.x, zz1: nest.z, z0: 95, z1: 5.5, yaw0: -0.9, yaw1: 0.35, skippable: true, done: function () {
      title.classList.add("out"); setTimeout(function () { title.remove(); }, 1000);
      el.hud.classList.remove("hide"); el.tools.classList.remove("hide");
      state.introRunning = false;
      game.tutorial.step = 0;
      tutShow();
    } });
  }
  var TUT = [
    { t: "tap the crashed pod", s: "this is your island. you're its god: smols think for themselves, you nudge them. something's moving in that pod. tap it a few times to open it." },
    { t: "they're out!", s: "" },
    { t: "it's hungry", s: "smols learn by trying things and remembering what felt good. it'll find food on its own, but you can help: ✋ drag the apple next to it." },
    { t: "reward it", s: "🪶 tickle means “yes, more of that”. pick tickle and tap the smol while it eats. (👆 tap means “no”.) that's how you teach it what's good." },
    { t: "teach it a word", s: "💬 talk opens the word book. pick “food”, then tap the apple while your smol can see it. one lesson every few seconds. smols that know a word can be called with 📣, and they teach each other." },
    { t: "peek inside its head", s: "tap the smol, then 🧠. that's a real neural network, and it changes as it learns." },
    { t: "your job now", s: "keep them alive, teach them, guide their evolution. fed, happy grown-ups lay eggs, and kids inherit how their parents lived. goals are top left, the map is bottom left. when they pray 🙏, answer with ✨ magic." }
  ];
  function tutShow() {
    if (el.coach) { el.coach.remove(); el.coach = null; }
    var st = game.tutorial;
    if (st.done) { state.tutStep = -1; return; }
    state.tutStep = st.step;
    if (st.step === 1) return; // name prompt handles it
    var d = TUT[st.step];
    if (!d) { st.done = true; return; }
    el.coach = h("div", { class: "coach glass" }, [h("div", { class: "t" }, d.t), d.s ? h("div", { class: "s" }, d.s) : null, h("div", { class: "row" }, [h("span", { class: "sp" }), st.step >= 6 ? h("button", { class: "btn go", onclick: function () { st.done = true; tutShow(); } }, "let's go") : h("button", { class: "btn", onclick: function () { st.done = true; tutShow(); toast("tutorial skipped. ❓ help is in the menu."); } }, "skip tutorial")])]);
    root.appendChild(el.coach);
  }
  function tutAdvance(to) {
    var st = game.tutorial;
    if (st.done) return;
    st.step = to != null ? to : st.step + 1;
    tutShow();
  }
  UI.userActed = function () { };

  function namePrompt(c, twin) {
    var inp = h("input", { type: "text", value: c.name, maxlength: 16, autocapitalize: "words", onkeydown: function (e) { if (e.key === "Enter") ok(); e.stopPropagation(); } });
    var inp2 = twin ? h("input", { type: "text", value: twin.name, maxlength: 16, autocapitalize: "words", onkeydown: function (e) { if (e.key === "Enter") ok(); e.stopPropagation(); } }) : null;
    function clean(v) { return v.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 16); }
    function ok() {
      var n = clean(inp.value);
      if (n) c.name = n;
      if (game.family[c.id]) game.family[c.id].name = c.name;
      if (twin) { var n2 = clean(inp2.value); if (n2) twin.name = n2; if (game.family[twin.id]) game.family[twin.id].name = twin.name; }
      SB.Game.unlock(game, "name");
      closeModal();
      if (window.innerWidth >= 600) SB.Game.select(game, c.id); // on a phone the card would cover the whole tutorial
      SB.Input.follow(c);
      tutAdvance(2);
    }
    var rnd = function (i) { return function () { i.value = SB.makeName(SB.rng((Date.now() + i.value.length * 77) >>> 0)); }; };
    var body = twin ? h("div", null, [
      h("p", null, game.ngPlus ? "a girl and a boy climbed out of the pod: the great-great-grandkids of your best smols, on a brand new island. what are they called?" : "two little blobs climbed out of the pod: a girl and a boy. the last smols. what are they called?"),
      h("div", { class: "namebox" }, [h("span", { class: "sexi" }, "♀"), inp, h("button", { class: "btn", title: "random name", onclick: rnd(inp) }, "🎲")]),
      h("div", { class: "namebox" }, [h("span", { class: "sexi" }, "♂"), inp2, h("button", { class: "btn", title: "random name", onclick: rnd(inp2) }, "🎲")]),
      h("div", { class: "btnrow" }, [h("button", { class: "btn go", onclick: ok }, "name them")])
    ]) : h("div", null, [h("p", null, "it's a smol! a blob, for now. what's it called?"), h("div", { class: "namebox" }, [inp, h("button", { class: "btn go", onclick: ok }, "name it"), h("button", { class: "btn", title: "random name", onclick: rnd(inp) }, "🎲")])]);
    modal(twin ? "🐣 the founders" : "🐣 hello, world", body, { sticky: true });
    setTimeout(function () { try { inp.focus(); inp.select(); } catch (e) { } }, 50);
  }

  var NEED_TEXT = { hunger: "food", tired: "rest", sleepy: "sleep", bored: "something to do", lonely: "company", pain: "healing", fear: "safety", cold: "warmth", hot: "shade", sick: "healing", love: "love", anger: "calm" };

  /* ---------------- strangers ---------------- */
  function strangerCard(c) {
    if (!c.alive || !c.stranger || c.stranger.state !== "waiting") return;
    if (el.modal) { setTimeout(function () { strangerCard(c); }, 3000); return; } // wait for the current card
    R.flyTo(c.x, c.z, 6, 1.0);
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
    if (el.modal) { setTimeout(function () { incidentCard(inc); }, 2500); return; }
    if (inc.x != null) R.flyTo(inc.x, inc.z, 9, 1.0);
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
    modal("🌙 while you were away", body, { sticky: true });
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
        champs.length ? h("button", { class: "btn go", onclick: function () { closeModal(); var ng = SB.Game.newGamePlus(g, SB.newSeed()); SB.Game.swap(ng); UI.init(ng, { fresh: true }); } }, "🌱 new game+" + (lvl > 1 ? " " + lvl : "")) : null
      ])
    ]);
    modal("", body, { story: true, sticky: true });
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
  var wired = false;
  function wireBus() {
    if (wired) return;
    wired = true;
    var on = SB.bus.on;
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
    on("eat", function (d) { if (state.tutStep === 2 && d.c.species === "smol") tutAdvance(3); if (SB.FX && !d.c.far) SB.FX.burst("crumbs", d.c.x, d.c.y + 0.3, d.c.z, 5); });
    on("tickle", function () { if (state.tutStep === 3) tutAdvance(4); });
    on("learnWord", function (d) {
      if (d.c.species !== "smol") return;
      if (game.stats.wordsTaught === 1) moment("💬", "first word!", "“" + d.word + "!” " + d.c.name + " learned a word. you did that.");
      if (state.tutStep === 4) tutAdvance(5);
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
      storyCard("grave", "🪦", "goodbye, " + esc(d.c.name), ["every smol gets a little grave where it fell, with an epitaph. tap it to read it.",
        "friends and family grieve for a while: they get lonely and slow, and visit the grave. the 📜 chronicle in the menu remembers everyone."]);
    });
    on("stranger", function (d) { setTimeout(function () { strangerCard(d.c); }, 400); });
    on("siteFound", function (d) {
      var paras = d.text.map(esc);
      if (d.log) paras.push('<span class="podlog">' + esc(d.log) + "</span>");
      cardQ.push([d.icon, esc(d.title), paras]);
      if (!el.modal) nextCard();
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
      R.flyTo(d.c.x, d.c.z, 6, 1.2);
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
    on("tribe", function (d) { moment("🔥", d.tribe.name, "your smols have a name for themselves now", "lilac"); });
    on("ideaLost", function (d) { toast("🕯 <b>" + esc(SB.Ideas.BY_ID[d.id].name) + "</b> is lost. nobody alive remembers it."); });
    on("pray", function (d) {
      if (!game.settings || !game.settings.cards || !game.settings.cards.pray) storyCard("pray", "🙏", esc(d.c.name) + " is praying to you", ["smols pray when they need something they can't fix themselves. this one needs <b>" + esc(NEED_TEXT[d.need] || d.need) + "</b>.", "answer with ✨ magic: 🍎 bounty for hunger, 💚 heal for sickness, ☀️ sun for cold. answered prayers earn sparks, and smols remember that you listen."]);
    });
    on("pray", function (d) { if (!d.c.far) toast("🙏 " + esc(d.c.name) + (d.need !== "nothing" ? " prays for " + SB.DRIVE_EMOJI[SB.D[d.need]] + " " + esc(NEED_TEXT[d.need] || d.need) : " says thank you to the sky") + ". the right ✨ miracle nearby answers it."); });
    on("dusk", function () {
      var lit = game.world.fires.some(function (f) { return f.kind === "campfire"; }), day = SB.World.clock(game.world).day;
      if (day <= 3 || !lit) toast("🌙 night is falling. grumps prowl in the dark: " + (lit ? "smols near the fire are safe." : "a campfire or a hut keeps smols safe."));
    });
    on("prayerAnswered", function (d) { if (SB.FX) SB.FX.burst("magic", d.c.x, d.c.y + 1, d.c.z, 14); });
    on("select", function (d) { if (d.c) { state.talkTarget = d.c; if (state.tool === "talk") updateTalk(true); else openSheet("smol"); } else if (state.sheet === "smol") closeSheet(); });
    on("wildEgg", function (d) { R.flyTo(d.obj.x, d.obj.z, 7, 1.4); });
    on("drowning", function (d) { if (!d.c.far || game.selectedId === d.c.id) toast("🌊 <b>" + esc(d.c.name) + "</b> is drowning! drag it out with ✋ grab"); });
    on("bigThought", function (d) {
      moment("🌟", "the big thought", "every smol mind on the island, thinking one thought. it's beautiful. it's about snacks.", "lilac");
      if (!d.first) return;
      setTimeout(function () {
        if (!SB.Intro || UI.noStory) { endCard(); return; }
        var sp = game.speed; game.speed = 0; closeModal();
        if (SB.Audio) SB.Audio.play("chime");
        SB.Intro.play({ scene: "end", noGate: true, done: function () { game.speed = sp || 1; endCard(); } });
      }, 3600);
    });
    on("lightning", function () { R.flash(0.9); R.camera.shake = Math.max(R.camera.shake, 0.3); });
    on("death", function (d) { if (game.selectedId === d.c.id) closeSheet(); });
    on("grumpArrive", function () { if ((game.stats.grumpNights || 0) === 0 && !game._grumpWarned) { game._grumpWarned = true; toast("👺 grumps come out at night. 👆 tap them 3 times to shoo them. fire scares them too."); } });
  }

  /* ---------------- keys ---------------- */
  UI.key = function (e) {
    var k = e.key.toLowerCase();
    if (k === "escape") { if (el.modal) closeModal(); else if (UI.armed) disarm(); else if (state.sheet) { SB.Game.select(game, null); closeSheet(); } return true; }
    if (el.modal && !state.brainC) return false;
    if (k === " ") { cycleSpeed(0); e.preventDefault(); return true; }
    if (k === "[") { cycleSpeed(-1); return true; }
    if (k === "]") { cycleSpeed(1); return true; }
    if (k >= "1" && k <= "5") { setTool(TOOLS[+k - 1][0], true); return true; }
    if (k === "t") { setTool("talk", true); e.preventDefault(); return true; }
    if (k === "m") { game.settings = game.settings || {}; game.settings.minimap = game.settings.minimap === false; toast(game.settings.minimap === false ? "map hidden (m to show)" : "map on"); return true; }
    if (k === "b") { var c = SB.Game.byId(game, game.selectedId); if (c && c.type === "creature") openBrain(c); return true; }
    if (k === "f") { var c2 = SB.Game.byId(game, game.selectedId); if (c2) SB.Input.follow(R.camera.follow ? null : c2); return true; }
    if (k === "h") { root.classList.toggle("hide"); return true; }
    return false;
  };

  /* ---------------- per frame ---------------- */
  var perfEl = null, perfT = 0;
  UI.frame = function (g, dt) {
    if (!game) return;
    SB.Input.frame(dt);
    if (R.perf.show) {
      if (!perfEl) { perfEl = h("div", { class: "glass mono", style: "position:absolute;left:8px;bottom:90px;padding:6px 8px;font-size:10px;pointer-events:none" }); root.appendChild(perfEl); }
      if ((perfT -= dt) < 0) { perfT = 0.5; perfEl.textContent = Math.round(1000 / R.perf.ft) + " fps · " + R.perf.ft.toFixed(1) + " ms · " + R.perf.draws + " draws · " + Math.round(R.perf.tris / 1000) + "k tris · res " + R.quality.scale.toFixed(2) + " · sim " + (SB.Game.stepMs || 0).toFixed(2) + " ms · " + game.creatures.length + " creatures · " + game.world.items.length + " items"; }
    }
    updateHud(dt);
    updateAlert(dt);
    drawMinimap(dt);
    if (state.sheet === "smol") renderSmol(false);
    else if (state.sheet === "talk") { if (el.talkWords) updateTalk(false); }
    else if (state.sheet === "magic") { if ((magicT -= dt) < 0) { magicT = 0.5; updateMagic(); } }
    drawBrain(dt);
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
