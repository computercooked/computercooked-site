// level devil.exe · computer cooked games
// a troll platformer: the floor, the exit, the cursor and the taskbar all want you dead.
(() => {
'use strict';

const URL_TXT = 'computercooked.com/games/level-devil-exe';
const CARBON = '#101114', LIME = '#C5FF49', LILAC = '#B59AFF', PAPER = '#F5F3ED', PINK = '#FF4FA0', BSOD = '#1e5bd6';
const FONT = 'ui-monospace,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace';
const T = 20, COLS = 24, ROWS = 13, WW = COLS * T, WH = ROWS * T;
const PW = 12, PH = 16;
const GRAV = 1000, JUMP = 310, MAXV = 120, MAXFALL = 430, SPRING = 560;
const COYOTE = 0.1, BUFFER = 0.13;

// ---------- levels ----------
const FULL = '########################', EMPTY = '#......................#';
function M(rows) { const m = []; for (let r = 0; r < ROWS; r++) m.push(rows[r] || (r === 0 || r === 12 ? FULL : EMPTY)); return m; }
const TUN = {}; for (let r = 1; r <= 8; r++) TUN[r] = FULL;

const LEVELS = [
  // the 2-high wall is a step now: a tap-jump on a phone (~0.1s) only clears 1 tile, and a full 2 tiles needs a 0.2s hold
  { n: 'hello_world.exe', sign: 'arrows / a d to move. up / w / space to jump.', signTouch: '◀ ▶ to move. tap jump to hop, hold it to jump higher.', map: M({ 10: '#..............#.......#', 11: '#.S.....##....##.....E.#' }) },
  { n: 'hello_world (1).exe', sign: 'this one is also normal. promise.', map: M({ 10: '#..............#.......#', 11: '#.S.....##....##.....E.#', 12: '#################ccc####' }), R: { c: 1.5 } },
  { n: 'spikes.dll', sign: 'spikes are pink. pink is bad.', map: M({ 11: '#.S....^.....h.....^.E.#' }), alt: [{ d: 3, e: [[13, 11, '^'], [16, 11, 'h']] }] },
  { n: 'shy_exit.exe', sign: 'the exit is a little shy.', map: M({ 7: '#..........##..........#', 8: '#..........##..........#', 9: '#........######........#', 10: '#........######........#', 11: '#...S..##########...E..#' }), run: [[2, 11], [11, 6]] },
  { n: 'ceiling.sys', sign: 'the ceiling is load-bearing. mostly.', map: M({ 1: '#.......d...d...d......#', 11: '#.S..................E.#' }), R: { d: 2.2 } },
  { n: 'floor_is_fine.tmp', sign: 'the floor is fine :)', map: M({ 8: '#.....########.........#', 10: '#..##..................#', 11: '#.S.................E..#', 12: '#####ffffffffff#########' }), alt: [{ d: 3, e: [[5, 12, 'F'], [6, 12, 'F'], [7, 12, 'F'], [8, 12, 'F'], [9, 12, 'F'], [10, 12, 'F'], [11, 12, 'F'], [12, 12, 'F'], [13, 12, 'F'], [14, 12, 'F']] }] },
  { n: 'invisible_stairs.ini', sign: 'the stairs are there. have faith.', map: M({ 3: '#....................E.#', 4: '#................#######', 6: '#.............i........#', 8: '#..........i...........#', 10: '#.......i..............#', 11: '#.S....................#' }), alt: [{ d: 1, e: [[8, 10, '#']] }, { d: 4, e: [[11, 8, '#'], [14, 6, '#']] }] },
  { n: 'checkpoint.bak', sign: 'checkpoints save your progress!', map: M({ 11: '#.S.......k.........E..#', 12: '##########CCCCCCC#######' }) },
  { n: 'gravity.cfg', sign: 'what goes up must come down. eventually.', map: M({ 1: '#..........v.......g...#', 11: '#.S.g^^^^^^^^^^^^^^..E.#' }) },
  { n: 'are_you_sure.msg', sign: 'windows need closing. [x] is top right.', map: M({ 11: '#.S.......#..........E.#' }), popups: [{ x: 7, r: [12, 9, 6, 3], t: 'are you sure?' }, { x: 18, r: [19, 10, 4, 2], t: 'exit.exe busy' }] },
  { n: 'cursor.exe', sign: 'that bridge looks very deletable.', map: M({ 10: '#.......#..#..#........#', 11: '#.S..................E.#', 12: '#######zzzzzzzzzz#######' }), cursor: { x: 8, fly: 0.45, sel: 0.35 }, alt: [{ d: 3, cursor: { x: 8, fly: 0.9, sel: 0.6 } }] },
  { n: 'springs_are_safe.cfg', sign: 'springs: 100% safe. (one is not.)', map: M({ 1: '#..........vvvvv.......#', 6: '#............p.........#', 7: '#........#####.........#', 9: '#...............#......#', 11: '#.S..p^^^^^^^^^^^^^..E.#' }) },
  { n: 'controls.reg', sign: 'controls.reg was modified by someone.', map: M({ 8: '#.......rrrrrrrr.......#', 9: '#.......rrrrrrrr.......#', 10: '#.......rrrrrrrr.......#', 11: '#.S.....rrr^rrrr..^..E.#' }) },
  { n: 'taskbar_update.msi', sign: 'installing taskbar update. please climb.', map: M({ 1: '#..................E...#', 2: '#.................######', 4: '#.............###......#', 6: '#.........###..........#', 8: '#.....###..............#', 10: '#.###..................#', 11: '#S.....................#' }), taskbar: { x: 3, speed: 16 } },
  { n: 'everything.zip', sign: 'a little bit of everything.', map: M({ 11: '#.S....h...........^.E.#', 12: '##########ccc###########' }), run: [[3, 11]] },
  { n: 'popup_walls.dll', sign: 'walls appear when you least expect it. now.', map: M({ 10: '#................u.....#', 11: '#.S....u....u....u.h.E.#' }), alt: [{ d: 4, e: [[19, 11, '.']] }] },
  { n: 'shortcut.lnk', sign: "the exit's right there :)", map: M({ 5: '#....................E.#', 6: '#..................#####', 8: '#..............##......#', 10: '#...........##.........#', 11: '#.S...x................#' }) },
  { n: 'rain.wav', sign: 'forecast: 100% chance of blocks.', map: M({ 1: '#....d.d.d.d.d.d.d.d...#', 11: '#.S..................E.#' }), R: { d: 1.0 }, alt: [{ d: 4, R: { d: 0.45 } }] },
  { n: 'stairs.bak', sign: 'keep moving. the stairs are tired.', map: M({ 3: '#....................E.#', 4: '#...........cc..########', 6: '#........cc............#', 8: '#.....cc...............#', 10: '#..cc..................#', 11: '#S.^^^^^^^^^^^^^.......#' }), R: { c: 0.6 }, shake: 0.32 },
  { n: 'drag_and_drop.exe', sign: 'someone is moving your files.', map: M({ 8: '#..........###.........#', 10: '#........#.............#', 11: '#.....S.............E..#' }), run: [[3, 11], [12, 7], [20, 11]], drag: true },
  { n: 'low_ceiling.sys', sign: 'small hops. tap jump lightly.', map: M(Object.assign({}, TUN, { 9: '#.......h....h....h....#', 11: '#.S....h....h....h...E.#' })) },
  { n: 'look_up.txt', sign: 'look up.', map: M({ 9: '#.......iiiii..........#', 10: '#.....#................#', 11: '#.S......^^^.........E.#' }), alt: [{ d: 3, e: [[8, 9, '#'], [9, 9, '#'], [10, 9, '#'], [11, 9, '#'], [12, 9, '#']] }] },
  { n: 'helpful_popups.hta', sign: 'this level has no stairs. good luck.', map: M({ 3: '#....................E.#', 4: '#...................####', 11: '#.S....................#' }), popups: [{ x: 3, r: [6, 10, 5, 2], t: 'help.txt' }, { x: 7, r: [12, 8, 4, 2], t: 'tip' }, { x: 11, r: [17, 6, 2, 2], t: 'ok' }] },
  { n: 'taskbar_update (2).msi', sign: 'the update failed. installing again.', map: M({ 1: '#..E...................#', 2: '######.................#', 4: '#......###.............#', 6: '#..........###.........#', 8: '#..............ccc.....#', 10: '#..................###.#', 11: '#.....................S#' }), taskbar: { x: 20, dir: -1, speed: 18 }, R: { c: 0.7 } },
  { n: 'gravity_maze.cfg', sign: 'up is a suggestion.', map: M({ 1: '#..........gvvvvv....g.#', 11: '#.S..g^^^^^....h.g^^^E.#' }) },
  { n: 'shy_exit (2).exe', sign: 'the exit has been practicing.', map: M({ 5: '#.........#####........#', 11: '#.S....p...........E...#' }), run: [[2, 11], [12, 4]] },
  { n: 'chase.exe', sign: 'do not look back. (it is deleting the floor.)', map: M({ 11: '#.S.....^....^....^..E.#', 12: '#zzzzzzzzzzzzzzzzzzzz###' }), chase: { x: 3, speed: 80 }, alt: [{ d: 3, chase: { x: 3, speed: 64 } }] },
  { n: 'real_checkpoint.sav', sign: "this checkpoint is real. probably.", map: M({ 1: '#..............d...d...#', 11: '#.S...h.....K......^.E.#', 12: '#########ccc############' }), R: { d: 2.0 } },
  { n: 'reverse_bridge.reg', sign: 'left is right. the bridge is leaving.', map: M({ 8: '#.....rrrrrrrrrr.......#', 9: '#.....rrrrrrrrrr.......#', 10: '#.....rrrrrrrrrr.......#', 11: '#.S...rrrrrrrrrr....E..#', 12: '#######cccccccc#########' }), R: { c: 0.7 } },
  { n: 'final_boss.exe', sign: 'final_boss.exe has entered the chat.', map: M({ 2: '###....................#', 4: '#...#..................#', 5: '#..E........#..........#', 6: '#################......#', 8: '#.................##...#', 10: '#...................##.#', 11: '#.S....................#', 12: '######zzzzzz############' }), cursor: { x: 7, fly: 0.5, sel: 0.45 }, taskbar: { x: 13, speed: 5 }, run: [[1, 1]], popups: [{ x: 15, dir: -1, ymax: 6, r: [8, 3, 3, 3], t: 'really sure?' }], alt: [{ d: 3, cursor: { x: 7, fly: 0.8, sel: 0.6 } }] },
  // patch 2.0 pack (levels 31-35, oct 2026): remixes of the old tricks, ramping back up after the boss
  { n: 'patch_notes.txt', sign: 'patch 2.0: we fixed the floor. (we did not.)', map: M({ 10: '#........####..........#', 11: '#.S.....^...........h.E#', 12: '#########ffff##fff######' }), alt: [{ d: 2, e: [[9, 12, 'F'], [10, 12, 'F'], [11, 12, 'F'], [12, 12, 'F'], [15, 12, 'F'], [16, 12, 'F'], [17, 12, 'F']] }] },
  { n: 'cloud_sync.dll', sign: 'syncing your files to the cloud. they are coming back down.', map: M({ 1: '#.......d..d..d........#', 5: '#..E...............K...#', 6: '####################...#', 11: '#.S......k.......h...p.#', 12: '##########CCCCCC########' }), fullSpring: true },
  { n: 'antivirus.exe', sign: 'antivirus is scanning your floor. do not stand still.', map: M({ 7: '#...............###....#', 11: '#.S....^.....^.......pE#', 12: '#zzzzzzzzzzzzzzzzzzzz###' }), run: [[17, 6]], chase: { x: 3, speed: 64 }, fullSpring: true, alt: [{ d: 3, chase: { x: 3, speed: 50 } }] },
  { n: 'safe_mode.sys', sign: 'safe mode: upside down, controls swapped. for your safety.', map: M({ 1: '#.......rrrvrrr....g...#', 2: '#.......rrrrrrr........#', 3: '#.......rrrrrrr........#', 4: '#.......rrrrrrr........#', 11: '#.S.g^^^^^^^^^^^^^^..E.#' }), popups: [{ x: 19, r: [19, 9, 4, 3], t: 'restart now?' }] },
  { n: 'uninstall.exe', sign: 'uninstalling level devil.exe. please do not climb.', map: M({ 1: '#.................E....#', 2: '#.................######', 4: '#.............ccc......#', 6: '#.........ccc..........#', 8: '#.....###..............#', 10: '#.###..................#', 11: '#S.....................#' }), taskbar: { x: 3, speed: 14 }, run: [[22, 1]], R: { c: 0.9 }, shake: 0.45 },
  { n: 'credits.txt', sign: 'thanks for playing. crash is proud of you. kind of.', map: M({ 11: '#.S..................E.#' }), run: [[2, 11]], credits: true },
];

// 2.4: after 3 deaths on a level the blue screen adds a hint, so a stuck player learns the trick instead of quitting
const HINTS = ['hold jump for the tall step.', 'the floor by the exit crumbles. long jump off the step.', 'a spike pops up mid-floor. jump a tile early.',
  'the exit runs. follow it up the tower.', "blocks drop when you get close. don't stop under them.", 'the middle floor is fake. take the high ledge.',
  'the stairs are invisible, not missing. hop up and right.', 'the checkpoint is the trap. jump over the flag.', 'flip at the pad, walk the ceiling, hop its spike.',
  'pop-ups are walls. jump onto the [x] to close them.', 'the bridge gets deleted. hop along the little pillars.', 'spring #2 is the bad one. stay off it.',
  'in the purple zone, left is right.', "the taskbar rises. climb, don't wait.", 'the exit runs back to the start. so do you.', 'walls pop up as you get near. jump early.',
  'the close exit is malware. climb to the real one.', 'keep moving. blocks land where you stand.', "the stairs crumble. don't stop on them.",
  'someone drags the exit. chase it.', 'tiny taps on jump. the ceiling is low.', 'there is an invisible ceiling. short hops.', "the pop-ups are the stairs. don't close them.",
  "climb fast. some steps crumble.", 'flip, flip back. watch the ceiling spikes.', 'the exit runs up. the spring follows it.', 'the floor gets deleted behind you. never stop.',
  'this flag is real. the falling files are not friendly.', 'left is right and the bridge is leaving. hold the wrong way.', 'everything at once. the exit runs to the top left.',
  'the floor is fake again. take the ledge.', 'the first flag lies. the spring takes you up.', 'the floor gets deleted. the spring at the end saves you.',
  'upside down, controls swapped. flip at the pad.', "climb fast. some steps crumble.", 'the exit runs back. go get it.'];

// ---------- save ----------
let save = { unlocked: 1, deaths: 0, best: 0, bestDeaths: 0, muted: false, hw: null, cleared: 0 };
try { const s = JSON.parse(localStorage.getItem('cc-level-devil') || 'null'); if (s && typeof s === 'object') save = Object.assign(save, s); } catch (e) {}
function persist() { try { localStorage.setItem('cc-level-devil', JSON.stringify(save)); } catch (e) {} }
// v2 (patch 2.0): 5 levels went in before credits.txt, which moved from 31 to 36. anyone who had reached the
// old credits lands on the first new level instead of skipping it.
let patchNews = false;
if (!save.v) { if (save.cleared >= 30) { patchNews = true; save.cleared = 30; save.unlocked = Math.max(save.unlocked, 31); } save.v = 2; persist(); }
// deaths per level, keyed by level name so inserting levels never shuffles them
if (!save.lvd || typeof save.lvd !== 'object') save.lvd = {};
// 2.4: per-level records (best clear time incl. deaths, fewest deaths in a clear), keyed by name like lvd.
// a "clean file" = a level cleared with 0 deaths. goals: id -> day hit. daily file: one level a day, clear it clean.
if (!save.lb || typeof save.lb !== 'object') save.lb = {};
if (!save.goals || typeof save.goals !== 'object') save.goals = {};
if (!save.daily || typeof save.daily !== 'object') save.daily = { day: '', done: false, streak: 0, last: '' };
function cleanCount() { let n = 0; for (const d of LEVELS) { const r = save.lb[d.n]; if (r && r.d === 0) n++; } return n; }
function nemesis() { let best = null; LEVELS.forEach((d, i) => { const n = save.lvd[d.n] || 0; if (n > 0 && (!best || n > best.n)) best = { lv: i + 1, name: d.n, n }; }); return best; }
const NOW = new Date();
let hw = save.hw === null || save.hw === undefined ? NOW.getMonth() === 9 : !!save.hw;
let muted = !!save.muted;

// ---------- 2.4: folders, goals, daily file ----------
const FOLDERS = ['hello', 'system32', 'downloads', 'temp', 'boss', 'patch 2.0'];   // 6 levels each
const dayKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const TODAY = dayKey(NOW), YDAY = dayKey(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 1));
const bestT = () => { let b = 0; for (const d of LEVELS) { const r = save.lb[d.n]; if (r && r.t && (!b || r.t < b)) b = r.t; } return b; };
// pace (cc-lead, nov 17): ~4-5 land in a first sitting, the rest take days (daily streak, later folders, all clean)
const GOALS = [
  { id: 'hello', t: 'clear level 1', p: () => [Math.min(1, save.cleared), 1] },
  { id: 'bsod10', t: 'see 10 blue screens', p: () => [Math.min(10, save.deaths), 10] },
  { id: 'clean3', t: '3 clean files (0 deaths)', p: () => [Math.min(3, cleanCount()), 3] },
  { id: 'f1', t: 'clear folder 1 (lvl 1-6)', p: () => [Math.min(6, save.cleared), 6] },
  { id: 'fast4', t: 'clear a level in under 4s', p: () => { const b = bestT(); return [b && b < 4 ? 1 : 0, 1]; } },
  { id: 'daily1', t: 'clean the daily file', p: () => [save.daily.streak > 0 || save.daily.last ? 1 : 0, 1] },
  { id: 'f2', t: 'clear folder 2 (lvl 7-12)', p: () => [Math.max(0, Math.min(6, save.cleared - 6)), 6] },
  { id: 'clean12', t: '12 clean files', p: () => [Math.min(12, cleanCount()), 12] },
  { id: 'streak3', t: 'daily file 3 days in a row', p: () => [Math.min(3, save.daily.streak || 0), 3] },
  { id: 'boss', t: 'beat final_boss.exe (lvl 30)', p: () => [Math.min(30, save.cleared), 30] },
  { id: 'all', t: 'beat all 36 levels', p: () => [Math.min(36, save.cleared), 36] },
  { id: 'streak7', t: 'daily file 7 days in a row', p: () => [Math.min(7, save.daily.streak || 0), 7] },
  { id: 'clean36', t: 'all 36 clean', p: () => [cleanCount(), 36] },
  { id: 'sub10', t: 'full speedrun under 10:00', p: () => [save.best && save.best < 600 ? 1 : 0, 1] },
];
const goalsDone = () => GOALS.filter(g => save.goals[g.id]).length;
function nextGoal() { for (const g of GOALS) if (!save.goals[g.id]) return g; return null; }
// returns the goals newly hit (marked with today's date); the caller toasts them
function checkGoals() { const hit = []; for (const g of GOALS) if (!save.goals[g.id]) { const [a, b] = g.p(); if (a >= b) { save.goals[g.id] = TODAY; hit.push(g); } } if (hit.length) persist(); return hit; }
// daily file: picked once per day from the levels you've already cleared (level 1 for a brand-new player)
function dailyLv() {
  const D = save.daily;
  if (D.day !== TODAY) { let h = 7; for (const ch of TODAY) h = (h * 31 + ch.charCodeAt(0)) >>> 0; const pool = Math.max(1, Math.min(LEVELS.length - 1, save.cleared)); D.day = TODAY; D.done = false; D.lv = h % pool; if (D.last !== TODAY && D.last !== YDAY) D.streak = 0; persist(); }
  return D.lv;
}
// the old saves get their goals quietly (no toast storm on the first load after the update)
checkGoals();

// ---------- sdk ----------
function ccCall(fn, ...a) { try { const c = window.cc; if (c && typeof c[fn] === 'function') c[fn](...a); } catch (e) {} }
let eventsSent = 0;
function ccEvent(n, d) { if (eventsSent >= 18) return; eventsSent++; ccCall('event', n, d || {}); }
const run = { open: false, startMs: 0, cleared: 0, deaths: 0, pts: 0 };
function runStart() { if (run.open) return; run.open = true; run.startMs = performance.now(); run.cleared = 0; run.deaths = 0; run.pts = 0; ccCall('start'); }
// 2.4: each clear scores 100, minus 2 per death on that level (at most -50), plus a speed bonus (up to +20, 1 per
// second under 20 s). So a clear is always 50+, and two clean runs no longer tie: the faster one wins a dare.
function clearPts(deaths, t) { return 100 - Math.min(50, deaths * 2) + Math.max(0, 20 - Math.floor(t)); }
function runScore() { return run.pts; }
// A run is one sitting: first move → finishing level 36, a new speedrun, or leaving the tab/app. It counts as
// completed (not a quit) once it cleared at least one level, so the weekly "levels in one run" goal and
// completion rate see real sessions.
function runEnd(completed) {
  if (!run.open) return; run.open = false;
  completed = completed || run.cleared > 0;
  // deaths ride along on cc.end (the sdk ignores extra fields today) and as one run_end event the platform does store
  const nm = nemesis(), extra = { deaths: run.deaths, level: lvIndex + 1, nemesis: nm ? nm.lv : 0, nemesisDeaths: nm ? nm.n : 0 };
  ccCall('event', 'run_end', extra);
  ccCall('end', Object.assign({ score: runScore(), durationMs: Math.round(performance.now() - run.startMs), completed }, extra));
}

// ---------- audio ----------
let AC = null, master = null;
function ensureAudio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(AC.destination); } catch (e) { AC = null; } }
  if (AC && AC.state === 'suspended') AC.resume().catch(() => {});
}
function tone(f, dur, type, vol, f2, delay) {
  if (!AC || muted) return;
  const t0 = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
  o.type = type || 'square'; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
}
function noise(dur, vol) {
  if (!AC || muted) return;
  const n = Math.floor(AC.sampleRate * dur), b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = AC.createBufferSource(), g = AC.createGain(); s.buffer = b; g.gain.value = vol; s.connect(g); g.connect(master); s.start();
}
function sfx(k) {
  if (!AC || muted) return;
  if (k === 'jump') tone(420, 0.09, 'square', 0.06, 760);
  else if (k === 'land') tone(120, 0.05, 'triangle', 0.05);
  else if (k === 'die') { noise(0.25, 0.18); tone(300, 0.35, 'sawtooth', 0.08, 60); tone(880, 0.12, 'square', 0.05, 0, 0.18); tone(660, 0.18, 'square', 0.05, 0, 0.3); }
  else if (k === 'win') [0, 4, 7, 12].forEach((s, i) => tone(523 * Math.pow(2, s / 12), 0.12, 'triangle', 0.09, 0, i * 0.06));
  else if (k === 'crumble') noise(0.18, 0.08);
  else if (k === 'pop') tone(900, 0.08, 'square', 0.05, 300);
  else if (k === 'spring') tone(200, 0.2, 'triangle', 0.1, 900);
  else if (k === 'flip') tone(600, 0.15, 'sine', 0.08, 200);
  else if (k === 'nope') { tone(500, 0.07, 'square', 0.05, 0); tone(380, 0.1, 'square', 0.05, 0, 0.08); }
  else if (k === 'ding') { tone(1046, 0.25, 'triangle', 0.08); tone(784, 0.3, 'triangle', 0.06, 0, 0.12); }
  else if (k === 'click') tone(1400, 0.02, 'square', 0.03);
  else if (k === 'delete') { noise(0.12, 0.1); tone(700, 0.15, 'square', 0.04, 150); }
}
function setMuted(m) { muted = !!m; save.muted = muted; persist(); if (master) master.gain.value = muted ? 0 : 0.5; }

