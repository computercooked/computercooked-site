/* typo wizard - computer cooked games. vanilla js, no network, no build step. */
(function () {
"use strict";
var $ = function (id) { return document.getElementById(id); };
var Q = new URLSearchParams(location.search);
// the player page frames /play/ with no query, so test mode also reads the parent page's ?cctest=1
var FRAMED = (function () { try { return window.parent !== window; } catch (e) { return true; } })();
var PARENT = (function () { try { return FRAMED && window.parent.document ? window.parent : null; } catch (e) { return null; } })();
var TEST = Q.get("cctest") === "1" || (function () { try { return !!PARENT && new URLSearchParams(PARENT.location.search).get("cctest") === "1"; } catch (e) { return false; } })();
var SHOT = Q.get("shot") === "1";

// ---------- sound: CC0 recordings (see PLAYTEST.md for sources) ----------
var FILES = { tile: "sfx/tile.mp3", cast: "sfx/cast.mp3", hit: "sfx/hit.mp3", hurt: "sfx/hurt.mp3", gold: "sfx/gold.mp3", buy: "sfx/buy.mp3", boss: "sfx/boss.mp3", win: "sfx/win.mp3", lose: "sfx/lose.mp3", bad: "sfx/bad.mp3" };
// levelled by measurement (ffmpeg ebur128; RMS for tile/hurt, under 0.4 s): frequent sounds land at about -22 to -25 LUFS after volume, boss/win/lose at -18.5 to -19
var VOL = { tile: 0.45, cast: 0.47, hit: 0.66, hurt: 0.52, gold: 0.63, buy: 0.38, boss: 0.71, win: 0.65, lose: 0.47, bad: 0.58 };
var muted = false, hostMuted = false, audioPool = {};
// at most 3 players per sound, reused in turn: cloning one per overlap leaked media players
// until Chrome refused ("too many WebMediaPlayers"), and phones allow far fewer
function sfx(name) {
  var url = FILES[name]; if (!url || muted || hostMuted) return;
  try {
    var p = audioPool[name] || (audioPool[name] = { list: [], i: 0 });
    var a = null;
    for (var k = 0; k < p.list.length; k++) if (p.list[k].paused || p.list[k].ended) { a = p.list[k]; break; }
    if (!a) { if (p.list.length < 3) { a = new Audio(url); a.preload = "auto"; p.list.push(a); } else { a = p.list[p.i % 3]; p.i++; try { a.pause(); } catch (e) {} } }
    a.volume = VOL[name] || 0.6; a.currentTime = 0;
    var pr = a.play(); if (pr && pr.catch) pr.catch(function () {});
  } catch (e) {}
}

// ---------- analytics (defensive) ----------
var evCount = 0;
function ccStart() { try { window.cc && window.cc.start && window.cc.start(); } catch (e) {} }
function ccEnd(o) { try { window.cc && window.cc.end && window.cc.end(o); } catch (e) {} }
function ccScore(n) { try { window.cc && window.cc.score && window.cc.score(n); } catch (e) {} }
function ccEvent(n, o) { if (evCount >= 18) return; evCount++; try { window.cc && window.cc.event && window.cc.event(n, o || {}); } catch (e) {} }

// ---------- dictionary ----------
var DICT = new Set();
(function () { var W = window.TW_WORDS || {}; for (var k in W) W[k].split(" ").forEach(function (w) { if (w) DICT.add(w); }); })();
var WORDLIST = Array.from(DICT);

// ---------- letters ----------
var VAL = { a:1,b:3,c:3,d:2,e:1,f:4,g:2,h:4,i:1,j:8,k:5,l:1,m:3,n:1,o:1,p:3,q:10,r:1,s:1,t:1,u:1,v:4,w:4,x:8,y:4,z:10 };
var FREQ = { a:9,b:2,c:2,d:4,e:12,f:2,g:3,h:2,i:9,j:1,k:1,l:4,m:2,n:6,o:8,p:2,q:1,r:6,s:4,t:6,u:4,v:2,w:2,x:1,y:2,z:1 };
var VOW = "aeiou";
var LENMULT = [0, 1, 1, 1, 1.25, 1.5, 2, 2.5, 3];

// ---------- relics ----------
var RELICS = {
  qu:     { n: "q comes with a free u", d: "your q tiles are qu tiles. the u is a gift. do not ask questions.", c: "#ff9d4d", g: "qu" },
  five:   { n: "high five", d: "every 5-letter word heals 3. your hand is a doctor now.", c: "#7cff6b", g: "5" },
  vowel:  { n: "vowel movement", d: "vowels deal +1 each. a, e, i, o, u, and occasionally regret.", c: "#8fe3ff", g: "ae" },
  skin:   { n: "thick skin", d: "+12 max hp. comments no longer affect you.", c: "#ff8fa3", g: "+hp" },
  wrap:   { n: "bubble wrap", d: "start every fight with 6 shield. pop pop.", c: "#5cd6ff", g: "◆" },
  leaf:   { n: "gold leaf", d: "one tile in each starting hand is gold.", c: "#ffd23f", g: "au" },
  long:   { n: "long winded", d: "words of 7+ letters deal 50% more. brevity is for cowards.", c: "#b98cff", g: "7+" },
  pyro:   { n: "pyromaniac", d: "burn deals +2 per tick. the monster is now toast.", c: "#ff5c3d", g: "🔥" },
  purse:  { n: "coin purse", d: "+50% gold from fights. it jingles judgmentally.", c: "#ffd23f", g: "$" },
  rehab:  { n: "redraw rehab", d: "2 free redraws per fight instead of 1.", c: "#ff8fd0", g: "↻" },
  fang:   { n: "vampire font", d: "heal 1 hp for every 6 damage dealt. very gothic.", c: "#c2185b", g: "v" },
  nope:   { n: "e-free diet", d: "words with no e deal +4. the e is overrated.", c: "#9cff8f", g: "-e" },
  chill:  { n: "cold open", d: "frozen monsters take +30% damage.", c: "#cfe6ff", g: "❄" },
  spike:  { n: "spiky serif", d: "shield also deals its amount back when hit.", c: "#ffb36b", g: "✱" },
  silent: { n: "silent e", d: "words ending in e deal +3. the e finally speaks.", c: "#e0e0e0", g: "e." },
  plural: { n: "plural power", d: "words ending in s deal 25% more. lazy? efficient.", c: "#9cff8f", g: "-s" },
  dice:   { n: "loaded dice", d: "+20% crit chance on every word, k and v or not.", c: "#ff8fd0", g: "\u2684" },
  first:  { n: "first impression", d: "your first word each fight deals double.", c: "#ffd23f", g: "1st" },
  piggy:  { n: "piggy bank", d: "+1 gold per word cast. oink.", c: "#ffb3c7", g: "oink" },
  pillow: { n: "memory foam", d: "resting heals 55% instead of 35%.", c: "#b98cff", g: "zz" },
  wall:   { n: "double trouble", d: "double-letter shields are doubled. symmetry.", c: "#5cd6ff", g: "oo" },
  ice:    { n: "ice tray", d: "freezing a monster also gives you 5 shield.", c: "#cfe6ff", g: "\u2744+" },
  kindle: { n: "kindling", d: "burn lasts 2 more turns. smells like toast.", c: "#ff9d4d", g: "\u2668" },
  nerd:   { n: "word nerd", d: "6+ letter words heal 2. reading is healing.", c: "#7cff6b", g: "6+" }
};
var STARTER_UNLOCKS = [ ["wrap", "reach act 2"], ["leaf", "win a run"] ];

// ---------- monsters ----------
// intents: a=attack n, m=multi [n,times], b=block n, h=heal n, s=special
var MON = {
  gremlin:  { n: "typo gremlin", hp: 16, c: "#7cff6b", sh: "blob", eyes: 2, p: [["a",4],["a",5],["a",3]], lines: ["teh", "i put a letter where it does not go", "recieve. recieve. recieve."] },
  lorem:    { n: "lorem ipsum", hp: 20, c: "#c9b8ff", sh: "ghost", eyes: 2, p: [["a",3],["b",5],["a",6]], lines: ["dolor sit amet, buddy", "i am placeholder and i am staying", "consectetur. that's a threat."] },
  semi:     { n: "a sentient semicolon", hp: 17, c: "#8fe3ff", sh: "semi", eyes: 1, p: [["m",[2,2]],["a",5]], lines: ["i connect clauses; i also bite", "nobody uses me correctly; not even me"] },
  spam:     { n: "spam email", hp: 22, c: "#ffd23f", sh: "box", eyes: 2, p: [["a",4],["h",4],["a",5]], lines: ["you have won (1) free hp", "re: re: fwd: urgent", "click here to lose"] },
  comma:    { n: "the comma splice", hp: 19, c: "#ff9d4d", sh: "drop", eyes: 2, p: [["a",5],["a",2],["m",[3,2]]], lines: ["i'm here, i'm hungry", "two sentences, one bad decision"] },
  passive:  { n: "passive voice", hp: 30, c: "#a0a8c8", sh: "ghost", eyes: 2, p: [["b",8],["a",8],["a",6]], lines: ["mistakes were made", "you are being attacked. by whom? unclear."] },
  runon:    { n: "run-on sentence", hp: 34, c: "#ff8fd0", sh: "worm", eyes: 2, p: [["m",[2,4]],["a",7],["b",6]], lines: ["and then and then and then and then", "i never stop and also i never"] },
  apos:     { n: "the apostrophe's", hp: 30, c: "#9cff8f", sh: "drop", eyes: 1, p: [["a",9],["h",6],["a",6]], lines: ["it's mine's", "the apple's are fresh's"] },
  click:    { n: "clickbait headline", hp: 32, c: "#ff5c7a", sh: "box", eyes: 2, p: [["a",6],["a",10],["b",5]], lines: ["you won't believe hit #2", "wizards hate this one trick"] },
  replyall: { n: "reply-all", hp: 44, c: "#5cd6ff", sh: "box", eyes: 4, p: [["m",[3,4]],["a",9],["h",8]], lines: ["adding everyone", "please remove me from this fight", "+1"] },
  captcha:  { n: "captcha", hp: 46, c: "#ffb36b", sh: "box", eyes: 2, p: [["b",12],["a",12],["a",9]], lines: ["select all squares with wizards", "are you a robot? prove it. spell."] },
  fine:     { n: "the fine print", hp: 42, c: "#e0e0e0", sh: "ghost", eyes: 2, p: [["a",8],["m",[2,6]],["a",11]], lines: ["*damage may vary", "by reading this you agree to lose"] },
  dolor:    { n: "lorem ipsum (dolor)", hp: 48, c: "#b98cff", sh: "ghost", eyes: 3, p: [["a",10],["b",10],["a",13]], lines: ["the sequel nobody filled in", "sit amet harder"] },
  cactus:   { n: "cactus font", hp: 18, c: "#5fd35f", sh: "box", eyes: 2, g: "thorns", gt: "thorns: 1 dmg to you per word", p: [["a",4],["a",3],["b",4]], lines: ["every letter has a spike. you're welcome.", "touch me. i dare you."] },
  hashtag:  { n: "#trending", hp: 17, c: "#5cd6ff", sh: "blob", eyes: 2, g: "grow", gt: "trending: hits harder every turn", p: [["a",3],["a",3],["a",3]], lines: ["going viral. going feral.", "like and subscribe to pain"] },
  ehater:   { n: "the e-hater", hp: 20, c: "#ff8fa3", sh: "drop", eyes: 2, g: "bane", gt: "words with e deal half", p: [["a",4],["m",[2,2]],["a",5]], lines: ["e? ew.", "i only respect consonants"] },
  tldr:     { n: "tl;dr", hp: 30, c: "#ffd23f", sh: "semi", eyes: 1, g: "short", gt: "words of 3 or less deal 0", p: [["a",7],["a",6],["b",6]], lines: ["too long; didn't care", "short words bore me"] },
  mirror:   { n: "mirror text", hp: 32, c: "#c9b8ff", sh: "ghost", eyes: 2, g: "mirror", gt: "mirror: 25% of your damage bounces back", p: [["a",6],["b",6],["a",8]], lines: ["sdrawkcab", "hit me and you hit you"] },
  boldf:    { n: "bold font", hp: 40, c: "#ff5c3d", sh: "box", eyes: 2, g: "cap", gt: "max 14 damage per word", p: [["a",7],["a",8],["b",5]], lines: ["**unbothered**", "i am very thick"] },
  e404:     { n: "error 404", hp: 44, c: "#a0a8c8", sh: "box", eyes: 2, g: "phase", gt: "404", p: [["a",10],["m",[3,3]],["a",12]], lines: ["monster not found", "have you tried refreshing"] },
  cookie:   { n: "the cookie banner", hp: 46, c: "#ffb36b", sh: "blob", eyes: 2, g: "lock", gt: "locks one of your tiles each turn", p: [["a",9],["b",10],["a",11]], lines: ["accept all?", "we value your privacy (we don't)"] },
  scroll:   { n: "infinite scroll", hp: 48, c: "#4dd6a0", sh: "worm", eyes: 2, g: "regen", gt: "regen: heals 3 every turn", p: [["a",9],["a",10],["m",[3,3]]], lines: ["there's always more", "you've been here 4 hours"] },
  police:   { n: "grammar police", hp: 34, c: "#4d7cff", sh: "box", eyes: 2, elite: 1, p: [["a",6],["b",8],["a",11]], lines: ["it's whom, actually", "you have the right to remain correct"] },
  squiggle: { n: "the red squiggle", hp: 32, c: "#ff3355", sh: "worm", eyes: 2, elite: 1, p: [["m",[3,3]],["a",9],["h",6]], lines: ["did you mean: lose?", "i live under your words"] },
  capslock: { n: "CAPS LOCK", hp: 38, c: "#ffd23f", sh: "box", eyes: 2, elite: 1, p: [["a",12],["b",8],["a",5]], lines: ["WHY ARE WE YELLING", "I AM NOT YELLING YOU ARE"] },
  bee:      { n: "the spelling bee", hp: 55, c: "#ffd23f", sh: "bee", eyes: 2, boss: 1, p: [["m",[2,2]],["a",7],["s","buzz"]], lines: ["spell 'defeat'. d-e-f-e-a-t. thank you.", "can you use 'ouch' in a sentence?", "b. e. e. bee."] },
  thes:     { n: "the thesaurus", hp: 82, c: "#4dd6a0", sh: "book", eyes: 2, boss: 1, gt: "repeat a word: 0 damage", p: [["a",11],["b",12],["m",[4,4]],["h",10]], lines: ["hit, strike, smack, wallop, you", "repeat a word and i ignore it. ignore, disregard, snub.", "i'm not big. i'm voluminous."] },
  auto:     { n: "AUTOCORRECT", hp: 96, c: "#5cd6ff", sh: "phone", eyes: 2, boss: 1, gt: "changes one of your letters every turn", p: [["a",11],["m",[4,3]],["b",12],["a",15]], lines: ["did you mean: ducking", "i know what you meant. i don't care.", "your k is now an e. you're welcome."] }
};
var POOL = { 1: ["gremlin","lorem","semi","spam","comma","cactus","hashtag","ehater"], 2: ["passive","runon","apos","click","tldr","mirror","boldf"], 3: ["replyall","captcha","fine","dolor","e404","cookie","scroll"] };
var ELITES = { 1: ["police","capslock"], 2: ["police","squiggle","capslock"], 3: ["squiggle","capslock","police"] };
var BOSS = { 1: "bee", 2: "thes", 3: "auto" };
var SCALE = { 1: [1, 1], 2: [0.95, 1.0], 3: [1.0, 1.1] };
var STEPS = 6; // 5 stops + boss

// ---------- save ----------
var SAVE_KEY = "tw-save";
var meta = { bestAct: 0, bestScore: 0, words: 0, longest: "", runs: 0, wins: 0, unlocks: [] };
try { var raw = localStorage.getItem(SAVE_KEY); if (raw) { var m = JSON.parse(raw); for (var k in m) meta[k] = m[k]; } } catch (e) {}
function saveMeta() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(meta)); } catch (e) {} }
muted = !!meta.muted;
function setMuted(m) { muted = !!m; meta.muted = muted; saveMeta(); var t = muted ? "sound off" : "sound on"; ["muteBtn", "muteBtn2"].forEach(function (id) { var b = $(id); if (b) { b.textContent = muted ? "\uD83D\uDD07" : "\uD83D\uDD0A"; b.title = t; b.setAttribute("aria-label", t); } }); }

