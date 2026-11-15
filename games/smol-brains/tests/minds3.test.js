// round 3, minds: rules the smols' own minds honour. An area, a job list, a diet, a home and a route per smol;
// filters and a fill order for stockpiles; a forbidden thing; a tribe's food way, a nest that moves, a second
// village; a standing "keep making"; a sorter; eyes that only see what they face; an alarm; the academy; luck.
// node games/smol-brains/tests/minds3.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0, passed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (ok) passed++; else failed++; }
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");
function run(SB, game, secs) { for (let t = 0; t < secs / SB.TICK; t++) { SB.Game.step(game, SB.TICK); SB.Ext.tick(game, SB.TICK); } }
function calm(SB, game) { SB.Game.smols(game).forEach(c => { c.chem.hunger = Math.min(c.chem.hunger, 0.2); c.chem.sick = 0; c.chem.fear = 0; c.chem.sleepy = Math.min(c.chem.sleepy, 0.3); c.chem.tired = Math.min(c.chem.tired, 0.3); c.chem.cold = 0; c.chem.pain = 0; }); }
function runFed(SB, game, secs) { for (let t = 0; t < secs; t++) { run(SB, game, 1); calm(SB, game); } }

function tribe(seed, tier, n, extra) {
  const ctx = load();
  ["ext.js", "body.js", "wilds.js"].concat(extra || []).concat(["minds3.js"]).forEach(f => vm.runInContext(js(f), ctx, { filename: f }));
  const SB = ctx.SB;
  const game = SB.Game.newGame(seed); SB.Game.current = game; game.tutorial.done = true; game.time = 300; game.podT = 1e9;
  if (game.dir) game.dir.nextT = 1e9;
  game.strangerT = 1e9;
  const cs = SB.Debug.spawnTier(tier, n), h = SB.Society.home(game, 0);
  SB.Debug.reveal();
  cs.forEach((c, i) => { c.asleep = false; c.x = h.x + (i % 4) * 1.2 - 2; c.z = h.z + Math.floor(i / 4) * 1.2 - 1; c.chem.hunger = 0.1; c.age = Math.max(c.age, 700); c.trust = 0.9; c.genome.genes.obedience = 0.5; });
  return { SB, game, cs, h, Mn: SB.Minds, O: SB.Orders, W: SB.World, ctx };
}
function spotAway(SB, game, h, d, r) {
  for (let a = 0; a < 64; a++) {
    const ang = a * 0.7, x = h.x + Math.cos(ang) * d, z = h.z + Math.sin(ang) * d;
    if (SB.World.inBounds(game.world, x, z) && SB.World.walkable(game.world, x, z) && SB.World.depthAt(game.world, x, z) < 0.05 && (!r || SB.World.siteFree(game.world, x, z, r))) return { x, z };
  }
  return null;
}
function grid(SB, game) { SB.World.tick(game.world, 0.0001, game); SB.World.rebuildCreatureGrid(game.world, game); }
// perceive keeps the nearest thing of each noun: is this one of them
// a spot the tribe can walk to from home, about d away
function reach(SB, game, h, d) {
  for (let a = 0; a < 64; a++) {
    const ang = a * 0.7, x = h.x + Math.cos(ang) * d, z = h.z + Math.sin(ang) * d, w = game.world;
    if (SB.World.inBounds(w, x, z) && SB.World.walkable(w, x, z) && SB.World.depthAt(w, x, z) < 0.05 && SB.World.findPath(w, h.x, h.z, x, z, false)) return { x, z };
  }
  return null;
}
// a kind of thing this smol has none of in view (perceive keeps one per noun)
function freeKind(SB, c, game) {
  grid(SB, game);
  const got = {}; SB.Creature.perceive(c, game).forEach(k => { got[SB.NOUNS[k.noun]] = 1; });
  return ["ball", "torch", "hammer", "stick", "stone", "basket"].filter(k => SB.KINDS[k] && !got[SB.KINDS[k].noun])[0];
}
function seen(SB, c, game, id) { grid(SB, game); return SB.Creature.perceive(c, game).some(k => k.t.id === id); }

const ONLY = process.env.SB_ONLY ? process.env.SB_ONLY.split(",").map(Number) : null;
function sec(n, title, fn) { if (ONLY && ONLY.indexOf(n) < 0) return; console.log(n + ". " + title); fn(); }

