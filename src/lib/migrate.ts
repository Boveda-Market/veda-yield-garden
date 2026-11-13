/** Minimum APR advantage (percentage points) before suggesting a move to another vault. */
export const MIGRATE_MIN_GAIN = 5;
/** Moving between vaults is free of BÓVEDA fees (exit and entry). */
export const MIGRATE_FEE_PCT = 0;

/** Best other vault whose estimated APR beats the current one by at least MIGRATE_MIN_GAIN points. */
export function bestUpgrade(currentId: string, aprs: Record<string, number | null | undefined>) {
  const current = aprs[currentId];
  if (current == null || !Number.isFinite(current)) return null;
  let best: { id: string; apr: number; gain: number } | null = null;
  for (const [id, apr] of Object.entries(aprs)) {
    if (id === currentId || apr == null || !Number.isFinite(apr)) continue;
    const gain = apr - current;
    if (gain >= MIGRATE_MIN_GAIN && (!best || gain > best.gain)) best = { id, apr, gain };
  }
  return best;
}

/** Days for the extra simple APR to recover the moving fees. */
export function breakEvenDays(gain: number) {
  return gain > 0 ? Math.ceil((MIGRATE_FEE_PCT / gain) * 365) : null; // 0 = earns more from day one
}

/** Public channel posts about a free-move opportunity at most once per cooldown. */
export const GAP_ALERT_COOLDOWN_MS = 24 * 3600_000;
export function gapAlertDue(lastPostIso: string | null | undefined, now: number) {
  return !lastPostIso || now - Date.parse(lastPostIso) >= GAP_ALERT_COOLDOWN_MS;
}
