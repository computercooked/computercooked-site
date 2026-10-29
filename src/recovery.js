// K-0030 step 5: recovery codes, so a forgotten password doesn't lose an account (there's no email reset).
// 8 one-time codes, shown once at sign-up (or when remade from /me). Only a hash of each is stored.
import { json, bad, readJson, now, sha256, safeEqual, limited, str } from "./util.js";
import { checkPassword, setPassword, startSession, passwordError, linkAnon } from "./auth.js";

const COUNT = 8;
const ALPHA = "0123456789abcdefghjkmnpqrstvwxyz"; // 32 letters: no i, l, o or u to misread
// 12 letters = 60 random bits, written as xxxx-xxxx-xxxx
function makeCode() {
  const a = crypto.getRandomValues(new Uint8Array(12));
  let s = "";
  for (let i = 0; i < 12; i++) s += ALPHA[a[i] & 31] + (i === 3 || i === 7 ? "-" : "");
  return s;
}
// typed back in: any case, spaces or dashes, and o/i/l read as 0/1
const norm = (c) => String(c || "").toLowerCase().replace(/[o]/g, "0").replace(/[il]/g, "1").replace(/[^0-9a-z]/g, "");
const hashCode = (userId, code) => sha256("cc-recovery:" + userId + ":" + norm(code));

// replaces any old codes; returns the new ones (the only time they exist in plain text)
export async function newCodes(env, userId) {
  const codes = Array.from({ length: COUNT }, makeCode);
  const t = now();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM recovery_codes WHERE user_id = ?").bind(userId),
    ...(await Promise.all(codes.map(async (c) =>
      env.DB.prepare("INSERT INTO recovery_codes (user_id, code_hash, created_at) VALUES (?, ?, ?)").bind(userId, await hashCode(userId, c), t)))),
  ]);
  return codes;
}

export async function codesLeft(env, userId) {
  const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM recovery_codes WHERE user_id = ? AND used_at IS NULL").bind(userId).first();
  return r ? r.n : 0;
}

// GET /api/me/recovery
export async function recoveryInfo(env, user) {
  return json({ ok: true, left: await codesLeft(env, user.id), of: COUNT });
}

// POST /api/me/recovery {password}: makes a fresh set; the old codes stop working
export async function remakeCodes(req, env, user, ip) {
  if (limited("recovery-new:" + ip, 10, 600000)) return bad("too many tries. wait a few minutes.", 429);
  const b = await readJson(req, 4096);
  if (!(await checkPassword(env, user.id, b.password))) return bad("wrong password.", 401);
  return json({ ok: true, codes: await newCodes(env, user.id) });
}

// POST /api/auth/recover {username, code, password}: uses up one code, sets a new password,
// logs out every other device and logs this one in.
export async function recover(req, env, ip) {
  const b = await readJson(req, 4096);
  const uname = str(b.username, 32) || "";
  if (limited("recover-ip:" + ip, 10, 600000) || limited("recover-user:" + uname.toLowerCase(), 5, 600000)) {
    return bad("too many tries. wait a few minutes.", 429);
  }
  const row = await env.DB.prepare("SELECT id, username, avatar, status FROM users WHERE username = ?").bind(uname).first();
  const h = await hashCode(row ? row.id : 0, b.code);
  const code = row && row.status !== "banned" && norm(b.code).length === 12
    ? (await env.DB.prepare("SELECT rowid AS rid, code_hash FROM recovery_codes WHERE user_id = ? AND used_at IS NULL").bind(row.id).all()).results.find((c) => safeEqual(c.code_hash, h))
    : null;
  if (!code) return bad("that username and code don't match (or the code was already used).", 401);
  const err = passwordError(b.password, row.username);
  if (err) return bad(err);
  // claim the code first, so two tries at once can't both use it
  const used = await env.DB.prepare("UPDATE recovery_codes SET used_at = ? WHERE rowid = ? AND used_at IS NULL").bind(now(), code.rid).run();
  if (!used.meta.changes) return bad("that code was already used.", 401);
  await setPassword(env, row.id, b.password);
  await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(row.id).run();
  const xp = await linkAnon(env, row.id, b.anon_id || b.anon, row.username);
  return startSession(env, row.id, req, { ok: true, user: { id: row.id, username: row.username, avatar: row.avatar }, left: await codesLeft(env, row.id), xp });
}
