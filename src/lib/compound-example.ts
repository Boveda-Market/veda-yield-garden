/** Educational monthly model only: never a live vault rate or account valuation. */
export function compoundExample(principal: number, monthlyPercent: number, months: number) {
  if (!Number.isFinite(principal) || principal < 0 || !Number.isFinite(monthlyPercent) || monthlyPercent < 0 || monthlyPercent > 5 || !Number.isInteger(months) || months < 0 || months > 12) {
    throw new RangeError("Invalid educational scenario");
  }
  const rate = monthlyPercent / 100;
  const points = Array.from({ length: months + 1 }, (_, month) => ({
    month,
    simple: principal * (1 + rate * month),
    compound: principal * Math.pow(1 + rate, month),
  }));
  const simple = principal * (1 + rate * months);
  const compound = principal * Math.pow(1 + rate, months);
  return { points, simple, compound, extra: compound - simple };
}