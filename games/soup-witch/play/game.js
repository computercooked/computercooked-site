'use strict';
(() => {
const Q = new URLSearchParams(location.search);
const TEST = Q.has('cctest') || (() => { try { return window.parent !== window && new URLSearchParams(parent.location.search).get('cctest') === '1'; } catch (e) { return false; } })(), SHOT = Q.has('shot');
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const SAVE_KEY = 'sw-save';
const SEASON_DAYS = 5;

// ---------------------------------------------------------------- data
const TAGS = ['warm', 'cold', 'sweet', 'salty', 'sour', 'spooky', 'brave', 'sleepy', 'sparkly', 'earthy'];
const TAGC = { warm: '#ff8a4d', cold: '#6fd0ff', sweet: '#ff9ade', salty: '#d3dceb', sour: '#d4ee3a', spooky: '#b48cff', brave: '#ff6070', sleepy: '#9aa3ff', sparkly: '#ffd84a', earthy: '#c79a63' };
const TAGS_SHORT = { warm: 'warm', cold: 'cold', sweet: 'sweet', salty: 'salt', sour: 'sour', spooky: 'spook', brave: 'brave', sleepy: 'sleep', sparkly: 'spark', earthy: 'earth' };

const ING = [
  { id: 'rain', n: 'rainwater', t: ['cold', 'sleepy'], c: '#6ec6ff', sh: 'drop', r: 'start' },
  { id: 'toad', n: 'toadstool', t: ['earthy', 'spooky'], c: '#e2483d', sh: 'shroom', r: 'start' },
  { id: 'ember', n: 'ember pepper', t: ['warm', 'brave'], c: '#ff5a1f', sh: 'pepper', r: 'start' },
  { id: 'salt', n: 'sea salt', t: ['salty'], c: '#e9f0f7', sh: 'crystal', r: 'start' },
  { id: 'honey', n: 'honeycomb', t: ['sweet', 'warm'], c: '#ffb52e', sh: 'hex', r: 'start' },
  { id: 'lemon', n: 'lemon', t: ['sour', 'sparkly'], c: '#ffe14a', sh: 'lemon', r: 'start' },
  { id: 'moth', n: 'moth wing', t: ['sleepy', 'spooky'], c: '#cbb79a', sh: 'wing', r: 'swamp', p: 18, d: 'smells like 3am.' },
  { id: 'moss', n: 'bog moss', t: ['earthy', 'cold'], c: '#6fa84a', sh: 'blob', r: 'swamp', p: 15, d: 'from a bog that consented.' },
  { id: 'sugar', n: 'star sugar', t: ['sweet', 'sparkly'], c: '#fff2a8', sh: 'star', r: 'swamp', p: 24, d: 'fell off a star. finders keepers.' },
  { id: 'egg', n: 'pickled egg', t: ['sour', 'salty'], c: '#f1e2a8', sh: 'egg', r: 'swamp', p: 20, d: 'from a jar older than you.' },
  { id: 'gpep', n: 'ghost pepper', t: ['spooky', 'warm'], c: '#efeaff', sh: 'pepper', r: 'swamp', p: 28, d: 'an actual ghost. of a pepper.' },
  { id: 'sock', n: 'knight sock', t: ['salty', 'brave'], c: '#9aa4b5', sh: 'sock', r: 'castle', p: 22, d: 'worn into three battles. unwashed.' },
  { id: 'jam', n: 'royal jam', t: ['sweet', 'brave'], c: '#c0203f', sh: 'jar', r: 'castle', p: 32, d: "the king's. don't tell the king." },
  { id: 'lav', n: 'lavender', t: ['sleepy', 'sweet'], c: '#a98bff', sh: 'sprig', r: 'castle', p: 24, d: 'smells like a spa that judges you.' },
  { id: 'radish', n: 'thunder radish', t: ['brave', 'sour'], c: '#ff5fa0', sh: 'radish', r: 'castle', p: 28, d: 'it hums before storms.' },
  { id: 'ice', n: 'iceberg lettuce', t: ['cold', 'earthy'], c: '#a9f07a', sh: 'leaf', r: 'castle', p: 18, d: 'it sank a small boat once.' },
  { id: 'tax', n: 'old tax form', t: ['sleepy', 'salty'], c: '#f4f1e4', sh: 'paper', r: 'castle', p: 14, d: 'form 1040-boo. very dry.' },
  { id: 'cheese', n: 'moon cheese', t: ['cold', 'sparkly'], c: '#fff0a0', sh: 'cheese', r: 'moon', p: 38, d: 'confirms the rumour.' },
  { id: 'comet', n: 'comet dust', t: ['sparkly', 'warm'], c: '#9fe8ff', sh: 'dust', r: 'moon', p: 42, d: 'still a bit on fire.' },
  { id: 'void', n: 'void bean', t: ['spooky', 'cold'], c: '#3d2f66', sh: 'bean', r: 'moon', p: 36, d: 'it looks back.' },
  { id: 'yolk', n: 'sun yolk', t: ['warm', 'sweet'], c: '#ffa31a', sh: 'yolk', r: 'moon', p: 42, d: 'do not look directly at it.' },
  { id: 'ecto', n: 'ectoplasm', t: ['spooky', 'sparkly'], c: '#8dffcf', sh: 'blob', r: 'rare', st: 2 },
  { id: 'tear', n: 'mermaid tear', t: ['salty', 'sleepy'], c: '#7fe3ff', sh: 'drop', r: 'rare', st: 2 },
  { id: 'refund', n: 'tax refund', t: ['sweet', 'sparkly'], c: '#9be36b', sh: 'paper', r: 'rare', st: 2 },
  { id: 'chunk', n: 'moon chunk', t: ['cold', 'sparkly'], c: '#dcdcf0', sh: 'crystal', r: 'rare', st: 2 },
  { id: 'sneeze', n: 'dragon sneeze', t: ['warm', 'spooky'], c: '#ff9f43', sh: 'cloud', r: 'rare', st: 2 },
];
const IM = {}; ING.forEach(g => IM[g.id] = g);

const SINGLE = { warm: 'hot hot hot', cold: 'gazpacho of despair', sweet: 'dessert, technically', salty: 'the dead sea', sour: 'pucker broth', spooky: 'boo-llion', brave: 'liquid courage', sleepy: 'nap in a bowl', sparkly: 'glitter bisque', earthy: 'dirt, but nice' };
const PAIR = {
  'warm+cold': 'lukewarm confusion', 'warm+sweet': "grandma's hug", 'warm+salty': 'sweaty sailor stew', 'warm+sour': 'angry hot lemonade', 'warm+spooky': 'haunted hotpot',
  'warm+brave': "dragon's breakfast", 'warm+sleepy': 'fireside snooze', 'warm+sparkly': 'campfire glitter', 'warm+earthy': 'cozy mud',
  'cold+sweet': 'melted ice cream (respectfully)', 'cold+salty': 'ocean in january', 'cold+sour': 'brain freeze tonic', 'cold+spooky': "ghost's bathwater", 'cold+brave': 'polar plunge chowder',
  'cold+sleepy': 'rainy tuesday', 'cold+sparkly': 'snow globe soup', 'cold+earthy': 'cave puddle',
  'sweet+salty': 'salted caramel chaos', 'sweet+sour': 'sweet & sour & confused', 'sweet+spooky': 'candy corn crypt', 'sweet+brave': 'birthday courage', 'sweet+sleepy': 'lullaby syrup',
  'sweet+sparkly': 'unicorn runoff', 'sweet+earthy': 'honey dirt',
  'salty+sour': 'pickle juice deluxe', 'salty+spooky': 'shipwreck broth', 'salty+brave': "pirate's courage", 'salty+sleepy': 'post-beach nap', 'salty+sparkly': 'mermaid sweat', 'salty+earthy': 'fancy gravel',
  'sour+spooky': 'cursed lemonade', 'sour+brave': 'spite soup', 'sour+sleepy': 'grumpy morning', 'sour+sparkly': 'fizzy regret', 'sour+earthy': 'compost bisque',
  'spooky+brave': 'dare soup', 'spooky+sleepy': 'nightmare noodle', 'spooky+sparkly': 'disco haunting', 'spooky+earthy': 'graveyard gumbo',
  'brave+sleepy': 'heroic nap', 'brave+sparkly': 'main character consommé', 'brave+earthy': 'goblin protein shake',
  'sleepy+sparkly': 'dream bisque', 'sleepy+earthy': 'hibernation stew', 'sparkly+earthy': 'geode gravy',
};
const SPECIALS = [
  [['lemon', 'salt'], 'margarita (legally distinct)'],
  [['sock', 'rain'], 'damp knight broth'],
  [['lemon', 'honey', 'ember'], 'the throat doctor'],
  [['moth', 'lav'], "moth's lullaby"],
  [['tax', 'salt'], 'audit au jus'],
  [['gpep', 'void'], 'the void stares back'],
  [['cheese', 'sugar'], 'moon pie, liquefied'],
  [['ember', 'gpep'], 'two alarm fire'],
  [['egg', 'sock'], 'locker room surprise'],
  [['toad', 'moss', 'rain'], 'swamp classic'],
  [['yolk', 'cheese'], 'eclipse egg drop'],
  [['comet', 'sugar', 'yolk'], 'galaxy brain'],
  [['tear', 'salt'], 'ocean, but sad'],
  [['sneeze', 'ember'], 'achoo-llion'],
  [['ecto', 'rain'], 'ghost tea'],
  [['refund', 'lemon'], 'refund-ade'],
  [['chunk', 'cheese'], 'the moon eating itself'],
  [['jam', 'sock'], 'royal laundry'],
  [['ice', 'radish'], 'a salad that yells'],
  [['toad', 'honey', 'moss', 'rain'], 'the whole swamp, honestly'],
];
const RECIPES = []; const R = {};
const addR = r => { RECIPES.push(r); R[r.id] = r; };
SPECIALS.forEach(([ids, n]) => addR({ id: 'x:' + ids.slice().sort().join(','), name: n, kind: 'special', ids }));
for (let i = 0; i < TAGS.length; i++) for (let j = i + 1; j < TAGS.length; j++) { const k = TAGS[i] + '+' + TAGS[j]; addR({ id: 'p:' + k, name: PAIR[k], kind: 'pair', hint: [TAGS[i], TAGS[j]] }); }
TAGS.forEach(t => addR({ id: 's:' + t, name: SINGLE[t], kind: 'single', hint: [t] }));
addR({ id: 'f:beige', name: 'beige regret', kind: 'odd', d: 'three tastes, perfectly tied. nobody wins.' });
addR({ id: 'f:many', name: 'soup of many opinions', kind: 'odd', d: 'six or more tastes at once.' });
addR({ id: 'f:lazy', name: 'the lazy soup', kind: 'odd', d: 'one ingredient. twice.' });
const NREC = RECIPES.length;

const REGIONS = [
  { id: 'swamp', n: 'the swamp', need: 0, mult: 1 },
  { id: 'castle', n: 'the castle', need: 12, mult: 1.4 },
  { id: 'moon', n: 'the moon market', need: 30, mult: 1.8 },
];

// customers. riddle: t text, w wants, h hates
const CUST = [
  { id: 'frog', n: 'a frog', reg: 'swamp', rid: [
    { t: 'something that tastes like a mud puddle with ambition', w: ['earthy', 'brave'] },
    { t: 'i want to feel like a lily pad at night. chilly. drowsy.', w: ['cold', 'sleepy'] },
    { t: 'sweet, with a bit of dirt in it. how a fly likes it.', w: ['sweet', 'earthy'] },
    { t: 'the muddy bottom of a pond. dark. a little haunted.', w: ['earthy', 'spooky'] }] },
  { id: 'snail', n: 'a snail courier', reg: 'swamp', rid: [
    { t: 'something fast, fiery and fearless. lie to me.', w: ['brave', 'warm'] },
    { t: 'salt is a sensitive topic. something sweet. surprise me.', w: ['sweet'], h: ['salty'] },
    { t: "nine years on the road. i need a warm nap you can drink", w: ['sleepy', 'warm'] },
    { t: "anything but salty. something sour. i'm begging.", w: ['sour'], h: ['salty'] }] },
  { id: 'shroom', n: 'a mushroom guy', reg: 'swamp', rid: [
    { t: "something hot. nothing earthy, that's basically my cousin.", w: ['warm'], h: ['earthy'] },
    { t: 'make me feel cold, damp and a bit haunted', w: ['spooky', 'cold'] },
    { t: "i'd like to glow. spiritually. but stay grounded.", w: ['sparkly', 'earthy'] },
    { t: 'i want to sleep under a log for a week. sweetly.', w: ['sleepy', 'sweet'] }] },
  { id: 'bear', n: 'a sleepy bear', reg: 'swamp', rid: [
    { t: 'the honey of soups. sweet. drowsy. you know.', w: ['sweet', 'sleepy'] },
    { t: 'something for sleeping in a dirt hole until spring', w: ['sleepy', 'earthy'] },
    { t: 'wake me up gently. warm and sweet, like a grandma would.', w: ['warm', 'sweet'] },
    { t: "i just woke up and i'm furious. i need courage. and honey.", w: ['brave', 'sweet'] }] },
  { id: 'knight', n: 'a knight', reg: 'castle', rid: [
    { t: 'make me brave. but not too brave. a little drowsy, ideally.', w: ['brave', 'sleepy'] },
    { t: 'i lost a sword fight to a goose. i need courage. hot courage.', w: ['brave', 'warm'] },
    { t: 'something shiny like my armour. no salt, it rusts me.', w: ['sparkly'], h: ['salty'] },
    { t: 'a cold soup with nerves of steel. for guard duty.', w: ['cold', 'brave'] }] },
  { id: 'kid', n: 'the toddler king', reg: 'castle', rid: [
    { t: 'i want CANDY soup. with GLITTER. i am the KING.', w: ['sweet', 'sparkly'] },
    { t: 'make me BRAVE. and SWEET. NOT. SLEEPY.', w: ['brave', 'sweet'], h: ['sleepy'] },
    { t: 'sweet for me. sour enough to make the vegetables cry.', w: ['sour', 'sweet'] },
    { t: 'soup that SPARKLES and is SPOOKY. for my ghost party.', w: ['sparkly', 'spooky'] }] },
  { id: 'jester', n: 'the court jester', reg: 'castle', rid: [
    { t: 'something sour and sparkly enough to make the king laugh', w: ['sour', 'sparkly'] },
    { t: 'a soup with a punchline. salty. a bit sour about it.', w: ['salty', 'sour'] },
    { t: 'spooky, but the fun candy kind of spooky', w: ['spooky', 'sweet'] },
    { t: 'something sweet and sleepy for the king. so he stops asking for jokes.', w: ['sleepy', 'sweet'] }] },
  { id: 'taster', n: 'the royal taster', reg: 'castle', rid: [
    { t: "something i won't die from. warm, salted, nothing spooky. ideally.", w: ['warm', 'salty'], h: ['spooky'] },
    { t: 'fancy. like, painfully fancy. glittering, with a pinch of salt.', w: ['sparkly', 'salty'] },
    { t: 'the king says no spice. i say a little spice and a squeeze of lemon.', w: ['warm', 'sour'] },
    { t: 'nothing scary in it. just warm and earthy. please.', w: ['warm', 'earthy'], h: ['spooky'] }] },
  { id: 'astro', n: 'a lost astronaut', reg: 'moon', rid: [
    { t: 'something that tastes like earth. the planet. warm, like i left it.', w: ['earthy', 'warm'] },
    { t: 'i need courage to go back out into the cold', w: ['brave', 'cold'] },
    { t: "anything that won't float away. heavy as dirt. salty.", w: ['salty', 'earthy'] },
    { t: 'freeze-dried dreams. cold. drowsy.', w: ['cold', 'sleepy'] }] },
  { id: 'rabbit', n: 'a moon rabbit', reg: 'moon', rid: [
    { t: 'a dreamy, twinkly soup for staring at the earth', w: ['sleepy', 'sparkly'] },
    { t: 'something sweet and chilly, like moonlight', w: ['sweet', 'cold'] },
    { t: 'make it fizz and pucker. make it hop in my mouth.', w: ['sour', 'sparkly'] },
    { t: 'something hot and brave. i am going to fight the sun.', w: ['brave', 'warm'] }] },
  { id: 'alien', n: 'an alien tourist', reg: 'moon', rid: [
    { t: 'what do earthlings eat when they are sad. i heard warm. i heard sweet.', w: ['warm', 'sweet'] },
    { t: 'the spookiest, sourest food your species has', w: ['spooky', 'sour'] },
    { t: 'something that tastes like a lighthouse. sea spray and a shiny light.', w: ['salty', 'sparkly'] },
    { t: 'your planet has dirt? i want to eat the dirt. sweetly.', w: ['earthy', 'sweet'] }] },
  { id: 'ghost', n: 'a ghost', reg: 'rare', decor: 'candle', pay: 'ecto', rid: [
    { t: 'i want to feel something. preferably cold and eerie.', w: ['cold', 'spooky'] },
    { t: "something warm, then a long nap. i haven't been warm since 1743.", w: ['warm', 'sleepy'] },
    { t: "boo. (i'd like something sparkly please)", w: ['sparkly', 'spooky'] }] },
  { id: 'keeper', n: 'a sad lighthouse keeper', reg: 'rare', decor: 'paint', pay: 'tear', rid: [
    { t: 'something that tastes like a rainy tuesday. cold. drowsy.', w: ['cold', 'sleepy'] },
    { t: 'the sea took my hat. give me the sea back. cold and salty.', w: ['salty', 'cold'] },
    { t: "a warm little light in the dark. like someone's still out there.", w: ['warm', 'sparkly'] }] },
  { id: 'goblin', n: 'the tax goblin', reg: 'rare', decor: 'spike', pay: 'refund', rid: [
    { t: 'something deductible. salty. sour. like me.', w: ['salty', 'sour'] },
    { t: 'a soup that itemizes. sour. earthy. thorough.', w: ['sour', 'earthy'] },
    { t: 'you owe me a soup. a sour, haunted one.', w: ['sour', 'spooky'] }] },
  { id: 'dragon', n: 'a baby dragon', reg: 'rare', decor: 'plush', pay: 'sneeze', rid: [
    { t: "HOT. HOTTER. fearless. that's the order.", w: ['warm', 'brave'] },
    { t: "something sweet and warm. i'm only 300.", w: ['sweet', 'warm'] },
    { t: 'spicy and spooky like my mom', w: ['warm', 'spooky'] }] },
  { id: 'moon', n: 'the moon', reg: 'rare', decor: 'scope', pay: 'chunk', rid: [
    { t: 'something that tastes like the tide going out. salty. slow. drowsy.', w: ['salty', 'sleepy'] },
    { t: 'make me feel full. glittery, but grounded.', w: ['sparkly', 'earthy'] },
    { t: "people say i'm made of cheese. cold, glittery cheese. prove it.", w: ['sparkly', 'cold'] }] },
];
CUST.push({ id: 'critic', n: 'the soup critic', reg: 'critic', rid: [
  { t: "surprise me. something you've never made before.", w: [], novel: 1 },
  { t: "i've tasted every soup. prove me wrong.", w: [], novel: 1 },
  { t: "something new. if it's already in your book, i'll know.", w: [], novel: 1 }] });
const CM = {}; CUST.forEach(c => CM[c.id] = c);
const POOLS = { swamp: ['frog', 'snail', 'shroom', 'bear'], castle: ['knight', 'kid', 'jester', 'taster', 'snail'], moon: ['astro', 'rabbit', 'alien', 'bear', 'frog'] };

const UPG = [
  { id: 'big', n: 'bigger cauldron', d: 'holds 4 ingredients instead of 3.', p: 40 },
  { id: 'hours', n: 'longer hours', d: '+15 seconds every day.', p: 35 },
  { id: 'stool', n: 'comfy stools', d: 'customers wait 8s longer.', p: 30 },
  { id: 'spoon', n: 'hint spoon', d: 'reveals one thing each new riddle wants.', p: 45 },
  { id: 'ladle', n: 'gold ladle', d: '+25% coins per bowl.', p: 60 },
];
const DECOR = [
  { id: 'candle', n: 'haunted candle', d: 'a ghost might drop by. pays in ectoplasm.', p: 25, cust: 'ghost' },
  { id: 'paint', n: 'lighthouse painting', d: 'draws a sad lighthouse keeper. pays in tears.', p: 30, cust: 'keeper' },
  { id: 'spike', n: 'receipt spike', d: 'the tax goblin visits. rent halved, out of respect.', p: 25, cust: 'goblin' },
  { id: 'plush', n: 'dragon plushie', d: 'a baby dragon wants it back. pays in sneezes.', p: 35, cust: 'dragon' },
  { id: 'scope', n: 'telescope', d: 'the moon has noticed you. pays in itself.', p: 45, cust: 'moon' },
];

const LINES = {
  delight: ['oh. oh no. i love it.', "best thing i've ever eaten out of a bucket.", "i'm telling everyone. even the rocks.", "five stars. i don't know what stars are.", 'i feel things. good things.', 'my ancestors are weeping. happily.'],
  perfect: ['PERFECT. i am being healed.', 'exactly. how did you know.', 'you read my soul. creepy. delicious.'],
  polite: ['*polite sip* needed more {miss}.', "it's... soup. more {miss} next time.", "i'll finish it out of respect. needed {miss}."],
  hated: ['*polite sip* a bit too {hate}.', 'i said no {hate}. i was very clear.'],
  spit: ['*spit-take* i asked for {want}.', "*spit-take* that's {top}. why is it {top}.", "*spit-take* i'm calling the soup police."],
  over: ['too many opinions in this soup.', 'it tastes like six things arguing.'],
  timeout: ["i'll just go eat a rock.", "hmph. there's a frog stand down the road.", 'i aged a year. bye.'],
};
const NOTES = ['finish: regret.', 'finish: a long silence.', 'finish: wet socks.', 'finish: a tiny round of applause.', 'finish: hope, briefly.', 'finish: your aunt.', 'finish: tuesday.', 'finish: somehow, gravel.', 'finish: a distant kazoo.'];

// ---------------------------------------------------------------- save
let M = { book: {}, regions: ['swamp'], best: 0, seasons: 0, mute: false, tut: false, known: {}, rk: {}, region: 'swamp', weird: null, stars: {} };
let nosave = Q.has('nosave');
function load() { if (Q.has('fresh')) return; try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && typeof s === 'object') M = Object.assign(M, s); } catch (e) { } }
function save() { if (nosave) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(M)); } catch (e) { } }
load();

