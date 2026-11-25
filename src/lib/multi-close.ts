/** Sum display dollar strings ("1,234.56") in integer cents so totals never drift. */
export function sumUsd(values: (string | undefined)[]): string {
  let cents = 0n;
  for (const v of values) {
    const m = v?.replace(/,/g, "").match(/^(\d+)(?:\.(\d{1,2}))?/);
    if (!m) continue;
    cents += BigInt(m[1] ?? "0") * 100n + BigInt((m[2] ?? "0").padEnd(2, "0"));
  }
  const whole = (cents / 100n).toLocaleString("en-US");
  return `${whole}.${(cents % 100n).toString().padStart(2, "0")}`;
}
