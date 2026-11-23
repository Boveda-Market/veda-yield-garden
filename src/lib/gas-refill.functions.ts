import { createServerFn } from "@tanstack/react-start";
import { requirePrivyAuth } from "@/lib/privy-auth.middleware";
import { activationCharge, activationFee, usedPools, activationKindFor, type ActivationKind, gasRefillInput, playNeedsActivation, refillCharge, refillLamports, treasuryCanRefill } from "@/lib/gas-refill";

const UNAVAILABLE = "La recarga automática no está disponible en este momento. Ya avisamos al equipo; inténtalo de nuevo más tarde. No se movió dinero.";
let lastTreasuryAlert = 0;

/** Older vault activity than the cached history: page back through the finalized history (decoded pages are cached) until the vault shows up. Memoized 10 min per wallet so 20 s quote refreshes do not repeat the scan. */
const scanMemo = new Map<string, { at: number; pools: string[]; done: boolean }>();
async function deepUsedPools(key: string, wallet: string, pool: string, maxPages = 8): Promise<string[]> {
  const hit = scanMemo.get(wallet);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.pools;
  const { readMeteoraHistory } = await import("@/lib/meteora-history.server");
  const pools = new Set<string>();
  let before: string | undefined, done = false;
  for (let i = 0; i < maxPages; i++) {
    const page = await readMeteoraHistory(key, wallet, before);
    for (const p of usedPools(page.records)) pools.add(p);
    if (pools.has(pool) || !page.next) { done = true; break; }
    before = page.next;
  }
  const out = [...pools];
  if (scanMemo.size > 500) scanMemo.clear();
  scanMemo.set(wallet, { at: Date.now(), pools: out, done });
  return out;
}

type Fail = { success: false; error: string };

/** Prepares a one-tap network-reserve refill paid in USDC; the treasury pays the network fee so it works even at zero SOL. */
export const prepareGasRefill = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((d: unknown) => gasRefillInput.parse(d))
  .handler(async ({ data, context }): Promise<{ success: true; transaction: string | null; lamports: string; chargeMicro: string; extraVault?: boolean; feeMicro?: string } | Fail> => {
    { const { assertTradingWallet } = await import("@/lib/trade-guard.server"); await assertTradingWallet(context.privyUserId, data.wallet); }
    const key = process.env["HELIUS_API_KEY"];
    const secret = process.env["AFFILIATE_PAYOUT_SECRET_KEY"];
    if (!key || !secret) return { success: false, error: "La recarga de reserva no está disponible ahora. Inténtalo de nuevo en unos minutos." };
    try {
      const { PublicKey } = await import("@solana/web3.js");
      const { heliusConnection } = await import("@/lib/solana-read.server");
      const sol = BigInt(await heliusConnection(key).getBalance(new PublicKey(data.wallet), "confirmed"));
      if (data.play && !playNeedsActivation(sol)) return { success: false, error: "Tu reserva para operaciones ya está bien." };
      const lamports = refillLamports(sol, data.activation ? "vault" : (data.target ?? "standard"));
      if (lamports <= 0n) return { success: false, error: "Tu reserva para operaciones ya está bien." };
      const { FEE_WALLET } = await import("@/lib/fees");
      const { TREASURY_SOL_LOW } = await import("@/lib/treasury-reserve");
      const treasury = BigInt(await heliusConnection(key).getBalance(new PublicKey(FEE_WALLET), "confirmed"));
      if (!treasuryCanRefill(treasury, lamports, TREASURY_SOL_LOW)) {
        if (Date.now() - lastTreasuryAlert > 30 * 60_000) {
          lastTreasuryAlert = Date.now();
          try { const tg = await import("@/lib/telegram.server"); await tg.treasuryAlert(`⚠️ <b>Recarga de reserva bloqueada</b>\nUn usuario necesita ${(Number(lamports) / 1e9).toFixed(4)} SOL y la tesorería solo tiene ${(Number(treasury) / 1e9).toFixed(4)} SOL. Recarga la tesorería.`); } catch { /* best-effort */ }
        }
        return { success: false, error: UNAVAILABLE };
      }
      const SOL = "So11111111111111111111111111111111111111112", USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
      const q = await fetch(`https://lite-api.jup.ag/swap/v1/quote?inputMint=${SOL}&outputMint=${USDC}&amount=${lamports}&slippageBps=50`);
      if (!q.ok) throw new Error("quote");
      const market = BigInt(((await q.json()) as { outAmount: string }).outAmount);
      // Activation charges reserve cost + fixed $5; regular refills keep the small cost-recovery margin.
      // Wallets that already hold a vault pay the smaller additional-vault fee (verified on-chain, never trusted from the client).
      // A vault this wallet opened before (finalized history decoded server-side) pays no activation again.
      let kind: ActivationKind = "new";
      if (data.activation) {
        let open = false, past: string[] = [];
        let openVaultIds: string[] = [];
        try { const { readDlmmPositions } = await import("@/lib/dlmm.server"); openVaultIds = (await readDlmmPositions(heliusConnection(key), new PublicKey(data.wallet))).map((p) => p.vaultId); open = openVaultIds.length > 0; } catch { open = false; }
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: rows } = await supabaseAdmin.from("vault_tx_cache").select("records").eq("wallet", data.wallet).limit(2000);
          past = usedPools((rows ?? []).flatMap((r) => Array.isArray(r.records) ? (r.records as { kind?: string; pool?: string }[]) : []));
        } catch { past = []; }
        const { VAULTS } = await import("@/lib/vaults");
        // A vault open right now is already opened: adding money to it never pays activation.
        past = [...new Set([...past, ...VAULTS.filter((v) => openVaultIds.includes(v.id)).map((v) => v.pool)])];
        const pool = data.vault ? VAULTS.find((v) => v.id === data.vault)?.pool : undefined;
        kind = activationKindFor(open, past, pool, !!data.migrate);
        if (kind !== "reopen" && pool) {
          try { past = [...new Set([...past, ...(await deepUsedPools(key, data.wallet, pool))])]; kind = activationKindFor(open, past, pool, !!data.migrate); } catch { /* keep the cached decision */ }
        }
      }
      const extraVault = kind === "extra";
      const charge = data.activation ? activationCharge(market, kind) : refillCharge(market);
      const feeMicro = (data.activation ? activationFee(kind) : 0n).toString();
      if (data.quoteOnly) return { success: true, transaction: null, lamports: lamports.toString(), chargeMicro: charge.toString(), extraVault, feeMicro };
      const { buildGasRefill } = await import("@/lib/affiliate.server");
      const transaction = await buildGasRefill(key, secret, FEE_WALLET, data.wallet, lamports, charge);
      return { success: true, transaction, lamports: lamports.toString(), chargeMicro: charge.toString(), extraVault, feeMicro };
    } catch (e) {
      console.error("gas refill failed", e instanceof Error ? e.message : "unknown");
      return { success: false, error: "No se pudo preparar la recarga. Revisa que tengas suficientes dólares disponibles e inténtalo de nuevo." };
    }
  });
