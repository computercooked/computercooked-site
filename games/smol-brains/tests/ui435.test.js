// 4.35.1: a plug-in system that speaks before the sky's screen is built must not throw (ext.js switches a handler
// that throws off for the whole session; deep.js lost its tick that way on the live 4.35.0 page).
// node games/smol-brains/tests/ui435.test.js
"use strict";
require("./_src.js");
const fs = require("fs"), path = require("path");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const ui = fs.readFileSync(path.join(__dirname, "..", "play", "js", "ui.js"), "utf8");
const i = ui.indexOf("function toast(html, cls, ms, at)"), j = ui.indexOf("el.toasts.children", i), g = ui.indexOf("if (!el.toasts) return;", i);
check("toast is there", i > 0 && j > i);
check("it leaves quietly when there is no screen yet, before it touches the toast list", g > i && g < j, i + " " + g + " " + j);
check("no other use of the toast list comes before that guard inside toast", ui.slice(i, g).indexOf("el.toasts") < 0);
console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
