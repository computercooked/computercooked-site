// App icons for the web app manifest (add to home screen): assets/icon-192.png, icon-512.png and
// icon-maskable-512.png, rendered from assets/logo.svg with resvg. Same tools as make-og.mjs:
//
//   npm install --prefix scripts/.og-tools @resvg/resvg-js@2.6.2 wawoff2@2.0.1   (once; the folder is gitignored)
//   node scripts/make-icons.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tools = join(root, "scripts", ".og-tools");
if (!existsSync(join(tools, "node_modules"))) {
  console.error("missing tools. run: npm install --prefix scripts/.og-tools @resvg/resvg-js@2.6.2 wawoff2@2.0.1");
  process.exit(1);
}
const { Resvg } = createRequire(join(tools, "package.json"))("@resvg/resvg-js");

const logo = readFileSync(join(root, "assets", "logo.svg"), "utf8");
const inner = logo.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
// "any" icons are the logo as is (rounded square). The maskable one fills the whole square with the
// background and shrinks the drawing into the middle 70%, inside the safe zone launchers crop to.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#101114"/>` +
  `<g transform="translate(76.8 76.8) scale(0.7)">${inner.replace('rx="112" ', "")}</g></svg>`;

const out = [
  ["icon-192.png", logo, 192],
  ["icon-512.png", logo, 512],
  ["icon-maskable-512.png", maskable, 512],
];
for (const [name, svg, size] of out) {
  const png = new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
  writeFileSync(join(root, "assets", name), png);
  console.log("wrote assets/" + name, png.length, "bytes");
}
