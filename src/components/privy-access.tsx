import "@/lib/buffer-polyfill";
import { useState, type ReactNode } from "react";
import { PrivyProvider, useLogin, usePrivy } from "@privy-io/react-auth";
import { toSolanaWalletConnectors, useSignAndSendTransaction, useWallets } from "@privy-io/react-auth/solana";
import bs58 from "bs58";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";

// Public mainnet endpoint for wallet broadcast; the private Helius key stays server-only.
const solanaRpcs = { "solana:mainnet": { rpc: createSolanaRpc("https://api.mainnet-beta.solana.com"), rpcSubscriptions: createSolanaRpcSubscriptions("wss://api.mainnet-beta.solana.com"), blockExplorerUrl: "https://solscan.io" } };
import { BovedaSessionContext } from "@/hooks/use-boveda-session";

const solanaConnectors = toSolanaWalletConnectors({ shouldAutoConnect: true });

function SessionBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, logout } = usePrivy();
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const [error, setError] = useState<string | null>(null);
  const { login } = useLogin({
    onComplete: () => setError(null),
    onError: () => setError("No se pudo iniciar sesión. Revisa los métodos y dominios permitidos en Privy e inténtalo de nuevo."),
  });
  const walletAddress = wallets[0]?.address ?? null;
  return <BovedaSessionContext.Provider value={{
    ready, authenticated, userId: authenticated ? user?.id ?? null : null,
    label: user?.email?.address ?? user?.google?.email ?? (walletAddress ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}` : "Mi cuenta"),
    walletAddress, error,
    login: (method) => { setError(null); login({ loginMethods: [method] }); },
    signAndSend: async (transaction) => {
      const wallet = wallets[0];
      if (!authenticated || !wallet) throw new Error("Conecta una wallet de Solana");
      const { signature } = await signAndSendTransaction({ transaction, wallet, chain: "solana:mainnet" });
      return bs58.encode(signature);
    },
    logout: async () => { try { await logout(); setError(null); } catch { setError("No se pudo cerrar sesión. Inténtalo de nuevo."); } },
  }}>{children}</BovedaSessionContext.Provider>;
}

export default function PrivyAccess({ children }: { children: ReactNode }) {
  return <PrivyProvider appId="cmw6ftcf900ge0hl0jyw3rc75" config={{
    loginMethods: ["email", "google", "wallet"],
    appearance: { theme: "dark", walletChainType: "solana-only", walletList: ["phantom", "jupiter"], logo: "/icon-512.png" },
    externalWallets: { solana: { connectors: solanaConnectors } },
    embeddedWallets: { solana: { createOnLogin: "users-without-wallets" } },
    solana: { rpcs: solanaRpcs },
  }}><SessionBridge>{children}</SessionBridge></PrivyProvider>;
}