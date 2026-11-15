import { useState } from "react";
import { notify } from "@/lib/notify";
import { CheckCircle2, Fuel, Loader2, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { prepareGasRefill } from "@/lib/gas-refill.functions";
import { gasIsLow, type RefillTarget } from "@/lib/gas-refill";
import { MIN_USDC_MICRO, unitsToDecimal } from "@/lib/onboarding";

/** `force` shows the card even above the low mark, for screens whose operation needs more reserve (refilled up to `target`). */
type Props = { sol: bigint | undefined; usdc: bigint | undefined; onDone?: () => void; force?: boolean; target?: RefillTarget };

/** Warns when the network reserve runs low and refills it from USDC in one signature, even at zero. */
export function GasRefillCard({ sol, usdc, onDone, force, target }: Props) {
  const t = useT();
  const session = useBovedaSession();
  const prepare = useServerFn(prepareGasRefill);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (sol === undefined || usdc === undefined || (!gasIsLow(sol) && !force && !msg)) return null;
  const empty = sol === 0n;
  const activation = empty && usdc >= MIN_USDC_MICRO;
  async function refill() {
    if (!session.walletAddress) return;
    setBusy(true); setMsg(null);
    try {
      const r = await prepare({ data: { wallet: session.walletAddress, ...(target ? { target } : {}) } });
      if (!r.success) throw new Error(r.error);
      await session.signAndSend(Uint8Array.from(atob(r.transaction), (c) => c.charCodeAt(0)));
      notify("success", t("Reserva lista"), t("Ya puedes hacer movimientos"));
      setMsg({ ok: true, text: t("Listo: tu reserva para operaciones quedó activa (${usdc} de tus dólares). Ya puedes seguir usando tu cuenta con normalidad.", { usdc: unitsToDecimal(BigInt(r.chargeMicro), 6) }) });
      setTimeout(() => onDone?.(), 3000);
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? t(e.message) : t("No se pudo completar la recarga.") }); }
    finally { setBusy(false); }
  }
  if (activation) return <section aria-label={t("Activa tu cuenta")} className="rounded-2xl border border-primary/40 bg-primary/10 p-5">
    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><CheckCircle2 size={14} />{t("Dólares recibidos")}</p>
    <h2 className="mt-2 font-display text-xl font-semibold">{t("Activa tu cuenta para operar")}</h2>
    <p className="mt-1 text-sm leading-6 text-foreground/85">{t("Tus dólares ya están en tu cuenta. Para empezar a invertir y moverte libremente, apartamos unos $2 para tus próximos movimientos. BÓVEDA cubre el costo de esta primera activación.")}</p>
    {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-2 text-sm ${msg.ok ? "text-primary" : "text-destructive"}`}>{msg.text}</p>}
    {!msg?.ok && <Button className="mt-4 w-full" disabled={busy} onClick={() => void refill()}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}{busy ? t("Activando…") : t("Activar mi cuenta")}</Button>}
    <p className="mt-2 text-xs text-muted-foreground">{t("Confirmarás con tu huella o Face ID; al terminar verás cuánto se usó.")}</p>
  </section>;
  return <section aria-label={t("Reserva para costos de red")} className={`rounded-2xl border p-4 ${empty ? "border-destructive/50 bg-destructive/10" : "border-accent bg-accent/30"}`}>
    <p className="flex items-center gap-2 font-semibold"><Fuel size={16} />{empty ? t("Te quedaste sin saldo para movimientos") : t("Te queda poco saldo para movimientos")}</p>
    <p className="mt-1 text-sm text-foreground/85">{t("Con un toque apartamos una pequeña parte de tus dólares (unos $2) para cubrir tus próximas operaciones. BÓVEDA cubre el costo de esta recarga.")}</p>
    {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-2 text-sm ${msg.ok ? "text-primary" : "text-destructive"}`}>{msg.text}</p>}
    {!msg?.ok && <Button className="mt-3 w-full" disabled={busy || usdc <= 0n} onClick={() => void refill()}>{busy ? t("Preparando recarga…") : t("Recargar reserva de operaciones")}</Button>}
    {usdc <= 0n && <p className="mt-2 text-xs text-muted-foreground">{t("Necesitas tener dólares disponibles para recargar tu reserva.")}</p>}
  </section>;
}
