import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TapAmount } from "@/components/ui/tap-amount";
import { BuyUsdc } from "@/components/buy-usdc";
import { useT } from "@/lib/i18n";
import { decimalToUnits } from "@/lib/onboarding";
import { clearPendingDeposit, clearResumeDeposit } from "@/lib/resume-deposit";
import { FIRST_DEPOSIT_PRESETS, firstDepositTotal } from "@/lib/first-deposit";
import type { Vault } from "@/lib/vaults";

const usd = (m: bigint) => `$${(Number(m) / 1e6).toFixed(2)}`;

/** Steps 1–2 of 3 for a wallet holding no dollars: pick amount → buy the exact total on Coinbase. Step 3 is the resumed deposit card. */
export function StepDots({ step }: { step: 1 | 2 | 3 }) {
  const t = useT();
  return <div className="flex items-center gap-2" aria-label={t("Paso {n} de 3", { n: String(step) })}>
    {[1, 2, 3].map((n) => <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? "bg-primary" : "bg-muted"}`} />)}
    <span className="shrink-0 text-xs font-semibold text-muted-foreground">{t("Paso {n} de 3", { n: String(step) })}</span>
  </div>;
}

export function FirstDepositSteps({ vault, amount, setAmount, fee, onClose }: { vault: Vault; amount: string; setAmount: (v: string) => void; fee: bigint; onClose: () => void }) {
  const t = useT();
  const [step, setStep] = useState<1 | 2>(1);
  const typed = decimalToUnits(amount || "0", 6);
  const valid = typed != null && typed >= 500_000n && typed <= 5_000_000_000n;
  const total = valid ? firstDepositTotal(typed, fee) : null;
  const cancel = () => { clearPendingDeposit(); clearResumeDeposit(); onClose(); };
  return <div className="grid gap-4">
    <StepDots step={step} />
    {step === 1 ? <>
      <p className="font-display text-lg font-bold">{t("¿Con cuánto quieres comenzar en {v}?", { v: t(vault.name) })}</p>
      <div className="grid gap-2 rounded-xl border border-border p-4">
        <TapAmount label={t("Cantidad ($)")} prefix="$" value={amount} onChange={(v) => setAmount(v.replace(/,/g, ".").replace(/[^\d.]/g, ""))} />
        <div className="grid grid-cols-4 gap-2">{FIRST_DEPOSIT_PRESETS.map((v) => <Button key={v} type="button" size="sm" variant={amount === v ? "default" : "secondary"} onClick={() => setAmount(v)}>${v}</Button>)}</div>
        <p className="text-xs text-muted-foreground">{t("Entre $0.50 y $5,000.")}</p>
      </div>
      {total != null && typed != null && <dl className="grid gap-2 rounded-xl bg-muted p-4 text-sm">
        <div className="flex justify-between"><dt className="text-muted-foreground">{t("Para tu bóveda")}</dt><dd className="tabular-nums">{usd(typed)}</dd></div>
        {fee > 0n && <div className="flex justify-between"><dt className="text-muted-foreground">{t("Activación de cuenta digital (única vez)")}</dt><dd className="tabular-nums">+{usd(fee)}</dd></div>}
        <div className="flex justify-between border-t border-border pt-2 font-semibold"><dt>{t("Total a fondear")}</dt><dd className="tabular-nums">{usd(total)}</dd></div>
      </dl>}
    </> : <>
      <p className="font-display text-lg font-bold">{t("Añade {x} con Coinbase", { x: total != null ? usd(total) : "" })}</p>
      <p className="text-sm text-muted-foreground">{t("Coinbase se abre con el monto ya puesto. Al volver, te mostramos el precio actualizado y confirmas en un toque.")}</p>
    </>}
    <div data-sheet-actions="" className="sticky -bottom-5 z-10 -mx-5 -mb-5 grid gap-2 border-t border-border bg-background/95 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:-bottom-6 sm:-mx-6 sm:-mb-6 sm:px-6 sm:pb-6">
      {step === 1 ? <div className="grid grid-cols-[auto_1fr] gap-2">
        <Button type="button" variant="outline" size="lg" onClick={cancel}>{t("Cancelar")}</Button>
        <Button type="button" size="lg" disabled={total == null} onClick={() => setStep(2)}>{t("Continuar")}</Button>
      </div> : <>
        {total != null && <BuyUsdc className="w-full" resume={{ vaultId: vault.id, amount }} needMicro={total} label={t("Continuar a Coinbase ({x})", { x: usd(total) })} />}
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="ghost" onClick={() => setStep(1)}>{t("Atrás")}</Button>
          <Button type="button" variant="outline" onClick={cancel}>{t("Cancelar")}</Button>
        </div>
      </>}
    </div>
  </div>;
}
