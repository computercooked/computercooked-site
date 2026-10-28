// XP, levels and achievements (slice B). Only the server grants XP, and only for validated plays:
// a logged-in player's completed run of 10s+, whose score (if the game has a board) passed the bounds check.
import { now, dayOf, streakFrom } from "./util.js";
import { challengeFor, eventsLive, eventDef } from "./social.js";
import { unlocksBetween } from "./cosmetics.js";

// total XP needed to reach level L: 50 * (L-1)^1.6  ->  L2 at 50, L3 at 152, L5 at 459, L10 at 1683, L20 at 5555
export const xpFor = (L) => Math.round(50 * Math.pow(Math.max(0, L - 1), 1.6));
const TITLES = [
  [1, "fresh install"], [3, "warm boot"], [5, "fan noise"], [8, "tab hoarder"], [12, "overclocked"],
  [16, "thermal throttled"], [20, "blue screen veteran"], [25, "fully cooked"], [30, "the kernel"],
];
export function levelOf(xp) {
  let L = 1;
  while (xpFor(L + 1) <= xp && L < 999) L++;
  const title = TITLES.filter(([l]) => l <= L).pop()[1];
  return { level: L, title, xp, floor: xpFor(L), next: xpFor(L + 1) };
}

// site-wide achievements; games declare their own in entry.json (achievements:[{id,name,desc,xp,secret}])
export const SITE_ACH = {
  play_5: { name: "sampler platter", desc: "play 5 different games", xp: 50 },
  streak_7: { name: "seven day uptime", desc: "play 7 days in a row", xp: 100 },
  top_10: { name: "leaderboard material", desc: "make the top 10 on an all-time board", xp: 75 },
  first_save: { name: "ctrl+s", desc: "save a game to your account", xp: 25 },
  rate_game: { name: "critic.exe", desc: "rate a game", xp: 15 },
  // audit P1 #19: 16 more, all awarded on the server from things it already knows
  first_run: { name: "boot sequence", desc: "finish your first run", xp: 10 },
  play_10: { name: "tab hopper", desc: "play 10 different games", xp: 75 },
  play_15: { name: "the whole arcade", desc: "play 15 different games", xp: 150 },
  streak_3: { name: "three-peat", desc: "play 3 days in a row", xp: 30 },
  streak_30: { name: "always online", desc: "play 30 days in a row", xp: 100 },
  top_3: { name: "podium", desc: "make the top 3 on an all-time board", xp: 100 },
  rank_1: { name: "king of the hill", desc: "hold #1 on an all-time board", xp: 100 },
  runs_25: { name: "regular", desc: "finish 25 runs", xp: 40 },
  runs_100: { name: "can't stop", desc: "finish 100 runs", xp: 100 },
  new_best: { name: "personal record", desc: "beat your own best score", xp: 15 },
  marathon: { name: "marathon", desc: "one run of 10 minutes or more", xp: 40 },
  challenge_1: { name: "weekly warrior", desc: "complete a weekly challenge", xp: 50 },
  level_5: { name: "promoted", desc: "reach level 5", xp: 50 },
  level_10: { name: "senior engineer", desc: "reach level 10", xp: 100 },
  dare_maker: { name: "instigator", desc: "dare someone to beat your score", xp: 15 },
  dare_beat: { name: "took the bait", desc: "beat someone's dare", xp: 40 },
};

export const RULES = { base: 10, pctMax: 40, first: 25, streakStep: 5, streakMax: 10, perGameDayCap: 150, minMs: 10000 };

// one row per grant; (user_id, kind, ref) is unique, so a retried request never pays twice
export async function grant(env, userId, kind, game, ref, amount, t) {
  if (!(amount > 0)) return 0;
  const r = await env.DB.prepare("INSERT OR IGNORE INTO xp_events (user_id, kind, game, ref, amount, day, ts) VALUES (?,?,?,?,?,?,?)")
    .bind(userId, kind, game, String(ref), Math.round(amount), dayOf(t), t).run();
  return r.meta && r.meta.changes ? Math.round(amount) : 0;
}

export async function totalXp(env, userId) {
  return (await env.DB.prepare("SELECT COALESCE(SUM(amount), 0) x FROM xp_events WHERE user_id = ?").bind(userId).first("x")) || 0;
}

// -> {id, name, desc, xp} when newly unlocked, else null
export async function unlock(env, userId, game, achId, t = now(), catalogGame = null) {
  const def = game === "site" ? SITE_ACH[achId] || eventDef(achId) : (catalogGame?.achievements || []).find((a) => a.id === achId);
  if (!def) return null;
  const r = await env.DB.prepare("INSERT OR IGNORE INTO achievements (user_id, game, ach_id, ts) VALUES (?,?,?,?)").bind(userId, game, achId, t).run();
  if (!(r.meta && r.meta.changes)) return null;
  const xp = await grant(env, userId, "achievement", game === "site" ? null : game, `${game}:${achId}`, Math.min(100, def.xp || 0), t);
  return { game, id: achId, name: def.name, desc: def.desc || "", xp };
}

