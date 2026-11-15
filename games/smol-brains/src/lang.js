/* smol brains 2 — lang.js
   Smols invent their own words. Each world (and each tribe) gets a sound palette from its seed, and every
   new idea, village, tribe and species is named in that tongue. Words the smols invent join the lexicon,
   so you can say them back ("krala!") and they understand. */
(function () {
  "use strict";
  var SB = window.SB;
  var L = (SB.Lang = {});

  var CONS = ["b", "d", "g", "k", "l", "m", "n", "p", "r", "s", "t", "v", "z", "sh", "ch", "f", "h", "w", "y", "kr", "gl", "br", "tr", "pl", "mb", "nd", "th", "zh"];
  var VOW = ["a", "e", "i", "o", "u", "aa", "oo", "ee", "ai", "ou", "ü", "y"];
  var CODA = ["", "", "", "n", "k", "r", "l", "m", "s", "sh", "t", "p"];

  // a phonology: a subset of sounds and a syllable style
  L.create = function (seed) {
    var r = SB.rng(seed * 7919 + 17);
    function pickN(arr, n) { var a = arr.slice(), out = []; for (var i = 0; i < n && a.length; i++) out.push(a.splice(r.int(a.length), 1)[0]); return out; }
    return {
      seed: seed,
      cons: pickN(CONS, 7 + r.int(5)),
      vow: pickN(VOW, 3 + r.int(3)),
      coda: pickN(CODA, 3 + r.int(3)),
      open: r.range(0.45, 0.85), // how often syllables end in a vowel
      redup: r.range(0, 0.3),    // "pupu"-style doubling
      apos: r.chance(0.25)       // k'tala
    };
  };

  L.word = function (lang, r, syl) {
    syl = syl || 1 + r.int(2) + (r.chance(0.3) ? 1 : 0);
    var w = "";
    for (var i = 0; i < syl; i++) {
      var s = (i === 0 || r.chance(0.85) ? r.pick(lang.cons) : "") + r.pick(lang.vow);
      if (!r.chance(lang.open)) s += r.pick(lang.coda);
      if (lang.apos && i === 0 && syl > 1 && r.chance(0.3)) s += "'";
      w += s;
    }
    if (r.chance(lang.redup) && w.length < 5) w = w + w;
    w = w.replace(/(.)\1\1+/g, "$1$1");
    if (w.length > 10) w = w.slice(0, 10);
    return w;
  };

  // a unique word not already in the lexicon
  L.fresh = function (lang, r, syl) {
    for (var i = 0; i < 20; i++) {
      var w = L.word(lang, r, syl);
      if (w.length >= 2 && !SB.LEXICON[w] && !SB.SYNONYMS[w]) return w;
    }
    return L.word(lang, r, 3) + "o";
  };

  L.cap = function (w) { return w.charAt(0).toUpperCase() + w.slice(1); };

  // register an invented word so smols (and the player) can use it
  L.addWord = function (word, meaning) {
    SB.LEXICON[word] = meaning;
    if (SB.ALL_WORDS.indexOf(word) < 0) SB.ALL_WORDS.push(word);
  };
})();
