/** Live Up/Down crypto rounds (Polymarket, routed through Jupiter Prediction). BÓVEDA never takes the other side. */
export const PREDICT_MIN_USDC = 5;
export const PREDICT_MAX_USDC = 250;
export const PREDICT_ASSETS = ["BTC", "ETH", "SOL"] as const;
export type PredictAsset = (typeof PREDICT_ASSETS)[number];
export const PREDICT_WINDOWS = ["5m", "15m", "1d"] as const;
export type PredictWindow = (typeof PREDICT_WINDOWS)[number];
export type PredictSide = "up" | "down";

/** Provider tags that map to each supported window. */
export const WINDOW_TAGS: Record<PredictWindow, readonly string[]> = { "5m": ["5m"], "15m": ["15m"], "1d": ["daily", "daily-close"] };

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
export type PredictPosition = { pubkey: string; marketId: string; title: string; side: PredictSide; outcome: string; contractsMicro: string; costMicro: string; valueMicro: string | null; payoutMicro: string; pnlMicro: string | null; closeTime: number | null; status: string; result: string | null; isYes?: boolean; eventId?: string | undefined };

/** Payout if the side wins: each contract redeems for 1 USDC. */
export const potentialProfit = (q: PredictQuote) => BigInt(q.contractsMicro) - BigInt(q.costMicro);

/** Portfolio totals for prediction positions, in integer micro-USDC. Open = still in play; resolved PNL only counts closed positions with a reported PNL. */
export function predictSummary(positions: readonly PredictPosition[]) {
  let atStake = 0n, openValue = 0n, potential = 0n, realized = 0n, open = 0, closed = 0;
  for (const p of positions) {
    if (p.status === "open") { open++; atStake += BigInt(p.costMicro || "0"); openValue += BigInt(p.valueMicro ?? "0"); potential += BigInt(p.payoutMicro || "0"); }
    else { closed++; if (p.pnlMicro) realized += BigInt(p.pnlMicro); }
  }
  return { atStake, openValue, potential, realized, open, closed };
}

/** Average price paid per contract (0–1 USDC), or null when unknown. */
export const pricePerContract = (p: Pick<PredictPosition, "costMicro" | "contractsMicro">) => { const c = Number(p.contractsMicro); return c > 0 ? Number(p.costMicro) / c : null; };

/** Win/loss of a resolved position: each side is bought as YES on its own market, so "yes" means that market won. */
export function positionWon(p: Pick<PredictPosition, "result"> & { isYes?: boolean }): boolean | null {
  const r = p.result?.toLowerCase();
  if (r !== "yes" && r !== "no") return null;
  return (r === "yes") === (p.isYes ?? true);
}

export type PastRound = { slug: string; title: string; asset: PredictAsset; window: PredictWindow; endTime: number; winner: PredictSide };

/** Parse one resolved Polymarket Up/Down event; null unless BTC/ETH/SOL 5m/15m/daily with a definitive winner. */
export function parsePastRound(e: { slug?: string; title?: string; endDate?: string; markets?: { outcomes?: string; outcomePrices?: string }[] }): PastRound | null {
  const title = e.title ?? "", slug = e.slug ?? "";
  const asset = assetOfTitle(title); if (!asset || !/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  const window: PredictWindow | null = slug.includes("updown-5m") ? "5m" : slug.includes("updown-15m") ? "15m" : / Up or Down on /i.test(title) ? "1d" : null;
  if (!window) return null;
  try {
    const outs = JSON.parse(e.markets?.[0]?.outcomes ?? "[]") as string[], px = JSON.parse(e.markets?.[0]?.outcomePrices ?? "[]") as string[];
    const i = px.findIndex((v) => Number(v) === 1); const o = outs[i]?.toLowerCase();
    if (o !== "up" && o !== "down") return null;
    const endTime = Math.floor(Date.parse(e.endDate ?? "") / 1000); if (!Number.isFinite(endTime)) return null;
    return { slug, title, asset, window, endTime, winner: o };
  } catch { return null; }
}
