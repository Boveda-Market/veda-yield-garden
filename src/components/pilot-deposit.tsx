import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, LoaderCircle, PenLine } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dismissible } from "@/components/dismissible";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { useAffiliateReport } from "@/hooks/use-affiliate-report";
import { pilotDepositStatus, preparePilotDeposit } from "@/lib/pilot-deposit.functions";
import { PILOT_VAULTS, pilotInput, type PilotStatus } from "@/lib/pilot-deposit";

type Step = "idle" | "preparing" | "signing" | "confirming" | "done" | "error";
const labels: Record<Step, string> = { idle: "", preparing: "Preparando tu depósito…", signing: "Esperando tu firma en la wallet…", confirming: "Enviada. Esperando confirmación en la red…", done: "", error: "" };

/** Selected real deposit with fresh simulation and owner signature. */
export function PilotDeposit({ vaultId, amount, position, migrate, onBusyChange, onClose }: { vaultId: string; amount: string; position?: string | undefined; migrate?: boolean; onBusyChange: (busy: boolean) => void; onClose?: () => void }) {
  const t = useT();
  const { walletAddress, signAndSend } = useBovedaSession();
  const prepare = useServerFn(preparePilotDeposit);
  const reportAffiliate = useAffiliateReport();
  const readStatus = useServerFn(pilotDepositStatus);
  const [accepted, setAccepted] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [status, setStatus] = useState<PilotStatus | null>(null);
  const eligible = (PILOT_VAULTS as readonly string[]).includes(vaultId);
  const busy = step === "preparing" || step === "signing" || step === "confirming";
  const valid = pilotInput.safeParse({ wallet: walletAddress, vaultId, amount, ...(position ? { position } : {}), ...(migrate ? { migrate: true } : {}) });
  useEffect(() => { setAccepted(false); setMessage(null); }, [amount, walletAddress]);
  useEffect(() => { onBusyChange(busy); }, [busy, onBusyChange]);

  async function run() {
    if (!walletAddress || !accepted || busy || !eligible || !valid.success) return;
    setMessage(null); setSignature(null); setStatus(null); setStep("preparing");
    try {
      const prepared = await prepare({ data: valid.data });
      if (!prepared.success || !prepared.prepared) { setStep("error"); setMessage(`${prepared.message} No se pidió ninguna firma.`); return; }
      setStep("signing");
      let sig: string;
      try { sig = await signAndSend(Uint8Array.from(atob(prepared.prepared.transaction), (c) => c.charCodeAt(0))); }
      catch (error) {
        const detail = error instanceof Error ? error.message.slice(0, 160) : "";
        console.error("[pilot-deposit] wallet", detail);
        setStep("error"); setMessage(`La firma se canceló o la wallet rechazó la transacción. No se envió nada desde BÓVEDA.${detail ? ` Detalle: ${detail}` : ""}`); return;
      }
      setSignature(sig); setStep("confirming");
      for (let attempt = 0; attempt < 30; attempt++) {
        const { status: next } = await readStatus({ data: { signature: sig } }).catch(() => ({ status: "pending" as PilotStatus }));
        setStatus(next);
        if (next === "failed") { setStep("error"); setMessage(t("La red rechazó la transacción; al ser atómica, no se aplicaron ni la comisión ni el depósito (solo el coste de red).")); return; }
        if (next !== "pending") { setStep("done"); void reportAffiliate(sig, "deposit"); return; }
        await new Promise((resolve) => setTimeout(resolve, 2_000));
      }
      setStep("error"); setMessage(t("La confirmación tarda más de lo habitual. Revisa el estado en Helius antes de reintentar."));
    } catch { setStep("error"); setMessage(t("No se pudo preparar el depósito. No se pidió ninguna firma.")); }
  }

  if (!eligible) return <p className="border-t border-border pt-4 text-xs text-muted-foreground">{t("Los depósitos no están disponibles para esta bóveda.")}</p>;
  if (step === "done") return <Dismissible onDismiss={() => { if (onClose) onClose(); else setStep("idle"); }} className="rounded-xl bg-primary/10 text-primary"><section className="grid justify-items-center gap-3 p-6 text-center text-sm text-foreground">
    <CheckCircle2 className="h-12 w-12 text-primary motion-safe:animate-in motion-safe:zoom-in" aria-hidden />
    <h3 className="font-display text-xl font-bold">{t("¡Depósito exitoso!")}</h3><p className="mt-2 flex items-center justify-center gap-2 text-sm text-primary"><span className="h-2 w-2 animate-pulse rounded-full bg-primary" />{t("Tu depósito ya está en marcha y empezó a acumular ganancias. Míralas crecer en tu Portafolio.")}</p>
    <p role="status" className="sr-only">{t("Depósito confirmado en la red (")}{status === "finalized" ? "finalizado" : "confirmado"}).</p>
    <p className="text-muted-foreground">{t("Tu posición ya está generando comisiones. Puedes cosecharlas cuando quieras desde tu Portafolio.")}</p>
    <Button asChild className="w-full"><Link to="/portfolio" onClick={onClose}>{t("Ver en mi Portafolio")}</Link></Button>
    <Link to="/wallet" onClick={onClose} className="text-xs underline">{t("Ver en tu wallet")}</Link>
  </section></Dismissible>;
  return <section aria-labelledby="pilot-title" className="grid gap-3 text-sm">
    <h3 id="pilot-title" className="sr-only">{t("Confirmar depósito")}</h3>
    {!walletAddress ? <p className="text-xs text-muted-foreground">{t("Inicia sesión con una wallet para firmar.")}</p> : <>
      <label className="flex items-start gap-3 text-xs leading-5 text-muted-foreground"><Checkbox checked={accepted} disabled={busy || !valid.success} onCheckedChange={(value) => setAccepted(value === true)} aria-label={t("Acepto el depósito real")} /><span>{t("Revisé el importe y entiendo que el depósito no se puede revertir; retirar o cosechar tiene una comisión según el monto.")}</span></label>
      <Button size="lg" disabled={!accepted || busy || !valid.success} onClick={() => void run()}>{busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <PenLine className="mr-2 h-4 w-4" />}{busy ? labels[step] : t("Confirmar y depositar")}</Button>
      {!busy && <p className="text-center text-xs text-muted-foreground">{t("Tu wallet te pedirá aprobar la operación.")}</p>}
    </>}
    {message && <p role="alert" className="text-destructive">{message}</p>}
    {signature && <p className="break-all text-xs">{t("Transacción:")}{" "}<a className="underline" href={`https://orbmarkets.io/tx/${signature}`} target="_blank" rel="noreferrer">{t("ver en Helius")}</a></p>}
  </section>;
}
