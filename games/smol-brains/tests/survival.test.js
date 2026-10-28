// Survival (v4.4 "first tool"): the hotbar and bag, recipes found by putting things together, chopping and
// mining with hit points, building from a ghost, dying with a pack, and vines from the seed.
// node games/smol-brains/tests/survival.test.js
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const load = require("./_load.js");
const ctx = load();
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "play", "js", "possess.js"), "utf8"), ctx, { filename: "possess.js" });
const SB = ctx.SB, S = SB.Surv, P = SB.Possess, I = SB.Ideas;
P.headless = true;

let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
function fresh(seed, tier, n) {
  const g = SB.Game.newGame(seed); SB.Game.current = g;
  g.tutorial.done = true; g.podT = 1e9; if (g.dir) g.dir.nextT = 1e9;
  const cs = SB.Debug.spawnTier(tier, n || 1);
  cs.forEach(c => { c.age = Math.max(c.age, 900); c.asleep = false; c.chem.hunger = 0.1; c.chem.sleepy = 0; c.chem.tired = 0; });
  return { g, cs };
}
function run(g, secs) { for (let t = 0; t < secs / SB.TICK; t++) SB.Game.step(g, SB.TICK); }
function nodeOf(g, c, fn) { return g.world.nodes.filter(fn).sort((a, b) => SB.dist2(a.x, a.z, c.x, c.z) - SB.dist2(b.x, b.z, c.x, c.z))[0]; }

console.log("1. the inventory");
{
  const { g, cs } = fresh(101, 2);
  const c = cs[0];
  check("a tool-user has a 9-slot hotbar and a bag", S.hotN(c) === 9 && S.bagN(c) === 9 && S.cap(c) === 18);
  check("nothing left over when there's room", S.add(c, "stick", 30) === 0);
  const v = S.inv(c);
  check("sticks stack to 24, then a new slot", v.s[0].k === "stick" && v.s[0].n === 24 && v.s[1].n === 6);
  check("tools don't stack, and wear starts full", S.add(c, "primtool", 2) === 0 && v.s[2].n === 1 && v.s[2].w === S.uses("primtool"));
  check("count and take", S.count(c, "stick", true) === 30 && S.take(c, "stick", 7).length === 7 && S.count(c, "stick", true) === 23);
  S.move(c, 0, 5);
  check("moving a stack to an empty slot", !v.s[0] && v.s[5].k === "stick");
  S.select(c, 2);
  check("the selected slot is what you hold", S.heldKind(c) === "primtool");
  const j = S.splitStack(c, 5);
  check("split halves a stack", j !== false && v.s[j].n + v.s[5].n === 23);
  // a full bag leaves the rest out
  const k2 = fresh(102, 2).cs[0];
  const left = S.add(k2, "stone", 24 * 18 + 5);
  check("what doesn't fit is handed back", left === 5);
  const bl = fresh(103, 0).cs[0];
  check("a blob carries one small soft thing in its mouth, not sticks", S.cap(bl) === 1 && S.whyNot(bl, "berry") === "" && S.whyNot(bl, "leaves") === "" && /mouth/.test(S.whyNot(bl, "stick")));
  const cr = fresh(104, 1).cs[0];
  check("a critter carries one thing, and no tools", S.cap(cr) === 1 && !!S.whyNot(cr, "primtool"));
  const bb = fresh(105, 2).cs[0];
  S.add(bb, "basket", 1);
  check("a basket makes the bag bigger", S.bagN(bb) === 18);
}

console.log("2. piles keep the item count down");
{
  const { g, cs } = fresh(106, 2);
  const c = cs[0];
  const n0 = g.world.items.length;
  const a = S.spawn(g, "stick", 10, c.x + 2, c.z);
  const b = S.spawn(g, "stick", 5, c.x + 2.2, c.z);
  check("dropping 15 sticks in one spot makes one item", a === b && g.world.items.length === n0 + 1 && S.pileN(a) === 15);
  const one = S.split(g, a);
  check("the AI can take one off the top", one !== a && S.pileN(a) === 14);
  check("picking up a pile takes it all", S.pickup(c, g, a) === 14 && a.gone && S.count(c, "stick", true) === 14);
}

