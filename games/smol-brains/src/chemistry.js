/* smol brains — chemistry.js
   A small biochemistry: drives (wanted low) plus body chemicals. Food becomes glucose, glucose burns,
   fat buffers it, toxins and germs make you sick until antibodies and medicine win. Health is the sum
   of all that; at zero the creature dies. Rates are per sim second. */
(function () {
  "use strict";
  var SB = window.SB;
  var Chem = (SB.Chem = {});
  var DRIVES = SB.DRIVES;

  Chem.BODY = ["glucose", "fat", "reward", "punish", "adrenaline", "toxin", "antigen", "antibody", "medicine", "health"];

  Chem.create = function (genome) {
    var c = {};
    for (var i = 0; i < DRIVES.length; i++) c[DRIVES[i]] = 0;
    c.hunger = 0.3; c.bored = 0.25; c.lonely = 0.25; c.sleepy = 0.1; c.tired = 0.1;
    c.glucose = 0.6; c.fat = 0.4; c.reward = 0; c.punish = 0; c.adrenaline = 0;
    c.toxin = 0; c.antigen = 0; c.antibody = 0.05; c.medicine = 0; c.health = 1;
    return c;
  };

  Chem.LOVE_RATE = 0.0022;
  function gene(g, k, d) { return g && g.genes && g.genes[k] != null ? g.genes[k] : d; }
  var clamp01 = SB.clamp01;

  // 4.36: half-life, threshold and reaction genes (genome.js RULES), worked out once per genome; G.setRule clears it.
  // A genome with none of them gets ONE: every multiplier 1 and every threshold the number this file used to fix.
  var ONE = { fear: 1, pain: 1, anger: 1, reward: 1, toxin: 1, med: 1, ab: 1, sick: 1, fat: 1, store: 1, starve: 0.92, painT: 0.8, temp: 0.85, love: 0.65, loveG: 1, rx: null };
  function K(g) {
    if (!g || (!g.rule && !g.rx)) return ONE;
    if (g._ck) return g._ck;
    var G = SB.Genome, k = {
      fear: G.half(g, "hlFear"), pain: G.half(g, "hlPain"), anger: G.half(g, "hlAnger"), reward: G.half(g, "hlReward"),
      toxin: G.half(g, "hlToxin"), med: G.half(g, "hlMedicine"), ab: G.half(g, "hlAntibody"),
      sick: 1 + (0.5 - G.rule(g, "thSick")) * 0.8, fat: 0.5 + G.rule(g, "rxFat"), store: 0.5 + G.rule(g, "rxStore"),
      starve: G.point(g, "thStarve", 0.92, 0.12), painT: G.point(g, "thPain", 0.8, 0.2), temp: G.point(g, "thTemp", 0.85, 0.2), love: G.point(g, "thLove", 0.65, 0.3), loveG: 1 + (G.rule(g, "thLove") - 0.5) * 0.8, rx: null
    };
    if (g.rx && g.rx.length) k.rx = g.rx.slice(0, G.RX_MAX).map(function (x) { return { a: G.CHEMS[x.a], b: G.CHEMS[x.b], f: x.f, k: x.k }; }).filter(function (x) { return x.a && x.b; });
    Object.defineProperty(g, "_ck", { value: k, writable: true, enumerable: false, configurable: true });
    return k;
  }
  Chem.rules = K;
  // every reaction in this body, in words: the ones every smol has, then the ones its genes added
  Chem.reactions = function (g) {
    var out = ["glucose burns for energy", "low glucose pulls from fat", "spare glucose is stored as fat", "germs raise antibodies", "antibodies and medicine clear germs", "medicine clears toxin"];
    (g && g.rx || []).forEach(function (x) { out.push(SB.Genome.rxName(x) + " (its own gene)"); });
    return out;
  };

  // env = {temp 0..1, dark, asleep, inBed, moving, nearFriends, stage, species}
  Chem.tick = function (c, dt, env, genome) {
    var grump = env.species === "grump";
    var stage = env.stage || 0;
    var baby = stage === 0, k = K(genome);
    var met = 0.6 + gene(genome, "metabolism", 0.5) * 0.8;
    if (baby) met *= 1.35;
    if (grump) met *= 0.7;

    // energy: glucose burns, fat tops it up, a shortage makes you hungry
    var burn = 0.0028 * met * (env.moving ? 1.4 : 1) * (env.asleep ? 0.55 : 1);
    c.glucose -= burn * dt;
    if (c.glucose < 0.35 && c.fat > 0) { var conv = Math.min(c.fat, 0.006 * k.fat * dt); c.fat -= conv; c.glucose += conv * 0.9; }
    if (c.glucose > 0.9) { var store = (c.glucose - 0.9) * 0.05 * k.store * dt; c.glucose -= store; c.fat = Math.min(1, c.fat + store); }
    c.glucose = clamp01(c.glucose);
    var appetite = 0.7 + gene(genome, "appetite", 0.5) * 0.6;
    c.hunger += dt * appetite * (0.0034 * met + 0.0045 * Math.max(0, 0.35 - c.glucose)) * (env.asleep ? 0.5 : 1);

    // rest
    if (env.asleep) {
      var bed = env.inBed ? 2 : 1;
      c.sleepy -= 0.016 * bed * dt;
      c.tired -= 0.02 * bed * dt;
      c.bored -= 0.002 * dt;
    } else {
      c.sleepy += dt * 0.0016 * (env.dark ? 1.9 : 1) * (baby ? 1.4 : 1) * (0.7 + gene(genome, "sleepiness", 0.5) * 0.6);
      c.tired += dt * (env.moving ? 0.0032 : -0.004);
    }

    // social and fun
    if (!env.asleep) {
      var play = 0.6 + gene(genome, "playfulness", 0.5) * 0.8;
      c.bored += dt * 0.0026 * play;
      var soc = grump ? 0 : 0.5 + gene(genome, "sociability", 0.5);
      if (env.nearFriends > 0) c.lonely -= dt * 0.0035 * Math.min(3, env.nearFriends);
      else c.lonely += dt * 0.0026 * soc;
    }

    // temperature: comfortable band shifted by tolerance genes
    var lo = 0.32 - gene(genome, "coldTolerance", 0.5) * 0.18, hi = 0.68 + gene(genome, "heatTolerance", 0.5) * 0.18;
    var t = env.temp == null ? 0.5 : env.temp;
    if (env.asleep && env.inBed) t = Math.max(t, 0.45);
    var coldT = clamp01((lo - t) * 3), hotT = clamp01((t - hi) * 3);
    c.cold += (coldT - c.cold) * Math.min(1, 0.06 * dt);
    c.hot += (hotT - c.hot) * Math.min(1, 0.06 * dt);

    // fear, pain, anger fade; adrenaline follows fear
    c.fear -= 0.035 * k.fear * dt * (1 + gene(genome, "bravery", 0.5));
    c.pain -= 0.025 * k.pain * dt;
    c.adrenaline += (c.fear - c.adrenaline) * Math.min(1, 0.5 * dt);
    c.anger -= 0.02 * k.anger * dt;
    c.anger += dt * c.pain * 0.02 * (0.3 + gene(genome, "grumpiness", 0.3));
    if (grump) c.anger += 0.004 * dt;

    // reinforcement chemicals are quick flashes
    c.reward -= c.reward * Math.min(1, 0.6 * k.reward * dt);
    c.punish -= c.punish * Math.min(1, 0.6 * k.reward * dt);

    // illness: toxins decay; germs multiply until antibodies catch them; medicine helps both
    var imm = 0.4 + gene(genome, "immunity", 0.5) * 1.2;
    c.toxin -= dt * k.toxin * (0.006 + c.medicine * 0.03);
    c.antigen += dt * c.antigen * 0.008;
    c.antibody += dt * c.antigen * 0.015 * imm;
    var kill = Math.min(c.antigen, dt * (c.antibody * 0.03 + c.medicine * 0.06));
    c.antigen -= kill;
    c.antibody -= dt * k.ab * 0.002;
    c.medicine -= dt * k.med * 0.02;
    var sickT = clamp01(Math.max(c.toxin * 1.6, c.antigen * 1.4) * k.sick);
    c.sick += (sickT - c.sick) * Math.min(1, 0.15 * dt);

    // reactions this smol's own genes added: a little of one chemical makes, or lowers, another
    if (k.rx) {
      for (var ri = 0; ri < k.rx.length; ri++) {
        var rx = k.rx[ri], amt = rx.k * 0.02 * dt * c[rx.a];
        if (rx.f & 1) c[rx.a] -= amt;
        c[rx.b] += rx.f & 2 ? -amt : amt;
      }
      c.glucose = clamp01(c.glucose);
    }

    // love only in adults who are doing fine. With env.loveK (creature.js: settled, fed, warm, housed, the season)
    // it grows slowly, about 3.5 minutes to smitten in a settled village; without it, the old quick rate
    if (env.loveK != null && stage === 3 && !grump) { if (env.loveK > 0) c.love += dt * Chem.LOVE_RATE * k.loveG * env.loveK * (0.5 + gene(genome, "fertility", 0.5)); else c.love -= dt * 0.0015; }
    else if (stage >= 3 && stage < 4 && !grump && c.hunger < k.love && c.health > 0.5 && c.sick < 0.35) c.love += dt * 0.009 * k.loveG * (0.5 + gene(genome, "fertility", 0.5));
    else if (stage !== 3 || grump) c.love -= dt * 0.01;
    else c.love -= dt * 0.0015; // a rough patch slows romance, it doesn't end it

    // health: starve, poison, germs, pain and extremes hurt; a calm, fed body heals
    var dmg = 0;
    if (c.hunger > k.starve) dmg += 0.004;
    dmg += c.toxin * 0.006 + c.antigen * 0.004;
    if (c.pain > k.painT) dmg += 0.003;
    if (c.cold > k.temp || c.hot > k.temp) dmg += 0.002;
    if (c.tired > 0.95) dmg += 0.001;
    var heal = c.hunger < 0.65 && c.sick < 0.3 && c.pain < 0.4 ? 0.004 * (stage >= 4 ? 0.5 : 1) * (env.asleep ? 2 : 1) : 0;
    c.health += (heal - dmg) * dt;

    // clamp
    for (var i = 0; i < DRIVES.length; i++) { var dk = DRIVES[i]; c[dk] = clamp01(c[dk]); }
    c.fat = clamp01(c.fat); c.toxin = clamp01(c.toxin); c.antigen = clamp01(c.antigen);
    c.antibody = clamp01(c.antibody); c.medicine = clamp01(c.medicine); c.adrenaline = clamp01(c.adrenaline);
    c.reward = clamp01(c.reward); c.punish = clamp01(c.punish); c.health = clamp01(c.health);
    if (grump) { c.lonely = 0; c.love = 0; }
  };

  // deltas: {driveOrChem: Δ}
  Chem.apply = function (c, deltas, scale) {
    if (!deltas) return;
    scale = scale == null ? 1 : scale;
    for (var k in deltas) if (Object.prototype.hasOwnProperty.call(deltas, k) && c[k] != null) {
      var v = c[k] + deltas[k] * scale;
      c[k] = k === "health" || k === "fat" || k === "glucose" ? clamp01(v) : clamp01(v);
    }
  };

  var tmp = new Float32Array(SB.N_DRIVES);
  // Returns a shared Float32Array (copy it if you need to keep it).
  Chem.drives = function (c, out) {
    out = out || tmp;
    for (var i = 0; i < DRIVES.length; i++) out[i] = c[DRIVES[i]];
    return out;
  };

  Chem.top = function (c, skip) {
    var bi = 0, bv = -1;
    for (var i = 0; i < DRIVES.length; i++) {
      if (skip && skip[i]) continue;
      var v = c[DRIVES[i]];
      if (v > bv) { bv = v; bi = i; }
    }
    return { i: bi, v: bv, name: DRIVES[bi] };
  };

  Chem.mood = function (c) {
    if (c.sick > 0.45) return "sick";
    if (c.fear > 0.5) return "scared";
    if (c.anger > 0.5) return "angry";
    if (c.pain > 0.5) return "hurt";
    if (c.sleepy > 0.7 || c.tired > 0.8) return "sleepy";
    var worst = Chem.top(c).v;
    if (c.reward > 0.25 || worst < 0.35) return "happy";
    if (worst > 0.7) return "sad";
    return "ok";
  };

  Chem.MOOD_EMOJI = { happy: "😊", ok: "🙂", sad: "😢", sick: "🤢", scared: "😱", angry: "😠", hurt: "🤕", sleepy: "😴" };

  // The face a grown-up smol (tribe and on) wears. It rests neutral and smiles only when it feels good
  // (content, happy, in love, excited); bad feelings show as a frown, worry, anger or sleepy eyes.
  // cur is the face it has now: each threshold leans a little toward keeping it, so a drive hovering on a
  // line doesn't flip the face back and forth (creature.js also holds a face a moment before changing it).
  Chem.FACES = ["neutral", "smile", "sad", "worried", "angry", "tired", "sick", "sleep"];
  Chem.FACE_EMOJI = { neutral: "😐", smile: "🙂", sad: "😢", worried: "😟", angry: "😠", tired: "🥱", sick: "🤢", sleep: "😴" };
  var GOOD_EMOTE = { happy: 1, love: 1, yum: 1, proud: 1, idea: 1 };
  Chem.face = function (c, cur, emote) {
    var k = function (f) { return cur === f ? 0.06 : 0; }; // stickiness for the face it already has
    if (c.sick > 0.45 - k("sick")) return "sick";
    if (c.fear > 0.4 - k("worried")) return "worried";
    if (c.anger > 0.45 - k("angry")) return "angry";
    if (c.pain > 0.5 - k("sad")) return "sad";
    if (c.sleepy > 0.7 - k("tired") || c.tired > 0.8 - k("tired")) return "tired";
    var worst = 0; // the worst need, not counting love (being in love is a good feeling)
    for (var i = 0; i < DRIVES.length; i++) if (DRIVES[i] !== "love" && c[DRIVES[i]] > worst) worst = c[DRIVES[i]];
    if (worst > 0.7 - k("sad")) return "sad";
    if ((emote && GOOD_EMOTE[emote]) || c.reward > 0.2 - k("smile") || c.love > 0.6 - k("smile") || worst < 0.3 + k("smile")) return "smile";
    return "neutral";
  };
})();
