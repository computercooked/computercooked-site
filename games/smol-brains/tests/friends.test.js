// friends and characters (friends.js): gift tastes, hearts with every smol, commands by name, weddings, pranks,
// a life wish, traits from how a smol was raised, matchmaking, season festivals, moodlets.
// node games/smol-brains/tests/friends.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0, n = 0;
function check(name, ok, extra) { n++; console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");

seeded(4340, () => {
  const ctx = load();
  ["possess.js", "ext.js", "home.js", "friends.js"].forEach(f => vm.runInContext(js(f), ctx, { filename: f }));
  const SB = ctx.SB, P = SB.Possess, F = SB.Friends, Surv = SB.Survival || SB.Surv, D = SB.DAY_LENGTH; P.headless = true;
  const game = SB.Game.newGame(88); SB.Game.current = game; game.tutorial.done = true;
  SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod));
  const nest = game.world.T.nest;
  const mk = (name, sex, dx, dz, age) => { const c = SB.Game.spawnSmol(game, { name, sex, x: nest.x + dx, z: nest.z + dz, age: age == null ? 400 : age }); if (game.creatures.indexOf(c) < 0) game.creatures.push(c); c.tier = 3; return c; };
  const me = SB.Game.smols(game)[0]; me.tier = 3; me.stage = 3; me.x = nest.x + 6; me.z = nest.z + 6;
  const bo = mk("Bo", "f", 7, 6), cy = mk("Cy", "m", 8, 7), di = mk("Di", "f", 9, 5), kid = mk("Pup", "m", 5, 8, 70);
  const all = [bo, cy, di, kid];
  let ev = []; ["gift", "friendLevel", "friendTalk", "friendCommand", "fetched", "prank", "moment", "lifeWish", "trait", "party", "matched", "matchMet", "weddingStart", "wedding", "weddingBlessed", "festival", "festJoin", "festivalEnd", "friendGift", "hero", "friendTaught", "friendFought"].forEach(k => SB.bus.on(k, d => ev.push([k, d])));
  const got = k => ev.filter(e => e[0] === k);
  const run = (secs) => { for (let t = 0; t < secs; t += 0.5) { game.time += 0.5; F.tick(game, 0.5); } };
  const lookAt = c => ({ type: "creature", id: c.id });
  P.enter(game, me, { free: true });

  console.log("1. tastes");
  const kinds = Object.keys(SB.KINDS);
  check("every smol feels something about every thing, between hates and loves", all.every(c => kinds.every(k => { const t = F.taste(game, c, k); return t >= -2 && t <= 2 && t === Math.round(t); })));
  check("the same smol always feels the same", kinds.every(k => F.taste(game, bo, k) === F.taste(game, bo, k)));
  check("smols differ from each other", kinds.some(k => F.taste(game, bo, k) !== F.taste(game, cy, k)));
  check("each has one favourite thing, and loves it", all.every(c => SB.KINDS[F.favourite(game, c)] && F.taste(game, c, F.favourite(game, c)) === 2));
  const crowd = []; for (let i = 0; i < 40; i++) crowd.push({ id: 1000 + i, genome: bo.genome, species: "smol" });
  check("honey is loved by nearly all", crowd.filter(c => F.taste(game, c, "honey") === 2).length >= 28, crowd.filter(c => F.taste(game, c, "honey") === 2).length + "/40");
  check("a red shroom is liked by nobody much", crowd.filter(c => F.taste(game, c, "shroom") < 0).length >= 30);
  check("new things exist: a posy, a wedding knot, a festival ribbon", SB.KINDS.posy && SB.KINDS.knot && SB.KINDS.ribbon && SB.KINDS.posy.noun === "toy");

  console.log("2. giving, in a body");
  const fav = F.favourite(game, bo);
  check("nothing known to begin with, no hearts", Object.keys(F.known(game, bo)).length === 0 && F.hearts(game, bo) === 0);
  Surv.add(me, fav, 1); Surv.inv(me).sel = Surv.inv(me).s.findIndex(x => x && x.k === fav);
  let o = P.options(game, me, lookAt(bo));
  check("looking at a smol with a thing in hand: give it as a gift", /^give Bo your /.test(o.place.label) && /a gift/.test(o.place.label), o.place.label);
  check("and the third button asks it things", /^ask Bo/.test(o.pick.label));
  me.x = bo.x + 1; me.z = bo.z;
  check("giving its favourite", o.place.go() === true && Surv.count(me, fav, true) === 0);
  check("the taste is found out and remembered", F.known(game, bo)[fav] === 2 && got("gift").length === 1 && got("gift")[0][1].taste === 2);
  check("a loved gift is worth 80", F.points(game, bo) === 80, F.points(game, bo));
  check("it has a moodlet about it", F.moods(game, bo).some(m => m.id === "loved") && F.moodScore(game, bo) >= 2);
  check("and thinks better of the giver", SB.Social.reasons(game, bo, me).some(r => /favourite/.test(r.t)));
  Surv.add(me, fav, 1); Surv.inv(me).sel = Surv.inv(me).s.findIndex(x => x && x.k === fav);
  o = P.options(game, me, lookAt(bo));
  check("the button now says what it thinks of it", /loves it/.test(o.place.label), o.place.label);
  o.place.go();
  check("one gift a day counts", F.points(game, bo) === 80 && /one gift a day/.test(F._lastGift.msg));
  const hated = kinds.find(k => F.taste(game, cy, k) === -2 && k !== "plans");
  check("a hated gift costs hearts (never below nothing)", (() => { F.add(game, cy, 100); const r = F.gift(game, cy, hated, me); return r.taste === -2 && F.points(game, cy) === 60 && /hates/.test(r.msg); })());
  check("a hatch-day gift counts four times", (() => { di.born = game.time - SB.seasonDays(game) * 4 * D; const r = F.gift(game, di, F.favourite(game, di), me); return F.isHatchDay(game, di) && r.pts === 320 && r.bday; })(), F.points(game, di));

  console.log("3. the sky's hand");
  const kd = F.rec(game, kid);
  const apple = SB.World.add(game.world, game, "apple", kid.x, kid.z, {});
  SB.FirstHour.state(game).recent.push({ id: apple.id, type: "item", t: game.time });
  SB.Creature.carry(kid, apple, game, true);
  run(1);
  check("a thing the hand brought and a smol took is a gift from the sky", kd.k.apple != null && got("gift").some(e => e[1].sky && e[1].to === kid));
  const before = F.points(game, kid);
  SB.bus.emit("tickle", { c: kid }); SB.bus.emit("tickle", { c: kid });
  check("a tickle a day is a hello from the sky", F.points(game, kid) === before + 10);
  SB.bus.emit("wishGranted", { c: kid, w: {}, sparks: 1 });
  check("a granted wish is worth more, and is remembered", F.points(game, kid) === before + 60 && F.memories(game, kid).some(m => /wish/.test(m[1])));

  console.log("4. talking");
  o = P.options(game, me, lookAt(cy));
  const p0 = F.points(game, cy);
  check("the first chat of the day is worth a little", o.use.go() === true && F.points(game, cy) === p0 + 20 && got("friendTalk").length === 1);
  P.options(game, me, lookAt(cy)).use.go();
  check("the second is just a chat", F.points(game, cy) === p0 + 20 && got("friendTalk").length === 2 && !got("friendTalk")[1][1].first);
  check("it says something", typeof F.line(game, bo) === "string" && F.line(game, bo).length > 1 && cy.speech && cy.speech.text.length > 0);

  console.log("5. hearts and what they open");
  ev = [];
  F.add(game, bo, 2 * F.PER - F.points(game, bo));
  check("two hearts: it tells you its favourite", F.hearts(game, bo) === 2 && got("friendLevel").length === 2 && /favourite/.test(got("friendLevel")[1][1].text));
  check("the next unlock is following", F.nextUnlock(game, bo).at === 3 && /follow/.test(F.nextUnlock(game, bo).text));
  check("hearts read as ten", F.heartsText(game, bo).length === 10 && F.heartsText(game, bo).indexOf("♥♥♡") === 0);
  const sp0 = game.sparks;
  F.add(game, bo, 8 * F.PER);
  check("ten is the most; eight paid sparks, ten an ember (or sparks)", F.hearts(game, bo) === 10 && F.points(game, bo) === 2500 && got("friendLevel").length === 10 && game.sparks >= sp0 + 5);

  console.log("6. calling by name, and two-word commands");
  const stranger = mk("Zed", "m", 30, 30);
  check("a smol that doesn't know you won't follow", !F.command(game, me, stranger, "follow").ok && /3 ♥/.test(F.command(game, me, stranger, "follow").msg));
  bo.x = me.x + 12; bo.z = me.z;
  let r = F.command(game, me, bo, "come");
  check("come: it walks to you", r.ok && bo.action && bo.action.called && Math.abs(bo.action.tx - me.x) < 2);
  r = F.command(game, me, bo, "follow");
  check("follow me", r.ok && F.following(game, bo) && F.followers(game).length === 1);
  bo.action = null; me.x -= 10; run(1);
  check("it tags along when you move off", bo.action && bo.action.called && SB.dist(bo.action.tx, bo.action.tz, me.x, me.z) < 3);
  check("stay: it stops following and waits", F.command(game, me, bo, "stay").ok && !F.following(game, bo) && bo._frStay > game.time);
  const stick = SB.World.add(game.world, game, "stick", bo.x + 4, bo.z, {});
  check("it can see what's lying about", F.fetchables(game, bo).indexOf("stick") >= 0);
  const s0 = Surv.count(me, "stick", true);
  r = F.command(game, me, bo, "get", "stick");
  check("get stick: off it goes", r.ok && F.errands().length === 1 && /get stick/.test(r.msg));
  bo.x = stick.x; bo.z = stick.z; run(1);
  check("it picks the stick up", !SB.World.itemById(game.world, stick.id) && F.errands()[0].ph === "back");
  bo.x = me.x + 1; bo.z = me.z; run(1);
  check("and brings it to you", Surv.count(me, "stick", true) === s0 + 1 && got("fetched").length === 1 && F.errands().length === 0);
  check("no stick, no errand", !F.command(game, me, bo, "get", "crystal").ok);
  check("go home", F.command(game, me, bo, "home").ok && bo.action.called);
  F.add(game, cy, 2 * F.PER); cy.x = me.x + 5; cy.z = me.z + 3;
  check("call your friends: the ones who know you come", F.callAll(game, me).n >= 2);

  console.log("7. a friend at your side");
  F.command(game, me, bo, "follow");
  const grump = SB.Game.spawnGrump(game, me.x + 3, me.z + 1);
  bo.x = me.x + 1; bo.action = null; run(1);
  check("at six hearts a follower goes for a grump near you", F.fights(game, bo) && bo.action && bo.action.verb === SB.V.hit);
  grump.whacked = 0; SB.bus.emit("hit", { c: bo, target: grump, kind: "hit" });
  check("and its blows count", grump.whacked > 0 && got("friendFought").length === 1);
  for (let i = 0; i < 20; i++) SB.bus.emit("hit", { c: bo, target: grump, kind: "hit" });
  check("but the last blow is yours", grump.alive && grump.whacked < (SB.Threats ? SB.Threats.whacksNeeded(grump) : 3));
  di.x = me.x + 4; di.z = me.z; const dp = F.points(game, di);
  grump.alive = false; SB.bus.emit("grumpChased", { c: me, g: grump });
  check("chase a grump off and everyone who saw it remembers", F.points(game, di) === dp + 30 && F.moods(game, di).some(m => m.id === "saved") && got("hero").length === 1);
  F.unfollow(game, bo);

  console.log("8. what a friend teaches you");
  bo.ideas = bo.ideas || {}; bo.ideas.weave = 1; me.ideas = me.ideas || {}; delete me.ideas.weave;
  check("not before five hearts", !F.learnFrom(game, me, cy).ok);
  r = F.learnFrom(game, me, bo);
  check("a friend shows you something it knows", r.ok && (r.idea ? SB.Ideas.known(me, r.idea) : r.word ? SB.Creature.knows(me, r.word) : !!r.taste), r.msg);
  check("once a day", !F.learnFrom(game, me, bo).ok);

  console.log("9. pranks, jokes and little moments");
  ev = [];
  r = F.prank(game, cy, di, false);
  check("a prank is a moment both remember", r.ok && got("prank").length === 1 && cy.speech && di.speech && (di.ops[cy.id].m.some(m => /prank/.test(m[3]))));
  check("funny or not depends on who it is played on", r.funny === (SB.Social.reasons(game, di, cy).some(x => /funny/.test(x.t))));
  cy.genome.genes.playfulness = 0.95; cy.x = di.x + 2; cy.z = di.z;
  check("playful smols prank by themselves", !!F.autoPrank(game) && got("prank").length === 2);
  check("a kid has a silly seasonal moment", (() => { const m = F.moment(game, kid); return m && got("moment").length === 1 && F.moods(game, kid).some(x => x.id === "moment") && F.upbringing(kid).play >= 1; })());
  di.x = me.x + 2; di.z = me.z;
  r = F.social(game, me, di, "joke");
  check("you can tell a joke, dance and prank too", r.ok && F.social(game, me, di, "dance").ok && F.social(game, me, di, "prank").ok);
  check("too far away to dance", !F.social(game, me, stranger, "dance").ok);

  console.log("10. a life wish");
  const lw = F.lifeOf(game, cy);
  check("every smol has one, from its nature, not already done", lw && F.WISH[lw.def.id] && !lw.done && lw.n < lw.need && F.FOCUS[F.focus(game, cy)]);
  check("it is the same wish next time", F.lifeOf(game, cy).def.id === lw.def.id);
  cy.fr.life = { id: "fish" }; ev = [];
  for (let i = 0; i < 9; i++) SB.bus.emit("fish", { c: cy });
  check("progress is tracked", F.lifeOf(game, cy).n === 9 && !F.lifeCheck(game, cy));
  const sp1 = game.sparks, ls = cy.lifespan;
  SB.bus.emit("fish", { c: cy });
  check("the tenth fish: the wish comes true, and it pays", F.lifeCheck(game, cy) && F.lifeOf(game, cy).done && got("lifeWish").length === 1 && (got("lifeWish")[0][1].ember || game.sparks >= sp1 + 6));
  check("a full heart lives a little longer, and it only pays once", cy.lifespan > ls && !F.lifeCheck(game, cy));

  console.log("11. traits, from how it was raised");
  check("a little one has a quirk, not a trait", !F.trait(kid) && typeof F.quirk(kid) === "string");
  for (let i = 0; i < 12; i++) SB.bus.emit("hit", { c: kid, target: cy, kind: "shove" });
  check("what happens to a kid is counted", F.upbringing(kid).fight === 12 && F.upbringing(kid).tickle === 2);
  ev = []; kid.stage = 3; SB.bus.emit("grow", { c: kid });
  check("a scrappy kid grows up brave, with a party", F.trait(kid) === "brave" && got("trait")[0][1].announced && got("party").length === 1 && F.moods(game, kid).some(m => m.id === "bday"));
  kid.chem.fear = 0.6; F.visit(game, kid);
  check("brave: fear leaves it fast", kid.chem.fear < 0.5);
  SB.bus.emit("grow", { c: kid });
  check("one trait, for life", F.trait(kid) === "brave" && got("trait").length === 1);
  check("a grown smol from an old save gets its trait quietly", (() => { F.visit(game, stranger); return !!F.TRAITS[F.trait(stranger)]; })());
  check("a greedy smol likes any food", (() => { const c = { id: 7777, genome: bo.genome, species: "smol", fr: { trait: "greedy" } }; return ["apple", "berry", "meat", "fish"].every(k => F.taste(game, c, k) >= 1); })());

  console.log("12. matchmaking");
  cy.stage = 3; di.stage = 3; cy.partner = null; di.partner = null; cy.sex = "m"; di.sex = "f"; cy.parents = []; di.parents = [];
  check("only two free grown-ups", /partner|grown|family|friends/.test(F.matchWhy(game, cy, kid) + F.matchWhy(game, cy, stranger)) && F.matchWhy(game, cy, di) === "");
  check("the tab would offer a match", F.candidates(game, cy).indexOf(di) >= 0);
  cy.x = me.x + 10; di.x = me.x + 20; ev = [];
  r = F.match(game, cy, di);
  check("a nudge: both think of the other and set off to meet", r.ok && cy.chem.love >= 0.5 && di.chem.love >= 0.5 && cy.action.called && di.action.called && SB.Social.reasons(game, cy, di).some(x => /Lantern/.test(x.t)));
  check("one nudge a day", !F.match(game, cy, di).ok);
  cy.x = di.x + 1; cy.z = di.z; run(1);
  check("when they meet, a courting moment", got("matchMet").length === 1 && F.state(game).match == null);

  console.log("13. a wedding");
  ev = []; SB.Social.bond(game, cy, di);
  const w = F.wedding(game);
  check("new partners get a wedding, and the tribe is called", !!w && got("weddingStart").length === 1 && cy.action.called);
  o = P.options(game, me, lookAt(cy));
  check("in a body you can bless it", /bless the wedding/.test(o.pick.label) && o.pick.go() === true && w.bless === 1 && got("weddingBlessed").length === 1);
  [cy, di, bo, kid].forEach((c, i) => { c.x = w.x + i * 0.6; c.z = w.z; c.asleep = false; }); me.x = w.x + 3; me.z = w.z + 2;
  run(1);
  const wd = got("wedding")[0] && got("wedding")[0][1];
  check("the vows: guests, a blessing, and you were there", wd && wd.guests >= 2 && wd.blessed && wd.attended && wd.quality >= 4, wd && wd.word);
  check("you keep a wedding knot", Surv.count(me, "knot", true) === 1);
  check("the couple keep the day", cy.fr.keep.n === di.name && F.moods(game, di).some(m => m.id === "wed") && F.moods(game, bo).some(m => m.id === "guest"));
  check("it's in the chronicle", (game.chronicle || []).some(c => /wedding/.test(c[2])));
  run(F.WED_LEN + 2);
  check("and then it's over", F.wedding(game) == null);

  console.log("14. a festival on the first day of a season");
  ev = []; game.world.season = 1; SB.bus.emit("season", { season: "summer" });
  let fe = F.fest(game);
  check("summer: the big feast", fe && fe.k === 1 && got("festival").length === 1 && F.FESTS[1].id === "feast");
  me.x = fe.x + 40;
  check("not from across the island", !F.joinFest(game, me, null).ok);
  me.x = fe.x + 2; me.z = fe.z;
  Surv.add(me, "cooked", 1); Surv.inv(me).sel = Surv.inv(me).s.findIndex(x => x && x.k === "cooked");
  o = P.options(game, me, null);
  check("at the gathering there's a button for it", o.pick && /feast/.test(o.pick.label), o.pick && o.pick.label);
  const sp2 = game.sparks; bo.x = fe.x + 1; bo.z = fe.z; bo.chem.hunger = 0.6;
  check("bring cooked food: a great feast", o.pick.go() === true && Surv.count(me, "cooked", true) === 0 && got("festJoin")[0][1].grade === 2 && game.sparks >= sp2 + 5 && bo.chem.hunger < 0.6);
  check("one turn each", !F.joinFest(game, me, null).ok);
  run(F.FEST_LEN + 2);
  check("it ends, and those who came remember it", F.fest(game) == null && got("festivalEnd").length === 1 && F.moods(game, bo).some(m => m.id === "fest"));
  game.world.season = 0; F.startFest(game, 0); fe = F.fest(game); me.x = fe.x + 1; me.z = fe.z; bo.x = fe.x + 2; bo.z = fe.z;
  o = P.options(game, me, lookAt(bo));
  check("spring: dance with a friend, and take home a posy", /dance with Bo/.test(o.pick.label) && o.pick.go() === true && Surv.count(me, "posy", true) === 1);
  F.state(game).fest = null; F.startFest(game, 2); fe = F.fest(game);
  r = F.joinFest(game, me, null);
  check("autumn: the log-bonk has a score to beat", r.ok && fe.mine > 0 && fe.best > 0 && (fe.grade === 2) === (Surv.count(me, "ribbon", true) === 1));
  F.state(game).fest = null; F.startFest(game, 3); fe = F.fest(game);
  const who = SB.Game.byId(game, fe.who);
  r = F.joinFest(game, me, null);
  check("winter: you are told your secret friend", r.ok && who && r.msg.indexOf(who.name) >= 0 && !fe.done);
  r = F.gift(game, who, F.favourite(game, who), me);
  check("give them something they love and they give back", fe.done === 1 && fe.grade === 2 && /secret friend/.test(r.msg));
  F.state(game).fest = null;
  check("the tab knows when the next one is", F.nextFest(game).days > 0 && F.FESTS.indexOf(F.nextFest(game).def) >= 0);
  check("a posy can be tied by hand", (() => { Surv.add(me, "leaves", 2); Surv.add(me, "berry", 1); const c0 = Surv.count(me, "posy", true); return F.makePosy(game, me).ok && Surv.count(me, "posy", true) === c0 + 1 && !F.makePosy(game, me).ok; })());

  console.log("15. dawn");
  ev = []; game.time += D; // tomorrow
  const tries = []; for (let i = 0; i < 12 && !got("friendGift").length; i++) { game.time += D; SB.bus.emit("dawn", {}); tries.push(i); }
  check("a good friend leaves you a gift some mornings", got("friendGift").length >= 1, "after " + tries.length + " dawns");
  check("friends you ignore drift a little; a best friend never does", F.points(game, bo) === 2500 && F.points(game, di) < dp + 30 + 400);

  console.log("16. the tab, the goals and the save");
  F.focusOn(bo); me.x = bo.x + 1; me.z = bo.z;
  const html = F.html(game, me, () => "");
  check("the tab shows hearts, tastes, the life wish and what to ask", /hearts/.test(html) && /tastes/.test(html) && /life wish/.test(html) && /data-frcmd='follow'/.test(html) && /data-frsoc='joke'/.test(html) && /data-frcall=/.test(html));
  check("it lists what bo is known to love", html.indexOf(SB.KINDS[fav].label) >= 0 && /<b>loves<\/b>/.test(html));
  check("the bag has a friends tab", SB.Ext.tabById("friends") && SB.Ext.shownTabs(game, me).some(t => t.id === "friends") && /friends/.test(SB.Ext.tabById("friends").label(game, me)));
  check("moodlets show as chips in a body", (() => { F.mood(game, me, "fest"); return SB.Ext.vitals(game, me).some(v => /festival/.test(v.text)); })());
  check("the goals list gets no line with nothing on", (() => { const L = []; SB.Ext.goals(game, (t) => L.push(t)); return L.every(t => typeof t === "string"); })());
  const sv = JSON.parse(JSON.stringify(game.quests.friends)), cs = JSON.parse(JSON.stringify(bo.fr || {}));
  check("it's all in the save", sv.h[bo.id].p === 2500 && sv.h[bo.id].k[fav] === 2 && Array.isArray(sv.fol) && JSON.parse(JSON.stringify(kid.fr)).trait === "brave" && typeof cs === "object");
  P.leave();

  console.log("17. nothing breaks on an empty or an old island");
  const g2 = SB.Game.newGame(5); SB.Game.current = g2;
  let threw = null;
  try { F.tick(g2, 1); F.tick(g2, 1); SB.bus.emit("dawn", {}); SB.bus.emit("season", { season: "summer" }); SB.bus.emit("tickle", { c: null }); SB.bus.emit("give", {}); SB.bus.emit("grow", {}); SB.bus.emit("partners", {}); F.html(g2, { x: 0, z: 0, tier: 0, id: -1 }, null); SB.Ext.goals(g2, () => {}); g2.offline = true; F.tick(g2, 5); } catch (e) { threw = e; }
  check("a brand-new island with nobody on it, and nobody possessed", !threw, threw && threw.stack);
  check("no festival with fewer than three smols", F.fest(g2) == null);
  g2.offline = false; g2.quests = { ch: 0, done: {}, n: {}, friends: "junk" };
  check("a broken save is mended", (() => { try { return typeof F.state(g2).h === "object" && F.followers(g2).length === 0; } catch (e) { return false; } })());
  SB.Game.current = game;
});

console.log("18. the files");
const src = js("friends.js"), idx = fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8");
check("the game loads it after ext.js and before the hud", idx.indexOf("js/ext.js") < idx.indexOf("js/friends.js") && idx.indexOf("js/friends.js") < idx.indexOf("js/povhud.js"));
check("it never touches the island's own dice", !/game\.rng/.test(src));
check("old phones can run it (no arrows, let, const, classes, template strings)", !/=>|\b(let|const)\s+[\w$]+\s*[=;,]|\bclass\s+\w+\s*\{|`/.test(src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")));

console.log(failed ? "\n" + failed + " failed of " + n : "\nall " + n + " passed");
process.exit(failed ? 1 : 0);
