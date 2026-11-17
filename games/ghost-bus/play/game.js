/* ghost bus · computer cooked games */
(function () {
'use strict';
var L = window.GBL;
var Q = new URLSearchParams(location.search);
var TEST = Q.has('cctest') || (function () { try { return window.parent !== window && new URLSearchParams(parent.location.search).get('cctest') === '1'; } catch (e) { return false; } })(), SHOT = Q.has('shot'), NOSAVE = Q.has('nosave') || SHOT;
var $ = function (id) { return document.getElementById(id); };
var cv = $('cv'), ctx = cv.getContext('2d');

/* ---------------- save ---------------- */
var SAVE_KEY = 'gb-save';
var save = { stars: {}, best: {}, mute: false, daily: {}, seen: {}, plays: 0 };
function loadSave() {
  if (Q.has('fresh')) return;
  try { var s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && typeof s === 'object') for (var k in save) if (k in s) save[k] = s[k]; } catch (e) {}
}
function storeSave() { if (NOSAVE) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
loadSave();

/* ---------------- sound (real CC0 files, small pool) ---------------- */
var FILES = { honk: 'sfx/honk.mp3', board: 'sfx/pop.mp3', drop: 'sfx/ding.mp3', win: 'sfx/tada.mp3', fail: 'sfx/fail.mp3',
  crash: 'sfx/crash.mp3', go: 'sfx/whoosh.mp3', grumpy: 'sfx/ugh.mp3', refuse: 'sfx/bonk.mp3', yay: 'sfx/yay.mp3', wake: 'sfx/gasp.mp3', tick: 'sfx/tick.mp3' };
/* levelled by measurement (ffmpeg ebur128, RMS for clips under 0.4 s): frequent sounds land near -22 to -25 LUFS, big moments near -19 to -20 */
var VOL = { honk: 0.65, board: 0.45, drop: 0.65, win: 1, fail: 0.85, crash: 1, go: 0.6, grumpy: 0.7, refuse: 0.6, yay: 1, wake: 0.55, tick: 0.45 };
var pool = {}, extMuted = false, audioReady = false;
function muted() { return save.mute || extMuted || SHOT; }
function initAudio() {
  if (audioReady) return; audioReady = true;
  for (var k in FILES) { pool[k] = []; var n = (k === 'tick' || k === 'board' || k === 'drop') ? 3 : 2; for (var i = 0; i < n; i++) { var a = new Audio(); a.preload = 'auto'; a.src = FILES[k]; pool[k].push(a); } }
}
var lastPlay = {};
function sfx(k, vol, rate) {
  if (muted() || !audioReady || !pool[k]) return;
  var now = performance.now(); if (lastPlay[k] && now - lastPlay[k] < 45) return; lastPlay[k] = now;
  var list = pool[k], a = null;
  for (var i = 0; i < list.length; i++) if (list[i].paused || list[i].ended) { a = list[i]; break; }
  if (!a) a = list[0];
  try { a.currentTime = 0; a.preservesPitch = false; a.playbackRate = rate || 1; a.volume = Math.max(0, Math.min(1, (vol == null ? 1 : vol) * VOL[k])); var p = a.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
}
function stopAll() { for (var k in pool) pool[k].forEach(function (a) { try { a.pause(); } catch (e) {} }); }
function setMuteIcon() { $('muteWave').style.display = save.mute ? 'none' : ''; $('muteX').style.display = save.mute ? '' : 'none'; }

/* ---------------- analytics (all guarded) ---------------- */
var evCount = 0;
function ccEvent(name, data) { if (evCount >= 18) return; evCount++; try { window.cc && cc.event && cc.event(name, data); } catch (e) {} }
function ccStart() { try { window.cc && cc.start && cc.start(); } catch (e) {} }
function ccEnd(o) { try { window.cc && cc.end && cc.end(o); } catch (e) {} }

/* ---------------- characters & words ---------------- */
var COLORS = ['#7CFFCB', '#FF8AD8', '#FFE066', '#7DD3FF', '#FFA552', '#C3A6FF'];
var TYPES = {
  gary: { name: 'gary', acc: 'cap', board: ['finally.', 'cheers drive.', 'single to the {to}, please.'], drop: ['cheers drive.', 'same time next century?', 'lovely.'] },
  nan: { name: 'nan', acc: 'bun', board: ['ooh, a seat.', 'have you eaten, love?', 'mind the ectoplasm.'], drop: ['thank you, driver.', 'here, have a mint.', 'lovely driving, dear.'] },
  kid: { name: 'victorian child', acc: 'bow', board: ['i have a penny.', 'is this the future?', 'wheeee.'], drop: ['i shall haunt here now.', 'what a marvellous carriage.'] },
  kid2: { name: 'the other victorian child', acc: 'bow2', board: ['i also have a penny.', 'where is the horse?'], drop: ['farewell, carriage-man.', 'smashing.'] },
  lord: { name: 'sir reginald', acc: 'tophat', board: ['first class, i presume.', 'drive on.'], drop: ['you may go.', 'adequate.'] },
  nerd: { name: 'the intern', acc: 'glasses', board: ['is this bus on the spreadsheet?', 'unpaid. even now.'], drop: ['great, i\'m only 80 years late.', 'logging off.'] },
  cat: { name: 'ghost cat', acc: 'ears', board: ['mrrp.', '(sits on two seats)'], drop: ['(knocks a thing off the bus)', 'mrow.'] },
  wife: { name: 'margaret', acc: 'pearls', board: ['is dennis on here?', 'thank you, young man.'], drop: ['tell dennis nothing.', 'lovely. no dennis.'] },
  hus: { name: 'dennis', acc: 'tash', board: ['is she on here?', 'evening, chief.'], drop: ['don\'t tell margaret.', 'peace at last.'] },
  vamp: { name: 'the vampire', acc: 'collar', board: ['good evening.', 'i vant to sit at the back.'], drop: ['i vill haunt you a good review.', 'thank you. bleh.'] },
  chef: { name: 'the garlic chef', acc: 'chefhat', board: ['smell that? garlic.', 'i brought bread.'], drop: ['mwah. perfecto.', 'ciao!'] },
  mime: { name: 'the mime', acc: 'beret', board: ['...', '(pretends to pay)'], drop: ['(silent applause)', '(walks into a glass wall)'] },
  clown: { name: 'the clown', acc: 'nose', board: ['honk honk!', 'want to see a trick?'], drop: ['ta-daaa!', 'tell the mime nothing.'] },
  sleepy: { name: 'sleepy sue', acc: 'nightcap', board: ['five more minutes.', 'is it morning?'], drop: ['back to bed.', 'yawn. thanks.'] },
  sleepy2: { name: 'snoring steve', acc: 'nightcap', board: ['wha? who? oh. hi.', 'i was having a dream about buses.'], drop: ['night night.', 'zzz... thanks.'] }
};
var FULL = ['no seats? i\'m literally transparent.', 'it drove right past me.', 'full?! i\'ve waited 200 years.', 'unbelievable. a full bus. at 3am.'];
var FEUD = ['not with {foe} on there.', 'i\'m not sitting with {foe}.', 'is that {foe}? keep driving.', 'i\'d rather walk. through walls.'];
var ASLEEP = ['zzz...', 'zzzz (honk to wake)', 'snnrrk...'];
var WAKE = ['i\'m up! i\'m up!', 'wha-? the bus!', 'who honked?!'];
var LEFT_WAIT = ['still waiting at {at}. typical.', 'never came. i\'ll tweet about this.', 'we\'re writing a letter to the council.'];
var LEFT_ON = ['still on the bus. lives here now.', 'missed my stop. classic.', 'is this the terminus? it feels like the terminus.'];
var DRIVER_START = ['right. last bus. let\'s go.', 'no standing on the top deck. there is no top deck.', 'exact change only. or ectoplasm.', 'i\'ve driven this route for 200 years. it\'s still confusing.', 'mind the gap. the gap is the afterlife.'];
var DRIVER_WIN = ['everyone home. i\'m going to bed.', 'another flawless shift. well. a shift.', 'that\'s the job. now where\'s my tea.', 'the sun can come up now. i allow it.'];
var DRIVER_PAR = ['shortest route in town. the council should hire me.', 'not a street wasted. my old driving instructor would weep.'];
var pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };
function fill(s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k] || ''; }); }

/* ---------------- game state ---------------- */
var mode = 'map';          // map | plan | drive | end
var cur = null;            // { idx (0-39 or 'daily'), P, A, route, sim }
var drive = null;
var particles = [], floats = [], bubbles = [];
var selGhost = -1, hoverNode = -1;
var levelStart = 0, playStartPerf = 0, endedAnalytics = true, attempts = 0;
var shake = 0, paused = false, intro = 0;
var analyseCache = {};

