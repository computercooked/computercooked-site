// 4.30: a home of your own. The first hut you finish by hand is yours; you fit it out at the door (bed, chest,
// hearth, berry patch), and each thing does something. It outlives the smol who built it.
// node games/smol-brains/tests/home.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");

seeded(4300, () => {
  const ctx = load();
  ["possess.js", "home.js"].forEach(f => vm.runInContext(js(f), ctx, { filename: f }));
  const SB = ctx.SB, P = SB.Possess, H = SB.Home, Surv = SB.Survival || SB.Surv; P.headless = true;
  const game = SB.Game.newGame(88); SB.Game.current = game; game.tutorial.done = true;
  SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod));
  const me = SB.Game.smols(game)[0]; me.tier = 2; me.stage = 3;
  const nest = game.world.T.nest;
  let events = []; ["homeClaimed", "homeThing", "homeRested", "homeGarden"].forEach(n => SB.bus.on(n, d => events.push(n)));

  console.log("1. no home yet");
  check("nothing to begin with", H.get(game) == null && H.next(game) == null && H.count(game) === 0);
  check("a hut somebody else built is not yours by itself", (() => { const o = SB.World.addStructure(game.world, game, "hut", nest.x + 14, nest.z - 6, { done: true }); const r = H.get(game) == null; game._other = o; return r; })());
  check("the tab says how to get one", /no home yet/.test(H.html(game, me)));

  console.log("2. the first one you finish by hand is yours");
  me.x = nest.x + 6; me.z = nest.z + 6;
  P.enter(game, me, { free: true });
  const hut = SB.World.addStructure(game.world, game, "hut", me.x + 2, me.z, { done: true });
  check("it's your home", H.get(game) === hut && H.is(game, hut) && events.indexOf("homeClaimed") >= 0);
  check("you're at home at the door, not across the island", H.at(game, me) && !H.at(game, { x: hut.x + 20, z: hut.z }));
  const ref = { type: "struct", id: hut.id }, oref = { type: "struct", id: game._other.id };
  check("looking at it: open your home", /open your home/.test((P.options(game, me, ref).use || {}).label || ""));
  check("looking at another hut: move your home here", /move your home here/.test((P.options(game, me, oref).place || {}).label || ""));

  console.log("3. fitting it out, by hand, at the door");
  check("the next thing is a bed", H.next(game).id === "bed" && /4 leaves/.test(H.costText(H.BY.bed)));
  check("no leaves, no bed", !H.make(game, me, "bed").ok && /needs/.test(H.whyNot(game, me, "bed")));
  Surv.add(me, "leaves", 4);
  me.x = hut.x + 20; check("not from across the island", /at home/.test(H.whyNot(game, me, "bed")));
  me.x = hut.x - 2;
  const r = H.make(game, me, "bed");
  check("a bed, and the leaves are spent", r.ok && H.has(game, "bed") && Surv.count(me, "leaves", true) === 0 && events.indexOf("homeThing") >= 0);
  check("only one", !H.make(game, me, "bed").ok);
  check("a blob can't make things", /hands/.test(H.whyNot(game, Object.assign({}, me, { tier: 1 }), "chest")));
  Surv.add(me, "stick", 6); Surv.add(me, "vine", 1); Surv.add(me, "stone", 4); Surv.add(me, "seed", 2);
  check("a chest", H.make(game, me, "chest").ok);
  check("a hearth", H.make(game, me, "hearth").ok && Surv.count(me, "stick", true) === 0);
  check("a berry patch: that's everything", H.make(game, me, "garden").ok && H.count(game) === 4 && H.next(game) == null);

  console.log("4. the chest");
  Surv.add(me, "berry", 3);
  const bi = Surv.inv(me).s.findIndex(x => x && x.k === "berry");
  check("put away", H.stash(game, me, bi).ok && Surv.count(me, "berry", true) === 0 && H.chest(game).some(x => x && x.k === "berry" && x.n === 3));
  me.x = hut.x + 20; check("not from far away", !H.fetch(game, me, 0).ok); me.x = hut.x - 2;
  check("take it back", H.fetch(game, me, H.chest(game).findIndex(x => x && x.k === "berry")).ok && Surv.count(me, "berry", true) === 3);
  check("the tab lists the chest and what you can put away", /the chest/.test(H.html(game, me)) && /data-homestash/.test(H.html(game, me)));
  check("it holds twelve", H.chest(game).length === 12);

  console.log("5. what the things do");
  me.chem.health = 0.4; events = [];
  SB.bus.emit("dawn", {});
  check("the bed: wake at home with every heart back", me.chem.health === 1 && events.indexOf("homeRested") >= 0);
  check("the berry patch: berries in the chest", H.chest(game).some(x => x && x.k === "berry") && events.indexOf("homeGarden") >= 0);
  me.chem.health = 0.4; me.x = hut.x + 30; SB.bus.emit("dawn", {});
  check("sleeping somewhere else mends nothing", me.chem.health === 0.4);
  me.x = hut.x - 2;
  const sh = P.shelterFor(game, me);
  check("at night the marker leads home", sh && sh.kind === "home" && Math.abs(sh.x - hut.x) < 0.01);
  check("the hearth is light in a night chase", /hearth/.test(js("nightchase.js")) && H.has(game, "hearth"));

  console.log("6. it outlives you");
  const sv = JSON.parse(JSON.stringify(game.quests.home));
  check("it's in the save", sv.id === hut.id && sv.got.bed && sv.chest.length === 12);
  game.quests.home.id = 999999; // a save that lost the id
  check("found again by where it stands", H.get(game) === hut && game.quests.home.id === hut.id);
  P.leave();
  const other = SB.Game.smols(game)[1];
  if (other) { other.tier = 2; other.x = hut.x - 2; other.z = hut.z; check("another smol at the door can use the chest too", H.fetch(game, other, H.chest(game).findIndex(x => x)).ok); }
  check("move house: the things come with you", H.claim(game, game._other, me) && H.is(game, game._other) && H.has(game, "bed") && !H.is(game, hut));
});

console.log("7. the files");
const ui = js("ui.js"), ph = js("povhud.js"), idx = fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8");
check("the game loads it", /js\/home\.js/.test(idx) && /SB\.Home\.tick\(game, dt\)/.test(js("main.js")));
check("the bag has a home tab", /data-tab='home'/.test(ph) && /SB\.Home\.html\(s\.game, c, icon\)/.test(ph));
check("the goals list asks for a home, then for the next thing", /make a home: as a smol/.test(ui) && /your home could use/.test(ui));
check("the bag says each thing once", !/bags get bigger as the tribe/.test(ph) && /in your hands · the lit one is held/.test(ph));

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
