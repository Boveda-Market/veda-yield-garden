import { useEffect, useState } from "react";
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

export function PriceChart({ market, price, reference, referenceLabel }: { market: MarketId; price?: number | undefined; reference?: number | undefined; referenceLabel?: string }) {
  const t = useT();
  const [style, setStyle] = useState<Style>("candles");
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
        {([["candles", t("Velas")], ["line", t("Línea")]] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={style === k} onClick={() => setStyle(k)} className={pill(style === k)}>{l}</button>)}
      </div>
      <div className="flex rounded-full bg-secondary p-0.5" role="tablist" aria-label={t("Zoom de tiempo")}>
        {ZOOMS.map((z) => <button key={z.id} role="tab" aria-selected={zoom === z.id} onClick={() => setZoom(z.id)} className={pill(zoom === z.id)}>{z.id}</button>)}
      </div>
    </div>
  );

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
          {style === "line" ? <>
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
            {style === "line" ? `$${fmt(hc.c)}` : `A ${fmt(hc.o)} · C ${fmt(hc.c)}`}
          </div>
        </>}
      </div>
    </>
  );
}
