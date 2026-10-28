# smol brains: the long road. A tech arc from stone tools to the first cars

Research and design plan, 2026-10-21. Nothing in the repo was edited.

**Sources read.** `games/smol-brains/DESIGN.md`; `ideas.js` (the idea web, `TRIGGERS`, pondering, `discover`); `core.js` (`KINDS`, `NODES`, `STRUCTS`); `director.js` (vision card); `words.js`; `title.js`; and render chunk instancing. On the eras branch (`.claude/worktrees/agent-a2961237ccfc2c2f1`, commit `ae025da` "phase B, from village to city") I read `civ.js` (eras band→village→town→city, jobs, roads, districts, council, law) and `economy.js` (favours→tally→shells→copper, stalls, prices). I also used the earlier `research-colony.md`, which proposed an 11-era ladder.

**Note on the branch.** That worktree is in the middle of a merge, with unmerged files (`UU`): `main.js`, `ui.js`, `save.js`, `genome.js`, `play/index.html` and `tests/_load.js`. Its `DESIGN.md` doesn't describe phase B yet. Everything below assumes phase B lands first.

**History sources.** History is cited from standard sources: dates as generally accepted, with debated ones marked "c." or "debated". These works shaped the design:
- Henrich's "collective brain": cumulative culture depends on population size and connectedness. The loss of Tasmanian tools is the classic case (Henrich 2004).
- Kremer (1993): population size and the rate of technological change.
- Morris, *The Measure of Civilization* (2013): energy captured per person as the spine of history.
- Allen, *The British Industrial Revolution in Global Perspective* (2009): high wages plus cheap coal made labour-saving machines pay.
- Wright (1936): the learning curve. Costs fall at a fixed rate each time cumulative output doubles.

---

## 0. The big decision: two axes, not one ladder

Real history has two things that move separately:

- **How big and organised the settlement is**: band, village, town, city, metropolis.
- **What the people know how to do**: stone, bronze, iron, steam, motor.

An iron-age village and a stone-age town both existed. Phase B already built the first axis (`SB.Civ.ERAS`: band/village/town/city). This plan adds the second axis, **Ages**, next to it rather than replacing it. The HUD then reads like a history book: *"a bronze age town"*, *"a steam age city"*.

| axis | what drives it | lives in | slides back when |
|---|---|---|---|
| **Tier** (exists) | genes: body + brain size | each smol's genome | never (it's evolution) |
| **Era / settlement** (phase B) | population, buildings, institutions | `game.civ.era` | a slump of 180 s (exists) |
| **Age / tech** (new) | keystone ideas held by *living* smols or kept in books | `game.civ.age` | the last holder dies and nothing written keeps it: a dark age |

**How tiers fit.** Tiers cap what one brain can *hold*. Ages are culture.

Real human brains haven't changed in 50,000 years. The Industrial Revolution was cultural, not genetic. So each idea gets two tiers:

- `invent`: the tier needed to come up with it.
- `use`: the tier needed to use or operate it.

A builder (tier 4) can drive a car or work a loom. Only thinkers (tier 5) invent most things from the bronze age on. Ascended smols (tier 6) are needed only for the last age. This keeps the evolution game meaningful: you need thinkers to move forward, and ascended smols to finish. It also stops the long road from asking for brains bigger than the ones that already exist.

| tier | invents | uses / operates |
|---|---|---|
| 🪵 tool-user (2) | stone age crafts, fire | the same |
| 🔥 tribe (3) | bows, song, rafts | Neolithic tools, carts (pushing) |
| 🛖 builder (4) | Neolithic: farming, pottery, huts, the wheel | everything up to the motor age: drives carts, wagons, trains and cars; works mills and looms |
| 🧠 thinker (5) | bronze → motor (most ideas) | everything |
| ✨ ascended (6) | the signal age (the ending) | the big thought |

**The ending.** The current spire (crystal + ascended, about 5 h in) stays as **the short road**. A new Create World option, **the long road**, gates the big thought behind the signal age: radio plus the crystal mast. The last ark log already says the big thought is *a signal*, and radio is literally a signal (section 4.5). Default the long road off at first, then on once it's tuned.

---

## 1. The tech ladder: ten Ages grounded in real dependencies

### How to read this section
- **Keystone**: the ideas living smols must hold for the Age to count. This works like `Cv.needs`, and the Age slides back if they're lost.
- **Prerequisites** come in five kinds, matching what really gated each step: **materials** (new nodes), **energy** (heat level or power source), **knowledge** (`needs`), **population** (census or minds, or a number of specialists) and **trade** (things from far away).
- **Real date** is when it first appeared anywhere, for flavour text and the comparison card at the end.
- **Existing ids** are marked ✓ and **phase B ids** ✓B. Everything else is new. New ids are *appended* to `I.LIST` to keep invented words stable, as the file asks.

### The energy and heat spine (one hidden number per settlement)
Each step in metalworking was a step in how hot a fire could be made. That gives a clean, real, invisible gate, and it makes accidental discoveries believable.

| heat level | how it's reached | real temperature | unlocks |
|---|---|---|---|
| H1 campfire | ✓ campfire | ~600–800 °C | cooking, low-fired pottery |
| H2 kiln | ✓ kiln (enclosed, insulated) | ~900–1100 °C | pottery, copper smelting (copper melts at 1085 °C) |
| H3 bellows furnace | kiln + bellows (leather, so needs hides) | ~1200 °C | bronze casting; **bloomery iron** (iron is reduced while still solid: a spongy bloom you hammer) |
| H4 blast furnace | tall shaft + water-powered bellows | ~1500 °C | cast iron that pours; the furnace never stops (needs a steady charcoal or coke supply) |
| H5 coke / hot blast | coal turned into coke (Darby, Coalbrookdale, 1709) | ~1500 °C+, scales up | iron for engines and rails |
| H6 converter | air blown through molten pig iron (Bessemer, 1856) | ~1600 °C | cheap steel: rails, frames, springs, guns |

There's a matching **power spine**:
- muscle (smols)
- animals (draft beasts: oxen by c. 4000 BCE)
- water (watermills)
- wind (✓ windmill)
- coal steam
- oil and electricity

