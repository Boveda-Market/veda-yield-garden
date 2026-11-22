import { useT } from "@/lib/i18n";
import { SignalErrorCard } from "@/components/signal-error";
import { useEffect, useState , useRef} from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { ActivationSheet } from "@/components/gas-refill-card";
import { LoaderCircle, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionSuccess } from "@/components/action-success";
import { WorkingLine } from "@/components/move-steps";
import { markTrumpTouched } from "@/lib/weekly-ad";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { useAffiliateReport } from "@/hooks/use-affiliate-report";
import { pilotDepositStatus, preparePilotDeposit } from "@/lib/pilot-deposit.functions";
import { prepareRealRebalance } from "@/lib/rebalance.functions";
import { decimalToUnits, unitsToDecimal } from "@/lib/onboarding";
import { PILOT_VAULTS, pilotInput, type PilotStatus } from "@/lib/pilot-deposit";

type Step = "idle" | "preparing" | "signing" | "confirming" | "done" | "error";
const labels: Record<Step, string> = { idle: "", preparing: "Preparando tu depósito…", signing: "Aprueba en tu billetera…", confirming: "Aprobado. Confirmando tu depósito…", done: "", error: "" };

/** Selected real deposit with fresh simulation and owner signature. */
export function PilotDeposit({ vaultId, amount: typedAmount, position, migrate, usdc, autoStart = false, onBusyChange, onClose, onDoneChange, onAmountFit, confirmLabel }: { confirmLabel?: string; onAmountFit?: (amount: string) => void; autoStart?: boolean; usdc?: bigint | undefined; vaultId: string; amount: string; position?: string | undefined; migrate?: boolean; onBusyChange: (busy: boolean) => void; onClose?: () => void; onDoneChange?: (done: boolean) => void }) {
  const t = useT();
  const { walletAddress, signAndSend } = useBovedaSession();
  const prepare = useServerFn(preparePilotDeposit);
  const prepareRebalance = useServerFn(prepareRealRebalance);
  const reportAffiliate = useAffiliateReport();
  const readStatus = useServerFn(pilotDepositStatus);
  const queryClient = useQueryClient();
  const [needsReserve, setNeedsReserve] = useState(false);
  // After the activation is paid from the same dollars, the deposit shrinks to what is left.
  const [fitted, setFitted] = useState<string | null>(null);
  useEffect(() => { setFitted(null); }, [typedAmount]);
  const amount = fitted ?? typedAmount;
  const [charge, setCharge] = useState<{ feeMicro: bigint; reserveMicro: bigint } | null>(null);
  const runRef = useRef<(auto?: boolean) => Promise<void>>(async () => {});
  const [step, setStep] = useState<Step>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [status, setStatus] = useState<PilotStatus | null>(null);
  const eligible = (PILOT_VAULTS as readonly string[]).includes(vaultId);
  const busy = step === "preparing" || step === "signing" || step === "confirming";
  const depositMicro = decimalToUnits(amount.replace(/,/g, "") || "0", 6) ?? undefined;
  const valid = pilotInput.safeParse({ wallet: walletAddress, vaultId, amount, ...(position ? { position } : {}), ...(migrate ? { migrate: true } : {}) });
  useEffect(() => { setMessage(null); }, [typedAmount, walletAddress]);
  useEffect(() => { onBusyChange(busy); }, [busy, onBusyChange]);
  useEffect(() => { onDoneChange?.(step === "done"); }, [step, onDoneChange]);

  // Migration step 2 runs on its own: the user already approved the move.
  const autoRan = useRef(false);
  useEffect(() => { if (autoStart && !autoRan.current && walletAddress && valid.success && step === "idle") { autoRan.current = true; void run(true); } }); // eslint-disable-line react-hooks/exhaustive-deps

  runRef.current = (a?: boolean) => run(a);
  async function run(auto = false) {
    if (!walletAddress || busy || !eligible || !valid.success) return;
    setMessage(null); setSignature(null); setStatus(null); setStep("preparing");
    try {
      let prepared = await prepare({ data: valid.data });
      // Out-of-range position: re-centre it first (one approval), then add the new dollars to the centred position.
      if (!prepared.success && prepared.outOfRange && position && !migrate) {
        const rb = await prepareRebalance({ data: { wallet: walletAddress, position, vaultId: vaultId as never, prepare: true } });
        if (!rb.success || !rb.prepared) { setStep("error"); setMessage(`${rb.message} ${t("No se movió dinero.")}`); return; }
        setStep("signing");
        let rbSig: string;
        try { rbSig = await signAndSend(Uint8Array.from(atob(rb.prepared.transaction), (c) => c.charCodeAt(0))); }
        catch { setStep("error"); setMessage(t("Cancelaste la aprobación. No se movió dinero.")); return; }
        setStep("confirming"); 
        let ok = false;
        for (let attempt = 0; attempt < 40 && !ok; attempt++) {
          const { status: next } = await readStatus({ data: { signature: rbSig } }).catch(() => ({ status: "pending" as PilotStatus }));
          if (next === "failed") { setStep("error"); setMessage(t("La red rechazó el recentrado. Tu dinero sigue en tu billetera.")); return; }
          if (next !== "pending") ok = true; else await new Promise((resolve) => setTimeout(resolve, attempt < 3 ? 400 : attempt < 8 ? 800 : 2_000));
        }
        if (!ok) { setStep("error"); setMessage(t("La confirmación tarda más de lo habitual. Revisa tu billetera antes de intentarlo otra vez.")); return; }
        for (const k of ["real-solana", "my-wallet"]) void queryClient.invalidateQueries({ queryKey: [k, walletAddress] });
        setStep("preparing");
        prepared = await prepare({ data: valid.data });
      }
      if (!prepared.success && prepared.stage === "reserve") { setStep("idle"); setNeedsReserve(true); return; }
      if (!prepared.success || !prepared.prepared) { setStep("error"); setMessage(`${prepared.message} ${t("No se movió dinero.")}`); return; }
      setStep("signing");
      let sig: string;
      try { sig = await signAndSend(Uint8Array.from(atob(prepared.prepared.transaction), (c) => c.charCodeAt(0))); }
      catch (error) {
        const detail = error instanceof Error ? error.message.slice(0, 160) : "";
        console.error("[pilot-deposit] wallet", detail);
        setStep("error"); setMessage(t("Cancelaste la aprobación. No se movió dinero.")); return;
      }
      setSignature(sig); setStep("confirming"); 
      await new Promise((resolve) => setTimeout(resolve, 400));
      for (let attempt = 0; attempt < 40; attempt++) {
        const { status: next } = await readStatus({ data: { signature: sig } }).catch(() => ({ status: "pending" as PilotStatus }));
        setStatus(next);
        if (next === "failed") { setStep("error"); setMessage(t("La red rechazó el depósito. Tu dinero sigue en tu billetera.")); return; }
        if (next !== "pending") { setStep("done"); void reportAffiliate(sig, "deposit", { amountUsd: amount.replace(/,/g, ""), vault: vaultId.toUpperCase().slice(0, 20) }); for (const k of ["real-solana", "my-wallet", "my-wallet-tokens", "meteora-history", "start-guide"]) void queryClient.invalidateQueries({ queryKey: [k, walletAddress] }); return; }
        await new Promise((resolve) => setTimeout(resolve, attempt < 3 ? 400 : attempt < 8 ? 800 : 2_000));
      }
      setStep("error"); setMessage(t("La confirmación tarda más de lo habitual. Revisa tu billetera antes de intentarlo otra vez."));
    } catch { setStep("error"); setMessage(t("No se pudo preparar el depósito. No se movió dinero.")); }
  }

  if (!eligible) return <p className="border-t border-border pt-4 text-xs text-muted-foreground">{t("Los depósitos no están disponibles para esta bóveda.")}</p>;
  if (step === "done" && vaultId === "trump") markTrumpTouched();
  if (step === "done") return <>
    <p role="status" className="sr-only">{t("Depósito confirmado en la red (")}{t(status === "finalized" ? "finalizado" : "confirmado")}).</p>
    <ActionSuccess title={migrate ? t("¡Cambio de bóveda listo!") : t("¡Depósito exitoso!")} body={migrate ? t("Lo que moviste ya está generando en la nueva bóveda.") : t("Tu posición ya está generando intereses. Puedes cosecharlos cuando quieras desde tu Portafolio.")} amount={{ value: amount, unit: "$" }} details={[{ label: t("Operación"), value: migrate ? t("Cambio de bóveda") : t("Depósito en bóveda") }, { label: t("Destino"), value: t("Bóveda {v}", { v: vaultId.toUpperCase() }) }, ...(charge ? [{ label: t("Cargo por servicio de activación"), value: `$${(Number(charge.feeMicro) / 1e6).toFixed(2)}` }, { label: t("Reserva de operaciones"), value: `$${(Number(charge.reserveMicro) / 1e6).toFixed(2)}` }] : [])]} signature={signature} onClose={() => { if (onClose) onClose(); else setStep("idle"); }} />
  </>;
  return <section aria-labelledby="pilot-title" className="grid gap-3 text-sm">
    <h3 id="pilot-title" className="sr-only">{t("Confirmar depósito")}</h3>
    {!walletAddress ? <p className="text-xs text-muted-foreground">{t("Inicia sesión con una wallet para firmar.")}</p> : <>
      {busy && <WorkingLine text={t(labels[step])} />}
      {step === "error" && message && <SignalErrorCard message={message} />}
      <Button size="lg" disabled={busy || !valid.success} onClick={() => void run()}>{busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <PenLine className="mr-2 h-4 w-4" />}{busy ? t(labels[step]) : step === "error" ? t("Intentar de nuevo") : confirmLabel ?? t("Confirmar y depositar")}</Button>
    </>}
    {walletAddress && <ActivationSheet open={needsReserve} usdc={usdc ?? 0n} {...(depositMicro != null ? { depositMicro } : {})} autoActivate resume={{ vaultId, amount, ...(position ? { position } : {}), ...(migrate ? { migrate: true } : {}) }} onClose={() => setNeedsReserve(false)} onActivated={(adj, ch) => { setNeedsReserve(false); setCharge(ch ?? null); setStep("preparing"); if (adj != null && adj > 0n) { const a = unitsToDecimal(adj, 6); setFitted(a); onAmountFit?.(a); } void queryClient.invalidateQueries({ queryKey: ["my-wallet", walletAddress] }); setTimeout(() => { setStep("idle"); setTimeout(() => void runRef.current(true), 0); }, 1500); }} />}
    {message && step !== "error" && <p role="alert" className="text-muted-foreground">{message}</p>}
    {signature && <a className="text-xs underline" href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noreferrer">{t("Ver comprobante")}</a>}
  </section>;
}
