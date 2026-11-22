/** Live Up/Down crypto rounds (Polymarket, routed through Jupiter Prediction). Bóveda Market never takes the other side. */
export const PREDICT_MIN_USDC = 5;
export const PREDICT_MAX_USDC = 250;
export const PREDICT_ASSETS = ["BTC", "ETH", "SOL"] as const;
export type PredictAsset = (typeof PREDICT_ASSETS)[number];
export const PREDICT_WINDOWS = ["5m", "15m", "4h"] as const;
export type PredictWindow = (typeof PREDICT_WINDOWS)[number];
export type PredictSide = "up" | "down";

/** Round length in seconds for each supported window. */
export const WINDOW_SECONDS: Record<PredictWindow, number> = { "5m": 300, "15m": 900, "4h": 14400 };

/** Provider tags that map to each supported window. 4 h rounds usually arrive untagged. */
export const WINDOW_TAGS: Record<PredictWindow, readonly string[]> = { "5m": ["5m"], "15m": ["15m"], "4h": ["4h"] };

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

/** Polymarket Up/Down slugs carry the window: "btc-updown-4h-1794603600". */
export function windowOfSlug(slug: string): PredictWindow | null {
  return PREDICT_WINDOWS.find((w) => slug.includes(`updown-${w}`)) ?? null;
}

/** Fallback for untagged rounds: match the exact round length. */
export function windowOfDuration(seconds: number): PredictWindow | null {
  return PREDICT_WINDOWS.find((w) => WINDOW_SECONDS[w] === seconds) ?? null;
}

/** Polymarket market id as routed through Jupiter Prediction. */
export const MARKET_ID_RE = /^POLY-\d{1,12}(-\d{1,3})?$/;

export type LiveRound = { eventId: string; asset: PredictAsset; window: PredictWindow; openTime: number; closeTime: number; marketId: string; downMarketId: string; upPrice: number | null; downPrice: number | null; volume: number };
export type PredictQuote = { contractsMicro: string; costMicro: string };
export type PredictPosition = { pubkey: string; marketId: string; title: string; side: PredictSide; outcome: string; contractsMicro: string; costMicro: string; valueMicro: string | null; payoutMicro: string; pnlMicro: string | null; closeTime: number | null; status: string; result: string | null; isYes?: boolean; eventId?: string | undefined };

/** Payout if the side wins: each contract redeems for 1 USDC. */
/**
 * What an early close really pays: walk the bids for our side (price in cents, size in contracts) from best down
 * until every contract is sold, minus the venue fee. Null when the bids cannot absorb the whole position.
 */
export function sellEstimate(bids: [number, number][], contractsMicro: bigint, feeMicro: bigint): bigint | null {
  let left = contractsMicro, gross = 0n;
  for (const [cents, size] of [...bids].sort((a, b) => b[0] - a[0])) {
    if (left <= 0n) break;
    if (!(cents > 0 && cents < 100) || !(size > 0)) continue;
    const take = BigInt(Math.floor(size * 1e6)) < left ? BigInt(Math.floor(size * 1e6)) : left;
    gross += take * BigInt(Math.round(cents)) / 100n;
    left -= take;
  }
  if (left > 0n) return null;
  return gross > feeMicro ? gross - feeMicro : 0n;
}

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

/** Parse one resolved Polymarket Up/Down event; null unless BTC/ETH/SOL 5m/15m/4h with a definitive winner. */
export function parsePastRound(e: { slug?: string; title?: string; endDate?: string; markets?: { outcomes?: string; outcomePrices?: string }[] }): PastRound | null {
  const title = e.title ?? "", slug = e.slug ?? "";
  const asset = assetOfTitle(title); if (!asset || !/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  const window = windowOfSlug(slug);
  if (!window) return null;
  try {
    const outs = JSON.parse(e.markets?.[0]?.outcomes ?? "[]") as string[], px = JSON.parse(e.markets?.[0]?.outcomePrices ?? "[]") as string[];
    const i = px.findIndex((v) => Number(v) === 1); const o = outs[i]?.toLowerCase();
    if (o !== "up" && o !== "down") return null;
    const endTime = Math.floor(Date.parse(e.endDate ?? "") / 1000); if (!Number.isFinite(endTime)) return null;
    return { slug, title, asset, window, endTime, winner: o };
  } catch { return null; }
}

export type RoundOdds = { up: number | null; down: number | null };

/** Live market odds (same prices as the Sube/Baja buttons) for the round a position belongs to; each side is its own market. */
export function positionOdds(rounds: readonly LiveRound[], p: Pick<PredictPosition, "marketId" | "contractsMicro" | "valueMicro" | "side">): RoundOdds | undefined {
  const r = rounds.find((x) => x.marketId === p.marketId || x.downMarketId === p.marketId);
  if (r && r.upPrice && r.downPrice) return { up: r.upPrice, down: r.downPrice };
  // Round not listed (yet): the position's own sell value is still a market price for its side.
  const c = Number(p.contractsMicro), v = p.valueMicro === null ? NaN : Number(p.valueMicro);
  if (!(c > 0) || !Number.isFinite(v)) return undefined;
  const mine = Math.max(0.01, Math.min(0.99, v / c));
  return p.side === "up" ? { up: mine, down: 1 - mine } : { up: 1 - mine, down: mine };
}

/** Whether the position's side leads, decided only by the market odds (never by exchange spot vs our strike). */
export function positionLeading(side: PredictSide, odds: RoundOdds | undefined): boolean | null {
  if (!odds?.up || !odds.down) return null;
  return side === "up" ? odds.up >= odds.down : odds.down > odds.up;
}
