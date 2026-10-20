// Referral credit: a new account opened from someone's dare link (/games/<slug>/?…&d=<id>) credits the dare's
// sender. The credit waits until the new player finishes a real run (one that earns play XP), so empty
// alt accounts earn nothing. +50 XP per player brought in, at most 5 a day (more wait for the next day).
import { grant } from "./xp.js";
import { now, dayOf } from "./util.js";

export const REFERRAL_XP = 50, PER_DAY = 5;

// at sign-up: remember who brought this account in (only dares made by an account, never your own)
export async function noteReferral(env, newUserId, dareId) {
  if (typeof dareId !== "string" || !/^[A-Za-z0-9_-]{6,16}$/.test(dareId)) return;
  const d = await env.DB.prepare("SELECT from_user FROM dares WHERE id = ?").bind(dareId).first();
  if (!d || !d.from_user || d.from_user === newUserId) return;
  await env.DB.prepare("INSERT OR IGNORE INTO referrals (new_user, sender, dare_id, created_at) VALUES (?,?,?,?)")
    .bind(newUserId, d.from_user, dareId, now()).run();
}

// after a logged-in player's run that earned XP: pay their referrer once -> xp granted (0 if none/capped)
export async function settleReferral(env, userId, game, t) {
  const r = await env.DB.prepare("SELECT sender FROM referrals WHERE new_user = ? AND credited_at IS NULL").bind(userId).first();
  if (!r) return 0;
  const today = await env.DB.prepare("SELECT COUNT(*) n FROM xp_events WHERE user_id = ? AND kind = 'referral' AND day = ?")
    .bind(r.sender, dayOf(t)).first("n");
  if (today >= PER_DAY) return 0; // stays pending; their next run tries again
  const xp = await grant(env, r.sender, "referral", game, `u:${userId}`, REFERRAL_XP, t);
  await env.DB.prepare("UPDATE referrals SET credited_at = ? WHERE new_user = ?").bind(t, userId).run();
  return xp;
}

// for /me: players you brought in (credited) and ones still waiting for their first real run
export async function referralCounts(env, userId) {
  const r = await env.DB.prepare("SELECT SUM(credited_at IS NOT NULL) credited, SUM(credited_at IS NULL) pending FROM referrals WHERE sender = ?")
    .bind(userId).first();
  return { credited: (r && r.credited) || 0, pending: (r && r.pending) || 0 };
}
