"""Small versions of the mascot for the game covers (scripts/pixel-art/art.py): mini-<h>.png, h pixels tall."""
import json, os, sys
from PIL import Image
here = os.path.dirname(os.path.abspath(__file__))
P = json.load(open(os.path.join(here, "mascot-parts.json")))
PAL = ["#0b0c0e", "#e6d596", "#d8c187", "#a6975d", "#554e2c", "#a8d533", "#dcff7a", "#0b0d0a"]
def hexrgb(c): return tuple(int(c[k:k + 2], 16) for k in (1, 3, 5))
def full(face="sad", steam=True):
    im = Image.new("RGBA", (P["w"], P["h"]), (0, 0, 0, 0))
    for runs in (P["steam"] if steam else []) + [P["body"], P["flame"], P["slime"], P["faces"][face]]:
        for x, y, w, c in runs:
            for i in range(w): im.putpixel((x + i, y), hexrgb(c) + (255,))
    return im.crop(im.getbbox())
def mini(h, face="sad", steam=True):
    im = full(face, steam); w = round(im.size[0] * h / im.size[1])
    sm = im.resize((w, h), Image.BOX)
    pal = [hexrgb(c) for c in PAL]
    out = Image.new("RGBA", sm.size, (0, 0, 0, 0))
    for y in range(h):
        for x in range(w):
            r, g, b, a = sm.getpixel((x, y))
            if a < 110: continue
            best = min(pal, key=lambda p: (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2)
            out.putpixel((x, y), best + (255,))
    return out
if __name__ == "__main__":
    o = sys.argv[1]
    for h in (22, 30, 40):
        mini(h).save(os.path.join(o, f"mini-{h}.png"))
        mini(h, "happy").save(os.path.join(o, f"mini-{h}-happy.png"))
    print("minis ok")
