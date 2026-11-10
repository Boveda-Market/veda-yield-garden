/** Live Up/Down crypto rounds (Polymarket, routed through Jupiter Prediction). BÓVEDA never takes the other side. */
export const PREDICT_MIN_USDC = 5;
export const PREDICT_MAX_USDC = 250;
export const PREDICT_ASSETS = ["BTC", "ETH", "SOL"] as const;
export type PredictAsset = (typeof PREDICT_ASSETS)[number];
export const PREDICT_WINDOWS = ["5m", "15m", "1h"] as const;
export type PredictWindow = (typeof PREDICT_WINDOWS)[number];
export type PredictSide = "up" | "down";

/** Provider tags that map to each supported window. */
export const WINDOW_TAGS: Record<PredictWindow, readonly string[]> = { "5m": ["5m"], "15m": ["15m"], "1h": ["1h", "60m", "hourly"] };

export function validPredictAmount(units: bigint) {
  return units >= BigInt(PREDICT_MIN_USDC * 1e6) && units <= BigInt(PREDICT_MAX_USDC * 1e6);
}

/** Only BTC/ETH/SOL Up or Down titles are accepted. */
export function assetOfTitle(title: string): PredictAsset | null {
  const m = /^(Bitcoin|Ethereum|Solana) Up or Down\b/i.exec(title.trim());
  if (!m) return null;
  return ({ bitcoin: "BTC", ethereum: "ETH", solana: "SOL" } as const)[m[1]!.toLowerCase() as "bitcoin" | "ethereum" | "solana"];
}

export function windowOfTags(tags: readonly string[]): PredictWindow | null {
  return PREDICT_WINDOWS.find((w) => WINDOW_TAGS[w].some((t) => tags.includes(t))) ?? null;
}

/** Polymarket market id as routed through Jupiter Prediction. */
export const MARKET_ID_RE = /^POLY-\d{1,12}(-\d{1,3})?$/;

export type LiveRound = { eventId: string; asset: PredictAsset; window: PredictWindow; openTime: number; closeTime: number; marketId: string; downMarketId: string; upPrice: number | null; downPrice: number | null; volume: number };
export type PredictQuote = { contractsMicro: string; costMicro: string };
export type PredictPosition = { pubkey: string; marketId: string; title: string; side: PredictSide; outcome: string; contractsMicro: string; costMicro: string; valueMicro: string | null; payoutMicro: string; pnlMicro: string | null; closeTime: number | null; status: string; result: string | null };

/** Payout if the side wins: each contract redeems for 1 USDC. */
export const potentialProfit = (q: PredictQuote) => BigInt(q.contractsMicro) - BigInt(q.costMicro);
