# smol brains: digging, mining, building and bigger mountains (feasibility design)

Scope: Minecraft/Terraria-style work on the land without copying Minecraft. That means chopping, mining, picking and digging, going underground, free-form piece building while possessed, smols building their preset structures visibly piece by piece, and much grander terrain. Everything below is checked against the code as it stands (v4.2). No repo files were edited.

---

## 0. What the engine is today (the facts the design rests on)

| Fact | Where | Why it matters |
|---|---|---|
| The terrain is a single **heightfield**: `T.h` (Float32, (N+1)^2 vertices, 1 unit = 1 tile), `T.W` for water level, `T.slope`/`T.tileH` per tile. | `worldgen.js` `WG.generate`, `WG.heightAt` (exact triangle), `WG.waterAt` | There are no overhangs. Every system asks "ground height at (x,z)". |
| About 80 call sites read `groundY`/`heightAt`, from physics, AI, FX, UI and render. | `creature.js` 1571/1577/1685, `world.js physics()`, `bodies.js`, `possess.js`… | A real 3D world (voxels) would touch all of them. A layered model can leave most of them alone. |
| Terrain meshes are built **once** per chunk (32×32 tiles) per LOD (steps 1/2/4) and never invalidated. `R.markDirty` only flags the **instance** groups (trees, buildings) for rebuild. | `render.js` `buildTerrainLOD` L552, `chunkLOD` L615, `R.markDirty` L474, `drawObjects` L1247 | Digging needs a new terrain-dirty path. The vertex layout is fixed (6 verts × 14 floats per quad, quad order known), so a `bufferSubData` patch of only the touched quads is possible. |
| Terrain vertex = pos3 nrm3 col4 misc4. `aMisc.w` is always written as 0 and unused. | `render.js` L583–587, `VS_TERRAIN` | That is a free channel for "soil state" and "underground, no sun". |
| Walkability: `W.walkable` is slope ≤ 2.8 per tile, not deep water (bridges excepted). The A* runs on a 2×2-tile `pathGrid` (Uint8) with an expansion budget of 5–6k nodes. `W.openPathAt` already patches the grid locally (bridges). | `world.js` L152–227, `creature.js walkToward` L756 | The path grid can be updated per edit. Long detours around big ranges will blow the 5k budget. |
| Saves are JSON in localStorage (40–100 KB). The island regenerates from its seed and only node/item/structure **deltas** are stored. | `world.js W.serialize` L946, `save.js` L82 | Terrain edits, dug caves and pieces must be **sparse deltas**, packed (base64 typed arrays), never full grids. |
| Trees: a stone axe adds 0.34 per swing (3 swings), copper fells in 1. A felled tree becomes a `stump` that regrows after 600 s (`grow` 0→1 over 300 s). Boulders with a hammerstone drop a stone **forever**; nothing ever depletes. | `ideas.js I.use` L255–266, `I.fell` L231, `world.js tickFires` L412 | The lifecycle bones exist, but there are no hit points, no depletion, no felling visual and no surface/deep split. |
| Preset buildings: `cost` delivered, then `work` seconds. An unfinished site draws the **finished mesh squashed vertically** by progress (`0.1 + prog*0.9`) and tinted, which is the "x% built" look. | `bodies.js drawStructures` L301–306, `ideas.js I.work/I.complete` L650–675, `ui.js` L883 | Builders are pure code (`meshes.js` `Builder`, `STRUCT_BUILDERS` L536), so meshes can be cut into ordered pieces for free (§4.6). |
| Item cap is 420 loose items, with material budgets per smol. | `world.js` `CAP_ITEMS` L13, `budgets()` L540 | Mining and digging would flood the cap, so stacks/piles are needed (§2.5). |
| The first-person view sees 78 tiles (52 on low quality). Everything past that is fog. | `possess.js farFor` L107, `render.js povCamera` L771, fog L1158 | This is a big part of why mountains feel small in first person: you can't see them. |
| God view: an ortho camera with `eye = 160` units back, near 1, far 420. | `render.js updateCamera` L827–832 | Peaks above about 90 units at a low pitch would clip against the near plane. |
| **Existing bug:** `R.pickGround` ray-marches only between y = −9 and y = **32**. | `render.js` L912 | Volcano summits already reach **43–50** (measured below), so taps on them miss and land behind the peak. Taller mountains make this worse. |
| Pixel-look outline ids are hashed from each instance's translation. | `render.js VS_OBJ` L135 | Piece-built houses would get an outline around every wall plank. Fix it with a per-building id (§4.5). |

### Measured terrain (node test harness, generator 2)

```
size  arch     seed  max   >6     >10    >14    mountain tiles   gen (vm)
544   classic  7     26.1  71%    27%    15%    27k              2.8 s
544   classic  42    31.4  82%    43%    18%    33k              2.8 s
544   volcano  42    50.0  82%    47%    23%    29k              3.0 s
544   mesa     7     18.0  62%    13%     4%    13k              3.1 s
1024  classic  42    31.4  78%    40%    18%    113k             8.4 s
1024  volcano  7     47.3  75%    34%    19%    75k             11.1 s
```
(% of land vertices above that height. Times are in the slow `vm` test context, not a browser JIT, so read them as relative numbers.)

**Diagnosis:** the peak height is **about 26–31 tiles whatever the island size**. `heights2` deliberately keeps features at tile scale (`T2 = N/256`, "features keep their size"), so a 1024 island has more bumps, not bigger ones. The mountain term is `ridge * mtnMask * mask * 17 * mtn` (L101): wide, rolling and low, and 30–45% of the land sits above 10. A smol's eye is about 0.7–0.9 units, so a 30-unit peak is roughly a 60 m hill at human scale. The fix is a separate *massif* layer (§5), not a bigger multiplier.

---

## 1. Terrain modification: options and recommendation

### 1.1 Options compared

