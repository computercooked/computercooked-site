/* smol brains — ext.js (4.33): the plug-in points.
   The feature plan adds whole systems (fighting, friends, animals, farming, the dark, the world, home, powers). So
   that each can live in its own file and none of them has to edit the same lines of possess.js, povhud.js, ui.js or
   main.js, those files call the hooks below and a system registers what it needs:

     SB.Ext.on("tick", function (game, dt) {})                       once a frame, with the island running
     SB.Ext.on("options", function (game, c, r, o, x) {})            in a body: change what the buttons do. r is what
                                                                     you look at ({type: "creature"|"item"|"node"|"struct"|"water", ref, kind} or null),
                                                                     o is {use, place, pick}; x has op(label, go, verb), no(label), say(text),
                                                                     audio(name, vol), held (the bag slot in your hand or null), hk (its kind), openBag(tab)
     SB.Ext.on("damage", function (game, c, target, info) {})        in a body, about to hit a grump: return a number to multiply the hit by (info: {hk, dmg})
     SB.Ext.on("key", function (game, c, key, down, e) {})           in a body: a key went down or up (lower-case). return true if you used it
     SB.Ext.on("goals", function (game, add) {})                     the sky's goals list: add(text, progressText, done, big)
     SB.Ext.on("vitals", function (game, c) {})                      in a body: return [{icon, text, bad}] chips to show by the hearts
     SB.Ext.tab({ id, label(game, c), show(game, c), html(game, c, icon), wire(root, game, c, redraw, say) })   a tab in the bag

   A handler that throws is switched off for the rest of the session (and logged once), so one broken system cannot
   take the game down. Everything else a system needs is already open: SB.bus for events, SB.KINDS / SB.STRUCTS /
   SB.Surv.TOOL / SB.Surv.EXTRA (recipes) for content, game.quests.<name> and plain fields on a smol for saved state,
   SB.UI.toast(html, cls, ms, at) and SB.PovHud.say(text) for words. */
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var X = SB.Ext = {};
  var H = { tick: [], options: [], damage: [], key: [], goals: [], vitals: [] };
  X.tabs = [];
  X.on = function (what, fn) { if (H[what] && typeof fn === "function") H[what].push(fn); return fn; };
  X.tab = function (t) { if (t && t.id && !X.tabs.some(function (o) { return o.id === t.id; })) X.tabs.push(t); return t; };
  function run(what, each) {
    var L = H[what];
    for (var i = 0; i < L.length; i++) {
      if (L[i]._off) continue;
      try { each(L[i]); } catch (e) { L[i]._off = true; if (typeof console !== "undefined" && console.warn) console.warn("ext " + what + " handler switched off:", e); }
    }
  }
  X.tick = function (game, dt) { run("tick", function (f) { f(game, dt); }); };
  X.options = function (game, c, r, o, x) { run("options", function (f) { f(game, c, r, o, x); }); return o; };
  X.damage = function (game, c, target, info) { var k = 1; run("damage", function (f) { var v = f(game, c, target, info); if (typeof v === "number" && isFinite(v) && v >= 0) k *= v; }); return k; };
  X.key = function (game, c, key, down, e) { var used = false; run("key", function (f) { if (f(game, c, key, down, e) === true) used = true; }); return used; };
  X.goals = function (game, add) { run("goals", function (f) { f(game, add); }); };
  X.vitals = function (game, c) { var out = []; run("vitals", function (f) { var v = f(game, c); if (v && v.length) v.forEach(function (o) { if (o && o.text != null) out.push(o); }); }); return out; };
  X.shownTabs = function (game, c) { var out = []; X.tabs.forEach(function (t) { try { if (!t.show || t.show(game, c)) out.push(t); } catch (e) {} }); return out; };
  X.tabById = function (id) { for (var i = 0; i < X.tabs.length; i++) if (X.tabs[i].id === id) return X.tabs[i]; return null; };
  X._handlers = H; // for tests
})();
