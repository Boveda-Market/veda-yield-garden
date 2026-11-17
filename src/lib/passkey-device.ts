/** Remembers on this device that the person set up Face ID / fingerprint, so sign-in can lead with it. */
export const PASSKEY_DEVICE_KEY = "boveda:has-passkey";
export function deviceHasPasskey(): boolean {
  try { return localStorage.getItem(PASSKEY_DEVICE_KEY) === "1"; } catch { return false; }
}
export function rememberPasskey(on = true) {
  try { if (on) localStorage.setItem(PASSKEY_DEVICE_KEY, "1"); else localStorage.removeItem(PASSKEY_DEVICE_KEY); } catch { /* ignore */ }
}
