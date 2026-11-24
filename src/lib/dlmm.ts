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

/**
 * Rebalance swap where only the base capital is split 50/50 and every harvested gain ends as dollars:
 * the token side is sized to half the base value, the rest (fees included) stays/turns USDC. One swap, net direction.
 */
export function feesToUsdcSwapPlan(x: bigint, y: bigint, baseX: bigint, baseY: bigint, price: number): { swapForY: boolean; amountIn: bigint } {
  if (!(price > 0) || !Number.isFinite(price)) return { swapForY: true, amountIn: 0n };
  const targetXValue = (Number(baseX) * price + Number(baseY)) / 2, xValue = Number(x) * price, total = xValue + Number(y);
  if (total <= 0 || Math.abs(xValue - targetXValue) < total / 100) return { swapForY: true, amountIn: 0n };
  if (xValue > targetXValue) {
    const inX = BigInt(Math.floor((xValue - targetXValue) / price));
    return { swapForY: true, amountIn: inX > x ? x : inX };
  }
  const inY = BigInt(Math.floor(targetXValue - xValue));
  return { swapForY: false, amountIn: inY > y ? y : inY };
}

/**
 * Price rose above the range: the base capital still re-centres 50/50, but every harvested gain ends as the vault token
 * (USDC side sized to half the base value, the rest buys token in-pool). One swap, net direction.
 */
export function feesToTokenSwapPlan(x: bigint, y: bigint, baseX: bigint, baseY: bigint, price: number): { swapForY: boolean; amountIn: bigint } {
  if (!(price > 0) || !Number.isFinite(price)) return { swapForY: true, amountIn: 0n };
  const targetY = (Number(baseX) * price + Number(baseY)) / 2, yValue = Number(y), total = Number(x) * price + yValue;
  if (total <= 0 || Math.abs(yValue - targetY) < total / 100) return { swapForY: true, amountIn: 0n };
  if (yValue > targetY) {
    const inY = BigInt(Math.floor(yValue - targetY));
    return { swapForY: false, amountIn: inY > y ? y : inY };
  }
  const inX = BigInt(Math.floor((targetY - yValue) / price));
  return { swapForY: true, amountIn: inX > x ? x : inX };
}

/** Downward exit: one sale includes ALL fee tokens; only conservative principal is re-deposited. */
export function fallingRebalancePlan(baseX: bigint, baseY: bigint, gainsX: bigint, price: number) {
  if (!(price > 0) || !Number.isFinite(price) || baseX < 0n || baseY < 0n || gainsX < 0n) throw new Error("Invalid falling rebalance amounts");
  const safeX = baseX * 995n / 1000n, safeY = baseY * 995n / 1000n;
  // Below the entire range, principal is token-heavy. Fail closed if a stale read says otherwise.
  if (Number(safeX) * price < Number(safeY)) throw new Error("Falling position is not token-heavy");
  const targetX = BigInt(Math.floor((Number(safeX) * price + Number(safeY)) / 2 / price));
  const soldBaseX = safeX - targetX;
  return { swapForY: true as const, amountIn: soldBaseX + gainsX, soldBaseX, gainsX, depositX: targetX, baseY: safeY };
}

/** Allocate the protected sale proceeds proportionally, keeping earnings OUT of the new position. */
export function fallingRebalanceAllocation(plan: ReturnType<typeof fallingRebalancePlan>, outMin: bigint, netFeeY: bigint) {
  if (outMin < 0n || netFeeY < 0n) throw new Error("Invalid falling rebalance proceeds");
  const gainProceeds = plan.amountIn > 0n ? outMin * plan.gainsX / plan.amountIn : 0n;
  return { depositX: plan.depositX * 99n / 100n, depositY: (plan.baseY + outMin - gainProceeds) * 99n / 100n, gainsKept: netFeeY + gainProceeds };
}

/** Personal alert text when a range position has been out of range for 10 minutes. */
export function rangeAlertText(vaultName: string, above: boolean) {
  return tgCard("🚨", `Tu ${vaultName} dejó de generar ganancias`, [
    `📍 El precio ${above ? "subió por encima" : "bajó por debajo"} de tu rango hace más de 10 minutos.`,
    "🔒 Tu dinero sigue seguro, pero cada minuto fuera de rango son ganancias que no cobras.",
    "",
    "👉 Toca <b>Rebalancear ahora</b> para volver a generar.",
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
  /** Bóveda Market fee (tiered, on the claimed USDC only), dollars. */
  bovedaFeeUsdc?: string;
  /** Earnings (both tokens, after Bóveda Market's fee) folded into the new range, in dollars at the active price. */
  gainsAddedUsd?: string;
  /** Protected net earnings delivered as available USDC on a downward range exit. */
  gainsKeptUsd?: string;
  prepared?: { transaction: string; expiresAt: number; lastValidBlockHeight: number; wallet: string; position: string };
};
