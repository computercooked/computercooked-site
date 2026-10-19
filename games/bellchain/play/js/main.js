// Bellchain: game controller. Wires the economy, the renderer, sound, UI, save and offline progress.
import * as E from './economy.js';
import { Sound } from './audio.js';
import { Belfry } from './render.js';

const SAVE_KEY = 'bellchain.save.v1';
const $ = (id) => document.getElementById(id);
// no telemetry, no portal SDKs: these stay as no-ops so the call sites read the same
const track = () => {};
const portal = () => null;
const J = () => {};
const highlight = () => {};
let extMuted = false; // set by the computer cooked player page via postMessage
let runStarted = false;
let hitStop = 0;
const buzz = (p) => { try { if (!S.muted && navigator.vibrate) navigator.vibrate(p); } catch (e) { /* not supported */ } };

// ---------- storage (never throws: private mode or blocked storage still plays) ----------
const store = {
  ok: true,
  get() { try { return window.localStorage.getItem(SAVE_KEY); } catch (e) { this.ok = false; return null; } },
  set(v) { try { window.localStorage.setItem(SAVE_KEY, v); this.ok = true; return true; } catch (e) { this.ok = false; return false; } },
  del() { try { window.localStorage.removeItem(SAVE_KEY); } catch (e) { this.ok = false; } },
};

function load() {
  const raw = store.get();
  return raw ? E.deserialize(raw) : E.newState();
}

let S = load();
let pendingAway = null; // offline gain shown on the away card, paid on Collect
const firstVisit = !store.get();
const snd = new Sound();
snd.muted = !!S.muted;
const fx = new Belfry($('belfry'));

function save() {
  S.lastSeen = Date.now();
  if (pendingAway) {
    // an uncollected "away" card is still the player's money: save it as if collected
    const t = JSON.parse(E.serialize(S));
    E.earn(t, pendingAway.gain);
    store.set(E.serialize(t));
  } else store.set(E.serialize(S));
}

// ---------- cascades ----------
const live = [];          // animated cascades in flight
const MAX_LIVE_RINGER = 5;
let frameEma = 1 / 60;
const MAX_LIVE_HAND = 10;
let recent = [];          // [time, amount] for the rolling rate
let lastHandChain = -9;
let clock = 0;

function hopTimes(rings) {
  // time offset for each ring: hops speed up as a chain gets longer
  const at = [];
  for (const r of rings) {
    let t = 0;
    for (let j = 1; j <= r.hop; j++) t += Math.max(0.045, 0.13 - j * 0.0045);
    at.push(t);
  }
  return at;
}

function strike(bell, hand) {
  const c = E.cascade(S, bell, Math.random, hand);
  const liveCount = live.filter((x) => x.hand === hand).length;
  if ((hand && liveCount >= MAX_LIVE_HAND) || (!hand && liveCount >= (fx.lite ? 2 : MAX_LIVE_RINGER))) {
    // too busy to animate: pay instantly, light swing only
    gain(c.total);
    E.recordChain(S, c);
    fx.ring(bell, { light: true, quiet: !hand });
    if (hand) fx.pop(bell, '+' + E.fmt(c.total), { hand: true });
    return;
  }
  // play rings in time order (Twin Peal runs two arms at once)
  const times = hopTimes(c.rings);
  const idx = c.rings.map((_, i) => i).sort((x, y) => times[x] - times[y]);
  const rings = idx.map((i) => c.rings[i]);
  const at = idx.map((i) => times[i]);
  live.push({ c, rings, at, i: 0, t: 0, hand, bell, root: bell % 5 });
}

