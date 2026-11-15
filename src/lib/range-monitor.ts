import { rangeAlertDue, rangeAlertText, rangeKey } from "@/lib/dlmm";
import type { ChainPosition } from "@/lib/solana-data";

type Row = { service: string; first_down_at: string | null; operator_alerted: boolean };
export type RangeStore = { save: (row: Row & { public_alerted: false; updated_at: string }) => Promise<unknown>; clear: (service: string) => Promise<unknown> };

/**
 * One pass of the out-of-range monitor for a linked user: start the clock when a range position leaves
 * its range, send one alert after 10 min, and clear the record when it is back in range (or rebalanced).
 */
export async function trackRangePositions(opts: { privyUserId: string; positions: ChainPosition[]; rows: Map<string, Row>; now: number; store: RangeStore; alert: (privyUserId: string, html: string) => Promise<unknown>; vaultName: (id: string) => string }) {
  let sent = 0;
  for (const p of opts.positions) {
    const k = rangeKey(p.address), prev = opts.rows.get(k);
    if (!p.outOfRange) { if (prev) await opts.store.clear(k); continue; }
    const since = prev?.first_down_at ?? new Date(opts.now).toISOString();
    let alerted = !!prev?.operator_alerted;
    if (rangeAlertDue(since, alerted, opts.now)) {
      await opts.alert(opts.privyUserId, rangeAlertText(opts.vaultName(p.vaultId), p.priceAbove === true));
      alerted = true; sent++;
    }
    if (!prev || alerted !== !!prev.operator_alerted) await opts.store.save({ service: k, first_down_at: since, operator_alerted: alerted, public_alerted: false, updated_at: new Date(opts.now).toISOString() });
  }
  return sent;
}
