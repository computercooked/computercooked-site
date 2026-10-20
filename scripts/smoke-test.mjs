// API smoke test. Run against local `wrangler dev` or the live site:
//   node scripts/smoke-test.mjs http://127.0.0.1:8787 <admin-token>
// Creates a throwaway play, score, feedback and (locally only) an account.
const base = process.argv[2] || "http://127.0.0.1:8787";
const admin = process.argv[3] || "";
const local = /127\.0\.0\.1|localhost/.test(base);
let fails = 0;
const ok = (cond, msg, extra) => { console.log((cond ? "PASS " : "FAIL ") + msg + (extra !== undefined ? " " + JSON.stringify(extra) : "")); if (!cond) fails++; };
const rid = () => Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
const H = { "content-type": "application/json", origin: base };
const post = (p, b, h = {}) => fetch(base + p, { method: "POST", headers: { ...H, ...h }, body: JSON.stringify(b) });
const get = (p, h = {}) => fetch(base + p, { headers: h });

const anon = "smoke" + rid();
const tester = "smoke-test";

ok((await (await get("/api/health")).json()).ok, "health");

// a legit CRASH run: start, wait, end with a plausible score
const p1 = rid();
let r = await post("/api/events", { anon, tester, ref: "direct", name: "smokey", events: [{ t: "start", id: p1, game: "crash", v: "1" }] });
ok(r.ok, "events start");
await new Promise((s) => setTimeout(s, 1200));
r = await (await post("/api/events", { anon, tester, ref: "direct", name: "smokey", events: [{ t: "event", id: p1, game: "crash", name: "cooked", data: { hits: 3 } }, { t: "end", id: p1, game: "crash", score: 40, dur: 1200, completed: true }] })).json();
ok(r.results?.[p1]?.accepted === true, "plausible score accepted", r.results?.[p1]);

// an impossible score is rejected by the server-side bound
const p2 = rid();
await post("/api/events", { anon, events: [{ t: "start", id: p2, game: "crash" }] });
r = await (await post("/api/events", { anon, events: [{ t: "end", id: p2, game: "crash", score: 999999, dur: 2000 }] })).json();
ok(r.results?.[p2]?.accepted === false, "impossible score rejected", r.results?.[p2]);

r = await (await get("/api/leaderboard?game=crash&period=day&player=a:" + anon)).json();
ok(r.ok && r.rows.some((x) => x.me), "leaderboard shows the run", r.rows?.slice(0, 3));

// cross-site POST is refused
r = await fetch(base + "/api/feedback", { method: "POST", headers: { "content-type": "application/json", origin: "https://evil.example" }, body: "{}" });
ok(r.status === 403, "cross-site POST refused", r.status);

r = await (await post("/api/feedback", { game: "crash", rating: 1, text: "smoke test feedback, ignore", tester, anon, play_id: p1 })).json();
ok(r.ok, "feedback");

r = await (await get("/api/stats")).json();
ok(r.ok && r.games.some((g) => g.game === "crash"), "stats");

