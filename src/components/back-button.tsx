import { ArrowLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";

export const OPEN_MENU_EVENT = "boveda:open-menu";
export const OPEN_MENU_FLAG = "boveda:open-menu";
export const IN_APP_FLAG = "boveda:in-app";

/** True when this tab already visited another Bóveda Market screen, so going back stays inside the app. */
export function canGoBackInApp(state: unknown): boolean {
  const idx = state && typeof state === "object" ? (state as Record<string, unknown>)["__TSR_index"] : undefined;
  return typeof idx === "number" && idx > 0;
}

/** "Atrás": returns to the exact screen the person was viewing. Opened from a shared link (no previous screen),
 *  it goes to Mi Billetera for signed-in people, or to `fallback` / the home section for visitors. */
export function BackButton({ fallback = "/", inApp: _inApp = false, className = "", homeHash }: { fallback?: string; inApp?: boolean; className?: string; homeHash?: string | undefined }) {
  const t = useT();
  const router = useRouter();
  const back = () => {
    if (canGoBackInApp(window.history.state)) { router.history.back(); return; }
    let signedIn = false;
    try { signedIn = sessionStorage.getItem(IN_APP_FLAG) === "1"; } catch { /* ignore */ }
    if (signedIn) { void router.navigate({ to: "/wallet", replace: true }); return; }
    if (homeHash) { void router.navigate({ to: "/", hash: homeHash, replace: true }); return; }
    void router.navigate({ to: fallback, replace: true });
  };
  return <button type="button" onClick={back} className={`inline-flex h-9 items-center gap-1.5 rounded-full border border-primary/40 bg-card px-3 text-xs font-semibold text-primary hover:bg-secondary ${className}`}><ArrowLeft size={14} aria-hidden />{t("Atrás")}</button>;
}
