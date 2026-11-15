import { useEffect, useRef, useState } from "react";
import { type OperableVault } from "@/lib/solana-data";
import { notify } from "@/lib/notify";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { prepareRealCompound } from "@/lib/compound.functions";
import type { CompoundResult } from "@/lib/compound";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { pilotDepositStatus } from "@/lib/pilot-deposit.functions";
import { ActionSuccess } from "@/components/action-success";
import { WorkingLine } from "@/components/move-steps";

/**
 * Step 2 of "Reinvertir": runs on its own right after the harvest confirms (the user already approved
 * the reinvestment), adds both harvested tokens back to the same position (0% fee) and ends on the receipt.
 */
export function CompoundStep({ wallet, position, vaultId, usdcRaw, tokenRaw, netUsd, onClose, onProgress }: { wallet: string; position: string; vaultId: OperableVault; usdcRaw: string; tokenRaw: string; netUsd?: string | undefined; onClose: () => void; onProgress?: (done: boolean) => void }) {
  const t = useT();
  const prepare = useServerFn(prepareRealCompound);
  const readStatus = useServerFn(pilotDepositStatus);
  const session = useBovedaSession();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState("");
  const [quote, setQuote] = useState<CompoundResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const input = { wallet, position, vaultId, usdcRaw, tokenRaw };
  useEffect(() => { onProgress?.(done); }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  async function sign() {
    if (pending || done) return;
    setPending(true); setMessage(null); setStep(t("Preparando tu reinversión…"));
    try {
      const next = await prepare({ data: input });
      setQuote(next);
      if (!next.success || !next.prepared) { setMessage(next.message || t("No se pudo preparar la reinversión.")); return; }
      if (next.prepared.wallet !== session.walletAddress) { setMessage(t("La wallet cambió. Revisa nuevamente.")); return; }
      setStep(t("Aprueba en tu billetera (2 de 2)…"));
      let sig: string;
      try { sig = await session.signAndSend(Uint8Array.from(atob(next.prepared.transaction), (c) => c.charCodeAt(0))); }
      catch { setMessage(t("Cancelaste la aprobación. Tus ganancias siguen en tu billetera.")); return; }
      setSignature(sig); setStep(t("Sumando tus ganancias a la bóveda…"));
      for (let attempt = 0; attempt < 30; attempt++) {
        const status = await readStatus({ data: { signature: sig } }).catch(() => ({ status: "pending" as const }));
        if (status.status === "failed") { setMessage(t("La red rechazó la reinversión; tus ganancias siguen en tu billetera.")); return; }
        if (status.status !== "pending") { notify("success", t("Ganancias reinvertidas"), t("Se sumaron a tu posición")); setDone(true); await queryClient.invalidateQueries({ queryKey: ["real-solana", wallet] }); await queryClient.invalidateQueries({ queryKey: ["meteora-history", wallet] }); return; }
        await new Promise((r) => setTimeout(r, 2_000));
      }
      setMessage(t("La confirmación tarda más de lo habitual. Revisa tu billetera antes de intentarlo otra vez."));
    } catch { setMessage(t("No se pudo preparar la reinversión. Tus ganancias siguen en tu billetera.")); }
    finally { setPending(false); setStep(""); }
  }
  const ran = useRef(false);
  useEffect(() => { if (!ran.current) { ran.current = true; void sign(); } }); // eslint-disable-line react-hooks/exhaustive-deps

  if (done) return <ActionSuccess title={t("¡Ganancias reinvertidas!")} body={t("Se sumaron a tu misma bóveda y ya generan más.")} signature={signature} onClose={onClose}
    amount={netUsd ? { value: netUsd, unit: "$" } : undefined}
    details={[{ label: t("Operación"), value: t("Reinversión de ganancias") }, ...(quote?.tokenUsed && quote.tokenUsed !== "0" ? [{ label: t("También sumado"), value: `${quote.tokenUsed} ${quote.tokenSymbol}` }] : []), { label: t("Comisión de reinversión"), value: "0%" }]} />;
  return <div className="grid gap-3 text-sm">
    {pending && <WorkingLine text={step} />}
    {message && <><p role="alert">{message}</p><Button size="lg" onClick={() => void sign()}>{t("Intentar de nuevo")}</Button><Button variant="ghost" onClick={onClose}>{t("Cerrar")}</Button></>}
  </div>;
}
