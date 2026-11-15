// 4.32: fewer boxes, and a tutorial that points. In a body the guide is one line with a marker that says what it is
// for; in the sky the coach speaks alone until its lessons are done, with an arrow on the thing each step is about.
// node games/smol-brains/tests/guide432.test.js
"use strict";
require("./_src.js");
const fs = require("fs"), path = require("path");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const play = f => fs.readFileSync(path.join(__dirname, "..", "play", f), "utf8");
const ui = play("js/ui.js"), ph = play("js/povhud.js"), po = play("js/possess.js"), fn = play("js/firstnight.js"), css = play("style.css");

console.log("1. in a body: one guide line");
check("the guide is always the one-line form", /hud\.quest\.classList\.add\("mini"\)/.test(ph) && !/classList\.toggle\("mini", !!hud\.phone\)/.test(ph));
check("the how-to shows at the start of a step, then folds away", /hud\.tipUntil = Date\.now\(\) \+ HUD\.TIP_MS/.test(ph) && /classList\.toggle\("tipoff", !tipOn\)/.test(ph) && /#pov \.quest\.tipoff \.tip\{display:none\}/.test(ph));
check("tap the line to read it again", /hud\.quest\.onclick = function \(\) \{ hud\.tipOpen = /.test(ph));
check("the marker says what it is for", /P\(\)\.questText\(\)\.text\.replace\(\/ \\\(\.\*\$\/, ""\) \+ " " \+ Math\.round\(d\) \+ "m"/.test(ph));
check("the night's countdown is on the body's clock", /ct = "🌙 night in "/.test(ph));
check("the card no longer sends you to a list", !/the list on the right says what to do/.test(ph) && /follow the marker/.test(ph));
check("on the first day the “who you are” card is put away", /#pov\.fn \.who\{display:none\}/.test(ph) && /classList\.toggle\("fn", !!s\.firstNight\)/.test(ph));

console.log("2. nothing said twice, nothing that is wrong");
check("no “now wake the others” beat on top of the step banner", !/SB\.PovHud\.beat\("😋 better"/.test(fn));
check("the first night never says “left click it with a weapon”", /if \(!s\.firstNight && !g\.boss && !s\.nightChase\) HUD\.say\(/.test(ph));
check("nor the ordinary nightfall lines", /if \(!s\.firstNight\) HUD\.say\("🌙 night\. grumps come out/.test(ph) && /if \(!night \|\| S\.firstNight\) \{ S\.night = null; return; \}/.test(po));

console.log("3. in the sky: the coach speaks alone");
check("while it teaches, only firsts and embers get through", /function coaching\(\)/.test(ui) && /if \(coaching\(\) && cls !== "ach" && cls !== "ember" && cls !== "night"/.test(ui));
check("no goals list beside it until the last step", /if \(coaching\(\) && !tutIs\("guide"\)\) \{ el\.goals\.classList\.add\("hide"\)/.test(ui));
check("and your smol's chip waits too", /#ui:has\(\.coach\) \.minechip \{ display: none; \}/.test(css));
check("last night's firsts are one line, not a parade", /more firsts last night/.test(ui) && !/held\.forEach\(function \(t, k\)/.test(ui));

console.log("4. the coach points, and says less");
const tut = (ui.match(/var TUT = \[([\s\S]*?)\n  \];/) || ["", ""])[1];
const steps = [...tut.matchAll(/\{ id: "(\w+)"[^\n]*?s: "([^\n]*)" \}/g)].map(m => ({ id: m[1], s: m[2].replace(/<[^>]+>/g, "") }));
const long = steps.filter(x => ["pod", "name"].indexOf(x.id) < 0 && x.s.length > 240).map(x => x.id + " " + x.s.length);
check("seven lessons after the night", steps.filter(x => ["pod", "name"].indexOf(x.id) < 0).length === 7, steps.map(x => x.id).join(" "));
check("each fits in two or three lines", !long.length, long.join(", "));
check("every “do this” step has an arrow on the thing", ["look", "food", "tickle", "word", "trick"].every(id => new RegExp('id: "' + id + '", pt: "').test(tut)));
check("the arrow follows the smol, the food or the card", /function tutTarget\(\)/.test(ui) && /class: "tutpt"/.test(ui) && /\.tutpt \{ position: absolute;/.test(css));
check("no food about: one is put down beside the smol", /SB\.World\.add\(game\.world, game, "apple", me\.x \+ 1\.3, me\.z - 1\.5\)/.test(ui));
check("the tricks button glows on its step", /"btn go" \+ \(tutIs\("trick"\) \? " tutglow" : ""\)/.test(ui));

console.log("5. the goals list is one line until you ask");
check("it starts folded", /class: "goals glass live min"/.test(ui));
check("folded, it is the next thing and a count", /class="g one"/.test(ui) && /\(more > 1 \? "\+" \+ \(more - 1\) \+ " " : ""\) \+ "▾/.test(ui));
check("tapping it redraws at once", /classList\.toggle\("min"\); goalKey = ""; updateGoals\(\);/.test(ui));

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
