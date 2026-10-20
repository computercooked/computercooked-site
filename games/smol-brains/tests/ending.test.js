// The ending: finishing the spire is the end of the long thought (once), it boosts every mind left on
// the island, and new game+ starts a fresh island with your best two smols' heirs, cut back to
// tool-users but keeping their looks and personalities. Resonance and the star dome do something.
// node games/smol-brains/tests/ending.test.js
"use strict";
const load = require("./_load.js");

let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }

const { SB } = load();
const game = SB.Game.newGame(11); SB.Game.current = game; game.tutorial.done = true;
const hm = SB.Society.home(game, 0);
const smols = SB.Debug.spawnTier(6, 6); smols.forEach((c, i) => { c.asleep = false; c.sex = i % 2 ? "m" : "f"; });

console.log("1. the spire ends the long thought, once");
{
  const ends = [];
  SB.bus.on("bigThought", d => ends.push(d.first));
  SB.Debug.build("spire", hm.x + 6, hm.z);
  const st = game.world.structures.find(s => s.kind === "spire");
  check("a spire was built", st && st.done);
  check("the ending fires once, as the first time", ends.length === 1 && ends[0] === true, JSON.stringify(ends));
  check("every mind left thinks faster", game.culture.spireBoost === true && game.ended === true);
  SB.bus.emit("built", { st });
  check("a second spire is just a moment", ends.length === 2 && ends[1] === false);
}

console.log("2. resonance and the star dome");
{
  const c = smols[0];
  c.ideas = c.ideas || {}; c.ideas.resonance = 1; c._resT = 0;
  SB.World.addNode(game.world, game, "crystals", c.x + 2, c.z, 1);
  check("an ascended smol near crystals resonates", SB.Ideas.resonant(c, game));
  const st = { kind: "hut", x: c.x, z: c.z, need: {}, work: 0, builders: [] };
  const other = smols[1]; other.ideas = other.ideas || {}; other.ideas.resonance = 1; other.x = c.x + 1; other.z = c.z;
  SB.Ideas.work(c, st, 1, game); const solo = st.work;
  st.work = 0; st.builders.push(other.id);
  SB.Ideas.work(c, st, 1, game);
  check("resonant builders build faster together", st.work > solo * 1.2, solo.toFixed(2) + " → " + st.work.toFixed(2));
  SB.Director.state(game).nextT = 1e9;
  if (game.dir.active) SB.Director.end(game, game.dir.active, "");
  game.world.weather.kind = "clear"; game.world.season = 1;
  let inc = SB.Director.fire(game, "storm"); const plain = inc && inc.warn;
  if (inc) SB.Director.end(game, inc, "");
  SB.Debug.build("observatory", hm.x - 6, hm.z);
  inc = SB.Director.fire(game, "storm");
  check("the star dome sees storms coming earlier", inc && inc.warn > plain, plain + " → " + (inc && inc.warn));
  if (inc) SB.Director.end(game, inc, "");
}

console.log("3. new game+");
{
  const champs = SB.Game.champions(game);
  const g2 = SB.Game.newGamePlus(game, 99);
  const pod = g2.world.items.find(o => o.data && o.data.pod);
  check("a fresh island with a pod", g2.seed !== game.seed && !!pod);
  check("the pod holds the champions' heirs", pod.data.heirs && pod.data.heirs.length === 2 && champs[0].sex === "f" && champs[1].sex === "m", pod.data.heirs.join(" & "));
  const t1 = SB.Genome.tierOf(pod.data.genome), t2 = SB.Genome.tierOf(pod.data.genome2);
  check("cut back to tool-users", t1 >= 1 && t1 <= 3 && t2 >= 1 && t2 <= 3, t1 + "," + t2);
  check("…but they keep their looks and personality", pod.data.genome.genes.hue === champs[0].genome.genes.hue && pod.data.genome.genes.curiosity === champs[0].genome.genes.curiosity);
  check("it counts, and skips the tutorial", g2.ngPlus === 1 && g2.tutorial.done);
  const snap = JSON.parse(JSON.stringify(SB.Save.snapshot(g2)));
  const g3 = SB.Save.revive(snap);
  check("new game+ survives a save", g3.ngPlus === 1);
  const g4 = SB.Save.revive(JSON.parse(JSON.stringify(SB.Save.snapshot(game))));
  check("the ending survives a save", g4.ended && g4.culture.spireBoost);
  SB.Game.current = g2;
  let err = null; try { SB.Game.hatch(g2, pod); for (let t = 0; t < 600 / SB.TICK; t++) SB.Game.step(g2, SB.TICK); } catch (e) { err = e; }
  check("the heirs hatch and live", !err && SB.Game.smols(g2).length >= 2, err && err.message);
}

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
