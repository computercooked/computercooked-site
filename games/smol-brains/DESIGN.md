# smol brains — design doc

A modern, original artificial-life pet game for Computer Cooked Games, inspired by *Creatures* (Creature Labs / Millennium, 1996, designed by Steve Grand). You hatch tiny creatures called **smols**, each with a real neural network brain, a body chemistry and a genome. You raise them, teach them words with a tickle-and-tap hand, keep them safe from mischievous **grumps**, and breed generations that are genuinely different from their parents.

No Creatures names, art, code or assets are used. Everything here is original.

---

## 1. Reverse-engineering Creatures (what it actually did)

### The brain
Creatures (C1, 1996) gave each Norn a ~1,000-neuron, ~5,000-synapse brain, built at birth from genes. It was split into **lobes**:

- **Perception lobe**: a mix of sensory neurons (what it sees and hears, its own drive levels) copied together into one input layer.
- **Attention lobe ("noun" lobe)**: one neuron per category of object (food, toy, Norn, Grendel, hand, machine, ...). The most active neuron wins and the creature looks at that thing. Attention is driven by stimuli: a moving object, a sound, the player saying the object's name.
- **Decision lobe ("verb" lobe)**: ~16 neurons, one per action (quiescent, activate1 "push", activate2 "pull", deactivate, approach, retreat, get, drop, express need, rest, walk west, walk east, ...). Winner-take-all chooses what to do to the attended object.
- **Concept lobe**: the big associative layer (640 neurons in C1). Each concept neuron fired for a small combination of 1–3 perception inputs ("I'm hungry AND I see food"). Concept neurons then wired into the decision lobe. This is where learning lived.
- **Drive lobe**: the creature's own needs, fed from the biochemistry.

**Learning** happened in dendrites. Each dendrite had a short-term weight (STW) and long-term weight (LTW). When a dendrite fired it became "susceptible" for a short while. If **reward** or **punishment** chemicals were then released, susceptible dendrites had their STW pushed up or down; the STW then relaxed toward the LTW, and the LTW slowly drifted toward the STW. So a single lesson made a quick, fading impression, and repeated lessons became long-term habits. Unused concept neurons were "migrated" (re-wired) to new input combinations, so the brain kept finding fresh associations.

Reward and punishment were not magic: they came from **drive reduction**. Eating when hungry lowered the hunger chemical, and genes made "drive went down" release reward. The hand's tickle released reward directly; a slap released punishment.

**Instincts**: genes contained instinct "lessons" ("if hungry and seeing food, then eat → reward"). These were rehearsed while the embryo dreamed, so a newborn was born with a weak, plausible starting brain that it then refined by living.

### The biochemistry
About 255 chemicals. Genes defined **emitters** (organs that release chemicals), **receptors** (sense chemical levels and change body or brain behaviour), **reactions** (A + B → C + D at a rate, e.g. glucose ↔ glycogen ↔ starch), and **half-lives**. Drives (pain, hunger, coldness, hotness, tiredness, sleepiness, loneliness, crowdedness, fear, boredom, anger, sex drive) were just chemical levels. Food delivered starch/glucose, the body burned it for ATP, a shortage raised hunger. Toxins, antigens (from bacteria) and antibodies made disease a real, emergent thing. Medicine plants pushed the other way. Ageing was driven by a life-stage hormone and genes switching on at different life stages (baby, child, adolescent, youth, adult, old, senile).

### The genome
A long string of genes, each with a header (type, life stage to switch on at, sex-linked flags, and **mutable / duplicable / cuttable** flags). Gene types covered brain lobes and dendrite rules, biochemistry (emitters, receptors, reactions, half-lives), stimulus responses (what each action does to your chemistry), instincts, appearance and poses. Breeding did crossover between parents' genomes with occasional mutation, duplication and deletion. A mutation in a brain gene could make a genius or a creature that could never learn to eat.

### Language and the hand
The player was a floating **hand**. You could pick things up, push them, and **tickle** (reward) or **slap** (punish) a creature. A **learning computer** and the keyboard taught words: show an object and type its name; Norns learned nouns and verbs and spoke them back in broken speech ("Norn hungry", "eat food"). Typing a verb was a command a Norn might obey, especially if you rewarded it for doing so.