function lvlLabel(i) { return i === 'daily' ? 'daily' : (Math.floor(i / 10) + 1) + '-' + (i % 10 + 1); }
function starsOf(i) { var m = save.stars[i] | 0; return (m & 1 ? 1 : 0) + (m & 2 ? 1 : 0) + (m & 4 ? 1 : 0); }
function finished(i) { return (save.stars[i] | 0) & 1; }
function playable(i) { return i === 0 || finished(i - 1) || finished(i) || TEST && save.all; }
function totalStars() { var t = 0; for (var i = 0; i < L.LEVELS.length; i++) t += starsOf(i); return t; }
function today() { return L.dayNumber(new Date()); }
function dateLabel() { var d = new Date(); return ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'][d.getMonth()] + ' ' + d.getDate(); }

function loadLevel(i) {
  var def = i === 'daily' ? L.dailyLevel(today()) : L.LEVELS[i];
  var P = L.parse(def);
  var key = i === 'daily' ? 'd' + today() : i;
  var A = analyseCache[key] || (analyseCache[key] = L.analyse(P));
  cur = { idx: i, P: P, A: A, route: [P.depot], sim: null, def: def };
  attempts = 0; selGhost = -1; particles = []; floats = []; bubbles = [];
  resetVis();
  updatePreview();
  mode = 'plan'; drive = null; intro = 1;
  $('mapScr').classList.add('hide'); hideModal();
  $('lvNum').textContent = lvlLabel(i);
  $('lvName').textContent = i === 'daily' ? 'daily: ' + P.name : P.name;
  renderLvStars();
  layout();
  var seenKey = String(i);
  var tip = P.tip;
  if (i === 0 && matchMedia('(pointer:fine)').matches) tip += ' (keys: arrows draw, backspace undoes, enter drives.)';
  if (i === 'daily') tip = 'the daily town (' + dateLabel() + '). same town for everyone today. ' + P.ghosts.length + ' ghosts, ' + P.seats + ' seats.';
  showNote('<b>driver&rsquo;s note:</b> ' + tip, i === 0 && !save.seen[seenKey]);
  save.seen[seenKey] = 1; storeSave();
  /* a play still open (cc-restart mid-level, or a level opened over another) ends unfinished before the new one starts */
  if (!endedAnalytics && levelStart) { endedAnalytics = true; ccEnd({ score: 0, durationMs: Date.now() - levelStart, completed: false }); }
  levelStart = Date.now(); endedAnalytics = false; ccStart(); ccEvent('level_start', { level: lvlLabel(i) });
  if (TEST) window.__gbLast = lvlLabel(i);
}

function resetVis() {
  var P = cur.P;
  cur.vis = P.ghosts.map(function (g, i) { return { mode: 'wait', x: 0, y: 0, face: g.sleepy ? 'sleep' : 'calm', awake: !g.sleepy, ang: 0, jump: 0, shakeT: 0, fade: 1 }; });
  cur.bm = 0; cur.honked = false; cur.collapse = {};
}

function updatePreview() {
  cur.sim = L.simulate(cur.P, cur.route);
  updateMeter();
}

function updateMeter() {
  var len = cur.route.length - 1, A = cur.A;
  $('mLen').textContent = len;
  $('mOf').textContent = '/' + A.dawn + (W > 400 ? ' streets' : '') + ' · ' + cur.P.seats + (cur.P.seats === 1 ? ' seat' : ' seats');
  $('mPar').textContent = 'par ' + A.par;
  $('mFill').style.width = Math.min(100, len / A.dawn * 100) + '%';
  $('mParTick').style.left = 'calc(' + (A.par / A.dawn * 100) + '% - 1.5px)';
  var s = cur.sim;
  $('undoBtn').disabled = len === 0 || mode !== 'plan';
  $('clearBtn').disabled = len === 0 || mode !== 'plan';
  $('goBtn').disabled = (mode === 'plan' && len === 0) || mode === 'end';
  $('goBtn').classList.toggle('pulse', mode === 'plan' && s && s.done);
  $('goBtn').classList.toggle('ff', mode === 'drive');
  $('goBtn').textContent = mode === 'drive' ? 'fast' : 'go';
}

function renderLvStars() {
  var i = cur.idx, m = i === 'daily' ? ((save.daily[today()] || {}).m | 0) : (save.stars[i] | 0);
  var h = ''; for (var b = 1; b <= 4; b <<= 1) h += (m & b) ? '★' : '<i>★</i>';
  $('lvStars').innerHTML = h;
}

/* ---------------- route editing ---------------- */
function routeEnd() { return cur.route[cur.route.length - 1]; }
function canStep(to) { var l = L.legalNext(cur.P, cur.route); for (var i = 0; i < l.length; i++) if (l[i].to === to) return true; return false; }
function pushNode(n, quiet) {
  if (cur.route.length - 1 >= cur.A.dawn) { dawnBlock(); return false; }
  cur.route.push(n); updatePreview(); if (!quiet) sfx('tick', 0.9, 0.85 + Math.min(0.6, cur.route.length * 0.025));
  dismissNote();
  return true;
}
function dawnBlock() { var b = $('mBar'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); toast('the sun\'s coming up. that\'s as far as the bus goes.'); }
function undo() { if (mode !== 'plan' || cur.route.length <= 1) return; cur.route.pop(); updatePreview(); sfx('tick', 0.5); }
function clearRoute() { if (mode !== 'plan') return; cur.route = [cur.P.depot]; updatePreview(); }
/* shortest legal path from the route end to node n (bridges remembered) */
function pathTo(n) {
  var P = cur.P, route = cur.route, start = routeEnd();
  var bm0 = 0; for (var i = 1; i < route.length; i++) { var e = P.edges[L.edgeBetween(P, route[i - 1], route[i])]; if (e.bridge) bm0 |= 1 << e.bi; }
  var prev = {}, q = [[start, bm0]], seen = {}; seen[start + ',' + bm0] = 1;
  while (q.length) {
    var it = q.shift(), u = it[0], bm = it[1];
    if (u === n) { var p = [], k = u + ',' + bm; while (prev[k]) { p.push(+k.split(',')[0]); k = prev[k]; } return p.reverse(); }
    P.adj[u].forEach(function (m) {
      var e = P.edges[m.e]; if (e.bridge && (bm & (1 << e.bi))) return;
      var nb = e.bridge ? bm | (1 << e.bi) : bm, key = m.to + ',' + nb;
      if (!seen[key]) { seen[key] = 1; prev[key] = u + ',' + bm; q.push([m.to, nb]); }
    });
  }
  return null;
}

/* ---------------- layout ---------------- */
var W = 0, H = 0, DPR = 1, cell = 40, ox = 0, oy = 0, T = false, NP = [], CHIP = 46, bgCanvas = null;
function layout() {
  var r = $('stage').getBoundingClientRect();
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = Math.max(200, r.width); H = Math.max(200, r.height);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  if (!cur) return;
  var P = cur.P;
  CHIP = SHOT ? 0 : (H < 380 ? 40 : 48);
  var aw = W - 16, ah = H - CHIP - 12, shotSide = SHOT && W > H * 1.3;
  if (shotSide) aw = W * 0.6;
  var c1 = Math.min(aw / (P.W - 1 + 1.2), ah / (P.H - 1 + 1.2));
  var c2 = Math.min(aw / (P.H - 1 + 1.2), ah / (P.W - 1 + 1.2));
  T = c2 > c1 * 1.12;
  cell = Math.min(T ? c2 : c1, 240);
  var cols = T ? P.H : P.W, rows = T ? P.W : P.H;
  ox = shotSide ? W * 0.38 + (aw - (cols - 1) * cell) / 2 : (W - (cols - 1) * cell) / 2; oy = CHIP + 6 + (ah - (rows - 1) * cell) / 2 + cell * 0.04;
  NP = P.nodes.map(function (n) { return toS(n.x, n.y); });
  buildBg();
}
function toS(x, y) { return T ? { x: ox + y * cell, y: oy + x * cell } : { x: ox + x * cell, y: oy + y * cell }; }

/* ---------------- drawing helpers ---------------- */
function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function hash(a, b) { var h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
var FONT = 'ui-rounded,"SF Pro Rounded","Trebuchet MS",system-ui,sans-serif';

function drawSky(c, w, h, seed) {
  var g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#16123d'); g.addColorStop(0.6, '#0f0d2c'); g.addColorStop(1, '#0b0a1f');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  for (var i = 0; i < 70; i++) { var x = hash(i, seed) * w, y = hash(seed, i + 9) * h, s = hash(i, i + seed) * 1.4 + 0.3; c.globalAlpha = 0.25 + hash(i + 3, seed) * 0.5; c.fillStyle = '#dcd6ff'; c.fillRect(x, y, s, s); }
  c.globalAlpha = 1;
}
function drawMoon(c, x, y, r) {
  var g = c.createRadialGradient(x, y, r * 0.5, x, y, r * 3); g.addColorStop(0, 'rgba(255,240,190,.28)'); g.addColorStop(1, 'rgba(255,240,190,0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 3, 0, 7); c.fill();
  c.fillStyle = '#fff1c4'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  c.fillStyle = 'rgba(200,180,130,.35)'; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.2, r * 0.18, 0, 7); c.arc(x + r * 0.25, y + r * 0.3, r * 0.12, 0, 7); c.fill();
}

function drawBlock(c, x, y, w, h, kind, sd) {
  if (w < 4 || h < 4) return;
  var r = Math.min(w, h) * 0.14;
  if (kind === 'w') {
    c.fillStyle = '#0f3557'; rr(c, x, y, w, h, r); c.fill();
    c.strokeStyle = 'rgba(110,190,255,.35)'; c.lineWidth = Math.max(1, cell * 0.018); c.lineCap = 'round';
    for (var i = 0; i < 3; i++) { var yy = y + h * (0.25 + i * 0.25), xx = x + w * (0.15 + hash(sd, i) * 0.3); c.beginPath(); c.moveTo(xx, yy); c.quadraticCurveTo(xx + w * 0.1, yy - h * 0.06, xx + w * 0.2, yy); c.quadraticCurveTo(xx + w * 0.3, yy + h * 0.06, xx + w * 0.4, yy); c.stroke(); }
    return;
  }
  var ground = { t: '#173a33', g: '#232a45', s: '#2a2152', p: '#2e2340' }[kind] || '#221d48';
  c.fillStyle = ground; rr(c, x, y, w, h, r); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 1; c.stroke();
  var s = Math.min(w, h);
  if (kind === 't') {
    for (i = 0; i < 4; i++) { var tx = x + w * (0.22 + 0.56 * hash(sd, i)), ty = y + h * (0.3 + 0.5 * hash(i, sd)), tr = s * (0.13 + 0.06 * hash(sd + i, 2));
      c.fillStyle = '#0f2a24'; c.beginPath(); c.ellipse(tx, ty + tr * 0.9, tr * 0.8, tr * 0.25, 0, 0, 7); c.fill();
      c.fillStyle = '#1f6b4f'; c.beginPath(); c.arc(tx, ty, tr, 0, 7); c.fill(); c.fillStyle = '#2f8a63'; c.beginPath(); c.arc(tx - tr * 0.3, ty - tr * 0.3, tr * 0.5, 0, 7); c.fill(); }
    return;
  }
  if (kind === 'g') {
    for (i = 0; i < 5; i++) { var gx = x + w * (0.18 + 0.64 * ((i * 0.37 + hash(sd, i) * 0.3) % 1)), gy = y + h * (0.35 + 0.4 * hash(i, sd + 4)), gw = s * 0.11, gh = s * 0.15;
      c.fillStyle = '#5d6290'; rr(c, gx - gw / 2, gy - gh, gw, gh, gw / 2); c.fill(); c.fillStyle = '#8a8fc0'; c.fillRect(gx - gw * 0.08, gy - gh * 0.8, gw * 0.16, gh * 0.45); c.fillRect(gx - gw * 0.25, gy - gh * 0.66, gw * 0.5, gh * 0.12); }
    return;
  }
  /* houses / shops */
  var n = w > h * 1.4 || h > w * 1.4 ? 2 : (s > 70 ? 2 : 1);
  var horiz = w >= h;
  for (i = 0; i < n; i++) {
    var hw = (horiz ? w / n : w) * 0.62, hh = (horiz ? h : h / n) * 0.42;
    hw = Math.min(hw, s * 0.62); hh = Math.min(hh, s * 0.42);
    var cx = horiz ? x + w * (i + 0.5) / n : x + w / 2, cy = (horiz ? y + h * 0.58 : y + h * (i + 0.6) / n);
    var hx = cx - hw / 2, hy = cy - hh / 2;
    var wall = ['#352c66', '#3b2f5e', '#2f3264', '#43305e'][Math.floor(hash(sd, i) * 4)];
    c.fillStyle = wall; c.fillRect(hx, hy, hw, hh);
    if (kind === 's') { var aw2 = hh * 0.22; for (var k = 0; k < 6; k++) { c.fillStyle = k % 2 ? '#ff7aa8' : '#ffe1ec'; c.fillRect(hx + hw * k / 6, hy - aw2 * 0.2, hw / 6 + 0.5, aw2); } }
    else { c.fillStyle = '#5a2f6e'; c.beginPath(); c.moveTo(hx - hw * 0.08, hy); c.lineTo(cx, hy - hh * 0.65); c.lineTo(hx + hw * 1.08, hy); c.closePath(); c.fill(); }
    var wn = 2, lit;
    for (k = 0; k < wn; k++) {
      lit = hash(sd + k, i + 7) > 0.3;
      var wx = hx + hw * (0.2 + k * 0.42), wy = hy + hh * 0.3, ww = hw * 0.2, wh = hh * 0.32;
      if (lit) { c.fillStyle = 'rgba(255,200,90,.25)'; c.fillRect(wx - ww * 0.4, wy - wh * 0.4, ww * 1.8, wh * 1.8); }
      c.fillStyle = lit ? '#ffd36b' : '#1a1636'; c.fillRect(wx, wy, ww, wh);
    }
    if (kind === 'p' || hash(sd, i + 21) > 0.8) { var px = hx + hw * 1.0, py = hy + hh; c.fillStyle = '#ff8a2a'; c.beginPath(); c.ellipse(px, py - s * 0.035, s * 0.055, s * 0.04, 0, 0, 7); c.fill(); c.fillStyle = '#ffe08a'; c.fillRect(px - s * 0.02, py - s * 0.045, s * 0.012, s * 0.01); c.fillRect(px + s * 0.008, py - s * 0.045, s * 0.012, s * 0.01); }
  }
}

function buildBg() {
  var P = cur.P;
  bgCanvas = document.createElement('canvas'); bgCanvas.width = cv.width; bgCanvas.height = cv.height;
  var c = bgCanvas.getContext('2d'); c.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawSky(c, W, H, (P.W * 7 + P.H * 13) | 0);
  var mr = Math.max(10, Math.min(26, cell * 0.22));
  drawMoon(c, W - mr * 1.8, CHIP + mr * 1.6, mr);
  /* ground */
  var a = NP[0], b = NP[P.N - 1];
  var x0 = Math.min(a.x, b.x) - cell * 0.42, y0 = Math.min(a.y, b.y) - cell * 0.42, x1 = Math.max(a.x, b.x) + cell * 0.42, y1 = Math.max(a.y, b.y) + cell * 0.42;
  c.fillStyle = 'rgba(0,0,0,.35)'; rr(c, x0 + 3, y0 + 5, x1 - x0, y1 - y0, cell * 0.25); c.fill();
  c.fillStyle = '#1a1740'; rr(c, x0, y0, x1 - x0, y1 - y0, cell * 0.25); c.fill();
  /* blocks */
  var sw = cell * 0.2, gap = sw * 0.5 + cell * 0.05;
  for (var by = 0; by < P.H - 1; by++) for (var bx = 0; bx < P.W - 1; bx++) {
    var p1 = toS(bx, by), p2 = toS(bx + 1, by + 1);
    var lx = Math.min(p1.x, p2.x) + gap, ly = Math.min(p1.y, p2.y) + gap, w2 = Math.abs(p2.x - p1.x) - gap * 2, h2 = Math.abs(p2.y - p1.y) - gap * 2;
    var k = P.decor[by][bx]; if (k === ' ') k = '.';
    if (k === 'w') { drawBlock(c, lx - gap * 0.9, ly - gap * 0.9, w2 + gap * 1.8, h2 + gap * 1.8, 'w', bx * 31 + by * 7); }
    else drawBlock(c, lx, ly, w2, h2, k, bx * 31 + by * 7 + P.N);
  }
  /* streets */
  c.lineCap = 'round';
  P.edges.forEach(function (e) {
    if (e.bridge) return;
    var A = NP[e.a], B = NP[e.b];
    c.strokeStyle = '#0d0b22'; c.lineWidth = sw + 4; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke();
  });
  P.edges.forEach(function (e) {
    if (e.bridge) return;
    var A = NP[e.a], B = NP[e.b];
    c.strokeStyle = '#3b3772'; c.lineWidth = sw; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke();
  });
  P.edges.forEach(function (e) {
    if (e.bridge) return;
    var A = NP[e.a], B = NP[e.b];
    if (e.from >= 0) {
      var F = e.from === e.a ? A : B, Tt = e.from === e.a ? B : A, dx = Tt.x - F.x, dy = Tt.y - F.y, d = Math.hypot(dx, dy); dx /= d; dy /= d;
      c.strokeStyle = '#ffb347'; c.lineWidth = Math.max(2, cell * 0.04); c.lineJoin = 'round';
      for (var k2 = 0; k2 < 2; k2++) { var m = 0.38 + k2 * 0.24, mx = F.x + (Tt.x - F.x) * m, my = F.y + (Tt.y - F.y) * m, s = sw * 0.32;
        c.beginPath(); c.moveTo(mx - dx * s - dy * s, my - dy * s + dx * s); c.lineTo(mx, my); c.lineTo(mx - dx * s + dy * s, my - dy * s - dx * s); c.stroke(); }
    } else {
      c.strokeStyle = 'rgba(160,155,230,.28)'; c.lineWidth = Math.max(1, cell * 0.014); c.setLineDash([cell * 0.06, cell * 0.08]);
      c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke(); c.setLineDash([]);
    }
  });
  /* intersections */
  P.nodes.forEach(function (n, i) { if (!P.adj[i].length && !isTarget(i)) return; var p = NP[i]; c.fillStyle = '#3b3772'; c.beginPath(); c.arc(p.x, p.y, sw * 0.5, 0, 7); c.fill(); });
  /* place labels */
  var fs = Math.max(9, Math.min(13, cell * 0.15));
  c.font = '700 ' + fs + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
  P.nodes.forEach(function (n, i) {
    if (!n.place) return;
    var p = NP[i], txt = P.placeName[n.place];
    /* labels stay inside their own block (no overlap with a neighbour's): long names wrap to two lines, then shrink */
    var maxw = Math.max(30, cell * 0.94 - 10), lines = [txt], tw = c.measureText(txt).width;
    if (tw > maxw && txt.indexOf(' ') > 0) {
      var w = txt.split(' '), bestL = null, bestW = 1e9;
      for (var cut = 1; cut < w.length; cut++) { var l1 = w.slice(0, cut).join(' '), l2 = w.slice(cut).join(' '), mw = Math.max(c.measureText(l1).width, c.measureText(l2).width); if (mw < bestW) { bestW = mw; bestL = [l1, l2]; } }
      lines = bestL; tw = bestW;
    }
    var f2 = tw > maxw ? Math.max(7, fs * maxw / tw) : fs; c.font = '700 ' + f2 + 'px ' + FONT;
    tw = 0; lines.forEach(function (l) { tw = Math.max(tw, c.measureText(l).width); });
    var lh = f2 * 1.12, ly = p.y + sw * 0.55 + f2 * 1.1;
    c.fillStyle = 'rgba(10,8,30,.82)'; rr(c, p.x - tw / 2 - 5, ly - f2 * 0.7, tw + 10, f2 * 1.4 + lh * (lines.length - 1), f2 * 0.5); c.fill();
    c.fillStyle = '#d9d3ff'; lines.forEach(function (l, li) { c.fillText(l, p.x, ly + 0.5 + li * lh); });
    c.font = '700 ' + fs + 'px ' + FONT;
  });
  /* depot */
  var d = NP[P.depot]; c.font = '800 ' + Math.max(8, fs * 0.85) + 'px ' + FONT;
  c.fillStyle = 'rgba(255,216,77,.9)'; var dw = c.measureText('depot').width + 8; rr(c, d.x - dw / 2, d.y + sw * 0.5 + 2, dw, fs * 1.25, 5); c.fill();
  c.fillStyle = '#2a1a00'; c.fillText('depot', d.x, d.y + sw * 0.5 + 2 + fs * 0.65);
}
function isTarget(i) { var n = cur.P.nodes[i]; return n.place || cur.P.depot === i || cur.P.isHorn[i]; }

/* ghost */
function drawGhost(c, x, y, r, col, type, face, t, alpha, opt) {
  opt = opt || {};
  c.save(); c.globalAlpha = alpha == null ? 1 : alpha;
  if (!opt.noGlow) { var g = c.createRadialGradient(x, y, r * 0.3, x, y, r * 2.1); g.addColorStop(0, hexA(col, 0.45)); g.addColorStop(1, hexA(col, 0)); c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 2.1, 0, 7); c.fill(); }
  c.fillStyle = col;
  c.beginPath(); c.moveTo(x - r, y + r * 0.85); c.lineTo(x - r, y - r * 0.15); c.arc(x, y - r * 0.15, r, Math.PI, 0); c.lineTo(x + r, y + r * 0.85);
  var bumps = 3; for (var i = bumps; i > 0; i--) { var bx = x - r + (2 * r) * (i - 0.5) / bumps, wob = Math.sin(t * 5 + i * 2) * r * 0.08; c.quadraticCurveTo(bx + r / bumps * 0.5, y + r * 1.15 + wob, bx, y + r * 0.9); c.quadraticCurveTo(bx - r / bumps * 0.5, y + r * 0.7, x - r + (2 * r) * (i - 1) / bumps, y + r * 0.88); }
  c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(x - r * 0.45, y - r * 0.6, r * 0.22, r * 0.14, -0.6, 0, 7); c.fill();
  /* face */
  var ex = r * 0.36, ey = y - r * 0.18, ink = '#1b1433';
  c.fillStyle = ink; c.strokeStyle = ink; c.lineWidth = Math.max(1.2, r * 0.11); c.lineCap = 'round';
  if (face === 'sleep') { for (var s = -1; s <= 1; s += 2) { c.beginPath(); c.arc(x + s * ex, ey, r * 0.13, 0.1, Math.PI - 0.1); c.stroke(); } }
  else if (face === 'grumpy') {
    for (s = -1; s <= 1; s += 2) { c.beginPath(); c.ellipse(x + s * ex, ey + r * 0.04, r * 0.11, r * 0.13, 0, 0, 7); c.fill(); c.beginPath(); c.moveTo(x + s * ex * 1.5, ey - r * 0.28); c.lineTo(x + s * ex * 0.4, ey - r * 0.14); c.stroke(); }
  } else { for (s = -1; s <= 1; s += 2) { c.beginPath(); c.ellipse(x + s * ex, ey, r * 0.11, r * (face === 'wow' ? 0.17 : 0.15), 0, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x + s * ex + r * 0.04, ey - r * 0.05, r * 0.04, 0, 7); c.fill(); c.fillStyle = ink; } }
  var my = y + r * 0.22;
  if (face === 'happy') { c.beginPath(); c.arc(x, my - r * 0.08, r * 0.22, 0.15, Math.PI - 0.15); c.stroke(); }
  else if (face === 'grumpy') { c.beginPath(); c.arc(x, my + r * 0.14, r * 0.18, Math.PI + 0.3, -0.3); c.stroke(); }
  else if (face === 'wow') { c.beginPath(); c.ellipse(x, my, r * 0.1, r * 0.13, 0, 0, 7); c.fill(); }
  else if (face === 'sleep') { c.beginPath(); c.ellipse(x, my, r * 0.07, r * 0.05, 0, 0, 7); c.fill(); }
  else { c.beginPath(); c.moveTo(x - r * 0.1, my); c.quadraticCurveTo(x, my + r * 0.07, x + r * 0.1, my); c.stroke(); }
  c.fillStyle = 'rgba(255,120,160,.35)'; c.beginPath(); c.arc(x - r * 0.62, my - r * 0.05, r * 0.12, 0, 7); c.arc(x + r * 0.62, my - r * 0.05, r * 0.12, 0, 7); c.fill();
  drawAcc(c, x, y, r, type, col);
  c.restore();
}
function drawAcc(c, x, y, r, type, col) {
  if (type === 'none') return;
  var acc = (TYPES[type] || TYPES.gary).acc, top = y - r * 1.12;
  c.lineCap = 'round'; c.lineJoin = 'round';
  if (acc === 'cap') { c.fillStyle = '#ff5d73'; c.beginPath(); c.arc(x, top + r * 0.32, r * 0.62, Math.PI, 0); c.fill(); c.fillRect(x, top + r * 0.22, r * 0.85, r * 0.12); }
  else if (acc === 'bun') { c.fillStyle = '#e8e8f4'; c.beginPath(); c.arc(x, top + r * 0.02, r * 0.3, 0, 7); c.fill(); c.strokeStyle = '#8a7dd0'; c.lineWidth = r * 0.07; c.beginPath(); c.arc(x - r * 0.36, y - r * 0.18, r * 0.19, 0, 7); c.arc(x + r * 0.36, y - r * 0.18, r * 0.19, 0, 7); c.stroke(); c.beginPath(); c.moveTo(x - r * 0.17, y - r * 0.18); c.lineTo(x + r * 0.17, y - r * 0.18); c.stroke(); }
  else if (acc === 'bow' || acc === 'bow2') { c.fillStyle = acc === 'bow' ? '#ff4f8b' : '#4fa3ff'; var bx = x + r * 0.45, by = top + r * 0.3; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx - r * 0.38, by - r * 0.22); c.lineTo(bx - r * 0.38, by + r * 0.22); c.closePath(); c.moveTo(bx, by); c.lineTo(bx + r * 0.38, by - r * 0.22); c.lineTo(bx + r * 0.38, by + r * 0.22); c.closePath(); c.fill(); c.beginPath(); c.arc(bx, by, r * 0.1, 0, 7); c.fill(); }
  else if (acc === 'tophat') { c.fillStyle = '#1d1838'; c.fillRect(x - r * 0.38, top - r * 0.55, r * 0.76, r * 0.75); c.fillRect(x - r * 0.62, top + r * 0.12, r * 1.24, r * 0.14); c.fillStyle = '#c94a6a'; c.fillRect(x - r * 0.38, top - r * 0.05, r * 0.76, r * 0.12); c.strokeStyle = '#ffd84d'; c.lineWidth = r * 0.06; c.beginPath(); c.arc(x + r * 0.36, y - r * 0.18, r * 0.18, 0, 7); c.stroke(); }
  else if (acc === 'glasses') { c.strokeStyle = '#1b1433'; c.lineWidth = r * 0.08; c.strokeRect(x - r * 0.58, y - r * 0.33, r * 0.42, r * 0.3); c.strokeRect(x + r * 0.16, y - r * 0.33, r * 0.42, r * 0.3); c.beginPath(); c.moveTo(x - r * 0.16, y - r * 0.2); c.lineTo(x + r * 0.16, y - r * 0.2); c.stroke(); c.fillStyle = '#5b8cff'; c.fillRect(x - r * 0.08, y + r * 0.45, r * 0.16, r * 0.42); }
  else if (acc === 'ears') { c.fillStyle = col; c.beginPath(); c.moveTo(x - r * 0.85, top + r * 0.6); c.lineTo(x - r * 0.62, top - r * 0.12); c.lineTo(x - r * 0.25, top + r * 0.28); c.moveTo(x + r * 0.85, top + r * 0.6); c.lineTo(x + r * 0.62, top - r * 0.12); c.lineTo(x + r * 0.25, top + r * 0.28); c.fill(); c.strokeStyle = 'rgba(30,20,50,.6)'; c.lineWidth = r * 0.05; c.beginPath(); c.moveTo(x - r * 0.75, y + r * 0.15); c.lineTo(x - r * 1.15, y + r * 0.08); c.moveTo(x + r * 0.75, y + r * 0.15); c.lineTo(x + r * 1.15, y + r * 0.08); c.stroke(); }
  else if (acc === 'pearls') { c.fillStyle = '#fff'; for (var i = 0; i < 7; i++) { var a = Math.PI * (0.2 + i * 0.1); c.beginPath(); c.arc(x + Math.cos(a) * r * 0.62, y + r * 0.2 + Math.sin(a) * r * 0.42, r * 0.07, 0, 7); c.fill(); } c.fillStyle = '#b48cff'; c.beginPath(); c.ellipse(x, top + r * 0.18, r * 0.62, r * 0.22, 0, Math.PI, 0); c.fill(); }
  else if (acc === 'tash') { c.fillStyle = '#5a3a2a'; c.beginPath(); c.ellipse(x - r * 0.17, y + r * 0.08, r * 0.2, r * 0.08, 0.2, 0, 7); c.ellipse(x + r * 0.17, y + r * 0.08, r * 0.2, r * 0.08, -0.2, 0, 7); c.fill(); c.fillStyle = '#6a6a8a'; c.beginPath(); c.arc(x, top + r * 0.3, r * 0.55, Math.PI, 0); c.fill(); }
  else if (acc === 'collar') { c.fillStyle = '#b3123a'; c.beginPath(); c.moveTo(x - r * 1.05, y + r * 0.1); c.lineTo(x - r * 1.35, y - r * 0.75); c.lineTo(x - r * 0.55, y + r * 0.25); c.closePath(); c.moveTo(x + r * 1.05, y + r * 0.1); c.lineTo(x + r * 1.35, y - r * 0.75); c.lineTo(x + r * 0.55, y + r * 0.25); c.closePath(); c.fill(); c.fillStyle = '#1b1433'; c.beginPath(); c.moveTo(x - r * 0.35, top + r * 0.12); c.lineTo(x, top + r * 0.45); c.lineTo(x + r * 0.35, top + r * 0.12); c.closePath(); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - r * 0.12, y + r * 0.27); c.lineTo(x - r * 0.07, y + r * 0.42); c.lineTo(x - r * 0.02, y + r * 0.27); c.moveTo(x + r * 0.02, y + r * 0.27); c.lineTo(x + r * 0.07, y + r * 0.42); c.lineTo(x + r * 0.12, y + r * 0.27); c.fill(); }
  else if (acc === 'chefhat') { c.fillStyle = '#fff'; c.fillRect(x - r * 0.45, top - r * 0.05, r * 0.9, r * 0.38); c.beginPath(); c.arc(x - r * 0.3, top - r * 0.12, r * 0.28, 0, 7); c.arc(x + r * 0.3, top - r * 0.12, r * 0.28, 0, 7); c.arc(x, top - r * 0.32, r * 0.3, 0, 7); c.fill(); c.fillStyle = '#f2ead0'; c.beginPath(); c.ellipse(x + r * 0.95, y + r * 0.35, r * 0.2, r * 0.17, 0, 0, 7); c.fill(); }
  else if (acc === 'beret') { c.fillStyle = '#1d1838'; c.beginPath(); c.ellipse(x - r * 0.1, top + r * 0.18, r * 0.66, r * 0.24, -0.2, 0, 7); c.fill(); c.fillRect(x - r * 0.06, top - r * 0.14, r * 0.08, r * 0.14); c.fillStyle = 'rgba(255,255,255,.9)'; c.fillRect(x - r * 0.98, y + r * 0.35, r * 1.96, r * 0.1); c.fillStyle = 'rgba(30,20,60,.7)'; c.fillRect(x - r * 0.98, y + r * 0.5, r * 1.96, r * 0.1); }
  else if (acc === 'nose') { c.fillStyle = '#ff2e4d'; c.beginPath(); c.arc(x, y + r * 0.02, r * 0.17, 0, 7); c.fill(); c.fillStyle = '#ffa52b'; c.beginPath(); c.arc(x - r * 0.75, top + r * 0.3, r * 0.3, 0, 7); c.arc(x + r * 0.75, top + r * 0.3, r * 0.3, 0, 7); c.fill(); }
  else if (acc === 'nightcap') { c.fillStyle = '#5b6cff'; c.beginPath(); c.moveTo(x - r * 0.7, top + r * 0.38); c.quadraticCurveTo(x, top - r * 0.45, x + r * 1.05, top + r * 0.55); c.lineTo(x + r * 0.7, top + r * 0.38); c.closePath(); c.fill(); c.fillStyle = '#fff'; c.fillRect(x - r * 0.72, top + r * 0.3, r * 1.44, r * 0.16); c.beginPath(); c.arc(x + r * 1.08, top + r * 0.6, r * 0.14, 0, 7); c.fill(); }
}
function hexA(h, a) { var n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }

