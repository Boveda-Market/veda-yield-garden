import { useEffect, useRef, useState } from "react";

const prefersReduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Odometer roll-up on first show (and on value changes), then optional live accrual (USD per ms) ticking every second. */
export function AnimatedMoney({ value, ratePerMs = 0, decimals = 2, prefix = "$", format, className = "" }: { value: number; ratePerMs?: number; decimals?: number; prefix?: string; format?: ((n: number) => string) | undefined; className?: string }) {
  const [shown, setShown] = useState(0);
  const [flash, setFlash] = useState(false);
  const from = useRef(0);
  const base = useRef({ value, at: Date.now() });
  // Roll from the last shown number to the new value.
  useEffect(() => {
    base.current = { value, at: Date.now() };
    if (prefersReduced()) { setShown(value); from.current = value; return; }
    const start = from.current, t0 = performance.now(), dur = 800;
    let raf = 0;
    const step = (t: number) => { const k = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - k, 3); const v = start + (value - start) * e; setShown(v); from.current = v; if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  // Live accrual: pauses while the tab is hidden.
  useEffect(() => {
    if (!(ratePerMs > 0)) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const v = base.current.value + ratePerMs * (Date.now() - base.current.at);
      from.current = v; setShown(v); setFlash(true); window.setTimeout(() => setFlash(false), 350);
    }, 1000);
    return () => window.clearInterval(id);
  }, [ratePerMs]);
  const live = ratePerMs > 0;
  const d = live ? Math.max(decimals, 4) : decimals;
  const text = format ? format(shown) : shown.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  return <span className={`tabular-nums transition-[filter] duration-300 ${flash ? "drop-shadow-[0_0_6px_var(--primary)]" : ""} ${className}`}>{prefix}{live && !format ? <>{text.slice(0, -2)}<span className="opacity-60">{text.slice(-2)}</span></> : text}</span>;
}