// ---------- state ----------
let L = null;           // current level runtime
let lvIndex = 0;
let mode = 'play';      // play | dead | win | menu | end
let menuFrom = 'play';
let paused = false;
let clock = 0;
let speedrun = { t: 0, valid: true, deaths: 0, on: false };
let deadT = 0, deathMsg = '', winT = 0;
let lvClock = 0;        // 2.4: time on this level since it was opened fresh, deaths included (counts once a run is open)
let pops = [];          // 2.4: floating text in world space (+points, clean!, new best)
let parts = [];
let toastMsg = '', toastT = 0;
const keys = { l: false, r: false, j: false };
const touch = { l: false, r: false, j: false };
let jumpHeldPrev = false;
let isTouch = false;
let anyInput = false;
try { isTouch = window.matchMedia && matchMedia('(pointer: coarse)').matches; } catch (e) {}

function hdirAt(g, x, y) { const below = y + 1 < ROWS ? g[y + 1][x] : '.'; return below === '#' || below === 'c' || below === 'z' ? 1 : -1; }

function loadLevel(i, keepCheckpoint) {
  lvIndex = i;
  const def = LEVELS[i];
  const deathsHere = L && L.idx === i ? L.deaths : 0;
  const cp = keepCheckpoint && L && L.idx === i ? L.checkpoint : null;
  const opt = { R: Object.assign({ c: 1.3, h: 1.25, u: 1.7, d: 0.8 }, def.R || {}), cursor: def.cursor, chase: def.chase, shake: def.shake || 0.18 };
  const g = def.map.map(r => r.split(''));
  for (const a of def.alt || []) if (deathsHere >= a.d) { for (const [x, y, ch] of a.e || []) g[y][x] = ch; if (a.R) Object.assign(opt.R, a.R); if (a.cursor) opt.cursor = a.cursor; if (a.chase) opt.chase = a.chase; }
  const st = { idx: i, def, g, opt, deaths: deathsHere, checkpoint: cp, start: null, exit: null, ents: [], falls: [], debris: [], springs: [], pads: [], flags: [], popups: [], hdir: {},
    cursor: null, chase: null, taskbar: null, runIdx: 0, exitAnim: null, t: 0, signT: 0, gs: 1, flipCd: 0, msg: '', msgT: 0, touchedInvis: {}, fakeExits: [] };
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const ch = g[y][x];
    if (ch === 'S') { st.start = { x, y }; g[y][x] = '.'; }
    else if (ch === 'E') { st.exit = { x: x * T, y: y * T }; g[y][x] = '.'; }
    else if (ch === 'x') { st.fakeExits.push({ x: x * T, y: y * T }); g[y][x] = '.'; }
    else if (ch === 'p') { st.springs.push({ x, y, t: 0 }); g[y][x] = '.'; }
    else if (ch === 'g') { st.pads.push({ x, y, up: y < ROWS / 2 }); g[y][x] = '.'; }
    else if (ch === 'k' || ch === 'K') { st.flags.push({ x, y, real: ch === 'K', hit: false }); g[y][x] = '.'; }
    else if (ch === 'h') st.hdir[x + ',' + y] = hdirAt(g, x, y);
  }
  if (def.popups) for (const p of def.popups) st.popups.push(Object.assign({ state: 0, a: 0 }, p));
  if (opt.cursor) st.cursor = Object.assign({ state: 0, t: 0, x: WW + 20, y: -20 }, opt.cursor);
  if (opt.chase) st.chase = Object.assign({ on: false, cx: -10 }, opt.chase);
  if (def.taskbar) st.taskbar = Object.assign({ on: false, y: WH + 4 }, def.taskbar);
  const sp = cp || st.start;
  st.p = { x: sp.x * T + (T - PW) / 2, y: sp.y * T + T - PH, vx: 0, vy: 0, ground: false, coyote: 0, buf: 0, face: 1, cut: false, sq: 0, alive: true };
  if (cp) for (const f of st.flags) if (f.real && f.x === cp.x && f.y === cp.y) f.hit = true;
  L = st;
  mode = 'play';
}

