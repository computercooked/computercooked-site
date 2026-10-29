// Makes sure the schema exists. Runs once per Worker isolate; every statement is IF NOT EXISTS.
import init from "../migrations/0001_init.sql";
import saves from "../migrations/0002_saves.sql";
import xp from "../migrations/0003_xp.sql";
import profiles from "../migrations/0004_profiles.sql";
import friends from "../migrations/0005_friends.sql";
import activity from "../migrations/0006_activity.sql";
import challenges from "../migrations/0007_challenges.sql";
import dares from "../migrations/0008_dares.sql";
import dareFunnel from "../migrations/0009_dare_funnel.sql";
import referrals from "../migrations/0010_referrals.sql";
import frames from "../migrations/0011_frames.sql";
import measurement from "../migrations/0012_measurement.sql";
import subscribers from "../migrations/0013_subscribers.sql";
import labVotes from "../migrations/0014_lab_votes.sql";
import renames from "../migrations/0015_renames.sql";
import recovery from "../migrations/0016_recovery.sql";

const schema = [init, saves, xp, profiles, friends, activity, challenges, dares, dareFunnel, referrals, frames, measurement, subscribers, labVotes, renames, recovery].join("\n;\n");

let ready = null;
export function ensureSchema(env) {
  if (!ready) {
    const stmts = schema.replace(/\r\n?/g, "\n") // the repo may check this file out with CRLF
      .split("\n").map((l) => l.replace(/--.*$/, "")).join("\n")
      .split(";").map((s) => s.trim()).filter(Boolean)
      .map((s) => env.DB.prepare(s));
    ready = env.DB.batch(stmts).catch((e) => { ready = null; throw e; });
  }
  return ready;
}

// games.json from the static assets, cached for a minute per isolate.
let catalog = null, catalogAt = 0;
export async function games(env, origin) {
  if (catalog && Date.now() - catalogAt < 60000) return catalog;
  const res = await env.ASSETS.fetch(new Request(origin + "/games/games.json"));
  const data = res.ok ? await res.json() : { games: [] };
  catalog = new Map((data.games || []).map((g) => [g.slug, g]));
  catalogAt = Date.now();
  return catalog;
}
