# smol brains: the combined plan (two games in one)

Built from the five design reports. It builds on what's done or in flight: the towns/money/eras branch, the disasters/raids/kidnaps branch, grown-up faces, the 4.2 art and the pixel-art reskin.

---

## 1. The pitch

smol brains becomes two games on one island. From the sky, you raise a species: teach words, guide breeding, and watch real neural-net brains grow over generations from blobs to towns. Tap a smol and you drop into its eyes, and the same island becomes a survival game: bash rocks, tie a stick, a vine and a rock into your first tool, survive a night with grumps hunting you, dig a field, raise a house, go down a mine. Each game feeds the other. The smol you drove keeps your habits and passes them to its kids, the tribe learns your recipes by watching, and the tribe's towns and walls keep you alive. Over a long game the smols climb real human history, from fire to bronze, iron, printing, steam and the first wobbly cars, while grump clans with spears and bows push back harder each year. Underneath runs a mystery: who the grumps are, what the island is, and what you, the sky, really are.

## 2. How the two games fit together

**The rule:** possession makes things faster and personal, never exclusive. A god-only player can reach everything through the AI. A survival-only player gets a full game in Survival mode.

**What possession gives the god game:**
- A recipe you invent is credited to that smol in the chronicle, and smols within 7 m learn it 3× faster than from an AI demo.
- The smol's brain copies your good moves (hitting friends is filtered out), and its kids are born leaning toward what you practised (capped so it isn't an exploit).
- Logs you carry go into the tribe's huts. Houses you build become homes, and builders can copy the design.

**What the god game gives you:**
- **Knowledge:** the grandmother knows nine recipes but tires fast; the teenager is strong but knows two. Who you possess is a real choice.
- **A body:** evolution literally upgrades your legs and hands.
- **Safety and friends:** huts are respawn points, palisades turn night into tower defence, friends tag along, and tribe-mates post asks at the campfire ("bring 3 logs for the hut", "Kora is sick: healroot") that pay in trust, gifts and taught ideas.

While you're possessed, colony-wide disasters queue and small encounters spawn near you instead (a boar in the brush). When a big raid starts, the card offers "go down and fight beside them".

## 3. The pillars

### 3a. Survival and tools

**The loop:** hit something, it reacts (chips fly, the tree creaks, a drop pops out), decide what to carry (paws, one tool, two bag slots), check your bars. A new stamina bar makes swings feel physical. No thirst bar: it's a chore with no decision. Each 20-minute island day ends in a race home at dusk. Sleeping by a fire or under a roof gives "cosy" (faster stamina, skills and healing).

**Two gates on every tool:** the body (no hands, no gripping) and what this smol knows. A locked action says why: "your paws can't grip yet".

**The ladder:**

| Body | What you can do |
|---|---|
| Blob | Eat, hop, hide in a bush. |
| Critter (legs) | Run, dig with paws at soft dig spots (roots, grubs, clay, buried things). |
| Tool-user (hands) | Bash a rock for a sharp rock, then **stick + vine + rock = primitive tool**, also your first weapon. Trees topple into logs, and after ~8 hits the smol learns felling by doing. Then split logs, stone pick and axe, fire drill, lean-to (your first base). |
| Tribe / builder | Bows, slings, shields, calls to followers; build by hand, mud walls, pit traps. |
| Thinker | Kiln, charcoal, copper, then the bloomery and iron tools. |

**Recipes are discovered, not read.** Drop things together and "fiddle with the pile". A near match gives a hint ("…needs something bendy"); three good fiddles and the smol shouts eureka in the island's own word. After that the make menu repeats it.

**Iron is a goal you see from day one:** "sky iron" plates in every pod wreck, "too hard to break, too heavy to shape, someday", usable once the tribe has a bloomery.

**Hard, but fair:** true darkness away from fire (a panicking smol squeaks and draws grumps); grumps that hunt a lone smol at night with a 0.6 s wind-up you can hop away from; one daytime beast, the thornback, that stuns itself on a tree if you sidestep its charge; rain that puts out torches; three wounds with obvious fixes (a bruise heals, a cut bleeds until bound, a sprain slows you); tools that wear out.

**Death:** at zero health you faint and drop your bag where you fell, then wake at your bed or get carried home. A second faint within 5 minutes, drowning or starving is real death, with a grave, grief, and lost ideas if nobody else knew them. Presets: cosy, survival (default), hardcore.