console.log("3. the first recipe: stick + vine + rock");
{
  const { g, cs } = fresh(107, 2, 4);
  const c = cs[0];
  cs.slice(1).forEach(o => { o.x = c.x + 1.5; o.z = c.z; o.asleep = false; }); // watching
  run(g, SB.TICK * 2); // (the spatial grid catches up)
  S.add(c, "stick", 1); S.add(c, "vine", 1);
  const rs = S.recipes(c, g);
  const lash = rs.find(r => r.id === "lashing");
  check("a riddle for the rock-on-a-stick before it's known", lash && !lash.known && /something hard/.test(lash.riddle), lash && lash.riddle);
  check("the wrong things do nothing", !S.combine(c, g, ["stick", "vine"]).ok);
  S.add(c, "stone", 1);
  const watcher = cs[1], w0 = watcher.ideas.lashing || 0;
  let crafted = null; SB.bus.on("craft", d => { if (d.c === c) crafted = d; });
  const r = S.combine(c, g, ["stone", "vine", "stick"]);
  check("combining makes a rock-on-a-stick", r.ok && r.out === "primtool" && S.count(c, "primtool", true) === 1, r.msg);
  check("the ingredients are used up", S.count(c, "stick", true) === 0 && S.count(c, "vine", true) === 0 && S.count(c, "stone", true) === 0);
  check("it teaches the idea", I.known(c, "lashing") && r.learned);
  check("the tribe learns by watching", (watcher.ideas.lashing || 0) > w0, w0 + " -> " + (watcher.ideas.lashing || 0).toFixed(2));
  check("the craft event says it was you", crafted && crafted.pov && crafted.id === "lashing");
  const again = S.recipes(c, g).find(x => x.id === "lashing");
  check("now it's a known recipe with have / lack", again && again.known && !again.ok && again.lack.length === 3);
  check("a blob can't craft", !S.combine(fresh(108, 0).cs[0], g, ["stick", "vine", "stone"]).ok);
  // the AI never invents the hand-made ideas by itself
  check("pov ideas are flagged", I.BY_ID.lashing.pov && I.BY_ID.picks.pov && I.BY_ID.leanto.pov);
}

console.log("4. chopping and mining");
{
  const { g, cs } = fresh(109, 2);
  const c = cs[0];
  const tree = nodeOf(g, c, n => S.isTree(n) && n.state === "ok" && n.kind !== "giant" && n.kind !== "mangrove" && n.kind !== "bamboo" && n.kind !== "deadtree");
  c.x = tree.x + 1; c.z = tree.z;
  const paws = S.hitNode(c, g, tree, "paws");
  check("paws only shake a tree", paws.kind === "shake" && tree.state === "ok");
  const hp = S.treeHP(tree);
  let hits = 0, res = null, chopped = 0;
  SB.bus.on("chop", d => { if (d.c === c) chopped++; });
  while (tree.state === "ok" && hits < 40) { res = S.hitNode(c, g, tree, "primtool"); hits++; }
  check("a rock-on-a-stick fells it in hit points", tree.state === "stump" && hits === Math.ceil(hp / S.TOOL.primtool.wood), hits + " hits for " + hp + " hp");
  check("it falls with a chop event", res.felled && chopped === 1);
  const logs = g.world.items.filter(o => o.kind === "log" && SB.dist(o.x, o.z, tree.x, tree.z) < 4);
  check("logs, sticks and leaves land where it fell", logs.length && g.world.items.some(o => o.kind === "leaves" && SB.dist(o.x, o.z, tree.x, tree.z) < 4) && g.world.items.some(o => o.kind === "stick" && o.data.by === c.id));
  check("the stump grows back", tree.regrowT > 0);
  // an axe is quicker than a rock-on-a-stick
  const t2 = nodeOf(g, c, n => S.isTree(n) && n.state === "ok" && n !== tree && n.kind !== "giant" && n.kind !== "mangrove" && n.kind !== "bamboo" && n.kind !== "deadtree");
  let h2 = 0; while (t2.state === "ok" && h2 < 40) { S.hitNode(c, g, t2, "stoneaxe"); h2++; }
  check("a stone axe takes fewer hits", h2 < hits, h2 + " vs " + hits);
  // a log on a stump splits into planks
  S.add(c, "log", 1);
  check("a log goes on the stump", S.setBlock(c, g, tree) && tree.block);
  let sp; for (let i = 0; i < 4 && tree.block; i++) sp = S.hitNode(c, g, tree, "primtool");
  check("splitting gives planks and firewood", !tree.block && sp.gave.join() === "plank,plank,firewood");
  // rock
  const rock = nodeOf(g, c, n => n.kind === "boulder" || n.kind === "redrock");
  if (rock) {
    const p = S.hitNode(c, g, rock, "paws");
    check("paws chip a boulder, slowly and painfully", p.ok && p.kind === "chip" && c.chem.pain > 0);
    let k = 0, got = 0; while (rock.state === "ok" && k < 60) { got += S.hitNode(c, g, rock, "primtool").gave.length; k++; }
    check("a boulder shrinks into stones, then crumbles", rock.state === "gone" && got === 6, got + " stones in " + k + " hits");
    check("and grows back one day", rock.regrowT > 0);
  } else check("(no boulder on this seed)", true);
  // ore
  const ore = g.world.nodes.find(n => n.kind === "orevein") || (function () { const n = SB.World.addNode(g.world, g, "orevein", c.x + 3, c.z); return n; })();
  if (ore) {
    check("ore won't come out for a rock-on-a-stick", !S.hitNode(c, g, ore, "primtool").ok);
    let k = 0, got = []; while (ore.state === "ok" && k < 30) { got = got.concat(S.hitNode(c, g, ore, "stonepick").gave); k++; }
    check("a stone pick mines copper ore", got.length === 3 && got.every(x => x === "ore"), got.join());
  }
  // wear
  S.inv(c).s.fill(null);
  S.add(c, "primtool", 1, 1);
  check("a worn-out tool breaks", S.wear(c, g, 0) && !S.inv(c).s[0]);
}