// ---------- rng ----------
var rngMain = Math.random;
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rnd(n) { return Math.floor(rngMain() * n); }
function pickOne(a) { return a[rnd(a.length)]; }
function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

// timers that die with the run/fight they were made in
function later(fn, ms) { var s0 = S, f0 = F; return setTimeout(function () { if (S === s0 && F === f0) fn(); }, ms); }

// ---------- run state ----------
var S = null, starterChoice = null;
function newBag() { var b = []; for (var l in FREQ) for (var i = 0; i < FREQ[l]; i++) b.push({ l: l }); return b; }
function newRun() {
  S = {
    hp: 45, max: 45, gold: 0, act: 1, step: 0, bag: newBag(), relics: [], score: 0, dmg: 0,
    fights: 0, wordsCast: 0, longest: "", best: { w: "", d: 0 }, t0: Date.now(), over: false,
    path: [], screen: "map"
  };
  if (starterChoice) addRelic(starterChoice, true);
  evCount = 0;
  if (!SHOT) { meta.runs++; saveMeta(); ccStart(); }
}
function has(r) { return S && S.relics.indexOf(r) >= 0; }
function addRelic(id, quiet) {
  if (has(id)) return;
  S.relics.push(id);
  if (id === "skin") { S.max += 12; S.hp += 12; }
  if (!quiet) { toast("got relic: " + RELICS[id].n); ccEvent("relic", { id: id }); }
  renderTop();
}

// ---------- screens ----------
var SCREENS = ["fight", "title", "map", "shop", "pick", "end"];
function show(name) {
  SCREENS.forEach(function (s) { $(s).classList.toggle("on", s === name); });
  $("top").classList.toggle("hidden", name === "title" || name === "end");
  if (S) S.screen = name;
  if (name === "fight") requestAnimationFrame(resizeCanvas);
}
var toastT = 0;
function toast(t, ms) { var el = $("toast"); el.textContent = t; el.classList.remove("hidden"); clearTimeout(toastT); toastT = setTimeout(function () { el.classList.add("hidden"); }, ms || 1800); }

function renderTop() {
  if (!S) return;
  $("hp").textContent = Math.max(0, S.hp) + "/" + S.max;
  $("gold").textContent = S.gold;
  var stp = Math.min(S.step, STEPS);
  $("where").textContent = "act " + S.act + " · " + stp + "/" + STEPS;
  var sh = F && F.shield > 0 && S.screen === "fight";
  $("shield").classList.toggle("hidden", !sh);
  if (sh) $("shield").textContent = F.shield;
  var r = $("relics"); r.innerHTML = "";
  S.relics.forEach(function (id) {
    var d = document.createElement("span"); d.className = "relic"; d.style.background = RELICS[id].c;
    d.textContent = RELICS[id].g; d.title = RELICS[id].n + ": " + RELICS[id].d;
    d.onclick = function () { toast(RELICS[id].n + ": " + RELICS[id].d, 3000); };
    r.appendChild(d);
  });
}

// ---------- title ----------
function renderTitle() {
  var di = dailyInfo(), md = meta.daily && meta.daily.key === di.key ? meta.daily : null;
  $("dailyBtn").innerHTML = "daily spell #" + di.n + "<small>" + (md ? "today: " + md.rows + " \u00B7 " + md.score : "same 5 fights for everyone today") + "</small>";
  var st = $("starter"); st.innerHTML = "";
  var opts = STARTER_UNLOCKS.filter(function (u) { return meta.unlocks.indexOf(u[0]) >= 0; });
  if (opts.length) {
    var mk = function (id, label) {
      var b = document.createElement("button"); b.textContent = label;
      if (starterChoice === id) b.className = "sel";
      b.onclick = function () { starterChoice = id; renderTitle(); };
      st.appendChild(b);
    };
    mk(null, "no starter relic");
    opts.forEach(function (u) { mk(u[0], RELICS[u[0]].n); });
  }
  var locked = STARTER_UNLOCKS.filter(function (u) { return meta.unlocks.indexOf(u[0]) < 0; }).map(function (u) { return u[1] + " to unlock a starter"; });
  $("meta").innerHTML = meta.runs ? ("best: act " + meta.bestAct + " · score " + meta.bestScore + " · longest “" + (meta.longest || "-") + "” · " + meta.words + " words cast" + (meta.wins ? " · " + meta.wins + " wins" : "")) + (locked.length ? "<br>" + locked[0] : "") : "first run takes about 3 minutes to go horribly wrong.";
  show("title");
}

