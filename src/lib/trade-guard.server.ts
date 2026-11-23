import { FEE_WALLET } from "@/lib/fees";
import { tradeBlockReason, walletReadAllowed, type LinkedWallet } from "@/lib/trade-guard";

const APP_ID = "cmw6ftcf900ge0hl0jyw3rc75";
const TTL = 5 * 60_000;
const cache = new Map<string, { wallets: LinkedWallet[]; at: number }>();

async function linkedWallets(privyUserId: string, fresh = false): Promise<LinkedWallet[]> {
  const hit = cache.get(privyUserId);
  if (!fresh && hit && Date.now() - hit.at < TTL) return hit.wallets;
  const secret = process.env["PRIVY_APP_SECRET"];
  if (!secret) throw new Error("Las operaciones están en pausa mientras se configura la verificación de billeteras.");
  const res = await fetch(`https://api.privy.io/v1/users/${encodeURIComponent(privyUserId)}`, {
    headers: { Authorization: `Basic ${btoa(`${APP_ID}:${secret}`)}`, "privy-app-id": APP_ID },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error("No se pudo verificar tu billetera. Inténtalo de nuevo.");
  const body = (await res.json()) as { linked_accounts?: LinkedWallet[] };
  const wallets = (body.linked_accounts ?? []).filter((a) => a.type === "wallet");
  cache.set(privyUserId, { wallets, at: Date.now() });
  return wallets;
}

/** Server-side trading gate: only the caller's own Privy embedded wallet may operate; the treasury never trades. */
export async function assertTradingWallet(privyUserId: string, wallet: string) {
  if (wallet === FEE_WALLET) throw new Error("Modo operador: la wallet de tesorería no puede operar en Bóveda Market.");
  const reason = tradeBlockReason(wallet, FEE_WALLET, await linkedWallets(privyUserId));
  if (reason === "treasury") throw new Error("Modo operador: la wallet de tesorería no puede operar en Bóveda Market.");
  if (reason === "external") { const { externalWalletsBlocked } = await import("@/lib/wallet-policy.server"); if (!(await externalWalletsBlocked())) return; }
  if (reason) throw new Error("Modo solo consulta: para operar, entra con Google, email o passkey y usa tu billetera protegida de Bóveda Market.");
}

export const READ_DENIED = "Solo puedes consultar tus propias billeteras.";
const readable = new Map<string, number>();

/** Server-side read gate: private-provider lookups only for wallets the caller owns (linked or proved), or for the operator. */
export async function assertReadableWallet(privyUserId: string, wallet: string) {
  const key = `${privyUserId}:${wallet}`;
  const at = readable.get(key);
  if (at && Date.now() - at < TTL) return;
  let linked: LinkedWallet[] = [];
  try { linked = await linkedWallets(privyUserId); } catch { /* fall back to proved wallets */ }
  // A wallet created moments ago may be missing from a cached list: re-read once before refusing.
  if (!walletReadAllowed(wallet, linked, [], FEE_WALLET)) { try { linked = await linkedWallets(privyUserId, true); } catch { /* keep */ } }
  let ok = walletReadAllowed(wallet, linked, [], FEE_WALLET);
  if (!ok) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("verified_wallets").select("wallet").eq("privy_user_id", privyUserId).in("wallet", [wallet, FEE_WALLET]);
    ok = walletReadAllowed(wallet, linked, (data ?? []).map((r) => r.wallet), FEE_WALLET);
  }
  if (!ok) throw new Error(READ_DENIED);
  readable.set(key, Date.now());
  if (readable.size > 5000) readable.delete(readable.keys().next().value!);
}
