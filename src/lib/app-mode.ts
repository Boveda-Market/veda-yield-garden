export type AppMode = "real" | "trial";

// General mainnet execution stays closed; only the fixed 1 USDC deposit pilot
// (see pilot-deposit.ts) may sign. UI selection cannot open anything else.
export const REAL_OPERATIONS_AVAILABLE = false;

export function canRunTrial(mode: AppMode, authenticated: boolean, userId: string | null) {
  return mode === "trial" && authenticated && Boolean(userId);
}

/** Guest is an explicit trial capability, never an authentication state. */
export function canUseTrial(mode: AppMode, authenticated: boolean, userId: string | null, guest: boolean) {
  return mode === "trial" && (canRunTrial(mode, authenticated, userId) || guest);
}