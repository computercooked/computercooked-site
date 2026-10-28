// node perf.js <look> <W> <H> [fx 0|1]  -> JS ms per frame (R.frame) and frame time, village close-up, game running
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const look = process.argv[2] || 'hd', W = +(process.argv[3] || 390), H = +(process.argv[4] || 844), fx = process.argv[5], mob = W < 600;
const PORT = process.env.PORT || 8791;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: mob ? 2 : 1, hasTouch: mob, isMobile: mob });
  p.setDefaultTimeout(300000);
  if (fx != null) await p.addInitScript((fx) => { try { localStorage.setItem('smolbrains-hdfx', fx); } catch (e) {} }, fx);
  await p.goto(`http://localhost:${PORT}/games/smol-brains/play/?play=1&nostory=1&world=art-7&look=${look}`);
  await p.waitForFunction(() => window.SB && SB.Game && SB.Game.current && SB.Game.current.world, null, { timeout: 300000 });
  await p.waitForTimeout(4000);
  await p.addStyleTag({ content: '.modal-wrap,.title{display:none!important}' });
  await p.evaluate(() => {
    try { SB.UI.closeModal(); } catch (e) {}
    const g = SB.Game.current; g.tutorial.done = true; g.podT = 1e9; if (g.dir) g.dir.nextT = 1e9; g.speed = 1;
    SB.Debug.reveal(); const h = SB.Society.home(g, 0);
    ['hut', 'farm', 'hut', 'campfire', 'hut'].forEach((k, i) => SB.Debug.build(k, h.x + Math.cos(i * 1.3) * 4, h.z + Math.sin(i * 1.3) * 4));
    SB.Debug.spawnTier(3, 12);
    const c = SB.Render.camera; c.follow = null; c.x = h.x; c.z = h.z; c.zoom = c.tZoom = 7;
    const R = SB.Render, f = R.frame; window.__js = []; R.frame = function () { const t = performance.now(); f.apply(this, arguments); window.__js.push(performance.now() - t); };
  });
  await p.waitForTimeout(4000);
  await p.evaluate(() => { window.__js = []; });
  await p.waitForTimeout(8000);
  const r = await p.evaluate(() => { const a = window.__js.slice().sort((x, y) => x - y); const avg = a.reduce((s, v) => s + v, 0) / a.length; return { frames: a.length, jsAvg: +avg.toFixed(2), jsP90: +a[Math.floor(a.length * 0.9)].toFixed(2), ft: +SB.Render.perf.ft.toFixed(1), buf: SB.Render.canvasSize(), fx: SB.Render.quality.fx, tris: SB.Render.perf.tris | 0, draws: SB.Render.perf.draws }; });
  console.log('PERF', look, W + 'x' + H, 'fx=' + fx, JSON.stringify(r));
  await b.close();
})();
