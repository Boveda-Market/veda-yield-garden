import { useCallback, useState } from "react";
import { notify } from "@/lib/notify";
import { useQueryClient } from "@tanstack/react-query";
import { usePredictPositions } from "@/lib/predict-positions-query";
import { Gift, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TokenIcon } from "@/components/token-icon";
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
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const refresh = useCallback(async () => { await qc.invalidateQueries({ queryKey: ["predict-positions", wallet] }); }, [qc, wallet]);

  const claim = async (p: PredictPosition) => {
    if (!wallet) return; setBusy(p.pubkey); setMsg(null);
    try {
      if (!session.signOnly) throw new Error(t("Tu wallet no admite esta operación."));
      const r = await preparePredictClaim({ data: { wallet, position: p.pubkey } });
      if (!r.success) throw new Error(r.error);
      const signed = await session.signOnly(fromB64(r.transaction));
      const x = await executePredict({ data: { wallet, signed: toB64(signed), context: r.context } });
      if (!x.success) throw new Error(x.error);
      annotateRecord(wallet, p.pubkey, { claimSig: x.signature });
      setMsg({ ok: true, text: t("Firma 1 de 2 lista: pago cobrado. Ahora firma la 2 de 2 para cambiarlo a USDC…") });
      try {
        await new Promise((res) => setTimeout(res, 2500));
        const bal = await readTokenBalance(wallet, JUPUSD_MINT);
        const feeUsdc = predictClaimFee(BigInt(p.payoutMicro || "0"), BigInt(p.costMicro || "0"));
        const out = bal > 0n ? (await (async () => { const q = await quoteSwap("JupUSD", "USDC", bal, { feeUsdc }); const s = await session.signAndSend(await buildSwap(wallet, q)); if (BigInt(q.feeUsdc) > 0n) void reportAffiliate(s, "predict"); return q.outAmount; })()) : p.payoutMicro;
        setMsg({ ok: true, text: t("Ganancias reclamadas. {v} USDC llegaron a tu wallet.", { v: usdc(out) }) });
        notify("success", t("Premio cobrado"), t("{v} USDC en tu billetera", { v: usdc(out) }));
      } catch { setMsg({ ok: true, text: t("Pago cobrado, pero falta el cambio a USDC. Hazlo en Mi Billetera → Cambiar (JupUSD → USDC).") }); }
      setClaimed((l) => [...l, p.pubkey]);
      setTimeout(() => void refresh(), 3000);
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); } finally { setBusy(null); }
  };

  if (!wallet || (!items.length && !msg)) return null;
  const total = items.reduce((s, p) => s + BigInt(p.payoutMicro || "0"), 0n);
  return <section aria-label={t("Listo para reclamar")} className="mb-6 overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-5 shadow-sm">
    {items.length > 0 && <>
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"><Gift size={20} /></span>
        <div className="min-w-0"><p className="text-xs font-medium text-muted-foreground">{t("Listo para reclamar")}</p><p className="font-display text-3xl font-bold tabular-nums text-primary">+{usdc(total)} <span className="text-base font-semibold">USDC</span></p></div>
      </div>
      <ul className="mt-4 divide-y divide-border rounded-2xl bg-background/60">
        {items.map((p) => { const a = assetOfTitle(p.title); const profit = BigInt(p.payoutMicro || "0") - BigInt(p.costMicro || "0"); return <li key={p.pubkey} className="flex items-center gap-3 px-3 py-3">
          {a && <TokenIcon symbol={a} size={28} />}
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{a ?? "—"} · {t(p.side === "up" ? "Sube" : "Baja")}</p><p className="text-xs text-muted-foreground">{t("Ganancia neta")} +{usdc(profit)} USDC</p></div>
          <Button size="sm" className="rounded-full" disabled={!!busy} onClick={() => void claim(p)}>{busy === p.pubkey ? <Loader2 size={14} className="animate-spin" /> : `${t("Reclamar")} ${usdc(p.payoutMicro || "0")}`}</Button>
        </li>; })}
      </ul>
      <p className="mt-3 text-[11px] text-muted-foreground">{t("Para reclamar firmarás dos transacciones: 1) cobrar el pago y 2) cambiarlo a USDC.")}</p>
    </>}
    {msg && <p role="status" className={`mt-3 text-sm font-medium ${msg.ok ? "text-primary" : "text-destructive"}`}>{msg.text}</p>}
  </section>;
}