seeded(3301, () => {
  sec(1, "an island with no rule set", () => {
    const { SB, game, cs, Mn, O } = tribe(31, 3, 4);
    const c = cs[0];
    check("the module is there, and its state is made on demand only", !!Mn && !(game.quests && game.quests.minds3));
    check("nothing limits what a smol sees", Mn.sees(c, game) === null);
    check("no standing job", Mn.think(c, game) === false);
    check("no food way", Mn.wayNoun(c, game) === -1);
    check("nothing wanted", Mn.wanted(c, game) === null);
    O.place(game, "stock", c.x + 4, c.z);
    check("with no filter the old nearest-pile choice stands", Mn.stockFor(game, c, [{ kind: "stick" }]) === null);
    check("still no state after all that", !(game.quests && game.quests.minds3));
    const h = Mn.html(game, c);
    check("the you page gets two folded sections, no modal", /<details/.test(h) && /rules/.test(h) && /the tribe's ways/.test(h) && (h.match(/<details/g) || []).length === 2);
    check("wilds.js puts them in its page", /data-mn=/.test(SB.Wilds.youHtml(game, c)));
    run(SB, game, 5);
    check("five seconds run clean", cs.every(x => x.alive));
  });

  sec(2, "allowed area per smol", () => {
    const { SB, game, cs, h, Mn, W } = tribe(32, 3, 4);
    const c = cs[0], o = cs[1];
    check("the button sets it where the smol stands", Mn.cmd(game, c, "area:12") !== "" && c.area && c.area.r === 12 && Math.abs(c.area.x - c.x) < 0.1);
    c.viewR = 30; o.viewR = 30; o.x = c.x; o.z = c.z;
    const far = W.add(game.world, game, freeKind(SB, o, game), c.x + 16, c.z, {}), near = W.add(game.world, game, "apple", c.x + 1.2, c.z, {});
    check("it does not notice a thing outside its area", !seen(SB, c, game, far.id) && seen(SB, c, game, near.id));
    check("a smol with no area notices both", seen(SB, o, game, far.id));
    const a = { tx: c.area.x + 30, tz: c.area.z, called: false };
    Mn.steer(c, game, a);
    check("a wander target outside is pulled back in", SB.dist(a.tx, a.tz, c.area.x, c.area.z) <= c.area.r);
    c.x += 20;
    check("outside its area it walks back", Mn.think(c, game) === true && c.action && c.action.called && SB.dist(c.action.tx, c.action.tz, c.area.x, c.area.z) < c.area.r);
    c.chem.hunger = 0.95;
    check("starving, it may look anywhere", seen(SB, c, game, far.id) || Mn.sees(c, game)(far.x, far.z, far));
    c.chem.hunger = 0.1;
    Mn.cmd(game, c, "area:0");
    check("roam free clears it", c.area === null);
    c.x = h.x; c.area = { x: h.x, z: h.z, r: 10 };
    runFed(SB, game, 60);
    check("a minute later it is still inside", SB.dist(c.x, c.z, h.x, h.z) <= 12.5, SB.dist(c.x, c.z, h.x, h.z).toFixed(1));
  });

  sec(3, "a list of work marks for one smol", () => {
    const { SB, game, cs, Mn, O, W } = tribe(33, 3, 4);
    const c = cs[0], w = game.world;
    const n1 = W.addNode(w, game, "bush", c.x + 5, c.z + 1, 1), n2 = W.addNode(w, game, "bush", c.x - 5, c.z + 2, 1), n3 = W.addNode(w, game, "bush", c.x + 2, c.z + 6, 1);
    [n1, n2, n3].forEach(n => { n.state = "ok"; });
    const m = [n1, n2, n3].map(n => O.place(game, "mark", n.x, n.z, { hit: { type: "node", ref: n } }).o);
    check("three marks placed", m.every(Boolean));
    check("queue them for one smol", O.queue(game, c, m[2].id) && O.queue(game, c, m[0].id) && O.queue(game, c, m[1].id) && c.jobs.length === 3);
    check("the list is visible, in order", O.queueOf(game, c).map(o => o.id).join() === [m[2].id, m[0].id, m[1].id].join());
    check("a queued mark does not time out", m[2].until === null);
    check("it can be reordered", O.bump(c, m[0].id, -1) && c.jobs[0] === m[0].id);
    check("the page shows the list with buttons", /data-mn='qup:/.test(Mn.html(game, c)) && /data-mn='qdel:/.test(Mn.html(game, c)));
    c.trust = 0; c.genome.genes.obedience = 0.5;
    check("it takes the first of its list, trust or no trust", O.think(c, game) === true && c.ordOn === m[0].id);
    O.remove(game, m[0].id);
    check("a finished mark drops off the list", O.queueOf(game, c).length === 2 && c.jobs[0] === m[2].id);
    Mn.cmd(game, c, "qdel:" + m[2].id);
    check("the button takes one off", c.jobs.length === 1 && c.jobs[0] === m[1].id);
    cs[1].x = n2.x + 1; cs[1].z = n2.z;
    check("a mark near you can be added from the page", /data-mn='qadd:/.test(Mn.html(game, cs[1])) && Mn.cmd(game, cs[1], "qadd:" + m[1].id) !== "" && cs[1].jobs[0] === m[1].id);
  });

  sec(4, "stockpiles: item filters and a fill order; the granary first", () => {
    const { SB, game, cs, Mn, O, W } = tribe(34, 3, 4);
    const c = cs[0], w = game.world;
    const z1 = O.place(game, "stock", c.x + 5, c.z).o, z2 = O.place(game, "stock", c.x - 12, c.z).o;
    const stick = W.add(w, game, "stick", c.x, c.z, {}), apple = W.add(w, game, "apple", c.x, c.z, {});
    Mn.setOnly(z1, "food", true);
    check("a filter on the near pile: wood goes to the far one", Mn.stockFor(game, c, [stick]).z === z2 && Mn.stockFor(game, c, [apple]).z === z1);
    Mn.setOnly(z1, null);
    Mn.setPri(z2, 1);
    check("fill order: the far pile marked first wins", Mn.stockFor(game, c, [stick]).z === z2);
    Mn.setPri(z2, -1);
    check("marked last, it loses", Mn.stockFor(game, c, [stick]).z === z1);
    Mn.setPri(z2, 0); Mn.setOnly(z2, "stone", true);
    check("a pile that takes only stone gets no sticks", Mn.stockFor(game, c, [stick]).z === z1 && Mn.zoneOk(z2, "stone") && !Mn.zoneOk(z2, "stick"));
    c.x = z1.x; c.z = z1.z;
    check("standing in a pile, the page offers its filter and order", /data-mn='only:/.test(Mn.html(game, c)) && /fill first/.test(Mn.html(game, c)));
    Mn.cmd(game, c, "only:" + z1.id + ":food");
    check("the button sets it", z1.only && z1.only.food === 1);
    Mn.cmd(game, c, "only:" + z1.id + ":all");
    // a smol carrying a stick drops it on the pile that takes it
    Mn.setOnly(z1, "food", true); Mn.setOnly(z2, null);
    c.x = z1.x + 1; c.z = z1.z; SB.Creature.carry(c, stick, game, true);
    c.trust = 1; c.genome.genes.obedience = 1;
    let went = false;
    for (let i = 0; i < 6 && !went; i++) { c.ord = null; went = O.think(c, game) === true && c.ordOn === z2.id; }
    check("the hauler walks past the food-only pile to the other", went);
    // the granary
    const p = spotAway(SB, game, { x: c.x, z: c.z }, 8, 1.2);
    const g = W.addStructure(w, game, "granary", p.x, p.z, { done: true });
    SB.Civ.init(game); game.civ.granary = 0;
    check("off by default", Mn.granFirst(c, game, [apple]) === false && game.civ.granary === 0);
    Mn.cmd(game, c, "gran1");
    SB.Creature.carry(c, apple, game, false);
    c.x = g.x + 12; c.z = g.z;
    check("food first sets off for the granary", Mn.granFirst(c, game, [apple]) === true && c.action.called);
    c.x = g.x + 1.4; c.z = g.z + 0.6;
    const goods = [apple];
    Mn.granFirst(c, game, goods);
    check("there, the food goes in and leaves the cargo", game.civ.granary === 1 && goods.length === 0 && c.bag.indexOf(apple.id) < 0 && c.holding !== apple.id);
  });

  sec(5, "forbid one thing; food and treat rules per smol", () => {
    const { SB, game, cs, Mn, W } = tribe(35, 3, 3);
    const c = cs[0], o = cs[1], w = game.world;
    c.viewR = 20; o.viewR = 20; o.x = c.x; o.z = c.z;
    const a1 = W.add(w, game, "apple", c.x + 2, c.z, {});
    check("an apple is noticed", seen(SB, c, game, a1.id));
    Mn.forbid(game, a1, true);
    check("forbidden: nobody notices it", !seen(SB, c, game, a1.id) && !seen(SB, o, game, a1.id));
    SB.Ideas.learn(c, "cook", 1, game, "test");
    check("a plan that needs food passes it by too", SB.Ideas.findSource(c, "food", game) === null || SB.Ideas.findSource(c, "food", game).item !== a1);
    c.x = a1.x - 1; grid(SB, game);
    check("the page has the button for the thing at your feet", new RegExp("data-mn='forbid:" + a1.id + "'").test(Mn.html(game, c)) && /forbidden/.test(Mn.html(game, c)));
    Mn.cmd(game, c, "forbid:" + a1.id); c.unreach = null;
    check("allowed again", !a1.data.forbid && seen(SB, c, game, a1.id));
    check("the same button forbids", /no smol will touch/.test(Mn.cmd(game, c, "forbid:" + a1.id)) && a1.data.forbid === 1);
    Mn.cmd(game, c, "forbid:" + a1.id); c.unreach = null;
    const meat = W.add(w, game, "meat", c.x + 0.5, c.z + 0.3, {});
    Mn.cmd(game, c, "diet:meat");
    check("a no-meat smol does not see meat as food; the others do", c.diet.meat === 1 && !seen(SB, c, game, meat.id) && seen(SB, o, game, meat.id) && seen(SB, c, game, a1.id), "its nearest food is the apple now");
    check("the page shows the rule switched on", /class='btn go' data-mn='diet:meat'/.test(Mn.html(game, c)));
    Mn.cmd(game, c, "diet:meat");
    check("and off again", c.diet === null && seen(SB, c, game, meat.id));
    const herb = W.add(w, game, "herb", c.x + 1.5, c.z - 1, {});
    check("treats any time by default", seen(SB, c, game, herb.id));
    Mn.cmd(game, c, "treat:never");
    check("never: it leaves the herb alone", !seen(SB, c, game, herb.id));
    Mn.cmd(game, c, "treat:sick");
    check("only when poorly: not while well", !seen(SB, c, game, herb.id));
    c.chem.sick = 0.5;
    check("poorly: now it may", seen(SB, c, game, herb.id));
    Mn.cmd(game, c, "treat:any");
    check("any time clears the rule", c.treat === null);
  });

  sec(6, "a tribe's food way", () => {
    const { SB, game, cs, Mn, W } = tribe(36, 3, 3);
    const c = cs[0], V = SB.V;
    Mn.cmd(game, c, "way:shrooms");
    check("shroom-loving is kept on the tribe", game.tribes[0].way === "shrooms" && Mn.wayNoun(c, game) === SB.N.mushroom);
    const mask = [], bias = new Float32Array(SB.VERBS.length); mask[V.eat] = true; c.chem.hunger = 0.5;
    check("a peckish smol leans toward eating one", Mn.bias(c, game, "mushroom", mask, bias) === true && bias[V.eat] > 0.4);
    c.chem.toxin = 0.5; c.chem.pain = 0.4;
    SB.bus.emit("eat", { c: c, obj: { kind: "shroom", noun: "mushroom" } });
    Mn.tick(game, 0.1);
    check("and it sits well with them", c.chem.toxin < 0.2 && c.chem.pain < 0.2);
    Mn.cmd(game, c, "way:bugs");
    check("bug-loving", Mn.wayNoun(c, game) === SB.N.bug && /class='btn go' data-mn='way:bugs'/.test(Mn.html(game, c)));
    Mn.cmd(game, c, "way:none");
    check("back to anything", !game.tribes[0].way && Mn.wayNoun(c, game) === -1);
  });

  sec(7, "keep making this", () => {
    const { SB, game, cs, Mn, W } = tribe(37, 3, 3);
    const c = cs[0], w = game.world;
    for (let i = 0; i < 4; i++) SB.Ideas.learn(c, "weave", 1, game, "test");
    check("it knows weaving", SB.Ideas.known(c, "weave"));
    for (let i = 0; i < 3; i++) W.add(w, game, "fiber", c.x + 1 + i * 0.3, c.z + 1, {});
    check("no standing order, nothing wanted", Mn.wanted(c, game) === null);
    Mn.keep(game, "basket", 2);
    check("keep 2 baskets: the one who can make them wants to", Mn.wanted(c, game) && Mn.wanted(c, game).id === "weave");
    const mask = [], bias = new Float32Array(SB.VERBS.length); mask[SB.V.make] = true;
    check("it leans toward making", Mn.bias(c, game, "stick", mask, bias) && bias[SB.V.make] > 0.5);
    let plan = null; grid(SB, game);
    for (let i = 0; i < 5 && !plan; i++) plan = SB.Ideas.chooseMake(c, game);
    check("and when it makes something, it is that", !!plan && plan.idea === "weave");
    check("another smol who can't make baskets is not bothered", Mn.wanted(cs[1], game) === null || SB.Ideas.known(cs[1], "weave"));
    W.add(w, game, "basket", c.x, c.z + 2, {}); W.add(w, game, "basket", c.x, c.z + 3, {});
    game.time += 5; grid(SB, game);
    check("two about: the order rests", Mn.wanted(c, game) === null);
    Mn.cmd(game, c, "keep:basket:0");
    check("the ✕ clears it", Mn.state(game).keep.length === 0);
  });

  sec(8, "a named smol in a named hut; moving out and moving in together", () => {
    const { SB, game, cs, h, Mn, W } = tribe(38, 3, 4);
    const c = cs[0], o = cs[1], w = game.world;
    const p1 = spotAway(SB, game, h, 9, 1.5), hut1 = W.addStructure(w, game, "hut", p1.x, p1.z, { done: true });
    const p2 = spotAway(SB, game, { x: h.x + 3, z: h.z - 3 }, 22, 1.5), hut2 = W.addStructure(w, game, "hut", p2.x, p2.z, { done: true });
    c.x = hut1.x + 1.5; c.z = hut1.z;
    SB.Creature.start(c, game, SB.V.sleep);
    check("with no home it beds down in the nearest hut", c.action.target && c.action.target.id === hut1.id);
    c.x = hut2.x + 2; c.z = hut2.z;
    check("stand by a hut and the page offers it", new RegExp("data-mn='house:" + hut2.id + "'").test(Mn.html(game, c)));
    Mn.cmd(game, c, "house:" + hut2.id);
    check("the hut is named for its smol", c.hut === hut2.id && hut2.name === c.name + "'s hut" && Mn.residents(game, hut2).length === 1);
    c.x = hut1.x + 1.5; c.z = hut1.z; c.action = null;
    SB.Creature.start(c, game, SB.V.sleep);
    check("now it walks past the near hut to its own bed", c.action.target && c.action.target.id === hut2.id);
    check("moving in together", Mn.merge(game, c, o) && o.hut === hut2.id && Mn.residents(game, hut2).length === 2);
    const moved = Mn.cmd(game, o, "moveout");
    check("moving out picks the emptiest other home", o.hut === hut1.id && /moved to/.test(moved));
    Mn.cmd(game, c, "unhouse");
    check("✕ and it sleeps anywhere again", c.hut === null);
  });

  sec(9, "hauler routes between stores, and the sorter", () => {
    const { SB, game, cs, h, Mn, O, W } = tribe(39, 3, 4);
    const c = cs[0], s = cs[1], w = game.world;
    cs[2].area = { x: h.x - 30, z: h.z - 30, r: 6 }; cs[3].area = { x: h.x - 30, z: h.z - 30, r: 6 }; s.area = { x: h.x - 8, z: h.z + 3, r: 9 }; // keep the others' paws off the test's things
    const z1 = O.place(game, "stock", h.x + 6, h.z).o;
    const pg = spotAway(SB, game, h, 14, 1.2), g = W.addStructure(w, game, "granary", pg.x, pg.z, { done: true });
    SB.Civ.init(game); game.civ.granary = 0;
    for (let i = 0; i < 3; i++) { const it = W.add(w, game, "apple", z1.x + i * 0.4 - 0.4, z1.z, {}); it.data.piled = 1; }
    const refs = Mn.stores(game);
    check("the stores are found: a pile and the granary", refs.indexOf("z" + z1.id) >= 0 && refs.indexOf("g") >= 0);
    check("the page offers the route", new RegExp("data-mn='route:z" + z1.id + ":g'").test(Mn.html(game, c)));
    Mn.cmd(game, c, "route:z" + z1.id + ":g");
    check("the smol has a route", c.route != null && Mn.routeOf(game, c).a === "z" + z1.id);
    grid(SB, game); c.convo = null; calm(SB, game);
    c.x = z1.x + 12; c.z = z1.z;
    check("it sets off for the pile", Mn.think(c, game) === true && SB.dist(c.action.tx, c.action.tz, z1.x, z1.z) < 3 && !c.load);
    c.x = z1.x + 1; c.z = z1.z;
    check("at the pile it loads up and turns for the granary", Mn.think(c, game) === true && c.load && c.load.k === "apple" && c.load.n === 3 && SB.dist(c.action.tx, c.action.tz, g.x, g.z) < 3);
    grid(SB, game);
    check("the apples are off the pile", Mn._count(game, "z" + z1.id, "apple") === 0);
    c.x = g.x + 1.2; c.z = g.z + 0.5;
    Mn.think(c, game);
    check("at the granary they go in", game.civ.granary === 3 && !c.load, "granary " + game.civ.granary);
    check("the route counts what it carried", Mn.routeOf(game, c).n === 3);
    check("nothing left to carry: it rests", Mn.think(c, game) === false);
    for (let i = 0; i < 2; i++) { const it = W.add(w, game, "apple", z1.x + i * 0.4, z1.z + 0.5, {}); it.data.piled = 1; }
    c.x = z1.x + 3; c.z = z1.z;
    runFed(SB, game, 100);
    check("left to itself it keeps the route going", game.civ.granary >= 4, "granary " + game.civ.granary);
    Mn.cmd(game, c, "unroute");
    check("stop ends it", c.route === null && Mn.state(game).routes.length === 0);
    // the sorter: a second pile that takes only stone is the matching store for stones
    const z2 = O.place(game, "stock", h.x - 7, h.z + 3).o;
    Mn.setOnly(z2, "stone", true);
    s.x = z2.x + 6; s.z = z2.z;
    const st1 = W.add(w, game, "stone", s.x + 2, s.z + 1, {}), st2 = W.add(w, game, "stone", s.x + 3, s.z - 1, {}), toy = W.add(w, game, "ball", s.x + 1, s.z + 2, {});
    check("stones match the stone pile; a ball matches nothing", Mn.matchFor(game, "stone") === "z" + z2.id && Mn.matchFor(game, "ball") === null);
    Mn.cmd(game, s, "sorter");
    check("sorting switched on", s.sorter === 1 && /class='btn go' data-mn='sorter'/.test(Mn.html(game, s)));
    grid(SB, game); s.convo = null; calm(SB, game);
    check("it goes to a loose stone", Mn.think(s, game) === true && (SB.dist(s.action.tx, s.action.tz, st1.x, st1.z) < 0.5 || SB.dist(s.action.tx, s.action.tz, st2.x, st2.z) < 0.5));
    s.x = s.action.tx + 0.5; s.z = s.action.tz;
    check("picks it up for the matching pile", Mn.think(s, game) === true && s.load && s.load.k === "stone" && s.sortTo === "z" + z2.id && (st1.gone || st2.gone || game.world.items.filter(o => o.kind === "stone" && (o === st1 || o === st2)).length === 1));
    Mn.think(s, game);
    check("and carries it there", s.action && s.action.called && SB.dist(s.action.tx, s.action.tz, z2.x, z2.z) < 3);
    s.x = z2.x + 1; s.z = z2.z; Mn.think(s, game); grid(SB, game);
    check("the stone is filed in the stone pile", Mn._count(game, "z" + z2.id, "stone") === 1 && !s.load && s.sorted === 1);
    s.area = null; runFed(SB, game, 120);
    check("a filed stone is not picked up again", Mn._count(game, "z" + z2.id, "stone") >= 1 && s.sorted >= 1, "in pile " + Mn._count(game, "z" + z2.id, "stone"));
    check("the ball stays where it was", !toy.gone && SB.dist(toy.x, toy.z, z2.x, z2.z) > z2.r);
    Mn.cmd(game, s, "sorter");
    check("and off", !s.sorter);
  });

  sec(10, "eyes that see only what they face", () => {
    const { SB, game, cs, Mn, W } = tribe(40, 3, 2);
    const c = cs[0], w = game.world;
    c.viewR = 20; c.facing = 0; // facing +z
    const ahead = W.add(w, game, "stick", c.x, c.z + 6, {}), behind = W.add(w, game, "stone", c.x, c.z - 6, {}), close = W.add(w, game, "ball", c.x, c.z - 2, {});
    check("all-round eyes see behind", seen(SB, c, game, behind.id));
    Mn.cmd(game, c, "eyes:1");
    check("facing only: ahead yes, behind no", seen(SB, c, game, ahead.id) && !seen(SB, c, game, behind.id));
    check("something right behind is still heard", seen(SB, c, game, close.id));
    c.facing = Math.PI;
    check("turn round and it is the other way about", !seen(SB, c, game, ahead.id) && seen(SB, c, game, behind.id));
    Mn.cmd(game, c, "eyes:0");
    check("back to all round", seen(SB, c, game, ahead.id) && seen(SB, c, game, behind.id));
  });

  sec(11, "a learned urge for bridges and doors", () => {
    const { SB, game, cs, h, Mn, W } = tribe(41, 3, 3);
    const c = cs[0], w = game.world;
    const b = W.addStructure(w, game, "bridge", h.x + 6, h.z + 2, { done: true });
    check("no urge to begin with", !c.nav);
    c.x = b.x + 0.4; c.z = b.z;
    let learned = 0; SB.bus.on("navLearned", () => learned++);
    for (let i = 0; i < 5; i++) Mn._learnWays(game);
    check("crossing it a few times teaches the bridge", c.nav && c.nav.bridge > 0.2 && learned === 1);
    c.nav.bridge = 1; c.x = b.x - 6; c.z = b.z;
    let over = 0;
    for (let i = 0; i < 40; i++) { game.time += 1.37; const a = { tx: c.x - 5, tz: c.z, called: false }; Mn.steer(c, game, a); if (a.why === "over the bridge" && a.tx > b.x) over++; }
    check("now some of its wanders head over the bridge", over > 3 && over < 40, over + "/40");
    const hut = W.addStructure(w, game, "hut", h.x - 8, h.z + 4, { done: true });
    const d = cs[1]; d.x = hut.x; d.z = hut.z; d.inBed = true;
    for (let i = 0; i < 5; i++) Mn._learnWays(game);
    d.inBed = false; d.x = hut.x + 9;
    check("sleeping indoors teaches the door", d.nav && d.nav.door > 0.2);
    game.world.weather.rain = 0.9;
    check("in the rain it heads in through the door", Mn.think(d, game) === true && SB.dist(d.action.tx, d.action.tz, hut.x, hut.z) < 0.1);
    game.world.weather.rain = 0;
    check("in the dry it does not", Mn.think(d, game) === false);
  });

  sec(12, "finding someone who died: the alarm", () => {
    const { SB, game, cs, h, Mn } = tribe(42, 3, 6);
    const dead = cs[0], finder = cs[1], guard = cs[2];
    cs.forEach((c, i) => { if (i > 0) { c.x = h.x + 15 + i; c.z = h.z + 12; c.genome.genes.bravery = 0.2; } });
    guard.job = "guard"; guard.stage = 3;
    let ev = null; SB.bus.on("alarm", d => { ev = d; });
    dead.x = h.x - 6; dead.z = h.z - 4;
    SB.Creature.die(dead, game, "hurt"); grid(SB, game);
    Mn.tick(game, 1.1);
    check("nobody near: no alarm yet", ev === null && Mn._bodies.length === 1);
    finder.x = dead.x + 3; finder.z = dead.z; finder.asleep = false; grid(SB, game);
    const f0 = finder.chem.fear;
    Mn.tick(game, 1.1);
    check("a smol comes across it and raises the alarm", ev && ev.c === finder && ev.name === dead.name && finder.chem.fear > f0);
    check("the guard comes running", ev.came >= 1 && guard.action && guard.action.called && SB.dist(guard.action.tx, guard.action.tz, dead.x, dead.z) < 4);
    check("it is told once, in the log", game.log.filter(l => /raised the alarm/.test(l.text)).length === 1 && Mn._bodies.length === 0);
    const old = cs[3]; ev = null;
    SB.Creature.die(old, game, "old");
    cs[4].x = old.x + 1; cs[4].z = old.z; grid(SB, game);
    Mn.tick(game, 1.1);
    check("old age in good company is no alarm", ev === null);
  });

  sec(13, "the glowshroom grove is safe ground", () => {
    const { SB, game, cs, h, Mn, W } = tribe(43, 3, 2);
    const w = game.world, c = cs[0];
    const p = spotAway(SB, game, h, 16);
    const t = W.addNode(w, game, "shroomtree", p.x, p.z, 1); t.state = "ok";
    check("standing among glowshrooms counts as safe ground", !!SB.Wilds.grove(game, p.x + 2, p.z) && !SB.Wilds.grove(game, p.x + 20, p.z));
    c.x = p.x + 1.5; c.z = p.z;
    check("the dark does not count there", SB.Wilds.lit(game, c) === "grove");
    game.world.night = true; game.settings = game.settings || {};
    check("and the body says so", SB.Wilds.chips(game, c, { c: c }).some(k => k.k === "grove") || c.tier < 2);
    const boss = SB.Game.spawnGrump(game, p.x + 2, p.z - 2); boss.boss = "test";
    check("a captain is left to its fight", Mn._grove(game) === 0);
    boss.alive = false;
    const g = SB.Game.spawnGrump(game, p.x + 3, p.z + 1);
    check("a grump in the grove is turned out", Mn._grove(game) === 1 && g.action && SB.dist(g.action.tx, g.action.tz, p.x, p.z) > SB.Wilds.GROVE_R);
    g.x = p.x + 30; g.z = p.z;
    check("one outside is left alone", Mn._grove(game) === 0);
    g.x = p.x + 4; g.z = p.z;
    for (let i = 0; i < 20; i++) run(SB, game, 1);
    check("after twenty seconds it is not among the glowshrooms", !g.alive || SB.dist(g.x, g.z, p.x, p.z) > 5, SB.dist(g.x, g.z, p.x, p.z).toFixed(1));
  });

  sec(14, "moving the nest; the tribe follows", () => {
    const { SB, game, cs, h, Mn } = tribe(44, 3, 6);
    const c = cs[0], p = spotAway(SB, game, h, 34);
    const h0 = { x: h.x, z: h.z };
    c.x = p.x; c.z = p.z;
    check("the button moves the nest to where you stand", /the nest moves/.test(Mn.cmd(game, c, "nest")) && SB.dist(SB.Society.home(game, 0).x, SB.Society.home(game, 0).z, p.x, p.z) < 0.1);
    for (let i = 0; i < 3; i++) SB.Society.tick(game, 5);
    check("it stays put through the tribe's own home-drift", SB.dist(SB.Society.home(game, 0).x, SB.Society.home(game, 0).z, p.x, p.z) < 0.1 && game.tribes[0].pin);
    check("the others set off for it", Mn.think(cs[2], game) === true && SB.dist(cs[2].action.tx, cs[2].action.tz, p.x, p.z) < 5);
    runFed(SB, game, 120);
    const there = cs.filter(o => o.alive && SB.dist(o.x, o.z, p.x, p.z) < 16).length;
    check("two minutes on, most of the tribe is at the new nest", there >= 4, there + "/6 (old home " + cs.filter(o => SB.dist(o.x, o.z, h0.x, h0.z) < 10).length + ")");
    Mn.cmd(game, c, "nomad");
    check("the tribe follows me: switched on", Mn.state(game).nomad === 1);
    const p2 = spotAway(SB, game, { x: p.x, z: p.z }, 36);
    SB.Possess = { state: () => ({ c: c, game: game }), headless: true };
    c.x = p2.x; c.z = p2.z;
    Mn.tick(game, 5.1);
    check("walk 30 m off in a body and the nest comes after you", SB.dist(SB.Society.home(game, 0).x, SB.Society.home(game, 0).z, p2.x, p2.z) < 0.1 && game.tribes[0].moved === 2);
    c.x += 6; Mn.tick(game, 5.1);
    check("a few steps do not move it again", game.tribes[0].moved === 2);
    SB.Possess = null;
  });

  sec(15, "a second village you run; boarding school; moving between them", () => {
    const { SB, game, cs, h, Mn } = tribe(45, 3, 10);
    const c = cs[0], p = reach(SB, game, h, 46);
    check("too close to home: no", !Mn.found(game, c).ok);
    c.x = p.x; c.z = p.z;
    const r = Mn.found(game, c);
    check("founded out there", r.ok && game.tribes.length === 2 && c.tribe === 1 && SB.dist(game.tribes[1].home.x, game.tribes[1].home.z, p.x, p.z) < 0.1);
    const went = SB.Society.members(game, 1), stayed = SB.Society.members(game, 0);
    check("some go with the founder, most stay", went.length >= 3 && stayed.length >= 5, went.length + " went");
    check("it has its own home point and its own pile", SB.Society.home(game, 1) !== SB.Society.home(game, 0) && game.orders.list.some(o => o.kind === "stock" && SB.dist(o.x, o.z, p.x, p.z) < 6));
    check("only one second village", !Mn.found(game, c).ok);
    let sw = null; SB.bus.on("villageSwitch", d => { sw = d; });
    check("the sky looks after the new one, and can switch back", Mn.at(game) === 1 && Mn.cmd(game, c, "switch") === "" && Mn.at(game) === 0 && sw && sw.tribe.id === 0);
    for (let i = 0; i < 4; i++) SB.Society.tick(game, 5);
    check("the second village gets a name of its own", !!game.tribes[1].name && game.tribes[1].name !== game.tribes[0].name);
    runFed(SB, game, 150);
    const there = went.filter(o => o.alive && SB.dist(o.x, o.z, p.x, p.z) < 18).length;
    check("its people live there", there >= Math.ceil(went.length / 2), there + "/" + went.length);
    // boarding school
    const kid = stayed[0]; kid.stage = 2;
    const teacher = went[1]; teacher.stage = 3; for (let i = 0; i < 4; i++) SB.Ideas.learn(teacher, "weave", 1, game, "test");
    stayed.forEach(o => { delete o.ideas.weave; });
    check("an idea only the other village has", SB.Ideas.known(teacher, "weave") && !SB.Ideas.known(kid, "weave"));
    check("the page offers school to a young one", /data-mn='board'/.test(Mn.html(game, kid)) && !/data-mn='board'/.test(Mn.html(game, stayed[1])));
    check("off to school", /school/.test(Mn.cmd(game, kid, "board")) && kid.tribe === 1 && kid.board.h === 0);
    kid.convo = null; kid.heldBy = null; calm(SB, game);
    kid.x = SB.Society.home(game, 0).x + 1; kid.z = SB.Society.home(game, 0).z;
    check("it walks to the other village", Mn.think(kid, game) === true && SB.dist(kid.action.tx, kid.action.tz, p.x, p.z) < 6);
    game.time = kid.board.t + 1;
    check("a day later it comes home with the idea", Mn.think(kid, game) === true && kid.tribe === 0 && !kid.board && SB.Ideas.known(kid, "weave") && kid.schooled === 1);
    // a chosen move
    const mover = stayed[2];
    check("a smol can move to the other village", Mn.cmd(game, mover, "moveto:1") !== "" && mover.tribe === 1 && mover.hut === null);
  });

  sec(16, "the academy", () => {
    const { SB, game, cs, h, Mn, W } = tribe(46, 5, 3);
    const c = cs[0], low = cs[1]; low.tier = 3;
    check("no academy without a star dome or a hall", !SB.Civ.enroll(game, c, "stars").ok);
    const p = spotAway(SB, game, h, 10, 1.5), dome = W.addStructure(game.world, game, "observatory", p.x, p.z, { done: true });
    check("only thinkers", !SB.Civ.enroll(game, low, "stars").ok);
    check("the page offers the four studies", /data-mn='study:stars'/.test(Mn.html(game, c)) && /data-mn='study:growing'/.test(Mn.html(game, c)));
    check("enrolled", /study/.test(Mn.cmd(game, c, "study:making")) && c.study.m === "making");
    c.x = dome.x + 20; c.z = dome.z; game.world.night = false;
    check("it walks to the dome to study", Mn.think(c, game) === true && SB.dist(c.action.tx, c.action.tz, dome.x, dome.z) < 4);
    SB.Civ.academy(game, 60);
    check("no progress from far away", c.study.p === 0);
    c.x = dome.x + 2;
    SB.Civ.academy(game, 120);
    check("half a term at the dome", Math.abs(c.study.p - 50) < 1 && /50%/.test(Mn.html(game, c)));
    let deg = null; SB.bus.on("degree", d => { deg = d; });
    const lv0 = SB.Body.level(c, "craft");
    SB.Civ.academy(game, 130);
    check("a degree: a specialty for good", c.degree === "making" && !c.study && deg && deg.major === "making" && c.jobLean === "smith" && (c.jobXp.smith || 0) >= 6);
    check("the skill comes with it", SB.Body.level(c, "craft") > lv0);
    check("one degree each", !SB.Civ.enroll(game, c, "stars").ok && /a degree in making/.test(Mn.html(game, c)));
  });

  sec(17, "luck, mood and prices", () => {
    const { SB, game, cs, h, Mn, W } = tribe(47, 4, 4);
    const c = cs[0];
    const l = Mn.luck(c, game);
    check("luck is one number per smol per day", typeof l === "number" && l >= -1 && l <= 1 && Mn.luck(c, game) === l);
    const ls = cs.map(o => Mn.luck(o, game));
    check("it differs from smol to smol", ls.some(v => v !== ls[0]));
    Mn.state(game).luck = 0.5;
    check("a lucky island tilts it, and a chance with it", Mn.luck(c, game) > l && Mn.lucky(c, 0.4, game) > 0.4 && SB.luck === Mn.luck);
    check("the page says how the day looks", /luck today: (very good|good|so-so|poor|rotten)/.test(Mn.html(game, c)));
    // lucky perks land more often (body.js B.roll)
    const a = cs[1], b = cs[2];
    SB.Body.of(a).sk.cook = { l: 4, x: 0 }; SB.Body.of(b).sk.cook = { l: 4, x: 0 };
    Mn.state(game).luck = 1; let na = 0; for (let i = 0; i < 40; i++) if (SB.Body.roll(a, "cook")) na++;
    Mn.state(game).luck = -1; let nb = 0; for (let i = 0; i < 40; i++) if (SB.Body.roll(b, "cook")) nb++;
    check("a lucky cook gets more second helpings", na > nb, na + " vs " + nb);
    Mn.state(game).luck = 0;
    // prices from mood
    SB.Economy.init(game);
    const p = spotAway(SB, game, h, 8, 1.2), st = W.addStructure(game.world, game, "stall", p.x, p.z, { done: true });
    const keeper = cs[3]; st.data.owner = keeper.id; st.data.good = "food"; st.data.ask = 2; st.data.stock = 3; st.data.hist = []; st.data.sold = 0;
    calm(SB, game); keeper.chem.lonely = 0; keeper.chem.bored = 0; keeper.chem.anger = 0;
    const happy = SB.Economy.askOf(game, st);
    keeper.chem.anger = 0.9; keeper.chem.pain = 0.8;
    const sour = SB.Economy.askOf(game, st);
    check("a happy keeper asks less than a miserable one", happy < sour && happy <= 2 && sour >= 2, happy + " vs " + sour);
    game.econ.coins = true; c.purse = 10; keeper.purse = 0;
    check("and that is what the buyer pays", SB.Economy.buy(game, c, st) && Math.abs((10 - c.purse) - sour) < 0.011);
  });

  sec(18, "a happy village lights a travel stone", () => {
    const { SB, game, cs, h, Mn, W } = tribe(48, 3, 5);
    SB.STRUCTS.poi_waystone = SB.STRUCTS.poi_waystone || { noun: "wonder", label: "waystone", emoji: "🌀", r: 0.5, cost: {}, work: 1, desc: "" };
    game.villages.push({ id: 0, name: "Testby", x: h.x, z: h.z, tribe: 0, founded: 0 });
    const v = game.villages[0];
    calm(SB, game); cs.forEach(c => { c.chem.lonely = 0; c.chem.bored = 0; c.chem.anger = 0; }); grid(SB, game);
    Mn._stones(game); Mn._stones(game);
    check("not yet: it has to last", v.stone == null && v.joy === 2);
    Mn._stones(game);
    const st = v.stone != null ? W.structById(game.world, v.stone) : null;
    check("a happy village lights a stone you can travel from", !!st && st.kind === "poi_waystone" && st.data.awake === 1 && SB.dist(st.x, st.z, h.x, h.z) < 6);
    check("it is told once", game.log.filter(l => /lit a travel stone/.test(l.text)).length === 1);
    cs.forEach(c => { c.chem.anger = 0.9; c.chem.hunger = 0.7; });
    for (let i = 0; i < 4; i++) Mn._stones(game);
    check("a glum village: the stone goes dark", st && st.data.awake === 0);
    calm(SB, game); cs.forEach(c => { c.chem.anger = 0; });
    for (let i = 0; i < 4; i++) Mn._stones(game);
    check("cheered up: lit again, the same stone", st && st.data.awake === 1 && v.stone === st.id);
  });

  sec(19, "the horn reads a sign out; lost and found; shuffled asks; species leanings", () => {
    const { SB, game, cs, h, Mn, W, ctx } = tribe(49, 3, 5);
    const c = cs[0], w = game.world;
    SB.STRUCTS.sign = SB.STRUCTS.sign || { noun: "material", label: "signpost", emoji: "🪧", r: 0.3, cost: { stick: 2 }, work: 2, desc: "" };
    check("no sign, no horn", !Mn.horn(game, c).ok && !/data-mn='horn'/.test(Mn.html(game, c)));
    const p = spotAway(SB, game, h, 12, 0.5), sign = W.addStructure(w, game, "sign", p.x, p.z, { done: true });
    sign.name = "supper by the fire";
    c.x = sign.x + 1; c.z = sign.z;
    let heard = null; SB.bus.on("horn", d => { heard = d; });
    check("by a sign with words the page has the horn", /data-mn='horn'/.test(Mn.html(game, c)));
    check("the horn reads the sign out", /supper by the fire/.test(Mn.cmd(game, c, "horn")) && heard && heard.text === "supper by the fire");
    check("the others come to hear it", Mn.think(cs[2], game) === true && SB.dist(cs[2].action.tx, cs[2].action.tz, sign.x, sign.z) < 3);
    check("not twice in a row", !Mn.horn(game, c).ok);
    // lost and found
    check("nothing lost, no line", !/lost and found/.test(Mn.html(game, c)));
    W.add(w, game, "honey", cs[3].x + 0.9, cs[3].z + 0.7, {});
    SB.bus.emit("friendGift", { c: cs[3], kind: "honey", where: "by the nest" });
    check("a gift left while you were away goes in the box, not on the ground", Mn.state(game).lost.length === 1 && Mn.state(game).lost[0].by === cs[3].name && !w.items.some(o => o.kind === "honey" && !o.gone && o.heldBy == null && SB.dist(o.x, o.z, cs[3].x, cs[3].z) < 3));
    check("the box is at home", !Mn.claim(game, c).ok && /disabled/.test(Mn.html(game, c).split("lost and found")[1]));
    c.x = h.x + 1; c.z = h.z;
    const r = Mn.cmd(game, c, "claim");
    check("at home you take it", /you took: honey/.test(r) && Mn.state(game).lost.length === 0, r);
    // shuffled asks
    SB.Dark = SB.Dark || { ASKS: [["fish", 5, 6, 2], ["stick", 6, 3, 0], ["stone", 4, 3, 0], ["berry", 5, 3, 0]] };
    const base = SB.Dark.ASKS.map(a => a.join());
    Mn.cmd(game, c, "remix");
    const mixed = SB.Dark.ASKS.map(a => a.join());
    check("shuffled: the village asks for other things, same sizes and pay", Mn.state(game).remix === 1 && mixed.length === base.length && mixed.every((m, i) => m.split(",")[0] !== base[i].split(",")[0] && m.split(",").slice(1).join() === base[i].split(",").slice(1).join()));
    Mn.remix(game);
    check("the same island shuffles the same way", SB.Dark.ASKS.map(a => a.join()).join("|") === mixed.join("|"));
    Mn.cmd(game, c, "remix");
    check("off puts the old set back", SB.Dark.ASKS.map(a => a.join()).join("|") === base.join("|"));
    // species leanings
    const B = SB.Body, a = cs[1], b = cs[2];
    a.clade = 0; b.clade = 3;
    const ln = B.leans(b);
    check("the first species leans nowhere; a later one has a strong and a weak skill", B.leans(a) === null && ln && ln.up.id !== ln.down.id && B.lean(b, ln.up.id) === 1.5 && B.lean(b, ln.down.id) === 0.75);
    B.xp(a, ln.up.id, 2); B.xp(b, ln.up.id, 2);
    check("it learns its strong skill faster", B.of(b).sk[ln.up.id].x > B.of(a).sk[ln.up.id].x);
    check("the you page says what your kind takes to", new RegExp("takes to " + ln.up.label).test(SB.Wilds.youHtml(game, b)) && !/takes to/.test(SB.Wilds.youHtml(game, a)));
  });

  sec(20, "a feud settled at the council hall", () => {
    const { SB, game, cs, h, W } = tribe(50, 3, 4);
    const a = cs[0], b = cs[1], D = SB.Director;
    for (let i = 0; i < 4; i++) { SB.Social.remember(game, a, b, "x" + i, -30, "stole my berries", 9999); SB.Social.remember(game, b, a, "y" + i, -30, "called me names", 9999); }
    let inc = D.feud.start(game);
    check("no hall: the old three answers", inc.choices.length === 3 && !inc.choices.some(c => c.key === "council"));
    const p = spotAway(SB, game, h, 12, 1.8), hall = W.addStructure(game.world, game, "hall", p.x, p.z, { done: true });
    game.dir = game.dir || {}; D.state(game).active = null;
    inc = D.feud.start(game); inc.id = "feud"; inc.t0 = game.time; inc.phase = "ask"; D.state(game).active = inc;
    check("with a hall there is a fourth: settle it at the council hall", inc.choices.some(c => c.key === "council" && !c.cost) && inc.hall === hall.id);
    const before = SB.Social.opinion(game, a, b);
    check("chosen: both walk to the hall", D.choose(game, inc, "council") && a.action && a.action.called && SB.dist(a.action.tx, a.action.tz, hall.x, hall.z) < 3 && SB.dist(b.action.tx, b.action.tz, hall.x, hall.z) < 3);
    a.x = hall.x + 1.6; a.z = hall.z + 0.8; b.x = hall.x - 1.6; b.z = hall.z + 0.8;
    let ended = null; SB.bus.on("incidentEnd", d => { ended = d; });
    D.feud.tick(game, inc);
    check("both there: it is settled, and nobody fought", ended && ended.ok && /settled/.test(ended.text) && !(a.grudge && a.grudge.id === b.id));
    check("they think better of each other now", SB.Social.opinion(game, a, b) > before + 20 && SB.Social.opinion(game, b, a) > 0, before + " -> " + SB.Social.opinion(game, a, b));
  });

  sec(21, "it all saves, and an old save loads", () => {
    const { SB, game, cs, h, Mn, O, W } = tribe(51, 3, 4);
    const c = cs[0], hx = h.x;
    Mn.cmd(game, c, "area:12"); Mn.cmd(game, c, "diet:bugs"); Mn.cmd(game, c, "treat:sick"); Mn.cmd(game, c, "way:bugs"); Mn.cmd(game, c, "eyes:1"); Mn.keep(game, "basket", 3);
    const n = W.addNode(game.world, game, "bush", c.x + 4, c.z, 1); n.state = "ok";
    const m = O.place(game, "mark", n.x, n.z, { hit: { type: "node", ref: n } }).o; O.queue(game, c, m.id);
    const z = O.place(game, "stock", hx + 6, h.z).o; Mn.setOnly(z, "food", true); Mn.setPri(z, 1);
    const it = W.add(game.world, game, "apple", c.x + 1, c.z, {}); Mn.forbid(game, it, true);
    SB.Society.moveNest(game, 0, h.x + 2, h.z + 1);
    const data = JSON.parse(JSON.stringify(SB.Save.snapshot(game)));
    const g2 = SB.Save.revive(data), c2 = SB.Game.byId(g2, c.id);
    check("the smol keeps its rules", c2.area && c2.area.r === 12 && c2.diet.beetle === 1 && c2.treat === "sick" && c2.jobs && c2.jobs[0] === m.id);
    check("the tribe keeps its way and its nest", g2.tribes[0].way === "bugs" && g2.tribes[0].pin && Math.abs(g2.tribes[0].pin.x - (hx + 2)) < 0.01);
    check("the island keeps its switches and standing orders", g2.quests.minds3.eyes === 1 && g2.quests.minds3.keep[0].k === "basket");
    const z2 = g2.orders.list.filter(o => o.kind === "stock")[0], it2 = SB.Game.byId(g2, it.id) || g2.world.items.find(o => o.id === it.id);
    check("the pile keeps its filter and order; the apple stays forbidden", z2.only.food === 1 && z2.pri === 1 && it2 && it2.data.forbid === 1);
    delete data.quests.minds3; data.tribes.forEach(t => { delete t.way; delete t.pin; });
    data.creatures.forEach(p => { delete p.area; delete p.diet; delete p.jobs; delete p.treat; });
    const g3 = SB.Save.revive(data);
    SB.Game.current = g3;
    let threw = null;
    try { run(SB, g3, 3); Mn.html(g3, SB.Game.smols(g3)[0]); } catch (e) { threw = e; }
    check("a save with none of it loads and runs", !threw, threw && threw.message);
  });
});

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
