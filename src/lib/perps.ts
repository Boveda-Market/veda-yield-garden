import { progressiveFee } from "@/lib/fees";

/** Live up/down positions routed to Jupiter Perps: the JLP pool is the counterparty, never BÓVEDA. */
export const PERP_MARKETS = {
  SOL: "So11111111111111111111111111111111111111112",
  ETH: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
  BTC: "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
} as const;
export type PerpAsset = keyof typeof PERP_MARKETS;
export type PerpSide = "long" | "short";

/** Pilot limits in USDC; leverage kept moderate so a small move does not liquidate instantly. */
export const PERP_MIN_USDC = 10;
export const PERP_MAX_USDC = 100;
export const PERP_MIN_LEVERAGE = 2;
export const PERP_MAX_LEVERAGE = 50;
export const PERP_SLIPPAGE_BPS = 200;

/** BÓVEDA opening fee in micro-USDC: same progressive rule (free up to 10 USDC, 1.25% on excess). */
export function perpOpenFee(units: bigint) { return progressiveFee(units); }

export function validPerpAmount(units: bigint) {
  return units >= BigInt(PERP_MIN_USDC * 1e6) && units <= BigInt(PERP_MAX_USDC * 1e6);
}
export function validLeverage(l: number) {
  return Number.isFinite(l) && l >= PERP_MIN_LEVERAGE && l <= PERP_MAX_LEVERAGE;
}

/** Shorts keep USDC as collateral; longs use the market asset (Jupiter swaps the USDC input). */
export function collateralMint(asset: PerpAsset, side: PerpSide) {
  return side === "short" ? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" : PERP_MARKETS[asset];
}

export type PerpQuote = { entryPriceUsd: string; liquidationPriceUsd: string; positionSizeUsd: string; positionCollateralSizeUsd: string; openFeeUsd: string; priceImpactFeeUsd: string; leverage: string };
export type PerpPosition = { positionPubkey: string; asset: PerpAsset; side: PerpSide; leverage: string; sizeUsd: string; collateralUsd: string; valueUsd: string; entryPriceUsd: string; markPriceUsd: string; liquidationPriceUsd: string; pnlAfterFeesUsd: string; pnlAfterFeesPct: string; createdTime: number };
