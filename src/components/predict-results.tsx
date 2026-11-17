import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useT, useLocale } from "@/lib/i18n";
import { getPastRounds } from "@/lib/predict.functions";
import type { PredictAsset, PredictWindow } from "@/lib/predict";

/** Recently resolved rounds for the selected coin and duration, shown in-app without outbound links. */
export function PredictResults({ asset, window }: { asset: PredictAsset; window: PredictWindow }) {
  const t = useT(); const locale = useLocale();
  const read = useServerFn(getPastRounds);
  const q = useQuery({ queryKey: ["predict-past"], queryFn: () => read(), refetchInterval: 60_000, staleTime: 30_000 });
  const list = (q.data?.success ? q.data.rounds : []).filter((r) => r.asset === asset && r.window === window).slice(0, 8);
  return <section className="rounded-3xl border border-border bg-card p-5" aria-label={t("Resultados recientes")}>
    <h2 className="font-display text-lg font-bold">{t("Resultados recientes")}</h2>
    <p className="mt-1 text-xs text-muted-foreground">{t("Rondas ya resueltas para esta moneda y duración.")}</p>
    {q.isLoading && <p role="status" className="mt-3 text-sm text-muted-foreground">{t("Consultando resultados…")}</p>}
    {q.data && !q.data.success && <p role="alert" className="mt-3 text-sm text-destructive">{t("No se pudieron cargar los resultados ahora mismo.")}</p>}
    {q.data?.success && list.length === 0 && <p className="mt-3 text-sm text-muted-foreground">{t("Aún no hay rondas resueltas recientes para esta duración.")}</p>}
    <ul className="mt-3 divide-y divide-border">
      {list.map((r) => <li key={r.slug} className="flex items-center justify-between gap-3 py-2.5 text-sm">
        <span className="tabular-nums text-muted-foreground">{new Date(r.endTime * 1000).toLocaleString(locale, { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit", hour12: true })}</span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${r.winner === "up" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>{r.winner === "up" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{t(r.winner === "up" ? "Ganó Sube" : "Ganó Baja")}</span>
      </li>)}
    </ul>
  </section>;
}
