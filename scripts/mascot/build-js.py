"""assets/mascot.js from mascot.tpl.js + mascot-parts.json (both next to this script).
mascot-parts.json is made by mascot2.py (python mascot2.py <folder> writes it there); it is committed so anyone can
rebuild. Edit behaviour in mascot.tpl.js, never in assets/mascot.js.   python scripts/mascot/build-js.py assets/mascot.js"""
import json, os, sys
here = os.path.dirname(os.path.abspath(__file__))
parts = json.load(open(os.path.join(here, "mascot-parts.json")))
tpl = open(os.path.join(here, "mascot.tpl.js"), encoding="utf8").read()
open(sys.argv[1], "w", encoding="utf8", newline="\n").write(tpl.replace("__PARTS__", json.dumps(parts, separators=(",", ":"))))
print("ok")
