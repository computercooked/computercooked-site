# smol brains 4 — design doc

**Creatures/Norns on steroids, on an island, in 3D.** You find one glowing egg on a procedurally generated island. What hatches is a wobbly blob with a real neural-network brain. You raise it, teach it words, and watch its children's children grow legs, then hands, then language, then villages, then big glowing brains, until they are building something they call *the big thought*.

v1 (one side-view valley, smols and grumps, word teaching) is the seed this grew from. Everything that made v1 work is still here, rebuilt for a world you can fly around: real brains that learn from reward, genetics and breeding, body chemistry, word teaching with the tickle-and-tap hand, copy-paste smol codes, autosave. v1 saves load into v2 (see *Saves*).

No Creatures names, art, code or assets are used. Everything here is original.

---

## 0. The twists (what nobody else does)

1. **Echoes.** Evolution is steered by how you raise them. What parents *practise* during their lives (walking, carrying things, talking, being taught, planning, building, swimming, being cold) nudges their babies' genes in that direction. Teach a smol a lot and its kids are born with bigger brains. That turns ordinary pet-sim care into the evolution game.
2. **Technology lives in heads.** There's no tech tree menu. An idea (fire, weaving, farming…) is discovered by one curious smol doing the right thing at the right moment, then spreads by watching, teaching and story poles. If everyone who knows an idea dies before passing it on, it's *lost* (a dark age). Story poles (writing) make ideas permanent.
3. **They name their world.** Each island has its own procedurally generated language. Smols invent a word for every idea, village, tribe and species, and the words join the lexicon: say "krala!" and the ones who know fire think of fire.
4. **You're a god they can pray to.** Tribe-stage smols pray when things are bad. Answer with miracles (bounty, heal, rain, lightning, inspire, bless the next eggs) and they learn that praying works.

## 0.5 What v3 added (from the owner's second playtest, two playtest agents and three research passes)

