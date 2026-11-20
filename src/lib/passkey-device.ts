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

/** After sign-out: forget the remembered account and the returning-visitor hint so the next visit never jumps back into the previous account, and skip the automatic fingerprint prompt once. */
export const JUST_LOGGED_OUT_KEY = "boveda:just-logged-out";
export function clearDeviceSession() {
  try { localStorage.removeItem(LAST_ACCOUNT_KEY); localStorage.removeItem("boveda:returning"); } catch { /* ignore */ }
  try { sessionStorage.removeItem("boveda:auth-pending"); sessionStorage.removeItem("boveda:after-login"); sessionStorage.setItem(JUST_LOGGED_OUT_KEY, "1"); } catch { /* ignore */ }
}
/** Ask for the fingerprint by itself at most once per visit, never right after signing out. */
export function shouldAutoPasskey(store: Pick<Storage, "getItem" | "setItem"> = sessionStorage): boolean {
  try {
    if (store.getItem(JUST_LOGGED_OUT_KEY) || store.getItem("boveda:passkey-auto")) return false;
    store.setItem("boveda:passkey-auto", "1");
    return true;
  } catch { return false; }
}
