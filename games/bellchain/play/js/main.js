// bellchain v2: game controller. economy + music + renderer + ui + save + offline + golden bells + recast.
import * as E from './economy.js';
import { Music, themeFor } from './music.js';
import { Stage } from './render.js';

const SAVE_KEY = 'bellchain.save.v2';
const $ = (id) => document.getElementById(id);
const ICON = { handbell: '🔔', cowbell: '🐮', glock: '🎹', church: '⛪', tubular: '🎐', steel: '🥁', gamelan: '🪘', crystal: '💎', chip: '👾', choir: '🎤', carillon: '🗼', cosmic: '🪐' };
const sdk = (fn) => { try { if (window.cc) fn(window.cc); } catch (e) { /* the platform is optional */ } };

// ---------- storage ----------
const store = {
  ok: true,
  get(k) { try { return localStorage.getItem(k); } catch (e) { this.ok = false; return null; } },
  set(k, v) { try { localStorage.setItem(k, v); this.ok = true; } catch (e) { this.ok = false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* blocked */ } },
};
let S = E.deserialize(store.get(SAVE_KEY) || '') || E.newState();
const firstVisit = !store.get(SAVE_KEY);
if (firstVisit && store.get('bellchain.save.v1')) { S.veteran = true; E.earn(S, 500); }
let buffs = [];
let pendingAway = null;
let paused = false, extMuted = false;

const music = new Music();
const stage = new Stage($('cv'));
const pending = []; // [t, fn] visual events waiting for their note to sound
music.onNote = (e) => pending.push([e.t, () => stage.ring(e.deg, e.instr, e.vel, e.instr === 'tap' || e.instr === 'handbell')]);
music.onStep = (st, t) => pending.push([t, () => { stage.seq.step = st; if (st % 4 === 0) stage.great.pulse = Math.max(stage.great.pulse, 0.35); }]);

function applyTheme() {
  const th = themeFor(S.ascensions);
  stage.theme = th; music.setTheme(th);
  document.documentElement.style.setProperty('--acc', th.acc);
  $('now').textContent = `${th.name} · ${th.mode} · ${E.SONGS.find((x) => x.id === S.song).name}`;
}
function applySong() { music.setSong(S.song, S.ascensions * 31 + 7); stage.seq.song = music.song; applyTheme(); }
function applyVolume() { music.setVolume(S.volume); music.setMuted(S.muted); music.setExt(extMuted); $('muteBtn').textContent = S.muted || extMuted ? '×' : '♪'; $('muteBtn').setAttribute('aria-label', S.muted || extMuted ? 'unmute' : 'mute'); $('vol').value = Math.round(S.volume * 100); $('volLabel').textContent = Math.round(S.volume * 100) + '%'; }
applySong(); applyVolume();

function save() {
  S.lastSeen = Date.now();
  if (pendingAway) { const t = E.deserialize(E.serialize(S)); E.earn(t, pendingAway.gain); store.set(SAVE_KEY, E.serialize(t)); }
  else store.set(SAVE_KEY, E.serialize(S));
}

