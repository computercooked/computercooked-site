// Threats: grumps that grow stronger, hurt for real, steal smols away to their camps, wreck buildings and
// learn your walls; a village that defends itself; and very rare natural disasters that play out and
// leave a mark. Nothing here may wipe out a colony that answers sensibly (or doesn't answer at all).
// node games/smol-brains/tests/threats.test.js
"use strict";
const load = require("./_load.js");

let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }

function village(seed, tier) {
  const SB = load().SB;
  const game = SB.Game.newGame(seed); SB.Game.current = game; game.tutorial.done = true;
  const pod = game.world.items.find(o => o.data && o.data.pod); if (pod) SB.World.remove(game.world, pod);
  const hm = SB.Society.home(game, 0);
  ["campfire", "hut", "farm", "hut", "school"].forEach((k, i) => { try { SB.Debug.build(k, hm.x + Math.cos(i * 1.3) * 6, hm.z + Math.sin(i * 1.3) * 6); } catch (e) {} });
  for (let i = 0; i < 12; i++) { const [s] = SB.Debug.spawnTier(tier == null ? 3 : tier, 1); s.asleep = false; }
  game.time = 1200; game.sparks = 400;
  return { SB, game, hm };
}
function run(SB, game, secs, each) { for (let t = 0; t < secs / SB.TICK; t++) { SB.Game.step(game, SB.TICK); if (each) each(t); } }
const smols = (SB, game) => SB.Game.smols(game);

console.log("1. grumps grow with the island");
{
  const { SB, game } = village(1, 1);
  const T = SB.Threats;
  const l0 = T.level(game);
  game.time = 3 * 3600; SB.Debug.spawnTier(5, 1);
  const l1 = T.level(game);
  check("stronger later and with a cleverer tribe", l1 > l0 + 0.5, l0 + " → " + l1);
  const g = SB.Game.spawnGrump(game, 100, 100);
  check("a new grump is as strong as the times", Math.abs(g.str - l1) < 0.01 && g.tough > 1.3, g.str + " / " + g.tough.toFixed(2));
  check("tough grumps take more whacks", T.whacksNeeded(g) > 3, T.whacksNeeded(g) + " whacks");
  check("raids get bigger", T.raidSize(game, 5) > 5, T.raidSize(game, 5) + " from 5");
}

console.log("2. grumps learn your walls (ladders, rams) and fire");
{
  const { SB, game } = village(2);
  const T = SB.Threats;
  check("at first a palisade holds them 25 s", T.wallTime(game) === 25 && !T.gear(game).ladders);
  SB.bus.emit("incidentEnd", { inc: { id: "raid", walled: true }, ok: true, text: "" });
  check("after a walled raid: ladders", T.gear(game).ladders && T.wallTime(game) < 25, T.wallTime(game) + " s");
  SB.bus.emit("incidentEnd", { inc: { id: "raid", walled: true }, ok: true, text: "" });
  check("after two: rams", T.gear(game).rams && T.wallTime(game) <= 6);
  SB.bus.emit("incidentEnd", { inc: { id: "raid" }, ok: true, text: "" });
  check("after three raids on a tribe that knows fire: torches", T.gear(game).torches);
  check("the raid card warns you", /ram/.test(T.raidNote(game)) && /torch/.test(T.raidNote(game)), T.raidNote(game));
  const hm = SB.Society.home(game, 0);
  const walls = []; for (let i = 0; i < 26; i++) { const a = i / 26 * 6.283; walls.push(SB.World.addStructure(game.world, game, "wall", hm.x + Math.sin(a) * 9, hm.z + Math.cos(a) * 9, { done: true, rot: a + Math.PI / 2 })); } // a ring of palisades
  const g = SB.Game.spawnGrump(game, hm.x, hm.z - 11); g.raider = { x: hm.x, z: hm.z };
  game.tutorial.done = false; // keep the storyteller out of it (it sends stray raiders home)
  run(SB, game, 30, () => { if (!g.action || !g.action.called) SB.Creature.sendTo(g, hm.x, hm.z, game, 10); });
  check("a battering ram knocks a palisade down", walls.some(w => !w.done && w.data.wrecked === "rammed"), walls.filter(w => !w.done).length + " down");
}

