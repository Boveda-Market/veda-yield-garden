import { parsePastRound, type PastRound } from "@/lib/predict";
import { MARKET_ID_RE, assetOfTitle, windowOfTags, type LiveRound, type PredictPosition, type PredictQuote } from "@/lib/predict";
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

type PolyMarket = { marketId: string; status: string; title?: string; closeTime: number; pricing?: { buyYesPriceUsd?: number; sellYesPriceUsd?: number; buyNoPriceUsd?: number; volume?: number } };
type PolyRaw = { eventId: string; isActive?: boolean; tags?: string[]; beginAt?: string; volumeUsd?: string | number; metadata?: { title?: string }; markets?: PolyMarket[] };

let cache: { at: number; rounds: LiveRound[] } | null = null;
const pr = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n > 0 && n < 1e6 ? n / 1e6 : null; };

/** Current BTC/ETH/SOL Up or Down rounds (5m, 15m, 1h) with real order-book prices; one per asset and window. */
export async function listRounds(): Promise<LiveRound[]> {
  if (cache && Date.now() - cache.at < 8_000) return cache.rounds;
  const now = Math.floor(Date.now() / 1000);
  const pages = await Promise.all([0, 50].map((s) => jup<{ data: PolyRaw[] }>(`/events?provider=polymarket&category=crypto&filter=live&includeMarkets=true&start=${s}&end=${s + 50}`).catch(() => ({ data: [] as PolyRaw[] }))));
  const best = new Map<string, LiveRound>();
  for (const e of pages.flatMap((p) => p.data ?? [])) {
    if (!e.eventId?.startsWith("POLY-") || e.isActive === false) continue;
    const asset = assetOfTitle(e.metadata?.title ?? ""), window = windowOfTags(e.tags ?? []);
    // Polymarket Up/Down events expose two markets ("Up" and "Down"); each side is bought as YES on its own market.
    const m = e.markets?.find((x) => x.title === "Up"), d = e.markets?.find((x) => x.title === "Down");
    if (!asset || !window || !m || !d || m.status !== "open" || d.status !== "open" || !MARKET_ID_RE.test(m.marketId) || !MARKET_ID_RE.test(d.marketId)) continue;
    const openTime = Number(e.beginAt), closeTime = m.closeTime;
    if (!(openTime <= now && now < closeTime)) continue;
    const upPrice = pr(m.pricing?.buyYesPriceUsd);
    const downPrice = pr(d.pricing?.buyYesPriceUsd);
    if (upPrice === null || downPrice === null || upPrice >= 1 || downPrice >= 1) continue;
    const r: LiveRound = { eventId: e.eventId, asset, window, openTime, closeTime, marketId: m.marketId, downMarketId: d.marketId, upPrice, downPrice, volume: Number(m.pricing?.volume ?? 0) };
    const k = `${asset}:${window}`, prev = best.get(k);
    if (!prev || r.closeTime < prev.closeTime || (r.closeTime === prev.closeTime && r.volume > prev.volume)) best.set(k, r);
  }
  const rounds = [...best.values()];
  cache = { at: Date.now(), rounds };
  return rounds;
}

/** Only the wallet signs and pays; simulation must succeed before the user sees the review. */
async function verify(heliusKey: string, wallet: string, base64: string) {
  const web3 = await import("@solana/web3.js");
  const { heliusConnection } = await import("@/lib/helius.server");
  const tx = web3.VersionedTransaction.deserialize(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));
  const owner = new web3.PublicKey(wallet);
  // Jupiter co-signs as a second signer; the user's wallet must remain the fee payer (index 0)
  // and every other required signer must already be pre-signed by the provider.
  const n = tx.message.header.numRequiredSignatures;
  if (n < 1 || n > 2 || !tx.message.staticAccountKeys[0]!.equals(owner)) throw new Error("unexpected signers");
  for (let i = 1; i < n; i++) {
    if (tx.message.staticAccountKeys[i]!.equals(owner) || tx.signatures[i]!.every((b) => b === 0)) throw new Error("unexpected signers");
  }
  const sim = await heliusConnection(heliusKey).simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true });
  if (sim.value.err) throw new Error("simulation failed");
}

type Build = { transaction: string | null; requiredSigners?: string[]; execution?: { context?: unknown }; order?: { contractsMicro?: string; orderCostUsd?: string } };

export async function buildBuy(heliusKey: string, d: { wallet: string; marketId: string; isYes: boolean; amount: bigint }) {
  const live = await listRounds();
  const round = live.find((r) => r.marketId === d.marketId);
  if (!round) throw new Error("market not open");
  // "Up" = YES on the Up market; "Down" = YES on the Down market (that is how the venue fills both sides).
  const marketId = d.isYes ? round.marketId : round.downMarketId;
  const b = await jup<Build>(`/orders`, { method: "POST", body: JSON.stringify({ ownerPubkey: d.wallet, marketId, isBuy: true, isYes: true, depositAmount: d.amount.toString(), depositMint: USDC_MINT }) });
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

/** Claim a resolved winning position: the payout goes to the owner's wallet; only the wallet signs. */
export async function buildClaim(heliusKey: string, d: { wallet: string; position: string }) {
  const b = await jup<Build>(`/positions/${d.position}/claim`, { method: "POST", body: JSON.stringify({ ownerPubkey: d.wallet }) });
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

type RawPos = { pubkey: string; marketId: string; isYes: boolean; contractsMicro: string; totalCostUsd: string; valueUsd: string | null; payoutUsd: string; pnlUsd: string | null; eventId?: string; eventMetadata?: { title?: string }; marketMetadata?: { title?: string; status?: string; result?: string | null; closeTime?: number } };

export async function listPositions(wallet: string): Promise<PredictPosition[]> {
  const r = await jup<{ data: RawPos[] }>(`/positions?ownerPubkey=${encodeURIComponent(wallet)}`);
  return (r.data ?? []).filter((p) => p.marketId.startsWith("POLY-") && BigInt(p.contractsMicro || "0") > 0n).map((p) => ({
    pubkey: p.pubkey, marketId: p.marketId, title: p.eventMetadata?.title ?? "", side: (p.marketMetadata?.title === "Down") === p.isYes ? "down" : "up", outcome: p.marketMetadata?.title ?? "",
    contractsMicro: p.contractsMicro, costMicro: p.totalCostUsd, valueMicro: p.valueUsd, payoutMicro: p.payoutUsd, pnlMicro: p.pnlUsd,
    closeTime: p.marketMetadata?.closeTime ?? null, status: p.marketMetadata?.status ?? "", result: p.marketMetadata?.result ?? null, isYes: p.isYes, eventId: p.eventId && /^POLY-\d{1,12}$/.test(p.eventId) ? p.eventId : undefined,
  }));
}

let pastCache: { at: number; rounds: PastRound[] } | null = null;
/** Recently resolved BTC/ETH/SOL Up/Down rounds from Polymarket's public data, for user verification. */
export async function listPastRounds(): Promise<PastRound[]> {
  if (pastCache && Date.now() - pastCache.at < 30_000) return pastCache.rounds;
  const res = await fetch("https://gamma-api.polymarket.com/events?closed=true&limit=200&order=endDate&ascending=false&tag_slug=up-or-down", { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`gamma ${res.status}`);
  const rows = (await res.json()) as unknown[];
  const rounds = (Array.isArray(rows) ? rows : []).map((e) => parsePastRound(e as never)).filter((r): r is PastRound => !!r).slice(0, 60);
  pastCache = { at: Date.now(), rounds };
  return rounds;
}
