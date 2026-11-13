import { ArrowLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";

export const OPEN_MENU_EVENT = "boveda:open-menu";
export const OPEN_MENU_FLAG = "boveda:open-menu";
export const IN_APP_FLAG = "boveda:in-app";

/** Visible "Back" pill that returns to the main menu (☰ Menú). Inside the app it opens the menu in place;
 *  on pages without it (legal/FAQ) it goes to the app and opens the menu there, or to `fallback` for visitors. */
export function BackButton({ fallback = "/", inApp = false, className = "" }: { fallback?: string; inApp?: boolean; className?: string }) {
  const t = useT();
  const router = useRouter();
  const back = () => {
    if (inApp) { window.dispatchEvent(new Event(OPEN_MENU_EVENT)); return; }
    let signedIn = false;
    try { signedIn = sessionStorage.getItem(IN_APP_FLAG) === "1"; if (signedIn) sessionStorage.setItem(OPEN_MENU_FLAG, "1"); } catch { /* ignore */ }
    void router.navigate({ to: signedIn ? "/wallet" : fallback });
  };
  return <button type="button" onClick={back} className={`inline-flex h-9 items-center gap-1.5 rounded-full border border-primary/40 bg-card px-3 text-xs font-semibold text-primary hover:bg-secondary ${className}`}><ArrowLeft size={14} aria-hidden />{t("Volver al menú")}</button>;
}
