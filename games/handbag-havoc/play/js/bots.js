/* Handbag Havoc: playtest bots + headless balance simulator.
   random  = key-mashing: a random direction (or nothing) held for 0.15-0.7 s, random upgrade picks.
   skilled = kites around the arena centre, dodges telegraphs, grabs biscuits when hurt, picks a sensible build. */
(function () {
  'use strict';
  const HH = (window.HH = window.HH || {});
  const DIRS = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

  const Bots = {
    random: {
      move(g, mem, dt, rnd) {
        mem.t = (mem.t || 0) - dt;
        if (mem.t <= 0) {
          mem.t = 0.15 + rnd() * 0.55;
          const d = rnd() < 0.1 ? DIRS[0] : DIRS[1 + Math.floor(rnd() * 8)];
          mem.x = d[0]; mem.y = d[1];
        }
        return { x: mem.x, y: mem.y };
      },
      pick(g, rnd) { return g.offers[Math.floor(rnd() * g.offers.length)]; },
    },
    skilled: {
      move(g, mem, dt) {
        const p = g.player, A = HH.ARENA;
        const cx = A.w / 2, cy = A.h / 2;
        let ax = 0, ay = 0;
        // orbit the centre (keeps the purse swinging and the crowd trailing behind)
        const K = g.king && !g.king.dead && g.king.emerge <= 0 ? g.king : null;
        const ox = K ? K.x : cx, oy = K ? K.y : cy;
        const rx = p.x - ox, ry = p.y - oy, rd = Math.hypot(rx, ry) || 1;
        const want = K ? 165 : 430;
        ax += (-ry / rd) * 1.0; ay += (rx / rd) * 1.0;
        ax += (-(rd - want) / rd) * (rx / rd) * 0.0 + ((want - rd) / want) * (rx / rd) * 1.2;
        ay += ((want - rd) / want) * (ry / rd) * 1.2;
        // flee nearby gnomes
        let fx = 0, fy = 0;
        for (const e of g.enemies) {
          if (e.dead || e.flying) continue;
          const dx = p.x - e.x, dy = p.y - e.y, d2 = dx * dx + dy * dy;
          const rng = e.type === 'king' ? 125 : e.type === 'flamingo' && e.ai !== 'walk' ? 260 : 120;
          if (d2 > rng * rng) continue;
          const d = Math.sqrt(d2) || 1, w = (rng - d) / rng * (e.type === 'king' ? 3 : e.type === 'chonk' ? 1.6 : 1);
          if (e.type === 'flamingo' && e.ai !== 'walk') { fx += -e.dy * w * 2.5 * Math.sign(-e.dy * dx + e.dx * dy || 1); fy += e.dx * w * 2.5 * Math.sign(-e.dy * dx + e.dx * dy || 1); }
          fx += (dx / d) * w; fy += (dy / d) * w;
        }
        ax += fx * 2.2; ay += fy * 2.2;
        // dodge slam telegraphs
        for (const t of g.teles) {
          const dx = p.x - t.x, dy = p.y - t.y, d = Math.hypot(dx, dy) || 1;
          if (d < t.r + 40) { ax += (dx / d) * 4; ay += (dy / d) * 4; }
        }
        // biscuits when hurt
        if (p.hp < p.maxHp) for (const b of g.biscuits) {
          const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy) || 1;
          if (d < 260) { ax += (dx / d) * 1.5; ay += (dy / d) * 1.5; }
        }
        // stay off the fence
        const m = 150;
        if (p.x < m) ax += 2; if (p.x > A.w - m) ax -= 2; if (p.y < m) ay += 2; if (p.y > A.h - m) ay -= 2;
        const l = Math.hypot(ax, ay) || 1;
        return { x: ax / l, y: ay / l };
      },
      pick(g) {
        const pref = ['purse', 'heavy', 'windmill', 'strap', 'bowl', 'kaboom', 'squeal', 'pinball', 'needles', 'scooter', 'brooch', 'ceramic', 'tin', 'tea'];
        if (g.player.hp <= 2 && g.offers.includes('tea')) return 'tea';
        let best = g.offers[0], bi = 99;
        for (const id of g.offers) { const i = pref.indexOf(id); if (i >= 0 && i < bi) { bi = i; best = id; } }
        return best;
      },
    },
  };

  // Run n headless games. Returns per-run results + a summary.
  function simulate(n, botName, seed0, maxT) {
    const bot = Bots[botName];
    const out = [];
    const dt = 1 / 60;
    for (let i = 0; i < n; i++) {
      const g = new HH.Game({ seed: (seed0 || 1000) + i * 7919, headless: true });
      const rnd = HH.mulberry32(((seed0 || 1000) + i) * 31 + 7);
      const mem = {};
      let steps = 0;
      while (g.state !== 'over' && g.t < (maxT || 400) && steps < 60 * 600) {
        if (g.state === 'upgrade') { g.choose(bot.pick(g, rnd)); continue; }
        const v = bot.move(g, mem, dt, rnd);
        g.input.x = v.x; g.input.y = v.y;
        g.update(dt);
        steps++;
      }
      out.push({ time: +g.t.toFixed(1), wave: g.stats.wave, win: g.win, kills: g.stats.kills, yeets: g.stats.yeets, bestChain: g.stats.bestChain, topMph: Math.round(g.stats.topSpeed * HH.MPH), picks: g.stats.picks.join(',') , bossHp: +(g.stats.bossHp).toFixed(2)});
    }
    const times = out.map((r) => r.time).sort((a, b) => a - b);
    const q = (f) => times[Math.min(times.length - 1, Math.floor(f * times.length))];
    const summary = {
      bot: botName, runs: n,
      median: q(0.5), p10: q(0.1), p25: q(0.25), p75: q(0.75), p90: q(0.9),
      winRate: +(out.filter((r) => r.win).length / n).toFixed(2),
      in45to90: +(out.filter((r) => r.time >= 45 && r.time <= 90).length / n).toFixed(2),
      medianChain: out.map((r) => r.bestChain).sort((a, b) => a - b)[Math.floor(n / 2)],
      maxChain: Math.max(...out.map((r) => r.bestChain)),
      waveHist: [1, 2, 3, 4, 5].map((w) => out.filter((r) => r.wave === w && !r.win).length),
    };
    return { summary, runs: out };
  }

  HH.MPH = 0.08; // world units/s -> "mph" for the share line (1 unit ~ 3.6 cm)
  HH.Bots = Bots;
  HH.simulate = simulate;
})();
