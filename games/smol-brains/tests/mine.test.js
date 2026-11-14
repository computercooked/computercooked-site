// 4.25: your smol (a favourite with an heir), hearts, and three jobs a day.
// node games/smol-brains/tests/mine.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");

seeded(4250, () => {
  const ctx = load();
  ["possess.js", "firstnight.js", "mine.js"].forEach(f => vm.runInContext(js(f), ctx, { filename: f }));
  const SB = ctx.SB, M = SB.Mine, P = SB.Possess, FN = SB.FirstNight; P.headless = true;
  const game = SB.Game.newGame(77); SB.Game.current = game; game.headless = true;
  // count every draw from the island's own dice
  let draws = 0;
  function spy() {
    const o = game.rng, w = function () { draws++; return o.apply(this, arguments); };
    Object.keys(o).forEach(k => { const f = o[k]; w[k] = typeof f === "function" ? function () { draws++; return f.apply(o, arguments); } : f; });
    game.rng = w; return () => { game.rng = o; };
  }

  console.log("1. nothing is yours during the first day");
  const pip = FN.start(game);
  check("no smol of yours yet, no jobs", M.get(game) == null && M.board(game) == null && !M.open(game));
  FN.begin(game); FN.skip(game);
  check("the morning after: Pip is your smol", M.get(game) === pip && M.is(game, pip) && M.state(game).line.join() === "Pip");
  check("and today's three jobs are up", !!M.board(game) && M.board(game).rows.length === 3);

  console.log("2. your smol");
  check("stepping into it is free", P.cost(game, pip) === 0);
  const other = SB.Game.smols(game).filter(c => c !== pip)[0];
  game.stats.possessed = 3;
  check("anyone else costs sparks", P.cost(game, other) === P.COST && P.cost(game, pip) === 0);
  check("hearts follow trust: five to none in halves", (pip.trust = 1, M.hearts(pip) === 5) && (pip.trust = 0.5, M.hearts(pip) === 2.5) && (pip.trust = 0, M.hearts(pip) === 0));
  pip.trust = 0.5;
  check("drawn as five", M.heartsText(pip).length === 5 && /^♥♥/.test(M.heartsText(pip)) && /♡♡$/.test(M.heartsText(pip)), M.heartsText(pip));
  pip.chem.hunger = 0.9;
  check("its chip says what it needs most", M.need(pip) && M.need(pip).word === "hungry");
  SB.DRIVES.forEach(d => { if (d !== "love") pip.chem[d] = Math.min(pip.chem[d] || 0, 0.2); });
  check("or nothing, when it's fine", M.need(pip) == null);
  check("you can pick another", M.set(game, other) && M.get(game) === other && M.state(game).line.join() === "Pip," + other.name);
  M.set(game, pip);

  console.log("3. the heir");
  const kid = SB.Game.spawnSmol(game, { genome: pip.genome, x: pip.x + 1, z: pip.z, parents: [pip.id, other.id], gen: 2, how: "test" });
  const kid2 = SB.Game.spawnSmol(game, { genome: pip.genome, x: pip.x + 2, z: pip.z, parents: [pip.id, other.id], gen: 2, how: "test" });
  kid.trust = 0.4; kid2.trust = 0.8; other.trust = 0.9;
  let heirEv = null; SB.bus.on("mineHeir", d => { heirEv = d; });
  pip.alive = false;
  check("when yours dies, a child carries on: the one that trusts you most", M.get(game) === kid2 && heirEv && heirEv.kin && heirEv.was === "Pip", M.get(game) && M.get(game).name);
  check("the line is remembered", M.state(game).line.slice(-2).join() === "Pip," + kid2.name);
  kid2.alive = false; kid.alive = false;
  check("no children left: whoever trusts you most", M.get(game) === other);
  const stranger = SB.Game.spawnSmol(game, { genome: pip.genome, x: pip.x + 3, z: pip.z, how: "test" }); stranger.stranger = { state: "waiting" };
  check("a stranger at the gate can't be yours", M.set(game, stranger) === false && M.get(game) === other);

  console.log("4. today's jobs");
  const b = M.board(game);
  const kinds = b.rows.map(r => M.JOB[r.id].kind).join();
  check("one with your hands, one of teaching, one for the island", kinds === "hands,teach,island", kinds);
  check("all fit a brand-new island", b.rows.every(r => M.JOB[r.id].tier <= (game.stats.maxTier || 0)));
  const sp0 = game.sparks;
  const fire = {
    poveat: () => SB.bus.emit("povEat", { c: other }), gather: () => SB.bus.emit("povGain", { c: other, kind: "stick", n: 1 }), craft: () => SB.bus.emit("craft", { c: other, pov: true }),
    tickle: () => SB.bus.emit("tickle", { c: other }), word: () => SB.bus.emit("learnWord", { c: other, word: "food" }), trick: () => SB.bus.emit("trickLearned", { c: other }),
    hatch: () => SB.bus.emit("hatch", { c: other, obj: { data: {} } }), wish: () => SB.bus.emit("wishGranted", { c: other, w: {} }), explore: () => SB.bus.emit("newBiome", { biome: 1 }),
    idea: () => SB.bus.emit("eureka", { c: other, first: true }), pray: () => SB.bus.emit("prayerAnswered", { c: other, how: "miracle", prayer: { need: "hunger" } }), build: () => SB.bus.emit("built", {})
  };
  let done = 0, all = null; SB.bus.on("jobDone", () => done++); SB.bus.on("jobsDone", d => { all = d; });
  const first = b.rows[0];
  fire[first.id]();
  check("doing the thing moves its job", M.board(game).rows[0].have === 1);
  for (let i = 1; i < first.need; i++) fire[first.id]();
  check("and finishing it pays", M.board(game).rows[0].done && done === 1 && game.sparks >= sp0 + M.JOB_PAY);
  fire[first.id]();
  check("once", done === 1);
  b.rows.slice(1).forEach(r => { for (let i = 0; i < r.need; i++) fire[r.id](); });
  check("all three: a bonus", done === 3 && all && all.pay === M.JOB_BONUS && M.board(game).bonus);
  const ids1 = M.board(game).rows.map(r => r.id).join();
  const un = spy(), d0 = draws;
  game.time += SB.DAY_LENGTH;
  const b2 = M.board(game); un();
  check("a new day, three new jobs, none carried over", b2.day === b.day + 1 && b2.rows.every(r => !r.done && r.have === 0));
  check("not the same three as yesterday", b2.rows.map(r => r.id).join() !== ids1, b2.rows.map(r => r.id).join());
  check("picking them never touches the island's own dice", draws === d0, (draws - d0) + " draws");
  game.stats.maxTier = 4;
  const seen = {}; for (let d = 0; d < 40; d++) { game.time += SB.DAY_LENGTH; M.board(game).rows.forEach(r => { seen[r.id] = 1; }); }
  check("a builder island sees every kind of job over time", M.JOBS.every(j => seen[j.id]), M.JOBS.filter(j => !seen[j.id]).map(j => j.id).join());
  const tr = other.trust; SB.bus.emit("wishGranted", { c: other, w: {} });
  check("a granted wish is worth half a heart", Math.abs(other.trust - Math.min(1, tr + M.WISH_TRUST)) < 1e-9);
  const sv = JSON.parse(JSON.stringify(game.quests));
  check("it all saves with the quest board", sv.mine && sv.mine.id === other.id && sv.jobs && sv.jobs.list.length === 3);
});

console.log("5. the files");
const ui = js("ui.js"), css = fs.readFileSync(path.join(__dirname, "..", "play", "style.css"), "utf8"), html = fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8"), main = js("main.js");
check("mine.js is loaded by the page", /<script defer src="js\/mine\.js"><\/script>/.test(html));
check("your smol has a chip, with a way in", /class: "minechip glass live hide"/.test(ui) && /\.minechip \{/.test(css) && /SB\.Possess\.enter\(game, m\)/.test(ui));
check("the goals list leads with today", /class="head today"/.test(ui) && /data-j="/.test(ui));
check("every card shows hearts, and can make a smol yours", /SB\.Mine\.heartsText\(c\)/.test(ui) && /☆ make it mine/.test(ui));
check("tapping a toast selects by id (4.22 passed the smol itself, which selected nobody)", /SB\.Game\.select\(game, at\.id\)/.test(ui) && !/SB\.Game\.select\(game, at\);/.test(ui));
check("an island being built or loaded says so", /veil\("🏮 waking the island…"\)/.test(main) && /\.loadveil \{/.test(css));

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
