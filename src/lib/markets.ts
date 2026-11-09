/** Practice-only fast markets (long/short with 500×–1000× leverage). Fictitious credits only; never on-chain. */
export type MarketId = "SOL" | "BTC" | "ETH";
export type Side = "long" | "short";

export const MARKETS: { id: MarketId; name: string }[] = [
  { id: "SOL", name: "SOL" },
  { id: "BTC", name: "Bitcoin" },
  { id: "ETH", name: "Ethereum" },
];

export const MIN_LEVERAGE = 500;
export const MAX_LEVERAGE = 1000;
export const MIN_STAKE = 5;
export const STARTING_CREDITS = 1000;
/** Fraction of the stake lost at which the position is liquidated. */
export const LIQUIDATION_LOSS = 0.98;
/** Fictitious practice fee: free profit up to 10, then 1.25% on the excess. */
export const PROFIT_FEE_FREE = 10;
export const PROFIT_FEE_RATE = 0.0125;

export type TradePosition = { id: string; market: MarketId; side: Side; stake: number; leverage: number; entry: number; openedAt: number };
export type TradeResult = TradePosition & { exit: number; pnl: number; fee: number; payout: number; closedAt: number; liquidated: boolean };
export type MarketsState = { balance: number; positions: TradePosition[]; history: TradeResult[] };

export function pnlOf(p: Pick<TradePosition, "side" | "stake" | "leverage" | "entry">, price: number): number {
  if (!(price > 0) || !(p.entry > 0)) return 0;
  const move = (price - p.entry) / p.entry;
  return p.stake * p.leverage * move * (p.side === "long" ? 1 : -1);
}

export function liquidationPrice(p: Pick<TradePosition, "side" | "leverage" | "entry">): number {
  const move = LIQUIDATION_LOSS / p.leverage;
  return p.side === "long" ? p.entry * (1 - move) : p.entry * (1 + move);
}

/** 0 = safe at entry, 1 = liquidated. */
export function liquidationProximity(p: TradePosition, price: number): number {
  const loss = -pnlOf(p, price) / (p.stake * LIQUIDATION_LOSS);
  return Math.min(1, Math.max(0, loss));
}

export function profitFee(pnl: number): number {
  if (pnl <= PROFIT_FEE_FREE) return 0;
  return Math.round((pnl - PROFIT_FEE_FREE) * PROFIT_FEE_RATE * 1e6) / 1e6;
}

export function settle(p: TradePosition, price: number, now: number): TradeResult {
  const raw = pnlOf(p, price);
  const liquidated = raw <= -p.stake * LIQUIDATION_LOSS;
  const pnl = liquidated ? -p.stake : raw;
  const fee = profitFee(pnl);
  const payout = Math.max(0, p.stake + pnl - fee);
  return { ...p, exit: price, pnl, fee, payout, closedAt: now, liquidated };
}

export function validStake(stake: number, balance: number): boolean {
  return Number.isFinite(stake) && stake >= MIN_STAKE && stake <= balance;
}

export function validLeverage(l: number): boolean {
  return Number.isInteger(l) && l >= MIN_LEVERAGE && l <= MAX_LEVERAGE;
}

export function readMarkets(raw: string | null): MarketsState {
  try {
    const d = raw ? JSON.parse(raw) : null;
    if (d && typeof d.balance === "number" && Array.isArray(d.positions) && Array.isArray(d.history)) return { balance: d.balance, positions: d.positions, history: d.history.slice(0, 50) };
  } catch {}
  return { balance: STARTING_CREDITS, positions: [], history: [] };
}

export async function fetchPrices(): Promise<Record<MarketId, number>> {
  const rows = await Promise.all(MARKETS.map(async (m) => {
    const res = await fetch(`https://api.coinbase.com/v2/prices/${m.id}-USD/spot`, { cache: "no-store" });
    if (!res.ok) return [m.id, NaN] as const;
    const json = (await res.json()) as { data?: { amount?: string } };
    return [m.id, Number(json.data?.amount)] as const;
  }));
  const out = {} as Record<MarketId, number>;
  for (const [id, v] of rows) if (Number.isFinite(v) && v > 0) out[id] = v;
  if (!Object.keys(out).length) throw new Error("price");
  return out;
}
