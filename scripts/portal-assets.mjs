#!/usr/bin/env node
// The asset kit portals ask for (docs/portals.md), made from the running game:
//   node scripts/portal-assets.mjs <slug> [base=http://localhost:8787]
// Records 1280x720 gameplay in test mode (?cctest=1; ?autoplay=skilled lets a bot drive where the game has one, else
// the title screen's attract mode runs), then writes dist/portal-assets/<slug>/:
//   cover-1920x1080, cover-1280x720, cover-1280x550, cover-800x1200, cover-800x800, cover-630x500  (title art)
//   gd-512x512, gd-512x384, gd-200x120                                                         (title art)
//   square-628x628-notext.png (gameplay only), gameplay-1280x720.png, hover-15s.mp4 (no audio, H.264)
// The title art is the game's og.png over a blurred gameplay frame. Needs ffmpeg on the PATH and Playwright
// (PLAYWRIGHT=<folder with node_modules/playwright>, CHROME=<chrome.exe> if Playwright's own browser isn't installed).
// Nothing is uploaded: accounts and submissions are Ashton's.
import { mkdirSync, rmSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const [slug, base = "http://localhost:8787"] = args;
if (!slug) { console.error("usage: node scripts/portal-assets.mjs <slug> [base]"); process.exit(1); }
const og = join(ROOT, "games", slug, "og.png");
if (!existsSync(og)) { console.error(`no games/${slug}/og.png`); process.exit(1); }

const req = createRequire(process.env.PLAYWRIGHT ? join(resolve(process.env.PLAYWRIGHT), "x.js") : import.meta.url);
const { chromium } = req("playwright");
const out = join(ROOT, "dist/portal-assets", slug);
const tmp = join(out, ".rec");
rmSync(out, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

// 1. record gameplay: a screenshot loop (no extra Playwright downloads), stitched by ffmpeg at the rate it achieved
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`${base}/games/${slug}/play/?cctest=1&autoplay=skilled`, { waitUntil: "load" });
await page.waitForTimeout(1500);
await page.mouse.click(640, 400).catch(() => {}); // games without a bot: start the run
await page.waitForTimeout(1500);
const t0 = Date.now();
let n = 0;
while (Date.now() - t0 < 15000) {
  await page.screenshot({ path: join(tmp, `f${String(n).padStart(5, "0")}.jpg`), type: "jpeg", quality: 90 });
  n++;
}
const fps = (n / ((Date.now() - t0) / 1000)).toFixed(3);
await page.screenshot({ path: join(out, "gameplay-1280x720.png") });
await browser.close();

const ff = (...a) => execFileSync("ffmpeg", ["-v", "error", "-y", ...a], { stdio: "inherit" });
const shot = join(out, "gameplay-1280x720.png");

// 2. stills
ff("-i", shot, "-vf", "crop=720:720:280:0,scale=628:628:flags=lanczos", join(out, "square-628x628-notext.png"));
const covers = [["cover", 1920, 1080], ["cover", 1280, 720], ["cover", 1280, 550], ["cover", 800, 1200], ["cover", 800, 800], ["cover", 630, 500],
  ["gd", 512, 512], ["gd", 512, 384], ["gd", 200, 120]];
for (const [kind, w, h] of covers) {
  // blurred, darkened gameplay filling the frame; the og art (title + key art) as large as fits on top
  const fit = `scale=w='min(${w}*0.92,${h}*0.92*1200/630)':h=-1:flags=lanczos`;
  ff("-i", shot, "-i", og, "-filter_complex",
    `[0]scale=${w}:${h}:force_original_aspect_ratio=increase:flags=lanczos,crop=${w}:${h},gblur=sigma=${Math.max(6, w / 60)},eq=brightness=-0.12[bg];` +
    `[1]${fit}[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,format=rgb24`, "-frames:v", "1", join(out, `${kind}-${w}x${h}.png`));
}

// 3. hover video: the 15 s of frames at the rate they were taken, no audio
ff("-framerate", fps, "-i", join(tmp, "f%05d.jpg"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-preset", "slow",
  "-r", "30", "-movflags", "+faststart", join(out, "hover-15s.mp4"));
console.log(`video: ${n} frames, ${fps} fps captured`);
rmSync(tmp, { recursive: true, force: true });
console.log(`asset kit for ${slug} → ${out}`);
for (const f of readdirSync(out)) console.log("  " + f);
