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
    root = document.getElementById("ui");
    clear(root);
    buildHud(); buildToasts(); buildDock();
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
    game = g; SB.Input.setGame(g);
    closeSheet(); state.inspect = null;
    if (el.goals) el.goals.innerHTML = "";
  };

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
    else { i = (i + d + SB.SPEEDS.length) % SB.SPEEDS.length; if (i === 0 && d > 0) i = 1; game.speed = SB.SPEEDS[i]; }
    hudT = 0;
  }

  /* ---------------- goals ---------------- */
  function goalsList() {
    var g = game, out = [], A = g.achievements, smols = SB.Game.smols(g);
    function add(t, p, done) { out.push({ t: t, p: p, done: done }); }
    if (!A.hatch) add("tap the glowing egg to warm it 🥚", "");
    else if (!A.word1) add("teach a first word: 💬 talk tool, then tap an apple", "");
    if (A.hatch && !A.tickle) add("tickle a smol when it does something good 🪶", "");
    if (A.hatch && !A.egg) {
      var adults = smols.filter(function (c) { return c.stage >= 3; }).length;
      var young = smols.filter(function (c) { return c.stage < 3; }).sort(function (a, b) { return b.age - a.age; })[0];
      add("two grown-up smols make an egg 💕", adults >= 2 ? "in love soon" : young ? "grows up in " + fmtTime(SB.STAGES[3].from - young.age) : adults + "/2 adults");
    }
    var maxT = g.stats.maxTier || 0;
    if (maxT < 6 && A.hatch) {
      var best = null, bp = -1;
      smols.forEach(function (c) { if (c.tier === maxT) { var p = tierProgress(c); if (p > bp) { bp = p; best = c; } } });
      var nx = SB.TIERS[maxT + 1];
      var hint = best ? SB.Genome.nextNeeds(best.genome).map(function (n) { return n.label; }).slice(0, 2).join(" + ") : "";
      add("evolve into " + nx.icon + " " + nx.name + (hint ? " (needs more " + hint + ")" : ""), Math.round(Math.max(0, bp) * 100) + "%");
    }
    var found = Object.keys(g.culture.found).length;
    if (maxT >= 2 && found < 3) add("a tool-user discovers an idea 💡 (try 💡 inspire)", found + "/3");
    if (maxT >= 4 && !A.built) add("builders finish a building 🛖", "");
    if (A.built && !A.village) add("3 huts around a campfire make a village 🏘", "");
    if (maxT >= 6 && !A.bigthought) add("build the big thought ✨", "");
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
  function toast(html, cls, ms) {
    var t = h("div", { class: "toast glass " + (cls || ""), html: html });
    el.toasts.appendChild(t);
    while (el.toasts.children.length > 4) el.toasts.removeChild(el.toasts.firstChild);
    setTimeout(function () { t.classList.add("out"); setTimeout(function () { t.remove(); }, 600); }, ms || 4200);
  }
  UI.toast = toast;
  var momentQ = [], momentBusy = false;
  function moment(icon, big, sub, cls) {
    momentQ.push([icon, big, sub, cls]);
    if (!momentBusy) nextMoment();
  }
  function nextMoment() {
    var m = momentQ.shift();
    if (!m) { momentBusy = false; return; }
    momentBusy = true;
    var d = h("div", { class: "moment " + (m[3] || "") }, [h("div", { class: "icon" }, m[0]), h("div", { class: "big" }, m[1]), m[2] ? h("div", { class: "sub" }, m[2]) : null]);
    root.appendChild(d);
    setTimeout(function () { d.remove(); nextMoment(); }, 3300);
  }
  UI.moment = moment;

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
    if (t === "talk") openSheet("talk");
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
    el.sheet.appendChild(el.cDrives = h("div", { class: "drives" }));
    el.sheet.appendChild(h("div", { class: "sec" }, [h("span", null, "ideas"), el.cIdeaN = h("span", { class: "dim" })]));
    el.sheet.appendChild(el.cIdeas = h("div", { class: "chips" }));
    el.sheet.appendChild(h("div", { class: "sec" }, [h("span", null, "words"), el.cWordN = h("span", { class: "dim" })]));
    el.sheet.appendChild(el.cWords = h("div", { class: "chips" }));
    el.sheet.appendChild(el.cMore = h("div", { class: cardMore ? "" : "hide" }));
    el.sheet.appendChild(h("div", { class: "btnrow" }, [
      h("button", { class: "btn", onclick: function () { cardMore = !cardMore; el.cMore.classList.toggle("hide", !cardMore); this.textContent = cardMore ? "less ▴" : "genes & more ▾"; } }, cardMore ? "less ▴" : "genes & more ▾"),
      h("button", { class: "btn", onclick: function () { setTool("talk", true); UI.talkTo(c); } }, "💬 talk"),
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
    el.cName.textContent = c.name;
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

  /* ---- talk ---- */
  var BASIC = ["good", "bad", "come", "eat", "play", "food", "hug", "sleep", "wait", "run", "explore", "get", "drop", "talk"];
  function renderTalk(force) {
    if (!force && el.sheet.dataset.kind === "talk") return updateTalk();
    el.sheet.dataset.kind = "talk"; el.sheet.dataset.id = "";
    clear(el.sheet);
    el.talkInput = h("input", { type: "text", placeholder: "say a word (food, come, good…)", maxlength: 40, autocomplete: "off", autocapitalize: "off", spellcheck: "false", onkeydown: function (e) { if (e.key === "Enter") { say(el.talkInput.value); el.talkInput.value = ""; } e.stopPropagation(); } });
    el.sheet.appendChild(h("div", { class: "talk" }, [
      h("div", { class: "say" }, [el.talkInput, h("button", { class: "btn go", onclick: function () { say(el.talkInput.value); el.talkInput.value = ""; } }, "say")]),
      el.talkWords = h("div", { class: "words" }),
      el.talkInfo = h("div", { class: "note" })
    ]));
    updateTalk(true);
  }
  function updateTalk(force) {
    var c = state.talkTarget && state.talkTarget.alive ? state.talkTarget : SB.Game.byId(game, game.selectedId);
    var key = (c ? c.id : "") + ":" + Object.keys(game.culture.words).length;
    if (!force && key === el.talkWords.dataset.key) return;
    el.talkWords.dataset.key = key;
    var words = [];
    if (c && c.name) words.push(c.name.toLowerCase());
    BASIC.forEach(function (w) { words.push(w); });
    for (var id in game.culture.words) words.push(game.culture.words[id]);
    SB.DRIVE_WORDS.forEach(function (w) { words.push(w); });
    SB.NOUN_WORDS.forEach(function (w) { if (words.indexOf(w) < 0) words.push(w); });
    clear(el.talkWords);
    words.slice(0, 60).forEach(function (w) {
      var lex = SB.LEXICON[w];
      el.talkWords.appendChild(h("button", { class: "chip" + (w === "good" ? " lime" : w === "bad" ? " lilac" : lex && lex.type === "idea" ? " lime" : ""), onclick: function () { say(w); } }, w));
    });
    el.talkInfo.innerHTML = c ? "talking to <b class='lilac'>" + esc(c.name) + "</b> and anyone nearby. tap a thing to say its name." : "tap a smol to talk to it, or tap a thing to say its name. smols nearby listen.";
  }
  function listeners(x, z, r) {
    var out = [];
    game.creatures.forEach(function (c) { if (c.alive && SB.dist(c.x, c.z, x, z) < r) out.push(c); });
    return out;
  }
  function say(raw) {
    var word = String(raw || "").toLowerCase().trim().replace(/[^a-zü' ]/g, "");
    if (!word) return;
    var c = state.talkTarget && state.talkTarget.alive ? state.talkTarget : SB.Game.byId(game, game.selectedId);
    var cx = c ? c.x : R.camera.x, cz = c ? c.z : R.camera.z;
    var hd = game.hand;
    hd.x = cx; hd.z = cz; hd.y = SB.World.groundY(game.world, cx, cz) + 1.6; hd.visible = true;
    hd.saying = word; hd.sayT = 2.4;
    listeners(cx, cz, 9).forEach(function (o) { SB.Creature.hear(o, word, game, {}); });
    if (SB.Audio) SB.Audio.voice(word, 0.35);
    if (state.tutStep === 4) tutAdvance();
  }
  UI.say = say;
  UI.talkTo = function (c) { state.talkTarget = c; if (state.sheet === "talk") updateTalk(true); };
  UI.sayAbout = function (hit) {
    var ref = hit.ref, noun = ref.noun || (hit.type === "node" ? SB.NODES[ref.kind].noun : null);
    if (!noun || SB.N[noun] == null) return;
    var word = SB.NOUN_WORDS[SB.N[noun]];
    var x = ref.x, z = ref.z, hd = game.hand;
    hd.x = x; hd.z = z; hd.y = SB.World.groundY(game.world, x, z) + 1.0; hd.visible = true; hd.saying = word; hd.sayT = 2.4;
    var about = { type: hit.type === "struct" ? "struct" : hit.type, id: ref.id, x: x, z: z };
    listeners(x, z, 12).forEach(function (o) { SB.Creature.hear(o, word, game, { about: about, aboutNoun: noun }); });
    if (SB.Audio) SB.Audio.voice(word, 0.35);
    if (state.tutStep === 4) tutAdvance();
  };

  /* ---- miracles ---- */
  var MIRACLES = [
    { id: "bounty", e: "🍎", name: "bounty", cost: 5, desc: "food falls from the sky", answers: { hunger: 1 } },
    { id: "heal", e: "💚", name: "heal", cost: 6, desc: "cure sickness and pain nearby", answers: { sick: 1, pain: 1 } },
    { id: "rain", e: "🌧", name: "rain", cost: 6, desc: "plants grow faster, fires go out", answers: { hot: 1 } },
    { id: "sun", e: "☀️", name: "sunshine", cost: 4, desc: "clear the sky, warm things up", answers: { cold: 1, sleepy: 0 } },
    { id: "bolt", e: "⚡", name: "lightning", cost: 10, desc: "strike a tree. fire! (smart smols learn from it)", answers: { cold: 1 } },
    { id: "inspire", e: "💡", name: "inspire", cost: 8, desc: "smols nearby get ideas 3× faster for a minute", answers: { bored: 1 } },
    { id: "bless", e: "🧬", name: "bless eggs", cost: 15, desc: "the next eggs evolve in a direction you pick", answers: {} },
    { id: "gift", e: "🎁", name: "gift", cost: 3, desc: "a toy, or a starter kit for tool-users", answers: { bored: 1, lonely: 1 } }
  ];
  function renderMagic(force) {
    if (!force && el.sheet.dataset.kind === "magic") return updateMagic();
    el.sheet.dataset.kind = "magic"; el.sheet.dataset.id = "";
    clear(el.sheet);
    el.sheet.appendChild(h("div", { class: "row" }, [h("div", { class: "nm", style: "font-size:14px" }, "miracles"), h("span", { class: "sp" }), el.magicSparks = h("span", { class: "mono lime" })]));
    el.mirGrid = h("div", { class: "miracles" });
    MIRACLES.forEach(function (m) {
      m.btn = h("button", { class: "mir", title: m.desc, onclick: function () { arm(m); } }, [h("span", { class: "e" }, m.e), h("span", null, m.name), h("span", { class: "c" }, "✨" + m.cost)]);
      el.mirGrid.appendChild(m.btn);
    });
    el.sheet.appendChild(el.mirGrid);
    el.sheet.appendChild(el.magicInfo = h("div", { class: "note" }, "earn sparks when smols learn, discover, hatch, pray and get answered. pick a miracle, then tap the world."));
    updateMagic();
  }
  function updateMagic() {
    if (!el.magicSparks) return;
    el.magicSparks.textContent = "✨ " + Math.floor(game.sparks || 0);
    MIRACLES.forEach(function (m) { m.btn.classList.toggle("poor", (game.sparks || 0) < m.cost); m.btn.classList.toggle("on", UI.armed === m); });
  }
  function arm(m) {
    if ((game.sparks || 0) < m.cost) { toast("not enough sparks ✨ (" + m.cost + " needed)"); return; }
    if (m.id === "rain" || m.id === "sun" || m.id === "bless") { cast(m, R.camera.x, R.camera.z); return; }
    UI.armed = UI.armed === m ? null : m;
    el.magicInfo.textContent = UI.armed ? m.e + " " + m.desc + ". tap where." : "pick a miracle, then tap the world.";
    updateMagic();
  }
  function disarm() { UI.armed = null; if (el.magicInfo) updateMagic(); }
  UI.castAt = function (x, z) { var m = UI.armed; if (!m) return; cast(m, x, z); };
  function cast(m, x, z) {
    if (m.id === "bless") { blessChooser(m); return; }
    if (!SB.Game.spend(game, m.cost)) { toast("not enough sparks ✨"); return; }
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
      if (SB.dist(c.x, c.z, x, z) < 7 && (m.answers[p.need] || m.id === "heal" && p.need === "nothing")) SB.Creature.prayerAnswered(c, game);
    });
    UI.armed = null;
    updateMagic();
    if (el.magicInfo) el.magicInfo.textContent = m.e + " done. pick another or close.";
  }
  var BLESS = [
    { e: "🦵", name: "legs", genes: { limbs: 0.12, senses: 0.06 } },
    { e: "🤲", name: "hands", genes: { arms: 0.12, dexterity: 0.08 } },
    { e: "🧠", name: "bigger brains", genes: { cortex: 0.1, layers: 0.08, recall: 0.06 } },
    { e: "🗣", name: "language", genes: { social: 0.12 } },
    { e: "📐", name: "planning", genes: { planning: 0.12, layers: 0.06 } },
    { e: "👁", name: "big heads", genes: { head: 0.12, recall: 0.06 } },
    { e: "🐟", name: "fins", genes: { fins: 0.15 } },
    { e: "🧶", name: "fluff", genes: { fluff: 0.15 } },
    { e: "✨", name: "inner glow", genes: { glow: 0.12, wings: 0.08 } }
  ];
  function blessChooser(m) {
    var body = h("div", null, [h("p", { class: "note" }, "the next 3 eggs lean this way. evolution still decides the rest.")]);
    var grid = h("div", { class: "grid2" });
    BLESS.forEach(function (b) {
      grid.appendChild(h("button", { class: "card", style: "text-align:left", onclick: function () {
        if (!SB.Game.spend(game, m.cost)) { toast("not enough sparks ✨"); return; }
        game.blessing = { name: b.name, genes: b.genes, uses: 3 };
        game.stats.miracles = (game.stats.miracles || 0) + 1;
        SB.Game.unlock(game, "miracle");
        SB.bus.emit("miracle", { id: "bless" });
        closeModal(); toast("🧬 blessed: the next 3 eggs lean toward " + b.name);
      } }, [h("div", { class: "big" }, b.e), h("h4", null, b.name)]));
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
    }
    el.sheet.appendChild(h("div", { class: "row" }, [h("div", { class: "av", style: "background:#22242b" }, emoji), h("div", { style: "flex:1;min-width:0" }, [h("div", { class: "nm" }, label), h("div", { class: "sub2" }, desc)]), h("button", { class: "ibtn", onclick: function () { UI.inspect(null); } }, "✕")]));
    if (extra) el.sheet.appendChild(h("div", { class: "thought" }, extra));
    var word = SB.NOUN_WORDS[SB.N[ref.noun]];
    if (word) el.sheet.appendChild(h("div", { class: "note" }, "smols call this “" + word + "”. tap it with 💬 talk to teach them."));
  }

  /* ---------------- modals ---------------- */
  function modal(title, body, opts) {
    closeModal();
    opts = opts || {};
    UI.modalOpen = !opts.live;
    var wrap = h("div", { class: "modal-wrap", onclick: function (e) { if (e.target === wrap && !opts.sticky) closeModal(); } });
    var m = h("div", { class: "modal glass" }, [
      h("div", { class: "mh" }, [h("h2", null, title), opts.sticky ? null : h("button", { class: "ibtn", "aria-label": "close", onclick: closeModal }, "✕")]),
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
  }
  UI.closeModal = closeModal;

  /* ---------------- menu / smolpedia ---------------- */
  var TABS = [["evolution", "🧬 evolution"], ["ideas", "💡 ideas"], ["smols", "🐣 smols"], ["family", "🌳 family"], ["goals", "🏆 goals"], ["world", "🏝 world"], ["settings", "⚙️ settings"], ["help", "❓ help"]];
  function openMenu(tab, arg) {
    state.menuTab = tab || "evolution";
    var tabs = h("div", { class: "tabs" });
    TABS.forEach(function (t) { tabs.appendChild(h("button", { class: "tab" + (t[0] === state.menuTab ? " on" : ""), onclick: function () { openMenu(t[0]); } }, t[1])); });
    var body = h("div");
    modal("smolpedia", body, { tabs: tabs });
    ({ evolution: tabEvolution, ideas: tabIdeas, smols: tabSmols, family: tabFamily, goals: tabGoals, world: tabWorld, settings: tabSettings, help: tabHelp })[state.menuTab](body, arg);
  }
  UI.openMenu = openMenu;

  function tabEvolution(body) {
    var maxT = game.stats.maxTier || 0;
    var ladder = h("div", { class: "grid2" });
    SB.TIERS.forEach(function (t, i) {
      var got = i <= maxT;
      var need = SB.Genome.TIER_NEEDS[i];
      var needTxt = need ? Object.keys(need).map(function (k) { return k === "neurons" ? need[k] + " neurons" : k === "layers" ? need[k] + " brain layers" : (SB.Genome.GENE_LABELS[k] || k) + " " + need[k]; }).join(", ") : "where it starts";
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
      ctx.fillText(t.icon, p.x, p.y + 1);
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
      h("button", { class: "btn", onclick: function () { var q = R.quality; q.scale = q.scale >= 1 ? 0.6 : 1; R.resize(); openMenu("settings"); } }, R.quality.scale >= 1 ? "🖥 sharp" : "🔋 battery saver"),
      h("button", { class: "btn", onclick: function () { R.quality.decor = !R.quality.decor; openMenu("settings"); } }, R.quality.decor ? "🌼 grass & flowers on" : "🌼 grass off")
    ]));
    body.appendChild(h("div", { class: "sec" }, "save"));
    body.appendChild(h("p", { class: "note" }, "the game saves itself every 20 seconds and when you leave. while you're away, the island keeps going for a while."));
    body.appendChild(h("div", { class: "btnrow" }, [h("button", { class: "btn", onclick: function () { SB.Save.save(game); toast("saved 💾"); } }, "save now"), h("button", { class: "btn warn", onclick: function () { UI.confirmRestart(); } }, "new world")]));
    if (SB.Save.loadV1()) body.appendChild(h("p", { class: "note" }, "your old valley save (v1) is still kept safe on this device."));
  }

  function tabHelp(body) {
    body.innerHTML = "<p><b class='lime'>smol brains</b> is an island of tiny creatures with real neural-network brains. you don't control them. you raise them.</p>" +
      "<p>✋ <b>grab</b>: tap a smol to see inside it, drag smols and things around, throw them (gently). drag empty ground to move the camera.<br>🪶 <b>tickle</b>: a reward. tap or rub a smol right after it does something good.<br>👆 <b>tap</b>: a scolding. it stops and learns not to.<br>💬 <b>talk</b>: tap a thing to say its name, or type words. they learn them, and eventually talk back.<br>✨ <b>magic</b>: spend sparks on miracles. sparks come from smols learning, discovering, hatching and praying.</p>" +
      "<p><b class='lilac'>evolution</b>: genes mutate when eggs are made. and what parents practise echoes into their babies: smols that walk a lot have kids with longer legs, smols that fiddle with things have kids with hands, smols that learn have kids with bigger brains. climb the ladder: blob → critter → tool-user → tribe → builder → thinker → ascended.</p>" +
      "<p><b class='lilac'>ideas</b>: tool-users discover crafts (poke sticks, fire, spears…), tribes teach each other and pray to you, builders make huts, farms and villages, thinkers write ideas on story poles so nothing is forgotten.</p>" +
      "<p>camera: drag to pan, pinch or wheel to zoom, twist with two fingers (or right-drag, or q/e) to rotate. keys: wasd pan, 1-5 tools, space pause, [ ] speed, f follow, b brain, esc close.</p>";
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
    var T = game.world.T, nest = T.nest;
    state.introRunning = true;
    var title = h("div", { class: "title" }, [h("h1", { html: "smol<br><span>brains</span>" }), h("p", null, "an island of tiny minds. one egg.")]);
    root.appendChild(title);
    el.hud.classList.add("hide"); el.tools.classList.add("hide");
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
    { t: "tap the glowing egg", s: "it's cold out here. warm it up. (tap it a few times)" },
    { t: "it hatched!", s: "" },
    { t: "it's hungry", s: "smols find food themselves, but you can help: ✋ drag the apple next to it." },
    { t: "tickle it when it's good", s: "🪶 tickle tool, then tap the smol while it eats. rewards teach its brain." },
    { t: "teach it a word", s: "💬 talk tool, then tap the apple (or anything). say it a few times and it'll say it back." },
    { t: "peek inside its head", s: "tap the smol, then 🧠. that's a real neural network. it changes as it learns." },
    { t: "now: raise a civilisation", s: "smols grow up, fall in love and lay eggs. what parents practise echoes in their kids. evolve legs, hands, language, cities. goals are top left. ✨ magic helps." }
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

  function namePrompt(c) {
    var inp = h("input", { type: "text", value: c.name, maxlength: 16, autocapitalize: "words", onkeydown: function (e) { if (e.key === "Enter") ok(); e.stopPropagation(); } });
    function ok() {
      var n = inp.value.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 16);
      if (n) c.name = n;
      if (game.family[c.id]) game.family[c.id].name = c.name;
      SB.Game.unlock(game, "name");
      closeModal();
      SB.Game.select(game, c.id);
      SB.Input.follow(c);
      tutAdvance(2);
    }
    var body = h("div", null, [h("p", null, "it's a smol! a blob, for now. what's it called?"), h("div", { class: "namebox" }, [inp, h("button", { class: "btn go", onclick: ok }, "name it"), h("button", { class: "btn", title: "random name", onclick: function () { inp.value = SB.makeName(SB.rng(Date.now() >>> 0)); } }, "🎲")])]);
    modal("🐣 hello, world", body, { sticky: true });
    setTimeout(function () { try { inp.focus(); inp.select(); } catch (e) { } }, 50);
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
      ctx.drawImage(img, (tw - iw) / 2, (th - ih) / 2, iw, ih); ctx.restore();
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
        ctx.font = "44px system-ui, apple color emoji"; ctx.fillText(r[0], x + 22, y + 66);
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
      if (d.obj && d.obj.data && d.obj.data.starter) { game.tutorial.step = 1; tutShow(); setTimeout(function () { namePrompt(d.c); }, 700); }
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
      if (d.first) moment(SB.Ideas.BY_ID[d.id].icon, SB.Ideas.BY_ID[d.id].name + "!", d.c.name + " figured it out. they call it “" + d.word + "”");
    });
    on("tierUp", function (d) {
      var t = SB.TIERS[d.tier];
      moment(t.icon, "evolution: " + t.name, d.c.name + " is the first " + t.name + ". " + t.desc, "lilac");
      if (SB.FX) SB.FX.burst("gold", d.c.x, d.c.y + 0.6, d.c.z, 30);
      R.flyTo(d.c.x, d.c.z, 6, 1.2);
    });
    on("newSpecies", function (d) { if (d.c.tier === (game.stats.maxTier || 0) && d.clade.why === "tier") return; toast("🧬 new species: <b>" + esc(d.clade.name) + "</b>", "ach"); });
    on("village", function (d) { moment("🏘", d.village.name, "a village is born"); });
    on("tribe", function (d) { moment("🔥", d.tribe.name, "your smols have a name for themselves now", "lilac"); });
    on("ideaLost", function (d) { toast("🕯 <b>" + esc(SB.Ideas.BY_ID[d.id].name) + "</b> is lost. nobody alive remembers it."); });
    on("pray", function (d) { if (!d.c.far) toast("🙏 " + esc(d.c.name) + " prays" + (d.need !== "nothing" ? " (" + SB.DRIVE_EMOJI[SB.D[d.need]] + " " + d.need + ")" : "") + ". answer with ✨ magic, food or a tickle."); });
    on("prayerAnswered", function (d) { if (SB.FX) SB.FX.burst("magic", d.c.x, d.c.y + 1, d.c.z, 14); });
    on("select", function (d) { if (d.c) { state.talkTarget = d.c; if (state.tool === "talk") updateTalk(true); else openSheet("smol"); } else if (state.sheet === "smol") closeSheet(); });
    on("wildEgg", function (d) { R.flyTo(d.obj.x, d.obj.z, 7, 1.4); });
    on("bigThought", function () { moment("🌟", "the big thought", "every smol mind on the island, thinking one thought. it's beautiful. it's about snacks.", "lilac"); });
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
    if (k === "t") { setTool("talk", true); setTimeout(function () { if (el.talkInput) el.talkInput.focus(); }, 30); e.preventDefault(); return true; }
    if (k === "b") { var c = SB.Game.byId(game, game.selectedId); if (c && c.type === "creature") openBrain(c); return true; }
    if (k === "f") { var c2 = SB.Game.byId(game, game.selectedId); if (c2) SB.Input.follow(R.camera.follow ? null : c2); return true; }
    if (k === "m") { openMenu(state.menuTab); return true; }
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
