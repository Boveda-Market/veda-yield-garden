import { useT } from "@/lib/i18n";
import { useEffect, useState , useRef} from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPoolStats } from "@/lib/pool-stats";
import { VAULTS } from "@/lib/vaults";
import { GAS_DEPOSIT_TARGET_LAMPORTS, GAS_VAULT_TARGET_LAMPORTS } from "@/lib/gas-refill";
import { CHAIN_POOLS } from "@/lib/solana-data";
import { LoaderCircle, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ActionSuccess } from "@/components/action-success";
import { notify } from "@/lib/notify";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { useAffiliateReport } from "@/hooks/use-affiliate-report";
import { pilotDepositStatus, preparePilotDeposit } from "@/lib/pilot-deposit.functions";
import { prepareGasRefill } from "@/lib/gas-refill.functions";
import { unitsToDecimal } from "@/lib/onboarding";
import { PILOT_VAULTS, pilotInput, type PilotStatus } from "@/lib/pilot-deposit";

type Step = "idle" | "preparing" | "signing" | "confirming" | "done" | "error";
const labels: Record<Step, string> = { idle: "", preparing: "Preparando tu depósito…", signing: "Esperando tu firma en la wallet…", confirming: "Enviada. Esperando confirmación en la red…", done: "", error: "" };