// ---------- map ----------
var NODE = {
  fight: { i: "⚔", n: "fight", d: "a regular monster. gold inside.", c: "fightc" },
  elite: { i: "☠", n: "elite", d: "rude and strong. drops a relic.", c: "elitec" },
  shop:  { i: "$", n: "shop", d: "buy letters. sell your dignity.", c: "shopc" },
  rest:  { i: "☕", n: "rest", d: "nap or study. not both. you're not a hero.", c: "restc" },
  boss:  { i: "♛", n: "boss", d: "", c: "bossc" }
};
function genChoices() {
  var st = S.step + 1; // the stop we are choosing
  if (st >= STEPS) return ["boss"];
  if (S.act === 1 && st === 1) return ["fight"];
  var pool = st === STEPS - 1 ? ["rest", "shop", "fight", "elite"] : ["fight", "fight", "fight", "shop", "rest", "elite"];
  if (st < 3 && S.act === 1) pool = ["fight", "fight", "shop", "rest"];
  var out = [];
  var tries = 0;
  while (out.length < 3 && tries++ < 50) { var c = pickOne(pool); if (out.indexOf(c) < 0 || (c === "fight" && out.filter(function (x) { return x === "fight"; }).length < 1)) out.push(c); }
  if (out.indexOf("fight") < 0 && out.indexOf("elite") < 0) out[0] = "fight";
  return out;
}
function goMap() {
  if (S.over) return;
  var ch = genChoices();
  if (ch.length === 1 && ch[0] === "fight" && S.act === 1 && S.step === 0) { S.step = 1; startFight("fight"); return; }
  $("mapTitle").textContent = ch[0] === "boss" ? "act " + S.act + " boss: " + MON[BOSS[S.act]].n : "act " + S.act + ": pick your next stop";
  var steps = $("mapSteps"); steps.innerHTML = "";
  for (var i = 1; i <= STEPS; i++) { var d = document.createElement("i"); d.className = i <= S.step ? "done" : i === S.step + 1 ? "now" : i === STEPS ? "boss" : ""; steps.appendChild(d); }
  var box = $("mapChoices"); box.innerHTML = "";
  ch.forEach(function (c) {
    var n = NODE[c], b = document.createElement("button");
    b.className = "card " + n.c;
    var desc = c === "boss" ? MON[BOSS[S.act]].lines[0] : n.d;
    b.innerHTML = '<div class="big">' + n.i + "</div><b>" + (c === "boss" ? MON[BOSS[S.act]].n : n.n) + "</b><span>" + desc + "</span>";
    b.onclick = function () { S.step++; enterNode(c); };
    box.appendChild(b);
  });
  renderTop(); show("map");
}
function enterNode(c) {
  if (c === "fight" || c === "elite" || c === "boss") startFight(c);
  else if (c === "shop") openShop();
  else if (c === "rest") openRest();
}

// ---------- fight ----------
var F = null; // current fight
function makeMonster(kind, forceId) {
  var id;
  if (forceId) id = forceId;
  else if (kind === "boss") id = BOSS[S.act];
  else if (kind === "elite") id = pickOne(ELITES[S.act]);
  else id = pickOne(POOL[S.act]);
  var t = MON[id], sc = SCALE[S.act];
  var early = S.act === 1 ? (kind === "boss" ? 1 : S.step <= 2 ? 0.8 : 0.9) : 1;
  var hp = Math.round(t.hp * sc[0] * early);
  return { id: id, t: t, hp: hp, max: hp, block: 0, burn: 0, burnT: 0, frozen: false, pi: 0, intent: null, atkMul: sc[1] * (S.act === 1 && kind !== "boss" ? (S.step <= 2 ? 0.75 : 0.9) : 1), turn: 0 };
}
function startFight(kind, forceId) {
  F = {
    kind: kind, m: makeMonster(kind, forceId), hand: [], sel: [], draw: [], shield: has("wrap") ? 6 : 0,
    redraws: has("rehab") ? 2 : 1, used: {}, busy: false, turn: 0, hitT: 0, shake: 0, dead: false, swapIdx: -1
  };
  F.draw = shuffle(S.bag.map(function (t) { return { l: t.l, g: !!t.g, w: !!t.w }; }));
  refill();
  if (has("leaf") && F.hand.length) { var nt = F.hand.filter(function (t) { return !t.w; }); if (nt.length) pickOne(nt).g = true; }
  nextIntent();
  show("fight");
  if (kind === "boss") sfx("boss");
  say(pickOne(F.m.t.lines), 2600);
  renderFight();
  if (!meta.runs || (meta.runs === 1 && S.fights === 0 && !meta.words)) toast("tap letters to spell a word, then cast", 2600);
}
function drawOne() {
  if (!F.draw.length) {
    F.draw = shuffle(S.bag.map(function (t) { return { l: t.l, g: !!t.g, w: !!t.w }; }));
  }
  return F.draw.pop();
}
function vowelCount(h) { return h.filter(function (t) { return t && (VOW.indexOf(t.l) >= 0 || t.w); }).length; }
function refill() {
  for (var i = 0; i < 8; i++) if (!F.hand[i]) F.hand[i] = drawOne();
  // keep the hand playable: 2..5 vowels
  var guard = 0;
  while (vowelCount(F.hand) < 2 && guard++ < 12) {
    var vi = F.draw.findIndex(function (t) { return VOW.indexOf(t.l) >= 0; });
    if (vi < 0) { F.draw.push({ l: pickOne(["a","e","i","o"]) }); vi = F.draw.length - 1; }
    var ci = F.hand.findIndex(function (t) { return VOW.indexOf(t.l) < 0 && !t.w && !t.g && "qzxjkv".indexOf(t.l) < 0; });
    if (ci < 0) ci = F.hand.findIndex(function (t) { return VOW.indexOf(t.l) < 0 && !t.w; });
    if (ci < 0) break;
    var v = F.draw.splice(vi, 1)[0]; F.draw.unshift(F.hand[ci]); F.hand[ci] = v;
  }
  guard = 0;
  while (vowelCount(F.hand) > 5 && guard++ < 12) {
    var ki = F.draw.findIndex(function (t) { return VOW.indexOf(t.l) < 0; });
    if (ki < 0) break;
    var oi = F.hand.findIndex(function (t) { return VOW.indexOf(t.l) >= 0 && !t.g; });
    if (oi < 0) break;
    var c = F.draw.splice(ki, 1)[0]; F.draw.unshift(F.hand[oi]); F.hand[oi] = c;
  }
}
function tileStr(t, wl) { if (t.w) return wl || "?"; if (t.l === "q" && has("qu")) return "qu"; return t.l; }
function curWord() { return F.sel.map(function (s) { return tileStr(F.hand[s.i], s.wl); }).join(""); }

// resolve wildcards: returns concrete word or null
function resolveWord() {
  var parts = F.sel.map(function (s) { var t = F.hand[s.i]; return t.w ? (s.wl || "?") : tileStr(t); });
  var raw = parts.join("");
  if (raw.indexOf("?") < 0) return DICT.has(raw) ? raw : null;
  var idx = []; parts.forEach(function (p, i) { if (p === "?") idx.push(i); });
  var L = "abcdefghijklmnopqrstuvwxyz", found = null;
  (function rec(k) {
    if (found) return;
    if (k === idx.length) { var w = parts.join(""); if (DICT.has(w)) found = w; return; }
    for (var c = 0; c < 26 && !found; c++) { parts[idx[k]] = L[c]; rec(k + 1); }
    parts[idx[k]] = "?";
  })(0);
  return found;
}

function calc(word) {
  // word: concrete string; uses F.sel tiles for gold/wild values
  var base = 0, vowels = 0;
  F.sel.forEach(function (s) {
    var t = F.hand[s.i];
    if (t.w) return;
    var v = t.l === "q" && has("qu") ? VAL.q + VAL.u : VAL[t.l];
    if (t.g) v *= 2;
    base += v;
  });
  for (var i = 0; i < word.length; i++) if (VOW.indexOf(word[i]) >= 0) vowels++;
  if (has("vowel")) base += vowels;
  if (has("nope") && word.indexOf("e") < 0) base += 4;
  var len = Math.min(word.length, 8);
  var mult = LENMULT[len] || 3;
  if (has("long") && word.length >= 7) mult *= 1.5;
  var concrete = F.sel.filter(function (s) { return !F.hand[s.i].w; }).map(function (s) { return tileStr(F.hand[s.i]); }).join("");
  var fx = {
    burn: /[qz]/.test(concrete), freeze: /[xj]/.test(concrete), crit: (concrete.match(/[kv]/g) || []).length,
    shield: /(.)\1/.test(word) ? 3 + word.length : 0
  };
  var dmg = Math.round(base * mult);
  if (has("silent") && word[word.length - 1] === "e") dmg += 3;
  if (has("plural") && word[word.length - 1] === "s") dmg = Math.round(dmg * 1.25);
  if (has("first") && !F.firstDone) dmg *= 2;
  var g = F.m.t.g;
  if (g === "bane" && word.indexOf("e") >= 0) dmg = Math.floor(dmg / 2);
  if (g === "short" && word.length <= 3) dmg = 0;
  if (g === "phase" && F.m.phase) dmg = 0;
  if (F.m.id === "thes" && F.used[word]) dmg = 0;
  if (F.m.frozen && has("chill")) dmg = Math.round(dmg * 1.3);
  return { dmg: dmg, fx: fx };
}

