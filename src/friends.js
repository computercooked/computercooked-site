// Friends (slice D1).
//   GET  /api/me/friends   {friends, incoming, outgoing, blocked}: each {username, name, avatar, level}
//   POST /api/me/friends   {action: add | accept | decline | cancel | remove | block | unblock, username}
import { json, bad, readJson, now, limited } from "./util.js";
import { levelOf } from "./xp.js";

const MAX_FRIENDS = 200, MAX_PENDING = 20;

export async function friendIds(env, userId) {
  const { results } = await env.DB.prepare("SELECT friend_id FROM friends WHERE user_id = ? AND status = 'accepted'").bind(userId).all();
  return results.map((r) => r.friend_id);
}

// {id -> {username, name, avatar, level}} for user ids (display name when set, banned accounts left out)
export async function people(env, ids) {
  const out = new Map();
  const list = [...new Set(ids)].filter((x) => Number.isInteger(x));
  for (let i = 0; i < list.length; i += 80) {
    const chunk = list.slice(i, i + 80), q = chunk.map(() => "?").join(",");
    const { results } = await env.DB.prepare(
      `SELECT u.id, u.username, u.avatar, u.status, p.display_name, (SELECT COALESCE(SUM(amount), 0) FROM xp_events x WHERE x.user_id = u.id) xp
       FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id IN (${q})`
    ).bind(...chunk).all();
    for (const r of results) {
      if (r.status === "banned") continue;
      out.set(r.id, { username: r.username, name: r.display_name || r.username, avatar: r.avatar, level: levelOf(r.xp).level });
    }
  }
  return out;
}

export async function listFriends(env, user) {
  const mine = (await env.DB.prepare("SELECT friend_id id, status FROM friends WHERE user_id = ?").bind(user.id).all()).results;
  const incoming = (await env.DB.prepare("SELECT user_id id FROM friends WHERE friend_id = ? AND status = 'pending'").bind(user.id).all()).results;
  const who = await people(env, mine.map((r) => r.id).concat(incoming.map((r) => r.id)));
  const pick = (rows) => rows.map((r) => who.get(r.id)).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
  return json({
    ok: true,
    friends: pick(mine.filter((r) => r.status === "accepted")),
    outgoing: pick(mine.filter((r) => r.status === "pending")),
    blocked: pick(mine.filter((r) => r.status === "blocked")),
    incoming: pick(incoming),
  });
}

export async function friendAction(req, env, user, ip) {
  const b = await readJson(req, 1024);
  const action = b.action;
  if (!["add", "accept", "decline", "cancel", "remove", "block", "unblock"].includes(action)) return bad("what should we do?");
  if (typeof b.username !== "string" || !/^[A-Za-z0-9_]{3,16}$/.test(b.username)) return bad("no such player.", 404);
  const them = await env.DB.prepare("SELECT id, status FROM users WHERE username = ?").bind(b.username).first();
  // blocked-by and banned look exactly like "no such player", so nobody learns they were blocked
  if (!them || them.status === "banned" || them.id === user.id) return bad(them && them.id === user.id ? "that's you." : "no such player.", them && them.id === user.id ? 400 : 404);
  const me = user.id, id = them.id, t = now();
  const rowOf = (a, c) => env.DB.prepare("SELECT status FROM friends WHERE user_id = ? AND friend_id = ?").bind(a, c).first("status");
  const mineRow = await rowOf(me, id), theirRow = await rowOf(id, me);
  const drop = (a, c) => env.DB.prepare("DELETE FROM friends WHERE user_id = ? AND friend_id = ?").bind(a, c);
  const put = (a, c, s) => env.DB.prepare("INSERT INTO friends (user_id, friend_id, status, created_at) VALUES (?,?,?,?) ON CONFLICT(user_id, friend_id) DO UPDATE SET status = excluded.status").bind(a, c, s, t);

  if (action === "add") {
    if (limited("friend-add:" + ip, 30, 3600000)) return bad("slow down a little.", 429);
    if (theirRow === "blocked") return bad("no such player.", 404);
    if (mineRow === "blocked") return bad("unblock them first.");
    if (mineRow === "accepted") return json({ ok: true, status: "friends" });
    if (theirRow === "pending") { await env.DB.batch([put(id, me, "accepted"), put(me, id, "accepted")]); return json({ ok: true, status: "friends" }); }
    const n = await env.DB.prepare("SELECT SUM(status = 'accepted') f, SUM(status = 'pending') p FROM friends WHERE user_id = ?").bind(me).first();
    if ((n?.f || 0) >= MAX_FRIENDS) return bad(`${MAX_FRIENDS} friends is the max for now.`);
    if ((n?.p || 0) >= MAX_PENDING) return bad("too many requests waiting. give them time.");
    await put(me, id, "pending").run();
    return json({ ok: true, status: "requested" });
  }
  if (action === "accept") {
    if (theirRow !== "pending") return bad("no request from them.");
    await env.DB.batch([put(id, me, "accepted"), put(me, id, "accepted")]);
    return json({ ok: true, status: "friends" });
  }
  if (action === "decline") { if (theirRow === "pending") await drop(id, me).run(); return json({ ok: true, status: "none" }); }
  if (action === "cancel") { if (mineRow === "pending") await drop(me, id).run(); return json({ ok: true, status: "none" }); }
  if (action === "remove") { await env.DB.batch([drop(me, id), drop(id, me)]); return json({ ok: true, status: "none" }); }
  if (action === "block") { await env.DB.batch([drop(id, me), put(me, id, "blocked")]); return json({ ok: true, status: "blocked" }); }
  if (action === "unblock") { if (mineRow === "blocked") await drop(me, id).run(); return json({ ok: true, status: "none" }); }
}

// relationship from the viewer's side, for the /u/ page button
export async function relation(env, viewer, targetId) {
  if (!viewer || viewer.id === targetId) return viewer ? "self" : null;
  const a = await env.DB.prepare("SELECT status FROM friends WHERE user_id = ? AND friend_id = ?").bind(viewer.id, targetId).first("status");
  const b = await env.DB.prepare("SELECT status FROM friends WHERE user_id = ? AND friend_id = ?").bind(targetId, viewer.id).first("status");
  if (b === "blocked") return "none"; // never reveal a block
  if (a === "accepted") return "friends";
  if (a === "blocked") return "blocked";
  if (a === "pending") return "requested";
  if (b === "pending") return "incoming";
  return "none";
}
