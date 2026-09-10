/** One-off boost packs. Amounts are in pence and credits never expire. */
export const BOOST_PACKAGES = {
  SINGLE: { credits: 1, amount: 500, label: "1 boost", shortLabel: "Single" },
  THREE: { credits: 3, amount: 1000, label: "3 boosts", shortLabel: "Popular" },
  TEN: { credits: 10, amount: 3000, label: "10 boosts", shortLabel: "Best value" },
} as const;

export type BoostPack = keyof typeof BOOST_PACKAGES;

export const BOOST_DURATION_MS = 24 * 60 * 60 * 1000;
export const BOOST_PRIORITY_MS = 3 * 60 * 60 * 1000;
export const BOOST_SLOTS = 3;

type BoostedItem = {
  id: string;
  boostStartsAt: Date | null;
  boostPriorityUntil: Date | null;
  boostedUntil: Date | null;
};

/**
 * New boosts lead for their first three hours. After that, active boosts move
 * through the visible positions once an hour so the same provider cannot own
 * the first slot all day.
 */
export function rankBoosted<T extends BoostedItem>(items: T[], now = new Date()): T[] {
  const active = items.filter(
    (item) => item.boostStartsAt && item.boostStartsAt <= now && item.boostedUntil && item.boostedUntil > now,
  );
  const priority = active
    .filter((item) => item.boostPriorityUntil && item.boostPriorityUntil > now)
    .sort((a, b) => (b.boostStartsAt?.getTime() ?? 0) - (a.boostStartsAt?.getTime() ?? 0));
  const standard = active
    .filter((item) => !item.boostPriorityUntil || item.boostPriorityUntil <= now)
    .sort((a, b) => (a.boostStartsAt?.getTime() ?? 0) - (b.boostStartsAt?.getTime() ?? 0));
  return [...priority, ...rotateHourly(standard, now)];
}

/** Stable hourly rotation for equal paid placements. */
export function rotateHourly<T>(items: T[], now = new Date()): T[] {
  if (items.length < 2) return items;
  const offset = Math.floor(now.getTime() / (60 * 60 * 1000)) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

export function isBoostPack(value: string | undefined): value is BoostPack {
  return !!value && value in BOOST_PACKAGES;
}
