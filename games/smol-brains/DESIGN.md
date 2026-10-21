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

## 0.14 Less cuddling: love is slow, earned, and between partners (`social.js`, `creature.js`, `civ.js`)

The owner's call: an egg about every 15 minutes instead of every ~3, hearts only for partners and kids, and a housing limit, so the population grows slower and feels earned. Blobs, critters and tool-users keep the old quick breeding (the band needs its generations); it all applies to pairs of talkers (tribe and on).

- **Love grows slowly**, and only in a settled grown-up: fed, warm, calm, healthy, not grieving or out fighting (`Creature.loveK` scales `Chem.LOVE_RATE`). Spring ×1.5, summer ×1.1, autumn ×0.85, winter ×0.5; a small band falls faster (pop < 6 ×3, < 10 ×2, < 14 ×1.4); from the builder age, before the first hut is up, ×0.6.
- **Partners.** A smitten talker courts one smol: a hug, a gift, a shared meal, a good talk, a game, or just time near each other each count once per 20 s, each is a diary line (🌸) and a little warmth both ways; three of them and liking each other (opinion ≥ 12) makes partners (diary, chronicle, a burst of hearts). They can say no (they don't like you, or aren't in the mood): "turned me down", a little shyness. Seeing your partner hug someone you don't rate is jealousy; three times (twice for their best friend) is a break-up, and couples who've come to dislike each other drift apart. A widow mourns a day before loving again; a widow's kids may resent the new one. From the tribe on **only partners have eggs**.
- **Hearts** (💕 emote, the hearts particles, "cuddles") only between partners and between parents and their own kids (and the sky's hand, and a parent with its own egg). Friends hug: a smile, "hugs", and the hug doesn't settle a smitten heart. Grown-up talkers hug only family, friends and the one they're courting.
- **Eggs.** 12 minutes' rest after each (`Creature.EGG_GAP` 720 s, ×0.3/0.5/0.75 for a band under 6/10/14, +40 s per young kid), and love has to come back after, so about a quarter-hour egg to egg. An egg costs two bites (the granary, the couple's pouches, food lying near) or the mother's reserves; nothing to hand and hungry, they wait. Partners both ready get a strong pull toward each other.
- **Housing** (`Civ.room`): once the builders are here and someone knows huts, every finished hut sleeps 4, a house 6 (a wrecked one half, until it is rebuilt), and 10 more by the fire; a full village has no eggs ("no room for a baby. we need a hut"), and builders put huts and houses first once it is nearly full. Strangers still arrive.
- **Work drive** (`c.duty`): from the builder age a grown-up who isn't working grows restless (~4 min to full) and leans toward building and making over cuddles and games; working settles it, and the workers notice who never helps.
- **Compensation:** talkers live two-fifths longer (`Creature.TALKER_LIFE`; elder age scales too), each child of the tribe on gets more of its parents' practice (echo ×1.5) and leans harder toward the more evolved parent (momentum 0.5), and strangers come oftener while the colony is under 30.
- Also fixed: a builder's fetch step now looks as far as its plan did (it planned with 1.5× its search radius, then failed to find the fibre at the first step, so rebuilds stalled), claims from plans dropped by a conversation, an order or a stranger's choice no longer hide items forever, and builders haul makings from up to 64 m once nothing is near (the flaky threats test).

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
Load order: `core, icons, genome, brain, chemistry, lang, ideas, words, worldgen, world, creature, species, society, strangers, social, director, sites, gl, meshes, render, pixel, fx, bodies, input, audio, music, save, intro, ui, main`. All plain scripts on `window.SB`, no build step.

`SB.Game` (main.js): create/newGame/newGamePlus/revive, step, spawn, layEgg (with echoes and blessings), hatch, sparks, achievements, score, offline. `SB.Debug` has helpers for tests and screenshots (`spawnTier(t, n)`, `ideas(c)`, `build(kind)`, `skip(sec)`).

## 4. Platform hooks
`window.cc && cc.start()` on boot, `cc.score(civScore)` every 30 s and on records, `cc.end({score})` on page hide, `cc.event` for hatch, first word, egg, discovery, tier and achievements. `play/index.html` loads `/games/cc-sdk.js` like the other games so these relay to the player page. Player page messages: `cc-mute`, `cc-restart` (asks first), `cc-pause`. smol brains still has no leaderboard (`max_score_per_sec` unset): its civ score grows across sessions, which the per-play score cap isn't built for.

