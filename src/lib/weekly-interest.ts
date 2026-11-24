
type HarvestLike = { kind: string; at: number | null; usdcRaw: string; tokenRaw?: string; pool?: string };
/** Optional: dollar value (integer micro) of a record's harvested vault-token part, e.g. at today's price. */
export type TokenValue = (r: HarvestLike) => bigint;
export type DayBucket = { key: string; start: number; micro: bigint };

const DAY = 86_400_000;
/** Start of the local day for `t`, given the viewer's UTC offset in minutes (e.g. -240 for Puerto Rico). */
const dayStart = (t: number, offsetMin: number) => { const shifted = t + offsetMin * 60_000; return shifted - (((shifted % DAY) + DAY) % DAY) - offsetMin * 60_000; };

/** Last 7 local days (oldest first, today last) with the dollars harvested each day (USDC part, integer micro). */
export function weeklyInterest(records: readonly HarvestLike[], now: number, offsetMin = 0, tokenValue?: TokenValue): DayBucket[] {
  const today = dayStart(now, offsetMin);
  const days: DayBucket[] = Array.from({ length: 7 }, (_, i) => { const start = today - (6 - i) * DAY; return { key: new Date(start + offsetMin * 60_000).toISOString().slice(0, 10), start, micro: 0n }; });
  for (const r of records) {
    if (r.kind !== "harvest" || !r.at || !/^\d{1,20}$/.test(r.usdcRaw)) continue;
    const idx = Math.floor((r.at - days[0]!.start) / DAY);
    if (idx >= 0 && idx < 7) days[idx]!.micro += BigInt(r.usdcRaw) + (tokenValue ? tokenValue(r) : 0n);
  }
  return days;
}

/** Running total per day (for the «Acumulado» view). */
export const cumulative = (days: readonly DayBucket[]) => { let s = 0n; return days.map((d) => (s += d.micro)); };

export const weekTotalMicro = (days: readonly DayBucket[]) => days.reduce((s, d) => s + d.micro, 0n);

export type CapitalDay = { start: number; capitalMicro: bigint; earnedMicro: bigint };
/** Last `n` local days (oldest first): running capital put into vaults (deposits − withdrawals, never below 0) and running harvested earnings over the window. Loaded records only. */
export function capitalSeries(records: readonly HarvestLike[], now: number, n: number, offsetMin = 0, tokenValue?: TokenValue): CapitalDay[] {
  const today = dayStart(now, offsetMin), first = today - (n - 1) * DAY;
  const val = (r: HarvestLike) => (/^\d{1,20}$/.test(r.usdcRaw) ? BigInt(r.usdcRaw) : 0n) + (tokenValue ? tokenValue(r) : 0n);
  const sorted = records.filter((r) => r.at).slice().sort((a, b) => a.at! - b.at!);
  let cap = 0n, earned = 0n, i = 0;
  const apply = (r: HarvestLike, inWindow: boolean) => {
    if (r.kind === "deposit") cap += val(r);
    else if (r.kind === "withdraw") { cap -= val(r); if (cap < 0n) cap = 0n; }
    else if (r.kind === "close") cap = 0n;
    else if (r.kind === "harvest" && inWindow) earned += val(r);
  };
  while (i < sorted.length && sorted[i]!.at! < first) apply(sorted[i++]!, false);
  return Array.from({ length: n }, (_, d) => {
    const start = first + d * DAY, end = start + DAY;
    while (i < sorted.length && sorted[i]!.at! < end) apply(sorted[i++]!, true);
    return { start, capitalMicro: cap, earnedMicro: earned };
  });
}
