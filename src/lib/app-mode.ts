export type AppMode = "real" | "trial";

// Mainnet execution stays closed until wallet, pool lifecycle, fee collection,
// and confirmation have been verified end to end. UI selection cannot open it.
export const REAL_OPERATIONS_AVAILABLE = false;

export function canRunTrial(mode: AppMode, authenticated: boolean, userId: string | null) {
  return mode === "trial" && authenticated && Boolean(userId);
}