| Option | What you get | Memory | CPU / phone | Save size | Pathfinding / AI | Effort |
|---|---|---|---|---|---|---|
| **A. Heightfield edits** (lower/raise vertices) | Pits, trenches, ramps, terraces, berms, moats, fields, flattening, irrigation. No overhangs. | 0 extra (edits in place) + a sparse delta map | Patch ≤ 9 quads per edit with `bufferSubData` (≪1 ms). Recompute local `slope`/`tileH`. | ~4–6 B per edited vertex after packing | Unchanged: `W.walkable` reads the new heights. Patch `pathGrid` locally. | **S–M** |
| **B. Sparse voxels + marching cubes / surface nets** (only where dug) | True 3D: tunnels, overhangs, crossing shafts | ~16–64 KB per touched 16³ block | MC/surface-nets meshing in JS: ~2–10 ms per block on a mid phone. Seams with the heightfield are hard. | Moderate (cell runs) | Needs 3D walkability, 3D A*, and creature y no longer = f(x,z). Touches the ~80 `groundY` sites. | **XL** |
| **C. Prefab cave rooms** (separate meshes, entered through a portal) | Natural caves and dungeons, but not shaped by the player | Tiny | Trivial | ~0 (seeded) | A room-graph only | **S–M**, but it isn't digging |
| **D. Layered heightfields ("2.5D caves")**: each dug area is a floor heightfield + a ceiling heightfield, on 1–3 stacked layers, sparse by chunk | Tunnels, rooms, ramps, stairs, mine shafts between levels, adits into hillsides, skylights. Not arbitrary overhang sculpting. | Per touched 32×32 chunk per layer: floor+ceil Float32 (33²×2×4 ≈ 8.7 KB) + an open-bit Uint8 (1 KB) | Mesh = floor grid + ceiling grid + wall skirts. Rebuild a dug chunk in about 1 ms, and it reuses the terrain shader. | Open tiles + quantised floor/ceil as Int16 runs: about 1–3 KB per 100 m of tunnel | Same 2D model as the surface: walkable = open ∧ slope ∧ headroom. A per-layer path grid, with layers joined by portal edges (entrances, ladders). | **L** |
| E. Full marching cubes over the whole island | Everything | 100s of MB at N=1024 | Impossible on phones | Huge | Full rewrite | No |

### 1.2 Recommendation

**Use A for the surface plus D for underground, joined by "holes" in the surface heightfield.**

- **A** covers everything the owner listed for dirt (fields, earthworks, irrigation, foundations, terraforming). It is cheap and keeps every existing system working.
- **D** gives the "going underground" fantasy (mine shafts, ore veins, rooms, stairs down) in the same mathematical language as the surface. A creature underground is still "a point on a height function", just on layer *k*. Physics, items, slope walkability, A*, the terrain shader and fog all carry over. It deliberately is **not** Minecraft: there are no cubes and no floating blocks, and you shape smooth, low-poly tunnels.
- **C** comes along almost for free: worldgen can seed natural cave layers (the crystal caves in `sites.js`, grump caves in `placeNodes`) as procedurally generated **D**-layers that are regenerated, not stored.
- B is the only way to get arbitrary 3D, and it would cost a rewrite of physics and AI. That is not justified for a phone game whose identity is the smols, not the voxels.

### 1.3 Surface edits (A): mechanics

**Data** (new, in `world.js`):
- `world.tedit = new Map()` from vertex index to original height (to restore and diff). Heights edit `T.h` in place.
- `T.soil` Uint8 per tile (allocated lazily, N² bytes = 296 KB at 544 and 1 MB at 1024). Values: 0 natural, 1 bare dirt, 2 tilled, 3 tilled+wet (irrigated), 4 paved, 5 compacted (foundation pad), 6 mud.
- Saved as `{h: b64(Int32 idx deltas + Int16 Δh·32), soil: RLE runs}`. A heavy terraformer might touch 10k vertices: about 60 KB raw, ~25 KB packed. That is fine against the 5 MB localStorage quota, but **cap the edited-vertex count** (e.g. 40k) with a friendly "the island resists" message.

**API** (new `WG.editHeight(T, i, j, dh)` plus `W.terraform(world, game, x, z, op, r)`):
- `op` ∈ `dig` (−0.25 at the target vertex and −0.12 at its ring), `raise` (+0.25, costs 1 dirt), `flatten` (move toward the mean of a 3×3, yields or costs dirt for the volume moved), `till`, `pave`.
- After an edit: recompute `T.slope`/`T.tileH` for the ≤ 4 tiles around each changed vertex (the same formula as worldgen L379–382), then call `W.repathRect(world, x0,z0,x1,z1)`. That is `buildPathGrid` restricted to a rectangle (it is already per-cell independent), so drop `openPathAt`'s "only ever opens" assumption.
- Water: if an edited vertex drops below a neighbouring water level `W[k]`, run a **bounded local flood** (BFS ≤ 600 vertices) that sets `W` to the source level for every connected vertex below it. If the bound is hit, stop and mark it "a marsh" (shallow, `W = h + 0.2`). This is irrigation, moats and drained ponds. Re-run the `W2` bank-tuck step (worldgen L315–327) on the touched rectangle. Rebuild `world.waterSrc` lazily in that area (`W.nearWater` is a BFS, so restrict it to a 24-tile pad).
- Limits: no dig below `SB.SEA - 3` at the coast, no raising above `tileH + 4` without a retaining wall (earth slumps: a 0.5 s "thermal" relax pass moves the excess to neighbours if slope > 2.2). Every dig spawns dirt or clay (§3).

**Rendering** (`render.js`):
- New `R.markTerrainDirty(i0, j0, i1, j1)`. For each affected chunk, if `c.lod[1]` exists, recompute the touched quads with the same code as `buildTerrainLOD` (factor its inner loop into `writeQuad(out, o, i, j, step)`) and `gl.bufferSubData` at offset `((j-j0)*S + (i-i0)) * 6 * TSTRIDE * 4`. Delete `c.lod[2]`, `c.lod[4]` and `c.wat[*]` so they lazily rebuild (they are cheap). Extend `minY`/`maxY`.
- Normals use `smoothN` over ±1, so patch a 1-quad halo. `vertexColor` reads a 4×4 tile blend, so patch a 2-quad halo for colour (soil changes).
- `vertexColor` reads `T.soil`: tilled = dark furrowed brown with stripe noise, paved = grey cobble jitter, dirt = bare brown. `aMisc.w` carries soil id so the fragment shader can add a cheap stripe/cobble pattern from `vW.xz` (no texture needed).
- Cost per edit: ≤ 25 quads × 6 verts ≈ 0.1 ms CPU and one small upload. Coalesce edits per frame.

**Creatures and items:** nothing changes, because `groundY` reads the new `T.h`. A smol standing in a pit you just dug sinks with the ground (physics re-settles). Run the "lost" scramble (`creature.js` L1589) as it is.

### 1.4 Underground layers (D): mechanics

**Model.** `world.caves = { layers: [null, L1, L2, L3] }`. Each layer is sparse by chunk: `L.chunks[ci,cj] = { open: Uint8Array(32*32), floor: Float32Array(33*33), ceil: Float32Array(33*33), mesh, dirty }`.
- A tile is *open* when dug (or natural). A vertex's floor/ceil is the average over the open tiles around it, the same idea as `vertexColor`'s blend. Ceilings are clamped to ≤ `T.h − 0.6` (rock cover) unless the tile is an **entrance**.
- Layers are depth bands: L1 is 2–10 under the surface, L2 is 12–24, L3 is 26+. They are a gameplay "level", not a hard z-slice. A tile can be open in L1 and L2 at once (stacked rooms) because the bands never overlap.

