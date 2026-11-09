// desktop takeover · computer cooked games (G-0143)
// you are a rogue folder. folders spawn cursors; drag from yours to any other to send half. take the whole desktop.
(() => {
  "use strict";
  const Q = new URLSearchParams(location.search);
  const PQ = (() => { try { return new URLSearchParams(parent.location.search); } catch (e) { return new URLSearchParams(""); } })();
  const flag = (k) => Q.has(k) || PQ.has(k);
  const param = (k) => (Q.has(k) ? Q.get(k) : PQ.get(k));
  const TEST = flag("cctest"), SHOT = flag("shot");
  const $ = (id) => document.getElementById(id);
  const sdk = (fn) => { try { if (window.cc) fn(window.cc); } catch (e) {} };
  const ev = (name, data) => sdk((c) => c.event && c.event(name, data || {}));
  // audio: silent hooks only. drop a file url next to a name and it plays; nothing is synthesized.
  const FILES = { send: "", capture: "", lost: "", nuke: "", warn: "", win: "", lose: "" };
  const play = (name) => { const u = FILES[name]; if (!u) return; try { const a = new Audio(u); a.volume = 0.6; a.play().catch(() => {}); } catch (e) {} };

  // ---------- the cast ----------
  // owner 0 = nobody, 1 = you, 2+ = bot programs. need = how sure a bot wants to be before it attacks.
  const F = [
    { id: "none", name: "", col: "#9aa0c4", dark: "#4b5075", speed: 1, armor: 1, cap: 1 },
    { id: "you", name: "you", col: "#b6ff3c", dark: "#3f6a08", speed: 1, armor: 1, cap: 1, ai: "auto", think: 0.9, need: 1.05, hate: 0, srcs: 3 },
    { id: "nanny", name: "virus nanny", col: "#ff4d5e", dark: "#7d0f1c", speed: 1.35, armor: 1, cap: 1, ai: "rush", think: 1.5, need: 0.8, hate: 8, srcs: 2 },
    { id: "hoard", name: "stuff i saved", col: "#4db8ff", dark: "#0f4a80", speed: 1, armor: 1, cap: 1.5, ai: "hoard", think: 4, need: 1.2, hate: 2, srcs: 3 },
    { id: "popup", name: "click here!!", col: "#ff6bd6", dark: "#80165f", speed: 1.1, armor: 1, cap: 1, ai: "spam", think: 1.1, need: 0.45, hate: 3, srcs: 1 },
    { id: "sys", name: "do_not_delete", col: "#ffb340", dark: "#7d5005", speed: 0.7, armor: 1.7, cap: 1, ai: "tank", think: 3.2, need: 1.3, hate: 2, srcs: 2 },
  ];
  const T = [{ r: 30, g: 0.34, cap: 20, w: 1 }, { r: 36, g: 0.52, cap: 35, w: 1.5 }, { r: 44, g: 0.78, cap: 55, w: 2 }];
  const WW = 1000, WH = 620, LIMIT = 240, NUKE_R = 175, BOT_NUKE_R = 130, UNIT_SPEED = 105;

  // nodes: [x, y, tier 1-3, owner, cursors]
  const LEVELS = [
    { name: "new folder", think: 2.4, grow: 0.5, nuke: false, delay: 10, need: 3,
      nodes: [[130, 330, 1, 1, 12], [300, 205, 1, 0, 3], [310, 465, 1, 0, 3], [500, 330, 2, 0, 8], [685, 200, 1, 0, 4], [690, 470, 1, 0, 4], [870, 330, 1, 5, 12]] },
    { name: "pop-up season", think: 1.7, grow: 0.7, nuke: false, delay: 6, need: 4,
      nodes: [[120, 480, 1, 1, 12], [280, 300, 1, 0, 6], [330, 520, 1, 0, 5], [520, 520, 1, 0, 8], [500, 310, 2, 0, 14], [480, 110, 1, 0, 8], [670, 100, 1, 0, 5], [720, 320, 1, 0, 6], [880, 140, 1, 4, 15]] },
    { name: "full scan", think: 1.35, grow: 0.8, nuke: true, delay: 4, need: 4,
      nodes: [[110, 310, 1, 1, 14], [270, 150, 1, 0, 6], [270, 470, 1, 0, 6], [500, 120, 2, 0, 13], [500, 500, 2, 0, 13], [500, 310, 3, 0, 22], [730, 150, 1, 0, 6], [730, 470, 1, 0, 6], [890, 310, 1, 2, 25]] },
    { name: "downloads (4,812)", think: 1.25, grow: 0.85, nuke: true, delay: 4, need: 4,
      nodes: [[500, 540, 1, 1, 15], [300, 420, 1, 0, 6], [700, 420, 1, 0, 6], [500, 330, 2, 0, 13], [320, 200, 1, 0, 8], [680, 200, 1, 0, 8], [500, 110, 3, 0, 26], [120, 400, 1, 0, 8], [880, 400, 1, 0, 8], [140, 120, 2, 3, 25], [860, 120, 1, 4, 22]] },
    { name: "the whole desktop", think: 1.3, grow: 0.9, nuke: true, delay: 3, need: 4,
      nodes: [[500, 310, 2, 1, 26], [300, 200, 1, 0, 6], [700, 200, 1, 0, 6], [300, 420, 1, 0, 6], [700, 420, 1, 0, 6], [500, 110, 1, 0, 10], [500, 510, 1, 0, 10], [260, 310, 2, 0, 14], [740, 310, 2, 0, 14], [110, 90, 1, 2, 12], [890, 90, 1, 3, 12], [110, 530, 1, 4, 12], [890, 530, 1, 5, 12]] },
  ];

  // ---------- rng ----------
  const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const capOf = (n) => T[n.t].cap * F[n.o].cap;

  // a random desktop: half the folders are rolled, the other half mirror them through the centre, so it starts fair.
  function genMap(rng, nBots) {
    const cells = []; for (let cx = 0; cx < 3; cx++) for (let cy = 0; cy < 4; cy++) cells.push([cx, cy]);
    for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
    const half = cells.slice(0, 5 + Math.floor(rng() * 2)).map(([cx, cy]) => {
      const r = rng(), t = r < 0.6 ? 1 : r < 0.9 ? 2 : 3;
      return [Math.round(90 + cx * 150 + rng() * 50), Math.round(85 + cy * 120 + rng() * 40), t, 0, [5, 10, 16][t - 1] + Math.floor(rng() * 3)];
    });
    half.sort((a, b) => a[0] - b[0]);
    const pool = [2, 3, 4, 5]; for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const mir = half.map((n) => [WW - n[0], WH - n[1], n[2], 0, n[4]]);
    half[0] = [half[0][0], half[0][1], 1, 1, 12]; mir[0] = [mir[0][0], mir[0][1], 1, pool[0], 12];
    if (nBots > 1) { // the extra bots move into the folders furthest from both homes
      let k = 1, far = -1; for (let i = 1; i < half.length; i++) { const d = Math.min(Math.hypot(half[i][0] - half[0][0], half[i][1] - half[0][1]), Math.hypot(half[i][0] - mir[0][0], half[i][1] - mir[0][1])); if (d > far) { far = d; k = i; } }
      half[k] = [half[k][0], half[k][1], 1, nBots > 2 ? pool[2] : 0, nBots > 2 ? 10 : half[k][4]]; mir[k] = [mir[k][0], mir[k][1], 1, pool[1], 10];
    }
    return half.concat(mir);
  }

  // ---------- a match (pure sim: no drawing in here, so it can run headless) ----------
  function newMatch(mode, o) {
    o = o || {};
    const g = { mode, level: o.level || 0, wave: o.wave || 0, date: o.date || "", t: 0, units: [], streams: [], warn: [], events: [], over: null, caps: 0, lost: 0, nukeHits: 0, sent: 0, auto: !!o.auto, demo: !!o.demo, dirty: true };
    let def;
    if (mode === "campaign") { def = LEVELS[g.level - 1]; g.rng = mulberry(hash("dt-level-" + g.level) + (o.salt || 0)); g.name = def.name; }
    else if (mode === "daily") { g.rng = mulberry(hash("dt-daily-" + g.date)); def = { nodes: genMap(g.rng, 2), think: 1.2, grow: 0.85, nuke: true, delay: 4, need: 4 }; g.name = "daily desktop · " + g.date.slice(5); }
    else { const w = Math.max(1, g.wave); g.rng = mulberry(o.seed != null ? o.seed : (Math.random() * 2 ** 32) >>> 0); def = { nodes: genMap(g.rng, w < 3 ? 1 : w < 8 ? 2 : 3), think: Math.max(0.75, 1.9 - w * 0.14), grow: Math.min(1.1, 0.6 + w * 0.05), nuke: w >= 2, delay: Math.max(2, 7 - w), need: 4 }; g.name = mode === "demo" ? "" : "desktop #" + w; }
    g.diff = { think: def.think, grow: def.grow, nuke: def.nuke, delay: def.delay };
    g.nodes = def.nodes.map(([x, y, t, ow, n], i) => ({ i, x, y, t: t - 1, o: ow, n, held: 0, pop: 0, hit: 0 }));
    g.bots = [...new Set(g.nodes.map((n) => n.o).filter((ow) => ow >= 2))].map((ow) => ({ o: ow, next: def.delay + g.rng() * 2, charge: 0, used: false }));
    if (g.auto) g.me = { o: 1, next: 1, charge: 0, used: true };
    g.bin = { charge: 0, need: def.need, used: false };
    return g;
  }

  function send(g, a, b) {
    if (a === b) return 0;
    const amt = Math.floor(a.n / 2); if (amt < 1) return 0;
    a.n -= amt; g.streams.push({ from: a.i, to: b.i, o: a.o, left: amt, acc: 0.05 }); if (a.o === 1) g.sent++;
    return amt;
  }

  function capture(g, n, o) {
    const was = n.o; n.o = o; n.n = 1; n.held = 0; n.pop = 1; g.dirty = true;
    if (o === 1) { g.caps++; if (!g.bin.used) g.bin.charge = Math.min(g.bin.need, g.bin.charge + 1); }
    else { const b = g.bots.find((x) => x.o === o); if (b) b.charge++; if (was === 1) g.lost++; }
    g.events.push({ k: "cap", n, o, was });
  }

  function pct(g, o) { let a = 0, b = 0; for (const n of g.nodes) { b += T[n.t].w; if (n.o === o) a += T[n.t].w; } return a / b; }

  // the bin: wipes every bot folder (and bot cursor) inside the blast. one per match.
  function nuke(g, x, y) {
    if (g.bin.used || g.bin.charge < g.bin.need) return 0;
    const hits = g.nodes.filter((n) => n.o >= 2 && Math.hypot(n.x - x, n.y - y) <= NUKE_R + T[n.t].r * 0.5);
    if (!hits.length) return 0;
    for (const n of hits) { n.o = 0; n.n = 0; n.held = 0; n.pop = 1; }
    g.units = g.units.filter((u) => u.o < 2 || Math.hypot(u.x - x, u.y - y) > NUKE_R);
    g.bin.used = true; g.nukeHits = hits.length; g.dirty = true; g.events.push({ k: "nuke", x, y, hits: hits.length });
    return hits.length;
  }

  function botNuke(g, b) {
    const mine = g.nodes.filter((n) => n.o === 1); if (mine.length < 2) return;
    let best = null, bs = 0;
    for (const c of mine) { const inR = mine.filter((n) => dist(n, c) <= BOT_NUKE_R); if (inR.length >= mine.length) continue; const s = inR.reduce((a, n) => a + n.n + T[n.t].w * 8, 0); if (s > bs) { bs = s; best = c; } }
    if (!best || bs < 24) return;
    b.used = true; g.warn.push({ x: best.x, y: best.y, t: 2.4, o: b.o }); g.events.push({ k: "warn", x: best.x, y: best.y, o: b.o });
  }

  function think(g, b) {
    const f = F[b.o], mine = g.nodes.filter((n) => n.o === b.o); if (!mine.length) return;
    const inc = new Map();
    for (const u of g.units) if (u.o === b.o) inc.set(u.to, (inc.get(u.to) || 0) + 1);
    for (const s of g.streams) if (s.o === b.o) inc.set(s.to, (inc.get(s.to) || 0) + s.left);
    const ready = f.ai !== "hoard" || mine.some((n) => n.n >= capOf(n) * 0.6);
    let best = null, bs = -1e9;
    if (ready) for (const t of g.nodes) {
      if (t.o === b.o) continue;
      const srcs = mine.filter((n) => n.n >= 4).sort((p, q) => dist(p, t) - dist(q, t)).slice(0, f.srcs);
      if (!srcs.length) continue;
      const d0 = dist(srcs[0], t), arm = F[t.o].armor;
      const need = (t.n + (t.o ? T[t.t].g * d0 / (UNIT_SPEED * f.speed) : 0)) * arm + 2 - (inc.get(t.i) || 0);
      if (need <= 0) continue;
      let force = 0; const use = [];
      for (const s of srcs) { use.push(s); force += Math.floor(s.n / 2); if (force >= need * f.need) break; }
      if (force < need * f.need) continue;
      const sc = T[t.t].w * 12 - need - d0 / 22 + (t.o === 1 ? f.hate : 0) + (t.o === 0 ? 3 : 0) + g.rng() * 4;
      if (sc > bs) { bs = sc; best = { t, use }; }
    }
    if (best) { for (const s of best.use) send(g, s, best.t); return; }
    // nothing worth hitting: a full folder at the back feeds the one nearest the enemy
    const foes = g.nodes.filter((n) => n.o !== b.o && n.o > 0); if (!foes.length || mine.length < 2) return;
    const near = (n) => Math.min(...foes.map((e) => dist(n, e)));
    const front = mine.reduce((a, n) => (near(n) < near(a) ? n : a)), full = mine.filter((n) => n !== front && n.n >= capOf(n) * 0.9);
    if (full.length && front.n < capOf(front) * 1.4) send(g, full[0], front);
  }

  function finish(g, won) { g.over = { won, pct: Math.round(pct(g, 1) * 100), t: g.t }; g.events.push({ k: "over", won }); }

  function step(g, dt) {
    if (g.over) return;
    g.t += dt;
    for (const n of g.nodes) {
      if (n.o) { const c = capOf(n); if (n.n < c) n.n = Math.min(c, n.n + T[n.t].g * dt * (n.o === 1 ? 1 : g.diff.grow)); n.held += dt; }
      if (n.pop > 0) n.pop = Math.max(0, n.pop - dt * 2.5); if (n.hit > 0) n.hit -= dt;
    }
    for (let i = g.streams.length - 1; i >= 0; i--) {
      const s = g.streams[i]; s.acc += dt;
      while (s.acc >= 0.05 && s.left > 0) {
        s.acc -= 0.05; s.left--;
        const a = g.nodes[s.from], b = g.nodes[s.to], L = dist(a, b) || 1, j = (g.rng() - 0.5) * 22, px = -(b.y - a.y) / L * j, py = (b.x - a.x) / L * j;
        g.units.push({ x: a.x + px, y: a.y + py, tx: b.x + px * 0.3, ty: b.y + py * 0.3, to: b.i, o: s.o, sp: UNIT_SPEED * F[s.o].speed });
      }
      if (s.left <= 0) g.streams.splice(i, 1);
    }
    for (let i = g.units.length - 1; i >= 0; i--) {
      const u = g.units[i], dx = u.tx - u.x, dy = u.ty - u.y, L = Math.hypot(dx, dy), d = u.sp * dt;
      if (L <= d + 14) {
        const n = g.nodes[u.to]; g.units.splice(i, 1);
        if (n.o === u.o) n.n += 1; else { n.n -= 1 / F[n.o].armor; n.hit = 0.12; if (n.n < 0) capture(g, n, u.o); }
      } else { u.x += dx / L * d; u.y += dy / L * d; }
    }
    for (const b of g.bots) {
      if (g.t >= b.next) { b.next = g.t + F[b.o].think * g.diff.think * (0.75 + g.rng() * 0.5); think(g, b); }
      if (g.diff.nuke && !b.used && b.charge >= 5 && g.t > 45) botNuke(g, b);
    }
    if (g.me && g.t >= g.me.next) { g.me.next = g.t + F[1].think * (0.75 + g.rng() * 0.5); think(g, g.me); if (!g.bin.used && g.bin.charge >= g.bin.need) { const e = g.nodes.filter((n) => n.o >= 2).sort((p, q) => q.n - p.n)[0]; if (e) nuke(g, e.x, e.y); } }
    for (let i = g.warn.length - 1; i >= 0; i--) {
      const w = g.warn[i]; w.t -= dt; if (w.t > 0) continue;
      g.warn.splice(i, 1); let hits = 0;
      for (const n of g.nodes) if (n.o === 1 && Math.hypot(n.x - w.x, n.y - w.y) <= BOT_NUKE_R) { n.o = 0; n.n = 0; n.held = 0; n.pop = 1; hits++; }
      g.units = g.units.filter((u) => u.o !== 1 || Math.hypot(u.x - w.x, u.y - w.y) > BOT_NUKE_R);
      g.dirty = true; g.events.push({ k: "botnuke", x: w.x, y: w.y, o: w.o, hits });
    }
    const alive = new Set(); for (const n of g.nodes) alive.add(n.o); for (const u of g.units) alive.add(u.o); for (const s of g.streams) alive.add(s.o);
    if (!alive.has(1)) finish(g, false);
    else if (![2, 3, 4, 5].some((o) => alive.has(o))) finish(g, true);
    else if (g.t >= LIMIT) { const me = pct(g, 1); finish(g, g.bots.every((b) => pct(g, b.o) < me)); }
  }

  const scoreOf = (g) => (g.over.won ? Math.round(400 + (g.level || g.wave || 3) * 100 + g.over.pct * 4 + Math.max(0, LIMIT - g.over.t) * 2) : Math.round(g.over.pct * 2));
  const starsOf = (g) => (g.over.won ? 1 + (g.over.t < 170 ? 1 : 0) + (g.over.t < 110 ? 1 : 0) : 0);

  // ---------- screen ----------
  const cv = $("cv"), cx = cv.getContext("2d");
  const FONT = '"Pixelify", ui-monospace, Menlo, Consolas, monospace'; const NUM = 'ui-monospace, "SF Mono", Menlo, Consolas, "Courier New", monospace';
  let W = 0, H = 0, DPR = 1, PX = 0, PY = 0, PW = 1, PH = 1, TB = 46, PORT = false, KR = 1, wall = null;
  let G = null, DEMO = null, state = "title", now = 0;
  let drag = null, sel = [], ptr = { x: 0, y: 0 };
  const fx = { parts: [], rings: [], floats: [], shake: 0, flash: 0, flashCol: "#fff" };
  const mascot = { mood: "idle", say: "", t: 0 };
  const TC = 40, TR = 25, tintO = new Int8Array(TC * TR), tintS = new Int8Array(TC * TR), tintA = new Float32Array(TC * TR);
  let tintAt = 0;

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    cv.width = Math.max(1, Math.round(W * DPR)); cv.height = Math.max(1, Math.round(H * DPR));
    TB = H < 480 ? 38 : 46; PORT = H > W * 1.15;
    PX = 8; PY = 34; PW = Math.max(50, W - 16); PH = Math.max(50, H - TB - PY - 22);
    KR = PORT ? Math.min(PW / WH, PH / WW) : Math.min(PW / WW, PH / WH);
    bakeWall();
  }
  const toS = (x, y) => (PORT ? [PX + (y / WH) * PW, PY + (x / WW) * PH] : [PX + (x / WW) * PW, PY + (y / WH) * PH]);
  const toW = (sx, sy) => (PORT ? [((sy - PY) / PH) * WW, ((sx - PX) / PW) * WH] : [((sx - PX) / PW) * WW, ((sy - PY) / PH) * WH]);
  const rad = (n) => Math.max(15, T[n.t].r * KR * 0.92);
  const blast = (R) => (PORT ? [R * PW / WH, R * PH / WW] : [R * PW / WW, R * PH / WH]); // a world circle is an ellipse on screen
  const binPos = () => ({ x: W - TB * 0.62, y: H - TB / 2, r: TB * 0.34 });

  function bakeWall() {
    wall = document.createElement("canvas"); wall.width = cv.width; wall.height = cv.height;
    const c = wall.getContext("2d"); c.scale(DPR, DPR);
    const gr = c.createLinearGradient(0, 0, W * 0.4, H); gr.addColorStop(0, "#1d2272"); gr.addColorStop(0.55, "#2a1d6a"); gr.addColorStop(1, "#14143c");
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    const r = mulberry(7);
    c.globalAlpha = 0.07; c.fillStyle = "#b9c2ff";
    for (let i = 0; i < 9; i++) { const x = r() * W, y = r() * H, s = 60 + r() * 160; c.beginPath(); c.moveTo(x, y); c.lineTo(x + s, y + s * 0.2); c.lineTo(x + s * 0.3, y + s); c.closePath(); c.fill(); }
    c.globalAlpha = 0.1; for (let y = 10; y < H; y += 22) for (let x = 10; x < W; x += 22) c.fillRect(x, y, 2, 2);
    c.globalAlpha = 0.06; c.fillStyle = "#000"; for (let y = 0; y < H; y += 4) c.fillRect(0, y, W, 1);
    c.globalAlpha = 1;
    const v = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75); v.addColorStop(0, "#0000"); v.addColorStop(1, "#000a");
    c.fillStyle = v; c.fillRect(0, 0, W, H);
  }

  // ---------- juice ----------
  function burst(x, y, col, n, pow) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = (0.3 + Math.random()) * (pow || 120); fx.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5 + Math.random() * 0.5, max: 1, col, sz: 2 + Math.random() * 4 }); } if (fx.parts.length > 500) fx.parts.splice(0, fx.parts.length - 500); }
  function ring(x, y, col, max, life) { fx.rings.push({ x, y, col, max, life, full: life }); }
  function floatText(x, y, s, col, big) { fx.floats.push({ x, y, s, col, life: big ? 1.6 : 1, full: big ? 1.6 : 1, big }); }
  function boom(x, y, col) {
    const [rx] = blast(NUKE_R); fx.shake = 16; fx.flash = 0.75; fx.flashCol = "#fff";
    burst(x, y, "#fff", 40, 420); burst(x, y, col, 50, 320); burst(x, y, "#e6d9b4", 30, 240);
    ring(x, y, "#fff", rx * 1.1, 0.5); ring(x, y, col, rx * 1.5, 0.8); ring(x, y, "#ffb340", rx * 0.8, 0.65);
  }
  function say(s, mood, secs) { mascot.say = s; mascot.mood = mood || "idle"; mascot.t = secs || 2.6; }

  function tickFx(dt) {
    for (let i = fx.parts.length - 1; i >= 0; i--) { const p = fx.parts[i]; p.life -= dt; if (p.life <= 0) { fx.parts.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy = p.vy * 0.94 + 260 * dt; }
    for (let i = fx.rings.length - 1; i >= 0; i--) { fx.rings[i].life -= dt; if (fx.rings[i].life <= 0) fx.rings.splice(i, 1); }
    for (let i = fx.floats.length - 1; i >= 0; i--) { const f = fx.floats[i]; f.life -= dt; f.y -= dt * 22; if (f.life <= 0) fx.floats.splice(i, 1); }
    fx.shake = Math.max(0, fx.shake - dt * 30); fx.flash = Math.max(0, fx.flash - dt * 1.8);
    if (mascot.t > 0) { mascot.t -= dt; if (mascot.t <= 0) { mascot.say = ""; mascot.mood = "idle"; } }
  }

  function tickTint(g, dt) {
    if (g.dirty || now - tintAt > 400) {
      g.dirty = false; tintAt = now;
      for (let cy = 0; cy < TR; cy++) for (let cxx = 0; cxx < TC; cxx++) {
        const x = (cxx + 0.5) * (WW / TC), y = (cy + 0.5) * (WH / TR); let o = 0, bd = 150 * 150;
        for (const n of g.nodes) { const d = (n.x - x) * (n.x - x) + (n.y - y) * (n.y - y); if (d < bd) { bd = d; o = n.o; } }
        tintO[cy * TC + cxx] = o;
      }
    }
    for (let i = 0; i < tintO.length; i++) {
      if (tintS[i] !== tintO[i]) { tintA[i] -= dt * 3; if (tintA[i] <= 0) { tintA[i] = 0; tintS[i] = tintO[i]; } }
      else if (tintA[i] < 1) tintA[i] = Math.min(1, tintA[i] + dt * (1.2 + ((i * 7) % 5) * 0.3));
    }
  }

  // ---------- drawing ----------
  function drawTint() {
    const cw = WW / TC, ch = WH / TR;
    for (let cy = 0; cy < TR; cy++) for (let c = 0; c < TC; c++) {
      const i = cy * TC + c, o = tintS[i]; if (!o || tintA[i] <= 0) continue;
      const [x0, y0] = toS(c * cw, cy * ch), [x1, y1] = toS((c + 1) * cw, (cy + 1) * ch);
      cx.globalAlpha = tintA[i] * (((c + cy) & 1) ? 0.2 : 0.26); cx.fillStyle = F[o].col; cx.fillRect(x0, y0, x1 - x0 + 0.6, y1 - y0 + 0.6);
    }
    cx.globalAlpha = 1;
  }

  function drawCracks(g) {
    cx.lineWidth = 1.6; cx.lineCap = "round";
    for (const n of g.nodes) {
      if (n.o !== 1 || n.held < 0.5) continue;
      if (!n.cr) { const r = mulberry(n.i * 977 + 13); n.cr = []; for (let k = 0; k < 6; k++) { const segs = []; for (let s = 0; s < 6; s++) segs.push([(r() - 0.5) * 1.3, 0.6 + r() * 0.8]); n.cr.push({ a: r() * 6.283, segs }); } }
      const [sx, sy] = toS(n.x, n.y), grow = Math.min(1, n.held / 30), reach = (60 + T[n.t].r * 2.2) * Math.max(0.6, KR) * grow;
      cx.strokeStyle = "#b6ff3c"; cx.globalAlpha = 0.5;
      for (const c of n.cr) {
        let x = sx, y = sy, a = c.a, left = reach; cx.beginPath(); cx.moveTo(x, y);
        for (const [da, l] of c.segs) { const d = Math.min(left, l * 18 * Math.max(0.6, KR)); if (d <= 0) break; a += da; x += Math.cos(a) * d; y += Math.sin(a) * d; left -= d; cx.lineTo(x, y); }
        cx.stroke();
      }
    }
    cx.globalAlpha = 1;
  }

  function folder(x, y, r, col, dark) {
    const w = r * 1.9, h = r * 1.4, l = x - w / 2, t = y - h / 2;
    cx.fillStyle = "#090a18"; cx.fillRect(l - 2, t - h * 0.16 - 2, w * 0.48 + 4, h * 0.3); cx.fillRect(l - 2, t - 2, w + 4, h + 4);
    cx.fillStyle = dark; cx.fillRect(l, t - h * 0.16, w * 0.48, h * 0.3); cx.fillRect(l, t, w, h);
    cx.fillStyle = col; cx.fillRect(l, t + h * 0.2, w, h * 0.8);
    cx.fillStyle = "#ffffff66"; cx.fillRect(l, t + h * 0.2, w, Math.max(1.5, r * 0.07));
    cx.fillStyle = "#00000033"; cx.fillRect(l, t + h * 0.86, w, h * 0.14);
  }

  const GLYPH = ["", "", "+", "≡", "!", "#"];
  function drawNode(g, n) {
    const [sx, sy0] = toS(n.x, n.y), r = rad(n) * (1 + n.pop * 0.35), f = F[n.o];
    const sy = sy0 - (n.o === 1 ? Math.abs(Math.sin(now / 420 + n.i)) * 1.5 : 0) + (n.hit > 0 ? 2 : 0);
    folder(sx, sy, r, n.hit > 0 ? "#fff" : f.col, f.dark);
    const fy = sy + r * 0.2;
    if (n.o === 1) { // your folders have eyes
      const e = r * 0.2, dx = Math.max(-1, Math.min(1, (ptr.x - sx) / 120)) * e * 0.3, dy = Math.max(-1, Math.min(1, (ptr.y - sy) / 120)) * e * 0.3, blink = (now + n.i * 700) % 3600 < 120;
      for (const s of [-1, 1]) { cx.fillStyle = "#10140a"; cx.fillRect(sx + s * r * 0.36 - e + dx, fy - (blink ? e * 0.15 : e) + dy, e * 2, blink ? e * 0.3 : e * 2); if (!blink) { cx.fillStyle = "#fff"; cx.fillRect(sx + s * r * 0.36 - e + dx + e * 0.3, fy - e + dy + e * 0.3, e * 0.6, e * 0.6); } }
    } else if (n.o >= 2) { cx.fillStyle = "#0b0c1ccc"; cx.font = "700 " + Math.round(r * 1.05) + "px " + FONT; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillText(GLYPH[n.o], sx, fy + r * 0.06); }
    // the count
    const fs = Math.max(11, Math.round(r * 0.62)), s = String(Math.max(0, Math.floor(n.n))), by = sy + r * 0.7 + fs * 0.75;
    cx.font = "700 " + fs + "px " + NUM; cx.textAlign = "center"; cx.textBaseline = "middle";
    const tw = cx.measureText(s).width + fs * 0.8;
    cx.fillStyle = "#090a18e6"; cx.fillRect(sx - tw / 2, by - fs * 0.62, tw, fs * 1.24);
    cx.fillStyle = n.o ? f.col : "#e8eaff"; cx.fillText(s, sx, by + 1);
    if (sel.includes(n) || (drag && drag.kind === "send" && drag.src.includes(n))) { cx.strokeStyle = "#fff"; cx.lineWidth = 2; cx.setLineDash([6, 5]); cx.lineDashOffset = -now / 40; cx.beginPath(); cx.arc(sx, sy, r * 1.5, 0, 6.283); cx.stroke(); cx.setLineDash([]); }
  }

  function drawUnits(g) {
    const s = Math.max(4, 5.5 * Math.max(0.75, KR * 1.3));
    for (const u of g.units) {
      const [x, y] = toS(u.x, u.y), [tx, ty] = toS(u.tx, u.ty), a = Math.atan2(ty - y, tx - x), c = Math.cos(a), sn = Math.sin(a);
      cx.fillStyle = F[u.o].col; cx.strokeStyle = "#090a18"; cx.lineWidth = 1;
      cx.beginPath(); cx.moveTo(x + c * s, y + sn * s); cx.lineTo(x - c * s * 0.7 - sn * s * 0.6, y - sn * s * 0.7 + c * s * 0.6); cx.lineTo(x - c * s * 0.25, y - sn * s * 0.25); cx.lineTo(x - c * s * 0.7 + sn * s * 0.6, y - sn * s * 0.7 - c * s * 0.6); cx.closePath(); cx.fill(); cx.stroke();
    }
  }

  function ellipse(x, y, rx, ry) { cx.beginPath(); cx.ellipse(x, y, Math.max(1, rx), Math.max(1, ry), 0, 0, 6.283); }

  function drawBin(x, y, r, fill, used, full) {
    const b = full && !used ? Math.abs(Math.sin(now / 180)) * 3 : 0; y -= b;
    cx.globalAlpha = used ? 0.35 : 1;
    if (full && !used) { cx.fillStyle = "#b6ff3c55"; cx.beginPath(); cx.arc(x, y, r * 1.6, 0, 6.283); cx.fill(); }
    cx.fillStyle = "#090a18"; cx.fillRect(x - r * 0.8 - 2, y - r * 0.7 - 2, r * 1.6 + 4, r * 1.7 + 4); cx.fillRect(x - r - 2, y - r - 2, r * 2 + 4, r * 0.36 + 4);
    cx.fillStyle = "#6f7694"; cx.fillRect(x - r * 0.8, y - r * 0.7, r * 1.6, r * 1.7);
    cx.fillStyle = "#b6ff3c"; const fh = r * 1.7 * Math.max(0, Math.min(1, fill)); cx.fillRect(x - r * 0.8, y + r - fh, r * 1.6, fh);
    cx.fillStyle = "#090a1855"; for (const k of [-0.4, 0, 0.4]) cx.fillRect(x + k * r - 1, y - r * 0.45, 2, r * 1.2);
    cx.fillStyle = "#c9cde6"; cx.fillRect(x - r, y - r, r * 2, r * 0.36); cx.fillRect(x - r * 0.3, y - r * 1.2, r * 0.6, r * 0.24);
    cx.globalAlpha = 1;
  }

  function drawFace(x, y, s, mood) {
    cx.fillStyle = "#090a18"; cx.fillRect(x, y, s, s); cx.fillStyle = "#cbbd92"; cx.fillRect(x + 1, y + 1, s - 2, s - 2);
    cx.fillStyle = "#10180c"; cx.fillRect(x + s * 0.12, y + s * 0.12, s * 0.76, s * 0.62);
    const c = mood === "sad" || mood === "dead" ? "#ff4d5e" : mood === "worry" ? "#ffb340" : "#b6ff3c", u = s * 0.08, ex = x + s * 0.3, ey = y + s * 0.32;
    cx.fillStyle = c;
    if (mood === "dead") { cx.font = "700 " + Math.round(s * 0.26) + "px " + FONT; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillText("x x", x + s / 2, ey + u); }
    else { const eh = mood === "smug" ? u : mood === "shock" ? u * 2.4 : u * 1.7; cx.fillRect(ex - u, ey, u * 1.6, eh); cx.fillRect(x + s * 0.7 - u * 0.6, ey, u * 1.6, eh); }
    const my = y + s * 0.58;
    if (mood === "happy" || mood === "smug") { cx.fillRect(x + s * 0.34, my, s * 0.32, u); cx.fillRect(x + s * 0.28, my - u, u, u); cx.fillRect(x + s * 0.66, my - u, u, u); }
    else if (mood === "shock") cx.fillRect(x + s * 0.43, my - u, s * 0.14, u * 2);
    else if (mood === "sad" || mood === "worry" || mood === "dead") { cx.fillRect(x + s * 0.34, my - u, s * 0.32, u); cx.fillRect(x + s * 0.28, my, u, u); cx.fillRect(x + s * 0.66, my, u, u); }
    else cx.fillRect(x + s * 0.36, my, s * 0.28, u);
    cx.fillStyle = "#a8996a"; cx.fillRect(x + s * 0.3, y + s * 0.8, s * 0.4, s * 0.08);
  }

  function drawTaskbar(g) {
    const y = H - TB; cx.fillStyle = "#090a18"; cx.fillRect(0, y - 2, W, 2); cx.fillStyle = "#e6d9b4"; cx.fillRect(0, y, W, TB); cx.fillStyle = "#fff8e0"; cx.fillRect(0, y, W, 2); cx.fillStyle = "#a8996a"; cx.fillRect(0, H - 3, W, 3);
    const fs = TB - 10; drawFace(6, y + 5, fs, g.over ? (g.over.won ? "happy" : "dead") : mascot.mood);
    const b = binPos(), x0 = fs + 14, clockW = W < 520 ? 44 : 54, x1 = b.x - b.r - 14 - clockW, bh = Math.min(20, TB - 18), by = y + (TB - bh) / 2;
    cx.fillStyle = "#090a18"; cx.fillRect(x0 - 2, by - 2, x1 - x0 + 4, bh + 4); cx.fillStyle = "#4b5075"; cx.fillRect(x0, by, x1 - x0, bh);
    let px = x0; const owners = [1, ...g.bots.map((q) => q.o)];
    for (const o of owners) { const w = pct(g, o) * (x1 - x0); if (w <= 0) continue; cx.fillStyle = F[o].col; cx.fillRect(px, by, w, bh); px += w; }
    const me = Math.round(pct(g, 1) * 100);
    cx.font = "700 " + Math.min(14, bh - 3) + "px " + NUM; cx.textBaseline = "middle"; cx.textAlign = "left"; cx.fillStyle = "#090a18"; cx.fillText(" you " + me + "%", x0 + 1, by + bh / 2 + 1);
    const left = Math.max(0, LIMIT - g.t), mm = Math.floor(left / 60), ss = String(Math.floor(left % 60)).padStart(2, "0");
    cx.textAlign = "center"; cx.font = "700 " + (W < 520 ? 13 : 15) + "px " + NUM; cx.fillStyle = left < 30 && Math.floor(now / 300) % 2 ? "#d42b2b" : "#14140f"; cx.fillText(mm + ":" + ss, x1 + 8 + clockW / 2, y + TB / 2 + 1);
    if (!(drag && drag.kind === "bin")) drawBin(b.x, b.y + 2, b.r, g.bin.used ? 0 : g.bin.charge / g.bin.need, g.bin.used, g.bin.charge >= g.bin.need);
    if (mascot.say && !g.demo) { // speech bubble over the taskbar
      let f = 14; cx.textAlign = "left"; do { cx.font = "600 " + f + "px " + FONT; } while (cx.measureText(mascot.say).width > W - 30 && --f > 9);
      const tw = cx.measureText(mascot.say).width, bx = 8, bby = y - f - 20;
      cx.fillStyle = "#090a18"; cx.fillRect(bx - 2, bby - 2, tw + 20, f + 16); cx.fillStyle = "#fff8e0"; cx.fillRect(bx, bby, tw + 16, f + 12);
      cx.fillStyle = "#090a18"; cx.fillRect(bx + 10, bby + f + 12, 8, 6); cx.fillStyle = "#14140f"; cx.fillText(mascot.say, bx + 8, bby + (f + 12) / 2 + 1);
    }
  }

  function label(s, x, y, size, col, align) { cx.font = "700 " + size + "px " + FONT; cx.textAlign = align || "center"; cx.textBaseline = "middle"; cx.lineJoin = "round"; cx.lineWidth = Math.max(3, size * 0.28); cx.strokeStyle = "#090a18"; cx.strokeText(s, x, y); cx.fillStyle = col; cx.fillText(s, x, y); }

  function draw() {
    const g = G || DEMO;
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (fx.shake > 0) cx.translate((Math.random() - 0.5) * fx.shake, (Math.random() - 0.5) * fx.shake);
    cx.drawImage(wall, -10, -10, W + 20, H + 20);
    if (!g) return;
    drawTint(); drawCracks(g);
    for (const w of g.warn) { // a bot's bin is coming down
      const [x, y] = toS(w.x, w.y), [rx, ry] = blast(BOT_NUKE_R), p = 0.5 + 0.5 * Math.sin(now / 70);
      cx.fillStyle = F[w.o].col; cx.globalAlpha = 0.14 + p * 0.12; ellipse(x, y, rx, ry); cx.fill(); cx.globalAlpha = 1;
      cx.strokeStyle = F[w.o].col; cx.lineWidth = 3; cx.setLineDash([10, 7]); cx.lineDashOffset = now / 30; ellipse(x, y, rx, ry); cx.stroke(); cx.setLineDash([]);
      label("incoming! " + Math.max(0, w.t).toFixed(1), x, y - ry - 12, 15, "#fff");
    }
    if (drag && drag.kind === "send") { // where the cursors will go
      const t = hitNode(g, ptr.x, ptr.y, false);
      cx.strokeStyle = "#b6ff3c"; cx.lineWidth = 3; cx.setLineDash([8, 6]); cx.lineDashOffset = -now / 30;
      for (const s of drag.src) { if (s === t && drag.src.length === 1) continue; const [x, y] = toS(s.x, s.y); let ex = ptr.x, ey = ptr.y; if (t && !drag.src.includes(t)) [ex, ey] = toS(t.x, t.y); cx.beginPath(); cx.moveTo(x, y); cx.lineTo(ex, ey); cx.stroke(); }
      cx.setLineDash([]);
      if (t && !drag.src.includes(t)) { const [x, y] = toS(t.x, t.y); cx.strokeStyle = "#fff"; cx.lineWidth = 3; cx.beginPath(); cx.arc(x, y, rad(t) * 1.55, 0, 6.283); cx.stroke(); }
    }
    for (const n of g.nodes) drawNode(g, n);
    drawUnits(g);
    for (const r of fx.rings) { const k = 1 - r.life / r.full; cx.globalAlpha = 1 - k; cx.strokeStyle = r.col; cx.lineWidth = 5 * (1 - k) + 1; cx.beginPath(); cx.arc(r.x, r.y, r.max * k, 0, 6.283); cx.stroke(); }
    for (const p of fx.parts) { cx.globalAlpha = Math.min(1, p.life * 2); cx.fillStyle = p.col; cx.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz); }
    cx.globalAlpha = 1;
    for (const f of fx.floats) { cx.globalAlpha = Math.min(1, f.life * 2); label(f.s, Math.max(60, Math.min(W - 60, f.x)), f.y, f.big ? Math.max(22, Math.min(40, W / 14)) : 14, f.col); }
    cx.globalAlpha = 1;
    drawTaskbar(g);
    if (drag && drag.kind === "bin") { // aiming the bin
      const [rx, ry] = blast(NUKE_R), [wx, wy] = toW(ptr.x, ptr.y), n = g.nodes.filter((q) => q.o >= 2 && Math.hypot(q.x - wx, q.y - wy) <= NUKE_R + T[q.t].r * 0.5);
      cx.fillStyle = n.length ? "#b6ff3c" : "#ffffff"; cx.globalAlpha = 0.16; ellipse(ptr.x, ptr.y, rx, ry); cx.fill(); cx.globalAlpha = 1;
      cx.strokeStyle = n.length ? "#b6ff3c" : "#ffffffaa"; cx.lineWidth = 3; cx.setLineDash([10, 7]); cx.lineDashOffset = -now / 30; ellipse(ptr.x, ptr.y, rx, ry); cx.stroke(); cx.setLineDash([]);
      for (const q of n) { const [x, y] = toS(q.x, q.y); cx.strokeStyle = "#fff"; cx.lineWidth = 3; cx.beginPath(); cx.arc(x, y, rad(q) * 1.5, 0, 6.283); cx.stroke(); }
      drawBin(ptr.x, ptr.y, binPos().r * 1.2, 1, false, false);
      label(n.length ? "let go: wipes " + n.length : "drag onto their folders", ptr.x, Math.max(16, ptr.y - ry - 14), 14, "#fff");
    }
    if (g === G && state === "play" && !g.over) drawHints(g);
    if (g === G && g.name) { cx.font = "600 13px " + FONT; cx.textAlign = "left"; cx.textBaseline = "middle"; cx.fillStyle = "#ffffffb0"; cx.fillText(g.name + (TEST ? "  · test" : ""), 50, 20); }
    if (fx.flash > 0) { cx.globalAlpha = Math.min(1, fx.flash); cx.fillStyle = fx.flashCol; cx.fillRect(-20, -20, W + 40, H + 40); cx.globalAlpha = 1; }
  }

  function drawHints(g) {
    const b = binPos();
    if (g.bin.charge >= g.bin.need && !g.bin.used && !drag) label("bin's full! drag it onto them ▶", b.x - b.r - 10, H - TB - 14, W < 520 ? 13 : 15, "#b6ff3c", "right");
    if (g.coach && g.sent === 0 && !drag) { // level 1: a hand shows the first drag
      const a = g.nodes.find((n) => n.o === 1); if (!a) return;
      const t = g.nodes.filter((n) => n.o !== 1).sort((p, q) => dist(p, a) - dist(q, a))[0], k = (now % 1800) / 1800, e = Math.min(1, k * 1.5);
      const [ax, ay] = toS(a.x, a.y), [tx, ty] = toS(t.x, t.y), x = ax + (tx - ax) * e, y = ay + (ty - ay) * e;
      cx.strokeStyle = "#ffffffaa"; cx.lineWidth = 3; cx.setLineDash([8, 6]); cx.beginPath(); cx.moveTo(ax, ay); cx.lineTo(x, y); cx.stroke(); cx.setLineDash([]);
      cx.fillStyle = "#fff"; cx.strokeStyle = "#090a18"; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x, y + 22); cx.lineTo(x + 6, y + 17); cx.lineTo(x + 10, y + 26); cx.lineTo(x + 14, y + 24); cx.lineTo(x + 10, y + 15); cx.lineTo(x + 17, y + 15); cx.closePath(); cx.fill(); cx.stroke();
      label("drag from your folder to another one", W / 2, PORT ? PY + 4 : H - TB - 40, Math.max(13, Math.min(18, W / 24)), "#fff");
    }
  }

  // ---------- save ----------
  const KEY = "dt-save", URL_ = "https://computercooked.com/games/desktop-takeover/";
  const fresh = () => ({ v: 1, stars: [0, 0, 0, 0, 0], unlocked: 1, bestEndless: 0, daily: null, streak: { last: "", n: 0, best: 0 }, coach: false });
  let S = fresh();
  try { if (!(TEST && flag("reset"))) { const j = JSON.parse(localStorage.getItem(KEY) || "null"); if (j && j.v === 1) S = Object.assign(fresh(), j); } } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  const today = () => new Date().toISOString().slice(0, 10), yesterday = () => new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const untilTomorrow = () => { const d = new Date(), m = Math.ceil(((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - d) / 6e4)); return Math.floor(m / 60) + "h " + (m % 60) + "m"; };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clock = (t) => Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0");
  let run = { wave: 1, score: 0 }, warned = false;

  // ---------- input ----------
  function hitNode(g, sx, sy, own) {
    let best = null, bd = 1e9;
    for (const n of g.nodes) { if (own && n.o !== 1) continue; const [x, y] = toS(n.x, n.y), d = Math.hypot(x - sx, y - sy); if (d < Math.max(rad(n) * 1.5, 30) && d < bd) { bd = d; best = n; } }
    return best;
  }
  const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  function doSend(srcs, t) {
    let n = 0; for (const s of srcs) if (s.o === 1 && s !== t) n += send(G, s, t);
    if (n) { play("send"); const [x, y] = toS(t.x, t.y); ring(x, y, "#b6ff3c", rad(t) * 2, 0.35); if (G.coach) { G.coach = false; S.coach = true; save(); say("yes. like that. now take the rest.", "happy", 3); } }
    else if (srcs.length) say("that folder needs 2 cursors to send.", "worry", 2);
  }
  cv.addEventListener("pointerdown", (e) => {
    ptr = pos(e); if (state !== "play" || !G || G.over || G.auto) return;
    e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    const b = binPos();
    if (!G.bin.used && G.bin.charge >= G.bin.need && Math.hypot(ptr.x - b.x, ptr.y - b.y) < Math.max(32, b.r * 2)) { drag = { kind: "bin" }; return; }
    const n = hitNode(G, ptr.x, ptr.y, false);
    if (n && n.o === 1) drag = { kind: "send", src: [n], first: n, moved: false, x0: ptr.x, y0: ptr.y };
    else if (n && sel.length) { doSend(sel, n); sel = []; }
    else sel = [];
  });
  cv.addEventListener("pointermove", (e) => {
    ptr = pos(e); if (!drag || drag.kind !== "send" || !G) return;
    if (Math.hypot(ptr.x - drag.x0, ptr.y - drag.y0) > 9) drag.moved = true;
    const n = hitNode(G, ptr.x, ptr.y, true); if (n && drag.moved && !drag.src.includes(n)) drag.src.push(n);
  });
  function release(e) {
    if (e) ptr = pos(e); const d = drag; drag = null; if (!d || !G || G.over) return;
    if (d.kind === "bin") {
      if (ptr.y > H - TB) return; // dropped back on the taskbar
      const [wx, wy] = toW(ptr.x, ptr.y); if (!nuke(G, wx, wy)) say("nothing of theirs under it. drag it onto THEIR folders.", "worry", 3);
      return;
    }
    const t = hitNode(G, ptr.x, ptr.y, false);
    if (!d.moved) { // a tap: select, then tap where to send
      if (sel.length && !sel.includes(d.first)) { doSend(sel, d.first); sel = []; } else sel = sel.includes(d.first) ? [] : [d.first];
      return;
    }
    sel = []; if (t && !(d.src.length === 1 && t === d.src[0])) doSend(d.src.filter((s) => s !== t), t);
  }
  cv.addEventListener("pointerup", release);
  cv.addEventListener("pointercancel", () => { drag = null; });
  cv.addEventListener("contextmenu", (e) => e.preventDefault());

  // ---------- what the sim reports -> what you see ----------
  const INTRO = ["that slow one is do_not_delete. grab the empty folders first.", "click here!! never stops clicking. don't click back.", "virus nanny thinks YOU are the virus. she's fast.", "stuff i saved hoards, then dumps it all at once.", "everyone at once. you're in the middle. good luck."];
  function present(g) {
    for (const e of g.events) {
      if (e.k === "cap") {
        const [x, y] = toS(e.n.x, e.n.y); burst(x, y, F[e.o].col, 16, 150); ring(x, y, F[e.o].col, rad(e.n) * 2.6, 0.45);
        if (g.demo || g.auto) continue;
        if (e.o === 1) { play("capture"); if (g.bin.charge === g.bin.need && !g.bin.used && !g.binSaid) { g.binSaid = true; say("the bin is full. drag it onto their folders. once.", "smug", 4.5); } else if (Math.random() < 0.45) say(pick(["mine now.", "nice folder. ours.", "drag. take. repeat.", "the wallpaper likes you.", "ours ours ours."]), "happy", 1.8); }
        else if (e.was === 1) { play("lost"); fx.shake = Math.max(fx.shake, 5); say(pick(["hey! that was ours.", F[e.o].name + " took one. take it back.", "rude."]), "worry", 2); }
      } else if (e.k === "nuke") {
        const [x, y] = toS(e.x, e.y); boom(x, y, "#b6ff3c"); floatText(x, y - 20, "WIPED ×" + e.hits, "#b6ff3c", true); play("nuke");
        if (!g.demo && !g.auto) { say("emptied. the. bin.", "smug", 3); ev("dt_nuke_used", { mode: g.mode, level: g.level || g.wave || 0, hits: e.hits }); if (e.hits >= 3) sdk((c) => c.achieve && c.achieve("bin_day")); }
      } else if (e.k === "warn") { play("warn"); if (!g.demo) say(F[e.o].name + " is emptying its bin on you. send your cursors out!", "shock", 2.4); }
      else if (e.k === "botnuke") { const [x, y] = toS(e.x, e.y); boom(x, y, F[e.o].col); floatText(x, y - 20, "BINNED", F[e.o].col, true); play("nuke"); if (!g.demo) say("ow. that was " + e.hits + " of ours.", "sad", 2.6); }
      else if (e.k === "over" && g === G && state === "play") endMatch();
    }
    g.events.length = 0;
    if (g !== G || state !== "play" || g.over) return;
    if (!warned && g.t > LIMIT - 30) { warned = true; say("30 seconds. biggest share of the desktop wins.", "worry", 3.5); }
    if (!mascot.say) { const p = pct(g, 1); mascot.mood = p > 0.6 ? "happy" : p < 0.15 ? "worry" : "idle"; }
  }

  // ---------- flow ----------
  function clearScreen() { sel = []; drag = null; fx.parts.length = fx.rings.length = fx.floats.length = 0; fx.shake = fx.flash = 0; tintS.fill(0); tintA.fill(0); mascot.say = ""; mascot.t = 0; mascot.mood = "idle"; warned = false; }
  function start(mode, o) {
    o = o || {}; clearScreen();
    if (mode === "endless" && !o.keep) run = { wave: 1, score: 0 };
    G = newMatch(mode, mode === "campaign" ? { level: o.level } : mode === "daily" ? { date: o.date || today() } : { wave: run.wave });
    G.coach = mode === "campaign" && G.level === 1 && !S.coach && !(TEST && flag("nuke"));
    if (TEST && flag("nuke")) G.bin.charge = G.bin.need;
    DEMO = null; state = "play"; $("title").hidden = true; $("end").hidden = true; $("menu").hidden = false;
    sdk((c) => c.start && c.start()); ev("dt_start", { mode, level: G.level || G.wave || 0 }); if (mode === "daily") ev("dt_daily_start", { date: G.date });
    say(mode === "campaign" ? INTRO[G.level - 1] : mode === "daily" ? "today's desktop. same one for everybody." : "new desktop. same plan: all of it.", "idle", 4);
  }

  function endMatch() {
    const g = G, o = g.over, sc = scoreOf(g); let total = sc; g.stars = 0; g.firstDaily = false;
    if (g.mode === "campaign") { g.stars = starsOf(g); if (o.won) { S.stars[g.level - 1] = Math.max(S.stars[g.level - 1], g.stars); S.unlocked = Math.max(S.unlocked, Math.min(5, g.level + 1)); if (g.level === 5) sdk((c) => c.achieve && c.achieve("whole_desktop")); } }
    else if (g.mode === "endless") { run.score += sc; total = run.score; if (o.won) S.bestEndless = Math.max(S.bestEndless, run.wave); }
    else if (g.mode === "daily") {
      if (g.date === today()) {
        if (!S.daily || S.daily.date !== g.date) { g.firstDaily = true; const st = S.streak; st.n = st.last === yesterday() ? st.n + 1 : 1; st.last = g.date; st.best = Math.max(st.best, st.n); S.daily = { date: g.date, pct: o.pct, won: o.won }; }
        else if (o.pct > S.daily.pct) S.daily = { date: g.date, pct: o.pct, won: o.won || S.daily.won };
      }
      ev("dt_daily_finish", { date: g.date, pct: o.pct, won: o.won ? 1 : 0, streak: S.streak.n });
    }
    g.total = total; save();
    ev(o.won ? "dt_level_win" : "dt_level_lose", { mode: g.mode, level: g.level || g.wave || 0, pct: o.pct, secs: Math.round(o.t), stars: g.stars });
    sdk((c) => c.end && c.end({ score: total, durationMs: Math.round(o.t * 1000), completed: !!o.won }));
    if (o.won) { sdk((c) => c.achieve && c.achieve("first_takeover")); if (o.pct >= 100) sdk((c) => c.achieve && c.achieve("clean_sweep")); }
    play(o.won ? "win" : "lose"); say(o.won ? "the desktop is ours." : "they deleted us. again?", o.won ? "happy" : "dead", 6);
    if (o.won) for (let i = 0; i < 5; i++) setTimeout(() => burst(W * (0.15 + Math.random() * 0.7), H * (0.2 + Math.random() * 0.4), pick(["#b6ff3c", "#fff", "#e6d9b4"]), 26, 260), i * 160);
    else { fx.flash = 0.5; fx.flashCol = "#d42b2b"; fx.shake = 10; }
    state = "end"; $("menu").hidden = true; setTimeout(() => { if (G === g && state === "end") showEnd(g); }, 1200);
  }

  // ---------- share card ----------
  function card(g) {
    const c = document.createElement("canvas"); c.width = 1200; c.height = 630; const x = c.getContext("2d"), o = g.over;
    const gr = x.createLinearGradient(0, 0, 500, 630); gr.addColorStop(0, "#1d2272"); gr.addColorStop(1, "#14143c"); x.fillStyle = gr; x.fillRect(0, 0, 1200, 630);
    x.globalAlpha = 0.1; x.fillStyle = "#b9c2ff"; for (let yy = 14; yy < 630; yy += 26) for (let xx = 14; xx < 1200; xx += 26) x.fillRect(xx, yy, 3, 3); x.globalAlpha = 1;
    // the desktop as you left it
    const mx = 640, my = 96, mw = 500, mh = 310; x.fillStyle = "#090a18"; x.fillRect(mx - 8, my - 8, mw + 16, mh + 16); x.fillStyle = "#23286e"; x.fillRect(mx, my, mw, mh);
    for (const n of g.nodes) { const px = mx + n.x / WW * mw, py = my + n.y / WH * mh, r = 16 + n.t * 5; x.globalAlpha = 0.28; x.fillStyle = F[n.o].col; if (n.o) x.fillRect(px - r * 2.4, py - r * 2, r * 4.8, r * 4); x.globalAlpha = 1; }
    x.save(); x.beginPath(); x.rect(mx, my, mw, mh); x.clip();
    for (const n of g.nodes) { const px = mx + n.x / WW * mw, py = my + n.y / WH * mh, r = 16 + n.t * 5; x.fillStyle = "#090a18"; x.fillRect(px - r - 3, py - r * 0.9 - 3, r * 0.9 + 6, r * 0.5); x.fillRect(px - r - 3, py - r * 0.7 - 3, r * 2 + 6, r * 1.4 + 6); x.fillStyle = F[n.o].dark; x.fillRect(px - r, py - r * 0.9, r * 0.9, r * 0.4); x.fillStyle = F[n.o].col; x.fillRect(px - r, py - r * 0.7, r * 2, r * 1.4); }
    x.restore(); x.fillStyle = "#e6d9b4"; x.fillRect(mx, my + mh - 26, mw, 26); x.fillStyle = "#b6ff3c"; x.fillRect(mx + 6, my + mh - 20, (mw - 12) * o.pct / 100, 14);
    x.textBaseline = "alphabetic"; x.textAlign = "left"; x.fillStyle = "#f4f4ff"; x.font = "700 62px " + FONT; x.fillText(o.won ? "I took over" : "I only took over", 60, 170);
    x.fillStyle = o.won ? "#b6ff3c" : "#ff4d5e"; x.font = "700 230px " + FONT; x.fillText(o.pct + "%", 50, 380);
    x.fillStyle = "#f4f4ff"; x.font = "700 62px " + FONT; x.fillText("of the desktop", 60, 460);
    x.fillStyle = "#b9c2ff"; x.font = "600 30px " + FONT; x.fillText((g.mode === "daily" ? "daily desktop " + g.date : g.mode === "endless" ? "endless · desktop #" + (g.wave || 1) : "level " + g.level + " · " + g.name) + (o.won ? " · " + clock(o.t) : ""), 640, 470);
    x.fillStyle = "#e6d9b4"; x.fillRect(0, 540, 1200, 90); x.fillStyle = "#14140f"; x.font = "700 40px " + FONT; x.fillText("desktop takeover", 60, 598); x.textAlign = "right"; x.font = "600 32px " + FONT; x.fillText("computercooked.com", 1140, 596);
    return c;
  }
  function note(s) { const n = $("eNote"); if (!n || !s) return; n.textContent = s; n.classList.remove("flash"); void n.offsetWidth; n.classList.add("flash"); }
  async function share(g) {
    const o = g.over, text = g.mode === "daily" ? `i took over ${o.pct}% of today's desktop. beat that:` : o.won ? `i took over ${o.pct}% of the desktop. beat that:` : `the bots deleted me at ${o.pct}% of the desktop. do better:`;
    let how = "copy", copied = false, blob = null;
    try { blob = await new Promise((r) => card(g).toBlob(r, "image/png")); } catch (e) {}
    const file = blob && new File([blob], "desktop-takeover.png", { type: "image/png" });
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], text: text + " " + URL_ }); how = "share"; } catch (e) { how = e && e.name === "AbortError" ? "cancel" : "copy"; }
    }
    if (how === "copy") { // no share sheet here: save the picture and copy a challenge line
      if (blob) { try { how = "download"; const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "desktop-takeover.png"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); } catch (e) { how = "copy"; } }
      try { await navigator.clipboard.writeText(text + " " + URL_); copied = true; } catch (e) {}
    }
    note(how === "download" ? (copied ? "saved the picture + copied a challenge link ✓" : "saved the picture ✓") : how === "share" ? "shared ✓" : how === "cancel" ? "" : copied ? "copied a challenge link ✓" : "couldn't share from here. screenshot it?");
    ev("dt_share", { how, mode: g.mode, pct: o.pct });
  }

  // ---------- panels ----------
  function showEnd(g) {
    const o = g.over, won = o.won, camp = g.mode === "campaign";
    const next = camp ? (won ? (g.level < 5 ? "next level ▶" : "play endless ▶") : "try again") : g.mode === "endless" ? (won ? "next desktop ▶" : "new run") : "play it again";
    const line = camp ? `level ${g.level} · ${g.name} · ${clock(o.t)}` : g.mode === "endless" ? `desktop #${g.wave} · run score ${g.total}` : `daily desktop ${g.date}` + (S.streak.n && g.date === today() ? ` · streak <b>${S.streak.n}</b> day${S.streak.n > 1 ? "s" : ""}` : "");
    $("endTb").textContent = won ? "takeover_complete.txt" : "deleted.txt";
    $("endIn").innerHTML = `<h2 class="${won ? "" : "lost"}">${won ? `you took over <em>${o.pct}%</em>` : `<em>deleted.</em> you held ${o.pct}%`}</h2>
      ${camp && won ? `<div class="stars">${"★".repeat(g.stars)}<s>${"★".repeat(3 - g.stars)}</s></div>` : ""}
      <p>${line}</p>${g.mode === "daily" ? `<p class="small">new desktop in ${untilTomorrow()}</p>` : camp && won && g.stars < 3 ? `<p class="small">win faster for more stars</p>` : ""}
      <img class="share" id="eImg" alt="share card: i took over ${o.pct}% of the desktop">
      <div class="row"><button class="btn go big" id="eNext" type="button">${next}</button><button class="btn big" id="eShare" type="button">share</button></div>
      <div class="row" style="margin-top:6px">${won || g.mode === "daily" ? (g.mode === "daily" ? "" : `<button class="btn" id="eAgain" type="button">replay</button>`) : ""}<button class="btn" id="eMenu" type="button">menu</button></div>
      <p class="note" id="eNote" role="status" aria-live="polite"></p><div id="tipSlot"></div>`;
    try { $("eImg").src = card(g).toDataURL("image/png"); } catch (e) {}
    $("eNext").onclick = () => { if (camp) { if (won && g.level === 5) start("endless"); else start("campaign", { level: won ? g.level + 1 : g.level }); } else if (g.mode === "endless") { if (won) { run.wave++; start("endless", { keep: true }); } else start("endless"); } else start("daily", { date: g.date }); };
    $("eShare").onclick = () => share(g);
    if ($("eAgain")) $("eAgain").onclick = () => (camp ? start("campaign", { level: g.level }) : start("endless"));
    $("eMenu").onclick = showTitle;
    $("end").hidden = false; $("end").scrollTop = 0;
    try { if (window.ccTip) window.ccTip.mount($("tipSlot"), { game: "desktop-takeover", slot: "game-over" }); } catch (e) {}
  }

  function showTitle() {
    state = "title"; G = null; clearScreen(); $("end").hidden = true; $("menu").hidden = true;
    DEMO = newMatch("demo", { auto: true, demo: true, wave: 4 });
    const d = S.daily && S.daily.date === today() ? S.daily : null, st = S.streak, live = st.n && (st.last === today() || st.last === yesterday()), nextL = Math.min(5, S.unlocked);
    $("titleIn").innerHTML = `<h1>desktop takeover</h1><p class="hide-short">you're a rogue folder. drag from your folders to send cursors. take the whole desktop.</p>
      <div class="lab">campaign</div><div class="lv">${LEVELS.map((l, i) => `<button class="btn${i + 1 === nextL && !S.stars[i] ? " go" : ""}" type="button" data-l="${i + 1}" ${i + 1 > S.unlocked ? "disabled" : ""} aria-label="level ${i + 1}: ${l.name}">${i + 1}<small>${i + 1 > S.unlocked ? "locked" : S.stars[i] ? "★".repeat(S.stars[i]) : "·"}</small></button>`).join("")}</div>
      <div class="modes"><button class="btn" id="tEndless" type="button">endless<small>${S.bestEndless ? "best: desktop #" + S.bestEndless : "random desktops"}</small></button><button class="btn" id="tDaily" type="button">daily desktop<small>${d ? "today: " + d.pct + "% ✓" : "new today"}</small></button></div>
      ${live ? `<p class="small">daily streak <b>${st.n}</b> day${st.n > 1 ? "s" : ""}${!d ? ` · <span class="risk">play today to keep it</span>` : ""}</p>` : ""}`;
    for (const b of $("titleIn").querySelectorAll("[data-l]")) b.onclick = () => start("campaign", { level: +b.dataset.l });
    $("tEndless").onclick = () => start("endless"); $("tDaily").onclick = () => start("daily");
    $("title").hidden = false;
  }
  $("menu").onclick = () => { if (state === "play") { ev("dt_quit", { mode: G.mode, secs: Math.round(G.t) }); showTitle(); } };

  // ---------- loop ----------
  const STEP = 1 / 30; let last = 0, acc = 0;
  function frame(t) {
    now = t; const dt = Math.min(0.1, (t - last) / 1000 || 0); last = t; const g = G || DEMO;
    if (g) {
      acc += dt; while (acc >= STEP) { step(g, STEP); acc -= STEP; }
      present(g); tickTint(g, dt);
      if (g === DEMO && g.over) { g.overT = (g.overT || 0) + dt; if (g.overT > 2.5) { tintS.fill(0); tintA.fill(0); DEMO = newMatch("demo", { auto: true, demo: true, wave: 4 }); } }
    }
    tickFx(dt); draw(); requestAnimationFrame(frame);
  }

  // ---------- boot + test links ----------
  addEventListener("resize", resize); resize();
  const headless = (mode, o, runs) => { let wins = 0, tt = 0, pp = 0; for (let i = 0; i < runs; i++) { const g = newMatch(mode, Object.assign({ auto: true, salt: i * 7919, seed: i * 104729 + 1 }, o)); while (!g.over) { step(g, STEP); g.events.length = 0; } if (g.over.won) wins++; tt += g.over.t; pp += g.over.pct; } return { wins, runs, avgT: Math.round(tt / runs), avgPct: Math.round(pp / runs) }; };
  if (TEST) window.__dt = {
    state: () => ({ state, mode: G && G.mode, level: G && G.level, t: G && G.t, over: G && G.over, pct: G ? Math.round(pct(G, 1) * 100) : 0, units: G ? G.units.length : 0, bin: G ? Object.assign({ charge: G.bin.charge, need: G.bin.need, used: G.bin.used }, binPos()) : null, nodes: G ? G.nodes.map((n) => { const [sx, sy] = toS(n.x, n.y); return { i: n.i, o: n.o, n: Math.floor(n.n), sx, sy }; }) : [] }),
    win: () => { if (G) { for (const n of G.nodes) if (n.o >= 2) n.o = 1; G.units = G.units.filter((u) => u.o === 1); G.streams = G.streams.filter((s) => s.o === 1); } },
    lose: () => { if (G) { const b = G.bots[0].o; for (const n of G.nodes) if (n.o === 1) n.o = b; G.units = G.units.filter((u) => u.o !== 1); G.streams = G.streams.filter((s) => s.o !== 1); } },
    auto: (v) => { if (G) { G.auto = v !== false; G.me = G.auto ? { o: 1, next: 0, charge: 0, used: true } : null; } },
    skip: (secs) => { if (G) for (let i = 0; i < secs * 30 && !G.over; i++) step(G, STEP); },
    sim: (level, runs) => headless("campaign", { level }, runs || 20), simEndless: (wave, runs) => headless("endless", { wave }, runs || 20),
  };
  const lv = parseInt(param("level"), 10), dq = param("daily");
  if (SHOT) { // the cover scene
    $("title").hidden = true; G = newMatch("campaign", { level: 5, auto: true, salt: 3 }); G.name = ""; for (let i = 0; i < 30 * 21; i++) { step(G, STEP); G.events.length = 0; } for (let i = 0; i < 90; i++) tickTint(G, 0.1); state = "shot";
  } else if (TEST && flag("win")) { // end card fixture
    $("title").hidden = true; G = newMatch("campaign", { level: 3 }); G.nodes.forEach((n, i) => { n.o = i === 3 ? 0 : 1; n.n = 12 + i; n.held = 40; }); G.bots = []; G.over = { won: true, pct: 87, t: 142 }; G.stars = 2; G.total = 1244; state = "end"; showEnd(G);
  } else if (TEST && dq && /^\d{4}-\d\d-\d\d$/.test(dq)) start("daily", { date: dq });
  else if (TEST && (lv >= 1 && lv <= 5 || flag("nuke"))) start("campaign", { level: lv >= 1 && lv <= 5 ? lv : 1 });
  else showTitle();
  requestAnimationFrame(frame);
})();
