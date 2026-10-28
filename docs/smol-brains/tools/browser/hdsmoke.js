// real-mouse check of first-person look: click to lock, move the mouse, drag fallback, arrow keys; plus HUD shots
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const OUT = '/tmp/claude-0/-home-user-computercooked-site/9e16fbd6-0476-5ed7-a1d1-1bef57eca838/scratchpad/hdsmoke/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.setDefaultTimeout(240000);
  await p.addInitScript(() => { window.SB_N = 384; try { localStorage.clear(); localStorage.setItem('smolbrains-look','hd'); } catch (e) {} });
  let errs = 0; p.on('pageerror', e => { errs++; console.log('PAGEERROR', e.message, (e.stack || '').split('\n')[1]); });
  // through the site's player page, the way the owner plays it (an iframe)
  await p.goto('http://127.0.0.1:8963/games/smol-brains/');
  const fr = await (await p.waitForSelector('#game-frame')).contentFrame();
  await fr.waitForFunction(() => window.SB && SB.Game && SB.Game.current && SB.Game.current.world && !SB.Game.current.showcase && SB.Render && SB.Render.camera, null, { timeout: 400000 }).catch(async () => {
    // the title screen: start a new island
    await fr.evaluate(() => { sessionStorage.setItem('smolbrains-boot', 'play'); location.reload(); });
    await fr.waitForFunction(() => window.SB && SB.Game && SB.Game.current && SB.Game.current.world && SB.Render && SB.Render.camera, null, { timeout: 400000 });
  });
  await p.waitForTimeout(3000);
  await fr.click('.introgate', { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(1500); await fr.click('.introskip', { timeout: 20000 }).catch(() => {});
  await fr.getByText('no, i know how to play').click({ timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(1000);
  console.log('covering', await fr.evaluate(() => !!(SB.Intro && SB.Intro.covering)));
  await fr.evaluate(() => { const g = SB.Game.current; g.tutorial.done = true; if (g.dir) g.dir.nextT = 1e9; g.podT = 1e9; try { SB.Intro && SB.Intro.skip && SB.Intro.skip(); } catch (e) {} SB.UI.closeModal && SB.UI.closeModal();
    const cs = SB.Debug.spawnTier(3, 3); cs.forEach(c => { c.age = 900; c.chem.hunger = 0.3; c.asleep = false; }); SB.Debug.reveal(); g.sparks = 50;
    SB.Possess.enter(g, cs[0]); });
  await p.waitForTimeout(3500);
  const yaw = () => fr.evaluate(() => [SB.Render.camera.pov.yaw.toFixed(3), SB.Render.camera.pov.pitch.toFixed(3), !!document.pointerLockElement, !!(SB.Intro && SB.Intro.covering), SB.Game.current.world.time.toFixed(1)]);
  const y0 = await yaw(); console.log('start', y0);
  await p.mouse.move(640, 360); await p.mouse.down(); await p.mouse.up();
  await p.waitForTimeout(500);
  for (let i = 0; i < 10; i++) { await p.mouse.move(640 + i * 30, 360 + i * 5); await p.waitForTimeout(50); }
  await p.waitForTimeout(400);
  console.log('after click + move', await yaw());
  // drag fallback
  await fr.evaluate(() => { if (document.exitPointerLock) document.exitPointerLock(); });
  await p.waitForTimeout(300);
  await p.mouse.move(600, 360); await p.mouse.down(); for (let i = 0; i < 10; i++) { await p.mouse.move(600 - i * 25, 360); await p.waitForTimeout(40); } await p.mouse.up();
  await p.waitForTimeout(400);
  console.log('after drag', await yaw());
  await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(700); await p.keyboard.up('ArrowLeft');
  await p.waitForTimeout(300);
  console.log('after arrow', await yaw());
  await fr.evaluate(() => { const g = SB.Game.current, c = SB.Possess.c; const a = SB.World.add(g.world, g, 'apple', c.x + Math.sin(c.facing) * 1.1, c.z + Math.cos(c.facing) * 1.1, {}); SB.Possess.faceTo(a.x, a.z, -0.4); });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: OUT + 'hud-desk.png' });
  console.log('errors', errs);
  await b.close();
})();
