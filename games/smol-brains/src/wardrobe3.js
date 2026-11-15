/* smol brains — wardrobe3.js (4.36): looks. wear.js says what a smol has on and voxel.js / pixel.js / bodies.js draw
   it; this file is everything a player does about it, on the "looks" page of the wear tab:
     show or hide a worn piece (its effect stays) · vanity hats, found and earned (the hat mouse leaves one for
     achievements, wrecks and pods hide one, a captain's crown and the lantern set come from feats) · dye any worn
     piece with a dye, a flower, berries or clay · a trim learned at old sites · cloak looks from small feats ·
     headband and belt colours · body paint earned for deeds · a 5 by 5 mark you paint, kept as banners · drag the
     picture to sculpt the body's genes · near you: a skin for a hut, a look for a scarecrow, a clothes stand that
     swaps a whole outfit, your mark on a banner, a hat for a pet · set down a clothes stand or glow lichen.
   And what happens by itself: smols get rounder when fed and idle and leaner when busy; finned smols want water,
   ascended ones crystal light, leafy ones sun and water; builders paint murals on huts; graves glow in the colour
   of how their smol died; the fishing float changes with your catch count.
   State: game.quests.wardrobe3 = { hats, cloaks, sites, finds, banners, fish, made, dyed, bob, mural }, and plain
   fields on a smol: wd (see wear.js), fit, leafy, dry, dim. Rolls its own dice. */
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var X = SB.Wardrobe = {};
  var K = SB.KINDS, SK = SB.STRUCTS, PI2 = 1.5708;
  function W() { return SB.Wear; } function Sv() { return SB.Surv; } function H() { return SB.Harvest; }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&#39;"); }
  function day(game) { return Math.floor((game.time || 0) / SB.DAY_LENGTH) + 1; }
  function c01(v) { return [v[0] / 255, v[1] / 255, v[2] / 255]; }
  function st(game) {
    var q = game.quests || (game.quests = {}), s = q.wardrobe3;
    if (!s || typeof s !== "object") s = q.wardrobe3 = {};
    if (!s.hats || typeof s.hats !== "object") s.hats = {};
    if (!s.cloaks || typeof s.cloaks !== "object") s.cloaks = {};
    if (!s.sites || typeof s.sites !== "object") s.sites = {};
    if (!Array.isArray(s.banners)) s.banners = [];
    return s;
  }
  X.state = st;
  function say(t) { var P = SB.Possess; try { if (P && P.active && P.say && !P.headless) P.say(t); else if (SB.UI && SB.UI.toast) SB.UI.toast(t, "", 4000); } catch (e) {} }
  function ok(m) { return { ok: true, msg: m }; } function no(m) { return { ok: false, msg: m }; }
  function me(game) { var P = SB.Possess; return P && P.active && P.c ? P.c : SB.Mine && SB.Mine.get ? SB.Mine.get(game) : null; }

  if (!SK.mannequin) SK.mannequin = { noun: "totem", label: "clothes stand", emoji: "🧍", r: 0.35, cost: { stick: 3, fiber: 1 }, work: 3, desc: "a stand that holds a whole outfit. swap yours with it in one go." };
  if (!SK.glowlichen) SK.glowlichen = { noun: "totem", label: "glow lichen", emoji: "✨", r: 0.3, cost: { glowcap: 1, stone: 1 }, work: 1, desc: "a stone grown over with glowing lichen. it lights the ground at night." };

  /* ---------------- what you own ---------------- */
  X.MOUSE = [[1, "acorn"], [3, "knit"], [6, "flower"], [10, "ears"], [15, "top"]];
  X.BOBS = [[0, "red float", [0.9, 0.25, 0.2]], [5, "lime float", [0.6, 0.95, 0.3]], [15, "gold float", [1, 0.8, 0.25]], [30, "glow float", [0.5, 0.95, 1], 1]];
  X.SKINS = ["plain", "flower boxes", "bunting", "stone foot"];
  X.CROWS = ["plain", "pumpkin head", "tall hat", "grump face", "flower crown", "golden", "crow's friend"];
  X.SCENES = ["the sun", "a campfire", "a grump chased off", "a new smol", "the star pod", "a big fish"];
  X.hats = function (game) { var s = st(game); return Object.keys(W().HATS).filter(function (k) { return s.hats[k]; }); };
  X.trims = function (game) { return Math.min(4, Math.ceil((st(game).finds || 0) / 2)); };
  X.crows = function (game) { return Math.min(6, st(game).finds || 0); };
  function hat(game, id, why, quiet) { var s = st(game); if (s.hats[id] || !W() || !W().HATS[id]) return false; s.hats[id] = 1; if (!quiet) say("🎩 " + why + ": " + W().HATS[id][0] + " (wear tab, looks)"); return true; }
  X.giveHat = hat;
  // an old site walked up to, or its chest opened: a trim every second one, a scarecrow look each time, a hat the first
  X.find = function (game, key) {
    var s = st(game);
    if (s.sites[key]) return false;
    s.sites[key] = 1; s.finds = (s.finds || 0) + 1;
    var t0 = Math.min(4, Math.ceil((s.finds - 1) / 2)), t1 = X.trims(game);
    if (s.finds === 1) hat(game, "feather", "tucked in the wreckage");
    else if (t1 > t0 && W()) say("🧵 old marks here. you learn the " + W().TRIMS[t1][0] + " trim");
    else if (s.finds <= 6) say("🧑‍🌾 a scarecrow look: " + X.CROWS[s.finds]);
    return true;
  };
  X.bump = function (game, what) {
    if (!game) return;
    var s = st(game); s[what] = (s[what] || 0) + 1;
    if (s.made >= 3 && !s.cloaks[1]) { s.cloaks[1] = 1; say("🧥 three things made: cloaks can be striped now"); }
    if (s.dyed >= 2 && !s.cloaks[3]) { s.cloaks[3] = 1; say("🧥 two pieces dyed: cloaks can be checked now"); }
  };
  X.bobber = function (game) {
    var s = st(game), n = s.fish || 0, best = 0, i;
    for (i = 0; i < X.BOBS.length; i++) if (n >= X.BOBS[i][0]) best = i;
    i = s.bob != null && s.bob <= best ? s.bob : best;
    return [X.BOBS[i][1], X.BOBS[i][2], X.BOBS[i][3], best];
  };

  /* ---------------- what a smol does about its looks ---------------- */
  var dyePlace = "body", PLACES = ["head", "body", "feet", "hat"];
  // what can dye: a dye, or a flower, berries, clay or ochre with a colour of its own
  X.dyeOf = function (k) {
    var d = H() && H().DYE && H().DYE[k], kd = K[k];
    if (d) return [d.rgb[0] * 255 | 0, d.rgb[1] * 255 | 0, d.rgb[2] * 255 | 0];
    return kd && kd.color && /flower|berry|petal|clay|ochre|bloom/.test(k) ? W().rgb(kd.color) : null;
  };
  X.sculpt = function (c, gene, d) {
    var g = c && c.genome && c.genome.genes;
    if (!g || typeof g[gene] !== "number" || !SB.Genome || !SB.Genome.look) return false;
    g[gene] = SB.clamp(g[gene] + d, 0, 0.999);
    c.look = SB.Genome.look(c.genome); c._cols = null;
    if (W()) W().fresh(c);
    return true;
  };
  function near(game, c) {
    var best = null, bd = 3.6, P = SB.Animals;
    (game.world.structures || []).forEach(function (b) {
      var d = SB.dist(c.x, c.z, b.x, b.z);
      if (b.done && d < bd && (b.kind === "hut" || b.kind === "house" || b.kind === "scarecrow" || b.kind === "mannequin" || b.kind === "banner")) { bd = d; best = b; }
    });
    var pet = null, pd = 3;
    if (P && P.byItem) (game.world.items || []).forEach(function (o) { var d = SB.dist(c.x, c.z, o.x, o.z); if (d < pd && o.data && o.data.an != null && P.byItem(game, o)) { pd = d; pet = o; } });
    return { b: best, pet: pet };
  }
  X.near = near;
  function outfit(c) { return W().on(c).filter(function (e) { return e.place !== "bound"; }); }
  X.act = function (game, c, verb, arg) {
    var Wr = W(), s = st(game), d = Wr.wd(c), n, r;
    Wr.fresh(c);
    if (verb === "hide") { d.hide = d.hide || {}; if (d.hide[arg]) delete d.hide[arg]; else d.hide[arg] = 1; return ok(d.hide[arg] ? "hidden. it still works" : "shown"); }
    if (verb === "hat") {
      if (!arg || d.hat === arg) { delete d.hat; return ok("hat off"); }
      if (!s.hats[arg] || !Wr.HATS[arg]) return no("you haven't found that hat");
      d.hat = arg; return ok("🎩 " + Wr.HATS[arg][0] + " on");
    }
    if (verb === "dyeplace") { dyePlace = PLACES[(PLACES.indexOf(dyePlace) + 1) % PLACES.length]; return ok(""); }
    if (verb === "dye") {
      var col = X.dyeOf(arg);
      if (!col) return no("that won't dye");
      if (!Sv().take(c, arg, 1).length) return no("you have none");
      d.dye = d.dye || {}; d.dye[dyePlace] = col; X.bump(game, "dyed");
      return ok("🎨 dyed with " + (K[arg] ? K[arg].label : arg));
    }
    if (verb === "wash") { if (d.dye) delete d.dye[dyePlace]; return ok("washed out"); }
    if (verb === "band" || verb === "belt") { n = d[verb]; n = n == null ? 0 : n < 0 ? null : n + 1 >= Wr.BANDS.length ? -1 : n + 1; if (n == null) delete d[verb]; else d[verb] = n; return ok(""); }
    if (verb === "trim") { n = arg | 0; if (n > X.trims(game)) return no("not learned yet"); if (n) d.trim = n; else delete d.trim; return ok(""); }
    if (verb === "cloak") { n = arg | 0; if (n && !s.cloaks[n]) return no("not earned yet"); if (n) d.cl = n; else delete d.cl; return ok(""); }
    if (verb === "paint") { n = arg | 0; if (n && !(d.paints && d.paints[n])) return no("not earned yet"); if (n) d.paint = n; else delete d.paint; return ok(""); }
    if (verb === "bit") { d.mark = (d.mark | 0) ^ (1 << (arg | 0)); if (!d.mark) delete d.mark; return ok(""); }
    if (verb === "ban") {
      if (arg === "save") { if (!d.mark) return no("paint a mark first"); if (s.banners.indexOf(d.mark) < 0) { s.banners.push(d.mark); if (s.banners.length > 6) s.banners.shift(); } return ok("🚩 kept with your banners"); }
      n = s.banners[arg | 0]; if (!n) return no("no such banner"); d.mark = n; return ok("🚩 your mark");
    }
    if (verb === "bob") { s.bob = ((s.bob == null ? X.bobber(game)[3] : s.bob) + 1) % (X.bobber(game)[3] + 1); return ok(""); }
    if (verb === "ears" || verb === "tail") {
      var g = c.genome && c.genome.genes, N = verb === "ears" ? 5 : 4;
      if (!g || typeof g[verb] !== "number") return no("");
      g[verb] = ((Math.floor(g[verb] * N) + 1) % N + 0.5) / N;
      X.sculpt(c, verb, 0);
      return ok("");
    }
    if (verb === "set") {
      var def = SK[arg], k;
      if (!def || (arg !== "mannequin" && arg !== "glowlichen")) return no("");
      for (k in def.cost) if (Sv().count(c, k, true) < def.cost[k]) return no("it takes " + Object.keys(def.cost).map(function (x) { return def.cost[x] + " " + (K[x] ? K[x].label : x); }).join(", "));
      for (k in def.cost) Sv().take(c, k, def.cost[k]);
      SB.World.addStructure(game.world, game, arg, c.x + Math.sin(c.facing || 0) * 0.9, c.z + Math.cos(c.facing || 0) * 0.9, { done: true, rot: (c.facing || 0) + Math.PI });
      return ok(def.emoji + " a " + def.label + ", set down");
    }
    var nr = near(game, c), b = nr.b;
    if (verb === "pet") {
      if (!nr.pet) return no("no pet near");
      if (nr.pet.data.hat) { delete nr.pet.data.hat; return ok("you take its hat back"); }
      if (!d.hat) return no("put a hat on first");
      nr.pet.data.hat = d.hat; return ok("🎩 it wears your hat now. so do you");
    }
    if (!b) return no("nothing near");
    b.data = b.data || {};
    if (verb === "skin" && (b.kind === "hut" || b.kind === "house")) { b.data.skin = ((b.data.skin | 0) + 1) % X.SKINS.length; return ok("🏠 " + X.SKINS[b.data.skin]); }
    if (verb === "crow" && b.kind === "scarecrow") { b.data.look = ((b.data.look | 0) + 1) % (X.crows(game) + 1); return ok("🧑‍🌾 " + X.CROWS[b.data.look]); }
    if (verb === "flag" && b.kind === "banner") { if (!d.mark) return no("paint a mark first"); b.data.mark = d.mark; return ok("🚩 your mark flies"); }
    if (verb === "swap" && b.kind === "mannequin") {
      // everything you have on goes to the stand, everything on the stand goes on you
      var mine = outfit(c).map(function (e) { return e.kind; }), theirs = b.data.outfit || [], h0 = b.data.hat;
      outfit(c).forEach(function (e) { Wr.takeOff(game, c, e.sys, e.slot); });
      mine = mine.filter(function (kd) { return Sv().take(c, kd, 1).length > 0; });
      theirs.forEach(function (kd) { Sv().add(c, kd, 1); Wr.putOn(game, c, kd); });
      b.data.outfit = mine; if (d.hat) b.data.hat = d.hat; else delete b.data.hat;
      if (h0) d.hat = h0; else delete d.hat;
      Wr.fresh(c);
      return ok("🧍 swapped: " + (theirs.length + (h0 ? 1 : 0)) + " on you, " + (mine.length + (b.data.hat ? 1 : 0)) + " on the stand");
    }
    return no("");
  };

  /* ---------------- the page (wear tab, looks) ---------------- */
  function btn(a, label, on, dis) { return "<button class='btn" + (on ? " go" : "") + "' data-w3='" + a + "'" + (dis ? " disabled" : "") + ">" + label + "</button>"; }
  function row(h) { return "<div class='row' style='display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px'>" + h + "</div>"; }
  function cname(n, def) { return n == null ? def : n < 0 ? "off" : W().BAND_NAMES[n % 6]; }
  X.html = function (game, c) {
    var Wr = W(), s = st(game), d = c.wd || {}, hide = d.hide || {}, out = "", i, h;
    out += "<div class='lbl'>show</div>" + row(["head", "body", "feet", "charm", "mask"].map(function (p) { return btn("hide:" + p, p + (hide[p] ? ": hidden" : ""), !hide[p]); }).join(""));
    h = X.hats(game).map(function (k) { return btn("hat:" + k, esc(Wr.HATS[k][0]), d.hat === k); }).join("");
    out += "<div class='lbl'>hats for show</div>" + row(h ? h + btn("hat:", "none", !d.hat) : "<span class='help'>none yet. the hat mouse leaves one for achievements; wrecks, feasts and captains have others.</span>");
    h = "";
    Sv().inv(c).s.forEach(function (sl) { if (sl && h.indexOf("dye:" + sl.k + "'") < 0 && X.dyeOf(sl.k)) h += btn("dye:" + sl.k, "dye with " + esc(K[sl.k].label)); });
    out += "<div class='lbl'>colours</div>" + row(btn("dyeplace", "dye the: " + dyePlace + " ▸") + h + (d.dye && d.dye[dyePlace] ? btn("wash", "wash out") : "") + (c.tier >= 3 && c.tier < 6 ? btn("band", "headband: " + cname(d.band, "tribe") + " ▸") : "") + (c.tier >= 4 ? btn("belt", "belt: " + cname(d.belt, "leather") + " ▸") : ""));
    h = btn("trim:0", "tribe trim", !d.trim);
    for (i = 1; i <= X.trims(game); i++) h += btn("trim:" + i, Wr.TRIMS[i][0] + " trim", d.trim === i);
    for (i = 0; i < Wr.CLOAKS.length; i++) if (!i || s.cloaks[i]) h += btn("cloak:" + i, Wr.CLOAKS[i] + " cloth", (d.cl | 0) === i);
    out += row(h);
    h = btn("paint:0", "no paint", !d.paint);
    for (i = 1; i < Wr.PAINTS.length; i++) if (d.paints && d.paints[i]) h += btn("paint:" + i, Wr.PAINTS[i][0], d.paint === i);
    out += "<div class='lbl'>body paint and your mark</div>" + row(h) + "<div style='display:grid;grid-template-columns:repeat(5,26px);gap:2px;margin-bottom:4px'>";
    for (i = 0; i < 25; i++) out += "<button class='btn" + ((d.mark | 0) >> i & 1 ? " go" : "") + "' style='padding:0;height:26px;min-width:0' data-w3='bit:" + i + "'>" + ((d.mark | 0) >> i & 1 ? "■" : "·") + "</button>";
    out += "</div>" + row(btn("ban:save", "keep as a banner") + s.banners.map(function (m, j) { return btn("ban:" + j, "banner " + (j + 1), d.mark === m); }).join(""));
    out += "<div class='lbl'>shape</div><canvas data-w3c='1' width='32' height='32' style='width:128px;height:128px;image-rendering:pixelated;touch-action:none;background:#0003;border-radius:6px'></canvas>" + row(btn("ears", "ears ▸") + btn("tail", "tail ▸") + "<span class='help'>drag the picture: sideways for wider, up for bigger.</span>");
    var nr = near(game, c), b = nr.b;
    h = "";
    if (b && (b.kind === "hut" || b.kind === "house")) h += btn("skin", "the " + SK[b.kind].label + ": " + X.SKINS[(b.data && b.data.skin) | 0] + " ▸");
    if (b && b.kind === "scarecrow") h += btn("crow", "the scarecrow: " + X.CROWS[(b.data && b.data.look) | 0] + " ▸", false, !X.crows(game));
    if (b && b.kind === "mannequin") h += btn("swap", "swap outfits with the stand");
    if (b && b.kind === "banner") h += btn("flag", "fly your mark on the banner");
    if (nr.pet) h += btn("pet", nr.pet.data.hat ? "take the pet's hat back" : "a hat for your pet");
    if (h) out += "<div class='lbl'>near you</div>" + row(h);
    var bo = X.bobber(game);
    out += "<div class='lbl'>set down</div>" + row(btn("set:mannequin", "🧍 a clothes stand") + btn("set:glowlichen", "✨ glow lichen") + (bo[3] ? btn("bob", "fishing float: " + bo[0] + " ▸") : ""));
    out += "<p class='help'>found: " + X.hats(game).length + "/" + Object.keys(Wr.HATS).length + " hats · " + X.trims(game) + "/4 trims · " + X.crows(game) + "/6 scarecrow looks · " + s.banners.length + " banners</p>";
    return out;
  };
  X.draw = function (cv, c) {
    try {
      var sh = SB.Pixel.paint(c), g = cv.getContext("2d"), im = g.createImageData(32, 32);
      im.data.set(sh.frames[0].d); g.putImageData(im, 0, 0);
    } catch (e) {}
  };
  X.wire = function (root, game, c, redraw, tell) {
    root.querySelectorAll("[data-w3]").forEach(function (b) {
      b.addEventListener("click", function () { var a = b.getAttribute("data-w3"), i = a.indexOf(":"), r = X.act(game, c, i < 0 ? a : a.slice(0, i), i < 0 ? "" : a.slice(i + 1)); if (r.msg && tell) tell(r.msg); if (redraw) redraw(); });
    });
    var cv = root.querySelector("[data-w3c]"), at = null;
    if (!cv) return;
    X.draw(cv, c);
    cv.addEventListener("pointerdown", function (e) { at = [e.clientX, e.clientY]; if (cv.setPointerCapture) try { cv.setPointerCapture(e.pointerId); } catch (x) {} });
    cv.addEventListener("pointermove", function (e) {
      if (!at) return;
      var dx = e.clientX - at[0], dy = e.clientY - at[1];
      if (Math.abs(dx) + Math.abs(dy) < 6) return;
      at = [e.clientX, e.clientY];
      X.sculpt(c, "body", dx * 0.004); X.sculpt(c, "size", -dy * 0.004);
      X.draw(cv, c);
    });
    cv.addEventListener("pointerup", function () { at = null; });
    cv.addEventListener("pointercancel", function () { at = null; });
  };

  /* ---------------- what hangs on a building ---------------- */
  // a mural: [x, y, sx, sy, colour] flat blobs on a cream plaque
  var MUR = [
    [[0, 0.02, 0.1, 0.1, [1, 0.8, 0.2]], [0.17, 0.1, 0.03, 0.03, [1, 0.8, 0.2]], [-0.17, 0.1, 0.03, 0.03, [1, 0.8, 0.2]]],
    [[0, -0.02, 0.07, 0.11, [1, 0.5, 0.15]], [0, -0.05, 0.035, 0.06, [1, 0.85, 0.3]], [0, -0.15, 0.14, 0.025, [0.45, 0.3, 0.2]]],
    [[0.12, 0, 0.08, 0.08, [0.5, 0.35, 0.6]], [-0.13, -0.04, 0.055, 0.055, [0.77, 1, 0.29]], [0.12, 0.1, 0.02, 0.04, [0.8, 0.3, 1]]],
    [[-0.06, 0, 0.065, 0.09, [1, 1, 0.95]], [0.11, -0.05, 0.05, 0.05, [1, 0.6, 0.75]]],
    [[0, -0.02, 0.11, 0.075, [0.6, 0.62, 0.68]], [0, 0.11, 0.03, 0.03, [1, 0.9, 0.4]], [0.14, 0.08, 0.02, 0.02, [1, 0.9, 0.4]]],
    [[0.02, 0, 0.13, 0.06, [0.35, 0.6, 0.95]], [-0.15, 0, 0.04, 0.075, [0.35, 0.6, 0.95]], [0.09, 0.015, 0.015, 0.015, [0.1, 0.1, 0.15]]]
  ];
  var DK = [0.16, 0.14, 0.18];
  var CROW = [null,
    [["p:ball", 0, 0.94, 0, 0, 0, 0.17, 0.15, 0.17, [1, 0.55, 0.15]]],
    [["p:limb", 0, 1.02, 0, 0, 0, 0.11, 0.2, 0.11, DK], ["p:disc", 0, 1.03, 0, 0, 0, 0.2, 1, 0.2, DK]],
    [["p:ball", 0, 0.94, 0, 0, 0, 0.16, 0.16, 0.16, [0.42, 0.35, 0.48]], ["p:cone", 0.07, 1.05, 0, 0, 0, 0.03, 0.1, 0.03, [0.8, 0.3, 1]], ["p:cone", -0.07, 1.05, 0, 0, 0, 0.03, 0.1, 0.03, [0.8, 0.3, 1]]],
    [["p:ring", 0, 1.05, 0, 0, 0, 0.15, 1.2, 0.15, [1, 0.6, 0.75]]],
    [["p:ball", 0, 0.94, 0, 0, 0, 0.15, 0.15, 0.15, [1, 0.84, 0.36], 1]],
    [["p:ball", 0.3, 0.78, 0, 0, 0, 0.07, 0.06, 0.09, DK], ["p:cone", 0.3, 0.79, 0.08, 0, PI2, 0.02, 0.06, 0.02, [1, 0.8, 0.2]]]
  ];
  // entries: [mesh, x, y, z, ry, rx, sx, sy, sz, tint, glow, night only], or ["light", y, reach, r, g, b]
  X.deco = function (game, s) {
    var k = s.kind, d = s.data, top = k === "house" ? 1.5 : k === "hut" ? 1.86 : 0;
    if (!d || !(top || k === "scarecrow" || k === "mannequin" || k === "banner" || k === "glowlichen" || k === "grave")) return null;
    var key = (d.skin | 0) + "," + (d.mural | 0) + "," + (d.look | 0) + "," + (d.mark | 0) + "," + (d.hat || "") + (d.outfit ? d.outfit.join() : "");
    if (s._dk === key) return s._dx;
    var o = [], zf = k === "house" ? 0.7 : 0.9, Wr = W(), i, m;
    if (top) {
      var sty = Wr ? Wr.style(game, null) : null, sc = sty ? c01(sty[1]) : null;
      if (sty && sty[0] === "reed") o.push(["p:leaf", 0, top, 0, 0, 0, 0.12, 0.4, 0.12, sc], ["p:leaf", 0, top, 0, PI2, 0, 0.12, 0.32, 0.12, sc]);
      else if (sty && sty[0] === "clay") o.push(["p:ball", 0, top + 0.06, 0, 0, 0, 0.1, 0.13, 0.1, sc]);
      else if (sty && sty[0] === "moss") o.push(["p:ring", 0, top - 0.1, 0, 0, 0, 0.2, 1, 0.2, sc]);
      else if (sty) o.push(["p:cone", 0, top - 0.02, 0, 0, 0, 0.07, 0.3, 0.07, sc]);
      if (d.skin === 1) for (i = -1; i <= 1; i++) o.push(["p:ball", i * 0.3, 0.38, zf, 0, 0, 0.07, 0.07, 0.07, [[1, 0.55, 0.7], [1, 0.85, 0.3], [0.95, 0.95, 1]][i + 1]]);
      else if (d.skin === 2 && Wr) for (i = 0; i < 6; i++) o.push(["p:leaf", Math.sin(i * 1.05) * (zf + 0.12), 0.84, Math.cos(i * 1.05) * (zf + 0.12), i * 1.05, Math.PI, 0.1, 0.16, 0.1, c01(Wr.BANDS[i])]);
      else if (d.skin === 3) o.push(["p:ring", 0, 0.08, 0, 0, 0, k === "house" ? 1.2 : 1.02, 1.2, 1.02, [0.62, 0.6, 0.58]]);
      if (d.mural) {
        m = MUR[(d.mural - 1) % MUR.length];
        o.push(["p:disc", 0, 0.52, -zf - 0.012, 0, PI2, 0.3, 1, 0.24, [0.93, 0.88, 0.76]]);
        for (i = 0; i < m.length; i++) o.push(["p:ball", m[i][0], 0.52 + m[i][1], -zf - 0.03, 0, 0, m[i][2], m[i][3], 0.015, m[i][4]]);
      }
    } else if (k === "scarecrow") { if (CROW[d.look | 0]) o = CROW[d.look | 0]; }
    else if (k === "mannequin") {
      var hh = d.hat && Wr && Wr.HATS[d.hat], col = { head: hh ? Wr.rgb(hh[2]) : null };
      (d.outfit || []).forEach(function (kd) { var pl = Wr && Wr.placeOf(kd); if (pl && !col[pl] && K[kd]) col[pl] = Wr.rgb(K[kd].color); });
      if (col.head) o.push([hh && (hh[1] === "cone" || hh[1] === "tall") ? "p:cone" : "p:ball", 0, 1.1, 0, 0, 0, 0.13, hh && (hh[1] === "cone" || hh[1] === "tall") ? 0.26 : 0.08, 0.13, c01(col.head)]);
      if (col.body) o.push(["p:ring", 0, 0.62, 0, 0, 0, 0.17, 2.6, 0.12, c01(col.body)]);
      if (col.feet) o.push(["p:ball", 0.07, 0.06, 0.05, 0, 0, 0.06, 0.05, 0.08, c01(col.feet)], ["p:ball", -0.07, 0.06, 0.05, 0, 0, 0.06, 0.05, 0.08, c01(col.feet)]);
    } else if (k === "banner") {
      for (i = 0; i < 25; i++) if ((d.mark | 0) >> i & 1) o.push(["p:ball", 0.24 + (i % 5 - 2) * 0.07, 1.25 - (i / 5 | 0) * 0.1, 0, 0, 0, 0.03, 0.045, 0.03, DK]);
    } else if (k === "glowlichen") o.push(["light", 0.4, 3.2, 0.45, 0.95, 0.8]);
    else if (SB.Funeral && SB.Funeral.lightOf) { m = SB.Funeral.lightOf(s); o.push(["light", 0.7, 2.4, m[0], m[1], m[2]], ["p:ball", 0, 0.78, 0, 0, 0, 0.06, 0.08, 0.06, m, 1, 1]); }
    s._dk = key;
    return (s._dx = o.length ? o : null);
  };

  /* ---------------- what happens by itself ---------------- */
  function wet(game, c) {
    var w = game.world, i;
    if (w.weather && w.weather.rain > 0.4) return true;
    for (i = 0; i < 9; i++) if (SB.World.depthAt(w, c.x + (i ? Math.sin(i * 0.785) * 3.5 : 0), c.z + (i ? Math.cos(i * 0.785) * 3.5 : 0)) > 0.02) return true;
    return false;
  }
  function chem(c, k, d) { if (c.chem && typeof c.chem[k] === "number") c.chem[k] = SB.clamp(c.chem[k] + d, 0, 1); }
  X.DRY = 500;
  // one smol's turn (el = seconds since its last): its shape, what its kind of body wants, the paint it has earned
  X.visit = function (game, c, el) {
    var Wr = W(), f0 = c.fit ? Math.round(c.fit) : 0, ch = c.chem || {}, busy = c.moving || !!c.plan || (c.action && c.action.phase === "go"), w = game.world;
    var f = (c.fit || 0) + (ch.hunger < 0.3 && !busy ? 0.05 : 0) - (busy ? 0.04 : 0) - (ch.hunger > 0.7 ? 0.06 : 0);
    f = SB.clamp(f, -1, 1); if (f) c.fit = Math.round(f * 100) / 100; else if (c.fit) delete c.fit;
    if (Wr && (c.fit ? Math.round(c.fit) : 0) !== f0) Wr.fresh(c);
    // finned and leafy smols want water near (or rain); leafy ones feed a little on the sun when they have it
    if ((c.look && c.look.fins) || c.leafy) {
      if (wet(game, c)) { if (c.dry) delete c.dry; if (c.leafy && !w.night) { chem(c, "hunger", -0.02); chem(c, "reward", 0.02); } }
      else { c.dry = Math.round((c.dry || 0) + el); if (c.dry > X.DRY) chem(c, "punish", 0.04); }
    }
    // the ascended want crystal light: thought crystals, a spire, or a crystal of their own
    if (c.tier >= 6) {
      var lit = SB.World.nodesNear(w, c.x, c.z, 12, function (n) { return n.kind === "crystals"; }).length > 0 || SB.World.structsNear(w, c.x, c.z, 20, function (b) { return b.kind === "spire" || b.kind === "glowlichen"; }).length > 0 || (Sv() && Sv().count(c, "crystal", true) > 0);
      if (lit) { if (c.dim) delete c.dim; } else { c.dim = Math.round((c.dim || 0) + el); if (c.dim > X.DRY) chem(c, "punish", 0.04); }
    }
    // body paint, earned for deeds: an elder, a maker, a fighter, a thinker
    if (!Wr) return;
    var d = c.wd || {}, p = d.paints || {}, got = [c.stage >= 4, SB.Body && SB.Body.total && c.body && c.alive && SB.Body.total(c) >= 8, (c.pw && c.pw.scars >= 1) || (c.body && c.body.hits >= 6), c.tier >= 5 && c.ideas && Object.keys(c.ideas).length >= 10];
    for (var i = 0; i < 4; i++) if (got[i] && !p[i + 1]) {
      d = Wr.wd(c); p = d.paints || (d.paints = {}); p[i + 1] = 1;
      if (!d.paint) d.paint = i + 1;
      Wr.fresh(c);
      if (c === me(game)) say("🖌 " + (c.name || "your smol") + " has earned " + Wr.PAINTS[i + 1][0] + " (wear tab, looks)");
    }
  };
  // once a day a builder paints a scene from the chronicle on a hut that has none
  X.mural = function (game) {
    var ch = game.chronicle || [], last = ch[ch.length - 1], done = false;
    (game.world.structures || []).forEach(function (b) {
      if (done || !b.done || (b.kind !== "hut" && b.kind !== "house") || (b.data && b.data.mural)) return;
      var by = null;
      SB.World.creaturesNear(game.world, game, b.x, b.z, 12, function (c) { if (!by && c.alive && c.species === "smol" && c.tier >= 4 && !c.asleep) by = c; });
      if (!by) return;
      var t = last ? String(last[1]) + String(last[2]) : "", n = 0;
      for (var i = 0; i < t.length; i++) n += t.charCodeAt(i);
      b.data = b.data || {}; b.data.mural = 1 + (/grump/.test(t) ? 2 : /hatch|born|egg/.test(t) ? 3 : /pod|star|crash/.test(t) ? 4 : /fish/.test(t) ? 5 : /fire/.test(t) ? 1 : n % 2 ? 0 : 1);
      b.data.muralBy = by.name || "";
      done = true;
      SB.bus.emit("mural", { st: b, c: by, scene: X.SCENES[b.data.mural - 1] });
    });
    return done;
  };
  var tT = 0, rr = 0;
  X.tick = function (game, dt) {
    tT -= dt;
    if (tT > 0 || !game || !game.world) return;
    tT = 1.5;
    var s = st(game), cs = game.creatures || [], n = cs.length, c, i;
    if (n) { rr = (rr + 1) % n; c = cs[rr]; if (c && c.alive && c.species === "smol") X.visit(game, c, 1.5 * n); }
    c = me(game);
    if (c) (game.sites || []).forEach(function (o) { if (o.found && !o.gone && SB.dist(c.x, c.z, o.x, o.z) < 7) X.find(game, "s" + o.id); });
    n = Object.keys(game.achievements || {}).length;
    for (i = X.MOUSE.length - 1; i >= 0; i--) if (n >= X.MOUSE[i][0] && hat(game, X.MOUSE[i][1], "🐭 the hat mouse left you a hat", s.mouse === day(game))) s.mouse = day(game);
    if (SB.Dark && SB.Dark.feast && SB.Dark.feast(game)) hat(game, "party", "it's a feast");
    if (s.mural !== day(game)) { s.mural = day(game); X.mural(game); }
  };
  X.vitals = function (game, c) {
    var o = [];
    if (c && c.dry > X.DRY) o.push({ icon: c.leafy ? "🌿" : "🐟", text: "wants water near", bad: true });
    if (c && c.dim > X.DRY) o.push({ icon: "💎", text: "wants crystal light", bad: true });
    return o;
  };
  // a hatchling takes after its parents: their shape, and now and then leaves
  X.born = function (game, c) {
    if (!c || !game || c.species !== "smol") return;
    var ps = (c.parents || []).map(function (id) { return SB.Game.byId(game, id); }).filter(function (p) { return !!p; }), f = 0, leaf = false, r = SB.rng(((game.seed | 0) ^ ((c.id | 0) * 2654435761)) >>> 0);
    ps.forEach(function (p) { f += (p.fit || 0) / ps.length; if (p.leafy) leaf = true; });
    if (Math.abs(f) >= 0.1) c.fit = Math.round(f * 60) / 100;
    if (leaf ? r() < 0.6 : r() < 0.03) c.leafy = 1;
  };
  X.hook = function () {
    if (X._hooked || !SB.Ext) return;
    X._hooked = true;
    SB.Ext.on("tick", X.tick);
    SB.Ext.on("vitals", X.vitals);
    if (!SB.bus || !SB.bus.on) return;
    function cur() { return SB.Game && SB.Game.current; }
    SB.bus.on("hatch", function (d) { if (d && d.c && cur()) X.born(cur(), d.c); });
    SB.bus.on("fishCaught", function () { if (cur()) { var s = st(cur()), b0 = X.bobber(cur())[3]; s.fish = (s.fish || 0) + 1; if (X.bobber(cur())[3] > b0) say("🎣 a new float: " + X.bobber(cur())[0]); } });
    SB.bus.on("chestOpened", function (d) { if (cur() && d && d.st) X.find(cur(), "c" + d.st.id); });
    SB.bus.on("bossBeaten", function (d) {
      if (!cur()) return;
      hat(cur(), "crown", "a captain is beaten");
      if (d && d.last) { hat(cur(), "lantern", "the last captain is beaten"); st(cur()).cloaks[2] = 1; }
    });
  };
  X.hook();

  /* ---------------- the models ---------------- */
  var ME = SB.Meshes;
  if (ME && ME.STRUCT_BUILDERS && ME.builder) {
    try {
      ME.STRUCT_BUILDERS.mannequin = function () {
        var b = ME.builder();
        b.color(0x8a6440).cyl(5, 0.16, 0.12, 0.06).cyl(4, 0.035, 0.035, 0.95).push().translate(0, 0.7, 0).rotZ(1.5708).translate(0, -0.26, 0).cyl(4, 0.028, 0.028, 0.52).pop();
        b.color(0xe8dcc0).push().translate(0, 1.0, 0).scale(0.13).sphere(1).pop();
        return b.finish();
      };
      ME.STRUCT_BUILDERS.glowlichen = function () {
        var b = ME.builder();
        b.color(0x8f8a86).push().translate(0, 0.1, 0).scale(0.3, 0.16, 0.26).blob(0, 0.3, 3).pop();
        b.color(0x7ff0d0).glow(1);
        [[0.12, 0.2, 0.1], [-0.15, 0.17, 0.05], [0, 0.24, -0.1], [0.2, 0.12, -0.08]].forEach(function (p) { b.push().translate(p[0], p[1], p[2]).scale(0.06).sphere(0).pop(); });
        return b.finish();
      };
    } catch (e) {}
  }
})();
