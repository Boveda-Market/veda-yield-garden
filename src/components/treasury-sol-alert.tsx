import { useEffect, useState } from "react";
import { AlertTriangle, Copy } from "lucide-react";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { AFFILIATE_PAYOUT_WALLET } from "@/lib/affiliate";
import { readTokenBalance, SOL_MINT } from "@/lib/wallet-actions";
import { TREASURY_SOL_LOW } from "@/lib/treasury-reserve";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { treasuryTopupNow } from "@/lib/treasury-topup.functions";
import { TOPUP_TRIGGER_LAMPORTS } from "@/lib/treasury-topup";

/** Header banner in the Control Panel when the treasury SOL reserve is too low to sponsor account activations. */
export function TreasurySolAlert() {
  const t = useT();
  const [sol, setSol] = useState<bigint | null>(null);
  useEffect(() => { let on = true; const f = () => readTokenBalance(AFFILIATE_PAYOUT_WALLET, SOL_MINT).then((s) => on && setSol(s)).catch(() => {}); f(); const id = setInterval(f, 60_000); return () => { on = false; clearInterval(id); }; }, []);
  const session = useBovedaSession();
  const [busy, setBusy] = useState(false);
  async function topup() {
    setBusy(true);
    try {
      const token = await session.getAccessToken?.();
      if (!token) throw new Error();
      const r = await treasuryTopupNow({ data: { token } });
      if (!r.success) { notify("error", t(r.error)); return; }
      notify("success", t("Reserva recargada"));
      setSol(await readTokenBalance(AFFILIATE_PAYOUT_WALLET, SOL_MINT));
    } catch { notify("error", t("No se pudo hacer el cambio ahora. No se movió dinero.")); } finally { setBusy(false); }
  }
  if (sol === null || sol >= TOPUP_TRIGGER_LAMPORTS) return null;
  if (sol >= TREASURY_SOL_LOW) return <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
    <span>{t("Reserva de red de la tesorería")}: {(Number(sol) / 1e9).toFixed(4)} SOL · {t("se recarga sola con dólares de la tesorería")}</span>
    <button type="button" disabled={busy} onClick={topup} className="rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-60">{busy ? t("Convirtiendo…") : t("Convertir $10 a reserva de red")}</button>
  </div>;
  const empty = sol === 0n;
  return <div role="alert" className={`mt-5 rounded-2xl border p-4 ${empty ? "border-destructive/50 bg-destructive/10" : "border-accent bg-accent/30"}`}>
    <p className="flex items-center gap-2 font-semibold"><AlertTriangle size={18} className={empty ? "text-destructive" : ""} aria-hidden />{empty ? t("Reserva de red de la tesorería vacía") : t("Reserva de red de la tesorería baja")}: {(Number(sol) / 1e9).toFixed(4)} SOL</p>
    <p className="mt-1 text-sm text-foreground/85">{t("Las activaciones automáticas de cuentas nuevas están en pausa. Envía 0.2–0.5 SOL a la tesorería para reanudarlas.")}</p>
    <button type="button" disabled={busy} onClick={topup} className="mt-3 mr-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{busy ? t("Convirtiendo…") : t("Convertir $10 a reserva de red")}</button>
    <button type="button" onClick={() => { void navigator.clipboard.writeText(AFFILIATE_PAYOUT_WALLET); notify("success", t("Dirección copiada")); }} className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 font-mono text-xs hover:bg-secondary"><Copy size={14} aria-hidden /><span className="truncate">{AFFILIATE_PAYOUT_WALLET}</span></button>
  </div>;
}
