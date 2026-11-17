// Short promo links for bios and ads: computercooked.com/g/<alias> → 302 to the game page.
//   /g/microwave              → /games/microwave-panic/?ref=short&utm_medium=short
//   /g/microwave?ref=tiktok   → /games/microwave-panic/?ref=tiktok&utm_medium=short
//   /g/goose?utm_source=tiktok&utm_campaign=bio → /games/goose-court/?utm_source=tiktok&utm_campaign=bio&utm_medium=short
//   /g/ and /g                → /games/   ·   unknown alias → /games/?ref=short&utm_medium=short
// Aliases are built from games.json on each request (db.js caches the catalog for a minute): every full slug, the slug
// without a trailing -exe / -daily, and the hand map below (only kept when its game is in the catalog). Case doesn't matter.
// Attribution: ref and utm_* on the short link pass through. ref=short is added only when the link carries neither ref
// nor utm_source (so ?ref=tiktok still counts as tiktok), and utm_medium=short when no utm_medium is given, so every
// short-link visit shows up in /api/admin/utm under medium "short" (assets/deck.js and games/cc-sdk.js keep it).
import { games as catalogOf } from "./db.js";

// short, memorable names → slug (or a site path starting with "/")
export const HAND = {
  microwave: "microwave-panic", popup: "one-percent-popup", keyboard: "keyboard-escape", goose: "goose-court",
  fish: "elevator-full-of-fish", elevator: "elevator-full-of-fish", checkout: "haunted-self-checkout", devil: "level-devil-exe",
  takeover: "desktop-takeover", smol: "smol-brains", handbag: "handbag-havoc", granny: "handbag-havoc",
  sweeper: "cooked-sweeper", ants: "ant-farm", ram: "plus-one-ram", tabs: "tab-hoarder", ice: "thin-ice",
  human: "prove-youre-human", captcha: "prove-youre-human", sandwich: "sandwich-tower", bells: "bellchain",
  purge: "pixel-purge", jam: "desktop-jam", reel: "reel-weird", overdue: "overdue-notice", cheats: "crash-cheats",
  daily: "/games/daily/", games: "/games/", all: "/games/",
};
const SUFFIX = /-(exe|daily)$/;
const KEEP = ["ref", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

// alias → site path, for the current catalog
export function aliasMap(catalog) {
  const map = new Map();
  const add = (a, to) => { if (a && !map.has(a)) map.set(a, to); };
  for (const slug of catalog.keys()) add(slug, "/games/" + slug + "/");
  for (const [a, to] of Object.entries(HAND)) add(a, to[0] === "/" ? to : catalog.has(to) ? "/games/" + to + "/" : null);
  for (const slug of catalog.keys()) add(slug.replace(SUFFIX, ""), "/games/" + slug + "/");
  for (const [a, to] of map) if (!to) map.delete(a);
  return map;
}

export async function shortLink(env, url, alias) {
  let path = "/games/";
  const a = (alias || "").toLowerCase();
  if (a) path = aliasMap(await catalogOf(env, url.origin)).get(a) || "/games/";
  const out = new URL(path, url.origin);
  for (const k of KEEP) {
    const v = url.searchParams.get(k);
    if (v && v.length <= 60) out.searchParams.set(k, v);
  }
  // /g/ alone is just "the games"; a named link is a promo link, so it gets tagged
  if (a) {
    if (!out.searchParams.has("ref") && !out.searchParams.has("utm_source")) out.searchParams.set("ref", "short");
    if (!out.searchParams.has("utm_medium")) out.searchParams.set("utm_medium", "short");
  }
  return new Response(null, { status: 302, headers: { location: out.toString(), "cache-control": "public, max-age=300" } });
}