function startLevel(i, fresh) { loadLevel(i, false); L.signT = 4; if (fresh) L.deaths = 0; lvClock = 0; }

// ---------- collision ----------
function solidTile(x, y) {
  if (x < 0 || x >= COLS) return true;
  if (y < 0 || y >= ROWS) return false;
  const c = L.g[y][x];
  return c === '#' || c === 'c' || c === 'C' || c === 'i' || c === 'U' || c === 'z' || c === 'd' || c === 'q';
}
function popupRect(p) { return { x: p.r[0] * T, y: p.r[1] * T, w: p.r[2] * T, h: p.r[3] * T }; }
function overlapSolid(x, y, w, h) {
  const x0 = Math.floor(x / T), x1 = Math.floor((x + w - 0.001) / T), y0 = Math.floor(y / T), y1 = Math.floor((y + h - 0.001) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solidTile(tx, ty)) {
    if (ty >= 0 && ty < ROWS && tx >= 0 && tx < COLS && L.g[ty][tx] === 'i') L.touchedInvis[tx + ',' + ty] = 1;
    return { x: tx * T, y: ty * T, w: T, h: T };
  }
  for (const p of L.popups) if (p.state === 1) { const r = popupRect(p); if (x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y) return r; }
  return null;
}

// ---------- update ----------
function input() {
  let l = keys.l || touch.l, r = keys.r || touch.r;
  const pc = L.p, cx = Math.floor((pc.x + PW / 2) / T), cy = Math.floor((pc.y + PH / 2) / T);
  if (cy >= 0 && cy < ROWS && cx >= 0 && cx < COLS && L.g[cy][cx] === 'r') { const t = l; l = r; r = t; }
  return { dir: (r ? 1 : 0) - (l ? 1 : 0), jump: keys.j || touch.j };
}

function kill(msg) {
  if (mode !== 'play') return;
  mode = 'dead'; deadT = 0; deathMsg = msg;
  L.deaths++; save.deaths++; speedrun.deaths++; run.deaths++; save.lvd[L.def.n] = (save.lvd[L.def.n] || 0) + 1; persist();
  const p = L.p;
  for (let i = 0; i < 24; i++) { const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 200; parts.push({ x: p.x + PW / 2, y: p.y + PH / 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 100, life: 0.6, max: 0.6, s: 2 + Math.random() * 3, col: i % 3 ? '#d9c9a3' : LIME }); }
  sfx('die');
  if (isTouch && navigator.userActivation && navigator.userActivation.hasBeenActive) { try { if (navigator.vibrate) navigator.vibrate(35); } catch (e) {} }   // 2.2: a short buzz on death (phones that support it)
  if (L.deaths === 10) ccEvent('rage', { lv: lvIndex + 1 });
}

function trigOk(o, px, py) { const tx = (px + PW / 2) / T, ty = (py + PH / 2) / T; return (o.dir === -1 ? tx <= o.x + 1 : tx >= o.x) && (o.ymax === undefined || ty <= o.ymax + 1); }

function stepPlayer(dt) {
  const p = L.p, inp = input(), gs = L.gs;
  // horizontal
  const acc = p.ground ? 1500 : 1000;
  if (inp.dir) { p.vx += inp.dir * acc * dt; p.face = inp.dir; }
  else { const dec = (p.ground ? 1800 : 600) * dt; p.vx = Math.abs(p.vx) <= dec ? 0 : p.vx - Math.sign(p.vx) * dec; }
  p.vx = Math.max(-MAXV, Math.min(MAXV, p.vx));
  // jump buffering + coyote
  if (inp.jump && !jumpHeldPrev) p.buf = BUFFER;
  jumpHeldPrev = inp.jump;
  p.buf -= dt; p.coyote -= dt;
  if (p.buf > 0 && p.coyote > 0) { p.vy = -JUMP * gs; p.buf = 0; p.coyote = 0; p.ground = false; p.cut = false; sfx('jump'); if (!run.open) runStart(); }
  if (!inp.jump && !p.cut && p.vy * gs < 0) { p.vy *= 0.45; p.cut = true; }
  p.vy += GRAV * gs * dt;
  if (p.vy * gs > MAXFALL) p.vy = MAXFALL * gs;
  if (inp.dir && !run.open) runStart();
  // move x
  p.x += p.vx * dt;
  let hit = overlapSolid(p.x, p.y, PW, PH);
  if (hit) { if (p.vx > 0) p.x = hit.x - PW; else if (p.vx < 0) p.x = hit.x + hit.w; else { const c = hit.x + hit.w / 2; p.x = p.x + PW / 2 < c ? hit.x - PW : hit.x + hit.w; } p.vx = 0; }
  // move y
  const wasGround = p.ground; p.ground = false;
  p.y += p.vy * dt;
  hit = overlapSolid(p.x, p.y, PW, PH);
  if (hit) {
    if (p.vy > 0) { p.y = hit.y - PH; if (gs > 0) p.ground = true; }
    else if (p.vy < 0) { p.y = hit.y + hit.h; if (gs < 0) p.ground = true; }
    if (Math.abs(p.vy) > 200 && p.ground) { p.sq = 1; sfx('land'); }
    p.vy = 0;
  }
  if (p.ground) p.coyote = COYOTE;
  p.sq = Math.max(0, p.sq - dt * 6);
  // still stuck inside something (popup/wall appeared)? squish
  if (overlapSolid(p.x + 2, p.y + 2, PW - 4, PH - 4)) kill('CRUSHED_BY_A_SURPRISE_WALL');
  if (p.y > WH + 30 || p.y < -60) kill(p.y > 0 ? 'PAGE_FAULT_IN_NONPAGED_AREA (you fell)' : 'STACK_OVERFLOW (you fell up)');
  return wasGround;
}

function rectHit(ax, ay, aw, ah, bx, by, bw, bh) { return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by; }

