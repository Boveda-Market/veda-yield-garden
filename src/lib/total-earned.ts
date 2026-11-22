/** «Total ganado» = harvested + still-to-harvest fees; percent is over today's capital in vaults. Missing harvested value stays unavailable. */
export function totalEarned(harvested: number | null, pending: number, capital: number) {
  if (harvested === null) return null;
  const total = harvested + Math.max(pending, 0);
  return { total, percent: capital > 0 ? (total / capital) * 100 : null };
}
