import { useId, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useT, useLocale } from "@/lib/i18n";
import type { BalancePoint } from "@/lib/portfolio";

const W = 720, H = 240, L = 16, R = 704, TOP = 24, BOTTOM = 196;

function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  const s = pts[0]!; let d = `M${s.x},${s.y}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1]!, c = pts[i]!, mx = (p.x + c.x) / 2;
    d += ` C${mx},${p.y} ${mx},${c.y} ${c.x},${c.y}`;
  }
  return d;
}

export function PortfolioChart({ points, unit }: { points: BalancePoint[]; unit: string }) {
  const t = useT();
  const locale = useLocale();
  const gradientId = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const fmt = (v: number) => v.toLocaleString(locale, { maximumFractionDigits: 6 });

  if (points.length < 2) return <div className="relative grid h-64 place-items-center overflow-hidden rounded-2xl border border-border bg-card px-6 text-center">
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full opacity-40" aria-hidden="true"><path d={`M${L},150 C200,140 300,120 400,110 C500,100 600,80 ${R},70`} fill="none" stroke="var(--border)" strokeWidth="2" strokeDasharray="6 8" /></svg>
    <div className="relative"><span className="mx-auto mb-4 block h-3 w-3 animate-ping rounded-full bg-primary" /><p className="font-display font-semibold">{t("Tu gráfica empieza aquí")}</p><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{t("Tu gráfica se irá trazando automáticamente con cada visita y movimiento.")}</p>{points[0] && <p className="mt-4 text-sm">{t("Primera lectura:")} {fmt(points[0].balance)} {unit}</p>}</div>
  </div>;

  const first = points[0]!, last = points[points.length - 1]!;
  const min = Math.min(...points.map((p) => p.balance)), max = Math.max(...points.map((p) => p.balance));
  const range = Math.max(max - min, 0.000001);
  const elapsed = Math.max(last.at - first.at, 1);
  const coords = points.map((p) => ({ ...p, x: L + (p.at - first.at) / elapsed * (R - L), y: BOTTOM - (p.balance - min) / range * (BOTTOM - TOP) }));
  const line = smoothPath(coords);
  const area = `${line} L${R},${BOTTOM} L${L},${BOTTOM} Z`;
  const change = last.balance - first.balance;
  const pct = first.balance !== 0 ? change / first.balance * 100 : null;
  const up = change >= 0;
  const active = hover !== null ? coords[hover] : null;

  function onMove(event: React.PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * W;
    let best = 0;
    coords.forEach((c, i) => { if (Math.abs(c.x - x) < Math.abs(coords[best]!.x - x)) best = i; });
    setHover(best);
  }

  return <div className="min-w-0 w-full rounded-2xl border border-border bg-card p-4">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <p className="font-display text-2xl font-semibold">{fmt(active?.balance ?? last.balance)} <span className="text-sm text-muted-foreground">{unit}</span></p>
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${up ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>{up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{up ? "+" : ""}{fmt(change)} {unit}{pct !== null && ` (${up ? "+" : ""}${pct.toLocaleString(locale, { maximumFractionDigits: 2 })}%)`} · {t("en el periodo")}</span>
    </div>
    <p className="mt-1 h-4 text-xs text-muted-foreground">{active ? new Date(active.at).toLocaleString(locale) : `${new Date(first.at).toLocaleDateString(locale)} – ${new Date(last.at).toLocaleDateString(locale)}`}</p>
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-56 w-full touch-none" role="img" aria-label={t("Evolución del saldo: {first} a {last} {unit}", { first: first.balance, last: last.balance, unit })} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
      <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" /><stop offset="100%" stopColor="var(--primary)" stopOpacity="0" /></linearGradient></defs>
      {[TOP, (TOP + BOTTOM) / 2, BOTTOM].map((y) => <line key={y} x1={L} y1={y} x2={R} y2={y} stroke="var(--border)" strokeDasharray="3 6" />)}
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
      <text x={R} y={TOP - 8} textAnchor="end" fill="var(--muted-foreground)" fontSize="12">{fmt(max)}</text>
      <text x={R} y={BOTTOM + 18} textAnchor="end" fill="var(--muted-foreground)" fontSize="12">{fmt(min)}</text>
      {active ? <g><line x1={active.x} y1={TOP} x2={active.x} y2={BOTTOM} stroke="var(--muted-foreground)" strokeDasharray="4 4" /><circle cx={active.x} cy={active.y} r="6" fill="var(--background)" stroke="var(--primary)" strokeWidth="3" /></g>
        : <circle cx={coords[coords.length - 1]!.x} cy={coords[coords.length - 1]!.y} r="5" fill="var(--primary)" />}
    </svg>
    <p className="text-xs text-muted-foreground">{t("Desliza sobre la gráfica para ver cada lectura.")}</p>
  </div>;
}
