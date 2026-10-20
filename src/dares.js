// Challenge-a-friend links (dares).
//   POST /api/dare            {play_id, anon}  -> {id, url, text}   from one of your own accepted scores
//   GET  /api/dare/:id[?open=1]                -> {game, title, score, from, beats}   (open=1 counts a visit)
//   POST /api/dare/:id/beat   {play_id, anon}  -> {beaten, ...}    your run beat it: the sender earns XP
import { json, bad, readJson, now, dayOf, idOk, limited, randomToken } from "./util.js";
import { grant } from "./xp.js";
import { people } from "./friends.js";

const SENDER_XP = 25, PER_DARE = 10, PER_DAY = 100;
const nice = (n) => (Math.round(n * 10) / 10).toLocaleString("en-US");

// the score row for a play, only if the caller owns that play (account or this browser's anon id)
async function ownRun(env, user, playId, anon) {
  if (!idOk(playId)) return null;
  const p = await env.DB.prepare("SELECT id, game, anon_id, user_id FROM plays WHERE id = ?").bind(playId).first();
  if (!p || !((user && p.user_id === user.id) || (p.anon_id && p.anon_id === anon))) return null;
  const s = await env.DB.prepare("SELECT score, player, user_id, name FROM scores WHERE play_id = ? AND hidden = 0").bind(playId).first();
  return s ? { ...s, game: p.game } : null;
}

export async function makeDare(req, env, user, ip, catalog, origin) {
  if (limited("dare:" + ip, 30, 3600000)) return bad("that's a lot of dares. try again later.", 429);
  const b = await readJson(req, 1024);
  const run = await ownRun(env, user, b.play_id, typeof b.anon === "string" ? b.anon : null);
  if (!run) return bad("finish a run with a score first.", 404);
  const g = catalog.get(run.game);
  if (!g) return bad("game?", 404);
  let row = await env.DB.prepare("SELECT id, from_name FROM dares WHERE play_id = ?").bind(b.play_id).first();
  if (!row) {
    let name = run.name;
    if (run.user_id) name = (await people(env, [run.user_id])).get(run.user_id)?.name || name;
    const id = randomToken(6);
    await env.DB.prepare("INSERT OR IGNORE INTO dares (id, game, play_id, score, from_user, from_player, from_name, created_at) VALUES (?,?,?,?,?,?,?,?)")
      .bind(id, run.game, b.play_id, run.score, run.user_id || null, run.player, name, now()).run();
    row = await env.DB.prepare("SELECT id, from_name FROM dares WHERE play_id = ?").bind(b.play_id).first();
  }
  const url = `${origin}/games/${encodeURIComponent(run.game)}/?vs=${encodeURIComponent(run.score)}&from=${encodeURIComponent(row.from_name)}&d=${row.id}`;
  return json({ ok: true, id: row.id, url, text: `can you beat ${nice(run.score)} on ${g.title}? from ${row.from_name}` });
}

export async function getDare(url, env, id, catalog) {
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{6,16}$/.test(id)) return bad("no such dare", 404);
  const d = await env.DB.prepare("SELECT id, game, score, from_name, beats FROM dares WHERE id = ?").bind(id).first();
  if (!d || !catalog.has(d.game)) return bad("no such dare", 404);
  if (url.searchParams.get("open") === "1") await env.DB.prepare("UPDATE dares SET opens = opens + 1 WHERE id = ?").bind(id).run();
  return json({ ok: true, id: d.id, game: d.game, title: catalog.get(d.game).title, score: d.score, from: d.from_name, beats: d.beats });
}

