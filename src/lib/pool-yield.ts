import { z } from "zod";

const schema = z.object({
  address: z.string(),
  tvl: z.number().finite().nonnegative().nullish(),
  fees: z.object({ "24h": z.number().finite().nonnegative().nullish() }).nullish(),
});

/** Observed daily fee percentage: reported 24h fees / current TVL, no compounding. */
export function parsePoolYield(data: unknown, address: string) {
  const parsed = schema.safeParse(data);
  if (!parsed.success || parsed.data.address !== address) return null;
  const { tvl, fees } = parsed.data;
  const fees24h = fees?.["24h"] ?? null;
  const dailyPercent = tvl != null && tvl > 0 && fees24h != null ? fees24h / tvl * 100 : null;
  return { dailyPercent: dailyPercent != null && Number.isFinite(dailyPercent) ? dailyPercent : null, fees24h, tvl: tvl ?? null };
}

export async function fetchPoolYield(address: string, signal?: AbortSignal) {
  const response = await fetch(`https://damm-v2.datapi.meteora.ag/pools/${encodeURIComponent(address)}`, { signal: signal ?? null });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("No se pudo consultar el rendimiento de Meteora.");
  return parsePoolYield(await response.json(), address);
}

export const poolYieldOptions = (address: string) => ({
  queryKey: ["meteora-pool-yield", address],
  queryFn: ({ signal }: { signal: AbortSignal }) => fetchPoolYield(address, signal),
  staleTime: 60_000,
  refetchInterval: 60_000,
  retry: 1,
});