# smol brains 4 — design doc

**Creatures/Norns on steroids, on an island, in 3D.** You find one glowing egg on a procedurally generated island. What hatches is a wobbly blob with a real neural-network brain. You raise it, teach it words, and watch its children's children grow legs, then hands, then language, then villages, then big glowing brains, until they are building something they call *the big thought*.

v1 (one side-view valley, smols and grumps, word teaching) is the seed this grew from. Everything that made v1 work is still here, rebuilt for a world you can fly around: real brains that learn from reward, genetics and breeding, body chemistry, word teaching with the tickle-and-tap hand, copy-paste smol codes, autosave. v1 saves load into v2 (see *Saves*).

No Creatures names, art, code or assets are used. Everything here is original.

---

## The game it is becoming (Ashton's goal, Nov 14 2026)

Ashton: "I want to take the likes of rimworld, sims, creatures, minecraft, stardew valley, and terraria, and I want to combine all of these games into one, that's what I want smol brains to be ... make it fun from start to finish, I honestly feel like the beginning of the game is weird and hard to understand and not fun. Also I want a whole revamp on the lore and story, and I want a whole revamp on the cutscenes, honestly, none of it makes sense to me ... beautify the game, make it cleaner, make everything better." His three picks the same hour: the story is a **crashed ark**; a new game **starts in a smol's body**; the main play is **both, switching freely** between a body and the colony.

**The honest read after playing it (Nov 14).** The skeleton is strong and nothing else has it: real learning brains, genes, a living colony, and a first person you can step into. What was wrong: (1) two stories glued together (an ark and its pods, and a sleeping giant with a Lantern and a wish), told in a made-up language with the readable line in small print; (2) the first ten minutes were a film, then a pod you tap, a smol you drag, five idle minutes, then a chase: you watched more than you played, and never learned who you were; (3) the sky view asks you to care for a crowd before you have cared about one; (4) the colony runs itself, so it is easy to feel like a spectator; (5) screens pile up (cards, toasts, lists) and nothing says which matters.

**The one-line pitch.** You are the Lantern, the guiding light of a crashed ark. Step into any smol to gather, craft, build and fight with your own hands; step back to run the whole colony. What you do by hand, they learn, keep doing, and pass to their children. Wake the pods, raise a people, and build a beacon to call the others home.

**What each game gives it, and the loop that has to work** (the bar for "combined"):

| from | the hook | the loop in smol brains | state |
|---|---|---|---|
| Minecraft | the first day: punch a tree, eat, a shelter before dark | wake as Pip: eat, open the pod, sticks, a fire, the night (4.23). After that: gather, craft a tool, build, go further from home | opening done; mid-game crafting exists, needs goals that pull you outward |
| Terraria | gear tiers and bosses that gate the next place | better tools open harder rock and deeper caves; named night threats to beat; each beaten one opens a biome or an idea | ores, picks and caves exist. **No bosses, no gates yet** |
| Stardew Valley | the day as a unit, a small win every day, seasons, gifts and friendships, a cosy farm | dawn card with yesterday and one goal; farms and seasons; smols have friends and partners. **You can't befriend one yet, and there is no "my smol"** | day card and seasons exist |
| The Sims | you care about one small person: needs, wants, a home | any smol's card shows needs, wishes, family and brain; you can be it | exists; the card is busy and needs a clean-up |
| RimWorld | a storyteller deals trouble; colonists with traits make the story | the director's incidents, raids, strangers, pods, funerals, feuds | exists, and after 4.22 big towns hold together |
| Creatures | you teach a real brain, and breed what you taught | tickle and tap, tricks, words, echoes into the genes, brain surgery | this is the core, and nothing else has it |

**The rules for every release from here.**
- **Play, don't watch.** A film is under 20 seconds and says one thing. Anything that can be done with your own hands is done with your own hands.
- **One body first, then the sky.** New things are met in a smol's eyes, then handed to the colony ("they saw you do it").
- **Always one clear next thing** on screen, in plain words, with a marker.
- **Plain English first.** Smol-speak is the voice under the line, never the line.
- **The colony needs you.** Your hands, your lessons and your choices should be the fastest way to anything; left alone, smols get by, slowly.

**The build order from here** (each its own tested release):
1. **4.23: wake up.** The story rewritten on the ark; one opening film; the first day played as Pip. *(this release)*
2. **4.24: the look and the clean-up.** One visual language for every panel, card and list; fewer things on screen at once; the smol card and the menus tidied; phone layouts.
3. **4.25: your smol, your home (Stardew + Sims).** A favourite smol you follow from the sky and return to; gifts and friendship with the sky; a home plot you build by hand; a daily to-do that pays.
4. **4.26: go further (Minecraft + Terraria).** Tool tiers that open the island outward; caves worth going down; chests and a base; a reason to explore each biome.
5. **4.27: the things in the dark (Terraria + RimWorld).** Named grump bosses, each guarding something; a fight you prepare for; the storyteller builds toward them.
6. **4.28: the long game.** The beacon as a real building project with stages; the other pods as quests; an ending that is played.
7. Then a start-to-finish hand playthrough, and whatever it finds.

---

## The complete game (Ashton's goal, Nov 9 2026)

Ashton: "Make it a complete, thought out, proper game that will become a hit … Look at games like stardew valley, rimworld, sims, creatures, minecraft, terraria, starbound … full of lore, story, gameplay, different things … I am shooting for pixel art style." The target is a build he can play through, enjoy and give real feedback on. It freezes Mon Nov 9, 15:00 PT.

**What those games do that we must too** (and where smol brains already has it):

| game | what makes it stick | smol brains |
|---|---|---|
| Stardew Valley | the day as a unit, with a small win every day and a season calendar; clear long goals (the Community Center); cosy pixel art | day/season clock and seasons exist. **Gap:** nothing marks the end of a day or says what you won. **Plan:** a dawn recap. |
| RimWorld | stories emerge from colonists with traits, needs and moods; a storyteller paces the events | smols have traits, minds, opinions and grief; `director.js` deals the story cards; raids and strangers exist. |
| The Sims | you care about one small person's day; needs bars; relationships | the possession "small body's day", needs, friends, rivals and couples all exist. |
| Creatures | real learning brains you teach; genetics across generations | this is the core: brains, words, tricks, genes, echoes, evolution. |
| Minecraft / Terraria | first-person survival: gather, craft, build, survive the night, then discover deeper things | possession survival: gather, craft, campfire, lean-to, night chases, caves and ores. |
| Starbound / Terraria | lore you find in the world; a story arc with a finale | the Last Lantern arc: memory embers relight it in 4 stages, then the Hollow wakes; pods, ruins and logs. **Gap:** the lore is only in the films. **Plan:** a lore journal. |

**The core loop (minute to minute):** watch the island → spot a need (hungry, a wish, a prayer, a grump, an egg) → act with the hand, a miracle or by lending your light → the smols learn from it → sparks and embers.

**The day loop (6 min):** dawn recap, then the morning goals; work through the day; at nightfall the grumps come and maybe a chase; you survive the night and get an ember.

**The long goals:** the quest chapters (6, from first sparks to the big thought); the evolution ladder (blob to ascended, 7 tiers); the Lantern (5/15/30/50 embers: three stages, then the Hollow wakes); the town grows to a city; the spire is the end; new game+.

**The lore:** the smols live on the back of the Hollow, a sleeping giant. Their Lantern keeps their memories, and grumps are smols whose light went out. You are the Lantern's last spark. Each memory won back is an ember, and every few embers bring back a page of what the smols forgot: who lit the Lantern, what the ark was running from, why the Hollow sleeps, what grumps were. The finale: the Hollow wakes and the grumps remember their names.

**The pixel-art direction:** the hd pixel look becomes the default.
- The 3D scene is rendered low-res with 1 px outlines.
- The Higgsfield pixel-art textures (4.12) cover the ground, trees, buildings and water.
- Item icons are pixel art, and the smols are painted pixel sprites.
- The light is warm and there is a soft focus.
- The voxel and classic 3D looks stay in settings.

**The build order (ship each as its own PR):**
1. **4.13: pixel art by default.** The hd look is the default. Its first person is crisper (less blur), and the title screen backdrop is redrawn in the pixel look.
2. **4.14: the lore journal.** 📖 memories from the Lantern: 16 short pages of lore unlocked by embers, read in a journal, with the embers and stages on the same page.
3. **4.15: a day on the Hollow.** At dawn, a small corner card sums up yesterday (hatches, words, tricks, ideas, embers) and gives today's one suggested goal. It never blocks play.
4. **4.16: pacing for one sitting.** An engaged player sees critters in ~10 min, hands within the first hour, a village and Lantern stage 2 within ~2 hours. Tuned from headless sims and measured.
5. **Start-to-finish test.** Headless runs through every chapter, every Lantern stage, the finale and new game+. Chaos runs on phone and desktop. Then a final live check, and the link to Ashton.

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

## 0.48 What v4.10.3 changed: the hand, the opening, day 1 (K-0057)

- **The camera stays over the island.** A pan, a fling or WASD can't take the view's centre more than 6 tiles past what the smols have explored (`R.seenBox`, worked out again only when more is seen). Films and following a smol aren't held back.
- **A mouse with the hand doesn't pan by accident.** With ✋ grab, a left-drag that starts on bare ground reaches instead of panning: the hand follows the cursor and, pushed to within 36 px of the screen edge, drags the view along. Middle-drag pans, right-drag (or shift-drag) still rotates and tilts, and WASD pans. Fingers still pan with one finger, as phones expect.
- **Bigger reach, and you see what you'll grab.** The near-miss pick is 40 px with a mouse, 56 px with a finger. Hovering with the hand puts a white ring on the smol a press would take. (Mouse hover had never run: the check wanted the stage `div`, and the events land on its canvases.)
- **The opening is about 38 s, not 65.** The ark film plays faster (`WARP` in intro.js, about 12 s), the Lantern film cuts the slow walk along the ridge and keeps the crash, Pip's run from the grump, the wish and the spark (`L.WARP`, Infinity is a cut, about 21 s), and the camera drop is 4.5 s. A "🔊 sound on" pill shows for the first 4 s.
- **Day 1 is long enough to learn.** After Pip eats there are 160 s of free day (`FN.DAY1`) before the 40 s sunset. The clock holds at late afternoon until then, even sped up.
- **The first pod opens in two taps.** Items are picked where they're drawn (the voxel lift, `R.vdy`), and the pod's tap zone is its size: taps used to miss it in the voxel look. Each tap is worth 50% (`SB.World.POD_TAP`).

## 0.94 What v4.45.0 changed: the opening story ends on time

**Why.** cc-lead looked at 4.44 on a fresh island and found that a smol was never "carried home" there. The cause was the opening story. The game treats the island as "in the story" through the first night, and after that until the seven basics cards ("pick a smol", "feed it" ... "that's the basics") are finished or skipped. The cards had no time limit. A player who left one sitting stayed in the story for good.

**What the story was holding back.** More than "carried home". While the cards were unfinished:
- a smol hurt too badly was lost, never carried home (unless "nobody is lost" was on);
- the storyteller sent nothing (director.js);
- no night chase was offered (nightchase.js);
- no crashed pod or other site turned up (sites.js);
- weddings, festivals and kids' circles waited (friends.js);
- the first hour's wishes, the guide's tips and the "first night" card stayed away.

So a player who ignored one card got a much quieter game and could not know why.

