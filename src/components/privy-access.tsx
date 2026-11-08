import "@/lib/buffer-polyfill";
import { useState, type ReactNode } from "react";
import { PrivyProvider, useAddFunds, useLinkAccount, useLogin, useMfaEnrollment, usePrivy } from "@privy-io/react-auth";
import { useUpdateEmail } from "@privy-io/react-auth/ui";
import { toSolanaWalletConnectors, useSignAndSendTransaction, useWallets } from "@privy-io/react-auth/solana";
import bs58 from "bs58";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { useQueryClient } from "@tanstack/react-query";

// Public mainnet endpoint for wallet broadcast; the private Helius key stays server-only.
const solanaRpcs = { "solana:mainnet": { rpc: createSolanaRpc("https://api.mainnet-beta.solana.com"), rpcSubscriptions: createSolanaRpcSubscriptions("wss://api.mainnet-beta.solana.com"), blockExplorerUrl: "https://solscan.io" } };
import { BovedaSessionContext } from "@/hooks/use-boveda-session";

const solanaConnectors = toSolanaWalletConnectors({ shouldAutoConnect: true });

function SessionBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, logout, getAccessToken, mfaMethods } = usePrivy();
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const { linkEmail, linkPasskey } = useLinkAccount({
    onSuccess: () => setSecurityMessage("Método vinculado y verificado."),
    onError: () => setSecurityMessage("No se pudo vincular el método. Revisa la compatibilidad de tu dispositivo y que esté habilitado en Privy."),
  });
  const { update } = useUpdateEmail();
  const { showMfaEnrollmentModal } = useMfaEnrollment();
  const queryClient = useQueryClient();
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { addFunds } = useAddFunds();
  const [error, setError] = useState<string | null>(null);
  const { login } = useLogin({
    onComplete: () => setError(null),
    onError: () => setError("No se pudo iniciar sesión. Revisa los métodos y dominios permitidos en Privy e inténtalo de nuevo."),
  });
  const walletAddress = wallets[0]?.address ?? null;
  return <BovedaSessionContext.Provider value={{
    ready, authenticated, userId: authenticated ? user?.id ?? null : null,
    label: user?.email?.address ?? user?.google?.email ?? (walletAddress ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}` : "Mi cuenta"),
    walletAddress, error, getAccessToken,
    security: {
      email: user?.email?.address ?? null,
      passkeyCount: user?.linkedAccounts.filter(account => account.type === "passkey").length ?? 0,
      enrolledMfa: user?.mfaMethods ?? [],
      availableMfa: mfaMethods,
      hasEmbeddedWallet: user?.linkedAccounts.some(account => account.type === "wallet" && (account.walletClientType === "privy" || account.walletClientType === "privy-v2")) ?? false,
      message: securityMessage,
      linkEmail: () => { setSecurityMessage(null); linkEmail(); },
      updateEmail: () => { setSecurityMessage(null); update(); },
      linkPasskey: () => { setSecurityMessage(null); linkPasskey({ name: "BÓVEDA" }); },
      manageMfa: async () => { setSecurityMessage(null); await showMfaEnrollmentModal(); },
    },
    login: (method) => { setError(null); login({ loginMethods: [method] }); },
    signAndSend: async (transaction) => {
      const wallet = wallets[0];
      if (!authenticated || !wallet) throw new Error("Conecta una wallet de Solana");
      const { signature } = await signAndSendTransaction({ transaction, wallet, chain: "solana:mainnet" });
      return bs58.encode(signature);
    },
    buyUsdc: async () => {
      if (!authenticated || !walletAddress) throw new Error("Primero entra a tu cuenta");
      // Solana mainnet CAIP-2 id and the official USDC mint.
      await addFunds({ destination: { address: walletAddress, chain: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", asset: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" }, fiat: { defaultAmount: "50", source: { defaultAsset: "usd" } } });
    },
    logout: async () => { try { await queryClient.cancelQueries(); queryClient.clear(); await logout(); setError(null); } catch { setError("No se pudo cerrar sesión. Inténtalo de nuevo."); } },
  }}>{children}</BovedaSessionContext.Provider>;
}

export default function PrivyAccess({ children }: { children: ReactNode }) {
  return <PrivyProvider appId="cmw6ftcf900ge0hl0jyw3rc75" config={{
    loginMethods: ["email", "google", "wallet", "passkey"],
    appearance: { theme: "dark", walletChainType: "solana-only", walletList: ["phantom", "jupiter"], logo: "/icon-512.png" },
    externalWallets: { solana: { connectors: solanaConnectors } },
    embeddedWallets: { solana: { createOnLogin: "users-without-wallets" }, ethereum: { createOnLogin: "off" } },
    solana: { rpcs: solanaRpcs },
  }}><SessionBridge>{children}</SessionBridge></PrivyProvider>;
}