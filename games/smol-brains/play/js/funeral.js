// smol brains — funerals. a smol that dies stays where it fell, and a little while later the tribe gathers
// to say goodbye. how they do it depends on what they know:
//   no fire yet, water nearby → they carry it to the river or the sea and let it drift away (a burning raft once they know fire)
//   fire and a campfire        → a pyre in the campfire; the smoke goes up and they sing
//   builders and up            → they dig a grave at its favourite place (or by the old ruins, or beside the others)
//   nothing at all             → a cairn of stones where it lay
// mourners crowd round, cry, sing if they know song, lay flowers, and remember. deaths close together share one funeral.
(function () {
  "use strict";
  var SB = window.SB, F = (SB.Funeral = {});
  var PLAN = 100;     // game seconds between the first death and the funeral (about two island hours)
  var LEAVE = 900;    // a body nobody is left to bury fades after this long
  var GATHER = 90, RITE = 32, MOURN = 18;
  var V = function () { return SB.V; };

  function smols(game) { return SB.Game.smols(game); }
  function home(game) { return SB.Society.home(game, 0); }
  function walk(game, x, z) { return SB.World.walkable(game.world, x, z, false); }
  function depth(game, x, z) { return SB.World.depthAt(game.world, x, z); }
  function names(list) {
    var n = list.map(function (b) { return b.name; });
    return n.length < 2 ? n[0] || "" : n.slice(0, -1).join(", ") + " and " + n[n.length - 1];
  }
  F.names = names;

  /* ---------------- a death ---------------- */
  // called by creature.js die(), before the "death" event: the smol leaves the living and becomes a body
  F.add = function (game, c, cause) {
    if (!c || c.species !== "smol" || (c.stranger && c.stranger.state !== "joined")) return false;
    game.bodies = game.bodies || [];
    c.body = { t: game.time, cause: cause, gen: c.gen || 0, tier: c.tier || 0 };
    c.corpse = true; c.dying = false; c.asleep = true; c.moving = false; c.plan = null; c.action = null; c.speech = null; c.drownT = 0;
    if (c.chem) c.chem.fear = 0;
    c.gone = true; // out of the living list; it lives on in game.bodies until it's laid to rest
    c.px = c.x; c.pz = c.z; c.y = SB.World.groundY(game.world, c.x, c.z);
    game.bodies.push(c);
    // deaths close together share a funeral
    game.funerals = game.funerals || [];
    var f = game.funerals.filter(function (x) { return x.phase === "plan"; })[0];
    if (!f) { f = { id: (game.funeralN = (game.funeralN || 0) + 1), phase: "plan", ids: [], t0: game.time, at: game.time + PLAN }; game.funerals.push(f); }
    f.ids.push(c.id);
    return true;
  };
  function bodiesOf(game, f) { return (game.bodies || []).filter(function (b) { return f.ids.indexOf(b.id) >= 0; }); }
  F.bodiesOf = bodiesOf;

  /* ---------------- choosing the rite and the place ---------------- */
  F.riteFor = function (game) {
    var live = smols(game), maxT = 0, fire = false, song = false;
    live.forEach(function (c) { maxT = Math.max(maxT, c.tier || 0); if (c.ideas && c.ideas.fire >= 1) fire = true; if (c.ideas && c.ideas.song >= 1) song = true; });
    var camp = campfire(game);
    var r = maxT >= 4 ? "burial" : fire && camp ? "pyre" : waterSpot(game) ? "river" : fire ? "pyre" : "cairn";
    return { rite: r, fire: fire, song: song, tier: maxT };
  };
  function campfire(game) {
    var h = home(game), best = null, bd = 1e9;
    game.world.structures.forEach(function (s) { if (s.kind === "campfire" && s.done) { var d = SB.dist(s.x, s.z, h.x, h.z); if (d < bd) { bd = d; best = s; } } });
    return best && bd < 50 ? best : null;
  }
  // the nearest bank to the village: a dry spot to stand on, with deep enough water right beside it
  function waterSpot(game) {
    var h = home(game);
    if (game._wsT && game._ws !== undefined && game.time - game._wsT < 120) return game._ws;
    var found = null;
    for (var r = 3; r <= 46 && !found; r += 1.5) {
      var steps = Math.max(12, Math.round(r * 3));
      for (var i = 0; i < steps; i++) {
        var a = i / steps * 6.283, x = h.x + Math.sin(a) * r, z = h.z + Math.cos(a) * r;
        if (depth(game, x, z) < 0.45) continue;
        // step back toward the village until there's dry land
        for (var k = 1; k <= 6; k++) {
          var bx = x - Math.sin(a) * k * 0.7, bz = z - Math.cos(a) * k * 0.7;
          if (walk(game, bx, bz) && depth(game, bx, bz) < 0.1) { found = { x: bx, z: bz, wx: x, wz: z }; break; }
        }
        if (found) break;
      }
    }
    game._ws = found; game._wsT = game.time;
    return found;
  }
  function near(game, x, z) { // the closest walkable spot to (x, z)
    if (walk(game, x, z)) return { x: x, z: z };
    for (var r = 1; r < 8; r++) for (var i = 0; i < 8; i++) { var a = i / 8 * 6.283, nx = x + Math.sin(a) * r, nz = z + Math.cos(a) * r; if (walk(game, nx, nz)) return { x: nx, z: nz }; }
    return { x: x, z: z };
  }
  // where a builder tribe lays someone to rest: its favourite place, else by the old ruins, else beside the other graves
  function graveSite(game, list) {
    var h = home(game), b = list[0], why = "";
    var pl = b && b.mind && b.mind.pl ? b.mind.pl.filter(function (p) { return p.k !== "danger" && SB.dist(p.x, p.z, h.x, h.z) < 60; }).sort(function (p, q) { return q.v - p.v; }) : [];
    if (pl.length) { why = "at " + b.name + "'s favourite place, the " + (pl[0].l || pl[0].k); return { p: near(game, pl[0].x + 2, pl[0].z + 2), why: why }; }
    var ruin = (game.sites || []).filter(function (s) { return s.kind === "ruin" && s.found && !s.gone && SB.dist(s.x, s.z, h.x, h.z) < 60; })[0];
    if (ruin) return { p: near(game, ruin.x + 3, ruin.z + 2), why: "beside the old ruins" };
    var gr = game.world.structures.filter(function (s) { return s.kind === "grave"; });
    if (gr.length) { var g = gr[gr.length - 1]; return { p: near(game, g.x + 1.8, g.z), why: "beside the others who went before" }; }
    return { p: near(game, h.x + 7, h.z + 5), why: "on the hill by the village" };
  }

  /* ---------------- the funeral ---------------- */
  function start(game, f) {
    var list = bodiesOf(game, f);
    if (!list.length) { f.phase = "done"; return; }
    var live = smols(game).filter(function (c) { return !c.heldBy && !(c.chem.hunger > 0.85) && !(c.drownT > 0) && !c.raider; });
    if (!live.length) { f.at = game.time + 120; return; } // nobody can come right now; try again later
    var R = F.riteFor(game);
    f.rite = R.rite; f.fire = R.fire; f.song = R.song;
    var site, why = "";
    if (R.rite === "river") { var w = waterSpot(game); site = { x: w.x, z: w.z }; f.wx = w.wx; f.wz = w.wz; why = depth(game, w.wx, w.wz) > 1.2 ? "at the edge of the sea" : "at the river"; }
    else if (R.rite === "pyre") { var cf = campfire(game); site = cf ? { x: cf.x, z: cf.z } : near(game, list[0].x, list[0].z); why = cf ? "at the campfire" : "where " + list[0].name + " fell"; }
    else if (R.rite === "burial") { var gs = graveSite(game, list); site = gs.p; why = gs.why; }
    else { site = near(game, list[0].x, list[0].z); why = "where " + list[0].name + " fell"; }
    f.x = site.x; f.z = site.z; f.where = why; f.list = list; f.names = names(list);
    // who comes: everyone who loved one of them, then the nearest others, up to a crowd of 14
    var loved = [], rest = [];
    live.forEach(function (c) {
      var close = list.some(function (b) { return (SB.Social && SB.Social.opinion(game, c, b) >= SB.Social.FRIEND) || (SB.Game.related && SB.Game.related(game, c, b)) || c.partner === b.id || (c.grief && c.grief.id === b.id); });
      (close ? loved : rest).push(c);
    });
    rest.sort(function (a, b) { return SB.dist(a.x, a.z, f.x, f.z) - SB.dist(b.x, b.z, f.x, f.z); });
    var crowd = loved.concat(rest).slice(0, 14);
    f.mourners = crowd.map(function (c) { return c.id; });
    // bearers: the strongest grown-ups carry the bodies
    var adults = crowd.filter(function (c) { return c.stage >= 2; });
    list.forEach(function (b, i) {
      b.slot = i; var br = adults[i % Math.max(1, adults.length)];
      b.bearer = br && (i < adults.length || list.length <= adults.length * 2) ? br.id : null;
      b.carried = false;
      if (depth(game, b.x, b.z) > 0.6 || !b.bearer) b.bearer = null; // nobody can wade out for it; it's brought along by the others
    });
    f.phase = "gather"; f.t = 0;
    crowd.forEach(function (c, i) { send(game, f, c, i, crowd.length); });
    SB.bus.emit("funeral", { f: f, names: names(list), rite: f.rite, x: f.x, z: f.z, n: list.length });
  }
  function ring(f, i, n) { var a = i / Math.max(1, n) * 6.283 + 0.4, r = 2.6 + (n > 8 ? 0.8 : 0); return { x: f.x + Math.sin(a) * r, z: f.z + Math.cos(a) * r }; }
  function send(game, f, c, i, n) {
    var bodyFor = (game.bodies || []).filter(function (b) { return b.bearer === c.id && !b.carried && !b.laid; })[0];
    if (bodyFor && f.phase === "gather") { SB.Creature.sendTo(c, bodyFor.x, bodyFor.z, game, 40); return; }
    var p = ring(f, i, n);
    if (SB.dist(c.x, c.z, p.x, p.z) > 1.2) SB.Creature.sendTo(c, p.x, p.z, game, 30);
    else { c.facing = Math.atan2(f.x - c.x, f.z - c.z); c.moving = false; }
  }
  function laySpot(f, b, n) { var off = (b.slot - (n - 1) / 2) * 1.3; return { x: f.x + off, z: f.z + (f.rite === "burial" ? 0 : 0.2) }; }

  F.tick = function (game, dt) {
    var fs = game.funerals;
    if (game.bodies && game.bodies.length) tickBodies(game, dt);
    if (!fs || !fs.length) return;
    for (var i = fs.length - 1; i >= 0; i--) {
      var f = fs[i];
      if (f.phase === "plan") { if (game.time >= f.at) start(game, f); continue; }
      if (f.phase === "done") { fs.splice(i, 1); continue; }
      f.t += dt;
      var list = f.list || bodiesOf(game, f), crowd = (f.mourners || []).map(function (id) { return SB.Game.byId(game, id); }).filter(function (c) { return c && c.alive; });
      f.sendT = (f.sendT || 0) - dt;
      var resend = f.sendT <= 0;
      if (resend) f.sendT = 2.5;
      if (f.phase === "gather") {
        list.forEach(function (b) {
          if (b.laid) return;
          var br = b.bearer && SB.Game.byId(game, b.bearer);
          if (!br || !br.alive) b.bearer = null;
          if (b.carried && br) {
            // it rides along behind its bearer
            b.x = br.x - Math.sin(br.facing) * 0.55; b.z = br.z - Math.cos(br.facing) * 0.55;
            if (SB.dist(br.x, br.z, f.x, f.z) < 2.6) { var s = laySpot(f, b, list.length); b.x = s.x; b.z = s.z; b.laid = true; b.carried = false; }
          } else if (br && SB.dist(br.x, br.z, b.x, b.z) < 1.5) { b.carried = true; SB.Creature.sendTo(br, f.x, f.z, game, 60); }
        });
        if (resend) crowd.forEach(function (c, k) { var mine = list.filter(function (b) { return b.bearer === c.id && b.carried; })[0]; if (!mine) send(game, f, c, k, crowd.length); });
        var left = list.filter(function (b) { return !b.laid; });
        // the unbearable ones (in the water, or too many) are brought by the crowd once everyone's there
        if (left.length && left.every(function (b) { return !b.bearer; }) || f.t > GATHER) left.forEach(function (b) { var s = laySpot(f, b, list.length); b.x = s.x; b.z = s.z; b.laid = true; b.carried = false; });
        if (!list.filter(function (b) { return !b.laid; }).length) { f.phase = "rite"; f.t = 0; beginRite(game, f, list); }
      } else if (f.phase === "rite") {
        if (resend) crowd.forEach(function (c, k) { send(game, f, c, k, crowd.length); });
        crowd.forEach(function (c) { if (SB.dist(c.x, c.z, f.x, f.z) < 4.5) { if (!c.anim.emote || c.anim.emote === "sad") SB.Creature.emote(c, "sad", 1.5); SB.Chem.apply(c.chem, { bored: -dt * 0.01 }); } });
        f.lineT = (f.lineT || 1.5) - dt;
        if (f.lineT <= 0 && crowd.length) { f.lineT = 2.2 + game.rng() * 1.6; var who = crowd[game.rng.int(crowd.length)]; if (SB.dist(who.x, who.z, f.x, f.z) < 5) say(game, f, who, list); }
        riteTick(game, f, list, dt);
        if (f.t > RITE) { f.phase = "mourn"; f.t = 0; endRite(game, f, list, crowd); }
      } else if (f.phase === "mourn") {
        if (resend) crowd.forEach(function (c, k) { if (game.rng.chance(0.5)) send(game, f, c, k, crowd.length); });
        f.flowerT = (f.flowerT || 0) - dt;
        if (f.flowerT <= 0 && crowd.length) {
          f.flowerT = 1.8;
          var fl = crowd[game.rng.int(crowd.length)];
          if (SB.FX && !game.offline) SB.FX.burst("hearts", f.x + game.rng.range(-0.8, 0.8), SB.World.groundY(game.world, f.x, f.z) + 0.3, f.z + game.rng.range(-0.8, 0.8), 4, { col: [1, 0.75, 0.85] });
          if (fl && game.rng.chance(0.5)) SB.Creature.say(fl, game.rng.pick(["🌸", "🌼", "for you, " + list[0].name.toLowerCase(), "rest now"]), game);
        }
        if (f.t > MOURN) { finish(game, f, list, crowd); f.phase = "done"; }
      }
    }
  };
  function say(game, f, c, list) {
    var b = list[game.rng.int(list.length)], nm = b.name.toLowerCase(), t;
    if (f.song && game.rng.chance(0.55)) t = "♪ " + game.rng.pick(["la lu " + nm + ", la lu", "sleep now, " + nm, "the sky takes " + nm + " home", "loo-ree, loo-ree", nm + ", " + nm + "..."]) + " ♪";
    else if (c.stage < 2) t = game.rng.pick(["...", "*sniff*", "😢", "?", "hm."]);
    else t = game.rng.pick(["bye " + nm, "*sniff*", nm + " was nice", "i miss you already", "we'll remember", "😢", nm + " shared food with me once"]);
    SB.Creature.say(c, t, game);
    if (/♪/.test(t)) SB.bus.emit("funeralSong", { f: f, c: c });
  }
  function beginRite(game, f, list) {
    f.ritT = 0;
    if (f.rite === "river") list.forEach(function (b, i) { b.x = f.wx + (i - (list.length - 1) / 2) * 0.9; b.z = f.wz; b.drift = true; b.raft = true; b.burning = f.fire; });
    if (f.rite === "pyre") list.forEach(function (b) { b.burning = true; });
    if (f.rite === "burial" || f.rite === "cairn") list.forEach(function (b) { b.sink = 0; });
    SB.bus.emit("funeralRite", { f: f });
  }
  function riteTick(game, f, list, dt) {
    var fx = SB.FX && !game.offline;
    list.forEach(function (b) {
      var gy = SB.World.groundY(game.world, b.x, b.z);
      if (b.burning && fx && game.rng.chance(dt * 8)) { SB.FX.burst("embers", b.x, gy + 0.4, b.z, 3, { r: 0.6 }); if (game.rng.chance(0.3)) SB.FX.burst("smoke", b.x, gy + 0.8, b.z, 1); }
      if (f.rite === "pyre" && f.t > RITE * 0.45 && !b.ash) { b.ash = true; b.gone2 = true; if (fx) { SB.FX.burst("embers", b.x, gy + 0.5, b.z, 24, { r: 0.8 }); SB.FX.burst("sparkle", b.x, gy + 1, b.z, 10); } }
      if (b.sink != null) {
        b.sink = Math.min(1, b.sink + dt / (RITE * 0.5));
        if (fx && game.rng.chance(dt * 4) && b.sink < 1) SB.FX.burst("dust", b.x + game.rng.range(-0.5, 0.5), gy + 0.1, b.z + game.rng.range(-0.5, 0.5), 3);
        if (b.sink >= 1 && !b.gone2) { b.gone2 = true; restingPlace(game, f, b); }
      }
    });
  }
  // a grave for builders, a stone cairn for the very first smols
  function restingPlace(game, f, b) {
    var ep = b.body && b.body.epitaph || ("here lies " + b.name + ".");
    try {
      var gr = SB.World.addStructure(game.world, game, "grave", b.x, b.z, { done: true });
      if (gr) { gr.data = { name: b.name, title: b.title || null, epitaph: ep, died: Math.round(b.body ? b.body.t : game.time), id: b.id, cairn: f.rite === "cairn" }; gr.name = b.name; }
      var graves = game.world.structures.filter(function (s) { return s.kind === "grave"; });
      if (graves.length > 30) SB.World.removeStructure(game.world, graves[0]);
    } catch (e) { }
  }
  function endRite(game, f, list, crowd) {
    list.forEach(function (b) { if (f.rite === "pyre" && !b.gone2) b.gone2 = true; if ((f.rite === "burial" || f.rite === "cairn") && !b.gone2) { b.gone2 = true; restingPlace(game, f, b); } });
  }
  function finish(game, f, list, crowd) {
    var nm = names(list);
    var how = { river: f.fire ? "set " + nm + " adrift on a burning raft" : "let " + nm + " float away down the water", pyre: "gave " + nm + " to the fire", burial: "buried " + nm + " " + f.where, cairn: "piled stones over " + nm }[f.rite];
    crowd.forEach(function (c) {
      SB.Chem.apply(c.chem, { lonely: -0.15 });
      if (c.grief && list.some(function (b) { return b.id === c.grief.id; })) { c.grief.x = f.x; c.grief.z = f.z; }
      if (SB.Mind) SB.Mind.remember(c, game, "loss", "said goodbye to " + nm, 1.1, f.x, f.z, list[0].id);
      if (SB.Social) SB.Social.log(game, c, "🕯", "said goodbye to " + nm);
    });
    if (SB.Social) SB.Social.chronicle(game, "🕯", "the tribe " + how + (crowd.length > 2 ? ". " + crowd.length + " came to say goodbye" : ""));
    // the river and the fire take them; graves stay
    game.bodies = (game.bodies || []).filter(function (b) { return list.indexOf(b) < 0 || (f.rite === "river" && b.drift && !b.away); });
    f.list = null;
    SB.bus.emit("funeralDone", { f: f, names: nm, how: how, n: crowd.length });
  }
  // bodies on the water drift out to sea; untended bodies lie still (and fade, eventually, if nobody's left)
  function tickBodies(game, dt) {
    var out = [];
    for (var i = 0; i < game.bodies.length; i++) {
      var b = game.bodies[i];
      b.px = b.x; b.pz = b.z;
      if (b.drift) {
        // downstream: toward deeper water, and away from home
        var h = home(game), d0 = depth(game, b.x, b.z);
        var gx = depth(game, b.x + 1, b.z) - depth(game, b.x - 1, b.z), gz = depth(game, b.x, b.z + 1) - depth(game, b.x, b.z - 1);
        var ax = b.x - h.x, az = b.z - h.z, al = Math.hypot(ax, az) || 1;
        var vx = gx * 1.5 + ax / al * 0.5, vz = gz * 1.5 + az / al * 0.5, vl = Math.hypot(vx, vz) || 1;
        var nx = b.x + vx / vl * dt * 0.55, nz = b.z + vz / vl * dt * 0.55;
        if (depth(game, nx, nz) > 0.3) { b.x = nx; b.z = nz; }
        b.driftT = (b.driftT || 0) + dt;
        b.y = SB.World.groundY(game.world, b.x, b.z);
        if (b.burning && b.driftT > 14) b.burning = false;
        if (b.driftT > 55 || d0 > 2.4) b.away = true;
        if (b.away) continue;
      } else if (!b.gone2) {
        b.y = SB.World.groundY(game.world, b.x, b.z) - (b.sink || 0) * 0.9;
        if (game.time - b.body.t > LEAVE && !(game.funerals || []).some(function (f) { return f.ids.indexOf(b.id) >= 0 && f.phase !== "plan"; }) && !smols(game).length) continue;
      } else continue;
      out.push(b);
    }
    game.bodies = out;
  }

  /* ---------------- saving ---------------- */
  // bodies aren't saved as bodies: whoever is still waiting gets a quiet grave, so nobody is left lying around
  F.serialize = function (game) {
    var list = (game.bodies || []).filter(function (b) { return !b.drift && !b.gone2; });
    return list.map(function (b) { return { id: b.id, name: b.name, title: b.title || null, x: Math.round(b.x * 10) / 10, z: Math.round(b.z * 10) / 10, t: Math.round(b.body.t), ep: b.body.epitaph || null }; });
  };
  F.revive = function (game, arr) {
    game.bodies = []; game.funerals = [];
    (arr || []).forEach(function (b) {
      if (!b || typeof b.x !== "number" || typeof b.z !== "number") return;
      restingPlace(game, { rite: "burial" }, { id: b.id, name: String(b.name || "a smol"), title: b.title, x: b.x, z: b.z, body: { t: b.t || 0, epitaph: b.ep } });
    });
  };
})();
