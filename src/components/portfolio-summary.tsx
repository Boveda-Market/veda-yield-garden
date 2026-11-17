import { Layers, PieChart, Sparkles, Sprout, TrendingUp } from "lucide-react";
import { useT } from "@/lib/i18n";
import type { ChainPosition } from "@/lib/solana-data";
import { useMeteoraHistory } from "@/hooks/use-meteora-history";
import { usePositionRows } from "@/hooks/use-position-rows";
import { MASK, useHideBalances } from "@/lib/preferences";
import { formatUsd } from "@/lib/position-value";
import { canHarvest } from "@/lib/harvest";
import { VAULTS } from "@/lib/vaults";
import { Button } from "./ui/button";
import { useId, useState } from "react";
import { CHAIN_POOLS } from "@/lib/solana-data";
import { cumulative, weeklyInterest, weekTotalMicro } from "@/lib/weekly-interest";
import { useLocale } from "@/lib/i18n";

const COLORS = ["bg-primary", "bg-chart-1", "bg-chart-2", "bg-chart-4", "bg-chart-3", "bg-chart-5"];

/** Visual performance board: capital split by vault/plays, weighted APR, pending, harvested PNL and in/out volume. */
export function PortfolioSummary({ wallet, positions, predictionsMicro, onHarvest }: { wallet: string | null; positions: ChainPosition[]; positionsComplete: boolean; predictionsMicro: bigint | null; onHarvest: (p: ChainPosition) => void }) {
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
  const pnl = history.pnl ? Number(history.pnl.replace(/,/g, "")) : null;
  const tile = "rounded-2xl border border-border bg-card p-4";
  const label = "flex items-center gap-1.5 text-xs text-muted-foreground";
  const loading = history.query.isFetching ? t("Calculando…") : "—";

  return <section aria-label={t("Rendimiento de tu portafolio")} className="py-8">
    <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><TrendingUp size={18} className="text-primary" />{t("Tu rendimiento")}</h2>

    <div className={`${tile} mt-4`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className={label}><PieChart size={14} />{t("Capital trabajando")}</p><p className="mt-1 font-display text-3xl font-semibold tabular-nums">{total > 0 ? money(total) : "—"}</p></div>
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
        <p className="mt-2 font-display text-xl font-semibold tabular-nums text-primary">{totalFees > 0 ? `+${money(totalFees)}` : money(0)}</p>
        {top && canHarvest(top.fees) ? <Button size="sm" className="mt-2 w-full" onClick={() => onHarvest(top.p)}>{t("Cosechar ahora")}</Button> : <p className="mt-1 text-xs text-muted-foreground">{t("Se activa desde $0.50.")}</p>}
      </div>
      <div className={tile}>
        <p className={label}><Sparkles size={14} />{t("Ganancias (PNL)")}</p>
        <p className="mt-2 font-display text-xl font-semibold tabular-nums text-primary">{pnl !== null ? `+${money(pnl)}` : loading}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("Lo que ya cosechaste.")}</p>
      </div>
    </div>
    <WeeklyChart records={history.records} poolPrices={history.poolPrices} money={money} />
    <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-muted-foreground"><Layers size={12} className="mt-0.5 shrink-0" />{t("Ganancias = lo que ya cosechaste, al precio de hoy. No incluye subidas o bajadas del precio de tu capital.")}</p>
  </section>;
}

