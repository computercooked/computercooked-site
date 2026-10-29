// /lab "vote on the next game" (K-0031 item 10). The poll and its options live in /lab/lab.json (static), so
// changing the question is a file edit. One vote per player per poll (account, else the guest id); voting again
// changes it. Smoke-test voters are stored but never counted.
//   GET  /api/lab/votes?anon=…          -> {ok, poll, counts: {option: n}, total, mine}
//   POST /api/lab/vote {anon, option}   -> same
import { json, bad, readJson, now, idOk, limited } from "./util.js";

let cached = { at: 0, poll: null };
async function pollOf(env, origin) {
  if (cached.poll && now() - cached.at < 60000) return cached.poll;
  const r = await env.ASSETS.fetch(new Request(origin + "/lab/lab.json"));
  const poll = r.ok ? (await r.json()).poll : null;
  cached = { at: now(), poll };
  return poll;
}

const voterOf = (user, anon) => (user ? "u" + user.id : idOk(anon) ? "a" + anon : null);

async function tally(env, poll, voter) {
  const rows = (await env.DB.prepare(
    "SELECT option, COUNT(*) n FROM lab_votes WHERE poll = ? AND voter NOT LIKE 'asmoke%' GROUP BY option"
  ).bind(poll.id).all()).results;
  const counts = Object.fromEntries(poll.options.map((o) => [o.id, 0]));
  for (const r of rows) if (r.option in counts) counts[r.option] = r.n;
  const mine = voter ? await env.DB.prepare("SELECT option FROM lab_votes WHERE poll = ? AND voter = ?").bind(poll.id, voter).first("option") : null;
  return json({ ok: true, poll: poll.id, counts, total: Object.values(counts).reduce((a, b) => a + b, 0), mine: mine || null });
}

export async function labVotes(url, env, user) {
  const poll = await pollOf(env, url.origin);
  if (!poll) return bad("no poll right now", 404);
  return tally(env, poll, voterOf(user, url.searchParams.get("anon")));
}

export async function labVote(req, env, url, ip, user) {
  if (limited("labvote:" + ip, 30, 3600000)) return bad("too many votes. try again later.", 429);
  const poll = await pollOf(env, url.origin);
  if (!poll) return bad("no poll right now", 404);
  const b = await readJson(req, 2048);
  const voter = voterOf(user, b && b.anon);
  if (!voter) return bad("bad request");
  if (!b || !poll.options.some((o) => o.id === b.option)) return bad("that isn't one of the options.");
  await env.DB.prepare(
    "INSERT INTO lab_votes (poll, voter, option, ts) VALUES (?, ?, ?, ?) ON CONFLICT(poll, voter) DO UPDATE SET option = excluded.option, ts = excluded.ts"
  ).bind(poll.id, voter, b.option, now()).run();
  return tally(env, poll, voter);
}
