// "Which games are catching on?" — the test-lab score that decides what gets packaged for the app stores.
// Pure function over one game's row from /api/admin/metrics, so it can be unit-tested and tuned in one place.
//
// Each signal is scaled 0..1 against a "this is a hit" target, then weighted. Signals with too little data
// (a D7 cohort nobody has aged into yet) drop out and the remaining weights are rescaled, so a new game isn't
// punished for being new. Below MIN_PLAYERS real players the verdict is "too early" whatever the score says.

export const MIN_PLAYERS = 20;

// [key, weight, target that counts as full marks, what it measures]
export const SIGNALS = [
  ["d1", 0.25, 0.30, "came back the next day"],
  ["d7", 0.15, 0.12, "came back a week later"],
  ["replay", 0.15, 4, "plays per player"],
  ["share", 0.20, 0.10, "shares (dares sent + game shares) per player"],
  ["session", 0.10, 180, "average seconds per play"],
  ["rating", 0.10, 1, "thumbs up share of ratings"],
  ["outside", 0.05, 0.6, "share of plays from outside the site"],
];

const MIN_COHORT = 10;   // D1/D7 need this many eligible players before they count
const MIN_RATINGS = 5;

function signals(g) {
  const players = g.unique_players || 0;
  const rated = (g.thumbs_up || 0) + (g.thumbs_down || 0);
  const shares = (g.shares && g.shares.total) || 0;
  return {
    d1: g.d1_cohort >= MIN_COHORT ? g.d1_return_rate : null,
    d7: g.d7_cohort >= MIN_COHORT ? g.d7_return_rate : null,
    replay: players ? g.plays / players : null,
    share: players ? shares / players : null,
    session: g.avg_session_seconds,
    rating: rated >= MIN_RATINGS ? g.thumbs_up / rated : null,
    outside: g.plays ? (g.outside_plays || 0) / g.plays : null,
  };
}

export function winnerScore(g) {
  const s = signals(g);
  let wsum = 0, total = 0;
  const parts = {};
  for (const [k, w, target] of SIGNALS) {
    const v = s[k];
    if (v == null || !Number.isFinite(v)) { parts[k] = null; continue; }
    const scaled = Math.max(0, Math.min(1, v / target));
    parts[k] = Math.round(scaled * 100);
    wsum += w; total += w * scaled;
  }
  const score = wsum ? Math.round((total / wsum) * 100) : null;
  const players = g.unique_players || 0;
  let verdict;
  if (players < MIN_PLAYERS || score == null) verdict = "too early";
  else if (score >= 60) verdict = "winner: package it";
  else if (score >= 40) verdict = "promising";
  else verdict = "not catching on";
  // the weakest signal with data: what to fix first
  const weakest = Object.entries(parts).filter(([, v]) => v != null).sort((a, b) => a[1] - b[1])[0];
  return { score, verdict, parts, players_needed: Math.max(0, MIN_PLAYERS - players), weakest: weakest ? weakest[0] : null };
}

// rank: scored games with enough players first (by score), then the too-early ones (by players)
export function rankWinners(rows) {
  return rows
    .map((g) => ({ game: g.game, title: g.title, plays: g.plays, players: g.unique_players, ...winnerScore(g) }))
    .sort((a, b) => {
      const ae = a.verdict === "too early", be = b.verdict === "too early";
      if (ae !== be) return ae ? 1 : -1;
      if (!ae) return (b.score || 0) - (a.score || 0);
      return (b.players || 0) - (a.players || 0);
    });
}