/** Selected real deposit with fresh simulation and owner signature. */
export function PilotDeposit({ vaultId, amount, position, migrate, autoStart = false, onBusyChange, onClose, onDoneChange }: { autoStart?: boolean; vaultId: string; amount: string; position?: string | undefined; migrate?: boolean; onBusyChange: (busy: boolean) => void; onClose?: () => void; onDoneChange?: (done: boolean) => void }) {
  const t = useT();
  const { walletAddress, signAndSend } = useBovedaSession();
  const prepare = useServerFn(preparePilotDeposit);
  const reportAffiliate = useAffiliateReport();
  const readStatus = useServerFn(pilotDepositStatus);
  const prepareRefill = useServerFn(prepareGasRefill);
  const [needsReserve, setNeedsReserve] = useState(false);
  const solPool = VAULTS.find((v) => v.id === "sol")?.pool ?? "";
  const solStats = useQuery({ queryKey: ["dexscreener-pool-stats", solPool], queryFn: ({ signal }) => fetchPoolStats(solPool, signal), enabled: needsReserve && Boolean(solPool), staleTime: 60_000, retry: 1 });
  // Range vaults lock a larger refundable guarantee than regular vaults.
  const rangeVault = CHAIN_POOLS.some((p) => p.id === vaultId && "kind" in p && p.kind === "dlmm");
  const reserveTarget = rangeVault ? GAS_VAULT_TARGET_LAMPORTS : GAS_DEPOSIT_TARGET_LAMPORTS;
  const guaranteeUsd = solStats.data?.price ? Math.ceil(Number(reserveTarget) / 1e9 * solStats.data.price * 1.06) : null;
  const queryClient = useQueryClient();
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
  useEffect(() => { onDoneChange?.(step === "done"); }, [step, onDoneChange]);

  // Migration step 2 runs on its own: the user already approved the move.
  const autoRan = useRef(false);
  useEffect(() => { if (autoStart && !autoRan.current && walletAddress && valid.success && step === "idle") { autoRan.current = true; void run(true); } }); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(auto = false) {
    if (!walletAddress || (!accepted && !auto) || busy || !eligible || !valid.success) return;
    setMessage(null); setSignature(null); setStatus(null); setStep("preparing");
    try {
      const prepared = await prepare({ data: valid.data });
      if (!prepared.success && prepared.stage === "reserve") { setStep("idle"); setNeedsReserve(true); return; }
      if (!prepared.success || !prepared.prepared) { setStep("error"); setMessage(`${prepared.message} No se pidió ninguna firma.`); return; }
      setStep("signing");
      let sig: string;
      try { sig = await signAndSend(Uint8Array.from(atob(prepared.prepared.transaction), (c) => c.charCodeAt(0))); }
      catch (error) {
        const detail = error instanceof Error ? error.message.slice(0, 160) : "";
        console.error("[pilot-deposit] wallet", detail);
        setStep("error"); setMessage(`La firma se canceló o la wallet rechazó la transacción. No se envió nada desde BÓVEDA.${detail ? ` Detalle: ${detail}` : ""}`); return;
      }
      setSignature(sig); setStep("confirming"); notify("secure", t("Firma aprobada"), t("Confirmando en la red…"));
      await new Promise((resolve) => setTimeout(resolve, 400));
      for (let attempt = 0; attempt < 40; attempt++) {
        const { status: next } = await readStatus({ data: { signature: sig } }).catch(() => ({ status: "pending" as PilotStatus }));
        setStatus(next);
        if (next === "failed") { setStep("error"); setMessage(t("La red rechazó la transacción; al ser atómica, no se aplicaron ni la comisión ni el depósito (solo el coste de red).")); return; }
        if (next !== "pending") { setStep("done"); notify("success", t("Depósito confirmado"), t("Tus dólares ya están rindiendo")); void reportAffiliate(sig, "deposit"); for (const k of ["real-solana", "my-wallet", "my-wallet-tokens", "meteora-history", "start-guide"]) void queryClient.invalidateQueries({ queryKey: [k, walletAddress] }); return; }
        await new Promise((resolve) => setTimeout(resolve, attempt < 3 ? 400 : attempt < 8 ? 800 : 2_000));
      }
      setStep("error"); setMessage(t("La confirmación tarda más de lo habitual. Revisa el estado en Helius antes de reintentar."));
    } catch { setStep("error"); setMessage(t("No se pudo preparar el depósito. No se pidió ninguna firma.")); }
  }

  /** Tops the reserve up to the vault guarantee from the user's dollars (treasury pays the network fee), then retries the deposit. */
  async function fundReserve() {
    if (!walletAddress || busy) return;
    setMessage(null); setStep("preparing");
    try {
      const r = await prepareRefill({ data: { wallet: walletAddress, target: rangeVault ? "vault" : "deposit" } });
      if (!r.success) { setStep("error"); setMessage(t(r.error)); return; }
      setStep("signing");
      await signAndSend(Uint8Array.from(atob(r.transaction), (c) => c.charCodeAt(0)));
      notify("success", t("Garantía lista"), t("Usamos ${usd} de tus dólares", { usd: unitsToDecimal(BigInt(r.chargeMicro), 6) }));
      setNeedsReserve(false); setStep("idle");
      void queryClient.invalidateQueries({ queryKey: ["my-wallet", walletAddress] });
      await new Promise((resolve) => setTimeout(resolve, 1_500));
      await run(autoStart);
    } catch { setStep("error"); setMessage(t("No se pudo preparar la garantía. No se movió dinero.")); }
  }

  if (!eligible) return <p className="border-t border-border pt-4 text-xs text-muted-foreground">{t("Los depósitos no están disponibles para esta bóveda.")}</p>;
  if (step === "done") return <>
    <p role="status" className="sr-only">{t("Depósito confirmado en la red (")}{status === "finalized" ? "finalizado" : "confirmado"}).</p>
    <ActionSuccess title={t("¡Depósito exitoso!")} body={t("Tu posición ya está generando comisiones. Puedes cosecharlas cuando quieras desde tu Portafolio.")} amount={{ value: amount, unit: "USDC" }} details={[{ label: t("Operación"), value: t("Depósito en bóveda") }, { label: t("Destino"), value: t("Bóveda {v}", { v: vaultId.toUpperCase() }) }]} signature={signature} onClose={() => { if (onClose) onClose(); else setStep("idle"); }} />
  </>;
  return <section aria-labelledby="pilot-title" className="grid gap-3 text-sm">
    <h3 id="pilot-title" className="sr-only">{t("Confirmar depósito")}</h3>
    {!walletAddress ? <p className="text-xs text-muted-foreground">{t("Inicia sesión con una wallet para firmar.")}</p> : <>
      <label className="flex items-start gap-3 text-xs leading-5 text-muted-foreground"><Checkbox checked={accepted} disabled={busy || !valid.success} onCheckedChange={(value) => setAccepted(value === true)} aria-label={t("Acepto el depósito real")} /><span>{t("Revisé el importe y entiendo que el depósito no se puede revertir; retirar o cosechar tiene una comisión según el monto.")}</span></label>
      <Button size="lg" disabled={!accepted || busy || !valid.success} onClick={() => void run()}>{busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <PenLine className="mr-2 h-4 w-4" />}{busy ? labels[step] : t("Confirmar y depositar")}</Button>
      {!busy && <p className="text-center text-xs text-muted-foreground">{t("Tu wallet te pedirá aprobar la operación.")}</p>}
    </>}
    {needsReserve && <div role="status" className="rounded-xl border border-primary/40 bg-primary/5 p-3 text-xs leading-5">
      <p className="font-semibold text-foreground">{t("Esta bóveda necesita una garantía de apertura")}</p>
      <p className="mt-1 text-muted-foreground">{guaranteeUsd === null ? t("Apartamos una pequeña parte de tus dólares en tu reserva de operaciones. Casi todo vuelve a ti cuando cierras la posición.") : t("Apartamos hasta unos ${usd} de tus dólares en tu reserva de operaciones. Casi todo vuelve a ti cuando cierras la posición.", { usd: String(guaranteeUsd) })}</p>
      <Button className="mt-3 w-full" disabled={busy} onClick={() => void fundReserve()}>{busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}{busy ? t(labels[step]) : t("Preparar garantía y depositar")}</Button>
    </div>}
    {message && <p role="alert" className="text-destructive">{message}</p>}
    {signature && <p className="break-all text-xs">{t("Transacción:")}{" "}<a className="underline" href={`https://orbmarkets.io/tx/${signature}`} target="_blank" rel="noreferrer">{t("ver en Helius")}</a></p>}
  </section>;
}
