import { Connection } from "@solana/web3.js";

/** Every RPC failure is replaced before it can include the private query URL. Short rate-limit bursts get a bounded backoff. */
export function heliusConnection(apiKey: string) {
  return new Connection(`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(apiKey)}`, {
    commitment: "confirmed",
    disableRetryOnRateLimit: true,
    fetch: async (input, init) => {
      try {
        for (let attempt = 0; ; attempt++) {
          const response = await fetch(input, { ...init, signal: AbortSignal.timeout(20_000) });
          if (response.status === 429 && attempt < 3) { await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1))); continue; }
          if (!response.ok) throw new Error("RPC indisponible");
          return response;
        }
      } catch { throw new Error("La consulta de Solana no está disponible"); }
    },
  });
}