// ---------- tapping ----------
const now = () => performance.now() / 1000;
function band() { return (S.owned.handbell || 0) > 0; }
function tapAt(x, y) {
  music.unlock();
  if (stage.hitGolden(x, y)) return catchGolden();
  const ch = E.rollChain(S, buffs);
  E.earn(S, ch.total);
  S.taps++; S.tapEarned += ch.total;
  S.bestChain = Math.max(S.bestChain, ch.rings.length);
  const degs = music.tapDegrees(ch.rings.length, band());
  const t0 = now(), gap = music.stepDur() * (band() ? 1 : 1.5);
  stage.tapGreat(x, y, '+' + E.fmt(ch.rings[0].value), ch.perfect);
  ch.rings.forEach((r, i) => {
    music.play('tap', degs[i], t0 + i * gap + 0.005, i ? 0.75 : 1);
    if (i) pending.push([t0 + i * gap, () => stage.hop(degs[i], E.fmt(r.value), i + 1)]);
  });
  if (ch.perfect) {
    S.perfects++;
    pending.push([t0 + 7 * gap, () => { stage.showBanner('perfect peal', 'x3, the whole chain', null, 1.6); stage.flash = 0.35; stage.shake = 0.4; buzz(30); }]);
  }
}
const buzz = (ms) => { try { if (!S.muted && navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(ms); } catch (e) { /* no */ } };
$('cv').addEventListener('pointerdown', (e) => {
  if (paused) return;
  const r = $('cv').getBoundingClientRect();
  tapAt(e.clientX - r.left, e.clientY - r.top);
});
window.addEventListener('keydown', (e) => {
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  if (e.code === 'Space' || e.key === 'Enter') {
    if (document.querySelector('.modal.open') || (e.target && e.target.tagName === 'BUTTON')) return;
    e.preventDefault(); if (!paused) tapAt(stage.cx + (Math.random() - 0.5) * 40, stage.cy);
  }
  if (e.key === 'm' || e.key === 'M') toggleMute();
  if (e.key === 'Escape') closeModals();
});

// ---------- golden bells ----------
let goldenIn = Math.min(40, E.goldenDelay(S));
function spawnGolden() {
  const m = stage.bs * 1.6;
  stage.golden = { x: m + Math.random() * (stage.w - 2 * m), y: 70 + Math.random() * Math.max(10, stage.h - 140), t: 0, life: E.CFG.goldenLife };
}
function catchGolden() {
  stage.golden = null;
  S.goldenClicks++;
  const ef = E.goldenEffect(S);
  if (ef.kind === 'lucky') E.earn(S, ef.gain);
  else { buffs = buffs.filter((b) => b.kind !== ef.kind); buffs.push({ kind: ef.kind, mult: ef.mult, until: S.playSec + ef.dur, label: ef.label.split(' · ')[0] }); }
  [0, 2, 4, 7, 9].forEach((d, i) => music.play('glock', d + 7, now() + i * 0.06, 0.9));
  stage.showBanner(ef.label, 'golden bell', '#ffe14a', 2.4); stage.flash = 0.3;
  sdk((c) => c.event && c.event('golden', { kind: ef.kind }));
  buzz(25);
}

// ---------- ui: tabs ----------
let tab = 'shop';
document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => {
  tab = b.dataset.tab;
  document.querySelectorAll('#tabs button').forEach((x) => x.classList.toggle('on', x === b));
  document.querySelectorAll('.pane').forEach((p) => { p.hidden = p.id !== 'pane-' + tab; });
  renderTab(true);
}));
document.querySelectorAll('.amt button').forEach((b) => b.addEventListener('click', () => { S.buyAmt = +b.dataset.amt; document.querySelectorAll('.amt button').forEach((x) => x.classList.toggle('on', x === b)); refreshShop(true); }));
document.querySelectorAll('.amt button').forEach((x) => x.classList.toggle('on', +x.dataset.amt === S.buyAmt));

function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2200); }

// shop
let upKey = '';
const bldEls = {};
for (const b of E.BUILDINGS) {
  const el = document.createElement('button');
  el.className = 'bld';
  el.innerHTML = `<span class="ic">${ICON[b.id]}</span><span><b></b><small></small><span class="cost"></span></span><span class="own"></span>`;
  el.addEventListener('click', () => {
    if (el.classList.contains('mystery')) return;
    music.unlock();
    if (E.buyBld(S, b.id, S.buyAmt)) {
      const first = S.owned[b.id] === S.buyAmt;
      music.play(b.id === 'cowbell' ? 'cowbell' : b.id in { choir: 1 } ? 'choir' : 'tap', 4 + Math.floor(Math.random() * 3), now(), 0.7, 4);
      if (first) stage.showBanner(`${b.name} joined the band`, b.desc, null, 2.6);
      refreshShop(true);
    } else { el.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], 160); }
  });
  $('blds').appendChild(el); bldEls[b.id] = el;
}
function refreshShop(force) {
  const av = E.availableUpgrades(S).slice(0, 18), key = av.map((u) => u.id).join();
  if (force || key !== upKey) {
    upKey = key;
    $('ups').innerHTML = '';
    for (const u of av) {
      const el = document.createElement('button'); el.className = 'up'; el.dataset.id = u.id;
      el.innerHTML = `<b>${u.name}</b><small>${u.desc}</small><i>${E.fmt(u.cost)}</i>`;
      el.addEventListener('click', () => { music.unlock(); if (E.buyUpgrade(S, u.id)) { music.play('glock', 7, now(), 0.8); music.play('glock', 9, now() + 0.07, 0.8); refreshShop(true); } else toast(`need ${E.fmt(u.cost - S.res)} more.`); });
      $('ups').appendChild(el);
    }
    $('upsNone').hidden = av.length > 0;
  }
  $('ups').querySelectorAll('.up').forEach((el) => el.classList.toggle('poor', S.res < E.UP_BY_ID[el.dataset.id].cost));
  let shownNext = false;
  for (const b of E.BUILDINGS) {
    const el = bldEls[b.id], own = S.owned[b.id] || 0;
    const seen = own > 0 || S.earnedRun >= b.cost * 0.4 || S.ascensions > 0 && b.cost <= 1.4e6;
    el.hidden = !seen && shownNext; if (!seen) shownNext = true;
    el.classList.toggle('mystery', !seen);
    const cost = E.costOf(S, b.id, S.buyAmt);
    el.querySelector('b').textContent = seen ? b.name : '???';
    el.querySelector('small').textContent = seen ? `${own ? E.fmt(E.bldRate(S, b.id) * own) + '/s total · ' : ''}${E.fmt(E.bldRate(S, b.id))}/s each` : 'keep ringing to find out';
    el.querySelector('.cost').textContent = (S.buyAmt > 1 ? `x${S.buyAmt} ` : '') + E.fmt(cost);
    el.querySelector('.own').textContent = own || '';
    el.classList.toggle('poor', S.res < cost);
  }
}

