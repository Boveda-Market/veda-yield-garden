import type { PredictAsset, PredictWindow } from "@/lib/predict";

export const WINDOW_SECONDS: Record<PredictWindow, number> = { "5m": 300, "15m": 900, "4h": 14_400 };
/** Polymarket's own names for each round length in its opening-price service. */
export const PRICE_TO_BEAT_VARIANT: Record<PredictWindow, string> = { "5m": "fiveminute", "15m": "fifteen", "4h": "fourhour" };

/** Polymarket event slug of a round, e.g. btc-updown-5m-1794704100. */
export const roundSlug = (asset: PredictAsset, window: PredictWindow, openTime: number) => `${asset.toLowerCase()}-updown-${window}-${openTime}`;
