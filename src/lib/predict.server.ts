import { PREDICT_SERIES, PREDICT_WINDOWS, type LiveRound, type PolyEvent, type PredictPosition, type PredictQuote, type PredictWindow } from "@/lib/predict";
import { USDC_MINT } from "@/lib/wallet-actions";

const API = "https://api.jup.ag/prediction/v1";

async function jup<T>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env["JUPITER_API_KEY"];
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (key) headers["x-api-key"] = key;
  const res = await fetch(`${API}${path}`, { ...init, headers, signal: AbortSignal.timeout(15_000) });
  const body = await res.json().catch(() => ({})) as T & { code?: string; message?: string };
  if (!res.ok) throw new Error(`predict ${res.status} ${body.code ?? ""}`);
  return body;
}

type Market = { marketId: string; outcomeSide?: string; tradable?: boolean; openTime: number; closeTime: number; pricing?: { buyYesPriceUsd?: number | null } };
type Event = { eventId: string; tags: string[]; metadata: { series: string }; markets?: Market[] };

let cache: { at: number; rounds: LiveRound[] } | null = null;

const px = (m: { pricing?: { buyYesPriceUsd?: number | null } }) => { const v = Number(m.pricing?.buyYesPriceUsd); return Number.isFinite(v) && v > 0 && v < 1e6 ? v / 1e6 : null; };

export async function listRounds(): Promise<LiveRound[]> {
  if (cache && Date.now() - cache.at < 10_000) return cache.rounds;
  const now = Math.floor(Date.now() / 1000);
  const r = await jup<{ data: Event[] }>(`/events?provider=bisonfi&category=crypto&filter=live&includeMarkets=true&start=0&end=50`);
  const rounds: LiveRound[] = [];
  for (const e of r.data ?? []) {
    if (!(PREDICT_SERIES as readonly string[]).includes(e.metadata?.series)) continue;
    const window = e.tags.find((t) => (PREDICT_WINDOWS as readonly string[]).includes(t)) as PredictWindow | undefined;
    const up = e.markets?.find((m) => m.outcomeSide === "up"), down = e.markets?.find((m) => m.outcomeSide === "down");
    if (!window || !up?.tradable || !down?.tradable || !(up.openTime <= now && now < up.closeTime)) continue;
    rounds.push({ eventId: e.eventId, series: e.metadata.series, window, openTime: up.openTime, closeTime: up.closeTime, up: up.marketId, down: down.marketId, upPrice: px(up), downPrice: px(down) });
  }
  rounds.sort((a, b) => a.closeTime - b.closeTime);
  cache = { at: Date.now(), rounds };
  return rounds;
}

/** Only the wallet signs and pays; simulation must succeed before the user sees the review. */
async function verify(heliusKey: string, wallet: string, base64: string) {
  const web3 = await import("@solana/web3.js");
  const { heliusConnection } = await import("@/lib/helius.server");
  const tx = web3.VersionedTransaction.deserialize(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));
  const owner = new web3.PublicKey(wallet);
  if (tx.message.header.numRequiredSignatures !== 1 || !tx.message.staticAccountKeys[0]!.equals(owner)) throw new Error("unexpected signers");
  const sim = await heliusConnection(heliusKey).simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true });
  if (sim.value.err) throw new Error("simulation failed");
}

type Build = { transaction: string | null; requiredSigners?: string[]; execution?: { context?: unknown }; order?: { contractsMicro?: string; orderCostUsd?: string } };

type PolyMarket = { marketId: string; status: string; title: string; closeTime: number; rulesPrimary?: string; pricing?: { buyYesPriceUsd?: number; buyNoPriceUsd?: number; volume?: number } };
type PolyRaw = { eventId: string; isActive: boolean; volumeUsd?: string | number; metadata?: { title?: string; imageUrl?: string; closeTime?: string }; markets?: PolyMarket[] };
let polyCache: { at: number; events: PolyEvent[] } | null = null;
const pr = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n > 0 && n < 1e6 ? n / 1e6 : null; };

