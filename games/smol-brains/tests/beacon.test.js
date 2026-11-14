// 4.28: the ending is something you do. The smols raise the spire; you step into one, walk up and light it. If
// nobody comes for a day the smols light it themselves, and a headless island lights it at once (as before).
// node games/smol-brains/tests/beacon.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");

seeded(4280, () => {
  const ctx = load();
  vm.runInContext(js("possess.js"), ctx, { filename: "possess.js" });
  const SB = ctx.SB, P = SB.Possess; P.headless = true;
  function island(seed, headless) {
    const game = SB.Game.newGame(seed); SB.Game.current = game; game.headless = !!headless; game.tutorial.done = true;
    SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod));
    const hm = game.world.T.nest;
    const st = SB.World.addStructure(game.world, game, "spire", hm.x + 8, hm.z + 3, { done: true });
    return { game, st };
  }
  let thought = [], ready = 0;
  SB.bus.on("bigThought", d => thought.push(d)); SB.bus.on("beaconReady", () => ready++);

  console.log("1. the spire goes up: it waits for you");
  const A = island(61, false), game = A.game, st = A.st;
  // (World.addStructure with done:true already said "built")
  check("no ending yet", !game.ended && thought.length === 0 && !game.achievements.bigthought);
  check("the island is told the beacon needs lighting", ready === 1 && SB.Game.beaconWaiting(game) === st);
  const sv = JSON.parse(JSON.stringify({ ended: !!game.ended, ach: game.achievements, done: st.done, kind: st.kind }));
  check("“waiting” is read off the world, so it survives a save", sv.kind === "spire" && sv.done && !sv.ended);

  console.log("2. light it with your own hands");
  const me = SB.Game.smols(game)[0]; me.tier = 2; me.stage = 3;
  me.x = st.x + 30; me.z = st.z;
  P.enter(game, me, { free: true });
  const ref = { type: "struct", id: st.id };
  check("the spire offers it", /light the beacon/.test((P.options(game, me, ref).use || {}).label || ""));
  check("from too far: get closer", !P.act("use", ref) && !game.ended);
  me.x = st.x + 2; me.z = st.z;
  check("up close: lit", !!P.act("use", ref) && game.ended === true);
  check("that is the ending, and it knows whose hand it was", thought.length === 1 && thought[0].first === true && thought[0].c === me && !!game.achievements.bigthought);
  check("nothing is waiting any more", SB.Game.beaconWaiting(game) == null && !/light the beacon/.test((P.options(game, me, ref).use || {}).label || ""));
  P.leave();

  console.log("3. nobody comes: the smols light it at the next dawn but one");
  thought = [];
  const B = island(62, false), gb = B.game;

  SB.bus.emit("dawn", {});
  check("the same morning: still waiting", !gb.ended && SB.Game.beaconWaiting(gb) === B.st);
  gb.time += SB.DAY_LENGTH; SB.bus.emit("dawn", {});
  check("a day later: lit, by nobody in particular", gb.ended === true && thought.length === 1 && thought[0].c == null);

  console.log("4. a headless island lights it at once");
  thought = [];
  const C = island(63, true), gc = C.game;

  check("as before", gc.ended === true && thought.length === 1);
});

console.log("5. the files");
const ui = js("ui.js"), ph = js("povhud.js");
check("the goals list and a toast send you to light it", /step into a smol \(your smol's 👁\), walk to it and light the beacon/.test(ui) && /on\("beaconReady"/.test(ui));
check("in a body, the marker points at the spire", /name: "light the beacon"/.test(ph));

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
