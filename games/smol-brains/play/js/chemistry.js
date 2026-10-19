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

  function gene(g, k, d) { return g && g.genes && g.genes[k] != null ? g.genes[k] : d; }
  var clamp01 = SB.clamp01;

  // env = {temp 0..1, dark, asleep, inBed, moving, nearFriends, stage, species}
  Chem.tick = function (c, dt, env, genome) {
    var grump = env.species === "grump";
    var stage = env.stage || 0;
    var baby = stage === 0;
    var met = 0.6 + gene(genome, "metabolism", 0.5) * 0.8;
    if (baby) met *= 1.35;
    if (grump) met *= 0.7;

    // energy: glucose burns, fat tops it up, a shortage makes you hungry
    var burn = 0.0028 * met * (env.moving ? 1.4 : 1) * (env.asleep ? 0.55 : 1);
    c.glucose -= burn * dt;
    if (c.glucose < 0.35 && c.fat > 0) { var conv = Math.min(c.fat, 0.006 * dt); c.fat -= conv; c.glucose += conv * 0.9; }
    if (c.glucose > 0.9) { var store = (c.glucose - 0.9) * 0.05 * dt; c.glucose -= store; c.fat = Math.min(1, c.fat + store); }
    c.glucose = clamp01(c.glucose);
    var appetite = 0.7 + gene(genome, "appetite", 0.5) * 0.6;
    c.hunger += dt * appetite * (0.0024 * met + 0.007 * Math.max(0, 0.35 - c.glucose)) * (env.asleep ? 0.5 : 1);

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
    c.fear -= 0.035 * dt * (1 + gene(genome, "bravery", 0.5));
    c.pain -= 0.025 * dt;
    c.adrenaline += (c.fear - c.adrenaline) * Math.min(1, 0.5 * dt);
    c.anger -= 0.02 * dt;
    c.anger += dt * c.pain * 0.02 * (0.3 + gene(genome, "grumpiness", 0.3));
    if (grump) c.anger += 0.004 * dt;

    // reinforcement chemicals are quick flashes
    c.reward -= c.reward * Math.min(1, 0.6 * dt);
    c.punish -= c.punish * Math.min(1, 0.6 * dt);

    // illness: toxins decay; germs multiply until antibodies catch them; medicine helps both
    var imm = 0.4 + gene(genome, "immunity", 0.5) * 1.2;
    c.toxin -= dt * (0.006 + c.medicine * 0.03);
    c.antigen += dt * c.antigen * 0.012;
    c.antibody += dt * c.antigen * 0.01 * imm;
    var kill = Math.min(c.antigen, dt * (c.antibody * 0.03 + c.medicine * 0.06));
    c.antigen -= kill;
    c.antibody -= dt * 0.002;
    c.medicine -= dt * 0.02;
    var sickT = clamp01(Math.max(c.toxin * 1.6, c.antigen * 1.4));
    c.sick += (sickT - c.sick) * Math.min(1, 0.15 * dt);

    // love only in adults who are doing fine
    if (stage >= 3 && stage < 4 && !grump && c.hunger < 0.6 && c.health > 0.55 && c.sick < 0.3) c.love += dt * 0.003 * (0.5 + gene(genome, "fertility", 0.5));
    else c.love -= dt * 0.01;

    // health: starve, poison, germs, pain and extremes hurt; a calm, fed body heals
    var dmg = 0;
    if (c.hunger > 0.92) dmg += 0.004;
    dmg += c.toxin * 0.006 + c.antigen * 0.004;
    if (c.pain > 0.8) dmg += 0.003;
    if (c.cold > 0.85 || c.hot > 0.85) dmg += 0.002;
    if (c.tired > 0.95) dmg += 0.001;
    var heal = c.hunger < 0.65 && c.sick < 0.3 && c.pain < 0.4 ? 0.004 * (stage >= 4 ? 0.5 : 1) * (env.asleep ? 2 : 1) : 0;
    c.health += (heal - dmg) * dt;

    // clamp
    for (var i = 0; i < DRIVES.length; i++) { var k = DRIVES[i]; c[k] = clamp01(c[k]); }
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
})();