function stepCascades(dt) {
  for (let k = live.length - 1; k >= 0; k--) {
    const L = live[k];
    L.t += dt;
    while (L.i < L.rings.length && L.at[L.i] <= L.t) {
      const r = L.rings[L.i];
      const golden = S.tuning === 'choir' && r.hop % 4 === 3;
      gain(r.value);
      fx.ring(r.bell, { hand: L.hand, golden, dir: r.arm || 1, light: !L.hand && L.rings.length < 4 });
      const pan = (fx.bells[r.bell] ? (fx.bells[r.bell].x / fx.w) * 2 - 1 : 0) * 0.7;
      const vel = L.hand ? 0.75 : Math.max(0.12, 0.34 - S.lv.ringer * 0.006);
      snd.bell(L.root + r.hop, vel, pan, golden, L.hand);
      if (L.hand) fx.pop(r.bell, '+' + E.fmt(r.value), { hand: true, color: golden ? '#c5ff49' : undefined });
      // echo comets toward the next ring(s): hop 0 feeds every arm
      for (let j = L.i + 1; j < L.rings.length; j++) {
        const q = L.rings[j];
        if (q.hop === r.hop + 1 && (r.hop === 0 || q.arm === r.arm)) {
          fx.comet(r.bell, q.bell, q.arm || 1, Math.max(0.04, L.at[j] - L.at[L.i]), L.hand);
          if (r.hop !== 0) break;
        }
      }
      L.i++;
      // the big chain counter belongs to your own taps; long ringer chains show only when you are not tapping
      if (L.hand) { lastHandChain = clock; fx.setChain(L.i, L.i > S.bestChain); }
      else if (L.c.length >= 8 && clock - lastHandChain > 1.5) fx.setChain(L.i, L.i > S.bestChain);
    }
    if (L.i >= L.rings.length) {
      const wasBest = S.bestChain;
      E.recordChain(S, L.c);
      if (L.hand && L.c.length >= 2) J('combo', Math.min(1, L.c.length / 24));
      if (L.hand && L.c.length >= 10 && L.c.length > wasBest) highlight(`chain x${L.c.length}`);
      if (L.c.perfect && L.c.length >= 3) {
        const last = L.rings[L.rings.length - 1].bell;
        if (L.hand) {
          // full fanfare for big peals and the very first one; small ones stay modest so they never spam
          if (S.bells >= 6 || S.perfects <= 1) { fx.perfectPeal(); hitStop = 0.09; buzz([12, 40, 18]); J('shake', 0.6); } else fx.chain.perfect = 1;
          J('reward', Math.min(1, 0.4 + S.bells / 40));
          if (S.bells >= 12) highlight('perfect peal');
          if (S.bells >= 12 && portal()) portal().happytime();
          snd.perfect(L.root + L.c.length);
          fx.pop(last, 'perfect x3', { big: S.bells >= 6, color: '#b59aff' });
        } else if (L.c.length >= 6) {
          fx.pop(last, 'peal x3', { color: '#b59aff' });
        }
      }
      if (!L.hand && L.c.length >= 6) fx.pop(L.rings[L.rings.length - 1].bell, '+' + E.fmt(L.c.total), { color: '#b59aff' });
      live.splice(k, 1);
    }
  }
}

function gain(v) {
  const wasAuto = S.autoUnlocked;
  const wasReady = E.canRecast(S);
  E.earn(S, v);
  recent.push([clock, v]);
  if (!wasAuto && S.autoUnlocked) {
    fx.showBanner('ringers for hire', 'they hit bells so you dont have to');
    snd.unlockChime();
    J('levelup', 0.7);
    buildShop();
  }
  if (!wasReady && E.canRecast(S)) {
    fx.showBanner('the great bell is full', 'tap it to recast', '#c5ff49', 3);
    snd.unlockChime();
    J('levelup', 0.9);
  }
}

// ---------- input ----------
const canvas = $('belfry');
let tapped = S.strikes > 0;
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  snd.unlock();
  const r = canvas.getBoundingClientRect();
  const h = fx.hit(e.clientX - r.left, e.clientY - r.top);
  if (h.great) {
    if (E.canRecast(S)) return openRecast();
    // tapping the Great Bell strikes the nearest bell to the top, so a tap is never wasted
    strike(0, true);
  } else strike(h.bell, true);
  J('hit', 0.5);
  if (!tapped) { tapped = true; fx.hint = null; }
  startRun();
});

function startRun() {
  if (runStarted) return;
  runStarted = true;
  track('level_start', { level: S.recasts + 1, recasts: S.recasts, tuning: S.tuning });
  if (portal()) portal().gameplayStart();
}

window.addEventListener('keydown', (e) => {
  if (document.querySelector('.modal.open')) {
    if (e.key === 'Escape') closeModals();
    return;
  }
  if (e.code === 'Space' && e.target === document.body) {
    e.preventDefault();
    snd.unlock();
    strike(Math.floor(Math.random() * S.bells), true);
    J('hit', 0.5);
    tapped = true; fx.hint = null;
    startRun();
  }
  if (e.key === 'm' || e.key === 'M') toggleMute();
});

