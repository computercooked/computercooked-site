// 4.37: what the hand playtest and the island runs turned up. A starving smol finishes its walk to food (a word it
// overheard, a story party, a storm order, a moon pack or a sleepwalk no longer take it off it), a marooned one wades,
// travellers carry their own food, whoever holds what a site is waiting for brings it, and a handful of small things
// seen in the bag.
// node games/smol-brains/tests/play437.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra != null && extra !== "" ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const dir = path.join(__dirname, "..", "play", "js");
const html = fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "..", "play", "style.css"), "utf8");
const js = f => fs.readFileSync(path.join(dir, f), "utf8");
const order = (html.match(/src="js\/([a-z0-9-]+)\.js"/g) || []).map(s => s.slice(8, -4));
const EXTRA = ["ext", "bosses", "body", "possess", "home", "loot", "friends", "town", "dark", "powers", "fight", "deep", "harvest", "animals", "qol", "wear", "shapes", "wardrobe3", "motion3", "world3", "helpers3", "arrivals3", "minds3"];
function island(seed) {
  const ctx = load(), SB = ctx.SB;
  order.filter(n => EXTRA.indexOf(n) >= 0).forEach(n => { if (n === "bosses" && SB.Bosses) return; vm.runInContext(js(n + ".js"), ctx, { filename: n + ".js" }); });
  if (SB.Possess) SB.Possess.headless = true;
  const game = SB.Game.newGame(seed); SB.Game.current = game; game.tutorial.done = true;
  SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod));
  const sp = game.world.T.spawn; for (let i = 0; i < 2; i++) SB.Game.spawnSmol(game, { x: sp.x - 1 + i * 2, z: sp.z + 2, age: 560 });
  return { SB, game };
}
function run(SB, game, secs) { for (let s = 0; s < secs / SB.TICK; s++) { SB.Game.step(game, SB.TICK); if (SB.Ext) SB.Ext.tick(game, SB.TICK); } }

console.log("1. a starving smol gets to its food");
seeded(4370, () => {
  const { SB, game } = island(4370), C = SB.Creature, V = SB.V, sm = SB.Game.smols(game), me = sm[0];
  const verbWord = Object.keys(SB.LEXICON).filter(w => SB.LEXICON[w].type === "verb")[0];
  const apple = SB.World.add(game.world, game, "apple", me.x + 6, me.z, {});
  const goEat = () => { me.plan = null; me.action = { verb: V.eat, phase: "go", t: 0, target: { type: "item", id: apple.id } }; };
  me.chem.hunger = 0.95; goEat();
  C.hear(me, verbWord, game, {});
  check("a word it overhears does not take a starving smol off its walk to food", !!me.action && me.action.verb === V.eat, verbWord);
  me.chem.hunger = 0.3; goEat();
  C.hear(me, verbWord, game, {});
  check("…a fed one still stops to listen, as before", !me.action);
  check("the walk allows a starving smol ninety seconds, not twenty-five", (function () { const src = js("creature.js").replace(/\s+/g, ""); return /a\.t>goLimit\(c,a\)/.test(src) && /varlim=starvingFor\(c,a\)\?90:25;/.test(src); })()); // 4.49: the clock is goLimit, which starts from these two numbers and follows a route
  check("a marooned, starving smol wades (c.wade lets it swim for a minute)", C.canSwim(me) === false && ((me.wade = 5), C.canSwim(me)) === true);
  me.wade = 0;
  check("storm shelter gives way to starving", /c\.shelterT ?> ?0 ?&& ?c\.species ?=== ?"smol" ?&& ?!c\.quarantine ?&& ?ch\.hunger ?<= ?0\.85/.test(js("creature.js")));
  const dj = js("director.js"), kj = js("dark.js");
  check("the pod party, the moon pack and sleepwalking use the polite call", (dj.match(/sendSoft/g) || []).length >= 4 && (kj.match(/sendSoft/g) || []).length >= 4, (dj.match(/sendSoft/g) || []).length + " / " + (kj.match(/sendSoft/g) || []).length);
});

