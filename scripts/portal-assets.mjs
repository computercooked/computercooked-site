#!/usr/bin/env node
// The asset kit portals ask for (docs/portals.md), made from the running game and our own art only:
//   node scripts/portal-assets.mjs <slug> [slug ...]
// BASE = where the game is served (default http://127.0.0.1:8814, the static preview: python -m http.server 8814).
// Needs ffmpeg on the PATH and Playwright (PLAYWRIGHT=<folder with node_modules/playwright>, CHROME=<chrome.exe> if
// Playwright's own browser isn't installed). Nothing is uploaded: accounts and submissions are Ashton's.
//
// Round 25. Each game is played twice in Chrome, the same way as its card clip (scripts/clip-drivers.mjs):
// landscape at 1920x1080 and portrait (a phone, touch) at 1080x1620, recorded from Chrome's own frame stream.
// dist/portal-assets/<slug>/ then holds:
//   cover-1920x1080, cover-1280x720, cover-1280x550, cover-800x1200, cover-800x800, cover-630x500   (title on gameplay)
//   gd-512x512, gd-512x384, gd-200x120                                                          (title on gameplay)
//   square-628x628-notext.png        Poki's thumbnail: gameplay only, no text
//   screenshot-1..4-1920x1080.jpg, screenshot-p1..p2-1080x1620.jpg
//   preview-16x9-1920x1080.mp4, preview-2x3-1080x1620.mp4   (15 s, silent, H.264)
//   store.md                          the store text (from docs/portal-store-text.md)
// Covers carry the game's title and nothing else: no URL, no "play free", no other branding (CrazyGames: title text
// only, no cross-promotion). The title is set in the site's own font (JetBrains Mono ExtraBold) in the game's accent.
import { mkdirSync, rmSync, readdirSync, existsSync, readFileSync, writeFileSync, copyFileSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { DRIVE, WAIT, ON_TITLE, QUERY } from "./clip-drivers.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE || "http://127.0.0.1:8814";
const slugs = process.argv.slice(2);
if (!slugs.length) { console.error("usage: node scripts/portal-assets.mjs <slug> [slug ...]   (BASE=… for another server)"); process.exit(1); }
const req = createRequire(process.env.PLAYWRIGHT ? join(resolve(process.env.PLAYWRIGHT), "x.js") : import.meta.url);
const { chromium } = req("playwright");
const games = JSON.parse(readFileSync(join(ROOT, "games/games.json"), "utf8")).games;
const font = readFileSync(join(ROOT, "assets/fonts/jetbrains-mono-latin-800-normal.woff2")).toString("base64");
const store = existsSync(join(ROOT, "docs/portal-store-text.md")) ? readFileSync(join(ROOT, "docs/portal-store-text.md"), "utf8").replace(/\r\n/g, "\n") : "";
// games whose ?cctest=1 shows a test-only control on screen (bellchain's "test: recast card" button)
const NO_TEST = new Set(["bellchain"]);
const SECS = 15;
const ff = (...a) => execFileSync("ffmpeg", ["-v", "error", "-y", ...a], { stdio: "inherit" });

// clicks the first visible "next" / "play again" / "replay" / "retry" button, if a results card is up
const CONTINUE = () => {
  const vis = (b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(b).visibility !== "hidden"; };
  const btns = [...document.querySelectorAll("button, a.btn, [role=button]")].filter(vis);
  for (const re of [/^next\b/i, /^play again\b/i, /^again\b/i, /^replay\b/i, /^retry\b/i, /^try again\b/i]) {
    const b = btns.find((x) => re.test((x.textContent || "").trim()));
    if (b) { b.click(); return true; }
  }
  return false;
};

// play one game in one shape and keep Chrome's frames (with their times) for SECS seconds after the drive starts
async function record(browser, g, shape, dir) {
  const phone = shape === "portrait";
  const view = phone ? { width: 720, height: 1080 } : { width: 1280, height: 720 };
  const ctx = await browser.newContext({ viewport: view, deviceScaleFactor: 1.5, isMobile: phone, hasTouch: phone });
  const page = await ctx.newPage();
  if (!ON_TITLE.has(g.slug)) await page.addInitScript((slug) => {
    try { sessionStorage.setItem("cc-autostart", JSON.stringify({ game: slug, t: Date.now() })); } catch (e) {}
  }, g.slug);
  const q = (NO_TEST.has(g.slug) ? "?" : "?cctest=1") + (QUERY[g.slug] || "");
  await page.goto(`${BASE}/games/${g.slug}/play/${q.replace(/^\?&/, "?")}`, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(WAIT[g.slug] || 1500);
  const drive = DRIVE[g.slug];
  // start the run: a tap in the middle and the usual start keys (a title's own start button isn't always in the middle)
  if (!ON_TITLE.has(g.slug)) {
    await page.mouse.click(view.width / 2, view.height / 2);
    await page.keyboard.press("Enter");
    await page.keyboard.press("Space");
  }
  await page.waitForTimeout(900);
  if (drive) await page.evaluate(drive);
  mkdirSync(dir, { recursive: true });
  const frames = [];
  const cdp = await ctx.newCDPSession(page);
  cdp.on("Page.screencastFrame", (f) => {
    const file = join(dir, `f${String(frames.length).padStart(5, "0")}.jpg`);
    writeFileSync(file, Buffer.from(f.data, "base64"));
    frames.push({ file, t: f.metadata.timestamp });
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: view.width * 1.5, maxHeight: view.height * 1.5, everyNthFrame: 1 });
  const keys = ["ArrowRight", "Space", "ArrowLeft", "ArrowUp"];
  const t0 = Date.now();
  for (let i = 0; Date.now() - t0 < SECS * 1000 + 600; i++) {
    // a finished level or run would sit on its results card for the rest of the clip: keep playing
    if (!ON_TITLE.has(g.slug) && i % 4 === 2) await page.evaluate(CONTINUE).catch(() => {});
    if (!drive && !ON_TITLE.has(g.slug) && i % 3 === 0) {
      await page.mouse.click(view.width * (0.3 + 0.4 * Math.random()), view.height * (0.35 + 0.4 * Math.random()));
      await page.keyboard.press(keys[i % keys.length]);
    }
    await page.waitForTimeout(330);
  }
  await cdp.send("Page.stopScreencast").catch(() => {});
  await ctx.close();
  return frames;
}

// frames → a constant 30 fps clip of SECS seconds (each frame held until the next one arrived)
function video(frames, list, out, w, h) {
  const lines = [];
  for (let i = 0; i < frames.length; i++) {
    const next = frames[i + 1] ? frames[i + 1].t : frames[i].t + 1 / 30;
    lines.push(`file '${frames[i].file.replace(/\\/g, "/")}'`, `duration ${Math.max(0.001, next - frames[i].t).toFixed(4)}`);
  }
  lines.push(`file '${frames[frames.length - 1].file.replace(/\\/g, "/")}'`);
  writeFileSync(list, lines.join("\n"));
  ff("-f", "concat", "-safe", "0", "-i", list, "-t", String(SECS), "-vf", `scale=${w}:${h}:flags=lanczos,fps=30,format=yuv420p`,
    "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-maxrate", "6M", "-bufsize", "12M", "-an", "-movflags", "+faststart", out); // busy scenes (smol brains' island) hit 30+ Mbps at crf 22 alone
}

// a frame at a share of the way through the recording
const at = (frames, share) => frames[Math.min(frames.length - 1, Math.floor(frames.length * share))].file;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function coverHtml(g, img, w, h, withTitle) {
  const accent = (g.theme && g.theme.accent) || "#48e0ff", bg = (g.theme && g.theme.bg) || "#0b0c0f";
  const rgb = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16)).join(",");
  const portrait = h > w;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:T;src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:800}
