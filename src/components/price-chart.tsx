import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { fetchCandles, type Candle, type MarketId } from "@/lib/markets";

/** Price ticks arrive every ~1.5 s. */
export const TICK_MS = 1500;
const ZOOMS = [{ id: "1m", sec: 60 }, { id: "5m", sec: 300 }, { id: "15m", sec: 900 }] as const;
type Zoom = (typeof ZOOMS)[number]["id"];
type Style = "line" | "candles";
const COUNT = 36;
const W = 360, H = 140, PAD = 6;

const fmt = (n: number) => n.toFixed(n >= 1000 ? 2 : 3).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

export function PriceChart({ market, points, price, reference, referenceLabel }: { market: MarketId; points: number[]; price?: number | undefined; reference?: number | undefined; referenceLabel?: string }) {
  const t = useT();
  const [style, setStyle] = useState<Style>("line");
  const [zoom, setZoom] = useState<Zoom>("1m");
  const [hover, setHover] = useState<number | null>(null);
  const [hist, setHist] = useState<Candle[]>([]);
  const sec = ZOOMS.find((z) => z.id === zoom)!.sec;

  useEffect(() => {
    let alive = true;
    setHist([]);
    const load = () => void fetchCandles(market, sec, COUNT).then((c) => { if (alive && c.length) setHist(c); });
    load();
    const id = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(id); };
  }, [market, sec]);

  // Merge the live price into the current candle (or start a new one).
  const candles = [...hist];
  if (price && candles.length) {
    const bucket = Math.floor(Date.now() / (sec * 1000)) * sec * 1000;
    const last = candles[candles.length - 1]!;
    if (last.t === bucket) candles[candles.length - 1] = { ...last, c: price, h: Math.max(last.h, price), l: Math.min(last.l, price) };
    else if (bucket > last.t) { candles.push({ t: bucket, o: last.c, h: Math.max(last.c, price), l: Math.min(last.c, price), c: price }); }
    if (candles.length > COUNT) candles.shift();
  }

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

  if (style === "line") {
    return <>{controls}<LiveLine points={points} sec={sec} reference={reference} referenceLabel={referenceLabel} /></>;
  }

  return <CandleView controls={controls} candles={candles} reference={reference} referenceLabel={referenceLabel} style={style} hover={hover} setHover={setHover} />;
}

