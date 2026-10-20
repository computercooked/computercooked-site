// Small shared helpers for the platform Worker.

export const now = () => Date.now();
export const dayOf = (ms) => new Date(ms).toISOString().slice(0, 10);

// Consecutive played days ending at `from` (YYYY-MM-DD), counting back. Streak saver: one missed day is
// forgiven when the day before it was played, at most once per 7 days, so one busy day doesn't reset a
// long streak (a forgiven day doesn't count toward the length). -> {n, savedRecently}
export function streakFrom(days, from) {
  const set = days instanceof Set ? days : new Set(days);
  const DAY = 86400000;
  let n = 0, t = Date.parse(from + "T00:00:00Z"), i = 0, lastSave = -Infinity;
  for (;;) {
    if (set.has(dayOf(t))) n++;
    else if (n > 0 && i - lastSave >= 7 && set.has(dayOf(t - DAY))) lastSave = i;
    else break;
    t -= DAY; i++;
  }
  return { n, savedRecently: lastSave >= 0 && lastSave < 7 };
}

// ISO-8601 week label, e.g. "2026-W43"
export function weekOf(ms) {
  const d = new Date(ms);
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dow);
  const y = t.getUTCFullYear();
  const wk = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${String(wk).padStart(2, "0")}`;
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}

export const bad = (msg, status = 400) => json({ ok: false, error: msg }, status);

export async function readJson(req, max = 64 * 1024) {
  const len = +(req.headers.get("content-length") || 0);
  if (len > max) throw new HttpError(413, "too big");
  const text = await req.text();
  if (text.length > max) throw new HttpError(413, "too big");
  try { return JSON.parse(text || "{}"); } catch { throw new HttpError(400, "bad json"); }
}

export class HttpError extends Error {
  constructor(status, msg) { super(msg); this.status = status; }
}

export const str = (v, max = 200) => (typeof v === "string" ? v.slice(0, max) : v == null ? null : String(v).slice(0, max));
export const num = (v) => (typeof v === "number" && isFinite(v) ? v : null);
export const slugOk = (s) => typeof s === "string" && /^[a-z0-9-]{1,40}$/.test(s);
export const idOk = (s) => typeof s === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(s);

export function b64(buf) {
  let s = "";
  const a = new Uint8Array(buf);
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s);
}
export function unb64(s) {
  const bin = atob(s);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}
export function randomToken(bytes = 32) {
  const a = crypto.getRandomValues(new Uint8Array(bytes));
  return b64(a).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export async function sha256(text) {
  return b64(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

// constant-time-ish compare for equal-length strings
export function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function deviceOf(ua = "") {
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|Android/i.test(ua)) return "mobile";
  return "desktop";
}

const REFS = ["tiktok", "youtube", "instagram", "x", "threads", "bluesky", "search", "internal", "direct", "embed", "other"];
export const refOk = (r) => (REFS.includes(r) ? r : "other");

// ---------- rate limiting (per isolate, memory only; IPs are never written to storage) ----------
const buckets = new Map();
export function limited(key, max, windowMs) {
  const t = now();
  let b = buckets.get(key);
  if (!b || b.reset < t) { b = { n: 0, reset: t + windowMs }; buckets.set(key, b); }
  b.n++;
  if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset < t) buckets.delete(k);
  return b.n > max;
}

// ---------- name filter ----------
// Not exhaustive; catches the obvious stuff. Reports + admin hide cover the rest.
const BLOCK = [
  "fuck", "shit", "cunt", "bitch", "nigg", "fag", "retard", "rape", "porn", "sexy", "nazi", "hitler",
  "kike", "spic", "chink", "tranny", "whore", "slut", "dick", "cock", "pussy", "penis", "vagina",
  "jizz", "kys", "killyourself", "admin", "moderator", "computercooked", "official",
];
// Free text (bios): word by word, so "peacock" or "spicy" pass while the words themselves don't.
// The worst slurs are also caught inside words and with spaces or symbols between letters.
const STRONG = ["nigg", "kike", "fagg", "faggot", "tranny", "retard", "chink", "killyourself"];
export function textClean(text) {
  const norm = (s) => s.toLowerCase().replace(/[@4]/g, "a").replace(/3/g, "e").replace(/[1!|]/g, "i").replace(/0/g, "o").replace(/[5$]/g, "s").replace(/7/g, "t");
  const t = norm(String(text));
  const squashed = t.replace(/[^a-z]/g, "");
  if (STRONG.some((w) => squashed.includes(w))) return false;
  const words = t.split(/[^a-z]+/).filter(Boolean);
  const reserved = new Set(["admin", "moderator", "computercooked", "official"]);
  return !words.some((w) => !reserved.has(w) && BLOCK.some((b) => !reserved.has(b) && (w === b || w === b + "s" || w === b + "es" || w === b + "ed" || w === b + "ing")));
}

export function nameClean(name) {
  const n = String(name).toLowerCase()
    .replace(/[@4]/g, "a").replace(/3/g, "e").replace(/[1!|]/g, "i").replace(/0/g, "o")
    .replace(/[5$]/g, "s").replace(/7/g, "t").replace(/[^a-z]/g, "");
  return !BLOCK.some((w) => n.includes(w));
}
