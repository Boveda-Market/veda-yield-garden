/** Remembers on this device that the person set up Face ID / fingerprint, so sign-in can lead with it. */
export const PASSKEY_DEVICE_KEY = "boveda:has-passkey";
export function deviceHasPasskey(): boolean {
  try { return localStorage.getItem(PASSKEY_DEVICE_KEY) === "1"; } catch { return false; }
}
export function rememberPasskey(on = true) {
  try { if (on) localStorage.setItem(PASSKEY_DEVICE_KEY, "1"); else localStorage.removeItem(PASSKEY_DEVICE_KEY); } catch { /* ignore */ }
}

/** Last signed-in account label (email) shown on the welcome-back card; display only, never trusted for access. */
export const LAST_ACCOUNT_KEY = "boveda:last-account";
export function lastAccount(): string | null {
  try { return localStorage.getItem(LAST_ACCOUNT_KEY); } catch { return null; }
}
export function rememberAccount(label: string | null) {
  try { if (label) localStorage.setItem(LAST_ACCOUNT_KEY, label); else localStorage.removeItem(LAST_ACCOUNT_KEY); } catch { /* ignore */ }
}
