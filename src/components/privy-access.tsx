import { CARD_MIN_USD, GAS_TOP_UP_SOL } from "@/lib/onboarding";
import { useT } from "@/lib/i18n";
import { installBufferPolyfill } from "@/lib/buffer-polyfill";
import { installPrivyApiFallback } from "@/lib/privy-api-fallback";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { setPrivyTokenGetter } from "@/lib/privy-token";
import { sessionWalletAddress } from "@/lib/session-wallet";
import { PrivyProvider, useAddFunds, useLinkAccount, useLogin, useLoginWithOAuth, useLoginWithPasskey, useMfaEnrollment, usePrivy, useSigners } from "@privy-io/react-auth";
import { AUTOPILOT_POLICY_ID, AUTOPILOT_SIGNER_ID } from "@/lib/autopilot";
import { useUpdateEmail } from "@privy-io/react-auth/ui";
import { toSolanaWalletConnectors, useExportWallet, useFundWallet, useSignMessage, useSignTransaction, useWallets } from "@privy-io/react-auth/solana";
import bs58 from "bs58";
import { createSolanaRpc, createSolanaRpcSubscriptions, type Base64EncodedWireTransaction } from "@solana/kit";
import { useQueryClient } from "@tanstack/react-query";

// Privy-hosted mainnet RPC accepts browser requests (the public endpoint returns 403); the private Helius key stays server-only.
const solanaRpcs = { "solana:mainnet": { rpc: createSolanaRpc("https://solana-mainnet.rpc.privy.systems?privyAppId=cmw6ftcf900ge0hl0jyw3rc75"), rpcSubscriptions: createSolanaRpcSubscriptions("wss://solana-mainnet.rpc.privy.systems?privyAppId=cmw6ftcf900ge0hl0jyw3rc75"), blockExplorerUrl: "https://orbmarkets.io" } };
import { BovedaSessionContext } from "@/hooks/use-boveda-session";
import { FEE_WALLET } from "@/lib/fees";
import { useQuery } from "@tanstack/react-query";
import { getWalletPolicy } from "@/lib/wallet-policy.functions";
import { IdleLogout } from "@/components/idle-logout";
import { publishSession } from "@/lib/session-host";
import { rememberPasskey } from "@/lib/passkey-device";
import type { BovedaSession } from "@/hooks/use-boveda-session";

// Privy only authorizes the official domains; preview/other hosts can never finish loading it.
const OFFICIAL_ORIGIN = "https://bovedamarket.app";
const isOfficialHost = () => typeof window === "undefined" || ["bovedamarket.app", "www.bovedamarket.app", "veda-yield-garden.lovable.app"].includes(window.location.hostname.toLowerCase());

installPrivyApiFallback();
const solanaConnectors = toSolanaWalletConnectors({ shouldAutoConnect: true });