/* bus (side view, faces left or right) */
function drawBus(c, x, y, s, face, riders, t, honk, beam, sq) {
  var w = s * 1.5, h = s * 0.78; sq = sq || 0;
  c.save(); c.translate(x, y + Math.sin(t * 14) * s * 0.012 + sq * h * 0.08); c.scale(face * (1 + sq * 0.1), 1 - sq * 0.12);
  if (beam) { var g = c.createLinearGradient(w * 0.45, 0, w * 1.6, 0); g.addColorStop(0, 'rgba(255,244,190,.5)'); g.addColorStop(1, 'rgba(255,244,190,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(w * 0.48, h * 0.12); c.lineTo(w * 1.6, -h * 0.25); c.lineTo(w * 1.6, h * 0.75); c.closePath(); c.fill(); }
  c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(0, h * 0.55, w * 0.55, h * 0.1, 0, 0, 7); c.fill();
  c.fillStyle = '#e8941a'; rr(c, -w / 2, -h / 2, w, h, s * 0.16); c.fill();
  c.fillStyle = '#ffc93c'; rr(c, -w / 2, -h / 2, w, h * 0.78, s * 0.16); c.fill();
  c.fillStyle = '#fff2b0'; c.fillRect(-w / 2 + s * 0.1, -h / 2 + h * 0.06, w - s * 0.25, h * 0.05);
  /* windows: seats + driver */
  var n = riders.length, ww = (w * 0.74) / Math.max(n, 1), wy = -h * 0.36, wh = h * 0.4;
  for (var i = 0; i < n; i++) {
    var wx = -w * 0.47 + i * ww + ww * 0.08;
    c.fillStyle = '#20305f'; rr(c, wx, wy, ww * 0.84, wh, s * 0.06); c.fill();
    if (riders[i]) { c.save(); c.beginPath(); rr(c, wx, wy, ww * 0.84, wh, s * 0.06); c.clip(); drawGhost(c, wx + ww * 0.42, wy + wh * 0.62, Math.min(ww, wh) * 0.36, riders[i].col, riders[i].type, riders[i].face || 'happy', t + i, 1, { noGlow: true }); c.restore(); }
    c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(wx + ww * 0.08, wy + wh * 0.1, ww * 0.12, wh * 0.5);
  }
  /* windscreen + driver */
  var dx = w * 0.3; c.fillStyle = '#2b3f78'; rr(c, dx, wy, w * 0.17, wh * 1.1, s * 0.06); c.fill();
  c.fillStyle = '#d7ffe9'; c.beginPath(); c.arc(dx + w * 0.07, wy + wh * 0.62, wh * 0.24, 0, 7); c.fill();
  c.fillStyle = '#1d1838'; c.fillRect(dx + w * 0.02, wy + wh * 0.3, wh * 0.5, wh * 0.12);
  /* lights */
  c.fillStyle = '#fff7cf'; c.beginPath(); c.arc(w * 0.47, h * 0.12, s * 0.07, 0, 7); c.fill();
  c.fillStyle = '#ff4f5e'; c.fillRect(-w / 2, h * 0.02, s * 0.06, s * 0.12);
  /* sign */
  c.fillStyle = '#1d1838'; rr(c, -w * 0.1, -h / 2 - s * 0.16, w * 0.4, s * 0.17, s * 0.04); c.fill();
  c.fillStyle = '#7CFFCB'; c.font = '800 ' + (s * 0.12) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.save(); c.scale(face, 1); c.fillText('N° 13', face * (w * 0.1), -h / 2 - s * 0.075); c.restore();
  /* wheels */
  for (i = -1; i <= 1; i += 2) { var whx = i * w * 0.3, why = h * 0.45; c.fillStyle = '#15122e'; c.beginPath(); c.arc(whx, why, s * 0.15, 0, 7); c.fill(); c.fillStyle = '#8a86b5'; c.beginPath(); c.arc(whx, why, s * 0.06, 0, 7); c.fill();
    c.strokeStyle = '#8a86b5'; c.lineWidth = s * 0.025; var a = t * 9; c.beginPath(); c.moveTo(whx + Math.cos(a) * s * 0.11, why + Math.sin(a) * s * 0.11); c.lineTo(whx - Math.cos(a) * s * 0.11, why - Math.sin(a) * s * 0.11); c.stroke(); }
  if (honk > 0) { c.strokeStyle = 'rgba(255,216,77,' + honk + ')'; c.lineWidth = s * 0.05; for (i = 1; i <= 3; i++) { c.beginPath(); c.arc(w * 0.5, 0, s * 0.2 * i + (1 - honk) * s * 0.4, -0.7, 0.7); c.stroke(); } }
  c.restore();
}

function drawHorn(c, x, y, r, used, t) {
  c.save();
  var pulse = used ? 0 : 0.5 + 0.5 * Math.sin(t * 4);
  c.fillStyle = 'rgba(255,216,77,' + (0.15 + pulse * 0.2) + ')'; c.beginPath(); c.arc(x, y, r * 1.5, 0, 7); c.fill();
  c.fillStyle = used ? '#6c6440' : '#ffd84d'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  c.fillStyle = '#2a1a00'; c.beginPath(); c.moveTo(x - r * 0.55, y - r * 0.18); c.lineTo(x - r * 0.1, y - r * 0.18); c.lineTo(x + r * 0.5, y - r * 0.55); c.lineTo(x + r * 0.5, y + r * 0.55); c.lineTo(x - r * 0.1, y + r * 0.18); c.lineTo(x - r * 0.55, y + r * 0.18); c.closePath(); c.fill();
  c.restore();
}

function drawBubble(c, x, y, text, alpha, col) {
  var fs = Math.max(11, Math.min(14, cell * 0.16));
  c.save(); c.globalAlpha = alpha; c.font = '700 ' + fs + 'px ' + FONT;
  var maxW = Math.min(W * 0.6, 190), words = text.split(' '), lines = [], line = '';
  words.forEach(function (wd) { var t2 = line ? line + ' ' + wd : wd; if (c.measureText(t2).width > maxW && line) { lines.push(line); line = wd; } else line = t2; });
  lines.push(line);
  var bw = Math.max.apply(null, lines.map(function (l) { return c.measureText(l).width; })) + 16, bh = lines.length * fs * 1.25 + 10;
  var bx = Math.max(4, Math.min(W - bw - 4, x - bw / 2)), by = Math.max(CHIP + 2, y - bh - 10);
  c.fillStyle = '#fbf8ff'; rr(c, bx, by, bw, bh, 9); c.fill();
  c.strokeStyle = col || '#1b1433'; c.lineWidth = 2; c.stroke();
  var tx = Math.max(bx + 10, Math.min(bx + bw - 10, x));
  if (by + bh < y) { c.fillStyle = '#fbf8ff'; c.beginPath(); c.moveTo(tx - 6, by + bh - 1); c.lineTo(tx, by + bh + 7); c.lineTo(tx + 6, by + bh - 1); c.fill(); }
  c.fillStyle = '#1b1433'; c.textAlign = 'center'; c.textBaseline = 'top';
  lines.forEach(function (l, i) { c.fillText(l, bx + bw / 2, by + 6 + i * fs * 1.25); });
  c.restore();
}

/* ---------------- frame ---------------- */
var tNow = 0, lastT = 0;
function ghostHome(i) { /* waiting position for ghost i */
  var P = cur.P, g = P.ghosts[i], p = NP[g.from];
  var same = []; P.ghosts.forEach(function (h, j) { if (h.from === g.from) same.push(j); });
  var k = same.indexOf(i), off = (k - (same.length - 1) / 2) * cell * 0.36;
  return { x: p.x - cell * 0.26 + off, y: p.y - cell * 0.33 };
}
function destPos(i) {
  var P = cur.P, g = P.ghosts[i], p = NP[g.to];
  var same = []; P.ghosts.forEach(function (h, j) { if (h.to === g.to) same.push(j); });
  var k = same.indexOf(i), off = (k - (same.length - 1) / 2) * cell * 0.22;
  return { x: p.x + cell * 0.24 + off, y: p.y - cell * 0.2 };
}

function frame(ts) {
  requestAnimationFrame(frame);
  var dt = Math.min(0.1, Math.max(0, (ts - (lastT || ts)) / 1000)); lastT = ts;
  if (mode === 'map') { if (!$('mapScr').classList.contains('hide')) { tNow += dt; drawWorld(dt); } return; }
  if (paused || !cur || !bgCanvas) return;
  tNow += dt;
  if (mode === 'drive') stepDrive(dt);
  intro = Math.max(0, intro - dt * 0.8);
  shake = Math.max(0, shake - dt * 3);
  draw(dt);
}

function draw(dt) {
  var P = cur.P, c = ctx, t = tNow;
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  var sx = shake ? (Math.random() - 0.5) * shake * 10 : 0, sy = shake ? (Math.random() - 0.5) * shake * 10 : 0;
  c.save(); c.setTransform(1, 0, 0, 1, sx * DPR, sy * DPR); c.drawImage(bgCanvas, 0, 0); c.restore();
  c.setTransform(DPR, 0, 0, DPR, sx * DPR, sy * DPR);
  /* twinkles */
  for (var i = 0; i < 8; i++) { var tx = hash(i, 77) * W, ty = hash(77, i) * H * 0.9, a = 0.5 + 0.5 * Math.sin(t * (1 + i * 0.3) + i); c.fillStyle = 'rgba(230,225,255,' + a * 0.8 + ')'; c.fillRect(tx, ty, 2, 2); }
  var sw = cell * 0.2;
  /* rickety bridges */
  P.edges.forEach(function (e, ei) {
    if (!e.bridge) return;
    var A = NP[e.a], B = NP[e.b], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
    var col = cur.collapse[ei];
    if (col != null && col > 1.2) { /* gone: a few floating planks */
      c.fillStyle = 'rgba(139,90,43,.6)'; for (var k = 0; k < 3; k++) { var f = 0.3 + k * 0.2, bob = Math.sin(t * 2 + k) * 2; c.save(); c.translate(A.x + dx * f + nx * (k - 1) * 6, A.y + dy * f + ny * (k - 1) * 6 + bob); c.rotate(k); c.fillRect(-sw * 0.3, -sw * 0.08, sw * 0.6, sw * 0.16); c.restore(); }
      return;
    }
    var drop = col != null ? col : 0;
    var planks = Math.max(4, Math.round(d / (sw * 0.45)));
    for (k = 0; k < planks; k++) {
      var f2 = (k + 0.5) / planks, px = A.x + dx * f2, py = A.y + dy * f2, fall = drop > 0 ? Math.max(0, drop * 60 - k * 4) : 0;
      c.save(); c.globalAlpha = Math.max(0, 1 - fall / 50); c.translate(px, py + fall); c.rotate(Math.atan2(dy, dx) + Math.PI / 2 + (fall ? (k % 2 ? 0.4 : -0.4) * fall / 30 : 0));
      c.fillStyle = k % 2 ? '#9a6435' : '#8a5a2b'; c.fillRect(-sw * 0.62, -d / planks * 0.4, sw * 1.24, d / planks * 0.8); c.restore();
    }
    if (!drop) { c.strokeStyle = '#5e3a1a'; c.lineWidth = Math.max(1.5, cell * 0.025); for (k = -1; k <= 1; k += 2) { c.beginPath(); c.moveTo(A.x + nx * sw * 0.6 * k, A.y + ny * sw * 0.6 * k); c.lineTo(B.x + nx * sw * 0.6 * k, B.y + ny * sw * 0.6 * k); c.stroke(); }
      var mx = (A.x + B.x) / 2 + nx * sw * 0.95, my = (A.y + B.y) / 2 + ny * sw * 0.95; c.fillStyle = '#ff6b6b'; c.font = '800 ' + Math.max(9, cell * 0.12) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('×1', mx, my); }
  });
  /* horns */
  for (i = 0; i < P.N; i++) if (P.isHorn[i]) drawHorn(c, NP[i].x, NP[i].y, cell * 0.15, mode === 'drive' && cur.honked, t);
  /* route */
  var R = mode === 'drive' || mode === 'end' ? drive.route : cur.route;
  if (R.length > 1) {
    var upto = R.length - 1, partial = 1;
    if (mode === 'drive') { upto = drive.i; partial = drive.t; }
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = 'rgba(94,242,255,.18)'; c.lineWidth = sw * 1.25; strokeRoute(c, R, R.length - 1, 1);
    c.strokeStyle = mode === 'plan' ? 'rgba(94,242,255,.9)' : 'rgba(94,242,255,.35)'; c.lineWidth = sw * 0.42; strokeRoute(c, R, R.length - 1, 1);
    if (mode !== 'plan') { c.strokeStyle = '#5ef2ff'; c.lineWidth = sw * 0.42; strokeRoute(c, R, upto, partial); }
    /* chevrons */
    c.fillStyle = '#0d2b40';
    for (i = 1; i < R.length; i++) {
      var A2 = NP[R[i - 1]], B2 = NP[R[i]], ddx = B2.x - A2.x, ddy = B2.y - A2.y, dd = Math.hypot(ddx, ddy); if (!dd) continue; ddx /= dd; ddy /= dd;
      var m2 = 0.5, cx = A2.x + (B2.x - A2.x) * m2, cy = A2.y + (B2.y - A2.y) * m2, s2 = sw * 0.17;
      c.beginPath(); c.moveTo(cx + ddx * s2, cy + ddy * s2); c.lineTo(cx - ddx * s2 - ddy * s2, cy - ddy * s2 + ddx * s2); c.lineTo(cx - ddx * s2 + ddy * s2, cy - ddy * s2 - ddx * s2); c.closePath(); c.fill();
    }
  }
  /* first route: a finger shows the drag */
  if (mode === 'plan' && cur.idx === 0 && cur.route.length === 1 && cur.A.route) {
    var FR = cur.A.route, seg = (t * 1.4) % (FR.length + 1), si = Math.min(FR.length - 1, Math.floor(seg)), sf = seg - Math.floor(seg);
    var fa = NP[FR[si]], fb = NP[FR[Math.min(si + 1, FR.length - 1)]], fx = fa.x + (fb.x - fa.x) * sf, fy = fa.y + (fb.y - fa.y) * sf;
    c.strokeStyle = 'rgba(94,242,255,.35)'; c.lineWidth = sw * 0.3; c.setLineDash([sw * 0.3, sw * 0.4]); c.beginPath(); c.moveTo(NP[FR[0]].x, NP[FR[0]].y); for (i = 1; i < FR.length; i++) c.lineTo(NP[FR[i]].x, NP[FR[i]].y); c.stroke(); c.setLineDash([]);
    c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(fx + sw * 0.35, fy + sw * 0.5, sw * 0.42, 0, 7); c.fill();
    c.strokeStyle = '#120f2e'; c.lineWidth = 2; c.stroke();
  }
  /* next moves */
  if (mode === 'plan') {
    var end = NP[routeEnd()], pr = 0.5 + 0.5 * Math.sin(t * 5);
    c.strokeStyle = '#5ef2ff'; c.lineWidth = 2.5; c.beginPath(); c.arc(end.x, end.y, sw * (0.62 + pr * 0.12), 0, 7); c.stroke();
    if (cur.route.length - 1 < cur.A.dawn) L.legalNext(P, cur.route).forEach(function (m) { var p = NP[m.to]; c.fillStyle = 'rgba(94,242,255,' + (0.35 + pr * 0.35) + ')'; c.beginPath(); c.arc(p.x, p.y, sw * 0.26, 0, 7); c.fill(); });
  }
  /* where things happen along the drawn route */
  if (mode === 'plan' && cur.sim && cur.route.length > 1) {
    var marks = {};
    cur.sim.steps.forEach(function (evs, k) { evs.forEach(function (ev) { if (ev.g == null || ev.t === 'asleep') return; var nd = cur.route[k]; (marks[nd] = marks[nd] || []).push(ev); }); });
    var br = Math.max(6, cell * 0.075);
    for (var mn in marks) {
      var mp = NP[mn], list = marks[mn];
      list.forEach(function (ev, k) {
        var bx = mp.x - (list.length - 1) * br * 1.1 + k * br * 2.2, by = mp.y + sw * 0.05, col = COLORS[ev.g % COLORS.length], bad = ev.t === 'full' || ev.t === 'feud';
        c.fillStyle = bad ? '#ff3b5c' : col; c.beginPath(); c.arc(bx, by, br, 0, 7); c.fill();
        c.strokeStyle = '#120f2e'; c.lineWidth = Math.max(1.6, br * 0.28); c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
        if (ev.t === 'board') { c.moveTo(bx - br * 0.45, by + br * 0.15); c.lineTo(bx, by - br * 0.35); c.lineTo(bx + br * 0.45, by + br * 0.15); }
        else if (ev.t === 'drop') { c.moveTo(bx - br * 0.45, by); c.lineTo(bx - br * 0.1, by + br * 0.38); c.lineTo(bx + br * 0.5, by - br * 0.35); }
        else { c.moveTo(bx, by - br * 0.5); c.lineTo(bx, by + br * 0.1); c.moveTo(bx, by + br * 0.45); c.lineTo(bx, by + br * 0.46); c.strokeStyle = '#fff'; }
        c.stroke();
        if (bad) { c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.arc(bx, by, br + 1.5, 0, 7); c.stroke(); }
      });
    }
  }
  /* destination pins */
  var vis = cur.vis;
  P.ghosts.forEach(function (g, gi) {
    if (vis[gi].mode === 'home' || vis[gi].mode === 'gone') return;
    var d = destPos(gi), col = COLORS[gi % COLORS.length], hl = selGhost === gi;
    var np2 = NP[g.to];
    c.strokeStyle = col; c.lineWidth = hl ? 3 : 2; c.beginPath(); c.arc(np2.x, np2.y, sw * 0.62 + (hl ? Math.sin(t * 6) * 2 : 0), 0, 7); c.stroke();


    c.save(); c.globalAlpha = hl ? 1 : 0.75; c.setLineDash([3, 2.5]); c.strokeStyle = col; c.lineWidth = 2; var hr = cell * 0.12, hx = d.x - cell * 0.02, hy = d.y - cell * 0.08 + Math.sin(t * 2 + gi) * 1.5; c.fillStyle = hexA(col, 0.12); c.beginPath(); c.arc(hx, hy + hr * 0.2, hr * 1.25, 0, 7); c.fill();
    c.beginPath(); c.moveTo(hx - hr, hy + hr * 0.9); c.lineTo(hx - hr, hy); c.arc(hx, hy, hr, Math.PI, 0); c.lineTo(hx + hr, hy + hr * 0.9); c.lineTo(hx + hr * 0.33, hy + hr * 0.6); c.lineTo(hx - hr * 0.33, hy + hr * 0.9); c.closePath(); c.stroke(); c.setLineDash([]);
    c.fillStyle = col; c.beginPath(); c.arc(hx - hr * 0.35, hy - hr * 0.1, hr * 0.14, 0, 7); c.arc(hx + hr * 0.35, hy - hr * 0.1, hr * 0.14, 0, 7); c.fill(); c.restore();
  });
  /* selected ghost: line from pickup to destination */
  if (selGhost >= 0 && selGhost < P.ghosts.length && vis[selGhost].mode === 'wait') {
    var gp = ghostHome(selGhost), dp = destPos(selGhost);
    c.strokeStyle = COLORS[selGhost % COLORS.length]; c.lineWidth = 2; c.setLineDash([6, 6]); c.lineDashOffset = -t * 30;
    c.beginPath(); c.moveTo(gp.x, gp.y); c.quadraticCurveTo((gp.x + dp.x) / 2, Math.min(gp.y, dp.y) - cell * 0.6, dp.x, dp.y); c.stroke(); c.setLineDash([]);
  }
  /* bus */
  var bp = busPos(), riders = busRiders();
  /* ghosts waiting / flying */
  var gr = cell * 0.17;
  P.ghosts.forEach(function (g, gi) {
    var v = vis[gi], col = COLORS[gi % COLORS.length];
    if (v.mode === 'bus' || v.mode === 'gone') return;
    var x, y, face = v.face, al = 1, rr2 = gr;
    if (v.mode === 'wait') {
      var h = ghostHome(gi); x = h.x; y = h.y + Math.sin(t * 2.4 + gi) * cell * 0.03;
      if (mode === 'plan' && cur.sim && cur.sim.S.grumpy[gi]) face = 'grumpy';
      else if (mode === 'plan') face = g.sleepy ? 'sleep' : (selGhost === gi ? 'wow' : 'calm');
      if (v.shakeT > 0) { x += Math.sin(v.shakeT * 40) * 3; v.shakeT -= dt; }
    } else if (v.mode === 'fly') {
      v.k = Math.min(1, v.k + dt / v.dur); var e = v.k < 0.5 ? 2 * v.k * v.k : 1 - Math.pow(-2 * v.k + 2, 2) / 2;
      x = v.x0 + (v.x1 - v.x0) * e; y = v.y0 + (v.y1 - v.y0) * e - Math.sin(v.k * Math.PI) * cell * 0.4;
      rr2 = gr * (v.into ? 1 - 0.5 * e : 0.5 + 0.5 * e);
      if (v.k >= 1) { v.mode = v.into ? 'bus' : 'home'; v.t = 0; }
    } else if (v.mode === 'home') {
      v.t += dt; var d2 = destPos(gi); x = d2.x - cell * 0.2; y = d2.y - v.t * cell * 0.5; al = Math.max(0, 1 - v.t / 1.6); face = 'happy';
      if (al <= 0) v.mode = 'gone';
    }
    drawGhost(c, x, y, rr2, col, g.type, face, t + gi, al, { awake: v.awake });
    if (v.mode === 'wait') {
      /* badges: feud, sleepy */
      if (P.enemies[gi]) { var en = 0; for (var j = 0; j < P.ghosts.length; j++) if (P.enemies[gi] & (1 << j)) { var bx2 = x + gr * 1.1 + en * gr * 0.75, by2 = y + gr * 0.7; c.fillStyle = COLORS[j % COLORS.length]; c.beginPath(); c.arc(bx2, by2, gr * 0.36, 0, 7); c.fill(); c.strokeStyle = '#ff3b5c'; c.lineWidth = Math.max(2, gr * 0.14); c.beginPath(); c.arc(bx2, by2, gr * 0.4, 0, 7); c.stroke(); c.beginPath(); c.moveTo(bx2 - gr * 0.28, by2 + gr * 0.28); c.lineTo(bx2 + gr * 0.28, by2 - gr * 0.28); c.stroke(); en++; } }
      if (g.sleepy && !v.awake) { c.fillStyle = '#b9c4ff'; c.font = '800 ' + (gr * 0.8) + 'px ' + FONT; c.textAlign = 'left'; var zz = (t * 0.7 + gi * 0.3) % 1; c.globalAlpha = 1 - zz; c.fillText('z', x + gr * 0.9, y - gr * (1 + zz * 1.2)); c.globalAlpha = 1; }
    }
  });
  drawBus(c, bp.x, bp.y - cell * 0.16, cell * 0.36, bp.face, riders, mode === 'drive' ? t : 0, drive ? drive.honk : 0, true, drive && drive.sq ? Math.sin(drive.sq * Math.PI) * drive.sq : 0);
  /* particles */
  for (i = particles.length - 1; i >= 0; i--) { var p = particles[i]; p.life -= dt; if (p.life <= 0) { particles.splice(i, 1); continue; } p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; c.globalAlpha = Math.min(1, p.life * 2); c.fillStyle = p.col; if (p.star) { starPath(c, p.x, p.y, p.s); c.fill(); } else { c.beginPath(); c.arc(p.x, p.y, p.s, 0, 7); c.fill(); } }
  c.globalAlpha = 1;
  for (i = floats.length - 1; i >= 0; i--) { var f3 = floats[i]; f3.t += dt; if (f3.t > 1.3) { floats.splice(i, 1); continue; } c.globalAlpha = Math.min(1, (1.3 - f3.t) * 2); c.fillStyle = f3.col; c.font = '900 ' + f3.size + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeStyle = '#120f2e'; c.lineWidth = 4; c.strokeText(f3.txt, f3.x, f3.y - f3.t * 30); c.fillText(f3.txt, f3.x, f3.y - f3.t * 30); }
  c.globalAlpha = 1;
  for (i = bubbles.length - 1; i >= 0; i--) { var b = bubbles[i]; b.t += dt; if (b.t > b.dur) { bubbles.splice(i, 1); continue; } var bx3 = b.follow ? b.follow().x : b.x, by3 = b.follow ? b.follow().y : b.y; drawBubble(c, bx3, by3, b.text, Math.min(1, (b.dur - b.t) * 3, b.t * 8), b.col); }
  /* chips */
  drawChips(c, t);
  if (SHOT) drawShotTitle(c, t);
}
function starPath(c, x, y, r) { c.beginPath(); for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr3 = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr3, y + Math.sin(a) * rr3); } c.closePath(); }
function strokeRoute(c, R, upto, partial) {
  c.beginPath(); c.moveTo(NP[R[0]].x, NP[R[0]].y);
  for (var i = 1; i <= upto && i < R.length; i++) { var A = NP[R[i - 1]], B = NP[R[i]]; if (i === upto && partial < 1) c.lineTo(A.x + (B.x - A.x) * partial, A.y + (B.y - A.y) * partial); else c.lineTo(B.x, B.y); }
  c.stroke();
}

