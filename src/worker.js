// Computer Cooked Games platform Worker.
// Static files are served by the assets binding; only /api/* runs this code (run_worker_first in wrangler.jsonc).
import { json, bad, HttpError } from "./util.js";
import { ensureSchema } from "./db.js";
import { currentUser, signup, login, logout, setAvatar, deleteAccount } from "./auth.js";
import { savesRoute } from "./saves.js";
import { levelOf, totalXp } from "./xp.js";
import { events, leaderboard, feedback, stats, report, meSummary, favorite } from "./games.js";
import { isAdmin, metrics, listReports, moderate } from "./admin.js";
import { uploadGame, listCommunity, adminUploads, reviewUpload } from "./uploads.js";

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(req);
    try {
      return await api(req, env, url);
    } catch (e) {
      if (e instanceof HttpError) return bad(e.message, e.status);
      console.error("api error", url.pathname, e && e.stack || e);
      return bad("the server got cooked. try again.", 500);
    }
  },
};

async function api(req, env, url) {
  const path = url.pathname;
  const method = req.method;
  const ip = req.headers.get("cf-connecting-ip") || "local";
  const origin = url.origin;

  if (path === "/api/health") return json({ ok: true, db: !!env.DB });
  if (!env.DB) return bad("database not configured", 503);

  // Cross-site POSTs are refused (cookies are SameSite=Lax too).
  if (method !== "GET" && method !== "HEAD") {
    const o = req.headers.get("origin");
    if (o && o !== origin) return bad("cross-site request refused", 403);
  }

  await ensureSchema(env);
  const user = await currentUser(req, env);
  const route = method + " " + path;

  switch (route) {
    case "POST /api/events": return events(req, env, ip, user, origin);
    case "GET /api/leaderboard": return leaderboard(url, env, user);
    case "POST /api/feedback": return feedback(req, env, ip, user);
    case "GET /api/stats": return stats(env);
    case "POST /api/report": return report(req, env, ip, user);
    case "GET /api/community": return listCommunity(env);

    case "POST /api/auth/signup": return signup(req, env, ip);
    case "POST /api/auth/login": return login(req, env, ip);
    case "POST /api/auth/logout": return logout(req, env);
    case "GET /api/me": return json({ ok: true, user: user && { ...user, ...levelOf(await totalXp(env, user.id)) } });
  }

  if (path.startsWith("/api/me/")) {
    if (!user) return bad("log in first", 401);
    switch (route) {
      case "GET /api/me/summary": return meSummary(env, user, origin);
      case "POST /api/me/favorite": return favorite(req, env, user);
      case "POST /api/me/avatar": return setAvatar(req, env, user);
      case "POST /api/me/upload": return uploadGame(req, env, ip, user);
      case "POST /api/me/delete": return deleteAccount(req, env, user, ip);
    }
  }

  if (path.startsWith("/api/saves/")) return savesRoute(req, env, user, path);

  if (path.startsWith("/api/admin/")) {
    if (!isAdmin(req, env, ip)) return bad("nope", 401);
    switch (route) {
      case "GET /api/admin/metrics": return metrics(url, env, origin);
      case "GET /api/admin/reports": return listReports(env);
      case "POST /api/admin/moderate": return moderate(req, env);
      case "GET /api/admin/uploads": return adminUploads(env);
      case "POST /api/admin/uploads": return reviewUpload(req, env);
    }
  }

  return bad("no such endpoint", 404);
}