/** Smooth Catmull-Rom curve through points, as SVG cubic Béziers. */
function smoothPath(p: [number, number][]) {
  if (!p.length) return "";
  let d = `M${p[0]![0]},${p[0]![1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] ?? p[i]!, b = p[i]!, c = p[i + 1]!, e = p[i + 2] ?? c;
    d += ` C${b[0] + (c[0] - a[0]) / 6},${b[1] + (c[1] - a[1]) / 6} ${c[0] - (e[0] - b[0]) / 6},${c[1] - (e[1] - b[1]) / 6} ${c[0]},${c[1]}`;
  }
  return d;
}

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

function LiveLine({ points, sec, reference, referenceLabel }: { points: number[]; sec: number; reference?: number | undefined; referenceLabel?: string | undefined }) {
  const [, setFrame] = useState(0);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const tick = useRef({ at: 0, from: 0, to: 0, len: 0 });
  const scale = useRef<{ min: number; max: number } | null>(null);

  const last = points[points.length - 1];
  if (last !== undefined && points.length !== tick.current.len) {
    const now = typeof performance !== "undefined" ? performance.now() : 0;
    const k = tick.current;
    const p = k.at ? ease(Math.min(1, (now - k.at) / TICK_MS)) : 1;
    const shown = k.len ? k.from + (k.to - k.from) * p : last;
    tick.current = { at: now, from: shown, to: last, len: points.length };
  }

  useEffect(() => {
    let id = 0;
    const loop = () => { setFrame((f) => (f + 1) % 1e6); id = requestAnimationFrame(loop); };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);

  const span = sec * 1000;
  const need = Math.ceil(span / TICK_MS) + 3;
  const pts = points.slice(-need);
  if (pts.length < 2 || !tick.current.at) return <div className="h-36" />;

  const now = performance.now();
  const k = tick.current;
  const prog = Math.min(1, (now - k.at) / TICK_MS);
  const head = k.from + (k.to - k.from) * ease(prog);
  // Time of each tick, relative to "now"; the newest point is drawn sliding toward the right edge.
  const elapsed = Math.min(now - k.at, TICK_MS);
  const toX = (age: number) => W - (age / span) * W;
  const coords: [number, number][] = [];
  const vals = pts.map((v, i) => (i === pts.length - 1 ? head : v));
  const ages: number[] = [];
  for (let i = 0; i < pts.length; i++) ages[i] = (pts.length - 1 - i) * TICK_MS + (i === pts.length - 1 ? 0 : elapsed - TICK_MS);

  const visible = vals.filter((_, i) => ages[i]! <= span + TICK_MS);
  const all = reference ? [...visible, reference] : visible;
  const tMin = Math.min(...all), tMax = Math.max(...all);
  const pad = (tMax - tMin) * 0.08 || tMax * 0.0005 || 1;
  const s = scale.current ?? { min: tMin - pad, max: tMax + pad };
  s.min += (tMin - pad - s.min) * 0.08;
  s.max += (tMax + pad - s.max) * 0.08;
  s.min = Math.min(s.min, tMin); s.max = Math.max(s.max, tMax);
  scale.current = s;
  const rng = s.max - s.min || 1;
  const y = (v: number) => PAD + (1 - (v - s.min) / rng) * (H - PAD * 2);

  for (let i = 0; i < vals.length; i++) coords.push([toX(ages[i]!), y(vals[i]!)]);
  const d = smoothPath(coords);
  const first = coords[0]!, end = coords[coords.length - 1]!;
  const upL = reference ? head >= reference : head >= vals[0]!;
  const refY = reference ? y(reference) : null;

  let hv: number | undefined, hx = 0;
  if (hoverX !== null) {
    let best = 0;
    for (let i = 0; i < coords.length; i++) if (Math.abs(coords[i]![0] - hoverX * W) < Math.abs(coords[best]![0] - hoverX * W)) best = i;
    hv = vals[best]; hx = (Math.max(0, coords[best]![0]) / W) * 100;
  }
  const pickL = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHoverX(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
  };

  return (
    <div className="relative touch-none overflow-hidden" onPointerMove={pickL} onPointerDown={pickL} onPointerLeave={() => setHoverX(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={`h-36 w-full transition-colors duration-500 ${upL ? "text-primary" : "text-destructive"}`} aria-hidden>
        {refY !== null && <>
          <rect x="0" y="0" width={W} height={refY} className="fill-primary" opacity="0.05" />
          <rect x="0" y={refY} width={W} height={H - refY} className="fill-destructive" opacity="0.05" />
        </>}
        <defs><linearGradient id="pc-grad" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.35" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
        <path d={`${d} L${end[0]},${H} L${first[0]},${H} Z`} fill="url(#pc-grad)" />
        <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {refY !== null && <line x1="0" x2={W} y1={refY} y2={refY} className="text-muted-foreground" stroke="currentColor" strokeDasharray="4 3" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
      </svg>
      <span className={`pointer-events-none absolute right-0 h-2.5 w-2.5 -translate-y-1/2 translate-x-1/2 rounded-full ${upL ? "bg-primary" : "bg-destructive"}`} style={{ top: `${(end[1] / H) * 100}%`, right: "4px" }}>
        <span className={`absolute inset-0 animate-ping rounded-full ${upL ? "bg-primary" : "bg-destructive"} opacity-60`} />
      </span>
      {reference && refY !== null && <div className="pointer-events-none absolute left-1 -translate-y-1/2 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-secondary-foreground" style={{ top: `${(refY / H) * 100}%` }}>{referenceLabel} ${fmt(reference)}</div>}
      {hv !== undefined && <>
        <div className="pointer-events-none absolute inset-y-0 w-px bg-foreground/40" style={{ left: `${hx}%` }} />
        <div className="pointer-events-none absolute -top-2 rounded-md bg-foreground px-2 py-0.5 text-xs font-semibold tabular-nums text-background" style={{ left: `clamp(0px, calc(${hx}% - 40px), calc(100% - 90px))` }}>${fmt(hv)}</div>
      </>}
    </div>
  );
}

function CandleView({ controls, candles, reference, referenceLabel, style, hover, setHover }: { controls: React.ReactNode; candles: Candle[]; reference?: number | undefined; referenceLabel?: string | undefined; style: Style; hover: number | null; setHover: (n: number | null) => void }) {
  const t = useT();
  if (candles.length < 2) return <>{controls}<div className="flex h-36 items-center justify-center text-xs text-muted-foreground">{t("Cargando gráfica…")}</div></>;

  const lows = candles.map((c) => c.l), highs = candles.map((c) => c.h);
  const all = reference ? [...lows, ...highs, reference] : [...lows, ...highs];
  const min = Math.min(...all), max = Math.max(...all), span = max - min || 1;
  const y = (v: number) => PAD + (1 - (v - min) / span) * (H - PAD * 2);
  const n = candles.length;
  const step = W / COUNT; // fixed slot width so candles keep normal proportions
  const x0 = W - n * step;
  const cx = (i: number) => x0 + i * step + step / 2;
  const bodyW = Math.max(2, step * 0.6);
  const last = candles[n - 1]!.c;
  const up = reference ? last >= reference : last >= candles[0]!.o;
  const d = candles.map((c, i) => `${cx(i)},${y(c.c)}`).join(" ");
  const refY = reference ? y(reference) : null;

  const pick = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(n - 1, Math.floor((px - x0) / step))));
  };
  const hc = hover !== null ? candles[hover] : undefined;
  const hx = hover !== null ? (cx(hover) / W) * 100 : 0;

  return (
    <>
      {controls}
      <div className="relative touch-none" onPointerMove={pick} onPointerDown={pick} onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={`h-36 w-full ${up ? "text-primary" : "text-destructive"}`} aria-hidden>
          {refY !== null && <>
            <rect x="0" y="0" width={W} height={refY} className="fill-primary" opacity="0.05" />
            <rect x="0" y={refY} width={W} height={H - refY} className="fill-destructive" opacity="0.05" />
          </>}
          {(style as Style) === "line" ? <>
            <defs><linearGradient id="pc-grad" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.3" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
            <polygon points={`${cx(0)},${H} ${d} ${cx(n - 1)},${H}`} fill="url(#pc-grad)" />
            <polyline points={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </> : candles.map((c, i) => {
            const rise = c.c >= c.o;
            const top = y(Math.max(c.o, c.c)), bot = y(Math.min(c.o, c.c));
            return <g key={c.t} className={rise ? "text-primary" : "text-destructive"}>
              <line x1={cx(i)} x2={cx(i)} y1={y(c.h)} y2={y(c.l)} stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <rect x={cx(i) - bodyW / 2} width={bodyW} y={top} height={Math.max(1, bot - top)} rx="0.6" fill="currentColor" />
            </g>;
          })}
          {refY !== null && <line x1="0" x2={W} y1={refY} y2={refY} className="text-muted-foreground" stroke="currentColor" strokeDasharray="4 3" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
        </svg>
        {reference && refY !== null && <div className="pointer-events-none absolute left-1 -translate-y-1/2 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-secondary-foreground" style={{ top: `${(refY / H) * 100}%` }}>{referenceLabel} ${fmt(reference)}</div>}
        {hc && <>
          <div className="pointer-events-none absolute inset-y-0 w-px bg-foreground/40" style={{ left: `${hx}%` }} />
          <div className="pointer-events-none absolute -top-2 rounded-md bg-foreground px-2 py-0.5 text-[10px] font-semibold tabular-nums text-background" style={{ left: `clamp(0px, calc(${hx}% - 60px), calc(100% - 130px))` }}>
            {(style as Style) === "line" ? `$${fmt(hc.c)}` : `A ${fmt(hc.o)} · C ${fmt(hc.c)}`}
          </div>
        </>}
      </div>
    </>
  );
}