function renderFight() {
  if (!F) return;
  var rack = $("rack"); rack.innerHTML = "";
  F.hand.forEach(function (t, i) {
    var b = document.createElement("button");
    var used = F.sel.some(function (s) { return s.i === i; });
    b.className = "tile" + (t.g ? " g" : "") + (t.w ? " w" : "") + ("qzxjkv".indexOf(t.l) >= 0 && !t.w ? " r" : "") + (used ? " used" : "") + (F.swapIdx === i ? " swap" : "");
    b.innerHTML = (t.w ? "?" : tileStr(t)) + "<sub>" + (t.w ? 0 : (t.l === "q" && has("qu") ? 11 : VAL[t.l]) * (t.g ? 2 : 1)) + "</sub>";
    b.dataset.i = i; if (F.lockIdx === i) b.className += " lk";
    rack.appendChild(b);
  });
  var wd = $("word"); wd.innerHTML = "";
  if (!F.sel.length) wd.innerHTML = '<span class="ph">' + (F.busy ? "..." : "tap letters or type") + "</span>";
  F.sel.forEach(function (s, k) {
    var t = F.hand[s.i], d = document.createElement("span");
    d.className = "wl" + (t.g ? " g" : "") + (t.w ? " w" : "");
    d.textContent = t.w ? (s.wl || "?") : tileStr(t);
    d.dataset.k = k;
    wd.appendChild(d);
  });
  var pv = $("preview"), cb = $("castBtn");
  pv.classList.remove("bad");
  if (F.sel.length) {
    var w = resolveWord();
    if (w && w.length >= 2) {
      var c = calc(w), bits = [c.dmg + " dmg"];
      if (c.fx.burn) bits.push("burn"); if (c.fx.freeze) bits.push("freeze"); if (c.fx.crit) bits.push("crit " + Math.min(90, c.fx.crit * 40) + "%"); if (c.fx.shield) bits.push("shield " + c.fx.shield);
      if (F.m.t.g === "cap" && c.dmg > 14) bits[0] = "14 dmg (capped)";
      if (F.m.id === "thes" && F.used[w]) bits = ["already used. the thesaurus yawns."];
      if (w !== curWord()) bits.unshift("“" + w + "”");
      pv.textContent = bits.join(" · "); cb.disabled = false;
    } else { pv.textContent = F.sel.length < 2 ? "" : "not a word (yet)"; pv.classList.add("bad"); cb.disabled = true; }
  } else { pv.textContent = ""; cb.disabled = true; }
  var rb = $("redrawBtn");
  rb.innerHTML = "redraw<small>" + (F.redraws > 0 ? F.redraws + " free" : "costs your turn") + "</small>";
  rb.disabled = F.busy;
  // monster ui
  var m = F.m;
  $("mname").textContent = m.t.n;
  $("mhpfill").style.width = Math.max(0, m.hp / m.max * 100) + "%";
  $("mhptext").textContent = Math.max(0, m.hp) + " / " + m.max + (m.block ? "  ◆" + m.block : "");
  var st = [];
  if (m.burnT > 0) st.push('<span style="color:#ff9d4d">burn ' + m.burn + " ×" + m.burnT + "</span>");
  if (m.frozen) st.push('<span style="color:#8fe3ff">frozen</span>');
  if (m.block) st.push('<span style="color:#5cd6ff">block ' + m.block + "</span>");
  if (m.t.gt) st.push('<span style="color:#ffd23f">' + (m.t.g === "phase" ? (m.phase ? "404: immune this turn" : "found: hittable") : m.t.gt) + "</span>");
  $("mstatus").innerHTML = st.join("");
  var it = $("intent"), I = m.intent;
  if (m.frozen) { it.className = "intent frz"; it.textContent = "❄ frozen: skips turn"; }
  else if (I) {
    var a = intentDmg(I);
    if (I[0] === "a") { it.className = "intent atk"; it.textContent = "⚔ " + a; }
    else if (I[0] === "m") { it.className = "intent atk"; it.textContent = "⚔ " + a + "×" + I[1][1]; }
    else if (I[0] === "b") { it.className = "intent blk"; it.textContent = "◆ block " + I[1]; }
    else if (I[0] === "h") { it.className = "intent heal"; it.textContent = "✚ heal " + I[1]; }
    else if (I[0] === "s") { it.className = "intent spc"; it.textContent = "🐝 buzz: steals a tile + ⚔" + Math.round(4 * m.atkMul); }
  }
  renderTop();
}
function intentDmg(I) {
  var m = F.m;
  if (I[0] === "a") return Math.round(I[1] * m.atkMul);
  if (I[0] === "m") return Math.round(I[1][0] * m.atkMul);
  return 0;
}
function nextIntent() {
  var m = F.m; m.intent = m.t.p[m.pi % m.t.p.length]; m.pi++;
}

function tapTile(i) {
  if (!F || F.dead || S.screen !== "fight" || i === F.lockIdx) { if (F && i === F.lockIdx) { toast("that tile is locked. cookies were not accepted."); flashBad(); } return; }
  var k = F.sel.findIndex(function (s) { return s.i === i; });
  if (k >= 0) F.sel.splice(k, 1);
  else { F.sel.push({ i: i }); sfx("tile"); }
  renderFight();
}
function typeLetter(ch) {
  if (!F || F.dead || S.screen !== "fight") return;
  var free = function (i) { return i !== F.lockIdx && !F.sel.some(function (s) { return s.i === i; }); };
  // qu tile: typing q picks it, a following u is absorbed if the last tile was qu
  if (ch === "u" && F.sel.length && has("qu")) { var last = F.hand[F.sel[F.sel.length - 1].i]; if (last.l === "q" && !last.w && !F._uAbsorbed) { F._uAbsorbed = true; return; } }
  F._uAbsorbed = false;
  var cands = [];
  F.hand.forEach(function (t, i) { if (free(i) && !t.w && t.l === ch) cands.push(i); });
  cands.sort(function (a, b) { return (F.hand[b].g ? 1 : 0) - (F.hand[a].g ? 1 : 0); });
  if (cands.length) F.sel.push({ i: cands[0] });
  else {
    var wi = F.hand.findIndex(function (t, i) { return free(i) && t.w; });
    if (wi >= 0) F.sel.push({ i: wi, wl: ch });
    else { flashBad(); return; }
  }
  sfx("tile");
  renderFight();
}
function flashBad() { var r = $("rack"); r.classList.remove("shake"); void r.offsetWidth; r.classList.add("shake"); }

function cast() {
  if (!F || F.dead || !F.sel.length) return;
  if (F.busy) { F.queued = true; return; }
  var w = resolveWord();
  if (!w || w.length < 2) { toast("not a word (yet)"); flashBad(); sfx("bad"); return; }
  var c = calc(w), m = F.m;
  F.busy = true;
  sfx("cast");
  var dmg = c.dmg, crit = false;
  var cc = Math.min(0.9, c.fx.crit * 0.4 + (has("dice") ? 0.2 : 0));
  if (cc > 0 && dmg > 0 && rngMain() < cc) { dmg *= 2; crit = true; }
  if (m.t.g === "cap") dmg = Math.min(dmg, 14);
  var thesNo = m.id === "thes" && F.used[w];
  F.used[w] = 1;
  flyLetters();
  // remove used tiles now so the next word can be typed during the animation
  var idxs = F.sel.map(function (s) { return s.i; });
  idxs.forEach(function (i) { F.hand[i] = null; });
  F.sel = [];
  refill();
  // stats
  S.wordsCast++; meta.words++;
  if (w.length > S.longest.length) S.longest = w;
  if (w.length > (meta.longest || "").length) meta.longest = w;
  if (dmg > S.best.d) S.best = { w: w, d: dmg };
  if (w.length >= 7) ccEvent("long_word", { len: w.length });
  if (has("piggy")) { S.gold += 1; }
  renderFight();
  later(function () {
    var dealt = dmg;
    if (m.block) { var ab = Math.min(m.block, dealt); m.block -= ab; dealt -= ab; if (ab) floatText("\u25C6 -" + ab, "#8fe3ff", 2); }
    m.hp -= dealt;
    S.dmg += dealt; S.score += dealt;
    sfx("hit");
    popDamage(dealt, crit, w.length);
    if (thesNo) say("i've read that one.", 1600);
    if (m.t.g === "phase" && m.phase) say("404: damage not found.", 1500);
    F.hitT = 1; F.shake = 10 + Math.min(20, dealt / 2);
    if (c.fx.burn) { m.burn = 3 + (has("pyro") ? 2 : 0); m.burnT += 3 + (has("kindle") ? 2 : 0); later(function () { floatText("burn!", "#ff9d4d", 1); }, 220); }
    if (c.fx.freeze) { m.frozen = true; if (has("ice")) F.shield += 5; later(function () { floatText("frozen!", "#8fe3ff", 1); }, 320); }
    if (c.fx.shield) { F.shield += c.fx.shield * (has("wall") ? 2 : 1); }
    if (has("five") && w.length === 5) heal(3);
    if (has("nerd") && w.length >= 6) heal(2);
    if (has("fang")) heal(Math.floor(dealt / 6));
    if (m.t.g === "thorns") { S.hp -= 1; floatText("-1 thorns", "#ff5c7a", 3); }
    if (m.t.g === "mirror" && dealt > 0) { var back = Math.round(dealt * 0.25); if (back) { floatText("mirrored", "#c9b8ff", 1); hitPlayer(back, true); } }
    F.firstDone = true;
    renderFight();
    if (S.over) return;
    if (S.hp <= 0) { S.hp = 0; S.over = true; later(function () { endRun(false); }, 600); return; }
    if (m.hp <= 0) { later(winFight, 650); return; }
    later(monsterTurn, 650);
  }, 330);
}
function flyLetters() {
  var st = $("stage").getBoundingClientRect(), app = $("app").getBoundingClientRect();
  var tx = st.left + st.width / 2 - app.left, ty = st.top + st.height * 0.5 - app.top;
  var spans = document.querySelectorAll("#word .wl");
  spans.forEach(function (sp, k) {
    var r = sp.getBoundingClientRect(), d = sp.cloneNode(true);
    d.className += " fly"; d.style.left = (r.left - app.left) + "px"; d.style.top = (r.top - app.top) + "px";
    $("app").appendChild(d);
    try {
      d.animate([{ transform: "translate(0,0) scale(1) rotate(0)", opacity: 1 },
        { transform: "translate(" + (tx - (r.left - app.left) - r.width / 2) + "px," + (ty - (r.top - app.top) - r.height / 2) + "px) scale(.5) rotate(" + (k % 2 ? 200 : -200) + "deg)", opacity: 0.9 }],
        { duration: 300, delay: k * 18, easing: "cubic-bezier(.5,0,.9,.6)", fill: "forwards" });
    } catch (e) {}
    setTimeout(function () { d.remove(); }, 360 + k * 18);
  });
}
function popDamage(n, crit, len) {
  var d = document.createElement("div"); d.className = "dmgpop" + (crit ? " crit" : "");
  d.textContent = (crit ? "crit! " : "") + "-" + n; d.style.fontSize = Math.min(64, 30 + n * 0.6) + "px";
  $("floats").appendChild(d); setTimeout(function () { d.remove(); }, 1100);
  if (len >= 5) {
    var c = document.createElement("div"); c.className = "callout";
    c.textContent = len + " letters! x" + (LENMULT[Math.min(8, len)] * (has("long") && len >= 7 ? 1.5 : 1));
    $("floats").appendChild(c); setTimeout(function () { c.remove(); }, 1300);
  }
}
function lockTile() {
  var c = []; F.hand.forEach(function (t, i) { if (!t.w) c.push(i); });
  F.lockIdx = pickOne(c);
  F.sel = F.sel.filter(function (s) { return s.i !== F.lockIdx; });
}
function heal(n) { if (n <= 0) return; S.hp = Math.min(S.max, S.hp + n); floatText("+" + n + " hp", "#7cff6b", 2); renderTop(); }

