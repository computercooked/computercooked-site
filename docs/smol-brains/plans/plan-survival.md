# smol brains: survival in possession ("two games in one")

The design plan for the survival loop you play while possessing a smol. It's based on DESIGN.md, possess.js, ideas.js, creature.js, core.js (KINDS/NODES/STRUCTS), genome.js, collect.js, orders.js, firsthour.js and sites.js, plus a short look at the reference games. No repo files were changed.

---

## TL;DR: the eight calls that matter most (ranked by impact)

| # | Idea | Why it matters | Size |
|---|---|---|---|
| 1 | **Pile crafting**: drop things next to each other and "fiddle" with the pile. Unknown recipes leave a hint ("needs something bendy…") and build progress toward an eureka through the existing `I.learn`. | It makes recipes feel discovered instead of read off a menu, and it hooks straight into "technology lives in heads". | M |
| 2 | **Breakable world**: trees, boulders and veins get HP, tools get wear, and the ladder runs bare paws → stick/rock → **primitive tool** (stick + vine + rock) → split wood → stone pick → copper → iron. Each step is gated by **body tier** (what the smol can physically do) and **ideas** (what it knows). | This is the survival game the owner asked for. | M→L |
| 3 | **Faint first, die second**: at 0 health you black out, drop your bag where you fell (a corpse run), and wake at your lean-to or get carried home by a friend with a lasting injury. A second knockout within 5 minutes, drowning or starving is real death, with a grave and grief. | It keeps the stakes high, because the smol, its brain and its line are real, without making one bad night end a 3-hour run. | M |
| 4 | **Nights you have to plan for**: real darkness in first person, grumps that hunt a smol alone away from fire, a telegraphed wind-up you can dodge with a hop, and one new daytime beast (the thornback). Rain makes you wet. | This is the "not just cuddling" part. Without it, survival is just a chore list. | M/L |
| 5 | **The tribe teaches you and learns from you**: you can only use what *this* smol knows, so picking an elder or a youngster matters. Smols watching you craft learn ideas 3× faster than from AI demos. Tribe smols post **asks** (quests) that pay in trust, gifts and taught ideas. | This is the bridge between the two games, and both directions are visible. | M |
| 6 | **Survival mode** in Create World: you start possessed as a founder at the crash, possession is free, the god hand and miracles are off, and evolution comes from your *line*. Your practice echoes into your kids and you take over your heir (Ancestors-style). | A survival-only player gets a complete game with an ending. | M |
| 7 | **Body skills** (chop, knap, mine, hunt, fight, forage): 0–10, learned by doing, stored on the smol, and partly passed on as habits/echoes. A **paw journal** with chapters records recipes, creatures and places. | Moment-to-moment growth, and goals you can read at a glance. | S/M |
| 8 | **Iron as act 3**: ark-hull "sky iron" can be seen in pod wrecks from day 1 but can't be worked. Charcoal mound → bloomery → hammering the bloom → first iron tools. A survival ending: repair a pod beacon. | A long-term goal you can see from the start, like Valheim's visible-but-locked biomes. | L |

Everything below expands these.

---

## 0. What the references teach (short, opinionated)

