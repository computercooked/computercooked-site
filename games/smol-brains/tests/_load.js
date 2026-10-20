// Shared loader for node tests: runs the non-DOM game modules in a vm context with a fake window.
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const MODULES = ["core", "genome", "brain", "chemistry", "lang", "ideas", "worldgen", "world", "creature", "species", "society", "save", "main"];
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
