// Computer Cooked Games platform Worker.
// Static files are served by the assets binding; /api/*, /u/* and /games/* run this code first (run_worker_first in
// wrangler.jsonc). Game pages go through seo.js; other game files pass straight through to the assets.
import { subscribe, unsubscribe } from "./subscribe.js";
import { labVotes, labVote } from "./lab.js";
import { postIdea, listIdeas } from "./ideas.js";
import { utmReport } from "./utm.js";
import { homePage, labPage, logPage } from "./pages.js";
import { json, bad, HttpError, tipUrl } from "./util.js";
import { ensureSchema, games as catalogOf } from "./db.js";
import { currentUser, signup, login, logout, setAvatar, deleteAccount, changePassword, logoutAll, changeUsername, renameInfo } from "./auth.js";
import { getMyProfile, saveMyProfile, setEmail, exportData, publicProfile } from "./profile.js";
import { savesRoute } from "./saves.js";
import { listFriends, friendAction } from "./friends.js";
import { challenge, feed, previewChallenge, friendsFeed } from "./social.js";
import { featured, previewFeatured } from "./featured.js";
import { gotdApi } from "./gotd.js";
import { dareCard } from "./darecard.js";
import { recapRoute } from "./recap.js";
import { makeDare, getDare, beatDare, sharedDare, sharedGame, dareLink } from "./dares.js";
import { gamePage } from "./seo.js";
import { hubPage } from "./hub.js";
import { collectionPage, isMood } from "./collections.js";
import { shortLink } from "./short.js";
import { champsPage } from "./champs.js";
import { embedPage } from "./embed.js";
import { levelOf, totalXp } from "./xp.js";
import { events, leaderboard, feedback, stats, report, meSummary, favorite } from "./games.js";
import { isAdmin, metrics, listReports, moderate, testTraffic } from "./admin.js";
import { digest } from "./digest.js";
import { followClick } from "./follow.js";
import { hit } from "./hits.js";
import { uploadGame, listCommunity, adminUploads, reviewUpload } from "./uploads.js";
import { recover, recoveryInfo, remakeCodes } from "./recovery.js";
import { weeklyXp } from "./weekly.js";
import { loginOptions as passkeyLoginOptions, loginFinish as passkeyLogin, registerOptions, registerFinish, listPasskeys, deletePasskey } from "./passkeys.js";

