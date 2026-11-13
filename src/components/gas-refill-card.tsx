import { useState } from "react";
import { Fuel } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { prepareGasRefill } from "@/lib/gas-refill.functions";
import { gasIsLow, GAS_TARGET_LAMPORTS } from "@/lib/gas-refill";
import { unitsToDecimal } from "@/lib/onboarding";

type Props = { sol: bigint | undefined; usdc: bigint | undefined; onDone?: () => void };

/** Warns when the network reserve runs low and refills it from USDC in one signature, even at zero. */
export function GasRefillCard({ sol, usdc, onDone }: Props) {
  const t = useT();
  const session = useBovedaSession();
  const prepare = useServerFn(prepareGasRefill);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (sol === undefined || usdc === undefined || (!gasIsLow(sol) && !msg)) return null;
  const empty = sol === 0n;
  async function refill() {
    if (!session.walletAddress) return;
    setBusy(true); setMsg(null);
    try {
      const r = await prepare({ data: { wallet: session.walletAddress } });
      if (!r.success) throw new Error(r.error);
      await session.signAndSend(Uint8Array.from(atob(r.transaction), (c) => c.charCodeAt(0)));
      setMsg({ ok: true, text: t("Listo: recargaste {sol} SOL por {usdc} USDC. Ya puedes seguir operando.", { sol: unitsToDecimal(BigInt(r.lamports), 9), usdc: unitsToDecimal(BigInt(r.chargeMicro), 6) }) });
      setTimeout(() => onDone?.(), 3000);
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? t(e.message) : t("No se pudo completar la recarga.") }); }
    finally { setBusy(false); }
  }
  return <section aria-label={t("Reserva para costos de red")} className={`rounded-2xl border p-4 ${empty ? "border-destructive/50 bg-destructive/10" : "border-accent bg-accent/30"}`}>
    <p className="flex items-center gap-2 font-semibold"><Fuel size={16} />{empty ? t("Te quedaste sin reserva para costos de red") : t("Te queda poca reserva para costos de red")}</p>
    <p className="mt-1 text-sm text-foreground/85">{t("Con un toque cambiamos una parte pequeña de tus USDC para dejar {sol} SOL de reserva. Funciona aunque tengas 0 SOL: BÓVEDA paga la red de esta recarga.", { sol: unitsToDecimal(GAS_TARGET_LAMPORTS, 9) })}</p>
    {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-2 text-sm ${msg.ok ? "text-primary" : "text-destructive"}`}>{msg.text}</p>}
    {!msg?.ok && <Button className="mt-3 w-full" disabled={busy || usdc <= 0n} onClick={() => void refill()}>{busy ? t("Preparando recarga…") : t("Recargar reserva con USDC")}</Button>}
    {usdc <= 0n && <p className="mt-2 text-xs text-muted-foreground">{t("Necesitas algunos USDC en tu wallet para recargar.")}</p>}
  </section>;
}
