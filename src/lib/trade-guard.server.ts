import { FEE_WALLET } from "@/lib/fees";
import { tradeBlockReason, type LinkedWallet } from "@/lib/trade-guard";

const APP_ID = "cmw6ftcf900ge0hl0jyw3rc75";
const TTL = 5 * 60_000;
const cache = new Map<string, { wallets: LinkedWallet[]; at: number }>();

async function linkedWallets(privyUserId: string): Promise<LinkedWallet[]> {
  const hit = cache.get(privyUserId);
  if (hit && Date.now() - hit.at < TTL) return hit.wallets;
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
  if (wallet === FEE_WALLET) throw new Error("Modo operador: la wallet de tesorería no puede operar en BÓVEDA.");
  const reason = tradeBlockReason(wallet, FEE_WALLET, await linkedWallets(privyUserId));
  if (reason === "treasury") throw new Error("Modo operador: la wallet de tesorería no puede operar en BÓVEDA.");
  if (reason) throw new Error("Modo solo consulta: para operar, entra con Google, email o passkey y usa tu billetera protegida de BÓVEDA.");
}
