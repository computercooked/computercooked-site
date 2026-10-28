#!/usr/bin/env python3
"""Turns the raw generations into the game's HD art:
  tiles.png  - 4x4 atlas of 64px seamless pixel tiles (row-major in TILE_ORDER). RGB is a *detail* map: the
               tile divided by its own average colour, times 0.5 (so 0.5 grey = no change); the shader multiplies
               it onto the vertex colour, which keeps biomes, seasons and snow working. A = 255.
  tiles-avg.json - each tile's average colour (for the palette pull in the shader).
  items.png  - item sprites (32px cells, 8 per row), chroma-keyed, 1px dark outline kept, + items.json index.
usage: build.py <rawdir> <outdir>"""
import sys, os, json, subprocess
import numpy as np
from PIL import Image

RAW, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
PIPE = "/root/.claude/skills/higgsfield-websites/scripts/pipeline.py"
TILE_ORDER = ["grass", "dirt", "sand", "rock", "snow", "farmland", "water", "bark",
              "leaves", "needles", "blossom", "palm", "brick", "thatch", "planks", "roof"]
TS = 64
CONTRAST = {"grass": 0.55, "dirt": 0.75, "sand": 0.8, "snow": 0.8, "water": 0.6}


def seamless(name):
    pre = os.path.join(OUT, "seam", name)
    os.makedirs(os.path.dirname(pre), exist_ok=True)
    if not os.path.exists(pre + "_seamless.png"):
        subprocess.run([sys.executable, "-I", PIPE, os.path.join(RAW, name + ".png"), "-o", pre, "--trim", "0.01"],
                       check=True, capture_output=True)
    return Image.open(pre + "_seamless.png").convert("RGB")


def pixelate(im, size, colors):
    # area-average down to the pixel grid (the generations aren't on an exact grid, so NEAREST would pick noise),
    # then snap to a small palette: hard-edged pixel art with no in-between colours
    small = im.resize((size, size), Image.BOX)
    # periodic: quantize on a 2x2 tiling so the palette doesn't depend on where the edge is
    q = small.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    return q.convert("RGB")


def seam_ratio(a):
    a = a.astype(float)
    seam = abs(a[0] - a[-1]).mean() + abs(a[:, 0] - a[:, -1]).mean()
    base = abs(np.diff(a, axis=0)).mean() + abs(np.diff(a, axis=1)).mean()
    return round(seam / base, 2)


