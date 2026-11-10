// temporary diagnostic (never merged): print the layout shifts in a Lighthouse trace
import fs from "node:fs";
for (const f of process.argv.slice(2)) {
  const t = JSON.parse(fs.readFileSync(f, "utf8")); const ev = t.traceEvents || t;
  const nav = ev.find((e) => e.name === "navigationStart" && e.args && e.args.data && /8787/.test(e.args.data.documentLoaderURL || ""));
  const t0 = nav ? nav.ts : ev[0].ts;
  console.log("TRACE", f);
  for (const e of ev) if (e.name === "LayoutShift" && e.args && e.args.data) { const d = e.args.data;
    console.log(" shift", ((e.ts - t0) / 1000).toFixed(0) + "ms", "score", d.score, "cum", d.cumulative_score, "input", d.had_recent_input, "main", d.is_main_frame,
      JSON.stringify((d.impacted_nodes || []).map((n) => [n.debug_name || n.node_id, n.old_rect, n.new_rect]))); }
}
