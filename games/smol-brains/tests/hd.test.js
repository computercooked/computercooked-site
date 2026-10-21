// The hd pixel look (hd.js): meshes get the right generated tiles, the art files are there and small, the item
// sprite index covers the things you pick up, and the default look is unchanged.
// node games/smol-brains/tests/hd.test.js
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const load = require("./_load.js");
const PLAY = path.join(__dirname, "..", "play");

let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }

const ctx = load(["core", "meshes"]);
const SB = ctx.SB;
let loaded = null;
SB.Render = { afterObjects() {}, loadArt(m, done) { loaded = m; }, camera: {}, gl() { return null; }, quality: {}, art: {}, PREC: "", LIGHT_GLSL: "" };
SB.GL = { texture() {}, program() {}, buffer() {} };
vm.runInContext(fs.readFileSync(path.join(PLAY, "js", "hd.js"), "utf8"), ctx, { filename: "hd.js" });
const HD = SB.HD, ME = SB.Meshes, T = HD.TILE;

console.log("1. meshes wear the right tiles");
function tilesOf(key, mesh) {
  const m = HD.materials(key, mesh.data, mesh.count, ME.STRIDE), seen = new Set();
  for (const v of m) if (v) seen.add(v - 1);
  return seen;
}
const has = (set, ...ids) => ids.every((i) => set.has(i));
check("oak: bark and leaves", has(tilesOf("n:oak", ME.NODE_BUILDERS.oak(1)), T.bark, T.leaves));
check("pine: needles", tilesOf("n:pine", ME.NODE_BUILDERS.pine(1)).has(T.needles));
check("sakura: blossom", tilesOf("n:sakura", ME.NODE_BUILDERS.sakura(1)).has(T.blossom));
check("palm: fronds", tilesOf("n:palm", ME.NODE_BUILDERS.palm(1)).has(T.palm));
check("boulder: rock", tilesOf("n:boulder", ME.NODE_BUILDERS.boulder(1)).has(T.rock));
const hut = tilesOf("s:hut", ME.STRUCT_BUILDERS.hut());
check("hut: thatch, planks and a stone footing", has(hut, T.thatch, T.planks, T.brick), [...hut].join(","));
check("farm: tilled soil", tilesOf("s:farm", ME.STRUCT_BUILDERS.farm()).has(T.farmland));
const roofed = Object.keys(ME.STRUCT_BUILDERS).filter((k) => tilesOf("s:" + k, ME.STRUCT_BUILDERS[k]()).has(T.roof));
check("some buildings have tiled roofs", roofed.length > 0, roofed.join(","));
check("items, creature parts and decor stay plain", [...tilesOf("i:apple", ME.itemMesh("apple")), ...tilesOf("p:body", ME.PARTS.body()), ...tilesOf("d:0", ME.DECOR_BUILDERS[0]())].length === 0);
check("flames and window glow stay plain", tilesOf("s:flame", ME.STRUCT_BUILDERS.flame()).size === 0);

console.log("2. the art");
const ART = path.join(PLAY, "art", "hd");
const files = fs.readdirSync(ART);
let bytes = 0; for (const f of files) bytes += fs.statSync(path.join(ART, f)).size;
check("tiles, items and the item index ship", ["tiles.png", "items.png", "items.json"].every((f) => files.includes(f)));
check("hd art stays under 2.5 MB", bytes < 2.5e6, (bytes / 1024).toFixed(0) + " KB");
const png = (f) => { const b = fs.readFileSync(path.join(ART, f)); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
const tp = png("tiles.png");
check("tile atlas is 4x4 of 64px", tp.w === 256 && tp.h === 256, tp.w + "x" + tp.h);
const idx = JSON.parse(fs.readFileSync(path.join(ART, "items.json"), "utf8")), ip = png("items.png");
check("item index matches its atlas", idx.w === ip.w && idx.h === ip.h);
const want = ["apple", "berry", "cherry", "stick", "stone", "clay", "egg", "ore", "flint", "shroom", "grain", "carrot", "pumpkin"];
check("sprites for the everyday pickups", want.every((k) => idx.items[k]), want.filter((k) => !idx.items[k]).join(","));
check("every sprite is a real item kind", Object.keys(idx.items).every((k) => SB.KINDS[k]));
let inside = true;
for (const k in idx.items) for (const s of idx.sizes) { const c = idx.items[k][s]; if (!c || c[0] + s > idx.w || c[1] + s > idx.h || c[2] >= s) inside = false; }
check("every sprite cell (32, 16 and 12 px) sits inside the atlas", inside);

console.log("3. switching looks");
HD.init({ gl: null });
check("hd art is only requested by HD.init", !!loaded && /art\/hd\/tiles\.png/.test(loaded.hdTiles.url));
const main = fs.readFileSync(path.join(PLAY, "js", "main.js"), "utf8");
check("default look is still the pixel look", /pixel: look !== "3d", hd: look === "hd"/.test(main));
const html = fs.readFileSync(path.join(PLAY, "index.html"), "utf8");
check("hd.js loads after pixel.js and before bodies.js", html.indexOf("js/pixel.js") < html.indexOf("js/hd.js") && html.indexOf("js/hd.js") < html.indexOf("js/bodies.js"));
const render = fs.readFileSync(path.join(PLAY, "js", "render.js"), "utf8");
check("hd shader code only compiles with #define HD", (render.match(/#ifdef HD/g) || []).length >= 5 && /R\.hd \? "#define HD\\n" : ""/.test(render));

console.log(failed ? "\n" + failed + " FAILED" : "\nall hd tests passed");
process.exit(failed ? 1 : 0);