// songs
function renderSongs() {
  $('songs').innerHTML = '';
  $('songBonus').textContent = `+${Math.round(E.CFG.songBonus * 100 * (S.songs.length - 1))}%`;
  for (const so of E.SONGS) {
    const have = S.songs.includes(so.id), el = document.createElement('button');
    el.className = 'song' + (S.song === so.id ? ' on' : '') + (have ? '' : ' locked') + (!have && S.res < so.cost ? ' poor' : '');
    el.innerHTML = `<span>${so.name}</span><i>${S.song === so.id ? 'playing' : have ? 'play' : E.fmt(so.cost)}</i>`;
    el.addEventListener('click', () => {
      music.unlock();
      if (have) { S.song = so.id; applySong(); }
      else if (E.buySong(S, so.id)) { applySong(); stage.showBanner('new song', so.name, null, 2.2); sdk((c) => c.event && c.event('song', { id: so.id })); }
      else return toast(`need ${E.fmt(so.cost - S.res)} more.`);
      renderSongs();
    });
    $('songs').appendChild(el);
  }
}

// stats + achievements
function renderStats() {
  const th = themeFor(S.ascensions);
  $('stats').innerHTML = [
    ['resonance this run', E.fmt(S.earnedRun)], ['resonance all time', E.fmt(S.earnedAll)], ['per second', E.fmt(E.rps(S, buffs))],
    ['per tap', E.fmt(E.tapValue(S, buffs))], ['echo chance', Math.round(E.echoChance(S, buffs) * 100) + '%'], ['taps', E.fmt(S.taps)],
    ['from taps', E.fmt(S.tapEarned)], ['best chain', S.bestChain], ['perfect peals', E.fmt(S.perfects)], ['golden bells', S.goldenClicks],
    ['bells owned', Object.values(S.owned).reduce((a, b) => a + b, 0)], ['recasts', S.ascensions], ['scale', `${th.name} · ${th.mode}`],
    ['production bonus', '+' + Math.round((E.globalMult(S) - 1) * 100) + '%'], ['time played', E.fmtTime(S.playSec)], ['this run', E.fmtTime(S.runSec)],
  ].map(([k, v]) => `<div class="row"><span>${k}</span><b>${v}</b></div>`).join('');
  const got = Object.keys(S.ach).length;
  $('achCount').textContent = `${got}/${E.ACH.length}`;
  if ($('achs').children.length !== E.ACH.length || renderStats.got !== got) {
    renderStats.got = got;
    $('achs').innerHTML = '';
    for (const a of E.ACH) {
      const el = document.createElement('div'); el.className = 'ach' + (S.ach[a.id] ? ' got' : ''); el.textContent = S.ach[a.id] ? '✓' : '?';
      el.addEventListener('click', () => toast(S.ach[a.id] ? `${a.name}: ${a.desc}` : `locked: ${a.desc}`));
      $('achs').appendChild(el);
    }
  }
}

