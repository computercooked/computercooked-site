#!/usr/bin/env node
// /show/ (round 26): the site's door back to TikTok. Keeps the page in step with what has actually been posted.
//   node scripts/sync-show.mjs ["<Computer Cooked project folder>"]   (default: two folders up from this checkout)
// Reads Posting\posting-log.md (the one posted file: only posts that went out are in it) and writes:
//   show/episodes.json             every posted TikTok episode: slug, date, link, title (the caption without hashtags)
//   show/img/ep-<slug>.jpg         a still from the posted video (the file the log's queue line names), 540x960
//   show/img/cast-<id>.jpg         each cast card's picture, cropped from Content\characters\<id>\assets\minecraft\
//   show/index.html                the cast and episode lists between their <!-- …:start --> / <!-- …:end --> marks
// A character's card shows only once a posted episode features them (their label in the episode's brief or
// storyboard), so a new character appears the day their first episode is in the log. Unposted episodes never show.
// Names are internal labels and never go on the page (Content\characters\README.md): cards say who someone is.
// Needs ffmpeg on the PATH. Re-run after every post; it changes nothing when nothing new went out.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT = process.argv[2] || join(ROOT, "..", "..");
const LOG = join(PROJECT, "Posting", "posting-log.md");
if (!existsSync(LOG)) { console.error(`no posting log at ${LOG}; pass the Computer Cooked project folder`); process.exit(1); }
const IMG = join(ROOT, "show", "img");
mkdirSync(IMG, { recursive: true });
const ff = (...a) => execFileSync("ffmpeg", ["-v", "error", "-y", ...a]);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// the cast, in card order. line = who they are (from their personality.md "in one line"); src + crop (w:h:x:y, 3:4)
// = the picture. Labels (id) are for files only.
const CAST = [
  { id: "tryhard", line: "takes everything way too seriously, plans it perfectly, and gets humbled every time.",
    src: "tryhard/assets/minecraft/tryhard-sheet.png", crop: "420:560:20:40" },
  { id: "chaos", line: "never plans, never worries, is never sorry, and somehow comes out fine.",
    src: "chaos/assets/minecraft/chaos-sheet.png", crop: "435:580:0:8" },
  { id: "pet", line: "a small, curious cube with very big feelings. when it gets too excited, it flashes white.",
    src: "pet/assets/minecraft/pet-canon.png", crop: "240:320:262:830" },
  { id: "sunny", line: "the sweet neighbour with her own projects, who ends up better at their thing than they are.",
    src: "sunny/assets/minecraft/sunny-look.png", crop: "768:1024:0:220" },
];
// where a still is taken from, per episode (seconds into the posted video; default 55% of the way in)
const STILL_AT = { "2026-11-08-first-night": 30 };