function redraw() {
  if (!F || F.busy) return;
  F.sel = [];
  var free = F.redraws > 0;
  F.hand = F.hand.map(function (t) { F.draw.unshift(t); return null; });
  shuffle(F.draw); // fresh mix
  refill();
  if (free) { F.redraws--; toast("fresh letters. same problems."); renderFight(); }
  else { F.busy = true; toast("redraw: the monster gets a free turn"); renderFight(); later(monsterTurn, 500); }
}

function monsterTurn() {
  if (!F || F.dead) return;
  var m = F.m;
  // burn tick
  if (m.burnT > 0) {
    m.hp -= m.burn; S.dmg += m.burn; S.score += m.burn; m.burnT--; floatText("-" + m.burn + " burn", "#ff9d4d");
    if (m.burnT === 0) m.burn = 0;
    if (m.hp <= 0) { renderFight(); later(winFight, 500); return; }
  }
  m.block = 0;
  var I = m.intent;
  if (m.frozen) { m.frozen = false; say("brr. i'll get you next turn.", 1400); }
  else if (I[0] === "a") { F.lunge = 1; hitPlayer(intentDmg(I)); }
  else if (I[0] === "m") { var n = intentDmg(I), times = I[1][1]; for (var k = 0; k < times; k++) (function (k) { later(function () { if (!S.over) { F.lunge = 1; hitPlayer(n); } }, k * 180); })(k); }
  else if (I[0] === "b") { m.block = I[1]; floatText("◆ " + I[1], "#8fe3ff"); }
  else if (I[0] === "h") { var h = Math.round(I[1] * (SCALE[S.act][0])); m.hp = Math.min(m.max, m.hp + h); floatText("+" + h, "#7cff6b"); }
  else if (I[0] === "s") { // spelling bee: steals best tile, stings
    var bi = -1, bv = -1; F.hand.forEach(function (t, i) { var v = t.w ? 6 : VAL[t.l] * (t.g ? 2 : 1); if (v > bv) { bv = v; bi = i; } });
    if (bi >= 0) { var stolen = F.hand[bi]; F.hand[bi] = drawOne(); F.swapIdx = bi; F.sel = F.sel.filter(function (s) { return s.i !== bi; }); say("i'll take that " + (stolen.w ? "?" : stolen.l) + ". for spelling purposes.", 1800); }
    hitPlayer(Math.round(4 * m.atkMul));
  }
  if (m.t.g === "grow") { m.atkMul += 0.15; }
  if (m.t.g === "regen" && m.hp > 0) { m.hp = Math.min(m.max, m.hp + 3); }
  if (m.t.g === "phase") m.phase = !m.phase;
  m.turn++;
  later(function () {
    if (S.over || !F) return;
    nextIntent();
    // autocorrect: swaps one of your letters each turn
    if (m.id === "auto") autocorrect();
    if (Math.random() < 0.18) say(pickOne(m.t.lines), 1800);
    F.busy = false; F.turn++;
    if (m.t.g === "lock") lockTile();
    renderFight();
    F.swapIdx = -1;
    if (F.queued) { F.queued = false; cast(); }
  }, I && I[0] === "m" ? I[1][1] * 180 + 200 : 300);
  renderFight();
}
var AC_MAP = { k: "e", q: "a", z: "s", x: "e", j: "i", v: "e", w: "e", f: "e", h: "a", y: "e", b: "e", p: "o", c: "o", g: "a", m: "n" };
function autocorrect() {
  var cands = [];
  F.hand.forEach(function (t, i) { if (!t.w) cands.push(i); });
  cands.sort(function (a, b) { return VAL[F.hand[b].l] - VAL[F.hand[a].l]; });
  var i = cands[rnd(Math.min(3, cands.length))]; if (i == null) return;
  var t = F.hand[i], from = t.l, to = AC_MAP[from] || pickOne(["e", "e", "a", "s", "t"]);
  if (to === from) to = "e";
  F.hand[i] = { l: to, g: t.g };
  F.swapIdx = i; F.sel = F.sel.filter(function (s) { return s.i !== i; });
  say("autocorrected your " + from + " to " + (from === "k" ? "a ducking " : "") + to + ". you're welcome.", 2200);
}
function hitPlayer(n, noFx) {
  var blk = Math.min(F.shield, n);
  if (blk && has("spike")) { F.m.hp -= blk; floatText("-" + blk + " spikes", "#ffb36b"); }
  F.shield -= blk; n -= blk;
  if (blk) floatText("◆ blocked " + blk, "#8fe3ff", 2);
  if (n > 0) {
    S.hp -= n; if (!noFx) sfx("hurt");
    var app = $("app"); app.classList.remove("hurt"); void app.offsetWidth; app.classList.add("hurt");
    var rk = $("rack"); rk.classList.remove("shake"); void rk.offsetWidth; rk.classList.add("shake");
    floatText("-" + n + " you", "#ff5c7a", 3);
  }
  renderTop();
  if (S.hp <= 0) { S.hp = 0; later(function () { endRun(false); }, 600); S.over = true; }
  else if (F.m.hp <= 0) later(winFight, 400);
}

function winFight() {
  if (!F || F.dead || S.over) return;
  F.dead = true; sfx("gold");
  var kind = F.kind;
  S.fights++;
  var g = kind === "boss" ? 40 : kind === "elite" ? 25 : 10 + rnd(6);
  if (has("purse")) g = Math.round(g * 1.5);
  S.gold += g;
  S.score += kind === "boss" ? 300 : kind === "elite" ? 80 : 40;
  ccScore(S.score);
  var breath = kind === "boss" ? 0 : 4;
  if (breath) S.hp = Math.min(S.max, S.hp + breath);
  toast("+" + g + " gold" + (breath ? ", +" + breath + " hp" : "") + ". the " + F.m.t.n + " has been cooked.", 1600);
  F.shield = 0;
  if (S.daily) { dailyNext(true); return; }
  if (kind === "boss") {
    ccEvent("boss_beat", { act: S.act });
    if (S.act === 1 && meta.unlocks.indexOf("wrap") < 0) { meta.unlocks.push("wrap"); saveMeta(); }
    if (S.act >= 3) { later(function () { endRun(true); }, 900); return; }
    later(function () { relicPick(3, "boss loot", "pick a relic. then act " + (S.act + 1) + " begins.", function () {
      S.act++; S.step = 0; S.hp = S.max;
      if (S.act > meta.bestAct) meta.bestAct = S.act; saveMeta();
      ccEvent("act", { n: S.act });
      toast("act " + S.act + ". fully healed. the words get meaner.", 2200);
      goMap();
    }); }, 900);
    return;
  }
  if (kind === "elite") { later(function () { relicPick(2, "elite loot", "the elite dropped this. finders keepers.", goMap); }, 900); return; }
  later(function () { postFightPick(); }, 900);
}
// after a normal fight: pick a tile to add (deck building)
function postFightPick(next) {
  next = next || goMap;
  var opts = [];
  var rare = shuffle(["q","z","x","j","k","v"]).slice(0, 1)[0];
  opts.push({ t: { l: rare }, n: "add " + an(rare), d: rareDesc(rare) });
  var common = pickOne(["e","a","r","s","t","n","l","o","i"]);
  opts.push({ t: { l: common, g: true }, n: "add a gold " + common, d: "worth double. shiny." });
  if (rngMain() < 0.35) opts.push({ t: { l: "?", w: true }, n: "add a wildcard", d: "becomes any letter. worth 0, worth it." });
  else { var mid = pickOne(["h","m","p","c","b","f","w","y","d","g"]); opts.push({ t: { l: mid }, n: "add " + an(mid), d: "a respectable consonant." }); }
  showPick("loot", "add a tile to your bag (or don't)", opts.map(function (o) {
    return { html: '<div class="big">' + (o.t.w ? "?" : o.t.l) + "</div><b>" + o.n + "</b><span>" + o.d + "</span>", cls: o.t.g ? "shopc" : o.t.w ? "elitec" : "", go: function () { S.bag.push(o.t); next(); } };
  }), next);
}
function an(l) { return ("aefhilmnorsx".indexOf(l) >= 0 ? "an " : "a ") + l; }
function rareDesc(l) { return /[qz]/.test(l) ? "10 pts. burns." : /[xj]/.test(l) ? "8 pts. freezes." : "crit chance."; }
function relicPick(n, title, sub, after) {
  var avail = Object.keys(RELICS).filter(function (id) { return !has(id); });
  shuffle(avail);
  var opts = avail.slice(0, n);
  if (!opts.length) { S.gold += 30; toast("no relics left. here's 30 gold."); after(); return; }
  showPick(title, sub, opts.map(function (id) {
    return { html: '<div class="big" style="color:' + RELICS[id].c + '">' + RELICS[id].g + "</div><b>" + RELICS[id].n + "</b><span>" + RELICS[id].d + "</span>", go: function () { addRelic(id); after(); } };
  }), after);
}
function showPick(title, sub, opts, skip) {
  $("pickTitle").textContent = title; $("pickSub").textContent = sub;
  var box = $("pickItems"); box.innerHTML = "";
  opts.forEach(function (o) {
    var b = document.createElement("button"); b.className = "card item " + (o.cls || ""); b.innerHTML = o.html;
    b.onclick = function () { o.go(); }; box.appendChild(b);
  });
  $("pickSkip").onclick = skip;
  $("pickSkip").classList.toggle("hidden", !skip);
  renderTop(); show("pick");
}

// ---------- rest ----------
function openRest() {
  var h = Math.round(S.max * (has("pillow") ? 0.55 : 0.35));
  showPick("rest stop", "a quiet room. no words. bliss.", [
    { html: '<div class="big">☕</div><b>nap</b><span>heal ' + h + " hp. drool optional.</span>", cls: "restc", go: function () { heal(h); goMap(); } },
    { html: '<div class="big">✎</div><b>study</b><span>turn 2 random letters in your bag gold (x2 value).</span>', cls: "shopc", go: function () {
      var c = S.bag.filter(function (t) { return !t.g && !t.w; }); shuffle(c); var got = c.slice(0, 2); got.forEach(function (t) { t.g = true; });
      toast("gilded: " + got.map(function (t) { return t.l; }).join(", ")); goMap(); } },
    { html: '<div class="big">✂</div><b>edit</b><span>remove 2 letters from your bag. you pick.</span>', cls: "fightc", go: function () { bagRemove(2, goMap); } }
  ], null);
}

