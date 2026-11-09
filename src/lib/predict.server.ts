import { PREDICT_SERIES, PREDICT_WINDOWS, type LiveRound, type PredictPosition, type PredictQuote, type PredictWindow } from "@/lib/predict";
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

type Market = { marketId: string; outcomeSide?: string; tradable?: boolean; openTime: number; closeTime: number };
type Event = { eventId: string; tags: string[]; metadata: { series: string }; markets?: Market[] };

let cache: { at: number; rounds: LiveRound[] } | null = null;

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
    rounds.push({ eventId: e.eventId, series: e.metadata.series, window, openTime: up.openTime, closeTime: up.closeTime, up: up.marketId, down: down.marketId });
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

export async function buildBuy(heliusKey: string, d: { wallet: string; marketId: string; amount: bigint }) {
  const live = await listRounds();
  if (!live.some((r) => r.up === d.marketId || r.down === d.marketId)) throw new Error("round not live");
  const b = await jup<Build>(`/orders`, { method: "POST", body: JSON.stringify({ ownerPubkey: d.wallet, marketId: d.marketId, isBuy: true, isYes: true, depositAmount: d.amount.toString(), depositMint: USDC_MINT }) });
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
  return (r.data ?? []).filter((p) => p.marketId.startsWith("BISON-") && BigInt(p.contractsMicro || "0") > 0n).map((p) => ({
    pubkey: p.pubkey, marketId: p.marketId, title: p.eventMetadata?.title ?? "", side: p.marketId.endsWith("-UP") ? "up" : "down",
    contractsMicro: p.contractsMicro, costMicro: p.totalCostUsd, valueMicro: p.valueUsd, payoutMicro: p.payoutUsd, pnlMicro: p.pnlUsd,
    closeTime: p.marketMetadata?.closeTime ?? null, status: p.marketMetadata?.status ?? "", result: p.marketMetadata?.result ?? null,
  }));
}
