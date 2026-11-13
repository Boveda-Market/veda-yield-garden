import { useQuery } from "@tanstack/react-query";
import { getPredictPositions } from "@/lib/predict.functions";
import type { PredictPosition } from "@/lib/predict";
import { readCache, writeCache } from "@/lib/cached-query";

/** One shared, cached query for a wallet's prediction positions (Mi Billetera, Portafolio, pending claims). */
export function usePredictPositions(wallet: string | null | undefined) {
  return useQuery({
    queryKey: ["predict-positions", wallet],
    enabled: Boolean(wallet),
    queryFn: async (): Promise<PredictPosition[]> => {
      const r = await getPredictPositions({ data: { wallet: wallet! } });
      if (!r.success) throw new Error("predict positions unavailable");
      writeCache(`predict:${wallet}`, r.positions);
      return r.positions;
    },
    placeholderData: (prev) => prev ?? readCache<PredictPosition[]>(`predict:${wallet}`),
    // Faster refresh while rounds are open, fastest around the close so results/claims appear without reloading.
    staleTime: 2_000, retry: 2, refetchOnWindowFocus: true, refetchOnReconnect: true,
    refetchInterval: (q) => predictRefreshMs(q.state.data),
  });
}

/** Poll cadence: 3 s within 30 s of a close (or while resolving), 6 s with open rounds, else 20 s. */
export function predictRefreshMs(data: PredictPosition[] | undefined, now = Date.now()): number {
  const open = (data ?? []).filter((p) => p.status === "open");
  if (open.length === 0) return 20_000;
  const near = open.some((p) => p.closeTime !== null && p.closeTime * 1000 - now < 30_000);
  return near ? 3_000 : 6_000;
}
