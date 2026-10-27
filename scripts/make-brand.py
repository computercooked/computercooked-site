# Brand images from the two source logos (1024x1024, art on near-black): the wordmark (mascot + "computer cooked")
# and the mascot alone. Not part of any build; run only when the art changes.
#
#   pip install pillow fonttools brotli        (fonttools + brotli read the site font for the share image)
#   python scripts/make-brand.py <folder with wordmark.jpg|png and mascot.jpg|png>
#
# The near-black background is cut out (flood fill from the corners) and a thin dark outline is kept so the art
# holds its edge on the site's #101114. Writes:
#   assets/brand/wordmark-{480,960}.webp   homepage + games hub header (960 = 2x)
#   assets/brand/mascot-{96,192}.webp      small mascot (spare, for UI)
#   favicon.ico (16/32/48), assets/favicon-32.png, assets/apple-touch-icon.png (180),
#   assets/icon-192.png, icon-512.png, icon-maskable-512.png (web app manifest), assets/og.png (1200x630 share card)
import io, os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
BG = (16, 17, 20)  # --bg #101114
LIME, LILAC, PAPER = (197, 255, 73), (181, 154, 255), (245, 243, 237)


def source(folder, name):
    for ext in ("png", "jpg", "jpeg", "webp"):
        p = os.path.join(folder, f"{name}.{ext}")
        if os.path.exists(p):
            return Image.open(p).convert("RGB")
    sys.exit(f"missing {name}.png/.jpg in {folder}")


def cut(im):
    w, h = im.size
    fill = im.convert("L").point(lambda v: 255 if v <= 24 else 0)
    for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        ImageDraw.floodfill(fill, seed, 128)
    art = ImageChops.invert(fill.point(lambda v: 255 if v == 128 else 0))
    ring = art.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(1.2))
    out = Image.new("RGBA", (w, h), (6, 6, 6, 0))
    out.putalpha(ring)
    top = im.convert("RGBA")
    top.putalpha(art.filter(ImageFilter.GaussianBlur(0.6)))
    out = Image.alpha_composite(out, top)
    return out.crop(out.getbbox())


def fit(img, box_w, box_h):
    s = min(box_w / img.width, box_h / img.height)
    return img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)


def square(art, size, frac, bg=BG):
    c = Image.new("RGBA", (size, size), bg + (255,) if bg else (0, 0, 0, 0))
    a = fit(art, size * frac, size * frac)
    c.alpha_composite(a, ((size - a.width) // 2, (size - a.height) // 2))
    return c


def save(img, rel, **kw):
    p = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    img.save(p, **kw)
    print(f"{rel}  {img.size[0]}x{img.size[1]}  {round(os.path.getsize(p) / 1024, 1)} KB")


def site_font(size):
    from fontTools.ttLib import TTFont
    buf = io.BytesIO()
    f = TTFont(os.path.join(ROOT, "assets/fonts/jetbrains-mono-latin-800-normal.woff2"))
    f.flavor = None
    f.save(buf)
    buf.seek(0)
    return ImageFont.truetype(buf, size)


def og(word):
    w, h = 1200, 630
    img = Image.new("RGBA", (w, h), BG + (255,))
    # soft lime glow top-left, lilac bottom-right, like the old card
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse((-300, -380, 700, 320), fill=LIME + (40,))
    g.ellipse((700, 330, 1500, 1000), fill=LILAC + (40,))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(120)))
    lines = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lines)
    for y in range(0, h, 4):
        ld.line((0, y, w, y), fill=(255, 255, 255, 9))
    img.alpha_composite(lines)
    a = fit(word, 900, 440)
    img.alpha_composite(a, ((w - a.width) // 2, 50))
    d = ImageDraw.Draw(img)
    d.text((w // 2, 535), "the computer is not handling it well.", font=site_font(34), fill=PAPER, anchor="mm")
    d.text((w - 48, h - 36), "computercooked.com", font=site_font(24), fill=LILAC, anchor="rs")
    return img.convert("RGB")


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__ or "usage: python scripts/make-brand.py <folder>")
    word, mascot = cut(source(sys.argv[1], "wordmark")), cut(source(sys.argv[1], "mascot"))
    # small sizes drop the steam so the computer itself fills the icon
    a = mascot.getchannel("A")
    top = next(y for y in range(mascot.height) if sum(a.getpixel((x, y)) > 200 for x in range(mascot.width)) > mascot.width * 0.3)
    body = mascot.crop((0, max(0, top - 8), mascot.width, mascot.height))

    for wd in (480, 960):
        save(fit(word, wd, 10_000), f"assets/brand/wordmark-{wd}.webp", quality=88, method=6)
    for s in (96, 192):
        save(square(mascot, s, 1, None), f"assets/brand/mascot-{s}.webp", quality=88, method=6)

    ico = [square(body, s, 0.94, None) for s in (16, 32, 48)]
    ico[2].save(os.path.join(ROOT, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)], append_images=ico[:2])
    print("favicon.ico  16/32/48", round(os.path.getsize(os.path.join(ROOT, "favicon.ico")) / 1024, 1), "KB")
    save(ico[1], "assets/favicon-32.png", optimize=True)
    save(square(body, 180, 0.8).convert("RGB"), "assets/apple-touch-icon.png", optimize=True)
    save(square(mascot, 192, 0.84).convert("RGB"), "assets/icon-192.png", optimize=True)
    save(square(mascot, 512, 0.84).convert("RGB"), "assets/icon-512.png", optimize=True)
    save(square(mascot, 512, 0.62).convert("RGB"), "assets/icon-maskable-512.png", optimize=True)  # launcher safe zone
    save(og(word), "assets/og.png", optimize=True)


if __name__ == "__main__":
    main()
