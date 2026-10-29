"""assets/logo.svg: the mascot's head (monitor, steam, flame, sad face) for the header and small spots."""
import json, os, sys
here = os.path.dirname(os.path.abspath(__file__))
P = json.load(open(os.path.join(here, "mascot-parts.json")))
runs = [r for layer in P["steam"] + [P["body"], P["flame"], P["slime"], P["faces"]["sad"]] for r in layer if r[1] < 50]
x0 = min(r[0] for r in runs); x1 = max(r[0] + r[2] for r in runs); y0 = min(r[1] for r in runs)
w, h = x1 - x0, 50 - y0; s = max(w, h)
ox, oy = x0 - (s - w) / 2, y0 - (s - h) / 2
body = "".join(f'<rect x="{x}" y="{y}" width="{n}" height="1" fill="{c}"/>' for x, y, n, c in runs)
open(sys.argv[1], "w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{ox:g} {oy:g} {s} {s}" shape-rendering="crispEdges" role="img" aria-label="Computer Cooked">{body}</svg>')
print("logo ok", s)
