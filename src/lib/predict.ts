/** Live Up/Down rounds routed to Jupiter Prediction (Forecast). Jupiter is the market; BÓVEDA never takes the other side. */
export const PREDICT_MIN_USDC = 5;
export const PREDICT_MAX_USDC = 250;
export const PREDICT_SERIES = ["btc"] as const;
export const PREDICT_WINDOWS = ["5m", "15m", "1h", "4h", "1d"] as const;
export type PredictWindow = (typeof PREDICT_WINDOWS)[number];
export type PredictSide = "up" | "down";

export function validPredictAmount(units: bigint) {
  return units >= BigInt(PREDICT_MIN_USDC * 1e6) && units <= BigInt(PREDICT_MAX_USDC * 1e6);
}

/** Exact Forecast market id: BISON-<base58 pda>-UP|DOWN. */
export const MARKET_ID_RE = /^BISON-[1-9A-HJ-NP-Za-km-z]{32,44}-(UP|DOWN)$/;

export type LiveRound = { eventId: string; series: string; window: PredictWindow; openTime: number; closeTime: number; up: string; down: string };
export type PredictQuote = { contractsMicro: string; costMicro: string };
export type PredictPosition = { pubkey: string; marketId: string; title: string; side: PredictSide; contractsMicro: string; costMicro: string; valueMicro: string | null; payoutMicro: string; pnlMicro: string | null; closeTime: number | null; status: string; result: string | null };

/** Payout if the side wins: each contract redeems for 1 USDC. */
export const potentialProfit = (q: PredictQuote) => BigInt(q.contractsMicro) - BigInt(q.costMicro);