console.log("3. a grump's blow is real, but huts protect and only fighters can be killed");
{
  const { SB, game, hm } = village(3);
  game.time = 3 * 3600;
  const g = SB.Game.spawnGrump(game, hm.x + 20, hm.z + 20);
  const [a, b, f] = smols(SB, game);
  a.x = hm.x + 15; a.z = hm.z + 15; b.x = a.x; b.z = a.z; f.x = a.x; f.z = a.z; f.rally = 30;
  for (let i = 0; i < 40; i++) { SB.Threats.wound(game, g, a); SB.Threats.wound(game, g, f); }
  check("a smol who isn't fighting is hurt but not killed", a.chem.health >= 0.29 && a.chem.health < 0.5, a.chem.health.toFixed(2));
  check("a smol who stands and fights can be", f.chem.health < 0.05, f.chem.health.toFixed(2));
  const hut = game.world.structures.find(s => s.kind === "hut" && s.done);
  b.x = hut.x; b.z = hut.z; b.chem.health = 1;
  SB.Threats.wound(game, g, b);
  const inHut = 1 - b.chem.health; b.x = hm.x + 15; b.chem.health = 1; SB.Threats.wound(game, g, b);
  check("a hut takes most of the blow", inHut < (1 - b.chem.health) * 0.5, inHut.toFixed(3) + " vs " + (1 - b.chem.health).toFixed(3));
  check("and the smol remembers who did it", SB.Mind.vivid(a, game, 5).some(e => /grump/.test(e.w)));
}

console.log("4. grumps carry smols off to their camps (and you can get them back)");
{
  const { SB, game, hm } = village(4);
  const kid = SB.Debug.spawnTier(3, 1)[0]; kid.age = 80; kid.stage = 1; kid.x = hm.x + 14; kid.z = hm.z + 14; kid.asleep = false;
  game.world.time = Math.floor(game.world.time / SB.DAY_LENGTH + 1) * SB.DAY_LENGTH + 0.05 * SB.DAY_LENGTH; game.world.night = true;
  let g = SB.Game.spawnGrump(game, kid.x + 0.6, kid.z);
  let grabbed = 0; SB.bus.on("grumpGrab", () => grabbed++);
  for (let t = 0; t < 120 / SB.TICK && !grabbed; t++) { if (g.carry == null && g.alive) { g.goingHome = false; kid.x = hm.x + 14; kid.z = hm.z + 14; kid.inBed = false; g.x = kid.x + 0.6; g.z = kid.z; } SB.Game.step(game, SB.TICK); } // young tribes lose kids less often: give it time
  run(SB, game, 0.5);
  check("a night prowler snatches a kid out in the open", grabbed >= 1 && kid.carriedBy === g.id, "grabbed " + grabbed);
  const y0 = kid.y;
  check("the kid dangles from it", SB.dist(kid.x, kid.z, g.x, g.z) < 0.5 && y0 > SB.World.groundY(game.world, kid.x, kid.z) + 0.3);
  // a smol with a club whacks it: it lets go
  const [hero] = smols(SB, game).filter(c => c !== kid);
  hero.x = g.x + 0.5; hero.z = g.z;
  SB.Creature._hitFx(hero, g, game);
  check("a whack makes it drop the kid", g.carry == null && kid.carriedBy == null);
  check("the kid remembers who saved it", SB.Social.opinion(game, kid, hero) > 20, SB.Social.opinion(game, kid, hero).toFixed(0));
  // another grump gets away with it
  g = SB.Game.spawnGrump(game, kid.x, kid.z);
  g.carry = kid.id; kid.carriedBy = g.id; g.goingHome = true;
  g.alive = false; g.gone = true;
  run(SB, game, 3);
  const camp = kid.captive != null && game.sites[kid.captive];
  check("…and the kid ends up held at a grump camp", !!camp && camp.kind === "camp" && SB.dist(kid.x, kid.z, camp.x, camp.z) < 3);
  check("the camp shows up on your map", camp && camp.found && !camp.done);
  run(SB, game, 30);
  check("the captive stays put", kid.captive != null && SB.dist(kid.x, kid.z, camp.x, camp.z) < 4, SB.dist(kid.x, kid.z, camp.x, camp.z).toFixed(1));
  check("the storyteller will ask you about the camp", !camp.asked || (game.dir.active && game.dir.active.id === "camp") || SB.Director.state(game).history.some(h => h[1] === "camp"));
  const freed = SB.Sites.free(game, camp);
  check("freeing the camp brings the kid home too", kid.captive == null && freed.indexOf(kid) >= 0);
  // left alone long enough, a captive slips out on its own
  const k2 = smols(SB, game)[3]; const camp2 = game.sites.find(s => s.kind === "camp" && s !== camp) || camp;
  camp2.done = false; k2.captive = camp2.id; k2.captiveT = game.time; k2.x = camp2.x; k2.z = camp2.z;
  game.time += 1600; run(SB, game, 3);
  check("a captive escapes on its own after a long while", k2.captive == null);
}

