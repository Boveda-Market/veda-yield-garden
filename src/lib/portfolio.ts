import { z } from "zod";
import type { TrialActivity } from "./trial-activity";

export type BalancePoint = { at: number; balance: number };
const pointsSchema = z.array(z.object({ at: z.number().finite().nonnegative(), balance: z.number().finite().nonnegative() })).max(1000);
export function readBalancePoints(raw: string | null): BalancePoint[] {
  try { const parsed = pointsSchema.safeParse(raw ? JSON.parse(raw) : []); return parsed.success ? parsed.data : []; } catch { return []; }
}
export const portfolioHistoryKey = (identity: string) => `boveda-portfolio-balance:${identity}`;
export function recordBalance(points: BalancePoint[], point: BalancePoint) {
  const last = points.at(-1);
  // One observation per minute; never reconstruct data before tracking began.
  return (last && Math.floor(last.at / 60000) === Math.floor(point.at / 60000) ? [...points.slice(0, -1), point] : [...points, point]).slice(-1000);
}
export function trialPortfolioMetrics(wallet: number, invested: number, pending: number, rows: TrialActivity[]) {
  const units = (value: number) => Math.round(value * 1000000);
  const balance = (units(wallet) + units(invested) + units(pending)) / 1000000;
  const pnl = (units(balance) - 1000000000) / 1000000;
  return { balance, pnl, pnlPercent: pnl / 1000 * 100,
    volume: rows.filter((row) => row.kind === "deposit").reduce((sum, row) => sum + units(row.gross), 0) / 1000000,
    fees: rows.reduce((sum, row) => sum + units(row.fee), 0) / 1000000 };
}
export type PortfolioPeriod = "7d" | "30d" | "all";
export function periodStart(period: PortfolioPeriod, now: number) { return period === "all" ? 0 : now - (period === "7d" ? 7 : 30) * 86400000; }