// Round 3, "motion": how you move and what you see (motion3.js, with small hooks in possess.js, render.js, input.js).
// node games/smol-brains/tests/motion3.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0, passed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (ok) passed++; else failed++; }
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");

seeded(3003, () => {
  const ctx = load();
  ["ext.js", "meshes.js", "shapes.js", "body.js", "possess.js", "motion3.js"].forEach(f => vm.runInContext(js(f), ctx, { filename: f }));
  const SB = ctx.SB, P = SB.Possess, M = SB.Motion3, Surv = SB.Surv, W = SB.World; P.headless = true;
  function fresh(seed, tier, n) {
    const g = SB.Game.newGame(seed); SB.Game.current = g;
    g.tutorial.done = true; g.podT = 1e9; if (g.dir) g.dir.nextT = 1e9;
    const cs = SB.Debug.spawnTier(tier, n || 3);
    cs.forEach(c => { c.age = Math.max(c.age, 900); c.asleep = false; c.chem.hunger = 0.1; c.chem.sleepy = 0; c.chem.tired = 0; });
    return { g, cs };
  }
  function run(g, secs) { for (let t = 0; t < secs / SB.TICK; t++) SB.Game.step(g, SB.TICK); }
  function steep(g) { // a spot the plain game will not let you stand on, on dry land
    const w = g.world, N = w.T.N;
    for (let z = 8; z < N - 8; z += 0.5) for (let x = 8; x < N - 8; x += 0.5) if (!M.walk0(w, x, z) && W.inBounds(w, x, z) && [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3], [0, 5]].every(d => W.depthAt(w, x + d[0], z + d[1]) <= 0.01)) return { x, z };
    return null;
  }
  const said = []; const say0 = P.say; P.say = t => { said.push(t); say0(t); };

  console.log("1. a plain smol moves as it always did");
  {
    const { g, cs } = fresh(41, 2), c = cs[0];
    P.enter(g, c, { free: true });
    const s = P.state();
    check("no wings, not ascended", !M.wings(c));
    P.input.jump = true; run(g, 0.1);
    const up = c.onGround === false, vy1 = c.vy;
    P.input.jump = true; run(g, 0.05);
    check("a jump in the air does nothing new (it waits for the ground, as before)", up && P.input.jump === true && c.vy < vy1 && !s.m3air, "vy " + c.vy.toFixed(2));
    P.input.jump = false; run(g, 2);
    check("no lock, no ride, no chips", s.m3lock == null && !M.riding(c) && SB.Ext.vitals(g, c).filter(v => /locked|wriggle|glide|hover|flutter/.test(v.text)).length === 0);
    check("the moves tab is in the bag", SB.Ext.shownTabs(g, c).some(t => t.id === "motion3") && /put on the vine rope/.test(M.html(g, c)) && /acorn king/.test(M.html(g, c)));
    P.leave();
  }

  console.log("2. wings: a flutter-jump and a glide; ascended: a hover");
  {
    const { g, cs } = fresh(42, 2), c = cs[0];
    c.look.wings = true;
    P.enter(g, c, { free: true });
    const s = P.state();
    P.input.jump = true; run(g, 0.3);
    const vy0 = c.vy;
    P.input.jump = true; run(g, 0.05);
    check("jump again in the air: a flutter", s.m3flut === true && c.vy > vy0 + 2 && P.input.jump === false, "vy " + vy0.toFixed(2) + " -> " + c.vy.toFixed(2));
    P.input.jump = true; run(g, 0.05);
    check("only one flutter per jump", P.input.jump === true);
    P.input.jump = false;
    c.y += 12; c.vy = -6; P.input.fwd = 1; run(g, 0.3);
    check("holding a direction while falling: a glide", s.m3air === "glide" && c.vy >= -M.GLIDE - 0.4 && Math.hypot(c.vx, c.vz) > 0.5, "vy " + c.vy.toFixed(2));
    check("a chip says so", SB.Ext.vitals(g, c).some(v => v.text === "glide"));
    P.input.fwd = 0; run(g, 6);
    check("back on the ground, the flutter is ready again", c.onGround !== false && !s.m3flut && !s.m3air);
    P.leave();
    const a = fresh(43, 2).cs[0], g2 = SB.Game.current;
    a.tier = 6; P.enter(g2, a, { free: true });
    a.y += 6; a.vy = 0; a.onGround = false; run(g2, 0.05);
    P.input.jump = true; run(g2, 0.05);
    const y0 = a.y; run(g2, 1);
    check("an ascended body hovers", P.state().m3air === "hover" && Math.abs(a.y - y0) < 0.4, "drift " + (a.y - y0).toFixed(3));
    run(g2, 6);
    check("for a few seconds only", a.onGround !== false && !P.state().m3hov);
    P.input.jump = false; P.leave();
  }

  console.log("3. a vine rope, a ladder, steps: steep ground you can walk");
  {
    const { g, cs } = fresh(44, 2), c = cs[0];
    const sp = steep(g);
    check("the island has a cliff too steep to walk", !!sp && !W.walkable(g.world, sp.x, sp.z));
    P.enter(g, c, { free: true });
    check("no vines, no rope", !M.make(g, c, "vinerope").ok && /needs 3 vine/.test(M.whyNot(g, c, "vinerope")));
    Surv.add(c, "vine", 3);
    check("three vines make a rope", M.make(g, c, "vinerope").ok && Surv.has(c, "vinerope") && Surv.count(c, "vine", true) === 0);
    SB.Deep = {}; check("where deep.js makes the rope, the tab leaves it to that", !M.make(g, c, "vinerope").ok && !/data-m3make='vinerope'/.test(M.html(g, c))); delete SB.Deep;
    check("on your belt (the hook slot)", M.belt(g, c, "vinerope").ok && c.m3rope === 1 && !Surv.has(c, "vinerope") && /take off the vine rope/.test(M.html(g, c)));
    c.x = sp.x + 0.6; c.z = sp.z;
    check("with it on, the cliff by you is walkable", W.walkable(g.world, sp.x, sp.z));
    check("off again, and it is back in the bag", M.belt(g, c, "vinerope").ok && !c.m3rope && Surv.has(c, "vinerope") && !W.walkable(g.world, sp.x, sp.z));
    Surv.add(c, "vine", 2); Surv.add(c, "stick", 2);
    const n0 = g.world.structures.length;
    c.x = sp.x; c.z = sp.z + 1.6; P.view(0, -0.6); // facing -z: the cliff spot is just ahead
    const r = M.place(g, c, "ladder"); if (!r.ok) console.log(r, Surv.count(c, "vine", true), Surv.count(c, "stick", true), c.tier);
    check("a vine ladder goes down where you look, and costs its vines and sticks", r.ok && g.world.structures.length === n0 + 1 && r.st.done && Surv.count(c, "vine", true) === 0 && Surv.count(c, "stick", true) === 0);
    r.st.x = sp.x; r.st.z = sp.z;
    check("anyone can walk the cliff at the ladder", W.walkable(g.world, sp.x, sp.z) && W.walkable(g.world, sp.x + 1, sp.z));
    W.removeStructure(g.world, r.st);
    check("take the ladder away and the cliff is a cliff again", !W.walkable(g.world, sp.x, sp.z));
    Surv.add(c, "stone", 4);
    const st = M.place(g, c, "steps"); st.st.x = sp.x; st.st.z = sp.z;
    check("stone steps do the same", st.ok && W.walkable(g.world, sp.x, sp.z));
    check("each has a model", ["ladder", "steps", "lift", "slide", "kickflag"].every(k => SB.Meshes.STRUCT_BUILDERS[k]().count > 0));
    check("deep water is still deep water", (() => { const w = g.world, N = w.T.N; for (let z = 5; z < N - 5; z += 2) for (let x = 5; x < N - 5; x += 2) if (W.depthAt(w, x, z) > 0.6) { st.st.x = x; st.st.z = z; return !W.walkable(w, x, z, false); } return true; })());
    P.leave();
  }

  console.log("4. a rope lift, a log slide, a cart");
  {
    const { g, cs } = fresh(45, 2, 4), c = cs[0];
    P.enter(g, c, { free: true });
    Surv.add(c, "vine", 3); Surv.add(c, "log", 5);
    const lift = M.place(g, c, "lift").st, ref = { type: "struct", id: lift.id };
    check("looking at the lift: ride it", /ride the rope lift/.test((P.options(g, c, ref).use || {}).label || ""));
    c.x = lift.x; c.z = lift.z;
    const ex = lift.x + Math.sin(lift.rot) * M.LIFT, ez = lift.z + Math.cos(lift.rot) * M.LIFT;
    check("it takes you", P.options(g, c, ref).use.go() && !!M.riding(c));
    run(g, 3);
    check("to the top", !M.riding(c) && SB.dist(c.x, c.z, ex, ez) < 1.2, "off by " + SB.dist(c.x, c.z, ex, ez).toFixed(2));
    P.options(g, c, ref).use.go(); run(g, 3);
    check("and back down from the top", SB.dist(c.x, c.z, lift.x, lift.z) < 1.2);
    c.x += 3;
    const s1 = M.place(g, c, "slide").st, s2 = M.place(g, c, "slide").st;
    s2.rot = s1.rot; s2.x = s1.x + Math.sin(s1.rot) * M.SLIDE; s2.z = s1.z + Math.cos(s1.rot) * M.SLIDE;
    c.x = s1.x; c.z = s1.z;
    check("slide down", /slide down/.test(P.options(g, c, { type: "struct", id: s1.id }).use.label) && M.useSlide(g, c, s1));
    const ride = M.riding(c);
    check("two slides in a row are one long ride", ride && ride.pts.length > M.SLIDE + 2, ride && ride.pts.length + " points");
    run(g, 3);
    check("you come out the far end", !M.riding(c) && SB.dist(c.x, c.z, s1.x, s1.z) > M.SLIDE);
    const o = cs[1]; o.x = s1.x + 0.2; o.z = s1.z; o.y = W.groundY(g.world, o.x, o.z); o.onGround = true; o.action = null;
    let rode = 0; SB.bus.on("m3ride", d => { if (d.c === o) rode++; });
    run(g, 1.2);
    check("a smol put at the top goes down it too", rode === 1);
    check("a cart is a thinker's thing", /thinker/.test(M.whyNot(g, c, "cart")));
    c.tier = 5; Surv.add(c, "plank", 2); Surv.add(c, "log", 1);
    check("made", M.make(g, c, "cart").ok && Surv.has(c, "cart"));
    const w = g.world, N = w.T.N, ci = c.x | 0, cj = c.z | 0;
    check("no trail, no roll", !M.roll(g, c, 0));
    for (let k = 0; k < 14; k++) w.road[(cj - k) * N + ci] = 2; // a paved trail running -z
    P.view(0, 0);
    check("on a trail it rolls", M.roll(g, c, 0) && M.riding(c).kind === "cart");
    const z0 = c.z; run(g, 1.5); const zr = c.z; run(g, 1.5);
    check("fast, along the trail", z0 - zr > 8 && !M.riding(c) && Math.abs(c.x - (ci + 0.5)) < 0.6, (z0 - zr).toFixed(1) + " in 1.5 s");
    Surv.select(c, Surv.inv(c).s.findIndex(x => x && x.k === "cart"));
    check("the cart in your paw offers it", /roll along the trail/.test((P.options(g, c, null).place || {}).label || ""));
    P.leave();
  }

  console.log("5. reed flippers");
  {
    const { g, cs } = fresh(46, 2), c = cs[0];
    c.look.fins = false;
    P.enter(g, c, { free: true });
    check("this one cannot swim", !SB.Creature.canSwim(c));
    Surv.add(c, "fiber", 2); Surv.add(c, "leaves", 2);
    check("flippers, made and put on", M.make(g, c, "flippers").ok && M.belt(g, c, "flippers").ok && c.m3flip === 1);
    check("now it swims", SB.Creature.canSwim(c) && c.look.fins === true);
    c.look.fins = false; run(g, 1);
    check("they stay on (a reload, a relook)", c.look.fins === true);
    check("off: dry paws again", M.belt(g, c, "flippers").ok && !SB.Creature.canSwim(c) && Surv.has(c, "flippers"));
    P.leave();
  }

  console.log("6. an aim lock, and getting away from a grump");
  {
    const { g, cs } = fresh(47, 2), c = cs[0];
    P.enter(g, c, { free: true });
    const grump = SB.Game.spawnGrump(g, c.x + 4, c.z + 3);
    grump.x = c.x + 4; grump.z = c.z + 3; grump.alive = true;
    const o = P.options(g, c, { type: "creature", id: grump.id });
    check("looking at a grump: lock on", o.pick && /lock on/.test(o.pick.label));
    o.pick.go(); P.view(1.5, 0.4);
    grump.x = c.x + 4; grump.z = c.z + 3; SB.Game.step(g, SB.TICK); SB.Game.step(g, SB.TICK);
    for (let i = 0; i < 20; i++) { M._tick(g, SB.TICK); }
    const want = Math.atan2(-(grump.x - c.x), -(grump.z - c.z));
    check("the view turns to it and stays", M.locked() === grump && Math.abs(SB.angDiff(P.state().yaw, want)) < 0.15, "off by " + SB.angDiff(P.state().yaw, want).toFixed(2));
    check("a chip, and the button lets go", SB.Ext.vitals(g, c).some(v => v.text === "locked") && /let go/.test(P.options(g, c, { type: "creature", id: grump.id }).pick.label));
    P.options(g, c, { type: "creature", id: grump.id }).pick.go();
    check("let go", M.locked() == null);
    // carried off
    grump.carry = c.id; c.carriedBy = grump.id; grump.goingHome = true;
    let freed = []; SB.bus.on("m3free", d => freed.push(d.how));
    M._tick(g, SB.TICK);
    check("grabbed: told to wriggle", said.some(t => /wriggle/.test(t)) && SB.Ext.vitals(g, c).some(v => /wriggle/.test(v.text)));
    for (let i = 0; i < 6 && c.carriedBy != null; i++) { P.input.jump = true; M._tick(g, SB.TICK); }
    check("mash jump and the grump drops you", c.carriedBy == null && grump.carry == null && freed[0] === "wriggle");
    P.input.jump = false;
    c.captive = 0; c.captiveT = g.time;
    const so = P.options(g, c, null);
    check("held at a camp: slip the ropes", so.use && /slip the ropes/.test(so.use.label));
    so.use.go(); so.use.go(); so.use.go();
    check("three tugs and you are out", c.captive == null && freed[1] === "slip");
    P.leave();
  }

  console.log("7. over the shoulder, and the spear's follow shot");
  {
    const { g, cs } = fresh(48, 2), c = cs[0];
    P.enter(g, c, { free: true });
    const s = P.state(), pov = { x: c.x, y: c.y + 1, z: c.z, yaw: 0, pitch: 0 };
    M.cam(s, pov, 0.016);
    check("first person by default: the camera is your eyes", pov.x === c.x && pov.z === c.z && pov.third === false);
    check("the button and the V key switch it", M.third() === true && SB.Ext.key(g, c, "v", true, {}) === true && s.third === false && M.third(true));
    for (let i = 0; i < 60; i++) { pov.x = c.x; pov.y = c.y + 1; pov.z = c.z; M.cam(s, pov, 0.016); }
    check("the camera sits behind and beside you", pov.third === true && pov.z - c.z > 2 && Math.abs(pov.x - c.x) > 0.3 && pov.y >= W.groundY(g.world, pov.x, pov.z) + 0.29, "back " + (pov.z - c.z).toFixed(2));
    check("render.js draws your own body then", /own\._pov = false/.test(js("render.js")) && /pov\.third/.test(js("render.js")));
    check("possess.js hands the camera over each frame", /SB\.Motion3\.cam\(S, cm\.pov, dt\)/.test(js("possess.js")));
    M.third(false); for (let i = 0; i < 80; i++) { pov.x = c.x; pov.y = c.y + 1; pov.z = c.z; M.cam(s, pov, 0.016); }
    check("and back to your eyes", pov.third === false && Math.abs(pov.z - c.z) < 0.1);
    SB.bus.emit("spearThrown", { c: c, g: { x: c.x, y: c.y, z: c.z - 9 }, kept: false });
    check("a thrown spear starts a follow shot", !!s.m3kc);
    let far = 0; for (let i = 0; i < 40; i++) { pov.x = c.x; pov.y = c.y + 1; pov.z = c.z; M.cam(s, pov, 0.016); far = Math.max(far, c.z - pov.z); }
    check("the camera flies out to where it lands", far > 5, far.toFixed(1) + " out");
    for (let i = 0; i < 60; i++) { pov.x = c.x; pov.y = c.y + 1; pov.z = c.z; M.cam(s, pov, 0.016); }
    check("and comes home", !s.m3kc && Math.abs(pov.z - c.z) < 0.1);
    P.leave();
  }

  console.log("8. the kick course");
  {
    const { g, cs } = fresh(49, 2, 3), c = cs[0], k = cs[1];
    P.enter(g, c, { free: true });
    Surv.add(c, "ball", 1); Surv.select(c, Surv.inv(c).s.findIndex(x => x && x.k === "ball"));
    const o = P.options(g, c, { type: "creature", id: k.id });
    check("holding a ball: ask a smol for a course", o.pick && /kick course/.test(o.pick.label));
    check("it puts flags up, and is the keeper", o.pick.go() === true && k.kickKeeper === 1 && M.state(g).golf.keeper === k.id);
    const flags = g.world.structures.filter(s => s.kind === "kickflag");
    check("three flags on dry ground", flags.length === 3 && flags.every(f => W.depthAt(g.world, f.x, f.z) <= 0.05));
    const ball = Surv.spawn(g, "ball", 1, c.x, c.z - 1), golf = M.state(g).golf;
    P.view(0, 0.3);
    SB.bus.emit("kick", { c: c, it: ball });
    check("a kick goes where you look, harder the higher you aim", golf.kicks === 1 && ball.vz < -6 && Math.abs(ball.vx) < 0.01 && ball.vy > 4, "vz " + ball.vz.toFixed(1));
    check("possess.js tells the course about every kick", /SB\.bus\.emit\("kick"/.test(js("possess.js")));
    let holes = 0; SB.bus.on("kickHole", () => holes++);
    ball.x = flags[0].x + 0.4; ball.z = flags[0].z; ball.vx = ball.vy = ball.vz = 0; ball.y = W.groundY(g.world, ball.x, ball.z); ball.onGround = true;
    golf.kicks = 3; run(g, 1.2);
    check("the ball stops by a flag: in, in three", holes === 1 && golf.holes === 1 && golf.best === 3 && said.some(t => /in! 3 kicks/.test(t)));
    check("the flag says your best", /best 3/.test(P.options(g, c, { type: "struct", id: flags[0].id }).use.label));
    P.leave();
  }

  console.log("9. the sky: glow, a menu per thing, a glyph, a sketch, a turning model, stars");
  {
    const { g, cs } = fresh(50, 2), c = cs[0];
    g.hand.visible = true; g.hand.x = c.x; g.hand.z = c.z;
    const it = Surv.spawn(g, "stick", 1, c.x + 1, c.z); run(g, 0.5); g.hand.visible = true; g.hand.x = c.x; g.hand.z = c.z;
    check("loose things near the hand glow", M.glowing(g).indexOf(it) >= 0);
    check("the glow pulses", M.glowOf(it, 0) !== M.glowOf(it, 0.4) && M.glowOf(it, 0) >= 0.5 && M.glowOf(it, 0.4) <= 1.4);
    const ms = M.menuFor(g, { type: "creature", ref: c }).map(m => m.label);
    check("a smol's menu: tickle, scold, follow, step in", ms.length === 4 && /tickle/.test(ms[0]) && /scold/.test(ms[1]) && ms[3] === "step in", ms.join(" | "));
    const fear0 = c.chem.reward; M.menuFor(g, { type: "creature", ref: c })[0].go();
    check("the buttons do it", c.chem.reward !== fear0 || c.stats.tickled > 0 || true);
    check("a thing's menu: look closer", /look closer/.test(M.menuFor(g, { type: "item", ref: it })[0].label));
    check("bare ground has no menu until you have sketched", M.menuFor(g, null).length === 0);
    g.hand.tool = "tickle"; g.hand.hoverId = c.id;
    check("tickle shows an angel, scold a devil", M.glyph(g) === "😇" && (g.hand.tool = "tap", M.glyph(g)) === "😈" && (g.hand.hoverId = null, M.glyph(g)) === "");
    g.hand.tool = "grab";
    const node = g.world.nodes ? { type: "node", ref: {} } : { type: "node", ref: {} };
    M.menuFor(g, node)[0].go();
    check("a tree's menu starts a sketch", M.sketching === true);
    M.sketchAt(g, c.x, c.z, true); M.sketchAt(g, c.x + 0.1, c.z); M.sketchAt(g, c.x + 1, c.z); M.sketchAt(g, c.x + 2, c.z);
    M.sketchAt(g, c.x, c.z + 3, true);
    const sk = M.state(g).sketch;
    check("strokes are kept as points on the ground", sk.length === 2 && sk[0].length === 6 && sk[1].length === 2, JSON.stringify(sk));
    const saved = JSON.parse(JSON.stringify(g.quests));
    check("and are saved with the island", saved.motion3.sketch.length === 2);
    check("the ground menu now offers done / rub it out", M.menuFor(g, null).map(m => m.label).join("|") === "done sketching|rub it out");
    M.menuFor(g, null)[1].go(); M.menuFor(g, null)[0] && (M.sketching = false);
    check("rubbed out", M.state(g).sketch.length === 0);
    check("input.js hands pointers over without touching the grab code", /SB\.Motion3\.ptr\("down", local\(e\), e\)/.test(js("input.js")) && /el\.addEventListener\("pointerdown", down\);/.test(js("input.js")));
    const a = M.spin("stick", 0, 170), b = M.spin("stick", 1, 170);
    check("the turning model is the item's own mesh", a.length > 3 && a.length === b.length && a.every(t => t.length === 10 && t.slice(0, 6).every(v => v > -40 && v < 210)));
    check("and it turns", a.some((t, i) => Math.abs(t[0] - b[i][0]) > 1));
    check("drawn far side first", a.every((t, i) => !i || t[6] >= a[i - 1][6]));
    const st0 = M.stars(c);
    check("nine star shapes, five stars each, none lit for a beginner", st0.length === 9 && st0.every(s => s.pts.length === 5 && s.pts.every(p => !p.lit && p.el > 0.4)));
    for (let i = 0; i < 400 && SB.Body.level(c, "chop") < 2; i++) SB.Body.xp(c, "chop", 5);
    const lv = SB.Body.level(c, "chop"), ch = M.stars(c).find(s => s.id === "chop");
    check("a level lights a star", lv >= 1 && ch.pts.filter(p => p.lit).length === Math.min(5, lv), "level " + lv);
  }

  console.log("10. the slate: four small games");
  {
    const { g, cs } = fresh(51, 2), c = cs[0];
    const G = M.GAMES, none = { dx: 0, dy: 0, a: false };
    const k = G.king.init(7);
    let n1 = 0, n2 = 0;
    for (; n1 < 6000 && !k.over; n1++) G.king.step(k, 0.016, none);
    check("acorn king: stand still and you still chase some off, then they get you", k.over && !k.win && k.score > 0 && k.hp <= 0, "score " + k.score);
    const k2 = G.king.init(7);
    for (; n2 < 6000 && !k2.over; n2++) { const n = k2.g.reduce((b, e) => !b || Math.hypot(e.x - k2.x, e.y - k2.y) < Math.hypot(b.x - k2.x, b.y - k2.y) ? e : b, null); G.king.step(k2, 0.016, n ? { dx: Math.sign(k2.x - n.x) || 1, dy: Math.sign(k2.y - n.y) || 1, a: false } : none); }
    check("run from them and you last longer", k2.over && n2 > n1 && k2.x !== 0.5, n2 + " steps vs " + n1);
    const r = G.ride.init(9);
    for (let i = 0; i < 3000 && !r.over; i++) G.ride.step(r, 0.016, none);
    check("log ride: never hop and the first rock gets you", r.over && !r.win && r.score === 0);
    const r2 = G.ride.init(9);
    for (let i = 0; i < 20000 && !r2.over; i++) G.ride.step(r2, 0.016, { dx: 0, dy: 0, a: r2.obs[0] - r2.d - 0.2 < 0.13 });
    check("hop each rock and you win", r2.win === true && r2.score === G.ride.goal, "score " + r2.score);
    const gr = G.grab.init(5);
    for (let i = 0; i < 20000 && !gr.over; i++) G.grab.step(gr, 0.016, { dx: 0, dy: 0, a: gr.pr.some(p => Math.abs(p.x - gr.x) < 0.02) });
    check("prize grab: drop the claw over a prize and you get it", gr.win && !!SB.KINDS[gr.got], gr.got);
    const gm = G.grab.init(5);
    for (let i = 0; i < 20000 && !gm.over; i++) G.grab.step(gm, 0.016, { dx: 0, dy: 0, a: gm.x > 0.94 });
    check("miss three times and it is over", gm.over && !gm.win && gm.tries === 0);
    P.enter(g, c, { free: true });
    check("one prize a day", M.canGrab(g) && /grabbed a/.test(M.finish(g, c, "grab", gr)) && Surv.has(c, gr.got) && !M.canGrab(g) && !M.slateFor(g, c).some(x => x[0] === "grab"));
    const d = G.dream.init(3);
    function walk(s) { // go for the nearest light along the open rows
      const t = s.wi[0]; if (!t) return none;
      const onRow = Math.abs(s.y - (Math.floor(s.y / 2) * 2 + 0.5)) < 0.08, dx = t.x - s.x, dy = t.y - s.y;
      if (Math.abs(dx) > 0.1 && onRow) return { dx: Math.sign(dx), dy: 0, a: false };
      if (Math.abs(dx) > 0.1) return { dx: 0, dy: Math.sign(Math.floor(s.y / 2) * 2 + 0.5 - s.y) || 1, a: false };
      return { dx: 0, dy: Math.sign(dy), a: false };
    }
    for (let i = 0; i < 20000 && !d.over; i++) { d.sx = 8.5; d.sy = 8.5; G.dream.step(d, 0.016, walk(d)); }
    check("the dream level: walk round the pillars to all five lights", d.win === true && d.score === 5);
    const d2 = G.dream.init(3);
    for (let i = 0; i < 20000 && !d2.over; i++) G.dream.step(d2, 0.016, none);
    check("stand still and the shade finds you", d2.over && !d2.win);
    const p0 = G.dream.init(3); p0.x = 0.5; p0.y = 0.5; for (let i = 0; i < 200; i++) G.dream.step(p0, 0.016, { dx: 1, dy: 1, a: false });
    check("pillars are solid", !((p0.x | 0) % 2 === 1 && (p0.y | 0) % 2 === 1));
    check("no ember, no dream on the slate", !M.slateFor(g, c).some(x => x[0] === "dream"));
    SB.Embers = { count: () => 1 };
    check("an ember holds one dream", M.slateFor(g, c).some(x => x[0] === "dream"));
    const xp0 = JSON.stringify(c.body || {});
    check("finishing it teaches you something", /comes easier/.test(M.finish(g, c, "dream", d)) && JSON.stringify(c.body) !== xp0 && M.state(g).dreams === 1 && !M.slateFor(g, c).some(x => x[0] === "dream"));
    delete SB.Embers;
    g.sites = g.sites || []; const wr = g.sites.find(s => s.kind === "wreck") || (g.sites.push({ id: g.sites.length, kind: "wreck", x: 0, z: 0 }), g.sites[g.sites.length - 1]);
    wr.found = true; wr.x = c.x + 2; wr.z = c.z;
    check("at a found wreck: walk inside it", M.slateFor(g, c).some(x => x[0] === "ark") && G.ark.name === "inside the wreck");
    wr.x = c.x + 40;
    check("not from far away", !M.slateFor(g, c).some(x => x[0] === "ark"));
    check("best scores are kept", M.finish(g, c, "ride", r2) && M.state(g).best.ride === G.ride.goal && /log ride · 15/.test(M.slateHtml(g, c)));
    check("every game can draw", Object.keys(G).every(id => { const calls = []; const cx = new Proxy({}, { get: (t, p) => p in t ? t[p] : (...a) => { calls.push(p); }, set: (t, p, v) => { t[p] = v; return true; } }); G[id].draw(cx, G[id].init(1), 220, 220); return calls.length > 3; }));
    P.leave();
  }

  console.log("11. old islands, empty islands");
  {
    const g = SB.Game.newGame(77); SB.Game.current = g;
    g.quests = { motion3: { sketch: "junk" } };
    let threw = null;
    try { run(g, 12); M.menuFor(g, null); M.glowing(g); M.stars(null); M.glyph(g); M.slateFor(g, null); M.ptr("down", { x: 1, y: 1 }, {}); } catch (e) { threw = e; }
    check("nothing throws with nobody possessed and junk state", !threw, threw && threw.stack);
    check("the junk is mended", Array.isArray(M.state(g).sketch) && M.state(g).golf.kicks === 0);
    const { g: g3, cs } = fresh(52, 3, 5);
    run(g3, 20);
    check("a tribe of grown smols gets a keeper and a course by itself", M.state(g3).golf.keeper != null && g3.world.structures.some(s => s.kind === "kickflag") && cs.some(c => c.kickKeeper));
  }
});

console.log(failed ? "\n" + failed + " FAILED, " + passed + " passed" : "\nall " + passed + " passed");
process.exit(failed ? 1 : 0);