function applyMute() { snd.setMuted(S.muted || extMuted); }
function toggleMute() {
  snd.unlock();
  if (extMuted) { extMuted = false; S.muted = false; } else S.muted = !S.muted;
  applyMute();
  drawMuteIcon();
  save();
}
function drawMuteIcon() {
  const off = S.muted || extMuted;
  $('muteBtn').innerHTML = off
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="#9c98ab" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="#f5f3ed" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
  $('muteBtn').setAttribute('aria-label', off ? 'Unmute sound' : 'Mute sound');
}
$('muteBtn').addEventListener('click', toggleMute);

// ---------- shop UI ----------
const ICONS = {
  bell: '<path d="M12 3c-3.5 0-5 2.8-5 6v4.5L5 17h14l-2-3.5V9c0-3.2-1.5-6-5-6z" fill="#e2a24f"/><circle cx="12" cy="19.5" r="1.8" fill="#c98a3e"/>',
  echo: '<path d="M5 12a7 7 0 0 1 7-7M9 12a3 3 0 0 1 3-3" stroke="#b59aff" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M19 12a7 7 0 0 1-7 7" stroke="#b59aff" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".5"/><circle cx="12" cy="12" r="1.8" fill="#fff"/>',
  bronze: '<path d="M4 16l3-7h10l3 7z" fill="#c98a3e"/><path d="M7 9h10l-1-3H8z" fill="#f2c16b"/>',
  cresc: '<path d="M4 18l16-5M4 18l16-11" stroke="#c5ff49" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  ringer: '<circle cx="12" cy="6.5" r="3" fill="#f5f3ed"/><path d="M6 20c0-4 2.5-7 6-7s6 3 6 7z" fill="#9c98ab"/>',
  tempo: '<circle cx="12" cy="13" r="7" stroke="#b59aff" stroke-width="2" fill="none"/><path d="M12 13V9M12 13l3 2M10 3h4" stroke="#b59aff" stroke-width="2" stroke-linecap="round"/>',
  wright: '<path d="M5 19l8-8M14 4l6 6-3 3-6-6z" stroke="#c5ff49" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
};

const itemEls = {};
function buildShop() {
  for (const [boxId, layer] of [['shop1', 1], ['shop2', 2]]) {
    const box = $(boxId);
    box.innerHTML = '';
    for (const it of E.SHOP.filter((x) => x.layer === layer)) {
      const b = document.createElement('button');
      b.className = 'item';
      b.dataset.id = it.id;
      b.innerHTML = `<span class="ic"><svg viewBox="0 0 24 24">${ICONS[it.icon]}</svg></span><b><span>${it.name}</span><span class="cost"></span></b><small></small><i class="fill"></i>`;
      bindHold(b, it.id);
      box.appendChild(b);
      itemEls[it.id] = b;
    }
  }
  $('shop2').hidden = !S.autoUnlocked;
  $('autoLocked').hidden = S.autoUnlocked;
  refreshUI(true);
}

function buy(id) {
  snd.unlock();
  const it = E.shopItem(id);
  if (!it.can(S)) return false;
  const lvlBefore = id === 'bell' ? S.bells : S.lv[id] || 0;
  if (E.tryBuy(S, id)) {
    snd.buy(lvlBefore);
    J('reward', 0.3);
    const el = itemEls[id];
    if (el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); setTimeout(() => el.classList.remove('bump'), 250); }
    if (id === 'bellwright') fx.showBanner('bellwright hired', 'bells now appear. dont ask.');
    S.buys = (S.buys || 0) + 1;
    refreshUI(true);
    return true;
  }
  snd.deny();
  // a buy you cannot afford still answers: the button shakes and says how far off you are
  const el = itemEls[id];
  if (el) { el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); clearTimeout(el.nopeT); el.nopeT = setTimeout(() => el.classList.remove('nope'), 320); }
  toast(`need ${E.fmt(it.cost(S) - S.res)} more resonance. keep hitting.`);
  return false;
}

