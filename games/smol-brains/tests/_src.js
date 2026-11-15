// The game loads compact copies of its code (play/js), written from the readable sources (src) by tools/strip.js.
// Tests were written against readable code, and many search it as text, so by default a test that reads
// play/js/<name>.js is handed src/<name>.js instead. Set SB_COMPACT=1 to run a test on the copies the game really
// loads; tests/compact.test.js runs one island on both and checks they come out the same.
"use strict";
const fs = require("fs"), path = require("path");
if (!fs._sbSrc) {
  const real = fs.readFileSync, PLAY = path.join(__dirname, "..", "play", "js") + path.sep, SRC = path.join(__dirname, "..", "src");
  fs.readFileSync = function (p) {
    if (typeof p === "string" && !process.env.SB_COMPACT) {
      const full = path.resolve(p);
      if (full.slice(0, PLAY.length).toLowerCase() === PLAY.toLowerCase() && /\.js$/.test(full)) {
        const alt = path.join(SRC, full.slice(PLAY.length));
        if (fs.existsSync(alt)) { const a = Array.prototype.slice.call(arguments); a[0] = alt; return real.apply(fs, a); }
      }
    }
    return real.apply(fs, arguments);
  };
  fs._sbSrc = true;
}
