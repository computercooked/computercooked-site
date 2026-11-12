// 4.21.1: a sound slider and a music slider (owner, Nov 12), on the home screen's settings and in the game's.
// node games/smol-brains/tests/volume.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");
function boot(store) {
  const ctx = load(["core"]);
  if (store) ctx.localStorage._d = store;
  ["audio.js", "music.js"].forEach(f => vm.runInContext(js(f), ctx, { filename: f }));
  return ctx;
}

console.log("1. the sound volume");
const a = boot(), A = a.SB.Audio;
check("starts full", A.soundVolume() === 1);
A.setSoundVolume(0.35);
check("it can be turned down", Math.abs(A.soundVolume() - 0.35) < 1e-9);
A.setSoundVolume(7); check("and is kept between 0 and 1", A.soundVolume() === 1);
A.setSoundVolume(-2); check("both ways", A.soundVolume() === 0);
A.setSoundVolume(0.6);
const b = boot(a.localStorage._d);
check("it's remembered on the device", Math.abs(b.SB.Audio.soundVolume() - 0.6) < 1e-9);

console.log("2. the music volume");
b.SB.Music.setVolume(0.25);
check("music has its own level", Math.abs(b.SB.Music.volume() - 0.25) < 1e-9 && Math.abs(b.SB.Audio.soundVolume() - 0.6) < 1e-9);
check("and it's remembered too", Math.abs(boot(b.localStorage._d).SB.Music.volume() - 0.25) < 1e-9);

console.log("3. the sliders");
const au = js("audio.js"), ui = js("ui.js"), ti = js("title.js");
check("audio.js builds a sound and a music slider", /A\.sliders = function/.test(au) && /row\("🔊 sound"/.test(au) && /row\("♪ music"/.test(au) && /inp\.type = "range"/.test(au));
check("the sound slider covers effects, voices and ambience", /\[\[sfxBus, BUS0\.sfx\], \[voiceBus, BUS0\.voice\], \[ambBus, BUS0\.amb\]\]/.test(au));
check("the home screen's settings show them", /SB\.Audio\.sliders\(\)/.test(ti) && !/\["0\.4", "quiet"\]/.test(ti));
check("so do the game's settings", /SB\.Audio\.sliders\(\)/.test(ui) && !/\["quiet", 0\.4\]/.test(ui));

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
