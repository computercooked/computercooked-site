#!/usr/bin/env python3
"""Builds the generation prompts (one STYLE FORMULA, byte-identical in every prompt) and runs them
through the Higgsfield CLI, at most 4 at a time, saving result JSON + PNG into ../raw/<id>.*
usage: jobs.py <id> [<id> ...]   (or 'all')"""
import json, subprocess, sys, os, concurrent.futures as cf, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "..", "raw")
STYLE_REF = "21195235-1d55-4a1e-becd-83a49d27e4d4"  # upload of nb-B-pov.png

FORMULA = ("HD-2D pixel art like Octopath Traveler and Eastward: detailed hand-placed pixel art with crisp dark "
           "pixel outlines and chunky readable shapes; rich warm palette with sunlit grass greens, honey-gold thatch, "
           "warm grey stone, rusty red clay tiles and deep brown wood, while creatures and pickups use brighter "
           "saturated colours that pop against the land; warm golden afternoon sunlight with soft shading; cosy "
           "cheerful village mood; high contrast between objects and ground, clean readable silhouettes, consistent "
           "overhead game-camera perspective")

TILE_T = "seamless tileable game texture tile of {d}, uniform pattern density, matching the pixel art style of the reference image, "
TILE_S = (", drawn as true low-resolution pixel art on a 64 by 64 pixel grid with big square pixels, perfectly seamless "
          "edges that wrap horizontally and vertically, no border, no vignette, flat even lighting, no single focal object, "
          "fills the whole square image")
SHEET_T = ("game sprite sheet of {d}, each item a separate small pixel art sprite with its own dark outline, laid out in "
           "a neat 4 by 4 grid with wide empty gaps between items, all items drawn at the same scale, matching the pixel "
           "art style of the reference image, ")
SHEET_S = (", on a solid uniform bright {k} background, no shadows cast on the background, no ground plane, no text, "
           "no labels, nothing cropped at the edges")

TILES = {
    "grass": "lush sunlit meadow grass seen from straight above, short tufts of blades in several greens with a few tiny yellow and white flowers",
    "dirt": "packed brown dirt path seen from straight above, small pebbles and cracks, warm earthy browns",
    "sand": "warm golden beach sand seen from straight above, tiny ripples and a few small shells and pebbles",
    "rock": "rough grey mountain cliff rock face, chunky angular stone facets with dark cracks and a little moss",
    "snow": "fresh soft snow seen from straight above, gentle pale blue shadows and sparkles",
    "farmland": "a vegetable garden plot of dark brown soil seen from straight above, straight parallel rows of raised earth with tiny green seedlings",
    "water": "calm clear turquoise lake water seen from straight above, little wavy highlight lines and ripples",
    "bark": "tree bark, vertical brown wooden bark strips with dark grooves and knots",
    "leaves": "dense round broadleaf tree canopy foliage, clusters of overlapping rich green leaves with light and dark shading",
    "needles": "dense dark green pine tree needles foliage, layered spiky needle clusters",
    "blossom": "dense pink cherry blossom foliage, clusters of small pink and white petals",
    "palm": "tropical palm and jungle foliage, long overlapping bright green fronds",
    "brick": "stone brick wall seen straight on, rows of rounded light grey stones with dark mortar lines",
    "thatch": "straw thatch roof seen straight on, layered rows of golden dry straw bundles",
    "planks": "wooden plank wall seen straight on, vertical warm brown boards with dark gaps and nail dots",
    "roof": "clay roof tiles seen straight on, overlapping rows of rusty red and terracotta curved tiles",
}
SHEETS = {
    "items1": ("16 different small loose items lying on the ground: a red apple, a cluster of purple-blue berries, a pair of "
               "red cherries, a brown wooden stick, a grey round stone, a lump of orange-brown wet clay, a cream speckled egg, "
               "a rock with copper ore nuggets, a glassy dark grey flint shard, a red spotted mushroom, a coiled green vine, a "
               "bundle of golden wheat grain, an orange root vegetable, a yellow gourd, a pink fish, a white feather", "magenta #FF00FF"),
    "items2": ("16 different small loose items lying on the ground: a bunch of yellow bananas, a brown hard pine nut, a pale cracked "
               "nut kernel, a raw pink meat chunk, a cooked meat skewer, a golden bread loaf, a dripping honeycomb, a white clam shell, "
               "a glowing light blue mushroom, a glowing pale blue crystal shard, a shiny copper ingot, a small green seed sprout, "
               "a glass flask of mint green potion, a bundle of yellow-green reed fibre, a green leafy healing herb, a fluffy cream fur pelt", "magenta #FF00FF"),
    "items3": ("16 different small hand tools and items lying on the ground: a plain wooden poking stick, a grey hammer stone, a "
               "dark flint knife blade, a wooden spear with a stone tip, a burning wooden torch, a woven straw basket, an orange clay "
               "pot, a stone axe lashed to a stick, a heavy wooden club with a rock, a wooden fishing rod with a line, a cream fur "
               "cloak, a cut wooden log, a copper axe, a round pale blue crystal lens, a pink prickly pear cactus fruit, a white ball", "bright green #00FF00"),
}


def prompt_for(i):
    if i in TILES:
        return TILE_T.format(d=TILES[i]) + FORMULA + TILE_S, "1:1"
    d, k = SHEETS[i]
    return SHEET_T.format(d=d) + FORMULA + SHEET_S.format(k=k), "1:1"


def run(i):
    p, ar = prompt_for(i)
    cmd = ["higgsfield", "generate", "create", "nano_banana_flash", "--prompt", p, "--image", STYLE_REF,
           "--aspect_ratio", ar, "--resolution", "1k", "--wait", "--json"]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
    out = r.stdout.strip()
    open(os.path.join(RAW, i + ".json"), "w").write(out + "\n" + r.stderr)
    try:
        j = json.loads(out)
        j = j[0] if isinstance(j, list) else j
        if j.get("status") != "completed":
            return i, "FAIL status %s" % j.get("status")
        url = j.get("result_url") or (j.get("results") or [{}])[0].get("url")
        # find any png/webp url in output
        if not url:
            import re
            m = re.findall(r'https://[^"]+\.(?:png|webp|jpg)', out)
            url = [u for u in m if "_min" not in u][0] if m else None
        subprocess.run(["curl", "-sS", "-o", os.path.join(RAW, i + ".png"), url], check=True)
        return i, "ok " + url
    except Exception as e:
        return i, "FAIL %s %s" % (e, out[:300] + r.stderr[:300])


if __name__ == "__main__":
    ids = sys.argv[1:]
    if ids == ["all"]:
        ids = list(TILES) + list(SHEETS)
    if ids and ids[0] == "--print":
        for i in ids[1:]:
            print(prompt_for(i)[0]); print()
        sys.exit()
    with cf.ThreadPoolExecutor(4) as ex:
        for i, msg in ex.map(run, ids):
            print(i, msg, flush=True)