console.log("5. raiders smash and burn buildings; builders put them back up");
{
  const { SB, game, hm } = village(5, 4);
  const T = SB.Threats;
  const hut = game.world.structures.find(s => s.kind === "hut" && s.done);
  smols(SB, game).forEach(c => { c.ideas.hut = 1; c.ideas.weave = 1; }); // the ones who built it know how
  for (let i = 0; i < 30 && hut.done; i++) T.damage(game, hut, 0.1, "smashed");
  check("enough damage wrecks it", !hut.done && hut.data.wrecked === "smashed" && Object.keys(hut.need).length > 0, JSON.stringify(hut.need));
  const grave = SB.World.addStructure(game.world, game, "grave", hm.x + 3, hm.z + 3, { done: true });
  check("graves are never wrecked", !T.wreck(game, grave) && grave.done);
  let back = false; SB.bus.on("built", d => { if (d.st === hut) back = true; });
  Object.keys(hut.need).forEach(k => { for (let i = 0; i < hut.need[k] + 2; i++) SB.World.add(game.world, game, k, hut.x + 2 + i * 0.4, hut.z + 2, {}); }); // the makings lie about (gathering isn't what's tested here)
  run(SB, game, 600);
  check("the builders rebuild it", back && hut.done, JSON.stringify(hut.need) + " work " + hut.work.toFixed(1));
  // a raid at full strength: buildings get hit and it says so
  const r = village(55); const S2 = r.SB, g2 = r.game;
  g2.time = 3 * 3600; ["raid", "raid", "raid"].forEach(() => S2.bus.emit("incidentEnd", { inc: { id: "raid" }, ok: true, text: "" }));
  let msg = ""; S2.bus.on("incidentEnd", d => { if (d.inc.id === "raid") msg = d.text; });
  const wrecked = []; S2.bus.on("wrecked", d => wrecked.push(d.st.kind + ":" + d.how));
  for (let k = 0; k < 2 && !wrecked.length; k++) { const inc = S2.Director.fire(g2, "raid"); S2.Director.choose(g2, inc, "hide"); run(S2, g2, 260); g2.dir.lastBad = 0; g2.dir.last = {}; }
  check("a strong raid wrecks something", wrecked.length >= 1, wrecked.join(","));
  check("…and burns with torches", wrecked.some(w => /burned/.test(w)), wrecked.join(","));
  check("the end card says what they did", /wrecked|ran off|carried/.test(msg), msg);
}

console.log("6. the village defends itself: the armed and brave fight, kids and elders hide");
{
  const { SB, game, hm } = village(6);
  const cs = smols(SB, game);
  const fighter = cs[0]; fighter.genome.genes.bravery = 0.9; SB.Debug.give && SB.Debug.give(fighter, "club");
  if (fighter.tool == null) { const club = SB.World.add(game.world, game, "club", fighter.x, fighter.z, {}); club.heldBy = fighter.id; fighter.tool = club.id; }
  const kid = SB.Debug.spawnTier(3, 1)[0]; kid.age = 80; kid.stage = 1; kid.x = hm.x + 2; kid.z = hm.z + 2;
  const g = SB.Game.spawnGrump(game, hm.x - 7, hm.z + 8); g.raider = { x: hm.x, z: hm.z }; // not by the campfire
  game.tutorial.done = false; // keep the storyteller out of it (it sends stray raiders home)
  fighter.x = hm.x - 2; fighter.z = hm.z + 3;
  run(SB, game, 4);
  check("the armed, brave smol stands up to it", fighter.rally > 0 && fighter.defend);
  check("the kid runs to hide in a hut", !!kid.hideAt && game.world.structures.some(s => s.kind === "hut" && Math.abs(s.x - kid.hideAt.x) < 0.01));
  if (!kid.hideAt) kid.hideAt = { x: hm.x, z: hm.z, t: 0 };
  run(SB, game, 20);
  const hut = game.world.structures.find(s => s.kind === "hut" && Math.abs(s.x - kid.hideAt.x) < 0.01);
  check("…and gets there", SB.dist(kid.x, kid.z, hut.x, hut.z) < 2, SB.dist(kid.x, kid.z, hut.x, hut.z).toFixed(1));
}

