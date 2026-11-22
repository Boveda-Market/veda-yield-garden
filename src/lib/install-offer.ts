/** Post-login install suggestion: shown once per device, only to new visitors browsing outside the installed app. */
export const INSTALL_OFFER_KEY = "boveda:install-offer-seen";
export function shouldOfferInstall(o: { standalone: boolean; seen: boolean; returning: boolean }): boolean {
  return !o.standalone && !o.seen && !o.returning;
}
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}
export function installOfferSeen(): boolean { try { return localStorage.getItem(INSTALL_OFFER_KEY) === "1"; } catch { return true; } }
export function markInstallOfferSeen(): void { try { localStorage.setItem(INSTALL_OFFER_KEY, "1"); } catch { /* ignore */ } }