console.log("5. vines");
{
  const g = SB.Game.newGame(7);
  const vines = g.world.nodes.filter(n => n.kind === "vines");
  const nest = g.world.T.nest || g.world.T.spawn;
  check("vines grow from the seed", vines.length > 30, vines.length + " vines");
  check("some within a short walk of the nest", vines.filter(v => SB.dist(v.x, v.z, nest.x, nest.z) < 20).length >= 3);
  check("never under trees", !vines.some(v => g.world.nodes.some(n => n !== v && S.isTree(n) && n.kind !== "vines" && SB.dist(n.x, n.z, v.x, v.z) < 1.5)));
  const g2 = SB.Game.newGame(7);
  check("the same seed, the same vines", JSON.stringify(g2.world.nodes.filter(n => n.kind === "vines").map(n => [n.x, n.z])) === JSON.stringify(vines.map(n => [n.x, n.z])));
  SB.Game.current = g;
  const c = SB.Debug.spawnTier(2, 1)[0];
  const v = vines[0];
  let pulled = 0; for (let i = 0; i < 5; i++) { const r = S.gather(c, g, v); if (r && r.kind === "vine") pulled++; }
  check("a vine patch gives 3, then is bare for a while", pulled === 3 && v.state === "picked" && v.regrowT > 0);
}

console.log("6. building from a ghost");
{
  const { g, cs } = fresh(110, 2);
  const c = cs[0];
  P.enter(g, c, { free: true });
  I.learn(c, "lashing", 1, g, "test");
  const list = P.buildable();
  check("the lean-to is in the plans once you know lashing", list.some(b => b.kind === "leanto" && b.can), list.map(b => b.kind).join());
  check("tool-users get their plans in the hotbar", S.inv(c).s.some(sl => sl && sl.k === "plans"));
  P.view(0, -0.45);
  check("starting a build shows a ghost", P.startBuild("leanto") && P.state().ghost && P.state().ghost.kind === "leanto");
  // find a spot that fits
  let st = null;
  for (let a = 0; a < 16 && !st; a++) { P.view(a * 0.39, -0.45); st = P.placeGhost(); if (!st) P.startBuild("leanto"); }
  check("placing the ghost makes a site", st && !st.done && st.kind === "leanto" && st.founder === c.name);
  P.cancelBuild();
  check("a site lists what it needs", S.needs(st).length === 3);
  S.add(c, "log", 1); S.add(c, "stick", 1); S.add(c, "leaves", 2); S.add(c, "vine", 1);
  const got = S.deliver(c, g, st);
  check("delivering: a log counts as 3 sticks", got.length && st.need.stick === 0 && st.need.leaves === 0 && st.need.vine === 0, JSON.stringify(st.need));
  let done = false; for (let i = 0; i < 200 && !done; i++) done = I.work(c, st, 0.1, g);
  check("building it finishes it", st.done);
  check("a lean-to is a shelter", !!SB.World.shelterAt(g.world, st.x, st.z));
  P.leave();
  check("an unbuildable spot is refused", !S.canPlace(g, "hut", st.x, st.z));
}

