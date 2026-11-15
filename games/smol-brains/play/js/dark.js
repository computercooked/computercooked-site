/* smol brains: dark.js (built from src/dark.js by tools/strip.js: edit that file, not this one) */
(function () {
"use strict";
var SB = window.SB = window.SB || {};
var D = SB.Dark = {};
D.FIRST_DAY = 2;   // named grumps and raid shapes from this day
D.AGGRO = 7; D.LEASH = 22; D.LOSE_AT = 0.3; D.FIT = 0.5; D.REST = 12;
D.MERCY_MAX = 2;   // bad cards held back in a row for a hurting tribe; after that they come, softened
D.SCOUT_T = 80;    // seconds raid scouts watch before they report back
D.TRUCE_DAYS = 1.5; D.SIEGE_DAYS = 2; D.COLD_DAYS = 2; D.NAMED_NIGHTS = 2;
D.GIFTS_A_DAY = 2;
var K = SB.KINDS || (SB.KINDS = {}), SK = SB.STRUCTS || (SB.STRUCTS = {});
function kind(id, def) { if (!K[id]) K[id] = def; }
kind("duskshard", { noun: "material", label: "dusk shard", emoji: "🔹", r: 0.12, color: 0x7a6cff, mat: 1, glow: 1, desc: "a splinter of the light Gloom sat on. it grows at Gloom's old lair." });
kind("cinder", { noun: "material", label: "cinder", emoji: "🔸", r: 0.12, color: 0xff7a2a, mat: 1, glow: 1, desc: "a coal that never cools, from Murk's old lair. hold it and light a ward fire: grumps nearby run." });
kind("starmetal", { noun: "material", label: "star metal", emoji: "⭐", r: 0.13, color: 0xdfe8ff, mat: 1, glow: 1, desc: "what the Long Night was hoarding. the light forge makes a blade of it." });
kind("duskcharm", { noun: "toy", label: "dusk charm", emoji: "🧿", r: 0.12, color: 0x8f7bff, desc: "made at a well of light. in your bag, every hit on a grump lands a quarter harder." });
kind("warhorn", { noun: "toy", label: "grump horn", emoji: "📯", r: 0.15, color: 0x6a4a3a, desc: "Howl's horn. blow it and a war party comes when YOU are ready. beat it for a bigger thank-you." });
kind("lightblade", { noun: "tool", label: "light blade", emoji: "⚔️", r: 0.15, color: 0xfff2a0, tool: "whack", glow: 1, desc: "forged from all three captains' light. nothing hits harder." });
if (!SK.lightwell) SK.lightwell = { noun: "wonder", label: "well of light", emoji: "🕯", r: 0.6, cost: {}, work: 1, desc: "where a captain sat. rest here once a day, and forge what only its light can make." };
if (!SK.noticeboard) SK.noticeboard = { noun: "wonder", label: "notice board", emoji: "📜", r: 0.45, cost: {}, work: 1, desc: "the council's paid jobs. read it in a smol's body." };
function Sv() { return SB.Surv || SB.Survival; }
if (Sv() && Sv().TOOL && !Sv().TOOL.lightblade) Sv().TOOL.lightblade = { wood: 0.5, stone: 0, ore: 0, dmg: 2.5, uses: 900 };
D.LIFTS = {
gloom: { icon: "🌄", name: "the dusk lifts", ends: "one night grump in three now turns back at the edge of the light", opens: "dusk shards and glowshrooms grow where Gloom sat", item: "duskshard", n: 3, nodes: ["shroomtree", "herbs", "shroomtree"] },
murk: { icon: "🔥", name: "the fires remember", ends: "the village fires no longer die in the night", opens: "cinders and ore where Murk sat", item: "cinder", n: 3, nodes: ["orevein", "vent", "orevein"] },
night: { icon: "🌅", name: "the long night ends", ends: "no more dark suns or cold snaps, and war parties come a third smaller", opens: "star metal and thought crystals where the Long Night sat", item: "starmetal", n: 2, nodes: ["crystals", "crystals", "crystals"] }
};
D.FORGE = [
{ id: "duskcharm", lift: "gloom", cost: { duskshard: 2, vine: 1 }, perk: "every hit on a grump lands a quarter harder while it's in your bag." },
{ id: "torch", lift: "murk", cost: { cinder: 1, stick: 1 }, perk: "a torch lit from a cinder: no fire needed." },
{ id: "lightblade", lift: "night", cost: { duskshard: 1, cinder: 1, starmetal: 1, stick: 1 }, perk: "the three captains' light in one blade. nothing hits harder." }
];
D.FORGE_BY = {}; D.FORGE.forEach(function (f) { D.FORGE_BY[f.id] = f; });
D.NAMED = [
{ id: "snatch", name: "Snatch", icon: "🧺", twist: "steals from the village at night", tough: 1.6, dmg: 0.1, speed: 0.9, size: 1.15, pay: 6, tier: 2 },
{ id: "snuff", name: "Snuff", icon: "💨", twist: "puts out your fires", tough: 1.9, dmg: 0.12, speed: 0.8, size: 1.25, pay: 8, tier: 2 },
{ id: "howl", name: "Howl", icon: "📣", twist: "calls other grumps into the fight", tough: 1.7, dmg: 0.12, speed: 0.85, size: 1.2, pay: 10, tier: 3 },
{ id: "brag", name: "Brag", icon: "💪", twist: "mends as fast as you hit, unless you carry fire", tough: 3, dmg: 0.16, speed: 0.9, size: 1.5, pay: 16, tier: 3, after: 3 }
];
D.NAMED_BY = {}; D.NAMED.forEach(function (d) { D.NAMED_BY[d.id] = d; });
var SIEGER = { name: "a besieger", tough: 1.3, dmg: 0.1, speed: 0.85, size: 1.1 }, SCOUTG = { name: "a grump scout", tough: 1, dmg: 0.08, speed: 0.9, size: 0.9 };
D.TELLERS = [
{ id: "classic", icon: "📖", name: "the old tale", line: "the storyteller as it always was." },
{ id: "ember", icon: "🥁", name: "old ember", line: "builds trouble beat by beat, quicker each time, then lets you rest a long while." },
{ id: "moss", icon: "🌿", name: "auntie moss", line: "slow and kind. trouble comes half as often, and she is quick to mercy." },
{ id: "dice", icon: "🎲", name: "dice", line: "no plan at all. anything, any time, one thing on top of another." }
];
D.TELLER_BY = {}; D.TELLERS.forEach(function (t) { D.TELLER_BY[t.id] = t; });
D.FACTIONS = [
{ id: "grumps", icon: "👺", name: "the grumps", base: -40, ranks: [[-70, "at war", "war parties come bigger"], [-20, "enemies", "they raid when they can"], [10, "wary", "war parties come a third smaller"], [101, "truce", "no war parties, and no named grumps"]] },
{ id: "far", icon: "🧳", name: "the far tribe", base: 0, ranks: [[-20, "cold", "no caravans come"], [20, "strangers", "a caravan now and then"], [50, "friends", "caravans and healers come twice as often"], [101, "kin", "their fighters turn two raiders back on the road"]] },
{ id: "wild", icon: "🐾", name: "the wild smols", base: 0, ranks: [[-20, "hiding", "you never see them"], [15, "shy", "they watch from the trees"], [30, "curious", "they leave berries at the nest each dawn"], [101, "friends", "now and then one walks in and stays"]] }
];
D.FAC = {}; D.FACTIONS.forEach(function (f) { D.FAC[f.id] = f; });
D.ASKS = [["fish", 5, 6, 2], ["stick", 6, 3, 0], ["stone", 4, 3, 0], ["berry", 5, 3, 0], ["cooked", 2, 5, 2], ["herb", 2, 5, 1], ["fiber", 4, 4, 2]]; // kind, how many, pay, tier
D.PRIZES = [[3, "potion", 2, "two brews"], [6, "heartfruit", 1, "a heart-fruit"], [10, "starmetal", 1, "a lump of star metal"], [15, "warhorn", 1, "a grump horn"]];
D.PAGES = {
a1: ["the officer's trail, 1", "a scrap in a steady hand: “second officer, pod 9. if you can read this you are getting clever again. i hid what i saved where grumps don't look. start walking.”"],
a2: ["the officer's trail, 2", "scratched on a flat stone: “they hate a light. so i buried mine, and left marks for small careful people.”"],
a3: ["the officer's trail, 3", "a knot of faded cloth on a branch: “i am forgetting words. banana went first. keep going.”"],
a4: ["the officer's trail, 4", "a ring of pebbles: “nearly there. whoever you are, you counted to four. i am proud of you.”"],
a5: ["the officer's trail, 5", "under the last stone, a locker and a note: “this was the bridge lamp. it is yours. light it somewhere tall.”"],
b1: ["the grump who wasn't, 1", "in the named grump's sack, under the stolen things: a little carved smol toy, worn smooth from holding."],
b2: ["the grump who wasn't, 2", "scratched low on the wall where the grumps sat: names. short ones. smol names."],
b3: ["the grump who wasn't, 3", "the morning after your gift, something was left in its place: a string of shells, badly tied."],
b4: ["the grump who wasn't, 4", "they were smols once. their light went out and they have been cross about it ever since. a light can be lent."]
};
var LOST_NAMES = ["Bim", "Tolly", "Wren", "Dab", "Mossy", "Pib", "Nettle", "Oop"], CHIEFS = ["Gnash", "Thud", "Scowl", "Grub", "Mutter", "Stomp"];
function Q(game) { return game.quests || (game.quests = { ch: 0, done: {}, n: {} }); }
function st(game) {
var q = Q(game), s = q.dark;
if (!s || typeof s !== "object") s = q.dark = {};
if (!s.lift) s.lift = {};
if (!s.wells) s.wells = {};
if (!Array.isArray(s.posts)) s.posts = [];
if (!s.named) s.named = {};
if (!s.mercy) s.mercy = { n: 0, total: 0 };
if (!s.board || !Array.isArray(s.board.list)) s.board = { day: 0, list: [], seals: 0, prizes: 0, pay: "shells", nid: 1 };
if (!s.fac) { s.fac = {}; D.FACTIONS.forEach(function (f) { s.fac[f.id] = f.base; }); }
if (!s.raid) s.raid = { truce: 0, scouts: null, siege: null, escaped: 0, n: 0 };
if (!s.chain) s.chain = { a: { step: 0 }, b: {} };
if (!s.chain.a) s.chain.a = { step: 0 };
if (!s.chain.b) s.chain.b = {};
if (!Array.isArray(s.pages)) s.pages = [];
if (!s.n) s.n = {};
if (!s.gifts) s.gifts = { day: 0 };
return s;
}
D.state = st;
function cur() { return SB.Game && SB.Game.current; }
function day(game) { return Math.floor((game.time || 0) / SB.DAY_LENGTH) + 1; }
function home(game) { return SB.Society && SB.Society.home ? SB.Society.home(game, 0) : game.world.T.nest || game.world.T.spawn; }
function tribe(game) { return game.creatures.filter(function (c) { return c.alive && c.species === "smol" && !c.stranger; }); }
function topTier(game) { var t = (game.stats && game.stats.maxTier) || 0; tribe(game).forEach(function (c) { if (c.tier > t) t = c.tier; }); return t; }
function label(k) { return K[k] && K[k].label ? K[k].label : k; }
function r1(v) { return Math.round(v * 10) / 10; }
function r2(v) { return Math.round(v * 100) / 100; }
function hashKey(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function dice(game, key) { return SB.rng((hashKey(String(key)) ^ (game.seed >>> 0)) >>> 0); }
function dirOf(dx, dz) { var a = Math.atan2(dx, -dz) * 180 / Math.PI; a = (a + 360) % 360; return ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"][Math.round(a / 45) % 8]; }
function esc(s) { return String(s).replace(/[&<>"']/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]; }); }
function me() { var P = SB.Possess; return P && P.active && P.c && P.c.alive ? P.c : null; }
function dueling(g) { var P = SB.Possess; return !!(g && P && P.active && P.scout && P.scout() === g); }
function emit(name, d) { if (SB.bus) SB.bus.emit(name, d); }
function sparks(game, n, c) { if (SB.Game.addSparks) SB.Game.addSparks(game, n, c || null); }
function tell(game, text) {
if (!game || game.offline) return;
var P = SB.Possess;
if (P && P.active && P.say) { try { P.say(text); } catch (e) {} }
if (SB.Game.note) SB.Game.note(game, text);
}
D.open = function (game) { return !!game && !game.showcase && (!game.tutorial || game.tutorial.done || !!(game.tutorial.night && game.tutorial.night.done)); };
function spotAt(game, cx, cz, d0, d1, r, ang) {
var w = game.world, W = SB.World;
for (var t = 0; t < 40; t++) {
var a = ang != null && t < 16 ? ang + (r() - 0.5) * 1.1 : r() * 6.283, d = d0 + r() * (d1 - d0), x = cx + Math.sin(a) * d, z = cz + Math.cos(a) * d;
if (W.inBounds && !W.inBounds(w, x, z)) continue;
if (W.walkable && !W.walkable(w, x, z, false)) continue;
if (W.depthAt && W.depthAt(w, x, z) > 0.05) continue;
return { x: r1(x), z: r1(z) };
}
return null;
}
function drop(game, k, n, x, z) { if (K[k] && n > 0 && Sv() && Sv().spawn) Sv().spawn(game, k, n, x, z); }
function give(game, c, k, n) {
if (!K[k] || n <= 0) return;
var hm = home(game), left = c && c.alive && Sv() ? Sv().add(c, k, n) : n;
if (left > 0) drop(game, k, left, c && c.alive ? c.x + 0.5 : hm.x + 1.2, c && c.alive ? c.z + 0.4 : hm.z + 0.8);
}
function putStruct(game, kindId, x, z, key) {
var b = { id: SB.Game.newId(game), type: "struct", kind: kindId, noun: SK[kindId].noun, x: x, z: z, rot: (hashKey(key) % 628) / 100, s: 1, done: true, work: 0, need: {}, tribe: 0, builders: [], data: { dk: key }, born: game.time, name: null };
game.world.structures.push(b);
return b;
}
function findStruct(game, kindId, key) { var L = game.world.structures; for (var i = 0; i < L.length; i++) if (L[i].kind === kindId && L[i].data && L[i].data.dk === key) return L[i]; return null; }
function looseFood(game, take) {
var hm = home(game), n = 0, items = game.world.items || [];
for (var i = items.length - 1; i >= 0; i--) {
var o = items[i];
if (!o || o.gone || o.heldBy != null || o.noun !== "food" || (o.data && o.data.rotten) || SB.dist(o.x, o.z, hm.x, hm.z) > 18) continue;
var have = (o.data && o.data.n) || 1;
if (take == null) { n += have; continue; }
var t = Math.min(have, take - n); n += t;
if (t >= have) SB.World.remove(game.world, o); else o.data.n = have - t;
if (n >= take) break;
}
return n;
}
function fires(game, near) { var hm = home(game); return game.world.structures.filter(function (b) { return b.kind === "campfire" && b.done && b.data && (near == null || SB.dist(b.x, b.z, hm.x, hm.z) < near); }); }
function newcomer(game, x, z, kid, tag) {
var r = dice(game, tag + ":" + game.creatures.length + ":" + Math.round(game.time)), top = topTier(game);
var cap = (SB.Game.JOIN_CAP || SB.Game.POP_CAP || 99);
if (SB.Game.smols(game).length + 1 >= cap || !SB.Genome || !SB.Genome.forTier) return null;
var g = SB.Genome.forTier(r, Math.max(0, Math.min(4, top - 1)));
var c = SB.Game.spawnSmol(game, { genome: g, x: x, z: z, age: kid ? SB.STAGES[1].from + 5 : SB.STAGES[3].from + 60, gen: g.gen || 1, sex: r() < 0.5 ? "f" : "m", tribe: 0 });
if (!c) return null;
c.tribe = 0;
if (!kid && SB.Creature && SB.Creature.sendTo) { var hm = home(game); SB.Creature.sendTo(c, hm.x + 2, hm.z + 1, game, 60); }
return c;
}
D.standing = function (game, id) { var s = st(game); return s.fac[id] == null ? (D.FAC[id] ? D.FAC[id].base : 0) : s.fac[id]; };
D.rank = function (game, id) {
var f = D.FAC[id], v = D.standing(game, id);
for (var i = 0; i < f.ranks.length; i++) if (v < f.ranks[i][0]) return { i: i, key: f.ranks[i][1], does: f.ranks[i][2] };
var L = f.ranks[f.ranks.length - 1]; return { i: f.ranks.length - 1, key: L[1], does: L[2] };
};
D.hearts = function (game, id) { return Math.max(0, Math.min(5, Math.round((D.standing(game, id) + 100) / 40))); };
D.move = function (game, id, by, why) {
if (!D.FAC[id] || !by) return 0;
var s = st(game), was = D.rank(game, id);
s.fac[id] = Math.max(-100, Math.min(100, Math.round(D.standing(game, id) + by)));
var now = D.rank(game, id);
emit("standing", { id: id, v: s.fac[id], by: by, why: why || "", rank: now.key, was: was.key });
if (now.key !== was.key && why !== "drift") tell(game, D.FAC[id].icon + " " + D.FAC[id].name + " are now “" + now.key + "”: " + now.does);
return s.fac[id];
};
D.giftSpots = function (game, c) {
var out = [], s = st(game);
(game.sites || []).forEach(function (q) {
if (q.gone || !q.found) return;
if (q.kind === "camp" && !q.done && SB.dist(q.x, q.z, c.x, c.z) < 16 && !out.some(function (o) { return o.id === "grumps"; })) out.push({ id: "grumps", why: "at the grump camp" });
if (q.kind === "nest" && SB.dist(q.x, q.z, c.x, c.z) < 12 && !out.some(function (o) { return o.id === "wild"; })) out.push({ id: "wild", why: "at the wild nest" });
});
s.posts.forEach(function (p) { if (p.kind === "named" && SB.dist(p.x, p.z, c.x, c.z) < 12 && !out.some(function (o) { return o.id === "grumps"; })) out.push({ id: "grumps", why: "where " + p.name + " can see it" }); });
game.creatures.forEach(function (o) { if (o.alive && o.stranger && o.stranger.state !== "leaving" && SB.dist(o.x, o.z, c.x, c.z) < 5 && !out.some(function (q) { return q.id === "far"; })) out.push({ id: "far", why: "to " + o.name }); });
return out;
};
function foodSlot(c) {
var v = Sv().inv(c), held = Sv().held ? Sv().held(c) : null;
function plain(k) { return Sv().edible(k) && K[k].noun === "food" && k !== "heartfruit"; } // never your medicine or a heart-fruit
if (held && plain(held.k)) return held.k;
for (var i = 0; i < v.s.length; i++) if (v.s[i] && plain(v.s[i].k)) return v.s[i].k;
return null;
}
D.gift = function (game, c, id) {
var s = st(game), f = D.FAC[id];
if (!f || !c) return { ok: false, msg: "" };
if (!D.giftSpots(game, c).some(function (o) { return o.id === id; })) return { ok: false, msg: id === "grumps" ? "leave it at a grump camp, or where a named grump can see it" : id === "wild" ? "leave it at a wild nest" : "there's nobody here to give it to" };
if (s.gifts.day !== day(game)) s.gifts = { day: day(game) };
if ((s.gifts[id] || 0) >= D.GIFTS_A_DAY) return { ok: false, msg: "enough for one day. " + f.name + " need time to think about it" };
var k = foodSlot(c);
if (!k) return { ok: false, msg: "you need some food to give" };
Sv().take(c, k, 1);
s.gifts[id] = (s.gifts[id] || 0) + 1; s.n.gifts = (s.n.gifts || 0) + 1;
D.move(game, id, 6, "gift");
emit("darkGift", { c: c, id: id, kind: k });
if (id === "grumps" && !s.chain.b.gift) { s.chain.b.gift = day(game); }
return { ok: true, msg: "🎁 you leave " + label(k) + " for " + f.name + ". (" + D.rank(game, id).key + ")" };
};
D.hasPage = function (game, id) { return st(game).pages.some(function (p) { return p.id === id; }); };
function page(game, id) {
var s = st(game);
if (!D.PAGES[id] || D.hasPage(game, id)) return false;
s.pages.push({ id: id, day: day(game) });
emit("darkPage", { id: id, title: D.PAGES[id][0], text: D.PAGES[id][1] });
tell(game, "📜 " + D.PAGES[id][0] + ": " + D.PAGES[id][1]);
return true;
}
function trailTarget(game, step) {
var a = st(game).chain.a, hm = home(game), r = dice(game, "officer" + step);
var p = spotAt(game, hm.x, hm.z, 20 + step * 5, 28 + step * 6, r, null) || { x: r1(hm.x + 24), z: r1(hm.z + 6) };
a.step = step; a.x = p.x; a.z = p.z;
}
D.startTrail = function (game) { var a = st(game).chain.a; if (a.step !== 0) return false; page(game, "a1"); trailTarget(game, 1); return true; };
D.trailHint = function (game) {
var a = st(game).chain.a, hm = home(game);
if (!(a.step >= 1 && a.step <= 4)) return "";
return "about " + Math.max(5, Math.round(SB.dist(a.x, a.z, hm.x, hm.z) / 5) * 5) + "m " + dirOf(a.x - hm.x, a.z - hm.z) + " of the nest";
};
function trailStep(game, c) {
var s = st(game), a = s.chain.a;
if (!(a.step >= 1 && a.step <= 4) || SB.dist(c.x, c.z, a.x, a.z) > 4) return false;
var step = a.step;
page(game, "a" + (step + 1));
sparks(game, 2, c);
if (step < 4) { trailTarget(game, step + 1); return true; }
a.step = 5; a.day = day(game);
if (SB.Loot && SB.Loot.place && SB.Loot.TABLES && SB.Loot.TABLES.pod) SB.Loot.place(game, "dark-officer", "pod", a.x, a.z);
else { drop(game, "metal", 2, a.x + 0.6, a.z); drop(game, "potion", 1, a.x - 0.6, a.z); }
if (SB.Embers && SB.Embers.add) SB.Embers.add(game, "dark-officer", "the officer's bridge lamp, found at the end of the trail", c);
sparks(game, 10, c);
emit("darkChain", { id: "a", c: c });
return true;
}
function grumpStory(game, c) {
var s = st(game), b = s.chain.b;
if (b.named) page(game, "b1");
if (b.wall) page(game, "b2");
if (b.gift && b.gift < day(game) && page(game, "b3")) { var hm = home(game); if (c) c.purse = r2((c.purse || 0) + 3); else sparks(game, 2); drop(game, "berry", 1, hm.x + 1, hm.z - 1); }
if (!b.done && D.hasPage(game, "b1") && D.hasPage(game, "b2") && D.hasPage(game, "b3") && page(game, "b4")) {
b.done = day(game);
if (SB.Embers && SB.Embers.add) SB.Embers.add(game, "dark-grump", "you learned what the grumps were", c || null);
sparks(game, 8, c);
D.move(game, "grumps", 10, "understood");
emit("darkChain", { id: "b", c: c || null });
}
}
D.lifted = function (game, id) { return !!(game && game.quests && game.quests.dark && game.quests.dark.lift && game.quests.dark.lift[id]); };
D.wellOf = function (game, id) { return findStruct(game, "lightwell", "well-" + id); };
D.lift = function (game, id, x, z, quiet) {
var s = st(game), L = D.LIFTS[id];
if (!L || s.lift[id]) return false;
s.lift[id] = day(game);
var r = dice(game, "lift-" + id);
L.nodes.forEach(function (nk, i) { var p = spotAt(game, x, z, 2.5, 6, r, i * 2.1); if (p && SB.World.addNode) { try { SB.World.addNode(game.world, game, nk, p.x, p.z, 0.9 + r() * 0.3); } catch (e) {} } });
for (var i = 0; i < L.n; i++) { var q = spotAt(game, x, z, 1.2, 3.5, r, null); drop(game, L.item, 1, q ? q.x : x + 1 + i * 0.4, q ? q.z : z + 1); }
var wp = spotAt(game, x, z, 0, 1.2, r, null) || { x: r1(x), z: r1(z) };
if (!D.wellOf(game, id)) putStruct(game, "lightwell", wp.x, wp.z, "well-" + id);
s.wells[id] = { x: wp.x, z: wp.z, last: 0 };
if (SB.World.reveal) SB.World.reveal(game.world, x, z, 10);
emit("darkLift", { id: id, lift: L, x: x, z: z });
if (!quiet) tell(game, L.icon + " " + L.name + ": " + L.ends + ". " + L.opens + ", and a well of light stands there now.");
return true;
};
D.rest = function (game, c, b) {
var id = b && b.data && b.data.dk ? String(b.data.dk).replace("well-", "") : null, s = st(game), w = id ? s.wells[id] || (s.wells[id] = { x: b.x, z: b.z, last: 0 }) : null, L = D.LIFTS[id];
if (!w || !L) return { ok: false, msg: "" };
if (SB.dist(c.x, c.z, b.x, b.z) > 4) return { ok: false, msg: "get closer" };
if (w.last === day(game)) return { ok: false, msg: "🕯 the well is resting. it fills again at dawn" };
w.last = day(game); s.n.rests = (s.n.rests || 0) + 1;
c.chem.health = 1; if (c.chem.pain != null) c.chem.pain = 0; if (c.chem.tired != null) c.chem.tired = Math.min(c.chem.tired, 0.2);
give(game, c, L.item, 1);
if (!s.chain.b.wall) s.chain.b.wall = day(game);
D.startTrail(game);
grumpStory(game, c);
emit("darkRest", { c: c, id: id });
return { ok: true, msg: "🕯 you rest in the light: every heart back, and it leaves you a " + label(L.item) };
};
D.atWell = function (game, c) { var ok = false; game.world.structures.forEach(function (b) { if (b.kind === "lightwell" && SB.dist(b.x, b.z, c.x, c.z) <= 6) ok = true; }); return ok; };
D.forgeWhy = function (game, c, id) {
var f = D.FORGE_BY[id];
if (!f || !K[id]) return "no such thing";
if (!D.lifted(game, f.lift)) return "its light is still with a captain";
if (!D.atWell(game, c)) return "the light forge is at a well of light";
if (c.tier < 2) return "it takes hands: a tool-user and up";
for (var k in f.cost) if (Sv().count(c, k, true) < f.cost[k]) return "it needs " + D.costText(f);
return "";
};
D.costText = function (f) { var out = []; for (var k in f.cost) out.push(f.cost[k] + " " + label(k)); return out.join(", "); };
D.forge = function (game, c, id) {
var why = D.forgeWhy(game, c, id), f = D.FORGE_BY[id];
if (why) return { ok: false, msg: why };
for (var k in f.cost) Sv().take(c, k, f.cost[k]);
give(game, c, id, 1);
emit("darkForged", { c: c, id: id });
return { ok: true, msg: K[id].emoji + " a " + label(id) + "! " + f.perk };
};
D.ward = function (game, c) {
if (!Sv().count(c, "cinder", true)) return { ok: false, msg: "no cinder" };
Sv().take(c, "cinder", 1);
var n = 0;
game.creatures.forEach(function (g) {
if (!g.alive || g.species !== "grump" || g.boss || SB.dist(g.x, g.z, c.x, c.z) > 12) return;
if (g.dark && postOf(game, g.dark)) return; // a posted grump stands its ground
g.chem.fear = 1; g.goingHome = true; g.raider = null; if (g.scout && !dueling(g)) g.scout.done = true; n++;
});
game.world.structures.forEach(function (b) { if (b.kind === "campfire" && b.done && b.data && !b.data.lit && SB.dist(b.x, b.z, c.x, c.z) < 6) { b.data.fuel = Math.max(b.data.fuel || 0, 0.6); b.data.lit = true; } });
if (SB.FX && SB.FX.burst) { try { SB.FX.burst("embers", c.x, (c.y || 0) + 1, c.z, 30, { r: 2 }); } catch (e) {} }
emit("darkWard", { c: c, n: n });
return { ok: true, msg: "🔥 a ward fire flares up" + (n ? ": " + n + (n === 1 ? " grump runs" : " grumps run") + " for it" : ". nothing was near, but it felt good") };
};
D.blowHorn = function (game, c) {
var DR = SB.Director, s = st(game);
if (!Sv().count(c, "warhorn", true)) return { ok: false, msg: "no horn" };
if (!DR || !DR.fire) return { ok: false, msg: "nothing answers" };
if (DR.state(game).active) return { ok: false, msg: "not now: the island already has its hands full" };
s.raid.truce = 0; s.raid.scouts && endScouts(game, true);
var inc = DR.fire(game, "raid");
if (!inc) return { ok: false, msg: "the horn echoes off the hills. nothing answers (the grumps are not ready)" };
Sv().take(c, "warhorn", 1);
inc.dkDare = true;
emit("darkHorn", { c: c, inc: inc });
return { ok: true, msg: "📯 the horn carries a long way. a war party is coming: step back to the sky to meet it. beat it for a bigger thank-you" };
};
function postOf(game, key) { var L = st(game).posts; for (var i = 0; i < L.length; i++) if (L[i].key === key) return L[i]; return null; }
D.postOf = postOf;
function postDef(p) { return p.kind === "beast" && D.beastDef ? D.beastDef(p) : p.kind === "named" ? D.NAMED_BY[p.nid] : p.kind === "siege" ? SIEGER : SCOUTG; }
function postGrump(game, p) { var g = p.cid != null ? SB.Game.byId(game, p.cid) : null; return g && g.alive && g.species === "grump" && g.dark === p.key ? g : null; }
D.grumpOf = function (game, key) { var p = postOf(game, key); return p ? postGrump(game, p) : null; };
function holdScout(def, p) { return { who: null, t: 0, hitT: 0, hold: true, speedK: def.speed, dmg: def.dmg, dark: p.key }; }
function spawnPost(game, p) {
var def = postDef(p), g = SB.Game.spawnGrump(game, p.x, p.z);
g.name = p.name; g.dark = p.key; g.tough = def.tough; g.whacked = p.hurt || 0;
if (g.look) g.look.size = (g.look.size || 1) * def.size;
g.scout = holdScout(def, p);
p.cid = g.id;
return g;
}
function addPost(game, p) { var s = st(game); if (postOf(game, p.key)) return postOf(game, p.key); p.day = day(game); p.hurt = 0; p.rest = 0; s.posts.push(p); spawnPost(game, p); return p; }
function dropPost(game, p, how) {
var s = st(game), g = postGrump(game, p), P = SB.Possess;
if (g) {
if (dueling(g) && P.endScout) P.endScout(null, 0, how || "gone");
if (how !== "beaten") { if (g.scout) g.scout.done = true; g.goingHome = true; g.dark = null; }
}
if (p.packs) { p.packs.forEach(function (id) { var o = SB.Game.byId(game, id); if (o && o.alive) { if (o.scout) o.scout.done = true; o.goingHome = true; } }); p.packs = null; }
s.posts = s.posts.filter(function (o) { return o !== p; });
}
function need(def) { return SB.Threats && SB.Threats.whacksNeeded ? SB.Threats.whacksNeeded({ tough: def.tough }) : Math.max(3, Math.round(3 * def.tough)); }
D.hp = function (game, key) { var p = postOf(game, key), g = p ? postGrump(game, p) : null; return g ? Math.max(0, 1 - (g.whacked || 0) / need(postDef(p))) : 0; };
D.namedOut = function (game) { return st(game).posts.filter(function (p) { return p.kind === "named"; }); };
D.nextNamed = function (game) {
var s = st(game), top = topTier(game), beat = SB.Bosses && SB.Bosses.beaten ? SB.Bosses.beaten(game) : 0, d = day(game);
var pool = D.NAMED.filter(function (n) { return n.tier <= top && (n.after || 0) <= beat && !postOf(game, "named-" + n.id) && !(s.named[n.id] && s.named[n.id].day >= d); });
if (!pool.length) return null;
pool.sort(function (a, b) { return ((s.named[a.id] && s.named[a.id].n) || 0) - ((s.named[b.id] && s.named[b.id].n) || 0); });
var least = (s.named[pool[0].id] && s.named[pool[0].id].n) || 0, low = pool.filter(function (n) { return ((s.named[n.id] && s.named[n.id].n) || 0) === least; });
return low[Math.floor(dice(game, "named" + d)() * low.length)] || low[0];
};
D.namedOk = function (game) { return D.open(game) && day(game) >= D.FIRST_DAY && topTier(game) >= 2 && D.rank(game, "grumps").key !== "truce" && !(SB.Embers && SB.Embers.woke && SB.Embers.woke(game)); };
D.spawnNamed = function (game, id) {
var def = D.NAMED_BY[id], hm = home(game);
if (!def || postOf(game, "named-" + id)) return null;
var camp = (game.sites || []).filter(function (q) { return q.kind === "camp" && q.found && !q.done && !q.gone; })[0], r = dice(game, "post-" + id + day(game));
var at = camp ? spotAt(game, camp.x, camp.z, 2, 5, r, null) : null;
if (!at) { camp = null; at = spotAt(game, hm.x, hm.z, 18, 26, r, null); }
if (!at) return null;
var p = addPost(game, { key: "named-" + id, kind: "named", nid: id, name: def.name, x: at.x, z: at.z, camp: camp ? camp.id : null, stolen: [], calls: 0 });
D.refresh(game, true);
emit("darkNamed", { def: def, post: p });
tell(game, def.icon + " " + def.name + " is about, " + (camp ? "at the grump camp" : "to the " + dirOf(at.x - hm.x, at.z - hm.z)) + ": it " + def.twist + ". there's a bounty on the notice board.");
return p;
};
function postDone(game, p, c, how) {
var s = st(game), def = postDef(p), g = postGrump(game, p), x = g ? g.x : p.x, z = g ? g.z : p.z;
if (p.kind === "beast" && D.beastDone) return D.beastDone(game, p, c, how);
if (p.kind === "named") {
var e = s.named[p.nid] || (s.named[p.nid] = { n: 0 });
e.n++; e.day = day(game); e.by = c ? c.name : null; e.how = how;
(p.stolen || []).forEach(function (k) { drop(game, k, 1, x + (Math.random() - 0.5), z + (Math.random() - 0.5)); });
if (how === "beaten") {
if (p.nid === "snatch") { if (c) c.purse = r2((c.purse || 0) + 3); }
if (p.nid === "snuff") drop(game, "cinder", 2, x + 0.4, z);
if (p.nid === "howl") drop(game, "warhorn", 1, x + 0.4, z);
if (p.nid === "brag") drop(game, K.heartfruit ? "heartfruit" : "potion", 1, x + 0.4, z);
D.move(game, "grumps", -6, "beat " + def.name);
if (c && c._pov && SB.Body && SB.Body.xp) { try { SB.Body.xp(c, "fight", 5); } catch (er) {} }
} else D.move(game, "grumps", 10, "let " + def.name + " go");
s.chain.b.named = s.chain.b.named || day(game);
bountyDone(game, "named", p.key, c, how === "beaten" ? 1 : 0.5);
emit("darkNamedBeaten", { def: def, c: c || null, how: how });
tell(game, how === "beaten" ? def.icon + " " + def.name + " is chased off! " + ((p.stolen || []).length ? "everything it took is lying where it stood. " : "") + "the bounty is yours." : "🕊 you let " + def.name + " go. the grumps will hear of it.");
dropPost(game, p, how);
grumpStory(game, c);
return;
}
dropPost(game, p, how);
if (p.kind === "siege") {
var left = s.posts.filter(function (o) { return o.kind === "siege"; }).length;
if (!left && s.raid.siege) { s.raid.siege = null; s.raid.truce = game.time + D.TRUCE_DAYS * SB.DAY_LENGTH; sparks(game, 8, c); D.move(game, "grumps", -3, "broke a siege"); bountyDone(game, "siege", "siege", c, 1); emit("darkSiege", { over: true, broken: true }); tell(game, "🏳 the siege is broken! the grumps keep well away for a day or so. +8 ✨"); }
} else if (p.kind === "scout" && s.raid.scouts) { s.raid.scouts.off = (s.raid.scouts.off || 0) + 1; }
}
D.release = function (game, c, g) {
var p = g && g.dark ? postOf(game, g.dark) : null;
if (!p || p.kind !== "named") return { ok: false, msg: "" };
if (D.hp(game, p.key) > 0.5) return { ok: false, msg: "it isn't beaten yet" };
postDone(game, p, c, "released");
return { ok: true, msg: "🕊 " + p.name + " backs away, staring, and goes" };
};
function anyone(game, x, z) { var best = null, bd = 1e9; tribe(game).forEach(function (c) { var dd = SB.dist(c.x, c.z, x, z); if (dd < bd) { bd = dd; best = c; } }); return best; }
function postsTick(game) {
var s = st(game), P = SB.Possess, mine = me();
s.posts.slice().forEach(function (p) {
var def = postDef(p), g = postGrump(game, p) || spawnPost(game, p), duel = dueling(g);
if (!g.scout || g.scout.done) g.scout = holdScout(def, p);
if (D.beastTick && D.beastTick(game, p, g, duel, mine)) return;
if (g.carry != null && SB.Threats && SB.Threats.drop) SB.Threats.drop(game, g, null); // a posted grump never walks off with a smol
if (!duel) {
var who = anyone(game, p.x, p.z);
g.scout.who = who ? who.id : null; g.scout.hold = true;
if (SB.dist(g.x, g.z, p.x, p.z) > 1.5) { g.x = p.x; g.z = p.z; g.px = p.x; g.pz = p.z; }
g.goingHome = false; g.chem.fear = 0;
if (g.whacked > 0) g.whacked = Math.max(0, g.whacked - 0.5 * 0.04 * need(def));
p.hurt = g.whacked;
if (p.packs) { p.packs.forEach(function (id) { var o = SB.Game.byId(game, id); if (o && o.alive) { if (o.scout) o.scout.done = true; o.goingHome = true; } }); p.packs = null; }
if (p.kind === "scout" && (g.tapCount || 0) >= 3) { tell(game, "👋 shooed! the scout scrambles off"); postDone(game, p, null, "shooed"); return; }
if (mine && P.scout && !P.scout() && P.adoptScout && mine.tier >= 1 && SB.dist(mine.x, mine.z, p.x, p.z) < D.AGGRO && game.time >= (p.rest || 0) && mine.chem.health >= D.FIT && (!D.beastAggro || D.beastAggro(game, p, mine))) {
g.scout.who = mine.id; g.scout.hits = 0;
if (P.adoptScout(g, { keep: true })) { p.calls = 0; p.duelT = game.time; emit("darkDuel", { post: p, c: mine, g: g }); if (P.say) P.say((def.icon || "👹") + " " + p.name + " comes for you! hit it between pounces" + (p.kind === "named" || p.kind === "beast" ? ". it " + def.twist : "")); }
}
return;
}
if (SB.dist(mine.x, mine.z, p.x, p.z) > D.LEASH) { p.rest = game.time + D.REST; P.endScout("😮‍💨 " + p.name + " lets you go. it will be waiting", 0, "left"); return; }
if (mine.chem.health <= D.LOSE_AT) { p.rest = game.time + D.REST; P.endScout("💢 " + p.name + " was too much. eat, rest and come back", 0, "lost"); return; }
if (p.nid === "howl" && (p.calls || 0) < 2 && game.time - (p.duelT || 0) > 8 + (p.calls || 0) * 10) {
p.calls = (p.calls || 0) + 1;
var at = spotAt(game, mine.x, mine.z, 7, 10, dice(game, "pack" + game.time), null);
if (at) { var o = SB.Game.spawnGrump(game, at.x, at.z); o.name = "one of Howl's pack"; o.dark = "pack"; o.scout = { who: mine.id, t: 3, hitT: 0, speedK: 0.8, dmg: 0.08 }; (p.packs || (p.packs = [])).push(o.id); if (P.say) P.say("📣 Howl howls, and another grump comes running!"); emit("darkCall", { post: p, g: o }); }
}
if (p.nid === "brag" && g.whacked > 0 && !(Sv() && (Sv().has(mine, "torch") || Sv().has(mine, "cinder"))) && !(SB.World.nearestFire && SB.World.nearestFire(game.world, mine.x, mine.z, 6))) { g.whacked = Math.max(0, g.whacked - 0.25); if (!p.bragTold) { p.bragTold = 1; if (P.say) P.say("💪 Brag shrugs it off! carry a torch or a cinder, or fight it by a fire"); } }
});
}
function twists(game) {
var s = st(game), w = game.world, hm = home(game);
if (!w.night) return;
s.posts.forEach(function (p) {
if (p.kind !== "named") return;
p.tw = (p.tw || 0) + 2;
if (p.nid === "snatch" && p.tw >= 30 && (p.stolen || (p.stolen = [])).length < 8) {
p.tw = 0;
var it = null, items = w.items || []; // (a plain look through the loose things: once every half a minute)
for (var i = 0; i < items.length && !it; i++) { var o = items[i]; if (o && o.heldBy == null && !o.gone && o.kind !== "egg" && K[o.kind] && !K[o.kind].critter && !(o.data && (o.data.pod || o.data.rotten)) && SB.dist(o.x, o.z, hm.x, hm.z) < 14) it = o; }
if (it) { var n = (it.data && it.data.n) || 1; if (n > 1) it.data.n = n - 1; else SB.World.remove(w, it); p.stolen.push(it.kind); s.n.stolen = (s.n.stolen || 0) + 1; emit("darkTheft", { post: p, kind: it.kind }); }
}
if (p.nid === "snuff" && p.tw >= 40) {
p.tw = 0;
var lit = fires(game, 40).filter(function (b) { return b.data.lit; })[0];
if (lit) { lit.data.fuel = 0; lit.data.lit = false; s.n.snuffed = (s.n.snuffed || 0) + 1; emit("darkSnuff", { post: p, st: lit }); if (p.toldDay !== day(game)) { p.toldDay = day(game); tell(game, "💨 a fire just went out by itself. that's Snuff. relight it, and go and find Snuff"); } }
}
});
}
D.board = function (game) { return st(game).board; };
function post(game, e) { var b = st(game).board; e.id = b.nid = (b.nid || 0) + 1; e.day = day(game); e.done = false; b.list.push(e); emit("notice", { e: e }); return e; }
function has(game, kindId, ref) { return st(game).board.list.some(function (e) { return e.kind === kindId && e.ref === ref && !e.done; }); }
D.refresh = function (game, keep) {
if (!D.open(game)) return null;
var s = st(game), b = s.board, d = day(game), hm = home(game), top = topTier(game);
b.list = b.list.filter(function (e) { return e.done ? d - (e.doneDay || d) < 1 : (e.kind !== "bring" && e.kind !== "find") || d - e.day < 3; });
s.posts.forEach(function (p) {
if (p.kind === "named" && !has(game, "named", p.key)) { var def = postDef(p); post(game, { kind: "named", ref: p.key, icon: def.icon, t: "drive off " + def.name + " (it " + def.twist + ")", pay: def.pay, x: p.x, z: p.z }); }
});
if (s.raid.siege && !has(game, "siege", "siege")) post(game, { kind: "siege", ref: "siege", icon: "⛺", t: "break the siege: chase off the grumps camped outside the walls", pay: 10, x: s.raid.siege.x, z: s.raid.siege.z });
(game.sites || []).forEach(function (q) { if (q.kind === "camp" && q.found && !q.done && !q.gone && !has(game, "camp", q.id)) post(game, { kind: "camp", ref: q.id, icon: "⛺", t: "clear the grump camp to the " + dirOf(q.x - hm.x, q.z - hm.z), pay: 12, x: q.x, z: q.z }); });
if (keep || b.day === d) return b;
b.day = d;
var r = dice(game, "board" + d), open = b.list.filter(function (e) { return !e.done; }).length;
var asks = D.ASKS.filter(function (a) { return K[a[0]] && a[3] <= top && !b.list.some(function (e) { return e.kind === "bring" && e.k === a[0] && !e.done; }); });
if (open < 3 && asks.length) { var a = asks[Math.floor(r() * asks.length)]; post(game, { kind: "bring", k: a[0], need: a[1], icon: K[a[0]].emoji, t: "bring " + a[1] + " " + label(a[0]) + " to the village", pay: a[2] }); open++; }
if (open < 3 && top >= 1 && !b.list.some(function (e) { return e.kind === "find" && !e.done; }) && r() < 0.7) {
var at = spotAt(game, hm.x, hm.z, 18, 32, r, null);
if (at) { var nm = LOST_NAMES[Math.floor(r() * LOST_NAMES.length)]; post(game, { kind: "find", who: nm, icon: "🔎", t: "find " + nm + ", a wild smol lost to the " + dirOf(at.x - hm.x, at.z - hm.z), pay: 6, x: at.x, z: at.z }); }
}
emit("noticeBoard", { day: d, list: b.list });
return b;
};
function payOut(game, e, c, k) {
var s = st(game), b = s.board, pay = Math.max(1, Math.round(e.pay * (k == null ? 1 : k)));
e.done = true; e.doneDay = day(game); e.by = c ? c.name : null;
if (b.pay === "item" && c && c.alive) { var ik = ["potion", "seed", "torch"][(b.seals || 0) % 3], inn = Math.max(1, Math.round(pay / 4)); if (!K[ik]) ik = "berry"; give(game, c, ik, inn); e.paid = inn + " " + label(ik); }
else if (b.pay === "shells" && c && c.alive) { c.purse = r2((c.purse || 0) + pay); e.paid = pay + " shells"; }
else { var sp = Math.max(1, Math.ceil(pay / 2)); sparks(game, sp, c); e.paid = sp + " ✨"; }
b.seals = (b.seals || 0) + 1; s.n.bounties = (s.n.bounties || 0) + 1;
emit("bountyDone", { e: e, c: c || null, pay: pay });
while ((b.prizes || 0) < D.PRIZES.length && b.seals >= D.PRIZES[b.prizes || 0][0]) {
var pz = D.PRIZES[b.prizes || 0]; b.prizes = (b.prizes || 0) + 1;
var pk = K[pz[1]] ? pz[1] : "potion";
give(game, c, K[pk] ? pk : "berry", pz[2]);
emit("bountyPrize", { n: pz[0], kind: pk });
tell(game, "🏅 " + pz[0] + " seals from the council: " + pz[3] + (c ? ", in your bag" : ", left at the nest"));
}
return pay;
}
function bountyDone(game, kindId, ref, c, k) { var out = 0; st(game).board.list.forEach(function (e) { if (e.kind === kindId && e.ref === ref && !e.done) out = payOut(game, e, c, k); }); return out; }
D.entry = function (game, id) { var L = st(game).board.list; for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i]; return null; };
D.atVillage = function (game, c) { var hm = home(game); return SB.dist(c.x, c.z, hm.x, hm.z) <= 16; };
D.handIn = function (game, c, id) {
var e = D.entry(game, id);
if (!e || e.done || e.kind !== "bring") return { ok: false, msg: "" };
if (!D.atVillage(game, c)) return { ok: false, msg: "the council is at the village: bring it home" };
var n = Sv().count(c, e.k, true);
if (n < e.need) return { ok: false, msg: "you have " + n + " of " + e.need + " " + label(e.k) };
Sv().take(c, e.k, e.need);
payOut(game, e, c, 1);
return { ok: true, msg: "📜 handed in " + e.need + " " + label(e.k) + ": " + e.paid + " from the council" };
};
D.setPay = function (game, how) { st(game).board.pay = how === "sparks" ? "sparks" : how === "item" ? "item" : "shells"; };
D.progress = function (game, e, c) { return e.kind === "bring" ? [c ? Math.min(e.need, Sv().count(c, e.k, true)) : 0, e.need] : [e.done ? 1 : 0, 1]; };
function boardTick(game) {
var s = st(game), mine = me();
s.board.list.forEach(function (e) {
if (e.done) return;
if (e.kind === "camp") { var q = (game.sites || [])[e.ref]; if (q && q.done) payOut(game, e, mine, 1); }
if (e.kind === "find" && mine && SB.dist(mine.x, mine.z, e.x, e.z) < 4) { payOut(game, e, mine, 1); D.move(game, "wild", 10, "found " + e.who); tell(game, "🔎 there's " + e.who + ", under a bush! it trots off home. the wild smols will hear of this. " + e.paid); }
});
}
D.teller = function (game) { var s = st(game); return D.TELLER_BY[s.teller] || D.TELLER_BY.classic; };
D.setTeller = function (game, id) { if (!D.TELLER_BY[id]) return false; var s = st(game); s.teller = id; s.beat = 0; emit("teller", { id: id }); return true; };
D.hurting = function (game) {
var cs = tribe(game), DR = SB.Director, d = DR ? DR.state(game) : null;
if (!cs.length) return "";
if (cs.length <= 3) return "few";
if (d && (d.losses || []).some(function (t) { return game.time - t < 600; })) return "grief";
var h = 0; cs.forEach(function (c) { h += c.chem.hunger || 0; });
if (h / cs.length > 0.6) return "hungry";
return "";
};
D.raidOk = function (game) {
var s = st(game);
if (game.time < (s.raid.truce || 0)) return false;
if (D.rank(game, "grumps").key === "truce") return false;
if (s.raid.siege || s.raid.scouts) return false;
return true;
};
function gapK(t, s) {
if (t.id === "ember") return [0.8, 0.6, 0.45, 2.2][(s.beat || 0) % 4];
if (t.id === "moss") return 1.5;
if (t.id === "dice") return 0.35 + Math.random() * 1.9;
return 1;
}
D.gapK = gapK;
function raidText(inc, n) { if (inc.text && inc.text[0]) inc.text[0] = inc.text[0].replace(/^\d+ grumps are/, n + (n === 1 ? " grump is" : " grumps are")); }
function shapeRaid(game, inc, soft) {
var s = st(game), n = inc.n || 2, n0 = n, bits = [];
if (s.raid.escaped) { n += s.raid.escaped; bits.push("the scouts that got away brought more"); s.raid.escaped = 0; }
var gr = D.rank(game, "grumps").key;
if (gr === "at war") { n += 1; bits.push("the grumps are at war with you"); }
if (gr === "wary") { n = Math.ceil(n * 2 / 3); bits.push("the grumps are wary of you now"); }
if (D.lifted(game, "night")) { n = Math.ceil(n * 2 / 3); bits.push("with the Long Night gone, fewer follow"); }
if (D.rank(game, "far").key === "kin" && n > 2) { n -= 2; bits.push("the far tribe's fighters turned two back on the road"); }
if (soft) { n = Math.ceil(n / 2); bits.push("the storyteller goes easy on a hurting tribe"); }
n = Math.max(soft ? 1 : 2, Math.min(14, n));
if (n !== n0) { inc.n = n; raidText(inc, n); }
if (n >= 4) bits.push("a chief leads them: break the chief and the rest will run");
if (bits.length && inc.text) inc.text.push(bits.join(". ") + ".");
inc.dkShaped = true;
s.raid.n = (s.raid.n || 0) + 1;
}
function raidCould(game, d) {
var DR = SB.Director, def = DR.raid;
if (!def || !def.w || topTier(game) < def.minTier) return false;
if (d.last && d.last.raid != null && game.time - d.last.raid < def.gap) return false;
if (d.lastBad && game.time - d.lastBad < 600) return false;
try { return !!def.ok(game); } catch (e) { return false; }
}
function startScouts(game) {
var s = st(game), hm = home(game), r = dice(game, "scouts" + Math.round(game.time)), ang = r() * 6.283, n = 0;
for (var i = 0; i < 2; i++) { var at = spotAt(game, hm.x, hm.z, 19, 24, r, ang + i * 0.5); if (at) { addPost(game, { key: "scout-" + Math.round(game.time) + "-" + i, kind: "scout", name: SCOUTG.name, x: at.x, z: at.z }); n++; } }
if (!n) return false;
var p0 = s.posts.filter(function (p) { return p.kind === "scout"; })[0];
s.raid.scouts = { until: game.time + D.SCOUT_T, n: n, off: 0, x: p0.x, z: p0.z };
emit("darkScouts", { n: n, x: p0.x, z: p0.z });
tell(game, "👀 grump scouts are watching from the " + dirOf(p0.x - hm.x, p0.z - hm.z) + ". chase them off (three taps from the sky, or a good whack in a body) and no war party comes.");
return true;
}
function endScouts(game, quiet) {
var s = st(game), sc = s.raid.scouts;
if (!sc) return;
var left = s.posts.filter(function (p) { return p.kind === "scout"; });
left.forEach(function (p) { dropPost(game, p, "report"); });
s.raid.scouts = null;
if (quiet) return;
if (!left.length) { sparks(game, 3); s.raid.truce = Math.max(s.raid.truce || 0, game.time + 0.5 * SB.DAY_LENGTH); emit("darkScoutsEnd", { raid: false }); tell(game, "🏏 the scouts never reported back. no war party today. +3 ✨"); return; }
s.raid.escaped = sc.off ? 0 : 1; // nobody even tried: they report you soft
s.raid.pending = game.time;
emit("darkScoutsEnd", { raid: true, escaped: left.length });
}
D._startScouts = startScouts; D._endScouts = endScouts; D._post = post; // for tests
D._h = { st: st, day: day, home: home, tribe: tribe, topTier: topTier, label: label, dice: dice, spotAt: spotAt, drop: drop, give: give, tell: tell, emit: emit, sparks: sparks, me: me, dueling: dueling, addPost: addPost, dropPost: dropPost, postGrump: postGrump, need: need, newcomer: newcomer, putStruct: putStruct, findStruct: findStruct, esc: esc, dirOf: dirOf, looseFood: looseFood, fires: fires, Sv: Sv, payOut: payOut, post: post, has: has, bountyDone: bountyDone, cur: cur, foodSlot: foodSlot, page: page, r1: r1, r2: r2 }; // round 2 (below) builds on these
var wrapped = false;
D.wrap = function () {
var DR = SB.Director;
if (wrapped || !DR || !DR.fire || !DR.DECK) return false;
wrapped = true;
var fire0 = DR.fire;
DR.fire = function (game, id) {
var s, d, inc;
if (!game || !D.open(game)) return fire0.call(DR, game, id);
s = st(game); d = DR.state(game);
if (id) { inc = fire0.call(DR, game, id); if (inc && inc.id === "raid") shapeRaid(game, inc, false); return inc; }
var t = D.teller(game), hurt = D.hurting(game), keep = d.lastBad, hold = false, why = "";
var maxM = t.id === "moss" ? D.MERCY_MAX * 2 : D.MERCY_MAX;
if (hurt && (s.mercy.n || 0) < maxM) { hold = true; why = "mercy"; }
else if (t.id === "ember" && (s.beat || 0) % 4 === 3) { hold = true; why = "rest"; }
else if (t.id === "moss" && (s.beat || 0) % 2 === 1) { hold = true; why = "gentle"; }
if (!hold && !hurt && day(game) >= D.FIRST_DAY && !s.raid.scouts && raidCould(game, d) && Math.random() < 0.4 && startScouts(game)) { d.nextT = game.time + D.SCOUT_T + 15; return null; }
if (hold) d.lastBad = game.time; else if (t.id === "dice") d.lastBad = 0;
inc = fire0.call(DR, game);
var def = inc ? DR[inc.id] : null, bad = !!(def && def.bad);
if (!bad) d.lastBad = keep;
d.nextT = game.time + Math.max(20, (d.nextT - game.time) * gapK(t, s));
s.beat = (s.beat || 0) + 1;
if (why === "mercy") { s.mercy.n = (s.mercy.n || 0) + 1; s.mercy.total = (s.mercy.total || 0) + 1; s.mercy.why = hurt; emit("mercy", { how: "held", why: hurt }); }
else if (hurt && bad) { s.mercy.total = (s.mercy.total || 0) + 1; s.mercy.n = 0; emit("mercy", { how: "soft", why: hurt, id: inc.id }); if (inc.id !== "raid" && inc.warn) inc.warn = Math.round(inc.warn * 1.5); }
else if (!hurt) s.mercy.n = 0;
if (inc && inc.id === "raid") shapeRaid(game, inc, !!hurt);
return inc;
};
if (DR.raid && DR.raid.ok) { var ok0 = DR.raid.ok; DR.raid.ok = function (game) { return ok0(game) && (!D.open(game) || D.raidOk(game)); }; }
D.CARDS.forEach(function (c) { if (!DR[c.id]) { DR.DECK.push(c); DR[c.id] = c; } });
var T = SB.Threats;
if (T && T.env && !T._dkEnv) { var env0 = T.env; T._dkEnv = 1; T.env = function (env) { env0(env); try { D.env(env); } catch (e) {} }; }
return true;
};
D.env = function (env) {
var game = cur(), s = game && game.quests && game.quests.dark;
if (!s || !env) return;
if (s.eclipse && game.time < s.eclipse) { if (env.sun && env.sun.map) env.sun = env.sun.map(function (v) { return v * 0.22; }); if (env.sky && SB.mixC) env.sky = SB.mixC(env.sky, [0.03, 0.03, 0.08], 0.85); if (env.fog && SB.mixC) env.fog = SB.mixC(env.fog, [0.05, 0.05, 0.1], 0.7); }
else if (s.cold && game.time < s.cold.until) { if (env.sky && SB.mixC) env.sky = SB.mixC(env.sky, [0.8, 0.88, 0.96], 0.35); if (env.fog && SB.mixC) env.fog = SB.mixC(env.fog, [0.85, 0.9, 0.96], 0.4); }
};
function chiefTick(game) {
var DR = SB.Director, inc = DR && game.dir ? game.dir.active : null;
if (!inc || inc.id !== "raid" || inc.phase !== "on" || !inc.raiders || inc.dkLed != null || inc.raiders.length < 4) return;
var g = SB.Game.byId(game, inc.raiders[0]);
inc.dkLed = g ? g.id : -1;
if (!g || !g.alive) return;
var nm = "chief " + CHIEFS[Math.floor(dice(game, "chief" + st(game).raid.n)() * CHIEFS.length)];
g.name = nm; g.dark = "chief"; g.tough = (g.tough || 1) * 1.8; if (g.look) g.look.size = (g.look.size || 1) * 1.3;
inc.dkChief = nm;
emit("darkChief", { g: g, inc: inc, name: nm });
tell(game, "👺 " + nm + " leads the war party: the big one. break the chief and the rest will run.");
}
function chiefDown(game, g, c) {
var inc = game.dir && game.dir.active, n = 0;
if (!inc || inc.id !== "raid" || inc.dkLed !== g.id) return;
inc.dkChiefDown = true;
(inc.raiders || []).forEach(function (id) { var o = SB.Game.byId(game, id); if (o && o.alive && o !== g && !o.goingHome) { o.goingHome = true; o.raider = null; o.chem.fear = 1; n++; } });
inc.routed = (inc.routed || 0) + n;
sparks(game, 4, c);
emit("darkChiefDown", { c: c, n: n, name: inc.dkChief });
tell(game, "🏏 " + (inc.dkChief || "the chief") + " is down, and the war party breaks! " + (n ? n + " more run for it. " : "") + "+4 ✨");
}
D.walls = function (game) { return game.world.structures.filter(function (b) { return b.kind === "wall" && b.done; }).length; };
D.startSiege = function (game, x, z) {
var s = st(game), hm = home(game);
if (s.raid.siege) return false;
var r = dice(game, "siege" + (s.raid.n || 0)), ang = Math.atan2(x - hm.x, z - hm.z), n = 0, first = null;
for (var i = 0; i < 3; i++) { var at = spotAt(game, hm.x, hm.z, 14, 18, r, ang + (i - 1) * 0.35); if (at) { addPost(game, { key: "siege-" + (s.raid.n || 0) + "-" + i, kind: "siege", name: SIEGER.name, x: at.x, z: at.z }); first = first || at; n++; } }
if (!n) return false;
s.raid.siege = { until: game.time + D.SIEGE_DAYS * SB.DAY_LENGTH, n: n, x: first.x, z: first.z };
D.refresh(game, true);
emit("darkSiege", { n: n, x: first.x, z: first.z });
tell(game, "⛺ your walls held, so the grumps have sat down outside them, to the " + dirOf(first.x - hm.x, first.z - hm.z) + ". every dusk they will put a fire out, until someone goes and moves them. it's on the notice board.");
return true;
};
function raidOver(game, inc, ok) {
var s = st(game), beat = ok && (inc.choice === "fight" || (inc.chased || 0) > 0 || inc.dkChiefDown);
if (beat) {
s.raid.truce = game.time + D.TRUCE_DAYS * SB.DAY_LENGTH; s.n.raidsBeaten = (s.n.raidsBeaten || 0) + 1;
D.move(game, "grumps", -4, "beat a raid");
if (inc.dkDare) sparks(game, 6);
emit("darkTruce", { until: s.raid.truce });
tell(game, "🏳 a beaten war party tells the others. the grumps keep away for a day or so" + (inc.dkDare ? ". you called it and you beat it: +6 ✨" : "."));
return;
}
if (D.walls(game) > 0 && (inc.n || 0) >= 3 && inc.choice !== "smite" && (inc.walled || dice(game, "sg" + (s.raid.n || 0))() < 0.5)) D.startSiege(game, inc.x, inc.z);
}
function siegeNight(game) {
var s = st(game);
if (!s.raid.siege) return;
var lit = fires(game, 30).filter(function (b) { return b.data.lit; })[0];
if (lit) { lit.data.fuel = 0; lit.data.lit = false; emit("darkSnuff", { siege: true, st: lit }); tell(game, "⛺ the besiegers crept in at dusk and put a fire out."); }
}
function DRend(game, inc, ok) { return SB.Director.end(game, inc, ok); }
function seq(game, tag) { return dice(game, tag + ":" + ((game.dir && game.dir.count) || 0) + ":" + Math.round(game.time)); }
function hmDir(game, x, z) { var hm = home(game); return dirOf(x - hm.x, z - hm.z); }
function bravest(game) { return tribe(game).filter(function (c) { return c.stage >= 2 && !c.asleep && !c._pov; }).sort(function (a, b) { return ((b.genome && b.genome.genes && b.genome.genes.bravery) || 0) - ((a.genome && a.genome.genes && a.genome.genes.bravery) || 0); })[0] || null; }
D.CARDS = [
{ id: "eclipse", bad: true, minTier: 1, w: 1, gap: 3000,
ok: function (game) { return !D.lifted(game, "night") && !game.world.night && tribe(game).length >= 3; },
start: function (game) {
var hm = home(game);
return { icon: "🌘", title: "the sun is going out", x: hm.x, z: hm.z, warn: 20,
text: ["a bite is gone from the sun and it's getting bigger. in a minute it will be dark at noon.", "grumps come out in the dark, whatever the hour."],
choices: [
{ key: "fires", label: "🔥 light every fire", cost: 5, hint: "every campfire blazes up. only one grump dares come" },
{ key: "hide", label: "🛖 everyone home", hint: "your smols wait it out indoors" },
{ key: "watch", label: "👀 watch it", hint: "clever smols learn from a dark sun. so do grumps: more come" }
] };
},
begin: function (game, inc) {
var s = st(game), hm = home(game), r = seq(game, "ecl"), n = inc.choice === "fires" ? 1 : inc.choice === "watch" ? 3 : 2, at = spotAt(game, hm.x, hm.z, 24, 30, r, null);
inc.dur = 100; s.eclipse = game.time + inc.dur; inc.grumps = [];
if (inc.choice === "fires") fires(game, 30).forEach(function (b) { b.data.fuel = 1; b.data.lit = true; });
if (inc.choice === "hide") tribe(game).forEach(function (c) { c.shelterT = 100; });
if (inc.choice === "watch") tribe(game).forEach(function (c) { if (c.tier >= 2) c.inspired = Math.max(c.inspired || 0, 90); });
for (var i = 0; at && i < n; i++) { var g = SB.Game.spawnGrump(game, at.x + (r() - 0.5) * 3, at.z + (r() - 0.5) * 3); g.raider = { x: hm.x, z: hm.z }; g.dark = "eclipse"; g.chem.anger = 0.6; inc.grumps.push(g.id); }
},
tick: function (game, inc) { if (game.time - inc.t1 > inc.dur) return DRend(game, inc, true); },
finish: function (game, inc) {
st(game).eclipse = 0;
(inc.grumps || []).forEach(function (id) { var g = SB.Game.byId(game, id); if (g && g.alive) { g.goingHome = true; g.raider = null; } });
tribe(game).forEach(function (c) { if (inc.choice === "hide") c.shelterT = 0; });
if (inc.choice === "watch") { sparks(game, 5); return "the sun came back. the ones who watched are full of ideas. +5 ✨"; }
return inc.choice === "fires" ? "the sun came back, and the fires kept the dark off. ☀️" : "the sun came back. everyone creeps out again. ☀️";
} },
{ id: "meteors", minTier: 1, w: 1.2, gap: 2400,
ok: function (game) { return !!game.world.night; },
start: function (game) {
var hm = home(game);
return { icon: "🌠", title: "a shower of falling stars", x: hm.x, z: hm.z, warn: 0,
text: ["the whole sky is streaking. little lights are coming down all around the village.", "some of them are still warm."],
choices: [
{ key: "gather", label: "🧺 gather them", hint: "five lights to pick up round the village, and a star-stone to mine" },
{ key: "wish", label: "🙏 wish on them", hint: "everyone feels better, and the Lantern hears: +6 ✨" },
{ key: "sleep", label: "😴 sleep through it", hint: "a couple will still be lying about in the morning" }
] };
},
begin: function (game, inc) {
var hm = home(game), r = seq(game, "met"), k = K.mote ? "mote" : "crystal", n = inc.choice === "gather" ? 5 : inc.choice === "sleep" ? 2 : 0;
for (var i = 0; i < n; i++) { var p = spotAt(game, hm.x, hm.z, 5, 14, r, null); if (p) drop(game, k, 1, p.x, p.z); }
if (inc.choice === "gather") { var q = spotAt(game, hm.x, hm.z, 12, 20, r, null); if (q && SB.World.addNode) { try { SB.World.addNode(game.world, game, "orevein", q.x, q.z, 0.8); inc.stone = 1; } catch (e) {} } }
if (inc.choice === "wish") { sparks(game, 6); tribe(game).forEach(function (c) { if (SB.Chem && SB.Chem.apply) SB.Chem.apply(c.chem, { bored: -0.3, fear: -0.2 }); }); }
inc.fell = n;
return DRend(game, inc, true);
},
finish: function (game, inc) { return inc.choice === "wish" ? "a hundred wishes went up. the Lantern heard. +6 ✨" : inc.fell + " little lights are lying round the village" + (inc.stone ? ", and a star-stone full of ore" : "") + ". 🌠"; } },
{ id: "healer", minTier: 0, w: 1.2, gap: 2400,
ok: function (game) { return D.rank(game, "far").key !== "cold" && tribe(game).length >= 2; },
start: function (game) {
var hm = home(game), sickN = tribe(game).filter(function (c) { return c.chem.health < 0.7 || c.chem.sick > 0.25; }).length;
return { icon: "🌿", title: "a wandering healer", x: hm.x, z: hm.z, warn: 0,
text: ["an old smol of the far tribe has walked in with a bag of roots and a great many opinions.", sickN ? sickN + " of your smols could use her." : "nobody is poorly just now, but she has brews to spare."],
choices: [
{ key: "feed", label: "🍎 feed her, and she tends everyone", hint: "three pieces of food from round the village. every smol is mended" },
{ key: "teach", label: "📖 ask her to leave her brews", cost: 6, hint: "two brews and healroot left at the nest" },
{ key: "wave", label: "👋 wave her on", hint: "she shrugs and walks on" }
] };
},
begin: function (game, inc) {
var hm = home(game);
if (inc.choice === "feed") {
inc.fed = looseFood(game, 3);
var cs = tribe(game).sort(function (a, b) { return a.chem.health - b.chem.health; });
(inc.fed >= 3 ? cs : cs.slice(0, 1)).forEach(function (c) { c.chem.health = 1; if (SB.Chem && SB.Chem.apply) SB.Chem.apply(c.chem, { sick: -1, antigen: -1, pain: -1 }); });
D.move(game, "far", inc.fed >= 3 ? 5 : 2, "fed the healer");
} else if (inc.choice === "teach") { drop(game, "potion", 2, hm.x + 1, hm.z + 1); drop(game, "herb", 3, hm.x + 1.5, hm.z + 0.5); D.move(game, "far", 3, "the healer"); }
return DRend(game, inc, true);
},
finish: function (game, inc) { return inc.choice === "feed" ? (inc.fed >= 3 ? "she ate, grumbled, and mended every one of them. 🌿" : "there wasn't enough to feed her, so she saw to the worst one and left.") : inc.choice === "teach" ? "two brews and a bundle of healroot are waiting at the nest. 🧪" : "she walks on, muttering."; } },
{ id: "beetles", bad: true, minTier: 2, w: 1.2, gap: 2400,
ok: function (game) { return game.world.structures.some(function (b) { return b.kind === "farm" && b.done; }) || looseFood(game) >= 4; },
start: function (game) {
var hm = home(game), lit = fires(game, 16).some(function (b) { return b.data.lit; });
return { icon: "🪲", title: "a plague of beetles", x: hm.x, z: hm.z, warn: 0,
text: ["a rustling brown carpet is coming over the fields. beetles, thousands, and all of them hungry.", lit ? "there's a fire burning in the village: smoke would turn them." : "there's no fire lit in the village to smoke them out."],
choices: [
{ key: "smoke", label: "🔥 smoke them out", hint: lit ? "green leaves on the fire. the farms are saved" : "with no fire lit, this only saves half" },
{ key: "zap", label: "⚡ a clap of thunder", cost: 5, hint: "they scatter. nothing is lost" },
{ key: "catch", label: "🧺 send the kids to catch them", hint: "the farms take a nibble, but roast beetle is food" },
{ key: "let", label: "let them eat", hint: "the farms start again and loose food goes" }
] };
},
begin: function (game, inc) {
var hm = home(game), lit = fires(game, 16).some(function (b) { return b.data.lit; }), k = inc.choice === "zap" || (inc.choice === "smoke" && lit) ? 0 : inc.choice === "smoke" ? 0.5 : inc.choice === "catch" ? 0.3 : 1;
game.world.structures.forEach(function (b) { if (b.kind === "farm" && b.done && b.data) b.data.grow = Math.max(0, (b.data.grow || 0) * (1 - k)); });
inc.lost = k; inc.ate = inc.choice === "let" ? looseFood(game, 6) : 0;
if (inc.choice === "catch") drop(game, K.cooked ? "cooked" : "berry", 3, hm.x + 1, hm.z - 1);
return DRend(game, inc, true);
},
finish: function (game, inc) { return inc.lost === 0 ? "the beetles turned and went. the farms are fine. 🌾" : inc.choice === "catch" ? "the kids came back with a basketful. three roast suppers are by the nest, and the farms will get over it." : inc.choice === "let" ? "they ate the lot and moved on. the farms start again" + (inc.ate ? ", and " + inc.ate + " bits of food are gone." : ".") : "half the crop is gone. a lit fire would have saved it."; } },
{ id: "caravan", minTier: 2, w: 1, gap: 2400,
ok: function (game) { return D.rank(game, "far").key !== "cold"; },
start: function (game) {
var hm = home(game);
return { icon: "🎒", title: "a trader caravan", x: hm.x, z: hm.z, warn: 0,
text: ["six smols of the far tribe with packs twice their size have stopped at the edge of the village.", "they want food for the road, and they have things you can't make yet."],
choices: [
{ key: "food", label: "🍎 trade food for a tool", hint: "five pieces of food from round the village for a good axe" },
{ key: "buy", label: "✨ buy seeds and metal", cost: 6, hint: "four seeds and a lump of metal, left at the nest" },
{ key: "gift", label: "🎁 send them off with a gift", hint: "three pieces of food, for nothing. the far tribe remembers" },
{ key: "wave", label: "👋 not today", hint: "they nod and walk on" }
] };
},
begin: function (game, inc) {
var hm = home(game), top = topTier(game);
if (inc.choice === "food") { if (looseFood(game) >= 5) { looseFood(game, 5); inc.got = top >= 4 && K.axe ? "axe" : "stoneaxe"; drop(game, inc.got, 1, hm.x + 1.2, hm.z + 0.6); D.move(game, "far", 4, "traded"); } }
else if (inc.choice === "buy") { drop(game, "seed", 4, hm.x + 1.2, hm.z + 0.6); drop(game, top >= 4 && K.iron ? "iron" : "metal", 1, hm.x + 0.6, hm.z + 1.2); D.move(game, "far", 3, "traded"); }
else if (inc.choice === "gift") { inc.gave = looseFood(game, 3); D.move(game, "far", inc.gave >= 3 ? 10 : 3, "a gift for the road"); }
st(game).n.caravans = (st(game).n.caravans || 0) + 1;
return DRend(game, inc, true);
},
finish: function (game, inc) { return inc.choice === "food" ? (inc.got ? "a fair swap: a " + label(inc.got) + " is waiting by the nest. 🎒" : "there wasn't five pieces of food to spare. they went on.") : inc.choice === "buy" ? "seeds and metal, by the nest. 🎒" : inc.choice === "gift" ? "they went off with full packs and a good word for you." : "the caravan walks on."; } },
{ id: "cold", bad: true, minTier: 0, w: 1, gap: 4000,
ok: function (game) { var s = st(game); return !D.lifted(game, "night") && !(s.cold && game.time < s.cold.until); },
start: function (game) {
var hm = home(game);
return { icon: "🥶", title: "a cold snap", x: hm.x, z: hm.z, warn: 0,
text: ["the wind has swung round and it has teeth. two days of sharp cold are coming.", "smols away from a fire or a roof will shiver, and the farms will sulk."],
choices: [
{ key: "fires", label: "🔥 keep every fire burning", cost: 6, hint: "no village fire goes out until it has passed" },
{ key: "huddle", label: "🫂 huddle up at night", hint: "everyone indoors after dark. the days still bite" },
{ key: "tough", label: "😤 tough it out", hint: "it bites all the way. the ones who get through it are proud: +5 ✨ after" }
] };
},
begin: function (game, inc) {
st(game).cold = { until: game.time + D.COLD_DAYS * SB.DAY_LENGTH, how: inc.choice };
emit("darkCold", { how: inc.choice });
return DRend(game, inc, true);
},
finish: function (game, inc) { return "the cold is here for two days. " + (inc.choice === "fires" ? "the fires will hold. 🔥" : inc.choice === "huddle" ? "home by dark, everyone." : "chins up."); } },
{ id: "refugee", minTier: 1, w: 1, gap: 3000,
ok: function (game) { return SB.Game.smols(game).length + 2 < (SB.Game.JOIN_CAP || SB.Game.POP_CAP || 99) && tribe(game).length >= 2; },
start: function (game) {
var hm = home(game), at = spotAt(game, hm.x, hm.z, 7, 10, seq(game, "ref"), null) || { x: hm.x + 6, z: hm.z };
return { icon: "🧣", title: "a refugee at the edge of the village", x: at.x, z: at.z, warn: 0,
text: ["a smol of the far tribe, run ragged. the grumps burned their camp and they have nowhere to go.", "the grumps that chased them know which way they ran."],
choices: [
{ key: "in", label: "🏠 take them in", hint: "one more of you. the far tribe will remember. so will the grumps" },
{ key: "feed", label: "🍲 a meal and a bed for the night", hint: "three pieces of food. they move on at dawn" },
{ key: "no", label: "🚪 turn them away", hint: "word of that will travel" }
] };
},
begin: function (game, inc) {
if (inc.choice === "in") { var c = newcomer(game, inc.x, inc.z, false, "refugee"); inc.who = c ? c.name : null; if (c) { st(game).raid.escaped = (st(game).raid.escaped || 0) + 1; D.move(game, "far", 12, "took in a refugee"); D.move(game, "grumps", -5, "sheltered their prey"); emit("darkJoined", { c: c, how: "refugee" }); } }
else if (inc.choice === "feed") { inc.fed = looseFood(game, 3); D.move(game, "far", inc.fed ? 5 : 1, "fed a refugee"); }
else D.move(game, "far", -6, "turned a refugee away");
return DRend(game, inc, true);
},
finish: function (game, inc) { return inc.choice === "in" ? (inc.who ? inc.who + " is one of yours now. the next war party will be a grump bigger for it. 🧣" : "there was no room after all. they went on.") : inc.choice === "feed" ? "fed, rested and gone by morning, with a good word for you." : "they went, slowly. the far tribe will hear of it."; } },
{ id: "foundling", minTier: 1, w: 1, gap: 3000,
ok: function (game) { return tribe(game).length >= 3; },
start: function (game) {
var hm = home(game), at = spotAt(game, hm.x, hm.z, 20, 26, seq(game, "fnd"), null);
if (!at) return null;
return { icon: "🧸", title: "a lost child", x: at.x, z: at.z, warn: 0,
text: ["a very small smol nobody knows is sitting at the edge of the trees to the " + hmDir(game, at.x, at.z) + ", crying. one of the wild smols' little ones.", "its people will be looking for it."],
choices: [
{ key: "home", label: "👣 walk it back to its people", hint: "your bravest takes it. the wild smols will remember" },
{ key: "keep", label: "🏠 keep it", hint: "it grows up yours. its people will not forget that either" },
{ key: "leave", label: "leave it be", hint: "it isn't yours to worry about" }
] };
},
begin: function (game, inc) {
if (inc.choice === "keep") { var k = newcomer(game, inc.x, inc.z, true, "foundling"); inc.who = k ? k.name : null; D.move(game, "wild", -10, "kept their child"); if (k) emit("darkJoined", { c: k, how: "foundling" }); return DRend(game, inc, true); }
if (inc.choice === "leave") { D.move(game, "wild", -4, "left their child"); return DRend(game, inc, false); }
var c = bravest(game);
if (!c) return DRend(game, inc, false);
inc.walker = c.id; inc.dur = 220;
SB.Creature.sendTo(c, inc.x, inc.z, game, 80);
},
tick: function (game, inc) {
var c = SB.Game.byId(game, inc.walker);
if (!c || !c.alive) return DRend(game, inc, false);
if (SB.dist(c.x, c.z, inc.x, inc.z) < 3.5) return DRend(game, inc, true);
if (!c.action || !c.action.called) SB.Creature.sendTo(c, inc.x, inc.z, game, 80);
if (game.time - inc.t1 > inc.dur) return DRend(game, inc, false);
},
finish: function (game, inc, ok) {
var hm = home(game), c = inc.walker != null ? SB.Game.byId(game, inc.walker) : null;
if (inc.choice === "keep") return inc.who ? inc.who + " is yours now, and very small. 🧸" : "there was no room. it wandered back into the trees.";
if (inc.choice === "leave") return "the crying stopped after a while.";
if (!ok) return "your smol never got there. the crying stopped after a while.";
D.move(game, "wild", 15, "brought their child home"); sparks(game, 5);
drop(game, "berry", 3, hm.x + 1, hm.z + 1.4); drop(game, "honey", 1, hm.x + 1.4, hm.z + 1);
if (c && SB.Creature.sendTo) SB.Creature.sendTo(c, hm.x, hm.z, game, 60);
return (c ? c.name : "your smol") + " walked it home. eyes in the trees, then a gift left by the nest. +5 ✨";
} },
{ id: "machine", minTier: 2, w: 1, gap: 4000,
ok: function (game) { return (game.sites || []).some(function (q) { return q.found && !q.gone && (q.kind === "ruin" || q.kind === "wreck"); }); },
start: function (game) {
var qs = (game.sites || []).filter(function (q) { return q.found && !q.gone && (q.kind === "ruin" || q.kind === "wreck"); }), q = qs[Math.floor(seq(game, "mac")() * qs.length)];
if (!q) return null;
return { icon: "⚙️", title: "an old machine is waking", x: q.x, z: q.z, site: q.id, warn: 0,
text: ["in the " + (q.kind === "ruin" ? "old ruins" : "pod wreck") + " to the " + hmDir(game, q.x, q.z) + " something has started to hum. lights nobody lit are blinking.", "it's a helper from the ark, and it has been asleep for a very long time."],
choices: [
{ key: "wake", label: "💡 help it wake", cost: 8, hint: "it may remember something worth knowing, and where things are" },
{ key: "parts", label: "🔧 take it apart", hint: "good metal and a crystal. it stays quiet for good" },
{ key: "leave", label: "🤫 let it sleep", hint: "it may wake another day" }
] };
},
begin: function (game, inc) {
var I = SB.Ideas, s = st(game);
if (inc.choice === "parts") { drop(game, "metal", 2, inc.x + 0.8, inc.z + 0.4); drop(game, "crystal", 1, inc.x - 0.6, inc.z + 0.6); s.n.machines = (s.n.machines || 0) + 1; }
if (inc.choice === "wake") {
var best = null;
if (I && I.LIST && I.canHold && I.discover) tribe(game).forEach(function (c) {
if (c.stage < 2 || c.tier < 2) return;
var can = I.LIST.filter(function (d) { return !game.culture.found[d.id] && !d.civ && !d.pov && d.id !== "bigthought" && I.canHold(c, d.id); });
if (can.length && (!best || c.tier > best.c.tier)) best = { c: c, d: can[0] };
});
if (best) { I.discover(best.c, best.d.id, game); inc.idea = best.d.name; inc.who = best.c.name; } else sparks(game, 10);
var near = null, bd = 1e9;
(game.sites || []).forEach(function (q) { if (q.found || q.gone) return; var dd = SB.dist(q.x, q.z, inc.x, inc.z); if (dd < bd) { bd = dd; near = q; } });
if (near && SB.World.reveal) { SB.World.reveal(game.world, near.x, near.z, 8); inc.shown = hmDir(game, near.x, near.z); }
D.startTrail(game);
}
return DRend(game, inc, true);
},
finish: function (game, inc) { return inc.choice === "parts" ? "it's in pieces: copper and a crystal, lying in the wreck. ⚙️" : inc.choice === "leave" ? "the humming stops. for now." : "it blinked, whirred, and " + (inc.idea ? "showed " + inc.who + " how to make " + inc.idea : "said something kind. +10 ✨") + (inc.shown ? ". then it lit up a place on the map, to the " + inc.shown + "." : "."); } }
];
function coldTick(game) {
var s = st(game), c = s.cold;
if (!c) return;
if (game.time >= c.until) { s.cold = null; if (c.how === "tough") sparks(game, 5); emit("darkColdEnd", { how: c.how }); tell(game, "🌤 the cold snap has broken." + (c.how === "tough" ? " everyone got through it. +5 ✨" : "")); return; }
var w = game.world, k = c.how === "tough" ? 1 : 0.7;
if (c.how === "fires") fires(game, 30).forEach(function (b) { b.data.fuel = Math.max(b.data.fuel || 0, 0.5); b.data.lit = true; });
tribe(game).forEach(function (o) {
if (c.how === "huddle" && w.night && !o._pov) o.shelterT = Math.max(o.shelterT || 0, 10);
if (o.inBed || (SB.World.shelterAt && SB.World.shelterAt(w, o.x, o.z)) || (SB.World.nearestFire && SB.World.nearestFire(w, o.x, o.z, 6))) return;
o.chem.cold = Math.min(1, (o.chem.cold || 0) + 0.08 * k);
});
w.structures.forEach(function (b) { if (b.kind === "farm" && b.done && b.data && b.data.grow > 0) b.data.grow = Math.max(0, b.data.grow - 0.002 * k); });
}
function ensureBoard(game) {
var hm = home(game);
if (findStruct(game, "noticeboard", "board")) return;
var p = spotAt(game, hm.x, hm.z, 2.5, 4.5, dice(game, "boardspot"), null) || { x: r1(hm.x + 3), z: r1(hm.z + 1) };
putStruct(game, "noticeboard", p.x, p.z, "board");
}
function slow(game) {
var s = st(game), w = game.world, B = SB.Bosses;
D.wrap();
ensureBoard(game);
if (!s.board.day) D.refresh(game);
if (B && B.state) { var bl = B.state(game).list || {}; for (var id in bl) if (bl[id] && bl[id].beaten && D.LIFTS[id] && !s.lift[id]) D.lift(game, id, bl[id].x, bl[id].z, true); }
w.structures.forEach(function (b) { if ((b.kind === "lightwell" || b.kind === "noticeboard") && !b.done) { b.done = true; b.need = {}; b.noun = "wonder"; } }); // a grump can knock one flat; it stands back up
game.creatures.forEach(function (g) {
if (g.species !== "grump" || !g.alive || g._dk) return;
g._dk = 1;
if (s.lift.gloom && w.night && !g.raider && !g.scout && !g.boss && !g.prowler && !g.dark && g.carry == null && Math.random() < 0.34) { g.goingHome = true; s.n.turned = (s.n.turned || 0) + 1; }
});
if (s.lift.murk && w.night && !postOf(game, "named-snuff") && !s.raid.siege) fires(game, 30).forEach(function (b) { if (b.data.lit && (b.data.fuel || 0) < 0.3) b.data.fuel = 0.3; });
coldTick(game);
twists(game);
if (s.raid.siege && game.time >= s.raid.siege.until) { s.posts.filter(function (p) { return p.kind === "siege"; }).forEach(function (p) { dropPost(game, p, "bored"); }); s.raid.siege = null; s.board.list.forEach(function (e) { if (e.kind === "siege" && !e.done) { e.done = true; e.doneDay = day(game); e.paid = "they left"; } }); emit("darkSiege", { over: true, broken: false }); tell(game, "⛺ the besiegers got bored and went home."); }
var DR = SB.Director, far = D.rank(game, "far").key;
if (DR && DR.caravan && DR.healer) { DR.caravan.w = far === "friends" || far === "kin" ? 2 : 1; DR.healer.w = far === "friends" || far === "kin" ? 2.4 : 1.2; }
}
function fast(game) {
var s = st(game), mine = me(), DR = SB.Director;
postsTick(game);
boardTick(game);
chiefTick(game);
if (mine) trailStep(game, mine);
if (s.raid.scouts && (game.time >= s.raid.scouts.until || !s.posts.some(function (p) { return p.kind === "scout"; }))) endScouts(game);
if (s.raid.pending && DR && !DR.state(game).active && !(DR.danger && DR.danger(game))) { s.raid.pending = 0; DR.fire(game, "raid"); }
}
var tF = 0, tS = 0;
D.tick = function (game, dt) {
if (!game || game.offline || !D.open(game)) return;
if ((tF -= dt) <= 0) { tF = 0.5; fast(game); }
if ((tS -= dt) <= 0) { tS = 2; slow(game); }
};
D.dusk = function (game) {
if (!game || !D.open(game)) return;
var s = st(game);
siegeNight(game);
if (!D.namedOk(game) || D.namedOut(game).length || game.time < (s.raid.truce || 0)) return;
if (day(game) < (s.nextNamed || 0)) return;
var nx = D.nextNamed(game);
if (nx) D.spawnNamed(game, nx.id);
};
D.dawn = function (game) {
if (!game || !D.open(game)) return;
var s = st(game), hm = home(game), d = day(game);
D.FACTIONS.forEach(function (f) { var v = D.standing(game, f.id); if (v !== f.base) D.move(game, f.id, v > f.base ? -1 : 1, "drift"); });
var wr = D.rank(game, "wild").i;
if (wr >= 2) { drop(game, "berry", 2, hm.x - 1.2, hm.z + 0.8); emit("darkWildGift", {}); }
if (wr >= 3 && d - (s.wildDay || 0) >= 3) { var c = newcomer(game, hm.x + 5, hm.z + 3, false, "wild"); if (c) { s.wildDay = d; s.n.wildJoined = (s.n.wildJoined || 0) + 1; emit("darkJoined", { c: c, how: "wild" }); tell(game, "🐾 " + c.name + ", one of the wild smols, walked in at dawn and stayed."); } }
s.posts.slice().forEach(function (p) {
if (p.kind !== "named" || p.camp != null || d - p.day < D.NAMED_NIGHTS || dueling(postGrump(game, p))) return;
(p.stolen || []).length && tell(game, "🧺 " + p.name + " went off with " + p.stolen.length + " of your things.");
s.board.list.forEach(function (e) { if (e.kind === "named" && e.ref === p.key && !e.done) { e.done = true; e.doneDay = d; e.paid = "it got away"; } });
dropPost(game, p, "left"); s.nextNamed = d + 1;
emit("darkNamedLeft", { post: p });
});
D.refresh(game);
grumpStory(game, me());
};
var hooked = false;
D.hook = function () {
if (hooked || !SB.bus) return; hooked = true;
var on = SB.bus.on;
on("dusk", function () { var g = cur(); if (g && !g.offline) D.dusk(g); });
on("dawn", function () { var g = cur(); if (g && !g.offline) D.dawn(g); });
on("bossBeaten", function (d) { var g = cur(); if (!g || !d || !d.boss) return; D.lift(g, d.boss.id, d.x, d.z); D.move(g, "grumps", -15, "beat " + d.boss.name); });
on("grumpChased", function (d) {
var g = cur(); if (!g || !d || !d.g || !D.open(g)) return;
var p = d.g.dark ? postOf(g, d.g.dark) : null;
if (p) { postDone(g, p, d.c || null, "beaten"); return; }
if (d.g.dark === "chief") chiefDown(g, d.g, d.c || null);
if (!d.g.boss) D.move(g, "grumps", -2, "a fight");
});
on("incidentEnd", function (d) {
var g = cur(), inc = d && d.inc; if (!g || !inc || !D.open(g)) return;
if (inc.id === "raid") raidOver(g, inc, !!d.ok);
if (inc.id === "camp" && d.ok) { D.move(g, "grumps", -10, "freed a camp"); D.move(g, "far", 6, "freed their kin"); st(g).chain.b.wall = st(g).chain.b.wall || day(g); grumpStory(g, me()); }
});
on("strangerJoined", function () { var g = cur(); if (g && D.open(g)) D.move(g, "far", 8, "welcomed a stranger"); });
on("strangerLeft", function (d) { var g = cur(); if (g && D.open(g) && d && !d.auto && d.c && d.c.stranger && !d.c.stranger.exiled) D.move(g, "far", -8, "sent a stranger away"); });
on("siteFound", function () { var g = cur(); if (g && D.open(g)) D.startTrail(g); });
on("chestOpened", function () { var g = cur(); if (g && D.open(g)) D.startTrail(g); });
};
D.hook();
D.wrap();
D.optionsHook = function (game, c, r, o, x) {
if (!D.open(game)) return;
var ref = r && r.ref, t;
if (r && r.type === "struct" && ref && ref.kind === "lightwell") {
var w = st(game).wells[String(ref.data && ref.data.dk).replace("well-", "")];
o.use = w && w.last === day(game) ? x.no("the well is resting until dawn") : x.op("rest in the light", function () { var rr = D.rest(game, c, ref); x.say(rr.msg); if (rr.ok) x.audio("achievement", 0.7); return rr.ok; }, null);
o.place = x.op("open the light forge", function () { x.openBag("dark"); return true; }, null);
} else if (r && r.type === "struct" && ref && ref.kind === "noticeboard") {
o.use = x.op("read the notice board", function () { x.openBag("dark"); return true; }, null);
o.place = o.use;
} else if (r && r.type === "creature" && ref && ref.species === "grump" && ref.dark && (t = postOf(game, ref.dark)) && t.kind === "named" && D.hp(game, t.key) <= 0.5) {
o.place = x.op("let " + t.name + " go", function () { var rr = D.release(game, c, ref); x.say(rr.msg); if (rr.ok) x.audio("chime"); return rr.ok; }, null);
} else if (r && r.type === "creature" && ref && ref.stranger && ref.stranger.state !== "leaving" && x.hk && Sv().edible(x.hk) && !o.place) {
o.place = x.op("give " + ref.name + " your " + label(x.hk), function () { var rr = D.gift(game, c, "far"); x.say(rr.msg); if (rr.ok) x.audio("chime"); return rr.ok; }, null);
}
if (x.hk === "cinder" && (!o.place || o.place.locked || /^put down/.test(o.place.label || ""))) o.place = x.op("light a ward fire with your cinder", function () { var rr = D.ward(game, c); x.say(rr.msg); if (rr.ok) x.audio("build", 0.8); return rr.ok; }, null);
if (x.hk === "warhorn" && (!o.place || o.place.locked || /^put down/.test(o.place.label || ""))) o.place = x.op("blow the grump horn (calls a war party)", function () { var rr = D.blowHorn(game, c); x.say(rr.msg); if (rr.ok) x.audio("grump", 1); return rr.ok; }, null);
};
D.damageHook = function (game, c, target) { return Sv() && Sv().count(c, "duskcharm", true) > 0 ? 1.25 : 1; };
D.goalsHook = function (game, add) {
if (!D.open(game) || !game.quests || !game.quests.dark) return;
var s = st(game), n = 0, mine = me();
s.board.list.forEach(function (e) { if (e.done || n >= 3) return; var p = D.progress(game, e, mine); add("📜 " + e.icon + " " + e.t, e.kind === "bring" ? p[0] + "/" + p[1] : e.pay + " 🐚", false, e.kind === "named" || e.kind === "siege"); n++; });
var hint = D.trailHint(game);
if (hint) add("🧭 the officer's trail: look " + hint, (s.chain.a.step - 1) + "/4", false, false);
if (s.raid.scouts) add("👀 chase off the grump scouts before they report back", "", false, true);
};
D.vitalsHook = function (game, c) {
if (!D.open(game) || !game.quests || !game.quests.dark) return null;
var s = st(game), out = [];
if (s.cold && game.time < s.cold.until) out.push({ icon: "🥶", text: "cold snap", bad: true, tip: "keep near a fire or under a roof" });
if (s.eclipse && game.time < s.eclipse) out.push({ icon: "🌘", text: "dark sun", bad: true });
if (s.raid.siege) out.push({ icon: "⛺", text: "siege", bad: true });
else if (game.time < (s.raid.truce || 0)) out.push({ icon: "🏳", text: "truce" });
return out;
};
D.html = function (game, c, icon) {
icon = icon || function () { return ""; };
var s = st(game), b = s.board, out = "", hm = home(game), atV = D.atVillage(game, c);
var open = b.list.filter(function (e) { return !e.done; }), done = b.list.filter(function (e) { return e.done; });
out += "<div class='lbl'>📜 the council's notice board · " + (b.seals || 0) + " seals" + (b.prizes < D.PRIZES.length ? " · next prize at " + D.PRIZES[b.prizes || 0][0] : "") + "</div><div class='rlist'>";
if (!open.length) out += "<p class='help'>nothing posted today. new notices go up at dawn.</p>";
open.forEach(function (e) {
var p = D.progress(game, e, c), where = e.x != null ? " · " + Math.round(SB.dist(c.x, c.z, e.x, e.z)) + "m " + dirOf(e.x - c.x, e.z - c.z) : "";
out += "<div class='rc'><span class='big'>" + e.icon + "</span><div class='t'>" + esc(e.t) + "<small>pays " + e.pay + " " + (b.pay === "shells" ? "🐚" : "(as ✨: " + Math.ceil(e.pay / 2) + ")") + esc(where) + (e.kind === "bring" ? " · you have " + p[0] + "/" + p[1] + (atV ? "" : " · hand in at the village") : "") + "</small></div>" +
(e.kind === "bring" ? "<button class='btn go' data-dkhand='" + e.id + "' " + (p[0] >= p[1] && atV ? "" : "disabled") + ">hand in</button>" : "") + "</div>";
});
done.forEach(function (e) { out += "<div class='rc'><span class='big'>" + e.icon + "</span><div class='t'>" + esc(e.t) + "<small>" + esc(e.paid || "done") + (e.by ? " · " + esc(e.by) : "") + "</small></div><span class='ok'>✓</span></div>"; });
out += "</div><div class='row' style='display:flex;flex-wrap:wrap;gap:4px'><button class='btn" + (b.pay === "shells" ? " go" : "") + "' data-dkpay='shells'>pay me in shells</button><button class='btn" + (b.pay === "sparks" ? " go" : "") + "' data-dkpay='sparks'>pay the Lantern in sparks</button></div>";
out += "<div class='lbl'>how the island sees your tribe</div><div class='rlist'>";
var spots = D.giftSpots(game, c);
D.FACTIONS.forEach(function (f) {
if (f.x2 && !(D.metFaction && D.metFaction(game, f.id))) return; // the three later peoples show once you have met them
var rk = D.rank(game, f.id), h = D.hearts(game, f.id), hs = "", can = spots.filter(function (o) { return o.id === f.id; })[0];
for (var i = 1; i <= 5; i++) hs += i <= h ? "♥" : "♡";
out += "<div class='rc'><span class='big'>" + f.icon + "</span><div class='t'>" + esc(f.name) + (f.chief ? " (" + esc(f.chief) + ")" : "") + " · " + hs + " " + esc(rk.key) + "<small>" + esc(rk.does) + "</small></div>" + (can ? "<button class='btn' data-dkgift='" + f.id + "' " + (foodSlot(c) ? "" : "disabled") + ">leave a gift</button>" : "") + "</div>";
});
out += "</div>";
var lifts = Object.keys(D.LIFTS).filter(function (id) { return s.lift[id]; });
if (lifts.length) {
var atW = D.atWell(game, c);
out += "<div class='lbl'>what changed when the captains fell</div><div class='rlist'>";
lifts.forEach(function (id) { var L = D.LIFTS[id]; out += "<div class='rc'><span class='big'>" + L.icon + "</span><div class='t'>" + esc(L.name) + "<small>" + esc(L.ends) + ". " + esc(L.opens) + ".</small></div></div>"; });
out += "</div><div class='lbl'>the light forge · " + (atW ? "you're at a well of light" : "stand at a well of light to use it") + "</div><div class='rlist'>";
D.FORGE.forEach(function (f) {
if (!s.lift[f.lift] || !K[f.id]) return;
var needs = [];
for (var k in f.cost) { var n = Sv().count(c, k, true); needs.push("<span class='" + (n >= f.cost[k] ? "ok" : "no") + "'>" + icon(k, 16) + " " + Math.min(n, f.cost[k]) + "/" + f.cost[k] + " " + esc(label(k)) + "</span>"); }
out += "<div class='rc'><span class='big'>" + K[f.id].emoji + "</span><div class='t'>" + esc(label(f.id)) + "<small>" + esc(f.perk) + "</small><div class='need'>" + needs.join("") + "</div></div><button class='btn go' data-dkforge='" + f.id + "' " + (D.forgeWhy(game, c, f.id) ? "disabled" : "") + ">make</button></div>";
});
out += "</div>";
}
var tl = D.teller(game), mercy = D.hurting(game);
out += "<div class='lbl'>who tells the story</div><div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
D.TELLERS.forEach(function (t) { out += "<button class='btn" + (t.id === tl.id ? " go" : "") + "' data-dkteller='" + t.id + "'>" + t.icon + " " + esc(t.name) + "</button>"; });
out += "</div><p class='help'>" + esc(tl.line) + (mercy ? " your tribe is hurting (" + (mercy === "few" ? "so few of you" : mercy === "grief" ? "a loss, not long ago" : "hungry") + "): the next trouble is held back, or comes softer." : "") + "</p>";
if (s.pages.length) {
out += "<div class='lbl'>found things</div>";
s.pages.forEach(function (p) { var P0 = D.PAGES[p.id]; if (P0) out += "<p><b>" + esc(P0[0]) + "</b><br>" + esc(P0[1]) + "</p>"; });
var hint = D.trailHint(game);
if (hint) out += "<p class='help'>🧭 the next mark is " + esc(hint) + ". walk there in a body.</p>";
}
if (D.html2) out += D.html2(game, c, icon);
return out;
};
D.wire = function (root, game, c, redraw, say) {
if (D.wire2) D.wire2(root, game, c, redraw, say);
function done(r) { if (r && r.msg && say) say(r.msg); if (r && r.ok && SB.Audio && SB.Audio.play) SB.Audio.play("craft"); redraw(); }
function each(sel, fn) { root.querySelectorAll("[" + sel + "]").forEach(function (b) { b.addEventListener("click", function () { fn(b.getAttribute(sel)); }); }); }
each("data-dkhand", function (v) { done(D.handIn(game, c, +v)); });
each("data-dkpay", function (v) { D.setPay(game, v); redraw(); });
each("data-dkgift", function (v) { done(D.gift(game, c, v)); });
each("data-dkforge", function (v) { done(D.forge(game, c, v)); });
each("data-dkteller", function (v) { D.setTeller(game, v); if (say) say(D.teller(game).icon + " " + D.teller(game).name + " tells it now: " + D.teller(game).line); redraw(); });
};
var X = SB.Ext;
if (X && X.on) {
X.on("tick", D.tick);
X.on("options", D.optionsHook);
X.on("damage", D.damageHook);
X.on("goals", D.goalsHook);
X.on("vitals", D.vitalsHook);
X.tab({ id: "dark", label: function () { return "📜 notices"; }, show: function (game) { return D.open(game); }, html: D.html, wire: D.wire });
}
var ME = SB.Meshes || SB.ME;
function well() {
var b = ME.builder();
b.color(0x8a8794).push().translate(0, 0.14, 0).box(0.9, 0.28, 0.9).pop();
b.color(0x6f6c7a).push().translate(0, 0.32, 0).box(0.7, 0.1, 0.7).pop();
b.color(0xfff2a0).push().translate(0, 0.62, 0).box(0.26, 0.5, 0.26).pop();
b.color(0xffffff).push().translate(0, 0.98, 0).box(0.14, 0.2, 0.14).pop();
return b.finish();
}
function board() {
var b = ME.builder();
b.color(0x7a4a26).push().translate(-0.34, 0.5, 0).box(0.08, 1, 0.08).pop().push().translate(0.34, 0.5, 0).box(0.08, 1, 0.08).pop();
b.color(0xc9935a).push().translate(0, 0.72, 0).box(0.8, 0.5, 0.06).pop();
b.color(0xf5f0dc).push().translate(-0.18, 0.76, 0.04).box(0.22, 0.28, 0.02).pop().push().translate(0.16, 0.7, 0.04).box(0.2, 0.24, 0.02).pop();
b.color(0x8a5630).push().translate(0, 1.02, 0).box(0.9, 0.08, 0.14).pop();
return b.finish();
}
if (ME && ME.STRUCT_BUILDERS && ME.builder) { try { ME.STRUCT_BUILDERS.lightwell = well; ME.STRUCT_BUILDERS.noticeboard = board; } catch (e) {} }
})();
(function () {
"use strict";
var SB = window.SB, D = SB.Dark, h = D._h, K = SB.KINDS, SK = SB.STRUCTS;
if (!D || !h) return;
var st = h.st, day = h.day, home = h.home, tribe = h.tribe, topTier = h.topTier, label = h.label, dice = h.dice, spotAt = h.spotAt, drop = h.drop, give = h.give, tell = h.tell, emit = h.emit, sparks = h.sparks, me = h.me, esc = h.esc, dirOf = h.dirOf, Sv = h.Sv, r1 = h.r1, r2 = h.r2;
function kind(id, def) { if (!K[id]) K[id] = def; }
function toy(id, lab, emoji, color, desc, more) { var d = { noun: "toy", label: lab, emoji: emoji, r: 0.12, color: color, desc: desc }; if (more) for (var k in more) d[k] = more[k]; kind(id, d); }
kind("giantfluff", { noun: "material", label: "giant's fluff", emoji: "☁️", r: 0.14, color: 0xf2efe6, mat: 1, desc: "shed by the gentle giant. the softest thing on the island." });
kind("gloomstone", { noun: "material", label: "gloomstone", emoji: "🌑", r: 0.12, color: 0x3a3350, mat: 1, desc: "a lump of set dark, from a knot or a patch. the light forge has uses for it." });
kind("starfruit", { noun: "food", label: "star-fruit", emoji: "🌟", r: 0.13, color: 0xffe066, food: { hunger: -0.5 }, chem: { glucose: 0.3 }, desc: "it only blooms now and then. a whole meal, and a good mood with it." });
kind("bugjelly", { noun: "food", label: "bug jelly", emoji: "🍮", r: 0.12, color: 0xb6e36a, food: { hunger: -0.35 }, chem: { glucose: 0.25 }, desc: "what the cave bugs guard. sweet, wobbly, worth it." });
kind("sweet", { noun: "food", label: "holiday sweet", emoji: "🍬", r: 0.1, color: 0xff8fb3, food: { hunger: -0.2 }, chem: { glucose: 0.2 }, desc: "left at the nest on a special day." });
toy("grumpmask", "grump mask", "👹", 0x6a5a7a, "wear it (keep it in your bag) and camp grumps leave you be, until you touch their hoard.");
toy("tripwire", "vine tripwire", "🪢", 0x6f9a4a, "put it down on a path. the first grump through is tangled, and the village wakes.");
toy("taunt", "taunt drum", "🥁", 0x9a5a3a, "beat it at night and the grumps come in waves, for a score. beat it in the old ring for a harder run.");
toy("glowbait", "glow bait", "🪱", 0x9aff8a, "fish with this at the shore and something very big may take it.");
toy("darkidol", "dark idol", "🗿", 0x2e2a3a, "set it down and something answers. you built this. are you sure?");
toy("book", "a book", "📕", 0xa8523a, "a book. hold it and read it.");
toy("starchart", "the ark's star chart", "🗺", 0x9fc4ff, "read it at the star dome, or a well of light, for a vision.", { quest: 1 });
toy("socks", "the chief's lucky socks", "🧦", 0xff6a6a, "somebody important is missing these. take them home, or wear them to a feast for a laugh.", { quest: 1 });
toy("keepsake", "the Lantern's keepsake", "🏮", 0xfff2a0, "for an island done properly. it glows a little when you are proud of them.", { quest: 1, glow: 1 });
toy("shinycube", "the shiny cube", "🟨", 0xffd84a, "every smol wants to stare at it. keep it in your bag and they get on with things.");
toy("duskkey", "dusk key", "🗝", 0x7a6cff, "leave it in a cache at dusk and its keeper comes.");
toy("firework", "firework", "🎆", 0xff5ad0, "for feasts. thinkers make them.");
toy("paperlantern", "paper lantern", "🏮", 0xffb060, "floats off on a calm night.");
toy("badge", "watch badge", "🛡", 0xc0c8d8, "you stand a rank in the night watch.", { quest: 1 });
D.QUEST = { starchart: 1, socks: 1, keepsake: 1, badge: 1 };
if (!SK.darkmark) SK.darkmark = { noun: "wonder", label: "a marked place", emoji: "❖", r: 0.4, cost: {}, work: 1, desc: "something is here. look at it in a smol's body." };
function X2(game) {
var s = st(game), x = s.x2, k;
if (!x || typeof x !== "object") x = s.x2 = {};
var objs = ["n", "seen", "big", "skies", "lines", "medals", "rules", "met", "hol", "scenes", "feats", "did", "circ", "ends"], arrs = ["places", "wishes", "guests", "pen", "boons", "clubs", "watch", "books", "conds"];
for (k = 0; k < objs.length; k++) if (!x[objs[k]] || typeof x[objs[k]] !== "object") x[objs[k]] = {};
for (k = 0; k < arrs.length; k++) if (!Array.isArray(x[arrs[k]])) x[arrs[k]] = [];
if (!x.pid) x.pid = 1;
return x;
}
D.x2 = X2;
function bump(game, key, by) { var x = X2(game); x.n[key] = (x.n[key] || 0) + (by == null ? 1 : by); return x.n[key]; }
function cnt(game, key) { return X2(game).n[key] || 0; }
D.count2 = cnt; D._bump = bump;
function biomeId(game, x, z) { var b = SB.World.biomeAt ? SB.World.biomeAt(game.world, x, z) : null; return b == null ? "" : typeof b === "number" ? ((SB.BIOMES[b] || {}).id || "") : (b.id || String(b)); }
D.biomeId = biomeId;
function biomeSpot(game, ids, r) {
var w = game.world, N = w.T.N, W = SB.World;
for (var t = 0; t < 160; t++) {
var x = 6 + r() * (N - 12), z = 6 + r() * (N - 12);
if (ids && ids.indexOf(biomeId(game, x, z)) < 0) continue;
if (W.walkable && !W.walkable(w, x, z, false)) continue;
if (W.depthAt && W.depthAt(w, x, z) > 0.05) continue;
return { x: r1(x), z: r1(z) };
}
return null;
}
function capBeat(game) { return SB.Bosses && SB.Bosses.beaten ? SB.Bosses.beaten(game) : 0; }
function beaconUp(game) { return !!game.ended || game.world.structures.some(function (b) { return b.kind === "spire" && b.done; }); }
function hasStruct(game, k) { return game.world.structures.some(function (b) { return b.kind === k && b.done; }); }
function hurt(c, v) { c.chem.health = Math.max(0.25, c.chem.health - v); }
function chem(c, d) { if (SB.Chem && SB.Chem.apply) SB.Chem.apply(c.chem, d); }
function lit(game, c) { return !!(Sv() && (Sv().has(c, "torch") || Sv().has(c, "cinder"))) || !!(SB.World.nearestFire && SB.World.nearestFire(game.world, c.x, c.z, 6)); }
function toolDmg(c) { var hd = Sv() && Sv().held ? Sv().held(c) : null, T = hd && Sv().TOOL ? Sv().TOOL[hd.k] : null; return T ? T.dmg || 0 : 0; }
function hasTool(c) { var hd = Sv() && Sv().held ? Sv().held(c) : null; return !!(hd && K[hd.k] && K[hd.k].tool); }
function hasAll(c, cost) { for (var k in cost) if (Sv().count(c, k, true) < cost[k]) return false; return true; }
function takeAll(c, cost) { for (var k in cost) Sv().take(c, k, cost[k]); }
function costText(cost) { var out = []; for (var k in cost) out.push(cost[k] + " " + label(k)); return out.join(", "); }
function knock(game, c, fx, fz, d) { var a = Math.atan2(c.x - fx, c.z - fz), x = c.x + Math.sin(a) * d, z = c.z + Math.cos(a) * d; if (SB.World.walkable(game.world, x, z)) { c.x = x; c.z = z; return true; } return false; }
function psay(text) { var P = SB.Possess; if (P && P.active && P.say) { try { P.say(text); } catch (e) {} } }
function harsh(game) { var s = game.settings || {}; return s.wilds === "harsh" || s.difficulty === "hard" || s.difficulty === "brutal"; }
D.harsh = harsh;
D.luck = function (game) { var v = dice(game, "luck" + day(game))() * 2 - 1; if (D.hasBoon && D.hasBoon(game, "lucky")) v = Math.min(1, v + 0.3); return r2(v); };
D.luckLine = function (game) { var v = D.luck(game); return v > 0.5 ? "the stars feel kind today" : v > 0 ? "an ordinary sort of day, leaning good" : v > -0.5 ? "an ordinary sort of day, leaning odd" : "the stars are in a mood today. go carefully"; };
function lucky(game, p) { return Math.random() < p * (1 + 0.4 * D.luck(game)); }
function B(id, name, icon, twist, tough, dmg, speed, size, pay, tier, more) { var d = { id: id, name: name, icon: icon, twist: twist, tough: tough, dmg: dmg, speed: speed, size: size, pay: pay, tier: tier }; if (more) for (var k in more) d[k] = more[k]; return d; }
var COLD = ["tundra", "taiga"], WET = ["swamp", "mangrove"], DRY = ["desert", "mesa", "savanna"], SEA = ["beach", "reef"], ASH = ["ash", "mesa"], HIGH = ["mountain", "crystal"], WOOD = ["forest", "taiga", "maple", "jungle", "bamboo"];
D.BEASTS = [
B("boggrump", "a bog grump", "🐸", "leaves you poorly with every bite", 1.3, 0.1, 0.8, 1.1, 5, 1, { biome: WET, bite: { sick: 0.25 } }),
B("dustgrump", "a dust grump", "🏜", "dries you out with every bite", 1.2, 0.1, 0.95, 1, 5, 1, { biome: DRY, thirst: 0.3 }),
B("shoregrump", "a shore grump", "🐚", "knocks you toward the water", 1.2, 0.09, 0.9, 1, 5, 1, { biome: SEA, biteKnock: 3 }),
B("frostgrump", "a frost grump", "🧊", "chills you to the bone with every bite", 1.4, 0.1, 0.85, 1.1, 6, 1, { cold: 1, bite: { cold: 0.35 } }),
B("thrower", "a rock-throwing grump", "🪨", "keeps its distance and throws rocks. get in close", 1.1, 0.07, 1, 0.95, 6, 2, { ranged: 4, shot: 0.06 }),
B("chillthrower", "an ice-thrower", "❄️", "throws lumps of ice that chill you. get in close", 1.1, 0.07, 1, 0.95, 7, 2, { cold: 1, ranged: 4, shot: 0.05, shotChem: { cold: 0.3 } }),
B("sickthrower", "a muck-thrower", "🤢", "throws muck that turns your stomach. get in close", 1.1, 0.07, 1, 0.95, 7, 2, { biome: WET, ranged: 4, shot: 0.05, shotChem: { sick: 0.2 } }),
B("shaman", "a grump shaman", "🧪", "throws brews: one makes you sleepy, one scared, one poorly", 1.5, 0.08, 0.85, 1.1, 9, 3, { night: 1, ranged: 5, shot: 0.04, brews: 1 }),
B("muckgrump", "a muck hag", "🫧", "lobs glowing muck that slows you right down", 1.6, 0.09, 0.8, 1.2, 9, 3, { biome: WET, ranged: 5, shot: 0.05, shotChem: { tired: 0.25 } }),
B("firespitter", "a fire-spitter", "🔥", "spits sparks from across the ash. get in close", 1.5, 0.09, 0.9, 1.1, 9, 3, { biome: ASH, ranged: 3.5, shot: 0.07, shotChem: { pain: 0.2 }, drop: ["cinder", 1] }),
B("floater", "a drifting thing", "🎈", "spits slow shots you can bat back: swing as they come", 1.6, 0.06, 0.6, 1.4, 10, 3, { biome: ASH.concat(HIGH), ranged: 4, shot: 0.08, bat: 1 }),
B("shellthing", "a shell thing", "🐌", "its shots toss you off your feet", 1.4, 0.06, 0.5, 1, 9, 3, { biome: HIGH.concat(["mesa"]), ranged: 4.5, shot: 0.03, shotKnock: 3.5 }),
B("spikehulk", "a spike hulk", "🦔", "fires a spray of spines when you stand off", 2.2, 0.1, 0.7, 1.5, 11, 4, { after: 2, ranged: 5, shot: 0.09 }),
B("burster", "a creeping grump", "💥", "creeps up and bursts, wrecking whatever is nearest. chase it off fast", 0.9, 0.05, 1.05, 0.9, 7, 2, { night: 1, fuse: 9 }),
B("starer", "a tall thin grump", "🧍", "leaves you alone unless you stare at it", 1.8, 0.14, 1.15, 1.5, 8, 2, { night: 1, stare: 1 }),
B("blob", "a bog blob", "🟢", "splits in two when it is beaten", 1, 0.07, 0.8, 1.1, 5, 1, { biome: WET.concat(["jungle"]), split: ["bloblet", 2] }),
B("bloblet", "a little blob", "🟢", "is half of something bigger", 0.5, 0.05, 0.9, 0.6, 0, 0, { child: 1 }),
B("beetles", "a biting beetle swarm", "🪲", "breaks into three when you scatter it", 0.6, 0.05, 1.1, 0.5, 4, 1, { only: 1, split: ["biter", 3] }),
B("biter", "a biting beetle", "🪲", "bites ankles", 0.34, 0.04, 1.2, 0.35, 0, 0, { child: 1 }),
B("climber", "a wall-creeper", "🕷", "comes over the wall, and its bite is poison", 1.2, 0.09, 1.1, 0.9, 7, 3, { only: 1, night: 1, bite: { sick: 0.35 } }),
B("windgrump", "a wind grump", "🌪", "leaps about and blows you off your feet", 1.3, 0.07, 1.3, 1, 8, 3, { biome: HIGH.concat(DRY), wind: 5 }),
B("ventcube", "a hopping vent cube", "🧊", "swallows something from your bag with every bite. beat it to get them back", 1.5, 0.07, 0.9, 1.1, 8, 3, { biome: ASH, swallow: 1 }),
B("gulper", "a gulper", "👄", "swallows what you carry, a thing a bite", 2, 0.1, 0.9, 1.4, 10, 4, { after: 2, swallow: 1 }),
B("creaker", "a creaking thing", "🌲", "only moves when you are not looking, and nothing marks it until its heart tree is broken", 2, 0.12, 0.7, 1.4, 10, 3, { biome: WOOD, unwatched: 1, heart: 1 }),
B("rider", "a grump on a beast", "🐗", "rides something. beat the rider and the beast fights on", 1.6, 0.11, 1.15, 1.3, 9, 3, { after: 1, split: ["mount", 1] }),
B("mount", "a riderless beast", "🐗", "is cross about its rider", 1.1, 0.09, 1.2, 1.1, 0, 0, { child: 1 }),
B("searider", "a grump on a sea beast", "🐙", "rides in on the surf. beat the rider and the beast fights on", 1.5, 0.1, 1.05, 1.3, 9, 3, { biome: SEA, night: 1, split: ["mount", 1] }),
B("seathing", "a thing in the shallows", "🐡", "guards the wrecks in the coral and stings from a way off", 1.7, 0.08, 0.7, 1.3, 9, 2, { biome: SEA, ranged: 4, shot: 0.06, drop: ["clam", 2] }),
B("lightdrinker", "a light-drinker", "🦇", "drinks the flame off your torch", 1.7, 0.1, 1, 1.2, 10, 3, { night: 1, after: 1, torchEater: 1 }),
B("packhound", "a grump hound", "🐺", "never hunts alone: see its pack off first", 1.5, 0.1, 1.2, 1, 10, 3, { night: 1, minions: 2 }),
B("chimera", "a three-headed grump", "🐲", "brings two more with it, and all three bite", 2, 0.11, 1, 1.4, 11, 4, { after: 2, minions: 2 }),
B("brute", "an armoured brute", "🛡", "wears a hide that turns anything softer than a real weapon", 2.4, 0.13, 0.8, 1.5, 12, 4, { after: 2, armour: 1 }),
B("noctol", "a night-lurker", "🌒", "can't be seen to hit without a light", 1.8, 0.12, 1.1, 1.2, 10, 4, { night: 1, after: 2, needsLight: 1 }),
B("unseen", "an unseen prowler", "👁", "only shows in torchlight: carry a torch or fight by a fire", 1.5, 0.11, 1.1, 1.1, 9, 3, { night: 1, needsLight: 1 }),
B("yawn", "the Yawn", "🥱", "puts smols to sleep, one by one, until somebody finds it", 1.6, 0.08, 0.8, 1.2, 12, 3, { night: 1, nosun: 1, near: 3.5, yawn: 1 }),
B("wisp", "a snow wisp", "🔆", "isn't a grump at all. it drifts off when you get near: follow it", 0.5, 0, 1, 0.5, 0, 1, { cold: 1, night: 1, flee: 1, calm: 1, drop: ["mote", 1] }),
B("wyvern", "a high flyer", "🦅", "swoops, then climbs out of reach. hit it when it lands", 2, 0.12, 1.2, 1.4, 12, 3, { biome: ["mountain"], flyer: 1, phase: 5 }),
B("swooper", "a night swooper", "🦉", "swoops on the village, perches out of reach, then lands to pounce. hurt it enough and it's grounded", 2.4, 0.13, 1.25, 1.6, 14, 4, { night: 1, after: 1, flyer: 1, phase: 6, follow: 1 }),
B("nightflyer", "a sleep-eater", "🦇", "hunts smols who haven't slept. it swoops and climbs", 1.3, 0.09, 1.2, 1, 8, 1, { only: 1, night: 1, flyer: 1, phase: 4, follow: 1 }),
B("echo", "a memory echo", "👻", "flickers in and out. hit it while it is here", 1.2, 0.07, 0.9, 1, 7, 2, { only: 1, night: 1, phase: 4, drop: ["mote", 1] }),
B("sleeper", "an ark sleeper", "🛌", "never woke properly. it only minds if you come right up to its wreck", 1.6, 0.1, 0.7, 1.1, 8, 2, { only: 1, nosun: 1, near: 3.5, drop: ["metal", 1] }),
B("dronelet", "a broken ark drone", "🤖", "never runs, never tires and isn't afraid of fire", 2.2, 0.11, 0.85, 1, 11, 4, { only: 1, nosun: 1, nofear: 1, armour: 0.5, drop: ["metal", 2] }),
B("campguard", "a camp guard", "⛺", "leaves a mask-wearer alone, until you touch the hoard", 1.5, 0.11, 0.95, 1.15, 8, 2, { only: 1, nosun: 1, maskOk: 1 }),
B("lairguard", "a lair guard", "🦴", "leaves a sore that lasts", 1.8, 0.12, 0.95, 1.2, 10, 2, { only: 1, nosun: 1, wound: 1 }),
B("hushguard", "the hollow's keeper", "🤫", "is blind, and hunts by sound: creep", 2.2, 0.14, 1.1, 1.4, 12, 2, { only: 1, nosun: 1, sound: 1 }),
B("blindgrump", "a blind cave grump", "🙈", "can't see you. it hears running, chopping and fighting", 1.4, 0.11, 1.1, 1, 8, 3, { only: 1, nosun: 1, sound: 1 }),
B("stalker", "the stalker", "🕳", "can't be beaten. it hunts by sound: creep past, or creep away", 9, 0.2, 1.1, 1.8, 0, 2, { only: 1, nosun: 1, sound: 1, unbeatable: 1 }),
B("mimic", "a cache with teeth", "🧰", "was pretending to be a chest", 1.5, 0.12, 1, 1, 8, 2, { only: 1, nosun: 1, drop: ["metal", 2] }),
B("grudge", "a grump with a grudge", "😠", "has come looking for YOU, and follows where you go", 1.9, 0.12, 1.05, 1.25, 10, 2, { only: 1, nosun: 1, follow: 1 }),
B("watergrump", "a water grump", "🌊", "came up on your line", 1.4, 0.1, 0.9, 1.1, 8, 1, { only: 1, drop: ["fish", 3] }),
B("meancritter", "a spark-bitten hopper", "🦗", "was a hopper until the dark got into it", 0.7, 0.06, 1.3, 0.6, 4, 1, { only: 1 }),
B("sprite", "a storm sprite", "⚡", "was born in a lightning fire, and stings from a way off", 1, 0.06, 1.2, 0.7, 7, 2, { only: 1, ranged: 3.5, shot: 0.06, shotChem: { pain: 0.15 }, drop: ["mote", 1] }),
B("bug", "a cave bug", "🐛", "guards its jelly", 0.7, 0.06, 1, 0.6, 3, 1, { only: 1, nosun: 1, drop: ["bugjelly", 1] }),
B("ravager", "a smashing beast", "🦏", "goes for farms and walls, not smols", 2.6, 0.12, 0.9, 1.7, 12, 3, { only: 1, smash: 1 }),
B("furybunny", "a furious bunny", "🐇", "has had enough", 0.4, 0.04, 1.4, 0.45, 0, 0, { only: 1 }),
B("kingblob", "the king blob", "👑", "hops, and splits into three when beaten", 3, 0.13, 0.8, 2, 16, 2, { big: 1, split: ["blob", 3], sparks: 12 }),
B("queenblob", "the queen blob", "💎", "splits into three, and each of those splits again", 4.5, 0.15, 1, 2.1, 20, 3, { big: 1, ng: 1, split: ["blob", 3], sparks: 20, call: { bugjelly: 3 } }),
B("nighteye", "the night eye", "👁‍🗨", "came by itself to watch the village. its stare is a fright from any distance", 3, 0.1, 0.7, 1.8, 16, 3, { big: 1, night: 1, ranged: 5, shot: 0.03, shotChem: { fear: 0.4 }, always: 1, sparks: 12 }),
B("chain", "the grump chain", "⛓", "is many grumps moving as one. it splits where you break it", 3, 0.12, 1, 1.7, 18, 3, { big: 1, split: ["chainlink", 2], sparks: 14, call: { gloomstone: 2 } }),
B("chainlink", "half a grump chain", "⛓", "splits again", 1.5, 0.1, 1, 1.2, 0, 0, { child: 1, split: ["bloblet", 2] }),
B("longchain", "the long chain", "🐍", "is a very long line of grumps. it splits, and splits, and splits", 4.5, 0.14, 1.05, 1.9, 24, 4, { big: 1, ng: 1, split: ["chain", 2], sparks: 24, call: { gloomstone: 4 } }),
B("thoughteater", "the thought-eater", "🧠", "hides behind three minions and eats your pep", 3.5, 0.12, 0.8, 1.8, 20, 4, { big: 1, minions: 3, sap: 1, sparks: 18, call: { crystal: 2, gloomstone: 1 } }),
B("queenbee", "the hive queen bee", "🐝", "stings from a way off, and the sting is poison", 2.8, 0.1, 1.2, 1.5, 16, 2, { big: 1, ranged: 3.5, shot: 0.05, shotChem: { sick: 0.2 }, drop: ["honey", 4], sparks: 10 }),
B("hivequeen", "the bug queen", "🪳", "sits behind her brood: see them off first", 3.2, 0.12, 0.7, 1.9, 18, 2, { big: 1, minions: 3, drop: ["bugjelly", 4], sparks: 12 }),
B("wreckwarden", "the wreck's warden", "💀", "seals the ark wreck until it is beaten, and its bite leaves a sore", 3.4, 0.14, 0.95, 1.8, 18, 3, { big: 1, wound: 1, sparks: 14 }),
B("snowbeast", "the winter beast", "🦌", "only walks in winter. its breath freezes", 3.6, 0.14, 0.9, 2, 18, 3, { big: 1, season: 3, bite: { cold: 0.5 }, drop: ["fur", 3], sparks: 14, call: { meat: 1 } }),
B("darkwall", "the wall of dark", "🌫", "can't be walked away from. it follows, and it only gets angrier", 4, 0.13, 1, 2.2, 22, 4, { big: 1, chase: 1, rageAt: 15, sparks: 18, call: { cinder: 2 }, where: ASH }),
B("twin", "one of the twins", "♊", "fights beside its twin. they turn up together", 3, 0.13, 1.05, 1.6, 14, 4, { big: 1, ng: 1, pair: 1, sparks: 12, call: { duskshard: 1, cinder: 1 } }),
B("fourarms", "old four-arms", "🦾", "hits twice as hard, and leaves a sore", 5, 0.2, 0.95, 2, 24, 4, { big: 1, ng: 1, wound: 1, sparks: 24, call: { iron: 1 } }),
B("treegiant", "the tree giant", "🌳", "throws thorns when you stand off, and gets angrier as it goes", 4.2, 0.14, 0.7, 2.3, 22, 4, { big: 1, ranged: 4, shot: 0.07, rageAt: 30, drop: ["seed", 4], sparks: 18 }),
B("stoneguard", "the ruin's guardian", "🗿", "is stone. only a real weapon marks it", 5, 0.16, 0.7, 2.1, 22, 4, { big: 1, armour: 1, drop: ["crystal", 2], sparks: 18 }),
B("seaduke", "the sea duke", "🐟", "leaps out of the surf, dives, and leaps again", 4.5, 0.16, 1.3, 2, 24, 4, { big: 1, phase: 5, flyer: 1, drop: ["fish", 5], sparks: 20, call: { glowbait: 1 }, where: SEA }),
B("lightbeing", "the bright one", "🌈", "is far, far worse by day. call it at night", 4, 0.1, 1.2, 1.8, 24, 5, { big: 1, dayRage: 3, sparks: 22, call: { mote: 3 } }),
B("hexer", "the grump hexer", "🔮", "stands at the wreck behind two minions, throwing brews. when it falls, the last act begins", 3.6, 0.1, 0.9, 1.6, 20, 4, { big: 1, minions: 2, ranged: 5, shot: 0.05, brews: 1, sparks: 16, call: { gloomstone: 3 }, after: 3 }),
B("thedark", "the dark itself", "🌚", "is what sent the captains. minions first, then it swoops and climbs, then it rages", 7, 0.18, 1.1, 2.6, 40, 4, { big: 1, minions: 3, flyer: 1, phase: 7, rageAt: 40, sparks: 40 }),
B("builtone", "the thing you built", "☠️", "throws dark from a way off and leaves a sore. you did set it down", 4, 0.14, 1, 1.9, 20, 3, { big: 1, ranged: 4, shot: 0.07, wound: 1, sparks: 18 }),
B("seawarden", "the old one of the shallows", "🦑", "saps the pep out of you while you fight", 3.5, 0.12, 0.8, 1.9, 18, 3, { big: 1, sap: 1, drop: ["clam", 4], sparks: 14, call: { fish: 3 }, where: SEA }),
B("torchgod", "the dark that hates torches", "🕯", "can't be hit. dodge it for forty seconds and it gives up", 6, 0.1, 1.2, 1.6, 0, 2, { big: 1, night: 1, outlast: 40, sparks: 12, call: { torch: 3 } }),
B("raftboss", "the raft boss", "🏴", "came ashore last, with the biggest stick", 2.8, 0.13, 0.95, 1.6, 14, 3, { big: 1, only: 1, sparks: 10, drop: ["metal", 2] }),
B("fortchief", "the fort's chief", "🪖", "wears armour and has a pack", 3, 0.14, 0.95, 1.6, 16, 3, { big: 1, only: 1, armour: 0.5, minions: 2, sparks: 12 }),
B("falselantern", "the false lantern", "🪔", "glows like a friend. by day it is far worse", 4.4, 0.14, 1, 2, 24, 4, { big: 1, only: 1, dayRage: 2, sparks: 20 }),
B("tearkeeper", "the keeper of the tear", "🌀", "blows you about and flickers in and out", 3.6, 0.13, 1.1, 1.8, 20, 3, { big: 1, only: 1, wind: 6, phase: 5, sparks: 16 }),
B("echogloom", "Gloom's echo", "🌑", "is Gloom again, and tougher. it was your idea", 3.2, 0.16, 0.85, 1.6, 16, 2, { big: 1, echo: "gloom", sparks: 12, call: { duskshard: 2 } }),
B("echomurk", "Murk's echo", "🌘", "is Murk again, and tougher", 6.5, 0.23, 0.95, 1.9, 22, 3, { big: 1, echo: "murk", armour: 1, sparks: 18, call: { cinder: 2 } }),
B("echonight", "the Long Night's echo", "🌚", "is the Long Night again, and tougher", 11, 0.26, 1.05, 2.3, 32, 4, { big: 1, echo: "night", armour: 1.25, sparks: 30, call: { starmetal: 1 } })
];
D.BEAST_BY = {}; D.BEASTS.forEach(function (d) { D.BEAST_BY[d.id] = d; if (d.big) toy("trophy_" + d.id, d.name.replace(/^(the|a|an|one of the|old) /, "") + " keepsake", "🏆", 0xd8b84a, "you chased off " + d.name + ". proof."); });
D.BIGS = D.BEASTS.filter(function (d) { return d.big && !d.only && !d.child; });
D.beastDef = function (p) { var d = D.BEAST_BY[p.bid] || D.BEAST_BY.boggrump; return { name: p.name || d.name, icon: d.icon, twist: d.twist, tough: r2(d.tough * (p.k || 1)), dmg: d.dmg, speed: d.speed, size: d.size, pay: d.pay, def: d }; };
function beastPosts(game) { return st(game).posts.filter(function (p) { return p.kind === "beast"; }); }
D.beastsOut = function (game) { return beastPosts(game).filter(function (p) { var d = D.BEAST_BY[p.bid]; return d && !d.child && !d.big && !p.wave && !p.guard; }); };
D.CAP = 3;
D.cap = function (game) { var x = X2(game); return Math.max(0, D.CAP + (D.skyIs(game, "grumpmoon") || D.skyIs(game, "deepnight") ? 2 : 0) + (x.mono >= 2 ? 1 : 0) - (x.ends.void === "seal" ? 1 : 0) - (D.skyIs(game, "lanternnight") ? 9 : 0)); };
D.danger = function (game, x, z) { var hm = home(game); return Math.min(4, Math.floor(SB.dist(x, z, hm.x, hm.z) / 25)); };
D.spawnBeast = function (game, id, at, o) {
var d = D.BEAST_BY[id], x = X2(game); o = o || {};
if (!d || !at) return null;
var ring = D.danger(game, at.x, at.z), k = o.k || (d.child ? 1 : 1 + ring * 0.12 + 0.08 * capBeat(game) + 0.2 * Math.min(3, game.ngPlus || 0));
if (d.echo && SB.Bosses && SB.Bosses.BY[d.echo]) k = 1 + 0.3 * Math.min(3, game.ngPlus || 0); // a rematch reads the captain's numbers, it never writes them
var p = h.addPost(game, { key: "beast-" + id + "-" + (x.pid++), kind: "beast", bid: id, name: o.name || d.name, x: at.x, z: at.z, k: r2(k), ring: ring, stolen: [], calls: 0, wave: o.wave || null, guard: o.guard || null, quiet: !!o.quiet, inv: d.unbeatable ? 1 : 0 });
var g = h.postGrump(game, p); if (g && d.nofear) g.nofear = true;
(x.seen[id] || (x.seen[id] = { n: 0, beat: 0 })).n++;
if (d.pay && !d.child && !o.quiet && st(game).board.list.filter(function (e) { return !e.done; }).length < 6) h.post(game, { kind: "beast", ref: p.key, icon: d.icon, t: "drive off " + d.name, pay: d.pay, x: at.x, z: at.z });
if (d.heart) { var hp = spotAt(game, at.x, at.z, 7, 10, Math.random, null); if (hp) p.heartPl = placeAdd(game, "heart", hp, { post: p.key }).id; else p.heartDone = 1; }
if (d.smash && SB.Threats && SB.Threats.wreck) { var sm = game.world.structures.filter(function (b) { return b.done && (b.kind === "farm" || b.kind === "wall") && SB.dist(b.x, b.z, at.x, at.z) < 40; })[0]; if (sm) { SB.Threats.wreck(game, sm, "smashed"); bump(game, "smashed"); } }
emit("darkBeast", { def: d, post: p });
if (d.big && !o.quiet) tell(game, d.icon + " " + d.name + " is here, to the " + dirOf(at.x - home(game).x, at.z - home(game).z) + ". it " + d.twist + ".");
return p;
};
D.beastFits = function (game, d, at, night) {
var w = game.world, bm = at ? biomeId(game, at.x, at.z) : "";
if (d.child || d.big || d.only) return false;
if ((d.tier || 0) > topTier(game) || (d.after || 0) > capBeat(game)) return false;
if (d.night && !night) return false;
if (d.biome && d.biome.indexOf(bm) < 0) return false;
if (d.cold && !(w.season === 3 || COLD.indexOf(bm) >= 0)) return false;
return true;
};
D.roam = function (game, night) {
if (!D.open(game) || day(game) < D.FIRST_DAY || topTier(game) < 1 || D.rank(game, "grumps").key === "truce" || D.hurting(game)) return null;
if (D.beastsOut(game).length >= D.cap(game)) return null;
var hm = home(game), r = dice(game, "roam" + day(game) + (night ? "n" : "d") + D.beastsOut(game).length), x = X2(game);
for (var t = 0; t < 8; t++) {
var at = spotAt(game, hm.x, hm.z, 22, 70, r, null); if (!at) continue;
var pool = D.BEASTS.filter(function (d) { return D.beastFits(game, d, at, night); });
if (!pool.length) continue;
pool.sort(function (a, b) { return ((x.seen[a.id] || {}).n || 0) - ((x.seen[b.id] || {}).n || 0); });
var least = (x.seen[pool[0].id] || {}).n || 0, low = pool.filter(function (d) { return ((x.seen[d.id] || {}).n || 0) === least; });
return D.spawnBeast(game, low[Math.floor(r() * low.length)].id, at);
}
return null;
};
function packLeft(game, p) { var n = 0; (p.packs || []).forEach(function (id) { var o = SB.Game.byId(game, id); if (o && o.alive && !o.goingHome) n++; }); return n; }
D.beastAggro = function (game, p, c) {
if (p.kind !== "beast") return true;
var d = D.BEAST_BY[p.bid], x = X2(game); if (!d) return true;
if (d.calm || d.flee) return false;
if (d.stare || d.unwatched) { var looked = game.time - (p.look == null ? -99 : p.look) < 2.5; if (d.stare ? !looked : looked) return false; }
if (d.sound && (!(game.time < (x.noise || 0)) || D.knack(game) === "quiet")) return false;
if (d.maskOk && Sv().count(c, "grumpmask", true) > 0 && x.maskBroke !== day(game)) return false;
if (d.maskOk && x.bribed === day(game)) return false;
if (d.near && SB.dist(c.x, c.z, p.x, p.z) > d.near) return false;
return true;
};
D.beastTick = function (game, p, g, duel, mine) {
if (p.kind !== "beast") return false;
var d = D.BEAST_BY[p.bid], x = X2(game), P = SB.Possess, t = game.time; if (!d) return false;
if (d.nofear) { g.chem.fear = 0; g.goingHome = false; }
if (!duel) {
p.inv = d.unbeatable ? 1 : 0; p.rageOn = 0; p.packed = 0; p.lastH = null; p.lastW = g.whacked || 0; p.nextShot = 0; p.nextEat = 0; p.nextWind = 0;
if (!mine) return false;
var dm = SB.dist(mine.x, mine.z, p.x, p.z), at;
if (d.follow && dm > 10) { at = spotAt(game, mine.x, mine.z, 5, 7, Math.random, null); if (at) { p.x = at.x; p.z = at.z; } }
if (d.unwatched && dm < 30 && dm > 4 && t - (p.look == null ? -99 : p.look) >= 2.5) { var nx = p.x + (mine.x - p.x) / dm * 2, nz = p.z + (mine.z - p.z) / dm * 2; if (SB.World.walkable(game.world, nx, nz)) { p.x = r1(nx); p.z = r1(nz); } }
if (d.flee && dm < D.AGGRO) {
p.hops = (p.hops || 0) + 1;
if (p.hops > 3) { D.beastDone(game, p, mine, "caught"); return true; }
at = spotAt(game, p.x, p.z, 9, 13, Math.random, Math.atan2(p.x - mine.x, p.z - mine.z));
if (at) { p.x = at.x; p.z = at.z; }
if (p.hops === 1) psay(d.icon + " " + d.name + " drifts off as you come near. follow it");
return true;
}
return false;
}
var el = t - (p.duelT || t), hpB = Math.max(0, 1 - (g.whacked || 0) / h.need(D.beastDef(p))), hitIt = (g.whacked || 0) > (p.lastW || 0) + 1e-6, bitten = p.lastH != null && mine.chem.health < p.lastH - 0.001, inv = "";
if (d.chase) { p.x = r1(mine.x); p.z = r1(mine.z); }
if (d.minions && !p.packed) {
p.packed = 1;
for (var i = 0; i < d.minions; i++) { var mp = spotAt(game, mine.x, mine.z, 6, 9, Math.random, null); if (!mp) continue; var o = SB.Game.spawnGrump(game, mp.x, mp.z); o.name = "one of its pack"; o.dark = "pack"; o.scout = { who: mine.id, t: 3 - i, hitT: 0, speedK: 0.8, dmg: 0.07 }; (p.packs || (p.packs = [])).push(o.id); }
}
if (d.needsLight && !lit(game, mine)) inv = "you can't see it to hit it. carry a torch, or fight by a fire";
if (d.armour && toolDmg(mine) + 1e-9 < d.armour) inv = "your hits bounce off its hide. it needs a real weapon";
if (d.minions && packLeft(game, p) > 0) inv = "its pack is in the way. see them off first";
if (d.heart && !p.heartDone) inv = "nothing marks it. break its heart tree, close by";
if (d.unbeatable) inv = "nothing you have will ever mark it. creep away";
if (d.outlast) inv = "you can't hit it. just dodge";
if (d.phase && !inv) {
if (d.flyer && !p.grounded && hpB <= 0.5) { p.grounded = 1; psay(d.icon + " it's hurt: it can't get off the ground now"); }
var up = Math.floor(el / d.phase) % 2 === 1 && !p.grounded;
if (d.flyer && g.scout) g.scout.hold = up;
if (up) inv = d.flyer ? "it's up out of reach. wait for it to land" : "it flickers out. wait for it";
}
if (inv && t < (x.wordT || 0)) { inv = ""; if (d.flyer) p.grounded = 1; if (g.scout) g.scout.hold = false; } // the word drags it down
p.inv = inv ? 1 : 0;
if (inv && hitIt) { g.whacked = p.lastW || 0; if (t >= (p.toldT || 0)) { p.toldT = t + 6; psay(d.icon + " " + inv); } }
if (d.ranged && el >= (p.nextShot || d.ranged)) {
p.nextShot = el + d.ranged;
if (d.always || SB.dist(mine.x, mine.z, g.x, g.z) > 2.5) {
if (d.bat && (hitIt || t < (x.swingT || 0))) { g.whacked = (g.whacked || 0) + 1; psay("🏏 batted back! right on its nose"); bump(game, "batted"); }
else {
hurt(mine, d.shot || 0.05);
var sc = d.brews ? [{ tired: 0.3 }, { fear: 0.4 }, { sick: 0.2 }][Math.floor(Math.random() * 3)] : d.shotChem;
if (sc) chem(mine, sc);
if (d.shotKnock) knock(game, mine, g.x, g.z, d.shotKnock);
bump(game, "shots");
if (!p.shotTold) { p.shotTold = 1; psay(d.icon + " it hits you from over there! get in close"); }
}
}
}
if (bitten) {
if (d.bite) chem(mine, d.bite);
if (d.thirst && SB.Body && SB.Body.of) { try { var bb = SB.Body.of(mine); if (bb && typeof bb.thirst === "number") bb.thirst = Math.min(1, bb.thirst + d.thirst); } catch (e) {} }
if (d.biteKnock) knock(game, mine, g.x, g.z, d.biteKnock);
if (d.wound) { mine.dkSore = r1(t + 300); if (!p.soreTold) { p.soreTold = 1; psay("🩹 that one left a sore: your hearts won't fill all the way for a while"); } }
if (d.swallow) { var v = Sv().inv(mine), cand = v.s.filter(function (sl) { return sl && sl.k !== "plans" && !D.QUEST[sl.k]; }); if (cand.length) { var sl = cand[Math.floor(Math.random() * cand.length)]; Sv().take(mine, sl.k, 1); p.stolen.push(sl.k); psay(d.icon + " it swallowed your " + label(sl.k) + "! beat it to get it back"); } }
}
if (d.sap) mine.chem.tired = Math.min(1, (mine.chem.tired || 0) + 0.02);
if (d.torchEater && el >= (p.nextEat || 6)) { p.nextEat = el + 10; if (Sv().count(mine, "torch", true) > 0) { Sv().take(mine, "torch", 1); psay(d.icon + " it drank the flame off a torch!"); bump(game, "torchesDrunk"); } }
if (d.wind && el >= (p.nextWind || d.wind)) { p.nextWind = el + d.wind; if (knock(game, mine, g.x, g.z, 4)) bump(game, "blown"); }
if (d.fuse && el >= d.fuse) {
var near = null, bd = 9; game.world.structures.forEach(function (b) { if (!b.done || b.kind === "darkmark" || b.kind === "lightwell" || b.kind === "noticeboard") return; var dd = SB.dist(b.x, b.z, g.x, g.z); if (dd < bd) { bd = dd; near = b; } });
if (near && SB.Threats && SB.Threats.wreck) SB.Threats.wreck(game, near, "smashed");
if (SB.dist(mine.x, mine.z, g.x, g.z) < 4) hurt(mine, 0.15);
P.endScout("💥 it burst!" + (near ? " the " + ((SK[near.kind] || {}).label || "building") + " next to it is in bits" : ""), 0, "burst");
D.beastDone(game, p, mine, "burst");
return true;
}
if (d.outlast && el >= d.outlast) { P.endScout("🕯 it gives up. you out-danced the dark", 0, "outlasted"); D.beastDone(game, p, mine, "outlasted"); return true; }
if (g.scout) {
var dmg = d.dmg;
if (d.dayRage && !game.world.night) dmg *= d.dayRage;
if ((d.rageAt || (d.big ? 45 : 0)) && el > (d.rageAt || 45)) { dmg *= 1.5; if (!p.rageOn) { p.rageOn = 1; psay(d.icon + " " + p.name + " is raging now: it hits harder. finish it, or walk away"); } }
g.scout.dmg = dmg;
}
if (!inv && el >= (p.nextFight || 6)) {
p.nextFight = el + 6;
var other = beastPosts(game).filter(function (q) { return q !== p && q.bid !== p.bid && !D.BEAST_BY[q.bid].child && SB.dist(q.x, q.z, p.x, p.z) < 16; })[0];
if (other) { g.whacked = (g.whacked || 0) + 1; bump(game, "infights"); if (!p.fightTold) { p.fightTold = 1; psay("😡 " + other.name + " has joined in, on nobody's side: the two of them are at each other"); } }
}
p.lastH = mine.chem.health; p.lastW = g.whacked || 0;
return false;
};
D.BANNER_EVERY = 10; D.BANNER_MAX = 5;
D.banners = function (game) { return Math.min(D.BANNER_MAX, Math.floor(cnt(game, "chased") / D.BANNER_EVERY)); };
D.beastDone = function (game, p, c, how) {
var d = D.BEAST_BY[p.bid], x = X2(game), s = st(game), g = h.postGrump(game, p), px = g ? g.x : p.x, pz = g ? g.z : p.z, P = SB.Possess;
if (how === "beaten" && p.inv) { p.cid = null; p.hurt = p.lastW || 0; return; }
var won = how === "beaten" || how === "outlasted" || how === "caught" || how === "tamed";
(p.stolen || []).forEach(function (k) { drop(game, k, 1, px + (Math.random() - 0.5), pz + (Math.random() - 0.5)); });
if (p.heartPl != null) { var hp = placeById(game, p.heartPl); if (hp) placeEnd(game, hp, true); }
h.dropPost(game, p, how);
if (won) {
x.seen[p.bid].beat = (x.seen[p.bid].beat || 0) + 1; bump(game, "beat:" + p.bid); bump(game, "beasts");
if (d.drop) drop(game, d.drop[0], d.drop[1], px + 0.4, pz);
if (!d.child && (p.ring || 0) >= 2) drop(game, (p.ring || 0) >= 3 && K.crystal ? "crystal" : "mote", 1, px - 0.4, pz); // further out, more left behind
if (d.split) for (var i = 0; i < d.split[1]; i++) D.spawnBeast(game, d.split[0], { x: r1(px + Math.sin(i * 2.1) * 1.8), z: r1(pz + Math.cos(i * 2.1) * 1.8) }, { quiet: true, wave: p.wave });
if (d.big) {
x.big[p.bid] = (x.big[p.bid] || 0) + 1; bump(game, "bigs");
sparks(game, d.sparks || 12, c);
if ((x.big[p.bid] || 0) === 1) drop(game, "trophy_" + p.bid, 1, px, pz + 0.5);
if (harsh(game)) drop(game, "starfruit", 1, px + 0.6, pz + 0.6); // a harder island gives one thing more
if (p.bid === "hexer") x.lastAct = day(game);
if (p.bid === "wreckwarden") x.wreckOpen = day(game);
if (p.bid === "thedark") { x.ends.dark = day(game); if (SB.Embers && SB.Embers.add) SB.Embers.add(game, "dark-itself", "the dark itself, chased off the island", c); }
emit("darkBig", { def: d, c: c || null });
tell(game, "🏆 " + d.name + " is chased off! +" + (d.sparks || 12) + " ✨, and a keepsake where it stood.");
}
h.bountyDone(game, "beast", p.key, c, 1);
if (c && c._pov && SB.Body && SB.Body.xp) { try { SB.Body.xp(c, "fight", d.big ? 8 : 3); } catch (e) {} }
} else s.board.list.forEach(function (e) { if (e.kind === "beast" && e.ref === p.key && !e.done) { e.done = true; e.doneDay = day(game); e.paid = how === "sun" ? "the sun sent it home" : "it left"; } });
emit("darkBeastDone", { def: d, how: how, c: c || null, won: won });
};
D.callWhy = function (game, c, id) {
var d = D.BEAST_BY[id];
if (!d || !d.big || d.only) return "no such thing";
if (!d.call) return "it comes when it is woken, not when it is called";
if ((d.tier || 0) > topTier(game)) return "the island isn't ready for it";
if ((d.after || 0) > capBeat(game)) return "not while a captain still stands";
if (d.ng && !(game.ngPlus > 0)) return "only on a new game+ island";
if (d.echo && !D.lifted(game, d.echo)) return "its captain hasn't fallen yet";
if (d.echo && !D.atWell(game, c)) return "call it at a well of light";
if (d.night && !game.world.night) return "only at night";
if (d.season != null && game.world.season !== d.season) return "only in " + (SB.SEASONS ? SB.SEASONS[d.season] : "its season");
if (d.where && d.where.indexOf(biomeId(game, c.x, c.z)) < 0) return "you have to be standing " + (d.where === SEA ? "on the shore" : "in the ashlands");
if (beastPosts(game).some(function (p) { return D.BEAST_BY[p.bid].big; })) return "one big thing at a time";
if (!hasAll(c, d.call)) return "it wants " + costText(d.call);
return "";
};
D.call = function (game, c, id) {
var why = D.callWhy(game, c, id), d = D.BEAST_BY[id];
if (why) return { ok: false, msg: why };
var at = spotAt(game, c.x, c.z, 8, 11, Math.random, null) || { x: r1(c.x + 8), z: r1(c.z) };
takeAll(c, d.call);
D.spawnBeast(game, id, at);
if (d.pair) { var at2 = spotAt(game, c.x, c.z, 8, 11, Math.random, null) || { x: r1(c.x - 8), z: r1(c.z) }; D.spawnBeast(game, id, at2, { quiet: true, name: "the other twin" }); }
bump(game, "calls");
return { ok: true, msg: d.icon + " " + d.name + " answers. it " + d.twist };
};
D.sayWord = function (game, c) {
var x = X2(game), B = SB.Bosses, P = SB.Possess, out = "";
if (!D.hasBoon(game, "word")) return { ok: false, msg: "you don't know the word yet" };
if (x.wordDay === day(game)) return { ok: false, msg: "the word is a big one. once a day" };
x.wordDay = day(game); x.wordT = game.time + 30; bump(game, "words");
if (B && B.next && P && P.adoptScout && P.scout && !P.scout()) {
var nx = B.next(game), g = nx ? B.creature(game, nx.boss) : null;
if (g && SB.dist(c.x, c.z, nx.x, nx.z) < (B.LEASH || 26) - 2 && SB.dist(c.x, c.z, nx.x, nx.z) >= (B.AGGRO || 9)) {
var at = spotAt(game, c.x, c.z, 5, 7, Math.random, Math.atan2(nx.x - c.x, nx.z - c.z));
if (at && g.scout) { g.x = at.x; g.z = at.z; g.px = at.x; g.pz = at.z; g.scout.who = c.id; g.scout.hits = 0; if (P.adoptScout(g, { keep: true })) out = " " + nx.boss.name + " is dragged out of the dark to you!"; }
}
}
emit("darkWord", { c: c });
return { ok: true, msg: "🗣 you say the word. for half a minute nothing can hide, fly or flicker." + out };
};
D.WAVES = [
{ id: "swarm", icon: "🐜", name: "a swarm of little grumps", line: "dozens of small ones, all at once", sizes: [5, 6], g: { name: "a little grump", tough: 0.5, size: 0.6, speed: 1.1 }, tier: 2, pay: 6, auto: 1, night: 1 },
{ id: "band", icon: "🪓", name: "a grump band with tools", line: "they go for a wall first", sizes: [3, 4], g: { name: "a band grump", tough: 1.5, size: 1.15 }, tier: 4, pay: 10, auto: 1, night: 1, walls: 1, boss: "ravager" },
{ id: "sea", icon: "🛶", name: "sea raiders on rafts", line: "they land on the shore, and the raft boss comes last", sizes: [3, 4], g: { name: "a sea raider", tough: 1.1 }, tier: 3, pay: 10, auto: 1, night: 1, from: "shore", boss: "raftboss" },
{ id: "tunnel", icon: "🕳", name: "grumps up through the ground", line: "they come up inside the walls", sizes: [3], g: { name: "a tunnel grump", tough: 1 }, tier: 3, pay: 6, auto: 1, night: 1, from: "inside" },
{ id: "frost", icon: "🧊", name: "the frost grumps", line: "a winter war party", sizes: [4, 4], g: { name: "a frost raider", tough: 1.1 }, tier: 2, pay: 8, auto: 1, night: 1, season: 3 },
{ id: "bunnies", icon: "🐇", name: "a stampede of furious bunnies", line: "nobody knows what upset them", sizes: [6], g: { name: "a furious bunny", tough: 0.4, size: 0.45, speed: 1.4 }, tier: 1, pay: 4, auto: 1, dayOnly: 1 },
{ id: "nibblers", icon: "🦫", name: "a swarm of nibblers", line: "they are after the farms", sizes: [5], g: { name: "a nibbler", tough: 0.4, size: 0.4, speed: 1.2 }, tier: 2, pay: 5, auto: 1, dayOnly: 1, farms: 0.5 },
{ id: "blobrain", icon: "🟢", name: "a rain of little blobs", line: "clear eight and the big one lands", sizes: [5, 5], g: { name: "a little blob", tough: 0.45, size: 0.5 }, tier: 2, pay: 6, auto: 1, from: "sky", boss: "kingblob", bossAt: 8 },
{ id: "risers", icon: "🧟", name: "risers", line: "they get up at the old spots until the relic is lit again", sizes: [2, 2, 2, 2, 2, 2], g: { name: "a riser", tough: 0.8, speed: 0.7 }, tier: 2, pay: 8, auto: 1, night: 1, relic: 1 },
{ id: "goblins", icon: "🫧", name: "a wild blob band", line: "more curious than cross. one of them might stay", sizes: [4], g: { name: "a wild blob", tough: 0.6, size: 0.6 }, tier: 2, pay: 5, auto: 1, dayOnly: 1, joins: 1 },
{ id: "wavenight", icon: "🎃", name: "the wave night", line: "four waves, scored. you called it", sizes: [3, 4, 5, 6], g: { name: "a wave grump", tough: 1 }, tier: 2, pay: 12, night: 1, call: { taunt: 1 } },
{ id: "frostnight", icon: "☃️", name: "the frost wave night", line: "five harder waves, winter only", sizes: [4, 5, 6, 7, 8], g: { name: "a frost wave grump", tough: 1.3 }, tier: 3, pay: 20, night: 1, season: 3, call: { taunt: 1 } },
{ id: "wreckhold", icon: "🛸", name: "hold the wreck", line: "three waves at a pod wreck. a cinder lights the ward fires", sizes: [3, 4, 5], g: { name: "a wreck raider", tough: 1.1 }, tier: 3, pay: 14, call: { cinder: 1 }, at: "wreck" },
{ id: "arena", icon: "🏟", name: "the old ring", line: "three waves in the ring, and it pays at the end", sizes: [2, 3, 4], g: { name: "a ring grump", tough: 1.1 }, tier: 2, pay: 10, at: "here" },
{ id: "omen", icon: "💢", name: "the hard ring", line: "four tougher waves, started with a taunt drum", sizes: [3, 4, 5, 6], g: { name: "a ring bruiser", tough: 1.5, size: 1.15 }, tier: 3, pay: 18, at: "here" },
{ id: "vault", icon: "🔐", name: "the vault is opening", line: "hold out while it opens", sizes: [3, 3, 4], g: { name: "a vault raider", tough: 1.1 }, tier: 3, pay: 12, at: "here" },
{ id: "pillar", icon: "🗼", name: "a dark pillar", line: "break what comes out of it", sizes: [3, 4], g: { name: "a pillar grump", tough: 1.3 }, tier: 4, pay: 10, at: "here" },
{ id: "fort", icon: "🏰", name: "storm the fort", line: "two waves and the chief", sizes: [3, 4], g: { name: "a fort grump", tough: 1.3 }, tier: 3, pay: 12, at: "here", boss: "fortchief" },
{ id: "ascent", icon: "👑", name: "the elders' three nights", line: "the dark comes for your guests", sizes: [4, 5, 6], g: { name: "a night raider", tough: 1.3 }, tier: 4, pay: 20 },
{ id: "snuffers", icon: "🕯", name: "the dark comes for the beacon", line: "they mean to put it out", sizes: [4, 5, 6], g: { name: "a snuffer", tough: 1.3 }, tier: 4, pay: 20, at: "beacon" }
];
D.WAVE_BY = {}; D.WAVES.forEach(function (d) { D.WAVE_BY[d.id] = d; });
D.waveOn = function (game) { return X2(game).wave || null; };
D.waveWhy = function (game, id, c, free) {
var d = D.WAVE_BY[id], DR = SB.Director;
if (!d) return "no such thing";
if (X2(game).wave) return "one at a time";
if (DR && DR.state && DR.state(game).active) return "not now: the island already has its hands full";
if ((d.tier || 0) > topTier(game)) return "the island isn't ready for it";
if (d.season != null && game.world.season !== d.season) return "only in winter";
if (d.night && d.call && !free && !game.world.night) return "only at night";
if (d.call && c && !hasAll(c, d.call)) return "it takes " + costText(d.call);
return "";
};
D.startWave = function (game, id, at, c, o) {
var d = D.WAVE_BY[id], x = X2(game), hm = home(game); o = o || {};
var why = D.waveWhy(game, id, c, !!o.line);
if (why) return { ok: false, msg: why };
if (d.at === "wreck" && !at) { var q = (game.sites || []).filter(function (s) { return s.kind === "wreck" && s.found && !s.gone; })[0]; if (!q) return { ok: false, msg: "you haven't found a pod wreck to hold" }; at = { x: q.x, z: q.z }; }
if (d.at === "beacon" && !at) { var sp = game.world.structures.filter(function (b) { return b.kind === "spire"; })[0]; at = sp ? { x: sp.x, z: sp.z } : null; }
at = at || { x: hm.x, z: hm.z };
if (d.call && c && !o.line) takeAll(c, d.call);
var total = 0; d.sizes.forEach(function (n) { total += n; });
x.wave = { id: id, i: -1, ids: [], chased: 0, total: total, t0: game.time, until: 0, x: r1(at.x), z: r1(at.z), place: o.place || null, line: o.line || null };
if (d.farms) game.world.structures.forEach(function (b) { if (b.kind === "farm" && b.done && b.data) b.data.grow = Math.max(0, (b.data.grow || 0) * (1 - d.farms)); });
if (d.walls && SB.Threats && SB.Threats.wreck) { var wl = game.world.structures.filter(function (b) { return b.kind === "wall" && b.done; })[0]; if (wl) { SB.Threats.wreck(game, wl, "smashed"); x.wave.wall = 1; } }
if (d.relic) { var rp = spotAt(game, at.x, at.z, 14, 20, Math.random, null); if (rp) x.wave.relicPl = placeAdd(game, "relic", rp, {}).id; }
if (D.rule(game, "drum") && game.world.night) tribe(game).forEach(function (s0) { if (s0.asleep) s0.asleep = false; });
emit("darkWaveStart", { def: d, x: at.x, z: at.z });
tell(game, d.icon + " " + d.name + ": " + d.line + "." + (D.rule(game, "drum") ? " the watch drum is going." : ""));
waveTick(game);
return { ok: true, msg: d.icon + " " + d.name + " has begun" };
};
function waveLeft(game, w) { var n = 0; w.ids.forEach(function (id) { var g = SB.Game.byId(game, id); if (g && g.alive && !g.goingHome) n++; }); return n + beastPosts(game).filter(function (p) { return p.wave === w.id; }).length; }
function waveSpawn(game, w, d) {
var n = d.sizes[w.i], r = Math.random, ang = r() * 6.283, k = 1 - 0.06 * D.banners(game), gd = d.g || {};
w.ids = [];
for (var i = 0; i < n; i++) {
var at = d.from === "inside" ? spotAt(game, w.x, w.z, 3, 6, r, null) : d.from === "sky" ? spotAt(game, w.x, w.z, 5, 14, r, null) : d.from === "shore" ? (biomeSpotNear(game, SEA, w.x, w.z, 60) || spotAt(game, w.x, w.z, 18, 26, r, ang)) : spotAt(game, w.x, w.z, 18, 26, r, ang + (r() - 0.5) * 0.6);
if (!at) continue;
var g = SB.Game.spawnGrump(game, at.x + (r() - 0.5) * 2, at.z + (r() - 0.5) * 2);
g.name = gd.name || "a raider"; g.tough = r2((gd.tough || 1) * k); g.dark = "wave"; g.raider = { x: w.x, z: w.z }; g.chem.anger = 0.6; g._dk = 1; g._dk2 = 1;
if (g.look && gd.size) g.look.size = (g.look.size || 1) * gd.size;
w.ids.push(g.id);
}
w.until = game.time + 55;
emit("darkWaveNext", { id: w.id, i: w.i, n: w.ids.length });
}
function biomeSpotNear(game, ids, x, z, maxD) { var best = null, bd = maxD; for (var t = 0; t < 30; t++) { var a = Math.random() * 6.283, d0 = 12 + Math.random() * (maxD - 12), px = x + Math.sin(a) * d0, pz = z + Math.cos(a) * d0; if (!SB.World.inBounds(game.world, px, pz) || ids.indexOf(biomeId(game, px, pz)) < 0 || !SB.World.walkable(game.world, px, pz, false)) continue; if (d0 < bd) { bd = d0; best = { x: r1(px), z: r1(pz) }; } } return best; }
function waveTick(game) {
var x = X2(game), w = x.wave; if (!w) return;
var d = D.WAVE_BY[w.id]; if (!d) { x.wave = null; return; }
var left = w.i < 0 ? 0 : waveLeft(game, w);
if (w.relicDone) return waveEnd(game, true);
if (left > 0 && game.time < w.until) return;
if (d.boss && d.bossAt && !w.bossed && w.chased >= d.bossAt) { w.bossed = 1; D.spawnBeast(game, d.boss, spotAt(game, w.x, w.z, 6, 10, Math.random, null) || { x: w.x + 6, z: w.z }, { wave: w.id }); return; }
if (w.i + 1 < d.sizes.length) { w.i++; waveSpawn(game, w, d); return; }
if (d.boss && !d.bossAt && !w.bossed && w.chased >= w.total * 0.5) { w.bossed = 1; w.until = game.time + 90; D.spawnBeast(game, d.boss, spotAt(game, w.x, w.z, 8, 12, Math.random, null) || { x: w.x + 8, z: w.z }, { wave: w.id }); return; }
waveEnd(game, left === 0);
}
D.waveTick = waveTick;
D.MEDALS = ["", "🥉 bronze", "🥈 silver", "🥇 gold"];
function waveEnd(game, clean) {
var x = X2(game), w = x.wave, d = D.WAVE_BY[w.id], c = me(), hm = home(game);
w.ids.forEach(function (id) { var g = SB.Game.byId(game, id); if (g && g.alive) { g.goingHome = true; g.raider = null; } });
beastPosts(game).filter(function (p) { return p.wave === w.id; }).forEach(function (p) { D.beastDone(game, p, null, "left"); });
var score = w.relicDone ? 1 : w.total ? w.chased / w.total : 0, medal = score >= 0.9 ? 3 : score >= 0.6 ? 2 : score >= 0.3 ? 1 : 0, pay = Math.round(d.pay * medal / 3);
x.wave = null;
x.medals["wave:" + w.id] = Math.max(x.medals["wave:" + w.id] || 0, medal);
if (w.relicPl != null) { var rp = placeById(game, w.relicPl); if (rp) placeEnd(game, rp, true); }
if (medal) { bump(game, "wave"); bump(game, "wave:" + w.id); sparks(game, pay, c); st(game).raid.truce = Math.max(st(game).raid.truce || 0, game.time + 0.5 * SB.DAY_LENGTH); }
if (medal >= 2 && d.joins) { var nc = h.newcomer(game, hm.x + 4, hm.z + 3, false, "goblin"); if (nc) { w.joined = nc.name; emit("darkJoined", { c: nc, how: "blob band" }); } }
if (medal && w.place != null) { var pl = placeById(game, w.place); if (pl && D.PLACE[pl.kind].won) D.PLACE[pl.kind].won(game, pl, c, medal); }
if (medal && w.id === "ascent") { x.ends.ascent = day(game); if (SB.Embers && SB.Embers.add) SB.Embers.add(game, "dark-ascent", "the elders were kept safe three nights, and named your tribe their heirs", c); }
if (medal && w.id === "snuffers") x.ends.beaconHeld = day(game);
emit("darkWave", { def: d, score: score, medal: medal, pay: pay });
tell(game, d.icon + " " + d.name + " is over: " + w.chased + " of " + w.total + " chased off" + (medal ? ", " + D.MEDALS[medal] + ", +" + pay + " ✨" : ". the rest got bored and went") + (w.joined ? ". " + w.joined + " stayed behind and joined you" : "") + ".");
}
D.autoWave = function (game, night) {
var x = X2(game), DR = SB.Director;
if (!D.open(game) || x.wave || day(game) < 4 || D.hurting(game) || !D.raidOk(game) || (DR && DR.state && DR.state(game).active)) return null;
if (dice(game, "wave" + day(game) + (night ? "n" : "d"))() > 0.14) return null;
var pool = D.WAVES.filter(function (d) { return d.auto && (d.tier || 0) <= topTier(game) && (d.season == null || d.season === game.world.season) && (night ? !d.dayOnly : !d.night) && !(d.from === "shore" && !biomeSpotNear(game, SEA, home(game).x, home(game).z, 60)); });
if (!pool.length) return null;
pool.sort(function (a, b) { return cnt(game, "seenwave:" + a.id) - cnt(game, "seenwave:" + b.id); });
var d = pool[0]; bump(game, "seenwave:" + d.id);
return D.startWave(game, d.id, null, null).ok ? d : null;
};
function outdoors(game, o) { return !(o.inBed || (SB.World.shelterAt && SB.World.shelterAt(game.world, o.x, o.z))); }
function farmsDo(game, fn) { game.world.structures.forEach(function (b) { if (b.kind === "farm" && b.done && b.data) fn(b); }); }
function scatter(game, kinds, n, d0, d1) { var hm = home(game), out = 0; for (var i = 0; i < n; i++) { var p = spotAt(game, hm.x, hm.z, d0, d1, Math.random, null), k = kinds[i % kinds.length]; if (p && K[k]) { drop(game, k, 1, p.x, p.z); out++; } } return out; }
D.SKIES = [
{ id: "dimday", icon: "🌥", name: "a dim day", line: "the Lantern is weak today: no new sparks reach it until this passes", days: 0.5, bad: 1, auto: 1,
start: function (game, s) { s.sp = game.sparks || 0; }, tick: function (game, s) { if ((game.sparks || 0) > s.sp) game.sparks = s.sp; else s.sp = game.sparks || 0; } },
{ id: "ashfall", icon: "🌋", name: "ash fall", line: "ash is coming down. smols out of doors get poorly: keep them under roofs", days: 1, bad: 1, auto: 1, tier: 2, out: { sick: 0.003 } },
{ id: "greywinter", icon: "🌫", name: "a long grey spell", line: "grey and cold for three days. the farms crawl", days: 3, bad: 1, auto: 1, tier: 2, farms: -0.004 },
{ id: "flashstorm", icon: "⚡", name: "a flash storm", line: "lightning is all coming down on one spot. fires may start there", days: 0.25, bad: 1, auto: 1,
start: function (game, s) { var hm = home(game), p = spotAt(game, hm.x, hm.z, 18, 30, Math.random, null) || { x: hm.x + 20, z: hm.z }; s.x = p.x; s.z = p.z; s.n = 0; for (var i = 0; i < 3; i++) { try { if (SB.World.lightning) SB.World.lightning(game.world, game, p.x + (Math.random() - 0.5) * 6, p.z + (Math.random() - 0.5) * 6, true); s.n++; } catch (e) {} } if (topTier(game) >= 2) D.spawnBeast(game, "sprite", p, { quiet: true }); } },
{ id: "hum", icon: "😖", name: "a grump hum", line: "a low hum out of the dark. everyone is sour until it stops", days: 1, bad: 1, auto: 1, all: { anger: 0.004, bored: 0.004 } },
{ id: "lullaby", icon: "🎶", name: "the Lantern's lullaby", line: "the Lantern hums, and everyone is sweeter for a day", days: 1, all: { anger: -0.03, fear: -0.03, bored: -0.02 }, cost: 5 },
{ id: "aurora", icon: "🌌", name: "lights in the night sky", line: "ribbons of green over the island. everyone out of doors feels wonderful", days: 0.5, night: 1, auto: 1, out: { bored: -0.04, fear: -0.03, lonely: -0.02 }, inspire: 1 },
{ id: "grumprain", icon: "🌧", name: "grump rain", line: "grey, greasy rain. smols out in it get cranky", days: 0.5, bad: 1, auto: 1, out: { anger: 0.008 } },
{ id: "greenrain", icon: "💚", name: "glow rain", line: "warm green rain. rare things are coming up all over the island, and the farms love it", days: 1, auto: 1,
start: function (game, s) { s.n = scatter(game, ["glowcap", "herb", "shroom", "berry", "seed"], 10, 8, 32); farmsDo(game, function (b) { b.data.grow = Math.min(1, (b.data.grow || 0) + 0.2); }); } },
{ id: "drought", icon: "🏜", name: "a dry spell", line: "no rain for two days. the farms stand still and everyone is thirsty", days: 2, bad: 1, auto: 1, season: 1, farms: -0.003 },
{ id: "flood", icon: "🌊", name: "the water is up", line: "the low ground is under water. farms by the water are washed out", days: 1, bad: 1, auto: 1, season: 0,
start: function (game, s) { s.n = 0; farmsDo(game, function (b) { for (var a = 0; a < 6.2; a += 0.8) if (SB.World.depthAt(game.world, b.x + Math.sin(a) * 7, b.z + Math.cos(a) * 7) > 0.05) { b.data.grow = 0; s.n++; return; } }); } },
{ id: "deepnight", icon: "🕳", name: "a night with no stars", line: "the whole island is black. more things are about, and nobody is easy away from a fire", days: 0.5, night: 1, bad: 1, auto: 1, tier: 2, dark: 1,
start: function (game) { var hm = home(game), p = spotAt(game, hm.x, hm.z, 14, 22, Math.random, null); if (p) D.spawnBeast(game, "meancritter", p, { quiet: true }); } },
{ id: "grumpmoon", icon: "🌑", name: "a grump moon", line: "the caves are emptying. more beasts tonight, and odd things on a fishing line", days: 0.5, night: 1, bad: 1, auto: 1, tier: 2 },
{ id: "lanternnight", icon: "🏮", name: "lantern night", line: "a captain is gone, and tonight nothing is about. the tribe sends little lights up", days: 0.5, night: 1, all: { fear: -0.05, bored: -0.03, lonely: -0.03 },
start: function (game) { var hm = home(game); drop(game, "paperlantern", 2, hm.x + 1, hm.z + 1.5); if (SB.FX && SB.FX.burst) { try { SB.FX.burst("embers", hm.x, 3, hm.z, 40, { r: 6 }); } catch (e) {} } } },
{ id: "herd", icon: "🦬", name: "a herd crossing", line: "a great herd is crossing the island. everyone stops to watch, and there is fur on every bush", days: 1, auto: 1, all: { bored: -0.02 },
start: function (game, s) { s.n = scatter(game, ["fur"], 5, 12, 36); } },
{ id: "bloom", icon: "🌟", name: "a star-fruit bloom", line: "star-fruit is out, somewhere near the village. it won't last", days: 1, auto: 1,
start: function (game, s) { var hm = home(game), p = spotAt(game, hm.x, hm.z, 12, 22, Math.random, null) || { x: hm.x + 12, z: hm.z }; s.x = p.x; s.z = p.z; for (var i = 0; i < 5; i++) drop(game, "starfruit", 1, p.x + Math.sin(i * 1.3) * 1.5, p.z + Math.cos(i * 1.3) * 1.5); } },
{ id: "blight", icon: "🍂", name: "blight", line: "one farm has the blight, and it spreads farm to farm. cut it out (look at the farm in a body)", days: 3, bad: 1, auto: 1, tier: 2, needs: "farm",
start: function (game, s) { var f = game.world.structures.filter(function (b) { return b.kind === "farm" && b.done; })[0]; s.farms = f ? [f.id] : []; s.t = 0; },
tick: function (game, s) {
s.farms = s.farms.filter(function (id) { var b = SB.World.structById(game.world, id); if (b && b.done && b.data) { b.data.grow = Math.max(0, (b.data.grow || 0) - 0.01); return true; } return false; });
if (!s.farms.length) { s.until = 0; return; }
if ((s.t = (s.t || 0) + 2) < 20) return; s.t = 0;
var src = SB.World.structById(game.world, s.farms[s.farms.length - 1]), next = null, bd = 24;
farmsDo(game, function (b) { if (s.farms.indexOf(b.id) >= 0) return; var dd = SB.dist(b.x, b.z, src.x, src.z); if (dd < bd) { bd = dd; next = b; } });
if (next) { s.farms.push(next.id); emit("darkBlight", { st: next }); }
} },
{ id: "pop", icon: "💥", name: "a crystal pops", line: "an overcharged crystal just went pop. something near it is smouldering", days: 0.1, bad: 1, auto: 1, tier: 3,
start: function (game, s) { var hm = home(game), w = game.world, n = SB.World.nearestNode ? SB.World.nearestNode(w, hm.x, hm.z, 60, function (o) { return o.kind === "crystals" && o.state === "ok"; }) : null, p = n || { x: hm.x + 6, z: hm.z + 2 }; s.x = p.x; s.z = p.z; drop(game, "crystal", 1, p.x + 0.6, p.z); var t = SB.World.nearestNode ? SB.World.nearestNode(w, p.x, p.z, 8, function (o) { return o.state === "ok" && o.kind !== "crystals"; }) : null; try { if (t && SB.World.ignite) s.fire = SB.World.ignite(w, game, t) ? 1 : 0; } catch (e) {} } },
{ id: "cubeday", icon: "🟨", name: "a shiny cube", line: "something shiny has turned up, and nobody can stop staring at it. carry it off", days: 2, auto: 1, tier: 1,
start: function (game) { var hm = home(game), p = spotAt(game, hm.x, hm.z, 6, 10, Math.random, null); if (p) placeAdd(game, "cube", p, {}); } },
{ id: "arkfall", icon: "🛰", name: "a piece of the ark comes down", line: "a lump of the old ark has landed. it sours everything round it until somebody takes it apart", days: 0.2, bad: 1, auto: 1, tier: 2,
start: function (game, s) { var hm = home(game), p = spotAt(game, hm.x, hm.z, 14, 24, Math.random, null); if (p) { placeAdd(game, "arkpart", p, {}); s.x = p.x; s.z = p.z; } } },
{ id: "sniffles", icon: "🤧", name: "this winter's sniffles", line: "the sniffles are back", days: 1, bad: 1, season: 3,
start: function (game, s) {
var x = X2(game), sn = x.strain || (x.strain = { lv: 0 }), cs = tribe(game), imm = cs.filter(function (c) { return (c.dkImm || 0) >= sn.lv && sn.lv > 0; }).length;
if (sn.lv === 0 || imm * 2 < cs.length) sn.lv = Math.min(5, sn.lv + 1); // not enough of you got over the last one: it comes back nastier
s.lv = sn.lv; s.n = 0;
cs.filter(function (c) { return (c.dkImm || 0) < sn.lv; }).slice(0, 1 + sn.lv).forEach(function (c) { chem(c, { sick: 0.3 + 0.1 * sn.lv }); c.dkCatch = sn.lv; s.n++; });
} }
];
D.SKY_BY = {}; D.SKIES.forEach(function (d) { D.SKY_BY[d.id] = d; });
D.sky = function (game) { var x = game && game.quests && game.quests.dark && game.quests.dark.x2; return x && x.sky && game.time < x.sky.until ? x.sky : null; };
D.skyIs = function (game, id) { var s = D.sky(game); return !!s && s.id === id; };
D.skyFits = function (game, d) {
if ((d.tier || 0) > topTier(game)) return false;
if (d.season != null && game.world.season !== d.season) return false;
if (d.needs === "farm" && !hasStruct(game, "farm")) return false;
if (d.bad && D.hurting(game)) return false;
return true;
};
D.startSky = function (game, id, quiet) {
var d = D.SKY_BY[id], x = X2(game);
if (!d || D.sky(game)) return false;
var s = x.sky = { id: id, until: game.time + d.days * SB.DAY_LENGTH, day: day(game) };
if (d.start) { try { d.start(game, s); } catch (e) {} }
if (d.inspire) tribe(game).forEach(function (c) { if (outdoors(game, c)) c.inspired = Math.max(c.inspired || 0, 60); });
x.skies[id] = (x.skies[id] || 0) + 1; bump(game, "skies");
emit("darkSky", { def: d, sky: s });
if (!quiet) tell(game, d.icon + " " + d.name + ": " + d.line + (id === "sniffles" ? ", strain " + s.lv + (s.lv > 1 ? ". not enough of you got over the last one, so it's nastier" : "") : "") + (s.x != null && id !== "sniffles" ? " (to the " + dirOf(s.x - home(game).x, s.z - home(game).z) + ")" : "") + ".");
return true;
};
function skyTick(game) {
var x = X2(game), s = x.sky; if (!s) return;
var d = D.SKY_BY[s.id];
if (!d || game.time >= s.until) { x.sky = null; emit("darkSkyEnd", { id: s.id }); return; }
if (d.tick) d.tick(game, s);
if (d.all || d.out || d.dark) tribe(game).forEach(function (c) {
if (d.all) chem(c, d.all);
if (d.out && outdoors(game, c)) chem(c, d.out);
if (d.dark && outdoors(game, c) && !(SB.World.nearestFire && SB.World.nearestFire(game.world, c.x, c.z, 8))) chem(c, { fear: 0.006 });
});
if (d.farms) farmsDo(game, function (b) { if (b.data.grow > 0) b.data.grow = Math.max(0, b.data.grow + d.farms); });
}
D.pickSky = function (game) {
var x = X2(game), r = dice(game, "sky" + day(game));
x.skyNext = null;
if (r() > 0.4 + 0.1 * D.luck(game)) return null;
var pool = D.SKIES.filter(function (d) { return d.auto && D.skyFits(game, d); });
if (!pool.length) return null;
pool.sort(function (a, b) { return (x.skies[a.id] || 0) - (x.skies[b.id] || 0); });
var least = x.skies[pool[0].id] || 0, low = pool.filter(function (d) { return (x.skies[d.id] || 0) === least; });
x.skyNext = low[Math.floor(r() * low.length)].id;
return x.skyNext;
};
D.starsOk = function (game, c) { return hasStruct(game, "observatory") || tribe(game).some(function (o) { return o.tier >= 5; }) || (c && D.atWell(game, c)) || D.hasBoon(game, "stars"); };
D.readStars = function (game, c) {
var x = X2(game);
if (!D.starsOk(game, c)) return { ok: false, msg: "it takes a star dome, a thinker in the tribe, or a well of light to read the stars" };
var d = x.skyNext ? D.SKY_BY[x.skyNext] : null;
x.read = day(game); bump(game, "readings");
return { ok: true, msg: "🔭 the stars say: " + (d ? (d.night ? "tonight, " : "tomorrow, ") + d.name + ". " + d.line : "nothing is coming. a quiet day") + ". " + D.luckLine(game) + "." };
};
D.sing = function (game) {
if (D.sky(game)) return { ok: false, msg: "the sky is busy" };
if (!SB.Game.spend(game, D.SKY_BY.lullaby.cost)) return { ok: false, msg: "the lullaby costs " + D.SKY_BY.lullaby.cost + " ✨" };
D.startSky(game, "lullaby", true);
return { ok: true, msg: "🎶 the Lantern hums. everyone is sweeter for a day" };
};
D.signalOk = function (game, c) { return hasStruct(game, "observatory") || hasStruct(game, "spire") || D.atWell(game, c); };
D.signal = function (game, c, which) {
var x = X2(game), hm = home(game);
if (!D.signalOk(game, c)) return { ok: false, msg: "it takes a star dome, the beacon, or a well of light" };
if (x.sigDay === day(game)) return { ok: false, msg: "the signal is spent for today" };
x.sigDay = day(game); var n = bump(game, "signals") % 3;
if (which != null && which >= 0 && which <= 2) n = [1, 2, 0][which]; // you choose who to call: news, help, or company
if (n === 1) { var d = x.skyNext ? D.SKY_BY[x.skyNext] : null; return { ok: true, msg: "📡 pod 4 answers, faintly: “" + (d ? "watch your sky: " + d.name + " is coming" : "all quiet out here. you?") + "”" }; }
if (n === 2 && D.rank(game, "far").i >= 1) { drop(game, "bread", 2, hm.x + 1.4, hm.z - 1); drop(game, "seed", 2, hm.x + 1.8, hm.z - 0.6); D.move(game, "far", 2, "the signal"); return { ok: true, msg: "📡 the far tribe heard you. a runner has left bread and seeds at the nest" }; }
var g = D.addGuest(game, "podfolk");
return { ok: true, msg: g ? "📡 somebody heard: a survivor from another pod is walking in. see “visitors” in your notices" : "📡 static, and somebody laughing a long way off" };
};
D.PLACE = {};
function placeById(game, id) { var L = X2(game).places; for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i]; return null; }
function placeName(p) { var d = D.PLACE[p.kind]; return typeof d.name === "function" ? d.name(p) : d.name; }
function placeAdd(game, kindId, at, data) {
var x = X2(game), p = { id: x.pid++, kind: kindId, x: r1(at.x), z: r1(at.z), day: day(game), n: 0 }, k;
if (data) for (k in data) p[k] = data[k];
x.places.push(p);
var b = h.putStruct(game, "darkmark", p.x, p.z, "pl-" + p.id); b.name = placeName(p);
emit("darkPlace", { p: p });
return p;
}
function placeEnd(game, p, quiet) {
var x = X2(game), L = game.world.structures, b = h.findStruct(game, "darkmark", "pl-" + p.id), i = b ? L.indexOf(b) : -1;
if (i >= 0) L.splice(i, 1);
x.places = x.places.filter(function (o) { return o !== p; });
if (!quiet) { bump(game, "place:" + p.kind); bump(game, "places"); emit("darkPlaceDone", { p: p }); }
}
function rename(game, p) { var b = h.findStruct(game, "darkmark", "pl-" + p.id); if (b) b.name = placeName(p); }
D.placesOf = function (game, kindId) { return X2(game).places.filter(function (p) { return p.kind === kindId; }); };
D.placeNear = function (game, c, r) { var best = null, bd = r || 5; X2(game).places.forEach(function (p) { var dd = SB.dist(p.x, p.z, c.x, c.z); if (dd < bd) { bd = dd; best = p; } }); return best; };
D.placeById = placeById; D._placeAdd = placeAdd; D._placeEnd = placeEnd;
function actOf(game, p, alt) { var d = D.PLACE[p.kind], a = alt ? d.alt : d.act; if (!a) return null; return typeof a === "function" ? a(game, p, X2(game)) : a; }
D.placeLabel = function (game, p, alt) { var a = actOf(game, p, alt); return a ? a.label : ""; };
D.placeAct = function (game, c, p, alt) {
var a = p ? actOf(game, p, alt) : null, x = X2(game);
if (!a) return { ok: false, msg: "" };
if (SB.dist(c.x, c.z, p.x, p.z) > 6) return { ok: false, msg: "get closer" };
if (a.tool && !hasTool(c)) return { ok: false, msg: "it takes a tool in your hand" };
if (a.fire && !(Sv().has(c, "torch") || Sv().has(c, "cinder"))) return { ok: false, msg: "it takes fire: a torch or a cinder" };
if (a.need && !hasAll(c, a.need)) return { ok: false, msg: "it takes " + costText(a.need) };
var r = a.go(game, c, p, x);
if (r && typeof r === "object") return r;
if (a.need && !a.keep) takeAll(c, a.need);
emit("darkPlaceUsed", { p: p, c: c });
return { ok: true, msg: r || "done" };
};
function lootAt(game, x, z, lvl) { lvl += D.danger(game, x, z) >= 2 ? 1 : 0; drop(game, "mote", 1, x + 0.5, z); if (lvl >= 1) drop(game, "metal", 1, x - 0.5, z); if (lvl >= 2) drop(game, "crystal", 1, x, z + 0.5); if (lvl >= 3) drop(game, "potion", 1, x, z - 0.5); if (lvl >= 4) drop(game, "starfruit", 1, x + 0.4, z + 0.4); return lvl; }
D._lootAt = lootAt;
function noisy(game) { return game.time < (X2(game).noise || 0) && D.knack(game) !== "quiet"; }
function raidersNear(game, x, z, r) { var out = []; game.creatures.forEach(function (g) { if (g.alive && g.species === "grump" && !g.goingHome && !g.boss && (g.raider || g.dark === "wave") && SB.dist(g.x, g.z, x, z) < r) out.push(g); }); return out; }
function turnBack(g) { g.goingHome = true; g.raider = null; g.chem.fear = 1; }
function PL(id, def) { D.PLACE[id] = def; }
PL("knot", { name: "a dark knot", icon: "🌑", act: { label: "break the dark knot", tool: 1, go: function (game, c, p, x) {
drop(game, "gloomstone", 1, p.x + 0.4, p.z); lootAt(game, p.x, p.z, 0); placeEnd(game, p);
var left = D.placesOf(game, "knot").filter(function (o) { return o.lair === p.lair; }).length, B = SB.Bosses, e = B && p.lair ? B.state(game).list[p.lair] : null;
if (!left && e && !e.beaten) { e.found = true; if (SB.World.reveal) SB.World.reveal(game.world, e.x, e.z, 10); bump(game, "stirred"); return "the last knot goes, and something in the lair stirs. " + B.BY[p.lair].name + " knows you are coming: its lair is on your map"; }
return "the knot bursts like a puffball: a gloomstone and a little light" + (left ? ". " + left + " more round here" : "");
} } });
PL("snare", { name: "a grump snare", icon: "🪤", r: 2.2, near: function (game, c, p) {
if (!noisy(game)) { if (!p.seen) { p.seen = 1; psay("🪤 a snare, right across the path. you step over it"); } return; }
hurt(c, 0.08); chem(c, { fear: 0.3 }); psay("🪤 snap! a grump snare had your foot. creep, on the road to a lair"); bump(game, "snared"); placeEnd(game, p, true);
}, act: { label: "spring the snare with a stick", need: { stick: 1 }, go: function (game, c, p) { give(game, c, "vine", 1); placeEnd(game, p); return "snap. the stick is done for, and the snare's vine is yours"; } } });
PL("rockfall", { name: "loose rocks", icon: "🪨", r: 2.5, near: function (game, c, p) {
if (!noisy(game)) return;
hurt(c, 0.1); drop(game, "stone", 3, p.x + 0.5, p.z); psay("🪨 the rocks come down on you! go quietly under loose rocks"); bump(game, "rockfalls");
if (lucky(game, 0.3)) D.spawnBeast(game, "beetles", { x: p.x, z: p.z }, { quiet: true });
placeEnd(game, p, true);
}, act: { label: "knock the rocks down from here", go: function (game, c, p) { drop(game, "stone", 3, p.x + 0.5, p.z); if (lucky(game, 0.3)) D.spawnBeast(game, "beetles", { x: p.x, z: p.z }, { quiet: true }); placeEnd(game, p); return "down they come, well away from your head. three good stones"; } } });
PL("door", { name: "a sealed door", icon: "🚪", act: { label: "break the seal (it takes an iron pick)", need: { ironpick: 1 }, keep: 1, go: function (game, c, p) { lootAt(game, p.x, p.z, 3); drop(game, "book", 1, p.x - 0.4, p.z - 0.4); placeEnd(game, p); return "nothing else even scratched it. the iron pick goes through, and the captain's store is yours"; } } });
PL("pit", { name: "a dark pit", icon: "🕳", slow: function (game, p) { if (game.world.night && p.sp !== day(game) && !st(game).posts.some(function (q) { return q.guard === "pit" + p.id; })) { p.sp = day(game); var at = spotAt(game, p.x, p.z, 2, 4, Math.random, null); if (at) D.spawnBeast(game, "lairguard", at, { quiet: true, guard: "pit" + p.id }); } },
act: { label: "fill the pit in (4 stone)", need: { stone: 4 }, go: function (game, c, p) { sparks(game, 3, c); placeEnd(game, p); return "four stones and a lot of stamping. nothing is coming out of that again. +3 ✨"; } } });
PL("patch", { name: "a dark patch", icon: "⚫", slow: function (game, p) { if (game.world.night && day(game) - p.day >= 3) { var at = spotAt(game, p.x, p.z, 1, 3, Math.random, null); if (at) D.spawnBeast(game, "unseen", at, { quiet: true, guard: "patch" }); bump(game, "hatched"); placeEnd(game, p, true); } },
act: { label: "clear the dark patch", go: function (game, c, p) { sparks(game, D.metFaction(game, "hush") && D.rank(game, "hush").i >= 2 ? 4 : 2, c); if (lucky(game, 0.4)) drop(game, "gloomstone", 1, p.x + 0.4, p.z); placeEnd(game, p); return "you scuff it out until the ground is just ground. +2 ✨"; } } });
PL("core", { name: "the gloom-bramble's core", icon: "🖤", slow: function (game, p) { if (p.grown === day(game)) return; p.grown = day(game); if (D.placesOf(game, "bramble").filter(function (o) { return o.core === p.id; }).length < 5) { var at = spotAt(game, p.x, p.z, 3, 7, Math.random, null); if (at) placeAdd(game, "bramble", at, { core: p.id }); } },
act: { label: "burn the core", fire: 1, go: function (game, c, p) { D.placesOf(game, "bramble").filter(function (o) { return o.core === p.id; }).forEach(function (o) { placeEnd(game, o, true); }); sparks(game, 8, c); drop(game, "gloomstone", 2, p.x + 0.4, p.z); placeEnd(game, p); return "it goes up with a squeal, and every bramble with it. +8 ✨"; } } });
PL("bramble", { name: "gloom-bramble", icon: "🌿", r: 1.8, near: function (game, c, p) { if (p.bit === day(game)) return; p.bit = day(game); hurt(c, 0.03); psay("🌿 the gloom-bramble scratches. burn its core and it all goes"); },
act: { label: "hack the bramble back", tool: 1, go: function (game, c, p) { placeEnd(game, p); return "gone, for now. it grows back while the core stands"; } } });
PL("darkstone", { name: "a grump dark-stone", icon: "🗿", slow: function (game, p) { tribe(game).forEach(function (c) { if (SB.dist(c.x, c.z, p.x, p.z) < 25) chem(c, { fear: 0.004 }); }); farmsDo(game, function (b) { if (SB.dist(b.x, b.z, p.x, p.z) < 25 && b.data.grow > 0) b.data.grow = Math.max(0, b.data.grow - 0.006); }); },
act: { label: "smash the dark-stone", tool: 1, go: function (game, c, p) { p.n++; if (p.n < 3) return "crack! (" + p.n + " of 3)"; sparks(game, 5, c); drop(game, "gloomstone", 2, p.x + 0.4, p.z); placeEnd(game, p); return "it splits, and the day gets brighter all round. +5 ✨"; } } });
PL("arkpart", { name: "a fallen ark part", icon: "🛰", slow: function (game, p) { tribe(game).forEach(function (c) { chem(c, { bored: 0.003 }); }); farmsDo(game, function (b) { if (SB.dist(b.x, b.z, p.x, p.z) < 20 && b.data.grow > 0) b.data.grow = Math.max(0, b.data.grow - 0.004); }); },
act: { label: "take the ark part to bits", tool: 1, go: function (game, c, p) { p.n++; drop(game, "metal", 1, p.x + 0.4 * p.n, p.z); if (p.n < 3) return "a panel comes off: good metal (" + p.n + " of 3)"; drop(game, "crystal", 1, p.x, p.z + 0.5); placeEnd(game, p); return "that's the last of it: metal, a crystal, and the sour hum has stopped"; } } });
var MEND = [{ metal: 2 }, { stick: 4 }, { crystal: 1 }];
PL("podmend", { name: function (p) { return p.n >= 3 ? "a mended pod lamp" : "a pod wreck worth mending"; }, icon: "🛠", slow: function (game, p) { if (p.n >= 3 && p.gave !== day(game)) { p.gave = day(game); drop(game, "mote", 1, p.x + 0.6, p.z); } },
act: function (game, p) { return p.n >= 3 ? { label: "warm your paws at the pod lamp", go: function (game, c) { chem(c, { cold: -0.5, fear: -0.2 }); return "it hums. it leaves a little light out every dawn now"; } } : { label: "mend it: " + costText(MEND[p.n]), need: MEND[p.n], go: function (game, c, p) { p.n++; if (p.n >= 3) { rename(game, p); sparks(game, 6, c); bump(game, "mended"); return "it lights! the pod lamp is working: a little light here every dawn. +6 ✨"; } return "that's piece " + p.n + " of 3 back where it goes"; } }; } });
PL("fort", { name: "a grump fort", icon: "🏰", act: { label: "storm the fort", go: function (game, c, p) { var r = D.startWave(game, "fort", p, c, { place: p.id }); return r.ok ? "you bang on the gate. out they come" : r; } },
won: function (game, p, c, medal) { if (medal < 2) return; p.kind = "watchfort"; rename(game, p); bump(game, "place:fort"); bump(game, "places"); tell(game, "🏰 the fort is yours. the night watch mans it now."); } });
PL("watchfort", { name: function () { return "the watch fort"; }, icon: "🏰", act: { label: "look in on the watch", go: function (game, c, p, x) { c.chem.tired = Math.min(c.chem.tired || 0, 0.3); if (x.did.bunk) { c.chem.health = 1; c.dkSore = 0; } return (x.did.bunk ? "you take your bunk, and get up mended. " : "") + "the watch is " + x.watch.length + " strong" + (x.watch.length >= 3 ? ", with a proper wall walk and a kettle on" : x.watch.length ? ", and has put up a lookout" : ". ask smols to join (stand by one, in your notices)") + ". now and then it turns a beast back at dusk"; } } });
PL("den", { name: "the den", icon: "🕳", act: { label: "seal the den (3 cinders)", need: { cinder: 3 }, go: function (game, c, p, x) { x.ends.den = day(game); if (SB.Embers && SB.Embers.add) SB.Embers.add(game, "dark-den", "the den the war parties came from is sealed", c); sparks(game, 20, c); placeEnd(game, p); return "three cinders, one after the other, and the hole glows shut. no war party will ever come out of there again. +20 ✨"; } } });
PL("pond", { name: "a snapper pond", icon: "🐊", r: 3, near: function (game, c, p) { if (p.calm === day(game) || game.time < (p.nextBite || 0)) return; p.nextBite = game.time + 20; hurt(c, 0.06); psay("🐊 something in the pond snaps at your toes! feed it a fish and it settles"); bump(game, "snapped"); },
slow: function (game, p) { var it = game.world.items || []; for (var i = 0; i < it.length; i++) if (it[i] && it[i].kind === "egg" && it[i].heldBy == null && !it[i].gone && SB.dist(it[i].x, it[i].z, p.x, p.z) < 4) { SB.World.remove(game.world, it[i]); bump(game, "eggsEaten"); break; } },
act: { label: "feed the snappers a fish", need: { fish: 1 }, go: function (game, c, p) { p.calm = day(game); give(game, c, "clam", 2); return "gulp. they spit two clams back, which is manners, for a snapper. the pond is safe today"; } } });
PL("hollow", { name: "the hush hollow", icon: "🤫", act: { label: "take what the keeper guards", go: function (game, c, p) { if (noisy(game)) return { ok: false, msg: "you're making far too much noise. creep" }; lootAt(game, p.x, p.z, 3); placeEnd(game, p); return "not a sound. you lift it out from under its nose"; } } });
PL("alarmcap", { name: "an alarm cap", icon: "🍄", r: 2.5, near: function (game, c, p) { if (!noisy(game)) return; var at = spotAt(game, c.x, c.z, 9, 12, Math.random, null); if (at) D.spawnBeast(game, "stalker", at, { quiet: true, guard: "alarm" }); psay("🍄 the cap shrieks. something big heard that. creep away"); bump(game, "alarms"); placeEnd(game, p, true); },
act: { label: "pick the alarm cap, very gently", go: function (game, c, p) { if (noisy(game)) return { ok: false, msg: "not while you're crashing about" }; give(game, c, "glowcap", 1); placeEnd(game, p); return "it comes away without a squeak"; } } });
PL("tunnel", { name: "a lightless tunnel mouth", icon: "🕳", act: { label: "go into the tunnel", go: function (game, c, p, x) {
if (!Sv().has(c, "torch")) { x.noise = game.time + 12; for (var i = 0; i < 2; i++) { var at = spotAt(game, p.x, p.z, 3, 6, Math.random, null); if (at) D.spawnBeast(game, "blindgrump", at, { quiet: true, guard: "tunnel" }); } return { ok: false, msg: "it's black in there, and something heard you. only a torch keeps them back" }; }
lootAt(game, p.x, p.z, 3); drop(game, "bugjelly", 1, p.x, p.z + 0.8); placeEnd(game, p); return "with the torch up, they keep to the walls. you come out with your arms full";
} } });
PL("nest", { name: "a bug nest", icon: "🐛", slow: function (game, p) { if (day(game) - (p.spread || p.day) < 2) return; p.spread = day(game); if (D.placesOf(game, "nest").length < 4) { var at = spotAt(game, p.x, p.z, 5, 8, Math.random, null); if (at) { placeAdd(game, "nest", at, {}); bump(game, "nestsSpread"); } } },
act: { label: "burn the bug nest", fire: 1, go: function (game, c, p) { drop(game, "bugjelly", 2, p.x + 0.4, p.z); placeEnd(game, p); var n = cnt(game, "place:nest"); if (n % 3 === 0) { var at = spotAt(game, p.x, p.z, 4, 7, Math.random, null); if (at) D.spawnBeast(game, "hivequeen", at); } return "it burns, and the jelly is left. " + (n % 3 === 0 ? "and now their queen is coming out" : "burn them all before they spread"); } } });
PL("vault", { name: "a sealed pod vault", icon: "🔐", act: { label: "start the vault opening", go: function (game, c, p) { var r = D.startWave(game, "vault", p, c, { place: p.id }); return r.ok ? "it starts to grind open, loudly. hold them off until it's done" : r; } },
won: function (game, p) { lootAt(game, p.x, p.z, 4); drop(game, "book", 1, p.x - 0.5, p.z + 0.5); placeEnd(game, p); } });
PL("arena", { name: "the old ring", icon: "🏟", act: { label: "step into the ring", go: function (game, c, p) { if (p.ran === day(game)) return { ok: false, msg: "the ring is quiet until tomorrow" }; var r = D.startWave(game, "arena", p, c, { place: p.id }); if (r.ok) p.ran = day(game); return r.ok ? "the old ring wakes up. three waves" : r; } },
alt: { label: "beat the taunt drum in the ring", need: { taunt: 1 }, go: function (game, c, p) { var r = D.startWave(game, "omen", p, c, { place: p.id }); return r.ok ? "the drum echoes round the ring. you asked for the hard one" : r; } },
won: function (game, p, c, medal) { lootAt(game, p.x, p.z, medal); } });
PL("pillar", { name: "a dark pillar", icon: "🗼", act: { label: "break the dark pillar", go: function (game, c, p) { var r = D.startWave(game, "pillar", p, c, { place: p.id }); return r.ok ? "you hit it, and things start climbing out" : r; } },
won: function (game, p, c, medal, x) { x = X2(game); x.pillars = (x.pillars || 0) + 1; drop(game, "gloomstone", 2, p.x, p.z); placeEnd(game, p); tell(game, "🗼 a dark pillar is down: " + x.pillars + " of 4."); } });
PL("cube", { name: "the shiny cube", icon: "🟨", slow: function (game, p) { tribe(game).filter(function (c) { return !c._pov && !c.asleep && c.stage >= 1; }).sort(function (a, b) { return SB.dist(a.x, a.z, p.x, p.z) - SB.dist(b.x, b.z, p.x, p.z); }).slice(0, 4).forEach(function (c) { chem(c, { bored: -0.05 }); if (SB.dist(c.x, c.z, p.x, p.z) > 2.5 && SB.Creature && SB.Creature.sendTo) SB.Creature.sendTo(c, p.x + 1, p.z + 1, game, 10); p.n++; }); },
act: { label: "carry the cube off", go: function (game, c, p) { give(game, c, "shinycube", 1); placeEnd(game, p); return "you tuck it in your bag. the others blink, and remember what they were doing"; } } });
PL("ghostlight", { name: function (p) { return "a faint light at " + (p.who || "an old") + "'s grave"; }, icon: "🕯", slow: function (game, p) { if (!game.world.night) { placeEnd(game, p, true); return; } tribe(game).forEach(function (c) { if (c.stage <= 1 && SB.dist(c.x, c.z, p.x, p.z) < 8) chem(c, { fear: 0.03 }); }); },
act: { label: "sit with the light a while", go: function (game, c, p) { chem(c, { fear: -0.3, lonely: -0.3 }); sparks(game, 1, c); var w = D.addWish(game, "lastwish", null, p.who); placeEnd(game, p); return "it's warm, and it's glad of the company" + (w ? ". it wanted one more thing done: see “wishes” in your notices" : ". then it goes out, gently"); } } });
PL("lodge", { name: "the thinkers' lodge", icon: "🚪", act: { label: "knock at the lodge", go: function (game, c, p, x) {
if (c.tier < 5 && !D.hasBoon(game, "lodge")) return { ok: false, msg: "the door guard looks you up and down. “thinkers only.”" };
if (p.rite === day(game)) return { ok: false, msg: "the rite is done for today" };
p.rite = day(game); c.inspired = Math.max(c.inspired || 0, 120); sparks(game, 2, c); bump(game, "rites");
return "the guard nods you in. you sit through the rite of the long thought (there is humming, and a hat). +2 ✨, and your head is buzzing";
} } });
PL("tinkercamp", { name: "the tinkers' camp", icon: "⚙️", act: { label: "have the tinkers mend your tool (1 metal)", need: { metal: 1 }, go: function (game, c) { var hd = Sv().held ? Sv().held(c) : null; if (!hd || !K[hd.k] || !K[hd.k].tool) return { ok: false, msg: "hold the tool you want mended" }; hd.w = 0; bump(game, "tinkered"); return "they pass it round, mutter, and hand it back good as new"; } },
alt: { label: "swap 3 sticks for a tripwire", need: { stick: 3 }, go: function (game, c) { give(game, c, "tripwire", 1); bump(game, "tinkered"); return "one of them ties it while you watch, far too fast to follow"; } } });
PL("tideline", { name: "the tide line", icon: "🌊", slow: function (game, p) { if (day(game) - (p.fd || 0) >= 3) { p.fd = day(game); p.full = 1; } },
act: { label: "comb the tide line", go: function (game, c, p) { if (!p.full) return { ok: false, msg: "nothing new has washed in. the sea leaves things here every third day" }; p.full = 0; give(game, c, "stick", 2); give(game, c, "clam", 1); if (lucky(game, 0.5)) give(game, c, lucky(game, 0.3) ? "book" : "metal", 1); bump(game, "combed"); return "driftwood, a clam, and whatever else the sea was finished with"; } } });
D.ROAD = [
{ id: "pack", t: "a dropped pack on the path", act: "open the pack", go: function (game, c, p) { lootAt(game, p.x, p.z, 1); return "somebody left in a hurry. finders keepers"; } },
{ id: "trader", t: "a lost trader", act: "share your food for something of theirs", go: function (game, c) { var k = h.foodSlot(c); if (!k) return { ok: false, msg: "you have no food to share" }; Sv().take(c, k, 1); give(game, c, topTier(game) >= 3 ? "seed" : "flint", 2); D.move(game, "far", 3, "helped a trader"); return "they eat it standing up, and press something into your paws"; } },
{ id: "hurt", t: "a hurt wild smol", act: "help it up", go: function (game, c) { D.move(game, "wild", 6, "helped one of theirs"); sparks(game, 1, c); return "it leans on you as far as the trees, then it's gone. they will hear of this"; } },
{ id: "singer", t: "a wandering singer", act: "stop and listen", go: function (game, c) { chem(c, { bored: -0.4, lonely: -0.3 }); bump(game, "songsHeard"); return "four verses, most of them about soup. you feel a good deal better"; } },
{ id: "squabble", t: "two critters having a squabble", act: "break it up", go: function (game, c, p) { drop(game, K.hopper ? "hopper" : "beetle", 1, p.x + 0.5, p.z); return "one of them stalks off. the other one is suddenly very interested in you"; } }
];
PL("road", { name: function (p) { return (D.ROAD[p.what] || D.ROAD[0]).t; }, icon: "🧭", slow: function (game, p) { if (day(game) > p.day) placeEnd(game, p, true); },
act: function (game, p) { var d = D.ROAD[p.what] || D.ROAD[0]; return { label: d.act, go: function (game, c, p) { var r = d.go(game, c, p); if (r && typeof r === "object") return r; bump(game, "road:" + d.id); placeEnd(game, p); return r; } }; } });
PL("egg", { name: "a painted egg", icon: "🥚", act: { label: "pick up the painted egg", go: function (game, c, p, x) { if (x.feast) x.feast.eggs = (x.feast.eggs || 0) + 1; bump(game, "eggsFound"); placeEnd(game, p); return "found one!"; } } });
PL("mazelamp", { name: "a maze lantern", icon: "🏮", act: { label: "take the maze lantern", go: function (game, c, p, x) { if (x.feast) x.feast.lamps = (x.feast.lamps || 0) + 1; bump(game, "mazeLamps"); placeEnd(game, p); return "one lantern nearer the middle"; } } });
PL("tripwire", { name: "a vine tripwire", icon: "🪢", slow: function (game, p) { var g = raidersNear(game, p.x, p.z, 3)[0] || game.creatures.filter(function (o) { return o.alive && o.species === "grump" && !o.boss && !o.goingHome && !(o.scout && o.scout.hold) && SB.dist(o.x, o.z, p.x, p.z) < 3; })[0]; if (!g) return; g.whacked = (g.whacked || 0) + 2; turnBack(g); tribe(game).forEach(function (c) { if (c.asleep && !c._pov) c.asleep = false; }); bump(game, "tripped"); tell(game, "🪢 the tripwire went: a grump is tangled and hopping, and the whole village is awake."); placeEnd(game, p); },
act: { label: "take the tripwire up again", go: function (game, c, p) { give(game, c, "tripwire", 1); placeEnd(game, p, true); return "coiled up and back in your bag"; } } });
function turret(every, r) { return function (game, p) { if (game.time < (p.t || 0)) return; var g = raidersNear(game, p.x, p.z, r)[0]; if (!g) return; if (p.kind === "rockpile") { if (!(p.n > 0)) return; p.n--; g.whacked = (g.whacked || 0) + 1; if (g.whacked >= h.need({ tough: g.tough || 1 })) turnBack(g); } else turnBack(g); p.t = game.time + every; bump(game, "turned:" + p.kind); }; }
PL("rockpile", { name: function (p) { return "a rock pile on the wall (" + (p.n || 0) + " rocks)"; }, icon: "🪨", slow: turret(6, 14), act: { label: "load the rock pile (3 stone)", need: { stone: 3 }, go: function (game, c, p) { p.n = (p.n || 0) + 3; rename(game, p); return "three more. the smols on the wall will throw them at whatever comes"; } } });
PL("guardian", { name: "the stone guardian", icon: "🗿", slow: turret(8, 16), act: { label: "pat the stone guardian", go: function (game) { return "it doesn't move. it has turned " + cnt(game, "turned:guardian") + " raiders back so far"; } } });
PL("snowsmol", { name: "a snow smol", icon: "⛄", slow: function (game, p) { if (game.world.season !== 3) { placeEnd(game, p, true); return; } turret(12, 12)(game, p); }, act: { label: "fix the snow smol's nose", go: function (game) { return "better. it has pelted " + cnt(game, "turned:snowsmol") + " grumps with snowballs"; } } });
D.ROOMS = [
{ name: "the grow room", need: { seed: 3, berry: 3 }, gives: "the farms grow a little every dawn, whatever the weather" },
{ name: "the map room", need: { crystal: 1, flint: 2 }, gives: "every place on the island is on your map" },
{ name: "the lamp room", need: { mote: 2, stick: 3 }, gives: "the wells of light fill twice a day" },
{ name: "the bunk room", need: { fur: 2, fiber: 3 }, gives: "a family from another pod moves in" },
{ name: "the story room", need: { book: 1, honey: 1 }, gives: "story night: a new gathering", after: 1 }
];
PL("room", { name: function (p) { return D.ROOMS[p.room].name + (p.done ? " (mended)" : ""); }, icon: "🛸", act: function (game, p, x) { var R = D.ROOMS[p.room]; return p.done ? { label: "look round " + R.name, go: function () { return R.gives; } } : { label: "mend " + R.name + ": " + costText(R.need), go: function (game, c, p, x) {
if (!x.wreckOpen) { if (!st(game).posts.some(function (q) { return q.bid === "wreckwarden"; })) { var at = spotAt(game, p.x, p.z, 5, 8, Math.random, null); if (at) D.spawnBeast(game, "wreckwarden", at); } return { ok: false, msg: "the wreck is sealed. its warden is coming for you" }; }
if (!hasAll(c, R.need)) return { ok: false, msg: "it takes " + costText(R.need) };
takeAll(c, R.need); p.done = day(game); rename(game, p); bump(game, "rooms"); sparks(game, 5, c);
var hm = home(game);
if (p.room === 1) (game.sites || []).forEach(function (q) { if (!q.gone && SB.World.reveal) SB.World.reveal(game.world, q.x, q.z, 6); });
if (p.room === 3) for (var i = 0; i < 2; i++) { var nc = h.newcomer(game, hm.x + 4 + i, hm.z + 3, i === 1, "bunk"); if (nc) emit("darkJoined", { c: nc, how: "bunk room" }); }
if (cnt(game, "rooms") === 4) { x.wreckWhole = day(game); if (SB.Embers && SB.Embers.add) SB.Embers.add(game, "dark-wreck", "the ark wreck is whole again, room by room", c); }
return "🛸 " + R.name + " is mended: " + R.gives + ". +5 ✨";
} }; } });
D.roomDone = function (game, i) { return X2(game).places.some(function (p) { return p.kind === "room" && p.room === i && p.done; }); };
PL("gate", { name: function (p) { return p.open ? "the gate of three lights (open)" : "the gate of three lights"; }, icon: "⛩", act: function (game, p, x) {
if (!p.open) return { label: "set the three captains' lights in the gate", need: { duskshard: 1, cinder: 1, starmetal: 1 }, go: function (game, c, p, x) { p.open = day(game); x.gate = day(game); rename(game, p); return "one by one, by hand. the gate opens on somewhere that is not the island"; } };
return { label: "step through the gate", go: function (game, c, p, x) {
if (x.ends.dark) return "it is only an arch now. you ended it";
if ((x.pillars || 0) < 4 && !game.ended) return { ok: false, msg: "four dark pillars hold it shut. " + (x.pillars || 0) + " of 4 are down" };
if (st(game).posts.some(function (q) { return q.bid === "thedark"; })) return { ok: false, msg: "it is already here" };
D.spawnBeast(game, "thedark", spotAt(game, p.x, p.z, 6, 9, Math.random, null) || { x: p.x + 6, z: p.z });
return "you step into the last arena. the dark itself turns round";
} };
} });
PL("tear", { name: "a dark tear", icon: "🌀", act: { label: "go through and close the tear", go: function (game, c, p) {
if (!p.kept) { p.kept = 1; p.base = cnt(game, "beat:tearkeeper"); D.spawnBeast(game, "tearkeeper", spotAt(game, p.x, p.z, 5, 8, Math.random, null) || { x: p.x + 5, z: p.z }, { guard: "tear" }); return { ok: false, msg: "its keeper steps out to meet you. beat it, then close the tear" }; }
if (cnt(game, "beat:tearkeeper") <= p.base) return { ok: false, msg: "not while its keeper stands" };
sparks(game, 10, c); placeEnd(game, p); return "you pull the edges together like a curtain. it stays shut. +10 ✨";
} } });
PL("bulb", { name: "a strange bulb", icon: "🌺", act: { label: "break the bulb", tool: 1, go: function (game, c, p) { D.spawnBeast(game, "treegiant", spotAt(game, p.x, p.z, 5, 8, Math.random, null) || { x: p.x + 5, z: p.z }); placeEnd(game, p); return "it pops. the biggest tree in the jungle opens its eyes"; } } });
PL("hive", { name: "a great hive", icon: "🍯", act: { label: "raid the great hive", go: function (game, c, p) { give(game, c, "honey", 2); D.spawnBeast(game, "queenbee", spotAt(game, p.x, p.z, 4, 7, Math.random, null) || { x: p.x + 4, z: p.z }); placeEnd(game, p); return "two pawfuls of honey, and a very large buzzing behind you"; } } });
D.MONO = ["it is cold, and it is older than the ark.", "it hums when grumps are near. more of them are about since you started poking it.", "something came out of it while you were looking. it is listening now.", "it knows your name. it can be sealed, or it can be spoken to."];
PL("monolith", { name: "the dark stone", icon: "⬛", act: function (game, p, x) {
if ((x.mono || 0) < 4) return { label: "study the dark stone", go: function (game, c, p, x) { if (p.st === day(game)) return { ok: false, msg: "enough for one day. your teeth are still buzzing" }; p.st = day(game); x.mono = (x.mono || 0) + 1; if (x.mono === 3) { var at = spotAt(game, p.x, p.z, 4, 7, Math.random, null); if (at) D.spawnBeast(game, "unseen", at, { quiet: true, guard: "mono" }); } sparks(game, 2, c); return "⬛ (" + x.mono + " of 4) " + D.MONO[x.mono - 1]; } };
return { label: "seal the dark stone (2 cinders)", need: { cinder: 2 }, go: function (game, c, p, x) { x.ends.void = "seal"; sparks(game, 15, c); if (SB.Embers && SB.Embers.add) SB.Embers.add(game, "dark-void", "the dark stone, sealed", c); placeEnd(game, p); return "it goes dull, like an ordinary rock. fewer things will walk the island at night now. +15 ✨"; } };
}, alt: function (game, p, x) { return (x.mono || 0) >= 4 ? { label: "speak to the dark stone", go: function (game, c, p, x) { x.ends.void = "friend"; D.move(game, "grumps", 40, "spoke to the dark"); if (SB.Embers && SB.Embers.add) SB.Embers.add(game, "dark-void", "the dark stone, befriended", c); placeEnd(game, p); return "you tell it about soup, and fires, and the others. it listens for a long time. the grumps will be different with you now"; } } : null; } });
D.WANTS = [["honey", 1], ["fish", 2], ["crystal", 1], ["cooked", 1], ["glowcap", 2]];
PL("talkrelic", { name: "a talking relic", icon: "🗣", act: function (game, p) { var w = D.WANTS[p.want % D.WANTS.length], need = {}; need[w[0]] = w[1]; return { label: "give the relic what it wants: " + costText(need), need: need, go: function (game, c, p) { D.addBoon(game, "trick"); D.move(game, "far", -4, "a relic's bargain"); bump(game, "bargains"); placeEnd(game, p); return "“pleasure doing business.” you know a trick now (see your knacks). it also told the far tribe something rude about you"; } }; },
alt: { label: "smash the cheeky thing", tool: 1, go: function (game, c, p) { sparks(game, 6, c); D.move(game, "wild", 5, "broke a relic"); bump(game, "relicsSmashed"); placeEnd(game, p); return "“you'll regret th—”. +6 ✨, and the wild smols approve"; } } });
PL("sealedruin", { name: "a sealed ruin", icon: "🏛", act: { label: "break into the sealed ruin (it takes an iron pick)", need: { ironpick: 1 }, keep: 1, go: function (game, c, p) { D.spawnBeast(game, "stoneguard", spotAt(game, p.x, p.z, 4, 7, Math.random, null) || { x: p.x + 4, z: p.z }); placeEnd(game, p); return "the wall gives. inside, a statue turns its head"; } } });
PL("heart", { name: "a heart tree", icon: "🫀", act: { label: "break the heart tree", tool: 1, go: function (game, c, p) { var q = h.st(game).posts.filter(function (o) { return o.key === p.post; })[0]; if (q) q.heartDone = 1; placeEnd(game, p); return "it cracks down the middle. the creaking thing can be hurt now"; } } });
PL("relic", { name: "a cold relic", icon: "🪔", act: { label: "relight the relic", fire: 1, go: function (game, c, p, x) { if (x.wave && x.wave.relicPl === p.id) x.wave.relicDone = 1; bump(game, "relit"); return "it catches. all over the island, the risers lie down again"; } } });
PL("lamp", { name: "a dark lamp", icon: "🏮", act: { label: "break the dark lamp", tool: 1, go: function (game, c, p) { placeEnd(game, p); var n = D.placesOf(game, "lamp").length; return "it goes out with a hiss. " + (n ? n + " more: while they burn, the captain mends as you fight it" : "that was the last. the captain won't mend while you fight it now"); } } });
PL("hoard", { name: "the grumps' hoard", icon: "💰", act: { label: "take from the hoard", go: function (game, c, p, x) { if (p.took === day(game)) return { ok: false, msg: "you've had today's share. they are counting it" }; p.took = day(game); x.maskBroke = day(game); lootAt(game, p.x, p.z, 2); D.move(game, "grumps", -4, "robbed their hoard"); bump(game, "hoards"); return "you help yourself. mask or no mask, every guard in the camp has noticed"; } },
alt: { label: "pay the guards 5 shells to look away", go: function (game, c, p, x) { if ((c.purse || 0) < 5) return { ok: false, msg: "you haven't 5 shells" }; c.purse = r2(c.purse - 5); x.bribed = day(game); bump(game, "bribes"); return "five shells change paws. the camp guards find the sky very interesting until tomorrow"; } } });
PL("tracks", { name: "giant tracks", icon: "🐾", act: { label: "follow the giant's tracks", go: function (game, c, p, x) { p.n++; if (p.n < 3) { var at = spotAt(game, p.x, p.z, 12, 18, Math.random, null); if (at) { p.x = at.x; p.z = at.z; var b = h.findStruct(game, "darkmark", "pl-" + p.id); if (b) { b.x = at.x; b.z = at.z; } } return "each print is as big as a hut. they go on, to the " + dirOf(p.x - c.x, p.z - c.z) + " (" + p.n + " of 3)"; } give(game, c, "giantfluff", 3); bump(game, "giantFound"); placeEnd(game, p); return "there it is: as tall as a tree, chewing. it lets you comb three pawfuls of fluff out of its coat"; } } });
function once(x, key) { if (x.did[key]) return false; x.did[key] = 1; return true; }
function near1(game, cx, cz, d0, d1) { return spotAt(game, cx, cz, d0, d1, Math.random, null); }
D.LAIR_KIND = { gloom: "lairguard", murk: "firespitter", night: "noctol" }; // each captain keeps its own kind about its lair
D.seed = function (game) {
var x = X2(game), hm = home(game), top = topTier(game), B = SB.Bosses, d = day(game), r = dice(game, "seed" + d), at, i;
if (B && B.open && B.open(game)) {
var bs = B.place(game).list;
B.LIST.forEach(function (bd) {
var e = bs[bd.id]; if (!e || e.beaten) return;
if (B.awake(game, bd) && once(x, "lair-" + bd.id)) {
for (i = 0; i < 3; i++) { at = near1(game, e.x, e.z, 10, 16); if (at) placeAdd(game, "knot", at, { lair: bd.id }); }
for (i = 1; i <= 2; i++) { at = near1(game, hm.x + (e.x - hm.x) * (0.45 + i * 0.15), hm.z + (e.z - hm.z) * (0.45 + i * 0.15), 0, 4); if (at) placeAdd(game, i === 1 ? "snare" : "rockfall", at, {}); }
at = near1(game, e.x, e.z, 12, 18); if (at) placeAdd(game, "door", at, {});
at = near1(game, e.x, e.z, 14, 20); if (at) placeAdd(game, "pit", at, { lair: bd.id });
at = near1(game, e.x, e.z, 11, 14); if (at) D.spawnBeast(game, D.LAIR_KIND[bd.id] || "lairguard", at, { quiet: true, guard: "lair" });
if (bd.id === "night") for (i = 0; i < 2; i++) { at = near1(game, e.x, e.z, 6, 9); if (at) placeAdd(game, "lamp", at, {}); }
}
if (!B.awake(game, bd) && once(x, "stalk-" + bd.id) && top >= 2) { at = near1(game, e.x, e.z, 3, 6); if (at) D.spawnBeast(game, "stalker", at, { quiet: true, guard: "early" }); }
});
}
(game.sites || []).forEach(function (q) {
if (q.gone || !q.found) return;
if (q.kind === "wreck" && once(x, "wreck-" + q.id)) {
if (!x.did.rooms) { x.did.rooms = 1; for (i = 0; i < 4; i++) { at = near1(game, q.x, q.z, 3, 6); if (at) placeAdd(game, "room", at, { room: i }); } }
else if (!D.placesOf(game, "podmend").length) { at = near1(game, q.x, q.z, 2, 4); if (at) placeAdd(game, "podmend", at, {}); }
at = near1(game, q.x, q.z, 3, 5); if (at) D.spawnBeast(game, top >= 4 ? "dronelet" : "sleeper", at, { quiet: true, guard: "site" });
}
if (q.kind === "ruin" && once(x, "ruin-" + q.id)) { at = near1(game, q.x, q.z, 3, 6); if (at) placeAdd(game, x.did.ruin1 ? "talkrelic" : "sealedruin", at, { want: q.id }); x.did.ruin1 = 1; }
if (q.kind === "camp" && !q.done && once(x, "camp-" + q.id)) { at = near1(game, q.x, q.z, 2, 4); if (at) placeAdd(game, "hoard", at, { site: q.id }); at = near1(game, q.x, q.z, 4, 7); if (at) D.spawnBeast(game, "campguard", at, { quiet: true, guard: "camp" }); }
if (q.kind === "cave" && once(x, "cave-" + q.id)) { at = near1(game, q.x, q.z, 3, 6); if (at) { placeAdd(game, "nest", at, {}); D.spawnBeast(game, "bug", near1(game, at.x, at.z, 1, 3) || at, { quiet: true, guard: "nest" }); } }
});
if (game.ended && D.roomDone(game, 0) && once(x, "room5")) { var rm = D.placesOf(game, "room")[0]; at = rm ? near1(game, rm.x, rm.z, 2, 5) : null; if (at) placeAdd(game, "room", at, { room: 4 }); }
var plan = [ // [key, kind, min tier, min day, biome or null, d0, d1, data]
["arena", "arena", 2, 4, null, 26, 40], ["hollow", "hollow", 2, 5, null, 30, 48], ["tide", "tideline", 1, 3, SEA], ["pond", "pond", 1, 3, WET], ["hive", "hive", 2, 4, ["forest", "jungle", "flowers", "meadow"]],
["tunnel", "tunnel", 3, 7, null, 34, 55], ["vault", "vault", 3, 8, null, 30, 50], ["fort", "fort", 3, 7, null, 36, 60], ["mono", "monolith", 3, 9, null, 32, 52], ["bulb", "bulb", 4, 8, ["jungle", "bamboo", "forest"]],
["core", "core", 2, 8, null, 24, 40], ["dstone", "darkstone", 3, 6, null, 18, 26]
];
for (i = 0; i < plan.length; i++) {
var pl = plan[i];
if (top < pl[2] || d < pl[3] || x.did[pl[0]]) continue;
at = pl[4] ? biomeSpot(game, pl[4], r) : spotAt(game, hm.x, hm.z, pl[5], pl[6], r, null);
if (!at) { if (pl[4] && d > pl[3] + 3) at = spotAt(game, hm.x, hm.z, 28, 50, r, null); if (!at) continue; }
x.did[pl[0]] = 1; var np = placeAdd(game, pl[1], at, {});
if (pl[1] === "hollow") { D.spawnBeast(game, "hushguard", near1(game, at.x, at.z, 2, 4) || at, { quiet: true, guard: "hollow" }); for (var j = 0; j < 2; j++) { var ap = near1(game, at.x, at.z, 5, 9); if (ap) placeAdd(game, "alarmcap", ap, {}); } }
if (pl[1] === "tideline") np.full = 1;
break; // one new place a day is plenty
}
if (tribe(game).filter(function (c) { return c.tier >= 5; }).length >= 2 && once(x, "lodge")) { at = near1(game, hm.x, hm.z, 9, 14); if (at) placeAdd(game, "lodge", at, {}); }
if (capBeat(game) >= 3 && once(x, "hexer")) { var wq = (game.sites || []).filter(function (q) { return q.kind === "wreck" && q.found && !q.gone; })[0]; at = wq ? near1(game, wq.x, wq.z, 4, 8) : near1(game, hm.x, hm.z, 30, 45); if (at) D.spawnBeast(game, "hexer", at, { guard: "hexer" }); else x.lastAct = d; }
if (x.lastAct && once(x, "late")) { for (i = 0; i < 4; i++) { at = spotAt(game, hm.x, hm.z, 30, 60, r, i * 1.57); if (at) placeAdd(game, "pillar", at, {}); } at = near1(game, hm.x, hm.z, 40, 70); if (at) placeAdd(game, "den", at, {}); at = near1(game, hm.x, hm.z, 16, 24); if (at) placeAdd(game, "gate", at, {}); }
};
[{ id: "elder", icon: "👑", name: "the elder ark", base: 0, x2: 1, chief: "the Steward", ranks: [[-20, "rivals", "they poach your caravans"], [20, "guests", "they are watching how you do"], [101, "patrons", "a gift at the nest every third dawn"]] },
{ id: "reed", icon: "🎋", name: "the reed folk", base: 0, x2: 1, chief: "Long Toes", ranks: [[-20, "wary", "they keep to their reeds"], [30, "neighbours", "they wave"], [101, "friends", "fish at the nest every other dawn"]] },
{ id: "hush", icon: "🤫", name: "the hush", base: -20, x2: 1, chief: "the Quiet One", ranks: [[-10, "against you", "they tell the grumps where you sleep"], [30, "wavering", "they have stopped tipping the grumps off"], [101, "turned", "they keep a fire lit for you: clearing a dark patch pays double"]] }
].forEach(function (f) { if (!D.FAC[f.id]) { D.FACTIONS.push(f); D.FAC[f.id] = f; } });
D.FAC.grumps.chief = "the den mother"; D.FAC.far.chief = "old Marrow"; D.FAC.wild.chief = "Bright-Eyes";
D.metFaction = function (game, id) { return !!X2(game).met["f:" + id]; };
function meet(game, id) { X2(game).met["f:" + id] = 1; }
D.BOONS = {
word: ["🗣", "the word", "say it (in your notices) and for half a minute nothing can hide, fly or flicker. near a lair it drags the captain out to you"],
stars: ["🔭", "star sense", "you can read the stars anywhere"],
lodge: ["🗝", "the lodge key", "the thinkers' lodge lets you in"],
lucky: ["🍀", "a lucky streak", "every day's luck leans your way"],
twice: ["🕯", "deep wells", "a well of light fills twice a day"],
quiet: ["🐾", "quiet feet", "things that hunt by sound never hear you, and snares never catch you", 1],
hard: ["✊", "hard paws", "every hit on a grump lands a tenth harder", 1],
pay: ["🐚", "a good name", "the council pays a quarter more", 1],
trick: ["🃏", "the relic's trick", "a posted grump that is beaten down lets go of twice as much", 1]
};
D.hasBoon = function (game, id) { return X2(game).boons.indexOf(id) >= 0; };
D.addBoon = function (game, id) { var x = X2(game); if (!D.BOONS[id] || D.hasBoon(game, id)) return false; x.boons.push(id); if (D.BOONS[id][3] && !x.knack) x.knack = id; emit("darkBoon", { id: id }); return true; };
D.knack = function (game) { var x = game && game.quests && game.quests.dark && game.quests.dark.x2; return x && x.knack ? x.knack : ""; };
D.setKnack = function (game, id) { if (!D.BOONS[id] || !D.BOONS[id][3] || !D.hasBoon(game, id)) return false; X2(game).knack = id; return true; };
D.COND = {
beacon: function (game) { return beaconUp(game); },
den: function (game) { return !!X2(game).ends.den; },
fire: function (game) { return h.fires(game, 30).some(function (b) { return b.data.lit; }); },
truce: function (game) { return D.rank(game, "grumps").i >= 2; }
};
D.LINES = [
{ id: "officer2", icon: "🛰", name: "the last bearing", open: function (game) { return (game.logsFound || 0) >= 7; }, steps: [["go", "the seventh log ends in a bearing. walk it out", 30, 50]], end: "under a cairn: the ark's star chart, wrapped in oilcloth. read it at the star dome or a well of light", give: { item: ["starchart", 1], sparks: 6 } },
{ id: "hermit", icon: "🧙", name: "the hermit on the hill", open: function (game) { return topTier(game) >= 3 && day(game) >= 6; }, steps: [["go", "smoke, where nobody lives. go and see", 34, 55, HIGH], ["bring", "an ascended hermit, very cross at being found. it wants glowcaps for its tea", { glowcap: 2 }], ["count", "“now go and see off two beasts. i can't think with them about”", "beasts", 2]], end: "the hermit taps you between the eyes. you can read the stars from anywhere now, and the lodge will let you in", give: { boon: "stars", boon2: "lodge", sparks: 8 } },
{ id: "snail", icon: "🐌", name: "somebody under the rocks", open: function (game) { return (game.sites || []).some(function (q) { return q.kind === "wreck" && q.found; }); }, steps: [["go", "knocking, from under a rockfall by the wreck", 20, 34], ["bring", "a pod survivor, pinned. three sticks would lever it", { stick: 3 }]], end: "out it comes, dusty and talking. it is a surveyor, and it starts pinning notes on the board about places nobody has found", give: { join: "the surveyor", flag: "surveyor", sparks: 5 } },
{ id: "forge", icon: "⚒", name: "the crystal forge", open: function (game) { return topTier(game) >= 4; }, steps: [["bring", "a page about a forge that only lights once. it wants crystal", { crystal: 3 }], ["go", "the forge is cold, and waiting", 30, 50], ["pick", "it will make one thing, once. choose", [["a dusk charm", "duskcharm"], ["an iron pick", "ironpick"], ["a warm cloak", "cloak"]]]], end: "it flares, makes the one thing, and goes dark for good", give: { pick: 1, sparks: 5 } },
{ id: "guards", icon: "🛡", name: "the fighters' band", open: function (game) { return topTier(game) >= 3; }, steps: [["count", "the guards want to see you fight. see off three beasts", "beasts", 3], ["count", "stand two nights with them", "nights", 2], ["count", "and hold a wave", "wave", 1]], end: "they bang their sticks on the ground. you lead the fighters' band now", give: { boon: "hard", flag: "headGuards", sparks: 8 } },
{ id: "makers", icon: "🔨", name: "the makers' bench", open: function (game) { return topTier(game) >= 2 && day(game) >= 4; }, steps: [["bring", "the makers want proof you can carry: six sticks", { stick: 6 }], ["bring", "and that you can find: two metal", { metal: 2 }], ["count", "and that you finish things: see to three marked places", "places", 3]], end: "the old bench at the front is yours. you head the makers", give: { boon: "pay", flag: "headMakers", sparks: 8 } },
{ id: "college", icon: "🎓", name: "the thinkers' test", open: function (game) { return hasStruct(game, "school") || hasStruct(game, "observatory"); }, steps: [["pick", "“what is brighter than a fire, and can't be put out?”", [["a bigger fire", "wrong"], ["an idea", "right"], ["a grump's bottom", "wrong"]], "right"], ["count", "read the stars twice", "readings", 2], ["count", "read or write a book", "read", 1]], end: "they give you the hat. it doesn't fit. you are one of the thinkers", give: { boon: "lodge", flag: "headThinkers", sparks: 8 } },
{ id: "thieves", icon: "🧤", name: "the take-backs", open: function (game) { return topTier(game) >= 3 && D.placesOf(game, "hoard").length > 0; }, steps: [["count", "three sneaky smols want back what the grumps stole. start with a hoard", "hoards", 1], ["count", "then see off two beasts on the quiet", "beasts", 2], ["bring", "and bring two metal home to its owners", { metal: 2 }]], end: "they show you how to walk without making a sound", give: { boon: "quiet", sparks: 8 } },
{ id: "nightwatch", icon: "🌙", name: "the inner watch", open: function (game) { return !!X2(game).lines.guards && X2(game).lines.guards.done; }, steps: [["count", "stand three more nights", "nights", 3], ["pick", "the inner watch offers one of three gifts", [["quiet feet", "quiet"], ["hard paws", "hard"], ["a good name", "pay"]]]], end: "you are of the inner watch. you can change the gift whenever you like (your knacks)", give: { pickBoon: 1, sparks: 5 } },
{ id: "bards", icon: "🎵", name: "the lost song", open: function (game) { return topTier(game) >= 2 && day(game) >= 5; }, steps: [["go", "the singers have lost a song. the first verse was last heard out here", 18, 30], ["go", "verse two: “and the soup was hot, and the dark was not”", 22, 36], ["go", "the last verse, scratched on a stone", 26, 42]], end: "all three verses. the singers have it by heart before you finish humming it: feasts will be better for it", give: { flag: "song", item: ["firework", 2], sparks: 6 } },
{ id: "blades", icon: "⚔", name: "the captain-hunters", open: function (game) { return topTier(game) >= 3; }, steps: [["count", "ask three smols into the night watch", "joined", 3], ["count", "then take them hunting: beat something big", "bigGame", 1]], end: "three smols and you. the captains will have heard", give: { sparks: 12, item: ["potion", 2] } },
{ id: "elders", icon: "🧓", name: "the old ones on the hill", open: function (game) { return topTier(game) >= 3 && capBeat(game) >= 1; }, steps: [["go", "the oldest smols want a word", 16, 26], ["count", "“let one go. a named one, beaten, and let it walk.”", "released", 1]], end: "they teach you a word. it is a short one", give: { boon: "word", sparks: 8 } },
{ id: "dawnwatch", icon: "🌅", name: "the watch needs a roof", open: function (game) { return topTier(game) >= 3; }, steps: [["count", "ask two smols into the night watch", "joined", 2], ["count", "and take them a fort", "place:fort", 1]], end: "the watch has a roof, a wall and a kettle. it grows as more join", give: { sparks: 10 } },
{ id: "thane", icon: "🏅", name: "friend of the village", open: function (game) { return (st(game).board.seals || 0) >= 2; }, steps: [["count", "do five jobs off the board", "seals", 5], ["count", "and grant two wishes", "wishes", 2]], end: "they name you friend of the village. a helper follows you about now, and the guards wave you through", give: { flag: "thane", sparks: 10 } },
{ id: "wildchief", icon: "🐾", name: "the wild band", open: function (game) { return D.rank(game, "wild").i >= 2; }, steps: [["bring", "the wild smols are arguing about who leads. bring berries to the argument", { berry: 5 }], ["count", "leave them three gifts", "gifts", 3]], end: "they have decided. it's you. wild smols will walk in more often now", give: { flag: "wildChief", fac: ["wild", 20], sparks: 8 } },
{ id: "twosides", icon: "⚖", name: "the hill family and the shore family", open: function (game) { return tribe(game).length >= 6; }, steps: [["pick", "two families aren't speaking, over a pot", [["back the hill family", "hill"], ["back the shore family", "shore"], ["make them eat together", "peace"]]], ["bring", "whatever you chose, it takes a supper", { cooked: 2 }]], end: "", give: { sides: 1, sparks: 6 } },
{ id: "holds", icon: "🚩", name: "the island, a piece at a time", open: function (game) { return topTier(game) >= 3 && day(game) >= 6; }, steps: [["count", "win back one piece of the island: a camp, a fort or a pillar", "regions", 1], ["count", "then another", "regions", 1], ["count", "and a third", "regions", 1]], end: "three pieces of the island are yours again. the grumps have noticed", give: { sparks: 15, fac: ["grumps", -10] } },
{ id: "saints", icon: "🎭", name: "the two camps", open: function (game) { return topTier(game) >= 3 && (game.sites || []).filter(function (q) { return q.kind === "camp" && !q.gone; }).length >= 1 && day(game) >= 7; }, steps: [["bring", "two grump camps hate each other. send one a rude present", { shroom: 2 }], ["go", "and leave the blame at the other", 30, 55]], end: "by morning they are shouting at each other across the valley. no war party will bother with you for three days", give: { truce: 3, sparks: 6 } },
{ id: "cause", icon: "🌀", name: "the tear", open: function (game) { return capBeat(game) >= 2; }, steps: [["place", "a tear has opened in the air. go through and close it", "tear", 28, 46]], end: "the tear is shut", give: { sparks: 6, item: ["gloomstone", 2] } },
{ id: "tribunal", icon: "🗿", name: "the far shore", open: function (game) { return topTier(game) >= 4; }, steps: [["go", "a boat-shaped rock, a long way off, with two lots of smols arguing on it", 50, 80, SEA], ["pick", "the old keepers want it left alone. the newcomers want to live there", [["side with the keepers", "keep"], ["side with the newcomers", "new"]]], ["bring", "either way, they need feeding", { fish: 3 }]], end: "", give: { tribunal: 1, sparks: 8 } },
{ id: "falselight", icon: "🪔", name: "the other lantern", open: function (game) { return capBeat(game) >= 2; }, steps: [["go", "a second light, low on the far side of the island, calling smols to it", 45, 75], ["beat", "it is no lantern. put it out", "falselantern"]], end: "it goes out. there is one Lantern", give: { sparks: 10 } },
{ id: "serana", icon: "🧣", name: "the sealed pod", open: function (game) { return day(game) >= 5; }, steps: [["go", "a pod that never opened, half in the ground", 22, 38], ["bring", "somebody is inside, awake, and poorly. healroot", { herb: 1 }]], end: "", give: { pal: 1, sparks: 5 } },
{ id: "giant", icon: "🐾", name: "the gentle giant", open: function (game) { return !!X2(game).did.giant; }, steps: [["place", "follow the giant's tracks until you find it", "tracks", 16, 26]], end: "you found the gentle giant", give: { sparks: 5 } },
{ id: "cousins", icon: "🐟", name: "the great fish's cousins", open: function (game) { return cnt(game, "fish") >= 5 && day(game) >= 8; }, steps: [["beat", "something much bigger than a fish has been taking lines. it is at the shore", "watergrump"]], end: "the cousins know better than to come inshore now", give: { item: ["glowbait", 1], sparks: 6 } },
{ id: "reedfolk", icon: "🎋", name: "the reed folk", open: function (game) { return day(game) >= 8 && topTier(game) >= 2; }, steps: [["go", "smoke over the reeds. another pod's people, and not smols", 36, 60, WET.concat(SEA)], ["bring", "they don't talk. they like fish", { fish: 3 }]], end: "the reed folk nod, all at once. you can trade at their camp", give: { fac: ["reed", 35], placeAt: "reedcamp", sparks: 6 } },
{ id: "cult", icon: "🤫", name: "the hush", open: function (game) { return day(game) >= 9 && topTier(game) >= 3; }, steps: [["go", "a ring of stones, and smols who bow to the dark", 30, 50], ["pick", "they think the grumps will spare them", [["tell them what the grumps were", "talk"], ["chase them off", "chase"], ["leave them to it", "leave"]]]], end: "", give: { cult: 1, sparks: 5 } },
{ id: "parley", icon: "🏳", name: "a grump under a white rag", open: function (game) { return D.rank(game, "grumps").i >= 1 && day(game) >= 6; }, steps: [["go", "a grump is waiting, alone, with a rag on a stick. it wants to talk", 18, 28], ["pick", "it speaks, slowly. “food. then no raid. three days.”", [["bargain: two suppers", "deal"], ["send it away", "no"]]]], end: "", give: { parley: 1 } },
{ id: "journey", icon: "⛵", name: "the far signal", open: function (game) { return beaconUp(game); }, steps: [["go", "the beacon has an answer: a light on the far shore. walk to it", 50, 85, SEA], ["wave", "hold the far shore while the others land", "wavenight"]], end: "they are ashore. a second way home: the others came to you", give: { end: "journey", sparks: 25 } },
{ id: "ascent", icon: "👑", name: "the elder ark", open: function (game) { return topTier(game) >= 4 && day(game) >= 12; }, steps: [["pick", "an ark that never crashed has landed. its elders look down their noses", [["welcome them", "patron"], ["keep them out", "rival"]]], ["bring", "the elders expect a table", { cooked: 3 }], ["wave", "keep them safe through the nights the dark comes for them", "ascent"]], end: "", give: { elder: 1, sparks: 20 } },
{ id: "dawnstory", icon: "🕯", name: "they want it dark again", open: function (game) { return beaconUp(game); }, steps: [["wave", "the dark is coming to put the beacon out. hold it", "snuffers"]], end: "the beacon is still lit. it will stay lit", give: { sparks: 20, item: ["starfruit", 2] } },
{ id: "lastwalk", icon: "🌟", name: "a walk in the light", open: function (game) { return beaconUp(game); }, steps: [["go", "the Lantern asks for a walk before the end. first: where you woke", 6, 12], ["go", "then: where the first fire was", 8, 16], ["go", "then: stand under the beacon and look up", 4, 10]], end: "“you were clever once. look at you. you are again.”", give: { sparks: 15, ember: "a last walk in the Lantern's light" } },
{ id: "mappieces", icon: "🧩", name: "the map in three pieces", open: function (game) { return beaconUp(game) || (game.ngPlus || 0) > 0; }, steps: [["go", "a corner of a map of somewhere else", 28, 44], ["go", "the second piece, the one with the coast on", 34, 54], ["go", "the last piece", 40, 64]], end: "three pieces, one map: the next island. every place on this one is on your map too", give: { reveal: 1, sparks: 15, ember: "the map of the next island, pieced together" } },
{ id: "denline", icon: "🕳", name: "where they come from", open: function (game) { return capBeat(game) >= 3; }, steps: [["count", "beat two war parties or waves, and watch which way the rest run", "routs", 2], ["have", "they all run to one hole. seal the den (3 cinders)", "den"]], end: "the den is sealed. the raids are over: an ending of its own", give: { sparks: 10 } }
];
D.LINE_BY = {}; D.LINES.forEach(function (L) { D.LINE_BY[L.id] = L; });
D.LINE_MAX = 3;
function lineMark(game, l, st4) {
var hm = home(game), r = Math.random, at = st4[4] ? (biomeSpot(game, st4[4], r) || spotAt(game, hm.x, hm.z, st4[2], st4[3], r, null)) : spotAt(game, hm.x, hm.z, st4[2], st4[3], r, null);
at = at || { x: r1(hm.x + st4[2]), z: r1(hm.z + 3) };
l.x = at.x; l.z = at.z; return at;
}
function stepEnter(game, L, l) {
var s = L.steps[l.step], hm = home(game), at;
l.x = null; l.z = null; l.base = 0; l.pid = null;
if (s[0] === "go") lineMark(game, l, s);
if (s[0] === "count") l.base = cnt(game, s[2]);
if (s[0] === "wave") l.base = cnt(game, "wave:" + s[2]);
if (s[0] === "beat") { l.base = cnt(game, "beat:" + s[2]); if (!st(game).posts.some(function (p) { return p.bid === s[2]; })) { at = (s[2] === "watergrump" ? biomeSpot(game, SEA, Math.random) : null) || spotAt(game, hm.x, hm.z, 24, 40, Math.random, null) || { x: hm.x + 24, z: hm.z }; D.spawnBeast(game, s[2], at, { quiet: true, guard: "line", k: s[2] === "watergrump" ? 1.6 : null, name: s[2] === "watergrump" ? "a cousin of the great fish" : null }); l.x = at.x; l.z = at.z; } }
if (s[0] === "place") { at = spotAt(game, hm.x, hm.z, s[3] || 20, s[4] || 34, Math.random, null) || { x: hm.x + 20, z: hm.z }; l.pid = placeAdd(game, s[2], at, {}).id; l.x = at.x; l.z = at.z; }
}
D.lineStart = function (game, id) {
var x = X2(game), L = D.LINE_BY[id];
if (!L || x.lines[id]) return null;
var l = x.lines[id] = { step: 0, day: day(game) };
stepEnter(game, L, l);
emit("darkLine", { id: id, step: 0 });
return l;
};
D.linesOn = function (game) { var x = X2(game); return D.LINES.filter(function (L) { return x.lines[L.id] && !x.lines[L.id].done; }); };
D.lineHint = function (game, id) { var l = X2(game).lines[id], hm = home(game); if (!l || l.done || l.x == null) return ""; if (l.pid != null) { var p = placeById(game, l.pid); if (p) { l.x = p.x; l.z = p.z; } } return "about " + Math.max(5, Math.round(SB.dist(l.x, l.z, hm.x, hm.z) / 5) * 5) + "m " + dirOf(l.x - hm.x, l.z - hm.z) + " of the nest"; };
function lineFinish(game, L, l, c) {
var x = X2(game), g = L.give || {}, hm = home(game), msg = L.end, nc;
l.done = day(game); bump(game, "lines");
if (g.sparks) sparks(game, g.sparks, c);
if (g.item) give(game, c, g.item[0], g.item[1]);
if (g.boon) D.addBoon(game, g.boon);
if (g.boon2) D.addBoon(game, g.boon2);
if (g.flag) x.did[g.flag] = day(game);
if (g.fac) { meet(game, g.fac[0]); D.move(game, g.fac[0], g.fac[1], L.name); }
if (g.truce) st(game).raid.truce = Math.max(st(game).raid.truce || 0, game.time + g.truce * SB.DAY_LENGTH);
if (g.ember && SB.Embers && SB.Embers.add) SB.Embers.add(game, "dark-line-" + L.id, g.ember, c);
if (g.end) { x.ends[g.end] = day(game); if (SB.Embers && SB.Embers.add) SB.Embers.add(game, "dark-end-" + g.end, L.name, c); }
if (g.reveal) { (game.sites || []).forEach(function (q) { if (!q.gone && SB.World.reveal) SB.World.reveal(game.world, q.x, q.z, 8); }); x.places.forEach(function (p) { if (SB.World.reveal) SB.World.reveal(game.world, p.x, p.z, 5); }); }
if (g.placeAt) { var pa = placeAdd(game, g.placeAt, { x: l.lastX != null ? l.lastX : hm.x + 30, z: l.lastZ != null ? l.lastZ : hm.z }, {}); x.did[g.placeAt] = pa.id; }
if (g.join) { nc = h.newcomer(game, hm.x + 4, hm.z + 2, false, "line" + L.id); if (nc) { nc.dkTitle = g.join; emit("darkJoined", { c: nc, how: g.join }); } }
if (g.pick) give(game, c, l.side, 1);
if (g.pickBoon) { D.addBoon(game, l.side); D.setKnack(game, l.side); }
if (g.pal) { nc = h.newcomer(game, hm.x + 3, hm.z + 3, false, "pal"); if (nc) { nc.dkPal = 1; x.pal2 = nc.id; emit("darkJoined", { c: nc, how: "companion" }); msg = nc.name + " climbs out, blinking: from pod 3, with opinions about everything. she is staying"; } else msg = "the pod is empty after all. somebody left a note: “gone for a walk”"; }
if (g.sides) { if (l.side === "peace") { x.did.peace = day(game); tribe(game).forEach(function (o) { chem(o, { anger: -0.4, lonely: -0.2 }); }); msg = "one pot, two families, a great deal of soup. nobody remembers what it was about"; } else { sparks(game, 3, c); msg = "the " + l.side + " family is pleased with you. the other one is not, for a while"; tribe(game).slice(0, 2).forEach(function (o) { chem(o, { anger: 0.2 }); }); } }
if (g.tribunal) { if (l.side === "keep") { D.move(game, "wild", 12, "kept the far shore wild"); msg = "the rock stays empty. the wild smols heard, and approve"; } else { D.move(game, "far", 12, "settled the far shore"); msg = "there are huts on the rock by morning. the far tribe owes you one"; } }
if (g.cult) { meet(game, "hush"); if (l.side === "talk") { var knows = D.hasPage(game, "b4"); D.move(game, "hush", knows ? 60 : 25, "talked to the hush"); msg = knows ? "you tell them the grumps were smols once. they go very quiet, and then they light a fire" : "they half listen. (if you knew what the grumps were, they would listen properly)"; } else if (l.side === "chase") { D.move(game, "hush", -20, "chased the hush off"); sparks(game, 4, c); msg = "they scatter. they will be back, and crosser"; } else msg = "you leave them humming at the dark"; }
if (g.parley) { if (l.side === "deal" && h.looseFood(game) >= 2) { h.looseFood(game, 2); st(game).raid.truce = Math.max(st(game).raid.truce || 0, game.time + 3 * SB.DAY_LENGTH); D.move(game, "grumps", 12, "a bargain kept"); bump(game, "bargains"); msg = "it takes the two suppers from the village and goes. three days of peace, and the grumps think better of you"; } else if (l.side === "deal") msg = "there weren't two suppers lying about the village to give. it shrugs and goes"; else { D.move(game, "grumps", -3, "sent the rag away"); msg = "it drops the rag and goes"; } }
if (g.elder) { meet(game, "elder"); if (l.side === "patron") { D.move(game, "elder", 60, "kept the elders safe"); x.ends.ascent = x.ends.ascent || day(game); msg = "the elders name your tribe their heirs: another way for it to end well"; } else { D.move(game, "elder", -40, "shut the elders out"); msg = "you fed them and fought for them and still they sniff. they sail. good"; } }
emit("darkLineDone", { id: L.id, c: c || null, side: l.side || null });
tell(game, "📜 " + L.name + ": " + (msg || "done") + ".");
}
function lineAdvance(game, L, l, c) {
l.lastX = l.x; l.lastZ = l.z; l.step++;
if (l.step >= L.steps.length) return lineFinish(game, L, l, c);
stepEnter(game, L, l);
emit("darkLine", { id: L.id, step: l.step });
psay("📜 " + L.name + ": " + L.steps[l.step][1]);
}
function linesTick(game, c) {
var x = X2(game);
D.LINES.forEach(function (L) {
var l = x.lines[L.id]; if (!l || l.done) return;
var s = L.steps[l.step], ok = false;
if (s[0] === "go") ok = !!c && SB.dist(c.x, c.z, l.x, l.z) < 4;
else if (s[0] === "count") ok = cnt(game, s[2]) - l.base >= s[3];
else if (s[0] === "beat") ok = cnt(game, "beat:" + s[2]) > l.base;
else if (s[0] === "wave") ok = cnt(game, "wave:" + s[2]) > l.base;
else if (s[0] === "have") ok = !!(D.COND[s[2]] && D.COND[s[2]](game));
else if (s[0] === "place") ok = !placeById(game, l.pid);
if (ok) lineAdvance(game, L, l, c);
});
}
D.lineHand = function (game, c, id) {
var L = D.LINE_BY[id], l = X2(game).lines[id], s = L && l && !l.done ? L.steps[l.step] : null;
if (!s || s[0] !== "bring") return { ok: false, msg: "" };
if (!hasAll(c, s[2])) return { ok: false, msg: "it takes " + costText(s[2]) };
takeAll(c, s[2]); lineAdvance(game, L, l, c);
return { ok: true, msg: "📜 handed over: " + costText(s[2]) };
};
D.linePick = function (game, c, id, i) {
var L = D.LINE_BY[id], l = X2(game).lines[id], s = L && l && !l.done ? L.steps[l.step] : null;
if (!s || s[0] !== "pick" || !s[2][i]) return { ok: false, msg: "" };
if (s[3] && s[2][i][1] !== s[3]) { l.tries = (l.tries || 0) + 1; return { ok: false, msg: "they shake their heads. try again" }; }
l.side = s[2][i][1]; lineAdvance(game, L, l, c);
return { ok: true, msg: "📜 " + s[2][i][0] };
};
D.lineWave = function (game, c, id) {
var L = D.LINE_BY[id], l = X2(game).lines[id], s = L && l && !l.done ? L.steps[l.step] : null;
if (!s || s[0] !== "wave") return { ok: false, msg: "" };
var r = D.startWave(game, s[2], l.lastX != null && L.id === "journey" ? { x: l.lastX, z: l.lastZ } : null, null, { line: id });
return r;
};
D.openLines = function (game) {
var x = X2(game), n = D.linesOn(game).length;
D.LINES.forEach(function (L) { if (n >= D.LINE_MAX || x.lines[L.id]) return; var ok = false; try { ok = L.open(game); } catch (e) {} if (ok) { D.lineStart(game, L.id); n++; } });
};
D.readChart = function (game, c) {
var x = X2(game);
if (!Sv().has(c, "starchart")) return { ok: false, msg: "" };
if (!(hasStruct(game, "observatory") || D.atWell(game, c))) return { ok: false, msg: "read it at the star dome, or at a well of light" };
if (x.chart === day(game)) return { ok: false, msg: "you have looked all you can today" };
x.chart = day(game); bump(game, "charts"); if (cnt(game, "charts") === 1) sparks(game, 10, c);
(game.sites || []).forEach(function (q) { if (!q.gone && SB.World.reveal) SB.World.reveal(game.world, q.x, q.z, 8); });
var d = x.skyNext ? D.SKY_BY[x.skyNext] : null;
return { ok: true, msg: "🗺 a vision: the whole island from above, every wreck and ruin marked. and the sky's plans: " + (d ? d.name : "quiet") + ". " + D.luckLine(game) };
};
function foodAny(c) { return h.foodSlot(c); }
function G(id, icon, name, line, days, when, a, b, more) { var d = { id: id, icon: icon, name: name, line: line, days: days, when: when, a: a, b: b }; if (more) for (var k in more) d[k] = more[k]; return d; }
var CROPS = ["pumpkin", "carrot", "grain"], SETS = [{ berry: 3 }, { stick: 4, fiber: 2 }, { fish: 2 }, { stone: 4 }, { honey: 1, nut: 2 }];
D.GUESTS = [
G("giant", "🦣", "a gentle giant", "is passing through, as tall as a tree. it sheds fluff", 1, function (game) { return topTier(game) >= 1; },
{ label: "follow it", go: function (game, c, g, x) { x.did.giant = day(game); if (!x.lines.giant) D.lineStart(game, "giant"); else { var hm = home(game), at = spotAt(game, hm.x, hm.z, 16, 26, Math.random, null); if (at && !D.placesOf(game, "tracks").length) placeAdd(game, "tracks", at, {}); } return "its tracks lead off. follow them (see “stories”)"; } },
{ label: "just watch", go: function (game, c) { chem(c, { bored: -0.3 }); return "it ambles through, chewing. everybody stops work to look"; } }),
G("tinkers", "⚙️", "the tinkers", "a shy, clever people who live apart. they fix things and want metal", 1, function (game) { return topTier(game) >= 2; },
{ label: "a tool for 2 metal", need: { metal: 2 }, go: function (game, c, g, x) { give(game, c, topTier(game) >= 4 && K.axe ? "axe" : "stonepick", 1); var n = bump(game, "tinkerTrades"); if (n >= 3 && !x.did.tinkercamp) { var hm = home(game), at = spotAt(game, hm.x, hm.z, 14, 22, Math.random, null); if (at) { placeAdd(game, "tinkercamp", at, {}); x.did.tinkercamp = 1; return "a good tool, quickly made. they like it here: they are setting up a camp of their own, and will stay"; } } return "they take the metal, turn their backs, and hand you a good tool"; } },
{ label: "wave them on", go: function () { return "they nod and shuffle off, clanking"; } }),
G("deserter", "🏃", "a runaway grump", "has left its war party and wants hiding. it says it knows things", 2, function (game) { return topTier(game) >= 2 && day(game) >= 4; },
{ label: "hide it for two days", go: function (game, c, g, x) { g.hid = day(game); g.keep = 1; D.move(game, "grumps", -3, "hid a runaway"); return "it's under a basket by the nest. feed nobody's curiosity for two days"; } },
{ label: "send it back", go: function (game) { D.move(game, "grumps", 5, "sent a runaway back"); return "it goes, slowly. the grumps will hear you played fair"; } },
{ expire: function (game, g, x) { if (!g.hid) return; var B = SB.Bosses, nx = B && B.next ? B.next(game) : null, e = nx ? B.state(game).list[nx.boss.id] : null, q = (game.sites || []).filter(function (s) { return !s.found && !s.gone; })[0]; if (e && !e.found) { e.found = true; if (SB.World.reveal) SB.World.reveal(game.world, e.x, e.z, 10); } if (q && SB.World.reveal) SB.World.reveal(game.world, q.x, q.z, 8); sparks(game, 4); bump(game, "secrets"); tell(game, "🏃 the runaway grump slipped off at dawn. it left you its secrets: a lair and a hidden place are on your map now. +4 ✨"); } }),
G("family", "🧳", "a stranger family", "three of them, with a baby, and winter coming. they ask for a roof until it turns", 3, function (game) { return game.world.season >= 2 && tribe(game).length >= 3; },
{ label: "shelter them (2 suppers)", need: { cooked: 2 }, go: function (game, c, g) { g.hid = day(game); g.keep = 1; return "they have the corner by the fire. three days"; } },
{ label: "there's no room", go: function (game) { D.move(game, "far", -5, "turned a family away"); return "they go on into the cold"; } },
{ expire: function (game, g) { if (!g.hid) return; var hm = home(game); D.move(game, "far", 12, "sheltered a family"); drop(game, "fur", 2, hm.x + 1, hm.z + 1.2); sparks(game, 6); var nc = h.newcomer(game, hm.x + 3, hm.z + 2, true, "family"); bump(game, "hosted"); tell(game, "🧳 the family you sheltered has gone on, warm and fed. they left furs" + (nc ? ", and " + nc.name + ", who would not be parted from your smols" : "") + ". +6 ✨"); } }),
G("envoy", "🎒", "an envoy of the far tribe", "needs a bed and a guard for two days, and will pay for both", 2, function (game) { return D.rank(game, "far").i >= 1 && topTier(game) >= 2; },
{ label: "house and guard them", go: function (game, c, g) { g.hid = day(game); g.keep = 1; g.lost0 = cnt(game, "wavesLost"); return "they are in the best hut. keep the village safe for two days"; } },
{ label: "not this time", go: function () { return "they find somewhere else"; } },
{ expire: function (game, g) { if (!g.hid) return; if (cnt(game, "wavesLost") > g.lost0) { tell(game, "🎒 the envoy left early, shaken: the village was not safe."); return; } var c = me(); if (c) c.purse = r2((c.purse || 0) + 10); else sparks(game, 5); D.move(game, "far", 8, "kept their envoy safe"); bump(game, "hosted"); tell(game, "🎒 the envoy leaves rested and unbitten, and pays: " + (c ? "10 shells" : "5 ✨") + "."); } }),
G("creep", "🎩", "a clever stranger", "is far cleverer than anyone here, and very keen to join. something about them is odd", 1, function (game) { return topTier(game) >= 2 && tribe(game).length >= 3; },
{ label: "take them in", go: function (game, c) { var hm = home(game), nc = h.newcomer(game, hm.x + 4, hm.z + 2, false, "creep"); if (!nc) return { ok: false, msg: "there's no room in the village" }; nc.tier = Math.min(6, Math.max(nc.tier || 0, topTier(game))); nc.inspired = 200; nc.dkQuirk = ["eats", "walks", "loud"][Math.floor(Math.random() * 3)]; nc.dkQuirkDay = day(game) + 2; emit("darkJoined", { c: nc, how: "clever stranger" }); return nc.name + " is one of you now, and already has three ideas"; } },
{ label: "no thank you", go: function () { return "they smile, a little too long, and go"; } }),
G("podfolk", "👽", "a survivor from another ark", "walked in off the shore. its kind are not quite your kind", 1, function (game) { return day(game) >= 5; },
{ label: "welcome it", go: function (game) { var hm = home(game), nc = h.newcomer(game, hm.x + 4, hm.z + 3, false, "alien"); if (!nc) return { ok: false, msg: "there's no room in the village" }; var gs = nc.genome && nc.genome.genes; if (gs) { var ks = Object.keys(gs).filter(function (k) { return typeof gs[k] === "number" && gs[k] >= 0 && gs[k] <= 1; }); for (var i = 0; i < 3 && ks.length; i++) { var k = ks[Math.floor(Math.random() * ks.length)]; gs[k] = Math.max(0, Math.min(1, gs[k] + (Math.random() < 0.5 ? -0.35 : 0.35))); } } nc.dkOdd = 1; emit("darkJoined", { c: nc, how: "another ark" }); bump(game, "aliens"); return nc.name + " stays. its children will be a bit different, and that is good for a small tribe"; } },
{ label: "point it to the far tribe", go: function (game) { D.move(game, "far", 3, "sent them a newcomer"); return "it thanks you and walks on"; } }),
G("santa", "🎁", "a gift-bringer", "comes round in winter with a sack. it likes a snack left out", 1, function (game) { return game.world.season === 3; },
{ label: "leave a snack out", go: function (game, c) { var k = foodAny(c); if (!k) return { ok: false, msg: "you have no snack to leave" }; Sv().take(c, k, 1); var hm = home(game); drop(game, "sweet", 3, hm.x + 1, hm.z + 1); drop(game, K.plush ? "plush" : "ball", 1, hm.x + 1.4, hm.z + 0.6); drop(game, "paperlantern", 1, hm.x + 0.6, hm.z + 1.4); bump(game, "gifts2"); return "in the morning the snack is gone and there are sweets, a toy and a lantern by the nest"; } },
{ label: "wave", go: function (game) { var hm = home(game); drop(game, "sweet", 1, hm.x + 1, hm.z + 1); return "it leaves one sweet anyway"; } }),
G("frog", "🐸", "a giant frog", "has sat down by the farm and wants to see a crop grown: ", 2, function (game) { return hasStruct(game, "farm"); },
{ label: "bring it one", go: function (game, c, g) { var k = CROPS[g.n % 3], need = {}; need[K[k] ? k : "berry"] = 1; if (!hasAll(c, need)) return { ok: false, msg: "it wants " + costText(need) }; takeAll(c, need); give(game, c, "starfruit", 2); give(game, c, "seed", 2); bump(game, "frogFed"); return "it eats it in one, burps, and leaves two star-fruit and some seeds on the ground"; } },
{ label: "shoo", go: function () { return "it does not shoo. it leaves when it is ready"; } }, { vary: function (g) { return label(K[CROPS[g.n % 3]] ? CROPS[g.n % 3] : "berry"); } }),
G("raccoons", "🦝", "a critter family", "lives in a storm-felled tree and has a list: ", 2, function (game) { return day(game) >= 4; },
{ label: "give them the lot", go: function (game, c, g, x) { var set = SETS[(x.n.raccoon || 0) % SETS.length]; if (!hasAll(c, set)) return { ok: false, msg: "they want " + costText(set) }; takeAll(c, set); var n = bump(game, "raccoon"); give(game, c, n % 2 ? "seed" : "mote", 2); if (n === SETS.length) give(game, c, "book", 1); return "the smallest one counts it twice, then they drag out something for you" + (n === SETS.length ? ", and a book they couldn't read" : ""); } },
{ label: "not today", go: function () { return "they watch you go, all in a row"; } }, { vary: function (g, game) { return costText(SETS[cnt(game, "raccoon") % SETS.length]); } }),
G("bear", "🐻", "a tidy bear", "eats rot and rubbish, and would like honey first", 2, function (game) { return day(game) >= 6; },
{ label: "give it honey", need: { honey: 1 }, go: function (game, c) { var n = 0, it = game.world.items || []; for (var i = it.length - 1; i >= 0; i--) if (it[i] && it[i].data && it[i].data.rotten && it[i].heldBy == null) { SB.World.remove(game.world, it[i]); n++; } give(game, c, "seed", 2); bump(game, "tidied", n); return "it eats the honey, then walks the whole island eating every rotten thing on it (" + n + "). it leaves seeds"; } },
{ label: "leave it be", go: function () { return "it snuffles off"; } }),
G("clown", "🤡", "an odd visitor", "only one smol can see it: ", 1, function (game) { return tribe(game).some(function (c) { return (c.chem.lonely || 0) > 0.7 || (c.chem.bored || 0) > 0.8; }); },
{ label: "cheer them up", go: function (game, c, g) { var o = SB.Game.byId(game, g.who); if (!o || !o.alive) return "whoever it came for is fine now. it's gone"; var k = foodAny(c); if (!k) return { ok: false, msg: "bring them something nice to eat" }; Sv().take(c, k, 1); o.chem.lonely = 0.1; o.chem.bored = 0.1; if (SB.Friends && SB.Friends.add) { try { SB.Friends.add(game, o, 20); } catch (e) {} } bump(game, "cheered"); return o.name + " eats, and laughs, and when it looks round the odd visitor has gone"; } },
{ label: "there's nobody there", go: function () { return "you can't see anyone. the sad one can"; } }, { init: function (game, g) { var o = tribe(game).sort(function (a, b) { return ((b.chem.lonely || 0) + (b.chem.bored || 0)) - ((a.chem.lonely || 0) + (a.chem.bored || 0)); })[0]; g.who = o ? o.id : null; g.whoName = o ? o.name : "somebody"; }, vary: function (g) { return g.whoName + ", who is very low"; } }),
G("pirates", "🏴‍☠️", "night visitors on the shore", "rough sorts off a raft, with a throwing game and a pile of shells", 1, function (game) { return topTier(game) >= 2 && !!game.world.night; },
{ label: "play (2 shells)", go: function (game, c) { if ((c.purse || 0) < 2) return { ok: false, msg: "you haven't 2 shells" }; c.purse = r2(c.purse - 2); var win = lucky(game, 0.45 + 0.05 * (c.tier || 0)); if (win) c.purse = r2(c.purse + 6); bump(game, "cove" + (win ? "Won" : "Lost")); return win ? "thunk: dead centre. six shells, and a lot of grumbling" : "you miss the barrel and hit the raft. they keep your shells, laughing"; } },
{ label: "keep walking", go: function () { return "they jeer, cheerfully"; } }),
G("demand", "👺", "a grump messenger", "says its captain wants four pieces of the village's food by dusk, or a war party comes", 1, function (game) { var B = SB.Bosses; return !!(B && B.next && B.next(game)) && topTier(game) >= 2; },
{ label: "pay up", go: function (game) { if (h.looseFood(game) < 4) return { ok: false, msg: "there aren't four pieces of food lying about the village" }; h.looseFood(game, 4); D.move(game, "grumps", 4, "paid a demand"); bump(game, "demandsPaid"); return "it stuffs its sack and goes. no war party, this time"; } },
{ label: "tell it no", go: function (game, c, g) { g.no = 1; st(game).raid.pending = game.time; D.move(game, "grumps", -4, "refused a demand"); bump(game, "demandsRefused"); return "it spits and runs. the war party is already on its way"; } },
{ loud: 1, expire: function (game, g) { if (!g.done) { st(game).raid.pending = game.time; tell(game, "👺 nobody answered the grumps' demand. a war party is coming."); } } }),
G("ransom", "⛓", "a grump with a ransom note", "has one of yours, and will swap", 2, function (game) { return SB.Threats && SB.Threats.captives ? SB.Threats.captives(game).length > 0 : false; },
{ label: "pay three food", go: function (game) { if (h.looseFood(game) < 3) return { ok: false, msg: "there aren't three pieces of food lying about the village" }; h.looseFood(game, 3); return freeOne(game); } },
{ label: "pay 8 ✨", go: function (game) { if (!SB.Game.spend(game, 8)) return { ok: false, msg: "the Lantern hasn't 8 ✨" }; return freeOne(game); } }, { loud: 1 }),
G("market", "🏮", "the night market", "strangers' rafts with lamps on, selling odd things in the cold", 1, function (game) { return game.world.season === 3 && !!game.world.night; },
{ label: "buy something (4 shells)", go: function (game, c) { if ((c.purse || 0) < 4) return { ok: false, msg: "you haven't 4 shells" }; c.purse = r2(c.purse - 4); var k = ["book", "grumpmask", "glowbait", "firework", "taunt"][cnt(game, "marketBuys") % 5]; bump(game, "marketBuys"); give(game, c, k, 1); return "four shells for " + label(k) + ". the stallholder wraps it in a leaf"; } },
{ label: "just look", go: function (game, c) { chem(c, { bored: -0.3 }); return "lamps on the water. it is very pretty"; } }, { repeat: 1 }),
G("angler", "🎣", "the fisher", "wants one fish today, as every day", 1, function (game) { return topTier(game) >= 1 && day(game) >= 3; },
{ label: "hand over a fish", need: { fish: 1 }, go: function (game, c) { var n = bump(game, "angler"); c.purse = r2((c.purse || 0) + 2); var m = n === 3 ? "rod" : n === 7 ? "glowbait" : n === 12 ? "starfruit" : null; if (m && K[m]) give(game, c, m, 1); return "“that'll do.” two shells" + (m ? ", and for fish number " + n + ", " + label(m) : "") + ". (fish " + n + ")"; } },
{ label: "no fish today", go: function () { return "“tomorrow, then.”"; } })
];
function freeOne(game) { var cp = SB.Threats.captives(game)[0], hm = home(game); if (!cp) return "there was nobody to free after all"; cp.captive = null; cp.captiveT = null; if (SB.Creature && SB.Creature.sendTo) SB.Creature.sendTo(cp, hm.x + 1, hm.z + 1, game, 90); bump(game, "ransomed"); emit("darkRansom", { c: cp }); return cp.name + " is let go, and is running home"; }
D.GUEST_BY = {}; D.GUESTS.forEach(function (d) { D.GUEST_BY[d.id] = d; });
D.addGuest = function (game, id) {
var x = X2(game), d = D.GUEST_BY[id];
if (!d || x.guests.some(function (g) { return g.id === id; }) || x.guests.length >= 3) return null;
var g = { id: id, day: day(game), until: day(game) + d.days, n: cnt(game, "guest:" + id) };
if (d.init) d.init(game, g);
x.guests.push(g); bump(game, "guest:" + id);
if (d.loud) tell(game, d.icon + " " + d.name + " " + D.guestLine(game, g) + ". answer it at the village, in your notices.");
emit("darkGuest", { def: d, g: g });
return g;
};
D.guestLine = function (game, g) { var d = D.GUEST_BY[g.id]; return d.line + (d.vary ? d.vary(g, game) : ""); };
D.guestAct = function (game, c, id, alt) {
var x = X2(game), g = x.guests.filter(function (o) { return o.id === id; })[0], d = D.GUEST_BY[id], a = d ? (alt ? d.b : d.a) : null;
if (!g || !a || g.keep) return { ok: false, msg: "" };
if (!D.atVillage(game, c)) return { ok: false, msg: "they are at the village: go home first" };
if (a.need && !hasAll(c, a.need)) return { ok: false, msg: "it takes " + costText(a.need) };
var r = a.go(game, c, g, x);
if (r && typeof r === "object") return r;
if (a.need) takeAll(c, a.need);
g.done = 1; bump(game, "guests");
if (!g.keep && !d.repeat) x.guests = x.guests.filter(function (o) { return o !== g; });
emit("darkGuestDone", { def: d, alt: !!alt });
return { ok: true, msg: d.icon + " " + r };
};
function guestsDawn(game) {
var x = X2(game), d = day(game);
x.guests.slice().forEach(function (g) { if (d < g.until) return; var def = D.GUEST_BY[g.id]; x.guests = x.guests.filter(function (o) { return o !== g; }); if (def && def.expire) def.expire(game, g, x); });
if (x.guests.length >= 2 || !lucky(game, 0.45)) return null;
var pool = D.GUESTS.filter(function (g) { var ok = false; try { ok = g.when(game); } catch (e) {} return ok && !x.guests.some(function (o) { return o.id === g.id; }); });
if (!pool.length) return null;
pool.sort(function (a, b) { return cnt(game, "guest:" + a.id) - cnt(game, "guest:" + b.id); });
return D.addGuest(game, pool[0].id);
}
D._guestsDawn = guestsDawn;
var BEFORE = ["mended the ark's kettles", "grew beans on deck nine", "taught the little ones their letters", "kept the star maps tidy", "was the best whistler on the ark", "ran the laundry, and misses the smell of it", "drove a cargo lifter, badly", "sang in the engine room choir", "counted the pods every night", "painted the corridors yellow", "baked for four thousand", "looked after the ship's one cat"];
D.before = function (c) { var hk = 0, n = String(c.name || "smol"); for (var i = 0; i < n.length; i++) hk = (hk * 31 + n.charCodeAt(i)) >>> 0; return "before the sleep, " + n + " " + BEFORE[(hk + (c.id || 0)) % BEFORE.length]; };
var LAST = [{ honey: 1 }, { cooked: 2 }, { glowcap: 1 }, { fish: 2 }], ASP = { maker: [{ stick: 4 }, { stone: 4 }, { metal: 1 }], hunter: [{ fish: 2 }, { fur: 1 }, { cooked: 2 }], thinker: [{ glowcap: 1 }, { crystal: 1 }, { book: 1 }] };
function circleOf(c) { return c.stage <= 2 ? "kids" : c.tier >= 5 ? "thinkers" : (c.job === "guard" || ((c.id || 0) % 2 === 1)) ? "hunters" : "makers"; }
D.circleOf = circleOf;
D.WISHES = {
last: { icon: "🕊", pick: function (c) { return c.stage >= 4 && !c.dkLast; }, text: function (c) { return c.name + " is old, and has one last wish: to taste it again"; }, need: function (c) { return LAST[(c.id || 0) % LAST.length]; }, done: function (game, c) { c.dkLast = 1; return c.name + " closes its eyes and smiles. when its time comes the tribe will grieve easier for this"; } },
midlife: { icon: "🚶", pick: function (c) { return c.stage === 3 && c.age > 900 && !c.dkMid; }, text: function (c) { return c.name + " is restless: wants a long walk, a new job, anything"; }, walk: 1, done: function (game, c) { c.dkMid = 1; c.inspired = Math.max(c.inspired || 0, 240); if (c.job && c.job !== "guard") c.job = null; chem(c, { bored: -0.6 }); return c.name + " sets off round the island with a stick over one shoulder, and will come back with ideas and no job"; } },
picky: { icon: "🥕", pick: function (c) { return c.stage === 1; }, text: function (c) { return c.name + " is being a picky eater today: only one thing will do"; }, need: function (c) { return (c.id || 0) % 2 ? { berry: 1 } : { honey: 1 }; }, days: 1, tick: function (game, c) { c.chem.hunger = Math.min(0.8, (c.chem.hunger || 0) + 0.0006); }, done: function (game, c) { c.chem.hunger = 0.1; return c.name + " eats it all. it was never about the food"; } },
loud: { icon: "📢", pick: function (c) { return c.stage === 1; }, text: function (c) { return c.name + " is being LOUD today. a toy might help"; }, need: function () { return K.ball ? { ball: 1 } : { stick: 1 }; }, days: 1, tick: function (game, c) { if (game.world.night) tribe(game).forEach(function (o) { if (o !== c && o.asleep && !o._pov && SB.dist(o.x, o.z, c.x, c.z) < 6) o.asleep = false; }); }, done: function (game, c) { chem(c, { bored: -0.5 }); return c.name + " is busy with it. blessed quiet"; } },
clingy: { icon: "🫂", pick: function (c) { return c.stage === 1; }, text: function (c) { return c.name + " is clingy today, and following you about. a cuddle (stand by it)"; }, near: 1, days: 1, tick: function (game, c) { var m = me(); if (m && m !== c && SB.dist(m.x, m.z, c.x, c.z) > 4 && SB.dist(m.x, m.z, c.x, c.z) < 30 && SB.Creature && SB.Creature.sendTo) SB.Creature.sendTo(c, m.x + 1, m.z + 1, game, 8); }, done: function (game, c) { chem(c, { lonely: -0.6, fear: -0.3 }); return c.name + " is all right again, and has wandered off"; } },
teen: { icon: "🌙", pick: function (c) { return c.stage === 2; }, text: function (c) { return c.name + " has sneaked off to the old ruins. go and fetch it home"; }, fetch: 1, days: 2, done: function (game, c) { var hm = home(game); if (SB.Creature && SB.Creature.sendTo) SB.Creature.sendTo(c, hm.x + 1, hm.z + 1, game, 90); return c.name + " comes home, sulking, with a pocket full of interesting bits"; } },
aspire: { icon: "⭐", pick: function (c) { return c.stage >= 3 && (c.dkAsp || 0) < 3; }, text: function (c) { return c.name + " wants to be a great " + circleOf(c).replace(/s$/, "") + " (step " + ((c.dkAsp || 0) + 1) + " of 3)"; }, need: function (c) { return (ASP[circleOf(c).replace(/s$/, "")] || ASP.maker)[c.dkAsp || 0]; }, done: function (game, c) { c.dkAsp = (c.dkAsp || 0) + 1; if (c.dkAsp >= 3) { c.dkTitle = "the " + circleOf(c).replace(/s$/, ""); c.inspired = Math.max(c.inspired || 0, 200); return c.name + " has done it: “" + c.name + " " + c.dkTitle + "”, from now on"; } return c.name + " is a step nearer"; } },
plush: { icon: "🧸", pick: function (c) { return c.stage === 1 && !c.dkPlush; }, text: function (c) { return c.name + "'s plush has started answering back. play along (bring a plush or a ball)"; }, need: function () { return K.plush ? { plush: 1 } : { ball: 1 }; }, done: function (game, c) { c.dkPlush = 1; c.chem.lonely = 0; return c.name + " and its friend (which only " + c.name + " can hear) are inseparable. it will never be lonely"; } },
rite: { icon: "🎓", pick: function () { return false; }, text: function (c) { return c.name + " is grown. stand with it at the village for its rite"; }, near: 1, home: 1, days: 2, done: function (game, c) { c.inspired = Math.max(c.inspired || 0, 150); sparks(game, 2, c); bump(game, "rites2"); return "the tribe hums, " + c.name + " steps over the line in the dust, and is a grown smol"; } },
lastwish: { icon: "👻", pick: function () { return false; }, text: function (c, w) { return (w.name || "one who is gone") + " left a thing undone: a gift for " + c.name; }, need: function (c) { return LAST[((c.id || 0) + 1) % LAST.length]; }, done: function (game, c) { chem(c, { lonely: -0.5 }); sparks(game, 2, c); return c.name + " takes it, and cries a bit, and is better"; } }
};
D.addWish = function (game, wid, c, name) {
var x = X2(game), d = D.WISHES[wid];
if (!d || x.wishes.length >= 4) return null;
if (!c) c = tribe(game).filter(function (o) { return !o._pov && o.stage >= 2 && !x.wishes.some(function (w) { return w.who === o.id; }); })[0];
if (!c || x.wishes.some(function (w) { return w.who === c.id; })) return null;
var w = { wid: wid, who: c.id, day: day(game), until: day(game) + (d.days || 3), name: name || null };
if (d.fetch) { var hm = home(game), q = (game.sites || []).filter(function (s) { return s.kind === "ruin" && s.found && !s.gone; })[0], at = q ? { x: q.x + 2, z: q.z + 2 } : (spotAt(game, hm.x, hm.z, 18, 28, Math.random, null) || { x: hm.x + 18, z: hm.z }); w.x = r1(at.x); w.z = r1(at.z); if (SB.Creature && SB.Creature.sendTo) SB.Creature.sendTo(c, w.x, w.z, game, 120); }
x.wishes.push(w); emit("darkWish", { w: w, c: c });
return w;
};
D.wishText = function (game, w) { var c = SB.Game.byId(game, w.who), d = D.WISHES[w.wid]; if (!c || !d) return ""; var need = d.need ? d.need(c) : null; return d.text(c, w) + (need ? " (" + costText(need) + ")" : ""); };
D.grant = function (game, c, i) {
var x = X2(game), w = x.wishes[i], d = w ? D.WISHES[w.wid] : null, o = w ? SB.Game.byId(game, w.who) : null;
if (!w || !d) return { ok: false, msg: "" };
if (!o || !o.alive) { x.wishes.splice(i, 1); return { ok: false, msg: "too late" }; }
var need = d.need ? d.need(o) : null;
if (d.fetch) { if (SB.dist(c.x, c.z, w.x, w.z) > 6) return { ok: false, msg: "it's about " + Math.round(SB.dist(c.x, c.z, w.x, w.z)) + "m " + dirOf(w.x - c.x, w.z - c.z) + " of you" }; }
else if (d.home) { if (!D.atVillage(game, c)) return { ok: false, msg: "the rite is at the village" }; }
else if (d.near && SB.dist(c.x, c.z, o.x, o.z) > 5) return { ok: false, msg: "go and stand by " + o.name };
else if (need && SB.dist(c.x, c.z, o.x, o.z) > 14 && !D.atVillage(game, c)) return { ok: false, msg: "take it to " + o.name + ", or to the village" };
if (need && !hasAll(c, need)) return { ok: false, msg: "it takes " + costText(need) };
if (need) takeAll(c, need);
var msg = d.done(game, o, w);
x.wishes.splice(i, 1);
bump(game, "wishes"); bump(game, "wish:" + w.wid); sparks(game, 1, c);
x.circ[circleOf(o)] = (x.circ[circleOf(o)] || 0) + 1;
if (SB.Friends && SB.Friends.add) { try { SB.Friends.add(game, o, 25); } catch (e) {} }
emit("darkWishDone", { w: w, c: c, who: o });
return { ok: true, msg: d.icon + " " + msg };
};
function wishesDawn(game) {
var x = X2(game), d = day(game);
x.wishes = x.wishes.filter(function (w) { var o = SB.Game.byId(game, w.who); return o && o.alive && d < w.until; });
if (x.wishes.length >= 3) return;
var ids = ["last", "aspire", "picky", "midlife", "loud", "teen", "clingy", "plush"], r = dice(game, "wish" + d), off = Math.floor(r() * ids.length);
for (var i = 0; i < ids.length; i++) {
var wid = ids[(i + off) % ids.length], def = D.WISHES[wid], c = tribe(game).filter(function (o) { return !o._pov && def.pick(o) && !x.wishes.some(function (w) { return w.who === o.id; }); })[0];
if (c && D.addWish(game, wid, c)) return;
}
}
D._wishesDawn = wishesDawn;
function wishesTick(game) { var x = X2(game); x.wishes.forEach(function (w) { var d = D.WISHES[w.wid], c = d && d.tick ? SB.Game.byId(game, w.who) : null; if (c && c.alive) d.tick(game, c); }); }
D.CONDS = {
halfgrump: { icon: "🌗", name: "half-grump", line: "a grump's bite went deep. it shuns the fire and scowls. a brew, or a rest at a well of light, cures it", cure: { label: "give a brew", need: { potion: 1 } },
tick: function (game, c) { chem(c, { anger: 0.008 }); var f = SB.World.nearestFire ? SB.World.nearestFire(game.world, c.x, c.z, 6) : null; if (f && !c._pov && SB.Creature && SB.Creature.sendTo) SB.Creature.sendTo(c, c.x + (c.x - f.x) * 1.5, c.z + (c.z - f.z) * 1.5, game, 10); } },
feral: { icon: "🐺", name: "feral", line: "the grump moon has got into it. it runs with the pack until dawn. food calms it", cure: { label: "calm it with food", food: 1 }, night: 1,
tick: function (game, c, e, x) { chem(c, { anger: 0.008, tired: -0.02 }); if (c._pov || !SB.Creature || !SB.Creature.sendTo) return; var lead = x.conds.filter(function (o) { return o.id === "feral"; })[0], L = lead ? SB.Game.byId(game, lead.cid) : null; if (L && L !== c) { if (SB.dist(c.x, c.z, L.x, L.z) > 3) SB.Creature.sendTo(c, L.x + 1, L.z + 1, game, 8); } else if (Math.random() < 0.3) { var hm = home(game), at = spotAt(game, hm.x, hm.z, 8, 18, Math.random, null); if (at) SB.Creature.sendTo(c, at.x, at.z, game, 20); } } },
sleepwalk: { icon: "💤", name: "sleepwalking", line: "it is walking toward the dark with its eyes shut. wake it gently", cure: { label: "wake it gently" }, night: 1,
tick: function (game, c, e) { if (c._pov || !SB.Creature || !SB.Creature.sendTo) return; var hm = home(game); if (!e.x) { var at = spotAt(game, hm.x, hm.z, 20, 28, Math.random, null) || { x: hm.x + 20, z: hm.z }; e.x = at.x; e.z = at.z; } SB.Creature.sendTo(c, e.x, e.z, game, 20); } }
};
D.condOf = function (game, c) { var L = X2(game).conds; for (var i = 0; i < L.length; i++) if (L[i].cid === c.id) return L[i]; return null; };
D.addCond = function (game, c, id, days) { var x = X2(game); if (!D.CONDS[id] || !c || D.condOf(game, c)) return null; var e = { cid: c.id, id: id, day: day(game), until: days ? day(game) + days : 0 }; x.conds.push(e); bump(game, "cond:" + id); emit("darkCond", { c: c, id: id }); return e; };
D.endCond = function (game, c, cured) { var x = X2(game), e = D.condOf(game, c); if (!e) return false; x.conds = x.conds.filter(function (o) { return o !== e; }); if (cured) { bump(game, "cured:" + e.id); chem(c, { anger: -0.5, fear: -0.3 }); } emit("darkCondEnd", { c: c, id: e.id, cured: !!cured }); return true; };
D.cure = function (game, c, o) {
var e = D.condOf(game, o), d = e ? D.CONDS[e.id] : null;
if (!d) return { ok: false, msg: "" };
if (SB.dist(c.x, c.z, o.x, o.z) > 6) return { ok: false, msg: "get closer" };
if (d.cure.need && !hasAll(c, d.cure.need)) return { ok: false, msg: "it takes " + costText(d.cure.need) };
if (d.cure.food) { var k = foodAny(c); if (!k) return { ok: false, msg: "you need some food" }; Sv().take(c, k, 1); }
if (d.cure.need) takeAll(c, d.cure.need);
D.endCond(game, o, true);
return { ok: true, msg: d.icon + " " + o.name + " shakes its head, blinks, and is itself again" };
};
function condsTick(game) {
var x = X2(game);
x.conds.slice().forEach(function (e) {
var c = SB.Game.byId(game, e.cid), d = D.CONDS[e.id];
if (!c || !c.alive || !d) { x.conds = x.conds.filter(function (o) { return o !== e; }); return; }
if ((d.night && !game.world.night) || (e.until && day(game) >= e.until)) { D.endCond(game, c, false); return; }
d.tick(game, c, e, x);
});
}
PL("reedcamp", { name: "the reed folk's camp", icon: "🎋", act: { label: "swap a fish with the reed folk", need: { fish: 1 }, go: function (game, c) { give(game, c, ["clam", "fiber", "glowcap", "herb"][cnt(game, "reedTrades") % 4], 2); bump(game, "reedTrades"); D.move(game, "reed", 2, "traded"); return "one of them takes the fish, sniffs it, and hands you two of something from a reed basket"; } } });
PL("farcamp", { name: "the far tribe's camp", icon: "🏕", act: { label: "knock at the far tribe's camp", go: function (game, c) {
if (D.rank(game, "far").i < 2) return { ok: false, msg: "a face at the fence. “we don't know you yet.” (be friends with the far tribe first)" };
if ((c.purse || 0) < 3) return { ok: false, msg: "they trade for shells: three" };
c.purse = r2(c.purse - 3); give(game, c, ["seed", "metal", "potion"][cnt(game, "farTrades") % 3], 2); bump(game, "farTrades");
return "the gate opens. three shells buy two good things, and a bowl of something hot while you wait";
} } });
var TRADS = ["everyone wears a leaf on their head", "nobody is allowed to say “grump”", "the kids hide the leader's hat", "everyone walks backwards until noon", "soup is eaten with sticks", "the oldest smol gets carried about"], SYL = ["mo", "bub", "tiki", "wum", "sna", "plo", "gri", "noo", "za", "pip"];
D.tradition = function (game, season) { var r = dice(game, "trad" + season); return { name: SYL[Math.floor(r() * SYL.length)] + SYL[Math.floor(r() * SYL.length)] + " day", does: TRADS[Math.floor(r() * TRADS.length)] }; };
D.FEASTS = [
{ id: "potluck", icon: "🍲", name: "a village potluck", line: "everyone brings something to the middle of the village", days: 0.3, call: 1, tasks: [["food", 4], ["fire", 1]] },
{ id: "house", icon: "🏠", name: "a party at your place", line: "at your own home. it is scored by how the guests feel", days: 0.3, call: 1, home: 1, tasks: [["food", 3], ["game", 1], ["joy", 1]] },
{ id: "mask", icon: "🎭", name: "mask night", line: "bring a grump mask. the kids scream and love it", days: 0.3, call: 1, item: "grumpmask", goods: 1, tasks: [["food", 2], ["game", 2]] },
{ id: "pond", icon: "🏊", name: "a pond party", line: "down by the water, with fish", days: 0.3, call: 1, tasks: [["fish", 2], ["food", 2]] },
{ id: "quiet", icon: "🌙", name: "a quiet night", line: "a fire, a song, and nobody talking much", days: 0.3, call: 1, tasks: [["fire", 1], ["song", 1]] },
{ id: "story", icon: "📖", name: "story night", line: "in the mended story room: a book read aloud", days: 0.3, call: 1, room: 4, tasks: [["read", 1], ["song", 1]] },
{ id: "egghunt", icon: "🥚", name: "the spring egg hunt", line: "five painted eggs are hidden round the village. find three before the kids find them all", days: 0.4, season: 0, tasks: [["eggs", 3]],
start: function (game, f) { var hm = home(game); for (var i = 0; i < 5; i++) { var p = spotAt(game, hm.x, hm.z, 5, 14, Math.random, null); if (p) placeAdd(game, "egg", p, {}); } },
tick: function (game, f) { if (game.time < (f.kidT || (f.kidT = game.time + 40))) return; f.kidT = game.time + 40; var e = D.placesOf(game, "egg")[0]; if (e) { placeEnd(game, e, true); f.kidEggs = (f.kidEggs || 0) + 1; } },
end: function (game) { D.placesOf(game, "egg").forEach(function (e) { placeEnd(game, e, true); }); } },
{ id: "derby", icon: "🎣", name: "the fishing derby", line: "a day's fishing against the tribe's fishers. three fish wins it", days: 0.5, season: 1, tasks: [["fish", 3]], title: "best fisher" },
{ id: "jellies", icon: "🪼", name: "the glow night", line: "the whole tribe goes down to the shore to watch the lights. go with them", days: 0.4, season: 1, night: 1, shore: 1, tasks: [["there", 1]],
start: function (game, f) { tribe(game).forEach(function (c) { if (!c._pov && SB.Creature && SB.Creature.sendTo) SB.Creature.sendTo(c, f.x + (Math.random() - 0.5) * 4, f.z + (Math.random() - 0.5) * 4, game, 120); chem(c, { bored: -0.3, fear: -0.2 }); }); } },
{ id: "fair", icon: "🎪", name: "the autumn fair", line: "stalls and games, and a judged table: enter your best thing", days: 0.5, season: 2, goods: 1, tasks: [["show", 1], ["game", 2]] },
{ id: "spirits", icon: "🎃", name: "the dark-night maze", line: "three lanterns are hidden out past the palisade, with something prowling near. bring them in", days: 0.4, season: 2, night: 1, tasks: [["lamps", 3]],
start: function (game, f) { var hm = home(game); for (var i = 0; i < 3; i++) { var p = spotAt(game, hm.x, hm.z, 14, 22, Math.random, i * 2.1); if (p) placeAdd(game, "mazelamp", p, {}); } var b = spotAt(game, hm.x, hm.z, 16, 20, Math.random, null); if (b) D.spawnBeast(game, "starer", b, { quiet: true, guard: "maze" }); },
end: function (game) { D.placesOf(game, "mazelamp").forEach(function (e) { placeEnd(game, e, true); }); } },
{ id: "icefish", icon: "🧊", name: "the ice fishing", line: "a hole in the ice and a lot of standing about. two fish", days: 0.5, season: 3, tasks: [["fish", 2]], title: "ice fisher" },
{ id: "squid", icon: "🦑", name: "the two-day catch", line: "two days of winter fishing. two, four and six fish each win something", days: 2, season: 3, tasks: [["fish", 2], ["fish", 4], ["fish", 6]] },
{ id: "holiday", icon: "🎉", name: "a holiday", line: "a day the tribe made up", days: 0.5, tasks: [["trad", 1], ["food", 2]] },
{ id: "desert", icon: "🏜", name: "the desert fair", line: "three days of strangers' stalls out in the desert, and a kids' race to bet on", days: 3, biome: ["desert", "mesa", "savanna"], tasks: [["there", 1], ["bet", 1], ["game", 1]] }
];
D.FEAST_BY = {}; D.FEASTS.forEach(function (d) { D.FEAST_BY[d.id] = d; });
D.feast = function (game) { var x = game && game.quests && game.quests.dark && game.quests.dark.x2; return x && x.feast ? x.feast : null; };
D.feastWhy = function (game, c, id) {
var d = D.FEAST_BY[id], x = X2(game);
if (!d) return "no such thing";
if (x.feast) return "one gathering at a time";
if (x.wave) return "not with grumps at the gate";
if (x.feastDay === day(game)) return "one a day. the tribe needs a rest";
if (d.home && !(SB.Home && SB.Home.get && SB.Home.get(game))) return "you need a home of your own first";
if (d.item && c && !Sv().has(c, d.item)) return "it takes a " + label(d.item);
if (d.room != null && !D.roomDone(game, d.room)) return "the story room at the ark wreck has to be mended first";
if (d.season != null && game.world.season !== d.season) return "wrong time of year";
return "";
};
D.startFeast = function (game, id, c) {
var d = D.FEAST_BY[id], x = X2(game), hm = home(game), why = D.feastWhy(game, c, id), at = { x: hm.x, z: hm.z };
if (why) return { ok: false, msg: why };
if (d.home) { var hh = SB.Home.get(game); at = { x: hh.x, z: hh.z }; }
if (d.shore || id === "pond") at = biomeSpotNear(game, SEA.concat(WET), hm.x, hm.z, 70) || at;
if (d.biome) { at = biomeSpot(game, d.biome, Math.random); if (!at) return { ok: false, msg: "there is no desert on this island" }; }
var ad = tribe(game).filter(function (o) { return o.stage >= 3 && !o._pov; }), tr = id === "holiday" ? D.tradition(game, game.world.season) : null;
var f = x.feast = { id: id, t0: game.time, until: game.time + d.days * SB.DAY_LENGTH, x: r1(at.x), z: r1(at.z), food: 0, games: 0, played: {}, b: { fish: cnt(game, "fish"), read: cnt(game, "read") }, cook: ad[0] ? ad[0].name : null, singer: ad[1] ? ad[1].name : null, name: tr ? tr.name : d.name, trad: tr ? tr.does : null };
x.feastDay = day(game);
if (x.did.year2) f.toastNeed = 1;
if (d.goods) { drop(game, "paperlantern", 1, at.x + 1, at.z + 1); drop(game, "sweet", 2, at.x - 1, at.z + 1); }
if (d.start) d.start(game, f);
emit("darkFeastStart", { def: d, f: f });
tell(game, d.icon + " " + f.name + ": " + (tr ? "today, " + tr.does : d.line) + "." + (f.cook ? " " + f.cook + " is cooking" + (f.singer ? " and " + f.singer + " is singing" : "") + "." : ""));
return { ok: true, msg: d.icon + " " + f.name + " has begun. see your notices for what to do" };
};
D.feastTasks = function (game) {
var x = X2(game), f = x.feast, d = f ? D.FEAST_BY[f.id] : null, out = [];
if (!d) return out;
var T = d.tasks.slice(); if (f.toastNeed) T.push(["toast", 1]);
T.forEach(function (t) {
var k = t[0], n = t[1], have = 0, text = "";
if (k === "food") { have = f.food * (f.cook ? 2 : 1); text = "put food on the table" + (f.cook ? " (" + f.cook + " makes each piece go twice as far)" : ""); }
else if (k === "fire") { have = D.COND.fire(game) ? 1 : 0; text = "a fire lit in the village"; }
else if (k === "game") { have = f.games; text = "play the games"; }
else if (k === "song") { have = f.singer || x.did.song ? 1 : 0; text = "a song" + (f.singer ? " (" + f.singer + " has it)" : ""); }
else if (k === "read") { have = cnt(game, "read") - f.b.read; text = "read a book aloud (hold a book)"; }
else if (k === "eggs") { have = f.eggs || 0; text = "find painted eggs"; }
else if (k === "lamps") { have = f.lamps || 0; text = "bring in the maze lanterns"; }
else if (k === "fish") { have = cnt(game, "fish") - f.b.fish; text = "catch fish"; }
else if (k === "there") { have = f.there ? 1 : 0; text = "be there (" + Math.round(SB.dist(home(game).x, home(game).z, f.x, f.z)) + "m " + dirOf(f.x - home(game).x, f.z - home(game).z) + " of the nest)"; }
else if (k === "show") { have = f.show ? 1 : 0; text = "enter your best thing at the judged table (hold it)"; }
else if (k === "trad") { have = f.joined ? 1 : 0; text = "join in: " + f.trad; }
else if (k === "bet") { have = f.bet ? 1 : 0; text = "bet on the kids' race"; }
else if (k === "toast") { have = f.toast ? 1 : 0; text = "raise a toast (second-year custom: a honey or a berry)"; }
else if (k === "joy") { var cs = tribe(game), b = 0; cs.forEach(function (c) { b += c.chem.bored || 0; }); have = cs.length && b / cs.length < 0.45 ? 1 : 0; text = "guests enjoying themselves"; }
out.push({ k: k, n: n, have: Math.min(n, have), text: text, done: have >= n });
});
return out;
};
D.GAMES = [
{ id: "bonk", icon: "🔨", name: "bonk-the-grump dummy", stat: function (c) { return 0.1 * (c.tier || 0) + 0.15 * toolDmg(c); } },
{ id: "log", icon: "🪵", name: "the strength log", stat: function (c) { var g = c.genome && c.genome.genes; return 0.3 * ((g && (g.size || g.strength)) || 0.5); } },
{ id: "ring", icon: "⭕", name: "ring toss", stat: function (c, game) { return 0.2 * D.luck(game); } },
{ id: "spear", icon: "🎯", name: "the spear throw", stat: function (c) { return 0.08 * (c.tier || 0) + (Sv().has(c, "spear") ? 0.2 : 0); } },
{ id: "fortune", icon: "🔮", name: "a fortune from an elder", stat: function () { return 1; }, fortune: 1 },
{ id: "honey", icon: "🍯", name: "the honey-eating contest", stat: function (c) { return 0.05 * (c.tier || 0); }, need: { honey: 1 }, silly: 1 }
];
D.GAME_BY = {}; D.GAMES.forEach(function (g) { D.GAME_BY[g.id] = g; });
D.play = function (game, c, id) {
var x = X2(game), f = x.feast, g = D.GAME_BY[id];
if (!f || !g) return { ok: false, msg: "the games are only out at a gathering" };
if (f.played[id]) return { ok: false, msg: "one go each" };
if (g.need && !hasAll(c, g.need)) return { ok: false, msg: "it takes " + costText(g.need) };
if (g.need) takeAll(c, g.need);
f.played[id] = 1; f.games++; bump(game, "gamesPlayed");
if (g.fortune) { var d = x.skyNext ? D.SKY_BY[x.skyNext] : null; return { ok: true, msg: "🔮 the elder squints at your paw. “" + (d ? "i see " + d.name : "i see a quiet day") + ". also, you need a wash.”" }; }
var win = 0.35 + g.stat(c, game) + Math.random() * 0.5 >= 0.6;
if (win) { x.tickets = (x.tickets || 0) + 1; bump(game, "gamesWon"); if (x.tickets % 3 === 0) give(game, c, "firework", 1); }
if (g.silly) { var at = spotAt(game, c.x, c.z, 12, 20, Math.random, null); if (at) { c.x = at.x; c.z = at.z; c.px = at.x; c.pz = at.z; } c.chem.tired = Math.min(1, (c.chem.tired || 0) + 0.4); bump(game, "silly"); return { ok: true, msg: "🍯 " + (win ? "you win! " : "you lose, stickily. ") + "then it all goes blurry, and you wake up somewhere else entirely, with a leaf on your head" }; }
return { ok: true, msg: g.icon + " " + g.name + ": " + (win ? "a winner! one ticket" + (x.tickets % 3 === 0 ? ", and that makes three: a firework" : "") : "not this time") };
};
D.feastFood = function (game, c) { var f = X2(game).feast, k = f ? foodAny(c) : null; if (!f) return { ok: false, msg: "" }; if (!k) return { ok: false, msg: "you have no food on you" }; Sv().take(c, k, 1); f.food++; return { ok: true, msg: "🍲 " + label(k) + " goes on the table" }; };
D.feastToast = function (game, c) { var f = X2(game).feast, k = f ? (Sv().has(c, "honey") ? "honey" : Sv().has(c, "berry") ? "berry" : null) : null; if (!f) return { ok: false, msg: "" }; if (!k) return { ok: false, msg: "a toast takes a honey or a berry" }; Sv().take(c, k, 1); f.toast = 1; return { ok: true, msg: "🥂 to the second year!" }; };
D.feastJoin = function (game, c) { var f = X2(game).feast; if (!f || !f.trad) return { ok: false, msg: "" }; f.joined = 1; chem(c, { bored: -0.4 }); return { ok: true, msg: "🎉 you join in: " + f.trad }; };
D.show = function (game, c) {
var x = X2(game), f = x.feast, hd = Sv().held ? Sv().held(c) : null;
if (!f) return { ok: false, msg: "" };
if (!hd || D.QUEST[hd.k]) return { ok: false, msg: "hold the thing you want judged" };
var k = hd.k, title = k === "pumpkin" ? "biggest gourd" : k === "fish" ? "best fish" : K[k].noun === "food" ? "tastiest thing" : "oddest object";
Sv().take(c, k, 1); f.show = 1; c.dkTitle = title; (x.titles || (x.titles = {}))[title] = c.name; bump(game, "shown");
return { ok: true, msg: "🎪 the judges prod your " + label(k) + ", confer, and pin a leaf on you: “" + title + "”" };
};
D.race = function (game, c, i) {
var x = X2(game), f = x.feast, rs = tribe(game).slice().sort(function (a, b) { return a.stage - b.stage; }).slice(0, 3);
if (!f || f.bet) return { ok: false, msg: f ? "one bet a fair" : "" };
if (rs.length < 2 || !rs[i]) return { ok: false, msg: "not enough runners" };
if ((c.purse || 0) < 2) return { ok: false, msg: "a bet is 2 shells" };
c.purse = r2(c.purse - 2); f.bet = 1;
var best = 0, bs = -1; rs.forEach(function (o, j) { var g = o.genome && o.genome.genes, sp = ((g && (g.speed || g.walk || g.legs)) || 0.5) + Math.random() * 0.4; if (sp > bs) { bs = sp; best = j; } });
if (best === i) c.purse = r2(c.purse + 5); bump(game, "bets");
return { ok: true, msg: "🏁 they're off! " + rs[best].name + " wins by a nose. " + (best === i ? "that's your runner: five shells" : "not yours. two shells gone") };
};
function feastTick(game, c) {
var x = X2(game), f = x.feast; if (!f) return;
var d = D.FEAST_BY[f.id];
if (c && SB.dist(c.x, c.z, f.x, f.z) < 12) f.there = 1;
if (d.tick) d.tick(game, f);
if (game.time >= f.until) feastEnd(game);
}
function feastEnd(game) {
var x = X2(game), f = x.feast, d = D.FEAST_BY[f.id], T = D.feastTasks(game), done = T.filter(function (t) { return t.done; }).length, c = me(), bonus = 0, bits = [];
if (tribe(game).some(function (o) { return o.tier >= 5; })) { bonus++; bits.push("the thinkers let off fireworks"); if (SB.FX && SB.FX.burst) { try { SB.FX.burst("embers", f.x, 4, f.z, 50, { r: 5 }); } catch (e) {} } }
if (c && Sv().has(c, "socks")) { bonus++; bits.push("you wore the chief's lucky socks, and it got the biggest laugh of the night"); }
var ratio = T.length ? Math.min(1, (done + bonus * 0.5) / T.length) : 0, medal = ratio >= 0.99 ? 3 : ratio >= 0.6 ? 2 : ratio >= 0.3 ? 1 : 0, pay = medal * 2 * (x.did.year2 ? 2 : 1);
if (d.end) d.end(game, f);
x.feast = null;
x.medals["feast:" + f.id] = Math.max(x.medals["feast:" + f.id] || 0, medal);
bump(game, "feasts"); if (medal) bump(game, "feast:" + f.id); if (medal === 3) bump(game, "gold");
if (medal) { sparks(game, pay, c); tribe(game).forEach(function (o) { chem(o, { bored: -0.2 * medal, lonely: -0.15 * medal }); }); }
if (medal >= 2 && d.title && c) { c.dkTitle = d.title; (x.titles || (x.titles = {}))[d.title] = c.name; }
emit("darkFeast", { def: d, medal: medal, done: done, of: T.length });
tell(game, d.icon + " " + f.name + " is over: " + done + " of " + T.length + " done" + (medal ? ", " + D.MEDALS[medal] + ", +" + pay + " ✨" : "") + (bits.length ? ". " + bits.join(". ") : "") + ".");
}
D._feastEnd = feastEnd;
function seasonDayKey(game) { var sd = SB.seasonDays ? SB.seasonDays(game) : 4; return Math.floor((game.time / SB.DAY_LENGTH) / (sd * 4)) + ":" + game.world.season; }
function feastCalendar(game, night) {
var x = X2(game), key = seasonDayKey(game), held = x.held || (x.held = {});
if (x.feast || x.wave || D.hurting(game) || tribe(game).length < 3) return null;
var pool = D.FEASTS.filter(function (d) { return !d.call && held[d.id] !== key && (d.season == null || d.season === game.world.season) && !!d.night === !!night && (!d.biome || (held.n || 0) >= 3); });
if (!pool.length) return null;
var d = pool[0], r = D.startFeast(game, d.id, null);
held[d.id] = key; held.n = (held.n || 0) + 1;
return r.ok ? d : null;
}
D.HOLIDAYS = [[1, 1, 2, "newyear", "the turning of the year", ["firework", 2]], [3, 19, 22, "spring", "the first day of real spring", ["seed", 4]], [4, 1, 1, "fools", "the silly day", ["socks", 1]], [6, 20, 22, "midsummer", "the longest day", ["starfruit", 2]], [10, 29, 31, "spooky", "the spooky nights", ["grumpmask", 1]], [12, 23, 26, "gifts", "the gift days", ["sweet", 4]]];
D.holiday = function (date) { var m = date.getMonth() + 1, dd = date.getDate(); for (var i = 0; i < D.HOLIDAYS.length; i++) { var H = D.HOLIDAYS[i]; if (H[0] === m && dd >= H[1] && dd <= H[2]) return H; } return null; };
D.holidayCheck = function (game, date) {
var x = X2(game), H = D.holiday(date || new Date()), hm = home(game), yr = (date || new Date()).getFullYear();
if (!H || x.hol[H[3]] === yr) return null;
x.hol[H[3]] = yr; drop(game, H[5][0], H[5][1], hm.x + 1.2, hm.z - 1.2); drop(game, "paperlantern", 1, hm.x + 0.6, hm.z - 1.6); bump(game, "holidays");
tell(game, "🎁 it's " + H[4] + " out there in the big world. something has been left at the nest.");
return H;
};
D.RULES = [
{ id: "share", icon: "🍎", name: "share the food", does: "the hungriest smol is fed from whatever is lying about the village" },
{ id: "curfew", icon: "🌙", name: "home by dark", does: "everyone but you goes indoors at night" },
{ id: "drum", icon: "🥁", name: "the watch drum", does: "the watch beats a drum for grumps, thieves or fire, and the village wakes" },
{ id: "firewatch", icon: "🪣", name: "the fire watch", does: "smols with buckets put out fires near the village" },
{ id: "dues", icon: "🐚", name: "upkeep dues", does: "you pay shells each week for mending. unpaid, a building crumbles" }
];
D.RULE_BY = {}; D.RULES.forEach(function (r) { D.RULE_BY[r.id] = r; });
D.rule = function (game, id) { var x = game && game.quests && game.quests.dark && game.quests.dark.x2; return !!(x && x.rules && x.rules[id]); };
D.vote = function (game, id) {
var x = X2(game), R = D.RULE_BY[id], ad = tribe(game).filter(function (c) { return c.stage >= 3; });
if (!R) return { ok: false, msg: "" };
if (ad.length < 3) return { ok: false, msg: "a council needs three grown smols" };
if (x.voteDay === day(game)) return { ok: false, msg: "one vote a day. they like to sleep on things" };
x.voteDay = day(game); bump(game, "votes");
var yes = 0, lean = hasStruct(game, "hall") ? 0.65 : 0.55;
ad.forEach(function (c) { if (dice(game, "vote" + id + c.id + day(game))() < lean) yes++; });
var pass = yes * 2 > ad.length, was = !!x.rules[id];
if (pass) x.rules[id] = !was;
emit("darkVote", { id: id, yes: yes, of: ad.length, pass: pass });
return { ok: true, msg: "🗳 the council votes " + yes + " to " + (ad.length - yes) + ": “" + R.name + "” " + (pass ? (was ? "is dropped" : "is the rule now. " + R.does) : "stays as it was") };
};
function rulesTick(game) {
var x = X2(game), w = game.world, hm = home(game);
if (x.rules.share && (x.shareT = (x.shareT || 0) + 2) >= 20) { x.shareT = 0; var hu = tribe(game).sort(function (a, b) { return (b.chem.hunger || 0) - (a.chem.hunger || 0); })[0]; if (hu && hu.chem.hunger > 0.6 && h.looseFood(game) > 0) { h.looseFood(game, 1); hu.chem.hunger = Math.max(0, hu.chem.hunger - 0.35); bump(game, "shared"); } }
if (x.rules.curfew && w.night) tribe(game).forEach(function (c) { if (!c._pov && !D.condOf(game, c)) c.shelterT = Math.max(c.shelterT || 0, 10); });
if (x.rules.firewatch && w.burning && w.burning.length) { for (var i = 0; i < w.burning.length; i++) { var n = w.burning[i]; if (n && n.state === "burning" && SB.dist(n.x, n.z, hm.x, hm.z) < 34) { n.state = "ok"; n.burnT = 0; n.noun = (SB.NODES[n.kind] || {}).noun || "plant"; bump(game, "doused"); if (x.rules.drum && x.fireTold !== day(game)) { x.fireTold = day(game); tell(game, "🥁 the watch drum: fire! the fire watch is on it with buckets."); } break; } } }
}
function duesDawn(game) {
var x = X2(game), d = day(game);
if (!x.rules.dues || d - (x.duesDay || 0) < 7) return;
x.duesDay = d;
var n = game.world.structures.filter(function (b) { return b.done && b.kind !== "darkmark"; }).length, cost = Math.max(1, Math.ceil(n / 6)), c = me() || (SB.Mine && SB.Mine.get ? SB.Mine.get(game) : null);
if (c && (c.purse || 0) >= cost) { c.purse = r2(c.purse - cost); bump(game, "duesPaid"); tell(game, "🐚 upkeep: " + cost + " shells from " + c.name + "'s purse. everything is mended."); return; }
var b = game.world.structures.filter(function (o) { return o.done && (o.kind === "hut" || o.kind === "leanto" || o.kind === "stall" || o.kind === "wall"); })[0];
if (b && SB.Threats && SB.Threats.wreck) SB.Threats.wreck(game, b, "crumbled");
bump(game, "duesMissed"); tell(game, "🐚 the upkeep went unpaid (" + cost + " shells)." + (b ? " a " + ((SK[b.kind] || {}).label || "building") + " has crumbled." : ""));
}
D._duesDawn = duesDawn;
D.ringBell = function (game) { var x = X2(game); if (!x.did.bell) return { ok: false, msg: "the village has no bell yet (it's an order on the board)" }; tribe(game).forEach(function (c) { if (!c._pov) { c.asleep = false; c.shelterT = Math.max(c.shelterT || 0, 60); } }); bump(game, "bells"); emit("darkBell", {}); return { ok: true, msg: "🔔 the bell! every smol in the village runs for the huts" }; };
D.ORDERS = [
{ id: "bell", icon: "🔔", t: "a week's order: 2 metal and 4 sticks for a village bell", need: { metal: 2, stick: 4 }, does: "ring it at the notice board and everyone runs indoors" },
{ id: "rockpile", icon: "🪨", t: "a week's order: 6 stone and 2 sticks for a rock pile on the wall", need: { stone: 6, stick: 2 }, does: "smols on the wall throw rocks at raiders. keep it loaded", place: "rockpile", n: 3 },
{ id: "guardian", icon: "🗿", t: "a week's order: 8 stone and a crystal for a stone guardian", need: { stone: 8, crystal: 1 }, does: "it stands at the village and turns raiders back", place: "guardian" }
];
D.order = function (game) { var x = X2(game); return x.order ? D.ORDERS.filter(function (o) { return o.id === x.order.id; })[0] : null; };
function ordersDawn(game) {
var x = X2(game), d = day(game);
if (x.order && d >= x.order.until) x.order = null;
if (x.order || topTier(game) < 3 || d < 5) return;
var o = D.ORDERS.filter(function (o2) { return !x.did["order-" + o2.id]; })[0];
if (o) { x.order = { id: o.id, until: d + 7 }; emit("darkOrder", { id: o.id }); }
}
D.orderHand = function (game, c) {
var x = X2(game), o = D.order(game), hm = home(game);
if (!o) return { ok: false, msg: "" };
if (!D.atVillage(game, c)) return { ok: false, msg: "bring it to the village" };
if (!hasAll(c, o.need)) return { ok: false, msg: "it takes " + costText(o.need) };
takeAll(c, o.need); x.did["order-" + o.id] = day(game); if (o.id === "bell") x.did.bell = 1; x.order = null; bump(game, "orders"); sparks(game, 6, c);
if (o.place) { var at = spotAt(game, hm.x, hm.z, 5, 9, Math.random, null) || { x: hm.x + 5, z: hm.z }; placeAdd(game, o.place, at, { n: o.n || 0 }); }
return { ok: true, msg: o.icon + " done, and it's there for good: " + o.does + ". +6 ✨" };
};
D.MAKES = [
{ id: "grumpmask", cost: { gloomstone: 1, fiber: 2 } }, { id: "tripwire", cost: { vine: 2 } }, { id: "taunt", cost: { stick: 2, fur: 1 } }, { id: "glowbait", cost: { glowcap: 1, bugjelly: 1 } },
{ id: "darkidol", cost: { gloomstone: 3, crystal: 1 } }, { id: "duskkey", cost: { duskshard: 1, metal: 1 } }, { id: "firework", cost: { mote: 1, stick: 1 }, thinker: 1 },
{ id: "snowsmol", cost: { stick: 2, stone: 2 }, place: "snowsmol", winter: 1, label: "a snow smol", emoji: "⛄", desc: "winter only. it stands where you build it and pelts raiders with snowballs until the thaw." }
];
D.makeWhy = function (game, c, id) {
var m = D.MAKES.filter(function (o) { return o.id === id; })[0];
if (!m) return "no such thing";
if (c.tier < 2) return "it takes hands: a tool-user and up";
if (m.thinker && !tribe(game).some(function (o) { return o.tier >= 5; })) return "only once the tribe has a thinker";
if (m.winter && game.world.season !== 3) return "only in winter";
if (!hasAll(c, m.cost)) return "it takes " + costText(m.cost);
return "";
};
D.make = function (game, c, id) {
var why = D.makeWhy(game, c, id), m = D.MAKES.filter(function (o) { return o.id === id; })[0];
if (why) return { ok: false, msg: why };
takeAll(c, m.cost);
if (m.place) { placeAdd(game, m.place, { x: c.x + 1, z: c.z + 1 }, {}); return { ok: true, msg: m.emoji + " " + m.label + ", built right here" }; }
give(game, c, id, 1); bump(game, "made");
return { ok: true, msg: K[id].emoji + " a " + label(id) + ". " + K[id].desc };
};
D.CIRCLES = {
makers: { icon: "🔨", name: "the makers", hello: "“what are you building?”", likes: "nut" }, hunters: { icon: "🏹", name: "the hunters", hello: "“seen anything?”", likes: "meat" },
thinkers: { icon: "💭", name: "the thinkers", hello: "“ah, but have you considered…”", likes: "glowcap" }, kids: { icon: "🪁", name: "the puddle gang", hello: "“you're it!”", likes: "berry" }
};
D.circleStanding = function (game, id) { return X2(game).circ[id] || 0; };
var CLUBN = ["the rock lookers", "the early risers", "the soup society", "the long walkers"], PAST = ["staring at a good rock", "watching the sun come up", "arguing about soup", "walking round the village twice"];
D.newClub = function (game, c) {
var x = X2(game), hm = home(game);
if (x.clubs.length >= 2) return { ok: false, msg: "two clubs is plenty for one village" };
var i = x.clubs.length + (c.id || 0), at = spotAt(game, hm.x, hm.z, 5, 10, Math.random, null) || { x: hm.x + 5, z: hm.z };
x.clubs.push({ name: CLUBN[i % CLUBN.length], pastime: PAST[i % PAST.length], members: [c.id], x: at.x, z: at.z }); bump(game, "clubs");
return { ok: true, msg: "🪧 you start " + CLUBN[i % CLUBN.length] + " (favourite pastime: " + PAST[i % PAST.length] + "). stand by a smol and ask it in, in your notices" };
};
D.joinClub = function (game, o) { var x = X2(game), cl = x.clubs.filter(function (q) { return q.members.length < 6 && q.members.indexOf(o.id) < 0; })[0]; if (!cl || x.clubs.some(function (q) { return q.members.indexOf(o.id) >= 0; })) return { ok: false, msg: "" }; cl.members.push(o.id); bump(game, "clubJoins"); return { ok: true, msg: "🪧 " + o.name + " joins " + cl.name }; };
function clubsDusk(game) { X2(game).clubs.forEach(function (cl) { cl.members = cl.members.filter(function (id) { var c = SB.Game.byId(game, id); return c && c.alive; }); cl.members.forEach(function (id) { var c = SB.Game.byId(game, id); if (c._pov) return; chem(c, { bored: -0.3, lonely: -0.3 }); if (SB.Creature && SB.Creature.sendTo) SB.Creature.sendTo(c, cl.x + (Math.random() - 0.5) * 2, cl.z + (Math.random() - 0.5) * 2, game, 60); }); if (cl.members.length >= 2) bump(game, "clubMeets"); }); }
D.RANKS = [[0, "lookout", 0, ""], [2, "watcher", 1, "a watch badge"], [5, "warden", 2, "a spear from the watch"], [9, "captain of the watch", 3, "a bunk at the watch: resting at any watch fort or well mends you"]];
D.watchMembers = function (game) { var x = X2(game); x.watch = x.watch.filter(function (id) { var c = SB.Game.byId(game, id); return c && c.alive; }); return x.watch.length + tribe(game).filter(function (c) { return c.job === "guard" && x.watch.indexOf(c.id) < 0; }).length; };
D.watchRank = function (game) { var n = cnt(game, "nights"), m = D.watchMembers(game), i = 0; for (var j = 0; j < D.RANKS.length; j++) if (n >= D.RANKS[j][0] && m >= D.RANKS[j][2]) i = j; return i; };
D.joinWatch = function (game, c, o) {
var x = X2(game);
if (!o || o.stage < 3 || o === c) return { ok: false, msg: "the watch is for grown smols" };
if (x.watch.indexOf(o.id) >= 0) return { ok: false, msg: o.name + " is already in the watch" };
if (x.watch.length >= 6) return { ok: false, msg: "the watch is full" };
x.watch.push(o.id); bump(game, "joined"); emit("darkWatch", { c: o });
D.placesOf(game, "watchfort").forEach(function (p) { rename(game, p); });
return { ok: true, msg: "🛡 " + o.name + " joins the night watch (" + D.watchMembers(game) + " strong)" };
};
function watchDawn(game) {
var x = X2(game), c = me();
if (x.nightWon) { x.nightWon = 0; bump(game, "nights"); }
var rk = D.watchRank(game);
while ((x.rankGot || 0) < rk) { x.rankGot = (x.rankGot || 0) + 1; var R = D.RANKS[x.rankGot]; if (x.rankGot === 1) give(game, c, "badge", 1); if (x.rankGot === 2) give(game, c, K.spear ? "spear" : "club", 1); if (x.rankGot === 3) x.did.bunk = 1; emit("darkRank", { i: x.rankGot }); tell(game, "🛡 the night watch makes you " + R[1] + ": " + R[3] + "."); }
}
D._watchDawn = watchDawn;
D.capture = function (game, c, g) {
var x = X2(game), p = g && g.dark ? D.postOf(game, g.dark) : null, hm = home(game);
if (!p || (p.kind !== "named" && p.kind !== "beast")) return { ok: false, msg: "" };
if (p.kind === "beast" && (D.BEAST_BY[p.bid].big || D.BEAST_BY[p.bid].unbeatable || D.BEAST_BY[p.bid].calm)) return { ok: false, msg: "not that one" };
if (D.hp(game, p.key) > 0.5) return { ok: false, msg: "it isn't beaten yet" };
if (!Sv().has(c, "vine")) return { ok: false, msg: "it takes a vine to tie it" };
if (x.pen.length >= 2) return { ok: false, msg: "the pen is full" };
Sv().take(c, "vine", 1);
var nm = p.name.replace(/^(a|an|the) /, "");
if (p.kind === "beast") D.beastDone(game, p, c, "tamed"); else h.dropPost(game, p, "caught");
st(game).board.list.forEach(function (e) { if (e.ref === p.key && !e.done) { e.done = true; e.doneDay = day(game); e.paid = "caught"; } });
x.pen.push({ name: nm, day: day(game), fed: 0, tame: 0 }); bump(game, "caught"); emit("darkCaught", { name: nm });
return { ok: true, msg: "🪢 you tie " + p.name + " up and walk it home. it's in the pen by the nest. feed it, keep a fire lit at night, and see" };
};
D.feedPen = function (game, c, i) {
var x = X2(game), e = x.pen[i], hm = home(game);
if (!e || e.tame) return { ok: false, msg: "" };
if (!D.atVillage(game, c)) return { ok: false, msg: "the pen is at the village" };
if (e.fedDay === day(game)) return { ok: false, msg: "it has eaten today. tomorrow" };
var k = foodAny(c); if (!k) return { ok: false, msg: "you need some food" };
Sv().take(c, k, 1); e.fed++; e.fedDay = day(game);
if (e.fed < 3) return { ok: true, msg: "🍎 it snatches the " + label(k) + " and glares. (" + e.fed + " of 3)" };
e.tame = day(game); bump(game, "tamed"); D.move(game, "grumps", 5, "tamed one");
var at = spotAt(game, hm.x, hm.z, 4, 8, Math.random, null) || { x: hm.x + 4, z: hm.z }; placeAdd(game, "tamegrump", at, { who: e.name });
emit("darkTamed", { name: e.name });
return { ok: true, msg: "🧡 it takes the " + label(k) + " gently, and sits down by you. " + e.name + " is tame: it guards the village now" };
};
PL("tamegrump", { name: function (p) { return (p.who || "a grump") + ", tame"; }, icon: "🧡", slow: turret(10, 14), act: { label: "tickle the tame grump", go: function (game, c, p) { chem(c, { bored: -0.3 }); return (p.who || "it") + " makes a noise like a kettle. it has turned " + cnt(game, "turned:tamegrump") + " raiders back"; } } });
function penDusk(game) {
var x = X2(game), lit = D.COND.fire(game);
x.pen.slice().forEach(function (e) { if (e.tame || lit) return; x.pen = x.pen.filter(function (o) { return o !== e; }); bump(game, "breakouts"); emit("darkBreakout", { name: e.name }); tell(game, "🪢 with no fire lit, " + e.name + " chewed through the vine and broke out of the pen."); });
}
D._penDusk = penDusk;
D.ENDS = { den: "the den, sealed", void: "the dark stone, settled", dark: "the dark itself, chased off", ascent: "the elders' heirs", journey: "the others came to you" };
D.score = function (game) {
var x = X2(game), s = st(game), parts = [], pts = 0;
function add(ok, n, text) { parts.push({ ok: !!ok, n: n, text: text }); if (ok) pts += n; }
add(tribe(game).length >= 8, 1, "eight or more smols"); add(topTier(game) >= 4, 1, "builders in the tribe"); add(capBeat(game) >= 3, 2, "all three captains beaten");
add((s.board.seals || 0) >= 10, 1, "ten jobs for the council"); add(cnt(game, "lines") >= 5, 1, "five stories finished"); add(cnt(game, "gold") >= 2, 1, "two gold gatherings");
add(cnt(game, "beasts") >= 10, 1, "ten beasts chased off"); add(D.rank(game, "far").i >= 2, 1, "friends with the far tribe"); add(cnt(game, "wishes") >= 5, 1, "five wishes granted");
add(cnt(game, "rooms") >= 4, 1, "the ark wreck mended"); add(Object.keys(x.ends).length >= 1, 1, "an ending found");
return { pts: pts, of: 12, flames: pts >= 10 ? 4 : pts >= 7 ? 3 : pts >= 4 ? 2 : pts >= 2 ? 1 : 0, parts: parts };
};
D.yearOne = function (game) { var sd = SB.seasonDays ? SB.seasonDays(game) : 4; return game.time / SB.DAY_LENGTH >= sd * 4; };
D.judge = function (game, c) {
var x = X2(game);
if (!D.yearOne(game)) return { ok: false, msg: "the Lantern scores an island after its first full year" };
var sc = D.score(game), best = x.score ? x.score.flames : 0;
x.score = { flames: Math.max(best, sc.flames), pts: sc.pts, day: day(game) }; bump(game, "judged");
var prize = "";
if (sc.flames >= 4 && !x.did.flames4) { if (c && (D.atWell(game, c) || D.placesOf(game, "room").some(function (p) { return SB.dist(p.x, p.z, c.x, c.z) < 10; }))) { x.did.flames4 = day(game); give(game, c, "keepsake", 1); prize = " four flames: the Lantern's keepsake is yours"; } else prize = " four flames! come to a well of light or the ark wreck for your prize"; }
return { ok: true, msg: "🕯 the Lantern looks the island over: " + sc.pts + " of " + sc.of + ", " + sc.flames + (sc.flames === 1 ? " flame" : " flames") + "." + prize + (sc.flames < 4 ? " ask again when you've done more" : "") };
};
D.perfect = function (game) {
var x = X2(game), have = 0, of = 0;
D.BEASTS.forEach(function (d) { if (d.child || d.only) return; of++; if ((x.seen[d.id] || {}).beat) have++; });
D.SKIES.forEach(function (d) { if (!d.auto) return; of++; if (x.skies[d.id]) have++; });
D.WAVES.forEach(function (d) { of++; if (x.medals["wave:" + d.id]) have++; });
D.FEASTS.forEach(function (d) { of++; if (x.medals["feast:" + d.id]) have++; });
D.LINES.forEach(function (L) { of++; if (x.lines[L.id] && x.lines[L.id].done) have++; });
return { have: have, of: of, pct: of ? Math.floor(have * 100 / of) : 0 };
};
D.FEATS = [
{ id: "beastbook", name: "the whole beast book: every roaming kind chased off once", sparks: 20, test: function (game, x) { return D.BEASTS.every(function (d) { return d.child || d.only || d.big || (x.seen[d.id] || {}).beat; }); }, keeper: 1 },
{ id: "bigs", name: "every big one you can call, beaten", sparks: 30, test: function (game, x) { return D.BIGS.every(function (d) { return !d.call || d.ng || x.big[d.id]; }); } },
{ id: "skies", name: "every sky seen", sparks: 10, test: function (game, x) { return D.SKIES.every(function (d) { return !d.auto || x.skies[d.id]; }); } },
{ id: "golds", name: "gold at five different gatherings", sparks: 15, test: function (game, x) { var n = 0; for (var k in x.medals) if (k.indexOf("feast:") === 0 && x.medals[k] === 3) n++; return n >= 5; } },
{ id: "waves", name: "gold in a wave night, a ring and a vault", sparks: 15, test: function (game, x) { return x.medals["wave:wavenight"] === 3 && x.medals["wave:arena"] === 3 && x.medals["wave:vault"] === 3; } },
{ id: "ends", name: "three different endings", sparks: 25, test: function (game, x) { return Object.keys(x.ends).length >= 3; } },
{ id: "all", name: "everything: 100%", sparks: 40, test: function (game) { return D.perfect(game).pct >= 100; }, keepsake: 1 }
];
function featsCheck(game) {
var x = X2(game), hm = home(game);
D.FEATS.forEach(function (f) {
if (x.feats[f.id]) return; var ok = false; try { ok = f.test(game, x); } catch (e) {} if (!ok) return;
x.feats[f.id] = day(game); sparks(game, f.sparks);
if (f.keeper) { var nc = h.newcomer(game, hm.x + 3, hm.z + 3, false, "keeper"); if (nc) nc.dkTitle = "the keeper of beasts"; }
if (f.keepsake) { drop(game, "keepsake", 1, hm.x + 1, hm.z + 1); if (SB.FX && SB.FX.burst) { try { SB.FX.burst("embers", hm.x, 4, hm.z, 80, { r: 8 }); } catch (e2) {} } }
emit("darkFeat", { id: f.id }); tell(game, "🏆 a feat: " + f.name + ". +" + f.sparks + " ✨" + (f.keepsake ? ", fireworks, and a keepsake at the nest" : f.keeper ? ", and a keeper of beasts has come to live here" : ""));
});
}
D._featsCheck = featsCheck;
D.credits = function (game) {
var x = X2(game), cs = tribe(game), out = ["smol brains: this island"];
out.push("the Lantern: you"); out.push("the storyteller: " + D.teller(game).name);
out.push("the tribe: " + cs.slice(0, 8).map(function (c) { return c.name + (c.dkTitle ? " " + c.dkTitle : ""); }).join(", ") + (cs.length > 8 ? ", and " + (cs.length - 8) + " more" : ""));
out.push("beasts chased off: " + cnt(game, "beasts") + " · big ones: " + cnt(game, "bigs") + " · waves held: " + cnt(game, "wave"));
out.push("stories finished: " + cnt(game, "lines") + " · gatherings: " + cnt(game, "feasts") + " · wishes granted: " + cnt(game, "wishes"));
out.push("endings found: " + (Object.keys(x.ends).map(function (k) { return D.ENDS[k] || k; }).join(", ") || "none yet"));
out.push("made by Computer Cooked, and by every smol that ever fainted for it. thank you for playing");
return out;
};
D.holds = function (game) {
var vs = (game.villages || []).slice(0, 9), out = [], hm = home(game), FOODS = ["berry", "fish", "honey", "nut", "cooked", "carrot"];
if (!vs.length) vs = [{ x: hm.x, z: hm.z, name: (game.tribes && game.tribes[0] && game.tribes[0].name) || "the village" }];
vs.forEach(function (v, i) {
var r = dice(game, "hold" + i), near = tribe(game).filter(function (c) { return c.stage >= 3; }).sort(function (a, b) { return (b.tier - a.tier) || (SB.dist(a.x, a.z, v.x, v.z) - SB.dist(b.x, b.z, v.x, v.z)); })[i % Math.max(1, tribe(game).length)] || null;
var other = vs.length > 1 ? vs[(i + 1) % vs.length] : null, fk = FOODS[Math.floor(r() * FOODS.length)];
out.push({ name: v.name || "village " + (i + 1), x: v.x, z: v.z, leader: near ? near.name : "nobody yet", hello: SYL[Math.floor(r() * SYL.length)] + "-" + SYL[Math.floor(r() * SYL.length)] + "!", food: K[fk] ? fk : "berry", grudge: other ? "thinks " + (other.name || "the other village") + " makes thin soup" : "holds a grudge against " + D.BEASTS[Math.floor(r() * 12)].name, custom: TRADS[Math.floor(r() * TRADS.length)] });
});
return out;
};
D.dynasty = function (game) {
var m = SB.Mine && SB.Mine.get ? SB.Mine.get(game) : null, c = m || me() || tribe(game)[0]; if (!c) return null;
var kin = tribe(game).filter(function (o) { return o === c || (o.parents || []).indexOf(c.id) >= 0 || (c.parents || []).some(function (p) { return (o.parents || []).indexOf(p) >= 0; }); });
var chief = kin.slice().sort(function (a, b) { return (b.age || 0) - (a.age || 0); })[0];
return { name: "the line of " + String(c.name).split(" ")[0], n: kin.length, standing: cnt(game, "wishes") + (st(game).board.seals || 0) + cnt(game, "lines") * 2, chief: chief ? chief.name : c.name };
};
var SCENES = ["shows you the thing it has kept in its bag since the pod: a button", "tells you what it dreamed in the long sleep. it was mostly soup", "admits it is afraid of the dark, and has been pretending", "asks whether you think the others out there are all right", "teaches you the song its mother hummed"];
D.scene = function (game, c, lv) { var x = X2(game), key = c.id + ":" + lv; if (x.scenes[key]) return ""; x.scenes[key] = day(game); bump(game, "scenes"); return "💗 " + c.name + " " + SCENES[((c.id || 0) + lv) % SCENES.length] + ". (" + D.before(c) + ".)"; };
var LORE = ["“…the kettles on deck nine never did work. we loved them anyway.”", "“a grump can't stand a light. remember that when you are small and it is big.”", "“count the pods. count them again. somebody always miscounts.”", "“the yellow thing was called a banana. write it down this time.”", "“if you find this: we were happy, mostly. be happy, mostly.”", "“soup: water, anything, patience.”"];
D.write = function (game, c) {
var x = X2(game);
if (c.tier < 4 && !(SB.Ideas && SB.Ideas.known && SB.Ideas.known(c, "writing"))) return { ok: false, msg: "it takes a builder's paws, or the idea of writing" };
if (x.wroteDay === day(game)) return { ok: false, msg: "one book a day. your paw hurts" };
if (!hasAll(c, { leaves: 2 }) && !hasAll(c, { fiber: 2 })) return { ok: false, msg: "a book takes 2 leaves or 2 fibre" };
takeAll(c, hasAll(c, { leaves: 2 }) ? { leaves: 2 } : { fiber: 2 });
x.wroteDay = day(game);
x.books.push({ by: c.name, day: day(game), text: "“day " + day(game) + ". " + cnt(game, "beasts") + " beasts seen off so far, " + cnt(game, "wishes") + " wishes granted, " + tribe(game).length + " of us. " + D.luckLine(game) + ".” by " + c.name });
if (x.books.length > 12) x.books.shift();
give(game, c, "book", 1); bump(game, "written"); bump(game, "read");
return { ok: true, msg: "📕 you write a book. it's in your bag: hold it to read it, or leave it for someone" };
};
D.readBook = function (game, c) {
var x = X2(game), n = bump(game, "read"), own = x.books.length ? x.books[(n - 1) % x.books.length] : null, text = own && n % 2 === 0 ? own.text : LORE[(n - 1) % LORE.length];
if (n <= LORE.length) sparks(game, 1, c);
return { ok: true, msg: "📕 " + text };
};
D.pals = function (game) { var m = me(); return tribe(game).filter(function (c) { return c !== m && c.stage >= 2; }).slice(0, 2); };
D.setPal = function (game, id) { var x = X2(game), c = SB.Game.byId(game, id); if (x.pal || day(game) > 2 || !c) return { ok: false, msg: "" }; x.pal = id; bump(game, "pal"); return { ok: true, msg: "🧡 " + c.name + " will walk with you today. (" + D.before(c) + ".)" }; };
var OPIN = { darkBig: "“that was the biggest thing i have ever seen. don't do that again. do that again.”", darkWave: "“well, i'd call that a win. my feet wouldn't.”", darkFeast: "“pod 3 had better parties. this was a close second.”", darkSky: "“we never had weather on the ark. i'm not sure i approve.”" };
D.tour = function (game) {
var x = X2(game), ad = tribe(game).filter(function (c) { return c.stage >= 3 && !c._pov && !c.asleep; }).slice(0, 2), hm = home(game);
if (x.tour) return { ok: false, msg: "a party is already out" };
if (ad.length < 2) return { ok: false, msg: "it takes two grown smols with nothing better to do" };
var at = spotAt(game, hm.x, hm.z, 30, 50, Math.random, null) || { x: hm.x + 30, z: hm.z };
ad.forEach(function (c) { if (SB.Creature && SB.Creature.sendTo) SB.Creature.sendTo(c, at.x, at.z, game, 200); });
x.tour = { day: day(game), who: ad.map(function (c) { return c.name; }), x: at.x, z: at.z }; bump(game, "tours");
return { ok: true, msg: "🥾 " + x.tour.who.join(" and ") + " set off to the " + dirOf(at.x - hm.x, at.z - hm.z) + ". they'll have a story by morning" };
};
function tourDawn(game) {
var x = X2(game), t = x.tour, hm = home(game); if (!t || day(game) <= t.day) return;
x.tour = null;
var n = cnt(game, "tours") % 4, who = t.who.join(" and "), msg;
if (n === 0) { drop(game, "starfruit", 2, hm.x + 1, hm.z + 1); msg = "found a tree nobody knew about, and carried home what they didn't eat"; }
else if (n === 1) { D.move(game, "far", 4, "a friendly meeting"); msg = "met the far tribe on the road and swapped songs"; }
else if (n === 2) { if (SB.World.reveal) SB.World.reveal(game.world, t.x, t.z, 14); msg = "got lost, climbed a hill to find out where, and drew what they saw: it's on your map"; }
else { drop(game, "fur", 1, hm.x + 1, hm.z + 1); msg = "were chased up a tree by something, and came home with a tuft of it"; }
emit("darkTour", { who: t.who }); tell(game, "🥾 " + who + " are back. they " + msg + ".");
}
D._tourDawn = tourDawn;
var lastPos = null, sneaking = false;
D.setSneak = function (on) { sneaking = !!on; };
function metCount(x) { var n = 0; for (var k in x.met) if (k.indexOf("f:") !== 0) n++; return n; }
function scoutNotice(game, why) {
var hm = home(game), b = st(game).board;
if (b.list.some(function (e) { return e.kind === "scout" && !e.done; })) return null;
var best = null, bd = 1e9; (game.sites || []).forEach(function (q) { if (q.found || q.gone || q.kind === "pod") return; var dd = SB.dist(q.x, q.z, hm.x, hm.z); if (dd < bd) { bd = dd; best = q; } });
if (!best) return null;
return h.post(game, { kind: "scout", ref: best.id, icon: "🧭", t: (why || "somewhere new") + ": find out what is about " + Math.round(bd / 10) * 10 + "m to the " + dirOf(best.x - hm.x, best.z - hm.z), pay: 6 });
}
D._scoutNotice = scoutNotice;
function boardTick2(game) {
var c = me(), L = st(game).board.list, tot = L.some(function (e) { return e.kind === "monument" && !e.done; }) ? game.world.structures.filter(function (b) { return b.kind === "totem" && b.done; }).length : 0;
L.forEach(function (e) {
if (e.done) return;
if (e.kind === "scout") { var q = (game.sites || [])[e.ref]; if (q && (q.found || q.gone)) h.payOut(game, e, c, 1); }
if (e.kind === "monument") { if (tot > e.base) { e.built = e.built || day(game); if (day(game) >= e.built + 2) h.payOut(game, e, c, 1); } else e.built = 0; }
});
}
function fast2(game) {
var x = X2(game), c = me(), P = SB.Possess, hm = home(game);
if (c) {
if (lastPos && lastPos.id === c.id && game.time > lastPos.t) { var mv = SB.dist(c.x, c.z, lastPos.x, lastPos.z), sp = mv / (game.time - lastPos.t), loud = (SB.Creature && SB.Creature.runSpeed ? SB.Creature.runSpeed(c) : 2.5) * 0.72; if (sp > loud && mv < 8 && !sneaking) x.noise = Math.max(x.noise || 0, game.time + 3); }
lastPos = { id: c.id, x: c.x, z: c.z, t: game.time };
if (c.dkSore) { if (game.time >= c.dkSore) c.dkSore = 0; else if (c.chem.health > 0.8) c.chem.health = 0.8; }
x.places.slice().forEach(function (p) { var d = D.PLACE[p.kind]; if (d && d.near && SB.dist(c.x, c.z, p.x, p.z) < (d.r || 2.5)) d.near(game, c, p, x); });
var g = P && P.scout ? P.scout() : null;
if (g && g.boss === "night" && game.time >= (x.lampT || 0) && D.placesOf(game, "lamp").length) { x.lampT = game.time + 6; g.whacked = Math.max(0, (g.whacked || 0) - 0.5); bump(game, "lampMends"); }
if (SB.dist(c.x, c.z, hm.x, hm.z) > 25 && game.time >= (x.roadT || 0) && !g) {
x.roadT = game.time + 90;
if (lucky(game, 0.35) && !D.placesOf(game, "road").length) {
var at = spotAt(game, c.x, c.z, 6, 9, Math.random, null), n = bump(game, "roads") % (D.ROAD.length + 1);
if (at && n === D.ROAD.length) { var pool = D.BEASTS.filter(function (d) { return D.beastFits(game, d, at, !!game.world.night); }); if (pool.length && D.beastsOut(game).length < D.cap(game)) { D.spawnBeast(game, pool[0].id, at, { quiet: true }); psay("🧭 something is waiting on the path ahead"); } }
else if (at) { var rp = placeAdd(game, "road", at, { what: n }); psay("🧭 " + placeName(rp) + ", just off the path"); }
}
}
if (game.world.night && (c.chem.tired || 0) > 0.85 && game.time >= (x.flyT || 0) && !st(game).posts.some(function (p) { return p.bid === "nightflyer"; })) { x.flyT = game.time + 240; var fa = spotAt(game, c.x, c.z, 7, 10, Math.random, null); if (fa) { D.spawnBeast(game, "nightflyer", fa, { quiet: true }); psay("🦇 you are so tired that something has come to see. sleep, or fight it"); } }
} else lastPos = null;
waveTick(game); linesTick(game, c); feastTick(game, c); boardTick2(game);
}
function slow2(game) {
var x = X2(game), c = me(), w = game.world, ban = D.banners(game), DR = SB.Director;
skyTick(game);
x.places.slice().forEach(function (p) { var d = D.PLACE[p.kind]; if (d && d.slow) d.slow(game, p, x); });
if (game.time >= chkT || game.time < chkT - 30) { chkT = game.time + 10; x.places.forEach(function (p) { if (!D.PLACE[p.kind]) return; var b = h.findStruct(game, "darkmark", "pl-" + p.id); if (!b) b = h.putStruct(game, "darkmark", p.x, p.z, "pl-" + p.id); if (!b.done) { b.done = true; b.need = {}; b.noun = "wonder"; } b.name = placeName(p); }); }
wishesTick(game); condsTick(game); rulesTick(game);
game.creatures.forEach(function (g) {
if (g.species !== "grump" || !g.alive) return;
if (!g._dk2) { g._dk2 = 1; if (g.raider && !g.boss && !g.dark && ban) g.tough = r2((g.tough || 1) * (1 - 0.06 * ban)); }
if (g.raider && !g._dkTr && !g.goingHome) w.structures.forEach(function (b) { if (!g._dkTr && b.kind === "farm" && b.done && b.data && b.data.grow > 0 && SB.dist(b.x, b.z, g.x, g.z) < 3) { g._dkTr = 1; b.data.grow = Math.max(0, b.data.grow * 0.7); bump(game, "trampled"); } });
});
if (w.night) st(game).posts.forEach(function (p) {
if (p.bid !== "yawn" || (p.tw2 = (p.tw2 || 0) + 2) < 20) return; p.tw2 = 0;
var o = tribe(game).filter(function (s0) { return !s0._pov && !s0.asleep; })[0];
if (o) { o.asleep = true; o.chem.tired = 1; bump(game, "yawned"); if (!p.told) { p.told = 1; tell(game, "🥱 your smols are nodding off where they stand, one after another. something out there is yawning. find it."); } }
});
if (c && x.pal && day(game) <= 2 && game.time >= (x.palT || 0)) { x.palT = game.time + 6; var pal = SB.Game.byId(game, x.pal); if (pal && pal.alive && SB.dist(pal.x, pal.z, c.x, c.z) > 5 && SB.Creature && SB.Creature.sendTo) SB.Creature.sendTo(pal, c.x + 1.5, c.z + 1, game, 10); }
if (c && x.did.thane && !w.night && game.time >= (x.helpT || 0)) { x.helpT = game.time + 8; var hp = SB.Game.byId(game, x.helper); if (!hp || !hp.alive || hp === c) { hp = tribe(game).filter(function (o) { return o.stage >= 3 && !o._pov; })[0]; x.helper = hp ? hp.id : null; } if (hp && SB.dist(hp.x, hp.z, c.x, c.z) > 6 && SB.dist(hp.x, hp.z, c.x, c.z) < 40 && SB.Creature && SB.Creature.sendTo) SB.Creature.sendTo(hp, c.x + 2, c.z + 1, game, 12); }
if (DR && DR.feud && x.did.peace) DR.feud.w = 0;
}
var tF2 = 0, tS2 = 0.9, chkT = 0;
D.tick2 = function (game, dt) {
if (!game || game.offline || !D.open(game)) return;
if ((tF2 -= dt) <= 0) { tF2 = 0.5; fast2(game); }
if ((tS2 -= dt) <= 0) { tS2 = 2; slow2(game); }
};
var FAINTS = ["laughed so hard at its own joke that it fainted", "sneezed, startled itself, and fell over", "stood up too fast", "saw its own reflection in the pond and keeled over", "was so proud of a pebble it found that it had to lie down"];
var DOORSTEP = [["stone", 1, "a smooth stone that wasn't there yesterday"], ["berry", 3, "three berries on a leaf, from the wild smols"], ["mote", 1, "a little light, still warm"], ["seed", 2, "seeds, in a folded leaf"]];
D.dawn2 = function (game) {
if (!game || !D.open(game)) return;
var x = X2(game), s = st(game), d = day(game), hm = home(game);
s.posts.slice().forEach(function (p) {
if (p.kind !== "beast" || h.dueling(h.postGrump(game, p))) return;
var bd = D.BEAST_BY[p.bid]; if (!bd || p.wave) return;
if (bd.night && !bd.nosun && !p.guard) D.beastDone(game, p, null, "sun");
else if (!p.guard && d - p.day >= (bd.big ? 3 : 2)) D.beastDone(game, p, null, "left");
});
watchDawn(game);
if (!D.sky(game) && x.skyNext && !D.SKY_BY[x.skyNext].night && D.skyFits(game, D.SKY_BY[x.skyNext])) D.startSky(game, x.skyNext);
if (!x.skyNext || !D.SKY_BY[x.skyNext].night || D.sky(game)) D.pickSky(game);
if (game.world.season === 3 && x.sniffYear !== seasonDayKey(game) && !D.sky(game) && tribe(game).length >= 3) { x.sniffYear = seasonDayKey(game); D.startSky(game, "sniffles"); }
D.seed(game);
D.roam(game, false);
D.autoWave(game, false);
guestsDawn(game); wishesDawn(game); D.openLines(game); ordersDawn(game); duesDawn(game); tourDawn(game);
feastCalendar(game, false);
if (!x.holT || Date.now() - x.holT > 3600000) { x.holT = Date.now(); D.holidayCheck(game); }
scoutNotice(game, x.did.surveyor ? "the surveyor's note" : "somewhere new");
if (topTier(game) >= 3 && d - (x.monDay || 0) >= 10 && !s.board.list.some(function (e) { return e.kind === "monument" && !e.done; })) { x.monDay = d; h.post(game, { kind: "monument", ref: d, icon: "🗿", t: "the council wants a new totem raised, and still standing two days on", pay: 14, base: game.world.structures.filter(function (b) { return b.kind === "totem" && b.done; }).length }); }
if (D.yearOne(game) && !x.did.year2) { x.did.year2 = d; var names = []; for (var i = 0; i < 2; i++) { var nc = h.newcomer(game, hm.x + 4 + i, hm.z + 3, i === 1, "year2"); if (nc) names.push(nc.name); } tell(game, "🌱 a whole year on the island. " + (names.length ? names.join(" and ") + " walked in at dawn to stay, and " : "") + "from now on every gathering ends with a toast, and pays double. ask the Lantern how you've done (in your notices)."); }
if (D.metFaction(game, "elder") && D.rank(game, "elder").i >= 2 && d % 3 === 0) drop(game, K.bread ? "bread" : "cooked", 2, hm.x - 1.4, hm.z - 1);
if (D.metFaction(game, "reed") && D.rank(game, "reed").i >= 2 && d % 2 === 0) drop(game, "fish", 2, hm.x - 1.8, hm.z - 0.6);
if (D.metFaction(game, "hush") && D.rank(game, "hush").i === 0 && d % 4 === 0) s.raid.escaped = Math.max(s.raid.escaped || 0, 1);
if (x.did.wildChief && s.wildDay) s.wildDay = Math.min(s.wildDay, d - 2);
if (D.rank(game, "far").i >= 1 && d >= 6 && !x.did.farcamp) { var fc = spotAt(game, hm.x, hm.z, 40, 70, dice(game, "farcamp"), null); if (fc) { placeAdd(game, "farcamp", fc, {}); x.did.farcamp = 1; } }
if (D.roomDone(game, 0)) game.world.structures.forEach(function (b) { if (b.kind === "farm" && b.done && b.data) b.data.grow = Math.min(1, (b.data.grow || 0) + 0.1); });
tribe(game).forEach(function (c) { if (c.dkQuirk && !c.dkQuirkTold && d >= (c.dkQuirkDay || 0)) { c.dkQuirkTold = 1; bump(game, "quirks"); tell(game, "🎩 it turns out " + c.name + (c.dkQuirk === "eats" ? " gets up in the night and eats whatever is lying about" : c.dkQuirk === "walks" ? " walks in its sleep, toward the dark" : " sings at dusk, loudly, and wakes everyone") + ". clever, though."); } });
if (lucky(game, 0.05)) { var fc2 = tribe(game).filter(function (c) { return c.stage >= 3 && !c._pov; })[0]; if (fc2) { fc2.chem.tired = 1; bump(game, "faints"); tell(game, "😵 " + fc2.name + " " + FAINTS[cnt(game, "faints") % FAINTS.length] + ". it's fine. it's having a lie down."); } }
var hh = SB.Home && SB.Home.get ? SB.Home.get(game) : null;
if (hh && lucky(game, 0.15)) { var ds = DOORSTEP[bump(game, "doorstep") % DOORSTEP.length]; drop(game, ds[0], ds[1], hh.x + 1, hh.z + 1); tell(game, "🚪 something was left on your doorstep in the night: " + ds[2] + "."); }
featsCheck(game);
};
D.dusk2 = function (game) {
if (!game || !D.open(game)) return;
var x = X2(game), hm = home(game), top = topTier(game), at;
if (x.lanternDue && !D.sky(game)) { x.lanternDue = 0; D.startSky(game, "lanternnight"); }
else if (!D.sky(game) && x.skyNext && D.SKY_BY[x.skyNext].night && D.skyFits(game, D.SKY_BY[x.skyNext])) { D.startSky(game, x.skyNext); x.skyNext = null; }
if (D.placesOf(game, "watchfort").length && lucky(game, 0.5)) bump(game, "fortTurned");
else { D.roam(game, true); if (D.skyIs(game, "grumpmoon")) D.roam(game, true); }
D.autoWave(game, true);
feastCalendar(game, true);
clubsDusk(game); penDusk(game);
var gr = game.world.structures.filter(function (b) { return b.kind === "grave"; })[0];
if (gr && !D.placesOf(game, "ghostlight").length) { at = spotAt(game, gr.x, gr.z, 0.8, 1.6, Math.random, null) || { x: gr.x + 1, z: gr.z }; placeAdd(game, "ghostlight", at, { who: gr.name || (gr.data && (gr.data.name || gr.data.who)) || "an old friend" }); }
if (top >= 3 && D.walls(game) > 0 && lucky(game, 0.25) && D.beastsOut(game).length < D.cap(game)) { at = spotAt(game, hm.x, hm.z, 6, 9, Math.random, null); if (at) D.spawnBeast(game, "climber", at); }
if (top >= 3 && day(game) >= 6 && day(game) - (x.eyeDay || 0) >= 5 && lucky(game, 0.2) && !st(game).posts.some(function (p) { return p.kind === "beast" && D.BEAST_BY[p.bid].big; })) { x.eyeDay = day(game); at = spotAt(game, hm.x, hm.z, 14, 18, Math.random, null); if (at) D.spawnBeast(game, "nighteye", at); }
var ad = tribe(game).filter(function (c) { return c.stage >= 3 && !c._pov && !D.condOf(game, c); });
if (D.skyIs(game, "grumpmoon")) ad.slice(0, Math.min(3, Math.max(1, Math.floor(ad.length / 3)))).forEach(function (c) { D.addCond(game, c, "feral"); });
else if (ad.length >= 3 && lucky(game, 0.1)) D.addCond(game, ad[ad.length - 1], "sleepwalk");
tribe(game).forEach(function (c) { if (!c.dkQuirkTold) return; if (c.dkQuirk === "eats") h.looseFood(game, 2); else if (c.dkQuirk === "walks") D.addCond(game, c, "sleepwalk"); else tribe(game).forEach(function (o) { if (o.asleep && !o._pov) o.asleep = false; }); });
};
var raidOk0 = D.raidOk;
D.raidOk = function (game) { return raidOk0(game) && !(game.quests && game.quests.dark && game.quests.dark.x2 && game.quests.dark.x2.ends && game.quests.dark.x2.ends.den); };
var hooked2 = false;
D.hook2 = function () {
if (hooked2 || !SB.bus) return; hooked2 = true;
var on = SB.bus.on;
function G0(fn) { return function (d) { var g = h.cur(); if (g && !g.offline && D.open(g)) { try { fn(g, d || {}, X2(g)); } catch (e) { if (typeof console !== "undefined" && console.warn) console.warn("dark2:", e); } } }; }
on("dusk", G0(function (g) { D.dusk2(g); }));
on("dawn", G0(function (g) { D.dawn2(g); }));
on("grumpChased", G0(function (g, d, x) {
bump(g, "chased"); if (g.world.night) x.nightWon = 1;
if (d.g && d.g.dark === "wave" && x.wave) x.wave.chased++;
if (d.g && !d.g.boss && D.placesOf(g, "patch").length < 6 && lucky(g, 0.15)) placeAdd(g, "patch", { x: d.g.x, z: d.g.z }, {});
if (d.c && d.c._pov && bump(g, "chasedPov") % 12 === 0 && !st(g).posts.some(function (p) { return p.bid === "grudge"; })) { var at = spotAt(g, d.c.x, d.c.z, 9, 12, Math.random, null); if (at) D.spawnBeast(g, "grudge", at); }
}));
on("bountyDone", G0(function (g, d) { bump(g, "seals"); if (D.knack(g) === "pay" && d.c && d.pay) d.c.purse = r2((d.c.purse || 0) + Math.ceil(d.pay / 4)); }));
on("darkGift", G0(function (g) { bump(g, "gifts"); }));
on("darkNamedBeaten", G0(function (g, d) { if (d.how === "released") bump(g, "released"); else if (D.knack(g) === "trick" && d.c) d.c.purse = r2((d.c.purse || 0) + 4); }));
on("bossBeaten", G0(function (g, d, x) { bump(g, "bigGame"); x.lanternDue = 1; }));
on("darkBig", G0(function (g) { bump(g, "bigGame"); opine(g, "darkBig"); }));
on("darkBeastDone", G0(function (g, d, x) { if (d.won && g.world.night) x.nightWon = 1; }));
on("incidentEnd", G0(function (g, d, x) { var inc = d.inc; if (!inc) return; if (inc.id === "camp" && d.ok) bump(g, "regions"); if (inc.id === "raid") { if (d.ok) { bump(g, "routs"); x.nightWon = 1; } else bump(g, "wavesLost"); } }));
on("darkWave", G0(function (g, d, x) { if (d.medal) { bump(g, "routs"); x.nightWon = 1; if (d.def.id === "pillar" || (d.def.id === "fort" && d.medal >= 2)) bump(g, "regions"); } else bump(g, "wavesLost"); opine(g, "darkWave"); }));
on("darkFeast", G0(function (g) { opine(g, "darkFeast"); }));
on("darkSky", G0(function (g, d) { if (d.def && d.def.bad) opine(g, "darkSky"); }));
on("fish", G0(function (g, d) { bump(g, "fish"); if (d.c && D.skyIs(g, "grumpmoon") && lucky(g, 0.35)) { var at = spotAt(g, d.c.x, d.c.z, 3, 5, Math.random, null); if (at) { D.spawnBeast(g, "watergrump", at, { quiet: true }); psay("🌊 that is not a fish! a water grump is on your line"); } } }));
on("sneak", function (d) { sneaking = !!(d && d.on); });
["chop", "fightHit", "shot", "hit"].forEach(function (n) { on(n, G0(function (g, d, x) { if (!d.c || !d.c._pov) return; x.noise = Math.max(x.noise || 0, g.time + 4); if (n !== "chop") x.swingT = g.time + 1.5; })); });
on("chestOpened", G0(function (g, d, x) {
var c = d.c || me(); if (!c || topTier(g) < 2) return;
var keyed = g.world.night && Sv().has(c, "duskkey");
if (!keyed && !lucky(g, 0.08)) return;
var at = spotAt(g, c.x, c.z, 3, 5, Math.random, null); if (!at) return;
if (keyed) { Sv().take(c, "duskkey", 1); D.spawnBeast(g, "mimic", at, { k: 2, name: "the cache's keeper" }); bump(g, "keepers"); psay("🗝 the key turns by itself. the cache's keeper is coming"); }
else { D.spawnBeast(g, "mimic", at, { quiet: true }); psay("🧰 the next cache along just blinked at you"); }
}));
on("deepDig", G0(function (g, d) { if (d.c && lucky(g, 0.06)) D.spawnBeast(g, "beetles", { x: r1(d.c.x + 2), z: r1(d.c.z) }, { quiet: true }); }));
on("tantrum", G0(function (g, d, x) { if (!d.c) return; var p = x.places.filter(function (o) { return (o.kind === "rockpile" || o.kind === "tripwire") && SB.dist(o.x, o.z, d.c.x, d.c.z) < 6; })[0]; if (!p) return; bump(g, "knockedLoose"); if (p.kind === "rockpile") { p.n = 0; rename(g, p); } else placeEnd(g, p, true); }));
on("friendLevel", G0(function (g, d) { if (d.c && d.level) { var t = D.scene(g, d.c, d.level); if (t) psay(t); } }));
on("grow", G0(function (g, d) { if (d.c && d.c.stage === 3 && d.c.species === "smol" && !d.c.stranger) D.addWish(g, "rite", d.c); }));
on("death", G0(function (g, d) { if (d.c && d.c.dkLast) { tribe(g).forEach(function (o) { chem(o, { anger: -0.2, lonely: -0.2, fear: -0.2 }); }); bump(g, "softened"); if (SB.Game.note) SB.Game.note(g, "🕊 " + d.c.name + " had its last wish. the tribe grieves, but easier."); } }));
on("cured", G0(function (g, d) { if (d.c && d.c.dkCatch) { d.c.dkImm = d.c.dkCatch; d.c.dkCatch = 0; bump(g, "immune"); } }));
on("scoutHit", G0(function (g, d, x) { if (d.c && !d.c._pov && g.world.night && d.c.species === "smol" && !x.conds.some(function (e) { return e.id === "halfgrump"; }) && lucky(g, 0.05)) D.addCond(g, d.c, "halfgrump"); }));
on("respawn", G0(function (g, d) { if (d.c && lucky(g, 0.1) && D.addCond(g, d.c, "halfgrump")) psay("🌗 you woke up, but not all the way: a bit of the dark came back with you. a brew, or a rest at a well of light, will shift it"); }));
on("podOpened", G0(function (g) { if (lucky(g, 0.15)) D.addGuest(g, "podfolk"); }));
on("marketDay", G0(function (g) { scoutNotice(g, "market gossip"); bump(g, "rumours"); }));
on("darkRest", G0(function (g, d, x) {
if (!d.c) return;
if (D.endCond(g, d.c, true)) psay("🕯 the light takes the dark out of you. you are yourself again");
d.c.dkSore = 0;
var w = st(g).wells[d.id];
if (w && (D.hasBoon(g, "twice") || D.roomDone(g, 2)) && x.twiceDay !== day(g)) { x.twiceDay = day(g); w.last = 0; }
}));
on("darkTheft", G0(function (g) { if (D.rule(g, "drum")) { tribe(g).forEach(function (c) { if (c.asleep && !c._pov) c.asleep = false; }); bump(g, "drummed"); } }));
on("weather", G0(function (g, d) { if (d.kind === "storm" && topTier(g) >= 2 && lucky(g, 0.3) && D.beastsOut(g).length < D.cap(g)) { var hm = home(g), at = spotAt(g, hm.x, hm.z, 16, 28, Math.random, null); if (at) D.spawnBeast(g, "sprite", at, { quiet: true }); } }));
on("darkPlaceUsed", G0(function (g, d, x) { if (d.p && d.p.kind === "tideline" && !x.did.socks && d.c) { x.did.socks = day(g); give(g, d.c, "socks", 1); psay("🧦 and, tangled in the weed: somebody's lucky socks"); } }));
};
function opine(game, ev) { var x = X2(game), p = x.pal2 != null ? SB.Game.byId(game, x.pal2) : null, c = me(); if (!p || !p.alive || !c || game.time < (x.opT || 0) || SB.dist(p.x, p.z, c.x, c.z) > 30) return; x.opT = game.time + 120; bump(game, "opinions"); psay("🧣 " + p.name + ": " + OPIN[ev]); }
D.hook2();
D.optionsHook2 = function (game, c, r, o, x) {
if (!D.open(game)) return;
var ref = r && r.ref, X = X2(game), p, t, hk = x.hk;
function free(slot) { return !o[slot] || o[slot].locked || /^put down/.test(o[slot].label || ""); }
function act(labelText, fn, snd) { return x.op(labelText, function () { var rr = fn(); if (rr && rr.msg) x.say(rr.msg); if (rr && rr.ok) x.audio(snd || "craft", 0.8); return !!(rr && rr.ok); }, null); }
if (r && r.type === "struct" && ref && ref.kind === "darkmark" && (p = placeById(game, +String(ref.data && ref.data.dk).replace("pl-", "")))) {
var a = D.placeLabel(game, p, false), b = D.placeLabel(game, p, true);
if (a) o.use = act(a, function () { return D.placeAct(game, c, p, false); });
o.place = b ? act(b, function () { return D.placeAct(game, c, p, true); }) : o.use;
} else if (r && r.type === "struct" && ref && ref.kind === "farm" && X.sky && X.sky.id === "blight" && X.sky.farms && X.sky.farms.indexOf(ref.id) >= 0) {
o.use = act("cut out the blight", function () { return D.cutBlight(game, c, ref); });
} else if (r && r.type === "struct" && ref && ref.kind === "noticeboard" && X.did.bell && (X.wave || (game.dir && game.dir.active && game.dir.active.id === "raid"))) {
o.place = act("ring the village bell (everyone indoors)", function () { return D.ringBell(game); }, "chime");
} else if (r && r.type === "creature" && ref && ref.species === "grump" && ref.dark && (t = D.postOf(game, ref.dark))) {
t.look = game.time;
if (!o.pick && D.hp(game, t.key) <= 0.5 && Sv().has(c, "vine") && (t.kind === "named" || (t.kind === "beast" && !D.BEAST_BY[t.bid].big))) o.pick = act("catch " + t.name + " (1 vine)", function () { return D.capture(game, c, ref); }, "achievement");
} else if (r && r.type === "creature" && ref && ref.species === "smol" && !ref.stranger && ref !== c) {
if (!X.met[ref.id]) { X.met[ref.id] = 1; var need = Math.max(3, tribe(game).length - 1); if (!X.did.intro && metCount(X) >= need) { X.did.intro = day(game); sparks(game, 5, c); x.say("👋 that's everybody: you have said hello to the whole tribe. +5 ✨"); } }
var e = D.condOf(game, ref);
if (e) o.place = act(D.CONDS[e.id].cure.label + " (" + ref.name + " is " + D.CONDS[e.id].name + ")", function () { return D.cure(game, c, ref); }, "chime"); // instead of the hug: this matters more
}
if (hk === "book" && free("place")) o.place = act("read the book", function () { return D.readBook(game, c); }, "chime");
if (hk === "tripwire" && free("place")) o.place = act("set the tripwire here", function () { Sv().take(c, "tripwire", 1); placeAdd(game, "tripwire", { x: c.x, z: c.z }, {}); return { ok: true, msg: "🪢 set. the first grump through here is in for a surprise" }; }, "build");
if (hk === "taunt" && free("place")) o.place = act("beat the taunt drum (calls the wave night)", function () { return D.startWave(game, game.world.season === 3 ? "frostnight" : "wavenight", null, c); }, "grump");
if (hk === "darkidol" && free("place")) o.place = act("set the dark idol down (something will answer)", function () { if (st(game).posts.some(function (q) { return q.kind === "beast" && D.BEAST_BY[q.bid].big; })) return { ok: false, msg: "one big thing at a time" }; Sv().take(c, "darkidol", 1); D.spawnBeast(game, "builtone", spotAt(game, c.x, c.z, 7, 10, Math.random, null) || { x: c.x + 7, z: c.z }); return { ok: true, msg: "☠️ it answers" }; }, "grump");
if (hk === "starchart" && free("place")) o.place = act("read the ark's star chart", function () { return D.readChart(game, c); }, "eureka");
if (hk === "glowbait" && free("place")) o.place = act("fish with the glow bait", function () { return D.call(game, c, "seaduke"); }, "grump");
if (hk && D.QUEST[hk] && o.place && /^put down/.test(o.place.label || "")) o.place = x.no("you'd better keep this");
};
D.cutBlight = function (game, c, b) { var X = X2(game), s = X.sky; if (!s || s.id !== "blight" || !s.farms || s.farms.indexOf(b.id) < 0) return { ok: false, msg: "" }; if (SB.dist(c.x, c.z, b.x, b.z) > 6) return { ok: false, msg: "get closer" }; s.farms = s.farms.filter(function (id) { return id !== b.id; }); if (b.data) b.data.grow = 0; bump(game, "blightCut"); if (!s.farms.length) { s.until = 0; sparks(game, 3, c); } return { ok: true, msg: "🍂 you pull the whole bed and burn it. " + (s.farms.length ? s.farms.length + " more farms have it" : "that was the last of the blight. +3 ✨") }; };
D.damageHook2 = function (game) { return D.knack(game) === "hard" ? 1.1 : 1; };
D.goalsHook2 = function (game, add) {
if (!D.open(game) || !game.quests || !game.quests.dark || !game.quests.dark.x2) return;
var x = X2(game), n = 0;
if (x.wave) { var wd = D.WAVE_BY[x.wave.id]; add(wd.icon + " " + wd.name + ": chase them off", x.wave.chased + "/" + x.wave.total, false, true); }
if (x.feast) { var T = D.feastTasks(game); add(D.FEAST_BY[x.feast.id].icon + " " + x.feast.name, T.filter(function (t) { return t.done; }).length + "/" + T.length, false, false); }
D.linesOn(game).forEach(function (L) { if (n >= 2) return; var l = x.lines[L.id], hint = D.lineHint(game, L.id); add(L.icon + " " + L.name + ": " + L.steps[l.step][1] + (hint ? " (" + hint + ")" : ""), (l.step + 1) + "/" + L.steps.length, false, false); n++; });
if (x.guests.length && !x.guests[0].keep) add(D.GUEST_BY[x.guests[0].id].icon + " " + D.GUEST_BY[x.guests[0].id].name + " is at the village (see your notices)", "", false, !!D.GUEST_BY[x.guests[0].id].loud);
if (!x.did.intro && day(game) <= 4 && tribe(game).length >= 4) add("👋 say hello to every smol in the tribe (look at each one, in a body)", metCount(x) + "/" + Math.max(3, tribe(game).length - 1), false, false);
};
D.vitalsHook2 = function (game, c) {
if (!D.open(game) || !game.quests || !game.quests.dark || !game.quests.dark.x2) return null;
var x = X2(game), out = [], s = D.sky(game), e = c ? D.condOf(game, c) : null, ring = c ? D.danger(game, c.x, c.z) : 0;
if (s) out.push({ icon: D.SKY_BY[s.id].icon, text: D.SKY_BY[s.id].name, bad: !!D.SKY_BY[s.id].bad, tip: D.SKY_BY[s.id].line });
if (x.wave) out.push({ icon: D.WAVE_BY[x.wave.id].icon, text: "wave " + (x.wave.i + 1) + "/" + D.WAVE_BY[x.wave.id].sizes.length, bad: true });
if (x.feast) out.push({ icon: D.FEAST_BY[x.feast.id].icon, text: x.feast.name });
if (c && c.dkSore && game.time < c.dkSore) out.push({ icon: "🩹", text: "sore", bad: true, tip: "your hearts won't fill all the way for a while. a well of light mends it" });
if (e) out.push({ icon: D.CONDS[e.id].icon, text: D.CONDS[e.id].name, bad: true, tip: D.CONDS[e.id].line });
if (ring >= 2) out.push({ icon: "☠️", text: "danger " + ring, bad: ring >= 3, tip: "this far from the nest, beasts are tougher and leave more behind" });
return out;
};
function btn(verb, text, off, go) { return "<button class='btn" + (go ? " go" : "") + "' data-d2='" + verb + "'" + (off ? " disabled" : "") + ">" + esc(text) + "</button>"; }
function row(icon, title, small, buttons) { return "<div class='rc'><span class='big'>" + icon + "</span><div class='t'>" + esc(title) + (small ? "<small>" + esc(small) + "</small>" : "") + "</div>" + (buttons || "") + "</div>"; }
D.html2 = function (game, c, icon) {
var x = X2(game), out = "", s = D.sky(game), atV = D.atVillage(game, c), here = D.placeNear(game, c, 6), i;
out += "<div class='lbl'>today</div><p class='help'>🍀 " + esc(D.luckLine(game)) + " · " + (s ? D.SKY_BY[s.id].icon + " " + esc(D.SKY_BY[s.id].name) : "a clear sky") + " · 🐾 beasts about: " + D.beastsOut(game).length + " of " + D.cap(game) + " · ☠️ danger here: " + D.danger(game, c.x, c.z) + " of 4" + (D.banners(game) ? " · 🚩 " + D.banners(game) + " banners (raiders come " + D.banners(game) * 6 + "% softer)" : "") + "</p>";
out += "<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>" + btn("stars", "🔭 read the stars", !D.starsOk(game, c)) + (D.signalOk(game, c) && x.sigDay !== day(game) ? btn("signal:0", "📡 signal: any news?") + btn("signal:1", "📡 signal: send help") + btn("signal:2", "📡 signal: anyone out there?") : btn("signal", "📡 the far signal", true)) + (s ? "" : btn("sing", "🎶 a lullaby (5 ✨)", (game.sparks || 0) < 5)) + (D.hasBoon(game, "word") ? btn("word", "🗣 say the word", x.wordDay === day(game)) : "") + (day(game) <= 2 && !x.pal ? D.pals(game).map(function (p) { return btn("pal:" + p.id, "🧡 walk with " + p.name); }).join("") : "") + "</div>";
if (here) { var la = D.placeLabel(game, here, false), lb = D.placeLabel(game, here, true); out += "<div class='lbl'>right here</div><div class='rlist'>" + row(D.PLACE[here.kind].icon, placeName(here), "", (la ? btn("here", la, false, true) : "") + (lb ? btn("hereb", lb) : "")) + "</div>"; }
if (x.wave) { var wd = D.WAVE_BY[x.wave.id]; out += "<div class='lbl'>" + wd.icon + " " + esc(wd.name) + "</div><p class='help'>wave " + (x.wave.i + 1) + " of " + wd.sizes.length + " · " + x.wave.chased + " of " + x.wave.total + " chased off" + (x.did.bell ? "" : "") + "</p>"; }
if (x.feast) {
var fd = D.FEAST_BY[x.feast.id];
out += "<div class='lbl'>" + fd.icon + " " + esc(x.feast.name) + "</div><div class='rlist'>";
D.feastTasks(game).forEach(function (t) { out += row(t.done ? "✅" : "▫️", t.text, t.have + " of " + t.n, ""); });
out += "</div><div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>" + btn("ffood", "🍲 add food", !h.foodSlot(c)) + (x.feast.trad ? btn("trad", "🎉 join in", !!x.feast.joined) : "") + (x.feast.toastNeed ? btn("toast", "🥂 a toast", !!x.feast.toast) : "") + btn("show", "🎪 enter what you hold", !!x.feast.show);
D.GAMES.forEach(function (g) { out += btn("play:" + g.id, g.icon + " " + g.name, !!x.feast.played[g.id]); });
if (fd.id === "desert") tribe(game).slice().sort(function (a, b) { return a.stage - b.stage; }).slice(0, 3).forEach(function (o, j) { out += btn("bet:" + j, "🏁 bet on " + o.name, !!x.feast.bet); });
out += "</div>";
}
if (x.guests.length) { out += "<div class='lbl'>visitors" + (atV ? "" : " · they are at the village") + "</div><div class='rlist'>"; x.guests.forEach(function (g) { var d = D.GUEST_BY[g.id]; out += row(d.icon, d.name, D.guestLine(game, g) + (g.keep ? " (staying until day " + g.until + ")" : ""), g.keep ? "" : btn("guest:" + g.id, d.a.label + (d.a.need ? " (" + costText(d.a.need) + ")" : ""), !atV, true) + btn("guestb:" + g.id, d.b.label, !atV)); }); out += "</div>"; }
if (x.wishes.length) { out += "<div class='lbl'>wishes</div><div class='rlist'>"; x.wishes.forEach(function (w, j) { out += row(D.WISHES[w.wid].icon, D.wishText(game, w), "", btn("grant:" + j, D.WISHES[w.wid].walk ? "send it off" : D.WISHES[w.wid].fetch ? "fetch" : "grant", false, true)); }); out += "</div>"; }
var on = D.linesOn(game);
if (on.length || x.order) {
out += "<div class='lbl'>stories</div><div class='rlist'>";
on.forEach(function (L) {
var l = x.lines[L.id], st4 = L.steps[l.step], hint = D.lineHint(game, L.id), b = "";
if (st4[0] === "bring") b = btn("hand:" + L.id, "hand over " + costText(st4[2]), !hasAll(c, st4[2]), true);
if (st4[0] === "pick") st4[2].forEach(function (o, j) { b += btn("pick:" + L.id + ":" + j, o[0]); });
if (st4[0] === "wave") b = btn("lwave:" + L.id, "begin", !!x.wave, true);
out += row(L.icon, L.name + " · " + (l.step + 1) + " of " + L.steps.length, st4[1] + (hint ? " · " + hint : ""), b);
});
var od = D.order(game);
if (od) out += row(od.icon, od.t, "until day " + x.order.until + " · " + od.does, btn("order", "hand in", !atV || !hasAll(c, od.need), true));
out += "</div>";
}
var e = D.condOf(game, c);
out += "<p class='help'>" + esc(D.before(c)) + "." + (e ? " " + D.CONDS[e.id].icon + " you are " + esc(D.CONDS[e.id].name) + ": " + esc(D.CONDS[e.id].line) + "." : "") + "</p>";
out += "<details><summary>🎉 throw a gathering</summary><div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
D.FEASTS.forEach(function (d) { if (d.call) out += btn("feast:" + d.id, d.icon + " " + d.name, !!D.feastWhy(game, c, d.id)); });
out += "</div><p class='help'>medals so far: " + cnt(game, "feasts") + " gatherings, " + cnt(game, "gold") + " gold. tickets: " + (x.tickets || 0) + ".</p></details>";
out += "<details><summary>🏆 the big ones</summary><div class='rlist'>";
D.BIGS.forEach(function (d) { if (!d.call || (d.ng && !(game.ngPlus > 0))) return; var why = D.callWhy(game, c, d.id); out += row(d.icon, d.name + (x.big[d.id] ? " ✓" : ""), "it " + d.twist + ". wants " + costText(d.call) + (why ? " · " + why : ""), btn("call:" + d.id, "call it", !!why)); });
out += "</div><p class='help'>others are woken, not called: a bulb in the jungle, a great hive, a sealed ruin, a bug nest, the wreck's warden, a gate.</p><div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
D.WAVES.forEach(function (d) { if (d.call) out += btn("wave:" + d.id, d.icon + " " + d.name + " (" + costText(d.call) + ")", !!D.waveWhy(game, d.id, c)); });
out += "</div></details>";
out += "<details><summary>🗳 the council, the watch, clubs</summary><div class='rlist'>";
D.RULES.forEach(function (R) { out += row(R.icon, R.name + (x.rules[R.id] ? " · in force" : ""), R.does, btn("vote:" + R.id, x.rules[R.id] ? "vote to drop it" : "put it to a vote", x.voteDay === day(game))); });
var rk = D.watchRank(game), nx = D.RANKS[rk + 1], nearby = tribe(game).filter(function (o) { return o !== c && o.stage >= 3 && SB.dist(o.x, o.z, c.x, c.z) < 8; }).slice(0, 3), asks = "";
nearby.forEach(function (o) { if (x.watch.indexOf(o.id) < 0) asks += btn("watch:" + o.id, "🛡 ask " + o.name + " into the watch"); if (x.clubs.length && !x.clubs.some(function (q) { return q.members.indexOf(o.id) >= 0; })) asks += btn("clubin:" + o.id, "🪧 ask " + o.name + " into " + x.clubs[0].name); });
out += row("🛡", "the night watch: you are " + D.RANKS[rk][1], cnt(game, "nights") + " nights defended, " + D.watchMembers(game) + " in the watch" + (nx ? " · next: " + nx[1] + " at " + nx[0] + " nights and " + nx[2] + " in the watch" : "") + ". stand by a grown smol to ask it in", "");
for (var ck in D.CIRCLES) out += row(D.CIRCLES[ck].icon, D.CIRCLES[ck].name + " · standing " + D.circleStanding(game, ck), "they say " + D.CIRCLES[ck].hello + " and like " + label(D.CIRCLES[ck].likes) + ". grant their wishes to stand well with them", "");
x.clubs.forEach(function (cl) { out += row("🪧", cl.name + " · " + cl.members.length + " members", "they meet at dusk for " + cl.pastime, ""); });
x.pen.forEach(function (pe, j) { out += row(pe.tame ? "🧡" : "🪢", pe.name + (pe.tame ? ", tame" : ", in the pen"), pe.tame ? "it guards the village" : "fed " + pe.fed + " of 3. keep a fire lit at night or it breaks out", pe.tame ? "" : btn("feed:" + j, "feed it", !atV || !h.foodSlot(c) || pe.fedDay === day(game))); });
D.holds(game).forEach(function (H) { out += row("🏘", H.name + " · led by " + H.leader, "they greet you “" + H.hello + "”, love " + label(H.food) + ", and " + H.grudge + ". custom: " + H.custom, ""); });
var dy = D.dynasty(game); if (dy) out += row("👑", dy.name + " · standing " + dy.standing, dy.n + " of the line living. its chief is " + dy.chief, "");
out += "</div><div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>" + asks + btn("club", "🪧 start a club", x.clubs.length >= 2) + btn("tour", "🥾 send two off on a walk", !!x.tour) + btn("write", "📕 write a book", x.wroteDay === day(game)) + btn("bell", "🔔 ring the bell", !x.did.bell || !atV) + (Sv().has(c, "socks") ? btn("socks", "🧦 hand the socks back", !atV) : "") + btn("payitem", "pay me in things", st(game).board.pay === "item") + "</div></details>";
out += "<details><summary>🧵 things to make</summary><div class='rlist'>";
D.MAKES.forEach(function (m) { var why = D.makeWhy(game, c, m.id); out += row(m.emoji || K[m.id].emoji, m.label || label(m.id), (m.desc || K[m.id].desc) + " · " + costText(m.cost) + (why && why.indexOf("it takes") !== 0 ? " · " + why : ""), btn("make:" + m.id, "make", !!why)); });
out += "</div></details>";
if (x.boons.length) { out += "<details><summary>✨ boons and knacks</summary><div class='rlist'>"; x.boons.forEach(function (id) { var B0 = D.BOONS[id]; out += row(B0[0], B0[1] + (B0[3] ? (x.knack === id ? " · your knack" : " · a knack") : ""), B0[2], B0[3] && x.knack !== id ? btn("knack:" + id, "use this one") : ""); }); out += "</div></details>"; }
var sc = D.score(game), pf = D.perfect(game), ends = Object.keys(x.ends);
out += "<details><summary>🕯 how the island is doing · " + pf.pct + "%</summary><div class='rlist'>";
sc.parts.forEach(function (p) { out += row(p.ok ? "✅" : "▫️", p.text, "", ""); });
D.FEATS.forEach(function (f) { out += row(x.feats[f.id] ? "🏆" : "▫️", f.name, "+" + f.sparks + " ✨", ""); });
out += "</div><p class='help'>" + sc.pts + " of " + sc.of + (x.score ? " · the Lantern's best: " + x.score.flames + " flames" : "") + " · endings found: " + ends.length + " of " + Object.keys(D.ENDS).length + (ends.length ? " (" + esc(ends.map(function (k) { return D.ENDS[k]; }).join(", ")) + ")" : "") + " · " + pf.have + " of " + pf.of + " things seen and done</p><div class='row'>" + btn("judge", "🕯 ask the Lantern to score the island", !D.yearOne(game)) + "</div><p class='help'>" + D.credits(game).map(esc).join("<br>") + "</p></details>";
return out;
};
D.do2 = function (game, c, verb, a, b) {
var x = X2(game), here = D.placeNear(game, c, 6);
switch (verb) {
case "stars": return D.readStars(game, c);
case "signal": return D.signal(game, c, a == null ? null : +a);
case "sing": return D.sing(game);
case "word": return D.sayWord(game, c);
case "pal": return D.setPal(game, +a);
case "here": return here ? D.placeAct(game, c, here, false) : { ok: false, msg: "" };
case "hereb": return here ? D.placeAct(game, c, here, true) : { ok: false, msg: "" };
case "ffood": return D.feastFood(game, c);
case "trad": return D.feastJoin(game, c);
case "toast": return D.feastToast(game, c);
case "show": return D.show(game, c);
case "play": return D.play(game, c, a);
case "bet": return D.race(game, c, +a);
case "guest": return D.guestAct(game, c, a, false);
case "guestb": return D.guestAct(game, c, a, true);
case "grant": return D.grant(game, c, +a);
case "hand": return D.lineHand(game, c, a);
case "pick": return D.linePick(game, c, a, +b);
case "lwave": return D.lineWave(game, c, a);
case "order": return D.orderHand(game, c);
case "feast": return D.startFeast(game, a, c);
case "call": return D.call(game, c, a);
case "wave": return D.startWave(game, a, null, c);
case "vote": return D.vote(game, a);
case "club": return D.newClub(game, c);
case "watch": return D.joinWatch(game, c, SB.Game.byId(game, +a));
case "clubin": return SB.Game.byId(game, +a) ? D.joinClub(game, SB.Game.byId(game, +a)) : { ok: false, msg: "" };
case "tour": return D.tour(game);
case "write": return D.write(game, c);
case "bell": return D.ringBell(game);
case "feed": return D.feedPen(game, c, +a);
case "make": return D.make(game, c, a);
case "knack": return D.setKnack(game, a) ? { ok: true, msg: D.BOONS[a][0] + " your knack is " + D.BOONS[a][1] + ": " + D.BOONS[a][2] } : { ok: false, msg: "" };
case "judge": return D.judge(game, c);
case "payitem": D.setPay(game, "item"); return { ok: true, msg: "the council will pay you in useful things" };
case "socks": if (!Sv().has(c, "socks") || !D.atVillage(game, c)) return { ok: false, msg: "" }; Sv().take(c, "socks", 1); sparks(game, 4, c); bump(game, "socksBack"); return { ok: true, msg: "🧦 the leader goes pink, snatches them, and says nothing at all. +4 ✨" };
}
return { ok: false, msg: "" };
};
D.wire2 = function (root, game, c, redraw, say) {
root.querySelectorAll("[data-d2]").forEach(function (b) {
b.addEventListener("click", function () {
var v = String(b.getAttribute("data-d2")).split(":"), r = D.do2(game, c, v[0], v[1], v[2]);
if (r && r.msg && say) say(r.msg);
if (r && r.ok && SB.Audio && SB.Audio.play) SB.Audio.play("craft");
redraw();
});
});
};
var XT = SB.Ext;
if (XT && XT.on) { XT.on("tick", D.tick2); XT.on("options", D.optionsHook2); XT.on("damage", D.damageHook2); XT.on("goals", D.goalsHook2); XT.on("vitals", D.vitalsHook2); }
var ME2 = SB.Meshes || SB.ME;
function mark() {
var b = ME2.builder();
b.color(0x4a4458).push().translate(0, 0.08, 0).box(0.6, 0.16, 0.6).pop();
b.color(0x3a3448).push().translate(0, 0.5, 0).box(0.26, 0.7, 0.26).pop();
b.color(0xfff2a0).push().translate(0, 0.92, 0).box(0.16, 0.14, 0.16).pop();
return b.finish();
}
if (ME2 && ME2.STRUCT_BUILDERS && ME2.builder) { try { ME2.STRUCT_BUILDERS.darkmark = mark; } catch (e) {} }
})();
