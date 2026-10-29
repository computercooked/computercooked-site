// Email signup (K-0031). Addresses stay in our own D1 table (migrations/0013_subscribers.sql); nothing is sent to an
// outside service and no email goes out from here. Sending (and which service does it) is Ashton's call.
//   POST /api/subscribe     {email, source, consent: true}   -> {ok}   (same answer whether new or already there)
//   GET  /api/unsubscribe?t=<token>                          -> a small page; the row is kept, marked unsubscribed
import { json, bad, readJson, now, randomToken, limited, str } from "./util.js";

export const CONSENT = "one email when a new game drops, never more than once a week. we keep your address only to send that, and every email has an unsubscribe link.";
const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export async function subscribe(req, env, ip) {
  if (limited("subscribe:" + ip, 10, 3600000)) return bad("too many tries. try again later.", 429);
  const b = await readJson(req, 4096);
  if (!b) return bad("bad request");
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL.test(email)) return bad("that doesn't look like an email.");
  if (b.consent !== true) return bad("consent is required.");
  const source = (str(b.source, 24) || "site").replace(/[^a-z0-9-]/g, "") || "site";
  // a returning address that had unsubscribed opts back in; an existing one is left alone (no way to probe who's on the list)
  await env.DB.prepare(
    "INSERT INTO subscribers (email, source, consent, token, created_at) VALUES (?, ?, ?, ?, ?) " +
    "ON CONFLICT(email) DO UPDATE SET unsubscribed_at = NULL, consent = excluded.consent WHERE subscribers.unsubscribed_at IS NOT NULL"
  ).bind(email, source, CONSENT, randomToken(18), now()).run();
  return json({ ok: true });
}

export async function unsubscribe(url, env) {
  const t = url.searchParams.get("t") || "";
  let done = false;
  if (/^[A-Za-z0-9_-]{16,64}$/.test(t)) {
    const r = await env.DB.prepare("UPDATE subscribers SET unsubscribed_at = ? WHERE token = ? AND unsubscribed_at IS NULL").bind(now(), t).run();
    done = true; // already-unsubscribed tokens get the same page
    void r;
  }
  const msg = done ? "you're unsubscribed. no more emails from us." : "that unsubscribe link doesn't look right. email hello@computercooked.com and we'll remove you by hand.";
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>unsubscribe · computer cooked</title><link rel="stylesheet" href="/assets/tokens.css"><link rel="stylesheet" href="/styles.css"></head><body><main class="page"><h1 class="section-label">unsubscribe</h1><p>${msg}</p><p><a href="/">back to the games</a></p></main></body></html>`,
    { status: done ? 200 : 400, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export async function subscriberCount(env) {
  return (await env.DB.prepare("SELECT COUNT(*) n FROM subscribers WHERE unsubscribed_at IS NULL").first("n")) || 0;
}
