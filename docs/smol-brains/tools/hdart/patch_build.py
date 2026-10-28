import sys
p = sys.argv[1]
s = open(p).read()
start = s.index('            rgba = np.dstack([crop, alpha * 255]).astype(np.uint8)')
end = s.index('if __name__ == "__main__":')
new = '''            rgba = np.dstack([crop, alpha * 255]).astype(np.uint8)
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


'''
s = s[:start] + new + s[end:]
open(p, 'w').write(s)
print("patched")
