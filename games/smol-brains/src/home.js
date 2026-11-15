/* smol brains — home.js (4.30, "a home of your own"): the Sims and Stardew side of the game.
   A hut, a house or a lean-to can be YOUR home: the first one you finish with your own hands is, or look at any
   finished one in a body and choose "make this your home". Then you fit it out by hand, one thing at a time, each
   paid for out of your bag while you stand at the door, and each one does something:
     a bed     wake at home at dawn with every heart back; sleep there whenever it's dark
     a chest   twelve slots that stay at home (whoever you are, whoever your smol is next)
     a hearth  a hunting grump gives up at your door
     a garden  berries waiting every morning
   State lives in game.quests.home (saved with the quest board): { id, x, z, got: {bed: day, ...}, chest: [slots] }.
   Nothing here touches the island's random stream. */
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var H = SB.Home = {};
  H.KINDS = { hut: 1, house: 1, leanto: 1 };
  H.NEAR = 6;     // this close and you are "at home" (the chest opens, things can be made)
  H.SAFE = 7;     // a hearth turns a hunting grump back this far out
  H.CHEST = 12;
  H.THINGS = [
    { id: "bed", icon: "🛏", name: "a bed of leaves", cost: { leaves: 4 }, perk: "wake here at dawn with every heart back. sleep whenever it's dark." },
    { id: "chest", icon: "📦", name: "a chest", cost: { stick: 4, vine: 1 }, perk: "twelve slots that stay at home, for you and whoever comes after." },
    { id: "hearth", icon: "🔥", name: "a hearth", cost: { stone: 4, stick: 2 }, perk: "a grump hunting you gives up at your door." },
    { id: "garden", icon: "🌱", name: "a berry patch", cost: { seed: 2 }, perk: "two handfuls of berries waiting every morning." }
  ];
  H.BY = {}; H.THINGS.forEach(function (t) { H.BY[t.id] = t; });

  function Q(game) { return game.quests || (game.quests = { ch: 0, done: {}, n: {} }); }
  function st(game) { var q = Q(game); if (!q.home || typeof q.home !== "object") q.home = { id: null, got: {}, chest: [] }; if (!q.home.got) q.home.got = {}; if (!q.home.chest) q.home.chest = []; return q.home; }
  H.state = st;
  function Sv() { return SB.Survival || SB.Surv; }
  function day(game) { return Math.floor((game.time || 0) / SB.DAY_LENGTH) + 1; }
  function label(k) { var K = SB.KINDS || {}; return K[k] && K[k].label ? K[k].label : k; }

  // the building itself, or null (burnt down, pulled down, never chosen). A save that lost the id finds it by place.
  H.get = function (game) {
    if (!game || !game.quests || !game.quests.home || game.quests.home.id == null) return null;
    var s = st(game), w = game.world, b = SB.World.structById ? SB.World.structById(w, s.id) : null;
    if (b && b.done && H.KINDS[b.kind]) return b;
    var best = null, bd = 1.5;
    w.structures.forEach(function (o) { if (!o.done || !H.KINDS[o.kind]) return; var d = SB.dist(o.x, o.z, s.x, s.z); if (d < bd) { bd = d; best = o; } });
    if (best) { s.id = best.id; return best; }
    return null;
  };
  H.is = function (game, b) { var h = H.get(game); return !!h && !!b && h === b; };
  H.has = function (game, id) { return !!H.get(game) && !!st(game).got[id]; };
  H.count = function (game) { var s = st(game), n = 0; H.THINGS.forEach(function (t) { if (s.got[t.id]) n++; }); return n; };
  H.at = function (game, c) { var h = H.get(game); return !!h && !!c && SB.dist(c.x, c.z, h.x, h.z) <= H.NEAR; };
  H.canClaim = function (game, b) { return !!b && !!b.done && !!H.KINDS[b.kind] && !H.is(game, b); };
  // what's in the home moves with it (you carried it over)
  H.claim = function (game, b, c) {
    if (!H.canClaim(game, b)) return false;
    var s = st(game), moved = s.id != null;
    s.id = b.id; s.x = b.x; s.z = b.z; s.kind = b.kind; s.day = day(game);
    SB.bus.emit("homeClaimed", { st: b, c: c || null, moved: moved });
    return true;
  };
  // the next thing it could use, for the goals list: a THINGS entry, or null when it has everything
  H.next = function (game) { if (!H.get(game)) return null; var s = st(game); for (var i = 0; i < H.THINGS.length; i++) if (!s.got[H.THINGS[i].id]) return H.THINGS[i]; return null; };
  H.costText = function (t) { var out = []; for (var k in t.cost) out.push(t.cost[k] + " " + label(k)); return out.join(", "); };
  // can this smol pay for it right now? "" or the reason
  H.whyNot = function (game, c, id) {
    var t = H.BY[id], s = st(game);
    if (!t) return "no such thing";
    if (!H.get(game)) return "you have no home yet";
    if (s.got[id]) return "your home has one";
    if (!H.at(game, c)) return "you have to be at home to make it";
    if (c.tier < 2) return "it takes hands: a tool-user and up";
    for (var k in t.cost) if (Sv().count(c, k, true) < t.cost[k]) return "it needs " + H.costText(t);
    return "";
  };
  H.make = function (game, c, id) {
    var why = H.whyNot(game, c, id), t = H.BY[id];
    if (why) return { ok: false, msg: why };
    for (var k in t.cost) Sv().take(c, k, t.cost[k]);
    st(game).got[id] = day(game);
    SB.bus.emit("homeThing", { thing: t, c: c, st: H.get(game), n: H.count(game), all: H.count(game) === H.THINGS.length });
    return { ok: true, msg: t.icon + " " + t.name + "! " + t.perk };
  };

  /* ---- the chest ---- */
  H.slots = function (game) { return H.CHEST + (SB.World3 && SB.World3.hold ? SB.World3.hold(game) : 0); }; // 4.36: a raft home with ark cores holds more
  H.chest = function (game) { var s = st(game), n = H.slots(game); while (s.chest.length < n) s.chest.push(null); return s.chest; };
  function stackOf(k) { return Sv().stackOf ? Sv().stackOf(k) : 8; }
  // put n of a kind into the chest; returns how many did not fit
  H.put = function (game, kind, n, w) {
    var ch = H.chest(game), mx = Math.max(1, stackOf(kind)), i, t;
    if (mx > 1) for (i = 0; i < ch.length && n > 0; i++) if (ch[i] && ch[i].k === kind && ch[i].n < mx) { t = Math.min(n, mx - ch[i].n); ch[i].n += t; n -= t; }
    for (i = 0; i < ch.length && n > 0; i++) if (!ch[i]) { t = Math.min(n, mx); ch[i] = { k: kind, n: t }; if (w != null) ch[i].w = w; n -= t; }
    return n;
  };
  function openWhy(game, c) { return !H.has(game, "chest") ? "your home has no chest yet" : !H.at(game, c) ? "the chest is at home" : ""; }
  // a whole bag slot into the chest
  H.stash = function (game, c, i) {
    var why = openWhy(game, c); if (why) return { ok: false, msg: why };
    var v = Sv().inv(c), sl = v.s[i];
    if (!sl || sl.k === "plans") return { ok: false, msg: "nothing to put away" };
    var left = H.put(game, sl.k, sl.n, sl.w);
    if (left === sl.n) return { ok: false, msg: "the chest is full" };
    if (left > 0) sl.n = left; else v.s[i] = null;
    return { ok: true, msg: "" };
  };
  // a whole chest slot into the bag (what doesn't fit stays)
  H.fetch = function (game, c, i) {
    var why = openWhy(game, c); if (why) return { ok: false, msg: why };
    var ch = H.chest(game), sl = ch[i];
    if (!sl) return { ok: false, msg: "" };
    var left = Sv().add(c, sl.k, sl.n, sl.w);
    if (left === sl.n) return { ok: false, msg: Sv().whyNot && Sv().whyNot(c, sl.k) ? Sv().whyNot(c, sl.k) : "your bag is full" };
    if (left > 0) sl.n = left; else ch[i] = null;
    return { ok: true, msg: "" };
  };

  /* ---- what the things do ---- */
  var tT = 0;
  H.tick = function (game, dt) {
    if (!game || game.offline) return;
    if ((tT -= dt) > 0) return;
    tT = 0.5;
    var h = H.get(game), P = SB.Possess;
    if (!h || !st(game).got.hearth || !P || !P.active || !P.c || !P.scout) return;
    var g = P.scout(), c = P.c;
    if (!g || g.boss || !g.scout || g.scout.done || g.scout.night) return; // captains and the story's own chases are not turned
    if (SB.dist(c.x, c.z, h.x, h.z) > H.SAFE) return;
    if (P.endScout) P.endScout("🔥 the grump won't come near your hearth. it slinks off", 1, "hearth");
    else { g.scout.done = true; g.goingHome = true; }
    SB.bus.emit("homeSafe", { c: c, g: g });
  };
  function dawn() {
    var game = SB.Game && SB.Game.current, h = game && H.get(game);
    if (!h) return;
    var s = st(game), P = SB.Possess, me = P && P.active ? P.c : null, mine = SB.Mine && SB.Mine.get ? SB.Mine.get(game) : null;
    if (s.got.garden) {
      var left = s.got.chest ? H.put(game, "berry", 2) : 2;
      if (left > 0 && Sv().spawn) Sv().spawn(game, "berry", left, h.x + 1.2, h.z + 0.6);
      SB.bus.emit("homeGarden", { st: h, chest: left < 2 });
    }
    if (s.got.bed) [me, mine].forEach(function (c, i) {
      if (!c || !c.alive || (i === 1 && c === me) || SB.dist(c.x, c.z, h.x, h.z) > H.NEAR) return;
      c.chem.health = 1; if (c.chem.tired != null) c.chem.tired = 0;
      if (c === me && P.say) P.say("🛏 morning, in your own bed: every heart back"); SB.bus.emit("homeRested", { c: c, me: c === me });
    });
  }
  var hooked = false;
  H.hook = function () {
    if (hooked || !SB.bus) return; hooked = true;
    SB.bus.on("dawn", dawn);
    // the first home is the first one you finish with your own hands
    SB.bus.on("built", function (d) {
      var game = SB.Game && SB.Game.current, P = SB.Possess;
      if (!game || !d || !d.st || !d.st.done || !H.KINDS[d.st.kind] || H.get(game)) return;
      if (!P || !P.active || !P.c || game.headless || SB.dist(P.c.x, P.c.z, d.st.x, d.st.z) > 8) return;
      H.claim(game, d.st, P.c);
    });
  };
  H.hook();

  /* ---- the bag's "home" tab (povhud.js draws the bag; this fills one tab, as wilds.js does) ---- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]; }); }
  H.html = function (game, c, icon) {
    var h = H.get(game), s = st(game), out = "";
    icon = icon || function () { return ""; };
    if (!h) return "<p><b>no home yet.</b> build a hut or a lean-to with your own hands and it's yours. or look at any finished one and choose “make this your home”.</p><p class='help'>a home gets a bed, a chest, a hearth and a berry patch, each made by hand.</p>";
    var d = Math.round(SB.dist(c.x, c.z, h.x, h.z)), at = d <= H.NEAR, def = SB.STRUCTS[h.kind];
    out += "<div class='lbl'>" + def.emoji + " your " + esc(def.label) + " · " + (at ? "you're home" : d + "m away: walk home to use it") + "</div><div class='rlist'>";
    H.THINGS.forEach(function (t) {
      var have = !!s.got[t.id], need = [];
      for (var k in t.cost) { var n = Sv().count(c, k, true); need.push("<span class='" + (n >= t.cost[k] ? "ok" : "no") + "'>" + icon(k, 16) + " " + Math.min(n, t.cost[k]) + "/" + t.cost[k] + "</span>"); }
      out += "<div class='rc'><span class='big'>" + t.icon + "</span><div class='t'>" + esc(t.name) + "<small>" + esc(t.perk) + "</small>" + (have ? "" : "<div class='need'>" + need.join("") + "</div>") + "</div>" +
        (have ? "<span class='ok'>✓</span>" : "<button class='btn go' data-homemake='" + t.id + "' " + (H.whyNot(game, c, t.id) ? "disabled" : "") + ">make</button>") + "</div>";
    });
    out += "</div>";
    var tr = SB.Loot && SB.Loot.trophies ? SB.Loot.trophies(game) : []; // 4.33: what the captains left
    if (tr.length) out += "<div class='lbl'>on the wall · " + tr.map(function (t) { return t.icon + " " + esc(t.name); }).join(" · ") + "</div>";
    if (s.got.chest) {
      var ch = H.chest(game), v = Sv().inv(c);
      out += "<div class='lbl'>the chest" + (at ? " · tap a thing to take it" : "") + "</div><div class='grid' style='grid-template-columns:repeat(6,minmax(0,40px))'>";
      for (var i = 0; i < ch.length; i++) out += "<div class='slot" + (at ? "" : " off") + "' data-homefetch='" + i + "' title='" + (ch[i] ? esc(label(ch[i].k)) : "") + "'>" + (ch[i] ? icon(ch[i].k, 32) + (ch[i].n > 1 ? "<em>" + ch[i].n + "</em>" : "") : "") + "</div>";
      out += "</div>";
      if (at) {
        var puts = [];
        for (i = 0; i < v.s.length; i++) if (v.s[i] && v.s[i].k !== "plans") puts.push("<button class='btn' data-homestash='" + i + "'>" + icon(v.s[i].k, 16) + " " + esc(label(v.s[i].k)) + (v.s[i].n > 1 ? " ×" + v.s[i].n : "") + "</button>");
        out += "<div class='lbl'>put away</div><div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>" + (puts.length ? puts.join("") : "<span class='help'>your bag is empty</span>") + "</div>";
      }
    }
    return out;
  };
  H.wire = function (root, game, c, redraw, say) {
    function done(r) { if (r && r.msg && say) say(r.msg); if (r && r.ok && SB.Audio && SB.Audio.play) SB.Audio.play("craft"); redraw(); }
    root.querySelectorAll("[data-homemake]").forEach(function (b) { b.addEventListener("click", function () { done(H.make(game, c, b.getAttribute("data-homemake"))); }); });
    root.querySelectorAll("[data-homefetch]").forEach(function (b) { b.addEventListener("click", function () { done(H.fetch(game, c, +b.getAttribute("data-homefetch"))); }); });
    root.querySelectorAll("[data-homestash]").forEach(function (b) { b.addEventListener("click", function () { done(H.stash(game, c, +b.getAttribute("data-homestash"))); }); });
  };
})();
