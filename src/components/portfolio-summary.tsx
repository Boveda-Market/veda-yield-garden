import { Loader2 } from "lucide-react";
import { useHydrated } from "@tanstack/react-router";
import { AnimatedMoney } from "@/components/ui/animated-money";
import { earningRatePerMs } from "@/lib/live-earnings";
import { Layers, PieChart, Sparkles, Sprout, TrendingUp } from "lucide-react";
import { useT } from "@/lib/i18n";
import type { ChainPosition } from "@/lib/solana-data";
import { useQueries } from "@tanstack/react-query";
import { fetchPoolStats } from "@/lib/pool-stats";
import { chartRangeFor, closesForDays, fetchDailyCloses, fetchRangeCandles, globalMarket, intradayGlobal, readCachedCandles, type ChartRange } from "@/lib/pool-candles";
import { useMeteoraHistory } from "@/hooks/use-meteora-history";
import { usePositionRows } from "@/hooks/use-position-rows";
import { MASK, useHideBalances } from "@/lib/preferences";
import { formatUsd } from "@/lib/position-value";
import { canHarvest } from "@/lib/harvest";
import { VAULTS } from "@/lib/vaults";
import { Button } from "./ui/button";
import { useId, useState } from "react";
import { CHAIN_POOLS } from "@/lib/solana-data";
import { capitalSeries } from "@/lib/weekly-interest";
import { useLocale } from "@/lib/i18n";
import { TokenIcon } from "@/components/token-icon";
import dctyLogo from "@/assets/dcty-logo.png";
import trumpLogo from "@/assets/trump-logo.png";
import { Check, CheckCircle2, ChevronDown, Copy } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";

const COLORS = ["bg-primary", "bg-chart-1", "bg-chart-2", "bg-chart-4", "bg-chart-3", "bg-chart-5"];

