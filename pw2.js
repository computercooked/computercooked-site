
  /* ---------------- stunned grumps (burst, calm, roar, the stagger perk) ---------------- */
  var stunned = []; // [{ g, until, x, z }] not saved: grumps aren't either
  PW.stun = function (game, g, secs) {
    if (!g || !g.alive || !(secs > 0)) return false;
    var until = game.time + secs;
    for (var i = 0; i < stunned.length; i++) if (stunned[i].g === g) { if (until > stunned[i].until) stunned[i].until = until; stunned[i].x = g.x; stunned[i].z = g.z; return true; }
    stunned.push({ g: g, until: until, x: g.x, z: g.z });
    g.action = null;
    if (SB.Creature && SB.Creature.emote) SB.Creature.emote(g, "huh", Math.min(4, secs));
    emit("stunned", { g: g, secs: secs });
    return true;
  };
  PW.isStunned = function (g) { for (var i = 0; i < stunned.length; i++) if (stunned[i].g === g) return true; return false; };
  function stunFrame(game) {
    for (var i = stunned.length - 1; i >= 0; i--) {
      var e = stunned[i], g = e.g;
      if (!g.alive || g.gone || game.time >= e.until) { stunned.splice(i, 1); continue; }
      g.x = e.x; g.z = e.z; g.action = null; g.thinkT = 0.4; g.vx = 0; g.vz = 0; // held where it stands
    }
  }
  function shove(game, g, fx0, fz0, d) {
    var dx = g.x - fx0, dz = g.z - fz0, l = Math.sqrt(dx * dx + dz * dz) || 1, nx = g.x + dx / l * d, nz = g.z + dz / l * d;
    if (SB.World.walkable(game.world, nx, nz, false)) { g.x = nx; g.z = nz; }
  }

  /* ---------------- casting ---------------- */
  function ok(msg, extra) { var r = { ok: true, msg: msg }; for (var k in extra || {}) r[k] = extra[k]; return r; }
  function fail(msg) { return { ok: false, msg: msg }; }
  function r1(v) { return Math.round(v * 10) / 10; }
  // where "home" is for this smol: your own home, its bed, or the nest
  PW.homeSpot = function (game, c) {
    var h = SB.Home && SB.Home.get ? SB.Home.get(game) : null, name = "home", x, z;
    if (h) { x = h.x; z = h.z; }
    else {
      var bd = SB.Wilds && SB.Wilds.bed && c ? SB.Wilds.bed(game, c) : null;
      if (bd) { x = bd.x; z = bd.z; name = "to its bed"; }
      else if (SB.Society && SB.Society.home) { var n = SB.Society.home(game, 0); if (!n) return null; x = n.x; z = n.z; name = "to the nest"; }
      else return null;
    }
    var W = SB.World, w = game.world, offs = [[1.4, 0.6], [-1.4, 0.6], [0.6, 1.6], [0.6, -1.6], [2.2, 0], [0, 0]];
    for (var i = 0; i < offs.length; i++) if (W.walkable(w, x + offs[i][0], z + offs[i][1], false)) return { x: x + offs[i][0], z: z + offs[i][1], name: name };
    return { x: x, z: z, name: name };
  };
  function easeIll(game, c, n) {
    var p = c.pw; if (!p || !p.ill) return false;
    p.ill.stage -= n; p.ill.w = 0;
    if (p.ill.stage < 1) { PW.recover(game, c, "cured"); return true; }
    return false;
  }
  var slowUntil = 0;
  var CAST = {
    reveal: function (game, o) {
      var best = null, bd = 1e9, s = st(game);
      function see(x, z, what) { var d = SB.dist(x, z, o.x, o.z); if (d > 2.5 && d < bd) { bd = d; best = { x: x, z: z, what: what }; } }
      (game.sites || []).forEach(function (si) { if (si && !si.found) see(si.x, si.z, "a place nobody has found"); });
      if (SB.Loot && SB.Loot.state) { var ch = SB.Loot.state(game).chests; for (var k in ch) if (!ch[k].open) see(ch[k].x, ch[k].z, "a chest nobody has opened"); }
      for (var key in s.stones) { var e = s.stones[key]; if (e.kind === "wordstone" ? !s.heard[key] : !e.seen) see(e.x, e.z, e.kind === "wordstone" ? "a whisper stone" : "a blessing stone"); }
      if (!best) return fail("the light finds nothing hidden, near or far");
      if (o.body && P().setGoal) P().setGoal({ x: best.x, z: best.z, label: "✨ " + best.what, small: true });
      var msg = "🔦 the light shows " + best.what + ", " + Math.round(bd) + " steps off" + (o.body ? ": follow the mark" : "");
      if (!o.body && SB.UI && SB.UI.toast && live(game)) SB.UI.toast(msg, "", 7000, { x: best.x, z: best.z });
      return ok(msg, { found: best });
    },
    ward: function (game, o) {
      var s = st(game);
      s.wards.push({ x: r1(o.x), z: r1(o.z), until: Math.round(game.time + PW.WARD_T * o.k), r: PW.WARD_R });
      while (s.wards.length > PW.WARD_MAX) s.wards.shift();
      wardTick(game);
      return ok("🕯 a ward of light. grumps turn back at its edge for a good while");
    },
    burst: function (game, o) {
      var n = 0;
      near(game, o.x, o.z, 6 * o.k, function (g) { if (g.species !== "grump" || !g.alive) return; PW.stun(game, g, (g.boss ? 2 : 4) * o.k); if (!g.boss) SB.Chem.apply(g.chem, { fear: 0.4 }); n++; });
      if (SB.Render && SB.Render.flash && live(game) && !set(game).noFlash) SB.Render.flash(0.6, true);
      return ok(n ? "💥 " + n + " grump" + (n > 1 ? "s" : "") + " stunned by the light" : "💥 a burst of light. no grump was close", { n: n });
    },
    skin: function (game, o) {
      if (!o.c) return fail("pick a smol first");
      me(o.c).shield = 2 + PW.rank(game, "skin");
      PW.buff(o.c, "shield", 180, game);
      return ok("🛡 lantern skin: the next " + me(o.c).shield + " bites slide off " + (o.body ? "you" : o.c.name));
    },
    recall: function (game, o) {
      var t = o.c, S = inBody(t);
      if (!t) return fail("pick a smol first");
      if (PW.noFastTravel(game)) return fail("survival: the light won't carry anyone. walk it");
      if (S && (S.firstNight || S.nightChase)) return fail("not tonight");
      var h = PW.homeSpot(game, t);
      if (!h) return fail("there is no home to go to");
      if (SB.dist(t.x, t.z, h.x, h.z) < 6) return fail(o.body ? "you are home already" : t.name + " is home already");
      if (S && S.scout != null && P().endScout) P().endScout("🏠 the light carried you off. the grump lost you", 0, "recall");
      burst(game, "sparkle", t.x, (t.y || 0) + 0.8, t.z, 18);
      t.x = h.x; t.z = h.z; if (t.px != null) { t.px = t.x; t.pz = t.z; }
      t.action = null;
      return ok("🏠 the light carries " + (o.body ? "you" : t.name) + " " + h.name, { to: h });
    },
    heal: function (game, o) {
      var done = [];
      function one(c) {
        if (done.indexOf(c) >= 0) return;
        done.push(c);
        SB.Chem.apply(c.chem, { sick: -0.6, pain: -0.6, toxin: -0.5, antigen: -0.5, health: 0.35 * o.k, fear: -0.2 });
        easeIll(game, c, 1);
        if (SB.Creature.emote) SB.Creature.emote(c, "love", 2);
      }
      if (o.c) one(o.c);
      near(game, o.x, o.z, 4.5 * o.k, function (c) { if (c.species === "smol" && c.alive) one(c); });
      if (!done.length) return fail("no smol is close enough to heal");
      return ok("💚 the light mends " + (done.length > 1 ? done.length + " smols" : o.body ? "you" : done[0].name), { n: done.length });
    },
    mend: function (game, o) {
      var t = o.c; if (!t) return fail("pick a smol first");
      var p = me(t), n = (SB.Body && t.body && t.body.wounds ? t.body.wounds.length : 0) + (PW.sprained(t, game) ? 1 : 0);
      if (!n) return fail(o.body ? "you have nothing to mend" : t.name + " has nothing to mend");
      p.bound = 1; p.sprain = 0;
      if (SB.Body) SB.Body.heal(t);
      SB.Chem.apply(t.chem, { pain: -0.5 });
      return ok("🩹 mended, with no scar", { n: n });
    },
    calm: function (game, o) {
      var n = 0, g = 0;
      near(game, o.x, o.z, 6 * o.k, function (c) {
        if (!c.alive) return;
        if (c.species === "smol") { SB.Chem.apply(c.chem, { fear: -0.7, adrenaline: -0.5, punish: -0.3 }); if (c !== o.c) n++; }
        else if (c.species === "grump" && !c.boss) { PW.stun(game, c, 5 * o.k); g++; }
      });
      if (o.c) { SB.Chem.apply(o.c.chem, { fear: -0.7, adrenaline: -0.5 }); PW.buff(o.c, "calm", 60, game); }
      return ok("🌙 calm settles" + (n ? " on " + n + " smol" + (n > 1 ? "s" : "") : "") + (g ? ". " + g + " grump" + (g > 1 ? "s doze" : " dozes") + " off" : ""), { n: n, grumps: g });
    },
    grow: function (game, o) {
      var W = SB.World, w = game.world, n = 0, r = 6 * o.k;
      var BACK = { stump: 1, picked: 1, gone: 1, burnt: 1 };
      (W.nodesNear ? W.nodesNear(w, o.x, o.z, r, function (nd) { return !!BACK[nd.state]; }) || [] : []).forEach(function (nd) {
        nd.state = "ok"; nd.left = null; nd.hp = null; nd.regrowT = 0; nd.grow = null; if (nd.noun === "fire") nd.noun = "plant";
        if (W.markNode) W.markNode(w, nd);
        n++;
      });
      (W.structsNear ? W.structsNear(w, o.x, o.z, r, function (b) { return b.kind === "farm" && b.done && b.data && (b.data.grow || 0) < 1; }) || [] : []).forEach(function (b) { b.data.grow = Math.min(1, (b.data.grow || 0) + 0.5); n++; });
      if (!n) return fail("nothing here needs to grow back");
      burst(game, "sparkle", o.x, ground(game, o.x, o.z) + 0.6, o.z, 20, { r: 3, col: [0.5, 1, 0.6] });
      return ok("🌱 " + n + " thing" + (n > 1 ? "s grow" : " grows") + " back", { n: n });
    },
    share: function (game, o) {
      var from = o.c, to = null, bd = 6.5;
      if (!from) return fail("pick a smol first");
      near(game, from.x, from.z, 6.5, function (c) { if (c === from || c.species !== "smol" || !c.alive) return; var d = SB.dist(c.x, c.z, from.x, from.z); if (d < bd) { bd = d; to = c; } });
      if (o.to) to = o.to;
      if (!to) return fail("nobody is close enough to share with");
      var I = SB.Ideas, got = PW.shareBetween(game, from, to) || PW.shareBetween(game, to, from);
      if (!got) return fail(from.name + " and " + to.name + " already know everything the other does");
      if (SB.Creature.emote) { SB.Creature.emote(got.to, "idea", 2); }
      return ok("💭 " + got.from.name + " showed " + got.to.name + " " + (got.idea ? (I && I.BY_ID[got.idea] ? I.BY_ID[got.idea].name : got.idea) : "how " + SB.Body.BY_ID[got.skill].label + " is done"), got);
    },
    slow: function (game, o) {
      if (!o.body) return fail("slow time works from inside a body");
      slowUntil = game.time + 3 * o.k; game.speed = PW.SLOW;
      return ok("⏳ the island crawls. go!");
    }
  };
  // one memory from a to b: an idea b can hold and doesn't have, or else a level of a's best skill
  PW.shareBetween = function (game, a, b) {
    var I = SB.Ideas, B = SB.Body, id;
    if (I && a.ideas) for (id in a.ideas) if (a.ideas[id] >= 1 && !I.known(b, id) && I.canHold(b, id)) { b.ideas[id] = 1; emit("ideaShared", { from: a, to: b, id: id }); return { from: a, to: b, idea: id }; }
    if (B) {
      var best = null, bl = 0;
      B.SKILLS.forEach(function (s) { var d = B.level(a, s.id) - B.level(b, s.id); if (d > bl) { bl = d; best = s.id; } });
      if (best) { var sk = B.of(b).sk[best] || (B.of(b).sk[best] = { l: 0, x: 0 }); sk.l++; sk.x = 0; emit("skillUp", { c: b, id: best, level: sk.l, shared: true }); return { from: a, to: b, skill: best }; }
    }
    return null;
  };
  PW.noFastTravel = function (game) { return !!(game && game.settings && game.settings.survival); };
  PW.slowed = function (game) { return slowUntil > 0 && !!game && game.time < slowUntil; };
  // cast a power. c: the smol it is about (the body you are in, or the sky's pick); at: {x, z} for a sky cast
  PW.cast = function (game, id, c, at) {
    var n = PW.BY[id], s = st(game), S = inBody(c), body = !!S;
    if (!n || n.kind !== "cast") return fail("no such power");
    if (!s.tree[id]) return fail("the Lantern hasn't remembered " + n.name + " yet");
    var left = PW.cdLeft(game, id);
    if (left > 0) return fail(n.name + " is ready in " + Math.ceil(left) + "s");
    var x = body ? c.x : at ? at.x : c ? c.x : null, z = body ? c.z : at ? at.z : c ? c.z : null;
    if (x == null) return fail("pick a place or a smol first");
    var f = fxOf(game, body ? c : null), pep = n.pep * (1 - Math.min(0.5, f.cost || 0)), sparks = body ? 0 : SB.Game.miracleCost ? SB.Game.miracleCost(game, n.sparks) : n.sparks;
    if (body && S.stam < pep && !godOn(game)) return fail("not enough pep: " + n.name + " takes " + Math.round(pep * 100) + "%");
    if (!body && (game.sparks || 0) < sparks) return fail("not enough sparks ✨ (" + sparks + " needed)");
    var rank0 = PW.rank(game, id);
    var res = CAST[id](game, { c: c || null, x: x, z: z, body: body, S: S, k: 1 + 0.25 * (rank0 - 1) });
    if (!res.ok) return res; // nothing spent on a power that had nothing to do
    if (body) S.stam = Math.max(0, S.stam - (godOn(game) ? 0 : pep)); else if (sparks > 0 && SB.Game.spend) SB.Game.spend(game, sparks);
    s.cd[id] = Math.round(game.time + n.cd * (1 - cdCut(game, body ? c : null)));
    s.casts[id] = (s.casts[id] || 0) + 1;
    if (PW.rank(game, id) > rank0) res.msg += " · " + n.name + " grew stronger (rank " + PW.rank(game, id) + ")";
    if (id !== "grow" && id !== "recall") burst(game, id === "burst" || id === "ward" ? "gold" : "sparkle", x, ground(game, x, z) + 0.8, z, 16, { r: 2.5 });
    snd(id === "burst" ? "whoosh" : "chime", 0.7);
    emit("power", { id: id, c: c || null, x: x, z: z, sky: !body, res: res });
    return res;
  };

  /* ---------------- words of power ---------------- */
  PW.wordLevel = function (game, id) { return st(game).words[id] || 0; };
  PW.shout = function (game, c, id) {
    var w = PW.WORD[id], L = PW.wordLevel(game, id), S = inBody(c), s = st(game);
    if (!w) return fail("no such word");
    if (!L) return fail("you haven't found that word yet. whisper stones teach them");
    if (!S) return fail("a word of power is said from inside a body");
    var left = PW.cdLeft(game, "w:" + id);
    if (left > 0) return fail("your voice needs " + Math.ceil(left) + "s more");
    var n = 0, msg = "";
    if (id === "roar") {
      near(game, c.x, c.z, 4 + L, function (g) { if (g.species !== "grump" || !g.alive) return; if (!g.boss) { shove(game, g, c.x, c.z, 1 + L * 0.5); SB.Chem.apply(g.chem, { fear: 0.15 * L }); } PW.stun(game, g, g.boss ? 0.5 + L * 0.5 : 1 + L); n++; });
      msg = n ? "🦁 ROAR! " + n + " grump" + (n > 1 ? "s stagger" : " staggers") + " back" : "🦁 ROAR! nothing was close enough to hear it";
    } else if (id === "call") {
      var list = [];
      near(game, c.x, c.z, 8 + 4 * L, function (o) { if (o !== c && o.species === "smol" && o.alive && !o.asleep && !o.heldBy && o.stage >= 1) list.push(o); });
      list.sort(function (a, b) { return SB.dist(a.x, a.z, c.x, c.z) - SB.dist(b.x, b.z, c.x, c.z); });
      list.slice(0, 1 + 2 * L).forEach(function (o) { if (SB.Creature.sendTo && SB.Creature.sendTo(o, c.x, c.z, game, 14)) n++; });
      msg = n ? "📣 " + n + " friend" + (n > 1 ? "s are" : " is") + " coming" : "📣 you call. nobody is near enough to hear";
    } else if (id === "hush") {
      PW.buff(c, "hushed", 8 + 4 * L, game);
      n = hushScout(game, c, S) ? 1 : 0;
      msg = n ? "🤫 hush. the grump has lost you" : "🤫 hush. your light dims for a while";
    } else {
      S.stam = Math.min(1, S.stam + 0.25 + 0.15 * L);
      near(game, c.x, c.z, 6, function (o) { if (o !== c && o.species === "smol" && o.alive) { SB.Chem.apply(o.chem, { reward: 0.2, fear: -0.2, bored: -0.2 }); if (SB.Creature.emote) SB.Creature.emote(o, "happy", 2); n++; } });
      PW.buff(c, "cheered", 30 * L, game);
      msg = "🎉 a cheer! pep back" + (n ? ", and " + n + " smol" + (n > 1 ? "s" : "") + " cheered up" : "");
    }
    s.cd["w:" + id] = Math.round(game.time + w.cd * (1 - cdCut(game, c)));
    if (SB.Creature && SB.Creature.say) SB.Creature.say(c, id + "!", game);
    snd(id === "roar" ? "grump" : "chime", 0.7);
    emit("shout", { c: c, id: id, level: L, n: n });
    return ok(msg, { n: n });
  };
  // a grump hunting a hushed smol gives up (not a captain, not the story's own chases)
  function hushScout(game, c, S) {
    if (!S || S.scout == null || S.firstNight || S.nightChase || !P().endScout) return false;
    var g = SB.Game.byId(game, S.scout);
    if (!g || g.boss) return false;
    P().endScout("🤫 the grump lost you in the hush", 1, "hush");
    return true;
  }

  /* ---------------- the stones ---------------- */
  SB.STRUCTS = SB.STRUCTS || {};
  if (!SB.STRUCTS.blessstone) SB.STRUCTS.blessstone = { noun: "wonder", label: "blessing stone", emoji: "🗿", r: 0.5, cost: {}, work: 1, desc: "old, tall and warm to the touch. a smol who touches it carries one blessing away." };
  if (!SB.STRUCTS.wordstone) SB.STRUCTS.wordstone = { noun: "wonder", label: "whisper stone", emoji: "🪨", r: 0.35, cost: {}, work: 1, desc: "put an ear to it. it remembers a word of power." };
  // put the fifteen stones down, once per island, with our own dice. returns how many were placed
  PW.placeStones = function (game) {
    var s = st(game);
    if (s.placed || !game.world || !game.world.structures || !SB.World || !SB.World.walkable) return 0;
    s.placed = 1;
    var w = game.world, W = SB.World, r = SB.rng((hashKey("powers:stones") ^ (game.seed >>> 0)) >>> 0), N = w.T && w.T.N ? w.T.N : 256;
    var hm = SB.Society && SB.Society.home ? SB.Society.home(game, 0) : null;
    if (!hm) hm = { x: N / 2, z: N / 2 };
    var reach = Math.max(18, N / 2 - 8), spots = [], n = 0;
    function spot(minD, maxD) {
      for (var t = 0; t < 400; t++) {
        var a = r() * 6.283, d = minD + r() * Math.max(1, Math.min(maxD, reach) - minD) + (t > 200 ? (r() - 0.5) * 20 : 0), x = hm.x + Math.sin(a) * d, z = hm.z + Math.cos(a) * d, clash = false;
        if (W.inBounds && !W.inBounds(w, x, z)) continue;
        if (!W.walkable(w, x, z, false)) continue;
        if (W.depthAt && W.depthAt(w, x, z) > 0.02) continue;
        for (var i = 0; i < spots.length; i++) if (SB.dist(spots[i].x, spots[i].z, x, z) < 8) clash = true;
        if (clash || SB.dist(x, z, hm.x, hm.z) < 9) continue;
        return { x: r1(x), z: r1(z) };
      }
      return null;
    }
    function put(key, kind, data, minD, maxD) {
      var p = spot(minD, maxD); if (!p) return;
      data.pw = key;
      var b = { id: SB.Game.newId(game), type: "struct", kind: kind, noun: "wonder", x: p.x, z: p.z, rot: (hashKey(key) % 628) / 100, s: 1, done: true, work: 0, need: {}, tribe: 0, builders: [], data: data, born: game.time, name: null };
      w.structures.push(b); spots.push(p);
      s.stones[key] = { id: b.id, x: p.x, z: p.z, kind: kind };
      n++;
    }
    ["a", "b", "c"].forEach(function (k, i) { put("bless-" + k, "blessstone", { set: k }, 14 + i * 6, 34 + i * 14); });
    PW.WORDS.forEach(function (wd) { for (var i = 0; i < 3; i++) put("word-" + wd.id + "-" + (i + 1), "wordstone", { word: wd.id }, 12 + i * 12, 30 + i * 28); });
    emit("stonesPlaced", { n: n });
    return n;
  };
  PW.stoneAt = function (game, c, kind, r) {
    var best = null, bd = r || 4.5;
    game.world.structures.forEach(function (b) { if (b.kind !== kind || !b.data || !b.data.pw) return; var d = SB.dist(b.x, b.z, c.x, c.z); if (d < bd) { bd = d; best = b; } });
    return best;
  };
  // listen to a whisper stone: each one teaches its word one level, once
  PW.hear = function (game, c, b) {
    var s = st(game), key = b && b.data ? b.data.pw : null, wd = b && b.data ? PW.WORD[b.data.word] : null;
    if (!key || !wd) return fail("it's only a stone");
    if (SB.dist(c.x, c.z, b.x, b.z) > 4.5) return fail("get closer");
    if (s.heard[key]) return fail("you have heard this stone already. " + wd.name + " is at level " + PW.wordLevel(game, wd.id));
    s.heard[key] = day(game);
    s.words[wd.id] = Math.min(3, (s.words[wd.id] || 0) + 1);
    emit("wordLearned", { c: c, id: wd.id, level: s.words[wd.id], st: b });
    return ok("🗣 the stone whispers “" + wd.name + "” (level " + s.words[wd.id] + " of 3): " + wd.desc + ". say it from your bag's lantern tab");
  };
  // a blessing stone's small gift, once a day per stone: a boon, and a sickness eased
  PW.touch = function (game, c, b) {
    var s = st(game), key = b && b.data ? b.data.pw : null, e = key ? s.stones[key] : null;
    if (!e || b.kind !== "blessstone") return fail("it's only a stone");
    if (SB.dist(c.x, c.z, b.x, b.z) > 4.5) return fail("get closer");
    e.seen = 1;
    var p = me(c), d = day(game), msg = "🗿 " + PW.SETS[b.data.set] + ". " + (p.bless ? "you carry " + PW.BLESSING[p.bless].name + ": pick another to swap" : "pick a blessing to carry");
    if (e.day !== d) {
      e.day = d;
      PW.buff(c, "boon", 240, game);
      easeIll(game, c, 1);
      msg += " · the stone is warm today: pep comes back faster for a while";
      emit("stoneBoon", { c: c, st: b });
    }
    return ok(msg, { set: b.data.set });
  };
  PW.blessingOf = function (c) { return c && c.pw && PW.BLESSING[c.pw.bless] ? PW.BLESSING[c.pw.bless] : null; };
  PW.offered = function (game, c) { var b = PW.stoneAt(game, c, "blessstone"); return b ? PW.BLESS.filter(function (x) { return x.set === b.data.set; }) : []; };
  PW.bless = function (game, c, id) {
    var bl = PW.BLESSING[id], b = PW.stoneAt(game, c, "blessstone");
    if (!bl) return fail("no such blessing");
    if (!b) return fail("blessings are given at a blessing stone. find one and touch it");
    if (b.data.set !== bl.set) return fail("this stone doesn't hold " + bl.name + ". " + PW.SETS[bl.set] + " does");
    var p = me(c), was = p.bless;
    if (was === id) return fail("you carry " + bl.name + " already");
    p.bless = id; stamp++;
    st(game).stones[b.data.pw].seen = 1;
    emit("blessed", { c: c, id: id, was: was || null });
    return ok(bl.icon + " " + c.name + " carries " + bl.name + " now: " + bl.desc + (was ? " (" + PW.BLESSING[was].name + " is left at the stone)" : ""));
  };

  /* ---------------- skill perks ---------------- */
  PW.bodyLevel = function (c) { return SB.Body && c ? SB.Body.total(c) : 0; };
  PW.perkOf = function (c, skill, lvl) { var p = c && c.pw, v = p && p.perks && p.perks[skill] ? p.perks[skill][lvl] : null, i = PW.PERK_LEVELS.indexOf(+lvl); return v != null && PW.PERKS[skill] && i >= 0 ? PW.PERKS[skill][i][v] : null; };
  // the picks this smol has earned and not made yet: [{ skill, lvl }]
  PW.perkOpen = function (c) {
    var out = [];
    if (!SB.Body || !c) return out;
    SB.Body.SKILLS.forEach(function (s) { PW.PERK_LEVELS.forEach(function (lv) { if (PW.PERKS[s.id] && SB.Body.level(c, s.id) >= lv && !PW.perkOf(c, s.id, lv)) out.push({ skill: s.id, lvl: lv }); }); });
    return out;
  };
  PW.pickPerk = function (game, c, skill, lvl, opt) {
    var i = PW.PERK_LEVELS.indexOf(+lvl), L = PW.PERKS[skill];
    if (!L || i < 0 || !L[i][opt]) return fail("no such perk");
    if (!SB.Body || SB.Body.level(c, skill) < lvl) return fail("that takes " + SB.Body.BY_ID[skill].label + " level " + lvl);
    if (PW.perkOf(c, skill, lvl)) return fail("already picked. an ember clears a skill's perks");
    var p = me(c); (p.perks[skill] || (p.perks[skill] = {}))[lvl] = +opt; stamp++;
    emit("perk", { c: c, skill: skill, lvl: +lvl, opt: +opt });
    return ok("⭐ " + L[i][opt][0] + ": " + L[i][opt][1]);
  };
  PW.resetPerks = function (game, c, skill) {
    var p = me(c);
    if (!p.perks[skill] || !Object.keys(p.perks[skill]).length) return fail("no perks picked there");
    if (PW.points(game) < 1) return fail("clearing a skill's perks takes an ember to spend");
    delete p.perks[skill]; st(game).spent += 1; stamp++;
    emit("perkReset", { c: c, skill: skill });
    return ok("the perks for " + SB.Body.BY_ID[skill].label + " are yours to pick again");
  };

  /* ---------------- sickness ---------------- */
  PW.illOf = function (c) { var p = c && c.pw; return p && p.ill && PW.ILL[p.ill.id] ? p.ill : null; };
  PW.immune = function (game, c, id) { var p = c && c.pw; return !!(p && p.immune && p.immune[id] >= day(game)); };
  PW.catchIll = function (game, c, id, quiet) {
    var d = PW.ILL[id]; if (!d || !c || !c.alive) return false;
    var p = me(c);
    if (p.ill || PW.immune(game, c, id) || PW.has(c, "braced", game) || godOn(game)) return false;
    p.ill = { id: id, t0: Math.round(game.time), stage: 1, heal: 0, w: 0 };
    if (!quiet) { tell(game, c, d.icon + " " + (inBody(c) ? "you have" : c.name + " has") + " " + d.name + " (" + d.cause + "). rest, or take " + label(d.cure)); if (inBody(c)) snd("sick", 0.6); }
    emit("illness", { c: c, id: id });
    return true;
  };
  PW.recover = function (game, c, how) {
    var p = me(c), ill = p.ill; if (!ill) return false;
    p.ill = null; p.immune[ill.id] = day(game) + PW.IMMUNE_DAYS;
    SB.Chem.apply(c.chem, { sick: -0.5, antigen: -0.5, toxin: -0.3 });
    tell(game, c, "🌤 " + (inBody(c) ? "you are" : c.name + " is") + " over " + PW.ILL[ill.id].name + ". it won't come back for a good while");
    emit("recovered", { c: c, id: ill.id, how: how || "rest" });
    return true;
  };
  function illCap(p) {
    var ill = p.ill; if (!ill) return 1;
    var k = ill.stage, per = ill.id === "sniffles" ? 0.12 : ill.id === "daze" ? 0.12 : ill.id === "rot" ? 0.08 : ill.id === "dims" ? 0 : 0.1;
    return 1 - per * k;
  }

  /* ---------------- wounds and care ---------------- */
  PW.sprained = function (c, game) { game = game || cur(); var p = c && c.pw; return !!(p && p.sprain > 0 && game && p.sprain > game.time); };
  PW.sprain = function (game, c) { var p = me(c); if (PW.sprained(c, game)) return false; p.sprain = Math.round(game.time + PW.SPRAIN); emit("wound", { c: c, kind: "sprain" }); return true; };
  PW.scars = function (c) { return (c && c.pw && c.pw.scars) || 0; };
  function hasCut(c) { return !!(SB.Body && SB.Body.has(c, "cut")); }
  function wounded(c, game) { return !!(c.body && c.body.wounds && c.body.wounds.length) || PW.sprained(c, game); }

  /* ---------------- remedies and brews: making and using ---------------- */
  PW.costText = function (rc) { var out = []; for (var k in rc.in) out.push(rc.in[k] + " " + label(k)); return out.join(", ") + (rc.at ? ", by a fire" : ""); };
  PW.whyNotMake = function (game, c, id) {
    var rc = PW.RECIPE[id];
    if (!rc || !K()[id]) return "no such thing";
    if (c.tier < 2) return "it takes hands: a tool-user and up";
    for (var k in rc.in) if (Sv().count(c, k, true) < rc.in[k]) return "it needs " + PW.costText(rc);
    if (rc.at === "fire" && !(Sv().nearFire && Sv().nearFire(c, game)) && !Sv().has(c, "torch")) return "do this by a fire";
    return "";
  };
  PW.make = function (game, c, id) {
    var why = PW.whyNotMake(game, c, id), rc = PW.RECIPE[id];
    if (why) return fail(why);
    for (var k in rc.in) Sv().take(c, k, rc.in[k]);
    var n = 1 + (rc.group !== "brew" && roll(c, "medExtra", fxOf(game, c).medExtra) ? 1 : 0);
    give(game, c, id, n);
    if (c.stats) c.stats.crafted = (c.stats.crafted || 0) + 1;
    emit("craft", { c: c, id: "herbal", item: { kind: id }, pov: !!inBody(c), remedy: true });
    return ok("made " + (n > 1 ? "two " + label(id) + "s" : "a " + label(id)) + ": " + K()[id].desc, { n: n });
  };
  PW.usable = function (kind) { return !!PW.RECIPE[kind]; };
  PW.useLabel = function (kind) { return kind === "bandage" ? "bind your cut with the bandage" : kind === "splint" ? "set your sprain with the splint" : kind === "poultice" ? "put the poultice on" : kind === "kit" ? "use the healer's kit" : kind === "chew" ? "chew the bark" : kind === "crittercharm" ? "rub the critter charm" : "drink your " + label(kind); };
  // use one from the bag. nothing is used up when it had nothing to do
  PW.use = function (game, c, kind) {
    if (!PW.usable(kind) || !Sv().count(c, kind, true)) return fail("you have none");
    var p = me(c), ill = PW.illOf(c), B = SB.Body, msg = "", keep = false;
    function cures(id) { return !!ill && PW.ILL[ill.id].cure === id; }
    if (kind === "bandage") {
      if (!hasCut(c)) return fail("no cut to bind");
      B.heal(c, "cut"); p.bound = 1; msg = "🩹 bound clean. it will leave no scar"; keep = roll(c, "medSave", fxOf(game, c).medSave);
    } else if (kind === "splint") {
      if (!PW.sprained(c, game)) return fail("nothing is sprained");
      p.sprain = 0; msg = "🦴 set and strapped. you can run again"; keep = roll(c, "medSave", fxOf(game, c).medSave);
    } else if (kind === "poultice") {
      if (!hasCut(c) && !cures("poultice")) return fail("no wound to put it on");
      if (hasCut(c)) { B.heal(c, "cut"); p.bound = 1; }
      if (cures("poultice")) PW.recover(game, c, "cured");
      msg = "🌿 the poultice draws it clean"; keep = roll(c, "medSave", fxOf(game, c).medSave);
    } else if (kind === "chew") {
      if (B) B.heal(c, "bruise");
      SB.Chem.apply(c.chem, { pain: -0.5 }); msg = "🪵 bitter. the ache fades";
    } else if (kind === "kit") {
      if (!ill && !wounded(c, game)) return fail("you are not hurt or sick");
      if (B) B.heal(c);
      p.bound = 1; p.sprain = 0;
      if (ill) PW.recover(game, c, "cured");
      SB.Chem.apply(c.chem, { health: 0.2, pain: -0.6 }); msg = "🧺 patched up, top to tail";
    } else if (kind === "bracetea") {
      PW.buff(c, "braced", 600, game); msg = "🫖 braced: nothing will catch you for a good while";
    } else if (kind === "tummytea" || kind === "broth" || kind === "syrup" || kind === "suntea") {
      if (kind === "broth") PW.buff(c, "warm", 120, game);
      else if (!cures(kind)) return fail(ill ? "that won't shift " + PW.ILL[ill.id].name + ". it wants " + label(PW.ILL[ill.id].cure) : "you feel fine. save it");
      if (cures(kind)) PW.recover(game, c, "cured");
      msg = kind === "broth" ? "🥣 warm right through" : "that did it";
    } else {
      // a brew: one at a time
      if (PW.has(c, "fizz", game)) return fail("your tummy is still fizzing from the last brew. give it " + Math.ceil(PW.left(c, "fizz", game)) + "s");
      if (kind === "cleartea") { var n = PW.clear(c) + (PW.sprained(c, game) ? 0 : 0); SB.Chem.apply(c.chem, { fear: -0.5, pain: -0.3 }); msg = n ? "🫗 clear as a bell: " + n + " bad feeling" + (n > 1 ? "s" : "") + " washed off" : "🫗 clear as a bell"; }
      else {
        var bw = PW.BREWS[kind];
        PW.buff(c, bw[0], bw[1], game);
        if (bw[0] === "shield") p.shield = Math.max(p.shield || 0, 3);
        msg = K()[kind].emoji + " " + K()[kind].desc;
      }
      PW.buff(c, "fizz", PW.FIZZ, game);
    }
    if (!keep) Sv().take(c, kind, 1);
    emit("medicine", { c: c, kind: kind, kept: !!keep });
    return ok(msg + (keep ? " (and it's good for another go)" : ""));
  };
  // a smol who knows herb lore tends you: wounds bound clean, a sickness eased, a little heart back. two shells if you have them
  PW.healerNear = function (game, c) {
    var best = null, bd = 4.5, I = SB.Ideas;
    if (!I) return null;
    near(game, c.x, c.z, 4.5, function (o) { if (o === c || o.species !== "smol" || !o.alive || o.asleep || !I.known(o, "herbal")) return; var d = SB.dist(o.x, o.z, c.x, c.z); if (d < bd) { bd = d; best = o; } });
    return best;
  };
  PW.TEND_FEE = 2;
  PW.tend = function (game, c, healer) {
    if (!healer || !healer.alive || !SB.Ideas || !SB.Ideas.known(healer, "herbal")) return fail("nobody here knows herb lore");
    if (SB.dist(c.x, c.z, healer.x, healer.z) > 5) return fail(healer.name + " is over there");
    if (!PW.illOf(c) && !wounded(c, game) && c.chem.health > 0.95) return fail(healer.name + " looks you over. you're fine");
    if (healer._tendT > game.time) return fail(healer.name + " is still washing its paws. in a moment");
    healer._tendT = game.time + 60;
    var p = me(c), paid = (c.purse || 0) >= PW.TEND_FEE;
    if (paid) { c.purse = Math.round(((c.purse || 0) - PW.TEND_FEE) * 100) / 100; healer.purse = Math.round(((healer.purse || 0) + PW.TEND_FEE) * 100) / 100; }
    if (SB.Body) SB.Body.heal(c);
    p.bound = 1; p.sprain = 0;
    easeIll(game, c, paid ? 2 : 1);
    SB.Chem.apply(c.chem, { health: paid ? 0.3 : 0.15, pain: -0.5 });
    if (SB.Creature.emote) SB.Creature.emote(healer, "love", 2);
    emit("tended", { c: c, healer: healer, paid: paid });
    return ok("🌿 " + healer.name + " tends you" + (paid ? " for " + PW.TEND_FEE + " " + (SB.Loot && SB.Loot.moneyIcon ? SB.Loot.moneyIcon(game) : "🐚") : " for nothing (you have no money)") + ": bound clean, and you feel better", { paid: paid });
  };
