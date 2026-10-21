/* smol brains — cards.js
   The collector side of collect.js: a smol's collector card (pixel portrait, rarity frame, traits with their
   odds, fluff grade, stat rolls, lineage, serial number, its code), the smoldex (every trait the island has
   ever hatched, silhouettes for the rest, and a hall of fame of the rarest smols, the dead included), the
   rare-hatch moment, and a share card rendered to a PNG. */
(function () {
  "use strict";
  var SB = window.SB, CX = SB.Collect;
  var Cards = (SB.Cards = {});

  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k === "html") e.innerHTML = v;
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
      else if (k === "style") e.style.cssText = v;
      else e.setAttribute(k, v);
    }
    if (kids != null) (Array.isArray(kids) ? kids : [kids]).forEach(function (c) { if (c == null || c === false) return; e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function game() { return SB.Game.current; }
  function pad(n) { n = String(n || 0); while (n.length < 4) n = "0" + n; return n; }
  function toast(t) { if (SB.UI && SB.UI.toast) SB.UI.toast(t); }

  /* ---------------- styles (kept here so the card is one file) ---------------- */
  var CSS = [
    ".cc-card { --rc: #c9c6d6; position: relative; margin: 0 auto; max-width: 440px; padding: 14px; background: linear-gradient(170deg, color-mix(in srgb, var(--rc) 22%, #1b1628), #120f1a 70%); border: 4px solid var(--rc); box-shadow: 0 0 0 2px #0d0a14, 0 6px 0 #0d0a14; }",
    ".cc-card.t3, .cc-card.t4 { animation: ccGlow 2.2s ease-in-out infinite; }",
    ".cc-card.t5 { animation: ccRainbow 4s linear infinite; }",
    "@keyframes ccGlow { 0%, 100% { box-shadow: 0 0 0 2px #0d0a14, 0 0 14px color-mix(in srgb, var(--rc) 50%, transparent); } 50% { box-shadow: 0 0 0 2px #0d0a14, 0 0 34px var(--rc); } }",
    "@keyframes ccRainbow { 0%, 100% { border-color: #ff5fae; box-shadow: 0 0 0 2px #0d0a14, 0 0 30px #ff5fae; } 25% { border-color: #ffd23f; box-shadow: 0 0 0 2px #0d0a14, 0 0 30px #ffd23f; } 50% { border-color: #5ff2c8; box-shadow: 0 0 0 2px #0d0a14, 0 0 30px #5ff2c8; } 75% { border-color: #8a7bff; box-shadow: 0 0 0 2px #0d0a14, 0 0 30px #8a7bff; } }",
    ".cc-top { display: flex; justify-content: space-between; align-items: center; font: 700 14px var(--mono); letter-spacing: 0.1em; text-transform: uppercase; }",
    ".cc-rar { color: var(--rc); text-shadow: 0 2px 0 #0d0a14; }",
    ".cc-ser { color: var(--dim); }",
    ".cc-art { position: relative; display: flex; justify-content: center; margin: 8px 0 4px; background: radial-gradient(circle at 50% 60%, color-mix(in srgb, var(--rc) 35%, transparent), transparent 65%); }",
    ".cc-art canvas { image-rendering: pixelated; width: 224px; height: 224px; }",
    ".cc-name { text-align: center; font: 700 26px/1.1 var(--mono); }",
    ".cc-sub { text-align: center; color: var(--dim); font-size: 13px; margin-bottom: 8px; }",
    ".cc-tr { display: grid; grid-template-columns: 82px 1fr auto; gap: 2px 8px; align-items: center; padding: 4px 0; border-top: 1px solid var(--line); font-size: 14px; }",
    ".cc-tr .k { color: var(--dim); font: 700 11px var(--mono); text-transform: uppercase; letter-spacing: 0.06em; }",
    ".cc-tr .o { color: var(--dim); font-size: 12px; white-space: nowrap; }",
    ".cc-dot { display: inline-block; width: 9px; height: 9px; margin-right: 6px; background: var(--c, #c9c6d6); box-shadow: 0 0 0 1px #0d0a14; }",
    ".cc-float { position: relative; height: 10px; margin: 6px 0 2px; background: linear-gradient(90deg, #fff3b0, #c5ff49 7%, #6fd3ff 15%, #b59aff 38%, #8a7f99 45%, #4a4356); }",
    ".cc-float i { position: absolute; top: -4px; width: 3px; height: 18px; background: #fff; box-shadow: 0 0 0 1px #0d0a14; }",
    ".cc-stat { display: grid; grid-template-columns: 70px 1fr 38px; gap: 8px; align-items: center; font-size: 13px; margin: 3px 0; }",
    ".cc-stat .b { height: 8px; background: var(--faint); } .cc-stat .b i { display: block; height: 100%; background: var(--rc); }",
    ".cc-stat .v { text-align: right; font: 700 13px var(--mono); }",
    ".cc-lin { font-size: 13px; color: var(--dim); margin-top: 6px; }",
    ".cc-mut { display: inline-block; margin-left: 6px; padding: 0 5px; background: var(--pink); color: #0d0a14; font: 700 10px var(--mono); }",
    ".dex-bar { height: 12px; background: var(--faint); margin: 6px 0 10px; } .dex-bar i { display: block; height: 100%; background: var(--lime); }",
    ".dex-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 8px; }",
    ".dex-t { padding: 6px; text-align: center; background: rgba(255,255,255,0.04); border: 2px solid var(--c, #444); font-size: 12px; }",
    ".dex-t canvas { image-rendering: pixelated; width: 80px; height: 80px; display: block; margin: 0 auto; }",
    ".dex-t.no { border-color: #2c2738; color: var(--dim); } .dex-t .nm { font-weight: 700; margin-top: 2px; } .dex-t .od { color: var(--dim); font-size: 11px; }",
    ".dex-t .ic { font-size: 34px; height: 80px; line-height: 80px; }",
    ".hof { display: flex; align-items: center; gap: 10px; padding: 6px; border-left: 4px solid var(--c); background: rgba(255,255,255,0.04); margin-bottom: 6px; cursor: pointer; }",
    ".hof canvas { image-rendering: pixelated; width: 48px; height: 48px; } .hof .r { margin-left: auto; text-align: right; font-size: 12px; color: var(--dim); }",
    ".cc-hatch { position: absolute; left: 50%; top: 26%; transform: translate(-50%, -50%); z-index: 30; pointer-events: auto; text-align: center; width: min(92vw, 520px); padding: 16px 14px; background: rgba(16, 12, 26, 0.92); border: 4px solid var(--rc); animation: ccPop 0.5s cubic-bezier(.2,1.6,.4,1) both, ccGlow 1.6s ease-in-out infinite; }",
    "@keyframes ccPop { from { transform: translate(-50%, -50%) scale(0.3); opacity: 0; } }",
    ".cc-hatch .lbl { font: 700 13px var(--mono); letter-spacing: 0.2em; color: var(--rc); text-transform: uppercase; }",
    ".cc-hatch .big { font: 700 clamp(26px, 7vw, 40px)/1.1 var(--mono); color: var(--rc); text-shadow: 0 3px 0 #0d0a14; margin: 4px 0; }",
    ".cc-hatch canvas { image-rendering: pixelated; width: 128px; height: 128px; }",
    ".cc-hatch .btnrow { justify-content: center; }",
    ".cc-flash { position: fixed; inset: 0; pointer-events: none; z-index: 29; background: var(--rc); animation: ccFlash 0.9s ease-out forwards; }",
    "@keyframes ccFlash { from { opacity: 0.55; } to { opacity: 0; } }",
    ".cc-share img { width: 100%; max-width: 420px; display: block; margin: 0 auto 10px; image-rendering: auto; }"
  ].join("\n");
  function styles() { if (document.getElementById("cc-css")) return; var s = document.createElement("style"); s.id = "cc-css"; s.textContent = CSS; document.head.appendChild(s); }

  /* ---------------- pixel portraits ---------------- */

  // c: anything with look/species/tier/stage. Returns a canvas (32px * scale), optionally a silhouette
  function portrait(c, scale, silhouette, frame) {
    var cv = document.createElement("canvas");
    cv.width = cv.height = 32;
    try { draw(cv, c, silhouette, frame == null ? 0 : frame); } catch (e) {}
    cv.style.width = cv.style.height = (32 * (scale || 4)) + "px";
    return cv;
  }
  function sheetOf(c) {
    if (c._ccSheet && c._ccSheetLook === c.look) return c._ccSheet;
    var fake = { look: c.look, species: "smol", tier: c.tier || 0, stage: Math.max(2, Math.min(4, c.stage == null ? 3 : c.stage)), holding: null };
    var sh = SB.Pixel.paint(fake);
    try { Object.defineProperty(c, "_ccSheet", { value: sh, configurable: true, writable: true }); Object.defineProperty(c, "_ccSheetLook", { value: c.look, configurable: true, writable: true }); } catch (e) {}
    return sh;
  }
  function draw(cv, c, silhouette, fi) {
    var sh = sheetOf(c), fr = sh.frames[fi] || sh.frames[0], x = cv.getContext("2d"), img = x.createImageData(32, 32);
    img.data.set(fr.d);
    if (silhouette) for (var i = 0; i < img.data.length; i += 4) if (img.data[i + 3]) { img.data[i] = 84; img.data[i + 1] = 74; img.data[i + 2] = 112; }
    x.putImageData(img, 0, 0);
  }
  // a gently animated portrait (idle, breathe, blink) for as long as it's on the page
  function live(cv, c) {
    var seq = [0, 0, 1, 1, 0, 0, 1, 6], i = 0;
    var t = setInterval(function () { if (!cv.isConnected) { clearInterval(t); return; } i = (i + 1) % seq.length; try { draw(cv, c, false, seq[i]); } catch (e) { clearInterval(t); } }, 380);
    return cv;
  }

  // a smol, or a hall-of-fame row (a smol that's gone), as something cards can show
  function asSmol(row) {
    var g = SB.Genome.decode(row.g);
    return { name: row.name, genome: g, look: SB.Genome.look(g), tier: SB.Genome.tierOf(g), stage: 3, gen: row.gen, serial: row.serial, id: row.id, iq: row.iq || 0, dead: true, species: "smol" };
  }

  /* ---------------- the collector card ---------------- */

  function lineage(c) {
    var g = game(), fam = g.family || {}, f = fam[c.id], out = [];
    var ps = (c.parents || (f && f.parents) || []).map(function (id) { return fam[id] && fam[id].name; }).filter(Boolean);
    out.push("gen " + (c.gen || 1));
    out.push(ps.length ? "child of " + ps.join(" & ") : "no parents on record");
    var gps = 0;
    (c.parents || (f && f.parents) || []).forEach(function (id) { var p = fam[id]; if (p) gps += (p.parents || []).length; });
    if (gps) out.push(gps + " grandparents");
    if (c.oid && g.seed != null && c.oid.split(".")[0] !== (g.seed >>> 0).toString(36)) out.push("from another world");
    return out.join(" · ");
  }
  function cardEl(c, info) {
    var rc = info.rarity.col, tier = c.tier || 0;
    var art = live(portrait(c, 7), c);
    var card = h("div", { class: "cc-card t" + info.tier, style: "--rc:" + rc }, [
      h("div", { class: "cc-top" }, [h("span", { class: "cc-rar" }, (info.tier >= 4 ? "✦ " : "") + info.rarity.name), h("span", { class: "cc-ser" }, "#" + pad(c.serial) + (c.dead ? " · 🕯" : ""))]),
      h("div", { class: "cc-art" }, art),
      h("div", { class: "cc-name" }, c.name),
      h("div", { class: "cc-sub" }, ((SB.TIERS[tier] || SB.TIERS[0]).icon + " " + (SB.TIERS[tier] || SB.TIERS[0]).name) + " · #" + pad(c.serial) + " on this island")
    ]);
    info.traits.forEach(function (t) {
      card.appendChild(h("div", { class: "cc-tr" }, [
        h("span", { class: "k" }, t.slotName),
        h("span", null, [h("span", { class: "cc-dot", style: "--c:" + CX.RARITY[t.tier].col }), t.name, t.mut ? h("span", { class: "cc-mut" }, "MUTATION") : null]),
        h("span", { class: "o" }, t.oddsText)
      ]));
    });
    var fl = h("div", { class: "cc-tr" }, [h("span", { class: "k" }, "fluff"), h("span", null, info.grade), h("span", { class: "o mono" }, info.f.toFixed(4))]);
    card.appendChild(fl);
    card.appendChild(h("div", { class: "cc-float" }, h("i", { style: "left:calc(" + (info.f * 100).toFixed(2) + "% - 1px)" })));
    card.appendChild(h("div", { style: "height:6px" }));
    CX.stats(c).forEach(function (s) {
      card.appendChild(h("div", { class: "cc-stat" }, [h("span", { class: "dim" }, s[0]), h("span", { class: "b" }, h("i", { style: "width:" + Math.min(100, s[1] / s[2] * 100).toFixed(0) + "%" })), h("span", { class: "v" }, String(s[1]))]));
    });
    card.appendChild(h("div", { class: "cc-lin" }, lineage(c)));
    return card;
  }

  Cards.open = function (c) {
    if (!c || c.species !== "smol") return;
    styles();
    var info = CX.info(c);
    if (!info) return;
    var body = h("div", null, [cardEl(c, info)]);
    var row = h("div", { class: "btnrow", style: "justify-content:center;margin-top:12px" }, [
      c.dead ? null : h("button", { class: "btn go", onclick: function () { copyCode(c); } }, "📋 copy code"),
      h("button", { class: "btn", onclick: function () { Cards.share(c); } }, "📸 share card"),
      h("button", { class: "btn", onclick: function () { if (SB.UI.openMenu) SB.UI.openMenu("dex"); } }, "📖 smoldex")
    ]);
    body.appendChild(row);
    body.appendChild(h("p", { class: "note", style: "text-align:center" }, "the code carries " + c.name + "'s traits and a checksum: paste it into any world and the same smol arrives, rarity and all. a code that's been changed won't work."));
    SB.UI.modal("✨ " + c.name, body);
  };

  function copyCode(c) {
    var code = SB.Save.exportSmol(c), g = game();
    var done = function () { toast("📋 " + c.name + "'s code copied"); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, function () { toast(code); });
      else toast(code);
    } catch (e) { toast(code); }
    g.stats.exported = (g.stats.exported || 0) + 1;
    SB.Game.unlock(g, "share");
  }

  /* ---------------- the share card (a PNG) ---------------- */

  Cards.render = function (c) {
    var info = CX.info(c), W = 600, H = 860, cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    var x = cv.getContext("2d"), rc = info.rarity.col, font = getComputedStyle(document.body).getPropertyValue("--mono") || "monospace";
    var grd = x.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, "#241c36"); grd.addColorStop(1, "#0f0c16");
    x.fillStyle = grd; x.fillRect(0, 0, W, H);
    x.fillStyle = rc; x.fillRect(0, 0, W, 12); x.fillRect(0, H - 12, W, 12); x.fillRect(0, 0, 12, H); x.fillRect(W - 12, 0, 12, H);
    x.fillStyle = "#0d0a14"; x.fillRect(12, 12, W - 24, 4);
    x.textBaseline = "top";
    x.font = "700 22px " + font; x.fillStyle = rc; x.fillText(info.rarity.name.toUpperCase(), 34, 34);
    x.textAlign = "right"; x.fillStyle = "#b8b0c8"; x.fillText("#" + pad(c.serial), W - 34, 34); x.textAlign = "left";
    // the portrait on a glow
    var rg = x.createRadialGradient(W / 2, 260, 10, W / 2, 260, 230);
    rg.addColorStop(0, rc + "88"); rg.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = rg; x.fillRect(0, 60, W, 420);
    var p = portrait(c, 1, false, 0);
    x.imageSmoothingEnabled = false;
    x.drawImage(p, W / 2 - 176, 80, 352, 352);
    x.textAlign = "center"; x.fillStyle = "#f5f3ed"; x.font = "700 46px " + font; x.fillText(c.name, W / 2, 440);
    x.font = "700 18px " + font; x.fillStyle = "#b8b0c8";
    x.fillText((SB.TIERS[c.tier || 0] || SB.TIERS[0]).name + " · gen " + (c.gen || 1) + " · fluff " + info.f.toFixed(4) + " (" + info.grade + ")", W / 2, 496);
    x.textAlign = "left";
    var y = 536;
    info.traits.forEach(function (t) {
      x.fillStyle = CX.RARITY[t.tier].col; x.fillRect(40, y + 4, 12, 12);
      x.fillStyle = "#8f87a3"; x.font = "700 15px " + font; x.fillText(t.slotName.toUpperCase(), 62, y + 2);
      x.fillStyle = "#f5f3ed"; x.font = "700 20px " + font; x.fillText(t.name + (t.mut ? " ✦" : ""), 190, y);
      x.textAlign = "right"; x.fillStyle = "#8f87a3"; x.font = "700 16px " + font; x.fillText(t.oddsText, W - 40, y + 2); x.textAlign = "left";
      y += 32;
    });
    y += 8;
    var stats = CX.stats(c), bw = (W - 80 - 4 * 10) / 5;
    stats.forEach(function (s, i) {
      var sx = 40 + i * (bw + 10);
      x.fillStyle = "#8f87a3"; x.font = "700 14px " + font; x.fillText(s[0].toUpperCase(), sx, y);
      x.fillStyle = "#f5f3ed"; x.font = "700 22px " + font; x.fillText(String(s[1]), sx, y + 18);
      x.fillStyle = "rgba(255,255,255,0.12)"; x.fillRect(sx, y + 46, bw, 6);
      x.fillStyle = rc; x.fillRect(sx, y + 46, bw * Math.min(1, s[1] / s[2]), 6);
    });
    x.textAlign = "center"; x.fillStyle = "#6f6884"; x.font = "700 15px " + font;
    x.fillText("smol brains · computercooked.com", W / 2, H - 44);
    return cv;
  };
  Cards.share = function (c) {
    styles();
    var cv;
    try { cv = Cards.render(c); } catch (e) { toast("couldn't draw the card"); return; }
    var url = cv.toDataURL("image/png"), file = (c.name || "smol").replace(/[^a-z0-9]+/gi, "-").toLowerCase() + "-" + pad(c.serial) + ".png";
    var body = h("div", { class: "cc-share" }, [h("img", { src: url, alt: c.name + "'s collector card" })]);
    var row = h("div", { class: "btnrow", style: "justify-content:center" }, [
      h("a", { class: "btn go", href: url, download: file }, "⬇ save image")
    ]);
    if (navigator.share && navigator.canShare) {
      cv.toBlob(function (blob) {
        try {
          var f = new File([blob], file, { type: "image/png" });
          if (!navigator.canShare({ files: [f] })) return;
          row.appendChild(h("button", { class: "btn", onclick: function () { navigator.share({ files: [f], title: c.name, text: c.name + ", a " + CX.info(c).rarity.name + " smol" }).catch(function () {}); } }, "📤 share"));
        } catch (e) {}
      });
    }
    body.appendChild(row);
    SB.UI.modal("📸 " + c.name + "'s card", body);
  };

  /* ---------------- the smoldex (a menu tab) ---------------- */

  var model = null;
  function modelSmol(g) {
    var s = SB.Game.smols(g).filter(function (c) { return c.tier >= 1; })[0] || SB.Game.smols(g)[0];
    var base = s ? s.genome : SB.Genome.forTier(SB.rng(7), 2);
    if (!model || model.base !== base) model = { base: base, cache: {} };
    return model;
  }
  function sample(slot, i) {
    var m = model, key = slot + i;
    if (m.cache[key]) return m.cache[key];
    var g = Object.assign({}, m.base, { cx: { v: 1, pat: 0, eye: 0, acc: 0, pal: 0, size: 0, voice: 0, f: 0.5 } });
    g.cx[slot] = i;
    var c = { genome: g, look: SB.Genome.look(g), tier: SB.Genome.tierOf(g), stage: 3, species: "smol" };
    m.cache[key] = c;
    return c;
  }
  var SLOT_ICON = { voice: ["🐤", "🐭", "🐻", "🎶", "🔔"] };
  Cards.tabDex = function (body) {
    styles();
    var g = game(), st = CX.state(g), n = CX.dexCount(g), tot = CX.dexTotal();
    modelSmol(g);
    body.appendChild(h("p", { class: "note" }, "every trait this island has ever hatched. the faded ones are still out there: breed rare smols together for better odds, and watch for mutations."));
    body.appendChild(h("div", { class: "sec" }, [h("span", null, "collection"), h("span", { class: "dim" }, n + " / " + tot + " · " + Math.round(n / tot * 100) + "%")]));
    body.appendChild(h("div", { class: "dex-bar" }, h("i", { style: "width:" + (n / tot * 100).toFixed(1) + "%" })));
    var chips = h("div", { class: "chips" });
    CX.RARITY.forEach(function (r) { chips.appendChild(h("span", { class: "chip", style: "border-left:4px solid " + r.col }, r.name + " · " + (st.tiers[r.id] || 0))); });
    body.appendChild(chips);
    // hall of fame
    body.appendChild(h("div", { class: "sec" }, [h("span", null, "hall of fame"), h("span", { class: "dim" }, "the rarest smols this island ever had")]));
    if (!st.hall.length) body.appendChild(h("p", { class: "note" }, "nobody yet."));
    st.hall.forEach(function (row) {
      var alive = SB.Game.byId(g, row.id), c = alive && alive.alive ? alive : null, s;
      try { s = c || asSmol(row); } catch (e) { return; }
      var info = CX.info(s);
      if (!info) return;
      body.appendChild(h("div", { class: "hof", style: "--c:" + info.rarity.col, onclick: function () { Cards.open(s); } }, [
        portrait(s, 1.5),
        h("div", null, [h("b", null, s.name), h("div", { class: "note" }, info.rarity.name + " · " + info.rarest.name + " (" + info.rarest.oddsText + ")")]),
        h("div", { class: "r" }, ["#" + pad(row.serial), h("br"), c ? "alive" : "🕯 remembered"])
      ]));
    });
    // every slot
    CX.SLOTS.forEach(function (slot) {
      var found = slot.list.filter(function (e) { return st.dex[slot.id + ":" + e[0]]; }).length;
      body.appendChild(h("div", { class: "sec" }, [h("span", null, slot.name), h("span", { class: "dim" }, found + " / " + slot.list.length)]));
      var grid = h("div", { class: "dex-grid" });
      slot.list.forEach(function (e) {
        var seen = !!st.dex[slot.id + ":" + e[0]], col = CX.RARITY[e[3]].col;
        var pic = SLOT_ICON[slot.id] ? h("div", { class: "ic", style: seen ? "" : "filter:grayscale(1) brightness(0.3)" }, SLOT_ICON[slot.id][e.i] || "🎵") : portrait(sample(slot.id, e.i), 2, !seen, slot.id === "acc" && e[0] === "moon" ? 2 : 0);
        grid.appendChild(h("div", { class: "dex-t" + (seen ? "" : " no"), style: "--c:" + col }, [pic, h("div", { class: "nm" }, seen ? e[1] : "???"), h("div", { class: "od", style: "color:" + col }, CX.RARITY[e[3]].name), h("div", { class: "od" }, CX.oddsText(slot.id, e.i))]));
      });
      body.appendChild(grid);
    });
    body.appendChild(h("div", { class: "sec" }, [h("span", null, "fluff grades"), h("span", { class: "dim" }, "lower is rarer")]));
    var gg = h("div", { class: "dex-grid" }), lo = 0;
    CX.GRADES.forEach(function (gr) {
      var seen = !!st.dex["grade:" + gr[1]], hi = Math.min(1, gr[0]), p = hi * hi - lo * lo;
      gg.appendChild(h("div", { class: "dex-t" + (seen ? "" : " no"), style: "--c:" + (lo === 0 ? CX.RARITY[3].col : "#555") }, [h("div", { class: "nm" }, seen ? gr[1] : "???"), h("div", { class: "od" }, lo.toFixed(2) + " – " + hi.toFixed(2)), h("div", { class: "od" }, p > 0.25 ? Math.round(p * 100) + "% of smols" : "1 in " + Math.round(1 / p))]));
      lo = hi;
    });
    body.appendChild(gg);
  };

  /* ---------------- moments: a rare hatch, a new smoldex entry ---------------- */

  var hatchEl = null, hatchT = null;
  function rareHatch(c, info) {
    styles();
    var root = document.getElementById("ui");
    if (!root) return;
    if (hatchEl) hatchEl.remove();
    clearTimeout(hatchT);
    var rc = info.rarity.col;
    if (info.tier >= 4) { var fl = h("div", { class: "cc-flash", style: "--rc:" + rc }); root.appendChild(fl); setTimeout(function () { fl.remove(); }, 1000); }
    var close = function () { if (hatchEl) { hatchEl.remove(); hatchEl = null; } };
    hatchEl = h("div", { class: "cc-hatch live", style: "--rc:" + rc }, [
      h("div", { class: "lbl" }, "✨ " + info.rarity.name + " hatch ✨"),
      live(portrait(c, 4), c),
      h("div", { class: "big" }, c.name),
      h("div", null, info.rarest.name + " · " + info.rarest.oddsText),
      h("div", { class: "btnrow", style: "margin-top:10px" }, [
        h("button", { class: "btn go", onclick: function () { close(); Cards.open(c); } }, "✨ see card"),
        h("button", { class: "btn", onclick: function () { close(); Cards.share(c); } }, "📸 share card"),
        h("button", { class: "btn", "aria-label": "close", onclick: close }, "✕")
      ])
    ]);
    root.appendChild(hatchEl);
    hatchT = setTimeout(close, info.tier >= 4 ? 24000 : 12000);
    if (SB.FX) { SB.FX.burst("stars", c.x, (c.y || 0) + 0.6, c.z, 18 + info.tier * 8); SB.FX.burst("sparkle", c.x, (c.y || 0) + 0.4, c.z, 20); }
    if (SB.Audio && SB.Audio.play) { SB.Audio.play(info.tier >= 4 ? "tierup" : "magic"); }
  }
  Cards.rareHatch = rareHatch;

  SB.bus.on("hatch", function (d) {
    var c = d && d.c, x = c && c._cxNew;
    if (!x || !x.info) return;
    if (d.obj && d.obj.data && d.obj.data.starter) return; // the founders have their own moment
    if (x.info.tier >= 2) setTimeout(function () { rareHatch(c, x.info); }, 900);
    else if (x.fresh.length) toast("📖 new in the smoldex: <b>" + x.fresh.map(function (t) { return t.name; }).join(", ") + "</b> (" + x.fresh[0].oddsText + ")");
  });
})();
