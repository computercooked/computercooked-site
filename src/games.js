// Plays/events, leaderboards, feedback, hub stats, /me data.
import { json, bad, readJson, now, dayOf, weekOf, str, num, slugOk, idOk, refOk, deviceOf, limited, nameClean, streakFrom } from "./util.js";
import { games } from "./db.js";
import { awardPlay, unlock, totalXp, progress, levelOf, SITE_ACH } from "./xp.js";
import { friendIds, people } from "./friends.js";
import { EVENTS, eventsLive } from "./social.js";

const guestName = (anon) => {
  let h = 0;
  for (let i = 0; i < anon.length; i++) h = (h * 31 + anon.charCodeAt(i)) >>> 0;
  return "guest-" + String(1000 + (h % 9000));
};
const playerKey = (user, anon) => (user ? "u:" + user.id : "a:" + anon);

function cleanGuest(name, anon) {
  const n = typeof name === "string" ? name.trim().slice(0, 16) : "";
  if (n && /^[A-Za-z0-9_ .-]{2,16}$/.test(n) && nameClean(n) && !/^guest/i.test(n)) return n;
  return guestName(anon);
}

// POST /api/events  {anon, tester, ref, name, events:[{t:'start'|'end'|'event', id, game, v, score, dur, completed, auto, name, data}]}
export async function events(req, env, ip, user, origin) {
  if (limited("events:" + ip, 240, 60000)) return bad("slow down", 429);
  const b = await readJson(req, 32 * 1024);
  const anon = idOk(b.anon) ? b.anon : null;
  if (!anon && !user) return bad("no player id");
  const list = Array.isArray(b.events) ? b.events.slice(0, 50) : [];
  const tester = str(b.tester, 32);
  const ref = refOk(b.ref);
  const device = deviceOf(req.headers.get("user-agent") || "");
  const catalog = await games(env, origin);
  const results = {};
  const unlocked = [];
  const t = now();

  for (const e of list) {
    if (!e || !idOk(e.id) || !slugOk(e.game)) continue;
    if (e.t === "start") {
      await env.DB.prepare(
        "INSERT OR IGNORE INTO plays (id, game, version, anon_id, user_id, tester, started_at, referrer, device, day, auto) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
      ).bind(e.id, e.game, str(e.v, 16) || "1", anon, user ? user.id : null, tester, t, ref, device, dayOf(t), e.auto ? 1 : 0).run();
    } else if (e.t === "end") {
      const play = await env.DB.prepare("SELECT * FROM plays WHERE id = ?").bind(e.id).first();
      if (!play || play.ended_at) continue;
      if (play.anon_id !== anon && !(user && play.user_id === user.id)) continue;
      // trust the client's duration only up to what the server actually saw (+ slack for batching)
      const seen = t - play.started_at + 15000;
      const dur = Math.max(0, Math.min(num(e.dur) ?? seen, seen, 6 * 3600000));
      const score = num(e.score);
      const completed = e.completed === false ? 0 : 1;
      await env.DB.prepare("UPDATE plays SET ended_at = ?, duration_ms = ?, score = ?, completed = ? WHERE id = ?")
        .bind(t, Math.round(dur), score, completed, e.id).run();
      const res = await recordScore(env, catalog.get(play.game), play, score, dur, user, anon, b.name, t);
      if (user) res.xp = await awardPlay(env, user, play, catalog.get(play.game), score == null ? null : res, dur, !!completed, t, score);
      results[e.id] = res;
    } else if (e.t === "achieve") {
      // cc.achieve(id): accounts only, and only ids the game declares in its entry.json
      if (!user || typeof e.ach !== "string") continue;
      const a = await unlock(env, user.id, e.game, e.ach.slice(0, 40), t, catalog.get(e.game));
      if (a) unlocked.push({ ...a, ...progress(await totalXp(env, user.id) - a.xp, a.xp) });
    } else if (e.t === "event") {
      const name = str(e.name, 40);
      if (!name) continue;
      let data = null;
      try { data = e.data == null ? null : JSON.stringify(e.data).slice(0, 500); } catch {}
      await env.DB.prepare("INSERT INTO events (play_id, game, name, data, ts) VALUES (?,?,?,?,?)").bind(e.id, e.game, name, data, t).run();
    }
  }
  return json({ ok: true, results, achievements: unlocked });
}

