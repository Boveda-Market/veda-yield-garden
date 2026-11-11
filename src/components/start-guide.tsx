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
  const steps = [t("Añade fondos con tarjeta"), t("Convierte a USDC"), t("Elige tu bóveda")];
  const current = step === "sol" ? 0 : 1;
  return <section aria-label={t("Guía de inicio")} className={`rounded-2xl border border-primary/40 bg-primary/10 p-5 ${className ?? ""}`}>
    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><Sparkles size={14} />{t("Guía de inicio")}</p>
    <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/70">{steps.map((s, i) => <li key={s} className={i === current ? "font-semibold text-foreground" : ""}>{i < current ? <Check size={12} className="mr-1 inline text-primary" /> : `${i + 1}. `}{s}</li>)}</ol>
    {step === "sol" ? <>
      <h2 className="mt-3 font-display text-xl font-semibold">{t("Paso 1: compra USDC (dólares) y un poco de gas")}</h2>
      <p className="mt-1 text-sm leading-6 text-foreground/85">{t("Compra USDC por el monto en dólares que quieras usar. Aparte, añade gas de red: solo necesitas entre $2 y $3 y te dura meses. No compres más gas del necesario.")}</p>
      <p className="mt-2 inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">{t("Gas: ya viene fijado en ~$3 · no lo cambies")}</p>
      <div className="mt-4"><BuyUsdc /></div>
    </> : <>
      <h2 className="mt-3 font-display text-xl font-semibold">{t("Paso 2: convierte tus fondos a USDC")}</h2>
      <p className="mt-1 text-sm leading-6 text-foreground/85">{t("Ya tienes saldo. Los USDC son dólares digitales: es lo que depositas en una bóveda. Cambia la parte que quieras usar; siempre guardamos un poco de SOL para tus costos de red.")}</p>
      <div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => onSwap ? onSwap() : window.location.assign("/wallet?swap=SOL")}><ArrowLeftRight size={16} />{t("Cambiar SOL a USDC")}</Button></div>
    </>}
  </section>;
}