function update(dt) {
  clock += dt;
  if (toastT > 0) toastT -= dt; else if (toastQ.length) { toastMsg = toastQ.shift(); toastT = 2.4; }
  for (const q of pops) { q.life -= dt; q.y -= 16 * dt; }
  if (pops.length) pops = pops.filter(q => q.life > 0);
  for (const q of parts) { q.life -= dt; q.vy += 700 * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
  if (parts.length) parts = parts.filter(q => q.life > 0);
  if (!L || mode === 'menu' || mode === 'end') return;
  if (speedrun.on && mode !== 'win') speedrun.t += dt;
  if (L.signT > 0 && (anyInput || L.signT > 3.6)) L.signT -= dt;   // 2.4: the first level's title card waits for the first key or touch (the player page may still cover the game)
  if (L.msgT > 0) L.msgT -= dt;
  if (run.open && (mode === 'play' || mode === 'dead')) lvClock += dt;
  if (mode === 'dead') { deadT += dt; if (deadT > 0.55) loadLevel(lvIndex, true); return; }
  if (mode === 'win') { winT += dt; if (winT > 0.55) nextLevel(); return; }
  L.t += dt;
  const p = L.p;
  stepPlayer(dt);
  if (mode !== 'play') return;
  const pcx = p.x + PW / 2, pcy = p.y + PH / 2;
  const ptx = pcx / T, pty = pcy / T;
  const g = L.g, R = L.opt.R;

  // proximity traps
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const ch = g[y][x];
    if (ch === 'c' || ch === 'h' || ch === 'u' || ch === 'd') {
      const dx = Math.abs(ptx - (x + 0.5));
      if (ch === 'c' && dx <= R.c && pty < y + 0.2 && y - pty < 4.5 && L.gs > 0) { g[y][x] = 'q'; L.falls.push({ x: x * T, y: y * T, vy: 0, shake: L.opt.shake, kind: 'c' }); sfx('crumble'); }
      else if (ch === 'h' && dx <= R.h && Math.abs(pty - (y + 0.5)) < 2.6) { g[y][x] = 'H'; sfx('pop'); }
      else if (ch === 'u' && dx <= R.u && Math.abs(pty - (y + 0.5)) < 2.6 && !rectHit(p.x, p.y, PW, PH, x * T, y * T, T, T)) { g[y][x] = 'U'; sfx('pop'); }
      else if (ch === 'd' && dx <= R.d && pty > y) { g[y][x] = '.'; L.falls.push({ x: x * T, y: y * T, vy: 0, shake: 0.08, kind: 'd' }); sfx('crumble'); }
    }
  }
  // collapsing tiles ('q' = shaking, still solid) and drop blocks
  for (const f of L.falls) {
    if (f.shake > 0) { f.shake -= dt; if (f.shake <= 0 && f.kind === 'c') { const tx = f.x / T, ty = f.y / T; if (g[ty][tx] === 'q') g[ty][tx] = '.'; } continue; }
    f.vy += GRAV * dt; f.y += f.vy * dt;
    if (f.kind === 'd') {
      const tx = Math.round(f.x / T), below = Math.floor((f.y + T) / T);
      if (below < ROWS && solidTile(tx, below) && f.y + T >= below * T) { f.y = (below - 1) * T; if (below - 1 >= 0) g[below - 1][tx] = '#'; f.done = true; sfx('land'); }
      if (!f.done && rectHit(p.x + 1, p.y + 1, PW - 2, PH - 2, f.x, f.y, T, T)) kill('CRUSHED_BY_FALLING_FILE');
    }
    if (f.y > WH + 40) f.done = true;
  }
  L.falls = L.falls.filter(f => !f.done);

  // springs
  for (const s of L.springs) { s.t = Math.max(0, s.t - dt); if (p.vy >= 0 && rectHit(p.x, p.y, PW, PH, s.x * T + 2, s.y * T + 10, T - 4, 10)) { p.vy = -SPRING; p.ground = false; p.coyote = 0; if (L.def.fullSpring) p.cut = true; s.t = 0.25; sfx('spring'); } }
  // gravity pads
  L.flipCd -= dt;
  for (const pd of L.pads) if (L.flipCd <= 0 && rectHit(p.x, p.y, PW, PH, pd.x * T + 2, pd.y * T + (pd.up ? 0 : 12), T - 4, 8)) { L.gs = -L.gs; L.flipCd = 0.45; p.vy = 60 * L.gs; p.ground = false; sfx('flip'); }
  // flags
  for (const f of L.flags) if (!f.hit && rectHit(p.x, p.y, PW, PH, f.x * T + 6, f.y * T + 2, 8, 18)) {
    f.hit = true;
    if (f.real) { L.checkpoint = { x: f.x, y: f.y }; L.msg = 'checkpoint saved. (for real this time)'; L.msgT = 2.5; sfx('ding'); }
    else { L.msg = 'checkpoint saved ✓'; L.msgT = 2.5; sfx('ding'); for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (g[y][x] === 'C') { g[y][x] = 'q'; L.falls.push({ x: x * T, y: y * T, vy: 0, shake: 0.3 + 0.03 * Math.abs(x - f.x), kind: 'c' }); } }
  }
  // popups
  for (const pp of L.popups) {
    if (pp.state === 0 && trigOk(pp, p.x, p.y)) { pp.state = 1; pp.a = 0; sfx('ding'); }
    if (pp.state === 1) {
      pp.a = Math.min(1, pp.a + dt * 7);
      const r = popupRect(pp);
      if (rectHit(p.x, p.y, PW, PH, r.x + r.w - T - 4, r.y - 12, T + 8, 16)) { pp.state = 2; sfx('click'); L.msg = 'closed.'; L.msgT = 1; }
    }
  }
  // cursor deletes 'z'
  const cu = L.cursor;
  if (cu) {
    if (cu.state === 0 && trigOk(cu, p.x, p.y)) { cu.state = 1; cu.t = 0; cu.sx = cu.x; cu.sy = cu.y; }
    if (cu.state > 0) {
      cu.t += dt;
      let zx0 = 99, zx1 = -1, zy0 = 99, zy1 = -1; for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (g[y][x] === 'z') { zx0 = Math.min(zx0, x); zx1 = Math.max(zx1, x); zy0 = Math.min(zy0, y); zy1 = Math.max(zy1, y); }
      if (cu.state === 1) { const k = Math.min(1, cu.t / cu.fly); const tx = zx0 * T - 4, ty = zy0 * T - 6; cu.x = cu.sx + (tx - cu.sx) * k; cu.y = cu.sy + (ty - cu.sy) * k; if (k >= 1) { cu.state = 2; cu.t = 0; cu.selX = tx; cu.selY = ty; cu.selW = (zx1 - zx0 + 1) * T + 8; cu.selH = (zy1 - zy0 + 1) * T + 12; } }
      else if (cu.state === 2) { const k = Math.min(1, cu.t / cu.sel); cu.x = cu.selX + cu.selW * k; cu.y = cu.selY + cu.selH * k; if (k >= 1) { for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (g[y][x] === 'z') { g[y][x] = '.'; L.debris.push({ x: x * T, y: y * T, vy: -40 - Math.random() * 60, a: 1 }); } cu.state = 3; cu.t = 0; L.msg = 'bridge.dll deleted'; L.msgT = 1.6; sfx('delete'); } }
      else if (cu.state === 3) { cu.y -= 260 * dt; cu.x += 120 * dt; if (cu.y < -40) cu.state = 4; }
    }
  }
  // chasing cursor
  const ch = L.chase;
  if (ch) {
    if (!ch.on && trigOk(ch, p.x, p.y)) { ch.on = true; sfx('click'); }
    if (ch.on) { ch.cx += ch.speed * dt; const col = Math.floor(ch.cx / T); for (let y = 0; y < ROWS; y++) for (let x = 0; x <= Math.min(COLS - 1, col); x++) if (g[y][x] === 'z') { g[y][x] = '.'; L.debris.push({ x: x * T, y: y * T, vy: -40, a: 1 }); if (Math.random() < 0.5) sfx('delete'); } }
  }
  for (const d of L.debris) { d.vy += 600 * dt; d.y += d.vy * dt; d.a -= dt * 1.5; }
  L.debris = L.debris.filter(d => d.a > 0);
  // taskbar
  const tb = L.taskbar;
  if (tb) { if (!tb.on && trigOk(tb, p.x, p.y)) { tb.on = true; L.msg = 'installing taskbar update...'; L.msgT = 2; } if (tb.on) { tb.y -= tb.speed * dt; if (p.y + PH > tb.y + 3) kill('TASKBAR_OVERFLOW'); } }
  // spikes
  const x0 = Math.floor(p.x / T), x1 = Math.floor((p.x + PW - 1) / T), y0 = Math.floor(p.y / T), y1 = Math.floor((p.y + PH - 1) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (ty < 0 || ty >= ROWS || tx < 0 || tx >= COLS) continue;
    const c = g[ty][tx]; let dir = 0;
    if (c === '^') dir = 1; else if (c === 'v') dir = -1; else if (c === 'H') dir = L.hdir[tx + ',' + ty] || 1;
    if (!dir) continue;
    const sy = dir > 0 ? ty * T + 9 : ty * T, sh = 11;
    if (rectHit(p.x + 1, p.y + 1, PW - 2, PH - 2, tx * T + 3, sy, T - 6, sh)) { kill(c === 'H' ? 'SURPRISE_SPIKE_EXCEPTION' : 'SPIKE_FAULT'); return; }
  }
  // fake exits
  for (const fe of L.fakeExits) if (rectHit(p.x, p.y, PW, PH, fe.x + 3, fe.y - 4, T - 6, T + 4)) { kill('SHORTCUT.LNK WAS MALWARE'); return; }
  // exit (maybe shy)
  const ex = L.exit, runs = L.def.run || [];
  if (L.exitAnim) { const a = L.exitAnim; a.t += dt; const k = Math.min(1, a.t / a.d); const e = 1 - Math.pow(1 - k, 3); ex.x = a.fx + (a.tx - a.fx) * e; ex.y = a.fy + (a.ty - a.fy) * e; if (k >= 1) L.exitAnim = null; }
  else {
    const dx = pcx - (ex.x + T / 2), dy = pcy - (ex.y + T / 2);
    if (L.runIdx < runs.length && Math.hypot(dx, dy) < T * 2.2) {
      const [rx, ry] = runs[L.runIdx++]; L.exitAnim = { fx: ex.x, fy: ex.y, tx: rx * T, ty: ry * T, t: 0, d: L.def.drag ? 0.7 : 0.32 };
      L.msg = ['nope.', 'not today.', 'catch me first.', 'lol.'][L.runIdx % 4]; L.msgT = 1.3; sfx('nope');
    } else if (!popupCovering(ex) && rectHit(p.x, p.y, PW, PH, ex.x + 3, ex.y - 4, T - 6, T + 4)) win();
  }
}
function popupCovering(ex) { for (const pp of L.popups) if (pp.state === 1) { const r = popupRect(pp); if (rectHit(ex.x, ex.y, T, T, r.x, r.y, r.w, r.h)) return true; } return false; }

function win() {
  mode = 'win'; winT = 0; sfx('win');
  // 2.3: a clear used to be just a sound: now the door bursts and crash says how it went
  const ex = L.exit;
  for (let i = 0; i < 26; i++) { const a = Math.random() * Math.PI * 2, v = 50 + Math.random() * 160; parts.push({ x: ex.x + T / 2, y: ex.y + T / 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 140, life: 0.7, max: 0.7, s: 2 + Math.random() * 3, col: i % 3 ? LIME : LILAC }); }
  L.msg = L.deaths ? 'cleared. only ' + L.deaths + (L.deaths === 1 ? ' death.' : ' deaths.') : 'first try?! suspicious.'; L.msgT = 1;
  if (!run.open) runStart();
  const n = lvIndex + 1, d = L.deaths, t = Math.round(lvClock * 100) / 100, nm = L.def.n;
  // 2.4: points, per-level records, clean files, the daily file and goals
  const pts = clearPts(d, t); run.cleared++; run.pts += pts;
  const rec = save.lb[nm], newBest = rec && rec.t && t < rec.t, firstClean = d === 0 && !(rec && rec.d === 0);
  save.lb[nm] = { t: rec && rec.t ? Math.min(rec.t, t) : t, d: rec ? Math.min(rec.d, d) : d };
  pop(ex.x + T / 2, ex.y - 14, '+' + pts, LIME, 1.1);
  if (firstClean) pop(ex.x + T / 2, ex.y - 34, 'CLEAN ✓', LIME, 1.6, true);
  else if (newBest) pop(ex.x + T / 2, ex.y - 34, 'new best ' + t.toFixed(2) + 's', LILAC, 1.6, true);
  if (d === 0 && rec && rec.d !== 0) L.msg = 'clean file. you learned.';
  save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, n + 1)); save.cleared = Math.max(save.cleared, n);
  const D = save.daily;
  if (lvIndex === dailyLv() && !D.done && d === 0) { D.done = true; D.streak = D.last === YDAY ? (D.streak || 0) + 1 : 1; D.last = TODAY; toast('daily file clean ✓ streak ' + D.streak + ' · new file tomorrow'); ccEvent('daily', { lv: n, streak: D.streak }); }
  persist();
  for (const g of checkGoals()) { if (g.id !== 'daily1') toast('goal ✓ ' + g.t); ccEvent('goal', { id: g.id }); }   // (the daily has its own toast)
  if ([5, 10, 20, 30, 35].includes(n)) ccEvent('milestone', { lv: n, deaths: speedrun.deaths });
  ccCall('score', runScore());
}
function pop(x, y, txt, col, life, big) { pops.push({ x, y, txt, col, life, max: life, big: !!big }); }
function nextLevel() {
  if (lvIndex + 1 >= LEVELS.length) { finishGame(); return; }
  startLevel(lvIndex + 1, true);
}
function finishGame() {
  mode = 'end';
  if (speedrun.on && speedrun.valid) { if (!save.best || speedrun.t < save.best) { save.best = speedrun.t; save.bestDeaths = speedrun.deaths; } persist(); }
  speedrun.on = false;
  ccEvent('finish', { t: Math.round(speedrun.t), deaths: speedrun.deaths });
  runEnd(true);
}
function newRun() {
  runEnd(false);
  speedrun = { t: 0, valid: true, deaths: 0, on: true };
  L = null; startLevel(0, true);
}

