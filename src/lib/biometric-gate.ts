import { deviceHasPasskey, rememberPasskey } from "./passkey-device";

/** After one confirmed check, chained steps of the same operation (e.g. claim + convert) don't ask again. */
export const BIOMETRIC_GRACE_MS = 60_000;
/** Consecutive failed checks before the device stops asking (passkey removed or not usable here). */
export const BIOMETRIC_MAX_FAILS = 2;
let lastOk = 0;
let fails = 0;

export function biometricDue(now = Date.now(), hasPasskey = deviceHasPasskey()): boolean {
  if (!hasPasskey) return false;
  if (typeof window === "undefined" || !("PublicKeyCredential" in window) || !navigator.credentials?.get) return false;
  return now - lastOk > BIOMETRIC_GRACE_MS;
}

/** Asks the device's own fingerprint / Face ID sensor before money moves. Skips silently when the device has none. */
export async function confirmWithDevice(): Promise<void> {
  if (!biometricDue()) return;
  try {
    await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), userVerification: "required", timeout: 60_000 } });
    lastOk = Date.now(); fails = 0;
  } catch {
    fails += 1;
    if (fails >= BIOMETRIC_MAX_FAILS) { rememberPasskey(false); fails = 0; }
    throw new Error("Cancelaste la firma.");
  }
}

export function resetBiometricGate() { lastOk = 0; fails = 0; }