**Digging (first person).**
- Aim at a cave wall, a face 1 tile ahead (`P.look` gets a new `{type:"rock", layer, i, j, face}` result from a ray march against floor/ceil/walls of the current layer). This opens that tile: floor = your floor ± how far you look down, ceil = floor + 1.5 (+0.4 for adults/ascended).
- Aim at the floor: lower it 0.5. Ramps and stairs appear naturally. Below the layer band, a **shaft** is opened into the next layer and auto-places a ladder piece.
- Aim at the ceiling: raise it 0.5. If it hits the rock cover, you get a skylight entrance (a surface hole).
- Every dig takes hits by rock type (§2) and yields that material.

**Entrances (surface to L1).** Two ways in:
1. Dig a pit on the surface (A) deeper than 1.5. The pit's floor tiles become L1 open tiles, and the surface tiles are flagged **holes** (`T.hole` bitset).
2. Dig into a hillside whose slope > 1.2. The face tile becomes an adit and its surface tile a hole.

`buildTerrainLOD` skips hole tiles at step 1 and drops whole quads containing holes at steps 2/4. A **portal frame** piece (timber posts and lintel, auto-placed) hides the seam. Wall skirts run from cave floor up to the terrain edge around the hole, so the mesh stays closed.

**Mesh.** Per cave chunk: floor grid (normals up) + ceiling grid (wound down) + wall quads at open/solid tile edges, from floor to ceil, with hash jitter ±0.15 so they read as hewn rock. That is about 2 + 2 + ~1.5 quads per open tile: 200 tiles of tunnel ≈ 2.2k tris. Same `progs.terrain`. Set `aMisc.w = 2` = "underground": `FS_TERRAIN` then drops the sun term, uses a low warm ambient, and uses point lights only. Fog of war doesn't apply (`fow()` is skipped when the flag is set). Rock colour comes from the material at that tile (stone grey, clay red-brown, ore glints with `aMisc.y` emissive for crystal).

