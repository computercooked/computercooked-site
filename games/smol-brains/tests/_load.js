// Shared loader for node tests: runs the non-DOM game modules in a vm context with a fake window.
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const MODULES = ["core", "genome", "collect", "brain", "chemistry", "lang", "ideas", "words", "worldgen", "world", "creature", "mind", "species", "society", "strangers", "social", "funeral", "firsthour", "tricks", "quests", "orders", "economy", "civ", "director", "sites", "threats", "survival", "save", "main"];
module.exports = function load(only) {
  const dir = path.join(__dirname, "..", "play", "js");
  const ctx = {
    console, Math, Date, JSON, Object, Array, String, Number, Boolean, Error, isNaN, isFinite, parseInt, parseFloat, RegExp, Map, Set,
    Float32Array, Float64Array, Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, ArrayBuffer, DataView,
    TextEncoder, TextDecoder, setTimeout, clearTimeout, setInterval() {}, performance,
    btoa: (s) => Buffer.from(s, "binary").toString("base64"),
    atob: (s) => Buffer.from(s, "base64").toString("binary"),
    localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } },
    document: { readyState: "loading", addEventListener() {}, getElementById() { return null; }, hidden: false },
    addEventListener() {}, location: { search: "", href: "" }, navigator: {}
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of only || MODULES) {
    const p = path.join(dir, f + ".js");
    if (!fs.existsSync(p)) continue;
    vm.runInContext(fs.readFileSync(p, "utf8"), ctx, { filename: f + ".js" });
  }
  return ctx;
};
// run fn with a seeded Math.random (mulberry32; the game context shares this Math), then put the real one back.
// The game's own rng is seeded by the island, but lots of small choices use Math.random: seed it when a check depends on luck.
module.exports.seeded = function (seed, fn) {
  const r0 = Math.random; let s = seed >>> 0;
  Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = r0; }
};
