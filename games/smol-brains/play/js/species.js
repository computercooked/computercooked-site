/* smol brains 2 — species.js
   The evolution tree. Every smol belongs to a clade (a species). A newborn that climbs to a new tier, or
   drifts far enough from its clade's average genes, founds a new species that branches off its parent's.
   Species that drift too far apart can't have eggs together. The tree is the smolpedia's centrepiece. */
(function () {
  "use strict";
  var SB = window.SB;
  var S = (SB.Species = {});
  var G = SB.Genome;

  var EVO = G.EVO_GENES;
  var TRAIT_WORD = {
    limbs: "long-legged", arms: "handy", cortex: "brainy", layers: "deep-thinking", recall: "rememberful", planning: "scheming",
    social: "chatty", dexterity: "nimble", senses: "keen-eyed", head: "big-headed", fins: "finned", fluff: "fluffy", horns: "horned", wings: "winged", glow: "glowing"
  };
  var LOW_WORD = { limbs: "stubby", arms: "armless", cortex: "simple", social: "quiet", fluff: "smooth", fins: "dry" };

  S.init = function (game) {
    if (game.clades && game.clades[0]) return;
    game.clades = { 0: { id: 0, name: "wobbly blobs", sci: "Smollus primus", parent: null, born: 0, tier: 0, gen: 1, alive: 0, total: 0, extinct: null, look: null, mean: null, trait: null } };
    game.nextClade = 1;
  };

  // distance in evolution genes only (0..1)
  S.evoDistance = function (a, b) {
    var s = 0;
    for (var i = 0; i < EVO.length; i++) s += Math.abs((a.genes[EVO[i]] || 0) - (b.genes[EVO[i]] || 0));
    return s / EVO.length;
  };
  function meanDist(g, mean) {
    var s = 0;
    for (var i = 0; i < EVO.length; i++) s += Math.abs((g.genes[EVO[i]] || 0) - (mean[EVO[i]] || 0));
    return s / EVO.length;
  }

  S.compatible = function (a, b) {
    if (a.species !== b.species) return false;
    if (a.clade === b.clade) return true;
    return S.evoDistance(a.genome, b.genome) < 0.17;
  };

  // called when a smol hatches: maybe it's the first of a new species
  S.onHatch = function (game, c) {
    S.init(game);
    var cl = game.clades[c.clade] || game.clades[0];
    if (!game.clades[c.clade]) c.clade = c.genome.clade = 0;
    var newTier = c.tier > cl.tier;
    var drift = cl.mean && cl.alive >= 4 ? meanDist(c.genome, cl.mean) : 0;
    if (!newTier && drift < 0.15) { cl.total++; return null; }
    // a new branch
    var id = game.nextClade++;
    var trait = distinct(c.genome, cl.mean || c.genome.genes);
    var tierName = SB.TIERS[c.tier].name;
    var word = SB.Lang.fresh(game.lang, SB.rng((game.seed + id * 131) >>> 0), 2);
    var nc = {
      id: id, name: (trait ? trait + " " : "") + plural(tierName), sci: "Smollus " + word + "i", parent: cl.id,
      born: game.time, tier: c.tier, gen: c.gen, alive: 1, total: 1, extinct: null, look: c.look, mean: Object.assign({}, c.genome.genes),
      founder: c.name, trait: trait, why: newTier ? "tier" : "drift"
    };
    game.clades[id] = nc;
    c.clade = c.genome.clade = id;
    SB.bus.emit("newSpecies", { c: c, clade: nc, parent: cl });
    SB.Game.note(game, "a new species! " + c.name + " is the first of the " + nc.name + " (" + nc.sci + ") 🧬");
    return nc;
  };

  function distinct(g, ref) {
    var best = null, bv = 0.06;
    for (var i = 0; i < EVO.length; i++) {
      var k = EVO[i], d = (g.genes[k] || 0) - (ref[k] || 0);
      if (Math.abs(d) > bv) { bv = Math.abs(d); best = d > 0 ? TRAIT_WORD[k] : LOW_WORD[k] || null; }
    }
    return best;
  }
  function plural(w) { return /s$/.test(w) ? w : w + "s"; }

  // every few seconds: population counts, running mean genes, extinctions
  var acc = 0;
  S.tick = function (game, dt) {
    acc += dt;
    if (acc < 3) return;
    acc = 0;
    S.init(game);
    var sums = {}, counts = {};
    game.creatures.forEach(function (c) {
      if (!c.alive || c.species !== "smol") return;
      var id = c.clade || 0;
      counts[id] = (counts[id] || 0) + 1;
      var s = sums[id] || (sums[id] = {});
      for (var i = 0; i < EVO.length; i++) s[EVO[i]] = (s[EVO[i]] || 0) + (c.genome.genes[EVO[i]] || 0);
    });
    for (var id in game.clades) {
      var cl = game.clades[id], n = counts[id] || 0;
      if (cl.alive > 0 && n === 0 && !cl.extinct && cl.total > 0) {
        var eggs = game.world.items.some(function (o) { return o.kind === "egg" && o.data.genome && (o.data.genome.clade || 0) === +id; });
        if (!eggs) { cl.extinct = game.time; SB.bus.emit("extinct", { clade: cl }); SB.Game.note(game, "the " + cl.name + " are extinct. 🕯"); }
      }
      if (n > 0 && cl.extinct) cl.extinct = null;
      cl.alive = n;
      if (n) { cl.mean = {}; for (var k in sums[id]) cl.mean[k] = sums[id][k] / n; }
    }
  };

  S.count = function (game) { var n = 0; for (var k in game.clades) n++; return n; };
  S.living = function (game) { var n = 0; for (var k in game.clades) if (game.clades[k].alive > 0) n++; return n; };
})();
