// 4.29: a phone-size run through the captains to the beacon. What it found: the menu button was off the right edge,
// the story's next step was hidden under "today", your smol's chip sat on the map, and a captain was called "grump".
// node games/smol-brains/tests/phone429.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const play = f => fs.readFileSync(path.join(__dirname, "..", "play", f), "utf8");
const css = play("style.css"), ui = play("js/ui.js"), ph = play("js/povhud.js"), po = play("js/possess.js"), cr = play("js/creature.js"), core = play("js/core.js");

console.log("1. the phone layout");
check("the top bar is squeezed to fit a phone", /max-width: 480px\) \{ \.hud \{ gap: 4px; \}[^\n]*\.lanternchip small \{ display: none; \}/.test(css) && /max-width: 400px\)/.test(css));
check("your smol's chip sits beside the map, not on it", /\.minechip \{ bottom: calc\(84px \+ var\(--sab\)\); left: calc\(108px \+ var\(--sal\)\)/.test(css));
check("toasts sit above the map and the chip", /\.toasts \{ top: auto; bottom: calc\(184px \+ var\(--sab\)\)/.test(css));
check("in a body, messages sit clear of the buttons", /#pov\.phone \.toast\{top:226px;bottom:auto/.test(ph));
check("in a chase or a duel the guide gets out of the banner's way", /#pov\.phone:has\(\.threat\.on\) \.quest\{display:none\}/.test(ph));
check("the menu's tabs are all on screen on a phone", /max-width: 699px\) \{ \.tabs \{ display: grid; grid-template-columns: repeat\(3/.test(css));

console.log("2. the menu");
const tabs = (ui.match(/var TABS = \[(.*?)\];/) || ["", ""])[1].match(/\["(\w+)"/g).map(s => s.slice(2, -1));
check("goals first, settings and help last, nothing lost", tabs[0] === "goals" && tabs.slice(-2).join() === "settings,help" && tabs.length === 12, tabs.join(" "));
check("it opens on goals", /menuTab: "goals"/.test(ui) && /state\.menuTab = tab \|\| "goals"/.test(ui));

console.log("3. words");
check("phone hints don't say “press F”", ph.indexOf('press F\\b/g, "$1tap the big button"]') > 0 && ph.indexOf('[/with F\\b/g, "with the big button"]') > 0);
check("the run hint knows a phone has no shift key", /push the stick all the way" : "hold shift"/.test(po));
check("the spire is called the beacon", /label: "the beacon"/.test(core) && !/label: "the big thought"/.test(core));
check("no “the the”", /def\.label\.replace\(\/\^the \/, ""\)/.test(cr));

seeded(4290, () => {
  const ctx = load();
  ["mine.js", "bosses.js", "possess.js"].forEach(f => { if (!(f === "mine.js" && ctx.SB.Mine) && !(f === "bosses.js" && ctx.SB.Bosses)) vm.runInContext(play("js/" + f), ctx, { filename: f }); });
  const SB = ctx.SB, P = SB.Possess, B = SB.Bosses; P.headless = true;
  const game = SB.Game.newGame(77); SB.Game.current = game; game.tutorial.done = true;
  SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod));
  game.time = SB.DAY_LENGTH * 2.3; game.stats.maxTier = 4;
  const me = SB.Game.smols(game)[0]; me.tier = 2; me.stage = 3;
  const s = B.place(game), e = s.list.gloom;
  for (let i = 0; i < 4; i++) B.tick(game, 0.6);
  const g = B.creature(game, B.LIST[0]);
  console.log("4. a captain has a name");
  check("Gloom is out there", !!g);
  if (g) {
    me.x = g.x + 1.5; me.z = g.z;
    P.enter(game, me, { free: true });
    const ref = { type: "creature", id: g.id };
    check("the label says Gloom, not “grump”", P.label(SB.Creature.resolve(game, ref)) === "Gloom", P.label(SB.Creature.resolve(game, ref)));
    check("and so does the button", /^hit Gloom/.test((P.options(game, me, ref).use || {}).label || ""), (P.options(game, me, ref).use || {}).label);
    P.leave();
  }
});

console.log("5. the story's next step leads the goals list");
check("captain and beacon lines are marked big", /light the beacon", "", false, 1\)/.test(ui) && /"tries: " \+ bn\.tries : "", false, 1\)/.test(ui));
check("big lines are drawn before “today”", ui.indexOf('class="g big"') > 0 && ui.indexOf('class="g big"') < ui.indexOf('class="head today"'));
check("in a body the beacon marker wins over the guide", /var bw = !chased && s && !s\.dead && !s\.goal && !s\.sniff && !s\.night && SB\.Game\.beaconWaiting/.test(ph));

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