console.log("7. raids never wipe out a colony (answered sensibly, or not at all)");
{
  for (const [seed, choice] of [[71, "hide"], [72, "fight"], [73, null], [74, null]]) {
    const { SB, game } = village(seed, 4);
    game.time = 4 * 3600; game.ngPlus = 1; // as strong as grumps get, short of later rounds
    ["raid", "raid", "raid"].forEach(() => SB.bus.emit("incidentEnd", { inc: { id: "raid", walled: true }, ok: true, text: "" }));
    const pop0 = smols(SB, game).length; let deaths = 0, grabs = 0;
    SB.bus.on("death", d => { if (d.c.species === "smol" && d.cause !== "old") deaths++; });
    SB.bus.on("grumpGrab", () => grabs++);
    for (let k = 0; k < 3; k++) {
      const inc = SB.Director.fire(game, "raid");
      if (inc && choice) SB.Director.choose(game, inc, choice);
      run(SB, game, 320); // a hands-off player: the card times out to "everyone home"
      game.dir.lastBad = 0; game.dir.last = {};
    }
    const pop1 = smols(SB, game).filter(c => c.captive == null).length;
    check("three strong raids, " + (choice || "hands off") + ": the colony stands", pop1 >= pop0 * 0.75 && deaths <= 2, pop0 + " → " + pop1 + " (deaths " + deaths + ", grabbed " + grabs + ")");
  }
}

console.log("8. natural disasters: every one, every choice, plays out and leaves a mark");
{
  const kinds = ["tsunami", "hurricane", "sandstorm", "tornado", "quake"];
  for (const id of kinds) for (const choice of ["calm", "shelter", "ride"]) {
    const { SB, game, hm } = village(80 + kinds.indexOf(id), 4);
    game.time = 2 * 3600; game.world.season = 1;
    const ends = []; SB.bus.on("incidentEnd", d => ends.push(d));
    const inc = SB.Director.fire(game, id);
    if (!inc) { check(id + " can be dealt", false); continue; }
    const s0 = game.sparks;
    const ok = SB.Director.choose(game, inc, choice);
    const paid = s0 - game.sparks;
    let deaths = 0; SB.bus.on("death", d => { if (d.cause !== "old") deaths++; });
    let seen = false;
    run(SB, game, inc.warn + 220, () => { if (game.disaster) seen = true; });
    const end = ends.find(d => d.inc === inc);
    check(id + " / " + choice + " ends cleanly", ok && !!end && game.dir.active !== inc && !game.disaster, end ? end.text.slice(0, 70) : "no end");
    if (choice === "calm") check(id + " / calm costs sparks and never lands", paid > 0 && !seen, paid + " ✨");
    if (choice === "shelter") check(id + " / shelter: nobody dies", deaths === 0, deaths + " deaths");
    if (choice === "ride") {
      check(id + " / it goes in the chronicle", (game.chronicle || []).some(e => JSON.stringify(e).includes(SB.Threats.DIS[id].name)));
      check(id + " / survivors remember it", smols(SB, game).some(c => SB.Mind.vivid(c, game, 9).some(e => e.w.includes(SB.Threats.DIS[id].name))));
    }
  }
  // the tornado really does wreck what's in its path, and the builders fix it after
  const { SB, game, hm } = village(90, 4);
  const inc = SB.Director.fire(game, "tornado");
  inc.info.x0 = hm.x - 30; inc.info.z0 = hm.z; inc.info.x1 = hm.x + 30; inc.info.z1 = hm.z;
  const hut = SB.World.addStructure(game.world, game, "hut", hm.x, hm.z + 1, { done: true });
  SB.Director.choose(game, inc, "shelter");
  run(SB, game, inc.warn + 80);
  check("a tornado through the village wrecks a hut in its path", !hut.done && /torn/.test(hut.data.wrecked || ""), hut.data.wrecked);
}

