/** Estimated USD value of token + USDC amounts. Returns null when any input is unavailable. */
export function estimateUsd(token: string | null, usdc: string | null, price: number | null): number | null {
  if (token === null || usdc === null || price === null) return null;
  const t = Number(token), u = Number(usdc);
  if (!Number.isFinite(t) || !Number.isFinite(u) || t < 0 || u < 0 || !(price > 0)) return null;
  return t * price + u;
}

export function formatUsd(value: number): string {
  if (value > 0 && value < 0.01) return "<$0.01";
  return `$${value.toFixed(2)}`;
}

/** Dollar move in the last 24 h of a vault's coin part: today's coin value minus its value at yesterday's price. Dollars in the vault never move. */
export function change24hUsd(token: string | null, price: number | null, changePct: number | null): number | null {
  if (token === null || price === null || changePct === null || !(price > 0) || changePct <= -100) return null;
  const t = Number(token); if (!Number.isFinite(t) || t < 0) return null;
  const now = t * price;
  return now - now / (1 + changePct / 100);
}

/** Dollar move of a vault's coin part since a past price: coin amount × (price now − price then). */
export function changeSinceUsd(token: string | null, price: number | null, then: number | null): number | null {
  if (token === null || price === null || then === null || !(price > 0) || !(then > 0)) return null;
  const t = Number(token); if (!Number.isFinite(t) || t < 0) return null;
  return t * (price - then);
}

/** Daily candle timestamps mark the opening, not the closing. Use only a
 * completed close at/before the requested cutoff, within one day's precision.
 * Never substitute a younger pool's first candle for missing 7/30-day history.
 * This reprices current holdings; it is not personal historical profit. */
export function changeOverDaysUsd(
  token: string | null,
  price: number | null,
  candles: readonly { t: number; c: number }[] | undefined,
  days: 7 | 30,
  now: number,
): number | null {
  const dayMs = 86_400_000;
  const cutoff = now - days * dayMs;
  if (!Number.isFinite(cutoff)) return null;
  let past: { closedAt: number; price: number } | undefined;
  for (const candle of candles ?? []) {
    const closedAt = candle.t + dayMs;
    if (!Number.isFinite(closedAt) || !Number.isFinite(candle.c) || candle.c <= 0) continue;
    if (closedAt <= cutoff && cutoff - closedAt < dayMs && (!past || closedAt > past.closedAt)) {
      past = { closedAt, price: candle.c };
    }
  }
  return changeSinceUsd(token, price, past?.price ?? null);
}
