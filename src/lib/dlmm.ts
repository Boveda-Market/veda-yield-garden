import { tgCard } from "@/lib/telegram-format";
/** Concentrated-liquidity vault rules shared by server and tests. */

/** Bins on each side of the post-swap price for a new position (69 bins ≈ ±27% at 0.8% steps). */
export const DLMM_HALF_WIDTH = 34;
/** Refundable position account (~0.042) plus token accounts and network costs. */
export const DLMM_MIN_SOL_LAMPORTS = 55_000_000;
/** Deposits whose in-pool swap would move the price more than this (percent, fee included) are refused. */
export const DLMM_MAX_SWAP_IMPACT_PCT = 3;
/** Removal has no on-chain minimum: the exit fee and swap floor use this share of the simulated release. */
export const DLMM_EXIT_MIN_PCT = 98;

/** Whole bins the price moves from `start` to `end` (never negative; buying the token moves it up). */
export function binsMoved(start: number, end: number, binStep: number) {
  if (!(start > 0) || !(end > 0) || !(binStep > 0)) return 0;
  const bins = Math.log(end / start) / Math.log(1 + binStep / 10_000);
  return Number.isFinite(bins) ? Math.max(0, Math.ceil(bins - 1e-9)) : 0;
}

/** Range centred on the expected post-swap active bin. */
export function dlmmRange(activeId: number, moved: number, halfWidth = DLMM_HALF_WIDTH) {
  const center = activeId + moved;
  return { min: center - halfWidth, max: center + halfWidth };
}

/** Percent tolerance for the active bin to drift between quote and execution: expected move plus 3 bins. */
export function dlmmSlippagePct(moved: number, binStep: number) {
  return (moved + 3) * binStep / 100;
}

/** Out-of-range time before a position triggers its one personal alert (Telegram + bell). */
export const RANGE_ALERT_MS = 10 * 60_000;
/** Status-table key for a position's out-of-range tracking. */
export const rangeKey = (position: string) => `range:${position}`;

/** Alert once per out-of-range episode, only after it lasted RANGE_ALERT_MS. */
export function rangeAlertDue(outSince: string | null | undefined, alerted: boolean, now: number) {
  if (!outSince || alerted) return false;
  const t = Date.parse(outSince);
  return Number.isFinite(t) && now - t >= RANGE_ALERT_MS;
}

/**
 * 50/50 rebalance plan: value both sides at the active price (raw Y per raw X) and swap half the
 * excess of the heavier side inside the pool. Tiny imbalances (< 1% of value) skip the swap.
 */
export function rebalanceSwapPlan(x: bigint, y: bigint, price: number): { swapForY: boolean; amountIn: bigint } {
  if (!(price > 0) || !Number.isFinite(price)) return { swapForY: true, amountIn: 0n };
  const xValue = Number(x) * price, yValue = Number(y), total = xValue + yValue;
  if (total <= 0 || Math.abs(xValue - yValue) < total / 100) return { swapForY: true, amountIn: 0n };
  if (xValue > yValue) {
    const inX = BigInt(Math.floor((xValue - yValue) / 2 / price));
    return { swapForY: true, amountIn: inX > x ? x : inX };
  }
  const inY = BigInt(Math.floor((yValue - xValue) / 2));
  return { swapForY: false, amountIn: inY > y ? y : inY };
}

/** Personal alert text when a range position has been out of range for 10 minutes. */
export function rangeAlertText(vaultName: string, above: boolean) {
  return tgCard("🚨", `Tu ${vaultName} dejó de generar ganancias`, [
    `📍 El precio ${above ? "subió por encima" : "bajó por debajo"} de tu rango hace más de 10 minutos.`,
    "🔒 Tu dinero sigue seguro, pero cada minuto fuera de rango son ganancias que no cobras.",
    "",
    "👉 Toca <b>Rebalancear ahora</b>: un toque, una firma y sin comisión de BÓVEDA.",
  ]);
}

/** Deep link that opens the one-tap rebalance sheet for this exact position in Mi Billetera. */
export function rebalanceLink(position: string) {
  return `https://bovedamarket.app/wallet?rebalance=${encodeURIComponent(position)}`;
}
export const rangeAlertButton = (position: string) => ({ text: "🎯 Rebalancear ahora", url: rebalanceLink(position) });

export type RebalanceResult = {
  success: boolean;
  message: string;
  tokenSymbol?: string;
  /** Position value moved into the new centred range (dollars, at the active price). */
  valueUsd?: string;
  feesUsdc?: string;
  feesToken?: string;
  usdcLeft?: string;
  tokenLeft?: string;
  swapped?: "token" | "usdc" | "none";
  prepared?: { transaction: string; expiresAt: number; lastValidBlockHeight: number; wallet: string; position: string };
};