html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:${bg}}
.bg{position:absolute;inset:0;background:url(data:image/jpeg;base64,${readFileSync(img).toString("base64")}) center/cover no-repeat}
.shade{position:absolute;inset:0;background:linear-gradient(to top,rgba(${rgb},.94) 0%,rgba(${rgb},.7) ${portrait ? 26 : 30}%,rgba(${rgb},0) ${portrait ? 52 : 62}%)}
.t{position:absolute;left:${Math.round(w * 0.055)}px;right:${Math.round(w * 0.055)}px;bottom:${Math.round(h * 0.07)}px;font-family:T;font-weight:800;
  line-height:1.02;letter-spacing:-0.02em;color:${accent};overflow-wrap:normal;word-break:keep-all}
</style></head><body><div class="bg"></div>${withTitle ? `<div class="shade"></div><div class="t" id="t">${esc(g.title)}</div>` : ""}</body></html>`;
}
// biggest title that fits: at most 3 lines, no word wider than the box, the block no taller than ~40% of the frame
async function fitTitle(page, w, h) {
  await page.evaluate(({ w, h }) => new Promise((done) => document.fonts.ready.then(() => {
    const t = document.getElementById("t");
    if (!t) return done();
    let size = Math.round(Math.min(w * (h > w ? 0.13 : 0.085), h * 0.18));
    const fits = () => {
      t.style.fontSize = size + "px";
      const lines = Math.round(t.offsetHeight / (size * 1.02));
      return t.scrollWidth <= t.clientWidth + 1 && lines <= 3 && t.offsetHeight <= h * 0.42;
    };
    while (size > 9 && !fits()) size = Math.floor(size * 0.94);
    done();
  })), { w, h });
}

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
for (const slug of slugs) {
  const g = games.find((x) => x.slug === slug);
  if (!g) { console.error(`${slug}: not in games.json`); continue; }
  const out = join(ROOT, "dist/portal-assets", slug), rec = join(out, ".rec");
  rmSync(out, { recursive: true, force: true });
  mkdirSync(rec, { recursive: true });

  const land = await record(browser, g, "landscape", join(rec, "land"));
  const port = await record(browser, g, "portrait", join(rec, "port"));
  if (land.length < 20 || port.length < 20) { console.error(`${slug}: too few frames (${land.length}/${port.length}); is ${BASE} serving it?`); continue; }

  video(land, join(rec, "land.txt"), join(out, "preview-16x9-1920x1080.mp4"), 1920, 1080);
  video(port, join(rec, "port.txt"), join(out, "preview-2x3-1080x1620.mp4"), 1080, 1620);
  [0.25, 0.5, 0.75, 0.97].forEach((s, i) => copyFileSync(at(land, s), join(out, `screenshot-${i + 1}-1920x1080.jpg`)));
  [0.5, 0.95].forEach((s, i) => copyFileSync(at(port, s), join(out, `screenshot-p${i + 1}-1080x1620.jpg`)));

  // covers: the busiest moment late in the run (more on screen), portrait ones from the phone recording
  const landStill = at(land, 0.85), portStill = at(port, 0.85);
  const page = await browser.newPage();
  const covers = [["cover", 1920, 1080], ["cover", 1280, 720], ["cover", 1280, 550], ["cover", 800, 1200], ["cover", 800, 800], ["cover", 630, 500],
    ["gd", 512, 512], ["gd", 512, 384], ["gd", 200, 120], ["square", 628, 628, "notext"]];
  for (const [kind, w, h, tag] of covers) {
    const withTitle = tag !== "notext";
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(coverHtml(g, h > w ? portStill : landStill, w, h, withTitle), { waitUntil: "load" });
    await fitTitle(page, w, h);
    await page.screenshot({ path: join(out, `${kind}-${w}x${h}${tag ? "-" + tag : ""}.png`) });
  }
  await page.close();

  // store text: this game's section of docs/portal-store-text.md
  const m = store.match(new RegExp(`^## ${slug}\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m"));
  if (m) writeFileSync(join(out, "store.md"), `# ${g.title}: store text\n\n` + m[1].trim() + "\n");
  else console.warn(`${slug}: no "## ${slug}" section in docs/portal-store-text.md`);

  rmSync(rec, { recursive: true, force: true });
  console.log(`${slug}: ${land.length} + ${port.length} frames → ${out}`);
  for (const f of readdirSync(out)) console.log(`  ${f}  ${Math.round(statSync(join(out, f)).size / 1024)} KB`);
}
await browser.close();