- **The opening.** A pixel-art cutscene drawn in code (`intro.js`): year 3127, the smol ark is caught by a grump warship and breaks up, escape pods scatter, one falls toward the island. Captions are smol-speak gibberish with subtitles; each word plays the smol voice blip. A title card ("tap to begin") doubles as the gesture that unlocks audio. `?nostory=1` skips it for testing.
- **Founders, family, strangers.** The game starts with a crashed pod (`egg.data.pod/twins`) that opens into a girl and a boy. Every smol has a `sex`; parents, siblings and cousins (`Game.related`, two generations) can't breed. Survivors from other pods (`strangers.js`) walk up to the village every 8–14 min (2.5–4 min when no unrelated pair is left) and wait for a welcome/send-away decision; ignored ones decide for themselves after 150 s. Strangers are usually as evolved as the colony or a step behind (5% a step ahead, never past builder), sometimes carry an idea the tribe lacks, and have a trait.
- **The word book** (`words.js`). No typing. 37 words unlock by tier. Pick one, then *show* it: tap a thing (nouns), a smol who feels it (feelings), or ask a smol to do it (verbs land when it actually does it, and watchers learn a little). One lesson per smol per word every 9 s, so mashing does nothing. Words most of the tribe knows are *shared*: +3% learning per shared word (cap +60%), +1.5 iq each, and they become 📣 calls (come, food, sleep, wait, explore…) that smols who know them obey reliably. Vague nouns got real names (tree, goods, herb, bunny; old saves migrate).
- **The god economy.** Miracles get dearer with use (`godHeat`, +30% per recent cast, cools over ~a minute each) and cost double at 8×/16×. Bounties dropped on fed smols *spoil* the tribe (`spoil`): peckish smols wait for sky food, learn ideas slower, and their prayers pay less. Prayers pay 5 sparks only when answered with the right miracle (a tickle pays 1); re-invented ideas pay 1. Blessings amplify what parents practised (60% alone, 150% on a family that lives that way).
- **Exploring.** Fog of war (`world.seen`, 4×4-tile cells, soft-edged in every shader via `fow()`; hidden trees, grass and creatures aren't drawn). It clears within each smol's view; each new biome pays 4 sparks. Days are 20 minutes (7-minute nights), two days a season.
- **Tools.** Stone axes (tier 2) fell trees in three swings into logs (a log = 3 sticks on a site); clubs and spears chase grumps off for good after three hits, and armed brave smols stand up to grumps; fishing rods; hunting drops bunny fur, sewn into cloaks that keep the cold off.
- **Look and feel.** Upright little-people sprites from tribe on (head, torso, two legs, arms; thinkers wear glasses, no more brain-hat), a smooth ascended hover (fixes a physics bug that also froze them 2 ticks in 3), zoom caps at 2× and far-away dots, free tilt (right-drag, two-finger slide, r/v). A custom pixel UI: 70+ hand-made 12×12 icons replace every emoji (anything else is pixelated and outlined on the fly, `icons.js`), Pixelify Sans, notched pixel panels and speech bubbles.
- **Fixes.** Smols rarely hit each other (family never); dawn grump count; skipped tiers still unlock; goals follow the living colony; campfire songs work; two toasts at a time.

## 0.6 What v3.1 added: the social life (`social.js`)

- **Opinions with reasons** (RimWorld). Each smol keeps memories about others: `[delta, time, life, key, text]` that fade over their life (20–60 min), plus temperament fit (5 personality genes) and +18 for family. Labels: best friend ≥60, friend ≥25, rival ≤−25, enemy ≤−55, partner (parents of an egg). Gifts, teaching, cuddles, play, chats and good talks raise opinions; shoves, punches, arguments and hurting a friend lower them.
- **Fights.** Smol on smol is a *shove* (light) unless they're rivals or one is in a tantrum (*punch*). The victim holds a grudge and (if brave) hits back, for up to three blows, then they back off. Rivals who cross paths start something (a RimWorld social fight, ~2.5%+ per 2 s, 2-min cooldown). Friends who see it take sides. Mutual-rival punches are "brawls" and go in the chronicle. A gift to someone you fought makes up. Friends and partners never fight; family rarely. Tuned in a 30-min sim of ~30 builders: ~70 shoves, ~20 punches, 3 brawls, 4–5 tantrums.
- **Conversations.** Tribe smols swap short phrases; builders and up hold 3–8 line conversations that alternate in speech bubbles (voice blips), with topics: their own news (from the diary), kids, gossip about a third smol (spreads opinions), ideas (spreads know-how), the sky one, grief, food, weather, and for thinkers the stars and the old story of the pods. Rivals argue instead, and arguments often end in a shove. Smols whose temperaments clash (low compat) or who are in a bad mood sometimes turn a chat into an insult (RimWorld's slights): -14 "insulted me", stacking to -45, and the insulted one may hold a grudge. Best friends and partners never insult each other. This is where most rivalries come from; a 30-minute builder sim gets roughly 10–20 insults, 1–7 rivalries, 5–10 punches and 4–7 brawls.
- **The ledger.** Each smol keeps a 40-entry diary; tap a smol → 📜 story shows its people (with reasons) and its life. Titles are earned by deeds (grump-chaser, fire-finder, inventor, peacemaker, brawler, teacher, wordsmith, explorer, gossip, kind, wise), at most two living holders each. The island keeps a chronicle (menu → 📜 chronicle): inventions, firsts, brawls, newcomers, titles, the dead.
- **Grief and graves** (Creatures crypt, DF). A smol leaves a grave with an epitaph written from its life; friends, family and partners grieve (lonely, slower, "i miss…"), tickles shorten it.
- **Moods.** A smol furious or miserable for a while throws a tantrum (shoves whoever's near; a tap ends it). A content tool-user sometimes gets inspired (ideas 3× faster for a minute).
- Plain-words thoughts ("hungry · eating the berry bush"), a dusk grump warning, unique species names, harder iq achievements, and the coach never blocks taps.

## 0.7 What v3.2 added: something happening every minute, and an ending

Built from the owner's "fun every second" brief, the playtest agents' notes and the colony-sim research (RimWorld's storyteller, Frostpunk's choices, Don't Starve's exploring, Spore's stage goals).

- **Pacing.** Growing up is faster (kid 60 s, teen 130 s, adult 210 s), evolution has momentum (a child takes the more evolved parent's gene 30% of the time), parents' habits echo twice as hard, and the builder step needs planning 0.45. An engaged player reaches tribe in ~40 min, builder ~55–70, thinker ~70–95, ascended ~2 h; hands-off it's roughly twice as long.
- **The storyteller** (`director.js`). From minute 8, every 3–6 minutes, a story card with 2–3 choices: grump raids (smite / hide / fight), storms, sniffles that spread, falling stars (crystals), feuds (mend / duel / exile), lost kids, harvest feasts, grump camps and visions (a thinker dreams 3 ideas and you pick one). Threat scales with tier, population and buildings, eases after losses, and there's always a breather after trouble. Unanswered cards take the free choice after 45 s. An alert banner counts down and flies the camera there. Settings: calm / balanced / wild.
- **Places in the fog** (`sites.js`). Each island hides pod wrecks (loot, plus seven ark logs that tell the story in order), old ruins (carvings teach an idea), crystal caves, giant nests (an unrelated egg) and grump camps (captured smols to free: burn it with magic or raid it). Seen-but-unvisited places show a bobbing "?" and sit on the minimap.
- **The ending.** The last log says the big thought is a signal. The goals strip walks the late game: astronomy → resonance → the idea → the spire's materials → raising it. Finishing it plays an ending cutscene (the signal, the ark coming back, pods rising), then a summary with keep playing / share / **new game+**: a new island, heirs of your best girl and boy (looks, personality, instincts kept; brains cut back to tool-user) and a storyteller 25% harder per round. Every mind left on the old island thinks 1.5× faster.
- **Dead content made real.** Resonance: ascended smols near crystals think 1.8× faster and build faster together. The star dome gives 90 s of storm warning instead of 35. Herb lore: herbalists walk to sick friends and nurse them (twice as fast with healroot in hand). Palisades stop grumps (a raid party breaks through after ~25 s, with a "the palisade is holding" note). Prayers last at least 30 real seconds at high speed. Saves let go of long-dead family branches past 600 entries.

## 0.8 What v3.3 added: a soundtrack, seasons you can see, and easier hands

From the owner's third playtest notes.

- **The soundtrack** (`music.js`): *songs for small minds*, 20 original pieces (~42 min) in the spirit of a cosy farm-game score: music box, felt piano, breathy flute, nylon plucks, soft strings, a little marimba and shaker, all through a hall reverb. Each song is written by hand as scale-degree melodies plus a chord per bar (sections A and B, played AABA twice, the second time with a harmony line and a bell sparkle on the bridge); the engine adds the band from an accompaniment pattern (arp, waltz, jig, harp, strum, bounce, block chords). Nothing is a file: notes are scheduled 0.5 s ahead on the shared AudioContext through a music bus under the master, so every mute covers it.
- **The playlist** follows the island: season-only songs (2–3 per season), day and night songs, a rainy-day song that waits for rain, "missing you" after a death, "the big thought" once thinkers exist. Quiet gaps of 20–60 s between songs. Raids and storms duck it. The title card plays the main theme, the ending plays "the big thought". Settings has a volume and a jukebox of every song you've heard; a "♪ title" toast names each song.
- **Seasons you can see.** Blossom petals drift in spring, seed fluff rises on summer days (and more fireflies at night), leaves tumble in autumn, flurries fall under winter clouds and all winter rain is snow. A banner announces each new season.
- **Easier hands.** A creature can be tapped anywhere on its body plus a ring around it (24 px on touch, 14 with a mouse); a tap on the body beats a nearby item, a tap in the ring loses to an item actually under the finger. A tapped smol holds still for 3 real seconds (capped in game time, never while fleeing or swimming; asking it to do something lets it go).
- **The word book is a side panel** on every screen size (2 columns on phones), and the camera frames the smol you're teaching beside it (`camera.shiftX`).
- **A real tutorial**: 11 steps after naming, covering why you're here, moving and picking, food, tickle and tap, words, the brain, sparks, prayers and magic, eggs and evolution, ideas and buildings, the living island (fog, places, strangers, grumps, seasons, story cards) and how to win. Steps you do wait for you; steps you read have "next", and the thing they're about glows.
- **Intro fix.** Laser bolts steer onto the other ship's hull and burst on contact, and the big beam runs from the warship's cannon to the ark.

## 0.9 What v3.4 added: minds, live pods, and a guide for the whole game

From the owner's fourth round of notes and a playtester's complaint that pods were "found" but never mattered.

- **Minds** (`mind.js`, saved as `c.mind`): a layer of thinking around each smol's neural net. It's the first stretch of the road toward smols that think the way people do: each piece changes behaviour you can see, and more of it switches on with each tier.
  - **Memory** (all tiers): a diary of vivid moments that fade. It holds 4 + 2×tier entries; a better memory gene and a higher tier make them fade more slowly, and repeats strengthen a memory instead of copying it.
  - **A map of places** (critter and up): food, water, fire, beds and danger. Needy smols walk to what they remember, and a spot that turns out empty loses value. Tribe smols share places when they talk, and parents pass places on to hatchlings.
  - **Dreams**: while asleep the net is retrained on its most important recent experiences (`SB.Brain.replay`).
  - **Curiosity**: a reward for new actions on new things, plus a small one when the world surprises it. It fades with repeats and fear smothers it.
  - **Reading others** (tribe and up): smols guess each other's moods. They comfort sad friends, keep clear of angry smols, give food to hungry family and friends, and go to watch smols who know more.
  - **Goals** (builder and up): a smol picks a goal from its drives and memories and sticks with it unless something clearly beats it.
  - **An inner voice**: feel, think, want, remember, read, decide and dream lines in the brain viewer's mind panel, and a short reason on the smol's thought line.
- **Pods crash live** (`sites.js` `crash` / `openPod`; the old findable wrecks are gone). From 10 minutes after the tutorial, a pod comes down every 9–15 minutes, up to 12. Each crash plays a short cutscene of the pod falling (`intro.js` scene `pod`), then the whole island as a map with the crash marked and a line from home, then back to where you were. The pod pulses on the minimap and bobs in the world.
  - The storyteller's "pod" card offers a rescue party (up to 3 grown, healthy smols walk out and bring the survivors home, and the survivors remember who came), a 12-spark lift home, or waiting.
  - After 12 minutes the survivors climb out on their own and turn up as strangers. A smol who wanders past can also open a pod.
  - The first two pods always hold two survivors; later ones hold 0–3. Pods carry loot and the next ark log.
- **"Play the tutorial?"** is the first question after landing. Yes runs the opening steps, then the **guide** stays for the whole game:
  - First-time explanation cards appear for things like pods, sickness, night, winter and story cards.
  - One tip card at the bottom shows anything urgent (drowning, pod down, stranger waiting, prayers, grumps, starving, sickness, a wild egg) with a "show me" button.
  - After 20 idle seconds, the card names the next goal and how to reach it.
  - ✕ snoozes a tip for 3 minutes. No turns it all off, and settings switches it back on.

## 0.10 What v4.0 added: a front door, bigger worlds, your hands in the world

From the owner's fifth and sixth rounds of notes (v3.5 never shipped on its own, so it rides along here).

- **Title screen** (`title.js`): a "Computer Cooked Games presents" card and the title over a slow orbit of a late-game city that builds itself in stages (it's a throwaway showcase game, never saved). Start, Load and Create World. Battle music and laser/boom sfx play under the presents card and the intro. The whole interface zooms on big screens (settings has a text-size choice).
- **Create World and many islands**: a name, a seed (or dice), a size, and choices for land, peaks, climate, food, grumps, storms and crew, plus stackable quirks (bunny boom, lush, crystal isle, tempest, grump moon, gentle, wild, old island). Every island has its own id and an IndexedDB copy; Load lists them with day, population and tier. Old saves show up as "legacy".
- **Bigger islands and 21 biomes** (`worldgen.js`, generator v2 for new worlds; old saves keep v1 and come back identical): small 384, medium 544 (default, twice the old area), large 768, extra large 1024. Eight island shapes (classic, volcano, twin isles, crescent bay, mesas, delta, lake district, fjord) and biome regions about twice as big. New biomes: blossom grove (cherries), maple woods, ashlands (vents and basalt), mangrove coast, bamboo thicket, red mesas, flower fields, coral shallows. Terrain builds per chunk with three levels of detail, and the item/creature grids only clear cells in use, so a big island costs about what a small one did.
- **Possess a smol** (`possess.js`): 3 sparks on the smol card drops you into its eyes. WASD and mouse look (joystick and look-drag on phones), act on what the crosshair points at, a make menu for crafting and build sites, survival bars, a compass home. You're limited to what its tier can do. Friends tag along and bring food. The brain doesn't decide while you drive; it learns from your choices (`P.LEARN_RATE`) and keeps them when you leave with Esc.
- **The sky's orders** (`orders.js`, a 6th tool from tool-users on): rally flags, explore beacons, work marks (chop, harvest, mine, hunt), blueprints from ideas the tribe knows, no-go/stockpile/home zones, and a jobs panel that nudges each smol's interests. Smols weigh trust, stubbornness, curiosity and needs; too many orders and they call you bossy.
- **The first hour** (`firsthour.js`): echo pips while smols practise, "what its kids will inherit" bars, a hatch reveal card that explains the baby's genes, learning chips from the real change in the net, small wishes you grant with the hand, a throw arc, and shaking fruit out of trees. Tool-user now lands around 22–32 game minutes for an engaged player.
- **Minds that feel human** (`mind.js`, `social.js`): beliefs tagged with where they came from (saw it, told, mum said, dreamt, guessed); hidden food, theft, lies and being caught; plan bubbles with re-planning and named routines ("Grandma Ula's fire"); values that shift in dreams; superstitions that become rituals and deaths that become taboos.
- **Collectible smols** (`collect.js`, `cards.js`): six trait slots and a fluff grade, rarity common to mythic, inherited with rare-parent luck. Collector cards, a smoldex with a hall of fame, and checksummed smol codes so a typo can't forge a legendary.
- **Cosy art pass**: warmer palette and golden light, turquoise shallows and foam, thatched huts with chimneys and lit windows, fenced farms, fruit on the trees.
- **v4.1 (first playtest of possession)**: the mouse never reached the look code (it listened on the overlay canvas, which ignores the pointer), so the head couldn't turn; it now listens on the island view, and the arrow keys turn the head too. The first-person HUD was redrawn in the game's pixel style: ticked compass strip, bracket crosshair with the target's name, keycap prompts, a portrait card with mood, segmented vitals with numbers, a paws/tool/bag hotbar, faint scanlines.

## 0.11 What v4.2 added: you can tell what things are

The playtest note was "it's very hard to tell what anything is" and "the models are very rigid". v4.2 is a readability and motion pass in code (`render.js`, `meshes.js`, `bodies.js`, `pixel.js`, `gl.js`); generated art comes later through the hooks below.

- **Outlines**: in the pixel look every object writes its id into the low-res buffer and the outline pass draws a 1px dark edge (a shade of the front object's colour) wherever one object stands in front of another, so a flat apple on grass still has a crisp edge, in god view and first person. Grass, flowers and sprites are skipped. In `?look=3d` a soft sky rim light does the same job.
- **Pickups pop**: loose items are 1.3× bigger, bob, cast a shadow further out, and in 3D get a stronger rim, a glint and a thin dark shell. Apple, cherries, berries, stick, stone, clay, egg, ore and flint were redrawn to read at god-view zoom.
- **Every tree is its own shape**: oak (broad, bright apples), birch (white trunk), pine (four dark tiers), palm (ringed curved trunk, drooping fronds, coconuts), sakura (pink umbrella), maple (red-orange teardrop), mangrove (stilt roots), bamboo (jointed canes, 660 → 260 tris). Berries sit on top of the bush; ore shows copper nuggets, flint is glassy, clay is a wet mound.
- **Less rigid**: plants bend from the root with rolling gusts and leaf flutter; smols squash and stretch on springs (landings, bonks, flight), lean into their stride, turn smoothly, squish on a turnaround and breathe when idle; in 3D the antenna, ears and tail trail behind.
- **Smoother ground**: mostly smooth shading with a little faceting kept, and biome colours blend over a couple of tiles.
- **Art hooks**: `GL.loadImage`, `SB.Render.loadArt(manifest)` (with a tiling ground-texture slot) and `SB.Pixel.override` for drawn sprite sheets. Missing images fall back to today's look; nothing is requested by default.
- Triangle counts are flat (big village: 332k pixel, 356k 3D desktop; 63k 3D phone); 3D adds one draw per visible item kind for the pickup shell.

## 0.12 What v4.3 added: from village to city, and it isn't safe (`economy.js`, `civ.js`, `threats.js`)

The owner wanted towns, money and a real challenge instead of constant cuddling. Two branches land together.

- **Eras**: band → village → town → city, with a banner, a civilization tab and goal steps. Eras slide back if the smols lose what made them. Early population caps grow with tier (12/16/20/28), then era caps and houses take over; strangers leave room for births. A village needs any two of campfire, hut, farm or totem.
- **Money**: debts remembered as memories → tally sticks → shell coins (town) → minted copper (city). Prices come from need and each smol's map; the bounty miracle pushes them up.
- **Market**: 8 goods, stalls with pixel price tags, shoppers comparing stalls, market days that spread gossip and ideas.
- **Jobs**: farmer, fisher, potter, smith, builder, trader, teacher (plus guards and a scribe in cities). Jobs run in families; kids apprentice with a mentor.
- **Roads and districts**: worn ground becomes trails, then paved roads in towns (faster to walk, bridges sit on them). Named, tinted quarters; new buildings: stall, house, council hall, mint, granary. City windows glow at night.
- **Council and the Law of the Sky**: a leader elected each season (coup if hated, genes set policy); your taps and tickles become written laws, sometimes misread, enforced by guards.
- **Threats**: grumps get stronger and smarter as the island grows. They hurt, steal, carry smols off to their camps (a rescue card follows), smash and burn buildings, and learn your walls. The village defends itself: the armed and brave stand, kids and elders hide in huts; builders rebuild what's wrecked. Kidnaps and camp cards have rolling caps so it stays fair.
- **Disasters**: rare and local: tsunamis on coasts, hurricanes in warm months, sandstorms near savanna, tornadoes, earthquakes under mountains. Every island gets the same total odds, split among the kinds it can get, and scaled by the storyteller (calm/wild).
- **Pacing (headless engaged-bot sims)**: builders 60–65 min, town 72–109, city 115–140, ascended 117–170 (target 125–150; the spread is generation turnover and glow inheritance in the last stretch, not food). Raids wreck 9–17 buildings a run; ~5 kidnaps; 1–2 disasters per 4 hours.
- **From v3.5**: funerals by culture (river, pyre, burial and memorials), a much bigger name generator, clickable guide tips, a bigger menu that fits the tree of life.

## 0.13 What v4.3.1 added: the hd pixel look (`hd.js`, opt-in, not the default yet) and grown-up faces

Faces: from tribe on smols look grown-up and their face follows their mood (see "Faces grow up" in the creatures section). The hd look:

A third look, in the spirit of HD-2D (Octopath Traveler, Eastward): settings → look cycles pixel art → hd pixel → classic 3D (saved in `smolbrains-look` as `"hd"`; `?look=hd` too). Switching back loads today's look untouched: every hd change sits behind `R.hd` or `#ifdef HD` in the shaders.

- **Generated art** (Nano Banana 2 with the approved HD-2D mock as style reference, then seam-fixed, area-downscaled and palette-snapped to crisp pixel art): `art/hd/tiles.png`, a 4×4 atlas of 64 px tiles (grass, dirt, sand, rock, snow, farmland, water, bark, leaves, pine needles, blossom, palm fronds, stone brick, thatch, planks, roof tiles), and `art/hd/items.png` + `items.json`, 46 pickup sprites at 32, 16 and 12 px. ~150 KB in all, fetched only in this look.
- **Tiles are detail maps** (each tile divided by its own average colour), multiplied onto the usual colours, so biomes, seasons, snow, fog and night all still work. The ground picks its tiles from the vertex colour and slope (green = grass, gold = sand, grey or steep = rock, white = snow, else dirt). Meshes get a tile per vertex from their colour and kind (`HD.materials`: tree trunks bark, crowns the leaves of their family, huts thatch/planks/stone, roofs tiles, farms soil), projected along each part's main axis; thatch and roof tiles always run in rows. Far away, where a tile would have more texels than pixels, the detail fades out so it never shimmers.
- **Pickups are sprites** (Octopath-style billboards snapped to the pixel grid) at the native size closest to what the zoom wants. Critters, the pod and plushies keep their meshes.
- **Light and lens**: a warmer, stronger sun with a dimmer lilac fill and deeper cool shade under trees; the scene renders at ~320 art rows (240 in the pixel look) with the same 1px outlines, then `HD.post` draws it onto a full-resolution canvas: depth of field from the depth buffer in first person (focus on the crosshair, the distance goes soft; the water surface writes depth there), a gentle tilt-shift in god view that switches off zoomed out to a map, a little bloom, and a warm grade with a soft vignette. Smols are pixel.js sprites as in the pixel look (faces, proportions and moods unchanged).
- **Phones**: weak phones start with the blur/glow off, any device drops it after ~4 s under 25 fps, and settings has "soft focus & glow on/off" (`smolbrains-hdfx`). Tiles and sprites stay on.

## 0.14 What v4.4 added: the first tool (`survival.js`, `possess.js`, `povhud.js`, `survival-art.js`)

The owner: "all good survival games have a toolbar and an inventory, let's just take it from them", and survival mode had to be a lot more understandable. So possession now follows the conventions every survival game shares, and a first-time guide walks you from a stick to a campfire. The rules live in `survival.js` (headless, tested); `possess.js` is the controls and the guide; `povhud.js` is the screen.

- **Hotbar and bag.** 9 hotbar slots (1–9 or the wheel; the item's name and what it does pop up), a bag that grows with the tier (tool-user 9, tribe 12, builder 15, thinker 18, ascended 27; a basket adds 9). Blobs have no hands at all, critters carry one thing. Stacks of 24 (12 for food, tools don't stack and wear out). Tab / I / C opens the bag: drag to move, shift-click puts a thing in the crafting grid, right click splits; on phones tap to pick up, tap to put down, hold for details (hold it, eat, craft with, split, drop). The inventory is `c.inv` on the smol, so it saves with it. Walking over your own drops picks them up ("+1 stick").
- **Controls.** Left click uses what you hold on what you point at (an axe on a tree, a pick on rock, paws shake trees and punch rock; hold to keep swinging), right click places or uses (eat, plant a sapling, put a log on a stump, feed a fire, give to a smol, place a building ghost, sleep in a shelter), F picks up (and pulls vines, snaps sticks off trees, prises rocks loose: a short timed pull), Q drops (shift-Q the stack), E does whatever the prompt's first line says, B opens the plans, R turns a ghost, Z sleeps, Esc backs out (bag → ghost → body). Keycap prompts under the crosshair list all three, locked ones say why ("copper ore! dig it out with a stone pick"). Phones: thumbstick, a look pad, and use / place / act buttons whose labels change with the target.
- **Vitals in our own pixel art**: rows of 10 hearts and drumsticks over the hotbar (Minecraft's layout, half icons, a jitter when low, a white flash and red screen edge when hit), flames that turn into snowflakes when cold (with a blue screen edge), and pep bolts (running and swinging use it, tiredness caps it). Compass, clock and portrait stay.
- **The first tool.** Vines (`NODES.vines`) hang off cliffs, riverbanks, boulders and ruins, never trees, placed from their own seeded stream (ids from 1e7) so nothing else on the island moves; three always grow within a short walk of the nest. stick + vine + rock = a rock-on-a-stick (`lashing`), a weak axe, pick and weapon. Two rocks knocked together make a sharp stone; sharp stone + stick + vine a stone axe (`hafting`); two sharp stones + stick + vine a stone pick (`picks`); two sticks spun on leaves make fire (the fire drill). The make tab lists known recipes with have / lack, and up to four "???" riddles for ones you're close to ("needs something bendy…"). Making one teaches the idea (`I.discover` / `I.learn`) and everyone within 7 learns a little by watching (`I.observe`).
- **Chop and mine.** Trees and rocks have hit points (`S.treeHP`, `S.ROCKS`), shake when hit, throw chips, and play chop / mine / crumble / timber sounds. Tool power: paws < rock-on-a-stick < stone axe / pick < copper axe. A felled tree topples (a render animation), leaves a stump that regrows in ~15 min, and drops logs, sticks, leaves and sometimes a sapling. Boulders shrink into 6 stones and crumble; copper ore needs a stone pick (smelting still needs a thinker's kiln). A log on a stump splits into 2 planks and firewood. Saplings planted on open ground grow into the biome's tree. Dropped heaps are piles (one world item for many) so the item cap stays safe.
- **Building.** The build tab (and the plans in hotbar slot 9) lists what you or your tribe knows, with materials against what you carry. Picking one shows a translucent ghost (green fits, red doesn't, R turns it) and right click places the site; aim at a site to see what it still needs; right click / left click delivers (a log counts as 3 sticks, a plank 2) and holding left click builds. New: the **lean-to** (4 sticks, 2 leaves, a vine), a shelter you can sleep in, warm at night; its idea comes to you with your first felled tree once you know lashing.
- **First-time guide.** stick → vine → rock → rock-on-a-stick → chop a tree → campfire (fire first, with the fire drill, if the tribe doesn't know it) → a lean-to (optional). A green diamond marks the next target in the world (an arrow at the screen edge when it's behind you) and on the compass. Skippable; remembered per browser (`smolbrains-firsttool`) and per island.
- **Death is real.** At zero hearts the possessed smol dies, grumps included (their usual health floor doesn't protect a smol you're driving, unless it's in a shelter). The death screen says who died, how, why it happens, what was in the pack (dropped where it fell) and which ideas died with it.
- **Balance.** The god-game AI never takes any of these paths: hand-made ideas carry `pov: 1` and are skipped by discovery triggers, pondering, the dreamer, ruins, strangers, NG+ and the orders menu; perception never sees vines; chopping with hit points only happens through `S.hitNode`. Vines are kept out of the island's clock too: they have their own id range, `tickNodes` walks `world._tickList` (every node but vines), `siteFree` ignores them (survival.js checks them for your own buildings), and `addNode` ids skip them, so an island with no possession plays out tick for tick as it did in v4.3. A smol you lived as keeps its pack: `S.tick` lets it eat from it and bring materials to its tribe's sites, and its best tool goes on its belt.

## 0.15 What else v4.4 added: 3D smols (`voxel.js`), no more vanishing up close, hd smols

From the owner's playtest: smols vanished in first person when you got close, and the hd look never gave the smols an hd treatment. The owner grew up on Minecraft, so the smols became little voxel models built from their own pixel art.

- **Voxel smols (`SB.Voxel`).** `pixel.js` now splits its decisions out into `PX.spec(c)` (palette, pattern, proportions, tier gear, grown-up flag), and the face painters are exported (`PX.paintFace`, `PX.cuteFace`, `PX.glasses`). The sprite bytes are unchanged. `VX.build` reads the same spec and sculpts a 48×54×48 grid at one voxel per sprite pixel. The shapes are rounded blocks (superellipsoids):
  - legs, torso, head and arms for upright smols, or one blob body for blobs and critters;
  - all the gene and tier gear: ears, horns, antenna, tails, wings, fins, fluff, tribe headband and feather, builder belt and pouch, thinker brain, ascended or accessory halos, crowns, scarves, buds, crystals and moons;
  - grump spikes and brows.

  It meshes with per-vertex AO and a little per-voxel colour jitter. Each model's height matches its sprite. The face is a decal: the sprite's own face painter draws it into a 32×32 frame, and it is placed on the head's front surface. The face follows `Chem.face` and the sprite frame (blink, sleep, eat, happy, sad, scared), so grown-up faces and moods carry over.
- **Animation is all in the vertex shader.** Every part has a pivot (legs, arms, tail, wings, ears, head, floaters). Walking swings legs and arms, holding raises the arms, waving waves, and tails wag, wings flap and halos bob. Blobs hop and squash, and the body leans like the sprite does. Each smol is two draws (body + face), with one shared shader. The outline pass inks them through their object id, and the water cut works as for the sprites.
- **Caching.** Models are cached by a look key (genes that change the art, tier, stage, grump, palette), and faces per model and mood. It is an LRU of 48 with at most 2 builds per frame; a build takes ~1–2.5 ms. A smol waits as a sprite until its model is ready. A mood or held item never rebuilds the model; growing up does.
- **Where they draw.** In first person they draw always (any look) while a sprite pixel would still cover ≥ 0.7 art pixels (~13 units in the pixel look, ~17 in hd), up to 48 a frame. Further away, and anything past that budget, draws as sprites. In god view they draw in the **hd look** when zoomed in close enough that a sprite pixel would be ≥ 1.6 screen pixels; zoomed out they become sprites again. In the pixel look they are opt-in: settings key `smolbrains-smols` = `"3d"` / `"flat"`, `?smols=3d|flat`, `SB.Voxel.setGod(on)`.
- **Near the camera.** In first person a smol fades out with a 4×4 ordered dither over its last ~0.4 units in front of the eye (`VX.nearAlpha`, distance to a capsule around the body). Until then it is solid, so it no longer pops away when you walk up to it. The possessed body gets a soft push-apart from other smols (`P.apart` in possess.js), so you stop at their surface instead of walking into them.
- **HD smols.** In the hd look, sprite sheets go through `PX.hdify`: normals from a blurred silhouette, 4 tone steps plus a honey highlight, Bayer dither, a fur/skin hash (fluffy smols get more), a sky rim light on the shadow edge, and outlines coloured from the neighbouring pixel. Face pixels are untouched, and smols also get a soft contact shadow. The pixel look is byte-identical to before.
- Concept art for the look came from two Nano Banana Flash images, about 4 credits; they are not shipped.

## 0.16 What v4.4.1 added: less cuddling — love is slow, earned, and between partners (`social.js`, `creature.js`, `civ.js`)

The owner's call: an egg about every 15 minutes instead of every ~3, hearts only for partners and kids, and a housing limit, so the population grows slower and feels earned. Blobs, critters and tool-users keep the old quick breeding (the band needs its generations); it all applies to pairs of talkers (tribe and on).

- **Love grows slowly**, and only in a settled grown-up: fed, warm, calm, healthy, not grieving or out fighting (`Creature.loveK` scales `Chem.LOVE_RATE`). Spring ×1.5, summer ×1.1, autumn ×0.85, winter ×0.5; a small band falls faster (pop < 6 ×3, < 10 ×2, < 14 ×1.4); from the builder age, before the first hut is up, ×0.6.
- **Partners.** A smitten talker courts one smol: a hug, a gift, a shared meal, a good talk, a game, or just time near each other each count once per 20 s, each is a diary line (🌸) and a little warmth both ways; three of them and liking each other (opinion ≥ 12) makes partners (diary, chronicle, a burst of hearts). They can say no (they don't like you, or aren't in the mood): "turned me down", a little shyness. Seeing your partner hug someone you don't rate is jealousy; three times (twice for their best friend) is a break-up, and couples who've come to dislike each other drift apart. A widow mourns a day before loving again; a widow's kids may resent the new one. From the tribe on **only partners have eggs**.
- **Hearts** (💕 emote, the hearts particles, "cuddles") only between partners and between parents and their own kids (and the sky's hand, and a parent with its own egg). Friends hug: a smile, "hugs", and the hug doesn't settle a smitten heart. Grown-up talkers hug only family, friends and the one they're courting.
- **Eggs.** 12 minutes' rest after each (`Creature.EGG_GAP` 720 s, ×0.3/0.5/0.75 for a band under 6/10/14, +40 s per young kid), and love has to come back after, so about a quarter-hour egg to egg. An egg costs two bites (the granary, the couple's pouches, food lying near) or the mother's reserves; nothing to hand and hungry, they wait. Partners both ready get a strong pull toward each other.
- **Housing** (`Civ.room`): once the builders are here and someone knows huts, every finished hut sleeps 5, a house 8 (a wrecked one half, until it is rebuilt), and 12 more by the fire; a full village has no eggs ("no room for a baby. we need a hut"), and builders put huts and houses first once it is nearly full. Strangers still arrive.
- **Work drive** (`c.duty`): from the builder age a grown-up who isn't working grows restless (~4 min to full) and leans toward building and making over cuddles and games; working settles it, and the workers notice who never helps.
- **Compensation** (fewer births means fewer generations, so the late game is kept on schedule another way; the numbers are in §6):
  - talkers live two-fifths longer (`Creature.TALKER_LIFE`; elder age scales too);
  - each child of the tribe on gets more of its parents' practice (echo ×1.8) and leans harder toward the more evolved parent (`Game.CARE_MOMENTUM` 0.65, from 0.3), and a thinker's glow echoes ×1.25 more (`Game.GLOW_ECHO`);
  - a tribe has room for 24 and builders for 30 (`Civ.TIER_CAP`; 20 and 28 before), so long-lived elders and newcomers don't crowd out the children who carry the next step;
  - partners both ready go and find each other; a builder or thinker with nobody, in love, goes looking for someone free (and is a catch: two good moments make partners, not three);
  - strangers come oftener while the colony is under 30, and urgently while there are fewer than three couples or free talker pairs who could become one (`Strangers.couples`);
  - the homes the colony already had when housing starts count (`civ.roomBase`), so the limit doesn't stop a tribe dead while its first huts go up;
  - thinkers studying a story pole or a wonder are working (duty), and grow restless half as fast;
  - the path to writing is shorter: a story pole comes to a builder with a blade in the pouch or working with sticks, it's the first thing builders put up once known, and a thinker near a pole can think of writing;
  - a city needs 30 smols, one fewer for each finished house (down to 26) while nobody's going hungry (`Civ.cityPop`);
  - every island has a few thought crystals 30–50 tiles from home (`WorldGen`, ids from `CRYSTAL_ID0`), when none are nearer.
- Also fixed: a builder's fetch step now looks as far as its plan did (it planned with 1.5× its search radius, then failed to find the fibre at the first step, so rebuilds stalled), claims from plans dropped by a conversation, an order or a stranger's choice no longer hide items forever, and builders haul makings from up to 64 m once nothing is near (the flaky threats test).

## 0.17 What v4.5 added: hands on from the first minute (`tricks.js`, `quests.js`)

The owner's verdict on v4.4 was that you mostly sit and watch. v4.5 is milestone 1 of `docs/smol-brains/plans/plan-hands-on.md` (the plan that reorders the next releases around that note).

- **▶ play now** on the title starts a fresh island in one tap; "custom island" keeps the form.
- **Tricks.** Eight trained behaviours, each a situation plus the right verb (or the one to leave alone).
  - The meter is read live from the smol's net (`Tricks.chance`: `Brain.qOf` over the everyday verbs, softmax at 0.25), so every lesson visibly moves it, including lessons meant for other tricks.
  - Learned at 80%, forgotten below 45%. The first time pays 2 sparks; instinct tricks are seeded quietly and don't count as taught.
  - "Set it up" drops the item beside the smol and sets `c.lure`, which adds +3 to that thing's salience for 15 s in `think()`. The smol looks at it; what it does is still its brain's choice.
  - Real rounds in the headless test: a hungry blob learns "eat when hungry" in 1–2 lessons; "come when called" takes about 2 lessons over 2–6 calls.
- **Quest board.** `Quests.CHAPTERS` holds six chapters of 3–4 quests with spark rewards, "how" hints and shortcuts, plus a chapter bonus. It's shown in the goals panel with the old goals underneath. Counters it needs (possessions, possessed meals, new places, first tool) come off the bus. It's saved as `game.quests`.
- **The first possession is free** (`Possess.cost`). The tutorial's brain step became "teach it a trick".
- On desktop the tutorial card moves left of an open side panel (smol card, tricks) instead of sitting on top of it.

## 0.18 What v4.5.1 added: a trick loop you can read, and a faster start

From the Computer Cooked bot's two playtests (sim 7/10, then a 5/10 on v4.5.0). The meter went down while it was teaching: a tickle rewards whatever the smol is doing at that moment, so tickling while it walked off taught it to walk off.

- **Tricks you can read** (`tricks.js`, `ui.js`):
  - The bar is now progress from where this smol started (`r.b`, its instinct when first read) to its goal (`T.goal`: 80%, or half the way that's left for a smol born good at it). Every new smol starts near 0%.
  - A trick takes three good lessons (`T.REPS`): a tickle for doing it (a tap for doing what it should leave alone), on the trick's own thing. The bar shows a third per good lesson, never past what the net really does (`T.shown`).
  - "Set it up" opens a 30-second session (`c.trickSession`). Inside it, a tickle or tap that lands while the smol isn't doing the thing is held back (`T.gate`, called from `Creature.tickle`/`tap`): "wait for it…". While it does the thing, a lime "🪶 tickle now! it eats" tag bobs over it, and each good lesson floats "+33%" up from it. The camera stops following, so the smol stays under your finger. If it isn't hungry, the set-up says so.
  - Old saves get a starting point the first time they're read; tricks already learned stay learned.
- **A faster start**: "▶ play now" is always on the title (also for returning players). It skips the opening film (the menu can still play it), the fall to the nest takes 2.4 s instead of 5.5, the tutorial starts without asking ("skip tutorial" is on every step), and the pod opens in three taps.
- **One thing at a time**: event windows (story cards, strangers, the storyteller) wait their turn instead of replacing each other, and windows that come up while you're possessing queue for when you leave (only the last one was kept before). Tips and the tutorial card hide behind a window and while a side card is open; toasts sit left of the side card. The card no longer opens by itself after naming. The tutorial card is one height, so "next" stays put.
- **The brain is one tap away**: a 🧠 brain button on the smol card, and "b" opens the brain of the picked smol, or the one the camera follows, or the one nearest the middle of the screen.
- **Keys**: Backspace does what Esc does (close a window, leave a body), because Esc also leaves fullscreen. The site's player page now holds Esc for the game in fullscreen (Chrome's keyboard lock; holding Esc still leaves), from the site session.
- **Menu → goals** shows the quest chapters (done, current with its quests, locked) above the milestones.
- **Day and night at high speed** (`render.js`): lighting eases toward the sim's value in real time (about 0.25 s for light, 1.2 s for weather), the sun and moon blend through dawn and dusk instead of snapping at 0.78, and lightning flashes fade in real time and are fainter and rarer above 2× (at 8×: one faint flash every 4 s at most, where a storm at dusk used to strobe). `tests/render.test.js`.
- **Taps on tall peaks**: `R.pickGround` marches over the island's real height range, so a tap on a volcano top (43–50) picks the top.
- **Test flags stay in the URL**: "play now" and shared-world links keep `?cctest=1` and `?tester=`.

## 0.19 What v4.6 added: a small body's day (possessing a blob or a critter is a game)

The bot's playtest: possessing a blob was "walk and eat" because the bag said "no hands". Every body now has a loop, and the small ones feed evolution.

- **A mouth** (`survival.js`): blobs and critters carry one mouthful in a single slot (`S.hotN` is 1 below tool-user; `S.stackFor` caps a mouthful at 3). A blob takes small soft things only (`S.mouthy`: food, leaves, fibre, fur, seeds, nuts, balls, plushies): "too big for a blob's mouth. nudge it along instead". Carrying in the mouth is practice for hands (`habit hands`), so it echoes into the kids.
- **Tug leaves** (`S.tug`, F on a bush or tree): a mouthful of leaves; each plant gives one every 40 s (`game._tug`, not saved).
- **Line the nest** (`S.lineNest`, left click the nest holding leaves, fibre or fur): three mouthfuls make it a step cosier, up to 3 (`game.nest`, saved). Eggs within 4 tiles of a cosy nest warm faster (`world.js` tickEgg: +0.003 a step). An island nobody possesses never lines its nest, so it plays out as before.
- **Sniff** (G, or E with nothing in front of you): the marker points at the nearest food (loose food beats a plant unless the plant is much nearer) for 14 s; the compass shows 👃.
- **Share**: right click a friend with food in your mouth: "share your berries with Bea" (a blob can give now, too).
- **Bump trees**: a blob's left click on a tree shakes it like the god hand does.
- **A small body's day** (`P.BLOB_QUEST`, its own guide beside the first-tool one): eat something → sniff out food → tug leaves → line the nest (n/3) → bring a friend food; +3 sparks and "its kids will lean toward hands". Remembered per island and per browser (`smolbrains-blobquest`). Tool-users still get the first-tool guide.
- **The way to hands**: the bag's make tab, for a blob or critter, says how far it is from hands and shows the hands echo it has built up (🤲 n/18).
- **Home before dark** (every body): when night falls while you're possessing, a 🌙 marker leads to the nearest shelter (a hut, house or lean-to, a lit fire, or the nest), and getting there pays 1 spark once a night (`P.shelterFor`, `settings.povSafeNight`).
- **Eyes adjust**: in first person, night and storm light gets a lift in the sky and ground ambient (`render.js`), so a smol's view at night is dim blue, not black. God view is unchanged.
- **A calmer clock**: the HUD clocks move in ten-minute steps (one tick about every 8 real seconds at 1×) instead of every in-game minute.
- `tests/possess.test.js` §9 covers the mouth, tugging, the nest, sniffing, sharing, the quest, eggs by a cosy nest, and the save.

## 0.20 What v4.6.1 added: signs for blobs, a save you can see, who a smol is

From the bot's sim wish list (K-0011): "player-placed zones and a go-there at the blob stage", "an autosave indicator", "personality and relationships at a glance".

- **Orders from day one** (`orders.js`): once the tutorial is done, the 🚩 orders tool is there for blobs. A **🚩 rally flag** is a "go there": blobs who trust you wander over and hang about. **🏠 home** (wanderers drift back) and **🚫 no-go** zones work for blobs too. The explore beacon waits for critters; work marks, blueprints and the stockpile wait for tool-users (greyed until then). A blob-stage story card explains the three it can use. The trust chip (🚩 n%) is on every smol's card once orders are open.
- **💾 autosave blink**: a small 💾 lights by the menu each time the island saves (every 20 s and when you leave; `Save.save` emits `saved`). Menu → settings says when it last saved.
- **Who it is, at a glance**: under the thought on a smol's card: its three strongest traits, its parents ("child of A & B", or "one of the first"), its best friend and who it can't stand.
- `tests/orders.test.js` §1 and §1b: the tool opens for blobs after the tutorial, and trusting blobs go to a rally flag.

## 0.21 What v4.7 added: faster words, save slots, sandbox islands, calmer windows

The rest of the bot's sim wish list (K-0011): "faster word learning", "save slots", "sandbox spawns".

- **Faster words** (`words.js`, `creature.js`):
  - A smol can take in the same word again after 4 s (it was 9).
  - A lesson sticks half again as well (`WD.FRIEND_BONUS` 1.5) when a friend within 6 tiles already knows the word.
  - A smol that learns a word says it to those near it, and each of them picks up 0.2 of it.
  - Every lesson floats "+36% “food”" up from each smol that took it in (👯 when a friend helped).
  - Together these take a word from about 3 lessons 9 s apart per smol to 2 or 3 lessons 4 s apart, and a tribe catches on from its first learners.
- **Save slots** (`Save.keepCopy`): menu → settings → "📌 keep a copy" stores the island as it is now as its own island ("name · day 12") in 📂 load game. The island you're on stays the active one. Playing the copy carries on from there and never touches the original. It needs IndexedDB (a browser that keeps one island can't keep copies, and says so).
- **Sandbox islands** (`Game.sandbox`, `Game.sandboxSpawn`): create world → mode → 🧪 sandbox.
  - ✨ magic gets a spawn palette: a grown smol of any tier (blob to ascended), an egg nearly ready, a grump or a pile of fruit. Pick one, then tap the island; it stays picked so you can place lots.
  - Miracles are free.
  - The island doesn't post a leaderboard score.
  - Normal islands can't spawn.
- `tests/sandbox.test.js`; `tests/words.test.js` §9.

And the bot's third playtest (K-0021, 6/10, up from 5):

- **One window at a time** (`ui.js`): event windows (story cards, strangers, the storyteller) show one at a time. They come at least 25 s apart (`UI.EVENT_GAP`), never while a button is held or within 0.8 s of a click, and never in a smol's eyes or within 4 s of leaving one. The game is paused while a window is open. A third story card waiting becomes a toast. The tutorial, naming, "while you were away" and the ending still come straight away.
- **A wider tickle window** (`tricks.js`):
  - A tickle (or tap) up to 2.5 s after the smol finished still counts (`T.GRACE`, was 1.5), and the lesson goes to the eating, not the walk it has started since (`T.target`, used by `Creature.lesson`).
  - "🪶 tickle now!" stays up about 3 s once it appears.
  - "Set it up" refuses a smol that isn't hungry ("isn't hungry yet (12%)") instead of starting a session that can't work.
  - The bar shows "lessons n/3" during a session.
- **The blob guide's first step**: nibbling a bush now counts as eating (`Creature` emits `nibble`; it used to be silent), for a full blob too. When the mouse can't be locked, the HUD says to drag to look or use the arrow keys.
- **A calm start** (`Game.pace`): at 1× the first two days run at 0.6 speed and the third at 0.8, the whole sim together, so 09:00 to 18:00 takes about 12 minutes instead of 7.5. Fast-forward is unchanged.
- **The way to hands, drawn**: the bag's make tab for a blob or critter shows blob → critter → tool-user with "you" marked, and bars for legs (walks) and hands (carrying) n/18.
- **Eyes adjust slowly**: the first-person night lift eases in over about 1.5 s instead of switching on.
- **A readable card**: on wide screens the smol card's text is a size up.
- Tests: `possess.test.js` §11 (a nibble ticks the guide) and `tricks.test.js` §9 (a late tickle counts and goes to the eating).

## 0.22 What v4.7.1 added: orders that work first time, a calm day 1, walk to food

The bot's fourth playtest (K-0022, 6/10). Its top three for 10/10: orders that visibly work first time, a calm first day, and one clear possess loop.

- **Rally works first time** (`orders.js`):
  - The first two rally flags on an island (`od.rallies`, `o.first`) pull everyone who can hear them and isn't starving or terrified (willingness at least 0.9).
  - Every smol shows its answer: "🚩!" over the ones on their way, and the reason over the ones who won't (`O.why`: 😋 hungry, 😨 scared, 🤒 poorly, 😴 sleepy, 🙄 stubborn, 🤨 doesn't trust you yet, 🤔 busy).
  - The order's chip sums it up: "5 going, 1 nah (🤨 doesn't trust you yet)".
  - "They listen n%" is big in the panel.
- **Locked orders say what they need** on the button ("needs critters", "needs tool-users").
- **A calm first day**: no strangers (`strangers.js`) and no storyteller cards (storms, raids, visitors; `director.js`) before day 2 of a new island (new game+ is exempt).
- **Walk to food**: G sniffs; G again walks you there by itself (`S.auto`, up to 40 s; any move key takes over), then "here! right click to nibble…". The sniff message says so.
- **The camera stays put**: event flights (a wild egg, a stranger, a storm, a hatch) are skipped for 8 s after you touch the camera (`UI autoFly`, `Input.touchedT`).
- **The card**: "💚 first friend: still looking…" until a smol has one, and the card's subtitle and who-line are a size up.
- Tests: `orders.test.js` §1c, `strangers.test.js` §6 (nobody on day 1), `possess.test.js` §12.

## 0.23 What v4.7.2 added: one clear possess loop

The bot's top three for 10/10 (K-0022), round two.

- **Find food, eat it, get paid** (`P.BLOB_QUEST`): a blob's day now starts "find food" (G sniffs, G again walks you there), then "eat it" (right click a bush, or left click food). Eating first is remembered for when its step comes. Every step of a blob's day pays +1 ✨ on top of the +3 at the end, and the step banner is big: "✓ find food · +1 ✨", then "next: eat it".
- **Readable guide**: the first-person guide is wider, with 15 px steps and a 14 px tip (was 13/12).
- **Your first flag**: placing it says "watch them come" and pulls the camera back so the walk is in view.
- **A steady test**: `threats.test.js` §5 is seeded from the village's set-up, not just the long run. Its "builders rebuild it" check passed or failed by luck (about 1 in 3 under a parallel suite).

## 0.24 What v4.7.3 fixed: a new player's first five minutes, played through

Played as a brand-new player at 1280×800 and on a phone (title, play now, skip the tutorial, open the pod, orders, possess):

- **No window when you skip the tutorial**: the blob-stage orders news is a toast about a minute and a half later ("🚩 new: orders (key 6)…"), not a window the moment you skip. Tool-users still get the full orders card.
- **The first tutorial card** ("tap the crashed pod") no longer reads "-1/7"; the count starts at the next step.
- **Taps right after possessing work**: the "you are …" intro was eating the first taps (it caught pointer events, even while fading). It's click-through now and still fades by itself.
- **The phone's big button** says "walk to food" once you've sniffed some (it said "sniff for food" both times).
- **The orders panel** says "your first 🚩: they come" until two flags are down, instead of a listen % that the guaranteed first flags don't follow.
- Checked at 8×: lighting through dusk is smooth (largest frame-to-frame step 1.3 on a 0–200 scale). A storm shows a lightning flash now and then, as designed.

## 0.25 What v4.8.0 added: ⏭ skip to the next interesting thing

The first ten minutes have quiet stretches: waiting for the twins to grow up, for an egg, for the first wish. 16× is there, but you have to watch for the moment and slow down yourself.

- **⏭ next to the speed** (key n): time runs at 16× until something worth seeing happens: a hatch, a smol growing up, an egg (yours or wild), a pair, a prayer or wish, evolving, a first idea, a stranger, a grump, an incident, drowning or a death. Then it drops back to the speed you had, toasts what happened ("🌱 Brompius is now a kid"), flies the camera there and opens that smol's card.
- **Half a day at most**: an island with nothing going on gives up after half a day ("🌙 half a day went by quietly").
- **You're in charge**: changing the speed yourself, or pressing ⏭ again, stops it and keeps your speed. It won't start while you're in a smol's eyes, and the first 2 seconds ignore echoes of what just happened (the second twin growing up a moment after the first).
- **Tests**: `skip.test.js` (stops with a reason before half a day, an empty island gives up quietly, your speed wins).

## 0.26 What v4.8.1 added: short seasons

The second half of the roadmap's M2 "pace" item. A season lasts 2 days (40 minutes at 1×), so a new player rarely sees summer, let alone winter, in a first session.

- **Short seasons** (an island setting): a season lasts half a day, 10 minutes at 1×, so the whole year takes 40 minutes. Pick it under "more world options" when you make an island, or switch it any time in ⚙ settings. Normal is still the default.
- `SB.seasonDays(game)` is the one place that knows: the clock (`world.js`) and the "made it through winter" achievement read it. The setting lives in `game.settings.seasons`, so saves keep it.
- **Tests**: `seasons.test.js` (normal is 2 days; short runs spring → summer → autumn → winter → spring in 2 days and announces each; the achievement unlocks after a short year; a reload keeps the setting).

## 0.27 What v4.8.2 fixed: the bot's v4.8.0 playtest (K-0025)

Fun 5/10: "the sim ideas are strong, but it still plays as watch-and-click". The top three, then the bugs.

- **Fewer windows at the start**: for the first 4 minutes of an island (`UI.QUIET_START`), story cards come as toasts (title and first line) instead of windows. A falling pod is one window, not three: what pods are now sits on the map's caption, and the "send a rescue party?" card waits 20 s instead of popping up under your next tap.
- **Possession with something at stake**: a blob's first day in your hands starts hungry (food bar low), so "find food, eat it" fills a bar you can see. The step banners queue, so "✓ find food · next: eat it" is never covered by the next one when both finish at once. (A first-minute threat is still to come.)
- **A rally answers at once**: when a flag lands, every smol in earshot decides straight away, so the chip reads "rally · 5 going, 1 nah (😋 hungry)" from the first second, not "0 going". The first two flags pull everyone who isn't starving, scared or asleep.
- **⏭ says where it stopped**: the stop is a big mid-screen banner ("Grogou is now a kid · ⏭ skipped to here · back to 1×"), not a toast a window can hide. Wishes and prayers no longer stop it (they open their own windows). A pod cutscene now ends the skip properly. Before, it left the game running at 16× with no skip on.
- **Bugs**: [ or ] mid-skip stops the skip and keeps your speed (it used to drop to paused once the skip had already ended). The 🚩 orders slot is always in the toolbar, greyed out until the tutorial is done, so nothing shifts under your click. The blob orders toast times itself from this island (an earlier island's clock made it come at once). In first person, the jump on the first mouse move after the pointer locks is ignored (the view flew up to the sky). On the title, ▶ continue is the big button only for an island played in the last 12 hours; otherwise ▶ play now is.
- **Not a bug**: typing n in the founders' name box types an n. Keys go to the text box while you're naming.
- **Tests**: `firstminutes.test.js` (a rally answers at once with reasons, wishes don't end a skip, a possessed blob starts hungry).

## 0.28 What v4.8.3 fixed: possession you can finish (K-0027)

The bot's v4.8.2 playtest: popups and skip banners were much better (5/10). Possession was still the gap: no stakes, and the G loop stalled.

- **G, G, eaten**: a blob's nose only finds what a blob can eat (food on the ground, bushes, roots, gourds), not a palm it can't climb. Walking there stops at arm's length, or when a trunk is in the way, and then it eats: it faces the food and nibbles it, the food bar fills (and pulses), and the quest moves on. On a phone, a hungry blob's big button is "sniff for food" / "walk to food" even by water (it said "drink", so a phone had no way to sniff).
- **Stakes**: the first time you're in a blob on an island, it's hungry, whether or not the guide has been done before (the bot's bar was full because its browser had finished the guide). Until it has eaten, the food bar runs down, about a drumstick every 8 s, with a warning at the end. Hearts go when it's empty. That's the first-minute clock. A grump or the cold in the first minute is still to come.
- **Mouse look**: only the move right after the pointer locks is dropped. 4.8.2 also dropped big moves, which ate real fast flicks.
- **Cards don't stack**: tips wait while a smol's card is open (they covered its possess button), and the card's header has a 👁 that possesses (following is still f). A skip stop shows its banner and flies the camera but leaves the card closed.
- **One pod at a time**: the storyteller's "an escape pod came down!" waits until the pod has landed and its map is closed (40 sim s), instead of a window over the map.
- **Skip stops worth it**: growing up stops a skip only when a smol comes of age (a day-1 "now a kid" doesn't). An incident is named ("☄️ a star fell!", not "something's happening"). The orders panel tucks itself away 3 s after a rally or explore flag lands; the flag's label keeps the count.
- **Tests**: `firstminutes.test.js` §4 (G, G walks a blob to food it can eat and eats it) and §5 (a kid birthday doesn't end a skip, coming of age does). `skip.test.js` §1 now uses teens.

## 0.29 What v4.8.4 added: a grump in the first minute

The bot's top ask in K-0025 and K-0027: "possession has no stakes… a real threat in the first minute is the biggest lever." 4.8.3 gave it a hunger clock; this adds a chase.

- **The scout grump** (`possess.js` `scoutTick`, `creature.js` scout branch): the first time you're in a blob on an island, once you're 20 s in (`P.SCOUT_AT`) and out more than 7 steps from the nest (looking for food, say), "a hungry grump" catches your scent. It turns up about 15 steps away, off to one side of where you're looking, and comes straight for you, day or night.
- **It's faster than you walk, slower than you run** (1.35× your walking speed; running is 1.75×). If it catches you it stings: a tenth of your hearts every 1.6 s, the red screen edge, fear. It never takes the last quarter, so a first possession can't end in a death.
- **Getting away**: get back to the nest (within 5 steps), or next to two friends, or scare it (it goes home when frightened), and it gives up: +2 ✨. After 35 s (`P.SCOUT_MAX`) it gets bored anyway, with no sparks and a "next time, run for the nest" hint. Leaving the body ends it too. Once per island (`settings.povThreat`).
- **Tests**: `threat.test.js` (not straight away, then a grump about 15 steps off; it catches you if you stand still but never takes the last quarter; it gets bored; the nest pays +2 and sends it home; once per island; leaving the body ends it).

## 0.30 What v4.8.5 fixed: the rest of the open list (K-0025, K-0027)

Played through the items the bot hadn't reached yet, at 1280×800:

- **Tricks: a good tickle always counts.** A lesson used to count only if the net's score for the thing went up. On a well-worn habit (a hungry blob eating) a well-timed tickle can barely move it, and in play one in three good tickles didn't count. Now, during "set it up", the right hand at the right moment (while it does the thing, or up to 2.5 s after) is a lesson, once per go. Mashing still does nothing: a second tickle on the same go doesn't count, and a tickle before it does the thing is held back. The trick is only learned when the brain's own bar gets there too.
- **Checked, no change needed**:
  - [ mid-skip from 8× stops the skip at 8×.
  - Dragging the camera while an egg is laid: the camera stays with your drag.
  - A falling pod is one map, then the rescue question about 20 s later, never on top of the map.
- **Play now** says the island you were on stays in 📂 load game ("a fresh island. x stays safe in 📂 load game"): it never overwrites.
- **Tests**: `firstminutes.test.js` §6 (a tickle before the thing is held back; two good tickles are two lessons; not twice for the same go).

## 0.31 What v4.8.6 fixed: a set-up never leaves you waiting

In a 4.8.5 play-through, a "set it up" lesson sat for 25 s with the smol ignoring the food and nothing on screen saying why.

- **8 s in** (`Tricks.NUDGE`): if it hasn't gone for the thing yet, it looks at it again (the lure is renewed and it rethinks). A "👀 hmm?" floats over it.
- **16 s in** (`Tricks.NO_BITE`): the lesson ends and a toast says why: "🤷 Wady isn't biting: it isn't hungry enough. press set it up to try again, or wait till it's hungrier" (or "it fell asleep", or "its brain picked something else this time"). The cue is cleared and the panel is ready for another go.
- Once it has done the thing in a session, none of this applies: the usual 30 s window stays.
- **Tests**: `firstminutes.test.js` §7.

## 0.32 What v4.8.7 added: you can see the grump coming

In 4.8.4 the first-minute grump was announced in a line that faded after 3 s, and nothing pointed at it: in a play-through the first sign was the red screen edge.

- **A banner while it's after you** (`povhud.js` `threatMarker`): "👹 a grump is after you · 9m · 🏠 nest 14m", red, under the compass. When it's on you: "👹 it's got you! run!".
- **A red marker on the grump** (or a red arrow at the screen edge when it's behind you, stacked under the other arrow).
- **The guide points home**: while the chase is on, the lime marker points at the nest instead of the next quest step.
- The marker code is shared now (`mark()`), so the guide and the grump place their arrows the same way.

## 0.33 What v4.8.8 fixed: the bot's v4.8.5 playtest (K-0033)

Fun 5.5/10 (up from 5): "possession finally has a loop: hungry, walk out, eat, grump. It still feels like ticking quest boxes more than surviving."

- **Vitals you can read at a glance**: in first person, hearts and food are 26 px icons (17 on phones), up from 18 (13). Warmth and pep sit smaller underneath. A drop flashes the row, a nearly empty row glows red and shakes, and low food rumbles (a sound every 6 s).
- **The grump gives warning**: it turns up about 19 steps away, in view, then stands and growls for 3 s ("👹 a grump spotted you! run!") before it comes. The banner (moved below the speech line) and the green arrow home are from 4.8.7.
- **A reason to stay in the body**: right after "eat it", the blob's day goes "carry food home to your hungry friend". Your friend really is hungry and says so. The marker points at food, then at your friend once you're carrying it, and it pays +2 ✨. Then the leaves and the nest, as before.
- **Esc keeps fullscreen**: while you're in a body in fullscreen, Esc is locked to the game (Chrome's keyboard lock), so it leaves the body but not fullscreen. Hold Esc to leave fullscreen.
- **A click selects, a drag carries**: with the grab tool, picking up a smol now needs a real drag (12 px, or a 0.18 s hold), so a click on a blob under a tree opens its card instead of carrying it off.
- **A version label**: "v4.8.8", small, bottom right.
- **Not a bug**: the clock moves in 10-minute steps (about 8 s of play at 1×), so 08:10 → 08:20 after a G is the clock, not a jump.
- **Tests**: `possess.test.js` follows the new order (the friend is hungry, feeding pays two). `threat.test.js`: it growls first, and starts well off.

## 0.34 What v4.8.9 fixed: the bot's v4.8.8 playtest (K-0035)

Fun 5.5/10 (flat). The tester could only send single key taps, so the chase went untested.

- **Vitals scale with the window and say their number**: hearts and food are `clamp(26px, 3.8vh, 40px)` (30 px at 800 tall, 40 on a 1080p+ screen), each with its percentage beside it in big type, red when low. (Measured live: 30 px icons at 1280×800, and the label matches the bar.)
- **Eating is finding**: food you found and ate yourself (a right click on a bush, say) completes "find food" and "eat it" together. Only a G sniff counted before, so the guide sat on "find food".
- **Every first possession gets its grump**: no longer only once you're out past the nest. About 20 s in, wherever you are, it appears about 19 steps off and comes. "Safe at the nest" and "safety in numbers" count once it has been coming at you for 8 s, so you see it come even if you never left home.
- **The trick nudge shows where you look**: at 8 s a toast says "👀 Wady is thinking about it…", as well as the bubble over the smol (which can be off screen).
- **Tests**: `threat.test.js` §2b (a grump by the nest too; safe there once it has come at you), §2 (not straight away). `possess.test.js`: eating first counts for both steps.

## 0.35 What v4.8.10 fixed: the bot's v4.8.9 playtest (K-0037)

- **Coming back runs at most one island day**: the catch-up for time away is capped at `SB.DAY_LENGTH` (it was 75 sim minutes, so day 1 came back as day 8). The catch-up shows no story cards or banners; the "welcome back" card sums it up.
- **Eyes start mostly adjusted**: going into a body starts the light adaptation at 70%, then eases the rest in. It read almost black for 3-5 s at dusk.
- **No more freeze on possess**: a window open when you went into a body stayed open but hidden, and paused the island. It now closes, waits, and comes straight back when you leave (not after the usual 25 s event gap).
- **Every first possession gets its stakes**: any smol, on any island including old saves, starts hungry (food 28%) with the hunger clock running, and gets the grump at about 20 s. Before, only a blob on a fresh island did. Until you've eaten, hunger stings but can't take the last quarter of your hearts (a smol left idle starved to death in about 2 minutes).
- **The minimap always moves the camera**: a tap on it cancels a camera flight that would carry on over the top of it.
- **Playtest hook (`?cctest=1` only)**: a "🧪 test possession" button bottom left drops you into a fresh first possession of the smol nearest the camera (hungry, a grump at 20 s, the quest from the start). While possessed, a left click on empty ground walks you about 7 steps that way, for testers who can't hold keys.
- **Not reproduced**: the snow spawn with the pod off screen. Fresh "play now" islands put the pod on screen in our checks; the minimap fix covers getting back to it.
- **Tests**: `possess.test.js` §3 seeded (it starts hungry now); `threat.test.js` §4 (a tool-user's first possession on an old island is hungry and gets a grump), §5 (a week away is one day of catch-up).

## 0.36 What v4.8.11 fixed: the bot's v4.8.10 playtest (K-0039)

Fun 5.5/10. "The grump has to be FELT, not a banner": the single biggest lever.

- **The grump comes and bites**: it chased at 1.35× a blob's crawl (about 0.7 m/s) and never arrived. Now it sprints at 1.7 m/s or more from 13 m (after its 3 s growl), growling as it comes. A bite takes 15% of your hearts, knocks you back about 1.2 m, jolts the camera, flashes the screen red and shows "👹 OUCH!". Then it pauses a beat, which is your chance to run. Standing still, the first bite lands about 11 s after it appears.
- **Escape is earned**: if you were already safe when it came (at the nest, or with 2 friends nearby, as a new island's hatchlings are), it gets one bite in before "safe" counts. Reaching safety shows a big "🏠 SAFE!" beat and the grump turns tail.
- **Hunger tuned**: start at about a third full (hunger 0.68). Until you eat, the clock drains 0.0025/s (about 15% a minute); in a body hunger never rises faster than 0.004/s, whatever the chemistry says. One meal (a nibble or food) takes at least 27% off.
- **The games page passes `?cctest=1` to the game frame**, so the test button shows from `/games/smol-brains/?cctest=1`.
- **Your first view**: you open your eyes facing open ground toward food (or the nest), not a trunk, and the body turns with it. In a body the light starts 95% adjusted, with a lift by day too.
- **Click to walk (test mode)**: a click on the crosshair uses; anywhere else walks there (lower on the screen is nearer), and the view levels out instead of tipping up. Test mode doesn't lock the mouse, so one Esc leaves.
- **One Esc leaves**: outside test mode the browser spends the first Esc on the mouse lock, so a lock lost that way, with the window still focused, now leaves the body too.
- **The card comes back**: the test button no longer closes the open window, and an open side panel (menu, settings…) is held and reopens when you leave.
- **Version label**: 13 px and brighter.
- **Tests**: `threat.test.js` §6 (a bite in under 16 s; 15% of hearts; knockback), §7 (starts a third full; a minute later some left; one meal ≥ 25%), §2b (one bite before safe at the nest).

## 0.37 What v4.9.0 added: "The Last Lantern", phase 1 (K-0041)

Ashton wants smol brains built out into a full, story-driven game: lore for why you're the god in the sky, real cutscenes, and a tutorial that teaches through play. It ships in phases (K-0041 P1-P5), building on the current game, not rewriting it.

**The lore.** The smols are tiny, forgetful creatures living on the back of a sleeping giant, the Hollow. Long ago they lit a Lantern to remember who they are. Each night it burns lower, and as it fades their memories fade too: that's why their brains are smol. **You are the Lantern's last spark**, lifted into the sky by Pip's wish. You can watch and nudge, but you can only touch the world by **lending your light** to one smol (possession). **Grumps** are smols whose light went out; they hunt the light. The long goal (P4-P5): memory embers relight the Lantern in stages, and the finale reveals that the Hollow is waking.

- **The opening** (K-0045: keep the ark battle and the crash pods, and build the lore around them). The ark film (`intro.js`, 22 s) plays first: the smol ark is caught by a grump warship and its pods scatter, one falling toward an unknown world. Then "The Last Lantern" (`lantern.js`, 52 s, pixel art drawn in code at 320×180, smol-speak with subtitles):
  1. Dusk on the Hollow's back: smols walking in circles, putting berries down and forgetting them, and the Lantern on its hill.
  2. The pod streaks across the sky and slams into the hill. The Lantern gutters nearly out, and every smol's glow dims with it.
  3. Pip runs up with the last berry; a grump follows to the edge of the light; Pip trips and the berry rolls into the flame.
  4. Close up, Pip wishes: "somebody… remember us."
  5. The flame bursts, and its last spark climbs into the stars: "you are that spark."

  Then the camera drops onto the island (5.5 s), and you have control at about 80 s (measured: 77 s). The crashed pod you open first is that same pod.
- **When it plays**: always on a device's first new island, even from "play now". After that, "create world" tells the story again and "play now" goes straight in. It can't be skipped the first time (it's the why of the game). After that, or with `?cctest=1`, skipping the ark skips the whole opening.
- **Mood music** (K-0045): two new layers in the soundtrack's own notation and instruments.
  - "something out there" (A minor, driving pluck bass, strings) crossfades in over 1.5 s when a grump is near the smol you're in, when the first-minute grump is after you, when your hearts are under 30%, during a raid, for 25 s at nightfall and for 30 s when a grump turns up.
  - "the sky is strange" (D dorian, bells and music box over a harp) plays for 25 s after a pod crash, an evolution era, a new biome, the big thought, and (coming) the Lantern stages.
  - Each loops while its moment lasts, then the island's song fades back.
- **Lore text**: ❓ help opens with the story and has "🏮 watch the last lantern". The tutorial's "why you're here" is rewritten for the spark, and the island title card says "the Hollow. one last Lantern."
- **Next**: P2 makes the first minutes Pip's scripted first night.
- **Tests**: `lantern.test.js` (fresh save plays it and can't skip; a repeat can; a playtest can always skip; ark + Lantern + camera drop ≤ 90 s; the story beats, the pod included). `mood.test.js` (both layers are real cues; which moments want which layer).

## 0.38 What v4.9.1 fixed: the bot's v4.8.11 playtest (K-0042)

Fun 6/10 (up from 5.5): "the grump is a real visible threat, eating feels good."

1. **A chase you run home from.** By the nest, the first-minute grump now waits until you're 12 m out (or 40 s more) before it comes. When you're out, it appears on the far side from home, so running from it means running home. The test button starts you 25-40 m from the nest.
2. **The way home is a big green arrow.** While the grump is after you, the guide marker is a 28 px green diamond labelled "🏠 home 34m" (an arrow at the screen edge when home is behind you).
3. **No dark start.** It was the "you are …" card: a full-screen 60% dimmer for 4 s. Now it's a small panel up top that doesn't dim the view, gone after 4 s. You never open your eyes inside a bush (you're stepped 1.5 m clear), and friends tag along beside or behind you, not in your face.
4. **The test button in the games page**: it was there, but the founders dialog sat over it. Now it's lime and bolder, and test mode skips the dialog (item 7).
5. **Readability.** The vitals numbers are in a plain bold face, 18-26 px, white (the pixel font's 2, 3 and 8 looked alike: "28" read as "87"); low shows as a red badge. The version label is 16 px on a dark chip.
6. **Sleep is E, not right click**: sleeping in the nest or a hut moved off the click you eat with.
7. **Test mode skips naming the founders** (they keep their random names; a toast says who).
- **Tests**: `threat.test.js` §2b (by the nest it waits for you to go out, but still comes), §5b (it comes from further out than you, so home is away from it).

## 0.39 What v4.9.2 added: The Last Lantern, phase 2: the first night (K-0041)

The tutorial is the story: on a new guided island the first minutes are Pip's first night (`firstnight.js`), with no windows. Only what's on the island (a pulse, a growl, Pip's fear) and one two-word hint at a time. State lives in `game.tutorial.night`, saved with the tutorial.

1. **The pod.** The founders' pod (the one that knocked the Lantern down) is there to open, and so is Pip, who made the wish (a Hollow blob). The founders keep their names (no naming window; rename them from their cards).
2. **Hungry.** Pip is hungry and won't eat alone yet. The nearest berry bush sparkles, and the hint says "🫳 nudge Pip" (grab Pip and carry it over). When Pip eats, the founders copy it: they head to the same bush ("pip-a!"). After 90 s Pip finds it alone.
3. **Sunset.** The sun goes down over 40 s, with a "🌙 night falls in 0:37" timer. 14 s before dark a grump appears 17-21 m out on the far side from the nest and growls. Pip freezes in fear.
4. **Lend your light.** The only glowing thing on screen is a big pulsing "🕯 lend your light" button. The grump waits, growling, until you press it.
5. **The chase.** You're Pip, facing the grump (a "you are Pip" beat, not a card over it).
   - The grump comes at 90% of your running speed (it follows Pip's own sprint, so running is how you get away).
   - Within 2.4 m it winds up for 1.5 s ("👹 it's about to pounce! MOVE!"), then pounces 2.6 m: 25% of your hearts if it lands (you can dodge it), never the last quarter.
   - Three sticks lie on the way home ("🪵 grab sticks", walk over them: your light lends Pip hands it doesn't have yet). With two, the marker says "🔥 light the nest". Reaching the nest lights a campfire, and a grump within 9 m of it turns tail: "🔥 the light scared it off! +2 ✨".
6. **Dawn** (cutscene 2, 20 s, drawn in code): Pip glowing again by the hill. An ember rises off Pip and flies into the Lantern, which grows: "1 memory ember". The rest of the night passes, and it's morning on day 2. Then the god lessons carry on (reward, words, tricks).

- **Nothing else that night**: no incidents, strangers or second pods. Story cards, banners and tips wait. Achievement toasts arrive after dawn.
- **The pounce is every scout grump's now**: a 1.5 s wind-up you can see and dodge, then 25% (K-0041's numbers; the rest of P3 tunes the others).
- **Measured in the browser**: the whole night ran with 0 windows and no errors; dawn on day 2, then "4/7 reward it".
- **Tests**: `firstnight.test.js` (the steps in order; dark in 40 s; the grump waits while you watch; 90% of your speed; a wind-up then a pounce; two sticks light the nest; the light drives it off; morning on day 2; Pip survives; the first ember).

## 0.40 What v4.9.3 changed: The Last Lantern, phase 3: the numbers (K-0041)

- **Hunger.** In a body the food bar runs down at one steady rate: full to empty in 180 s (0.56%/s), whatever the chemistry says. The first possession starts at 32%. In the sim a full bar lasts about 4-5 minutes (the base rate went from 0.0015 to 0.0034 per second, up to about 0.005 when a smol runs out of sugar). A berry or a bush nibble is 25% (berries were 28%), and cooked food is 60% (was 70%).
- **The grump.**
  - Every scout grump winds up for 1.5 s and pounces for 25% (from 4.9.2), and its approach follows the path finder.
  - A growl plays when any grump comes within 10 m of the smol you're in ("👹 a grump, close by!").
  - Grumps are big pulsing red dots on the map.
  - Torches and lit fires (the nest fire from the first night included) scare grumps from 6.5 m (was 4.5).
- **Possession start.** Full daylight from the first frame (no eye adjustment), facing the objective (food or the nest; the grump on the first night), with a 2 s fade in from black.
- **Popups.** Nothing for the first 5 minutes (story cards are toasts until 300 s, was 240), on top of the first night's no-windows rule. Event windows still come one at a time.
- **Knocked out, not dead.** A possessed smol at 0 hearts (hurt, starved, sick or cold; not old age or deep water) is knocked out: it keeps its life and its ideas, drops what it carried where it fell, and lies there out cold. Your light goes back to the sky and needs 30 s before it can lend itself again ("your light is gathering itself: 26 s"). Nothing is wiped.
- **Checkable in a playtest**: with `?cctest=1` a possessed smol shows the numbers: food and its rate, your sprint and the grump's speed (and its wind-up), the pounce, the fire distance and the KO cooldown.
- **Tests**: `threat.test.js` §7 (a full bar in about 3 minutes; a meal is a quarter). `possess.test.js` §6 and `survival.test.js` §8 (knocked out, alive, items dropped, ideas kept, 30 s before you can go in again).

## 0.41 What v4.9.4 added: The Last Lantern, phase 4: memory embers and stage 1 (K-0041)

Every memory the smols win back is a **memory ember** (`embers.js`, state in `game.lantern`, saved with the island). The same memory only counts once. Embers relight the Lantern a stage at a time: 5 for stage 1, then 15, 30 and 50 (the finale, P5).

- **What counts.**
  - Surviving the first night (Pip remembers fire), and each dawn with smols alive.
  - The first tickle.
  - The first 3 words and the first 3 tricks.
  - Each idea discovered, and the first building of each kind.
  - The first 5 babies and the first 3 couples.
  - The blob day and the first tool made while possessed.
- **About 15 minutes to stage 1.** The guided start alone reaches it: the first night and its dawn (2), the reward lesson (a tickle, 3), the first word (4) and the first trick (5).
- **Feedback.**
  - Each ember is a toast that says why ("🔥 a memory ember: a word remembered: “mo” (3/5)").
  - A 🏮 chip by the sparks shows n/next. Tapping it shows the last few memories.
- **Stage 1.**
  - A 24 s film, drawn in code like the opening: five embers fly up from the smols into the Lantern, it catches, its light rolls down over the Hollow, and the giant breathes in.
  - The danger and strange music cue on "lantern". The film waits until you leave a body, and it can always be skipped.
  - Rewards: +10 ✨, and nights are less dark (12% per stage: warmer, lighter night light; at most 50%).
- **Measured in the browser**: four embers then a fifth; the chip read 4/5; the film ran, then stage 1, +10 ✨ and the toast; no errors.
- **Tests**: `embers.test.js` (one ember per memory; tickle once; three words not four; five is stage 1 and the next is 15; ideas and couples; grumps give none; the night light; saved, and old saves start at 0).

## 0.42 What v4.9.5 added: The Last Lantern, phase 5: the story films and the finale (K-0041)

Every story beat now has its own film, drawn in code at 320×180 like the opening (`lantern.js`, `L.SCENES`). Each plays **once per island**, queued for a quiet moment: not while you're in a body, not during the first night, not over a window. All of them can be skipped. The ones you've seen are listed in Help ("🎞 …") to watch again.

| film | when | length |
|---|---|---|
| lend your light | pressing "🕯 lend your light" on the first night; then you're Pip (the grump keeps waiting) | 10 s |
| dawn: the first ember | surviving the first night (4.9.2) | 20 s |
| the first baby | the first smol hatched on the island (not the founders) | 12 s |
| the first grump | the first smol that dies alone in the dark, far from a fire | 14 s |
| Pip grows up | Pip's own first little one hatches (or Pip turns elder) | 13 s |
| the Lantern: stage 1, 2, 3 | 5, 15 and 30 memory embers | 24 s each |
| the Hollow wakes | 50 memory embers: the finale | 42 s |

- **The first grump (a new rule).** A smol that dies at night, away from any fire (8 m), while the Lantern is below stage 3, gets up as a grump where it fell ("grump (was Mo)"). It happens the first time only, and never to the smol you're in (you're knocked out instead) or of old age or drowning. Grumps were always "smols whose light went out"; now you see it happen once.
- **Stages 2 and 3.** The same film as stage 1, with more embers. At stage 3 the giant's eye flickers. Each stage: +10 ✨ × stage, and 12% less night darkness.
- **The finale (50 embers).** The Lantern blazes, its light runs over the Hollow, the giant opens its eye and lifts its head, and in the light the grumps turn back into smols. In the game:
  - Every grump on the island goes home, and there are no more grump nights.
  - Nights are 48% less dark, +40 ✨, and a "🌅 the Hollow wakes" toast. The island carries on.
- **Measured in the browser**: the full first night with the lend film (button hidden while it plays, then you're Pip and the chase starts). Each film played with its captions and no errors (screenshots `v495-*`).
- **Tests**: `embers.test.js` §4-5 (each film queued once; the first baby; Pip's little one is Pip growing up; a lonely death at night gets up a grump, only once; fifty embers is the finale; grumps go home; the night light; no more grumps after; saved).

## 0.43 What v4.9.6 changed: the K-0048 playtest fixes

1. **A bite reads.** When a scout grump's pounce lands:
   - you're thrown back 2.2 m (was 1.2), and the grump staggers 1.6 m back off your face
   - it stands there for 2.1 s before it can wind up again (was 0.9 s)
   - a full-screen red "OUCH! −25% ❤" flash and a bigger camera shake
   Pounces can't come back to back any more: about one every 5-6 s if you stand still, and you can run.
2. **Lantern stage 3 is its own beat.** Its film (28 s) has the giant's eye opening a crack, big and bright, with the ground shaking. A new line follows ("the nest glows with the Lantern's light now. grumps won't come near it.") and a shot of a grump turning away from the glowing nest. In the game, from stage 3 the nest scares grumps off from 12 m, like a fire.
3. **Lend your light, centred.** The spark circles, then dives into Pip in the middle of the shot (3-5 s). A flash, then Pip glows and "you are Pip" holds for 4 s (11 s film).
4. **Films and windows.** A film that starts while a window is open puts the window aside and brings it back afterwards. A window that wants to open during a film waits for it. Event windows never count as ready while a film plays.
5. **Embers.**
   - Each one toasts "🔥 memory ember +1: <why> (n of 5)". The toast waits out a film, jumps the toast queue and is never dropped when the queue is full.
   - The chip reads "🏮 n / 5 embers" in a plain font (the pixel font made 5 look like 8) and pulses on each ember.
6. **The opening.** A close shot of the crash (story 17.5-21.4 s) shows the pod nose-first in the Lantern's hill, earth thrown up and the Lantern knocked crooked and guttering. The slow stretches play faster: the pan ×1.45, Pip's run ×1.5, the climb ×1.35. The film runs 41.7 s (was 52), and each caption holds until the next.
7. **Marker labels stay on screen.** A label that would run off an edge is slid back in ("🪵 grab sticks 30m" at the screen edge).
8. The canvases that read pixels back (icons, survival art) set `willReadFrequently`.

- **Music, self-checked in the browser** (the bot had no audio): a grump arriving brings the danger layer in. Sampled at 0.3 / 0.8 / 1.3 / 2.0 s, the layer went 0.18 → 0.52 → 0.86 → 1.0 while the song went 0.82 → 0.48 → 0.14 → 0: a 1.5 s crossfade. `SB.Music.levels()` is a probe for that.
- **Tests**: `firstnight.test.js` (after a bite you're ≥3 m apart, and there's no wind-up for 1.8 s). `embers.test.js` §4b (a grump 8 m from the stage-3 nest turns for home).

## 0.44 What v4.9.7 changed: the K-0051 playtest fixes

1. **The opening.**
   - A playtest (`?cctest=1`) always gets the opening films on a new island. Skipping the ark film goes on to the Lantern film (the crash close shot); skip again to land.
   - The title menu has "🎬 watch the intro" (third button).
   - Restart from the site's button while you're in a body now leaves the body first, so the "new world?" window shows. It used to wait, unseen, for you to leave.
2. **First-night hunger.** In a body on the first night, food drains at 60% of the normal rate (0.33%/s), and Pip starts the chase at 92% full ("Pip ate at the bush").
3. **The title is clickable at once.**
   - The menu is built under "computer cooked games presents". That card plays once per device, at 1.4 + 1.2 s (was 3.6 + 3.4), and never in a playtest.
   - The title city is built after the card, so it doesn't stall it.
   - The site's page loads the game frame once in a playtest (it used to load it twice).
   - Measured: the game page is clickable as soon as it loads (1.3 s locally).
4. **A bite you can see.**
   - You're thrown 3.6 m (was 2.2), and your view is shoved aside 0.45 rad and up 0.22, so the grump is off-centre.
   - The grump spins for 1.2 s, reeling, with a "huh" bubble, then glares. It waits 3 s in all before it can wind up again.
5. **Turning without the mouse.** The hint is bigger, lime-bordered and pulses 3 times: "click: look with the mouse · ← →: turn". It goes away once you've turned. Q and E were already drop and use, so the arrows are the keys.
6. **Playtests can reach `SB` from the site's page** (`window.top.SB` when same-origin and `?cctest=1`). The `sw.js` "Failed to fetch" is the site's service worker re-throwing a failed request: not smol brains' file, flagged to the site.

- **Tests**: `firstnight.test.js` (Pip starts the chase ≤8% hungry; the first night drains at 60%), plus the 4.9.6 bite checks with the new numbers.

## 0.45 What v4.10 changed: the voxel look (K-0052)

Ashton loved the Higgsfield ad's chunky voxel style ("the ad looks better than the game"), so the game now looks like it. The voxel look (`vox.js`) is the new default; settings → look still cycles voxel → pixel art → hd pixel → classic 3D (`smolbrains-look`, `?look=voxel|pixel|hd|3d`). A saved choice of the old looks is kept.

- **Pipeline.** It is the pixel look's pipeline (voxel smols, the outline pass, sprites only for specks far out) rendered at full resolution with dynamic resolution, a softer ink (0.55), and hd.js's last pass for a tilt-shift depth of field in god view (focus on the crosshair in first person), bloom and a warmer grade (`HD.initPost`: no hd art is fetched).
- **Block terrain.** Half-unit cubes (1 and 2 units for the far zooms). Each column's top is the heightfield at its middle, rounded to the cube, plus the giant's bones. Tops are greedy-meshed and walls merged along each edge, so a chunk is a few thousand quads (fewer triangles than the smooth terrain). Colour comes from a texture of the island's vertex colours, filled chunk by chunk. The shader adds grass tops over earth and stone, a ragged grass fringe, mossy patches, a bevel per cube and per-cube jitter.
- **The sim never changes.** It still walks the smooth heightfield. Drawing uses `R.gh` (the block top) and `R.vdy` (block top minus the sim's ground, 0 in water), eased per smol and for the first-person eye, so smols, trees, huts and items stand on the blocks.
- **The giant's back.** A spine with a vertebra every 6 units runs down the island's long axis, with ribs every 18. They are visual only, mossy stone, and kept off the nest's hill. Past the coast, the Hollow's head lies face up in the sea, asleep. It has shut eyes, mossy hair and brows, a nose and ears, and a hand rests beside it. It is made of 2-unit cubes, breathes slowly and is never hidden by the fog of war.
- **Everything is blocks.** Every meshes.js shape (trees, rocks, huts, items, grass and flowers) is voxelized the first time it's drawn: triangles are sampled into a grid, the outside is found by flood fill, and the faces are greedy-meshed per slice.
- **Smols** are voxels everywhere in view (up to 160, a 200-model cache). Upright smols get 1.3× block heads. Open eyes are solid glowing blocks: warm white, red on grumps.
- **The Lantern** is a voxel lamp by the nest: a stone plinth, an iron cage and a glowing amber heart. It is a real light (radius 10 + 3 per stage, flickering), and the bloom catches it.
- **Crash pods** sit a third buried with 11 pieces of wreckage round them: hull plates, struts, a box with a light still on and scorched clods. This covers the escape pod and every pod site.
- **Golden hour.** A warmer key light, a lower sun for long raking light on block edges, cooler lilac fill and a warm haze.
- **Fixes folded in (K-0052).** Possessed hunger now lasts 5 minutes for a full bar (was 3), and the first night stays 40% slower on top of that. The opening film and the fast title (4.9.7) were checked again on a fresh device.

## 0.46 What v4.10.1 added: soft sun shadows (K-0052, milestone 2)

- **A shadow map from the sun.** In the voxel look, terrain, trees, rocks, huts, the Lantern, the giant and anything loose cast into a 2048² depth map. It is fitted to the view (up to 64 units out in god view, a 30-unit box ahead of you in first person) and snapped to its texels so edges don't crawl.
- **Who receives it.** Everything lit by the shared light code takes 5 soft taps from the map: the ground, objects, water and the voxel smols. Smols cast only their blob shadows.
- **When it fades.** Shadows fade at the edge of the box, at night (the moon's are faint), under cloud and rain, and when zoomed out past 34.
- **Cheap when nothing moves.** The map is kept while the view box doesn't change and redrawn every 4th frame for falling trees and carried things.
- **Holding 60 fps.** In this look, dynamic resolution steps down 10% once frames run over 19 ms for 2 s, and back up under 15 ms. The voxel look draws half the grass and flowers, which read bigger as cubes. Settings → "soft focus, glow & shadows" turns all three off, as does a weak phone or 4 s under 25 fps.

## 0.47 What v4.10.2 fixed: the hand grabs and throws again (K-0056)

- **Near misses pick up.** With ✋ grab, a press that misses every smol and item now takes the nearest smol within 48 px (touch) or 30 px (mouse) before it falls back to panning. A smol walking out from under the finger used to turn the drag into a camera pan.
- **Picked where it's drawn.** Picking uses the eased voxel lift (`c._vdy`), so the zone sits on the drawn body, not the sim's smooth ground.
- **Throws on slow frames.** The flick reads the input events' own times (`e.timeStamp`) and the speed over the last ~60 ms. It used to compare handler times, so on a slow frame (the voxel look on a weaker device) the moves and the release arrived bunched and every throw counted as "held still": the smol just dropped.

## 1. The ladder

A smol's tier comes from its genes (`SB.Genome.tierOf`), and each tier needs the body *and* the brain:

| tier | needs | unlocks |
|---|---|---|
| 🫧 blob | where it starts | eat, play, sleep, talk, learn words |
| 🐾 critter | legs ≥ 0.35 | legs, further sight, tier instincts |
| 🪵 tool-user | hands ≥ 0.5, 16+ neurons | `use` and `make`: tools, crafts, discoveries, a pouch |
| 🔥 tribe | language centre ≥ 0.5, 28+ neurons | `teach`, `give`, `pray`, sentences with invented words, tribe names |
| 🛖 builder | planning ≥ 0.45, 2 brain layers, 36+ neurons | `build`: huts, farms, story poles, walls, bridges, villages |
| 🧠 thinker | head ≥ 0.5, working memory ≥ 0.5, 58+ neurons | kilns, copper, axes, lenses, observatories, writing |
| ✨ ascended | inner glow ≥ 0.6, 3 brain layers, 88+ neurons | floats, glows, halo, resonance, the big thought |

Every tier changes the body you see (legs, arms, an upright posture, tribe headbands with a feather, builder tool belts, an exposed pink brain, wings and halos) plus gene-driven variety (ears, tails, patterns, fins, fluff, horns).

**Faces grow up.** Blobs, critters and tool-users keep the cute look: big sparkly eyes and a constant smile. From tribe on, teens and adults lose the baby proportions (longer torso and legs, broader shoulders, a head capped at radius 5 except thinkers', small one-pixel pupils without the sparkle, brows; in 3D taller and slimmer, smaller eyes with small pupils, brows) and the face follows the mood (`SB.Chem.face`): neutral at rest, a smile only when content, happy, in love or excited, a frown when sad or hurt, worried brows and a little "o" when scared, angled brows and a tight line when angry, heavy lids when tired, a green tinge when sick, closed eyes asleep. `creature.js` holds a face steady (a new feeling has to last 1.2 s, a face stays at least 2.5 s; sleep is instant) and thresholds lean toward the current face, so nothing flickers. Pixel sheets are cached per face in the atlas; the first-person HUD portrait is the smol's own painted head with the same face. New tiers come with *tier instincts*: an evolved brain is born with weak hunches about its new abilities (a tool-user is born a little curious about sticks), rehearsed before hatching like v1 instincts.

**Species.** A baby that climbs a tier, or drifts far from its clade's average genes, founds a new species that branches off its parent's ("long-legged critters", *Smollus kralai*). Species too far apart can't have eggs together. The smolpedia draws the tree of life.

**Pacing** (from headless sims, no player): critters around 55 min, hands around 1.5–2 h. A player who teaches, blesses eggs and spends sparks gets there much faster; offline progress keeps the island going while you're away.

## 2. Systems

### World (`worldgen.js`, `world.js`)
- 256×256 island from a seed: continent mask with warped coast and lobes, fBm terrain, ridged mountains, **priority-flood + flow accumulation hydrology** (lakes fill real depressions, rivers follow the flow and carve channels), temperature (latitude + height) and moisture (noise + distance to water) → 13 biomes (meadow, forest, jungle, savanna, desert, swamp, pine woods, snowfield, mountains, beach, ocean, glowshroom grove, crystal steppe).
- ~900 resource nodes placed by biome (fruit trees, pines, palms, jungle giants, glowshrooms, cacti, bushes, reeds, healroot, shroom rings, boulders, flint, clay, copper ore, thought crystals), grump caves at mountain feet, and a guaranteed-good nest for the first egg. ~20k decorations (grass, flowers, ferns, cattails, glow dots).
- World codes (`mossy-otter-4821`) map to seeds; any text is a world too. `?world=code` on the play URL opens that island, so friends get the same one.
- Living world: day/night (6 min days), four seasons (4 days each; autumn leaves, winter snow on ground, trees and roofs, slower plants), weather (clear, cloudy, rain, storm, fog) with lightning that can set trees on fire, spreading wildfires that burn out and regrow, fruit and sticks dropping only where someone is (keeps the island tidy), critters (flutterbies, beetles, hoppers), grump nights, campfires that need feeding, farms that grow grain, paths.
- Coarse A* pathfinding (2×2-tile cells) when walking straight is blocked by rivers or cliffs; bridges open new cells. A smol that makes no progress for 8 s, or ends up somewhere unwalkable, scrambles back to the nearest proper ground.
- **Food economy.** Fruit (apples, berries, sunfruit), sunroot patches, gourd vines, beehives (honey; the bees sting unless you carry a torch), cactus fruit and clam beds; v2.1 food plants are placed last from their own random stream so older saves keep every node id. Farms ripen every ~2 min into a harvest of 3 (4 near a windmill) of grain, sunroots or gourds; grain keeps for ages. Seasons: spring flush, autumn bounty, a lean (60%) winter. Housekeeping clears junk first and fresh food last, abandoned tools weather away, and nobody crafts a tool while a spare lies nearby (endless poke sticks used to fill the item cap and get fresh food deleted). Eggs pause when the colony is hungry or short of food per head.
- **Water.** Deep water is dangerous: smols without fins sink, splash, paddle slowly to the nearest proper shore and drown after ~25 s if it's too far; a toast says to drag them out.

### Brains (`brain.js`)
- Inputs (61 + memory): 12 drives, 22 attended nouns, 18 heard verbs, heard its name, near, holding, dark, knows-a-use (an idea applies to this thing), friends near, raining, home, bias, plus **working-memory units** that echo the previous thought (Elman-style, from the recall gene).
- 1 to 3 tanh hidden layers sized by the genome (6 → ~90 neurons) → 18 verb outputs (the predicted reward of doing that verb to the attended thing). Same learning rule as v1, generalised to depth: normalised LMS backpropagated through every layer, eligibility traces, reward = gene-weighted drive reduction, tickle/tap/"good"/"bad" lessons with the noun→verb and command→verb tables, imitation, dreaming instincts before hatching.
- Urgent drives narrow the choice (softmax temperature drops when hungry or scared), innate drive-directed attention (a hungry smol's eyes go to food), and small emergency reflexes; everything else is the net.
- **v1 brains migrate by name:** the 45-input/12-output v1 weights are mapped onto the v2 layout (`SB.Brain.deserialize` with `v: 1`), so a trained v1 smol makes the same choices on the island.

### Genes (`genome.js`)
v1's 38 genes plus 15 evolution genes (legs, hands, cortex, brain layers, working memory, planning, language centre, dexterity, senses, head size, fins, fluff, horns, wings, inner glow). Crossover, mutation with readable notes, rare "big leaps", echoes, blessings, and a compact codec (v1 codes still decode, nouns remapped).

### Ideas (`ideas.js`, `lang.js`)
30 ideas from poke sticks to the big thought: crafts (poke stick, hammerstone, basket, flint blade, torch, cooking, spear, pot, copper, axe, brew, bread, lens), builds (campfire, farm, hut, story pole, palisade, bridge, kiln, workshop, windmill, observatory, the spire) and skills (fire, herb lore, sharing, song, writing, resonance). Each has a discovery trigger (holding a stick near a fruit tree, standing by a lightning fire…), prerequisites, and a tier; a smol evolved enough for an idea (who knows what it builds on) also **ponders** its way there slowly, so fire never depends on a lightning strike. `make` and `build` become **plans**: a sequence of fetch → gather → go to the fire → craft, or fetch → deliver → work, with depth limited by the planning gene. Builders cooperate on sites. Watching teaches a little, `teach` a lot, **kids and teens pick up the colony's ideas from the grown-ups around them** (so know-how outlives its inventors), story poles keep everything. Cold kilns get stoked by whoever needs them. Any ascended smol can help raise the spire; finishing it is the finale (a story card with the colony's whole story and the civ card).

### Society and species (`society.js`, `species.js`)
Tribes get named once they can talk about themselves; homes drift to their campfires; 3 huts around a lit campfire found a named village. The culture census finds lost ideas. Clades, compatibility and the tree of life live in `species.js`.

### The god hand (`input.js`, `ui.js`)
Panning and throwing slide the drag along the camera's own vectors onto the ground, so the ground stays under your finger at any rotation. The **minimap** (bottom left; above the tools on phones) shows the island, smols, buildings and grumps; tap to jump, drag the white view outline, `m` hides it. **Story cards** pause the game the first time something big happens (each evolution stage with what changed, why and what the next one needs; first egg, invention, harvest, prayer, starvation, drowning; the finale) and stay until "got it". Tools: ✋ grab (select, carry, throw), 🪶 tickle (reward, rub to tickle more), 👆 tap (scold; three taps shoo a grump), 💬 talk (tap a thing to say its name, or type words), ✨ magic (miracles cost sparks; sparks come from learning, discoveries, hatching, achievements and answered prayers). Prayers show over heads (🙏🍎) and are answered by the matching miracle, food or a tickle.

### Rendering (`gl.js`, `meshes.js`, `render.js`, `pixel.js`, `bodies.js`, `fx.js`)
**Pixel art (default).** The 3D scene renders at ~240 px tall (whole CSS pixels per art pixel), no antialiasing, into an offscreen buffer; a post pass adds a 1px dark outline wherever something stands clearly in front of what's behind it, and the browser scales the canvas up with `image-rendering: pixelated`. Creatures are pixel sprites painted from their genes by `pixel.js` (body shape and colour, pattern, eyes, cheeks, ears, antenna, horns, legs, arms, tail, fins, wings, fluff, tribe headband, builder belt, thinker brain and glasses, ascended halo; grumps get brows, red eyes and spikes), 12 frames each, packed into one atlas, drawn as camera-facing quads snapped to the pixel grid at one camera-wide whole-number scale and lit by the same sun, sky and firelight. Settings → "classic 3D" (or `?look=3d`) switches back to the smooth renderer below.

Custom WebGL (WebGL2, or WebGL1 + instancing extension; GLSL ES 1.00) with no libraries. Tilted **orthographic** camera with pan/zoom/rotate and pitch that eases from cinematic up close to map-like far out. Flat-shaded terrain chunks (32×32) with baked canopy AO and seasonal snow, a water mesh with depth colour, shoreline foam, ripples and sun glints, instanced nodes/decor per chunk, instanced dynamic bodies (every creature is ~25 instanced parts), blob shadows, 8 nearest point lights (fires, torches, glowshrooms, crystals, ascended smols), cloud shadows, distance haze, particles (embers, smoke, hearts, sparkles, rain streaks, snow, fireflies, lightning bolts) and a 2D overlay for names, speech, emotes, prayers and site needs. Frustum culling per chunk, decor skipped when zoomed out, far creatures think at half rate, and **dynamic resolution** (drops pixel ratio when frames run slow).

### Saves (`save.js`)
- v2 autosave (localStorage `smolbrains-save-v2`) every 20 s and on hide. Only deltas from worldgen are stored (changed nodes, items, buildings); the island regenerates from its seed. ~40–100 KB.
- **v1 migration:** with no v2 save, a v1 save (`smolbrains-save-v1`) is migrated: smols wake up by the nest with their names, words, stats, family and trained brains (weights mapped), unhatched eggs come along, achievements carry over. The v1 save is never modified.
- Offline progress: on return, up to 75 sim minutes run in half-second steps (1:1 for the first 10 minutes away, then slower) in a gentle mode where nobody starves, capped at ~8 s of real time; brains learn from a quarter of what happens meanwhile. A "while you were away" card lists births, words, ideas, buildings and new species.
- Account cloud saves through the site SDK (`cc.save`/`cc.load`, slot `main`): a newer account save is offered on boot; an account still holding a v1 save gets it migrated. A shared `?world=` link asks before replacing an existing island.
- Smol codes: `SMOL2:` (genes, trained brain, words, ideas); `SMOL1:` codes still import.

## 3. Module map
Load order: `core, icons, genome, collect, brain, chemistry, lang, ideas, words, worldgen, world, creature, mind, species, society, strangers, social, funeral, orders, firsthour, tricks, quests, economy, civ, director, sites, threats, survival, gl, meshes, render, vox, voxel, pixel, hd, fx, bodies, input, audio, music, save, intro, title, possess, survival-art, povhud, ui, cards, main`. All plain scripts on `window.SB`, no build step.

`SB.Surv` (survival.js): the inventory (`inv`, `add`, `take`, `move`, `select`, `held`), piles (`spawn`, `split`, `pickup`), recipes (`recipes`, `match`, `combine`, `craft`), hit points (`hitNode`, `fell`, `gather`, `setBlock`), planting, building (`canPlace`, `place`, `deliver`, `needs`), fires, `onDeath`, and the vines. `SB.Possess` (possess.js): entering and leaving, `drive`, `look`, `options` (what use / place / pick / E would do on a target), `act`, `drop`, `select`, building ghosts, and the first-time quest. `SB.PovHud` (povhud.js): the screen and the input listeners. `SB.SurvArt` (survival-art.js): meshes for vines, the lean-to and the new items, the topple and shake animations, piles, and the 16×16 item icons.

`SB.Tricks` (tricks.js): `LIST` (data), `chance`/`meter` (read from the net), `check`/`seed` (learned and forgotten, emits `trickLearned`/`trickForgot`), `practice` (set it up), `colony`/`best`. `SB.Quests` (quests.js): `CHAPTERS` (data), `board`, `tick` (emits `questDone`/`chapterDone`), `count`.

`SB.Game` (main.js): create/newGame/newGamePlus/revive, step, spawn, layEgg (with echoes and blessings), hatch, sparks, achievements, score, offline. `SB.Debug` has helpers for tests and screenshots (`spawnTier(t, n)`, `ideas(c)`, `build(kind)`, `skip(sec)`).

## 4. Platform hooks
`window.cc && cc.start()` on boot, `cc.score(civScore)` every 30 s and on records, `cc.end({score})` on page hide, `cc.event` for hatch, first word, egg, discovery, tier and achievements. `play/index.html` loads `/games/cc-sdk.js` like the other games so these relay to the player page. Player page messages: `cc-mute`, `cc-restart` (asks first), `cc-pause`. smol brains still has no leaderboard (`max_score_per_sec` unset): its civ score grows across sessions, which the per-play score cap isn't built for.

## 5. Tests
`node tests/brain.test.js` (learning, tiers, echoes, codecs, v2 round trip, v1 brain migration), `node tests/world.test.js` (determinism, islands, rivers, nest, resources, rot, lightning, fire, eggs, farms, walkability), `node tests/ideas.test.js` (idea web, discovery, crafting plans, cooperative building, teaching, lost knowledge, story poles, invented words), `node tests/teach.test.js` (late taps vs poison, commands, first words, lessons echo), `node tests/save.test.js` (round trip, offline progress, smol codes, v1 save migration), `node tests/pixel.test.js` (every tier/stage/grump and 200 random genomes paint full, outlined, uncut sheets), `node tests/words.test.js` (no spam, spaced lessons, wrong things, unlocks, feelings, calls, shared smarts, renamed words), `node tests/economy.test.js` (miracle heat, fast-forward cost, spoiling, prayer pay, blessing vs echoes), `node tests/strangers.test.js` (pod founders, kin rule, strangers arrive/join/leave/decide), `node tests/tools.test.js` (stone axe, logs, clubs, rods, fur, cloaks), `node tests/social.test.js` (opinions and reasons, shove vs punch, rivals fight and friends don't, conversations and gossip, graves and grief, titles, tantrums, saving), `node tests/director.test.js` (every story card and choice ends cleanly, raids, costs, pacing, saving, palisades), `node tests/sites.test.js` (places are found, logs in order, ruins teach, camps free captives, pods crash on dry land, rescue parties, climbing out, magic lift, saving), `node tests/ending.test.js` (the spire ends it once, resonance, the star dome, new game+), `node tests/music.test.js` (20 well-formed songs, season/day/rain/late/grief rules, always something to play, tapped smols hold still), `node tests/mind.test.js` (memory, places, dreams, curiosity, reading others, goals, inner voice, saving and broken minds), `node tests/possess.test.js` (entering and leaving, the brain watching, walking, the hotbar controls, learning from you, death, saves), `node tests/survival.test.js` (inventory, piles, the first recipe and learning by watching, chopping, mining, splitting, wear, vines, building from a ghost, the first-time guide, dying with a pack, saves and old saves), `node tests/sim.test.js <minutes> <seed>` (whole-game soak). `tests/render-preview.html` renders any seed in a browser (`?seed=42&zoom=12&t=0.4`). `node tests/voxel.test.js` (every tier and stage builds a voxel smol that fits its grid, matches its sprite's height and has a face per frame and mood; moods differ; 200 random genomes; the cache reuses, rebuilds on growing up and stays bounded; near fade)

## 6. Balance notes (from headless sims)
- v4.4: the engaged-bot ladder (seeds 1–3, medium island, generator 2) is identical to v4.3, tick for tick: ascended at 153.0 / 135.5 / 129.8 min. (A first build with vines in the node tick slice drifted to 169 / 191 / 150 by chaos alone, which is why vines are kept out of `tickNodes` and `siteFree`.)
- Rotten food reads as "bad to eat" (it joins the shroom category) and good meals restore the noun→verb table, so a few bad meals no longer teach a colony to starve.
- Hungry smols follow their nose to the nearest food or fruit tree; unreachable things are remembered and skipped; A* gets around rivers. 30-minute soaks across seeds and tiers now end with no starvation.
- Builders only start sites the tribe needs (one farm per four smols, one hut per three…).
- Small colonies get "cousin" eggs (every ~2 min while under 4 smols) bred from the existing gene pool, nudged toward the next tier's missing gene, so the first critter usually turns up around minute 8; love rises faster and partners go looking for each other. Eggs hatch in ~2.4 min on their own, faster in a hut, by a fire, or when tapped.
- Phones render the 3D view at ≤1.6× device pixels in classic mode (overlay labels stay at full ratio), and the shader skips point lights that can't reach the screen. Pixel mode is far cheaper still: ~8.5 ms of JS per frame for a 30-smol colony at 4× CPU throttle; boot to a playable island in ~0.7 s (1.8 s throttled).
- Metabolism: a smol eats every 2–3 min. Unattended 2-hour sims of a 20-builder colony on three seeds: 0 starved, 0 drowned, population steady around 32 through two winters (before the economy fixes they crashed to 4–7 in the first winter).
- Full ladder with an engaged player (5–10 h sims): critter ~8 min, tool-user ~30–40 min, tribe ~1.5 h, builder ~2.5 h, thinker ~3.3 h, ascended ~5 h; colonies hold 21–27 of 30 ideas with 4–6 lost per run; the spire gets raised in end-game runs.
- v3 (kin rule + strangers + the new economy, 5 h engaged-bot sims, seeds 2 and 9): critter ~16 min, tool-user ~50 min, tribe 1.7–2.6 h, builder ~3.4 h, thinker ~3.7 h; population holds at 32–35 with ~18 strangers welcomed by 4 h; builders with axes fell trees for logs. Browser chaos runs with the intro, strangers and the word book (desktop 522 actions, phone 771): no errors.
- Less cuddling (§0.16; engaged-bot ladder, 200 min, medium island seeds 1–3, the sim's randomness seeded per run so before and after are compared on the same dice; 3 runs a seed after, 2 before). 4.4: 77–175 eggs, hearts ~9–12% of smol-time, builders 55–123 min, town 70–159, city 117–149 (median 141; one run never), ascended 115–160 (median 138; same run never). Now: 52–105 eggs, ending at 29–56 smols (lowest after 30 min: 8–21), hearts ~1%; builders 32–98 (median 69), town 64–113 (87), city 109–172 (127; all 9 runs), ascended 99–177 (125). A single run swings ±30 min with chance alone (one seed's three runs: city 109/146/172), so judge medians, not one run. The first cut of this (before the compensation list above) had city 159–179 or never and ascended 178–203.
- Browser chaos runs (~3,500 random taps, drags, keys, menus, miracles, resizes, reloads, drownings, on phone and desktop, pixel and 3D): no errors.

---

## Appendix: the v1 research that started it

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

