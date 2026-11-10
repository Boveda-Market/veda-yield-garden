import { Link } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useEffect, useState, lazy, Suspense } from "react";
import { Button } from "./ui/button";
import { portfolioHistoryKey, readBalancePoints, recordBalance, periodStart, type BalancePoint, type PortfolioPeriod } from "@/lib/portfolio";
import type { RealWalletData } from "@/lib/solana-data";
import { MeteoraPortfolio } from "./meteora-portfolio";
import { PredictPortfolio } from "./predict-portfolio";
const PortfolioChart = lazy(() => import("./portfolio-chart").then((module) => ({ default: module.PortfolioChart })));

export function RealPortfolioPanel({ data, wallet }: { data: RealWalletData | null; wallet: string | null }) {
  const t = useT();
  const [period, setPeriod] = useState<PortfolioPeriod>("all");
  const [points, setPoints] = useState<BalancePoint[]>([]);
  useEffect(() => {
    if (!data || !wallet) { setPoints([]); return; }
    const key = portfolioHistoryKey(`real-usdc:${wallet}`);
    const balance = Number(data.usdc);
    if (!Number.isFinite(balance) || balance > Number.MAX_SAFE_INTEGER / 1000000) return;
    let previous: BalancePoint[] = [];
    try { previous = readBalancePoints(localStorage.getItem(key)); } catch {}
    const next = recordBalance(previous, { at: new Date(data.checkedAt).getTime(), balance });
    setPoints(next); try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
  }, [data?.checkedAt, wallet]);
  return <section className="border-b border-border py-8" aria-label={t("Análisis del portafolio Real")}><Link to="/mercados" className="mb-6 flex items-center justify-between rounded-2xl border border-primary/40 bg-primary/5 p-4"><span><span className="block font-semibold">{t("Predicciones Sube/Baja")}</span><span className="text-xs text-muted-foreground">{t("BTC, ETH y SOL en rondas de 5 min, 15 min y 1 h")}</span></span><TrendingUp className="text-primary" /></Link><MeteoraPortfolio wallet={wallet} positions={data?.positions ?? []} /><PredictPortfolio wallet={wallet} />
    <div className="mb-5 mt-8 flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-lg font-semibold">{t("Saldo USDC en tu wallet")}</h2><div className="flex gap-1">{[{ id: "7d", label: t("7 días") }, { id: "30d", label: t("30 días") }, { id: "all", label: t("Todo") }].map(({ id, label }) => <Button key={id} size="sm" variant={period === id ? "secondary" : "ghost"} aria-pressed={period === id} onClick={() => setPeriod(id as PortfolioPeriod)}>{label}</Button>)}</div></div><Suspense fallback={<div className="h-64" />}><PortfolioChart unit="USDC" points={points.filter((point) => point.at >= periodStart(period, data ? new Date(data.checkedAt).getTime() : 0))} /></Suspense><p className="mt-4 text-xs leading-5 text-muted-foreground">{t("Solo saldo USDC de las lecturas confirmadas guardadas en este navegador. No incluye SOL, tokens o posiciones. Las entradas y salidas de la wallet no equivalen a ganancias o pérdidas.")}</p>
  </section>;
}