/** «Intereses de la semana»: smooth neon line, «Acumulado» (running total) or «Por día» (each day's harvest). */
function WeeklyChart({ records, poolPrices, money }: { records: Parameters<typeof weeklyInterest>[0]; poolPrices: Record<string, number | null>; money: (n: number | null) => string }) {
  const t = useT();
  const locale = useLocale();
  const gid = useId().replace(/:/g, "");
  const [sel, setSel] = useState<number | null>(null);
  const [mode, setMode] = useState<"acc" | "day">("acc");
  const tokenValue = (r: { tokenRaw?: string; pool?: string }) => {
    const cfg = CHAIN_POOLS.find((c) => c.pool === r.pool), price = r.pool ? poolPrices[r.pool] : null;
    if (!cfg || !price || !r.tokenRaw || !/^\d{1,30}$/.test(r.tokenRaw)) return 0n;
    return BigInt(Math.floor(Number(r.tokenRaw) / 10 ** cfg.decimals * price * 1e6));
  };
  const days = weeklyInterest(records, Date.now(), -new Date().getTimezoneOffset(), tokenValue);
  const acc = cumulative(days);
  const values = (mode === "acc" ? acc : days.map((d) => d.micro)).map((m) => Number(m) / 1e6);
  const total = Number(weekTotalMicro(days)) / 1e6;
  const shown = sel ?? 6;
  const fmtDay = (start: number, i: number) => i === 6 ? t("Hoy") : new Date(start).toLocaleDateString(locale, { weekday: "short" }).replace(".", "");
  const W = 380, TOP = 20, BASE = 110, X0 = 15, X1 = 365;
  const max = Math.max(...values, 0.000001);
  const pts = values.map((v, i) => ({ x: X0 + (i * (X1 - X0)) / 6, y: BASE - (v / max) * (BASE - TOP) }));
  let line = `M${pts[0]!.x},${pts[0]!.y}`;
  for (let i = 1; i < pts.length; i++) { const p = pts[i - 1]!, c = pts[i]!, mx = (p.x + c.x) / 2; line += ` C${mx},${p.y} ${mx},${c.y} ${c.x},${c.y}`; }
  const area = `${line} L${X1},${BASE} L${X0},${BASE} Z`;
  const active = pts[shown]!;
  const pick = (e: React.PointerEvent<SVGSVGElement>) => { const r = e.currentTarget.getBoundingClientRect(); const x = ((e.clientX - r.left) / r.width) * W; setSel(Math.max(0, Math.min(6, Math.round(((x - X0) / (X1 - X0)) * 6)))); };
  const tab = (m: "acc" | "day", label: string) => <button type="button" onClick={() => setMode(m)} aria-pressed={mode === m} className={`rounded-lg px-2.5 py-1 transition ${mode === m ? "bg-primary font-bold text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>;
  return <div className="relative mt-3 overflow-hidden rounded-3xl border border-border bg-card p-5">
    <div className="pointer-events-none absolute -right-24 -top-24 size-48 rounded-full bg-primary/10 blur-3xl" />
    <div className="relative flex items-start justify-between gap-2">
      <div><p className="text-xs font-medium text-muted-foreground">{t("Intereses de la semana")}</p><p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-primary drop-shadow-[0_0_8px_var(--primary)]">+{money(total)}</p></div>
      <div className="inline-flex items-center rounded-xl border border-border bg-muted/60 p-1 text-[11px] font-medium">{tab("acc", t("Acumulado"))}{tab("day", t("Por día"))}</div>
    </div>
    <div className="relative mt-3 flex items-center justify-between gap-2 border-b border-border/50 pb-2.5 text-xs">
      {total > 0 ? <span className="text-muted-foreground">{mode === "acc" ? t("Hasta {d}", { d: fmtDay(days[shown]!.start, shown) }) : fmtDay(days[shown]!.start, shown)}: <strong className="text-primary">+{money(values[shown]!)}</strong></span> : <span className="text-muted-foreground">{t("Tus intereses se irán trazando día a día.")}</span>}
      <span className="shrink-0 tabular-nums text-muted-foreground">{t("~${v} / día", { v: (total / 7).toFixed(2) })}</span>
    </div>
    <svg viewBox={`0 0 ${W} 130`} className="relative mt-4 h-32 w-full touch-none overflow-visible" role="img" aria-label={t("Intereses cosechados por día, últimos 7 días")} onPointerDown={pick} onPointerMove={(e) => e.buttons || e.pointerType === "mouse" ? pick(e) : undefined}>
      <defs>
        <linearGradient id={`a${gid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity="0.32" /><stop offset="70%" stopColor="var(--primary)" stopOpacity="0.06" /><stop offset="100%" stopColor="var(--primary)" stopOpacity="0" /></linearGradient>
        <filter id={`g${gid}`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="b" /><feComposite in="SourceGraphic" in2="b" operator="over" /></filter>
      </defs>
      {[TOP, (TOP + BASE) / 2].map((y) => <line key={y} x1={10} y1={y} x2={370} y2={y} stroke="var(--border)" strokeDasharray="3 4" />)}
      <line x1={10} y1={BASE} x2={370} y2={BASE} stroke="var(--border)" />
      {total > 0 && <path d={area} fill={`url(#a${gid})`} />}
      <path d={line} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeDasharray={total > 0 ? undefined : "6 8"} opacity={total > 0 ? 1 : 0.5} filter={`url(#g${gid})`} />
      {pts.map((p, i) => i !== shown && <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="var(--muted-foreground)" opacity="0.6" />)}
      <line x1={active.x} y1={active.y} x2={active.x} y2={BASE} stroke="var(--primary)" strokeDasharray="2 3" strokeWidth="1.5" opacity="0.6" />
      <circle cx={active.x} cy={active.y} r="8" fill="var(--primary)" fillOpacity="0.25" className={total > 0 ? "" : "animate-pulse"} />
      <circle cx={active.x} cy={active.y} r="4.5" fill="var(--background)" stroke="var(--primary)" strokeWidth="2.5" />
    </svg>
    <div className="relative mt-2 grid grid-cols-7 text-center text-[11px] font-medium capitalize text-muted-foreground">{days.map((d, i) => <button type="button" key={d.key} onClick={() => setSel(i)} className={i === shown ? "font-bold text-primary" : ""}>{fmtDay(d.start, i)}</button>)}</div>
  </div>;
}
