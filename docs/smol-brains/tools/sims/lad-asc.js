// engaged-player ladder (same bot as ladder7.js), parameterized:
// node lad.js ROOT SEED MINS N GV [flags...]   flags: noscheme notaboo nomind
const [ROOT, seedS, minsS, nS, gvS, ...flags] = process.argv.slice(2);
const load = require(ROOT + "/games/smol-brains/tests/_load.js");
const SB = load().SB; SB.Render = undefined;
const seed = +seedS, mins = +minsS, N = +nS || 0, GV = +gvS || 0;
const F = new Set(flags);
{ let a = (+seedS * 2654435761) >>> 0; Math.random = function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
if (F.has("novines") && SB.Surv) { SB.Surv.placeVines = () => []; SB.Surv.ruinVines = (g) => { g.world._ruinVines = 1; return []; }; }
if (F.has("noscheme") && SB.Mind) SB.Mind.scheme = () => false;
if (F.has("notaboo") && SB.Mind) { SB.Mind.tabooAt = () => null; }
if (F.has("nomind") && SB.Mind) { SB.Mind.scheme = () => false; SB.Mind.tabooAt = () => null; if (SB.Mind.deliberate) SB.Mind.deliberate = () => false; if (SB.Mind.goalBias) SB.Mind.goalBias = () => 0; }
const game = GV ? SB.Game.newGame(seed, N, { gv: GV }) : SB.Game.newGame(seed, N);
game.tutorial.done = true; SB.Game.current = game;
game.world.items.find(o => o.kind === "egg").data.progress = 1;
const B = { limbs: { limbs: 0.18, senses: 0.09 }, arms: { arms: 0.18, dexterity: 0.12 }, cortex: { cortex: 0.15, layers: 0.12, recall: 0.09 }, layers: { cortex: 0.15, layers: 0.12, recall: 0.09 }, neurons: { cortex: 0.15, layers: 0.12, recall: 0.09 }, recall: { head: 0.18, recall: 0.09 }, social: { social: 0.18 }, planning: { planning: 0.18, layers: 0.09 }, head: { head: 0.18, recall: 0.09 }, glow: { glow: 0.18, wings: 0.12 }, dexterity: { arms: 0.18, dexterity: 0.12 } };
let blesses = 0; const seen = {}, tt = {}, ideasT = {}, builtT = {};
const T = () => (game.time / 60).toFixed(1);
const t0 = Date.now();
console.log(`START root=${ROOT.split("/").pop()} seed=${seed} N=${SB.WORLD_N} gv=${game.world.T.gv} flags=${flags.join(",")}`);
SB.bus.on("tierUp", d => { if (!seen[d.tier]) { seen[d.tier] = 1; tt[d.tier] = +T(); console.log(`${T()}m TIER ${d.tier} ${SB.TIERS[d.tier].name} gen${d.c.gen} blesses ${blesses}`); } });
SB.bus.on("eureka", d => { if (d.first) { ideasT[d.id] = +T(); console.log(`${T()}m idea ${d.id}`); } });
SB.bus.on("built", d => { if (d.st.done && !builtT[d.st.kind]) { builtT[d.st.kind] = +T(); console.log(`${T()}m first ${d.st.kind}`); } });
SB.bus.on("village", d => console.log(`${T()}m village`));
const deaths = {}; SB.bus.on("death", d => { deaths[d.cause] = (deaths[d.cause] || 0) + 1; });
const ev = {}; ["ritual", "taboo", "stash", "lie", "chop", "hunt", "fish"].forEach(k => SB.bus.on(k, () => ev[k] = (ev[k] || 0) + 1));
SB.bus.on("stranger", d => { SB.Strangers.decide(game, d.c, true); });
let errs = 0;
const steps = mins * 60 / SB.TICK;
for (let s = 0; s < steps; s++) {
  try { SB.Game.step(game, SB.TICK); } catch (e) { if (errs++ < 3) console.log("ERROR", e.stack.split("\n").slice(0, 4).join(" | ")); }
  if (seen[6]) break;
  if (s % 400 === 0) {
    const sm = SB.Game.smols(game);
    for (const c of sm) {
      if (c.chem.hunger > 0.8 && game.sparks >= 5 && Math.random() < 0.3) SB.World.add(game.world, game, "apple", c.x + 0.5, c.z, {});
      if (c.action && c.action.verb === SB.V.eat) SB.Creature.tickle(c, game);
    }
    const ws = ['food', 'come', 'water', 'sleep', 'play', 'smol']; for (let k = 0; k < 3 && sm.length; k++) { const c = sm[Math.floor(Math.random() * sm.length)]; SB.Creature.lessonWord(c, ws[Math.floor(Math.random() * ws.length)], game, 0.36); }
    if (!game.blessing && game.sparks >= 15 && sm.length) {
      const mt = Math.max(...sm.map(c => c.tier)); const best = sm.filter(c => c.tier === mt);
      const needs = {}; best.forEach(c => SB.Genome.nextNeeds(c.genome).forEach(n => { needs[n.gene] = Math.min(needs[n.gene] || 9, n.have / n.need); }));
      const g = Object.keys(needs).sort((a, b) => needs[a] - needs[b])[0];
      if (g && B[g]) { game.sparks -= 20; blesses++; game.blessing = { name: g, genes: B[g], uses: 3 }; }
    }
    if (game.stats.maxTier >= 2 && game.sparks >= 8 && Math.random() < 0.05) { const c = sm.find(x => x.tier >= 2); if (c) { sm.forEach(o => { if (SB.dist(o.x, o.z, c.x, c.z) < 6) o.inspired = 60; }); game.sparks -= 8; } }
  }
  if (s % (600 / SB.TICK) === 0 && s) {
    const sm = SB.Game.smols(game), tiers = {}; sm.forEach(c => tiers[c.tier] = (tiers[c.tier] || 0) + 1);
    const mt = Math.max(...sm.map(c => c.tier)); const top = sm.filter(c => c.tier === mt); const nd = {}; top.forEach(c => SB.Genome.nextNeeds(c.genome).forEach(n => { nd[n.gene] = (nd[n.gene] || 0) + n.have / n.need / top.length; }));
    const nest = game.world.T.nest; const dd = sm.map(c => SB.dist(c.x, c.z, nest.x, nest.z)).sort((a, b) => a - b);
    const gens = sm.map(c => c.gen);
    console.log(`${T()}m pop ${sm.length} tiers ${JSON.stringify(tiers)} gen ${Math.min(...gens)}-${Math.max(...gens)} needs ${JSON.stringify(Object.fromEntries(Object.entries(nd).map(([k, v]) => [k, +v.toFixed(2)])))} ideas ${Object.keys(game.culture.found).length} structs ${game.world.structures.length} sparks ${Math.round(game.sparks)} eggs ${game.stats.eggsLaid} hatched ${game.stats.hatched} medDist ${(dd[dd.length >> 1] || 0).toFixed(0)} deaths ${JSON.stringify(deaths)} ev ${JSON.stringify(ev)} wall ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
}
console.log(`RESULT seed=${seed} N=${SB.WORLD_N} flags=${flags.join(",")} tiers ${JSON.stringify(tt)} ideas ${Object.keys(game.culture.found).length} blesses ${blesses} end ${T()}m wall ${((Date.now() - t0) / 1000).toFixed(0)}s`);
