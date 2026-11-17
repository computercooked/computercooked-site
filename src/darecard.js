// Dare share cards: GET /games/<slug>/dare/<id>.png, a 1200x630 PNG for a stored dare ("CAN YOU BEAT 1,840 / ON
// MICROWAVE PANIC / FROM PAT"), used as the link preview of dare links (src/seo.js) in place of the game's generic
// og-vs.png. Drawn here with no packages: a 5x7 pixel font, the game's games.json theme colours and a little
// cooked computer, written as an indexed-colour PNG and compressed with the Worker's own CompressionStream.
// Only stored dares get a card (the id is looked up; the score and name come from the dares table), so nobody can
// put their own words on an image served from our domain. Cached for a day per URL (a dare never changes).
import { games as catalogOf } from "./db.js";

const W = 1200, H = 630;

// 5x7 glyphs, one number per row (bit 4 = leftmost column)
const FONT = {
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 17, 10, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31], 3: [31, 2, 4, 2, 1, 17, 14],
  4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14], 6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8],
  8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 2, 12],
  " ": [0, 0, 0, 0, 0, 0, 0], ",": [0, 0, 0, 0, 12, 4, 8], ".": [0, 0, 0, 0, 0, 12, 12], "!": [4, 4, 4, 4, 4, 0, 4],
  "?": [14, 17, 1, 2, 4, 0, 4], "'": [4, 4, 8, 0, 0, 0, 0], "-": [0, 0, 0, 31, 0, 0, 0], "+": [0, 4, 4, 31, 4, 4, 0],
  ":": [0, 12, 12, 0, 12, 12, 0], "(": [2, 4, 8, 8, 8, 4, 2], ")": [8, 4, 2, 2, 2, 4, 8], _: [0, 0, 0, 0, 0, 0, 31],
  "&": [12, 18, 20, 8, 21, 18, 13], "/": [1, 2, 2, 4, 8, 8, 16], "#": [10, 10, 31, 10, 31, 10, 10], "%": [24, 25, 2, 4, 8, 19, 3],
};
// the cooked computer (x eyes, flat mouth): k outline, b case, d vent, s screen, g face
const GARY = [
  "..kkkkkkkkkkkk..", ".kbbbbbbbbbbbbk.", ".kbkkkkkkkkkkbk.", ".kbksssssssskbk.", ".kbkgsgssgsgkbk.",
  ".kbksgssssgskbk.", ".kbkgsgssgsgkbk.", ".kbksssssssskbk.", ".kbksggggggskbk.", ".kbksssssssskbk.",
  ".kbkkkkkkkkkkbk.", ".kbbbbbbbbbbbbk.", ".kbbbbbbbbbddbk.", "..kkkkkkkkkkkk..", "....kbbbbbbk....", "...kkkkkkkkkk...",
];
const C = { bg: 0, accent: 1, text: 2, dim: 3, k: 4, b: 5, d: 6, s: 7, g: 8 };
const hex = (h, fb) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ""); const n = parseInt(m ? m[1] : fb, 16); return [n >> 16, (n >> 8) & 255, n & 255]; };

