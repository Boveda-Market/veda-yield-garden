import { useState } from "react";
import { vaultSymbol, type OperableVault } from "@/lib/solana-data";
import { notify } from "@/lib/notify";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Repeat, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { prepareRealCompound } from "@/lib/compound.functions";
import type { CompoundResult } from "@/lib/compound";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { pilotDepositStatus } from "@/lib/pilot-deposit.functions";

/** Step 2 of compound: add both harvested tokens to the same position (0% fee). */
export function CompoundStep({ wallet, position, vaultId, usdcRaw, tokenRaw }: { wallet: string; position: string; vaultId: OperableVault; usdcRaw: string; tokenRaw: string }) {
  const t = useT();
  const prepare = useServerFn(prepareRealCompound);
  const readStatus = useServerFn(pilotDepositStatus);
  const session = useBovedaSession();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [quote, setQuote] = useState<CompoundResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const input = { wallet, position, vaultId, usdcRaw, tokenRaw };

  async function review() {
    setPending(true); setMessage(null);
    try { const next = await prepare({ data: input }); setQuote(next); if (!next.success) setMessage(next.message); }
    catch { setMessage(t("No se pudo preparar la reinversión. No se firmó ni envió nada.")); }
    finally { setPending(false); }
  }
  async function sign() {
    if (pending || done) return;
    setPending(true); setMessage(null);
    try {
      const next = await prepare({ data: input });
      setQuote(next);
      if (!next.success || !next.prepared) { setMessage(next.message); return; }
      if (next.prepared.wallet !== session.walletAddress) { setMessage(t("La wallet cambió. Revisa nuevamente.")); return; }
      let sig: string;
      try { sig = await session.signAndSend(Uint8Array.from(atob(next.prepared.transaction), (c) => c.charCodeAt(0))); }
      catch { setMessage(t("La wallet canceló o rechazó la solicitud.")); return; }
      setSignature(sig);
      for (let attempt = 0; attempt < 30; attempt++) {
        const status = await readStatus({ data: { signature: sig } }).catch(() => ({ status: "pending" as const }));
        if (status.status === "failed") { setMessage(t("La red rechazó la reinversión; tus monedas siguen en tu wallet.")); return; }
        if (status.status !== "pending") { notify("success", t("Ganancias reinvertidas"), t("Se sumaron a tu posición")); setDone(true); await queryClient.invalidateQueries({ queryKey: ["real-solana", wallet] }); await queryClient.invalidateQueries({ queryKey: ["meteora-history", wallet] }); return; }
        await new Promise((r) => setTimeout(r, 2_000));
      }
      setMessage(t("Confirmación pendiente. Revisa el comprobante antes de reintentar."));
    } catch { setMessage(t("No se pudo preparar la reinversión. No se firmó ni envió nada.")); }
    finally { setPending(false); }
  }

  if (done) return <div role="status" className="grid gap-2 rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm">
    <p className="font-semibold">{t("¡Ganancias reinvertidas!")}</p>
    <p className="text-muted-foreground">{t("Se sumaron a tu misma posición.")}</p>
    {signature && <a href={`https://orbmarkets.io/tx/${signature}`} target="_blank" rel="noreferrer" className="text-xs underline">{t("Ver comprobante")}</a>}
  </div>;

  return <div className="grid gap-3 text-sm">
    {!quote?.success && <Button size="lg" disabled={pending} onClick={() => void review()}>{pending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Repeat className="mr-2 h-4 w-4" />}{t("Paso 2: revisar reinversión")}</Button>}
    {quote?.success && <>
      <dl className="grid gap-2 rounded-xl border border-border p-4">
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Se suma a tu posición")}</dt><dd>{quote.usdcUsed} USDC + {quote.tokenUsed} {quote.tokenSymbol}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Comisión")}</dt><dd>0%</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Se queda en tu wallet")}</dt><dd>{quote.usdcLeft} USDC · {quote.tokenLeft} {quote.tokenSymbol}</dd></div>
      </dl>
      <p className="text-xs leading-5 text-muted-foreground">{t("La bóveda usa las dos monedas en proporción; lo que sobra se queda en tu wallet. El costo de red se paga en SOL.")}</p>
      <Button size="lg" disabled={pending} onClick={() => void sign()}>{pending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <PenLine className="mr-2 h-4 w-4" />}{t("Firmar reinversión")}</Button>
    </>}
    {message && <p role="alert">{message}</p>}
  </div>;
}
