import { useState, type ReactNode } from "react";
import { PrivyProvider, useLogin, usePrivy } from "@privy-io/react-auth";
import { toSolanaWalletConnectors, useWallets } from "@privy-io/react-auth/solana";
import { BovedaSessionContext } from "@/hooks/use-boveda-session";

const solanaConnectors = toSolanaWalletConnectors({ shouldAutoConnect: true });

function SessionBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, logout } = usePrivy();
  const { wallets } = useWallets();
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
    logout: async () => { try { await logout(); setError(null); } catch { setError("No se pudo cerrar sesión. Inténtalo de nuevo."); } },
  }}>{children}</BovedaSessionContext.Provider>;
}

export default function PrivyAccess({ children }: { children: ReactNode }) {
  return <PrivyProvider appId="cmw6ftcf900ge0hl0jyw3rc75" config={{
    loginMethods: ["email", "google", "wallet"],
    appearance: { theme: "dark", walletChainType: "solana-only", logo: "/icon-512.png" },
    externalWallets: { solana: { connectors: solanaConnectors } },
    embeddedWallets: { solana: { createOnLogin: "users-without-wallets" } },
  }}><SessionBridge>{children}</SessionBridge></PrivyProvider>;
}