// ---------- shop ----------
var SHOP_LINES = ["all sales final. all letters used.", "we have vowels. we have opinions.", "no refunds. no reruns. no spellcheck."];
function openShop() {
  var items = [];
  var rare = pickOne(["q","z","x","j","k","v"]);
  var gl = pickOne(["e","a","s","t","r","o","i","n"]);
  items.push({ i: gl, n: "gold " + gl, d: "a tile worth double.", p: 18, go: function () { S.bag.push({ l: gl, g: true }); } });
  items.push({ i: "?", n: "wildcard", d: "any letter you need. worth 0.", p: 28, go: function () { S.bag.push({ l: "?", w: true }); } });
  items.push({ i: rare, n: "add " + an(rare), d: rareDesc(rare), p: 14, go: function () { S.bag.push({ l: rare }); } });
  items.push({ i: "✂", n: "remove a letter", d: "thin your bag. pick any tile.", p: 20, multi: true, go: function (done) { bagRemove(1, done); } });
  items.push({ i: "✚", n: "snack", d: "heal 12 hp. it's a granola bar.", p: 15, go: function () { heal(12); } });
  var avail = Object.keys(RELICS).filter(function (id) { return !has(id); }); shuffle(avail);
  avail.slice(0, 2).forEach(function (id, k) {
    items.push({ i: RELICS[id].g, col: RELICS[id].c, n: RELICS[id].n, d: RELICS[id].d, p: 55 + k * 10 + rnd(15), go: function () { addRelic(id); } });
  });
  $("shopLine").textContent = pickOne(SHOP_LINES);
  var box = $("shopItems");
  function draw() {
    box.innerHTML = "";
    items.forEach(function (it) {
      var b = document.createElement("button");
      b.className = "card item" + (it.sold ? " sold" : "") + (S.gold < it.p ? " poor" : "");
      b.innerHTML = '<div class="big"' + (it.col ? ' style="color:' + it.col + '"' : "") + ">" + it.i + "</div><b>" + it.n + "</b><span>" + it.d + '</span><span class="price">' + it.p + "</span>";
      b.onclick = function () {
        if (it.sold) return;
        if (S.gold < it.p) { toast("you have " + S.gold + " gold. it costs " + it.p + "."); return; }
        S.gold -= it.p; sfx("buy");
        if (it.multi) { it.p += 10; it.go(function () { show("shop"); draw(); renderTop(); }); }
        else { it.sold = true; it.go(); draw(); }
        renderTop();
      };
      box.appendChild(b);
    });
  }
  draw();
  $("shopLeave").onclick = goMap;
  renderTop(); show("shop");
}

// ---------- bag view / removal ----------
function bagGroups() {
  var g = {};
  S.bag.forEach(function (t, i) { var key = (t.w ? "?" : t.l) + (t.g ? "*" : ""); (g[key] = g[key] || []).push(i); });
  return Object.keys(g).sort().map(function (k) { return { k: k, idx: g[k] }; });
}
function openBag(removeN, done) {
  var grid = $("bagGrid"); grid.innerHTML = "";
  grid.classList.toggle("pickable", !!removeN);
  $("bagSub").textContent = removeN ? "tap a letter to remove it (" + removeN + " left)" : S.bag.length + " tiles. rare ones are red-ringed in your hand.";
  bagGroups().forEach(function (gp) {
    var b = document.createElement("button"), t = S.bag[gp.idx[0]];
    b.className = t.g ? "g" : t.w ? "w" : "";
    b.innerHTML = (t.w ? "?" : t.l) + "<sub>×" + gp.idx.length + "</sub>";
    if (removeN) b.onclick = function () {
      S.bag.splice(gp.idx[0], 1); removeN--;
      if (removeN <= 0 || S.bag.length <= 12) { $("bagView").classList.add("hidden"); done && done(); }
      else openBag(removeN, done);
    };
    grid.appendChild(b);
  });
  $("bagClose").classList.toggle("hidden", !!removeN);
  $("bagView").classList.remove("hidden");
}
function bagRemove(n, done) { openBag(n, done); }

// ---------- daily spell ----------
var DAY0 = Date.UTC(2026, 10, 16);
function dailyInfo() {
  var now = new Date(), key = now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate();
  var n = Math.max(1, Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - DAY0) / 86400000) + 1);
  return { key: key, n: n, seed: hashStr("typo-wizard-daily-" + key) };
}
function startDaily() {
  var d = dailyInfo();
  var pick = mulberry(d.seed);
  var po = function (a) { return a[Math.floor(pick() * a.length)]; };
  var list = [
    { act: 1, kind: "fight", id: po(POOL[1]) },
    { act: 1, kind: "elite", id: po(ELITES[1]) },
    { act: 2, kind: "fight", id: po(POOL[2]) },
    { act: 2, kind: "fight", id: po(POOL[2]) },
    { act: 3, kind: "fight", id: po(POOL[3]) }
  ];
  rngMain = mulberry(d.seed ^ 0x5bd1e995);
  starterChoice = null;
  newRun();
  S.daily = { n: d.n, key: d.key, list: list, i: 0, rows: [], startTurn: 0 };
  ccEvent("daily", { n: d.n });
  dailyFight();
}
function dailyFight() {
  var e = S.daily.list[S.daily.i];
  S.act = e.act; S.step = S.daily.i + 1;
  startFight(e.kind, e.id);
  toast("daily spell #" + S.daily.n + ": fight " + (S.daily.i + 1) + " of " + S.daily.list.length, 1800);
}
function dailyNext(won) {
  var turns = F ? F.turn + 1 : 9;
  S.daily.rows.push(turns <= 3 ? "\uD83D\uDFE9" : "\uD83D\uDFE8");
  S.daily.i++;
  if (S.daily.i >= S.daily.list.length) { later(function () { endRun(true); }, 900); return; }
  S.hp = Math.min(S.max, S.hp + 8);
  later(function () { postFightPick(dailyFight); }, 900);
}
function saveDaily() {
  try {
    var prev = meta.daily || {};
    if (prev.key !== S.daily.key || (prev.score || 0) < S.score) meta.daily = { key: S.daily.key, n: S.daily.n, rows: S.daily.rows.join(""), score: S.score, best: S.best.w };
    saveMeta();
  } catch (e) {}
}

// ---------- end ----------
function endRun(won) {
  if (S.ended) return;
  if (S.daily && !S.daily.closed) { S.daily.closed = true; if (!won) { S.daily.rows.push("\uD83D\uDFE5"); while (S.daily.rows.length < S.daily.list.length) S.daily.rows.push("\u2B1B"); } saveDaily(); }
  S.over = true; S.ended = true; clearTimeout(toastT); $("toast").classList.add("hidden");
  var dur = Date.now() - S.t0;
  if (won) S.score += (S.daily ? 200 : 500) + S.hp * 5;
  S.score = Math.max(1, Math.round(S.score));
  if (S.daily) saveDaily();
  meta.bestScore = Math.max(meta.bestScore, S.score);
  if (!S.daily) meta.bestAct = Math.max(meta.bestAct, S.act);
  if (won && !S.daily) { meta.wins++; if (meta.unlocks.indexOf("leaf") < 0) meta.unlocks.push("leaf"); }
  saveMeta();
  sfx(won ? "win" : "lose");
  ccEnd({ score: S.score, durationMs: dur, completed: !!won });
  $("endTitle").textContent = S.daily ? ("daily spell #" + S.daily.n + (won ? ": cleared" : ": cooked")) : won ? "autocorrect: corrected." : pickOne(["you got cooked", "spelled: d-e-a-d", "typo'd to death", "you have been autocorrected"]);
  drawCard(won);
  $("shareMsg").textContent = "";
  // in the site's player page, the page's own "share" pill (top centre) shares the score card and dare link,
  // so this button copies the game's own brag line instead, with a label that says so
  $("shareBtn").textContent = inPlayer() ? (S.daily ? "copy squares" : "copy best word") : "share";
  var tip = $("tip"); tip.innerHTML = "";
  try { window.ccTip && window.ccTip.mount && window.ccTip.mount(tip, { game: "typo-wizard", slot: "game-over" }); } catch (e) {}
  show("end");
}
function drawCard(won) {
  var c = $("card"), x = c.getContext("2d"), W = c.width, H = c.height;
  var g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#3b2a8c"); g.addColorStop(1, "#1d1446");
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // little monster
  drawMonster(x, (won && !S.daily) ? MON.auto : (F ? F.m.t : MON.gremlin), 470, 130, 70, 0, won ? 0.6 : 0, !!won);
  x.fillStyle = "#ffd23f"; x.font = "900 54px system-ui,Segoe UI,Arial"; x.textAlign = "left";
  x.save(); x.translate(30, 78); x.rotate(-0.04); x.fillText("typo wizard", 0, 0); x.restore();
  x.fillStyle = "#fff8e7"; x.font = "800 24px system-ui,Segoe UI,Arial";
  x.fillText(S.daily ? "daily spell #" + S.daily.n + "  " + S.daily.rows.join("") : won ? "beat autocorrect. all 3 acts." : "fell in act " + S.act + " to " + (F ? F.m.t.n : "a typo"), 30, 125);
  x.font = "700 20px system-ui,Segoe UI,Arial";
  var rows = [["score", S.score], ["best word", S.best.w ? S.best.w.toUpperCase() + " (" + S.best.d + ")" : "-"], ["longest", S.longest ? S.longest.toUpperCase() + " (" + S.longest.length + ")" : "-"], ["words cast", S.wordsCast]];
  rows.forEach(function (r, i) { x.fillStyle = "#ffffffaa"; x.fillText(r[0], 30, 170 + i * 32); x.fillStyle = "#fff8e7"; x.fillText(String(r[1]), 160, 170 + i * 32); });
  // tiles
  var word = (S.best.w || S.longest || "typo").slice(0, 8);
  for (var i = 0; i < word.length; i++) {
    var tx = 330 + i * 32, ty = 232;
    x.fillStyle = "#b9a77c"; roundRect(x, tx, ty + 4, 28, 32, 6); x.fill();
    x.fillStyle = "#fff8e7"; roundRect(x, tx, ty, 28, 32, 6); x.fill();
    x.fillStyle = "#1d1446"; x.font = "900 20px system-ui,Arial"; x.textAlign = "center"; x.fillText(word[i], tx + 14, ty + 23); x.textAlign = "left";
  }
  x.fillStyle = "#7cff6b"; x.font = "800 16px system-ui,Segoe UI,Arial"; x.fillText("computercooked.com/games/typo-wizard", 30, H - 22);
}
function shareText() {
  var bw = S.best.w ? S.best.w.toUpperCase() : "-", lw = S.longest ? S.longest.toUpperCase() : "-";
  if (S.daily) return "typo wizard daily #" + S.daily.n + " \u2014 " + S.daily.rows.join("") + " best word: " + bw + " (" + S.best.d + ") \u00B7 longest: " + lw + "\ncomputercooked.com/games/typo-wizard";
  return "typo wizard: " + (S.ended && S.hp > 0 ? "beat autocorrect" : "made it to act " + S.act) + ", score " + S.score + ". best word: " + bw + " (" + S.best.d + ") \u00B7 longest: " + lw + "\ncomputercooked.com/games/typo-wizard";
}
function inPlayer() { try { return !!(PARENT && window.frameElement && window.frameElement.id === "game-frame"); } catch (e) { return false; } }
function share() {
  var txt = shareText(), msg = $("shareMsg");
  var copy = function () {
    try { navigator.clipboard.writeText(txt).then(function () { msg.textContent = "copied. paste it in the group chat."; }, function () { msg.textContent = txt; }); } catch (e) { msg.textContent = txt; }
  };
  if (inPlayer()) { copy(); return; }
  try {
    $("card").toBlob(function (blob) {
      var file = null;
      try { file = blob ? new File([blob], "typo-wizard.png", { type: "image/png" }) : null; } catch (e) {}
      if (navigator.share) {
        var data = { title: "typo wizard", text: txt };
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) data.files = [file];
        navigator.share(data).catch(function () {});
      } else copy();
    });
  } catch (e) { copy(); }
}