console.log("2. travellers carry their own food");
seeded(4371, () => {
  const { SB, game } = island(4371), ST = SB.Strangers, sm = SB.Game.smols(game);
  const c = ST.arrive(game, {});
  check("a stranger arrives", !!c && !!c.stranger, c && c.stranger && c.stranger.state);
  if (c && c.stranger) {
    c.chem.hunger = 0.97; ST.tick(game, SB.TICK);
    check("one who is not a guest never gets hungrier than 0.8", c.chem.hunger <= 0.8, c.stranger.state + " " + c.chem.hunger.toFixed(2));
    c.stranger.state = "guest"; c.chem.hunger = 0.97; ST.tick(game, SB.TICK);
    check("a guest eats with the tribe: its hunger is its own", c.chem.hunger > 0.9, c.chem.hunger.toFixed(2));
  }
  void sm;
});

console.log("3. whoever holds what a site is waiting for brings it");
seeded(4372, () => {
  const { SB, game } = island(4372), I = SB.Ideas, sm = SB.Game.smols(game), me = sm[0];
  me.tier = 2; me.tribe = me.tribe || 0;
  const st = SB.World.addStructure(game.world, game, "hut", me.x + 4, me.z + 1, { tribe: me.tribe });
  const want = Object.keys(st.need).filter(k => st.need[k] > 0)[0];
  const kind = Object.keys(SB.KINDS).filter(k => k === want)[0] || want;
  const it = SB.World.add(game.world, game, kind, me.x, me.z, {});
  me.holding = it.id; it.heldBy = me.id; it.onGround = false;
  const held = I.inv(me, game).some(o => o.id === it.id);
  const plan = I.chooseBuild(me, game);
  check("a smol with " + want + " in its paws, by a hut that needs it, plans to hand it over", held && !!plan && plan.site === st.id && plan.steps.length === 1 && plan.steps[0].do === "deliver", held + " " + JSON.stringify(plan && plan.steps));
});

console.log("4. small things from the bag");
{
  const pj = js("povhud.js");
  check("the bag's pop-in plays once, on opening, not on every tab", /"bag fresh"/.test(pj) && /classList\.remove\("fresh"\)/.test(pj) && /#pov \.bag\.fresh \.win\.panel \{ animation: modalin/.test(css) && !/rgba\(24, 19, 38, 0\.98\) 100%\); animation/.test(css));
  check("skill rows are laid out on every page, not only on 'you'", /#pov \.sk\{display:grid/.test(pj) && !/#pov \.you \.sk/.test(pj));
  check("a thing with no picture of its own carries its colour in a corner", /linear-gradient\(225deg,rgb\(/.test(pj));
  check("'made climbing claws', not 'made a climbing claws'", !/"made a " ?\+/.test(js("deep.js")) && !/"made a " ?\+/.test(js("powers.js")) && !/"made a " ?\+/.test(js("survival.js")));
  const an = w => /[^s]s$/.test(w) ? "" : /^[aeiou]/.test(w) ? "an " : "a ";
  check("…with the article it needs", an("climbing claws") === "" && an("axe") === "an " && an("club") === "a " && an("glass") === "a ");
  check("'found the mountains', not 'a mountains'", /\/s\$\/\.test\(SB\.BIOMES\[d\.biome\]\.name\) ?\? ?"the "/.test(js("main.js")));
  check("the sky's smol card carries its rules", /SB\.Minds\.html\(game, ?c\)/.test(js("ui.js")) && /SB\.Minds\.wire\(mr3, ?game, ?c, ?drawM3\)/.test(js("ui.js")));
  check("a carried egg shows, and a ghost is pale", /c\.carrying ?!= ?null\) ?part\("p:ball"/.test(js("bodies.js")) && /c\.vessel ?=== ?"ghost"\) ?body ?= ?SB\.mixC/.test(js("bodies.js")));
  check("luck tilts foraging and rare finds", /function luck3/.test(js("harvest.js")) && /SB\.Minds\.lucky\(who3/.test(js("loot.js")));
}

console.log("5. three islands, three days: nobody starves by the village");
for (const seed of [77, 301]) seeded(seed, () => {
  const { SB, game } = island(seed);
  let starved = 0; SB.bus.on("death", d => { if (d && d.c && d.c.species === "smol" && d.cause === "starved") starved++; });
  run(SB, game, 3 * SB.DAY_LENGTH);
  const n = SB.Game.smols(game).length;
  check("island " + seed + ": the tribe grew and nobody starved (4.36: " + (seed === 77 ? "3 starved, 7 alive" : "2 starved") + ")", n >= 8 && starved === 0, n + " alive, " + starved + " starved");
});

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
