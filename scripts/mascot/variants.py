"""Mascot variations (K-0046), hand-drawn on top of the brand computer from mascot2.py: same pixels, same palette.
  happy    the resting computer, cheering
  gamer    headset with a lime mic, a controller on the keyboard, a focused face
  fire     on fire (404): lime flames out of the top and the side, smoke, X eyes
  sleep    asleep (loading): closed eyes, Zs instead of steam
  trophy   high score: a gold trophy, confetti
Each is written to <out>/<name>.svg (its own small animation, off with prefers-reduced-motion) and <out>/<name>.png
(scale 8). hero.py makes the wide banner from these.  python variants.py <out folder> [preview sheet path]"""
import os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mascot2 as m

K, G, GL = "#0b0c0e", "#a8d533", "#dcff7a"
CASE, CASE2, SIDE, DEEP = "#e6d596", "#d8c187", "#a6975d", "#554e2c"
GREY, GREY2, GREY3 = "#2a2d33", "#3d414a", "#5a5f6b"
GOLD, GOLD2, GOLD3, GOLDHI = "#f2c94c", "#d29b2a", "#9a6a17", "#fff1b0"
SMOKE, SMOKE2 = "#3b3f36", "#55594d"
GDARK = "#5f7f14"

def col(px):
    return {p: m.color(c) for p, c in px.items()}

def stamp(px, x0, y0, rows, pal):
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != "." and ch != " ": px[(x0 + i, y0 + j)] = pal[ch]

def thick(pts):
    """face strokes are 2 cells tall, like the brand face"""
    return {q: G for p in pts for q in (p, (p[0], p[1] + 1))}

def mirror(pts):
    return set(pts) | {(39 - x, y) for x, y in pts}

def hl(y, x0, x1): return [(x, y) for x in range(x0, x1 + 1)]

FACES = {k: {p: m.color(c) for p, c in v.items()} for k, v in m.faces.items()}
# new faces
FACES["sleep"] = thick(mirror(hl(34, 11, 15) + [(10, 33), (16, 33)]) | set(hl(40, 18, 21) + hl(41, 18, 21)))
FACES["focus"] = thick(mirror(hl(31, 10, 12) + hl(32, 13, 15) + [(16, 33)] + hl(34, 12, 14) + hl(35, 12, 14))
                       | set(hl(40, 14, 25) + [(13, 39), (26, 39)])) | {(x, y): "#e0607e" for x in range(20, 24) for y in (42, 43)}

def base(face="sad", steam=True, flame=True):
    layers = []
    if steam: layers += [("ccv-wisp ccv-w%d" % i, col(w)) for i, w in enumerate(m.wisps)]
    layers.append(("", col(m.body)))
    if flame: layers.append(("ccv-flame", col(m.flame)))
    layers.append(("ccv-slime", col(m.slime)))
    layers.append(("ccv-face", dict(FACES[face])))
    return layers

# ---------- accessories, drawn by hand ----------
def headset():
    band, cups = {}, {}
    # band over the top of the case: an arc, 2 cells thick with a dark outline
    import math
    for t in range(0, 181):
        a = math.radians(180 + t)
        for r, c in ((26, K), (25, GREY2), (24, GREY2), (23, K)):
            x, y = round(23.5 + r * math.cos(a)), round(26 + r * 0.46 * math.sin(a))
            if y < 27: band[(x, y)] = c
    cup = ["..KKKK..", ".KGGGGK.", "KGKKKKGK", "KGK33KGK", "KGK33KGK", "KGK33KGK", "KGK33KGK", "KGKKKKGK", ".KGGGGK.", "..KKKK.."]
    pal = {"K": K, "G": GREY3, "3": GREY2}
    stamp(cups, -4, 23, cup, pal)
    stamp(cups, 44, 23, cup, pal)
    for x, y in ((0, 25), (0, 26), (47, 25), (47, 26)): cups[(x, y)] = G  # lime rings
    # mic boom from the left cup to the mouth corner
    for i, (x, y) in enumerate([(1, 33), (2, 34), (3, 35), (4, 36), (5, 37), (6, 38), (7, 39), (8, 40), (9, 40)]):
        cups[(x, y)] = K; cups[(x, y + 1)] = GREY3
    stamp(cups, 9, 39, ["KKK", "KGK", "KKK"], {"K": K, "G": GL})
    return band, cups

def controller():
    px = {}
    rows = [
        "....KKKKKKKKKKKKKK....",
        "..KK33333333333333KK..",
        ".K3333333333333333333K",
        "K33KK3333333333333G33K",
        "K3KKKK33KK33KK33G3R3K.",
        "K33KK3333333333333B33K",
        "K3333333KKKKKK3333333K",
        "K33333KK......KK33333K",
        ".K333K..........K333K.",
        "..KKK............KKK..",
    ]
    stamp(px, 12, 53, rows, {"K": K, "3": GREY2, "G": G, "R": "#e0607e", "B": "#5fb4e6"})
    # cable into the base
    for y in range(50, 53): px[(23, y)] = K
    return px

