import sys
from PIL import Image
src, dst, k = sys.argv[1], sys.argv[2], int(sys.argv[3])
b = Image.open(src).convert("RGBA")
bg = Image.new("RGBA", b.size, (90, 140, 70, 255))
bg.alpha_composite(b)
bg.resize((b.width * k, b.height * k), Image.NEAREST).save(dst)
