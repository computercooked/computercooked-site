# smol brains: challenge, grumps, defense, romance, lore

A plan from narrative and systems design, written for the owner's notes ("too cosy", "grumps as primitive natives with spears and bows", "harder as the game goes on", "smols look normal from tribe on", "expand the story a ton", "survival mode and a tech arc to guns, cars and cities").

It builds on the threats branch (`.claude/worktrees/agent-a684f1c0f93cf75b9`, `play/js/threats.js`, 797 lines). Note: that branch's DESIGN.md has **no new section**. Its only DESIGN.md change is an accidental deletion of the v4.1 possession bullet, and that should be restored before merging.

---

## 0. Where we are (what the code does today)

**Why it feels cosy, in numbers from the code:**
- `chemistry.js:96`: love rises by `0.009 × (0.5 + fertility)` per second in any adult who's fed and healthy. An average smol is "smitten" (0.45, `creature.js:603`) about **50 seconds** after its love was reset.
- `creature.js:1189`: `eggCooldown = 170`. A pair can make an egg **every 2.8 minutes**.
- `chemistry.js:59-60`: loneliness rises at 0.0026/s alone and falls at 0.0035/s per friend nearby. Being near anyone fixes it, so the cheapest fix is a cuddle pile.
- `CUDDLY = { smol, hand, toy, egg }`, and every cuddle with a smol fires hearts and a "love" emote (`creature.js:887, 1103`). The result is hearts on screen all the time.
- `pixel.js:211`: the **default mouth is a smile** on every idle, walk and blink frame. Only the eat, sad, scared and sleep frames differ, and blush cheeks show unless the smol is sad. Adults smile constantly because the sprite has no neutral face.
- The storyteller (`director.js`) deals a card every 3.5–6.5 minutes. There are 4 bad cards (raid, storm, sick, camp), and the threat number is `0.6 + tier×0.45 + pop/10 + structures/14`. Every grump is the same creature (tier 1, one sprite, no weapons, no ranged attack, no roles).

**What the threats branch adds (keep all of it):**
- `T.level`: grumps grow with time, tier and NG+.
- `T.gear`: grumps learn from you. A walled raid leads to ladders, two lead to rams, and fire leads to torches. **This is the seed of the whole design below: grumps copy what they see.**
- Kidnaps with rolling caps (6 per 200 minutes) and captives held at camps.
- Camps grow from size 1 to 5 every 10 minutes if left alone, and big camps send more raids.
- Raids wreck 2–3 buildings, and wrecks become repair sites.
- Defence: the armed and brave stand, while kids and elders hide in huts.
- Lethality rules: huts protect, and only fighters or smols alone at night can die.
- Five rare disasters chosen by terrain (tsunami, hurricane, sandstorm, tornado, quake), with star-dome warnings.

**What's missing:** ranged combat, enemy variety, grump culture and agency, any way to deal with grumps except hitting them, predators, famine and winter as real crises, disease beyond a sniffle card, internal strife beyond feuds, rival smol tribes, a pacing model that builds and releases tension, and lore beyond 7 ark logs and a 3-shot intro.

**A lore conflict to resolve:** the intro shows grumps as a *space-faring warship crew* (year 3127). The owner wants *primitive natives*. The bible below makes both true, and the gap becomes the game's central mystery.

---

## 1. The challenge model

### 1.1 Lessons taken from each game

| Game | What we take | What we leave |
|---|---|---|
| **RimWorld** (Cassandra, Phoebe, Randy) | A threat budget from colony **wealth + population**. **Adaptation** lowers threats after losses and raises them during long safe streaks. On/off **tension cycles**. Raid *strategies* (assault, siege, sappers, breachers). Big and small threats are separate categories. | Pure wealth punishing building (the "wealth management" meta). We weight population and era more than stockpiles. |
| **Frostpunk** | **Scheduled, forecast crises** (the cold snaps) that you prepare for. Hard choices with moral cost (laws). One looming final storm. | The grim tone. Ours is melancholy, never bleak. |
| **They Are Billions** | **Visible wave timers** ("the war moon rises in 2 nights"). One breach cascades (infection = fire and panic here). Noise draws enemies (expansion draws grumps). | Endless hordes. A smol village is 10–60 bodies, not 600. |
| **Dwarf Fortress** | **Sieges triggered by wealth and fame**. **Goblin snatchers steal children and raise them as soldiers who come back in later sieges.** Megabeasts drawn by wealth. Tantrum spirals. Legends: history that becomes myth. | Opaque UI and losing being "fun" by default. |
| **Banished** | The real enemy is **demographics, food and cold**: a famine winter kills a cohort, then a generation gap 20 years later. Housing limits births. | No enemies at all. |
| **Kenshi** | The world doesn't revolve around you. **Factions have territories, grudges and debts**. You can be captured, enslaved or ransomed. Strength is relative, and you start weak. | Brutality. |
| **Against the Storm** | **Hostility rises with your actions** (cutting the forest angers it). That's a direct cause and effect the player can manage. | |
| **Northgard / Don't Starve** | Winter is a season-long boss. Wildlife is a threat with territories. | |

### 1.2 The core rule

**Every threat has a cause the player can see and a lever the player can pull.**

Grumps raid because they're hungry, angry at you, or have learned you're rich and weak. Famine comes because you didn't store food before winter. Plague comes because the village is crowded and drinks downstream of itself. Nothing comes from nowhere except disasters, and those are forecast.

### 1.3 Threat families

| Family | Starts | Cause the player can see | Lever | Lethality |
|---|---|---|---|---|
| **Night prowlers** (exists) | tool-user | Darkness, smols out in the open | Fire, huts, torches | Hurt, kidnaps (capped) |
| **Snatchers** (exists, refocused) | tool-user | Kids and sleepers left out at night | Huts, guards, a night watch | Kidnap → *grump-raised* (§2.7) |
| **War parties / raids** | tribe | Clan hostility, hunger, your wealth | Walls, weapons, gifts, trade | Can kill fighters |
| **Sieges** | builder | High hostility with a big clan, or the war moon | Sally out, burn their camp, pay tribute, outlast them on stores | Starves you if unprepared |
| **Ambushes** | builder | Work parties deep in clan territory | Escorts, towers, staying out of their lands | Can kill |
| **Harassment** (archers in the treeline) | builder | A hostile clan nearby | Towers, clearing a kill zone, archers of your own | Wounds, panic |
| **Sappers / burners** | thinker | Grumps that have learned walls and fire | Stone walls, water buckets, fire watch | Buildings |
| **Relic gunners ("Wakers")** | thinker → powder | Grumps reached the Iron Hill wreck | Take the Iron Hill, crystal denial | Very lethal, very rare |
| **Predators** | critter | Biome and territory; your hunting thins their prey | Spears, fire, avoidance | Can kill |
| **Megabeast** ("Old Tusk", the Roc) | builder | Fame and wealth, or stealing a giant nest egg | Hunt it (a big set piece), appease it, or flee | Can kill several |
| **Famine** | tribe | Winter, blight, drought, eating the seed grain | Stores, granaries, farms, trade, rationing | Starvation |
| **Winter** | always (bites from tribe) | The season, cold snaps | Firewood stockpile, cloaks, huts, hearths | Cold sickness, deaths of the old |
| **Disease** | critter | Crowding, dirty water, grump shamans, contact with strangers | Herb lore, quarantine (exists), wells, brewing | Epidemics |
| **Internal strife** | tribe | Mood, scarcity, inequality, faith, leadership | Feasts, fair sharing, exile, elders | Fights, theft, schism |
| **Rival smol tribes** | builder | Pods that settled elsewhere, plus your own schisms | Trade, marriage, war | War from thinker on |
| **Disasters** (exists) | 30+ min | Terrain | Forecast, shelter, miracles | Buildings, some injuries |