- **Rust**: you spawn with a rock and a torch, and within minutes everything points at the first stone hatchet/pick. The lesson is that *the first upgrade must be minutes away and obviously better*. Our version: the primitive tool should be **5–8 minutes** into a tool-user's first possession. ([rustafied](https://www.rustafied.com/tools-skills-stats-and-summaries), [gamecat beginner guide](https://www.gamecat.it.com/articles/rust-beginner-guide))
- **Valheim**: progression is gated by tools and bosses. You can *see* a resource long before you can harvest it (the next pickaxe unlocks the next ore), and biomes are the difficulty curve. "Rested" comes from shelter, a fire and comfort, which turns base-building into a buff. We borrow the tool-gated ores, the visible-but-locked goal (sky iron), and a "cosy" buff for sleeping by a fire or in a shelter. ([progression roadmap](https://www.bamboogaming.net/valheim/progression), [comfort](https://www.corrosionhour.com/valheim-how-does-comfort-work/))
- **Don't Starve**: night is the clock that structures every day. In true darkness you can't act and something attacks you, while near light the pressure nearly vanishes. That makes "have a fire by dusk" the core daily decision. We borrow the dusk deadline and the darkness pressure. We do *not* borrow instant death in darkness, because it's too punishing for a cosy creature game. ([night guide](https://dontstarve.wiki.gg/wiki/Guides/All_About_Night), [day-night cycle](https://dontstarve.wiki.gg/wiki/Night))
- **Minecraft and Terraria**: punching a tree is the first verb, and every tier of tool opens a tier of blocks. The joy is in breaking things and the item drops that pop out. We borrow the juicy feedback when something breaks (cracks, chips, drops) and "the next pick opens the next rock".
- **RimWorld**: injuries are specific (cuts bleed, broken parts slow you) and recovery takes time and care. We borrow three wound types, not a body-part simulator.
- **Ancestors: The Humankind Odyssey**: the closest relative to us. Skills are learned by doing, babies on your back get the XP, and you reinforce skills across generations or lose them. We already have a better version of this (echoes, real brains, ideas that live in heads). Survival mode should lean into it: *you are a lineage, not a character*. ([primagames generations](https://primagames.com/gaming/ancestors-the-humankind-odyssey-new-generations-evolution), [reviews](https://www.trueachievements.com/game/Ancestors-The-Humankind-Odyssey/reviews))

The one-line takeaway: **early survival games work when the first tool is close, the night is a deadline, and the world shows you things you can't take yet.**

---

## 1. The core loop as a smol

### Minute to minute (the 30-second loop)
Look → point → hit/gather → the thing reacts (chips, cracks, sway, a drop pops out) → juggle paws and bag → check the bars → decide whether to push on or head back.

- Every break gives feedback within 0.2 s: a crack decal stage on a rock, a tree that sways more with each hit and creaks before it falls, pickups that pop and bounce (the v4.2 pickups already bob and glint).
- You can carry very little: **paws (1) + tool belt (1) + bag (2, or 5 with a basket)**. That's the existing `bagCap`, and it's the right number. Choosing what to carry home is a real decision.
- The bars already exist: food, life, warm, pep. **Add a stamina meter** (swings, runs and hops spend it; it recovers when you stand still and faster when you're "cosy"). Stamina is what makes combat and chopping feel physical. Don't add thirst: drinking already exists, and thirst is a chore without a decision behind it.

### The session loop (one island day, 20 minutes)
1. **Dawn (2 min)**: check the ask board at the campfire (tribe quests, §4). Pick a goal: a material, a place or a creature.
2. **Day (9 min)**: head out to the biome that has it. Gather, fight or explore. The fog clears and places are found. Weather changes your plans.
3. **Dusk (2 min)**: the deadline. The HUD clock pulses, and "home is 140 m NE" is on the compass. Get back to fire or a shelter, or build a lean-to where you are (tool-users can).
4. **Night (7 min)**: survive. Craft by the fire, fend off grumps, or sleep in a safe bed to fast-forward (×8 while every possessed need is safe; this is the only time sim speed rises above 1 during possession). Sleeping by fire or under a roof gives **cosy** (Valheim's rested): +50% stamina regen, +25% skill gain and faster wound healing for 6 minutes.

### Long term (hours)
- **Tools**: paws → stone → clay/fire → copper → iron (§2).
- **Body**: the smol, and then its children, evolve. You can feel a tier-up: critter legs run 1.6× faster and hop higher, tool-user hands grip, builders lay sites by hand, thinkers work the kiln.
- **Place**: your lean-to becomes the tribe's camp, then a village you helped raise. "I chopped the logs for that hut" is the emotional payoff.

### What makes it hard (difficulty sources, in order of how much they matter)

| Pressure | Rule | Notes |
|---|---|---|
| **Night** | Outside firelight, first person goes truly dark: a lit-radius fog with only eyes glinting. Fear rises in the dark, and above 0.8 fear you **panic**: steering wobbles and the smol squeaks, which draws grumps. Any fire, torch, glowcap or ascended glow stops it. | Darkness is pressure, not instant death (unlike Don't Starve's Charlie). |
| **Grumps** | At night, grumps within 25 m of a lone possessed smol more than 15 m from fire **hunt** it. A grump attack has a 0.6 s wind-up (it rears back with red eyes). Hop sideways during the wind-up to dodge. Damage: a grump hit = 0.18 health and a chance of a bruise. | `whacked >= 3` already sends grumps off for good; keep it but scale by weapon (§2 table). |
| **Thornback** (new, daytime) | A boar-like beast in forest, savanna and maple woods. It's territorial: it snorts at 8 m and charges at 5 m. Sidestep the charge and it stuns itself on a tree. It drops meat ×2 and hide. | You need daytime danger, or day is free and only night counts. One creature, done well. |
| **Cold and wet** | Rain sets *wet* (0–1), which triples heat loss, puts out torches and stops fires from being lit. Fire dries you in 30 s. Winter nights without a fire or cloak make cold the killer. | `World.tempAt`, cold and the cloak all exist; wet is new and small. |
| **Injuries** | Three kinds. **Bruise**: −10% max health, heals in 2 min. **Cut** (from thornback tusks, a sharp rock that slips while knapping, and grumps 20% of the time): bleeds −0.01 health/s until **bound** with fibre or healroot (a 2 s action). **Sprain** (falling more than 2 m, or hopping while exhausted): −35% speed for 3 min, no running. Sickness already exists (raw meat, red shrooms). | RimWorld-specific, but only three, each with an obvious fix. |
| **Tool wear** | Each tool has uses (primitive 40, stone 120, copper 300, iron 800). The tool's slot shows a wear pip, and at 15% it squeaks and you get a toast. A broken tool drops its head (stone or flint) so you can relash it. | Breaking a tool is a small detour, not a loss. |
| **Hunger** | Unchanged (metabolism: eat every 2–3 min). Cooked food gives +40% and never makes you sick; raw meat can. | It already works; don't overtune. |
| **Distance** | Your carrying limit and the dusk deadline together set how far you can go. | It comes free from the existing systems. |

**Difficulty presets for possession** (settings): *cosy* (no hunting grumps, no bleeding, faint only), *survival* (default, everything above), *hardcore* (no faint: 0 health = death, and grumps hunt at dusk).

---

## 2. Tools and crafting: from bare paws to the first iron

### The two gates
- **The body says what you can physically do** (tier: legs, hands, planning, head). It's checked in `verbFor`, and a locked action says why: "your paws can't grip yet: hands come with tool-users".
- **Ideas say what you know how to do** (per smol, `c.ideas`). Possess a smol who knows weaving and you can weave. Possess one who doesn't and you have to work it out or get taught.

That makes **who you possess a real choice**: the grandmother knows nine ideas but runs at 0.7× and tires fast, while the teenager knows two and is strong. That's a great decision the sim gives the survival game for free.

### How recipes are discovered (no menu dump)
1. **Pile crafting** (the main interaction). Drop items within 1 m of each other and they form a *pile* (a faint ring on the ground). Point at the pile and press E ("fiddle with the pile"; one button on phones). Then:
   - It **matches a known recipe**: the thing is made (a 2–6 s action with paws busy).
   - It **matches part of a recipe the smol could hold** (tier OK, prerequisites known): a thought bubble shows a *hint adjective* for the missing part ("…needs something bendy", "…something sharp", "…something hot"), and `I.learn(c, id, 0.25)` adds progress. Three good fiddles → eureka, the smol shouts the island's word for it, and it goes in the chronicle and the journal.
   - **Nothing matches**: "nothing happens. Pip chews the stick." There's no penalty and no spoiler.
2. **Doing things in the right situation** fires the existing `TRIGGERS` as usual (holding a stick near a fire → torch). While possessed, the trigger weight is ×3, because you're a curious god in a small body. The sim's discovery rules stay intact, they just reward the player for poking at the right things.
3. **Seeing it done**: if a tribe-mate knows an idea and does it within 7 m, you get `observe` progress, and the bubble says "Kora did something with a vine and a rock…". Ruins carvings show a pictogram (which ingredients, not the amounts).
4. **Shortcut, once you know it**: the C/make menu lists only recipes *this smol knows* (the existing `P.recipes`) and crafts from the bag. The pile is how you *learn* a recipe; the menu is the convenient way to repeat it.

Hint adjectives (one per ingredient class): stick → "something long", vine/cord → "something bendy", rock → "something heavy", sharp rock/flint → "something sharp", wood piece → "something to hold it by", clay → "something squishy", fire → "something hot", charcoal → "something that burns longer".

### New things in the world
- **Vine tangle** (node, "creeper"): grows on cliff faces and rocky slopes, on ruin walls, in jungle and mangrove undergrowth and along riverbanks. Never on trees, as the owner asked. Pull it with paws (tool-user) for 1–2 **vine**. It regrows in 4 min. On new islands it's common near boulders on purpose, so the three ingredients sit close together.
- **Dig spot** (node): soft ground marked by a mound with sprouts or a crab-hole. Critters can **dig with their paws** (their first "breaking" verb, before hands) and get roots, grubs (food), clams, clay, or a *buried thing* (a seed, an old pod part, a carving shard). Later a stone pick can dig **dirt** from any meadow, forest or swamp ground. The terrain doesn't actually deform (§5), but a hole decal stays for a day.
- **Rust rock** (node, iron ore): red-streaked outcrops in mountains, ashlands and red mesas, and *deep* in grump-cave mouths. It needs a copper pick.
- **Sky iron** (loot): bent hull plates in pod wrecks and crashed pods, which show up from minute 10. "Too hard to break. Too heavy to shape. Someday." They're unworkable until the bloomery exists, then they count as a ready iron bloom. That's the visible-but-locked goal.

### The ladder (recipes with numbers)

Tier icons: 🫧 blob 0, 🐾 critter 1, 🪵 tool-user 2, 🔥 tribe 3, 🛖 builder 4, 🧠 thinker 5.

| Step | Tier | Idea (new ✱) | Recipe / action | What it opens |
|---|---|---|---|---|
| **Bare paws** | 🫧 | — | Eat food on the ground, nibble bushes, roll, hop, **hide in a bush** ✱ (grumps lose you if you're still for 3 s), sleep in the nest. | Survival is food, warmth and hiding. You can't break anything. |
| **Legs** | 🐾 | — | Run (1.6×) and higher hops, **dig with paws** ✱ at dig spots, **carry one thing in the mouth** ✱ (no use, no craft), shake trees, pounce on bugs. | You can bring food home, reach dig loot, and outrun a grump in the open. |
| **Grip** | 🪵 | bonk (exists) | Pick up a stick or rock. **Bash**: stick = weapon 1 dmg; rock on a hardnut = nutmeat; **rock on a boulder** → 35% *sharp rock* ✱ (+5% per knap skill), otherwise chips. | Hands matter at once. The sharp rock cuts reeds and bushes slowly. |
| **Primitive tool** | 🪵 | ✱ **lashing** (trigger: holding a vine with a stick or rock nearby; pile stick + vine + rock) | **stick + vine + rock → primitive tool** (wear 40, weapon 2 dmg). | The owner's core beat: you can now hit trees and boulders. |
| ↳ on a tree | 🪵 | — | Each hit: 50% stick, 20% bark (tinder ✱). After **8 hits on trees** the smol "gets" ✱ **felling** (`I.learn` progress per hit). After that, 6 hits topple a tree → **2 logs** + 1 stick, leaving a stump (`I.fell` exists). | "Learn to chop" happens by doing, as the owner wanted. |
| ↳ on a log | 🪵 | ✱ **splitting** (trigger: hitting a log on a stump) | **log on a stump + 3 hits → 3 wood pieces** ✱ | Wood pieces: handles, building (counts as 2 sticks), fuel (burns 2× as long as a stick). |
| ↳ on a boulder | 🪵 | — | Hits → rocks, 25% sharp rock, 10% flint flake on flint outcrops. | Rocks without waiting for drops. |
| **Sharpen** | 🪵 | knapping (exists; needs bonk) | **sharp rock + rock (hold, 3 s) → pick head** ✱ or **flint + hammerstone → blade** (exists). A slip gives a 10% cut chance, falling with skill. | Heads for real tools. |
| **Stone pickaxe** | 🪵 | ✱ **picks** (needs lashing + knapping) | **pick head + wood piece + vine → stone pick** (wear 120). Mines flint outcrops, clay banks (×2 speed), **copper ore veins** (this changes today's tier 4 + hammer gate to: stone pick, any tool-user), crystals (slowly), and dirt. | Valheim's "the pick opens the rock". |
| **Stone axe** | 🪵 | chop (exists; recipe changes) | **blade + wood piece + vine → stone axe** (wear 120; fells in 3 hits, as today). | A faster felling tool. |
| **Sharpened stick** | 🪵 | ✱ (part of spear) | **stick + primitive tool (hit it) → pointed stick**. Hardened at a fire → **fire spear** (2 dmg, reach +0.8). | The first ranged-ish weapon before flint. |
| **Spear** | 🪵 | spear (exists) | stick + blade (+ vine as a new requirement) → spear (3 dmg, fishing). | — |
| **Fire** | 🪵 | fire (exists) | **Fire drill** ✱: wood piece + stick + bark/dry grass in a pile, then *hold* the fiddle with a rhythm (tap in time with the creaks, 3–6 s). It fails in rain. Or carry a lightning fire with a torch. | Your first night with fire. Possessed players can discover fire without waiting for lightning. |
| **Lean-to** | 🪵 | ✱ **lean-to** (trigger: sleeping cold or in rain while holding a stick) | **4 sticks + 2 vine** (new struct, r 0.7, work 6). A rain roof, a sleep spot, cosy when next to a fire, and **your respawn point**. One per smol. | Your first base, possible before builder tier. |
| **Cord** | 🪵 | weaving (exists) | **3 reed fibre → cord** ✱. Cord works in place of vine everywhere. | A renewable binder from the reed beds. |
| **Club / torch / cooking / basket** | 🪵 | exist | Unchanged. Club = 3 dmg plus stagger. | — |
| **Fishing / cloak / teaching / calls** | 🔥 | exist | Rod and cloak as today. **Shout calls** ✱ (come / follow / stay / food, from the word book's 📣 calls) bring followers. | A squad of 2 at tribe tier. |
| **Building by hand** | 🛖 | exist | Huts, palisades, bridges and story poles are already placeable while possessed. Add **mud wall** ✱ (dirt ×4 + sticks ×2) and **pit trap** ✱ (dig 3×: thornbacks and grumps fall in, stunned for 20 s). | Dirt gets a purpose. Squad of 4. |
| **Clay** | 🛖 | pottery (exists, tier 4) | clay ×2 at a fire → pot. | — |
| **Kiln** | 🧠 | kiln (exists) | stone ×4 + clay ×2. | — |
| **Charcoal** | 🧠 | ✱ **charcoal** (trigger: wood pieces in a fire that's smothered with dirt or rain) | **Charcoal mound** ✱ (struct): 6 wood pieces + 3 dirt, light it, wait 2 min → **4 charcoal**. | The first use of dug dirt in the fuel chain. |
| **Copper** | 🧠 | smelting (exists; recipe changes) | ore + **1 charcoal** at a kiln → copper. **Copper pick** ✱ / copper axe (exists): copper + wood piece + cord. | A copper pick opens rust rock. |
| **Bloomery** | 🧠 | ✱ **bloomery** (needs smelting; trigger: rust rock near a kiln) | stone ×6 + clay ×4 + **bellows** ✱ (hide ×2 + wood piece ×2). | — |
| **Iron** | 🧠 | ✱ **ironwork** | rust ore ×2 + charcoal ×3 at the bloomery (stoke it: hold to pump the bellows) → **iron bloom**; bloom + hammerstone on an **anvil rock** (any boulder top) in a timed-tap minigame (5 taps) → **iron bar**. Sky iron counts as a bloom. | — |
| **First iron tools** | 🧠 | — | **Iron axe** (1-hit fell + 3 logs), **iron pick** (crystals ×3 speed, every rock), **iron knife** (skins in 1 s, binds wounds faster, 3 dmg), **iron spear** (5 dmg). All are iron bar + wood piece + cord; the spear also takes a stick. | Act 3 is done; the survival ending opens (§4). |

**Recipe text the player sees** (in the journal, after discovery): "**rock-on-a-stick** (the tribe says *ko-vala*): a stick, a vine and a rock, wrapped tight. Pip worked it out on day 3 by the cliff vines."

### Weapon and break numbers (first pass, to tune with headless sims)

| | dmg | stamina/swing | tree hits to fell | boulder hits per rock |
|---|---|---|---|---|
| paws (critter+) | 0.5 | 0.04 | — | — |
| stick | 1 | 0.05 | — | — |
| primitive tool | 2 | 0.07 | 6 (after felling) | 3 |
| stone axe / pick | 2 / 2 | 0.07 | 3 / — | — / 1 |
| club | 3 + stagger | 0.09 | — | — |
| spear | 3, reach | 0.06 | — | — |
| copper | 3 | 0.06 | 1 | 1 (and ore) |
| iron | 4–5 | 0.05 | 1 (+3 logs) | 1 (any rock) |

Grump: 6 HP for a possessed fight. Today's `whacked >= 3` stays for AI smols and is equivalent at 2 dmg. Thornback: 8 HP.

---

## 3. How the two games feed each other

### What possession teaches the brain and the tribe
1. **The brain imitates you.** This exists (`P.LEARN_RATE` 0.15, `B.imitate` plus traces). Extend it:
   - **Filter**: don't imitate hitting smols, or eating red shrooms. Those still give their normal reward or punishment through the action's outcome. Imitation should teach skill, not cruelty. (Right now `learn()` imitates every verb, including `hit` on a friend.)
   - **Outcome bonus**: when an action you chose succeeds (a tree falls, an item is crafted, a grump flees), give the trace a +0.3 reward. Your good plays stick harder than your random ones.
   - On leaving, show the existing "learned from N choices" toast **plus the top 2 habits it picked up** ("chops trees when bored", "flees grumps at night"), read from `S.verbs` × noun.
2. **Teaching by showing.** Any smol within 7 m of your successful craft gets `I.observe` at **0.36** (3× the AI demo's 0.12). A possessed eureka is a normal `I.discover`: the smol is credited, gets the word, the title and the chronicle entry. "Pip invented lashing on day 3" belongs in the story.
3. **Echoes.** Your practice is the smol's practice (`habit(c,"hands")` and so on), so its kids lean toward hands and planning. Cap possessed echo gain at 1.25× an AI smol's, so possessing doesn't become a breeding exploit.
4. **The map.** Places you find go into the smol's mind map (food, water, danger) and are shared at the campfire, exactly as AI exploration works. The biome reward (4 sparks) is paid as usual.
5. **Materials.** What you drop in a stockpile zone feeds the AI economy. Builders use your logs. "Carried by Pip" sits in the struct's founder or helpers list.
6. **Body skills echo a little.** A smol with chop 7 has kids born with chop 1–2 (a fifth of the parent's skill, the same mechanism as echoes).

### What the sim unlocks for you
- **Knowledge**: possess a smol who knows more and you know more. Story poles let a possessed smol "study" (existing) to learn ideas, which turns a 30-second read into a recipe.
- **Bodies**: tiers are earned in the sim (breeding, teaching, blessings). In god mode, a sim player who raises a builder line hands a survival player a stronger body.
- **Infrastructure**: huts and campfires are safe beds and respawn points, a workshop doubles craft speed, palisades turn the night into tower defence, and the star dome gives 90 s of storm warning on your HUD.
- **Companions**: friends already tag along and bring food. From tribe tier, you can call them (come / follow / stay / attack). Brave, armed tribe-mates fight beside you.
- **Asks**: AI smols post quests (§4) because they *want* things (`firsthour.js` wishes are the seed of this system).

### Why each player has a complete game
- **Sim-only player**: possession is never required. Every idea above is reachable by AI through triggers and pondering, the new ideas get TRIGGERS and tier entries like the old ones, and the AI uses the new tools through `I.use`/`findSource`. The only things that need possession are cosmetic: maker's marks, the paw journal's doodles, and the "lived as" badge on a collector card. Rule: **possession makes things faster and personal, never exclusive.**
- **Survival-only player**: **Survival mode** in Create World:
  - You start possessed as one of the founders at the crash. Founders start at **critter**, since a 3-minute blob prologue that teaches hiding is fine, but nobody should be a blob for an hour. The other founder is AI.
  - Possession is free and you can't leave. The god hand, miracles and the word book are hidden. Sparks become **insight**, which you spend on journal hints (that buys the god "help" back in diegetic form).
  - **Lineage**: you lay eggs the normal way (love and partners exist). When your smol dies, or at a lean-to by choice when it's an elder, you take over an heir you raised or any tribe member. Your habits echo into your kids, so *you evolve your line by how you play*. That's the Ancestors loop, but real.
  - Survival mode runs evolution about 1.6× faster (the same knobs as cousin eggs and echo strength), so builder lands around 2 h and thinker around 3–3.5 h of play.
  - The ending: **the pod beacon**. Iron bar ×2 + copper ×2 + crystal ×1, built into a wreck, sends the signal. It plays the existing ending cutscene with a survival summary (days survived, generations, tools first made, who invented what). It's shorter than the spire, and the spire stays for sim and hybrid players.
- **Hybrid** (the intended sweet spot): god by day for raising and teaching, possession to push a tech step, run a raid, or explore a biome the AI won't reach.

---

## 4. Progression and goals while possessed; death

### Three goal strands, all on one HUD card
1. **The paw journal** (per island, belongs to the player and persists across smols). Chapters of 3–5 tasks each, shown as hand-drawn pixel doodles:
   - I *Little paws*: eat 3 different foods, hide from a grump, dig something up, survive a night.
   - II *First grip*: hold a stick, make a sharp rock, find vines, **make the primitive tool**.
   - III *Wood and stone*: fell a tree, split a log, make a stone pick, build a lean-to.
   - IV *Fire*: light a fire by hand, cook, carry a torch through the night, sleep cosy.
   - V *Clay and copper*: fire a pot, mine ore, smelt copper.
   - VI *Iron*: charcoal, bloomery, first iron tool, (survival) the beacon.
   Pages also collect **creatures** (grump, thornback, bunny, bees: the first time you meet one and the first time you beat one), **places** and **recipes** (in the island's words). A finished chapter pays insight/sparks and a journal stamp.
2. **Tribe asks** (dynamic quests). Every ~4 min of possession, a tribe-mate near home posts one ask, chosen from what the colony actually lacks (the same need logic as `I.buildNeed`/`chooseBuild`):
   - "bring 3 logs for the hut" · "the fire's dying: wood pieces" · "a thornback is scaring the kids" · "find where the vines grow" · "Kora is sick: healroot" · "show me how you made that" (stand next to them and craft it: a teach ask).
   - Rewards (no loot tables): opinion (+20 "helped me"), **trust** (orders work better back in god mode), a gift from their bag, **they teach you an idea they know**, or a title.
   - At most 2 open asks, each expiring in a day. The ask board is the campfire's pole: walk up and press E.
3. **Body skills** (per smol, 0–10): **chop, knap, mine, hunt, fight, forage**, gained by doing (Valheim-style). Each level gives +6% speed or yield, −5% wear and, for knapping, fewer slips. Shown as small pips on the portrait card. AI smols gain them too, slowly, so a smol's skills tell you about its life.

### Death and what it costs
- **Faint (survival default)**: at 0 health from a hit, a cut or the cold, you black out (screen to black, heartbeat). Everything in your paws, belt and bag drops **where you fell**, as a marked pile on the compass. You then:
  - get carried home if a friend is within 25 m (the existing friend tag-along, given a new "carry" job), waking with a **bruise and a sprain**; or
  - wake at your lean-to, hut or nest at dawn, or after 90 s if it's day, at 30% health and hungry.
  - A second faint within 5 minutes, drowning, starvation, or a faint while sick → **real death**.
- **Real death**: the smol dies like any smol: grave, epitaph, funeral by culture, grief. The losses:
  - **The body and its brain**: the net you spent hours shaping is gone, unless it had kids, who carry its echoes and some of its skills. That's the real, emotional cost, and why lineage matters.
  - **Its ideas**, if nobody else knows them (this could start a dark age: "lashing was lost with Pip"). Story poles protect against it, which gives sim players another reason to build them.
  - **Its gear**, left at the death spot. Tribe-mates (or you, in your next body) can go and get it (a corpse run).
  - **Not** your journal, recipes-you've-seen or chapters: player knowledge stays.
  - In god mode: back to the sky, with the existing death screen plus a line saying what was lost. In survival mode: choose an heir. If no tribe-mate is left, game over, with a summary and new game+ (heirs of your best line, as the existing NG+ does).

---

## 5. Fit with the existing code

### What's already there
- `possess.js`: movement, look, `P.look` targeting, `verbFor` (tier-gated E/F/R), `doVerb`, `learn()` imitation, `P.recipes`/`P.make`, build sites by hand, the HUD (bars, hotbar, compass, clock, toast, grump/night warnings), the death screen, phone stick/look/buttons. It's a solid base, and most of this plan is extending `verbFor` and adding HUD bits.
- `ideas.js`: the idea list, TRIGGERS, `I.learn`/`discover`/`observe`, `GATHER`, `I.use` (axes chop with `n.chop`, `I.fell` → logs and stumps), `craft`, `stationFor`, `deliver`/`work`. New ideas slot in as data.
- `core.js`: `KINDS`/`NODES`/`STRUCTS` are data. New items (vine, sharprock, woodpiece, bark, cord, pickhead, primtool, stonepick, pointstick, charcoal, rustore, ironbloom, iron, ironaxe, ironpick, ironknife, ironspear, hide, dirt, grub) and nodes (vines, digspot, rustrock) are additions only. Append them so worldgen node ids stay stable, as v2.1 did with food plants on their own random stream.
- `creature.js`: `carry`/`bagCap`/`hasKind`, the hit path with `whacked`, `startAction`, chemistry (health, pain, cold, sick, toxin), death and causes, habits.
- `world.js`: weather, fire spread, `dropFrom`, abandoned tools weathering, `tempAt`, lights.
- `sites.js`: pod wrecks and crashes (for the sky iron loot) and ruins carvings that teach ideas (for recipe pictograms).
- `firsthour.js` wishes, `orders.js` trust, `social.js` memories, opinions and titles: the plumbing for asks and their rewards.
- `mind.js`: places map and sharing. `save.js`: delta saves.

### What's new, with sizes
| Piece | Where | Size |
|---|---|---|
| Pile detection + fiddle + hint adjectives + learn-progress bubble | possess.js (+ ideas.js `pileMatch`) | **M** |
| New items, nodes and ideas (data) + TRIGGERS + GATHER entries + worldgen placement for vines, dig spots, rust rock (new streams) | core.js, ideas.js, worldgen.js | **M** |
| Node HP for rocks and veins (generalise `n.chop` → `n.hp`), crack decals, tool **wear** (`it.data.wear`) | ideas.js, world.js, render/meshes (decal) | **M** |
| AI use of the new tools (findSource for vines, the new primitive-tool path, recipes the planner can chain) | ideas.js planner | **M** (needed for sim parity) |
| Stamina meter, wet, cosy buff | chemistry.js, possess.js HUD | **S** |
| Injuries (`c.wounds` [{kind,t}], bind action, speed/health effects) | creature.js, possess.js | **S** |
| Faint, carry-home, death pile, respawn at lean-to | possess.js, creature.js (`die` intercept when `_pov`) | **M** |
| Grump hunting a lone possessed smol + wind-up telegraph + hop i-frames | creature.js grump branch, possess.js | **M** |
| Thornback (new species: AI, sprite, drops) | creature.js, pixel.js, bodies.js | **L** (the art and AI are the big part) |
| First-person darkness / lit radius + fear panic | render.js pov path (light uniforms exist), possess.js | **S/M** |
| Body skills (data + gain + echo) | creature.js, genome echo | **S** |
| Paw journal (chapters, pages, doodles) | new `journal.js` + ui | **M** |
| Tribe asks (generator, board, rewards) | new `asks.js` (built on firsthour wishes) | **M** |
| Charcoal mound, bloomery, anvil minigame, iron tools | ideas.js, core.js STRUCTS, possess.js minigames | **L** |
| Survival mode (create-world flag, start possessed, heirs, beacon ending) | main.js, title.js/ui create world, possess.js, intro.js ending variant | **M/L** |
| Lean-to, mud wall, pit trap structs + meshes | core.js, meshes.js | **M** |
| Imitation filter + outcome bonus + "habits picked up" toast | possess.js `learn()` | **S** |
| Tests: tools.test (wear, recipes, ladder), new survival.test (faint/death, piles, asks), sim soak to check AI parity and no starvation | tests/ | **M** |

**Terrain**: don't deform the heightmap for digging. Chunks are baked meshes, and A*, walkability, save deltas and determinism all assume fixed terrain. Use dig-spot nodes, a hole decal, and the pit-trap struct (a structure whose mesh is a hole). If real digging is ever wanted, it's a separate L/XL project.

### Phone-friendliness
- **One context button does almost everything** (it already does): E covers hit, gather, fiddle and eat. Keep F (alt) and drop. Replace "make" with a **bag button** that opens a 4-slot radial (equip, eat, drop to pile). The make menu lives in the radial.
- **Piles are thumb-friendly**: drop, drop, drop, tap the pile. You never drag between inventory grids.
- **Combat**: tap to swing (E auto-targets the creature under the crosshair, within 30° of aim on touch). **Dodge = hop button + stick direction**. The wind-up is shown as a red flash on the edges of the screen plus a sound, so it reads on a small screen.
- **Minigames are tap-in-time** (fire drill, bellows, anvil), with big ring prompts in the middle of the screen and no precision drags.
- **HUD on phones**: bars are already scaled 0.8. Add a stamina arc around the act button rather than a fifth bar, put the wear pip on the tool icon, and make the ask and journal card collapsible to one line under the compass.
- Performance: piles and decals are a handful of instances. Darkness is cheaper (a smaller far plane at night). The thornback is one more sprite atlas row.

---

## 6. Suggested build order (vertical slices)
1. **Slice A, "first tool"** (≈ M+M): vines, sharp rock, pile crafting with hints, primitive tool, node HP/wear, felling-by-doing, splitting, lean-to, imitation filter. Playtest: does a tool-user reach the primitive tool in 5–8 min, and does it *feel* discovered?
2. **Slice B, "first night"** (≈ M): darkness, hunting grumps with wind-up/dodge, stamina, wet, cosy, faint + corpse run, fire drill.
3. **Slice C, "a reason to come home"** (≈ M): tribe asks, teaching-by-showing, body skills, journal chapters I–IV.
4. **Slice D, "survival mode"** (≈ M/L): the create-world option, heirs, insight hints.
5. **Slice E, "iron"** (≈ L): stone pick → copper gate change, charcoal, bloomery, sky iron, iron tools, the beacon ending, thornback.

Each slice keeps the sim-only game whole: run the 2 h unattended soak after each one and check that the AI uses the new chain (or at least isn't starved by it) and that headless pacing still matches DESIGN §6.

## Open questions for the owner
- Copper ore currently needs tier 4 plus a hammer. This plan moves it to a stone pick at tool-user so the possessed ladder flows. Smelting stays at thinker, so the sim's pacing barely moves. OK?
- Should survival mode allow the god hand at all? (I'd say no; insight hints replace it.)
- Is real death in god-mode possession too harsh for the cosy audience? (The default faint rule should cover it. *Cosy* removes bleeding and hunting.)

---

### Sources
- [Rustafied: Tools in Rust](https://www.rustafied.com/tools-skills-stats-and-summaries) · [Rust beginner guide (gamecat)](https://www.gamecat.it.com/articles/rust-beginner-guide) · [Rust: first weapon (GameSkinny)](https://www.gameskinny.com/tips/rust-guide-how-to-make-your-first-weapon/)
- [Valheim boss & biome roadmap](https://www.bamboogaming.net/valheim/progression) · [Valheim boss and biome progression (Guild Order)](https://guildorder.com/games/valheim/wiki/boss-and-biome-progression) · [How comfort works in Valheim](https://www.corrosionhour.com/valheim-how-does-comfort-work/)
- [Don't Starve: All About Night](https://dontstarve.wiki.gg/wiki/Guides/All_About_Night) · [Don't Starve day-night cycle](https://dontstarve.wiki.gg/wiki/Night)
- [Ancestors: new generations and evolution (Prima)](https://primagames.com/gaming/ancestors-the-humankind-odyssey-new-generations-evolution) · [Ancestors reviews (TrueAchievements)](https://www.trueachievements.com/game/Ancestors-The-Humankind-Odyssey/reviews)
- Minecraft, Terraria and RimWorld points are from general knowledge of the games, not from fresh sources.