// ---------- monster drawing ----------
var cv = $("mon"), cx = cv.getContext("2d"), DPR = 1;
function resizeCanvas() {
  var r = cv.getBoundingClientRect(); DPR = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.max(1, Math.round(r.width * DPR)); cv.height = Math.max(1, Math.round(r.height * DPR));
}
function roundRect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
function drawMonster(x, t, X, Y, R, time, hit, sad) {
  x.save(); x.translate(X, Y);
  var bob = Math.sin(time * 2.2) * R * 0.05; x.translate(0, bob);
  var sq = 1 + Math.sin(time * 4.4) * 0.025; x.scale(1 / sq, sq);
  x.fillStyle = hit > 0.5 ? "#ffffff" : t.c; x.strokeStyle = "#1d1446"; x.lineWidth = Math.max(3, R * 0.06);
  // shadow
  x.save(); x.fillStyle = "#0005"; x.beginPath(); x.ellipse(0, R * 1.05 - bob, R * 0.8, R * 0.14, 0, 0, 7); x.fill(); x.restore();
  x.beginPath();
  switch (t.sh) {
    case "box": roundRect(x, -R * 0.9, -R * 0.85, R * 1.8, R * 1.75, R * 0.25); break;
    case "ghost":
      x.moveTo(-R * 0.85, R * 0.9); x.lineTo(-R * 0.85, -R * 0.1); x.arc(0, -R * 0.1, R * 0.85, Math.PI, 0); x.lineTo(R * 0.85, R * 0.9);
      for (var i = 0; i < 4; i++) { var a = R * 0.85 - i * R * 0.425; x.quadraticCurveTo(a - R * 0.21, R * (i % 2 ? 0.95 : 0.7) + Math.sin(time * 5 + i) * 4, a - R * 0.425, R * 0.9); }
      x.closePath(); break;
    case "drop": x.moveTo(0, -R * 1.1); x.bezierCurveTo(R * 0.9, -R * 0.2, R * 0.95, R * 0.9, 0, R * 0.92); x.bezierCurveTo(-R * 0.95, R * 0.9, -R * 0.9, -R * 0.2, 0, -R * 1.1); break;
    case "semi": x.arc(0, -R * 0.45, R * 0.42, 0, 7); x.moveTo(R * 0.4, R * 0.35); x.arc(0, R * 0.35, R * 0.4, 0, Math.PI * 2); break;
    case "worm":
      for (var s = 0; s < 4; s++) { var sx = -R * 0.75 + s * R * 0.5, sy = Math.sin(time * 4 + s) * R * 0.12 + R * 0.3; x.moveTo(sx + R * 0.38, sy); x.arc(sx, sy, R * 0.38, 0, 7); }
      x.moveTo(R * 1.05, -R * 0.15); x.arc(R * 0.55, -R * 0.15, R * 0.5, 0, 7); break;
    case "book": roundRect(x, -R * 0.95, -R * 0.85, R * 1.9, R * 1.7, R * 0.12); break;
    case "phone": roundRect(x, -R * 0.62, -R * 1.0, R * 1.24, R * 2.0, R * 0.22); break;
    case "bee": x.ellipse(0, 0, R * 0.95, R * 0.78, 0, 0, 7); break;
    default: x.moveTo(R, 0); for (var k = 1; k <= 24; k++) { var an = k / 24 * Math.PI * 2, rr = R * (0.92 + Math.sin(an * 3 + time * 3) * 0.06); x.lineTo(Math.cos(an) * rr, Math.sin(an) * rr * 0.9); }
  }
  x.fill(); x.stroke();
  // decorations
  if (t.sh === "bee") {
    x.fillStyle = "#1d1446"; for (var b = -1; b <= 1; b += 2) { x.fillRect(b * R * 0.32 - R * 0.09, -R * 0.74, R * 0.18, R * 1.48); }
    x.fillStyle = "#ffffffaa"; x.beginPath(); x.ellipse(-R * 0.35, -R * 0.95, R * 0.35, R * 0.2, -0.5 + Math.sin(time * 30) * 0.3, 0, 7); x.ellipse(R * 0.35, -R * 0.95, R * 0.35, R * 0.2, 0.5 - Math.sin(time * 30) * 0.3, 0, 7); x.fill();
  }
  if (t.sh === "book") { x.fillStyle = "#1d144655"; x.fillRect(-R * 0.95, -R * 0.85, R * 0.22, R * 1.7); x.fillStyle = "#fff8e7"; x.font = "900 " + Math.round(R * 0.22) + "px system-ui,Arial"; x.textAlign = "center"; x.fillText("THESAURUS", R * 0.1, R * 0.62); }
  if (t.sh === "phone") { x.fillStyle = "#1d1446"; roundRect(x, -R * 0.5, -R * 0.82, R * 1.0, R * 1.5, R * 0.1); x.fill(); x.fillStyle = t.c; }
  if (t.boss && t.sh !== "phone") { // crown
    x.fillStyle = "#ffd23f"; x.beginPath(); var cy = t.sh === "book" ? -R * 0.85 : -R * 0.8; x.moveTo(-R * 0.4, cy); x.lineTo(-R * 0.45, cy - R * 0.4); x.lineTo(-R * 0.18, cy - R * 0.18); x.lineTo(0, cy - R * 0.48); x.lineTo(R * 0.18, cy - R * 0.18); x.lineTo(R * 0.45, cy - R * 0.4); x.lineTo(R * 0.4, cy); x.closePath(); x.fill(); x.stroke();
  }
  // face
  var ey = t.sh === "semi" ? -R * 0.5 : t.sh === "worm" ? -R * 0.25 : -R * 0.2, ex0 = t.sh === "worm" ? R * 0.55 : 0;
  var blink = (Math.sin(time * 1.3) > 0.985);
  var n = t.eyes, sp = R * (t.sh === "semi" ? 0.18 : 0.32);
  for (var e = 0; e < n; e++) {
    var exx = ex0 + (e - (n - 1) / 2) * sp * (n > 2 ? 0.8 : 1);
    var er = R * (n > 2 ? 0.12 : 0.17);
    x.fillStyle = t.sh === "phone" ? t.c : "#fff"; x.beginPath();
    if (blink) x.ellipse(exx, ey, er, er * 0.15, 0, 0, 7); else x.arc(exx, ey, er, 0, 7);
    x.fill(); if (t.sh !== "phone") { x.lineWidth = 2; x.stroke(); }
    if (!blink) { x.fillStyle = "#1d1446"; x.beginPath(); x.arc(exx + Math.sin(time) * er * 0.3, ey + er * 0.15, er * 0.5, 0, 7); x.fill(); }
  }
  // brows for elites/bosses
  if (t.elite || t.boss) { x.strokeStyle = "#1d1446"; x.lineWidth = Math.max(3, R * 0.06); x.beginPath(); x.moveTo(ex0 - sp * 1.0, ey - R * 0.32); x.lineTo(ex0 - sp * 0.15, ey - R * 0.2); x.moveTo(ex0 + sp * 1.0, ey - R * 0.32); x.lineTo(ex0 + sp * 0.15, ey - R * 0.2); x.stroke(); }
  // mouth
  var my = t.sh === "semi" ? R * 0.3 : t.sh === "worm" ? R * 0.05 : R * 0.25;
  x.strokeStyle = t.sh === "phone" ? t.c : "#1d1446"; x.lineWidth = Math.max(3, R * 0.06); x.beginPath();
  if (sad) x.arc(ex0, my + R * 0.18, R * 0.22, Math.PI * 1.15, Math.PI * 1.85);
  else if (hit > 0) { x.ellipse(ex0, my, R * 0.14, R * 0.18, 0, 0, 7); }
  else x.arc(ex0, my - R * 0.1, R * 0.25, Math.PI * 0.15, Math.PI * 0.85);
  x.stroke();
  if (!sad && !hit && t.sh !== "semi" && t.sh !== "phone") { x.fillStyle = "#fff"; x.fillRect(ex0 - R * 0.08, my + R * 0.11, R * 0.07, R * 0.08); x.fillRect(ex0 + R * 0.02, my + R * 0.11, R * 0.07, R * 0.08); }
  x.restore();
}
var lastT = performance.now(), paused = false;
function loop(now) {
  var dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  if (F && S && S.screen === "fight" && !paused && !document.hidden) {
    var W = cv.width, H = cv.height;
    if (W < 4) resizeCanvas();
    cx.clearRect(0, 0, W, H);
    // background sparkles
    cx.fillStyle = "#ffffff10"; for (var i = 0; i < 14; i++) { var px = ((i * 97 + now * 0.01 * (i % 3 + 1)) % W), py = (i * 53) % H; cx.fillRect(px, py, 3 * DPR, 3 * DPR); }
    var R = Math.min(W * 0.28, H * 0.3);
    var sh = F.shake > 0 ? (Math.random() - 0.5) * F.shake * DPR : 0;
    F.shake = Math.max(0, F.shake - dt * 40); F.hitT = Math.max(0, F.hitT - dt * 2.5);
    if (F.m.hp > 0 || F.hitT > 0) {
      cx.save(); if (F.m.hp <= 0) { cx.globalAlpha = Math.max(0, F.hitT); }
      var lg = F.lunge || 0; F.lunge = Math.max(0, lg - dt * 3.5);
      var ls = Math.sin(Math.min(1, lg) * Math.PI);
      drawMonster(cx, F.m.t, W / 2 + sh, H * 0.52 + ls * R * 0.35, R * (1 + ls * 0.28), now / 1000, F.hitT, false);
      if (ls > 0.2) { cx.fillStyle = "rgba(255,60,90," + (ls * 0.18) + ")"; cx.fillRect(0, 0, W, H); }
      cx.restore();
    }
    if (F.m.frozen) { cx.fillStyle = "#8fe3ff33"; cx.fillRect(0, 0, W, H); }
  }
  requestAnimationFrame(loop);
}

