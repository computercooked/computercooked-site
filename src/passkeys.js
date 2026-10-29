// K-0030 step 5: passkeys (WebAuthn), an optional extra way to log in with Face ID, a fingerprint or a phone.
// Free and built in to browsers. We keep the public key only. No attestation is asked for ("none"): the browser hands
// over the key as SPKI (getPublicKey), so there's no CBOR to parse. Signatures are checked with WebCrypto.
import { json, bad, readJson, now, b64, unb64, randomToken, limited, str } from "./util.js";
import { checkPassword, startSession, linkAnon } from "./auth.js";

const MAX_KEYS = 10;
const ALGS = { "-7": { name: "ECDSA", namedCurve: "P-256" }, "-257": { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" } };
const b64u = (buf) => b64(buf).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function unb64u(s) {
  if (typeof s !== "string" || !/^[A-Za-z0-9_-]{1,4096}$/.test(s)) throw new Error("bad base64url");
  return unb64(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
}
const rpOf = (req) => new URL(req.url).hostname;
const sha = async (bytes) => new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

async function challenge(env, kind, userId) {
  const c = randomToken(32);
  const t = now();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM webauthn_challenges WHERE expires_at < ?").bind(t),
    env.DB.prepare("INSERT INTO webauthn_challenges (challenge, user_id, kind, expires_at) VALUES (?, ?, ?, ?)").bind(c, userId, kind, t + 300000),
  ]);
  return c;
}

// clientDataJSON must be for this site, this ceremony and a challenge we issued (each challenge works once)
async function checkClient(req, env, b64json, type) {
  let cd;
  try { cd = JSON.parse(new TextDecoder().decode(unb64u(b64json))); } catch (e) { return null; }
  if (!cd || cd.type !== type || cd.origin !== new URL(req.url).origin || typeof cd.challenge !== "string") return null;
  const row = await env.DB.prepare("DELETE FROM webauthn_challenges WHERE challenge = ? AND kind = ? AND expires_at > ? RETURNING user_id")
    .bind(cd.challenge, type, now()).first();
  return row ? { userId: row.user_id } : null;
}

// authenticatorData: rpIdHash(32) | flags(1) | signCount(4) | ...; the user must have been present (flag bit 0)
async function checkAuthData(req, bytes) {
  if (bytes.length < 37 || !same(bytes.slice(0, 32), await sha(new TextEncoder().encode(rpOf(req)))) || !(bytes[32] & 1)) return null;
  return { count: ((bytes[33] << 24) | (bytes[34] << 16) | (bytes[35] << 8) | bytes[36]) >>> 0 };
}

// WebAuthn ES256 signatures are DER; WebCrypto wants r|s, 32 bytes each
function derToRaw(der) {
  if (der[0] !== 0x30) throw new Error("bad signature");
  let i = der[1] & 0x80 ? 2 + (der[1] & 0x7f) : 2;
  const out = new Uint8Array(64);
  for (let k = 0; k < 2; k++) {
    if (der[i] !== 2) throw new Error("bad signature");
    const len = der[i + 1];
    let v = der.slice(i + 2, i + 2 + len);
    while (v.length > 32 && v[0] === 0) v = v.slice(1);
    if (v.length > 32) throw new Error("bad signature");
    out.set(v, k * 32 + 32 - v.length);
    i += 2 + len;
  }
  return out;
}

const importKey = (spki, alg) => crypto.subtle.importKey("spki", spki, ALGS[alg], false, ["verify"]);

// POST /api/me/passkey/options {password}: start adding a passkey (asks for the password, so a borrowed
// logged-in device can't quietly add its own way in)
export async function registerOptions(req, env, user, ip) {
  if (limited("pk-reg:" + ip, 10, 600000)) return bad("too many tries. wait a few minutes.", 429);
  const b = await readJson(req, 4096);
  if (!(await checkPassword(env, user.id, b.password))) return bad("wrong password.", 401);
  const have = (await env.DB.prepare("SELECT id FROM passkeys WHERE user_id = ?").bind(user.id).all()).results;
  if (have.length >= MAX_KEYS) return bad(`that's the most passkeys (${MAX_KEYS}). remove one first.`);
  return json({ ok: true, publicKey: {
    challenge: await challenge(env, "webauthn.create", user.id),
    rp: { id: rpOf(req), name: "computer cooked" },
    user: { id: b64u(new TextEncoder().encode("cc-user-" + user.id)), name: user.username, displayName: user.username },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
    excludeCredentials: have.map((k) => ({ type: "public-key", id: k.id })),
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
    attestation: "none", timeout: 120000,
  } });
}

// POST /api/me/passkey {id, clientDataJSON, authenticatorData, publicKey, alg, label}
export async function registerFinish(req, env, user) {
  const b = await readJson(req, 16384);
  const c = await checkClient(req, env, b.clientDataJSON, "webauthn.create");
  if (!c || c.userId !== user.id) return bad("that passkey request ran out. try again.");
  let auth, spki;
  try { auth = await checkAuthData(req, unb64u(b.authenticatorData)); spki = unb64u(b.publicKey); unb64u(b.id); } catch (e) { return bad("that passkey didn't come through. try again."); }
  if (!auth || !ALGS[String(b.alg)] || b.id.length > 1024) return bad("that passkey didn't come through. try again.");
  try { await importKey(spki, String(b.alg)); } catch (e) { return bad("that kind of passkey isn't supported."); }
  const label = (str(b.label, 40) || "").replace(/[<>]/g, "").trim() || "passkey";
  try {
    await env.DB.prepare("INSERT INTO passkeys (id, user_id, public_key, alg, sign_count, label, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(b.id, user.id, b64(spki), b.alg, auth.count, label, now()).run();
  } catch (e) {
    if (/UNIQUE|PRIMARY/i.test(String(e))) return bad("that passkey is already added.");
    throw e;
  }
  return json({ ok: true, passkeys: await listOf(env, user.id) });
}

async function listOf(env, userId) {
  return (await env.DB.prepare("SELECT id, label, created_at, last_used FROM passkeys WHERE user_id = ? ORDER BY created_at").bind(userId).all()).results;
}
// GET /api/me/passkeys
export async function listPasskeys(env, user) {
  return json({ ok: true, passkeys: await listOf(env, user.id) });
}
// POST /api/me/passkey/delete {id}
export async function deletePasskey(req, env, user) {
  const b = await readJson(req, 4096);
  await env.DB.prepare("DELETE FROM passkeys WHERE id = ? AND user_id = ?").bind(str(b.id, 1024) || "", user.id).run();
  return json({ ok: true, passkeys: await listOf(env, user.id) });
}

// POST /api/auth/passkey/options: start a passkey log-in (the browser offers whichever passkeys it has for this site)
export async function loginOptions(req, env, ip) {
  if (limited("pk-login:" + ip, 30, 600000)) return bad("too many tries. wait a few minutes.", 429);
  return json({ ok: true, publicKey: { challenge: await challenge(env, "webauthn.get", null), rpId: rpOf(req), userVerification: "preferred", timeout: 120000 } });
}

// POST /api/auth/passkey {id, clientDataJSON, authenticatorData, signature, anon_id}
export async function loginFinish(req, env, ip) {
  if (limited("pk-login:" + ip, 30, 600000)) return bad("too many tries. wait a few minutes.", 429);
  const b = await readJson(req, 16384);
  const no = () => bad("that passkey didn't work. try your password.", 401);
  const key = await env.DB.prepare("SELECT k.id, k.user_id, k.public_key, k.alg, k.sign_count, u.username, u.avatar, u.status FROM passkeys k JOIN users u ON u.id = k.user_id WHERE k.id = ?")
    .bind(str(b.id, 1024) || "").first();
  if (!key || key.status === "banned") return no();
  if (!(await checkClient(req, env, b.clientDataJSON, "webauthn.get"))) return no();
  let ok = false, auth = null;
  try {
    const ad = unb64u(b.authenticatorData), cdj = unb64u(b.clientDataJSON);
    auth = await checkAuthData(req, ad);
    if (auth) {
      const signed = new Uint8Array(ad.length + 32);
      signed.set(ad); signed.set(await sha(cdj), ad.length);
      let sig = unb64u(b.signature);
      if (key.alg === -7) sig = derToRaw(sig);
      ok = await crypto.subtle.verify(key.alg === -7 ? { name: "ECDSA", hash: "SHA-256" } : "RSASSA-PKCS1-v1_5", await importKey(unb64(key.public_key), String(key.alg)), sig, signed);
    }
  } catch (e) { ok = false; }
  if (!ok) return no();
  // a counter that goes backwards means a copied key: refuse (most synced passkeys always send 0, which is fine)
  if (key.sign_count > 0 && auth.count <= key.sign_count) return no();
  await env.DB.prepare("UPDATE passkeys SET sign_count = ?, last_used = ? WHERE id = ?").bind(auth.count, now(), key.id).run();
  const xp = await linkAnon(env, key.user_id, b.anon_id || b.anon, key.username);
  return startSession(env, key.user_id, req, { ok: true, user: { id: key.user_id, username: key.username, avatar: key.avatar }, xp });
}
