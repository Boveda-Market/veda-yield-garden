import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { getRealWallet } from "@/lib/solana.functions";
import { decimalToUnits } from "@/lib/onboarding";
import { SWAP_TOKENS } from "@/lib/wallet-actions";
import { SolExcessCard } from "@/components/sol-excess-card";

/** SOL→USDC percent shortcut for Bóvedas and Sube / Baja; opens Mi Billetera's swap prefilled for review. */
export function SolConvertShortcut({ className = "" }: { className?: string }) {
  const session = useBovedaSession();
  const wallet = session.walletAddress;
  const readWallet = useServerFn(getRealWallet);
  const balances = useQuery({ queryKey: ["my-wallet", wallet], enabled: !!wallet, queryFn: async () => {
    const r = await readWallet({ data: { wallet: wallet! } });
    if (!r.success) throw new Error(r.error);
    return { sol: decimalToUnits(r.data.sol, 9) ?? 0n, usdc: decimalToUnits(r.data.usdc, 6) ?? 0n };
  } });
  const mint = SWAP_TOKENS.find((x) => x.symbol === "SOL")?.mint;
  const price = useQuery({ queryKey: ["sol-price"], enabled: !!wallet && !!mint, staleTime: 60_000, queryFn: async () => {
    const j = await (await fetch(`https://api.dexscreener.com/tokens/v1/solana/${mint}`)).json() as { priceUsd?: string; liquidity?: { usd?: number } }[];
    const best = Array.isArray(j) ? [...j].sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0] : undefined;
    const p = Number(best?.priceUsd); return Number.isFinite(p) && p > 0 ? p : null;
  } });
  if (!wallet) return null;
  return <div className={className}><SolExcessCard sol={balances.data?.sol} usdc={balances.data?.usdc} solPrice={price.data ?? undefined} onConvert={(a) => { window.location.assign(`/wallet?convert=${encodeURIComponent(a)}`); }} /></div>;
}
