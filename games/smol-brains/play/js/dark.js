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
function postDef(p) { return p.kind === "named" ? D.NAMED_BY[p.nid] : p.kind === "siege" ? SIEGER : SCOUTG; }
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
if (mine && P.scout && !P.scout() && P.adoptScout && mine.tier >= 1 && SB.dist(mine.x, mine.z, p.x, p.z) < D.AGGRO && game.time >= (p.rest || 0) && mine.chem.health >= D.FIT) {
g.scout.who = mine.id; g.scout.hits = 0;
if (P.adoptScout(g, { keep: true })) { p.calls = 0; p.duelT = game.time; emit("darkDuel", { post: p, c: mine, g: g }); if (P.say) P.say((def.icon || "👹") + " " + p.name + " comes for you! hit it between pounces" + (p.kind === "named" ? ". it " + def.twist : "")); }
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
if (b.pay === "shells" && c && c.alive) { c.purse = r2((c.purse || 0) + pay); e.paid = pay + " shells"; }
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
D.setPay = function (game, how) { st(game).board.pay = how === "sparks" ? "sparks" : "shells"; };
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
var rk = D.rank(game, f.id), h = D.hearts(game, f.id), hs = "", can = spots.filter(function (o) { return o.id === f.id; })[0];
for (var i = 1; i <= 5; i++) hs += i <= h ? "♥" : "♡";
out += "<div class='rc'><span class='big'>" + f.icon + "</span><div class='t'>" + esc(f.name) + " · " + hs + " " + esc(rk.key) + "<small>" + esc(rk.does) + "</small></div>" + (can ? "<button class='btn' data-dkgift='" + f.id + "' " + (foodSlot(c) ? "" : "disabled") + ">leave a gift</button>" : "") + "</div>";
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
return out;
};
D.wire = function (root, game, c, redraw, say) {
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
