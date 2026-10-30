"""K-0032 phase three: one pixel-art scene per game, on the token palette, Gary or the computer in each, no text.
Each scene draws on a W x H logical canvas (props placed from the centre), so the same scene renders as the
320x200 thumbnail (160x100 at x2) and the 1200x630 share image (200x105 at x6)."""
import os, sys
from PIL import Image
import pix
_MD = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "mascot")
MINI = {h: Image.open(os.path.join(_MD, f"mini-{h}.png")).convert("RGBA") for h in (30, 40)}

T = {  # tokens
    "bg": "#0E0F11", "surface": "#17181C", "s2": "#202228", "line": "#2A2D34", "text": "#F3F1EA",
    "dim": "#A3A09A", "accent": "#B8F23A", "beige": "#E8D9B5", "alarm": "#FF5A4E",
    "shade": "#C9B791", "deep": "#121317", "acc2": "#7FA82A", "beige2": "#8C7F63",
}
def rgb(c): c = T.get(c, c).lstrip("#"); return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4)) + (255,)

COMPUTER = """
.BBBBBBBBBBBBBBBBBB.
BBBBBBBBBBBBBBBBBBBB
BBKKKKKKKKKKKKKKKKBB
BBKKKKKKKKKKKKKKKKBB
BBKKAKKKKKKKKXKXKKBB
BBKKKAKKKKKKKKXKKKBB
BBKKAKKKKKKKKXKXKKBB
BBKKKKKKKKKKKKKKKKBB
BBKKKKKAAAAKKKKKKKBB
BBKKKKKKKKKKKKKKKKBB
BBBBBBBBBBBBBBBBBBBB
ssssssssssssssssssss
ssssssssssssssAsAsss
........ssss........
......ssssssss......
"""
CPAL = {"B": T["beige"], "s": T["shade"], "K": T["bg"], "A": T["accent"], "X": T["accent"]}

GNOME = """
..R..
.RRR.
RRRRR
.SSS.
WWWWW
.BBB.
"""
GPAL = {"R": T["alarm"], "S": T["beige"], "W": T["text"], "B": T["line"]}

BELL = """
..bb..
.BBBB.
.BBBB.
BBBBBB
BBBBBB
..BB..
"""
COIN = """
.AA.
AAAA
AAAA
.AA.
"""
FLOPPY = """
DDDDDD
DLLLLD
DLLLLD
DDDDDD
DSSSSD
DSSSSD
"""
BOOT = """
.BBB..
.BBB..
.BBB..
.BBBBB
BBBBBB
"""
PIG = """
....BB.B..
..BBBBBBB.
.BBBBBBBBB
BBKBBBBBBB
.BBBBBBBB.
..B.B..B.B
"""
CURSOR = """
K....
KK...
KWK..
KWWK.
KWWWK
KWWKK
KKWK.
...K.
"""
SUB = """
....BB......
....BB......
.BBBBBBBBBB.
BBKBBKBBBBBB
.BBBBBBBBBB.
"""
CREATURE = """
.A.
AAA
A.A
"""