function bindHold(el, id) {
  let t1 = null, t2 = null, lastDown = -1e9;
  const stop = () => { clearTimeout(t1); clearInterval(t2); t1 = t2 = null; };
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    lastDown = performance.now();
    if (!buy(id)) return;
    t1 = setTimeout(() => { t2 = setInterval(() => { if (!buy(id)) stop(); }, 90); }, 380);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => el.addEventListener(ev, stop));
  el.addEventListener('click', (e) => { if (e.detail === 0 && performance.now() - lastDown > 700) buy(id); }); // keyboard only, never a tap's echo
}

let uiAcc = 0;
function refreshUI(force = false) {
  if (!force && uiAcc < 0.12) return;
  uiAcc = 0;
  $('res').firstChild.nodeValue = E.fmt(S.res);
  // rolling 5 s rate, includes taps
  recent = recent.filter((r) => clock - r[0] < 5);
  const measured = recent.reduce((a, r) => a + r[1], 0) / Math.min(5, Math.max(1, clock));
  const idle = E.incomePerSec(S);
  $('rate').textContent = S.strikes === 0 ? '' : `+${E.fmt(Math.max(measured, idle))}/s`;
  const badges = [];
  if (S.overtones) badges.push(`<span class="badge gold">${S.overtones} overtones +${Math.round(S.overtones * E.CFG.overtoneValue * 100)}%</span>`);
  if (S.tuning !== 'none') badges.push(`<span class="badge echo">${E.TUNINGS[S.tuning].name.toLowerCase()}</span>`);
  if (S.bestChain) badges.push(`<span class="badge">best chain ${S.bestChain}</span>`);
  const bh = badges.join('');
  if ($('badges').innerHTML !== bh) $('badges').innerHTML = bh;
  $('bellsLabel').textContent = `${S.bells} bells · echo ${E.pct(E.echoChance(S))}`;
  // one clear goal at a time, so a new player always knows what the next step is
  let goal;
  const bellCost = E.shopItem('bell').cost(S);
  if (S.strikes === 0) goal = 'goal <b>tap a bell</b>';
  else if ((S.buys || 0) === 0) goal = S.res >= bellCost ? 'goal <b>buy a bell</b>' : `goal <b>a bell</b> · ${E.fmt(bellCost)}`;
  else if (!S.autoUnlocked) goal = `goal <b>ringers</b> · ${Math.floor(Math.min(1, S.runEarned / E.CFG.automationUnlockAt) * 100)}%`;
  else if (!E.canRecast(S)) goal = `goal <b>great bell</b> · ${Math.floor(Math.min(1, S.runEarned / E.recastReq(S)) * 100)}%`;
  else goal = 'goal <b>recast. do it.</b>';
  if ($('goal').innerHTML !== goal) $('goal').innerHTML = goal;
  $('spsLabel').textContent = S.autoUnlocked ? `${(E.strikesPerSec(S)).toFixed(1)} strikes/s` : '';

  let suggested = false;
  for (const it of E.SHOP) {
    const el = itemEls[it.id];
    if (!el) continue;
    const can = it.can(S);
    const cost = can ? it.cost(S) : 0;
    el.querySelector('.cost').textContent = can ? E.fmt(cost) : 'max';
    el.querySelector('small').textContent = it.desc(S);
    el.classList.toggle('max', !can);
    el.classList.toggle('poor', can && S.res < cost);
    el.classList.toggle('ready', can && S.res >= cost);
    el.querySelector('.fill').style.width = can ? Math.min(100, (S.res / cost) * 100) + '%' : '0';
    // first-time nudge: point at the Bell button when it is first affordable
    const sug = !suggested && (S.buys || 0) === 0 && it.id === 'bell' && can && S.res >= cost;
    el.classList.toggle('suggest', sug);
    if (sug) suggested = true;
  }
  $('shop2').hidden = !S.autoUnlocked;
  $('autoLocked').hidden = S.autoUnlocked;
  $('autoBar').style.width = Math.min(100, (S.runEarned / E.CFG.automationUnlockAt) * 100) + '%';
  $('autoNeed').textContent = E.fmt(E.CFG.automationUnlockAt);

  // recast panel shows once ringers exist (or after the first recast)
  const showRecast = S.autoUnlocked || S.recasts > 0;
  $('recastSect').hidden = !showRecast;
  if (showRecast) {
    const req = E.recastReq(S), p = Math.min(1, S.runEarned / req), ready = E.canRecast(S);
    $('recastBar').style.width = p * 100 + '%';
    $('recastBox').classList.toggle('ready', ready);
    $('recastLabel').textContent = Math.floor(p * 100) + '%';
    $('recastText').innerHTML = ready
      ? `recast now for <strong>+${E.overtoneGain(S)} overtones</strong> (+${Math.round(E.CFG.overtoneValue * 100)}% each, forever) and a new tuning. waiting longer gives more. patience is a resource.`
      : `fill the great bell with <strong>${E.fmt(req)}</strong> resonance in one run (${E.fmt(S.runEarned)} so far) to recast: overtones forever, plus a tuning that rewrites the rules.`;
    $('recastBtn').disabled = !ready;
  }
}

