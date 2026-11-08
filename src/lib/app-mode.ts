export type AppMode = "real" | "trial";

// General mainnet execution stays closed; validated SOL/MET deposits up to
// 10,000 USDC and separately authorized pilot exits may sign.
export const REAL_OPERATIONS_AVAILABLE = false;

export function canRunTrial(mode: AppMode, authenticated: boolean, userId: string | null) {
  return mode === "trial" && authenticated && Boolean(userId);
}

/** Guest is an explicit trial capability, never an authentication state. */
export function canUseTrial(mode: AppMode, authenticated: boolean, userId: string | null, guest: boolean) {
  return mode === "trial" && (canRunTrial(mode, authenticated, userId) || guest);
}