import { useEffect, useState } from "react";
import { AlertTriangle, Copy } from "lucide-react";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { AFFILIATE_PAYOUT_WALLET } from "@/lib/affiliate";
import { readTokenBalance, SOL_MINT } from "@/lib/wallet-actions";
import { TREASURY_SOL_LOW } from "@/lib/treasury-reserve";

/** Header banner in the Control Panel when the treasury SOL reserve is too low to sponsor account activations. */
export function TreasurySolAlert() {
  const t = useT();
  const [sol, setSol] = useState<bigint | null>(null);
  useEffect(() => { let on = true; const f = () => readTokenBalance(AFFILIATE_PAYOUT_WALLET, SOL_MINT).then((s) => on && setSol(s)).catch(() => {}); f(); const id = setInterval(f, 60_000); return () => { on = false; clearInterval(id); }; }, []);
  if (sol === null || sol >= TREASURY_SOL_LOW) return null;
  const empty = sol === 0n;
  return <div role="alert" className={`mt-5 rounded-2xl border p-4 ${empty ? "border-destructive/50 bg-destructive/10" : "border-accent bg-accent/30"}`}>
    <p className="flex items-center gap-2 font-semibold"><AlertTriangle size={18} className={empty ? "text-destructive" : ""} aria-hidden />{empty ? t("Reserva de red de la tesorería vacía") : t("Reserva de red de la tesorería baja")}: {(Number(sol) / 1e9).toFixed(4)} SOL</p>
    <p className="mt-1 text-sm text-foreground/85">{t("Las activaciones automáticas de cuentas nuevas están en pausa. Envía 0.2–0.5 SOL a la tesorería para reanudarlas.")}</p>
    <button type="button" onClick={() => { void navigator.clipboard.writeText(AFFILIATE_PAYOUT_WALLET); notify("success", t("Dirección copiada")); }} className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 font-mono text-xs hover:bg-secondary"><Copy size={14} aria-hidden /><span className="truncate">{AFFILIATE_PAYOUT_WALLET}</span></button>
  </div>;
}
