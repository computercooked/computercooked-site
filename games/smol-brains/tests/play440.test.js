// 4.40: a fed island no longer sits half hungry. A smol starts looking for food at C.PECKISH (0.5); it was 0.6 to
// 0.65, so an island's mean hunger sat just under the 0.55 "hard times" line that stops pairs having eggs.
// And on a portrait phone the status chips no longer push the food row off the screen.
// node games/smol-brains/tests/play440.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra != null && extra !== "" ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const dir = path.join(__dirname, "..", "play", "js");
const html = fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8");
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
function step(SB, game, secs, each) { for (let s = 0; s < secs / SB.TICK; s++) { SB.Game.step(game, SB.TICK); if (SB.Ext) SB.Ext.tick(game, SB.TICK); if (each) each(s); } }
const isFood = (SB, o) => SB.KINDS[o.kind] && SB.KINDS[o.kind].noun === "food";
function clearFood(SB, game, x, z, r) { game.world.items.filter(o => isFood(SB, o) && Math.hypot(o.x - x, o.z - z) < r).forEach(o => SB.World.remove ? SB.World.remove(game.world, o) : (o.x += 500)); }

console.log("1. peckish: the point where a smol starts looking for food");
{
  const cj = js("creature.js");
  const { SB } = island(4401), C = SB.Creature;
  check("there is one number for it, under the hard-times line", C.PECKISH >= 0.45 && C.PECKISH <= 0.52 && C.PECKISH < 0.55, C.PECKISH);
  check("it is well under starving and under 'too hungry to sleep'", C.PECKISH < C.HUNGRY_AWAKE && C.HUNGRY_AWAKE < C.STARVING);
  check("food in sight pulls from there", /mask\[V\.eat\] ?&& ?ch\.hunger ?> ?C\.PECKISH\)/.test(cj));
  check("its nose takes over from there", /c\.chem\.hunger ?> ?C\.PECKISH ?&& ?\(sniff ?= ?sniffFood/.test(cj));
  check("it walks back to where food was from just under it", /c\.foodSpot ?&& ?c\.chem\.hunger ?> ?C\.PECKISH ?- ?0\.05/.test(cj));
  check("it stops an idle moment for food three steps off", /ch\.hunger ?> ?0\.7 ?\? ?4 ?: ?ch\.hunger ?> ?C\.PECKISH ?\? ?3 ?: ?1\.5/.test(cj));
}
seeded(4402, () => {
  // a smol held at 0.56 hunger (over peckish, under the old 0.6 to 0.65), one apple twelve steps off and nothing nearer
  const { SB, game } = island(4402), me = SB.Game.smols(game)[0];
  clearFood(SB, game, me.x, me.z, 40);
  let spot = null;
  for (let a = 0; a < 24 && !spot; a++) { const x = me.x + Math.cos(a * 0.27) * 12, z = me.z + Math.sin(a * 0.27) * 12; if (SB.World.walkable(game.world, x, z, false) && SB.World.depthAt(game.world, x, z) < 0.05) spot = { x, z }; }
  check("there is a dry spot twelve steps off", !!spot);
  if (spot) {
    const apple = SB.World.add(game.world, game, "apple", spot.x, spot.z, {});
    const d0 = Math.hypot(me.x - apple.x, me.z - apple.z);
    me.action = null; me.plan = null; me.asleep = false;
    let ate = false, best = d0;
    step(SB, game, 60, () => {
      if (!game.world.items.includes(apple)) { ate = true; return; }
      if (!ate) { me.chem.hunger = Math.min(Math.max(me.chem.hunger, 0.56), 0.58); me.chem.sleepy = 0; me.chem.tired = 0; best = Math.min(best, Math.hypot(me.x - apple.x, me.z - apple.z)); }
    });
    check("a peckish smol goes and gets it (it used to wait until 0.6 and over)", ate || best < 2.5, ate ? "ate it" : "nearest " + best.toFixed(1) + " of " + d0.toFixed(1));
  }
});

