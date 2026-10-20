// Cloud saves (slice A). Logged-in players only; guests keep localStorage in cc-sdk.js.
//   GET    /api/saves/:game          -> {slots:[{slot, updated_at, bytes, version}]}
//   GET    /api/saves/:game/:slot    -> {save:{slot, data, updated_at, bytes, version} | null}
//   PUT    /api/saves/:game/:slot    {data, updated_at?, version?} -> {save:{slot, updated_at, bytes}}
//   DELETE /api/saves/:game/:slot
import { json, bad, readJson, now, slugOk, str, limited } from "./util.js";
import { unlock } from "./xp.js";

export const MAX_BYTES = 512 * 1024;
export const MAX_SLOTS = 5;
const slotOk = (s) => typeof s === "string" && /^[a-z0-9_-]{1,32}$/.test(s);

export async function savesRoute(req, env, user, path) {
  if (!user) return bad("log in to use cloud saves", 401);
  const [, , , game, slot, extra] = path.split("/"); // "", api, saves, game, slot
  if (!slugOk(game) || extra !== undefined || (slot !== undefined && !slotOk(slot))) return bad("no such save", 404);
  const m = req.method;

  if (slot === undefined) {
    if (m !== "GET") return bad("method not allowed", 405);
    const { results } = await env.DB.prepare(
      "SELECT slot, updated_at, bytes, version FROM saves WHERE user_id = ? AND game = ? ORDER BY updated_at DESC"
    ).bind(user.id, game).all();
    return json({ ok: true, game, slots: results });
  }

  if (m === "GET") {
    const row = await env.DB.prepare(
      "SELECT slot, data, updated_at, bytes, version FROM saves WHERE user_id = ? AND game = ? AND slot = ?"
    ).bind(user.id, game, slot).first();
    if (!row) return json({ ok: true, save: null });
    let data = null;
    try { data = JSON.parse(row.data); } catch {}
    return json({ ok: true, save: { slot: row.slot, data, updated_at: row.updated_at, bytes: row.bytes, version: row.version } });
  }

  if (m === "DELETE") {
    await env.DB.prepare("DELETE FROM saves WHERE user_id = ? AND game = ? AND slot = ?").bind(user.id, game, slot).run();
    return json({ ok: true });
  }

  if (m === "PUT") {
    // about one write per 10s per slot; the SDK batches to match, the second write covers its trailing flush
    if (limited(`save:${user.id}:${game}:${slot}`, 2, 10000)) return bad("saving too often. it'll catch up.", 429);
    const b = await readJson(req, MAX_BYTES * 2 + 4096);
    if (!("data" in b)) return bad("nothing to save");
    const text = JSON.stringify(b.data ?? null);
    const bytes = new TextEncoder().encode(text).length;
    if (bytes > MAX_BYTES) return bad("save is over 512 KB", 413);
    const t = now();
    // keep the client's clock when it is sane, so "which copy is newer" agrees with the device
    const at = typeof b.updated_at === "number" && Math.abs(b.updated_at - t) < 86400000 ? Math.round(b.updated_at) : t;

    const exists = await env.DB.prepare("SELECT updated_at FROM saves WHERE user_id = ? AND game = ? AND slot = ?").bind(user.id, game, slot).first();
    if (!exists) {
      const n = await env.DB.prepare("SELECT COUNT(*) n FROM saves WHERE user_id = ? AND game = ?").bind(user.id, game).first("n");
      if (n >= MAX_SLOTS) return bad(`${MAX_SLOTS} save slots per game. delete one first.`, 409);
    } else if (exists.updated_at > at) {
      // an older copy arriving late never overwrites a newer one
      return json({ ok: true, stale: true, save: { slot, updated_at: exists.updated_at } });
    }
    await env.DB.prepare(
      "INSERT INTO saves (user_id, game, slot, data, bytes, version, updated_at) VALUES (?,?,?,?,?,?,?) " +
      "ON CONFLICT(user_id, game, slot) DO UPDATE SET data = excluded.data, bytes = excluded.bytes, version = excluded.version, updated_at = excluded.updated_at"
    ).bind(user.id, game, slot, text, bytes, str(b.version, 16), at).run();
    const a = b.data == null ? null : await unlock(env, user.id, "site", "first_save", t);
    return json({ ok: true, save: { slot, updated_at: at, bytes }, achievements: a ? [a] : [] });
  }

  return bad("method not allowed", 405);
}
