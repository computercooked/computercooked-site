// summarise ladder logs: node sum.js base new ...  (reads <tag>-<seed>.txt for seeds 1..3)
const fs = require("fs"), dir = __dirname;
const tags = process.argv.slice(2);
const seeds = (process.env.SEEDS || "1,2,3").split(",");
console.log("tag  seed | builder | town | city | ascended | minPop | endPop | eggs | love% | joined | deaths(old/other)");
for (const tag of tags) for (const s of seeds) {
  const f = `${dir}/${tag}-${s}.txt`; if (!fs.existsSync(f)) continue;
  const L = fs.readFileSync(f, "utf8").split("\n");
  const t = re => { const l = L.find(x => re.test(x)); return l ? parseFloat(l) : null; };
  const builder = t(/ TIER [456] /), town = t(/ERA town up/), city = t(/ERA city up/), asc = t(/ TIER 6 /);
  const sm = L.find(x => x.includes("SUMMARY")) || "";
  const g = k => { const m = sm.match(new RegExp(k + " (\\S+)")); return m ? m[1] : "?"; };
  const last = L.filter(x => / pop \d+/.test(x)).pop() || "";
  const d = (sm.match(/deaths (\{[^}]*\})/) || [])[1]; let dd = "?"; try { const o = JSON.parse(d); const old = o.old || 0; dd = old + "/" + (Object.values(o).reduce((a, b) => a + b, 0) - old); } catch (e) {}
  const errs = L.filter(x => x.startsWith("ERROR")).length;
  const f1 = v => v == null ? "  -  " : v.toFixed(0).padStart(5);
  console.log(`${tag.padEnd(5)} ${s}  | ${f1(builder)}   | ${f1(town)} | ${f1(city)} | ${f1(asc)}    | ${g("minPop\\(after30m\\)").padStart(5)}  | ${g("endPop").padStart(5)}  | ${g("eggs").padStart(4)} | ${g("love%").padStart(5)} | ${g("joined").padStart(4)} | ${dd}${errs ? " ERRORS " + errs : ""}${sm ? "" : " (running: " + (last.split(" ")[0] || "") + ")"}`);
}
