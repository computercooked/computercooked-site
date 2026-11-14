// 4.22: holes found by playing a fresh island by hand (Nov 14). The first night can't get stuck when you let go of Pip
// mid-chase; a chase that runs past midnight wakes the same morning; the island waits while a film plays; the free
// first day has goals, quests and toasts; popups whose moment has passed are dropped; F picks up what you shook loose.
// node games/smol-brains/tests/playtest422.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");
const css = fs.readFileSync(path.join(__dirname, "..", "play", "style.css"), "utf8");

seeded(4220, () => {
  const ctx = load();
  ["possess.js", "firstnight.js"].forEach(f => vm.runInContext(js(f), ctx, { filename: f }));
  const SB = ctx.SB, P = SB.Possess, FN = SB.FirstNight, Q = SB.Quests; P.headless = true;
  function island(seed) {
    const game = SB.Game.newGame(seed); SB.Game.current = game; game.headless = true;
    const run = (s, until) => { for (let t = 0; t < s; t += SB.TICK) { SB.Game.step(game, SB.TICK); if (until && until()) return t; } return s; };
    const pip = FN.start(game);
    SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod)); run(1);
    return { game, run, pip };
  }

  console.log("1. the free first day: goals, quests and toasts are open");
  const A = island(51), game = A.game, run = A.run, pip = A.pip;
  check("before Pip eats, the story holds the screen", !FN.free(game) && !Q.open(game));
  const b = FN.bush(game); pip.x = b.x + 0.8; pip.z = b.z; SB.bus.emit("nibble", { c: pip, node: b });
  check("fed, but not free until you press “ok, let me play”", FN.state(game).s === "fed" && !FN.free(game));
  FN.state(game).freeOk = 1;
  check("then the day is yours", FN.free(game) && Q.open(game));
  Q.count(game, "possess");
  run(1.5);
  check("a quest done in the free day pays right away", !!Q.state(game).done.possess, JSON.stringify(Q.state(game).done));
  pip._pov = true; const n0 = Q.state(game).n.povEat || 0;
  SB.bus.emit("nibble", { c: pip, node: b }); pip._pov = false;
  check("a bush nibbled through a smol's eyes counts as eating", (Q.state(game).n.povEat || 0) === n0 + 1);

  console.log("2. let go of Pip mid-chase, come back: the night still ends");
  run(FN.DAY1 + FN.SUNSET + 5, () => FN.state(game).s === "lurk");
  check("night: a grump lurks", FN.state(game).s === "lurk" && !!FN.grump(game));
  check("not free any more", !FN.free(game));
  FN.lend(game);
  check("the chase is on", FN.state(game).s === "chase");
  P.leave();
  check("you let go: back to lurking", FN.state(game).s === "lurk" && !P.active);
  const g1 = FN.grump(game); if (g1) { g1.alive = false; g1.gone = true; } // it wandered off while you were away
  run(0.5);
  FN.lend(game);
  const g2 = FN.grump(game);
  check("lend your light again: another grump finds Pip", FN.state(game).s === "chase" && g2 && g2.alive && g2 !== g1);
  check("and it's the one chasing you", P.scout() === g2);
  // light the nest, then lose the grump altogether: nothing is left to end the chase
  FN.state(game).stickIds.forEach(id => { const it = SB.Game.byId(game, id); if (!it || it.gone || FN.state(game).sticks >= 2) return; pip.x = it.x; pip.z = it.z; run(0.2); });
  const nest = game.world.T.nest; pip.x = nest.x + 1; pip.z = nest.z; run(0.3);
  check("the nest is lit", FN.state(game).lit != null);
  if (FN.state(game).s === "chase") { g2.alive = false; g2.gone = true; }
  const took = run(12, () => FN.state(game).s !== "chase");
  check("with the fire lit and nothing chasing, the night is won", FN.state(game).s === "won" || FN.state(game).s === "dawn" || FN.state(game).done, FN.state(game).s + " after " + took.toFixed(1) + " s");
  run(6, () => FN.state(game).done);
  check("dawn comes", !!FN.state(game).done && !P.active);
  check("and the quests stay open after the first night, whatever the guide is doing", game.tutorial.done !== true ? Q.open(game) : true);

  console.log("3. a chase that runs past midnight wakes the same morning");
  const B = island(52), gb = B.game;
  const bb = FN.bush(gb); B.pip.x = bb.x + 0.8; B.pip.z = bb.z; SB.bus.emit("nibble", { c: B.pip, node: bb });
  B.run(FN.DAY1 + FN.SUNSET + 5, () => FN.state(gb).s === "lurk");
  FN.lend(gb);
  gb.time = SB.DAY_LENGTH * 1.02; gb.world.time = gb.time; // 00:30 on day 2: the chase ran long
  SB.bus.emit("scoutEnd", { c: B.pip, ok: true });
  B.run(8, () => FN.state(gb).done);
  check("the night is done", !!FN.state(gb).done);
  const day = gb.time / SB.DAY_LENGTH;
  check("it's the morning of day 2, not day 3", day > 1.2 && day < 1.3, "day " + (day + 1).toFixed(2));
  const C = island(53), gc = C.game;
  const bc = FN.bush(gc); C.pip.x = bc.x + 0.8; C.pip.z = bc.z; SB.bus.emit("nibble", { c: C.pip, node: bc });
  C.run(FN.DAY1 + FN.SUNSET + 5, () => FN.state(gc).s === "lurk");
  FN.lend(gc);
  SB.bus.emit("scoutEnd", { c: C.pip, ok: true }); // won before midnight
  C.run(8, () => FN.state(gc).done);
  const dayC = gc.time / SB.DAY_LENGTH;
  check("a chase won before midnight still wakes on day 2", dayC > 1.2 && dayC < 1.3, "day " + (dayC + 1).toFixed(2));

  console.log("3b. an island saved mid-night and loaded again still finishes");
  const E = island(55), ge = E.game;
  const be = FN.bush(ge); E.pip.x = be.x + 0.8; E.pip.z = be.z; SB.bus.emit("nibble", { c: E.pip, node: be });
  E.run(FN.DAY1 + FN.SUNSET + 5, () => FN.state(ge).s === "lurk");
  FN.state(ge).s = "chase"; FN.state(ge).t = 0; // as loaded: the chase was on, but nobody is in Pip's body
  E.run(2.5);
  check("mid-chase: back to “lend your light”", FN.state(ge).s === "lurk", FN.state(ge).s);
  FN.state(ge).s = "dawn"; FN.state(ge).t = 0; // as loaded: the dawn film was playing
  E.run(3.5);
  check("mid-dawn: the morning still comes", !!FN.state(ge).done, FN.state(ge).s);

  console.log("4. F picks up what you just shook loose");
  const D = island(54), gd = D.game;
  gd.tutorial.done = true; if (gd.tutorial.night) { gd.tutorial.night.done = true; gd.tutorial.night.s = "done"; }
  const c = SB.Game.smols(gd).filter(o => !o.pip)[0];
  const bush = SB.World.nearestNode(gd.world, c.x, c.z, 60, n => n.kind === "bush" && n.state === "ok");
  c.x = bush.x + 1.6; c.z = bush.z;
  P.enter(gd, c, { free: true });
  const ref = { type: "node", id: bush.id };
  bush.dropT = 0;
  const before = P.options(gd, c, ref);
  check("before a shake, F on a bush tugs leaves (or nothing)", !before.pick || /tug/.test(before.pick.label), before.pick && before.pick.label);
  let fell = null;
  for (let i = 0; i < 6 && !fell; i++) { bush.dropT = 0; P.act("use", ref); fell = gd.world.items.find(o => o.data && o.data.by === c.id && !o.gone); D.run(0.6); }
  check("a shake drops food", !!fell, fell && fell.kind);
  if (fell) {
    fell.x = c.x + 0.4; fell.z = c.z + 0.3;
    const o = P.options(gd, c, ref);
    check("now F picks it up, still looking at the bush", o.pick && !o.pick.locked && /pick up/.test(o.pick.label), o.pick && o.pick.label);
    check("and it lands in your mouth", !!P.act("pick", ref) && SB.Surv.count(c, fell.kind) >= 1);
  }
  P.leave();

  console.log("4b. tribe eggs follow the room there is");
  const pair = SB.Game.smols(gd).slice(0, 2); pair.forEach(o => { o.tier = 3; });
  gd.stats.maxTier = 4; // builders: room for 30
  const smols0 = SB.Game.smols, cap = SB.Civ.popCap(gd);
  const gapAt = n => { SB.Game.smols = () => new Array(n).fill(pair[0]); const g = SB.Creature.eggGap(gd, pair[0], pair[1]); SB.Game.smols = smols0; return g; };
  check("a handful: fast, as before", gapAt(4) < gapAt(13) && gapAt(4) <= SB.Creature.EGG_GAP * 0.3 + 60, gapAt(4) + " s");
  check("a full town: the slow rate, as before", gapAt(cap) >= SB.Creature.EGG_GAP, gapAt(cap) + " s at " + cap);
  check("a town down to 13 of " + cap + " is already refilling", gapAt(13) < SB.Creature.EGG_GAP * 0.8, gapAt(13) + " s");
  const ST = SB.Strangers, couples0 = ST.couples;
  ST.couples = () => 1;
  check("a tribe short of couples and half empty keeps a stranger nobody answered", ST.shortOfCouples(gd, 12) === true);
  check("a nearly full town doesn't", ST.shortOfCouples(gd, 26) === false);
  ST.couples = () => 5;
  check("nor one with couples enough", ST.shortOfCouples(gd, 12) === false);
  ST.couples = () => 1; gd.stats.maxTier = 2;
  check("and before the tribe age the old rule stands", ST.shortOfCouples(gd, 12) === false);
  ST.couples = couples0; gd.stats.maxTier = 4;

  console.log("4c. a courtship isn't wiped by a hug with someone else");
  const SO = SB.Social, town = SB.Debug.spawnTier(4, 12);
  town.forEach(o => { o.asleep = false; o.age = 900; o.stage = 3; o.chem.hunger = 0.1; o.chem.anger = 0; o.chem.love = 0; o.partner = null; o.court = null; o.courts = null; });
  const fs2 = town.filter(o => o.sex === "f"), ms2 = town.filter(o => o.sex === "m");
  if (fs2.length >= 2 && ms2.length >= 1) {
    const [ula, ana] = fs2, bren = ms2[0];
    [[ula, bren], [bren, ula], [ana, bren], [bren, ana]].forEach(q => SO.remember(gd, q[0], q[1], "talk", 30, "nice talks", 9999));
    bren.chem.love = 0.6; ula.chem.love = 0.5; ana.chem.love = 0.5;
    const need = SO.courtSteps(bren, ula);
    let moments = 0;
    for (let i = 0; i < 12 && bren.partner == null; i++) { gd.time += 30; if (SO.court(gd, bren, i % 2 ? ana : ula, "talk")) moments++; } // every other moment is with someone else
    check("turn and turn about, the count still climbs to a couple", bren.partner === ula.id || bren.partner === ana.id, moments + " moments, needs " + need + " with one");
    check("in about twice the moments, not never", moments <= need * 2);
    check("the half-courtships are let go once they're partners", bren.courts == null);
    const lone = fs2.concat(ms2).filter(o => o.partner == null && o.sex === "f")[0], guy = ms2.filter(o => o.partner == null)[0];
    if (lone && guy) {
      [[lone, guy], [guy, lone]].forEach(q => SO.remember(gd, q[0], q[1], "talk", 30, "nice talks", 9999));
      lone.chem.love = 0.6; guy.chem.love = 0.5;
      gd.time += 30; SO.court(gd, guy, lone, "talk");
      const n1 = guy.courts && guy.courts[lone.id] && guy.courts[lone.id].n;
      gd.time += SO.COURT_KEEP + 60; SO.court(gd, guy, lone, "talk");
      check("a courtship left alone for a quarter of an hour starts over", n1 === 1 && guy.courts && guy.courts[lone.id].n === 1, n1 + " then " + (guy.courts && guy.courts[lone.id] && guy.courts[lone.id].n));
    }
  } else check("the town has both sexes", false);
});

