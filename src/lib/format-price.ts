/** Coin price in dollars, never in scientific notation: $61,150 · $1.23 · $0.0001234 */
export function formatCoinPrice(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  const opts: Intl.NumberFormatOptions =
    a >= 1000 ? { maximumFractionDigits: 0 }
    : a >= 1 ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    : { maximumSignificantDigits: 4 };
  return `$${v.toLocaleString("en-US", opts)}`;
}
