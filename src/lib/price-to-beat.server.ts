import type { PredictAsset, PredictWindow } from "@/lib/predict";
import { PRICE_TO_BEAT_VARIANT, WINDOW_SECONDS, roundSlug } from "@/lib/price-to-beat";

/** Price to beat from Polymarket itself: the official value once published on the event, otherwise its live opening price. */
export type PriceToBeat = { price: number; official: boolean };

const cache = new Map<string, { at: number; v: PriceToBeat }>();
const PROVISIONAL_TTL = 15_000;

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(`polymarket ${res.status}`);
  return res.json();
}

const valid = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0 && n < 1e7;

export async function priceToBeat(asset: PredictAsset, window: PredictWindow, openTime: number): Promise<PriceToBeat | null> {
  const key = `${asset}:${window}:${openTime}`;
  const hit = cache.get(key);
  if (hit && (hit.v.official || Date.now() - hit.at < PROVISIONAL_TTL)) return hit.v;
  let v: PriceToBeat | null = null;
  try {
    const ev = await getJson(`https://gamma-api.polymarket.com/events?slug=${roundSlug(asset, window, openTime)}`) as { eventMetadata?: { priceToBeat?: unknown } }[];
    const p = Array.isArray(ev) ? ev[0]?.eventMetadata?.priceToBeat : undefined;
    if (valid(p)) v = { price: p, official: true };
  } catch { /* fall through to the live opening price */ }
  if (!v) {
    try {
      const start = new Date(openTime * 1000).toISOString().replace(".000Z", "Z");
      const end = new Date((openTime + WINDOW_SECONDS[window]) * 1000).toISOString().replace(".000Z", "Z");
      const r = await getJson(`https://polymarket.com/api/crypto/crypto-price?symbol=${asset}&eventStartTime=${start}&variant=${PRICE_TO_BEAT_VARIANT[window]}&endDate=${end}`) as { openPrice?: unknown };
      if (valid(r.openPrice)) v = { price: r.openPrice, official: false };
    } catch { /* unavailable for now */ }
  }
  if (v) {
    if (cache.size > 500) cache.clear();
    cache.set(key, { at: Date.now(), v });
  }
  return v;
}
