// The plug-in systems were written in parallel, each adding its own items, buildings, tools and saved state. Two of
// them once made an item with the same id ("fisherhat", "furboots") and the second silently lost. This loads each
// system alone, records what it adds, and fails if two systems claim the same id anywhere.
// node games/smol-brains/tests/collisions.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const dir = path.join(__dirname, "..", "play", "js");
const js = f => fs.readFileSync(path.join(dir, f), "utf8");
const SYSTEMS = ["home", "loot", "friends", "town", "dark", "powers", "fight", "deep", "harvest", "animals", "qol", "wear", "wardrobe3", "motion3", "world3", "helpers3", "arrivals3", "minds3"].filter(n => fs.existsSync(path.join(dir, n + ".js")));
const BASE = ["ext.js", "body.js", "possess.js"];
function keysOf(SB) {
  return { kinds: Object.keys(SB.KINDS), structs: Object.keys(SB.STRUCTS), tools: Object.keys((SB.Surv && SB.Surv.TOOL) || {}), nodes: Object.keys(SB.NODES || {}),
    tabs: (SB.Ext ? SB.Ext.tabs : []).map(t => t.id), mods: Object.keys(SB) };
}
const base = (() => { const ctx = load(); BASE.forEach(f => { try { vm.runInContext(js(f), ctx, { filename: f }); } catch (e) {} }); return keysOf(ctx.SB); })();
const added = {};
SYSTEMS.forEach(n => {
  const ctx = load(); BASE.forEach(f => { try { vm.runInContext(js(f), ctx, { filename: f }); } catch (e) {} });
  let err = null;
  try { vm.runInContext(js(n + ".js"), ctx, { filename: n + ".js" }); } catch (e) { err = e; }
  check(n + ".js loads on its own (nothing but the core, ext, body and possess before it)", !err, err && String(err.message).slice(0, 120));
  const k = keysOf(ctx.SB); added[n] = {};
  Object.keys(k).forEach(t => { added[n][t] = k[t].filter(x => base[t].indexOf(x) < 0); });
});
// ids two systems share ON PURPOSE (the same thing, defined by whichever loads first): each was read and judged
const SHARED = { coppervest: 1, furboots: 1, wraps: 1, tablet: 1, thunderpot: 1, drum: 1, flute: 1, banner: 1, statue: 1, starmetal: 1, dye_red: 1, dye_green: 1, dye_blue: 1, beebox: 1, shell: 1, vinerope: 1 };
["kinds", "structs", "tools", "nodes", "tabs", "mods"].forEach(t => {
  const owner = {}, clash = [];
  SYSTEMS.forEach(n => added[n][t].forEach(id => { if (SHARED[id]) return; if (owner[id] && owner[id] !== n) clash.push(id + " (" + owner[id] + " and " + n + ")"); else owner[id] = n; }));
  const what = { kinds: "item", structs: "building", tools: "tool", nodes: "resource node", tabs: "bag tab", mods: "SB.<name>" }[t];
  check("no two systems claim the same " + what + " id", !clash.length, clash.slice(0, 8).join(", "));
});
// saved state: each system keeps to its own game.quests key
const q = {};
SYSTEMS.forEach(n => { const m = js(n + ".js").match(/quests\.([a-zA-Z_]+)\b/g) || []; q[n] = Array.from(new Set(m.map(s => s.slice(7)))); });
const own = { home: "home", loot: "loot", friends: "friends", town: "town", dark: "dark", powers: "powers", fight: "fight", deep: "deep", harvest: "harvest", animals: "animals", qol: "qol" };
const writes = [];
SYSTEMS.forEach(n => { const src = js(n + ".js"); Object.keys(own).forEach(o => { if (o !== n && new RegExp("quests\\." + own[o] + "\\s*=[^=]").test(src)) writes.push(n + " assigns game.quests." + own[o]); }); });
check("no system replaces another system's saved state", !writes.length, writes.join(", "));
// all together: every id resolves, and the whole set loads in the order index.html uses
const html = fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8");
const order = (html.match(/src="js\/([a-z0-9-]+)\.js"/g) || []).map(s => s.slice(8, -4));
const missing = SYSTEMS.filter(n => order.indexOf(n) < 0);
check("index.html loads every system", !missing.length, missing.join(" "));
check("ext.js loads before every system", SYSTEMS.every(n => order.indexOf("ext") < order.indexOf(n)));
check("every system loads before main.js", SYSTEMS.every(n => order.indexOf(n) < order.indexOf("main")));
const ctx = load(); let allErr = null;
try { order.filter(n => ["ext", "body", "possess"].concat(SYSTEMS).indexOf(n) >= 0).forEach(n => { vm.runInContext(js(n + ".js"), ctx, { filename: n + ".js" }); }); } catch (e) { allErr = e; }
check("all of them load together in index.html's order", !allErr, allErr && String(allErr.message).slice(0, 160));
const SB = ctx.SB, K = SB.KINDS;
const NOUNS = Object.keys(SB.STIM || {});
const bad = Object.keys(K).filter(k => !K[k] || !K[k].label || !K[k].noun || (NOUNS.length && NOUNS.indexOf(K[k].noun) < 0));
check("every item has a label and a noun the smols' brains know", !bad.length, bad.slice(0, 8).join(" "));
const badS = Object.keys(SB.STRUCTS).filter(k => !SB.STRUCTS[k].label || SB.STRUCTS[k].r == null || !SB.STRUCTS[k].cost);
check("every building has a label, a size and a cost table", !badS.length, badS.slice(0, 8).join(" "));
console.log("  (" + Object.keys(K).length + " items, " + Object.keys(SB.STRUCTS).length + " buildings, " + (SB.Ext ? SB.Ext.tabs.length : 0) + " plug-in tabs)");
console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
