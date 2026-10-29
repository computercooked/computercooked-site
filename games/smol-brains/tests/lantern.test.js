// the opening film, "The Last Lantern" (K-0041 P1): it plays on a fresh save (even from "play now"), can't be
// skipped the first time (except in a playtest), can be after, and hands you the island within 90 s.
// node games/smol-brains/tests/lantern.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
function load(test) {
  const mem = {};
  const window = { localStorage: { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } } };
  window.SB = { TEST: !!test };
  const ctx = vm.createContext({ window, performance: { now: () => 0 }, console });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "play", "js", "lantern.js"), "utf8"), ctx, { filename: "lantern.js" });
  return window.SB.Lantern;
}
const ui = fs.readFileSync(path.join(__dirname, "..", "play", "js", "ui.js"), "utf8");

console.log("1. a fresh save gets the film, a repeat can skip it");
{
  const L = load(false), g = {};
  check("first time: it plays, even from play now", L.shouldPlay(g, true, false) && L.shouldPlay(g, false, true));
  check("first time: no skip", !L.skippable());
  L.markSeen();
  check("after that: skippable", L.skippable());
  check("after that: play now goes straight in", !L.shouldPlay(g, true, false));
  check("after that: create world still tells the story", L.shouldPlay(g, false, false));
  check("new game+ never", !L.shouldPlay({ ngPlus: 1 }, false, false));
  check("a playtest (?cctest=1) can always skip", load(true).skippable());
}

console.log("2. control within 90 s");
{
  const L = load(false);
  const m = ui.match(/R\.cinematic\(\{ dur: SB\.Game\.quickStart \? ([\d.]+) : ([\d.]+)/);
  const drop = m ? Math.max(+m[1], +m[2]) : 99;
  const ark = +(fs.readFileSync(path.join(__dirname, "..", "play", "js", "intro.js"), "utf8").match(/var DUR = ([\d.]+);/) || [0, 99])[1];
  check("the ark film + the Lantern film + the camera drop <= 90 s", ark + L.DUR + drop <= 90, ark + " + " + L.DUR + " + " + drop + " s");
  check("ui.js plays it for a new island", /SB\.Lantern\.shouldPlay\(game/.test(ui));
  check("K-0045: the ark battle and its pod still open the story, then the Lantern film", /SB\.Intro\.play\(\{[^\n]*SB\.Lantern\.play\(/.test(ui));
}

console.log("3. the story beats (K-0041)");
{
  const L = load(false), subs = L.LINES.map(l => l.sub).join(" ");
  ["Hollow", "Lantern", "pod", "Pip", "grump", "remember us", "spark"].forEach(w => check("it tells: " + w, subs.indexOf(w) >= 0));
  check("lines in order, inside the film", L.LINES.every((l, i) => l.at < L.DUR && (i === 0 || l.at > L.LINES[i - 1].at)));
}

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
