/** Live Up/Down rounds routed to Jupiter Prediction (Forecast). Jupiter is the market; BÓVEDA never takes the other side. */
export const PREDICT_MIN_USDC = 5;
export const PREDICT_MAX_USDC = 250;
export const PREDICT_SERIES = ["btc"] as const;
export const PREDICT_WINDOWS = ["5m", "15m"] as const;
export type PredictWindow = (typeof PREDICT_WINDOWS)[number];
export type PredictSide = "up" | "down";

export function validPredictAmount(units: bigint) {
  return units >= BigInt(PREDICT_MIN_USDC * 1e6) && units <= BigInt(PREDICT_MAX_USDC * 1e6);
}

/** Polymarket market id as routed through Jupiter Prediction. */
export const MARKET_ID_RE = /^POLY-\d{1,12}$/;

export type LiveRound = { eventId: string; series: string; window: PredictWindow; openTime: number; closeTime: number; up: string; down: string; upPrice: number | null; downPrice: number | null };
export type PredictQuote = { contractsMicro: string; costMicro: string };
export type PredictPosition = { pubkey: string; marketId: string; title: string; side: PredictSide; outcome: string; contractsMicro: string; costMicro: string; valueMicro: string | null; payoutMicro: string; pnlMicro: string | null; closeTime: number | null; status: string; result: string | null };

/** Payout if the side wins: each contract redeems for 1 USDC. */
export const potentialProfit = (q: PredictQuote) => BigInt(q.contractsMicro) - BigInt(q.costMicro);

/** A Yes/No contract inside a Polymarket crypto event. Prices are 0..1 USDC per contract. */
export type PolyOutcome = { marketId: string; title: string; yes: number | null; no: number | null; volume: number };
export type PolyEvent = { eventId: string; title: string; imageUrl: string | null; closeTime: number; volume: number; rules: string; markets: PolyOutcome[] };