// recast
function renderRecast() {
  const g = E.otGain(S), nextTh = themeFor(S.ascensions + 1);
  $('otLabel').textContent = `${S.otLevel} overtones · +${Math.round(S.otLevel * (S.nodes.choir ? 3 : 2))}%`;
  $('chipLabel').textContent = `${S.otChips} to spend`;
  $('recastNote').innerHTML = g > 0
    ? `recasting now gives <b>+${g} overtones</b> (+${S.nodes.choir ? 3 : 2}% resonance each, forever) and turns your bells to <b>${nextTh.name}</b> in <b>${nextTh.mode}</b>. waiting longer gives more.`
    : `the great bell needs more. next overtone at <b>${E.fmt(E.nextOtAt(S))}</b> resonance all time (you have ${E.fmt(S.earnedAll)}). the next recast turns everything <b>${nextTh.name}</b>, in <b>${nextTh.mode}</b>.`;
  $('recastBtn').disabled = g < 1;
  $('recastBtn').textContent = g > 0 ? `recast for +${g}` : 'recast';
  $('nodes').innerHTML = '';
  for (const n of E.NODES) {
    const got = !!S.nodes[n.id], el = document.createElement('button');
    el.className = 'node' + (got ? ' got' : S.otChips < n.cost ? ' poor' : '');
    el.innerHTML = `<b>${n.name}</b><small>${n.desc}</small><i>${got ? 'owned' : n.cost + ' overtones'}</i>`;
    el.addEventListener('click', () => { if (E.buyNode(S, n.id)) { music.play('crystal', 7, now(), 1); renderRecast(); save(); } else if (!got) toast(`costs ${n.cost} overtones.`); });
    $('nodes').appendChild(el);
  }
}
$('recastBtn').addEventListener('click', () => {
  const g = E.otGain(S); if (g < 1) return;
  const th = themeFor(S.ascensions + 1);
  $('recastGain').textContent = `+${g} overtones`;
  $('recastNext').textContent = `next run: ${th.name} bells, ${th.mode} scale.`;
  $('recastModal').classList.add('open');
});
$('recastNo').addEventListener('click', closeModals);
$('recastGo').addEventListener('click', () => {
  const g = E.ascend(S); closeModals();
  if (!g) return;
  buffs = []; stage.golden = null; goldenIn = 30;
  applySong();
  const th = themeFor(S.ascensions);
  [-7, -5, -3, 0].forEach((d, i) => music.play('church', d, now() + i * 0.25, 1));
  stage.showBanner(`recast · +${g} overtones`, `${th.name} bells · ${th.mode}`, th.acc, 3.5); stage.flash = 0.6; stage.shake = 0.6;
  sdk((c) => c.event && c.event('recast', { n: S.ascensions, overtones: S.otLevel }));
  refreshShop(true); renderTab(true); save();
});

// menu
$('vol').addEventListener('input', () => { S.volume = $('vol').value / 100; if (S.volume > 0 && S.muted) S.muted = false; music.unlock(); applyVolume(); });
function toggleMute() { music.unlock(); if (extMuted) { extMuted = false; S.muted = false; } else S.muted = !S.muted; applyVolume(); }
$('muteBtn').addEventListener('click', (e) => { e.stopPropagation(); toggleMute(); });
$('exportBtn').addEventListener('click', () => {
  save(); const code = E.exportCode(S); $('code').value = code; $('code').select();
  try { navigator.clipboard.writeText(code).then(() => toast('save code copied. keep it somewhere safe-ish.'), () => toast('code is in the box. copy it.')); } catch (e) { toast('code is in the box. copy it.'); }
  sdk((c) => c.event && c.event('export', {}));
});
$('importBtn').addEventListener('click', () => {
  const s = E.importCode($('code').value);
  if (!s) return toast('that code is cooked. paste the whole thing.');
  S = s; buffs = []; applySong(); applyVolume(); refreshShop(true); renderTab(true); save(); toast('save loaded. welcome back.');
});
let resetArm = 0;
$('resetBtn').addEventListener('click', () => {
  if (Date.now() - resetArm > 3000) { resetArm = Date.now(); $('resetBtn').textContent = 'tap again. it is all gone forever.'; setTimeout(() => { $('resetBtn').textContent = 'erase everything'; }, 3000); return; }
  resetArm = 0; store.del(SAVE_KEY); S = E.newState(); buffs = []; applySong(); applyVolume(); refreshShop(true); renderTab(true); save();
  $('resetBtn').textContent = 'erase everything'; toast('fresh start. the silence is deafening.');
});
$('shareBtn').addEventListener('click', () => {
  const th = themeFor(S.ascensions);
  const txt = `my bellchain band makes ${E.fmt(E.baseRps(S))} resonance/s in ${th.mode}. ${S.otLevel} overtones, best chain ${S.bestChain}. computercooked.com/games/bellchain`;
  sdk((c) => c.event && c.event('share_clicked', {}));
  const copy = () => { try { navigator.clipboard.writeText(txt).then(() => toast('copied. go brag.'), () => toast(txt)); } catch (e) { toast(txt); } };
  if (navigator.share) navigator.share({ text: txt }).catch((err) => { if (!err || err.name !== 'AbortError') copy(); }); else copy();
});

