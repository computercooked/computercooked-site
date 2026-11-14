// 4.23: the story rewritten on the crashed-ark premise (owner: "a whole revamp on the lore and story ... on the
// cutscenes, honestly, none of it makes sense to me"). You are the Lantern, the ark's guiding light; the smols slept
// so long they forgot everything; grumps live in the dark and hate light; the goal is a beacon. No sleeping giant.
// node games/smol-brains/tests/story423.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");
const css = fs.readFileSync(path.join(__dirname, "..", "play", "style.css"), "utf8");
const intro = js("intro.js"), lan = js("lantern.js"), ui = js("ui.js"), ti = js("title.js"), vox = js("vox.js"), ph = js("povhud.js");

console.log("1. the ark film");
check("it can play: nothing inside the film hides its own clock (it threw on frame one for weeks)", !/var warp\s*=/.test(intro) && /function warp\(r\)/.test(intro) && /t = warp\(t\)/.test(intro));
check("it says who you are", /you are the Lantern: the ark's guiding light/.test(intro));
check("and why the ark fell", /grumps live in the dark and hate the light/.test(intro));
check("the ending is a beacon and another ark", /beacon/.test(intro) && /another ark sees it/.test(intro));
check("the line you can read is the big one", /\.introcap \.sub \{[^}]*clamp\(17px/.test(css) && /\.introcap \{ display: flex; flex-direction: column-reverse; \}/.test(css));
const w = intro.match(/var WARP = (\[\[.*?\]\]);/); const segs = w ? JSON.parse(w[1]) : [];
const real = segs.reduce((a, s) => a + (s[1] - s[0]) / s[2], 0);
check("slow enough to read: 14 to 20 seconds", real >= 14 && real <= 20, real.toFixed(1) + " s");

console.log("2. one film, then you play");
check("the opening no longer plays the old Lantern film after it", !/SB\.Intro\.play\(\{[^\n]*SB\.Lantern\.play\(/.test(ui) && !/SB\.Intro\.play\(\{[^\n]*SB\.Lantern\.play\(/.test(ti));
check("a new island goes straight into Pip's eyes", /SB\.FirstNight\.start\(game\); tutShow\(\); setTimeout\(function \(\) \{ if \(SB\.Game\.current === game\) SB\.FirstNight\.begin\(game\); \}/.test(ui));
check("the sky's first lesson says who you are", /you're <b>the Lantern<\/b>: the ark's guiding light/.test(ui) && /indexOf\("why"\)/.test(ui));

console.log("3. no sleeping giant anywhere a player reads");
const ctx = load(["core"]);
vm.runInContext(js("embers.js"), ctx, { filename: "embers.js" });
const E = ctx.SB.Embers, lore = E.LORE.map(p => p[1] + " " + p[2]).join(" ");
check("sixteen lore pages", E.LORE.length === 16 && E.LORE[0][0] === 1 && E.LORE[15][0] === 50);
check("none of them mention the Hollow, a giant or a wish", !/Hollow|giant|wish/i.test(lore));
check("they tell the ark's story", /ark/.test(lore) && /pods?/.test(lore) && /beacon|spire/.test(lore) && /somewhere green/.test(lore));
const subs = (lan.match(/sub: "[^"]*"/g) || []).slice(8).join(" "); // the first 8 belong to the retired opening
check("the story films' captions don't either", !/Hollow|giant|the wish/i.test(subs), (subs.match(/Hollow|giant|the wish/i) || [""])[0]);
check("the last film is “the Lantern is whole”", /THE LANTERN IS WHOLE/.test(lan) && !/THE HOLLOW WAKES/.test(lan));
check("the first-grump film: something already out there, not a smol that turned", /they live where the light doesn't reach/.test(lan));
check("the wreck of the ark is drawn where the giant's brow was", /function wreck\(hx, hy, wash, on\)/.test(lan));
const read = (ui.match(/"[^"\n]*"/g) || []).join(" ");
check("ui.js has no Hollow or giant in anything it shows", !/Hollow|sleeping giant|giant's ear|last spark/.test(read), (read.match(/[^"]{0,30}(Hollow|sleeping giant|giant's ear|last spark)[^"]{0,30}/) || [""])[0]);
check("the voxel look no longer draws the giant", /if \(!V\.SHOW_GIANT \|\|/.test(vox));
check("the “you are Pip” card tells the first day's story", /your pod came down hard, and you were thrown clear/.test(ph));

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
