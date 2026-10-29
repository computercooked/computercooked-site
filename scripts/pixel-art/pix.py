"""Hand-placed pixel art -> SVG (crisp rects, horizontal runs merged). Shared by the Gary sprite and phase-three art."""
PAL = {
    "K": "#0E0F11",  # outline / bg
    "H": "#5A4332",  # gary's hair
    "S": "#E8D9B5",  # skin (beige token)
    "s": "#C9B791",  # skin shade
    "W": "#F3F1EA",  # shirt (text token)
    "w": "#A3A09A",  # shirt shade (text-dim)
    "T": "#FF5A4E",  # tie (alarm token)
    "P": "#5B6170",  # trousers
    "A": "#B8F23A",  # accent
    "L": "#2A2D34",  # line
    "B": "#8FD3FF",  # sweat drop
}

GARY = """
..SS............SS..
..SS....HHHH....SS..
..WW..HHHHHHHH.BWW..
..WW.HHHHHHHHHHBWW..
..WW.HSSSSSSSSH.WW..
...WWSSKSSSSKSSWW...
...WWSSKSSSSKSSWW...
....WSSSSSSSSSSW....
....WSSSSKKSSSSW....
.....SSSKssKSSS.....
.....SSSSKKSSSS.....
......SSSSSSSS......
.....WWWWTTWWWW.....
....WWWWWTTWWWWW....
....wWWWWTTWWWWw....
....wWWWWWTWWWWw....
....WWWWWWWWWWWW....
....PPPPPPPPPPPP....
....PPPPP..PPPPP....
....PPPPP..PPPPP....
....PPPP....PPPP....
...HHHHH....HHHHH...
"""


def grid(art):
    return [row for row in art.strip("\n").split("\n")]


def svg(art, pal=PAL, scale=1, cls="", label=None, extra=""):
    rows = grid(art)
    h, w = len(rows), max(len(r) for r in rows)
    rects = []
    for y, row in enumerate(rows):
        x = 0
        while x < len(row):
            c = row[x]
            if c == "." or c == " ":
                x += 1; continue
            x2 = x
            while x2 < len(row) and row[x2] == c: x2 += 1
            rects.append(f'<rect x="{x}" y="{y}" width="{x2 - x}" height="1" fill="{pal[c]}"/>')
            x = x2
    a = f' role="img" aria-label="{label}"' if label else ' aria-hidden="true" focusable="false"'
    c = f' class="{cls}"' if cls else ""
    return (f'<svg{c} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w * scale}" height="{h * scale}" '
            f'shape-rendering="crispEdges"{a}>{"".join(rects)}{extra}</svg>')


def png(art, path, scale=10, pal=PAL, bg=None):
    from PIL import Image
    rows = grid(art)
    h, w = len(rows), max(len(r) for r in rows)
    im = Image.new("RGBA", (w, h), bg or (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, c in enumerate(row):
            if c in pal:
                v = pal[c].lstrip("#"); im.putpixel((x, y), tuple(int(v[i:i + 2], 16) for i in (0, 2, 4)) + (255,))
    im.resize((w * scale, h * scale), Image.NEAREST).save(path)


if __name__ == "__main__":
    import os
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ccsite-read")
    open(os.path.join(root, "assets", "gary.svg"), "w", encoding="utf8").write(svg(GARY, label="gary"))
    print(svg(GARY)[:120])
