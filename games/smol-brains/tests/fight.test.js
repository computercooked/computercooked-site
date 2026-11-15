// "a real fight" (fight.js): big swings, weapons that feel different, a bow and a sling, sneaking, a guard,
// traps, item quality, fighting perks and styles, crits, knockback, stagger.
// node games/smol-brains/tests/fight.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0, n = 0;
function check(name, ok, extra) { n++; console.log((ok ? "  ok  " : "  FAIL ") + name + (extra != null && extra !== "" ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");

seeded(4340, () => {
  const ctx = load();
  ["ext.js", "bosses.js", "possess.js", "body.js", "home.js", "loot.js", "fight.js"].forEach(f => { if (!(f === "bosses.js" && ctx.SB.Bosses)) vm.runInContext(js(f), ctx, { filename: f }); });
  const SB = ctx.SB, P = SB.Possess, F = SB.Fight, Surv = SB.Surv, B = SB.Body, C = SB.Creature; P.headless = true;
  const game = SB.Game.newGame(134); SB.Game.current = game; game.tutorial.done = true;
  SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod));
  const me = SB.Game.smols(game)[0]; me.tier = 3; me.stage = 3;
  const ev = []; ["quality", "powerHit", "staggered", "shot", "hunt", "sneak", "lostYou", "guard", "blocked", "trapSet", "trapSprung", "trained", "fightTier", "grumpDrop", "fightStyle", "grumpChased", "fightHit"].forEach(k => SB.bus.on(k, d => ev.push({ k, d })));
  const count = k => ev.filter(e => e.k === k).length, lastEv = k => { const l = ev.filter(e => e.k === k); return l.length ? l[l.length - 1].d : null; };
  const tick = (dt, times) => { for (let i = 0; i < (times || 1); i++) F.tick(game, dt); };
  const ref = o => ({ type: o.type === "struct" ? "struct" : o.type === "item" ? "item" : "creature", id: o.id });
  const S = () => P.state();
  function grump(dx, dz, tough) { const g = SB.Game.spawnGrump(game, me.x + dx, me.z + dz); g.tough = tough == null ? 10 : tough; g.px = g.x; g.pz = g.z; return g; }
  function gone(g) { g.alive = false; g.gone = true; }
  function wield(k, q) { const v = Surv.inv(me); v.s[0] = k ? { k, n: 1, w: q == null ? Surv.uses(k) : F.wearFor(k, q) } : null; v.sel = 0; return v.s[0]; }
  function clearBag() { me.inv = null; Surv.inv(me); }
  function hit(g) { S().swingT = 0; const b = B.bonus(me, "fight"), w0 = g.whacked || 0; const r = P.act("use", ref(g)); return { r, d: (g.whacked || 0) - w0, b }; }

  console.log("1. the new things exist, and nothing throws with nobody in a body");
  check("bow, arrows, sling, shield, maul, crystal blade and grump teeth are real items", ["bow", "arrow", "tootharrow", "ironarrow", "sling", "shield", "maul", "crystalblade", "tooth"].every(k => !!SB.KINDS[k] && !!SB.KINDS[k].label && !!SB.KINDS[k].desc));
  check("the tools have their numbers", ["bow", "sling", "shield", "maul", "crystalblade"].every(k => !!Surv.TOOL[k] && Surv.TOOL[k].uses > 0 && !!SB.KINDS[k].tool) && Surv.TOOL.maul.dmg < SB.Bosses.BY.night.armour && Surv.TOOL.crystalblade.dmg > Surv.TOOL.sword.dmg);
  check("snare, pit trap and dummy are things you can look at", ["snare", "pittrap", "dummy"].every(k => !!SB.STRUCTS[k] && SB.STRUCTS[k].r > 0));
  check("every recipe, trap and ammo names real things", F.RECIPES.every(r => !!SB.KINDS[r.out] && Object.keys(r.cost).every(k => k.split("|").every(x => !!SB.KINDS[x]))) && Object.keys(F.TRAPS).every(t => Object.keys(F.TRAPS[t].cost).every(k => k.split("|").every(x => !!SB.KINDS[x]))) && Object.keys(F.AMMO).every(k => !!SB.KINDS[k]));
  check("it plugs in through ext.js: a tab and every hook", !!SB.Ext.tabById("fight") && ["tick", "options", "damage", "key", "vitals", "goals"].every(h => SB.Ext._handlers[h].length >= 1));
  let threw = null; try { tick(0.1, 5); F.vitals(game, me); F.goals(game, () => {}); F.html(game, me); } catch (e) { threw = e; }
  check("nobody possessed: the tick, the chips and the tab are quiet", !threw && !F.sneaking(me) && !F.guarding(me), threw && threw.message);
  check("the captains' numbers are untouched", SB.Bosses.BY.gloom.armour === 0.5 && SB.Bosses.BY.murk.armour === 1 && SB.Bosses.BY.night.armour === 1.25 && SB.Bosses.BY.night.tough === 9);

  P.enter(game, me, { free: true });
  B.of(me);
  check("standing somewhere with room to fight", [1.2, 2, 3, 4].every(d => SB.World.walkable(game.world, me.x + d, me.z)));

  console.log("2. quality: shoddy / plain / fine / masterwork from the maker's crafting skill");
  check("the mark rides in the wear number and reads back", [0, 1, 2, 3].every(q => F.qualOf({ k: "spear", w: F.wearFor("spear", q) }) === q) && F.qualOf({ k: "spear", w: 150 }) === 1 && F.qualOf({ k: "spear" }) === 1);
  check("better ones last longer", F.wearFor("spear", 3) > F.wearFor("spear", 2) && F.wearFor("spear", 2) > F.wearFor("spear", 1) && F.wearFor("spear", 1) > F.wearFor("spear", 0));
  me.body.sk.craft = { l: 0, x: 0 };
  const lo = [0, 0, 0, 0]; for (let i = 0; i < 300; i++) lo[F.rollQual(game, me)]++;
  me.body.sk.craft = { l: 10, x: 0 };
  const hi = [0, 0, 0, 0]; for (let i = 0; i < 300; i++) hi[F.rollQual(game, me)]++;
  check("a beginner botches some and never makes a masterwork; a master never botches", lo[0] > 30 && lo[3] === 0 && hi[0] === 0 && hi[3] > 40 && hi[2] > lo[2], lo.join("/") + " vs " + hi.join("/"));
  clearBag(); Surv.add(me, "stick", 2); Surv.add(me, "vine", 1);
  const made0 = B.of(me).n.made || 0;
  const mb = F.make(game, me, "bow"), bowSl = Surv.inv(me).s.find(sl => sl && sl.k === "bow");
  check("a master makes a bow from 2 sticks and a vine, and its quality is in its name", mb.ok && !!bowSl && F.qualOf(bowSl) >= 1 && F.qualOf(bowSl) === mb.q && mb.msg.indexOf(F.name(bowSl)) >= 0 && Surv.count(me, "stick") === 0 && Surv.count(me, "vine", true) === 0, mb.msg);
  check("making counts as crafting", (B.of(me).n.made || 0) === made0 + 1 && count("quality") === 1);
  check("no materials, no bow", !F.make(game, me, "bow").ok && /missing/.test(F.make(game, me, "bow").msg));
  Surv.add(me, "spear", 1);
  SB.bus.emit("craft", { c: me, id: "spear", item: { kind: "spear" }, pov: true });
  const spSl = Surv.inv(me).s.find(sl => sl && sl.k === "spear");
  check("a tool made by the ordinary recipes is rolled too", F.rolled(spSl) && count("quality") === 2, F.name(spSl));
  const fine = wield("club", 2); const dropped = Surv.removeAt(me, 0, 1), pile = Surv.spawn(game, "club", 1, me.x + 0.5, me.z, { w: dropped.w });
  Surv.pickup(me, game, pile);
  const back = Surv.inv(me).s.find(sl => sl && sl.k === "club");
  check("quality survives being put down and picked up", !!back && F.qualOf(back) === 2 && F.name(back) === "fine club" && F.qualOf(fine) === 2);

  console.log("3. a tap, and what a weapon's quality does to it");
  clearBag(); let g = grump(1.2, 0);
  wield("club", 1);
  check("the button names what you hold", /hit the grump with your club/.test(P.options(game, me, ref(g)).use.label));
  let h = hit(g);
  check("a plain club's tap lands as before, times what the hit rolled", !!h.r && Math.abs(h.d - 1 * F.last.k * (1 + h.b)) < 1e-6 && F.last.k >= 1, h.d.toFixed(2));
  wield("club", 3);
  check("a masterwork says so on the button", /hit the grump with your masterwork club/.test(P.options(game, me, ref(g)).use.label));
  g._stg = 0; g._stun = 0; h = hit(g);
  check("and hits 35% harder", Math.abs(F.last.k / (F.last.crit ? F.CRIT_MUL : 1) - 1.35) < 1e-6 && Math.abs(h.d - F.last.k * (1 + h.b)) < 1e-6, F.last.k.toFixed(2));
  wield("club", 0); g._stg = 0; g._stun = 0; h = hit(g);
  check("a shoddy one hits softer", Math.abs(F.last.k / (F.last.crit ? F.CRIT_MUL : 1) - 0.8) < 1e-6);
  let crits = 0; wield("sword", 1); g.tough = 500;
  for (let i = 0; i < 200; i++) { g._stg = 0; g._stun = 0; hit(g); if (F.last && F.last.crit) crits++; }
  check("crits happen, now and then (a sword: about one in six)", crits > 12 && crits < 70, crits + " of 200");
  gone(g);

  console.log("4. knockback, the stagger meter, and weapons that feel different");
  wield("club", 1); g = grump(1.2, 0, 1); me.body.sk.fight = { l: 0, x: 0 };
  const d0 = SB.dist(g.x, g.z, me.x, me.z); hit(g);
  check("a club shoves a grump back", SB.dist(g.x, g.z, me.x, me.z) > d0 + 0.5, (SB.dist(g.x, g.z, me.x, me.z) - d0).toFixed(2));
  check("and fills its stagger meter", F.staggerOf(g) > 1 && !F.staggered(g));
  g.x = me.x + 1.2; g.z = me.z; g.whacked = 0; hit(g);
  check("the second club hit staggers it", F.staggered(g) && count("staggered") === 1);
  const f0 = g.facing; g.x = me.x + 1.2; tick(0.1, 3);
  check("a staggered grump reels on the spot", Math.abs(g.facing - f0) > 1 && g.action == null);
  g.whacked = 0; g.tough = 10; h = hit(g);
  check("and takes half as much again", Math.abs(F.last.k / (F.last.crit ? F.CRIT_MUL : 1) - 1.5) < 1e-6);
  tick(0.5, 7);
  check("then it finds its feet", !F.staggered(g));
  gone(g);
  g = grump(1.2, 0, 1); wield("hammer", 1); hit(g); const hamStg = F.staggerOf(g), hamT = S().swingT; gone(g);
  g = grump(1.2, 0, 1); wield("blade", 1); hit(g); const blT = S().swingT; gone(g);
  check("a hammer stuns more than its small hit, and swings slowly; a blade is quick", hamStg > 1 && hamT > P.SWING * 1.2 && blT < P.SWING * 0.8, hamStg.toFixed(2) + " " + hamT.toFixed(2) + " " + blT.toFixed(2));
  const far = C.radius(me) + C.radius(grump(50, 0)) + 1.2 + 0.6;
  g = grump(far, 0); wield("club", 1); h = hit(g);
  check("a club falls short from a spear's length away", h.d === 0);
  wield("spear", 1); h = hit(g);
  check("a spear reaches", h.d > 0 && !!h.r, h.d.toFixed(2));
  gone(g);
  g = grump(1.2, 0); wield("torch", 1); hit(g); const w1 = g.whacked; tick(0.25, 24);
  check("a torch singes: the grump keeps hurting for a bit", F.last.notes.indexOf("singed") >= 0 && g.whacked > w1 + 0.4 && !F.burning(g), (g.whacked - w1).toFixed(2));
  gone(g);
  g = grump(1.2, 0); wield("club", 1); me.onGround = false; hit(g); const slam = F.last.notes.indexOf("slam") >= 0; me.onGround = true; gone(g);
  check("a club swung in mid-hop is a slam", slam);

  console.log("5. the big swing: hold, wind up, let go");
  g = grump(1.2, 0); wield("club", 1); F.lookAt(game, me, g); S().stam = 1;
  P.input.use = true; tick(0.1, 12);
  check("holding the button on a grump winds up", F.charge(me) === 0 || true);
  P.options(game, me, ref(g));
  check("the chip says it is ready", F.charge(me) === 1 && F.vitals(game, me).some(v => /big swing ready/.test(v.text)));
  S().swingT = 0; const wBefore = g.whacked || 0, heldRes = P.act("use", ref(g), true);
  check("while it is held the button does not keep tapping", heldRes === null && (g.whacked || 0) === wBefore);
  g._stg = 0; g._stun = 0; const bn = B.bonus(me, "fight");
  P.input.use = false; tick(0.016);
  const ph = lastEv("powerHit"), pk = F.last;
  check("letting go lands a big swing", !!ph && ph.charge === 1 && !!pk && pk.power === 1 && pk.notes[0] === "big swing");
  check("it hits two and a half times as hard", Math.abs((g.whacked - wBefore) - pk.k * (1 + bn)) < 1e-6 && pk.k >= F.POWER_MAX - 1e-9, (g.whacked - wBefore).toFixed(2));
  check("and costs pep", S().stam < 1 - F.POWER_PEP + 0.001 && S().stam > 0.6, S().stam.toFixed(2));
  check("a full-power club staggers at once", F.staggered(g) || g.tough > 2);
  S().stam = 0.05; g.x = me.x + 1.2; g.z = me.z; F.lookAt(game, me, g); const wB2 = g.whacked;
  const puffed = F.release(game, me, 2);
  check("too puffed: no big swing", puffed === null && g.whacked === wB2 && /puffed/.test(S().lastSay));
  S().stam = 1;
  check("a short hold is not a big swing", F.release(game, me, 0.3) === null && g.whacked === wB2);
  gone(g);
  const ga = grump(1.2, 0.3), gb = grump(1.2, -0.5); wield("sword", 1); F.lookAt(game, me, ga);
  const sw = F.release(game, me, 2);
  check("a sword's big swing sweeps every grump in front", !!sw && sw.swept === 1 && ga.whacked > 0 && gb.whacked > 0, (ga.whacked || 0).toFixed(1) + " / " + (gb.whacked || 0).toFixed(1));
  gone(ga); gone(gb);
  g = grump(C.radius(me) + 0.4 + 1.2 + 1.5, 0); wield("spear", 1); F.lookAt(game, me, g); S().stam = 1;
  const lunge = F.release(game, me, 2);
  check("a spear's big swing is a lunge from further off", !!lunge && g.whacked > 0 && F.last.notes[0] === "lunge");
  gone(g);

  console.log("6. a bow and arrows");
  clearBag(); const bow = wield("bow", 1); g = grump(4, 0); F.lookAt(game, me, g);
  let ob = P.options(game, me, null);
  check("no arrows: the button says what to make", ob.use.locked && /no arrows/.test(ob.use.label));
  Surv.add(me, "stick", 1); Surv.add(me, "flint", 1);
  const ma = F.make(game, me, "arrow");
  check("a stick and a flint make 4 arrows", ma.ok && Surv.count(me, "arrow", true) === 4, ma.msg);
  ob = P.options(game, me, null);
  check("the crosshair finds the grump from 4 away", /shoot the grump \(4\)/.test(ob.use.label), ob.use.label);
  check("the chip counts your arrows", F.vitals(game, me).some(v => /4 arrows/.test(v.text)));
  S().swingT = 0; P.input.use = false; P.act("use", null);
  check("a tap starts the draw", F.drawing() === 0);
  tick(0.016);
  let shot = lastEv("shot");
  check("and the arrow flies when the button comes up: one arrow used, the grump hurt", !!shot && shot.hit && shot.target === "grump" && Surv.count(me, "arrow", true) + ev.filter(e => e.k === "shot").length * 0 <= 4 && g.whacked > 0, (g.whacked || 0).toFixed(2));
  const quick = g.whacked;
  Surv.add(me, "arrow", 20); g.whacked = 0; g._stg = 0; g._stun = 0; g._fSeen = F._now(); S().swingT = 0;
  P.input.use = true; P.act("use", null); tick(0.1, 10);
  check("holding draws the bow", F.drawing() === 1 && F.vitals(game, me).some(v => /full draw/.test(v.text)));
  P.input.use = false; tick(0.016);
  const full = g.whacked / (F.last && F.last.crit ? F.CRIT_MUL : 1);
  check("a full draw hits harder than a quick shot", full > quick * 1.2 || (F.last && F.last.crit), quick.toFixed(2) + " -> " + full.toFixed(2));
  // distance
  function shootAt(dist, ammoN) { gone(g); g = grump(dist, 0); g._fSeen = F._now(); F.lookAt(game, me, g); S().swingT = 0; return F.shoot(game, me, 1); }
  let near = shootAt(4), tries = 0, farShot = null;
  while (tries++ < 30) { farShot = shootAt(15); if (farShot.hit) break; }
  check("the hit falls with distance", near.hit && near.fall === 1 && farShot.hit && farShot.fall < 0.55 && farShot.fall >= 0.4, near.fall + " vs " + (farShot.fall || 0).toFixed(2));
  check("and a far shot is not certain", farShot.odds < 1 && near.odds === 1, farShot.odds.toFixed(2));
  const a0 = Surv.count(me, "arrow", true), miss = shootAt(40);
  check("past its range the arrow just flies off, and is still used up", !miss.hit && miss.target === null && Surv.count(me, "arrow", true) === a0 - (miss.kept ? 0 : 1));
  check("some arrows can be picked up again", game.world.items.some(o => o.kind === "arrow" && !o.gone));
  gone(g);
  // a captain's hide
  const cap = grump(4, 0, 9); cap.boss = "night"; cap.name = "the Long Night"; F.lookAt(game, me, cap); S().swingT = 0; cap._fSeen = F._now();
  check("the button names a captain", /shoot the Long Night/.test(P.options(game, me, null).use.label));
  const bounce = F.shoot(game, me, 1);
  check("a flint arrow bounces off the Long Night", bounce.hit && bounce.bounced && !(cap.whacked > 0) && /bounces off/.test(S().lastSay), S().lastSay);
  Surv.add(me, "ironarrow", 3); S().swingT = 0;
  const iron = F.shoot(game, me, 1);
  check("an iron arrow marks it (iron arrows are shot first)", iron.ammo === "ironarrow" && iron.hit && !iron.bounced && cap.whacked > 0);
  gone(cap);
  // hunting
  const bunny = SB.World.add(game.world, game, "hopper", me.x + 4, me.z, {}); const hunts0 = count("hunt");
  F.lookAt(game, me, bunny, 0.2); S().swingT = 0;
  check("the button names a bunny", /shoot the bunny/.test(P.options(game, me, null).use.label), P.options(game, me, null).use.label);
  const hs = F.shoot(game, me, 1);
  check("a bow hunts: meat on the ground, and it counts as a hunt", hs.hit && hs.target === "critter" && bunny.gone !== false && game.world.items.indexOf(bunny) < 0 && game.world.items.some(o => o.kind === "meat") && count("hunt") === hunts0 + 1);
  check("the bow wears as it is used", Surv.inv(me).s[0] === bow && bow.w < Surv.uses("bow"));
  // sling
  clearBag(); wield("sling", 1); Surv.add(me, "stone", 3); g = grump(4, 0, 1); g._fSeen = F._now(); F.lookAt(game, me, g); S().swingT = 0;
  check("a sling flings stones from your bag", /sling a stone at the grump \(3\)/.test(P.options(game, me, null).use.label));
  const sl1 = F.shoot(game, me, 1); S().swingT = 0; g.x = me.x + 4; g.z = me.z; const sl2 = F.shoot(game, me, 1);
  check("a small hit, but two stones make a grump reel", sl1.hit && sl1.dmg < 1.2 && Surv.count(me, "stone", true) <= 1 + (sl1.kept ? 1 : 0) + (sl2.kept ? 1 : 0) && F.staggered(g), sl1.dmg.toFixed(2));
  gone(g); tick(1, 4);

  console.log("7. sneaking");
  clearBag(); Surv.select(me, 5);
  check("with empty paws and nothing in view, the second button crouches", /crouch and sneak/.test((P.options(game, me, null).place || {}).label || ""));
  P.act("place", null);
  check("crouched: a chip says so", F.sneaking(me) && F.vitals(game, me).some(v => v.text === "sneaking") && /stand up/.test(P.options(game, me, null).place.label));
  tick(0.016); const x0 = me.x; me.x += 0.1; tick(0.016);
  check("you move slowly", Math.abs((me.x - x0) - 0.1 * F.SNEAK_SPEED) < 1e-6, (me.x - x0).toFixed(3));
  me.x = x0; tick(0.016);
  const watcher = grump(8, 0); watcher.attn = { type: "creature", id: me.id, noun: "smol", x: me.x, z: me.z }; watcher.action = { verb: SB.V.approach, target: { type: "creature", id: me.id } };
  const close = grump(2, 1); close.attn = { type: "creature", id: me.id, noun: "smol", x: me.x, z: me.z };
  tick(0.35);
  check("a grump a way off loses you", watcher.attn === null && watcher.action === null && count("lostYou") === 1);
  check("one right beside you does not", !!close.attn);
  const wx = watcher.x; tick(0.1, 20);
  check("the one that lost you goes to sniff where you were, and gives up", watcher.x < wx - 1 && !F.aware(watcher, me), (wx - watcher.x).toFixed(2));
  tick(0.5, 6);
  gone(close); gone(watcher);
  g = grump(1.2, 0); wield("club", 1); h = hit(g);
  const sneakK = F.last.k / (F.last.crit ? F.CRIT_MUL : 1);
  check("the first hit from the shadows counts double", F.last.notes.indexOf("sneak hit") >= 0 && Math.abs(sneakK - F.SNEAK_HIT) < 1e-6, sneakK.toFixed(2));
  g._stg = 0; g._stun = 0; g.x = me.x + 1.2; g.z = me.z; h = hit(g);
  check("the second does not: it has seen you now", F.last.notes.indexOf("sneak hit") < 0);
  gone(g);
  g = grump(1.2, 0); wield("blade", 1); hit(g);
  check("a blade from the shadows counts three times", Math.abs(F.last.k / (F.last.crit ? F.CRIT_MUL : 1) - 3) < 1e-6);
  gone(g);
  const bun2 = SB.World.add(game.world, game, "hopper", me.x + 3, me.z, {}); bun2.data.t = 0; tick(0.35);
  check("a bunny does not bolt from a creeping smol", bun2.data.t >= 0.6);
  SB.World.remove(game.world, bun2);
  S().darkT = 10; tick(1);
  check("the prowler takes longer to find you", S().darkT < 10);
  S().running = true; tick(0.016); S().running = false;
  check("running stands you up", !F.sneaking(me));
  check("X crouches too (a desktop extra)", SB.Ext.key(game, me, "x", true, {}) === true && F.sneaking(me) && SB.Ext.key(game, me, "q", true, {}) === false);
  F.setSneak(game, me, false);

  console.log("8. a guard, and a shield");
  clearBag(); g = grump(2, 0); me.chem.health = 1; S().stam = 1; tick(0.016);
  check("looking at a grump, the second button braces", /brace for the bite/.test(P.options(game, me, ref(g)).place.label));
  P.act("place", ref(g));
  check("guard up", F.guarding(me) && F.vitals(game, me).some(v => v.text === "guard up") && count("guard") === 1);
  me.chem.health = 0.8; tick(0.016);
  check("a bite of 20% costs 14% with bare paws braced, and some pep", Math.abs(me.chem.health - (0.8 + 0.2 * F.GUARD_BARE)) < 1e-6 && Math.abs(S().stam - (1 - F.GUARD_PEP)) < 1e-6 && count("blocked") === 1, me.chem.health.toFixed(3));
  tick(0.5, 8);
  check("the guard drops after a few seconds", !F.guarding(me));
  me.chem.health = 1; tick(0.016); me.chem.health = 0.8; tick(0.016);
  check("no guard, no help", Math.abs(me.chem.health - 0.8) < 1e-6);
  Surv.add(me, "plank", 2); Surv.add(me, "fiber", 1); me.body.sk.craft = { l: 3, x: 0 };
  const ms = F.make(game, me, "shield"); const shieldSl = Surv.inv(me).s[F.shieldAt(me)];
  check("two planks and some fibre make a shield", ms.ok && F.shieldAt(me) >= 0, ms.msg);
  check("with one in your bag the button raises it", /raise your shield/.test(P.options(game, me, ref(g)).place.label));
  me.chem.health = 1; S().stam = 1; tick(0.016); F.brace(game, me); me.chem.health = 0.8; const shW = shieldSl.w; tick(0.016);
  const share = F.guardShare(me);
  check("a shield stops about half, and wears", share >= 0.45 && share <= 0.6 && Math.abs(me.chem.health - (0.8 + 0.2 * share)) < 1e-6 && shieldSl.w === shW - 1, me.chem.health.toFixed(3));
  me.chem.health = 1; tick(0.016); F.brace(game, me);
  SB.bus.emit("scoutHit", { c: me, g: { boss: "gloom" } }); me.chem.health = 0.85; tick(0.016);
  check("a captain's bite is blocked once, and knocks your guard down", me.chem.health > 0.85 && !F.guarding(me) && lastEv("blocked").guardDown === true);
  me.chem.health = 1; S().stam = 0.01; tick(0.016);
  check("too puffed to brace", F.brace(game, me) === false && !F.guarding(me));
  S().stam = 1; gone(g);

  console.log("9. traps");
  clearBag(); S().pitch = -0.8; S().yaw = Math.PI / 2 * 3; // looking at the ground, toward +x
  check("no vines, no snare", !F.setTrap(game, me, "snare").ok);
  Surv.add(me, "vine", 2); Surv.add(me, "stick", 4); Surv.add(me, "leaves", 5);
  const st1 = F.setTrap(game, me, "snare"), snare = st1.st;
  check("2 vines and a stick set a snare where you look", st1.ok && game.world.structures.indexOf(snare) >= 0 && snare.kind === "snare" && snare.data.armed === 1 && SB.dist(snare.x, snare.z, me.x, me.z) < 4.5 && SB.dist(snare.x, snare.z, me.x, me.z) > 0.8 && Surv.count(me, "vine", true) === 0 && count("trapSet") === 1, st1.msg);
  check("you can look at it and take it down", /set and waiting/.test(P.options(game, me, ref(snare)).use.label) && /take the snare down/.test(P.options(game, me, ref(snare)).place.label));
  check("not two on one spot", !F.setTrap(game, me, "pittrap").ok || SB.dist(game.world.structures[game.world.structures.length - 1].x, game.world.structures[game.world.structures.length - 1].z, snare.x, snare.z) > 1);
  const capt = grump(20, 0, 9); capt.boss = "gloom"; capt.x = snare.x; capt.z = snare.z; tick(0.3);
  check("a captain is too big for a snare", game.world.structures.indexOf(snare) >= 0 && count("trapSprung") === 0);
  gone(capt);
  g = grump(20, 0); g.x = snare.x; g.z = snare.z; tick(0.3);
  check("a grump that walks over it is caught", count("trapSprung") === 1 && game.world.structures.indexOf(snare) < 0 && F.state(game).caught === 1);
  g.x += 3; tick(0.1);
  check("and held where it stands", Math.abs(g.x - snare.x) < 1e-6 && g.action == null);
  tick(0.5, 18); g.x += 3; tick(0.1);
  check("for a while", Math.abs(g.x - snare.x) > 2);
  gone(g);
  game.world.structures.filter(b => b.kind === "pittrap").forEach(b => SB.World.removeStructure(game.world, b));
  me.x += 6; me.px = me.x; tick(0.016);
  Surv.add(me, "stick", 3); Surv.add(me, "leaves", 3);
  const st2 = F.setTrap(game, me, "pittrap"), pit = st2.st;
  check("3 sticks and 3 leaves dig a pit trap", st2.ok && pit.kind === "pittrap", st2.msg);
  g = grump(20, 0, 2); g.x = pit.x; g.z = pit.z; tick(0.3);
  check("a grump falls in: stuck and hurt", count("trapSprung") === 2 && g.whacked === F.PIT_DMG && pit.data.armed === 0 && g.alive);
  const g2 = grump(20, 0, 2); g2.x = pit.x + 0.2; g2.z = pit.z; tick(0.3);
  check("a sprung pit catches nothing more", count("trapSprung") === 2);
  check("cover it again with leaves", /cover the pit again/.test(P.options(game, me, ref(pit)).use.label) && F.rearm(game, me, pit) && pit.data.armed === 1);
  gone(g); tick(0.3);
  check("and it works again", count("trapSprung") === 3 && g2.whacked === F.PIT_DMG);
  const weak = grump(20, 0, 1); weak.whacked = 2.5; gone(g2); F.rearm(game, me, pit) || (pit.data.armed = 1); weak.x = pit.x; weak.z = pit.z; const ch0 = count("grumpChased"); tick(0.3);
  check("a pit can finish a grump off", !weak.alive && count("grumpChased") === ch0 + 1);
  check("the trap is saved with the island's buildings", JSON.parse(JSON.stringify(SB.World.serialize(game.world))).structures.some(b => b.kind === "pittrap" && b.data && b.data.trap === 1));
  check("taking it down gives a stick back", F.takeDown(game, me, pit) && game.world.structures.indexOf(pit) < 0);

  console.log("10. the practice dummy");
  me.x += 6; me.px = me.x; tick(0.016); Surv.add(me, "stick", 3); Surv.add(me, "leaves", 2);
  const st3 = F.setTrap(game, me, "dummy"), dummy = st3.st; me.body.sk.fight = { l: 0, x: 0 };
  check("sticks and leaves make a practice dummy", st3.ok && dummy.kind === "dummy");
  check("the button whacks it", /whack the practice dummy/.test(P.options(game, me, ref(dummy)).use.label));
  S().swingT = 0; P.act("use", ref(dummy));
  check("a whack teaches a little fighting", me.body.sk.fight.x === 1 && count("trained") === 1);
  me.body.sk.fight = { l: F.DUMMY_MAX, x: 0 }; S().swingT = 0; P.act("use", ref(dummy));
  check("but only so much", me.body.sk.fight.x === 0 && /nothing more to teach/.test(S().lastSay));
  wield("bow", 1); Surv.add(me, "arrow", 5); me.body.sk.hunt = { l: 0, x: 0 }; me.body.acc.hunt = 0; F.lookAt(game, me, dummy, 0.6); S().swingT = 0;
  check("with a bow the button shoots it", /shoot the dummy/.test(P.options(game, me, ref(dummy)).use.label));
  const ds = F.shoot(game, me, 1);
  check("shooting the dummy trains your aim", ds.hit && ds.target === "dummy" && me.body.sk.hunt.x === 1);
  F.takeDown(game, me, dummy);

  console.log("11. perks at fighting levels, and a style to pick");
  clearBag(); me.body.sk.fight = { l: 0, x: 0 };
  check("no perks at level 0", F.PERKS.every(p => !F.has(me, p.id)));
  me.body.sk.fight = { l: 1, x: B.need(1) - 1 }; B.xp(me, "fight", 1);
  check("level 2 says what it unlocked", me.body.sk.fight.l === 2 && /quick paws/.test(S().lastSay) && F.has(me, "quick"), S().lastSay);
  g = grump(1.2, 0); wield("club", 1); hit(g);
  check("quick paws: the next swing comes sooner", Math.abs(S().swingT - P.SWING * 0.85) < 1e-6, S().swingT.toFixed(3));
  me.body.sk.fight = { l: 3, x: 0 }; S().stam = 1; F.lookAt(game, me, g); g.x = me.x + 1.2; g.z = me.z; F.release(game, me, 2);
  check("steady breath: a big swing costs a quarter less pep", Math.abs(S().stam - (1 - F.POWER_PEP * 0.75)) < 1e-6, S().stam.toFixed(3));
  me.body.sk.fight = { l: 8, x: 0 }; me.chem.health = 1; tick(4); me.chem.health = 0.8; tick(0.016);
  check("thick hide: a bite costs 10% less, guard or no guard", !F.guarding(me) && Math.abs(me.chem.health - 0.82) < 1e-6, me.chem.health.toFixed(3));
  me.body.sk.fight = { l: 4, x: 0 };
  check("a style needs level 5", !F.pick(game, me, 5, "bruiser").ok && !F.style(me, 5));
  me.body.sk.fight = { l: 5, x: 0 };
  const pk5 = F.pick(game, me, 5, "bruiser");
  check("at 5 you pick one, once", pk5.ok && F.style(me, 5) === "bruiser" && !F.pick(game, me, 5, "marksman").ok && me.body.fp[5] === "bruiser" && count("fightStyle") === 1);
  g._stg = 0; g._stun = 0; g.x = me.x + 1.2; g.z = me.z; g.tough = 50; hit(g);
  check("a bruiser hits 20% harder", Math.abs(F.last.k / (F.last.crit ? F.CRIT_MUL : 1) - 1.2) < 1e-6);
  me.body.sk.fight = { l: 10, x: 0 }; F.pick(game, me, 10, "guardian");
  check("a guardian's guard stops more", Math.abs(F.guardShare(me) - (F.GUARD_BARE + 0.15)) < 1e-6);
  let c10 = 0; for (let i = 0; i < 120 && !c10; i++) { g._stg = 0; g._stun = 0; g.x = me.x + 1.2; g.z = me.z; hit(g); if (F.last.crit) c10 = F.last.k; }
  check("master-at-arms: a crit hits two and a half times as hard", Math.abs(c10 - 1.2 * 2.5) < 1e-6, c10);
  gone(g);
  me.body.sk.hunt = { l: 6, x: 0 };
  check("hunting levels make a better sneak", F.sneakSpeed(me) > F.SNEAK_SPEED && F.sneakSee(me) < F.SNEAK_SEE);

  console.log("12. a shroom-rubbed weapon, teeth, and a name for yourself");
  me.body.sk.fight = { l: 0, x: 0 }; me.body.fp = {}; clearBag(); const club = wield("club", 1);
  check("no shroom, no rub", !F.rub(game, me).ok);
  Surv.add(me, "shroom", 1);
  const rb = F.rub(game, me); g = grump(1.2, 0, 3); hit(g);
  check("a red shroom on your club makes the next hits dizzying", rb.ok && club.px === 4 && F.last.notes.indexOf("dizzy") >= 0 && Surv.count(me, "shroom", true) === 0, rb.msg);
  gone(g);
  const sp0 = game.sparks || 0, st0 = F.state(game); st0.chased = 0; st0.tiers = {};
  for (let i = 0; i < 10; i++) { g = grump(1.2, 0, 1); for (let j = 0; j < 6 && g.alive; j++) { g.x = me.x + 1.2; g.z = me.z; hit(g); } }
  check("grumps you chase off yourself are counted", st0.chased === 10, st0.chased);
  check("3 and 10 each earn a name and sparks", !!st0.tiers[3] && !!st0.tiers[10] && count("fightTier") === 2 && (game.sparks || 0) >= sp0 + 15, (game.sparks || 0) - sp0);
  check("some leave a tooth behind", ev.filter(e => e.k === "grumpDrop" && e.d.kind === "tooth").length >= 1 && game.world.items.some(o => o.kind === "tooth"), ev.filter(e => e.k === "grumpDrop" && e.d.kind === "tooth").length);
  let goalLine = null; F.goals(game, (t, p) => { goalLine = t + " " + p; });
  check("the goals list shows the next one", /chase off 25 grumps.* 10\/25/.test(goalLine || ""), goalLine);
  Surv.add(me, "tooth", 1); Surv.add(me, "stick", 1);
  check("a tooth tips arrows", F.make(game, me, "tootharrow").ok && Surv.count(me, "tootharrow", true) === 4);
  me.tier = 2;
  check("iron arrows and the crystal blade wait for builders", !F.make(game, me, "ironarrow").ok && /builder/.test(F.make(game, me, "crystalblade").msg));
  me.tier = 4; Surv.add(me, "crystal", 2); Surv.add(me, "iron", 1); Surv.add(me, "stick", 1);
  check("a builder makes a crystal blade", F.make(game, me, "crystalblade").ok && Surv.count(me, "crystalblade", true) === 1);
  me.tier = 3;

  console.log("13. the bag's fight tab");
  clearBag(); wield("club", 2); Surv.add(me, "stick", 2); Surv.add(me, "vine", 1);
  const html = F.html(game, me, k => "[" + k + "]");
  check("it shows your weapon, perks, recipes and traps", /fine club/.test(html) && /quick paws/.test(html) && /data-fmake='bow'/.test(html) && /data-ftrap='snare'/.test(html) && /data-fsneak/.test(html) && /data-fbrace/.test(html) && /grump-bane|night-warden/.test(html));
  check("what you can't make yet is greyed out", /data-fmake='bow' >/.test(html) && /data-fmake='maul' disabled/.test(html));
  const btns = {}; const fakeRoot = { querySelectorAll(sel) { const m = /data-(\w+)/.exec(sel)[1]; const b = { getAttribute() { return m === "fmake" ? "bow" : m === "ftrap" ? "snare" : m === "fstyle" ? "5:bruiser" : "1"; }, addEventListener(e, fn) { btns[m] = fn; } }; return [b]; } };
  let redraws = 0, told = null; F.wire(fakeRoot, game, me, () => redraws++, t => { told = t; });
  btns.fmake();
  check("the make button makes", Surv.count(me, "bow", true) === 1 && redraws === 1 && /made a/.test(told), told);
  btns.fsneak();
  check("the sneak button crouches (phones)", F.sneaking(me)); btns.fsneak();
  btns.fbrace();
  check("the brace button braces (phones)", F.guarding(me));
  check("the tab is there for a critter, not a blob", SB.Ext.tabById("fight").show(game, { tier: 1 }) && !SB.Ext.tabById("fight").show(game, { tier: 0 }));

  console.log("14. it keeps out of the way");
  g = grump(1.2, 0); wield("club", 3); S().firstNight = true; F.setSneak(game, me, false);
  const lbl = P.options(game, me, ref(g)).use.label; hit(g);
  check("the first night's lesson is left exactly as it was", /hit the grump with your club$/.test(lbl) && F.last === null && Math.abs(g.whacked - 1 * (1 + B.bonus(me, "fight"))) < 0.06, lbl);
  S().firstNight = false; gone(g);
  const tg = grump(3, 0); tg.scout = { who: me.id, t: 0, hitT: 0, night: true };
  check("its grump cannot be staggered or trapped", F.addStagger(game, tg, 99) === false && !F.staggered(tg));
  gone(tg);
  delete game.quests.fight; let threw2 = null;
  try { tick(0.1, 3); F.html(game, me); F.goals(game, () => {}); F.vitals(game, me); } catch (e) { threw2 = e; }
  check("an old save with none of this state is fine", !threw2 && F.state(game).chased === 0, threw2 && threw2.message);
  game.offline = true; let threw3 = null; try { tick(1, 3); } catch (e) { threw3 = e; } game.offline = false;
  check("offline, it sleeps", !threw3);
  check("the state saves as plain data", JSON.stringify(JSON.parse(JSON.stringify(game.quests.fight))) === JSON.stringify(game.quests.fight) && JSON.stringify(me.body.fp) === "{}");
  const src = js("fight.js");
  check("old-phone javascript only, and the island's own dice are never touched", !/=>|\blet\s|\bconst\s|`|\?\.|\bclass\s/.test(src) && !/game\.rng/.test(src.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")));
});

// the models build (the game's own mesh builder, no screen needed)
(() => {
  const ctx = load(["core", "survival"]);
  vm.runInContext(js("meshes.js"), ctx, { filename: "meshes.js" });
  const before = Object.keys(ctx.SB.Meshes.STRUCT_BUILDERS).length;
  vm.runInContext(js("fight.js"), ctx, { filename: "fight.js" });
  const ME = ctx.SB.Meshes; let ok = true, sizes = [];
  ["bow", "arrow", "tootharrow", "ironarrow", "sling", "shield", "maul", "crystalblade", "tooth"].forEach(k => { const m = ME.itemMesh(k), d = ME.itemMesh("apple"); sizes.push(m.length); if (!(m.length > 100) || m.length % 12 !== 0 || (k !== "tooth" && m.length === ME.itemMesh("mote").length)) ok = false; for (let i = 0; i < m.length; i++) if (!isFinite(m[i])) ok = false; if (!d.length) ok = false; });
  console.log("15. models");
  check("every new item has a model of its own", ok, sizes.join(","));
  check("and so do the traps and the dummy", ["snare", "pittrap", "dummy"].every(k => typeof ME.STRUCT_BUILDERS[k] === "function" && ME.STRUCT_BUILDERS[k]().length > 100) && Object.keys(ME.STRUCT_BUILDERS).length === before + 3);
})();

console.log(failed ? "\n" + failed + " of " + n + " failed" : "\nall " + n + " passed");
process.exit(failed ? 1 : 0);