**What changed.**
- **The cards are put away by themselves at the dawn of day 3.** The first night ends at the dawn of day 2, so the cards get one island day (20 minutes at normal speed). After that `Game.cardsOver` marks the tutorial done, the card comes off the screen and one line says "the basics cards are put away now. ❓ help is in the menu." Everything in the list above then runs as on any island. `Game.CARDS_END` (2.21 island days) is the line.
- It never happens before the pod is opened (no smol is out yet) and never while the first night is still running: that night ends its own way.
- A player who is working through the cards when day 3 dawns is not cut off (cc-lead's guard): each time a card moves on, the set waits another half minute (`Game.CARDS_WAIT`, stamped as `tutorial.stepT` by ui.js). It is put away only once a card has sat for 30 seconds.
- **"Carried home" no longer waits for the cards at all.** It waits only for a taught night: the first night, or a night chase you were lent into (`lesson()` in powers.js, used by `Powers.catchFall` and by the older `downed` rule). A founder hurt too badly while a card is up is carried home like any other smol.
- An island saved in the middle of the cards and opened after day 3 has them put away on its first moment of play.

**What it does not change.** An island whose player finishes or skips the cards (nearly all of them, within minutes) plays exactly as before. Headless runs and the judging islands start with the tutorial done, so no measured number moves.

**Tests.** `tests/play445.test.js`: a fall while a card is up is caught and no death is announced; a fall in the first night is real unless "nobody is lost" is on; the cards end at the dawn of day 3, once, not a moment before, not before the pod and not during the first night; a card moved on 10 seconds ago makes the set wait, and half a minute later it goes; after that neither friends.js nor powers.js counts the island as in the story; the card comes off with its one line.

## 0.93 What v4.44.0 changed: what the proof pass turned up

**Why.** Ashton asked that every feature in the plan be shown to work in the game, not only on paper. The proof pass draws ten rows from each of the 24 systems in the ledger and tries each one by hand (`smol-brains-handover/PROOF-PASS.md`). The first four systems (40 rows) gave 37 passes, 3 rows that did not work, and several bugs that sat outside any row. This release fixes all of them.

**Three rows that did not work in play.**
- **A smol that "goes down and is carried home" was still mourned.** It died first and was raised a moment later, so the farewell card, "X died." in the log, the grief and a ghost light all showed for a smol asleep at home. Now `Creature.die` asks `Powers.catchFall` before anything is announced: the smol never dies. This is the ordinary rule (hurt too badly, friends within 14 steps, once a day) and the "nobody is lost" switch. The switch now also holds while the first lesson is running; before, a founder could be lost for good in the first minutes with the switch on.
- **"No story prompts" left the first prompts on screen.** Switched on in the first minutes it kept the lesson's quest line and marker, the seven tutorial cards, and the "find food" line on stepping into a smol. Now the quest line and its marker hide at once, no lesson line starts in a body, no tutorial card shows, and the pointers to a captain's lair and to the beacon go too. Markers the player chose (a map's X, a pin) and the way home at night stay. Switched on while the first day's lesson is running, it ends the lesson the way the lesson's own "skip" does (the pod opens, the fire is lit, the night passes) and marks the tutorial done, so the island is not left in its lesson rules with nothing on screen. Turning the switch off brings the hints back; the first lesson and the tutorial cards do not replay.
- **Sandbox "copy this" could never show.** It waited for an empty third button, and an item's third button is always taken (pick up, eat, or the reason it can't be). It is now a sandbox tool beside the eraser and "move buildings": pick "copy things", look at a thing on the ground, and the first button is "copy this". It copies things on the ground, not bushes or rocks.

**Bugs found on the way.**
- **Every button on the town tab acted twice for one press.** One press on "buy" took two and charged twice; the cup game played two goes. The bag wires the home tab's buttons on every draw whatever tab is open, and the town tab wired the same buttons again. A button is now wired once.
- **Found places drifted away from their markers.** The list of the island's places (barrows, springs, islets, the hull and the rest) was worked out again on every load from things that change in play: the sites, the caves, where a smol can walk, the water. On a day-8 island 33 of 83 markers no longer stood where the game put their place, some by more than 200 steps, and a barrow's "go in" answered "get closer to the way in". The list is now saved with the island the first time it is made (`quests.deep.places`). On an island from before this release, a marker that already stands is where its place is. The drift had a second effect on such islands: a place that drifted onto a spot already found was "found" there again, so some spots carry two markers (18 of them on the island below, such as two barrows on one spot). The older marker keeps the spot. The newer one is taken away and its place goes back onto the island, not found yet, on the ground the older one's place had drifted off to; the count of places found drops by those repeats.
- **Honey island said "hives everywhere" and added none.** It now hangs up to 40 more hives by the island's bushes when the quirk starts.
- **Things added to an island after it was made could vanish on the next load.** Looking at the new hives showed it: 40 were added, saved, and 1 came back. `World.addNode` (and the planting code in world3.js) gave a new node "the highest id that is not a vine or sea ice, plus one". That is the id of the first iceberg or glow-stone, which worldgen puts last. On the next load the iceberg was there first, so the added thing was dropped and its saved state was put on the iceberg. It hit anything added in play on an island with sea ice or glow-stones: a sapling a smol planted, a crystal cluster from an event, a boulder from a rockfall. Added nodes now take ids from a range of their own (`World.ADD_ID0`, 40,000,000 up) and never an id in use. A delve's rocks also used the ids of the last worldgen nodes (`Deep.NODE_ID0` was 30,000,000, the same as `WorldGen.ARR_ID0`); they now start at 50,000,000. Things already lost on an old island do not come back.
- **Words.** "take 5 undefined" on a market stall (the button is gone: that stock has no kind). "ready to be a apprentice". "work a shift at the your stall". "a amber goes on the keeping shelf". "deepest delve: level 7 of 6" once the lower levels are open.

**Coming back reads as a generation passing** (cc-lead's call, Nov 17). The away time stays as it is: up to one island day, because generations passing is the point of the game, and a traced case showed the catch-up loses exactly the smols that normal play would (old age). What changed is the "welcome back" card. It used to show two chips, "N hatched" and "N passed on". Now:
- It leads with who was born: "N born", with the newest babies' faces and names.
- Then "N grew old", by name. A name opens that smol's card on a new "remembered" page of the chronicle: everyone the island has said goodbye to, the newest first, with what happened, when, how long they lived ("lived 2.6 days", from the smol's own age, which the family record now keeps as `age`; a smol that passed before 4.44 has no age on record and the card leaves that out), their parents and children. Days lived come from the smol's age, kept in its family record when it goes (`f.age`), not from the clock: on an island whose clock has been moved (a sandbox can) the clock would overstate it. Smols lost before 4.44 have no age kept and show no length of life.
- A loss that was not old age (starved, got too sick, hurt too badly, too cold, too hot, worn out, drowned) gets a plain line of its own with the names, so a real problem still shows.
- The head count ("24 → 17") is only spelled out when the colony shrank by more than a third, with one line of why: "an old generation" when at least half the losses were old age, otherwise the commonest cause.
- No skull and no count of the dead. The log lines for those smols are left off the card, since their names are already on it.
`Game.awayRecord(game, t0, pop0)` in main.js makes the record; `runOffline` hands it to the card as `rep.away`. Seen in the pane on two islands left for two hours: a young one showed "14 born" with six faces and names and "and 8 more"; the day-20 one showed "3 born" (May, Wany, Laina) and "1 grew old · tap a name to remember them" with Sirank, and tapping Sirank opened the chronicle on "remembered · 57" with Sirank's card outlined at the top (when, days lived, five children by name, ten ideas known) and the rest below, the newest first. A line for a loss that was not old age, and the head-count line, did not come up on either island; the test covers their wording.

**`CC_PORTAL.links === false` counts as no-address.** `adPortal()` is now true for an ad portal or for any build with `links: false` (cc-games site's itch `--no-links` build). Both "copy world link" buttons and the address on both share pictures follow it, as in 4.43.

**One press, one act, on every tab of the bag.** Besides the town tab's own fix, the bag now guards itself: `PovHud.onceEach(root)` runs before anything is wired, and a handler wired a second time to the same button for the same event is dropped. `PovHud.dupes` counts what was dropped, by the button's data- name, so the module at fault can be found. Seen in the pane on this build: all 36 tabs and pages of the bag were opened in turn and the guard dropped nothing on any of them, so with the town fix in place it is a safety net only.

**What it changes on an island that plays itself.** A smol that goes down no longer sends a death to the rest of the game. Before, the storyteller counted it as a loss for a moment, friends began to grieve and were then told it was back. Measured on the 18 judging islands (601 to 618, three days each, nobody playing): every island came out the same as 4.42, line for line (271 alive, 249 born, 6 starved, 2 lost to sickness in all), so nothing here changes how a colony does by itself.

**Seen in a browser** (localhost, 4.44.0; the pane is not on anyone's screen). On the day-18 test island made on 4.42, where 33 of 83 place markers had drifted: all 91 markers now stand on their places, and the old barrow whose "go in" had answered "get closer to the way in" opened ("room 1 of 3: the jar room", with its three stones to push). On the town tab one press on "buy" took one torch and charged once. With "nobody is lost" on, a founder killed through the game's own death call stayed asleep at home: no farewell card, no "died", only "went down, and was carried home". On a sandbox island the tools row has "copy things"; with it on, an apple on the ground offered "copy this" as its first button and gave "one apple". A new honey island had 79 hives where 39 were worldgen's; after the fix above they are still there on a reload. On a new island, in Pip's body with the lesson's "find something to eat" line and marker showing, "no story prompts" was switched on from the bag: the lesson ended at once (back in the sky on the second morning, the pod open, the fire lit), with no tutorial card and no "step into Pip" button.

`tests/play444.test.js`: a smol hurt too badly with friends near stays alive, with no death announced, the count unmoved and no "died" in the log; a second fall the same day, starving, old age and a smol alone are still real deaths; "nobody is lost" catches starving too, and holds in the first lesson; the guide switch is told at once and the four places that draw prompts ask it; the copy tool; `wire2` run twice on one button and pressed once acts once; the places list survives a new site, a save and a load, and takes a standing marker's place on an old island; **a real island** (`tests/places-guix-cove.json`: the seed, world settings, sites and all 96 place markers of an island played on 4.42 and 4.43 to day 20, 6 KB): built afresh 37 of its markers disagree with their places, and after the repair every marker left is on its place, the 18 repeats are gone, their places are back and unfound, no place sits on another, all 160 places are still there and nothing moves on the next load; the words; honey island adds hives, once; six things added to an island get ids nothing else has, from the new range, and all six are there after a save and a load; the away record (who was born, who grew old, other losses by cause, the head count) and the card's order and wording; the bag's guard run on two buttons. `tests/play443.test.js` now also covers `links: false`.

**Still open.** The proof pass has 200 of its 240 rows to go (combat, bosses-threats, skills and social are next). Seen in the pass and not fixed here: the "you are <name>" card shows through the open bag; "two families" does not say that you pick the second smol from inside it; the grey "make" button on the master's plaque gives no reason; shells from a chased grump and a tended grave happen with no word on screen. From 4.42: a smol still stands for the first bites of a raid; a stuck stranger; "use" repeating the big button; look-alike dishes and tonics; sound unheard.

## 0.92 What v4.43.0 changed: no site address on an ad portal

**Why.** The portal builds (CrazyGames, GameDistribution, Poki) are made by `scripts/package-portal.mjs`, which sets `window.CC_PORTAL = { name: ... }`. Those portals count our own address on the screen as cross-promotion. Smol Brains had two "copy world link" buttons, on the world tab and on the civilisation card. With the clipboard blocked, as it can be inside a portal's frame, the fallback toast showed the link itself: a computercooked.com URL on screen.

**What changed.**
- `adPortal()` in ui.js (also `UI.adPortal`): true when `CC_PORTAL.name` is set and is not "none" (a plain copy, such as itch, is "none").
- On an ad portal both "copy world link" buttons are left out. The world code chip stays: it is a code, not an address.
- On an ad portal the two share pictures lose the address too: the civilisation card ("computercooked.com/games/smol-brains") and the smol card ("smol brains · computercooked.com" becomes "smol brains"). cc-lead asked for the buttons; the pictures fall under the same rule, so they went with them.
- On the site itself nothing changes.

**Two small things from the proof pass** (`smol-brains-handover/PROOF-PASS.md`): an elder's page said "not grown up yet" on its egg line (it says "past the age for eggs"), and the debug page said "1 frames a second".

**Seen in a browser** (localhost; the pane is not on anyone's screen): on a fresh island, sky menu, world tab. With no flag: the world code, "copy world link" and "civilisation card". After `window.CC_PORTAL = { name: "crazygames" }` and opening the tab again: the world code and "civilisation card" only, and no computercooked.com anywhere in the page's text. The card itself then had "share" and "download" and no third button, and the bottom of the picture ended at the six stat tiles with no address line under them. The share text never held an address ("smol brains on computer cooked games"). Three screenshots are in `smol-brains-handover` (`4.43-look-*.jpg`). The smol card's line was not looked at on screen; its test is a text check only.

`tests/play443.test.js`: `adPortal()` run against no flag, "none", the three portal names and an empty flag; both buttons guarded and only two such buttons in the file; both pictures guarded; every line of code in `src/` that holds the address either asks `adPortal()` or is the one line that only builds the link for the guarded button, so a new line with the address fails until it is guarded; the game's page shows no address in its own text; the egg line for an elder, a youngster and a grown smol; the frame wording.

**Still open.** The proof pass has 232 of its 240 sampled rows still to try. A toast raised from the book in the sky menu may sit under the open menu (copy and paste of job rules gave no visible word back); not confirmed. From 4.42: a smol still stands for the first bites of a raid; a stuck stranger; "use" repeating the big button; look-alike dishes and tonics; sound unheard.

## 0.91 What v4.42.0 changed: the sickness, and four things that read badly from the sky

**Why more smols died sick in 4.40.** On the eighteen judging islands 4.40 lost 7 smols to sickness where 4.38 and 4.39 lost 2 each. A new tool, `smol-brains-handover/tools/island-sick-diag.js`, watches every smol's antigen each tick and says where each jump came from, using the game's own `eat` event to tell a bad meal from a bite. On six tuning islands (101, 102, 103, 105, 107, 108):
- **It is not the food.** Rotten meals are about 1% of meals on every version (2 to 8 an island). Raw-food infections are near zero. The storyteller's own sickness fired once in twelve runs.
- **It is grump bites.** One bite in five infects, adding 0.25 antigen. 4.39 took 26 infecting bites on the six islands; 4.41's code took 58. The biters are the storyteller's raid grumps, by day as well as night.
- **Two things made it worse.** A raid's size comes from head count and buildings, and is cut by a fifth for every death in the last 900 seconds (`threat` in director.js): 4.40's islands are bigger and lose fewer smols, so they draw bigger raids. And from 0.5 hunger a smol was up and about in the dark looking for food instead of in bed, where a hut cuts a bite to a fifth.
- **And one thing made a bite deadly.** A bitten smol's fear is still low for the first few bites (most of the bitten stood idle with fear under 0.3), so it takes several, and every infecting one stacked: three in a row and it was dead in a minute.

**Two rules.**
- **Peckish by day, not by night.** `C.PECKISH_NIGHT` (0.65, the old number): at night a smol only goes looking for food from there. All five places that asked for `C.PECKISH` ask `peckish(game)`. A hungry smol (0.7) still gets up.
- **A bite does not stack.** `C.BITE_CATCH` (0.2): a grump's bite can only infect a smol whose antigen is under that. A smol that already has it does not catch it again.

The raid sizing is left alone: it is the storyteller working as designed.

**Measured.** Tuning islands first (the same six): infecting bites 26 on 4.39, 58 before the fix, 25 after; smols dead of sickness 3, 2 and 0; alive at the end 67, 74 and 94. Eggs on 101 to 103: 46 (4.38 34, 4.39 29, the early 4.40 40). On the 18 judging islands (seeds 601 to 618, the ones whose totals raised the question, so not a blind test; never traced), 4.38, 4.39, 4.40 and this: **dead of sickness 2, 2, 7 and 2; starved 9, 12, 8 and 6; alive at the end 249, 241, 278 and 271; born 235, 218, 252 and 249.** The table is in `smol-brains-handover/tools/sickness-442-measure.txt`.

**From the sky** (the screenshot pass on 4.39 found these):
- **Keepsakes.** The 29 keepsakes dropped by big beasts were one gold cup with a gold bead, and the torch god's was drawn as a hat (its name matched an earlier rule). Each now has one of nine colours for its base and topper, one of eight toppers (ball, spike, crystal, horns, flame, block, ring, star) and a gold, silver or bronze cup by how tough the beast is. No two share a colour and a topper.
- **The great glowshroom** was a square stem under two square slabs: a purple tile from the sky. It is round: a tapering stem, a skirt, a dark underside, a dome, and pale spots that glow.
- **The healer's hut** was one flat green cone. It has a darker eave, a white band round the roof, a white knob at the peak and a bigger banner.
- **The shop** was a green rectangle. Its awning is striped green and cream.

**"Ave memories back."** 4.40 said the pixel font's broken "fi" was fixed on every screen. It was not: the opening film's caption still read "Ave memories back." for "five memories back." (and "fluff" would read "Auff"). 4.40's rule used a plain `*`. The captions are styled with `font: ... !important`; a font shorthand puts the ligature settings back to normal, and a class outranks `*`, so the caption's own rule won. The rule now carries three `:not(#id)`, the weight of three ids, and no font shorthand in the stylesheet weighs as much (the test counts them). Seen on a page with the caption's exact style, before and after: "Ave memories back. Afty Arst Auff of Are" became "five memories back. fifty first fluff of fire". Letter-spacing of any size also cures it, which is how it was found.

**Seen in a browser** (localhost; the pane is not on anyone's screen, so cc-lead looks before release): on a fresh island from the sky, the 29 keepsakes laid out in rows each showed its own topper and colour and no two neighbours looked alike (they are small even at the closest zoom); the great glowshroom was a big purple dome with pale spots on a pale stem; the healer's hut showed its darker eave, pale band and knob; the shop showed its stripes.

`tests/play442.test.js`: the two numbers and which applies when, the five places, the bite rule, every keepsake drawn as a keepsake with no pair repeated and all eight toppers building a mesh, the glowshroom's dome and spots, the healer's roof and banner, the shop's stripes.

**Still open.** 6 smols still starve and 2 still die of sickness on the 18 judging islands in three days. A smol still stands for the first bites of a raid (its fear is low until the third or so); the bite rule only stops those bites stacking. The raid sizing is untouched. A stuck stranger still stands where it is once it has eaten. On a phone "use" still repeats the big button when a thing has one action. Look-alike dishes and tonics are untouched. Sound is still unheard by anyone.

## 0.90 What v4.41.0 changed: seven small things on a phone

4.40 was looked at in a visible browser at 390 by 844 and 740 by 360 before it shipped (cc-lead, Nov 16). It passed, with seven notes. All seven are here; nothing else changed, and no smol behaves differently.

- **The stick after you turn the phone.** The stick rests where your thumb last came down, kept as a spot in px from the corner of its zone. Turn the phone sideways and that spot could be below the screen (y 415 on a 360 screen) until the next touch. A resize or a turn now puts it back in its corner, unless you are holding it.
- **A drink when you are not thirsty.** Drinking with a full water bar showed nothing at all. It says "a sip. you're not thirsty".
- **"Tap", not "click".** Two goals ("find something to eat", "wake the others") said "click it" on a touch screen. The table that swaps mouse and key words for phone ones (`PHONE_WORDS`) now ends with "click it" to "tap the big button" and any other "click" to "tap". The test runs the real table over every goal's tip and finds no "click" left.
- **Held sideways, the red chase banner** ran under the button grid, and the name of the thing you are looking at sat on its text. It sits under the clock now (68 px), wraps, and is no wider than the room between the stick and the buttons. A toast drops to 118 px while the banner is up.
- **Held sideways, the "OUCH!" card** covered the top two rows of buttons for a second. It is smaller (38 px) and at the top.
- **The bag on a phone** had its only close button at the bottom, a scroll away on a tall bag. There is a "✕ close" in the heading as well.
- **The title screen held sideways:** the footer line (computer cooked games, the news, the version) is fixed to the bottom of the screen and lay over the "play now" card. On a short screen it comes after the menu instead.

**Seen in a browser** (localhost, touch; the pane is not on anyone's screen, so cc-lead looks again before release): at 740 by 360 the footer sat at the end of the menu, the banner ran from 207 to 533 px with the buttons from 564, a toast sat at 118 px under it, and "OUCH!" was at the top centre; a stick spot set to 415 px went back to its corner on a resize. At 390 by 844 the bag had "✕ close" at 82 px and it closed the bag; the berry goal's tip read "tap the big button".

`tests/play441.test.js`: the phone words run over every goal's tip, the sip, the resize rule and its listeners, the sideways rules (with the sum at 740, 667 and 568 wide), the bag's close, the footer.

**Still open** (from 4.40, unchanged): sickness deaths (7 on the eighteen judging islands against 2), one drowning, a stuck stranger once it has eaten, "use" repeating the big button when a thing has one action, the art notes from the screenshot pass, and sound, which nobody has heard.

## 0.89 What v4.40.0 changed: a fed island has eggs again, and a tidier phone

**Why births fell in 4.39.** A smol sleeps until hunger wakes it at 0.7 and a meal takes off about 0.4, so the mean hunger of an island sits between 0.32 and 0.51 even with four or five bites of food lying about for each smol (`smol-brains-handover/tools/island-breed-diag.js`, eight tuning islands). The "hard times" rule stopped eggs when that mean passed 0.55. Hunger alone was the wrong test: the islands it stopped were fed.

**Two changes.**
- **Peckish at 0.5** (`C.PECKISH`). A smol looked for food from 0.6 to 0.65 (five places in creature.js: food in sight, its nose, the walk back to where food was, the idle snack, the wander when nothing is in sight). All five now start from one number, 0.5, so a smol with food round it eats before it is half hungry.
- **Hard times means hungry and short of food.** No eggs when the island's mean hunger is over 0.55 (`C.HARD_HUNGER`) and there are fewer than two bites of food a smol on the ground (`C.HARD_FOOD`), or when the mean is over 0.7 whatever is lying about (`C.HARD_HUNGER_MAX`). The older rule for a bare island (more than six smols and under 0.7 bites each, 1.2 in winter) stays.

**Island 23, three more ways to starve beside food.** The suite's island 23 test (`tests/play438.test.js`: three days, nobody starves) failed on the changes above with one death, and failed twice more as each cause was fixed, because any change replays an island differently. `island-starve-detail.js` each time:
- **The wade came five seconds late.** Food across a stream. 4.37 lets a starving smol that is cut off wade after three meals it could not walk to; its third try ended five seconds before it died. Two is enough now (`C.WADE_AFTER`).
- **The long way round.** With that fixed, the route finder found a way round the water, over a minute's walk to an apple twelve steps off, and it died on the way. A starving smol whose route is over 25 steps and over twice the straight line wades straight for it (`C.WADE_DETOUR`, in `walkToward`).
- **A stranger sent on and on.** A visiting stranger is given its next spot every 12 seconds by `Strangers.think`. One stood stuck for its last three and a half minutes, a berry twelve steps off, and never looked for food. A starving stranger (over `C.STARVING`) now thinks for itself until it has eaten.

**Measured** as 4.39 was: tuned on seeds 101 to 112 and on island 23, totals only. Judged on 18 islands never touched (seeds 601 to 618), three days each, live 4.38 and 4.39 against this: **alive at the end 249, 241 and 278; born 235, 218 and 252; starved 9, 12 and 8.** Births and the head count are well past 4.38. Starvation is level with 4.38 and under 4.39, but 4.39's figure is mostly one island that lost ten, and a starved smol or two per island moves with any change, so on 18 islands that line says "no worse", not "better". The table is in `smol-brains-handover/tools/starvation-440-measure.txt`.

**Phones** (found in the screenshot pass, portrait 390 by 844):
- **Status chips pushed the food and stamina row off the screen.** "soaked" and "very hungry" side by side were wider than the meters. The chips now take the width of the meters and no more; when they do not fit they show as icons only.
- **The goal box sat over the clock.** It starts 10 px lower.
- **The list of actions by the crosshair is gone on a touch screen.** The buttons say the same thing. That is one text box fewer.
- **The small "place" button repeated the big one** ("crouch and sneak" twice). When they would say the same, the small one says "place", dimmed.

**One thing at a time.** A story card no longer opens under the pod-landing map; it waits for it to close (`UI._podUp`).

**"Afty memories."** The pixel font's "fi" ligature is broken, and a story film read "Afty" for "fifty". Ligatures are off for every element in `play/style.css`.

**From the builders** (round 4, three branches):
- powers.js: "new coat" recolours without a reload; "bigger markers" and "reduce flashing" now reach the markers and flashes they were meant to.
- world3.js: ground that changes biome is baked again in every chunk the patch reaches (it marked one point, and 1,540 of 2,304 patches missed a chunk).
- deep.js, animals.js: a smol carrying a raft, or riding an animal over water, no longer grows fins. It wades (`c.wade`) instead.
- orders.test.js: the three parts that failed about one run in 24 now have a fixed seed.

**Seen in a browser** (localhost, 390 by 844 with touch, in a smol's body): the status chips showed as icons inside the width of the meters and the page stayed 390 wide (it was 407 on 4.39); the goal box began at 68 px, under the clock; nothing was drawn by the crosshair but the name of the thing; at a pond the buttons read "drink", a dimmed "place" and "gaze into the water" (both small ones read "drink"); the buttons ended at 740 px and the meters began at 744. Held sideways (740 by 360, and by sum at 667 by 375 and 568 by 320) the meters ended 97 px short of the buttons and a toast sat at 70 px, under the clock. A campfire at night from four steps off: a pointed flame and a warm patch of grass. The pane this was seen in is not on anyone's screen; cc-lead looks at it in a visible one before release.

`tests/play440.test.js`: the peckish number and a scene (a smol held at 0.56 hunger, an apple twelve steps off: it goes and eats), the hard-times rule through `C._tryBreed` (fed, hungry with food about, hungry and short, very hungry), the chip, goal box, crosshair list and button rules, the pod map, the ligature rule. `tests/round4-powers.test.js` and `tests/round4-world.test.js` are the builders'.

**Still open.** 8 smols still starve on 18 islands in three days (seven islands lose one or two; not traced, they are judging islands). One smol drowned on them; wading smols count as swimmers, so this is likely the old kind (a smol dropped or wandering into deep water), but it was not traced. Deaths from sickness went from 1 or 2 to 7, with more smols alive to catch it; worth a trace on tuning islands next. A stranger that is stuck still stands where it is once it has eaten: only the starving are let off the script. On a phone, when the thing under the crosshair has one action, "use" and the big button still say the same. From the screenshot pass, art that reads badly: the healer (a flat green disc from above), the shop, the great glowshroom, the 27 trophies that all look alike, most dishes and tonics. Sound is still unheard by anyone.

## 0.88 What v4.39.0 changed: starving smols eat

**Measured properly this time.** 4.36 to 4.38 were tuned and judged on the same nine islands, and twelve new ones showed the numbers were too kind. This round was tuned on thirteen islands (seeds 101 to 112 and 201) and judged on forty-eight it never touched (401 to 424 and 501 to 524), three days each, totals only (one small change reshuffles an island, so single islands rank nothing). Smols starved, live 4.38 against 4.39: 26 and 10 on the first twenty-four, 38 and 16 on the second. Together: 26 and 10LL. The table is in `smol-brains-handover/tools/starvation-439-measure.txt`.

**What a trace of every starving smol showed** (`smol-brains-handover/tools/island-starve-detail.js`: every action change of a smol at hunger 0.98 and above, how the last one ended, and who called it away):
- **called away, every second.** "The shiny cube" (a dark.js place) pulls the four nearest smols to it on every slow tick with `sendTo`. On island 105 it called smols at full hunger 579 times; five starved standing beside it, food five steps off. About 120 places call `sendTo`, so the rule now lives in it: a smol past `C.STARVING` (0.85) turns down every call that is not forced, and goes on looking for food. Forced: its own thinking (quarantine, the cage, hiding, shelter), the first night, and a walk to a stall that sells food. The smol you are playing goes where it is sent. The sky's orders were always "not if it is starving" (the help says so); now that is true.
- **fruit in a pond.** Fruit that falls into water deeper than a smol can wade is still smelled and seen. Starving smols walked to the bank, stalled, gave up, and came back to it later: two died at one pond. Food lying where a smol cannot stand (`World.walkable`: deep water, a slope too steep) is now left out of what it sees and smells, unless it can swim.
- **an arm's length off.** A starving smol that stalls just short of its food (a bank, a crowd) stretches for it: within 1.1 of reach after 1.2 seconds without getting closer, it eats.
- **beaten to it.** A starving smol walked twenty steps to food, and a smol that was only peckish ate it first, again and again. Food a starving smol is walking to is now marked for 25 seconds; smols that are not starving leave it alone, and other starving ones pick another.
- **shoving matches.** Starving smols still picked fights (the net chooses "hit" on its own, and a grudge or a tantrum hits back) and spent their last minutes shoving beside food. Past 0.85 hunger a smol starts no fight, holds no grudge and throws no tantrum.

**Tried and dropped.** Counting progress along a route (distance left on the path, not the straight line) as progress, so a route round a cliff is not dropped after eight seconds: thirteen tuning islands lost 25 smols to hunger with it and 8 without. Giving up on a long detour and choosing other food is better. 4.38's next-439 branch tried the same idea through waypoints and was no better either.

**Not a cause.** The death log said "asleep" for most starved smols. Every body is marked asleep by funeral.js before the death event fires, so that word meant nothing; 4.36's "they starve in their sleep" was a misreading.

**Phones.** Off-screen marker arrows sit higher on a short screen held sideways (they sat on the stick), from next-439.

**Seen in a browser** (localhost, the saved test island): a smol set to 0.97 hunger with an apple five steps off and a call to a spot behind it every second turned down 16 calls, walked to the apple and ate (hunger 0.57), then answered the calls again. At 740 by 360 with touch, in a smol's body, the "pick up a stick" arrow sat at 97 px from the top, above the buttons and the stick (it was 180).

`tests/play439.test.js`: the call rule (refused, forced, a fed smol, the smol you play), the shiny cube played again (a call to a fixed spot every second, food five steps off: it eats), a pond apple nearer than a dry one (never headed for), food a starving smol is walking to left alone, the fight and stretch rules, the phone markers. Nine of its checks fail on 4.38, both scenes among them.

**Still open.** 26 smols still starve on forty-eight islands in three days (502, 522, 412 and 518 lose three or more; not traced, they are judging islands). Deaths in all did not move (521 and 529): a smol saved from hunger mostly dies old soon after, so this release is about smols no longer dying beside food, not about longer lives. Births fell by about a tenth (611 to 546), and the head count at the end with them (645 to 579). `smol-brains-handover/tools/island-breed-diag.js` on eight tuning islands shows why: an island's mean hunger sits between 0.32 and 0.51 even with four or five bites of food per smol on the ground, tryBreed's hard-times gate is a mean over 0.55, and smols that now live on hungry push the mean over it more often (pairs stopped at the gate: 77 on 4.38, 188 on 4.39; eggs 107 and 95). The next round is that mean: why a smol with food all round it sits half hungry, and whether the gate should count the hungriest few. Sick deaths 14 and 24, not firm. `orders.test.js` part 7 (stone to the pile) is not seeded and fails about one run in 24 on 4.38 and 4.39 alike (one stone on the pile where it wants two); run it again. On a sideways phone the goal arrow (the lowest of the three) sits beside the top corner of the stick's box, clear of the stick itself.

## 0.87 What v4.38.0 changed: the winding path, and three more languages

**The last island that starved.** Island 23 still lost two smols to hunger in three days. A count of why starving smols gave up a walk to food showed one reason above all: "no closer for seven seconds". Closeness is measured in a straight line, so a smol following a path round a hill, which takes it further off before it brings it nearer, was "going in circles" after seven seconds and marked the meal unreachable. A starving smol that has a path now gets twenty (creature.js, beside the 4.37 rules). Island 23: nobody starves in 3.3 days. Nine islands, three days each: seven lose nobody; islands 5 and 42 each lose one (one pinned in place with a path it cannot follow, one a hundred steps from home with food forty off). What "starving beside food" looked like in the 4.37 trace turned out to be smols in the middle of eating it.

**Languages.** French, German and Portuguese packs join the Spanish one in title.js, each with the same 93 lines (title, new island, settings, strangers, a few notes). The settings screen already lists a button per pack. The game's own words (thousands of lines across fifty files) stay English: four full tables would not fit under 5 MB. The ledger's "language support" row is closed on that basis.

**Looked at and left.** `SB.Minds` luck in collect.js: collect's rolls are seeded from a smol's genes so that a smol code always gives the same traits; luck there would break that. `director.test.js` takes seven minutes alone; it took as long before 4.37 (timed on an older checkout), so the bigger tribes did not slow the game.

`tests/play438.test.js` holds the rule, the three packs (every Spanish line covered, blanks in place) and island 23 for three days.

**Still open.** One smol on each of islands 5 and 42; phone layouts; movement, camera and sound by hand; the thin rows the builders flagged.

## 0.86 What v4.37.0 changed: the hand playtest, and smols that reach their food

**How it was played.** In the browser, by hand where the hidden pane allowed (the first-day walk, the bush, the founders, the sky card), then with a fully grown smol and a full bag: every one of the twenty bag pages opened, and every button on them pressed once (185 presses). No page threw and no plug-in switched itself off. What it turned up is below. Not played: movement and camera feel, sound, and phone sizes (the pane freezes page timers at phone size while hidden).

**Starving beside food, the rest of it.** 4.36 stopped funerals and story calls pulling starving smols off food. Nine islands, three days each, still lost smols to hunger, and a trace of what each starving smol was doing showed five more causes:
- **the walk gave up.** A starving smol's nose reaches across the island, but the walk to a thing stopped after 25 seconds (about twelve steps) and marked the food unreachable. It now gets 90 seconds while it is starving (`starvingFor` in creature.js).
- **any word stopped it.** Hearing a verb it knows cancels a walk, so a starving smol near chatty ones started over again and again. A starving smol on its way to food no longer stops to listen.
- **more company calls.** The crashed-pod party in director.js (315 calls to starving smols on one island), the grump-moon pack and sleepwalking in dark.js now use `C.sendSoft`. The storm order ("everyone shelters at home") gives way above 0.85 hunger.
- **marooned.** One smol sat on a patch cut off by a stream with every meal across the water. A starving smol that has failed to walk to three meals wades for a minute (`c.wade`, read by the same `swim` test fins use).
- **travellers.** Strangers waiting at the edge, passing, leaving or living wild have no part in the tribe's food and starved a few steps from the village. Only a guest eats with the tribe now; the rest never get hungrier than 0.8 (strangers.js).

Nine islands, three days: 4.36 lost smols to hunger on every one measured (3, 2, 2, 2, 1 on the five counted); now one island of nine loses any (two, both far from home), and the tribes are about twice the size (island 77: 7 alive, then 12 to 14). `tests/play437.test.js` holds the rules and runs islands 77 and 301 for three days with nobody starving.

**The wrecked hut that was never rebuilt.** On some islands (seeds 5 and 8 of `threats.test.js`) a wrecked hut stalled two fibre short for good: the fibre near it was already in the paws of smols with no plan for it, and the free fibre was ninety steps off. `I.chooseBuild` now starts with: whoever is holding something an unfinished site of their tribe is waiting for brings it over, builder or not. Seeds 5, 6 and 8 all rebuild.

**Small things seen in the bag.**
- the bag's pop-in animation replayed on every tab and every redraw (the window is rebuilt each time). It plays once, on opening.
- skill rows on the grow page had no layout (the rule was scoped to the "you" page): "running0".
- 591 kinds have no picture of their own and many share a sign (eleven dyes, nine tonics, twenty-two seeds). Each now carries a corner of its own colour.
- "made a climbing claws", "your smols found a mountains", "marked: follow the (icon) a grump camp's dark": reworded.
- the builders' asks left over from round three: a smol's rules (minds3.js) on the sky's smol card, a mother carrying her egg shows it, a ghost is pale, and a smol's luck tilts foraging and the rare finds in chests.
- `body.test.js` is seeded for the whole file (unseeded it failed about one full run in ten).
- hiding the page on the title screen threw (no island yet).

**Still open.** The two starvation cases far from home on one island; phone layouts; movement, camera and sound by hand; the thin rows the builders flagged; more languages than Spanish (the one open row in the ledger).

## 0.85 What v4.36.0 changed: a hungry smol eats first, and a bag you can read

**Why smols starved beside food.** On some islands several smols starved in the first three days with food lying a step away (five test islands: 18 starved in three days). It looked like they starved in their sleep; that was a false lead (funeral.js marks a body asleep). What was happening: `C.sendTo`, the call that walks a smol somewhere on someone's say-so, is used by funerals, by the director's story events, by friends.js and by dark.js, and it drops whatever the smol was doing. A starving smol would start toward an apple, be called to a funeral a second later, walk back, start toward the apple again, and die there. Each death called another funeral. The fix, hung on one number, `C.HUNGRY_AWAKE = 0.7`:
- `C.sendSoft` is `sendTo` for company rather than need. A smol that hungry does not come, and one already on its way breaks off when it gets that hungry. funeral.js, friends.js, and the calls director.js and dark.js repeat every tick now use it. A smol you are inside is never refused. `C.sendTo` itself is unchanged, so danger, the player's own word, orders and a hungry smol's walk to a food stall work as before (a first version put the rule in `sendTo` and broke exactly those: three tests caught it).
- a hungry smol wakes, and will not lie down again while it is that hungry.
The same five islands: 10 starved in three days (0 in the first two days on the two worst). It is better, not solved: the tribe still loses a smol or two to hunger on a poor island. `tests/hungry436.test.js` holds the rules and runs the two worst islands for two days with every system loaded. How it was found (a setter on a starving smol's action that prints who replaced its "eat") is in the playtest log.

**The bag.** Sixteen plug-in tabs was a wall of icons. `ext.js` now puts them in four groups (`X.GROUPS`: people, body, land, tribe) and `X.layout` tells povhud.js what to draw: the groups on the top row, and the open group's own pages on a second, smaller row. A tab in no group stays on the top row. `tests/tabs436.test.js`. The wear page lists only what is on; the bare places share one line (six rows of "nothing" was most of the page).

**The campfire.** Its light was strong enough to wash green ground to neon yellow for many paces (colour 1, 0.58, 0.25, now 0.6, 0.33, 0.13, and a slightly smaller reach), and the flame glowed so hard it read as one flat yellow cone (less glow, a red belly, tongues that lean). **Not seen:** the Browser pane was hidden when this was made, so the fire has been checked as numbers only.

**Seen in a browser:** the grouped bag (eight top buttons, the body group's four pages on the second row) and the folded wear page. **Still open:** the hut rebuild in `threats.test.js` still stalls on some seeds (fibre in other smols' paws); strangers waiting at the edge can starve; the hand playtest of rounds two and three.

## 0.84 What v4.35.1 changed: a system that spoke too early switched itself off

Seen on the live 4.35.0 page: `deep.js` found a place on the title screen's island and called `SB.UI.toast` before the sky's screen had been built. `toast` read `el.toasts.children` of nothing and threw, and `ext.js` did what it is meant to do with a handler that throws: it switched deep.js's tick off for the rest of the session (no places found, no caves, no map events). `toast` now says nothing when there is no screen yet. Any plug-in system could have hit this; deep.js was the one that did. `tests/ui435.test.js` calls a toast before the screen exists.

## 0.83 What v4.35.0 changed: round three (the rows that needed the core files), and a new skin

After 4.34 the ledger had 178 rows left. Rounds one and two could not do them from a plug-in file: they needed the game's core files, or they were visual. Round three handed the core files out, one owner per group, seven groups at once. The ledger (`smol-brains-handover\FEATURE-MAP.md`) now reads **3,073 built or already there, 220 not possible (each with its reason), 1 open** (more languages: the language pack system is built and Spanish ships for the title, new-island and settings screens; the in-game lines are not translated). The row-by-row account is in `smol-brains-handover\builders\verdict3-<name>.md`. **What has and has not been seen in a browser is at the end, and most of this round has not.**

- **wardrobe** (`wardrobe3.js`, and bodies, voxel, pixel, meshes, funeral; 33 rows): what a smol wears is drawn on it (hat, cloak or vest, boots, charm, from `SB.Wear.on`), with dyes, trims, seasonal dress and a clothes stand; a looks page (headband and belt colours, a mark painter, sculpting a founder by dragging); scars and body paint; rounder and leaner bodies; gaits (waddle, limp, tired trudge, tipsy sway); a mood-coloured marker over your smol; the memory light's colour says how a smol died; building add-ons and skins, scarecrow looks, hats for pets.
- **minds** (`minds3.js`, hooks in creature, orders, mind, society, civ, economy, director, social, body, wilds; 32 rows): rules the tribe's own AI honours, set per smol on the "you" page: allowed areas, a queue of work marks, stockpile filters and fill order, forbidden items, food and treat rules, tribe food ways, a standing "keep making this" order, a named hut, hauler routes, sorting into matching chests; sight limited to facing (an island switch, off); a learned urge for bridges and doors; an alarm on finding a death; grumps kept off glowshroom ground; chosen moves between homes; moving the tribe's nest; a second village you run; an academy; luck; prices from a keeper's mood.
- **arrivals** (`arrivals3.js`, and strangers, title, worldgen, main, ui, cards; 24 rows): on the custom island screen, pick where the pod lands on a map of the island, how the founders are related, Pip's look and a starting critter; a flat island, a one-islet island, a far-shore start; guests who stay a few days, passers-by, a grump in disguise, special arrivals; an imported smol arrives at the edge through a sky gate; secrets on the title screen; a hidden crater valley, red shrubs and shelf mushrooms, icebergs; language packs. The default island and first day are unchanged.
- **motion** (`motion3.js`, hooks in possess, povhud, render; 30 rows): in a body, a glide with wings, a flutter-jump, a short hover, flippers, an aim lock, an over-the-shoulder camera, a follow shot on a thrown spear, slipping out of a grump camp; ladders, steps, a lift and a slide; a kick game. From the sky: a glow on things on the ground, a menu on what the hand taps, a cursor glyph, a claw game, sketching a plan on the ground, a turning model when you inspect a thing, skills as star shapes. Three small levels and two arcade games play on a slate (flat, top-down, canvas only). The grab tool's own input is untouched.
- **helpers** (`helpers3.js`, and animals, harvest, sites, threats, tricks; 22 rows): a walking clay helper fired in a kiln round a thought crystal, with chosen parts, that hauls, tends and sorts, needs firewood and mending; a broken ark helper to mend in half the wrecks, a swap machine in the others; stepping into a pet or a ghost-light for a short while; light-motes at the wrecks; six odd blobs that move in after hidden deeds; pets that learn words; an incubator; studying a penned grump; a sleep pod; a line that sleeps the winter; a carried-egg phase (off by default); an egg's sex and trait when you look at it; weeds and rocks creeping onto the home plot.
- **brains** (brain, genome, chemistry, surgery, words, audio, music; 20 rows): named lobes laid out by genes in the lab; pats, taps, bumps and the smell of food as inputs (appended, so old brains load unchanged); readable "situations"; weak links pruned and regrown in sleep; short and long-term weights; learning-rule, half-life, threshold and reaction genes, and a hidden second copy of each gene, all in a block at the end of a smol code that old codes do not have; firing one input by hand; your own word for any word; typing to the smols; syllable sets by tier and age; a sound bed per biome; eight songs of the map on top of the two albums. `tests/brains3.old.json` pins the old behaviour.
- **world** (`world3.js`, and survival, home, deep, town, dark, loot, bosses; 13 rows): light and nutrients per patch of ground, a smell field the smols follow, plants that flower, seed and die of age, over-felled land going barren and replanted land lush, a crystal that spreads through wet ground, a biome that changes with what is planted (`R.markGround` re-bakes the ground), a raft built in stages that becomes a house raft, stilt huts, a shaped crafting grid, a maze at a captain's lair.

**Not possible (2 new):** the names of smol brains v1's things (only the owner has them); voice commands (needs the microphone and sends audio to a server on most browsers; typing covers it).

**The skin.** One look for every panel, button, tab and toast (the last block of `style.css`): panels lit from above with a hairline inside the ink edge; anything you can press is a raised key with a lip that lifts when you point at it and goes down when you press; windows have a title bar and pop in; toasts carry a colour stripe for the kind of news. The bag and the hint boxes inside a body match. A card on the side is only as tall as what it shows (a campfire's three lines used to hang a panel down the whole screen).

**Seen in a browser:** the whole build boots with every system on and no errors; the default first day is unchanged; six days at 16x with no error and no handler switched off; the skin in the sky and in a body; the wear tab used by hand (a second hat takes the first one off); a hat drawn on a smol; the eighteen new buildings placed (ladder, steps, slide, raft pieces, stilt hut, pods, sky gate) render.

**Not yet seen, or known to want work** (the playtest pass, `smol-brains-handover\builders\PLAYTEST-LOG.md`): nearly every round-three feature used by hand; every new model up close; the new pages at phone size; the over-the-shoulder camera; the gaits in motion; the sounds and songs heard. The bag now has sixteen plug-in tabs: they need folding into fewer. Starvation: on some islands several smols starve in the first three days (it varies a great deal by island, with or without this round; five islands gave 18 against 11); the tribe's feeding needs a balance pass. The campfire's light floods the ground yellow and its flame is flat. New items share a bag icon.

## 0.82 What v4.34.0 changed: round two of the big build, a shape for every thing, one wear page

Ashton, Nov 14: "I am looking at the feature map right now, I need you to make sure you are building every single one of these features into the game." After 4.33 the ledger (`smol-brains-handover\FEATURE-MAP.md`) still had about 1,900 open rows. Each of the nine plug-in systems was handed its own open rows and built them, again in parallel, again one file each. The ledger now reads 2,898 there, 218 not possible (each with its reason), 178 still to build (each marked LATER with what it needs). **What has and has not been seen in a browser is at the end, and it still matters.**

**Round two, system by system** (the count is rows built this round; the row-by-row account is in `smol-brains-handover\builders\verdict2-<name>.md`):
- `dark.js` (333): sky events (aurora, star-fruit bloom, a fallen ark part), five more endings, new night beasts (gulper, chimera, noctol, spike hulk), the story lines that lead to each ending.
- `town.js` (222): ten kinds of caller each with their own stock, the waterwheel, worn roofs, promotions with reasons, elders' keep, paid song nights, the healer's long rest.
- `friends.js` (209): wild smols you can win over, the tribe's ways grown from what it keeps doing, evenings at the fire, kid wishes, chatting while eating or walking, founder looks in the mirror.
- `deep.js` (202): ore scanning from a lookout, pushing the gloom back with light, the haunted hall, biome keepsakes, the fallen ark hull with six rooms, windy scree, ashland places.
- `powers.js` (193): start styles, the tribe's way (hearth, hunt, star), peg leg and crystal eye, calling a smol back from the edge, grump numbers changed on a running island, a free egg when the island is empty.
- `harvest.js` (185): each rock gives its own thing, cut stone, orders locked to one smol, benches that speed machines, statues, the snapper crop, wobbly brew, gloom dust from a penned grump.
- `qol.js` (130): the family row, find anything by name, challenges per smol, recipe search, the health and egg lines on a smol's page.
- `fight.js` (90): "all thumbs" and callings, fire pots and stink pots, the crossbow, a body level bar, the crystal blade's thrown sliver, helm and moss cloak that pull or shed grumps.
- `animals.js` (58): pens that keep only so many, a fire lizard hatched from a warm egg, the chirper that repeats words, the finback that tows a drowning smol, the tusker, bug net and bug house.

The game now has 615 kinds of thing, 163 buildings and 11 plug-in bag tabs.

**Systems written at the same time claimed the same names.** Two files each made a "fisherhat" and a "furboots"; the second silently lost. `tests/collisions.test.js` now loads each system alone, records what it adds, and fails if two claim the same item, building, tool, node, tab or `SB.<name>`, unless the id is in its SHARED list (the same thing on purpose: copper vest, fur boots, wraps, tablet, thunder pot, drum, flute, banner, statue, star metal, the dyes, bee box, shell). Renamed where the meaning differed: fight's angler hat and fur greaves, qol's belt pouch, animals' minnows, deep's sky seed, dark's giant fluff and bug jelly.

**Sources and the 5 MB limit.** With round two in, the play folder passed 5 MB. The readable, commented source of every JS file now lives in `games/smol-brains/src/`. `node games/smol-brains/tools/strip.js` writes the copies the game loads into `play/js/`: every comment, the indentation, blank lines and the spaces the language does not need are taken out. Nothing is renamed or reordered, every statement stays on its own line, and strings, template strings and regular expressions are copied exactly. **Edit `src/`, then run strip.** The play folder went from 5.1 MB to about 4.3 MB. `tests/strip.test.js` fails if a copy is stale or does not parse. Tests read the readable sources by default (`tests/_src.js`; many of them search the code as text); set `SB_COMPACT=1` to run one on the packed copies. `tests/compact.test.js` is the proof that packing changes nothing: it runs two islands, every system loaded, 7,000 steps each, once on the sources and once on the packed copies, and every creature, item, building and event must come out identical.

**The look, so far.** A smol's card is now who it is, how it feels and the three things you do with it; needs, family, ideas and words fold under one line ("needs, family, ideas and words ▾"). The voxel smol has poses (`VX.pose`, `tests/pose434.test.js`): a lean into a run, a crouch, a reach, a slump when tired. Bag tabs from plug-ins show as one row of icons. The interface skin and better building models are the next release, not this one.

**A shape for every thing (`shapes.js`).** 193 kinds of thing had no model and lay on the ground as the same small ball in a different colour. Each now gets one of about 80 shapes chosen from its name, then its emoji, then whether it is food: a hat is a hat (wide-brimmed for a fisher's or farmer's), a brew is a bottle, a stew is a bowl, and so on for bows, arrows, blades, picks, boots, cloaks, charms, rings, dyes, seeds, trophies, scrolls, lanterns, keys, gems, ore, planks, eggs, figures. `meshes.js` asks `ME.generic` before it falls back to the ball. `tests/shapes.test.js` builds every shape and checks none is left a plain pebble.

**One place for what a smol wears (`wear.js`).** fight, harvest and powers each made things to wear and each kept them in its own slots, so a smol could wear three hats and there were three pages to dress on. wear.js moves nobody's state; it makes them agree: one head, one body, one pair of feet, one paw, two charms. Put something on, by any route (you, or a smol dressing itself), and whatever another system had in that place comes off. A thing two systems both know (copper vest, fur boots) counts for both once on. One bag tab, 🧥 wear: what is on, take it off, put on anything in the bag, make any wearable. fight's page and powers' gear page no longer list things to wear; harvest's keeps dyes, saved outfits and charm binding. `tests/wear.test.js`.

**Seen in a browser:** the whole build boots with no errors and every handler still on; the ark film and the first day are unchanged; a clean island at 16x reached day 3 with 25 smols (one starved on day 3), no system switched off; save and reload work. 79 of the new shapes dropped on the ground read as what they are (hats, boots, mugs, bowls, mallets, a key, a bone, a sack), no errors.

**Not yet seen:** nearly every round-two feature used by hand; most new items and buildings (many are an emoji on a plain shape); the new pages at phone size; the poses in motion; balance with every system on (dark's own stress check had to be relaxed from five survivors to three once the other systems were loaded). The wear tab has not been used by hand. These are the playtest pass, logged in `smol-brains-handover\builders\PLAYTEST-LOG.md`.

## 0.81 What v4.33.0 changed: the big build (waves 2 to 10 of the feature plan)

Ashton, Nov 14: "build every single feature in game-features.md into the game", then "keep going and don't stop, build everything first, then start playtesting and bug fixing." This release is the build. It adds ten new files and about 1,100 new test checks. It was built in parallel: one lead file of plug-in points, then eight systems written at the same time, each in its own file, and merged. **What has and has not been seen in a browser is at the end of this section, and it matters.**

**The plug-in points (`ext.js`).** possess.js, povhud.js, ui.js and main.js now call `SB.Ext` hooks (tick, options, damage, key, goals, vitals, bag tabs), so a system lives in one file and registers what it needs. A handler that throws is switched off for the session and logged, so one broken system cannot take the game down.

**Trade and treasure (`loot.js`, wave 2).** A chest beside every found site and every beaten captain's lair, opened by hand, with contents that depend on the place; light motes dropped by beaten grumps (let one go for sparks); heart-fruit (that smol takes 10% less from every hurt, up to five); buying and selling at the smols' own stalls from inside a body, with that smol's purse; pedlars among the strangers; captain trophies that hang in your home; "find somewhere new" now counts a found site.

**A real fight (`fight.js`, wave 3).** Hold to wind up a power swing; a bow and arrows; crouch and sneak for a first hit; brace to halve a bite; pit traps and snares; item quality from the maker's skill (shoddy to masterwork); crits, knockback and stagger; perks at fighting and hunting levels; a training dummy.

**Friends and characters (`friends.js`, wave 4).** Gift tastes for every smol, found by giving; hearts with every smol, each level unlocking something; weddings; pranks; a lifetime wish per smol; a trait earned by how it was raised; calling a smol and two-word commands; matchmaking; a festival on the first day of each season.

**Animals (`animals.js`, wave 5).** Taming with the right food and patience; named pets that follow, find things, warn and fight; a beaten grump tied, penned, fed and tickled until it turns; pens with kept animals that give something each morning; a rideable loper; treats, a brush, a collar, a whistle.

**The farm, the kitchen and the water (`harvest.js`, wave 6).** Fish kinds by water, season, weather and hour, with a timed hook; bait; hand-made garden beds with growth stages, watering, quality and giant crops; named dishes with timed buffs shown by your hearts; a drying rack, smoker, crock, quern, bee box, crab pot, scarecrow and sprinkler; a recipe book and a record of catches.

**The dark fights back (`dark.js`, wave 7).** Beating a captain changes the island; lesser named grumps with their own tricks and a bounty each; three storytellers to choose from, and mercy when the tribe is hurting; nine new event cards; a notice board of paid tasks; standing with the grumps, the far tribe and the wild smols; a light forge at a well of light.

**A bigger world (`deep.js`, wave 8).** Delves: a cave mouth you go down level by level in place, each depth with its own ores and dangers (an abstraction: there is still no real underground); new materials and twelve recipes; a raft; eleven kinds of place to find (lookout, stone ring, hot spring, hermit, shrine, buried cache, waystone...); a map tab with what is found; fast travel between waystones; treasure maps; weather events.

**Home and town (`town.js`, wave 9).** Twenty-two more things for the home with a comfort score that the sleeper feels; upgrading a lean-to to a hut, a house and a lodge; yard things; nineteen new buildings (well, inn, bakery, smithy, library, watchtower, shrine, storehouse, healer...) each with one real effect; keepers assigned to buildings; upkeep and repair; visitors and a guest book.

**The Lantern's powers, health and difficulty (`powers.js`, wave 10).** A tree of powers bought with embers in three branches (light, life, mind), cast from a body or the sky; blessing stones; words of power in three levels; a perk choice at skill levels; named sicknesses with causes, symptoms and crafted cures; potions and a buff system other systems use; difficulty presets, a peaceful mode, a one-life mode and accessibility options.

**The bag.** With eight new tabs the bag had twelve in four rows; the tab you are on keeps its name and the rest are icons in one row.

**What was checked, and what was not.**
- Each system has its own node test (friends 104 checks, town 103, dark 126, fight 142, deep 162, harvest 116, animals 124, powers 114, loot 52, ext 9) and all pass together on the merged build.
- In a browser, on the merged build: the game starts and the first day plays; all eight systems register and none is switched off; every bag tab opens with content; three in-game days ran at 16 times speed with event cards auto-answered and no error; the systems placed their stones, board and places on a new island; a save reloads with everything in it; chests were found and opened by hand (wave 2); the lodge's model renders.
- **Not yet seen in a browser:** almost every individual feature above being used by hand; most of the roughly sixty new building models and eighty-odd new items (items without art show an emoji icon and a plain shape); every new screen at phone size; balance of any of it. In one soak the player's first smol starved on day two after being pushed to a higher tier by the test: not yet reproduced or ruled out.
- Known rough edges the builders reported are listed in `smol-brains-handover\builders\built-<name>.md`. The next releases are the playtest: one system at a time, by hand, fixing what is found, then the look pass (models, animations, skin).

## 0.80 What v4.32.0 changed: fewer boxes, and a tutorial that points

Ashton, Nov 14: "there is way too many text boxes on the screen, the game doesn't walk you through the tutorial well enough, it should be immersive." Wave 1 of `smol-brains-handover\FEATURE-PLAN.md`. Before changing anything, every piece of text that can be on screen was counted: about eleven boxes on the first frame in Pip's body, eight to ten on the first frame back in the sky, and the same instruction in up to three places at once.

**In a smol's body: one guide line and a marker**
- The quest panel was a title, five steps and a tip box. It is now **one line**: the step you are on. The how-to shows for the first nine seconds of a step, then folds away; tap the line to read it again.
- **The marker says what it is for** ("find something to eat 5m"). It used to be a diamond and a distance.
- The night's countdown is on the body's clock ("night in 0:45"). It was only shown from the sky, where you weren't.
- The "you are Pip" card no longer sends you to "the list on the right"; it says follow the marker. The card with your own name and tier is put away for the first day.
- **Said once.** Eating fired three boxes with the same sentence (a banner, a beat and the tip); the beat is gone.
- **Nothing wrong.** The first night told you to "left click it with a weapon" when only light works that night; it and the ordinary nightfall lines are silent on the first night, and the weapon line is silent for captains and night chases, which have their own banner.

**In the sky: the coach speaks alone**
- After the first night the coach's seven lessons shared the screen with the goals list (eleven lines), your smol's chip, the day card, a parade of held "firsts" and general chatter. **While the coach is teaching it is the only voice**: firsts and embers still land, everything else waits. The goals list comes in on the last lesson, which is about it.
- **The coach points.** Each lesson is one thing to do in two short lines, with a bouncing arrow on the smol, the food or the card button it is about, and the camera brought to it. If there is no food by your smol, an apple is put down beside it. The tricks button glows on its lesson.
- The lessons' words are cut to about a third (the first was a 520-character paragraph).
- Last night's firsts come back as one line with a count.
- An island loaded part-way through the lessons gets its coach back (it used to vanish for good).

**The goals list is one line**
- Folded, which is now how it starts, the list is the next thing and a count ("eat a meal as a smol · +7"). Tap it for today's jobs, the chapter and the rest.

Seen in a browser at desktop size: the first frame in Pip's body, the tip folding, the first frame back in the sky, and each lesson with its arrow. Also seen at phone size (the coach card, a first landing above it, the arrow). Nobody new to the game has tried it: that is the real test.
- Tests: `guide432.test.js` (new, 23 checks).

## 0.79 What v4.31.0 changed: a second album, "the long way home"

Ashton, Nov 14: "create a new song album for the smol brains game, then implement that new album into the game, ontop of the original, not a replacement." This is the first release of the widened goal (see `smol-brains-handover\FEATURE-PLAN.md`).

- **Sixteen new songs**, written by hand in the same notation and played by the same live band (no audio files, nothing added to the download but text): the lantern wakes, pip's first steps, a roof of leaves, home is a small light, sticks before dark, the pod on the hill, gloom, dodge then swing, what the embers said, berry patch morning, the chest by the door, murk, snow on the hearth, every smol looks up, the long night, the long way home. They are about the game the island became: waking in a pod, a first roof, a home, the three captains, the beacon.
- **The first album is untouched.** All twenty of "songs for small minds" still play; the island now picks from thirty-six. A song is kept off repeat for ten picks (was six).
- **New voices:** kalimba, tin whistle, cello, a glass pad, a small choir, and a tom. **New scales:** lydian, mixolydian, phrygian, harmonic minor. **New ways for the band to play:** drone, pulse, march, lull, roll.
- **A captain's fight has its own music.** In a duel the danger layer gives way to "dodge, then swing"; an ordinary chase keeps the old one.
- "gloom" only plays while you are inside a smol, at night. "every smol looks up" waits for thinkers, like "the beacon" does.
- **The jukebox lists both albums** by name, each with its own heard count.
- Checked by rendering every new song silently in a browser: each measures in the same loudness band as the first album (none silent, none clipping harder than the old ones). Nobody has listened to them with ears yet: that is Ashton's to judge.
- Tests: `album2.test.js` (new, 22 checks); `music.test.js` unchanged and passing.

## 0.78 What v4.30.0 changed: a home of your own, and captain fights that work on foot

Three things were still open after the phone pass: a home you make by hand, the bag screen, and a captain fight played with real walking instead of a script that teleports. All three are in this release.

**A home of your own** (`home.js`, the Sims and Stardew side)
- **The first hut, house or lean-to you finish with your own hands is your home.** Or look at any finished one in a body and choose "make this your home" (or "move your home here": what's in it comes with you).
- **You fit it out by hand, at the door, out of your bag.** Four things, each of which does something:
  - a bed of leaves (4 leaves): wake at home at dawn with every heart back, and sleep there whenever it's dark;
  - a chest (4 sticks, a vine): twelve slots that stay at home, for you and for whichever smol you are next;
  - a hearth (4 rocks, 2 sticks): a grump hunting you gives up at your door, and in a night chase home counts as light;
  - a berry patch (2 seeds): berries waiting every morning (in the chest if there is one).
- The bag has a **home** tab: what the home has, what the next thing costs against what you carry, the chest, and what you can put away. Look at your home and the button is "open your home".
- At night the marker leads to your own home unless another roof is much nearer. The goals list asks for a home once the tribe has hands, then for the next thing it lacks.
- It lives with the island, not the smol: an heir, or any smol you step into, finds the same home and the same chest.

**The bag, tidied**
- It said the same thing three ways and told a blob about bags it can't have. One line of how-to, shown only to a body it applies to; the heading is "Pip's mouth", "hands" or "bag" as the case is.

**Captain fights, walked** (found by fighting Gloom with real movement: forward, turn, swing)
- **The starting weapon could not reach.** A captain's own body stops you about 2.1 from its middle and a swing reached 2.15, so most swings were "too far". Lost twice, landing 0 and then 4 hits against 4 bites. A swing at a captain now reaches 0.9 further.
- **No step could dodge.** The pounce tracked you until the frame it jumped, and a smol walks too slowly to leave its reach in the 1.5 s wind-up: backing away and side-stepping were both bitten every time. A captain now **commits**: in the last beat of its wind-up it fixes on where you stand and jumps there, so one step aside in that beat makes it miss, stumble, and take double hits. The beat is 0.7 s for Gloom, 0.55 for Murk and 0.45 for the Long Night, so each asks for a later, sharper step. Ordinary night chases are unchanged.
- Gloom's bite is a little softer (it is the first boss).
- After the change, on foot with a rock-on-a-stick and stepping aside: Gloom beaten in about 30 seconds with no hearts lost. Standing still and trading blows it still wins against the starting weapon, which is right: bring a club, or learn the step.
- Tests: `home.test.js` (new, 34 checks), `duel430.test.js` (new, 10 checks).

## 0.77 What v4.29.0 changed: the whole road on a phone

The game was played at phone size (375 wide, then 340 and 320) from a new island through all three captains to lighting the beacon and the ending film. The fights, the lairs and the ending all worked; the screen around them did not.

**What a phone could not see or reach**
- **The menu button was off the right edge of the screen.** Since the ember counter joined the top bar, the bar was 78 px wider than a 375 px phone, and the skip and menu buttons were the ones pushed off. The bar now fits down to 320 px (the word "embers" drops, the chips tighten).
- **The story's next step was hidden.** On a phone the goals list hides everything under "today", which is where "Gloom lairs to the east" and "the spire is up: light the beacon" were. Those lines now lead the list, above today's jobs, on every screen.
- **The menu's twelve tabs were a sideways scroll** with no sign it scrolled: goals, settings and help were out of sight. On a phone they are a three-wide grid. The order is now what you came for first (goals, smols, family, ideas), the reference books after, settings and help last, and the menu opens on goals.
- Your smol's chip sat on top of the map, and toasts sat on both. The chip is beside the map and toasts sit above them.
- In a body: messages landed on the action buttons, and the chase/duel banner landed on the guide. Messages moved above the crosshair; the guide hides while something is after you.

**Words**
- A captain was "grump" on the target label and "hit the grump" on the button. They say Gloom, Murk, the Long Night.
- Phone hints said "press F", "(B)", "(1-9)" and "hold shift". They say what to tap.
- The spire's name was still "the big thought" in three places (so an ember read "a first the big thought" and a smol was "using the the big thought"). It is "the beacon", and the doubled "the" can't happen.
- With the beacon waiting, the in-body marker pointed at a tutorial stick. The beacon wins.

**Measured, left alone**
- Standing still and swinging with the right weapon, a script glued to each captain beat Gloom in 7 hits, Murk in 14 and the Long Night in 19, taking one or two bites. A hand does about a third of that rate (walking back in after each knock-back), which puts the fights at roughly 20, 25 and 35 seconds: left as tuned in 4.28.
- Tests: `phone429.test.js` (new, 18 checks).

## 0.76 What v4.28.0 changed: the road to the lair, a fairer fight, and an ending you light yourself

An island was grown the normal way to day 3 (a tribe, six ideas, Gloom awake), and a tribe smol was walked from the nest toward the lair and fought Gloom twice, with the weapon a new tool-user really has (a rock-on-a-stick).

**The road**
- **In a body there was nothing pointing at the lair.** The goals list said "to the east" and the lair was 112 steps away. When nothing else needs the marker, it now points at the next captain's lair with its name and the distance.
- **A lair could be somewhere you can't walk to.** They were placed on dry ground, but not on ground joined to the nest. Each lair now needs a walking path from the nest (`World.findPath`), and on an island from 4.26 or 4.27 a lair nobody has found yet moves if it had none.
- The "you are …" card sat on top of the bag when you opened it. Opening the bag closes the card.

**The fight**
- **Losing looped.** Beaten down inside the lair's range, the duel started again at once: thirteen times in a row. A captain now leaves you alone for fifteen seconds after a duel ends, and won't start on a smol with under half its hearts ("eat, rest, and come back").
- **Too long for a first boss.** With the entry weapon Gloom took 24 hits; it now takes 14 (7 with a club). Murk and the Long Night came down in step (15 and 27 good hits, were 21 and 36), with slightly softer bites. The second fight ran 24 seconds and ended with Gloom on its last sliver and the smol beaten: close, which is right for trading blows without dodging once.
- **Dodging now pays.** Get out of the way of a pounce and it stumbles for about two and a half seconds; hits landed then count double, and the banner says "it missed! hit it now: double". (After it bites you it only glares: no bonus for being bitten.)
- The bite message during a duel said "run for the nest". It says what to do in a duel.

**The ending**
- **You light the beacon.** When the smols finish the spire the game no longer ends by itself: a toast and the goals list send you to step into a smol, walk to the spire (the marker points at it) and light it. That is the ending, and it knows whose hand it was. If nobody comes for a day the smols light it themselves at dawn, and an island with nobody watching (headless, or caught up offline) lights it at once as before. "Waiting" is read off the world, so it survives a save.
- Tests: `beacon.test.js` (new, 13 checks), `bosses.test.js` (now 52).

## 0.75 What v4.27.0 changed: the captains guard the ending, and what a live run showed

After 4.26 went live, a fresh island was run on the real site through day 4 with every toast, window and event logged. It held together (your smol passed from Pip to an heir, the daily jobs rolled over, Gloom woke with the first tool-user and was found the next day, no errors), and it showed four things:
- **The beacon now needs the three captains.** The spire is the light they stole, so nobody starts it until all three are beaten (`Bosses.gates`, asked by `Ideas.buildNeed`); the goals list says "the beacon needs the light the three grump captains stole: beat them · n/3". This makes the fights part of the story's spine and the ending something you earned by hand. An island that had already started its spire carries on, and an island too young for captains isn't gated.
- **"day 2" on day 3.** The dawn card counted from the tally's own day, which fell a day behind after the first night. It shows the day it is.
- **"Rare hatch" wasn't rare.** The big banner (it covers the goals list for twelve seconds) came up four times in one day. It's kept for the really special hatches; a plain rare is a toast you can tap to go and see.
- **The pod logs told the old story** (a warship after "the thought engine", "the big thought is a signal"). They now tell this one: grumps that can't stand a light, the long sleep, the three captains sitting on what they stole, and the beacon.
- Tests: `bosses.test.js` (now 46 checks).

## 0.74 What v4.26.0 added: the captains of the dark (build-order steps 4 and 5, the Terraria side; `bosses.js`)

The tool ladder was already there (paws, a rock-on-a-stick, stone, copper, iron, a sword) and so was the duel (a grump winds up, pounces, reels). What was missing was a reason to climb the ladder and somewhere to take it. Now there is one, three times.
- **Three grump captains**, dug in at lairs far from the nest, a third of a turn apart: **Gloom**, **Murk** and **the Long Night** (the one that caught the ark). They don't raid; they wait. The same island always puts them in the same places (their own dice, seeded from the island).
- **You go to them, in a smol's body.** Within nine steps of a lair it comes for you: the night-chase duel, with a banner that names it, shows how much fight it has left, and says when to move ("it's about to pounce!") and when to hit ("it's reeling: hit it now!").
- **Each one's hide turns a weaker weapon**, which is what the tool tiers are for: Gloom needs a club, a spear or any real tool (paws and a poke stick bounce off); Murk needs a proper weapon or an axe (a rock-on-a-stick bounces off); the Long Night needs iron. They take 12, 21 and 36 good hits (retuned in 4.28: 7, 15 and 27). Hitting with the wrong thing tells you what it needs.
- **Walk away and it lets you go** (26 steps from its lair), and mends in about twenty seconds. **Lose** (down to under a third of your hearts) and you crawl away alive. **Win** and the light it was sitting on comes home: 2, 3 and 5 embers and 15, 25 and 40 sparks, and the dark around its lair lifts on the map.
- They wake as the island grows the hands to fight them (tool-users, the tribe, builders), one at a time: the next only after the last has fallen. The next captain is the first line under "also" on the goals list (which way it lies and what to bring), a smol wandering within forty steps finds the lair (a toast you can tap to fly there), and beating one gets a card.
- Tests: `bosses.test.js` (new, 42 checks).

## 0.73 What v4.25.0 added: your smol (build-order step 3, the Stardew and Sims side; `mine.js`)

The honest gap after the new opening: you play a whole day as Pip, then rise to the sky and Pip becomes one dot among many. Stardew and The Sims work because there is one small person whose day is yours, and a short list of things to do today.
- **Your smol.** One smol is yours: Pip, from the morning after the first night. It has a chip above the minimap (its face, how it feels or what it needs most, its hearts); tap the chip to go to it, 👁 to step in. **Stepping into your own smol is always free**, so playing by hand is never rationed. Any smol can be made yours from its card ("☆ make it mine").
- **Heirs.** When your smol dies the name passes on: to its child who trusts you most, else its partner, else whoever trusts you most. The line (Pip → … ) is kept. There is always a "you" down there, and a family behind it.
- **Hearts.** How much a smol trusts the sky was a hidden number (orders.js); it's now five hearts on every card and on the chip, the way Stardew shows friendship. Tickles, answered prayers and granted wishes fill them (a granted wish is now worth half a heart); taps and ignored prayers empty them.
- **Today's jobs.** Three small jobs at the top of the goals list every day: one done with your own hands in a body (eat a meal, pick up 3 things, make something), one of teaching (reward 3 times, teach a word, finish a trick), one for the island (a hatching, a wish, somewhere new, an idea, a prayer, a building). 2 ✨ each and 4 ✨ for all three. They change every day, fit what the island can do, and are picked with their own dice (seeded from the island and the day), so the island's own random stream is untouched. Tap one to see how. With jobs on the list, the chapter shows its next two quests and "+N more in ☰ → goals".
- **"waking the island…"**: building or loading an island now says so instead of showing a black screen.
- Fixed from 4.22: tapping a toast to fly to a smol flew there but selected nobody.
- Tests: `mine.test.js` (new, 32 checks).

## 0.72 What v4.24.0 changed: a first pass at the clean-up (owner: "beautify the game, make it cleaner")

The first slice of build-order step 2 ("the look and the clean-up"); the rest of that step (menus, the bag, phone passes) follows.
- **The smol card puts what you can do first.** 👁 possess, 🎓 tricks and 💬 talk are one row right under the smol's mood. They used to be at the bottom of a long card, below the fold on a laptop. 🧠 brain, genes, story, card, code and family stay at the bottom.
- **Every need bar has a word on it** (hungry, sleepy, bored, lonely, health…). They were seven coloured bars with a tiny icon each.
- **A toast diet.** With more than six smols, "X is now a kid / teen / adult / elder" stays in the chronicle and off the screen, and so does each new branch of the family tree once there are more than four. Evolution to a new tier still gets its card.
- **The end-game is "the beacon" everywhere** (the last chapter, its quest, the idea, the milestone, the goal line), to match the story; it was "the big thought".
- The founders' naming window says "two more sleepers climbed out of the pod" (it said "the last smols"). The landing title's two lines sit on a line each.
- Tests: `clean424.test.js` (new, 9 checks).

## 0.71 What v4.23.0 changed: wake up (owner: "the beginning of the game is weird and hard to understand and not fun ... a whole revamp on the lore and story ... on the cutscenes, honestly, none of it makes sense to me")

**The story, rewritten.** One premise, in plain words: the ark *Lantern* carried the last smols, asleep in pods, toward a new home. Grumps live in the dark between the stars and hate light; the ark was the brightest light there was, so they caught it above this island and it broke apart. **You are the Lantern**, the ark's guiding light: the ship is gone, so you have no body, but you can lend your light to a smol and act with its hands. The long sleep took everything the smols knew (that's why their brains are smol); every memory they win back is an ember that makes you burn brighter. The goal is a beacon tall enough to call the other arks. The sleeping giant ("the Hollow"), the wish and "the last spark" are gone from everything a player reads.
- **All 16 lore pages** are new (`embers.js`): waking, the Lantern, the sleepers, why brains are smol, the dark, what grumps want, the old home, the night it broke, the pods, Pip, the island, the beacon, names, the others, hands, somewhere green.
- **Every film's captions** are new (`intro.js`, `lantern.js`): the ark film, dawn, the Lantern's three stages, the first baby, the first grump, Pip grown up, the Lantern whole, the ending. The line you can read is now the big one; what the smols say sits under it, small, in quotes.
- **Redrawn**: the mound at the foot of the hill is the wreck of the ark (its windows come on stage by stage, and its great lamp sends a beam up in the last film) where it was a giant's brow and eye; in the last film the grumps run for the dark where they used to turn back into smols; the first-grump film shows eyes opening in the dark ahead of a smol who wandered from the fire, not a smol turning into one. The voxel look no longer draws a giant in the sea.
- The help page, the ending card, the sky's first lesson ("who you are") and the landing title all tell the same story.

**The ark film had not played for weeks.** A variable inside it was named `warp`, which hid the function of that name, so the film threw on its first frame and the game went straight on to the next one. Nobody had seen the ark, the grump ship or the pods scatter since the opening was shortened. It plays now, at about 16 seconds (it was meant to be 12, which was too fast to read).

**The first day is played, not watched** (`firstnight.js`, rewritten). The old opening was a second film, then a sky view where you tapped a pod, dragged Pip to a bush, waited five minutes and pressed "lend your light". Now the ark film ends and **you wake as Pip, in Pip's eyes**, with one list on screen:
1. **find something to eat** (a marker on the nearest bush; a hungry little body now eats with the plain click)
2. **wake the others** (walk back to the pod and knock on it: two knocks, and the two founders climb out)
3. **gather 2 sticks** (walk over them; the sun starts to drop)
4. **light a fire at the nest** (carry them home)
5. **make it to morning** (dusk falls in 18 seconds, a grump comes out of the trees; by the fire it turns and runs, away from it you have to lead it there, and with no fire at all three bites bring the others running with one)

Then dawn, the first memory ember, and you rise to the sky, where the guide starts with who you are. The day moves when you do (the clock waits at each step), "skip" on the list goes straight to morning, and if you let go of Pip a "step into Pip" button puts you back; left alone, Pip muddles through the daytime steps by itself. An island saved in the old opening carries over to the matching step.

- Tests: `firstnight.test.js` (rewritten, 53 checks), `story423.test.js` (new, 19 checks), `playtest422.test.js` and `lantern.test.js` brought up to date.

## 0.70 What v4.22.0 fixed: holes found by playing a fresh island by hand (owner: "play test the game yourself, find all the holes in the gameplay ... go through the whole game just like a player would")

A fresh island was played from the title screen: the opening, the pod, Pip's first meal, the free first day (a trick taught, a body lent), the first night, dawn, then days 3 to 10 at speed with every toast, window and goal logged, a builder's night in first person, and the same screens again at phone width. Hands-off islands were also run headless for two weeks. What that found, and what changed:

**The first night**
- **It could get stuck for good.** Let go of Pip mid-chase (Esc) and the grump wandered off; lend your light again and there was nothing to chase you, so lighting the nest never ended the night. Now a new grump finds Pip when you come back, and a lit nest with nothing chasing wins the night (`firstnight.js`).
- **Loading a save made mid-night showed no timer and no "lend your light" button**, so the night could never end. The first-night screen now rebuilds itself on the first frame after a load. A save made mid-chase goes back to "lend your light", and one made during the dawn film wakes up in the morning.
- **A chase that ran past midnight skipped a whole day**: dawn landed on day 3, the "day 2" morning note disagreed with the clock, and a third of the first season was gone. Dawn is now always the next morning.
- **The free first day was silent.** From "ok, let me play" until dusk (about five minutes) there was no goals list, quests didn't count and every toast was swallowed, including the "tickle now!" cues of a trick you were teaching. The goals list, the quests and the toasts now open with the free day (`FN.free`, `Quests.open`) and stay open after the first night whatever step the guide is on.

**Films and windows**
- **The island kept running behind story films**, at whatever speed you'd set: a smol hatched and evolved, unseen, during the dawn film. The island now waits while a film plays (`main.js`).
- **The "night falls in" timer and the raid/storm chip floated on top of every window**, covering two tabs of the menu. They now sit under windows. An armed miracle's tag no longer hides behind them.
- **Stale windows**: "a grump grabbed X!" could arrive hours after X was gone, and "X is sick" after X was well. A story card is now asked whether its moment has passed when its turn comes (`storyCard(..., still)`), and is kept for next time if it has.
- The guide's card no longer sits on top of the miracles, the goals list or the word book's toasts.
- On a phone the timer and alert chips sit under the goals list (it's as wide as the screen there) and the timer stays on one line.

**In a smol's eyes**
- The "you are …" card was a dark curtain down the whole screen (it shared a class name with the opening film). It's a card again.
- **Sniff and walk (G, G) ended with your nose inside the bush.** It stops a step short.
- **After shaking a bush, F tugged leaves off it** while the berries you'd shaken loose lay at your feet. F now picks up what you just shook down.
- Nibbling a bush while possessing a smol now counts for "eat something while possessing a smol".

**The island**
- **Tap a toast to fly there.** Toasts about a smol (drowning, a tantrum, a fight, a prayer) carry a ➜ and take you to it. Before, a toast named a smol and left you to hunt for it.
- "X is drowning!" only fires for a smol that has been in deep water for three seconds, not for every splash (five alarms in four days, no drownings).
- **The town that emptied.** Hands-off islands boomed to their cap around day 6, then fell to about ten smols as that generation aged out together, lost their most evolved families and stayed there. A headless look at one such town found ten to sixteen grown-ups, forty pairs who could have married, and one or two couples. The cause was in courtship: it takes two or three good moments with the same smol, but the count lived in `court`, which is whoever you last had a moment with, so in a town of twenty a hug with anyone else wiped it and hardly anyone got to three. The moments are now counted per pair (`courts`, kept for `Social.COURT_KEEP` = 15 minutes, dropped when they become partners). Three smaller changes go with it. A stranger nobody answers now stays when the tribe is short of couples and well under its room (`Strangers.shortOfCouples`: fewer than three couples and under 60% of the cap), not only when the band is under eight; three in four used to be sent away while nobody was looking. A tribe couple's egg gap follows the room there is (`eggGap`: under a quarter, 45% and 65% of the cap, where it used to be under 6, 10 and 14 smols), and love grows on the same scale (`loveK`). A full town is as slow as before.
- The home screen's "new:" line was two versions old.

- Tests: `playtest422.test.js` (new, 51 checks).

## 0.69 What v4.21.1 changed: the intro comes with every new world, and volume sliders (owner: "I don't want there to be a 'watch the intro' button on the home screen. I don't want it to be on the settings page. If you create a new world, you get the intro no matter what")

- **Every new world plays the intro.** "Play now", a custom island and the site's tap-to-play all open with the ark film and the Last Lantern, every time, not only the first time on a device (`SB.Lantern.shouldPlay` now always says yes). Its skip button stays. Continuing or loading a saved island doesn't play it, and new game+ still doesn't either (that's the same family carrying on, not a new world).
- **No replay buttons.** "🎬 watch the intro" is gone from the home screen, "🏮 watch the opening again" from settings, and "🏮 watch the last lantern (the intro)" from the help tab. "Watch the ending again" stays.
- The "play now" line on the home screen now always says it starts after a short story.
- **Sound and music sliders** (owner: "there should be a slider for sounds ... just create one for now for the regular sound and music sound"). The home screen's settings and the game's settings (now headed "sound & music") each have two sliders, 0 to 100% in steps of 5: **sound** (every effect, the smols' voices and the rain and wind bed; `SB.Audio.setSoundVolume`, saved as `smolbrains-sound`) and **music** (the soundtrack; it replaces the off/quiet/normal/loud buttons). Letting go of the sound slider plays a short pop at the new level. Both are remembered on the device. The site's sound on/off button still mutes everything.
- Tests: `lantern.test.js` (play now still plays it after the first time; no intro button on the home screen, in settings or in help), `volume.test.js` (new, 11 checks).

## 0.68 What v4.21.0 added: brain surgery (owner: "Continue doing all the work you have planned to make this the best game ever!")

The last NeuraQuarium idea: let the player reach into a creature's brain and change it. New file `surgery.js` (`SB.Surgery`).

- **A "brain surgery" button in the brain viewer** opens a window listing the smol's instincts as plain sentences ("when 🍎 hungry and it sees 🔥 fire → 👣 come"), strongest first, each with its strength and how the net treats it right now ("does it", "sometimes", "rarely": the action's rank among everything it could do in that moment).
- **Operations:** make an instinct 20% stronger or weaker, cut it out, add a new one (pick a feeling, a thing and an action; actions its tier can't do yet are not offered), or make it care more or less about a feeling (that drive's weight in its rewards, 0.3 to 1.9, steps of 0.25). Up to 16 instincts.
- **It really rewires the net.** After each operation the brain rehearses the changed instinct 220 times, the same "dream" that wires instincts in before hatching (a cut rehearses it at zero). In tests an added instinct moves the net's answer for that moment from about 0.2 to 0.5, and cutting it brings it back to about 0.
- **Its kids inherit it.** Instincts and drive weights live in the genome, so they pass down through eggs like any other gene.
- **Costs:** 4 sparks per operation (it follows miracle heat and the 8x/16x doubling, like miracles), at most 3 operations per smol per day, and it comes out sleepy. Not while you're inside it, not on eggs or grumps.
- No dice added to the seeded sim: the retraining uses its own `SB.rng` seeded from `Math.random`, and a test spies on `game.rng` to check that no roll is made.
- Tests: `surgery.test.js` (new, 24 checks).

## 0.67 What v4.20.0 added: a child next to its parents (owner: "Continue doing all the work you have planned")

The second idea taken from NeuraQuarium (players loved comparing a fish with the fish it came from), plus two leftovers from the 4.17 playthrough list.

- **Vs its parents.** A smol's card, under "genes & more", now has a "vs its parents" section: its parents' names (✝ if gone), then up to six chips for the genes that moved most from the parents' average (legs ▲ 12, bravery ▼ 20 …), and a line naming anything it has more or less of than either parent. On the evolution gene bars, a pink mark shows where its mother sat and a blue mark its father. The comparison covers the 15 evolution genes and 11 everyday ones (bravery, sociability, playfulness, grumpiness, obedience, chattiness, affection, curiosity, size, walk speed, toughness).
- **The family tree keeps genes.** Every new smol's family record now stores those 26 genes as a 52-character string (`gx`, `SB.Genome.snap`/`unsnap`) and its sex, so a child can be compared with a parent who has died. Parents gone before 4.20 have no snapshot; their card says so.
- **The drowning card let go.** A smol dragged out of deep water by the hand never paddled ashore, so its drowning timer was never reset and the "is drowning!" card and scared face stayed on it while it stood on land. The timer now resets whenever it is out of deep water.
- **The pod card moves aside on laptop-height screens.** The "tap the crashed pod" card now moves to the top-left on any window up to 680 px tall (it was 520 px), so it never sits on the pod.
- No dice added to the seeded sim. Tests: `family-genes.test.js` (new, 16 checks).

## 0.66 What v4.19.1 fixed: the bag fits a phone (owner: "Yes, fix it")

- In a window under 700 px wide (a phone, or a narrow desktop window) the bag now stacks: slots and hotbar on top, then the make, build and you tabs, then the tab's content. Nothing sits off to the side, so there is no sideways scrolling; the bag scrolls up and down, and the tab buttons stay pinned while it does. Slots shrink to fit 9 across. Wider screens look the same as before.

## 0.65 What v4.19.0 added: the island after dark (owner: "Yes, batch 2")

Second batch of the survival pass. Everything here lives in one new file, `wilds.js` (`SB.Wilds`), and only matters while you are inside a smol.

- **How hard the island bites.** Three settings in the bag's "you" tab: cosy, normal and harsh (`game.settings.wilds`, normal by default). They scale how fast hunger and thirst run (0.75x, 1x, 1.3x), how much a bite hurts you (0.7x, 1x, 1.4x), how dark the night gets and how many prowlers a night can send (0, 1, 2). Only the smol you are in is affected; the rest of the island runs as before.
- **True darkness.** A night seen through a smol's eyes is properly dark now (the god view is untouched). A held torch throws warm light about nine tiles around you; a lit fire or any roof also counts as light. Blobs and critters, who can't carry a torch, get half the dark. A chip under the vitals says "in the dark" or "torch lit". Never during the first night or a night chase.
- **The prowler, a second night creature.** Stand in the dark for 25 seconds as a tool-user or better and a small, fast grump comes for you (a warning comes at the halfway mark). Light sends it off: hold a torch, reach a fire or step under a roof. It gives up after 45 seconds or at dawn, and there is a minute of quiet after one leaves. Unlike a scout grump, its bite can take you all the way down. It only appears after the first grump lesson is done, and never on cosy.
- **A bed.** Sleep under a lean-to, hut, house or hall, or build one, and it becomes your bed. If you fall, you wake there at half health with your pack left where you fell and a marker pointing back to it. With no bed, a fall still sends you back to the sky as before.
- **A survival run, the survival-only mode.** "Start a survival run" in the "you" tab counts the days you last in one body. The difficulty locks while it runs and a chip shows the day. It ends when you go back to the sky; on harsh there is one life, so a bed will not save you. Your best run and the setting it was on are kept with the save.
- **An iron tier.** The last chunk of an ore vein, mined with a pick, gives iron ore. Ore and a log at a kiln make an iron bar (needs the smelting idea). Iron makes an iron axe, an iron pick and an iron sword: they chop, dig and hit harder than stone and last much longer. Five new item kinds with meshes and icons.
- No dice were added to the seeded sim (the prowler's spot uses `Math.random`, and nothing changes worldgen or the ideas list). No new sounds: the existing grump, chime and achievement files are reused.
- **Not yet:** a look at the bag on narrow phones (the right-hand tabs sit off to the side and need a sideways scroll), and from NeuraQuarium brain surgery and parent/child trait comparison.
- Tests: `wilds.test.js` (new, 70 checks).

## 0.64 What v4.18.0 added: a body worth keeping alive (owner: "make the survival aspect really thorough… lots of fun features")

First batch of the survival pass, plus the first thing taken from NeuraQuarium (a neural-net fish tank on itch.io whose players loved watching populations and brains change over time).

- **A body (`body.js`, new, `SB.Body`).** A possessed smol now has more than hunger, warmth and pep. All of it lives on the creature (`c.body`), so it saves and stays with that smol.
  - **Thirst.** A fifth row on the vitals, a water drop. It drains in about 7 minutes; drinking from any pond, river or the sea fills it. Dry (over 70%) caps your pep, parched caps it hard.
  - **Wet fur.** Rain with no roof, or wading deeper than your knees, soaks you. Wet fur loses warmth faster. A fire or a roof dries it.
  - **Wounds.** A grump's hit leaves a bruise (less pep for a while). Every third hit is a cut, which bleeds a little until you bind it with leaves (hold leaves, right click), eat a herb or drink a potion.
  - **Cosy mornings.** Sleep through a night under a roof and you wake cosy: hunger 25% slower and pep back 50% faster for most of the day. Sleeping in the open gives nothing.
  - **Status chips** under the vitals say what is wrong (or right) in one word: wet, cut, bruised, sick, cosy.
- **Nine skills that grow by doing:** chopping, mining, foraging, crafting, cooking, fishing, hunting, fighting and running. Ten levels each, 5% a level. Chopping and mining cost less pep and sometimes spare the tool; foraging is quicker; crafted tools last longer; a cook sometimes gets a second helping; fishing and spear throws land more often; fighting hits harder; running costs less pep. A level-up says what it gave and plays the existing chime. No dice were added to the seeded sim: perks that "sometimes" happen use a counter, not `game.rng`.
- **The night flies by.** A possessed smol asleep at night now sleeps until dawn and the clock runs at 8x while it does. A grump within 11 tiles wakes you at normal speed. Never during the first night or a night chase.
- **The paw journal.** A third tab in the bag, "you": how the body is doing with a plain tip for each problem, the nine skill bars, and a running tally (trees felled, rocks broken, meals cooked, fish, hunts, grumps chased off, safe nights, cosy mornings).
- **Population over time (`days.js` census, `ui.js` drawPop).** Every dawn the island is counted by tier and kept for 120 days. The evolution tab draws it as stacked bands, one colour per tier, so you can watch blobs give way to critters and tool-users. Saved with the quest board.
- **Not yet (next batches):** a survival-only mode, true darkness and torches, a second night creature, waking at your lean-to after a death, an iron tier, difficulty presets, and from NeuraQuarium brain surgery and parent/child trait comparison.
- Tests: `body.test.js` (new, 42 checks), `days.test.js` (the census).

## 0.63 What v4.17.0 added: the whole-game logic pass, and little moments (owner: "find all the weird things… really fun and detailed")

Four audits (controls and possession, the creature sim, story and text, village and world) plus a start-to-finish play. What changed:

- **Little moments (`social.js` charmTick).** Friends greet each other by name and get a "hi" back, yawns catch, sleepers mumble their dreams, kids show off to a parent, elders tell fireside stories at night and smols have opinions about rain. Cosmetic only: near the camera, own dice (`Math.random`), so the seeded sim is untouched. The dawn card opens with the morning's weather.
- **Story order.** The pod coach card no longer covers the pod (and on a landscape phone sits top-left). No idle tips before the pod opens. The first night no longer counts as a possession, doesn't finish the "see through a smol's eyes" goal early, and its ember text matches whether Pip lived. `prayer1` moved to the builders chapter (prayers need a tribe). The spire needs the big thought on both paths. The founders' farewell only fires for the real pod twins. No "growing up" film at elder age.
- **Things that made no sense.** Raids after the Hollow woke; lightning fires in winter; lost-kid cards for a held, sleeping or possessed kid, at night or in winter; a feast at night; a freed camp handing out new survivors every time it was freed; cards auto-answering while you're in a body; a conversation with a dead smol; tantrums at sleeping smols; rivals brawling in their sleep; mourners who were captive; rivals giving warm eulogies; "died of ???" for heat and exhaustion; rested smols wandering all night (they doze till dawn now); an egg the tribe couldn't pay for eating the food anyway; chatter stalling a ritual walk for good.
- **Phone.** Possession hints say "tap" not "press E / left click"; two new buttons, 💤 nap and ↻ turn; the hotbar fits nine slots on a narrow screen.
- **Saves.** Leaving a body restores the speed you had; saving mid-possession keeps it too.

## 0.62 What v4.16.0 added: the story never stalls (complete-game goal, step 6)

- **Found by the live 18-minute runs on 4.15.** Both islands reached the Hollow waking at about game minute 200, with 0 errors at 60 fps on desktop and phone. But both were still on **chapter 1** at day 13. Chapter 1 asks you to possess a smol, and the chapters run strictly in order, so a player who never tries possession never sees chapters 2 to 6, the spire included, even with a village of thinkers.
- **Fix (`quests.js`).** A chapter now moves on when two things are true: the smols have evolved past it (`Q.OUTGROWN`: tool-users for chapters 1 and 2, a tribe for chapter 3, builders for chapter 4), and it has been open a whole day. Its unfinished quests stay on the board under **left behind** (up to 3 shown) and still pay their sparks when done. The card reads "chapter N is behind you · your smols outgrew it", and there is no chapter bonus, which still needs every quest done. The builders chapter and the spire are never skipped, because their quests come by themselves. The journal lists left-behind quests under their chapter.
- Tests: `chapters.test.js` (new).

## 0.61 What v4.15.0 added: an ending you can feel, and a soft-lock fixed (complete-game goal, step 5)

- **The Hollow wakes on a real card.** Before, the end of the Lantern story was a 10-second toast. Now a card (`ui.js` wakeCard) tells the waking and lists what you did: days on the Hollow, smols hatched, generations, highest tier, ideas, villages and memories back. It points at the one story left, the spire in chapter 6, and offers keep playing, read the last memory, or the civilisation card.
- **Fix: a storyteller card you couldn't close.** A storm or sniffles card could come up after its moment had passed: a copy waited in the queue, or the event had already been decided. Its choices then did nothing, and the card is sticky with no ✕, so the game was stuck behind it. Found by the 16× browser runs, which stuck at game minute 29 on desktop and 52 on phone. Now any choice on a stale card closes it, and stale cards are dropped from the queue. After the fix the same run went to game minute 116 (thinkers, 20 buildings, Lantern stage 2) with 0 errors at 60 fps.
- **The title says what's new:** "new: pixel art · the Lantern's 16 memories · a day on the Hollow · the Hollow wakes" (desktop only).
- **Tools:** `smol-brains-handover/tools/long.cjs` (+ `long-start.js`, `long-tick.js`) plays a fresh island in a real browser at 16× with an engaged player for N real minutes, with screenshots, a state line and every console error.
- Tests: `embers.test.js` (the waking's card), `director.test.js` (stale cards close and are dropped).

## 0.60 What v4.14.0 added: the Lantern journal, a day on the Hollow, and pacing for one sitting (complete-game goal, steps 2-4)

- **The lore journal (`embers.js` E.LORE, `ui.js` lanternSheet).** Tapping 🏮 now opens the Lantern's journal instead of a toast. It shows the stage, a bar to the next stage, how embers are earned, the latest embers, and **16 pages of lore that come back with the embers** (at 1, 3, 5, 7, 10, 12, 15, 18, 21, 24, 27, 30, 35, 40, 45 and 50).
  - The pages, in order: a tune, the hill (the Hollow is a giant's curled hand), who lit it (Oru), why brains are smol, the long dark, what grumps are, the sky ships, the warship (it was an ark once), the pods, Pip, the giant's dreams (the seasons), the spire, names, the other lights, why the Hollow sleeps, and the waking.
  - Each new page shows a card ("a memory came back: …, tap 🏮 to read it"). The newest page opens first, marked new.
- **A day on the Hollow (`days.js`, new).** Like Stardew Valley's end of day: everything worth telling between one dawn and the next is tallied. That covers hatches, words, tricks, ideas, buildings, embers, new species, grump chases won and smols lost.
  - At dawn one small card, never a window, sums up yesterday ("☀️ day 3 · yesterday: a smol hatched · 4 words learned · 2 memory embers") and gives today's one goal, the next open quest.
  - The tally saves with the quest board (`game.quests.day`). Offline catch-up neither counts nor shows a card.
- **Pacing for one sitting: the Lantern's pull (`main.js` Game.lanternPull).** The Lantern is the smols' memory, so each egg now leans toward what its more evolved parent's next tier still needs. The pull is 0.12 of the way to the top per egg, ×1.5 at Lantern stage 1, ×2 at stage 2 and ×2.5 at stage 3, so progress and the story speed each other up. Grumps don't get it. Measured with a new engaged-player bot (`smol-brains-handover/tools/engaged.js`: teaches, tickles, feeds, blesses toward the next tier, inspires; 120 sim min):

  | island | tribe | first building | village | Lantern stage 2 | the Hollow wakes |
  |---|---|---|---|---|---|
  | seed 1, 4.13 | 54 min | none in 120 | none | 70 | no |
  | seed 1, pull 0.07 | 16 | 69 | 109 | 24 | no |
  | seed 2, pull 0.07 | 50 | 85 | none | 63 | no |
  | seed 2, pull 0.12 | 16 | 40 | 57 | 24 | 116 min |
  | seed 4, pull 0.12 | 24 | 64 | 96 | 35 | 124 min |

  An engaged player now sees the whole arc, from blob to village to the Hollow waking, in about two hours.
- Fixes found by a 16× browser run: the "lend your light" button sat on top of a wish card (the guide card now steps aside while it's up). The dawn card waits for the first night to hand over and is never dropped from a busy toast queue.
- Tests: `embers.test.js` 5b (16 pages in ember order, each announced once, all back at the finale) and `days.test.js` (new: the tally, the recap and its goal, a quiet day, saving, offline, and the load order), and 5c (the pull nudges a needed gene, more at a higher stage, never for grumps).

## 0.59 What v4.13.0 changed: pixel art by default (Ashton's complete-game goal, step 1)

- **The hd pixel look is now the default.** It has the low-res scene, 1 px outlines, the Higgsfield pixel-art textures, painted pixel smols and warm light. The voxel look (the default in 4.10–4.12) and classic 3D are still in settings → look. A player who picked a look in settings keeps it.
- **First person is crisper.** The soft focus is gentler (half strength, and it starts further out), so the world reads as sharp pixel art instead of a blur.
- **Fix: action buttons no longer cut off the thing's name.** A long label like "shake the berry bush" used to keep its first two words ("shake the"). It now drops "the", "a" and "some" first, then keeps the verb and the thing ("shake berry bush").
- The title screen's live island renders in the pixel look too.

## 0.58 What v4.12.0 added: the Higgsfield textures in the game (Ashton)

Ashton asked for the pixel-art textures made in Higgsfield on Oct 21 to show in the game, the way the Higgsfield mock-ups looked. Until now the hd look used them only as small grey 64 px detail maps, and the default voxel look didn't use them at all.

- **The art:** the 16 textures are grass, dirt, sand, rock, snow, farmland, water, bark, broadleaf leaves, pine needles, blossom, palm, stone brick, thatch, planks and clay roof. They are re-pulled at full size from the Higgsfield history.
  - Each one is cropped to the size that repeats best, so bricks, roof rows and planks keep their rhythm. The organic ones also get a ragged cut to a half-shifted copy, so no seam shows.
  - They are packed into `play/art/hd/tiles.png` at 1024×1536, 685 KB, with 256 colours. The top holds 256 px tiles; under them sit the same tiles at 128, 64, 32 and 16 px, plus each tile's average colour as one texel.
  - Builder: `smol-brains-handover/tools/tiles/build_tiles.py`.
- **The shader (`render.js` HD_GLSL):**
  - `hdTile` picks a level by how many texels land on a screen pixel. Up close it's crisp pixel art; far away it settles to the tile's own average, so nothing shimmers and no mipmaps are needed.
  - `hdApply` puts a tile on the game's colour. It blends the colour with the tile's light and dark, and the tile's own palette at the colour's brightness. The closer the hues, the more of the tile's palette shows, so a meadow gets the art's greens while a white birch or an autumn tree keeps its colour.
  - Biomes, seasons, snow, night and fog all keep working.
- **Where it shows:**
  - The voxel look (the default) now has textures. Block tops get grass, sand, dirt, rock or snow from their colour; block sides get earth, rock and the grass lip (`vox.js`). Trees, rocks and buildings get bark, leaves, needles, blossom, palm, brick, thatch, planks and roof, and water gets the water texture.
  - The hd look uses the same full-colour art.
  - Pixel and classic 3D are unchanged.
- **Cost:** one more 685 KB image, loaded once. Headless at 1280×800 and 400×800 it holds 60 fps, the same as 4.11.9.

Test: `hd.test.js` covers the atlas size, the voxel look loading the tiles, and the shader wiring. No new sounds. Grab input is untouched.

## 0.57 What v4.11.9 fixed: chase QA on a saved island (K-0070)

Chef scored the 4.11.8 chase 9/10 on mobile and desktop. One fix:

- **`?cctest=1&chase=1` is one click on a saved island too.** Continuing an island that had been played for a while stacked a hatch reveal, a pod's log and guide tips (drowning, starving, a pod down) before the chase screen was clear. The chase jump now quiets the island for 10 minutes (`UI.quiet(600)`, called from `Debug.night` with a chase):
  - story cards and event windows are skipped, not saved for later; a story card isn't marked seen, so it still comes the next time;
  - guide tips, hatch reveals and big moment banners don't show;
  - anything already queued or on screen is cleared.

  Normal play is unchanged. Test: `nightchase.test.js` section 11. Checked headless: a saved island continued into `?chase=1` went straight into the chase with nothing on screen, where it showed guide tips before.

No new sounds. Grab input is untouched.

## 0.56 What v4.11.8 fixed: Chef's 4.11.7 playtest (K-0068)

1. **The chase HUD fits a narrow window.** Below 700 px wide (a phone, or a desktop window about 400 px wide) nothing in a body's view sits on anything else or runs off the screen. Before, at 400 px the smol panel covered the compass, the "look with the mouse" hint sat on the test numbers, the hearts and hunger row was 790 px wide and "bag Tab" was off the right edge.
   - The compass is 44% of the width, and "leave body" drops its Esc key, so the two no longer meet. The smol panel is smaller (face, name and tier only) and sits under the top bar on the left. The bag button sits below it.
   - The red "grump spotted you" line wraps instead of running off both sides.
   - The hearts, hunger and stamina icons are at most 3.4% of the width, so the rows fit in 360 px. The hotbar slots are 38 px.
   - The mouse hint wraps and sits higher, clear of the test numbers. On a phone the test numbers move up under the red line, clear of the touch buttons.
   - Below 380 px wide the compass is 40% of the width. Measured at 400 and 360 px, mouse and touch: nothing overlaps or leaves the screen. Wide windows are unchanged.
2. **A nest beacon that reads.** The pillar in the world is deep gold (deep orange over a fire), not cream, and wider. The pillar drawn over the view has a white-hot core in a gold body with a dark rim, so it reads against a pale sky as well as the night. It now shows whenever the nest is anywhere in front of you (within 63° of where you look, was 52°). When the nest is off to the side it stays pinned to that edge of the screen, not past it. The edge arrow stays.

No new sounds. Grab input is untouched.

## 0.55 What v4.11.7 fixed: Chef's 4.11.6 phone playtest (K-0066)

1. **The HUD comes back after a chase on a phone.** Taking a body cleared the camera's running move without its ending. On a slow phone the landing film (the fall onto the island) was still running when `?chase=1` lent the light, so its ending never ran: the island's title card stayed up and the top bar and toolbar stayed hidden after the chase. `Possess.enter` now finishes a running camera move, ending and all, and the `?chase=1` jump waits for the landing film before it starts. Test: `nightchase.test.js` section 10.
2. **A narrower smol card on a phone.** Below 900 px wide (or under 560 px tall) the card sits at the bottom right, 70% of the width between 196 and 300 px (44% on a phone on its side), with smaller header buttons and the name cut short with "…". The avatar hides below 360 px. Fold (▾) is unchanged. Measured: 280 px of 400 (24% of the screen), 196 of 267, 300 of 844 landscape.
3. **An in-world nest beacon.** In a chase (and the first night) the way to safety, the nest or the nearest fire, now has a pillar of light in the world itself: a 14 m glowing column (`p:beacon` in meshes.js) with a ring at its foot and its top, drawn by bodies.js. It pulses and is warm orange over a fire. The overlay pillar and the edge arrow ("nest 16m") stay for when it's behind you or lost in fog.

No new sounds.

## 0.54 What v4.11.6 fixed: Chef's 4.11.5 run (K-0063)

1. **Miracles stay armed.** A picked miracle no longer drops after one cast. Every tap on the world casts it again, until you press ✕ or Esc, close the magic book, pick another tool, or can't afford another.
   - A small tag under the top bar says what a tap will do ("⚡ armed: lightning · ✨10 · tap the world") and has its own ✕. The cursor is a crosshair while a miracle is armed.
   - Sunshine and rain still cast at once from the button and then stay armed. A second cast on a sky that's already that way costs nothing and says so.
   - An armed miracle holds back event cards only while it's in use (20 s since the last pick or cast), so leaving one armed doesn't stall the story.
2. **Grabbing walkers, and misses.**
   - A smol counts for a grab where it was over the last 150 ms as well as where it is now (`IN.TRAIL_MS`, as Elevator 1.2 does). The live body wins a tie.
   - A mouse press that just missed and runs onto a smol within 450 ms and 90 px takes it, as a finger already did.
   - Two quick clicks that miss next to a smol no longer zoom the camera in. A double-click on bare ground still zooms in when no smol is within reach, so this was the likely "camera moved on a miss".
3. **`?cctest=1&chase=1`** drops a tester straight into a grump chase on the next night still ahead (night 2 on a new island). It sets up four grown smols at the nest, holds back cards, storms and strangers for 10 minutes, clears anything queued, and shows "lend your light". The chase starts on its own 1.5 s later. `&night=N&chase=1` still only shows the button.
4. **A dunk reads as meant.** A smol you drop in water lands with a big splash and a line ("brr!", "blub!", "sploosh"), then swims. The `dunk` bus event is the hook for a splash sound file; no sound is synthesized.
5. **A smaller smol card.** On desktop the side card is 320 px wide (was 360), with smaller header buttons so the name gets more room than before. On a phone it takes at most 34% of the screen height (was 46%). A ▾ button folds it down to its name row anywhere. Folding is remembered, and a folded card doesn't push the camera aside.

## 0.53 What v4.11.5 fixed: Chef's clip-run notes (K-0062 item 12)

- **The opening film and "play now".** On a device that has never seen it, "play now" already plays the film, from the game page and the hub page alike (checked on live with fresh storage). It's skipped once a device has seen it, and in the `?night=` test jumps. Two changes:
  - first-timers now get a skip button (`Lantern.skippable()` is always true; skipping marks it seen);
  - the "play now" card says "a fresh island, after a short story (skip any time)" until the film has been seen, instead of "jump straight in".
- **A missed grab on a phone.** One-finger drags that miss still pan, because phones need that. A pan younger than 450 ms and shorter than 90 px that runs onto a smol now takes it, and the view goes back to where it was. A mouse drag already never pans; it pans only after resting 0.4 s at the screen edge (4.11.4).

## 0.52 What v4.11.4 fixed: Chef's 4.11.3 chase playtest (K-0060)

1. **No dream or choice over a chase.** `SB.Director.danger(game)` is true while a night chase is offered, run or just over, and while a grump is on your possessed smol. During that time the storyteller deals no card, a card already asking stops its auto-answer clock, and `UI.eventReady` holds every event window, so "Saro had a dream" waits until it's over.
2. **Every chase ends on a beat you can read.**
   - The chase banner keeps the count: "bites 1/3".
   - The end shows in the body ("🔥 Saro made it to the light!", "👹 Saro was caught · hurt, but alive", "😮‍💨 lost it in the dark"). Back in the sky, the camera stays on the smol and the outcome's note waits as a toast.
   - The third bite's "OUCH" no longer covers the "caught" beat.
3. **Steering.**
   - Arrow keys turn about 1.5–2.5× faster, and quicker the longer they're held.
   - In a chase with the mouse not captured, A/D steer as well as strafe, so W+D curves right.
   - At night a soft warm light follows the possessed smol, so the ground reads.
4. **A beacon.** In a chase, a pillar of light (12 m, glowing, pulsing) stands over the way to safety: the nearest fire if it's nearer, else the nest. It's drawn over the view, so a cliff or the night fog can't swallow it (a 3D pillar was lost in the fog in testing), and a warm light sits on the spot itself.
5. **This morning's notes.**
   - Event cards wait while a miracle is being aimed and for 3 s after a cast, so the night card no longer cuts into a lightning bolt.
   - A reaching hand pans the view only after resting 0.4 s at the screen edge, so a quick missed drag no longer moves the camera.
   - The "test mode: the founders keep their names" toast shows only with `?cctest=1`. Before, it also showed in any first night.

## 0.51 v4.11.2–4.11.3: a tip jar on the end screens (K-0059)

Chef's tip jar ask: a small, friendly "tip the chef" link on Smol Brains' end screens. Smol Brains has no single game over, so it goes on the two places a run ends:

- **the possess death screen** ("Pip was hurt too badly"), under "back to the sky";
- **the ending card** ("you raised a civilisation"), under keep playing / share / new game+.

How it works (`UI.tipLink` in ui.js, since v4.11.3): it mounts the site's shared "Tip the chef" button (`/assets/tip.js`, `ccTip.mount` with game `smol-brains` and slot `smol-death` / `smol-ending`).
- That button brings the one public Stripe Payment Link (`TIP_URL`, from `/api/tip`), `?ref=tipjar-smol-brains`, the `tip_click` count and its own styles.
- It shows nothing while tips are off, and it hides itself in the native app builds.
- It is a plain link in a new tab: never a popup, never over a button, and the death screen still returns to the sky on its own.
- v4.11.2 shipped a game-local link first; v4.11.3 swapped it for the shared button as soon as that landed.

## 0.50 What v4.11.1 fixed: Chef's 4.11.0 playtest (K-0058)

- **The night clock read "80:10".** It wasn't the clock math: Pixelify's digits muddle at UI sizes (2 and 3 read as 8, 5 as S). Both Pixelify faces now carry `unicode-range: U+0000-002F, U+003A-FFFF`, so every number in the UI (clocks, sparks, hearts, distances) comes from JetBrains Mono and the letters stay pixel.
- **Chase guidance.** While a grump hunts you, safety has its own marker: a big yellow diamond labelled "🏠 nest 16m" (or "🔥 light 12m" in a night chase), stacked above the red "👹 grump 4m" one at the screen edge (`hud.nmark` in povhud.js). The green marker is only for a goal now: the first night's sticks are a small "🪵 stick 1/2" marker, and once Pip has both, the goal is the nest itself and the yellow marker steps aside (no two arrows to the same place). The nest's label says "· bring 2 sticks" while you're gathering.
- **Three bites end every chase.** The first night had no end but light: Chef took 4+ bites at 25% health and nothing happened. Now the third bite (`FN.BITES`) catches Pip: the founders come running with fire, the nest is lit for Pip (`light(game, pip, true)`), Pip is hurt, and the night goes on to dawn as before. The bite banner reads "👹 OUCH! bite 2 of 3", and the first one adds "Esc leaves the body".
- **The tutorial hand-off.** After Pip eats, the coach card steps aside for the first night, and the clock used to stop at 17:16 for the whole 160 s free day, so it looked paused. Now the clock runs smoothly from the meal to late afternoon (`s.fedT0`), a card says "🌞 Pip ate! the island is yours till dusk" with an "ok, let me play" button, and the timer up top counts down "🌙 night falls in 4:40" in real seconds (day 1 runs at 0.6 pace, and the timer allows for it).
- **Grab.** The pick radius for "the nearest smol close by" is 60 px with a mouse and 80 with a finger (was 40 and 56). A drag that starts on bare ground re-checks for a smol as it starts moving, and a drag that started by a tree takes a smol it passes; with a mouse it never pans. A release slower than `IN.THROW_MIN` (3.5 units/s) sets the thing down instead of throwing it. The hover ring is warm yellow, wider, and never smaller than a 0.3-radius smol's; the cursor turns to grab/grabbing, and on a touch press the ring shows straight away.
- **Testing night 2 in one sitting.** `?cctest=1&night=2` jumps a fresh island (once the opening's done) to night 2 just before dark, with the tutorial and the first night marked done; `&chase=1` also puts a smol out alone in the dark with a grump closing in, so the "lend your light" prompt comes in seconds. Also `SB.Debug.night(n, chase)`.
- **Tests:** `firstnight.test.js` gains the free-day clock and a second island where standing still gets Pip caught on the third bite, the nest lit and dawn reached.

## 0.49 What v4.11 added: night chases (K-0057 item 4)

The first night's chase was the best minute in the game, and it never came back: after the tutorial, night grumps hunted on their own and you could only watch. Now any night can give you that minute again (`nightchase.js`, `SB.NightChase`).

- **The moment.** When a night grump comes within 7 units (`NC.SPOT`) of a smol that's out alone in the dark (no fire within 6, not in a hut or shelter, more than 7 from the nest, not held, carried or captive), time slows to 0.3 (`NC.slow`, applied in main.js's frame loop), the camera follows that smol and zooms in, ⏭ skip stops, and fast-forward drops to 1×. The grump glares and waits (`scout.hold`), the smol freezes with fear, and one glowing button shows: "🕯 lend your light · <name> is cornered: be them, run for light", with a bar counting down 6 real seconds (`NC.PROMPT`).
- **Let it go** and the grump goes back to its own night. Another prompt can come 30 s later, at most two a night (`NC.PROMPTS`).
- **Lend your light** and you're that smol, free of sparks, in possess.js's scout chase: the grump runs at 90% of your running speed, winds up for 1.5 s and pounces. The first-possession controls card is skipped for a short "you are <name> · run for light" beat, and there are no quests in a chase. The red banner and green marker point to the nearest light if it's nearer than the nest ("🔥 light 12m").
- **Win:** get within about 5.5 of any fire (a campfire, a wildfire, a torch lying down or a friend holding one), carry a torch yourself, reach the nest (within 5), or scare it off (it flees fire on its own). That's +3 ✨, the smol's fear drops to 0, `c.braveNights` goes up (saved, and noted in the chronicle), and the first win of the island is a memory ember ("<name> outran the dark", key `nightchase`).
- **Lose:** three bites (`NC.BITES`) and it caught you: you're thrown out and the smol is hurt (pain and fear). Bites never take the last quarter of the hearts, so a chase never kills. Holding out 35 s means it loses you in the dark (+1 ✨, not a win). Leaving the body ends the chase, and the grump loses the scent.
- **Once a night.** After a chase ends there's no other chase that night. You stay in the body for 3 s (`NC.LEAVE`), then you're back in the sky.
- **Never** during the first night, a film, a window, while you're already possessing someone, offline catch-up or the title screen, and never against raiders (they come for buildings). Settings → "🕯 night chases on/off" (`game.settings.nightChase`). Counts live in `game.settings.chase` and save with the settings.
- **possess.js:** `opts.nightChase` → `S.nightChase`; `scoutTick` runs for a night chase even after the first-minute grump is done and spawns nothing of its own; `endScout(msg, pay, why)` (exposed as `P.endScout`) doesn't touch `povThreat` in a night chase, and `scoutEnd` now carries `why`; `adoptScout(g, { keep: true })` leaves `povThreat` alone.
- **Tests:** `tests/nightchase.test.js` (30 checks): no chase by day, in the first night or with the setting off; the prompt, the slow-down and the waiting grump; a missed prompt; lending; the nest win with sparks, ember and bravery; three bites; leaving mid-chase; and a save. `tricks.test.js`'s hungry-blob check is seeded (PR #198).

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

`SB.NightChase` (nightchase.js, loaded after firstnight.js): `tick` (spots a grump and a lone smol, `find`), `offer`, `lend`, `safe` (asked by possess.js each tick of the chase), `slow` (the frame loop's time factor), `state` (`game.settings.chase`), `on` (the setting), `ui`/`frame` (the button and its countdown).

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