var chipRects = [];
function drawChips(c, t) {
  if (SHOT) return;
  var P = cur.P, n = P.ghosts.length, cw = Math.min(64, (W - 16) / n - 6), x0 = (W - n * (cw + 6) + 6) / 2;
  chipRects = [];
  c.fillStyle = 'rgba(12,10,32,.7)'; c.fillRect(0, 0, W, CHIP);
  c.fillStyle = 'rgba(80,70,170,.35)'; c.fillRect(0, CHIP - 1, W, 1);
  var S = mode === 'plan' ? cur.sim.S : (drive ? drive.S : cur.sim.S);
  P.ghosts.forEach(function (g, i) {
    var x = x0 + i * (cw + 6), y = 4, h = CHIP - 8, col = COLORS[i % COLORS.length];
    chipRects.push({ x: x, y: y, w: cw, h: h, i: i });
    c.fillStyle = selGhost === i ? '#3a3290' : '#221d50'; rr(c, x, y, cw, h, 10); c.fill();
    c.strokeStyle = selGhost === i ? col : 'rgba(255,255,255,.08)'; c.lineWidth = 1.5; c.stroke();
    var st = S.st[i], gru = S.grumpy[i];
    var face = st === 2 ? 'happy' : gru ? 'grumpy' : g.sleepy && !(drive && drive.S.honk) ? 'sleep' : 'calm';
    drawGhost(c, x + h * 0.42, y + h * 0.52, h * 0.24, col, g.type, face, t + i, 1, { noGlow: true });
    /* status badge */
    var bx = x + cw - h * 0.3, by = y + h * 0.5, br = Math.min(h * 0.22, cw * 0.18);
    if (cw > h * 0.95) {
      var bc = st === 2 ? '#3ee08f' : st === 1 ? '#ffb347' : '#4b4590';
      c.fillStyle = bc; c.beginPath(); c.arc(bx, by, br, 0, 7); c.fill();
      c.strokeStyle = '#120f2e'; c.lineWidth = Math.max(1.8, br * 0.3); c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
      if (st === 2) { c.moveTo(bx - br * 0.45, by); c.lineTo(bx - br * 0.1, by + br * 0.4); c.lineTo(bx + br * 0.5, by - br * 0.35); }
      else if (st === 1) { c.moveTo(bx - br * 0.45, by); c.lineTo(bx + br * 0.45, by); c.moveTo(bx + br * 0.15, by - br * 0.3); c.lineTo(bx + br * 0.45, by); c.lineTo(bx + br * 0.15, by + br * 0.3); }
      else { c.arc(bx, by, br * 0.15, 0, 7); }
      c.stroke();
      if (gru) { c.fillStyle = '#ff3b5c'; c.beginPath(); c.arc(bx + br * 0.8, by - br * 0.8, br * 0.45, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = '900 ' + br * 0.8 + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', bx + br * 0.8, by - br * 0.75); }
    }
  });
}

function busPos() {
  if (drive && (mode === 'drive' || mode === 'end')) {
    var R = drive.route, i = Math.min(drive.i, R.length - 1), A = NP[R[i]], B = NP[R[Math.min(i + 1, R.length - 1)]], k = mode === 'end' ? 0 : drive.t;
    return { x: A.x + (B.x - A.x) * k, y: A.y + (B.y - A.y) * k, face: drive.face };
  }
  var d = NP[cur.P.depot], f = 1;
  if (cur.route.length > 1) { var n2 = NP[cur.route[1]]; if (n2.x < d.x - 1) f = -1; }
  return { x: d.x, y: d.y, face: f };
}
function busRiders() {
  var P = cur.P, out = [];
  for (var i = 0; i < P.seats; i++) out.push(null);
  if (!drive) return out;
  var k = 0;
  drive.seatOf.forEach(function (gi, s) { if (gi >= 0 && cur.vis[gi].mode === 'bus') out[s] = { col: COLORS[gi % COLORS.length], type: P.ghosts[gi].type, face: 'happy' }; });
  return out;
}

/* ---------------- driving ---------------- */
function go() {
  if (mode === 'drive') { drive.speed = drive.speed > 6 ? drive.speed : drive.base * 3.2; return; }
  if (mode !== 'plan') return;
  if (cur.route.length < 2) { toast('draw a route first. drag from the bus.'); return; }
  initAudio(); dismissNote(); hideModal();
  attempts++;
  var P = cur.P, len = cur.route.length - 1;
  var base = Math.max(3.2, Math.min(7, len / 5));
  drive = { route: cur.route.slice(), i: 0, t: 0, base: base, speed: base, wait: 0.35, S: L.fresh(P), seatOf: [], face: 1, honk: 0, steps: L.simulate(P, cur.route).steps, done: false };
  for (var s = 0; s < P.seats; s++) drive.seatOf.push(-1);
  resetVis();
  mode = 'drive'; updateMeter(); selGhost = -1;
  sfx('go'); say(busFollow, pick(DRIVER_START), 1.6, '#ffc93c');
  applyStep(0);
}
function busFollow() { var b = busPos(); return { x: b.x, y: b.y - cell * 0.42 }; }
function stepDrive(dt) {
  var d = drive; if (!d) return;
  d.honk = Math.max(0, d.honk - dt * 1.5); d.sq = Math.max(0, (d.sq || 0) - dt * 3);
  if (d.wait <= 0 && d.i < d.route.length - 1) { d.dust = (d.dust || 0) + dt * d.speed; if (d.dust > 0.35) { d.dust = 0; var bq = busPos(); particles.push({ x: bq.x - d.face * cell * 0.25, y: bq.y + cell * 0.02, vx: -d.face * 20 + (Math.random() - 0.5) * 20, vy: -10 - Math.random() * 15, g: -10, life: 0.5, s: cell * 0.03 + Math.random() * cell * 0.02, col: 'rgba(170,160,230,.35)' }); } }
  for (var k in cur.collapse) if (cur.collapse[k] > 0 && cur.collapse[k] < 2) cur.collapse[k] += dt * 0.9;
  if (d.wait > 0) { d.wait -= dt * (d.speed / d.base); return; }
  if (d.i >= d.route.length - 1) { if (!d.done) { d.done = true; d.endT = 0.9; } d.endT -= dt * (d.speed / d.base); if (d.endT <= 0) finishDrive(); return; }
  var A = NP[d.route[d.i]], B = NP[d.route[d.i + 1]];
  if (Math.abs(B.x - A.x) > 1) d.face = B.x > A.x ? 1 : -1;
  d.t += dt * d.speed;
  if (d.t >= 1) {
    d.t = 0;
    var e = cur.P.edges[L.edgeBetween(cur.P, d.route[d.i], d.route[d.i + 1])];
    d.i++;
    if (e && e.bridge) { cur.collapse[cur.P.edges.indexOf(e)] = 0.01; shake = 0.7; sfx('crash'); splash(A, B); }
    applyStep(d.i);
    if (d.i >= d.route.length - 1) { d.t = 0; }
  }
}
function splash(A, B) { var x = (A.x + B.x) / 2, y = (A.y + B.y) / 2; for (var i = 0; i < 16; i++) particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 160, g: 400, life: 0.8, s: 2 + Math.random() * 2.5, col: Math.random() < 0.5 ? '#7fd0ff' : '#c9ecff' }); }
function sparkle(x, y, col, n) { for (var i = 0; i < (n || 12); i++) { var a = Math.random() * 7, v = 50 + Math.random() * 110; particles.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, g: 120, life: 0.7 + Math.random() * 0.4, s: 2.5 + Math.random() * 3, col: Math.random() < 0.4 ? '#fff' : col, star: Math.random() < 0.5 }); } }
function say(follow, text, dur, col) { bubbles = bubbles.filter(function (b) { return b.follow !== follow; }); bubbles.push({ follow: typeof follow === 'function' ? follow : null, x: follow.x, y: follow.y, text: text, t: 0, dur: dur || 1.6, col: col }); if (bubbles.length > 3) bubbles.shift(); }
function floatText(x, y, txt, col, size) { floats.push({ x: x, y: y, txt: txt, col: col || '#ffd84d', t: 0, size: size || Math.max(14, cell * 0.2) }); }

