import { createContext, useContext } from "react";

export type BovedaSession = {
  ready: boolean;
  authenticated: boolean;
  userId: string | null;
  label: string;
  walletAddress: string | null;
  error: string | null;
  login: (method: "email" | "google" | "wallet") => void;
  logout: () => Promise<void>;
  /** Asks the connected wallet to sign and send; resolves to the base58 signature. */
  signAndSend: (transaction: Uint8Array) => Promise<string>;
  getAccessToken?: () => Promise<string | null>;
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