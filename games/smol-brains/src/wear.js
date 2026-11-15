/* smol brains — wear.js (4.35): one place for what a smol wears.
   Three systems were written at the same time and each made its own things to wear, kept in its own place:
     fight.js    c.body.wear {hat, cloak, boots, charm, charm2}   the thing stays in the bag, the slot only names it
     harvest.js  c.wear {head, body, feet, c1, c2}                the thing leaves the bag, and carries quality and dye
     powers.js   c.pw.wear {head, body, feet, charm, paw}         the thing leaves the bag
   So a smol could wear a fur hat, a straw hat and a fur cap at once, and there were three pages to dress on.
   This file does not move anybody's state. It makes the three agree:
     - one head, one body, one pair of feet, one paw, two charms. Put something on and whatever another system had in
       that place comes off (W.settle), whoever put it on: you, or a smol dressing itself.
     - a thing two systems both know (a copper vest, fur boots) counts for both once it is on (F.wearing and H.worn
       are wrapped to look across).
     - one bag tab, "wear": what is on, take it off, put on anything in the bag, make anything wearable. */
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var W = SB.Wear = {};
  function F() { return SB.Fight; } function H() { return SB.Harvest; } function P() { return SB.Powers; }
  function Sv() { return SB.Surv; }
  function K() { return SB.KINDS; }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&#39;"); }
  function label(k) { return K()[k] ? K()[k].label : k; }
  W.PLACES = [["head", "head"], ["body", "body"], ["feet", "feet"], ["charm", "charm"], ["paw", "paw"]];
  W.ROOM = { head: 1, body: 1, feet: 1, charm: 2, paw: 1 };
  var CANON = { fight: { hat: "head", cloak: "body", boots: "feet", charm: "charm", charm2: "charm" }, harvest: { head: "head", body: "body", feet: "feet", c1: "charm", c2: "charm" }, powers: { head: "head", body: "body", feet: "feet", charm: "charm", paw: "paw" } };
  W.CANON = CANON;
  var fWearing = null, hWorn = null;
  // everything this smol has on, system by system: [{sys, slot, place, kind}]
  W.on = function (c) {
    var out = [], k, s;
    if (!c) return out;
    if (P() && c.pw && c.pw.wear && P().WEAR) for (s in c.pw.wear) { k = c.pw.wear[s]; if (k && P().WEAR[k] && CANON.powers[s]) out.push({ sys: "powers", slot: s, place: CANON.powers[s], kind: k }); }
    if (H() && c.wear && H().WEAR) for (s in c.wear) { k = c.wear[s] && c.wear[s].k; if (k && H().WEAR[k] && CANON.harvest[s]) { out.push({ sys: "harvest", slot: s, place: CANON.harvest[s], kind: k }); if (c.wear[s].k2) out.push({ sys: "harvest", slot: s, place: "bound", kind: c.wear[s].k2 }); } }
    if (F() && c.body && c.body.wear && F().GEAR) for (s in c.body.wear) { k = c.body.wear[s]; if (k && F().GEAR[k] && CANON.fight[s] && (fWearing || F().wearing)(c, s) === k) out.push({ sys: "fight", slot: s, place: CANON.fight[s], kind: k }); }
    return out;
  };
  W.has = function (c, kind) { return W.on(c).some(function (e) { return e.kind === kind; }); };
  W.takeOff = function (game, c, sys, slot) {
    if (sys === "fight") { var w = c.body && c.body.wear; if (!w || !w[slot]) return { ok: false, msg: "nothing there" }; var k = w[slot]; delete w[slot]; return { ok: true, msg: "you take off the " + label(k) }; }
    if (sys === "harvest" && H()) return H().takeOff(game, c, slot);
    if (sys === "powers" && P()) return P().takeOff(game, c, slot);
    return { ok: false, msg: "nothing there" };
  };
  // one of each place (two charms). keep = {sys, slot} is the thing just put on: it stays
  W.settle = function (game, c, keep) {
    var all = W.on(c), n = 0;
    W.PLACES.forEach(function (pl) {
      var here = all.filter(function (e) { return e.place === pl[0]; }), room = W.ROOM[pl[0]];
      // the kept one first, then the rest in the order found; anything past the room comes off
      here.sort(function (a, b) { return (keep && b.sys === keep.sys && b.slot === keep.slot ? 1 : 0) - (keep && a.sys === keep.sys && a.slot === keep.slot ? 1 : 0); });
      for (var i = room; i < here.length; i++) if (W.takeOff(game, c, here[i].sys, here[i].slot).ok) n++;
    });
    return n;
  };
  // which system dresses you in this: powers first (its armour reads its own slots), then harvest, then fight
  W.owner = function (kind) { return P() && P().WEAR && P().WEAR[kind] ? "powers" : H() && H().WEAR && H().WEAR[kind] ? "harvest" : F() && F().GEAR && F().GEAR[kind] ? "fight" : null; };
  W.placeOf = function (kind) {
    var o = W.owner(kind);
    return o === "powers" ? CANON.powers[P().WEAR[kind].slot] : o === "harvest" ? (H().WEAR[kind].slot === "charm" ? "charm" : CANON.harvest[H().WEAR[kind].slot]) : o === "fight" ? CANON.fight[F().GEAR[kind].slot] : null;
  };
  W.tip = function (kind) {
    var t = [];
    if (P() && P().WEAR && P().WEAR[kind]) t.push(P().WEAR[kind].desc);
    if (H() && H().WEAR && H().WEAR[kind] && H().WEAR[kind].tip) t.push(H().WEAR[kind].tip);
    if (F() && F().GEAR && F().GEAR[kind] && F().gearText) t.push(F().gearText(kind));
    return t.filter(function (x) { return !!x; }).join(" · ");
  };
  W.putOn = function (game, c, kind) {
    var o = W.owner(kind), r;
    if (!o) return { ok: false, msg: "that isn't something to wear" };
    if (W.has(c, kind)) return { ok: false, msg: "you have that on" };
    r = o === "powers" ? P().putOn(game, c, kind) : o === "harvest" ? H().putOn(game, c, kind) : F().wear(game, c, kind);
    if (r && r.ok) { var e = W.on(c).filter(function (x) { return x.kind === kind && x.sys === o; })[0]; if (e) W.settle(game, c, e); }
    return r || { ok: false, msg: "that didn't work" };
  };
  /* ---------------- making ---------------- */
  function count(c, k) { return Sv().count(c, k, true); }
  function costList(cost) { var out = []; for (var k in cost) out.push({ any: k.split("|"), n: cost[k] }); return out; }
  function lacks(c, cost) { return costList(cost).filter(function (x) { var n = 0; x.any.forEach(function (k) { n += K()[k] ? count(c, k) : 0; }); return n < x.n; }); }
  function costText(cost) { return costList(cost).map(function (x) { return x.n + " " + x.any.map(label).join(" or "); }).join(", "); }
  // every wearable anybody can make, once each: [{kind, sys, id, cost, tier, at}]
  W.recipes = function () {
    var out = [], seen = {};
    function add(kind, sys, id, cost, tier, at) { if (!K()[kind] || seen[kind]) return; seen[kind] = 1; out.push({ kind: kind, sys: sys, id: id, cost: cost || {}, tier: tier || 2, at: at || null, place: W.placeOf(kind) }); }
    if (P() && P().RECIPES2) P().RECIPES2.forEach(function (r) { if (P().WEAR[r.id]) add(r.id, "powers", r.id, r["in"], 2, r.at); });
    if (H() && H().CRAFTS) H().CRAFTS.forEach(function (x) { if (x.out && H().WEAR[x.out]) add(x.out, "harvest", x.id, x.cost, 2, x.at); });
    if (F() && F().RECIPES) F().RECIPES.forEach(function (r) { if (F().GEAR[r.out]) add(r.out, "fight", r.id, r.cost, r.tier, null); });
    return out;
  };
  W.whyNot = function (game, c, r) {
    if (c.tier < 2) return "it takes hands: a tool-user and up";
    if (c.tier < r.tier) return "your tribe doesn't know how yet";
    if (r.sys === "powers") return P().whyNotMake2(game, c, r.id);
    if (r.sys === "harvest") return H().whyNotMake(game, c, r.id);
    var l = lacks(c, r.cost);
    return l.length ? "it needs " + costText(r.cost) : "";
  };
  W.make = function (game, c, kind) {
    var r = W.recipes().filter(function (x) { return x.kind === kind; })[0];
    if (!r) return { ok: false, msg: "nobody knows how to make that" };
    var why = W.whyNot(game, c, r);
    if (why) return { ok: false, msg: why };
    return r.sys === "powers" ? P().make2(game, c, r.id) : r.sys === "harvest" ? H().make(game, c, r.id) : F().make(game, c, r.id);
  };
  /* ---------------- the page ---------------- */
  var showAll = false, group = "head";
  W.html = function (game, c, icon) {
    icon = icon || function () { return ""; };
    var on = W.on(c), out = "<div class='lbl'>what " + esc(c.name || "this smol") + " is wearing</div><div class='rlist'>";
    W.PLACES.forEach(function (pl) {
      var here = on.filter(function (e) { return e.place === pl[0]; });
      if (pl[0] === "paw" && !here.length && !P()) return;
      for (var i = 0; i < W.ROOM[pl[0]]; i++) {
        var e = here[i];
        out += "<div class='rc'><span class='big'>" + (e ? icon(e.kind, 28) : "·") + "</span><div class='t'>" + pl[1] + (W.ROOM[pl[0]] > 1 ? " " + (i + 1) : "") + ": " + (e ? esc(label(e.kind)) : "nothing") + (e ? "<small>" + esc(W.tip(e.kind)) + "</small>" : "") + "</div>" + (e ? "<button class='btn' data-wroff='" + e.sys + ":" + e.slot + "'>take off</button>" : "") + "</div>";
      }
    });
    out += "</div>";
    var seen = {}, btns = [];
    Sv().inv(c).s.forEach(function (sl) { if (sl && !seen[sl.k] && W.owner(sl.k) && !W.has(c, sl.k)) { seen[sl.k] = 1; btns.push("<button class='btn go' data-wron='" + sl.k + "'>" + icon(sl.k, 16) + " put on " + esc(label(sl.k)) + "</button>"); } });
    out += "<div class='lbl'>in your bag</div><div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>" + (btns.length ? btns.join("") : "<span class='help'>nothing to wear in your bag yet. make something below.</span>") + "</div>";
    if (c.tier < 2) return out + "<p class='help'>it takes hands to make and to dress: a tool-user and up.</p>";
    var rs = W.recipes().filter(function (r) { return c.tier >= r.tier; });
    out += "<div class='lbl'>make</div><div class='row' style='display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px'>" + W.PLACES.filter(function (pl) { return rs.some(function (r) { return r.place === pl[0]; }); }).map(function (pl) { return "<button class='btn" + (group === pl[0] ? " go" : "") + "' data-wrgrp='" + pl[0] + "'>" + pl[1] + "</button>"; }).join("") + "<button class='btn" + (showAll ? " go" : "") + "' data-wrall='1'>" + (showAll ? "all shown" : "only what I can make") + "</button></div><div class='rlist'>";
    var n = 0;
    rs.forEach(function (r) {
      if (r.place !== group) return;
      var why = W.whyNot(game, c, r);
      if (why && !showAll) return;
      n++;
      out += "<div class='rc'><span class='big'>" + icon(r.kind, 28) + "</span><div class='t'>" + esc(label(r.kind)) + "<small>" + esc(W.tip(r.kind)) + " · " + esc(costText(r.cost)) + (r.at ? " · " + (r.at === "bench" ? "at a workbench" : r.at === "fire" ? "by a fire" : "at " + r.at) : "") + "</small></div><button class='btn go' data-wrmake='" + r.kind + "' " + (why ? "disabled title='" + esc(why) + "'" : "") + ">make</button></div>";
    });
    if (!n) out += "<p class='help'>nothing for the " + group + " you have the makings of. tap \"only what I can make\" to see everything and what it takes.</p>";
    out += "</div>";
    if (H()) out += "<p class='help'>dyes, saved outfits and binding two charms are on the harvest tab, under wear.</p>";
    return out;
  };
  W.wire = function (root, game, c, redraw, tell) {
    function each(sel, fn) { root.querySelectorAll(sel).forEach(function (b) { b.addEventListener("click", function () { fn(b); }); }); }
    function done(r) { if (r && r.msg && tell) tell(r.msg); if (redraw) redraw(); }
    each("[data-wroff]", function (b) { var a = b.getAttribute("data-wroff").split(":"); done(W.takeOff(game, c, a[0], a[1])); });
    each("[data-wron]", function (b) { done(W.putOn(game, c, b.getAttribute("data-wron"))); });
    each("[data-wrmake]", function (b) { done(W.make(game, c, b.getAttribute("data-wrmake"))); });
    each("[data-wrgrp]", function (b) { group = b.getAttribute("data-wrgrp"); if (redraw) redraw(); });
    each("[data-wrall]", function () { showAll = !showAll; if (redraw) redraw(); });
  };
  /* ---------------- joining the three ---------------- */
  W.join = function () {
    // a thing fight knows counts for fight when harvest or powers has it on (and the other way for harvest)
    if (F() && F().wearing && !fWearing) {
      fWearing = F().wearing;
      F().wearing = function (c, slot) {
        var k = fWearing(c, slot), pl = CANON.fight[slot];
        if (k || !c || slot === "charm2") return k;
        var o = W.on(c).filter(function (e) { return e.sys !== "fight" && e.place === pl && F().GEAR[e.kind] && F().GEAR[e.kind].slot === slot; })[0];
        return o ? o.kind : null;
      };
    }
    if (H() && H().worn && !hWorn) {
      hWorn = H().worn;
      H().worn = function (c, id) {
        var q = hWorn(c, id);
        if (q || !c || !H().WEAR[id]) return q;
        return W.on(c).some(function (e) { return e.sys !== "harvest" && e.kind === id; }) ? 1 : 0;
      };
    }
  };
  W.join();
  function cur() { return SB.Game && SB.Game.current; }
  function onWorn(d, sys) {
    if (!d || !d.c || d.off || !d.kind) return;
    var e = W.on(d.c).filter(function (x) { return x.kind === d.kind && (!sys || x.sys === sys) && (!d.slot || x.slot === d.slot); })[0];
    if (e) W.settle(cur(), d.c, e);
  }
  if (SB.bus && SB.bus.on) {
    SB.bus.on("worn", function (d) { onWorn(d, null); });
    SB.bus.on("wearOn", function (d) { onWorn(d, "harvest"); });
  }
  if (SB.Ext) SB.Ext.tab({ id: "wear", label: function () { return "🧥 wear"; }, show: function (game, c) { return !!c && (c.tier >= 2 || W.on(c).length > 0); }, html: W.html, wire: W.wire });
})();
