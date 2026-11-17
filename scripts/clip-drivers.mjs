// How each game is played on camera, shared by scripts/make-clips.mjs (hub card loops) and scripts/portal-assets.mjs
// (portal covers, screenshots and preview videos). Each DRIVE function runs inside the game page.
// Games where random taps and keys make a dull clip get a small in-page player instead (it drives the game through
// its read-only test hook, so the clip shows the game being played well). Everything else gets the random pokes.
export const DRIVE = {
  // round 25: crash plays with the game's own bot (the one the title's attract demo uses), so the run goes on
  "keyboard-escape": () => { const t = () => { const k = window.__ke; if (k && k.screen === "play" && k.p) k.bot(0.02); requestAnimationFrame(t); }; requestAnimationFrame(t); },
  "elevator-full-of-fish": () => setInterval(() => {
    const s = window.__eff && window.__eff.state();
    if (!s || s.state !== "play" || s.door < 0.6 || !s.fish.length) return;
    const f = s.fish[(Math.random() * s.fish.length) | 0];
    document.getElementById("c").dispatchEvent(new PointerEvent("pointerdown", { clientX: f.x, clientY: f.y, bubbles: true }));
  }, 170),
  "sandwich-tower": () => {
    let want = null, last = -1;
    const tick = () => {
      const s = window.__st && window.__st.state();
      if (s && s.state === "play" && s.mover && !s.mover.drop) {
        if (s.layers !== last) { last = s.layers; want = s.top.x + (Math.random() - 0.5) * 16; }
        if (Math.abs(s.mover.x - want) < 10) window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },
  "microwave-panic": () => {
    let target = null, last = -1;
    const key = (type) => window.dispatchEvent(new KeyboardEvent(type, { key: " " }));
    const tick = () => {
      const s = window.__mp && window.__mp.state();
      if (s && s.state === "play") {
        if (s.round !== last) { last = s.round; target = s.cursed ? 0.25 : s.T + (Math.random() - 0.5) * 0.2; }
        if (s.phase === "ready" && s.slide <= 0) key("keydown");
        if (s.phase === "cook" && s.cookT >= target) key("keyup");
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },
  // the colony plays itself: ?shot=1 grows it, hides the chrome and leaves the ants working (K-0058)
  "ant-farm": () => {},
  // smol brains: its title screen is the showcase (a grown town full of smols, the camera drifting over it); a new
  // game opens on the story and a tutorial card instead. So the clip stays on the title (ON_TITLE below) with the
  // title's panels hidden. No taps (one would start the game).
  "smol-brains": () => { const st = document.createElement("style"); st.textContent = ".ts{opacity:0!important;transition:none!important}"; document.head.appendChild(st); },
  // the floppy whose colour has a pixel showing (the game's own hint), never past 3 on the bench, so pixels get shot.
  // Round 25: a level done (its results card is drawn on the canvas, so there's no button to press) loads the next one
  // after 1.5 s, so a 15 s portal preview keeps playing; the 4 s card clips never get that far.
  "pixel-purge": () => { let off = 0; setInterval(() => {
    const p = window.__pp, S = p && p.S;
    if (!S) return;
    if (p.mode !== "play") {
      off += 380;
      if (S.cfg && off > 1500) { off = 0; p.loadLevel(p.levelCfg((S.cfg.lv || 1) + 1)); }
      return;
    }
    off = 0;
    if (S.bench.filter(Boolean).length > 3) return;
    let li = -1;
    for (let q = 0; q < S.lanes.length && li < 0; q++) { const fd = S.lanes[q][0]; if (fd && S.exList.some((id) => S.grid[id] === fd.c)) li = q; }
    p.pickLane(li < 0 ? 0 : li);
  }, 380); },
  // the aurora, a pike on the line and the ice cracking outward in cyan (K-0061)
  // K-0062: the pike fight, reeled in pulses so the line, the fish and the cracking ice visibly move
  "thin-ice": () => { if (!window.__ti) return; window.__ti.clip(); let on = false; setInterval(() => { on = !on; window.__ti.hold(on); }, 380); },
  // a soup check solved on camera (VERIFIED), then the next captcha (solve() works in test mode only)
  "prove-youre-human": () => { const go = () => { const s = window.__pyh && window.__pyh.state(); if (s && s.state === "play") window.__pyh.solve(); }; setTimeout(go, 300); setInterval(go, 2400); },
  // the auto-player takes level 4, joined 14 seconds in so every program is already fighting
  "desktop-takeover": () => { const d = window.__dt; if (d && d.state().state === "play") { d.auto(true); d.skip(14); } },
  // not responding (was level devil.exe, 2.5): level 1 is live with no title screen; hold right and hop every 0.9 s
  // through the game's own key state (window.__ld.keys), so the clip runs into the level's traps instead of standing still
  "level-devil-exe": () => { const k = window.__ld && window.__ld.keys; if (!k) return; k.r = true;
    setInterval(() => { k.j = true; setTimeout(() => { k.j = false; }, 260); }, 900); },
};
// extra wait after load before the clip starts (ms; default 1200): smol brains builds its island first
export const WAIT = { "smol-brains": 7000 };
// games clipped on their own title screen: no autostart flag, no start tap
export const ON_TITLE = new Set(["smol-brains"]);
// extra query for a game's clip run
export const QUERY = { "ant-farm": "&shot=1", "prove-youre-human": "&round=1", "desktop-takeover": "&level=4" };
