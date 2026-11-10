import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT, useLocale } from "@/lib/i18n";
import { assetOfTitle, predictSummary } from "@/lib/predict";
import { getPredictPositions } from "@/lib/predict.functions";
import { historyKey, historyTotals, mergeHistory, netDeposit, readHistory, recordState, type PredictRecord, type PredictState } from "@/lib/predict-history";
import { PredictPositionCard, usdcText } from "@/components/predict-position-card";

const FILTERS = [{ id: "all", label: "Todas" }, { id: "open", label: "Abiertas" }, { id: "won", label: "Ganadas" }, { id: "closed", label: "Cerradas" }] as const;
const STATE_LABEL: Record<PredictState, string> = { open: "Abierta", won: "Acertada · cobrada", lost: "No acertada", sold: "Vendida antes", closed: "Cerrada" };

/** Prediction positions in the Real portfolio: live totals plus a persistent per-wallet transaction history. */
export function PredictPortfolio({ wallet }: { wallet: string | null }) {
  const t = useT(); const locale = useLocale();
  const read = useServerFn(getPredictPositions);
  const q = useQuery({ queryKey: ["predict-positions", wallet], queryFn: () => read({ data: { wallet: wallet! } }), enabled: !!wallet, refetchInterval: 15000, staleTime: 10000 });
  const [rows, setRows] = useState<PredictRecord[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [nowSec, setNowSec] = useState(0);
  useEffect(() => {
    if (!wallet) return;
    const k = historyKey(wallet); let prev: PredictRecord[] = [];
    try { prev = readHistory(localStorage.getItem(k)); } catch {}
    const next = q.data?.success ? mergeHistory(prev, q.data.positions, Date.now()) : prev;
    setRows(next); setNowSec(Math.floor(Date.now() / 1000));
    if (q.data?.success) try { localStorage.setItem(k, JSON.stringify(next)); } catch {}
  }, [wallet, q.data]);
  if (!wallet) return null;
  const live = q.data?.success ? q.data.positions : [];
  const s = predictSummary(live);
  const open = live.filter((p) => p.status === "open");
  const tot = historyTotals(rows, nowSec);
  const shown = rows.filter((r) => { const st = recordState(r, nowSec); return filter === "all" || (filter === "open" ? st === "open" : filter === "won" ? st === "won" || (st === "sold" && BigInt(r.soldMicro!) > BigInt(r.costMicro)) : st !== "open"); });
  return <section id="historial-predicciones" className="mt-8 scroll-mt-20" aria-label={t("Predicciones")}>
    <div className="flex items-center justify-between gap-3"><h2 className="font-display text-lg font-semibold">{t("Predicciones")}</h2><Button asChild size="sm" variant="outline"><Link to="/mercados">{t("Nueva predicción")}</Link></Button></div>
    {q.isLoading && <p role="status" className="mt-3 text-sm text-muted-foreground">{t("Consultando tus predicciones…")}</p>}
    {q.data && !q.data.success && <p role="alert" className="mt-3 text-sm text-destructive">{t("No se pudieron consultar tus predicciones ahora mismo.")}</p>}
    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
      <div className="rounded-xl border border-border p-3"><p className="text-xs text-muted-foreground">{t("En juego")}</p><p className="mt-1 font-display text-lg font-semibold">{usdcText(s.atStake)} USDC</p><p className="text-xs text-muted-foreground">{t("{count} abiertas", { count: s.open })}</p></div>
      <div className="rounded-xl border border-border p-3"><p className="text-xs text-muted-foreground">{t("Devuelto a tu wallet")}</p><p className="mt-1 font-display text-lg font-semibold">{usdcText(tot.returned)} USDC</p><p className="text-xs text-muted-foreground">{t("Invertido")} {usdcText(tot.invested)}</p></div>
      <div className="col-span-2 rounded-xl border border-border p-3"><p className="text-xs text-muted-foreground">{t("Ganancia neta en predicciones cerradas")}</p><p className={`mt-1 font-display text-2xl font-bold ${tot.pnl < 0n ? "text-destructive" : "text-primary"}`}>{tot.pnl >= 0n ? "+" : ""}{usdcText(tot.pnl)} USDC</p><p className="text-xs text-muted-foreground">{t("{w} ganadas · {l} perdidas", { w: tot.won, l: tot.lost })}</p></div>
    </div>
    {open.length > 0 && <div className="mt-4 space-y-2"><h3 className="text-sm font-semibold">{t("Abiertas ahora")}</h3>{open.map((p) => <PredictPositionCard key={p.pubkey} p={p} />)}</div>}
    <h3 className="mt-6 text-sm font-semibold">{t("Historial de predicciones")}</h3>
    <div className="mt-2 flex gap-1 overflow-x-auto">{FILTERS.map((f) => <Button key={f.id} size="sm" variant={filter === f.id ? "secondary" : "ghost"} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{t(f.label)}</Button>)}</div>
    {shown.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">{t("Aún no tienes predicciones en este historial.")}</p> : <ul className="mt-2 divide-y divide-border rounded-xl border border-border">{shown.map((r) => {
      const st = recordState(r, nowSec), dep = netDeposit(r, nowSec), cost = BigInt(r.costMicro || "0"), pnl = dep === null ? null : dep - cost, up = r.side === "up";
      const sig = r.claimSig ?? r.sellSig;
      return <li key={r.pubkey} className="p-3 text-sm">
        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="flex items-center gap-1 font-semibold">{up ? <ArrowUpRight size={14} className="text-primary" /> : <ArrowDownRight size={14} className="text-destructive" />}{assetOfTitle(r.title) ?? "—"} · {t(up ? "Sube" : "Baja")}</p><p className="text-xs text-muted-foreground">{r.closeTime ? new Date(r.closeTime * 1000).toLocaleString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</p></div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${st === "won" ? "bg-primary/15 text-primary" : st === "lost" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}>{t(STATE_LABEL[st])}</span></div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs"><div><p className="text-muted-foreground">{t("Invertido")}</p><p className="font-medium tabular-nums">{usdcText(cost)}</p></div><div><p className="text-muted-foreground">{t("A tu wallet")}</p><p className="font-medium tabular-nums">{dep === null ? "—" : `+${usdcText(dep)}`}</p></div><div><p className="text-muted-foreground">{t("Resultado")}</p><p className={`font-medium tabular-nums ${pnl === null ? "" : pnl < 0n ? "text-destructive" : "text-primary"}`}>{pnl === null ? "—" : `${pnl >= 0n ? "+" : ""}${usdcText(pnl)}${cost > 0n ? ` (${Math.round(Number(pnl) / Number(cost) * 100)}%)` : ""}`}</p></div></div>
        <div className="mt-2 flex flex-wrap gap-3 text-xs">{sig && <a className="inline-flex items-center gap-1 text-primary underline" href={`https://orbmarkets.io/tx/${sig}`} target="_blank" rel="noopener noreferrer">{t("Ver comprobante")}<ExternalLink size={11} /></a>}{r.eventId && <a className="inline-flex items-center gap-1 text-primary underline" href={`https://jup.ag/prediction/${r.eventId}`} target="_blank" rel="noopener noreferrer">{t("Verificar en el mercado oficial")}<ExternalLink size={11} /></a>}</div>
      </li>;
    })}</ul>}
    <p className="mt-3 text-xs text-muted-foreground">{t("El historial combina los datos en vivo del mercado con lo guardado en este navegador para tu wallet. Las rondas anteriores a esta versión o de otros dispositivos pueden no aparecer.")}</p>
  </section>;
}
