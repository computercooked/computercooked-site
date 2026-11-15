// The game loads compact copies of its code (play/js); the readable, commented sources are in src/. This fails if a
// copy is not exactly what its source strips to (someone edited the copy, or forgot to run tools/strip.js), and
// checks the stripping itself on small cases.
// node games/smol-brains/tests/strip.test.js
"use strict";
const fs = require("fs"), path = require("path");
const T = require("../tools/strip.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const body = s => T.strip(s, "x.js").split("\r\n").slice(1).join("\n");
check("whole-line comments and blank lines go", body("// a\n\nvar a = 1;\n   // b\n") === "var a = 1;\n");
check("indentation goes, the code stays as written", body("  if (a) {\n      b();   \n  }\n") === "if (a) {\nb();\n}\n");
check("a comment after code is left alone (it could be inside a string)", body("var u = \"http://x\"; // keep\n") === "var u = \"http://x\"; // keep\n");
check("a block comment at the start of a line goes, over many lines too", body("/* one */\nvar a;\n/* two\n   three */ var b;\n/* four\nfive\n*/\nvar c;\n") === "var a;\nvar b;\nvar c;\n");
check("a block comment in the middle of a line is left alone", body("var a = /* why */ 1;\n") === "var a = /* why */ 1;\n");
check("a regex that looks like a comment mid-line is left alone", body("x = s.replace(/\/\//g, \"\");\n") === "x = s.replace(/\/\//g, \"\");\n");
const srcs = fs.readdirSync(T.SRC).filter(f => /\.js$/.test(f)), stale = [], missing = [], orphan = [];
srcs.forEach(f => { const to = path.join(T.OUT, f); if (!fs.existsSync(to)) { missing.push(f); return; } if (fs.readFileSync(to, "utf8") !== T.strip(fs.readFileSync(path.join(T.SRC, f), "utf8"), f)) stale.push(f); });
fs.readdirSync(T.OUT).filter(f => /\.js$/.test(f)).forEach(f => { if (srcs.indexOf(f) < 0) orphan.push(f); });
check("every source has its copy in the game (" + srcs.length + " files)", !missing.length, missing.join(" "));
check("every copy is exactly what its source strips to (run tools/strip.js)", !stale.length, stale.join(" "));
check("nothing in play/js without a source", !orphan.length, orphan.join(" "));
const html = fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8");
const loaded = (html.match(/src="js\/([a-z0-9-]+\.js)"/g) || []).map(s => s.slice(8, -1));
check("everything index.html loads is there", loaded.every(f => srcs.indexOf(f) >= 0), loaded.filter(f => srcs.indexOf(f) < 0).join(" "));
const kb = fs.readdirSync(T.OUT).reduce((a, f) => a + fs.statSync(path.join(T.OUT, f)).size, 0) / 1024;
check("the game's code is under 4.2 MB (the whole game must stay under 5)", kb < 4200, Math.round(kb) + " KB");
console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