// ---------- modals ----------
function openModal(id) { $(id).classList.add('open'); }
function closeModals() {
  for (const m of document.querySelectorAll('.modal.open')) {
    if (m.id === 'awayModal') collectAway();
    m.classList.remove('open');
  }
}

function showAway(sec) {
  if (pendingAway) collectAway(); // never drop an uncollected card
  const g = E.offlineGain(S, sec);
  if (g.gain <= 0) return;
  pendingAway = g;
  $('awayTime').textContent = `you were gone ${E.fmtTime(g.sec)}${g.capped ? ' (ringers rest after 8 hours)' : ''}.`;
  $('awayGain').textContent = '+' + E.fmt(g.gain);
  $('awayRows').innerHTML =
    `<span>ringers on duty <b>${S.lv.ringer}</b></span>` +
    `<span>strikes while away <b>${E.fmt(g.strikes)}</b></span>` +
    `<span>night shift pay <b>${Math.round(E.CFG.offlineEfficiency * 100)}%</b></span>`;
  openModal('awayModal');
}
function collectAway() {
  if (!pendingAway) return;
  const g = pendingAway;
  pendingAway = null;
  gain(g.gain);
  S.strikes += g.strikes;
  for (let i = 0; i < Math.min(S.bells, 8); i++) setTimeout(() => { fx.ring(i, { hand: true }); snd.bell(i, 0.5, 0, true, true); }, i * 70);
  fx.showBanner('+' + E.fmt(g.gain), 'collected', '#c5ff49', 1.8);
  J('reward', 0.8);
  save();
  refreshUI(true);
}
$('awayBtn').addEventListener('click', () => { snd.unlock(); $('awayModal').classList.remove('open'); collectAway(); });

let chosenTuning = null;
function openRecast() {
  if (!E.canRecast(S)) return;
  const next = E.unlockedTunings(S, S.recasts + 1);
  chosenTuning = chosenTuning && next.includes(chosenTuning) ? chosenTuning : next[0];
  $('recastGain').textContent = `+${E.overtoneGain(S)} overtones`;
  const nextOT = S.overtones + E.overtoneGain(S);
  $('recastRows').innerHTML =
    `<span>all resonance <b>x${(1 + nextOT * E.CFG.overtoneValue).toFixed(2)}</b> next run</span>` +
    `<span>this run <b>${E.fmtTime(S.runSec)}</b>, best chain <b>${S.bestChain}</b></span>`;
  const box = $('tunings');
  box.innerHTML = '';
  for (const [k, t] of Object.entries(E.TUNINGS)) {
    if (k === 'none') continue;
    const open = next.includes(k);
    const b = document.createElement('button');
    b.className = 'tuning' + (open ? '' : ' off') + (k === chosenTuning ? ' sel' : '');
    b.innerHTML = `<b>${t.name}${open ? '' : ' · locked'}</b><small>${open ? t.desc : `unlocks on recast #${t.unlockRecasts}.`}</small>`;
    if (open) b.addEventListener('click', () => { chosenTuning = k; snd.unlock(); snd.buy(2); openRecast(); });
    box.appendChild(b);
  }
  openModal('recastModal');
}
$('recastBtn').addEventListener('click', () => { snd.unlock(); openRecast(); });
$('recastCancel').addEventListener('click', () => $('recastModal').classList.remove('open'));
$('recastGo').addEventListener('click', () => {
  const runMsBefore = S.runSec * 1000;
  const g = E.recast(S, chosenTuning);
  $('recastModal').classList.remove('open');
  if (!g) return;
  track('level_end', { level: S.recasts, result: 'win', score: g, ms: Math.round(runMsBefore), recasts: S.recasts, overtones: S.overtones, tuning: S.tuning });
  runStarted = false;
  startRun();
  hitStop = 0.16;
  live.length = 0;
  recent = [];
  snd.gong();
  if (portal()) portal().happytime();
  fx.recastFx();
  J('levelup', 1); J('shake', 1); highlight('recast');
  fx.layout(S.bells);
  fx.showBanner(`recast · +${g} overtones`, `tuning: ${E.TUNINGS[S.tuning].name}`, '#c5ff49', 3);
  buildShop();
  save();
});