function applyStep(i) {
  var d = drive, P = cur.P, evs = d.steps[i] || [], node = d.route[i], np = NP[node];
  var hadStop = false;
  evs.forEach(function (ev) {
    var gi = ev.g, v = gi != null ? cur.vis[gi] : null, g = gi != null ? P.ghosts[gi] : null, col = gi != null ? COLORS[gi % COLORS.length] : '#fff';
    var tp = g ? TYPES[g.type] || TYPES.gary : null;
    if (ev.t === 'honk') {
      d.S.honk = 1; cur.honked = true; d.honk = 1; sfx('honk'); hadStop = true;
      say(busFollow, 'HONK.', 0.9, '#ffd84d');
      P.ghosts.forEach(function (gg, j) { if (gg.sleepy && cur.vis[j].mode === 'wait') { cur.vis[j].awake = true; cur.vis[j].face = 'wow'; cur.vis[j].shakeT = 0.3; (function (jj) { setTimeout(function () { if (cur && cur.vis[jj] && cur.vis[jj].mode === 'wait') say(ghostFollow(jj), pick(WAKE), 1.2, COLORS[jj % COLORS.length]); }, 250); })(j); } });
      setTimeout(function () { sfx('wake', 0.8); }, 250);
    } else if (ev.t === 'drop') {
      d.S.st[gi] = 2; var s = d.seatOf.indexOf(gi); if (s >= 0) d.seatOf[s] = -1;
      var b = busPos(), dp = destPos(gi);
      v.mode = 'fly'; v.into = false; v.k = 0; v.dur = 0.45; v.x0 = b.x; v.y0 = b.y - cell * 0.2; v.x1 = dp.x - cell * 0.2; v.y1 = dp.y;
      d.drops = (d.drops || 0) + 1; sfx('drop', 1, 0.9 + Math.min(0.5, d.drops * 0.1)); sparkle(dp.x, dp.y, col, 14); floatText(dp.x, dp.y - cell * 0.3, 'home!', col);
      say({ x: dp.x, y: dp.y - cell * 0.25 }, pick(tp.drop), 1.5, col); hadStop = true;
    } else if (ev.t === 'board') {
      d.S.st[gi] = 1; var free = d.seatOf.indexOf(-1); d.seatOf[free] = gi;
      var h = ghostHome(gi), b2 = busPos();
      v.mode = 'fly'; v.into = true; v.k = 0; v.dur = 0.4; v.x0 = h.x; v.y0 = h.y; v.x1 = b2.x; v.y1 = b2.y - cell * 0.15; v.face = 'happy';
      sfx('board'); say({ x: h.x, y: h.y - cell * 0.15 }, fill(pick(tp.board), { to: P.placeName[g.toL] }), 1.4, col); hadStop = true;
    } else if (ev.t === 'full' || ev.t === 'feud') {
      d.S.grumpy[gi] = 1; v.face = 'grumpy'; v.shakeT = 0.5;
      var line = ev.t === 'full' ? pick(FULL) : fill(pick(FEUD), { foe: (TYPES[P.ghosts[ev.foe].type] || TYPES.gary).name });
      say(ghostFollow(gi), line, 1.8, col); sfx(ev.t === 'full' ? 'grumpy' : 'refuse'); hadStop = true;
      floatText(ghostHome(gi).x, ghostHome(gi).y - cell * 0.3, 'grumpy', '#ff6b81');
    } else if (ev.t === 'asleep') {
      say(ghostFollow(gi), pick(ASLEEP), 1.2, col);
    }
  });
  if (hadStop) { d.wait = 0.38; d.sq = 1; }
}
function ghostFollow(gi) { return function () { var h = ghostHome(gi); return { x: h.x, y: h.y - cell * 0.15 }; }; }