### Grendels, Ettins, eggs and the world
**Grendels** were a rival species that hit Norns, spread disease, and could teach Norns bad habits. **Ettins** (C2/C3) stole gadgets. Creatures laid **eggs** that hatched into babies who had to be raised from scratch. The world (a disc-shaped island in C1) had many rooms, machines, plants, a food chain, weather in C2, and lifts and teleporters.

### What made it magical
1. **It was real.** The behaviour was emergent, not scripted. Your Norn genuinely learned, so it was genuinely *yours*: no one else had that one.
2. **Unreliable children.** They did dumb, surprising, funny things. They could learn wrong lessons. That gave you a parent's job, not a puppeteer's.
3. **Words came back to you.** The first time a Norn said "eat food" was the hook of the whole game.
4. **Death and generations.** Lives ended; the line continued. Genetics made each new egg a lottery.
5. **A community** traded creatures and genomes online for years (Docking Station let you warp creatures to other players' worlds).

### What held it back (what to modernize)
- Opaque: you couldn't see *why* a Norn did something. → A **live brain viewer** that shows neurons firing and weights changing.
- Slow, fiddly start: lots of menus before anything charming happened. → **Hatch, name and first word inside 5 minutes**, with a gentle tutorial.
- Easy to starve them by accident; very punishing when away. → Forgiving metabolism, time-speed control, autosave, no offline decay.
- Desktop-only, mouse-heavy. → **Phone-first** controls: tap, drag, a tool bar.
- Sharing needed file juggling. → **Copy-paste creature codes** and a downloadable **creature card** image.
- No goals for casual players. → **Achievements**, IQ score, generations, an encyclopedia.

### Modern takes we borrowed from
- **The Sims**: legible needs bars, mood icons over heads, autonomy you can nudge.
- **Spore**: playful procedural creature appearance; every creature looks distinct.
- **Rain World**: an ecosystem with a rival species that has its own goals (grumps raid at night, steal food, go home at dawn).
- **Grow Home**: wobbly procedural animation (squash, bounce, blinking eyes) instead of sprite sheets.
- **Neuroevolution demos** (NEAT, "evolution simulators"): brains are visible, generations matter, and you watch improvement happen.
- **Tamagotchi/Neko Atsume**: low-stakes cuteness, emotes, collectibles.

---

## 2. The game: smol brains

**Pitch:** raise tiny creatures with real neural-network brains. teach them words. they will learn the wrong ones.

### Names (all original)
- **smols**: the player's creatures. Round, big-eyed, ear-and-tail variety from genes.
- **grumps**: the rival species. Spiky little purple goblins with teeth. They come out at night.
- **The Valley**: six biomes side by side: Grump Hollow, Mushroom Woods, Nest Meadow (home), The Lab, Sunny Pond, Frost Peak.

### Pillars
1. **A real brain per creature** (`brain.js`)
   - Perception: 45 inputs = 12 drives + 16 attended-noun one-hot + 12 heard-verb one-hot + heard-its-name + near-target + holding + dark + bias.
   - Attention: a learnable linear layer (16 nouns × 13: drives + bias) plus salience (distance, motion, novelty, the player pointing or saying its name) picks what to look at, with softmax exploration.
   - Decision: hidden layer (6–24 tanh neurons, size from the genome) → 12 verb outputs (expected reward of doing that verb to that thing). Softmax choice with a genome-set temperature (curiosity).
   - Learning: an online, reward-modulated update (a contextual-bandit / one-step actor-critic flavour). After each action the reward is how much the drives went down (weighted by genes) plus the tickle/tap chemicals. The error between predicted and actual reward is backpropagated through the hidden layer for the chosen verb. **Eligibility traces** keep the last few decisions "susceptible" (exactly like Creatures' dendrite susceptibility) so a tickle a second later still credits the right action.
   - Instincts: genes list (drive, noun, verb, strength). At hatching the brain "dreams" these as training examples, so babies start with weak, imperfect hunches. Mutated instincts make weird babies.
   - Imitation: watching another creature act nudges the watcher's brain toward that action. Good smols teach each other; grumps teach hitting.
   - Brain viewer: click a smol and see every neuron's activation, the weights as coloured lines, flashes where learning just changed a weight, and a plain-English readout ("hungry + sees food → eat (0.71)").
2. **Biochemistry** (`chemistry.js`)
   - Drives: hunger, tired, sleepy, bored, lonely, pain, fear, cold, hot, sick, love, anger.
   - Body chemicals: glucose, fat, reward, punish, adrenaline, toxin, antigen, antibody, medicine, health.
   - Glucose burns at the genome's metabolism rate; fat buffers it; low glucose raises hunger; starvation and toxins drain health. Antigens (from grumps and rotten food) multiply until antibodies (immunity gene) catch up; medicine helps. Temperature comes from the biome, weather and time of day. Sleep restores tiredness/sleepiness and consolidates learning.
3. **Genetics** (`genome.js`)
   - ~40 genes: appearance (two hues, pattern, ears, eyes, tail, body shape, size), brain (hidden size, learning rate, curiosity, attention learning, memory decay), temperament (bravery, sociability, playfulness, grumpiness, obedience, chattiness), metabolism, immunity, lifespan, fertility, voice pitch, 12 drive-reward weights, and an instinct list.
   - Breeding: per-gene crossover with blending, ~5% mutation per gene, rare big mutations, instinct duplication/deletion/rewiring. Each egg shows which genes mutated. Family tree with generation numbers.
4. **Teaching**
   - Hand tools: **grab** (drag/throw), **tickle** (reward chemical), **tap** (punish chemical), **talk** (type or tap a word).
   - Nouns: tap an object with the talk tool to say its name; smols looking at it learn the word (three or so repetitions). Verbs: say a verb while a smol is doing it. Feeling words come from the Word Machine in the Lab.
   - Commands: saying a verb feeds the "heard verb" neurons. Obeying is not automatic; it is learned by tickling a smol after it obeys.
   - Speech: smols babble as babies, then say words with growing confidence (garbled when half-learned: "fff..fuud?"), and as kids build little sentences: "Bobo hungry", "want ball", "grump scared".
5. **World** (`world.js`): six biomes, fruit trees, berry bushes, carrot patch, healroot, shroom ring (red poison / blue glowcap), Snackbox, Medbot, Word Machine, beds, heater, fan, bouncer, zapper pads, music box, balls, plushes, tops, flutterbies and beetles, incubator, warp gate, grump cave. Day/night (5 min days), weather (sun, rain grows plants, snow chills, storms scare), seasons of weather by day.
6. **Modern features**: autosave + manual save to localStorage, export/import **smol codes** (genome + trained brain + vocabulary, compressed into a pasteable string), a downloadable **creature card** PNG, 30 achievements, time speed (pause, 1×, 2×, 4×, 8×), the **Smolpedia** encyclopedia, a 7-step onboarding tutorial, mobile-friendly UI, Computer Cooked SDK hooks.

### The first 5 minutes
1. An egg wobbles in the incubator in Nest Meadow. "Tap the egg to warm it."
2. It cracks and hatches with a pop. "Name your smol." (suggested random name)
3. The baby gets hungry fast; an apple drops from the tree. "Drag the apple to your smol." It probably eats it (instinct), maybe it plays with it instead.
4. "Tickle it when it does something good." Hearts, reward flash in the brain.
5. "Teach it a word: pick the talk tool and tap the apple." The hand says "food!". The smol looks, and after 2–3 tries it says **"food!"** back. 🎉 First Word achievement.
6. "Peek inside its head": brain viewer opens, the eat neuron glows.
7. Free play, with suggested goals (achievements) and night falling with the first grump.

---

## 3. Module interfaces

All modules are plain browser scripts attaching to the global `window.SB` namespace (no build step, no imports, works from `file://`). Load order: `core.js, genome.js, brain.js, chemistry.js, world.js, creature.js, render.js, audio.js, save.js, ui.js, main.js`. Shared constants and tables live in `js/core.js`: `SB.DRIVES`, `SB.VERBS`, `SB.NOUNS` (+ `_WORDS`, `_EMOJI`), index maps `SB.D/SB.V/SB.N`, the brain input layout `SB.IN`, `SB.KINDS` (object kinds), `SB.STIM` (stimulus table), `SB.GOOD/SB.BAD` (instinct ground truth and IQ test), `SB.STAGES`, `SB.ROOMS`, `SB.ACHIEVEMENTS`, `SB.rng(seed)`, `SB.bus`, `SB.LEXICON`.

### The game object (`main.js`, `SB.Game`)
```js
game = {
  v: 1, seed, time /* sim seconds */, speed /* 0,1,2,4,8 */,
  rng /* SB.rng */, nextId,
  world /* SB.World.create */, creatures: [ /* smols and grumps, alive */ ],
  selectedId: null,
  hand: { x, y, visible, tool: "grab"|"tickle"|"tap"|"talk", heldId: null, heldType: null, saying: null, sayT: 0 },
  family: { [id]: { id, name, gen, parents: [idA, idB] | [], born, died: null|time, cause, look /* genome appearance */, kids: [] } },
  stats: { hatched, eggsLaid, maxGen, wordsTaught, tickles, taps, deaths, bestIQ, grumpNights, cured, imported, exported },
  achievements: { [id]: timestamp },
  tutorial: { step: 0, done: false },
  log: [ { t, text } ] // recent events, newest last, max 50
}
SB.Game.current          // the live game
SB.Game.newId(game)      // -> int
SB.Game.byId(game, id)   // -> creature | object | null
SB.Game.unlock(game, id) // achievement
SB.Game.note(game, text) // log line (UI shows a ticker)
SB.Game.spawnSmol(game, opts) / SB.Game.layEgg(game, genomeA, genomeB, x, parents) / SB.Game.hatch(game, eggObj)
```

### `genome.js` → `SB.Genome`
```js
SB.Genome.random(rng, {species:"smol"|"grump"}) -> genome
SB.Genome.cross(a, b, rng) -> child genome (crossover + mutation; child.mutated = ["eyes", ...])
SB.Genome.mutate(g, rng, rate)
SB.Genome.look(g) -> { hue, hue2, sat, light, pattern 0-3, ears 0-4, eyes 0.6-1.4, tail 0-3, body 0.8-1.25 (width/height), size 0.85-1.2, spots seed, cheeks bool, antenna bool }
SB.Genome.traits(g) -> ["curious", "brave", "chatty", ...]  (human-readable)
SB.Genome.encode(g) -> string; SB.Genome.decode(str) -> genome
genome = { v, species, gen, genes: { name: 0..1, ... }, driveW: [12 floats], instincts: [{drive, noun, verb, s}], mutated: [] }
```

### `brain.js` → `SB.Brain`
```js
SB.Brain.create(genome, rng) -> brain
brain = { nIn: 45, nHid, nOut: 12, w1 Float32Array(nHid*nIn), b1, w2 Float32Array(nOut*nHid), b2,
          att Float32Array(16*13), x, h, q (last activations), lr, temp,
          traces: [{x, h, a, e}], dw1, dw2 (recent |Δw| for the viewer, decaying), updates, lastErr }
SB.Brain.input(brain, ctx)             // ctx = {drives[12], noun, heardVerb, heardName, near, holding, dark} -> fills brain.x
SB.Brain.forward(brain) -> q           // Float32Array(12)
SB.Brain.decide(brain, rng, mask) -> verb index (softmax over q / temp; mask[i]=false forbids), pushes an eligibility trace
SB.Brain.attend(brain, drives, cands, rng) -> index into cands  // cands = [{noun, sal}]
SB.Brain.reinforce(brain, reward)      // reward in [-1,1]; updates w via traces; also the attention weights
SB.Brain.imitate(brain, x, verb, rate) // supervised nudge toward verb for input x
SB.Brain.dream(brain, instincts, n, rng)
SB.Brain.iqTest(brain) -> { good: 0..1, bad: 0..1 }  // uses SB.GOOD / SB.BAD
SB.Brain.serialize(brain) -> object (weights quantized, base64); SB.Brain.deserialize(obj, genome) -> brain
```

### `chemistry.js` → `SB.Chem`
```js
SB.Chem.create(genome) -> chem   // {hunger..anger, glucose, fat, reward, punish, adrenaline, toxin, antigen, antibody, medicine, health}
SB.Chem.tick(chem, dt, env, genome)  // env = {temp 0..1, dark, asleep, inBed, moving, nearFriends, stage, species}
SB.Chem.apply(chem, deltas)      // {drive: delta, chem: delta}
SB.Chem.drives(chem) -> Float32Array(12)
SB.Chem.top(chem) -> {i, v}      // strongest drive
SB.Chem.mood(chem) -> "happy"|"ok"|"sad"|"sick"|"scared"|"angry"|"sleepy"
```

### `world.js` → `SB.World`
```js
SB.World.create(game) -> world  // { rooms, ground: Float32Array (height every 10px), objects: [], weather:{kind, t, intensity}, temp, day, light, clouds, decor }
SB.World.groundY(world, x); SB.World.roomAt(world, x) -> room index; SB.World.tempAt(world, x) -> 0..1
SB.World.tick(world, dt, game)  // physics, plants, critters, weather, day/night, rot, egg warmth, grump spawning (via SB.Game hooks)
SB.World.add(world, game, kind, x, y, data) -> obj; SB.World.remove(world, obj)
SB.World.near(world, x, y, r) -> objects
SB.World.use(world, game, obj, verb, creature) -> {deltas?, chem?, say?, consumed?}  // kind-specific effects
obj = { id, kind, noun, x, y, vx, vy, r, fixed, heldBy: null|"hand"|creatureId, age, data: {} }
```

### `creature.js` → `SB.Creature`
```js
SB.Creature.create(game, {species, genome, name, x, gen, parents, brain?, vocab?}) -> creature
creature = { id, species, name, gen, parents, born, age, stage /* 0..4 */, alive,
  genome, look, brain, chem,
  x, y, vx, vy, facing, onGround, heldBy, holding /* obj id */,
  attn: {type:"creature"|"object"|"hand", id, noun} | null,
  action: {verb, target, t, dur, done, startDrives} | null,
  asleep, speech: {text, t, kind:"say"|"babble"|"think"} | null,
  vocab: { word: strength 0..1.5 },  heard: {verb, noun, name, t},
  anim: { walk, blink, squash, emote, emoteT, bob, look },
  lastReward, iq, visited: {roomId:true}, stats: {...} }
SB.Creature.tick(c, dt, game)
SB.Creature.hear(c, word, game, {fromHand, aboutNoun})
SB.Creature.tickle(c, game); SB.Creature.tap(c, game)
SB.Creature.say(c, text, game)
SB.Creature.iq(c) -> number
```

### `render.js` → `SB.Render`
```js
SB.Render.init(canvas, game); SB.Render.resize()
SB.Render.frame(game, dtReal)   // draws everything
SB.Render.camera  // {x, y, zoom, follow: id|null}
SB.Render.toWorld(sx, sy) -> {x, y}; SB.Render.toScreen(wx, wy)
SB.Render.pick(game, sx, sy) -> {type:"creature"|"object", ref} | null
SB.Render.fx(kind, x, y, opts)  // "hearts","stars","puff","zzz","angry","sparkle","crumbs","bonk","notes","drops"
SB.Render.portrait(ctx, look, cx, cy, size, opts)  // used by UI cards / family tree
```

### `ui.js` → `SB.UI`, `save.js` → `SB.Save`, `audio.js` → `SB.Audio`
```js
SB.UI.init(game)   // toolbar, panels, brain viewer, tutorial, smolpedia, achievements, family tree, dialogs, input
SB.UI.frame(game, dtReal) // per-frame DOM refresh (throttled)
SB.Save.save(game) / SB.Save.load() -> plain data | null / SB.Save.wipe()
SB.Save.exportSmol(c) -> "SMOL1:..." / SB.Save.importSmol(code) -> {genome, brain, vocab, name, gen}
SB.Audio.init(); SB.Audio.play(name, opts); SB.Audio.voice(text, pitch); SB.Audio.setMuted(bool)
```

### Events (`SB.bus`)
`hatch {c}`, `named {c}`, `say {c, text, words}`, `learnWord {c, word}`, `eat {c, obj}`, `tickle {c}`, `tap {c}`, `egg {obj}`, `death {c, cause}`, `achievement {a}`, `grumpArrive`, `select {c}`, `obey {c, verb}`, `sick {c}`, `cured {c}`, `use {c, obj, verb}`, `hit {c, target}`, `note {text}`.

---

## 4. Platform hooks
- Computer Cooked SDK: `window.cc && cc.start()` on load, `cc.event(name, data)` on hatch / first word / egg / achievement, `cc.end({score})` on page hide. Score = best IQ ever reached (shown in the HUD).
- Player page messages: `cc-mute`, `cc-restart` (asks before wiping), `cc-pause`.
- Later: cloud-shared smols (the smol code format is already self-contained and versioned, `SMOL1:`), a public "smol zoo", leaderboard by IQ and generations.

## 5. Performance budget
Brains are 45→≤24→12 dense nets (≈1.4k weights): a forward pass is microseconds. Decisions happen every 1–3 s, not every frame. Rendering is canvas 2D with procedural shapes, cached background layers per biome, and no per-frame allocations in the hot loop. Target: 15 creatures at 60 fps on a laptop, 30 fps on a mid phone. The sim runs at a fixed 30 Hz step, scaled by the time speed (max 8 steps per frame).
