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
// Games where random taps and keys make a dull clip get a small in-page player instead (it drives the game through
// its read-only test hook, so the clip shows the game being played well). Everything else gets the random pokes.
const DRIVE = {
  "elevator-full-of-fish": () => setInterval(() => {
    const s = window.__eff && window.__eff.state();
    if (!s || s.state !== "play" || s.door < 0.6 || !s.fish.length) return;
    const f = s.fish[(Math.random() * s.fish.length) | 0];
    document.getElementById("c").dispatchEvent(new PointerEvent("pointerdown", { clientX: f.x, clientY: f.y, bubbles: true }));
  }, 170),
  "sandwich-tower": () => {
    let want = null, last = -1;
    const tick = () => {
      const s = window.__st && window.__st.state();
      if (s && s.state === "play" && s.mover && !s.mover.drop) {
        if (s.layers !== last) { last = s.layers; want = s.top.x + (Math.random() - 0.5) * 16; }
        if (Math.abs(s.mover.x - want) < 10) window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },
  "microwave-panic": () => {
    let target = null, last = -1;
    const key = (type) => window.dispatchEvent(new KeyboardEvent(type, { key: " " }));
    const tick = () => {
      const s = window.__mp && window.__mp.state();
      if (s && s.state === "play") {
        if (s.round !== last) { last = s.round; target = s.cursed ? 0.25 : s.T + (Math.random() - 0.5) * 0.2; }
        if (s.phase === "ready" && s.slide <= 0) key("keydown");
        if (s.phase === "cook" && s.cookT >= target) key("keyup");
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },
  // the colony plays itself: ?shot=1 grows it, hides the chrome and leaves the ants working (K-0058)
  "ant-farm": () => {},
  // smol brains: its title screen is the showcase (a grown town full of smols, the camera drifting over it); a new
  // game opens on the story and a tutorial card instead. So the clip stays on the title (ON_TITLE below) with the
  // title's panels hidden. No taps (one would start the game).
  "smol-brains": () => { const st = document.createElement("style"); st.textContent = ".ts{opacity:0!important;transition:none!important}"; document.head.appendChild(st); },
  // the floppy whose colour has a pixel showing (the game's own hint), never past 3 on the bench, so pixels get shot
  "pixel-purge": () => setInterval(() => {
    const p = window.__pp, S = p && p.S;
    if (!S || p.mode !== "play" || S.bench.filter(Boolean).length > 3) return;
    let li = -1;
    for (let q = 0; q < S.lanes.length && li < 0; q++) { const fd = S.lanes[q][0]; if (fd && S.exList.some((id) => S.grid[id] === fd.c)) li = q; }
    p.pickLane(li < 0 ? 0 : li);
  }, 380),
  // the aurora, a pike on the line and the ice cracking outward in cyan (K-0061)
  // K-0062: the pike fight, reeled in pulses so the line, the fish and the cracking ice visibly move
  "thin-ice": () => { if (!window.__ti) return; window.__ti.clip(); let on = false; setInterval(() => { on = !on; window.__ti.hold(on); }, 380); },
  // a soup check solved on camera (VERIFIED), then the next captcha (solve() works in test mode only)
  "prove-youre-human": () => { const go = () => { const s = window.__pyh && window.__pyh.state(); if (s && s.state === "play") window.__pyh.solve(); }; setTimeout(go, 300); setInterval(go, 2400); },
  // the auto-player takes level 4, joined 14 seconds in so every program is already fighting
  "desktop-takeover": () => { const d = window.__dt; if (d && d.state().state === "play") { d.auto(true); d.skip(14); } },
};
// extra wait after load before the clip starts (ms; default 1200): smol brains builds its island first
const WAIT = { "smol-brains": 7000 };
// games clipped on their own title screen: no autostart flag, no start tap
const ON_TITLE = new Set(["smol-brains"]);
// extra query for a game's clip run
const QUERY = { "ant-farm": "&shot=1", "prove-youre-human": "&round=1", "desktop-takeover": "&level=4" };
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
