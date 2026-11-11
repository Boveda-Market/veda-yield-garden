import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { QuickSwapButton } from "@/components/quick-swap";
import { getRealWallet } from "@/lib/solana.functions";
import { decimalToUnits, fundingAction } from "@/lib/onboarding";

type Receipt = { added: bigint; total: bigint };
const usdc = (v: bigint) => (Number(v) / 1e6).toFixed(2);

/** One "Add funds" button: users with network reserve buy USDC directly; others get the starter card purchase (auto-activated by StartGuide). */
export function BuyUsdc({ className, auto }: { className?: string; only?: "SOL" | "USDC"; auto?: number }) {
  const t = useT();
  const session = useBovedaSession();
  const read = useServerFn(getRealWallet);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const address = session.walletAddress;
  // One tap: when the parent bumps `auto`, open checkout immediately.
  useEffect(() => { if (auto) void add(); }, [auto]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!session.authenticated || !address) return null;

  async function balances() {
    const r = await read({ data: { wallet: address! } });
    if (!r.success) throw new Error(r.error);
    return { sol: decimalToUnits(r.data.sol, 9) ?? 0n, usdc: decimalToUnits(r.data.usdc, 6) ?? 0n };
  }
  async function add() {
    setError(null); setReceipt(null);
    try {
      const before = await balances();
      if (fundingAction(before.sol) === "starter") { await session.buySol?.(); return; }
      await session.buyUsdc?.();
      setWaiting(true);
      // Watch for the purchased USDC to land (up to ~3 min) and show a receipt.
      for (let i = 0; i < 36; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const now = await balances().catch(() => null);
        if (now && now.usdc > before.usdc) { setReceipt({ added: now.usdc - before.usdc, total: now.usdc }); void queryClient.invalidateQueries(); break; }
      }
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      if (!/exit|clos|cancel/i.test(m)) setError(t("No se pudo abrir la compra: {message}", { message: t(m) }));
    } finally { setWaiting(false); }
  }

  return <div className={className}>
    {auto ? waiting && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" />{t("Esperando tus dólares…")}</p> : <div className="flex flex-wrap gap-2">
      <Button onClick={() => void add()} disabled={waiting}>{waiting ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}{waiting ? t("Esperando tus dólares…") : t("Añadir fondos")}</Button>
      <QuickSwapButton />
    </div>}
    {receipt && <div role="status" className="mt-3 rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold"><CheckCircle2 size={16} className="text-primary" />{t("¡Fondos añadidos!")}</p>
      <dl className="mt-2 divide-y divide-border">
        {[[t("Añadido"), `+${usdc(receipt.added)} USDC`], [t("Comisión BÓVEDA"), "0.00 USDC"], [t("Nuevo saldo"), `${usdc(receipt.total)} USDC`]].map(([k, v]) => <div key={k} className="flex justify-between py-1.5"><dt className="text-muted-foreground">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
      </dl>
      <p className="mt-1 text-xs text-muted-foreground">{t("La pasarela de pago puede cobrar su propio cargo, que ves antes de pagar.")}</p>
      <Button size="sm" variant="ghost" className="mt-1" onClick={() => setReceipt(null)}>{t("Listo")}</Button>
    </div>}
    {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
  </div>;
}