$('menuBtn').addEventListener('click', () => {
  snd.unlock();
  $('stats').innerHTML = [
    ['best chain', S.bestChain], ['perfect peals', E.fmt(S.perfects)], ['strikes', E.fmt(S.strikes)],
    ['lifetime resonance', E.fmt(S.totalEarned)], ['recasts', S.recasts], ['overtones', S.overtones],
    ['time spent hitting bells', E.fmtTime(S.playSec)],
  ].map(([k, v]) => `<span>${k} <b>${v}</b></span>`).join('');
  $('saveNote').textContent = store.ok ? 'saves on this device. no account, no cloud.' : 'saving is blocked in this browser. progress dies with the tab.';
  openModal('menuModal');
});
$('menuClose').addEventListener('click', () => $('menuModal').classList.remove('open'));

// ---------- share (copy a brag line; native share where the portal allows it) ----------
function bragLine() {
  const bits = [`best chain ${S.bestChain}`, `${E.fmt(S.perfects)} perfect peals`, `${S.bells} bells`];
  if (S.recasts) bits.push(`${S.recasts} recast${S.recasts > 1 ? 's' : ''}`);
  return `bellchain · ${bits.join(' · ')}\none tap. a hundred bells. computercooked.com/games/bellchain`;
}
function copyText(txt) {
  const fallback = () => {
    const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('copied. paste it somewhere people will judge you.'); } catch (e) { toast(txt); }
    ta.remove();
  };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => toast('copied. paste it somewhere people will judge you.'), fallback);
    else fallback();
  } catch (e) { fallback(); }
}
$('shareBtn').addEventListener('click', () => {
  snd.unlock();
  const txt = bragLine();
  copyText(txt);
});
let resetArm = false, resetArmT = 0;
$('resetBtn').addEventListener('click', () => {
  if (!resetArm) { resetArm = true; $('resetBtn').textContent = 'tap again. it is gone forever.'; clearTimeout(resetArmT); resetArmT = setTimeout(() => { resetArm = false; $('resetBtn').textContent = 'erase save'; }, 2500); return; }
  store.del();
  track('retry', { level: 1, reason: 'erase_save' });
  S = E.newState();
  live.length = 0;
  recent = [];
  fx.layout(S.bells);
  tapped = false;
  fx.hint = { bell: 1, text: 'tap a bell' };
  $('menuModal').classList.remove('open');
  resetArm = false; $('resetBtn').textContent = 'erase save';
  buildShop();
  save();
});

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.h);
  toast.h = setTimeout(() => t.classList.remove('show'), 2400);
}

