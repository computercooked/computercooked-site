// K-0030 step 6: this week's top xp, across every game. Weeks start Monday 00:00 UTC. Accounts only (guests have no
// server xp). Names follow the game boards: display name, linked to /u/<username>.
import { json, now, dayOf, weekOf } from "./util.js";
import { people } from "./friends.js";

export function weekStart(t) {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() || 7) - 1));
}

// GET /api/xp/week -> {week, resets_at, rows:[{rank, name, u, a, level, xp, me}], you:{rank, xp}|null}
export async function weeklyXp(env, user) {
  const t = now(), start = weekStart(t), from = dayOf(start);
  const { results } = await env.DB.prepare(
    "SELECT user_id, SUM(amount) xp FROM xp_events WHERE day >= ? GROUP BY user_id ORDER BY xp DESC, MIN(ts) LIMIT 15"
  ).bind(from).all();
  const who = await people(env, results.map((r) => r.user_id));
  const rows = results.filter((r) => who.has(r.user_id)).slice(0, 10).map((r, i) => {
    const p = who.get(r.user_id);
    return { rank: i + 1, name: p.name, u: p.username, a: p.avatar, level: p.level, xp: r.xp, me: !!user && user.id === r.user_id };
  });
  let you = null;
  if (user && !rows.some((r) => r.me)) {
    const mine = await env.DB.prepare("SELECT COALESCE(SUM(amount), 0) x FROM xp_events WHERE user_id = ? AND day >= ?").bind(user.id, from).first("x");
    if (mine > 0) {
      const above = await env.DB.prepare("SELECT COUNT(*) n FROM (SELECT SUM(amount) s FROM xp_events WHERE day >= ? GROUP BY user_id) WHERE s > ?").bind(from, mine).first("n");
      you = { rank: above + 1, xp: mine };
    } else you = { rank: null, xp: 0 };
  }
  return json({ ok: true, logged_in: !!user, week: weekOf(t), resets_at: start + 7 * 86400000, rows, you }, 200, { "cache-control": "no-store" });
}
