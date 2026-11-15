// Where the current price sits inside a range vault's earning zone, for the "zona caliente" meter.
export const HOT_ZONE_EDGE = 0.15; // within the outer 15% of the range on either side counts as "near the edge"

export type HotZone = { pct: number; status: "center" | "edge" | "out"; side: "low" | "high" | null };

export function hotZone(bins: { lower: number; upper: number; active: number }): HotZone | null {
  const { lower, upper, active } = bins;
  if (![lower, upper, active].every(Number.isInteger) || upper < lower) return null;
  const width = upper - lower + 1;
  const raw = (active - lower + 0.5) / width;
  const pct = Math.min(100, Math.max(0, raw * 100));
  if (active < lower) return { pct: 0, status: "out", side: "low" };
  if (active > upper) return { pct: 100, status: "out", side: "high" };
  if (raw < HOT_ZONE_EDGE) return { pct, status: "edge", side: "low" };
  if (raw > 1 - HOT_ZONE_EDGE) return { pct, status: "edge", side: "high" };
  return { pct, status: "center", side: null };
}