// ---------- main loop ----------
let last = performance.now();
let ringAcc = 0, wrightAcc = 0, saveAcc = 0;
function frame(now) {
  const raw = (now - last) / 1000;
  last = now;
  const dt = Math.min(0.25, Math.max(0, raw));
  // adaptive quality: slow devices drop background effects, fast ones get them back
  if (raw < 0.25) frameEma += (raw - frameEma) * 0.05;
  if (!fx.lite && frameEma > 0.03) fx.lite = true;
  else if (fx.lite && frameEma < 0.02) fx.lite = false;
  clock += dt;
  S.playSec += dt;
  S.runSec += dt;
  uiAcc += dt;

  // ringers
  ringAcc += E.strikesPerSec(S) * dt;
  let guard = 0;
  while (ringAcc >= 1 && guard++ < 200) {
    ringAcc -= 1;
    strike(Math.floor(Math.random() * S.bells), false);
  }
  // hit-stop: big moments freeze the visuals for a beat (economy time keeps running)
  let vdt = dt;
  if (hitStop > 0) { hitStop -= dt; vdt = dt * 0.1; }
  stepCascades(vdt);

  // bellwright
  wrightAcc += dt;
  if (wrightAcc > 0.6) {
    wrightAcc = 0;
    if (E.autoBuy(S)) { snd.buy(S.bells); refreshUI(true); }
  }

  saveAcc += dt;
  if (saveAcc > 10) { saveAcc = 0; save(); }

  fx.draw(vdt, {
    bells: S.bells, tuning: S.tuning,
    progress: S.runEarned / E.recastReq(S), ready: E.canRecast(S), showGreat: S.autoUnlocked || S.recasts > 0,
  });
  refreshUI();
  requestAnimationFrame(frame);
}

// ---------- away / visibility ----------
function handleReturn() {
  if (!S.lastSeen) return;
  const away = (Date.now() - S.lastSeen) / 1000;
  if (away >= 60) showAway(away);
  else if (away > 2) gain(E.offlineGain(S, away).gain);
}
// pay out chains still in flight, so closing the tab mid-peal never loses Resonance
function flushLive() {
  for (const L of live) {
    for (let j = L.i; j < L.rings.length; j++) gain(L.rings[j].value);
    E.recordChain(S, L.c);
  }
  live.length = 0;
}
// portal gameplay state follows what the player can do: a modal or a hidden tab is a pause
function syncGameplay() {
  const p = portal();
  if (!p || !runStarted) return;
  if (document.hidden || document.querySelector('.modal.open')) p.gameplayStop(); else p.gameplayStart();
}
if (window.MutationObserver) {
  const mo = new MutationObserver(syncGameplay);
  for (const m of document.querySelectorAll('.modal')) mo.observe(m, { attributes: true, attributeFilter: ['class'] });
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { flushLive(); save(); }
  else { handleReturn(); save(); last = performance.now(); }
  syncGameplay();
});
window.addEventListener('pagehide', () => { flushLive(); save(); });
window.addEventListener('resize', () => fx.resize());
if (window.ResizeObserver) new ResizeObserver(() => fx.resize()).observe($('stage'));

// QA persona hint (games/_templates/web/web-game/README.md): Space strikes a bell, M mutes; taps do the rest
// ---------- computer cooked player page: mute and restart from the frame around us ----------
window.addEventListener('message', (e) => {
  const d = e.data;
  if (!d || typeof d !== 'object') return;
  if (d.type === 'cc-mute') { extMuted = !!d.muted; applyMute(); drawMuteIcon(); }
  else if (d.type === 'cc-restart') {
    // an idle game's progress is the whole point, so restart asks before it erases anything
    closeModals();
    $('menuBtn').click();
    resetArm = true;
    $('resetBtn').textContent = 'tap to erase everything';
    clearTimeout(resetArmT);
    resetArmT = setTimeout(() => { resetArm = false; $('resetBtn').textContent = 'erase save'; }, 6000);
    toast('restart = start from zero. tap erase to confirm.');
  }
});

// ---------- boot ----------
track('session_start', { returning: !firstVisit, recasts: S.recasts });
drawMuteIcon();
buildShop();
if (S.strikes === 0) fx.hint = { bell: 1, text: 'tap a bell' };
handleReturn();
if (!store.ok) toast('saving is blocked here. play anyway, live in the moment.');
else if (firstVisit) toast('every hop pays more. more bells, longer chains.');
save();
requestAnimationFrame((t) => { last = t; frame(t); });

// small debug/test surface (used by qa.mjs; harmless for players)
window.bellchain = {
  get state() { return S; },
  E,
  strike: (i) => strike(i, true),
  buy,
  save,
  live: () => live.length,
  fx,
  bellPos: () => {
    const r = canvas.getBoundingClientRect();
    return fx.bells.map((b) => ({ x: r.left + b.x, y: r.top + b.y }));
  },
  greatPos: () => {
    const r = canvas.getBoundingClientRect();
    return { x: r.left + fx.cx, y: r.top + fx.cy };
  },
};
