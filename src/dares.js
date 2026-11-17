// Challenge-a-friend links (dares).
//   POST /api/dare            {play_id, anon}  -> {id, url, text}   from one of your own accepted scores
//   GET  /api/dare/:id[?open=1]                -> {game, title, score, from, beats}   (open=1 counts a visit)
//   POST /api/dare/:id/beat   {play_id, anon}  -> {beaten, ...}    your run beat it: the sender earns XP
//   POST /api/dare/:id/shared {how}            -> {ok}             the sender sent it (share sheet / copied)
import { FRESH, isOldRules, OLD_RULES_NOTE } from "./boards.js";
import { json, bad, readJson, now, dayOf, idOk, limited, randomToken, slugOk, isTestAnon, nameClean } from "./util.js";
import { grant, unlock } from "./xp.js";
import { people } from "./friends.js";

const SENDER_XP = 25, PER_DARE = 10, PER_DAY = 100;
const nice = (n) => (Math.round(n * 10) / 10).toLocaleString("en-US");

// the score row for a play, only if the caller owns that play (account or this browser's anon id)
async function ownRun(env, user, playId, anon) {
  if (!idOk(playId)) return null;
  const p = await env.DB.prepare("SELECT id, game, anon_id, user_id FROM plays WHERE id = ?").bind(playId).first();
  if (!p || !((user && p.user_id === user.id) || (p.anon_id && p.anon_id === anon))) return null;
  // smoke-test runs are stored hidden but still make and beat (test) dares; admin metrics leave those dares out
  const s = await env.DB.prepare(`SELECT score, player, user_id, name FROM scores WHERE ${FRESH} AND play_id = ? AND (hidden = 0 OR player LIKE 'a:smoke%')`).bind(playId).first();
  return s ? { ...s, game: p.game } : null;
}

// A dare as the public sees it, under the leaderboard's name rules (src/games.js leaderboard): the sender's run must
// still be on the boards (not hidden by reports or an admin; smoke runs pass, as in ownRun), and the name is the one
// the boards show today: an account's current display name (banned accounts: gone), else the run's own name (both
// went through nameClean when they were set). null = no such dare; {gone: true} = the dare is off the boards.
export async function publicDare(env, id) {
  const d = await env.DB.prepare(
    "SELECT d.id, d.game, d.score, d.created_at, s.name, s.user_id, s.hidden, s.player FROM dares d LEFT JOIN scores s ON s.play_id = d.play_id WHERE d.id = ?"
  ).bind(id).first();
  if (!d) return null;
  const gone = { id: d.id, game: d.game, gone: true };
  // made before the game's current scoring (src/boards.js): retired, with a note on the game page
  if (isOldRules(d.game, d.created_at)) return { ...gone, retired: true };
  if (d.hidden == null || (d.hidden && !String(d.player).startsWith("a:smoke"))) return gone;
  let from = d.name;
  if (d.user_id) {
    const p = (await people(env, [d.user_id])).get(d.user_id);
    if (!p) return gone;
    from = p.name;
  }
  if (!from || !nameClean(from)) return gone;
  return { id: d.id, game: d.game, score: d.score, from };
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
    await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO dares (id, game, play_id, score, from_user, from_player, from_name, created_at) VALUES (?,?,?,?,?,?,?,?)")
        .bind(id, run.game, b.play_id, run.score, run.user_id || null, run.player, name, now()),
      env.DB.prepare("INSERT OR IGNORE INTO dare_funnel (dare_id, source) VALUES (?, ?)").bind(id, b.source === "best" ? "best" : "button"),
    ]);
    row = await env.DB.prepare("SELECT id, from_name FROM dares WHERE play_id = ?").bind(b.play_id).first();
    if (user) await unlock(env, user.id, "site", "dare_maker");
  }
  const pub = await publicDare(env, row.id), fromName = pub && !pub.gone ? pub.from : "a friend"; // a re-made dare: today's name
  const url = `${origin}/d/${row.id}`; // short; /d/<id> redirects to dareUrl()
  return json({ ok: true, id: row.id, url, long_url: origin + dareUrl({ id: row.id, game: run.game, score: run.score, from_name: fromName }), text: `can you beat ${nice(run.score)} on ${g.title}? from ${fromName}` });
}

// where a dare link lands: the game page with the dare banner (platform.js) and dare preview tags (seo.js), tagged
// like every player share (K-0055): utm_source=share, utm_medium=player, utm_campaign=<game>
export function dareUrl(d) {
  return `/games/${encodeURIComponent(d.game)}/?vs=${encodeURIComponent(d.score)}&from=${encodeURIComponent(d.from_name)}&d=${d.id}&utm_source=share&utm_medium=player&utm_campaign=${encodeURIComponent(d.game)}`;
}

// GET /d/:id (outside /api): a 302 to dareUrl(). Unknown or broken ids go to the hub. Cached briefly at the edge.
export async function dareLink(env, url, id) {
  let to = "/games/";
  try {
    const d = env.DB && await publicDare(env, id);
    if (d && !d.gone) to = dareUrl({ ...d, from_name: d.from });
    else if (d && d.retired) to = `/games/${encodeURIComponent(d.game)}/?d=${encodeURIComponent(d.id)}`;
  } catch (e) { /* no table yet: the hub */ }
  return new Response(null, { status: 302, headers: { location: url.origin + to, "cache-control": "public, max-age=300" } });
}

