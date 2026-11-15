import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { GoogleButton } from "@/components/google-button";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { useT } from "@/lib/i18n";

const SEEN_KEY = "boveda:login-nudge";
const DELAY_MS = 30_000;
const SCROLL_RATIO = 0.5;

/** Gentle sign-in sheet for visitors: shows once per visit after 30 s or half-page scroll. */
export function LoginNudge() {
  const t = useT();
  const session = useBovedaSession();
  const [open, setOpen] = useState(false);
  const signedIn = session.authenticated;
  useEffect(() => {
    if (signedIn || !session.ready) return;
    try { if (sessionStorage.getItem(SEEN_KEY)) return; } catch { /* ignore */ }
    let done = false;
    const show = () => {
      if (done) return;
      done = true;
      try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* ignore */ }
      if (!document.querySelector("[role=dialog]")) setOpen(true);
      cleanup();
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max >= SCROLL_RATIO) show();
    };
    const timer = window.setTimeout(show, DELAY_MS);
    window.addEventListener("scroll", onScroll, { passive: true });
    const cleanup = () => { window.clearTimeout(timer); window.removeEventListener("scroll", onScroll); };
    return cleanup;
  }, [signedIn, session.ready]);
  useEffect(() => { if (signedIn) setOpen(false); }, [signedIn]);
  return <Dialog open={open} onOpenChange={setOpen}>
    <ActionSheetContent>
      <DialogTitle className="pr-10 font-display text-xl">{t("¿Listo para tu primera jugada?")}</DialogTitle>
      <DialogDescription className="text-sm">{t("Entra con Google en 1 segundo y recarga con Coinbase usando tu tarjeta. Sin contraseñas.")}</DialogDescription>
      <div className="mt-4 grid gap-2">
        <GoogleButton className="h-12 w-full" onClick={() => { setOpen(false); session.login("google"); }}>{t("Continuar con Google")}</GoogleButton>
        <Button variant="secondary" className="h-11 w-full" onClick={() => { setOpen(false); session.login("email"); }}>{t("Entrar con email")}</Button>
        <Button variant="ghost" className="w-full" onClick={() => setOpen(false)}>{t("Seguir mirando")}</Button>
      </div>
    </ActionSheetContent>
  </Dialog>;
}