async function recordScore(env, game, play, score, dur, user, anon, guest, t) {
  if (!game || !game.max_score_per_sec || score == null || score <= 0) return { accepted: false, reason: "no board" };
  const cap = game.max_score_per_sec * (dur / 1000) + (game.score_slack ?? 50);
  if (score > cap || (game.max_score && score > game.max_score)) return { accepted: false, reason: "score out of bounds" };
  const player = playerKey(user && play.user_id === user.id ? user : null, play.anon_id || anon);
  const prevBest = await env.DB.prepare("SELECT MAX(score) b FROM scores WHERE game = ? AND player = ? AND hidden = 0").bind(play.game, player).first("b");
  const name = user ? user.username : cleanGuest(guest, play.anon_id || anon);
  await env.DB.prepare(
    "INSERT OR IGNORE INTO scores (game, play_id, player, user_id, name, score, day, week, ts) VALUES (?,?,?,?,?,?,?,?,?)"
  ).bind(play.game, play.id, player, user ? user.id : null, name, score, dayOf(t), weekOf(t), t).run();
  const best = await env.DB.prepare("SELECT MAX(score) b FROM scores WHERE game = ? AND player = ? AND hidden = 0").bind(play.game, player).first("b");
  const rank = await env.DB.prepare(
    "SELECT COUNT(*) n FROM (SELECT player, MAX(score) b FROM scores WHERE game = ? AND hidden = 0 GROUP BY player) WHERE b > ?"
  ).bind(play.game, best).first("n");
  return { accepted: true, best, prev_best: prevBest, rank: rank + 1, name };
}

// GET /api/leaderboard?game=crash&period=day|week|all&player=a:<anon>
export async function leaderboard(url, env, user) {
  const game = url.searchParams.get("game");
  if (!slugOk(game)) return bad("game?");
  const period = ["day", "week", "all"].includes(url.searchParams.get("period")) ? url.searchParams.get("period") : "all";
  const t = now();
  let where = period === "day" ? " AND day = ?" : period === "week" ? " AND week = ?" : "";
  const args = [game].concat(period === "day" ? [dayOf(t)] : period === "week" ? [weekOf(t)] : []);
  // friends=1: you and your friends only (logged in)
  const friendsOnly = url.searchParams.get("friends") === "1";
  if (friendsOnly) {
    if (!user) return bad("log in first", 401);
    const keys = [user.id].concat(await friendIds(env, user.id)).map((id) => "u:" + id);
    where += ` AND player IN (${keys.map(() => "?").join(",")})`;
    args.push(...keys);
  }
  const { results } = await env.DB.prepare(
    `SELECT player, name, MAX(score) AS score, id, user_id FROM scores WHERE game = ? AND hidden = 0${where} GROUP BY player ORDER BY score DESC LIMIT ${friendsOnly ? 50 : 10}`
  ).bind(...args).all();
  let me = url.searchParams.get("player");
  if (user) me = "u:" + user.id;
  // account rows show the current display name and link to /u/<username>
  const who = await people(env, results.map((r) => r.user_id).filter(Boolean));
  return json({
    ok: true, game, period, friends: friendsOnly,
    rows: results.map((r, i) => {
      const p = r.user_id && who.get(r.user_id);
      return { rank: i + 1, name: p ? p.name : r.name, u: p ? p.username : undefined, score: r.score, id: r.id, me: r.player === me };
    }),
  }, 200, { "cache-control": "no-store" });
}

// POST /api/feedback {game, version, rating, text, tester, anon, play_id}
export async function feedback(req, env, ip, user) {
  if (limited("fb:" + ip, 12, 600000)) return bad("that's a lot of feedback. thank you. try again later.", 429);
  const b = await readJson(req, 8192);
  if (!slugOk(b.game)) return bad("game?");
  const rating = b.rating === 1 || b.rating === -1 ? b.rating : 0;
  const text = typeof b.text === "string" ? b.text.trim().slice(0, 1000) : "";
  if (!rating && !text) return bad("say something or pick a thumb.");
  await env.DB.prepare(
    "INSERT INTO feedback (game, version, rating, text, tester, anon_id, user_id, play_id, ts) VALUES (?,?,?,?,?,?,?,?,?)"
  ).bind(b.game, str(b.version, 16) || "1", rating, text || null, str(b.tester, 32), idOk(b.anon) ? b.anon : null, user ? user.id : null, idOk(b.play_id) ? b.play_id : null, now()).run();
  const a = user ? await unlock(env, user.id, "site", "rate_game") : null;
  return json({ ok: true, achievements: a ? [a] : [] });
}

// GET /api/stats — play counts for hub shelves (public, cached briefly)
export async function stats(env) {
  const t = now();
  const wk = dayOf(t - 7 * 86400000), prev = dayOf(t - 14 * 86400000);
  const { results } = await env.DB.prepare(
    `SELECT game, COUNT(*) total,
       SUM(day >= ?) week,
       SUM(day >= ? AND day < ?) prev_week,
       COUNT(DISTINCT CASE WHEN day >= ? THEN COALESCE('u' || user_id, 'a' || anon_id) END) players_week
     FROM plays GROUP BY game`
  ).bind(wk, prev, wk, wk).all();
  return json({ ok: true, games: results }, 200, { "cache-control": "public, max-age=60" });
}

