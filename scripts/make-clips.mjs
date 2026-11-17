// Animated thumbnails (audit P1 #18): a 3-second muted loop of each game for the hub cards.
//   node scripts/make-clips.mjs [slug ...]        (all Computer Cooked games when no slug is given)
// Needs: the site running locally (npx wrangler dev --local --port 8798, or BASE=...), the playwright package
// (npm i --no-save playwright, or PLAYWRIGHT=path to a folder that has it), CHROME=path if Playwright's own
// browser isn't installed, and ffmpeg on PATH.
// Plays each game's play/ page in test mode (?cctest=1: nothing is counted), skips the title screen with the
// SDK's autostart flag, pokes it with taps and keys so something happens, grabs ~12 fps for 3 s, and writes
// assets/clips/<slug>.mp4 (H.264, 320x180, no audio, aim ≤150 KB). games.json gets "clip" for each one made.
import { readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE || "http://localhost:8798";
const req = createRequire(process.env.PLAYWRIGHT ? join(resolve(process.env.PLAYWRIGHT), "x.js") : import.meta.url);
const { chromium } = req("playwright");
const W = 640, H = 360, FPS = 12, SECS = Number(process.env.CLIP_SECS || 4); // 3-4 s (round 20: 4)
// how each game is played on camera (DRIVE, WAIT, ON_TITLE, QUERY) is shared with scripts/portal-assets.mjs
import { DRIVE, WAIT, ON_TITLE, QUERY } from "./clip-drivers.mjs";
// a closer frame for games whose action is small in the wide shot (ffmpeg crop on the 640x360 grab: w:h:x:y)
const CROP = { "thin-ice": "400:225:130:95" };
// a higher -crf (smaller file) for games whose clip is busy all over: smol brains' moving town is 138 KB at 30, 79 KB at 33
const CRF = { "smol-brains": 33 };

const gj = join(ROOT, "games/games.json");
const data = JSON.parse(readFileSync(gj, "utf8"));
const want = process.argv.slice(2);
const list = data.games.filter((g) => g.made_by === "computer-cooked" && (!want.length || want.includes(g.slug)));

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
mkdirSync(join(ROOT, "assets/clips"), { recursive: true });
const made = [];
for (const g of list) {
  const tmp = join(ROOT, "dist/clips-tmp", g.slug);
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  if (!ON_TITLE.has(g.slug)) await page.addInitScript((slug) => {
    try { sessionStorage.setItem("cc-autostart", JSON.stringify({ game: slug, t: Date.now() })); } catch (e) {}
  }, g.slug);
  try {
    await page.goto(`${BASE}/games/${g.slug}/play/?cctest=1${QUERY[g.slug] || ""}`, { waitUntil: "load", timeout: 90000 });
    await page.waitForTimeout(WAIT[g.slug] || 1200);
    // start: a tap in the middle and the usual start keys
    const drive = DRIVE[g.slug];
    if (!ON_TITLE.has(g.slug)) await page.mouse.click(W / 2, H / 2);
    if (!drive) { await page.keyboard.press("Space"); await page.keyboard.press("Enter"); } // a driven game starts on the tap alone
    await page.waitForTimeout(900);
    if (drive) await page.evaluate(drive);
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "ArrowRight", "ArrowLeft"];
    for (let i = 0; i < FPS * SECS; i++) {
      if (!drive && i % 4 === 0) {
        await page.mouse.click(W * (0.3 + 0.4 * Math.random()), H * (0.35 + 0.4 * Math.random()));
        await page.keyboard.press(keys[(i / 4) % keys.length]);
      }
      await page.screenshot({ path: join(tmp, String(i).padStart(3, "0") + ".png") });
      await page.waitForTimeout(1000 / FPS - 20);
    }
    const out = join(ROOT, "assets/clips", g.slug + ".mp4");
    execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", String(FPS), "-i", join(tmp, "%03d.png"),
      "-vf", (CROP[g.slug] ? "crop=" + CROP[g.slug] + "," : "") + "scale=320:180:flags=lanczos,format=yuv420p", "-c:v", "libx264", "-preset", "veryslow", "-crf", String(CRF[g.slug] || 30),
      "-movflags", "+faststart", "-an", out]);
    const kb = Math.round(statSync(out).size / 1024);
    made.push(g.slug);
    console.log(`${g.slug}: ${kb} KB${kb > 150 ? "  (over 150 KB: try a higher -crf)" : ""}`);
  } catch (e) {
    console.log(`${g.slug}: skipped (${e.message.split("\n")[0]})`);
  }
  await page.close();
  rmSync(tmp, { recursive: true, force: true });
}
await browser.close();
// "clip" goes in as a line right under each game's "slug" line, so the rest of games.json stays exactly as it was
const raw = readFileSync(gj, "utf8"), EOL = raw.includes("\r\n") ? "\r\n" : "\n"; // keep the file's own line endings
const lines = raw.split(EOL);
for (const slug of made) {
  const i = lines.findIndex((l) => l.trim().startsWith(`"slug": "${slug}",`));
  if (i < 0) continue;
  const row = lines[i].slice(0, lines[i].indexOf('"')) + `"clip": "/assets/clips/${slug}.mp4",`;
  if (lines[i + 1].trim().startsWith('"clip":')) lines[i + 1] = row; else lines.splice(i + 1, 0, row);
}
const text = lines.join(EOL);
JSON.parse(text);
writeFileSync(gj, text);
console.log(`clips: ${made.length}/${list.length}`);
