import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { WalletSwap } from "@/components/wallet-swap";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { useT } from "@/lib/i18n";
import { getRealWallet } from "@/lib/solana.functions";
import { decimalToUnits } from "@/lib/onboarding";
import { buildSwap, type SwapQuote } from "@/lib/wallet-actions";

/** Always-visible SOL ⇄ USDC button opening the reviewed wallet swap in place; only the wallet signs. */
export function QuickSwapButton() {
  const t = useT();
  const session = useBovedaSession();
  const wallet = session.walletAddress;
  const qc = useQueryClient();
  const readWallet = useServerFn(getRealWallet);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const balances = useQuery({ queryKey: ["my-wallet", wallet], enabled: !!wallet, queryFn: async () => {
    const r = await readWallet({ data: { wallet: wallet! } });
    if (!r.success) throw new Error(r.error);
    return { sol: decimalToUnits(r.data.sol, 9) ?? 0n, usdc: decimalToUnits(r.data.usdc, 6) ?? 0n };
  } });
  if (!wallet || !session.authenticated) return null;
  const b = balances.data;
  // Most likely direction: lots of SOL but little USDC → sell SOL; otherwise buy SOL with USDC.
  const from = b && b.usdc < 1_000_000n && b.sol > 50_000_000n ? "SOL" : "USDC";
  async function swap(quote: SwapQuote) {
    setBusy(true); setError(null);
    try {
      await session.signAndSend(await buildSwap(wallet!, quote));
      setTimeout(() => { for (const k of ["my-wallet", "real-solana", "my-wallet-tokens"]) void qc.invalidateQueries({ queryKey: [k, wallet] }); }, 4000);
    } catch (e) { setError(e instanceof Error ? e.message : t("No se pudo completar la operación.")); throw e; } finally { setBusy(false); }
  }
  return <>
    <Button variant="secondary" onClick={() => { setError(null); setOpen(true); }}><ArrowLeftRight size={16} />{t("Cambiar SOL ⇄ USDC")}</Button>
    <Dialog open={open} onOpenChange={(v) => { if (!busy) setOpen(v); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogTitle>{t("Cambiar SOL ⇄ USDC")}</DialogTitle>
        <DialogDescription>{t("Toca ⇅ para invertir la dirección. Revisa la cotización antes de firmar; siempre se guarda un poco de SOL para costos de red.")}</DialogDescription>
        {open && <WalletSwap key={from} balances={{ SOL: b?.sol, USDC: b?.usdc }} initialFrom={from} busy={busy} onConfirm={swap} />}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  </>;
}