// ---------- layout ----------
const V = { x: 0, y: 0, s: 1, top: 34, vw: WW, cam: 0 };
let W = 1, H = 1, DPR = 1;
let btns = [];
const pad = { l: null, r: null, j: null, show: false };
function layout() {
  const rc = cv.getBoundingClientRect();
  W = Math.max(1, rc.width || innerWidth); H = Math.max(1, rc.height || innerHeight);
  DPR = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  const top = V.top = 34;
  pad.show = isTouch;
  // 2.3: "portrait" means the pads go in their own band under the level. That used to need H > 1.15 W, so a
  // phone's player frame (about 414 x 430-470) fell into the landscape layout and the jump button sat on top of
  // the floor and the exit door. Now any touch screen with room for a pad band below the level stacks too.
  const portrait = H > W * 1.15 || (isTouch && H - top - (W / WW) * WH >= 130);
  let availH = H - top;
  if (pad.show && portrait) availH = Math.max(140, H - top - Math.min(260, Math.max(170, H * 0.34)));
  // phones in portrait: zoom in and follow crash horizontally (about 16 tiles visible)
  const s = Math.min(Math.max(W / WW, portrait ? W / (16 * T) : 0), availH / WH);
  V.s = s; V.band = pad.show && portrait; V.vw = Math.min(WW, W / s); V.x = (W - V.vw * s) / 2; V.y = top + (portrait && pad.show ? 4 : Math.max(0, (availH - WH * s) / 2));
  if (pad.show) {
    if (portrait) {
      const ay = V.y + WH * s + 10, ah = H - ay - 18;
      const bs = Math.min(96, ah * 0.75, W * 0.24);
      const by = ay + (ah - bs) * 0.62;   // a little below centre: closer to where thumbs rest on tall phones
      pad.l = { x: 14, y: by, w: bs, h: bs }; pad.r = { x: 14 + bs + 12, y: by, w: bs, h: bs };
      const js = Math.min(118, ah * 0.9, W * 0.3); pad.j = { x: W - js - 16, y: by + bs / 2 - js / 2, w: js, h: js };
    } else {
      const bs = Math.min(84, H * 0.2);
      pad.l = { x: 12, y: H - bs - 12, w: bs, h: bs }; pad.r = { x: 24 + bs, y: H - bs - 12, w: bs, h: bs };
      pad.j = { x: W - bs * 1.2 - 12, y: H - bs * 1.2 - 12, w: bs * 1.2, h: bs * 1.2 };
    }
  }
}

