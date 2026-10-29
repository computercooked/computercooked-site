/* cooked sweeper: rules, board generation and the seeded rng. No DOM, so a headless bot can run it (window.CS or module.exports). */
(function (root) {
  "use strict";

  // ---------- seeded rng ----------
  function hashStr(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- the viruses ----------
  // p = power: the hp a fight costs and the xp it pays. KERNEL PANIC is the boss: beat it to win.
  const VIRUSES = {
    1: { id: "popup", name: "popup", quips: ["popup: you won a free ipad! (1 hp)", "popup: hot singles in your ram", "popup: click here to close (it was a lie)"] },
    2: { id: "adware", name: "adware", quips: ["adware: this hit was sponsored", "adware: skip ad in 2 hp", "adware: have you tried toolbar?"] },
    3: { id: "worm", name: "worm", quips: ["worm: wriggled 3 hp out of you", "worm: i brought friends", "worm: squish. ow."] },
    4: { id: "keylogger", name: "keylogger", quips: ["keylogger: saw you type that", "keylogger: your password is password", "keylogger: 4 hp, logged"] },
    5: { id: "trojan", name: "trojan", quips: ["trojan: free_game.exe was not free", "trojan: surprise! (5 hp)", "trojan: i come bearing gifts"] },
    6: { id: "spyware", name: "spyware", quips: ["spyware: watching. always watching.", "spyware: nice browser history", "spyware: smile for the webcam"] },
    7: { id: "rootkit", name: "rootkit", quips: ["rootkit: i live in your walls now", "rootkit: admin access, thanks", "rootkit: you can't uninstall me"] },
    8: { id: "ransomware", name: "ransomware", quips: ["ransomware: pay 8 hp or else", "ransomware: your files are mine", "ransomware: accepts hp only"] },
    9: { id: "botnet", name: "botnet", quips: ["botnet: 9000 of us. all you.", "botnet: we are legion (9 hp)", "botnet: ddos-ing your face"] },
    13: { id: "kernel", name: "KERNEL PANIC", quips: ["KERNEL PANIC: fatal exception 0E at C00C:ED", "KERNEL PANIC: the computer is cooked"] },
  };
  const BOSS = 13;
  // how many of each power (1..9) per 100 tiles; scaled to the board, the boss is always 1
  const MIX = [7, 6, 5, 4, 3, 2, 2, 1, 1];
  const START_HP = 5;
  const RAM_HEAL = 3;
  // level n -> n+1 costs n + 2 xp (3, 4, 5 ...); each level is a full heal and +1 max hp
  const cost = (level) => level + 2;

  function mixFor(cells) {
    const k = cells / 100;
    return MIX.map((n, i) => Math.max(i >= 6 ? 1 : 0, Math.round(n * k)));
  }

  function nbrs(run, i) {
    const out = [], x = i % run.cols, y = (i / run.cols) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < run.cols && ny < run.rows) out.push(ny * run.cols + nx);
    }
    return out;
  }

  function newRun(o) {
    const cols = o.cols, rows = o.rows, n = cols * rows;
    const cells = [];
    for (let i = 0; i < n; i++) cells.push({ v: 0, open: false, dead: false, drop: null, flag: null, n: 0, seen: false });
    return {
      cols, rows, cells, seed: String(o.seed), daily: !!o.daily, placed: false, start: -1,
      hp: START_HP, max: START_HP, level: 1, xp: 0, xpTotal: 0, killed: 0, viruses: 0, opened: 0, safe: 0,
      over: false, won: false, ramUsed: 0, scansUsed: 0, cause: null,
    };
  }

  // Viruses come in infected sectors: a few hot spots, with the strong ones packed near the boss.
  // That leaves clean memory between them, so taps cascade, and the sums near a cluster get tactical.
  function generate(run, safe) {
    const { cols, rows } = run, n = cols * rows;
    const rnd = mulberry32(hashStr(run.seed + "|" + cols + "x" + rows));
    const dist = (a, b) => Math.hypot((a % cols) - (b % cols), ((a / cols) | 0) - ((b / cols) | 0));
    let tries = 0;
    for (;;) {
      tries++;
      const banned = new Set([safe, ...nbrs(run, safe)]);
      // a second ring stays clean too, so the first tap always opens a patch (never a forced guess)
      for (const j of nbrs(run, safe)) for (const k of nbrs(run, j)) if (rnd() < 0.55) banned.add(k);
      // the boss sits far from the first tap
      const far = [];
      for (let i = 0; i < n; i++) if (!banned.has(i) && dist(i, safe) >= Math.max(cols, rows) * 0.55) far.push(i);
      const boss = far.length ? far[(rnd() * far.length) | 0] : ((safe + (n >> 1)) % n);
      const hubs = [boss];
      for (let h = 0; h < 3; h++) {
        let best = -1, bd = -1;
        for (let t = 0; t < 12; t++) {
          const c = (rnd() * n) | 0;
          if (banned.has(c)) continue;
          const d = Math.min(...hubs.map((q) => dist(q, c))) + rnd();
          if (d > bd) { bd = d; best = c; }
        }
        if (best >= 0) hubs.push(best);
      }
      const v = new Array(n).fill(0);
      v[boss] = BOSS;
      const mix = mixFor(n);
      const order = [];
      for (let p = 9; p >= 1; p--) for (let c = 0; c < mix[p - 1]; c++) order.push(p);
      let ok = true;
      for (const p of order) {
        // strong viruses hug the boss; weak ones spread over every hot spot and a little everywhere
        const weights = [];
        let sum = 0;
        for (let i = 0; i < n; i++) {
          if (v[i] || banned.has(i)) { weights.push(0); continue; }
          let w = 0.05;
          const dBoss = dist(i, boss);
          w += (p >= 6 ? 3 : p >= 4 ? 1.2 : 0.4) * Math.exp(-(dBoss * dBoss) / (p >= 6 ? 5 : 9));
          for (let h = 1; h < hubs.length; h++) { const d = dist(i, hubs[h]); w += (p <= 3 ? 1 : 0.5) * Math.exp(-(d * d) / 4); }
          weights.push(w); sum += w;
        }
        if (sum <= 0) { ok = false; break; }
        let r = rnd() * sum, pick = -1;
        for (let i = 0; i < n; i++) { r -= weights[i]; if (r <= 0 && weights[i] > 0) { pick = i; break; } }
        if (pick < 0) { ok = false; break; }
        v[pick] = p;
      }
      if (!ok && tries < 50) continue;
      for (let i = 0; i < n; i++) run.cells[i].v = v[i];
      for (let i = 0; i < n; i++) run.cells[i].n = nbrs(run, i).reduce((s, j) => s + v[j], 0);
      // the first tap must open a real patch; reroll the layout (same seed stream) until it does
      const size = floodSize(run, safe);
      if (size < Math.min(14, n * 0.14) && tries < 50) continue;
      break;
    }
    // drops: decided now so a daily board is the same for everyone. popups pop up: they're visible from the start
    for (let i = 0; i < n; i++) {
      const c = run.cells[i];
      c.seen = c.v === 1;
      if (c.v && c.v !== BOSS) { const r = rnd(); c.drop = r < (c.v >= 3 ? 0.3 : 0.16) ? "ram" : r < (c.v >= 3 ? 0.42 : 0.24) ? "scan" : null; }
    }
    run.viruses = run.cells.filter((c) => c.v).length;
    run.safe = n - run.viruses;
    run.placed = true; run.start = safe;
    return run;
  }

  function floodSize(run, from) {
    const seen = new Set([from]), q = [from];
    while (q.length) {
      const i = q.shift();
      if (run.cells[i].n !== 0) continue;
      for (const j of nbrs(run, i)) if (!seen.has(j) && !run.cells[j].v) { seen.add(j); q.push(j); }
    }
    return seen.size;
  }

  // reveal a tile: a clean one opens (and cascades from zeros); a virus is a fight
  function reveal(run, i) {
    const ev = [];
    if (run.over) return ev;
    const c = run.cells[i];
    if (c.open) return ev;
    if (!run.placed) generate(run, i);
    if (c.v) {
      c.open = true; c.dead = true; c.flag = null;
      run.lastHp = run.hp;
      run.hp -= c.v;
      if (run.hp <= 0) {
        run.hp = 0; run.over = true; run.cause = c.v; run.killedBy = i; c.dead = false;
        ev.push({ type: "fight", i, p: c.v, dead: true });
        ev.push({ type: "lose", p: c.v });
        return ev;
      }
      run.xp += c.v; run.xpTotal += c.v; run.killed++;
      ev.push({ type: "fight", i, p: c.v });
      if (c.v === BOSS) { run.over = true; run.won = true; ev.push({ type: "win" }); }
      return ev;
    }
    // flood: breadth first, so the cascade animates outward ring by ring
    const opened = [];
    const q = [[i, 0]], seen = new Set([i]);
    while (q.length) {
      const [j, d] = q.shift();
      const cj = run.cells[j];
      if (cj.open || cj.v) continue;
      cj.open = true; cj.flag = null; run.opened++;
      opened.push({ i: j, d });
      if (cj.n === 0) for (const k of nbrs(run, j)) if (!seen.has(k) && !run.cells[k].v) { seen.add(k); q.push([k, d + 1]); }
    }
    ev.push({ type: "open", cells: opened });
    return ev;
  }

  // tapping an open number: when the beaten viruses plus your flags around it add up to it, open the rest
  function chord(run, i) {
    const c = run.cells[i];
    if (!c.open || c.v || !c.n) return null;
    let known = 0, hidden = [];
    for (const j of nbrs(run, i)) {
      const cj = run.cells[j];
      if (cj.open && cj.v) known += cj.v;
      else if (!cj.open && cj.seen) known += cj.v;
      else if (!cj.open && cj.flag) known += cj.flag;
      else if (!cj.open) hidden.push(j);
    }
    if (known !== c.n || !hidden.length) return null;
    return hidden;
  }

  // a beaten virus's drop: ram heals, scan shows a clean tile
  function collect(run, i) {
    const c = run.cells[i];
    if (!c.dead || !c.drop || run.over) return null;
    const d = c.drop; c.drop = null;
    if (d === "ram") { const before = run.hp; run.hp = Math.min(run.max, run.hp + RAM_HEAL); run.ramUsed++; return { type: "ram", healed: run.hp - before }; }
    run.scansUsed++;
    const target = scanTarget(run);
    return { type: "scan", target };
  }
  // the safest useful tile to show: a hidden clean tile next to what you've opened (the frontier), else any
  function scanTarget(run) {
    const front = [], rest = [];
    for (let i = 0; i < run.cells.length; i++) {
      const c = run.cells[i];
      if (c.open || c.v) continue;
      (nbrs(run, i).some((j) => run.cells[j].open) ? front : rest).push(i);
    }
    const pool = front.length ? front : rest;
    if (!pool.length) return -1;
    // the lowest number first: it tells you the most
    pool.sort((a, b) => run.cells[a].n - run.cells[b].n || a - b);
    return pool[0];
  }

  function canLevel(run) { return !run.over && run.xp >= cost(run.level); }
  function levelUp(run) {
    if (!canLevel(run)) return false;
    run.xp -= cost(run.level); run.level++; run.max++; run.hp = run.max;
    return true;
  }

  // score: xp earned + clean tiles opened, and a big bonus for beating the boss (faster = more)
  function score(run, secs) {
    let s = run.xpTotal + run.opened;
    if (run.won) s += 250 + Math.max(0, Math.round(300 - secs));
    return s;
  }

  const api = { hashStr, mulberry32, VIRUSES, BOSS, START_HP, RAM_HEAL, cost, mixFor, nbrs, newRun, generate, reveal, chord, collect, scanTarget, canLevel, levelUp, score };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CS = api;
})(typeof self !== "undefined" ? self : this);
