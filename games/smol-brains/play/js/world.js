/* smol brains — world.js
   The Valley: terrain, decor, day/night, weather, temperature, objects (physics, plants, critters,
   rot, eggs), grump nights, and the kind-specific effects of using things (SB.World.use).
   Terrain and decor are deterministic from game.seed (regenerated on load, never saved). */
(function () {
  "use strict";
  var SB = window.SB;
  var World = (SB.World = {});

  var K = SB.KINDS, ROOMS = SB.ROOMS;
  var W = SB.WORLD_W, RW = SB.ROOM_W, NR = ROOMS.length, DL = SB.DAY_LENGTH;
  var STEP = 10, NG = Math.floor(W / STEP) + 1;
  var GRAV = 1100, MAXV = 1400;
  var START_HOUR = 7; // game.time 0 = 07:00 on day 1
  var CAP_FOOD = 14, CAP_FOOD_SHAKE = 18, CAP_FOOD_MACHINE = 22, CAP_SHROOM = 6, CAP_HERB = 3, CAP_FISH = 2;
  var TAU = Math.PI * 2;

  var RI = {};
  for (var ri = 0; ri < NR; ri++) RI[ROOMS[ri].id] = ri;
  function rx(room, dx) { return RI[room] * RW + dx; }

  /* ---------------- layout ---------------- */

  // Fixed machines/plants. Ground is flattened under each of them.
  var FIXED = [
    { kind: "grumpcave", room: "hollow", dx: 230 },
    { kind: "shroomring", room: "hollow", dx: 640 },
    { kind: "shroomring", room: "woods", dx: 190 },
    { kind: "herbpatch", room: "woods", dx: 420 },
    { kind: "berrybush", room: "woods", dx: 610 },
    { kind: "teleporter", room: "woods", dx: 800, data: { pad: "A" } },
    { kind: "appletree", room: "meadow", dx: 110 },
    { kind: "incubator", room: "meadow", dx: SB.HOME_X - 120 - RI.meadow * RW },
    { kind: "bed", room: "meadow", dx: 540 },
    { kind: "berrybush", room: "meadow", dx: 650 },
    { kind: "appletree", room: "meadow", dx: 760 },
    { kind: "carrotpatch", room: "meadow", dx: 855 },
    { kind: "warpgate", room: "lab", dx: 95 },
    { kind: "computer", room: "lab", dx: 225 },
    { kind: "snackbox", room: "lab", dx: 360 },
    { kind: "medbot", room: "lab", dx: 490 },
    { kind: "bed", room: "lab", dx: 620 },
    { kind: "bed", room: "lab", dx: 715 },
    { kind: "fan", room: "lab", dx: 830 },
    { kind: "trampoline", room: "pond", dx: 150 },
    { kind: "appletree", room: "pond", dx: 290 },
    { kind: "heater", room: "peak", dx: 300 },
    { kind: "teleporter", room: "peak", dx: 720, data: { pad: "B" } }
  ];
  var LOOSE = [
    { kind: "plush", room: "meadow", dx: 250 },
    { kind: "musicbox", room: "meadow", dx: 400 },
    { kind: "ball", room: "meadow", dx: 600 },
    { kind: "top", room: "lab", dx: 425 },
    { kind: "ball", room: "pond", dx: 730 },
    { kind: "plush", room: "peak", dx: 460 },
    // a few starting snacks near home
    { kind: "apple", room: "meadow", dx: 395 },
    { kind: "apple", room: "meadow", dx: 505 },
    { kind: "berry", room: "meadow", dx: 470 },
    { kind: "carrot", room: "meadow", dx: 590 }
  ];
  var POND_X0 = rx("pond", 400), POND_X1 = rx("pond", 660);
  var FLATS = FIXED.map(function (f) { return { x: rx(f.room, f.dx), w: K[f.kind].r + 18 }; })
    .concat([{ x: (POND_X0 + POND_X1) / 2, w: (POND_X1 - POND_X0) / 2 + 30 }]);

  // Critter populations to maintain.
  var CRITTERS = [
    { kind: "butterfly", room: RI.meadow, n: 3 },
    { kind: "butterfly", room: RI.pond, n: 2 },
    { kind: "beetle", room: RI.woods, n: 3 },
    { kind: "beetle", room: RI.hollow, n: 2 }
  ];

  // Plants: growth interval (s per stock item), max stock, drop chance per second while stocked.
  var PLANTS = {
    appletree: { grow: 45, max: 3, drop: 1 / 35 },
    berrybush: { grow: 32, max: 4, drop: 1 / 30 },
    carrotpatch: { grow: 50, max: 3, drop: 1 / 40 },
    herbpatch: { grow: 60, max: 2, drop: 1 / 45 },
    shroomring: { grow: 40, max: 3, drop: 1 / 28 }
  };
  var MACHINE_COOL = { snackbox: 6, medbot: 25 };

  // Terrain profile per room: base height, hill amplitude, optional mountain bump.
  var PROF = [
    { base: 474, amp: 18 }, // hollow: rocky ravine
    { base: 462, amp: 14 }, // woods
    { base: 452, amp: 12 }, // meadow: gentle rolling
    { base: 470, amp: 0 }, // lab: flat floor
    { base: 464, amp: 6 }, // pond
    { base: 458, amp: 14, peak: -42 } // peak: a snowy hill
  ];

  var SEASONS = ["spring", "summer", "autumn", "winter"];
  var WEATHER_KINDS = ["sun", "cloudy", "rain", "storm", "snow"];
  var SEASON_W = [
    [0.35, 0.25, 0.3, 0.05, 0.05],
    [0.6, 0.2, 0.1, 0.1, 0],
    [0.25, 0.3, 0.25, 0.15, 0.05],
    [0.3, 0.25, 0.05, 0.05, 0.35]
  ];
  var WEATHER_DIM = { sun: 1, cloudy: 0.88, rain: 0.78, storm: 0.62, snow: 0.86 };

  /* ---------------- small helpers ---------------- */

  function ss(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
  function sign(v) { return v < 0 ? -1 : 1; }
  function emit(ev, data) { SB.bus.emit(ev, data); }
  function isFood(kind) { var k = K[kind]; return !!(k && k.noun === "food" && kind.indexOf("shroom") !== 0); } // glowcaps count as shrooms for caps
  function rng(game) { return game.rng; }

  function groundAt(g, x) {
    if (!(x > 0)) x = 0; else if (x > W) x = W;
    var f = x / STEP, i = f | 0;
    if (i >= NG - 1) return g[NG - 1];
    return g[i] + (g[i + 1] - g[i]) * (f - i);
  }
  function roomIndex(x) { var i = Math.floor(x / RW); return i < 0 ? 0 : i >= NR ? NR - 1 : i; }

  World.groundY = function (world, x) { return groundAt(world.ground, x); };
  World.slope = function (world, x) { return (groundAt(world.ground, x + 5) - groundAt(world.ground, x - 5)) / 10; };
  World.roomAt = function (world, x) { return roomIndex(x); };
  World.room = function (world, x) { return ROOMS[roomIndex(x)]; };
  World.inWater = function (world, x) {
    var ws = world.water;
    for (var i = 0; i < ws.length; i++) if (x > ws[i].x0 && x < ws[i].x1) return ws[i];
    return null;
  };

  function dayness(h) {
    if (h >= 7.5 && h <= 18.5) return 1;
    if (h >= 5 && h < 7.5) return ss((h - 5) / 2.5);
    if (h > 18.5 && h <= 21) return 1 - ss((h - 18.5) / 2.5);
    return 0;
  }

  World.clock = function (game) {
    var t = game.time / DL + START_HOUR / 24;
    var di = Math.floor(t), hour = (t - di) * 24;
    var hh = Math.floor(hour), mm = Math.floor((hour - hh) * 60);
    return {
      day: di + 1, dayIndex: di, hour: hour, minute: mm, night: hour < 6 || hour >= 20,
      season: SEASONS[Math.floor(di / 2) % 4],
      label: "Day " + (di + 1) + " · " + (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm
    };
  };

  // The weather a spot actually shows (Frost Peak turns rain to snow, the Lab is indoors).
  World.weatherAt = function (world, x) {
    var i = roomIndex(x), k = world.weather.kind;
    if (i === RI.lab) return "indoor";
    if (i === RI.peak && (k === "rain" || k === "storm")) return "snow";
    return k;
  };

  World.tempAt = function (world, x) {
    var i = roomIndex(x), lx = x - i * RW, base = ROOMS[i].temp;
    if (lx < 150 && i > 0) base = SB.lerp(ROOMS[i - 1].temp, base, 0.5 + lx / 300);
    else if (RW - lx < 150 && i < NR - 1) base = SB.lerp(base, ROOMS[i + 1].temp, 0.5 - (RW - lx) / 300);
    var indoor = i === RI.lab;
    var t = base - 0.15 * (1 - world.daylight) * (indoor ? 0.5 : 1);
    if (!indoor) {
      var w = World.weatherAt(world, x), it = world.weather.intensity;
      if (w === "rain" || w === "storm") t -= 0.1 * it;
      else if (w === "snow") t -= 0.25 * it;
      else if (w === "sun" && i === RI.pond) t += 0.05 * it;
    }
    var hs = world._heat, fs = world._fan, j, d;
    for (j = 0; j < hs.length; j++) {
      d = Math.abs(x - hs[j].x);
      if (d < 220) t += (0.3 + (hs[j].data.on > 0 ? 0.15 : 0)) * (1 - d / 220);
    }
    for (j = 0; j < fs.length; j++) {
      d = Math.abs(x - fs[j].x);
      if (d < 200) t -= (0.12 + (fs[j].data.on > 0 ? 0.2 : 0)) * (1 - d / 200);
    }
    return t < 0 ? 0 : t > 1 ? 1 : t;
  };

  /* ---------------- terrain + decor (deterministic from seed) ---------------- */

  function terrainRng(game) { return SB.rng((Math.imul((game.seed | 0) ^ 0x5eed, 2654435761) >>> 0) || 7); }

  function genGround(world, tr) {
    var g = world.ground, hp = [], i, k, x;
    for (i = 0; i < NR; i++) hp.push({ l1: tr.range(380, 620), l2: tr.range(150, 260), p1: tr() * TAU, p2: tr() * TAU });
    function prof(i, x) {
      var p = PROF[i], h = hp[i];
      var y = p.base + p.amp * (0.62 * Math.sin(x * TAU / h.l1 + h.p1) + 0.38 * Math.sin(x * TAU / h.l2 + h.p2));
      if (p.peak) y += p.peak * Math.sin(Math.PI * SB.clamp01((x - i * RW) / RW));
      return y;
    }
    var B = 120;
    for (k = 0; k < NG; k++) {
      x = k * STEP;
      i = roomIndex(x);
      var d = x - i * RW, h;
      if (d < B && i > 0) h = SB.lerp(prof(i - 1, x), prof(i, x), ss((d + B) / (2 * B)));
      else if (RW - d < B && i < NR - 1) h = SB.lerp(prof(i, x), prof(i + 1, x), ss((x - (i + 1) * RW + B) / (2 * B)));
      else h = prof(i, x);
      g[k] = h;
    }
    // flat zones under fixed things
    for (var f = 0; f < FLATS.length; f++) {
      var fx = FLATS[f].x, fw = FLATS[f].w, target = groundAt(g, fx), M = 40;
      var k0 = Math.max(0, Math.floor((fx - fw - M) / STEP)), k1 = Math.min(NG - 1, Math.ceil((fx + fw + M) / STEP));
      for (k = k0; k <= k1; k++) {
        var dd = Math.abs(k * STEP - fx);
        g[k] = dd <= fw ? target : SB.lerp(target, g[k], ss((dd - fw) / M));
      }
    }
    // the pond: a shallow, wadeable dip
    var surf = Math.max(groundAt(g, POND_X0), groundAt(g, POND_X1)) + 3;
    for (k = Math.ceil(POND_X0 / STEP); k <= Math.floor(POND_X1 / STEP); k++) {
      var u = (k * STEP - POND_X0) / (POND_X1 - POND_X0);
      g[k] += 24 * Math.pow(Math.sin(Math.PI * u), 0.7);
    }
    for (k = 0; k < NG; k++) g[k] = SB.clamp(g[k], 395, 505);
    world.water = [{ x0: POND_X0, x1: POND_X1, y: surf }];
  }

  function nearFixed(x, gap) {
    for (var i = 0; i < FLATS.length; i++) if (Math.abs(x - FLATS[i].x) < FLATS[i].w + gap) return true;
    return false;
  }

  function genDecor(world, tr) {
    var out = (world.decor = []);
    function add(type, x, s, layer, v, y, extra) {
      var o = { type: type, x: x, y: y == null ? groundAt(world.ground, x) : y, s: s, room: roomIndex(x), layer: layer, v: v | 0 };
      if (extra) for (var k in extra) o[k] = extra[k];
      out.push(o);
      return o;
    }
    function spot(lo, hi, gap, noWater) {
      var x = lo;
      for (var t = 0; t < 10; t++) {
        x = tr.range(lo, hi);
        if (gap && nearFixed(x, gap)) continue;
        if (noWater && x > POND_X0 - 30 && x < POND_X1 + 30) continue;
        break;
      }
      return x;
    }
    function many(n, type, room, gap, layer, smin, smax, vmax, noWater) {
      var R = RI[room] * RW;
      for (var i = 0; i < n; i++) add(type, spot(R + 20, R + RW - 20, gap, noWater), tr.range(smin, smax), layer, tr.int(vmax), null);
    }
    var R, i, x;

    // every room gets a signpost (v = room index)
    for (i = 0; i < NR; i++) add("sign", i * RW + 45, 1, "back", i);

    // Grump Hollow: cave, dark rocks, dead trees, crystals, bones
    R = RI.hollow * RW;
    add("cave_mouth", rx("hollow", 230), 1.25, "back", 0);
    many(7, "rock", "hollow", 30, "back", 1.1, 2.2, 2);
    many(3, "tree", "hollow", 50, "back", 0.8, 1.1, 1); // v forced below
    for (i = out.length - 3; i < out.length; i++) out[i].v = 2; // dead trees
    many(6, "crystal", "hollow", 10, "back", 0.6, 1.3, 1);
    many(4, "bones", "hollow", 10, "front", 0.7, 1.1, 3);
    many(8, "grass", "hollow", 0, "front", 0.6, 1, 1);
    for (i = out.length - 8; i < out.length; i++) out[i].v = 2; // dry grass

    // Mushroom Woods: dark trees, giant mushrooms
    many(9, "tree", "woods", 40, "back", 0.9, 1.5, 1);
    for (i = out.length - 9; i < out.length; i++) out[i].v = 1; // dark trees
    many(5, "mushroom_big", "woods", 40, "back", 0.8, 1.6, 3);
    many(4, "rock", "woods", 20, "back", 0.7, 1.2, 2);
    many(14, "grass", "woods", 0, "front", 0.7, 1.2, 1);
    for (i = out.length - 14; i < out.length; i++) out[i].v = 1;
    many(5, "flower", "woods", 10, "front", 0.6, 0.9, 1);
    for (i = out.length - 5; i < out.length; i++) out[i].v = 5; // bluebells

    // Nest Meadow: flowers, bushes, background trees, the nest/hatchery, lamps
    add("nest", rx("meadow", SB.HOME_X - 120 - RI.meadow * RW), 1, "back", 0);
    many(3, "tree", "meadow", 60, "back", 1, 1.4, 1);
    many(5, "bush", "meadow", 30, "back", 0.8, 1.3, 2);
    many(26, "flower", "meadow", 0, "front", 0.6, 1.1, 5);
    many(22, "grass", "meadow", 0, "front", 0.7, 1.2, 1);
    add("lamp", rx("meadow", 440), 1, "back", 1);
    add("lamp", rx("meadow", 700), 1, "back", 1);

    // The Lab: indoors. lab_wall spans the room (x = centre, w, h = ceiling height above floor).
    R = RI.lab * RW;
    var lg = groundAt(world.ground, R + 450);
    add("lab_wall", R + 450, 1, "back", 0, lg, { w: RW - 20, h: 330 });
    for (i = 0; i < 3; i++) add("window", R + 150 + i * 300, 1, "back", i, lg - 235);
    add("screen", rx("lab", 225), 1.2, "back", 0, lg - 150); // big board above the Word Machine
    add("screen", rx("lab", 560), 0.8, "back", 1, lg - 165);
    add("screen", rx("lab", 770), 0.8, "back", 2, lg - 160);
    for (i = 0; i < 4; i++) add("pipe", R + 80 + i * 230 + tr.range(-20, 20), 1, "back", i % 2, lg - 300);
    for (i = 0; i < 4; i++) add("lamp", R + 120 + i * 220, 1, "back", 0, lg - 320); // v0 = ceiling lamp
    for (i = 0; i < 5; i++) add("cable", spot(R + 40, R + RW - 40, 15), tr.range(0.7, 1.3), "front", tr.int(3), lg);

    // Sunny Pond: dock, reeds, lily pads, palms
    var wy = world.water[0].y;
    add("dock", POND_X0 - 10, 1, "back", 0, wy, { w: 120 });
    for (i = 0; i < 12; i++) {
      x = tr() < 0.5 ? tr.range(POND_X0 - 40, POND_X0 + 30) : tr.range(POND_X1 - 30, POND_X1 + 50);
      add("reeds", x, tr.range(0.7, 1.3), i % 3 === 0 ? "front" : "back", tr.int(2));
    }
    for (i = 0; i < 5; i++) add("lily", tr.range(POND_X0 + 50, POND_X1 - 30), tr.range(0.7, 1.1), "front", tr.int(2), wy);
    many(2, "tree", "pond", 50, "back", 1.1, 1.4, 1, true);
    for (i = out.length - 2; i < out.length; i++) out[i].v = 3; // palms
    many(4, "rock", "pond", 20, "back", 0.6, 1, 2, true);
    many(8, "grass", "pond", 0, "front", 0.6, 1, 1, true);
    for (i = out.length - 8; i < out.length; i++) out[i].v = 3; // dune grass
    many(5, "flower", "pond", 10, "front", 0.6, 1, 5, true);

    // Frost Peak: pines, snowdrifts, ice crystals, snowy rocks
    many(12, "pine", "peak", 35, "back", 0.8, 1.6, 3);
    many(8, "snowdrift", "peak", 0, "front", 0.7, 1.4, 2);
    many(5, "crystal", "peak", 15, "back", 0.6, 1.2, 1);
    for (i = out.length - 5; i < out.length; i++) out[i].v = 1; // ice
    many(4, "rock", "peak", 20, "back", 0.7, 1.3, 1);
    for (i = out.length - 4; i < out.length; i++) out[i].v = 2; // snowy rock

    out.sort(function (a, b) { return a.layer === b.layer ? a.x - b.x : a.layer === "back" ? -1 : 1; });
  }

  // Rebuild ground, water and decor from the seed (call after load).
  World.regen = function (world, game) {
    var tr = terrainRng(game);
    world.ground = new Float32Array(NG);
    genGround(world, tr);
    genDecor(world, tr);
    return world;
  };

  /* ---------------- world object ---------------- */

  function blank() {
    return {
      rooms: ROOMS,
      ground: new Float32Array(NG), water: [], decor: [], objects: [],
      weather: { kind: "sun", t: DL * 0.4, intensity: 0.7, target: 0.7, next: null, flash: 0 },
      light: 1, daylight: 1, night: false, hour: START_HOUR, dayIndex: 0, season: "spring",
      temp: 0, wind: 0, windTarget: 0.1, pads: [], nightGrumps: 0,
      // transient (not saved)
      _grumpT: 10, _critT: 5, _fishT: 30, _houseT: 0, _food: 0, _herb: 0, _fish: 0,
      _inc: [], _heat: [], _fan: [], _cave: null, _pending: []
    };
  }

  function refreshCache(world) {
    world._inc = []; world._heat = []; world._fan = []; world._cave = null;
    var os = world.objects;
    for (var i = 0; i < os.length; i++) {
      var k = os[i].kind;
      if (k === "incubator") world._inc.push(os[i]);
      else if (k === "heater") world._heat.push(os[i]);
      else if (k === "fan") world._fan.push(os[i]);
      else if (k === "grumpcave" && !world._cave) world._cave = os[i];
    }
  }
  var CACHED = { incubator: 1, heater: 1, fan: 1, grumpcave: 1 };

  function populate(world, game) {
    var r = rng(game), i, f, o;
    for (i = 0; i < FIXED.length; i++) {
      f = FIXED[i];
      var data = {};
      if (f.data) for (var k in f.data) data[k] = f.data[k];
      var P = PLANTS[f.kind];
      if (P) { data.timer = r.range(5, P.grow); data.stock = f.kind === "appletree" ? 2 : 1; }
      o = World.add(world, game, f.kind, rx(f.room, f.dx), undefined, data);
      if (f.kind === "teleporter") world.pads.push(o.id);
    }
    for (i = 0; i < LOOSE.length; i++) World.add(world, game, LOOSE[i].kind, rx(LOOSE[i].room, LOOSE[i].dx));
    for (i = 0; i < CRITTERS.length; i++) for (var n = 0; n < CRITTERS[i].n; n++) spawnCritter(world, game, CRITTERS[i]);
  }

  World.create = function (game) {
    var world = blank();
    World.regen(world, game);
    populate(world, game);
    updateClock(world, game, true);
    world.season = SEASONS[Math.floor(world.dayIndex / 2) % 4];
    return world;
  };

  World.add = function (world, game, kind, x, y, data) {
    var def = K[kind];
    if (!def) throw new Error("unknown kind " + kind);
    x = SB.clamp(x, def.r, W - def.r);
    var rest = y == null;
    if (rest) y = groundAt(world.ground, x) - def.r;
    var o = {
      id: SB.Game.newId(game), kind: kind, noun: def.noun, x: x, y: y, vx: 0, vy: 0, r: def.r,
      fixed: !!def.fixed, heldBy: null, age: 0, onGround: rest, data: data || {}
    };
    if (def.critter) o.data.room = roomIndex(x);
    world.objects.push(o);
    if (CACHED[kind]) refreshCache(world);
    return o;
  };

  World.remove = function (world, obj) {
    var i = world.objects.indexOf(obj);
    if (i < 0) return false;
    world.objects.splice(i, 1);
    if (CACHED[obj.kind]) refreshCache(world);
    return true;
  };

  World.near = function (world, x, y, r, filter) {
    var out = [], os = world.objects, r2 = r * r;
    for (var i = 0; i < os.length; i++) {
      var o = os[i], dx = o.x - x, dy = o.y - y;
      if (dx * dx + dy * dy <= r2 && (!filter || filter(o))) out.push(o);
    }
    return out;
  };

  World.byKind = function (world, kind) {
    var out = [], os = world.objects;
    for (var i = 0; i < os.length; i++) if (os[i].kind === kind) out.push(os[i]);
    return out;
  };

  /* ---------------- time & weather ---------------- */

  function updateClock(world, game, silent) {
    var t = game.time / DL + START_HOUR / 24;
    var di = Math.floor(t), hour = (t - di) * 24;
    world.hour = hour;
    world.daylight = dayness(hour);
    var w = world.weather;
    var dim = 1 - (1 - (WEATHER_DIM[w.kind] || 1)) * w.intensity;
    world.light = (0.12 + 0.88 * world.daylight) * dim;
    world.temp = -0.15 * (1 - world.daylight);
    var night = hour < 6 || hour >= 20;
    if (silent) { world.dayIndex = di; world.night = night; return; }
    if (di !== world.dayIndex) {
      world.dayIndex = di;
      world.season = SEASONS[Math.floor(di / 2) % 4];
      emit("day", { day: di + 1, season: world.season });
    }
    if (night !== world.night) {
      world.night = night;
      if (night) {
        world.nightGrumps = 0;
        world._grumpT = rng(game).range(6, 15);
        emit("night", { day: di + 1 });
      } else {
        var n = world.nightGrumps;
        if (n > 0) {
          game.stats.grumpNights = (game.stats.grumpNights || 0) + 1;
          if (SB.Game && SB.Game.unlock) SB.Game.unlock(game, "grump");
          if (SB.Game && SB.Game.note) SB.Game.note(game, "Dawn! The grumps slink home. 🌅");
        }
        world.nightGrumps = 0;
        emit("dawn", { day: di + 1, grumps: n });
      }
    }
  }

  function pickWeather(world, r) {
    var ws = SEASON_W[Math.floor(world.dayIndex / 2) % 4], x = r(), acc = 0;
    for (var i = 0; i < ws.length; i++) { acc += ws[i]; if (x < acc) return WEATHER_KINDS[i]; }
    return "sun";
  }

  function updateWeather(world, game, dt) {
    var w = world.weather, r = rng(game);
    w.t -= dt;
    if (w.t <= 0 && !w.next) {
      var nk = pickWeather(world, r);
      if (nk === w.kind) { w.t = r.range(0.3, 0.6) * DL; w.target = r.range(0.5, 1); }
      else { w.next = nk; w.target = 0; }
    }
    if (w.next && w.intensity < 0.05) {
      w.kind = w.next; w.next = null;
      w.target = r.range(0.5, 1);
      w.t = r.range(0.3, 0.6) * DL;
      world.windTarget = (r() < 0.5 ? -1 : 1) * (w.kind === "storm" ? r.range(0.6, 1) : w.kind === "rain" || w.kind === "snow" ? r.range(0.2, 0.5) : r.range(0, 0.25));
      emit("weather", { kind: w.kind });
    }
    var rate = w.next ? 0.35 : 0.15;
    w.intensity += (w.target - w.intensity) * Math.min(1, dt * rate);
    if (w.flash > 0) w.flash = Math.max(0, w.flash - dt * 2.5);
    if (w.kind === "storm" && w.intensity > 0.4 && r() < dt * 0.12 * w.intensity) {
      w.flash = 1;
      emit("thunder", { x: r() * W, power: w.intensity });
    }
    world.wind += (world.windTarget - world.wind) * Math.min(1, dt * 0.2);
  }

  function rainy(world) {
    var k = world.weather.kind;
    return (k === "rain" || k === "storm") && world.weather.intensity > 0.3;
  }

  /* ---------------- spawning ---------------- */

  function countShrooms(world, ring) {
    var n = 0, os = world.objects;
    for (var i = 0; i < os.length; i++) if (os[i].kind.indexOf("shroom_") === 0 && Math.abs(os[i].x - ring.x) < 150) n++;
    return n;
  }

  function canSpawn(world, plant, item, cap) {
    if (plant.kind === "shroomring") return countShrooms(world, plant) < CAP_SHROOM;
    if (item === "herb") return world._herb < CAP_HERB;
    if (isFood(item)) return world._food < cap;
    return true;
  }

  function spawnFromPlant(world, game, p) {
    var r = rng(game), k = p.kind, item, x, o;
    var gy = groundAt(world.ground, p.x);
    if (k === "shroomring") {
      item = r() < 0.5 ? "shroom_red" : "shroom_blue";
      x = p.x + r.range(-46, 46);
      o = World.add(world, game, item, x);
    } else if (k === "appletree") {
      o = World.add(world, game, "apple", p.x + r.range(-28, 28), gy - 95);
      o.vx = r.range(-20, 20);
    } else if (k === "berrybush") {
      o = World.add(world, game, "berry", p.x + r.range(-16, 16), p.y - 8);
      o.vx = r.range(-70, 70); o.vy = -150;
    } else {
      item = K[k].spawns;
      o = World.add(world, game, item, p.x + r.range(-14, 14), gy - 6);
      o.vx = r.range(-60, 60); o.vy = -260;
    }
    if (isFood(o.kind)) world._food++;
    if (o.kind === "herb") world._herb++;
    p.data.stock = Math.max(0, (p.data.stock || 0) - 1);
    emit("spawn", { obj: o, from: p });
    return o;
  }

  // Force a plant to drop something (tutorial: "an apple drops from the tree"). force ignores stock + caps.
  World.shake = function (world, game, plant, force) {
    if (!plant || !PLANTS[plant.kind]) return null;
    plant.data.shake = 0.6;
    if (!force) {
      if (!(plant.data.stock > 0)) return null;
      countStuff(world);
      if (!canSpawn(world, plant, K[plant.kind].spawns, CAP_FOOD_SHAKE)) return null;
    }
    return spawnFromPlant(world, game, plant);
  };

  function spawnCritter(world, game, spec) {
    var r = rng(game), R = spec.room * RW, x = R + r.range(80, RW - 80);
    for (var t = 0; t < 5 && World.inWater(world, x); t++) x = R + r.range(80, RW - 80);
    var o;
    if (spec.kind === "butterfly") {
      o = World.add(world, game, "butterfly", x, groundAt(world.ground, x) - r.range(80, 180), { room: spec.room, t: r() * 10 });
      o.data.by = o.y;
    } else {
      o = World.add(world, game, "beetle", x, undefined, { room: spec.room, dir: r() < 0.5 ? -1 : 1, spd: 20, turnT: 1 });
    }
    return o;
  }

  function fishJump(world, game) {
    var r = rng(game), wt = world.water[0];
    if (!wt) return;
    var x = r.range(wt.x0 + 30, wt.x1 - 30);
    var toLeft = x - wt.x0 < wt.x1 - x;
    var edge = toLeft ? wt.x0 - r.range(30, 90) : wt.x1 + r.range(30, 90);
    var o = World.add(world, game, "fish", x, wt.y - 4);
    o.vy = -430;
    o.vx = (edge - x) / (2 * 430 / GRAV);
    o.data.flop = 3;
    world._fish++; world._food++;
    emit("splash", { x: x, y: wt.y, obj: o });
  }

  /* ---------------- per-tick pieces ---------------- */

  function countStuff(world) {
    var os = world.objects, f = 0, h = 0, fi = 0;
    for (var i = 0; i < os.length; i++) {
      var k = os[i].kind;
      if (isFood(k)) { f++; if (k === "fish") fi++; }
      else if (k === "herb") h++;
    }
    world._food = f; world._herb = h; world._fish = fi;
  }

  function physics(world, o, dt) {
    var bouncy = !!K[o.kind].bouncy, r = o.r;
    if (o.onGround && o.vx === 0 && o.vy === 0) {
      var rest = groundAt(world.ground, o.x) - r, wt = World.inWater(world, o.x);
      if (wt) rest = Math.min(rest, wt.y - r * 0.55);
      if (Math.abs(o.y - rest) < 0.5 && !(bouncy && Math.abs(World.slope(world, o.x)) > 0.06)) return;
    }
    o.vy += GRAV * dt;
    if (o.vy > MAXV) o.vy = MAXV; else if (o.vy < -MAXV) o.vy = -MAXV;
    if (o.vx > MAXV) o.vx = MAXV; else if (o.vx < -MAXV) o.vx = -MAXV;
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    if (o.x < r) { o.x = r; o.vx = Math.abs(o.vx) * 0.5; }
    else if (o.x > W - r) { o.x = W - r; o.vx = -Math.abs(o.vx) * 0.5; }
    if (o.y < r) { o.y = r; if (o.vy < 0) o.vy = 0; }
    var floor = groundAt(world.ground, o.x) - r, water = World.inWater(world, o.x);
    if (water) floor = Math.min(floor, water.y - r * 0.55); // things float
    if (o.y >= floor) {
      o.y = floor;
      if (bouncy && o.vy > 140) {
        if (o.vy > 260) emit("bounce", { obj: o, v: o.vy });
        o.vy = -o.vy * 0.62; o.vx *= 0.92; o.onGround = false;
      } else {
        if (!o.onGround && o.vy > 500) emit("thud", { obj: o, v: o.vy });
        o.vy = 0; o.onGround = true;
        if (bouncy && !water) {
          var sl = World.slope(world, o.x);
          o.vx += sl * GRAV * 0.35 * dt;
          o.vx *= 1 - Math.min(1, 0.8 * dt);
          if (Math.abs(o.vx) < 4 && Math.abs(sl) < 0.06) o.vx = 0;
        } else {
          o.vx *= Math.max(0, 1 - (water ? 2 : 8) * dt);
          if (Math.abs(o.vx) < 3) o.vx = 0;
        }
      }
    } else o.onGround = false;
  }

  function threatNear(game, x, y, r) {
    var cs = game.creatures, best = null, bd = r * r;
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i];
      if (!c.alive) continue;
      var dx = c.x - x, dy = c.y - 20 - y, d2 = dx * dx + dy * dy;
      if (d2 < bd) { bd = d2; best = c; }
    }
    return best;
  }

  function critterRoom(o) {
    var d = o.data;
    if (d.room == null || o.x < d.room * RW - 40 || o.x > (d.room + 1) * RW + 40) d.room = roomIndex(o.x);
    return d.room * RW;
  }

  function tickFly(world, game, o, dt) {
    var d = o.data, r = rng(game);
    if (!(d.t >= 0)) d.t = r() * 10;
    d.t += dt;
    var R = critterRoom(o), lo = R + 30, hi = R + RW - 30;
    var gy = groundAt(world.ground, o.x) - o.r;
    var th = threatNear(game, o.x, o.y, 75);
    if (th) {
      var s = o.x >= th.x ? 1 : -1;
      d.landed = 0; d.flee = 1.2;
      d.tx = SB.clamp(o.x + s * 220, lo, hi);
      d.ty = gy - 130;
    }
    if (d.landed > 0) {
      d.landed -= dt;
      o.vx = 0;
      o.y += (gy - o.y) * Math.min(1, 4 * dt);
      d.by = o.y;
      if (d.landed <= 0 && (world.night || rainy(world))) d.landed = 3;
      return;
    }
    if (d.tx == null || Math.abs(d.tx - o.x) < 15 || r() < dt * 0.15) {
      d.tx = r.range(lo, hi);
      d.ty = groundAt(world.ground, d.tx) - r.range(45, 200);
    }
    var sp = d.flee > 0 ? 150 : 50, want = d.tx > o.x ? sp : -sp;
    o.vx += (want - o.vx) * Math.min(1, 2.5 * dt) + world.wind * 20 * dt;
    o.x += o.vx * dt;
    if (o.x < lo) { o.x = lo; o.vx = Math.abs(o.vx); }
    else if (o.x > hi) { o.x = hi; o.vx = -Math.abs(o.vx); }
    if (!(d.by >= 0)) d.by = o.y;
    d.by += (d.ty - d.by) * Math.min(1, 1.2 * dt);
    o.y = d.by + Math.sin(d.t * 7) * 7;
    if (o.y > gy) o.y = gy;
    if (o.y < 15) o.y = 15;
    o.vy = 0; o.onGround = false;
    if (!(d.flee > 0) && (world.night || r() < dt * 0.04 || (rainy(world) && r() < dt * 0.3))) d.landed = r.range(3, 7);
  }

  function tickCrawl(world, game, o, dt) {
    var d = o.data, r = rng(game);
    var gy = groundAt(world.ground, o.x) - o.r;
    if (o.y < gy - 3 || o.vy < 0) o.onGround = false;
    if (!o.onGround) { physics(world, o, dt); return; } // thrown or dropped
    var R = critterRoom(o), lo = R + 20, hi = R + RW - 20;
    var th = threatNear(game, o.x, o.y, 60);
    if (th) { d.dir = o.x >= th.x ? 1 : -1; d.flee = 0.8; d.spd = 110; }
    else if (!(d.flee > 0)) {
      d.turnT = (d.turnT || 0) - dt;
      if (d.turnT <= 0) {
        d.turnT = r.range(1.5, 5);
        d.dir = r() < 0.5 ? -1 : 1;
        d.spd = r() < 0.25 ? 0 : r.range(14, 34);
      }
    }
    o.vx = (d.dir || 1) * (d.spd || 0);
    var nx = o.x + o.vx * dt;
    if (nx < lo || nx > hi || World.inWater(world, nx)) { d.dir = -(d.dir || 1); nx = SB.clamp(o.x, o.r, W - o.r); }
    o.x = nx;
    o.y = groundAt(world.ground, o.x) - o.r;
    o.vy = 0;
  }

  function tickPlant(world, game, o, dt) {
    var P = PLANTS[o.kind], d = o.data, r = rng(game);
    var rate = rainy(world) && roomIndex(o.x) !== RI.lab ? 2 : 1;
    if (!(d.stock >= 0)) d.stock = 0;
    if (!(d.timer >= 0)) d.timer = P.grow;
    if (d.stock < P.max) {
      d.timer -= dt * rate;
      if (d.timer <= 0) { d.timer = P.grow * r.range(0.8, 1.2); d.stock++; }
    }
    if (d.stock > 0 && r() < P.drop * dt * rate && canSpawn(world, o, K[o.kind].spawns, CAP_FOOD)) spawnFromPlant(world, game, o);
  }

  function tickEgg(world, game, o, dt) {
    var d = o.data;
    if (!(d.progress >= 0)) d.progress = 0;
    var rate = 0, warmth = 0, inInc = false, i;
    for (i = 0; i < world._inc.length; i++) {
      var inc = world._inc[i];
      if (Math.abs(o.x - inc.x) < inc.r + 26 && Math.abs(o.y - inc.y) < 60) { inInc = true; break; }
    }
    if (d.starter) {
      // tutorial pacing: only the hand (or cuddles) hatch it; the incubator makes it glow and wobble invitingly
      if (inInc) warmth = 0.5;
      d.hintT = (d.hintT || 0) + dt;
      if (d.hintT > 3.5) { d.hintT = 0; if (d.wobble < 0.45) d.wobble = 0.45; }
    } else {
      if (o.heldBy) { /* carried: base rate only */ } else if (inInc) { rate = 1 / 75; warmth = 1; }
      else {
        for (i = 0; i < world._heat.length; i++) if (Math.abs(o.x - world._heat[i].x) < 170) { rate = 1 / 200; warmth = 0.6; break; }
        if (!rate) {
          var t = World.tempAt(world, o.x);
          if (t > 0.45) { rate = (t - 0.45) / 0.55 / 500; warmth = t * 0.3; }
        }
      }
    }
    if (!d.starter && rate < 1 / 900) rate = 1 / 900; // every egg hatches eventually
    d.progress = Math.min(1, d.progress + rate * dt);
    d.warmth = (d.warmth || 0) + (warmth - (d.warmth || 0)) * Math.min(1, dt * 2);
    d.wobble = (d.wobble || 0) * Math.max(0, 1 - 1.5 * dt);
    if (rate > 0) { var base = 0.1 + 0.4 * d.progress * d.progress; if (d.wobble < base) d.wobble = base; }
    if (d.progress >= 1) world._pending.push(o);
  }

  var TIMERS = ["playing", "spin", "pop", "on", "boing", "shake", "zap", "flee", "flop", "wordT"];
  function decayTimers(d, dt) {
    for (var i = 0; i < TIMERS.length; i++) {
      var k = TIMERS[i];
      if (d[k] > 0) { d[k] -= dt; if (d[k] < 0) d[k] = 0; }
    }
  }

  function housekeeping(world, game) {
    var os = world.objects;
    for (var i = os.length - 1; i >= 0; i--) {
      var o = os[i];
      if (typeof o.heldBy === "number") {
        var c = null, cs = game.creatures;
        for (var j = 0; j < cs.length; j++) if (cs[j].id === o.heldBy) { c = cs[j]; break; }
        if (!c || !c.alive) { o.heldBy = null; o.onGround = false; }
      }
      if (!isFinite(o.x) || !isFinite(o.y)) { o.x = SB.HOME_X; o.y = 100; o.vx = o.vy = 0; o.onGround = false; }
    }
  }

  /* ---------------- tick ---------------- */

  World.tick = function (world, dt, game) {
    var r = rng(game), i;
    updateClock(world, game, false);
    updateWeather(world, game, dt);
    countStuff(world);

    var os = world.objects;
    for (i = os.length - 1; i >= 0; i--) {
      var o = os[i];
      if (!o) continue;
      var def = K[o.kind], d = o.data;
      o.age += dt;
      decayTimers(d, dt);
      if (def.rots) {
        if (o.age > def.rots * 1.5 && o.heldBy == null) {
          World.remove(world, o);
          if (isFood(o.kind)) world._food--;
          else if (o.kind === "herb") world._herb--;
          continue;
        }
        if (o.age > def.rots && !d.rotten) d.rotten = true;
      }
      if (o.fixed) { if (PLANTS[o.kind]) tickPlant(world, game, o, dt); continue; }
      if (o.heldBy != null) continue;
      if (def.critter === "fly") tickFly(world, game, o, dt);
      else if (def.critter === "crawl") tickCrawl(world, game, o, dt);
      else physics(world, o, dt);
      if (o.kind === "egg") tickEgg(world, game, o, dt);
    }
    // eggs held by the hand still count warmEgg progress; hatch any that are ready
    for (i = 0; i < os.length; i++) if (os[i].kind === "egg" && os[i].heldBy != null && os[i].data.progress >= 1) world._pending.push(os[i]);
    var pend = world._pending;
    for (i = 0; i < pend.length; i++) {
      var egg = pend[i];
      if (os.indexOf(egg) < 0) continue;
      if (egg.heldBy === "hand" && game.hand && game.hand.heldId === egg.id) { game.hand.heldId = null; game.hand.heldType = null; }
      egg.heldBy = null;
      if (SB.Game && SB.Game.hatch) SB.Game.hatch(game, egg); else World.remove(world, egg);
    }
    pend.length = 0;

    // critter populations
    world._critT -= dt;
    if (world._critT <= 0) {
      world._critT = r.range(12, 20);
      for (i = 0; i < CRITTERS.length; i++) {
        var spec = CRITTERS[i];
        if (spec.kind === "butterfly" && world.night) continue;
        var n = 0;
        for (var j = 0; j < os.length; j++) if (os[j].kind === spec.kind && roomIndex(os[j].x) === spec.room) n++;
        if (n < spec.n) spawnCritter(world, game, spec);
      }
    }

    // fish
    world._fishT -= dt;
    if (world._fishT <= 0) {
      world._fishT = r.range(25, 55);
      if (world._fish < CAP_FISH && world._food < CAP_FOOD) fishJump(world, game);
    }

    // grumps
    if (world.night && world._cave && SB.Game && SB.Game.spawnGrump && ((game.tutorial && game.tutorial.done) || world.dayIndex >= 1)) {
      world._grumpT -= dt;
      if (world._grumpT <= 0) {
        world._grumpT = r.range(18, 26);
        var max = Math.min(1 + Math.floor(world.dayIndex / 2), 3), alive = 0, cs = game.creatures;
        for (i = 0; i < cs.length; i++) if (cs[i].alive && cs[i].species === "grump") alive++;
        if (alive < max && world.nightGrumps < max * 2) {
          if (world.nightGrumps === 0 && SB.Game.note) SB.Game.note(game, "Something stirs in Grump Hollow… 👺");
          world.nightGrumps++;
          SB.Game.spawnGrump(game, world._cave.x + r.range(-10, 10));
        }
      }
    }

    world._houseT -= dt;
    if (world._houseT <= 0) { world._houseT = 2; housekeeping(world, game); }
  };

  /* ---------------- eggs ---------------- */

  World.warmEgg = function (world, game, egg, amount) {
    if (!egg || egg.kind !== "egg") return 0;
    var d = egg.data;
    var amt = amount != null ? amount : d.starter ? 0.22 : 0.05;
    d.progress = Math.min(1, (d.progress || 0) + amt);
    d.wobble = 1;
    d.warmth = Math.max(d.warmth || 0, 0.8);
    emit("eggWarm", { obj: egg, progress: d.progress });
    return d.progress;
  };

  /* ---------------- using things ---------------- */

  function releaseFrom(game, obj) {
    var h = obj.heldBy;
    if (h == null) return;
    if (h === "hand") { if (game.hand && game.hand.heldId === obj.id) { game.hand.heldId = null; game.hand.heldType = null; } }
    else {
      var cs = game.creatures;
      for (var i = 0; i < cs.length; i++) if (cs[i].id === h && cs[i].holding === obj.id) cs[i].holding = null;
    }
    obj.heldBy = null;
  }

  function addTo(dst, src, mul) {
    if (!src) return;
    for (var k in src) dst[k] = (dst[k] || 0) + src[k] * (mul == null ? 1 : mul);
  }

  function machineSpawn(world, game, obj, c, item, res) {
    var d = obj.data;
    if (game.time < (d.readyAt || 0)) { res.msg = "empty"; return; }
    countStuff(world);
    if (isFood(item) && world._food >= CAP_FOOD_MACHINE) { res.msg = "full"; return; }
    var s = c ? sign(c.x - obj.x) : 1;
    var o = World.add(world, game, item, obj.x + s * 10, obj.y - 12);
    o.vx = s * 140; o.vy = -320;
    d.readyAt = game.time + MACHINE_COOL[obj.kind];
    d.pop = 0.6;
    emit("spawn", { obj: o, from: obj });
  }

  function teachWord(c, r) {
    var pool = SB.VERB_WORDS.concat(SB.DRIVE_WORDS), fresh = [];
    var vocab = (c && c.vocab) || {};
    for (var i = 0; i < pool.length; i++) if (!(vocab[pool[i]] >= 1)) fresh.push(pool[i]);
    return r.pick(fresh.length ? fresh : pool);
  }

  World.use = function (world, game, obj, verb, c) {
    var res = { deltas: {}, chem: {}, consumed: false, teach: null, teleport: null, jump: false, msg: null };
    if (typeof verb === "number") verb = SB.VERBS[verb];
    if (!obj || world.objects.indexOf(obj) < 0) { res.msg = "gone"; return res; }
    var k = obj.kind, def = K[k] || {}, d = obj.data, r = rng(game);
    var away = c ? (obj.x >= c.x ? 1 : -1) : r() < 0.5 ? -1 : 1;
    var i, o;

    if (verb === "eat") {
      if (def.food) {
        if (c && c.species === "grump") {
          res.deltas.hunger = def.food.hunger || -0.2;
        } else if (d.rotten) {
          addTo(res.deltas, def.food, 0.4);
          addTo(res.chem, def.chem, 0.5);
          res.chem.antigen = (res.chem.antigen || 0) + 0.25;
          res.deltas.pain = (res.deltas.pain || 0) + 0.2; // yuck right away, so the lesson lands on the meal
          res.msg = "yuck";
        } else {
          addTo(res.deltas, def.food);
          addTo(res.chem, def.chem);
          if (def.chem && def.chem.toxin) { res.deltas.pain = (res.deltas.pain || 0) + 0.3; res.msg = "yuck"; } // red shrooms taste awful
        }
        res.consumed = true;
        releaseFrom(game, obj);
        World.remove(world, obj);
      }
    } else if (verb === "play" || verb === "hit") {
      var hit = verb === "hit";
      switch (k) {
        case "snackbox": if (!hit) machineSpawn(world, game, obj, c, "cake", res); break;
        case "medbot": if (!hit) machineSpawn(world, game, obj, c, "medkit", res); break;
        case "computer":
          if (!hit) { res.teach = teachWord(c, r); res.msg = res.teach; d.word = res.teach; d.wordT = 4; d.pop = 0.6; }
          break;
        case "heater": if (!hit) { res.deltas.cold = -0.5; res.deltas.hot = 0.1; d.on = 3; } break;
        case "fan": if (!hit) { res.deltas.hot = -0.5; res.deltas.cold = 0.1; d.on = 3; } break;
        case "trampoline":
          if (!hit) { res.deltas.bored = -0.45; res.deltas.tired = 0.1; res.jump = true; d.boing = 0.5; }
          break;
        case "teleporter":
          if (!hit) {
            var other = null;
            for (i = 0; i < world.pads.length; i++) if (world.pads[i] !== obj.id) { other = SB.Game.byId(game, world.pads[i]); if (other) break; }
            if (other) { res.teleport = other.x; d.zap = 0.8; other.data.zap = 0.8; }
          }
          break;
        case "musicbox":
          if (!hit) {
            d.playing = 4;
            emit("music", { obj: obj, c: c });
            if (SB.Chem && SB.Chem.apply) {
              var cs = game.creatures;
              for (i = 0; i < cs.length; i++) {
                var o2 = cs[i];
                if (o2 === c || !o2.alive || !o2.chem || Math.abs(o2.x - obj.x) > 150) continue;
                try { SB.Chem.apply(o2.chem, { bored: -0.12, lonely: -0.05 }); } catch (e) {}
              }
            }
          }
          break;
        case "top": d.spin = 3; if (hit) { obj.vx = away * 120; obj.vy = -120; obj.onGround = false; } break;
        case "ball":
          releaseFrom(game, obj);
          obj.vx = away * (hit ? 450 : 350); obj.vy = hit ? -300 : -250; obj.onGround = false;
          break;
        case "butterfly": case "beetle":
          d.flee = 1.5;
          if (k === "butterfly") { d.landed = 0; d.tx = SB.clamp(obj.x + away * 250, obj.r, W - obj.r); d.ty = obj.y - 90; }
          else { d.dir = away; d.spd = 120; }
          break;
        default:
          if (PLANTS[k]) {
            o = World.shake(world, game, obj, false);
            if (!o) res.msg = "nothing";
          }
      }
    } else if (verb === "cuddle") {
      if (k === "egg") World.warmEgg(world, game, obj);
    }
    emit("use", { c: c, obj: obj, verb: verb, result: res });
    return res;
  };

  /* ---------------- save / load ---------------- */

  // Plain snapshot of what must persist (ground/decor are regenerated from the seed).
  World.serialize = function (world) {
    var w = world.weather;
    return {
      objects: world.objects,
      weather: { kind: w.kind, t: w.t, intensity: w.intensity, target: w.target, next: w.next, flash: 0 },
      dayIndex: world.dayIndex, night: world.night, pads: world.pads.slice(), nightGrumps: world.nightGrumps,
      wind: world.wind, windTarget: world.windTarget
    };
  };

  function num(v, dflt) { return typeof v === "number" && isFinite(v) ? v : dflt; }

  World.revive = function (data, game) {
    data = data || {};
    var world = blank();
    World.regen(world, game);
    var src = Array.isArray(data.objects) ? data.objects : [];
    for (var i = 0; i < src.length; i++) {
      var p = src[i], def = p && K[p.kind];
      if (!def) continue;
      var x = SB.clamp(num(p.x, SB.HOME_X), def.r, W - def.r);
      var o = {
        id: num(p.id, 0) || SB.Game.newId(game), kind: p.kind, noun: def.noun,
        x: x, y: num(p.y, groundAt(world.ground, x) - def.r), vx: num(p.vx, 0), vy: num(p.vy, 0), r: def.r,
        fixed: !!def.fixed, heldBy: typeof p.heldBy === "number" ? p.heldBy : null,
        age: num(p.age, 0), onGround: !!p.onGround && !p.heldBy, data: p.data && typeof p.data === "object" ? p.data : {}
      };
      if (def.critter && o.data.room == null) o.data.room = roomIndex(o.x);
      world.objects.push(o);
    }
    if (!world.objects.some(function (o) { return o.fixed; })) populate(world, game); // corrupt/empty save
    refreshCache(world);
    var w = data.weather || {};
    if (WEATHER_KINDS.indexOf(w.kind) >= 0) world.weather.kind = w.kind;
    world.weather.t = num(w.t, world.weather.t);
    world.weather.intensity = SB.clamp01(num(w.intensity, 0.7));
    world.weather.target = SB.clamp01(num(w.target, world.weather.intensity));
    world.weather.next = WEATHER_KINDS.indexOf(w.next) >= 0 ? w.next : null;
    world.wind = num(data.wind, 0);
    world.windTarget = num(data.windTarget, 0.1);
    world.nightGrumps = num(data.nightGrumps, 0);
    updateClock(world, game, true);
    if (typeof data.dayIndex === "number") world.dayIndex = data.dayIndex;
    if (typeof data.night === "boolean") world.night = data.night;
    world.season = SEASONS[Math.floor(world.dayIndex / 2) % 4];
    var pads = Array.isArray(data.pads) ? data.pads : [];
    world.pads = pads.filter(function (id) { return world.objects.some(function (o) { return o.id === id && o.kind === "teleporter"; }); });
    if (world.pads.length < 2) world.pads = World.byKind(world, "teleporter").map(function (o) { return o.id; });
    return world;
  };
})();
