"""Favicon, app icons and the header logo from the mascot pixels (scripts/mascot)."""
import json, os, sys
from PIL import Image
here = os.path.dirname(os.path.abspath(__file__))
P = json.load(open(os.path.join(here, "mascot-parts.json")))
out = sys.argv[1]
def canvas(layers, face="sad"):
    im = Image.new("RGBA", (P["w"], P["h"]), (0, 0, 0, 0))
    for runs in layers + [P["faces"][face]]:
        for x, y, w, c in runs:
            for i in range(w): im.putpixel((x + i, y), tuple(int(c[k:k + 2], 16) for k in (1, 3, 5)) + (255,))
    return im
full = canvas(P["steam"] + [P["body"], P["flame"], P["slime"]])
bb = full.getbbox(); full = full.crop(bb)
def square(im, size, bg=(14, 15, 17, 255), pad=0.1, radius=0):
    S = max(im.size); n = int(S / (1 - 2 * pad)) + 1
    sq = Image.new("RGBA", (n, n), bg); sq.alpha_composite(im, ((n - im.size[0]) // 2, (n - im.size[1]) // 2))
    k = max(1, size // n)  # integer upscale keeps pixels crisp, then fit
    big = sq.resize((n * k, n * k), Image.NEAREST)
    return big.resize((size, size), Image.NEAREST) if big.size[0] != size else big
# the head (monitor + steam) reads better small: crop off the base
head = canvas(P["steam"] + [P["body"], P["flame"], P["slime"]]).crop((bb[0], bb[1], bb[2], 50))
square(head, 32, pad=0.04).save(os.path.join(out, "favicon-32.png"))
square(head, 48, pad=0.04).save(os.path.join(here, "fav48.png"))
Image.open(os.path.join(here, "fav48.png")).save(os.path.join(out, "..", "favicon.ico"), sizes=[(48, 48), (32, 32), (16, 16)])
square(full, 180, pad=0.08).save(os.path.join(out, "apple-touch-icon.png"))
square(full, 192, pad=0.08).save(os.path.join(out, "icon-192.png"))
square(full, 512, pad=0.08).save(os.path.join(out, "icon-512.png"))
square(full, 512, pad=0.2).save(os.path.join(out, "icon-maskable-512.png"))
print("icons ok", full.size)
