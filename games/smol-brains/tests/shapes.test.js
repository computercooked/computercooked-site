// A shape for every thing (shapes.js): every kind without a hand-made model gets a shape that says what it is,
// every shape builds without throwing, and the obvious ones land where you would expect.
// node games/smol-brains/tests/shapes.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra != null && extra !== "" ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const dir = path.join(__dirname, "..", "play", "js"), js = f => fs.readFileSync(path.join(dir, f), "utf8");
const html = fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8");
const order = (html.match(/src="js\/([a-z0-9-]+)\.js"/g) || []).map(s => s.slice(8, -4));
const ctx = load();
// a stand-in builder: every call returns itself and is counted. the systems that bring their own models (animals,
// harvest, town...) only register them when a builder exists, so give them this one
function fake() { const calls = {}; const p = new Proxy({}, { get: (t, name) => name === "calls" ? calls : function () { calls[name] = (calls[name] || 0) + 1; return p; } }); return p; }
ctx.SB.Meshes = { builder: fake, STRUCT_BUILDERS: {}, NODE_BUILDERS: {}, itemMesh: () => "BASE" };
const want = ["ext", "bosses", "body", "possess", "home", "loot", "friends", "town", "dark", "powers", "fight", "deep", "harvest", "animals", "qol", "wear", "shapes"];
order.filter(n => want.indexOf(n) >= 0).forEach(n => { if (n === "bosses" && ctx.SB.Bosses) return; vm.runInContext(js(n + ".js"), ctx, { filename: n + ".js" }); });
const SB = ctx.SB, ME = SB.Meshes, K = SB.KINDS, src = js("meshes.js");
check("meshes.js asks shapes.js before it falls back to a ball", /default: if \(!\(ME\.generic && ME\.generic\(kind, k, b\)\)\)/.test(src));
check("shapes.js loads after meshes.js", order.indexOf("shapes") === order.indexOf("meshes") + 1);
const names = Object.keys(ME.SHAPES), threw = [];
names.forEach(n => { try { const b = fake(); ME.SHAPES[n](b, 0x88aa66, { long: 1, glow: 1, fuse: 1, flower: 0xff0000, fleck: 0xffffff, spines: 1, band: 0x333333, wide: 1 }); ME.SHAPES[n](fake(), 0x88aa66, null); if (!(b.calls.push > 0) || b.calls.push !== b.calls.pop) threw.push(n + " push/pop " + b.calls.push + "/" + b.calls.pop); } catch (e) { threw.push(n + ": " + e.message); } });
check("all " + names.length + " shapes build, with and without options, and balance every push with a pop", names.length >= 60 && !threw.length, threw.slice(0, 5).join(" · "));
const own = Object.keys(K).filter(k => src.indexOf('case "' + k + '"') >= 0), rest = Object.keys(K).filter(k => own.indexOf(k) < 0 && ME.itemMesh(k) === "BASE");
const got = {}, none = [];
rest.forEach(k => { const s = ME.shapeOf(k); if (!s || !ME.SHAPES[s[0]]) none.push(k); else (got[s[0]] = got[s[0]] || []).push(k); });
check("every one of the " + rest.length + " kinds without its own model gets a shape", !none.length, none.slice(0, 8).join(" "));
const peb = got.pebble || [];
console.log("  (" + Object.keys(got).length + " shapes in use; still a pebble: " + peb.length + ": " + peb.join(" ") + ")");
check("hardly any is still a plain pebble", peb.length <= 12, peb.length + " of " + rest.length);
const is = (k, s) => K[k] && ME.shapeOf(k)[0] === s;
const exp = { furhat: "hat", strawhat: "hat", copperhat: "helm", guardhelm: "helm", furgreaves: "boots", furboots: "boots", mosscloak: "cloak", spinecloak: "cloak", coppervest: "vest", bow: "bow", crossbow: "bow", arrow: "arrow", firearrow: "arrow", sword: "blade", crystalblade: "blade", ironpick: "pick", hoe: "hoe", ironaxe: "axe", maul: "maul", shield: "shield", finerod: "rod", staff: "staff", thunderpot: "jar", firepot: "jar", dye_red: "dye", tonic_pep: "bottle", mead: "bottle", cider: "mug", stew: "bowl", fishstew: "bowl", honeycake: "cake", cheese: "wedge", trout: "fish", puffer: "fish", s_grain: "seeds", sapling: "sprout", trophy_chain: "trophy", mapscrap: "scroll", tablet: "slab", book: "book", warhorn: "horn", flute: "flute", drum: "drum", paperlantern: "lantern", candle: "candle", duskkey: "key", pearl: "pearl", cutgem: "gem", ironore: "lump", plank: "planks", iron: "bar", cluckegg: "egg", doll: "figure", goldring: "ring", charm_chop: "charm", glasses: "glasses", tooth: "tooth", vinerope: "rope", pack: "pack", mote: "wisp" };
const wrong = Object.keys(exp).filter(k => K[k] && !is(k, exp[k])).map(k => k + "=" + ME.shapeOf(k)[0] + " not " + exp[k]), absent = Object.keys(exp).filter(k => !K[k]);
check("the obvious ones are what they look like (" + (Object.keys(exp).length - absent.length) + " checked)", !wrong.length && absent.length < 6, wrong.slice(0, 8).join(" · ") + (absent.length ? " absent: " + absent.join(" ") : ""));
const fake2 = fake();
check("ME.generic builds one and says so; an unknown kind is left to the caller", ME.generic("furhat", K.furhat, fake2) === true && fake2.calls.color > 0 && ME.shapeOf("no_such_thing") === null);
console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