console.log("9. disasters are rare: never early, never back to back, about one an hour or two");
{
  const { SB, game } = village(91, 4);
  const T = SB.Threats, D = SB.Director;
  game.time = 1000;
  check("never in the first half hour", !D.DECK.filter(c => c.dis).some(c => c.ok(game)));
  game.time = 2 * 3600; T.state(game).lastDis = game.time - 600;
  check("never right after another", !D.DECK.filter(c => c.dis).some(c => c.ok(game)));
  // four storyteller-hours on a few islands: count the disasters dealt
  const counts = [];
  for (const seed of [92, 93, 94, 95, 96, 97]) {
    const v = village(seed, 4); const S = v.SB, g = v.game;
    g.time = 0; g.dir = null; S.Director.state(g);
    let n = 0, firstT = null; S.bus.on("incident", d => { if (S.Threats.DIS[d.inc.id]) { n++; if (firstT == null) firstT = g.time; } S.Director.choose(g, d.inc, S.Director.freeChoice(d.inc)); });
    // fast: deal cards straight from the deck on the storyteller's own clock, without simulating the island
    for (g.time = 0; g.time < 4 * 3600; g.time += 30) {
      const d = S.Director.state(g);
      if (d.active) { S.Director.end(g, d.active, true); g.disaster = null; }
      if (g.time >= d.nextT) S.Director.fire(g);
    }
    counts.push(n + (firstT != null ? "@" + Math.round(firstT / 60) + "m" : ""));
  }
  const ns = counts.map(c => parseInt(c));
  const avg = ns.reduce((a, b) => a + b, 0) / ns.length;
  check("one to three in four hours, on average", avg >= 0.8 && avg <= 3.2, counts.join(" "));
  check("none before 30 minutes", counts.every(c => !c.includes("@") || parseInt(c.split("@")[1]) >= 30), counts.join(" "));
  check("calm storytelling deals fewer than wild", (() => {
    const tally = (mode) => { let tot = 0; for (const seed of [92, 93, 94]) { const v = village(seed, 4); const S = v.SB, g = v.game; g.settings = { storyteller: mode }; g.time = 0; g.dir = null; S.Director.state(g); S.bus.on("incident", d => { if (S.Threats.DIS[d.inc.id]) tot++; S.Director.choose(g, d.inc, S.Director.freeChoice(d.inc)); }); for (g.time = 0; g.time < 6 * 3600; g.time += 30) { const d = S.Director.state(g); if (d.active) { S.Director.end(g, d.active, true); g.disaster = null; } if (g.time >= d.nextT) S.Director.fire(g); } } return tot; };
    const c = tally("calm"), w = tally("wild"); console.log("    (calm " + c + ", wild " + w + ")"); return c < w;
  })());
}

console.log("10. it all saves");
{
  const { SB, game } = village(10);
  const T = SB.Threats;
  SB.bus.emit("incidentEnd", { inc: { id: "raid", walled: true }, ok: true, text: "" });
  T.state(game).camps[game.sites.find(s => s.kind === "camp").id] = 3; T.state(game).lastDis = 5000; T.state(game).taken = 2;
  const kid = smols(SB, game)[0]; const camp = game.sites.find(s => s.kind === "camp"); kid.captive = camp.id; kid.captiveT = game.time;
  const snap = JSON.parse(JSON.stringify(SB.Save.snapshot(game)));
  const g2 = SB.Save.revive(snap); SB.Game.current = g2;
  const s2 = SB.Threats.state(g2);
  check("what the grumps learned survives", s2.lore.walled === 1 && s2.lore.raids === 1 && SB.Threats.gear(g2).ladders);
  check("camp sizes and the disaster clock survive", s2.camps[camp.id] === 3 && s2.lastDis === 5000 && s2.taken === 2);
  check("captives are still captives", SB.Game.smols(g2).some(c => c.captive === camp.id));
  const bad = SB.Save.revive(Object.assign({}, snap, { threats: "garbage" }));
  check("a broken threats save doesn't break the game", bad && SB.Threats.state(bad).lore.raids === 0);
}

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