### 1.4 Scaling: the threat budget

Replace `threat()` in `director.js` with a **budget in points**, modelled on RimWorld but with era-shaped content.

```
wealth  W = Σ built structure cost (from STRUCTS) + 0.5·food stored + 2·tools + 4·metal + 8·relics
pop     N = adult smols (kids count 0.3)
era     E = cultural era index (0 stone .. 6 signal), not biological tier
hostile H = the raiding clan's hostility, 0..1 (§2.4)
clan    S = clan strength (camp size 1..5 from threats.js, plus warriors absorbed)

points  P = (4 + 1.4·N + 0.06·W^0.85 + 6·E) × (0.6 + 0.8·H) × (0.8 + 0.1·S)
          × storyteller × adapt × season × (1 + 0.25·ngPlus)
```

- **adapt** (the RimWorld adaptation factor) runs from 0.5 to 1.4. Each smol death to a threat in the last game day takes ×0.8. Each raid won with no deaths gives +0.04, capped at 1.4. It recovers toward 1.0 at 0.1 per game day. This replaces today's `losses` easing.
- **season** is ×0.8 in spring, ×0.9 in summer, ×1.2 in autumn (grumps are hungry and stockpiling) and ×1.0 in winter. Winter sees fewer raids, but those raids aim at your stores.
- **The pity floor (the cosy promise):** before builder, a raid never has more than `1.5 × armed defenders + 2` warriors. Before thinker, a raid never kills more than 2 smols (the existing `T.wound` floor rules still apply).

**Spending points on units** (each era unlocks units, and the clan's own era limits them):

| Unit | Cost | From era | Role |
|---|---|---|---|
| scout (snatcher) | 3 | stone | Fast. Steals food and kids, avoids fights. |
| spear | 5 | stone | Melee, the backbone. |
| slinger | 5 | stone (late) | Short range, weak. |
| archer | 7 | village | Ranged. Stays back and targets lone smols. |
| brute (shield) | 10 | village | Soaks hits and smashes walls (rams come from `T.gear`). |
| smoke-mother (shaman) | 12 | village | War drums (+courage), sickness darts, curses fields. |
| hog-rider | 14 | bronze | Fast flanker that tramples farms. |
| fire-thrower | 9 | bronze | Torches, burns huts (the existing `gear.torches`). |
| sapper | 10 | bronze | Digs under or burns palisades. |
| waker (relic gun) | 25 | Iron Hill opened | Long-range bolt that breaks a wall section in one hit. At most 1–2 per raid. Ammo is crystal. |
| musketeer | 12 | powder | Copies your powder (§2.6). |
| rifle / bike outrider | 16 / 18 | industrial | Only for hostile clans that never made peace (§2.8). |

The **raid strategy** is picked from what the clan knows and what it sees:

| Strategy | Chosen when | Shape |
|---|---|---|
| assault | default | The existing raid shape. |
| snatch-and-run | you have many kids outside | Scouts only. |
| siege | you have walls they can't beat yet | They camp at 25 tiles, burn farms and wait for you to come out. Lasts up to a game day. |
| harass | you have no archers | Archers alone. |
| sappers | their `walled ≥ 2` | A wall gets dug under or burned. |
| feint + flank | clan era ≥ bronze | Two groups from two directions, 20 seconds apart. |
| revenge war | you burned one of their camps | Double points, no tribute possible. |

### 1.5 Pacing: the storyteller

Keep the card deck. Add three things on top of it: **a tension meter, cycles and telegraphs.**

**The tension meter `T` (0..1).** It rises with recent injuries, deaths, hunger, low mood, wrecked buildings and an active threat. It decays at about 0.15 per game hour. Bad cards are blocked while `T > 0.65` (the breather is earned, not timed). Good cards (feast, star, bloom, a trader caravan, a vision) get a ×2 weight while `T > 0.5`. This replaces the flat 150-second breather and the "no bad card within 600 seconds" rule.

**Cycles.** Each storyteller is defined by four numbers:

| Persona (setting) | Player-facing name | Off / on cycle | First major threat | Minor : major ratio | Notes |
|---|---|---|---|---|---|
| calm | **Grandmother Moss** | 30 min off / 10 min on | 45 min | 4 : 1 | Phoebe. Deaths are almost impossible before builder. |
| balanced | **The Weaver** | 18 off / 12 on | 25 min | 3 : 1 | Cassandra. A rising curve. |
| wild | **Old Thunder** | random | 15 min | 2 : 1 | Randy. Clusters and droughts of events, with a wider budget spread (×0.5–1.8). |

**Scheduled big beats (Frostpunk and They Are Billions):**
- **The war moon.** At the end of each **autumn** (once per 160-minute game year), the grump clans gather. The UI shows it 2 game days ahead ("the moon is turning red… the drums haven't stopped for two nights"). It's the year's major siege, at ×1.6 points, and every hostile clan joins in. Clans at peace with you **don't** come, which makes diplomacy pay off visibly. The existing *grump moon* world quirk makes this happen every season instead.
- **The long winter.** One winter in three (or every winter on harsh climate) is forecast by elders and the star dome a season ahead. It's 30% longer, food regrowth is ×0.3, and cold snaps arrive. This is the famine test.
- **Era thresholds** trigger a "they noticed you" beat. When a new era starts, the nearest clan's hostility jumps +0.15 and a scout party appears (DF's "your fortress has become famous").

**Telegraphs before each threat**, so threats can be read as a puzzle instead of feeling like RNG:

| Threat | Telegraph |
|---|---|
| raid | Footprints near a work site, a grump scout seen at the edge of the fog (the minimap pings), distant drums (audio) at the dusk before. |
| siege | Smoke from a war camp on the horizon, then the war-camp site appears. |
| predator | Torn-up bunnies, then a growl. |
| disease | The first sneeze 1–2 minutes before the card. |
| famine | The granary bar goes amber and an elder's speech bubble says "this won't last the winter". |

