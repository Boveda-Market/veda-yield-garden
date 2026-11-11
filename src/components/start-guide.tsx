import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeftRight, Check, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { getRealWallet } from "@/lib/solana.functions";
import { decimalToUnits, onboardingStep } from "@/lib/onboarding";
import { BuyUsdc } from "@/components/buy-usdc";
import { Button } from "@/components/ui/button";

/** Shows new users the next funding step (SOL, then USDC); hides once funded. */
export function StartGuide({ className, onSwap }: { className?: string; onSwap?: () => void }) {
  const t = useT();
  const session = useBovedaSession();
  const address = session.walletAddress;
  const read = useServerFn(getRealWallet);
  const q = useQuery({ queryKey: ["start-guide", address], enabled: !!address && session.authenticated, staleTime: 30_000, queryFn: async () => {
    const r = await read({ data: { wallet: address! } });
    if (!r.success) throw new Error(r.error);
    return { sol: decimalToUnits(r.data.sol, 9) ?? 0n, usdc: decimalToUnits(r.data.usdc, 6) ?? 0n };
  } });
  if (!q.data || !address) return null;
  const step = onboardingStep(q.data.sol, q.data.usdc);
  if (!step) return null;
  const steps = [t("Añade saldo inicial"), t("Convierte a USDC"), t("Elige tu bóveda")];
  const current = step === "sol" ? 0 : 1;
  return <section aria-label={t("Guía de inicio")} className={`rounded-2xl border border-primary/40 bg-primary/10 p-5 ${className ?? ""}`}>
    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><Sparkles size={14} />{t("Guía de inicio")}</p>
    <ol className="mt-3 grid grid-cols-3 gap-2 text-xs">{steps.map((s, i) => <li key={s} className={`flex items-center gap-2 rounded-xl border px-2 py-2 ${i === current ? "border-primary bg-primary/15 font-semibold text-foreground" : i < current ? "border-primary/30 text-foreground/80" : "border-border text-muted-foreground"}`}>
      <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${i <= current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i < current ? <Check size={12} /> : i + 1}</span>{s}</li>)}</ol>
    {step === "sol" ? <>
      <h2 className="mt-4 font-display text-xl font-semibold">{t("Paso 1: añade tu saldo inicial con tarjeta")}</h2>
      <p className="mt-1 text-sm leading-6 text-foreground/85">{t("Compra SOL con tarjeta. El mínimo de compra es 0.19 SOL (unos $35). Una parte pequeña paga los costos de red por meses y el resto lo conviertes a USDC (dólares) en el paso 2, sin comisión.")}</p>
      <p className="mt-2 inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">{t("Ya viene fijado en 0.19 SOL · es la cantidad en SOL, no en dólares")}</p>
      <div className="mt-4"><BuyUsdc only="SOL" /></div>
    </> : <>
      <h2 className="mt-4 font-display text-xl font-semibold">{t("Paso 2: convierte tus fondos a USDC")}</h2>
      <p className="mt-1 text-sm leading-6 text-foreground/85">{t("Ya tienes saldo. Los USDC son dólares digitales: es lo que depositas en una bóveda. Cambia la parte que quieras usar; siempre guardamos un poco de SOL para tus costos de red.")}</p>
      <div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => onSwap ? onSwap() : window.location.assign("/wallet?swap=SOL")}><ArrowLeftRight size={16} />{t("Cambiar SOL a USDC")}</Button></div>
      <p className="mt-3 text-xs text-muted-foreground">{t("Paso 3: con tus USDC, elige una bóveda o entra a Sube/Baja.")}</p>
    </>}
  </section>;
}
