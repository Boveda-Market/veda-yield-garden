import { useState } from "react";
import { useT } from "@/lib/i18n";

/** Price ticks arrive every ~1.5 s; zoom maps to a tick count. */
export const TICK_MS = 1500;
const ZOOMS = [{ id: "1m", ms: 60_000 }, { id: "5m", ms: 300_000 }, { id: "15m", ms: 900_000 }] as const;
type Zoom = (typeof ZOOMS)[number]["id"];
type Style = "line" | "candles";

const fmt = (n: number) => n.toFixed(n >= 1000 ? 2 : 3).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

export function PriceChart({ points, reference, referenceLabel }: { points: number[]; reference?: number | undefined; referenceLabel?: string }) {
  const t = useT();
  const [style, setStyle] = useState<Style>("line");
  const [zoom, setZoom] = useState<Zoom>("5m");
  const [hover, setHover] = useState<number | null>(null);
  const count = Math.round(ZOOMS.find((z) => z.id === zoom)!.ms / TICK_MS);
  const pts = points.slice(-count);

  const pill = (active: boolean) => `rounded-full px-3 py-1 text-xs font-semibold transition ${active ? "bg-foreground text-background" : "text-muted-foreground"}`;
  const controls = (
    <div className="flex items-center justify-between px-5 pb-2">
      <div className="flex rounded-full bg-secondary p-0.5" role="tablist" aria-label={t("Estilo de gráfica")}>
        {([["line", t("Línea")], ["candles", t("Velas")]] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={style === k} onClick={() => setStyle(k)} className={pill(style === k)}>{l}</button>)}
      </div>
      <div className="flex rounded-full bg-secondary p-0.5" role="tablist" aria-label={t("Zoom de tiempo")}>
        {ZOOMS.map((z) => <button key={z.id} role="tab" aria-selected={zoom === z.id} onClick={() => setZoom(z.id)} className={pill(zoom === z.id)}>{z.id}</button>)}
      </div>
    </div>
  );

  if (pts.length < 2) return <>{controls}<div className="h-32" /></>;

  // Candles: group ticks into ~24 buckets.
  const per = Math.max(2, Math.ceil(pts.length / 24));
  const candles: { o: number; h: number; l: number; c: number }[] = [];
  for (let i = 0; i < pts.length; i += per) {
    const g = pts.slice(Math.max(0, i - 1), i + per); // include previous close as open
    candles.push({ o: g[0]!, c: g[g.length - 1]!, h: Math.max(...g), l: Math.min(...g) });
  }

  const all = reference ? [...pts, reference] : pts;
  const min = Math.min(...all), max = Math.max(...all), span = max - min || 1;
  const y = (v: number) => 40 - ((v - min) / span) * 36 - 2;
  const last = pts[pts.length - 1]!;
  const up = reference ? last >= reference : last >= pts[0]!;
  const d = pts.map((v, i) => `${(i / (pts.length - 1)) * 100},${y(v)}`).join(" ");
  const refY = reference ? y(reference) : null;

  const n = style === "line" ? pts.length : candles.length;
  const pick = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHover(Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * (n - 1)));
  };
  const hx = hover !== null ? (style === "line" ? (hover / (n - 1)) * 100 : ((hover + 0.5) / n) * 100) : 0;
  const hv = hover === null ? undefined : style === "line" ? pts[hover] : candles[hover]?.c;

  return (
    <>
      {controls}
      <div className="relative touch-none" onPointerMove={pick} onPointerDown={pick} onPointerLeave={() => setHover(null)}>
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" className={`h-32 w-full ${up ? "text-primary" : "text-destructive"}`} aria-hidden>
          {refY !== null && <>
            <rect x="0" y="0" width="100" height={refY} className="fill-primary" opacity="0.06" />
            <rect x="0" y={refY} width="100" height={40 - refY} className="fill-destructive" opacity="0.06" />
          </>}
          {style === "line" ? <>
            <defs><linearGradient id="pc-grad" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.35" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
            <polygon points={`0,40 ${d} 100,40`} fill="url(#pc-grad)" />
            <polyline points={d} fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
          </> : candles.map((c, i) => {
            const w = 100 / candles.length, cx = i * w + w / 2, rise = c.c >= c.o;
            const top = y(Math.max(c.o, c.c)), bot = y(Math.min(c.o, c.c));
            const cls = rise ? "text-primary" : "text-destructive";
            return <g key={i} className={cls}>
              <line x1={cx} x2={cx} y1={y(c.h)} y2={y(c.l)} stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <rect x={cx - w * 0.32} width={w * 0.64} y={top} height={Math.max(0.4, bot - top)} fill="currentColor" />
            </g>;
          })}
          {refY !== null && <line x1="0" x2="100" y1={refY} y2={refY} className="text-muted-foreground" stroke="currentColor" strokeDasharray="3 2" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
        </svg>
        {reference && refY !== null && <div className="pointer-events-none absolute right-1 -translate-y-1/2 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-secondary-foreground" style={{ top: `${(refY / 40) * 100}%` }}>{referenceLabel} ${fmt(reference)}</div>}
        {hover !== null && hv !== undefined && <>
          <div className="pointer-events-none absolute inset-y-0 w-px bg-foreground/40" style={{ left: `${hx}%` }} />
          <div className="pointer-events-none absolute -top-1 rounded-md bg-foreground px-2 py-0.5 text-xs font-semibold tabular-nums text-background" style={{ left: `clamp(0px, calc(${hx}% - 40px), calc(100% - 90px))` }}>${fmt(hv)}</div>
        </>}
      </div>
    </>
  );
}
