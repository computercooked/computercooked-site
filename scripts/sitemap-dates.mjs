// Sets each sitemap.xml <lastmod> to the date of the last commit that touched that page's file, so search engines see
// which pages really changed (instead of every page carrying one date). Run from the repo root after merging:
//   node scripts/sitemap-dates.mjs
// "/" → index.html, "/games/<slug>/" → games/<slug>/ (the page and the game), anything else → <path>/index.html.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const SITE = "https://computercooked.com";
const xml = readFileSync("sitemap.xml", "utf8");
const dateOf = (paths) => {
  const have = paths.filter((p) => existsSync(p));
  if (!have.length) return null;
  return execFileSync("git", ["log", "-1", "--format=%cs", "--", ...have], { encoding: "utf8" }).trim() || null;
};
let changed = 0;
const out = xml.replace(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g, (all, loc, old) => {
  const path = loc.replace(SITE, "");
  const files = path === "/" ? ["index.html", "src/pages.js"]
    : /^\/games\/[a-z0-9-]+\/$/.test(path) ? ["." + path]
    : path === "/games/" ? ["games/index.html", "games/games.json", "src/hub.js"]
    : ["." + path + "index.html", "." + path];
  const d = dateOf(files);
  if (!d || d === old) return all;
  changed++;
  return all.replace("<lastmod>" + old + "</lastmod>", "<lastmod>" + d + "</lastmod>");
});
writeFileSync("sitemap.xml", out);
console.log(`sitemap.xml: ${changed} lastmod dates updated`);