**Body skills** (chop, knap, mine, hunt, fight, forage) grow by doing. A **paw journal** with chapters ("First grip", "Wood and stone", "Fire", "Iron") gives clear goals.

**Survival mode** (a Create World option): you're a founder at the crash, starting as a critter. No god hand; "insight" buys journal hints. When your smol dies you take over an heir, and your habits echo into your children, so you evolve your line by how you play. The ending: repair a pod beacon with iron, copper and a crystal.

### 3b. Land and building

- **Resources run out and come back.** Trees fall with a creak and lay their logs along the trunk; stumps regrow and you can plant saplings, but a clear-cut regrows slowly, so the land remembers. Boulders shrink to rubble. Surface ore runs out after 3, marking where to dig down. Loose stone and dirt stack into piles.
- **Dirt only when it means something.** You never place dirt as a block. You move earth (dig, raise, flatten) or turn it into something: tilled fields, irrigation trenches that fill from the river, moats grumps can't cross, levelled ground for hillside villages, mud bricks, wells, root cellars (food rots 3× slower), paved roads (+25% speed).
- **Mines:** tunnels and shafts on up to three levels underground. Dig rock faces, place ladders and props, follow copper veins that get richer with depth, find glowing crystal geodes. Smols mine too. A cutaway circle lets god view see down. Wide spans without props cave in.
- **Free-form building while possessed:** foundations, walls, doors, floors, roofs, stairs, plus hearth, bed, chest and workbench, snapping on a grid. Materials follow tier (wattle, log, mud brick, stone, brick). Unsupported spans fall; wood burns, stone doesn't. Smols move into anything with a roof, walls and a door, and builders can learn your design and keep building it as "Ula's house" (it can be lost in a dark age like any idea). Phones get a two-tap "auto-house".
- **Smols build presets piece by piece.** No more squashed-mesh progress bar: footings, posts, walls, door and roof drop in one by one with a "tok", and the site says what it's waiting for ("walls 2/3 sticks · roof needs 3 fibre"). No new art needed; the meshes are already code.
- **Bigger mountains:** real ranges 45–100 tall on a medium island (up to ~130 on extra large; today's peaks are about 30), with passes, alpine meadows and snowcaps. First person shows them on the horizon, climbing is slower, and a summit clears the fog for half the island. New islands only; old saves stay identical.

### 3c. Tech ages: to cars, guns and cities

**Three things move separately:** tier (genes: what one brain and body can hold), settlement (band to city, already in the towns branch), and the new **Age** (what the people know: stone, new stone, bronze, iron, mills and bells, powder and print, steam, motor and spark, signal). The HUD reads "a bronze age town". An Age slides back into a dark age if everyone who knows its key ideas dies and nothing written keeps them.

**Inventing and using are different.** A builder can drive a car or work a loom. Thinkers invent most things from bronze on, and only ascended smols finish the last Age. That's how history worked too: a brain from 50,000 years ago could have run a steam engine; what it was missing was culture. So smols are on the same path people walked, and evolution keeps pushing their minds further along it.

**How they invent (no research points):**
- **Moments:** green ore near a hot fire leads to smelting.
- **Tinkering:** curious builders combine things at a fire. Most tries fail ("i stuck the gear to the fish. it is not better"); near misses leave clues.
- **Pressures:** long hauls push toward the wheel, a shrinking forest toward coal, flooded mines toward steam. The civ panel says why: "the haulers are tired".
- **The collective brain:** more connected minds invent faster, so a road between villages speeds both up.
- **Prototype generations:** big inventions improve with use. The car goes "fire cart" (stalls every 30 s, bonks into walls), "puffer" (fuel from the apothecary, like Bertha Benz in 1888), four-wheeler, assembly-line box car, then bus and truck.

**What you see by Age:** bronze brings carts pulled by tamed "plodders" and tin traded from afar; iron brings stone roads and forests cut for charcoal; mills and bells bring watermills, castle walls and clock towers; powder and print bring books that can't be lost, cannons and muskets; steam brings coal mines, rails, factories and soot; motor and spark bring cars, asphalt, street lights and towers. Pollution is a world layer that rain clears and clean power heals.

**Cities at realistic size:** one tile is about 2 m, so an extra large island (~2 km across) can hold 30,000–60,000 people. Only 40–100 are full Minds with brains. A few thousand near the camera are walking citizens on a timetable, and the rest are census numbers per district. Tap any citizen and it becomes a full Mind with a name and genes. Buildings come from a modular kit that gets simpler with distance, and far-off traffic is moved by the graphics card at no game cost.

**Guns** have smoke and a "pop". They end raids faster and change politics (guards carry muskets, the council can ban them). Smols and grumps can die, but nobody bleeds on screen; beaten grumps rout and carry their wounded.

**Pacing:** the long road takes about 12–15 hours. The end card compares the run with Earth: "fire to the first car in 9 h 40 m. Humans took about a million years."

### 3d. Challenge and grumps

**Core rule:** every threat has a cause you can see and a lever you can pull. Grumps raid because they're hungry, angry at you, or have noticed you're rich and weak.

**Less cuddling:** love builds in ~3.5 minutes, not 50 seconds; an egg every ~15 minutes, not 2.8; courting mostly in spring; a housing cap from builder. Hearts only for partners and parents. Courtship is short and readable (friends, gifts, a partner ceremony at the fire), and gifts can be turned down. Adults get a "duty" drive, so idle adults feel useless. Babies and blobs stay pure cute.

**Grumps become a people,** the Hrum: 2–4 clans per island, each with a territory, a "Big Belly" chief and a "Smoke-Mother" shaman. Camps are real villages (tents, meat rack, lookout, thorn ring) that sleep at noon, your rescue window. Raiders come in roles you can read at a glance: crouched scouts who snatch kids and food, spears, archers who pick off lone workers, shield brutes who smash walls, and the Smoke-Mother whose drum keeps them brave. Parties hold formation and rout when their nerve breaks.

**They get harder by copying you.** The threats branch already teaches them ladders, rams and torches. That grows into slings, bows, stolen copper, war-hogs and later muskets; clans that never made peace reach rifles and raid rail lines. A kid held more than a game day is raised by grumps and comes back in later raids under its own name.

**Pacing (the storyteller):** a threat budget grows with population, wealth and Age, eases after losses and grows in long safe streaks. A tension meter blocks bad cards after a hard stretch. Three storytellers: Grandmother Moss (calm), the Weaver (balanced), Old Thunder (wild). Every threat is announced: drums before a raid, smoke before a siege, a sneeze before sickness. Every autumn the **war moon** brings a siege, announced two days ahead; clans at peace stay home. One winter in three is a forecast **long winter**. The cosy promise: raids stay small before builder, and never kill more than 2 before thinker.

**Defence:** gates, watchtowers (+30 s warning), an alarm drum that sounds "run!" and "fight!", armoury racks, ditches, stone walls, fire buckets. Guards are a job, so they don't farm. Smols learn to fight with their real brains: sparring against a grump dummy teaches "hit grump" safely, and a village that drills breeds braver kids. Veterans steady others; shaken smols flee.

**Three fates for each clan:** enemy, ally (parley, a peace feast under the "salt law", a trade post and caravans), or absorbed. Absorbed grumps move in as strong, hardy citizens, and over generations their minds grow back too. Never require war. Always make it tempting, because grump land has the best flint and crystals.

### 3e. Lore

**The story in one breath:** the island is a **Cradle** built by the long-gone **Lanterners**. A deep field, **the Hush**, shrinks every mind that lands so it can grow back slowly and well; that's why the smols started small, and why they're growing back toward minds like ours and beyond. The smols fled their dimming world, Vesh, in an ark guided by a crystal **Thought Engine**. The grumps are the **crew of the warship** that chased them: their own mind-machine once swallowed their civilisation, so they hunt every Engine. Their ship crashed generations earlier (it's the forbidden **Iron Hill**) and the Hush made them primitive. You, the sky, are what's left of the Lanterners, and **you run on the smols' thinking** (that's what sparks are). The grumps say "the sky eats thinkers", and they have evidence.

**Found, never dumped:** 12 ark logs (from 7); late pod survivors who remember Vesh perfectly and forget a little each time you talk; warship tablets that need a smol who speaks grump; Lantern murals readable once the tribe writes; relics on a shelf; a mystery board of questions with clues pinned on. Elders retell your real history at the fire and it drifts into legend ("three grumps" becomes "a hundred") until a story pole freezes it. Sky memories at spark milestones show the god's past in 10-second visions.

**Mid-game shock:** a clan opens the Iron Hill. Its "Wakers" carry crystal-fed thunder-rods that break walls, and they start raiding crystal caves. Taking the Iron Hill is the first big possessed expedition. It gives smols relic weapons, the warship logs and a jump into iron.

**The ending choice:** when the spire completes, the god speaks for the first time. **Go home** (today's ending: the ark returns), **join the sky** (become the Gardener; new game+ starts with more of you), or **stay** (the long road into the city ages, ending later with a crystal-tuned radio mast that answers the ark). New game+ islands are "Cradle 3 of 7".

---

## 4. Contradictions resolved

| Question | Choice | Why (one line) |
|---|---|---|
| Terrain: dig spots, height edits, caves or voxels | Dig spots for critters, height edits on the surface, layered caves underground. No voxels. | Physics, AI, saves and phones keep working, and it isn't a Minecraft copy. |
| Tech "Age" vs eras | Two axes: settlement (existing eras) and Age (new). The lore's era list folds into Ages. | An iron-age village and a stone-age town both existed. |
| Grumps: space crew or natives | Both: a warship crew shrunk by the Hush. | The intro stays true and the gap becomes the mystery. |
| Do grumps industrialise? | They copy up to muskets; only never-at-peace clans reach rifles. | Rising difficulty, with peace as the lever. |
| Possessed death | Faint first, death on a second faint. | Real stakes without one bad night ending a 3-hour run. |
| Survival start | Founder twins, as a critter. | Reuses the opening and gives lineage a partner from minute one. |
| Endings | Spire keeps a three-way choice; "stay" leads to the long road's radio-mast ending. | The short game still ends in ~5 h; the long one gets its own payoff. |
| First iron | Sky iron (visible, locked), then the bloomery; the Iron Hill as a leap. | One early visible goal, one dramatic shortcut. |
| Combat numbers | One whole-number hit-point table for AI and possession. | Two scales would drift apart. |

## 5. Engine and platform

**Stay in the browser for now.** The real limits are mostly not the browser: the whole simulation runs on the same thread that draws the screen, terrain has no underground (the layered caves fix that in any engine), cloud saves cap at 512 KB, and in first person the browser owns Esc and Ctrl+W. An engine's web build would be heavier and *worse* on iPhones.

**Do now (about 4–6 weeks alongside features, nothing visible):** move the simulation to a background thread (a Web Worker), move saves to the browser's bigger database (IndexedDB) compressed, raise or split the cloud-save cap, add a memory and frame-time readout, and raise the smol cap from 36 toward 200.

**Ship to Steam at 5.0** in an Electron wrapper (a desktop app around the same code): no keyboard problems, no save limits, achievements. The web version stays free as the front door.

**Move to Godot 4** (free, open, native phones and consoles) only when one trigger fires: (1) after the refactor, mines plus building can't hold 30 fps with 200 smols under 400 MB on an iPhone 13 or Pixel 7-class phone; (2) consoles become a funded goal, or Apple rejects the iOS build twice; (3) Steam sales (around $50k) can fund a 6–9 month port; (4) physics vehicles and full cities are scheduled and a browser physics library can't carry them. Then port alongside the live game, as Vampire Survivors did. First check: after 5.1.

## 6. Release roadmap

Sizes are for AI-assisted work: S is under a week, M is 1–3 weeks, L is 1–2 months.

| Version | Name | What the player notices | Size |
|---|---|---|---|
| **4.3** | Not so cosy | The towns and threats branches land (roads, markets, council, raids, kidnaps, disasters). Grown-up faces that smile only when happy. Fewer hearts, slower love, real partners. Taps on tall peaks work. | M |
| **4.4** | First tool | Possessed: bash rocks, pull vines, fiddle a pile into stick + vine + rock = primitive tool (5–8 min in). Trees topple, boulders shrink, logs split. Stamina, lean-to, tool wear. | M |
| **4.5** | Spears and bows | Grump scouts, spears, archers, brutes and Smoke-Mothers. Arrows both ways; smol slings, bows, shields. Routs, real camps, grump-raised kids, "fight beside them". | L |
| **4.6** | First night | First-person darkness, grumps that hunt you (dodge the wind-up), faint-then-death, wounds, wet and cosy, fire drill, tribe asks. | M |
| **4.7** | Watch them invent | Age on the HUD, tinkering with clues, pressures ("the haulers are tired"), collective brain, a first-inventions gallery, the cart in three generations. | M |
| **4.8** | Piece by piece | Buildings go up visibly piece by piece and say what they need. Mystery board, 12 ark logs, late pod survivors. | M |
| **4.9** | The war moon | Three storytellers, warnings, the autumn siege, the long winter. Gates, towers, alarm drum, guards, training yard. | L |
| **4.10** | Dig and till | Dig, raise and flatten. Fields, irrigation, moats, wells, root cellars, mud bricks, paving. Stone pick opens copper. Bigger saves. | M–L |
| **4.11** | Grand mountains | Real ranges with passes and snowcaps on new islands, seen on the first-person horizon. Summits clear the fog. | M–L |
| **5.0** | Two games in one | Free-form house building that smols live in and copy. Survival mode with lineage, journal and skills. Steam Early Access. Needs the background-thread refactor. | L |
| **5.1** | Mines | Shafts and tunnels on three levels, ore veins, geodes, ladders, cave-ins, smol miners. Engine checkpoint. | L |
| **5.2** | Bronze and iron | Tin trade, bronze, tamed plodders pulling carts, charcoal, bloomery, iron tools, sky iron, stone roads. | L |
| **5.3** | Clans and the Iron Hill | Clan panel, grump talkers, parley, feasts, trade, absorption. The Iron Hill, thunder-rods, the expedition. | L |
| **5.4** | Cities | Census, walking citizens (tap one to make a Mind), the building kit, lit windows, "watch it grow". Phone test of 10k buildings early, alongside 4.9. | L |
| **5.5** | Mills, powder and print | Watermills, clock towers, castle walls; books that can't be lost; gunpowder, cannons, muskets both sides; plague. | L |
| **5.6** | Steam | Coal, flooding mines, pumps, engines, factories, rails, soot, sewers. | L |
| **5.7** | Motor and spark | Cars Mk0–Mk4 over generations, asphalt and traffic, trams, street lights, towers, radio. | L |
| **6.0** | The signal | The three-way ending, the radio-mast ending for the long road, endings shaped by pollution and peace, new game+ Cradles, the history ribbon. | M |

## 7. Decisions for the owner

1. **Less cuddling** (egg every ~15 min not 2.8, hearts for partners and kids only, housing cap)? *Recommend: yes, tuned with population sims.*
2. **Possessed death:** faint first, death on a second faint, cosy and hardcore presets? *Recommend: yes.*
3. **Copper** mined with a stone pick at tool-user, smelting still at thinker? *Recommend: yes.*
4. **Terrain:** height edits plus layered caves, no voxel blocks? *Recommend: yes; it stays ours and phone-friendly.*
5. **Grump lore:** shrunken warship crew, and a sky that feeds on thinking (a darker seam you resolve at the end)? *Recommend: yes.*
6. **Guns and killing:** guns on both sides, deaths but no gore, grumps rout with their wounded; smol-vs-smol war only from thinker on, behind a setting? *Recommend: yes.*
7. **Survival mode without the god hand** (insight hints instead)? *Recommend: yes.*
8. **The long road to cars** as a Create World option, off until tuned? *Recommend: yes.*
9. **Steam Early Access at 5.0** in a wrapper, web stays free, no engine switch unless a trigger fires? *Recommend: yes.*
10. **New art drawn in code first,** reskinned through the art hooks once you pick a style? *Recommend: yes, so features never wait on art.*

## Owner's answers (2026-10-21)
1 yes · 2 changed: zero health while possessed = the smol dies, you're ejected (no faint) · 3 yes · 4 yes for now · 5 yes · 6 yes · 7 on hold · 8 changed: the long road to cars/guns/cities is part of the normal game, reachable before the end game (not an option) · 9 yes · 10 yes, and smols themselves get the HD pixel treatment.
New asks: Minecraft-style hotbar + inventory + clear building in first person; Minecraft-like vitals icons; smols must not vanish up close (3D models); survival must be much more understandable. Owner will replay, then get others (girlfriend) to playtest.
