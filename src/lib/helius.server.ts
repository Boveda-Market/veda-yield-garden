import { Connection } from "@solana/web3.js";

/** Every RPC failure is replaced before it can include the private query URL. */
export function heliusConnection(apiKey: string) {
  return new Connection(`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(apiKey)}`, {
    commitment: "confirmed",
    disableRetryOnRateLimit: true,
    fetch: async (input, init) => {
      try {
        const response = await fetch(input, { ...init, signal: AbortSignal.timeout(20_000) });
        if (!response.ok) throw new Error("RPC indisponible");
        return response;
      } catch { throw new Error("La consulta de Solana no está disponible"); }
    },
  });
}
