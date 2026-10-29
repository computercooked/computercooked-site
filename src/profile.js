// Profiles and account settings (slice C).
//   GET  /api/me/profile            your profile + private settings (email)
//   POST /api/me/profile            {display_name, bio, fav_game, badges[], theme, frame, public}  (any subset)
//   POST /api/me/email              {email, news}   stored unverified; "" removes it
//   GET  /api/me/export             everything stored about you, as a JSON download
//   GET  /api/u/:username           public profile (or {private:true})
import { json, bad, readJson, now, slugOk, nameClean, textClean, dayOf } from "./util.js";
import { games } from "./db.js";
import { levelOf, totalXp, SITE_ACH } from "./xp.js";
import { relation } from "./friends.js";
import { needLevel, cosmeticsFor, FRAMES } from "./cosmetics.js";
import { eventDef } from "./social.js";

export const THEMES = ["lime", "lilac", "hot", "ice", "cooked", "paper", "mint", "pink", "gold", "chrome"];
const BADGE_RE = /^[a-z0-9-]{1,40}:[a-z0-9_-]{1,40}$/;

async function row(env, userId) {
  return env.DB.prepare("SELECT * FROM profiles WHERE user_id = ?").bind(userId).first();
}
// the avatar frame lives in its own table (migration 0011); "none" when never picked
async function frameOf(env, userId) {
  return (await env.DB.prepare("SELECT frame FROM frames WHERE user_id = ?").bind(userId).first("frame")) || "none";
}
function shape(p) {
  let badges = [];
  try { badges = JSON.parse(p?.badges || "[]"); } catch {}
  return {
    display_name: p?.display_name || null, bio: p?.bio || "", fav_game: p?.fav_game || null,
    badges: Array.isArray(badges) ? badges : [], theme: p?.theme || "lime", public: p ? !!p.public : true,
  };
}

export async function getMyProfile(env, user) {
  const p = await row(env, user.id);
  const level = levelOf(await totalXp(env, user.id)).level;
  return json({ ok: true, avatar: user.avatar, level, cosmetics: cosmeticsFor(level), profile: { ...shape(p), frame: await frameOf(env, user.id) }, email: p?.email || null, email_verified: !!p?.email_verified, news_optin: !!p?.news_optin });
}

