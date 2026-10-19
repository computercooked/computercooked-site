/* overdue notice — view, input, audio, saving. rules live in core.js. */
(() => {
  'use strict';
  const ON = window.ON;
  const fmt = ON.fmt;
  const SLUG = 'overdue-notice', URL_TEXT = 'computercooked.com/games/' + SLUG;
  const SAVE_KEY = 'cc-overdue-notice-v1';
  const $ = (id) => document.getElementById(id);
  const el = { cash: $('cash'), day: $('day'), time: $('time'), dayBar: $('dayBar').firstElementChild, lane: $('lane'), collector: $('collector'), laneText: $('laneText'),
    field: $('field'), status: $('status'), hint: $('hint'), list: $('list'), tabs: $('tabs'), badge: $('billBadge'), modal: $('modal'), box: $('modalBox'), toast: $('toast'), spooky: $('spooky') };

  // ---------- sdk ----------
  let ccEvents = 0;
  const cc = (fn, ...a) => { try { if (window.cc && typeof window.cc[fn] === 'function') return window.cc[fn](...a); } catch (e) { /* ignore */ } };
  const ccEvent = (name, data) => { if (ccEvents < 18) { ccEvents++; cc('event', name, data || {}); } };

  // ---------- save / load ----------
  let meta, S;
  function save() {
    if (!S) return;
    meta.lastSeen = Date.now();
    try {
      const run = Object.assign({}, S); delete run.meta; run.ev = []; run.pops = []; run.pig = null; run.gig = null;
      localStorage.setItem(SAVE_KEY, JSON.stringify({ meta, run }));
    } catch (e) { /* storage full or blocked: play on without saving */ }
  }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (d && d.meta && d.run) { meta = Object.assign(ON.newMeta(), d.meta); S = d.run; S.meta = meta; S.ev = []; return true; }
      if (d && d.meta) { meta = Object.assign(ON.newMeta(), d.meta); }
    } catch (e) { /* ignore */ }
    return false;
  }
  function isOctober() { return new Date().getMonth() === 9; }
  function spookyOn() { return meta.spooky === null || meta.spooky === undefined ? isOctober() : meta.spooky; }

  // ---------- audio ----------
  let ac = null, master = null, muted = false, noiseBuf = null;
  function initAudio() {
    if (ac) { if (ac.state === 'suspended' && !paused) ac.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ac = new AC(); master = ac.createGain(); master.gain.value = muted ? 0 : 0.45; master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; }
  }
  function tone(f, dur, type, vol, f2, delay) {
    if (!ac || muted) return;
    const t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function hiss(dur, vol, freq, type) {
    if (!ac || muted) return;
    const t = ac.currentTime, s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = type || 'highpass'; f.frequency.value = freq;
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  let lastCoin = 0;
  const sfx = {
    pop() { tone(700 + Math.random() * 200, 0.05, 'square', 0.06, 1200); },
    thud() { tone(160, 0.06, 'square', 0.07, 90); },
    coin() { const n = performance.now(); if (n - lastCoin < 60) return; lastCoin = n; tone(1320, 0.05, 'square', 0.05); tone(1760, 0.08, 'square', 0.05, null, 0.05); },
    smash() { hiss(0.25, 0.25, 1500, 'bandpass'); [880, 1100, 1320, 1760].forEach((f, i) => tone(f, 0.08, 'square', 0.05, null, 0.05 + i * 0.05)); },
    pay() { tone(523, 0.07, 'triangle', 0.08); tone(784, 0.12, 'triangle', 0.08, null, 0.07); hiss(0.08, 0.06, 4000); },
    late() { tone(196, 0.18, 'sawtooth', 0.07); tone(147, 0.25, 'sawtooth', 0.07, null, 0.16); },
    knock() { [0, 0.16, 0.32].forEach((d) => tone(110, 0.07, 'square', 0.12, 60, d)); },
    buy() { tone(440, 0.06, 'square', 0.05); tone(660, 0.08, 'square', 0.05, null, 0.05); },
    day() { [392, 494, 587, 784].forEach((f, i) => tone(f, 0.14, 'triangle', 0.07, null, i * 0.09)); },
    bad() { [330, 262, 196, 131].forEach((f, i) => tone(f, 0.3, 'square', 0.07, null, i * 0.22)); },
    gig() { tone(988, 0.06, 'square', 0.05); tone(988, 0.06, 'square', 0.05, null, 0.12); }
  };

  // ---------- helpers ----------
  let paused = false, modalOpen = false;
  function toast(text, bad) {
    el.toast.textContent = text; el.toast.className = bad ? 'bad' : ''; el.toast.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { el.toast.hidden = true; }, 2300);
  }
  function floatText(x, y, text, color) {
    if (el.field.childElementCount > 60) return;
    const f = document.createElement('div'); f.className = 'float'; f.textContent = text;
    f.style.left = (x - 20) + 'px'; f.style.top = (y - 10) + 'px'; f.style.color = color || 'var(--lime)';
    el.field.appendChild(f); setTimeout(() => f.remove(), 900);
  }
  function coins(x, y, n) {
    if (el.field.childElementCount > 60) return;
    for (let i = 0; i < n; i++) {
      const c = document.createElement('div'); c.className = 'coin';
      c.style.left = x + 'px'; c.style.top = y + 'px';
      const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 50;
      c.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d - 30}px)`, opacity: 0 }], { duration: 600 + Math.random() * 300, easing: 'cubic-bezier(.2,.8,.4,1)' });
      el.field.appendChild(c); setTimeout(() => c.remove(), 900);
    }
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function secs(s) { s = Math.max(0, Math.ceil(s)); return s < 60 ? s + 's' : Math.floor(s / 60) + 'm ' + (s % 60) + 's'; }
  function clockText() {
    const k = Math.min(1, (S.t - S.dayStart) / S.dayLen), mins = 8 * 60 + Math.floor(k * 14 * 60);
    const h = Math.floor(mins / 60), m = mins % 60, h12 = ((h + 11) % 12) + 1;
    return h12 + ':' + String(m).padStart(2, '0') + (h < 12 ? 'am' : 'pm');
  }

  // ---------- field ----------
  const nodes = new Map(); // entity id -> element
  function placeRandom(node) {
    const fw = el.field.clientWidth, fh = el.field.clientHeight;
    const w = node.offsetWidth || 140, h = node.offsetHeight || 70;
    node.style.left = Math.round(4 + Math.random() * Math.max(0, fw - w - 8)) + 'px';
    node.style.top = Math.round(24 + Math.random() * Math.max(0, fh - h - 50)) + 'px';
  }
  function addPop(p) {
    const n = document.createElement('div');
    n.className = 'pop' + (p.kind !== 'norm' ? ' ' + p.kind : '');
    n.dataset.id = p.id;
    const ghost = S.spooky ? '👻 ' : '';
    n.innerHTML = `<div class="tb"><span>${ghost}${esc(p.title)}</span><b>×</b></div><div class="bd">${esc(p.body)}${p.kind === 'tough' ? '<em>×3 clicks</em>' : ''}</div>`;
    el.field.appendChild(n); placeRandom(n); nodes.set(p.id, n);
  }
  function addPig(g) {
    const n = document.createElement('div'); n.className = 'pig'; n.dataset.pig = '1';
    n.innerHTML = (S.spooky ? '🎃' : '🐷') + '<div class="hp"><i style="width:100%"></i></div>';
    el.field.appendChild(n); placeRandom(n); nodes.set(g.id, n);
  }
  function removeNode(id, die) {
    const n = nodes.get(id); if (!n) return;
    nodes.delete(id);
    if (die) { n.classList.add('die'); setTimeout(() => n.remove(), 170); } else n.remove();
  }
  function centerOf(n) { return { x: n.offsetLeft + n.offsetWidth / 2, y: n.offsetTop + n.offsetHeight / 2 }; }
  let gigNode = null;
  function showGig(g) {
    if (gigNode) gigNode.remove();
    gigNode = document.createElement('div'); gigNode.className = 'gig';
    gigNode.innerHTML = `<div class="t">📱 gig offer</div><div>${esc(g.name)}</div><div style="color:var(--dim);margin-top:2px">pays ~${fmt(g.reward)} · ${Math.round(g.dur)}s</div><div class="row"><button class="yes" data-gig="yes">take it</button><button class="no" data-gig="no">nah</button></div><div class="bar"><i></i></div>`;
    el.field.appendChild(gigNode);
  }
  function clearField() {
    for (const n of nodes.values()) n.remove(); nodes.clear();
    if (gigNode) { gigNode.remove(); gigNode = null; }
  }

  el.field.addEventListener('pointerdown', (e) => {
    initAudio();
    if (modalOpen || paused || !S || S.over) return;
    const gb = e.target.closest('[data-gig]');
    if (gb) { if (gb.dataset.gig === 'yes') { ON.acceptGig(S); sfx.gig(); } else ON.declineGig(S); return; }
    const pig = e.target.closest('.pig');
    if (pig) { e.preventDefault(); ON.hitPig(S); return; }
    const pop = e.target.closest('.pop');
    if (pop) { e.preventDefault(); ON.hitPop(S, +pop.dataset.id); return; }
  });

  // ---------- events from the core ----------
  function handleEvents() {
    const evs = S.ev; if (!evs.length) return;
    S.ev = [];
    for (const e of evs) {
      switch (e.type) {
        case 'pop': addPop(e.p); break;
        case 'popHit': { const n = nodes.get(e.p.id); if (n) { n.classList.remove('hit'); void n.offsetWidth; n.classList.add('hit'); } sfx.thud(); break; }
        case 'popDie': {
          const n = nodes.get(e.p.id);
          if (n) { const c = centerOf(n); floatText(c.x, c.y, '+' + fmt(e.amt), e.p.kind === 'gold' ? 'var(--gold)' : null); if (e.p.kind === 'gold') coins(c.x, c.y, 14); }
          removeNode(e.p.id, true); e.auto ? null : sfx.pop(); sfx.coin(); bumpCash();
          if (e.p.kind === 'gold') toast('the 1,000,000th visitor thing was real?? +' + fmt(e.amt));
          hideHint(); break;
        }
        case 'pig': addPig(e.pig); break;
        case 'pigHit': {
          const n = nodes.get(e.pig.id);
          if (n) { n.classList.remove('hit'); void n.offsetWidth; n.classList.add('hit'); n.querySelector('i').style.width = (100 * e.pig.hp / e.pig.max) + '%'; }
          sfx.thud(); break;
        }
        case 'pigDie': { const n = nodes.get(e.pig.id); if (n) { const c = centerOf(n); floatText(c.x, c.y, '+' + fmt(e.amt), 'var(--gold)'); coins(c.x, c.y, 16); } removeNode(e.pig.id, true); sfx.smash(); bumpCash(); break; }
        case 'pigGone': { const n = nodes.get(e.pig.id); if (n) { const c = centerOf(n); floatText(c.x, c.y, 'piggy left', 'var(--dim)'); } removeNode(e.pig.id, true); break; }
        case 'gig': showGig(e.g); sfx.gig(); break;
        case 'gigStart': if (gigNode) { gigNode.querySelector('.row').innerHTML = '<span style="color:var(--dim)">working on it...</span>'; } break;
        case 'gigEnd':
          if (gigNode) { gigNode.remove(); gigNode = null; }
          if (e.exposure) toast('gig paid in exposure. +' + fmt(e.exposure).slice(1) + ' exposure points.', true);
          else if (e.amt) { toast('gig done. +' + fmt(e.amt)); sfx.coin(); bumpCash(); }
          break;
        case 'bill': if (S.t > 1 && !e.b.type.startsWith('surprise') && e.b.type !== 'surprise') { /* daily bills arrive quietly */ } break;
        case 'surprise': toast('surprise bill: ' + e.name, true); sfx.late(); break;
        case 'windfall': toast(e.name + '! +' + fmt(e.amt)); sfx.coin(); break;
        case 'late': toast(e.b.name + ' is late. +15% late fee.', true); sfx.late(); break;
        case 'paid': sfx.pay(); break;
        case 'warn': toast(e.lvl === 1 ? 'the debt collector found your street.' : 'he\'s knocking. pay something.', true); sfx.knock(); break;
        case 'cryptoEvent': if (e.moon) { toast('$CRASHCOIN to the moon 🚀 (briefly)'); ccEvent('crypto_moon'); } else toast('$CRASHCOIN rug pulled. devs are "on vacation".', true); break;
        case 'canceled': toast('canceled ' + e.def.name + '. cancellation fee: ' + fmt(e.fee)); break;
        case 'bought': sfx.buy(); break;
        case 'dayEnd': showDayEnd(e); break;
        case 'repo': showRepo(e); break;
        case 'dayStart': sfx.day(); if (e.day <= 15) ccEvent('day', { day: e.day }); cc('score', e.day); break;
        case 'over': showOver(); break;
      }
    }
  }
  let bumpT = 0;
  function bumpCash() { const n = performance.now(); if (n - bumpT < 90) return; bumpT = n; el.cash.classList.add('bump'); setTimeout(() => el.cash.classList.remove('bump'), 80); }
  let hintHidden = false;
  function hideHint() { if (!hintHidden && S.popsClosed > 3) { hintHidden = true; el.hint.style.opacity = 0; } }

  // ---------- top bar ----------
  let lastStatus = '';
  function renderTop() {
    el.cash.textContent = fmt(S.cash);
    el.cash.classList.toggle('neg', S.cash < 0);
    el.day.textContent = 'day ' + S.day;
    el.time.textContent = clockText() + (S.crypto.coins > 0 ? '' : '');
    el.dayBar.style.width = (100 * Math.min(1, (S.t - S.dayStart) / S.dayLen)) + '%';
    const c = Math.min(100, S.collector), w = el.lane.clientWidth;
    el.collector.style.left = Math.max(2, (c / 100) * (w - 52)) + 'px';
    const sp = ON.collectorSpeed(S);
    const strikes = S.strikes ? ' · strikes ' + S.strikes + '/3' : '';
    el.laneText.textContent = (c <= 0.5 ? 'debt collector: nowhere near you' : `debt collector: ${Math.max(1, Math.round((100 - c) * 3))}ft away · ${sp > 0 ? 'getting closer' : 'leaving (for now)'}`) + strikes;
    el.lane.classList.toggle('warn', c >= 50); el.lane.classList.toggle('danger', c >= 80);
    const st = [];
    if (!ON.utilOk(S, 'wifi')) st.push('no wi-fi: fewer ads, online hustles down');
    if (!ON.utilOk(S, 'phone')) st.push('phone cut off: no gigs, phone hustles down');
    if (!ON.utilOk(S, 'power')) st.push('power out: hustles at 50%');
    const key = st.join('|');
    if (key !== lastStatus) { lastStatus = key; el.status.innerHTML = st.map((s) => '<span>' + s + '</span>').join(''); el.field.classList.toggle('dark', !ON.utilOk(S, 'power')); }
    const late = S.bills.filter((b) => b.late).length;
    el.badge.textContent = late ? String(late) : (S.bills.length ? '' : '');
    if (gigNode && S.gig) {
      const g = S.gig, bar = gigNode.querySelector('.bar i');
      if (bar) bar.style.width = (g.active ? 100 * (S.t - g.start) / g.dur : 100 * Math.max(0, g.expires - S.t) / 9) + '%';
    }
  }

  // ---------- panel (keyed list so taps never land on a rebuilt button) ----------
  let tab = 'bills';
  const cache = new Map();
  function setTab(t) {
    tab = t;
    for (const b of el.tabs.children) b.classList.toggle('on', b.dataset.tab === t);
    cache.clear(); el.list.innerHTML = ''; el.list.scrollTop = 0;
    renderPanel();
  }
  el.tabs.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setTab(b.dataset.tab); });

  function mk(it) {
    const n = document.createElement('div');
    if (it.sect !== undefined) { n.className = 'sect'; n._r = {}; return n; }
    if (it.big !== undefined) { n.className = 'big'; n._r = {}; return n; }
    if (it.empty !== undefined) { n.className = 'empty'; n._r = {}; return n; }
    if (it.spark) { n.className = 'big'; n.innerHTML = '<div class="sp"></div><canvas class="spark" width="300" height="40"></canvas><div class="acts" style="display:flex;gap:6px;margin-top:8px"></div>'; n._r = { sp: n.querySelector('.sp'), cv: n.querySelector('canvas'), acts: n.querySelector('.acts') }; return n; }
    n.className = 'card';
    n.innerHTML = '<div class="ic"></div><div class="mid"><div class="nm"></div><div class="sub"></div><div class="bar"><i></i></div></div><button class="btn"></button>';
    n._r = { ic: n.querySelector('.ic'), nm: n.querySelector('.nm'), sub: n.querySelector('.sub'), bar: n.querySelector('.bar'), bari: n.querySelector('.bar i'), btn: n.querySelector('.btn'), btn2: null };
    return n;
  }
  function setT(node, key, v) { if (node._c === undefined) node._c = {}; if (node._c[key] !== v) { node._c[key] = v; return true; } return false; }
  function upd(n, it) {
    const r = n._r;
    if (it.sect !== undefined) { if (setT(n, 't', it.sect)) n.textContent = it.sect; return; }
    if (it.big !== undefined) { if (setT(n, 'h', it.big)) n.innerHTML = it.big; return; }
    if (it.empty !== undefined) { if (setT(n, 'h', it.empty)) n.innerHTML = it.empty; return; }
    if (it.spark) { drawSpark(n, it); return; }
    if (setT(n, 'cls', it.cls || '')) n.className = 'card ' + (it.cls || '');
    if (setT(n, 'ic', it.icon)) r.ic.textContent = it.icon;
    if (setT(n, 'nm', it.name)) r.nm.textContent = it.name;
    if (setT(n, 'sub', it.sub || '')) r.sub.textContent = it.sub || '';
    r.bar.style.display = it.bar === undefined ? 'none' : '';
    if (it.bar !== undefined) r.bari.style.width = Math.round(100 * Math.max(0, Math.min(1, it.bar))) + '%';
    const b = it.btn;
    r.btn.style.display = b ? '' : 'none';
    if (b) {
      if (setT(n, 'bl', b.label)) r.btn.textContent = b.label;
      r.btn.disabled = !!b.dis; r.btn.dataset.act = b.act;
      if (setT(n, 'bc', b.cls || '')) r.btn.className = 'btn ' + (b.cls || '');
    }
    if (it.btn2) {
      if (!r.btn2) { r.btn2 = document.createElement('button'); r.btn2.className = 'btn ghost'; n.insertBefore(r.btn2, r.btn); }
      if (setT(n, 'b2', it.btn2.label)) r.btn2.textContent = it.btn2.label;
      r.btn2.dataset.act = it.btn2.act; r.btn2.disabled = !!it.btn2.dis; r.btn2.style.display = '';
    } else if (r.btn2) r.btn2.style.display = 'none';
  }
  function renderItems(items) {
    const seen = new Set(); let prev = null;
    for (const it of items) {
      let n = cache.get(it.key);
      if (!n) { n = mk(it); cache.set(it.key, n); }
      upd(n, it); seen.add(it.key);
      const want = prev ? prev.nextSibling : el.list.firstChild;
      if (want !== n) el.list.insertBefore(n, want);
      prev = n;
    }
    for (const [k, n] of cache) if (!seen.has(k)) { n.remove(); cache.delete(k); }
  }
  function drawSpark(n, it) {
    const r = n._r, c = S.crypto;
    const val = c.coins * c.price, pl = val - c.spent;
    const txt = `<b>$CRASHCOIN</b> ${c.price < 1 ? c.price.toFixed(4) : c.price.toFixed(2)} · you hold ${fmt(val)}${c.coins > 0 ? ' (' + (pl >= 0 ? '+' : '') + fmt(pl) + ')' : ''}<br><span style="color:var(--dim);font-size:11px">a totally real investment. not financial advice. not even advice.</span>`;
    if (setT(n, 'sp', txt)) r.sp.innerHTML = txt;
    const g = r.cv.getContext('2d'), h = c.hist, W = 300, H = 40;
    g.clearRect(0, 0, W, H);
    let lo = Infinity, hi = -Infinity; for (const v of h) { const l = Math.log(v); lo = Math.min(lo, l); hi = Math.max(hi, l); }
    if (hi - lo < 0.05) { hi += 0.05; lo -= 0.05; }
    g.strokeStyle = h[h.length - 1] >= h[0] ? '#C5FF49' : '#FF5C7A'; g.lineWidth = 2; g.beginPath();
    h.forEach((v, i) => { const x = (i / 59) * W, y = H - 3 - ((Math.log(v) - lo) / (hi - lo)) * (H - 6); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.stroke();
    if (!r.acts.childElementCount) {
      r.acts.innerHTML = '<button class="btn" data-act="cbuy:0.1">buy 10%</button><button class="btn alt" data-act="cbuy:0.5">yolo 50%</button><button class="btn ghost" data-act="csell">sell all</button>';
    }
    r.acts.lastChild.disabled = c.coins <= 0;
  }

  function billsItems() {
    const items = [];
    const owed = S.bills.reduce((a, b) => a + b.amount, 0);
    const late = S.bills.filter((b) => b.late).length;
    if (S.bills.length) {
      items.push({ key: 'sum', name: late ? late + ' late · ' + fmt(owed) + ' owed' : fmt(owed) + ' owed today', icon: late ? '🚨' : '🧾', sub: late ? 'late bills bring the debt collector closer' : 'pay before the timer runs out', cls: late ? 'late' : '', btn: { label: 'pay all', act: 'payall', dis: S.cash < Math.min(...S.bills.map((b) => b.amount)) } });
    }
    const order = S.bills.slice().sort((a, b) => (b.late - a.late) || a.due - b.due);
    for (const b of order) {
      const def = ON.BILL[b.type];
      const left = b.due - S.t;
      let sub;
      if (b.late) {
        sub = 'LATE · fees +' + fmt(b.amount - b.orig);
        if (def && def.util === 'wifi') sub += ' · wi-fi off';
        if (def && def.util === 'phone') sub += ' · phone off';
        if (def && def.util === 'power') sub += ' · lights off';
      } else sub = 'due in ' + secs(left);
      if (!b.late && def && def.util) sub += def.util === 'wifi' ? ' · late = no wi-fi' : def.util === 'phone' ? ' · late = no phone' : ' · late = lights out';
      items.push({
        key: 'b' + b.uid, icon: b.icon, name: b.name, sub,
        bar: b.late ? 1 : 1 - Math.max(0, left) / Math.max(1, b.due - b.shown),
        cls: b.late ? 'late' : left < 10 ? 'soon' : '',
        btn: { label: 'pay ' + fmt(b.amount), act: 'pay:' + b.uid, dis: S.cash < b.amount },
        btn2: def && def.sub ? { label: 'cancel', act: 'cancel:' + b.type } : null
      });
    }
    if (!S.bills.length) items.push({ key: 'none', empty: 'nothing due right now.<br>suspicious. very suspicious.' });
    const next = ON.BILLS.filter((d) => d.unlock === S.day + 1);
    if (next.length) items.push({ key: 'nx', sect: 'tomorrow: new bills (' + next.map((d) => d.name).join(', ') + ')' });
    return items;
  }
  function hustleItems() {
    const items = [];
    const rate = ON.incomeRate(S);
    items.push({ key: 'rate', big: `side hustles earn <b>${fmt(rate)}/s</b> while you smash popups.` + (S.exposure > 0 ? `<br><span style="color:var(--dim);font-size:11px">exposure earned: ${fmt(S.exposure).slice(1)} (worth $0)</span>` : '') });
    let shownLocked = 0;
    for (const h of ON.HUSTLES) {
      const n = S.hustles[h.id] || 0, cost = ON.hustleCost(S, h);
      if (!n && S.cash < cost * 0.35 && shownLocked >= 1) continue;
      if (!n) shownLocked++;
      const hr = ON.hustleRate(S, h.id);
      const down = n && h.needs && !ON.utilOk(S, h.needs);
      const nextMs = n < 10 ? 10 : n < 25 ? 25 : n < 50 ? 50 : 100;
      items.push({
        key: 'h' + h.id, icon: h.icon, name: h.name + (n ? ' ×' + n : ''),
        sub: down ? 'down: ' + (h.needs === 'wifi' ? 'no wi-fi' : 'no phone') : n ? fmt(hr) + '/s · ×2 at ' + nextMs : h.quip + (h.needs ? ' (needs ' + h.needs + ')' : ''),
        cls: down ? 'late' : '', btn: { label: fmt(cost), act: 'hus:' + h.id, dis: S.cash < cost }
      });
    }
    if (S.day >= 3) { items.push({ key: 'cs', sect: 'investments (lol)' }); items.push({ key: 'crypto', spark: true }); }
    else items.push({ key: 'cs', sect: 'investments unlock on day 3' });
    return items;
  }
  function upgradeItems() {
    const items = [];
    items.push({ key: 'cp', big: `cash per tap: <b>${fmt(ON.clickPower(S))}</b>` + (ON.globalMult(S) > 1 ? ` · credit bonus: <b>×${ON.globalMult(S).toFixed(2)}</b>` : '') });
    for (const u of ON.UPGRADES) {
      const l = ON.lvl(S, u.id);
      if (S.day < u.unlock) { items.push({ key: 'u' + u.id, icon: '🔒', name: '???', sub: 'unlocks on day ' + u.unlock, cls: 'locked' }); continue; }
      const maxed = l >= u.max, cost = ON.upCost(S, u);
      const nm = u.max === 1 ? u.names[1] : (u.names[Math.min(u.names.length - 1, l)] + (l >= u.names.length - 1 && l ? ' +' + (l - u.names.length + 1) : ''));
      items.push({ key: 'u' + u.id, icon: u.icon, name: nm + (u.max > 1 ? ' (lv ' + l + ')' : maxed ? ' ✓' : ''), sub: u.desc(l), btn: maxed ? { label: 'owned', act: 'x', dis: true } : { label: fmt(cost), act: 'up:' + u.id, dis: S.cash < cost } });
    }
    return items;
  }
  function freshItems() {
    const items = [];
    const gain = ON.freshGain(S, false);
    items.push({ key: 'fx', big: `filing for a fresh start ends this run and turns what you earned into <b>credit points</b>. each unspent point = <b>+12% income</b> (it compounds), or spend them on perks. you earn 1 point per day survived past day 3.<br><br>you have <b>${meta.cp} cp</b>. filing now: <b>+${gain} cp</b>.<br><span style="color:var(--dim);font-size:11px">getting bankrupted by the collector only gives half.</span>` });
    items.push({ key: 'fbtn', icon: '📝', name: 'file for a fresh start', sub: S.day < 3 ? 'available from day 3' : 'ends the run · +' + gain + ' cp', btn: { label: 'file', act: 'fresh', dis: S.day < 3 || gain < 1, cls: 'alt' } });
    items.push({ key: 'ps', sect: 'perks (permanent)' });
    for (const p of ON.PERKS) {
      const l = meta.perks[p.id] || 0, max = l >= p.max;
      items.push({ key: 'p' + p.id, icon: p.icon, name: p.name + ' (lv ' + l + ')', sub: p.desc(l + (max ? 0 : 1)) + (max ? '' : ' next'), btn: max ? { label: 'maxed', act: 'x', dis: true } : { label: (l + 1) + ' cp', act: 'perk:' + p.id, dis: meta.cp < l + 1, cls: 'alt' } });
    }
    items.push({ key: 'st', sect: 'best day: ' + meta.bestDay + ' · runs: ' + meta.runs + ' · lifetime earned: ' + fmt(meta.lifetime) });
    return items;
  }
  function renderPanel() {
    if (!S) return;
    const items = tab === 'bills' ? billsItems() : tab === 'hustles' ? hustleItems() : tab === 'upgrades' ? upgradeItems() : freshItems();
    renderItems(items);
  }

  el.list.addEventListener('click', (e) => {
    initAudio();
    const b = e.target.closest('[data-act]'); if (!b || b.disabled || !S || S.over) return;
    act(b.dataset.act);
    renderPanel(); renderTop();
  });
  function act(a) {
    const [k, v] = a.split(':');
    if (k === 'pay') ON.payBill(S, +v);
    else if (k === 'payall') ON.payAll(S);
    else if (k === 'cancel') cancelFlow(v);
    else if (k === 'hus') ON.buyHustle(S, v, 1);
    else if (k === 'up') ON.buyUp(S, v);
    else if (k === 'cbuy') ON.cryptoBuy(S, +v);
    else if (k === 'csell') { const c = S.crypto, pl = c.coins * c.price - c.spent; ON.cryptoSell(S); toast(pl >= 0 ? 'sold. +' + fmt(pl) + ' profit. tell no one.' : 'sold. lost ' + fmt(-pl) + '. it\'s a "learning experience".', pl < 0); }
    else if (k === 'perk') { if (ON.buyPerk(meta, v)) { sfx.buy(); save(); } }
    else if (k === 'fresh') freshConfirm();
  }

  // ---------- modals ----------
  function openModal(html, cls, onPrimary) {
    el.box.className = 'box ' + (cls || ''); el.box.innerHTML = html; el.modal.hidden = false; modalOpen = true;
    modalPrimary = onPrimary || null;
  }
  function closeModal() { el.modal.hidden = true; modalOpen = false; modalPrimary = null; }
  let modalPrimary = null;
  el.box.addEventListener('click', (e) => {
    initAudio();
    const b = e.target.closest('[data-m]'); if (!b) return;
    const h = modalHandlers[b.dataset.m]; if (h) h();
  });
  const modalHandlers = {};

  function showDayEnd(e) {
    sfx.day();
    const owed = S.bills.reduce((a, b) => a + b.amount, 0);
    const next = ON.BILLS.filter((d) => d.unlock === S.day + 1).map((d) => d.icon + ' ' + d.name);
    const lines = ['you survived. barely. probably.', 'another day, another overdraft.', 'the landlord says hi. and also pay.', 'you\'re doing great (financially, no).', 'sleep is free. for now.'];
    openModal(`<div class="tb"><span>day ${e.day} complete</span><span>☑</span></div><div class="in">
      <h2>day ${e.day} survived</h2>${lines[(Math.random() * lines.length) | 0]}
      <div class="stats"><span>earned today</span><b>${fmt(e.earned)}</b><span>hustle income</span><b>${fmt(ON.incomeRate(S))}/s</b><span>still owed</span><b>${fmt(owed)}</b><span>late fees so far</span><b>${fmt(S.lateFees)}</b></div>
      ${next.length ? '<div style="color:var(--lilac)">new tomorrow: ' + esc(next.join(', ')) + '</div>' : ''}
      <div style="color:var(--dim);font-size:11px;margin-top:4px">bills grow every day. so should you.</div>
      <div class="acts"><button class="btn" data-m="next">start day ${e.day + 1}</button></div></div>`, '', () => modalHandlers.next());
    modalHandlers.next = () => { closeModal(); ON.nextDay(S); clearFieldForDay(); save(); };
  }
  function clearFieldForDay() { /* keep popups between days: it's the same messy desktop */ }

  function showRepo(e) {
    sfx.knock(); setTimeout(sfx.bad, 400);
    ccEvent('repo', { strike: e.strike, day: S.day });
    openModal(`<div class="tb"><span>repossession · strike ${e.strike}/3</span><span>🕴️</span></div><div class="in">
      <h2>he got in.</h2>the debt collector "settled" your late bills by taking ${fmt(e.cashTaken)} in cash${e.took.length ? ' and ' + esc(e.took.join(', ')) : ''}.
      <div style="color:var(--red);margin-top:8px">${e.strike === 2 ? 'one more visit and it\'s bankruptcy. pay. your. bills.' : 'he\'ll be back if you\'re late again. 3 strikes = bankrupt.'}</div>
      <div class="acts"><button class="btn red" data-m="ok">ugh. fine.</button></div></div>`, 'bad', () => modalHandlers.ok());
    modalHandlers.ok = closeModal;
  }
  function cancelFlow(type) {
    const def = ON.BILL[type];
    const steps = [
      ['are you sure?', `cancel <b>${esc(def.name)}</b>? we'll miss you. (we'll miss your money.)`, 'yes, cancel', 'never mind'],
      ['wait!', 'how about 10% off for the next 3 months? that\'s almost something.', 'still cancel', 'ok fine, keep it'],
      ['tell us why', 'please choose a reason: ☐ too expensive ☐ forgot it existed ☐ broke ☐ all of the above', 'all of the above', 'actually keep it'],
      ['final confirmation', 'canceling now costs a <b>cancellation fee</b> of 50% of what you owe. we didn\'t make the rules. (we did.)', 'cancel it already', 'fine, keep it']
    ];
    let i = 0;
    const show = () => {
      const [t, b, yes, no] = steps[i];
      openModal(`<div class="tb"><span>${esc(t)}</span><span>${i + 1}/${steps.length}</span></div><div class="in">${b}<div class="acts"><button class="btn red" data-m="cy">${yes}</button><button class="btn ghost" data-m="cn">${no}</button></div></div>`, 'lilac', () => modalHandlers.cy());
    };
    modalHandlers.cy = () => { i++; if (i < steps.length) { show(); sfx.thud(); } else { closeModal(); ON.cancelSub(S, type); renderPanel(); } };
    modalHandlers.cn = () => { closeModal(); toast('kept ' + def.name + '. they knew you would.'); };
    show();
  }

  function freshConfirm() {
    const gain = ON.freshGain(S, false);
    openModal(`<div class="tb"><span>file for a fresh start</span><span>📝</span></div><div class="in">this ends your run on <b>day ${S.day}</b>. your cash, hustles and upgrades go away. you keep <b>+${gain} credit points</b> and your perks.<div class="acts"><button class="btn alt" data-m="fy">file it</button><button class="btn ghost" data-m="fn">not yet</button></div></div>`, 'lilac', () => modalHandlers.fy());
    modalHandlers.fy = () => { closeModal(); ON.endRun(S, 'fresh'); handleEvents(); };
    modalHandlers.fn = closeModal;
  }

  let shareCanvas = null;
  function showOver() {
    const o = S.over, bank = o.why === 'bankrupt';
    if (bank) { sfx.bad(); ccEvent('bankrupt', { day: S.day }); } else ccEvent('fresh_start', { day: S.day });
    cc('end', { score: S.day, durationMs: Math.round(performance.now() - runClock), completed: true });
    save();
    shareCanvas = drawCard();
    openModal(`<div class="tb"><span>${bank ? 'final notice' : 'fresh start filed'}</span><span>${bank ? '🕴️' : '📝'}</span></div><div class="in">
      <h2>${bank ? 'repossessed.' : 'clean slate.'}</h2>${bank ? 'the debt collector took the couch, the router and the lemonade stand.' : 'the paperwork was 40 pages. you signed all of them.'}
      <div id="cardSlot"></div>
      <div class="stats"><span>days survived</span><b>${S.day}</b><span>earned this run</span><b>${fmt(S.runEarned)}</b><span>late fees paid</span><b>${fmt(S.lateFees)}</b><span>popups closed</span><b>${S.popsClosed}</b><span>credit points</span><b>+${o.gain}</b></div>
      <div class="acts"><button class="btn alt" data-m="share">share</button><button class="btn" data-m="again">new run</button></div></div>`, bank ? 'bad' : 'lilac', () => modalHandlers.again());
    $('cardSlot').appendChild(shareCanvas);
    modalHandlers.share = share;
    modalHandlers.again = () => { closeModal(); newRun(); setTab('fresh'); if (meta.cp > 0) toast('spend your credit points on perks →'); };
  }
  function shareText() {
    return S.over && S.over.why === 'bankrupt'
      ? `i survived ${S.day} days of bills before the debt collector got me. late fees: ${fmt(S.lateFees)}. ${URL_TEXT}`
      : `i survived ${S.day} days of bills and filed for a fresh start. earned ${fmt(S.runEarned)}. ${URL_TEXT}`;
  }
  function drawCard() {
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1080;
    const g = c.getContext('2d'), F = 'ui-monospace,Menlo,Consolas,monospace';
    const bank = S.over && S.over.why === 'bankrupt';
    g.fillStyle = '#101114'; g.fillRect(0, 0, 1080, 1080);
    g.strokeStyle = bank ? '#FF5C7A' : '#B59AFF'; g.lineWidth = 10; g.strokeRect(40, 40, 1000, 1000);
    g.fillStyle = bank ? '#FF5C7A' : '#B59AFF'; g.fillRect(40, 40, 1000, 90);
    g.fillStyle = '#101114'; g.font = 'bold 44px ' + F; g.fillText(bank ? 'FINAL NOTICE' : 'FRESH START', 80, 102);
    g.textAlign = 'right'; g.fillText('overdue notice', 1000, 102); g.textAlign = 'left';
    g.fillStyle = '#F5F3ED'; g.font = 'bold 54px ' + F; g.fillText('i survived', 90, 250);
    g.fillStyle = '#C5FF49'; g.font = 'bold 240px ' + F; g.fillText(String(S.day), 80, 480);
    g.fillStyle = '#F5F3ED'; g.font = 'bold 54px ' + F; g.fillText(S.day === 1 ? 'day of bills.' : 'days of bills.', 90, 570);
    g.font = '36px ' + F; g.fillStyle = 'rgba(245,243,237,.7)';
    const rows = [['earned', fmt(S.runEarned)], ['late fees', fmt(S.lateFees)], ['popups closed', String(S.popsClosed)], ['exposure', fmt(S.exposure).slice(1) + ' pts']];
    rows.forEach(([a, b], i) => { g.textAlign = 'left'; g.fillText(a, 90, 680 + i * 56); g.textAlign = 'right'; g.fillStyle = '#F5F3ED'; g.fillText(b, 990, 680 + i * 56); g.fillStyle = 'rgba(245,243,237,.7)'; });
    g.textAlign = 'left'; g.font = 'bold 40px ' + F; g.fillStyle = bank ? '#FF5C7A' : '#B59AFF';
    g.fillText(bank ? 'status: repossessed 🕴️' : 'status: clean slate 📝', 90, 940);
    g.font = 'bold 34px ' + F; g.fillStyle = '#C5FF49'; g.fillText(URL_TEXT, 90, 1000);
    return c;
  }
  async function share() {
    ccEvent('share');
    const text = shareText();
    try {
      const blob = await new Promise((r) => shareCanvas.toBlob(r, 'image/png'));
      const file = blob && new File([blob], 'overdue-notice.png', { type: 'image/png' });
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
      if (navigator.share) { await navigator.share({ text }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text); toast('copied. go post it.'); } catch (e) { toast('couldn\'t copy. screenshot it.', true); }
  }

  // ---------- run lifecycle ----------
  let runClock = performance.now();
  function newRun() {
    clearField();
    S = ON.newRun(meta); S.spooky = spookyOn();
    runClock = performance.now(); ccEvents = 0;
    cc('start'); save(); renderPanel();
  }
  function applySpooky() {
    const on = spookyOn();
    document.body.classList.toggle('spooky', on); el.spooky.classList.toggle('on', on);
    el.collector.textContent = on ? '🧛' : '🕴️';
    if (S) S.spooky = on;
  }
  el.spooky.addEventListener('click', () => { meta.spooky = !spookyOn(); applySpooky(); toast(spookyOn() ? 'spooky mode on. the bills are haunted now.' : 'spooky mode off.'); save(); });

  // ---------- input ----------
  window.addEventListener('keydown', (e) => {
    initAudio();
    if (paused) return;
    if (modalOpen) { if ((e.code === 'Enter' || e.code === 'Space') && modalPrimary) { e.preventDefault(); modalPrimary(); } return; }
    if (!S || S.over) return;
    if (e.code === 'Space') { e.preventDefault(); ON.tapAny(S); }
    else if (e.key === 'p' || e.key === 'P') { ON.payAll(S); renderPanel(); }
    else if (e.key === 'g' || e.key === 'G') { if (S.gig && !S.gig.active) { ON.acceptGig(S); sfx.gig(); } }
    else if ('1234'.includes(e.key) && e.key) setTab(['bills', 'hustles', 'upgrades', 'fresh'][+e.key - 1]);
  });
  function setPaused(p) {
    paused = p;
    if (ac) { if (p) ac.suspend(); else ac.resume(); }
    if (p) { if (!el.modal.hidden) return; toast('paused. the bills are also paused. for once.'); }
  }
  window.addEventListener('message', (e) => {
    const d = e.data; if (!d || typeof d !== 'object') return;
    if (d.type === 'cc-mute') { muted = !!d.muted; if (master) master.gain.value = muted ? 0 : 0.45; }
    else if (d.type === 'cc-pause') setPaused(typeof d.paused === 'boolean' ? d.paused : !paused);
    else if (d.type === 'cc-restart') { closeModal(); paused = false; newRun(); setTab('bills'); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  window.addEventListener('pagehide', () => {
    save();
    if (S && !S.over) cc('end', { score: S.day, durationMs: Math.round(performance.now() - runClock), completed: false });
  });

  // ---------- loop ----------
  let last = performance.now(), panelT = 0, saveT = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    step(dt);
    requestAnimationFrame(frame);
  }
  function step(dt) {
    if (!paused && !modalOpen && S && !S.over) ON.tick(S, dt);
    handleEvents();
    renderTop();
    panelT -= dt; if (panelT <= 0) { panelT = 0.12; renderPanel(); }
    saveT -= dt; if (saveT <= 0) { saveT = 5; save(); }
  }

  // ---------- boot ----------
  meta = ON.newMeta();
  const resumed = load();
  if (!resumed) { S = ON.newRun(meta); }
  applySpooky();
  if (resumed) {
    const away = meta.lastSeen ? (Date.now() - meta.lastSeen) / 1000 : 0;
    if (S.over) { newRun(); }
    else if (S.dayDone) showDayEnd({ day: S.day, earned: S.dayEarned });
    else if (away > 60) {
      const r = ON.offline(S, away);
      if (r.amt >= 1) openModal(`<div class="tb"><span>welcome back</span><span>💤</span></div><div class="in"><h2>+${fmt(r.amt)}</h2>your hustles kept going for ${secs(r.secs)} while you were gone (at 40%, they slack off without you). the bills waited. how polite.<div class="acts"><button class="btn" data-m="ok">nice</button></div></div>`, '', () => modalHandlers.ok());
      modalHandlers.ok = closeModal;
    }
  }
  if (window.matchMedia && window.matchMedia('(min-width:820px)').matches) { /* desktop shows bills by default too */ }
  cc('start');
  renderPanel();
  if (/[?&]debug/.test(location.search)) window.__on = { get S() { return S; }, ON, step, act, newRun, meta: () => meta, fast(sec, bot) { for (let i = 0; i < sec * 20; i++) { if (S.dayDone) { S.ev = []; ON.nextDay(S); } if (bot) bot(S, ON, i); ON.tick(S, 0.05); S.ev = []; } clearField(); S.pops = []; S.pig = null; S.gig = null; renderTop(); renderPanel(); } };
  requestAnimationFrame(frame);
})();