function SessionBridge({ children }: { children: ReactNode }) {
  const t = useT();
  const { ready, authenticated, user, logout, getAccessToken, mfaMethods, unlinkPasskey } = usePrivy();
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const { linkEmail, linkPasskey } = useLinkAccount({
    onSuccess: () => setSecurityMessage(t("Método vinculado y verificado.")),
    onError: () => setSecurityMessage(t("No se pudo vincular el método. Revisa que tu dispositivo sea compatible e inténtalo de nuevo.")),
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
  const { addSigners, removeSigners } = useSigners();
  const [error, setError] = useState<string | null>(null);
  const { login } = useLogin({
    onComplete: () => setError(null),
    onError: () => setError(t("No se pudo iniciar sesión. Inténtalo de nuevo o prueba con otro método (Google, email o billetera).")),
  });
  const loginFailed = () => setError(t("No se pudo iniciar sesión. Inténtalo de nuevo o prueba con otro método (Google, email o billetera)."));
  // Google and Face ID / fingerprint open directly (no intermediate Privy screen); email and wallets keep the branded modal.
  const { initOAuth } = useLoginWithOAuth({ onComplete: () => setError(null), onError: loginFailed });
  // Cancelling the phone sensor is a normal choice (e.g. to switch to Google): stay silent.
  const { loginWithPasskey } = useLoginWithPasskey({ onComplete: () => setError(null), onError: () => setError(null) });
  const startLogin = useCallback((m: "email" | "google" | "wallet" | "passkey") => {
    setError(null);
    // Remember a sign-in is in progress so the next screen waits for the new wallet instead of bouncing back.
    try { sessionStorage.setItem("boveda:auth-pending", String(Date.now())); } catch { /* ignore */ }
    if (m === "google") { initOAuth({ provider: "google" }).catch(loginFailed); return; }
    if (m === "passkey") { loginWithPasskey().catch(loginFailed); return; }
    login({ loginMethods: [m] });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initOAuth, loginWithPasskey, login]);
  const walletAddress = sessionWalletAddress(wallets, authenticated, user?.linkedAccounts as Parameters<typeof sessionWalletAddress>[2]);
  const embedded = !!walletAddress && !!user?.linkedAccounts.some(a => a.type === "wallet" && a.address === walletAddress && (a.walletClientType === "privy" || a.walletClientType === "privy-v2"));
  const policy = useQuery({ queryKey: ["wallet-policy"], queryFn: () => getWalletPolicy().catch(() => ({ blockExternal: false })), staleTime: 30_000, refetchInterval: 60_000 });
  const blockExternal = policy.data?.blockExternal ?? false;
  const tradeBlock: "external" | "treasury" | null = !walletAddress ? null : walletAddress === FEE_WALLET ? "treasury" : embedded || !blockExternal ? null : "external";
  // If Privy never reports ready (blocked iframe, shields, slow network), stop waiting after 4s so buttons and screens never freeze.
  const [stalled, setStalled] = useState(false);
  useEffect(() => { if (ready) { setStalled(false); if (authenticated) { try { sessionStorage.removeItem("boveda:auth-pending"); } catch { /* ignore */ } } return; } let oauth = typeof window !== "undefined" && /privy_oauth|privy_|code=|state=/.test(window.location.search); try { oauth ||= Date.now() - Number(sessionStorage.getItem("boveda:auth-pending") || 0) < 120000; } catch { /* ignore */ } const id = setTimeout(() => setStalled(true), oauth ? 25000 : 5000); return () => clearTimeout(id); }, [ready, authenticated]);
  // A click before Privy is ready is queued and opens the login as soon as it is (up to 15s) instead of failing instantly.
  const [pendingMethod, setPendingMethod] = useState<"email" | "google" | "wallet" | "passkey" | null>(null);
  useEffect(() => {
    if (!pendingMethod) return;
    if (ready) { const m = pendingMethod; setPendingMethod(null); startLogin(m); return; }
    const id = setTimeout(() => { setPendingMethod(null); setError(t("El acceso seguro no respondió. Revisa tu conexión y recarga la página.")); }, 15000);
    return () => clearTimeout(id);
  }, [pendingMethod, ready, startLogin, t]);
  // Registered during render (not only in an effect) so the first wallet reads fired by
  // freshly mounted screens already carry the session instead of failing as signed out.
  setPrivyTokenGetter(authenticated ? getAccessToken : null);
  useEffect(() => {
    setPrivyTokenGetter(authenticated ? getAccessToken : null);
    return () => setPrivyTokenGetter(null);
  }, [authenticated, getAccessToken]);
  // Once signed in with a wallet, retry any read that failed during sign-in so values appear without a manual refresh.
  useEffect(() => {
    if (!authenticated || !walletAddress) return;
    const id = setTimeout(() => { void queryClient.refetchQueries({ type: "active", predicate: (q) => q.state.status === "error" }); }, 1500);
    return () => clearTimeout(id);
  }, [authenticated, walletAddress, queryClient]);
  // Waking the phone: wait a moment for the network, then refresh live data instead of showing stale/empty screens.
  useEffect(() => {
    let id: ReturnType<typeof setTimeout> | undefined;
    const onVis = () => { if (document.visibilityState !== "visible" || !authenticated) return; clearTimeout(id); id = setTimeout(() => { void queryClient.invalidateQueries(); }, 1200); };
    document.addEventListener("visibilitychange", onVis); window.addEventListener("pageshow", onVis);
    return () => { clearTimeout(id); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("pageshow", onVis); };
  }, [authenticated, queryClient]);
  const sendRaw = async (transaction: Uint8Array): Promise<string> => {
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
        const rpc = solanaRpcs["solana:mainnet"].rpc;
        const sig = await rpc.sendTransaction(base64, { encoding: "base64", preflightCommitment: "confirmed" }).send();
        // Busy network: a single send can be dropped silently. Re-send the same signed bytes until it lands or expires.
        void (async () => {
          for (let i = 0; i < 14; i++) {
            await new Promise((r) => setTimeout(r, 2_500));
            try {
              const st = await rpc.getSignatureStatuses([sig]).send();
              if (st.value[0]?.confirmationStatus) return;
              await rpc.sendTransaction(base64, { encoding: "base64", skipPreflight: true, maxRetries: 0n }).send();
            } catch { /* expired or already landed */ }
          }
        })();
        return String(sig);
      } catch (e) {
        console.error("[BÓVEDA] broadcast failed", e);
        throw new Error(`${t("La red rechazó la operación")}: ${e instanceof Error ? e.message : String(e)}`);
      }
  };
  const guard = () => {
    if (tradeBlock === "treasury") throw new Error(t("Modo operador: la wallet de tesorería no puede operar en BÓVEDA."));
    if (tradeBlock === "external") throw new Error(t("Modo solo consulta: para operar, entra con Google, email o passkey y usa tu billetera protegida de BÓVEDA."));
  };
  const doLogout = useCallback(async () => { try { await queryClient.cancelQueries(); queryClient.clear(); await logout(); setError(null); } catch { setError(t("No se pudo cerrar sesión. Inténtalo de nuevo.")); } }, [queryClient, logout]);
  const value: BovedaSession = {
    ready: ready || stalled, sessionKnown: ready || stalled, authenticated, userId: authenticated ? user?.id ?? null : null,
    label: user?.email?.address ?? user?.google?.email ?? (walletAddress ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}` : t("Mi cuenta")),
    walletAddress, error: error ?? (pendingMethod && !ready ? t("Conectando el acceso seguro…") : stalled && !ready && !isOfficialHost() ? t("Para entrar, abre bovedamarket.app. En esta vista previa el acceso seguro no está disponible.") : null), getAccessToken,
    clearError: () => setError(null),
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
      linkPasskey: () => { setSecurityMessage(null); linkPasskey({ name: (user?.email?.address ?? user?.google?.email) ? `${user?.email?.address ?? user?.google?.email} (BÓVEDA)` : "BÓVEDA" } as Parameters<typeof linkPasskey>[0]); },
      unlinkPasskeys: user && user.linkedAccounts.some(a => a.type === "passkey") && user.linkedAccounts.some(a => a.type === "email" || a.type === "google_oauth") ? async () => {
        setSecurityMessage(null);
        for (const a of user.linkedAccounts) if (a.type === "passkey") await unlinkPasskey(a.credentialId);
        rememberPasskey(false);
        try { localStorage.removeItem("boveda:passkey-later"); } catch { /* ignore */ }
        setSecurityMessage(t("Huella o Face ID desvinculado. Puedes volver a activarlo cuando quieras."));
      } : undefined,
      manageMfa: async () => { setSecurityMessage(null); await showMfaEnrollmentModal(); },
    },
    login: (method) => {
      if (!ready) {
        if (!isOfficialHost()) { setError(t("Abrimos bovedamarket.app en una pestaña nueva para que puedas entrar.")); window.open(OFFICIAL_ORIGIN + window.location.pathname, "_blank", "noopener"); return; }
        setError(null); setPendingMethod(method); return;
      }
      startLogin(method);
    },
    tradeBlock,
    signAndSendAdmin: walletAddress === FEE_WALLET ? (transaction) => sendRaw(transaction) : undefined,
    signAndSend: async (transaction) => {
      guard();
      return sendRaw(transaction);
    },
    signOnly: async (transaction, opts) => {
      guard();
      const wallet = wallets[0];
      if (!authenticated || !wallet) throw new Error(t("Conecta una wallet de Solana"));
      try { return (await signTransaction({ transaction, wallet, chain: "solana:mainnet", options: { uiOptions: { showWalletUIs: false } } })).signedTransaction; }
      catch (e) {
        if (e instanceof Error && /reject|cancel|exited/i.test(e.message)) throw new Error(t("Cancelaste la firma."));
        throw new Error(`${t("La wallet no pudo firmar")}: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
    signMessage: async (message) => {
      const wallet = wallets[0];
      if (!authenticated || !wallet) throw new Error(t("Conecta una wallet de Solana"));
      installBufferPolyfill();
      const { signature } = await signWalletMessage({ message: new TextEncoder().encode(message), wallet });
      return bs58.encode(signature);
    },
    buyUsdc: async () => {
      if (!authenticated || !walletAddress) throw new Error(t("Primero entra a tu cuenta"));
      // Solana mainnet CAIP-2 id and the official USDC mint.
      await addFunds({ destination: { address: walletAddress, chain: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", asset: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" }, fiat: { defaultAmount: CARD_MIN_USD, source: { defaultAsset: "usd" } } });
    },
    buySol: async (solAmount?: string) => {
      if (!authenticated || !walletAddress) throw new Error(t("Primero entra a tu cuenta"));
      // Dedicated MoonPay route: unified addFunds also quotes Stripe, which rejects native SOL.
      await fundWallet({ address: walletAddress, options: { chain: "solana:mainnet", asset: "native-currency", amount: solAmount ?? GAS_TOP_UP_SOL, defaultFundingMethod: "card", card: { preferredProvider: "moonpay" } } });
    },
    // Autopilot: one Privy permission lets BÓVEDA's signer sign only range rebalances (Privy policy), revocable at any time.
    autopilot: embedded && tradeBlock === null ? {
      grant: async () => { await addSigners({ address: walletAddress!, signers: [{ signerId: AUTOPILOT_SIGNER_ID, policyIds: [AUTOPILOT_POLICY_ID] }] }); },
      revoke: async () => { await removeSigners({ address: walletAddress! }); },
    } : undefined,
    logout: doLogout,
  };
  // Share this single session with every screen (the engine lives in the root and survives navigation).
  useEffect(() => { publishSession(value); });
  useEffect(() => () => publishSession(null), []);
  return <BovedaSessionContext.Provider value={value}>{children}<IdleLogout active={ready && authenticated} signedOut={ready && !authenticated} onLogout={doLogout} /></BovedaSessionContext.Provider>;
}

export default function PrivyAccess({ children }: { children: ReactNode }) {
  return <PrivyProvider appId="cmw6ftcf900ge0hl0jyw3rc75" config={{
    loginMethods: ["email", "google", "wallet", "passkey"],
    appearance: { theme: "#0d1117", accentColor: "#22c55e", walletChainType: "solana-only", walletList: ["phantom", "jupiter", "detected_solana_wallets", "solflare", "backpack", "okx_wallet", "coinbase_wallet", "wallet_connect"], logo: "/icon-512.png", landingHeader: "Acceso seguro a BÓVEDA" },
    externalWallets: { solana: { connectors: solanaConnectors } },
    embeddedWallets: { showWalletUIs: false, solana: { createOnLogin: "users-without-wallets" }, ethereum: { createOnLogin: "off" } },
    solana: { rpcs: solanaRpcs },
  }}><SessionBridge>{children}</SessionBridge></PrivyProvider>;
}