console.log("2. a portrait phone: status chips do not push the food row off the screen");
{
  const pj = js("povhud.js");
  check("the chips take the width of the meters and no more", /#pov \.vstat\{[^}]*width:0;min-width:100%;overflow:hidden\}/.test(pj));
  check("chips that do not fit are marked", /sw ?- ?4 ?> ?hud\.stat\.clientWidth\) ?hud\.stat\.classList\.add\("many"\)/.test(pj));
  check("and show as icons only", /#pov \.vstat\.many span i:not\(\.pxi\)\{display:none\}/.test(pj)); // the icon is an <i class=pxi> too: only the words go
  check("a chip's words sit in their own tag", /x\.e ?\+ ?"<i> " ?\+ ?x\.label ?\+ ?"<\/i><\/span>"/.test(pj));
}

console.log("3. a touch screen: the list by the crosshair is left out, the buttons say it");
check("no list of actions by the crosshair on a phone", /var html ?= ?hud\.phone ?\? ?"" ?: ?lines\.map/.test(js("povhud.js")));
check("an empty list is not drawn", /#pov \.prompt:empty\{display:none\}/.test(js("povhud.js")));
check("the goal box sits under the clock, not over it (the clock ends at 64px)", /#pov\.phone \.quest\{top:68px;/.test(js("povhud.js")));
check("the small button does not repeat what the big one says", /said ?= ?!!\(ctx ?&& ?o\.place ?&& ?!o\.place\.locked ?&& ?short\(o\.place\.label\) ?=== ?short\(ctx\.label\)\)/.test(js("povhud.js")) && /setBtn\(hud\.bPlace, ?o\.place ?&& ?!o\.place\.locked ?&& ?!said ?\?/.test(js("povhud.js")));

check("held sideways, the meters keep clear of the buttons and a toast keeps clear of the meters", /#pov\.phone \.bottom\{left:calc\(\(100vw - 176px\) \/ 2\)\}#pov\.phone \.vrow,#pov\.phone \.vrow i\{height:12px\}#pov\.phone \.vrow i\{width:12px\}#pov\.phone \.vit\{column-gap:4px\}#pov\.phone \.toast\{top:70px\}\}/.test(js("povhud.js")));

console.log("4. one thing at a time: no story card under the pod map; no broken fi in any font");
{
  const uj = fs.readFileSync(path.join(__dirname, "..", "src", "ui.js"), "utf8");
  check("event cards wait while the pod map is up", /if ?\(UI\._podUp\) ?return false;/.test(uj) && /root\.appendChild\(wrap\); ?UI\._podUp ?= ?true;/.test(uj) && /closed ?= ?true; ?UI\._podUp ?= ?false;/.test(uj));
  const css = fs.readFileSync(path.join(__dirname, "..", "play", "style.css"), "utf8");
  check("ligatures are off for every element, whatever font: shorthand it uses", /\*, ?\*::before, ?\*::after ?\{ ?font-variant-ligatures: ?none ?!important; ?font-feature-settings: ?"liga" 0, ?"clig" 0, ?"calt" 0 ?!important; ?\}/.test(css));
}

console.log("5. hard times: hungry AND short of food (hunger alone stopped pairs on fed islands)");
seeded(4405, () => {
  const { SB, game } = island(4405), C = SB.Creature, W = SB.World, w = game.world;
  for (let i = 0; i < 4; i++) SB.Game.spawnSmol(game, { x: w.T.spawn.x + i, z: w.T.spawn.z - 2, age: 560 });
  const sm = SB.Game.smols(game);
  const grown = sm.filter(c => c.stage === 3); if (grown.length > 1) { grown[0].sex = "f"; grown[1].sex = "m"; } // the seed must not decide whether there is a pair
  let pair = null;
  for (const a of sm) for (const b of sm) if (!pair && a !== b && a.sex !== b.sex && a.stage === 3 && b.stage === 3 && a.tier < 3 && b.tier < 3 && !(SB.Game.related && SB.Game.related(game, a, b)) && (!SB.Species || SB.Species.compatible(a, b))) pair = [a, b];
  check("there is a pair to try", !!pair, sm.length + " smols");
  if (pair) {
    const [a, b] = pair, eggs = () => w.items.filter(o => o.kind === "egg").length;
    const setFood = n => { w.items.filter(o => o.noun === "food").forEach(o => W.remove(w, o)); for (let i = 0; i < n; i++) W.add(w, game, "apple", a.x + 3 + (i % 8), a.z + 3 + Math.floor(i / 8), {}); };
    const tryIt = (hunger, food) => { w.items.filter(o => o.kind === "egg").forEach(o => W.remove(w, o)); sm.forEach(c => { c.chem.hunger = hunger; }); setFood(food); game._chT = null; a.chem.love = b.chem.love = 0.9; a.eggCooldown = b.eggCooldown = 0; a.partner = b.partner = null; const e0 = eggs(); C._tryBreed(a, b, game, 0.9); return eggs() - e0; };
    check("the numbers: hungry from 0.55, short under two bites each, very hungry from 0.7", C.HARD_HUNGER === 0.55 && C.HARD_FOOD === 2 && C.HARD_HUNGER_MAX === 0.7);
    check("fed and food about: an egg", tryIt(0.3, sm.length * 4) === 1);
    check("hungry (0.6) but four bites each on the ground: an egg (4.39 said no)", tryIt(0.6, sm.length * 4) === 1);
    check("hungry and under two bites each: not now", tryIt(0.6, sm.length) === 0);
    check("very hungry (0.75), whatever is lying about: not now", tryIt(0.75, sm.length * 4) === 0);
  }
});

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