// ---------- drawing ----------
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
function rr(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function wrapText(txt, x, y, maxW, lh) {
  let line = '';
  for (const w of txt.split(' ')) { const t2 = line ? line + ' ' + w : w; if (line && ctx.measureText(t2).width > maxW) { ctx.fillText(line, x, y); y += lh; line = w; } else line = t2; }
  if (line) { ctx.fillText(line, x, y); y += lh; }
  return y;
}
function fmt(t) { const m = Math.floor(t / 60), s = t - m * 60; return String(m).padStart(2, '0') + ':' + s.toFixed(2).padStart(5, '0'); }

const PAL = () => hw ? { face: '#e58a3a', hi: '#ffc27a', lo: '#8a3f12', bg: '#160f22', grid: 'rgba(255,138,42,0.05)', spike: '#b59aff' } : { face: '#c3c3c3', hi: '#f2f2f2', lo: '#6d6d6d', bg: CARBON, grid: 'rgba(197,255,73,0.04)', spike: PINK };

function block(x, y, P, shake) {
  const ox = shake ? (Math.random() - 0.5) * 2.5 : 0;
  ctx.fillStyle = P.face; ctx.fillRect(x + ox, y, T, T);
  ctx.fillStyle = P.hi; ctx.fillRect(x + ox, y, T, 2); ctx.fillRect(x + ox, y, 2, T);
  ctx.fillStyle = P.lo; ctx.fillRect(x + ox, y + T - 2, T, 2); ctx.fillRect(x + ox + T - 2, y, 2, T);
}
function spike(x, y, dir, col) {
  ctx.fillStyle = col; ctx.beginPath();
  for (let k = 0; k < 2; k++) { const bx = x + 2 + k * 8; if (dir > 0) { ctx.moveTo(bx, y + T); ctx.lineTo(bx + 4, y + 8); ctx.lineTo(bx + 8, y + T); } else { ctx.moveTo(bx, y); ctx.lineTo(bx + 4, y + 12); ctx.lineTo(bx + 8, y); } }
  ctx.fill();
}
function door(x, y, fake) {
  ctx.fillStyle = LIME; ctx.fillRect(x + 2, y - 6, T - 4, T + 6);
  ctx.fillStyle = '#2c3a10'; ctx.fillRect(x + 5, y - 3, T - 10, T + 3);
  ctx.fillStyle = LIME; ctx.fillRect(fake ? x + 6 : x + T - 8, y + 8, 2, 2);
  ctx.fillStyle = CARBON; ctx.font = 'bold 5px ' + FONT; ctx.textAlign = 'center'; ctx.fillStyle = LIME; ctx.fillText('EXIT', x + T / 2, y - 8);
}
function drawPlayer(p) {
  ctx.save();
  ctx.translate(p.x + PW / 2, p.y + PH / 2);
  if (L.gs < 0) ctx.scale(1, -1);
  const sq = p.sq * 0.25; ctx.scale(1 + sq, 1 - sq);
  ctx.translate(-PW / 2, -PH / 2);
  ctx.fillStyle = '#d9c9a3'; ctx.fillRect(0, 0, PW, 11);
  ctx.fillStyle = '#b09f7a'; ctx.fillRect(PW - 2, 0, 2, 11); ctx.fillRect(3, 11, 6, 2); ctx.fillRect(1, 13, 10, 3);
  ctx.fillStyle = LIME; ctx.fillRect(2, 2, 8, 6);
  ctx.fillStyle = CARBON; const ex = p.face > 0 ? 1 : -1;
  ctx.fillRect(4 + ex, 4, 1, 2); ctx.fillRect(7 + ex, 4, 1, 2);
  if (hw) { ctx.fillStyle = '#2a1846'; ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(11, 0); ctx.lineTo(7, -8); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#FF8A2A'; ctx.fillRect(0, -1, 12, 1.5); }
  ctx.restore();
}
function drawCursor(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s || 1, s || 1);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 15); ctx.lineTo(4, 11); ctx.lineTo(7, 17); ctx.lineTo(9, 16); ctx.lineTo(6, 10); ctx.lineTo(11, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawPopup(pp) {
  const r = popupRect(pp), a = pp.a;
  ctx.save(); ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(0.6 + 0.4 * a, 0.6 + 0.4 * a); ctx.translate(-r.w / 2, -r.h / 2); ctx.globalAlpha = a;
  ctx.fillStyle = '#c3c3c3'; ctx.fillRect(0, 0, r.w, r.h);
  ctx.fillStyle = '#f2f2f2'; ctx.fillRect(0, 0, r.w, 1.5); ctx.fillRect(0, 0, 1.5, r.h);
  ctx.fillStyle = '#404040'; ctx.fillRect(0, r.h - 1.5, r.w, 1.5); ctx.fillRect(r.w - 1.5, 0, 1.5, r.h);
  ctx.fillStyle = '#1c2a8c'; ctx.fillRect(2, 2, r.w - 4, 9);
  ctx.fillStyle = PAPER; ctx.font = 'bold 6px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(pp.t, 4, 6.8);
  const pulse = 0.6 + 0.4 * Math.sin(clock * 8);
  ctx.fillStyle = 'rgba(255,79,90,' + pulse + ')'; ctx.fillRect(r.w - 11, 3, 8, 7); ctx.fillStyle = '#fff'; ctx.fillText('x', r.w - 9, 6.6);
  if (r.h >= 30) { ctx.fillStyle = '#e23b3b'; ctx.beginPath(); ctx.arc(10, 21, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#303030'; ctx.fillRect(19, 18, Math.min(40, r.w - 26), 2); ctx.fillRect(19, 23, Math.min(28, r.w - 26), 2); }
  ctx.restore();
}

function draw() {
  btns = [];
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const P = PAL();
  ctx.fillStyle = '#0a0b0d'; ctx.fillRect(0, 0, W, H);
  if (!L) return;
  // world
  ctx.save();
  ctx.translate(V.x, V.y); ctx.scale(V.s, V.s);
  ctx.beginPath(); ctx.rect(0, 0, V.vw, WH); ctx.clip();
  if (mode === 'dead' && deadT < 0.12) ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);   // 2.2: a jolt on the death frame, before the blue screen
  if (V.vw < WW) { const want = Math.max(0, Math.min(WW - V.vw, L.p.x + PW / 2 - V.vw / 2)); V.cam += (want - V.cam) * 0.18; if (Math.abs(want - V.cam) > WW / 2) V.cam = want; } else V.cam = 0;
  ctx.translate(-V.cam, 0);
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, WW, WH);
  ctx.strokeStyle = P.grid; ctx.lineWidth = 1; ctx.beginPath(); for (let x = 0; x <= COLS; x++) { ctx.moveTo(x * T + 0.5, 0); ctx.lineTo(x * T + 0.5, WH); } for (let y = 0; y <= ROWS; y++) { ctx.moveTo(0, y * T + 0.5); ctx.lineTo(WW, y * T + 0.5); } ctx.stroke();
  // reverse zone tint
  const g = L.g;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (g[y][x] === 'r') { ctx.fillStyle = 'rgba(181,154,255,0.10)'; ctx.fillRect(x * T, y * T, T, T); if ((x + y) % 3 === 0) { ctx.fillStyle = 'rgba(181,154,255,0.35)'; ctx.font = 'bold 9px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⇄', x * T + T / 2, y * T + T / 2); } }
  const VC = V.cam + V.vw / 2;
  // sign
  if (L.def.sign) { ctx.font = 'bold 9px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; const sy = L.def.map[1] === FULL ? 150 : /[gv]/.test(L.def.map[1]) ? 110 : 25; let txt = pad.show && L.def.signTouch ? L.def.signTouch : L.def.sign; if (L.def.credits) txt = 'made by computer cooked. you died ' + save.deaths + ' times. crash says gg.'; const sw = ctx.measureText(txt).width + 12; ctx.fillStyle = 'rgba(16,17,20,0.75)'; ctx.fillRect(VC - sw / 2, sy - 3, sw, 15); ctx.fillStyle = 'rgba(197,255,73,' + (L.signT > 0 ? 0.95 : 0.55) + ')'; ctx.fillText(txt, VC, sy); }
  // tiles
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const c = g[y][x], px = x * T, py = y * T;
    if (c === '#' || c === 'c' || c === 'C' || c === 'z' || c === 'f') block(px, py, P, false);
    else if (c === 'q') block(px, py, P, true);
    else if (c === 'F') { block(px, py, P, false); ctx.strokeStyle = PINK; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px + 4, py + 3); ctx.lineTo(px + 9, py + 10); ctx.lineTo(px + 7, py + 15); ctx.lineTo(px + 13, py + 19); ctx.stroke(); }
    else if (c === 'U') block(px, py, P, false);
    else if (c === 'd') { block(px, py, P, false); ctx.fillStyle = CARBON; ctx.fillRect(px + 5, py + 8, 3, 2); ctx.fillRect(px + 12, py + 8, 3, 2); ctx.fillRect(px + 6, py + 13, 8, 1.5); }
    else if (c === 'i') { if (L.touchedInvis[x + ',' + y]) { ctx.strokeStyle = 'rgba(181,154,255,0.8)'; ctx.setLineDash([2, 2]); ctx.strokeRect(px + 1.5, py + 1.5, T - 3, T - 3); ctx.setLineDash([]); } }
    else if (c === '^') spike(px, py, 1, P.spike);
    else if (c === 'v') spike(px, py, -1, P.spike);
    else if (c === 'H') spike(px, py, L.hdir[x + ',' + y] || 1, P.spike);
  }
  if (L.def.map.some(r => r.includes('z'))) for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (g[y][x] === 'z') { ctx.fillStyle = 'rgba(77,124,255,0.25)'; ctx.fillRect(x * T + 2, y * T + 2, T - 4, T - 4); }
  for (const f of L.falls) if (f.shake <= 0 || f.kind === 'd') block(f.x + (f.shake > 0 ? (Math.random() - 0.5) * 2 : 0), f.y, P, false);
  for (const d of L.debris) { ctx.globalAlpha = Math.max(0, d.a); block(d.x, d.y, P, false); ctx.globalAlpha = 1; }
  // springs, pads, flags
  for (const s of L.springs) { const x = s.x * T, y = s.y * T, ext = s.t > 0 ? 6 : 0; ctx.fillStyle = LILAC; ctx.fillRect(x + 3, y + 15 - ext, T - 6, 3); ctx.strokeStyle = LILAC; ctx.lineWidth = 1.5; ctx.beginPath(); for (let k = 0; k < 4; k++) { ctx.moveTo(x + 5, y + 18 - k * (2 + ext / 4)); ctx.lineTo(x + 15, y + 17 - k * (2 + ext / 4)); } ctx.stroke(); ctx.fillRect(x + 3, y + 18, T - 6, 2); }
  for (const pd of L.pads) { const x = pd.x * T, y = pd.y * T; ctx.fillStyle = LILAC; ctx.fillRect(x + 2, pd.up ? y : y + T - 4, T - 4, 4); ctx.font = 'bold 10px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(clock * 6); ctx.fillText(pd.up ? '▼' : '▲', x + T / 2, y + T / 2); ctx.globalAlpha = 1; }
  for (const f of L.flags) { const x = f.x * T, y = f.y * T; ctx.fillStyle = '#9aa0a6'; ctx.fillRect(x + 8, y + 2, 2, 18); ctx.fillStyle = f.hit ? (f.real ? LIME : PINK) : LIME; ctx.beginPath(); ctx.moveTo(x + 10, y + 2); ctx.lineTo(x + 18, y + 6); ctx.lineTo(x + 10, y + 10); ctx.closePath(); ctx.fill(); }
  // exits
  for (const fe of L.fakeExits) door(fe.x, fe.y, true);
  door(L.exit.x, L.exit.y, false);
  // 2.4: on phones the exit can start off screen: a pulsing chip at the edge says where it is
  if (V.vw < WW && mode === 'play' && !L.fakeExits.length) {   // (not on shortcut.lnk: pointing past the fake door would spoil it)
    const ex = L.exit, left = ex.x + T < V.cam + 4, right = ex.x > V.cam + V.vw - 4;
    if (left || right) {
      ctx.globalAlpha = 0.65 + 0.35 * Math.sin(clock * 6); ctx.font = 'bold 8px ' + FONT; ctx.textBaseline = 'middle';
      const lbl = left ? '◀ EXIT' : 'EXIT ▶', w = ctx.measureText(lbl).width + 8, cx = left ? V.cam + 3 : V.cam + V.vw - 3 - w, cy = Math.max(8, Math.min(WH - 8, ex.y + T / 2));
      ctx.fillStyle = LIME; rr(cx, cy - 6, w, 12, 3); ctx.fill(); ctx.fillStyle = CARBON; ctx.textAlign = 'center'; ctx.fillText(lbl, cx + w / 2, cy + 0.5); ctx.globalAlpha = 1;
    }
  }
  for (const pp of L.popups) if (pp.state === 1) drawPopup(pp);
  if (L.exitAnim && L.def.drag) drawCursor(L.exit.x + 12, L.exit.y + 4, 1);
  // player
  if (mode !== 'dead') drawPlayer(L.p);
  for (const q of parts) { ctx.globalAlpha = Math.max(0, q.life / q.max); ctx.fillStyle = q.col; ctx.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s); }
  ctx.globalAlpha = 1;
  // 2.4: floating +points / CLEAN / new best (big ones pop in, all fade out; dark outline so they read over anything)
  for (const q of pops) {
    const k = 1 - q.life / q.max, a = Math.min(1, q.life / q.max * 3), sc = q.big ? (k < 0.12 ? 0.6 + k / 0.12 * 0.6 : 1.2 - Math.min(0.2, (k - 0.12))) : 1;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(Math.max(30, Math.min(WW - 30, q.x)), Math.max(10, q.y)); ctx.scale(sc, sc);
    ctx.font = 'bold ' + (q.big ? 13 : 11) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3; ctx.strokeStyle = CARBON; ctx.strokeText(q.txt, 0, 0); ctx.fillStyle = q.col; ctx.fillText(q.txt, 0, 0); ctx.restore();
  }
  // cursor
  const cu = L.cursor;
  if (cu && cu.state > 0 && cu.state < 4) {
    if (cu.state === 2) { ctx.fillStyle = 'rgba(77,124,255,0.25)'; ctx.strokeStyle = 'rgba(120,160,255,0.9)'; ctx.setLineDash([3, 2]); const w = cu.x - cu.selX, h = cu.y - cu.selY; ctx.fillRect(cu.selX, cu.selY, w, h); ctx.strokeRect(cu.selX, cu.selY, w, h); ctx.setLineDash([]); }
    drawCursor(cu.x, cu.y, 1.2);
  }
  if (L.chase && L.chase.on) drawCursor(L.chase.cx, WH - 34, 1.3);
  // taskbar
  const tb = L.taskbar;
  if (tb && tb.y < WH) {
    ctx.fillStyle = '#c3c3c3'; ctx.fillRect(0, tb.y, WW, WH - tb.y + 2); ctx.fillStyle = '#f2f2f2'; ctx.fillRect(0, tb.y, WW, 1.5);
    ctx.fillStyle = '#c3c3c3'; ctx.fillRect(3, tb.y + 3, 38, 12); ctx.strokeStyle = '#404040'; ctx.strokeRect(3.5, tb.y + 3.5, 38, 12);
    ctx.fillStyle = '#101114'; ctx.font = 'bold 8px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('start', 9, tb.y + 9.5);
    ctx.textAlign = 'right'; ctx.fillText('update 87%', WW - 6, tb.y + 9.5);
  }
  // message
  if (L.msgT > 0) { ctx.font = 'bold 10px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const w = ctx.measureText(L.msg).width + 14; const mx = Math.max(w / 2 + 4, Math.min(WW - w / 2 - 4, L.p.x + PW / 2)), my = Math.max(14, L.p.y - 16 * (L.gs > 0 ? 1 : -1) + (L.gs < 0 ? 24 : 0)); ctx.fillStyle = 'rgba(245,243,237,0.95)'; rr(mx - w / 2, my - 8, w, 16, 4); ctx.fill(); ctx.fillStyle = CARBON; ctx.fillText(L.msg, mx, my + 0.5); }
  // level title card
  if (L.signT > 3) {
    // 2.4: the card also names the folder and shows this level's record (or that it's today's daily file)
    const a = Math.min(1, (L.signT - 3) * 3), rec = save.lb[L.def.n], daily = lvIndex === dailyLv() && !save.daily.done;
    const sub = daily ? '★ daily file: clear it with 0 deaths' : rec ? 'best ' + rec.t.toFixed(2) + 's · ' + (rec.d === 0 ? 'clean ★' : 'fewest deaths ' + rec.d) : '';
    const th = sub ? 58 : 44;
    ctx.globalAlpha = a; ctx.fillStyle = '#1c2a8c'; const tw = 240; rr(VC - tw / 2, WH / 2 - 22, tw, th, 4); ctx.fill(); ctx.fillStyle = PAPER; ctx.font = 'bold 9px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('level ' + (lvIndex + 1) + ' / ' + LEVELS.length + ' · folder ' + (Math.floor(lvIndex / 6) + 1) + ': ' + FOLDERS[Math.floor(lvIndex / 6)], VC, WH / 2 - 9); ctx.fillStyle = LIME; ctx.font = 'bold 12px ' + FONT; ctx.fillText(L.def.n, VC, WH / 2 + 8);
    if (sub) { ctx.fillStyle = daily ? LILAC : 'rgba(245,243,237,0.8)'; ctx.font = 'bold 8px ' + FONT; ctx.fillText(sub, VC, WH / 2 + 25); }
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // blue screen of death
  if (mode === 'dead' && deadT > 0.12) {
    ctx.fillStyle = hw ? '#3a1458' : BSOD; ctx.fillRect(V.x, V.y, V.vw * V.s, WH * V.s);
    ctx.fillStyle = PAPER; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    // 2.4: lines wrap to the blue screen's width (on phones the stop code ran off the right edge)
    const fs = Math.max(11, 16 * V.s), x = V.x + 18 * V.s, bw = V.vw * V.s - 36 * V.s; let y = V.y + 22 * V.s;
    ctx.font = 'bold ' + Math.round(fs * 2.4) + 'px ' + FONT; const face = hw ? 'boo.' : ':('; ctx.fillText(face, x, y);
    // 2.4: from the 3rd death on a level the count sits next to the face, big enough to read in a muted clip
    if (L.deaths >= 3) { const fx = x + ctx.measureText(face + ' ').width; ctx.fillStyle = L.deaths >= 10 ? PINK : 'rgba(245,243,237,0.85)'; ctx.font = 'bold ' + Math.round(fs * 1.6) + 'px ' + FONT; ctx.fillText('×' + L.deaths, fx, y + fs * 0.6); ctx.fillStyle = PAPER; }
    y += fs * 3.2;
    const lf = Math.round(Math.min(fs * 0.85, bw / 39 / 0.6)), lh = lf * 1.4;
    ctx.font = 'bold ' + lf + 'px ' + FONT;
    y = wrapText('crash ran into a problem and died.', x, y, bw, lh);
    y = wrapText('stop code: ' + deathMsg, x, y, bw, lh);
    ctx.fillStyle = 'rgba(245,243,237,0.7)'; y = wrapText('deaths on this level: ' + L.deaths + ' · total: ' + save.deaths, x, y, bw, lh);
    if (L.deaths >= 3 && HINTS[lvIndex]) { ctx.fillStyle = LIME; y = wrapText('hint: ' + HINTS[lvIndex], x, y, bw, lh); ctx.fillStyle = 'rgba(245,243,237,0.7)'; }
    ctx.fillText('restarting...', x, y);
  }
  drawHud();
  drawPad();
  tipWant = null;
  if (mode === 'menu') drawMenu();
  else if (mode === 'end') drawEnd();
  tipSync(paused ? null : tipWant); // K-0059: shared tip button (assets/tip.js)
  if (paused && mode !== 'menu') { ctx.fillStyle = 'rgba(16,17,20,0.75)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = LIME; ctx.font = 'bold 22px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('paused', W / 2, H / 2 - 10); ctx.fillStyle = PAPER; ctx.font = 'bold 13px ' + FONT; ctx.fillText('tap or press a key', W / 2, H / 2 + 16); }
  if (toastT > 0) { let fs = 13; ctx.font = 'bold ' + fs + 'px ' + FONT; let tw = ctx.measureText(toastMsg).width + 28; if (tw > W - 16) { fs = Math.max(9, Math.floor(fs * (W - 44) / (tw - 28))); ctx.font = 'bold ' + fs + 'px ' + FONT; tw = ctx.measureText(toastMsg).width + 28; } const ty = mode === 'play' || mode === 'win' || mode === 'dead' ? V.y + 6 : H * 0.4, a = Math.min(1, toastT * 4); ctx.globalAlpha = a; rr(W / 2 - tw / 2, ty, tw, 30, 10); ctx.fillStyle = LILAC; ctx.fill(); ctx.fillStyle = CARBON; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(toastMsg, W / 2, ty + 15.5); ctx.globalAlpha = 1; }
}

function button(x, y, w, h, label, fn, o) {
  o = o || {}; btns.push({ x, y, w, h, fn, primary: o.primary });
  rr(x, y, w, h, Math.min(9, h / 3)); ctx.fillStyle = o.primary ? LIME : 'rgba(245,243,237,0.09)'; ctx.fill();
  ctx.strokeStyle = o.primary ? LIME : 'rgba(245,243,237,0.25)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = o.primary ? CARBON : (o.color || PAPER); ctx.font = 'bold ' + (o.fs || 13) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + w / 2, y + h / 2 + 1);
}
function drawHud() {
  const h = V.top; ctx.fillStyle = '#101114'; ctx.fillRect(0, 0, W, h);
  // 2.2: on touch the top buttons are 30 px and each one's tap area is the full bar height (they were 26 px targets)
  const bs = pad.show ? 30 : 26, by = (h - bs) / 2, gap = pad.show ? 8 : 5;
  const grow = () => { if (pad.show) { const b = btns[btns.length - 1]; b.y = 0; b.h = h; b.x -= gap / 2; b.w += gap; } };
  let bx = W - bs - 6;
  button(bx, by, bs, bs, muted ? '×' : '♪', () => setMuted(!muted), { fs: 13 }); grow(); bx -= bs + gap;
  button(bx, by, bs, bs, '↻', () => { if (mode === 'play') kill('MANUAL_RESTART (respect)'); }, { fs: 14 }); grow(); bx -= bs + gap;
  button(bx, by, bs, bs, '≡', openMenu, { fs: 14 }); grow();
  const narrow = W < 430;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.font = 'bold ' + (narrow ? 11 : 13) + 'px ' + FONT;
  ctx.fillStyle = LIME; const lv = 'lvl ' + (lvIndex + 1); ctx.fillText(lv, 8, h / 2);
  let x = 8 + ctx.measureText(lv + ' ').width;
  ctx.fillStyle = PINK; const dt = '☠ ' + save.deaths; ctx.fillText(dt, x, h / 2); x += ctx.measureText(dt + ' ').width;
  if (L && L.deaths > 0) { ctx.fillStyle = 'rgba(255,79,160,0.7)'; const dh = '(' + L.deaths + ' here)'; ctx.fillText(dh, x, h / 2); x += ctx.measureText(dh + ' ').width; }
  x += ctx.measureText(' ').width;
  ctx.fillStyle = PAPER; ctx.fillText(speedrun.on ? fmt(speedrun.t) : '--:--.--', x, h / 2); x += ctx.measureText('00:00.00  ').width;
  if (!narrow && L) { ctx.fillStyle = 'rgba(245,243,237,0.5)'; ctx.fillText(L.def.n, x, h / 2); }
  ctx.fillStyle = 'rgba(245,243,237,0.3)'; ctx.font = 'bold 9px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  const ng = nextGoal(), gy = V.y + WH * V.s + 15;
  if (ng && L && (mode === 'play' || mode === 'dead' || mode === 'win') && gy < H - 14 && (!pad.show || V.band) && !(pad.show && pad.l && gy + 8 > pad.l.y)) {
    const [a, b] = ng.p(); ctx.font = 'bold ' + (W < 430 ? 10 : 11) + 'px ' + FONT; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(197,255,73,0.75)';
    ctx.fillText('next goal: ' + ng.t + (b > 1 ? ' · ' + a + '/' + b : ''), W / 2, gy); ctx.font = 'bold 9px ' + FONT; ctx.textBaseline = 'bottom'; ctx.fillStyle = 'rgba(245,243,237,0.3)';
  }
  if (!pad.show || H > W * 1.15) ctx.fillText('computer cooked games', W / 2, H - 2);
}
function drawPad() {
  if (!pad.show || !pad.l) return;
  const draw1 = (b, label, on) => { rr(b.x, b.y, b.w, b.h, 16); ctx.fillStyle = on ? 'rgba(197,255,73,0.35)' : 'rgba(245,243,237,0.10)'; ctx.fill(); ctx.strokeStyle = on ? LIME : 'rgba(245,243,237,0.3)'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = on ? LIME : 'rgba(245,243,237,0.8)'; ctx.font = 'bold ' + Math.round(b.w * 0.36) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + 2); };
  draw1(pad.l, '◀', touch.l); draw1(pad.r, '▶', touch.r); draw1(pad.j, 'jump', touch.j);
}
function panel() { const w = Math.min(W - 24, 420), h = Math.min(H - 24, 470); const x = (W - w) / 2, y = (H - h) / 2; ctx.fillStyle = 'rgba(10,11,13,0.9)'; ctx.fillRect(0, 0, W, H); rr(x, y, w, h, 14); ctx.fillStyle = CARBON; ctx.fill(); ctx.strokeStyle = LIME; ctx.lineWidth = 2; ctx.stroke(); return { x, y, w, h }; }
function drawMenu() {
  btns = [];
  const p = panel(); let y = p.y + 16;
  ctx.fillStyle = LIME; ctx.font = 'bold 20px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('level devil.exe', p.x + 16, y);
  button(p.x + p.w - 44, y - 4, 32, 30, '×', closeMenu, { fs: 18 });
  const nm = nemesis();
  y += 30; ctx.fillStyle = 'rgba(245,243,237,0.6)'; ctx.font = 'bold 11px ' + FONT; ctx.textAlign = 'left'; ctx.fillText('deaths: ' + save.deaths + (nm ? ' · nemesis: lvl ' + nm.lv + ' (☠ ' + nm.n + ')' : '') + (save.best ? ' · best run ' + fmt(save.best) : ''), p.x + 16, y); y += 22;
  // 2.4: goals + clean files, the next goal, and the daily file
  const ng = nextGoal(), dl = dailyLv(), D = save.daily;
  ctx.fillStyle = PAPER; ctx.fillText('goals ' + goalsDone() + '/' + GOALS.length + ' · clean files ' + cleanCount() + '/' + LEVELS.length + (run.open && run.pts ? ' · this run ' + run.pts : ''), p.x + 16, y); y += 17;
  if (ng) { const [a, b] = ng.p(); ctx.fillStyle = LIME; ctx.fillText('next: ' + ng.t + (b > 1 ? ' · ' + a + '/' + b : ''), p.x + 16, y); y += 19; }
  const cols = 8, gap = 5, bw = (p.w - 32 - gap * (cols - 1)) / cols, bh = Math.min(30, bw, Math.max(20, (p.h - (y - p.y) - 100) / 5 - gap));
  for (let i = 0; i < LEVELS.length; i++) {
    const r = Math.floor(i / cols), c = i % cols, bx = p.x + 16 + c * (bw + gap), byy = y + r * (bh + gap);
    if (i < save.unlocked) {
      button(bx, byy, bw, bh, String(i + 1), () => { speedrun.valid = false; speedrun.on = true; startLevel(i, true); }, { fs: 11, color: i < save.cleared ? LIME : PAPER });
      const rec = save.lb[LEVELS[i].n];
      if (rec && rec.d === 0) { ctx.fillStyle = LIME; ctx.font = 'bold 8px ' + FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText('★', bx + bw - 2, byy + 1); }
    } else { rr(bx, byy, bw, bh, 6); ctx.fillStyle = 'rgba(245,243,237,0.03)'; ctx.fill(); ctx.fillStyle = 'rgba(245,243,237,0.2)'; ctx.font = 'bold 11px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), bx + bw / 2, byy + bh / 2); }
    if (i === dl) { rr(bx - 1.5, byy - 1.5, bw + 3, bh + 3, 7); ctx.strokeStyle = D.done ? 'rgba(181,154,255,0.5)' : LILAC; ctx.lineWidth = 2; ctx.stroke(); }
  }
  y += Math.ceil(LEVELS.length / cols) * (bh + gap) + 6;
  const hb = Math.max(26, Math.min(40, (p.y + p.h - y - 30) / 2)), half = (p.w - 40) / 2, third = (p.w - 48) / 3;
  button(p.x + 16, y, half, hb, 'new speedrun', newRun, { primary: true, fs: 12 });
  button(p.x + 24 + half, y, half, hb, D.done ? 'daily ✓ streak ' + D.streak : 'daily file: lvl ' + (dl + 1), () => { speedrun.valid = false; speedrun.on = true; startLevel(dl, true); toast(D.done ? 'daily done. new file tomorrow.' : 'daily file: clear it with 0 deaths'); }, { fs: 11, color: LILAC }); y += hb + 7;
  button(p.x + 16, y, third, hb, 'share', share, { fs: 12 }); button(p.x + 24 + third, y, third, hb, muted ? 'sound off' : 'sound on', () => setMuted(!muted), { fs: 12 });
  button(p.x + 32 + third * 2, y, third, hb, hw ? 'spooky 🎃' : 'spooky off', () => { hw = !hw; save.hw = hw; persist(); }, { fs: 12 }); y += hb + 8;
  ctx.fillStyle = 'rgba(245,243,237,0.45)'; ctx.font = 'bold 10px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('keys: ←→/a d move · ↑/w/space jump · r restart · esc menu', p.x + 16, Math.min(y, p.y + p.h - 18));
}
// K-0059: shared tip button (assets/tip.js). the end screen is drawn on the canvas, so the button lives in a
// small DOM box laid over it under the end-screen buttons, visible only while that screen is up (draw() hides it otherwise).
let tipWant = null, tipBox = null;
function tipSync(at) {
  if (!window.ccTip) return;
  if (!tipBox) {
    tipBox = document.createElement('div');
    tipBox.style.cssText = 'position:absolute;left:0;top:0;width:0;display:flow-root;visibility:hidden;pointer-events:none;z-index:3;color:#F5F3ED';
    document.body.appendChild(tipBox);
    window.ccTip.mount(tipBox, { game: 'level-devil-exe', slot: 'game-over' });
  }
  const st = tipBox.style;
  if (!at || !tipBox.firstChild) { if (st.visibility !== 'hidden') { st.visibility = 'hidden'; st.pointerEvents = 'none'; } return; }
  st.left = at.x + 'px'; st.width = at.w + 'px'; st.top = at.y + 'px';
  if (at.y + tipBox.offsetHeight > H) { st.visibility = 'hidden'; st.pointerEvents = 'none'; return; } // no room: skip it, never cover the game
  st.visibility = 'visible'; st.pointerEvents = 'auto';
}
// height the button needs at width w (0 while tips are off / not loaded), so the end card can make room for it
function tipHeight(w) { if (!tipBox || !tipBox.firstChild) return 0; tipBox.style.width = w + 'px'; return tipBox.offsetHeight; }
function drawEnd() {
  btns = [];
  const p = panel(); let y = p.y + 22;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = LIME; ctx.font = 'bold 22px ' + FONT; ctx.fillText('you beat level devil.exe', W / 2, y); y += 40;
  ctx.fillStyle = PAPER; ctx.font = 'bold 15px ' + FONT;
  ctx.fillText('time ' + fmt(speedrun.t) + (speedrun.valid ? '' : ' (level-select run)'), W / 2, y); y += 26;
  ctx.fillText('deaths this run: ' + speedrun.deaths + ' · score ' + runScore(), W / 2, y); y += 26;
  ctx.fillStyle = 'rgba(245,243,237,0.6)'; ctx.font = 'bold 12px ' + FONT;
  ctx.fillText('all-time deaths: ' + save.deaths + (save.best ? ' · best ' + fmt(save.best) : ''), W / 2, y); y += 24;
  const nm = nemesis();
  if (nm) { ctx.fillStyle = PINK; ctx.fillText('nemesis: lvl ' + nm.lv + ' ' + nm.name + ' · ☠ ' + nm.n, W / 2, y); y += 24; ctx.fillStyle = 'rgba(245,243,237,0.6)'; }
  ctx.fillText('crash is impressed. and a little scared.', W / 2, y); y += 34;
  const bh = 44;
  button(p.x + 20, y, p.w - 40, bh, 'share card', share, { primary: true }); y += bh + 10;
  button(p.x + 20, y, p.w - 40, bh, 'new speedrun', newRun); y += bh + 10;
  button(p.x + 20, y, p.w - 40, bh, 'levels', openMenu);
  tipWant = { x: p.x + 20, y: y + bh, w: p.w - 40 }; // K-0059: shared tip button (assets/tip.js)
}
function openMenu() { if (mode === 'menu') return; menuFrom = mode === 'end' ? 'end' : 'play'; mode = 'menu'; }
function closeMenu() { mode = menuFrom === 'end' ? 'end' : 'play'; }

// ---------- share ----------
function makeCard() {
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1080; const g = c.getContext('2d');
  g.fillStyle = hw ? '#3a1458' : BSOD; g.fillRect(0, 0, 1080, 1080);
  g.fillStyle = PAPER; g.textAlign = 'left'; g.textBaseline = 'top';
  g.font = 'bold 220px ' + FONT; g.fillText(':(', 90, 70);
  g.font = 'bold 54px ' + FONT; g.fillText('level devil.exe killed me', 90, 360);
  g.fillStyle = LIME; g.font = 'bold 150px ' + FONT; g.fillText(save.deaths + 'x', 90, 440);
  g.fillStyle = PAPER; g.font = 'bold 44px ' + FONT;
  const done = mode === 'end';
  g.fillText(done ? 'and i still beat all ' + LEVELS.length + ' levels' : 'made it to level ' + save.cleared + ' / ' + LEVELS.length, 90, 640);
  if (done || save.best) g.fillText('speedrun: ' + fmt(done ? speedrun.t : save.best), 90, 705);
  const nm = nemesis();
  if (nm) { g.fillStyle = '#FF8AC4'; g.font = 'bold 36px ' + FONT; g.fillText('level ' + nm.lv + ' alone got me ' + nm.n + 'x (' + nm.name + ')', 90, 770); }
  g.fillStyle = 'rgba(245,243,237,0.75)'; g.font = 'bold 30px ' + FONT; g.fillText('stop code: ' + (deathMsg || 'SKILL_ISSUE'), 90, 825);
  // qr-ish block
  g.fillStyle = PAPER; g.fillRect(90, 880, 110, 110); g.fillStyle = hw ? '#3a1458' : BSOD; for (let i = 0; i < 25; i++) if ((i * 7 + 3) % 3) g.fillRect(100 + (i % 5) * 18, 890 + Math.floor(i / 5) * 18, 14, 14);
  g.fillStyle = LIME; g.font = 'bold 38px ' + FONT; g.fillText(URL_TXT, 230, 905);
  g.fillStyle = 'rgba(245,243,237,0.6)'; g.font = 'bold 28px ' + FONT; g.fillText('computer cooked games', 230, 958);
  return c;
}
function shareText() {
  const nm = nemesis(), nmTxt = nm && nm.n >= 3 ? ' level ' + nm.lv + ' alone got me ' + nm.n + ' times.' : '';
  return mode === 'end' ? 'i beat level devil.exe in ' + fmt(speedrun.t) + ' and only died ' + speedrun.deaths + ' times.' + nmTxt + ' ' + URL_TXT
    : 'level devil.exe has killed me ' + save.deaths + ' times.' + nmTxt + ' i am on level ' + Math.min(LEVELS.length, save.cleared + 1) + '. ' + URL_TXT;
}
const toastQ = [];
function toast(m) { if (toastT > 0) { if (toastQ.length < 4) toastQ.push(m); } else { toastMsg = m; toastT = 2.4; } }
async function share() {
  ccEvent('share', { deaths: save.deaths });
  const text = shareText(); let blob = null;
  try { blob = await new Promise(r => makeCard().toBlob(r, 'image/png')); } catch (e) {}
  try {
    if (blob && navigator.canShare) { const file = new File([blob], 'level-devil.png', { type: 'image/png' }); if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text, title: 'level devil.exe' }); return; } }
    if (navigator.share) { await navigator.share({ text, title: 'level devil.exe' }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  try { if (blob && navigator.clipboard && window.ClipboardItem) { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob, 'text/plain': new Blob([text], { type: 'text/plain' }) })]); toast('card + text copied'); return; } } catch (e) {}
  try { await navigator.clipboard.writeText(text); toast('copied to clipboard'); } catch (e) { toast('could not copy. screenshot it.'); }
}