class Canvas:
    def __init__(s, W, H, bg="bg"):
        s.W, s.H = W, H
        s.im = Image.new("RGBA", (W, H), rgb(bg))
        s.cx, s.cy = W // 2, H // 2

    def px(s, x, y, c):
        if 0 <= x < s.W and 0 <= y < s.H: s.im.putpixel((x, y), rgb(c))

    def rect(s, x, y, w, h, c):
        for yy in range(y, y + h):
            for xx in range(x, x + w): s.px(xx, yy, c)

    def box(s, x, y, w, h, c):  # 1px outline
        s.rect(x, y, w, 1, c); s.rect(x, y + h - 1, w, 1, c); s.rect(x, y, 1, h, c); s.rect(x + w - 1, y, 1, h, c)

    def window(s, x, y, w, h, title="line", body="surface", close=True):
        s.rect(x, y, w, h, body); s.box(x, y, w, h, "line"); s.rect(x + 1, y + 1, w - 2, 3, title)
        if close: s.rect(x + w - 4, y + 1, 2, 2, "alarm")

    def line(s, x0, y0, x1, y1, c):
        dx, dy = abs(x1 - x0), -abs(y1 - y0); sx = 1 if x0 < x1 else -1; sy = 1 if y0 < y1 else -1; e = dx + dy
        while True:
            s.px(x0, y0, c)
            if x0 == x1 and y0 == y1: break
            e2 = 2 * e
            if e2 >= dy: e += dy; x0 += sx
            if e2 <= dx: e += dx; y0 += sy

    def disc(s, x, y, r, c):
        for yy in range(-r, r + 1):
            for xx in range(-r, r + 1):
                if xx * xx + yy * yy <= r * r + r * 0.6: s.px(x + xx, y + yy, c)

    def ring(s, x, y, r, c):
        for yy in range(-r - 1, r + 2):
            for xx in range(-r - 1, r + 2):
                d = (xx * xx + yy * yy) ** 0.5
                if abs(d - r) < 0.55: s.px(x + xx, y + yy, c)

    def sprite(s, art, x, y, pal, flip=False, scale=1):
        rows = pix.grid(art)
        for j, row in enumerate(rows):
            if flip: row = row[::-1]
            for i, ch in enumerate(row):
                if ch in pal:
                    for a in range(scale):
                        for b in range(scale): s.px(x + i * scale + a, y + j * scale + b, pal[ch])

    # K-0044: the one mascot everywhere is the Computer Cooked computer (scripts/mascot/mini.py). Gary is retired:
    # both old call sites now draw the computer, bottom-centred where the old sprite stood.
    def mascot(s, cx, bottom, h=30, flip=False):
        im = MINI[h].transpose(Image.FLIP_LEFT_RIGHT) if flip else MINI[h]
        s.im.alpha_composite(im, (cx - im.size[0] // 2, bottom - im.size[1]))
    def gary(s, x, y, flip=False): s.mascot(x + 10, y + 22, 30, flip)
    def computer(s, x, y, flip=False, scale=1): s.mascot(x + 10 * scale, y + 15 * scale, 30 if scale == 1 else 40, flip)

    def grid(s, step, c="deep"):
        for x in range(0, s.W, step): s.rect(x, 0, 1, s.H, c)
        for y in range(0, s.H, step): s.rect(0, y, s.W, 1, c)

    def floor(s, y, c="s2", top="line"):
        s.rect(0, y, s.W, s.H - y, c); s.rect(0, y, s.W, 1, top)


def bell_pal(gold=False): return {"B": T["accent"] if gold else T["beige"], "b": T["shade"]}


# ---------------- scenes ----------------
def crash(c):
    c.grid(10)
    c.floor(c.H - 18)
    for i, (dx, dy) in enumerate([(-58, 10), (-34, 26), (30, 8), (50, 30), (-10, 4)]):
        c.window(c.cx + dx, dy, 22, 14)
        c.rect(c.cx + dx + 3, dy + 7, 14, 1, "dim"); c.rect(c.cx + dx + 3, dy + 10, 10, 1, "dim")
    c.computer(c.cx - 20, c.H - 18 - 30, scale=2)
    c.rect(c.cx + 26, c.H - 26, 7, 8, "beige"); c.rect(c.cx + 33, c.H - 24, 2, 4, "beige")  # coffee
    for i in range(3): c.rect(c.cx + 27 + i * 2, c.H - 31 - (i % 2) * 2, 1, 3, "dim")


def handbag(c):
    c.rect(0, 0, c.W, c.H, "#1B2414")
    for y in range(0, c.H, 6): c.rect(0, y, c.W, 3, "#202C17")
    c.gary(c.cx - 10, c.H - 32)
    for dx, dy, f in [(-52, 18, False), (-30, 52, True), (36, 22, False), (58, 56, True), (22, 6, True)]:
        c.sprite(GNOME, c.cx + dx, dy, GPAL)
        c.line(c.cx + dx + (6 if f else -2), dy + 3, c.cx + dx + (12 if f else -8), dy + 1, "dim")
    c.rect(c.cx - 40, c.H - 22, 9, 7, "alarm"); c.rect(c.cx - 38, c.H - 25, 5, 1, "alarm"); c.rect(c.cx - 38, c.H - 25, 1, 3, "alarm"); c.rect(c.cx - 34, c.H - 25, 1, 3, "alarm")


def popup(c):
    c.grid(12)
    for i in range(6):
        c.window(c.cx - 50 + i * 12, 10 + i * 9, 54, 32, title="beige" if i == 5 else "line")
        c.rect(c.cx - 44 + i * 12, 20 + i * 9, 30, 2, "line"); c.rect(c.cx - 44 + i * 12, 25 + i * 9, 22, 2, "line")
    c.rect(c.cx + 42, 56, 9, 9, "alarm"); c.line(c.cx + 44, 58, c.cx + 48, 62, "text"); c.line(c.cx + 48, 58, c.cx + 44, 62, "text")
    c.sprite(CURSOR, c.cx + 54, 50, {"K": T["bg"], "W": T["text"]})
    c.gary(c.cx - 70, c.H - 24)


def keyboard(c):
    c.rect(0, 0, c.W, c.H, "surface")
    for row in range(4):
        y = c.H - 40 + row * 10
        for k in range(-1, c.W // 12 + 2):
            x = k * 12 + (row * 4) % 12 - 6
            c.rect(x, y, 10, 8, "s2"); c.rect(x, y, 10, 1, "line"); c.rect(x, y + 7, 10, 1, "deep")
    ex = c.W - 28
    c.rect(ex, c.H - 62, 20, 18, "accent"); c.rect(ex, c.H - 45, 20, 2, "acc2")
    c.gary(c.cx - 34, c.H - 64)
    for i in range(4): c.rect(c.cx - 50 - i * 6, c.H - 56 + i * 4, 10, 1, "dim")


def desktop(c):
    c.rect(0, 0, c.W, c.H, "#141A22")
    c.rect(0, c.H - 8, c.W, 8, "s2"); c.rect(2, c.H - 6, 10, 4, "accent")
    spots = [(-70, 8), (-70, 30), (-50, 52), (40, 10), (60, 34), (28, 50), (-20, 12), (8, 30)]
    for i, (dx, dy) in enumerate(spots):
        x, y = c.cx + dx, dy
        if i % 2: c.rect(x, y + 2, 12, 9, "beige"); c.rect(x, y, 5, 3, "beige"); c.rect(x, y + 3, 12, 1, "shade")
        else: c.rect(x, y, 10, 12, "text"); c.rect(x + 2, y + 3, 6, 1, "dim"); c.rect(x + 2, y + 6, 6, 1, "dim"); c.rect(x + 7, y, 3, 3, "dim")
    c.computer(c.cx - 20, c.H - 40, scale=2)


def fathom(c):
    c.rect(0, 0, c.W, c.H, "deep")
    for y in range(8, c.H, 9):
        for x in range((y * 3) % 14, c.W, 14): c.rect(x, y, 5, 1, "line")
    c.ring(c.cx + 30, c.cy - 4, 10, "accent"); c.ring(c.cx + 30, c.cy - 4, 18, "acc2"); c.rect(c.cx + 29, c.cy - 5, 3, 3, "alarm")
    c.sprite(SUB, c.cx - 46, c.cy + 6, {"B": T["beige"], "K": T["bg"]}, scale=2)
    c.computer(c.cx - 44, c.cy - 26)
    for i in range(4): c.rect(c.cx - 20 + i * 3, c.cy - 30 - i * 5, 2, 2, "dim")


def tabs(c):
    c.grid(10)
    c.floor(c.H - 10)
    c.computer(c.cx - 10, c.H - 25)
    y = c.H - 25
    for i in range(7):
        w = 34 - (i % 3) * 4; off = [-1, 3, -4, 2, -2, 5, -6][i]
        y -= 8
        c.rect(c.cx - w // 2 + off, y, w, 7, "surface"); c.box(c.cx - w // 2 + off, y, w, 7, "line")
        c.rect(c.cx - w // 2 + off + 2, y - 2, 10, 3, "beige" if i % 2 else "dim")
    c.rect(c.cx + 18, 4, 2, 6, "alarm"); c.rect(c.cx + 18, 12, 2, 2, "alarm")


def slide(c):
    c.rect(0, 0, c.W, c.H, "surface")
    gx, gy, s = c.cx - 32, 12, 15
    c.rect(gx - 2, gy - 2, s * 4 + 3, s * 4 + 3, "line")
    tiles = {(0, 0): "beige", (1, 0): "s2", (3, 0): "s2", (0, 1): "s2", (1, 1): "accent", (2, 1): "accent", (3, 1): "s2",
             (0, 2): "beige", (2, 2): "s2", (3, 2): "beige", (0, 3): "s2", (1, 3): "s2", (2, 3): "beige"}
    for (x, y), col in tiles.items():
        c.rect(gx + x * s, gy + y * s, s - 1, s - 1, col); c.rect(gx + x * s, gy + y * s + s - 2, s - 1, 1, "deep")
    c.computer(c.cx + 36, c.H - 34, scale=2)


def bells(c):
    c.grid(12)
    for r in range(3):
        for k in range(-4, 5):
            x = c.cx + k * 16 - 3; y = 10 + r * 20
            if abs(k) > 3 and r == 1: continue
            c.sprite(BELL, x, y, bell_pal(gold=(k, r) == (1, 1)), scale=1 if (k, r) != (1, 1) else 2)
    c.ring(c.cx + 22, 36, 12, "accent")
    c.rect(c.cx - 66, c.H - 18, 22, 4, "beige2"); c.rect(c.cx - 46, c.H - 22, 6, 12, "beige")  # mallet
    c.computer(c.cx - 20, c.H - 32, scale=2)


def devil(c):
    c.rect(0, 0, c.W, c.H, "bg")
    c.grid(8, "deep")
    y = c.H - 22
    c.rect(0, y, c.cx - 16, 22, "s2"); c.rect(c.cx + 16, y, c.W, 22, "s2")
    for x in range(0, c.W, 8):
        if not (c.cx - 16 <= x < c.cx + 16): c.rect(x, y, 7, 1, "line")
    for i in range(6): c.rect(c.cx - 14 + i * 5, c.H - 3, 1, 1, "alarm"); c.line(c.cx - 16 + i * 5, c.H - 1, c.cx - 14 + i * 5, c.H - 4, "alarm"); c.line(c.cx - 12 + i * 5, c.H - 1, c.cx - 14 + i * 5, c.H - 4, "alarm")
    c.box(c.W - 26, y - 20, 12, 20, "accent"); c.rect(c.W - 17, y - 10, 2, 2, "accent")
    c.gary(c.cx - 10, y - 14)
    c.sprite(CURSOR, c.cx + 24, 14, {"K": T["bg"], "W": T["text"]})


def purge(c):
    c.rect(0, 0, c.W, c.H, "surface")
    for i in range(5): c.sprite(FLOPPY, 8, 8 + i * 17, {"D": T["s2"], "L": T["beige"], "S": T["dim"]}, scale=2)
    for i in range(5): c.rect(22, 13 + i * 17, 16, 1, "accent")
    import random; rnd = random.Random(7)
    bx, by = c.cx + 26, c.cy - 4
    for _ in range(140):
        x, y = bx + rnd.randint(-16, 16), by + rnd.randint(-16, 16)
        if (x - bx) ** 2 + (y - by) ** 2 < 260: c.rect(x, y, 2, 2, rnd.choice(["alarm", "accent", "beige", "dim"]))
    c.computer(c.cx - 30, c.H - 34, scale=2)


def cheats(c):
    c.rect(0, 0, c.W, c.H, "surface")
    gx, gy, s = c.cx - 34, 12, 22
    for i in (1, 2): c.rect(gx + i * s, gy, 2, s * 3, "line"); c.rect(gx, gy + i * s, s * 3, 2, "line")
    def X(x, y): c.line(x + 5, y + 5, x + 16, y + 16, "accent"); c.line(x + 16, y + 5, x + 5, y + 16, "accent"); c.line(x + 6, y + 5, x + 17, y + 16, "accent"); c.line(x + 17, y + 5, x + 6, y + 16, "accent")
    def O(x, y): c.ring(x + 11, y + 11, 6, "beige"); c.ring(x + 11, y + 11, 5, "beige")
    X(gx, gy); O(gx + s, gy); X(gx + 2 * s, gy + s); O(gx + s, gy + s); O(gx, gy + 2 * s)
    c.rect(gx + 2 * s + 2, gy + 2 * s + 10, 18, 6, "beige2"); c.rect(gx + 2 * s + 6, gy + 2 * s + 15, 8, 3, "beige2")  # coffee spill
    c.computer(c.cx + 38, c.H - 34, scale=2)


def overdue(c):
    c.grid(12)
    c.window(c.cx - 66, 8, 40, 26); c.rect(c.cx - 60, 18, 26, 2, "alarm"); c.rect(c.cx - 60, 23, 18, 2, "line")
    c.window(c.cx + 30, 14, 40, 24); c.rect(c.cx + 36, 24, 26, 2, "line")
    c.sprite(PIG, c.cx + 10, c.H - 30, {"B": T["beige"], "K": T["bg"]}, scale=2)
    for dx, dy in [(-10, 40), (2, 30), (40, 46), (26, 36)]: c.sprite(COIN, c.cx + dx, dy, {"A": T["accent"]})
    c.gary(c.cx - 40, c.H - 24)


def ram(c):
    c.rect(0, 0, c.W, c.H, "deep")
    c.grid(10, "surface")
    c.disc(c.cx - 6, c.cy + 4, 14, "accent"); c.rect(c.cx - 12, c.cy, 3, 3, "bg"); c.rect(c.cx - 1, c.cy, 3, 3, "bg")
    for dx, dy, r in [(-50, -26, 4), (-30, -34, 3), (24, -30, 3), (-62, 0, 2), (30, 30, 3)]: c.disc(c.cx + dx, c.cy + dy, r, "beige")
    c.disc(c.cx + 52, c.cy - 6, 22, "alarm"); c.rect(c.cx + 42, c.cy - 12, 4, 4, "bg"); c.rect(c.cx + 54, c.cy - 12, 4, 4, "bg")
    c.computer(c.cx - 76, c.H - 32, scale=2)


def smol(c):
    c.rect(0, 0, c.W, c.H, "deep")
    for y in range(6, c.H, 8):
        for x in range((y * 5) % 16, c.W, 16): c.rect(x, y, 6, 1, "line")
    c.disc(c.cx, c.cy + 8, 40, "beige"); c.disc(c.cx, c.cy + 6, 34, "acc2"); c.disc(c.cx - 4, c.cy + 4, 26, "accent")
    for dx, dy in [(-20, -6), (-6, 12), (10, -2), (18, 16), (-14, 22), (4, 26)]: c.sprite(CREATURE, c.cx + dx, c.cy + dy, {"A": T["bg"]})
    c.rect(c.cx + 20, c.cy - 20, 3, 10, "beige2"); c.disc(c.cx + 21, c.cy - 22, 5, "acc2")
    c.gary(c.cx - 12, c.cy - 26)


def reel(c):
    c.rect(0, 0, c.W, c.H, "bg")
    c.disc(c.W - 26, 18, 8, "beige")
    for i in range(18): c.px((i * 37) % c.W, (i * 13) % 40, "dim")
    wy = c.H - 30
    c.rect(0, wy, c.W, 30, "s2")
    for y in range(wy + 4, c.H, 6):
        for x in range((y * 7) % 18, c.W, 18): c.rect(x, y, 6, 1, "line")
    c.rect(0, wy - 6, c.cx - 24, 4, "beige2"); c.rect(10, wy - 2, 2, 10, "beige2"); c.rect(c.cx - 36, wy - 2, 2, 10, "beige2")
    c.gary(c.cx - 52, wy - 28)
    c.line(c.cx - 34, wy - 24, c.cx + 10, wy - 46, "dim"); c.line(c.cx + 10, wy - 46, c.cx + 28, wy + 10, "text")
    c.sprite(BOOT, c.cx + 24, wy + 10, {"B": T["beige2"]}, scale=2)
    c.ring(c.cx + 29, wy + 2, 4, "line")

HSC_BANANA = """
.........kk.
........kyk.
........kYk.
.......kYYk.
.......kYYk.
......kYYyk.
.....kYYYk..
...kkYYYyk..
.kkYYYYyk...
kYYYYyyk....
.kkkkkk.....
"""
HSC_APPLE = """
.....k......
......k.kk..
......kkGGk.
...kkkkkkk..
..kRRRkRRRk.
.kRRRRRRRRrk
.kWWRRRWWRrk
.kWERRRWERrk
.kRRRRRRRrrk
..kRRRRRrrk.
...kkrkrkk..
"""
HSC_GHOST = """
....kkkk....
...kWWWWk...
..kWWWWWWk..
.kWWkWWkWWk.
.kWWkWWkWWk.
.kWWWWWWWWk.
.kWWWWWWWWk.
.kWWWWWWWwk.
.kWWwWWwWWk.
.kWk.kWk.kk.
"""
HSC_PAL = {"k": "#0b0c0e", "Y": "#f6d84a", "y": "#c9a628", "R": "#e5484d", "r": "#9e2a2e", "G": "#5fbf3a", "W": "#f4f1e6", "w": "#c9c6bb", "E": "#ff3344"}


def checkout(c):
    c.rect(0, 0, c.W, c.H, "#14150f")
    for i in range(14): c.px((i * 41) % c.W, (i * 17) % 34, "line")
    by = c.H - 24
    c.rect(0, by, c.W, 10, "#23261d")
    for x in range(0, c.W, 8): c.rect(x, by, 3, 10, "#3a3f2e")
    c.rect(0, by - 1, c.W, 1, "deep")
    c.computer(c.cx - 70, by - 30, scale=2)
    c.sprite(HSC_BANANA, c.cx - 26, by - 22, HSC_PAL, scale=2)
    c.disc(c.cx + 22, by - 11, 15, "#2a2140")
    c.sprite(HSC_APPLE, c.cx + 10, by - 23, HSC_PAL, scale=2)
    c.sprite(HSC_GHOST, c.cx + 46, by - 58, HSC_PAL, scale=2)
    c.window(c.cx - 44, 8, 60, 22, title="alarm")
    c.rect(c.cx - 40, 18, 44, 1, "text"); c.rect(c.cx - 40, 22, 30, 1, "dim")
    c.rect(c.W - 22, by - 14, 14, 13, "#c9a36a"); c.rect(c.W - 22, by - 14, 14, 2, "#a9844d")


CS_SKULL = """
..kkkkkk..
.kWWWWWWk.
kWWWWWWWWk
kWkkWWkkWk
kWkEWWEkWk
kWWWkkWWWk
.kWWWWWWk.
..kWkWkWk.
..kkkkkkk.
"""
CS_WORM = """
......kk..
.....kGGk.
.....kGEk.
..kk.kGGk.
.kGGkkGgk.
kGgGGGGk..
kGGgGgk...
.kkkkk....
"""
CS_POPUP = """
kkkkkkkkkk
kBBBBBBkRk
kkkkkkkkkk
kWWWWWWWWk
kWYYYYYYWk
kWWWWWWWWk
kWWGGGGWWk
kkkkkkkkkk
"""
CS_PAL = {"k": "#120c08", "W": "#fffaf0", "E": "#ff2a2a", "G": "#5fbf3a", "g": "#2f7a1c", "B": "#3d6be0", "R": "#e5302a", "Y": "#f6d84a"}
CS_DIG = {"1": [".k.", "kk.", ".k.", ".k.", "kkk"], "3": ["kk.", "..k", ".k.", "..k", "kk."], "4": ["k.k", "k.k", "kkk", "..k", "..k"],
          "7": ["kkk", "..k", ".k.", ".k.", ".k."], "9": [".k.", "k.k", ".kk", "..k", "kk."]}


def sweeper(c):
    # an overheating 95-style window on a hot backdrop: a fried grid, a few viruses, the computer as the smiley button
    for y in range(c.H):
        k = y / c.H
        c.rect(0, y, c.W, 1, "#%02x%02x%02x" % (int(30 + 110 * k), int(12 + 30 * k), 8))
    wx, wy, ww, wh = c.cx - 50, 6, 100, c.H - 10
    c.rect(wx - 1, wy - 1, ww + 2, wh + 2, "#120c08"); c.rect(wx, wy, ww, wh, "#f3ead2")
    for x in range(ww - 2):
        t = x / (ww - 2)
        c.rect(wx + 1 + x, wy + 1, 1, 5, "#%02x%02x%02x" % (int(122 + 133 * t), int(29 + 130 * t), int(10 + 40 * t)))
    for i in range(3): c.rect(wx + ww - 6 - i * 5, wy + 2, 4, 3, "#f3ead2")
    c.rect(wx + 3, wy + 8, ww - 6, 16, "#8f7f5c"); c.rect(wx + 4, wy + 9, ww - 8, 14, "#f3ead2")
    c.rect(wx + 6, wy + 11, 26, 10, "#160a06"); c.rect(wx + 8, wy + 17, 18, 2, "#ff6a2a")
    c.rect(wx + ww - 32, wy + 11, 26, 10, "#160a06"); c.rect(wx + ww - 30, wy + 17, 12, 2, "#a8d533")
    c.computer(c.cx - 11, wy + 5, scale=1)
    gx, gy, t = wx + 4, wy + 27, 8
    cols, rows = 11, (wh - 31) // t
    opened = {(4, 1), (5, 1), (6, 1), (3, 2), (4, 2), (5, 2), (6, 2), (7, 2), (4, 3), (5, 3), (6, 3), (5, 4)}
    nums = {(4, 1): "3", (6, 1): "1", (3, 2): "4", (7, 2): "7", (5, 4): "9", (4, 3): "1"}
    for j in range(rows):
        for i in range(cols):
            x, y = gx + i * t + 2, gy + j * t
            if (i, j) in opened:
                c.rect(x, y, t, t, "#dccfae")
                d = nums.get((i, j))
                if d:
                    col = {"1": "#1f47b8", "3": "#1f47b8", "4": "#1d7a2a", "7": "#b51d1d", "9": "#b51d1d"}[d]
                    for yy, row in enumerate(CS_DIG[d]):
                        for xx, ch in enumerate(row):
                            if ch == "k": c.px(x + 3 + xx, y + 2 + yy, col)
            else:
                c.rect(x, y, t, t, "#fffaf0"); c.rect(x + 1, y + 1, t - 1, t - 1, "#8f7f5c"); c.rect(x + 1, y + 1, t - 2, t - 2, "#f3ead2")
    c.rect(gx + 9 * t + 2, gy + 4 * t, t, t, "#2a0a0a"); c.sprite(CS_SKULL, gx + 9 * t + 1, gy + 4 * t - 1, CS_PAL)
    c.rect(gx + 2 * t + 2, gy + 5 * t, t, t, "#ffd9c9"); c.sprite(CS_WORM, gx + 2 * t + 1, gy + 5 * t, CS_PAL)
    c.sprite(CS_POPUP, gx + 7 * t + 1, gy + 0 * t, CS_PAL)
    # steam and heat
    for i, (x, y) in enumerate([(-38, 2), (-20, 0), (14, 1), (34, 3), (46, 0)]):
        c.disc(c.cx + x, y + 2, 2, "#f6e9d8")
    for i in range(10): c.px(wx - 4 - (i % 3), wy + 10 + i * 7, "#ff8a2a"); c.px(wx + ww + 3 + (i % 3), wy + 14 + i * 6, "#ff8a2a")

GC_GOOSE = """
..........KKK...
.........KWWWK..
.........KWkWKOO
.........KWWWOOo
..........KWWKK.
..........KWWK..
..........KWWK..
....KKK...KWWK..
...KWWWKKKWWWK..
..KWWWWWWWWWWK..
.KWwWWWWWWWWWK..
.KWwwWWWWWWWK...
..KWwwwWWWWK....
...KKKKKKKK.....
.....OO..OO.....
"""
GC_BREAD = """
..KKKKK..
.KTTTTTK.
KTTtTtTTK
KTTTTTTTK
KtTTTTTtK
.KKKKKKK.
"""
GC_PAL = {"K": "#0b0c0e", "W": "#f7f5ee", "w": "#cfcbbd", "O": "#ff9a3d", "o": "#c46a1c", "k": "#1a1b1f", "T": "#d79b52", "t": "#9c6a2c"}


def goosecourt(c):
    c.rect(0, 0, c.W, c.H, "#14130f")
    for x in range(0, c.W, 14): c.rect(x, 0, 1, c.H - 22, "#1c1810")
    c.rect(0, c.H - 22, c.W, 22, "#211b12")
    # the bench, the computer presiding in a wig
    bx = c.W - 62
    c.rect(bx - 2, 44, 58, 22, "#0b0c0e"); c.rect(bx, 46, 54, 20, "#6b4424"); c.rect(bx, 46, 54, 2, "#8a5a32")
    mx = bx + 27
    for i in range(4): c.rect(mx - 19, 22 + i * 5, 4, 4, "#e9e6dc"); c.rect(mx + 14, 22 + i * 5, 4, 4, "#e9e6dc")
    c.mascot(mx, 47, 40)
    c.rect(mx - 17, 18, 32, 3, "#e9e6dc"); c.rect(mx - 17, 18, 32, 1, "#cfcbbd")
    # gavel
    c.rect(bx - 14, 40, 10, 4, "#8a5a32"); c.rect(bx - 10, 44, 2, 6, "#4e301a")
    # the dock and the accused, with the evidence
    c.sprite(GC_GOOSE, 34, c.H - 22 - 44, GC_PAL, scale=3)
    c.sprite(GC_BREAD, 34 + 45, c.H - 22 - 44 + 6, GC_PAL, scale=2)
    c.rect(26, c.H - 30, 62, 12, "#0b0c0e"); c.rect(28, c.H - 28, 58, 10, "#6b4424"); c.rect(28, c.H - 28, 58, 2, "#8a5a32")
    # placard
    c.window(8, 6, 66, 18, title="alarm")
    c.rect(12, 15, 30, 1, "text"); c.rect(46, 13, 9, 5, "#d79b52")

EF_FISH = """
....KKKKKK....K.
..KK111111KK.K1K
.K1w11111111K11K
K1ee1111111111K.
K11111222222K11K
.K122222222K.K1K
..KK222222KK..K.
....KKKKKK......
"""


def ef_pal(a, b): return {"K": "#0b0c0e", "w": "#f4f1e6", "e": "#0b0c0e", "1": a, "2": b}


def elevator(c):
    # inside the car: steel walls, open doors on a fish-market hallway, the computer as the floor display, fish everywhere
    c.rect(0, 0, c.W, c.H, "#2b2f36")
    bl, br, bt, bb = 34, c.W - 34, 26, 66
    for y in range(c.H):
        k = y / c.H
        c.rect(0, y, int(bl * min(1, 0.2 + k)), 1, "#3a3f47"); c.rect(c.W - int(bl * min(1, 0.2 + k)), y, int(bl * min(1, 0.2 + k)), 1, "#3a3f47")
    c.rect(bl, bt, br - bl, bb - bt, "#4c535d")
    dl, dr, dt = c.cx - 24, c.cx + 24, bt + 4
    c.rect(dl, dt, dr - dl, bb - dt, "#20403a"); c.rect(dl, bb - 10, dr - dl, 10, "#2c5a50")
    c.rect(dl, dt, 7, bb - dt, "#8b939e"); c.rect(dr - 7, dt, 7, bb - dt, "#8b939e")
    c.rect(dl - 2, dt - 2, dr - dl + 4, 2, "#0b0c0e")
    for y in range(bb, c.H):
        k = (y - bb) / (c.H - bb)
        x0 = int(bl * (1 - k)); c.rect(x0, y, c.W - 2 * x0, 1, "#5b2a3a" if (y - bb) % 7 else "#4a2230")
    c.rect(br + 4, bt + 4, 6, 30, "#0b0c0e"); c.rect(br + 5, bt + 12, 4, 21, "#ff4d5e")
    c.rect(c.cx - 26, 1, 52, 22, "#0b0c0e"); c.rect(c.cx - 25, 2, 50, 20, "#e6d596"); c.rect(c.cx + 21, 2, 4, 20, "#a6975d")
    c.rect(c.cx - 22, 5, 41, 14, "#0b0c0e")
    for (x, y) in [(-19, 8), (-18, 8), (-13, 8), (-12, 8), (-18, 14), (-17, 14), (-16, 14), (-15, 14), (-14, 14)]: c.px(c.cx + x, y, "#a8d533")
    nine = ["kkk", "k.k", "kkk", "..k", "kkk"]
    for yy, row in enumerate(nine):
        for xx, ch in enumerate(row):
            if ch == "k": c.rect(c.cx + 4 + xx * 2, 7 + yy * 2, 2, 2, "#a8d533")
    fish = [("#9fb3c8", "#5f7387", 14, 76, 2, False), ("#7fbf5a", "#4f8a32", 104, 80, 2, True), ("#f6d84a", "#c9a628", 62, 70, 2, False),
            ("#f29bb0", "#c4637c", c.cx - 8, 36, 1, True), ("#e8c06a", "#b08a3c", 40, 50, 1, False), ("#9fb3c8", "#5f7387", 118, 54, 1, True)]
    for a, b, x, y, sc, fl in fish: c.sprite(EF_FISH, x, y, ef_pal(a, b), flip=fl, scale=sc)


def sandwich(c):
    # a kitchen wall, the computer in a chef's hat, a sandwich tower with a sock in it and one slice flying off
    c.rect(0, 0, c.W, c.H, "#1a1c1a")
    for y in range(0, c.H, 12):
        for x in range(-6 * ((y // 12) % 2), c.W, 12): c.rect(x + 1, y + 1, 10, 10, "#202321" if ((x // 12) + (y // 12)) % 2 else "#1d1f1d")
    c.rect(0, c.H - 12, c.W, 12, "#3b2a1c"); c.rect(0, c.H - 12, c.W, 2, "#5a4029")
    c.rect(c.cx - 34, c.H - 15, 68, 4, "#0b0c0e"); c.rect(c.cx - 33, c.H - 15, 66, 2, "#e9e6dc")
    layers = [("#8a5a2b", "#d9a35b", 6), ("#3f7f22", "#6fbf3a", 3), ("#9e2a2e", "#e5484d", 4), ("#c99a1e", "#f6c945", 3),
              ("#c4637c", "#f29bb0", 3), ("sock", None, 4), ("#3f7f22", "#6fbf3a", 3), ("#2f5e1c", "#4f8a32", 3),
              ("#c99a1e", "#f6c945", 3), ("#9e2a2e", "#e5484d", 4), ("#8a5a2b", "#d9a35b", 6), ("#c4637c", "#f29bb0", 3), ("#3f7f22", "#6fbf3a", 3)]
    y, w, x = c.H - 15, 50, c.cx - 25
    for i, (a, b, h) in enumerate(layers):
        y -= h
        off = [0, 1, -1, 2, 0, -2, 1, 3, 2, 0, 1, 4, 3][i]
        if a == "sock":
            for k in range(0, w, 4): c.rect(x + off + k, y, min(4, w - k), h, "#e5484d" if (k // 4) % 2 else "#f4f1e6")
        else:
            c.rect(x + off, y, w, h, a); c.rect(x + off, y, w, h - 1, b)
        if i > 8: w -= 3
    # the falling trimmed slice
    c.rect(c.cx + 30, y + 6, 10, 3, "#c99a1e"); c.rect(c.cx + 30, y + 6, 10, 2, "#f6c945")
    # the next ingredient sliding in
    c.rect(c.cx + 12, y - 9, 34, 3, "#9e2a2e"); c.rect(c.cx + 12, y - 9, 34, 2, "#e5484d")
    # the chef
    c.mascot(29, 54, 40)
    c.rect(18, 13, 22, 11, "#0b0c0e"); c.rect(19, 14, 20, 9, "#f4f1e6"); c.rect(19, 21, 20, 2, "#d8d3c4")
    c.rect(c.W - 30, 14, 22, 18, "#0b0c0e"); c.rect(c.W - 28, 16, 18, 14, "#14203a")
    for (a, b) in [(4, 3), (12, 9), (7, 11)]: c.px(c.W - 28 + a, 16 + b, "#e9e1c0")


def microwave(c):
    # the computer as a microwave: lit window with a puffed popcorn bag and flying kernels, face and timer on the display
    c.rect(0, 0, c.W, c.H, "#1b1d22")
    for y in range(0, c.H, 6): c.rect(0, y, c.W, 3, "#1d1f24")
    c.rect(0, c.H - 14, c.W, 14, "#3b2a1c"); c.rect(0, c.H - 14, c.W, 2, "#5a4029")
    mx, my, mw, mh = 14, 16, 132, 72
    c.rect(mx - 1, my - 1, mw + 2, mh + 2, "#0b0c0e"); c.rect(mx, my, mw, mh, "#e6d596"); c.rect(mx, my + mh - 4, mw, 4, "#a6975d")
    wx, wy, ww, wh = mx + 6, my + 7, 84, 58
    c.rect(wx - 2, wy - 2, ww + 4, wh + 4, "#0b0c0e"); c.rect(wx, wy, ww, wh, "#6b6236")
    c.rect(wx + 8, wy, 8, wh, "#776d3e")
    c.rect(wx + 12, wy + wh - 6, ww - 24, 3, "#2a2a24")
    bx, by = wx + ww // 2 - 13, wy + wh - 6
    c.rect(bx - 1, by - 27, 28, 27, "#0b0c0e")
    for i in range(6): c.rect(bx + i * 26 // 6, by - 26, 26 // 6 + 1, 26, "#e5484d" if i % 2 else "#f4f1e6")
    c.rect(bx + 4, by - 31, 18, 5, "#f4f1e6")
    for (x, y) in [(-22, -30), (-16, -40), (-6, -44), (8, -46), (18, -38), (26, -28), (-28, -18), (30, -14)]: c.rect(wx + ww // 2 + x, by + y, 3, 3, "#f4f1e6")
    c.rect(wx + ww + 3, wy + 10, 3, wh - 20, "#0b0c0e")
    px = wx + ww + 9
    c.rect(px, wy, mx + mw - px - 5, 22, "#0b0c0e")
    face = ["................", "................", "...##......##...", "..#..#....#..#..", "................", "................", "...#........#...", "....########....", ".....######.....", "................"]
    for j, row in enumerate(face):
        for i, ch in enumerate(row):
            if ch == "#": c.px(px + 4 + i, wy + 2 + j, "#a8d533")
    c.rect(px + 9, wy + 15, 2, 5, "#a8d533"); c.rect(px + 13, wy + 15, 4, 1, "#a8d533"); c.rect(px + 16, wy + 15, 1, 5, "#a8d533"); c.rect(px + 13, wy + 17, 4, 1, "#a8d533"); c.rect(px + 13, wy + 19, 4, 1, "#a8d533")
    for j in range(3):
        for i in range(3): c.rect(px + 1 + i * 8, wy + 27 + j * 7, 6, 5, "#0b0c0e"); c.rect(px + 1 + i * 8, wy + 27 + j * 7, 6, 4, "#d6c784")
    c.rect(px + 1, wy + 49, 22, 6, "#0b0c0e"); c.rect(px + 1, wy + 49, 22, 5, "#a8d533")


SCENES = {
    "crash": crash, "handbag-havoc": handbag, "one-percent-popup": popup, "keyboard-escape": keyboard,
    "desktop-jam": desktop, "fathom": fathom, "tab-hoarder": tabs, "crash-test-daily": slide, "bellchain": bells,
    "level-devil-exe": devil, "pixel-purge": purge, "crash-cheats": cheats, "overdue-notice": overdue,
    "plus-one-ram": ram, "smol-brains": smol, "reel-weird": reel, "haunted-self-checkout": checkout, "goose-court": goosecourt,
    "cooked-sweeper": sweeper, "elevator-full-of-fish": elevator, "sandwich-tower": sandwich, "microwave-panic": microwave,
}


def render(slug, W, H, scale):
    c = Canvas(W, H); SCENES[slug](c)
    return c.im.resize((W * scale, H * scale), Image.NEAREST).convert("RGB")


if __name__ == "__main__":
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for slug in SCENES:
        render(slug, 160, 100, 2).save(os.path.join(out, slug + "-cover.png"), optimize=True)
        render(slug, 200, 105, 6).save(os.path.join(out, slug + "-og.png"), optimize=True)
    print("rendered", len(SCENES))