export function drawCard({ title, score, from, theme }) {
  const pal = [hex(theme?.bg, "101114"), hex(theme?.accent, "b6f03c"), [243, 241, 234], [168, 166, 156], [0, 0, 0],
    [232, 220, 176], [185, 171, 127], [20, 22, 15], [182, 240, 60]];
  const px = new Uint8Array(W * H); // all bg (index 0)
  const rect = (x, y, w, h, c) => {
    for (let j = Math.max(0, y); j < Math.min(H, y + h); j++) px.fill(c, j * W + Math.max(0, x), j * W + Math.min(W, x + w));
  };
  const glyphs = (s) => [...String(s).toUpperCase()].map((ch) => FONT[ch] || FONT[" "]);
  const width = (s, sc) => glyphs(s).length * 6 * sc - sc;
  const text = (s, x, y, sc, c, shadow = true) => {
    const gs = glyphs(s), o = Math.max(2, Math.round(sc / 3));
    for (const pass of shadow ? [C.k, c] : [c]) {
      const dx = pass === C.k && shadow ? o : 0;
      gs.forEach((g, i) => g.forEach((row, r) => { for (let col = 0; col < 5; col++) if (row & (16 >> col)) rect(x + dx + (i * 6 + col) * sc, y + dx + r * sc, sc, sc, pass); }));
    }
  };
  // the largest scale (up to max) at which s fits in w pixels; long words get trimmed with "..."
  const fit = (s, w, max, min) => {
    let t = String(s), sc = Math.min(max, Math.floor((w + 1) / (t.length * 6)));
    while (sc < min && t.length > 4) { t = t.slice(0, -4).trimEnd() + "..."; sc = Math.min(max, Math.floor((w + 1) / (t.length * 6))); }
    return [t, Math.max(sc, 1)];
  };

  // frame
  rect(28, 28, W - 56, 10, C.accent); rect(28, H - 38, W - 56, 10, C.accent); rect(28, 28, 10, H - 56, C.accent); rect(W - 38, 28, 10, H - 56, C.accent);
  text("COMPUTER COOKED - A DARE", 80, 76, 4, C.accent);
  text("CAN YOU BEAT", 80, 140, 9, C.text);
  const [sTxt, sSc] = fit(score, 740, 20, 6);
  text(sTxt, 80, 228 + Math.round((140 - 7 * sSc) / 2), sSc, C.accent); // a long score at a smaller size sits mid-band
  const [tTxt, tSc] = fit("ON " + title, 1040, 6, 3);
  text(tTxt, 80, 392, tSc, C.text);
  const [fTxt, fSc] = fit("FROM " + (from || "A FRIEND"), 1040, 5, 3);
  text(fTxt, 80, 452, fSc, C.dim);
  text("PLAY FREE: COMPUTERCOOKED.COM", 80, 530, 4, C.text);
  // gary, top right
  const gs = 15, gx = W - 80 - 16 * gs, gy = 96;
  GARY.forEach((row, r) => [...row].forEach((ch, col) => { if (C[ch] !== undefined) rect(gx + col * gs, gy + r * gs, gs, gs, C[ch]); }));
  return { px, pal };
}

// PNG (8-bit indexed): signature, IHDR, PLTE, IDAT (zlib via CompressionStream "deflate"), IEND
let crcT = null;
function crc32(buf) {
  if (!crcT) { crcT = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; } }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcT[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = new Uint8Array(12 + data.length), dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}
export async function encodePng({ px, pal }) {
  const ihdr = new Uint8Array(13), dv = new DataView(ihdr.buffer);
  dv.setUint32(0, W); dv.setUint32(4, H); ihdr.set([8, 3, 0, 0, 0], 8);
  const plte = new Uint8Array(pal.length * 3); pal.forEach((c, i) => plte.set(c, i * 3));
  const raw = new Uint8Array((W + 1) * H);
  for (let y = 0; y < H; y++) raw.set(px.subarray(y * W, (y + 1) * W), y * (W + 1) + 1); // filter byte 0 per row
  const z = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream("deflate"))).arrayBuffer());
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("PLTE", plte), chunk("IDAT", z), chunk("IEND", new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0; for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

const nice = (n) => (Math.round(n * 10) / 10).toLocaleString("en-US");

export async function dareCard(req, env, url, slug, id) {
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const hit = cache && await cache.match(req);
  if (hit) return hit;
  const notFound = () => Response.redirect(`${url.origin}/games/${slug}/og-vs.png?v=5`, 302);
  if (!env.DB) return notFound();
  let d = null;
  try { d = await env.DB.prepare("SELECT game, score, from_name FROM dares WHERE id = ?").bind(id).first(); } catch (e) { /* no table */ }
  const g = d && d.game === slug && (await catalogOf(env, url.origin)).get(slug);
  if (!g || !(d.score > 0)) return notFound();
  const png = await encodePng(drawCard({ title: g.title, score: nice(d.score), from: d.from_name, theme: g.theme }));
  const res = new Response(png, { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
  if (cache) await cache.put(req, res.clone());
  return res;
}