// ---------------------------------------------------------------- audio (real CC0 files, small pool)
const FILES = { plop: 'sfx/plop.mp3', stir: 'sfx/stir.mp3', sip: 'sfx/sip.mp3', spit: 'sfx/spit.mp3', coin: 'sfx/coin.mp3', ding: 'sfx/ding.mp3', tada: 'sfx/tada.mp3', yay: 'sfx/yay.mp3', fail: 'sfx/fail.mp3', boing: 'sfx/boing.mp3', gasp: 'sfx/gasp.mp3' };
// levelled by measurement (ffmpeg ebur128, Nov 16 2026), not by ear: frequent sounds land at about -21 to -25 LUFS after volume, big moments (tada, yay, gasp) at about -19
const VOL = { plop: .42, stir: .5, sip: .6, spit: .6, coin: .5, ding: .5, tada: .85, yay: .7, fail: .45, boing: .55, gasp: .7 };
const POOL = {}; let audioReady = false, hostMuted = false;
function initAudio() {
  if (audioReady) return; audioReady = true;
  for (const k in FILES) { POOL[k] = { i: 0, a: [] }; for (let n = 0; n < (k === 'plop' || k === 'coin' ? 3 : 2); n++) { const a = new Audio(FILES[k]); a.preload = 'auto'; a.volume = VOL[k]; POOL[k].a.push(a); } }
}
function sfx(k) {
  if (!audioReady || M.mute || hostMuted || SHOT || paused) return;
  const p = POOL[k]; if (!p) return; const a = p.a[p.i]; p.i = (p.i + 1) % p.a.length;
  try { a.currentTime = 0; const r = a.play(); if (r && r.catch) r.catch(() => { }); } catch (e) { }
}
function stopAll() { for (const k in POOL) POOL[k].a.forEach(a => { try { a.pause(); } catch (e) { } }); }
function muteIcon() { const m = M.mute || hostMuted; $('#muteWave').style.display = m ? 'none' : ''; $('#muteX').style.display = m ? '' : 'none'; }

// ---------------------------------------------------------------- analytics
let evCount = 0, ccStarted = false;
function ccStart() { if (ccStarted) return; ccStarted = true; try { window.cc && cc.start(); } catch (e) { } }
function evt(n, d) { if (evCount >= 18) return; evCount++; try { window.cc && cc.event(n, d || {}); } catch (e) { } }

// ---------------------------------------------------------------- state
let S; let paused = false;
const timers = [];
function later(sec, fn) { timers.push({ t: sec, fn }); }
function newSeason(region) {
  M.region = region || M.region || 'swamp'; if (!M.regions.includes(M.region)) M.region = 'swamp';
  S = {
    day: 1, coins: 0, earned: 0, region: M.region, owned: {}, upg: {}, decor: {},
    pot: [], soup: null, stirT: 0, last: null, cur: null, line: [], leaving: [], spawnT: 0, time: 70, dayLen: 70, closing: false, phase: 'day',
    streak: 0, stats: { served: 0, delight: 0, perfect: 0, spit: 0, walked: 0, newR: 0, missed: 0, dayEarn: 0, dayServed: 0, dayDelight: 0 },
    made: [], weird: null, lastRid: null, playT: 0, t0: performance.now(),
  };
  ING.forEach(g => { if (g.r === 'start') S.owned[g.id] = true; });
  S.liq = [70, 100, 130]; S.liqT = [70, 100, 130];
  P.length = 0; drops.length = 0; timers.length = 0;
  const bonus = Math.floor(Object.keys(M.book).length / 3); S.coins = bonus;
  if (bonus && M.tut) later(0.8, () => toast('recipe book bonus: +' + bonus + ' coins'));
  ccStart();
  startDay();
}
function cap() { return S.upg.big ? 4 : 3; }
function regionObj() { return REGIONS.find(r => r.id === S.region); }

function startDay() {
  S.phase = 'day'; S.criticToday = false; S.dayLen = 70 + (S.upg.hours ? 15 : 0); S.time = S.dayLen; S.closing = false; S.spawnT = 0;
  S.stats.dayEarn = 0; S.stats.dayServed = 0; S.stats.dayDelight = 0;
  S.line = []; S.cur = null; clearPot(true);
  spawn(); advance();
  updTop(); buildShelf(); updMain();
  if (M.tut) toast('day ' + S.day + ' · ' + regionObj().n + (S.day === SEASON_DAYS ? ' · last day!' : ''), 1400);
}

function spawn() {
  let pool = POOLS[S.region].slice();
  let id;
  const rares = DECOR.filter(d => S.decor[d.id]).map(d => d.cust);
  const r = Math.random();
  if (!M.tut && S.day === 1 && !S.cur && S.line.length === 0 && S.stats.served === 0) id = 'frog';
  else if (S.day >= 2 && !S.criticToday && r > 0.8 && Object.keys(M.book).length < NREC) { id = 'critic'; S.criticToday = true; }
  else if (rares.length && r < 0.2) id = pick(rares);
  else if (r < 0.04) id = pick(['ghost', 'keeper', 'goblin', 'dragon', 'moon'].filter(x => x !== 'moon' || S.region === 'moon'));
  else id = pick(pool);
  const c = CM[id];
  let ri = Math.floor(Math.random() * c.rid.length);
  if (S.lastRid === id + ri) ri = (ri + 1) % c.rid.length;
  if (id === 'frog' && !M.tut && S.stats.served === 0) ri = 0;
  S.lastRid = id + ri;
  const pat = 27 + (S.upg.stool ? 8 : 0) - S.day * 1.2 + (c.reg === 'rare' || c.reg === 'critic' ? 6 : 0);
  const rid = c.rid[ri];
  const hate = (rid.h || []).slice(); let allergy = null;
  if (S.day >= 3 && !rid.novel && !hate.length && Math.random() < 0.18 + S.day * 0.06) { allergy = pick(TAGS.filter(t => !rid.w.includes(t))); hate.push(allergy); }
  S.line.push({ c, ri, rid, hate, allergy, x: -100, tx: 0, mood: 'wait', moodT: 0, pat, maxPat: pat, arrived: false, seed: Math.random() * 10 });
}
function advance() {
  if (S.cur || !S.line.length) return;
  S.cur = S.line.shift(); S.cur.x = L.custX - L.cs * 1.6; S.cur.arrived = false;
  if (S.cur.c.reg === 'rare') { sfx('gasp'); evt('rare_customer', { id: S.cur.c.id }); }
  else sfx('ding');
  showBubble();
}
function riddleKey(c) { return c.c.id + c.ri; }
function showBubble() {
  const c = S.cur; if (!c) { $('#bubble').classList.add('hide'); return; }
  const b = $('#bubble'); b.classList.remove('hide'); b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
  $('#bName').innerHTML = c.c.n + (c.c.reg === 'rare' ? '<span class="rare">rare</span>' : c.c.reg === 'critic' ? '<span class="rare">pays triple for new recipes</span>' : '');
  $('#bText').textContent = '“' + c.rid.t + '”';
  let h = '';
  const known = M.rk[riddleKey(c)];
  if (c.rid.novel) h += '<span class="pill q">only a soup not in your book yet</span>';
  else if (known) {
    h += c.rid.w.map(t => pillHTML(t)).join('') + (c.rid.h || []).map(t => pillHTML(t, 'no')).join('');
  } else if (S.upg.spoon) h += pillHTML(c.rid.w[0]) + '<span class="pill q">+ ?</span>';
  if (c.allergy) h += `<span class="pill" style="background:#ff6b6b;color:#fff">allergic to ${c.allergy}</span>`;
  $('#bHint').innerHTML = h;
  placeBubble(); renderInfo();
}
function placeBubble() {
  const b = $('#bubble'); if (b.classList.contains('hide')) return;
  b.style.top = Math.round(Math.max(18, H * 0.045) + 8) + 'px';
  const w = b.offsetWidth; const left = clamp(L.custX - 50, 10, Math.max(10, W - w - 10));
  b.style.left = left + 'px';
  b.style.setProperty('--tail', clamp(L.custX - left - 12, 16, w - 40) + 'px');
}
function matchHTML(j, c, top) {
  if (j.novel) return `<span class="mline">${j.lvl === 2 ? '<b class="ok">&#10003;</b> brand-new recipe' : '<b class="bad">&#10007;</b> already in your book'}</span>`;
  let h = '<span class="mline">wanted: ' + c.rid.w.map(t => `<span class="pill" style="background:${TAGC[t]}">${TAGS_SHORT[t]} ${j.miss.includes(t) ? '<b class="bad">&#10007;</b>' : '<b class="ok">&#10003;</b>'}</span>`).join(' ');
  if ((c.hate || []).length) h += ' &middot; no ' + c.hate.map(t => `<span class="pill no2" style="background:${TAGC[t]}">${TAGS_SHORT[t]} ${j.hated.includes(t) ? '<b class="bad">&#10007;</b>' : '<b class="ok">&#10003;</b>'}</span>`).join(' ');
  h += '</span><span class="mline">your soup: ' + top.slice(0, 6).map(t => pillHTML(t)).join(' ') + (j.over ? ' <b class="bad">too many tastes</b>' : j.perfect ? ' <b class="ok">perfect!</b>' : '') + '</span>';
  return h;
}
function pillHTML(t, cls) { return `<span class="pill ${cls || ''}" style="background:${TAGC[t]}">${TAGS_SHORT[t]}</span>`; }