// ---------- input ----------
const KEYMAP = { arrowleft: 'l', a: 'l', arrowright: 'r', d: 'r', arrowup: 'j', w: 'j', ' ': 'j', z: 'j' };
window.addEventListener('keydown', (e) => {
  ensureAudio(); anyInput = true;
  const k = e.key.toLowerCase();
  if (paused) { paused = false; return; }
  if (KEYMAP[k]) { keys[KEYMAP[k]] = true; e.preventDefault(); if (!speedrun.on && mode === 'play') speedrun.on = true; }
  else if (k === 'r') { if (mode === 'play') kill('MANUAL_RESTART (respect)'); }
  else if (k === 'escape') { if (mode === 'menu') closeMenu(); else openMenu(); }
  else if (k === 'm') setMuted(!muted);
  else if (k === 'enter' && (mode === 'menu' || mode === 'end')) { const b = btns.find(b => b.primary); if (b) b.fn(); }
  if (e.key === 'ArrowDown') e.preventDefault();
});
window.addEventListener('keyup', (e) => { const k = KEYMAP[e.key.toLowerCase()]; if (k) keys[k] = false; });
const ptrs = new Map();
function inRect(b, x, y) { return b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; }
function refreshTouch() {
  touch.l = touch.r = touch.j = false;
  for (const [, q] of ptrs) { if (inRect(pad.l, q.x, q.y)) touch.l = true; else if (inRect(pad.r, q.x, q.y)) touch.r = true; else if (inRect(pad.j, q.x, q.y)) touch.j = true; else if (q.zone) touch[q.zone] = true; }
}
cv.addEventListener('pointerdown', (e) => {
  e.preventDefault(); ensureAudio(); cv.focus(); anyInput = true;
  const rc = cv.getBoundingClientRect(), x = e.clientX - rc.left, y = e.clientY - rc.top;
  if (e.pointerType === 'touch' && !isTouch) { isTouch = true; layout(); }
  if (paused) { paused = false; return; }
  for (let i = btns.length - 1; i >= 0; i--) if (inRect(btns[i], x, y)) { sfx('click'); btns[i].fn(); return; }
  if (mode === 'menu' || mode === 'end') return;
  if (!speedrun.on) speedrun.on = true;
  // touch fallback when no pad hit: left/right third of the screen, middle = jump
  let zone = null;
  if (!(inRect(pad.l, x, y) || inRect(pad.r, x, y) || inRect(pad.j, x, y)) && e.pointerType === 'touch') zone = x < W * 0.33 ? 'l' : x > W * 0.67 ? 'r' : 'j';
  ptrs.set(e.pointerId, { x, y, zone }); try { cv.setPointerCapture(e.pointerId); } catch (er) {}
  refreshTouch();
});
cv.addEventListener('pointermove', (e) => { if (!ptrs.has(e.pointerId)) return; const rc = cv.getBoundingClientRect(); const q = ptrs.get(e.pointerId); q.x = e.clientX - rc.left; q.y = e.clientY - rc.top; refreshTouch(); });
const ptrUp = (e) => { ptrs.delete(e.pointerId); refreshTouch(); };
cv.addEventListener('pointerup', ptrUp); cv.addEventListener('pointercancel', ptrUp); cv.addEventListener('lostpointercapture', ptrUp);
window.addEventListener('message', (e) => {
  const d = e.data; if (!d || typeof d !== 'object') return;
  if (d.type === 'cc-mute') setMuted(!!d.muted);
  else if (d.type === 'cc-restart') {
    paused = false;
    if (mode === 'win' && lvIndex + 1 >= LEVELS.length) finishGame();   // report the finished game before anything else
    if (mode === 'end' || (mode === 'menu' && menuFrom === 'end')) newRun(); else startLevel(lvIndex, true);
  }
  else if (d.type === 'cc-pause') paused = true;
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (mode === 'play') paused = true; runEnd(false); } });
window.addEventListener('pagehide', () => runEnd(false));
window.addEventListener('resize', layout);
window.addEventListener('blur', () => { keys.l = keys.r = keys.j = false; });

