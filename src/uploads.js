// Community uploads (slice 7). Stubs until the R2 bucket and the sandbox origin exist.
import { json, bad } from "./util.js";

export async function uploadGame() { return bad("uploads open soon", 501); }
export async function listCommunity(env) {
  const { results } = await env.DB.prepare(
    "SELECT slug, title, pitch FROM uploads WHERE status = 'approved' ORDER BY reviewed_at DESC LIMIT 50"
  ).all();
  return json({ ok: true, games: results }, 200, { "cache-control": "public, max-age=60" });
}
export async function adminUploads(env) {
  const { results } = await env.DB.prepare("SELECT * FROM uploads ORDER BY created_at DESC LIMIT 100").all();
  return json({ ok: true, uploads: results });
}
export async function reviewUpload() { return bad("uploads open soon", 501); }
