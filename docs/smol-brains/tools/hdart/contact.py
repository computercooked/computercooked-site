import os
from PIL import Image, ImageDraw
D = "/tmp/claude-0/-home-user-computercooked-site/9e16fbd6-0476-5ed7-a1d1-1bef57eca838/scratchpad/hdart/"
OUT = "/tmp/claude-0/-home-user-computercooked-site/9e16fbd6-0476-5ed7-a1d1-1bef57eca838/scratchpad/hd-contact.png"
order = ["grass", "dirt", "sand", "rock", "snow", "farmland", "water", "bark", "leaves", "needles", "blossom", "palm", "brick", "thatch", "planks", "roof"]
S = 192
sheet = Image.new("RGB", (S * 8 + 40, 2000), (24, 20, 30))
d = ImageDraw.Draw(sheet)
d.text((10, 6), "generated raw (nano banana 2, nb-B-pov.png as style ref)", fill="white")
for i, n in enumerate(order):
    im = Image.open(D + "raw/" + n + ".png").convert("RGB").resize((S, S))
    x, y = 10 + (i % 8) * (S + 2), 24 + (i // 8) * (S + 16)
    sheet.paste(im, (x, y)); d.text((x + 2, y + S + 1), n, fill="white")
y0 = 24 + 2 * (S + 16) + 10
d.text((10, y0), "in game: 64px seamless pixel tiles (shown 3x tiled 2x2 at 1.5x)", fill="white")
col = Image.open(D + "out/art/tiles-color.png").convert("RGB")
for i, n in enumerate(order):
    t = col.crop(((i % 4) * 64, (i // 4) * 64, (i % 4) * 64 + 64, (i // 4) * 64 + 64))
    t2 = Image.new("RGB", (128, 128))
    for a in range(2):
        for b in range(2):
            t2.paste(t, (a * 64, b * 64))
    t2 = t2.resize((S, S), Image.NEAREST)
    x, y = 10 + (i % 8) * (S + 2), y0 + 18 + (i // 8) * (S + 16)
    sheet.paste(t2, (x, y)); d.text((x + 2, y + S + 1), n, fill="white")
y1 = y0 + 18 + 2 * (S + 16) + 10
d.text((10, y1), "item sprites (32 / 16 / 12 px atlas, 3x)", fill="white")
it = Image.open(D + "out/art/items.png").convert("RGBA")
bg = Image.new("RGBA", it.size, (96, 140, 72, 255)); bg.alpha_composite(it)
bg = bg.convert("RGB").resize((it.width * 3, it.height * 3), Image.NEAREST)
sheet.paste(bg, (10, y1 + 18))
for k, n in enumerate(["items1", "items2", "items3"]):
    r = Image.open(D + "raw/" + n + ".png").convert("RGB").resize((240, 240))
    sheet.paste(r, (10 + it.width * 3 + 20 + k * 250, y1 + 18))
sheet = sheet.crop((0, 0, sheet.width, y1 + 18 + bg.height + 10))
sheet.save(OUT)
print(sheet.size)
