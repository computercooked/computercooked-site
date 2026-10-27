// only 1% can close this pop-up. 30 fake pop-ups, about 5 seconds each. one mistake and you start over.
(function () {
  'use strict';
  const SLUG = 'one-percent-popup';
  const URL_TXT = 'computercooked.com/games/' + SLUG;
  const BEST_KEY = 'cc-' + SLUG + '-best';
  const SPOOK_KEY = 'cc-' + SLUG + '-spooky';
  const $ = (id) => document.getElementById(id);
  const stage = $('stage');
  const layer = document.createElement('div');
  layer.style.cssText = 'position:absolute;inset:0;z-index:5';
  stage.appendChild(layer);

  // ---------- platform sdk: optional, every call guarded ----------
  const sdk = (fn) => { try { if (window.cc) fn(window.cc); } catch (e) { /* the game never depends on it */ } };
  let lastScoreSent = 0;
  const sdkScore = (n) => { const t = performance.now(); if (t - lastScoreSent > 400) { lastScoreSent = t; sdk((c) => c.score && c.score(n)); } };

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* blocked storage: still playable */ } },
  };
  let best = +store.get(BEST_KEY) || 0;

  // ---------- made-up "x% of players" curve: 100% see level 1, 1% reach level 30 ----------
  // TODO(cc data): swap for real reach rates from the platform once there are plays to count
  const reachPct = (l) => 100 * Math.exp(-Math.log(100) * (l - 1) / 29);
  const fmtPct = (l) => { const p = reachPct(l); return p >= 10 ? Math.round(p) + '%' : p.toFixed(1) + '%'; };

  // ---------- halloween: auto-on through october, toggle remembered ----------
  const now = new Date();
  const spookyDefault = now.getMonth() === 9;
  let spooky = store.get(SPOOK_KEY) === null ? spookyDefault : store.get(SPOOK_KEY) === '1';
  const applySpooky = () => document.body.classList.toggle('spooky', spooky);
  applySpooky();
  const T = (s) => (spooky ? '🎃 ' : '') + s;

  // ---------- sound: tiny webaudio blips ----------
  let actx = null, muted = false, extMuted = false, master = null;
  function audio() {
    if (!actx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        actx = new AC(); master = actx.createGain(); master.connect(actx.destination);
      } catch (e) { return null; }
    }
    if (actx.state === 'suspended') actx.resume().catch(() => {});
    master.gain.value = muted || extMuted ? 0 : 0.35;
    return actx;
  }
  function tone(f, d, type, vol, slide) {
    const a = audio(); if (!a || muted || extMuted) return;
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime(vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.02);
  }
  const sfx = {
    tap: () => tone(520, 0.05, 'square', 0.08),
    win: () => { tone(660, 0.09, 'square', 0.15); setTimeout(() => tone(990, 0.14, 'square', 0.15), 70); },
    fail: () => tone(220, 0.45, 'sawtooth', 0.25, 55),
    tick: () => tone(1200, 0.03, 'square', 0.06),
    nope: () => tone(160, 0.12, 'square', 0.15),
    big: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'square', 0.15), i * 110)),
  };
  function setMuteLabel() { $('muteBtn').textContent = muted || extMuted ? 'sound off' : 'sound on'; }
  $('muteBtn').addEventListener('click', (e) => { e.stopPropagation(); muted = !muted; if (extMuted) { extMuted = false; muted = false; } audio(); setMuteLabel(); });

  // ---------- helpers ----------
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const W = () => stage.clientWidth, H = () => stage.clientHeight;
  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function place(e, x, y) {
    e.style.left = Math.round(Math.max(4, Math.min(W() - e.offsetWidth - 4, x))) + 'px';
    e.style.top = Math.round(Math.max(4, Math.min(H() - e.offsetHeight - 4, y))) + 'px';
  }
  const center = (e, dy) => place(e, (W() - e.offsetWidth) / 2, (H() - e.offsetHeight) / 2 + (dy || 0));
  const randomPlace = (e) => place(e, rnd(4, W() - e.offsetWidth - 4), rnd(4, H() - e.offsetHeight - 4));
  function pop(o) {
    const p = el('div', 'pop' + (o.cls ? ' ' + o.cls : ''));
    p.style.width = Math.min(o.w || 300, W() - 24) + 'px';
    p.innerHTML = `<div class="bar"><span class="ttl">${T(o.title || 'notice')}</span>${o.x === false ? '' : '<b class="x">×</b>'}</div><div class="body">${o.body || ''}</div>`;
    layer.appendChild(p);
    p.x = p.querySelector('.x');
    if (o.at === 'random') randomPlace(p); else center(p, o.dy);
    return p;
  }
  // a tap: pointerdown is instant on phones and mice; only while the level is live
  function tap(e, fn) {
    e.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation(); ev.preventDefault();
      if (state !== 'play') return;
      sfx.tap(); lastTap.x = ev.clientX; lastTap.y = ev.clientY; fn(ev);
    });
  }
  const lastTap = { x: 0, y: 0 };
  function poof() {
    const r = stage.getBoundingClientRect();
    for (let i = 0; i < 10; i++) {
      const d = el('i', 'spark'), a = i / 10 * 6.283, dist = 40 + Math.random() * 40;
      d.style.left = (lastTap.x - r.left) + 'px'; d.style.top = (lastTap.y - r.top) + 'px';
      stage.appendChild(d);
      d.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * dist}px), calc(-50% + ${Math.sin(a) * dist}px)) scale(.3)`, opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => d.remove();
    }
  }
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 1600); }

  // a pop-up whose X jumps away n times before it can be hit
  function runaway(p, n, onClose, moveWhole) {
    let left = n;
    const jump = () => {
      left--; sfx.nope();
      if (moveWhole === false) return;
      const ox = p.offsetLeft, oy = p.offsetTop;
      let tries = 0, nx, ny;
      do { nx = rnd(4, W() - p.offsetWidth - 4); ny = rnd(4, H() - p.offsetHeight - 4); } while (Math.hypot(nx - ox, ny - oy) < Math.min(W(), H()) * 0.3 && ++tries < 12);
      place(p, nx, ny);
    };
    p.x.addEventListener('pointerenter', (ev) => { if (state === 'play' && ev.pointerType === 'mouse' && left > 0) jump(); });
    tap(p.x, () => { if (left > 0) jump(); else onClose(); });
  }
  // a chain of "are you sure?" dialogs; answers: array of [question, yesLabel, noLabel, yesIsRight]
  function sureChain(steps, done, fail) {
    let i = 0;
    const next = () => {
      if (i >= steps.length) return done();
      const [q, a, b, aRight] = steps[i++];
      const p = pop({ title: 'confirm', x: false, w: 280, body: `<h4>${q}</h4><div class="row"></div>` });
      const row = p.querySelector('.row');
      const ba = el('div', 'btn big', a), bb = el('div', 'btn alt', b);
      row.append(ba, bb);
      tap(ba, () => { p.remove(); aRight ? next() : fail(); });
      tap(bb, () => { p.remove(); aRight ? fail() : next(); });
    };
    next();
  }
  function cookieBanner(opts, onReject, onAccept) {
    const c = el('div', 'cookie', `<b>${T('we value your privacy')}</b><br>${opts.text || 'we use 412 cookies to sell your attention span.'}<div class="row"><div class="btn">accept all</div><div class="btn alt">manage</div><span class="tiny">reject all</span></div>`);
    c.style.bottom = (opts.bottom != null ? opts.bottom : 8) + 'px';
    layer.appendChild(c);
    const [acc, man] = c.querySelectorAll('.btn');
    tap(acc, () => onAccept(c));
    tap(man, () => { c.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], 160); toast('managing is not allowed.'); });
    tap(c.querySelector('.tiny'), () => { c.remove(); onReject(c); });
    return c;
  }

  // ---------- the 30 levels ----------
  // each: say (the instruction), time (s), setup(L). L.win(), L.fail(why), L.tick(fn(dt)), L.stageTap(fn), L.timeoutWins
  const LEVELS = [
    { say: 'close it.', setup(L) {
      const p = pop({ title: 'congratulations!!', body: '<h4>you are the 1,000,000th visitor</h4>claim your free ipad now. definitely not a scam.' });
      tap(p.x, L.win);
    } },
    { say: 'close it.', setup(L) {
      const p = pop({ title: 'windows update', body: '<h4>installing update 1 of 847</h4>do not turn off your computer. or your dreams.' });
      p.x.style.cssText = 'width:16px;height:16px;font-size:11px;border-radius:4px';
      tap(p.x, L.win);
    } },
    { say: 'close it.', setup(L) {
      const p = pop({ title: 'one quick survey', x: false, body: '<h4>how was your experience?</h4>pick a button. only one is honest.<div class="row"></div>' });
      const row = p.querySelector('.row');
      shuffle([['close', true], ['c1ose', false], ['clsoe', false]]).forEach(([t, ok]) => {
        const b = el('div', 'btn', t); row.appendChild(b);
        tap(b, () => (ok ? L.win() : L.fail(`that said "${t}". reading is free.`)));
      });
    } },
    { say: 'close it.', setup(L) {
      const p = pop({ title: 'hot singles in your router', w: 260, body: 'they are 2 meters away and want to talk about your extended warranty.' });
      runaway(p, 3, L.win);
    } },
    { say: 'reject the cookies.', setup(L) {
      const p = pop({ title: 'news site', x: false, dy: -40, body: '<h4>local man closes pop-up</h4>experts stunned. more after these 14 ads.' });
      p.classList.add('dis');
      cookieBanner({}, L.win, () => L.fail('you accepted. they own your cursor now.'));
    } },
    { say: 'reject all the cookies.', time: 6, setup(L) {
      let alive = 0;
      const spawn = (bottom) => { alive++; cookieBanner({ bottom, text: pick(['cookies help us remember you forever.', 'by existing you agree to cookies.', 'our 1,042 partners say hi.', 'cookies. but make them legal.']) }, () => { if (--alive === 0) L.win(); }, (c) => { c.remove(); alive--; sfx.nope(); toast('accepting makes more. obviously.'); spawn(rnd(8, H() - 120)); spawn(rnd(8, H() - 120)); }); };
      spawn(8); spawn(H() * 0.38); spawn(H() * 0.7);
    } },
    { say: 'close it.', time: 6, setup(L) {
      const p = pop({ title: 'leaving so soon?', body: '<h4>wait!</h4>before you go, would you like 10% off nothing?' });
      tap(p.x, () => { p.remove(); sureChain([
        ['are you sure?', 'yes', 'no', true],
        ['are you SURE sure?', 'no', 'yes', false],
        ['last chance. close it?', 'keep it open', 'close it', false],
      ], L.win, () => L.fail('wrong answer. read the buttons, not the vibes. it lives here now.')); });
    } },
    { say: 'close it.', setup(L) {
      const p = pop({ title: 'MEGA SALE', x: false, w: 300, body: '' });
      p.querySelector('.body').outerHTML = '<div class="ad">e<span>x</span>tra deals!!<br>90% off bo<span>x</span>es<br>ma<span>x</span> savings<br><span class="real">×</span> limited time</div>';
      tap(p.querySelector('.real'), L.win);
      p.querySelectorAll('.ad span:not(.real)').forEach((s) => tap(s, () => L.fail('that was an x. you needed the ×.')));
      tap(p.querySelector('.ad'), () => L.fail('you clicked the ad. enjoy your 40 new tabs.'));
    } },
    { say: 'close it.', timeoutWins: true, setup(L) {
      const p = pop({ title: 'important', x: false, body: '<h4>this pop-up closes itself</h4><span style="font-size:10px;color:#8a8794">if you do not touch anything</span><div class="row"><div class="btn big">close</div></div>' });
      tap(p.querySelector('.btn'), () => L.fail('it said don\'t touch anything. in small text. classic.'));
      L.stageTap(() => L.fail('you touched it. it said not to. in small text.'));
    } },
    { say: 'close it.', setup(L) {
      const p = pop({ title: 'dvd screensaver ad', w: 220, at: 'random', body: 'will it hit the corner? buy premium to find out.' });
      let vx = pick([-1, 1]) * Math.max(140, W() * 0.35), vy = pick([-1, 1]) * Math.max(120, H() * 0.3), x = p.offsetLeft, y = p.offsetTop;
      L.tick((dt) => {
        x += vx * dt; y += vy * dt;
        if (x < 4 || x > W() - p.offsetWidth - 4) vx *= -1;
        if (y < 4 || y > H() - p.offsetHeight - 4) vy *= -1;
        place(p, x, y);
      });
      tap(p.x, L.win);
    } },
    { say: 'close it.', setup(L) {
      const p = pop({ title: 'your pc is slow', body: '<h4>14,882 viruses found</h4>download our cleaner (also a virus).' });
      const bar = p.querySelector('.bar');
      const real = el('b', 'x', '×'); bar.insertBefore(real, bar.firstChild);
      p.x.style.background = '#ff5a5a';
      const lbl = el('span', 'stub', 'ad'); lbl.style.cssText = 'background:#101114;color:#F5F3ED;padding:2px 4px;border-radius:3px';
      bar.insertBefore(lbl, p.x);
      tap(real, L.win);
      tap(p.x, () => L.fail('that x was an ad. it said "ad". right there.'));
    } },
    { say: 'close all 3.', time: 6, setup(L) {
      let n = 3;
      ['subscribe!!', 'rate us 5 stars', 'allow notifications?'].forEach((t, i) => {
        const p = pop({ title: t, w: 250, body: pick(['you have not subscribed in 4 minutes.', 'stars are free. like your time, apparently.', 'we will notify you about notifications.']) });
        place(p, (W() - p.offsetWidth) / 2 + (i - 1) * Math.min(40, W() * 0.08), (H() - p.offsetHeight) / 2 + (i - 1) * 46);
        tap(p.x, () => { p.remove(); if (--n === 0) L.win(); });
      });
    } },
    { say: 'hold to close.', setup(L) {
      const p = pop({ title: 'security check', x: false, body: '<h4>prove you are patient</h4><div class="btn holdbtn"><i class="holdfill"></i><b>hold to close</b></div>' });
      const b = p.querySelector('.holdbtn'), fill = b.querySelector('.holdfill');
      let held = 0, down = false;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (state === 'play') { down = true; sfx.tap(); try { b.setPointerCapture(e.pointerId); } catch (er) { /* fine */ } } });
      const up = () => { if (down && held < 1.2) { held = 0; toast('hold. not tap. hold.'); } down = false; };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
      L.tick((dt) => { if (down) held += dt; else held = Math.max(0, held - dt * 3); fill.style.width = Math.min(100, held / 1.2 * 100) + '%'; if (held >= 1.2) L.win(); });
    } },
    { say: 'slide to close.', setup(L) {
      const p = pop({ title: 'unlock to close', x: false, body: '<h4>slide like it is 2007</h4><div class="track"><span>slide to close →</span><i class="knob"></i></div>' });
      const tr = p.querySelector('.track'), k = p.querySelector('.knob');
      let drag = false, sx = 0, kx = 0;
      k.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (state !== 'play') return; drag = true; sx = e.clientX - kx; sfx.tap(); try { k.setPointerCapture(e.pointerId); } catch (er) { /* fine */ } });
      k.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const max = tr.clientWidth - k.offsetWidth - 8;
        kx = Math.max(0, Math.min(max, e.clientX - sx)); k.style.left = 4 + kx + 'px';
        if (kx >= max - 2) { drag = false; L.win(); }
      });
      const up = () => { if (!drag) return; drag = false; kx = 0; k.style.left = '4px'; };
      k.addEventListener('pointerup', up); k.addEventListener('pointercancel', up);
    } },
    { say: 'close it.', setup(L) {
      const p = pop({ title: 'opposite day', x: false, body: '<h4>everything is backwards today</h4>sorry. management decision.<div class="row"></div>' });
      const row = p.querySelector('.row');
      shuffle([['close', false], ['open', true]]).forEach(([t, ok]) => { const b = el('div', 'btn' + (t === 'close' ? ' big' : ''), t); row.appendChild(b); tap(b, () => (ok ? L.win() : L.fail('told you. the buttons lie. "open" closes.'))); });
    } },
    { say: 'spell it to close it.', time: 6, setup(L) {
      const word = 'close';
      const p = pop({ title: 'captcha', x: false, body: '<h4>type "close"</h4><div class="typed">_</div><div class="tiles"></div>' });
      const typed = p.querySelector('.typed'), tiles = p.querySelector('.tiles');
      let i = 0;
      shuffle(word.split('')).forEach((ch) => {
        const t = el('div', 'tile', ch); tiles.appendChild(t);
        tap(t, () => {
          if (t.classList.contains('used')) return;
          if (ch === word[i]) { t.classList.add('used'); i++; typed.textContent = word.slice(0, i) || '_'; if (i === word.length) L.win(); }
          else { sfx.nope(); i = 0; typed.textContent = '_'; tiles.querySelectorAll('.used').forEach((u) => u.classList.remove('used')); toast('wrong letter. from the top.'); }
        });
      });
    } },
    { say: 'close it.', setup(L) {
      const p = pop({ title: 'flash sale', body: '<h4>the x is shrinking</h4>much like your attention span.' });
      let s = 40;
      L.tick((dt) => { s -= dt * 16; if (s <= 3) return L.fail('the x shrank into nothing. like your chances.'); p.x.style.width = p.x.style.height = s + 'px'; p.x.style.fontSize = s * 0.6 + 'px'; });
      tap(p.x, L.win);
    } },
    { say: 'close it.', setup(L) {
      const p = pop({ title: 'australian mode', w: 250, body: '<h4>g\'day</h4>this pop-up is upside down. and shy.' });
      p.style.transform = 'rotate(180deg)';
      runaway(p, 2, L.win);
    } },
    { say: 'close it.', setup(L) {
      const p = pop({ title: 'dark mode', cls: 'dark', w: 230, at: 'random', body: '<h4>dark mode enabled</h4>for your eyes. and our x. it also drifts.' });
      p.x.style.boxShadow = '0 0 0 1px #2a2b33';
      let vx = pick([-1, 1]) * Math.max(90, W() * 0.2), vy = pick([-1, 1]) * Math.max(80, H() * 0.18), x = p.offsetLeft, y = p.offsetTop;
      L.tick((dt) => { x += vx * dt; y += vy * dt; if (x < 4 || x > W() - p.offsetWidth - 4) vx *= -1; if (y < 4 || y > H() - p.offsetHeight - 4) vy *= -1; place(p, x, y); });
      tap(p.x, L.win);
    } },
    { say: 'close it.', setup(L) {
      const p = pop({ title: 'are you still watching?', body: '<h4>autoplay is on</h4>the x needs convincing.' });
      let n = 8; p.x.innerHTML = '<span class="stub">8</span>'; p.x.style.width = '44px'; p.x.style.height = '44px';
      tap(p.x, () => { n--; p.x.innerHTML = n ? `<span class="stub">${n}</span>` : '×'; p.x.animate([{ transform: 'scale(.8)' }, { transform: 'none' }], 90); if (!n) L.win(); });
    } },
    { say: 'close it.', setup(L) {
      const p = pop({ title: 'too many options', x: false, w: 300, body: '<div class="xgrid"></div>' });
      const g = p.querySelector('.xgrid'), real = Math.floor(rnd(0, 16));
      for (let i = 0; i < 16; i++) { const b = el('div', 'xbtn' + (i === real ? '' : ' wob'), '×'); g.appendChild(b); tap(b, i === real ? L.win : () => L.fail('that one was panicking. you wanted the calm one.')); }
    } },
    { say: 'close it.', time: 6, setup(L) {
      const p = pop({ title: 'free robux generator', w: 240, at: 'random', body: 'enter your mom\'s card number to continue.' });
      runaway(p, 5, L.win);
    } },
    { say: 'stop the emails.', time: 6, setup(L) {
      const p = pop({ title: 'email preferences', x: false, body: '<div class="check" data-k="a"><i>✓</i>keep sending me emails</div><div class="check" data-k="b"><i></i>i do not not want emails</div><div class="row"><div class="btn big">save</div></div>' });
      const st = { a: true, b: false };
      p.querySelectorAll('.check').forEach((c) => tap(c, () => { const k = c.dataset.k; st[k] = !st[k]; c.querySelector('i').textContent = st[k] ? '✓' : ''; }));
      tap(p.querySelector('.btn'), () => {
        if (st.a) L.fail('you kept "keep sending me emails" ticked. 400 emails a day now.');
        else if (st.b) L.fail('"i do not not want emails" means you want emails. grammar got you.');
        else L.win();
      });
    } },
    { say: 'close it.', time: 6, setup(L) {
      let n = 3;
      const make = (scale) => {
        const p = pop({ title: n === 3 ? 'newsletter' : pick(['lol no', 'still here', 'miss me?']), w: 240 * scale, at: n === 3 ? 'center' : 'random', body: n === 3 ? 'join 0 happy subscribers.' : 'you cannot get rid of me that easily.' });
        tap(p.x, () => { p.remove(); if (--n === 0) L.win(); else { sfx.nope(); make(scale * 1.12); } });
      };
      make(1);
    } },
    { say: 'close it.', setup(L) {
      const p = pop({ title: 'fullscreen ad', x: false, body: '<h4>this ad has no x</h4>it is the whole screen now. this is your life.' });
      p.style.width = (W() - 40) + 'px'; p.style.height = (H() - 40) + 'px'; place(p, 20, 20);
      tap(p, () => L.fail('you clicked the ad. it has no x. we told you.'));
      const x = el('div', 'xbtn', '×'); x.style.cssText = 'position:absolute;width:22px;height:22px;font-size:14px;z-index:12';
      layer.appendChild(x);
      const c = Math.floor(rnd(0, 4)); x.style[c < 2 ? 'top' : 'bottom'] = '0px'; x.style[c % 2 ? 'left' : 'right'] = '0px';
      tap(x, L.win);
    } },
    { say: 'throw it off the screen.', setup(L) {
      const p = pop({ title: 'drag me', x: false, w: 220, body: '<h4>i have no x</h4>but i do have weak boundaries.' });
      let drag = false, ox = 0, oy = 0;
      p.style.cursor = 'grab';
      p.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (state !== 'play') return; drag = true; ox = e.clientX - p.offsetLeft; oy = e.clientY - p.offsetTop; sfx.tap(); try { p.setPointerCapture(e.pointerId); } catch (er) { /* fine */ } });
      p.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const x = e.clientX - ox, y = e.clientY - oy;
        p.style.left = x + 'px'; p.style.top = y + 'px';
        const cx = x + p.offsetWidth / 2, cy = y + p.offsetHeight / 2;
        if (cx < 0 || cy < 0 || cx > W() || cy > H()) { drag = false; p.remove(); L.win(); }
      });
      const up = () => { drag = false; };
      p.addEventListener('pointerup', up); p.addEventListener('pointercancel', up);
    } },
    { say: 'close it.', setup(L) {
      const p = pop({ title: 'please wait', body: '<h4>loading close button…</h4>the x only works when it is lime.' });
      let t = 0, on = false;
      p.x.style.width = '44px'; p.x.style.height = '44px';
      L.tick((dt) => { t += dt; on = (t % 1.3) > 0.75; p.x.style.background = on ? '#C5FF49' : '#101114'; p.x.style.color = on ? '#101114' : '#5b5966'; p.x.textContent = on ? '×' : '…'; });
      tap(p.x, () => (on ? L.win() : L.fail('it said please wait. you did not wait.')));
    } },
    { say: 'close everything.', time: 6, setup(L) {
      let n = 2;
      const p = pop({ title: 'cool blog', dy: -50, body: '<h4>read 1 article</h4>after 9 pop-ups.' });
      tap(p.x, () => { p.remove(); if (--n === 0) L.win(); });
      cookieBanner({}, () => { if (--n === 0) L.win(); }, () => L.fail('you accepted the cookies. in front of everyone.'));
    } },
    { say: 'close it.', time: 6, setup(L) {
      const p = pop({ title: 'unsaved changes', w: 220, at: 'random', body: 'are you sure you want to leave? (it will ask again)' });
      let vx = pick([-1, 1]) * Math.max(120, W() * 0.3), vy = pick([-1, 1]) * Math.max(110, H() * 0.25), x = p.offsetLeft, y = p.offsetTop, moving = true;
      L.tick((dt) => {
        if (!moving) return;
        x += vx * dt; y += vy * dt;
        if (x < 4 || x > W() - p.offsetWidth - 4) vx *= -1;
        if (y < 4 || y > H() - p.offsetHeight - 4) vy *= -1;
        place(p, x, y);
      });
      tap(p.x, () => { moving = false; p.remove(); const flip = Math.random() < 0.5; sureChain([['leave without saving?', flip ? 'stay' : 'leave', flip ? 'leave' : 'stay', !flip]], L.win, () => L.fail('you stayed. the pop-up wins.')); });
    } },
    { say: 'the final pop-up.', time: 8, setup(L) {
      // phase 1: x runs away. phase 2: are you sure. phase 3: the prize (do not touch it)
      const p = pop({ title: 'the final boss', w: 260, at: 'random', body: '<h4>you made it this far?</h4>the 1% is watching.' });
      runaway(p, 3, () => { p.remove(); sureChain([['are you sure?', 'yes', 'no', true], ['are you REALLY sure?', 'no', 'yes', false]], () => {
        L.timeoutWins = true;
        const w = pop({ title: 'YOU WON!!!', x: false, w: 280, body: '<h4>claim your prize</h4>tap below. it is definitely a prize.<div class="row"><div class="btn big">claim prize</div></div>' });
        tap(w.querySelector('.btn'), () => L.fail('there was no prize. there is never a prize.'));
        L.stageTap(() => L.fail('you touched the prize screen. greed.'));
      }, () => L.fail('so close. you said no. it heard you.')); });
    } },
  ];

  // ---------- run state ----------
  let order = LEVELS.map((_, i) => i);
  function shuffleOrder() {
    const seg = (a, b) => shuffle(order.slice(a, b));
    order = LEVELS.map((_, i) => i);
    order = [0, ...seg(1, 10), ...seg(10, 20), ...seg(20, 29), 29];   // same difficulty tiers, new order every run
  }
  const DEF = (l) => LEVELS[order[l]];
  let state = 'title'; // title | play | between | over | paused
  let level = 0, tLeft = 0, tMax = 5, L = null, runStart = 0, pausedFrom = null, lastTick = 0;
  const ticks = [];
  let stageHandler = null;
  stage.addEventListener('pointerdown', (e) => { if (state === 'play' && stageHandler) stageHandler(e); });

  function setCrash(s) { $('crash').className = s || ''; }
  function hud() {
    $('lvl').innerHTML = `lvl ${level + 1}<small>/30</small>`;
    $('pct').textContent = level === 0 ? 'everyone sees level 1' : `only ~${fmtPct(level + 1)} reach this (est.)`;
    $('say').textContent = DEF(level).say;
  }
  function clearLevel() { layer.innerHTML = ''; ticks.length = 0; stageHandler = null; }

  function startRun() {
    if (state === 'over' && performance.now() - overAt < 800) return;
    closeOverlay();
    level = 0; runStart = performance.now(); shuffleOrder();
    sdk((c) => c.start && c.start());
    startLevel();
  }
  function startLevel() {
    clearLevel(); setCrash('');
    const def = DEF(level);
    tMax = tLeft = (def.time || 5) * (level >= 20 && level < 29 ? 0.85 : 1);
    $('timer').className = def.timeoutWins ? 'wait' : '';
    L = {
      timeoutWins: !!def.timeoutWins,
      win, fail,
      tick: (fn) => ticks.push(fn),
      stageTap: (fn) => { stageHandler = fn; },
    };
    hud();
    state = 'play';
    lastTickSec = Math.ceil(tLeft);
    def.setup(L);
    sdk((c) => c.event && c.event('level_reached', { level: level + 1 }));
    sdkScore(level);
  }
  let lastTickSec = 5;

  function win() {
    if (state !== 'play') return;
    state = 'between';
    clearLevel();
    level++;
    best = Math.max(best, level); store.set(BEST_KEY, String(best));
    sdkScore(level);
    if (level >= LEVELS.length) { sfx.big(); return gameOver(true); }
    sfx.win(); poof();
    const f = $('flash'); f.textContent = pick(['closed.', 'gone.', 'bye.', 'nice.', 'clean.', 'next.']);
    f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
    setTimeout(() => { if (state === 'between') startLevel(); }, 300);
  }
  function fail(why) {
    if (state !== 'play') return;
    state = 'between';
    sfx.fail(); setCrash('hit');
    stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake');
    if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) try { navigator.vibrate(120); } catch (e) { /* not supported */ }
    setTimeout(() => gameOver(false, why), 520);
  }

  // ---------- overlays ----------
  let ov = null;
  function overlay(html) { closeOverlay(); ov = el('div', 'ov', `<div class="card">${html}</div>`); stage.appendChild(ov); return ov; }
  function closeOverlay() { if (ov) { ov.remove(); ov = null; } }

  function titleScreen() {
    state = 'title'; clearLevel(); setCrash('');
    level = 0; hud();
    $('say').textContent = 'start when ready.';
    $('pct').textContent = '';
    $('timer').firstChild.style.transform = 'scaleX(1)';
    const o = overlay(`<div class="bigc idle"></div><h1>only <em>1%</em> can close this pop-up</h1>
      <p>30 fake pop-ups. about 5 seconds each. one mistake and you start over.</p>
      ${best ? `<p class="why">your best: level ${Math.min(best + 1, 30)}${best >= 30 ? ' (you won. go outside.)' : ''}</p>` : ''}
      <button class="cta" id="go">start</button>
      <button class="opt" id="spk">halloween mode: ${spooky ? 'on' : 'off'}</button>
      <div class="cc">computer cooked <b>games</b></div>`);
    o.querySelector('#go').addEventListener('click', () => { audio(); startRun(); });
    o.querySelector('#spk').addEventListener('click', (e) => { spooky = !spooky; store.set(SPOOK_KEY, spooky ? '1' : '0'); applySpooky(); e.target.textContent = 'halloween mode: ' + (spooky ? 'on' : 'off'); });
  }

  // restarts are ignored for 0.8 s after the end card shows, so a held/mashed key doesn't skip it
  let overAt = 0;
  function gameOver(won, why) {
    state = 'over'; overAt = performance.now(); clearLevel();
    const reached = won ? 30 : level + 1;
    setCrash(won ? '' : 'cooked');
    const dur = Math.round(performance.now() - runStart);
    sdk((c) => c.end && c.end({ score: level, durationMs: dur }));
    const pct = fmtPct(reached);
    const o = overlay(won
      ? `<div class="bigc idle"></div><h1>you closed <em>all 30</em>.</h1><p>you are the 1%. this means nothing. congratulations.</p>
         <p class="why">${(dur / 1000).toFixed(1)}s total</p>
         <div class="two"><button class="cta" id="again">again</button><button class="cta ghost" id="share">share</button></div><img id="cardImg" alt="your result card"><div class="cc">computer cooked <b>games</b></div>`
      : `<div class="bigc"></div><h1>cooked on <em>level ${reached}</em></h1><p>only ${pct} of players get this far.${reached === 1 ? ' (that is everyone.)' : ''}</p>
         <p class="why">${why || 'too slow. the pop-up outlasted you.'}</p>
         <p>lasted ${(dur / 1000).toFixed(1)}s. new pop-up order every run.</p>
         <p>best: level ${Math.min(best + 1, 30)}</p>
         <div class="two"><button class="cta" id="again">again</button><button class="cta ghost" id="share">share</button></div><img id="cardImg" alt="your result card"><div class="cc">computer cooked <b>games</b></div>`);
    o.querySelector('#again').addEventListener('click', () => { audio(); startRun(); });
    o.querySelector('#share').addEventListener('click', () => share(reached, won));
    try { o.querySelector('#cardImg').src = drawCard(reached, won).toDataURL('image/png'); } catch (e) { o.querySelector('#cardImg').remove(); }
  }

  // ---------- share card ----------
  const crashImg = new Image(); crashImg.src = 'crash.png';
  function drawCard(reached, won) {
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1080;
    const g = c.getContext('2d');
    const acc = spooky ? '#ff8a3d' : '#C5FF49';
    g.fillStyle = '#101114'; g.fillRect(0, 0, 1080, 1080);
    g.strokeStyle = '#ffffff0d'; g.lineWidth = 2;
    for (let i = 0; i < 1080; i += 54) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 1080); g.moveTo(0, i); g.lineTo(1080, i); g.stroke(); }
    // the pop-up
    g.fillStyle = '#F5F3ED'; rr(g, 90, 150, 900, 640, 28); g.fill();
    g.fillStyle = acc; rr(g, 90, 150, 900, 96, [28, 28, 0, 0]); g.fill();
    g.fillStyle = '#101114'; g.font = '800 40px Consolas, Menlo, monospace'; g.textBaseline = 'middle';
    g.fillText(spooky ? '🎃 only 1% can close this pop-up' : 'only 1% can close this pop-up', 130, 198, 740);
    rr(g, 900, 172, 60, 52, 10); g.fill(); g.fillStyle = '#F5F3ED'; g.fillText('×', 916, 199);
    g.fillStyle = '#101114'; g.textBaseline = 'alphabetic';
    g.font = '800 64px Consolas, Menlo, monospace';
    g.fillText(won ? 'i closed all 30.' : 'i got cooked on', 140, 370, 800);
    g.font = '800 170px Consolas, Menlo, monospace'; g.fillStyle = '#101114';
    g.fillText(won ? 'top 1%' : 'level ' + reached, 132, 540, 820);
    g.font = '700 40px Consolas, Menlo, monospace'; g.fillStyle = '#6b5bb5';
    g.fillText(won ? 'only 1% of players finish.' : `only ${fmtPct(reached)} of players get this far.`, 140, 640, 610);
    g.fillStyle = '#8a8794'; g.font = '700 34px Consolas, Menlo, monospace';
    g.fillText('can you close it?', 140, 720);
    try { g.imageSmoothingEnabled = false; g.drawImage(crashImg, won ? 0 : 256, 0, 128, 128, 790, 600, 170, 170); } catch (e) { /* image not loaded yet */ }
    g.fillStyle = acc; g.font = '800 40px Consolas, Menlo, monospace';
    g.fillText(URL_TXT, 90, 900, 900);
    g.fillStyle = '#B59AFF'; g.font = '800 34px Consolas, Menlo, monospace';
    g.fillText('computer cooked games', 90, 970);
    return c;
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
  function share(reached, won) {
    sdk((c) => c.event && c.event('share_clicked', { level: reached }));
    const text = won
      ? `i closed all 30 pop-ups. only 1% can. ${URL_TXT}`
      : `i got cooked on level ${reached}/30 of "only 1% can close this pop-up". only ${fmtPct(reached)} get that far. ${URL_TXT}`;
    const copy = () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast('copied. go humble someone.'), () => toast(text));
        else toast(text);
      } catch (e) { toast(text); }
    };
    if (!navigator.share) return copy();
    drawCard(reached, won).toBlob((blob) => {
      let data = { text };
      try {
        const file = blob && new File([blob], SLUG + '.png', { type: 'image/png' });
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) data = { text, files: [file] };
      } catch (e) { /* text only */ }
      navigator.share(data).catch((err) => { if (!err || err.name !== 'AbortError') copy(); });
    }, 'image/png');
  }

  // ---------- pause ----------
  function pause() {
    if (state !== 'play' && state !== 'between') return;
    pausedFrom = state; state = 'paused';
    const o = overlay('<h1>paused.</h1><p>the pop-up is also waiting. politely.</p><button class="cta" id="res">resume</button>');
    o.querySelector('#res').addEventListener('click', resume);
  }
  function resume() {
    if (state !== 'paused') return;
    closeOverlay(); state = pausedFrom === 'between' ? 'play' : pausedFrom; pausedFrom = null;
    if (!layer.children.length && state === 'play') startLevel();
  }
  // rotating a phone or resizing mid-level must never strand a pop-up off-screen
  window.addEventListener('resize', () => { layer.querySelectorAll('.pop').forEach((p) => { if (p.offsetWidth > W() - 8) p.style.width = (W() - 24) + 'px'; place(p, p.offsetLeft, p.offsetTop); }); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  // ---------- player page messages ----------
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'cc-mute') { extMuted = !!d.muted; if (actx && master) master.gain.value = muted || extMuted ? 0 : 0.35; setMuteLabel(); }
    else if (d.type === 'cc-restart') startRun();
    else if (d.type === 'cc-pause') { if (d.paused === false) resume(); else if (state === 'paused' && d.paused !== true) resume(); else pause(); }
  });

  // ---------- keyboard: enter/space for menus ----------
  window.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') { $('muteBtn').click(); return; }
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (state === 'over') { e.preventDefault(); audio(); startRun(); return; }   // enter always retries, even with share focused
    if (e.target && e.target.tagName === 'BUTTON') return; // the focused button's own click handles it
    if (state === 'title') { e.preventDefault(); audio(); startRun(); }
    else if (state === 'paused') { e.preventDefault(); resume(); }
  });

  // ---------- loop ----------
  function frame(t) {
    const dt = Math.min(0.05, (t - (lastTick || t)) / 1000); lastTick = t;
    if (state === 'play') {
      for (const fn of ticks.slice()) { fn(dt); if (state !== 'play') break; }
      if (state === 'play') {
        tLeft -= dt;
        const s = Math.ceil(tLeft);
        if (s < lastTickSec && s <= 2 && s >= 0 && !L.timeoutWins) sfx.tick();
        lastTickSec = s;
        if (tLeft <= 0) { tLeft = 0; if (L.timeoutWins) win(); else fail(pick(['too slow. the pop-up outlasted you.', 'time\'s up. the pop-up has tenure now.', 'you hesitated. pop-ups can smell fear.'])); }
      }
      $('timer').firstChild.style.transform = `scaleX(${Math.max(0, tLeft / tMax)})`;
      $('timer').classList.toggle('late', !L.timeoutWins && tLeft < 1.2);
      $('timer').classList.toggle('wait', !!L.timeoutWins);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  setMuteLabel();
  titleScreen();

  // tiny test surface for qa (harmless)
  window.__popup = { get level() { return level; }, get state() { return state; }, jump: (n) => { closeOverlay(); level = n; startLevel(); }, LEVELS };
})();
