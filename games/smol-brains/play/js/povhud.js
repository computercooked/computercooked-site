/* smol brains — povhud.js (v4.4 "first tool")
   The screen while you're inside a smol, built on the conventions every survival game shares so nobody has
   to learn them: a 9-slot hotbar along the bottom (1–9 or the wheel), rows of hearts and drumsticks above
   it (half icons, shaking when low), a bag (Tab) with a crafting panel beside it, keycap prompts on what you
   point at, a "+1 stick" when you pick something up, and a first-time quest in the corner with a marker in
   the world. Phones get a joystick, a look pad, an action button that says what it'll do, and taps instead
   of drags. The rules all live in possess.js and survival.js; this file only draws and listens. */
(function () {
  "use strict";
  var SB = window.SB;
  var HUD = (SB.PovHud = {});
  var K = SB.KINDS, SK = SB.STRUCTS, NK = SB.NODES;
  function P() { return SB.Possess; }
  function Sv() { return SB.Surv; }
  function S() { return P().state(); }

  var hud = null, keys = {}, bound = null;
  HUD.on = function () { return !!hud; };
  HUD.phone = function () { return !!(hud && hud.phone); };
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]; }); }
  function phone() { try { return !!P().forcePhone || ("ontouchstart" in window) || (window.matchMedia && window.matchMedia("(pointer: coarse)").matches); } catch (e) { return false; } }
  function kl(k) { return k === "plans" ? "building plans" : K[k] ? K[k].label : k; }
  function plural(k, n) { var l = kl(k); return n > 1 && !/s$/.test(l) && k !== "leaves" ? l + "s" : l; }

  /* ---------------- pixel icons: items and vitals ---------------- */

  var itemIdx = null;
  if (typeof fetch === "function") try { fetch("art/hd/items.json").then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j && j.items) { itemIdx = j; if (hud) hud.hotKey = null; } }, function () {}); } catch (e) {}
  // an item as a little picture: our own pixel art for the new things, the hd sheet for the rest, else its emoji
  function icon(kind, px) {
    px = px || 32;
    var A = SB.SurvArt, u = A && A.icon ? A.icon(kind) : null;
    if (u) return "<i class='ic' style='width:" + px + "px;height:" + px + "px;background-image:url(" + u + ")'></i>";
    var e = itemIdx && itemIdx.items[kind];
    if (e && e[32]) {
      var k = px / 32;
      return "<i class='ic' style='width:" + px + "px;height:" + px + "px;background-image:url(art/hd/items.png);background-size:" + itemIdx.w * k + "px " + itemIdx.h * k + "px;background-position:-" + e[32][0] * k + "px -" + e[32][1] * k + "px'></i>";
    }
    return "<i class='ic em' style='font-size:" + Math.round(px * 0.72) + "px;width:" + px + "px;height:" + px + "px'>" + (K[kind] ? K[kind].emoji : "?") + "</i>";
  }
  HUD.icon = icon;
  // the vitals: 9×9 pixel hearts, drumsticks, flames, snowflakes and bolts, each full / half / empty
  var VPAL = { k: "#1a1222", r: "#ff4057", R: "#b8213a", w: "#ffffff", s: "#d98a4a", S: "#9c5426", o: "#ff8a2a", y: "#ffd84a", b: "#8fd8ff", B: "#3f8fd8", l: "#c5ff49", L: "#7fb82a", x: "#3a3346", X: "#2a2434" };
  var VART = {
    heart: [".kk...kk.", "krrk.krrk", "krwrkrrRk", "krrrrrrRk", "krrrrrrRk", ".krrrrRk.", "..krrRk..", "...kRk...", "....k...."],
    food: ["....kkkk.", "...kssssk", "..ksswsSk", "..kssssSk", "..kssSSk.", ".kkkSSk..", "kwkkkk...", "kwwk.....", ".kk......"],
    warm: ["....k....", "...kok...", "..koyok..", "..koyok.k", ".koyyyokk", "koyyyyyok", "koyywyyok", ".koyyyok.", "..kkkkk.."],
    cold: ["....k....", ".k.kbk.k.", "..kbbbk..", ".kbkBkbk.", "kbbBwBbbk", ".kbkBkbk.", "..kbbbk..", ".k.kbk.k.", "....k...."],
    pep: ["....kkkk.", "...kllLk.", "..kllLk..", ".klllLkk.", "kllllllk.", ".kkkllLk.", "...kllk..", "..klLk...", "..kkk...."]
  };
  var vcache = {};
  function vicon(name, mode) { // mode: 2 full, 1 half, 0 empty
    var key = name + mode;
    if (vcache[key]) return vcache[key];
    var cv = document.createElement("canvas"); cv.width = cv.height = 9;
    var ctx = cv.getContext("2d");
    VART[name].forEach(function (row, y) {
      for (var x = 0; x < 9; x++) {
        var ch = row[x];
        if (ch === ".") continue;
        var empty = ch !== "k" && (mode === 0 || (mode === 1 && x >= 5));
        ctx.fillStyle = empty ? (ch === "w" ? VPAL.x : (y + x) % 3 ? VPAL.x : VPAL.X) : VPAL[ch];
        ctx.fillRect(x, y, 1, 1);
      }
    });
    return (vcache[key] = cv.toDataURL());
  }

  /* ---------------- styles ---------------- */
  var CSS = [
    "body.pov #ui{display:none!important}",
    "#pov{position:fixed;inset:0;z-index:40;pointer-events:none;font:600 14px var(--sans,system-ui);color:#f5f3ed;user-select:none;-webkit-user-select:none;touch-action:none;font-variant-ligatures:none;font-feature-settings:'liga' 0,'clig' 0,'calt' 0;--px:#1a1222;--rim:rgba(245,243,237,.22);--lime:#c5ff49}",
    "#pov *{font-variant-ligatures:none;font-feature-settings:'liga' 0,'clig' 0,'calt' 0}", // a font: shorthand turns ligatures back on, and the pixel font's fi is broken ("find" read "And")
    "#pov .panel{background:rgba(22,18,34,.8);box-shadow:0 0 0 2px var(--px),inset 0 0 0 2px var(--rim),4px 4px 0 2px rgba(0,0,0,.35)}",
    "#pov kbd{display:inline-block;min-width:20px;padding:1px 5px;margin-right:6px;font:700 12px var(--mono,monospace);text-align:center;color:#101114;background:#f5f3ed;box-shadow:0 0 0 2px var(--px),0 3px 0 2px var(--px);vertical-align:1px}",
    "#pov kbd.g{background:var(--lime)}#pov kbd.m{background:#ffd84a}",
    "#pov .ic{display:inline-block;background-repeat:no-repeat;background-size:100% 100%;image-rendering:pixelated;vertical-align:middle;font-style:normal;line-height:1;text-align:center}",
    "#pov .ic.em{display:inline-grid;place-items:center}",
    // crosshair
    "#pov .cross{position:absolute;left:50%;top:50%;width:22px;height:22px;margin:-11px 0 0 -11px;transition:width .12s,height .12s,margin .12s}",
    "#pov .cross i{position:absolute;width:6px;height:6px;border:0 solid rgba(255,255,255,.9);filter:drop-shadow(1px 1px 0 #000)}",
    "#pov .cross i:nth-child(1){left:0;top:0;border-width:2px 0 0 2px}#pov .cross i:nth-child(2){right:0;top:0;border-width:2px 2px 0 0}",
    "#pov .cross i:nth-child(3){left:0;bottom:0;border-width:0 0 2px 2px}#pov .cross i:nth-child(4){right:0;bottom:0;border-width:0 2px 2px 0}",
    "#pov .cross b{position:absolute;left:50%;top:50%;width:2px;height:2px;margin:-1px;background:#fff;box-shadow:1px 1px 0 #000}",
    "#pov .cross.on{width:34px;height:34px;margin:-17px 0 0 -17px}#pov .cross.on i{border-color:var(--lime)}#pov .cross.on b{background:var(--lime)}",
    "#pov .cross.no i{border-color:#ff8a8a}",
    "#pov .tname{position:absolute;left:50%;top:calc(50% - 44px);transform:translateX(-50%);font:700 15px var(--mono,monospace);color:var(--lime);text-shadow:2px 2px 0 #000;white-space:nowrap}",
    "#pov .tname small{color:#f5f3ed;opacity:.8;font-size:12px;margin-left:6px}",
    "#pov .prompt{position:absolute;left:50%;top:calc(50% + 28px);transform:translateX(-50%);padding:6px 10px;display:flex;flex-direction:column;gap:6px;align-items:flex-start;white-space:nowrap;font-size:14px}",
    "#pov .prompt:empty{display:none}#pov .prompt .lk{opacity:.7}#pov .prompt .lk kbd{background:#8a8496}",
    "#pov .busy{position:absolute;left:50%;top:calc(50% + 22px);width:90px;height:8px;margin-left:-45px;background:rgba(0,0,0,.5);box-shadow:0 0 0 2px var(--px);display:none}",
    "#pov .busy i{display:block;height:100%;background:var(--lime)}#pov .busy.on{display:block}",
    "#pov .needs{position:absolute;left:calc(50% + 160px);top:calc(50% - 30px);padding:8px 10px;font-size:13px;min-width:150px}",
    "#pov .needs:empty{display:none}#pov .needs h4{margin:0 0 4px;font:700 13px var(--mono,monospace);color:var(--lime)}#pov .needs div{display:flex;align-items:center;gap:6px;margin:2px 0}#pov .needs .ok{color:var(--lime)}#pov .needs .no{opacity:.75}",
    // compass, clock, portrait, leave
    "#pov .compass{position:absolute;left:50%;top:12px;width:min(420px,60vw);height:30px;transform:translateX(-50%);overflow:hidden}",
    "#pov .compass .ticks{position:absolute;left:0;right:0;bottom:3px;height:6px;background:repeating-linear-gradient(90deg,rgba(245,243,237,.45) 0 2px,transparent 2px 15px)}",
    "#pov .compass span{position:absolute;top:4px;transform:translateX(-50%);font:700 12px var(--mono,monospace);opacity:.75}",
    "#pov .compass span.c{color:var(--lime);opacity:1;font-size:15px;top:2px}#pov .compass span.q{opacity:1;top:1px}",
    "#pov .compass .mark{position:absolute;left:50%;top:-1px;width:0;height:0;margin-left:-6px;border:6px solid transparent;border-top-color:var(--lime)}",
    "#pov .clock{position:absolute;left:50%;top:48px;transform:translateX(-50%);padding:3px 10px;font:700 12px var(--mono,monospace);white-space:nowrap}",
    "#pov .who{position:absolute;left:14px;top:14px;padding:8px 12px 8px 10px;display:flex;gap:10px;align-items:center;max-width:40vw}",
    "#pov .who .face{width:40px;height:40px;flex:none;display:grid;place-items:center;font-size:24px;box-shadow:0 0 0 2px var(--px),inset 0 -8px 0 rgba(0,0,0,.18)}",
    "#pov .who .nm{font:700 16px var(--mono,monospace);line-height:1.1}#pov .who .tr{font-size:12px}#pov .who small{display:block;opacity:.7;font-weight:500;font-size:11px}",
    "#pov .who .learn{display:inline-block;margin-top:3px;padding:1px 6px;font-size:11px;background:rgba(181,154,255,.25);box-shadow:0 0 0 1px #b59aff;color:#d9ccff}",
    "#pov .leave{position:absolute;right:14px;top:14px;pointer-events:auto;font:700 14px var(--mono,monospace);padding:9px 12px;background:rgba(22,18,34,.85);color:var(--lime);cursor:pointer;border:0;box-shadow:0 0 0 2px var(--px),inset 0 0 0 2px var(--lime),4px 4px 0 2px rgba(0,0,0,.35)}",
    "#pov .leave:hover{background:var(--lime);color:#101114}#pov .leave kbd{margin:0 0 0 6px}",
    // the bottom: vitals rows over the hotbar
    "#pov .bottom{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:4px}",
    "#pov .vit{display:grid;grid-template-columns:auto auto;column-gap:24px;row-gap:2px;width:100%;justify-content:space-between}",
    "#pov .vrow{display:flex;gap:0;height:clamp(26px,3.8vh,40px);align-items:center}#pov .vrow.r{flex-direction:row-reverse}",
    "#pov .vrow b{font:800 clamp(18px,3vh,26px)/1 system-ui,-apple-system,'Segoe UI',Arial,sans-serif;color:#fff;text-shadow:2px 2px 0 #000;margin:0 8px;min-width:3em;padding:2px 6px;text-align:center}#pov .vrow.low b{background:#c8233a;text-shadow:none}",
    "#pov .vrow i{width:clamp(26px,3.8vh,40px);height:clamp(26px,3.8vh,40px);background-size:100% 100%;image-rendering:pixelated;display:block;margin-right:-1px}", // K-0033: big enough to read at a glance
    "#pov .vrow.small{height:16px}#pov .vrow.small i{width:16px;height:16px}",
    "#pov .vrow.drop i{filter:brightness(2.4) saturate(.2)}",
    "#pov .vrow.low{filter:drop-shadow(0 0 6px #ff4f5e)}",
    "#pov .vrow.r i.h{transform:scaleX(-1)}",
    "#pov .vrow.low i{animation:povjit .32s steps(2) infinite}#pov .vrow.low i:nth-child(odd){animation-delay:-.16s}",
    "@keyframes povjit{0%{translate:0 -2px}50%{translate:0 1px}}",
    "#pov .vrow.flash i{filter:brightness(2.2) saturate(.3)}",
    "#pov .vrow.pulse i{animation:povpulse .6s ease-out}@keyframes povpulse{30%{transform:scale(1.25)}}",
    "#pov .hot{display:flex;gap:4px;padding:4px;pointer-events:auto}",
    "#pov .slot{position:relative;width:48px;height:48px;display:grid;place-items:center;background:rgba(10,8,18,.55);box-shadow:0 0 0 2px var(--px),inset 0 0 0 2px rgba(255,255,255,.1);cursor:pointer}",
    "#pov .slot.on{box-shadow:0 0 0 2px var(--px),inset 0 0 0 3px var(--lime),0 0 0 4px var(--px);transform:translateY(-3px)}",
    "#pov .slot small{position:absolute;left:3px;top:1px;font:700 10px var(--mono,monospace);opacity:.55}",
    "#pov .slot em{position:absolute;right:3px;bottom:0;font:700 12px var(--mono,monospace);font-style:normal;text-shadow:1px 1px 0 #000,-1px 0 0 #000}",
    "#pov .slot .wear{position:absolute;left:5px;right:5px;bottom:4px;height:3px;background:#000}#pov .slot .wear b{display:block;height:100%}",
    "#pov .slot.pick{box-shadow:0 0 0 2px var(--px),inset 0 0 0 3px #ffd84a}#pov .slot.drop{background:rgba(197,255,73,.25)}",
    "#pov .slot.dim{opacity:.35}",
    "#pov .iname{position:absolute;left:50%;bottom:132px;transform:translateX(-50%);font:700 15px var(--mono,monospace);text-shadow:2px 2px 0 #000;white-space:nowrap;opacity:0;transition:opacity .4s}#pov .iname.on{opacity:1;transition:none}",
    "#pov .iname small{display:block;text-align:center;font-size:11px;opacity:.75}",
    "#pov .leave.bagbtn{top:auto;right:auto;left:calc(50% + 252px);bottom:14px}",
    // toasts and gains
    "#pov .toast{position:absolute;left:50%;top:84px;transform:translateX(-50%);padding:7px 14px;opacity:0;transition:opacity .3s;max-width:min(640px,90vw);text-align:center;line-height:1.45}#pov .toast.on{opacity:1}",
    "#pov .gains{position:absolute;left:calc(50% + 250px);bottom:70px;display:flex;flex-direction:column-reverse;gap:4px;align-items:flex-start}",
    "#pov .gain{padding:3px 10px 3px 4px;display:flex;align-items:center;gap:6px;font:700 14px var(--mono,monospace);animation:povgain 2.4s forwards}",
    "@keyframes povgain{0%{opacity:0;transform:translateX(-12px)}10%{opacity:1;transform:none}75%{opacity:1}100%{opacity:0}}",
    // the hand
    "#pov .paws{position:absolute;right:8%;bottom:-36px;width:200px;height:150px}",
    "#pov .paw{position:absolute;bottom:0;right:20px;width:86px;height:104px;border-radius:44% 44% 30% 30%;box-shadow:inset -10px -8px 0 rgba(0,0,0,.18),0 0 0 3px rgba(20,16,30,.55);transform-origin:50% 100%}",
    "#pov .paws .item{position:absolute;right:56px;bottom:84px;transform-origin:80% 90%}",
    // edges
    "#pov .edge{position:absolute;inset:0;transition:box-shadow .4s}#pov .edge.red{box-shadow:inset 0 0 130px rgba(255,40,60,.5)}#pov .edge.blue{box-shadow:inset 0 0 140px rgba(90,170,255,.55)}",
    "#pov .ouch{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;background:radial-gradient(circle,rgba(255,30,50,.15),rgba(255,20,40,.55));animation:povouch 1.1s ease-out forwards}#pov .ouch b{font:900 64px system-ui,Arial,sans-serif;color:#fff;text-shadow:3px 3px 0 #a0001a,0 0 24px #ff2040}#pov .ouch span{font:800 26px system-ui,Arial,sans-serif;color:#ffd0d6;text-shadow:2px 2px 0 #000}@keyframes povouch{0%{opacity:1;transform:scale(1.15)}60%{opacity:1;transform:scale(1)}100%{opacity:0}}",
    "#pov .edge.hit{box-shadow:inset 0 0 160px rgba(255,20,40,.75);transition:none}",
    // quest
    "#pov .quest{position:absolute;right:14px;top:64px;width:300px;padding:12px 14px;pointer-events:auto}",
    "#pov .quest h4{margin:0 0 6px;font:700 15px var(--mono,monospace);color:var(--lime);display:flex;justify-content:space-between;align-items:center}",
    "#pov .quest h4 button{font:600 11px var(--mono,monospace);background:none;border:0;color:#f5f3ed;opacity:.6;cursor:pointer;padding:0}",
    "#pov .quest .st{display:flex;gap:7px;align-items:baseline;font-size:15px;margin:4px 0;opacity:.5}",
    "#pov .quest .st b{width:14px;flex:none;font-family:var(--mono,monospace)}#pov .quest .st.done{opacity:.55;text-decoration:line-through}#pov .quest .st.now{opacity:1;color:#fff}",
    "#pov .quest .tip{margin:8px 0 0;padding:8px 10px;font-size:14px;line-height:1.45;background:rgba(197,255,73,.12);box-shadow:inset 2px 0 0 var(--lime)}",
    "#pov .quest.mini .st:not(.now){display:none}",
    "#pov .qmark{position:absolute;width:0;height:0;display:none}#pov .qmark.on{display:block}",
    "#pov .qmark i{position:absolute;left:-9px;top:-22px;width:18px;height:18px;background:var(--lime);transform:rotate(45deg);box-shadow:0 0 0 2px var(--px);animation:povbob 1s ease-in-out infinite}",
    "#pov .qmark span{position:absolute;left:50%;top:2px;transform:translateX(-50%);font:700 11px var(--mono,monospace);white-space:nowrap;text-shadow:1px 1px 0 #000;color:var(--lime)}",
    "#pov .qmark.edge i{animation:none;clip-path:polygon(0 0,100% 0,0 100%)}",
    "#pov .qmark.home i{width:28px;height:28px;left:-14px;top:-34px;box-shadow:0 0 0 3px #000,0 0 18px var(--lime)}#pov .qmark.home span{font:800 15px system-ui,Arial,sans-serif;top:4px;background:rgba(0,0,0,.6);padding:2px 6px}",
    "#pov .gmark i{background:#ff4f5e}#pov .gmark span{color:#ff4f5e}#pov .gmark.home i{background:var(--lime)}",
    "#pov .threat{position:absolute;left:50%;top:132px;transform:translateX(-50%);padding:7px 14px;font:700 15px var(--mono,monospace);color:#fff;background:rgba(150,20,35,.85);box-shadow:0 0 0 2px #ff4f5e;white-space:nowrap;display:none;animation:povbob 1s ease-in-out infinite}#pov .threat.on{display:block}",
    "@keyframes povbob{50%{translate:0 -5px}}",
    "#pov .fadein{position:absolute;inset:0;background:#000;pointer-events:none;animation:povfade 2s ease-out forwards}@keyframes povfade{from{opacity:1}to{opacity:0}}",
    "#pov .testnums{position:absolute;left:8px;bottom:130px;font:700 12px system-ui,Arial,sans-serif;color:#c5ff49;background:rgba(0,0,0,.6);padding:4px 8px;white-space:pre;pointer-events:none}",
    "#pov .qdone.beat{top:38%;font-size:30px}#pov .qdone.beat.bad{color:#ff4f5e}",
    "#pov .qdone{position:absolute;left:50%;top:30%;transform:translateX(-50%);padding:12px 22px;font:700 22px var(--mono,monospace);color:var(--lime);text-align:center;animation:povgain 2.6s forwards}#pov .qdone small{display:block;margin-top:4px;font-size:14px;color:#f5f3ed}",
    // the bag
    "#pov .bag{position:absolute;inset:0;background:rgba(8,6,14,.55);display:flex;align-items:center;justify-content:center;pointer-events:auto;z-index:3}",
    "#pov .mpath{display:flex;align-items:center;gap:6px;margin:6px 0 12px}#pov .mpstep{display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 10px;min-width:74px;font:700 12px var(--mono,monospace);background:rgba(10,8,18,.55);box-shadow:0 0 0 2px var(--px),inset 0 0 0 2px rgba(255,255,255,.08);opacity:.6}",
    "#pov .mpstep .mpi{font-size:26px}#pov .mpstep small{font-size:10px;color:var(--lime)}#pov .mpstep.here{opacity:1;box-shadow:0 0 0 2px var(--px),inset 0 0 0 2px var(--lime)}#pov .mpstep.done{opacity:.85}#pov .mparr{font:700 18px var(--mono,monospace);opacity:.7}",
    "#pov .mpbar{margin:0 0 10px}#pov .mpbar .row{display:flex;gap:6px;align-items:center;font-size:13px}#pov .mpbar .sp{flex:1}#pov .mpbar .tb{height:12px;margin:4px 0;background:rgba(10,8,18,.6);box-shadow:0 0 0 2px var(--px)}#pov .mpbar .tb i{display:block;height:100%}#pov .mpbar small{opacity:.75;font-size:11px}",
    "#pov .bag .win.panel{background:rgba(22,18,34,.96)}#pov .bag .win{display:flex;gap:14px;padding:14px;max-width:96vw;max-height:92vh;overflow:auto;align-items:flex-start}",
    "#pov .bag h3{margin:0 0 8px;font:700 16px var(--mono,monospace);color:var(--lime);display:flex;gap:12px;align-items:center}",
    "#pov .bag h3 small{color:#f5f3ed;opacity:.6;font-weight:600;font-size:12px}",
    "#pov .bag .grid{display:grid;grid-template-columns:repeat(9,48px);gap:4px;padding:2px}",
    "#pov .bag .sep{height:10px}#pov .bag .lbl{font:600 11px var(--mono,monospace);opacity:.6;margin:2px 0 4px}",
    "#pov .bag .tabs{display:flex;gap:4px;margin-bottom:8px}",
    "#pov .bag .tabs button,#pov .bag .btn{font:700 13px var(--mono,monospace);padding:7px 11px;border:0;background:rgba(255,255,255,.08);color:#f5f3ed;cursor:pointer;box-shadow:0 0 0 2px var(--px)}",
    "#pov .bag .tabs button.on{background:var(--lime);color:#101114}",
    "#pov .bag .btn.go{background:var(--lime);color:#101114}#pov .bag .btn[disabled]{background:#3a3346;color:#8a8496;cursor:default}",
    "#pov .side{width:330px;min-height:300px}",
    "#pov .cgrid{display:flex;align-items:center;gap:8px;margin-bottom:10px}#pov .cgrid .slots{display:grid;grid-template-columns:repeat(2,48px);gap:4px}",
    "#pov .cgrid .arrow{font:700 22px var(--mono,monospace);opacity:.7}",
    "#pov .rlist{display:flex;flex-direction:column;gap:2px;max-height:52vh;overflow:auto;padding-right:4px}",
    "#pov .rc{display:flex;gap:8px;align-items:center;padding:6px;background:rgba(255,255,255,.04)}",
    "#pov .rc .t{flex:1;min-width:0;font-size:13px}#pov .rc .t small{display:block;opacity:.75;font-weight:500;font-size:12px;line-height:1.35}",
    "#pov .rc .need{display:flex;flex-wrap:wrap;gap:2px 8px;margin-top:2px;font:600 12px var(--mono,monospace)}#pov .rc .need .no{color:#ff9a9a}#pov .rc .need .ok{color:var(--lime)}",
    "#pov .rc.q .t{font-style:italic}#pov .rc .big{width:36px;height:36px;display:grid;place-items:center;font:700 18px var(--mono,monospace);flex:none}",
    "#pov .detail{margin-top:10px;padding:8px;background:rgba(255,255,255,.06);font-size:13px;line-height:1.45}#pov .detail .row{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}",
    "#pov .help{font-size:12px;opacity:.65;margin-top:8px;line-height:1.5}",
    // death
    "#pov .death{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:rgba(60,4,14,.72);pointer-events:auto;text-align:center;padding:16px;z-index:4}",
    "#pov .death h2{margin:0;font:700 34px var(--mono,monospace);text-shadow:3px 3px 0 #000}#pov .death .how{font-size:16px;opacity:.9;max-width:460px;line-height:1.5}",
    "#pov .death .lost{padding:10px 14px;max-width:min(520px,92vw)}#pov .death .lost h4{margin:0 0 6px;font:700 13px var(--mono,monospace);opacity:.8}",
    "#pov .death .items{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}#pov .death .items span{display:flex;align-items:center;gap:3px;font:700 12px var(--mono,monospace)}",
    "#pov .death button{font:700 15px var(--mono,monospace);padding:10px 18px;border:0;background:var(--lime);color:#101114;cursor:pointer;box-shadow:0 0 0 2px var(--px),0 4px 0 2px var(--px)}",
    "#pov .intro{position:absolute;left:50%;top:18%;transform:translateX(-50%);width:min(560px,calc(100% - 24px));display:flex;flex-direction:column;align-items:center;background:rgba(10,8,18,.72);box-shadow:0 0 0 2px #000;transition:opacity .8s;text-align:center;gap:6px;padding:10px 14px}",
    "#pov .intro{pointer-events:none}#pov .intro.out{opacity:0}#pov .intro h2{margin:0;font:700 24px var(--mono,monospace);color:var(--lime);text-shadow:3px 3px 0 #000}#pov .intro p{margin:0;opacity:.9;max-width:540px;line-height:1.7}",
    "#pov .lockhint{position:absolute;left:50%;bottom:150px;transform:translateX(-50%);padding:8px 14px;font:700 16px system-ui,Arial,sans-serif;white-space:nowrap;border:2px solid var(--lime);animation:povhint 1.6s ease-in-out 3}@keyframes povhint{50%{box-shadow:0 0 18px var(--lime)}}",
    // phone
    "#pov .touch{display:none}#pov.phone .touch{display:block}#pov.phone .lockhint{display:none}",
    "#pov .stickzone{position:absolute;left:0;bottom:0;width:42vw;height:60vh;pointer-events:auto}",
    "#pov .lookzone{position:absolute;right:0;top:60px;width:58vw;bottom:0;pointer-events:auto}",
    "#pov .stick{position:absolute;width:110px;height:110px;margin:-55px 0 0 -55px;border-radius:50%;border:2px solid rgba(255,255,255,.35);background:rgba(16,17,20,.3);left:80px;top:calc(100% - 170px)}",
    "#pov .stick i{position:absolute;left:50%;top:50%;width:48px;height:48px;margin:-24px 0 0 -24px;border-radius:50%;background:rgba(245,243,237,.75)}",
    "#pov .pbtns{position:absolute;right:10px;bottom:96px;display:grid;grid-template-columns:repeat(3,58px);grid-template-rows:repeat(2,58px);gap:8px;pointer-events:auto}",
    "#pov .pbtns button{width:58px;height:58px;border:0;background:rgba(22,18,34,.78);color:#f5f3ed;font:700 11px var(--mono,monospace);line-height:1.1;padding:2px;box-shadow:0 0 0 2px var(--px),inset 0 0 0 2px var(--rim);overflow:hidden}",
    "#pov .pbtns button.act{grid-column:3;grid-row:1 / span 2;height:124px;background:var(--lime);color:#101114;font-size:12px}",
    "#pov .pbtns button.act[disabled],#pov .pbtns button.off{opacity:.45}",
    "#pov .pbtns button.on{color:var(--lime);box-shadow:0 0 0 2px var(--px),inset 0 0 0 2px var(--lime)}",
    "#pov.phone .bottom{bottom:6px}#pov.phone .slot{width:38px;height:38px}#pov.phone .slot .ic{width:26px!important;height:26px!important}#pov.phone .hot{gap:3px;padding:2px}",
    "#pov.phone .vrow i{width:17px;height:17px}#pov.phone .vrow{height:17px}#pov.phone .vrow.small i{width:12px;height:12px}#pov.phone .vrow.small{height:12px}#pov.phone .vit{column-gap:8px}",
    "#pov.phone .who,#pov.phone .paws,#pov.phone .bagbtn{display:none}#pov.phone .compass{top:10px;width:46vw}#pov.phone .clock{top:44px;font-size:11px}",
    "#pov.phone .quest{top:58px;right:8px;width:190px;padding:7px 9px}#pov.phone .quest .st{font-size:12px}#pov.phone .quest .tip{font-size:11px}",
    "#pov.phone .prompt{font-size:12px;top:calc(50% + 24px)}#pov.phone .prompt kbd{display:none}#pov.phone .needs{left:50%;transform:translateX(-50%);top:calc(50% + 70px)}",
    "#pov.phone .toast{top:auto;bottom:236px;max-width:84vw;font-size:13px}#pov.phone .gains{left:10px;bottom:auto;top:110px}#pov.phone .iname{bottom:84px}",
    "#pov.phone .bag .grid{grid-template-columns:repeat(9,34px);gap:3px}#pov.phone .bag .slot{width:34px;height:34px}#pov.phone .bag .slot .ic{width:24px!important;height:24px!important}#pov.phone .bag h3{flex-wrap:wrap;gap:4px}#pov.phone .bag .win{flex-direction:column;padding:10px;gap:8px}#pov.phone .side{width:auto}",
    "#pov.phone .leave{padding:7px 9px;font-size:12px;right:8px;top:8px}",
    "@media (max-width:700px){#pov .needs{left:50%;transform:translateX(-50%);top:calc(50% + 70px)}#pov .gains{left:10px;bottom:auto;top:110px}}",
    "@media (max-height:500px){#pov.phone .quest{display:none}#pov.phone .pbtns{bottom:70px;grid-template-rows:repeat(2,50px);grid-template-columns:repeat(3,50px)}#pov.phone .pbtns button{width:50px;height:50px}#pov.phone .pbtns button.act{height:108px}}"
  ].join("\n");

  /* ---------------- building and removing ---------------- */

  HUD.build = function (s) {
    escLock(true); // K-0033: Esc to leave the body also left fullscreen
    HUD.remove();
    if (typeof document === "undefined" || !document.body) return;
    if (!document.getElementById("pov-css")) { var st = el("style"); st.id = "pov-css"; st.textContent = CSS; document.head.appendChild(st); }
    var c = s.c, isPhone = phone(), root = el("div", isPhone ? "phone" : "");
    root.id = "pov";
    hud = { root: root, phone: isPhone, t: 0 };
    hud.edge = root.appendChild(el("div", "edge"));
    hud.paws = root.appendChild(el("div", "paws"));
    var hue = c.look && c.look.hue != null ? c.look.hue : 40, col = "hsl(" + hue + ",55%," + (52 + ((c.look && c.look.light) || 0) * 0.2) + "%)";
    hud.paw = hud.paws.appendChild(el("div", "paw")); hud.paw.style.background = col; hud.col = col;
    hud.item = hud.paws.appendChild(el("div", "item"));
    hud.qmark = root.appendChild(el("div", "qmark", "<i></i><span></span>"));
    hud.gmark = root.appendChild(el("div", "qmark gmark", "<i></i><span></span>")); // the first minute's grump (possess.js scoutTick)
    hud.threat = root.appendChild(el("div", "threat", ""));
    hud.cross = root.appendChild(el("div", "cross", "<i></i><i></i><i></i><i></i><b></b>"));
    hud.tname = root.appendChild(el("div", "tname"));
    hud.prompt = root.appendChild(el("div", "prompt panel"));
    hud.busy = root.appendChild(el("div", "busy", "<i></i>"));
    hud.needs = root.appendChild(el("div", "needs panel"));
    hud.compass = root.appendChild(el("div", "compass panel"));
    hud.clock = root.appendChild(el("div", "clock panel"));
    hud.who = root.appendChild(el("div", "who panel"));
    hud.quest = root.appendChild(el("div", "quest panel"));
    hud.toast = root.appendChild(el("div", "toast panel"));
    hud.gains = root.appendChild(el("div", "gains"));
    hud.iname = root.appendChild(el("div", "iname"));
    hud.lockhint = root.appendChild(el("div", "lockhint panel", "<kbd class='g'>click</kbd> look with the mouse &nbsp;·&nbsp; <kbd class='g'>← →</kbd> turn"));
    // bottom: vitals over the hotbar
    var bot = hud.bottom = root.appendChild(el("div", "bottom"));
    var vit = bot.appendChild(el("div", "vit"));
    hud.rows = {};
    [["heart", ""], ["food", "r"], ["warm", "small"], ["pep", "r small"]].forEach(function (v) { // hearts and food big, the rest smaller
      var row = vit.appendChild(el("div", "vrow " + v[1]));
      row.title = { heart: "health", food: "food", warm: "warmth", pep: "pep (running, swinging)" }[v[0]];
      for (var i = 0; i < 10; i++) row.appendChild(el("i"));
      if (v[0] === "heart" || v[0] === "food") row.appendChild(el("b", "", "")); // the number, readable at a glance (K-0035)
      hud.rows[v[0]] = { el: row, key: "" };
    });
    hud.hot = bot.appendChild(el("div", "hot panel"));
    hud.hot.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
    var bagb = root.appendChild(el("button", "leave bagbtn", "bag<kbd>Tab</kbd>"));
    bagb.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
    bagb.addEventListener("click", function (e) { e.stopPropagation(); HUD.openBag(); });
    var leave = root.appendChild(el("button", "leave", "⬆ leave body" + (isPhone ? "" : "<kbd>Esc</kbd>")));
    leave.title = "back to god view (Esc)";
    leave.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
    leave.addEventListener("click", function (e) { e.stopPropagation(); P().leave(); });
    // phone: joystick left, look pad right, buttons
    var tz = root.appendChild(el("div", "touch"));
    hud.stickZone = tz.appendChild(el("div", "stickzone"));
    hud.stick = hud.stickZone.appendChild(el("div", "stick")); hud.knob = hud.stick.appendChild(el("i"));
    hud.lookZone = tz.appendChild(el("div", "lookzone"));
    var btns = tz.appendChild(el("div", "pbtns"));
    function btn(txt, cls, fn, hold) {
      var b = btns.appendChild(el("button", cls || "", txt));
      b.addEventListener("pointerdown", function (e) { e.preventDefault(); e.stopPropagation(); fn(true, b); });
      if (hold) { b.addEventListener("pointerup", function (e) { e.preventDefault(); fn(false, b); }); b.addEventListener("pointercancel", function () { fn(false, b); }); }
      return b;
    }
    hud.bUse = btn("use", "", function (on) { if (on) P().act("use"); P().input.use = on; }, true);
    hud.bPlace = btn("place", "", function () { P().act("place"); });
    hud.bAct = btn("act", "act", function () { P().act("ctx"); });
    btn("🎒<br>bag", "", function () { HUD.openBag(); });
    hud.bJump = btn("hop", "", function () { P().input.jump = true; });
    hud.bAct2 = null;
    var intro = isPhone ? "left thumb walks · drag the right side to look · the big button does what it says · tap a hotbar slot to hold it"
      : "<kbd>WASD</kbd>walk <kbd>mouse</kbd> / <kbd>← →</kbd>look <kbd class='g'>left click</kbd>use what you hold <kbd class='m'>right click</kbd>place / eat <kbd>F</kbd>pick up <kbd>Q</kbd>drop <kbd>Tab</kbd>bag <kbd>1–9</kbd>hotbar <kbd>Esc</kbd>leave";
    if (s.firstNight) setTimeout(function () { HUD.beat("you are " + c.name, "run! grab sticks, light the nest", true); }, 400); // the first night: a beat, not a card over the grump
    else {
    hud.intro = root.appendChild(el("div", "intro", "<h2>you are " + esc(c.name) + "</h2><p>no miracles down here. keep your hearts and drumsticks up, stay warm, and be somewhere safe when night comes.</p><p style='font-size:13px;line-height:2.1'>" + intro + "</p>"));
    hud.intro.addEventListener("pointerdown", function () { fadeIntro(); });
    }
    setTimeout(fadeIntro, 4000);
    var fade = root.appendChild(el("div", "fadein")); setTimeout(function () { fade.remove(); }, (P().FADE_IN || 2) * 1000 + 100);
    if (SB.TEST) hud.nums = root.appendChild(el("div", "testnums"));
    document.body.appendChild(root);
    document.body.classList.add("pov");
    bind();
    HUD.quest();
    update(true);
  };
  function fadeIntro() { if (hud && hud.intro) { var i = hud.intro; hud.intro = null; i.classList.add("out"); setTimeout(function () { i.remove(); }, 1300); } }
  function escLock(on) {
    try {
      var kb = navigator.keyboard;
      if (!kb || !kb.lock) return;
      if (on && document.fullscreenElement) { var pr = kb.lock(["Escape"]); if (pr && pr.catch) pr.catch(function () {}); }
      else if (!on) kb.unlock();
    } catch (e) {}
  }
  HUD.remove = function () {
    escLock(false);
    unbind();
    if (typeof document !== "undefined" && document.body && document.body.classList) document.body.classList.remove("pov");
    if (hud && hud.root) hud.root.remove();
    hud = null; keys = {};
  };

  /* ---------------- messages ---------------- */
  var toastT = null;
  HUD.say = function (msg) {
    if (!hud) return;
    hud.toast.textContent = msg; hud.toast.classList.add("on");
    clearTimeout(toastT); toastT = setTimeout(function () { if (hud) hud.toast.classList.remove("on"); }, 2800);
  };
  HUD.gain = function (kind, n) {
    if (!hud) return;
    // merge with a "+1 stick" that's still showing
    var last = hud.gains.lastChild;
    if (last && last._k === kind && hud.t - last._t < 1.6) { last._n += n; last._t = hud.t; last.querySelector("b").textContent = "+" + last._n + " " + plural(kind, last._n); last.style.animation = "none"; void last.offsetWidth; last.style.animation = ""; return; }
    var g = el("div", "gain panel", icon(kind, 22) + "<b>+" + n + " " + esc(plural(kind, n)) + "</b>");
    g._k = kind; g._n = n; g._t = hud.t;
    hud.gains.appendChild(g);
    while (hud.gains.children.length > 5) hud.gains.firstChild.remove();
    setTimeout(function () { g.remove(); }, 2500);
    hud.hotKey = null;
  };
  HUD.ouch = function (n) { // a red flash and the damage, big, so a bite reads (K-0048)
    if (!hud || !hud.edge || !hud.edge.parentNode) return;
    var o = el("div", "ouch"); o.innerHTML = "<b>OUCH!</b><span>−" + n + "% ❤</span>";
    hud.edge.parentNode.appendChild(o); setTimeout(function () { o.remove(); }, 1100);
  };
  HUD.hurt = function (amt) {
    if (!hud) return;
    hud.hurtT = 0.35 + Math.min(0.4, amt * 4);
    hud.rows.heart.el.classList.add("flash");
    hud.edge.classList.add("hit");
  };
  HUD.selected = function () {
    if (!hud) return;
    var s = S(); if (!s) return;
    var sl = Sv().held(s.c);
    hud.hotKey = null;
    if (!sl) { hud.iname.classList.remove("on"); return; }
    var def = K[sl.k], tip = sl.k === "plans" ? "right click: open your building plans" : def && def.tool ? toolTip(sl.k) : Sv().edible(sl.k) ? "right click to eat" : sl.k === "sapling" || sl.k === "seed" ? "right click on open ground to plant" : sl.k === "log" ? "right click a stump to split it into planks" : "";
    hud.iname.innerHTML = esc(kl(sl.k)) + (tip ? "<small>" + esc(tip) + "</small>" : "");
    hud.iname.classList.remove("on"); void hud.iname.offsetWidth; hud.iname.classList.add("on");
    clearTimeout(hud.inameT); hud.inameT = setTimeout(function () { if (hud) hud.iname.classList.remove("on"); }, 1800);
  };
  function toolTip(k) {
    var p = Sv().power(k), out = [];
    if (p.wood >= 1) out.push("chops trees");
    if (p.stone >= 1) out.push("chips rock");
    if (p.ore >= 1 && k !== "hammer") out.push("mines ore");
    if (p.dmg >= 0.5) out.push("whacks grumps");
    return out.length ? out.join(" · ") : "a tool";
  }

  /* ---------------- the quest tracker ---------------- */
  HUD.quest = function () {
    if (!hud) return;
    var s = S(), q = s && s.quest;
    if (!q) { hud.quest.style.display = "none"; if (!s || (!s.sniff && !s.night)) hud.qmark.classList.remove("on"); return; }
    hud.quest.style.display = "";
    var steps = P().questList(), cur = P().questText(), title = q.kind === "blob" ? "🫧 a small body's day" : "🪨 f&zwnj;irst tool";
    var html = "<h4><span>" + title + "</span><button class='skip' title='hide the guide for good'>skip ✕</button></h4>";
    steps.forEach(function (st, i) {
      var cls = i < q.i ? "done" : i === q.i ? "now" : "";
      var txt = i === q.i ? cur.text : st.text;
      html += "<div class='st " + cls + "'><b>" + (i < q.i ? "✓" : i === q.i ? "▸" : "·") + "</b><span>" + esc(txt) + "</span></div>";
    });
    html += "<div class='tip'>" + esc(cur.tip) + "</div>";
    if (hud.questKey !== html) {
      hud.questKey = html;
      hud.quest.innerHTML = html;
      var b = hud.quest.querySelector(".skip");
      if (b) { b.addEventListener("pointerdown", function (e) { e.stopPropagation(); }); b.addEventListener("click", function (e) { e.stopPropagation(); P().skipQuest(); }); }
    }
    hud.quest.classList.toggle("mini", !!hud.phone);
  };
  var qQ = [], qBusy = false;
  HUD.questStep = function (done, next) {
    if (!hud) return;
    if (qBusy) { qQ.push([done, next]); return; } // two steps at once (food already eaten): one banner after the other
    qBusy = true;
    setTimeout(function () { qBusy = false; var n = qQ.shift(); if (n) HUD.questStep(n[0], n[1]); }, 2800);
    var blob = S() && S().quest && S().quest.kind === "blob";
    var nofi = function (t) { return esc(t).replace(/f(?=[il])/g, "f‌"); }; // the mono font's big sizes still join f+i / f+l ("find" read "And")
    var d = hud.root.appendChild(el("div", "qdone panel", "✓ " + nofi(done.text) + (blob ? " · +1 ✨" : "") + (next ? "<small>next: " + nofi(next.text) + "</small>" : "")));
    setTimeout(function () { d.remove(); }, 2700);
    HUD.quest();
  };
  HUD.beat = function (big, small, good) {
    if (!hud) return;
    if (hud.beatEl) hud.beatEl.remove();
    var d = hud.beatEl = hud.root.appendChild(el("div", "qdone beat panel" + (good ? "" : " bad"), esc(big) + (small ? "<small>" + esc(small) + "</small>" : "")));
    setTimeout(function () { d.remove(); if (hud && hud.beatEl === d) hud.beatEl = null; }, 2700);
  };
  // while a grump is after you: a red marker on it, a banner that says how close, and the guide points home
  function threatMarker() {
    var s = S(), g = s && !s.dead && P().scout ? P().scout() : null;
    if (!g) { hud.gmark.classList.remove("on"); hud.threat.classList.remove("on"); return null; }
    var c = s.c, hm = SB.Society.home(s.game, 0), dg = SB.dist(g.x, g.z, c.x, c.z), dh = SB.dist(hm.x, hm.z, c.x, c.z);
    mark(hud.gmark, { x: g.x, y: g.y + 1.3, z: g.z }, dg, 0);
    var txt = (g.scout && g.scout.wind > 0 ? "👹 it's about to pounce! MOVE!" : g.scout && g.scout.t < 3 ? "👹 a grump spotted you! run!" : dg < 2.5 ? "👹 it's got you! run!" : "👹 a grump is after you · " + Math.round(dg) + "m") + " · 🏠 nest " + Math.round(dh) + "m";
    if (hud.threat.textContent !== txt) hud.threat.textContent = txt;
    hud.threat.classList.add("on");
    return { x: hm.x, y: SB.World.groundY(s.game.world, hm.x, hm.z) + 1.2, z: hm.z };
  }
  function testNums() {
    if (!hud || !hud.nums || (hud.numT = (hud.numT || 0) - 1) > 0) return;
    hud.numT = 20;
    var s = S(); if (!s) return;
    var c = s.c, g = P().scout ? P().scout() : null, run = SB.Creature.runSpeed ? SB.Creature.runSpeed(c) : 0;
    hud.nums.textContent = "🧪 food " + Math.round((1 - c.chem.hunger) * 100) + "%  −" + (P().hungerRate() * 100).toFixed(2) + "%/s (full bar " + Math.round(1 / P().hungerRate()) + " s)\n" +
      "🧪 your sprint " + run.toFixed(2) + " m/s" + (g ? " · grump " + (g.scout && g.scout.speedK ? (run * g.scout.speedK).toFixed(2) + " m/s (" + Math.round(g.scout.speedK * 100) + "%)" : "chasing") + (g.scout && g.scout.wind > 0 ? " · WIND-UP" : "") : "") + "\n" +
      "🧪 pounce " + Math.round(SB.Creature.LUNGE_DMG * 100) + "% after " + SB.Creature.LUNGE_WIND + " s · fire scares at " + SB.Creature.FIRE_SCARE + " m · KO cooldown " + P().KO_COOLDOWN + " s";
  }
  function questMarker() {
    testNums();
    var home = threatMarker();
    var s = S(), q = s && s.quest, t = (s && s.goal) || home || (s && s.sniff ? s.sniff : s && s.night ? s.night : q && q.target), R = SB.Render; // the first night's goal first // the way home from a grump, the nose, home at night, then the guide
    if (!t || !R || !R.project || s.dead) { hud.qmark.classList.remove("on"); return; }
    var c = s.c, d = SB.dist(t.x, t.z, c.x, c.z);
    hud.qmark.classList.toggle("home", !!home || !!(s && s.goal));
    if (d < 1.4) { hud.qmark.classList.remove("on"); return; }
    mark(hud.qmark, t, d, 1.4);
    if (home || s.goal) { var sp = hud.qmark.querySelector("span"), lb = (s.goal ? s.goal.label : "🏠 home") + " " + Math.round(d) + "m"; if (sp.textContent !== lb) sp.textContent = lb; }
    keepLabel(hud.qmark);
  }
  // a marker's label never runs off the screen edge (K-0048: "o sticks 2m")
  function keepLabel(m) {
    var sp = m.querySelector("span"); if (!sp) return;
    var w = sp.offsetWidth, x = parseFloat(m.style.left) || 0, W = window.innerWidth, sh = 0;
    if (x - w / 2 < 6) sh = 6 - (x - w / 2); else if (x + w / 2 > W - 6) sh = W - 6 - (x + w / 2);
    var tf = "translateX(calc(-50% + " + Math.round(sh) + "px))";
    if (sp.style.transform !== tf) sp.style.transform = tf;
  }
  function mark(m, t, d, minD) {
    var s = S(), c = s.c, R = SB.Render;
    if (d < minD) { m.classList.remove("on"); return; }
    var bearing = Math.atan2(-(t.x - c.x), -(t.z - c.z)), diff = SB.angDiff(s.yaw, bearing);
    var p = R.project(t.x, t.y, t.z), W = window.innerWidth, H = window.innerHeight, x, y, edge = false;
    if (Math.abs(diff) < 0.75 && p.on) { x = SB.clamp(p.x, 24, W - 24); y = SB.clamp(p.y, 60, H - 140); }
    else { edge = true; x = diff > 0 ? 26 : W - 26; y = H * 0.5 + (m === hud.gmark ? 46 : 0); } // two arrows on one side: stacked
    m.classList.add("on");
    m.classList.toggle("edge", edge);
    m.style.left = x + "px"; m.style.top = y + "px";
    var sp = m.querySelector("span"), lbl = Math.round(d) + "m";
    if (sp.textContent !== lbl) sp.textContent = lbl;
    keepLabel(m);
    var ic = m.querySelector("i");
    ic.style.transform = edge ? "rotate(" + (diff > 0 ? -45 : 135) + "deg)" : "rotate(45deg)";
  }

  /* ---------------- death ---------------- */
  HUD.death = function (info) {
    if (!hud) return;
    closeBag();
    var c = info.c, items = info.items.slice(0, 18);
    var ideas = info.ideas.map(function (id) { var d = SB.Ideas.BY_ID[id]; return d ? (d.icon || "") + " " + d.name : id; });
    var days = Math.max(0, Math.round((info.age || 0) / SB.DAY_LENGTH));
    var html = "<div style='font-size:44px'>🕯</div><h2>" + esc(c.name) + " " + esc(info.why) + "</h2>" +
      "<div class='how'>" + esc(c.name) + " lived " + (days ? days + " day" + (days > 1 ? "s" : "") : "less than a day") + ". " + (info.tip ? esc(info.tip) + "." : "") + "</div>";
    html += "<div class='lost panel'><h4>lost with " + esc(c.name) + "</h4><div class='items'>" +
      (items.length ? items.map(function (x) { return "<span>" + icon(x.k, 20) + "×" + x.n + "</span>"; }).join("") + "<span style='opacity:.7;font-weight:500'>(dropped where it fell)</span>" : "<span style='opacity:.7'>an empty pack</span>") + "</div>" +
      (ideas.length ? "<h4 style='margin-top:8px;color:#ffb0b0'>ideas nobody else knew: " + esc(ideas.join(", ")) + "</h4>" : "<h4 style='margin-top:8px'>every idea it had lives on in the others</h4>") + "</div>";
    html += "<div style='opacity:.75;font-size:13px'>it learned " + info.lessons + " of your choices. the tribe will remember " + esc(c.name) + ".</div>";
    var d = hud.root.appendChild(el("div", "death", html));
    var b = d.appendChild(el("button", null, "back to the sky"));
    var done = false, go = function () { if (done) return; done = true; P().leave("died"); };
    b.addEventListener("click", go);
    if (document.exitPointerLock && document.pointerLockElement) try { selfUnlockAt = performance.now(); document.exitPointerLock(); } catch (e) {}
    hud.deathT = setTimeout(go, 20000);
  };

  /* ---------------- the bag (inventory + crafting + building) ---------------- */
  var bag = null; // {el, tab, pick: slot index picked up by a tap, grid: [kinds], detail}
  HUD.openBag = function (tab) {
    if (!hud) return;
    var s = S(); if (!s || s.dead) return;
    if (bag && (!tab || tab === bag.tab)) { closeBag(); return; }
    if (!bag) {
      bag = { tab: tab || "make", pick: -1, grid: [], detail: -1 };
      bag.el = hud.root.appendChild(el("div", "bag"));
      bag.el.addEventListener("pointerdown", function (e) { if (e.target === bag.el) closeBag(); e.stopPropagation(); });
      bag.el.addEventListener("contextmenu", function (e) { e.preventDefault(); });
      if (document.exitPointerLock && document.pointerLockElement) try { selfUnlockAt = performance.now(); document.exitPointerLock(); } catch (e) {}
      P().input.fwd = P().input.side = 0; P().input.use = false; keys = {};
    } else bag.tab = tab;
    drawBag();
  };
  HUD.closeBag = closeBag;
  function closeBag() { if (bag) { returnGrid(); bag.el.remove(); bag = null; } if (hud) hud.hotKey = null; }
  HUD.bagOpen = function () { return !!bag; };
  function returnGrid() { if (bag) bag.grid = []; }
  function slotHtml(sl, i, hotN, extra) {
    var on = i < hotN && Sv().inv(S().c).sel === i;
    var h = "<div class='slot" + (on ? " on" : "") + (bag && bag.pick === i ? " pick" : "") + (extra || "") + "' data-i='" + i + "' title='" + (sl ? esc(kl(sl.k)) : "") + "'>";
    if (i < hotN) h += "<small>" + (i + 1) + "</small>";
    if (sl) {
      h += icon(sl.k, 32);
      if (sl.n > 1) h += "<em>" + sl.n + "</em>";
      if (K[sl.k] && K[sl.k].tool && sl.w != null) { var f = SB.clamp(sl.w / Sv().uses(sl.k), 0, 1); h += "<span class='wear'><b style='width:" + Math.round(f * 100) + "%;background:" + (f > 0.5 ? "#7bd860" : f > 0.2 ? "#ffd84a" : "#ff4f5e") + "'></b></span>"; }
    }
    return h + "</div>";
  }
  function inGrid(kind) { var n = 0; bag.grid.forEach(function (k) { if (k === kind) n++; }); return n; }
  function drawBag() {
    var s = S(), c = s.c, v = Sv().inv(c), hn = Sv().hotN(c), bn = Sv().bagN(c), html = "";
    html += "<div class='win panel'><div class='inv'>";
    html += "<h3>" + esc(c.name) + "'s bag <small>" + (hud.phone ? "tap to pick up · tap again to put down · hold for details" : "drag to move · shift-click to craft with · right click to split") + "</small></h3>";
    if (bn) {
      html += "<div class='grid'>";
      for (var i = hn; i < hn + bn; i++) html += slotHtml(v.s[i], i, hn);
      html += "</div><div class='sep'></div>";
    } else html += "<div class='lbl'>" + (c.tier < 2 ? "no bag: a " + SB.TIERS[c.tier].name + " carries one thing in its mouth" : "") + "</div>";
    html += "<div class='lbl'>hotbar · what you hold is lit</div><div class='grid'>";
    for (i = 0; i < hn; i++) html += slotHtml(v.s[i], i, hn);
    html += "</div>";
    if (bag.detail >= 0 && v.s[bag.detail]) html += detailHtml(v.s[bag.detail], bag.detail);
    html += "<div class='help'>" + (Sv().cap(c) ? "bags get bigger as the tribe's brains do, and a basket adds 9 slots" : "") + "</div></div>";
    html += "<div class='side'><div class='tabs'><button data-tab='make' class='" + (bag.tab === "make" ? "on" : "") + "'>🛠 make</button><button data-tab='build' class='" + (bag.tab === "build" ? "on" : "") + "'>🏕 build</button></div>";
    html += bag.tab === "build" ? buildHtml() : makeHtml();
    html += "<div style='display:flex;justify-content:flex-end;margin-top:10px'><button class='btn' data-close>close " + (hud.phone ? "" : "(Tab)") + "</button></div></div></div>";
    bag.el.innerHTML = html;
    wireBag();
  }
  function detailHtml(sl, i) {
    var def = K[sl.k] || {}, s = S(), btns = [];
    if (i >= Sv().hotN(s.c) && Sv().hotN(s.c)) btns.push("<button class='btn' data-d='hold'>hold it</button>");
    if (Sv().edible(sl.k)) btns.push("<button class='btn' data-d='eat'>eat</button>");
    if (sl.k !== "plans") btns.push("<button class='btn' data-d='craft'>craft with</button>");
    if (sl.n > 1) btns.push("<button class='btn' data-d='split'>split</button>");
    if (sl.k !== "plans") btns.push("<button class='btn' data-d='drop'>drop</button>");
    var desc = sl.k === "plans" ? "every building you or your tribe knows. pick one to place its ghost" : def.desc || "";
    if (def.tool) desc = toolTip(sl.k) + (sl.w != null ? " · " + Math.max(0, Math.round(sl.w)) + " of " + Sv().uses(sl.k) + " uses left" : "") + (desc ? ". " + desc : "");
    return "<div class='detail'><b>" + icon(sl.k, 20) + " " + esc(kl(sl.k)) + (sl.n > 1 ? " ×" + sl.n : "") + "</b><div>" + esc(desc) + "</div><div class='row'>" + btns.join("") + "</div></div>";
  }
  function makeHtml() {
    var s = S(), c = s.c, h = "";
    if (c.tier < 2) {
      // the way to hands, drawn (K-0021: "make it a visual legs-to-hands path"): blob → critter → tool-user,
      // where this one is, and bars for the practice its kids will inherit
      var FH = SB.FirstHour, steps = [0, 1, 2].map(function (t) {
        var T = SB.TIERS[t], cls = t < c.tier ? "done" : t === c.tier ? "here" : "next";
        return "<div class='mpstep " + cls + "'><span class='mpi'>" + T.icon + "</span><span>" + esc(T.name) + "</span>" + (t === c.tier ? "<small>you</small>" : t === 2 ? "<small>hands!</small>" : "") + "</div>";
      });
      var h0 = "<div class='mpath'>" + steps.join("<span class='mparr'>→</span>") + "</div>";
      var bars = (c.tier === 0 ? ["limbs", "arms"] : ["arms"]).map(function (g) {
        var ep = FH && FH.echoProgress ? FH.echoProgress(c, g) : null;
        if (!ep) return "";
        var how = g === "limbs" ? "walk about: every walk counts" : "carry things in your mouth, tug leaves, line the nest";
        return "<div class='mpbar'><div class='row'><b>" + ep.info.icon + " " + esc(ep.info.word) + "</b><span class='sp'></span><span class='mono'>" + ep.n + "/" + ep.of + "</span></div>" +
          "<div class='tb'><i style='width:" + Math.round(ep.frac * 100) + "%;background:" + ep.info.col + "'></i></div><small>" + how + "</small></div>";
      }).join("");
      return "<div class='lbl'>the way to hands</div>" + h0 + bars +
        "<p class='help'>a " + esc(SB.TIERS[c.tier].name) + " can't make things yet. what " + esc(c.name) + " practises echoes into its kids, and kids that lean far enough are born the next step up.</p>";
    }
    // the crafting grid: put things together and see what happens
    var rc = bag.grid.length ? Sv().match(bag.grid) : null;
    h += "<div class='lbl'>put things together</div><div class='cgrid'><div class='slots'>";
    for (var i = 0; i < 4; i++) {
      var k = bag.grid[i];
      h += "<div class='slot cg' data-g='" + i + "'>" + (k ? icon(k, 32) : "") + "</div>";
    }
    h += "</div><span class='arrow'>→</span><div class='slot'>" + (rc && rc.out && (SB.Ideas.known(c, rc.id) || rc.id === "lashing") ? icon(rc.out, 32) : rc ? "<b style='font-size:22px'>?</b>" : "") + "</div>";
    h += "<button class='btn go' data-combine " + (bag.grid.length ? "" : "disabled") + ">combine</button></div>";
    if (!bag.grid.length) h += "<div class='help' style='margin:-4px 0 8px'>" + (hud.phone ? "tap a slot, then tap here" : "shift-click (or drag) things from your bag into these slots") + "</div>";
    // recipes: the ones you know, and riddles for the ones you're close to
    var list = Sv().recipes(c, s.game);
    h += "<div class='lbl'>recipes</div><div class='rlist'>";
    if (!list.length) h += "<div class='rc'><div class='t'>nothing yet. pick things up and try putting them together</div></div>";
    var riddles = 0;
    list.filter(function (r) { return r.known || riddles++ < 4; }).slice(0, 14).forEach(function (r) {
      var rc2 = r.rc;
      if (r.known) {
        var need = [];
        for (var k2 in rc2.in) { var have = Math.min(rc2.in[k2], r.have[k2] || 0); need.push("<span class='" + (have >= rc2.in[k2] ? "ok" : "no") + "'>" + icon(k2, 16) + " " + have + "/" + rc2.in[k2] + "</span>"); }
        if (rc2.tool) need.push("<span class='" + (r.have["tool:" + rc2.tool] ? "ok" : "no") + "'>" + icon(rc2.tool, 16) + " tool</span>");
        if (r.station) need.push("<span class='no'>by a " + esc(r.station) + "</span>");
        h += "<div class='rc'>" + (rc2.out ? icon(rc2.out, 32) : "<span class='big'>" + (rc2.icon || "🔥") + "</span>") + "<div class='t'>" + esc(rc2.out ? K[rc2.out].label : rc2.name) + "<div class='need'>" + need.join("") + "</div></div><button class='btn go' data-make='" + r.id + "' " + (r.ok ? "" : "disabled") + ">make</button></div>";
      } else {
        h += "<div class='rc q'><span class='big'>???</span><div class='t'>" + esc(r.hint || r.riddle) + (r.hint ? "<small>" + esc(r.lack.length ? r.riddle : "you have what it takes: try it") + "</small>" : "") + "</div></div>";
      }
    });
    h += "</div>";
    return h;
  }
  function buildHtml() {
    var s = S(), c = s.c, list = P().buildable(), h = "";
    if (c.tier < 2) return "<p>building takes hands: a tool-user and up.</p>";
    if (!list.length) return "<p>nobody in the tribe knows how to build anything yet. a campfire comes from fire; fire comes from rubbing sticks on dry leaves (try it in the make tab).</p>";
    h += "<div class='lbl'>pick one, then place its ghost in the world</div><div class='rlist'>";
    list.forEach(function (b) {
      var def = SK[b.kind], need = [];
      for (var k in b.cost) { var have = Sv().count(c, k); if (k === "stick") have += Sv().count(c, "log", true) * 2 + Sv().count(c, "plank", true); need.push("<span class='" + (have >= b.cost[k] ? "ok" : "no") + "'>" + icon(k, 16) + " " + Math.min(have, b.cost[k]) + "/" + b.cost[k] + "</span>"); }
      h += "<div class='rc'><span class='big'>" + def.emoji + "</span><div class='t'>" + esc(def.label) + (b.known ? "" : b.tribe ? "<small>you've watched the others build these</small>" : "<small>a new idea… worth a try</small>") + "<div class='need'>" + need.join("") + "</div></div><button class='btn go' data-build='" + b.kind + "' " + (b.can ? "" : "disabled") + ">plan</button></div>";
    });
    h += "</div><div class='help'>you don't need everything to start: place the site, then bring it what it asks for.</div>";
    return h;
  }
  function wireBag() {
    var root = bag.el, s = S(), c = s.c;
    root.querySelectorAll("[data-tab]").forEach(function (b) { b.addEventListener("click", function () { bag.tab = b.getAttribute("data-tab"); drawBag(); }); });
    var cl = root.querySelector("[data-close]"); if (cl) cl.addEventListener("click", closeBag);
    root.querySelectorAll("[data-make]").forEach(function (b) { b.addEventListener("click", function () { P().craft(b.getAttribute("data-make")); drawBag(); }); });
    root.querySelectorAll("[data-build]").forEach(function (b) { b.addEventListener("click", function () { P().startBuild(b.getAttribute("data-build")); }); });
    var cb = root.querySelector("[data-combine]");
    if (cb) cb.addEventListener("click", function () { var r = P().combine(bag.grid.slice()); if (r && r.ok) bag.grid = []; if (bag) drawBag(); });
    root.querySelectorAll(".cg").forEach(function (g) {
      g.addEventListener("click", function () {
        var gi = +g.getAttribute("data-g");
        if (bag.pick >= 0) { addToGrid(bag.pick); bag.pick = -1; }
        else if (bag.grid[gi]) bag.grid.splice(gi, 1);
        drawBag();
      });
    });
    root.querySelectorAll("[data-d]").forEach(function (b) {
      b.addEventListener("click", function () {
        var a = b.getAttribute("data-d"), i = bag.detail, v = Sv().inv(c), sl = v.s[i];
        if (!sl) return;
        if (a === "hold") { var hn = Sv().hotN(c), to = v.sel; for (var j = 0; j < hn; j++) if (!v.s[j]) { to = j; break; } Sv().move(c, i, to); Sv().select(c, to); bag.detail = to; P().select(to); }
        else if (a === "eat") { var k = sl.k; Sv().removeAt(c, i, 1); var r = Sv().eat(c, s.game, k, null); if (r && r.msg) HUD.say(r.msg); }
        else if (a === "craft") addToGrid(i);
        else if (a === "split") Sv().splitStack(c, i);
        else if (a === "drop") { var o = Sv().removeAt(c, i, null), it = Sv().spawn(s.game, o.k, o.n, c.x - Math.sin(s.yaw) * 0.9, c.z - Math.cos(s.yaw) * 0.9, { w: o.w }); if (it) it.data.noPick = s.game.time + 3; bag.detail = -1; }
        drawBag();
      });
    });
    // slots: tap/click to pick up and put down, drag (mouse or finger) to move, long-press for details
    root.querySelectorAll(".slot[data-i]").forEach(function (d) {
      var i = +d.getAttribute("data-i"), press = null;
      d.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        press = { x: e.clientX, y: e.clientY, t: Date.now(), moved: false, id: e.pointerId };
        press.lp = setTimeout(function () { if (press && !press.moved) { press.long = true; bag.detail = i; bag.pick = -1; drawBag(); } }, 480);
        if (e.button === 2) { clearTimeout(press.lp); press = null; Sv().splitStack(c, i); drawBag(); return; }
        try { d.setPointerCapture(e.pointerId); } catch (er) {}
      });
      d.addEventListener("pointermove", function (e) {
        if (!press || e.pointerId !== press.id) return;
        if (!press.moved && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8) {
          press.moved = true; clearTimeout(press.lp);
          if (!Sv().inv(c).s[i]) { press = null; return; }
          press.ghost = el("div", "slot", icon(Sv().inv(c).s[i].k, 32)); press.ghost.style.cssText = "position:fixed;pointer-events:none;z-index:9;opacity:.85";
          hud.root.appendChild(press.ghost);
        }
        if (press.ghost) { press.ghost.style.left = (e.clientX - 24) + "px"; press.ghost.style.top = (e.clientY - 24) + "px"; }
      });
      d.addEventListener("pointerup", function (e) {
        if (!press) return;
        clearTimeout(press.lp);
        var p = press; press = null;
        if (p.ghost) {
          p.ghost.remove();
          var under = document.elementFromPoint(e.clientX, e.clientY), tgt = under && under.closest ? under.closest(".slot[data-i], .cg") : null;
          if (tgt && tgt.classList.contains("cg")) addToGrid(i);
          else if (tgt) { var to = +tgt.getAttribute("data-i"); Sv().move(c, i, to); if (to < Sv().hotN(c) && i === Sv().inv(c).sel) Sv().select(c, to); }
          drawBag(); return;
        }
        if (p.long) return;
        if (e.shiftKey) { addToGrid(i); drawBag(); return; }
        tapSlot(i);
      });
      d.addEventListener("pointercancel", function () { if (press) { clearTimeout(press.lp); if (press.ghost) press.ghost.remove(); press = null; } });
    });
  }
  function tapSlot(i) {
    var c = S().c, v = Sv().inv(c);
    if (bag.pick >= 0) {
      if (bag.pick !== i) Sv().move(c, bag.pick, i);
      bag.pick = -1; bag.detail = -1;
    } else if (v.s[i]) { bag.pick = i; bag.detail = i; if (i < Sv().hotN(c)) P().select(i); }
    else if (i < Sv().hotN(c)) P().select(i);
    drawBag();
  }
  function addToGrid(i) {
    var c = S().c, sl = Sv().inv(c).s[i];
    if (!sl || sl.k === "plans" || bag.grid.length >= 4) return;
    if (inGrid(sl.k) >= Sv().count(c, sl.k, true)) { HUD.say("you've only got " + Sv().count(c, sl.k, true)); return; }
    bag.grid.push(sl.k);
    if (bag.tab !== "make") bag.tab = "make";
  }
  HUD._bag = function () { return bag; };
  HUD.redrawBag = function () { if (bag) drawBag(); };

  /* ---------------- per-frame ---------------- */
  HUD.frame = function (dt) {
    if (!hud) return;
    var s = S(); if (!s) return;
    hud.t += dt;
    if (s.mdx || s.mdy) { P().look2(s.mdx, s.mdy); s.mdx = s.mdy = 0; }
    keyLook(dt); readKeys();
    if (hud.hurtT > 0 && (hud.hurtT -= dt) <= 0) { hud.rows.heart.el.classList.remove("flash"); hud.edge.classList.remove("hit"); }
    paws(dt, s);
    questMarker();
    if ((hud.upT = (hud.upT || 0) - dt) <= 0) { hud.upT = 0.1; update(false); }
  };
  var DIRS = [["N", 0], ["NE", 45], ["E", 90], ["SE", 135], ["S", 180], ["SW", 225], ["W", 270], ["NW", 315]];
  function vrow(name, v, iconName, low) {
    var r = hud.rows[name], halves = Math.round(SB.clamp(v, 0, 1) * 20), key = halves + iconName + (low ? "L" : "");
    if (r.key === key) return;
    var prev = r.halves;
    r.key = key; r.halves = halves;
    var ch = r.el.children;
    for (var i = 0; i < 10; i++) {
      var mode = halves >= i * 2 + 2 ? 2 : halves === i * 2 + 1 ? 1 : 0;
      ch[i].style.backgroundImage = "url(" + vicon(iconName, mode) + ")";
      ch[i].className = mode === 1 ? "h" : "";
    }
    r.el.classList.toggle("low", !!low);
    if (ch[10]) ch[10].textContent = Math.round(SB.clamp(v, 0, 1) * 100) + "%";
    if (prev != null && halves > prev + 1) { r.el.classList.remove("pulse"); void r.el.offsetWidth; r.el.classList.add("pulse"); }
    if (prev != null && halves < prev && (name === "food" || name === "heart")) { r.el.classList.add("drop"); clearTimeout(r.dropT); r.dropT = setTimeout(function () { r.el.classList.remove("drop"); }, 260); } // you see it go down
  }
  function update(force) {
    var s = S(), c = s.c, game = s.game, w = game.world, ch = c.chem;
    // vitals: hearts and drumsticks like every survival game, flames that turn to snowflakes in the cold, pep
    vrow("heart", ch.health, "heart", ch.health < 0.25);
    vrow("food", 1 - ch.hunger, "food", ch.hunger > 0.78);
    var cold = ch.cold || 0, hot = ch.hot || 0, warm = 1 - Math.max(cold, hot);
    vrow("warm", warm, cold > 0.35 ? "cold" : "warm", warm < 0.3);
    vrow("pep", s.stam, "pep", s.stam < 0.2);
    // the screen edge: red when hurt or hunted, blue when freezing
    var g = null, gd = 12;
    game.creatures.forEach(function (o) { if (o.alive && o.species === "grump") { var d = SB.dist(o.x, o.z, c.x, c.z); if (d < gd) { gd = d; g = o; } } });
    hud.edge.classList.toggle("red", ch.health < 0.3 || (!!g && gd < 7));
    hud.edge.classList.toggle("blue", cold > 0.45 && ch.health >= 0.3);
    if (g && !s.grumpWarned) { s.grumpWarned = true; HUD.say("👺 a grump! left click it with a weapon, run (shift), or get near a fire"); }
    if (!g) s.grumpWarned = false;
    if (w.night && !s.nightWarned) { s.nightWarned = true; HUD.say("🌙 night. grumps come out: find a fire or a roof"); }
    if (!w.night) s.nightWarned = false;
    if (ch.hunger > 0.75 && !s.hungryWarned) { s.hungryWarned = true; HUD.say("🍗 so hungry… hold food and right click to eat"); }
    if (ch.hunger > 0.78 && (s.lowT = (s.lowT || 0) - 0.1) <= 0) { s.lowT = 6; if (SB.Audio && SB.Audio.play) SB.Audio.play("sick", { vol: 0.7 }); } // a tummy rumble every few seconds while it's nearly empty
    if (ch.hunger < 0.6) s.hungryWarned = false;
    if (cold > 0.5 && !s.coldWarned) { s.coldWarned = true; HUD.say("❄ freezing! get to a fire or under a roof"); }
    if (cold < 0.3) s.coldWarned = false;
    hotbar(force);
    who(c, s);
    clockCompass(c, s, w, game);
    target(s);
    if (hud.lockhint) hud.lockhint.style.display = locked() || hud.phone || bag || hud.looked ? "none" : "";
    HUD.quest();
  }
  function hotbar(force) {
    var s = S(), c = s.c, v = Sv().inv(c), hn = Sv().hotN(c), key = JSON.stringify(v.s.slice(0, hn)) + v.sel + (itemIdx ? 1 : 0);
    if (!force && hud.hotKey === key) return;
    hud.hotKey = key;
    var h = "";
    if (!hn) h = "<div class='slot dim' title='a blob has no hands'>" + icon("paws", 32) + "</div>";
    for (var i = 0; i < hn; i++) h += slotHtml(v.s[i], i, hn);
    hud.hot.innerHTML = h;
    hud.hot.querySelectorAll(".slot[data-i]").forEach(function (d) {
      var i2 = +d.getAttribute("data-i"), lp = null;
      d.addEventListener("pointerdown", function (e) {
        e.preventDefault(); e.stopPropagation();
        P().select(i2);
        lp = setTimeout(function () { HUD.openBag(); if (bag) { bag.detail = i2; drawBag(); } }, 520);
      });
      d.addEventListener("pointerup", function () { clearTimeout(lp); });
      d.addEventListener("pointercancel", function () { clearTimeout(lp); });
    });
    if (bag) drawBag();
    var sl = Sv().held(c);
    hud.item.innerHTML = sl ? icon(sl.k, 56) : "";
  }
  function who(c, s) {
    var tier = SB.TIERS[c.tier];
    var face = (SB.Chem.MOOD_EMOJI || {})[SB.Chem.mood(c.chem)] || "🙂";
    var wkey = c.name + tier.name + c.stage + !!c.asleep + s.lessons + face;
    if (hud.whoKey === wkey) return;
    hud.whoKey = wkey;
    var pic = portrait(c);
    hud.who.innerHTML = "<div class='face' title='" + face + "' style='background:" + hud.col + "'>" + (pic ? "" : face) + "</div><div><div class='nm'>" + esc(c.name) + "</div><div class='tr' style='color:" + tier.color + "'>" + tier.icon + " " + tier.name + "</div><small>" + SB.STAGES[c.stage].name + (c.asleep ? " · asleep, move to wake" : "") + "</small>" + (s.lessons ? "<span class='learn'>🧠 " + s.lessons + " learned from you</span>" : "") + "</div>";
    var fbox = pic && hud.who.querySelector(".face"); if (fbox) fbox.appendChild(pic);
  }
  function portrait(c) {
    if (!SB.Pixel || !SB.Pixel.paint) return null;
    try {
      var sh = SB.Pixel.paint(c), fr = sh.frames[c.asleep ? SB.Pixel.FR.sleep : SB.Pixel.FR.idle0], hd = sh.head || { x: 16, y: 14, r: 5 };
      var n = 18, x0 = Math.max(0, Math.min(32 - n, Math.round(hd.x - n / 2))), y0 = Math.max(0, Math.min(32 - n, Math.round(hd.y - n / 2 + 1)));
      var cv = document.createElement("canvas"); cv.width = cv.height = n;
      var x = cv.getContext("2d"), img = x.createImageData(n, n);
      for (var y = 0; y < n; y++) img.data.set(fr.d.subarray(((y0 + y) * 32 + x0) * 4, ((y0 + y) * 32 + x0 + n) * 4), y * n * 4);
      x.putImageData(img, 0, 0);
      cv.style.cssText = "width:36px;height:36px;image-rendering:pixelated";
      return cv;
    } catch (e) { return null; }
  }
  function clockCompass(c, s, w, game) {
    var tday = (w.time / SB.DAY_LENGTH) % 1, hh = Math.floor(tday * 24), mm = Math.floor((tday * 24 - hh) * 6) * 10; // ten-minute steps: a calmer clock
    var part = w.night ? "night 🌙" : tday < 0.27 ? "dawn 🌅" : tday < 0.45 ? "morning ☀️" : tday < 0.58 ? "midday ☀️" : tday < 0.74 ? "afternoon 🌤" : "dusk 🌇";
    var wx = w.weather.rain > 0.3 ? (w.weather.snow || SB.World.tempAt(w, c.x, c.z) < 0.25 ? " · snowing ❄️" : " · raining 🌧") : w.weather.wind > 0.7 ? " · windy 💨" : "";
    var pf = SB.Render && SB.Render.perf, ct = ("0" + hh).slice(-2) + ":" + ("0" + mm).slice(-2) + " · " + part + wx + (pf && pf.show && pf.ft ? " · " + Math.round(1000 / pf.ft) + " fps" : "");
    if (hud.clock.textContent !== ct) hud.clock.textContent = ct;
    var head = ((-s.yaw * 180 / Math.PI) % 360 + 360) % 360, wpx = hud.compass.clientWidth || 300, span = 120, html = "";
    DIRS.forEach(function (d) {
      var off = ((d[1] - head + 540) % 360) - 180;
      if (Math.abs(off) < span / 2) html += "<span class='" + (d[0].length === 1 ? "c" : "") + "' style='left:" + (50 + off / span * 100) + "%'>" + d[0] + "</span>";
    });
    function mark(x, z, txt) {
      var a = Math.atan2(x - c.x, -(z - c.z)) * 180 / Math.PI, o = ((a - head + 540) % 360) - 180;
      if (Math.abs(o) < span / 2) html += "<span class='q' style='left:" + (50 + o / span * 100) + "%'>" + txt + "</span>";
    }
    var home = SB.Society ? SB.Society.home(game, c.tribe) : w.T.spawn;
    if (home && SB.dist(home.x, home.z, c.x, c.z) > 3) mark(home.x, home.z, "🏠");
    if (s.sniff) mark(s.sniff.x, s.sniff.z, "👃");
    else if (s.night) mark(s.night.x, s.night.z, "🌙");
    else if (s.quest && s.quest.target) mark(s.quest.target.x, s.quest.target.z, "◆");
    hud.compass.innerHTML = "<div class='ticks' style='background-position:" + (-head / span * wpx).toFixed(1) + "px 0'></div><div class='mark'></div>" + html;
  }
  function kc(which) {
    if (hud.phone) return "";
    return which === "use" ? "<kbd class='g'>LMB</kbd>" : which === "place" ? "<kbd class='m'>RMB</kbd>" : which === "pick" ? "<kbd>F</kbd>" : "<kbd>E</kbd>";
  }
  function target(s) {
    var o = s.opts || {}, t = s.target, r = o.r, lines = [];
    ["use", "place", "pick"].forEach(function (k) {
      var op = o[k];
      if (!op) return;
      if (lines.some(function (l) { return l.label === op.label; })) return;
      lines.push({ k: k, label: op.label, locked: op.locked });
    });
    if (s.ghost) lines.push({ k: "r", label: "turn it", raw: "<kbd>R</kbd>" });
    var html = lines.map(function (l) { return "<div class='" + (l.locked ? "lk" : "") + "'>" + (l.raw || (l.locked ? (hud.phone ? "" : "🔒 ") : kc(l.k))) + esc(l.label) + "</div>"; }).join("");
    if (o.hint) html += "<div class='lk'>" + esc(o.hint) + "</div>";
    if (hud.promptKey !== html) { hud.promptKey = html; hud.prompt.innerHTML = html; }
    var tn = s.ghost ? SK[s.ghost.kind].label + " (ghost)" : r ? P().label(r) : "", extra = "";
    if (r && r.type === "item" && Sv().pileN(r.ref) > 1) extra = "×" + Sv().pileN(r.ref);
    if (r && r.type === "node" && r.ref.left != null && Sv().rockOf(r.ref)) extra = r.ref.left + " left";
    if (r && r.type === "node" && r.ref.hp != null && Sv().isTree(r.ref) && r.ref.state === "ok") extra = Math.max(0, Math.ceil(r.ref.hp)) + "/" + Sv().treeHP(r.ref);
    var tk = tn + extra;
    if (hud.tnKey !== tk) { hud.tnKey = tk; hud.tname.innerHTML = esc(tn) + (extra ? "<small>" + esc(extra) + "</small>" : ""); }
    hud.cross.classList.toggle("on", !!t || !!s.ghost);
    hud.cross.classList.toggle("no", !!(s.ghost && !s.ghost.ok));
    // the busy bar (pulling a vine)
    if (s.busy) { hud.busy.classList.add("on"); hud.busy.firstChild.style.width = Math.round(Math.min(1, s.busy.t / s.busy.dur) * 100) + "%"; } else hud.busy.classList.remove("on");
    // a building site: what it still needs, against what you carry
    var nh = "";
    if (r && r.type === "struct" && !r.ref.done) {
      var need = Sv().needs(r.ref), cost = SK[r.ref.kind].cost || {};
      nh = "<h4>" + esc(SK[r.ref.kind].label) + " site</h4>";
      for (var k in cost) {
        var left = r.ref.need[k] || 0, have = Sv().count(s.c, k);
        nh += "<div class='" + (left <= 0 ? "ok" : "no") + "'>" + icon(k, 18) + (left <= 0 ? "✓ " + esc(plural(k, cost[k])) : esc(left + " more " + plural(k, left)) + (have ? " · you have " + have : "")) + "</div>";
      }
      if (!need.length) nh += "<div class='ok'>ready: " + (hud.phone ? "hold use" : "hold left click") + " to build</div>";
    }
    if (hud.needsKey !== nh) { hud.needsKey = nh; hud.needs.innerHTML = nh; }
    // phone buttons say what they'll do
    if (hud.phone) {
      var ctx = o.ctx;
      setBtn(hud.bAct, ctx ? ctx.label : "…", !ctx);
      setBtn(hud.bUse, o.use && !o.use.locked ? short(o.use.label) : "use", !o.use || o.use.locked);
      setBtn(hud.bPlace, o.place && !o.place.locked ? short(o.place.label) : "place", !o.place || o.place.locked);
    }
  }
  function short(l) { return l.length > 16 ? l.split(" ").slice(0, 2).join(" ") : l; }
  function setBtn(b, txt, off) { if (!b) return; if (b._t !== txt) { b._t = txt; b.textContent = txt; } b.classList.toggle("off", !!off); }
  function paws(dt, s) {
    var b = s.bobK || 0, sw = Math.sin(s.bob * Math.PI), sw2 = s.swing || 0, busy = s.busy || s.work ? Math.abs(Math.sin(hud.t * 9)) : 0;
    var rot = -sw2 * 55 - busy * 25, dy = sw * 7 * b + sw2 * -20;
    hud.paw.style.transform = "translateY(" + dy.toFixed(1) + "px) rotate(" + (-12 + rot * 0.4).toFixed(1) + "deg)";
    hud.item.style.transform = "translateY(" + dy.toFixed(1) + "px) rotate(" + rot.toFixed(1) + "deg)";
    hud.paws.style.opacity = s.c.asleep ? 0.2 : 1;
  }

  /* ---------------- desktop and phone controls ---------------- */
  var lockHinted = false;
  var lockAt = 0, blurAt = 0, selfUnlockAt = 0;
  function locked() { return typeof document !== "undefined" && !!document.pointerLockElement; }
  function canvasEl() { return document.getElementById("view"); }
  function bind() {
    var cv = canvasEl(), drag = null, stick = null, lookP = null;
    var h = {
      keydown: function (e) {
        var s = S(); if (!s) return;
        var k = e.key.toLowerCase();
        if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
        if (k === "backspace") k = "escape"; // esc also leaves fullscreen, so backspace backs out too
        if (k === "escape") { e.preventDefault(); if (bag) closeBag(); else if (s.ghost) P().cancelBuild(); else if (!s.dead) P().leave(); return; }
        if (s.dead) return;
        if (k === "tab" || k === "i" || k === "c") { e.preventDefault(); HUD.openBag(); return; }
        if (k === "b") { e.preventDefault(); HUD.openBag("build"); return; }
        if (bag) return;
        keys[k] = true;
        if (k >= "1" && k <= "9") { P().select(+k - 1); return; }
        if (k === " ") { P().input.jump = true; e.preventDefault(); }
        else if (k === "e" || k === "enter") P().act("ctx");
        else if (k === "f") P().act("pick");
        else if (k === "q") P().drop(e.shiftKey || e.ctrlKey);
        else if (k === "r") { if (s.ghost) P().rotateGhost(); }
        else if (k === "z") P().sleep();
        else if (k === "g") P().sniff();
        if (k.indexOf("arrow") === 0) e.preventDefault();
      },
      keyup: function (e) { keys[e.key.toLowerCase()] = false; },
      blur: function () { keys = {}; P().input.use = false; blurAt = performance.now(); },
      down: function (e) {
        var s = S();
        if (!s || s.dead || bag || e.pointerType !== "mouse") return;
        if (!locked() && cv.requestPointerLock && !P().noLock) { try { var pr = cv.requestPointerLock(); if (pr && pr.catch) pr.catch(function () { if (h.lockErr) h.lockErr(); }); } catch (er) { if (h.lockErr) h.lockErr(); } }
        if (locked()) { press(e.button); return; }
        if (P().noLock && e.button === 0) { drag = { x: e.clientX, y: e.clientY, moved: 0, b: 0 }; return; }
        drag = { x: e.clientX, y: e.clientY, moved: 0, b: e.button };
      },
      move: function (e) {
        var s = S(); if (!s || bag) return;
        if (locked()) {
          var mx = e.movementX || 0, my = e.movementY || 0;
          if (performance.now() - lockAt < 120) return; // the lock's first jump (K-0025). big moves are real (K-0027: look didn't steer)
          s.mdx = (s.mdx || 0) + mx; s.mdy = (s.mdy || 0) + my; return;
        }
        if (drag) { var dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy); P().look2(dx * 1.4, dy * 1.4); }
      },
      up: function (e) {
        P().input.use = false;
        if (drag && drag.moved < 6) {
          var fx = e.clientX / window.innerWidth - 0.5, fy = e.clientY / window.innerHeight;
          if (SB.TEST && drag.b === 0 && (Math.abs(fx) > 0.06 || Math.abs(fy - 0.5) > 0.08)) P().walkToward(fx, fy); // ?cctest=1: a click on the crosshair uses, anywhere else walks there (K-0039)
          else press(drag.b, true);
        }
        drag = null;
        void e;
      },
      wheel: function (e) { if (!S() || bag) return; e.preventDefault(); P().scroll(e.deltaY); },
      ctx: function (e) { if (S()) e.preventDefault(); },
      stickDown: function (e) { e.preventDefault(); stick = { id: e.pointerId, x: e.clientX, y: e.clientY }; var r = hud.stickZone.getBoundingClientRect(); hud.stick.style.left = (e.clientX - r.left) + "px"; hud.stick.style.top = (e.clientY - r.top) + "px"; try { hud.stickZone.setPointerCapture(e.pointerId); } catch (er) {} },
      stickMove: function (e) {
        if (!stick || e.pointerId !== stick.id) return;
        var dx = e.clientX - stick.x, dy = e.clientY - stick.y, d = Math.hypot(dx, dy), mx = 44;
        P().input.run = d > mx * 1.5;
        if (d > mx) { dx *= mx / d; dy *= mx / d; }
        hud.knob.style.transform = "translate(" + dx + "px," + dy + "px)";
        P().input.side = dx / mx; P().input.fwd = -dy / mx;
      },
      stickUp: function (e) { if (!stick || e.pointerId !== stick.id) return; stick = null; hud.knob.style.transform = ""; P().input.side = P().input.fwd = 0; P().input.run = false; },
      lookDown: function (e) { e.preventDefault(); lookP = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 }; try { hud.lookZone.setPointerCapture(e.pointerId); } catch (er) {} },
      lookMove: function (e) { if (!lookP || e.pointerId !== lookP.id) return; var dx = e.clientX - lookP.x, dy = e.clientY - lookP.y; lookP.x = e.clientX; lookP.y = e.clientY; lookP.moved += Math.abs(dx) + Math.abs(dy); P().look2(dx * 1.6, dy * 1.6); },
      lookUp: function (e) { if (!lookP || e.pointerId !== lookP.id) return; if (lookP.moved < 8 && performance.now() - lookP.t < 300) P().act("ctx"); lookP = null; }
    };
    function press(button, click) {
      if (button === 0) { var r = P().act("use"); if (!click) P().input.use = true; return r; }
      else if (button === 2) P().act("place");
      else if (button === 1) P().act("pick");
    }
    // the mouse can't always be locked (some browsers, iframes, a recent Esc): say how to look without it (K-0021)
    h.lockErr = function () { if (S() && !lockHinted) { lockHinted = true; HUD.say("🖱 the mouse couldn't lock here: hold a button and drag to look, or use the arrow keys"); } };
    document.addEventListener("pointerlockerror", h.lockErr);
    h.lockChange = function () {
      lockAt = performance.now();
      if (locked() || lockAt - selfUnlockAt < 400) return;
      setTimeout(function () { // the lock went without us asking: that was Esc (or the window losing focus: then stay)
        var s = S();
        if (!s || s.dead || bag || s.ghost || locked() || performance.now() - blurAt < 500 || (document.hasFocus && !document.hasFocus())) return;
        if (P().active) P().leave();
      }, 90);
    };
    document.addEventListener("pointerlockchange", h.lockChange);
    window.addEventListener("keydown", h.keydown);
    window.addEventListener("keyup", h.keyup);
    window.addEventListener("blur", h.blur);
    if (cv) { cv.addEventListener("pointerdown", h.down); cv.addEventListener("contextmenu", h.ctx); cv.addEventListener("wheel", h.wheel, { passive: false }); }
    document.addEventListener("contextmenu", h.ctx);
    window.addEventListener("pointermove", h.move);
    window.addEventListener("pointerup", h.up);
    hud.stickZone.addEventListener("pointerdown", h.stickDown); hud.stickZone.addEventListener("pointermove", h.stickMove);
    hud.stickZone.addEventListener("pointerup", h.stickUp); hud.stickZone.addEventListener("pointercancel", h.stickUp);
    hud.lookZone.addEventListener("pointerdown", h.lookDown); hud.lookZone.addEventListener("pointermove", h.lookMove);
    hud.lookZone.addEventListener("pointerup", h.lookUp); hud.lookZone.addEventListener("pointercancel", h.lookUp);
    bound = { h: h, cv: cv };
  }
  function unbind() {
    if (!bound) return;
    var h = bound.h, cv = bound.cv;
    document.removeEventListener("pointerlockerror", h.lockErr);
    document.removeEventListener("pointerlockchange", h.lockChange);
    window.removeEventListener("keydown", h.keydown);
    window.removeEventListener("keyup", h.keyup);
    window.removeEventListener("blur", h.blur);
    if (cv) { cv.removeEventListener("pointerdown", h.down); cv.removeEventListener("contextmenu", h.ctx); cv.removeEventListener("wheel", h.wheel); }
    document.removeEventListener("contextmenu", h.ctx);
    window.removeEventListener("pointermove", h.move);
    window.removeEventListener("pointerup", h.up);
    bound = null;
    if (bag) { bag = null; }
  }
  function keyLook(dt) {
    var tx = (keys.arrowright ? 1 : 0) - (keys.arrowleft ? 1 : 0), ty = (keys.arrowdown ? 1 : 0) - (keys.arrowup ? 1 : 0);
    if (tx || ty) { P().look2(tx * 620 * dt, ty * 380 * dt); hud.looked = true; }
  }
  function readKeys() {
    if (!bound) return;
    if (hud.phone && !(keys.w || keys.a || keys.s || keys.d)) return;
    var f = 0, s = 0;
    if (keys.w) f += 1;
    if (keys.s) f -= 1;
    if (keys.a) s -= 1;
    if (keys.d) s += 1;
    P().input.fwd = f; P().input.side = s; P().input.run = !!keys.shift;
  }
})();
