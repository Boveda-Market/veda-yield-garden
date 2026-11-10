import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { predictSummary } from "@/lib/predict";
import { getPredictPositions } from "@/lib/predict.functions";
import { PredictPositionCard, usdcText } from "@/components/predict-position-card";

/** Prediction positions inside the Real portfolio: totals, open positions and resolved history, read live from the venue. */
export function PredictPortfolio({ wallet }: { wallet: string | null }) {
  const t = useT();
  const read = useServerFn(getPredictPositions);
  const q = useQuery({ queryKey: ["predict-positions", wallet], queryFn: () => read({ data: { wallet: wallet! } }), enabled: !!wallet, refetchInterval: 15000, staleTime: 10000 });
  if (!wallet) return null;
  const list = q.data?.success ? q.data.positions : [];
  const s = predictSummary(list);
  const open = list.filter((p) => p.status === "open"), closed = list.filter((p) => p.status !== "open");
  return <section className="mt-8" aria-label={t("Predicciones")}>
    <div className="flex items-center justify-between gap-3"><h2 className="font-display text-lg font-semibold">{t("Predicciones")}</h2><Button asChild size="sm" variant="outline"><Link to="/mercados">{t("Ir a Sube/Baja")}</Link></Button></div>
    {q.isLoading && <p role="status" className="mt-3 text-sm text-muted-foreground">{t("Consultando tus predicciones…")}</p>}
    {q.data && !q.data.success && <p role="alert" className="mt-3 text-sm text-destructive">{t("No se pudieron consultar tus predicciones ahora mismo.")}</p>}
    {q.data?.success && <>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-border p-3"><p className="text-xs text-muted-foreground">{t("En juego")}</p><p className="mt-1 font-display text-lg font-semibold">{usdcText(s.atStake)} USDC</p><p className="text-xs text-muted-foreground">{t("{count} abiertas", { count: s.open })}</p></div>
        <div className="rounded-xl border border-border p-3"><p className="text-xs text-muted-foreground">{t("Valor si vendes ahora")}</p><p className="mt-1 font-display text-lg font-semibold">{usdcText(s.openValue)} USDC</p><p className="text-xs text-muted-foreground">{t("Pago máximo")} {usdcText(s.potential)}</p></div>
      </div>
      {open.length === 0 && closed.length === 0 && <p className="mt-4 text-sm text-muted-foreground">{t("Aún no tienes predicciones.")}</p>}
      {open.length > 0 && <div className="mt-4 space-y-2"><h3 className="text-sm font-semibold">{t("Abiertas")}</h3>{open.map((p) => <PredictPositionCard key={p.pubkey} p={p} />)}</div>}
      {closed.length > 0 && <div className="mt-4 space-y-2"><h3 className="text-sm font-semibold">{t("Historial de predicciones")}</h3>{closed.map((p) => <PredictPositionCard key={p.pubkey} p={p} />)}</div>}
      <p className="mt-3 text-xs text-muted-foreground">{t("Datos en vivo del mercado externo. El historial muestra las rondas cerradas que el mercado aún reporta para tu wallet; las ya cobradas pueden no aparecer.")}</p>
    </>}
  </section>;
}
