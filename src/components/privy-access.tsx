import { useT } from "@/lib/i18n";
import "@/lib/buffer-polyfill";
import { useState, type ReactNode } from "react";
import { PrivyProvider, useAddFunds, useLinkAccount, useLogin, useMfaEnrollment, usePrivy } from "@privy-io/react-auth";
import { useUpdateEmail } from "@privy-io/react-auth/ui";
import { toSolanaWalletConnectors, useExportWallet, useFundWallet, useSignMessage, useSignTransaction, useWallets } from "@privy-io/react-auth/solana";
import bs58 from "bs58";
import { createSolanaRpc, createSolanaRpcSubscriptions, type Base64EncodedWireTransaction } from "@solana/kit";
import { useQueryClient } from "@tanstack/react-query";

// Privy-hosted mainnet RPC accepts browser requests (the public endpoint returns 403); the private Helius key stays server-only.
const solanaRpcs = { "solana:mainnet": { rpc: createSolanaRpc("https://solana-mainnet.rpc.privy.systems?privyAppId=cmw6ftcf900ge0hl0jyw3rc75"), rpcSubscriptions: createSolanaRpcSubscriptions("wss://solana-mainnet.rpc.privy.systems?privyAppId=cmw6ftcf900ge0hl0jyw3rc75"), blockExplorerUrl: "https://solscan.io" } };
import { BovedaSessionContext } from "@/hooks/use-boveda-session";

const solanaConnectors = toSolanaWalletConnectors({ shouldAutoConnect: true });

function SessionBridge({ children }: { children: ReactNode }) {
  const t = useT();
  const { ready, authenticated, user, logout, getAccessToken, mfaMethods } = usePrivy();
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const { linkEmail, linkPasskey } = useLinkAccount({
    onSuccess: () => setSecurityMessage(t("Método vinculado y verificado.")),
    onError: () => setSecurityMessage(t("No se pudo vincular el método. Revisa la compatibilidad de tu dispositivo y que esté habilitado en Privy.")),
  });
  const { update } = useUpdateEmail();
  const { showMfaEnrollmentModal } = useMfaEnrollment();
  const queryClient = useQueryClient();
  const { wallets } = useWallets();
  const { signTransaction } = useSignTransaction();
  const { signMessage: signWalletMessage } = useSignMessage();
  const { addFunds } = useAddFunds();
  const { exportWallet } = useExportWallet();
  const { fundWallet } = useFundWallet();
  const [error, setError] = useState<string | null>(null);
  const { login } = useLogin({
    onComplete: () => setError(null),
    onError: () => setError(t("No se pudo iniciar sesión. Revisa los métodos y dominios permitidos en Privy e inténtalo de nuevo.")),
  });
  const walletAddress = wallets[0]?.address ?? null;
  return <BovedaSessionContext.Provider value={{
    ready, authenticated, userId: authenticated ? user?.id ?? null : null,
    label: user?.email?.address ?? user?.google?.email ?? (walletAddress ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}` : t("Mi cuenta")),
    walletAddress, error, getAccessToken,
    exportWallet: user?.linkedAccounts.some(account => account.type === "wallet" && account.address === walletAddress && (account.walletClientType === "privy" || account.walletClientType === "privy-v2")) ? async () => { await exportWallet({ address: walletAddress! }); } : undefined,
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
      if (!authenticated || !wallet) throw new Error(t("Conecta una wallet de Solana"));
      // Sign first, then broadcast from the browser, so each stage fails with its own clear message.
      let signed: Uint8Array;
      try {
        ({ signedTransaction: signed } = await signTransaction({ transaction, wallet, chain: "solana:mainnet", options: { uiOptions: { showWalletUIs: false } } }));
      } catch (e) {
        console.error("[BÓVEDA] wallet signing failed", e);
        if (e instanceof Error && /reject|cancel|exited/i.test(e.message)) throw new Error(t("Cancelaste la firma."));
        throw new Error(`${t("La wallet no pudo firmar")}: ${e instanceof Error ? e.message : String(e)}`);
      }
      try {
        const base64 = btoa(Array.from(signed, (b) => String.fromCharCode(b)).join("")) as Base64EncodedWireTransaction;
        const sig = await solanaRpcs["solana:mainnet"].rpc.sendTransaction(base64, { encoding: "base64", preflightCommitment: "confirmed" }).send();
        return String(sig);
      } catch (e) {
        console.error("[BÓVEDA] broadcast failed", e);
        throw new Error(`${t("La red rechazó la operación")}: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
    signMessage: async (message) => {
      const wallet = wallets[0];
      if (!authenticated || !wallet) throw new Error(t("Conecta una wallet de Solana"));
      const { signature } = await signWalletMessage({ message: new TextEncoder().encode(message), wallet });
      return bs58.encode(signature);
    },
    buyUsdc: async () => {
      if (!authenticated || !walletAddress) throw new Error(t("Primero entra a tu cuenta"));
      // Solana mainnet CAIP-2 id and the official USDC mint.
      await addFunds({ destination: { address: walletAddress, chain: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", asset: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" }, fiat: { defaultAmount: "50", source: { defaultAsset: "usd" } } });
    },
    buySol: async () => {
      if (!authenticated || !walletAddress) throw new Error(t("Primero entra a tu cuenta"));
      // Native SOL (not wrapped) so it can pay network costs right away.
      await fundWallet({ address: walletAddress, options: { chain: "solana:mainnet", asset: "native-currency", amount: "0.1", defaultFundingMethod: "card" } });
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