// ---------------------------------------------------------------- recipes
function hexRGB(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function mixCol(ids) {
  if (!ids.length) return [70, 100, 130];
  let r = 0, g = 0, b = 0; ids.forEach(id => { const c = hexRGB(IM[id].c); r += c[0]; g += c[1]; b += c[2]; });
  r /= ids.length; g /= ids.length; b /= ids.length;
  const m = (r + g + b) / 3; const k = 1.35; // punch up saturation
  return [clamp(m + (r - m) * k, 20, 245), clamp(m + (g - m) * k, 20, 245), clamp(m + (b - m) * k, 20, 245)].map(Math.round);
}
function profile(ids) { const p = {}; TAGS.forEach(t => p[t] = 0); ids.forEach(id => { const g = IM[id]; g.t.forEach((t, i) => p[t] += g.st ? 2 : (i === 0 ? 2 : 1)); }); return p; }
function topTags(p) { return TAGS.filter(t => p[t] > 0).sort((a, b) => p[b] - p[a] || TAGS.indexOf(a) - TAGS.indexOf(b)); }
function resolve(ids) {
  const uniq = [...new Set(ids)].sort();
  const prof = profile(ids), top = topTags(prof), col = mixCol(ids);
  let rec = R['x:' + uniq.join(',')];
  if (!rec) {
    const v = top.map(t => prof[t]);
    if (uniq.length === 1) rec = R['f:lazy'];
    else if (top.length >= 6) rec = R['f:many'];
    else if (top.length >= 3 && v[0] === v[1] && v[1] === v[2]) rec = R['f:beige'];
    else if (top.length === 1 || v[0] >= v[1] * 2 + 1) rec = R['s:' + top[0]];
    else { const pr = [top[0], top[1]].sort((a, b) => TAGS.indexOf(a) - TAGS.indexOf(b)); rec = R['p:' + pr.join('+')]; }
  }
  const name = rec.id === 'f:lazy' ? IM[uniq[0]].n + ', but more' : rec.name;
  return { rec, prof, top, col, ids: ids.slice(), name };
}
function weirdness(s) {
  const k = s.rec.kind; let w = k === 'special' ? 3 : k === 'odd' ? 4 : k === 'single' ? 2.5 : 1;
  const opp = ['warm+cold', 'sweet+sour', 'sweet+salty', 'sweet+spooky', 'brave+sleepy', 'spooky+sparkly', 'warm+cold'];
  if (k === 'pair' && opp.some(o => s.rec.id === 'p:' + o)) w = 2;
  return w + s.top.length * 0.1 + Math.random() * 0.05;
}
function judge(soup, cust) {
  const r = cust.rid, p = soup.prof, want = r.w, hate = cust.hate || r.h || [];
  if (r.novel) return { lvl: soup.isNew ? 2 : 0, miss: [], hated: [], perfect: !!soup.isNew, over: false, got: [], novel: 1 };
  const got = want.filter(t => p[t] > 0), miss = want.filter(t => !(p[t] > 0)), hated = hate.filter(t => p[t] > 0);
  const over = soup.top.length >= 6;
  let lvl;
  if (!miss.length && !hated.length) lvl = 2;
  else if (got.length && !hated.length) lvl = 1;
  else if (!miss.length && hated.length) lvl = 1;
  else lvl = 0;
  if (over && lvl > 0) lvl--;
  const top2 = soup.top.slice(0, 2);
  const perfect = lvl === 2 && want.every(t => top2.includes(t));
  return { lvl, miss, hated, perfect, over, got };
}

// ---------------------------------------------------------------- actions
function addIng(id) {
  if (!S || S.phase !== 'day' || paused) return;
  initAudio();
  if (S.soup) { toast('serve it or dump it first'); return; }
  if (S.stirT > 0) return;
  if (S.pot.length >= cap()) { toast('the cauldron is full. stir it.'); return; }
  const g = IM[id]; if (!g || !S.owned[id]) return;
  if (g.r === 'rare') { if (S.owned[id] < 1) return; S.owned[id]--; }
  S.pot.push(id);
  drops.push({ id, x: L.cx + rnd(-L.R * .3, L.R * .3), y: L.rimY - L.R * 1.4 - rnd(0, 20), vy: -60, rot: rnd(-1, 1), vr: rnd(-4, 4), slot: S.pot.length - 1 });
  sfx('boing');
  if (g.r === 'rare') buildShelf(); else markShelf();
  updMain(); coachStep();
}
function clearPot(silent) {
  if (S.pot.length && !silent && !S.soup) S.pot.forEach(id => { if (IM[id].r === 'rare') S.owned[id] = (S.owned[id] || 0) + 1; });
  S.pot = []; S.soup = null; S.stirT = 0; S.liqT = [70, 100, 130]; drops.length = 0; floaters.length = 0;
  $('#soupCard').classList.add('hide');
  if (!silent) buildShelf(); else markShelf();
  updMain();
}
function dump() { if (!S || S.phase !== 'day' || paused) return; if (!S.pot.length) return; if (!S.soup) sfx('plop'); else sfx('fail'); for (let i = 0; i < 10; i++) part('drop', L.cx + rnd(-L.R * .6, L.R * .6), L.rimY, rnd(-120, 120), rnd(-240, -80), S.liq); clearPot(false); }
function stir() {
  if (!S || S.phase !== 'day' || paused || S.soup || S.stirT > 0) return;
  if (S.pot.length < 2) { toast('needs at least 2 ingredients'); return; }
  S.stirT = 0.0001; S.stirStart = performance.now(); sfx('stir'); updMain();
}
function finishStir() {
  drops.forEach(d => floaters.push({ id: d.id, a: rnd(0, 6), r: rnd(.2, .7) })); drops.length = 0;
  const soup = resolve(S.pot); S.soup = soup; S.stirT = 0;
  S.liqT = soup.col.slice();
  // reveal tags of the ingredients used
  let reveal = false; soup.ids.forEach(id => { if (!M.known[id]) { M.known[id] = 1; reveal = true; } });
  const isNew = !M.book[soup.rec.id]; soup.isNew = isNew;
  M.book[soup.rec.id] = M.book[soup.rec.id] || { n: 0, c: soup.col };
  M.book[soup.rec.id].n++;
  S.made.push(soup);
  if (!S.weird || weirdness(soup) >= weirdness(S.weird)) S.weird = soup;
  if (!M.weird || weirdness(soup) > weirdness(M.weird)) M.weird = { name: soup.name, col: soup.col, top: soup.top, rec: { id: soup.rec.id, kind: soup.rec.kind } };
  // card
  const card = $('#soupCard'); card.classList.remove('hide'); card.classList.toggle('new', isNew);
  card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
  $('#soupName').textContent = soup.name;
  $('#soupTags').innerHTML = soup.top.slice(0, 5).map(t => pillHTML(t, 'big')).join('');
  $('#soupNote').textContent = soup.rec.kind === 'odd' && soup.rec.id !== 'f:lazy' ? soup.rec.d : 'notes of ' + soup.top.slice(0, 2).join(' and ') + '. ' + pick(NOTES);
  placeCard();
  for (let i = 0; i < 26; i++) part('poof', L.cx + rnd(-L.R * .7, L.R * .7), L.rimY - rnd(0, 20), rnd(-60, 60), rnd(-160, -40), [255, 255, 255]);
  if (isNew) {
    S.stats.newR++; sfx('tada'); burst(L.cx, L.rimY - L.R * .5, 18); burst(L.cx, L.rimY - L.R * .5, 14);
    fanfare(soup.name);
    $('#bookBtn').classList.add('glow'); setTimeout(() => $('#bookBtn').classList.remove('glow'), 1600);
    checkRegions();
    if (Object.keys(M.book).length === 1) evt('first_soup', { id: soup.rec.id });
  } else sfx('plop');
  if (reveal) buildShelf(); else renderInfo();
  updTop(); save(); updMain(); coachStep();
}
function placeCard() { }
function serve() {
  if (!S || S.phase !== 'day' || paused) return;
  const c = S.cur; if (!S.soup || !c || !c.arrived || c.done) return;
  const j = judge(S.soup, c);
  const reg = regionObj();
  let base = 6 + S.day;
  let pay = 0;
  if (j.lvl === 2) { S.streak++; pay = base + Math.min(S.streak - 1, 5); if (j.perfect) pay = Math.ceil(pay * 1.5); }
  else if (j.lvl === 1) { S.streak = 0; pay = Math.ceil(base * 0.5); }
  else { S.streak = 0; pay = 0; }
  const rare = c.c.reg === 'rare';
  if (rare) pay *= 2;
  if (j.novel && j.lvl === 2) pay *= 2;
  pay = Math.round(pay * reg.mult * (S.upg.ladle ? 1.25 : 1));
  S.coins += pay; S.earned += pay; S.stats.dayEarn += pay; S.stats.served++; S.stats.dayServed++;
  if (j.lvl === 2) { S.stats.delight++; S.stats.dayDelight++; } if (j.perfect) S.stats.perfect++; if (j.lvl === 0) S.stats.spit++;
  M.rk[riddleKey(c)] = 1;
  // reaction line
  let line;
  const top = S.soup.top[0] || 'water';
  if (j.novel) line = j.lvl === 2 ? pick(['new. NEW. three stars. i only have three stars.', 'i have never tasted this. i am shaken. here, money.']) : pick(['seen it. it is literally in your book.', '*spit-take* derivative. page ' + (2 + Math.floor(Math.random() * 9)) + ' of your own book.']);
  else if (j.lvl === 2) line = pick(j.perfect ? LINES.perfect : LINES.delight);
  else if (j.over) line = pick(LINES.over);
  else if (j.hated.length) line = pick(LINES.hated).replace('{hate}', j.hated[0]);
  else if (j.lvl === 1) line = pick(LINES.polite).replace('{miss}', j.miss[0]);
  else line = pick(LINES.spit).replace('{want}', c.rid.w.join(' + ')).replace(/\{top\}/g, top);
  c.done = true;
  const col = S.soup.col.slice(), soupTop = S.soup.top.slice(), soupName = S.soup.name;
  bowl = { t: 0, x0: L.cx, y0: L.rimY - 10, col, c };
  $('#pat').classList.add('hide');
  later(0.22, () => {
  c.mood = j.lvl === 2 ? 'delight' : j.lvl === 1 ? 'polite' : 'spit'; c.moodT = 0;
  $('#bText').textContent = line;
  $('#bHint').innerHTML = matchHTML(j, c, soupTop);
  S.last = { name: c.c.n, soup: soupName, html: matchHTML(j, c, soupTop), lvl: j.lvl, pay };
  renderInfo();
  placeBubble();
  // juice
  const hx = c.x, hy = L.custY;
  if (j.lvl === 2) { sfx(j.perfect ? 'yay' : 'sip'); setTimeout(() => sfx('coin'), 250); for (let i = 0; i < 10; i++) part('heart', hx + rnd(-30, 30), hy - L.cs, rnd(-40, 40), rnd(-120, -60), [255, 110, 160]); if (j.perfect) burst(hx, hy - L.cs * .5, 14); }
  else if (j.lvl === 1) { sfx('sip'); if (pay) setTimeout(() => sfx('coin'), 300); }
  else { sfx('spit'); shake = 0.35; for (let i = 0; i < 26; i++) part('spray', hx + L.cs * .6, hy + L.cs * .35, rnd(60, 260), rnd(-120, 40), col); }
  if (pay) { floatText('+' + pay + (j.perfect ? ' perfect!' : rare ? ' rare!' : ''), hx, hy - L.cs * 1.6, j.perfect ? '#ffd84a' : '#fff4c9'); for (let i = 0; i < Math.min(pay, 12); i++) part('coin', hx + rnd(-20, 20), hy, rnd(-60, 160), rnd(-260, -120), [255, 200, 40]); bumpCoins(); }
  else floatText('no tip. not even a bowl back.', hx, hy - L.cs * 1.6, '#ff9a9a');
  if (S.streak >= 3 && j.lvl === 2) floatText(S.streak + ' delights in a row', L.cx, L.rimY - L.R * 1.3, '#8dff6a');
  });
  // rare payment in ingredients
  if (rare && j.lvl > 0) {
    const n = j.lvl === 2 ? 2 : 1; S.owned[c.c.pay] = (S.owned[c.c.pay] || 0) + n;
    setTimeout(() => toast(c.c.n + ' paid you ' + n + ' ' + IM[c.c.pay].n + (n > 1 ? 's' : '')), 500);
    buildShelf();
  }
  if (S.stats.served === 1) evt('first_serve', { lvl: j.lvl });
  // pour soup out
  S.pot = []; S.soup = null; S.liqT = [70, 100, 130]; floaters.length = 0; $('#soupCard').classList.add('hide');
  markShelf(); updTop(); updMain();
  if (!M.tut) { M.tut = true; save(); coach('riddles hint at hidden tastes. stirring reveals what an ingredient tastes like. the clock is ticking now.', 6000); }
  later(2.0, () => leave(c));
}
function leave(c) {
  if (S.cur !== c) return;
  c.leaving = true; S.leaving.push(c); S.cur = null; $('#bubble').classList.add('hide'); $('#pat').classList.remove('hide');
  later(0.35, () => { if (S.phase === 'day') advance(); updMain(); });
}
function walkout(c) {
  if (S.cur !== c) return;
  c.mood = 'angry'; c.done = true; S.streak = 0; S.stats.walked++;
  $('#bText').textContent = pick(LINES.timeout); $('#bHint').innerHTML = ''; $('#pat').classList.add('hide'); sfx('fail');
  later(1.3, () => leave(c));
}
function mainAction() {
  if (!S || S.phase !== 'day') return;
  if (S.stirT > 0 && !S.soup) { finishStir(); return; }
  if (S.soup) { if (S.cur && S.cur.arrived && !S.cur.done) serve(); else toast('nobody to serve. dump it or wait.'); }
  else stir();
}

// ---------------------------------------------------------------- day end / market
// rent: tuned Nov 16 2026 to about 25-35% of a human-ish night's take; scales with the day and the stall (x1.5 castle, x1.9 moon).
// missing it is not game over: the tax goblin takes what you have and locks tonight's market.
const RENT_DAY = 18, RENT_BASE = 17; // swamp: 35, 53, 71, 89, 107
const RENT_MULT = { swamp: 1, castle: 1.5, moon: 1.9 }; // rent only (pay uses the stall's mult); set by castle/moon bot seasons
function rentFor(day) { return Math.ceil((RENT_DAY * day + RENT_BASE) * (RENT_MULT[S.region] || regionObj().mult) * (S.decor.spike ? 0.5 : 1)); }
function endDay() {
  S.phase = 'night'; clearPot(true); $('#bubble').classList.add('hide'); $('#coach').classList.add('hide');
  const rent = rentFor(S.day);
  const short = S.coins < rent, had = S.coins;
  try { window.cc && cc.score(Math.max(1, S.earned)); } catch (e) { }
  evt('day_end', { day: S.day, earned: S.stats.dayEarn, missed: short ? 1 : 0 });
  if (short) { S.coins = 0; S.stats.missed++; sfx('fail'); } else { S.coins -= rent; sfx('ding'); }
  updTop();
  if (S.day >= SEASON_DAYS) { endSeason(false, rent); return; }
  if (short) showLocked(rent, had); else showMarket(rent);
}
const LOCKED = ["\"rent's rent,\" he said, pocketing the market key.", 'he took the coins, the market key and, for some reason, a spoon.', "\"no rent, no shopping. i don't make the rules. i do make the rules.\"", "he stamped your hand. it says \"owes soup money\". it won't wash off."];
function showLocked(rent, had) {
  const st = S.stats;
  let h = `<h2>night ${S.day} · the market is locked</h2>
  <div class="report">served <b>${st.dayServed}</b> · delighted <b>${st.dayDelight}</b> · earned <b>${st.dayEarn}</b><br>season so far <b>${S.earned}</b> ${starHTML(starsFor(S.earned, S.region))}</div>
  <p>rent was <b>${rent}</b>. you had <b>${had}</b>. the tax goblin took all of it. ${pick(LOCKED)}</p>
  <p style="font-size:12px;opacity:.75;margin-top:6px">no shopping tonight. tomorrow's rent: ${rentFor(S.day + 1)}. the cart is still yours.</p>
  <div class="mbtns"><button class="btn" id="nextDay">open for day ${S.day + 1}</button><button class="btn ghost" id="mBook">recipe book</button></div>`;
  openModal(h);
  $('#nextDay').onclick = nextDay; $('#mBook').onclick = () => showBook(() => showLocked(rent, had));
}
function showMarket(rent) {
  const st = S.stats;
  let h = `<h2>night ${S.day} · the weird market</h2>
  <div class="report">served <b>${st.dayServed}</b> · delighted <b>${st.dayDelight}</b> · earned <b>${st.dayEarn}</b><br>season so far <b>${S.earned}</b> ${starHTML(starsFor(S.earned, S.region))} ${(() => { const nx = starLine(S.region).find(v => S.earned < v); return nx ? '<span style="opacity:.7">next star at ' + nx + '</span>' : '<span style="color:#8dff6a">all stars!</span>'; })()}<br>rent: <b>-${rent}</b> <span style="opacity:.7">(the tax goblin insists)</span><br>you have <b id="mCoins">${S.coins}</b> coins · tomorrow's rent: ${rentFor(S.day + 1)}</div>`;
  h += '<h3>ingredients</h3><div class="items">';
  const regs = M.regions;
  const ings = ING.filter(g => g.p && regs.includes(g.r));
  ings.forEach(g => {
    const own = S.owned[g.id];
    h += `<div class="item ${own ? 'owned' : ''}"><div class="t"><canvas data-ic="${g.id}"></canvas>${g.n}</div><div class="d">${g.d}</div><div>${M.known[g.id] ? g.t.map(t => pillHTML(t)).join(' ') : '<span class="pill q">tastes: ???</span>'}</div>
      <button class="buy" data-buy="ing:${g.id}" ${own || S.coins < g.p ? 'disabled' : ''}>${own ? 'on the shelf' : '<i class="coin"></i>' + g.p}</button></div>`;
  });
  const locked = REGIONS.filter(r => !regs.includes(r.id));
  if (locked.length) h += `<div class="item owned"><div class="t">more stalls</div><div class="d">${locked.map(r => r.n + ' opens at ' + r.need + ' recipes').join('. ')}. you have ${Object.keys(M.book).length}.</div></div>`;
  h += '</div><h3>upgrades</h3><div class="items">';
  UPG.forEach(u => { const own = S.upg[u.id]; h += `<div class="item ${own ? 'owned' : ''}"><div class="t">${u.n}</div><div class="d">${u.d}</div><button class="buy" data-buy="upg:${u.id}" ${own || S.coins < u.p ? 'disabled' : ''}>${own ? 'owned' : '<i class="coin"></i>' + u.p}</button></div>`; });
  h += '</div><h3>decorations (draw rare customers)</h3><div class="items">';
  DECOR.forEach(u => { const own = S.decor[u.id]; h += `<div class="item ${own ? 'owned' : ''}"><div class="t">${u.n}</div><div class="d">${u.d}</div><button class="buy" data-buy="dec:${u.id}" ${own || S.coins < u.p ? 'disabled' : ''}>${own ? 'on the cart' : '<i class="coin"></i>' + u.p}</button></div>`; });
  h += `</div><div class="mbtns sticky"><button class="btn" id="nextDay">open for day ${S.day + 1}</button><button class="btn ghost" id="mBook">recipe book</button></div>`;
  openModal(h);
  $('#modalBox').querySelectorAll('canvas[data-ic]').forEach(cv => iconCanvas(cv, IM[cv.dataset.ic], 28));
  $('#modalBox').querySelectorAll('[data-buy]').forEach(b => b.onclick = () => buy(b.dataset.buy, rent));
  $('#nextDay').onclick = nextDay; $('#mBook').onclick = () => showBook(() => showMarket(rent));
}
function buy(key, rent) {
  const [k, id] = key.split(':');
  const it = k === 'ing' ? IM[id] : k === 'upg' ? UPG.find(u => u.id === id) : DECOR.find(u => u.id === id);
  if (!it || S.coins < it.p) return;
  S.coins -= it.p;
  if (k === 'ing') S.owned[id] = true; else if (k === 'upg') S.upg[id] = true; else S.decor[id] = true;
  sfx('coin'); updTop();
  const sc = $('#modalBox').scrollTop; showMarket(rent); $('#modalBox').scrollTop = sc;
}
function nextDay() { closeModal(); S.day++; startDay(); }

function endSeason(broke, rent) {
  S.phase = 'end';
  const score = Math.max(1, S.earned);
  const isBest = score > M.best; if (isBest) M.best = score; M.seasons++;
  M.stars = M.stars || {}; M.stars[S.region] = Math.max(M.stars[S.region] || 0, starsFor(score, S.region)); save();
  try { window.cc && cc.end({ score, durationMs: Math.round(performance.now() - S.t0), completed: !broke }); } catch (e) { }
  ccStarted = false; // the next season is a new play: newSeason() calls cc.start() again
  evt('season_end', { score, broke: !!broke, recipes: Object.keys(M.book).length });
  sfx(broke ? 'fail' : 'tada');
  S.endInfo = { broke, rent, score, isBest };
  showEnd();
}
function showEnd() {
  const { broke, rent, score, isBest } = S.endInfo;
  const w = S.weird;
  let h = `<div class="ecols"><div class="ec1"><h2>${broke ? 'the tax goblin took the cart' : 'season over'}</h2>
  <p>${broke ? `rent was ${rent}. you had less. he was polite about it.` : 'five days of soup. the cauldron needs a lie down.'}</p>
  <div style="font-size:30px;letter-spacing:4px">${starHTML(starsFor(score, S.region))}</div><div style="font-size:12px;opacity:.7">stars at ${starLine(S.region).join(' / ')} coins at ${regionObj().n}</div>
  <div class="row" style="margin:10px 0;gap:14px"><div class="score">${score}</div><div style="font-size:13px;opacity:.85">coins earned${isBest ? '<br><b style="color:#8dff6a">new best!</b>' : '<br>best: ' + M.best}</div></div>
  <div class="report">bowls served <b>${S.stats.served}</b> · delights <b>${S.stats.delight}</b> · perfect <b>${S.stats.perfect}</b> · spit-takes <b>${S.stats.spit}</b><br>new recipes this season <b>${S.stats.newR}</b> · book <b>${Object.keys(M.book).length}/${NREC}</b>${S.stats.missed ? '<br>rent missed <b>' + S.stats.missed + '</b> · the tax goblin sends his regards' : ''}${w ? '<br>weirdest soup: <b>' + esc(w.name) + '</b>' : ''}</div></div>
  <div class="ec2"><canvas id="shareCv" width="640" height="640"></canvas>
  <div class="mbtns"><button class="btn serve" id="shareBtn">share</button><button class="btn ghost" id="eBook">recipe book</button></div>
  <h3>new season · pick a stall</h3><div class="regions">${REGIONS.map(r => { const ok = M.regions.includes(r.id); return `<button class="btn ${ok ? '' : 'locked'}" data-reg="${r.id}" ${ok ? '' : 'disabled'}>${ok ? r.n + ' <small>' + starHTML(M.stars[r.id] || 0) + '</small>' : r.n + ' · ' + r.need + ' recipes'}</button>`; }).join('')}</div>
  <div id="tipslot" style="margin-top:12px"></div></div></div>`;
  openModal(h, true);
  drawShare($('#shareCv'), score);
  $('#shareBtn').onclick = () => share(score);
  $('#eBook').onclick = () => showBook(showEnd);
  $('#modalBox').querySelectorAll('[data-reg]').forEach(b => b.onclick = () => { closeModal(); newSeason(b.dataset.reg); });
  try { window.ccTip && ccTip.mount($('#tipslot'), { game: 'soup-witch', slot: 'game-over' }); } catch (e) { }
}
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
// tuned Nov 16 2026 against season bots (_checks\soup-witch\sw_bot.mjs, swamp): sloppy ~600, human-ish ~950 on season 1 and ~1050-1180 on season 2, perfect ~2900
const STAR_AT = [300, 650, 1100];
function starLine(reg) { const m = REGIONS.find(r => r.id === reg).mult; return STAR_AT.map(v => Math.round(v * m)); }
function starsFor(e, reg) { return starLine(reg).filter(v => e >= v).length; }
function starHTML(n) { let h = ''; for (let i = 0; i < 3; i++) h += `<span style="color:${i < n ? '#ffd84a' : '#5a4a7a'}">&#9733;</span>`; return h; }
function checkRegions() {
  const n = Object.keys(M.book).length;
  REGIONS.forEach(r => { if (!M.regions.includes(r.id) && n >= r.need) { M.regions.push(r.id); save(); setTimeout(() => { toast(r.n + ' is open! new ingredients at the market.'); sfx('yay'); }, 900); evt('region_unlock', { id: r.id }); } });
}

// ---------------------------------------------------------------- book
function showBook(back) {
  const wasPaused = paused; const inDay = S && S.phase === 'day';
  if (inDay) setPaused(true, true);
  const n = Object.keys(M.book).length;
  let h = `<h2>recipe book</h2><p>${n} of ${NREC} soups found. stir new combos to fill it.</p><div class="bar"><i style="width:${n / NREC * 100}%"></i></div>`;
  const nxt = REGIONS.find(r => !M.regions.includes(r.id));
  if (nxt) h += `<p style="font-size:12px;opacity:.75">${nxt.n} opens at ${nxt.need} recipes.</p>`;
  h += '<div class="legend">' + TAGS.map(t => pillHTML(t, 'big')).join('') + '</div>';
  const groups = [['two-taste soups (the two strongest tastes)', 'pair'], ['pure soups (one taste, twice as strong as the rest)', 'single'], ['oddities', 'odd'], ['secret combos (exactly these ingredients, nothing else)', 'special']];
  groups.forEach(([title, kind]) => {
    const rs = RECIPES.filter(r => r.kind === kind);
    h += `<h3>${title} · ${rs.filter(r => M.book[r.id]).length}/${rs.length}</h3><div class="book">`;
    rs.forEach(r => {
      const b = M.book[r.id];
      if (b) h += `<div class="rc"><div class="sw" style="background:rgb(${b.c.join(',')})"></div><div><div class="rn">${esc(r.name)}</div><div style="font-size:10px;opacity:.6">made ${b.n}x</div></div></div>`;
      else {
        const tease = r.kind === 'special' ? r.ids.find(id => M.known[id]) : null;
        let hint = r.kind === 'special' ? (tease ? IM[tease].n + ' + ' + (r.ids.length - 1) + ' more' : r.ids.length + ' secret ingredients') : r.kind === 'odd' ? r.d : r.hint.map(t => pillHTML(t)).join(' ');
        h += `<div class="rc unk"><div class="sw"></div><div><div class="rn">???</div><div style="font-size:10px">${hint}</div></div></div>`;
      }
    });
    h += '</div>';
  });
  h += '<div class="mbtns"><button class="btn" id="bClose">back</button></div>';
  openModal(h);
  $('#bClose').onclick = () => { if (back) back(); else { closeModal(); if (inDay && !wasPaused) setPaused(false, true); } };
}

// ---------------------------------------------------------------- modal / toast / coach
let modalOpen = false;
function openModal(h, end) { modalOpen = true; const b = $('#modalBox'); b.innerHTML = h; b.classList.toggle('end', !!end); b.scrollTop = 0; $('#modal').classList.remove('hide'); }
function closeModal() { modalOpen = false; $('#modal').classList.add('hide'); }
let toastTO;
function toast(t, ms) { const e = $('#toast'); e.textContent = t; e.classList.remove('hide'); clearTimeout(toastTO); toastTO = setTimeout(() => e.classList.add('hide'), ms || 1700); }
let coachTO;
function coach(t, ms) { const e = $('#coach'); e.textContent = t; e.classList.remove('hide'); e.style.animation = 'none'; void e.offsetWidth; e.style.animation = ''; clearTimeout(coachTO); if (ms) coachTO = setTimeout(() => e.classList.add('hide'), ms); }
function coachStep() {
  if (M.tut || !S || S.phase !== 'day') { document.querySelectorAll('.ing.hl').forEach(e => e.classList.remove('hl')); return; }
  const shelfEls = document.querySelectorAll('.ing');
  if (!S.cur || !S.cur.arrived) return;
  if (S.soup) { coach('now serve it to the frog. tap serve or press enter.'); shelfEls.forEach(e => e.classList.remove('hl')); }
  else if (S.pot.length >= 2) { coach('stir it! tap stir or press enter.'); shelfEls.forEach(e => e.classList.remove('hl')); }
  else { coach('tap 2 or 3 ingredients to drop them in the cauldron'); shelfEls.forEach(e => e.classList.add('hl')); }
}
function fanfare(name) {
  const f = $('#fanfare'); f.innerHTML = `<div class="ff1">new recipe!</div><div class="ff2">${esc(name)}</div><div class="ff3">${Object.keys(M.book).length} / ${NREC} in the book</div>`;
  f.classList.remove('hide'); f.style.animation = 'none'; void f.offsetWidth; f.style.animation = '';
  clearTimeout(fanfare.to); fanfare.to = setTimeout(() => f.classList.add('hide'), 1250);
  const b = $('#bookBtn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
}
function bumpCoins() { const e = $('#coins'); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }

// ---------------------------------------------------------------- UI build
function ownedList() { return ING.filter(g => S.owned[g.id] && (g.r !== 'rare' || S.owned[g.id] > 0)); }
const KEYS = '1234567890qwertyuioasdfghjklzxcv';
function buildShelf() {
  const sh = $('#shelf'); sh.innerHTML = '';
  ownedList().forEach((g, i) => {
    const b = document.createElement('button'); b.className = 'ing'; b.dataset.id = g.id; b.title = g.n + (M.known[g.id] ? ': ' + g.t.join(', ') : ': tastes unknown. stir it to find out.') + (g.d ? ' (' + g.d + ')' : '');
    const known = M.known[g.id];
    b.innerHTML = `<span class="k">${KEYS[i] || ''}</span>${g.r === 'rare' ? `<span class="cnt">x${S.owned[g.id]}</span>` : ''}<canvas></canvas><span class="nm">${g.n}</span><span class="tg">${known ? g.t.map(t => pillHTML(t)).join('') : '<span class="pill q">???</span>'}</span>`;
    iconCanvas(b.querySelector('canvas'), g, 34);
    b.addEventListener('click', () => addIng(g.id));
    sh.appendChild(b);
  });
  markShelf(); coachStep();
}
const wideMQ = window.matchMedia('(min-width:700px) and (min-aspect-ratio:5/4)');
function renderInfo() {
  const el = $('#info'); if (!el || !S || !wideMQ.matches) return;
  let h = '';
  const c = S.cur;
  if (c && S.phase === 'day') {
    const known = M.rk[riddleKey(c)];
    let w;
    if (c.rid.novel) w = '<span class="pill q">any soup not in your book yet</span>';
    else if (known) w = c.rid.w.map(t => pillHTML(t)).join(' ');
    else if (S.upg.spoon) w = pillHTML(c.rid.w[0]) + ' <span class="pill q">?</span>';
    else w = c.rid.w.map(() => '<span class="pill q">?</span>').join(' ') + ' <span class="dim">serve once to learn this riddle</span>';
    const hates = (known ? (c.rid.h || []) : []).concat(c.allergy ? [c.allergy] : []);
    h += `<div class="ib"><div class="ih">order &middot; ${c.c.n}</div><div class="iw">wants ${w}</div>${hates.length ? '<div class="iw">no ' + hates.map(t => pillHTML(t, 'no')).join(' ') + '</div>' : ''}</div>`;
  }
  // pot profile
  if (S.pot.length) {
    const kn = S.pot.filter(id => M.known[id]), unk = S.pot.length - kn.length;
    const p = profile(kn), tp = topTags(p);
    h += `<div class="ib"><div class="ih">in the pot &middot; ${S.pot.length}/${cap()}</div>` + tp.map(t => `<div class="pbar">${pillHTML(t)}<i style="width:${p[t] * 14}px;background:${TAGC[t]}"></i></div>`).join('') + (unk ? `<div class="dim">+ ${unk} ingredient${unk > 1 ? 's' : ''} you haven't tasted yet</div>` : '') + '</div>';
  } else h += '<div class="ib"><div class="ih">in the pot</div><div class="dim">empty. tap 2 to ' + cap() + ' ingredients.</div></div>';
  if (S.last) h += `<div class="ib"><div class="ih">last bowl &middot; ${esc(S.last.soup)}</div>${S.last.html}</div>`;
  const n = Object.keys(M.book).length, nx = REGIONS.find(r => !M.regions.includes(r.id));
  h += `<button class="ib bookb" id="infoBook"><div class="ih">recipe book &middot; ${n}/${NREC}</div><div class="bar"><i style="width:${n / NREC * 100}%"></i></div><div class="dim">${nx ? nx.n + ' opens at ' + nx.need : 'every stall is open'} &middot; tap to open</div></button>`;
  // taste guide
  const own = ownedList();
  const rows = TAGS.map(t => { const ns = own.filter(g => M.known[g.id] && g.t.includes(t)).map(g => g.n); return ns.length ? `<div class="gr">${pillHTML(t)} <span>${ns.join(', ')}</span></div>` : ''; }).join('');
  const unknown = own.filter(g => !M.known[g.id]).length;
  h += `<div class="ib"><div class="ih">taste guide</div>${rows || '<div class="dim">nothing tasted yet. stir something.</div>'}${unknown ? `<div class="dim">${unknown} on the shelf still untasted (???)</div>` : ''}</div>`;
  el.innerHTML = h;
  const bb = $('#infoBook'); if (bb) bb.onclick = () => { if (!modalOpen) showBook(); };
}
wideMQ.addEventListener && wideMQ.addEventListener('change', () => renderInfo());
function markShelf() { if (!S) return; document.querySelectorAll('.ing').forEach(b => b.classList.toggle('in', S.pot.includes(b.dataset.id))); renderInfo(); }
function updTop() {
  if (!S) return;
  $('#dayLbl').textContent = 'day ' + S.day + '/' + SEASON_DAYS;
  $('#coinN').textContent = S.coins;
  $('#bookN').textContent = Object.keys(M.book).length + '/' + NREC;
}
function updMain() {
  if (!S) return;
  const mb = $('#mainBtn');
  mb.classList.remove('serve', 'pulse');
  if (S.soup) { mb.innerHTML = 'serve<span class="kb">enter</span>'; mb.classList.add('serve'); mb.disabled = !(S.cur && S.cur.arrived && !S.cur.done); if (!mb.disabled) mb.classList.add('pulse'); }
  else { mb.innerHTML = S.stirT > 0 ? 'stirring… <small>(tap to skip)</small>' : 'stir<span class="kb">enter</span>'; mb.disabled = S.pot.length < 2; if (!mb.disabled) mb.classList.add('pulse'); }
  $('#dumpBtn').disabled = !S.pot.length;
}

// ---------------------------------------------------------------- canvas
const cv = $('#scene'), g = cv.getContext('2d');
let W = 300, H = 300, DPR = 1; const L = {};
let stars = [], flies = [];
function layout() {
  const r = cv.getBoundingClientRect(); W = Math.max(50, r.width); H = Math.max(50, r.height);
  DPR = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  const wide = W / H > 1.25;
  L.counterY = H * (wide ? 0.68 : 0.7);
  L.R = clamp(Math.min(W * (wide ? 0.17 : 0.215), H * 0.21), 36, 130);
  L.cx = W * (wide ? 0.64 : 0.67); L.cy = L.counterY - L.R * 0.08; L.rimY = L.cy - L.R * 0.62;
  L.cs = clamp(Math.min(W * (wide ? 0.095 : 0.155), H * 0.125), 22, 80);
  L.custX = W * (wide ? 0.3 : 0.27); L.custY = L.counterY - L.cs * 1.3;
  stars = []; for (let i = 0; i < 70; i++) stars.push({ x: Math.random() * W, y: Math.random() * L.counterY, r: rnd(.5, 1.8), p: Math.random() * 6 });
  flies = []; for (let i = 0; i < 14; i++) flies.push({ x: Math.random() * W, y: rnd(H * .2, L.counterY), p: Math.random() * 6, s: rnd(.3, 1) });
  bgCache = null; placeBubble(); if (S && S.soup) placeCard();
}
let bgCache = null, bgKey = '';
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function bgRegion() { return S ? S.region : 'swamp'; }
function buildBg() {
  const reg = bgRegion(); const key = reg + W + 'x' + H; if (bgCache && bgKey === key) return; bgKey = key;
  const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; const x = c.getContext('2d'); x.scale(DPR, DPR);
  const cy = L.counterY;
  let gr = x.createLinearGradient(0, 0, 0, cy);
  if (reg === 'swamp') { gr.addColorStop(0, '#1b2350'); gr.addColorStop(.6, '#4b3a78'); gr.addColorStop(1, '#d9716b'); }
  else if (reg === 'castle') { gr.addColorStop(0, '#5ab3ff'); gr.addColorStop(.7, '#ffc4de'); gr.addColorStop(1, '#ffe2b8'); }
  else { gr.addColorStop(0, '#07061a'); gr.addColorStop(.7, '#1e1848'); gr.addColorStop(1, '#3b2f6e'); }
  x.fillStyle = gr; x.fillRect(0, 0, W, H);
  if (reg === 'swamp') {
    x.fillStyle = '#fff3c4'; x.globalAlpha = .9; x.beginPath(); x.arc(W * .84, cy * .28, Math.min(W, H) * .06, 0, 7); x.fill(); x.globalAlpha = 1;
    x.fillStyle = '#1b2350'; x.beginPath(); x.arc(W * .84 + Math.min(W, H) * .025, cy * .28 - Math.min(W, H) * .015, Math.min(W, H) * .052, 0, 7); x.fill();
    for (let l = 0; l < 2; l++) { x.fillStyle = l ? '#1f3a35' : '#2c2a52'; x.beginPath(); x.moveTo(0, cy); for (let i = 0; i <= 12; i++) { const px = i / 12 * W; x.lineTo(px, cy - (l ? 40 : 75) * (H / 600) - Math.sin(i * 1.7 + l * 3) * 22 * (H / 600) - (i % 3 === 0 ? 30 * (H / 600) : 0)); } x.lineTo(W, cy); x.fill(); }
    x.strokeStyle = '#173029'; x.lineWidth = 3; for (let i = 0; i < 9; i++) { const px = (i * 0.123 + 0.03) * W; x.beginPath(); x.moveTo(px, cy); x.quadraticCurveTo(px + 6, cy - 40, px + 12 * Math.sin(i), cy - 70 - (i % 3) * 14); x.stroke(); x.fillStyle = '#5a3b26'; rr(x, px + 12 * Math.sin(i) - 3, cy - 82 - (i % 3) * 14, 6, 16, 3); x.fill(); }
  } else if (reg === 'castle') {
    const s = H / 600; x.fillStyle = '#b9a8d6';
    x.fillRect(W * .05, cy - 150 * s, W * .9, 150 * s);
    for (let i = 0; i < 16; i++) { x.fillRect(W * .05 + i * W * .9 / 16, cy - 165 * s, W * .9 / 32, 15 * s); }
    [[.12, 230], [.5, 270], [.88, 230]].forEach(([fx, th]) => { x.fillStyle = '#a796c8'; x.fillRect(W * fx - 30 * s, cy - th * s, 60 * s, th * s); x.fillStyle = '#7d5fb8'; x.beginPath(); x.moveTo(W * fx - 38 * s, cy - th * s); x.lineTo(W * fx, cy - (th + 60) * s); x.lineTo(W * fx + 38 * s, cy - th * s); x.fill(); x.fillStyle = '#4a3a6a'; rr(x, W * fx - 9 * s, cy - (th - 40) * s, 18 * s, 28 * s, 9 * s); x.fill(); });
    x.fillStyle = '#8ccf6a'; x.fillRect(0, cy - 20 * s, W, 20 * s);
  } else {
    const s = Math.min(W, H);
    x.fillStyle = '#3a8ee6'; x.beginPath(); x.arc(W * .82, cy * .3, s * .08, 0, 7); x.fill();
    x.fillStyle = '#6fd36a'; x.beginPath(); x.arc(W * .8, cy * .28, s * .04, 0, 7); x.arc(W * .85, cy * .34, s * .025, 0, 7); x.fill();
    x.fillStyle = '#8f8aa8'; x.beginPath(); x.moveTo(0, cy); for (let i = 0; i <= 10; i++) x.lineTo(i / 10 * W, cy - 30 - Math.sin(i * 2.1) * 14); x.lineTo(W, cy); x.fill();
    x.fillStyle = '#76718f'; for (let i = 0; i < 6; i++) { x.beginPath(); x.ellipse((i * .19 + .05) * W, cy - 12, 22, 6, 0, 0, 7); x.fill(); }
  }
  // awning
  const aw = Math.max(18, H * 0.045), n = Math.ceil(W / 46);
  for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? '#fff4e0' : '#8b4fd1'; x.fillRect(i * 46, 0, 46, aw); x.beginPath(); x.arc(i * 46 + 23, aw, 23, 0, Math.PI); x.fill(); }
  // posts
  x.fillStyle = '#6b4226'; x.fillRect(4, 0, 10, cy); x.fillRect(W - 14, 0, 10, cy);
  // counter
  const wg = x.createLinearGradient(0, cy, 0, H); wg.addColorStop(0, '#a8683a'); wg.addColorStop(1, '#5c3418');
  x.fillStyle = wg; x.fillRect(0, cy, W, H - cy);
  x.fillStyle = '#c98a52'; x.fillRect(0, cy - 6, W, 12);
  x.strokeStyle = '#4a2a12'; x.lineWidth = 2; for (let yy = cy + 26; yy < H; yy += 26) { x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke(); }
  x.fillStyle = '#4a2a12'; for (let i = 1; i < 6; i++) { x.fillRect(i * W / 6, cy + 6, 2, H - cy); }
  bgCache = c;
}

// ingredient icons -----------------------------------------------------
function iconCanvas(c, ing, size) { const d = Math.min(2, window.devicePixelRatio || 1) * 1.5; c.width = c.height = Math.round(size * d); const x = c.getContext('2d'); x.scale(d, d); drawIcon(x, ing, size / 2, size / 2, size * 0.42, 0); }
function shade(hex, k) { const [r, gg, b] = hexRGB(hex); const f = v => clamp(Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)), 0, 255); return `rgb(${f(r)},${f(gg)},${f(b)})`; }
function drawIcon(x, ing, cx, cy, s, rot) {
  x.save(); x.translate(cx, cy); if (rot) x.rotate(rot);
  const c = ing.c, dk = shade(c, -0.45), lt = shade(c, 0.5);
  x.lineWidth = Math.max(1, s * 0.1); x.strokeStyle = 'rgba(20,10,30,.55)'; x.lineJoin = 'round';
  const fs = () => { x.fill(); x.stroke(); };
  x.fillStyle = c;
  switch (ing.sh) {
    case 'drop': x.beginPath(); x.moveTo(0, -s); x.bezierCurveTo(s * .2, -s * .5, s * .8, -s * .05, s * .8, s * .3); x.arc(0, s * .3, s * .8, 0, Math.PI); x.bezierCurveTo(-s * .8, -s * .05, -s * .2, -s * .5, 0, -s); fs(); x.fillStyle = lt; x.beginPath(); x.ellipse(-s * .3, s * .2, s * .14, s * .25, .3, 0, 7); x.fill(); break;
    case 'shroom': x.fillStyle = '#f3e3c3'; rr(x, -s * .28, -s * .1, s * .56, s * 1.0, s * .2); fs(); x.fillStyle = c; x.beginPath(); x.arc(0, 0, s * .95, Math.PI, 0); x.closePath(); fs(); x.fillStyle = '#fff'; [[-.5, -.35, .16], [.1, -.6, .14], [.5, -.25, .12]].forEach(([a, b, r]) => { x.beginPath(); x.arc(a * s, b * s, r * s, 0, 7); x.fill(); }); break;
    case 'pepper': x.beginPath(); x.moveTo(-s * .5, -s * .55); x.quadraticCurveTo(s * .9, -s * .7, s * .55, s * .2); x.quadraticCurveTo(s * .3, s * .9, -s * .1, s * .95); x.quadraticCurveTo(s * .1, s * .4, -s * .7, -s * .2); x.closePath(); fs(); x.strokeStyle = '#3c8a2a'; x.lineWidth = s * .2; x.beginPath(); x.moveTo(-s * .6, -s * .45); x.quadraticCurveTo(-s * .8, -s * .9, -s * .4, -s); x.stroke(); x.fillStyle = lt; x.beginPath(); x.ellipse(s * .15, -s * .3, s * .25, s * .08, .2, 0, 7); x.fill(); if (ing.id === 'gpep') { x.fillStyle = '#222'; x.beginPath(); x.arc(0, -s * .1, s * .09, 0, 7); x.arc(s * .3, -s * .05, s * .09, 0, 7); x.fill(); } break;
    case 'crystal': [[-.4, .2, .5, -.3], [.35, .25, .45, .3], [0, -.15, .6, 0]].forEach(([a, b, r, ro]) => { x.save(); x.translate(a * s, b * s); x.rotate(ro); x.fillStyle = c; x.beginPath(); x.moveTo(0, -r * s); x.lineTo(r * s * .6, 0); x.lineTo(0, r * s); x.lineTo(-r * s * .6, 0); x.closePath(); fs(); x.fillStyle = lt; x.beginPath(); x.moveTo(0, -r * s); x.lineTo(r * s * .3, 0); x.lineTo(0, 0); x.fill(); x.restore(); }); break;
    case 'hex': { const hx = (r, f) => { x.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); f(); }; hx(s * .95, fs); x.fillStyle = dk; x.globalAlpha = .45; hx(s * .5, () => x.fill()); x.globalAlpha = 1; x.fillStyle = lt; x.beginPath(); x.arc(-s * .35, -s * .35, s * .12, 0, 7); x.fill(); break; }
    case 'lemon': x.beginPath(); x.ellipse(0, 0, s * .9, s * .65, -.3, 0, 7); fs(); x.beginPath(); x.arc(s * .8, -s * .35, s * .13, 0, 7); fs(); x.fillStyle = lt; x.beginPath(); x.ellipse(-s * .3, -s * .2, s * .25, s * .1, -.3, 0, 7); x.fill(); break;
    case 'wing': for (const sg of [-1, 1]) { x.beginPath(); x.ellipse(sg * s * .45, -s * .15, s * .5, s * .7, sg * .6, 0, 7); fs(); x.fillStyle = dk; x.beginPath(); x.arc(sg * s * .5, -s * .2, s * .17, 0, 7); x.fill(); x.fillStyle = c; } x.fillStyle = '#4a3a2a'; rr(x, -s * .1, -s * .6, s * .2, s * 1.2, s * .1); x.fill(); break;
    case 'blob': x.beginPath(); for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI * 2, r = s * (.8 + .15 * Math.sin(i * 2.7)); x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); fs(); x.fillStyle = lt; x.beginPath(); x.arc(-s * .3, -s * .3, s * .18, 0, 7); x.fill(); if (ing.id === 'moss') { x.fillStyle = dk; [[.3, .1], [-.1, .35], [.1, -.4]].forEach(([a, b]) => { x.beginPath(); x.arc(a * s, b * s, s * .1, 0, 7); x.fill(); }); } break;
    case 'star': x.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? s * .45 : s; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); fs(); x.fillStyle = '#fff'; x.beginPath(); x.arc(-s * .15, -s * .15, s * .12, 0, 7); x.fill(); break;
    case 'egg': x.beginPath(); x.ellipse(0, s * .05, s * .65, s * .9, 0, 0, 7); fs(); x.fillStyle = '#c7d66a'; x.globalAlpha = .5; x.beginPath(); x.ellipse(0, s * .2, s * .55, s * .55, 0, 0, 7); x.fill(); x.globalAlpha = 1; x.fillStyle = lt; x.beginPath(); x.ellipse(-s * .25, -s * .35, s * .12, s * .2, 0, 0, 7); x.fill(); break;
    case 'sock': x.beginPath(); x.moveTo(-s * .4, -s); x.lineTo(s * .2, -s); x.lineTo(s * .2, s * .2); x.quadraticCurveTo(s * .95, s * .25, s * .9, s * .7); x.quadraticCurveTo(s * .8, s * .98, s * .1, s * .95); x.quadraticCurveTo(-s * .45, s * .9, -s * .4, s * .3); x.closePath(); fs(); x.fillStyle = '#e04a4a'; x.fillRect(-s * .38, -s * .75, s * .56, s * .15); x.fillRect(-s * .38, -s * .45, s * .56, s * .15); break;
    case 'jar': x.fillStyle = c; rr(x, -s * .65, -s * .55, s * 1.3, s * 1.45, s * .3); fs(); x.fillStyle = '#ffd24a'; rr(x, -s * .72, -s * .9, s * 1.44, s * .4, s * .1); fs(); x.fillStyle = '#fff6'; rr(x, -s * .45, -s * .3, s * .2, s * .9, s * .1); x.fill(); x.fillStyle = '#ffd24a'; x.beginPath(); x.moveTo(-s * .2, s * .1); x.lineTo(0, -s * .15); x.lineTo(s * .2, s * .1); x.lineTo(s * .3, -s * .05); x.lineTo(s * .25, s * .3); x.lineTo(-s * .25, s * .3); x.lineTo(-s * .3, -s * .05); x.closePath(); x.fill(); break;
    case 'sprig': x.strokeStyle = '#4a8a3a'; x.lineWidth = s * .14; x.beginPath(); x.moveTo(0, s); x.quadraticCurveTo(s * .2, 0, 0, -s); x.stroke(); x.lineWidth = Math.max(1, s * .08); x.strokeStyle = 'rgba(20,10,30,.45)'; for (let i = 0; i < 6; i++) { x.fillStyle = c; x.beginPath(); x.ellipse((i % 2 ? .22 : -.22) * s, (-.8 + i * .26) * s, s * .2, s * .14, 0, 0, 7); fs(); } break;
    case 'radish': x.fillStyle = '#4fae3a'; [-.35, 0, .35].forEach(a => { x.beginPath(); x.ellipse(a * s, -s * .65, s * .16, s * .38, a, 0, 7); fs(); }); x.fillStyle = c; x.beginPath(); x.arc(0, s * .1, s * .62, 0, 7); fs(); x.strokeStyle = '#fff'; x.lineWidth = s * .08; x.beginPath(); x.moveTo(0, s * .7); x.lineTo(s * .05, s); x.stroke(); x.fillStyle = '#ffe14a'; x.beginPath(); x.moveTo(s * .05, -s * .2); x.lineTo(-s * .2, s * .15); x.lineTo(0, s * .15); x.lineTo(-s * .1, s * .45); x.lineTo(s * .22, s * .02); x.lineTo(s * .02, s * .02); x.closePath(); x.fill(); break;
    case 'leaf': for (let i = 3; i >= 1; i--) { x.fillStyle = shade(c, -0.12 * i); x.beginPath(); for (let k = 0; k <= 12; k++) { const a = k / 12 * Math.PI * 2, r = s * (.3 + i * .22) * (1 + .1 * Math.sin(k * 3)); x.lineTo(Math.cos(a) * r, Math.sin(a) * r * .9); } x.closePath(); fs(); } break;
    case 'paper': x.fillStyle = c; x.beginPath(); x.moveTo(-s * .65, -s * .9); x.lineTo(s * .35, -s * .9); x.lineTo(s * .65, -s * .6); x.lineTo(s * .65, s * .9); x.lineTo(-s * .65, s * .9); x.closePath(); fs(); x.strokeStyle = ing.id === 'refund' ? '#2e6a1e' : '#9a937a'; x.lineWidth = s * .08; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(-s * .45, -s * .45 + i * s * .35); x.lineTo(s * .45, -s * .45 + i * s * .35); x.stroke(); } if (ing.id === 'refund') { x.fillStyle = '#2e6a1e'; x.font = `bold ${s * .8}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('$', 0, s * .15); } break;
    case 'cheese': x.beginPath(); x.moveTo(-s * .9, s * .6); x.lineTo(s * .9, s * .6); x.lineTo(s * .9, -s * .1); x.lineTo(-s * .9, s * .2); x.closePath(); fs(); x.fillStyle = shade(c, .4); x.beginPath(); x.moveTo(-s * .9, s * .2); x.lineTo(s * .9, -s * .1); x.lineTo(s * .4, -s * .6); x.closePath(); fs(); x.fillStyle = '#d9b84a'; [[-.4, .4], [.3, .3], [.6, .45]].forEach(([a, b]) => { x.beginPath(); x.arc(a * s, b * s, s * .1, 0, 7); x.fill(); }); break;
    case 'dust': for (let i = 0; i < 9; i++) { const a = i * 2.2, r = s * (.2 + i * .08); x.fillStyle = i % 2 ? c : '#fff'; x.beginPath(); x.arc(Math.cos(a) * r, Math.sin(a) * r, s * (.22 - i * .015), 0, 7); x.fill(); } x.fillStyle = '#ff8a4d'; x.beginPath(); x.arc(-s * .55, s * .5, s * .18, 0, 7); x.fill(); break;
    case 'bean': x.beginPath(); x.ellipse(0, 0, s * .55, s * .9, .4, 0, 7); fs(); x.fillStyle = '#fff'; x.beginPath(); x.ellipse(s * .05, -s * .1, s * .28, s * .2, 0, 0, 7); x.fill(); x.fillStyle = '#e04a4a'; x.beginPath(); x.arc(s * .1, -s * .1, s * .11, 0, 7); x.fill(); break;
    case 'yolk': x.fillStyle = '#fff'; x.beginPath(); for (let k = 0; k <= 10; k++) { const a = k / 10 * Math.PI * 2, r = s * (.85 + .12 * Math.sin(k * 2.3)); x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); fs(); x.fillStyle = c; x.beginPath(); x.arc(s * .05, 0, s * .45, 0, 7); fs(); x.fillStyle = '#fff8'; x.beginPath(); x.arc(-s * .08, -s * .13, s * .12, 0, 7); x.fill(); break;
    case 'cloud': x.beginPath(); x.arc(-s * .4, s * .1, s * .45, 0, 7); x.arc(s * .1, -s * .2, s * .55, 0, 7); x.arc(s * .5, s * .2, s * .4, 0, 7); fs(); x.fillStyle = '#ffd84a'; x.beginPath(); x.arc(s * .1, -s * .1, s * .2, 0, 7); x.fill(); break;
    default: x.beginPath(); x.arc(0, 0, s * .8, 0, 7); fs();
  }
  x.restore();
}

// customers -------------------------------------------------------------
const LOOK = {
  frog: { head: '#5cc85a', body: '#4aa848' }, snail: { head: '#f2c38b', body: '#e3a96b' }, shroom: { head: '#f6dfc0', body: '#c9b28a' }, bear: { head: '#9a6440', body: '#7d4f31' },
  knight: { head: '#f0c4a0', body: '#a9b3c2' }, kid: { head: '#ffd1b0', body: '#d43a4a' }, jester: { head: '#f2d0b0', body: '#7a4bc9' }, taster: { head: '#f0c4a0', body: '#2f3f7a' },
  astro: { head: '#e8b48f', body: '#eef1f7' }, rabbit: { head: '#f6f2ff', body: '#cfc6ef' }, alien: { head: '#7ef0a6', body: '#4fbf7d' }, ghost: { head: '#f4f6ff', body: '#f4f6ff' },
  keeper: { head: '#e8b896', body: '#ffcf33' }, goblin: { head: '#9cc274', body: '#f2f2f2' }, dragon: { head: '#ff8c3a', body: '#f07a2a' }, moon: { head: '#f3efd6', body: '#f3efd6' }, critic: { head: '#f2c9a8', body: '#1f1a2b' },
};
function drawCust(x, c, px, py, s, t, small) {
  const id = c.c.id, lk = LOOK[id], mood = c.mood;
  const bounce = mood === 'delight' ? Math.abs(Math.sin(t * 9)) * s * .18 : mood === 'spit' ? Math.sin(t * 40) * s * .04 : Math.sin(t * 2 + c.seed) * s * .03;
  py -= bounce;
  x.save(); x.lineJoin = 'round'; x.lineCap = 'round';
  const ol = 'rgba(25,12,40,.75)'; x.strokeStyle = ol; x.lineWidth = Math.max(1.5, s * .07);
  const fs = () => { x.fill(); x.stroke(); };
  // body
  if (id === 'ghost') {
    x.fillStyle = 'rgba(244,246,255,.93)'; x.beginPath(); x.arc(px, py, s * 1.05, Math.PI, 0);
    const bt = L.counterY + 8; x.lineTo(px + s * 1.25, bt); for (let i = 0; i <= 6; i++) x.lineTo(px + s * 1.25 - i * s * 2.5 / 6, bt - (i % 2 ? s * .25 : 0) + Math.sin(t * 4 + i) * 3); x.closePath(); fs();
  } else if (id === 'moon') {
    // the moon is all head
  } else {
    if (id === 'snail') { x.fillStyle = '#b8743a'; x.beginPath(); x.arc(px + s * 1.25, py + s * 1.3, s * .95, 0, 7); fs(); x.strokeStyle = '#7a4520'; x.lineWidth = s * .12; x.beginPath(); for (let a = 0; a < 12; a += .3) x.lineTo(px + s * 1.25 + Math.cos(a) * a * s * .07, py + s * 1.3 + Math.sin(a) * a * s * .07); x.stroke(); x.strokeStyle = ol; x.lineWidth = Math.max(1.5, s * .07); }
    if (id === 'dragon') { x.fillStyle = '#c95a1a'; for (const sg of [-1, 1]) { x.beginPath(); x.moveTo(px + sg * s * .8, py + s * 1.3); x.lineTo(px + sg * s * 2.0, py + s * .3); x.lineTo(px + sg * s * 1.7, py + s * 1.0); x.lineTo(px + sg * s * 2.1, py + s * 1.1); x.closePath(); fs(); } }
    x.fillStyle = lk.body; x.beginPath(); x.ellipse(px, py + s * 2.1, s * 1.35, s * 1.35, 0, Math.PI, 0); x.lineTo(px + s * 1.35, L.counterY + 10); x.lineTo(px - s * 1.35, L.counterY + 10); x.closePath(); fs();
    if (id === 'kid') { x.fillStyle = '#fff'; x.beginPath(); x.ellipse(px, py + s * .95, s * .95, s * .32, 0, 0, 7); fs(); x.fillStyle = '#222'; [-.5, 0, .5].forEach(a => x.fillRect(px + a * s - 2, py + s * .9, 4, 5)); }
    if (id === 'jester') { x.fillStyle = '#3fc27a'; x.beginPath(); x.moveTo(px, py + s * .8); x.lineTo(px + s * 1.35, py + s * 2.1); x.lineTo(px + s * 1.35, L.counterY + 10); x.lineTo(px, L.counterY + 10); x.closePath(); x.fill(); }
    if (id === 'goblin') { x.fillStyle = '#c22f4a'; x.beginPath(); x.moveTo(px - s * .15, py + s * .9); x.lineTo(px + s * .15, py + s * .9); x.lineTo(px + s * .1, py + s * 1.9); x.lineTo(px, py + s * 2.1); x.lineTo(px - s * .1, py + s * 1.9); x.closePath(); x.fill(); }
    if (id === 'taster') { x.fillStyle = '#ffd24a'; x.beginPath(); x.arc(px, py + s * 1.5, s * .12, 0, 7); x.arc(px, py + s * 1.9, s * .12, 0, 7); x.fill(); }
    if (id === 'astro') { x.fillStyle = '#5ab3ff'; rr(x, px - s * .4, py + s * 1.3, s * .8, s * .45, s * .1); x.fill(); x.fillStyle = '#ff6070'; x.beginPath(); x.arc(px - s * .2, py + s * 1.52, s * .07, 0, 7); x.fill(); }
  }
  // head back features
  if (id === 'bear') { x.fillStyle = lk.head; for (const sg of [-1, 1]) { x.beginPath(); x.arc(px + sg * s * .75, py - s * .72, s * .35, 0, 7); fs(); } }
  if (id === 'rabbit') { for (const sg of [-1, 1]) { x.fillStyle = lk.head; x.beginPath(); x.ellipse(px + sg * s * .42, py - s * 1.35, s * .26, s * .8, sg * .15, 0, 7); fs(); x.fillStyle = '#ffb6d3'; x.beginPath(); x.ellipse(px + sg * s * .42, py - s * 1.3, s * .12, s * .55, sg * .15, 0, 7); x.fill(); } }
  if (id === 'alien') { x.strokeStyle = '#3d9a5f'; x.lineWidth = s * .08; for (const sg of [-1, 1]) { x.beginPath(); x.moveTo(px + sg * s * .3, py - s * .9); x.quadraticCurveTo(px + sg * s * .5, py - s * 1.5, px + sg * s * .8, py - s * 1.6); x.stroke(); x.fillStyle = '#ff9ade'; x.beginPath(); x.arc(px + sg * s * .8, py - s * 1.6, s * .14, 0, 7); x.fill(); } x.strokeStyle = ol; x.lineWidth = Math.max(1.5, s * .07); }
  if (id === 'goblin') { x.fillStyle = lk.head; for (const sg of [-1, 1]) { x.beginPath(); x.moveTo(px + sg * s * .8, py - s * .2); x.lineTo(px + sg * s * 1.7, py - s * .55); x.lineTo(px + sg * s * .85, py + s * .25); x.closePath(); fs(); } }
  if (id === 'keeper') { x.fillStyle = '#ffcf33'; x.beginPath(); x.arc(px, py - s * .05, s * 1.22, 0, 7); fs(); }
  if (id === 'snail') { x.strokeStyle = '#c9925a'; x.lineWidth = s * .1; for (const sg of [-1, 1]) { x.beginPath(); x.moveTo(px + sg * s * .25, py - s * .6); x.lineTo(px + sg * s * .45, py - s * 1.5); x.stroke(); } x.strokeStyle = ol; x.lineWidth = Math.max(1.5, s * .07); }
  // head
  let eyeY = py - s * .08, eyeDX = s * .36, eyeR = s * .11, big = false, mouthY = py + s * .42, mw = s * .38;
  if (id === 'ghost') { /* head is the sheet */ }
  else if (id === 'frog') { x.fillStyle = lk.head; x.beginPath(); x.ellipse(px, py + s * .05, s * 1.15, s * .82, 0, 0, 7); fs(); for (const sg of [-1, 1]) { x.beginPath(); x.arc(px + sg * s * .52, py - s * .65, s * .36, 0, 7); fs(); } eyeY = py - s * .66; eyeDX = s * .52; big = true; mw = s * .6; mouthY = py + s * .3; }
  else if (id === 'moon') { const ms = s * 1.55; x.fillStyle = lk.head; x.beginPath(); x.arc(px, py + s * .2, ms, 0, 7); fs(); x.fillStyle = '#d8d2b0'; [[-.6, -.6, .25], [.55, -.4, .18], [.5, .55, .3], [-.65, .6, .15]].forEach(([a, b, r]) => { x.beginPath(); x.arc(px + a * ms, py + s * .2 + b * ms, r * ms, 0, 7); x.fill(); }); eyeY = py; eyeDX = s * .5; mouthY = py + s * .65; mw = s * .5; }
  else if (id === 'alien') { x.fillStyle = lk.head; x.beginPath(); x.ellipse(px, py, s * .9, s * 1.1, 0, 0, 7); fs(); }
  else if (id === 'kid') { x.fillStyle = lk.head; x.beginPath(); x.arc(px, py + s * .1, s * .88, 0, 7); fs(); eyeY = py + s * .05; mouthY = py + s * .45; }
  else { x.fillStyle = lk.head; x.beginPath(); x.arc(px, py, s, 0, 7); fs(); }
  // head front features
  if (id === 'shroom') { x.fillStyle = '#e2483d'; x.beginPath(); x.ellipse(px, py - s * .35, s * 1.45, s * 1.0, 0, Math.PI, 0); x.quadraticCurveTo(px, py - s * .1, px - s * 1.45, py - s * .35); fs(); x.fillStyle = '#fff'; [[-.8, -.75, .2], [0, -1.05, .22], [.75, -.7, .17], [-.25, -.55, .12]].forEach(([a, b, r]) => { x.beginPath(); x.arc(px + a * s, py + b * s, r * s, 0, 7); x.fill(); }); }
  if (id === 'bear') { x.fillStyle = '#d8b08a'; x.beginPath(); x.ellipse(px, py + s * .38, s * .45, s * .32, 0, 0, 7); x.fill(); x.fillStyle = '#2a1a10'; x.beginPath(); x.ellipse(px, py + s * .24, s * .14, s * .09, 0, 0, 7); x.fill(); mouthY = py + s * .5; mw = s * .25;
    x.fillStyle = '#5a6cff'; x.beginPath(); x.moveTo(px - s * .9, py - s * .5); x.quadraticCurveTo(px, py - s * 1.6, px + s * .9, py - s * .5); x.quadraticCurveTo(px + s * 1.4, py - s * 1.0, px + s * 1.3, py - s * .2); x.lineTo(px + s * .8, py - s * .55); x.closePath(); fs(); x.fillStyle = '#fff'; x.beginPath(); x.arc(px + s * 1.3, py - s * .15, s * .18, 0, 7); fs(); }
  if (id === 'knight') { x.fillStyle = '#b8c2d2'; x.beginPath(); x.arc(px, py - s * .05, s * 1.06, Math.PI * 1.05, Math.PI * 1.95); x.lineTo(px + s * 1.0, py + s * .35); x.lineTo(px + s * .7, py + s * .3); x.lineTo(px + s * .7, py - s * .35); x.lineTo(px - s * .7, py - s * .35); x.lineTo(px - s * .7, py + s * .3); x.lineTo(px - s * 1.0, py + s * .35); x.closePath(); fs(); x.fillStyle = '#ff4d5e'; x.beginPath(); x.moveTo(px, py - s * 1.05); x.quadraticCurveTo(px + s * .3, py - s * 1.9, px + s * 1.1, py - s * 1.6); x.quadraticCurveTo(px + s * .4, py - s * 1.3, px + s * .2, py - s * 1.0); x.closePath(); fs(); eyeY = py - s * .05; }
  if (id === 'kid') { x.fillStyle = '#ffd24a'; x.beginPath(); x.moveTo(px - s * 1.0, py - s * .45); x.lineTo(px - s * 1.1, py - s * 1.5); x.lineTo(px - s * .55, py - s * 1.0); x.lineTo(px, py - s * 1.7); x.lineTo(px + s * .55, py - s * 1.0); x.lineTo(px + s * 1.1, py - s * 1.5); x.lineTo(px + s * 1.0, py - s * .45); x.closePath(); fs(); x.fillStyle = '#ff4d8a'; x.beginPath(); x.arc(px, py - s * .8, s * .14, 0, 7); x.fill(); x.fillStyle = '#5ac8ff'; x.beginPath(); x.arc(px - s * .6, py - s * .75, s * .1, 0, 7); x.arc(px + s * .6, py - s * .75, s * .1, 0, 7); x.fill(); }
  if (id === 'jester') { for (const [sg, col] of [[-1, '#7a4bc9'], [1, '#3fc27a']]) { x.fillStyle = col; x.beginPath(); x.moveTo(px - s * .9 * (sg < 0 ? 1 : 0), py - s * .55); x.quadraticCurveTo(px + sg * s * 1.0, py - s * 1.9, px + sg * s * 1.7, py - s * .9); x.lineTo(px + sg * s * .1, py - s * .8); x.lineTo(px + s * .9 * (sg > 0 ? 1 : 0), py - s * .55); x.closePath(); fs(); x.fillStyle = '#ffd84a'; x.beginPath(); x.arc(px + sg * s * 1.7, py - s * .85, s * .17, 0, 7); fs(); } x.fillStyle = '#7a4bc9'; rr(x, px - s * 1.0, py - s * .7, s * 2, s * .32, s * .1); fs(); }
  if (id === 'taster') { x.fillStyle = '#fff'; rr(x, px - s * .6, py - s * 2.1, s * 1.2, s * 1.3, s * .3); fs(); x.beginPath(); x.ellipse(px, py - s * .82, s * .9, s * .25, 0, 0, 7); fs(); }
  if (id === 'astro') { x.strokeStyle = '#cfe8ff'; x.lineWidth = s * .12; x.fillStyle = 'rgba(160,210,255,.18)'; x.beginPath(); x.arc(px, py, s * 1.3, 0, 7); x.fill(); x.stroke(); x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = s * .1; x.beginPath(); x.arc(px, py, s * 1.1, Math.PI * 1.15, Math.PI * 1.45); x.stroke(); x.strokeStyle = ol; x.lineWidth = Math.max(1.5, s * .07); }
  if (id === 'goblin') { x.fillStyle = 'rgba(80,200,120,.75)'; x.beginPath(); x.moveTo(px - s * 1.0, py - s * .45); x.lineTo(px + s * 1.0, py - s * .45); x.lineTo(px + s * .8, py - s * .15); x.lineTo(px - s * .8, py - s * .15); x.closePath(); fs(); }
  if (id === 'keeper') { x.fillStyle = '#d9d9e0'; x.beginPath(); x.moveTo(px - s * .8, py + s * .2); x.quadraticCurveTo(px - s * .8, py + s * 1.3, px, py + s * 1.25); x.quadraticCurveTo(px + s * .8, py + s * 1.3, px + s * .8, py + s * .2); x.quadraticCurveTo(px, py + s * .5, px - s * .8, py + s * .2); fs(); mouthY = py + s * .38; }
  if (id === 'dragon') { x.fillStyle = '#ffb27a'; x.beginPath(); x.ellipse(px + s * .1, py + s * .45, s * .65, s * .4, 0, 0, 7); fs(); x.fillStyle = '#5a2a10'; x.beginPath(); x.arc(px - s * .1, py + s * .35, s * .06, 0, 7); x.arc(px + s * .3, py + s * .35, s * .06, 0, 7); x.fill(); x.fillStyle = '#fff4e0'; for (const sg of [-1, 1]) { x.beginPath(); x.moveTo(px + sg * s * .35, py - s * .85); x.lineTo(px + sg * s * .6, py - s * 1.4); x.lineTo(px + sg * s * .7, py - s * .75); x.closePath(); fs(); } mouthY = py + s * .62; if (Math.sin(t * 3 + c.seed) > .7 && !small) part('steam', px + s * .1, py + s * .3, rnd(-10, 10), -40, [120, 120, 120]); }
  if (id === 'critic') { x.fillStyle = '#b0203f'; x.beginPath(); x.ellipse(px - s * .1, py - s * .78, s * 1.05, s * .38, -.15, 0, 7); fs(); x.beginPath(); x.arc(px + s * .2, py - s * 1.12, s * .1, 0, 7); fs(); x.fillStyle = '#fff'; rr(x, px + s * 1.0, py + s * 1.2, s * .7, s * .9, s * .08); fs(); x.strokeStyle = '#999'; x.lineWidth = s * .05; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(px + s * 1.1, py + s * (1.45 + i * .2)); x.lineTo(px + s * 1.6, py + s * (1.45 + i * .2)); x.stroke(); } x.strokeStyle = ol; x.lineWidth = Math.max(1.5, s * .07); }
  if (id === 'snail') { for (const sg of [-1, 1]) { x.fillStyle = '#fff'; x.beginPath(); x.arc(px + sg * s * .45, py - s * 1.5, s * .22, 0, 7); fs(); } eyeY = py - s * 1.5; eyeDX = s * .45; big = true; }
  // face
  face(x, c, px, eyeY, eyeDX, eyeR, big, mouthY, mw, s, t);
  if (id === 'critic') { x.strokeStyle = '#1d1030'; x.lineWidth = s * .07; for (const sg of [-1, 1]) { x.beginPath(); x.arc(px + sg * eyeDX, eyeY, s * .22, 0, 7); x.stroke(); } x.beginPath(); x.moveTo(px - eyeDX + s * .22, eyeY); x.lineTo(px + eyeDX - s * .22, eyeY); x.stroke(); }
  if (id === 'goblin') { x.strokeStyle = '#2a2a2a'; x.lineWidth = s * .06; for (const sg of [-1, 1]) { x.beginPath(); x.arc(px + sg * eyeDX, eyeY, s * .24, 0, 7); x.stroke(); } }
  if (id === 'taster' && mood !== 'spit') { x.strokeStyle = '#ffd24a'; x.lineWidth = s * .06; x.beginPath(); x.arc(px + eyeDX, eyeY, s * .24, 0, 7); x.stroke(); x.strokeStyle = '#4a2a12'; x.lineWidth = s * .12; x.beginPath(); x.moveTo(px - s * .5, py + s * .3); x.quadraticCurveTo(px - s * .2, py + s * .15, px, py + s * .28); x.quadraticCurveTo(px + s * .2, py + s * .15, px + s * .5, py + s * .3); x.stroke(); }
  if (id === 'keeper' && mood !== 'delight') { x.fillStyle = '#6fd0ff'; const ty = eyeY + s * .2 + ((t * 0.6 + c.seed) % 1) * s * .5; x.beginPath(); x.arc(px - eyeDX, ty, s * .07, 0, 7); x.fill(); }
  x.restore();
}
function face(x, c, px, ey, edx, er, big, my, mw, s, t) {
  const mood = c.mood; const ink = '#1d1030';
  const blink = ((t + c.seed) % 3.4) < 0.12;
  const look = mood === 'wait' && S && S.pot.length ? s * .06 : 0;
  x.lineWidth = Math.max(1.5, s * .08); x.strokeStyle = ink; x.fillStyle = ink;
  for (const sg of [-1, 1]) {
    const ex = px + sg * edx;
    if (mood === 'delight') { x.beginPath(); x.arc(ex, ey + s * .05, s * .14, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); }
    else if (mood === 'spit') { x.beginPath(); x.moveTo(ex - s * .13 * sg, ey - s * .12); x.lineTo(ex + s * .1 * sg, ey); x.lineTo(ex - s * .13 * sg, ey + s * .12); x.stroke(); }
    else if (mood === 'polite') { if (big) { x.fillStyle = '#fff'; x.beginPath(); x.arc(ex, ey, s * .2, 0, 7); x.fill(); x.fillStyle = ink; } x.beginPath(); x.moveTo(ex - s * .13, ey + s * .02); x.lineTo(ex + s * .13, ey + s * .02); x.stroke(); x.beginPath(); x.arc(ex, ey + s * .04, s * .07, 0, Math.PI); x.fill(); }
    else {
      if (big) { x.fillStyle = '#fff'; x.beginPath(); x.arc(ex, ey, s * .2, 0, 7); x.fill(); x.fillStyle = ink; }
      if (blink) { x.beginPath(); x.moveTo(ex - s * .1, ey); x.lineTo(ex + s * .1, ey); x.stroke(); }
      else { x.beginPath(); x.arc(ex + look, ey, er * (big ? 1.05 : 1), 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(ex + look - er * .35, ey - er * .35, er * .35, 0, 7); x.fill(); x.fillStyle = ink; }
      if (mood === 'angry') { x.beginPath(); x.moveTo(ex - s * .18 * sg, ey - s * .3); x.lineTo(ex + s * .12 * sg, ey - s * .18); x.stroke(); }
    }
  }
  // cheeks
  if (mood === 'delight' || c.c.id === 'kid' || c.c.id === 'frog') { x.fillStyle = 'rgba(255,110,140,.45)'; for (const sg of [-1, 1]) { x.beginPath(); x.ellipse(px + sg * (edx + s * .12), ey + s * .32, s * .16, s * .09, 0, 0, 7); x.fill(); } }
  x.fillStyle = ink; x.strokeStyle = ink;
  if (mood === 'delight') { x.beginPath(); x.moveTo(px - mw, my - s * .06); x.quadraticCurveTo(px, my + s * .55, px + mw, my - s * .06); x.closePath(); x.fill(); x.fillStyle = '#ff7a9a'; x.beginPath(); x.ellipse(px, my + s * .15, mw * .45, s * .1, 0, 0, 7); x.fill(); }
  else if (mood === 'polite') { x.beginPath(); x.moveTo(px - mw * .7, my); for (let i = 1; i <= 4; i++) x.lineTo(px - mw * .7 + i * mw * .35, my + (i % 2 ? -1 : 1) * s * .05); x.stroke(); x.fillStyle = '#7fd0ff'; x.beginPath(); x.ellipse(px + edx + s * .35, ey - s * .1, s * .07, s * .12, 0, 0, 7); x.fill(); }
  else if (mood === 'spit') { x.fillStyle = 'rgba(120,200,90,.35)'; x.beginPath(); x.arc(px, ey + s * .2, s * .7, 0, 7); x.fill(); x.fillStyle = ink; x.beginPath(); x.ellipse(px + s * .1, my, s * .12, s * .1, 0, 0, 7); x.fill(); }
  else if (mood === 'angry') { x.beginPath(); x.arc(px, my + s * .15, mw * .7, Math.PI * 1.15, Math.PI * 1.85); x.stroke(); }
  else { x.beginPath(); x.arc(px, my - s * .12, mw * .6, Math.PI * .2, Math.PI * .8); x.stroke(); }
}

// particles -------------------------------------------------------------
const P = [], drops = [], floaters = [], texts = []; let wob = 0, shake = 0, bowl = null;
function part(type, x, y, vx, vy, col) { if (P.length > 320) P.shift(); P.push({ type, x, y, vx, vy, col, life: 0, max: type === 'steam' ? rnd(1.2, 2.2) : type === 'poof' ? rnd(.5, .9) : type === 'heart' ? 1.2 : type === 'coin' ? .9 : type === 'spark' ? rnd(.5, 1) : type === 'wisp' ? rnd(1.5, 2.5) : .8, r: rnd(.6, 1.2), a: rnd(0, 6) }); }
function burst(x, y, n) { for (let i = 0; i < n; i++) { const a = Math.random() * 7, v = rnd(80, 240); part('spark', x, y, Math.cos(a) * v, Math.sin(a) * v, [255, 216, 74]); } }
function peek(id) {
  const c = S && S.cur; if (!c || !c.arrived || c.done || c.rid.novel) return;
  const tg = IM[id].t, hate = c.hate || [];
  const bad = tg.find(t => hate.includes(t)), good = tg.find(t => c.rid.w.includes(t));
  if (bad) { floatText('uh oh', c.x + L.cs * .9, L.custY - L.cs * 1.3, '#ff8a8a'); c.mood = 'polite'; later(0.7, () => { if (!c.done) c.mood = 'wait'; }); }
  else if (good) { floatText(pick(['ooh!', 'oh?', 'yes...', 'mm!']), c.x + L.cs * .9, L.custY - L.cs * 1.3, '#9cff6a'); }
}
function floatText(t, x, y, col) { texts.push({ t, x: clamp(x, 70, W - 70), y, col, life: 0 }); }

// ---------------------------------------------------------------- loop
let last = performance.now(), T = 0;
function frame(now) {
  const dt = Math.max(0, Math.min(0.1, (now - last) / 1000)); last = now;
  if (!paused) { T += dt; update(dt); }
  draw(T);
  requestAnimationFrame(frame);
}
function update(dt) {
  if (!S) return;
  wob = Math.max(0, wob - dt * 2.5); shake = Math.max(0, shake - dt);
  if (bowl) { bowl.t += dt; if (bowl.t > 0.22) bowl = null; }
  S.playT += dt;
  for (let i = timers.length - 1; i >= 0; i--) { const tm = timers[i]; tm.t -= dt; if (tm.t <= 0) { timers.splice(i, 1); tm.fn(); } }
  // liquid colour
  for (let i = 0; i < 3; i++) S.liq[i] += (S.liqT[i] - S.liq[i]) * Math.min(1, dt * 5);
  // stirring
  if (S.stirT > 0) { S.stirT += dt; if (S.stirT > 0.65 || performance.now() - S.stirStart > 650) finishStir(); }
  if (S.phase === 'day') {
    const tut = !M.tut;
    if (!tut) {
      S.time -= dt;
      if (S.time <= 0 && !S.closing) { S.closing = true; S.time = 0; toast('closing time! last bowl.'); S.line.forEach(c => { c.leaving = true; c.small = true; c.mood = 'angry'; S.leaving.push(c); }); S.line = []; }
      if (!S.closing) { S.spawnT += dt * (!S.cur && !S.line.length ? 5 : 1); const iv = Math.max(4.5, 8.5 - S.day * .7); if (S.spawnT > iv && S.line.length < 2) { S.spawnT = 0; spawn(); if (!S.cur) advance(); } }
    }
    const c = S.cur;
    if (c) {
      c.tx = L.custX;
      if (!c.arrived) { c.x += (c.tx - c.x) * Math.min(1, dt * 12); if (Math.abs(c.x - c.tx) < 3) { c.arrived = true; updMain(); coachStep(); } }
      else if (!c.done && !tut) { c.pat -= dt * (S.stirT > 0 || S.soup ? 0.5 : 1); if (c.pat <= 0) walkout(c); }
      c.moodT += dt;
      $('#patFill').style.transform = `scaleX(${clamp(c.pat / c.maxPat, 0, 1)})`;
      $('#pat').classList.toggle('low', c.pat / c.maxPat < .3);
    }
    if (S.closing && !S.cur && !S.leaving.length) endDay();
    $('#timerFill').style.transform = `scaleX(${clamp(S.time / S.dayLen, 0, 1)})`;
    $('#timer').classList.toggle('low', S.time < 10);
  }
  for (let i = S.leaving.length - 1; i >= 0; i--) { const c = S.leaving[i]; if (c.small) { c.x += dt * W * 0.5; if (c.x > W + L.cs * 2) S.leaving.splice(i, 1); } else { c.x -= dt * W * 0.9; if (c.x < -L.cs * 3) S.leaving.splice(i, 1); } }
  S.line.forEach((c, i) => { c.x = W - L.cs * .8 - i * L.cs * 1.1; });
  if (S.phase === 'day' && S.day >= 3 && M.tut) for (let i = S.line.length - 1; i >= 0; i--) { const c = S.line[i]; c.pat -= dt * (0.25 + S.day * 0.06); if (c.pat <= 0) { S.line.splice(i, 1); c.leaving = true; c.small = true; c.mood = 'angry'; S.leaving.push(c); S.stats.walked++; floatText('got bored of the line', W - 80, L.counterY - L.cs * 1.4, '#ff9a9a'); } }
  // drops
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i]; d.vy += 900 * dt; d.y += d.vy * dt; d.rot += d.vr * dt;
    if (d.y > L.rimY) { drops.splice(i, 1); sfx('plop'); wob = 1; const col = hexRGB(IM[d.id].c); for (let k = 0; k < 12; k++) part('drop', d.x, L.rimY, rnd(-140, 140), rnd(-280, -120), S.liq); floaters.push({ id: d.id, a: rnd(0, 6), r: rnd(.2, .7) }); S.liqT = mixCol(S.pot); void col; peek(d.id); }
  }
  // ambient: steam + bubbles + flavour particles
  const R0 = L.R;
  if (Math.random() < dt * (S.pot.length ? 14 : 6)) part('steam', L.cx + rnd(-R0 * .6, R0 * .6), L.rimY - 4, rnd(-8, 8), rnd(-50, -30), [255, 255, 255]);
  if (S.soup) {
    const tp = S.soup.top;
    if (tp.includes('sparkly') && Math.random() < dt * 10) part('spark', L.cx + rnd(-R0 * .7, R0 * .7), L.rimY - rnd(0, R0 * .6), rnd(-20, 20), rnd(-60, -20), [255, 230, 120]);
    if (tp.includes('spooky') && Math.random() < dt * 4) part('wisp', L.cx + rnd(-R0 * .5, R0 * .5), L.rimY - 6, rnd(-10, 10), rnd(-40, -25), [180, 140, 255]);
    if (tp.includes('warm') && Math.random() < dt * 8) part('steam', L.cx + rnd(-R0 * .5, R0 * .5), L.rimY - 4, rnd(-6, 6), rnd(-70, -40), [255, 200, 170]);
    if (tp.includes('sleepy') && Math.random() < dt * 1.5) texts.push({ t: 'z', x: L.cx + rnd(-R0 * .4, R0 * .4), y: L.rimY - 10, col: '#c9ceff', life: 0, small: 1 });
  }
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i]; p.life += dt; if (p.life > p.max) { P.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.type === 'drop' || p.type === 'spray' || p.type === 'coin') p.vy += 700 * dt;
    if (p.type === 'steam' || p.type === 'wisp') p.x += Math.sin(p.life * 3 + p.a) * 12 * dt;
    if (p.type === 'heart') p.vy *= .98;
    if (p.type === 'spark' || p.type === 'poof') { p.vx *= .94; p.vy *= .94; }
  }
  for (let i = texts.length - 1; i >= 0; i--) { const t = texts[i]; t.life += dt; t.y -= dt * (t.small ? 25 : 40); if (t.life > (t.small ? 1.6 : 1.5)) texts.splice(i, 1); }
}

function draw(t) {
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (shake > 0) g.translate(Math.sin(t * 90) * shake * 10, Math.cos(t * 70) * shake * 6);
  buildBg(); g.drawImage(bgCache, 0, 0, W, H);
  const reg = bgRegion();
  if (reg !== 'castle') for (const s of stars) { if (reg === 'swamp' && s.y > L.counterY * .55) continue; g.globalAlpha = .4 + .4 * Math.sin(t * 2 + s.p); g.fillStyle = '#fff'; g.fillRect(s.x, s.y, s.r, s.r); }
  if (reg === 'swamp') for (const f of flies) { const fx = f.x + Math.sin(t * f.s + f.p) * 30, fy = f.y + Math.cos(t * f.s * 1.3 + f.p) * 18; g.globalAlpha = .5 + .5 * Math.sin(t * 3 + f.p); g.fillStyle = '#fff59a'; g.beginPath(); g.arc(fx, fy, 2.2, 0, 7); g.fill(); g.globalAlpha *= .3; g.beginPath(); g.arc(fx, fy, 6, 0, 7); g.fill(); }
  if (reg === 'castle') { g.fillStyle = '#ff4d5e'; [[.12, 230], [.5, 270], [.88, 230]].forEach(([fx, th]) => { const s = H / 600, bx = W * fx, by = L.counterY - (th + 60) * s; g.fillRect(bx - 1, by - 26 * s, 2, 26 * s); g.beginPath(); g.moveTo(bx, by - 26 * s); for (let i = 0; i <= 6; i++) g.lineTo(bx + i * 5 * s, by - 26 * s + Math.sin(t * 5 + i) * 2 * s); for (let i = 6; i >= 0; i--) g.lineTo(bx + i * 5 * s, by - 14 * s + Math.sin(t * 5 + i) * 2 * s); g.fill(); }); }
  g.globalAlpha = 1;
  if (!S) return;
  // decor behind
  if (S.decor.paint) { const fx = W * .5, fy = H * .14 + 10, fw = Math.min(70, W * .14), fh = fw * .75; g.fillStyle = '#6b4226'; g.fillRect(fx - fw / 2 - 5, fy - 5, fw + 10, fh + 10); g.fillStyle = '#2b5c8a'; g.fillRect(fx - fw / 2, fy, fw, fh); g.fillStyle = '#fff'; g.fillRect(fx - 4, fy + fh * .25, 8, fh * .6); g.fillStyle = '#ff4d5e'; g.fillRect(fx - 4, fy + fh * .45, 8, fh * .12); g.fillStyle = '#ffd84a'; g.globalAlpha = .5 + .5 * Math.sin(t * 2); g.beginPath(); g.moveTo(fx, fy + fh * .25); g.lineTo(fx + fw / 2, fy + fh * .1); g.lineTo(fx + fw / 2, fy + fh * .4); g.fill(); g.globalAlpha = 1; }
  if (S.decor.scope) { const sx = W - 30, sy = L.counterY; g.strokeStyle = '#6b4226'; g.lineWidth = 3; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - 10, sy - 40); g.moveTo(sx, sy); g.lineTo(sx + 8, sy - 40); g.stroke(); g.save(); g.translate(sx - 2, sy - 44); g.rotate(-.7); g.fillStyle = '#c9a24a'; rr(g, -26, -6, 52, 12, 5); g.fill(); g.restore(); }
  // queue (behind)
  S.line.forEach(c => drawCust(g, c, c.x, L.counterY - L.cs * .55, L.cs * .45, t, true));
  S.leaving.forEach(c => c.small ? drawCust(g, c, c.x, L.counterY - L.cs * .55, L.cs * .45, t, true) : drawCust(g, c, c.x, L.custY, L.cs, t));
  if (S.cur) drawCust(g, S.cur, S.cur.x, L.custY, L.cs, t);
  // counter top edge redraw over bodies
  g.drawImage(bgCache, 0, (L.counterY - 6) * DPR, W * DPR, (H - L.counterY + 6) * DPR, 0, L.counterY - 6, W, H - L.counterY + 6);
  // decor on counter
  if (S.decor.candle) { const x = W * .08 + 6, y = L.counterY - 4; g.fillStyle = '#e8e0ff'; rr(g, x - 6, y - 26, 12, 26, 3); g.fill(); g.fillStyle = '#8dffcf'; g.beginPath(); g.ellipse(x, y - 32 + Math.sin(t * 9) * 1.5, 4, 8, 0, 0, 7); g.fill(); g.globalAlpha = .25; g.beginPath(); g.arc(x, y - 32, 16, 0, 7); g.fill(); g.globalAlpha = 1; }
  if (S.decor.spike) { const x = W * .44, y = L.counterY - 4; g.fillStyle = '#555'; g.fillRect(x - 1, y - 30, 2, 30); g.fillStyle = '#f4f1e4'; for (let i = 0; i < 3; i++) { g.save(); g.translate(x, y - 8 - i * 7); g.rotate((i - 1) * .3); g.fillRect(-9, -4, 18, 8); g.restore(); } }
  if (S.decor.plush) { const x = Math.min(W - 26, L.cx + L.R * 1.25), y = L.counterY - 12; g.fillStyle = '#7ad36a'; g.beginPath(); g.arc(x, y, 12, 0, 7); g.arc(x + 8, y - 12, 8, 0, 7); g.fill(); g.fillStyle = '#1d1030'; g.beginPath(); g.arc(x + 10, y - 13, 1.8, 0, 7); g.fill(); }
  drawCauldron(t);
  if (bowl) { const k = bowl.t / 0.22, x1 = bowl.c.x + L.cs * .2, y1 = L.custY + L.cs * .5, bx = bowl.x0 + (x1 - bowl.x0) * k, by = bowl.y0 + (y1 - bowl.y0) * k - Math.sin(k * Math.PI) * L.R * .9, bs = L.R * .28; g.fillStyle = `rgb(${bowl.col.join(',')})`; g.beginPath(); g.ellipse(bx, by, bs, bs * .3, 0, 0, 7); g.fill(); g.fillStyle = '#fff4e0'; g.strokeStyle = '#1d1030'; g.lineWidth = 2; g.beginPath(); g.moveTo(bx - bs * 1.1, by); g.quadraticCurveTo(bx, by + bs * 1.3, bx + bs * 1.1, by); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#8b4fd1'; g.fillRect(bx - bs * .7, by + bs * .25, bs * 1.4, bs * .14); }
  // particles
  for (const p of P) {
    const k = p.life / p.max, col = p.col;
    if (p.type === 'steam') { g.globalAlpha = .28 * (1 - k); g.fillStyle = `rgb(${col.join(',')})`; g.beginPath(); g.arc(p.x, p.y, 6 + k * 18, 0, 7); g.fill(); }
    else if (p.type === 'poof') { g.globalAlpha = .7 * (1 - k); g.fillStyle = '#fff'; g.beginPath(); g.arc(p.x, p.y, 4 + k * 16, 0, 7); g.fill(); }
    else if (p.type === 'wisp') { g.globalAlpha = .5 * (1 - k); g.strokeStyle = '#b48cff'; g.lineWidth = 3; g.beginPath(); g.arc(p.x, p.y, 8, p.a + k * 6, p.a + k * 6 + 2.5); g.stroke(); }
    else if (p.type === 'drop' || p.type === 'spray') { g.globalAlpha = 1 - k * .6; g.fillStyle = `rgb(${col.map(Math.round).join(',')})`; g.beginPath(); g.arc(p.x, p.y, (p.type === 'spray' ? 4 : 3.5) * p.r, 0, 7); g.fill(); }
    else if (p.type === 'spark') { g.globalAlpha = 1 - k; g.fillStyle = '#ffe680'; star(g, p.x, p.y, 5 * p.r * (1 - k * .5)); }
    else if (p.type === 'heart') { g.globalAlpha = 1 - k; g.fillStyle = '#ff6e9e'; heart(g, p.x, p.y, 7 * p.r); }
    else if (p.type === 'coin') { g.globalAlpha = 1 - k * .5; g.fillStyle = '#ffc21a'; g.beginPath(); g.ellipse(p.x, p.y, 5, 5 * Math.abs(Math.cos(p.life * 10)), 0, 0, 7); g.fill(); g.strokeStyle = '#b27800'; g.lineWidth = 1; g.stroke(); }
  }
  g.globalAlpha = 1;
  for (const tx of texts) { const k = tx.life / 1.5; g.globalAlpha = 1 - k * k; g.font = `bold ${tx.small ? 16 : 20}px "Trebuchet MS",sans-serif`; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = '#1d1030'; { const hw = g.measureText(tx.t).width / 2 + 6; tx.x = clamp(tx.x, hw, Math.max(hw, W - hw)); } g.strokeText(tx.t, tx.x, tx.y); g.fillStyle = tx.col; g.fillText(tx.t, tx.x, tx.y); }
  g.globalAlpha = 1;
  if (SHOT) drawTitle(t);
}
function star(x, cx, cy, r) { x.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr2 = i % 2 ? r * .35 : r; x.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2); } x.closePath(); x.fill(); }
function heart(x, cx, cy, s) { x.beginPath(); x.moveTo(cx, cy + s * .8); x.bezierCurveTo(cx - s * 1.4, cy - s * .2, cx - s * .5, cy - s * 1.1, cx, cy - s * .35); x.bezierCurveTo(cx + s * .5, cy - s * 1.1, cx + s * 1.4, cy - s * .2, cx, cy + s * .8); x.fill(); }
function drawCauldron(t) {
  const { cx, cy, R, rimY } = L;
  g.save();
  if (wob > 0.01) { const k = Math.sin(t * 30) * wob * 0.06; g.translate(cx, cy + R * .9); g.scale(1 + k, 1 - k); g.translate(-cx, -(cy + R * .9)); }
  const liq = S.liq.map(Math.round), lc = `rgb(${liq.join(',')})`;
  // fire
  for (let i = 0; i < 7; i++) { const fx = cx - R * .55 + i * R * .18, fh = R * (.35 + .15 * Math.sin(t * 12 + i * 1.7)); g.fillStyle = i % 2 ? '#ff8a1f' : '#ffd23a'; g.beginPath(); g.moveTo(fx - R * .12, cy + R * .75); g.quadraticCurveTo(fx, cy + R * .75 - fh * 1.6, fx + R * .12, cy + R * .75); g.fill(); }
  g.fillStyle = '#3a2614'; rr(g, cx - R * .8, cy + R * .78, R * 1.6, R * .14, R * .06); g.fill();
  // glow
  const gl = g.createRadialGradient(cx, rimY, R * .2, cx, rimY, R * 1.6); gl.addColorStop(0, `rgba(${liq.join(',')},.35)`); gl.addColorStop(1, `rgba(${liq.join(',')},0)`); g.fillStyle = gl; g.fillRect(cx - R * 1.6, rimY - R * 1.6, R * 3.2, R * 3.2);
  // legs
  g.fillStyle = '#1b1426'; for (const sg of [-1, 1]) { g.beginPath(); g.moveTo(cx + sg * R * .55, cy + R * .55); g.lineTo(cx + sg * R * .75, cy + R * .95); g.lineTo(cx + sg * R * .5, cy + R * .95); g.closePath(); g.fill(); }
  // pot body
  const pg = g.createRadialGradient(cx - R * .35, cy - R * .2, R * .1, cx, cy, R * 1.1); pg.addColorStop(0, '#5a4a72'); pg.addColorStop(.6, '#2b2238'); pg.addColorStop(1, '#151020');
  g.fillStyle = pg; g.beginPath(); g.ellipse(cx, cy, R, R * .85, 0, 0, 7); g.fill();
  g.strokeStyle = '#120c1c'; g.lineWidth = 3; g.stroke();
  // band
  g.strokeStyle = '#4a3c62'; g.lineWidth = R * .07; g.beginPath(); g.ellipse(cx, cy - R * .05, R * .97, R * .3, 0, .15, Math.PI - .15); g.stroke();
  // slot pips on the pot
  const n = cap(); for (let i = 0; i < n; i++) { const px = cx + (i - (n - 1) / 2) * R * .26, py = cy + R * .38; g.fillStyle = i < S.pot.length ? lc : '#1b1426'; g.strokeStyle = '#7a6a9a'; g.lineWidth = 2; g.beginPath(); g.arc(px, py, R * .08, 0, 7); g.fill(); g.stroke(); }
  // rim
  g.fillStyle = '#3d3150'; g.beginPath(); g.ellipse(cx, rimY, R * .98, R * .27, 0, 0, 7); g.fill();
  g.strokeStyle = '#6a5a88'; g.lineWidth = 3; g.stroke();
  // liquid
  g.save(); g.beginPath(); g.ellipse(cx, rimY + R * .02, R * .86, R * .2, 0, 0, 7); g.clip();
  g.fillStyle = lc; g.fillRect(cx - R, rimY - R * .3, R * 2, R * .6);
  g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.ellipse(cx - R * .25, rimY - R * .06, R * .4, R * .06, 0, 0, 7); g.fill();
  // swirl while stirring
  if (S.stirT > 0 || S.soup) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; const sp = S.stirT > 0 ? t * 12 : t * 1.5; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(cx, rimY + R * .02, R * (.25 + k * .2), R * (.05 + k * .045), 0, sp + k, sp + k + 2.2); g.stroke(); } }
  // bubbles
  for (let i = 0; i < 6; i++) { const ph = (t * (.6 + i * .13) + i * .37) % 1, bx = cx + Math.sin(i * 7.3) * R * .6, by = rimY + R * .02 + Math.cos(i * 3.1) * R * .1, br = Math.max(0, R * .06 * ph); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5; g.beginPath(); g.arc(bx, by, br, 0, 7); g.stroke(); }
  // floating ingredient bits
  floaters.forEach((f, i) => { const a = f.a + t * .6, fx = cx + Math.cos(a) * R * .55 * f.r * 1.3, fy = rimY + R * .02 + Math.sin(a) * R * .1 + Math.sin(t * 3 + i) * 2; drawIcon(g, IM[f.id], fx, fy, R * .15, Math.sin(t + i) * .5); });
  g.restore();
  // ladle
  const st = S.stirT > 0; const ang = st ? t * 14 : Math.sin(t * .8) * .2 - .4;
  const lx = cx + Math.cos(ang) * R * (st ? .45 : .35), ly = rimY + Math.sin(ang) * R * .1;
  g.strokeStyle = '#8a5a30'; g.lineWidth = Math.max(4, R * .09); g.lineCap = 'round'; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + R * .55, ly - R * 1.05); g.stroke();
  g.strokeStyle = '#5a3a1a'; g.lineWidth = 2; g.stroke();
  // falling drops
  g.restore();
  drops.forEach(d => drawIcon(g, IM[d.id], d.x, d.y, R * .2, d.rot));
}
function drawTitle(t) {
  const s = Math.min(W / 640, H / 360) * 1.0;
  g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
  const x = W * .5, y = H * .2;
  g.font = `bold ${64 * s}px "Trebuchet MS",sans-serif`; g.lineWidth = 12 * s; g.strokeStyle = '#1d1030'; g.lineJoin = 'round';
  g.strokeText('soup witch', x, y); const tg = g.createLinearGradient(0, y - 30 * s, 0, y + 30 * s); tg.addColorStop(0, '#d6ff9a'); tg.addColorStop(1, '#5fdc4a'); g.fillStyle = tg; g.fillText('soup witch', x, y);
  // hat on the w
  const hx = x + 70 * s, hy = y - 40 * s; g.fillStyle = '#3b2468'; g.strokeStyle = '#1d1030'; g.lineWidth = 4 * s; g.beginPath(); g.moveTo(hx - 34 * s, hy); g.lineTo(hx + 8 * s, hy - 62 * s); g.quadraticCurveTo(hx + 26 * s, hy - 70 * s, hx + 34 * s, hy - 52 * s); g.lineTo(hx + 18 * s, hy - 46 * s); g.lineTo(hx + 26 * s, hy); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.ellipse(hx - 4 * s, hy, 46 * s, 9 * s, -.08, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#ffd84a'; g.fillRect(hx - 24 * s, hy - 12 * s, 40 * s, 7 * s);
  g.font = `bold ${18 * s}px "Trebuchet MS",sans-serif`; g.lineWidth = 5 * s; g.strokeText('a computer cooked game', x, y + 46 * s); g.fillStyle = '#fff4c9'; g.fillText('a computer cooked game', x, y + 46 * s);
  g.restore();
}

// ---------------------------------------------------------------- share
function drawShare(c, score) {
  const x = c.getContext('2d'), w = c.width, h = c.height;
  const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1b2350'); gr.addColorStop(.6, '#4b3a78'); gr.addColorStop(1, '#d9716b'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * .6})`; x.fillRect(Math.random() * w, Math.random() * h * .6, 2, 2); }
  x.textAlign = 'center'; x.lineJoin = 'round';
  x.font = 'bold 64px "Trebuchet MS",sans-serif'; x.lineWidth = 12; x.strokeStyle = '#1d1030'; x.strokeText('soup witch', w / 2, 92); x.fillStyle = '#9cff6a'; x.fillText('soup witch', w / 2, 92);
  const wd = S.weird || { name: 'hot water', col: [90, 130, 170], top: [] };
  // bowl
  const bx = w / 2, by = 312; x.fillStyle = `rgb(${wd.col.join(',')})`; x.beginPath(); x.ellipse(bx, by - 30, 170, 36, 0, 0, 7); x.fill();
  x.fillStyle = '#fff4e0'; x.beginPath(); x.moveTo(bx - 190, by - 30); x.quadraticCurveTo(bx - 180, by + 120, bx, by + 120); x.quadraticCurveTo(bx + 180, by + 120, bx + 190, by - 30); x.closePath(); x.fill(); x.strokeStyle = '#1d1030'; x.lineWidth = 6; x.stroke();
  x.fillStyle = '#8b4fd1'; x.fillRect(bx - 150, by + 20, 300, 14);
  for (let i = 0; i < 5; i++) { x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 6; x.beginPath(); x.moveTo(bx - 80 + i * 40, by - 70); x.quadraticCurveTo(bx - 100 + i * 40, by - 110, bx - 80 + i * 40, by - 150); x.stroke(); }
  x.font = 'bold 22px "Trebuchet MS",sans-serif'; x.fillStyle = '#fff4c9'; x.fillText('my weirdest soup:', w / 2, 168);
  let fsz = 40; x.font = `bold ${fsz}px "Trebuchet MS",sans-serif`; while (x.measureText(wd.name).width > w - 60 && fsz > 20) { fsz -= 2; x.font = `bold ${fsz}px "Trebuchet MS",sans-serif`; }
  x.lineWidth = 8; x.strokeStyle = '#1d1030'; x.strokeText(wd.name, w / 2, 212); x.fillStyle = '#ffd84a'; x.fillText(wd.name, w / 2, 212);
  x.font = 'bold 30px "Trebuchet MS",sans-serif'; x.fillStyle = '#fff'; x.lineWidth = 6; const l1 = score + ' coins in ' + Math.min(S.day, SEASON_DAYS) + ' days';
  { const n = starsFor(score, S.region); for (let i = 0; i < 3; i++) { x.fillStyle = i < n ? '#ffd84a' : 'rgba(255,255,255,.25)'; x.strokeStyle = '#1d1030'; x.lineWidth = 4; const sx = w / 2 + (i - 1) * 56, sy = 462; x.beginPath(); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 - Math.PI / 2, r = k % 2 ? 10 : 24; x.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); } x.closePath(); x.fill(); x.stroke(); } x.fillStyle = '#fff'; x.lineWidth = 6; } x.strokeText(l1, w / 2, 512); x.fillText(l1, w / 2, 512);
  x.font = 'bold 22px "Trebuchet MS",sans-serif'; const l2 = 'recipe book ' + Object.keys(M.book).length + '/' + NREC; x.strokeText(l2, w / 2, 552); x.fillText(l2, w / 2, 552);
  x.font = 'bold 20px "Trebuchet MS",sans-serif'; x.fillStyle = '#9cff6a'; x.strokeText('computercooked.com/games/soup-witch', w / 2, 608); x.fillText('computercooked.com/games/soup-witch', w / 2, 608);
}
async function share(score) {
  const wd = S.weird ? S.weird.name : 'hot water';
  const text = `i ran a soup cart for ${Math.min(S.day, SEASON_DAYS)} days and earned ${score} coins. my weirdest soup: "${wd}". computercooked.com/games/soup-witch`;
  try {
    if (navigator.share) {
      let files = null;
      try { const blob = await new Promise(r => $('#shareCv').toBlob(r, 'image/png')); if (blob) files = [new File([blob], 'soup-witch.png', { type: 'image/png' })]; } catch (e) { }
      if (files && navigator.canShare && navigator.canShare({ files })) await navigator.share({ text, files }); else await navigator.share({ text });
      return;
    }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text); toast('copied. go brag.'); } catch (e) { toast('could not copy. tell them yourself.'); }
}

