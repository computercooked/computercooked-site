// Arriving from bushgrowth.com's Projects page (?from=bushgrowth). There, clicking Computer Cooked sets the whole screen
// on pixel fire before coming here; this page opens under the same fire (the head script and html.cc-arrive cover the
// first paint) and lets it burn down to show the site. Same palette and pixel size as bushgrowth.com/projects.
// Skipped for reduced motion. Removes ?from from the address either way.
(() => {
  'use strict';
  const html = document.documentElement;
  const clean = () => {
    try {
      const u = new URL(location.href);
      if (u.searchParams.has('from')) { u.searchParams.delete('from'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); }
    } catch (e) {}
  };
  clean();
  if (!html.classList.contains('cc-arrive')) return;

  const CELL = 8, MAX = 36, cols = Math.ceil(innerWidth / CELL), rows = Math.ceil(innerHeight / CELL) + 2;
  const cv = document.createElement('canvas');
  cv.width = cols; cv.height = rows;
  cv.setAttribute('aria-hidden', 'true');
  Object.assign(cv.style, { position: 'fixed', left: '0', top: '0', width: cols * CELL + 'px', height: rows * CELL + 'px',
    zIndex: '2147483647', imageRendering: 'pixelated', pointerEvents: 'none' });
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d'), img = ctx.createImageData(cols, rows), px = new Uint32Array(img.data.buffer);
  const f = new Uint8Array(cols * rows);

  const stops = [[0, 14, 15, 17], [7, 52, 14, 24], [13, 140, 30, 36], [19, 255, 90, 78], [25, 255, 150, 60], [31, 255, 214, 120], [36, 236, 255, 170]];
  const pal = new Uint32Array(MAX + 1);
  for (let i = 1; i <= MAX; i++) {
    let a = stops[0], b = stops[1];
    for (let s = 0; s < stops.length - 1; s++) if (i >= stops[s][0] && i <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
    const k = (i - a[0]) / (b[0] - a[0]), c = [1, 2, 3].map(j => Math.round(a[j] + (b[j] - a[j]) * k));
    pal[i] = ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;
  }
  // start where bushgrowth.com left off: white-hot at the bottom, dark at the top, every cell burning
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++)
    f[y * cols + x] = Math.max(1, Math.min(MAX, Math.round(MAX - (rows - 1 - y) * .3 - Math.random() * 3)));

  function paint() {
    for (let i = 0; i < f.length; i++) px[i] = pal[f[i]];
    ctx.putImageData(img, 0, 0);
  }
  paint();
  html.classList.remove('cc-arrive');

  let n = 0;
  (function burn() {
    n++;
    const last = (rows - 1) * cols, dec = Math.min(.95, .35 + n * .02);
    for (let x = 0; x < cols; x++) f[last + x] = 0;           // the fire is out at the source; it burns down from here
    for (let it = 0; it < 2; it++)
      for (let x = 0; x < cols; x++) for (let y = 1; y < rows; y++) {
        const src = y * cols + x, p = f[src];
        if (!p) { f[src - cols] = 0; continue; }
        const r = Math.random() * 4 | 0, dst = src - r + 1 - cols;
        if (dst >= 0) f[dst] = Math.max(0, p - (Math.random() < dec ? 2 : 0));
      }
    paint();
    let lit = 0; for (let i = 0; i < f.length; i += 7) lit += f[i];
    if (lit && n < 120) requestAnimationFrame(burn); else cv.remove();
  })();
})();