def tiles():
    atlas = Image.new("RGB", (TS * 4, TS * 4))
    color_atlas = Image.new("RGB", (TS * 4, TS * 4))
    avg = {}
    report = {}
    for i, n in enumerate(TILE_ORDER):
        t = pixelate(seamless(n), TS, 20)
        a = np.asarray(t).astype(float)
        m = a.reshape(-1, 3).mean(0)
        avg[n] = [round(v / 255, 3) for v in m]
        ratio = a / np.maximum(m, 1)
        ratio = 1 + (ratio - 1) * CONTRAST.get(n, 1.0)  # big flat ground reads calmer than props
        det = np.clip(ratio * 0.5 * 255, 0, 255).astype(np.uint8)
        x, y = (i % 4) * TS, (i // 4) * TS
        atlas.paste(Image.fromarray(det), (x, y))
        color_atlas.paste(t, (x, y))
        report[n] = seam_ratio(a)
    atlas.save(os.path.join(OUT, "tiles.png"), optimize=True)
    color_atlas.save(os.path.join(OUT, "tiles-color.png"))
    json.dump({"order": TILE_ORDER, "avg": avg}, open(os.path.join(OUT, "tiles.json"), "w"))
    print("seam ratios", report)


# item sheets: 4x4 grids. key colour per sheet; names in reading order (None = skip)
SHEETS = {
    "items1": ((255, 0, 255), ["apple", "berry", "cherry", "stick", "stone", "clay", "egg", "ore",
                               "flint", "shroom", None, "grain", "carrot", "pumpkin", "fish", None]),
    "items2": ((255, 0, 255), ["banana", "nut", "nutmeat", "meat", "cooked", "bread", "honey", "clam",
                               "glowcap", "crystal", "metal", "seed", "potion", "fiber", "herb", "fur"]),
    "items3": ((0, 255, 0), ["pokestick", "hammer", "blade", "spear", "torch", "basket", "pot", "stoneaxe",
                             "club", "rod", "cloak", "log", "axe", "lens", "pricklypear", "ball"]),
}
CELL = 32


def key_mask(a, key):
    # distance to the key colour, plus "looks like the key" (strong key hue) so the anti-aliased fringe goes too
    k = np.array(key, float)
    d = np.sqrt(((a - k) ** 2).sum(-1))
    if key == (255, 0, 255):
        keyish = (a[..., 0] > 150) & (a[..., 2] > 150) & (a[..., 1] < 0.55 * np.minimum(a[..., 0], a[..., 2]))
    else:
        keyish = (a[..., 1] > 150) & (a[..., 0] < 0.6 * a[..., 1]) & (a[..., 2] < 0.6 * a[..., 1])
    return (d < 120) | keyish


def items():
    from scipy import ndimage
    sprites = {}
    for sheet, (key, names) in SHEETS.items():
        a = np.asarray(Image.open(os.path.join(RAW, sheet + ".png")).convert("RGB")).astype(float)
        bg = key_mask(a, key)
        fg = ~bg
        fg = ndimage.binary_opening(fg, iterations=2)
        lab, nlab = ndimage.label(fg)
        objs = ndimage.find_objects(lab)
        H, W = fg.shape
        # assign each big component to a 4x4 grid cell by its centre; merge pieces in the same cell
        cells = {}
        for li, sl in enumerate(objs):
            area = (lab[sl] == li + 1).sum()
            if area < 300:
                continue
            cy, cx = (sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2
            gi = min(3, int(cy / H * 4)) * 4 + min(3, int(cx / W * 4))
            cells.setdefault(gi, []).append(li + 1)
        for gi, name in enumerate(names):
            if not name or gi not in cells:
                if name:
                    print("missing", sheet, name)
                continue
            m = np.isin(lab, cells[gi])
            ys, xs = np.where(m)
            y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            crop = a[y0:y1, x0:x1]
            alpha = m[y0:y1, x0:x1]
            rgba = np.dstack([crop, alpha * 255]).astype(np.uint8)
            sprites[name] = {sz: fit(Image.fromarray(rgba, "RGBA"), sz, ndimage) for sz in SIZES}
    # atlas: 256 wide; a band of 32px cells, then 16px, then 12px (NPOT height is fine: NEAREST + clamp)
    names = sorted(sprites)
    AW = 256
    bands, y = {}, 0
    for sz in SIZES:
        cols = AW // sz
        rows = (len(names) + cols - 1) // cols
        bands[sz] = (y, cols)
        y += rows * sz
    atlas = np.zeros((y, AW, 4), np.uint8)
    index = {}
    for i, n in enumerate(names):
        e = {}
        for sz in SIZES:
            y0, cols = bands[sz]
            x, yy = (i % cols) * sz, y0 + (i // cols) * sz
            cell = sprites[n][sz]
            atlas[yy:yy + sz, x:x + sz] = cell
            nz = np.where(cell[..., 3] > 0)
            e[sz] = [x, yy, int(nz[0].min())]  # cell x, cell y, first opaque row (the sprite's top)
        index[n] = e
    img = Image.fromarray(atlas, "RGBA")
    img.quantize(colors=255, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(os.path.join(OUT, "items.png"), optimize=True)
    json.dump({"w": AW, "h": y, "sizes": SIZES, "items": index}, open(os.path.join(OUT, "items.json"), "w"), separators=(",", ":"))
    print("items", len(names), names, "atlas", AW, y)


SIZES = [32, 16, 12]


def fit(im, CELL, ndimage):
    # fit into CELL-2 px (1px margin for the outline), keep aspect, area-average (premultiplied, so the key
    # colour never bleeds in), hard alpha, then a crisp 1px dark outline round it, bottom-centred in the cell
    s = (CELL - 2) / max(im.size)
    w, h = max(1, round(im.size[0] * s)), max(1, round(im.size[1] * s))
    pm = np.asarray(im).astype(float)
    pm[..., :3] *= pm[..., 3:4] / 255
    small = Image.fromarray(pm.astype(np.uint8), "RGBA").resize((w, h), Image.BOX)
    sa = np.asarray(small).astype(float)
    al = sa[..., 3:4]
    rgb = np.where(al > 0, sa[..., :3] * 255 / np.maximum(al, 1), 0)
    hard = (al[..., 0] > (110 if CELL > 16 else 90))
    if CELL <= 16:  # small: a bit more saturation and contrast so it still reads
        g = rgb.mean(-1, keepdims=True)
        rgb = np.clip(g + (rgb - g) * 1.25, 0, 255)
        rgb = np.clip((rgb - 128) * 1.1 + 128 + 6, 0, 255)
    out = np.zeros((CELL, CELL, 4), np.uint8)
    ox, oy = (CELL - w) // 2, CELL - 1 - h
    out[oy:oy + h, ox:ox + w, :3] = np.clip(rgb, 0, 255)
    out[oy:oy + h, ox:ox + w, 3] = hard * 255
    op = out[..., 3] > 0
    ring = ndimage.binary_dilation(op) & ~op
    out[ring, :3] = np.array([34, 24, 40], np.uint8)
    out[ring, 3] = 255
    return out


if __name__ == "__main__":
    what = sys.argv[3:] or ["tiles", "items"]
    if "tiles" in what:
        tiles()
    if "items" in what:
        items()
