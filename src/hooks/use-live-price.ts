import { useEffect, useState } from "react";
import type { MarketId } from "@/lib/markets";
import { liveSeries, subscribeLivePrices, type Tick } from "@/lib/polymarket-prices";

/** Live ticks for one asset from the shared Polymarket feed (same prices the rounds settle on). */
export function useLiveTicks(market: MarketId | null): Tick[] {
  const [ticks, setTicks] = useState<Tick[]>(() => (market ? liveSeries(market) : []));
  useEffect(() => {
    if (!market) return;
    setTicks(liveSeries(market));
    return subscribeLivePrices(() => setTicks(liveSeries(market)));
  }, [market]);
  return ticks;
}

/** Live price + short tick series for one asset (shared across all cards). */
export function useLivePrice(market: MarketId | null) {
  const ticks = useLiveTicks(market);
  const points = ticks.slice(-300).map((x) => x.v);
  return { points, price: points.at(-1) };
}

/** Latest live price of every asset (for the asset pills). */
export function useLivePrices(): Partial<Record<MarketId, number>> {
  const [p, setP] = useState<Partial<Record<MarketId, number>>>({});
  useEffect(() => subscribeLivePrices(() => {
    const n: Partial<Record<MarketId, number>> = {};
    for (const m of ["BTC", "ETH", "SOL"] as const) { const v = liveSeries(m).at(-1)?.v; if (v) n[m] = v; }
    setP(n);
  }), []);
  return p;
}