/** Visual performance board: capital split by vault/plays, weighted APR, pending, harvested PNL and in/out volume. */
export function PortfolioSummary({ wallet, positions, predictionsMicro, onHarvest, onHarvestAll }: { wallet: string | null; positions: ChainPosition[]; positionsComplete: boolean; predictionsMicro: bigint | null; onHarvest: (p: ChainPosition) => void; onHarvestAll?: (ps: ChainPosition[]) => void }) {
  const t = useT();
  const [hidden] = useHideBalances();
  const money = (n: number | null) => n === null ? "—" : hidden ? MASK : formatUsd(n);
  const history = useMeteoraHistory(wallet);
  const { rows, totalFees, top } = usePositionRows(positions);
  const plays = predictionsMicro === null ? 0 : Number(predictionsMicro) / 1e6;
  const byVault = VAULTS.map((v) => {
    const mine = rows.filter((r) => r.p.vaultId === v.id);
    return { id: v.id, label: t(v.name), value: mine.reduce((s, r) => s + (r.value ?? 0), 0), apr: mine[0]?.apr ?? null };
  }).filter((x) => x.value > 0);
  const slices = [...byVault, ...(plays > 0 ? [{ id: "plays", label: t("Doble o Nada"), value: plays, apr: null }] : [])].sort((a, b) => b.value - a.value);
  const total = slices.reduce((s, x) => s + x.value, 0);
  const vaultTotal = byVault.reduce((s, x) => s + x.value, 0);
  const aprWeighted = vaultTotal > 0 && byVault.every((x) => x.apr !== null) ? byVault.reduce((s, x) => s + x.value * (x.apr ?? 0), 0) / vaultTotal : null;
  const liveRate = rows.reduce((s, r) => s + (r.p.locked || r.p.outOfRange ? 0 : earningRatePerMs(r.value, r.apr)), 0);
  const anim = (n: number, rate = 0) => hidden ? MASK : <AnimatedMoney value={n} ratePerMs={rate} prefix="" format={rate > 0 ? undefined : formatUsd} />;
  const pnl = history.pnl ? Number(history.pnl.replace(/,/g, "")) : null;
  const tile = "rounded-2xl border border-border bg-card p-4";
  const label = "flex items-center gap-1.5 text-xs text-muted-foreground";
  const loading = history.query.isFetching ? t("Calculando…") : "—";

  return <section id="rendimiento" aria-label={t("Rendimiento de tu portafolio")} className="scroll-mt-20 pb-8 pt-3">
    <h2 className="flex items-center gap-2 font-display text-base font-semibold sm:text-lg"><TrendingUp size={18} className="text-primary" />{t("Mi rendimiento")}</h2>
    <WeeklyChart records={history.records} poolPrices={history.poolPrices} money={money} vaults={byVault} />

    <div className={`${tile} mt-4`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className={label}><PieChart size={14} />{t("Capital trabajando")}</p><p className="mt-1 font-display text-3xl font-semibold tabular-nums">{total > 0 ? anim(total) : "—"}</p></div>
        {aprWeighted !== null && <div className="text-right"><p className="text-xs text-muted-foreground">{t("APR promedio")}</p><p className="font-display text-2xl font-bold tabular-nums text-primary">{aprWeighted.toFixed(1)}%</p></div>}
      </div>
      {total > 0 ? <>
        <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={t("Distribución de tu capital")}>{slices.map((s, i) => <div key={s.id} className={`${COLORS[i % COLORS.length]} h-full`} style={{ width: `${(s.value / total) * 100}%` }} />)}</div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">{slices.map((s, i) => <li key={s.id} className="flex items-center justify-between gap-2 text-sm"><span className="flex min-w-0 items-center gap-2"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${COLORS[i % COLORS.length]}`} /><span className="truncate">{s.label}</span></span><span className="shrink-0 tabular-nums"><strong>{((s.value / total) * 100).toFixed(0)}%</strong> <span className="text-muted-foreground">· {money(s.value)}</span>{s.apr !== null && <span className="ml-1 text-xs text-primary">{s.apr.toFixed(0)}% APR</span>}</span></li>)}</ul>
      </> : <p className="mt-3 text-sm text-muted-foreground">{t("Cuando tengas dinero en bóvedas o jugadas verás aquí cómo se reparte.")}</p>}
    </div>

    <div className="mt-3 grid grid-cols-2 gap-3">
      <div className={tile}>
        <p className={label}><Sprout size={14} />{t("Por cosechar")}</p>
        <p className="mt-2 font-display text-xl font-semibold tabular-nums text-primary">{totalFees > 0 ? <>+${anim(totalFees, liveRate)}</> : money(0)}</p>
        {(() => { const ready = rows.filter((r) => !r.p.locked && typeof r.fees === "number" && canHarvest(r.fees)); return ready.length > 1 && totalFees > 20 && onHarvestAll ? <Button size="sm" className="mt-2 w-full" onClick={() => onHarvestAll(ready.map((r) => r.p))}>{t("Cosechar todo")}</Button> : null; })() ?? (top && canHarvest(top.fees) ? <Button size="sm" className="mt-2 w-full" onClick={() => onHarvest(top.p)}>{t("Cosechar ahora")}</Button> : <p className="mt-1 text-xs text-muted-foreground">{t("Se activa desde $0.50.")}</p>)}
      </div>
      <div className={tile}>
        <p className={label}><Sparkles size={14} />{t("Ganancias (PNL)")}</p>
        <p className="mt-2 font-display text-xl font-semibold tabular-nums text-primary">{pnl !== null ? <>+{anim(pnl)}</> : loading}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("Lo que ya cosechaste.")}</p>
      </div>
    </div>
    <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-muted-foreground"><Layers size={12} className="mt-0.5 shrink-0" />{t("Ganancias = lo que ya cosechaste, al precio de hoy. No incluye subidas o bajadas del precio de tu capital.")}</p>
  </section>;
}

