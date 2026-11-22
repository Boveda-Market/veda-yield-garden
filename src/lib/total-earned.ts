/** «Total ganado» = harvested + still-to-harvest fees; percent is over «Total depositado» (own money only, fees excluded). Missing harvested value stays unavailable; no percent without a positive deposited base. */
export function totalEarned(harvested: number | null, pending: number, deposited: number) {
  if (harvested === null) return null;
  const total = harvested + Math.max(pending, 0);
  return { total, percent: deposited > 0 ? (total / deposited) * 100 : null };
}
