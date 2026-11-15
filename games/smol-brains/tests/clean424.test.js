// 4.24: a first pass at the clean-up. The smol card leads with what you can do, need bars carry words, growing-up
// toasts stop when the island is busy, and the end-game is "the beacon" in everything a player reads.
// node games/smol-brains/tests/clean424.test.js
"use strict";
require("./_src.js");
const fs = require("fs"), path = require("path");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");
const css = fs.readFileSync(path.join(__dirname, "..", "play", "style.css"), "utf8");
const ui = js("ui.js");

console.log("1. the smol card");
const iThought = ui.indexOf('el.cThought = h("div", { class: "thought" })'), iMain = ui.indexOf('class: "btnrow main3"'), iDrives = ui.indexOf('el.cDrives = h("div", { class: "drives" })');
check("possess, tricks and talk sit right under the mood, above the needs", iThought > 0 && iMain > iThought && iDrives > iMain);
const main3 = ui.slice(iMain, iMain + 1200);
check("all three are there", /👁 possess/.test(main3) && /🎓 tricks/.test(main3) && /💬 talk/.test(main3));
check("and only once each on the card", ui.split('"👁 possess"').length === 2 && ui.split('"💬 talk"').length === 2);
check("every need bar has a word", /<span class="l">' \+ SB\.DRIVE_WORDS\[d\.i\] \+ '<\/span>/.test(ui) && /<span class="l">health<\/span>/.test(ui) && /\.drive \.l \{/.test(css));

console.log("2. a toast diet");
check("growing up is quiet on a busy island", /many && \/ is now an\? \(kid\|teen\|adult\|elder\)!\$\/\.test\(t\)\) return;/.test(ui));
check("so is the fifth new species", /\/\^a new species!\/\.test\(t\) && game\.clades && Object\.keys\(game\.clades\)\.length > 4\) return;/.test(ui));

console.log("3. the beacon");
const all = ["ui.js", "quests.js", "main.js", "ideas.js"].map(js).join("\n");
const shown = (all.match(/"[^"\n]*"/g) || []).join(" ");
check("nothing a player reads says “the big thought”", !/the big thought/.test(shown), (shown.match(/[^"]{0,30}the big thought[^"]{0,20}/) || [""])[0]);
check("the last chapter is the beacon, and its quest raises it", /name: "the beacon", bonus: 20/.test(all) && /t: "raise the beacon"/.test(all));
check("the founders are “two more sleepers”", /two more sleepers climbed out of the pod/.test(ui) && !/the last smols\. what are they called/.test(ui));

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