// POST /api/dare/:id/shared {how: share|copy|card|download|clip|clip-download}: the sender really sent it (share
// sheet finished, link copied, share card or clip shared, or the card or clip downloaded).
// Only the first one counts; it feeds the made → sent → opened → beaten funnel in /api/admin/metrics.
export const SHARE_HOW = ["share", "copy", "card", "download", "clip", "clip-download"];
export async function sharedDare(req, env, ip, id) {
  if (limited("dare-shared:" + ip, 60, 3600000)) return bad("slow down", 429);
  const b = await readJson(req, 256);
  const how = SHARE_HOW.includes(b.how) ? b.how : null;
  if (!how) return bad("how?", 400);
  const d = await env.DB.prepare("SELECT id FROM dares WHERE id = ?").bind(id).first();
  if (!d) return bad("no such dare", 404);
  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO dare_funnel (dare_id, source) VALUES (?, 'button')").bind(id),
    env.DB.prepare("UPDATE dare_funnel SET shared_how = ?, shared_at = ? WHERE dare_id = ? AND shared_at IS NULL").bind(how, now(), id),
  ]);
  return json({ ok: true });
}

export async function getDare(url, env, id, catalog) {
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{6,16}$/.test(id)) return bad("no such dare", 404);
  const d = await publicDare(env, id);
  if (d && d.retired && catalog.has(d.game)) return json({ ok: false, retired: true, id: d.id, game: d.game, error: OLD_RULES_NOTE }, 410);
  if (!d || d.gone || !catalog.has(d.game)) return bad("no such dare", 404);
  if (url.searchParams.get("open") === "1") {
    await env.DB.batch([
      env.DB.prepare("UPDATE dares SET opens = opens + 1 WHERE id = ?").bind(id),
      env.DB.prepare("INSERT INTO events (play_id, game, name, data, ts) VALUES (NULL, ?, 'cc:dare_opened', ?, ?)").bind(d.game, JSON.stringify({ dare: d.id }), now()),
    ]);
  }
  return json({ ok: true, id: d.id, game: d.game, title: catalog.get(d.game).title, score: d.score, from: d.from, beats: await env.DB.prepare("SELECT beats FROM dares WHERE id = ?").bind(id).first("beats") });
}

export async function beatDare(req, env, user, id) {
  const b = await readJson(req, 1024);
  const d = await env.DB.prepare("SELECT id, game, score, from_user, from_player, from_name, created_at FROM dares WHERE id = ?").bind(id).first();
  if (!d) return bad("no such dare", 404);
  if (isOldRules(d.game, d.created_at)) return json({ ok: true, beaten: false, retired: true, error: OLD_RULES_NOTE });
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
  const badge = user ? await unlock(env, user.id, "site", "dare_beat") : null;
  const pub = await publicDare(env, id);
  return json({ ok: true, beaten: true, first, from: pub && !pub.gone ? pub.from : "a friend", score: d.score, sender_xp: senderXp, achievement: badge });
}

// Link previews for dare links: seo.js rewrites the preview tags of /games/<slug>/?vs=…&from=…&d=… to
// "can you beat 1,240 on CRASH? from datz" with the og-vs.png card. With a dare id the score and name come
// from the server; without one, from the URL. null when there is no score to show.
export async function dareTags(env, url, slug) {
  let score = parseFloat(url.searchParams.get("vs")), from = (url.searchParams.get("from") || "").replace(/[^A-Za-z0-9 _.-]/g, "").slice(0, 24);
  const id = url.searchParams.get("d");
  let stored = null; // the dare id, when the server found it (src/darecard.js draws its share card)
  if (env.DB && id && /^[A-Za-z0-9_-]{6,16}$/.test(id)) {
    try {
      const d = await publicDare(env, id);
      if (d && d.game === slug) {
        if (d.gone) return null; // off the boards: the plain game preview, not the URL's words
        score = d.score; from = d.from; stored = id;
      }
    } catch (e) { /* table missing before the migration: fall back to the URL */ }
  }
  if (!stored && from && !nameClean(from)) from = ""; // a URL-only name gets the boards' filter too ("from a friend")
  return score > 0 ? { score: nice(score), from, id: stored } : null;
}

// POST /api/share {game, how: share|copy|card|download, anon}: "share this game" after a run with no score (no
// dare to attach it to). One cc:share event per send, for game_shares in /api/admin/metrics. Smoke traffic is
// answered but not stored.
export async function sharedGame(req, env, ip, catalog) {
  if (limited("game-share:" + ip, 30, 3600000)) return bad("slow down", 429);
  const b = await readJson(req, 256);
  const how = SHARE_HOW.includes(b.how) ? b.how : null;
  if (!how) return bad("how?", 400);
  if (!slugOk(b.game) || !catalog.has(b.game)) return bad("no such game", 404);
  if (isTestAnon(b.anon)) return json({ ok: true, test: true });
  await env.DB.prepare("INSERT INTO events (play_id, game, name, data, ts) VALUES (NULL, ?, 'cc:share', ?, ?)").bind(b.game, JSON.stringify({ how }), now()).run();
  return json({ ok: true });
}