// consecutive days with a play, counting back from today
async function streakDays(env, userId, today) {
  const { results } = await env.DB.prepare("SELECT DISTINCT day FROM plays WHERE user_id = ? ORDER BY day DESC LIMIT 60").bind(userId).all();
  return streakFrom(results.map((r) => r.day), today).n;
}

// Called when a play ends. scoreRes is recordScore()'s result (or null when the game sent no score).
export async function awardPlay(env, user, play, game, scoreRes, durMs, completed, t, score = null) {
  if (!user || !game || !completed || durMs < RULES.minMs) return null;
  if (play.user_id != null && play.user_id !== user.id) return null;
  if (scoreRes && scoreRes.accepted === false && scoreRes.reason === "score out of bounds") return null;
  const day = dayOf(t);
  const before = await totalXp(env, user.id);
  const parts = [];

  // base + how good the run was against everyone on the board, capped per game per day so one game isn't a grind
  let pct = 0;
  if (scoreRes && scoreRes.accepted) {
    const players = await env.DB.prepare("SELECT COUNT(DISTINCT player) n FROM scores WHERE game = ? AND hidden = 0").bind(play.game).first("n");
    pct = Math.round(RULES.pctMax * (1 - (scoreRes.rank - 1) / Math.max(1, players)));
  }
  const used = await env.DB.prepare("SELECT COALESCE(SUM(amount), 0) x FROM xp_events WHERE user_id = ? AND day = ? AND game = ? AND kind = 'play'")
    .bind(user.id, day, play.game).first("x");
  const playXp = Math.min(RULES.base + pct, Math.max(0, RULES.perGameDayCap - used));
  let g = await grant(env, user.id, "play", play.game, play.id, playXp, t);
  if (g) parts.push({ kind: "play", xp: g });
  if (playXp < RULES.base + pct) parts.push({ kind: "cap", xp: 0 });

  g = await grant(env, user.id, "first", play.game, play.game, RULES.first, t);
  if (g) parts.push({ kind: "first", xp: g });

  const streak = await streakDays(env, user.id, day);
  g = await grant(env, user.id, "streak", null, day, RULES.streakStep * Math.min(streak, RULES.streakMax), t);
  if (g) parts.push({ kind: "streak", xp: g, days: streak });

  // weekly challenge (slice D2): one bonus per week for a run on the featured game that hits the target
  const ch = await challengeFor(env, t);
  if (ch && ch.game === play.game && scoreRes && scoreRes.accepted && score >= ch.target) {
    g = await grant(env, user.id, "challenge", play.game, ch.week, ch.xp, t);
    if (g) parts.push({ kind: "challenge", xp: g, week: ch.week });
  }

  const unlocked = [];
  const firsts = await env.DB.prepare("SELECT COUNT(*) n FROM xp_events WHERE user_id = ? AND kind = 'first'").bind(user.id).first("n");
  if (firsts >= 5) unlocked.push(await unlock(env, user.id, "site", "play_5", t));
  if (streak >= 7) unlocked.push(await unlock(env, user.id, "site", "streak_7", t));
  if (scoreRes && scoreRes.accepted && scoreRes.rank <= 10) unlocked.push(await unlock(env, user.id, "site", "top_10", t));
  const runs = await env.DB.prepare("SELECT COUNT(*) n FROM plays WHERE user_id = ? AND ended_at IS NOT NULL AND completed = 1").bind(user.id).first("n");
  const lvl = levelOf(before + parts.reduce((s, p) => s + p.xp, 0)).level;
  const earned = [
    ["first_run", runs >= 1], ["play_10", firsts >= 10], ["play_15", firsts >= 15],
    ["streak_3", streak >= 3], ["streak_30", streak >= 30],
    ["top_3", scoreRes && scoreRes.accepted && scoreRes.rank <= 3], ["rank_1", scoreRes && scoreRes.accepted && scoreRes.rank === 1],
    ["runs_25", runs >= 25], ["runs_100", runs >= 100],
    ["new_best", scoreRes && scoreRes.accepted && scoreRes.prev_best != null && score > scoreRes.prev_best],
    ["marathon", durMs >= 600000], ["challenge_1", parts.some((p) => p.kind === "challenge")],
    ["level_5", lvl >= 5], ["level_10", lvl >= 10],
  ];
  for (const [id, ok] of earned) if (ok) unlocked.push(await unlock(env, user.id, "site", id, t));
  for (const ev of eventsLive(t)) unlocked.push(await unlock(env, user.id, "site", ev.id, t)); // seasonal badge, any game
  const achs = unlocked.filter(Boolean);
  achs.forEach((a) => a.xp && parts.push({ kind: "achievement", xp: a.xp, id: a.id }));

  const gained = parts.reduce((s, p) => s + p.xp, 0);
  return progress(before, gained, { parts, achievements: achs });
}

export function progress(before, gained, extra = {}) {
  const a = levelOf(before), b = levelOf(before + gained);
  return { gained, ...b, leveled_up: b.level > a.level, unlocks: unlocksBetween(a.level, b.level), ...extra };
}
