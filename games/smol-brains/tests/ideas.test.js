/* smol brains 2 — ideas, crafting, building, teaching and culture. Run: node games/smol-brains/tests/ideas.test.js */
"use strict";
const load = require("./_load.js");
const ctx = load();
const SB = ctx.SB;
SB.Render = undefined;

let failed = 0;
function check(name, ok, info) {
  console.log((ok ? "  ok   " : "  FAIL ") + name + (info ? "  (" + info + ")" : ""));
  if (!ok) failed++;
}
function freshGame(seed) {
  const g = SB.Game.newGame(seed || 42);
  g.tutorial.done = true; g.tutorial.wildDone = true;
  SB.Game.current = g;
  const egg = g.world.items.find(o => o.kind === "egg"); if (egg) SB.World.remove(g.world, egg);
  return g;
}

console.log("1. the idea web");
{
  const ids = SB.Ideas.LIST.map(d => d.id);
  let ok = true;
  SB.Ideas.LIST.forEach(d => { d.needs.forEach(n => { if (ids.indexOf(n) < 0 || SB.Ideas.BY_ID[n].tier > d.tier) { ok = false; console.log("   bad prereq", d.id, n); } }); if (d.make && !SB.KINDS[d.make.out]) { ok = false; console.log("   bad output", d.id); } if (d.build && !SB.STRUCTS[d.build]) { ok = false; console.log("   bad build", d.id); } });
  check("every prerequisite exists and comes no later on the ladder", ok, ids.length + " ideas");
  const reachable = new Set(); let changed = true;
  while (changed) { changed = false; SB.Ideas.LIST.forEach(d => { if (!reachable.has(d.id) && d.needs.every(n => reachable.has(n))) { reachable.add(d.id); changed = true; } }); }
  check("every idea is reachable", reachable.size === ids.length);
}

console.log("2. discovery");
{
  const g = freshGame(42);
  const [blob] = SB.Debug.spawnTier(0, 1), [tu] = SB.Debug.spawnTier(2, 1);
  const ctxD = { verb: "use", noun: "plant", held: "stick", targetKind: "oak" };
  let tries = 0;
  while (!SB.Ideas.known(tu, "poke") && tries < 400) { SB.Ideas.tryDiscover(tu, ctxD, g); tries++; }
  check("a tool-user poking a tree with a stick discovers poke sticks", SB.Ideas.known(tu, "poke"), tries + " tries");
  check("…and the world invents a word for it", typeof g.culture.words.poke === "string" && SB.LEXICON[g.culture.words.poke].type === "idea", "“" + g.culture.words.poke + "”");
  for (let i = 0; i < 400; i++) SB.Ideas.tryDiscover(blob, ctxD, g);
  check("blobs can't hold ideas", !SB.Ideas.known(blob, "poke"));
  check("ideas need their prerequisites", !SB.Ideas.canHold(tu, "spear") && SB.Ideas.canHold(tu, "bonk"));
}

console.log("3. crafting with a plan");
{
  const g = freshGame(7);
  const [c] = SB.Debug.spawnTier(2, 1);
  SB.Ideas.discover(c, "bonk", g);
  const st = SB.World.add(g.world, g, "stone", c.x + 2, c.z, {});
  c.chem.hunger = 0; c.chem.bored = 0.6;
  const plan = SB.Ideas.chooseMake(c, g);
  check("it can plan to make a hammerstone", plan && plan.idea === "bonk" && plan.steps.some(s => s.do === "fetch") && plan.steps[plan.steps.length - 1].do === "craft", plan ? plan.steps.map(s => s.do).join(" > ") : "no plan");
  c.plan = plan; c.plan.verb = SB.V.make;
  let made = false;
  SB.bus.on("craft", d => { if (d.c === c && d.item.kind === "hammer") made = true; });
  for (let s = 0; s < 20 * 30 && c.plan; s++) SB.Game.step(g, SB.TICK);
  check("…fetches the rock and makes it", made, "has hammer: " + !!SB.Creature.hasKind(c, g, "hammer"));
  const again = SB.Ideas.chooseMake(c, g);
  check("doesn't make a second hammer it doesn't need", !again || again.idea !== "bonk");
  // the hammer cracks nuts
  const nut = SB.World.add(g.world, g, "nut", c.x + 0.4, c.z, {});
  const r = SB.Ideas.use(c, nut, g);
  check("a hammerstone cracks a hardnut", r.ok && nut.kind === "nutmeat");
}

