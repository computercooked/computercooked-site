// POST /api/hit {kind, path, game?, slot?, ref, campaign, src, medium, anon}: site measurement with no player id stored.
//   pageview     one per page load on pages with the control deck (assets/deck.js). The first one of the day in a
//                browser carries vis "new" (never seen before) or "back" (seen on an earlier day): daily visitors and
//                returning visitors without storing any id (the browser keeps only its last-seen day)
//   leave        once per page load when the tab is hidden or closed, with ms = time the page was visible (time on page)
//   tip_click    a click on a "tip the computer" link (games/hub.js, games/platform.js)
//   tip_success  a page opened with ?tip=thanks (the Stripe Payment Link's after-payment redirect), once per visit
//   ad_slot      a moment an ad would show under the assets/ads.js caps (interstitial / rewarded), counted before any network
// Stored as events rows named cc:<kind>, data {path, ref, campaign, src, medium, slot}; src / medium are the visit's raw
// utm_source / utm_medium. Read in /api/admin/metrics and /api/admin/digest.
// Smoke traffic is answered but not stored, like /api/follow.
import { json, bad, readJson, now, limited, slugOk, refOk, campaignOk, isTestAnon } from "./util.js";

const KINDS = ["pageview", "tip_click", "tip_success", "ad_slot", "leave"];
export const TIP_SLOTS = ["hub-top", "hub-footer", "post-run", "post-best", "support"];

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
  if (b.kind === "leave") {
    const ms = Math.round(Number(b.ms));
    if (!(ms >= 0)) return bad("ms?", 400);
    data.ms = Math.min(ms, 30 * 60000);
  }
  if (b.kind === "ad_slot") data.slot = b.slot === "rewarded" ? "rewarded" : "interstitial";
  const game = slugOk(b.game) ? b.game : "site";
  await env.DB.prepare("INSERT INTO events (play_id, game, name, data, ts) VALUES (NULL, ?, ?, ?, ?)")
    .bind(game, "cc:" + b.kind, JSON.stringify(data), now()).run();
  return json({ ok: true });
}