Morris estimates energy capture of ~4,000 kcal per person per day for foragers, ~12,000 for early farmers, ~30,000 for the Roman/Song peak, and ~230,000 for modern Americans. Show this on the civ card as **"energy per smol"**. It's the single best number for "how far along are we".

### The Ages

#### Age 0 · Stone (Old Stone Age). Exists, tidy up only
- **Keystone**: ✓fire + ✓knap.
- **Real history**:
  - stone tools by 2.6 million years ago (Oldowan)
  - controlled fire c. 1 million years ago (Wonderwerk Cave), habitual by ~400,000
  - wooden throwing spears c. 300,000 years ago (Schöningen)
  - the bow by ~64,000 years ago (Sibudu)
  - bone needles ~40,000 years ago
- **Ideas**:
  - existing: ✓poke ✓bonk ✓weave ✓knap ✓fire ✓campfire ✓torch ✓cook ✓spear ✓chop ✓club ✓fishing ✓sewing ✓herbal ✓share ✓song
  - new: **bow** (stick + fibre + blade; invent tier 3), **raft** (logs + fibre at water; tier 3), **dog/companion** (critter tamed by sharing meat. Optional; dogs were the first domesticate, ≥15,000 years ago)
- **Prerequisites**: none beyond tier.

#### Age 1 · New Stone (Neolithic): settling down
- **Keystone**: ✓farm + ✓pottery + one of ✓hut / **mudbrick**.
- **Real history**:
  - Pottery came *before* farming (Xianrendong, China, c. 18,000 BCE; Jōmon Japan).
  - Sedentism and monuments came before farming too (Natufians; Göbekli Tepe c. 9500 BCE).
  - Farming: Fertile Crescent c. 9500 BCE (wheat, barley); goats and sheep c. 9000 BCE; cattle c. 8500 BCE.
  - Çatalhöyük held perhaps 3,500–8,000 people on ~13 ha (c. 7000 BCE).
- **Ideas**:
  - existing: ✓farm ✓hut ✓pottery ✓totem ✓wall ✓bridge ✓school ✓granary(B) ✓market(B) ✓paving(B)
  - new: **mudbrick** (clay + reeds, sun-dried; Jericho), **herding** (pens; see *plodders* below), **loom** (cloth from fibre: real weaving of textiles, separate from ✓weave baskets), **brewing beer** (grain left in a pot ferments: an accident), **sledge** (logs + fibre; drags 6 items), **dugout canoe** (log + blade/fire; the Pesse canoe c. 8000 BCE)
- **Prerequisites**:
  - farming ~ population ≥ 10 and food pressure (see section 2)
  - pottery ~ clay + H1
