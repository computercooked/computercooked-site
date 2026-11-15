// smol brains: tools/strip.js
// The game has to stay under 5 MB and its code is large and well commented. The readable sources live in
// games/smol-brains/src/. This writes the copies the game loads, in play/js/:
//   - every comment is taken out (whole-line and at the end of a line),
//   - indentation, blank lines and the spaces the language does not need are taken out.
// Nothing is renamed or reordered and every statement stays on its own line, in the same order, so an error's line
// in the game's copy still points at one real statement. Strings, template strings and regular expressions are
// copied exactly as written.
//
//   node games/smol-brains/tools/strip.js            write play/js/<name>.js from src/<name>.js
//   node games/smol-brains/tools/strip.js --check    exit 1 if any play/js copy is not what its source strips to
//
// EDIT THE FILE IN src/, then run this. tests/strip.test.js fails if the two disagree, or if a copy does not parse.
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, ".."), SRC = path.join(ROOT, "src"), OUT = path.join(ROOT, "play", "js");
const WORD = /[A-Za-z0-9_$]/;
// after one of these words a "/" starts a regular expression, not a division
const RE_AFTER = { "return": 1, "typeof": 1, "case": 1, "in": 1, "of": 1, "do": 1, "else": 1, "void": 1, "delete": 1, "instanceof": 1, "new": 1, "throw": 1 };
// where a template string that starts at s[i] (a backtick) ends: the index just past its closing backtick
function endOfTemplate(s, i) {
  i++;
  while (i < s.length) {
    const ch = s[i];
    if (ch === "\\") { i += 2; continue; }
    if (ch === "`") return i + 1;
    if (ch === "$" && s[i + 1] === "{") {
      let depth = 1; i += 2;
      while (i < s.length && depth > 0) {
        const c = s[i];
        if (c === "`") { i = endOfTemplate(s, i); continue; }
        if (c === '"' || c === "'") { i = endOfString(s, i); continue; }
        if (c === "{") depth++; else if (c === "}") depth--;
        i++;
      }
      continue;
    }
    i++;
  }
  return i;
}
function endOfString(s, i) {
  const q = s[i]; i++;
  while (i < s.length) { const ch = s[i]; if (ch === "\\") { i += 2; continue; } if (ch === q || ch === "\n") return i + 1; i++; }
  return i;
}
// where a regular expression that starts at s[i] (a slash) ends, flags included; -1 if this is not one
function endOfRegex(s, i) {
  let j = i + 1, cls = false;
  while (j < s.length) {
    const ch = s[j];
    if (ch === "\n") return -1;
    if (ch === "\\") { j += 2; continue; }
    if (cls) { if (ch === "]") cls = false; }
    else if (ch === "[") cls = true;
    else if (ch === "/") { j++; while (j < s.length && /[a-z]/.test(s[j])) j++; return j; }
    j++;
  }
  return -1;
}
function squeeze(text) {
  const s = text.replace(/\r\n/g, "\n");
  let out = "", i = 0, last = "", word = "", gap = false;   // last: the last character written that matters; word: the word it ended
  function put(str, isWord) {
    if (gap && out && out[out.length - 1] !== "\n") {
      const a = out[out.length - 1], b = str[0];
      if ((WORD.test(a) && WORD.test(b)) || (a === "+" && b === "+") || (a === "-" && b === "-")) out += " ";
    }
    gap = false; out += str; last = str[str.length - 1]; word = isWord ? str : "";
  }
  while (i < s.length) {
    const ch = s[i], nx = s[i + 1];
    if (ch === "\n") { if (out && out[out.length - 1] !== "\n") out += "\n"; gap = false; i++; continue; }
    if (ch === " " || ch === "\t") { gap = true; i++; continue; }
    if (ch === "/" && nx === "/") { while (i < s.length && s[i] !== "\n") i++; continue; }
    if (ch === "/" && nx === "*") { const e = s.indexOf("*/", i + 2), end = e < 0 ? s.length : e + 2; if (s.slice(i, end).indexOf("\n") >= 0 && out && out[out.length - 1] !== "\n") out += "\n"; gap = true; i = end; continue; }
    if (ch === '"' || ch === "'") { const e = endOfString(s, i); put(s.slice(i, e), false); last = '"'; i = e; continue; }
    if (ch === "`") { const e = endOfTemplate(s, i); put(s.slice(i, e), false); last = '"'; i = e; continue; }
    if (ch === "/") {
      const re = !last || (word ? RE_AFTER[word] === 1 : "(,=:[!&|?{};+-*%<>~^}".indexOf(last) >= 0);
      if (re) { const e = endOfRegex(s, i); if (e > 0) { put(s.slice(i, e), false); last = '"'; i = e; continue; } }
      put("/", false); i++; continue;
    }
    if (WORD.test(ch)) { let j = i + 1; while (j < s.length && WORD.test(s[j])) j++; put(s.slice(i, j), true); i = j; continue; }
    put(ch, false); i++;
  }
  return out.replace(/\n+$/, "");
}
function strip(text, name) {
  return "/* smol brains: " + name + " (built from src/" + name + " by tools/strip.js: edit that file, not this one) */\r\n" + squeeze(text).split("\n").join("\r\n") + "\r\n";
}
// does it still parse as a script?
function parses(code, name) { try { new vm.Script(code, { filename: name }); return ""; } catch (e) { return String(e && e.message); } }
module.exports = { strip: strip, squeeze: squeeze, parses: parses, SRC: SRC, OUT: OUT };
if (require.main === module) {
  const check = process.argv.indexOf("--check") >= 0;
  if (!fs.existsSync(SRC)) { console.log("no src folder"); process.exit(check ? 1 : 0); }
  let bad = 0, a = 0, b = 0;
  fs.readdirSync(SRC).filter(f => /\.js$/.test(f)).sort().forEach(f => {
    const src = fs.readFileSync(path.join(SRC, f), "utf8"), want = strip(src, f), to = path.join(OUT, f);
    const have = fs.existsSync(to) ? fs.readFileSync(to, "utf8") : null;
    a += Buffer.byteLength(src); b += Buffer.byteLength(want);
    const err = parses(want, f);
    if (err) { bad++; console.log("DOES NOT PARSE: " + f + ": " + err); return; }
    if (check) { if (have !== want) { bad++; console.log("stale: play/js/" + f); } }
    else if (have !== want) { fs.writeFileSync(to, want); console.log("wrote play/js/" + f + "  " + Math.round(Buffer.byteLength(src) / 1024) + "K -> " + Math.round(Buffer.byteLength(want) / 1024) + "K"); }
  });
  console.log((check ? (bad ? bad + " wrong" : "all current") : "done") + "  (" + Math.round(a / 1024) + "K of source, " + Math.round(b / 1024) + "K in the game)");
  process.exit(bad ? 1 : 0);
}