def flames():
    """big lime flames out of the top of the case and up the right side: clean tongues, light core, dark edge"""
    import math
    px = {}
    def tongue(cx, bottom, h, w, lean):
        for y in range(h):
            f = y / h
            half = (w / 2) * (1 - f) ** 0.75
            c = cx + lean * f * f * h * 0.35
            x0, x1 = round(c - half), round(c + half)
            for x in range(x0, x1 + 1):
                core = f < 0.62 and x0 + 1 < x < x1 - 1 and y < h - 2
                p = (x, bottom - y)
                if px.get(p) != GL: px[p] = GL if core else G
    for cx, h, w, lean in ((8, 12, 7, -1), (15, 20, 10, -0.6), (23, 25, 12, 0.3), (31, 19, 10, 0.7), (38, 13, 8, 1), (43, 9, 5, 1.2)):
        tongue(cx, 20, h, w, lean)
    for cx, h, w, lean in ((46, 15, 6, 0.8), (48, 10, 4, 1)):
        tongue(cx, 44, h, w, lean)
    edge = {}
    for (x, y) in list(px):
        for a, b in ((1, 0), (-1, 0), (0, -1), (1, -1), (-1, -1)):
            q = (x + a, y + b)
            if q not in px and q[1] < 20 or (q not in px and q[0] > 45): edge.setdefault(q, GDARK)
    # one smoke cloud: union of round puffs, lighter on top-left, dark rim
    blobs = ((13, -9, 3.6), (19, -12, 4.2), (26, -10, 3.8), (31, -7, 3), (22, -17, 3), (16, -16, 2.5))
    inside = lambda x, y, k=0: any((x - cx) ** 2 + (y - cy) ** 2 <= (r - k) ** 2 for cx, cy, r in blobs)
    puffs = {}
    for x in range(0, 40):
        for y in range(-26, -2):
            if inside(x, y): puffs[(x, y)] = "#8a8e80" if inside(x + 1, y + 1, 1.2) and not inside(x - 1, y - 1, 0) is False and inside(x + 1, y + 1, 1.2) else "#6b6f63"
            elif any(inside(x + a, y + b) for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))): puffs[(x, y)] = SMOKE
    return px, edge, puffs

def zs():
    Z5 = ["KKKKKKK", "KGGGGGK", "KKKKGKK", ".KKGKK.", "KKGKKKK", "KGGGGGK", "KKKKKKK"]
    Z4 = ["KKKKKK", "KGGGGK", "KKKGKK", "KKGKKK", "KGGGGK", "KKKKKK"]
    Z3 = ["KKKKK", "KGGGK", "KKGKK", "KGGGK", "KKKKK"]
    pal = {"K": K, "G": G}
    out = []
    for i, (z, x, y) in enumerate(((Z5, 25, 9), (Z4, 33, 3), (Z3, 40, -2))):
        p = {}; stamp(p, x, y, z, pal)
        # outline only where the glyph has lime: drop the black box corners so it reads as a letter
        p = {q: c for q, c in p.items() if c == G or any(p.get((q[0] + a, q[1] + b)) == G for a in (-1, 0, 1) for b in (-1, 0, 1))}
        out.append(("ccv-z ccv-z%d" % i, p))
    return out

def trophy():
    rows = [
        "...KKKKKKKKKKKK...",
        "KKKKhyyyyyyyyy2KKKK",
        "K22KhyyyyyyyyyY2K22K",
        "K2.KhyyyyyyyyyY2K.2K",
        "K2.KhyyyKKyyyyY2K.2K",
        "K2.KhyyKyKyyyyY2K.2K",
        ".K2KhyyyyKyyyyY2K2K.",
        "..KKhyyyyKyyyyY2KK..",
        "...KyyyyKKKyyyY2K...",
        "....KyyyyyyyyY2K....",
        ".....KKyyyyyY2KK....",
        ".......KKyyY2K......",
        "........KyY2K.......",
        "........KyY2K.......",
        ".......KKyY2KK......",
        ".....KKyyyyY22KK....",
        "....KDDDDDDDDDDDDK..",
        "....KDcccccccccDDK..",
        "....KDDDDDDDDDDDDK..",
        "....KKKKKKKKKKKKKK..",
    ]
    px = {}
    stamp(px, 37, 46, rows, {"K": K, "y": GOLD, "Y": GOLD2, "2": GOLD3, "h": GOLDHI, "D": DEEP, "c": SIDE})
    return px

def confetti(seed=3):
    rnd = random.Random(seed); px = {}
    cols = [G, GL, GOLD, "#e0607e", "#5fb4e6", CASE]
    for _ in range(34):
        x, y = rnd.randint(-6, 58), rnd.randint(-6, 22)
        c = rnd.choice(cols); px[(x, y)] = c
        if rnd.random() < 0.5: px[(x + 1, y)] = c
    return px

def sparkles():
    px = {}
    for x, y in ((-3, 22), (49, 14), (-1, 46), (50, 40), (2, 4)):
        for a, b in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)): px[(x + a, y + b)] = GL if (a, b) == (0, 0) else G
    return px