function finishDrive() {
  var P = cur.P, sim = L.simulate(P, drive.route), len = drive.route.length - 1;
  mode = 'end'; updateMeter();
  if (sim.done) win(sim, len);
  else fail(sim);
}

function starMask(sim, len) { return 1 | (len <= cur.A.par ? 2 : 0) | (sim.happy ? 4 : 0); }
function win(sim, len, forced) {
  var P = cur.P, i = cur.idx, m = starMask(sim, len);
  var prev = i === 'daily' ? ((save.daily[today()] || {}).m | 0) : (save.stars[i] | 0);
  if (i === 'daily') {
    var dd = save.daily[today()] || {};
    if (!dd.len || len < dd.len || (m | 0) > (dd.m | 0)) { dd.len = dd.len ? Math.min(dd.len, len) : len; }
    dd.m = (dd.m | 0) | m; dd.last = { len: len, m: m, grumpy: sim.S.grumpy.slice() }; save.daily[today()] = dd;
    var keys = Object.keys(save.daily); if (keys.length > 30) delete save.daily[keys.sort()[0]];
  } else {
    save.stars[i] = prev | m;
    if (!(prev & 1)) { var hk = Math.floor(i / 10), hn = 0; for (var hj = hk * 10; hj < hk * 10 + 10; hj++) if (finished(hj)) hn++; if (hn === 10) save.celebrate = hk; }
    if (!save.best[i] || len < save.best[i]) save.best[i] = len;
  }
  save.plays = (save.plays | 0) + 1;
  storeSave(); renderLvStars();
  var nStars = (m & 1 ? 1 : 0) + (m & 2 ? 1 : 0) + (m & 4 ? 1 : 0);
  var score = nStars * 100 + Math.max(0, cur.A.dawn - len) * 10;
  if (!endedAnalytics) { endedAnalytics = true; ccEnd({ score: Math.max(1, score), durationMs: Date.now() - levelStart, completed: true }); }
  ccEvent('level_win', { level: lvlLabel(i), stars: nStars });
  sfx('win'); if (m & 4) setTimeout(function () { sfx('yay', 0.8); }, 500);
  var b = busPos(); sparkle(b.x, b.y, '#ffd84d', 24);
  for (var cf = 0; cf < 40; cf++) particles.push({ x: Math.random() * W, y: CHIP - 10, vx: (Math.random() - 0.5) * 60, vy: 40 + Math.random() * 120, g: 60, life: 2 + Math.random(), s: 2 + Math.random() * 3, col: COLORS[cf % COLORS.length], star: cf % 3 === 0 });
  var line = m & 2 ? pick(DRIVER_PAR) : pick(DRIVER_WIN);
  if (i !== 'daily' && i % 10 === 9 && !(prev & 1)) line = i === 39 ? 'that was the last bus. every ghost in town is home. i am going to sleep for a hundred years.' : 'new neighbourhood unlocked: <b>' + L.HOODS[(i + 1) / 10].name + '</b>. ' + L.HOODS[(i + 1) / 10].blurb;
  showEnd(true, m, prev, len, sim, line);
}
function fail(sim) {
  var P = cur.P, lines = [], lw = LEFT_WAIT.slice().sort(function () { return Math.random() - 0.5; }), lo = LEFT_ON.slice().sort(function () { return Math.random() - 0.5; }), wi = 0, oi = 0;
  sim.S.st.forEach(function (s, gi) {
    var g = P.ghosts[gi], nm = (TYPES[g.type] || TYPES.gary).name;
    if (s === 0) lines.push('<div><b style="color:' + COLORS[gi % COLORS.length] + '">' + nm + '</b>: ' + fill(lw[wi++ % lw.length], { at: P.placeName[g.fromL] }) + (g.sleepy && !sim.S.honk ? ' <i>(asleep. honk first.)</i>' : '') + '</div>');
    else if (s === 1) lines.push('<div><b style="color:' + COLORS[gi % COLORS.length] + '">' + nm + '</b>: ' + lo[oi++ % lo.length] + ' <i>(wants ' + P.placeName[g.toL] + ')</i></div>');
  });
  sfx('fail');
  ccEvent('level_fail', { level: lvlLabel(cur.idx) });
  showModal('<h2>the sun came up.</h2><div class="sub">not everyone got home. ghosts hate that.</div><div class="flist">' + lines.join('') + '</div>' +
    '<div class="row"><button class="btn pri" id="eFix">fix the route</button><button class="btn" id="eClear">start over</button></div>');
  $('eFix').onclick = function () { backToPlan(); };
  $('eClear').onclick = function () { backToPlan(); clearRoute(); };
  if (attempts >= 3) showHintOffer();
}
function backToPlan() { hideModal(); mode = 'plan'; drive = null; resetVis(); updatePreview(); }
function showHintOffer() { toast('stuck? tap ? for the driver\'s notes.'); }

var STAR_SVG = '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.2 6.6.7-5 4.5 1.4 6.6L12 17.2 6.1 20.5l1.4-6.6-5-4.5 6.6-.7z" fill="FILL" stroke="#120f2e" stroke-width="1.3" stroke-linejoin="round"/></svg>';
function showEnd(ok, m, prev, len, sim, line) {
  var A = cur.A, i = cur.idx, isDaily = i === 'daily';
  var labels = ['delivered', 'par ' + A.par, 'everyone happy'];
  var h = '<h2>' + (m === 7 ? 'perfect shift.' : 'everyone home.') + '</h2><div class="sub">' + len + ' streets · par ' + A.par + (sim.happy ? ' · no grumpy ghosts' : ' · ' + sim.S.grumpy.filter(Boolean).length + ' grumpy') + '</div><div class="stars">';
  for (var b = 0; b < 3; b++) { var on = m & (1 << b); h += '<div class="st' + (on ? ' on' : '') + '">' + STAR_SVG.replace('FILL', on ? '#ffd84d' : '#2e2870') + labels[b] + '</div>'; }
  h += '</div><div class="quote"><b>driver:</b> ' + line + '</div>';
  var tips = [];
  if (!(m & 2)) tips.push('there\'s a route ' + (len - A.par) + ' street' + (len - A.par === 1 ? '' : 's') + ' shorter.');
  if (!(m & 4)) tips.push('don\'t drive past a waiting ghost you can\'t take.');
  if (tips.length) h += '<div class="sub" style="margin-top:8px">' + tips.join(' ') + '</div>';
  var next = !isDaily && i < L.LEVELS.length - 1 && save.celebrate == null;
  h += '<div class="row">' + (next ? '<button class="btn pri" id="eNext">next route</button>' : '<button class="btn pri" id="eMap">' + (save.celebrate != null ? 'see the town' : 'town map') + '</button>') +
    '<button class="btn" id="eRetry">' + (m === 7 ? 'replay' : 'try for ' + (3 - ((m & 1) + (m >> 1 & 1) + (m >> 2 & 1))) + ' more ★') + '</button><button class="btn" id="eShare">share</button>' + (next ? '<button class="btn" id="eMap">map</button>' : '') + '</div><div id="tipslot"></div>';
  showModal(h);
  if ($('eNext')) $('eNext').onclick = function () { loadLevel(i + 1); };
  $('eMap').onclick = function () { openMap(); };
  $('eRetry').onclick = function () { backToPlan(); levelStart = Date.now(); endedAnalytics = false; ccStart(); };
  $('eShare').onclick = function () { share(m, len, sim); };
  try { if (window.ccTip && ccTip.mount) ccTip.mount($('tipslot'), { game: 'ghost-bus', slot: 'game-over' }); } catch (e) {}
}

/* ---------------- share ---------------- */
function shareText(m, len, sim) {
  var st = '', i = cur.idx;
  for (var b = 0; b < 3; b++) st += (m & (1 << b)) ? '⭐' : '☆';
  var ghosts = sim.S.grumpy.map(function (g) { return g ? '😤' : '👻'; }).join('');
  if (i === 'daily') return 'ghost bus daily · ' + dateLabel() + '\n🚌 ' + st + ' ' + len + ' streets (par ' + cur.A.par + ')\n' + ghosts + '\ncomputercooked.com/games/ghost-bus';
  return 'ghost bus ' + lvlLabel(i) + ' "' + cur.P.name + '" ' + st + ' in ' + len + ' streets (par ' + cur.A.par + ')\ncomputercooked.com/games/ghost-bus';
}
function shareCard(m, len, sim) {
  var c2 = document.createElement('canvas'); c2.width = 600; c2.height = 600; var c = c2.getContext('2d');
  drawSky(c, 600, 600, 5); drawMoon(c, 500, 95, 38);
  c.fillStyle = '#1a1740'; rr(c, 30, 380, 540, 120, 24); c.fill();
  c.strokeStyle = '#3b3772'; c.lineWidth = 26; c.lineCap = 'round'; c.beginPath(); c.moveTo(60, 440); c.lineTo(540, 440); c.stroke();
  drawBus(c, 300, 418, 110, 1, cur.P.ghosts.slice(0, Math.min(3, cur.P.seats)).map(function (g, k) { return { col: COLORS[k], type: g.type, face: 'happy' }; }), 0.3, 0, true);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#fff'; c.font = '900 64px ' + FONT; c.fillText('ghost bus', 300, 78);
  c.fillStyle = '#b9b2f0'; c.font = '700 26px ' + FONT; c.fillText(cur.idx === 'daily' ? 'daily town · ' + dateLabel() : lvlLabel(cur.idx) + ' · ' + cur.P.name, 300, 132);
  for (var b = 0; b < 3; b++) { c.fillStyle = (m & (1 << b)) ? '#ffd84d' : '#2e2870'; starPath(c, 210 + b * 90, 205, 34); c.fill(); }
  c.fillStyle = '#fff'; c.font = '800 30px ' + FONT; c.fillText(len + ' streets · par ' + cur.A.par, 300, 270);
  var n = cur.P.ghosts.length; cur.P.ghosts.forEach(function (g, k) { drawGhost(c, 300 + (k - (n - 1) / 2) * 70, 330, 22, COLORS[k % COLORS.length], g.type, sim.S.grumpy[k] ? 'grumpy' : 'happy', k, 1); });
  c.fillStyle = '#ffd84d'; c.font = '800 24px ' + FONT; c.fillText('computercooked.com/games/ghost-bus', 300, 555);
  return c2;
}
function share(m, len, sim) {
  var text = shareText(m, len, sim);
  ccEvent('share', { level: lvlLabel(cur.idx) });
  var c2 = shareCard(m, len, sim);
  function copy() { try { navigator.clipboard.writeText(text).then(function () { toast('copied. go brag.'); }, function () { toast('copy failed. screenshot it.'); }); } catch (e) { toast('copy failed. screenshot it.'); } }
  try {
    c2.toBlob(function (blob) {
      try {
        var file = blob && new File([blob], 'ghost-bus.png', { type: 'image/png' });
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], text: text }).catch(function () {}); return; }
        if (navigator.share) { navigator.share({ text: text }).catch(function () {}); return; }
      } catch (e) {}
      copy();
    }, 'image/png');
  } catch (e) { copy(); }
}

/* ---------------- ui bits ---------------- */
var toastT = 0;
function toast(s) { var t = $('toast'); t.textContent = s; t.classList.remove('hide'); t.style.animation = 'none'; void t.offsetWidth; t.style.animation = ''; clearTimeout(toastT); toastT = setTimeout(function () { t.classList.add('hide'); }, 2200); }
function showNote(html, sticky) { var n = $('note'); n.innerHTML = html; n.classList.remove('hide'); clearTimeout(showNote.t); if (!sticky) showNote.t = setTimeout(dismissNote, Math.max(4200, html.length * 45)); }
function dismissNote() { $('note').classList.add('hide'); }
function showModal(h) { $('card').innerHTML = h; $('modal').classList.remove('hide'); }
function hideModal() { $('modal').classList.add('hide'); }

function hint() {
  if (!cur || mode === 'map') return;
  if (mode !== 'plan') return;
  var A = cur.A, route = A.happyRoute;
  /* show the first part of a good route */
  var n = Math.min(route.length - 1, Math.max(3, Math.ceil((route.length - 1) / 3)));
  cur.route = route.slice(0, n + 1); updatePreview();
  showNote('<b>driver\'s notes:</b> the first ' + n + ' streets of a ' + A.happy + '-street route that keeps everyone happy. the rest is on you.', false);
  ccEvent('hint', { level: lvlLabel(cur.idx) });
}

