import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getRealWallet } from "@/lib/solana.functions";
import { usePositionRows } from "./use-position-rows";
import { accountTier } from "@/lib/account-tier";

/** Shares the portfolio's wallet query; null until balances and position values are known. */
export function useAccountTier(wallet: string | null | undefined) {
  const read = useServerFn(getRealWallet);
  const q = useQuery({ queryKey: ["real-solana", wallet], queryFn: () => read({ data: { wallet: wallet as string } }), enabled: Boolean(wallet), staleTime: 30_000, retry: false });
  const data = q.data?.success ? q.data.data : null;
  const { capital } = usePositionRows(data?.positions ?? []);
  if (!data || capital === null) return null;
  const total = capital + Number(data.usdc || 0);
  return { total, ...accountTier(total) };
}
