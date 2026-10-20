// Accounts: username + password (PBKDF2-SHA256, per-user salt), httpOnly session cookie.
// 13+ only, checked with a neutral birth month/year gate; the birth date itself is never stored.
import { json, bad, readJson, now, b64, unb64, randomToken, sha256, safeEqual, limited, nameClean, str, HttpError } from "./util.js";
import { levelOf, totalXp } from "./xp.js";
import { noteReferral } from "./referrals.js";
import { avatarLevel } from "./cosmetics.js";

// Workers' WebCrypto caps PBKDF2 at 100,000 iterations.
const ITERATIONS = 100000;
const SESSION_DAYS = 30;
const COOKIE = "cc_session";
export const AVATARS = ["lime", "lilac", "paper", "hot", "ice", "cooked"];

async function hashPassword(password, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return b64(bits);
}

function cookie(token, maxAge, secure) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}
const isSecure = (req) => new URL(req.url).protocol === "https:";

function readCookie(req) {
  const m = (req.headers.get("cookie") || "").match(/(?:^|;\s*)cc_session=([A-Za-z0-9_-]{20,})/);
  return m ? m[1] : null;
}

// Returns {id, username, avatar} or null. Cheap enough to call on every API request.
export async function currentUser(req, env) {
  const token = readCookie(req);
  if (!token) return null;
  const row = await env.DB.prepare(
    "SELECT u.id, u.username, u.avatar, u.status FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?"
  ).bind(await sha256(token), now()).first();
  if (!row || row.status === "banned") return null;
  return { id: row.id, username: row.username, avatar: row.avatar };
}

export function usernameError(u) {
  if (typeof u !== "string" || !/^[A-Za-z0-9_]{3,16}$/.test(u)) return "usernames are 3-16 letters, numbers or _";
  if (/^guest/i.test(u)) return "that one's reserved. try another.";
  if (!nameClean(u)) return "pick a different username.";
  return null;
}

// Age from a birth month/year: counts as 13 only once the birth month has fully started 13 years ago.
export function ageOk(year, month) {
  year = +year; month = +month;
  if (!(year >= 1900 && year <= 2100 && month >= 1 && month <= 12)) return null;
  const d = new Date();
  let age = d.getUTCFullYear() - year;
  if (d.getUTCMonth() + 1 < month) age--;
  return age >= 13;
}

async function startSession(env, userId, req, body) {
  const token = randomToken(32);
  const t = now();
  await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .bind(await sha256(token), userId, t, t + SESSION_DAYS * 86400000).run();
  return json(body, 200, { "set-cookie": cookie(token, SESSION_DAYS * 86400, isSecure(req)) });
}

export async function signup(req, env, ip) {
  if (limited("signup:" + ip, 5, 3600000)) return bad("too many sign-ups from here. try later.", 429);
  const b = await readJson(req, 4096);
  const ok = ageOk(b.birth_year, b.birth_month);
  if (ok === null) return bad("pick your birth month and year.");
  // Under 13: no account, no data kept. The page tells them they can just play.
  if (!ok) return json({ ok: false, under13: true });
  const err = usernameError(b.username);
  if (err) return bad(err);
  const pw = b.password;
  if (typeof pw !== "string" || pw.length < 8 || pw.length > 200) return bad("passwords need 8+ characters.");
  if (pw.toLowerCase() === String(b.username).toLowerCase()) return bad("password can't be your username.");
  const avatar = avatarOk(b.avatar) && avatarLevel(b.avatar) <= 1 ? b.avatar : "lime";
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await hashPassword(pw, salt, ITERATIONS);
  let res;
  try {
    res = await env.DB.prepare(
      "INSERT INTO users (username, pass_hash, salt, iterations, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(b.username, hash, b64(salt), ITERATIONS, avatar, now()).run();
  } catch (e) {
    if (/UNIQUE/i.test(String(e))) return bad("that username is taken.");
    throw e;
  }
  const id = res.meta.last_row_id;
  await linkAnon(env, id, b.anon_id || b.anon, b.username);
  await noteReferral(env, id, b.ref_dare);
  return startSession(env, id, req, { ok: true, user: { id, username: b.username, avatar } });
}

export async function login(req, env, ip) {
  const b = await readJson(req, 4096);
  const uname = str(b.username, 32) || "";
  if (limited("login-ip:" + ip, 20, 600000) || limited("login-user:" + uname.toLowerCase(), 8, 600000)) {
    return bad("too many tries. wait a few minutes.", 429);
  }
  const row = await env.DB.prepare("SELECT id, username, avatar, pass_hash, salt, iterations, status FROM users WHERE username = ?")
    .bind(uname).first();
  // Hash even when the user doesn't exist, so timing doesn't reveal which usernames exist.
  const salt = row ? unb64(row.salt) : new Uint8Array(16);
  const hash = await hashPassword(String(b.password || ""), salt, row ? row.iterations : ITERATIONS);
  if (!row || !safeEqual(hash, row.pass_hash) || row.status === "banned") return bad("wrong username or password.", 401);
  await linkAnon(env, row.id, b.anon_id || b.anon, row.username);
  return startSession(env, row.id, req, { ok: true, user: { id: row.id, username: row.username, avatar: row.avatar } });
}

export async function logout(req, env) {
  const token = readCookie(req);
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  return json({ ok: true }, 200, { "set-cookie": cookie("", 0, isSecure(req)) });
}

// built avatars: "x:<mood>-<face 0-7>-<body 0-4>-<accessory>" (rendered by assets/avatars.js)
export const AVATAR_RE = /^x:(tired|happy|flat|angry|x)-[0-7]-[0-4]-(none|headphones|cap|witch|bow|glasses|steam|antenna|crown|halo|flames|chef)$/;
export const avatarOk = (a) => typeof a === "string" && (AVATARS.includes(a) || AVATAR_RE.test(a));

// POST /api/me/password {current, next}: also signs out every other device
export async function changePassword(req, env, user, ip) {
  if (limited("pw:" + ip, 10, 600000)) return bad("too many tries. wait a few minutes.", 429);
  const b = await readJson(req, 4096);
  const row = await env.DB.prepare("SELECT username, pass_hash, salt, iterations FROM users WHERE id = ?").bind(user.id).first();
  if (!row) return bad("no such account", 404);
  const hash = await hashPassword(String(b.current || ""), unb64(row.salt), row.iterations);
  if (!safeEqual(hash, row.pass_hash)) return bad("current password is wrong.", 401);
  const pw = b.next;
  if (typeof pw !== "string" || pw.length < 8 || pw.length > 200) return bad("passwords need 8+ characters.");
  if (pw.toLowerCase() === row.username.toLowerCase()) return bad("password can't be your username.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keep = await sha256(readCookie(req) || "");
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET pass_hash = ?, salt = ?, iterations = ? WHERE id = ?").bind(await hashPassword(pw, salt, ITERATIONS), b64(salt), ITERATIONS, user.id),
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash != ?").bind(user.id, keep),
  ]);
  return json({ ok: true });
}