/* ---------------- map screen ---------------- */
/* the world map: four little night towns, one winding road, 40 stops, the bus parked at yours */
var world = null, lastLevel = -1;
function openMap() {
  if (cur && !endedAnalytics) { endedAnalytics = true; ccEnd({ score: 0, durationMs: Date.now() - levelStart, completed: false }); }
  if (cur && typeof cur.idx === 'number') lastLevel = cur.idx;
  mode = 'map'; hideModal(); dismissNote(); drive = null; setPause(false);
  var tot = totalStars();
  $('mapTot').innerHTML = '<b>★ ' + tot + '</b> / 120 · the last bus of the night';
  var dd = save.daily[today()], streak = 0; for (var sd = today() - (dd ? 0 : 1); save.daily[sd]; sd--) streak++;
  $('dailyBtn').innerHTML = '<span class="dI">' + dateLabel().replace(' ', '<br>') + '</span><span class="dT"><b>daily town</b><small>' + (dd ? 'done: ' + dd.len + ' streets. beat it?' : 'a new town every day. same for everyone.') + (streak > 1 ? ' · streak ' + streak : '') + '</small></span><span style="font-size:22px">›</span>';
  var nx = firstOpen(), allDone = finished(L.LEVELS.length - 1) && nx === L.LEVELS.length - 1;
  $('contBtn').innerHTML = allDone ? '<b>all 40 routes driven.</b><small>go back for the stars you missed, or do the daily.</small>' : '<b>' + (tot ? 'continue' : 'start') + ': ' + lvlLabel(nx) + ' ' + L.LEVELS[nx].name + '</b><small>' + L.HOODS[Math.floor(nx / 10)].name + '</small>';
  $('contBtn').onclick = function () { initAudio(); mapTravel(nx); };
  $('mapScr').classList.remove('hide');
  drawLogo();
  if (!$('world')) { $('hoods').innerHTML = '<canvas id="world" aria-label="town map: tap a stop to play it, or pick one with the arrow keys and press enter"></canvas>'; $('world').addEventListener('pointerdown', worldTap); }
  var at = lastLevel >= 0 ? lastLevel : nx;
  world = { at: at, pos: at, travel: null, t: 0, parts: [], celebrate: save.celebrate == null ? -1 : save.celebrate };
  if (world.celebrate >= 0) { delete save.celebrate; storeSave(); }
  layoutWorld();
  /* scroll so the bus is on screen */
  try { var sp = world.stops[at]; var top = $('world').offsetTop + sp.y - $('mapScr').clientHeight * 0.45; $('mapScr').scrollTop = Math.max(0, top); } catch (e) {}
  if (world.celebrate >= 0) { var cs = world.stops[world.celebrate * 10 + 9]; for (var i = 0; i < 50; i++) { var a = Math.random() * 7, v = 60 + Math.random() * 160; world.parts.push({ x: cs.x, y: cs.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, life: 1.4 + Math.random(), col: COLORS[i % 6], s: 2 + Math.random() * 3 }); } sfx('yay', 0.7); }
}
function layoutWorld() {
  var c2 = $('world'), cw = Math.max(280, $('hoods').clientWidth || 360);
  var ph = Math.round(Math.max(250, Math.min(330, cw * 0.66))), gap = 16, wd = DPR;
  world.cw = cw; world.ph = ph; world.gap = gap; world.h = 4 * ph + 3 * gap;
  c2.style.width = cw + 'px'; c2.style.height = world.h + 'px'; c2.width = Math.round(cw * wd); c2.height = Math.round(world.h * wd);
  var pad = Math.max(30, cw * 0.09), stops = [];
  for (var k = 0; k < 4; k++) {
    var py = k * (ph + gap), top = py + 58, band = ph - 58;
    for (var i = 0; i < 10; i++) {
      var row = i < 5 ? 0 : 1, col = row ? 9 - i : i;
      stops.push({ x: pad + col * (cw - 2 * pad) / 4, y: top + band * (row ? 0.74 : 0.26) + Math.sin(i * 1.9 + k * 2.3) * band * 0.07, k: k, i: k * 10 + i });
    }
  }
  world.stops = stops; world.r = Math.max(15, Math.min(21, cw / 24));
}
function worldPath(c) {
  var S = world.stops; c.beginPath(); c.moveTo(S[0].x, S[0].y);
  for (var i = 1; i < S.length; i++) {
    var a = S[i - 1], b = S[i];
    if (i % 5 === 0 && i % 10 !== 0) { var ex = i % 10 === 5 ? world.cw - Math.max(12, world.cw * 0.035) : Math.max(12, world.cw * 0.035); c.bezierCurveTo(ex, a.y, ex, b.y, b.x, b.y); }
    else if (i % 10 === 0) { var ex2 = Math.max(12, world.cw * 0.035); c.bezierCurveTo(ex2, a.y + 40, ex2, b.y - 40, b.x, b.y); }
    else c.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + (i % 2 ? -10 : 10), b.x, b.y);
  }
}
var HOOD_BG = [['#2b2462', '#1b173f'], ['#4a2152', '#1d1640'], ['#123a60', '#13173f'], ['#1c4a40', '#141a3a']];
function drawWorld(dt) {
  var c2 = $('world'); if (!c2 || !world) return;
  var c = c2.getContext('2d'), cw = world.cw, ph = world.ph, t = tNow, S = world.stops, r = world.r;
  c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, cw, world.h);
  var saveCell = cell; cell = 60;
  for (var k = 0; k < 4; k++) {
    var py = k * (ph + world.gap), hd = L.HOODS[k], g = c.createLinearGradient(0, py, 0, py + ph);
    g.addColorStop(0, HOOD_BG[k][0]); g.addColorStop(1, HOOD_BG[k][1]);
    c.fillStyle = g; rr(c, 0, py, cw, ph, 18); c.fill();
    c.save(); rr(c, 0, py, cw, ph, 18); c.clip();
    for (var s = 0; s < 18; s++) { c.fillStyle = 'rgba(230,225,255,' + (0.25 + 0.4 * Math.abs(Math.sin(t * 0.8 + s * 1.7 + k))) + ')'; c.fillRect(hash(s, k + 3) * cw, py + 6 + hash(k, s + 5) * 50, 2, 2); }
    /* neighbourhood scenery */
    var kinds = [['.', 's', '.', 't'], ['.', 't', '.', '.'], ['w', '.', 'w', 't'], ['g', 't', '.', 'g']][k];
    for (var bx = 0; bx < 6; bx++) for (var by = 0; by < 2; by++) {
      var x = bx * cw / 6 + 6, y = py + 58 + (by ? (ph - 58) * 0.5 : 0) + 4, w = cw / 6 - 12, h = (ph - 58) * 0.5 - 12;
      if (k === 2 && by === 0) continue;
      c.globalAlpha = 0.45; drawBlock(c, x + w * 0.15, y + h * 0.2, w * 0.7, h * 0.6, kinds[(bx + by) % 4], bx * 7 + by * 3 + k * 31); c.globalAlpha = 1;
    }
    if (k === 2) { c.fillStyle = 'rgba(40,110,170,.45)'; c.beginPath(); c.moveTo(0, py + ph * 0.5); for (var wx = 0; wx <= cw; wx += 20) c.lineTo(wx, py + ph * 0.5 + Math.sin(wx * 0.04 + t) * 4); c.lineTo(cw, py + ph * 0.62); for (wx = cw; wx >= 0; wx -= 20) c.lineTo(wx, py + ph * 0.62 + Math.sin(wx * 0.05 + t * 1.3) * 4); c.closePath(); c.fill(); }
    if (k === 3) { c.fillStyle = 'rgba(10,30,30,.5)'; c.beginPath(); c.moveTo(0, py + ph); c.quadraticCurveTo(cw * 0.25, py + ph * 0.35, cw * 0.55, py + ph); c.quadraticCurveTo(cw * 0.8, py + ph * 0.45, cw, py + ph); c.fill(); }
    c.restore();
    var done = 0; for (var j = k * 10; j < k * 10 + 10; j++) if (finished(j)) done++;
    world['done' + k] = done;
  }
  /* the road */
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = '#0d0b22'; c.lineWidth = r * 1.15 + 4; worldPath(c); c.stroke();
  c.strokeStyle = '#3b3772'; c.lineWidth = r * 1.15; worldPath(c); c.stroke();
  c.strokeStyle = 'rgba(160,155,230,.35)'; c.lineWidth = 1.5; c.setLineDash([6, 8]); worldPath(c); c.stroke(); c.setLineDash([]);
  /* travelled part glows */
  var upto = -1; for (var q = 0; q < 40; q++) if (finished(q)) upto = q;
  /* stops */
  for (var i = 0; i < 40; i++) {
    var p = S[i], ok = playable(i), fin = finished(i), m = save.stars[i] | 0, isNext = ok && !fin;
    if (isNext) { c.fillStyle = 'rgba(255,216,77,' + (0.18 + 0.15 * Math.sin(t * 4)) + ')'; c.beginPath(); c.arc(p.x, p.y, r * 1.6, 0, 7); c.fill(); }
    c.fillStyle = !ok ? '#1c1946' : isNext ? '#ffd84d' : '#3b2f86'; c.beginPath(); c.arc(p.x, p.y, r, 0, 7); c.fill();
    c.lineWidth = 2.5; c.strokeStyle = fin ? '#ffd84d' : ok ? '#fff2b0' : '#2e2870'; c.stroke();
    c.fillStyle = !ok ? '#4d478f' : isNext ? '#2a1a00' : '#fff'; c.font = '900 ' + Math.round(r * 0.85) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(String(i % 10 + 1), p.x, p.y + 1);
    if (world.sel === i) { c.lineWidth = 3; c.strokeStyle = '#6ff0ff'; c.beginPath(); c.arc(p.x, p.y, r * 1.35 + Math.sin(t * 6) * 1.5, 0, 7); c.stroke(); }
    if (ok) for (var b = 0; b < 3; b++) { c.fillStyle = (m & (1 << b)) ? '#ffd84d' : 'rgba(20,16,50,.85)'; starPath(c, p.x + (b - 1) * r * 0.62, p.y + r * 1.32, r * 0.32); c.fill(); }
  }
  /* headers, above the road */
  for (k = 0; k < 4; k++) {
    py = k * (ph + world.gap); var hd2 = L.HOODS[k], sum = 0; for (j = k * 10; j < k * 10 + 10; j++) sum += starsOf(j);
    c.fillStyle = HOOD_BG[k][0]; rr(c, 30, py + 4, cw - 36, 46, 12); c.fill();
    c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillStyle = '#fff'; c.font = '800 17px ' + FONT; c.fillText(hd2.name, 38, py + 18);
    c.textAlign = 'right'; c.fillStyle = '#ffd84d'; c.font = '800 14px ' + FONT; c.fillText('★ ' + sum + '/30' + (world['done' + k] === 10 ? '  ✓' : ''), cw - 14, py + 18);
    c.textAlign = 'left'; c.fillStyle = '#b9b2f0'; c.font = '600 11.5px ' + FONT;
    var blurb = hd2.blurb; while (c.measureText(blurb).width > cw - 52 && blurb.length > 10) blurb = blurb.slice(0, -2);
    if (blurb !== hd2.blurb) blurb = blurb.replace(/\s*\S*$/, '') + '...';
    c.fillText(blurb, 38, py + 38);
  }
  /* locked neighbourhoods */
  for (k = 0; k < 4; k++) if (!playable(k * 10)) {
    py = k * (ph + world.gap); c.fillStyle = 'rgba(8,6,24,.55)'; rr(c, 0, py, cw, ph, 18); c.fill();
    c.fillStyle = '#c9c1ff'; c.font = '800 14px ' + FONT; c.textAlign = 'center'; c.fillText('finish ' + L.HOODS[k - 1].name + ' to open ' + L.HOODS[k].name, cw / 2, py + ph * 0.5);
  }
  /* finished neighbourhoods: the ghosts wave the bus off */
  for (k = 0; k < 4; k++) if (world['done' + k] === 10) {
    var e = S[k * 10 + 9], cel = world.celebrate === k;
    for (var gi = 0; gi < 3; gi++) {
      var gx = e.x + r * 1.6 + gi * r * 1.3, gy = e.y - r * 0.4 + Math.sin(t * 3 + gi) * 3, gr = r * 0.48;
      drawGhost(c, gx, gy, gr, COLORS[(gi + k * 2) % 6], ['gary', 'nan', 'kid', 'vamp', 'chef', 'lord', 'cat', 'sleepy', 'clown', 'mime', 'wife', 'hus'][(k * 3 + gi) % 12], 'happy', t + gi, 1);
      var wv = Math.sin(t * 9 + gi) * 0.6; c.strokeStyle = COLORS[(gi + k * 2) % 6]; c.lineWidth = gr * 0.28; c.beginPath(); c.moveTo(gx + gr * 0.8, gy); c.lineTo(gx + gr * 1.3 + Math.cos(wv - 1) * gr * 0.3, gy - gr * 0.6 + Math.sin(wv - 1) * gr * 0.3); c.stroke();
    }
    c.fillStyle = '#fff'; c.font = '800 12px ' + FONT; c.textAlign = 'left'; c.fillText(cel ? 'bye bye, bus!' : 'cheers, drive!', Math.min(cw - 90, e.x + r * 1.2), e.y - r * 1.6);
  }
  /* the bus */
  var bp = worldBusPos(dt);
  drawBus(c, bp.x, bp.y - r * 1.05, r * 1.15, bp.face, [null, null], world.travel ? t : 0, 0, true);
  /* confetti */
  for (i = world.parts.length - 1; i >= 0; i--) { var pt = world.parts[i]; pt.life -= dt; if (pt.life <= 0) { world.parts.splice(i, 1); continue; } pt.vy += 220 * dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; c.globalAlpha = Math.min(1, pt.life); c.fillStyle = pt.col; c.fillRect(pt.x, pt.y, pt.s, pt.s); }
  c.globalAlpha = 1;
  cell = saveCell;
}
function worldBusPos(dt) {
  var S = world.stops, tr = world.travel;
  if (!tr) { var p = S[world.at]; return { x: p.x, y: p.y, face: world.face || 1 }; }
  tr.t += dt / tr.dur; var n = Math.abs(tr.to - tr.from), f = Math.min(1, tr.t) * n, k = Math.floor(f), dir = tr.to > tr.from ? 1 : -1;
  var a = S[tr.from + dir * Math.min(k, n)], b = S[tr.from + dir * Math.min(k + 1, n)], u = f - k;
  if (Math.abs(b.x - a.x) > 1) world.face = b.x > a.x ? 1 : -1;
  if (tr.t >= 1) { world.travel = null; world.at = tr.to; var go2 = tr.to; setTimeout(function () { if (mode === 'map') loadLevel(go2); }, 120); return { x: b.x, y: b.y, face: world.face }; }
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, face: world.face || 1 };
}
function mapTravel(j) {
  if (!world || world.travel) return;
  initAudio();
  if (j === world.at) { loadLevel(j); return; }
  sfx('go', 0.7);
  world.travel = { from: world.at, to: j, t: 0, dur: Math.min(1.1, 0.25 + Math.abs(j - world.at) * 0.09) };
}
function worldTap(e) {
  if (!world) return;
  var r0 = $('world').getBoundingClientRect(), x = e.clientX - r0.left, y = e.clientY - r0.top, best = -1, bd = 1e9;
  world.stops.forEach(function (p, i) { var d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = i; } });
  if (best < 0 || bd > world.r * 1.9) return;
  if (!playable(best)) { toastMap('finish the stop before it first.'); return; }
  mapTravel(best);
}
/* keyboard on the map: arrows move a ring along the open stops, enter / space drives there */
function mapKey(e) {
  if (!world || !world.stops || world.travel) return;
  var k = e.key, d = { ArrowLeft: -1, ArrowUp: -1, a: -1, w: -1, ArrowRight: 1, ArrowDown: 1, d: 1, s: 1 }[k];
  if (d) {
    e.preventDefault(); initAudio();
    var j = (world.sel == null ? world.at : world.sel) + d;
    if (j < 0 || j >= world.stops.length) return;
    if (!playable(j)) { toastMap('finish the stop before it first.'); return; }
    world.sel = j; sfx('tick', 0.6);
    try { var sp = world.stops[j], ms = $('mapScr'), y = $('world').offsetTop + sp.y; if (y < ms.scrollTop + 60 || y > ms.scrollTop + ms.clientHeight - 60) ms.scrollTop = Math.max(0, y - ms.clientHeight * 0.45); } catch (er) {}
    return;
  }
  if ((k === 'Enter' || k === ' ') && world.sel != null) {
    var ae = document.activeElement; if (ae && ae.tagName === 'BUTTON') return;
    e.preventDefault(); mapTravel(world.sel); world.sel = null;
  }
}
function toastMap(s) { var el = $('mapTot'), old = el.innerHTML; el.innerHTML = '<b>' + s + '</b>'; clearTimeout(toastMap.t); toastMap.t = setTimeout(function () { el.innerHTML = old; }, 1800); }
function drawLogo() {
  var c2 = $('logo'), c = c2.getContext('2d'), w = c2.width, h = c2.height;
  c.clearRect(0, 0, w, h);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#fff'; c.font = '900 50px ' + FONT; c.fillText('ghost bus', w / 2 + 30, 50);
  drawGhost(c, 48, 52, 24, '#7CFFCB', 'gary', 'happy', 0, 1);
  c.fillStyle = '#b9b2f0'; c.font = '700 15px ' + FONT; c.fillText('the last bus. the dead are waiting.', w / 2, 100);
}
$('dailyBtn').onclick = function () { initAudio(); loadLevel('daily'); };

