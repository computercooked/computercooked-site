# smol brains: the roadmap to a game you play (Oct 28 2026)

Owner note (via K-0006): "a completely unfinished game, just bare bones skeleton… you basically just sit there and watch it." He wants two ways to play: **(A) a colony sim** where training is visible (Norns + RimWorld), and **(B) survival**: possess a smol and play it Minecraft/Terraria-style. Both need juice, sound, desktop and phone controls, a strong first 60 seconds, saves, sharing, and clean code for later ports.

**What we found.** Every system the brief asks for already exists in some form: about 27k lines across 45 modules, including genes, real nets, chemistry, ideas, social life, a storyteller, raids, seasons, possession and survival crafting. The problem is the shape of play:
- The player waits on long timers:
  - tool-user takes about 30 minutes;
  - a season lasts 40 minutes;
  - the first story card comes at minute 8.
- The interesting verbs are locked behind tiers:
  - possessing smols with hands needs tool-user;
  - orders need tier 2;
  - buildings need builders.
- Learning happens, but it's invisible as a goal: you tickle and nothing tells you it worked.

So the plan is to **reshape, not rewrite**: put a clear goal and a hands-on verb in every minute, then deepen each mode.

**How this fits `plan-combined.md`.** The combined plan stays the long road: the tech arc, grump clans, terrain, mines, Steam at 5.0. This plan reorders the next releases around the Oct 28 brief, so every release makes the game more playable first. M1 takes the 4.5 number. "Spears and bows" and "first night" move into M3 (survival) and M4 (events), and keep their designs from `plan-survival.md` and `plan-challenge-lore.md`.

Each milestone ships to prod on its own. Playtesters use `https://computercooked.com/games/smol-brains/?cctest=1`.

## M1: hands on from the first minute (v4.5, shipped Oct 28)
- **▶ play now.** One tap from the title to a fresh island (medium, or small on phones). "custom island" keeps the full form.
- **🎓 tricks** (`tricks.js`, data-driven `Tricks.LIST`):
  - **The tricks:** eat when hungry, leave red shrooms alone, come when called, play when bored, eat healroot when sick, hug a friend when lonely, never hit other smols, run from grumps.
  - **The meter:** each meter reads the smol's own net live (`Brain.qOf` over the everyday verbs, softmax). Every lesson moves it, including lessons for other tricks, so you can watch training work and watch it backfire.
  - **Set it up:** drops the item beside the smol and draws its eye to it (`c.lure`). What it does with the item is still its brain's choice.
  - **Rewards and forgetting:** learned at 80%; the first time pays 2 sparks. A trick can be forgotten below 45% and relearned for nothing. Instinct tricks don't count as taught.
- **📖 quest board** (`quests.js`, data-driven `Quests.CHAPTERS`):
  - Six chapters of 3–4 concrete quests, each with a spark reward and a "how" hint; tap a quest for a shortcut.
  - The chapters: first sparks → growing up → a family → hands → builders → the big thought.
  - A chapter bonus pays when a chapter closes. The board replaces the old "next" list; the old goals stay underneath as "also".
- **Free first possession**, so everyone sees the first-person mode. A "possess a smol and eat something" quest sits in chapter 1.
- **Tutorial:** the step that only opened the brain viewer is now "teach it a trick".
- **Tests:** `tests/tricks.test.js` covers meters, learning and forgetting, sparks paid once, set-ups, a real training loop, the quest board, saves and the free possession.

## M2: the colony is yours to run (sim depth)
- **Build and zone from the blob stage:**
  - god-placed nests, food bowls, toy piles and fences;
  - a stockpile zone and a sleep zone;
  - smols use them, and the brain learns them as places.
- **Breeding as a verb:**
  - matchmake two adults: a "nudge them together" order, a genome preview of likely kids, and pairs that sometimes refuse;
  - name every hatchling with a quick name card.
- **Jobs earlier:** a lightweight job board from critter on: forager, explorer, nanny, guard. Jobs pull on interests, and tricks make smols better at them (for example, "come when called" makes an obedient worker).
- **Visible evolution:**
  - a generation strip (great-grandparents → kids) showing brain size, traits and learned tricks per generation;
  - an "inherits instinct" tag when a taught trick becomes an instinct in the kids, via the echo system.
- **Pace:** a "fast-forward to the next interesting thing" button, plus one shorter season setting (10 minutes).

## M3: survival becomes a game (possess depth)
- **Blobs get their own survival kit:** roll, nibble, sniff out food, push things, squeeze through gaps. The kit grows with each tier, so possession matters from minute one.
- **A crafting tree with tiers:**
  - stone, then copper, then crystal;
  - workbench and kiln stations;
  - recipes that unlock from the colony's ideas.
- **Combat:** grump fights with a wind-up, dodge and knockback; one boss per biome (the grump warlord, a giant crab, a storm spirit).
- **Biome goals:** each biome has a resource you can only get there.
- **Night and the world:** night raids you defend in first person; mining under the ground, with simple caves under hills.
- **The brain matters:**
  - your possessed choices train the net (this already happens);
  - a recap on leaving: "Ula learned: chop trees ↑, run from grumps ↑";
  - the colony keeps living on un-possess.
- **Survival save slots and a death recap.**

## M4: events with teeth (storyteller depth)
- **Raids:** earlier and smaller ones (from about minute 10) that you answer in god mode or by possessing a defender.
- **Disease:** chains you can quarantine, a cure quest, and herbalist tricks.
- **Seasons that change play:** winter food stores, summer storms, autumn harvest festivals.
- **Storyteller choices** that cost something and get remembered.

## M5: juice and share
- **Feel:** hit-stop, screen shake, particles and sound on every verb; a stinger for the first trick and the first word; a pass on phone haptics.
- **Share cards** (1080×1350), shared via the player's share flow:
  - "my smol learned…";
  - a generation tree;
  - the first-person kill of a boss;
  - the chapter-complete card.
- **A daily island seed** with a small challenge ("raise a smol that never hits anyone").

## M6: engine and sim split (port readiness)
- **One `SB.Sim` core** with a single update entry and no DOM or render reads (fix the two leaks in `main.js`: `farFlags` and `hatch` read the camera).
- **One `SB.Content` registry** for all data tables (verbs, nouns, items, tricks, quests, ideas, cards) so ports and mods read one place.
- **One input-intent layer** shared by god mode and possess mode, so gamepads and touch map to the same actions.
- **A headless sim CLI** for balance runs in CI.
- **Store builds** (Steam/iOS) wrap the same files. Ashton creates the store accounts.
