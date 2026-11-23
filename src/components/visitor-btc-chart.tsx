import { useId } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n";
import { VAULTS } from "@/lib/vaults";
import { fetchRangeCandles } from "@/lib/pool-candles";
import { bitcoinStatsOptions } from "@/lib/bitcoin-stats";
import { formatCoinPrice } from "@/lib/format-price";
import { TokenIcon } from "@/components/token-icon";

const BTC_POOL = VAULTS.find((v) => v.id === "btc")?.pool ?? "";

/** Mi Portafolio for visitors without an account: 7-day Bitcoin price (Bóveda Bitcoin pool, 1:1 with BTC) so the empty screen shows a live market. */
export function VisitorBtcChart() {
  const t = useT();
  const gid = useId().replace(/:/g, "");
  const candles = useQuery({ queryKey: ["pool-range", BTC_POOL, "1h"], queryFn: () => fetchRangeCandles(BTC_POOL, "1h"), staleTime: 5 * 60_000, refetchInterval: 5 * 60_000, retry: 1, enabled: Boolean(BTC_POOL) });
  const btc = useQuery(bitcoinStatsOptions()).data;
  const pts = (candles.data ?? []).filter((c) => Number.isFinite(c.c) && c.c > 0);
  const live = pts.length >= 2;
  const first = pts[0]?.c ?? 0, last = pts[pts.length - 1]?.c ?? 0;
  const pct = live && first ? (last / first - 1) * 100 : null;
  const up = (pct ?? 0) >= 0;
  const W = 380, H = 150, T = 10, B = 140;
  const min = Math.min(...pts.map((p) => p.c)), max = Math.max(...pts.map((p) => p.c));
  const span = Math.max(max - min, last * 1e-4, 1e-9);
  const t0 = pts[0]?.t ?? 0, tSpan = Math.max((pts[pts.length - 1]?.t ?? 1) - t0, 1);
  const xy = pts.map((p) => ({ x: ((p.t - t0) / tSpan) * W, y: B - ((p.c - min) / span) * (B - T) }));
  const line = xy.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const end = xy[xy.length - 1];
  const color = up ? "var(--primary)" : "var(--destructive)";
  const cap = btc?.marketCap == null ? null : btc.marketCap >= 1e12 ? `$${(btc.marketCap / 1e12).toLocaleString("es-MX", { maximumFractionDigits: 2 })} ${t("billones")}` : `$${Math.round(btc.marketCap / 1e9).toLocaleString("es-MX")} ${t("mil millones")}`;
  return <section aria-label={t("Gráfica de Bitcoin")} className="mt-2 rounded-3xl border border-border bg-card p-4" data-testid="visitor-btc-chart">
    <div className="flex items-center gap-2">
      <TokenIcon symbol="BTC" size={32} />
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-bold">{t("Bitcoin")} <span className="font-normal text-muted-foreground">· {t("últimos 7 días")}</span></p>
        {cap && <p className="text-[11px] text-muted-foreground">{t("Valor de mercado")}: {cap}</p>}
      </div>
    </div>
    <p className="mt-2 flex items-center gap-2">
      <span className="font-display text-2xl font-extrabold tabular-nums">{live ? formatCoinPrice(last) : "…"}</span>
      {pct != null && <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${up ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>{up ? "▲ +" : "▼ "}{pct.toFixed(1)}%</span>}
    </p>
    <div className="relative mt-2">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-36 w-full overflow-visible" role="img" aria-label={t("Precio de Bitcoin en los últimos 7 días")}>
        <defs><linearGradient id={`v${gid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.25" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        {live && end && <>
          <path d={`${line} L${end.x.toFixed(1)},${B} L0,${B} Z`} fill={`url(#v${gid})`} />
          <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </>}
      </svg>
      {!live && <div role="status" className="absolute inset-0 flex items-center justify-center gap-2 text-xs text-muted-foreground">{candles.isPending || candles.isFetching ? <><Loader2 className="size-5 animate-spin text-primary" aria-hidden />{t("Cargando gráfica…")}</> : t("Gráfica no disponible por ahora")}</div>}
    </div>
    {live && <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted-foreground"><span>{t("Mín.")} {formatCoinPrice(min)}</span><span>{t("Máx.")} {formatCoinPrice(max)}</span></div>}
    <Link to="/app" className="mt-3 flex w-full items-center justify-center rounded-xl bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground transition active:scale-95">👉 {t("Oprime aquí para entrar a la bóveda")}</Link>
  </section>;
}