/** Open Polymarket crypto events with real order-book prices. */
export async function listPolyEvents(): Promise<PolyEvent[]> {
  if (polyCache && Date.now() - polyCache.at < 15_000) return polyCache.events;
  const r = await jup<{ data: PolyRaw[] }>(`/events?provider=polymarket&category=crypto&includeMarkets=true&start=0&end=40`);
  const now = Math.floor(Date.now() / 1000);
  const events: PolyEvent[] = [];
  for (const e of r.data ?? []) {
    if (!e.eventId?.startsWith("POLY-") || e.isActive === false) continue;
    const markets = (e.markets ?? []).filter((m) => m.status === "open" && m.closeTime > now && /^POLY-\d+$/.test(m.marketId))
      .map((m) => ({ marketId: m.marketId, title: m.title, yes: pr(m.pricing?.buyYesPriceUsd), no: pr(m.pricing?.buyNoPriceUsd), volume: Number(m.pricing?.volume ?? 0) }))
      .filter((m) => m.yes !== null && m.yes > 0.02 && m.yes < 0.98);
    if (!markets.length) continue;
    const close = Math.min(...(e.markets ?? []).map((m) => m.closeTime).filter((x) => x > now));
    events.push({ eventId: e.eventId, title: e.metadata?.title ?? "", imageUrl: e.metadata?.imageUrl?.startsWith("https://") ? e.metadata.imageUrl : null, closeTime: close, volume: Number(e.volumeUsd ?? 0) / 1e6, rules: e.markets?.[0]?.rulesPrimary?.slice(0, 900) ?? "", markets: markets.slice(0, 12) });
  }
  events.sort((a, b) => a.closeTime - b.closeTime);
  polyCache = { at: Date.now(), events };
  return events;
}

export async function buildBuy(heliusKey: string, d: { wallet: string; marketId: string; isYes: boolean; amount: bigint }) {
  const live = await listPolyEvents();
  if (!live.some((e) => e.markets.some((m) => m.marketId === d.marketId))) throw new Error("market not open");
  const b = await jup<Build>(`/orders`, { method: "POST", body: JSON.stringify({ ownerPubkey: d.wallet, marketId: d.marketId, isBuy: true, isYes: d.isYes, depositAmount: d.amount.toString(), depositMint: USDC_MINT }) });
  if (!b.transaction || (b.requiredSigners && b.requiredSigners.some((s) => s !== d.wallet))) throw new Error("bad build");
  await verify(heliusKey, d.wallet, b.transaction);
  const quote: PredictQuote = { contractsMicro: String(b.order?.contractsMicro ?? "0"), costMicro: String(b.order?.orderCostUsd ?? d.amount) };
  return { transaction: b.transaction, context: JSON.stringify(b.execution?.context ?? null), quote };
}

export async function buildSell(heliusKey: string, d: { wallet: string; position: string }) {
  const b = await jup<Build>(`/positions/${d.position}`, { method: "DELETE", body: JSON.stringify({ ownerPubkey: d.wallet }) });
  if (!b.transaction || (b.requiredSigners && b.requiredSigners.some((s) => s !== d.wallet))) throw new Error("bad build");
  await verify(heliusKey, d.wallet, b.transaction);
  return { transaction: b.transaction, context: JSON.stringify(b.execution?.context ?? null) };
}

export async function execute(wallet: string, signed: string, context: string) {
  const web3 = await import("@solana/web3.js");
  const tx = web3.VersionedTransaction.deserialize(Uint8Array.from(atob(signed), (c) => c.charCodeAt(0)));
  if (!tx.message.staticAccountKeys[0]!.equals(new web3.PublicKey(wallet))) throw new Error("wrong payer");
  const r = await jup<{ status?: string; signature?: string; error?: unknown }>(`/execute`, { method: "POST", body: JSON.stringify({ signedTransaction: signed, context: JSON.parse(context) }) });
  if (r.status !== "Success" || r.error || !r.signature) throw new Error("execute failed");
  return r.signature;
}

type RawPos = { pubkey: string; marketId: string; isYes: boolean; contractsMicro: string; totalCostUsd: string; valueUsd: string | null; payoutUsd: string; pnlUsd: string | null; eventMetadata?: { title?: string }; marketMetadata?: { title?: string; status?: string; result?: string | null; closeTime?: number } };

export async function listPositions(wallet: string): Promise<PredictPosition[]> {
  const r = await jup<{ data: RawPos[] }>(`/positions?ownerPubkey=${encodeURIComponent(wallet)}`);
  return (r.data ?? []).filter((p) => p.marketId.startsWith("POLY-") && BigInt(p.contractsMicro || "0") > 0n).map((p) => ({
    pubkey: p.pubkey, marketId: p.marketId, title: p.eventMetadata?.title ?? "", side: p.isYes ? "up" : "down", outcome: p.marketMetadata?.title ?? "",
    contractsMicro: p.contractsMicro, costMicro: p.totalCostUsd, valueMicro: p.valueUsd, payoutMicro: p.payoutUsd, pnlMicro: p.pnlUsd,
    closeTime: p.marketMetadata?.closeTime ?? null, status: p.marketMetadata?.status ?? "", result: p.marketMetadata?.result ?? null,
  }));
}
