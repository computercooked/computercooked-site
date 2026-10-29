"""The Computer Cooked computer, from the brand avatar (botcomms/assets/pfp-computer.png), as layered pixel art.
Body, steam, flame and slime come from the art itself (sampled on a 12 px grid, cleaned, background made transparent);
the face is redrawn so it can change mood and follow the cursor. Writes mascot.svg, mascot-<mood>.svg and
mascot-parts.json (for assets/mascot.js) into the given folder."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

d = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "grid.json")))
W, H, grid = d["W"], d["H"], d["grid"]
# palette: 0 light case, 1 case, 2 lime, 3 side, 4 deep shade, 5+ blacks
COL = {0: "#e6d596", 1: "#d8c187", 3: "#a6975d", 4: "#554e2c"}
BLACK = lambda c: c >= 5
SX0, SX1, SY0, SY1 = 7, 32, 25, 44          # screen interior
inside = lambda x, y: SX0 <= x <= SX1 and SY0 <= y <= SY1

# background = black cells connected to the border
bg = set(); stack = [(x, y) for x in range(W) for y in (0, H - 1)] + [(x, y) for y in range(H) for x in (0, W - 1)]
while stack:
    x, y = stack.pop()
    if (x, y) in bg or not (0 <= x < W and 0 <= y < H) or not BLACK(grid[y][x]): continue
    bg.add((x, y)); stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]

body, steam, flame, slime = {}, {}, {}, {}
for y in range(H):
    for x in range(W):
        c = grid[y][x]
        if c == 2:
            if y <= 17: steam[(x, y)] = "g"
            elif x >= 37 and y < 50: flame[(x, y)] = "g"
            elif inside(x, y): body[(x, y)] = "K"          # old face: screen black, the face layer draws over it
            else: slime[(x, y)] = "g"
        elif BLACK(c):
            if (x, y) in bg:
                # enclosed by steam wisps etc. stays transparent
                continue
            body[(x, y)] = "K" if inside(x, y) else "o"
        else: body[(x, y)] = c
# under the slime/flame: fill body with the nearest case colour in the row, so nothing shows through when they animate
for (x, y) in list(slime) + list(flame):
    if (x, y) in body: continue
    for dx in range(1, 6):
        for xx in (x - dx, x + dx):
            v = body.get((xx, y))
            if v not in (None, "o", "K"): body[(x, y)] = v; break
        if (x, y) in body: break
# lighter lime in the flame core
for (x, y) in list(flame):
    if all((x + a, y + b) in flame for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))): flame[(x, y)] = "G"
# a dark outline round the slime drips where they hang over nothing
for (x, y) in list(slime):
    for a, b in ((1, 0), (-1, 0), (0, 1)):
        p = (x + a, y + b)
        if p not in slime and p not in body and p not in flame: body[p] = "o"
# glass glint
for p in [(9, 27), (10, 27), (9, 28)]: body[p] = "#1d2418"

# faces drawn at full size on the screen (interior x 7..32, y 25..44); mirrored around x = 19.5
def M(pts): return set(pts) | {(39 - x, y) for x, y in pts}
def hl(y, x0, x1): return [(x, y) for x in range(x0, x1 + 1)]
BROWS = hl(31, 10, 12) + hl(30, 12, 14) + hl(29, 14, 16)
FROWN = hl(40, 15, 18) + hl(39, 18, 21) + hl(40, 21, 24) + hl(41, 13, 15) + hl(41, 24, 26) + [(12, 42), (27, 42), (12, 43), (27, 43)]
faces = {
    "sad": M(BROWS + hl(33, 10, 16) + hl(34, 11, 16) + hl(35, 12, 15) + hl(36, 13, 14)) | set(FROWN),
    "happy": M([(13, 32), (14, 32), (12, 33), (15, 33), (11, 34), (16, 34), (10, 35), (17, 35), (11, 33), (16, 33)])
             | set(hl(39, 11, 12) + hl(39, 27, 28) + hl(40, 12, 13) + hl(40, 26, 27) + hl(41, 13, 26) + hl(42, 15, 24)),
    "shock": M(hl(30, 12, 14) + hl(36, 12, 14) + [(11, 31), (15, 31), (11, 35), (15, 35)] + [(10, y) for y in range(32, 35)] + [(16, y) for y in range(32, 35)] + [(13, 33)])
             | set(hl(38, 18, 21) + hl(43, 18, 21) + [(17, y) for y in range(39, 43)] + [(22, y) for y in range(39, 43)]),
    "cooked": M([(10 + i, 30 + i) for i in range(6)] + [(15 - i, 30 + i) for i in range(6)] + [(11 + i, 30 + i) for i in range(5)] + [(14 - i, 30 + i) for i in range(5)])
              | {(x, 40 if (x // 2) % 2 else 41) for x in range(11, 29)},
    "blink": M(BROWS + hl(35, 10, 16) + hl(34, 10, 10) + hl(34, 16, 16)) | set(FROWN),
}
# strokes 2 cells tall, like the brand face
faces = {k: {q: "g" for p in v for q in (p, (p[0], p[1] + 1))} for k, v in faces.items()}

COLORS = {"o": "#0b0c0e", "K": "#0b0d0a", "g": "#a8d533", "G": "#dcff7a"}
def color(c): return COL.get(c, COLORS.get(c, c)) if not isinstance(c, str) or c in COLORS or not c.startswith("#") else c
def runs(px):
    out, rows = [], {}
    for (x, y), c in px.items(): rows.setdefault(y, {})[x] = color(c)
    for y in sorted(rows):
        xs = sorted(rows[y]); i = 0
        while i < len(xs):
            j = i
            while j + 1 < len(xs) and xs[j + 1] == xs[j] + 1 and rows[y][xs[j + 1]] == rows[y][xs[i]]: j += 1
            out.append([xs[i], y, xs[j] - xs[i] + 1, rows[y][xs[i]]]); i = j + 1
    return out
def g(px, cls): return f'<g class="{cls}">' + "".join(f'<rect x="{x}" y="{y}" width="{w}" height="1" fill="{c}"/>' for x, y, w, c in runs(px)) + "</g>"

# steam split into its three wisps by column
wisps = [{p: v for p, v in steam.items() if lo <= p[0] <= hi} for lo, hi in ((0, 18), (19, 26), (27, 45))]
def svg(face="sad"):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" shape-rendering="crispEdges">'
            + '<g class="cc-steam">' + "".join(g(w, f"cc-wisp cc-wisp{i}") for i, w in enumerate(wisps)) + "</g>"
            + g(body, "cc-body") + g(flame, "cc-flame") + g(slime, "cc-slime")
            + '<g class="cc-face">' + g(faces[face], "cc-mood") + "</g></svg>")

if __name__ == "__main__":
    out = sys.argv[1]
    open(os.path.join(out, "mascot.svg"), "w", encoding="utf8").write(svg())
    for k in faces: open(os.path.join(out, f"mascot-{k}.svg"), "w", encoding="utf8").write(svg(k))
    parts = {"w": W, "h": H, "steam": [runs(w) for w in wisps], "body": runs(body), "flame": runs(flame), "slime": runs(slime), "faces": {k: runs(v) for k, v in faces.items()}}
    json.dump(parts, open(os.path.join(out, "mascot-parts.json"), "w"), separators=(",", ":"))
    print("ok", W, H, len(json.dumps(parts, separators=(",", ":"))))