def variants():
    v = {}
    v["happy"] = base("happy") + [("ccv-spark", sparkles())]
    band, cups = headset()
    v["gamer"] = base("focus") + [("", band), ("", cups), ("", controller())]
    fl, edge, puffs = flames()
    v["fire"] = [("ccv-smoke", puffs), ("ccv-fire", {**edge, **fl})] + base("cooked", steam=False, flame=False)
    v["sleep"] = base("sleep", steam=False) + zs()
    v["trophy"] = base("happy") + [("", trophy()), ("ccv-confetti", confetti())]
    return v

# ---------- output ----------
CSS = ("svg{overflow:visible}.ccv-wisp,.ccv-fire,.ccv-flame,.ccv-z,.ccv-smoke{transform-box:fill-box;transform-origin:50% 100%}"
       "@media (prefers-reduced-motion:no-preference){"
       ".ccv-wisp{animation:s 2.4s ease-in-out infinite}.ccv-w1{animation-delay:-.8s}.ccv-w2{animation-delay:-1.6s}"
       ".ccv-flame{animation:f .5s steps(3) infinite alternate}.ccv-fire{animation:F .32s steps(2) infinite alternate}"
       ".ccv-smoke{animation:k 3s ease-in-out infinite}.ccv-z{animation:z 3s ease-in-out infinite;opacity:0}"
       ".ccv-z1{animation-delay:1s}.ccv-z2{animation-delay:2s}.ccv-spark,.ccv-confetti{animation:t 1.2s steps(2) infinite}}"
       "@keyframes s{0%{transform:translateY(2px) scaleY(.85);opacity:.35}50%{opacity:1}100%{transform:translateY(-3px) scaleY(1.1);opacity:.25}}"
       "@keyframes f{to{transform:scale(.9,1.12)}}@keyframes F{to{transform:scale(1.04,1.1)}}"
       "@keyframes k{50%{transform:translateY(-2px);opacity:.7}}"
       "@keyframes z{0%{opacity:0;transform:translate(-2px,3px)}30%,70%{opacity:1}100%{opacity:0;transform:translate(2px,-3px)}}"
       "@keyframes t{50%{opacity:.35}}")

def bbox(layers):
    pts = [p for _, px in layers for p in px]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)

def svg(layers, label):
    x0, y0, x1, y1 = bbox(layers)
    w, h = x1 - x0 + 1, y1 - y0 + 1
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} {y0} {w} {h}" width="{w * 8}" height="{h * 8}" shape-rendering="crispEdges" role="img" aria-label="{label}"><style>{CSS}</style>']
    for cls, px in layers:
        rows = {}
        for (x, y), c in px.items(): rows.setdefault(y, {})[x] = c
        rects = []
        for y in sorted(rows):
            xs = sorted(rows[y]); i = 0
            while i < len(xs):
                j = i
                while j + 1 < len(xs) and xs[j + 1] == xs[j] + 1 and rows[y][xs[j + 1]] == rows[y][xs[i]]: j += 1
                rects.append(f'<rect x="{xs[i]}" y="{y}" width="{xs[j] - xs[i] + 1}" height="1" fill="{rows[y][xs[i]]}"/>'); i = j + 1
        out.append((f'<g class="{cls}">' if cls else "<g>") + "".join(rects) + "</g>")
    return "".join(out) + "</svg>"

def png(layers, scale=8, pad=0):
    from PIL import Image
    x0, y0, x1, y1 = bbox(layers)
    im = Image.new("RGBA", (x1 - x0 + 1 + 2 * pad, y1 - y0 + 1 + 2 * pad), (0, 0, 0, 0))
    for _, px in layers:
        for (x, y), c in px.items(): im.putpixel((x - x0 + pad, y - y0 + pad), tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) + (255,))
    return im.resize((im.width * scale, im.height * scale), Image.NEAREST) if scale != 1 else im

LABELS = {"happy": "the computer cooked computer, happy", "gamer": "the computer cooked computer in a gaming headset",
          "fire": "the computer cooked computer, on fire", "sleep": "the computer cooked computer, asleep",
          "trophy": "the computer cooked computer with a trophy"}

if __name__ == "__main__":
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    v = variants()
    for k, layers in v.items():
        open(os.path.join(out, k + ".svg"), "w", encoding="utf8").write(svg(layers, LABELS[k]))
        png(layers).save(os.path.join(out, k + ".png"), optimize=True)
        print(k, bbox(layers))
    if len(sys.argv) > 2:
        from PIL import Image
        ims = [png(l, 6, 4) for l in v.values()]
        sheet = Image.new("RGBA", (sum(i.width for i in ims) + 20 * (len(ims) + 1), max(i.height for i in ims) + 40), (17, 19, 15, 255))
        x = 20
        for i in ims: sheet.alpha_composite(i, (x, sheet.height - i.height - 20)); x += i.width + 20
        sheet.save(sys.argv[2])
