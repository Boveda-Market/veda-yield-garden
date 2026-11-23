import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { prepareGasRefill } from "@/lib/gas-refill.functions";
import { ACTIVATION_FEE_MICRO, EXTRA_VAULT_FEE_MICRO } from "@/lib/gas-refill";

/** Live network quote of the one-time activation (reserve at current price + fee), shared by vault deposits and Doble o Nada; null when the account is already active. */
/** `play`: Doble o Nada entries only quote activation when the reserve is too low to play. */
export function useActivationQuote(wallet: string | null | undefined, enabled = true, play = false) {
  const quoteFn = useServerFn(prepareGasRefill);
  return useQuery({ queryKey: ["activation-quote", wallet, play ? "play" : "vault"], enabled: !!wallet && enabled, staleTime: 15_000, refetchInterval: 20_000, queryFn: async () => {
    const r = await quoteFn({ data: { wallet: wallet!, activation: true, quoteOnly: true, ...(play ? { play: true } : {}) } });
    return r.success ? { charge: BigInt(r.chargeMicro), fee: r.extraVault ? EXTRA_VAULT_FEE_MICRO : ACTIVATION_FEE_MICRO } : null;
  } });
}
