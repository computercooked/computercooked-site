// Makes sure the schema exists. Runs once per Worker isolate; every statement is IF NOT EXISTS.
import init from "../migrations/0001_init.sql";
import saves from "../migrations/0002_saves.sql";

const schema = [init, saves].join("\n;\n");

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
