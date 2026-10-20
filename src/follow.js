// POST /api/follow {platform, slot, game?, anon}: a click on a "follow @computercooked" button (assets/follow.js).
// One cc:follow_click event {platform, slot}, no player id stored; follow_clicks in admin metrics and the digest.
// Smoke traffic is answered but not stored.
import { json, bad, readJson, now, limited, slugOk, isTestAnon } from "./util.js";

export const FOLLOW_PLATFORMS = ["tiktok", "youtube", "instagram", "x"];
const SLOTS = ["hub-card", "hub-footer", "post-run"];

export async function followClick(req, env, ip) {
  if (limited("follow:" + ip, 60, 3600000)) return bad("slow down", 429);
  const b = await readJson(req, 512);
  if (!FOLLOW_PLATFORMS.includes(b.platform)) return bad("platform?", 400);
  if (!SLOTS.includes(b.slot)) return bad("slot?", 400);
  if (isTestAnon(b.anon)) return json({ ok: true, test: true });
  const game = slugOk(b.game) ? b.game : "site";
  await env.DB.prepare("INSERT INTO events (play_id, game, name, data, ts) VALUES (NULL, ?, 'cc:follow_click', ?, ?)")
    .bind(game, JSON.stringify({ platform: b.platform, slot: b.slot }), now()).run();
  return json({ ok: true });
}
