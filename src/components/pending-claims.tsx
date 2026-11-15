import { useCallback, useState } from "react";
import { notify } from "@/lib/notify";
import { useQueryClient } from "@tanstack/react-query";
import { usePredictPositions } from "@/lib/predict-positions-query";
import { Gift, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TokenIcon } from "@/components/token-icon";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { ActionSuccess } from "@/components/action-success";
import { ProgressSteps, WorkingLine } from "@/components/move-steps";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { useT } from "@/lib/i18n";
import { assetOfTitle, positionWon, type PredictPosition } from "@/lib/predict";
import { executePredict, preparePredictClaim } from "@/lib/predict.functions";
import { buildSwap, JUPUSD_MINT, quoteSwap, readTokenBalance } from "@/lib/wallet-actions";
import { annotateRecord } from "@/lib/predict-history";
import { predictClaimFee } from "@/lib/fees";
import { useAffiliateReport } from "@/hooks/use-affiliate-report";

const usdc = (m: string | bigint) => (Number(m) / 1e6).toFixed(2);
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const toB64 = (b: Uint8Array) => btoa(Array.from(b, (x) => String.fromCharCode(x)).join(""));

type Flow = { p: PredictPosition; phase: 1 | 2; text: string; error?: string; receipt?: { net: string; fee: string; sig: string | null; partial?: boolean } };