/* ---------------- input ---------------- */
var drag = null;
function nodeAt(x, y, rad) { var best = -1, bd = rad * rad; for (var i = 0; i < NP.length; i++) { var dx = NP[i].x - x, dy = NP[i].y - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } } return best; }
function evPos(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
cv.addEventListener('pointerdown', function (e) {
  initAudio();
  if (paused) { setPause(false); return; }
  if (!cur || mode === 'map') return;
  var p = evPos(e);
  if (mode === 'drive') { go(); return; }
  if (mode !== 'plan') return;
  /* chips */
  if (p.y < CHIP) { for (var i = 0; i < chipRects.length; i++) { var r = chipRects[i]; if (p.x >= r.x && p.x <= r.x + r.w) { selectGhost(r.i); return; } } selGhost = -1; return; }
  dismissNote();
  var n = nodeAt(p.x, p.y, cell * 0.5);
  /* a tap on a waiting ghost (closer to the ghost than to its corner) inspects it instead of extending the route */
  var tg = ghostAt(p.x, p.y);
  if (tg >= 0 && n >= 0) { var gh = ghostHome(tg); if (Math.hypot(gh.x - p.x, gh.y - p.y) < Math.hypot(NP[n].x - p.x, NP[n].y - p.y)) { selectGhost(tg); return; } }
  if (n < 0) { /* tap a waiting ghost to inspect it */
    var gi = ghostAt(p.x, p.y); if (gi >= 0) selectGhost(gi); else selGhost = -1;
    return;
  }
  try { cv.setPointerCapture(e.pointerId); } catch (er) {}
  drag = { added: 0, id: e.pointerId };
  if (n === routeEnd()) return;
  if (canStep(n)) { if (pushNode(n)) drag.added++; return; }
  var path = pathTo(n);
  if (!path) { toast('can\'t get there from here. one-way streets, probably.'); drag = null; return; }
  if (cur.route.length - 1 + path.length > cur.A.dawn) { dawnBlock(); drag = null; return; }
  path.forEach(function (k) { cur.route.push(k); }); updatePreview(); sfx('tick'); drag.added += path.length;
});
cv.addEventListener('pointermove', function (e) {
  if (!cur || mode !== 'plan') return;
  var p = evPos(e);
  if (!drag) { var h = nodeAt(p.x, p.y, cell * 0.45); hoverNode = h; return; }
  var n = nodeAt(p.x, p.y, cell * 0.4);
  if (n < 0 || n === routeEnd()) return;
  var R = cur.route;
  if (drag.added > 0 && R.length >= 2 && n === R[R.length - 2] && !stopMatters(R.length - 1)) { R.pop(); drag.added--; updatePreview(); sfx('tick', 0.5); return; }
  if (canStep(n)) { if (pushNode(n)) drag.added++; return; }
  var path = pathTo(n);
  if (path && path.length <= 2 && R.length - 1 + path.length <= cur.A.dawn) { path.forEach(function (k) { R.push(k); }); drag.added += path.length; updatePreview(); sfx('tick'); }
});
function endDrag() { drag = null; }
/* something happens at route step k (pickup, drop, honk...) so going back is a u-turn, not an undo */
function stopMatters(k) { var ev = cur.sim && cur.sim.steps[k]; return !!(ev && ev.some(function (e) { return e.t !== 'bad'; })); }
cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
function ghostAt(x, y) { var P = cur.P; for (var i = 0; i < P.ghosts.length; i++) { if (cur.vis[i].mode !== 'wait') continue; var h = ghostHome(i); if (Math.hypot(h.x - x, h.y - y) < cell * 0.25) return i; } return -1; }
function selectGhost(i) {
  selGhost = selGhost === i ? -1 : i; if (selGhost < 0) return;
  var P = cur.P, g = P.ghosts[i], tp = TYPES[g.type] || TYPES.gary, bits = [];
  bits.push('<b style="color:' + COLORS[i % COLORS.length] + '">' + tp.name + '</b>: ' + P.placeName[g.fromL] + ' → <b>' + P.placeName[g.toL] + '</b>');
  if (g.sleepy) bits.push('asleep. honk the horn before you get there.');
  for (var j = 0; j < P.ghosts.length; j++) if (P.enemies[i] & (1 << j)) bits.push('won\'t ride with ' + (TYPES[P.ghosts[j].type] || TYPES.gary).name + '.');
  var S = cur.sim.S, st = S.st[i];
  bits.push('<small>with this route: ' + (st === 2 ? 'gets home' : st === 1 ? 'still on the bus at the end' : 'never picked up') + (S.grumpy[i] ? ', and grumpy (you drove past)' : '') + '</small>');
  showNote(bits.join(' '), false);
}

/* keyboard */
window.addEventListener('keydown', function (e) {
  var k = e.key;
  if (k === 'm' || k === 'M') { toggleMute(); return; }
  if (!$('modal').classList.contains('hide')) {
    if (k === 'Enter' || k === ' ') { var b = $('eNext') || $('eFix') || $('eMap'); if (b) { e.preventDefault(); b.click(); } }
    if (k === 'r' || k === 'R') { var r = $('eRetry') || $('eFix'); if (r) r.click(); }
    if (k === 'Escape') openMap();
    return;
  }
  if (mode === 'map') { mapKey(e); return; }
  if (k === 'Escape') { openMap(); return; }
  if (k === 'p' || k === 'P') { if (mode === 'drive') setPause(!paused); return; }
  if (k === 'Enter' || k === ' ') { e.preventDefault(); initAudio(); go(); return; }
  if (mode !== 'plan') return;
  if (k === 'Backspace' || k === 'z' || k === 'Z' || k === 'u') { e.preventDefault(); undo(); return; }
  if (k === 'r' || k === 'R') { clearRoute(); return; }
  if (k === 'h' || k === '?') { hint(); return; }
  var dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] }[k];
  if (dir) {
    e.preventDefault(); initAudio();
    var end = NP[routeEnd()], moves = L.legalNext(cur.P, cur.route), found = null;
    moves.forEach(function (m) { var p = NP[m.to], dx = Math.sign(Math.round(p.x - end.x)), dy = Math.sign(Math.round(p.y - end.y)); if (dx === dir[0] && dy === dir[1]) found = m.to; });
    if (found != null) pushNode(found);
    else { var R = cur.route; if (R.length > 1) { var pv = NP[R[R.length - 2]]; if (Math.sign(Math.round(pv.x - end.x)) === dir[0] && Math.sign(Math.round(pv.y - end.y)) === dir[1]) { toast('that street\'s gone or one-way.'); return; } } toast('no street that way.'); }
  }
});

function toggleMute() { save.mute = !save.mute; storeSave(); setMuteIcon(); if (save.mute) stopAll(); else { initAudio(); sfx('tick'); } }
function setPause(p) { paused = p; $('pauseOv').classList.toggle('hide', !p); if (p) stopAll(); lastT = 0; }
$('muteBtn').onclick = function () { toggleMute(); this.blur(); };
$('mapBtn').onclick = function () { openMap(); this.blur(); };
$('hintBtn').onclick = function () { hint(); this.blur(); };
$('undoBtn').onclick = function () { undo(); this.blur(); };
$('clearBtn').onclick = function () { clearRoute(); this.blur(); };
$('goBtn').onclick = function () { initAudio(); go(); this.blur(); };
$('note').onclick = dismissNote;
$('pauseOv').onclick = function () { setPause(false); };
window.addEventListener('resize', function () { layout(); if (mode === 'map' && world) layoutWorld(); });
document.addEventListener('visibilitychange', function () { if (document.hidden) { stopAll(); if (mode === 'drive') setPause(true); } });

/* platform hooks */
window.addEventListener('message', function (e) {
  var d = e.data; if (!d || typeof d !== 'object') return;
  if (d.type === 'cc-mute') { extMuted = !!d.muted; if (extMuted) stopAll(); }
  else if (d.type === 'cc-pause') { setPause(d.paused == null ? true : !!d.paused); }
  else if (d.type === 'cc-restart') { setPause(false); if (cur && cur.idx != null && mode !== 'map') loadLevel(cur.idx); else loadLevel(firstOpen()); }
});
function firstOpen() { for (var i = 0; i < L.LEVELS.length; i++) if (!finished(i)) return i; return L.LEVELS.length - 1; }

/* ---------------- cover shot ---------------- */
function drawShotTitle(c, t) {
  var side = W > H * 1.3, fs = side ? W * 0.068 : Math.min(W * 0.13, H * 0.08), x = side ? W * 0.035 : W * 0.05, y = side ? H * 0.3 : H * 0.03;
  c.save(); c.textAlign = 'left'; c.textBaseline = 'top'; c.lineJoin = 'round';
  c.font = '900 ' + fs + 'px ' + FONT; c.lineWidth = fs * 0.16; c.strokeStyle = '#0b0a1f';
  var lines = side ? ['ghost', 'bus'] : ['ghost bus'];
  lines.forEach(function (l, i) { c.strokeText(l, x, y + i * fs * 1.0); c.fillStyle = i ? '#ffc93c' : '#fff'; c.fillText(l, x, y + i * fs * 1.0); });
  var sy = y + lines.length * fs * 1.02 + fs * 0.08, ss = fs * (side ? 0.3 : 0.32);
  c.font = '800 ' + ss + 'px ' + FONT; c.lineWidth = ss * 0.3;
  var sub = side ? ['the last bus.', 'the dead are waiting.'] : ['the last bus. the dead are waiting.'];
  sub.forEach(function (l, i) { c.strokeText(l, x + 2, sy + i * ss * 1.25); c.fillStyle = '#c9c1ff'; c.fillText(l, x + 2, sy + i * ss * 1.25); });
  c.restore();
}
function setupShot() {
  document.body.classList.add('shot');
  loadLevel(16); dismissNote();
  var A = cur.A; cur.route = A.happyRoute.slice(); updatePreview();
  go(); bubbles = [];
  /* fast-forward to a nice moment: a few ghosts aboard */
  var target = Math.floor((cur.route.length - 1) * 0.42);
  for (var k = 0; k < 4000 && drive && drive.i < target; k++) stepDrive(1 / 30);
  drive.t = 0.45; drive.wait = 0; drive.speed = 0;
  bubbles = []; particles = [];
  cur.vis.forEach(function (v) { if (v.mode === 'fly') { v.k = 1; v.mode = v.into ? 'bus' : 'gone'; } if (v.mode === 'home') v.mode = 'gone'; });
  var bp0 = busPos(); say({ x: bp0.x, y: bp0.y - cell * 0.4 }, 'next stop: the dinner party.', 999, '#ffc93c');
}

/* ---------------- test hooks ---------------- */
if (TEST) {
  window.__gb = {
    state: function () { return { mode: mode, level: cur ? lvlLabel(cur.idx) : null, route: cur ? cur.route.slice() : [], len: cur ? cur.route.length - 1 : 0, par: cur ? cur.A.par : 0, dawn: cur ? cur.A.dawn : 0, happy: cur ? cur.A.happy : 0, sim: cur && cur.sim ? { done: cur.sim.done, happy: cur.sim.happy, st: cur.sim.S.st.slice() } : null, stars: save.stars, total: totalStars(), modal: !$('modal').classList.contains('hide'), drive: drive ? { i: drive.i, n: drive.route.length - 1 } : null, nodes: NP.map(function (p) { return [Math.round(p.x), Math.round(p.y)]; }), chip: CHIP, cell: cell, muted: muted(), audio: Object.keys(pool).reduce(function (n, k) { return n + pool[k].length; }, 0), world: world && world.stops ? world.stops.map(function (p) { return [Math.round(p.x), Math.round(p.y)]; }) : null, ghostHome: cur && mode === 'plan' ? cur.P.ghosts.map(function (g, i) { var h = ghostHome(i); return [Math.round(h.x), Math.round(h.y)]; }) : null }; },
    level: function (n) { loadLevel(n === 'daily' ? 'daily' : n - 1); dismissNote(); return lvlLabel(cur.idx); },
    solve: function (fast) { if (mode !== 'plan') backToPlan(); cur.route = cur.A.happyRoute.slice(); if (cur.A.happy === cur.A.par) cur.route = cur.A.happyRoute.slice(); updatePreview(); go(); if (fast !== false) drive.base = drive.speed = 40; return cur.route.length - 1; },
    route: function (r) { cur.route = r.slice(); updatePreview(); return cur.sim.done; },
    win: function () { if (mode !== 'plan') backToPlan(); cur.route = cur.A.happyRoute.slice(); updatePreview(); drive = { route: cur.route.slice(), i: cur.route.length - 1, t: 0, S: cur.sim.S, seatOf: [], face: 1, honk: 0 }; mode = 'end'; win(cur.sim, cur.route.length - 1); return true; },
    unlockAll: function () { save.all = 1; for (var i = 0; i < L.LEVELS.length; i++) save.stars[i] = save.stars[i] | 1; storeSave(); if (mode === 'map') openMap(); return true; },
    analyse: function (n) { return L.analyse(L.parse(L.LEVELS[n - 1])); }
  };
}

/* ---------------- boot ---------------- */
setMuteIcon();
layout();
requestAnimationFrame(frame);
if (SHOT) setupShot();
else if (Q.has('level')) loadLevel(Math.max(0, Math.min(39, (+Q.get('level') || 1) - 1)));
else if (!Object.keys(save.stars).length) loadLevel(0);   /* first time: straight into route 1 */
else openMap();
})();