if (local) {
  const u = "smoke" + Math.floor(Math.random() * 1e6);
  r = await (await post("/api/auth/signup", { username: u, password: "pw-for-smoke-1", birth_year: 2015, birth_month: 1 })).json();
  ok(r.under13 === true, "under-13 gets no account", r);
  r = await post("/api/auth/signup", { username: "fuckface", password: "pw-for-smoke-1", birth_year: 2000, birth_month: 1 });
  ok(r.status === 400, "bad username filtered");
  r = await post("/api/auth/signup", { username: u, password: "pw-for-smoke-1", birth_year: 2000, birth_month: 1, anon });
  const cookie = (r.headers.get("set-cookie") || "").split(";")[0];
  ok(r.ok && /HttpOnly/i.test(r.headers.get("set-cookie") || ""), "signup sets httpOnly cookie");
  r = await (await get("/api/me", { cookie })).json();
  ok(r.user?.username === u, "me after signup");
  r = await (await post("/api/me/favorite", { game: "crash", on: true }, { cookie })).json();
  ok(r.ok, "favorite");
  r = await (await get("/api/me/summary", { cookie })).json();
  ok(r.ok && r.favorites.includes("crash") && r.streak >= 1 && r.recent.some((x) => x.game === "crash"), "summary: favorite, streak, recent (anon plays linked)", { streak: r.streak, recent: r.recent });
  r = await post("/api/auth/login", { username: u, password: "wrong-password" });
  ok(r.status === 401, "wrong password refused");
  r = await post("/api/auth/login", { username: u, password: "pw-for-smoke-1" });
  ok(r.ok, "login");
  // cloud saves (slice A)
  const put = (p, b, h = {}) => fetch(base + p, { method: "PUT", headers: { ...H, cookie, ...h }, body: JSON.stringify(b) });
  const t0 = Date.now();
  r = await (await put("/api/saves/smol-brains/main", { data: { seed: 7, savedAt: t0, hello: "smol" }, updated_at: t0, version: "1" })).json();
  ok(r.ok && r.save?.bytes > 0, "save to cloud", r.save);
  r = await (await get("/api/saves/smol-brains/main", { cookie })).json();
  ok(r.save?.data?.hello === "smol" && r.save.updated_at === t0, "load cloud save");
  r = await put("/api/saves/smol-brains/main", { data: { again: 1 } });
  r = await put("/api/saves/smol-brains/main", { data: { again: 2 } });
  ok(r.status === 429, "save rate limited per slot", r.status);
  r = await (await put("/api/saves/smol-brains/old", { data: { v: "late" }, updated_at: t0 - 5000 })).json();
  r = await (await put("/api/saves/smol-brains/old", { data: { v: "older" }, updated_at: t0 - 9000 })).json();
  ok(r.stale === true, "an older copy never overwrites a newer one");
  r = await put("/api/saves/smol-brains/big", { data: "x".repeat(520 * 1024) });
  ok(r.status === 413, "over 512 KB refused", r.status);
  for (const s of ["s3", "s4", "s5"]) await put("/api/saves/smol-brains/" + s, { data: 1 });
  r = await put("/api/saves/smol-brains/s6", { data: 1 });
  ok(r.status === 409, "max 5 slots per game", r.status);
  r = await (await get("/api/saves/smol-brains", { cookie })).json();
  ok(r.ok && r.slots.length === 5, "slot list", r.slots?.map((s) => s.slot));
  r = await fetch(base + "/api/saves/smol-brains/main", { method: "DELETE", headers: { ...H, cookie } });
  ok(r.ok, "delete a slot");
  r = await get("/api/saves/smol-brains/main");
  ok(r.status === 401, "saves need a login", r.status);
  r = await fetch(base + "/api/saves/smol-brains/main", { method: "PUT", headers: { "content-type": "application/json", origin: "https://evil.example", cookie }, body: "{}" });
  ok(r.status === 403, "cross-site save refused", r.status);

  r = await (await post("/api/auth/logout", {}, { cookie })).json();
  ok(r.ok, "logout");
  r = await (await get("/api/me", { cookie })).json();
  ok(r.user === null, "session gone after logout");

  // delete account: wrong password refused, then everything goes
  r = await post("/api/auth/login", { username: u, password: "pw-for-smoke-1" });
  const c2 = (r.headers.get("set-cookie") || "").split(";")[0];
  r = await post("/api/me/delete", { password: "nope-nope-1" }, { cookie: c2 });
  ok(r.status === 401, "delete account needs the password", r.status);
  r = await (await post("/api/me/delete", { password: "pw-for-smoke-1" }, { cookie: c2 })).json();
  ok(r.deleted === true, "delete account");
  r = await post("/api/auth/login", { username: u, password: "pw-for-smoke-1" });
  ok(r.status === 401, "deleted account can't log in", r.status);
}

r = await get("/api/admin/metrics");
ok(r.status === 401, "admin without token refused");
if (admin) {
  r = await (await get("/api/admin/metrics?since=2026-01-01", { authorization: "Bearer " + admin })).json();
  const c = r.games?.find((g) => g.game === "crash");
  ok(r.ok && c && c.plays >= 1 && c.feedback_count >= 1, "admin metrics", c && { plays: c.plays, players: c.unique_players, completion: c.completion_rate, rating: c.avg_rating, testers: c.testers });
}

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