console.log("4. building");
{
  const g = freshGame(99);
  const cs = SB.Debug.spawnTier(4, 3);
  cs.forEach(c => { SB.Ideas.discover(c, "weave", g); SB.Ideas.discover(c, "hut", g); c.chem.hunger = 0; c.chem.cold = 0.5; });
  const home = SB.Society.home(g, 0);
  for (let i = 0; i < 8; i++) SB.World.add(g.world, g, "stick", home.x + (i % 4) - 1.5, home.z - 3, {});
  for (let i = 0; i < 4; i++) SB.World.add(g.world, g, "fiber", home.x + i - 1.5, home.z - 4, {});
  const plan = SB.Ideas.chooseBuild(cs[0], g);
  const site = plan && SB.World.structById(g.world, plan.site);
  check("a builder starts a hut site near home", site && site.kind === "hut" && !site.done, site ? JSON.stringify(site.need) : "no plan");
  let built = false;
  SB.bus.on("built", d => { if (d.st === site && d.st.done) built = true; });
  for (let round = 0; round < 40 && !built; round++) {
    cs.forEach(c => { if (!c.plan && c.alive) { const p = SB.Ideas.chooseBuild(c, g); if (p) { c.plan = p; p.verb = SB.V.build; } } c.chem.hunger = 0; });
    for (let s = 0; s < 20 * 10 && !built; s++) SB.Game.step(g, SB.TICK);
  }
  check("builders bring materials and finish it together", built, site ? "need " + JSON.stringify(site.need) + " work " + site.work.toFixed(1) + " builders " + site.builders.length : "");
  check("a finished hut shelters", built && SB.World.shelterAt(g.world, site.x, site.z) === site);
}

console.log("5. teaching and losing ideas");
{
  const g = freshGame(5);
  const [a, b] = SB.Debug.spawnTier(3, 2);
  SB.Ideas.discover(a, "poke", g);
  let taught = 0;
  for (let i = 0; i < 6 && !SB.Ideas.known(b, "poke"); i++) { SB.Ideas.teach(a, b, g); taught++; }
  check("a tribe smol can teach another an idea", SB.Ideas.known(b, "poke"), taught + " lessons");
  SB.Society.tick(g, 5);
  check("the census knows two smols know it", g.culture.alive.poke === 2);
  let lost = false;
  SB.bus.on("ideaLost", d => { if (d.id === "poke") lost = true; });
  SB.Creature.die(a, g, "old"); SB.Creature.die(b, g, "old");
  g.creatures = g.creatures.filter(c => c.alive);
  SB.Society.tick(g, 5);
  check("when the last knower dies, the idea is lost", lost && g.culture.lost.poke > 0);
  const [c] = SB.Debug.spawnTier(4, 1);
  SB.Ideas.discover(c, "poke", g);
  const pole = SB.World.addStructure(g.world, g, "totem", c.x + 1, c.z, { done: true });
  SB.Ideas.study(c, pole, g);
  check("a smol carves what it knows into a story pole", pole.data.ideas.poke === 1);
  SB.Creature.die(c, g, "old"); g.creatures = g.creatures.filter(x => x.alive);
  lost = false; SB.Society.tick(g, 5);
  check("ideas on a pole survive their inventors", !lost && g.culture.alive.poke >= 1);
  const [d] = SB.Debug.spawnTier(4, 1);
  for (let i = 0; i < 8 && !SB.Ideas.known(d, "poke"); i++) SB.Ideas.study(d, pole, g);
  check("…and can be learned again by studying it", SB.Ideas.known(d, "poke"));
}

console.log("6. smols' own words");
{
  const g = freshGame(11);
  const [c] = SB.Debug.spawnTier(2, 1);
  SB.Ideas.discover(c, "bonk", g);
  const w = g.culture.words.bonk;
  SB.Creature.hear(c, w, g, {});
  check("saying the smols' word for an idea is understood", c.heard.idea === "bonk", w);
}

console.log("herb lore: herbalists nurse sick friends");
{
  const SB = load().SB;
  const game = SB.Game.newGame(21); SB.Game.current = game; game.tutorial.done = true;
  const [doc, pat] = SB.Debug.spawnTier(3, 2);
  [doc, pat].forEach(c => { c.asleep = false; c.stage = 3; c.age = SB.STAGES[3].from + 50; });
  doc.ideas = doc.ideas || {}; doc.ideas.herbal = 1;
  pat.x = doc.x + 8; pat.z = doc.z; pat.chem.antigen = 0.7; pat.chem.sick = 0.6;
  let nursed = false; SB.bus.on("nursed", d => { if (d.p === pat) nursed = true; });
  for (let t = 0; t < 120 / SB.TICK && !nursed; t++) { pat.chem.antigen = Math.max(pat.chem.antigen, 0); SB.Game.step(game, SB.TICK); }
  check("an herbalist walks over and nurses a sick friend better", nursed, "sick " + pat.chem.sick.toFixed(2));
}

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
