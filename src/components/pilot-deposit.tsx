import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { pilotDepositStatus, preparePilotDeposit } from "@/lib/pilot-deposit.functions";
import { PILOT_VAULTS, pilotInput, type PilotStatus } from "@/lib/pilot-deposit";

type Step = "idle" | "preparing" | "signing" | "confirming" | "done" | "error";
const labels: Record<Step, string> = { idle: "", preparing: "Preparando tu depósito…", signing: "Esperando tu firma en la wallet…", confirming: "Enviada. Esperando confirmación en la red…", done: "", error: "" };

/** Selected real deposit with fresh simulation and owner signature. */
export function PilotDeposit({ vaultId, amount, onBusyChange }: { vaultId: string; amount: string; onBusyChange: (busy: boolean) => void }) {
  const t = useT();
  const { walletAddress, signAndSend } = useBovedaSession();
  const prepare = useServerFn(preparePilotDeposit);
  const readStatus = useServerFn(pilotDepositStatus);
  const [accepted, setAccepted] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [status, setStatus] = useState<PilotStatus | null>(null);
  const eligible = (PILOT_VAULTS as readonly string[]).includes(vaultId);
  const busy = step === "preparing" || step === "signing" || step === "confirming";
  const valid = pilotInput.safeParse({ wallet: walletAddress, vaultId, amount });
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
        if (next !== "pending") { setStep("done"); return; }
        await new Promise((resolve) => setTimeout(resolve, 2_000));
      }
      setStep("error"); setMessage(t("La confirmación tarda más de lo habitual. Revisa el estado en Solscan antes de reintentar."));
    } catch { setStep("error"); setMessage(t("No se pudo preparar el depósito. No se pidió ninguna firma.")); }
  }

  if (!eligible) return <p className="border-t border-border pt-4 text-xs text-muted-foreground">{t("Los depósitos no están disponibles para esta bóveda.")}</p>;
  return <section aria-labelledby="pilot-title" className="grid gap-3 border-t border-border pt-4 text-sm">
    <h3 id="pilot-title" className="font-semibold">{t("Depósito real · hasta 10,000 USDC")}</h3>
    <p role="note" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs leading-5">{t("Red principal con dinero real. Entre 1 y 10,000 USDC por depósito, comisión de entrada 0%; comisión de salida 1%.")}{" "}<strong>{t("Puedes cosechar y liquidar tus posiciones compatibles de SOL y MET. La liquidez bloqueada no se puede liquidar.")}</strong> {t("La posición queda en tu wallet como NFT de posición. Necesitas unos 0.015 SOL para las cuentas del pool y los costes de red y creación de cuentas, independientes de la comisión operativa.")}</p>
    {!walletAddress ? <p className="text-xs text-muted-foreground">{t("Inicia sesión con una wallet para firmar.")}</p> : <>
      <label className="flex items-start gap-3 text-xs leading-5"><Checkbox checked={accepted} disabled={busy || !valid.success} onCheckedChange={(value) => setAccepted(value === true)} aria-label={t("Acepto el depósito real")} /><span>{t("Acepto depositar")}{" "}{valid.success ? valid.data.amount : t("el importe indicado")} {t("USDC reales, la entrada al 0% y la salida al 1%. Entiendo que la transacción no se puede revertir y que cada cosecha o liquidación requiere una nueva revisión y mi firma.")}</span></label>
      <Button disabled={!accepted || busy || !valid.success} onClick={() => void run()}>{busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <PenLine className="mr-2 h-4 w-4" />}{busy ? labels[step] : t("Firmar depósito real")}</Button>
    </>}
    {step === "done" && <p role="status" className="font-semibold">{t("Depósito confirmado en la red (")}{status === "finalized" ? "finalizado" : "confirmado"}).</p>}
    {message && <p role="alert" className="text-destructive">{message}</p>}
    {signature && <p className="break-all text-xs">{t("Transacción:")}{" "}<a className="underline" href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noreferrer">{t("ver en Solscan")}</a></p>}
  </section>;
}
