// 4.21: brain surgery. rewrite a smol's instincts and what it cares about; its net is retrained and its kids inherit it.
// node games/smol-brains/tests/surgery.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const ctx = load();
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "play", "js", "surgery.js"), "utf8"), ctx, { filename: "surgery.js" });
const SB = ctx.SB, S = SB.Surgery;
const game = SB.Game.newGame(421); SB.Game.current = game; game.headless = true;
const T = game.world.T.spawn;
const c = SB.Game.spawnSmol(game, { x: T.x, z: T.z, age: SB.DAY_LENGTH * 2 });
c.genome.instincts = c.genome.instincts.slice(0, 4);
game.sparks = 100;

console.log("1. reading its instincts");
const L = S.list(c);
check("each instinct reads as a sentence", L.length === c.genome.instincts.length && /^when .+ and it sees .+ → /.test(L[0].text), L[0] && L[0].text);
check("strongest first", L.every((x, i) => i === 0 || L[i - 1].s >= x.s));
check("and says how the net treats it right now", ["does it", "sometimes", "rarely"].indexOf(S.pull(c, L[0])) >= 0);

console.log("2. adding one rewires the net");
const add = { kind: "add", drive: SB.D.fear, noun: SB.N.bug, verb: SB.V.cuddle };
const q0 = S.q(c, add), sp0 = game.sparks;
const r = S.operate(game, c, add);
check("the operation works and costs sparks", r.ok && game.sparks === sp0 - S.cost(game), r.why || r.msg);
check("the instinct is in its genome", c.genome.instincts.some(x => x.drive === add.drive && x.noun === add.noun && x.verb === add.verb && x.s === 0.6));
check("and its net leans toward it now", S.q(c, add) > q0 + 0.05, q0.toFixed(3) + " → " + S.q(c, add).toFixed(3));
check("the same one twice is refused", !S.operate(game, c, add).ok);
check("an action its tier can't do is refused", c.tier < 4 ? !S.operate(game, c, { kind: "add", drive: 0, noun: 3, verb: SB.V.build }).ok : true);

console.log("3. stronger, weaker, cut");
const i = c.genome.instincts.findIndex(x => x.verb === add.verb && x.noun === add.noun && x.drive === add.drive);
check("stronger adds 20%", S.operate(game, c, { kind: "up", i }).ok && Math.abs(c.genome.instincts[i].s - 0.8) < 1e-9);
check("weaker takes 20% off", S.operate(game, c, { kind: "down", i }).ok && Math.abs(c.genome.instincts[i].s - 0.6) < 1e-9);
check("three a day, then it has to sleep it off", S.left(game, c) === 0 && /enough for today/.test(S.why(game, c)) && !S.operate(game, c, { kind: "cut", i }).ok);
game.time += SB.DAY_LENGTH;
const qa = S.q(c, add), n1 = c.genome.instincts.length;
check("a new day: cutting it out removes it", S.operate(game, c, { kind: "cut", i }).ok && c.genome.instincts.length === n1 - 1);
check("and the net lets go of it", S.q(c, add) < qa - 0.05, qa.toFixed(3) + " → " + S.q(c, add).toFixed(3));

console.log("4. what it cares about");
const w0 = c.genome.driveW[SB.D.lonely];
check("care more raises the drive's weight", S.operate(game, c, { kind: "care", drive: SB.D.lonely, dir: 1 }).ok && Math.abs(c.genome.driveW[SB.D.lonely] - Math.min(1.9, Math.round((w0 + 0.25) * 100) / 100)) < 1e-9);
c.genome.driveW[SB.D.hot] = 0.3;
check("not past the floor", !S.operate(game, c, { kind: "care", drive: SB.D.hot, dir: -1 }).ok);

console.log("5. it sticks, and its kids get it");
game.time += SB.DAY_LENGTH;
const add2 = { kind: "add", drive: SB.D.bored, noun: SB.N.stone, verb: SB.V.play };
check("one more", S.operate(game, c, add2).ok);
const back = SB.Save.revive(JSON.parse(JSON.stringify(SB.Save.snapshot(game))));
const c2 = back.creatures.find(x => x.id === c.id);
check("the edited instincts and weights survive a save", c2 && c2.genome.instincts.some(x => x.drive === add2.drive && x.noun === add2.noun && x.verb === add2.verb) && Math.abs(c2.genome.driveW[SB.D.lonely] - c.genome.driveW[SB.D.lonely]) < 0.01);
check("so does the day's count", c2 && c2.surg && c2.surg.n === 1 && c2.surg.total === 6, JSON.stringify(c2 && c2.surg));
const mate = SB.Game.spawnSmol(game, { x: T.x + 1, z: T.z });
let got = 0; for (let k = 0; k < 20; k++) { const kid = SB.Genome.cross(c.genome, mate.genome, SB.rng(k + 1)); if (kid.instincts.some(x => x.drive === add2.drive && x.noun === add2.noun && x.verb === add2.verb)) got++; }
check("kids inherit the new instinct (often)", got >= 5, got + "/20");

console.log("6. limits");
check("an egg or a grump can't be operated on", /only a living smol/.test(S.why(game, { alive: true, species: "grump" })));
game.time += SB.DAY_LENGTH;
const real = game.rng; let rolls = 0; const spy = function () { rolls++; return real(); };
Object.keys(real).forEach(k => { spy[k] = function () { rolls++; return real[k].apply(null, arguments); }; });
game.rng = spy;
const ok6 = S.operate(game, c, { kind: "add", drive: SB.D.hunger, noun: SB.N.crop, verb: SB.V.eat }).ok || S.operate(game, c, { kind: "care", drive: SB.D.hunger, dir: 1 }).ok;
game.rng = real;
check("surgery never rolls the island's dice", ok6 && rolls === 0, rolls + " rolls");
game.sparks = 0; game.time += SB.DAY_LENGTH;
check("no sparks, no surgery", /not enough sparks/.test(S.operate(game, c, { kind: "care", drive: 0, dir: 1 }).why || ""));

console.log("7. wired in");
const ui = fs.readFileSync(path.join(__dirname, "..", "play", "js", "ui.js"), "utf8"), html = fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8");
check("the brain viewer has a surgery button", /SB\.Surgery\.open\(game, c\)/.test(ui) && /brain surgery/.test(ui));
check("surgery.js loads before ui.js", html.indexOf("js/surgery.js") > 0 && html.indexOf("js/surgery.js") < html.indexOf("js/ui.js"));

console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