// POST /api/me/logout-all: ends every session, this one included
export async function logoutAll(req, env, user) {
  await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id).run();
  return json({ ok: true }, 200, { "set-cookie": cookie("", 0, isSecure(req)) });
}

export async function setAvatar(req, env, user) {
  const b = await readJson(req, 1024);
  if (!avatarOk(b.avatar)) return bad("unknown avatar");
  const need = avatarLevel(b.avatar);
  if (need > 1 && levelOf(await totalXp(env, user.id)).level < need) return bad(`reach level ${need} to wear that.`, 403);
  await env.DB.prepare("UPDATE users SET avatar = ? WHERE id = ?").bind(b.avatar, user.id).run();
  return json({ ok: true, avatar: b.avatar });
}

// POST /api/me/delete {password}: hard-deletes the account and everything tied to it.
// Plays, feedback and reports stay for the game stats, with the account link removed.
export async function deleteAccount(req, env, user, ip) {
  if (limited("delete:" + ip, 10, 600000)) return bad("too many tries. wait a few minutes.", 429);
  const b = await readJson(req, 4096);
  const row = await env.DB.prepare("SELECT pass_hash, salt, iterations FROM users WHERE id = ?").bind(user.id).first();
  if (!row) return bad("no such account", 404);
  const hash = await hashPassword(String(b.password || ""), unb64(row.salt), row.iterations);
  if (!safeEqual(hash, row.pass_hash)) return bad("wrong password.", 401);
  const id = user.id;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id),
    env.DB.prepare("DELETE FROM saves WHERE user_id = ?").bind(id),
    env.DB.prepare("DELETE FROM favorites WHERE user_id = ?").bind(id),
    env.DB.prepare("DELETE FROM scores WHERE user_id = ?").bind(id),
    env.DB.prepare("DELETE FROM uploads WHERE user_id = ?").bind(id),
    env.DB.prepare("DELETE FROM xp_events WHERE user_id = ?").bind(id),
    env.DB.prepare("DELETE FROM achievements WHERE user_id = ?").bind(id),
    env.DB.prepare("DELETE FROM profiles WHERE user_id = ?").bind(id),
    env.DB.prepare("DELETE FROM frames WHERE user_id = ?").bind(id),
    env.DB.prepare("DELETE FROM friends WHERE user_id = ? OR friend_id = ?").bind(id, id),
    env.DB.prepare("DELETE FROM dare_beats WHERE player = ?").bind("u:" + id),
    env.DB.prepare("DELETE FROM dare_beats WHERE dare_id IN (SELECT id FROM dares WHERE from_user = ?)").bind(id),
    env.DB.prepare("DELETE FROM referrals WHERE new_user = ? OR sender = ?").bind(id, id),
    env.DB.prepare("DELETE FROM dare_funnel WHERE dare_id IN (SELECT id FROM dares WHERE from_user = ?)").bind(id),
    env.DB.prepare("DELETE FROM dares WHERE from_user = ?").bind(id),
    env.DB.prepare("UPDATE plays SET user_id = NULL WHERE user_id = ?").bind(id),
    env.DB.prepare("UPDATE feedback SET user_id = NULL WHERE user_id = ?").bind(id),
    env.DB.prepare("UPDATE reports SET user_id = NULL WHERE user_id = ?").bind(id),
    env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id),
  ]);
  return json({ ok: true, deleted: true }, 200, { "set-cookie": cookie("", 0, isSecure(req)) });
}

// Plays made on this device before signing up/in get credited to the account.
async function linkAnon(env, userId, anon, username) {
  if (typeof anon !== "string" || !/^[A-Za-z0-9_-]{8,64}$/.test(anon)) return;
  await env.DB.batch([
    env.DB.prepare("UPDATE plays SET user_id = ? WHERE anon_id = ? AND user_id IS NULL").bind(userId, anon),
    env.DB.prepare("UPDATE scores SET user_id = ?, player = ?, name = ? WHERE player = ? AND user_id IS NULL").bind(userId, "u:" + userId, username, "a:" + anon),
  ]);
}

export { HttpError };