export async function saveMyProfile(req, env, user, origin) {
  const b = await readJson(req, 4096);
  const cur = shape(await row(env, user.id));
  const next = { ...cur };
  if ("display_name" in b) {
    const n = typeof b.display_name === "string" ? b.display_name.trim().replace(/\s+/g, " ") : "";
    if (n && (!/^[A-Za-z0-9 _.\-]{2,24}$/.test(n) || !nameClean(n) || /^guest/i.test(n))) return bad("display names are 2-24 letters, numbers, spaces, _ . - (and nothing rude).");
    next.display_name = n || null;
  }
  if ("bio" in b) {
    const t = typeof b.bio === "string" ? b.bio.replace(/[\u0000-\u001f]/g, " ").trim() : "";
    if (t.length > 160) return bad("bios are 160 characters max.");
    if (t && !textClean(t)) return bad("keep the bio friendly.");
    if (/https?:|www\.|\.com\b/i.test(t)) return bad("no links in bios yet.");
    next.bio = t;
  }
  if ("fav_game" in b) {
    if (b.fav_game && !(slugOk(b.fav_game) && (await games(env, origin)).has(b.fav_game))) return bad("pick a game from the site.");
    next.fav_game = b.fav_game || null;
  }
  if ("badges" in b) {
    const list = Array.isArray(b.badges) ? [...new Set(b.badges.filter((x) => typeof x === "string" && BADGE_RE.test(x)))].slice(0, 3) : [];
    // only achievements this account has actually unlocked can be pinned
    for (const k of list) {
      const [g, id] = k.split(":");
      const has = await env.DB.prepare("SELECT 1 FROM achievements WHERE user_id = ? AND game = ? AND ach_id = ?").bind(user.id, g, id).first();
      if (!has) return bad("you can only pin badges you've unlocked.");
    }
    next.badges = list;
  }
  if ("theme" in b) {
    if (!THEMES.includes(b.theme)) return bad("unknown theme");
    const need = needLevel("theme", b.theme);
    if (need > 1 && levelOf(await totalXp(env, user.id)).level < need) return bad(`reach level ${need} to use that color.`, 403);
    next.theme = b.theme;
  }
  if ("public" in b) next.public = !!b.public;
  let frame = null;
  if ("frame" in b) {
    frame = b.frame || "none";
    if (!FRAMES.includes(frame)) return bad("unknown frame");
    const need = needLevel("frame", frame);
    if (need > 1 && levelOf(await totalXp(env, user.id)).level < need) return bad(`reach level ${need} to use that frame.`, 403);
  }

  await env.DB.prepare(
    "INSERT INTO profiles (user_id, display_name, bio, fav_game, badges, theme, public, updated_at) VALUES (?,?,?,?,?,?,?,?) " +
    "ON CONFLICT(user_id) DO UPDATE SET display_name = excluded.display_name, bio = excluded.bio, fav_game = excluded.fav_game, " +
    "badges = excluded.badges, theme = excluded.theme, public = excluded.public, updated_at = excluded.updated_at"
  ).bind(user.id, next.display_name, next.bio, next.fav_game, JSON.stringify(next.badges), next.theme, next.public ? 1 : 0, now()).run();
  if (frame === "none") await env.DB.prepare("DELETE FROM frames WHERE user_id = ?").bind(user.id).run();
  else if (frame) await env.DB.prepare("INSERT INTO frames (user_id, frame, updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET frame = excluded.frame, updated_at = excluded.updated_at")
    .bind(user.id, frame, now()).run();
  return json({ ok: true, profile: { ...next, frame: frame || await frameOf(env, user.id) } });
}

export async function setEmail(req, env, user) {
  const b = await readJson(req, 1024);
  const e = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (e && (e.length > 254 || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(e))) return bad("that doesn't look like an email.");
  const news = !!(e && b.news);
  await env.DB.prepare(
    "INSERT INTO profiles (user_id, email, email_verified, news_optin, public, updated_at) VALUES (?,?,0,?,1,?) " +
    "ON CONFLICT(user_id) DO UPDATE SET email = excluded.email, email_verified = 0, news_optin = excluded.news_optin, updated_at = excluded.updated_at"
  ).bind(user.id, e || null, news ? 1 : 0, now()).run();
  return json({ ok: true, email: e || null, email_verified: false, news_optin: news });
}

