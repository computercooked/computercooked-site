// round 4: powers.js things a builder could not confirm headless, settled by reading the code.
// node games/smol-brains/tests/round4-powers.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra != null && extra !== "" ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");
function boot() {
  const ctx = load();
  ["embers.js", "possess.js", "body.js", "wilds.js", "mine.js", "bosses.js", "ext.js", "home.js", "loot.js", "powers.js"].forEach(f => { if (!(f === "bosses.js" && ctx.SB.Bosses)) vm.runInContext(js(f), ctx, { filename: f }); });
  return ctx;
}

seeded(4400, () => {
  const ctx = boot();
  const SB = ctx.SB, P = SB.Possess, PW = SB.Powers; P.headless = true;
  const game = SB.Game.newGame(133); SB.Game.current = game; game.tutorial.done = true;
  SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod));
  const pal = SB.Game.smols(game)[1];

  console.log("1. a new coat is seen by the renderers without a reload");
  // voxel.js (modelFor) and pixel.js (sheetFor) keep a smol's model / sheet while c.look is the same object
  game.sparks = 999;
  const look0 = pal.look, hue0 = look0.hue;
  const r = PW.buy(game, "relook", pal);
  check("the coat is bought and the hue is on the look", r && r.ok && pal.look.hue === pal.pw.hue);
  check("the look is a new object, so the cached model and sprite sheet are dropped", pal.look !== look0);
  check("the old look object was not changed in place", look0.hue === hue0);
  check("the body colours cache is dropped too", pal._cols == null);
  const look1 = pal.look;
  for (let t = 0; t < 3; t += 0.1) { game.time += 0.1; PW.tick(game, 0.1); }
  check("the slow tick does not make a new look every time (no rebuild each half second)", pal.look === look1);

  console.log("2. bigger markers and reduce flashing match what povhud.js draws today");
  const css = [], cls = {};
  ctx.document = { body: { classList: { toggle: (k, on) => { cls[k] = !!on; } } }, head: { appendChild: e => css.push(e.textContent) }, createElement: () => ({}) };
  PW.toggle(game, "bigMarks"); PW.toggle(game, "noFlash");
  const text = css.join("");
  const pov = fs.readFileSync(path.join(__dirname, "..", "src", "povhud.js"), "utf8");
  check("the style sheet went in and both body classes are on", text.length > 0 && cls["sb-bigmarks"] === true && cls["sb-noflash"] === true);
  check("povhud still draws the things the rules name", /"qmark"/.test(pov) && /"ouch"/.test(pov) && /classList\.add\("hit"\)/.test(pov) && /#pov \.vrow\.flash i/.test(pov));
  const base = /#pov \.qmark i\{[^}]*width:(\d+)px/.exec(pov), big = /sb-bigmarks #pov \.qmark i\{[^}]*width:(\d+)px/.exec(text);
  check("the big marker is really bigger than the plain one", !!base && !!big && +big[1] > +base[1], base && big ? base[1] + " -> " + big[1] : "");
  const home = /#pov \.qmark\.home i\{[^}]*width:(\d+)px/.exec(pov), bigHome = /sb-bigmarks #pov \.qmark\.home i\{[^}]*width:(\d+)px/.exec(text);
  check("the home marker does not shrink with bigger markers on", !!home && !!bigHome && +bigHome[1] > +home[1]);
  check("reduce flashing stills the red OUCH wash, the hit edge and the heart flash", /sb-noflash #pov \.ouch\{/.test(text) && /sb-noflash #pov \.edge\.hit/.test(text) && /sb-noflash #pov \.vrow\.flash i\{filter:none/.test(text));
  check("reduce flashing no longer hides the whole heart row (the old #pov .flash rule)", !/#pov \.flash\{/.test(text) && !/#pov \.hurt/.test(text) && !/opacity:0/.test(text));
});

if (failed) { console.log("\n" + failed + " FAILED"); process.exit(1); }
console.log("\nall ok");
