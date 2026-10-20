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

// challenge-a-friend links: made from your own accepted run, verified when someone beats it
r = await (await post("/api/dare", { play_id: p1, anon })).json();
const dare = r;
ok(r.ok && /\/games\/crash\/\?vs=40&from=smokey&d=[A-Za-z0-9_-]+$/.test(r.url) && /can you beat 40 on CRASH\? from smokey/.test(r.text), "dare link from a run", r);
r = await post("/api/dare", { play_id: p1, anon: "someone-else-" + rid() });
ok(r.status === 404, "can't make a dare from someone else's run", r.status);
r = await (await post("/api/dare", { play_id: p1, anon })).json();
ok(r.id === dare.id, "one dare per run");
r = await (await get("/api/dare/" + dare.id + "?open=1")).json();
ok(r.ok && r.game === "crash" && r.score === 40 && r.from === "smokey", "open a dare", r);
r = await (await post("/api/dare/" + dare.id + "/beat", { play_id: p1, anon })).json();
ok(r.ok && r.beaten === false && r.self, "your own run can't beat your own dare", r);
const anon2 = "smoke2" + rid(), p5 = rid();
await post("/api/events", { anon: anon2, events: [{ t: "start", id: p5, game: "crash", v: "1" }] });
await new Promise((res) => setTimeout(res, 1200));
await post("/api/events", { anon: anon2, events: [{ t: "end", id: p5, game: "crash", score: 45, dur: 1200, completed: true }] });
r = await (await post("/api/dare/" + dare.id + "/beat", { play_id: p5, anon: anon2 })).json();
ok(r.ok && r.beaten && r.first && r.sender_xp === 0, "a guest beats a guest's dare (no xp: the sender has no account)", r);
r = await (await post("/api/dare/" + dare.id + "/beat", { play_id: p5, anon: anon2 })).json();
ok(r.ok && r.beaten && !r.first, "beating the same dare twice counts once", r);
r = await (await get("/api/dare/" + dare.id)).json();
ok(r.beats === 1, "dare beat count", r.beats);
// link previews: game pages carry a card; dare links get "can you beat N?" tags from the dare itself
let page = await (await get("/games/crash/")).text();
ok(page.includes('/games/crash/og.png"') && !page.includes("can you beat"), "game page has its og card");
page = await (await get("/games/crash/?vs=99999&from=liar&d=" + dare.id)).text();
ok(/property="og:title" content="can you beat 40 on CRASH\? from smokey"/.test(page) && page.includes('/games/crash/og-vs.png"'), "dare link preview uses the verified score", page.match(/og:title" content="[^"]*"/));
// search: every game page carries VideoGame JSON-LD, a how-to-play card and a "games like X" row of links
page = await (await get("/games/fathom/")).text();
const ld = JSON.parse((page.match(/<script type="application\/ld\+json">(.*?)<\/script>/) || [, "{}"])[1]);
ok(ld["@graph"]?.[0]?.["@type"] === "VideoGame" && ld["@graph"][0].name === "fathom" && ld["@graph"][0].offers?.price === "0", "game page has VideoGame JSON-LD", ld["@graph"]?.[0]?.name);
ok(/how to play fathom/.test(page) && /<li>tap or click the enemy sea to fire<\/li>/.test(page), "game page has a how-to-play card");
const like = (page.match(/<section class="more-games"[^>]*>[\s\S]*?<\/section>/) || [""])[0];
ok(/games like fathom/.test(like) && (like.match(/class="play-btn" href="\/games\/[a-z0-9-]+\/"/g) || []).length === 3 && !like.includes('href="/games/fathom/"') && !/^<section[^>]*hidden/.test(like), "game page links 3 games like it (not itself)");
r = await get("/games/fathom/play/");
ok(r.ok && !(await r.text()).includes("ld+json"), "game files under /play/ pass through untouched");

r = await (await get("/api/stats")).json();
ok(r.ok && r.games.some((g) => g.game === "crash"), "stats");

// game of the week: a real game, never the weekly challenge's game
r = await (await get("/api/featured")).json();
const chNow = (await (await get("/api/challenge")).json()).challenge;
ok(r.ok && r.featured?.game && r.featured.title && r.featured.game !== chNow?.game && ["metrics", "rotation"].includes(r.featured.basis), "game of the week (not the challenge game)", r.featured && { game: r.featured.game, basis: r.featured.basis, reason: r.featured.reason, challenge: chNow?.game });

if (local) {
  const u = "smoke" + Math.floor(Math.random() * 1e6);
  r = await (await post("/api/auth/signup", { username: u, password: "pw-for-smoke-1", birth_year: 2015, birth_month: 1 })).json();
  ok(r.under13 === true, "under-13 gets no account", r);
  r = await post("/api/auth/signup", { username: "fuckface", password: "pw-for-smoke-1", birth_year: 2000, birth_month: 1 });
  ok(r.status === 400, "bad username filtered");
  r = await post("/api/auth/signup", { username: u, password: "pw-for-smoke-1", birth_year: 2000, birth_month: 1, anon });
  let cookie = (r.headers.get("set-cookie") || "").split(";")[0];
  ok(r.ok && /HttpOnly/i.test(r.headers.get("set-cookie") || ""), "signup sets httpOnly cookie");
  r = await (await get("/api/me", { cookie })).json();
  ok(r.user?.username === u, "me after signup");
  // level unlocks: a level 1 account can't wear or use locked cosmetics
  r = await (await get("/api/me/profile", { cookie })).json();
  ok(r.level === 1 && r.cosmetics?.length >= 5 && r.cosmetics.every((c) => !c.unlocked), "cosmetics listed, all locked at level 1", r.cosmetics?.map((c) => c.id + "@" + c.level));
  r = await post("/api/me/avatar", { avatar: "x:happy-1-0-crown" }, { cookie });
  ok(r.status === 403, "locked accessory refused", r.status);
  r = await post("/api/me/avatar", { avatar: "x:happy-1-0-cap" }, { cookie });
  ok(r.ok, "free accessory still works");
  r = await post("/api/me/profile", { theme: "gold" }, { cookie });
  ok(r.status === 403, "locked profile color refused", r.status);
  r = await (await post("/api/me/favorite", { game: "crash", on: true }, { cookie })).json();
  ok(r.ok, "favorite");
  r = await (await get("/api/me/summary", { cookie })).json();
  ok(r.ok && r.favorites.includes("crash") && r.streak >= 1 && r.recent.some((x) => x.game === "crash"), "summary: favorite, streak, recent (anon plays linked)", { streak: r.streak, recent: r.recent });
  ok(typeof r.streak_saved === "boolean", "summary says whether a streak saver was used", r.streak_saved);
  r = await post("/api/auth/login", { username: u, password: "wrong-password" });
  ok(r.status === 401, "wrong password refused");
  r = await post("/api/auth/login", { username: u, password: "pw-for-smoke-1" });
  ok(r.ok, "login");
  // XP and levels (slice B): a logged-in 12s run of CRASH
  const ev = (events) => post("/api/events", { anon, events }, { cookie }).then((x) => x.json());
  const run = async (dur, score) => { const id = rid(); await ev([{ t: "start", id, game: "crash" }]); return { id, r: await ev([{ t: "end", id, game: "crash", score, dur, completed: true }]) }; };
  let x = await run(12000, 40);
  const xp1 = x.r.results?.[x.id]?.xp;
  ok(xp1 && xp1.gained >= 10 + 25 + 5 && xp1.parts.some((p) => p.kind === "first") && xp1.parts.some((p) => p.kind === "streak"), "xp: base + first play + streak", xp1 && { gained: xp1.gained, level: xp1.level, title: xp1.title, parts: xp1.parts.map((p) => p.kind + ":" + p.xp) });
  r = await ev([{ t: "end", id: x.id, game: "crash", score: 40, dur: 12000, completed: true }]);
  ok(!r.results?.[x.id], "xp: an ended play can't be paid twice");
  x = await run(4000, 10);
  ok(x.r.results?.[x.id]?.xp === null, "xp: runs under 10s earn nothing");
  x = await run(12000, 999999);
  ok(x.r.results?.[x.id]?.xp === null, "xp: out-of-bounds score earns nothing");
  let capped = false;
  // xp per run depends on where 40 sits on the board, so keep running until the 150 cap bites
  for (let i = 0; i < 15 && !capped; i++) { x = await run(12000, 40); capped = (x.r.results?.[x.id]?.xp?.parts || []).some((p) => p.kind === "cap"); }
  ok(capped, "xp: per-game daily cap");
  r = await ev([{ t: "achieve", id: rid(), game: "crash", ach: "not_a_real_one" }]);
  ok(r.ok && r.achievements.length === 0, "achievements: undeclared ids ignored");
  r = await (await post("/api/feedback", { game: "crash", rating: 1, text: "smoke test, ignore", tester, anon }, { cookie })).json();
  ok(r.achievements?.[0]?.id === "rate_game", "achievement: critic.exe for rating a game");
  r = await (await get("/api/me", { cookie })).json();
  ok(r.user?.level >= 1 && r.user.xp > 0 && r.user.title, "me: level + xp", { level: r.user?.level, xp: r.user?.xp, title: r.user?.title });
  r = await (await get("/api/me/summary", { cookie })).json();
  ok(r.xp?.xp > 0 && r.xp_history.length > 0 && r.achievements.some((a) => a.id === "rate_game" && a.unlocked_at), "summary: xp, history, achievements");

  // profiles + settings (slice C)
  const prof = (b) => post("/api/me/profile", b, { cookie });
  r = await prof({ bio: "you are a f4gg0t" });
  ok(r.status === 400, "profile: rude bio refused", r.status);
  r = await prof({ display_name: "admin" });
  ok(r.status === 400, "profile: reserved display name refused", r.status);
  r = await prof({ badges: ["site:streak_7"] });
  ok(r.status === 400, "profile: can't pin a locked badge", r.status);
  r = await (await prof({ display_name: "Smoke Tester", bio: "i love peacocks and spicy food", fav_game: "crash", badges: ["site:rate_game"], theme: "ice", public: true })).json();
  ok(r.ok && r.profile.display_name === "Smoke Tester" && r.profile.badges[0] === "site:rate_game", "profile: save");
  r = await (await post("/api/me/avatar", { avatar: "x:happy-2-0-cap" }, { cookie })).json();
  ok(r.ok, "avatar: built face accepted");
  r = await post("/api/me/avatar", { avatar: "x:happy-9-0-cap" }, { cookie });
  ok(r.status === 400, "avatar: bad built face refused", r.status);
  r = await (await get("/api/u/" + u)).json();
  ok(r.ok && r.display_name === "Smoke Tester" && r.badges[0]?.id === "rate_game" && r.highs.some((h) => h.game === "crash") && r.level >= 1, "public profile", { level: r.level, title: r.title, badges: r.badges?.length, highs: r.highs?.length });
  await prof({ public: false });
  r = await (await get("/api/u/" + u)).json();
  ok(r.private === true && r.bio === undefined && r.highs === undefined, "public profile: private hides details");
  r = await get("/u/" + u);
  ok(r.ok && /u\.js/.test(await r.text()), "/u/<name> page served", r.status);
  r = await get("/api/u/nobody_here_123");
  ok(r.status === 404, "public profile: unknown is 404", r.status);
  r = await post("/api/me/email", { email: "not-an-email" }, { cookie });
  ok(r.status === 400, "email: bad address refused", r.status);
  r = await (await post("/api/me/email", { email: "Smoke@Example.com", news: true }, { cookie })).json();
  ok(r.ok && r.email === "smoke@example.com" && r.email_verified === false, "email: stored unverified");
  r = await (await get("/api/me/profile", { cookie })).json();
  ok(r.email === "smoke@example.com" && r.profile.public === false, "settings read back");
  r = await get("/api/me/export", { cookie });
  const exp = await r.json();
  ok(/attachment/.test(r.headers.get("content-disposition") || "") && exp.account?.username === u && !JSON.stringify(exp).includes("pass_hash") && exp.xp.length > 0, "export my data (no password hash)");
  r = await post("/api/me/password", { current: "wrong-one-1", next: "pw-for-smoke-2" }, { cookie });
  ok(r.status === 401, "password: wrong current refused", r.status);
  r = await (await post("/api/me/password", { current: "pw-for-smoke-1", next: "pw-for-smoke-2" }, { cookie })).json();
  ok(r.ok, "password: changed");
  r = await post("/api/auth/login", { username: u, password: "pw-for-smoke-1" });
  ok(r.status === 401, "password: old one stops working", r.status);
  r = await post("/api/auth/login", { username: u, password: "pw-for-smoke-2" });
  const c3 = (r.headers.get("set-cookie") || "").split(";")[0];
  ok(r.ok, "password: new one works");
  r = await (await post("/api/me/logout-all", {}, { cookie: c3 })).json();
  r = await (await get("/api/me", { cookie })).json();
  ok(r.ok && r.user === null, "log out everywhere ends other sessions");
  r = await post("/api/auth/login", { username: u, password: "pw-for-smoke-2" });
  cookie = (r.headers.get("set-cookie") || "").split(";")[0];
  await post("/api/me/password", { current: "pw-for-smoke-2", next: "pw-for-smoke-1" }, { cookie }); // back to the original for the rest

  // cloud saves (slice A)
  const put = (p, b, h = {}) => fetch(base + p, { method: "PUT", headers: { ...H, cookie, ...h }, body: JSON.stringify(b) });
  const t0 = Date.now();
  r = await (await put("/api/saves/smol-brains/main", { data: { seed: 7, savedAt: t0, hello: "smol" }, updated_at: t0, version: "1" })).json();
  ok(r.ok && r.save?.bytes > 0, "save to cloud", r.save);
  r = await (await get("/api/saves/smol-brains/main", { cookie })).json();
  ok(r.save?.data?.hello === "smol" && r.save.updated_at === t0, "load cloud save");
  r = await (await get("/api/me/summary", { cookie })).json();
  ok(r.saves?.some((s) => s.game === "smol-brains" && s.updated_at === t0), "summary lists cloud saves for jump back in", r.saves);
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

  // leaderboard names link to /u/ (slice D1)
  const p3 = rid();
  await post("/api/events", { anon, events: [{ t: "start", id: p3, game: "crash", v: "1" }] }, { cookie });
  await new Promise((s) => setTimeout(s, 1200));
  await post("/api/events", { anon, events: [{ t: "end", id: p3, game: "crash", score: 41, dur: 1200, completed: true }] }, { cookie });
  r = await (await get("/api/leaderboard?game=crash&period=day", { cookie })).json();
  ok(r.rows?.some((x) => x.me && x.u === u), "account rows carry the username for /u/ links", r.rows?.find((x) => x.me));
  r = await get("/api/leaderboard?game=crash&friends=1");
  ok(r.status === 401, "friends board needs a login", r.status);

  // weekly challenge, seasonal badge, activity feed (slice D2)
  r = await (await get("/api/challenge", { cookie })).json();
  ok(r.ok && Array.isArray(r.events), "challenge endpoint", r.challenge && { game: r.challenge.game, target: r.challenge.target, done: r.challenge.done });
  const ch = r.challenge, liveEvent = r.events[0];
  if (ch) {
    const cat = (await (await get("/games/games.json")).json()).games.find((g) => g.slug === ch.game);
    const needMs = Math.ceil(((ch.target - 50) / cat.max_score_per_sec) * 1000) - 15000 + 1500; // server allows 15 s of batching slack
    const p4 = rid();
    await post("/api/events", { anon, events: [{ t: "start", id: p4, game: ch.game, v: "1" }] }, { cookie });
    await new Promise((s) => setTimeout(s, Math.max(1200, needMs)));
    r = await (await post("/api/events", { anon, events: [
      { t: "event", id: p4, game: ch.game, name: "milestone", data: { lv: 3, deaths: 2 } },
      { t: "event", id: p4, game: ch.game, name: "not_allowed", data: { x: 1 } },
      { t: "end", id: p4, game: ch.game, score: ch.target, dur: Math.max(10000, needMs + 14000), completed: true },
    ] }, { cookie })).json();
    const x = r.results?.[p4]?.xp;
    ok(x?.parts?.some((p) => p.kind === "challenge" && p.xp === ch.xp), "challenge run pays the bonus", x?.parts);
    ok(Array.isArray(x?.unlocks) && x.unlocks.every((u) => u.level <= x.level) && (x.leveled_up || !x.unlocks.length), "level ups list new unlocks", { level: x?.level, unlocks: x?.unlocks });
    if (x?.level >= 3) {
      r = await post("/api/me/avatar", { avatar: "x:happy-1-0-antenna" }, { cookie });
      ok(r.ok, "unlocked accessory can be worn at level 3+", r.status);
    }
    r = await (await get("/api/challenge", { cookie })).json();
    ok(r.challenge.done === true && r.challenge.finishers >= 1, "challenge shows done");
    if (liveEvent) {
      r = await (await get("/api/me/summary", { cookie })).json();
      ok(r.achievements.some((a) => a.id === liveEvent.id && a.unlocked_at && a.event), "seasonal badge unlocked by a run", liveEvent.id);
    }
    r = await (await get("/api/me/feed", { cookie })).json();
    ok(r.ok && r.items.some((i) => i.text === "cleared level 3 (2 deaths so far)") && !r.items.some((i) => /not_allowed|x: 1/.test(i.text)), "feed shows allow-listed events only", r.items?.slice(0, 4));
    ok(r.items.some((i) => i.kind === "challenge"), "feed shows the challenge");
  }

  // friends (slice D1): a second throwaway local account
  const v = "smokf" + Math.floor(Math.random() * 1e6);
  r = await post("/api/auth/signup", { username: v, password: "pw-for-smoke-1", birth_year: 2000, birth_month: 1 });
  const cv = (r.headers.get("set-cookie") || "").split(";")[0];
  ok(r.ok, "second account for friends");
  const fr = (action, username, c) => post("/api/me/friends", { action, username }, { cookie: c }).then((x) => x.json().then((j) => ({ ...j, code: x.status })));
  r = await fr("add", u, cookie);
  ok(r.code === 400, "can't friend yourself", r);
  r = await fr("add", "nobody_" + Math.floor(Math.random() * 1e6), cookie);
  ok(r.code === 404, "unknown player", r);
  r = await fr("add", v, cookie);
  ok(r.status === "requested", "friend request sent", r);
  r = await (await get("/api/me/friends", { cookie: cv })).json();
  ok(r.incoming?.some((p) => p.username === u) && r.friends.length === 0, "request shows as incoming", r);
  r = await (await get("/api/u/" + u, { cookie: cv })).json();
  ok(r.relation === "incoming", "profile shows the incoming request", r.relation);
  r = await fr("decline", u, cv);
  r = await (await get("/api/me/friends", { cookie })).json();
  ok(r.outgoing.length === 0, "decline clears the request", r);
  await fr("add", v, cookie);
  r = await fr("add", u, cv);
  ok(r.status === "friends", "adding back accepts", r);
  r = await (await get("/api/me/friends", { cookie })).json();
  ok(r.friends.some((p) => p.username === v && p.level >= 1 && p.avatar), "friend listed with avatar and level", r.friends);
  r = await (await get("/api/u/" + v, { cookie })).json();
  ok(r.relation === "friends", "profile relation: friends", r.relation);
  r = await (await get("/api/leaderboard?game=crash&period=all&friends=1", { cookie: cv })).json();
  ok(r.ok && r.friends && r.rows.some((x) => x.u === u), "friends board shows your friend's score", r.rows);
  // an account's dare: beating it pays the sender
  r = await (await post("/api/dare", { play_id: p3, anon }, { cookie })).json();
  const d2 = r;
  ok(r.ok && r.url.includes("from=Smoke%20Tester"), "dare from an account uses the display name", r.url);
  const p6 = rid();
  await post("/api/events", { anon: "smokev" + rid(), events: [{ t: "start", id: p6, game: "crash", v: "1" }] }, { cookie: cv });
  await new Promise((res) => setTimeout(res, 1200));
  await post("/api/events", { anon: "smokev", events: [{ t: "end", id: p6, game: "crash", score: 50, dur: 1200, completed: true }] }, { cookie: cv });
  r = await (await post("/api/dare/" + d2.id + "/beat", { play_id: p6 }, { cookie: cv })).json();
  ok(r.ok && r.beaten && r.sender_xp === 25, "beating an account's dare gives the sender +25 xp", r);
  r = await (await get("/api/me/feed", { cookie })).json();
  ok(r.items.some((i) => /took your dare/.test(i.text)), "sender's feed shows the dare win");
  await post("/api/me/profile", { public: true }, { cookie }); // the profile steps above left it private
  r = await (await get("/api/me/friends/feed", { cookie: cv })).json();
  ok(r.ok && r.friends === 1 && r.items.some((i) => i.who?.username === u && i.kind === "best" && i.game === "crash"), "friends feed shows a friend's new best", r.items?.slice(0, 3));
  await post("/api/me/profile", { public: false }, { cookie });
  r = await (await get("/api/me/friends/feed", { cookie: cv })).json();
  ok(r.ok && !r.items.some((i) => i.who?.username === u), "a private profile stays out of friends feeds");
  await post("/api/me/profile", { public: true }, { cookie });
  r = await fr("remove", u, cv);
  r = await (await get("/api/me/friends", { cookie })).json();
  ok(r.friends.length === 0, "remove drops both sides", r.friends);
  r = await fr("block", v, cookie);
  ok(r.status === "blocked", "block", r);
  r = await fr("add", u, cv);
  ok(r.code === 404, "blocked player can't send a request (looks like no such player)", r);
  r = await (await get("/api/u/" + u, { cookie: cv })).json();
  ok(r.relation === "none", "a block is never revealed", r.relation);
  r = await fr("unblock", v, cookie);
  await fr("add", v, cookie);
  r = await (await post("/api/me/delete", { password: "pw-for-smoke-1" }, { cookie: cv })).json();
  ok(r.deleted === true, "delete second account");
  r = await (await get("/api/me/friends", { cookie })).json();
  ok(r.outgoing.length === 0 && r.friends.length === 0, "deleting an account removes its friend rows", r);

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
  // user-linked rows go with the account: their dares (and the name on old links) disappear
  r = await get("/api/dare/" + d2.id);
  ok(r.status === 404, "deleting an account removes its dares", r.status);
  page = await (await get("/games/crash/?d=" + d2.id)).text();
  ok(!page.includes("Smoke Tester") && !page.includes("can you beat"), "a deleted account's dare link shows no name in the preview");
}

r = await get("/api/admin/metrics");
ok(r.status === 401, "admin without token refused");
if (admin) {
  r = await (await get("/api/admin/metrics?since=2026-01-01", { authorization: "Bearer " + admin })).json();
  const c = r.games?.find((g) => g.game === "crash");
  ok(r.ok && c && c.plays >= 1 && c.feedback_count >= 1, "admin metrics", c && { plays: c.plays, players: c.unique_players, completion: c.completion_rate, rating: c.avg_rating, testers: c.testers });
  // weekly challenge: a week with no hand pick falls back to an automatic one (never last week's game)
  r = await (await get("/api/admin/challenge", { authorization: "Bearer " + admin })).json();
  const handLast = (await (await get("/api/admin/challenge?date=" + new Date(Date.now()).toISOString().slice(0, 10), { authorization: "Bearer " + admin })).json()).pick?.game;
  ok(r.ok && r.pick && r.pick.game && r.pick.target > 0 && r.pick.xp === 100 && (r.source !== "auto (not stored yet)" || r.pick.game !== handLast), "next week has a challenge (hand or auto, not this week's game)", r);
}

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
