// full ladder with an engaged player: feeds when starving, tickles eaters, talks, blesses toward the weakest need,
// inspires tool-users, answers prayers. Logs tier/idea/build milestones and periodic stats.
{ let rs = (+(process.argv[2] || 1) * 2654435761 + (+process.env.RUN || 0) * 97) >>> 0; Math.random = () => { rs = (rs + 0x6D2B79F5) >>> 0; let t = rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const load = require(process.env.LOADER);
const SB = load().SB; SB.Render = undefined;
const seed = +(process.argv[2] || 1), mins = +(process.argv[3] || 240);
const game = SB.Game.newGame(seed); game.tutorial.done = true; SB.Game.current = game;
game.world.items.find(o => o.kind === "egg").data.progress = 1;
const B = { limbs: { limbs: 0.18, senses: 0.09 }, arms: { arms: 0.18, dexterity: 0.12 }, cortex: { cortex: 0.15, layers: 0.12, recall: 0.09 }, layers: { cortex: 0.15, layers: 0.12, recall: 0.09 }, neurons: { cortex: 0.15, layers: 0.12, recall: 0.09 }, recall: { head: 0.18, recall: 0.09 }, social: { social: 0.18 }, planning: { planning: 0.18, layers: 0.09 }, head: { head: 0.18, recall: 0.09 }, glow: { glow: 0.18, wings: 0.12 }, dexterity: { arms: 0.18, dexterity: 0.12 } };
let blesses = 0, inspires = 0, bounties = 0; const seen = {}, ideasT = {}, builtT = {};
const T = () => (game.time / 60).toFixed(1) + "m";
SB.bus.on("tierUp", d => { if (!seen[d.tier]) { seen[d.tier] = 1; console.log(`${T()} TIER ${d.tier} ${SB.TIERS[d.tier].name} (${d.c.name} gen${d.c.gen}) blesses ${blesses}`); } });
SB.bus.on("eureka", d => { if (d.first) { ideasT[d.id] = T(); console.log(`${T()} idea ${d.id}`); } });
SB.bus.on("built", d => { if (d.st.done && !builtT[d.st.kind]) { builtT[d.st.kind] = T(); console.log(`${T()} first ${d.st.kind}`); } });
SB.bus.on("era", d => console.log(`${T()} ERA ${d.name} ${d.up ? "up" : "DOWN"} pop ${SB.Game.smols(game).length}`));
["district","leader","coup","law","coins","copper","marketDay","trails"].forEach(k => SB.bus.on(k, d => console.log(`${T()} ${k} ${k==="law"?d.law.text:k==="district"?d.d.name:k==="leader"?d.c.name+" "+d.why:""}`)));
let stepT = 0, stepN = 0;
SB.bus.on("ideaLost", d => console.log(`${T()} LOST idea ${d.id}`));
SB.bus.on("village", d => console.log(`${T()} village ${d.village.name}`));
SB.bus.on("bigThought", d => console.log(`${T()} BIG THOUGHT`));
const thr = {}; ["disaster", "wrecked", "grumpGrab", "captive", "grumpDrop"].forEach(k => SB.bus.on(k, d => { const key = k === "disaster" ? "dis:" + d.kind : k === "wrecked" ? "wr:" + d.how : k; thr[key] = (thr[key] || 0) + 1; }));
let eggs = 0, hatches = 0, minPop = 999, maxPop = 0, loveSec = 0, smolSec = 0; SB.bus.on("egg", () => eggs++); SB.bus.on("hatch", () => hatches++);
const deaths = {}; SB.bus.on("death", d => { deaths[d.cause] = (deaths[d.cause] || 0) + 1; });
let errs = 0, joined = 0, kins = 0; const ev = {}; ["chop","hunt","fish","grumpChased","newBiome","song","brawl","convo","tantrum","title","partners","breakup","turnedDown","noRoom"].forEach(k => SB.bus.on(k, () => ev[k] = (ev[k]||0) + 1)); SB.bus.on("stranger", d => { SB.Strangers.decide(game, d.c, true); joined++; }); SB.bus.on("kin", () => kins++);
const says={}, cr={};
{ const SO=SB.Social, oc=SO.court; SO.court=function(g,a,b,how){ let k, r=false; if(!SO.eligible(g,a,b)) k=(SB.Game.related(g,a,b)?"kin":a.sex===b.sex?"sex":(a.stage!==3||b.stage!==3)?"stage":"other"); else if(Math.min(a.tier,b.tier)<3) k="tier"; else if(a.partner===b.id) k="paired"; else if(SO.partnerOf(g,a)||SO.partnerOf(g,b)) k="taken"; else if(a.chem.love<0.3&&b.chem.love<0.3) k="nolove"; else { r=oc.apply(this,arguments); k=r?(a.partner===b.id?"BOND":(a.court&&a.court.n>=3?"lowop":"step")):"fail"; } cr[how+":"+k]=(cr[how+":"+k]||0)+1; return r; }; }
for (let s = 0; s < mins * 60 / SB.TICK; s++) {
  const t0 = process.hrtime.bigint(); try { SB.Game.step(game, SB.TICK); } catch (e) { if (errs++ < 3) console.log("ERROR", e.stack.split("\n").slice(0, 4).join(" | ")); }
  stepT += Number(process.hrtime.bigint() - t0) / 1e6; stepN++;
  if (s % 20 === 0) { for (const c of game.creatures) if (c.species === "smol" && !c.dead) { smolSec++; if (c.anim && c.anim.emote === "love") loveSec++; } }
  for (const c of game.creatures) if (c.speech && c.speech.t > 2 && /hungry|room|many|family|never|okay/.test(c.speech.text)) { says[c.speech.text] = (says[c.speech.text] || 0) + 1; c.speech.t = 1.9; }
  if (process.env.DIAG && SB.Social.partnerOf && s % (300 / SB.TICK) === 0 && game.time > 1200) { const ad = SB.Game.smols(game).filter(c => c.stage === 3); console.log(`${T()} DIAG room ${SB.Civ.room(game)} huts ${game.world.structures.filter(s=>s.kind==="hut"&&s.done).length}/${game.world.structures.filter(s=>s.kind==="hut").length} houses ${game.world.structures.filter(s=>s.kind==="house"&&s.done).length} adults ${ad.length} t3+ ${ad.filter(c=>c.tier>=3).length} f ${ad.filter(c=>c.sex==="f").length} paired ${ad.filter(c => SB.Social.partnerOf(game, c)).length} court ${ad.filter(c=>c.court).length} elig ${(()=>{const t=ad.filter(c=>c.tier>=3);let n=0;for(const a of t)for(const b of t)if(a.id<b.id&&SB.Social.eligible(game,a,b))n++;return n})()} t3paired ${ad.filter(c=>c.tier>=3&&SB.Social.partnerOf(game,c)).length} love>.5 ${ad.filter(c=>c.chem.love>0.5).length} lk ${(ad.reduce((a,c)=>a+(c._lk||0),0)/(ad.length||1)).toFixed(2)} cd ${ad.map(c=>Math.round(c.eggCooldown)).join(",")} hunger ${(ad.reduce((a,c)=>a+c.chem.hunger,0)/(ad.length||1)).toFixed(2)} kids ${SB.Game.smols(game).length-ad.length} season ${game.world.season} says ${JSON.stringify(says)} court ${JSON.stringify(cr)}`); }
  if (s % 400 === 0) {
    const sm = SB.Game.smols(game); if (game.time > 1800) minPop = Math.min(minPop, sm.length); maxPop = Math.max(maxPop, sm.length);
    for (const c of sm) {
      if (c.chem.hunger > 0.8 && game.sparks >= 5 && bounties < 9999 && Math.random() < 0.3) { SB.World.add(game.world, game, "apple", c.x + 0.5, c.z, {}); }
      if (c.action && c.action.verb === SB.V.eat) SB.Creature.tickle(c, game);
    }
    // a player who teaches a word now and then (about one lesson to a few smols every 20 s)
    if (s % 400 === 0) { const ws = ['food','come','water','sleep','play','smol']; for (let k = 0; k < 3 && sm.length; k++) { const c = sm[Math.floor(Math.random()*sm.length)]; SB.Creature.lessonWord(c, ws[Math.floor(Math.random()*ws.length)], game, 0.36); } }
    if (!game.blessing && game.sparks >= 15 && sm.length) {
      const mt = Math.max(...sm.map(c => c.tier)); const best = sm.filter(c => c.tier === mt);
      const needs = {}; best.forEach(c => SB.Genome.nextNeeds(c.genome).forEach(n => { needs[n.gene] = Math.min(needs[n.gene] || 9, n.have / n.need); }));
      const g = Object.keys(needs).sort((a, b) => needs[a] - needs[b])[0];
      if (g && B[g]) { game.sparks -= 20; blesses++; game.blessing = { name: g, genes: B[g], uses: 3 }; }
    }
    if (game.stats.maxTier >= 2 && game.sparks >= 8 && Math.random() < 0.05) { const c = sm.find(x => x.tier >= 2); if (c) { sm.forEach(o => { if (SB.dist(o.x, o.z, c.x, c.z) < 6) o.inspired = 60; }); game.sparks -= 8; inspires++; } }
  }
  if (s % (600 / SB.TICK) === 0 && s) { const sm0 = SB.Game.smols(game); const mt = Math.max(...sm0.map(c => c.tier)); const top = sm0.filter(c => c.tier === mt); const nd = {}; top.forEach(c => SB.Genome.nextNeeds(c.genome).forEach(n => { nd[n.gene] = (nd[n.gene] || 0) + n.have / n.need / top.length; })); const gens = sm0.map(c => c.gen); console.log(`${T()} top tier ${mt} x${top.length} gen ${Math.min(...gens)}-${Math.max(...gens)} needs ${JSON.stringify(Object.fromEntries(Object.entries(nd).map(([k,v]) => [k, +v.toFixed(2)])))}`); }
  if (s % (1800 / SB.TICK) === 0 && s) { stepT = 0; stepN = 0; } if (s % (1800 / SB.TICK) === (1800 / SB.TICK) - 1) {
    const sm = SB.Game.smols(game), tiers = {}; sm.forEach(c => tiers[c.tier] = (tiers[c.tier] || 0) + 1);
    console.log(`${T()} pop ${sm.length} tiers ${JSON.stringify(tiers)} ideas ${Object.keys(game.culture.found).length} structs ${game.world.structures.length} sparks ${Math.round(game.sparks)} hunger ${(sm.reduce((a, c) => a + c.chem.hunger, 0) / (sm.length || 1)).toFixed(2)} deaths ${JSON.stringify(deaths)} items ${game.world.items.length} stepMs ${(stepT/stepN).toFixed(2)} ${SB.Civ ? `era ${SB.Civ.eraName(game)} cap ${SB.Game.POP_CAP} roads ${JSON.stringify(SB.Civ.roadCount(game))} stalls ${SB.Economy.stalls(game).length} sales ${game.econ&&game.econ.sales} cpi ${game.econ&&game.econ.index} money ${SB.Economy.money(game)}` : "cap " + SB.Game.POP_CAP} eggs ${eggs} hatched ${hatches} love% ${(100*loveSec/(smolSec||1)).toFixed(1)} jobs ${JSON.stringify(SB.Game.smols(game).reduce((a,c)=>{if(c.job)a[c.job]=(a[c.job]||0)+1;return a},{}))} joined ${joined} kin ${kins} pairs ${SB.Strangers.breedablePairs(game)} spoil ${(game.spoil||0).toFixed(2)} ev ${JSON.stringify(ev)} seen ${(SB.World.seenFraction(game.world)*100).toFixed(0)}%`);
  }
}
console.log("THREATS", JSON.stringify(thr), "SUMMARY minPop(after30m)", minPop, "maxPop", maxPop, "endPop", SB.Game.smols(game).length, "eggs", eggs, "hatched", hatches, "love%", (100*loveSec/(smolSec||1)).toFixed(1), "deaths", JSON.stringify(deaths), "joined", joined);
console.log("END maxTier", game.stats.maxTier, "ideas", Object.keys(game.culture.found).join(","));
