const YEAR_MS = 365 * 24 * 3600 * 1000;

/** Estimated simple earning rate (USD per ms) from position value and simple APR. Never compounded. */
export function earningRatePerMs(valueUsd: number | null, apr: number | null): number {
  if (valueUsd == null || apr == null || !Number.isFinite(valueUsd) || !Number.isFinite(apr) || valueUsd <= 0 || apr <= 0) return 0;
  return valueUsd * (apr / 100) / YEAR_MS;
}

/** Last verified amount plus estimated accrual since it was read. */
export function liveEstimate(base: number, ratePerMs: number, sinceMs: number, nowMs: number): number {
  return Math.max(0, base) + ratePerMs * Math.max(0, nowMs - sinceMs);
}

export function earningPace(ratePerMs: number) {
  return { perHour: ratePerMs * 3600_000, perDay: ratePerMs * 24 * 3600_000 };
}
