export type AppMode = "real" | "trial";

// Compatible SOL/MET operations require fresh server validation and owner signatures.
// This flag never bypasses asset, ownership, simulation or trial boundaries.
export const REAL_OPERATIONS_AVAILABLE = true;

export function canRunTrial(mode: AppMode, authenticated: boolean, userId: string | null) {
  return mode === "trial" && authenticated && Boolean(userId);
}

/** Guest is an explicit trial capability, never an authentication state. */
export function canUseTrial(mode: AppMode, authenticated: boolean, userId: string | null, guest: boolean) {
  return mode === "trial" && (canRunTrial(mode, authenticated, userId) || guest);
}