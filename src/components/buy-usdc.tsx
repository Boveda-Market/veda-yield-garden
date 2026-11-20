import { useT } from "@/lib/i18n";
import { CARD_MIN_USD } from "@/lib/onboarding";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { getRealWallet } from "@/lib/solana.functions";
import { decimalToUnits } from "@/lib/onboarding";
import { saveResumeDeposit, type ResumeDeposit } from "@/lib/resume-deposit";
import { holdSessionForExternalFlow } from "@/components/idle-logout";
import { coinbaseOnrampStatus, recordCoinbaseOnramp, startCoinbaseBuy } from "@/lib/coinbase-offramp.functions";

type Receipt = { added: bigint; total: bigint };
const usdc = (v: bigint) => (Number(v) / 1e6).toFixed(2);

/** One "Add funds" button: users with network reserve buy USDC directly; others get the starter card purchase (auto-activated by StartGuide). */
export function BuyUsdc({ className, auto, hot, needMicro, resume, label }: { label?: string; resume?: Omit<ResumeDeposit, "at">; className?: string; only?: "SOL" | "USDC"; auto?: number; hot?: boolean; needMicro?: bigint | undefined }) {
  const t = useT();
  const session = useBovedaSession();
  const read = useServerFn(getRealWallet);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [choosing, setChoosing] = useState(false);
  const cbBuy = useServerFn(startCoinbaseBuy);
  const cbStatus = useServerFn(coinbaseOnrampStatus);
  const cbRecord = useServerFn(recordCoinbaseOnramp);
  const [cardUnlocked, setCardUnlocked] = useState(false);
  useEffect(() => { if (session.authenticated) void cbStatus().then((r) => setCardUnlocked(r.done)).catch(() => {}); }, [session.authenticated]); // eslint-disable-line react-hooks/exhaustive-deps
  const address = session.walletAddress;
  // One tap: when the parent bumps `auto`, open checkout immediately.
  useEffect(() => { if (auto) void add(); }, [auto]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!session.authenticated || !address) return null;

  async function balances() {
    const r = await read({ data: { wallet: address! } });
    if (!r.success) throw new Error(r.error);
    return { sol: decimalToUnits(r.data.sol, 9) ?? 0n, usdc: decimalToUnits(r.data.usdc, 6) ?? 0n };
  }
  function add() { setError(null); setReceipt(null); setChoosing(true); }
  async function pay(provider: "coinbase" | "card") {
    setChoosing(false); setError(null);
    // Open the Coinbase tab synchronously so pop-up blockers allow it.
    const tab = provider === "coinbase" ? window.open("", "_blank") : null;
    const release = provider === "coinbase" ? holdSessionForExternalFlow() : () => {};
    try {
      const before = await balances();
      if (provider === "coinbase") {
        if (resume) saveResumeDeposit(resume);
        // Always USDC in US dollars (never SOL); the network reserve refills from USDC.
        const r = await cbBuy({ data: { wallet: address!, asset: "USDC", origin: window.location.origin, ...(needMicro && needMicro > 0n ? { amountUsd: Number(needMicro) / 1e6 } : {}) } });
        if (!r.success) { tab?.close(); throw new Error(r.error); }
        if (tab) tab.location.href = r.url; else window.location.href = r.url;
      } else {
        // Card purchases are always USDC priced in US dollars, so a typed "10" can never mean 10 SOL; the network reserve refills from USDC.
        if (!session.buyUsdc) throw new Error("Pago con tarjeta no disponible");
        await session.buyUsdc();
      }
      setWaiting(true);
      // Watch for the purchased USDC to land (up to ~5 min) and show a receipt.
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const now = await balances().catch(() => null);
        if (now && now.usdc > before.usdc) { setReceipt({ added: now.usdc - before.usdc, total: now.usdc }); void queryClient.invalidateQueries(); if (provider === "coinbase") { void cbRecord().then(() => setCardUnlocked(true)).catch(() => {}); } break; }
      }
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      if (!/exit|clos|cancel/i.test(m)) setError(t("No se pudo abrir la compra: {message}", { message: t(m) }));
    } finally { setWaiting(false); release(); }
  }

  return <div className={className}>
    {auto ? waiting && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" />{t("Esperando tus dólares…")}</p> : <div className="flex flex-wrap gap-2">
      <Button onClick={() => void add()} disabled={waiting} className={hot ? "hot-cta w-full font-bold text-hot-surface" : undefined}>{waiting ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}{waiting ? t("Esperando tus dólares…") : (label ?? t("Depositar dólares"))}</Button>
    </div>}
    <Dialog open={choosing} onOpenChange={setChoosing}><ActionSheetContent closeLabel={t("Cerrar")}>
      <DialogHeader><DialogTitle>{t("Depositar dólares")}</DialogTitle><DialogDescription>{t("Compra con tu saldo de Coinbase, banco o tarjeta.")}</DialogDescription></DialogHeader>
      <div className="grid gap-3">
        <button type="button" onClick={() => void pay("coinbase")} className="flex items-start gap-3 rounded-xl border border-primary/50 bg-primary/10 p-4 text-left transition-colors hover:bg-primary/20">
          <img src="/brands/coinbase.svg" alt="" width={32} height={32} className="h-8 w-8 rounded-md" />
          <span><span className="block font-semibold">Coinbase </span>
          <span className="text-xs text-muted-foreground">{t("Compra directa de USDC (1 USDC ≈ $1). El monto se escribe en dólares.")}</span></span>
        </button>
        {session.buyUsdc && <button type="button" onClick={() => void pay("card")} className="flex items-start gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:bg-muted">
          <CreditCard size={24} className="mt-0.5 text-muted-foreground" />
          <span><span className="block text-sm font-medium">{t("Tarjeta o Apple Pay")} · {t("Mínimo")} ${CARD_MIN_USD}</span>
          <span className="text-xs text-muted-foreground">{t("Compra rápida de USDC vía MoonPay. El monto se escribe en dólares.")}</span></span>
        </button>}
      </div>
      <p className="text-center text-xs text-muted-foreground">{t("Sugerido: $25 · $50 (recomendado para empezar) · $100. Mínimo sugerido $20 para activar tu cuenta y abrir tu primera bóveda sin interrupciones.")}</p>
    </ActionSheetContent></Dialog>
    {receipt && <div role="status" className="mt-3 rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold"><CheckCircle2 size={16} className="text-primary" />{t("¡Fondos añadidos!")}</p>
      <dl className="mt-2 divide-y divide-border">
        {[[t("Añadido"), `+${usdc(receipt.added)} USDC`], [t("Servicio BÓVEDA"), "0.00 USDC"], [t("Nuevo saldo"), `${usdc(receipt.total)} USDC`]].map(([k, v]) => <div key={k} className="flex justify-between py-1.5"><dt className="text-muted-foreground">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
      </dl>
      <p className="mt-1 text-xs text-muted-foreground">{t("La pasarela de pago puede cobrar su propio cargo, que ves antes de pagar.")}</p>
      <Button size="sm" variant="ghost" className="mt-1" onClick={() => setReceipt(null)}>{t("Listo")}</Button>
    </div>}
    {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
  </div>;
}