console.log("7. the first-time quest");
{
  const { g, cs } = fresh(111, 2);
  const c = cs[0];
  try { ctx.localStorage.removeItem("smolbrains-firsttool"); } catch (e) {}
  P.enter(g, c, { free: true });
  check("a tool-user gets the guide", P.quest() && P.questStep().id === "stick");
  check("it points at something", !!P.quest().target);
  S.add(c, "stick", 1); run(g, 0.5);
  check("a stick ticks it on", P.questStep().id === "vine");
  S.add(c, "vine", 1); S.add(c, "stone", 1); run(g, 0.5);
  check("vine and rock", P.questStep().id === "craft");
  P.combine(["stick", "vine", "stone"]); run(g, 0.5);
  check("crafting the tool", P.questStep().id === "chop");
  const tree = nodeOf(g, c, n => S.isTree(n) && n.state === "ok" && n.kind !== "giant" && n.kind !== "mangrove");
  for (let i = 0; i < 40 && tree.state === "ok"; i++) S.hitNode(c, g, tree, "primtool");
  run(g, 0.5);
  check("felling a tree", P.questStep().id === "fire");
  check("and the lean-to idea comes with it", I.known(c, "leanto"));
  P.skipQuest();
  check("skipping hides it for good", !P.quest() && g.settings.povQuest === "skipped" && ctx.localStorage.getItem("smolbrains-firsttool") === "done");
  P.leave();
  P.enter(g, c, { free: true });
  check("and it doesn't come back", !P.quest());
  P.leave();
}

console.log("8. dying with a pack");
{
  const { g, cs } = fresh(112, 2, 2);
  const c = cs[0];
  P.enter(g, c, { free: true });
  S.add(c, "stick", 5); S.add(c, "primtool", 1);
  c.ideas.secretthing = 1; // (not a real idea: ignored)
  let info = null; SB.bus.on("possessedDeath", d => { info = d.info; });
  const n0 = g.world.items.length;
  c.chem.health = 0.0001; c.chem.hunger = 0.95;
  run(g, 2);
  check("it really dies", !c.alive && info);
  check("the death says how", info && info.cause === "starved" && /starved/.test(info.why), info && info.why);
  check("and what was lost", info && info.items.some(x => x.k === "stick" && x.n === 5) && info.items.some(x => x.k === "primtool"));
  check("the pack lands where it fell", g.world.items.length >= n0 + 2);
  check("back in the sky", !P.active);
}

console.log("9. saves");
{
  const { g, cs } = fresh(113, 2);
  const c = cs[0];
  S.add(c, "stick", 3); S.add(c, "primtool", 1);
  const rock = nodeOf(g, c, n => n.kind === "boulder" || n.kind === "redrock");
  if (rock) S.hitNode(c, g, rock, "stonepick");
  const vine = g.world.nodes.find(n => n.kind === "vines");
  for (let i = 0; i < 3; i++) S.gather(c, g, vine);
  const d = JSON.parse(JSON.stringify(SB.Save.snapshot(g)));
  const g2 = SB.Save.revive(d);
  const c2 = g2.creatures.find(o => o.id === c.id);
  check("the inventory is saved with the smol", c2 && S.count(c2, "stick", true) === 3 && S.count(c2, "primtool", true) === 1);
  const r2 = rock && g2.world.nodes.find(n => n.id === rock.id);
  check("a chipped rock stays chipped", !rock || (r2 && r2.left === rock.left));
  const v2 = g2.world.nodes.find(n => n.id === vine.id);
  check("a picked vine stays picked", v2 && v2.state === "picked");
  // an old save (no inventories, no vines in it) still loads and plays
  const old = JSON.parse(JSON.stringify(d));
  old.creatures.forEach(o => { delete o.inv; });
  let ok = true;
  try { const g3 = SB.Save.revive(old); SB.Game.current = g3; run(g3, 5); } catch (e) { ok = false; console.log(e); }
  check("an old save loads", ok);
}

console.log(failed ? "\n" + failed + " FAILED" : "\nall passed");
process.exit(failed ? 1 : 0);
