import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { useT } from "@/lib/i18n";
import { getRealWallet } from "@/lib/solana.functions";
import { decimalToUnits } from "@/lib/onboarding";

/** Always-visible SOL ⇄ USDC shortcut to Mi wallet's swap tab, preselecting the likely direction. */
export function QuickSwapButton() {
  const t = useT();
  const session = useBovedaSession();
  const wallet = session.walletAddress;
  const readWallet = useServerFn(getRealWallet);
  const balances = useQuery({ queryKey: ["my-wallet", wallet], enabled: !!wallet, queryFn: async () => {
    const r = await readWallet({ data: { wallet: wallet! } });
    if (!r.success) throw new Error(r.error);
    return { sol: decimalToUnits(r.data.sol, 9) ?? 0n, usdc: decimalToUnits(r.data.usdc, 6) ?? 0n };
  } });
  if (!wallet || !session.authenticated) return null;
  const b = balances.data;
  const from = b && b.usdc < 1_000_000n && b.sol > 50_000_000n ? "SOL" : "USDC";
  return <Button variant="secondary" onClick={() => window.location.assign(`/wallet?swap=${from}`)}><ArrowLeftRight size={16} />{t("Cambiar SOL ⇄ USDC")}</Button>;
}
