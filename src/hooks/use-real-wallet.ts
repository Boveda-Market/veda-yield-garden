import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getRealWallet } from "@/lib/solana.functions";
import { readCache, writeCache } from "@/lib/cached-query";
import type { RealWalletResult } from "@/lib/solana-data";

/** Keeps the last complete read when a newer one failed or came back with incomplete positions. */
export function pickWalletRead(next: RealWalletResult, prev: RealWalletResult | undefined): RealWalletResult {
  const complete = (r: RealWalletResult | undefined) => Boolean(r?.success && r.data.positionsComplete);
  return complete(next) || !complete(prev) ? next : prev!;
}

/**
 * The one shared on-chain wallet read (balances + vault positions). Every screen using the
 * ["real-solana", wallet] cache must go through here so a transient failure never replaces
 * good positions with an empty list (totals would jump, e.g. $4 → $0.04).
 */
export function useRealWallet(wallet: string | null | undefined) {
  const read = useServerFn(getRealWallet);
  const queryClient = useQueryClient();
  const key = ["real-solana", wallet] as const;
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const next = await read({ data: { wallet: wallet as string } });
      const picked = pickWalletRead(next, queryClient.getQueryData<RealWalletResult>(key) ?? readCache<RealWalletResult>(`vaults:${wallet}`) ?? undefined);
      if (picked.success && picked.data.positionsComplete) writeCache(`vaults:${wallet}`, picked);
      return picked;
    },
    placeholderData: (prev) => prev ?? readCache<RealWalletResult>(`vaults:${wallet}`) ?? undefined,
    enabled: Boolean(wallet),
    staleTime: 30_000,
    retry: 2,
  });
}