- **New creature: plodders.** A big, slow, wild grazer (the island's aurochs). Smols who feed the same plodder often enough tame it. Tame ones breed in pens. This is the most important missing piece. Jared Diamond's point stands: draft animals gave the Old World ploughs, carts and wagons, and without them there's no wheel worth having.

#### Age 2 · Copper and Bronze: metal, wheels, writing
- **Keystone**: ✓smelt + **bronze** + ✓writing.
- **Real history**:
  - Copper smelting c. 5000 BCE (Belovode, Serbia).
  - The wheel c. 3500 BCE. The oldest surviving wheel and axle is from the Ljubljana Marshes, c. 3150 BCE.
  - The ard (scratch plough) c. 4000 BCE.
  - Writing in Uruk c. 3200 BCE grew **out of accounting tokens** (Schmandt-Besserat). This is exactly phase B's tally → writing path; make ✓tally a soft prerequisite of writing for the long road.
  - Uruk held ~40,000 people on ~250 ha by 2900 BCE.
  - Bronze is ~90% copper, 10% tin, and tin is rare. The Uluburun wreck (c. 1300 BCE) carried ~10 t of copper and ~1 t of tin from different corners of the Mediterranean. **Bronze is the first tech that needs trade.**
- **Ideas**:
  - existing: ✓kiln ✓smelt ✓axe ✓brew ✓bake ✓workshop ✓lens ✓astronomy ✓council(B) ✓tally(B) ✓coins(B) ✓mint(B) ✓law(B)
  - new:
    - **bellows** (hides + sticks → H3)
    - **bronze** (copper + tin at H3)
    - **wheel**: the first *cart* (log rounds → solid wheel; needs ✓axe)
    - **ard plough**: farms +40% with a plodder
    - **sail** (cloth + raft)
    - **bronze sword**: a long blade only became possible with bronze. Copper is too soft and stone too brittle for a sword, so swords appear c. 1600 BCE.
    - **irrigation**: a ditch from a river to a farm, using the existing hydrology
    - **sundial / calendar**
- **Prerequisites**:
  - **tin** (new node; placed only in stream gravels of one far biome, or absent on some islands so it has to come by sea or from strangers)
  - H3
  - ≥2 thinkers
  - era ≥ town (B)

#### Age 3 · Iron and Roads (Iron Age / classical)
- **Keystone**: **bloomery** + **iron tools** + **arch** or **roads**.
- **Real history**:
  - Iron working spread after the Late Bronze Age collapse (c. 1177 BCE). Tin routes broke, and iron ore is everywhere, so iron made tools *cheap* and common rather than better at first.
  - Bloomeries burned large amounts of charcoal (on the order of 10 kg per kg of iron in experimental reconstructions), so iron meant **cutting forests**.
  - The alphabet: Phoenicians c. 1050 BCE.
  - Coins: Lydia c. 600 BCE (phase B already has coins).
  - Roman roads: ~80,000 km of paved road. Roman concrete, the arch and the aqueduct (Aqua Appia, 312 BCE).
  - Pompeii: ~11,000 people on ~66 ha.
- **Ideas**:
  - **charcoal** (a smouldering log pile, an accident by a campfire covered in earth)
  - **bloomery** (bog iron or haematite + charcoal at H3)
  - **iron tools** (better axes and ploughs)
  - **iron sword**, **shield**
  - **horse collar? no**: keep that for medieval
  - **spoked wheel** (lighter: chariots and fast carts)
  - **arch** (stone + lime mortar)
  - **lime mortar / concrete** (limestone burned in a kiln; Romans added volcanic ash: *ashlands*!)
  - **aqueduct**
  - **stone road** (✓paving upgraded to a cambered stone *via*)
  - **alphabet** (writing teaches 2× faster again)
  - **scroll library**
- **Prerequisites**:
  - iron ore (new: bog iron in swamp/mangrove, red ore in mesas)
  - limestone (coral shallows, white cliffs)
  - forest cover (charcoal pressure)
  - era ≥ city (B) for aqueducts and roads

#### Age 4 · Mills and Bells (medieval)
- **Keystone**: **watermill** + **heavy plough** + **mechanical clock**.
- **Real history**:
  - The Domesday Book (1086) counted 5,624 watermills in England.
  - The heavy plough, the horse collar (in Europe by c. 900–1000 CE) and three-field rotation together raised food per worker, and that surplus fed the town boom.
  - The European post windmill (1180s), so ✓windmill is already here.
  - Paper reached Europe from China (invented c. 105 CE) via the Islamic world, by c. 1100s.
  - Mechanical clocks in towers c. 1280s.
  - Blast furnaces in Europe c. 1150–1350 (Lapphyttan, Sweden). China had cast iron ~1,500 years earlier.
  - The Black Death (1347–51) killed perhaps 30–50% of Europe. It's the model for the plague dark-age event.
  - Medieval London c. 1300: perhaps 40,000–80,000 people within ~1.3 km² of walls.
- **Ideas**:
  - **watermill** (placed on high river flow, using `worldgen` flow accumulation!)
  - **heavy plough** (iron + plodders)
  - **collar harness** (plodders pull 2×)
  - **three fields** (farms rotate and don't tire)
  - **paper** (fibre + water mill)
  - **blast furnace** (H4; needs a watermill for bellows)
  - **clock tower** (all smols' routines sync, so markets and shifts run on time)
  - **wagon** (four wheels, pivoting front axle)
  - **castle wall** (stone wall + gatehouse; grump raids stop)
  - **crossbow**, **guilds** (jobs pass on with teaching, not just family)
  - **hospital / almshouse**
- **Prerequisites**:
  - iron
  - rivers with flow
  - plodders ≥ 4
  - census ≥ ~300

#### Age 5 · Powder and Print (early modern)
- **Keystone**: **gunpowder** + **printing press**.
- **Real history**:
  - Gunpowder came from Chinese alchemists looking for elixirs (9th century). The first written formula is in the *Wujing Zongyao* (1044).
  - Cannons in Europe in the 1320s; the matchlock arquebus c. 1450s; the flintlock c. 1610.
  - Printing: Bi Sheng's movable type in the 1040s; Gutenberg's press c. 1450. About 20 million books were printed in Europe by 1500. Literacy and the shared scientific record followed.
  - The telescope (1608); ocean-going ships with full rigging.
- **Ideas**:
  - **saltpetre** (nitre scraped from grump-cave walls. Real nitre came from caves, bat guano and dung heaps, so the grumps' caves suddenly matter)
  - **gunpowder** (saltpetre + sulfur + charcoal)
  - **fireworks** (the cute first use: grumps flee from the bangs)
  - **cannon** (cast bronze/iron tube; razes grump camps)
  - **musket** (matchlock → flintlock)
  - **printing press**: a book is an item. One press makes copies, and every book is a story pole that walks around. Knowledge loss becomes rare from here.
  - **telescope** (✓lens + metal tube; ✓astronomy gets a real upgrade)
  - **ships** (cross to islets; trade routes)
  - **glass** (sand + soda at H3/H4: windows, lenses, bottles)
  - **science** (an institution: discovery rate +50% when ≥3 thinkers meet in a "society" building)
- **Prerequisites**:
  - sulfur (ashlands vents ✓node)
  - saltpetre (grump caves ✓)
  - sand (beach/desert)
  - paper
  - ≥4 thinkers

#### Age 6 · Steam (Industrial Revolution)
- **Keystone**: **coal** + **steam engine** + **railway**.
- **Real history** (this age has the clearest dependency loop in all of history, and it's the best puzzle in the game):
  - England was running short of wood by the 1600s, so it turned to coal.
  - Coal mines got deeper and flooded.
  - Newcomen's engine (1712) burned coal to **pump water out of coal mines**. It was hopelessly inefficient, which didn't matter at the pit head where coal was free.
  - Watt's separate condenser (patented 1769, commercial from 1776) used about a quarter of the coal, so engines could work anywhere.
  - Darby's coke-smelted iron (1709) and Cort's puddling (1784) made iron cheap.
  - Textiles: the spinning jenny (1764), the water frame (1769), power looms.
  - Canals (Bridgewater, 1761) halved Manchester's coal price.
  - Rail: Stephenson's *Rocket* and the Liverpool–Manchester line (1829–30).
  - Bessemer steel (1856); McAdam's broken-stone roads (1820s); the telegraph (1837–44).
  - Weapons: the Minié rifled musket (1849), breech-loaders (1860s).
  - Allen's thesis: British wages were high and coal was cheap, so machines paid. Model this directly: a machine idea's pressure rises with **wages** (phase B prices) and falls with **fuel price**.
- **Ideas**:
  - **coal** (seams exposed in mesas and cliffs; ✓"peat" in swamps as a first step)
  - **mine shaft** (a building that floods: needs a pump)
  - **Newcomen pump** → **Watt engine**
  - **coke**
  - **puddling**
  - **spinning mill** (water first, then steam; cloth goods)
  - **canal**
  - **rails** (wooden wagonways → iron rails → steam locomotive)
  - **steam wagon** (the first "car", see below)
  - **steel** (H6)
  - **rifle**
  - **macadam road**
  - **telegraph** (a call reaches everyone on the wire)
  - **sewers** (after a cholera outbreak: John Snow's Broad Street pump, 1854; London's sewers after the Great Stink of 1858)
  - **factory** (jobs → shifts → the clock tower matters)
- **Prerequisites**:
  - coal
  - iron
  - **wood pressure** (forest cover below a threshold triggers the coal idea; see section 2)
  - a flooded mine
  - ≥2 machinists (a new job, growing from smiths)
  - census ≥ ~2,000
  - era ≥ city

#### Age 7 · Motor and Spark (the second industrial revolution)
- **Keystone**: **combustion engine** + **car** + **electricity**.
- **Real history, the car in particular**:
  - Cugnot's steam *fardier* (1769) famously ran into a wall.
  - Lenoir's gas engine (1860); Otto's four-stroke (1876).
  - Oil: Drake's well (1859), refined for kerosene lamps. Gasoline was a near-waste by-product until engines wanted it.
  - Rubber: vulcanised by Goodyear (1844); the pneumatic tyre by Dunlop (1888). Rubber itself was known to the Olmec, who made rubber balls by c. 1600 BCE.
  - Benz's Patent-Motorwagen (1886): three wheels, ~0.75 hp, ~16 km/h. In 1888 Bertha Benz drove it 106 km to her mother's and bought fuel at a pharmacy on the way.
  - Ford's Model T (1908) and the moving assembly line (1913) cut the time to build a car from ~12 hours to ~1.5.
  - Asphalt and tarmac (Hooley's patent, 1902).
  - Electricity: the dynamo (1866), the light bulb (1879), power stations (1882).
  - Skyscrapers: Otis's safe elevator (1850s) and steel frames (Home Insurance Building, Chicago, 1885).
  - The Maxim machine gun (1884). Radio: Marconi from 1895, across the Atlantic in 1901.
  - London passed 6 million people by 1900.
- **Ideas**:
  - **oil** (tar seeps in ashlands/swamp → kerosene lamps first)
  - **latex → rubber** (tap jungle giants)
  - **machine tools** (a lathe: precision parts. Maudslay c. 1800 is the hidden dependency of every engine)
  - **combustion engine**
  - **car (Mk1–Mk4)**
  - **bicycle** (the 1817 draisine → the 1885 safety bicycle: a lovely cheap vehicle)
  - **asphalt**
  - **dynamo**
  - **light bulb / street lights** (replaces phase B's lit windows with real grids)
  - **power station**
  - **tram**
  - **steel frame / elevator** (towers)
  - **assembly line**
  - **radio**
  - **machine gun** (optional, see weapons)
- **Prerequisites**:
  - oil
  - rubber (jungle)
  - steel
  - machine tools
  - paved roads ≥ N tiles
  - census ≥ ~8,000

#### Age 8 · Signal (the ending on the long road)
- **Keystone**: **radio** + **the big thought** (rebuilt as a crystal-tuned radio mast).
- **Ideas**:
  - **radio telescope** (the star dome, upgraded)
  - **thinking machine** (vacuum tubes; a smol computer, like ENIAC in 1945, the size of a hall)
  - ✓resonance
  - ✓bigthought (needs: radio + resonance + astronomy + ascended ≥ 3)
  - **clean power** (crystal/solar; it lifts pollution, see section 3)
- **Prerequisites**:
  - ascended smols (tier 6)
  - crystals
  - power grid

**Size of the web.** There are ~44 ideas today (35 + 9 phase B). The ladder adds ~55, for ~100 total, about 8–12 per Age. That's enough to be a web, not a list. Every Age needs **at least one new material from a new place** (tin, iron, limestone, saltpetre/sulfur, coal, oil/rubber), so exploration drives progress, as the colony research recommended.

### Data model sketch (fits `ideas.js` / `civ.js`)
```js
// appended to I.LIST (never reorder: invented words key off index)
{ id: "bronze", name: "bronze", icon: "🔔", tier: 5 /*= invent*/, use: 4, age: 2, needs: ["smelt","bellows"],
  kind: "craft", make: { in: { metal: 2, tin: 1 }, at: "furnace", heat: 3, out: "bronze", time: 8 },
  mats: ["tin"], pop: { thinkers: 2 }, pressure: "softTools",       // see §2
  accident: "tinInFire", versions: null, real: "c. 3300 BCE, Near East", hint: "copper that won't hold an edge, and a strange grey pebble" }

Cv.AGES = [ { id:"stone", keys:["fire","knap"] }, { id:"neolithic", keys:["farm","pottery",["hut","mudbrick"]] }, ... ];
// game.civ.age computed like eraTarget(): the highest Age whose keys are all held by a living smol OR in a book/pole
```
`canHold` checks `c.tier >= d.tier` for inventing. Add `I.canUse(c, id)`, which checks `use`, for operating and crafting from a plan someone else taught. Smols learn ideas they can use from teaching and books but can't *discover* them.

---

## 2. How smols discover tech (no research points)

The engine already has the right ingredients:
- `TRIGGERS` (the right moment)
- `PONDER` (slow background thinking)
- `inspired` and the lens
- the vision card
- teaching, story poles and kids picking things up

The aim is to make invention *visible and staged*, so you watch a civilisation get there. Here are eight channels. All of them feed the existing `I.tryDiscover` / `I.discover`, so lost knowledge, words, the chronicle and titles keep working.

1. **Moments (existing, extended).** Each new idea gets a trigger:
   - copper-green ore dropped near a hot fire → smelting (a real leading hypothesis for how smelting began)
   - a log pile smouldering under turf → charcoal
   - sand in a furnace → glass
   - a pot lid rattling over a boil → steam power (the Watt-kettle story is a legend; use it as the *smol* legend, flagged in the smolpedia)
   - a smol pushing a cart up a hill on round logs → wheel
2. **Tinkering (new).** Builder+ smols with free time, curiosity and a full belly sometimes pick two items they know and combine them at the nearest heat source or workbench. The game rolls against a hidden recipe table, which is just `make.in` plus `heat`. Most tries fizzle with a funny line ("i stuck the gear to the fish. it is not better"). A near miss leaves a **clue**: `c.ideas[id] += 0.1–0.3` and an inner-voice line ("the grey pebble went soft in the fire… why?"). This is the Little Alchemy feeling, but the smols do it.
3. **Necessity pressure (new).** Each settlement tracks a few **pressures**, which slowly multiply the trigger and ponder weight of the ideas that answer them:
   - `haul` (average delivery distance) → sledge, wheel, cart, rails
   - `wood` (forest cover near the town falling) → charcoal management, then **coal**. This is England's real path.
   - `flood` (a mine shaft filling) → pumps, steam
   - `crowd` (people per house) → houses, mudbrick, tenements, towers
   - `dark` (night activity) → torches, lamps, bulbs
   - `sick` (outbreaks) → herb lore, sewers, hospitals
   - `wages` (phase B prices of labour goods) → machines (Allen)
   - `raid` → walls, weapons

   Show the top pressure in the civ panel ("the haulers are tired: everyone's dragging logs 40 tiles"). That's how the player reads *why* something got invented.
4. **The collective brain (new, the realism core).** The discovery rate for an idea is multiplied by `sqrt(minds who hold all its prerequisites and are connected)`. "Connected" means same town, linked by road, market day or ship. Two isolated villages each invent slowly. Joining them with a road speeds both. This is Henrich's and Kremer's finding, and it makes roads, markets and cities matter for *ideas*, not just goods. The reverse also holds: a plague or a split shrinks the brain, and ideas drift away, like Tasmania.
5. **Prototype generations (new, the "first car" feeling).** Big inventions (wheel, plough, steam engine, locomotive, car, bulb, radio) have **versions**. The first discovery gives Mk1: crude, slow, breaks down. Each one built and used adds to `cum[id]`. When cumulative builds double and a thinker who uses it ponders or tinkers, the next mark gets invented. That's Wright's learning curve (1936): each doubling of output cut aircraft labour cost by ~20%. The cars show it best:

   | mark | real model | in game |
   |---|---|---|
   | **Mk0** "fire cart" | Cugnot 1769 | a steam boiler on a wagon. 1.5× walking speed. Stalls every 30 s. 10% chance per trip to crash into something (a cute bonk, smoke, the chronicle notes it) |
   | **Mk1** "puffer" | Benz 1886 | three wheels, oil engine. 2.5× walking speed. Needs fuel from the "apothecary" (a stall that sells oil: Bertha Benz's pharmacy) |
   | **Mk2** "four-wheeler" | c. 1895–1905 | 4× speed. Rubber tyres, so it needs paved roads to go fast. Carries 2 smols |
   | **Mk3** "box car" | Model T 1908 | built on an **assembly line** (factory building). Cheap, so every rich household buys one. Traffic appears |
   | **Mk4** "bus / truck" | 1910s+ | moves goods and crowds; city scale unlocks |

   The same structure covers carts (sledge → solid-wheel cart → spoked cart → wagon), engines (Newcomen → Watt → high-pressure) and guns (matchlock → flintlock → rifle → breech-loader). Each mark is a mesh variant, so the street visibly changes generation by generation.
6. **Teaching, guilds, books (existing → extended).**
   - Watching, teaching and kids learning stay as they are.
   - ✓School, then **guild hall** (apprentices learn a trade's ideas 2×; phase B already has mentors), **library** (holds scrolls), **printing press** (copies books: each book is a portable story pole), **university** (thinkers ponder 1.5× together).
   - From printing on, an idea in ≥3 books can't be lost to deaths alone, but a fire in the library can still destroy it. (The Library of Alexandria is mostly myth as a single event; the smol version can be dramatic.)
7. **Your hand (the god) as patron, not research menu.** Mostly existing:
   - ✓inspire (3× ideas for a minute); ✓vision card (pick one of three that are *possible now*)
   - ✓possess: you experiment as a smol, and the smol keeps the idea
   - ✓orders blueprints for known ideas
   - **New: meteor iron.** A falling-star card can drop a "sky iron" lump. The earliest iron artefacts *were* meteoritic (Tutankhamun's dagger), so the hand can seed the iron age early. It costs sparks and it's a real nudge.
   - **New: the fair** (director card, Great Exhibition 1851): inventors gather. Pick one prototype to "show". It gains +1 mark of progress and the whole town learns it 3× faster.
8. **Dangers and setbacks (director cards).** Inventing is risky, and that makes stories:
   - a kiln explodes; a mine floods or collapses; a boiler bursts; a powder store blows
   - a Mk0 car crashes (the first pedestrian killed by a car was Bridget Driscoll, London, 1896. Keep ours to bonks and smoke)
   - **The collapse** (the Late Bronze Age, c. 1177 BCE): the tin route breaks (ship lost, strangers stop coming). Bronze can't be made. If no one finds iron in time, the Age slides back. Greece lost writing (Linear B) for ~400 years after it, which is a perfect dark-age precedent.
   - **Plague**: dense cities without sewers get outbreaks that kill knowledge holders. That's the reason to invent sewers and hospitals.

**What the player sees while an idea forms.** This is the part that makes it feel like watching invention:
- Thought bubbles grow in stages: "?" → a faint icon → a sketch (a blueprint-style pixel icon of the Mk) → "!" eureka.
- The brain viewer's mind panel gets an **"almost" list**: "Pip · wheel 60%: saw logs roll ×3, tried a sledge on a hill, needs a cart-maker friend".
- The chronicle tracks a **first-of-its-kind gallery**: first wheel, first cart, first car, each with inventor, generation and the invented word.

---

## 3. What each Age changes on screen and in play

| Age | buildings | roads | vehicles | weapons (cute: grumps flee, hats fly) | settlement scale | side effects |
|---|---|---|---|---|---|---|
| 0 Stone | campfire, lean-to, story pole | desire paths (B) | carrying, then the sledge | thrown stone, club, spear, bow | band 5–30 | wildfire from torches |
| 1 Neolithic | huts → mudbrick houses, pens, granary, kiln | trails (B); log causeway over marsh (the Sweet Track, 3807 BCE) | sledge, dugout canoe | spear, bow, sling | village 30–150 (census starts) | farms clear forest; first plodder herds graze grass down |
| 2 Bronze | workshops, smelter, walls, council hall, ziggurat-like temple/observatory | packed-earth roads, stone-lined streets in town (B paving) | solid-wheel ox cart, sail raft, chariot (spoked, late) | bronze sword, shield, bronze spear | town → city 150–1,500 | slag heaps by the smelter; tin trade dependency |
| 3 Iron | stone houses with tiled roofs, aqueduct, arch bridges, forum/market square, library | **stone roads** (cambered, straight, between towns) | spoked carts, galleys | iron sword, shield wall | city 1,500–5,000 | **deforestation** around bloomeries (trees → stumps → grass); charcoal mounds smoking |
| 4 Medieval | watermills on rivers, windmills, castle wall + gatehouse, cathedral/clock tower, guild halls, timber-framed 2–3 storey houses | cobbled streets inside walls, dirt between | four-wheel wagon pulled by plodders | crossbow, longbow, armour | walled city 5,000–20,000 | plague in crowded quarters; mill ponds flood fields |
| 5 Powder & Print | print shop, library, harbour + ships, star dome with telescope, glassworks, powder mill | cobbles + coach roads; bridges in stone | coaches, ocean ships | cannon (razes grump camps), matchlock → flintlock musket (smoke puffs, "pop") | 10,000–30,000 | powder accidents; cannons scare wildlife |
| 6 Steam | mine heads with pump engines, mills with chimneys, terraced rows, rail station, gasworks | **macadam** roads; **railways** laid along roads and rivers; canals | steam locomotive + carriages, steam wagon (car Mk0), canal barges | rifle, breech-loader | 20,000–60,000 (the large map) | **smoke**: soot haze, darkened buildings, dirty rivers; **dark flutterbies** (the peppered moth's industrial melanism, first black moth recorded in Manchester in 1848); cholera without sewers; winter smog days |
| 7 Motor & Spark | brick/steel towers (4–10 storeys), power station, street lamps, garages, assembly-line factory, radio mast | **asphalt**, lane lines, crossings, bridges in steel | cars Mk1–Mk4, bicycles, trams, buses, trucks | (optional) machine gun on walls vs raids | up to the realistic ceiling (section 4) | traffic jams, car bonks, oil seeps, power-line hum; night sky loses its stars (the star dome works worse: light pollution) |
| 8 Signal | the crystal mast, thinking-machine hall, clean power fields | streets go quiet: ascended smols float | ascended don't need cars | none: grumps are befriended (see ending) | stable | **healing**: clean power and resonance clear soot; forests regrow on old stump fields |

**Pollution as a world field.** Use a coarse `world.smog` grid (8×8 tiles, Uint8) next to `wear` and `road`:
- Chimneys, engines and cars add to it. Wind and rain clear it. Trees absorb it.
- Effects:
  - The terrain shader tints toward soot and the fog colour turns brown-grey.
  - Smols in smog get a "cough" chem.
  - Flutterbies go dark.
  - Grumps (who like dirt) grow bolder. That's the existing colony-research idea: "pollution feeds grumps".
- The god's ✓rain miracle cleans the air: a new, sensible use for an old miracle.
- Keep it reversible. The Signal Age's job is partly to clean up.

**Weapons and tone.** The game is cosy. Every weapon tier exists to deal with **grumps and grump camps** and to hunt; each tier just does it differently:
- a spear poke
- a sword clang
- a musket pop that blows a grump's hat off, after which it runs
- a cannon blast that knocks a grump camp's palisade flat

Smol-on-smol fighting stays at shoves and punches (`social.js`). If a later phase adds rival smol towns, war should be settings-gated and resolved with routs and captives (a RimWorld-style rescue), never gore. Guns change *pacing* (raids end faster) and *politics* (phase B guards carry muskets, the council can ban guns as a policy) more than they change combat maths.

**Grumps across the ages.** Grumps don't industrialise. They're the night and the wild. As towns grow, grumps are pushed to the edges and the fog. In the Signal Age, resonance lets smols *understand* them: the ending card can welcome grumps in. That pays off the "grump warship" in the intro as a misunderstanding.

---

## 4. Cities at realistic scale in a browser

### 4.1 How big is the island in real metres?
The hut is `r: 1.1` tiles (~2.2 tiles across). If a smol hut is a real 4–5 m hut, **one tile ≈ 2 m**.

| map | across | total area | land (~½) | realistic ceiling (by real densities) | real-world match |
|---|---|---|---|---|---|
| small 384 | ~0.8 km | 0.6 km² | ~0.3 km² | ~2,000–5,000 | a market town; Çatalhöyük-plus |
| medium 544 | ~1.1 km | 1.2 km² | ~0.6 km² | ~5,000–12,000 | Pompeii (66 ha, ~11k) |
| large 768 | ~1.5 km | 2.4 km² | ~1.2 km² | ~15,000–30,000 | medieval London within the walls |
| XL 1024 | ~2 km | 4.2 km² | ~2 km² | ~30,000–60,000 | Uruk at its peak; an early industrial town packed with terraces |

**Densities used:**
- ~150–200 people/ha for ancient and medieval towns (Pompeii ≈ 170)
- 300–600/ha for industrial terraces and tenements
- Manhattan today ≈ 280/ha residential average

The XL map is also almost exactly the 2×2 km plot that SimCity (2013) limited cities to, *because* its agent simulation couldn't scale. That's a useful warning about simulating everyone.

So a "realistic" city here means **tens of thousands, not millions**. On these maps that's correct, and it's dramatic: a 1024 island where a third of the land is roofs is a real city.

### 4.2 Three levels of simulated people
The game can't run 50,000 neural nets. Today it runs ~30–72 minds at ~8.5 ms of JS per frame under 4× CPU throttle. So people exist at three levels of detail.

| layer | count | what's simulated | cost |
|---|---|---|---|
| **Minds** (today's smols) | 40–100 (phone 48) | full brain, mind, social, genes, names | as now |
| **Citizens** | ~500–3,000 *materialised near the camera* | home, job, schedule (clock tower!), a route on the road graph, age, mood number. No brain | batched, ~0.01 ms each per tick, sim at 2–4 Hz |
| **Census** | 1,000–60,000 | numbers per building and district: residents, workers, food, money, sickness, births and deaths, a gene-pool summary | O(districts) every few seconds |

- **The census is the truth for population.** Houses hold N residents by type: hut 4, mudbrick 6, timber 2-storey 10, terrace 16, tenement 40, tower 120. Districts (phase B already has them) sum them up. Food, jobs and money flow at district level and plug into phase B's prices.
- **Citizens are ambient.** Like pedestrians in open-world games, they spawn from the census density around the camera, walk real routes (home → work → market → home on the clock), and despawn off-screen. They make a city *look* lived in without being remembered.
- **Promotion.** Tap any citizen and it becomes a Mind:
  - a genome is sampled from its district's gene-pool summary (as strangers are made today)
  - it gets a brain at the colony's tier with tier instincts, a name, a job and a home
  - Minds that wander far and are unimportant can be **demoted** back into the census, keeping the name in a "notable citizens" list

  This keeps the Creatures promise ("this one is *yours*") at city scale.
- **Inventors are always Minds.** Discovery runs only on Minds, and the census adds the collective-brain multiplier. So the big population helps invention without needing brains for everyone. That's also roughly true of history.
- **Evolution stays on Minds**, with the census gene pool drifting toward Minds' children.

### 4.3 Drawing dense cities cheaply (this engine: custom WebGL, chunked 32×32, pixel mode at ~240 px tall)
Pixel mode helps a lot: the fill rate is tiny, so the budget is **triangles, draw calls and CPU**. Today a big village is ~330k triangles, and 3D on phones is 63k.

1. **A modular building kit, merged per chunk.** Buildings are built from ~12 parts: wall bays, roof types, chimney, window strip, door, storey band, tower top. A building's look comes from a hash plus its Age plus its district tint (B). When a chunk's buildings change, **bake them into one merged mesh per chunk**, the same way chunk instances rebuild on `markDirty`, rather than one instance per part. One draw call per chunk for all its buildings.
2. **Four LODs per chunk:**
   - **L0** (near): full kit, ~60–200 triangles per building
   - **L1** (mid): a box plus roof prism, ~12–20 triangles, with window rows from a tiny texture atlas
   - **L2** (far): one "block" mesh per city block, heights from the census. ~2 triangles per building face-group
   - **L3** (map zoom): no geometry. A roof-colour tint in the terrain shader plus light dots at night

   10,000 buildings at L1 is ~150k triangles, within today's budget. Only the ~1–4 chunks near the camera are ever at L0.
3. **Impostors for towers.** Very tall buildings far away become camera-facing quads rendered once into an atlas. This fits the pixel look, since sprites are already how smols are drawn.
4. **Night windows without lights.** The 8-point-light limit stays for fires. City lights are **emissive** in the building shader: a per-window hash says whether it's lit, depending on time of night and district. Street lamps are emissive quads plus a cheap additive glow sprite. This replaces phase B's per-building `Cv.lights`.
5. **Vertex-shader traffic and crowds.** Far citizens, carts, trains and cars cost **zero CPU per frame**:
   - Each instance stores `{segment start, segment end, speed, phase, sprite}`.
   - The vertex shader computes `pos = mix(a, b, fract(time*speed + phase))`.
   - The CPU only re-routes an instance when its segment finishes (a few hundred per second at most).
   - Near the camera, materialised citizens use the normal sprite path.
   - 20,000 quads ≈ 40k triangles, which phones handle.
6. **The road graph is the backbone.** Phase B already has a road grid (`world.road`: 0, trail, paved). Add a **road graph**: intersections are nodes and runs are edges, extracted from the grid when roads change. It's used by:
   - citizen routes (A* on a graph of hundreds of nodes, not a million tiles)
   - vehicles (cars and carts stick to edges; rails are their own edge type)
   - the collective-brain "connected" test

   It also gives you lanes, rails and intersections for free in the renderer.
7. **Sim LOD.** Districts far from the camera tick at 1/5–1/10 rate. Minds far away already "think at half rate". The census and citizen routing can move to a **Web Worker** later (plain scripts work fine with `importScripts`). Not needed for v1 of this.
8. **Saves stay small.** Don't store 10,000 buildings one by one. Store **lots**: a district polygon, the Age it was built in, a style seed and density. The kit regenerates identical buildings from the seed. Store individual buildings only for landmarks and Mind-built structures. Target: save under ~300 KB on XL (today 40–100 KB).
9. **Growth you can watch.** Cities grow by **infill on the road graph**. New lots appear along roads near demand, so cities sprawl along roads, then go up (storeys) once the Age allows. A time-lapse button ("watch it grow": replays district snapshots taken once per in-game year) is a cheap, shareable showpiece.

**Rough budget, XL map, steam age, ~40k census:**
- ~5–7k lots/buildings
- ~120–180k triangles (mostly L1/L2)
- ~60–100 draw calls
- ~2k visible crowd and traffic quads
- 60 Minds

That's in line with today's 330k-triangle village. Phones get a lower L0 radius and fewer crowd quads, as dynamic resolution already does.

### 4.4 Pacing across the whole road
Today the ladder runs ~5 h to ascended for an engaged player (8-hour bot sims are slower). Suggested long-road targets, tuned with `tests/sim.test.js`:

| milestone | target (engaged) |
|---|---|
| Neolithic (farming) | ~1.5–2 h (today's builder) |
| Bronze | ~3 h |
| Iron | ~4 h |
| Medieval | ~5.5 h |
| Powder & Print | ~7 h |
| Steam | ~8.5–9 h |
| Motor (first car Mk0 → Mk3) | ~10–11.5 h |
| Signal ending | ~12–15 h |

Offline progress and speed controls already exist. Add a **"history speed"** setting (relaxed / standard / brisk) that scales pressure and discovery rates. The end card's **history ribbon** compares the run to Earth: "your smols went from fire to the first car in 9 h 40 m. humans took about a million years". It's a strong share moment.

### 4.5 How the ending fits after an industrial age
- The ark logs already set it up: *the big thought is a signal*. On the long road, the radio is the turn. Marconi's 1901 transatlantic signal is the real echo.
- After radio, thinkers build a **radio telescope** (the star dome, upgraded). It hears the ark's beacon for the first time. That's a story card plus a pod-cutscene-style sky shot.
- To answer, the signal must be "tuned to every mind": ✓resonance plus ascended smols plus crystals. So **ascension (tier 6) is the last gate**. Evolution and civilisation meet at the end: you needed both bigger brains and a whole history.
- **Pollution decides the tone of the ending.**
  - A smoky island answers with a "loud" signal: the ark comes, but the epilogue shows an island that needs healing.
  - A clean island (clean power, forests regrown, low smog) gets the bright ending, and the grumps join the crowd waving at the pods.
- **New game+** keeps heirs as today. Optionally the next island starts with a **book** of N ideas, a cultural inheritance next to the genetic one.

---

## 5. Phased implementation plan

Effort: S = a few days, M = 1–3 weeks, L = 1–2 months. Ordered by impact. **P1 and P2 are the highest impact**: they make the existing game feel like a civilisation inventing things, before any new Age ships. P4 is the technical enabler for "realistic cities", so start its prototype early in parallel.

| # | phase | size | contents | files | why this order |
|---|---|---|---|---|---|
| **P0** | Ages axis and idea schema | **S** | `Cv.AGES` with keystones, slide-back and a 180 s slump (reuse `eras()`); `age` / `use` / `mats` / `heat` / `pressure` / `real` fields on ideas; `I.canUse`; the HUD reads "a bronze age town"; history ribbon data; save/revive with defaults. Long road off by default | `civ.js`, `ideas.js`, `save.js`, `ui.js`, tests | everything else hangs on it; low risk |
| **P1** | Discovery 2.0 | **M** | tinkering with clues, necessity pressures, collective-brain multiplier, staged thought bubbles, the "almost" list in the brain viewer, first-of-its-kind gallery in the chronicle, meteor-iron card, fair card | new `tech.js`, `ideas.js` (`tryDiscover`), `mind.js` (inner voice), `director.js`, `ui.js` | **highest impact**: works on today's 44 ideas immediately, and it's the "watch them figure it out" feeling the owner asked for |
| **P2** | Materials and heat | **M** | new nodes (tin, bog iron, red ore, coal seam, peat, limestone, sand, nitre wall in grump caves, sulfur at vents, tar seep, latex on jungle giants), placed from their own random stream as v2.1 did so old saves keep node ids; heat levels H1–H6; furnace structures (bellows furnace, bloomery, blast furnace) | `core.js`, `worldgen.js`, `ideas.js`, `meshes.js` | every Age needs a new material from a new place, so exploration drives tech |
| **P3** | Bronze and iron, wheels and plodders | **M–L** | plodders (wild → tame → pens → draft); sledge → cart Mk1–3 on the road graph; bronze/iron tools and swords; irrigation from rivers; charcoal and deforestation; stone roads; the collapse card | `creature.js` (plodder species), new `vehicles.js`, `civ.js` roads, `director.js` | the first big visible change: carts on roads, metal, cleared forests |
| **P4** | City engine | **L** | census per building/district; ambient citizens on a road graph; promotion and demotion; building kit, per-chunk merged meshes and L0–L3 LOD; emissive windows; vertex-shader crowds and traffic; lot-based saves; growth time-lapse. **Spike first (S):** 10k L1 boxes plus 20k shader walkers on XL, measured on a phone | new `city.js`, `render.js`, `meshes.js`, `gl.js`, `save.js`, `economy.js` (district-level goods) | enabler for everything after medieval; risky, so de-risk early |
| **P5** | Medieval and Powder & Print | **M** | watermills on high-flow rivers, heavy plough/collar, clock tower (shift schedules), castle walls, guilds; paper, printing press and books as portable story poles; saltpetre and gunpowder, fireworks, cannon vs grump camps, muskets for guards; glass; ships to islets; plague card | `ideas.js`, `civ.js` (guilds, schedule), `director.js`, `sites.js` (camps), `meshes.js` | knowledge stops being fragile; first guns |
| **P6** | Steam | **L** | coal → flooded mine → Newcomen → Watt loop; coke and puddling, steel; mills and factories with shifts; canals; rails and locomotives on the road graph; macadam; smog field, dark flutterbies, cholera and sewers; rifles; machinist job; wage/fuel pressure (Allen) | `tech.js`, `vehicles.js`, `world.js` (smog), `render.js` (haze, soot), `economy.js` | the owner's headline: the Industrial Revolution |
| **P7** | Motor and Spark | **L** | oil and rubber; machine tools; **cars Mk0–Mk4 as prototype generations**; asphalt and lane roads, traffic; bicycles, trams, buses; dynamo, grid and street lights; steel-frame towers and elevators; radio | `vehicles.js`, `tech.js`, `city.js`, `meshes.js` | the first generation of cars, and big cities |
| **P8** | Signal ending | **M** | radio telescope beat; crystal mast rebuild of `bigthought` (needs radio + resonance + ascended); clean power; ending variants by pollution; grumps welcomed; NG+ book; history ribbon end card; era/age songs for `music.js` (a steam-age waltz, a motor-age ragtime-ish bounce) | `sites.js`, `intro.js`, `director.js`, `music.js`, `ui.js` | pays off the whole arc |

**Tests to add as you go:**
- an `ages.test.js` covering keystones, slide-back and save round-trips
- a `tech.test.js` showing that pressure raises the trigger rate, the collective brain scales with connection, and marks advance with cumulative builds
- a `city.test.js` for census conservation, promotion keeping its district genes, and lot saves regenerating identical buildings
- a `sim.test.js` long-road soak per seed, reporting the time to each Age

**Suggested first slice (one PR, ~2 weeks): P0 + P1 + the cart.** Ages on the HUD, tinkering and pressures, and the wheel as a three-mark prototype: sledge → solid-wheel cart → spoked cart, pushed by smols on phase B trails. This proves the whole loop (need → tinkering → eureka → Mk1 → Mk2 by use → roads matter) on content that already exists, before the big city engine.

---

## Appendix: quick real-history reference (for flavour text and the smolpedia)
- fire c. 1 Ma (habitual ~400 ka) · spears ~300 ka · bow ~64 ka · dog ≥15 ka · pottery c. 18,000 BCE · farming c. 9500 BCE · copper smelting c. 5000 BCE · wheel c. 3500 BCE · writing c. 3200 BCE · bronze c. 3300 BCE · swords c. 1600 BCE · LBA collapse c. 1177 BCE · iron spreads c. 1100 BCE · alphabet c. 1050 BCE · coins c. 600 BCE · Roman roads 312 BCE on · paper 105 CE · gunpowder formula 1044 · movable type 1040s · Domesday mills 1086 · European windmill 1180s · clocks 1280s · Black Death 1347–51 · Gutenberg c. 1450 · telescope 1608 · flintlock c. 1610 · Darby coke 1709 · Newcomen 1712 · Bridgewater canal 1761 · jenny 1764 · Watt 1769/76 · Cugnot 1769 · macadam 1820s · Rocket 1829 · telegraph 1837–44 · Goodyear rubber 1844 · Minié 1849 · Snow's pump 1854 · Bessemer 1856 · Drake's oil 1859 · Otto 1876 · bulb 1879 · power station 1882 · Maxim gun 1884 · steel skyscraper 1885 · Benz 1886 (Bertha's drive 1888) · Dunlop tyre 1888 · Marconi 1895/1901 · tarmac 1902 · Model T 1908 · assembly line 1913.