const CONSENT_COUNTRIES = new Set("AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO GB CH".split(" "));

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    // one address for search engines: www.computercooked.com → computercooked.com (permanent). Covers every path this
    // Worker runs first on (home, /games/*, /lab/, /log/, /gary/, /u/*, /d/*, /api/*); static pages carry a canonical tag.
    if (url.hostname === "www.computercooked.com" && (req.method === "GET" || req.method === "HEAD")) {
      url.hostname = "computercooked.com";
      return Response.redirect(url.toString(), 301);
    }
    // /u/<username> is one static page that reads the name from the URL
    // (usernames are letters, digits and _, so the page's own /u/u.js and /u/u.css never match)
    if (/^\/u\/[A-Za-z0-9_]{3,16}\/?$/.test(url.pathname)) return env.ASSETS.fetch(new Request(url.origin + "/u/", req));
    // game pages get JSON-LD, how-to-play and related games (and dare preview tags); other game files go straight to the assets
    // the hub: the grid, spotlight and ticker rendered from games.json (crawlers and link previews see every game)
    if (url.pathname === "/games/" || url.pathname === "/games/index.html") return hubPage(req, env, url);
    // homepage, /lab and /log: filled from games.json, /lab/lab.json and /log/log.json (src/pages.js)
    if (url.pathname === "/" || url.pathname === "/index.html") return homePage(req, env, url);
    if (url.pathname === "/lab/") return labPage(req, env, url);
    if (url.pathname === "/log/") return logPage(req, env, url);
    // the wall of epic gamers: who holds #1 on every game (src/champs.js)
    if (url.pathname === "/champs/") return champsPage(req, env, url);
    // K-0048: Gary's disaster log became the cooked log, the computer's own
    if (/^\/gary(\/|\/index\.html)?$/.test(url.pathname)) return Response.redirect(url.origin + "/log/", 301);
    // dare short links: /d/<id> → the game with the dare banner (and its dare preview tags)
    const dl = /^\/d\/([A-Za-z0-9_-]{6,16})\/?$/.exec(url.pathname);
    if (dl) return dareLink(env, url, dl[1]);
    // promo short links: /g/<alias> → the game page, tagged ref=short / utm_medium=short (src/short.js)
    const sl = /^\/g(?:\/([A-Za-z0-9_-]{0,40}))?\/?$/.exec(url.pathname);
    if (sl) return shortLink(env, url, sl[1]);
    // mood collections (/games/arcade/, /puzzle/, /chill/, /quick/, /rage/): server-rendered pages (src/collections.js).
    // Without the slash (or with index.html) they 301 to the slash form; any other word stays a game page (or a 404).
    const mm = /^\/games\/([a-z]+)(\/index\.html)?$/.exec(url.pathname);
    if (mm && isMood(mm[1])) return Response.redirect(`${url.origin}/games/${mm[1]}/${url.search}`, 301);
    // a stored dare's share card (src/darecard.js): the link preview image of /games/<slug>/?…&d=<id>
    const dc = /^\/games\/([a-z0-9-]+)\/dare\/([A-Za-z0-9_-]{6,16})\.png$/.exec(url.pathname);
    if (dc) return dareCard(req, env, url, dc[1], dc[2]);
    const gm = /^\/games\/([a-z0-9-]+)\/$/.exec(url.pathname);
    if (gm) return (isMood(gm[1]) && (await collectionPage(req, env, url, gm[1]))) || gamePage(req, env, url, gm[1]);
    // the embed player other sites can iframe
    const em = /^\/games\/([a-z0-9-]+)\/embed\/?$/.exec(url.pathname);
    if (em) return embedPage(env, url, em[1]);
    // the same bare player for the homepage's "play it here" window (only our own pages may frame it)
    const wn = /^\/games\/([a-z0-9-]+)\/window\/?$/.exec(url.pathname);
    if (wn) return embedPage(env, url, wn[1], true);
    // the bare game builds the players frame (/games/<slug>/play/) stay out of search results: the game page is the
    // one to index. indexifembedded lets Google still count them as part of the page that frames them.
    if (/^\/games\/[a-z0-9-]+\/play\/(index\.html)?$/.test(url.pathname)) {
      const r = await env.ASSETS.fetch(req), out = new Response(r.body, r);
      out.headers.set("x-robots-tag", "noindex, indexifembedded");
      return out;
    }
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
  // does this visitor need an ads consent banner (assets/consent.js)? EU/EEA, UK and Switzerland, from Cloudflare's country
  if (path === "/api/geo") return json({ ok: true, consent_required: CONSENT_COUNTRIES.has((req.cf && req.cf.country) || "") }, 200, { "cache-control": "private, max-age=3600" });
  // the tip jar link (hub footer, after a run): null while TIP_URL is unset, so nothing shows
  if (path === "/api/tip") return json({ ok: true, url: tipUrl(env) }, 200, { "cache-control": "public, max-age=300" });
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
    case "GET /api/featured": return featured(env, await catalogOf(env, origin));
    case "GET /api/challenge": return challenge(env, user, await catalogOf(env, origin));
    case "GET /api/gotd": return gotdApi(env, await catalogOf(env, origin));
    case "POST /api/feedback": return feedback(req, env, ip, user);
    case "POST /api/subscribe": return subscribe(req, env, ip);
    case "GET /api/unsubscribe": return unsubscribe(url, env);
    case "GET /api/lab/votes": return labVotes(url, env, user);
    case "POST /api/lab/vote": return labVote(req, env, url, ip, user);
    case "POST /api/ideas": return postIdea(req, env, ip);
    case "GET /api/stats": return stats(env);
    case "POST /api/report": return report(req, env, ip, user);
    case "GET /api/community": return listCommunity(env);

    case "POST /api/auth/signup": return signup(req, env, ip);
    case "POST /api/auth/login": return login(req, env, ip);
    case "POST /api/auth/logout": return logout(req, env);
    case "GET /api/xp/week": return weeklyXp(env, user);
    case "POST /api/auth/recover": return recover(req, env, ip);
    case "POST /api/auth/passkey/options": return passkeyLoginOptions(req, env, ip);
    case "POST /api/auth/passkey": return passkeyLogin(req, env, ip);
    case "GET /api/me": return json({ ok: true, user: user && { ...user, ...levelOf(await totalXp(env, user.id)) } });
  }

  if (path.startsWith("/api/me/")) {
    if (!user) return bad("log in first", 401);
    switch (route) {
      case "GET /api/me/summary": return meSummary(env, user, origin);
      case "GET /api/me/recap": return recapRoute(url, env, user, await catalogOf(env, origin));
      case "POST /api/me/favorite": return favorite(req, env, user);
      case "POST /api/me/avatar": return setAvatar(req, env, user);
      case "POST /api/me/upload": return uploadGame(req, env, ip, user);
      case "POST /api/me/delete": return deleteAccount(req, env, user, ip);
      case "GET /api/me/profile": return getMyProfile(env, user);
      case "POST /api/me/profile": return saveMyProfile(req, env, user, origin);
      case "POST /api/me/email": return setEmail(req, env, user);
      case "POST /api/me/password": return changePassword(req, env, user, ip);
      case "POST /api/me/username": return changeUsername(req, env, user, ip);
      case "GET /api/me/username": return json({ ok: true, username: user.username, ...(await renameInfo(env, user)) });
      case "GET /api/me/recovery": return recoveryInfo(env, user);
      case "POST /api/me/recovery": return remakeCodes(req, env, user, ip);
      case "GET /api/me/passkeys": return listPasskeys(env, user);
      case "POST /api/me/passkey/options": return registerOptions(req, env, user, ip);
      case "POST /api/me/passkey": return registerFinish(req, env, user);
      case "POST /api/me/passkey/delete": return deletePasskey(req, env, user);
      case "POST /api/me/logout-all": return logoutAll(req, env, user);
      case "GET /api/me/export": return exportData(env, user);
      case "GET /api/me/friends": return listFriends(env, user);
      case "GET /api/me/friends/feed": return friendsFeed(env, user, await catalogOf(env, origin));
      case "GET /api/me/feed": return feed(env, user, await catalogOf(env, origin));
      case "POST /api/me/friends": return friendAction(req, env, user, ip);
    }
  }

  if (path.startsWith("/api/saves/")) return savesRoute(req, env, user, path);
  // challenge-a-friend links
  if (route === "POST /api/dare") return makeDare(req, env, user, ip, await catalogOf(env, origin), origin);
  const dm = /^\/api\/dare\/([A-Za-z0-9_-]{6,16})(\/beat|\/shared)?$/.exec(path);
  if (dm && method === "GET" && !dm[2]) return getDare(url, env, dm[1], await catalogOf(env, origin));
  if (dm && method === "POST" && dm[2] === "/beat") return beatDare(req, env, user, dm[1]);
  if (dm && method === "POST" && dm[2] === "/shared") return sharedDare(req, env, ip, dm[1]);
  // "share this game" after a run with no score
  if (route === "POST /api/share") return sharedGame(req, env, ip, await catalogOf(env, origin));
  // "follow @computercooked" button clicks (assets/follow.js)
  if (route === "POST /api/follow") return followClick(req, env, ip);
  // page views and tip clicks/successes (assets/deck.js, games/hub.js, games/platform.js)
  if (route === "POST /api/hit") return hit(req, env, ip);

  if (method === "GET" && path.startsWith("/api/u/")) return publicProfile(env, path.slice(7), origin, user);

  if (path.startsWith("/api/admin/")) {
    if (!isAdmin(req, env, ip)) return bad("nope", 401);
    switch (route) {
      case "GET /api/admin/metrics": return metrics(url, env, origin);
      case "GET /api/admin/digest": return digest(url, env);
      case "GET /api/admin/ideas": return listIdeas(url, env);
      case "GET /api/admin/utm": return utmReport(url, env);
      case "GET /api/admin/reports": return listReports(env);
      case "GET /api/admin/featured": return previewFeatured(url, env, await catalogOf(env, origin));
      case "GET /api/admin/challenge": return previewChallenge(url, env, await catalogOf(env, origin));
      case "POST /api/admin/moderate": return moderate(req, env);
      case "POST /api/admin/test-traffic": return testTraffic(req, env);
      case "GET /api/admin/uploads": return adminUploads(env);
      case "POST /api/admin/uploads": return reviewUpload(req, env);
    }
  }

  return bad("no such endpoint", 404);
}
