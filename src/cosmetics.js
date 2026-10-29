// Cosmetics unlocked by level. Earned by playing only; everything that existed before stays free.
// The server is the authority (avatar and theme saves check the level); the client just greys out locked ones.
export const UNLOCKS = [
  { kind: "frame", id: "pixel", name: "pixel frame", level: 2 },
  { kind: "acc", id: "antenna", name: "antenna", level: 3 },
  { kind: "theme", id: "mint", name: "mint profile color", level: 4 },
  { kind: "acc", id: "crown", name: "crown", level: 5 },
  { kind: "theme", id: "pink", name: "pink profile color", level: 6 },
  { kind: "frame", id: "neon", name: "neon frame", level: 7 },
  { kind: "acc", id: "halo", name: "halo", level: 8 },
  { kind: "frame", id: "circuit", name: "circuit frame", level: 9 },
  { kind: "theme", id: "gold", name: "gold profile color", level: 10 },
  { kind: "acc", id: "flames", name: "on fire", level: 12 },
  { kind: "frame", id: "molten", name: "molten frame", level: 14 },
  { kind: "theme", id: "chrome", name: "chrome profile color", level: 16 },
  { kind: "frame", id: "holo", name: "holo frame", level: 18 },
  { kind: "acc", id: "chef", name: "chef hat", level: 20 },
  { kind: "frame", id: "golden", name: "golden frame", level: 25 },
  // K-0030 step 4: more face parts, so something new unlocks every level or two (beanie and shades are free)
  { kind: "mood", id: "smug", name: "smug face", level: 2 },
  { kind: "face", id: "8", name: "lime screen", level: 3 },
  { kind: "acc", id: "party", name: "party hat", level: 4 },
  { kind: "mood", id: "wink", name: "wink", level: 5 },
  { kind: "body", id: "6", name: "graphite case", level: 6 },
  { kind: "acc", id: "bandana", name: "bandana", level: 7 },
  { kind: "face", id: "9", name: "beige screen", level: 9 },
  { kind: "mood", id: "shock", name: "shocked face", level: 10 },
  { kind: "acc", id: "tophat", name: "top hat", level: 11 },
  { kind: "body", id: "5", name: "walnut case", level: 13 },
  { kind: "acc", id: "horns", name: "horns", level: 15 },
  { kind: "face", id: "10", name: "alarm red screen", level: 17 },
  { kind: "acc", id: "visor", name: "visor", level: 19 },
  { kind: "mood", id: "sleepy", name: "sleepy face", level: 22 },
  { kind: "face", id: "11", name: "sky screen", level: 23 },
  { kind: "acc", id: "wizard", name: "wizard hat", level: 30 },
  // K-0030 step 6: every level from 2 to 30 now unlocks something
  { kind: "theme", id: "sunset", name: "sunset profile color", level: 21 },
  { kind: "theme", id: "grape", name: "grape profile color", level: 24 },
  { kind: "theme", id: "aqua", name: "aqua profile color", level: 26 },
  { kind: "theme", id: "rose", name: "rose profile color", level: 27 },
  { kind: "theme", id: "lemon", name: "lemon profile color", level: 28 },
  { kind: "theme", id: "ember", name: "ember profile color", level: 29 },
].sort((a, b) => a.level - b.level);
// profile frames (avatar border on /me and /u/): "none" is free, the rest are level unlocks above
export const FRAMES = ["none", ...UNLOCKS.filter((u) => u.kind === "frame").map((u) => u.id)];

export const needLevel = (kind, id) => UNLOCKS.find((u) => u.kind === kind && u.id === id)?.level || 1;
// level needed for a built avatar key's accessory (presets and free accessories: 1)
export const avatarLevel = (a) => {
  const m = /^x:([a-z]+)-(\d+)-(\d+)-([a-z]+)$/.exec(typeof a === "string" ? a : "");
  return m ? Math.max(needLevel("mood", m[1]), needLevel("face", m[2]), needLevel("body", m[3]), needLevel("acc", m[4])) : 1;
};
export const unlocksBetween = (from, to) => UNLOCKS.filter((u) => u.level > from && u.level <= to);
export const cosmeticsFor = (level) => UNLOCKS.map((u) => ({ ...u, unlocked: level >= u.level }));
