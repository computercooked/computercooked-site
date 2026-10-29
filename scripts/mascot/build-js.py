import json, sys
parts = json.load(open("mascot/mascot-parts.json"))
tpl = open("mascot/mascot.tpl.js", encoding="utf8").read()
open(sys.argv[1], "w", encoding="utf8").write(tpl.replace("__PARTS__", json.dumps(parts, separators=(",", ":"))))
print("ok")
