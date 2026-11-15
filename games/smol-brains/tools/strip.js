// smol brains: tools/strip.js
// The plug-in systems (home, loot, fight, friends, animals, harvest, dark, deep, town, powers, qol) are large and well
// commented, and the game has to stay under 5 MB. Their readable sources live in games/smol-brains/src/. This writes
// the copies the game loads, in play/js/, with whole-line comments, indentation and blank lines taken out. Nothing
// else is changed: no renaming, no rewriting, so a line number in the game's copy still points at real code.
//
//   node games/smol-brains/tools/strip.js            write play/js/<name>.js from src/<name>.js
//   node games/smol-brains/tools/strip.js --check    exit 1 if any play/js copy is not what its source strips to
//
// EDIT THE FILE IN src/, then run this. tests/strip.test.js fails if the two disagree.
"use strict";
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, ".."), SRC = path.join(ROOT, "src"), OUT = path.join(ROOT, "play", "js");
function strip(text, name) {
  const lines = text.replace(/\r\n/g, "\n").split("\n"), out = [];
  let inBlock = false;
  for (let i = 0; i < lines.length; i++) {
    let ln = lines[i].replace(/\s+$/, "");
    const t = ln.replace(/^\s+/, "");
    if (inBlock) { if (t.indexOf("*/") >= 0) { inBlock = false; const rest = t.slice(t.indexOf("*/") + 2).trim(); if (rest) out.push(rest); } continue; }
    if (!t) continue;
    if (t.slice(0, 2) === "//") continue;                       // a line that is only a comment
    if (t.slice(0, 2) === "/*") {                               // a block comment that starts the line
      const end = t.indexOf("*/", 2);
      if (end < 0) { inBlock = true; continue; }
      const rest = t.slice(end + 2).trim(); if (rest) out.push(rest);
      continue;
    }
    out.push(t);
  }
  return "/* smol brains: " + name + " (built from src/" + name + " by tools/strip.js: edit that file, not this one) */\r\n" + out.join("\r\n") + "\r\n";
}
module.exports = { strip: strip, SRC: SRC, OUT: OUT };
if (require.main === module) {
  const check = process.argv.indexOf("--check") >= 0;
  if (!fs.existsSync(SRC)) { console.log("no src folder"); process.exit(check ? 1 : 0); }
  let bad = 0, a = 0, b = 0;
  fs.readdirSync(SRC).filter(f => /\.js$/.test(f)).sort().forEach(f => {
    const src = fs.readFileSync(path.join(SRC, f), "utf8"), want = strip(src, f), to = path.join(OUT, f);
    const have = fs.existsSync(to) ? fs.readFileSync(to, "utf8") : null;
    a += Buffer.byteLength(src); b += Buffer.byteLength(want);
    if (check) { if (have !== want) { bad++; console.log("stale: play/js/" + f); } }
    else if (have !== want) { fs.writeFileSync(to, want); console.log("wrote play/js/" + f + "  " + Math.round(Buffer.byteLength(src) / 1024) + "K -> " + Math.round(Buffer.byteLength(want) / 1024) + "K"); }
  });
  console.log((check ? (bad ? bad + " stale" : "all current") : "done") + "  (" + Math.round(a / 1024) + "K of source, " + Math.round(b / 1024) + "K in the game)");
  process.exit(bad ? 1 : 0);
}
