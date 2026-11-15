// 4.36: the bag's plug-in tabs sit in four groups (ext.js X.GROUPS / X.layout), drawn by povhud.js as a top row of
// groups and a second row for the open group.
// node games/smol-brains/tests/tabs436.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra != null && extra !== "" ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const dir = path.join(__dirname, "..", "play", "js");
const html = fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8");
const order = (html.match(/src="js\/([a-z0-9-]+)\.js"/g) || []).map(s => s.slice(8, -4));
const EXTRA = ["ext", "bosses", "body", "possess", "home", "loot", "friends", "town", "dark", "powers", "fight", "deep", "harvest", "animals", "qol", "wear", "shapes", "wardrobe3", "motion3", "world3", "helpers3", "arrivals3", "minds3"];
seeded(4361, () => {
  const ctx = load(), SB = ctx.SB, X = (order.filter(n => EXTRA.indexOf(n) >= 0).forEach(n => { if (n === "bosses" && SB.Bosses) return; vm.runInContext(fs.readFileSync(path.join(dir, n + ".js"), "utf8"), ctx, { filename: n + ".js" }); }), SB.Ext);
  SB.Possess.headless = true;
  const game = SB.Game.newGame(4361); SB.Game.current = game; game.tutorial.done = true;
  SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod));
  const me = SB.Game.smols(game)[0]; me.tier = 4; me.stage = 3;
  const ids = X.tabs.map(t => t.id), grouped = [].concat.apply([], X.GROUPS.map(g => g.tabs));
  check("every tab a system registers is in a group", ids.every(id => !!X.groupOf(id)), ids.filter(id => !X.groupOf(id)).join(" "));
  check("no tab is in two groups, and every grouped id is a real tab", new Set(grouped).size === grouped.length && grouped.every(id => ids.indexOf(id) >= 0 || id === "words"), grouped.filter(id => ids.indexOf(id) < 0).join(" "));
  const shown = X.shownTabs(game, me);
  let L = X.layout(game, me, "make");
  check("with a built-in page open: at most four group buttons on the top row, no second row (" + shown.length + " tabs shown)", L.top.length <= 4 && L.top.every(e => !!e.group && !e.on) && L.sub.length === 0 && shown.length >= 10, L.top.length + " top");
  check("a group button opens the first of its tabs that is showing", L.top.every(e => shown.some(t => t.id === e.first) && e.group.tabs.indexOf(e.first) >= 0));
  L = X.layout(game, me, "fight");
  const body = L.top.find(e => e.group && e.group.id === "body");
  check("with fight open: the body group is lit and its tabs are the second row, in the group's order", !!body && body.on && L.sub.length >= 3 && L.sub.map(t => t.id).join(" ") === X.GROUPS.find(g => g.id === "body").tabs.filter(id => shown.some(t => t.id === id)).join(" "), L.sub.map(t => t.id).join(" "));
  check("only one group is lit", L.top.filter(e => e.on).length === 1);
  X.tab({ id: "extra436", label: "🧪 extra", show: () => true, html: () => "", wire: () => {} });
  L = X.layout(game, me, "make");
  check("a tab in no group stays on the top row", L.top.some(e => e.id === "extra436"));
  const pov = fs.readFileSync(path.join(dir, "povhud.js"), "utf8");
  check("the bag draws from the layout, with a second row", /SB\.Ext\.layout\(s\.game, c, bag\.tab\)/.test(pov) && /class='tabs sub'/.test(pov) && /data-grp=/.test(pov));
});
console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