**Real-time caps** (keep the branch's playTime gating): at most one major per 12 real minutes and one minor per 4 real minutes, at any game speed.

**Offline:** no raids or disasters (the gentle mode stays). Famine and winter run softened: the gentle-mode rule that nobody starves stays.

### 1.6 How each kind of player experiences threats

**Sim-only (god view) players** experience threats as **commander and patron**.
- They read telegraphs, prepare (orders: work marks, blueprints for walls and towers, a stockpile zone for the winter store, the guard job), and choose cards (smite / hide / fight / pay / parley).
- During a raid the camera flies to the threat. A new **battle strip** shows defenders against raiders as pixel portraits with health pips, plus a morale bar for each side. They can drop a **rally flag** (exists) or an **"all to the walls" bell** order.
- Miracles stay strong but **heat up faster in battle** (×1.5 godHeat), so the sky can't solo every raid. Answering the defenders' prayers *before* a fight ("make us brave") is cheaper than smiting during one.

**Possessing players** experience threats as **one smol in the line**.
- **The call:** when a major starts, the card offers "⚔ go down and fight beside them". This is free possession of the bravest armed adult (normally 3 sparks).
- In first person they have spear thrust, bow (hold to draw, release to shoot), shield raise, a "follow me" shout (nearby smols' rally), and pick-up-and-carry for a wounded friend.
- **Fewer storyteller events while possessing.** Colony-wide majors are held back (they queue unless the player accepts the call). What spawns instead are **local encounters** within 40 tiles of the possessed smol: a boar in the brush, a grump hunting party crossing a ridge, a snatcher at a lone campfire. This is Kenshi's "the world is dangerous where you walk".
- **Death is real.** A possessed smol can die. The screen goes white, you're pulled back up to the sky, and the funeral follows. It's capped: before builder, the possessed smol's health floor is 0.15 unless it walks into grump territory.
- **Survival mode** (the coming full-time possession mode) uses the same budget with a "survivor" persona. N is the possessed smol's band, and W is what that band carries and has built. The war moon becomes "they're hunting you tonight".

---

## 2. The grumps, redesigned

### 2.1 Who they are (short form; the full version is in the lore bible, §5)

The grumps call themselves the **Hrum** ("the full-bellied"). They came to the island **generations before the first pod**, as the crew of the warship that chased the smol ark. The warship crashed into the mountains, and the island's **Hush** (the field that shrinks minds) took them down to spears and drums, exactly as it's doing to the smols now.

They remember none of it, except as **religion**: "the belly before the brain", "big thinking eats people", "the sky eats thinkers". Their holy forbidden place is the **Iron Hill**, the warship's rusting hull under a hill of moss. They're natives the way anyone is native after twelve generations.

They aren't evil. They're a frightened, proud, hungry people whose ancestors made a terrible mistake with a mind-machine (§5.3). Smol thinkers building crystal towers look to them exactly like that mistake happening again.

### 2.2 Culture

- **Clans (2–4 per island, by island size):** each is named for its land and totem animal. Examples: the *Tusk* clan (boar, savanna), *Thorn* (jungle), *Ash* (volcano or ashlands), *Gull* (coast), *Moss* (pine woods). Each clan has a home camp, a **territory** (a soft-edged blob of about 40–70 tiles around it, drawn on the minimap as a faint hatched tint once scouted) and hunting grounds.
- **Leadership:** a **Big Belly** chief (the biggest, most generous feeder, because status means feeding others) and a **Smoke-Mother** shaman (an elder grump who reads smoke, keeps the taboos and drums).
- **Values:** food, strength, hospitality and loyalty to the clan. They're contemptuous of thinking and of "soft hands".
- **The salt law:** a guest who has eaten at your fire can't be struck until they've slept. This is the hinge for diplomacy (feasts).
- **Art:** ochre handprints on rocks, bone-and-feather totems, war masks made of bark. **Music:** drums and throat-hum, which are audio cues the player learns to dread.
- **The year:** they fatten in summer, raid in autumn (hunger plus the war moon) and stay mostly home in winter. A clan you **fed in autumn doesn't raid that winter.** That's one simple, learnable rule.
- **Language:** a second procedural language from `lang.js` (guttural phonotactics: hr-, gr-, -um, -ok). Smols learn grump words by contact (captives, trade, absorbed grumps). Diplomacy needs a smol who knows 6 or more grump words (a **talker**, which becomes a new title).
- **Exiles:** a grump born with a big brain (mutation) is driven out by the Smoke-Mother. Exiles turn up at your village like strangers. They're the first friendly contact, and the first grump you can absorb.

### 2.3 Camps (making `sites.js` camps real places)

Today a camp is a site with a cage and three guards appearing on a card. Make it a small grump village:

- **Layout:** hide tents (1 per 2 grumps), a smoke fire, a totem, a meat rack (food you can raid), a cage, a thorn ring (their palisade), and a lookout pole from village era on.
- **Population:** `camp size × 3` grumps living there. They hunt by day in their territory, sleep at night (except war parties), and guard in shifts. **Daytime camps sleep at noon.** That's the stealth-rescue window in first person.
- **Camps defend.** The lookout spots you and the drum sounds. Spears form at the thorn gate, archers shoot from inside the ring, and kids and elders flee to the tents. Camps hold their ground (they won't rout at the first whacks the way raiders do) until the chief falls or the fire is put out.
- **Outcomes when you raid one:** free captives, take the meat rack, smash the totem (the clan's hostility goes to max, a **revenge war** is queued, the clan's strength −2), or **burn it** (the clan scatters into its other camp or becomes a homeless warband that harasses you for a season). Or **leave it alone and parley.**
- **Camps grow** (the existing camp size 1..5). At 5, a camp **splits** and founds a second camp nearer to you: this is how the frontier pushes in on a passive player.

### 2.4 Hostility and disposition (the Kenshi layer)

Each clan has `hostility 0..1`, `respect 0..1`, `debt`, and a memory list (like smol opinions: `[delta, time, reason]`).

| Pushes hostility up | Pushes hostility down |
|---|---|
| Cutting trees or hunting inside their territory (Against the Storm): +0.01 per log or hunt | Gifts left at their totem (food ×1, honey ×2, cooked meat ×2, pots ×3) |
| Killing grumps (+0.1 each) | Ransoming captives back (+respect) |
| Burning a camp (+0.5) | Feasts under the salt law |
| Building near their border | Returning a grump-raised smol |
| Your era jump | Defeating a rival clan they hate |
| Growing crystal towers (they fear "sky-eating") | Time (−0.02 per game day) |

**Respect** rises when you beat their raids, and it lowers the size of the parties they send (they won't throw warriors at a strong village). **Hostility** makes them come anyway. That gives four moods:

| | low hostility | high hostility |
|---|---|---|
| **low respect** | bully: demands tribute | raider: the default early on |
| **high respect** | trader / ally | sworn enemy: sieges and revenge |

### 2.5 Weapons and tactics

The grump weapon progression (each step learned *from seeing it*, generalising `T.gear`):

| Clan era | Weapons | Learned from |
|---|---|---|
| stone | fire-hardened spear, club, thrown stones | always |
| stone, late | sling, small bone shield | seeing your slingers |
| village | **bow and arrow** (short self-bow), shields of hide | their own invention at clan size ≥3, or seeing your archers |
| village | ladders, rams (exist), torches (exist), poison darts (Smoke-Mother) | your walls, your fire |
| bronze | copper spear points **stolen in raids**, war-hogs (boars they tame) | raiding your workshop (any raid that wrecks a workshop or steals metal moves their era +0.5) |
| relic | **thunder-rods** from the Iron Hill | a clan reaching it (§2.6) |
| powder | matchlocks | captured smol muskets, or grump-raised smols who knew powder |
| industrial | rifles, motor-bikes (only enemy clans, §2.8) | |

**How the AI thinks** (cheap, rule-based on top of the existing grump creature; no new brain):
1. **Formation:** spears in front, archers 6–8 tiles behind, the Smoke-Mother at the back drumming. The drum gives +courage to grumps within 10 tiles, and killing or scaring her breaks the drum.
2. **Target choice:** archers pick isolated smols and unarmed workers; brutes pick walls; scouts pick kids and food; fire-throwers pick thatch.
3. **Morale:** each grump has `nerve`. It falls with nearby grumps routed, the chief down, fire, and the smol-to-grump ratio, and it rises with the drum and with numbers. When the group's average nerve is below 0.35, the whole party **routs**. They carry their wounded, which is cute and humane, and grabs stop.
4. **Retreat and remember:** the party's report updates the clan's lore (ladders, rams, torches today, and from now on: "they have archers on towers" → harass from out of range or bring shields).

### 2.6 Do grumps get guns? Yes, first, from their own wreck, and that's the point

- **The Iron Hill** is a site under a mountain (one per island, the warship's grave). The Hrum forbid it, but clan hostility, desperation or a fanatic chief can open it.
- When a clan opens it (a storyteller beat at the earliest at the smols' thinker era, or bronze culture), its **Wakers** carry **thunder-rods**: warship sidearms that still fire when fed a **thought crystal** shard. Each shot burns a crystal. That creates **crystal conflict**: grumps start raiding **crystal caves**, and smols need those same crystals for lenses, resonance and the spire.
- A thunder-rod bolt breaks a palisade section, sets thatch alight and can kill outright. Raids carry at most 1–2. **This is the mid-game shock.** It's the moment the game stops being cosy, and it comes with a clear answer: take the Iron Hill. That's a set-piece expedition, the first big possessed mission.
- Capturing the Iron Hill gives smols the relic weapons (a few, crystal-hungry), the **warship's logs** (lore, §5.6) and a **leap in metallurgy** (iron ideas). The Iron Hill becomes the bridge into the gunpowder era.
- After that, guns spread the way every idea spreads in this game: **by watching**. Grumps who fight your musketeers learn powder. A clan you've made peace with **trades** for it. An enemy clan steals it.

### 2.7 Grump-raised smols (Dwarf Fortress's snatchers)

- A smol **kid** held captive longer than a game day (20 minutes) isn't released on the escape timer any more. It's **adopted**. It grows up in the camp, learns grump words and fights with a spear.
- It **comes back in later raids** as a raider, with its name kept and a marker over its head that the parents recognise (its parents get a memory: "that was our Pip"). A smol that whacks it gets "I hit my own child" grief.
- It can be **brought home**: capture it (beaten down, not killed), win it over (time, a mother's cuddle, tickles), or ransom it. If it comes home, it's a **bridge**: a fluent grump speaker, and the best possible talker for diplomacy.
- This turns the branch's kidnap system from "a timer to rescue someone" into one of the game's best stories. It's also a strong reason to guard kids.

### 2.8 Trade, alliance, absorption: three fates for each clan

Every clan ends on one of three paths. The paths are visible in a **clan panel** (portrait of the chief, mood, territory, what they want, recent memories).

1. **Enemy.** The default if you only fight. They escalate on the table above. If they're never beaten, they become **insurgents** in the industrial era: rifles, bikes and raids on rail lines and supply carts (the hook for the car and city era). Ending them takes **taking their last camp**. Avoid genocide framing: a beaten clan *scatters* and its remnant is offered absorption.
2. **Trader / ally.**
   - Steps: an exile, a talker, gifts, a **parley** card at the clan's totem (the god can bless it), a **peace feast** under the salt law, then a **trade post** structure at the border.
   - **Caravans** arrive every 2 game days: furs, flint, war-hog piglets, herbs and grump-raised ransoms, in exchange for honey, cooked food, pots and copper.
   - Allies join your **war moon defence** against enemy clans, and their warriors fight beside yours. They **never trade ideas**: their taboo holds until they're absorbed.
3. **Absorbed.**
   - When an allied clan's hostility < 0.1 and respect > 0.7 for a game year, or a scattered remnant asks to join, grumps can **move into your village**. They're a new kind of citizen: strong, hardy in winter, excellent guards and haulers, poor learners.
   - Grumps and smols **can't interbreed** (the species rule stays). Grumps born in your village are raised by your teachers, and **echoes work on them too**, so over generations grump-kin brains grow. **The Hush lifts for them as well.** Within 6–10 generations an absorbed grump line can reach thinker.
   - This is the emotional payoff of the lore (two fallen peoples, one island). In the city era it gives a **grump district** with its own drums and food.

**Opinion:** a "good" run should be able to end at peace with every clan, and the hardest, most dramatic runs come from making one enemy for life. Never require war. Always make war tempting: grump land has the best flint, crystals and the Iron Hill.

### 2.9 How they look

- **Silhouettes by role**, so they read at god-view zoom:
  - spear: a long diagonal line
  - archer: a bow arc and a quiver
  - brute: wide, carrying a shield
  - Smoke-Mother: a tall headdress and a smoke wisp
  - scout: small, crouched
  - Waker: a glowing rod, red tip
- **Bodies:** keep the red eyes and the brow. Drop the purple antenna. Add face paint by clan colour, a bark mask for warriors and hide wraps. They're bigger and heavier than smols, with tusks for the Tusk clan.
- **Kids and elders** are visible in camps. This is important: they're a people, not mobs.
- Grumps in `pixel.js` get 4 role overlays plus a weapon layer (like tribe headbands today). Arrow and bolt projectiles are drawn as `ln()` segments in `threats.js`'s existing draw hook.

---

## 3. Defense

### 3.1 Structures (new STRUCTS; costs are suggestions)

| Structure | Era / idea | Cost | Effect |
|---|---|---|---|
| **Palisade** (exists) | builder / walls | sticks | Grumps blocked for 25 s, then 11 with ladders, 6 with rams (`T.wallTime`). |
| **Gate** | builder / walls | sticks 3, fiber 2 | Smols pass, grumps don't. Gives walls a purpose without trapping your own people. |
| **Ditch and stakes** | builder / walls | none (just work) | Slows grumps ×0.5. Hog-riders can't cross. |
| **Watchtower** | builder / new idea "lookout" (needs walls) | log 3, fiber 2 | +25 tiles of sight that clears fog. **+30 s raid warning.** A smol on it with a bow gets +50% range and is hard to hit. Towers spot snatchers at night with a torch. |
| **Alarm drum / bell** | tribe / song | log 1, fur 1 | When grumps are seen, sounds the 📣 "run!" call (kids and elders to huts) and a new **"fight!"** call (militia to the rally). It works through the existing call system and the brain learns from it. |
| **Training yard** | tribe / club or spear | sticks 4, straw dummy | A **grump dummy**: a scarecrow that the attention lobe reads as the noun `grump` (§3.3). Sparring is safe practice. |
| **Armoury rack** | builder | log 2 | Weapons are stored here, and militia grab them when the drum sounds (no more "nobody had a weapon in hand"). |
| **Stone wall** | thinker / kiln + new "masonry" | stone 4 | Rams take 3× longer. Torches can't burn it. Thunder-rods still break it. |
| **Fire buckets / well** | builder | pot 2 | Firefighting job, which counters fire-throwers. Also clean water against disease. |
| **Pit trap / snare** | tribe / weave | fiber 2 | One-shot. Hurts and holds a grump for 10 s. Also catches bunnies. |
| **Bastion / gatehouse** | iron | | Walls you can shoot from. |
| later eras | powder → industrial | | Earthworks, gun towers, searchlights (city era). |

### 3.2 Weapons and the militia

| Weapon | Idea (tier) | Damage | Range | Notes |
|---|---|---|---|---|
| bare paws | — | 0.05 | melee | Today's shove. |
| club | clubs (2) | 0.25 | melee | Exists. |
| spear | spear (2) | 0.3 | melee, reach | Exists. Keeps boars at bay. |
| **sling** | new, weave + bonk (2) | 0.12 | 8 | Ammo is stones. A kid-friendly hunting tool. |
| **bow** | new, weave + knap (3) | 0.22 | 14 | Ammo is arrows (stick + flint). |
| **shield** | new, weave + fur (3) | — | — | Arrows −60%. |
| copper spear / axe | smelting (5) | 0.4 | melee | |
| **crossbow** | iron era | 0.45 | 18 | |
| relic rod | Iron Hill | 0.9 | 25 | Each shot burns a crystal. |
| musket → rifle | powder → industrial | 0.8 / 1.0 | 20 / 40 | |

**Ranged without changing the brain layout:** fire a bow with the existing `use` verb aimed at a creature noun at a distance, the same way tools already work through `Ideas.toolKind`. Arrows are short-lived projectile objects in `threats.js` (position and velocity, hit test against `creaturesNear`, drawn with `ln()`). Spent arrows drop as items (craftable again).

**The militia** is a new `guard` interest in the jobs panel (`orders.js`).
- Guards carry a weapon, patrol the home zone, man towers, and sleep in shifts so someone is always awake at night.
- On builder or higher, a **"guard post"** order puts one at a tower or the gate.
- Guards cost labour, because guards don't farm. That's the economic tension RimWorld gets from colonists drafted away from work.

### 3.3 How brains learn to fight or flee (the bit nobody else can do)

The existing net already chooses between `hit` and `flee` toward the `grump` noun, with gene biases (`creature.js:474-476`). Make that a real learned skill instead of a gate:

1. **Reward shaping in combat.** A hit that makes a grump flinch gives +reward. A routed grump gives a big reward to every defender within 8 tiles. Protecting a kin or a friend (being between them and a grump) gives +reward. Pain gives punishment (exists). Fleeing to safety relieves fear, which is a reward already. So a net that fought and won **learns hit→grump**, and a net that got beaten learns **flee**. Both are realistic, and both are visible in the brain viewer.
2. **The grump dummy.** Sparring at the training yard is `hit` on a noun-`grump` object with **reward and no pain**. Drill teaches the attention→verb mapping safely. It also counts toward the `fight` habit, which **echoes into the kids' bravery and strength** (add `fight` → `bravery` to `FirstHour.ECHO`; the habit already exists at `creature.js:1086`). A village that drills breeds braver children, which is the echo twist applied to war.
3. **Nerve** (a learned, non-genetic mind stat in `mind.js`).
   - It rises with victories and drills, and falls with wounds, seeing a friend die and being kidnapped. It's added to the gene bravery in the stand-or-hide test (`threats.js:316` uses the gene alone today).
   - **Veterans** get a title ("shield-wall", "grump-chaser" exists) and calm the smols near them.
   - **Shaken** smols (a nightmare memory, a dream replay of the raid) flee at the drum for a season. Give them a cosy fix: tickles and a friend's comfort.
4. **Group morale.** Each side has a morale bar: armed friends near you, a veteran or chief, a war song (the `song` idea becomes a **war chant** at builder), walls at your back and the drum all add to it. When the bar breaks, smols run too. They're not soldiers, and that's the point.
5. **Commands.** The words `wait` (hold the line), `run`, `come` (rally) and the new `fight` are calls. Smols who **know the word** obey more reliably, which makes word-teaching matter for defence.
6. **Thinkers plan.** At thinker, the goal system (`mind.js` goals) gains **"ambush"** (hide in the trees along the raid path) and **"fetch the wounded"**. These show as plan bubbles, so you *see* a smol think tactically.

---

## 4. Toning down the romance and cuddle loop

**Goal:** romance becomes **a few real love stories per generation**, not ambient hearts. Babies and blobs stay pure cute.

### 4.1 Numbers (with today's values for comparison)

| Change | Today | Proposed |
|---|---|---|
| Love rise rate | 0.009·(0.5+fert)/s, about 50 s to smitten | **0.0022·(0.5+fert)/s**, about 3.5 min, and only when **settled** (below) |
| Settled gate | fed and healthy | fed (<0.5), warm, mood >0.5, not grieving, not on alert, **and** from builder on a home or hut to nest in |
| Season | none | spring ×1.6, summer ×1.0, autumn ×0.6, winter ×0.25 (a courting season, which also makes spring babies a visible event) |
| Egg cooldown | 170 s | **900 s** (≈ ¾ game day), plus `40 × kids under adult age` s (raising kids takes time) |
| Breeding requires | love sum ≥0.8 | love **and** opinion ≥ friend (25) **and** they're partners (§4.2) |
| Housing cap | none | from builder: eggs pause when `smols > 3 × huts + 2` (Banished's housing rule) |
| Egg cost | none | the mother's fat −0.25, and the tribe store −2 food. Eggs pause during famine (partly exists). |
| Cuddle FX | hearts every cuddle | hearts only for partners and parent–kid. Friends **hug** (a small emote, no hearts). Tribe+ adults don't cuddle strangers. |
| Loneliness | fixed by anyone nearby | fixed by **talking, working together, eating together and song**. Cuddling is one option among many. |

### 4.2 Courtship (short and readable)

The steps are: acquaintance → **friend** → **courting** (they seek each other out, and give a gift or share a meal 2–3 times; each is a diary line) → **partners** (a small ceremony at the fire from tribe on: "Ula and Bren are partners now", a chronicle line and a song) → eggs.

**Rejection exists:** a gift refused because opinion is too low gives a "turned me down" memory, which hurts a bit and makes them a little shy.

### 4.3 Jealousy and drama (social.js already has the machinery)

- A partner who sees their partner **hug** a non-family adult they rate below friend: "jealous" memory −15, and anger. If the two are rivals, it's a shove.
- Repeated, or a cuddle with a third party: a **breakup** (−40, "left me for…") and a possible brawl. It goes in the chronicle.
- **Widows and widowers** grieve (exists). They can re-partner after a season, and their kids may resent the new partner (−opinion).
- **Love triangles** come for free once love needs a target and opinions shape it.

### 4.4 Work as the cure for cosy

From builder on, adults have a **duty drive** (a chemistry drive like boredom). It rises while idle, is relieved by jobs (orders' job interests), and gives a "useful" mood bonus. Idle adults among working ones feel guilty and get a slight opinion hit from workers ("lazy"). Threats (stores, walls, guards, firewood) give the duty somewhere to go. **Kids keep play.** Elders keep stories (§5.7).

### 4.5 Faces and behaviour: cute babies, normal adults

- **Sprites:** the tribe+ adult default mouth becomes a **flat 2-pixel line**. Add an `FR.smile` frame used when `mood > 0.65` or a happy emote, plus a grin/beam frame for joy. Add a **gritted** frame (combat, cold, hauling) and a **tired** frame (half-lidded eyes when tired > 0.6).
  - Blush cheeks only on kids, or when love > 0.6 or embarrassed. Babies and critters keep the smiling default.
  - The atlas goes from 12 to 15 frames: acceptable, because `pixel.test.js` will catch layout issues.
- **Proportions:** from tribe on, eyes are 1px smaller relative to the head, the body is a little taller, the idle bob amplitude is halved, the squash on landing is softer and walk bounce is −40%.
- **Idle behaviour:** adults idle by *doing*. They sit by the fire, sharpen a spear, carry wood, stretch their back, scratch their head, look toward the threat direction at dusk. Most of these exist as actions and can be idle variants in `creature.js`.
- **Emote frequency:** a cap of 1 emote per adult per 20 s, except in strong states. Fewer floating icons means each one matters.
- **Speech:** the tribe+ phrasebook shifts from "nice day!" toward work, worry and wry humour ("wood won't stack itself", "drums again last night", "my back").

---

## 5. Lore bible

**Tone:** Ghibli, Outer Wilds and Creatures. It's gentle on the surface, deep underneath and melancholy at the edges, and nobody is simply evil. Every fact here should be **findable**, never dumped.

### 5.1 The shape of the story in one paragraph

Long ago, a people called the **Lanterners** built the island. It's a **Cradle**: a living machine that takes in fallen, broken minds, makes them small, and lets them grow back slowly and well. The Lanterners grew themselves back this way, then joined into one great mind and went up into the sky. The **smols** fled their dying world Vesh in an ark guided by a mind-machine of their own, the **Thought Engine**. They were chased by the **Hrum** (grumps), whose own mind-machine had once swallowed their civilisation, and who swore to destroy every Engine they found. Both ships fell to the Cradle generations apart. Both peoples were made small. **You, the sky, are what the Lanterners became**, or what's left of them: an old, dim, forgetful mind that wakes when someone falls and **feeds on thinking**. Whether that's a gift or a hunger is the last mystery, and the ending lets the player decide.

### 5.2 The smols

- **Vesh:** a soft, green, low-gravity world around an orange star that was **going out** (it was dimming, not exploding). Smol civilisation was gentle, musical and choral. They thought **together**. Their great invention was the **Thought Engine**, a crystal lattice that let many minds think as one ("the Choir").
- **The ark (3127):** 4,000 sleepers in pods. The Engine charted a 300-year course to a new world. **Why pods?** Pods were the ark's lifeboats *and* its sleeping berths: every sleeper lay in a pod that could break away. When the warship's beam broke the spine, the pods scattered into orbit around the nearest world, the Cradle.
- **Why pods keep falling:** their orbits decay at different rates. Inside, sleepers are frozen and time doesn't touch them. On the ground, generations pass. **So a pod that lands in the late game holds someone who remembers Vesh perfectly.** A *late pod survivor* could be a fully clever adult in a tribe of blobs' descendants, who is confused and grieving and quickly made simpler by the Hush. That's a powerful character (a strangers variant) and a living source of lore that **fades as you talk to them**. Ask your questions fast.
- **The First Two:** the twins from the opening pod. Their names become myth, and later eras call them "the Mother and Father of the island". The funeral of either founder is a scripted chronicle chapter.

### 5.3 The Hrum (grumps)

- **Origin:** Grumma, a cold, heavy world of hunters. Their mind-machine (they called it the **Great Mouth**) joined their minds to end their wars, and it **ate** them: individual Hrum faded into it, and their cities went silent ("**the Quieting**"). The few who tore themselves free started a creed of **"the belly before the brain"** and became Engine-hunters. They believed they were saving the galaxy from what had happened to them. The warship that chased the ark was on that crusade.
- **The fall:** the smol ark's last shot crippled the warship. It crashed into the Cradle's mountains **about twelve grump generations before the first pod opens** (because of the orbit timing above). The Hush took them down. Their crusade became religion, the warship became the **Iron Hill**, the forbidden mountain, and their memory of the Great Mouth became fear of **the sky**: "the sky eats thinkers".
- **What they're right about:** the sky *does* feed on thinking (sparks). The Lanterners *did* join into one mind and vanish. The big thought *is* a joining. **The grumps are the game's skeptics, and they have evidence.** The player should feel this by the thinker era.
- **What they're wrong about:** whether joining is always eating (the ending, §5.9).

### 5.4 The island (the Cradle) and the Hush

- The island is grown, not natural. Its **thought crystals** are the Cradle's nerves. They hum near minds, and they amplify and record thought (resonance and lenses use this). **The Hush** is a field from deep under the island that shrinks every mind that lands until it "starts again small". This explains in-world why pod survivors' kids are simpler (pod logs 4–5 already say "the island is changing us"), why grumps are primitive, and why echoes work ("the island listens to what you practise").
- **Biomes as Lantern gardens:** the glowshroom groves, crystal steppe and blossom groves are old Lantern gardens gone wild. Late-era thinkers recognise the patterns as *planted*.
- **Hush pulses** are a lore disaster (§1.3). Once or twice in a long game, the Cradle "breathes" and every smol forgets one idea not kept on a story pole. The existing lost-knowledge and dark-age system becomes **diegetic**, and story poles become a defence.

### 5.5 The god (you)

- In-world names: **the Sky One** (smols; the phrase already exists in `social.js`), **the Mouth Above** (grumps), **the Gardener** (Lantern carvings).
- **What you are:** the Lanterners after they joined. A tiny piece of a vast old mind, mostly asleep, woken by the crash of the first pod. You have no memory to begin with (the player's own ignorance is in-world).
- **Sparks** are thought that the Cradle gathers from smols learning (exists: sparks come from learning, discoveries and answered prayers). Miracles spend it. **You literally run on their minds.** That's the dark seam: the ruins and the grumps point at it, and the ending resolves it.
- **Your memories:** at spark milestones (100 / 500 / 2,000 lifetime sparks) you get a **sky memory**, a 10-second pixel vision of the Lanterners (a garden, a joining, a light going up). This is how the god's own story is told: in images, no text beyond a caption line.

### 5.6 Ruins, relics and logs to find

**Four document sets**, each found a different way:

| Set | Count | Where | Readable when | Teaches |
|---|---|---|---|---|
| **Ark logs** (exist, 7) → 12 | 12 | Pods (live crashes) | Always (they're in smol script) | Vesh, the ark, the chase, the pods, the big thought as a signal |
| **Late pod survivors' memories** | per survivor | Talking to them before the Hush takes it (3–5 lines that fade) | Always | Vesh life, the Choir, names of the ark's crew |
| **Warship logs** ("iron tablets") | 8 | Iron Hill, grump camp totems (looted or gifted), grump-raised smols | Need a talker (grump words), and fully readable after absorbing a clan | The Quieting, the Great Mouth, the crusade, the crash, the first Smoke-Mother's vow |
| **Lantern murals** | 6 panels per ruin site, 3 sites | Ruins (exist: carvings teach an idea) | Pictures always; the captions resolve at writing, then astronomy | The Cradle's purpose, the Hush, earlier species who went through it (some failed: a ruin of a people who never grew back), the Joining, the Gardener |

**Relics** (unique items, one of each per island, shown on a **relic shelf** structure from tribe on; each gives a small effect and a codex line):
- **The founders' pod badge:** the twins' crest. +mood near it.
- **The ark star chart:** found in pod 12. Astronomy is faster.
- **A Vesh music box:** plays the main theme. Song spreads faster.
- **A Smoke-Mother's drum:** taken from a camp, or given at peace. It can sound a grump call, and grumps hear it as kin.
- **A bark war mask:** the first chief beaten or befriended.
- **A thunder-rod:** Iron Hill.
- **The Lantern lens:** a ruin's last chamber. Resonance doubles near it.
- **The captain's ring:** in the last log pod. Needed for the signal ending.

### 5.7 Mysteries that unfold across eras (Outer Wilds' rumour map)

| Era | The question smols start asking | Clues | Resolves when |
|---|---|---|---|
| blob → critter | "Why do our kids forget words?" | Pod logs 4–5, the hatch reveal card | Tribe: an elder story names "the Hush" |
| tool-user → tribe | "Who are the grumps? Why do they hate thinkers?" | Camp totems, captives' stories, a grump exile | Village: first parley; a Smoke-Mother tells the Quieting as a myth |
| builder | "Who carved the ruins?" | Murals 1–3, planted biomes | Thinker: murals 4–5 read with writing |
| thinker | "What is under the Iron Hill?" | Grump taboo, thunder-rods, warship logs | Taking or being given the Iron Hill |
| thinker → ascended | "Who is the sky? Why does it want us to think?" | Sky memories, mural 6, grump warnings | The ending choice |
| new game+ | "Are there other Cradles? Is the ark real?" | NG+ islands start with a *different* ruin set; the ark log says "Cradle 3 of 7" | NG+3: the Lantern ending (§5.9) |

**The UI:** a **mystery board** in the menu (next to the chronicle). Each question is a card. Clues attach as small chips with where they came from (an icon and the smol who found it). A "?" glows when a new clue lands. It's the only lore UI that holds text, and each entry is 1–2 lines.

### 5.8 How lore is delivered in play (no walls of text)

1. **Discovery cards** (exist for sites): **3 lines max.** The flickering screen in a pod shows one log line, and the full text goes to the board.
2. **Visions:** the existing vision card gets **lore visions** for thinkers sleeping near crystals or ruins. A 6–8 second pixel cutscene through `intro.js` scenes (it already has pod-fall and ending scenes), with one caption.
3. **Elders' stories** (oral history).
   - Elders (stage 4) at the campfire at night tell a **story drawn from the chronicle**: real events from your island, retold.
   - **Legend drift:** each retelling by a new generation mutates one detail. The numbers grow ("three grumps" → "a hundred"), the hero's name sticks, and the sky gets credit for luck. So **myths form from your actual play** ("Ula who stole the lightning" was a smol who found fire next to a lightning strike).
   - Speech bubbles, 3–5 lines, listeners gather. Story poles **freeze** a version (writing stops drift), which makes writing matter for culture too.
4. **The chronicle with chapters:** auto-titled eras ("The Age of Spears", "The Red Moon Years", "The Peace of the Tusk"). Each chapter opens with a generated one-line summary.
5. **Things in the world:**
   - Ochre handprints on rocks near grump land.
   - Smol cave paintings that your own smols draw of your history (an art idea at tribe: they paint the war moon, the founders, the sky hand).
   - Rusting warship plates sticking out of the Iron Hill.
   - Lantern glyphs on cliffs that glow when a thinker passes.
6. **Conversations:** add topics to `social.js` (the stars topic exists): "the Hush", "the old ship in the mountain", "do you think the sky is hungry?", "the grump who traded with us". Doubters and the faithful argue, which is internal strife with a theological flavour.
7. **The grumps' side:** after peace, a grump storyteller at your feast tells *their* version of the same events (from the warship logs). The same history, the other view.

### 5.9 The ascended ending and new game+

Today: finishing the spire plays the signal, the ark returns and pods rise.

**Proposed:** the spire is the **big thought**: every smol mind joined at once. When it completes, the **god speaks for the first time** (one line), and you choose:

1. **Call the ark: "go home".** The current ending: the signal, the ark, pods rising. The smols leave as **individuals**. The Cradle sleeps. NG+ is a new Cradle, with heirs as today.
2. **Join the sky: "become the Gardener".** The smols do what the Lanterners did. The light goes up into you. Grumps watch in horror or in wonder, depending on peace. NG+ starts with **more of you**: +sparks, a remembered sky memory, and your ascended tribe as a **second voice** in the god UI. That's a mechanical heir and an emotional one. *The grumps were right, and it was beautiful anyway.*
3. **Stay: "the long thought".** No signal. The smols keep their island and their own minds and grow on into the **city eras** (powder → steam → electric). This is the **sandbox continuation** for the owner's tech arc. Grumps, if absorbed, build the cities with them. The signal can still be sent later from a radio mast in the city era (ending 1 or 2 deferred).

**The capstone across NG+ rounds:** each new Cradle is "Cradle 2 of 7", "3 of 7" and so on, with its own ruin set and its own failed species. On round 3+, a final pod log reveals that the ark was **never destroyed**. It's still out there, its Engine asleep, waiting for a Cradle to finish one. The "Lantern ending" is unlocked by finishing a run at peace with every clan *and* joining the sky: the ark arrives, the Engine and the Gardener meet, and the island-scale god becomes a **star-scale** one. The credits roll over every island you've played.

**Survival-mode tie-in:** in survival mode you are a **late pod survivor**: clever, alone and losing your mind to the Hush every night. It's a ready-made premise.

### 5.10 The tech arc in lore terms (guns, cars, cities)

Split the **biological ladder** (genes: blob → ascended, exists) from a new **cultural era** track, so cities don't need new biology:

| Era | Unlocked by | Defining threat |
|---|---|---|
| Stone | tool-user ideas | prowlers, snatchers, winter |
| Village | huts, walls, farms | war parties, first sieges, predators |
| Bronze | smelting | crystal raids, war-hogs, plague |
| **Iron Hill** | taking or being given the wreck | Wakers, a clan war |
| Powder | iron + a new "black powder" idea (sulfur from ashlands vents) | muskets on both sides, a rival smol tribe war |
| Steam / roads | iron + windmill → engine | carts and rails raided, insurgent clans with rifles, pollution sickness |
| Electric / city | signal tech | rival smol nations, strikes and unrest (internal strife at scale), disasters hitting dense cities, **the Hush pulse at city scale** (the "great forgetting" crisis: libraries and writing as defence) |

The ending choices can fire from the late Bronze era on (the spire, as today) **or** from the Electric era (a radio mast), so the old ending still works and the long game has its own.

---

## 6. Rival smol tribes and internal strife (short, because they lean on systems already built)

- **Other pod tribes:** pods whose survivors climbed out unrescued (exists) have a chance to **settle** instead of walking to you. Over time they become a tribe with their own village, language dialect, tier (one behind you) and memory of you (did you rescue them? send their stranger away?).
  - Trade, **marriage exchange** (the clean answer to the kin rule: send a smol to marry in, receive one back) and rivalry over land.
  - War only from thinker on, because smol-on-smol killing is a heavy beat, gated by the culture it makes sense in.
- **Schisms:** when a tribe is large (>25), unhappy (avg mood < 0.4 for a game day) and has a charismatic rival leader (titles + opinions), a **schism card** appears: some leave to found their own village. That's a rival tribe made from your own people, with family split across the border.
- **Faith split:** the faithful (answered prayers) against the doubters (spoiled, or grump-talker-influenced). Doubters pray less, and the faithful shun them. It's a soft strife that rises as the lore reveals the sky "eats thinking".
- **Leadership:** a **chief** title at tribe level (the highest respect). The chief's death triggers a **succession** where rivals can fight. A chief who hoards food gives an inequality grudge, then theft (exists in `mind.js`: hidden food, lies).
- **Crime and exile:** the existing feud exile card becomes a source of **bandits**: exiles who survive come back raiding.

---

## 7. Phased plan (highest impact first)

Sizes: **S** ≈ a day, **M** ≈ 2–4 days, **L** ≈ 1–2 weeks of agent work, including tests in `tests/*.test.js` and a soak with `sim.test.js`.

### Phase 1: make it not cosy (ship in one release)

1. **[S] Land the threats branch.** Restore the deleted v4.1 DESIGN bullet, add a DESIGN section for threats, and run the full test suite and a 2-hour soak.
2. **[S] Romance numbers** (§4.1): love rate, the settled gate, seasons, egg cooldown 900 s, housing cap, egg cost, hearts only for partners and kids. Re-run the egg and population balance sims; the target is population still stable in 2-hour sims, with ~1 egg per pair per game day.
3. **[S] Adult faces** (§4.5): a neutral mouth from tribe on, smile/grin/gritted/tired frames, blush gating, halved bob. Pixel tests.
4. **[M] Courtship, partners and jealousy** (§4.2–4.3) in `social.js`, plus the duty drive (§4.4).

### Phase 2: grumps as a people with spears and bows

5. **[M] Grump roles and looks:** scout, spear, archer, brute, Smoke-Mother. Role overlays in `pixel.js`, unit costs, and the raid party built from the budget.
6. **[M] Ranged combat:** projectiles in `threats.js`, bow and sling ideas, the shield, arrows as items. Smol bows through `use` on a creature noun.
7. **[M] Grump AI:** formation, target choice, nerve and routs, generalising `T.gear` "learn what they see" to slings, bows, copper and powder.
8. **[M] Camps as places:** tents, a meat rack, a lookout, thorn rings, a day/night routine, camps that defend, camp splitting at size 5.
9. **[S] Grump-raised smols** (§2.7) on top of the existing captive code.

### Phase 3: storyteller 2.0

10. **[M] Threat budget, adaptation, tension meter and personas** (Moss, Weaver, Thunder) in `director.js`. Raid strategies: assault, snatch, harass, siege.
11. **[M] Telegraphs and the war moon:** scouts, tracks, drums, a smoke war camp, the 2-day countdown. Siege behaviour.
12. **[S] Real-time caps and a possession hold** (majors queue while in POV, unless the player takes the call).

### Phase 4: defence

13. **[M] Gate, watchtower, alarm drum, armoury rack, ditch and stakes.** The `guard` job and guard posts in `orders.js`.
14. **[M] Learning to fight:** combat reward shaping, the grump dummy and training yard, `fight` echoing to bravery, the nerve stat, veterans and the shaken state, morale bars, and the `fight` call word.

### Phase 5: lore skeleton (can run in parallel with phases 2–4; mostly content)

15. **[M] The mystery board UI + a lore data file** (`lore.js`): questions, clues, relics, log sets. Expand the ark logs from 7 to 12, and add late-pod survivor memories (strangers variant).
16. **[M] Elders' stories with legend drift** from the chronicle, plus chronicle chapters by era.
17. **[M] Lantern murals at ruins** (6 panels, pixel art drawn in code like `intro.js`), lore visions and sky memories at spark milestones.

### Phase 6: survival pressure

18. **[M] Winter and famine:** firewood stockpile, a granary, cold snaps, the forecast long winter, blight and drought.
19. **[M] Disease 2.0:** crowding and water, the well, grump fever from shamans, epidemics and quarantine, brewing as cure.
20. **[M] Predators:** boar, snapjaw, shadow-cat, the Roc (the giant nest's mother), Old Tusk the megabeast, with territories and hunting pressure.

### Phase 7: diplomacy and fates

21. **[L] Clans:** territories, hostility, respect, memory, the clan panel, the grump language, talkers, exiles, gifts, parley, the salt-law peace feast, the trade post and caravans, ransom, allies at the war moon.
22. **[L] Absorption:** grump citizens, grump-kin echoes ("the Hush lifts"), a grump district.

### Phase 8: the Iron Hill and the mid-game shock

23. **[L] Iron Hill site, Wakers with thunder-rods, crystal raids**, the expedition (a set piece built for possession), warship logs, relic weapons, then iron ideas.

### Phase 9: rival smol tribes and strife

24. **[L] Settled pod tribes:** marriage exchange, trade, war from thinker on. Schisms, faith split, chiefs and succession, exiles turned bandits.

### Phase 10: eras and endings (the long arc)

25. **[L] Cultural era track** separate from tiers, then the powder era (both sides), with era-scaled threats.
26. **[M] The three-way ending** (go home / join the sky / stay), Cradle numbering in NG+, the second god voice from joining.
27. **[L+] Steam, electric and city eras**, insurgent clans, rival nations, and the great-forgetting crisis. This is scoped with the owner's tech-arc plan; it also hosts the survival-mode premise (a late pod survivor).

**If only three things ship next:** #2–3 (romance and faces, the owner's most visible complaint, S+S), #5–7 (grumps with spears and bows that fight in formation, M×3), and #10–11 (the budget, tension and war moon pacing, M×2). Lore #15 is the cheapest big story win and can be done by a separate agent in parallel.

---

## 8. Risks and guardrails

- **Don't break the cosy core for new players.** Grandmother Moss plus the pity floor keep the first hour gentle, and the first major threat comes at 25+ minutes on Weaver. Kids and blobs stay cute.
- **Killing.** Smols die in raids from tribe on, but the existing lethality rules (huts protect, only fighters and the lone-at-night die, wound floors) stay through village. Grumps **rout and scatter**: they're "chased off for good", never slaughtered on screen. Smol-on-smol war is gated to thinker+ and is always a choice.
- **Neural nets and combat.** Add reward shaping, not new verbs. The 18-output layout and `deserialize` migrations stay untouched.
- **Saves.** Every new state (clans, the tension meter, lore progress, relics) serialises like `T.serialize`: defensive revive, defaults for old saves. Old saves get a clan list generated from their existing camp sites.
- **Performance.** Projectiles are capped at 40 live. Camp grumps far from the camera use the existing half-rate thinking.
- **Lore discipline.** One fact per discovery, never more than 3 lines on a card, and the mystery board holds the rest. Never explain the god outright before the ending.
