import { useEffect, useState } from "react";
import { fetchPrices, type MarketId } from "@/lib/markets";

/** Polls the public spot price for one asset and keeps a short tick series for live charts. */
export function useLivePrice(market: MarketId | null) {
  const [points, setPoints] = useState<number[]>([]);
  useEffect(() => {
    if (!market) return;
    let alive = true; setPoints([]);
    const tick = async () => { try { const v = (await fetchPrices())[market]; if (alive && v) setPoints((s) => [...s, v].slice(-300)); } catch { /* retry */ } };
    void tick(); const id = setInterval(tick, 2000);
    return () => { alive = false; clearInterval(id); };
  }, [market]);
  return { points, price: points.at(-1) };
}