console.log("5. the files");
const main = js("main.js"), ui = js("ui.js"), po = js("possess.js");
check("the island waits while a story film plays", /var paused = [^;]*SB\.Lantern && SB\.Lantern\.running/.test(main));
check("the goals list shows from the free day", /SB\.Quests\.open\(game\)/.test(ui));
check("toasts are allowed in the free day", /SB\.FirstNight\.active\(game\) && !SB\.FirstNight\.free\(game\)/.test(ui));
check("a toast about a smol can be tapped to fly there", /function toast\(html, cls, ms, at\)/.test(ui) && /R\.flyTo\(at\.x, at\.z/.test(ui) && /\.toast\.go \{ pointer-events: auto/.test(css));
check("drowning, tantrums, fights and prayers point at their smol", (ui.match(/, d\.c\); \}\);/g) || []).length >= 3 && /are fighting!", "", 0, d\.a\)/.test(ui));
check("a story card is asked if its moment has passed", /function storyCard\(key, icon, title, paras, fallback, still\)/.test(ui) && /c\[3\] && !c\[3\]\(\)/.test(ui));
check("the night timer and the alert chip sit under windows", /\.fntimer \{[^}]*z-index: 4/.test(css) && /\.alert \{[^}]*z-index: 4/.test(css));
check("the armed miracle moves under a timer chip", /\.armtag\.low \{/.test(css) && /classList\.toggle\("low"/.test(ui));
check("the guide card lifts over the miracles", /\.coach\.lift \{/.test(css) && /classList\.toggle\("lift"/.test(ui));
check("the sniff walk stops short of the bush", /\(t\.s \|\| 1\) \+ 1\.7/.test(po));
const fn = js("firstnight.js"), cr = js("creature.js"), ph = js("povhud.js");
check("an island loaded mid-night gets its timer and button back", /if \(!ui && s && !s\.done\) show\(game\);/.test(fn));
check("a splash isn't a drowning alarm", /c\.drownT > 3 && !c\.drownNoted/.test(cr));
check("love grows on the same scale", /pop < Math\.max\(10, lcap \* 0\.45\) \? 2/.test(cr));
check("tribe eggs speed up before a town has emptied", /pop < Math\.max\(10, cap \* 0\.45\) \? 0\.5/.test(cr));
check("the “you are …” card is a card, not a curtain", /#pov \.intro\{position:absolute;left:50%;top:18%;bottom:auto;height:auto/.test(ph));
check("on a phone the chips sit under the goals list", /--goalsH/.test(css) && /setProperty\("--goalsH"/.test(ui));

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
