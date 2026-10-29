from PIL import Image
import sys, json
P = int(sys.argv[1]) if len(sys.argv) > 1 else 12
im = Image.open(r'C:\Agents\botcomms\assets\pfp-computer.png').convert('RGB')
x0, y0, x1, y1 = 232, 118, 792, 918
W, H = (x1 - x0) // P, (y1 - y0) // P
q = im.crop((x0, y0, x0 + W * P, y0 + H * P)).quantize(colors=12, method=Image.Quantize.MEDIANCUT)
pal = q.getpalette()[:36]
cols = ['#%02x%02x%02x' % tuple(pal[i*3:i*3+3]) for i in range(12)]
grid = []
for gy in range(H):
    row = []
    for gx in range(W):
        cnt = {}
        for dy in range(P // 4, P - P // 4):
            for dx in range(P // 4, P - P // 4):
                c = q.getpixel((gx * P + dx, gy * P + dy)); cnt[c] = cnt.get(c, 0) + 1
        row.append(max(cnt, key=cnt.get))
    grid.append(row)
json.dump({"W": W, "H": H, "cols": cols, "grid": grid}, open("mascot/grid.json", "w"))
s = 8
out = Image.new("RGB", (W * s, H * s))
for gy, row in enumerate(grid):
    for gx, c in enumerate(row):
        out.paste(tuple(pal[c*3:c*3+3]), (gx*s, gy*s, gx*s+s, gy*s+s))
out.save("mascot/grid.png"); print(W, H, cols)
