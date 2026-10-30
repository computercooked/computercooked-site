// "What should we make next?" (K-0050a item 7): a short idea and an optional handle, no login, our own D1 table.
//   POST /api/ideas {text, handle?, page?, ms, website, anon?}  -> {ok}
//   GET  /api/admin/ideas?days=14                                -> {ok, ideas: [{id, text, handle, page, at}]}
// Spam: a honeypot field ("website", hidden from people), a minimum time on the form, no links, a per-IP limit kept in
// memory only, a cap on the whole site per hour, and repeats of the same idea within a day are dropped. Anything
// caught by the honeypot or the timer gets the same {ok} as a real one, so a bot learns nothing.
import { json, bad, readJson, now, limited, nameClean, isTestAnon, str } from "./util.js";

const LINK = /(https?:|www\.|\.(com|net|org|io|gg|ru|xyz|ly|co)\b|<|>)/i;
const HANDLE = /^[a-z0-9_.-]{1,30}$/i;

export async function postIdea(req, env, ip) {
  if (limited("ideas:" + ip, 10, 3600000)) return bad("that's plenty of ideas for one hour. try again later.", 429);
  const b = await readJson(req, 2048);
  if (!b) return bad("bad request");
  if (str(b.website, 200) || !(Number(b.ms) >= 2500)) return json({ ok: true });
  const text = (typeof b.text === "string" ? b.text : "").replace(/\s+/g, " ").trim();
  if (text.length < 3) return bad("tell us a bit more.");
  if (text.length > 280) return bad("keep it under 280 characters.");
  if (LINK.test(text)) return bad("no links, just the idea.");
  let handle = (typeof b.handle === "string" ? b.handle : "").trim().replace(/^@+/, "");
  if (handle && (!HANDLE.test(handle) || !nameClean(handle))) return bad("that handle doesn't look right. letters, numbers, . _ - only.");
  handle = handle ? handle.toLowerCase() : null;
  if (isTestAnon(b.anon)) return json({ ok: true, test: true }); // checked like any idea, never stored
  const page = (str(b.page, 24) || "site").replace(/[^a-z0-9-]/g, "") || "site";
  const t = now();
  if (limited("ideas:all", 200, 3600000)) return bad("lots of ideas right now. try again in a bit.", 429);
  const dup = await env.DB.prepare("SELECT 1 FROM ideas WHERE lower(text) = lower(?) AND ts >= ?").bind(text, t - 86400000).first();
  if (!dup) await env.DB.prepare("INSERT INTO ideas (text, handle, page, ts) VALUES (?, ?, ?, ?)").bind(text, handle, page, t).run();
  return json({ ok: true });
}

export async function listIdeas(url, env) {
  const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get("days"), 10) || 14));
  const { results } = await env.DB.prepare("SELECT id, text, handle, page, ts FROM ideas WHERE ts >= ? ORDER BY ts DESC LIMIT 500")
    .bind(now() - days * 86400000).all();
  return json({ ok: true, days, count: results.length, ideas: results.map((r) => ({ id: r.id, text: r.text, handle: r.handle, page: r.page, at: new Date(r.ts).toISOString() })) });
}
