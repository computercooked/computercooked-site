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
check("whole-line comments and blank lines go", body("// a\n\nvar a = 1;\n   // b\n") === "var a=1;\n");
check("indentation and unneeded spaces go, one statement a line stays", body("  if (a) {\n      b();   \n  }\n") === "if(a){\nb();\n}\n");
check("a comment after code goes; a // inside a string stays", body("var u = \"http://x\"; // gone\n") === "var u=\"http://x\";\n");
check("block comments go, over many lines too", body("/* one */\nvar a;\n/* two\n   three */ var b;\n/* four\nfive\n*/\nvar c;\nvar d = /* why */ 1;\n") === "var a;\nvar b;\nvar c;\nvar d=1;\n");
check("words keep the space between them", body("var a = typeof b;\nreturn x in y;\nelse if (a instanceof B) c();\n") === "var a=typeof b;\nreturn x in y;\nelse if(a instanceof B)c();\n");
check("a + +b, a - -b and a++ + b keep their space", body("x = a + +b;\ny = a - -b;\nz = a++ + b;\nw = a - b;\n") === "x=a+ +b;\ny=a- -b;\nz=a++ +b;\nw=a-b;\n");
check("strings are copied exactly, spaces and all", body("s = 'a  b // c' + \"d  /* e */\";\n") === "s='a  b // c'+\"d  /* e */\";\n");
check("a regular expression is copied exactly", body("x = s.replace(/\\/\\/ a  b/g, \"\");\nif (/^(a|an|the) /.test(s)) y = s.split(/ +/);\n") === "x=s.replace(/\\/\\/ a  b/g,\"\");\nif(/^(a|an|the) /.test(s))y=s.split(/ +/);\n");
check("a slash in a character class does not end it", body("r = /[/ ]+ x/.test(a);\n") === "r=/[/ ]+ x/.test(a);\n");
check("division is not taken for a regular expression", body("a = b / c / d;\ne = (f + g) / 2; // h / i\nk = m[0] / n;\n") === "a=b/c/d;\ne=(f+g)/2;\nk=m[0]/n;\n");
check("a template string is copied exactly, over lines too", body("t = `a  ${ b + 1 }  // c\n   d`;\nu = 1;\n") === "t=`a  ${ b + 1 }  // c\n   d`;\nu=1;\n");
check("what it writes still parses, and it says so when it would not", T.parses(T.strip("var a = 1; // x\nfunction f(b) { return b / 2; }\n", "x.js"), "x.js") === "" && T.parses("var = ;", "x.js") !== "");
const srcs = fs.readdirSync(T.SRC).filter(f => /\.js$/.test(f)), stale = [], missing = [], orphan = [];
srcs.forEach(f => { const to = path.join(T.OUT, f); if (!fs.existsSync(to)) { missing.push(f); return; } if (fs.readFileSync(to, "utf8") !== T.strip(fs.readFileSync(path.join(T.SRC, f), "utf8"), f)) stale.push(f); });
fs.readdirSync(T.OUT).filter(f => /\.js$/.test(f)).forEach(f => { if (srcs.indexOf(f) < 0) orphan.push(f); });
check("every source has its copy in the game (" + srcs.length + " files)", !missing.length, missing.join(" "));
check("every copy is exactly what its source strips to (run tools/strip.js)", !stale.length, stale.join(" "));
const broken = srcs.filter(f => fs.existsSync(path.join(T.OUT, f)) && T.parses(fs.readFileSync(path.join(T.OUT, f), "utf8"), f));
check("every copy parses", !broken.length, broken.join(" "));
check("nothing in play/js without a source", !orphan.length, orphan.join(" "));
const html = fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8");
const loaded = (html.match(/src="js\/([a-z0-9-]+\.js)"/g) || []).map(s => s.slice(8, -1));
check("everything index.html loads is there", loaded.every(f => srcs.indexOf(f) >= 0), loaded.filter(f => srcs.indexOf(f) < 0).join(" "));
const kb = fs.readdirSync(T.OUT).reduce((a, f) => a + fs.statSync(path.join(T.OUT, f)).size, 0) / 1024;
check("the game's code is under 3.8 MB (the whole game must stay under 5)", kb < 3800, Math.round(kb) + " KB");
console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
