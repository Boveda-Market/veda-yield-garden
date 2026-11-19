/** Subtle harvested-margin pill: harvested earnings ÷ capital working in vaults. Hidden when unknown or zero. */
export function MarginPill({ harvested, capital, className = "" }: { harvested: number | null; capital: number | null; className?: string }) {
  if (harvested === null || !capital || capital <= 0 || harvested <= 0) return null;
  const pct = (harvested / capital) * 100;
  if (pct < 0.05) return null;
  return <span className={`inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold tabular-nums text-primary ${className}`}>+{pct.toFixed(1)}%</span>;
}
