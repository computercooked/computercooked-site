// Link-preview cards: games/<slug>/og.png (1200x630) and og-vs.png (the "can you beat it?" version used by
// challenge links). Rendered locally from an SVG template with resvg; no external services.
//
//   npm install --prefix scripts/.og-tools @resvg/resvg-js@2.6.2 wawoff2@2.0.1   (once; the folder is gitignored)
//   node scripts/make-og.mjs            (all games)      node scripts/make-og.mjs crash   (one game)
//
// add-game.ps1 runs this for a new game when the tools are installed.
import { readFileSync, writeFileSync, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tools = join(root, "scripts", ".og-tools");
if (!existsSync(join(tools, "node_modules"))) {
  console.error("missing tools. run: npm install --prefix scripts/.og-tools @resvg/resvg-js@2.6.2 wawoff2@2.0.1");
  process.exit(1);
}
const req = createRequire(join(tools, "package.json"));
const { Resvg } = req("@resvg/resvg-js");
const wawoff = req("wawoff2");

// the site's own font file (woff2) -> a temp .ttf that resvg can load
const fontFile = join(mkdtempSync(join(tmpdir(), "cc-og-")), "jetbrains-mono-800.ttf");
writeFileSync(fontFile, Buffer.from(await wawoff.decompress(readFileSync(join(root, "assets/fonts/jetbrains-mono-latin-800-normal.woff2")))));
const FAMILY = "JetBrains Mono ExtraBold";
const W = 1200, H = 630;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// greedy word wrap for a monospace font (JetBrains Mono advance is 0.6em)
function wrap(text, size, width, maxLines) {
  const per = Math.floor(width / (0.6 * size));
  const lines = [];
  let cur = "";
  for (const w of text.split(/\s+/)) {
    if (w.length > per) return null;
    const next = cur ? cur + " " + w : w;
    if (next.length <= per) cur = next;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines.length <= maxLines ? lines : null;
}
function titleLines(title) {
  for (const size of [84, 72, 62, 54, 46, 40]) {
    const lines = wrap(title, size, 500, 3);
    if (lines) return { size, lines };
  }
  return { size: 40, lines: [title.slice(0, 20)] };
}

function thumbFor(g) {
  const hi = join(root, "games", g.slug, "assets", "thumbnail-640x360.png");
  const path = existsSync(hi) ? hi : join(root, g.thumbnail.replace(/^\//, ""));
  const mime = path.endsWith(".svg") ? "image/svg+xml" : "image/png";
  return `data:${mime};base64,${readFileSync(path).toString("base64")}`;
}

function card(g, vs) {
  const { size, lines } = titleLines(g.title);
  const lh = Math.round(size * 1.08);
  const top = 315 - (lines.length * lh) / 2 + size * 0.78 - (vs ? 10 : 30);
  const title = lines.map((l, i) => {
    const y = Math.round(top + i * lh);
    return `<text x="664" y="${y + 5}" fill="#8f7cff">${esc(l)}</text><text x="660" y="${y}" fill="#C5FF49">${esc(l)}</text>`;
  }).join("");
  const subY = Math.round(top + (lines.length - 1) * lh + 62);
  const sub = vs ? "a friend dared you. play free" : "play free in your browser";
  const tri = 660 + Math.round(sub.length * 0.6 * 27) + 14; // the font subset has no ▶, so draw one
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#16190f"/><stop offset=".45" stop-color="#121317"/><stop offset="1" stop-color="#17151f"/></linearGradient>
    <radialGradient id="glow" cx=".25" cy=".5" r=".45"><stop offset="0" stop-color="#C5FF49" stop-opacity=".16"/><stop offset="1" stop-color="#C5FF49" stop-opacity="0"/></radialGradient>
    <clipPath id="clip"><rect x="64" y="${H / 2 - 158}" width="560" height="315" rx="18"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <g font-family="${FAMILY}, JetBrains Mono">
    <text x="64" y="74" font-size="24" fill="#B59AFF" letter-spacing="2">COMPUTER COOKED GAMES</text>
    <rect x="52" y="${H / 2 - 170}" width="584" height="339" rx="26" fill="#0b0c0f" stroke="#C5FF49" stroke-width="4"/>
    <image x="64" y="${H / 2 - 158}" width="560" height="315" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip)" xlink:href="${thumbFor(g)}"/>
    ${vs ? `<rect x="660" y="${Math.round(top - size - 52)}" width="372" height="52" rx="26" fill="#C5FF49"/><text x="846" y="${Math.round(top - size - 17)}" font-size="26" fill="#111" text-anchor="middle">CAN YOU BEAT IT?</text>` : ""}
    <g font-size="${size}">${title}</g>
    <text x="660" y="${subY}" font-size="27" fill="#F5F3ED">${esc(sub)}</text><path d="M${tri} ${subY - 21}l18 10.5-18 10.5z" fill="#C5FF49"/>
    <text x="1140" y="590" font-size="26" fill="#B59AFF" text-anchor="end">computercooked.com</text>
  </g>
</svg>`;
}

function render(svg) {
  return new Resvg(svg, { fitTo: { mode: "width", value: W }, font: { fontFiles: [fontFile], loadSystemFonts: false, defaultFontFamily: FAMILY } }).render().asPng();
}

const games = JSON.parse(readFileSync(join(root, "games/games.json"), "utf8")).games;
const only = process.argv[2];
for (const g of games) {
  if (only && g.slug !== only) continue;
  if (g.made_by === "community") continue;
  for (const [file, vs] of [["og.png", false], ["og-vs.png", true]]) {
    const png = render(card(g, vs));
    writeFileSync(join(root, "games", g.slug, file), png);
    console.log(`games/${g.slug}/${file}  ${Math.round(png.length / 1024)} KB`);
  }
}
