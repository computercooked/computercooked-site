// "What should we cook next?" (site-backlog #1, round 17): a one-tap vote on the next game to prototype, on the
// home page (assets/cook.js). The choices are fixed here (the unbuilt pitches in Games\Ideas\pitches-2026-11-16.md).
//   GET  /api/cook?anon=…            -> {ok, poll, week, options:[{id,title,pitch}], counts, total, week_total, mine}
//   POST /api/cook {anon, option}    -> same, plus {counted: true|false}
// One vote per device per week: the device's guest id (cc-anon), stored in lab_votes as poll "<POLL>:<week>", so a
// second tap the same week changes nothing (INSERT OR IGNORE) and next Monday (UTC) it can vote again. The split is
// every week of this poll added up. No free text, a per-IP and a site-wide hourly limit, and smoke ids are stored but
// never counted. Each counted vote also writes one cc:vote event {poll, week, option} (the digest counts them).
import { json, bad, readJson, now, idOk, limited, isTestAnon, weekOf } from "./util.js";

export const COOK_POLL = "cook1";
export const COOK_OPTIONS = [
  { id: "raccoon-heist", title: "raccoon heist", pitch: "sneak a raccoon past the sight cones. grab the best trash." },
  { id: "fort-knight", title: "fort knight", pitch: "close off castles with odd wall pieces, then cannon the ships." },
  { id: "tiny-volcano", title: "tiny volcano", pitch: "shape an island with lava. the villagers worship or flee." },
  { id: "pond-merge", title: "pond merge", pitch: "drop pond creatures that merge up. don't overflow the pond." },
];
const IDS = COOK_OPTIONS.map((o) => o.id);
const REAL_VOTER = "voter NOT LIKE 'asmoke%'";

// the split: all weeks of the poll, and this week alone (smoke voters left out)
export async function cookTally(env, week) {
  const rows = (await env.DB.prepare(
    `SELECT option, SUM(poll = ?) wk, COUNT(*) n FROM lab_votes WHERE poll LIKE ? AND ${REAL_VOTER} GROUP BY option`
  ).bind(COOK_POLL + ":" + week, COOK_POLL + ":%").all()).results;
  const counts = Object.fromEntries(IDS.map((id) => [id, 0]));
  const weekCounts = Object.fromEntries(IDS.map((id) => [id, 0]));
  for (const r of rows) if (r.option in counts) { counts[r.option] = r.n; weekCounts[r.option] = r.wk || 0; }
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const total = sum(counts);
  const leader = total ? IDS.slice().sort((a, b) => counts[b] - counts[a])[0] : null;
  return { counts, total, week_counts: weekCounts, week_total: sum(weekCounts), leader: leader && counts[leader] > 0 ? leader : null };
}

async function answer(env, anon, extra = {}) {
  const week = weekOf(now());
  const t = await cookTally(env, week);
  const mine = idOk(anon)
    ? await env.DB.prepare("SELECT option FROM lab_votes WHERE poll = ? AND voter = ?").bind(COOK_POLL + ":" + week, "a" + anon).first("option")
    : null;
  return json({ ok: true, poll: COOK_POLL, week, options: COOK_OPTIONS, counts: t.counts, total: t.total, week_total: t.week_total, mine: mine || null, ...extra },
    200, { "cache-control": "private, no-store" });
}

export async function cookVotes(url, env) {
  return answer(env, url.searchParams.get("anon"));
}

export async function cookVote(req, env, ip) {
  if (limited("cook:" + ip, 12, 3600000)) return bad("that's a lot of votes from here. try again later.", 429);
  const b = await readJson(req, 512);
  if (!b || !idOk(b.anon)) return bad("bad request");
  if (!IDS.includes(b.option)) return bad("that isn't one of the options.");
  const test = isTestAnon(b.anon);
  if (!test && limited("cook:all", 600, 3600000)) return bad("lots of votes right now. try again in a bit.", 429);
  const week = weekOf(now());
  const t = now();
  const r = await env.DB.prepare("INSERT OR IGNORE INTO lab_votes (poll, voter, option, ts) VALUES (?, ?, ?, ?)")
    .bind(COOK_POLL + ":" + week, "a" + b.anon, b.option, t).run();
  const counted = !!(r.meta && r.meta.changes) && !test;
  if (counted) {
    await env.DB.prepare("INSERT INTO events (play_id, game, name, data, ts) VALUES (NULL, 'site', 'cc:vote', ?, ?)")
      .bind(JSON.stringify({ poll: COOK_POLL, week, option: b.option }), t).run();
  }
  return answer(env, b.anon, { counted });
}
