/* overdue notice — game rules and economy. no DOM in here (the view lives in game.js). */
(function (root) {
  'use strict';

  // ---------- content ----------
  const BILLS = [
    { id: 'wifi', name: 'wi-fi', icon: '📶', unlock: 1, period: 1, base: 12, share: 0.06, due: 0.32, w: 1.0, util: 'wifi' },
    { id: 'rent', name: 'rent', icon: '🏠', unlock: 1, period: 1, base: 45, share: 0.2, due: 0.84, w: 2.0 },
    { id: 'phone', name: 'phone', icon: '📱', unlock: 2, period: 1, base: 18, share: 0.05, due: 0.48, w: 1.0, util: 'phone' },
    { id: 'stream', name: 'streamflix', icon: '📺', unlock: 2, period: 1, base: 8, share: 0.02, due: 0.66, w: 0.4, sub: true },
    { id: 'power', name: 'electricity', icon: '💡', unlock: 3, period: 1, base: 26, share: 0.06, due: 0.58, w: 1.0, util: 'power' },
    { id: 'gym', name: 'gym (been twice)', icon: '🏋️', unlock: 3, period: 1, base: 10, share: 0.02, due: 0.4, w: 0.4, sub: true },
    { id: 'music', name: 'music app', icon: '🎧', unlock: 3, period: 1, base: 6, share: 0.015, due: 0.75, w: 0.4, sub: true },
    { id: 'loan', name: 'student loan', icon: '🎓', unlock: 4, period: 1, base: 70, share: 0.08, due: 0.55, w: 1.1 },
    { id: 'cloud', name: 'cloud storage (memes)', icon: '☁️', unlock: 4, period: 1, base: 5, share: 0.012, due: 0.3, w: 0.4, sub: true },
    { id: 'card', name: 'credit card minimum', icon: '💳', unlock: 5, period: 1, base: 60, share: 0.07, due: 0.36, w: 1.1 },
    { id: 'forgot', name: 'app you forgot about', icon: '❓', unlock: 5, period: 1, base: 7, share: 0.012, due: 0.7, w: 0.4, sub: true },
    { id: 'cat', name: 'cat food (the cat insists)', icon: '🐈', unlock: 6, period: 1, base: 20, share: 0.03, due: 0.45, w: 0.9 },
    { id: 'car', name: 'car insurance', icon: '🚗', unlock: 6, period: 2, base: 140, share: 0.09, due: 0.62, w: 1.0 },
    { id: 'hoa', name: 'hoa fee (you rent??)', icon: '🏘️', unlock: 7, period: 2, base: 90, share: 0.06, due: 0.5, w: 0.9 },
    { id: 'meal', name: 'meal kit you never cook', icon: '🥡', unlock: 8, period: 1, base: 25, share: 0.02, due: 0.28, w: 0.4, sub: true },
    { id: 'taxes', name: 'quarterly taxes', icon: '🧾', unlock: 9, period: 3, base: 400, share: 0.18, due: 0.7, w: 1.4 },
    { id: 'budgetapp', name: 'budgeting app (ironic)', icon: '📊', unlock: 999, period: 1, base: 4, share: 0.008, due: 0.5, w: 0.4, sub: true },
    { id: 'costume', name: 'costume rental', icon: '🦇', unlock: 999, period: 1, base: 9, share: 0.015, due: 0.6, w: 0.4, sub: true }
  ];
  const BILL = Object.fromEntries(BILLS.map((b) => [b.id, b]));
  const SURPRISES = [
    ['parking ticket', '🅿️', 0.035], ['dentist (2 cavities)', '🦷', 0.07], ['vet (cat ate a sock)', '🐈', 0.08],
    ['cousin\'s wedding gift', '💍', 0.05], ['cracked phone screen', '📱', 0.06], ['"small" car noise', '🔧', 0.1],
    ['library fine (2014)', '📚', 0.02], ['ambulance ride (you were fine)', '🚑', 0.12], ['friend\'s birthday dinner', '🎂', 0.04]
  ];
  const WINDFALLS = [
    ['found cash in old jeans', 0.03], ['tax refund (suspiciously small)', 0.06], ['grandma sent a card with cash', 0.05],
    ['sold your old phone', 0.05], ['won a radio contest', 0.08], ['refund for a thing you returned in march', 0.04]
  ];
  const HUSTLES = [
    { id: 'lemon', name: 'lemonade stand', icon: '🍋', cost: 25, rate: 0.6, needs: null, quip: 'cash only. very sticky.' },
    { id: 'dog', name: 'dog walking', icon: '🐕', cost: 140, rate: 2.6, needs: 'phone', quip: 'clients book by text.' },
    { id: 'design', name: 'freelance design', icon: '🎨', cost: 700, rate: 11, needs: 'wifi', quip: '15% paid in exposure.', exposure: 0.15 },
    { id: 'ride', name: 'rideshare', icon: '🚘', cost: 3200, rate: 46, needs: 'phone', quip: '4.6 stars. it was the gum.' },
    { id: 'candle', name: 'online candle shop', icon: '🕯️', cost: 15000, rate: 190, needs: 'wifi', quip: 'scent: "printer warm".' },
    { id: 'video', name: 'video channel', icon: '🎬', cost: 75000, rate: 900, needs: 'wifi', quip: 'smash that like button.' },
    { id: 'consult', name: '"consulting"', icon: '💼', cost: 400000, rate: 4600, needs: 'phone', quip: 'no expertise required.' },
    { id: 'startup', name: 'ai startup (a spreadsheet)', icon: '🤖', cost: 2.5e6, rate: 26000, needs: 'wifi', quip: 'series a pending.' }
  ];
  const UPGRADES = [
    { id: 'mouse', icon: '🖱️', unlock: 1, max: 25, cost: 15, mult: 2.3, names: ['trackpad', 'ball mouse', 'optical mouse', 'gaming mouse (rgb)', 'ergonomic vertical mouse', '12-button mmo mouse', 'mouse with a fan', 'mouse of the year'], desc: (l) => 'cash per tap ×1.5' },
    { id: 'coffee', icon: '☕', unlock: 1, max: 12, cost: 40, mult: 2.2, names: ['tap water', 'instant coffee', 'drip coffee', 'cold brew', 'espresso', 'double espresso', 'coffee iv'], desc: () => 'more popups spawn' },
    { id: 'monitor', icon: '🖥️', unlock: 2, max: 1, cost: 220, mult: 1, names: ['one monitor', 'second monitor'], desc: () => 'room for 3 more popups, +25% popup cash' },
    { id: 'intern', icon: '🧑‍💼', unlock: 2, max: 20, cost: 150, mult: 2.6, names: ['no intern', 'unpaid intern'], desc: () => 'auto-closes popups' },
    { id: 'magnet', icon: '🧲', unlock: 2, max: 10, cost: 90, mult: 2.6, names: ['no magnet', 'piggy magnet'], desc: () => 'piggies come more often, hold more' },
    { id: 'budget', icon: '📊', unlock: 2, max: 1, cost: 250, mult: 1, names: ['no budget', 'budgeting app'], desc: () => 'all bills −10%. it\'s a subscription.' },
    { id: 'headphones', icon: '🎧', unlock: 3, max: 8, cost: 300, mult: 3, names: ['no headphones', 'noise-cancelling headphones'], desc: () => 'debt collector −13% speed (can\'t hear him)' },
    { id: 'autopay', icon: '🤖', unlock: 4, max: 1, cost: 1500, mult: 1, names: ['manual', 'autopay'], desc: () => 'pays bills for you when it can (+10% convenience fee)' }
  ];
  const UP = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
  const PERKS = [
    { id: 'trust', icon: '💰', name: 'trust fund (small)', max: 10, desc: (l) => 'start runs with $' + (75 * l) },
    { id: 'frugal', icon: '✂️', name: 'coupon brain', max: 8, desc: (l) => 'bills −' + (5 * l) + '%' },
    { id: 'grace', icon: '⏳', name: 'grace period', max: 5, desc: (l) => '+' + (4 * l) + 's before late fees' },
    { id: 'grind', icon: '📈', name: 'hustle culture', max: 20, desc: (l) => 'hustles +' + (20 * l) + '%' },
    { id: 'clicky', icon: '👆', name: 'clicky fingers', max: 20, desc: (l) => 'tap cash +' + (30 * l) + '%' },
    { id: 'lawyer', icon: '⚖️', name: 'cousin who is a lawyer', max: 5, desc: (l) => 'debt collector −' + (10 * l) + '% speed' }
  ];
  const POPUPS = [
    ['congratulations!!', 'you are today\'s lucky visitor'], ['claim your cash', 'click to claim (it works this time)'],
    ['virus alert', 'your pc has 37 viruses (it doesn\'t)'], ['we value your privacy', 'we don\'t, but click x'],
    ['allow notifications?', 'we promise only 40 a day'], ['car warranty', 'about your car\'s extended warranty'],
    ['quick survey', '2 minutes (it is 40 minutes)'], ['rate us ★★★★★', 'you\'ve used this app once'],
    ['accept cookies', 'all of them. every cookie.'], ['update available', 'again. restart now?'],
    ['free phone*', '*not free. *not a phone.'], ['hot deals near you', 'mattresses. so many mattresses.'],
    ['newsletter', 'subscribe for weekly regret'], ['limited offer', 'ends in 00:00:03 (forever)'],
    ['you\'ve been selected', 'for a timeshare presentation'], ['login expired', 'please log in to log out'],
    ['are you still there?', 'click if you are alive'], ['download ram', 'free, legal, totally real']
  ];
  // daily situation cards (from day 3): pick one of two. effects last until the day ends.
  const EVENTS = [
    { id: 'heat', icon: '🥵', title: 'heatwave', body: 'it is 104°f. the hustles are melting.', a: ['buy a fan', 'costs 10% of your cash (or of half of yesterday’s pay)', { cashPct: 0.1 }], b: ['suffer', 'hustles ×0.7 today', { inc: 0.7 }] },
    { id: 'boom', icon: '📈', title: 'side gig boom', body: 'everyone needs a guy. you are a guy.', a: ['grind', 'hustles ×1.6, collector ×1.5 speed', { inc: 1.6, col: 1.5 }], b: ['rest', 'nothing happens. lovely.', {}] },
    { id: 'inspect', icon: '🔍', title: 'landlord inspection', body: 'he wants to "look at the walls".', a: ['bribe him', 'costs 15% of your cash (or of half of yesterday’s pay)', { cashPct: 0.15 }], b: ['let him in', 'debt collector starts 35ft closer', { colStart: 35 }] },
    { id: 'viral', icon: '🔥', title: 'you went viral', body: 'a video of you smashing popups has 2m views.', a: ['stream it', 'tap cash ×3 today', { tap: 3 }], b: ['sell merch', 'hustles ×1.3 today', { inc: 1.3 }] },
    { id: 'coupon', icon: '✂️', title: 'coupon day', body: 'grandma mailed you a coupon book. most are expired.', a: ['clip them all', 'today\'s bills −25%, popups slower', { bills: 0.75, pop: 0.6 }], b: ['recycle it', 'popups ×1.5 faster', { pop: 1.5 }] },
    { id: 'sick', icon: '🤒', title: 'sick day', body: 'you have a cold. or the flu. or vibes.', a: ['power through', 'tap cash ×0.5, hustles ×1.2', { tap: 0.5, inc: 1.2 }], b: ['sleep', 'hustles ×0.75, collector ×0.5 speed', { inc: 0.75, col: 0.5 }] },
    { id: 'overtime', icon: '⏰', title: 'overtime offered', body: 'your boss says "we\'re a family". families don\'t pay overtime.', a: ['take it', 'hustles ×1.4, bills due 15% sooner', { inc: 1.4, due: 0.85 }], b: ['decline', 'tap cash ×1.5 today', { tap: 1.5 }] },
    { id: 'tip', icon: '🪙', title: 'cousin\'s crypto tip', body: '"trust me bro." he has never been right.', a: ['trust him', 'crashcoin price ×2 or ×0.3 (coin flip)', { crypto: 1 }], b: ['block him', 'tap cash ×1.25 today', { tap: 1.25 }] }
  ];
  const SPOOKY_POPUPS = [['boo-nus cash', 'a ghost owes you money'], ['haunted coupon', '10% off one (1) curse'], ['trick or treat', 'click for treat. we have no tricks.']];

  // ---------- helpers ----------
  const rnd = Math.random;
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function fmt(n) {
    const neg = n < 0; n = Math.abs(n);
    let s;
    if (n < 1000) s = n < 10 && n % 1 ? n.toFixed(2) : String(Math.floor(n));
    else {
      const u = ['k', 'M', 'B', 'T', 'Qa', 'Qi'];
      let i = -1; while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
      s = (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n)) + u[i];
    }
    return (neg ? '-$' : '$') + s;
  }

  // ---------- state ----------
  function newMeta() { return { v: 1, cp: 0, cpTotal: 0, perks: {}, bestDay: 0, runs: 0, lastSeen: 0, spooky: null, lifetime: 0 }; }
  function newRun(meta) {
    const S = {
      v: 1, t: 0, day: 1, dayStart: 0, dayLen: 75, dayDone: false, over: null,
      cash: 75 * (meta.perks.trust || 0), dayEarned: 0, prevDayEarned: 0, runEarned: 0, peakCash: 0,
      lateFees: 0, billsPaid: 0, popsClosed: 0, pigsSmashed: 0, exposure: 0, gigsDone: 0, cryptoBest: 0,
      bills: [], canceled: {}, uid: 1, hustles: {}, up: {}, collector: 0, collectorPeak: 0, strikes: 0, repoLost: 0,
      crypto: { coins: 0, price: 1, hist: [1], acc: 0, spent: 0 },
      pops: [], pig: null, gig: null, nextPop: 0.6, nextPig: 9, nextGig: 22, nextSurprise: 40, internAcc: 0,
      windfallDone: false, ev: [], startedAt: Date.now(), warned: 0, dayStats: null, spooky: !!meta.spooky
    };
    S.meta = meta;
    scheduleDay(S);
    return S;
  }
  function emit(S, type, data) { S.ev.push(Object.assign({ type }, data || {})); }

  // ---------- derived ----------
  const lvl = (S, id) => S.up[id] || 0;
  const perk = (S, id) => S.meta.perks[id] || 0;
  // every point you ever earned counts, so spending on perks is never a trap
  function globalMult(S) { return Math.pow(1.08, S.meta.cpTotal || 0); }
  const mod = (S, k) => (S.mods && S.mods[k] !== undefined ? S.mods[k] : 1);
  function utilOk(S, u) { return !S.bills.some((b) => b.late && BILL[b.type] && BILL[b.type].util === u); }
  function clickPower(S) { return Math.pow(1.5, lvl(S, 'mouse')) * (1 + 0.3 * perk(S, 'clicky')) * globalMult(S); }
  function hustleMult(S, h, n) {
    let m = 1; if (n >= 10) m *= 2; if (n >= 25) m *= 2; if (n >= 50) m *= 2; if (n >= 100) m *= 3;
    return m;
  }
  function hustleRate(S, id) {
    const h = HUSTLES.find((x) => x.id === id), n = S.hustles[id] || 0;
    if (!n) return 0;
    if (h.needs && !utilOk(S, h.needs)) return 0;
    let r = h.rate * n * hustleMult(S, h, n) * (1 + 0.2 * perk(S, 'grind')) * globalMult(S);
    if (!utilOk(S, 'power')) r *= 0.5;
    if (h.exposure) r *= 1 - h.exposure;
    return r * mod(S, 'inc');
  }
  function incomeRate(S) { let r = 0; for (const h of HUSTLES) r += hustleRate(S, h.id); return r; }
  function hustleCost(S, h) { return Math.ceil(h.cost * Math.pow(1.15, S.hustles[h.id] || 0)); }
  function upCost(S, u) { return Math.ceil(u.cost * Math.pow(u.mult, lvl(S, u.id))); }
  function billMult(S) { return (1 - 0.05 * perk(S, 'frugal')) * (lvl(S, 'budget') ? 0.9 : 1); }
  function popInterval(S) { return 1.45 / (1 + 0.22 * lvl(S, 'coffee')) * (utilOk(S, 'wifi') ? 1 : 3) / mod(S, 'pop'); }
  function maxPops(S) { return 5 + (lvl(S, 'monitor') ? 3 : 0); }
  function collectorSpeed(S) {
    let s = 0;
    for (const b of S.bills) if (b.late) s += (BILL[b.type] ? BILL[b.type].w : 0.7);
    return 0.65 * s * Math.pow(0.87, lvl(S, 'headphones')) * (1 - 0.1 * perk(S, 'lawyer')) * mod(S, 'col');
  }
  function freshGain(S, bankrupt) { const g = Math.max(0, S.day - 3); return bankrupt ? Math.floor(g / 2) : g; } // one point per day survived past day 3

  // ---------- money ----------
  function earn(S, amt, src) {
    if (!(amt > 0)) return 0;
    S.cash += amt; S.dayEarned += amt; S.runEarned += amt; S.meta.lifetime += amt;
    if (S.cash > S.peakCash) S.peakCash = S.cash;
    return amt;
  }
  function spend(S, amt) { if (S.cash + 1e-9 < amt) return false; S.cash -= amt; return true; }

  // ---------- bills ----------
  // bills grow on a fixed curve. your income has to outrun it; prestige perks help you do that.
  // growth speeds up a little every day (1.82x, then 1.85x, ...) so there's always a wall ahead.
  function billScale(d) { let m = 1; for (let k = 1; k < d; k++) m *= 1.79 + 0.03 * k; return m; }
  // lifestyle creep: a bill is the curve, or its share of what you earned yesterday, whichever is bigger.
  // so bills always keep up with you, and there's no stretch where autopay plays the game.
  const CREEP = 0.6;
  function billCurve(S, def) {
    if (def.unlock >= 99) return def.base * Math.pow(1.35, S.day - 1); // add-on subs (budget app, costume) grow gently
    return def.base * billScale(S.day) / billScale(Math.min(def.unlock, S.day));
  }
  function billAmount(S, def) {
    const amt = Math.max(billCurve(S, def), CREEP * S.prevDayEarned * def.share);
    return Math.max(1, Math.round(amt * billMult(S) * mod(S, 'bills')));
  }
  function addBill(S, def, dueIn, name, icon, amount) {
    const b = { uid: S.uid++, type: def ? def.id : 'surprise', name: name || def.name, icon: icon || def.icon, amount, orig: amount, due: S.t + dueIn, late: false, shown: S.t };
    S.bills.push(b);
    emit(S, 'bill', { b });
    return b;
  }
  function scheduleDay(S) {
    S.dayStart = S.t; S.dayLen = S.day === 1 ? 75 : 90; S.dayDone = false;
    const active = BILLS.filter((d) => {
      if (S.canceled[d.id]) return false;
      if (d.id === 'budgetapp') return lvl(S, 'budget') > 0;
      if (d.id === 'costume') return S.spooky && S.day >= 2;
      return S.day >= d.unlock && (S.day - d.unlock) % d.period === 0;
    });
    S.mods = {};
    let crept = null;
    for (const d of active) {
      if (S.bills.some((b) => b.type === d.id)) continue; // still owe the last one
      const jitter = (rnd() - 0.5) * 0.08;
      const b = addBill(S, d, clamp(d.due + jitter, 0.18, 0.95) * S.dayLen, null, null, billAmount(S, d));
      if (S.day > 1 && CREEP * S.prevDayEarned * d.share > billCurve(S, d) && (!crept || d.share > BILL[crept].share)) crept = d.id;
      void b;
    }
    if (crept) emit(S, 'creep', { name: BILL[crept].name });
    S.windfallDone = S.day < 2;
    S.dayStats = { earned: 0, late: 0, paid: 0 };
  }
  function payBill(S, uid, autoFee) {
    const b = S.bills.find((x) => x.uid === uid);
    const extra = autoFee ? Math.ceil(b ? b.amount * autoFee : 0) : 0;
    if (!b || !spend(S, b.amount + extra)) return false;
    S.bills.splice(S.bills.indexOf(b), 1);
    S.billsPaid++;
    if (extra) S.autoFees = (S.autoFees || 0) + extra;
    const fee = b.amount - b.orig;
    emit(S, 'paid', { b, fee, auto: !!autoFee });
    return true;
  }
  function payAll(S) { // most urgent first
    const order = S.bills.slice().sort((a, b) => (b.late - a.late) || a.due - b.due);
    let n = 0; for (const b of order) if (payBill(S, b.uid)) n++;
    return n;
  }
  function cancelSub(S, type) {
    const def = BILL[type]; if (!def || !def.sub) return 0;
    S.canceled[type] = true;
    let fee = 0;
    for (const b of S.bills.slice()) if (b.type === type) { fee += Math.ceil(b.amount * 0.5); S.bills.splice(S.bills.indexOf(b), 1); }
    S.cash -= fee; // cancellation fee can push you negative. that's the joke.
    emit(S, 'canceled', { def, fee });
    return fee;
  }

  // ---------- field ----------
  let popId = 1;
  function spawnPop(S) {
    const list = S.spooky && rnd() < 0.35 ? SPOOKY_POPUPS : POPUPS;
    const [title, body] = list[(rnd() * list.length) | 0];
    const r = rnd();
    let kind = 'norm', hp = 1, reward = 0.8 + rnd() * 1.2; // a multiplier on tapValue, applied when it's closed
    if (r < 0.025 && S.day >= 2) { kind = 'gold'; reward *= 15; }
    else if (r < 0.15) { kind = 'tough'; hp = 3; reward *= 3.6; }
    if (lvl(S, 'monitor')) reward *= 1.25;
    const p = { id: popId++, kind, hp, max: hp, reward, title: kind === 'gold' ? 'you are the 1,000,000th visitor' : title, body: kind === 'gold' ? 'this one actually pays' : body, born: S.t };
    S.pops.push(p); emit(S, 'pop', { p });
  }
  // a tap is worth your click power, or 0.15s of hustle income, whichever is bigger. fast taps build a combo up to x3.
  const TAP_INCOME = 0.15;
  function tapValue(S) { return Math.max(clickPower(S), incomeRate(S) * TAP_INCOME) * mod(S, 'tap'); }
  function bumpCombo(S) {
    S.combo = S.t - (S.lastTap || -9) < 1.1 ? Math.min(3, (S.combo || 1) + 0.1) : 1;
    S.lastTap = S.t; if (S.combo > (S.comboBest || 1)) S.comboBest = S.combo;
  }
  function hitPop(S, id, auto) {
    const p = S.pops.find((x) => x.id === id); if (!p) return 0;
    if (!auto) bumpCombo(S);
    p.hp--;
    if (p.hp > 0) { emit(S, 'popHit', { p }); return 0; }
    S.pops.splice(S.pops.indexOf(p), 1);
    S.popsClosed++;
    const amt = earn(S, p.reward * tapValue(S) * (auto ? 1 : S.combo));
    emit(S, 'popDie', { p, amt, auto, combo: auto ? 1 : S.combo });
    return amt;
  }
  function spawnPig(S) {
    const hp = 8 + S.day * 2;
    const reward = (tapValue(S) * 6 + incomeRate(S) * 2) * (1 + 0.25 * lvl(S, 'magnet'));
    S.pig = { id: popId++, hp, max: hp, reward, born: S.t, life: 11 };
    emit(S, 'pig', { pig: S.pig });
  }
  function hitPig(S, auto) {
    const g = S.pig; if (!g) return 0;
    if (!auto) bumpCombo(S);
    g.hp--;
    if (g.hp > 0) { emit(S, 'pigHit', { pig: g }); return 0; }
    S.pig = null; S.pigsSmashed++; S.nextPig = Math.max(S.nextPig - (g.life - (S.t - g.born)), 6);
    const amt = earn(S, g.reward * (auto ? 1 : S.combo || 1));
    emit(S, 'pigDie', { pig: g, amt });
    return amt;
  }
  function tapAny(S) { // keyboard smash: piggy first, else oldest popup
    if (S.pig) return hitPig(S);
    if (S.pops.length) return hitPop(S, S.pops[0].id);
    return 0;
  }
  function acceptGig(S) {
    const g = S.gig; if (!g || g.active) return;
    g.active = true; g.start = S.t; emit(S, 'gigStart', { g });
  }
  function declineGig(S) { if (S.gig && !S.gig.active) { S.gig = null; S.nextGig = S.t + 18 + rnd() * 12; emit(S, 'gigEnd', {}); } }

  // ---------- shop ----------
  function buyHustle(S, id, n) {
    const h = HUSTLES.find((x) => x.id === id); let k = 0;
    while (k < (n || 1)) { const c = hustleCost(S, h); if (!spend(S, c)) break; S.hustles[id] = (S.hustles[id] || 0) + 1; k++; }
    if (k) emit(S, 'bought', { what: h.name, n: k });
    return k;
  }
  function buyUp(S, id) {
    const u = UP[id]; if (lvl(S, id) >= u.max || S.day < u.unlock) return false;
    if (!spend(S, upCost(S, u))) return false;
    S.up[id] = lvl(S, id) + 1;
    if (id === 'budget') { // the app is itself a subscription
      if (!S.bills.some((b) => b.type === 'budgetapp')) addBill(S, BILL.budgetapp, 30, null, null, billAmount(S, BILL.budgetapp));
    }
    emit(S, 'bought', { what: u.names[Math.min(u.names.length - 1, S.up[id])] || u.id, up: id });
    return true;
  }
  function cryptoBuy(S, frac) {
    const amt = Math.floor(S.cash * frac); if (amt < 1) return 0;
    S.cash -= amt; S.crypto.coins += amt / S.crypto.price; S.crypto.spent += amt;
    emit(S, 'crypto', { buy: amt });
    return amt;
  }
  function cryptoSell(S) {
    const c = S.crypto; if (c.coins <= 0) return 0;
    const v = c.coins * c.price;
    const profit = v - c.spent;
    c.coins = 0; c.spent = 0;
    S.cash += v; // selling isn't "earning", it's getting some of your money back
    if (profit > S.cryptoBest) S.cryptoBest = profit;
    emit(S, 'crypto', { sell: v, profit });
    return v;
  }

  const AUTO_FEE = 0.1; // autopay's "convenience fee". paying by hand is cheaper.
  // ---------- tick ----------
  function tick(S, dt) {
    if (S.over || S.dayDone) return;
    S.t += dt;
    // popups
    S.nextPop -= dt;
    if (S.nextPop <= 0) { S.nextPop = popInterval(S) * (0.6 + rnd() * 0.8); if (S.pops.length < maxPops(S)) spawnPop(S); }
    // piggy
    S.nextPig -= dt;
    if (!S.pig && S.nextPig <= 0) { spawnPig(S); S.nextPig = S.pig.life + 18 / Math.pow(1.2, lvl(S, 'magnet')) * (0.8 + rnd() * 0.4); }
    if (S.pig && S.t - S.pig.born > S.pig.life) { emit(S, 'pigGone', { pig: S.pig }); S.pig = null; }
    // intern
    const il = lvl(S, 'intern');
    if (il) {
      S.internAcc += dt * 0.4 * il;
      while (S.internAcc >= 1) {
        S.internAcc -= 1;
        if (S.pig) hitPig(S, true); else if (S.pops.length) hitPop(S, S.pops[(rnd() * S.pops.length) | 0].id, true);
        else { S.internAcc = 0; break; }
      }
    }
    // hustles
    let inc = 0;
    for (const h of HUSTLES) {
      const r = hustleRate(S, h.id); inc += r;
      if (h.exposure && r > 0) S.exposure += r / (1 - h.exposure) * h.exposure * dt;
    }
    earn(S, inc * dt);
    // gigs
    if (S.gig) {
      const g = S.gig;
      if (!g.active && S.t > g.expires) { S.gig = null; S.nextGig = S.t + 20 + rnd() * 12; emit(S, 'gigEnd', { missed: true }); }
      else if (g.active && S.t - g.start >= g.dur) {
        S.gig = null; S.gigsDone++; S.nextGig = S.t + 20 + rnd() * 14;
        if (g.exposure) { S.exposure += g.reward; emit(S, 'gigEnd', { exposure: g.reward }); }
        else emit(S, 'gigEnd', { amt: earn(S, g.reward) });
      }
    } else if (S.t > S.nextGig && utilOk(S, 'phone') && S.day >= 2) {
      const reward = Math.max(clickPower(S) * 20, incomeRate(S) * 8 + clickPower(S) * 8) * (0.8 + rnd() * 0.5);
      const GIGS = ['assemble a mystery shelf', 'fix a cousin\'s website', 'help someone move (3rd floor)', 'walk a very large dog', 'mystery shop a sandwich', 'proofread a manifesto', 'deliver one (1) couch'];
      S.gig = { name: GIGS[(rnd() * GIGS.length) | 0], reward, dur: 10 + rnd() * 10, expires: S.t + 9, active: false, exposure: rnd() < 0.15 };
      emit(S, 'gig', { g: S.gig });
    }
    // crypto
    if (S.day >= 3) {
      const c = S.crypto; c.acc += dt;
      while (c.acc >= 1) {
        c.acc -= 1;
        let p = c.price * Math.exp(gauss() * 0.075 - 0.009);
        const r = rnd();
        if (r < 0.004) { p *= 3.5; emit(S, 'cryptoEvent', { moon: true }); }
        else if (r < 0.008) { p *= 0.08; emit(S, 'cryptoEvent', { rug: true }); }
        c.price = clamp(p, 0.0001, 1e9);
        c.hist.push(c.price); if (c.hist.length > 60) c.hist.shift();
      }
    }
    // bills
    const grace = 4 * perk(S, 'grace');
    for (const b of S.bills) {
      const before = b.amount;
      if (!b.late && S.t > b.due + grace) {
        b.late = true; b.amount = Math.ceil(b.amount * 1.15);
        S.dayStats.late++;
        emit(S, 'late', { b });
      } else if (b.late && b.amount < b.orig * 3) {
        b.amount = Math.min(b.orig * 3, b.amount * Math.pow(1.012, dt));
      }
      if (b.amount > before) S.lateFees += b.amount - before;
    }
    // surprises + windfalls
    if (S.day >= 2) {
      S.nextSurprise -= dt;
      if (S.nextSurprise <= 0) {
        S.nextSurprise = 45 + rnd() * 50;
        const [nm, ic, sh] = SURPRISES[(rnd() * SURPRISES.length) | 0];
        addBill(S, null, 26, nm, ic, Math.max(8, Math.round(Math.max(S.prevDayEarned * 0.5, 45 * billScale(S.day)) * sh * billMult(S))));
        emit(S, 'surprise', { name: nm });
      }
      if (!S.windfallDone && S.t - S.dayStart > S.dayLen * 0.5 && rnd() < dt * 0.05) {
        S.windfallDone = true;
        const [nm, sh] = WINDFALLS[(rnd() * WINDFALLS.length) | 0];
        const amt = earn(S, Math.max(10, Math.round(S.prevDayEarned * sh)));
        emit(S, 'windfall', { name: nm, amt });
      }
    }
    // autopay
    if (lvl(S, 'autopay')) {
      const order = S.bills.slice().sort((a, b) => (b.late - a.late) || a.due - b.due);
      for (const b of order) if (S.cash >= b.amount * (1 + AUTO_FEE) && (b.late || b.due - S.t < 12)) payBill(S, b.uid, AUTO_FEE);
    }
    // debt collector
    const sp = collectorSpeed(S);
    if (sp > 0) S.collector += sp * dt;
    else S.collector = Math.max(0, S.collector - 5 * dt);
    if (S.collector > S.collectorPeak) S.collectorPeak = S.collector;
    if (S.collector >= 50 && S.warned < 1) { S.warned = 1; emit(S, 'warn', { lvl: 1 }); }
    if (S.collector >= 80 && S.warned < 2) { S.warned = 2; emit(S, 'warn', { lvl: 2 }); }
    if (S.collector < 40) S.warned = 0;
    if (S.collector >= 100) { repossess(S); if (S.over) return; }
    // day end
    if (S.t - S.dayStart >= S.dayLen) {
      S.dayDone = true;
      S.dayStats.earned = S.dayEarned;
      emit(S, 'dayEnd', { day: S.day, earned: S.dayEarned, owed: S.bills.reduce((a, b) => a + b.amount, 0) });
    }
  }
  // the collector shows up: strikes 1 and 2 cost you stuff, strike 3 ends the run
  function repossess(S) {
    S.strikes = (S.strikes || 0) + 1;
    if (S.strikes >= 3) { endRun(S, 'bankrupt'); return; }
    const took = [];
    for (const h of HUSTLES) {
      const n = S.hustles[h.id] || 0; if (!n) continue;
      const k = Math.ceil(n * 0.3); S.hustles[h.id] = n - k; took.push(k + ' ' + h.name);
    }
    let settled = 0;
    for (const b of S.bills.slice()) if (b.late) { settled += b.amount; S.bills.splice(S.bills.indexOf(b), 1); }
    // half your cash, or everything the late bills were worth, whichever hurts more. it can put you below zero.
    const cashTaken = Math.max(Math.floor(Math.max(0, S.cash) * 0.5), Math.ceil(settled));
    S.cash -= cashTaken;
    S.collector = 0; S.warned = 0; S.repoLost += cashTaken;
    emit(S, 'repo', { strike: S.strikes, took, cashTaken, settled });
  }
  function nextDay(S) {
    if (!S.dayDone) return;
    S.prevDayEarned = S.dayEarned; S.dayEarned = 0; S.day++;
    if (S.day > S.meta.bestDay) S.meta.bestDay = S.day;
    scheduleDay(S);
    emit(S, 'dayStart', { day: S.day });
  }
  function rollEvent(S) {
    if (S.day < 3) return null;
    const pool = EVENTS.filter((e) => e.id !== S.lastEvent);
    const e = pool[(rnd() * pool.length) | 0]; S.lastEvent = e.id;
    return e;
  }
  function applyEvent(S, id, side) {
    const e = EVENTS.find((x) => x.id === id); if (!e) return '';
    const fx = (side === 'a' ? e.a : e.b)[2];
    S.mods = S.mods || {};
    let note = '';
    for (const k of ['inc', 'col', 'tap', 'pop', 'bills']) if (fx[k] !== undefined) S.mods[k] = fx[k];
    if (fx.cashPct) { const c = Math.max(10, Math.floor(Math.max(S.cash, S.prevDayEarned * 0.5) * fx.cashPct)); S.cash -= c; note = 'paid ' + fmt(c); } // broke? it's still not free
    if (fx.colStart) S.collector = Math.max(S.collector, fx.colStart);
    if (fx.bills) for (const b of S.bills) if (!b.late) { b.amount = Math.max(1, Math.round(b.amount * fx.bills)); b.orig = Math.min(b.orig, b.amount); }
    if (fx.due) for (const b of S.bills) if (!b.late) b.due = S.t + (b.due - S.t) * fx.due;
    if (fx.crypto) { const up = rnd() < 0.5; S.crypto.price = clamp(S.crypto.price * (up ? 2 : 0.3), 0.0001, 1e9); S.crypto.hist.push(S.crypto.price); if (S.crypto.hist.length > 60) S.crypto.hist.shift(); note = up ? 'he was right?? price ×2' : 'he was wrong. price ×0.3'; }
    emit(S, 'event', { id, side });
    return note;
  }
  function endRun(S, why) {
    if (S.over) return;
    const gain = freshGain(S, why === 'bankrupt');
    S.over = { why, gain, day: S.day };
    S.meta.cp += gain; S.meta.cpTotal += gain; S.meta.runs++;
    if (S.day > S.meta.bestDay) S.meta.bestDay = S.day;
    emit(S, 'over', { why, gain });
  }
  function buyPerk(meta, id) {
    const p = PERKS.find((x) => x.id === id), l = meta.perks[id] || 0;
    if (l >= p.max || meta.cp < l + 1) return false;
    meta.cp -= l + 1; meta.perks[id] = l + 1; return true;
  }
  function offline(S, secs) {
    const s = Math.min(secs, 3600);
    const amt = Math.min(incomeRate(S) * s * 0.25, incomeRate(S) * S.dayLen * 1.5); // never worth more than a day and a half
    if (amt > 0) { S.cash += amt; S.runEarned += amt; S.meta.lifetime += amt; }
    return { secs: s, amt };
  }

  const api = {
    BILLS, BILL, HUSTLES, UPGRADES, UP, PERKS, fmt, newMeta, newRun, tick, nextDay, endRun,
    EVENTS, rollEvent, applyEvent, tapValue,
    payBill, payAll, cancelSub, hitPop, hitPig, tapAny, acceptGig, declineGig, buyHustle, buyUp, buyPerk,
    cryptoBuy, cryptoSell, offline, clickPower, incomeRate, hustleRate, hustleCost, upCost, utilOk, collectorSpeed,
    freshGain, lvl, globalMult
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ON = api;
})(this);
