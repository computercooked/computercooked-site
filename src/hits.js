// POST /api/hit {kind, path, game?, slot?, ref, campaign, src, medium, anon}: site measurement with no player id stored.
//   pageview     one per page load on pages with the control deck (assets/deck.js). The first one of the day in a
//                browser carries vis "new" (never seen before) or "back" (seen on an earlier day): daily visitors and
//                returning visitors without storing any id (the browser keeps only its last-seen day). The first one in
//                a tab carries land 1: one per visit, the sessions in /api/admin/utm (src/utm.js)
//   leave        once per page load when the tab is hidden or closed, with ms = time the page was visible (time on page)
//   tip_click    a click on a "tip the computer" link (games/hub.js, games/platform.js) or the shared "Tip the chef"
//                button (assets/tip.js: home-footer, game-over), with the game's slug when it's on a game
//   tip_success  a page opened with ?tip=thanks (the Stripe Payment Link's after-payment redirect), once per visit
//   ad_slot      a moment an ad would show under the assets/ads.js caps (interstitial / rewarded), counted before any network
//   desk_shown   the homepage's "your desk" row was shown to a returning player (K-0064, assets/home.js), once per load
//   desk_click   a card in that row was opened, with the game's slug; slot "resume" (the pick-up card) or "card";
//                slot "nudge" (no game) = the hero's "your desk is warm" link down to the row (K-0066)
//   tiktok_out   a link out to TikTok on /show/ (round 26): slot "follow" / "follow-end" (the two follow buttons) or
//                "episode", with ep = the episode's slug from show/episodes.json
//   next_shown   the results card showed its "try this next" tile (round 27, games/player.js), game = the game just played,
//                to = the game offered, slot "touch" (a touch-only device) or "fine"
//   next_tap     that tile was tapped (or n pressed), same fields. A tap that reaches a started run is cc:next (src/games.js)
//                round 28: place "card" (the results card's tile) or "bar" (quiet games' line under the player bar)
// Stored as events rows named cc:<kind>, data {path, ref, campaign, src, medium, slot}; src / medium are the visit's raw
// utm_source / utm_medium. Read in /api/admin/metrics and /api/admin/digest.
// Smoke traffic is answered but not stored, like /api/follow.
import { json, bad, readJson, now, limited, slugOk, refOk, campaignOk, isTestAnon } from "./util.js";

const KINDS = ["pageview", "tip_click", "tip_success", "ad_slot", "leave", "desk_shown", "desk_click", "tiktok_out", "next_shown", "next_tap"];
export const TT_OUT_SLOTS = ["follow", "follow-end", "episode"];
export const TIP_SLOTS = ["hub-top", "hub-footer", "post-run", "post-best", "support", "home-footer", "game-over", "smol-death", "smol-ending"];

const pathOk = (p) => {
  if (typeof p !== "string" || p[0] !== "/" || p.length > 120) return null;
  return /^\/[A-Za-z0-9/_.-]*$/.test(p) ? p : null;
};

export async function hit(req, env, ip) {
  if (limited("hit:" + ip, 120, 60000)) return bad("slow down", 429);
  const b = await readJson(req, 1024);
  if (!KINDS.includes(b.kind)) return bad("kind?", 400);
  if (isTestAnon(b.anon)) return json({ ok: true, test: true });
  const path = pathOk(b.path);
  if (!path) return bad("path?", 400);
  const data = { path, ref: refOk(b.ref), campaign: campaignOk(b.campaign) };
  const src = campaignOk(b.src), medium = campaignOk(b.medium);
  if (src) data.src = src;
  if (medium) data.medium = medium;
  if (b.kind === "tip_click") data.slot = TIP_SLOTS.includes(b.slot) ? b.slot : "other";
  if (b.kind === "pageview" && (b.vis === "new" || b.vis === "back")) data.vis = b.vis;
  if (b.kind === "pageview" && b.land === 1) data.land = 1;
  if (b.kind === "leave") {
    const ms = Math.round(Number(b.ms));
    if (!(ms >= 0)) return bad("ms?", 400);
    data.ms = Math.min(ms, 30 * 60000);
  }
  if (b.kind === "ad_slot") data.slot = b.slot === "rewarded" || b.slot === "display" ? b.slot : "interstitial"; // display = the results-card strip (round 22)
  if (b.kind === "desk_click") data.slot = b.slot === "resume" || b.slot === "nudge" ? b.slot : "card";
  if (b.kind === "tiktok_out") {
    data.slot = TT_OUT_SLOTS.includes(b.slot) ? b.slot : "other";
    if (typeof b.ep === "string" && /^[a-z0-9-]{3,60}$/.test(b.ep)) data.ep = b.ep;
  }
  if (b.kind === "next_shown" || b.kind === "next_tap") {
    data.slot = b.slot === "touch" ? "touch" : "fine";
    data.place = b.place === "bar" ? "bar" : "card";
    if (slugOk(b.to)) data.to = b.to;
  }
  const game = slugOk(b.game) ? b.game : "site";
  await env.DB.prepare("INSERT INTO events (play_id, game, name, data, ts) VALUES (NULL, ?, ?, ?, ?)")
    .bind(game, "cc:" + b.kind, JSON.stringify(data), now()).run();
  return json({ ok: true });
}
