// 4.33: the plug-in points (ext.js). A system registers handlers; the game calls them; a handler that throws is
// switched off and the rest carry on.
// node games/smol-brains/tests/ext.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");
const ctx = load(); vm.runInContext(js("ext.js"), ctx, { filename: "ext.js" });
const X = ctx.SB.Ext;
let ticks = 0;
X.on("tick", () => { ticks++; });
X.on("tick", () => { throw new Error("broken on purpose"); });
X.on("tick", () => { ticks += 10; });
const warn = console.warn; console.warn = () => {};
X.tick({}, 0.1); X.tick({}, 0.1);
console.warn = warn;
check("handlers run in order, and a broken one is switched off without stopping the rest", ticks === 22, ticks);
X.on("damage", () => 2); X.on("damage", () => 1.5); X.on("damage", () => "nonsense"); X.on("damage", () => -3);
check("damage multipliers multiply; nonsense is ignored", X.damage({}, {}, {}, {}) === 3);
X.on("key", (g, c, k) => k === "v");
check("a key can be taken", X.key({}, {}, "v", true) === true && X.key({}, {}, "q", true) === false);
let lines = []; X.on("goals", (g, add) => add("a line", "1/2"));
X.goals({}, (t, p) => lines.push(t + p));
check("goals lines are added", lines.join() === "a line1/2");
X.on("vitals", () => [{ icon: "x", text: "hi" }, null, { icon: "y" }]);
check("vitals chips are gathered, bad ones dropped", X.vitals({}, {}).length === 1);
X.tab({ id: "a", label: "A", show: () => true, html: () => "<p>a</p>" }); X.tab({ id: "a", label: "again" }); X.tab({ id: "b", label: "B", show: () => false });
check("tabs register once and can hide themselves", X.tabs.length === 2 && X.shownTabs({}, {}).length === 1 && X.tabById("b").label === "B");
const o = { use: null }; X.on("options", (g, c, r, oo, x) => { oo.use = x.op("did it", () => true, null); });
X.options({}, {}, null, o, { op: (label, go, verb) => ({ label, go, verb }) });
check("options can be changed", o.use && o.use.label === "did it");
const po = js("possess.js"), ph = js("povhud.js");
check("the game calls every hook", /SB\.Ext\.options\(game, c, r, o,/.test(po) && /SB\.Ext\.damage\(game, c, o,/.test(po) && /SB\.Ext\.key\(s\.game, s\.c, k, true, e\)/.test(ph) && /SB\.Ext\.(shownTabs|layout)/.test(ph) && /SB\.Ext\.vitals\(game, c\)/.test(ph) && /SB\.Ext\.tick\(game, dt\)/.test(js("main.js")) && /SB\.Ext\.goals\(g, add\)/.test(js("ui.js")));
check("ext.js loads before the systems that use it", (() => { const h = fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8"); return h.indexOf("js/ext.js") > 0 && h.indexOf("js/ext.js") < h.indexOf("js/home.js"); })());
console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
