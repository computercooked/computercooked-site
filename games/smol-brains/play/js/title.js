/* smol brains — title.js (v3.6)
   Everything before an island: "computer cooked games presents", the title card, and the title screen
   over a slow, faded panorama of a late-game smol city (a real island, built and simulated in the engine:
   the future you're playing toward). From there: continue, start a new world (name, size and a
   Minecraft-style page of world settings) or load any island this browser keeps. */
(function () {
  "use strict";
  var SB = window.SB;
  var TI = (SB.Title = {});

  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k === "html") e.innerHTML = v;
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    if (kids != null) (Array.isArray(kids) ? kids : [kids]).forEach(function (c) { if (c == null || c === false) return; e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function sfx(n, v) { if (SB.Audio && SB.Audio.play) try { SB.Audio.play(n, { vol: v == null ? 1 : v }); } catch (e) {} }
  function root() { return document.getElementById("ui") || document.body; }

  /* ---------------- computer cooked games presents ---------------- */
  // big words fading in and out on black, then the title. Any tap or key skips ahead a step
  TI.presents = function (done) {
    var wrap = h("div", { class: "presents live" }), cur = null, steps, i = -1, timer = null, over = false;
    var cards = [
      h("div", { class: "pcard pcc" }, [h("div", { class: "pcc-mark", html: "<i></i><i></i><i></i>" }), h("div", { class: "pcc-name", html: "computer cooked<br><b>games</b>" }), h("div", { class: "pcc-sub", text: "presents" })]),
      h("div", { class: "pcard ptitle" }, [h("h1", { html: "smol<br><span>brains</span>" }), h("p", { text: "tiny minds · one island · a whole civilisation" })])
    ];
    steps = [3.6, 3.4];
    cards.forEach(function (c) { wrap.appendChild(c); });
    wrap.appendChild(h("div", { class: "pskip", text: "tap to skip" }));
    root().appendChild(wrap);
    function next() {
      clearTimeout(timer);
      if (cur) { var old = cur; old.classList.remove("on"); old.classList.add("off"); }
      i++;
      if (i >= cards.length) return finish();
      cur = cards[i];
      cur.classList.add("on");
      timer = setTimeout(next, steps[i] * 1000);
    }
    function finish() {
      if (over) return;
      over = true;
      clearTimeout(timer);
      document.removeEventListener("keydown", key, true);
      wrap.classList.add("gone");
      setTimeout(function () { wrap.remove(); }, 900);
      if (done) done();
    }
    function key(e) { if (e.key === "Escape" || e.key === " " || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); next(); } }
    wrap.addEventListener("pointerdown", function (e) { e.preventDefault(); next(); });
    document.addEventListener("keydown", key, true);
    setTimeout(next, 350);
    return { skip: finish };
  };

  /* ---------------- the panorama: a late-game smol city ----------------
     A small island of its own (never saved), built up the way a tribe of thinkers would leave it: the
     big thought in the middle, star domes, schools and workshops around it, rings of huts, windmills over
     the farms, a palisade, story poles and campfires, and ascended smols drifting about. */
  var SHOW_SEED = 812604, SHOW_T = 0.64;
  // built in small steps (the island, the buildings, then the smols a few at a time) so the page never
  // freezes for long: it starts under "presents" and is usually done before the title appears
  var building = null;
  TI.prepare = function (cb) {
    if (building) { if (cb) { if (building.done) cb(building.g); else building.cbs.push(cb); } return; }
    building = { done: false, g: null, cbs: cb ? [cb] : [] };
    var G = SB.Game, g = null, steps = [], si = 0;
    function own(fn) { return function () { var keep = G.current; G.current = g || keep; try { fn(); } finally { G.current = keep || g; } }; }
    steps.push(function () {
      var keep = G.current;
      g = G.create(SHOW_SEED, 256, null);
      G.current = keep;
      g.showcase = true; g.tutorial.done = true; g.podT = 1e9; g.strangerT = 1e9;
      if (g.dir) g.dir.nextT = 1e9;
    });
    steps.push(own(function () { city(g); }));
    [[6, 3], [6, 3], [5, 3], [5, 3], [4, 4]].forEach(function (p) {
      steps.push(own(function () {
        SB.quickBrains = 0.15;
        try { SB.Debug.spawnTier(p[0], p[1]).forEach(function (s) { s.asleep = false; s.chem.hunger = 0.05; s.age = Math.max(s.age, 900); }); } catch (e) { if (window.console) console.warn("[smol] showcase smols", e); }
        SB.quickBrains = 1;
      }));
    });
    steps.push(own(function () {
      var w = g.world, T = w.T;
      w.seen.fill(255); w.seenDirty = true; w.seenChunks = {};
      for (var i = 0; i < (T.N / SB.CHUNK) * (T.N / SB.CHUNK); i++) w.seenChunks[i] = 1;
      w.weather.kind = "clear"; w.weather.cloud = 0.25; w.weather.rain = 0; w.weather.next = 1e9;
      g.time = w.time = SB.DAY_LENGTH * SHOW_T;
      for (var t = 0; t < 2; t += SB.TICK) G.step(g, SB.TICK);
      g.time = w.time = SB.DAY_LENGTH * SHOW_T;
    }));
    (function run() {
      try { steps[si++](); } catch (e) { if (window.console) console.warn("[smol] showcase", e); if (!g) si = steps.length; }
      if (si < steps.length) return setTimeout(run, 30);
      building.done = true; building.g = g;
      building.cbs.forEach(function (f) { try { f(g); } catch (e) {} });
      building.cbs = [];
    })();
  };
  // the buildings of a city thinkers would leave: rings round the big thought
  function city(g) {
    var w = g.world, T = w.T, c = T.nest, placed = [];
    function ok(x, z, r) {
      if (!SB.World.walkable(w, x, z) || SB.World.depthAt(w, x, z) > 0.02) return false;
      var h0 = SB.WorldGen.heightAt(T, x, z);
      for (var a = 0; a < 6.28; a += 1.05) if (Math.abs(SB.WorldGen.heightAt(T, x + Math.cos(a) * r, z + Math.sin(a) * r) - h0) > 0.9 || SB.World.depthAt(w, x + Math.cos(a) * r, z + Math.sin(a) * r) > 0.02) return false;
      for (var i = 0; i < placed.length; i++) if (SB.dist(x, z, placed[i].x, placed[i].z) < r + placed[i].r + 0.5) return false;
      return true;
    }
    function put(kind, x, z) {
      var r = (SB.STRUCTS[kind] || { r: 1 }).r;
      if (!ok(x, z, r)) return null;
      try { var s = SB.World.addStructure(w, g, kind, x, z, { done: true }); placed.push({ x: x, z: z, r: r }); return s; } catch (e) { return null; }
    }
    function ring(rad, kinds, n, off) {
      for (var i = 0; i < n; i++) {
        var a = (off || 0) + i / n * 6.283;
        for (var tr = 0; tr < 4; tr++) if (put(kinds[i % kinds.length], c.x + Math.cos(a) * (rad + tr * 0.9), c.z + Math.sin(a) * (rad + tr * 0.9))) break;
      }
    }
    put("spire", c.x, c.z) || put("spire", c.x + 3, c.z + 2) || put("spire", c.x - 3, c.z - 2);
    ring(5.2, ["campfire", "totem"], 6, 0.3);
    ring(8.5, ["observatory", "school", "workshop", "kiln"], 8, 0.1);
    ring(12.5, ["hut"], 16, 0);
    ring(16.5, ["hut", "windmill", "hut", "totem"], 18, 0.2);
    ring(21, ["farm", "farm", "windmill", "farm"], 20, 0.05);
    ring(26, ["wall"], 44, 0);
    ring(29, ["farm", "hut", "campfire"], 12, 0.4);
  }

  /* ---------------- the title screen ---------------- */
  var ts = null, show = null, raf = 0, ang = 0, opts = {};
  TI.open = function () { return !!ts; };
  // o: { onPlay(data|null, info), onNew(settings), shareSeed }
  TI.show = function (o) {
    opts = o || {};
    if (ts) return;
    var R = SB.Render, G = SB.Game;
    document.body.classList.add("titling");
    ts = h("div", { class: "ts live" });
    ts.appendChild(h("div", { class: "ts-fade" }));
    var box = h("div", { class: "ts-box" });
    box.appendChild(h("div", { class: "ts-logo" }, [h("h1", { html: "smol<br><span>brains</span>" }), h("p", { text: "tiny minds · one island · a whole civilisation" })]));
    var pane = h("div", { class: "ts-pane" });
    box.appendChild(pane);
    ts.appendChild(box);
    ts.appendChild(h("div", { class: "ts-foot" }, [h("span", { text: "computer cooked games" }), h("span", { text: "v" + (document.documentElement.getAttribute("data-version") || window.SB_VERSION || "3.6") })]));
    root().appendChild(ts);
    TI.pane = pane;
    // the first tap anywhere on the title is also what lets the browser start the music
    var music = function () { ts && ts.removeEventListener("pointerdown", music, true); if (SB.Audio && SB.Audio.unlock) try { SB.Audio.unlock(); } catch (e) {} if (SB.Music && !(SB.Music.now && SB.Music.now())) SB.Music.play("smolbrains"); };
    ts.addEventListener("pointerdown", music, true);
    mainMenu();
    if (opts.shareSeed) createWorld({ seed: opts.shareSeed });
    // the city fades in behind the menu when it's ready, and the camera drifts slowly round it, low and wide
    TI.prepare(function (g) {
      if (!ts || !g) return;
      show = g;
      G.start(show); R.setWorld(show);
      document.body.classList.add("cityup");
      var c = show.world.T.nest, cam = R.camera;
      cam.follow = null; cam.intro = null; cam.tilt = -0.32;
      var last = performance.now();
      (function orbit(now) {
        if (!ts) return;
        var dt = Math.min(0.1, (now - last) / 1000); last = now;
        ang += dt * 0.035;
        var rr = 9 + Math.sin(ang * 0.7) * 5;
        cam.x = c.x + Math.cos(ang * 0.6) * rr; cam.z = c.z + Math.sin(ang * 0.6) * rr;
        cam.yaw = cam.tYaw = ang; cam.zoom = cam.tZoom = 20 + Math.sin(ang * 0.45) * 6;
        show.time = show.world.time = SB.DAY_LENGTH * SHOW_T; // the light stays golden
        raf = requestAnimationFrame(orbit);
      })(last);
    });
  };
  TI.hide = function () {
    if (!ts) return;
    cancelAnimationFrame(raf);
    var el = ts; ts = null;
    el.classList.add("out");
    document.body.classList.remove("titling", "cityup");
    setTimeout(function () { el.remove(); }, 700);
    if (SB.Render && SB.Render.camera) SB.Render.camera.tilt = 0;
    if (SB.Music && SB.Music.now && SB.Music.now() && SB.Music.now().id === "smolbrains") SB.Music.skip();
    show = null; building = null; // let the city go: it's rebuilt if the title opens again
  };

  function btn(label, sub, cls, fn) {
    return h("button", { class: "ts-btn " + (cls || ""), onclick: function (e) { e.stopPropagation(); sfx("click"); fn(); } }, [h("span", { class: "l", html: label }), sub ? h("span", { class: "s", html: sub }) : null]);
  }
  function setPane(kids, cls) {
    var p = TI.pane; if (!p) return;
    p.innerHTML = ""; p.className = "ts-pane " + (cls || "");
    (Array.isArray(kids) ? kids : [kids]).forEach(function (k) { if (k) p.appendChild(k); });
    var f = p.querySelector("button, input"); if (f && !("ontouchstart" in window)) try { f.focus({ preventScroll: true }); } catch (e) {}
  }
  function tierName(t) { var d = SB.TIERS[t | 0]; return d ? d.name + "s" : "blobs"; }
  function ago(ms) {
    var s = (Date.now() - ms) / 1000;
    if (!(s > 0)) return "just now";
    if (s < 90) return "just now";
    if (s < 3600) return Math.round(s / 60) + " min ago";
    if (s < 86400 * 1.5) return Math.round(s / 3600) + " h ago";
    return Math.round(s / 86400) + " days ago";
  }
  function metaLine(m) { return "day " + m.day + " · " + (m.pop ? m.pop + " smol" + (m.pop === 1 ? "" : "s") + " · " + tierName(m.tier) : "still in the pod") + " · " + ({ 256: "classic", 384: "small", 512: "big", 544: "medium", 768: "large", 1024: "extra large" }[m.n] || m.n) + " island"; }

  function mainMenu() {
    var ws = SB.Save.worlds(), last = ws[0];
    setPane([
      last ? btn("▶ continue", esc(last.name) + " · " + metaLine(last), "go big", function () { play(last.id); }) : null,
      btn("▶ play now", last ? "a fresh island, playing in seconds" : "jump straight in: a fresh island, ready in seconds", last ? "" : "go big", function () { createWorld({ quick: true }); }),
      btn("🌱 custom island", "pick the size, shape, climate, grumps…", "small", function () { createWorld({}); }),
      btn("📂 load game", ws.length ? ws.length + " island" + (ws.length === 1 ? "" : "s") + " saved" : "nothing saved yet", ws.length ? "" : "dim", function () { loadGame(); }),
      btn("⚙ settings", "text size · sound", "small", function () { settings(); })
    ], "menu");
  }

  function play(id) {
    setPane([h("div", { class: "ts-wait", text: "waking the island…" })]);
    SB.Save.stash().then(function () { return SB.Save.loadWorld(id); }).then(function (d) {
      if (!d) { setPane([h("p", { class: "ts-note", text: "that island couldn't be read. it may have been saved by a newer version, or the browser cleared it." }), btn("‹ back", null, "small", mainMenu)]); return; }
      SB.Save.adopt(d);
      if (opts.onPlay) opts.onPlay(d);
    });
  }

  /* ---------------- load game ---------------- */
  function loadGame() {
    var ws = SB.Save.worlds();
    var list = h("div", { class: "ts-worlds" });
    if (!ws.length) list.appendChild(h("p", { class: "ts-note", text: "no islands yet. start one!" }));
    ws.forEach(function (m) {
      var q = (m.quirks || []).map(function (k) { return SB.QUIRKS[k] ? SB.QUIRKS[k].icon : ""; }).join(" ");
      var row = h("div", { class: "ts-world" }, [
        h("button", { class: "ts-wplay", onclick: function () { sfx("click"); play(m.id); } }, [
          h("b", { text: m.name }), h("span", { text: metaLine(m) }), h("small", { text: "world " + SB.worldCode(m.seed) + " · played " + ago(m.savedAt) + (q ? " · " + q : "") + (m.ended ? " · 🌟 finished" : "") })
        ]),
        h("button", { class: "ts-wdel", title: "delete", "aria-label": "delete " + m.name, onclick: function (e) {
          e.stopPropagation();
          if (row.classList.contains("sure")) { SB.Save.removeWorld(m.id); sfx("sad", 0.5); loadGame(); return; }
          row.classList.add("sure"); this.textContent = "delete?"; var b = this; setTimeout(function () { if (b.isConnected) { row.classList.remove("sure"); b.textContent = "🗑"; } }, 3000);
        } }, "🗑")
      ]);
      list.appendChild(row);
    });
    var note = h("p", { class: "ts-note small", text: "" });
    SB.Save.manyOk().then(function (yes) { if (!yes) note.textContent = "this browser can only keep one island at a time: starting a new one replaces it."; });
    setPane([h("h2", { text: "load game" }), list, note, h("div", { class: "ts-row" }, [btn("‹ back", null, "small", mainMenu), btn("🌱 new island", null, "small", function () { createWorld({}); })])], "wide");
  }

  /* ---------------- create world ---------------- */
  var LABELS = {
    size: ["island size", [["small", "small", "quick to explore. best on phones"], ["normal", "medium", "lots to explore"], ["large", "large", "huge. slow to make and to play on phones"], ["huge", "extra large", "enormous. needs a fast computer: phones will struggle"]]],
    shape: ["island shape", [["surprise", "🎲 surprise", "any of the shapes below"], ["classic", "classic", "one big rolling island"], ["volcano", "volcano", "a huge cone with a crater, black ash and hot vents"], ["twin", "twin isles", "two islands joined by a sandbar"], ["crescent", "crescent bay", "a ring of land around a sheltered bay"], ["mesa", "mesas", "red table-top hills and canyons"], ["delta", "river delta", "flat wet land where rivers fan out"], ["lakes", "lake district", "green hills full of lakes"], ["fjord", "fjord coast", "deep sea inlets between cliffs"]]],
    land: ["land", [["isles", "little isles", "smaller islands, more sea"], ["island", "one island", ""], ["big", "big land", "more land, fewer beaches"]]],
    peaks: ["mountains", [["flat", "gentle", "rolling hills"], ["normal", "normal", ""], ["tall", "towering", "big peaks and deep valleys"]]],
    climate: ["climate", [["temperate", "mild", ""], ["tropical", "tropical", "warm and green: jungles, swamps"], ["frozen", "frozen", "snow and taiga: hard winters"], ["dry", "dry", "savanna and desert"]]],
    food: ["food", [["scarce", "scarce", "hungry smols, harder start"], ["normal", "normal", ""], ["plenty", "plenty", "fruit everywhere"]]],
    grumps: ["grumps", [["none", "none", "no grumps at night"], ["few", "few", ""], ["normal", "normal", ""], ["many", "lots", "hard nights"]]],
    storms: ["weather", [["calm", "calm", "few storms"], ["normal", "normal", ""], ["wild", "wild", "storms, lightning, wildfires"]]],
    story: ["storyteller", [["calm", "gentle", "fewer events, more breathing room"], ["balanced", "balanced", ""], ["wild", "wild", "events come thick and fast"]]],
    crew: ["escape pods", [["pair", "one pod", "two smols, a girl and a boy"], ["crew", "two pods", "four smols: a faster start"]]]
  };
  var ORDER = ["size", "shape", "climate", "land", "peaks", "food", "grumps", "storms", "story", "crew"];
  function islandName(r) { var w = SB.makeName ? SB.makeName(r) : "smol"; return (r() < 0.5 ? w + " island" : r() < 0.5 ? "isle of " + w : w + " cove").toLowerCase(); }
  function createWorld(pre) {
    var r = SB.rng((Math.random() * 1e9) >>> 0);
    var st = { name: islandName(r), seed: pre.seed ? SB.worldCode(pre.seed) : "", size: pre.quick && (window.innerWidth || 1000) < 700 ? "small" : "normal", shape: "surprise", land: "island", peaks: "normal", climate: "temperate", food: "normal", grumps: "normal", storms: "normal", story: "balanced", crew: "pair", quirk: "surprise" };
    var more = false;
    function rowFor(k) {
      var L = LABELS[k], cur = L[1].find(function (o) { return o[0] === st[k]; });
      return h("div", { class: "ts-opt" }, [
        h("label", { text: L[0] }),
        h("div", { class: "ts-seg" + (L[1].length > 4 ? " wrap" : "") }, L[1].map(function (o) { return h("button", { class: o[0] === st[k] ? "on" : "", onclick: function () { sfx("click", 0.6); st[k] = o[0]; draw(); } }, o[1]); })),
        h("small", { text: cur && cur[2] || "" })
      ]);
    }
    function quirkRow() {
      var qs = Object.keys(SB.QUIRKS);
      var chips = [["surprise", "🎲 surprise me"], ["none", "none"]].concat(qs.map(function (k) { return [k, SB.QUIRKS[k].icon + " " + SB.QUIRKS[k].name]; }));
      var d = SB.QUIRKS[st.quirk];
      return h("div", { class: "ts-opt quirks" }, [
        h("label", { text: "island quirk" }),
        h("div", { class: "ts-seg wrap" }, chips.map(function (o) { return h("button", { class: o[0] === st.quirk ? "on" : "", onclick: function () { sfx("click", 0.6); st.quirk = o[0]; draw(); } }, o[1]); })),
        h("small", { text: st.quirk === "surprise" ? "a random quirk you'll discover when you land (or none at all)" : st.quirk === "none" ? "a classic island" : d.desc })
      ]);
    }
    function draw() {
      var nameIn = h("input", { class: "ts-in", maxlength: "32", value: st.name, "aria-label": "world name", oninput: function () { st.name = this.value; } });
      var seedIn = h("input", { class: "ts-in mono", maxlength: "16", value: st.seed, placeholder: "random", "aria-label": "world code", oninput: function () { st.seed = this.value; } });
      var opts2 = h("div", { class: "ts-opts" }, (more ? ORDER : ORDER.slice(0, 3)).map(rowFor).concat([more ? quirkRow() : null]));
      setPane([
        h("h2", { text: "create world" }),
        h("div", { class: "ts-field" }, [h("label", { text: "world name" }), h("div", { class: "ts-inrow" }, [nameIn, h("button", { class: "ts-dice", title: "another name", onclick: function () { sfx("click"); st.name = islandName(r); draw(); } }, "🎲")])]),
        h("div", { class: "ts-field" }, [h("label", { text: "world code (seed)" }), h("div", { class: "ts-inrow" }, [seedIn, h("button", { class: "ts-dice", title: "random", onclick: function () { sfx("click"); st.seed = SB.worldCode(SB.newSeed()); draw(); } }, "🎲")]), h("small", { text: "same code + same settings = the same island. leave it empty for a surprise." })]),
        opts2,
        h("button", { class: "ts-more", onclick: function () { more = !more; draw(); } }, more ? "▴ fewer options" : "▾ more world options (land, food, grumps, weather, storyteller, quirks…)"),
        h("div", { class: "ts-row" }, [btn("‹ back", null, "small", mainMenu), btn("🌱 create world", null, "go", go)])
      ], "wide");
    }
    function go() {
      SB.Game.quickStart = !!pre.quick; // play now: no opening film, straight to the pod (the menu can show the film)
      var seed = st.seed && SB.parseWorldCode(st.seed) || SB.newSeed();
      var q = st.quirk === "surprise" ? (Math.random() < 0.75 ? [SB.pick ? SB.pick(Object.keys(SB.QUIRKS)) : Object.keys(SB.QUIRKS)[(Math.random() * Object.keys(SB.QUIRKS).length) | 0]] : []) : st.quirk === "none" ? [] : [st.quirk];
      var world = { gv: SB.WORLD_GV, arch: st.shape === "surprise" ? undefined : st.shape, size: st.size, land: st.land, peaks: st.peaks, climate: st.climate, food: st.food, grumps: st.grumps, storms: st.storms, crew: st.crew, quirks: q, surprise: st.quirk === "surprise" };
      var name = (st.name || "").trim().slice(0, 32) || islandName(r);
      setPane([h("div", { class: "ts-wait", html: "growing <b>" + esc(name) + "</b>…<br><small>raising mountains, digging rivers</small>" })]);
      SB.Save.stash().then(function (kept) {
        if (!kept && SB.Save.load()) {
          return SB.Save.manyOk().then(function (many) {
            if (many || window.confirm("this browser can only keep one island. starting a new one replaces the island you have. go ahead?")) return true;
            if (pre.quick) mainMenu(); else createWorld(pre); return false;
          });
        }
        return true;
      }).then(function (yes) {
        if (!yes) return;
        setTimeout(function () { if (opts.onNew) opts.onNew({ seed: seed, n: SB.WORLD_CHOICES.size[st.size] || SB.WORLD_N_NEW, world: world, story: st.story, name: name }); }, 60);
      });
    }
    if (pre.quick) go(); else draw();
  }

  /* ---------------- settings ---------------- */
  function settings() {
    var cur = TI.uiScale();
    var sizes = [["auto", "auto"], ["1", "normal"], ["1.2", "big"], ["1.4", "bigger"], ["1.65", "huge"]];
    var vol = SB.Music && SB.Music.volume ? SB.Music.volume() : 0.8;
    setPane([
      h("h2", { text: "settings" }),
      h("div", { class: "ts-opt" }, [h("label", { text: "text & menu size" }), h("div", { class: "ts-seg" }, sizes.map(function (o) { return h("button", { class: o[0] === cur ? "on" : "", onclick: function () { TI.setUiScale(o[0]); settings(); } }, o[1]); })), h("small", { text: "auto makes everything bigger on big screens. you can also change this in the game's settings." })]),
      h("div", { class: "ts-opt" }, [h("label", { text: "music" }), h("div", { class: "ts-seg" }, [["0", "off"], ["0.4", "quiet"], ["0.8", "normal"], ["1", "loud"]].map(function (o) { return h("button", { class: Math.abs(+o[0] - vol) < 0.05 ? "on" : "", onclick: function () { if (SB.Music) SB.Music.setVolume(+o[0]); if (+o[0] > 0 && SB.Music && !(SB.Music.now && SB.Music.now())) SB.Music.play("smolbrains"); settings(); } }, o[1]); }))]),
      h("div", { class: "ts-row" }, [btn("‹ back", null, "small", mainMenu)])
    ], "wide");
  }

  /* ---------------- UI size ----------------
     Every menu, card and button lives in #ui, which is zoomed as one. "auto" grows it on big screens
     (a desktop browser window gets the game's text at a comfortable reading size). */
  var UIZ = "smolbrains-uiscale";
  TI.uiScale = function () { try { return window.localStorage.getItem(UIZ) || "auto"; } catch (e) { return "auto"; } };
  TI.setUiScale = function (v) { try { window.localStorage.setItem(UIZ, v); } catch (e) {} TI.applyUiScale(); };
  TI.zoomFor = function (v, w, hh) {
    if (v !== "auto") return Math.max(0.8, Math.min(2, +v || 1));
    var s = Math.min(w / 1000, hh / 640);
    return s >= 1.6 ? 1.45 : s >= 1.25 ? 1.3 : s >= 1 ? 1.15 : 1;
  };
  TI.applyUiScale = function () {
    var z = TI.zoomFor(TI.uiScale(), window.innerWidth || 800, window.innerHeight || 600);
    document.documentElement.style.setProperty("--uiz", String(z));
    TI.zoom = z;
    return z;
  };
  if (typeof window !== "undefined" && window.addEventListener && typeof document !== "undefined" && document.documentElement) {
    TI.applyUiScale();
    window.addEventListener("resize", function () { TI.applyUiScale(); });
  }
})();