// ---------- loop ----------
let last = performance.now();
function frame(now) {
  let dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;   // 2.2: never negative (a slow first frame could start behind the clock)
  if (!paused) { const n = dt > 1 / 90 ? 2 : 1; for (let i = 0; i < n; i++) update(dt / n); }
  draw();
  requestAnimationFrame(frame);
}
layout();
startLevel(save.cleared > 0 && save.cleared < LEVELS.length ? save.cleared : 0, true);
speedrun = { t: 0, valid: save.cleared === 0, deaths: 0, on: false };
if (patchNews) { toastMsg = 'patch 2.0: 5 new levels'; toastT = 3.5; }
else if (save.cleared > 0 && dailyLv() !== lvIndex && !save.daily.done) toast('daily file: lvl ' + (save.daily.lv + 1) + ' · ' + (isTouch ? 'tap ≡' : 'esc') + ' to play it' + (save.daily.streak ? ' · streak ' + save.daily.streak : ''));
// from the hub's "tap to play" card (cc.autostart): there's no title screen, level 1 is already live, so the
// flag is just used up here. If a title screen is ever added, skip it when this is true.
ccCall('autostart');
requestAnimationFrame(frame);

window.__ld = { LEVELS, get L() { return L; }, set L(v) { L = v; }, get mode() { return mode; }, set mode(v) { mode = v; }, get jhp() { return jumpHeldPrev; }, set jhp(v) { jumpHeldPrev = v; }, keys, update, draw, layout, set hw(v) { hw = v; }, startLevel, loadLevel, makeCard, get speedrun() { return speedrun; }, get pad() { return pad; }, get V() { return V; }, get deadT() { return deadT; },
  // 2.4 (tests): run score, records, goals, the daily file
  get run() { return run; }, get save() { return save; }, get lvClock() { return lvClock; }, get pops() { return pops; }, win, nextGoal, dailyLv, checkGoals, GOALS };
})();
