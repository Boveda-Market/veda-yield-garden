import { useRealWallet } from "./use-real-wallet";
import { usePositionRows } from "./use-position-rows";
import { accountTier } from "@/lib/account-tier";

/** Shares the portfolio's wallet query; null until balances and position values are known. */
export function useAccountTier(wallet: string | null | undefined) {
  const q = useRealWallet(wallet);
  const data = q.data?.success ? q.data.data : null;
  const { capital } = usePositionRows(data?.positions ?? []);
  if (!data || capital === null) return null;
  const total = capital + Number(data.usdc || 0);
  return { total, ...accountTier(total) };
}