// ---------- ui text ----------
var sayT = 0;
function say(t, ms) { var b = $("bubble"); b.textContent = t; b.classList.remove("hidden"); clearTimeout(sayT); sayT = setTimeout(function () { b.classList.add("hidden"); }, ms || 2000); }
var flSlot = 0;
function floatText(t, col, slot) {
  var d = document.createElement("div"); d.className = "fl"; d.textContent = t; d.style.color = col;
  var s = slot != null ? slot : (flSlot++ % 3);
  d.style.top = (30 + s * 14) + "%"; d.style.marginLeft = ((s % 2 ? 1 : -1) * s * 18) + "px";
  $("floats").appendChild(d); setTimeout(function () { d.remove(); }, 1000);
}

// ---------- input ----------
$("rack").addEventListener("pointerdown", function (e) { var b = e.target.closest(".tile"); if (!b) return; e.preventDefault(); tapTile(+b.dataset.i); });
$("word").addEventListener("pointerdown", function (e) { var d = e.target.closest(".wl"); if (!d || !F) return; e.preventDefault(); F.sel.splice(+d.dataset.k); renderFight(); });
$("castBtn").addEventListener("pointerdown", function (e) { e.preventDefault(); cast(); });
$("clearBtn").addEventListener("pointerdown", function (e) { e.preventDefault(); if (F) { F.sel = []; renderFight(); } });
$("redrawBtn").addEventListener("pointerdown", function (e) { e.preventDefault(); redraw(); });
$("startBtn").onclick = function () { rngMain = Math.random; newRun(); goMap(); };
$("dailyBtn").onclick = function () { startDaily(); };
$("againBtn").onclick = function () { renderTitle(); };
$("shareBtn").onclick = share;
$("bagBtn").onclick = function () { if (S) openBag(0); };
$("muteBtn").onclick = function () { setMuted(!muted); };
$("muteBtn2").onclick = function () { setMuted(!muted); };
setMuted(muted);
$("bagClose").onclick = function () { $("bagView").classList.add("hidden"); };
$("resumeBtn").onclick = function () { setPaused(false); };
function setPaused(p) { paused = p; $("pause").classList.toggle("hidden", !p); }
// does the game use this key right now? (also decides which keys typed on the player page are passed in)
function wantsKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  var k = e.key || "", bagOpen = !$("bagView").classList.contains("hidden");
  if (paused) return k === "Escape" || k === "Enter";
  if (bagOpen) return false;
  if ($("title").classList.contains("on")) return k === "Enter" || k === " ";
  var scr = S ? S.screen : "title";
  if (scr === "fight" && F) return /^[a-z]$/i.test(k) || k === "Backspace" || k === "Enter" || k === "Escape" || k === " " || k === "1";
  if (scr === "map" || scr === "pick") return /^[1-4]$/.test(k);
  return false;
}
function onKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (paused) { if (e.key === "Escape" || e.key === "Enter") setPaused(false); return; }
  if (!$("bagView").classList.contains("hidden")) return;
  var scr = S ? S.screen : "title";
  if (!$("title").classList.contains("on") && scr === "fight" && F) {
    var k = e.key.toLowerCase();
    if (/^[a-z]$/.test(k)) { typeLetter(k); e.preventDefault(); }
    else if (k === "backspace") { if (F.sel.length) { F.sel.pop(); renderFight(); } e.preventDefault(); }
    else if (k === "enter") { cast(); e.preventDefault(); }
    else if (k === "escape") { F.sel = []; renderFight(); e.preventDefault(); }
    else if (k === " " || k === "1") { redraw(); e.preventDefault(); }
  } else if ($("title").classList.contains("on") && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); $("startBtn").click(); }
  else if (/^[1-4]$/.test(e.key) && S && (S.screen === "map" || S.screen === "pick")) { var cs = document.querySelectorAll(S.screen === "map" ? "#mapChoices .card" : "#pickItems .card"); var c = cs[+e.key - 1]; if (c) { e.preventDefault(); c.click(); } }
}
window.addEventListener("keydown", onKey, true);
// keyboard inside the site's player page: take focus when the frame loads (unless the player is typing in a
// field on the page), and if the page still has the keys (the player clicked outside the game), pass the
// game's own keys in, before the page's shortcuts (d, g, h... navigate away) can act on them
function grabFocus() {
  try {
    if (PARENT) {
      var ae = PARENT.document.activeElement;
      if (ae && ae !== PARENT.document.body && ae !== window.frameElement && /^(input|textarea|select)$/i.test(ae.tagName)) return;
      if (window.frameElement) window.frameElement.focus({ preventScroll: true });
    }
    window.focus();
  } catch (e) {}
}
grabFocus();
document.addEventListener("pointerdown", function () { try { window.focus(); } catch (e) {} }, true);
if (PARENT) {
  try {
    PARENT.addEventListener("keydown", function (e) {
      if (e.defaultPrevented || !wantsKey(e)) return;
      var t = e.target, pd = PARENT.document;
      if (t && t !== pd.body && t !== pd.documentElement && t !== pd && t !== PARENT && t !== window.frameElement) return; // a field, link or button on the page has the keys
      if (pd.querySelector("dialog[open]") || pd.fullscreenElement && pd.fullscreenElement !== window.frameElement && !pd.fullscreenElement.contains(window.frameElement)) return;
      var r = window.frameElement && window.frameElement.getBoundingClientRect();
      if (!r || r.bottom < 40 || r.top > PARENT.innerHeight - 40) return; // the game is scrolled off screen
      onKey(e); e.preventDefault(); e.stopPropagation();
      grabFocus(); // and hand the keys to the game for the next press
    }, true);
  } catch (e) {}
}
window.addEventListener("message", function (e) {
  var d = e.data; if (!d || typeof d !== "object") return;
  if (d.type === "cc-mute") hostMuted = !!d.muted;
  else if (d.type === "cc-pause") setPaused(true);
  else if (d.type === "cc-restart") { setPaused(false); $("bagView").classList.add("hidden"); var wasDaily = S && S.daily; F = null; if (wasDaily) startDaily(); else { rngMain = Math.random; newRun(); goMap(); } }
});
window.addEventListener("resize", function () { if (S && S.screen === "fight") resizeCanvas(); });

// ---------- test hooks ----------
if (TEST) {
  window.__tw = {
    state: function () { return S ? { screen: S.screen, hp: S.hp, max: S.max, gold: S.gold, act: S.act, step: S.step, score: S.score, relics: S.relics.slice(), bag: S.bag.length, over: !!S.over, won: !!(S.ended && S.hp > 0), monster: F ? { id: F.m.id, hp: F.m.hp, max: F.m.max, intent: F.m.intent, frozen: F.m.frozen, burnT: F.m.burnT } : null, hand: F ? F.hand.map(function (t) { return t.w ? "?" : tileStr(t); }).join("") : "", busy: F ? F.busy : false, shield: F ? F.shield : 0 } : { screen: "title" }; },
    win: function () { if (F && !F.dead) { F.m.hp = 0; winFight(); } },
    lose: function () { if (S) { S.hp = 0; S.over = true; endRun(false); } },
    act: function (n) { if (!S) newRun(); S.act = Math.max(1, Math.min(3, n)); S.step = 0; F = null; goMap(); },
    isWord: function (w) { return DICT.has(w); },
    words: function () { return DICT.size; },
    setHand: function (s) { if (!F) return; F.hand = s.split("").map(function (c) { return c === "?" ? { l: "?", w: true } : { l: c }; }); F.sel = []; renderFight(); },
    type: function (s) { s.split("").forEach(typeLetter); },
    cast: cast,
    gold: function (n) { S.gold += n; renderTop(); },
    shareText: function () { return shareText(); },
    daily: function () { startDaily(); },
    best: function (mode) { // best word from current hand (for bots). mode "human": a middling 3-5 letter word
      var cnt = {}, wild = 0; F.hand.forEach(function (t) { if (t.w) wild++; else { var s = tileStr(t); cnt[s] = (cnt[s] || 0) + 1; } });
      var best = null, bv = -1, all = [];
      WORDLIST.forEach(function (w) {
        var c = Object.assign({}, cnt), wl = wild, ok = true;
        for (var i = 0; i < w.length; i++) { var ch = w[i]; if (ch === "q" && has("qu") && w[i + 1] === "u" && c.qu) { c.qu--; i++; continue; } if (c[ch]) c[ch]--; else if (wl) wl--; else { ok = false; break; } }
        if (!ok) return;
        var v = 0; for (var j = 0; j < w.length; j++) v += VAL[w[j]] || 0; v *= LENMULT[Math.min(8, w.length)];
        if (F.m.id === "thes" && F.used[w]) v = -1;
        if (v > bv) { bv = v; best = w; }
        if (v > 0 && w.length >= 3 && w.length <= 5) all.push([v, w]);
      });
      if (mode === "human" && all.length) { all.sort(function (a, b) { return a[0] - b[0]; }); return all[Math.floor(all.length * 0.6)][1]; }
      return best;
    }
  };
}

// ---------- boot ----------
requestAnimationFrame(loop);
if (SHOT) {
  newRun(); S.act = 3; S.step = 6; S.gold = 87; S.hp = 31; addRelic("qu", true); addRelic("pyro", true); addRelic("long", true);
  startFight("boss");
  F.hand = "wizardly".split("").map(function (c) { return { l: c, g: c === "z" }; });
  F.sel = [0, 1, 2, 3, 4, 5].map(function (i) { return { i: i }; });
  F.m.hp = 61; F.m.burn = 5; F.m.burnT = 2;
  renderFight();
  say("did you mean: ducking", 999999);
  var lg = document.createElement("div"); lg.className = "shotlogo"; lg.innerHTML = "typo<br>wizard"; $("stage").appendChild(lg);
  $("toast").style.display = "none";
  $("bubble").style.left = "auto"; $("bubble").style.right = "8px"; $("bubble").style.top = "52px"; $("mstatus").style.display = "none";
  $("bubble").textContent = "did you mean: ducking";
} else renderTitle();
})();
