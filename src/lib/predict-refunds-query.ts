import { useQuery } from "@tanstack/react-query";
import { getPredictRefunds } from "@/lib/predict.functions";
import type { PredictRefund } from "@/lib/predict-refunds";

/** One shared query for a wallet's recently refunded Sube/Baja orders (bell, Mi Billetera). */
export function usePredictRefunds(wallet: string | null | undefined) {
  return useQuery({
    queryKey: ["predict-refunds", wallet],
    enabled: Boolean(wallet),
    queryFn: async (): Promise<PredictRefund[]> => {
      const r = await getPredictRefunds({ data: { wallet: wallet! } });
      if (!r.success) throw new Error("refunds unavailable");
      return r.refunds;
    },
    staleTime: 15_000, retry: 1, refetchOnWindowFocus: true, refetchInterval: 30_000,
  });
}
