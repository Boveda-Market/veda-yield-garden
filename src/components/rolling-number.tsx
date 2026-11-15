import { useEffect, useRef, useState } from "react";

const DIGITS = "0123456789";

/** One digit that rolls vertically to its new value (odometer). */
function Digit({ d }: { d: number }) {
  return <span className="relative inline-block h-[1.1em] overflow-hidden align-top leading-[1.1em]" aria-hidden>
    <span className="flex flex-col transition-transform duration-[400ms] ease-out motion-reduce:transition-none" style={{ transform: `translateY(-${d * 1.1}em)` }}>
      {DIGITS.split("").map((c) => <span key={c} className="h-[1.1em]">{c}</span>)}
    </span>
  </span>;
}

/**
 * Live price with rolling digits, smaller cents and a short green/red flash on each tick (direction of the tick only,
 * never who is winning — that comes from the market percentages).
 */
export function RollingNumber({ value, decimals = 2, prefix = "$", className = "", centsClassName = "text-[0.6em]" }: { value: number | undefined; decimals?: number; prefix?: string; className?: string; centsClassName?: string }) {
  const prev = useRef<number | undefined>(undefined);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    const p = prev.current; prev.current = value;
    if (value === undefined || p === undefined || value === p) return;
    setFlash(value > p ? "up" : "down");
    const id = setTimeout(() => setFlash(null), 650);
    return () => clearTimeout(id);
  }, [value]);
  if (value === undefined) return <span className={className}>—</span>;
  const [int, dec] = value.toFixed(decimals).split(".");
  const intChars = int!.replace(/\B(?=(\d{3})+(?!\d))/g, ",").split("");
  const label = `${prefix}${intChars.join("")}${dec ? `.${dec}` : ""}`;
  const color = flash === "up" ? "text-primary" : flash === "down" ? "text-destructive" : "";
  // Keys count from the right so a digit keeps rolling in place even when the integer part changes length.
  return <span className={`inline-flex items-baseline tabular-nums transition-colors duration-300 ${color} ${className}`} aria-label={label} role="text">
    <span aria-hidden>{prefix}</span>
    {intChars.map((c, i) => { const k = intChars.length - i; return /\d/.test(c) ? <Digit key={k} d={Number(c)} /> : <span key={k} aria-hidden>{c}</span>; })}
    {dec && <span className={`inline-flex items-baseline ${centsClassName}`} aria-hidden>.{dec.split("").map((c, i) => <Digit key={`d${i}`} d={Number(c)} />)}</span>}
  </span>;
}
