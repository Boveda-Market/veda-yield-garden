import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { fetchCandles, type Candle, type MarketId } from "@/lib/markets";

/** Live price ticks arrive about once per second. */
export const TICK_MS = 1000;
const ZOOMS = [{ id: "1m", sec: 60 }, { id: "5m", sec: 300 }, { id: "15m", sec: 900 }, { id: "30m", sec: 1800 }, { id: "1h", sec: 3600 }] as const;
type Zoom = (typeof ZOOMS)[number]["id"];
type Style = "duel" | "line" | "candles";
const COUNT = 120;
const W = 360, H = 140, PAD = 6;

const fmt = (n: number) => n.toFixed(n >= 1000 ? 2 : 3).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/** One live market sample: t = ms timestamp, up = Sube share of the two sides' prices (0..1). */
export type OddsPoint = { t: number; up: number };

/** odds: the live market prices of each side (same numbers as the Sube/Baja buttons); the duel never invents its own percentages. */
export function PriceChart({ market, points, price, reference, referenceLabel, window, odds, oddsSeries }: { market: MarketId; points: number[]; price?: number | undefined; reference?: number | undefined; referenceLabel?: string; window?: string | undefined; odds?: { up: number | null; down: number | null } | undefined; oddsSeries?: OddsPoint[] | undefined }) {
  const t = useT();
  // Duel shines in 5 min rounds (price hugs the strike); longer rounds open on the classic line.
  const [style, setStyle] = useState<Style>(window && window !== "5m" ? "line" : "duel");
  useEffect(() => { setStyle(window && window !== "5m" ? "line" : "duel"); }, [window]);
  const [zoom, setZoom] = useState<Zoom>("1m");
  const [hover, setHover] = useState<number | null>(null);
  const [hist, setHist] = useState<Candle[]>([]);
  // Callers without their own odds history (position cards) still get a duel that follows the market odds.
  const [ownOdds, setOwnOdds] = useState<OddsPoint[]>([]);
  const ou = odds?.up, od = odds?.down;
  useEffect(() => { if (ou && od) setOwnOdds((h) => [...h, { t: Date.now(), up: ou / (ou + od) }].slice(-4000)); }, [ou, od]);
  const series = oddsSeries ?? (ownOdds.length ? ownOdds : undefined);
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

  const pill = (active: boolean) => `rounded-full px-2 py-1 text-[11px] font-semibold transition ${active ? "bg-foreground text-background" : "text-muted-foreground"}`;
  const controls = (
    <div className="flex items-center justify-between gap-2 px-4 pb-2">
      <div className="flex rounded-full bg-secondary p-0.5" role="tablist" aria-label={t("Estilo de gráfica")}>
        {([["duel", t("Duelo")], ["line", t("Línea")], ["candles", t("Pro")]] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={style === k} onClick={() => setStyle(k)} className={pill(style === k)}>{l}</button>)}
      </div>
      {style === "candles" && <div className="flex rounded-full bg-secondary p-0.5" role="tablist" aria-label={t("Zoom de tiempo")}>
        {ZOOMS.map((z) => <button key={z.id} role="tab" aria-selected={zoom === z.id} onClick={() => setZoom(z.id)} className={pill(zoom === z.id)}>{z.id}</button>)}
      </div>}
    </div>
  );

  if (style === "duel") {
    // With live market odds the duel plots them, so the line on top always matches the higher percentage.
    if (odds && series) return <>{controls}<OddsDuel series={series} odds={odds} reference={reference} referenceLabel={referenceLabel} /></>;
    // No market odds yet: never guess who leads from the price alone.
    return <>{controls}<div className="flex h-44 items-center justify-center text-xs text-muted-foreground">{t("Cargando porcentajes del mercado…")}</div></>;
  }
  if (style === "line") {
    return <>{controls}<LiveLine points={points} sec={60} reference={reference} referenceLabel={referenceLabel} odds={odds} /></>;
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

function LiveLine({ points, sec, reference, referenceLabel, odds }: { points: number[]; sec: number; reference?: number | undefined; referenceLabel?: string | undefined; odds?: { up: number | null; down: number | null } | undefined }) {
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
  // Green/red follows the market odds when known, so the colour never contradicts the Sube/Baja percentages.
  const upL = odds?.up && odds.down ? odds.up >= odds.down : reference ? head >= reference : head >= vals[0]!;
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
        {refY !== null && <>
          <line x1="0" x2={W} y1={refY} y2={refY} className="text-strike" stroke="currentColor" strokeWidth="7" strokeOpacity="0.18" vectorEffect="non-scaling-stroke" />
          <line x1="0" x2={W} y1={refY} y2={refY} className="text-strike" stroke="currentColor" strokeDasharray="9 4" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </>}
        <line x1="0" x2={W} y1={end[1]} y2={end[1]} stroke="currentColor" strokeOpacity="0.35" strokeDasharray="2 3" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      {(() => { const hi = Math.max(...visible), lo = Math.min(...visible); return <>
        <span className="pointer-events-none absolute left-1 top-0.5 font-mono text-[9px] tabular-nums text-muted-foreground">H {fmt(hi)}</span>
        <span className="pointer-events-none absolute bottom-0.5 left-1 font-mono text-[9px] tabular-nums text-muted-foreground">L {fmt(lo)}</span>
      </>; })()}
      {reference && refY !== null && <span className="pointer-events-none absolute right-1 -translate-y-1/2 rounded-sm bg-strike px-1 py-0.5 text-[9px] font-bold tabular-nums text-background" style={{ top: `${(refY / H) * 100}%` }}>{fmt(reference)}</span>}
      {reference && <span className={`pointer-events-none absolute right-4 -translate-y-[130%] rounded-sm px-1 py-0.5 text-[10px] font-bold tabular-nums ${upL ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}`} style={{ top: `${(end[1] / H) * 100}%` }}>{head >= reference ? "▲ +" : "▼ -"}${fmt(Math.abs(head - reference))}</span>}
      <span className={`pointer-events-none absolute right-0 h-2.5 w-2.5 -translate-y-1/2 translate-x-1/2 rounded-full ${upL ? "bg-primary" : "bg-destructive"}`} style={{ top: `${(end[1] / H) * 100}%`, right: "4px" }}>
        <span className={`absolute inset-0 animate-ping rounded-full ${upL ? "bg-primary" : "bg-destructive"} opacity-60`} />
      </span>
      {reference && refY !== null && <div className="pointer-events-none absolute left-1 -translate-y-1/2 rounded bg-strike px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-background" style={{ top: `${((refY + (refY > H - 16 ? -15 : refY < 16 ? 15 : 0)) / H) * 100}%` }}>🎯 {referenceLabel}</div>}
      {hv !== undefined && <>
        <div className="pointer-events-none absolute inset-y-0 w-px bg-foreground/40" style={{ left: `${hx}%` }} />
        <div className="pointer-events-none absolute -top-2 rounded-md bg-foreground px-2 py-0.5 text-xs font-semibold tabular-nums text-background" style={{ left: `clamp(0px, calc(${hx}% - 40px), calc(100% - 90px))` }}>${fmt(hv)}</div>
      </>}
    </div>
  );
}

const CH = 200, PW = 316, ZMIN = 12, ZMAX = 120;
const hhmm = (t: number) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

function CandleView({ controls, candles: all0, reference, referenceLabel, hover, setHover }: { controls: React.ReactNode; candles: Candle[]; reference?: number | undefined; referenceLabel?: string | undefined; style: Style; hover: number | null; setHover: (n: number | null) => void }) {
  const t = useT();
  const [hy, setHy] = useState<number | null>(null);
  const [CCOUNT, setCount] = useState(48);
  const pinch = useRef<{ ptrs: Map<number, number>; d0: number; c0: number }>({ ptrs: new Map(), d0: 0, c0: 48 });
  const boxRef = useRef<HTMLDivElement>(null);
  const zoomBy = (f: number) => setCount((c) => Math.round(Math.min(ZMAX, Math.max(ZMIN, c * f))));
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      zoomBy(Math.exp(dy * 0.002));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });
  const candles = all0.slice(-CCOUNT);
  if (candles.length < 2) return <>{controls}<div className="flex h-52 items-center justify-center text-xs text-muted-foreground">{t("Cargando gráfica…")}</div></>;

  const vals = candles.flatMap((c) => [c.l, c.h]);
  if (reference) vals.push(reference);
  const lo = Math.min(...vals), hi = Math.max(...vals), padv = (hi - lo) * 0.08 || hi * 0.0005 || 1;
  const min = lo - padv, max = hi + padv, span = max - min;
  const y = (v: number) => (1 - (v - min) / span) * CH;
  const n = candles.length, step = PW / CCOUNT, x0 = PW - n * step;
  const cx = (i: number) => x0 + i * step + step / 2;
  const bodyW = Math.max(2, step * 0.62);
  const last = candles[n - 1]!;
  const refY = reference ? y(reference) : null;
  const ema: number[] = []; const kE = 2 / (9 + 1);
  candles.forEach((c, i) => ema.push(i ? c.c * kE + ema[i - 1]! * (1 - kE) : c.c));
  const emaD = ema.map((v, i) => `${i ? "L" : "M"}${cx(i)},${y(v)}`).join(" ");
  const hiI = candles.reduce((b, c, i) => (c.h > candles[b]!.h ? i : b), 0), loI = candles.reduce((b, c, i) => (c.l < candles[b]!.l ? i : b), 0);
  const grid = [0.1, 0.3, 0.5, 0.7, 0.9].map((f) => max - f * span);
  const timeIdx = [...new Set(Array.from({ length: 7 }, (_, k) => Math.round(((n - 1) * k) / 6)))];

  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pinch.current;
    p.ptrs.set(e.pointerId, e.clientX);
    if (p.ptrs.size === 2) { const [a, b] = [...p.ptrs.values()]; p.d0 = Math.abs(a! - b!) || 1; p.c0 = CCOUNT; setHover(null); setHy(null); return; }
    pick(e);
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pinch.current;
    if (p.ptrs.has(e.pointerId)) p.ptrs.set(e.pointerId, e.clientX);
    if (p.ptrs.size >= 2) { const [a, b] = [...p.ptrs.values()]; const d = Math.abs(a! - b!) || 1; setCount(Math.round(Math.min(ZMAX, Math.max(ZMIN, p.c0 * (p.d0 / d))))); return; }
    pick(e);
  };
  const up = (e: React.PointerEvent<HTMLDivElement>) => { pinch.current.ptrs.delete(e.pointerId); };
  const pick = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(n - 1, Math.floor((px - x0) / step))));
    setHy(Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)));
  };
  const hc = hover !== null ? candles[hover] : undefined;
  const sel = hc ?? last;
  const chg = ((sel.c - sel.o) / sel.o) * 100;
  const rise = sel.c >= sel.o;
  const pct = (v: number) => `${(y(v) / CH) * 100}%`;
  const tag = "pointer-events-none absolute right-0 -translate-y-1/2 rounded-sm px-1 py-0.5 text-[9px] font-semibold tabular-nums";

  return (
    <>
      {controls}
      <div className="flex flex-wrap gap-x-2.5 px-5 pb-1.5 font-mono text-[10px] tabular-nums text-muted-foreground">
        <span>O <b className="text-foreground">{fmt(sel.o)}</b></span>
        <span>H <b className="text-foreground">{fmt(sel.h)}</b></span>
        <span>L <b className="text-foreground">{fmt(sel.l)}</b></span>
        <span>C <b className={rise ? "text-primary" : "text-destructive"}>{fmt(sel.c)}</b></span>
        <span className={rise ? "text-primary" : "text-destructive"}>{chg >= 0 ? "+" : ""}{chg.toFixed(2)}%</span>
        <span className="ml-auto">{hhmm(sel.t)}</span>
      </div>
      <div className="flex items-center justify-between px-4 pb-1.5"><span className="text-[10px] text-muted-foreground">{CCOUNT} {t("velas")}</span>
        <div className="flex overflow-hidden rounded-full bg-foreground text-lg font-bold leading-none text-background shadow" onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" aria-label={t("Alejar")} onClick={() => zoomBy(1.5)} disabled={CCOUNT >= ZMAX} className="flex h-9 w-11 items-center justify-center active:bg-background/20 disabled:opacity-40">−</button>
          <button type="button" aria-label={t("Acercar")} onClick={() => zoomBy(1 / 1.5)} disabled={CCOUNT <= ZMIN} className="flex h-9 w-11 items-center justify-center border-l border-background/30 active:bg-background/20 disabled:opacity-40">+</button>
          <button type="button" aria-label={t("Restablecer gráfica")} onClick={() => setCount(48)} disabled={CCOUNT === 48} className="flex h-9 w-11 items-center justify-center border-l border-background/30 text-base active:bg-background/20 disabled:opacity-40">↺</button>
        </div>
      </div>
      <div ref={boxRef} className="relative touch-none select-none" onPointerMove={move} onPointerDown={down} onPointerUp={up} onPointerCancel={up} onPointerLeave={(e) => { up(e); setHover(null); setHy(null); }}>
        <svg viewBox={`0 0 ${W} ${CH}`} preserveAspectRatio="none" className="h-52 w-full" aria-hidden>
          {grid.map((g) => <line key={g} x1="0" x2={PW} y1={y(g)} y2={y(g)} className="text-border" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
          {timeIdx.map((i) => <line key={`v${i}`} x1={cx(i)} x2={cx(i)} y1="0" y2={CH} className="text-border" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" vectorEffect="non-scaling-stroke" />)}
          {refY !== null && <>
            <rect x="0" y="0" width={PW} height={refY} className="fill-primary" opacity="0.05" />
            <rect x="0" y={refY} width={PW} height={CH - refY} className="fill-destructive" opacity="0.05" />
          </>}
          {candles.map((c, i) => {
            const up = c.c >= c.o;
            const top = y(Math.max(c.o, c.c)), bot = y(Math.min(c.o, c.c));
            return <g key={c.t} className={up ? "text-primary" : "text-destructive"} opacity={hover === null || hover === i ? 1 : 0.55}>
              <line x1={cx(i)} x2={cx(i)} y1={y(c.h)} y2={y(c.l)} stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <rect x={cx(i) - bodyW / 2} width={bodyW} y={top} height={Math.max(1, bot - top)} rx="0.5" fill="currentColor" />
            </g>;
          })}
          <line x1="0" x2={PW} y1={y(last.c)} y2={y(last.c)} className={last.c >= last.o ? "text-primary" : "text-destructive"} stroke="currentColor" strokeDasharray="2 2" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <path d={emaD} fill="none" className="text-chart-2" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.9" vectorEffect="non-scaling-stroke" />
          {refY !== null && <>
            <line x1="0" x2={PW} y1={refY} y2={refY} className="text-strike" stroke="currentColor" strokeWidth="7" strokeOpacity="0.18" vectorEffect="non-scaling-stroke" />
            <line x1="0" x2={PW} y1={refY} y2={refY} className="text-strike" stroke="currentColor" strokeDasharray="9 4" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </>}
        </svg>
        {grid.map((g) => <span key={g} className="pointer-events-none absolute right-1 -translate-y-1/2 text-[9px] tabular-nums text-muted-foreground" style={{ top: pct(g) }}>{fmt(g)}</span>)}
        {reference && refY !== null && <>
          <div className="pointer-events-none absolute left-1 -translate-y-1/2 rounded bg-strike px-1.5 py-0.5 text-[10px] font-bold text-background" style={{ top: pct(reference) }}>🎯 {referenceLabel}</div>
          <span className={`${tag} bg-strike text-background`} style={{ top: pct(reference) }}>{fmt(reference)}</span>
        </>}
        <span className={`${tag} ${last.c >= last.o ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}`} style={{ top: pct(last.c) }}>{fmt(last.c)}</span>
        <span className="pointer-events-none absolute -translate-x-1/2 -translate-y-full font-mono text-[9px] tabular-nums text-muted-foreground" style={{ left: `${(cx(hiI) / W) * 100}%`, top: pct(candles[hiI]!.h) }}>H {fmt(candles[hiI]!.h)}</span>
        <span className="pointer-events-none absolute -translate-x-1/2 font-mono text-[9px] tabular-nums text-muted-foreground" style={{ left: `${(cx(loI) / W) * 100}%`, top: pct(candles[loI]!.l) }}>L {fmt(candles[loI]!.l)}</span>
        <span className="pointer-events-none absolute left-1 top-1 flex items-center gap-1 text-[9px] font-semibold text-chart-2"><span className="h-0.5 w-3 rounded bg-chart-2" />EMA 9 {fmt(hc ? ema[hover!]! : ema[n - 1]!)}</span>
        {hc && hy !== null && <>
          <div className="pointer-events-none absolute inset-y-0 border-l border-dashed border-foreground/50" style={{ left: `${(cx(hover!) / W) * 100}%` }} />
          <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-foreground/50" style={{ top: `${hy * 100}%` }} />
          <span className={`${tag} bg-foreground text-background`} style={{ top: `${hy * 100}%` }}>{fmt(max - hy * span)}</span>
        </>}
      </div>
      <div className="relative h-4 text-[9px] tabular-nums text-muted-foreground">
        {timeIdx.map((i, k) => <span key={i} className={`absolute ${k === 0 ? "" : k === timeIdx.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`} style={{ left: `${(cx(i) / W) * 100}%` }}>{hhmm(candles[i]!.t)}</span>)}
        {hc && <span className="absolute -translate-x-1/2 rounded-sm bg-foreground px-1 text-background" style={{ left: `${(cx(hover!) / W) * 100}%` }}>{hhmm(hc.t)}</span>}
      </div>
    </>
  );
}

/** Sube vs Baja duel driven only by the live market odds (same numbers as the buttons): green sits at the Sube share,
 * red mirrors it, so the line on top is always the side with the higher percentage. */
function OddsDuel({ series, odds, reference, referenceLabel }: { series: OddsPoint[]; odds: { up: number | null; down: number | null }; reference?: number | undefined; referenceLabel?: string | undefined }) {
  const t = useT();
  const [, setFrame] = useState(0);
  const anim = useRef({ at: 0, from: 0.5, to: 0.5, len: 0 });
  const last = series[series.length - 1];
  if (last && series.length !== anim.current.len) {
    const now = typeof performance !== "undefined" ? performance.now() : 0;
    const a = anim.current;
    const shown = a.len ? a.from + (a.to - a.from) * ease(Math.min(1, (now - a.at) / 1000)) : last.up;
    anim.current = { at: now, from: shown, to: last.up, len: series.length };
  }
  useEffect(() => {
    let id = 0;
    const loop = () => { setFrame((f) => (f + 1) % 1e6); id = requestAnimationFrame(loop); };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);

  const upPct = odds.up ? Math.round(odds.up * 100) : null, downPct = odds.down ? Math.round(odds.down * 100) : null;
  if (!last || upPct === null || downPct === null) return <div className="flex h-44 items-center justify-center text-xs text-muted-foreground">{t("Cargando precio en vivo…")}</div>;

  const a = anim.current;
  const head = a.from + (a.to - a.from) * ease(Math.min(1, (performance.now() - a.at) / 1000));
  const nowMs = Date.now();
  const t0 = series[0]!.t, span = Math.max(30_000, nowMs - t0);
  const toX = (ms: number) => ((ms - (nowMs - span)) / span) * W;
  const y = (share: number) => PAD + (1 - Math.max(0.02, Math.min(0.98, share))) * (H - PAD * 2);
  const raw: [number, number][] = series.map((p) => [toX(p.t), p.up]);
  if (raw.length === 1) raw.unshift([0, raw[0]![1]]);
  raw[raw.length - 1] = [raw[raw.length - 1]![0], head];
  raw.push([W, head]);
  const up = raw.map(([x, v]) => [x, y(v)] as [number, number]);
  const down = raw.map(([x, v]) => [x, y(1 - v)] as [number, number]);
  const dUp = smoothPath(up), dDown = smoothPath(down);
  const eu = up[up.length - 1]!, ed = down[down.length - 1]!;
  const upWins = upPct >= downPct;
  const mid = H / 2;

  return (
    <div className="relative overflow-hidden px-1">
      <div className="flex items-center justify-between px-3 pb-1 text-xs font-bold">
        <span className={`tabular-nums transition-colors ${upWins ? "text-primary" : "text-muted-foreground"}`}>▲ {t("Sube")} {upPct}%</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${upWins ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>{upWins ? t("Va ganando Sube") : t("Va ganando Baja")}</span>
        <span className={`tabular-nums transition-colors ${!upWins ? "text-destructive" : "text-muted-foreground"}`}>{t("Baja")} {downPct}% ▼</span>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-40 w-full" aria-label={upWins ? t("Va ganando Sube") : t("Va ganando Baja")}>
          <defs>
            <linearGradient id="odds-up" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.3" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient>
            <linearGradient id="odds-down" x1="0" x2="0" y1="1" y2="0"><stop offset="0%" stopColor="currentColor" stopOpacity="0.3" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient>
          </defs>
          <rect x="0" y="0" width={W} height={mid} className="fill-primary" opacity="0.04" />
          <rect x="0" y={mid} width={W} height={mid} className="fill-destructive" opacity="0.04" />
          <path d={`${dUp} L${eu[0]},${mid} L${up[0]![0]},${mid} Z`} className="text-primary" fill="url(#odds-up)" />
          <path d={`${dDown} L${ed[0]},${mid} L${down[0]![0]},${mid} Z`} className="text-destructive" fill="url(#odds-down)" />
          <path d={dDown} fill="none" className="text-destructive" stroke="currentColor" strokeWidth={upWins ? 2 : 3} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d={dUp} fill="none" className="text-primary" stroke="currentColor" strokeWidth={upWins ? 3 : 2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <line x1="0" x2={W} y1={mid} y2={mid} className="text-strike" stroke="currentColor" strokeWidth="8" strokeOpacity="0.2" vectorEffect="non-scaling-stroke" />
          <line x1="0" x2={W} y1={mid} y2={mid} className="text-strike" stroke="currentColor" strokeDasharray="9 4" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {([[eu, "bg-primary", upWins], [ed, "bg-destructive", !upWins]] as const).map(([e, bg, lead], i) => (
          <span key={i} className={`pointer-events-none absolute h-2.5 w-2.5 -translate-y-1/2 translate-x-1/2 rounded-full ${bg}`} style={{ top: `${(e[1] / H) * 100}%`, right: "4px" }}>
            {lead && <span className={`absolute inset-0 animate-ping rounded-full ${bg} opacity-60`} />}
          </span>
        ))}
        {reference && <div className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 rounded bg-strike px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-background">🎯 {referenceLabel} · {fmt(reference)}</div>}
      </div>
      <p className="px-3 pt-1 text-center text-[10px] text-muted-foreground">{t("La línea que va arriba es la que va ganando según los porcentajes del mercado: verde para Sube, roja para Baja.")}</p>
    </div>
  );
}
