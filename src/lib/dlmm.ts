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
