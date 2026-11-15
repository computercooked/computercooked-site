// What is drawn on a smol and on things (round 3, "wardrobe"): worn things on the body (voxel model, sprite, smooth
// 3D parts), hide / vanity / dyes / trims / cloak looks, scars, paint, a painted mark, rounder and leaner bodies,
// gaits, the mood marker, grave lights by how a smol died, building skins, murals, scarecrow looks, a clothes
// stand, pet hats, banners, glow lichen, the fishing float, and what finned, ascended and leafy smols want.
// Nothing here has been seen on a screen: every check is a number (a mesh changed, a colour is there, a part was drawn).
// node games/smol-brains/tests/wardrobe3.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0, passed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra != null && extra !== "" ? "  (" + extra + ")" : "")); if (ok) passed++; else failed++; }
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");
seeded(4360, () => {
  const ctx = load();
  const SB = ctx.SB;
  // no WebGL in node: a renderer that writes down what it is asked to draw
  const drawn = [], lights = [], hooks = [];
  SB.Render = {
    afterObjects() {}, addHook(f) { hooks.push(f); }, addOverlay() {}, gl() { return null; }, time() { return 12.5; }, vdy() { return 0; }, gh(x, z) { return SB.World.groundY(SB.Game.current.world, x, z); },
    shadow() {}, light(x, y, z, r, cr, cg, cb) { lights.push([x, y, z, r, cr, cg, cb]); }, inst(key, m, tint, ext) { drawn.push({ key, x: m[3], y: m[7], z: m[11], tint: tint ? Array.from(tint) : null, ext: ext ? Array.from(ext) : null }); }, instTRS() {},
    camera: { x: 0, z: 0, halfW: 1e4, halfH: 1e4, zoom: 10, pov: false, eye: [0, 10, 0], right: [1, 0, 0], fwd: [0, -1, 0] }, markDirty() {}, env: { night: 0 }, pixel: false, voxel: false, hd: false
  };
  SB.GL = {};
  ["ext.js", "bosses.js", "possess.js", "body.js", "home.js", "loot.js", "fight.js", "harvest.js", "powers.js", "animals.js", "mine.js", "wear.js", "wardrobe3.js", "pixel.js", "voxel.js", "bodies.js"].forEach(f => { if (!(f === "bosses.js" && SB.Bosses)) vm.runInContext(js(f), ctx, { filename: f }); });
  const W = SB.Wear, X = SB.Wardrobe, VX = SB.Voxel, PX = SB.Pixel, Surv = SB.Surv, H = SB.Harvest, PW = SB.Powers, B = SB.Bodies;
  SB.Possess.headless = true;
  const game = SB.Game.newGame(135); SB.Game.current = game; game.tutorial.done = true;
  SB.World.isSeen = () => true;
  SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod));
  const me = SB.Game.smols(game)[0]; me.tier = 4; me.stage = 3; me.look = SB.Genome.look(me.genome);
  const give = (k, n) => Surv.add(me, k, n || 1);
  const look = () => { W.fresh(me); return W.look(me); };
  const model = c => { W.fresh(c); c._vxKey = null; return VX.build(c); };
  const sig = m => Array.from(m.verts).join(",");
  // how many vertices of a model carry (about) this colour: shading only darkens, so compare hue by ratio
  const hasCol = (m, col) => { let n = 0; const S = VX.STRIDE, v = m.verts; for (let i = 0; i < v.length; i += S) { const r = v[i + 6], g = v[i + 7], b = v[i + 8], k = Math.max(r, g, b) / (Math.max(col[0], col[1], col[2]) / 255 || 1); if (k > 0.3 && Math.abs(r - col[0] / 255 * k) < 0.035 && Math.abs(g - col[1] / 255 * k) < 0.035 && Math.abs(b - col[2] / 255 * k) < 0.035) n++; } return n; };
  const G = VX.GRID, fits = m => m.clipped === 0 && m.bounds[2] === 0 && m.bounds[3] < G.y1 - 1 && m.bounds[0] > G.x0 && m.bounds[1] < G.x1 - 1 && m.bounds[4] > G.z0 && m.bounds[5] < G.z1 - 1;
  const frame = () => { drawn.length = 0; lights.length = 0; hooks.forEach(h => h(game, 1)); };
  const spriteSig = c => { W.fresh(c); return PX.paint(c).frames.map(f => Array.from(f.d).join("")).join("|"); };
  const spriteHas = (c, col) => { W.fresh(c); const d = PX.paint(c).frames[0].d; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] && d[i] === col[0] && d[i + 1] === col[1] && d[i + 2] === col[2]) n++; return n; };

  console.log("1. it loads; nothing on: nothing changes");
  check("the wardrobe is there, with a looks page on the wear tab", !!X && /data-wrpage='looks'/.test(W.html(game, me)));
  const bare = model(me), bareSig = sig(bare), bareSprite = spriteSig(me), L0 = look();
  check("a bare smol has a look with nothing on it", L0 && !L0.head && !L0.body && !L0.feet && !L0.charm && !L0.scars && !L0.paint && !L0.mark);
  check("a grump has no wardrobe", W.look({ species: "grump", look: {} }) === null);
  check("the look is cached between frames and refreshed on W.fresh", W.look(me) === W.look(me) && look() !== L0);

  console.log("2. worn things are drawn on the body (voxel model)");
  give("furhat"); give("coppervest"); give("furboots"); give("shellcharm"); give("strawhat"); give("guardhelm"); give("cloak");
  let r = W.putOn(game, me, "furhat");
  let L = look(), m = model(me);
  check("a fur hat: the look names it, the model changes, and its colour is on the mesh", r.ok && L.head && L.head.k === "furhat" && sig(m) !== bareSig && hasCol(m, L.head.col) > 20, hasCol(m, L.head.col));
  check("the hat sits on top and still fits the grid", m.height >= bare.height && fits(m), m.height + " >= " + bare.height);
  // how far forward the model reaches in its top third (where a hat is)
  const topW = mm => { let a = 0; const S = VX.STRIDE, v = mm.verts; for (let i = 0; i < v.length; i += S) if (v[i + 1] > mm.height * 0.66) a = Math.max(a, v[i]); return a; };
  const capW = topW(bare);
  const hatSig = sig(m);
  W.putOn(game, me, "strawhat"); L = look(); m = model(me);
  check("a straw hat has a brim that sticks out past the head, in its own colour", L.head.sh === "brim" && sig(m) !== hatSig && topW(m) > capW, L.head.sh + " " + topW(m) + " > " + capW);
  W.putOn(game, me, "guardhelm"); L = look();
  check("a helm is a helm", L.head.sh === "helm" && fits(model(me)));
  W.putOn(game, me, "coppervest"); L = look(); m = model(me);
  check("a copper vest colours the torso", L.body && L.body.k === "coppervest" && hasCol(m, L.body.col) > 20, L.body && hasCol(m, L.body.col));
  const vestQuads = m.quads;
  W.putOn(game, me, "cloak"); L = look(); m = model(me);
  check("a cloak hangs behind (more faces than a vest, further back)", L.body.sh === "cloak" && m.quads > vestQuads && m.bounds[0] <= bare.bounds[0], m.quads + " > " + vestQuads);
  W.putOn(game, me, "coppervest");
  W.putOn(game, me, "furboots"); L = look(); m = model(me);
  check("boots colour the feet", L.feet && L.feet.k === "furboots" && hasCol(m, L.feet.col) > 8);
  W.putOn(game, me, "shellcharm"); L = look(); m = model(me);
  check("a charm hangs at the front and glows", !!L.charm && (() => { const S = VX.STRIDE; for (let i = 0; i < m.verts.length; i += S) if (m.verts[i + 9] === 1 && Math.abs(m.verts[i + 6] - L.charm.col[0] / 255) < 0.02) return true; return false; })());
  check("the model key carries what is worn, so the cache rebuilds", (() => { const a = VX.modelFor(me, true); W.takeOff(game, me, W.on(me).find(e => e.place === "head").sys, W.on(me).find(e => e.place === "head").slot); W.fresh(me); const b = VX.modelFor(me, true); return a !== b && a.key !== b.key; })());
  W.putOn(game, me, "guardhelm");
  for (const tier of [0, 1, 2, 3, 5, 6]) {
    const [c] = SB.Debug.spawnTier(tier, 1); c.stage = 3;
    c.wd = { hat: "top" }; X.state(game).hats.top = 1;
    const a = VX.build(c); W.fresh(c);
    c.wd = {}; W.fresh(c); const b = VX.build(c);
    check("tier " + tier + ": a tall hat fits and changes the model", fits(a) && sig(a) !== sig(b) && a.height >= b.height, a.height + " vs " + b.height);
  }

  console.log("3. and on the sprite, and in the smooth 3D look");
  check("the sprite changes with what is worn", spriteSig(me) !== bareSprite);
  L = look();
  check("the hat's colour is on the sprite", spriteHas(me, L.head.col) > 3, spriteHas(me, L.head.col));
  check("the vest's colour is on the sprite", spriteHas(me, L.body.col) > 3, spriteHas(me, L.body.col));
  me.x = 2; me.z = 2; me.px = 2; me.pz = 2;
  SB.Render.camera.x = me.x; SB.Render.camera.z = me.z;
  frame();
  const near = (d, dx) => Math.abs(d.x - me.x) < (dx || 1.2) && Math.abs(d.z - me.z) < (dx || 1.2);
  check("smooth 3D: a hat and a band of cloth are drawn on the smol in their colours", drawn.some(d => near(d) && d.tint && Math.abs(d.tint[0] - L.head.col[0] / 255) < 0.01 && Math.abs(d.tint[1] - L.head.col[1] / 255) < 0.01) && drawn.some(d => d.key === "p:ring" && near(d) && d.tint && Math.abs(d.tint[0] - L.body.col[0] / 255) < 0.01));

  console.log("4. hide a piece, keep its effect");
  const arm0 = PW.armour(me);
  r = X.act(game, me, "hide", "body"); L = look();
  check("hidden: not drawn, still worn, still armour", r.ok && !L.body && W.has(me, "coppervest") && PW.armour(me) === arm0 && arm0 > 0, arm0);
  check("the page says so", /body: hidden/.test(X.html(game, me)));
  X.act(game, me, "hide", "body");
  check("shown again", !!look().body);

  console.log("5. vanity hats: found and earned");
  const s = X.state(game);
  SB.Mine.set(game, me);
  delete s.hats.top;
  check("a hat you haven't found can't go on", !X.act(game, me, "hat", "party").ok);
  game.achievements.a1 = 1; X.tick(game, 5);
  check("the hat mouse leaves a hat for the first achievement", s.hats.acorn === 1, Object.keys(s.hats).join(" "));
  game.achievements.a2 = 1; game.achievements.a3 = 1; X.tick(game, 5);
  check("and another at three", s.hats.knit === 1);
  r = X.act(game, me, "hat", "acorn"); L = look();
  check("a vanity hat shows over the real one, which keeps working", r.ok && L.head.k === "acorn" && W.has(me, "guardhelm"));
  check("the hat button is on the page", /data-w3='hat:acorn'/.test(X.html(game, me)));
  SB.bus.emit("bossBeaten", { boss: {}, last: false });
  check("beating a captain earns the captain's crown", s.hats.crown === 1 && !s.hats.lantern);
  SB.bus.emit("bossBeaten", { boss: {}, last: true });
  check("the last captain: the lantern set (a hood and starry cloth)", s.hats.lantern === 1 && s.cloaks[2] === 1);
  const site = { id: 99, kind: "ruin", x: me.x + 2, z: me.z, found: true }; game.sites.push(site);
  X.tick(game, 5);
  check("walking up to an old site turns up a hat", s.hats.feather === 1 && s.finds === 1);
  SB.bus.emit("chestOpened", { st: { id: 501 }, c: me });
  check("a second find teaches a trim; each find is a scarecrow look", X.trims(game) === 1 && X.crows(game) === 2, X.trims(game) + " " + X.crows(game));
  X.tick(game, 5);
  check("the same site twice is one find", s.finds === 2);
  X.act(game, me, "hat", "");
  check("hat off: the helm shows again", look().head.k === "guardhelm");

  console.log("6. dyes, trims, cloak looks, headband and belt");
  give("dye_blue"); give("berry", 2);
  check("a dye and berries can dye; a stone can't", !!X.dyeOf("dye_blue") && !!X.dyeOf("berry") && !X.dyeOf("stone"));
  const preBody = look().body.col.join();
  r = X.act(game, me, "dye", "dye_blue"); L = look();
  check("dyeing the body piece changes its colour and uses the dye", r.ok && L.body.col.join() !== preBody && Surv.count(me, "dye_blue", true) === 0 && hasCol(model(me), L.body.col) > 20, L.body.col.join());
  X.act(game, me, "dyeplace"); X.act(game, me, "dyeplace"); X.act(game, me, "dyeplace");
  r = X.act(game, me, "dye", "berry");
  check("berries dye the head piece; two pieces dyed earns checked cloth", r.ok && look().head.col.join() === W.rgb(SB.KINDS.berry.color).join() && s.cloaks[3] === 1, look().head.col.join());
  X.act(game, me, "wash");
  check("washed out", look().head.col.join() !== W.rgb(SB.KINDS.berry.color).join());
  check("a trim you haven't learned stays off", !X.act(game, me, "trim", "3").ok);
  const sigA = sig(model(me));
  r = X.act(game, me, "trim", "1"); L = look();
  check("a learned trim is on the cloth", r.ok && L.body.trim.join() === W.TRIMS[1][1].join() && sig(model(me)) !== sigA);
  const sigB = sig(model(me));
  check("cloth you haven't earned stays plain", !X.act(game, me, "cloak", "1").ok);
  r = X.act(game, me, "cloak", "3");
  check("checked cloth changes the model", r.ok && look().body.pat === 3 && sig(model(me)) !== sigB);
  X.bump(game, "made"); X.bump(game, "made"); X.bump(game, "made");
  check("three things made: striped cloth", s.cloaks[1] === 1 && X.act(game, me, "cloak", "1").ok);
  const sigC = sig(model(me));
  X.act(game, me, "hide", "head"); const sigC2 = sig(model(me));
  X.act(game, me, "band"); L = look();
  check("the headband takes a colour of your choosing", sigC2 !== sigC && L.band && L.band.join() === W.BANDS[0].join() && sig(model(me)) !== sigC2);
  for (let i = 0; i < 6; i++) X.act(game, me, "band");
  check("or comes off", look().band === false);
  X.act(game, me, "band");
  check("and back to the tribe's", look().band === null);
  X.act(game, me, "belt");
  check("the belt too", look().belt && look().belt.join() === W.BANDS[0].join());
  X.act(game, me, "hide", "head");

  console.log("7. tribes have a look; copper goes green");
  const styles = new Set([1, 2, 3, 4, 5, 6, 7, 8].map(sd => W.style({ seed: sd }, { tribe: 0 })[0]));
  check("islands differ in style, and a tribe's feather and trim take its colour", styles.size === 4 && look().feather.join() === W.style(game, me)[1].join());
  delete me.wd.dye; delete me.wd.on;
  const c0 = look().body.col.join();
  game.time += SB.DAY_LENGTH * 9;
  const c1 = look().body.col;
  check("a copper vest worn nine days is greener", c1.join() !== c0 && c1[1] > Number(c0.split(",")[1]) - 60 && c1[0] < Number(c0.split(",")[0]), c0 + " -> " + c1.join());

  console.log("8. scars, body paint, a painted mark");
  const sigD = sig(model(me));
  me.pw = me.pw || {}; me.pw.scars = 2;
  check("scars from old cuts show on the body", look().scars === 2 && sig(model(me)) !== sigD);
  check("and on the sprite", (() => { const a = spriteSig(me); me.pw.scars = 0; const b = spriteSig(me); me.pw.scars = 2; return a !== b; })());
  check("paint must be earned", !X.act(game, me, "paint", "3").ok);
  X.visit(game, me, 10);
  check("a scarred smol earns blue woad, and wears it", me.wd.paints[3] === 1 && me.wd.paint === 3 && look().paint === 3);
  const sigE = sig(model(me));
  X.act(game, me, "paint", "0");
  check("paint off changes the model back", sig(model(me)) !== sigE && !look().paint);
  X.act(game, me, "paint", "3");
  const sigF = sig(model(me));
  [0, 6, 12, 18, 24].forEach(i => X.act(game, me, "bit", i));
  check("a mark painted dot by dot is on the smol", me.wd.mark === (1 | 1 << 6 | 1 << 12 | 1 << 18 | 1 << 24) && sig(model(me)) !== sigF);
  check("the painter is a 5 by 5 grid on the page", (X.html(game, me).match(/data-w3='bit:/g) || []).length === 25);
  r = X.act(game, me, "ban", "save");
  check("kept as a banner; the banners are listed", r.ok && s.banners.length === 1 && /banner 1/.test(X.html(game, me)));
  X.act(game, me, "bit", 0);
  X.act(game, me, "ban", "0");
  check("picking a banner brings the mark back", me.wd.mark === s.banners[0]);

  console.log("9. rounder and leaner, and sculpting");
  const [fat] = SB.Debug.spawnTier(2, 1); fat.stage = 3;
  const w0 = (W.fresh(fat), PX.spec(fat).bw), sg0 = sig(model(fat));
  fat.chem.hunger = 0.1; fat.moving = false; fat.plan = null; fat.action = null;
  for (let i = 0; i < 12; i++) X.visit(game, fat, 30);
  const w1 = PX.spec(fat).bw;
  check("well fed and idle: a rounder body", fat.fit >= 0.5 && w1 > w0 && sig(model(fat)) !== sg0, fat.fit + ", " + w0 + " -> " + w1);
  fat.moving = true; fat.chem.hunger = 0.8;
  for (let i = 0; i < 30; i++) X.visit(game, fat, 30);
  const w2 = PX.spec(fat).bw;
  check("always busy and hungry: a leaner one", fat.fit <= -0.5 && w2 < w0, fat.fit + ", " + w2);
  const kid = { id: 9001, species: "smol", parents: [fat.id] }; fat.fit = 1;
  X.born(game, kid);
  check("a hatchling takes after its parent's shape", kid.fit > 0.3, kid.fit);
  const b0 = me.look.body, sz0 = me.look.size;
  check("sculpting changes the genes and the look", X.sculpt(me, "body", me.genome.genes.body > 0.5 ? -0.3 : 0.3) && me.look.body !== b0 && X.sculpt(me, "size", me.genome.genes.size > 0.5 ? -0.3 : 0.3) && me.look.size !== sz0);
  const e0 = me.look.ears; X.act(game, me, "ears");
  check("the ears button steps through ear shapes", me.look.ears !== e0);
  check("the page has a picture to drag", /<canvas data-w3c/.test(X.html(game, me)));

  console.log("10. gaits");
  const gaitOf = (c, t, walk) => { W.fresh(c); const g = W.gait(c, t, walk); return { hop: g.hop, lean: g.lean, roll: g.roll, leg: g.leg, arm: g.arm }; };
  const [g1] = SB.Debug.spawnTier(3, 1);
  g1.genome.genes.bravery = 0.9; g1.genome.genes.sociability = 0.1; g1.anim.face = "neutral"; g1.chem.tired = 0;
  check("a brave smol struts (leans back, swings its arms)", W.look(g1).gait === "strut" && gaitOf(g1, 1, 1).lean < 0 && gaitOf(g1, 1, 1).arm > 1, W.look(g1).gait);
  g1.genome.genes.bravery = 0.2; g1.genome.genes.sociability = 0.9;
  check("a friendly one bounces", (W.fresh(g1), W.look(g1).gait) === "bouncy" && gaitOf(g1, 1, 1).hop > 0);
  g1.fit = 1;
  check("a round one waddles (rolls side to side)", (W.fresh(g1), W.look(g1).gait) === "waddle" && gaitOf(g1, 1, 1).roll !== 0);
  g1.anim.face = "tired";
  check("a tired one trudges (leans forward, short steps)", (W.fresh(g1), W.look(g1).gait) === "trudge" && gaitOf(g1, 1, 1).lean > 0 && gaitOf(g1, 1, 1).leg < 1);
  SB.Body.wound(g1, "cut", game);
  check("a cut one limps", (W.fresh(g1), W.look(g1).gait) === "limp" && gaitOf(g1, 1, 1).leg < 1 && gaitOf(g1, 1, 1).roll >= 0);
  g1.buff = { drink: { k: "tipsy", until: game.time + 100 } };
  check("a tipsy one sways even standing still", H.has(g1, "tipsy", game) && (W.fresh(g1), W.look(g1).gait) === "tipsy" && gaitOf(g1, 0.4, 0).roll !== 0, JSON.stringify(g1.buff));
  check("standing still, the others don't move", (() => { g1.buff = null; return gaitOf(g1, 1, 0).roll === 0 && gaitOf(g1, 1, 0).hop === 0; })());
  check("the body shader rolls with the gait", /uB\.w/.test(js("voxel.js")));

  console.log("11. the mood marker over your own smol");
  SB.Mine.set(game, me);
  me.anim.face = "smile"; frame();
  const cones = () => drawn.filter(d => d.key === "p:cone" && near(d, 0.3) && d.y > me.y + 0.5);
  const up = cones();
  check("a little diamond (two cones) floats over your smol's head", up.length >= 2 && up[0].ext[1] > 0, up.length);
  const green = up[0] && up[0].tint.join();
  me.anim.face = "angry"; frame();
  check("it is green when happy and red when angry", green === B.moodCol({ anim: { face: "smile" } }).join() && cones()[0].tint[0] > 0.9 && cones()[0].tint[1] < 0.4, green);
  check("it sits where the smol is", Math.abs(B.markerAt(me, 0)[0] - me.x) < 0.01 && B.markerAt(me, 0)[1] > me.y);
  const other = SB.Debug.spawnTier(3, 1)[0]; other.x = other.px = 30; other.z = other.pz = 30;
  frame();
  check("nobody else gets one", !drawn.some(d => d.key === "p:cone" && Math.abs(d.x - 30) < 0.3 && Math.abs(d.z - 30) < 0.3 && d.ext && d.ext[1] === 0.7));

  console.log("12. a grave's light by how its smol died");
  const F = SB.Funeral;
  const gr = SB.World.addStructure(game.world, game, "grave", 40, 40, { done: true, rot: 0 }); gr.data = { name: "old pip", cause: "drowned" };
  const gr2 = SB.World.addStructure(game.world, game, "grave", 44, 40, { done: true, rot: 0 }); gr2.data = { name: "gran", cause: "old" };
  check("drowned is teal, old age is gold, unknown is pale", F.lightOf(gr).join() !== F.lightOf(gr2).join() && F.lightOf(gr)[2] > F.lightOf(gr)[0] && F.lightOf(gr2)[0] > F.lightOf(gr2)[2] && F.lightOf({ data: {} }).length === 3);
  SB.Render.env.night = 1; frame();
  const lg = lights.find(l => Math.abs(l[0] - 40) < 0.01 && Math.abs(l[2] - 40) < 0.01), lg2 = lights.find(l => Math.abs(l[0] - 44) < 0.01 && Math.abs(l[2] - 40) < 0.01);
  check("at night each grave has a light in its colour", lg && lg2 && lg[6] > lg[4] && lg2[4] > lg2[6], lg && lg.slice(4).join());
  SB.Render.env.night = 0; frame();
  check("and none by day", !lights.some(l => Math.abs(l[0] - 40) < 0.01 && Math.abs(l[2] - 40) < 0.01));
  check("a funeral's grave remembers the cause", (() => { game.bodies = [{ id: 7, name: "dot", x: 50, z: 50, body: { t: 1, cause: "cold" } }]; const sv = F.serialize(game); F.revive(game, sv); const g2 = game.world.structures.filter(b => b.kind === "grave" && b.data && b.data.name === "dot")[0]; return sv[0].c === "cold" && g2 && g2.data.cause === "cold"; })());

  console.log("13. buildings: paint, skins, a tribe's roof piece, murals");
  const hut = SB.World.addStructure(game.world, game, "hut", me.x + 1.5, me.z, { done: true, rot: 0 });
  give("dye_red");
  r = H.paint(game, me, hut, "dye_red");
  check("ALREADY: a dye paints a building (harvest.js H.paint sets the tint the renderer reads)", r.ok && hut.tint && hut.tint.join() === H.DYE.dye_red.rgb.join() && /st\.tint\s*\|\|\s*\[1,\s*1,\s*1\]/.test(js("render.js")));
  let dx = X.deco(game, hut);
  check("a hut carries its tribe's roof piece, in the tribe's colour", dx && dx.length >= 1 && dx[0][2] > 1.5 && Math.abs(dx[0][9][0] - W.style(game, null)[1][0] / 255) < 0.01);
  const n0 = dx.length;
  r = X.act(game, me, "skin"); dx = X.deco(game, hut);
  check("a skin you choose adds its pieces (flower boxes)", r.ok && hut.data.skin === 1 && dx.length === n0 + 3, r.msg);
  X.act(game, me, "skin"); const nB = X.deco(game, hut).length; X.act(game, me, "skin"); const nC = X.deco(game, hut).length;
  check("bunting and a stone foot are different again", nB === n0 + 6 && nC === n0 + 1);
  X.act(game, me, "skin");
  check("and back to plain", !hut.data.skin && X.deco(game, hut).length === n0);
  frame();
  check("the pieces are drawn at the hut", drawn.some(d => Math.abs(d.x - hut.x) < 0.2 && Math.abs(d.z - hut.z) < 0.2 && d.y > 1.5));
  const bld = SB.Debug.spawnTier(4, 1)[0]; bld.x = hut.x + 1; bld.z = hut.z + 1; SB.World.rebuildGrids ? SB.World.rebuildGrids(game.world, game) : 0;
  game.chronicle = [[1, "😈", "a grump was chased off"]];
  game.world.structures.forEach(b => { if ((b.kind === "hut" || b.kind === "house") && b !== hut) { b.data = b.data || {}; b.data.mural = 1; } });
  let did = X.mural(game);
  if (!did) { const cn = SB.World.creaturesNear; SB.World.creaturesNear = (w, g, x, z, rr, fn) => game.creatures.forEach(c => { if (SB.dist(c.x, c.z, x, z) <= rr) fn(c); }); did = X.mural(game); SB.World.creaturesNear = cn; }
  check("a builder paints a scene from the chronicle on the hut", did && hut.data.mural === 3 && X.SCENES[hut.data.mural - 1] === "a grump chased off", hut.data.mural);
  dx = X.deco(game, hut);
  check("the mural is a plaque on the back wall with the scene on it", dx.some(q => q[0] === "p:disc" && q[3] < 0) && dx.length >= n0 + 3);

  console.log("14. scarecrow looks, a clothes stand, a banner, glow lichen, pet hats");
  const crow = SB.World.addStructure(game.world, game, "scarecrow", me.x - 1, me.z, { done: true, rot: 0 });
  hut.x += 50;
  r = X.act(game, me, "crow");
  check("a scarecrow takes a look you have found", r.ok && crow.data.look === 1 && X.deco(game, crow).length >= 1 && /pumpkin/.test(r.msg), r.msg);
  X.act(game, me, "crow"); X.act(game, me, "crow");
  check("only the looks you have found (two), then plain again", crow.data.look === 0 && X.deco(game, crow) === null);
  check("the page counts what is found", /2\/6 scarecrow looks/.test(X.html(game, me)) && /the scarecrow:/.test(X.html(game, me)));
  crow.x += 50;
  give("stick", 3); give("fiber", 1);
  r = X.act(game, me, "set", "mannequin");
  const stand = game.world.structures.find(b => b.kind === "mannequin");
  check("a clothes stand is set down from sticks and fibre", r.ok && stand && stand.done && Surv.count(me, "stick", true) === 0, r.msg);
  check("without the makings it says what it takes", /it takes/.test(X.act(game, me, "set", "mannequin").msg));
  X.act(game, me, "hat", "acorn");
  const wore = W.on(me).filter(e => e.place !== "bound").map(e => e.kind).sort().join();
  r = X.act(game, me, "swap");
  check("swap: everything you had on is on the stand, you are bare", r.ok && W.on(me).length === 0 && !me.wd.hat && stand.data.outfit.slice().sort().join() === wore && stand.data.hat === "acorn", r.msg);
  dx = X.deco(game, stand);
  check("the stand is drawn wearing it (a hat, cloth, boots)", dx && dx.length >= 3);
  r = X.act(game, me, "swap");
  check("swap back: it is all on you again", r.ok && W.on(me).filter(e => e.place !== "bound").map(e => e.kind).sort().join() === wore && me.wd.hat === "acorn" && stand.data.outfit.length === 0, W.on(me).map(e => e.kind).join());
  stand.x += 50;
  const flag = SB.World.addStructure(game.world, game, "banner", me.x, me.z + 1, { done: true, rot: 0 });
  r = X.act(game, me, "flag");
  check("your mark flies on a banner, dot for dot", r.ok && flag.data.mark === me.wd.mark && X.deco(game, flag).length === 5, r.msg);
  flag.x += 50;
  give("glowcap"); give("stone");
  r = X.act(game, me, "set", "glowlichen");
  const lichen = game.world.structures.find(b => b.kind === "glowlichen");
  SB.Render.env.night = 1; frame();
  check("glow lichen can be set down, and lights the ground at night", r.ok && lichen && lights.some(l => Math.abs(l[0] - lichen.x) < 0.01 && Math.abs(l[2] - lichen.z) < 0.01 && l[5] > l[4]), r.msg);
  SB.Render.env.night = 0;
  const A = SB.Animals, bun = SB.World.add(game.world, game, "hopper", me.x + 1, me.z + 1, {});
  let pet = null;
  if (bun && A && A.tame) { try { A.tame(game, me, bun); } catch (e) {} pet = A.byItem(game, bun); }
  if (bun && !pet) { bun.data.an = 1; SB.Animals.byItem = () => ({ id: 1 }); pet = { id: 1 }; }
  bun.x = me.x + 1; bun.z = me.z + 1;
  r = X.act(game, me, "pet");
  frame();
  check("a pet near you takes your hat, and is drawn in it", r.ok && bun.data.hat === "acorn" && drawn.some(d => (d.key === "p:cone" || d.key === "p:ring") && Math.abs(d.x - bun.x) < 0.3 && Math.abs(d.z - bun.z) < 0.3), r.msg);
  r = X.act(game, me, "pet");
  check("and gives it back", r.ok && !bun.data.hat);

  console.log("15. seasons, feasts, a grump mask, the big glow");
  const [t3] = SB.Debug.spawnTier(3, 1); t3.stage = 3;
  const sig3 = sig(model(t3));
  game.world.season = 3;
  check("winter: a bare-headed tribe smol pulls on a knit cap", (W.fresh(t3), W.look(t3).head.k) === "knit" && sig(model(t3)) !== sig3);
  game.world.season = 1;
  check("summer: it comes off", !(W.fresh(t3), W.look(t3).head));
  if (SB.Dark) { const f0 = SB.Dark.feast; SB.Dark.feast = () => ({ id: "holiday" }); check("a feast day: a party hat", (W.fresh(t3), W.look(t3).head.k) === "party" && fits(model(t3))); X.tick(game, 5); check("and you get one to keep", s.hats.party === 1); SB.Dark.feast = f0; }
  else { SB.Dark = { feast: () => ({ id: "holiday" }) }; check("a feast day: a party hat", (W.fresh(t3), W.look(t3).head.k) === "party" && fits(model(t3))); X.tick(game, 5); check("and you get one to keep", s.hats.party === 1); delete SB.Dark; }
  W.fresh(t3);
  if (!SB.KINDS.grumpmask) SB.KINDS.grumpmask = { noun: "toy", label: "grump mask", emoji: "👹", r: 0.12, color: 0x6a5a7a, desc: "" };
  Surv.add(t3, "grumpmask", 1);
  const sigM = sig(model(t3));
  check("a grump mask in the bag is worn on the face (horns and a dark brow)", W.look(t3).mask === 1 && sigM !== sig3 && hasCol(model(t3), [210, 80, 255]) > 0);
  t3.wd = { hide: { mask: 1 } };
  check("and can be hidden", !(W.fresh(t3), W.look(t3).mask));
  PW.buff(me, "bigglow", 60, game);
  L = look();
  check("the big glow takes the colour of a worn charm", L.big && L.charm && L.big.join() === L.charm.col.join());
  W.takeOff(game, me, W.on(me).find(e => e.place === "charm").sys, W.on(me).find(e => e.place === "charm").slot);
  check("with no charm it is plain lantern gold", look().big.join() === "255,240,170");

  console.log("16. what a body wants");
  const [fin] = SB.Debug.spawnTier(2, 1); fin.look.fins = true;
  const spot = (() => { const T = game.world; for (let x = -200; x <= 200; x += 3) for (let z = -200; z <= 200; z += 3) { if (!SB.World.inBounds(T, x, z)) continue; let dry = true; for (let i = 0; i < 9; i++) if (SB.World.depthAt(T, x + (i ? Math.sin(i * 0.785) * 3.5 : 0), z + (i ? Math.cos(i * 0.785) * 3.5 : 0)) > 0.02) dry = false; if (dry && SB.World.inBounds(T, x, z)) return { x, z }; } return null; })();
  const pool = (() => { const T = game.world; for (let x = -200; x <= 200; x += 2) for (let z = -200; z <= 200; z += 2) if (SB.World.inBounds(T, x, z) && SB.World.depthAt(T, x, z) > 0.1) return { x, z }; return null; })();
  game.world.weather.rain = 0;
  fin.x = spot.x; fin.z = spot.z; fin.chem.punish = 0;
  for (let i = 0; i < 6; i++) X.visit(game, fin, 120);
  check("a finned smol away from water dries out and minds", fin.dry > X.DRY && fin.chem.punish > 0 && X.vitals(game, fin).some(v => /water/.test(v.text)), fin.dry);
  fin.x = pool.x; fin.z = pool.z; X.visit(game, fin, 120);
  check("by the water it is fine again", !fin.dry && X.vitals(game, fin).length === 0);
  const [asc] = SB.Debug.spawnTier(6, 1); asc.x = spot.x; asc.z = spot.z;
  const nn = SB.World.nodesNear; SB.World.nodesNear = (w, x, z, rr, f) => nn(w, x, z, rr, f).filter(n => n.kind !== "crystals");
  for (let i = 0; i < 6; i++) X.visit(game, asc, 120);
  check("an ascended smol far from crystal light dims", asc.dim > X.DRY && X.vitals(game, asc).some(v => /crystal/.test(v.text)), asc.dim);
  Surv.add(asc, "crystal", 1); X.visit(game, asc, 120);
  check("a crystal of its own is light enough", !asc.dim);
  SB.World.nodesNear = nn;
  const [leaf] = SB.Debug.spawnTier(2, 1);
  const plain = spriteSig(leaf), plainV = sig(model(leaf));
  leaf.leafy = 1;
  check("a leafy smol is green, with a sprout (sprite and model)", spriteSig(leaf) !== plain && sig(model(leaf)) !== plainV && PX.spec(leaf).hue === 104);
  leaf.x = pool.x; leaf.z = pool.z; leaf.chem.hunger = 0.5; game.world.night = false; X.visit(game, leaf, 60);
  check("in the sun with water near it feeds a little", leaf.chem.hunger < 0.5 && !leaf.dry, leaf.chem.hunger);
  leaf.x = spot.x; leaf.z = spot.z;
  for (let i = 0; i < 6; i++) X.visit(game, leaf, 120);
  check("away from water it wilts", leaf.dry > X.DRY && X.vitals(game, leaf)[0].icon === "🌿");
  const kids = []; for (let i = 0; i < 40; i++) { const k = { id: 7000 + i, species: "smol", parents: [leaf.id] }; X.born(game, k); if (k.leafy) kids.push(k); }
  const wild = []; for (let i = 0; i < 400; i++) { const k = { id: 8000 + i, species: "smol", parents: [] }; X.born(game, k); if (k.leafy) wild.push(k); }
  check("leaves run in the family, and now and then turn up on their own", kids.length > 12 && wild.length > 0 && wild.length < 40, kids.length + " / " + wild.length);

  console.log("17. the fishing float");
  check("it starts red", X.bobber(game)[0] === "red float");
  for (let i = 0; i < 5; i++) SB.bus.emit("fishCaught", { c: me });
  check("five fish: a lime float", X.bobber(game)[0] === "lime float" && s.fish === 5);
  X.act(game, me, "bob");
  check("you can go back to the red one", X.bobber(game)[0] === "red float");
  for (let i = 0; i < 25; i++) SB.bus.emit("fishCaught", { c: me });
  delete s.bob;
  check("thirty: one that glows", X.bobber(game)[0] === "glow float" && X.bobber(game)[2] === 1);
  const line0 = H.line; H.line = () => ({ wx: pool.x, wz: pool.z, phase: "wait", tool: Object.keys(H.RODS)[0] });
  frame();
  const fl = drawn.filter(d => d.key === "p:ball" && Math.abs(d.x - pool.x) < 0.05 && Math.abs(d.z - pool.z) < 0.05);
  check("with a line out, the float is drawn on the water in that colour", fl.length === 2 && fl[0].tint.join() === X.BOBS[3][2].join() && fl[0].ext[1] > 0, fl.length);
  H.line = line0; frame();
  check("no line, no float", !drawn.some(d => d.key === "p:ball" && Math.abs(d.x - pool.x) < 0.05 && Math.abs(d.z - pool.z) < 0.05));

  console.log("18. safe on an empty or an old island");
  const g2 = SB.Game.newGame(7); SB.Game.current = g2;
  let threw = "";
  try { X.tick(g2, 5); X.tick(g2, 5); delete g2.quests.wardrobe3; X.tick(g2, 5); g2.quests.wardrobe3 = { hats: 3, banners: "x" }; X.tick(g2, 5); X.bobber(g2); X.mural(g2); hooks.forEach(h => h(g2, 1)); } catch (e) { threw = String(e && e.stack || e); }
  check("a brand-new island, a missing state and a broken one don't throw", !threw, threw.slice(0, 300));
  const old = SB.Debug.spawnTier(3, 1)[0]; delete old.wd; delete old.fit;
  try { W.fresh(old); W.look(old); VX.build(old); PX.paint(old); X.html(g2, old); X.visit(g2, old, 5); } catch (e) { threw = String(e && e.stack || e); }
  check("a smol from an old save (no wardrobe fields) draws and has a page", !threw, threw.slice(0, 300));
  SB.Game.current = game;
  const saved = JSON.parse(JSON.stringify({ wd: me.wd, q: game.quests.wardrobe3 }));
  check("everything kept is plain data that survives a save", saved.wd.mark === me.wd.mark && saved.q.hats.acorn === 1 && saved.q.banners.length === 1 && !Object.keys(me.wd).some(k => k[0] === "_"));
});
console.log(failed ? "\n" + failed + " FAILED, " + passed + " passed" : "\nall " + passed + " passed");
process.exit(failed ? 1 : 0);