// POST /api/report {kind, target, reason}
export async function report(req, env, ip, user) {
  if (limited("report:" + ip, 10, 3600000)) return bad("slow down", 429);
  const b = await readJson(req, 4096);
  const kind = ["username", "score", "feedback", "upload"].includes(b.kind) ? b.kind : null;
  if (!kind || !b.target) return bad("what are you reporting?");
  await env.DB.prepare("INSERT INTO reports (kind, target, reason, anon_id, user_id, ts) VALUES (?,?,?,?,?,?)")
    .bind(kind, str(b.target, 100), str(b.reason, 300), idOk(b.anon) ? b.anon : null, user ? user.id : null, now()).run();
  // a score reported 3+ times is hidden until an admin looks at it
  if (kind === "score" && /^\d+$/.test(String(b.target))) {
    const n = await env.DB.prepare("SELECT COUNT(*) n FROM reports WHERE kind = 'score' AND target = ? AND resolved = 0").bind(String(b.target)).first("n");
    if (n >= 3) await env.DB.prepare("UPDATE scores SET hidden = 1 WHERE id = ?").bind(+b.target).run();
  }
  return json({ ok: true });
}

// GET /api/me/summary — recent games, bests, favorites, streak
export async function meSummary(env, user, origin) {
  const recent = (await env.DB.prepare(
    "SELECT game, MAX(started_at) last, COUNT(*) plays, COALESCE(SUM(duration_ms), 0) ms FROM plays WHERE user_id = ? GROUP BY game ORDER BY last DESC LIMIT 30"
  ).bind(user.id).all()).results;
  const bests = (await env.DB.prepare(
    "SELECT game, MAX(score) best FROM scores WHERE user_id = ? AND hidden = 0 GROUP BY game"
  ).bind(user.id).all()).results;
  const favs = (await env.DB.prepare("SELECT game FROM favorites WHERE user_id = ? ORDER BY ts DESC").bind(user.id).all()).results.map((r) => r.game);
  // newest cloud save per game, for "jump back in" on the hub
  const saves = (await env.DB.prepare("SELECT game, MAX(updated_at) updated_at FROM saves WHERE user_id = ? GROUP BY game ORDER BY updated_at DESC LIMIT 20").bind(user.id).all()).results;
  const days = (await env.DB.prepare(
    "SELECT DISTINCT day FROM plays WHERE user_id = ? ORDER BY day DESC LIMIT 400"
  ).bind(user.id).all()).results.map((r) => r.day);
  // XP + achievements (slice B)
  const catalog = await games(env, origin);
  const history = (await env.DB.prepare(
    "SELECT kind, game, amount, ts FROM xp_events WHERE user_id = ? ORDER BY ts DESC, id DESC LIMIT 15"
  ).bind(user.id).all()).results;
  const got = (await env.DB.prepare("SELECT game, ach_id, ts FROM achievements WHERE user_id = ?").bind(user.id).all()).results;
  const have = new Map(got.map((a) => [a.game + ":" + a.ach_id, a.ts]));
  const achievements = Object.entries(SITE_ACH).map(([id, d]) => ({ game: "site", id, name: d.name, desc: d.desc, xp: d.xp, unlocked_at: have.get("site:" + id) || null }));
  // seasonal badges: listed while the event runs, and forever once earned
  const live = new Set(eventsLive(now()).map((e) => e.id));
  for (const e of EVENTS) {
    const at = have.get("site:" + e.id) || null;
    if (at || live.has(e.id)) achievements.push({ game: "site", id: e.id, name: e.name, desc: e.desc, xp: e.xp, unlocked_at: at, event: e.label });
  }
  for (const g of catalog.values()) {
    for (const a of g.achievements || []) {
      const at = have.get(g.slug + ":" + a.id) || null;
      // secret ones stay hidden until unlocked
      achievements.push(a.secret && !at ? { game: g.slug, id: a.id, name: "???", desc: "secret", xp: a.xp, unlocked_at: null, secret: true }
        : { game: g.slug, id: a.id, name: a.name, desc: a.desc, xp: a.xp, unlocked_at: at });
    }
  }
  const xp = levelOf(await totalXp(env, user.id));
  const st = streak(days);
  return json({ ok: true, user, recent, bests, favorites: favs, saves, streak: st.n, streak_saved: st.savedRecently, days_played: days.length, xp, xp_history: history, achievements });
}

// consecutive days with a play, counting back from today (or yesterday, so it doesn't reset before you play today)
// the streak shown on /me: counts from today, or from yesterday if you haven't played yet today
export function streak(days) {
  const set = new Set(days), today = dayOf(now());
  return streakFrom(set, set.has(today) ? today : dayOf(now() - 86400000));
}

// POST /api/me/favorite {game, on}
export async function favorite(req, env, user) {
  const b = await readJson(req, 1024);
  if (!slugOk(b.game)) return bad("game?");
  if (b.on) await env.DB.prepare("INSERT OR IGNORE INTO favorites (user_id, game, ts) VALUES (?,?,?)").bind(user.id, b.game, now()).run();
  else await env.DB.prepare("DELETE FROM favorites WHERE user_id = ? AND game = ?").bind(user.id, b.game).run();
  return json({ ok: true, on: !!b.on });
}
