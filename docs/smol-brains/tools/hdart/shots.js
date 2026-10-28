// node shots.js <look: pixel|hd|3d> <W> <H> [tag]   (env PORT)
// god-view village, close village, first person by a farm; plus perf numbers
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const OUT = '/tmp/claude-0/-home-user-computercooked-site/9e16fbd6-0476-5ed7-a1d1-1bef57eca838/scratchpad/';
const look = process.argv[2] || 'hd', W = +(process.argv[3] || 1280), H = +(process.argv[4] || 720), tag = process.argv[5] || '', mob = W < 600;
const PORT = process.env.PORT || 8791, ONLY = process.env.ONLY || '';
const sfx = (mob ? '-phone' : '-desk') + (tag ? '-' + tag : '');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: mob ? 2 : 1, hasTouch: mob, isMobile: mob });
  p.setDefaultTimeout(300000);
  let errs = 0; p.on('pageerror', e => { errs++; console.log('PAGEERROR', e.message); });
  p.on('console', m => { if (m.type() === 'error' && !/api\/health/.test(m.text())) console.log('CONSOLE', m.text()); });
  // software GL is slow: pin the hd blur/glow on so the slow-frame fallback doesn't switch it off mid-shoot
  await p.addInitScript((fx) => { try { localStorage.setItem('smolbrains-hdfx', fx); } catch (e) {} }, process.env.FX || '1');
  await p.goto(`http://localhost:${PORT}/games/smol-brains/play/?play=1&nostory=1&world=art-7&look=${look}`);
  await p.waitForFunction(() => window.SB && SB.Game && SB.Game.current && SB.Game.current.world, null, { timeout: 300000 });
  await p.waitForTimeout(5000);
  await p.addStyleTag({ content: '.modal-wrap,.title{display:none!important}' });
  await p.evaluate(() => { try { SB.UI.closeModal(); } catch (e) {} });
  const pos = await p.evaluate(() => {
    const g = SB.Game.current; g.speed = 0; g.tutorial.done = true; g.podT = 1e9; if (g.dir) g.dir.nextT = 1e9;
    SB.Debug.reveal();
    const h = SB.Society.home(g, 0), out = {}, Wd = SB.World;
    const kinds = ['hut', 'farm', 'hut', 'windmill', 'hut', 'campfire', 'farm', 'workshop', 'hut', 'totem'];
    let i = 0;
    for (let r = 3.5; i < kinds.length && r < 30; r += 1.1) for (let a = 0.3; a < 6.6 && i < kinds.length; a += 0.9 / Math.max(1, r / 6)) {
      const x = h.x + Math.cos(a) * r, z = h.z + Math.sin(a) * r, k = kinds[i], rad = SB.STRUCTS[k].r + 0.5;
      if (!Wd.walkable(g.world, x, z) || Wd.depthAt(g.world, x, z) > 0.01) continue;
      if (g.world.structures.some(s => Math.hypot(s.x - x, s.z - z) < rad + SB.STRUCTS[s.kind].r)) continue;
      const s = SB.Debug.build(k, x, z); if (k === 'campfire') { s.data.lit = true; s.data.fuel = 1; }
      if (k === 'farm') s.data.grow = i === 1 ? 0.9 : 0.45;
      if (!out[k]) out[k] = [x, z]; i++;
    }
    const cs = SB.Debug.spawnTier(1, 3).concat(SB.Debug.spawnTier(3, 4), SB.Debug.spawnTier(4, 4));
    cs.forEach(c => { c.asleep = false; });
    // loose things to pick up round the middle
    const loose = ['apple', 'berry', 'cherry', 'stick', 'stone', 'egg', 'carrot', 'grain', 'clay', 'flint', 'shroom', 'ore'];
    loose.forEach((k, j) => { const a = j * 0.52, r = 1.6 + (j % 3) * 0.7; try { Wd.add(g.world, g, k, h.x + Math.cos(a) * r, h.z + Math.sin(a) * r, k === 'egg' ? { genome: SB.Genome.forTier(g.rng, 1) } : {}); } catch (e) { } });
    out.home = [h.x, h.z];
    SB.Render.markAllDirty();
    return out;
  });
  const setTime = async (time) => p.evaluate((time) => { const g = SB.Game.current; g.time = g.world.time = SB.DAY_LENGTH * (Math.floor(g.time / SB.DAY_LENGTH) + time); const w = g.world.weather; w.cloud = 0.15; w.rain = 0; w.kind = 'clear'; w.next = 1e9; }, time);
  const cam = async (x, z, zoom, time, yaw) => {
    await p.evaluate(([x, z, zoom, yaw]) => { const c = SB.Render.camera; c.follow = null; c.intro = null; c.x = x; c.z = z; c.zoom = c.tZoom = zoom; c.yaw = c.tYaw = yaw == null ? 0.6 : yaw; c.vx = c.vz = 0; try { SB.UI.closeModal(); } catch (e) {} }, [x, z, zoom, yaw]);
    await setTime(time);
    await p.waitForTimeout(3500);
  };
  const shot = async (name) => { const f = OUT + 'hd-' + look + '-' + name + sfx + '.png'; await p.screenshot({ path: f }); console.log('shot', f); };
  const perf = async (name) => { await p.waitForTimeout(2500); const r = await p.evaluate(() => ({ tris: SB.Render.perf.tris | 0, draws: SB.Render.perf.draws, ft: Math.round(SB.Render.perf.ft * 10) / 10, buf: SB.Render.canvasSize(), cv: [document.getElementById('view').width, document.getElementById('view').height] })); console.log('PERF', look, sfx, name, JSON.stringify(r)); };
  const h = pos.home, f = pos.farm || h;
  const mx = (h[0] + f[0]) / 2, mz = (h[1] + f[1]) / 2;
  if (!ONLY || ONLY.includes('village')) { await cam(mx, mz, 11, 0.4); await shot('village'); await perf('village'); }
  if (process.env.DBG) {
    for (const d of [1, 2]) { await p.evaluate((d) => { SB.HD.debug = d; }, d); await p.waitForTimeout(1500); await shot('dbg' + d); }
    await p.evaluate(() => { SB.HD.debug = 0; });
  }
  if (!ONLY || ONLY.includes('close')) { await cam(mx, mz, 5.5, 0.4); await shot('village-close'); }
  if (!ONLY || ONLY.includes('pov')) {
    await setTime(0.36);
    const ok = await p.evaluate(([fx, fz, hx, hz]) => {
      const g = SB.Game.current, c = g.creatures.find(c => c.alive && c.species === 'smol' && c.tier >= 3);
      if (!c) return false;
      // stand 3.4 units from the farm on the side away from home, looking at the farm with the village behind it
      const base = Math.atan2(fz - hz, fx - hx);
      let px = fx, pz = fz;
      for (let k = 0; k < 24; k++) {
        const a = base + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.26, x = fx + Math.cos(a) * 3.4, z = fz + Math.sin(a) * 3.4;
        if (!SB.World.walkable(g.world, x, z) || SB.World.depthAt(g.world, x, z) > 0.01) continue;
        if (g.world.structures.some(s => Math.hypot(s.x - x, s.z - z) < SB.STRUCTS[s.kind].r + 1.4 && s.x !== fx)) continue;
        px = x; pz = z; break;
      }
      c.x = c.px = px; c.z = c.pz = pz; c.y = c.py = SB.World.groundY(g.world, c.x, c.z);
      c.facing = Math.atan2(fx - c.x, fz - c.z);
      g.speed = 1;
      return SB.Possess.enter(g, c, { free: true });
    }, [f[0], f[1], h[0], h[1]]);
    console.log('possess', ok);
    await p.waitForTimeout(4000);
    await p.evaluate(() => { SB.Game.current.speed = 0; });
    await p.waitForTimeout(2500);
    await shot('pov'); await perf('pov');
  }
  console.log('errors', errs);
  await b.close();
})();