function renderTab(force) {
  if (tab === 'shop') refreshShop(force);
  else if (tab === 'songs') renderSongs();
  else if (tab === 'stats') renderStats();
  else if (tab === 'recast') renderRecast();
  else if (tab === 'menu') $('saveNote').textContent = store.ok ? 'autosaves every 10 seconds on this device. export a code to move it somewhere else.' : 'saving is blocked in this browser. export a code before you leave.';
  const g = E.otGain(S);
  document.querySelector('[data-tab=recast]').innerHTML = 'recast' + (g > 0 ? '<span class="dot"></span>' : '');
}

// ---------- modals / away ----------
function closeModals() {
  if ($('awayModal').classList.contains('open')) collectAway();
  document.querySelectorAll('.modal').forEach((m) => m.classList.remove('open'));
}
function collectAway() {
  if (!pendingAway) return;
  E.earn(S, pendingAway.gain); stage.showBanner('+' + E.fmt(pendingAway.gain), 'collected', null, 2); pendingAway = null;
  $('awayModal').classList.remove('open'); save();
}
$('awayBtn').addEventListener('click', () => { music.unlock(); collectAway(); });
function handleReturn() {
  const away = (Date.now() - S.lastSeen) / 1000;
  if (away < 30 || E.baseRps(S) <= 0) return;
  const g = E.offlineGain(S, away);
  if (g.gain < 1) return;
  pendingAway = g;
  $('awayTime').textContent = `you were gone ${E.fmtTime(g.sec)}${g.capped ? ' (that is the cap)' : ''}.`;
  $('awayGain').textContent = '+' + E.fmt(g.gain);
  $('awayModal').classList.add('open');
}

// ---------- player page messages ----------
function pause() { if (paused) return; paused = true; music.setExt(true); save(); }
function resume() { if (!paused) return; paused = false; music.setExt(extMuted); last = performance.now(); music.nextT = 0; }
window.addEventListener('message', (e) => {
  const d = e.data;
  if (!d || typeof d !== 'object') return;
  if (d.type === 'cc-mute') { extMuted = !!d.muted; applyVolume(); }
  else if (d.type === 'cc-pause') { if (d.paused === false) resume(); else if (d.paused === true) pause(); else if (paused) resume(); else pause(); }
  else if (d.type === 'cc-restart') {
    // an idle game's save is the whole point: restart asks first
    tab = 'menu'; document.querySelector('[data-tab=menu]').click();
    resetArm = Date.now(); $('resetBtn').textContent = 'tap to erase everything and restart';
    setTimeout(() => { $('resetBtn').textContent = 'erase everything'; }, 6000);
    toast('restart = erase your save. tap the red button to confirm.');
  }
});

// ---------- site score: monotonic, never faster than 100 points a second ----------
let sentScore = 0, scoreAcc = 0;
function pushScore(dt) {
  scoreAcc += dt;
  if (scoreAcc < 2) return;
  const target = E.siteScore(S), next = Math.min(target, sentScore + Math.ceil(100 * scoreAcc));
  scoreAcc = 0;
  if (next > sentScore) { sentScore = next; sdk((c) => c.score && c.score(sentScore)); }
}
const sessionStart = performance.now();
let ended = false;
const endSession = () => { if (ended) return; ended = true; sdk((c) => c.end && c.end({ score: sentScore, durationMs: Math.round(performance.now() - sessionStart) })); };

