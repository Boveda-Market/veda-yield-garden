export type AppMode = "real" | "trial";

// General mainnet execution stays closed; only the fixed 1 USDC deposit pilot
// (see pilot-deposit.ts) may sign. UI selection cannot open anything else.
export const REAL_OPERATIONS_AVAILABLE = false;

export function canRunTrial(mode: AppMode, authenticated: boolean, userId: string | null) {
  return mode === "trial" && authenticated && Boolean(userId);
}