/** Neo-bank style card at the top of Portfolio: winning predictions still waiting to be claimed. Hidden when none. */
export function PendingClaims() {
  const t = useT();
  const session = useBovedaSession();
  const wallet = session.walletAddress;
  const qc = useQueryClient();
  const reportAffiliate = useAffiliateReport();
  const q = usePredictPositions(wallet);
  const [claimed, setClaimed] = useState<string[]>([]);
  const items = (q.data ?? []).filter((p) => !claimed.includes(p.pubkey) && p.status !== "open" && positionWon(p) === true && BigInt(p.payoutMicro || "0") > 0n);
  const [flow, setFlow] = useState<Flow | null>(null);
  const busy = !!flow && !flow.receipt && !flow.error;
  const refresh = useCallback(async () => { await qc.invalidateQueries({ queryKey: ["predict-positions", wallet] }); }, [qc, wallet]);

  // One tap: approval 1 collects the prize, approval 2 turns it into dollars; the window shows both and ends on the receipt.
  const claim = async (p: PredictPosition) => {
    if (!wallet) return;
    setFlow({ p, phase: 1, text: t("Aprueba en tu billetera (1 de 2)…") });
    try {
      if (!session.signOnly) throw new Error(t("Tu wallet no admite esta operación."));
      const r = await preparePredictClaim({ data: { wallet, position: p.pubkey } });
      if (!r.success) throw new Error(r.error);
      const signed = await session.signOnly(fromB64(r.transaction));
      setFlow({ p, phase: 1, text: t("Cobrando tu premio…") });
      const x = await executePredict({ data: { wallet, signed: toB64(signed), context: r.context } });
      if (!x.success) throw new Error(x.error);
      annotateRecord(wallet, p.pubkey, { claimSig: x.signature });
      setClaimed((l) => [...l, p.pubkey]);
      const feeUsdc = predictClaimFee(BigInt(p.payoutMicro || "0"), BigInt(p.costMicro || "0"));
      try {
        setFlow({ p, phase: 2, text: t("Premio cobrado. Preparando el paso a dólares…") });
        await new Promise((res) => setTimeout(res, 2500));
        const bal = await readTokenBalance(wallet, JUPUSD_MINT);
        if (bal > 0n) {
          const quote = await quoteSwap("JupUSD", "USDC", bal, { feeUsdc });
          setFlow({ p, phase: 2, text: t("Aprueba en tu billetera (2 de 2)…") });
          const s = await session.signAndSend(await buildSwap(wallet, quote));
          if (BigInt(quote.feeUsdc) > 0n) void reportAffiliate(s, "predict");
          setFlow({ p, phase: 2, text: "", receipt: { net: usdc(quote.outAmount), fee: usdc(quote.feeUsdc), sig: s } });
          notify("success", t("Premio cobrado"), t("${v} en tu billetera", { v: usdc(quote.outAmount) }));
        } else setFlow({ p, phase: 2, text: "", receipt: { net: usdc(p.payoutMicro || "0"), fee: "0.00", sig: x.signature } });
      } catch { setFlow({ p, phase: 2, text: "", receipt: { net: usdc(p.payoutMicro || "0"), fee: "0.00", sig: x.signature, partial: true } }); }
      setTimeout(() => void refresh(), 3000);
    } catch (e) { setFlow({ p, phase: 1, text: "", error: e instanceof Error ? e.message : String(e) }); }
  };

  const sheet = <Dialog open={!!flow} onOpenChange={(o) => { if (!o && !busy) setFlow(null); }}>
    <ActionSheetContent closeLabel={t("Cerrar")} className="sm:max-w-sm">
      {flow?.receipt ? <ActionSuccess destination="/wallet" title={flow.receipt.partial ? t("¡Premio cobrado!") : t("¡Premio en tu billetera!")} amount={{ value: flow.receipt.net, unit: "$" }}
        body={flow.receipt.partial ? t("Tu premio ya es tuyo, pero falta pasarlo a dólares. Hazlo en Mi Billetera → Cambiar.") : t("Ya está en tus dólares disponibles.")}
        details={[{ label: t("Operación"), value: t("Premio de Doble o Nada") }, { label: t("Comisión"), value: flow.receipt.fee === "0.00" ? t("Gratis") : `−$${flow.receipt.fee}` }]} signature={flow.receipt.sig} onClose={() => setFlow(null)} /> : flow && <>
        <DialogTitle className="pr-10 font-display text-xl">{t("Cobrar premio")}</DialogTitle>
        <DialogDescription>{t("Premio de ${v}", { v: usdc(flow.p.payoutMicro || "0") })}</DialogDescription>
        <ProgressSteps steps={[t("Cobrar premio"), t("Pasar a dólares")]} current={flow.phase} />
        {flow.error ? <><p role="alert" className="text-sm text-destructive">{flow.error}</p><Button onClick={() => setFlow(null)}>{t("Cerrar")}</Button></> : <WorkingLine text={flow.text} />}
      </>}
    </ActionSheetContent>
  </Dialog>;

  if (!wallet || (!items.length && !flow)) return null;
  const total = items.reduce((s, p) => s + BigInt(p.payoutMicro || "0"), 0n);
  return <>{items.length > 0 && <section aria-label={t("Listo para reclamar")} className="mb-6 overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"><Gift size={20} /></span>
        <div className="min-w-0"><p className="text-xs font-medium text-muted-foreground">{t("Listo para reclamar")}</p><p className="font-display text-3xl font-bold tabular-nums text-primary">+${usdc(total)}</p></div>
      </div>
      <ul className="mt-4 divide-y divide-border rounded-2xl bg-background/60">
        {items.map((p) => { const a = assetOfTitle(p.title); const profit = BigInt(p.payoutMicro || "0") - BigInt(p.costMicro || "0"); return <li key={p.pubkey} className="flex items-center gap-3 px-3 py-3">
          {a && <TokenIcon symbol={a} size={28} />}
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{a ?? "—"} · {t(p.side === "up" ? "Sube" : "Baja")}</p><p className="text-xs text-muted-foreground">{t("Ganancia neta")} +${usdc(profit)}</p></div>
          <Button size="sm" className="rounded-full" disabled={busy} onClick={() => void claim(p)}>{busy && flow?.p.pubkey === p.pubkey ? <Loader2 size={14} className="animate-spin" /> : `${t("Reclamar")} $${usdc(p.payoutMicro || "0")}`}</Button>
        </li>; })}
      </ul>
      <p className="mt-3 text-[11px] text-muted-foreground">{t("Tu billetera te pedirá 2 aprobaciones seguidas: cobrar el premio y pasarlo a dólares.")}</p>
  </section>}{sheet}</>;
}
