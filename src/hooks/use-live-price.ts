import { useEffect, useState } from "react";
import { fetchPrices, type MarketId } from "@/lib/markets";

/** One shared spot-price poller for every live card: a single request per tick, series kept across navigation. */
const series: Partial<Record<MarketId, number[]>> = {};
const subs = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
const TICK_MS = 1_500;

async function tick() {
  if (typeof document !== "undefined" && document.hidden) return;
  try {
    const p = await fetchPrices();
    for (const [k, v] of Object.entries(p) as [MarketId, number][]) series[k] = [...(series[k] ?? []), v].slice(-300);
    subs.forEach((f) => f());
  } catch { /* retry next tick */ }
}

function subscribe(f: () => void) {
  subs.add(f);
  if (!timer) { void tick(); timer = setInterval(tick, TICK_MS); }
  return () => { subs.delete(f); if (subs.size === 0 && timer) { clearInterval(timer); timer = undefined; } };
}

/** Live price + short tick series for one asset (shared across all cards). */
export function useLivePrice(market: MarketId | null) {
  const [points, setPoints] = useState<number[]>(() => (market ? series[market] ?? [] : []));
  useEffect(() => {
    if (!market) return;
    setPoints(series[market] ?? []);
    const onVisible = () => { if (!document.hidden) void tick(); };
    document.addEventListener("visibilitychange", onVisible);
    const off = subscribe(() => setPoints(series[market] ?? []));
    return () => { off(); document.removeEventListener("visibilitychange", onVisible); };
  }, [market]);
  return { points, price: points.at(-1) };
}
