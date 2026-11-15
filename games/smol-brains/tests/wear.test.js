// One place for what a smol wears (wear.js). fight, harvest and powers each keep their own slots; this checks that
// they agree: one head, one body, one pair of feet, two charms, whoever puts a thing on, and one page to dress on.
// node games/smol-brains/tests/wear.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra != null && extra !== "" ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");
seeded(4350, () => {
  const ctx = load();
  ["ext.js", "bosses.js", "possess.js", "body.js", "home.js", "loot.js", "fight.js", "harvest.js", "powers.js", "wear.js"].forEach(f => { if (!(f === "bosses.js" && ctx.SB.Bosses)) vm.runInContext(js(f), ctx, { filename: f }); });
  const SB = ctx.SB, W = SB.Wear, F = SB.Fight, H = SB.Harvest, PW = SB.Powers, Surv = SB.Surv; SB.Possess.headless = true;
  const game = SB.Game.newGame(135); SB.Game.current = game; game.tutorial.done = true;
  SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod));
  const me = SB.Game.smols(game)[0]; me.tier = 4; me.stage = 3;
  const give = (k, n) => Surv.add(me, k, n || 1);
  const places = () => W.on(me).map(e => e.place + ":" + e.kind + "@" + e.sys).sort().join(" ");
  const head = () => W.on(me).filter(e => e.place === "head");

  console.log("1. it loads and plugs in");
  check("a wear tab, after the three systems", !!SB.Ext.tabById("wear"));
  check("nothing on: the page draws and says so", /nothing/.test(W.html(game, me)) && W.on(me).length === 0);
  check("every wearable has one owner and a place", Object.keys(SB.KINDS).filter(k => W.owner(k)).every(k => !!W.placeOf(k)), Object.keys(SB.KINDS).filter(k => W.owner(k) && !W.placeOf(k)).join(" "));
  const rs = W.recipes();
  check("the make list has each thing once, and every cost names real things", rs.length > 20 && new Set(rs.map(r => r.kind)).size === rs.length && rs.every(r => Object.keys(r.cost).every(k => k.split("|").every(x => !!SB.KINDS[x] || /^[a-z]+$/.test(x)))), rs.length);

  console.log("2. one head");
  give("furhat"); give("strawhat"); give("furcap");
  let r = W.putOn(game, me, "furhat");
  check("a fight hat goes on", r.ok && head().length === 1 && head()[0].kind === "furhat", r.msg);
  r = W.putOn(game, me, "strawhat");
  check("a harvest hat replaces it", r.ok && head().length === 1 && head()[0].kind === "strawhat", places());
  check("fight no longer counts the fur hat", !F.isWorn(me, "furhat"));
  r = W.putOn(game, me, "furcap");
  check("a powers cap replaces that, and the straw hat is back in the bag", r.ok && head().length === 1 && head()[0].kind === "furcap" && Surv.count(me, "strawhat", true) === 1, places());
  check("harvest no longer counts the straw hat", !H.worn(me, "strawhat"));

  console.log("3. whoever puts it on");
  r = H.putOn(game, me, "strawhat");
  check("dressing through harvest's own call still leaves one hat", r.ok && head().length === 1 && head()[0].kind === "strawhat" && Surv.count(me, "furcap", true) === 1, places());
  r = F.wear(game, me, "furhat");
  check("and through fight's", r.ok && head().length === 1 && head()[0].kind === "furhat", places());
  r = PW.putOn(game, me, "furcap");
  check("and through powers'", r.ok && head().length === 1 && head()[0].kind === "furcap", places());

  console.log("4. two charms, not five");
  ["sniffcharm", "shellcharm", "crystalcharm"].forEach(k => give(k));
  const fc = Object.keys(F.GEAR).find(k => F.GEAR[k].slot === "charm"); give(fc);
  W.putOn(game, me, "shellcharm"); W.putOn(game, me, "crystalcharm");
  check("two harvest charms are on", W.on(me).filter(e => e.place === "charm").length === 2, places());
  W.putOn(game, me, "sniffcharm");
  check("a third pushes one off", W.on(me).filter(e => e.place === "charm").length === 2 && W.has(me, "sniffcharm"), places());
  W.putOn(game, me, fc);
  check("a fight charm too", W.on(me).filter(e => e.place === "charm").length === 2 && W.has(me, fc), places());

  console.log("5. a thing two systems know counts for both");
  give("coppervest");
  r = W.putOn(game, me, "coppervest");
  check("the copper vest goes on through powers (its armour counts)", r.ok && PW.wearing(me, "body") === "coppervest" && PW.armour(me) >= 3, r.msg);
  check("and fight sees it in its cloak slot", F.wearing(me, "cloak") === "coppervest" && F.isWorn(me, "coppervest"));
  give("furboots"); W.putOn(game, me, "furboots");
  check("fur boots on through powers also count for harvest", PW.wearing(me, "feet") === "furboots" && H.worn(me, "furboots") > 0);

  console.log("6. off again, and the page");
  const n0 = W.on(me).length, b = W.on(me).find(e => e.place === "body");
  r = W.takeOff(game, me, b.sys, b.slot);
  check("take off gives it back", r.ok && W.on(me).length === n0 - 1 && Surv.count(me, "coppervest", true) === 1);
  const html = W.html(game, me, () => "");
  check("the page lists what is on with a take off button each", (html.match(/data-wroff=/g) || []).length === W.on(me).length, (html.match(/data-wroff=/g) || []).length + " / " + W.on(me).length);
  check("and offers what is in the bag", /data-wron='coppervest'/.test(html) && !/data-wron='furboots'/.test(html));
  check("a baby sees no make list", !/data-wrmake/.test((me.tier = 1, W.html(game, me, () => ""))) && (me.tier = 4));
  give("fur", 4); give("fiber", 4); give("vine", 4); give("leaves", 6);
  const can = rs.filter(x => !W.whyNot(game, me, x));
  check("with fur, fibre, vine and leaves some things can be made", can.length >= 3, can.map(x => x.kind).join(" "));
  const k = can[0].kind, had = Surv.count(me, k, true);
  r = W.make(game, me, k);
  check("making one puts it in the bag", r.ok && Surv.count(me, k, true) === had + 1, r.msg);
  check("fight's own page no longer offers wear buttons, powers' gear page no longer lists things to wear", !/data-fwear/.test(F.html(game, me, () => "")) && !/things to wear/.test(PW.PAGES2.find(p => p.id === "gear").html(game, me, () => "")) && /parts a healer fits/.test(PW.PAGES2.find(p => p.id === "gear").html(game, me, () => "")));
});
console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