## 5. Tests
`node tests/brain.test.js` (learning, tiers, echoes, codecs, v2 round trip, v1 brain migration), `node tests/world.test.js` (determinism, islands, rivers, nest, resources, rot, lightning, fire, eggs, farms, walkability), `node tests/ideas.test.js` (idea web, discovery, crafting plans, cooperative building, teaching, lost knowledge, story poles, invented words), `node tests/teach.test.js` (late taps vs poison, commands, first words, lessons echo), `node tests/save.test.js` (round trip, offline progress, smol codes, v1 save migration), `node tests/pixel.test.js` (every tier/stage/grump and 200 random genomes paint full, outlined, uncut sheets), `node tests/words.test.js` (no spam, spaced lessons, wrong things, unlocks, feelings, calls, shared smarts, renamed words), `node tests/economy.test.js` (miracle heat, fast-forward cost, spoiling, prayer pay, blessing vs echoes), `node tests/strangers.test.js` (pod founders, kin rule, strangers arrive/join/leave/decide), `node tests/tools.test.js` (stone axe, logs, clubs, rods, fur, cloaks), `node tests/social.test.js` (opinions and reasons, shove vs punch, rivals fight and friends don't, conversations and gossip, graves and grief, titles, tantrums, saving), `node tests/director.test.js` (every story card and choice ends cleanly, raids, costs, pacing, saving, palisades), `node tests/sites.test.js` (places are found, logs in order, ruins teach, camps free captives, pods crash on dry land, rescue parties, climbing out, magic lift, saving), `node tests/ending.test.js` (the spire ends it once, resonance, the star dome, new game+), `node tests/music.test.js` (20 well-formed songs, season/day/rain/late/grief rules, always something to play, tapped smols hold still), `node tests/mind.test.js` (memory, places, dreams, curiosity, reading others, goals, inner voice, saving and broken minds), `node tests/sim.test.js <minutes> <seed>` (whole-game soak). `tests/render-preview.html` renders any seed in a browser (`?seed=42&zoom=12&t=0.4`).

## 6. Balance notes (from headless sims)
- Rotten food reads as "bad to eat" (it joins the shroom category) and good meals restore the noun→verb table, so a few bad meals no longer teach a colony to starve.
- Hungry smols follow their nose to the nearest food or fruit tree; unreachable things are remembered and skipped; A* gets around rivers. 30-minute soaks across seeds and tiers now end with no starvation.
- Builders only start sites the tribe needs (one farm per four smols, one hut per three…).
- Small colonies get "cousin" eggs (every ~2 min while under 4 smols) bred from the existing gene pool, nudged toward the next tier's missing gene, so the first critter usually turns up around minute 8; love rises faster and partners go looking for each other. Eggs hatch in ~2.4 min on their own, faster in a hut, by a fire, or when tapped.
- Phones render the 3D view at ≤1.6× device pixels in classic mode (overlay labels stay at full ratio), and the shader skips point lights that can't reach the screen. Pixel mode is far cheaper still: ~8.5 ms of JS per frame for a 30-smol colony at 4× CPU throttle; boot to a playable island in ~0.7 s (1.8 s throttled).
- Metabolism: a smol eats every 2–3 min. Unattended 2-hour sims of a 20-builder colony on three seeds: 0 starved, 0 drowned, population steady around 32 through two winters (before the economy fixes they crashed to 4–7 in the first winter).
- Full ladder with an engaged player (5–10 h sims): critter ~8 min, tool-user ~30–40 min, tribe ~1.5 h, builder ~2.5 h, thinker ~3.3 h, ascended ~5 h; colonies hold 21–27 of 30 ideas with 4–6 lost per run; the spire gets raised in end-game runs.
- v3 (kin rule + strangers + the new economy, 5 h engaged-bot sims, seeds 2 and 9): critter ~16 min, tool-user ~50 min, tribe 1.7–2.6 h, builder ~3.4 h, thinker ~3.7 h; population holds at 32–35 with ~18 strangers welcomed by 4 h; builders with axes fell trees for logs. Browser chaos runs with the intro, strangers and the word book (desktop 522 actions, phone 771): no errors.
- Less cuddling (§0.14; engaged-bot ladder, 200 min, seeds 1–3, unseeded so ±20 min run to run): 4.3.1 laid 51–176 eggs and ended at 19–65 smols; now 39–70 eggs, ending at 31–50 (lowest after 30 min: 10–14), hearts on screen ~1% of smol-time instead of ~11%. Builders 66–81 min, town 79–107, city 159–179 on two seeds (none on the third, which never reached town before), ascended ~178–203. City and ascension run later than 4.3.1's best seed: fewer births means fewer generations.
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

