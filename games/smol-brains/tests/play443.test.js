// 4.43: on an ad portal (CrazyGames, GameDistribution, Poki) the game never puts computercooked.com on the screen.
// The portal build sets window.CC_PORTAL = { name: "crazygames" | "gamedistribution" | "poki" | "none" }. Both
// "copy world link" buttons go (a blocked clipboard made the toast show the link), and the two share pictures lose
// the address. Also two small things the proof pass found: an elder's egg line, and "1 frames a second".
// node games/smol-brains/tests/play443.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra != null && extra !== "" ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const dir = path.join(__dirname, "..", "play", "js");
const js = f => fs.readFileSync(path.join(dir, f), "utf8");
const ui = js("ui.js"), cards = js("cards.js"), qol = js("qol.js");

console.log("1. what counts as an ad portal");
{
  const m = ui.match(/function adPortal\(\) ?\{[^\n]*\}/);
  check("ui.js has adPortal()", !!m);
  if (m) {
    const run = portal => { const ctx = { window: {} }; if (portal !== undefined) ctx.window.CC_PORTAL = portal; return vm.runInNewContext("(" + m[0] + ")()", ctx); };
    check("the site itself (no CC_PORTAL): not a portal", run(undefined) === false);
    check("a plain copy with name \"none\" (itch): not an ad portal", run({ name: "none" }) === false);
    check("crazygames, gamedistribution and poki: ad portals", run({ name: "crazygames" }) === true && run({ name: "gamedistribution", gdGameId: "x" }) === true && run({ name: "poki" }) === true);
    check("a CC_PORTAL with no name: not counted", run({}) === false);
    // 4.44: cc-games site's itch "--no-links" build sets links: false. it hides the same things an ad portal does
    check("links === false counts as no-address, whatever the name", run({ name: "none", links: false }) === true && run({ name: "itch", links: false }) === true && run({ links: false }) === true);
    check("links true, or not set, changes nothing", run({ name: "none", links: true }) === false && run({ name: "none" }) === false && run({ name: "crazygames", links: true }) === true && run({ links: true }) === false);
    check("other files can ask (UI.adPortal)", /UI\.adPortal ?= ?adPortal;/.test(ui));
  }
}

console.log("2. no \"copy world link\" on an ad portal");
check("the world tab's button is left out", /adPortal\(\) ?\? ?null ?: ?h\("button", ?\{ ?class: ?"btn", ?onclick: ?function ?\(\) ?\{ ?copy\(url, ?"world link copied\. friends who open it get the same island\."\)/.test(ui));
check("the civilisation card's button is left out", /adPortal\(\) ?\? ?null ?: ?h\("button", ?\{ ?class: ?"btn", ?onclick: ?function ?\(\) ?\{ ?copy\("https:\/\/computercooked\.com\/games\/smol-brains\/play\/\?world=" ?\+ ?SB\.worldCode\(game\.seed\), ?"world link copied"\)/.test(ui));
check("and the empty place is dropped before the row is built", (ui.match(/\]\.filter\(Boolean\)/g) || []).length >= 2);
check("there are only these two \"copy world link\" buttons", (ui.match(/copy world link"/g) || []).length === 2, (ui.match(/copy world link"/g) || []).length);

console.log("3. no address on the share pictures on an ad portal");
check("the civilisation card", /if ?\(!adPortal\(\)\) ?ctx\.fillText\("computercooked\.com\/games\/smol-brains", ?60, ?1300\);/.test(ui));
check("the smol card", /x\.fillText\(SB\.UI ?&& ?SB\.UI\.adPortal ?&& ?SB\.UI\.adPortal\(\) ?\? ?"smol brains" ?: ?"smol brains · computercooked\.com"/.test(cards));

console.log("4. nothing else in the game's code shows the address");
{
  // every line of code that holds the address either asks adPortal() itself, or is the one line that only builds the
  // link the world tab's (guarded) button copies. a new line with the address fails here until it is guarded.
  const srcDir = path.join(__dirname, "..", "src");
  const loose = [];
  fs.readdirSync(srcDir).filter(f => /\.js$/.test(f)).forEach(f => {
    fs.readFileSync(path.join(srcDir, f), "utf8").split(/\r?\n/).forEach((l, i) => {
      const code = l.replace(/\/\/.*$/, "");
      if (!/computercooked\.com/.test(code)) return;
      if (/adPortal\(\)/.test(code)) return;
      if (f === "ui.js" && /^\s*var url ?= ?"https:\/\/computercooked\.com\/games\/smol-brains\/play\/\?world=" ?\+ ?code;\s*$/.test(code)) return;
      loose.push(f + ":" + (i + 1));
    });
  });
  check("every line with the address is guarded", loose.length === 0, loose.join(" "));
  const html = fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8").replace(/<!--[\s\S]*?-->/g, "");
  const shown = (html.match(/>[^<]*computercooked\.com[^<]*</g) || []);
  check("the game's page shows no address in its own text", shown.length === 0, shown.join(" ").slice(0, 80));
}

console.log("5. two small things from the proof pass");
{
  const order = (fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8").match(/src="js\/([a-z0-9-]+)\.js"/g) || []).map(s => s.slice(8, -4));
  const EXTRA = ["ext", "bosses", "body", "possess", "home", "loot", "friends", "town", "dark", "powers", "fight", "deep", "harvest", "animals", "qol", "wear", "shapes", "wardrobe3", "motion3", "world3", "helpers3", "arrivals3", "minds3"];
  const ctx = load(), SB = ctx.SB;
  order.filter(n => EXTRA.indexOf(n) >= 0).forEach(n => { if (n === "bosses" && SB.Bosses) return; vm.runInContext(js(n + ".js"), ctx, { filename: n + ".js" }); });
  const game = SB.Game.newGame(4431);
  check("an elder's egg line no longer says \"not grown up yet\"", SB.Qol.eggLine(game, { stage: 4 }) === "past the age for eggs", SB.Qol.eggLine(game, { stage: 4 }));
  check("a youngster's still does", SB.Qol.eggLine(game, { stage: 2 }) === "not grown up yet" && SB.Qol.eggLine(game, { stage: 0 }) === "not grown up yet");
  check("a grown smol with no partner: \"no partner\"", SB.Qol.eggLine(game, { stage: 3, partner: null }) === "no partner");
  check("one frame a second is \"1 frame a second\"", /fps\.v ?=== ?1 ?\? ?" frame a second" ?: ?" frames a second"/.test(qol));
}

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
