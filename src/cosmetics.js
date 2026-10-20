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
];
// profile frames (avatar border on /me and /u/): "none" is free, the rest are level unlocks above
export const FRAMES = ["none", ...UNLOCKS.filter((u) => u.kind === "frame").map((u) => u.id)];

export const needLevel = (kind, id) => UNLOCKS.find((u) => u.kind === kind && u.id === id)?.level || 1;
// level needed for a built avatar key's accessory (presets and free accessories: 1)
export const avatarLevel = (a) => needLevel("acc", (/-([a-z]+)$/.exec(typeof a === "string" && a.startsWith("x:") ? a : "") || [])[1]);
export const unlocksBetween = (from, to) => UNLOCKS.filter((u) => u.level > from && u.level <= to);
export const cosmeticsFor = (level) => UNLOCKS.map((u) => ({ ...u, unlocked: level >= u.level }));
