import { createContext, useContext } from "react";

export type AccountSecurity = {
  email: string | null;
  passkeyCount: number;
  enrolledMfa: Array<"sms" | "totp" | "passkey">;
  availableMfa: Array<"sms" | "totp" | "passkey">;
  hasEmbeddedWallet: boolean;
  message: string | null;
  linkEmail: () => void;
  updateEmail: () => void;
  linkPasskey: () => void;
  manageMfa: () => Promise<void>;
};

export type BovedaSession = {
  ready: boolean;
  authenticated: boolean;
  userId: string | null;
  label: string;
  walletAddress: string | null;
  error: string | null;
  /** Hides the current sign-in message. */
  clearError?: () => void;
  login: (method: "email" | "google" | "wallet" | "passkey") => void;
  logout: () => Promise<void>;
  /** Asks the connected wallet to sign and send; resolves to the base58 signature. */
  signAndSend: (transaction: Uint8Array) => Promise<string>;
  /** Why market operations are blocked: external wallets are read-only, the treasury never trades. */
  tradeBlock?: "external" | "treasury" | null;
  /** Operator-only signer for treasury payouts; never used by market flows. */
  signAndSendAdmin?: ((transaction: Uint8Array) => Promise<string>) | undefined;
  /** Asks the connected wallet to sign only (no broadcast); resolves to the signed bytes. */
  signOnly?: (transaction: Uint8Array) => Promise<Uint8Array>;
  /** Asks the connected wallet to sign a plain text message (no funds move); resolves to base58. */
  signMessage?: (message: string) => Promise<string>;
  /** Opens the card/exchange purchase flow to receive USDC in the user's wallet. */
  buyUsdc?: () => Promise<void>;
  /** Opens the card purchase flow to receive native SOL for network costs. */
  buySol?: (solAmount?: string) => Promise<void>;
  getAccessToken?: () => Promise<string | null>;
  security?: AccountSecurity;
  /** Opens Privy's secure private-key export; only for Privy-created wallets. */
  exportWallet?: (() => Promise<void>) | undefined;
};

// The preview can reload this module before the lazy Privy provider reloads.
// Keep only the React context identity stable in development, never a session
// value; authentication still comes exclusively from the mounted provider.
const contextRegistry = globalThis as typeof globalThis & {
  __bovedaSessionContext?: ReturnType<typeof createContext<BovedaSession | null>>;
};
export const BovedaSessionContext = import.meta.env.DEV
  ? (contextRegistry.__bovedaSessionContext ??= createContext<BovedaSession | null>(null))
  : createContext<BovedaSession | null>(null);

export function useBovedaSession() {
  const session = useContext(BovedaSessionContext);
  if (!session) throw new Error("BÓVEDA session provider is missing");
  return session;
}