// ---------- main loop ----------
let last = performance.now(), uiAcc = 0, achAcc = 0, saveAcc = 0;
function frame(tms) {
  const raw = (tms - last) / 1000; last = tms;
  const dt = Math.min(0.25, Math.max(0, raw));
  if (!paused) {
    S.playSec += dt; S.runSec += dt;
    E.earn(S, E.rps(S, buffs) * dt);
    if (buffs.length) {
      buffs = buffs.filter((b) => b.until > S.playSec);
      music.tempoMult = buffs.some((b) => b.kind === 'frenzy') ? 1.25 : buffs.some((b) => b.kind === 'encore') ? 1.12 : 1;
    } else music.tempoMult = 1;
    // golden bell
    if (stage.golden) { if (stage.golden.t > stage.golden.life) stage.golden = null; }
    else if ((goldenIn -= dt) <= 0) { spawnGolden(); goldenIn = E.goldenDelay(S); }
    // the band
    music.update(now(), S.owned);
    stage.bandIds = E.BUILDINGS.filter((b) => S.owned[b.id]).map((b) => b.id);
    achAcc += dt;
    if (achAcc > 0.5) {
      achAcc = 0;
      for (const a of E.checkAch(S, buffs)) { toast(`achievement: ${a.name} (+1%)`); music.play('crystal', 9, now(), 0.7); }
    }
    saveAcc += dt; if (saveAcc > 10) { saveAcc = 0; save(); }
    pushScore(dt);
  }
  // fire visuals whose notes are sounding now
  const tn = now();
  for (let i = pending.length - 1; i >= 0; i--) if (pending[i][0] <= tn) { const f = pending[i][1]; pending.splice(i, 1); f(); }
  if (pending.length > 400) pending.splice(0, pending.length - 400);
  // adaptive quality
  if (raw > 0.034) stage.slow = (stage.slow || 0) + 1; else stage.slow = Math.max(0, (stage.slow || 0) - 1);
  stage.lite = stage.slow > 30;
  stage.draw(paused ? 0 : dt);
  uiAcc += dt;
  if (uiAcc > 0.2) {
    uiAcc = 0;
    $('res').innerHTML = `${E.fmt(S.res)}<small>res</small>`;
    $('rps').textContent = `${E.fmt(E.rps(S, buffs))} /s · tap ${E.fmt(E.tapValue(S, buffs))}`;
    $('buffs').innerHTML = buffs.map((b) => `<span class="buff">${b.label} ${Math.ceil(b.until - S.playSec)}s</span>`).join('');
    if (tab === 'shop') refreshShop(); else if (tab === 'songs' || tab === 'recast') { if ((renderTab.n = (renderTab.n || 0) + 1) % 5 === 0) renderTab(); } else if (tab === 'stats' && (renderTab.n = (renderTab.n || 0) + 1) % 5 === 0) renderStats();
    const g = E.otGain(S), rb = document.querySelector('[data-tab=recast]');
    if (!!rb.querySelector('.dot') !== g > 0) renderTab();
  }
  requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) save();
  else { handleReturn(); last = performance.now(); }
});
window.addEventListener('pagehide', () => { save(); endSession(); });
window.addEventListener('resize', () => stage.resize());
if (window.ResizeObserver) new ResizeObserver(() => stage.resize()).observe($('stage'));

// ---------- boot ----------
sdk((c) => c.start && c.start());
window.addEventListener('load', () => sdk((c) => c.start && !sentScore && c.score && c.score(0)), { once: true });
handleReturn();
refreshShop(true); renderTab(true);
if (firstVisit) {
  if (S.veteran) toast('welcome back, v1 veteran. here is 500 resonance for your trouble.');
  else toast('tap anywhere. every tap plays the next note.');
  stage.showBanner('tap to play', 'the tune is in there somewhere', null, 4);
}
if (!store.ok) toast('saving is blocked here. export a code before you leave.');
save();
requestAnimationFrame((t) => { last = t; frame(t); });

// tiny test surface (qa + balance checks; harmless for players)
window.bellchain = { get state() { return S; }, E, music, stage, tapAt, get buffs() { return buffs; }, catchGolden, spawnGolden, save };
