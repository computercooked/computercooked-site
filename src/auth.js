// Accounts: username + password (PBKDF2-SHA256, per-user salt), httpOnly session cookie.
// 13+ only, checked with a neutral birth month/year gate; the birth date itself is never stored.
import { json, bad, readJson, now, b64, unb64, randomToken, sha256, safeEqual, limited, nameClean, str, HttpError } from "./util.js";

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
  const avatar = AVATARS.includes(b.avatar) ? b.avatar : "lime";
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

export async function setAvatar(req, env, user) {
  const b = await readJson(req, 1024);
  if (!AVATARS.includes(b.avatar)) return bad("unknown avatar");
  await env.DB.prepare("UPDATE users SET avatar = ? WHERE id = ?").bind(b.avatar, user.id).run();
  return json({ ok: true, avatar: b.avatar });
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
