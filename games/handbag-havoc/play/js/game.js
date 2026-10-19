/* Handbag Havoc: simulation + rendering.
   The simulation (update) never touches the DOM, so it can run headless for balance bots. */
(function () {
  'use strict';
  const HH = (window.HH = window.HH || {});
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------------------------------------------------------------- tuning
  const ARENA_W = 1700, ARENA_H = 1700, FENCE = 44;
  const CELL = 80, GW = Math.ceil(ARENA_W / CELL), GH = Math.ceil(ARENA_H / CELL);
  const MAX_ENEMIES = 340;
  const HP_SCALE = 0.3;
  const ENRAGE = 25;                    // seconds into the boss fight before the King enrages               // + per wave index
  const TUNE = {
    playerSpeed: 225, playerR: 17, hearts: 5, invuln: 1.4,
    strap: 90, bagR: 15, bagDmg: 12, spin: 4.8, spinAccel: 950,
    launchSpeed: 230, hitCd: 0.22,
    bowlBase: 7, bowlPerSpeed: 0.02, flyTime: 0.8,
    biscuit: 0.02, nibble: 0.38, bump: 380,
  };
  const WAVES = [
    { name: 'Garden Variety', sub: 'They came from the flowerbeds', dur: 20, rate: [1.2, 2.4], mix: { basic: 1 } },
    { name: 'The Sprinters', sub: 'Blue hats. Bad attitudes.', dur: 20, rate: [2.2, 3.4], mix: { basic: 0.68, sprinter: 0.32 } },
    { name: 'Chonk Season', sub: 'Big gnomes make big bowling balls', dur: 20, rate: [3.2, 4.6], mix: { basic: 0.55, sprinter: 0.25, chonk: 0.13, flamingo: 0.07 } },
    { name: 'Flamingo Front', sub: 'Pink. Plastic. Furious.', dur: 20, rate: [4.4, 6.2], mix: { basic: 0.45, sprinter: 0.25, chonk: 0.14, flamingo: 0.16 }, bursts: 6 },
    { name: 'The Gnome King', sub: 'Bowl his subjects into him', dur: 0, rate: [2.6, 4.8], mix: { basic: 0.5, sprinter: 0.3, chonk: 0.12, flamingo: 0.08 }, boss: true },
  ];
  const TYPES = {
    basic: { r: 14, hp: 8, spd: 80, mass: 1, hat: '#e0373b', coat: '#3a7bd5', shard: ['#e0373b', '#3a7bd5', '#f4e9dc', '#f2b8a0'] },
    sprinter: { r: 11, hp: 5, spd: 148, mass: 0.7, hat: '#2a63d8', coat: '#f0a73a', shard: ['#2a63d8', '#f0a73a', '#f4e9dc'] },
    chonk: { r: 24, hp: 30, spd: 52, mass: 3, hat: '#8e3bd0', coat: '#2f9e5b', shard: ['#8e3bd0', '#2f9e5b', '#f4e9dc', '#f2b8a0'] },
    flamingo: { r: 15, hp: 13, spd: 62, mass: 1.1, shard: ['#ff6fae', '#ff9bc8', '#222'] },
    king: { r: 58, hp: 1000, spd: 44, mass: 40, hat: '#b51f2a', coat: '#6a2bb0', shard: ['#f2c230', '#b51f2a', '#6a2bb0', '#f4e9dc'] },
  };
  const UPGRADES = [
    { id: 'heavy', name: 'Bricks in the Bag', desc: '+35% purse damage and a bigger purse', max: 5, w: 10, col: '#c0583a' },
    { id: 'strap', name: 'Extra-Long Strap', desc: 'Longer reach, faster tip speed', max: 4, w: 9, col: '#8a5cd6' },
    { id: 'purse', name: 'Spare Purse', desc: 'Swing one more handbag', max: 2, w: 5, col: '#e0559a' },
    { id: 'scooter', name: 'Turbo Scooter', desc: '+12% scooter speed', max: 4, w: 8, col: '#e2453b' },
    { id: 'bowl', name: 'League Bowler', desc: 'Flung gnomes hit 60% harder and fly farther', max: 4, w: 9, col: '#2f7fe0', sig: true },
    { id: 'pinball', name: 'Rubber Fence', desc: 'Flung gnomes bounce off the fence (+1 bounce)', max: 3, w: 8, col: '#24a86b', sig: true },
    { id: 'kaboom', name: 'Fireworks Inside', desc: 'Flung gnomes explode when they shatter', max: 3, w: 7, col: '#f08a24', sig: true },
    { id: 'tea', name: 'Cup of Tea', desc: '+1 max heart and a full heal', max: 3, w: 7, col: '#b07a4a' },
    { id: 'windmill', name: 'Windmill Wrist', desc: 'Purse auto-spins 30% faster', max: 3, w: 8, col: '#3fa9c4' },
    { id: 'needles', name: 'Knitting Needles', desc: 'Auto-throw needles at the nearest gnome', max: 3, w: 7, col: '#8b93a8' },
    { id: 'squeal', name: 'Hearing-Aid Squeal', desc: 'A shockwave every few seconds', max: 3, w: 6, col: '#e5b31f' },
    { id: 'brooch', name: 'Lucky Brooch', desc: '15% chance a smack deals triple', max: 3, w: 7, col: '#cfa43a' },
    { id: 'tin', name: 'Biscuit Tin', desc: 'More biscuit drops; biscuits give a speed burst', max: 2, w: 5, col: '#b98a45' },
    { id: 'ceramic', name: 'Garden Ceramics', desc: 'Flung gnomes are 70% bigger', max: 2, w: 6, col: '#6f8a4e' },
  ];
  const UP_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
  const MILESTONES = [5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 500];

  const SFX_NAMES = ['bonk', 'shatter', 'chain', 'milestone', 'whoosh', 'hurt', 'boom', 'needle', 'pickup', 'squeal', 'waveStart', 'waveClear', 'bossSlam', 'gameOver', 'victory', 'pick'];
  const NOSFX = Object.fromEntries(SFX_NAMES.map((n) => [n, () => {}]));

  // ---------------------------------------------------------------- game
  class Game {
    constructor(o = {}) {
      this.seed = (o.seed >>> 0) || ((Math.random() * 4294967296) >>> 0);
      this.rng = mulberry32(this.seed);
      this.headless = !!o.headless;
      this.daily = o.daily || 0;
      this.demo = !!o.demo;
      this.sfx = !this.headless && o.sfx ? o.sfx : NOSFX;
      this.state = 'play';
      this.t = 0; this.waveT = 0; this.wave = 0; this.realT = 0;
      this.input = { x: 0, y: 0 };
      this.player = { x: ARENA_W / 2, y: ARENA_H / 2, vx: 0, vy: 0, r: TUNE.playerR, hp: TUNE.hearts, maxHp: TUNE.hearts, inv: 0, face: 1, boost: 0, tilt: 0 };
      this.up = Object.fromEntries(UPGRADES.map((u) => [u.id, 0]));
      this.bags = [];
      this.enemies = []; this.needles = []; this.biscuits = []; this.teles = []; this.rings = [];
      this.parts = []; this.nums = []; this.decals = []; this.popups = [];
      this.grid = Array.from({ length: GW * GH }, () => []);
      this.q = [];
      this.eid = 0; this.chainSeq = 0; this.chains = new Map();
      this.hudChain = { n: 0, t: 0 };
      this.spawnAcc = 0; this.burstT = 0; this.needleT = 1; this.squealT = 3;
      this.king = null; this.bossT = 0;
      this.hitstop = 0; this.slowmo = 0; this.shake = 0; this.zoomPunch = 0; this.flash = 0; this.flashCol = '#fff';
      this.banner = null; this.endT = 0; this.win = false;
      this.offers = null; this.firstOffer = true;
      this.stats = { kills: 0, yeets: 0, bestChain: 0, topSpeed: 0, damage: 0, time: 0, wave: 1, picks: [], hits: 0, bossHp: 1 };
      this.cam = { x: this.player.x, y: this.player.y };
      this.rebuildBags();
      this.startWave(0);
    }
    r() { return this.rng(); }

    // --------------------------------------------------- upgrades & waves
    rebuildBags() {
      const n = 1 + this.up.purse;
      const L = TUNE.strap + 22 * this.up.strap;
      const R = TUNE.bagR + 3 * this.up.heavy;
      const lens = [1, 0.62, 1.32];
      const p = this.player;
      const old = this.bags;
      this.bags = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + 0.3;
        const prev = old[i];
        this.bags.push({
          i, L: L * lens[i], r: R * (i === 1 ? 0.85 : 1),
          x: prev ? prev.x : p.x + Math.cos(a) * L * lens[i], y: prev ? prev.y : p.y + Math.sin(a) * L * lens[i],
          vx: prev ? prev.vx : 0, vy: prev ? prev.vy : 0, dir: 1, trail: [], whooshT: 0,
        });
      }
    }
    bagDamage() { return TUNE.bagDmg * (1 + 0.35 * this.up.heavy); }

    makeOffers() {
      const pool = UPGRADES.filter((u) => this.up[u.id] < u.max);
      const picks = [];
      if (this.firstOffer) {
        const sig = pool.filter((u) => u.sig);
        if (sig.length) picks.push(sig[Math.floor(this.r() * sig.length)]);
        this.firstOffer = false;
      }
      let guard = 0;
      while (picks.length < 3 && guard++ < 200) {
        const cand = pool.filter((u) => !picks.includes(u));
        if (!cand.length) break;
        let tot = cand.reduce((s, u) => s + u.w, 0), x = this.r() * tot;
        for (const u of cand) { x -= u.w; if (x <= 0) { picks.push(u); break; } }
      }
      // shuffle so the signature card is not always first
      for (let i = picks.length - 1; i > 0; i--) { const j = Math.floor(this.r() * (i + 1)); [picks[i], picks[j]] = [picks[j], picks[i]]; }
      return picks.map((u) => u.id);
    }
    choose(id) {
      if (this.state !== 'upgrade') return;
      const u = UP_BY_ID[id]; if (!u) return;
      this.up[id]++;
      this.stats.picks.push(id);
      const p = this.player;
      if (id === 'tea') { p.maxHp++; p.hp = p.maxHp; }
      if (id === 'heavy' || id === 'strap' || id === 'purse') this.rebuildBags();
      this.sfx.pick();
      this.offers = null;
      this.startWave(this.wave + 1);
    }
    startWave(i) {
      this.wave = i; this.waveT = 0; this.spawnAcc = 0; this.burstT = 0;
      this.state = 'play';
      const W = WAVES[i];
      this.banner = { t: 2.4, title: `wave ${i + 1}`, sub: W.name.toLowerCase(), sub2: W.sub.toLowerCase() };
      this.player.inv = Math.max(this.player.inv, 1.0);
      this.stats.wave = i + 1;
      if (W.boss) {
        const p = this.player;
        let a = this.r() * TAU, x = clamp(p.x + Math.cos(a) * 430, 200, ARENA_W - 200), y = clamp(p.y + Math.sin(a) * 430, 200, ARENA_H - 200);
        this.king = this.spawnEnemy('king', x, y, 1.2);
        this.king.summonT = 4; this.king.slamT = 5.5; this.bossT = 0;
      }
      // first reward fast: a real run opens with three gnomes just outside the purse's reach, so the first smack lands in about 2 s
      if (i === 0 && !this.demo) {
        const p = this.player, a0 = this.r() * TAU;
        for (let k = 0; k < 3; k++) { const a = a0 + k * TAU / 3, d = 215 + this.r() * 30; this.spawnEnemy('basic', p.x + Math.cos(a) * d, p.y + Math.sin(a) * d); }
      }
      this.sfx.waveStart();
    }

    // --------------------------------------------------- spawning
    spawnEnemy(type, x, y, emerge) {
      const T = TYPES[type];
      const hpm = type === 'king' ? 1 : 1 + HP_SCALE * this.wave;
      const e = {
        id: ++this.eid, type, x, y, r: T.r, hp: T.hp * hpm, maxhp: T.hp * hpm,
        spd: T.spd * (0.88 + 0.24 * this.r()) * (1 + 0.04 * this.wave), mass: T.mass,
        kvx: 0, kvy: 0, flash: 0, emerge: emerge == null ? 0.45 : emerge, hit: [-9, -9, -9], hitN: -9,
        dead: false, flying: false, rot: 0, wob: this.r() * TAU, face: 1,
        ai: 'walk', cd: 1.5 + this.r() * 2, dx: 0, dy: 0, aiT: 0,
      };
      this.enemies.push(e);
      if (!this.headless) this.dirtPuff(x, y, e.r);
      return e;
    }
    pickType(mix) {
      let x = this.r(), last = 'basic';
      for (const k in mix) { x -= mix[k]; last = k; if (x <= 0) return k; }
      return last;
    }
    spawnTick(dt) {
      const W = WAVES[this.wave];
      const live = this.enemies.length;
      let frac = W.dur ? this.waveT / W.dur : Math.min(1, this.waveT / 30);
      let rate = lerp(W.rate[0], W.rate[1], frac);
      if (W.boss && this.bossT > ENRAGE) rate *= 1 + (this.bossT - ENRAGE) / 10;
      this.spawnAcc += rate * dt;
      const p = this.player;
      while (this.spawnAcc >= 1) {
        this.spawnAcc -= 1;
        if (live >= MAX_ENEMIES) continue;
        let x, y, tries = 0;
        do {
          const a = this.r() * TAU, d = 380 + this.r() * 240;
          x = clamp(p.x + Math.cos(a) * d, FENCE + 30, ARENA_W - FENCE - 30);
          y = clamp(p.y + Math.sin(a) * d, FENCE + 30, ARENA_H - FENCE - 30);
        } while (Math.hypot(x - p.x, y - p.y) < 300 && ++tries < 6);
        this.spawnEnemy(this.pickType(W.mix), x, y);
      }
      if (W.bursts) {
        this.burstT += dt;
        if (this.burstT >= W.bursts) {
          this.burstT = 0;
          const n = 14, d = 360;
          for (let k = 0; k < n; k++) {
            const a = (k / n) * TAU;
            this.spawnEnemy(k % 4 === 0 ? 'sprinter' : 'basic', clamp(p.x + Math.cos(a) * d, FENCE + 30, ARENA_W - FENCE - 30), clamp(p.y + Math.sin(a) * d, FENCE + 30, ARENA_H - FENCE - 30), 0.6);
          }
        }
      }
    }

    // --------------------------------------------------- grid
    rebuildGrid() {
      for (const c of this.grid) c.length = 0;
      for (const e of this.enemies) {
        if (e.dead || e.flying) continue;
        const cx = clamp((e.x / CELL) | 0, 0, GW - 1), cy = clamp((e.y / CELL) | 0, 0, GH - 1);
        this.grid[cx + cy * GW].push(e);
      }
    }
    query(x, y, rad) {
      const out = this.q; out.length = 0;
      const x0 = clamp(((x - rad) / CELL) | 0, 0, GW - 1), x1 = clamp(((x + rad) / CELL) | 0, 0, GW - 1);
      const y0 = clamp(((y - rad) / CELL) | 0, 0, GH - 1), y1 = clamp(((y + rad) / CELL) | 0, 0, GH - 1);
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
        const c = this.grid[cx + cy * GW];
        for (let i = 0; i < c.length; i++) out.push(c[i]);
      }
      return out;
    }

    // --------------------------------------------------- real-time (juice) tick, called by the frame loop
    tickReal(dt) {
      this.realT += dt;
      if (this.slowmo > 0) this.slowmo -= dt;
      if (this.zoomPunch > 0) this.zoomPunch = Math.max(0, this.zoomPunch - dt * 2.2);
      if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3);
      if (this.hitstop > 0) { this.hitstop -= dt; return false; }
      return true;
    }
    timeScale() {
      if (this.state === 'dying') return 0.35;
      if (this.state === 'victory') return 0.5;
      return this.slowmo > 0 ? 0.35 : 1;
    }
    addHitstop(s) { if (!this.headless) this.hitstop = Math.min(0.14, Math.max(this.hitstop, s)); }
    addShake(s) { this.shake = Math.min(1, this.shake + s); if (s >= 0.1) this.juice('shake', s); }
    // Lab telemetry (operations/rules/games/JUICE.md): every juice effect reports Studio.juice(kind, mag) so the Fun Report and
    // the trailer cutter can see it. Real runs only (never the attract demo or the headless balance sims), and at most
    // one event per kind per 80 ms so a 200-gnome chain does not flood window.__labEvents.
    juice(kind, mag) {
      if (this.headless || this.demo) return;
      const now = this.realT, last = this._jt || (this._jt = {});
      if (last[kind] != null && now - last[kind] < 0.08) return;
      last[kind] = now;
      try { if (window.Studio) window.Studio.juice(kind, mag); } catch (e) { /* telemetry never breaks the game */ }
    }
    highlight(kind) {
      if (this.headless || this.demo) return;
      try { if (window.Studio) window.Studio.highlight(kind); } catch (e) { /* telemetry never breaks the game */ }
    }

    // --------------------------------------------------- main update
    update(dt) {
      if (this.state === 'upgrade' || this.state === 'over') return;
      const p = this.player;
      if (this.state === 'play') { this.t += dt; this.waveT += dt; if (this.king) this.bossT += dt; }
      this.shake = Math.max(0, this.shake - dt * 2.4);
      if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }

      // player
      const alive = this.state === 'play';
      let ix = alive ? this.input.x : 0, iy = alive ? this.input.y : 0;
      const il = Math.hypot(ix, iy); if (il > 1) { ix /= il; iy /= il; }
      const spd = TUNE.playerSpeed * (1 + 0.12 * this.up.scooter) * (p.boost > 0 ? 1.35 : 1);
      const k = Math.min(1, 11 * dt);
      p.vx += (ix * spd - p.vx) * k; p.vy += (iy * spd - p.vy) * k;
      p.x = clamp(p.x + p.vx * dt, FENCE + p.r, ARENA_W - FENCE - p.r);
      p.y = clamp(p.y + p.vy * dt, FENCE + p.r, ARENA_H - FENCE - p.r);
      if (Math.abs(p.vx) > 20) p.face = p.vx > 0 ? 1 : -1;
      p.tilt = lerp(p.tilt, clamp(p.vx / 600, -0.25, 0.25), Math.min(1, dt * 8));
      if (p.inv > 0) p.inv -= dt;
      if (p.boost > 0) p.boost -= dt;

      if (this.state === 'play') this.spawnTick(dt);
      this.updateBags(dt);
      this.rebuildGrid();
      this.updateEnemies(dt);
      this.bagHits();
      this.updateFlyers(dt);
      if (this.state === 'play') { this.playerContact(dt); this.abilities(dt); }
      this.updateNeedles(dt);
      this.updateBiscuits(dt);
      this.updateTeles(dt);
      if (!this.headless) this.updateFx(dt);
      if (this.hudChain.t > 0) this.hudChain.t -= dt;

      // cleanup
      if (this.enemies.some((e) => e.dead)) this.enemies = this.enemies.filter((e) => !e.dead);

      // state flow
      const W = WAVES[this.wave];
      if (this.state === 'play' && W.dur && this.waveT >= W.dur) {
        this.state = 'upgrade';
        this.offers = this.makeOffers();
        this.sfx.waveClear();
        this.juice('levelup', 0.6 + 0.1 * this.wave);
        this.input.x = this.input.y = 0;
      }
      if (this.state === 'dying' || this.state === 'victory') {
        this.endT -= dt;
        if (this.endT <= 0) this.state = 'over';
      }
      this.stats.time = this.t;
      if (this.king) this.stats.bossHp = Math.max(0, this.king.hp / this.king.maxhp);
      // camera
      const ck = Math.min(1, dt * 7);
      this.cam.x += (p.x + p.vx * 0.18 - this.cam.x) * ck;
      this.cam.y += (p.y + p.vy * 0.18 - this.cam.y) * ck;
    }

    updateBags(dt) {
      const p = this.player;
      const minW = TUNE.spin * (1 + 0.3 * this.up.windmill);
      for (const b of this.bags) {
        let rx = b.x - p.x, ry = b.y - p.y;
        let d = Math.hypot(rx, ry) || 0.001;
        const nx = rx / d, ny = ry / d;
        const tx = -ny * b.dir, ty = nx * b.dir;
        // relative velocity
        let vrx = b.vx - p.vx, vry = b.vy - p.vy;
        const vt = vrx * tx + vry * ty;
        const want = minW * b.L;
        if (vt < want) { const a = Math.min(TUNE.spinAccel * dt, want - vt); vrx += tx * a; vry += ty * a; }
        // drag
        const drag = 1 - Math.min(0.9, 0.9 * dt);
        vrx *= drag; vry *= drag;
        b.vx = p.vx + vrx; b.vy = p.vy + vry;
        b.x += b.vx * dt; b.y += b.vy * dt;
        // strap constraint
        rx = b.x - p.x; ry = b.y - p.y; d = Math.hypot(rx, ry) || 0.001;
        const mx = rx / d, my = ry / d;
        if (d > b.L) {
          b.x = p.x + mx * b.L; b.y = p.y + my * b.L;
          let rvx = b.vx - p.vx, rvy = b.vy - p.vy;
          const vr = rvx * mx + rvy * my;
          if (vr > 0) { b.vx -= mx * vr; b.vy -= my * vr; }
        } else if (d < b.L * 0.55) {
          b.vx += mx * 900 * dt; b.vy += my * 900 * dt;
        }
        // fence
        if (b.x < FENCE) { b.x = FENCE; b.vx = Math.abs(b.vx) * 0.5; }
        if (b.x > ARENA_W - FENCE) { b.x = ARENA_W - FENCE; b.vx = -Math.abs(b.vx) * 0.5; }
        if (b.y < FENCE) { b.y = FENCE; b.vy = Math.abs(b.vy) * 0.5; }
        if (b.y > ARENA_H - FENCE) { b.y = ARENA_H - FENCE; b.vy = -Math.abs(b.vy) * 0.5; }
        const s = Math.hypot(b.vx, b.vy);
        b.speed = s;
        if (this.state === 'play' && s > this.stats.topSpeed) this.stats.topSpeed = s;
        if (!this.headless) {
          b.trail.unshift(b.x, b.y); if (b.trail.length > 24) b.trail.length = 24;
          b.whooshT -= dt;
          if (s > 520 && b.whooshT <= 0) { this.sfx.whoosh(s); b.whooshT = 0.28; }
        }
      }
    }

    updateEnemies(dt) {
      const p = this.player;
      for (const e of this.enemies) {
        if (e.dead || e.flying) continue;
        if (e.flash > 0) e.flash -= dt;
        e.wob += dt * (6 + e.spd * 0.03);
        if (e.emerge > 0) { e.emerge -= dt; continue; }
        let dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
        dx /= d; dy /= d;
        let mvx = dx * e.spd, mvy = dy * e.spd;
        if (this.state !== 'play') { mvx *= 0.2; mvy *= 0.2; }
        if (e.type === 'flamingo') {
          e.cd -= dt;
          if (e.ai === 'walk' && e.cd <= 0 && d < 340) { e.ai = 'tele'; e.aiT = 0.65; e.dx = dx; e.dy = dy; }
          if (e.ai === 'tele') { mvx = mvy = 0; e.aiT -= dt; if (e.aiT <= 0) { e.ai = 'dash'; e.aiT = 0.42; } }
          else if (e.ai === 'dash') { mvx = e.dx * 560; mvy = e.dy * 560; e.aiT -= dt; if (e.aiT <= 0) { e.ai = 'walk'; e.cd = 2.4 + this.r() * 1.4; } }
        } else if (e.type === 'king') {
          this.kingAI(e, dt, d);
          // the King keeps his distance and lets his subjects do the work (until enraged)
          if (this.bossT < ENRAGE) {
            const away = d < 230 ? -0.8 : d > 330 ? 1 : 0;
            mvx = dx * e.spd * away - dy * e.spd * 0.5; mvy = dy * e.spd * away + dx * e.spd * 0.5;
          }
        }
        e.x += (mvx + e.kvx) * dt; e.y += (mvy + e.kvy) * dt;
        const kf = Math.max(0, 1 - 5.5 * dt); e.kvx *= kf; e.kvy *= kf;
        if (Math.abs(mvx) > 5) e.face = mvx > 0 ? 1 : -1;
        // separation
        const near = this.query(e.x, e.y, e.r + 26);
        for (let i = 0; i < near.length; i++) {
          const o = near[i]; if (o === e || o.dead || o.emerge > 0) continue;
          let sx = e.x - o.x, sy = e.y - o.y; const rr = e.r + o.r;
          const dd = sx * sx + sy * sy;
          if (dd < rr * rr && dd > 0.01) {
            const dl = Math.sqrt(dd), push = (rr - dl) * 0.5;
            const wE = o.mass / (e.mass + o.mass);
            e.x += (sx / dl) * push * wE; e.y += (sy / dl) * push * wE;
          }
        }
        e.x = clamp(e.x, FENCE + e.r, ARENA_W - FENCE - e.r);
        e.y = clamp(e.y, FENCE + e.r, ARENA_H - FENCE - e.r);
      }
    }

    kingAI(e, dt, d) {
      const enr = this.bossT > ENRAGE * 2 ? 2.2 : this.bossT > ENRAGE ? 1.45 : 1;
      e.summonT -= dt * enr; e.slamT -= dt * enr;
      if (e.summonT <= 0) {
        e.summonT = 5;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + this.r();
          this.spawnEnemy(i % 3 === 0 ? 'sprinter' : 'basic', clamp(e.x + Math.cos(a) * 95, FENCE + 20, ARENA_W - FENCE - 20), clamp(e.y + Math.sin(a) * 95, FENCE + 20, ARENA_H - FENCE - 20), 0.5);
        }
      }
      if (e.slamT <= 0 && d < 520) {
        e.slamT = 6;
        this.teles.push({ x: this.player.x, y: this.player.y, r: 120, t: 1.1, max: 1.1, kind: 'slam' });
      }
      if (enr > 1) e.spd = TYPES.king.spd * (enr > 2 ? 2.2 : 1.5);
    }

    bagHits() {
      const t = this.t;
      const dmgBase = this.bagDamage();
      for (const b of this.bags) {
        const s = b.speed;
        const near = this.query(b.x, b.y, b.r + 60);
        for (let i = 0; i < near.length; i++) {
          const e = near[i];
          if (e.dead || e.flying || e.emerge > 0.15) continue;
          const dx = e.x - b.x, dy = e.y - b.y, rr = b.r + e.r;
          if (dx * dx + dy * dy > rr * rr) continue;
          if (t - e.hit[b.i] < TUNE.hitCd) continue;
          e.hit[b.i] = t;
          if (s < 110) { // too slow: just nudge
            const dl = Math.hypot(dx, dy) || 1; e.kvx += (dx / dl) * 120 / e.mass; e.kvy += (dy / dl) * 120 / e.mass;
            continue;
          }
          const power = s / 400;
          const crit = this.up.brooch && this.r() < 0.15 * this.up.brooch;
          let dmg = dmgBase * Math.pow(power, 1.15) * (crit ? 3 : 1) * (e.type === 'king' ? 0.5 : 1);
          this.damage(e, dmg, crit);
          const ux = b.vx / (s || 1), uy = b.vy / (s || 1);
          b.vx *= 0.93; b.vy *= 0.93;
          this.stats.hits++;
          if (this.stats.firstHit == null) this.stats.firstHit = +this.t.toFixed(2);
          if (e.hp <= 0) {
            if (e.type === 'king') { this.killKing(e, ux, uy); continue; }
            if (s > TUNE.launchSpeed) {
              const chain = this.newChain();
              const ls = Math.min(1250, s * 1.15) * (1 + 0.12 * this.up.bowl);
              this.launch(e, ux * ls, uy * ls, chain);
              this.addHitstop(0.03 + Math.min(0.03, s / 30000));
            } else this.shatter(e, false);
          } else {
            const kb = Math.min(700, s * 0.7) / e.mass;
            e.kvx += ux * kb; e.kvy += uy * kb;
            this.addHitstop(e.type === 'king' ? 0.05 : 0.018);
          }
          this.addShake(e.type === 'king' ? 0.12 : 0.045 + Math.min(0.08, s / 12000));
          this.sfx.bonk(power / 2.2);
          this.juice('hit', Math.min(1, power / 2.2));
          if (!this.headless) this.sparks(b.x + dx * 0.5, b.y + dy * 0.5, 4 + (power * 3) | 0, '#fff6c8');
        }
      }
    }

    damage(e, dmg, crit) {
      e.hp -= dmg; e.flash = 0.09;
      this.stats.damage += dmg;
      if (!this.headless && dmg >= 1) {
        const big = dmg > 25 || crit;
        this.nums.push({ x: e.x + (Math.random() - 0.5) * 10, y: e.y - e.r - 6, vy: -70 - Math.random() * 30, vx: (Math.random() - 0.5) * 40, life: 0.8, max: 0.8, txt: Math.round(dmg) + (crit ? '!' : ''), size: big ? 22 : 15, col: crit ? '#ffd23f' : dmg > 25 ? '#ff9a3c' : '#ffffff' });
        if (this.nums.length > 60) this.nums.shift();
      }
    }

    newChain() { const id = ++this.chainSeq; this.chains.set(id, { n: 0, live: 0, x: 0, y: 0, ms: 0 }); return id; }

    launch(e, vx, vy, chainId) {
      e.flying = true; e.fvx = vx; e.fvy = vy;
      e.fly = TUNE.flyTime * (1 + 0.25 * this.up.bowl) * (e.type === 'chonk' ? 1.2 : 1);
      e.spin = (this.r() < 0.5 ? -1 : 1) * (10 + this.r() * 14);
      e.chain = chainId; e.bounces = this.up.pinball; e.hitIds = [];
      e.big = 1 + 0.7 * this.up.ceramic;
      this.stats.kills++; this.stats.yeets++;
      this.juice('reward', 0.2);   // the GNOMES YEETED counter ticks up: the run's score
      if (this.stats.yeets === 1 && !this.headless && !this.demo) this.popups.push({ x: e.x, y: e.y - 40, t: 1.1, max: 1.1, txt: 'YEET!', size: 34 });   // first reward of the run, called out
      const c = this.chains.get(chainId);
      if (c) {
        c.n++; c.live++; c.x = e.x; c.y = e.y;
        if (c.n > this.stats.bestChain) this.stats.bestChain = c.n;
        if (c.n >= 2) { this.sfx.chain(c.n); this.juice('combo', Math.min(1, c.n / 50)); if (c.n >= this.hudChain.n || this.hudChain.t <= 0) this.hudChain = { n: c.n, t: 1.6 }; }
        if (c.n >= 3 && !this.headless) this.addShake(Math.min(0.06, 0.012 * c.n));
        while (c.ms < MILESTONES.length && c.n >= MILESTONES[c.ms]) {
          const m = MILESTONES[c.ms++];
          // one popup per chain: a new milestone replaces the old one instead of stacking
          const prev = this.popups.find((q) => q.chain === chainId);
          const px = prev ? prev.x : e.x, py = prev ? prev.y : e.y - 30;
          this.popups = this.popups.filter((q) => q.chain !== chainId);
          this.popups.push({ chain: chainId, x: px, y: py, t: 1.4, max: 1.4, txt: `BOWL x${m}!`, size: m >= 50 ? 64 : m >= 20 ? 52 : m >= 10 ? 44 : 34 });
          this.sfx.milestone(m);
          this.juice('reward', Math.min(1, m / 100));
          if (m >= 20) this.highlight(`bowl x${m}`);
          this.addHitstop(0.06);
          this.addShake(0.3);
          if (m >= 10) this.slowmo = 0.55;
          if (m >= 20) this.zoomPunch = 1;
        }
      }
      this.dropBiscuit(e);
    }

    shatter(e, wasFlying) {
      if (e.dead) return;
      e.dead = true;
      this.sfx.shatter(e.r > 20);
      this.juice('pop', e.r > 20 ? 0.8 : 0.4);
      if (!this.headless) this.shards(e);
      if (!wasFlying) { this.stats.kills++; this.juice('reward', 0.15); this.dropBiscuit(e); return; }
      // explode before releasing the chain so explosion kills extend the same chain
      if (this.up.kaboom) this.explode(e.x, e.y, e.chain);
      const c = this.chains.get(e.chain);
      if (c) { c.live--; if (c.live <= 0) this.chains.delete(e.chain); }
    }

    explode(x, y, chainId) {
      const k = this.up.kaboom;
      const R = 55 + 22 * k, dmg = 7 + 7 * k;
      this.sfx.boom();
      this.addShake(0.12);
      if (!this.headless) {
        this.rings.push({ x, y, r: 8, max: R, t: 0.3, maxT: 0.3, col: '#ffb347', w: 10 });
        for (let i = 0; i < 14; i++) { const a = Math.random() * TAU, s = 120 + Math.random() * 260; this.parts.push({ x, y, z: 4, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 60 + Math.random() * 80, life: 0.45, max: 0.45, size: 3 + Math.random() * 4, col: i % 2 ? '#ffd23f' : '#ff7a2f', kind: 'spark', rot: 0, vr: 0 }); }
      }
      if (!this.chains.has(chainId)) { this.chains.set(chainId, { n: 0, live: 0, x, y, ms: MILESTONES.length }); }
      const near = this.query(x, y, R + 30);
      const list = near.slice();
      for (const e of list) {
        if (e.dead || e.flying) continue;
        const dx = e.x - x, dy = e.y - y, dl = Math.hypot(dx, dy) || 1;
        if (dl > R + e.r) continue;
        this.damage(e, dmg, false);
        if (e.hp <= 0) {
          if (e.type === 'king') { this.killKing(e, dx / dl, dy / dl); continue; }
          this.launch(e, (dx / dl) * 520, (dy / dl) * 520, chainId);
        } else { e.kvx += (dx / dl) * 300 / e.mass; e.kvy += (dy / dl) * 300 / e.mass; }
      }
    }

    updateFlyers(dt) {
      for (const f of this.enemies) {
        if (!f.flying || f.dead) continue;
        f.x += f.fvx * dt; f.y += f.fvy * dt; f.rot += f.spin * dt;
        const fr = Math.max(0, 1 - 1.7 * dt); f.fvx *= fr; f.fvy *= fr;
        f.fly -= dt;
        const s = Math.hypot(f.fvx, f.fvy);
        // fence
        let wall = false;
        if (f.x < FENCE + f.r) { f.x = FENCE + f.r; f.fvx = Math.abs(f.fvx); wall = true; }
        if (f.x > ARENA_W - FENCE - f.r) { f.x = ARENA_W - FENCE - f.r; f.fvx = -Math.abs(f.fvx); wall = true; }
        if (f.y < FENCE + f.r) { f.y = FENCE + f.r; f.fvy = Math.abs(f.fvy); wall = true; }
        if (f.y > ARENA_H - FENCE - f.r) { f.y = ARENA_H - FENCE - f.r; f.fvy = -Math.abs(f.fvy); wall = true; }
        if (wall) {
          if (f.bounces > 0) { f.bounces--; f.fly = Math.max(f.fly, 0.45); f.fvx *= 1.05; f.fvy *= 1.05; f.hitIds.length = 0; this.sfx.bonk(0.5); this.addShake(0.04); }
          else { this.shatter(f, true); this.addShake(0.08); continue; }
        }
        if (f.fly <= 0 || s < 110) { this.shatter(f, true); continue; }
        // hit other gnomes
        const fr2 = f.r * f.big;
        const near = this.query(f.x, f.y, fr2 + 60);
        const bowlMult = (1 + 0.6 * this.up.bowl) * (f.type === 'chonk' ? 2.2 : 1);
        for (let i = 0; i < near.length; i++) {
          const e = near[i];
          if (e.dead || e.flying || e.emerge > 0.15 || f.hitIds.includes(e.id)) continue;
          const dx = e.x - f.x, dy = e.y - f.y, rr = fr2 + e.r;
          if (dx * dx + dy * dy > rr * rr) continue;
          f.hitIds.push(e.id);
          const dmg = (TUNE.bowlBase + s * TUNE.bowlPerSpeed) * bowlMult * (e.type === 'king' ? 2.0 : 1);
          this.damage(e, dmg, false);
          this.sfx.bonk(0.4);
          if (e.type === 'king') {
            this.addHitstop(0.05); this.addShake(0.15);
            if (e.hp <= 0) this.killKing(e, f.fvx / (s || 1), f.fvy / (s || 1));
            else { e.kvx += f.fvx * 0.05; e.kvy += f.fvy * 0.05; }
            this.shatter(f, true);
            break;
          }
          if (e.hp <= 0) {
            // deflect: new flyer leaves at an angle, old one keeps going
            const ang = Math.atan2(f.fvy, f.fvx) + (this.r() < 0.5 ? -1 : 1) * (0.35 + this.r() * 0.6);
            const ns = s * 0.85;
            this.launch(e, Math.cos(ang) * ns, Math.sin(ang) * ns, f.chain);
            const slow = f.type === 'chonk' ? 0.94 : 0.84;
            f.fvx *= slow; f.fvy *= slow;
            this.addHitstop(0.022);
          } else {
            const dl = Math.hypot(dx, dy) || 1;
            e.kvx += (dx / dl) * s * 0.5 / e.mass; e.kvy += (dy / dl) * s * 0.5 / e.mass;
            f.fvx *= 0.7; f.fvy *= 0.7;
          }
        }
      }
    }

    killKing(e, ux, uy) {
      if (e.dead || this.state !== 'play') return;
      this.stats.kills++;
      e.dead = true;
      this.win = true;
      this.state = 'victory'; this.endT = 2.6;
      this.sfx.victory();
      this.juice('levelup', 1); this.highlight('gnome king down');
      this.addShake(1); this.addHitstop(0.14); this.slowmo = 1.2; this.zoomPunch = 1; this.flash = 1; this.flashCol = '#fff3b0';
      if (!this.headless) { for (let i = 0; i < 4; i++) this.shards(e); }
      this.popups.push({ x: e.x, y: e.y - 60, t: 2.4, max: 2.4, txt: 'LONG LIVE GRANNY!', size: 56 });
      // everyone else gets yeeted outward in one glorious chain
      const chain = this.newChain();
      for (const o of this.enemies) {
        if (o.dead || o.flying) continue;
        const dx = o.x - e.x, dy = o.y - e.y, dl = Math.hypot(dx, dy) || 1;
        this.launch(o, (dx / dl) * 700, (dy / dl) * 700, chain);
      }
    }

    playerContact(dt) {
      // gnomes have to nibble granny's ankles for a moment before a heart is lost
      const p = this.player;
      if (p.inv > 0) { p.nibble = 0; return; }
      const near = this.query(p.x, p.y, p.r + 70);
      let touching = 0;
      for (const e of near) {
        if (e.dead || e.flying || e.emerge > 0) continue;
        const rr = p.r + e.r * 0.75;
        const dx = e.x - p.x, dy = e.y - p.y;
        if (dx * dx + dy * dy < rr * rr) {
          touching += e.type === 'king' ? 4 : e.type === 'flamingo' && e.ai === 'dash' ? 4 : 1;
          // scooter bumper: shove the gnome back out into the purse's swing path
          if (e.type !== 'king' && this.t - e.hitN > 0.25) {
            e.hitN = this.t;
            const dl = Math.hypot(dx, dy) || 1;
            e.kvx += (dx / dl) * TUNE.bump / e.mass; e.kvy += (dy / dl) * TUNE.bump / e.mass;
            this.sfx.bonk(0.08);
          }
        }
      }
      if (touching) p.nibble = (p.nibble || 0) + dt * Math.min(3, touching);
      else p.nibble = Math.max(0, (p.nibble || 0) - dt * 1.5);
      if (p.nibble >= TUNE.nibble) { p.nibble = 0; this.hurt(); }
    }
    hurt() {
      const p = this.player;
      p.hp--; p.inv = TUNE.invuln;
      this.sfx.hurt();
      this.juice('fail', p.hp <= 0 ? 1 : 0.5);
      this.addShake(0.65); this.addHitstop(0.12); this.flash = 0.9; this.flashCol = '#ff3b3b';
      const near = this.query(p.x, p.y, 170).slice();
      for (const e of near) {
        const dx = e.x - p.x, dy = e.y - p.y, dl = Math.hypot(dx, dy) || 1;
        e.kvx += (dx / dl) * 520 / e.mass; e.kvy += (dy / dl) * 520 / e.mass;
      }
      if (!this.headless) this.rings.push({ x: p.x, y: p.y, r: 10, max: 170, t: 0.35, maxT: 0.35, col: '#ff6b6b', w: 8 });
      if (p.hp <= 0) {
        this.state = 'dying'; this.endT = 0.38;   // ~1.1 s of slow-mo at 0.35x, so the retry button is up within 2 s of the last heart
        this.sfx.gameOver();
        this.input.x = this.input.y = 0;
      }
    }

    abilities(dt) {
      const p = this.player;
      if (this.up.needles) {
        this.needleT -= dt;
        if (this.needleT <= 0) {
          this.needleT = 1.25 - 0.25 * (this.up.needles - 1);
          let best = null, bd = 460 * 460;
          for (const e of this.enemies) { if (e.dead || e.flying || e.emerge > 0) continue; const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2; if (d < bd) { bd = d; best = e; } }
          if (best) {
            const a0 = Math.atan2(best.y - p.y, best.x - p.x);
            const n = this.up.needles;
            for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * 0.22; this.needles.push({ x: p.x, y: p.y, vx: Math.cos(a) * 720, vy: Math.sin(a) * 720, life: 0.8, dmg: 6 + 3 * n, pierce: 1 }); }
            this.sfx.needle();
          }
        }
      }
      if (this.up.squeal) {
        this.squealT -= dt;
        if (this.squealT <= 0) {
          this.squealT = 4.4 - 0.7 * (this.up.squeal - 1);
          const R = 140 + 25 * this.up.squeal, dmg = 4 + 4 * this.up.squeal;
          this.sfx.squeal();
          if (!this.headless) this.rings.push({ x: p.x, y: p.y, r: 10, max: R, t: 0.35, maxT: 0.35, col: '#ffe066', w: 6 });
          const list = this.query(p.x, p.y, R + 30).slice();
          for (const e of list) {
            if (e.dead || e.flying) continue;
            const dx = e.x - p.x, dy = e.y - p.y, dl = Math.hypot(dx, dy) || 1;
            if (dl > R + e.r) continue;
            this.damage(e, dmg, false);
            if (e.hp <= 0) {
              if (e.type === 'king') { this.killKing(e, dx / dl, dy / dl); continue; }
              this.launch(e, (dx / dl) * 420, (dy / dl) * 420, this.newChain());
            } else { e.kvx += (dx / dl) * 420 / e.mass; e.kvy += (dy / dl) * 420 / e.mass; }
          }
        }
      }
    }

    updateNeedles(dt) {
      for (const n of this.needles) {
        n.x += n.vx * dt; n.y += n.vy * dt; n.life -= dt;
        const near = this.query(n.x, n.y, 40);
        for (const e of near) {
          if (e.dead || e.flying || e.emerge > 0) continue;
          const rr = e.r + 4;
          if ((e.x - n.x) ** 2 + (e.y - n.y) ** 2 > rr * rr) continue;
          this.damage(e, n.dmg, false);
          if (e.hp <= 0) {
            if (e.type === 'king') this.killKing(e, 0, 0);
            else { const s = Math.hypot(n.vx, n.vy); this.launch(e, (n.vx / s) * 330, (n.vy / s) * 330, this.newChain()); }
          }
          n.pierce--; if (n.pierce < 0) { n.life = 0; break; }
        }
      }
      this.needles = this.needles.filter((n) => n.life > 0);
    }

    dropBiscuit(e) {
      if (this.state !== 'play') return;
      const ch = TUNE.biscuit * (1 + this.up.tin);
      if (this.r() < ch && this.biscuits.length < 6) this.biscuits.push({ x: e.x, y: e.y, t: 0, life: 12 });
    }
    updateBiscuits(dt) {
      const p = this.player;
      for (const b of this.biscuits) {
        b.t += dt; b.life -= dt;
        const d = Math.hypot(b.x - p.x, b.y - p.y);
        if (d < 80) { b.x += (p.x - b.x) * Math.min(1, dt * 6); b.y += (p.y - b.y) * Math.min(1, dt * 6); }
        if (d < p.r + 14 && this.state === 'play') {
          b.life = 0;
          if (p.hp < p.maxHp) p.hp++;
          if (this.up.tin) p.boost = 2.5;
          this.sfx.pickup();
          this.juice('reward', 0.4);
          if (!this.headless) this.nums.push({ x: p.x, y: p.y - 30, vy: -60, vx: 0, life: 1, max: 1, txt: '+1 ♥', size: 18, col: '#ff7aa8' });
        }
      }
      this.biscuits = this.biscuits.filter((b) => b.life > 0);
    }

    updateTeles(dt) {
      for (const t of this.teles) {
        t.t -= dt;
        if (t.t <= 0 && !t.done) {
          t.done = true;
          if (t.kind === 'slam') {
            this.sfx.bossSlam(); this.addShake(0.7);
            if (!this.headless) { this.rings.push({ x: t.x, y: t.y, r: 10, max: t.r * 1.15, t: 0.4, maxT: 0.4, col: '#f2c230', w: 14 }); this.dirtPuff(t.x, t.y, 60); }
            const p = this.player;
            if (this.state === 'play' && p.inv <= 0 && Math.hypot(p.x - t.x, p.y - t.y) < t.r + p.r * 0.5) this.hurt();
          }
        }
      }
      this.teles = this.teles.filter((t) => !t.done);
    }

    // --------------------------------------------------- cosmetic fx (skipped headless)
    shards(e) {
      const T = TYPES[e.type], cols = T.shard, n = Math.min(16, 6 + (e.r / 2) | 0);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, s = 60 + Math.random() * 220;
        this.parts.push({ x: e.x, y: e.y, z: 6 + Math.random() * 10, vx: Math.cos(a) * s + (e.fvx || 0) * 0.25, vy: Math.sin(a) * s + (e.fvy || 0) * 0.25, vz: 120 + Math.random() * 200, life: 0.7 + Math.random() * 0.5, max: 1.2, size: 2.5 + Math.random() * (e.r / 4), col: cols[(Math.random() * cols.length) | 0], kind: 'shard', rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 20 });
      }
      this.parts.push({ x: e.x, y: e.y, z: 0, vx: 0, vy: 0, vz: 0, life: 0.12, max: 0.12, size: e.r * 1.1, col: '#ffffff', kind: 'pop', rot: 0, vr: 0 });
      if (this.parts.length > 1400) this.parts.splice(0, this.parts.length - 1400);
    }
    sparks(x, y, n, col) {
      for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = 150 + Math.random() * 250; this.parts.push({ x, y, z: 8, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 30, life: 0.22, max: 0.22, size: 2 + Math.random() * 2, col, kind: 'spark', rot: 0, vr: 0 }); }
    }
    dirtPuff(x, y, r) {
      for (let i = 0; i < 6; i++) { const a = Math.random() * TAU, s = 30 + Math.random() * 60; this.parts.push({ x: x + Math.cos(a) * r * 0.5, y: y + Math.sin(a) * r * 0.3, z: 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.5, vz: 60 + Math.random() * 60, life: 0.5, max: 0.5, size: 3 + Math.random() * 4, col: '#7a5534', kind: 'dust', rot: 0, vr: 0 }); }
    }
    updateFx(dt) {
      for (const q of this.parts) {
        q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
        if (q.kind === 'shard' || q.kind === 'dust') {
          q.vz -= 900 * dt; q.z += q.vz * dt;
          if (q.z <= 0) { q.z = 0; q.vz *= -0.35; q.vx *= 0.6; q.vy *= 0.6; q.vr *= 0.5; }
          if (q.kind === 'shard' && q.life <= 0) { this.decals.push({ x: q.x, y: q.y, s: q.size, col: q.col, rot: q.rot, life: 9 }); }
        } else { q.vx *= 0.9; q.vy *= 0.9; }
      }
      this.parts = this.parts.filter((q) => q.life > 0);
      if (this.decals.length > 600) this.decals.splice(0, this.decals.length - 600);
      for (const n of this.nums) { n.life -= dt; n.x += n.vx * dt; n.y += n.vy * dt; n.vy += 120 * dt; }
      this.nums = this.nums.filter((n) => n.life > 0);
      for (const r of this.rings) r.t -= dt;
      this.rings = this.rings.filter((r) => r.t > 0);
      for (const p of this.popups) p.t -= dt;
      this.popups = this.popups.filter((p) => p.t > 0);
      if (this.popups.length > 3) this.popups.splice(0, this.popups.length - 3);
    }
  }

  // ================================================================ rendering
  const SPR = {};
  const SS = 2; // sprite supersample
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w * SS; c.height = h * SS; const x = c.getContext('2d'); x.scale(SS, SS); return [c, x]; }

  function drawGnome(x, T, r, white, king) {
    const W = (col) => (white ? '#ffffff' : col);
    // body / coat
    x.fillStyle = W(T.coat);
    x.beginPath(); x.ellipse(0, 0, r * 0.95, r * 0.85, 0, 0, TAU); x.fill();
    x.fillStyle = W('#4a2f1d'); x.fillRect(-r * 0.9, r * 0.05, r * 1.8, r * 0.18);
    x.fillStyle = W('#d8b13a'); x.fillRect(-r * 0.12, r * 0.03, r * 0.24, r * 0.22);
    // face
    x.fillStyle = W('#f6c7a8'); x.beginPath(); x.arc(0, -r * 0.55, r * 0.46, 0, TAU); x.fill();
    // beard
    x.fillStyle = W('#f7f1e6');
    x.beginPath(); x.moveTo(-r * 0.52, -r * 0.55); x.quadraticCurveTo(-r * 0.55, r * 0.2, 0, r * 0.45); x.quadraticCurveTo(r * 0.55, r * 0.2, r * 0.52, -r * 0.55); x.quadraticCurveTo(0, -r * 0.25, -r * 0.52, -r * 0.55); x.fill();
    // nose + eyes
    x.fillStyle = W('#e98a7a'); x.beginPath(); x.arc(0, -r * 0.48, r * 0.15, 0, TAU); x.fill();
    x.fillStyle = W('#2a1d16'); x.beginPath(); x.arc(-r * 0.2, -r * 0.68, r * 0.07, 0, TAU); x.arc(r * 0.2, -r * 0.68, r * 0.07, 0, TAU); x.fill();
    // angry brows
    x.strokeStyle = W('#2a1d16'); x.lineWidth = Math.max(1, r * 0.07);
    x.beginPath(); x.moveTo(-r * 0.33, -r * 0.82); x.lineTo(-r * 0.1, -r * 0.74); x.moveTo(r * 0.33, -r * 0.82); x.lineTo(r * 0.1, -r * 0.74); x.stroke();
    // hat
    x.fillStyle = W(T.hat);
    x.beginPath(); x.moveTo(-r * 0.6, -r * 0.78); x.quadraticCurveTo(0, -r * 0.95, r * 0.6, -r * 0.78); x.quadraticCurveTo(r * 0.35, -r * 1.5, r * 0.25, -r * 2.05); x.quadraticCurveTo(-r * 0.15, -r * 1.5, -r * 0.6, -r * 0.78); x.fill();
    if (king) {
      x.fillStyle = W('#f2c230');
      x.beginPath(); x.moveTo(-r * 0.5, -r * 0.92); x.lineTo(-r * 0.5, -r * 1.25); x.lineTo(-r * 0.25, -r * 1.05); x.lineTo(0, -r * 1.35); x.lineTo(r * 0.25, -r * 1.05); x.lineTo(r * 0.5, -r * 1.25); x.lineTo(r * 0.5, -r * 0.92); x.closePath(); x.fill();
      x.fillStyle = W('#3fd0ff'); x.beginPath(); x.arc(0, -r * 1.0, r * 0.07, 0, TAU); x.fill();
    }
  }
  function drawFlamingo(x, r, white, tele) {
    const W = (col) => (white ? '#ffffff' : col);
    x.strokeStyle = W('#2a1d16'); x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(-r * 0.15, r * 0.2); x.lineTo(-r * 0.15, r * 0.95); x.moveTo(r * 0.15, r * 0.2); x.lineTo(r * 0.25, r * 0.95); x.stroke();
    x.fillStyle = W(tele ? '#ff3d8b' : '#ff7ab6');
    x.beginPath(); x.ellipse(0, 0, r * 0.95, r * 0.6, -0.15, 0, TAU); x.fill();
    x.strokeStyle = W(tele ? '#ff3d8b' : '#ff7ab6'); x.lineWidth = r * 0.28; x.lineCap = 'round';
    x.beginPath(); x.moveTo(r * 0.55, -r * 0.2); x.quadraticCurveTo(r * 1.0, -r * 0.8, r * 0.55, -r * 1.2); x.stroke();
    x.fillStyle = W(tele ? '#ff3d8b' : '#ff7ab6'); x.beginPath(); x.arc(r * 0.6, -r * 1.3, r * 0.3, 0, TAU); x.fill();
    x.fillStyle = W('#222'); x.beginPath(); x.moveTo(r * 0.82, -r * 1.35); x.lineTo(r * 1.25, -r * 1.12); x.lineTo(r * 0.82, -r * 1.18); x.fill();
    x.fillStyle = W('#fff'); x.beginPath(); x.arc(r * 0.66, -r * 1.38, r * 0.09, 0, TAU); x.fill();
    x.fillStyle = W('#e0458f'); x.beginPath(); x.ellipse(-r * 0.25, -r * 0.05, r * 0.5, r * 0.3, -0.3, 0, TAU); x.fill();
  }
  function buildSprites() {
    if (SPR.ready) return;
    for (const type of ['basic', 'sprinter', 'chonk', 'king', 'flamingo']) {
      const T = TYPES[type], r = T.r, w = r * 3, h = r * 3.6;
      for (const white of [false, true]) {
        const [c, x] = mk(w, h);
        x.translate(w / 2, h * 0.62);
        if (type === 'flamingo') drawFlamingo(x, r, white, false); else drawGnome(x, T, r, white, type === 'king');
        SPR[type + (white ? '_w' : '')] = { c, w, h, ox: w / 2, oy: h * 0.62 };
      }
      if (type === 'flamingo') { const [c, x] = mk(w, h); x.translate(w / 2, h * 0.62); drawFlamingo(x, r, false, true); SPR.flamingo_t = { c, w, h, ox: w / 2, oy: h * 0.62 }; }
    }
    // lawn
    const bg = document.createElement('canvas');
    bg.width = ARENA_W; bg.height = ARENA_H;
    const g = bg.getContext('2d');
    g.fillStyle = '#5aa04a'; g.fillRect(0, 0, ARENA_W, ARENA_H);
    for (let i = 0; i < ARENA_W; i += 100) { g.fillStyle = (i / 100) % 2 ? '#61aa50' : '#559a45'; g.fillRect(i, 0, 100, ARENA_H); }
    const rnd = mulberry32(7);
    for (let i = 0; i < 1600; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(30,70,20,0.18)' : 'rgba(200,255,150,0.12)'; const x = rnd() * ARENA_W, y = rnd() * ARENA_H; g.fillRect(x, y, 2, 5); }
    // flower beds & stepping stones
    for (let i = 0; i < 14; i++) {
      const x = 150 + rnd() * (ARENA_W - 300), y = 150 + rnd() * (ARENA_H - 300), rr = 40 + rnd() * 50;
      g.fillStyle = '#6b4a2e'; g.beginPath(); g.ellipse(x, y, rr, rr * 0.6, 0, 0, TAU); g.fill();
      for (let k = 0; k < 16; k++) { const a = rnd() * TAU, d = rnd() * rr * 0.85; g.fillStyle = ['#ff5e7e', '#ffd23f', '#ffffff', '#b07cff', '#ff9a3c'][(rnd() * 5) | 0]; g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6, 4 + rnd() * 3, 0, TAU); g.fill(); }
    }
    for (let i = 0; i < 26; i++) { const x = ARENA_W / 2 - 300 + i * 24 + rnd() * 6, y = ARENA_H / 2 + 220 + Math.sin(i * 0.5) * 40; g.fillStyle = '#b9b2a2'; g.beginPath(); g.ellipse(x, y, 11, 7, 0, 0, TAU); g.fill(); }
    // fence
    g.fillStyle = '#e8dcc4';
    for (let i = 0; i < ARENA_W; i += 22) { g.fillRect(i + 3, 4, 14, FENCE - 8); g.fillRect(i + 3, ARENA_H - FENCE + 4, 14, FENCE - 8); }
    for (let i = 0; i < ARENA_H; i += 22) { g.fillRect(4, i + 3, FENCE - 8, 14); g.fillRect(ARENA_W - FENCE + 4, i + 3, FENCE - 8, 14); }
    g.fillStyle = '#cbbd9f'; g.fillRect(0, FENCE * 0.5 - 3, ARENA_W, 6); g.fillRect(0, ARENA_H - FENCE * 0.5 - 3, ARENA_W, 6); g.fillRect(FENCE * 0.5 - 3, 0, 6, ARENA_H); g.fillRect(ARENA_W - FENCE * 0.5 - 3, 0, 6, ARENA_H);
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(FENCE, FENCE, ARENA_W - FENCE * 2, 6); g.fillRect(FENCE, FENCE, 6, ARENA_H - FENCE * 2);
    SPR.bg = bg;
    SPR.ready = true;
  }

  // rotated shard quad without save/restore (cheap in software canvas)
  function quad(c, x, y, s, rot) {
    const ca = Math.cos(rot), sa = Math.sin(rot), w = s / 2, h = s / 3;
    c.beginPath();
    c.moveTo(x - w * ca + h * sa, y - w * sa - h * ca); c.lineTo(x + w * ca + h * sa, y + w * sa - h * ca);
    c.lineTo(x + w * ca - h * sa, y + w * sa + h * ca); c.lineTo(x - w * ca - h * sa, y - w * sa + h * ca);
    c.fill();
  }
  function spr(ctx, s, x, y, sc, rot) {
    if (rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(s.c, -s.ox * sc, -s.oy * sc, s.w * sc, s.h * sc); ctx.restore(); }
    else ctx.drawImage(s.c, x - s.ox * sc, y - s.oy * sc, s.w * sc, s.h * sc);
  }

  function drawGranny(ctx, p, t, hurtBlink) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.face, 1);
    ctx.rotate(p.tilt * p.face);
    if (hurtBlink) ctx.globalAlpha = 0.45;
    // scooter
    ctx.fillStyle = '#1d1d22'; ctx.beginPath(); ctx.arc(-13, 12, 6, 0, TAU); ctx.arc(15, 12, 6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#d63a3a'; roundRect(ctx, -22, 0, 46, 13, 6); ctx.fill();
    ctx.fillStyle = '#ff6b5b'; roundRect(ctx, -20, 1, 30, 4, 2); ctx.fill();
    ctx.strokeStyle = '#999'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(18, 2); ctx.lineTo(22, -18); ctx.stroke();
    ctx.fillStyle = '#bfa27a'; roundRect(ctx, 18, -10, 13, 10, 2); ctx.fill(); // basket
    // granny
    ctx.fillStyle = '#9b7fd6'; ctx.beginPath(); ctx.ellipse(-4, -8, 12, 13, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f6c7a8'; ctx.beginPath(); ctx.arc(-2, -25, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e7e4ef'; ctx.beginPath(); ctx.arc(-6, -31, 8, Math.PI * 0.9, Math.PI * 2.1); ctx.fill();
    ctx.beginPath(); ctx.arc(-9, -37, 5.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2a1d16'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(1, -25, 3, 0, TAU); ctx.arc(7, -25, 3, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#e98a7a'; ctx.beginPath(); ctx.arc(4, -21, 1.6, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function drawBag(ctx, b, p) {
    // strap
    ctx.strokeStyle = '#5a3a24'; ctx.lineWidth = 2.5;
    const hx = p.x + p.face * 4, hy = p.y - 12;
    const mx = (hx + b.x) / 2, my = (hy + b.y) / 2 + Math.min(18, 2000 / (b.speed + 80));
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(mx, my, b.x, b.y); ctx.stroke();
    // trail
    const s = b.speed || 0;
    if (b.trail.length > 4 && s > 200) {
      const hot = clamp((s - 200) / 700, 0, 1);
      ctx.lineCap = 'round';
      for (let i = 2; i < b.trail.length - 2; i += 2) {
        const a = (1 - i / b.trail.length) * 0.55 * hot + 0.05;
        ctx.strokeStyle = hot > 0.7 ? `rgba(255,120,190,${a})` : `rgba(255,255,255,${a})`;
        ctx.lineWidth = b.r * 1.6 * (1 - i / b.trail.length);
        ctx.beginPath(); ctx.moveTo(b.trail[i - 2], b.trail[i - 1]); ctx.lineTo(b.trail[i], b.trail[i + 1]); ctx.stroke();
      }
    }
    // bag body
    ctx.save(); ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.y - p.y, b.x - p.x) + Math.PI / 2);
    const r = b.r;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(3, 6, r, r * 0.6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#7a3355'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -r * 0.45, r * 0.55, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = b.i === 1 ? '#3fa0c9' : b.i === 2 ? '#e9a13b' : '#d94f8a';
    ctx.beginPath(); ctx.moveTo(-r * 0.8, -r * 0.45); ctx.lineTo(r * 0.8, -r * 0.45); ctx.lineTo(r, r * 0.65); ctx.quadraticCurveTo(0, r * 0.85, -r, r * 0.65); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-r * 0.7, -r * 0.4, r * 1.4, r * 0.18);
    ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.arc(0, -r * 0.18, r * 0.2, 0, TAU); ctx.fill();
    ctx.restore();
  }

  Game.prototype.render = function (ctx, vw, vh, opts) {
    buildSprites();
    const p = this.player;
    const shakeAmt = opts.shake ? this.shake * this.shake * 22 * (opts.shakeScale == null ? 1 : opts.shakeScale) : 0;   // shakeScale < 1 under prefers-reduced-motion
    const zoomBase = Math.min(vw, vh) / (vw < vh ? 560 : 660);
    const zoom = zoomBase * (1 + 0.07 * Math.sin(this.zoomPunch * Math.PI));
    const viewW = vw / zoom, viewH = vh / zoom;
    let cx = clamp(this.cam.x, viewW / 2 - 60, ARENA_W - viewW / 2 + 60);
    let cy = clamp(this.cam.y, viewH / 2 - 60, ARENA_H - viewH / 2 + 60);
    if (viewW > ARENA_W) cx = ARENA_W / 2;
    if (viewH > ARENA_H) cy = ARENA_H / 2;
    const sx = (Math.random() - 0.5) * shakeAmt, sy = (Math.random() - 0.5) * shakeAmt;
    ctx.fillStyle = '#2f5e2a'; ctx.fillRect(0, 0, vw, vh);
    ctx.save();
    const dpr = opts.dpr || 1, snap = (v) => Math.round(v * dpr) / dpr;   // pixel-snap the camera so the lawn never shimmers
    ctx.translate(snap(vw / 2 + sx - cx * zoom), snap(vh / 2 + sy - cy * zoom)); ctx.scale(zoom, zoom);
    const L = cx - viewW / 2 - 80, R = cx + viewW / 2 + 80, T = cy - viewH / 2 - 80, B = cy + viewH / 2 + 80;
    // per-run lawn: settled ceramic shards are baked in for good, so the garden fills up with carnage
    if (!this.lawn) { this.lawn = document.createElement('canvas'); this.lawn.width = ARENA_W; this.lawn.height = ARENA_H; this.lawnCtx = this.lawn.getContext('2d'); this.lawnCtx.drawImage(SPR.bg, 0, 0); }
    if (this.decals.length) {
      const g = this.lawnCtx; g.globalAlpha = 0.8;
      for (const d of this.decals) { g.fillStyle = d.col; quad(g, d.x, d.y, d.s, d.rot); }
      g.globalAlpha = 1; this.decals.length = 0;
    }
    { // blit only the visible part of the lawn
      const bx = clamp(Math.floor(cx - viewW / 2 - 40), 0, ARENA_W), by = clamp(Math.floor(cy - viewH / 2 - 40), 0, ARENA_H);
      const bw = Math.min(ARENA_W - bx, Math.ceil(viewW + 80)), bh = Math.min(ARENA_H - by, Math.ceil(viewH + 80));
      // nearest-neighbour: the lawn is soft shapes, and smoothing a full-screen blit is the single most expensive op in software canvas
      ctx.imageSmoothingEnabled = false;
      if (bw > 0 && bh > 0) ctx.drawImage(this.lawn, bx, by, bw, bh, bx, by, bw, bh);
      ctx.imageSmoothingEnabled = true;
    }
    // telegraphs
    for (const t of this.teles) {
      const k = 1 - t.t / t.max;
      ctx.fillStyle = `rgba(255,60,60,${0.12 + 0.18 * k})`; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,230,120,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(t.x, t.y, t.r * k, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,80,80,0.9)'; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, TAU); ctx.stroke();
    }
    // biscuits
    for (const b of this.biscuits) {
      const bob = Math.sin(b.t * 5) * 3, blink = b.life < 3 && ((b.life * 8) | 0) % 2;
      if (blink) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(b.x, b.y + 6, 9, 4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#d9a35b'; ctx.beginPath(); ctx.arc(b.x, b.y - 4 + bob, 9, 0, TAU); ctx.fill();
      ctx.fillStyle = '#8a5a2b'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(b.x - 4 + (k % 2) * 7, b.y - 7 + bob + (k > 1 ? 5 : 0), 1.4, 0, TAU); ctx.fill(); }
    }
    // shadows
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    for (const e of this.enemies) {
      if (e.x < L || e.x > R || e.y < T || e.y > B) continue;
      const sc = e.emerge > 0 ? clamp(1 - e.emerge / 0.45, 0.05, 1) : 1;
      ctx.moveTo(e.x + e.r * sc, e.y + e.r * 0.75); ctx.ellipse(e.x, e.y + e.r * 0.75, e.r * sc * (e.flying ? e.big * 0.8 : 1), e.r * 0.35 * sc, 0, 0, TAU);
    }
    ctx.moveTo(p.x + 24, p.y + 18); ctx.ellipse(p.x, p.y + 18, 24, 7, 0, 0, TAU);
    ctx.fill();
    // enemies (y-sorted)
    const vis = this.enemies.filter((e) => !(e.x < L || e.x > R || e.y < T || e.y > B));
    vis.sort((a, b) => a.y - b.y);
    for (const e of vis) {
      if (e.flying) continue;
      if (e.emerge > 0) {
        const k = clamp(1 - e.emerge / 0.45, 0, 1);
        ctx.save(); ctx.beginPath(); ctx.rect(e.x - e.r * 2, e.y - e.r * 4, e.r * 4, e.r * 4 + e.r * 0.75); ctx.clip();
        spr(ctx, SPR[e.type], e.x, e.y + (1 - k) * e.r * 2.6, 1); ctx.restore();
        continue;
      }
      const bob = Math.abs(Math.sin(e.wob)) * (e.type === 'king' ? 4 : 2.5);
      const s = e.flash > 0 ? SPR[e.type + '_w'] : e.type === 'flamingo' && e.ai === 'tele' ? SPR.flamingo_t : SPR[e.type];
      if (e.type === 'flamingo' && e.ai === 'tele') {
        ctx.strokeStyle = 'rgba(255,70,140,0.55)'; ctx.lineWidth = 6; ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + e.dx * 240, e.y + e.dy * 240); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.save(); ctx.translate(e.x, e.y - bob); ctx.scale(e.face, 1); ctx.rotate(Math.sin(e.wob) * 0.08);
      spr(ctx, s, 0, 0, 1); ctx.restore();
      if (e.type === 'king') {
        const w = 120; ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(e.x - w / 2, e.y - e.r * 2.6, w, 9);
        ctx.fillStyle = '#ffd23f'; ctx.fillRect(e.x - w / 2 + 1, e.y - e.r * 2.6 + 1, (w - 2) * clamp(e.hp / e.maxhp, 0, 1), 7);
      }
    }
    // player + bags (bags behind if above player)
    const hurtBlink = p.inv > 0 && ((this.realT * 14) | 0) % 2 === 0 && this.state === 'play';
    for (const b of this.bags) if (b.y < p.y) drawBag(ctx, b, p);
    if (this.state !== 'over' || !this.win) drawGranny(ctx, p, this.t, hurtBlink);
    for (const b of this.bags) if (b.y >= p.y) drawBag(ctx, b, p);
    if (p.boost > 0) { ctx.strokeStyle = 'rgba(255,220,120,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y - 5, 30, 0, TAU); ctx.stroke(); }
    // flyers on top
    for (const e of vis) {
      if (!e.flying) continue;
      const sc = e.big * (1 + 0.15 * Math.sin(e.fly * 20));
      const lift = 10 + 14 * Math.min(1, e.fly);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = e.r * 0.9 * e.big; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(e.x, e.y - lift); ctx.lineTo(e.x - e.fvx * 0.045, e.y - lift - e.fvy * 0.045); ctx.stroke();
      spr(ctx, SPR[e.type], e.x, e.y - lift, sc, e.rot);
    }
    // needles
    ctx.strokeStyle = '#d7dbe6'; ctx.lineWidth = 2.5;
    for (const n of this.needles) { const s = Math.hypot(n.vx, n.vy); ctx.beginPath(); ctx.moveTo(n.x, n.y - 10); ctx.lineTo(n.x - (n.vx / s) * 16, n.y - 10 - (n.vy / s) * 16); ctx.stroke(); }
    // particles
    for (const q of this.parts) {
      if (q.x < L || q.x > R || q.y < T || q.y > B) continue;
      const a = clamp(q.life / q.max, 0, 1);
      if (q.kind === 'pop') { ctx.globalAlpha = a * 0.75; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(q.x, q.y - 10, q.size * (1.5 - a * 0.5), 0, TAU); ctx.fill(); continue; }
      ctx.globalAlpha = q.kind === 'shard' ? 1 : a;
      ctx.fillStyle = q.col;
      if (q.kind === 'shard') quad(ctx, q.x, q.y - q.z, q.size, q.rot);
      else { ctx.beginPath(); ctx.arc(q.x, q.y - q.z, q.size * (q.kind === 'spark' ? a : 1), 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    for (const r of this.rings) {
      const k = 1 - r.t / r.maxT;
      ctx.strokeStyle = r.col; ctx.globalAlpha = 1 - k; ctx.lineWidth = r.w * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(r.x, r.y, lerp(r.r, r.max, 1 - (1 - k) * (1 - k)), 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // damage numbers
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const n of this.nums) {
      const a = clamp(n.life / n.max * 2, 0, 1), pop = 1 + Math.max(0, (n.life - n.max + 0.12) / 0.12) * 0.5;
      ctx.globalAlpha = a;
      drawText(ctx, n.txt, n.x, n.y, n.size, 900, n.col, 'rgba(30,10,20,0.85)', 4, 'center', pop);
    }
    ctx.globalAlpha = 1;
    // popups
    for (const q of this.popups) {
      const age = q.max - q.t, sc = age < 0.15 ? 0.4 + (age / 0.15) * 0.9 : 1.3 - Math.min(0.3, (age - 0.15) * 1.5);
      ctx.globalAlpha = clamp(q.t / 0.4, 0, 1);
      ctx.save(); ctx.translate(q.x, q.y - age * 30); ctx.rotate(-0.06); ctx.scale(sc, sc);
      drawText(ctx, q.txt, 0, 0, q.size, 900, 'grad', '#2a0f2a', 10, 'center', 1);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // ---------------- screen-space
    // (vignette is a CSS overlay: free to composite, ~4 ms per frame in software canvas)
    if (this.slowmo > 0 || this.state === 'dying') { ctx.fillStyle = 'rgba(40,0,60,0.12)'; ctx.fillRect(0, 0, vw, vh); }
    if (this.flash > 0) { ctx.globalAlpha = this.flash * 0.35; ctx.fillStyle = this.flashCol; ctx.fillRect(0, 0, vw, vh); ctx.globalAlpha = 1; }
    if (!opts.noHud) this.renderHud(ctx, vw, vh, opts.safe);
  };

  Game.prototype.renderHud = function (ctx, vw, vh, safe) {
    const p = this.player, F = HH.FONT;
    const s = clamp(Math.min(vw, vh) / 600, 0.75, 1.4);
    const pad = 14 * s;
    // keep the HUD out of notches and rounded corners: shift the whole layer by the safe-area insets
    const st = safe ? safe.t : 0, sl = safe ? safe.l : 0, sr = safe ? safe.r : 0;
    ctx.save(); ctx.translate(sl, st); vw = vw - sl - sr; vh = vh - st - (safe ? safe.b : 0);
    ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    // hearts
    for (let i = 0; i < p.maxHp; i++) {
      const x = pad + 14 * s + i * 30 * s, y = pad + 14 * s;
      heart(ctx, x, y, 11 * s, i < p.hp ? '#ff4d6d' : 'rgba(0,0,0,0.35)', i < p.hp);
    }
    // wave + timer
    const W = WAVES[this.wave];
    ctx.textAlign = 'center';
    outlined(ctx, W.boss ? 'the gnome king' : `wave ${this.wave + 1}/5`, vw / 2, pad + 12 * s, '#fff', 18 * s, 900, 'center');
    if (W.dur) {
      const left = Math.max(0, W.dur - this.waveT);
      const bw = 150 * s, bx = vw / 2 - bw / 2, by = pad + 28 * s;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; roundRect(ctx, bx, by, bw, 8 * s, 4 * s); ctx.fill();
      ctx.fillStyle = left < 4 ? '#C5FF49' : '#ffffff'; roundRect(ctx, bx, by, Math.max(8 * s, bw * (1 - this.waveT / W.dur)), 8 * s, 4 * s); ctx.fill();
    } else if (this.king) {
      const bw = Math.min(vw - 40, 320 * s), bx = vw / 2 - bw / 2, by = pad + 28 * s;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(ctx, bx, by, bw, 12 * s, 6 * s); ctx.fill();
      ctx.fillStyle = this.bossT > ENRAGE ? '#ff5a3c' : '#C5FF49'; roundRect(ctx, bx, by, Math.max(10 * s, bw * clamp(this.king.hp / this.king.maxhp, 0, 1)), 12 * s, 6 * s); ctx.fill();
      if (this.bossT > ENRAGE) outlined(ctx, 'enraged', vw / 2, by + 24 * s, '#ff8a6a', 12 * s, 800, 'center');
    }
    // kills + time
    ctx.textAlign = 'right';
    outlined(ctx, `${this.stats.yeets}`, vw - pad, pad + 12 * s, '#fff', 20 * s, 900, 'right');
    outlined(ctx, 'gnomes yeeted', vw - pad, pad + 30 * s, '#F5F3ED', 11 * s, 700, 'right');
    ctx.textAlign = 'left';
    outlined(ctx, fmtTime(this.t), pad, pad + 38 * s, '#fff', 13 * s, 800, 'left');
    // live chain counter
    if (this.hudChain.t > 0 && this.hudChain.n >= 3) {
      const n = this.hudChain.n, a = clamp(this.hudChain.t / 0.4, 0, 1), pulse = 1 + Math.max(0, this.hudChain.t - 1.3) * 1.2;
      ctx.globalAlpha = a; ctx.textAlign = 'center';
      ctx.save(); ctx.translate(vw / 2, pad + 78 * s); ctx.scale(pulse, pulse); ctx.rotate(-0.04);
      drawText(ctx, `BOWL x${n}`, 0, 0, (30 + Math.min(26, n * 0.8)) * s, 900, n >= 20 ? '#ff7ab6' : n >= 10 ? '#C5FF49' : '#ffffff', '#101114', 8, 'center', 1);
      ctx.restore(); ctx.globalAlpha = 1;
    }
    // banner
    if (this.banner) {
      const b = this.banner, age = 2.4 - b.t, a = clamp(Math.min(age / 0.25, b.t / 0.4), 0, 1);
      const slide = age < 0.25 ? (1 - age / 0.25) * 60 : 0;
      ctx.globalAlpha = a; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(16,17,20,0.6)'; ctx.fillRect(0, vh * 0.36 - 44 * s, vw, 98 * s);
      outlined(ctx, b.title, vw / 2 - slide, vh * 0.36 - 22 * s, '#C5FF49', 18 * s, 900, 'center');
      outlined(ctx, b.sub, vw / 2 + slide, vh * 0.36 + 10 * s, '#fff', 34 * s, 900, 'center');
      outlined(ctx, b.sub2, vw / 2, vh * 0.36 + 40 * s, '#B59AFF', 13 * s, 700, 'center');
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  };

  function outlined(ctx, txt, x, y, col, size, weight, align) { drawText(ctx, txt, x, y, size, weight, col, 'rgba(16,17,20,0.85)', 5, align, 1); }

  // Canvas text is slow (font fallback + raster per call), so every label is rendered once into a cached sprite.
  const TXT = new Map();
  function textSprite(txt, size, weight, fill, stroke, lw) {
    size = Math.max(6, Math.round(size));
    const key = txt + '|' + size + '|' + weight + '|' + fill + '|' + stroke + '|' + lw;
    let c = TXT.get(key);
    if (c) return c;
    if (TXT.size > 500) TXT.clear();
    const font = `${weight} ${size}px ${HH.FONT}`;
    c = document.createElement('canvas');
    let x = c.getContext('2d'); x.font = font;
    const w = Math.ceil(x.measureText(txt).width + lw * 2 + 6), h = Math.ceil(size * 1.3 + lw * 2);
    c.width = w * SS; c.height = h * SS; x = c.getContext('2d'); x.scale(SS, SS);
    x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    if (lw) { x.lineWidth = lw; x.strokeStyle = stroke; x.strokeText(txt, w / 2, h / 2); }
    if (fill === 'grad') { const gr = x.createLinearGradient(0, h / 2 - size / 2, 0, h / 2 + size / 2); gr.addColorStop(0, '#fff3a0'); gr.addColorStop(1, '#ff7a3c'); x.fillStyle = gr; }
    else x.fillStyle = fill;
    x.fillText(txt, w / 2, h / 2);
    c.w = w; c.h = h;
    TXT.set(key, c);
    return c;
  }
  function drawText(ctx, txt, x, y, size, weight, fill, stroke, lw, align, scale) {
    const c = textSprite(String(txt), size, weight, fill, stroke, lw);
    const w = c.w * scale, h = c.h * scale;
    const dx = align === 'left' ? x - 3 - lw : align === 'right' ? x - w + 3 + lw : x - w / 2;
    ctx.drawImage(c, dx, y - h / 2, w, h);
  }
  function heart(ctx, x, y, r, col, full) {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.6, y - r * 1.2, x, y - r * 0.45);
    ctx.bezierCurveTo(x + r * 0.6, y - r * 1.2, x + r * 1.4, y - r * 0.1, x, y + r * 0.9); ctx.fill();
    if (full) { ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.arc(x - r * 0.45, y - r * 0.35, r * 0.22, 0, TAU); ctx.fill(); }
  }
  function fmtTime(t) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${m}:${s < 10 ? '0' : ''}${s}`; }

  // upgrade icons (drawn, no font glyphs)
  function upgradeIcon(id, size) {
    const c = document.createElement('canvas'); c.width = c.height = size * 2; const x = c.getContext('2d'); x.scale(2, 2);
    const u = UP_BY_ID[id], m = size / 2;
    x.fillStyle = u.col; x.beginPath(); x.arc(m, m, m - 1, 0, TAU); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.18)'; x.beginPath(); x.arc(m - m * 0.2, m - m * 0.25, m * 0.55, 0, TAU); x.fill();
    x.save(); x.translate(m, m); x.fillStyle = '#fff'; x.strokeStyle = '#fff'; x.lineWidth = size * 0.07; x.lineCap = 'round'; x.lineJoin = 'round';
    const k = size / 64;
    const bag = (bx, by, s, col) => { x.fillStyle = col || '#fff'; x.beginPath(); x.moveTo(bx - 12 * s, by - 6 * s); x.lineTo(bx + 12 * s, by - 6 * s); x.lineTo(bx + 15 * s, by + 12 * s); x.lineTo(bx - 15 * s, by + 12 * s); x.closePath(); x.fill(); x.beginPath(); x.arc(bx, by - 6 * s, 8 * s, Math.PI, 0); x.stroke(); };
    switch (id) {
      case 'heavy': bag(0, 2 * k, k); x.fillStyle = u.col; x.fillRect(-7 * k, 2 * k, 14 * k, 7 * k); break;
      case 'strap': x.beginPath(); x.moveTo(-18 * k, -14 * k); x.quadraticCurveTo(0, 18 * k, 14 * k, -2 * k); x.stroke(); bag(14 * k, 4 * k, 0.55 * k); break;
      case 'purse': bag(-8 * k, 0, 0.7 * k); bag(10 * k, 4 * k, 0.7 * k); break;
      case 'scooter': x.beginPath(); x.moveTo(-14 * k, 6 * k); x.lineTo(14 * k, 6 * k); x.stroke(); x.beginPath(); x.arc(-10 * k, 12 * k, 4 * k, 0, TAU); x.arc(10 * k, 12 * k, 4 * k, 0, TAU); x.fill(); x.beginPath(); x.moveTo(10 * k, 6 * k); x.lineTo(14 * k, -14 * k); x.stroke(); x.beginPath(); x.moveTo(-20 * k, -6 * k); x.lineTo(-8 * k, -6 * k); x.moveTo(-22 * k, 0); x.lineTo(-12 * k, 0); x.stroke(); break;
      case 'bowl': x.beginPath(); x.arc(0, 0, 15 * k, 0, TAU); x.fill(); x.fillStyle = u.col; x.beginPath(); x.arc(-4 * k, -6 * k, 2.5 * k, 0, TAU); x.arc(3 * k, -7 * k, 2.5 * k, 0, TAU); x.arc(-1 * k, 0, 2.5 * k, 0, TAU); x.fill(); break;
      case 'pinball': x.beginPath(); x.moveTo(-18 * k, 14 * k); x.lineTo(0, -8 * k); x.lineTo(18 * k, 14 * k); x.stroke(); x.beginPath(); x.arc(0, -14 * k, 5 * k, 0, TAU); x.fill(); x.fillRect(-20 * k, 14 * k, 40 * k, 4 * k); break;
      case 'kaboom': for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; x.beginPath(); x.moveTo(Math.cos(a) * 5 * k, Math.sin(a) * 5 * k); x.lineTo(Math.cos(a) * 18 * k, Math.sin(a) * 18 * k); x.stroke(); } x.beginPath(); x.arc(0, 0, 6 * k, 0, TAU); x.fill(); break;
      case 'tea': x.beginPath(); x.moveTo(-13 * k, -6 * k); x.lineTo(13 * k, -6 * k); x.lineTo(9 * k, 12 * k); x.lineTo(-9 * k, 12 * k); x.closePath(); x.fill(); x.beginPath(); x.arc(15 * k, 2 * k, 5 * k, -1.4, 1.4); x.stroke(); x.beginPath(); x.moveTo(-4 * k, -11 * k); x.quadraticCurveTo(0, -16 * k, -2 * k, -20 * k); x.moveTo(4 * k, -11 * k); x.quadraticCurveTo(8 * k, -16 * k, 6 * k, -20 * k); x.stroke(); break;
      case 'windmill': for (let i = 0; i < 4; i++) { x.save(); x.rotate(i * Math.PI / 2); x.beginPath(); x.moveTo(0, 0); x.lineTo(18 * k, -4 * k); x.lineTo(16 * k, 6 * k); x.closePath(); x.fill(); x.restore(); } break;
      case 'needles': x.beginPath(); x.moveTo(-16 * k, 16 * k); x.lineTo(16 * k, -16 * k); x.moveTo(-6 * k, 18 * k); x.lineTo(18 * k, -6 * k); x.stroke(); x.beginPath(); x.arc(-15 * k, 15 * k, 4 * k, 0, TAU); x.fill(); break;
      case 'squeal': for (let i = 1; i <= 3; i++) { x.globalAlpha = 1 - i * 0.22; x.beginPath(); x.arc(0, 0, i * 6 * k, 0, TAU); x.stroke(); } x.globalAlpha = 1; break;
      case 'brooch': x.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, r = i % 2 ? 7 * k : 17 * k; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); x.fill(); break;
      case 'tin': x.fillRect(-15 * k, -6 * k, 30 * k, 18 * k); x.fillStyle = u.col; x.fillRect(-15 * k, -2 * k, 30 * k, 3 * k); x.fillStyle = '#fff'; x.fillRect(-17 * k, -10 * k, 34 * k, 5 * k); break;
      case 'ceramic': x.beginPath(); x.moveTo(-12 * k, 14 * k); x.lineTo(12 * k, 14 * k); x.lineTo(4 * k, -18 * k); x.closePath(); x.fill(); x.fillStyle = u.col; x.beginPath(); x.arc(0, 6 * k, 6 * k, 0, TAU); x.fill(); break;
    }
    x.restore();
    return c.toDataURL();
  }

  HH.FONT = 'ui-monospace, "SFMono-Regular", "JetBrains Mono", Menlo, Consolas, "Courier New", monospace';
  HH.Game = Game;
  HH.WAVES = WAVES; HH.TYPES = TYPES; HH.UPGRADES = UPGRADES; HH.UP_BY_ID = UP_BY_ID; HH.TUNE = TUNE;
  HH.ARENA = { w: ARENA_W, h: ARENA_H, fence: FENCE };
  HH.mulberry32 = mulberry32; HH.fmtTime = fmtTime; HH.upgradeIcon = upgradeIcon;
})();
