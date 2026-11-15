import { useEffect, useState } from "react";
import { getPriceToBeat } from "@/lib/predict.functions";
import type { PredictAsset, PredictWindow } from "@/lib/predict";

/** Price to beat from Polymarket for one round: retried until published, then refreshed until the official value lands. */
export function usePriceToBeatInfo(asset: PredictAsset | null, window: PredictWindow | null, openTime: number | null): { price: number; official: boolean } | undefined {
  const [v, setV] = useState<{ key: string; price: number; official: boolean } | undefined>();
  const key = asset && window && openTime ? `${asset}:${window}:${openTime}` : "";
  useEffect(() => {
    if (!asset || !window || !openTime) return;
    let alive = true, timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      const r = await getPriceToBeat({ data: { asset, window, openTime } }).catch(() => null);
      if (!alive) return;
      const value = r?.success ? r.value : null;
      if (value) setV({ key, ...value });
      if (!value?.official) timer = setTimeout(load, value ? 20_000 : 4_000);
    };
    void load();
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return v && v.key === key ? { price: v.price, official: v.official } : undefined;
}

export function usePriceToBeat(asset: PredictAsset | null, window: PredictWindow | null, openTime: number | null) {
  return usePriceToBeatInfo(asset, window, openTime)?.price;
}
