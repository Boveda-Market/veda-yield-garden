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

export const BovedaSessionContext = createContext<BovedaSession | null>(null);

export function useBovedaSession() {
  const session = useContext(BovedaSessionContext);
  if (!session) throw new Error("BÓVEDA session provider is missing");
  return session;
}