/** Theme per vault (golden rule: each vault tab uses that vault's own look). Badge vaults use the GTA6 neon. */
function vaultTheme(id: string) {
  if (VAULTS.find((v) => v.id === id)?.badge) return { a: "var(--hot-2)", b: "var(--hot)", text: "text-hot", on: "hot-cta text-primary-foreground shadow-[0_0_12px_var(--hot)]" };
  const c = id === "met" ? "var(--chart-2)" : id === "sol" ? "var(--chart-1)" : "var(--chart-4)";
  return { a: c, b: c, text: "", on: "bg-foreground text-background" };
}

/** «Mercado vs. Ganancias» with tabs: Global (all vaults, each moved by its own token price) + one tab per open vault (official token price vs. that vault's harvests). */
function WeeklyChart({ records, poolPrices, money, vaults }: { records: Parameters<typeof capitalSeries>[0]; poolPrices: Record<string, number | null>; money: (n: number | null) => string; vaults: { id: string; label: string; value: number }[] }) {
  const t = useT();
  const locale = useLocale();
  const gid = useId().replace(/:/g, "");
  const hydrated = useHydrated();
  const [sel, setSel] = useState<number | null>(null);
  const [n0, setN] = useState<0 | 1 | 7 | 30 | 90>(0); // only the 1M (1-minute candles, last 5 h) timeframe is offered
  const [tabId, setTab] = useState<string>("global");
  const [pickOpen, setPickOpen] = useState(false);
  const open = vaults.map((v) => ({ ...v, pool: VAULTS.find((x) => x.id === v.id)?.pool ?? "" })).filter((v) => v.pool);
  const active = open.find((v) => v.id === tabId) ? tabId : "global";
  // Thinly traded vaults (chartRangeFor) show 7 days of 1-hour candles on their own tab.
  const week = active !== "global" && chartRangeFor(active) === "1h";
  const n = week ? 7 : n0;
  const dn = n <= 1 ? 2 : n;
  const range: ChartRange = n === 90 ? "1d" : n === 30 ? "4h" : n === 0 ? "1m" : "1h";
  const candleQ = useQueries({ queries: open.map((v) => ({ queryKey: ["pool-daily", v.pool, 90], queryFn: ({ signal }: { signal: AbortSignal }) => fetchDailyCloses(v.pool, 91, signal), staleTime: 10 * 60_000, retry: 1 })) });
  const introQ = useQueries({ queries: open.map((v) => ({ queryKey: ["pool-range", v.pool, range], queryFn: ({ signal }: { signal: AbortSignal }) => fetchRangeCandles(v.pool, range, signal), ...(hydrated && readCachedCandles(v.pool, range) ? { placeholderData: readCachedCandles(v.pool, range)! } : {}), staleTime: n <= 1 ? 30_000 : 5 * 60_000, refetchInterval: n <= 1 ? 30_000 : 5 * 60_000, retry: 1, retryDelay: 1500 })) });
  const statsQ = useQueries({ queries: open.map((v) => ({ queryKey: ["dexscreener-pool-stats", v.pool], queryFn: ({ signal }: { signal: AbortSignal }) => fetchPoolStats(v.pool, signal), staleTime: 60_000, retry: 1 })) });
  const tokenValue = (r: { tokenRaw?: string; pool?: string }) => {
    const cfg = CHAIN_POOLS.find((c) => c.pool === r.pool), price = r.pool ? poolPrices[r.pool] : null;
    if (!cfg || !price || !r.tokenRaw || !/^\d{1,30}$/.test(r.tokenRaw)) return 0n;
    return BigInt(Math.floor(Number(r.tokenRaw) / 10 ** cfg.decimals * price * 1e6));
  };
  const cur = open.find((v) => v.id === active);
  const recs = cur ? records.filter((r) => r.pool === cur.pool) : records;
  const days = capitalSeries(recs, Date.now(), dn, -new Date().getTimezoneOffset(), tokenValue);
  const starts = days.map((d) => d.start);
  const closes = open.map((_, i) => closesForDays(candleQ[i]?.data ?? [], starts));
  const curIdx = cur ? open.indexOf(cur) : -1;
  const isPrice = curIdx >= 0;
  // Vault tabs: the line follows the official daily price; the headline shows the live market cap only.
  const caps = open.map((_, i) => statsQ[i]?.data?.marketCap ?? null);
  const liveCap = isPrice ? caps[curIdx] ?? null : (caps.length && caps.every((c) => c) ? caps.reduce<number>((a, c) => a + (c ?? 0), 0) : null);
  // Line scale = market cap: price × circulating supply (live cap / latest price); Global sums each vault's cap.
  const lastPx = (i: number) => { const c = introQ[i]?.data; return c?.length ? c[c.length - 1]!.c : (closes[i]?.filter((v) => v != null).pop() ?? null); };
  const supply = (i: number) => { const c = caps[i], p = lastPx(i); return c && p ? c / p : null; };
  const capW = open.map((v, i) => caps[i] ?? v.value);
  const rawMarket = isPrice ? closes[curIdx]!.map((v) => v != null && supply(curIdx) ? v * supply(curIdx)! : v) : globalMarket(open.map((v, i) => ({ value: capW[i]!, closes: closes[i]! })), dn);
  const firstKnown = rawMarket.find((v) => v != null) ?? 0;
  const mk = rawMarket.map((v) => v ?? firstKnown) as number[];
  const earn = days.map((d) => Number(d.earnedMicro) / 1e6);
  const total = earn[earn.length - 1] ?? 0;
  const shown = sel ?? dn - 1;
  const theme = vaultTheme(cur?.id ?? (open.length === 1 ? open[0]!.id : "gta6"));
  const nowCap = cur ? cur.value : open.reduce((a, v) => a + v.value, 0);
  const series = days.map((d) => Number(d.capitalMicro) / 1e6);
  // History may be partial; when it has no deposits, use today's capital as a flat baseline.
  const capArr = series.some((c) => c > 0) ? series : series.map(() => nowCap);
  const totArr = capArr.map((c, i) => c + earn[i]!);
  const hasTotal = capArr.some((c) => c > 0);
  const baseCap = capArr[shown] ?? 0;
  const W = 380, L = 12, R = 368, CT = 16, CB = 180, ET = 150, EB = 250, TT = 290, TB = 370, H = 200;
  const x = (i: number) => L + (i * (R - L)) / (dn - 1);
  const emax = Math.max(total, 0.000001);
  const smooth = (pts: { x: number; y: number }[]) => { let d = `M${pts[0]!.x},${pts[0]!.y}`; for (let i = 1; i < pts.length; i++) { const p = pts[i - 1]!, c = pts[i]!, mx = (p.x + c.x) / 2; d += ` C${mx},${p.y} ${mx},${c.y} ${c.x},${c.y}`; } return d; };
  const ePts = earn.map((v, i) => ({ x: x(i), y: EB - (v / emax) * (EB - ET) }));
  const angular = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  // Market line: 1-minute (1 h), 5-minute (24 h), 1-hour (7 d) or 4-hour (30 d) closes placed by time with straight segments, so every real spike and drop shows; Global sums each vault moved by its own price.
  const now = Date.now(), wBase = n === 0 ? now - 5 * 3_600_000 : n === 1 ? now - 86_400_000 : days[0]!.start;
  const inWin = (i: number) => (introQ[i]?.data ?? []).filter((c) => c.t >= wBase);
  const mSeries = isPrice ? inWin(curIdx).map((c) => ({ t: c.t, v: c.c * (supply(curIdx) ?? 1) })) : intradayGlobal(open.map((v, i) => ({ value: capW[i]!, candles: inWin(i) })));
  const live = mSeries.length >= 2;
  const drawing = !live && introQ.some((q) => q.isPending || q.isFetching);
  // Young tokens: stretch the line edge to edge from their first candle instead of leaving the left side empty.
  const w0 = live ? Math.max(wBase, mSeries[0]!.t) : wBase, wSpan = Math.max(now - w0, 1), young = n > 1 && live && w0 - wBase > 86_400_000;
  const ms = live ? mSeries.map((p) => p.v) : mk;
  // Linear scale fitted to the window's own min/max: every spike and drop fills the height (choppy trading look).
  const cmin = Math.min(...ms), cmax = Math.max(...ms), cr = Math.max(cmax - cmin, Math.abs(cmax) * 1e-6, 1e-9);
  const my = (v: number) => CB - ((v - cmin) / cr) * (CB - CT - 8);
  const cPts = live ? mSeries.map((p) => ({ x: Math.min(R, L + ((p.t - w0) / wSpan) * (R - L)), y: my(p.v) })) : mk.map((v, i) => ({ x: x(i), y: my(v) }));
  const cLine = angular(cPts), cEnd = cPts[cPts.length - 1]!;
  const eLine = smooth(ePts);
  const tmin = Math.min(...capArr, ...totArr), tmax = Math.max(...totArr), tr = Math.max(tmax - tmin, Math.abs(tmax) * 0.02, 1e-6);
  const ty = (v: number) => TB - ((v - tmin) / tr) * (TB - TT);
  const tPts = totArr.map((v, i) => ({ x: x(i), y: ty(v) }));
  const bPts = capArr.map((v, i) => ({ x: x(i), y: ty(v) }));
  const tLine = smooth(tPts), bLine = bPts.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  const tab = (v: 0 | 1 | 7 | 30 | 90, label: string) => <button type="button" onClick={() => { if (!week) setN(v); setSel(null); }} aria-pressed={n === v} className={`rounded-lg px-3 py-1 transition ${n === v ? "bg-primary font-bold text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>;
  const vtab = (id: string, label: string) => { const th = vaultTheme(id === "global" ? "global" : id); const on = active === id; return <button key={id} type="button" role="tab" aria-selected={on} onClick={() => { setTab(id); setSel(null); }} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition ${on ? (id === "global" ? "border-primary bg-primary text-primary-foreground" : `border-transparent ${th.on}`) : "border-border bg-muted/60 text-muted-foreground hover:text-foreground"}`}>{label}</button>; };
  const day = new Date(days[shown]!.start).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  const loading = candleQ.some((q) => q.isPending) || statsQ.some((q) => q?.isPending);
  const cap = (v: number) => `$${new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 2 }).format(v)}`;
  const mText = liveCap ? cap(liveCap) : "—";
  const pct = ms[0] ? ((ms[ms.length - 1] ?? 0) / ms[0]! - 1) * 100 : 0;
  const [copied, setCopied] = useState(false);
  const chain = cur ? CHAIN_POOLS.find((c) => c.id === cur.id) : undefined;
  const vinfo = cur ? VAULTS.find((v) => v.id === cur.id) : undefined;
  const copyMint = () => { if (!chain) return; void navigator.clipboard?.writeText(chain.mint).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); };
  const sym = cur ? (VAULTS.find((v) => v.id === cur.id)?.pair.split("/")[0] ?? "") : "";
  return <div className="relative mt-2 overflow-hidden rounded-3xl border border-border bg-card p-4 sm:p-5">
    <div className="pointer-events-none absolute -right-24 -top-24 size-48 rounded-full blur-3xl" style={{ background: `color-mix(in oklch, ${theme.b} 15%, transparent)` }} />
    <div className="relative flex items-center justify-between gap-2">
      <p className="text-sm font-semibold">{isPrice ? t("Mercado {s}", { s: sym }) : <>{t("Mercado global")}<span className="block text-xs font-normal text-muted-foreground">{t("Suma de bóvedas activas")}</span></>}</p>
      <div className="inline-flex items-center rounded-xl border border-border bg-muted/60 p-1 text-xs font-medium">{week ? tab(7, "7D") : tab(0, "1M")}</div>
    </div>
    {open.length > 2 && (() => { const opts = [{ id: "global", label: t("Global") }, ...open.map((v) => ({ id: v.id, label: `${VAULTS.find((x) => x.id === v.id)?.badge ? "⚡ " : ""}${v.label}` }))]; const curLabel = opts.find((o) => o.id === active)?.label ?? t("Global"); return <Drawer open={pickOpen} onOpenChange={setPickOpen}><DrawerTrigger asChild><button type="button" aria-label={t("Bóvedas")} className="relative mt-2 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-background/80 py-1 pl-3 pr-1 text-xs font-bold shadow-sm transition-colors hover:border-primary active:scale-95">{curLabel}<span className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-primary"><ChevronDown size={15} strokeWidth={2.75} aria-hidden /></span></button></DrawerTrigger>
      <DrawerContent><DrawerHeader><DrawerTitle>{t("Bóvedas")}</DrawerTitle></DrawerHeader><div className="grid gap-2 px-4 pb-6">{opts.map((o) => <button key={o.id} type="button" aria-pressed={active === o.id} onClick={() => { setTab(o.id); setSel(null); setPickOpen(false); }} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium ${active === o.id ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{o.label}{active === o.id && <CheckCircle2 size={16} />}</button>)}</div></DrawerContent></Drawer>; })()}
    {open.length > 0 && open.length <= 2 && <div role="tablist" aria-label={t("Bóvedas")} className="relative mt-2 flex gap-2 overflow-x-auto pb-1">{vtab("global", t("Global"))}{open.map((v) => vtab(v.id, `${VAULTS.find((x) => x.id === v.id)?.badge ? "⚡ " : ""}${v.label}`))}</div>}
    {cur && chain && <div className="relative mt-2 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-muted/40 p-2">
      {cur.id === "trump" ? <img src={trumpLogo} alt="TRUMP" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full object-cover" /> : cur.id === "dcty" ? <img src={dctyLogo} alt="DCTY" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full object-cover" /> : <TokenIcon symbol={chain.symbol} size={32} />}
      <div className="min-w-0 flex-1"><p className="truncate font-display text-sm font-bold">{chain.symbol} <span className="font-normal text-muted-foreground">/ USDC</span></p>
        <button type="button" onClick={copyMint} aria-label={t("Copiar contrato")} className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-0.5 font-mono text-[11px] text-muted-foreground hover:text-foreground">{copied ? <><Check size={11} className="text-primary" />{t("Copiado")}</> : <><Copy size={11} />{chain.mint.slice(0, 4)}…{chain.mint.slice(-4)}</>}</button></div>
      {vinfo?.links && <a href={vinfo.links.gmgn} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-bold"><img src="/gmgn-logo.png" alt="" width={16} height={16} className="h-4 w-4 rounded-sm" />{t("Ver gráfica")}</a>}
    </div>}
    <div className="relative mt-1">
      <div><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full" style={{ background: theme.b, boxShadow: `0 0 6px ${theme.b}` }} />{isPrice ? t("Market cap {s}", { s: sym }) : t("Market cap global")}</p><p className="flex items-center gap-2"><span className={`font-display text-xl font-extrabold tabular-nums sm:text-2xl ${theme.text}`} style={theme.text ? undefined : { color: theme.b }}>{loading && !liveCap ? "…" : mText}</span>{(ms[0] ?? 0) > 0 && <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${pct >= 0 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{pct >= 0 ? "+" : ""}{pct.toFixed(1)}%</span>}</p></div>
    </div>
    <svg viewBox={`0 0 ${W} ${H}`} className="relative mt-2 h-40 w-full overflow-visible sm:h-52" role="img" aria-label={t("Mercado global frente a ganancias cosechadas")}>
      <defs>
        <linearGradient id={`h${gid}`} x1="0" x2="1"><stop offset="0%" stopColor={theme.a} /><stop offset="100%" stopColor={theme.b} /></linearGradient>
        <linearGradient id={`a${gid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity="0.32" /><stop offset="100%" stopColor="var(--primary)" stopOpacity="0" /></linearGradient>
      </defs>
      {cmax > cmin && <><text x={R} y={CT - 4} textAnchor="end" fontSize="10" fill="var(--muted-foreground)">{cap(cmax)}</text><text x={R} y={CB + 12} textAnchor="end" fontSize="10" fill="var(--muted-foreground)">{cap(cmin)}</text></>}
      {!drawing && (live || n > 1) && cPts.length >= 2 && (() => {
        // GMGN look: green above the window's opening level, red below, soft area fill, dashed current-level line with badge.
        const refY = cPts[0]!.y, off = Math.min(1, Math.max(0, (refY - CT) / Math.max(CB - CT, 1))), up = cEnd.y <= refY, endC = up ? "#10B981" : "#EF4444";
        const label = cap(ms[ms.length - 1] ?? 0), bw = label.length * 6 + 10;
        return <>
          <defs>
            <linearGradient id={`s${gid}`} gradientUnits="userSpaceOnUse" x1="0" y1={CT} x2="0" y2={CB}><stop offset={off} stopColor="#10B981" /><stop offset={off} stopColor="#EF4444" /></linearGradient>
            <linearGradient id={`f${gid}`} gradientUnits="userSpaceOnUse" x1="0" y1={CT} x2="0" y2={CB}><stop offset="0" stopColor="#10B981" stopOpacity="0.22" /><stop offset={off} stopColor="#10B981" stopOpacity="0.03" /><stop offset={off} stopColor="#EF4444" stopOpacity="0.03" /><stop offset="1" stopColor="#EF4444" stopOpacity="0.22" /></linearGradient>
          </defs>
          <path d={`${cLine} L${cEnd.x.toFixed(1)},${refY.toFixed(1)} L${cPts[0]!.x.toFixed(1)},${refY.toFixed(1)} Z`} fill={`url(#f${gid})`} />
          <line x1={L} y1={refY} x2={R} y2={refY} stroke="var(--muted-foreground)" strokeOpacity="0.35" strokeDasharray="2 4" />
          <line x1={L} y1={cEnd.y} x2={R} y2={cEnd.y} stroke={endC} strokeOpacity="0.7" strokeDasharray="2 3" />
          <path d={cLine} fill="none" stroke={`url(#s${gid})`} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={cEnd.x} cy={cEnd.y} r="7" fill={endC} opacity="0.25" /><circle cx={cEnd.x} cy={cEnd.y} r="3.5" fill={endC} />
          <rect x={R - bw} y={cEnd.y - 9} width={bw} height="18" rx="4" fill={endC} /><text x={R - bw / 2} y={cEnd.y + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">{label}</text>
        </>;
      })()}
    </svg>
    {drawing && <div role="status" className="pointer-events-none absolute inset-x-0 -mt-[6.5rem] flex flex-col sm:-mt-[8.5rem] items-center justify-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-7 animate-spin text-primary" aria-hidden />{t("Cargando gráfica…")}</div>}
    {!drawing && !live && n <= 1 && <div className="pointer-events-none absolute inset-x-0 -mt-[5.5rem] flex justify-center text-xs text-muted-foreground sm:-mt-28">{t("Gráfica no disponible por ahora")}</div>}
    <div className="relative mt-1 flex justify-between text-[11px] capitalize text-muted-foreground"><span>{n === 0 ? t("Hace 5 h") : n === 1 ? t("Hace 24 h") : young ? t("Desde lanzamiento") : new Date(days[0]!.start).toLocaleDateString(locale, { day: "numeric", month: "short" })}</span><span>{n <= 1 ? t("Ahora") : t("Hoy")}</span></div>
      </div>;
}