**Who draws caves.**
- In first person: always draw cave chunks within the view (they're cheap). Underground, set `far` to 30 and skip decor.
- In god view: draw caves only when the focused or followed smol is underground, or the **mine view** toggle is on. The terrain shader then dithers out fragments inside a screen-space circle around the focus (one uniform `uCut = (x, y, r, on)`), so you see down into the mine. This cutaway is also the fix for "a mountain hides my smol" (§5).

**Creatures underground.**
- `c.layer` (0 = surface). Add `W.groundY(world, x, z, layer)`, `W.walkable(world, x, z, swim, layer)` and `W.heightAt(world, x, z, layer)`. The three hot paths that matter pass `c.layer`: `creature.js` physics (L1571–1589, L1685), `stepToward` L812, and `possess.js P.drive` L131. Items get `o.layer` in `world.js physics()`. The other ~70 call sites (FX, UI, overlay) keep reading the surface. That is correct for them, or harmless.
- Walkable underground = tile open ∧ floor slope ≤ 2.8 ∧ (ceil − floor) ≥ creature height (babies fit 0.9, adults 1.4, ascended 1.7). Ladders (pieces) let you change `floor` vertically.
- Layer switching happens at **portal tiles**: an entrance or the ladder top and bottom. A creature inside a portal tile takes the layer whose floor is nearest its `y`.

**Pathfinding.**
- Each layer gets its own sparse `pathGrid` (2×2 cells, only in chunks with caves).
- Portals are listed as `{x, z, fromLayer, toLayer}`. Cross-layer trips become plan steps: `walkToward(portal)` then a layer switch then `walkToward(target)`. Add a `"descend"` step type to the plan system in `ideas.js` (`planForSite` / fetch steps already handle multi-step walks).
- A precomputed **component id** per path cell (BFS flood, re-run per edited rectangle) lets `findPath` reject unreachable targets in O(1). Today an unreachable target burns the full 5–6k budget before failing.

**Memory and phone.** A busy mine of 2,000 dug tiles over about 8 chunks costs ~80 KB CPU and ~25k tris worst case, and only when visible. Meshing one dirty chunk takes ~1 ms. Rebuild budget is 2 per frame.

**Save.** Per touched layer-chunk: open runs + Int16 floor/ceil at 1/32 resolution for open vertices only. That is about 1 KB per 100 open tiles. Natural (seeded) cave tiles aren't stored, only their diffs.

---

## 2. Resource nodes: chop, mine, pick, dig

### 2.1 Common model (all in `world.js` + `ideas.js`)

- Node fields: `n.hp` (lazy: `NK[kind].hp * n.s`), `n.state` ∈ `ok | felling | stump | burnt | depleted | gone`, and `n.left` (remaining yield for finite nodes). Save it like `state` (only when ≠ default) in `W.serialize` L949.
- `NK[kind]` gains `hp`, `yield` (items per hit, or per fell), `tool` (what can damage it: `chop`/`mine`/`dig`/`hand`), `regrow` (seconds, or 0 = finite), `left` (finite total).
- Tool **power** goes on `KINDS`: hand 0.5 (rocks only, tier 0), hammerstone 1, stone axe 1 (wood), digging stick 1 (soil), stone pick 1.5 (new, tier 2: flint + stick + fiber), copper axe 3, copper pick 3, copper shovel 3. One hit = one `use` action, so `DO_DUR` keeps the smol's rhythm.
- Every hit: `SB.FX.burst("chips")` (bark/rock-coloured), a short shake (dynamic re-draw of that node with an offset for 0.15 s via `bodies.js`), a sound (`thok`/`tok`/`crunch`), and a crack decal on rocks at 50% hp (a mesh variant `n:boulder:cracked`).

### 2.2 Trees

| Step | Rule |
|---|---|
| Chop | hp = 3·s (oak/birch/maple/sakura), 2 (deadtree), 6·s (giant, mangrove), 1 (bamboo: drops sticks and fiber each hit and never fells). Stone axe 1/hit, copper 3/hit. |
| Fell | `state = "felling"` for 1.2 s. `bodies.js` draws the node's own mesh `n:<kind>:<v>` as a dynamic instance rotating about its base, away from the chopper (ease-in, a bounce at 85°). Then leaves burst, fruit drops (`dropFrom` with its `drops`), logs = round(2·s) (stone axe) or round(3·s) (copper) laid **along the fallen length** (not in a pile), and +1 stick. The camera shakes if you're in first person within 6. |
| Stump | Already exists (`n:stump`, regrowT 600). **New:** a stump can be *uprooted* (2 hits with a shovel or axe → 1 "roots" fuel item and the tile is freed, `occ` cleared for building) or left to regrow. |
| Regrowth | Only from a stump, or from a **planted sapling** (new "forestry" idea, tier 3: plant a nut/apple/cherry/pinecone where you stand → `W.addNode(kind, …)` with `grow: 0`). Forest health: a tree regrows 2× slower if fewer than 3 living trees stand within 8 (clear-cuts stay clear-ish, so the land remembers what you did). |
| Fire | Already burns and regrows; keep it. Wooden player pieces now also burn (§4.4). |

### 2.3 Rocks and minerals (surface)

| Node | hp per hit-yield | Finite? | When empty |
|---|---|---|---|
| boulder / redrock | 4·s, 1 stone per hit (hand: 1 per 3 hits) | `left = round(6·s)` | `depleted`: shrinks by `s·(left/max)^0.5` as it goes, then leaves a rubble decal (3 pebble decor instances) and `state = "gone"`. |
| flintrock / basalt | 3, 1 flint | 4 | rubble |
| orevein (surface outcrop) | 5, 1 ore | **3** | `depleted` = "an empty seam, the ore goes down". Shows a dark crack and **marks where to dig down**. |
| crystals | 6, 1 crystal | 3 | dim shards. The rest is underground (§2.4). |
| claybank | dig 2, 1 clay | regrows slowly by water (600 s) | |

This is the lever that sends players underground: the surface gives a taste, and the depths give the rest. The `vent` and `orevein` drop timers (`tickNodes`) still produce a little, so a hands-off colony never hard-locks the copper path. Keep that and reduce it to every 400 s.

### 2.4 Underground materials and ore veins

Material for an opened cave tile is **computed from the seed**, never stored: `WG.rockAt(T, layer, i, j)`.
- Soil cover above stone: `dirtDepth = 1.5 + 2·moist` (shallow under mountains).
- **Clay** band: shallow and near water (`wdist < 10`).
- **Stone** everywhere else (biome-tinted: mesa red, ash basalt black, crystal pale).
- **Copper veins**: for every worldgen `orevein`/`vent` node, a deterministic random walk goes downward (seeded by node id), 30–80 tiles long, wandering ±0.4 rad. Tiles within 1.2 of the walk are ore, richer with depth. Add one extra noise-vein family per mountain massif (§5): ridged noise thresholded > 0.82 in L2/L3.
- **Crystal geodes**: L2/L3 under crystal steppe / shroom biomes, as 3–6-tile pockets (noise blobs), glowing (emissive in the cave mesh, plus a point light registered when visible). This ties straight into the ending's spire costs.
- Optional new materials, only if wanted: **coal** (L1–L2 under forests and swamps: kiln/campfire fuel worth 4 sticks, `d.fuel` +0.6) and **salt** (near the coast, L1: food in a pot keeps 3× longer). Both plug into existing systems; add nothing else.

Mining a wall face: the face shows its material on the wall quad colour, plus "seam" glints for ore. Hits: dirt 2 (shovel 1), clay 2, stone 4 (pick) / 8 (hammerstone), ore 6, crystal 8. Each completed tile drops 1–2 of its material. Ore faces also **spawn a node** (`W.addNode("orevein", …, {seam: true})`, saved as `added`) so smols' existing `GATHER`/`findSource`/orders "mine" logic can target them unchanged.

### 2.5 Debris and the item cap

Mining and digging will spam items. Two rules:
1. **Piles.** `W.add` merges a new material item into a loose same-kind item within 0.6 (`data.n` up to 8; mesh `i:<kind>` drawn ×1–3 by count, label "stone ×5"). `I.deliver`, `inv()` and `C.consume` take from `data.n`. The `log` = 3 sticks rule stays.
2. **Pack for the possessed smol.** `c.pack = {dirt, stone, clay, …}` (a counter per material, capped by tier: 4 / 8 with a basket / 16 with a builder's sack). It is used by building and earthworks directly, so you don't juggle world items while playing. On leaving possession it drops as one pile.

---

## 3. Dirt and stone: uses that mean something

The rule: **dirt is never a block you place.** It moves earth (raise, lower, flatten) or becomes a *material* through a process. Each use below hooks an existing system.

| Use | How | Ties into |
|---|---|---|
| **Fields (free-form farming)** | Till a grass/meadow tile (digging stick) → `soil = 2`. Plant seeds per tile. Crops grow per tile (re-use the `s:crop` instances already drawn on farms, `render.js` L719–726). The preset `farm` becomes "a fenced field with a scarecrow" that auto-tills 4×4 around it. | `tickStructures` farm growth, seasons, rain bonus, windmill bonus; smols already harvest. Orders gain a "till here" zone. |
| **Irrigation** | Dig a trench from a river or lake vertex; the local flood (§1.3) fills it. Tilled tiles within 3 of water are `soil = 3`: crops ×1.4, and no **summer dry spell** (new: in summer without rain for 2 days, unirrigated farms grow at 60%). | Weather, seasons, `wdist`/`nearWater`. It gives summer a lean season like winter. |
| **Earthworks / defence** | A ditch ≥ 1.2 deep with slopes > 2.8 is unwalkable, so grumps path around. A rampart (raised dirt) behind it. Fill the ditch from a river and you get a **moat** (deep water: non-swimmers can't cross, and grumps can't swim). | Grump nights, director raids (`walled` event already exists for palisades: reuse it for "the moat is holding"). |
| **Levelling / foundations** | `flatten` brings a footprint within `siteFree`'s tolerance (`world.js` L815). Smols now **level the ground as stage 0** of any build, so villages can terrace hillsides. Player foundations need level or compacted ground (`soil = 5`). | `I.pickSite` gets many more valid sites on big mountains. |
| **Mud bricks** | dirt + fiber + water nearby → "mud brick (wet)", dried 1 day in the open (or 2 min next to a kiln) → `mudbrick`. Cheap, warm walls (+insulation) that soften in long rain unless roofed. | New idea `mudbrick` (tier 3: tribe). Weather. Building materials tier 2 (§4). |
| **Clay** | Digging in the clay band (near water, shallow) yields clay instead of dirt. Fired in a kiln → `brick` and `tile` (roof tiles). | `pottery`, `kiln` ideas already exist. |
| **Root cellar** | A room dug into a hillside or L1 with a door: food inside rots 3× slower (`o.age` advances at 1/3 when `o.layer > 0` or inside a cellar piece). | Winter lean season (60%), "eggs pause when hungry". This makes digging matter for survival. |
| **Wells** | Dig a shaft on low ground near the water table (`h − nearest water level < 3`) and the bottom fills (local flood). A well piece gives a water source anywhere: fire-fighting (a bucket action puts out a burning node/piece), mud-brick making, hot relief. | `W.nearWater` / `waterNear`, wildfires (`tickFires`). |
| **Burial** | The burial funeral culture (`funeral.js`) digs a real grave pit and leaves a mound (a terrain raise), so the island keeps scars of history. | Funerals, graves. |
| **Stone roads** | Pave a tile (1 stone): walk speed +25% on paved tiles. A* prefers them (cost 0.8). `world.wear` already makes paths, so a well-worn path suggests "pave this" in the guide. | Movement, `W.wearAt`, pathfinding. |
| **Stone construction** | Dressed stone (stone + hammer at a workshop → `block`) is a fireproof, strong-in-compression material (§4). Stone steles (story poles that can't burn). Ovens and grindstones (grain to bread faster). Dams (stone + dirt raise a lip that holds a reservoir: a local flood to the lip height). | Fire, story poles (`totem` keeps ideas), food. |

---

## 4. Player building: pieces, snapping, stability, rendering, smols

### 4.1 Scale and grid

A smol's radius is 0.32 × stage × (1 + 0.045·tier), so adults are about 0.65–0.8 across and 0.9–1.1 tall. Preset huts are 2 tiles wide and 1.9 tall.
- **Module = 1.0 unit** wide. **Storey = 1.25** high. Door opening 1.1.
- Pieces live in a **building group** with its own origin and yaw (`g = {id, x, y, z, rot, tribe, owner}`). Positions inside are integer grid coords `(gx, gy, gz)` plus an edge/rot code, so snapping is exact and saving is compact.

### 4.2 Piece catalogue (v1)

| Piece | Size | Notes |
|---|---|---|
| foundation | 1×0.35×1 | Must touch terrain (all 4 corners within 0.6 of `heightAt`, or sits on compacted soil). Support source. Auto-skirts down to the terrain. |
| floor | 1×0.1×1 | Upper floors and decks. |
| wall / half wall / window wall / door frame | 1×1.25×0.12 | On a cell edge. Window wall has a lit pane at night like huts. |
| door | dynamic | Animated swing (drawn per frame in `bodies.js` like windmill blades). Smols of the owner's tribe open it, grumps break it (hp). |
| pillar / beam (log) | 0.2×1.25 / 1.0 long | The best support carriers. |
| roof 26° / 45°, ridge, inner/outer corner | 1×1 | Shelter test uses them. Thatch, wood shingle or clay tile. |
| stairs | 1 wide × 2 long, rise 1.25 | Also **ladder** (1×1.25, climbable, used in shafts). |
| fence / palisade post | edge | Palisade = the existing `wall` behaviour (grumps fenced). |
| hearth, bed, chest, workbench, wall torch | furniture | They act as campfire, sleep spot, stockpile, crafting `stationFor`, and a light. |
| portal frame, mine support (prop) | caves | Auto-placed at entrances. A prop holds up a cave ceiling (§6, cave-ins). |

**Materials (tiers follow the possessed smol's tier and ideas):**

| Tier | Material | Unlock | Cost per wall | Traits |
|---|---|---|---|---|
| 2 tool-user | wattle (sticks + fiber) | `weave` | 3 stick + 1 fiber | Weak (horizontal loss 0.5), burns |
| 2–3 | log | `chop` (stone axe) | 2 log | Strong beams, burns |
| 3 tribe | mud brick | `mudbrick` | 4 mudbrick | Warm, weak spans, soft in rain unroofed |
| 4 builder | dressed stone | `workshop` / hammer | 3 block | Fireproof, very strong vertical, poor spans |
| 4–5 | fired brick, clay tile roofs | `kiln` | 4 brick | Fireproof, strong |
| 5 thinker | copper fittings, crystal glass | `smelt`, `lens` | +1 metal | Lockable doors, glowing windows |

### 4.3 Snapping and placing

- `P.look` gains `{type:"buildhit", x,y,z, normal, piece?}`: a ray march against the terrain (re-use `pickGround`'s refine loop, with `y` range fixed, §0) and against pieces (AABB per piece in the group's local frame; pieces near the eye come from the piece grid).
- Snap candidates: every piece type defines **snap points** (local coords: edge midpoints, corners, top centre). On aim, collect snap points of pieces in the 3×3×3 grid cells around the hit. For the ghost's own snap points, pick the pair that minimises distance (< 0.45). Otherwise **grid-snap** to the nearest group cell (or start a new group with yaw = your view yaw snapped to 15°).
- Ghost: draw the piece mesh as a dynamic instance with `iExt.z` (whiten) and alpha via the existing hull pass trick. Tint green/yellow/red = valid/weak/invalid (support < 0.2, overlap, no materials).
- Controls: desktop B opens build mode, wheel/1–9 cycle pieces, R rotates, E places, X removes (refunds 50%). Phone: a build hotbar strip, "rotate" and "place" buttons, and tap-to-place where the crosshair is. **Phone default:** a 2-click "auto-house" macro (pick a footprint rectangle → it lays foundations + walls + roof + door as ghosts that you or your friends then fill). Free-form stays available but phones don't need 40 precise taps.
- Materials come from `c.pack` first, then piles within 12 of the ghost. **Friends help:** the existing tag-along (`possess.js friends()`) gains "bring me X". A friend with free hands fetches a missing material for your newest ghost (`planForSite`-style fetch → deliver). Building next to your tribe becomes a group activity.

### 4.4 Stability (Valheim-style, cheap)

- Each piece has support `s ∈ [0,1]`. Grounded foundations, pillars into terrain, and anything touching a cave floor get `s = 1`.
- Otherwise `s = max over neighbours (sₙ × k)`, where `k` depends on material and direction (vertical / horizontal):

  | material | vertical | horizontal |
  |---|---|---|
  | log | 0.95 | 0.85 |
  | wattle | 0.85 | 0.5 |
  | mud brick | 0.9 | 0.45 |
  | stone | 0.97 | 0.55 |
  | brick | 0.95 | 0.6 |

- Recompute by a max-propagation (Dijkstra-like on −log) over the group on add/remove: ≤ 600 pieces per group, < 1 ms.
- A piece with `s < 0.12` **collapses**: a dynamic fall animation, 50% materials dropped as piles, a dust burst, and a chain re-check.
- Fire: wattle/log/thatch pieces ignite from adjacent burning nodes or lightning (`W.ignite` generalised to pieces), burn 20–40 s, spread to neighbours (`tickFires` pattern), then collapse. Stone and brick don't burn. That makes material choice matter on a storm island.

### 4.5 Rendering, cheaply

- Meshes: one `Builder` mesh per (piece type, material) built in `buildMeshes` (`p:wall:log`, …). Boxes with a bevel and a little hash jitter per instance stay in the low-poly style: 12–60 tris each. Material colour comes via `iTint` with a `tintMask` per vertex, so the same wall mesh serves wattle/log/brick by tint where the shape is the same. Distinct shapes only where it matters (log walls have rounded courses, wattle is woven).
- **Static per-chunk instances**, exactly like structures: extend `buildChunkInstances` (`render.js` L672) to push pieces of that chunk. A change marks the chunk dirty, and the 4/frame rebuild budget already exists. 1,000 pieces × 40 tris = 40k tris spread over a few chunks. Instance data is 20 floats each, so 80 KB.
- Only doors (animating), ghosts and collapsing pieces are dynamic (`R.inst`).
- **Outlines in the pixel look:** pass a per-group id in `iTint.a` (encode `2 + groupId%240`). `VS_OBJ` L135 then uses that instead of the translation hash when `iTint.a > 1.5`, so a house outlines as one object, not a grid of planks.
- **Cutaway in god view:** when the camera looks at a selected or followed smol inside a player building, hide pieces with `gy` ≥ that smol's storey and roofs (a uniform `uCutY`), like The Sims. One branch in `VS_OBJ` (collapse to degenerate).

### 4.6 Collision and walking

- `world.pieceGrid`: per 32-chunk, lazily a `Uint8Array(64*64)` at 0.5-tile resolution for **ground-storey blocking** (wall/fence edges rasterised as 0.5-cells, doors flagged separately), plus `chunkHasPieces` (Uint8 per chunk) as the fast reject. `W.walkable` adds one array read (it's the hottest function: 7 steering tries × 2 per moving creature per tick).
- Doors are passable for smols, and blocking for grumps until broken (re-use `fenced()` in `creature.js` L782 with a door hp, plus the `walled` event).
- Floors and stairs: `W.groundY` takes the creature's current `y` as a hint and returns the highest support surface ≤ y + 0.45 among terrain and floor/stair tops in that cell (a short list per cell). **v1: smols' AI stays on the ground storey**: path grids are 2D, and upper floors are for the player and decoration. Smols that wander up stairs are fine (their y follows the hint). A two-storey path layer can come later.
- Path grid: placing or removing a blocking piece calls `W.repathRect` for its cells.

### 4.7 How smols react to and use player buildings

- **Homes:** a group with a roof over ≥ 4 floor cells, walls on ≥ 75% of its perimeter, and a door is a **home** (an enclosure test by flood fill on the group grid). It counts toward `I.buildNeed("hut")` (`ideas.js` L573), so smols stop building huts you've out-built. It provides `W.shelterAt` (warmth, rain, egg warming ×2, grump safety) and sleep. Beds give `inBed` sleep quality.
- **Comfort:** hearth + bed + window + roofed adds a home "comfort" score (Valheim) that raises mood/rest regen. Shown on the smol card.
- **Chests = stockpiles:** `I.findSource` looks in chests. The orders `stockpile` zone can be a chest.
- **Workbench / hearth** are `stationFor` targets (craft 1.5× like `workshop`).
- **Opinion:** smols remember "someone built us a house" (a `social.js` memory +opinion of the possessed smol for every resident). Insults or envy if another family's house is nicer (a light RimWorld touch).
- **The twist: architecture as culture.** A builder-tier smol who spends time in a player home can learn its **blueprint**: the group's piece list, normalised and capped at 80 pieces, stored as `culture.blueprints[id]` with an invented name ("Ula's house"). From then on that tribe's builders build that design as a preset (piece by piece, §4.8) when they need housing, and a story pole can keep it. Your style spreads through the colony and can be *lost* in a dark age, which is the existing "technology lives in heads" rule applied to buildings.
- **Grumps** treat walls like palisades (path around, raid parties break doors after ~25 s). Burning is their tool in late-game raids (a torch-carrying raider).

### 4.8 Preset structures, built piece by piece (smols)

No new art is needed, because the meshes are code:
1. **Marks in `Builder`:** every top-level primitive (`box`, `cyl`, `cone`, `sphere`, `blob`, `gable`, `leaf`, `torus`) records `this.v.length / STRIDE` into `this.marks` when the push-stack depth is 0 or 1. Add an explicit `b.stage("posts", {stick: 3})` marker that groups marks into **stages** with their material share. `finish()` returns `{…, marks, stages}`.
2. **Order:** reorder each `STRUCT_BUILDERS` entry so code order = build order (footing → posts → walls → door → roof → chimney/flowers). In most builders this is already true: the hut is footing, walls, posts, thatch, door, window, chimney. Move the door and window before the thatch.
3. **Progress → pieces:** the site's progress (delivered share × work, the same formula as `bodies.js` L304) maps to `k` = number of marks shown.
   - `drawStructures` draws the mesh **prefix** `[0, marks[k])` as a static instance.
   - The **newest piece** `[marks[k], marks[k+1])` is drawn as a second instance that drops in from +0.5 with a squash and a dust puff and a "tok" when it lands. That needs `drawInstanced(p, key, buf, n, first, count)` (today it always draws from 0, `render.js` L1228; `ctx.drawInstanced` already takes `first`). Do it with mesh aliases `meshes["s:hut@17"] = {buf: same, count: marks[17]}` created lazily, so `R.inst` keeps grouping by key.
4. **Stages gate materials:** `need` becomes per-stage. Smols deliver to the current stage and work on it, so a site can sit at "posts up, waiting for fibre" and **you can read what it needs by looking**. The UI line in `ui.js` L883 becomes "posts ✓ · walls 2/3 sticks · roof needs 3 fibre".
5. **Smols visibly place pieces:** while working, a builder walks to the anchor point of the next piece (the bounding-box centre of that mark range, cached at mesh build), faces it, plays the hammer squash, and a carried item flies into place (an existing `toss` arc) before the piece drops in. Builders spread round the site instead of stacking on its centre.
6. **Stage 0 "level the ground"** uses §1.3 `flatten` on the footprint, which is why smols can now build on slopes.
7. On completion the mesh is the full mesh, so nothing changes visually. Remove the vertical squash and the tint.

Cost: 1–2 extra instanced draws per visible site, and no new meshes. Blueprint (player-designed) houses use the same path: their "marks" are the pieces themselves, in placement order.

---

## 5. Bigger, grander mountains

### 5.1 What to change in `worldgen.js`

Introduce **generator 3** (`SB.WORLD_GV = 3`, gated like G2 at L182), so saved islands regenerate bit-identically (their node ids depend on placement order).

1. **Massifs** (new `massifs(h, seed, shape, arch, feat)` after the base `heights2` pass):
   - `count = arch === "delta" ? 0 : arch === "mesa" ? 1 : round(1 + 1.4·√K)`: 3 at 544, 4 at 768, 5 at 1024. The volcano keeps its cone and gets 1–2 ranges.
   - Each range: a **spine polyline** (6–10 points, random walk with ±0.5 rad turns, length 0.25–0.5·N) placed where the island mask > 0.85 (sample from `h` > 4).
   - `peakH = (45 + 55·r) · shape.mtn · WO.mtn · (0.85 + 0.15·√K)`: 45–100 at 544, up to ~130 at 1024. Half-width `W = (0.05–0.09)·N` (27–50 tiles at 544).
   - Per vertex in the range's bounding box:
     `prof = smooth(1 − d/W)^1.5`
     `along = 0.5 + 0.5·sin(π·t)^0.6` (tapered ends)
     `saddle = 1 − 0.5·bump(t, t_saddle)` (1–2 passes per range)
     `rid = ridged multifractal` (4 octaves, `(1 − |n|)²` with weight feedback, domain-warped by `warpF`, wavelength ~28 tiles) sampled through `coarse()` at N/2.
     `h += peakH · prof · along · saddle · (0.45 + 0.55·rid) · landMask`.
   - Keep the lowland compression (L102) so there's still flat land to build on.
2. **Erosion-lite:**
   - 12 iterations of **thermal erosion** (talus 1.9/tile, move 25% of the excess downhill) on a coarse N/2 grid, inside massif bounding boxes only. This gives scree slopes and fewer needle spikes.
   - Optional: one **stream-power carve** after flow accumulation (L244–255) for vertices with `h > 8`: `h −= 0.06·√acc·slope`, clamped to 3 per vertex, then a re-flood. This gives V-valleys and gorges. It costs one more priority flood (the heap is already there).
3. **Height zones:** `biome2` L143 changes from `th > 14 ⇒ mountain` to height relative to the local snowline:
   - foothills keep their forest/taiga up to 0.4·snowline
   - **alpine meadow** (new appended biome `alpine`: short grass, flowers, `herbs`, `boulder`, hives) up to 0.75·snowline
   - **rock** (`mountain`) above that, or slope > 1.6
   - **glacier/snowcap** above the snowline (= `tundra` colours with stronger snow)

   `snowline = 26 + 40·temp` (warm islands get bare peaks). Fix the hard-coded snow tint in `render.js vertexColor` L526 (`(h − 13) / 3`) to read the same snowline when `T.gv >= 3`.
4. **Ore and caves follow the mountains:** more `orevein` and `flintrock` at mountain feet. Massif veins feed §2.4. Grump caves prefer massif feet (already slope-based, L562).
5. **Rivers and lakes:** bigger catchments produce longer, deeper rivers from the ranges, plus tarns in cirques (the priority flood already handles them). Re-tune `RIVER_T` (L260) by +20% so the lowlands don't become a delta.

### 5.2 Making the size *felt* (render and sim; cheap but essential)

- **Horizon terrain in first person.** Draw all chunks out to ~350 units at LOD 4 (and a new LOD 8 on phones / N ≥ 768) after the near terrain, with no objects. Fog becomes aerial perspective: near fog stays at `far`, while far terrain fades to a hazed sky colour (two-stage `uFog`). Cost: 544 at LOD 4 is ~37k tris. 1024 at LOD 8 is ~33k. Phones at LOD 8 are ~9k. This one change makes mountains visible from the village.
- **God-view camera:** `dist` 160 → 400 and far 420 → 1100 (`render.js` L827/L832). Ortho depth is linear, so 24-bit precision is fine. Raise `pitch` floor slightly when the focus is near a range so peaks don't wall off the view, and use the **cutaway circle** (§1.4 `uCut`) when a peak occludes the followed smol (test: `M4.project` depth of the smol vs a sample of terrain along the eye ray).
- **Fix `pickGround`** (`render.js` L912): march from `maxY_visible + 1` (track `max(c.maxY)` over visible chunks) instead of a hard-coded 32. This is needed anyway, because volcano tops (43–50) are mis-picked today.
- **Height AO / hillshade:** bake a horizon-based AO per vertex (8 directions × 12 steps) per chunk when its LOD 1 is built (~0.15 ms per chunk) into the AO slot (`col[4]`, already used for canopy AO). Ridges and valleys pop from above, where the ortho pitch otherwise flattens relief.
- **Climbing has weight:** in `stepToward` (`creature.js` L801), speed ×1/(1 + 0.6·max(0, dh/step)) uphill and ×1.1 downhill. Cold rises with height (already, `W.tempAt` L455). A tired smol can't run uphill.
- **Summit views:** in `revealTick` (`world.js` L67), reveal radius `= viewR + 2 + max(0, y − localMean)·1.2` (cap 60). Standing on a peak clears the fog for half the island, which rewards climbing and fits the existing "new biome pays 4 sparks". Add a "first to the summit" chronicle entry.
- **Long-distance pathing:** ranges create detours far beyond the 5k-node A* budget. Add per-cell **component ids** (O(1) unreachable reject) and an **HPA-lite**: a coarse 16×16-cell region graph with portals, built once and patched per edit. `findPath` then does a region route first and local A* per leg. Most smol trips (< 40 tiles) are unchanged. Rescue parties, strangers and explorers stop failing.

### 5.3 Cost

| Item | Cost |
|---|---|
| Generation | Massif noise via `coarse()` at N/2, plus 12 thermal iterations on N/2 inside bounding boxes: **+60–150 ms** at 544 on a mid phone, +250–400 ms at 1024. Stream-power plus re-flood would add about another 30%, so it is optional and could go behind the "tall peaks" choice. |
| Memory | None new (same arrays). |
| Render | Mesh counts are unchanged near the camera. Horizon terrain adds +9–37k tris in first person. Ortho culling is slightly worse at low pitch (taller `maxY`). |
| Save | Unchanged (seeded). |
| Gameplay risk | More unwalkable cliff area (today 4k–78k tiles are > 2.6 slope, depending on archetype). Saddles must stay below 2.2 slope on at least one route: a validator pass lowers the saddle until A* between the two flanks succeeds. Nest and sites placement already requires walkable and temperate ground. |

---

## 6. Phased implementation plan

Sizes: **S** ≈ 1–3 days, **M** ≈ 1–2 weeks, **L** ≈ 3–5 weeks (one engineer, plus tests). Each phase ships on its own.

| # | Phase | Size | Main files / functions | Ships |
|---|---|---|---|---|
| 0 | **Groundwork** | S–M | `render.js`: `R.markTerrainDirty` + `writeQuad` refactor of `buildTerrainLOD` + `bufferSubData`; `pickGround` y range fix; ortho `dist`/far. `worldgen.js`: `WG.editHeight` + local slope/tileH. `world.js`: `W.repathRect`, path component ids, sparse delta codec in `serialize/revive`. `render.js drawInstanced(…, first, count)`. | No visible feature, except the volcano-tap bug fix. Tests: edit round-trip, determinism, path patching. |
| 1a | **Resource lifecycle** | M | `core.js` `NODES` (+hp/left/regrow), `KINDS` (+tool power, stone pick, digging stick, shovel), `ideas.js I.use`/`I.fell`/`GATHER`, `world.js tickFires` regrowth rules, `bodies.js` felling animation, `fx.js` chips, piles in `W.add`/`I.deliver`, `possess.js verbFor` labels. Orders "mine" skips depleted nodes. | Chop/mine/pick that feels physical. Finite rocks. Saplings. |
| 1b | **Mountains (generator 3)**, can run in parallel | M–L | `worldgen.js` `massifs`, thermal pass, `biome2` zones + `alpine` biome appended in `core.js BIOMES`; `render.js vertexColor` snowline, horizon LOD pass, height AO; `creature.js stepToward` slope speed; `world.js revealTick` summit reveal; HPA-lite in `findPath`; `title.js`/create-world "peaks: tall/alpine". | New islands with real ranges. Old saves untouched. |
| 2 | **Surface digging and its uses** | M–L | `world.js W.terraform`, local water flood, `T.soil`; `possess.js` dig/raise/flatten/till verbs + terrain target in `P.look`; per-tile crops in `render.js` + `world.js tickStructures`; irrigation, moat, root cellar timer, wells, paving; `orders.js` "dig/till/flatten zone" for smols; ideas `digging` (tier 2), `mudbrick` (3). | Fields, trenches, moats, levelling, mud bricks, clay. Smols do earthworks on orders. |
| 3 | **Preset buildings piece by piece** | M | `meshes.js Builder` marks/stages + reorder `STRUCT_BUILDERS`; `bodies.js drawStructures` prefix + drop-in piece; `ideas.js` per-stage `need`, builder anchor walking, stage-0 levelling; `ui.js` stage readout. | Visible construction. No progress-bar squash. |
| 4 | **Player piece building** | L | New `pieces.js` (data, snapping, stability, enclosure/home test, save codec); `meshes.js` piece builders; `render.js buildChunkInstances` + group outline id + cutaway; `world.js` piece grid in `walkable`, `groundY` y-hint, `shelterAt`, fire on pieces; `possess.js` build mode, ghost, HUD hotbar, phone auto-house; `creature.js fenced` doors; `social.js` house memories; `ideas.js` blueprints culture + builders building blueprints via phase 3. | Houses any way you want, which smols live in, copy and defend. |
| 5 | **Underground (layered caves)** | L | New `caves.js` (layers, open/floor/ceil, `rockAt`, veins, meshing, save); `render.js` cave pass, `aMisc.w` underground lighting, holes in `buildTerrainLOD`, `uCut` cutaway, mine view toggle; `world.js` layer-aware `groundY/walkable/physics`; `creature.js` `c.layer` + portal steps; `ideas.js` descend steps, mining plans, `findSource` underground; `possess.js` rock target + dig faces + ladders; `sites.js` crystal caves and grump caves as seeded layers. | Mine shafts, ore veins, crystal geodes, root cellars, smol miners. |
| 6 | **Depth polish** | M | Cave-ins (ceiling span > 4 unpropped → rubble, warning creaks), props/supports, coal/salt (if wanted), mine carts on a rail piece (optional), dams/reservoirs, grindstone/oven, director cards ("the mine flooded", "the miners found something glowing"). | |

Order rationale: 0 unlocks everything. 1a and 1b are independent and the most visible quick wins. 2 makes dirt meaningful before any building. 3 is cheap and uses 2's levelling. 4 needs 0's grids and 3's staged drawing. 5 is the biggest and benefits from 4's ladders, portals and torches.

### Risks (and mitigations)

1. **Hot-path cost on phones.** `W.walkable` and `groundY` run thousands of times per tick. Mitigate with per-chunk bit flags for pieces/caves/holes so untouched land costs one byte read. Benchmark with `tests/sim.test.js` before and after each phase. Target ≤ +5% JS frame time at 4× CPU throttle (today ~8.5 ms).
2. **AI complexity.** Multi-layer routes, stages and blueprints add plan steps. Keep the brain's verb/noun interface unchanged (new things map to existing nouns: `stone`, `material`, `shelter`). Do all planning in `ideas.js` plans. Add soak tests: "colony survives 2 h with mines and player houses, 0 stuck > 30 s".
3. **Save size and quota.** Terrain, caves and pieces as packed deltas with hard caps (40k edited vertices, 4k open cave tiles, 3k pieces), plus a quota check before `localStorage.setItem` (`save.js` L82). Fall back to IndexedDB only for the island copy, which already exists. **Confirm the `cc.save` payload limit with the site SDK.**
4. **Determinism and old saves.** Generator 3 is gated by `gv`. Edits are deltas over the regenerated island, and seeded material (`rockAt`, veins) never depends on play order.
5. **Offline progress** runs the sim headless (`SB.Render` undefined in tests). Every terraform/cave/piece function must be renderer-free, with `markTerrainDirty` a no-op when there is no renderer. Offline smols should not do large earthworks (gentle mode caps edits).
6. **Visual seams** (holes vs portal frames vs wall skirts) and pixel-mode outline noise on pieces. Budget a polish pass. The outline group id is a required fix, not optional.
7. **The tall-mountain camera.** Ortho occlusion and near-plane clipping are handled by the cutaway and camera distance. Test on every archetype at min and max pitch.
8. **Scope creep toward a voxel game.** Hold the line: no free-form cubes, dirt is only earthwork or material, and underground is layered. That keeps it a smol game, not a Minecraft copy.

### Tests to add

All in node, using `tests/_load.js`:
- `terrain.test.js`: edit round-trip; slope/path patch equals full rebuild in the rectangle; water flood bounded; save codec size for 10k edits.
- `nodes.test.js`: hp, depletion, felling yields, regrowth gating, piles.
- `gen3.test.js`: peaks ≥ 45 at 544, ≥ 1 walkable route across each range, gen time budget, old `gv` 1/2 islands hash-identical.
- `pieces.test.js`: snapping, stability collapse, enclosure → home, doors vs grumps, save round-trip.
- `caves.test.js`: open/dig/floor/ceil, portals, smol path surface → L1 → L2 and back, rocks deterministic.
- Sim soak with miners and builders.