// ---------------------------------------------------------------- pause / input / host
function setPaused(p, quiet) {
  if (!S) return; paused = !!p;
  if (paused) stopAll();
  $('#pauseOv').classList.toggle('hide', !paused || !!quiet || modalOpen);
}
$('#pauseOv').addEventListener('pointerdown', () => setPaused(false));
document.addEventListener('visibilitychange', () => { if (document.hidden && S && S.phase === 'day' && !modalOpen) setPaused(true); });
$('#mainBtn').addEventListener('click', () => { initAudio(); mainAction(); });
$('#dumpBtn').addEventListener('click', () => { initAudio(); dump(); });
$('#bookBtn').addEventListener('click', () => { initAudio(); if (modalOpen) return; showBook(); });
$('#pauseBtn').addEventListener('click', () => { initAudio(); if (S && S.phase === 'day' && !modalOpen) setPaused(!paused); });
$('#muteBtn').addEventListener('click', () => { initAudio(); M.mute = !M.mute; save(); muteIcon(); if (M.mute) stopAll(); });
function isAct(e) { return e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space' || e.keyCode === 13 || e.keyCode === 32; }
let actDown = false;
function actKey() {
  if (modalOpen) { const nb = $('#nextDay') || $('#bClose'); if (nb) nb.click(); return; }
  if (paused) { setPaused(false); return; }
  mainAction();
}
document.addEventListener('keyup', e => { if (!isAct(e)) return; e.preventDefault(); if (!actDown) { initAudio(); actKey(); } actDown = false; });
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button'); if (b && !modalOpen) b.blur(); }, true);
document.addEventListener('keydown', e => {
  if (isAct(e)) { e.preventDefault(); if (e.repeat) return; actDown = true; initAudio(); actKey(); return; }
  initAudio();
  const k = (e.key || '').toLowerCase();
  if (k === 'm') { $('#muteBtn').click(); return; }
  if (modalOpen) {
    if (k === 'escape') { const b = $('#bClose'); if (b) b.click(); }
    return;
  }
  if (k === 'p') { setPaused(!paused); return; }
  if (paused) { setPaused(false); return; }
  if (k === 'backspace' || k === 'delete' || k === 'escape') { e.preventDefault(); dump(); return; }
  if (k === 'b') { showBook(); return; }
  const i = KEYS.indexOf(k); if (i >= 0 && S) { const l = ownedList(); if (l[i]) addIng(l[i].id); }
});
window.addEventListener('message', e => {
  const d = e.data; if (!d || typeof d !== 'object') return;
  if (d.type === 'cc-mute') { hostMuted = !!d.muted; muteIcon(); if (hostMuted) stopAll(); }
  else if (d.type === 'cc-pause') { setPaused(d.paused === undefined ? true : !!d.paused); }
  else if (d.type === 'cc-restart') { closeModal(); paused = false; ccStarted = false; $('#pauseOv').classList.add('hide'); newSeason(M.region); }
});
window.addEventListener('resize', () => layout());
document.addEventListener('pointerdown', () => initAudio(), { once: true });

// ---------------------------------------------------------------- test hooks
if (TEST) window.__sw = {
  state: () => ({ day: S.day, coins: S.coins, earned: S.earned, phase: S.phase, time: S.time, pot: S.pot.slice(), soup: S.soup && S.soup.name, cur: S.cur && { id: S.cur.c.id, w: S.cur.rid.w, h: S.cur.hate || [], novel: !!S.cur.rid.novel, arrived: S.cur.arrived, done: !!S.cur.done }, line: S.line.length, owned: Object.assign({}, S.owned), stats: Object.assign({}, S.stats), book: Object.keys(M.book).length, nrec: NREC, regions: M.regions.slice(), modal: modalOpen, P: P.length }),
  coins: n => { S.coins = n; updTop(); }, day: n => { S.day = n; updTop(); }, time: n => { S.time = n; },
  unlockAll: () => { M.regions = REGIONS.map(r => r.id); ING.forEach(g => { S.owned[g.id] = g.r === 'rare' ? 3 : true; M.known[g.id] = 1; }); Object.assign(S.upg, { big: 1, spoon: 1 }); buildShelf(); },
  serve: tags => { const ids = []; tags.forEach(t => { const ig = ING.find(x => x.t[0] === t && !x.st) || ING.find(x => x.t.includes(t)); ids.push(ig.id); }); S.pot = ids; S.soup = resolve(ids); S.stirT = 0; serve(); },
  make: ids => { S.soup = null; S.pot = []; ids.forEach(id => { S.owned[id] = S.owned[id] || true; }); ids.forEach(id => { S.pot.push(id); }); finishStir(); return S.soup && S.soup.name; },
  resolve: ids => { const s = resolve(ids); return { name: s.name, id: s.rec.id, top: s.top }; },
  allRecipes: () => RECIPES.map(r => r.id),
  data: () => ({ ING: ING.map(g => ({ id: g.id, t: g.t, r: g.r, st: g.st || 0 })), cap: cap() }),
  step: sec => { for (let i = 0; i < sec * 20; i++) update(0.05); },
  night: () => { S.time = 0; S.closing = true; S.cur = null; S.line = []; S.leaving = []; endDay(); },
  endSeason: () => { S.day = SEASON_DAYS; S.time = 0; S.closing = true; S.cur = null; S.line = []; S.leaving = []; closeModal(); endDay(); },
  click: sel => { const e = $(sel); if (e) e.click(); return !!e; },
  M: () => M,
  bench: n => { const t0 = performance.now(); for (let i = 0; i < n; i++) draw(T + i * .016); return (performance.now() - t0) / n; },
};

// ---------------------------------------------------------------- boot
function boot() {
  muteIcon();
  if (SHOT) {
    document.body.classList.add('shot'); M.tut = true; nosave = true;
    layout();
    S = { day: 3, coins: 0, earned: 0, region: 'swamp', owned: {}, upg: {}, decor: { candle: 1, plush: 1 }, pot: ['ecto', 'sugar', 'lemon'], soup: null, stirT: 0, cur: null, line: [], leaving: [], spawnT: 0, time: 50, dayLen: 70, closing: false, phase: 'shot', streak: 0, stats: {}, made: [], playT: 0 };
    S.soup = resolve(S.pot); S.liq = S.soup.col.slice(); S.liqT = S.soup.col.slice();
    S.pot.forEach(id => floaters.push({ id, a: rnd(0, 6), r: rnd(.3, .7) }));
    S.cur = { c: CM.ghost, ri: 2, rid: CM.ghost.rid[2], x: L.custX, tx: L.custX, mood: 'delight', moodT: 0, pat: 1, maxPat: 1, arrived: true, seed: 1 };
    S.line = [{ c: CM.frog, ri: 0, rid: CM.frog.rid[0], x: 0, mood: 'wait', seed: 2 }, { c: CM.dragon, ri: 0, rid: CM.dragon.rid[0], x: 0, mood: 'wait', seed: 3 }];
    setInterval(() => { if (S.cur) for (let i = 0; i < 2; i++) part('heart', S.cur.x + rnd(-30, 30), L.custY - L.cs, rnd(-40, 40), rnd(-120, -60)); }, 300);
    requestAnimationFrame(frame); return;
  }
  layout();
  newSeason(M.region);
  requestAnimationFrame(frame);
  if (!M.tut) coachStep();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