// Everything stored about the account (minus password hash/salt and session tokens, which are secrets).
export async function exportData(env, user) {
  const q = (sql) => env.DB.prepare(sql).bind(user.id).all().then((r) => r.results);
  const u = await env.DB.prepare("SELECT id, username, avatar, status, created_at FROM users WHERE id = ?").bind(user.id).first();
  const data = {
    exported_at: new Date().toISOString(),
    account: u,
    profile: await row(env, user.id),
    frame: await env.DB.prepare("SELECT frame, updated_at FROM frames WHERE user_id = ?").bind(user.id).first(),
    sessions: (await env.DB.prepare("SELECT COUNT(*) n FROM sessions WHERE user_id = ?").bind(user.id).first("n")) + " active (tokens not included)",
    plays: await q("SELECT id, game, version, started_at, ended_at, duration_ms, score, completed, referrer, device, day FROM plays WHERE user_id = ? ORDER BY started_at"),
    scores: await q("SELECT game, name, score, day, ts, hidden FROM scores WHERE user_id = ? ORDER BY ts"),
    feedback: await q("SELECT game, version, rating, text, ts FROM feedback WHERE user_id = ? ORDER BY ts"),
    favorites: await q("SELECT game, ts FROM favorites WHERE user_id = ?"),
    saves: await q("SELECT game, slot, data, bytes, version, updated_at FROM saves WHERE user_id = ?"),
    xp: await q("SELECT kind, game, ref, amount, day, ts FROM xp_events WHERE user_id = ? ORDER BY ts"),
    achievements: await q("SELECT game, ach_id, ts FROM achievements WHERE user_id = ?"),
    reports_filed: await q("SELECT kind, target, reason, ts FROM reports WHERE user_id = ?"),
    friends: await q("SELECT u.username, f.status, f.created_at FROM friends f JOIN users u ON u.id = f.friend_id WHERE f.user_id = ?"),
    dares: await q("SELECT id, game, score, from_name, opens, beats, created_at FROM dares WHERE from_user = ? ORDER BY created_at"),
    joined_from_dare: await q("SELECT dare_id, created_at, credited_at FROM referrals WHERE new_user = ?"),
    players_brought_in: await q("SELECT created_at, credited_at FROM referrals WHERE sender = ? ORDER BY created_at"),
    recovery_codes: (await env.DB.prepare("SELECT COUNT(*) n FROM recovery_codes WHERE user_id = ? AND used_at IS NULL").bind(user.id).first("n")) + " unused (codes are stored hashed and can't be shown)",
    passkeys: await q("SELECT label, created_at, last_used FROM passkeys WHERE user_id = ? ORDER BY created_at"),
  };
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8", "cache-control": "no-store",
      "content-disposition": `attachment; filename="computercooked-${u.username}-${dayOf(now())}.json"`,
    },
  });
}

export async function publicProfile(env, username, origin, viewer) {
  if (typeof username !== "string" || !/^[A-Za-z0-9_]{3,16}$/.test(username)) return bad("no such player", 404);
  const u = await env.DB.prepare("SELECT id, username, avatar, status, created_at FROM users WHERE username = ?").bind(username).first();
  if (!u) {
    // K-0030 step 3: a name changed in the last 30 days points to the new one
    const m = await env.DB.prepare(
      "SELECT u.username FROM username_history h JOIN users u ON u.id = h.user_id WHERE h.old_name = ? AND h.changed_at > ? AND u.status = 'active' ORDER BY h.changed_at DESC LIMIT 1"
    ).bind(username, Date.now() - 30 * 86400000).first("username");
    if (m) return json({ ok: false, error: "this player has a new name", moved: m }, 404);
  }
  if (!u || u.status !== "active") return bad("no such player", 404);
  const p = shape(await row(env, u.id));
  const xp = levelOf(await totalXp(env, u.id));
  const base = { ok: true, username: u.username, avatar: u.avatar, level: xp.level, title: xp.title, theme: p.theme, frame: await frameOf(env, u.id), relation: await relation(env, viewer, u.id) };
  if (!p.public) return json({ ...base, private: true });
  const catalog = await games(env, origin);
  const badges = p.badges.map((k) => {
    const [g, id] = k.split(":");
    const d = g === "site" ? SITE_ACH[id] || eventDef(id) : (catalog.get(g)?.achievements || []).find((a) => a.id === id);
    return d ? { game: g, id, name: d.name, desc: d.desc || "" } : null;
  }).filter(Boolean);
  const highs = (await env.DB.prepare(
    "SELECT game, MAX(score) best FROM scores WHERE user_id = ? AND hidden = 0 GROUP BY game ORDER BY best DESC LIMIT 6"
  ).bind(u.id).all()).results.filter((h) => catalog.has(h.game));
  const achCount = await env.DB.prepare("SELECT COUNT(*) n FROM achievements WHERE user_id = ?").bind(u.id).first("n");
  return json({
    ...base, display_name: p.display_name, bio: p.bio, fav_game: p.fav_game, badges, highs,
    xp: xp.xp, achievements: achCount, joined: dayOf(u.created_at).slice(0, 7),
  }); // no-store (json() default): going private or deleting the account must take effect right away
}

export async function deleteProfile(env, userId) {
  await env.DB.prepare("DELETE FROM profiles WHERE user_id = ?").bind(userId).run();
}
