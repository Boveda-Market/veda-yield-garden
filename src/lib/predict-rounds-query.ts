import { useQuery } from "@tanstack/react-query";
import { getLiveRounds } from "@/lib/predict.functions";
import type { LiveRound } from "@/lib/predict";

/** Shared live rounds (market odds), refreshed every 4 s like the Sube/Baja buttons; open positions read their odds from here. */
export function useLiveRounds(enabled = true) {
  return useQuery({
    queryKey: ["predict-live-rounds"],
    enabled,
    queryFn: async (): Promise<LiveRound[]> => (await getLiveRounds()).rounds,
    staleTime: 3_000, refetchInterval: 4_000, retry: 1,
  });
}
