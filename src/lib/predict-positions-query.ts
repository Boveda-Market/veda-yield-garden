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
    staleTime: 10_000, refetchInterval: 20_000, retry: 2,
  });
}