export async function beatDare(req, env, user, id) {
  const b = await readJson(req, 1024);
  const d = await env.DB.prepare("SELECT id, game, score, from_user, from_player, from_name FROM dares WHERE id = ?").bind(id).first();
  if (!d) return bad("no such dare", 404);
  const run = await ownRun(env, user, b.play_id, typeof b.anon === "string" ? b.anon : null);
  if (!run || run.game !== d.game) return bad("that run doesn't count for this dare.", 400);
  if (run.player === d.from_player || (user && user.id === d.from_user)) return json({ ok: true, beaten: false, self: true });
  if (!(run.score > d.score)) return json({ ok: true, beaten: false, need: d.score });
  const t = now();
  const r = await env.DB.prepare("INSERT OR IGNORE INTO dare_beats (dare_id, player, score, ts) VALUES (?,?,?,?)").bind(id, run.player, run.score, t).run();
  const first = !!(r.meta && r.meta.changes);
  let senderXp = 0;
  if (first) {
    await env.DB.prepare("UPDATE dares SET beats = beats + 1 WHERE id = ?").bind(id).run();
    // the sender earns XP for a dare that got someone playing (capped per dare and per day: no farming with alt guests)
    if (d.from_user) {
      const n = await env.DB.prepare("SELECT COUNT(*) n FROM dare_beats WHERE dare_id = ?").bind(id).first("n");
      const today = await env.DB.prepare("SELECT COALESCE(SUM(amount), 0) x FROM xp_events WHERE user_id = ? AND kind = 'dare' AND day = ?").bind(d.from_user, dayOf(t)).first("x");
      if (n <= PER_DARE && today + SENDER_XP <= PER_DAY) senderXp = await grant(env, d.from_user, "dare", d.game, `${id}:${run.player}`, SENDER_XP, t);
    }
  }
  return json({ ok: true, beaten: true, first, from: d.from_name, score: d.score, sender_xp: senderXp });
}

// Link previews for dare links. A crawler (iMessage, Discord, X…) fetching /games/<slug>/?vs=…&from=…&d=…
// gets the normal page with its preview tags rewritten: "can you beat 1,240 on CRASH? from datz" and the
// game's og-vs.png card. With a dare id the score and name come from the server; without one, from the URL.
export async function dareMeta(req, env, url, slug) {
  const page = await env.ASSETS.fetch(req);
  if (!page.ok || !(page.headers.get("content-type") || "").includes("text/html")) return page;
  let score = parseFloat(url.searchParams.get("vs")), from = (url.searchParams.get("from") || "").replace(/[^A-Za-z0-9 _.-]/g, "").slice(0, 24);
  const id = url.searchParams.get("d");
  if (env.DB && id && /^[A-Za-z0-9_-]{6,16}$/.test(id)) {
    try {
      const d = await env.DB.prepare("SELECT game, score, from_name FROM dares WHERE id = ?").bind(id).first();
      if (d && d.game === slug) { score = d.score; from = d.from_name; }
    } catch (e) { /* table missing before the migration: fall back to the URL */ }
  }
  if (!(score > 0)) return page;
  let game = slug;
  try {
    const list = await (await env.ASSETS.fetch(new Request(url.origin + "/games/games.json"))).json();
    game = (list.games.find((g) => g.slug === slug) || {}).title || slug;
  } catch (e) { /* keep the slug */ }
  const title = `can you beat ${nice(score)} on ${game}?${from ? ` from ${from}` : ""}`;
  const desc = "a friend dared you. free browser game: no download, plays on your phone.";
  const img = `${url.origin}/games/${slug}/og-vs.png`;
  const set = (v) => ({ element(e) { e.setAttribute("content", v()); } });
  return new HTMLRewriter()
    .on("title", { element(e) { e.setInnerContent(title + " — Computer Cooked Games"); } })
    .on('meta[property="og:title"], meta[name="twitter:title"]', set(() => title))
    .on('meta[property="og:description"], meta[name="twitter:description"]', set(() => desc))
    .on('meta[property="og:image"], meta[name="twitter:image"]', set(() => img))
    .transform(new Response(page.body, { status: page.status, headers: { ...Object.fromEntries(page.headers), "cache-control": "public, max-age=300" } }));
}
