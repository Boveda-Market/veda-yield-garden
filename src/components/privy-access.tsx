import { GAS_TOP_UP_SOL } from "@/lib/onboarding";
import { useT } from "@/lib/i18n";
import "@/lib/buffer-polyfill";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { setPrivyTokenGetter } from "@/lib/privy-token";
import { PrivyProvider, useAddFunds, useLinkAccount, useLogin, useMfaEnrollment, usePrivy } from "@privy-io/react-auth";
import { useUpdateEmail } from "@privy-io/react-auth/ui";
import { toSolanaWalletConnectors, useExportWallet, useFundWallet, useSignMessage, useSignTransaction, useWallets } from "@privy-io/react-auth/solana";
import bs58 from "bs58";
import { createSolanaRpc, createSolanaRpcSubscriptions, type Base64EncodedWireTransaction } from "@solana/kit";
import { useQueryClient } from "@tanstack/react-query";

// Privy-hosted mainnet RPC accepts browser requests (the public endpoint returns 403); the private Helius key stays server-only.
const solanaRpcs = { "solana:mainnet": { rpc: createSolanaRpc("https://solana-mainnet.rpc.privy.systems?privyAppId=cmw6ftcf900ge0hl0jyw3rc75"), rpcSubscriptions: createSolanaRpcSubscriptions("wss://solana-mainnet.rpc.privy.systems?privyAppId=cmw6ftcf900ge0hl0jyw3rc75"), blockExplorerUrl: "https://orbmarkets.io" } };
import { BovedaSessionContext } from "@/hooks/use-boveda-session";
import { IdleLogout } from "@/components/idle-logout";

// Privy only authorizes the official domains; preview/other hosts can never finish loading it.
const OFFICIAL_ORIGIN = "https://bovedamarket.app";
const isOfficialHost = () => typeof window === "undefined" || ["bovedamarket.app", "www.bovedamarket.app", "veda-yield-garden.lovable.app"].includes(window.location.hostname.toLowerCase());

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
  // If Privy never reports ready (blocked iframe, shields, slow network), stop waiting after 4s so buttons and screens never freeze.
  const [stalled, setStalled] = useState(false);
  useEffect(() => { if (ready) { setStalled(false); return; } const id = setTimeout(() => setStalled(true), 4000); return () => clearTimeout(id); }, [ready]);
  // A click before Privy is ready is queued and opens the login as soon as it is (up to 15s) instead of failing instantly.
  const [pendingMethod, setPendingMethod] = useState<"email" | "google" | "wallet" | "passkey" | null>(null);
  useEffect(() => {
    if (!pendingMethod) return;
    if (ready) { const m = pendingMethod; setPendingMethod(null); setError(null); login({ loginMethods: [m] }); return; }
    const id = setTimeout(() => { setPendingMethod(null); setError(t("El acceso seguro no respondió. Revisa tu conexión y recarga la página.")); }, 15000);
    return () => clearTimeout(id);
  }, [pendingMethod, ready, login, t]);
  useEffect(() => {
    setPrivyTokenGetter(authenticated ? getAccessToken : null);
    return () => setPrivyTokenGetter(null);
  }, [authenticated, getAccessToken]);
  const doLogout = useCallback(async () => { try { await queryClient.cancelQueries(); queryClient.clear(); await logout(); setError(null); } catch { setError("No se pudo cerrar sesión. Inténtalo de nuevo."); } }, [queryClient, logout]);
  return <BovedaSessionContext.Provider value={{
    ready: ready || stalled, authenticated, userId: authenticated ? user?.id ?? null : null,
    label: user?.email?.address ?? user?.google?.email ?? (walletAddress ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}` : t("Mi cuenta")),
    walletAddress, error: error ?? (pendingMethod && !ready ? t("Conectando el acceso seguro…") : stalled && !ready && !isOfficialHost() ? t("Para entrar, abre bovedamarket.app. En esta vista previa el acceso seguro no está disponible.") : null), getAccessToken,
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
    login: (method) => {
      if (!ready) {
        if (!isOfficialHost()) { setError(t("Abrimos bovedamarket.app en una pestaña nueva para que puedas entrar.")); window.open(OFFICIAL_ORIGIN + window.location.pathname, "_blank", "noopener"); return; }
        setError(null); setPendingMethod(method); return;
      }
      setError(null); login({ loginMethods: [method] });
    },
    signAndSend: async (transaction) => {
      const wallet = wallets[0];
      if (!authenticated || !wallet) throw new Error(t("Conecta una wallet de Solana"));
      // Sign first, then broadcast from the browser, so each stage fails with its own clear message.
      let signed: Uint8Array;
      try {
        ({ signedTransaction: signed } = await signTransaction({ transaction, wallet, chain: "solana:mainnet" }));
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
    signOnly: async (transaction) => {
      const wallet = wallets[0];
      if (!authenticated || !wallet) throw new Error(t("Conecta una wallet de Solana"));
      try { return (await signTransaction({ transaction, wallet, chain: "solana:mainnet" })).signedTransaction; }
      catch (e) {
        if (e instanceof Error && /reject|cancel|exited/i.test(e.message)) throw new Error(t("Cancelaste la firma."));
        throw new Error(`${t("La wallet no pudo firmar")}: ${e instanceof Error ? e.message : String(e)}`);
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
      // Dedicated MoonPay route: unified addFunds also quotes Stripe, which rejects native SOL.
      await fundWallet({ address: walletAddress, options: { chain: "solana:mainnet", asset: "native-currency", amount: GAS_TOP_UP_SOL, defaultFundingMethod: "card", card: { preferredProvider: "moonpay" } } });
    },
    logout: doLogout,
  }}>{children}<IdleLogout active={ready && authenticated} signedOut={ready && !authenticated} onLogout={doLogout} /></BovedaSessionContext.Provider>;
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