// ---- posted TikTok episodes, oldest first (the log is newest at the bottom) ----
const log = readFileSync(LOG, "utf8").replace(/\r\n/g, "\n");
const blocks = log.split(/\n(?=- \d{4}-\d{2}-\d{2} )/).filter((b) => /^- \d{4}-\d{2}-\d{2} /.test(b));
const episodes = [];
for (const b of blocks) {
  const head = b.split("\n")[0];
  const m = /^- (\d{4}-\d{2}-\d{2}) \d{2}:\d{2} PT · TikTok · ([a-z0-9-]{3,60}) · (https:\/\/www\.tiktok\.com\/@computercooked\/video\/\d{10,25}) · "([^"]*)"/.exec(head);
  if (!m) continue; // not a TikTok post line in the agreed format: never guess
  const [, date, slug, url, caption] = m;
  if (episodes.some((e) => e.slug === slug)) continue;
  const title = caption.split(/\s\/\s|\n/)[0].replace(/#\S+/g, "").replace(/\s{2,}/g, " ").trim() || slug.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/-/g, " ");
  const file = (/file `([^`]+\.mp4)`/.exec(b) || [])[1];
  episodes.push({ slug, date, url, title, file: file || null });
}

// ---- which characters each posted episode features (their label in its brief or storyboards) ----
function featured(ep) {
  const dir = join(PROJECT, "Content", "episodes", ep.slug);
  if (!existsSync(dir)) return [];
  const text = readdirSync(dir).filter((f) => /^(brief|storyboard[\w-]*)\.md$/i.test(f)).map((f) => readFileSync(join(dir, f), "utf8")).join("\n").toLowerCase();
  return CAST.filter((c) => new RegExp(`\\b${c.id}\\b`).test(text)).map((c) => c.id);
}
for (const ep of episodes) ep.cast = featured(ep);
const onShow = new Set(episodes.flatMap((e) => e.cast));
const cast = CAST.filter((c) => onShow.has(c.id));

// ---- pictures ----
for (const c of cast) {
  const out = join(IMG, `cast-${c.id}.jpg`);
  if (existsSync(out)) continue;
  ff("-i", join(PROJECT, "Content", "characters", ...c.src.split("/")), "-vf", `crop=${c.crop},scale=360:480:flags=lanczos`, "-q:v", "4", out);
}
for (const ep of episodes) {
  const out = join(IMG, `ep-${ep.slug}.jpg`);
  ep.still = existsSync(out) ? `/show/img/ep-${ep.slug}.jpg` : null;
  if (ep.still || !ep.file) continue;
  const src = /^[A-Za-z]:\\/.test(ep.file) ? ep.file : join(PROJECT, ...ep.file.split("\\"));
  if (!existsSync(src)) { console.warn(`${ep.slug}: posted video not found (${ep.file}); no still`); continue; }
  const dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src]).toString());
  const t = STILL_AT[ep.slug] ?? dur * 0.55;
  ff("-ss", String(t), "-i", src, "-frames:v", "1", "-vf", "scale=540:960:flags=lanczos", "-q:v", "4", out);
  ep.still = `/show/img/ep-${ep.slug}.jpg`;
}

// ---- the data file and the page ----
const pub = episodes.map(({ slug, date, url, title, still, cast }) => ({ slug, date, url, title, still, cast }));
writeFileSync(join(ROOT, "show", "episodes.json"), JSON.stringify({ updated_from: "Posting/posting-log.md", episodes: pub }, null, 2) + "\n");

const castHtml = cast.map((c) =>
  `      <li class="show-cast-card"><img src="/show/img/cast-${c.id}.jpg" alt="" width="360" height="480" loading="lazy"><p>${esc(c.line)}</p></li>`).join("\n");
const epHtml = pub.slice().reverse().map((e) =>
  `      <li class="show-ep"><a href="${esc(e.url)}" rel="noopener" target="_blank" data-tt-out data-slot="episode" data-ep="${esc(e.slug)}">` +
  (e.still ? `<img src="${esc(e.still)}" alt="" width="540" height="960" loading="lazy">` : "") +
  `<span class="show-ep-t">${esc(e.title)}</span><span class="show-ep-d">${esc(e.date)} · watch on tiktok ↗</span></a></li>`).join("\n");
const pagePath = join(ROOT, "show", "index.html");
let page = readFileSync(pagePath, "utf8");
const nl = page.includes("\r\n") ? "\r\n" : "\n";
const put = (name, html) => {
  const re = new RegExp(`(<!-- ${name}:start -->)[\\s\\S]*?(\\s*<!-- ${name}:end -->)`);
  if (!re.test(page)) throw new Error(`show/index.html has no ${name} marks`);
  page = page.replace(re, (all, a, b) => a + nl + html.replace(/\n/g, nl) + b);
};
put("cast", castHtml);
put("episodes", epHtml || `      <li class="show-ep show-ep-none">the first episode is on its way.</li>`);
page = page.replace(/(<span data-ep-count>)\d+(<\/span>)/, `$1${pub.length}$2`);
writeFileSync(pagePath, page);
console.log(`show: ${pub.length} posted episode(s), cast on the page: ${cast.map((c) => c.id).join(", ") || "none"}`);
