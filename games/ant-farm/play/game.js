/* ant farm — computer cooked games.
   A glass ant farm, side view. Ants forage crumbs from the surface and carry them to the queen; food becomes eggs, eggs
   become ants. The player drops crumbs (feed), plans tunnels by painting dirt (dig) and watches (look). Diggers carry
   every pellet up to the surface, so the mound grows. More tunnel = more room = more ants. Deeper dirt is harder and
   hides curios (a sugar cube, a lego brick, a floppy disk...). Upgrades cost food. Events: the kid with a magnifying
   glass (tap the lens to shoo him), a spider on the surface, red ant raids, rain. At 50 ants the queen can send a new
   queen on her nuptial flight: a new generation, keeping royal jelly (a permanent boost) and the curio book.
   Navigation is gradient descent on BFS distance fields (home, food, dig, surface, enemy) over walkable cells. */
(function () {
  "use strict";
  const sdk = (fn) => { try { if (window.cc) fn(window.cc); } catch (e) { /* the game never depends on it */ } };
  const $ = (id) => document.getElementById(id);
  const cv = $("c"), cx = cv.getContext("2d", { alpha: false });
  const qs = new URLSearchParams(location.search);

  // ---------- world ----------
  const COLS = 36, SKY = 10, DEPTH = 100, ROWS = SKY + DEPTH, N = COLS * ROWS, SURF = SKY - 1;
  const T_SKY = 0, T_DIRT = 1, T_TUN = 2, T_ROCK = 3, T_BED = 4;
  const type = new Uint8Array(N), walk = new Uint8Array(N), mark = new Uint8Array(N), tre = new Int8Array(N);
  const prog = new Float32Array(N), trail = new Float32Array(N);
  const Fh = new Int16Array(N), Ff = new Int16Array(N), Fd = new Int16Array(N), Fs = new Int16Array(N), Fe = new Int16Array(N);
  const mound = new Float32Array(COLS);
  const QX = 18, QY = SKY + 8, QCELL = QY * COLS + QX;
  let homeCells = [];
  const ix = (x, y) => y * COLS + x;

  function mulberry(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const R = Math.random;
  const pick = (a) => a[(R() * a.length) | 0];
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  // hardness by depth (seconds of work for one ant with no upgrades = HARD / DIG_BASE)
  function hard(i) {
    const t = type[i];
    if (t === T_ROCK) return 5;
    const d = ((i / COLS) | 0) - SKY;
    return d < 22 ? 1 : d < 50 ? 1.6 : d < 80 ? 2.3 : 3;
  }
  const diggable = (i) => type[i] === T_DIRT || (type[i] === T_ROCK && G.up.drill > 0);

  // ---------- curios (buried treasure) ----------
  // 8x8 sprites; palette below
  const PAL = { w: "#ffffff", W: "#e6e1d6", k: "#1b1714", s: "#9a9a96", S: "#d0d0cb", r: "#e2463a", R: "#9e2a22", y: "#ffd23e", Y: "#b98d14", b: "#3d7bf0", B: "#2049a0", g: "#5fc84b", o: "#ff9a2e", n: "#7a5534", N: "#4b321e", p: "#ff9fc8", l: "#c5ff49", a: "#ffae2b", A: "#c9690f", u: "#b59aff" };
  const CURIOS = [
    { id: "sugar", name: "a sugar cube", d: [2, 40], food: 40, spr: ["........", ".WWWWWW.", ".WwwwwW.", ".WwwwwW.", ".WwwwwW.", ".WwwwwW.", ".WWWWWW.", "........"] },
    { id: "seeds", name: "a seed stash", d: [4, 50], food: 25, spr: ["........", "..yY....", ".yYy.Yy.", "..Y.yYy.", ".Yy..Y..", ".yYyY...", "..Y.yY..", "........"] },
    { id: "cap", name: "a bottle cap", d: [6, 45], food: 10, spr: ["........", "..rRrR..", ".RrrrrR.", ".rrwwrr.", ".RrwwrR.", ".rrrrrr.", "..RrRr..", "........"] },
    { id: "penny", name: "an old penny", d: [14, 55], food: 15, spr: ["........", "..AaaA..", ".AaaaaA.", ".aaAAaa.", ".aaAAaa.", ".AaaaaA.", "..AaaA..", "........"] },
    { id: "lego", name: "a lego brick", d: [20, 60], food: 20, spr: ["........", ".b.b.b..", "bBbBbBb.", "bbbbbbbb", "bbbbbbbb", "BBBBBBBB", "........", "........"] },
    { id: "marble", name: "a marble", d: [28, 70], food: 20, spr: ["........", "..bbbb..", ".bwbBBb.", ".bbuuBb.", ".bBuubb.", ".bBBbbb.", "..bbbb..", "........"] },
    { id: "earring", name: "a lost earring", d: [24, 75], food: 25, spr: ["...yy...", "..y..y..", "...yy...", "....y...", "...uuu..", "..uwuuu.", "..uuuuu.", "...uuu.."] },
    { id: "floppy", name: "a floppy labeled crash.exe", d: [40, 92], food: 30, jelly: 1, spr: ["kkkkkkkk", "kSSSSkSk", "kSSSSkSk", "kkkkkkkk", "kwwwwwwk", "kwkkkkwk", "kwwwwwwk", "kkkkkkkk"] },
    { id: "shell", name: "a fossil shell", d: [50, 92], food: 30, spr: ["........", "...WWW..", "..WsWsW.", ".WsWsWsW", ".WWsWsWW", "..WWWWW.", "...ss...", "........"] },
    { id: "key", name: "a tiny skeleton key", d: [58, 96], food: 35, spr: ["........", ".yyy....", "y...y...", ".yyyyyyy", "y...y.y.", ".yyy..y.", "........", "........"] },
    { id: "tooth", name: "a dinosaur tooth", d: [70, 97], food: 40, jelly: 1, spr: ["...W....", "..WWW...", "..WWW...", ".WWWWW..", ".WWWWW..", "WWWWWWW.", "W.W.W.W.", "........"] },
    { id: "amber", name: "amber with a mosquito in it", d: [82, 98], food: 50, jelly: 2, spr: ["........", "..AaaA..", ".AaakaA.", ".akkkaa.", ".aakkkA.", ".AakaaA.", "..AaaA..", "........"] }
  ];
  const CUR = {}; CURIOS.forEach((c, i) => { c.i = i; CUR[c.id] = c; });

  // ---------- upgrades ----------
  const UPS = [
    { id: "jaws", name: "sharper mandibles", desc: "dig 35% faster", base: 30, mul: 1.7, max: 6 },
    { id: "legs", name: "longer legs", desc: "walk 12% faster", base: 25, mul: 1.7, max: 6 },
    { id: "carry", name: "bigger jaws", desc: "+1 crumb per trip", base: 40, mul: 2.1, max: 4 },
    { id: "queen", name: "royal snacks", desc: "the queen lays 15% faster", base: 35, mul: 1.8, max: 6 },
    { id: "rooms", name: "roomier rooms", desc: "+25% ants per tunnel", base: 50, mul: 1.9, max: 5 },
    { id: "picnic", name: "picnic basket", desc: "your crumbs are bigger", base: 20, mul: 1.8, max: 5 },
    { id: "scouts", name: "scouts", desc: "+25% food shows up outside", base: 45, mul: 1.8, max: 5 },
    { id: "soldier", name: "soldier caste", desc: "big heads, bigger bites. they guard the nest", base: 80, mul: 1, max: 1 },
    { id: "armor", name: "soldier training", desc: "soldiers bite harder and last longer", base: 90, mul: 1.9, max: 4, need: "soldier" },
    { id: "fungus", name: "fungus garden", desc: "food every second; more ants, more fungus", base: 150, mul: 2.2, max: 4 },
    { id: "drill", name: "rock chewers", desc: "dig through stone", base: 200, mul: 1, max: 1 }
  ];
  const upCost = (u) => Math.round(u.base * Math.pow(u.mul, G.up[u.id] || 0));

  // ---------- save state ----------
  let G = null;
  function freshG(prev) {
    return {
      v: 1, seed: (Math.random() * 1e9) | 0, gen: prev ? prev.gen + 1 : 1, jelly: prev ? prev.jelly : 0, food: 30, lay: true,
      up: {}, digShare: 0.5, solShare: 0.25, curios: prev ? prev.curios : {}, ach: prev ? prev.ach : {},
      life: prev ? prev.life : { hauled: 0, dug: 0, hatched: 0, flights: 0, kills: 0 },
      gs: { peak: 0, hauled: 0, born: Date.now(), maxDepth: 0 }, tut: prev ? 9 : 0, qhp: 12, nextEv: 90
    };
  }
  const jm = () => 1 + 0.04 * G.jelly;
  const halloween = (() => { if (qs.get("haunted") === "1") return true; const d = new Date(), m = d.getMonth(), day = d.getDate(); return (m === 9 && day >= 24) || (m === 10 && day <= 1); })();

  // ---------- entities ----------
  let ants = [], eggs = [], piles = [], reds = [], spider = null, lens = null, rain = 0, fx = [], bubbles = [];
  let tunCount = 0, dirty = { home: true, dig: true, surf: true, food: true };
  const NAMES = ["kevin", "deb", "todd", "brenda", "linda", "steve", "pam", "doug", "tina", "rick", "carl", "sue", "bev", "dale", "jan", "ron", "gail", "phil", "mo", "lou", "barb", "ned", "fran", "hank", "dot", "walt", "trish", "gus", "meg", "earl", "joy", "boris", "nina", "otis", "rita", "vern", "kim", "jo", "chad", "bea"];
  let antSeq = 0;
  function newAnt(x, y, sol, name) {
    const a = { id: ++antSeq, x: x + 0.5, y: y + 0.5, cx: x, cy: y, ang: R() * 6.28, task: sol ? "soldier" : "idle", sol: !!sol, carry: 0, dirt: 0, digAt: -1, hp: sol ? solHp() : 3, cd: 0, heat: 0, ph: R() * 6, name: name || pick(NAMES), hauled: 0, think: R() * 2, wait: 0 };
    ants.push(a);
    return a;
  }
  const solHp = () => 8 * (1 + 0.25 * (G.up.armor || 0));

  // ---------- generation ----------
  function genWorld(seed) {
    const r = mulberry(seed);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) type[ix(x, y)] = y < SKY ? T_SKY : y === ROWS - 1 ? T_BED : T_DIRT;
    mark.fill(0); tre.fill(-1); prog.fill(0); trail.fill(0); mound.fill(0);
    // stones, more and bigger with depth
    for (let k = 0; k < 26; k++) {
      const d = 8 + Math.floor(Math.sqrt(r()) * (DEPTH - 10)), y0 = SKY + d, x0 = Math.floor(r() * COLS);
      const rx = 0.6 + r() * (1 + d / 40), ry = 0.5 + r() * (0.6 + d / 60);
      for (let y = Math.floor(y0 - ry - 1); y <= y0 + ry + 1; y++) for (let x = Math.floor(x0 - rx - 1); x <= x0 + rx + 1; x++) {
        if (x < 0 || x >= COLS || y <= SKY + 3 || y >= ROWS - 1) continue;
        const e = ((x - x0) / rx) ** 2 + ((y - y0) / ry) ** 2;
        if (e < 1 + (r() - 0.5) * 0.5) type[ix(x, y)] = T_ROCK;
      }
    }
    for (let x = 0; x < COLS; x++) { if (r() < 0.6) type[ix(x, ROWS - 2)] = T_ROCK; if (r() < 0.25) type[ix(x, ROWS - 3)] = T_ROCK; }
    // starter shaft + queen chamber
    for (let y = SKY - 1; y <= QY + 2; y++) for (let x = QX - 5; x <= QX + 5; x++) if (y > SKY - 1 && type[ix(x, y)] === T_ROCK) type[ix(x, y)] = T_DIRT;
    for (let y = SKY; y < QY - 1; y++) type[ix(QX, y)] = T_TUN;
    homeCells = [];
    for (let y = QY - 1; y <= QY; y++) for (let x = QX - 3; x <= QX + 3; x++) { type[ix(x, y)] = T_TUN; homeCells.push(ix(x, y)); }
    type[ix(QX - 4, QY)] = T_TUN; type[ix(QX + 4, QY)] = T_TUN;
    // curios: one of each in its depth band, plus extra sugar and seeds
    const list = CURIOS.map((c) => c.id).concat(["sugar", "sugar", "sugar", "seeds", "seeds", "seeds", "cap", "penny"]);
    for (const id of list) {
      const c = CUR[id];
      for (let tries = 0; tries < 60; tries++) {
        const y = SKY + c.d[0] + Math.floor(r() * (c.d[1] - c.d[0])), x = Math.floor(r() * COLS), i = ix(x, y);
        if (y >= ROWS - 1 || type[i] !== T_DIRT || tre[i] >= 0 || Math.abs(x - QX) + Math.abs(y - QY) < 7) continue;
        tre[i] = c.i; break;
      }
    }
    // a few rocks get a curio stuck next to them for flavour: nothing to do
    rebuildWalk();
  }
  function rebuildWalk() {
    tunCount = 0;
    for (let i = 0; i < N; i++) {
      const y = (i / COLS) | 0;
      walk[i] = type[i] === T_TUN || (y === SURF && type[i] === T_SKY) ? 1 : 0;
      if (type[i] === T_TUN) tunCount++;
    }
    homeCells = homeCells.length ? homeCells : [QCELL];
    dirty.home = dirty.dig = dirty.surf = dirty.food = true;
  }
  const capacity = () => 4 + Math.floor((tunCount / 3) * (1 + 0.25 * (G.up.rooms || 0)));

  // ---------- fields ----------
  const Q = new Int32Array(N);
  function bfs(F, seed) {
    F.fill(-1);
    let h = 0, t = 0;
    seed((i) => { if (F[i] < 0) { F[i] = 0; Q[t++] = i; } });
    while (h < t) {
      const c = Q[h++], x = c % COLS, d = F[c] + 1;
      if (x > 0 && walk[c - 1] && F[c - 1] < 0) { F[c - 1] = d; Q[t++] = c - 1; }
      if (x < COLS - 1 && walk[c + 1] && F[c + 1] < 0) { F[c + 1] = d; Q[t++] = c + 1; }
      if (c >= COLS && walk[c - COLS] && F[c - COLS] < 0) { F[c - COLS] = d; Q[t++] = c - COLS; }
      if (c < N - COLS && walk[c + COLS] && F[c + COLS] < 0) { F[c + COLS] = d; Q[t++] = c + COLS; }
    }
    return t;
  }
  let digSources = 0, foodSources = 0;
  function updateFields() {
    if (dirty.home) { bfs(Fh, (add) => homeCells.forEach(add)); dirty.home = false; }
    if (dirty.surf) { bfs(Fs, (add) => { for (let x = 0; x < COLS; x++) add(ix(x, SURF)); }); dirty.surf = false; }
    if (dirty.dig) {
      digSources = 0;
      bfs(Fd, (add) => {
        for (let i = 0; i < N; i++) {
          if (!walk[i]) continue;
          const x = i % COLS;
          if ((x > 0 && mark[i - 1] && diggable(i - 1)) || (x < COLS - 1 && mark[i + 1] && diggable(i + 1)) || (i >= COLS && mark[i - COLS] && diggable(i - COLS)) || (i < N - COLS && mark[i + COLS] && diggable(i + COLS))) { add(i); digSources++; }
        }
      });
      dirty.dig = false;
    }
    if (dirty.food) {
      foodSources = 0;
      bfs(Ff, (add) => { for (const p of piles) if (p.u > 0 && !(spider && Math.abs(p.x - spider.x) < 5)) { add(ix(p.x, SURF)); foodSources++; } });
      dirty.food = false;
    }
  }
  let enemyT = 0;
  function updateEnemyField(dt) {
    enemyT -= dt;
    if (enemyT > 0) return;
    enemyT = 0.3;
    bfs(Fe, (add) => { for (const r of reds) add(ix(r.cx, r.cy)); if (spider) add(ix(clamp(Math.round(spider.x - 0.5), 0, COLS - 1), SURF)); });
  }

  // ---------- stats derived ----------
  const speed = () => 3.4 * (1 + 0.12 * (G.up.legs || 0)) * jm();
  const digRate = () => 0.6 * (1 + 0.35 * (G.up.jaws || 0)) * jm();
  const carryN = () => 2 + (G.up.carry || 0);
  const eggEvery = () => (7 / (1 + 0.15 * (G.up.queen || 0))) / jm();
  const EGG_COST = 6, HATCH = 14;

  // ---------- ant brains ----------
  function stepTo(a, F) {
    const c = ix(a.cx, a.cy), here = F[c];
    if (here < 0) return -1;
    if (here === 0) return 0;
    let best = here, out = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const x = a.cx + dx, y = a.cy + dy;
      if (x < 0 || x >= COLS || y < 0 || y >= ROWS) continue;
      const n = ix(x, y);
      if (!walk[n] || F[n] < 0) continue;
      if (dx && dy && !(walk[ix(a.cx + dx, a.cy)] && walk[ix(a.cx, a.cy + dy)])) continue;
      if (F[n] < best) { best = F[n]; out = [n]; } else if (F[n] === best && best < here) out.push(n);
    }
    if (!out.length) return -1;
    const n = pick(out);
    a.cx = n % COLS; a.cy = (n / COLS) | 0;
    return 1;
  }
  function wander(a, maxHome) {
    const opts = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const x = a.cx + dx, y = a.cy + dy;
      if (x < 0 || x >= COLS || y < 0 || y >= ROWS) continue;
      const n = ix(x, y);
      if (!walk[n]) continue;
      if (dx && dy && !(walk[ix(a.cx + dx, a.cy)] && walk[ix(a.cx, a.cy + dy)])) continue;
      if (maxHome && Fh[n] > maxHome && Fh[n] > Fh[ix(a.cx, a.cy)]) continue;
      opts.push(n);
    }
    if (!opts.length) return;
    const n = pick(opts);
    a.cx = n % COLS; a.cy = (n / COLS) | 0;
  }
  let jobCounts = { dig: 0, forage: 0, idle: 0 };
  function assign(a) {
    a.digAt = -1;
    if (!a.sol) { const o = a.task === "dig" ? "dig" : a.task === "forage" ? "forage" : "idle"; if (jobCounts[o] > 0) jobCounts[o]--; }
    if (a.sol) { a.task = "soldier"; return; }
    if (rain > 0 && a.cy <= SKY) { a.task = "flee"; return; }
    const workers = ants.length - ants.filter((b) => b.sol).length;
    const wantDig = digSources ? Math.max(1, Math.round(workers * G.digShare)) : 0;
    const wantForage = foodSources ? workers - Math.min(wantDig, workers) : 0;
    if (wantDig && jobCounts.dig < wantDig) { a.task = "dig"; jobCounts.dig++; return; }
    if (foodSources && rain <= 0 && (jobCounts.forage < wantForage || !digSources)) { a.task = "forage"; jobCounts.forage++; return; }
    if (digSources) { a.task = "dig"; jobCounts.dig++; return; }
    a.task = "idle"; jobCounts.idle++;
  }
  function recount() {
    jobCounts = { dig: 0, forage: 0, idle: 0 };
    for (const a of ants) if (!a.sol) jobCounts[a.task === "dig" ? "dig" : a.task === "forage" ? "forage" : "idle"]++;
  }

  // called when an ant reaches the centre of its current cell: decide the next cell
  function think(a) {
    const c = ix(a.cx, a.cy);
    if (a.carry) {
      const r = stepTo(a, Fh);
      if (r === 0) { deliver(a); assign(a); }
      else if (r < 0) wander(a);
      trail[c] = Math.min(1, trail[c] + 0.35);
      return;
    }
    if (a.dirt) {
      const r = stepTo(a, Fs);
      if (r === 0) { dump(a); assign(a); }
      else if (r < 0) wander(a);
      return;
    }
    switch (a.task) {
      case "forage": {
        if (!foodSources || rain > 0) { assign(a); if (a.task === "forage") a.task = "idle"; return; }
        const r = stepTo(a, Ff);
        if (r === 0) {
          const p = piles.find((q) => q.x === a.cx && q.u > 0);
          if (p) { const take = Math.min(carryN(), p.u); p.u -= take; a.carry = take; if (p.u <= 0) dirty.food = true; }
          else assign(a);
        } else if (r < 0) assign(a);
        return;
      }
      case "dig": {
        if (!digSources) { assign(a); return; }
        const r = stepTo(a, Fd);
        if (r === 0) {
          const opts = [c - 1, c + 1, c - COLS, c + COLS].filter((n) => n >= 0 && n < N && Math.abs((n % COLS) - a.cx) <= 1 && mark[n] && diggable(n));
          if (opts.length) { opts.sort((p, q) => prog[q] - prog[p]); a.digAt = opts[0]; a.wait = 0; }
          else assign(a);
        } else if (r < 0) assign(a);
        return;
      }
      case "soldier": {
        if (reds.length || spider) { const r = stepTo(a, Fe); if (r < 0) wander(a, 12); return; }
        wander(a, 10);
        a.wait = R() < 0.3 ? 0.4 + R() : 0;
        return;
      }
      case "flee": {
        const r = stepTo(a, Fh);
        if (r <= 0 && rain <= 0 && !spider) assign(a);
        else if (r === 0) a.wait = 1;
        return;
      }
      default: {
        a.think -= 1;
        if (a.think <= 0) { a.think = 2 + R() * 2; assign(a); if (a.task !== "idle") return; }
        wander(a, 4);
        a.wait = R() < 0.45 ? 0.5 + R() * 1.5 : 0;
      }
    }
  }
  function deliver(a) {
    G.food += a.carry; G.gs.hauled += a.carry; G.life.hauled += a.carry; a.hauled += a.carry; sessHauled += a.carry;
    if (R() < 0.5) sfx("tick");
    a.carry = 0;
  }
  function dump(a) {
    a.dirt = 0;
    const x = a.cx;
    mound[x] += 1;
    // spread the pile so it slumps like dirt
    for (let k = 0; k < 3; k++) for (let i = 0; i < COLS; i++) {
      const l = i > 0 ? mound[i - 1] : 1e9, r = i < COLS - 1 ? mound[i + 1] : 1e9;
      if (mound[i] - l > 3) { mound[i] -= 1; mound[i - 1] += 1; }
      if (mound[i] - r > 3) { mound[i] -= 1; mound[i + 1] += 1; }
    }
    puff(a.x, a.y - 0.3, "#8a6544", 3);
  }
  function digOut(i, a) {
    type[i] = T_TUN; mark[i] = 0; prog[i] = 0; walk[i] = 1; tunCount++;
    G.life.dug++;
    const y = (i / COLS) | 0, d = y - SKY;
    if (d > G.gs.maxDepth) { G.gs.maxDepth = d; if (d >= 60) ach("deep_60"); }
    for (let k = -1; k <= 1; k++) for (let j = -1; j <= 1; j++) paintCell((i % COLS) + j, y + k);
    dirty.home = dirty.dig = dirty.surf = dirty.food = true;
    if (a) a.dirt = 1;
    puff((i % COLS) + 0.5, y + 0.5, "#6b4a2b", 5);
    if (tre[i] >= 0) found(tre[i], i);
    if (R() < 0.35) sfx("dig");
  }
  function found(ci, i) {
    const c = CURIOS[ci];
    tre[i] = -1;
    const isNew = !G.curios[c.id];
    G.curios[c.id] = (G.curios[c.id] || 0) + 1;
    G.food += c.food; G.gs.hauled += c.food; sessHauled += c.food;
    if (c.jelly && isNew) G.jelly += c.jelly;
    sparkle((i % COLS) + 0.5, ((i / COLS) | 0) + 0.5);
    sfx("treasure");
    toast(isNew ? `new curio: ${c.name}! +${c.food} food${c.jelly ? `, +${c.jelly} royal jelly` : ""}` : `${c.name} again. +${c.food} food`);
    if (Object.keys(G.curios).length >= 6) ach("curio_6");
    if (c.id === "floppy") bubbleOn(nearestAnt(i), "is this... the computer?");
  }

  // ---------- sim ----------
  let simT = 0, foodT = 3, recountT = 0, sessHauled = 0;
  function sim(dt) {
    simT += dt;
    updateFields();
    if (reds.length || spider) updateEnemyField(dt);
    const sp = speed();
    // ants
    for (let k = ants.length - 1; k >= 0; k--) {
      const a = ants[k];
      if (a.hp <= 0) { ants.splice(k, 1); continue; }
      a.ph += dt * 14;
      if (a.cd > 0) a.cd -= dt;
      if (a.digAt >= 0) {
        if (!mark[a.digAt] || !diggable(a.digAt)) { a.digAt = -1; assign(a); continue; }
        prog[a.digAt] += dt * digRate() / hard(a.digAt);
        a.ph += dt * 10;
        const tx = (a.digAt % COLS) + 0.5, ty = ((a.digAt / COLS) | 0) + 0.5;
        a.ang = Math.atan2(ty - a.y, tx - a.x);
        if (prog[a.digAt] >= 1) { const i = a.digAt; for (const b of ants) if (b !== a && b.digAt === i) { b.digAt = -1; } digOut(i, a); a.digAt = -1; }
        continue;
      }
      if (a.wait > 0) { a.wait -= dt; continue; }
      const gx = a.cx + 0.5, gy = a.cy + 0.5, dx = gx - a.x, dy = gy - a.y, dist = Math.hypot(dx, dy);
      const v = sp * (a.sol ? 0.9 : 1) * (a.carry ? 0.85 : 1) * dt;
      if (dist <= v) { a.x = gx; a.y = gy; think(a); }
      else { a.x += (dx / dist) * v; a.y += (dy / dist) * v; const t = Math.atan2(dy, dx); a.ang += angDiff(a.ang, t) * Math.min(1, dt * 14); }
    }
    // food on the surface
    foodT -= dt;
    if (foodT <= 0 && rain <= 0) {
      foodT = (4 + R() * 4) / (1 + 0.25 * (G.up.scouts || 0));
      if (piles.length < 10) spawnPile();
    }
    for (let k = piles.length - 1; k >= 0; k--) { const p = piles[k]; p.age += dt; if (p.u <= 0 || p.age > 120) { piles.splice(k, 1); dirty.food = true; } }
    // queen
    queenT += dt;
    if (queenT >= eggEvery()) {
      if (G.lay !== false && ants.length + eggs.length < capacity() && G.food >= EGG_COST) { queenT = 0; G.food -= EGG_COST; layEgg(); }
      else if (!ants.length && !eggs.length && G.food < EGG_COST && queenT > 20) { queenT = 0; layEgg(); toast("the queen laid an emergency egg"); }
      else queenT = eggEvery();
    }
    for (let k = eggs.length - 1; k >= 0; k--) {
      const e = eggs[k]; e.t += dt;
      if (e.t >= HATCH) {
        eggs.splice(k, 1);
        const a = newAnt(e.x, e.y, e.sol);
        assign(a);
        G.life.hatched++; sfx("hatch");
        if (G.life.hatched === 1) ach("first_hatch");
        if (R() < 0.12) bubbleOn(a, pick(["hello world", "i'm new here", "where's the break room", "i was born 1 second ago. i'm ready"]));
      }
    }
    if (G.qhp < 12) G.qhp = Math.min(12, G.qhp + dt * 0.15);
    // upkeep and fungus
    upkeep += dt * (ants.length / 60 + 1 / 40);
    while (upkeep >= 1) {
      upkeep -= 1;
      if (G.food >= 1) G.food -= 1;
      else if (ants.length) { const v = pick(ants); v.hp = 0; puff(v.x, v.y, "#555", 4); starvedMsg(); }
    }
    if (G.up.fungus) { const f = dt * G.up.fungus * 0.012 * ants.length * jm(); G.food += f; G.gs.hauled += f; sessHauled += f; }
    // trails fade
    const fade = Math.pow(0.85, dt);
    for (let i = SKY - 1; i < N; i++) if (trail[i] > 0.01) trail[i] *= fade; else trail[i] = 0;
    // jobs
    recountT -= dt;
    if (recountT <= 0) { recountT = 1.5; recount(); rebalance(); recount(); }
    // events
    events(dt);
    // peak and achievements
    if (ants.length > G.gs.peak) G.gs.peak = ants.length;
    if (ants.length >= 25) ach("pop_25");
    if (ants.length >= 100) ach("pop_100");
    tutorial();
  }
  let queenT = 0, upkeep = 0, starveT = 0;
  function starvedMsg() { if (simT - starveT > 8) { starveT = simT; toast("an ant starved. drop crumbs!", "bad"); sfx("bad"); } }
  function rebalance() {
    // move a few workers between digging and foraging when the split is off
    const workers = ants.filter((a) => !a.sol);
    const wantDig = digSources ? Math.round(workers.length * G.digShare) : 0;
    let diff = jobCounts.dig - wantDig;
    for (const a of workers) {
      if (diff > 1 && a.task === "dig" && !a.dirt && a.digAt < 0) { a.task = foodSources ? "forage" : "idle"; diff--; }
      else if (diff < -1 && a.task !== "dig" && !a.carry) { a.task = "dig"; diff++; }
    }
    for (const a of workers) if (a.task === "idle" && (digSources || foodSources)) assign(a);
  }
  const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= 6.2832; while (d < -Math.PI) d += 6.2832; return d; };
  function layEgg() {
    const near = [];
    for (let i = 0; i < N; i++) if (Fh[i] >= 0 && Fh[i] <= 2 && type[i] === T_TUN) near.push(i);
    const i = near.length ? pick(near) : QCELL;
    const sol = !!G.up.soldier && R() < G.solShare;
    eggs.push({ x: i % COLS, y: (i / COLS) | 0, t: 0, sol, ox: R() * 0.6 - 0.3 });
  }
  const PILES = [
    { k: "crumb", u: [3, 6] }, { k: "crumb", u: [3, 6] }, { k: "cheerio", u: [6, 10] }, { k: "apple", u: [10, 18] }, { k: "chip", u: [5, 9] }, { k: "donut", u: [30, 45], rare: 1 }
  ];
  function spawnPile(kind, x, units) {
    let def;
    if (kind) def = { k: kind, u: [units, units] };
    else { def = pick(PILES); if (def.rare && R() > 0.3) def = PILES[0]; if (halloween && R() < 0.35) def = { k: "candy", u: [6, 10] }; }
    const px = x != null ? x : Math.floor(R() * COLS);
    const ex = piles.find((p) => p.x === px);
    let u = def.u[0] + Math.floor(R() * (def.u[1] - def.u[0] + 1));
    if (!kind) u = Math.round(u * (1 + ants.length / 40));
    if (ex) { ex.u += u; ex.max = Math.max(ex.max, ex.u); ex.age = 0; }
    else piles.push({ x: px, u, max: u, k: def.k, age: 0, drop: x != null ? 1 : 0 });
    dirty.food = true;
  }
  function dropCrumb(x) {
    const u = 3 + 2 * (G.up.picnic || 0);
    spawnPile("crumb", clamp(x, 0, COLS - 1), u);
    G.tCrumbs = (G.tCrumbs || 0) + 1;
    sfx("crumb");
    fx.push({ k: "fall", x: x + 0.5, y: SURF - 4, vy: 0, life: 1 });
  }

  // ---------- combat & events ----------
  function events(dt) {
    // magnifying glass
    if (lens) {
      lens.t += dt;
      const surf = ants.filter((a) => a.cy === SURF);
      let tx = lens.x;
      if (surf.length) { let b = surf[0]; for (const a of surf) if (Math.abs(a.x - lens.x) < Math.abs(b.x - lens.x)) b = a; tx = b.x; }
      lens.x += clamp(tx - lens.x, -1, 1) * dt * 2.2 + Math.sin(lens.t * 3) * dt * 0.6;
      lens.x = clamp(lens.x, 1, COLS - 1);
      for (const a of surf) if (Math.abs(a.x - lens.x) < 0.9) { a.heat += dt; if (a.heat > 1.1) { a.hp = 0; puff(a.x, a.y, "#444", 6); fx.push({ k: "txt", x: a.x, y: a.y - 1, s: "toasted", life: 1.4 }); sfx("sizzle"); } } else a.heat = Math.max(0, a.heat - dt);
      if (lens.t > 16 || lens.hp <= 0) { if (lens.hp <= 0) { toast("the kid got bored. good job."); ach("shoo"); } lens = null; }
    }
    // spider
    if (spider) {
      const s = spider;
      s.t += dt; s.cd -= dt;
      const surf = ants.filter((a) => a.cy === SURF);
      let tx = s.dir > 0 ? COLS + 2 : -3;
      for (const a of surf) if (!a.sol && Math.abs(a.x - s.x) < 6 && a.task !== "flee") a.task = "flee";
      if (s.t < 30 && surf.length) { let b = surf[0]; for (const a of surf) if (Math.abs(a.x - s.x) < Math.abs(b.x - s.x)) b = a; if (Math.abs(b.x - s.x) < 14) tx = b.x; }
      else if (s.t < 30) tx = s.x + Math.sin(s.t * 0.7) * 3;
      s.x += clamp(tx - s.x, -1, 1) * dt * 1.7; s.ph += dt * 8;
      if (s.cd <= 0) for (const a of surf) if (Math.abs(a.x - s.x) < 0.9) { a.hp -= a.sol ? 4 : 99; s.cd = 3.5; sfx("bite"); if (a.hp <= 0) puff(a.x, a.y, "#222", 5); break; }
      if (s.hp <= 0) { toast("the spider is now a buffet. +60 food (on the grass)"); spawnPile("spider", clamp(Math.round(s.x - 0.5), 0, COLS - 1), 60); ach("spider_slayer"); G.life.kills++; spider = null; dirty.food = true; }
      else if (s.x < -3 || s.x > COLS + 3) { spider = null; dirty.food = true; for (const a of ants) if (a.task === "flee" && rain <= 0) assign(a); }
      if (Math.floor(s.t * 2) !== Math.floor((s.t - dt) * 2)) dirty.food = true;
    }
    // red ants
    if (reds.length) {
      const sp = 2.5 * dt;
      for (let k = reds.length - 1; k >= 0; k--) {
        const r = reds[k];
        if (r.hp <= 0) { reds.splice(k, 1); G.food += 3; puff(r.x, r.y, "#c8322b", 5); G.life.kills++; if (!reds.length) { toast("raid over. the colony holds."); ach("raid_survivor"); } continue; }
        r.ph += dt * 14; if (r.cd > 0) r.cd -= dt;
        // fight anything adjacent
        let foe = null;
        for (const a of ants) if (Math.abs(a.x - r.x) < 0.8 && Math.abs(a.y - r.y) < 0.8) { foe = a; break; }
        if (foe) {
          if (r.cd <= 0) { foe.hp -= 1.2; r.cd = 0.7; if (foe.hp <= 0) puff(foe.x, foe.y, "#222", 4); }
          if (foe.cd <= 0) { r.hp -= foe.sol ? 3 * (1 + 0.3 * (G.up.armor || 0)) : 1; foe.cd = 0.6; sfx("bite"); }
          continue;
        }
        const gx = r.cx + 0.5, gy = r.cy + 0.5, dx = gx - r.x, dy = gy - r.y, d = Math.hypot(dx, dy);
        if (d <= sp) {
          r.x = gx; r.y = gy;
          const res = stepTo(r, Fh);
          if (res === 0 && r.cd <= 0) { G.qhp -= 1; r.cd = 0.9; r.hp -= 1.5; sfx("bad"); fx.push({ k: "txt", x: QX + 0.5, y: QY - 1.2, s: "ow!", life: 0.8 }); if (G.qhp <= 0) return colonyFalls("red ants got the queen"); }
          else if (res < 0) wander(r);
        } else { r.x += (dx / d) * sp; r.y += (dy / d) * sp; r.ang = Math.atan2(dy, dx); }
      }
    }
    // workers and soldiers bite the spider
    if (spider) for (const a of ants) if (a.cy === SURF && Math.abs(a.x - spider.x) < 1 && a.cd <= 0) { spider.hp -= a.sol ? 3 * (1 + 0.3 * (G.up.armor || 0)) : 0.4; a.cd = 0.6; }
    // rain
    if (rain > 0) {
      rain -= dt;
      if (rain <= 0) { toast("rain's over. a worm washed up! +25"); spawnPile("worm", Math.floor(R() * COLS), 25); for (const a of ants) if (a.task === "flee") assign(a); }
    }
    // schedule
    if (ants.length >= 8 && !lens && !spider && !reds.length && rain <= 0) {
      G.nextEv -= dt;
      if (G.nextEv <= 0) { G.nextEv = 70 + R() * 80; startEvent(); }
    }
  }
  function startEvent(force) {
    const opts = ["lens", "rain"];
    if (ants.length >= 15) opts.push("spider", "spider");
    if (ants.length >= 30) opts.push("raid", "raid");
    const k = force || pick(opts);
    if (k === "lens") { lens = { x: R() < 0.5 ? 2 : COLS - 2, t: 0, hp: 5, shake: 0 }; toast("☀ a kid found a magnifying glass. tap the lens!", "bad"); sfx("alert"); }
    if (k === "rain") { rain = 18; piles.length = 0; dirty.food = true; toast("🌧 rain! everyone inside."); for (const a of ants) if (a.cy <= SKY && !a.carry) a.task = "flee"; }
    if (k === "spider") { const d = R() < 0.5 ? 1 : -1; spider = { x: d > 0 ? -2 : COLS + 2, dir: d, t: 0, hp: 25 + 8 * G.gen, max: 25 + 8 * G.gen, cd: 0, ph: 0 }; toast(G.up.soldier ? "🕷 a spider! soldiers are on it." : "🕷 a spider! (soldiers would help)", "bad"); sfx("alert"); dirty.food = true; }
    if (k === "raid") {
      const n = Math.min(24, 3 + G.gen + Math.floor(ants.length / 15));
      const side = R() < 0.5 ? 0 : COLS - 1;
      for (let j = 0; j < n; j++) reds.push({ x: side + 0.5, y: SURF + 0.5, cx: side, cy: SURF, hp: 4, cd: j * 0.4, ph: R() * 6, ang: 0 });
      toast(`🐜 red ant raid! ${n} of them. protect the queen.`, "bad"); sfx("alert");
    }
  }
  function colonyFalls(why) {
    over = true;
    sfx("bad");
    endSession(true);
    showOver("the colony fell", `${why}.<br>generation ${G.gen} peaked at ${G.gs.peak} ants and hauled ${fmt(G.gs.hauled)} food.<br>royal jelly is kept. a new queen starts over.`, "start a new colony", () => newGeneration());
  }

  // ---------- generations ----------
  function newGeneration() {
    G = freshG(G);
    genWorld(G.seed);
    ants = []; eggs = []; piles = []; reds = []; spider = null; lens = null; rain = 0; fx = []; bubbles = [];
    for (let k = 0; k < 5; k++) newAnt(QX - 2 + k, QY);
    spawnPile("crumb", QX + 6, 5);
    queenT = 0; over = false; recount();
    paintAll();
    camY = clampCam(-topPad());
    startSession();
    save();
  }
  function flight() {
    const gain = Math.floor(G.gs.peak / 10) + Math.floor(G.gs.maxDepth / 25);
    G.life.flights++;
    over = true;
    ach("first_flight");
    endSession(true);
    const prev = G;
    prev.jelly += gain;
    showOver("nuptial flight", `a new queen flew off with +${gain} royal jelly.<br>generation ${prev.gen}: peak ${prev.gs.peak} ants, ${fmt(prev.gs.hauled)} food hauled, ${prev.gs.maxDepth} deep.<br>every ant is now ${Math.round(4 * prev.jelly)}% better at everything.`, `start generation ${prev.gen + 1}`, () => newGeneration());
    flyFx = { t: 0 };
  }

  // ---------- view ----------
  let W = 0, H = 0, DPR = 1, P = 8, ts = 8, offX = 0, camY = 0, phone = false;
  const tcv = document.createElement("canvas"), tc = tcv.getContext("2d");
  function resize() {
    W = innerWidth; H = innerHeight;
    phone = Math.min(W, H) < 600;
    DPR = Math.min(phone ? 1.5 : 2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    const np = clamp(Math.floor((W * DPR - (phone ? 0 : 40 * DPR)) / COLS), 5, Math.round(20 * DPR));
    const old = ts;
    P = np; ts = P / DPR;
    offX = Math.round((W - COLS * ts) / 2);
    if (tcv.width !== COLS * P) { tcv.width = COLS * P; tcv.height = ROWS * P; if (G) paintAll(); }
    camY = clampCam(old ? (camY / old) * ts : 0);
  }
  const topPad = () => 44, botPad = () => 70;
  const clampCam = (y) => clamp(y, -topPad(), Math.max(-topPad(), ROWS * ts - H + botPad()));

  // terrain cache
  const LAYER = [[0, "#8b5e3c", "#7a5133", "#9d6c46"], [22, "#a0623a", "#8d5531", "#b07045"], [50, "#76503a", "#664431", "#87604a"], [80, "#5a4636", "#4d3b2d", "#6a5545"]];
  function hash(i) { let h = (i * 374761393) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function paintCell(x, y) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return;
    const i = ix(x, y), t = type[i], px = x * P, py = y * P, u = Math.max(1, Math.round(P / 8));
    tc.clearRect(px, py, P, P);
    if (t === T_SKY) return;
    const d = y - SKY;
    let L = LAYER[0]; for (const l of LAYER) if (d >= l[0]) L = l;
    if (t === T_DIRT || t === T_TUN) {
      tc.fillStyle = L[1]; tc.fillRect(px, py, P, P);
      for (let k = 0; k < 3; k++) { const h = hash(i * 3 + k); tc.fillStyle = h < 0.5 ? L[2] : L[3]; tc.fillRect(px + Math.floor(hash(i * 7 + k) * (P - u)), py + Math.floor(h * (P - u)), u, u); }
    }
    if (t === T_TUN) {
      tc.fillStyle = "#2a1a10"; tc.fillRect(px, py, P, P);
      const open = (n) => n >= 0 && n < N && (type[n] === T_TUN || type[n] === T_SKY);
      const r = Math.max(1, Math.round(P / 6));
      tc.fillStyle = "#3a2516";
      if (!open(i - COLS)) tc.fillRect(px, py, P, r);
      if (x > 0 && !open(i - 1)) tc.fillRect(px, py, r, P);
      if (x < COLS - 1 && !open(i + 1)) tc.fillRect(px + P - r, py, r, P);
      tc.fillStyle = "#1c110a";
      if (!open(i + COLS)) tc.fillRect(px, py + P - r, P, r);
    }
    if (t === T_ROCK || t === T_BED) {
      tc.fillStyle = t === T_BED ? "#2b2622" : L[1]; tc.fillRect(px, py, P, P);
      if (t === T_ROCK) {
        tc.fillStyle = "#8d8a84"; tc.fillRect(px + u * 0.5, py + u * 0.5, P - u, P - u);
        tc.fillStyle = "#a9a6a0"; tc.fillRect(px + u, py + u, P - u * 3, u);
        tc.fillStyle = "#6c6a65"; tc.fillRect(px + u, py + P - u * 2, P - u * 2, u);
      }
    }
    if (tre[i] >= 0 && t !== T_TUN) {
      const s = CURIOS[tre[i]].spr, q = P / 8;
      for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 8; xx++) { const ch = s[yy][xx]; if (ch === ".") continue; tc.fillStyle = PAL[ch]; tc.fillRect(Math.floor(px + xx * q), Math.floor(py + yy * q), Math.ceil(q), Math.ceil(q)); }
    }
    if (y === SKY && t !== T_TUN) {
      tc.fillStyle = "#4f9a37"; tc.fillRect(px, py, P, Math.max(2, Math.round(P / 3)));
      tc.fillStyle = "#6cc04a"; for (let k = 0; k < 3; k++) tc.fillRect(px + Math.floor(hash(i + k * 11) * (P - u)), py - u, u, u * 2);
    }
  }
  function paintAll() { tc.clearRect(0, 0, tcv.width, tcv.height); for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) paintCell(x, y); }

  // ---------- drawing ----------
  let flyFx = null, clouds = [{ x: 0.1, y: 0.25, s: 1 }, { x: 0.55, y: 0.12, s: 0.8 }, { x: 0.85, y: 0.35, s: 1.2 }];
  function draw(dt) {
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx.fillStyle = "#17120d"; cx.fillRect(0, 0, W, H);
    const wx = offX, ww = COLS * ts, top = -camY, skyH = SKY * ts;
    // wall behind the farm
    cx.fillStyle = "#211a13"; cx.fillRect(0, 0, W, H);
    // sky
    const sg = cx.createLinearGradient(0, top, 0, top + skyH);
    if (rain > 0) { sg.addColorStop(0, "#5d6a78"); sg.addColorStop(1, "#8d9aa6"); }
    else if (halloween) { sg.addColorStop(0, "#2a1f4a"); sg.addColorStop(1, "#ff9a4e"); }
    else { sg.addColorStop(0, "#7cc4ff"); sg.addColorStop(1, "#d6f0ff"); }
    cx.fillStyle = sg; cx.fillRect(wx, top, ww, skyH);
    // sun / moon and clouds
    cx.fillStyle = halloween ? "#ffe9a8" : "#fff3b0";
    cx.beginPath(); cx.arc(wx + ww * 0.82, top + skyH * 0.28, ts * 1.6, 0, 6.3); cx.fill();
    cx.fillStyle = rain > 0 ? "#c5ccd4" : "#ffffffd0";
    for (const c of clouds) {
      c.x += dt * 0.006 * c.s; if (c.x > 1.15) c.x = -0.15;
      const x = wx + c.x * ww, y = top + c.y * skyH, r = ts * 1.3 * c.s;
      cx.beginPath(); cx.arc(x, y, r, 0, 6.3); cx.arc(x + r, y + r * 0.2, r * 0.8, 0, 6.3); cx.arc(x - r, y + r * 0.25, r * 0.7, 0, 6.3); cx.fill();
    }
    if (halloween) {
      for (let k = 0; k < 3; k++) { const bx = wx + ((simT * 0.03 + k * 0.33) % 1) * ww, by = top + skyH * (0.2 + 0.15 * Math.sin(simT + k * 2)); const f = Math.sin(simT * 12 + k) * ts * 0.5; cx.fillStyle = "#1a1020"; cx.beginPath(); cx.moveTo(bx, by); cx.lineTo(bx - ts, by - f); cx.lineTo(bx - ts * 0.4, by + ts * 0.2); cx.lineTo(bx, by + ts * 0.3); cx.lineTo(bx + ts * 0.4, by + ts * 0.2); cx.lineTo(bx + ts, by - f); cx.fill(); }
    }
    // mound (dumped dirt)
    cx.fillStyle = "#8a6544";
    for (let x = 0; x < COLS; x++) { const h = Math.min(mound[x] * ts * 0.12, ts * 3.2); if (h > 0.5) cx.fillRect(wx + x * ts, top + skyH - h, ts + 0.5, h); }
    cx.fillStyle = "#9d7552";
    for (let x = 0; x < COLS; x++) { const h = Math.min(mound[x] * ts * 0.12, ts * 3.2); if (h > 2) cx.fillRect(wx + x * ts, top + skyH - h, ts + 0.5, Math.max(1, ts * 0.2)); }
    if (halloween) drawPumpkin(wx + ts * 3, top + skyH);
    // terrain
    const y0 = Math.max(0, camY), y1 = Math.min(ROWS * ts, camY + H);
    if (y1 > y0) cx.drawImage(tcv, 0, Math.round(y0 * DPR), COLS * P, Math.round((y1 - y0) * DPR), wx, y0 - camY, ww, y1 - y0);
    const r0 = Math.max(0, Math.floor(camY / ts) - 1), r1 = Math.min(ROWS - 1, Math.ceil((camY + H) / ts) + 1);
    // trails, marks, dig progress
    for (let y = Math.max(r0, SURF); y <= r1; y++) for (let x = 0; x < COLS; x++) {
      const i = ix(x, y), px = wx + x * ts, py = y * ts - camY;
      if (trail[i] > 0.05 && walk[i]) { cx.fillStyle = `rgba(197,255,73,${Math.min(0.45, trail[i] * 0.45)})`; cx.fillRect(px + ts * 0.3, py + ts * 0.3, ts * 0.4, ts * 0.4); }
      if (mark[i] && type[i] !== T_TUN) {
        const ok = diggable(i);
        cx.strokeStyle = ok ? "rgba(197,255,73,.75)" : "rgba(255,90,74,.7)"; cx.lineWidth = Math.max(1, ts * 0.1);
        cx.strokeRect(px + ts * 0.15, py + ts * 0.15, ts * 0.7, ts * 0.7);
        if (prog[i] > 0) { cx.fillStyle = "rgba(20,12,6,.65)"; cx.fillRect(px, py + ts * (1 - prog[i]), ts, ts * prog[i]); }
      }
    }
    // food piles
    for (const p of piles) drawPile(p);
    // eggs
    for (const e of eggs) {
      const px = wx + (e.x + 0.5 + e.ox) * ts, py = (e.y + 0.75) * ts - camY, s = ts * (0.18 + 0.12 * (e.t / HATCH));
      cx.fillStyle = e.t > HATCH * 0.6 ? "#f2ead8" : "#ffffff"; cx.beginPath(); cx.ellipse(px, py, s * 1.3, s, 0, 0, 6.3); cx.fill();
      if (e.sol) { cx.fillStyle = "#b59aff"; cx.fillRect(px - s * 0.3, py - s * 0.3, s * 0.6, s * 0.6); }
    }
    // queen
    drawQueen();
    // ants
    for (const a of ants) {
      const px = wx + a.x * ts, py = a.y * ts - camY;
      if (py < -ts || py > H + ts) continue;
      const sz = ts * (a.sol ? 1.15 : 0.9);
      drawAnt(px, py + (a.cy === SURF ? ts * 0.15 : 0), a.ang, sz, a.heat > 0.3 ? "#5a2a1a" : "#161210", a.ph, a.sol);
      if (a.carry) { cx.fillStyle = "#f1d39a"; cx.beginPath(); cx.arc(px + Math.cos(a.ang) * sz * 0.55, py + Math.sin(a.ang) * sz * 0.55, sz * (0.16 + 0.04 * a.carry), 0, 6.3); cx.fill(); }
      if (a.dirt) { cx.fillStyle = "#a07650"; cx.fillRect(px + Math.cos(a.ang) * sz * 0.55 - sz * 0.16, py + Math.sin(a.ang) * sz * 0.55 - sz * 0.16, sz * 0.32, sz * 0.32); }
      if (a === sel) { cx.strokeStyle = "#c5ff49"; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(px, py, sz * 0.9, 0, 6.3); cx.stroke(); }
    }
    for (const r of reds) drawAnt(wx + r.x * ts, r.y * ts - camY + (r.cy === SURF ? ts * 0.15 : 0), r.ang, ts * 0.95, "#c8322b", r.ph, false);
    if (spider) drawSpider();
    // particles
    for (let k = fx.length - 1; k >= 0; k--) {
      const f = fx[k]; f.life -= dt;
      if (f.life <= 0) { fx.splice(k, 1); continue; }
      if (f.k === "p") { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 6 * dt; cx.globalAlpha = Math.min(1, f.life * 2); cx.fillStyle = f.c; cx.fillRect(wx + f.x * ts, f.y * ts - camY, ts * 0.22, ts * 0.22); cx.globalAlpha = 1; }
      else if (f.k === "s") { f.y -= dt * 0.8; cx.globalAlpha = Math.min(1, f.life); cx.fillStyle = f.c; const s = ts * 0.25 * (1 + Math.sin(f.life * 20) * 0.4); cx.fillRect(wx + f.x * ts - s / 2, f.y * ts - camY - s / 2, s, s); cx.globalAlpha = 1; }
      else if (f.k === "fall") { f.vy += 30 * dt; f.y = Math.min(SURF + 0.6, f.y + f.vy * dt); cx.fillStyle = "#f1d39a"; cx.fillRect(wx + f.x * ts - ts * 0.2, f.y * ts - camY, ts * 0.4, ts * 0.3); if (f.y >= SURF + 0.6) f.life = 0; }
      else if (f.k === "txt") { f.y -= dt * 0.7; label(f.s, wx + f.x * ts, f.y * ts - camY, f.life < 0.4 ? f.life / 0.4 : 1, "#fff"); }
    }
    // rain
    if (rain > 0) {
      cx.strokeStyle = "rgba(200,225,255,.6)"; cx.lineWidth = 1;
      cx.beginPath();
      for (let k = 0; k < 60; k++) { const x = wx + ((k * 97.3 + simT * 40) % ww), y = top + ((k * 53.1 + simT * 300) % skyH); cx.moveTo(x, y); cx.lineTo(x - 2, y + ts * 0.8); }
      cx.stroke();
    }
    if (lens) drawLens();
    // speech bubbles
    for (let k = bubbles.length - 1; k >= 0; k--) {
      const b = bubbles[k]; b.life -= dt;
      if (b.life <= 0 || b.a.hp <= 0) { bubbles.splice(k, 1); continue; }
      speech(b.s, wx + b.a.x * ts, b.a.y * ts - camY - ts * 0.9, Math.min(1, b.life * 2));
    }
    // glass and frame
    cx.fillStyle = "rgba(255,255,255,.035)"; cx.fillRect(wx + ww * 0.06, top, ww * 0.025, ROWS * ts); cx.fillRect(wx + ww * 0.1, top, ww * 0.008, ROWS * ts);
    if (wx > 2) { cx.fillStyle = "#6b4a2b"; cx.fillRect(wx - 10, top - 6, 10, ROWS * ts + 12); cx.fillRect(wx + ww, top - 6, 10, ROWS * ts + 12); cx.fillStyle = "#8a6239"; cx.fillRect(wx - 10, top - 6, 3, ROWS * ts + 12); cx.fillRect(wx + ww, top - 6, 3, ROWS * ts + 12); }
    cx.fillStyle = "#6b4a2b"; cx.fillRect(wx - (wx > 2 ? 10 : 0), top + ROWS * ts, ww + (wx > 2 ? 20 : 0), 12);
    // depth ruler (desktop)
    if (wx > 40) for (let d = 10; d <= DEPTH; d += 10) { const y = (SKY + d) * ts - camY; if (y < 40 || y > H - 60) continue; label(`${d}`, wx - 22, y, 0.6, "#c9b79c"); }
    // minimap
    if (qs.get("shot") !== "1") drawMini();
    if (flyFx) { flyFx.t += dt; const t = flyFx.t, y = (QY - t * 6) * ts - camY, x = wx + (QX + 0.5 + Math.sin(t * 3) * 2) * ts; drawAnt(x, y, -1.57, ts * 2, "#3a1d12", t * 20, false, true); if (t > 6) flyFx = null; }
  }
  function drawAnt(px, py, ang, s, col, ph, sol, wings) {
    cx.save(); cx.translate(px, py); cx.rotate(ang);
    cx.strokeStyle = col; cx.lineWidth = Math.max(0.8, s * 0.07);
    const sw = Math.sin(ph) * s * 0.18;
    cx.beginPath();
    for (let k = -1; k <= 1; k++) { const o = (k % 2 === 0 ? sw : -sw); cx.moveTo(k * s * 0.12, 0); cx.lineTo(k * s * 0.18 + o, -s * 0.38); cx.moveTo(k * s * 0.12, 0); cx.lineTo(k * s * 0.18 - o, s * 0.38); }
    cx.moveTo(s * 0.36, -s * 0.05); cx.lineTo(s * 0.55, -s * 0.22); cx.moveTo(s * 0.36, s * 0.05); cx.lineTo(s * 0.55, s * 0.22);
    cx.stroke();
    if (wings) { cx.fillStyle = "rgba(220,235,255,.6)"; cx.beginPath(); cx.ellipse(-s * 0.1, -s * 0.35, s * 0.4, s * 0.15, -0.5, 0, 6.3); cx.ellipse(-s * 0.1, s * 0.35, s * 0.4, s * 0.15, 0.5, 0, 6.3); cx.fill(); }
    cx.fillStyle = col;
    cx.beginPath(); cx.ellipse(-s * 0.3, 0, s * 0.24, s * 0.17, 0, 0, 6.3); cx.fill();
    cx.beginPath(); cx.ellipse(0, 0, s * 0.13, s * 0.09, 0, 0, 6.3); cx.fill();
    cx.beginPath(); cx.ellipse(s * 0.25, 0, sol ? s * 0.17 : s * 0.12, sol ? s * 0.15 : s * 0.11, 0, 0, 6.3); cx.fill();
    cx.restore();
  }
  function drawQueen() {
    const px = offX + (QX + 0.5) * ts, py = (QY + 0.55) * ts - camY;
    if (py < -40 || py > H + 40) return;
    const s = ts * 2.1, bob = Math.sin(simT * 1.5) * ts * 0.05;
    drawAnt(px, py + bob, Math.PI, s, G.qhp < 6 ? "#7a1f14" : "#3a1d12", simT * 2, false);
    cx.fillStyle = "#ffd23e";
    const cxp = px - s * 0.25, cyp = py + bob - s * 0.18;
    cx.fillRect(cxp - s * 0.12, cyp - s * 0.05, s * 0.24, s * 0.06);
    cx.fillRect(cxp - s * 0.12, cyp - s * 0.14, s * 0.05, s * 0.1); cx.fillRect(cxp - s * 0.025, cyp - s * 0.17, s * 0.05, s * 0.13); cx.fillRect(cxp + s * 0.07, cyp - s * 0.14, s * 0.05, s * 0.1);
    if (G.qhp < 12) { const w = ts * 2; cx.fillStyle = "#0009"; cx.fillRect(px - w / 2, py - ts * 1.2, w, 3); cx.fillStyle = G.qhp < 5 ? "#ff5a4a" : "#c5ff49"; cx.fillRect(px - w / 2, py - ts * 1.2, w * G.qhp / 12, 3); }
  }
  function drawPile(p) {
    const px = offX + (p.x + 0.5) * ts, py = (SURF + 1) * ts - camY;
    const s = ts * (0.35 + 0.5 * Math.min(1, p.u / 20)) * (0.6 + 0.4 * (p.u / p.max));
    const col = { crumb: "#f1d39a", cheerio: "#e8b24e", apple: "#e2463a", chip: "#f2c94c", donut: "#ff9fc8", candy: "#ff9a2e", spider: "#3a3a3a", worm: "#e88a8a" }[p.k] || "#f1d39a";
    cx.fillStyle = col;
    if (p.k === "cheerio" || p.k === "donut") { cx.beginPath(); cx.arc(px, py - s * 0.6, s * 0.7, 0, 6.3); cx.fill(); cx.fillStyle = p.k === "donut" ? "#c98b5a" : "#8d6a2a"; cx.beginPath(); cx.arc(px, py - s * 0.6, s * 0.25, 0, 6.3); cx.fill(); if (p.k === "donut") { cx.fillStyle = "#fff"; cx.fillRect(px - s * 0.4, py - s, s * 0.12, s * 0.12); cx.fillStyle = "#3d7bf0"; cx.fillRect(px + s * 0.2, py - s * 0.9, s * 0.12, s * 0.12); } }
    else if (p.k === "apple") { cx.beginPath(); cx.moveTo(px - s, py); cx.lineTo(px + s, py); cx.lineTo(px, py - s * 1.2); cx.fill(); cx.fillStyle = "#fff4d6"; cx.beginPath(); cx.moveTo(px - s * 0.7, py); cx.lineTo(px + s * 0.7, py); cx.lineTo(px, py - s * 0.85); cx.fill(); }
    else if (p.k === "candy") { cx.fillStyle = "#fff"; cx.beginPath(); cx.moveTo(px - s * 0.6, py); cx.lineTo(px + s * 0.6, py); cx.lineTo(px, py - s * 1.3); cx.fill(); cx.fillStyle = "#ff9a2e"; cx.fillRect(px - s * 0.45, py - s * 0.45, s * 0.9, s * 0.45); cx.fillStyle = "#ffd23e"; cx.fillRect(px - s * 0.6, py - s * 0.15, s * 1.2, s * 0.15); }
    else if (p.k === "worm") { cx.strokeStyle = col; cx.lineWidth = ts * 0.3; cx.beginPath(); for (let k = 0; k <= 6; k++) { const x = px - s + (k / 6) * s * 2, y = py - ts * 0.2 + Math.sin(k + simT * 3) * ts * 0.15; k ? cx.lineTo(x, y) : cx.moveTo(x, y); } cx.stroke(); }
    else if (p.k === "spider") { cx.beginPath(); cx.ellipse(px, py - s * 0.4, s, s * 0.45, 0, 0, 6.3); cx.fill(); }
    else { cx.beginPath(); cx.ellipse(px, py - s * 0.4, s * 0.8, s * 0.45, 0, 0, 6.3); cx.fill(); cx.fillStyle = "#c9a56a"; cx.fillRect(px - s * 0.3, py - s * 0.55, s * 0.18, s * 0.12); }
    if (p.drop && p.age < 0.6) { cx.globalAlpha = 1 - p.age / 0.6; label(`+${p.u}`, px, py - ts * 1.6, 1, "#c5ff49"); cx.globalAlpha = 1; }
  }
  function drawPumpkin(px, py) {
    const s = ts * 1.1;
    cx.fillStyle = "#ff8a1e"; cx.beginPath(); cx.ellipse(px, py - s * 0.6, s * 0.9, s * 0.65, 0, 0, 6.3); cx.fill();
    cx.fillStyle = "#3d7a2a"; cx.fillRect(px - s * 0.08, py - s * 1.45, s * 0.16, s * 0.3);
    cx.fillStyle = "#2a1205"; cx.fillRect(px - s * 0.45, py - s * 0.85, s * 0.2, s * 0.2); cx.fillRect(px + s * 0.25, py - s * 0.85, s * 0.2, s * 0.2); cx.fillRect(px - s * 0.4, py - s * 0.45, s * 0.8, s * 0.12);
  }
  function drawSpider() {
    const s = spider, px = offX + s.x * ts, py = (SURF + 0.55) * ts - camY, z = ts * 1.5;
    cx.strokeStyle = "#1a1a1a"; cx.lineWidth = Math.max(1, ts * 0.12);
    cx.beginPath();
    for (let k = 0; k < 4; k++) for (const sd of [-1, 1]) { const w = Math.sin(s.ph + k * 1.3 + (sd > 0 ? 0 : 2)) * z * 0.15; cx.moveTo(px, py - z * 0.2); cx.lineTo(px + sd * z * (0.35 + k * 0.12), py - z * 0.65 + w); cx.lineTo(px + sd * z * (0.5 + k * 0.18), py + z * 0.2); }
    cx.stroke();
    cx.fillStyle = "#222"; cx.beginPath(); cx.ellipse(px - s.dir * z * 0.25, py - z * 0.3, z * 0.38, z * 0.3, 0, 0, 6.3); cx.fill();
    cx.beginPath(); cx.arc(px + s.dir * z * 0.2, py - z * 0.25, z * 0.2, 0, 6.3); cx.fill();
    cx.fillStyle = "#ff3b3b"; cx.fillRect(px + s.dir * z * 0.28 - 1, py - z * 0.32, 2, 2); cx.fillRect(px + s.dir * z * 0.2 - 1, py - z * 0.35, 2, 2);
    const w = ts * 2.4; cx.fillStyle = "#0009"; cx.fillRect(px - w / 2, py - z * 1.2, w, 3); cx.fillStyle = "#ff5a4a"; cx.fillRect(px - w / 2, py - z * 1.2, w * Math.max(0, s.hp) / s.max, 3);
  }
  function lensPos() { return { x: offX + lens.x * ts + Math.sin(lens.shake * 40) * lens.shake * 10, y: (SURF - 3.2) * ts - camY }; }
  function drawLens() {
    const { x, y } = lensPos(), r = ts * 2.2, gy = (SURF + 0.7) * ts - camY;
    // beam
    cx.fillStyle = "rgba(255,240,170,.18)"; cx.beginPath(); cx.moveTo(x - r * 0.8, y); cx.lineTo(x + r * 0.8, y); cx.lineTo(x + ts * 0.3, gy); cx.lineTo(x - ts * 0.3, gy); cx.fill();
    const hot = cx.createRadialGradient(x, gy, 0, x, gy, ts * 1.1); hot.addColorStop(0, "rgba(255,255,220,.95)"); hot.addColorStop(0.4, "rgba(255,200,60,.6)"); hot.addColorStop(1, "rgba(255,120,0,0)");
    cx.fillStyle = hot; cx.beginPath(); cx.arc(x, gy, ts * 1.1, 0, 6.3); cx.fill();
    // handle + lens
    cx.strokeStyle = "#6b3f1f"; cx.lineWidth = ts * 0.6; cx.beginPath(); cx.moveTo(x + r * 0.7, y - r * 0.7); cx.lineTo(x + r * 2.2, y - r * 2.6); cx.stroke();
    cx.fillStyle = "rgba(190,230,255,.35)"; cx.strokeStyle = "#333"; cx.lineWidth = ts * 0.35; cx.beginPath(); cx.arc(x, y, r, 0, 6.3); cx.fill(); cx.stroke();
    cx.fillStyle = "rgba(255,255,255,.6)"; cx.fillRect(x - r * 0.5, y - r * 0.5, r * 0.25, r * 0.12);
    label("tap!", x, y - r - 8, 0.6 + 0.4 * Math.sin(simT * 8), "#fff");
    if (lens.shake > 0) lens.shake = Math.max(0, lens.shake - 0.05);
  }
  function label(s, x, y, a, col) {
    cx.globalAlpha = a; cx.font = `800 ${Math.max(10, Math.round(ts * 1.1))}px ui-monospace, Menlo, Consolas, monospace`; cx.textAlign = "center"; cx.textBaseline = "middle";
    cx.fillStyle = "#000"; cx.fillText(s, x + 1, y + 1); cx.fillStyle = col; cx.fillText(s, x, y); cx.globalAlpha = 1;
  }
  function speech(s, x, y, a) {
    cx.globalAlpha = a; cx.font = `700 ${phone ? 11 : 12}px ui-monospace, Menlo, Consolas, monospace`; cx.textAlign = "center"; cx.textBaseline = "middle";
    const w = cx.measureText(s).width + 12, h = 20, bx = clamp(x, w / 2 + 4, W - w / 2 - 4);
    cx.fillStyle = "#f5f3ed"; cx.fillRect(bx - w / 2, y - h - 6, w, h);
    cx.beginPath(); cx.moveTo(x - 4, y - 6); cx.lineTo(x + 4, y - 6); cx.lineTo(x, y); cx.fill();
    cx.fillStyle = "#101114"; cx.fillText(s, bx, y - h / 2 - 6); cx.globalAlpha = 1;
  }
  const MINI_W = 10;
  function miniRect() { const h = Math.min(H - 140, 260), x = W - MINI_W - 6, y = 54; return { x, y, w: MINI_W, h }; }
  function drawMini() {
    const m = miniRect(), sy = m.h / ROWS, sx = m.w / COLS;
    cx.fillStyle = "rgba(0,0,0,.55)"; cx.fillRect(m.x - 2, m.y - 2, m.w + 4, m.h + 4);
    cx.fillStyle = "#6b4a2b"; cx.fillRect(m.x, m.y + SKY * sy, m.w, (ROWS - SKY) * sy);
    cx.fillStyle = "#c5ff49";
    if (!drawMini.n || simT - drawMini.t > 1) { drawMini.t = simT; drawMini.rows = []; for (let y = SKY; y < ROWS; y++) { let any = 0; for (let x = 0; x < COLS; x++) if (type[ix(x, y)] === T_TUN) { any = 1; break; } drawMini.rows.push(any); } drawMini.n = 1; }
    for (let y = SKY; y < ROWS; y++) if (drawMini.rows[y - SKY]) cx.fillRect(m.x + 2, m.y + y * sy, m.w - 4, Math.max(1, sy));
    const vy = m.y + (camY / (ROWS * ts)) * m.h, vh = (H / (ROWS * ts)) * m.h;
    cx.strokeStyle = "#fff"; cx.lineWidth = 1; cx.strokeRect(m.x - 1.5, Math.max(m.y - 1.5, vy), m.w + 3, Math.min(vh, m.h));
  }

  // ---------- fx helpers ----------
  function puff(x, y, c, n) { for (let k = 0; k < n; k++) fx.push({ k: "p", x, y, vx: (R() - 0.5) * 3, vy: -R() * 3, c, life: 0.6 + R() * 0.4 }); }
  function sparkle(x, y) { for (let k = 0; k < 12; k++) fx.push({ k: "s", x: x + (R() - 0.5) * 2, y: y + (R() - 0.5) * 2, c: pick(["#c5ff49", "#ffd23e", "#fff"]), life: 0.8 + R() * 0.7 }); }
  function nearestAnt(i) { const x = i % COLS, y = (i / COLS) | 0; let b = null, bd = 1e9; for (const a of ants) { const d = Math.abs(a.x - x) + Math.abs(a.y - y); if (d < bd) { bd = d; b = a; } } return b; }
  function bubbleOn(a, s) { if (a && bubbles.length < 3) bubbles.push({ a, s, life: 3.4 }); }
  const LINES = {
    forage: ["this crumb is my whole life", "heavy. worth it.", "for the queen!!", "smells like snack", "i lift"],
    carry: ["coming through", "do NOT drop it", "i carried this 8 tiles"],
    dig: ["who designed this tunnel", "dirt. more dirt.", "i have a shovel for a face", "i dig it", "how deep do we go"],
    idle: ["on break", "i saw the sun once", "do we get weekends", "just vibing", "is the glass watching us"],
    soldier: ["i was born ready. like, today", "nobody touches the queen", "i bite"],
    halloween: ["boo. that's ant for hello", "trick or treat (treat pls)"]
  };
  let chatT = 8;
  function chatter(dt) {
    chatT -= dt;
    if (chatT > 0 || !ants.length) return;
    chatT = 14 + R() * 14;
    const vis = ants.filter((a) => { const y = a.y * ts - camY; return y > 60 && y < H - 90; });
    if (!vis.length) return;
    const a = pick(vis);
    const set = halloween && R() < 0.25 ? LINES.halloween : a.sol ? LINES.soldier : a.carry ? LINES.carry : LINES[a.task] || LINES.idle;
    bubbleOn(a, pick(set));
  }

  // ---------- audio ----------
  let actx = null, muted = false, lastSfx = {};
  function ac() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === "suspended") actx.resume(); } catch (e) { actx = null; } return actx; }
  function tone(f, d, type, v, at, slide) {
    const a = actx; if (!a || muted) return;
    const t = a.currentTime + (at || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || "square"; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime(v || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.02);
  }
  function sfx(k) {
    if (muted || !actx) return;
    const now = performance.now();
    if (lastSfx[k] && now - lastSfx[k] < (k === "tick" || k === "dig" ? 120 : 60)) return;
    lastSfx[k] = now;
    if (k === "crumb") tone(520 + R() * 80, 0.09, "triangle", 0.06, 0, 300);
    else if (k === "tick") tone(1400, 0.03, "square", 0.012);
    else if (k === "dig") tone(110 + R() * 30, 0.07, "triangle", 0.05, 0, 70);
    else if (k === "hatch") { tone(660, 0.08, "triangle", 0.04); tone(990, 0.1, "triangle", 0.04, 0.07); }
    else if (k === "treasure") [523, 659, 784, 1046].forEach((f, j) => tone(f, 0.12, "square", 0.04, j * 0.07));
    else if (k === "alert") { tone(220, 0.18, "sawtooth", 0.05); tone(196, 0.25, "sawtooth", 0.05, 0.2); }
    else if (k === "bad") tone(180, 0.2, "sawtooth", 0.05, 0, 90);
    else if (k === "bite") tone(300, 0.05, "square", 0.03, 0, 150);
    else if (k === "sizzle") tone(2000, 0.25, "sawtooth", 0.02, 0, 600);
    else if (k === "buy") { tone(784, 0.07, "square", 0.04); tone(1175, 0.1, "square", 0.04, 0.06); }
    else if (k === "shoo") tone(440, 0.08, "square", 0.05, 0, 880);
  }
  const muteBtn = $("mute");
  function setMute(m) { muted = m; muteBtn.textContent = muted ? "sound off" : "sound on"; try { localStorage.setItem("antfarm-mute", m ? "1" : "0"); } catch (e) { /* fine */ } }
  try { if (localStorage.getItem("antfarm-mute") === "1") setMute(true); } catch (e) { /* fine */ }
  muteBtn.onclick = () => { ac(); setMute(!muted); };

  // ---------- ui ----------
  const toastBox = $("toast");
  function toast(s, cls) {
    const d = document.createElement("div"); d.textContent = s; if (cls) d.className = cls;
    toastBox.appendChild(d);
    while (toastBox.children.length > 3) toastBox.firstChild.remove();
    setTimeout(() => d.remove(), cls === "coach" ? 7000 : 3600);
  }
  const fmt = (n) => { n = Math.floor(n); return n >= 1e6 ? (n / 1e6).toFixed(1) + "m" : n >= 1e4 ? (n / 1e3).toFixed(1) + "k" : String(n); };
  let tool = "feed", spd = 1, over = false, paused = false, started = false, sel = null;
  const tools = { feed: $("tFeed"), dig: $("tDig"), look: $("tLook") };
  function setTool(t) { tool = t; for (const k in tools) tools[k].classList.toggle("on", k === t); tools.dig.classList.remove("ping"); if (t !== "look") sel = null; }
  tools.feed.onclick = () => setTool("feed");
  tools.dig.onclick = () => { setTool("dig"); if (G.tut === 2) coach("drag on the dirt next to a tunnel. ants dig what you paint."); };
  tools.look.onclick = () => setTool("look");
  $("tSpeed").onclick = () => { spd = spd === 1 ? 2 : spd === 2 ? 3 : 1; $("tSpeed").querySelector("small").textContent = spd + "x"; };
  $("tColony").onclick = () => openSheet();
  function updHud() {
    $("hFood").textContent = fmt(G.food);
    $("hAnts").textContent = ants.length;
    $("hCap").textContent = "/" + capacity();
    $("hEggs").textContent = eggs.length;
    $("hJellyC").hidden = !G.jelly; $("hJelly").textContent = G.jelly;
    const canBuy = UPS.some((u) => avail(u) && G.food >= upCost(u));
    $("tColony").classList.toggle("ping", canBuy && G.tut >= 4);
  }
  const avail = (u) => (G.up[u.id] || 0) < u.max && (!u.need || G.up[u.need]);

  // colony sheet
  const sheet = $("sheet"), pane = $("pane");
  let tab = "up";
  function openSheet(t) { if (t) tab = t; sheet.hidden = false; renderPane(); if (G.tut === 4) { G.tut = 5; } }
  function closeSheet() { sheet.hidden = true; }
  $("close").onclick = closeSheet;
  sheet.addEventListener("pointerdown", (e) => { if (e.target === sheet) closeSheet(); });
  sheet.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => { tab = b.dataset.tab; renderPane(); }));
  function renderPane() {
    sheet.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
    let h = "";
    if (tab === "up") {
      h += `<div class="muted" style="margin-bottom:8px">food: <b style="color:#c5ff49">${fmt(G.food)}</b> · spend it here or on eggs (${EGG_COST} each)</div>`;
      for (const u of UPS) {
        if (u.need && !G.up[u.need]) continue;
        const lv = G.up[u.id] || 0, maxed = lv >= u.max, c = upCost(u);
        h += `<div class="row"><div class="t"><div>${u.name} ${u.max > 1 ? `<span class="lvl">lv ${lv}/${u.max}</span>` : ""}</div><div>${u.desc}</div></div><button type="button" data-buy="${u.id}" ${maxed || G.food < c ? "disabled" : ""}>${maxed ? "done" : fmt(c) + " food"}</button></div>`;
      }
    } else if (tab === "jobs") {
      const w = ants.filter((a) => !a.sol).length, s = ants.length - w;
      h += `<div class="row"><div class="t"><div>diggers vs foragers</div><div>${Math.round(G.digShare * 100)}% of workers dig when there are tunnels to dig. the rest bring food.</div><input type="range" min="0" max="100" step="5" value="${Math.round(G.digShare * 100)}" data-share="dig"></div></div>`;
      if (G.up.soldier) h += `<div class="row"><div class="t"><div>soldier eggs</div><div>${Math.round(G.solShare * 100)}% of new eggs become soldiers. soldiers don't forage.</div><input type="range" min="0" max="60" step="5" value="${Math.round(G.solShare * 100)}" data-share="sol"></div></div>`;
      h += `<div class="row"><div class="t"><div>the queen</div><div>${G.lay !== false ? `laying eggs (${EGG_COST} food each) whenever there's room` : "resting. food piles up for upgrades"}</div></div><button type="button" data-lay="1">${G.lay !== false ? "pause" : "lay eggs"}</button></div>`;
      h += `<div class="row"><div class="t"><div>right now</div><div>${w} workers (${jobCounts.dig} digging, ${jobCounts.forage} foraging, ${jobCounts.idle} on break) · ${s} soldiers · room for ${capacity()} · ${tunCount} tunnel tiles · deepest ${G.gs.maxDepth}</div></div></div>`;
      h += `<div class="row"><div class="t"><div>marks</div><div>clear every dig mark you've painted.</div></div><button type="button" data-clear="1">clear</button></div>`;
    } else if (tab === "cur") {
      const n = Object.keys(G.curios).length;
      h += `<div class="muted" style="margin-bottom:8px">${n}/${CURIOS.length} curios found. deeper dirt hides better stuff. the book is kept across generations.</div><div class="cur">`;
      for (const c of CURIOS) { const got = G.curios[c.id]; h += `<div class="${got ? "" : "no"}">${got ? c.name : "???"}<br><span class="muted">${got ? `found ${got}x · +${c.food} food${c.jelly ? ` · +${c.jelly} jelly first time` : ""}` : `somewhere ${c.d[0]}-${c.d[1]} deep`}</span></div>`; }
      h += "</div>";
    } else if (tab === "fly") {
      const gain = Math.floor(G.gs.peak / 10) + Math.floor(G.gs.maxDepth / 25), ready = ants.length >= 50;
      h += `<div class="row"><div class="t"><div>generation ${G.gen}</div><div>peak ${G.gs.peak} ants · ${fmt(G.gs.hauled)} food hauled · ${G.gs.maxDepth} deep · queen health ${Math.ceil(G.qhp)}/12</div></div></div>`;
      h += `<div class="row"><div class="t"><div>royal jelly: ${G.jelly}</div><div>each jelly makes every ant 4% faster at walking, digging and laying. kept forever.</div></div></div>`;
      h += `<div class="row"><div class="t"><div>nuptial flight</div><div>${ready ? `send a new queen off now for +${gain} royal jelly. the farm starts over with a fresh dig.` : `needs 50 ants (you have ${ants.length}). you'd get +${gain} jelly right now.`}</div></div><button type="button" data-fly="1" ${ready && gain > 0 ? "" : "disabled"}>fly</button></div>`;
      h += `<div class="row"><div class="t"><div>lifetime</div><div>${fmt(G.life.hauled)} food hauled · ${fmt(G.life.dug)} tiles dug · ${fmt(G.life.hatched)} ants hatched · ${G.life.flights} flights · ${G.life.kills} enemies bitten</div></div></div>`;
    }
    pane.innerHTML = h;
  }
  pane.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.buy) { const u = UPS.find((x) => x.id === b.dataset.buy), c = upCost(u); if (G.food >= c && avail(u)) { G.food -= c; G.up[u.id] = (G.up[u.id] || 0) + 1; sfx("buy"); if (u.id === "drill" || u.id === "rooms") dirty.dig = true; if (u.id === "armor") for (const a of ants) if (a.sol) a.hp = solHp(); toast(`${u.name}: ${u.desc}`); save(); } renderPane(); }
    if (b.dataset.lay) { G.lay = G.lay === false; renderPane(); }
    if (b.dataset.clear) { mark.fill(0); dirty.dig = true; toast("marks cleared"); }
    if (b.dataset.fly) { closeSheet(); flight(); }
  });
  pane.addEventListener("input", (e) => {
    const t = e.target; if (!t.dataset.share) return;
    if (t.dataset.share === "dig") G.digShare = t.value / 100; else G.solShare = t.value / 100;
    const d = t.previousElementSibling; if (d) d.textContent = t.dataset.share === "dig" ? `${t.value}% of workers dig when there are tunnels to dig. the rest bring food.` : `${t.value}% of new eggs become soldiers. soldiers don't forage.`;
    recount(); rebalance();
  });

  // overlays
  const overEl = $("over"), overBox = $("overBox");
  function showOver(h2, p, btn, fn) {
    overBox.innerHTML = `<h2>${h2}</h2><p>${p}</p><button class="go" type="button" id="ovGo">${btn}</button><br><button class="alt" type="button" id="ovShare">share</button><div class="credit">computer cooked games</div>`;
    overEl.hidden = false;
    $("ovGo").onclick = () => { overEl.hidden = true; fn(); };
    $("ovShare").onclick = () => share();
  }

  // tutorial
  function coach(s) { toast(s, "coach"); }
  let tutT = 0;
  function tutorial() {
    if (G.tut >= 9) return;
    tutT += 1 / 30;
    if (G.tut === 0 && tutT > 1) { coach("tap the grass to drop crumbs. your ants will haul them to the queen."); G.tut = 1; tutT = 0; }
    else if (G.tut === 1 && (G.tCrumbs || 0) >= 3 && G.life.hatched >= 1) { coach("food becomes eggs. eggs become ants. now pick ⛏ dig."); tools.dig.classList.add("ping"); G.tut = 2; tutT = 0; }
    else if (G.tut === 1 && tutT > 25) { coach("tap anywhere above the dirt to drop a crumb"); tutT = 0; }
    else if (G.tut === 2 && digSources && tutT > 2) { coach("good. more tunnel = more room for ants (see ants n/room up top)."); G.tut = 3; tutT = 0; }
    else if (G.tut === 3 && G.food >= 30) { coach("you can afford an upgrade. open 🏠 colony."); G.tut = 4; tutT = 0; }
    else if (G.tut === 5 && tutT > 20) { coach("deeper dirt hides curios. 🔍 look lets you tap an ant to meet it."); G.tut = 9; }
  }

  // ---------- input ----------
  const ptrs = new Map();
  let drag = null;
  function cellAt(sx, sy) { return { x: Math.floor((sx - offX) / ts), y: Math.floor((sy + camY) / ts) }; }
  function inMini(sx, sy) { const m = miniRect(); return sx >= m.x - 10 && sx <= m.x + m.w + 6 && sy >= m.y - 4 && sy <= m.y + m.h + 4; }
  function miniScroll(sy) { const m = miniRect(); camY = clampCam(((sy - m.y) / m.h) * ROWS * ts - H / 2); }
  function hitLens(sx, sy) { if (!lens) return false; const p = lensPos(); return Math.hypot(sx - p.x, sy - p.y) < ts * 3.2; }
  function paint(sx, sy, erase) {
    const c = cellAt(sx, sy);
    const rad = ts < 9 ? 1 : 0;
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      if (rad && Math.abs(dx) + Math.abs(dy) > 1) continue;
      const x = c.x + dx, y = c.y + dy;
      if (x < 0 || x >= COLS || y <= SKY - 1 || y >= ROWS - 1) continue;
      const i = ix(x, y);
      if (type[i] === T_TUN || type[i] === T_BED) continue;
      if (erase) { if (mark[i]) { mark[i] = 0; dirty.dig = true; } }
      else if (!mark[i]) { mark[i] = 1; dirty.dig = true; marksPainted++; if (type[i] === T_ROCK && !G.up.drill) rockHint(); }
    }
  }
  let marksPainted = 0, rockT = -99;
  function rockHint() { if (simT - rockT > 15) { rockT = simT; toast("that's stone. ants need rock chewers (colony) for it.", "bad"); } }
  cv.addEventListener("pointerdown", (e) => {
    if (!started || over) return;
    ac();
    cv.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) { drag = { k: "pan2", y: avgY(), cam: camY }; return; }
    const sx = e.clientX, sy = e.clientY;
    if (hitLens(sx, sy)) { lens.hp--; lens.shake = 1; sfx("shoo"); fx.push({ k: "txt", x: lens.x, y: SURF - 5.5, s: pick(["hey!", "stop it", "go away kid", "shoo!"]), life: 0.9 }); drag = { k: "none" }; return; }
    if (inMini(sx, sy)) { drag = { k: "mini" }; miniScroll(sy); return; }
    if (tool === "dig") { const c = cellAt(sx, sy); const i = c.x >= 0 && c.x < COLS && c.y >= 0 && c.y < ROWS ? ix(c.x, c.y) : -1; const erase = i >= 0 && !!mark[i]; drag = { k: "paint", erase }; paint(sx, sy, erase); return; }
    drag = { k: "tap", sx, sy, cam: camY, moved: false };
  });
  const avgY = () => { let s = 0; for (const p of ptrs.values()) s += p.y; return s / ptrs.size; };
  cv.addEventListener("pointermove", (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!drag) return;
    if (drag.k === "pan2") { camY = clampCam(drag.cam - (avgY() - drag.y)); return; }
    if (drag.k === "mini") { miniScroll(e.clientY); return; }
    if (drag.k === "paint") { paint(e.clientX, e.clientY, drag.erase); return; }
    if (drag.k === "tap") {
      const dy = e.clientY - drag.sy;
      if (Math.abs(dy) > 8 || Math.abs(e.clientX - drag.sx) > 8) drag.moved = true;
      if (drag.moved) camY = clampCam(drag.cam - dy);
    }
  });
  function up(e) {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (drag && drag.k === "tap" && !drag.moved && ptrs.size === 0) tap(drag.sx, drag.sy);
    if (ptrs.size === 0) drag = null;
  }
  cv.addEventListener("pointerup", up);
  cv.addEventListener("pointercancel", up);
  cv.addEventListener("wheel", (e) => { e.preventDefault(); camY = clampCam(camY + e.deltaY); }, { passive: false });
  function tap(sx, sy) {
    const c = cellAt(sx, sy);
    if (tool === "feed") {
      if (c.x < 0 || c.x >= COLS) return;
      if (c.y > SKY + 1) { toast("crumbs go on the grass up top"); return; }
      dropCrumb(c.x);
    } else if (tool === "look") {
      let b = null, bd = 1.6;
      const wxp = (sx - offX) / ts, wyp = (sy + camY) / ts;
      for (const a of ants) { const d = Math.hypot(a.x - wxp, a.y - wyp); if (d < bd) { bd = d; b = a; } }
      sel = b;
      if (b) {
        const job = b.sol ? "soldier" : b.carry ? `hauling ${b.carry} crumb${b.carry > 1 ? "s" : ""}` : b.dirt ? "carrying dirt up" : b.digAt >= 0 ? "digging" : b.task === "forage" ? "off to find food" : b.task === "dig" ? "off to dig" : "on break";
        toast(`${b.name} · ${job} · hauled ${b.hauled} so far`);
        bubbleOn(b, pick(b.sol ? LINES.soldier : LINES[b.task] || LINES.idle));
      } else if (Math.abs(c.x - QX) <= 2 && Math.abs(c.y - QY) <= 1) toast(`the queen · laying every ${eggEvery().toFixed(1)}s when there's food and room · health ${Math.ceil(G.qhp)}/12`);
    }
  }
  addEventListener("keydown", (e) => {
    if (!started) { if (e.key === "Enter" || e.key === " ") begin(); return; }
    const k = e.key.toLowerCase();
    if (k === "1") setTool("feed"); else if (k === "2") setTool("dig"); else if (k === "3") setTool("look");
    else if (k === "m") setMute(!muted);
    else if (k === "c") sheet.hidden ? openSheet() : closeSheet();
    else if (k === "escape") closeSheet();
    else if (k === "arrowdown" || k === "s") camY = clampCam(camY + ts * 4);
    else if (k === "arrowup" || k === "w") camY = clampCam(camY - ts * 4);
    else if (k === " ") { ac(); dropCrumb(Math.floor(R() * COLS)); e.preventDefault(); }
  });
  addEventListener("message", (e) => {
    const d = e.data || {};
    if (d.type === "cc-mute") setMute(!!d.muted);
    else if (d.type === "cc-pause") paused = typeof d.paused === "boolean" ? d.paused : !paused;
    else if (d.type === "cc-restart") { closeSheet(); camY = clampCam((SKY - 7) * ts); }
  });

  // ---------- share ----------
  function share() {
    const c = document.createElement("canvas"); c.width = 1080; c.height = 1080;
    const g = c.getContext("2d");
    g.fillStyle = "#211a13"; g.fillRect(0, 0, 1080, 1080);
    g.drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, 1080, cv.height * 1080 / cv.width);
    g.fillStyle = "#101114e6"; g.fillRect(0, 720, 1080, 360);
    g.fillStyle = "#c5ff49"; g.font = "800 72px ui-monospace, Menlo, Consolas, monospace"; g.fillText("ant farm", 60, 810);
    g.fillStyle = "#f5f3ed"; g.font = "700 40px ui-monospace, Menlo, Consolas, monospace";
    g.fillText(`generation ${G.gen} · ${G.gs.peak} ants · ${G.gs.maxDepth} deep`, 60, 880);
    g.fillText(`${fmt(G.gs.hauled)} food hauled · ${Object.keys(G.curios).length}/${CURIOS.length} curios`, 60, 935);
    g.fillStyle = "#b59aff"; g.fillText("computercooked.com/games/ant-farm", 60, 1020);
    const text = `my ant colony hit ${G.gs.peak} ants and dug ${G.gs.maxDepth} deep. computercooked.com/games/ant-farm`;
    c.toBlob(async (blob) => {
      try {
        const file = blob && new File([blob], "ant-farm.png", { type: "image/png" });
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
        if (navigator.share) { await navigator.share({ text }); return; }
      } catch (e) { /* cancelled */ }
      try { await navigator.clipboard.writeText(text); toast("copied to clipboard"); } catch (e) { toast(text); }
    }, "image/png");
  }

  // ---------- save / load ----------
  function rle(arr, from, to) { let s = "", prev = -1, n = 0; for (let i = from; i < to; i++) { const v = arr[i]; if (v === prev) n++; else { if (n) s += prev + (n > 1 ? "x" + n : "") + ","; prev = v; n = 1; } } if (n) s += prev + (n > 1 ? "x" + n : "") + ","; return s; }
  function unrle(s, arr, from) { let i = from; for (const part of s.split(",")) { if (!part) continue; const [v, n] = part.split("x"); const c = n ? +n : 1; for (let k = 0; k < c; k++) arr[i++] = +v; } }
  function snapshot() {
    const marks = [], tr = [];
    for (let i = 0; i < N; i++) { if (mark[i]) marks.push(i); if (tre[i] >= 0) tr.push(i, tre[i]); }
    return {
      v: 1, t: Date.now(), G,
      w: { type: rle(type, 0, N), marks, tr, mound: Array.from(mound, (m) => Math.round(m)), piles: piles.map((p) => [p.x, p.u, p.k]), eggs: eggs.map((e) => [e.x, e.y, Math.round(e.t), e.sol ? 1 : 0]), ants: ants.map((a) => [a.cx, a.cy, a.sol ? 1 : 0, a.name, a.hauled]), home: homeCells }
    };
  }
  let lastSave = 0;
  function save() {
    if (!G || !started) return;
    lastSave = performance.now();
    const d = snapshot();
    if (window.cc && cc.save) sdk((c) => c.save("main", d));
    else try { localStorage.setItem("antfarm-save", JSON.stringify(d)); } catch (e) { /* full */ }
  }
  async function load() {
    try { if (window.cc && cc.load) return await cc.load("main"); } catch (e) { /* fall through */ }
    try { return JSON.parse(localStorage.getItem("antfarm-save")); } catch (e) { return null; }
  }
  function restore(d) {
    G = d.G;
    G.up = G.up || {}; G.curios = G.curios || {}; G.ach = G.ach || {}; G.life = G.life || { hauled: 0, dug: 0, hatched: 0, flights: 0, kills: 0 }; G.gs = G.gs || { peak: 0, hauled: 0, born: Date.now(), maxDepth: 0 };
    const w = d.w;
    unrle(w.type, type, 0); mark.fill(0); tre.fill(-1); prog.fill(0); trail.fill(0);
    for (const i of w.marks || []) mark[i] = 1;
    for (let k = 0; k + 1 < (w.tr || []).length; k += 2) tre[w.tr[k]] = w.tr[k + 1];
    mound.fill(0); (w.mound || []).forEach((m, i) => (mound[i] = m));
    piles = (w.piles || []).map(([x, u, k]) => ({ x, u, max: u, k, age: 0 }));
    eggs = (w.eggs || []).map(([x, y, t, s]) => ({ x, y, t, sol: !!s, ox: R() * 0.6 - 0.3 }));
    homeCells = w.home && w.home.length ? w.home : [QCELL];
    rebuildWalk();
    ants = [];
    for (const [x, y, s, name, h] of w.ants || []) { const a = newAnt(x, y, s, name); a.hauled = h || 0; }
    // offline progress (capped at 4 hours)
    const away = Math.min(4 * 3600, Math.max(0, (Date.now() - (d.t || Date.now())) / 1000));
    if (away > 120) {
      const foragers = Math.max(1, Math.round(ants.filter((a) => !a.sol).length * (1 - G.digShare)));
      const gain = Math.floor(away * (foragers * 0.035 * carryN() + (G.up.fungus || 0) * 0.012 * ants.length) * jm());
      const eat = Math.floor(away * (ants.length / 60 + 1 / 40));
      let net = Math.max(0, gain - eat);
      let born = 0;
      while (G.lay !== false && net >= EGG_COST && ants.length + eggs.length < capacity() && born < 200) { net -= EGG_COST; born++; const a = newAnt(QX + Math.round((R() - 0.5) * 6), QY); a.cx = clamp(a.cx, QX - 3, QX + 3); a.x = a.cx + 0.5; }
      G.food += net;
      setTimeout(() => toast(`while you were away (${away > 3600 ? (away / 3600).toFixed(1) + "h" : Math.round(away / 60) + "m"}): +${fmt(Math.max(0, gain - eat))} food, ${born} new ants`), 600);
    }
    for (const a of ants) assign(a);
    paintAll();
  }

  // ---------- session score (food hauled this session, never faster than 100 a second) ----------
  let sentScore = 0, scoreAcc = 0, sessStart = 0, sessOn = false;
  function startSession() { sessHauled = 0; sentScore = 0; sessStart = performance.now(); sessOn = true; sdk((c) => c.start && c.start()); }
  function pushScore(dt) {
    scoreAcc += dt;
    if (scoreAcc < 2) return;
    const next = Math.min(Math.floor(sessHauled), sentScore + Math.ceil(100 * scoreAcc));
    scoreAcc = 0;
    if (next > sentScore) { sentScore = next; sdk((c) => c.score && c.score(sentScore)); }
  }
  function endSession(done) { if (!sessOn) return; sessOn = false; sdk((c) => c.end && c.end({ score: sentScore, durationMs: Math.round(performance.now() - sessStart), completed: !!done })); }
  function ach(id) { if (G.ach[id]) return; G.ach[id] = 1; sdk((c) => c.achieve && c.achieve(id)); }

  // ---------- loop ----------
  let last = performance.now(), acc = 0, hudT = 0;
  const STEP = 1 / 30;
  function frame(t) {
    const raw = Math.min(0.25, Math.max(0, (t - last) / 1000)); last = t;
    if (started && !over && !paused && !document.hidden) {
      acc += raw * spd;
      let n = 0;
      while (acc >= STEP && n < 12) { sim(STEP); acc -= STEP; n++; }
      if (n >= 12) acc = 0;
      chatter(raw);
      pushScore(raw);
      if (performance.now() - lastSave > 30000) save();
    }
    if (G) draw(paused || over ? 0 : raw * spd);
    hudT -= raw;
    if (G && hudT <= 0) { hudT = 0.2; updHud(); if (!sheet.hidden && tab !== "jobs") renderPaneSoft(); }
    requestAnimationFrame(frame);
  }
  let paneKey = "";
  function renderPaneSoft() {
    // re-render only when affordability changes (keeps buttons clickable)
    const key = tab + "|" + UPS.map((u) => (G.food >= upCost(u) ? 1 : 0) + (G.up[u.id] || 0)).join("") + "|" + ants.length + "|" + Object.keys(G.curios).length;
    if (key !== paneKey) { paneKey = key; renderPane(); }
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) save(); else last = performance.now(); });
  addEventListener("pagehide", () => { save(); endSession(false); });
  addEventListener("resize", resize);

  function begin() {
    if (started) return;
    started = true;
    $("title").hidden = true;
    ac();
    startSession();
  }
  $("start").onclick = begin;

  // ---------- boot ----------
  resize();
  (async () => {
    const d = qs.get("fresh") === "1" ? null : await load();
    if (d && d.v === 1 && d.G) {
      try { restore(d); $("start").textContent = `continue · generation ${G.gen}`; }
      catch (e) { G = null; }
    }
    if (!G) {
      G = freshG(null); genWorld(G.seed); ants = [];
      for (let k = 0; k < 5; k++) newAnt(QX - 2 + k, QY);
      spawnPile("crumb", QX + 6, 5);
      paintAll();
    }
    camY = clampCam(-topPad());
    recount(); for (const a of ants) assign(a);
    if (window.cc && cc.autostart && cc.autostart()) begin();
    if (qs.get("shot") === "1") setTimeout(() => {
      // thumbnail mode: a grown colony with no chrome
      ["hud", "bar", "title", "toast"].forEach((id) => ($(id).style.display = "none"));
      started = true; muted = true; G.tut = 9; G.food = 2000;
      [[8, 17, 28, 17], [8, 18, 8, 26], [28, 18, 28, 30], [9, 26, 20, 26], [20, 27, 20, 34], [21, 30, 27, 30]].forEach((r) => window.__af.mark(...r));
      window.__af.ff(240);
      for (let i = 0; i < 6; i++) dropCrumb(4 + i * 6);
      window.__af.ff(4);
      camY = clampCam(ts * 3);
    }, 0);
  })();
  requestAnimationFrame(frame);

  // test hook
  window.__af = {
    state: () => ({ food: G.food, ants: ants.length, cap: capacity(), eggs: eggs.length, tun: tunCount, gen: G.gen, jelly: G.jelly, depth: G.gs.maxDepth, digSources, foodSources, jobs: jobCounts, piles: piles.length, reds: reds.length, spider: !!spider, lens: !!lens, rain, over, tut: G.tut, sess: sentScore, curios: Object.keys(G.curios).length }),
    ff: (sec) => { for (let k = 0; k < sec * 30; k++) sim(STEP); },
    give: (n) => { G.food += n; },
    event: (k) => startEvent(k),
    mark: (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = ix(x, y); if (type[i] !== T_TUN) mark[i] = 1; } dirty.dig = true; },
    begin, save, crumb: dropCrumb, render: (dt) => { draw(dt || 0); updHud(); }, cam: (y) => { camY = clampCam(y); }, setTool
  };
})();
